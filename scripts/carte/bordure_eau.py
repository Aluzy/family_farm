# Bordures de l'eau (toutes les rives), à partir d'une seule tuile modèle (16 × 16).
#
#   python3 scripts/carte/bordure_eau.py            écrit assets/bordure_eau.png et .tsx
#   python3 scripts/carte/bordure_eau.py --apercu   écrit aussi apercu_bordure_eau.png
#
# Modèle : scripts/carte/originaux/bordure_eau.png — une rive vue en 3/4, la terre au-dessus et
# l'eau en dessous : le dessus de la terre (sable), la berge qui descend (liseré clair en haut,
# texture ocre), une ligne d'écume blanche festonnée aux deux bouts, puis l'eau (transparente).
#
# La planche : 16 tuiles (4 × 4), une par combinaison de coins terre / eau (« coins de Wang ») :
# la tuile n a de la terre au coin haut-gauche si n & 8, haut-droit si n & 4, bas-gauche si
# n & 2, bas-droit si n & 1. La tuile 15 est la terre pleine, la tuile 0 l'eau (vide). Elles se
# posent sur un calque d'eau : l'eau est transparente.
#
# La perspective est celle du modèle (vue de 3/4, lumière en haut à gauche) :
#   - rive sud (la terre au-dessus de l'eau) : la berge haute du modèle, puis l'écume ;
#   - rive nord (l'eau au-dessus de la terre) : on ne voit que le bord du dessus, un liseré clair ;
#   - rives est et ouest : un flanc étroit, clair à l'ouest (vers la lumière), sombre à l'est ;
#   - l'écume borde l'eau partout.
# Raccords : la rive croise chaque côté d'une tuile toujours au même endroit (selon que la terre
# est en haut ou en bas, à gauche ou à droite), et la texture de la berge dépend de la colonne :
# deux tuiles qui partagent un côté se rejoignent.
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MODELE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'bordure_eau.png')
SORTIE = os.path.join(ROOT, 'assets', 'bordure_eau')
T = 16

SABLE = (232, 186, 15)        # le dessus de la terre
LISERE = (245, 214, 92)       # le bord du dessus, éclairé
ECUME = (255, 255, 255)
FLANC_CLAIR = [(232, 186, 15), (218, 173, 14)]     # flanc ouest (vers la lumière)
FLANC_SOMBRE = [(162, 129, 10), (134, 106, 8)]     # flanc est (dans l'ombre)
BORD_NORD = (204, 162, 13)    # rive nord : l'arête du dessus, sous le liseré
# Rive sud : l'eau commence à la rangée EAU_SUD - FESTON[x] (le feston du modèle aux deux bouts).
EAU_SUD = 14
FESTON = [2, 1, 1] + [0] * 11 + [1, 2]
# Rive nord : l'eau occupe les rangées < EAU_NORD. Rives est et ouest : les colonnes >= EAU_EST
# et < EAU_OUEST.
EAU_NORD = 3
EAU_EST = 13
EAU_OUEST = 3
BERGE = 12                    # hauteur de la berge du modèle (rangées 2 à 13)


def berge(modele):
    """La texture de la berge : les rangées 2 à 13 du modèle. Aux deux bouts, le feston y met de
    l'écume ou du vide : ces cases prennent la couleur de la berge juste au-dessus."""
    tex = []
    for k in range(BERGE):
        ligne = []
        for x in range(T):
            p = modele.getpixel((x, 2 + k))
            ligne.append(tex[k - 1][x] if (p[3] == 0 or p[:3] == ECUME) else p[:3])
        tex.append(ligne)
    return tex


def eau(n):
    """Masque de l'eau de la tuile n : un rectangle par coin d'eau, qui s'étend jusqu'au coin
    voisin s'il est aussi de l'eau, sinon jusqu'au point de passage de la rive sur ce côté."""
    tl, tr, bl, br = [(n >> k) & 1 for k in (3, 2, 1, 0)]          # 1 = terre
    m = [[False] * T for _ in range(T)]
    for y in range(T):
        for x in range(T):
            gauche, haut = x < 8, y < 8
            coin = {(True, True): tl, (False, True): tr, (True, False): bl, (False, False): br}[(gauche, haut)]
            if coin:
                continue
            # le voisin horizontal et le voisin vertical de ce coin d'eau
            vh = {(True, True): tr, (False, True): tl, (True, False): br, (False, False): bl}[(gauche, haut)]
            vv = {(True, True): bl, (False, True): br, (True, False): tl, (False, False): tr}[(gauche, haut)]
            # jusqu'où va l'eau le long du côté horizontal (en x) et du côté vertical (en y)
            if vh:                         # la terre de l'autre côté : la rive passe à EAU_EST / EAU_OUEST
                okx = x >= EAU_EST if not gauche else x < EAU_OUEST
            else:
                okx = True
            if vv:                         # terre au-dessus (rive sud) ou en dessous (rive nord)
                oky = y >= EAU_SUD - FESTON[x] if not haut else y < EAU_NORD
            else:
                oky = True
            m[y][x] = okx and oky
    return m


def tuile(n, tex):
    m = eau(n)
    out = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    W = lambda x, y: m[y][x] if 0 <= x < T and 0 <= y < T else None
    for y in range(T):
        for x in range(T):
            if m[y][x]:
                # l'écume : l'eau qui touche la terre
                if any(W(x + dx, y + dy) is False for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out.putpixel((x, y), ECUME + (255,))
                continue
            c = SABLE
            # berge : de l'eau juste en dessous, à moins de BERGE pixels
            # (la rangée de texture suit la rangée du modèle : le feston relève l'eau, pas la berge)
            k = next((k for k in range(1, BERGE + 1) if W(x, y + k)), None)
            if k is not None and BERGE - k - FESTON[x] >= 0:
                c = tex[BERGE - k - FESTON[x]][x]
            elif W(x + 1, y) or W(x + 2, y):
                c = FLANC_SOMBRE[0 if W(x + 2, y) and not W(x + 1, y) else 1]      # flanc est
            elif W(x - 1, y) or W(x - 2, y):
                c = FLANC_CLAIR[1 if W(x - 1, y) else 0]                          # flanc ouest
            elif W(x, y - 1):
                c = LISERE                                                         # rive nord
            elif W(x, y - 2):
                c = BORD_NORD
            out.putpixel((x, y), c + (255,))
    return out


def planche(modele):
    tex = berge(modele)
    out = Image.new('RGBA', (4 * T, 4 * T), (0, 0, 0, 0))
    for n in range(16):
        out.paste(tuile(n, tex), ((n % 4) * T, (n // 4) * T))
    return out


def tsx(img):
    lignes = []
    for n in range(16):
        tl, tr, bl, br = [2 if (n >> k) & 1 else 1 for k in (3, 2, 1, 0)]
        lignes.append(f'   <wangtile tileid="{n}" wangid="0,{tr},0,{br},0,{bl},0,{tl}"/>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="bordure_eau" tilewidth="{T}" tileheight="{T}" tilecount="16" columns="4">
 <image source="bordure_eau.png" width="{img.width}" height="{img.height}"/>
 <wangsets>
  <wangset name="eau et terre" type="corner" tile="-1">
   <wangcolor name="eau" color="#3c96d2" tile="0" probability="1"/>
   <wangcolor name="terre" color="#e8ba0f" tile="15" probability="1"/>
{chr(10).join(lignes)}
  </wangset>
 </wangsets>
</tileset>
'''


def apercu(img):
    """Une petite carte : un lac avec une île et une anse, sur une eau bleue, agrandie × 4."""
    carte_txt = [
        '##################',
        '##################',
        '######.....#######',
        '####..........####',
        '###............###',
        '###.....##.....###',
        '##.....####.....##',
        '##.....###......##',
        '###............###',
        '####..........####',
        '#####...##...#####',
        '#####...##...#####',
        '##################',
        '##################',
    ]
    H, W = len(carte_txt), len(carte_txt[0])
    terre = lambda x, y: carte_txt[min(H - 1, max(0, y))][min(W - 1, max(0, x))] == '#'
    out = Image.new('RGBA', ((W - 1) * T, (H - 1) * T))
    # l'eau dessous : un bleu à petites vagues
    for y in range(out.height):
        for x in range(out.width):
            v = (x * 3 + y * 7) % 23 == 0 or (x * 5 + y * 2) % 31 == 0
            out.putpixel((x, y), (120, 190, 235, 255) if v else (60, 150, 210, 255))
    for ty in range(H - 1):
        for tx in range(W - 1):
            n = (terre(tx, ty) << 3) | (terre(tx + 1, ty) << 2) | (terre(tx, ty + 1) << 1) | terre(tx + 1, ty + 1)
            out.alpha_composite(img.crop(((n % 4) * T, (n // 4) * T, (n % 4 + 1) * T, (n // 4 + 1) * T)), (tx * T, ty * T))
    z = 4
    a = out.resize((out.width * z, out.height * z), Image.NEAREST)
    fond = Image.new('RGBA', img.size, (60, 150, 210, 255))
    fond.alpha_composite(img)
    b = fond.resize((img.width * z * 2, img.height * z * 2), Image.NEAREST)
    res = Image.new('RGBA', (a.width + b.width + 24, max(a.height, b.height)), (40, 40, 40, 255))
    res.paste(b, (0, 0))
    res.paste(a, (b.width + 24, 0))
    return res


def main():
    modele = Image.open(MODELE).convert('RGBA')
    img = planche(modele)
    img.save(SORTIE + '.png')
    with open(SORTIE + '.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx(img))
    print('assets/bordure_eau.png : 4 × 4 tuiles ; assets/bordure_eau.tsx')
    if '--apercu' in sys.argv:
        apercu(img).save(os.path.join(ROOT, 'apercu_bordure_eau.png'))
        print('apercu_bordure_eau.png')


if __name__ == '__main__':
    main()
