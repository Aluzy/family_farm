# Le four de la maison, redessiné par le joueur (docs/fiches/four-redessine.png, 32 × 40 : un four à pain de pierre
# voûté, sa cheminée, la bouche où brûle le feu). Il se pose sur deux cases de large (data/recipes.json,
# ATELIER.BLOCS.four : dessin « four », largeur 2) ; la carte (js/carte/ferme/chantier.js stepFires) montre :
#   - assets/meuble_four.png : éteint (aucune préparation au four) : le fond du foyer presque noir, les flammes
#     éteintes, quelques braises qui rougeoient à peine au fond ;
#   - assets/meuble_four_feu_<k>.png (k = 0..FEU-1) : allumé, les images du feu l'une après l'autre (BLOCS_CARTE.four
#     de js/carte/ferme/config.js : fps) ; la première est le dessin du joueur tel quel ; dans les suivantes,
#     chaque colonne de flamme s'allonge ou se raccourcit (ses couleurs à lui, étirées : HAUTEURS), et la lueur du
#     fond du foyer vacille (LUEURS).
# Rien d'autre que la bouche du four ne change (la pierre, la cheminée, le contour).
#
#   python3 scripts/batiments/four.py            écrit les images
#   python3 scripts/batiments/four.py --apercu   écrit aussi apercu_four.png (agrandi)
import colorsys
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT  # noqa: E402

SOURCE = os.path.join(ROOT, 'docs', 'fiches', 'four-redessine.png')
FEU = 8                                  # images du feu
FOND = (124, 53, 40)                     # le fond rouge du foyer allumé (le dessin du joueur)
LUEURS = [FOND, (132, 58, 42), (138, 62, 44), (128, 55, 41), (118, 50, 38), (126, 54, 40), (134, 59, 43), (122, 52, 39)]
ETEINT = (34, 21, 18)                    # le fond du foyer éteint
BRAISES = [(78, 32, 24), (58, 27, 21)]   # les braises éteintes, au fond
BOUCHE = range(20, 32)                   # les rangées de la bouche ; la sole, en bas
SOLE = 31


def feu(p):
    """Un pixel du feu (orange, jaune, blanc chaud) ?"""
    r, g, b, a = p
    if not a:
        return False
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    # (le cœur blanc du feu compte aussi)
    return (s > 0.35 and (h < 0.17 or h > 0.95) and l > 0.45) or l > 0.97


def foyer(p):
    """Le fond du foyer, ou le feu : ce que l'animation peut changer."""
    return p[3] and (p[:3] == FOND or feu(p))


def colonnes(src):
    """Par colonne de la bouche : la flamme, du haut (sa pointe) jusqu'à la sole : [(y, couleur)], et les cases du
    foyer de la colonne (le fond où la flamme peut monter)."""
    px = src.load()
    out = {}
    for x in range(src.width):
        cases = [y for y in BOUCHE if foyer(px[x, y])]
        flamme = [y for y in cases if feu(px[x, y])]
        if not cases:
            continue
        haut = min(flamme) if flamme else None
        out[x] = {'cases': cases, 'haut': haut, 'couleurs': [px[x, y] for y in range(haut, SOLE + 1)] if haut is not None else []}
    return out


def HAUTEURS(k, x):
    """De combien la flamme de la colonne x s'allonge (+) ou se raccourcit (-) à l'image k : une houle qui passe
    d'une colonne à l'autre, de ±2 px au plus."""
    if k == 0:
        return 0
    return round(1.6 * math.sin(2 * math.pi * k / FEU + x * 0.9) + 0.6 * math.sin(4 * math.pi * k / FEU - x * 1.7))


def allume(src, k):
    out = src.copy()
    po, ps = out.load(), src.load()
    if k == 0:
        return out
    for x, c in colonnes(src).items():
        cases = set(c['cases'])
        # le fond du foyer : la lueur de l'image
        for y in cases:
            po[x, y] = LUEURS[k] + (255,)
        if c['haut'] is None:
            continue
        h = len(c['couleurs'])
        h2 = max(1, h + HAUTEURS(k, x))
        top = SOLE - h2 + 1
        for i in range(h2):
            y = top + i
            if y not in cases:
                continue
            j = min(h - 1, i * h // h2)      # (ses couleurs, étirées ou serrées)
            col = c['couleurs'][j]
            po[x, y] = (LUEURS[k] + (255,)) if col[:3] == FOND else col
    return out


def eteint(src):
    out = src.copy()
    po = out.load()
    for x, c in colonnes(src).items():
        for y in c['cases']:
            po[x, y] = ETEINT + (255,)
        # quelques braises au fond, là où le feu touchait la sole
        if c['haut'] is not None:
            po[x, SOLE] = BRAISES[x % 2] + (255,)
            if (x * 7) % 5 == 0 and SOLE - 1 in c['cases']:
                po[x, SOLE - 1] = BRAISES[1] + (255,)
    return out


def images():
    src = Image.open(SOURCE).convert('RGBA')
    out = {'meuble_four.png': eteint(src)}
    for k in range(FEU):
        out[f'meuble_four_feu_{k}.png'] = allume(src, k)
    return out


def main():
    ims = images()
    for nom, im in ims.items():
        im.save(os.path.join(ASSETS, nom), optimize=True)
    if '--apercu' in sys.argv:
        z = 6
        ap = Image.new('RGBA', ((32 + 4) * len(ims) * z, 40 * z), (152, 124, 88, 255))
        for i, im in enumerate(ims.values()):
            ap.alpha_composite(im.resize((32 * z, 40 * z), Image.NEAREST), (i * 36 * z, 0))
        ap.save(os.path.join(ROOT, 'apercu_four.png'))
    print(f'le four : {len(ims)} images')


if __name__ == '__main__':
    main()
