# assets/verger.png : les arbres fruitiers sur la carte.
#
#   python3 scripts/verger/arbres.py            écrit assets/verger.png
#   python3 scripts/verger/arbres.py --apercu   écrit aussi apercu_verger.png (agrandi ×4)
#
# Les arbres fruitiers sont les feuillus du jeu (scripts/carte/originaux/arbre_feuillu.png, l'arbre
# de assets/arbre_clair.png), le feuillage un peu teinté selon l'espèce. Une planche de cases de
# 80×80 (la place d'un arbre du Verger), chaque dessin posé pied au bas de la case, centré :
#   0 emplacement libre   butte de terre labourée (plot-soil des icônes)
#   1 jeune arbre         jeune plant et son tuteur (tree-young des icônes)
#   puis, pour chaque espèce de ESPECES (dans cet ordre), quatre cases :
#   2 + 4i     arbuste    un petit feuillu (le feuillage du grand, resserré), son tronc
#   3 + 4i     arbre      le feuillu, feuillage de l'espèce
#   4 + 4i     en fleur   le même, semé de fleurs de la couleur de l'espèce ; le cerisier est
#                         tout rose (son feuillage passe sur une rampe de roses), sauf le tronc
#   5 + 4i     en fruits  le même, de petits fruits sur le feuillage
# js/carte/ferme/config.js (ORCHARD_FRAMES, ORCHARD_ESPECES) suit cet ordre.
# Les pixels restent à l'échelle de la carte : aucun dessin n'est agrandi.
import colorsys
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, apercu, hasard  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'icones'))
import art_verger as A  # noqa: E402

CASE = 80
ARBRE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'arbre_feuillu.png')
CONTOUR = (7, 25, 6)

# Chaque espèce : le feuillage (dteinte en degrés, facteurs de saturation et de luminosité), ses
# fleurs (couleurs : pétale clair, pétale, cœur) et ses fruits (petit dessin : lettres → couleurs).
ESPECES = {
    'pommier': {
        'feuilles': (0, 1.0, 1.0),
        'fleurs': [(255, 246, 248), (246, 196, 210), (236, 214, 92)],
        'fruit': ['.r.', 'rhR', 'RRd'], 'couleurs': {'r': (214, 40, 40), 'h': (255, 150, 140), 'R': (168, 24, 30), 'd': (110, 14, 20)},
    },
    'poirier': {
        'feuilles': (-8, 0.92, 1.06),
        'fleurs': [(255, 255, 250), (238, 240, 232), (196, 70, 90)],
        'fruit': ['.y.', 'yhY', 'yYY', 'dd.'], 'couleurs': {'y': (246, 222, 64), 'h': (255, 250, 180), 'Y': (214, 176, 36), 'd': (128, 92, 20)},
    },
    'cerisier': {
        'feuilles': (10, 1.05, 0.9),
        'rose': [(92, 30, 58), (150, 52, 92), (204, 92, 136), (234, 140, 176), (250, 186, 210), (255, 222, 236)],
        'fruit': ['r.r', 'hRR', 'Rd.'], 'couleurs': {'r': (190, 20, 40), 'h': (255, 120, 120), 'R': (140, 10, 30), 'd': (80, 6, 18)},
    },
    'abricotier': {
        'feuilles': (-14, 1.0, 1.04),
        'fleurs': [(255, 248, 240), (250, 222, 214), (220, 120, 60)],
        'fruit': ['.o.', 'ohO', 'OOd'], 'couleurs': {'o': (244, 150, 40), 'h': (255, 214, 120), 'O': (214, 112, 24), 'd': (150, 70, 14)},
    },
    'pecher': {
        'feuilles': (16, 0.88, 0.98),
        'fleurs': [(255, 178, 214), (232, 92, 156), (150, 30, 80)],
        'fruit': ['.p.', 'phP', 'PRd'], 'couleurs': {'p': (250, 170, 110), 'h': (255, 220, 170), 'P': (226, 104, 86), 'R': (196, 52, 60), 'd': (140, 40, 40)},
    },
}


def feuillu():
    return Image.open(ARBRE).convert('RGBA')


def est_feuille(c):
    """Un vert du feuillage (pas le brun du tronc, ni le noir)."""
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
    return 70 / 360 <= h <= 170 / 360 and s > 0.15


def teinter(im, dteinte, fs, fl, rampe=None):
    """Le feuillage tourné de `dteinte` degrés, saturation × fs, luminosité × fl ; avec `rampe`,
    chaque vert prend la couleur de la rampe à sa luminosité (le cerisier en fleur)."""
    out = im.copy()
    px = out.load()
    w, h = im.size
    verts = sorted({px[x, y][:3] for y in range(h) for x in range(w) if px[x, y][3] and est_feuille(px[x, y][:3])},
                   key=lambda c: colorsys.rgb_to_hls(*(v / 255 for v in c))[1])
    rang = {c: i / max(1, len(verts) - 1) for i, c in enumerate(verts)}
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if not p[3]:
                continue
            c = p[:3]
            # l'herbe au pied de l'arbre (sous le tronc) reste de l'herbe
            if c not in rang or (y >= 52 and rampe):
                continue
            if rampe:
                t = rang[c] * (len(rampe) - 1)
                i = min(len(rampe) - 2, int(t))
                f = t - i
                n = tuple(round(a * (1 - f) + b * f) for a, b in zip(rampe[i], rampe[i + 1]))
            else:
                hh, ll, ss = colorsys.rgb_to_hls(*(v / 255 for v in c))
                r, g, b = colorsys.hls_to_rgb((hh + dteinte / 360) % 1, min(1, ll * fl), min(1, ss * fs))
                n = (round(r * 255), round(g * 255), round(b * 255))
            px[x, y] = n + (p[3],)
    return out


def places(im, n, graine, marge=3, ecart=6, bas=44):
    """`n` places sur le feuillage (le coin haut-gauche d'un dessin de 3 × 4 au plus), loin des bords
    du houppier et les unes des autres, toujours les mêmes."""
    px = im.load()
    w, _ = im.size

    def plein(x, y):
        for dy in range(-marge, 4 + marge):
            for dx in range(-marge, 3 + marge):
                xx, yy = x + dx, y + dy
                if not (0 <= xx < w and 0 <= yy < bas) or not px[xx, yy][3] or not est_feuille(px[xx, yy][:3]):
                    return False
        return True
    cand = sorted(((x, y) for y in range(bas) for x in range(w) if plein(x, y)), key=lambda p: hasard(graine, p[0], p[1]))
    out = []
    for x, y in cand:
        if all(max(abs(x - a), abs(y - b)) >= ecart for a, b in out):
            out.append((x, y))
        if len(out) >= n:
            break
    return out


def avec_fleurs(im, esp, graine):
    out = im.copy()
    px = out.load()
    clair, petale, coeur = esp['fleurs']
    # une fleur : cinq pixels en croix, le cœur au milieu ; quelques boutons d'un pixel entre elles
    for x, y in places(im, 26, graine, marge=1, ecart=4):
        for dx, dy, c in ((1, 0, petale), (0, 1, petale), (2, 1, petale), (1, 2, petale), (1, 1, coeur)):
            px[x + dx, y + dy] = c + (255,)
        px[x + 1, y] = clair + (255,)
    for x, y in places(im, 18, graine + 7, marge=0, ecart=3):
        if px[x + 1, y + 1][:3] not in esp['fleurs']:
            px[x + 1, y + 1] = clair + (255,)
    return out


def avec_fruits(im, esp, graine):
    out = im.copy()
    px = out.load()
    for x, y in places(im, 11, graine, marge=1, ecart=7):
        for dy, rang in enumerate(esp['fruit']):
            for dx, ch in enumerate(rang):
                if ch != '.':
                    px[x + dx, y + dy] = esp['couleurs'][ch] + (255,)
    return out


def arbuste(im):
    """Un petit feuillu : le houppier du grand resserré (un pixel sur deux tiers), son tronc
    raccourci, l'herbe du pied."""
    w, h = im.size
    hou = im.crop((0, 0, w, 46))
    hou = hou.resize((round(w * 0.62), round(46 * 0.62)), Image.NEAREST)
    pied = im.crop((14, 46, 34, h))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(pied.crop((0, 6, pied.width, pied.height)), (14, h - pied.height + 6))
    # (le houppier recouvre le haut du tronc : pas de jour entre eux)
    out.alpha_composite(hou, ((w - hou.width) // 2 + 1, h - pied.height + 6 - hou.height + 2))
    return out


def foot(im):
    """Case de 80×80 avec le dessin centré, pied sur le bas."""
    out = Image.new('RGBA', (CASE, CASE), (0, 0, 0, 0))
    box = im.getbbox()
    im = im.crop(box)
    out.alpha_composite(im, ((CASE - im.width) // 2, CASE - im.height))
    return out


def planche():
    base = feuillu()
    cases = [foot(A.soil()), foot(A.young_tree())]
    for i, (nom, esp) in enumerate(ESPECES.items()):
        arbre = teinter(base, *esp['feuilles'])
        fleur = teinter(base, 0, 1, 1, esp['rose']) if 'rose' in esp else avec_fleurs(arbre, esp, 11 + i)
        if 'rose' in esp:
            # des fleurs plus claires semées sur le rose, pour qu'il pétille
            fleur = avec_fleurs(fleur, {'fleurs': [esp['rose'][-1], esp['rose'][-2], (236, 214, 92)]}, 11 + i)
        cases += [foot(arbuste(arbre)), foot(arbre), foot(fleur), foot(avec_fruits(arbre, esp, 31 + i))]
    sheet = Image.new('RGBA', (CASE * len(cases), CASE), (0, 0, 0, 0))
    for i, im in enumerate(cases):
        sheet.alpha_composite(im, (i * CASE, 0))
    return sheet


def main():
    sheet = planche()
    sheet.save(os.path.join(ASSETS, 'verger.png'))
    print(f'assets/verger.png : {sheet.width} × {sheet.height} ({sheet.width // CASE} cases)')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_verger.png', 4, (74, 112, 58))


if __name__ == '__main__':
    main()
