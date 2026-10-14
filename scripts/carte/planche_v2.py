# La planche de la carte, agrandie des nouvelles tuiles (version 2 du décor).
#
#   python3 scripts/carte/planche_v2.py
#
# À lancer après scripts/carte/arbres_3d.py (qui refait les 45 premières rangées de
# assets/farm_spring_summer.png) et après les scripts des nouvelles planches (herbe_chemin,
# herbe_deco, eau, bordure_eau, arbre_clair). Le script garde les 45 premières rangées
# (la planche d'origine) et pose dessous, à partir de la rangée BASE, les blocs de BLOCS ; il
# met à jour assets/farm_spring_summer.tsx (taille, nombre de tuiles, animations de l'eau).
# Le jeu ne lit qu'une planche pour la carte : les nouvelles tuiles s'y ajoutent, et tout ce
# qui lit la planche (eau animée, arbres à couper, terre labourable) les voit.
#
# BLOCS : nom -> (fichier, colonne, rangée, largeur, hauteur en tuiles, source) ; source est le
# coin haut-gauche et la taille (en px) de la partie du fichier copiée. carte_v2.py et le jeu
# (js/farm-stage.js, CHOP_TREES) s'en servent pour retrouver une tuile.
import os
import re

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PLANCHE = os.path.join(ROOT, 'assets', 'farm_spring_summer.png')
TSX = os.path.join(ROOT, 'assets', 'farm_spring_summer.tsx')
T = 16
COLS = 75
BASE = 45                     # rangées de la planche d'origine
RANGEES = 61                  # rangées de la planche agrandie

BLOCS = {
    'herbe_chemin': ('herbe_chemin.png', 0, 45, 16, 16, (0, 0, 256, 256)),
    'herbe_deco': ('herbe_deco.png', 16, 45, 16, 10, (0, 0, 256, 160)),
    'eau': ('eau.png', 32, 45, 16, 16, (0, 0, 256, 256)),
    'rive_sable': ('bordure_eau.png', 48, 45, 4, 4, (0, 0, 64, 64)),
    'rive_herbe': ('bordure_eau_herbe.png', 52, 45, 16, 4, (0, 0, 256, 64)),
    'arbre': ('arbre_clair.png', 48, 50, 3, 4, (0, 0, 48, 64)),
    'pin': ('pin_clair_sp.png', 52, 50, 4, 4, (0, 0, 64, 64)),          # la 1re image : le pin sur 64 × 64
    'buisson_rond': ('arbre_clair.png', 57, 50, 3, 2, (48, 32, 48, 32)),
    'buisson_large': ('arbre_clair.png', 61, 50, 3, 2, (96, 32, 48, 32)),
    'barrieres': ('barrieres.png', 48, 54, 27, 7, (0, 0, 432, 112)),       # écrit par carte_v2.py
}
EAU_TUILES, EAU_IMAGES, EAU_DUREE = 32, 8, 160     # voir scripts/carte/eau.py


def gid(bloc, k):
    """Numéro de tuile (gid, à partir de 1) de la k-ième tuile d'un bloc (rangée par rangée)."""
    _, c, r, w, _, _ = BLOCS[bloc]
    return 1 + (r + k // w) * COLS + c + k % w


def main():
    ancienne = Image.open(PLANCHE).convert('RGBA')
    out = Image.new('RGBA', (COLS * T, RANGEES * T), (0, 0, 0, 0))
    out.paste(ancienne.crop((0, 0, COLS * T, BASE * T)), (0, 0))
    for nom, (fichier, c, r, w, h, (sx, sy, sw, sh)) in BLOCS.items():
        img = Image.open(os.path.join(ROOT, 'assets', fichier)).convert('RGBA').crop((sx, sy, sx + sw, sy + sh))
        assert img.size == (w * T, h * T), (nom, img.size)
        out.paste(img, (c * T, r * T))
    out.save(PLANCHE)

    # le .tsx : taille de l'image, nombre de tuiles, animations de l'eau (8 images par tuile)
    tsx = open(TSX, encoding='utf-8').read()
    tsx = re.sub(r'tilecount="\d+"', f'tilecount="{COLS * RANGEES}"', tsx, count=1)
    tsx = re.sub(r'(<image [^>]*height=")\d+(")', rf'\g<1>{RANGEES * T}\2', tsx, count=1)
    tsx = re.sub(r' <tile id="(\d+)"><animation>(?:(?!</tile>).)*?</animation></tile>\n', lambda m: m.group(0) if int(m.group(1)) < BASE * COLS else '', tsx, flags=re.S)
    anims = []
    for i in range(EAU_TUILES):
        frames = ''.join(f'<frame tileid="{gid("eau", i + k * EAU_TUILES) - 1}" duration="{EAU_DUREE}"/>' for k in range(EAU_IMAGES))
        anims.append(f' <tile id="{gid("eau", i) - 1}"><animation>{frames}</animation></tile>\n')
    tsx = tsx.replace('</tileset>', ''.join(anims) + '</tileset>')
    open(TSX, 'w', encoding='utf-8').write(tsx)
    print(f'assets/farm_spring_summer.png : {COLS} × {RANGEES} tuiles (nouvelles tuiles dès la rangée {BASE}) ; .tsx mis à jour')


if __name__ == '__main__':
    main()
