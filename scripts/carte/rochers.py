# Les rochers de la ferme générée, que la pioche casse : des blocs de pierre vus de haut à 45°,
# comme les blocs du jeu (scripts/carte/blocs.py) et la petite pierre à ramasser
# (scripts/carte/ramassables.py, mêmes gris) : un contour sombre d'un pixel, la lumière en haut
# à gauche, le dessus du rocher clair, son flanc avant dans l'ombre, des fissures, un peu de
# mousse sur les gros, et leur ombre portée sur l'herbe.
#
#   python3 scripts/carte/rochers.py            écrit assets/rochers.png
#   python3 scripts/carte/rochers.py --apercu   écrit aussi apercu_rochers.png
#
# Puis scripts/carte/planche_v2.py (le bloc « rochers » de la planche de la carte, 8 × 2
# tuiles) ; js/engine/planche.js (DESSINS_ROCHERS) et js/carte/ferme/config.js (ROCKS.gids)
# en lisent les tuiles. Dans l'image (en tuiles, depuis le coin haut-gauche) :
#   (0, 0) et (2, 0) : deux gros rochers de 2 × 2 cases ;
#   (4, 0) : un rocher debout de 1 × 2 cases (une colonne, deux rangées) ;
#   (5, 0) et (5, 1) : deux rochers couchés de 2 × 1 cases (deux colonnes, une rangée) ;
#   (7, 0) : un rocher moyen d'une case ; (7, 1) : deux cailloux d'une case.
# Le relief : chaque rocher est un champ de hauteurs (des demi-ellipsoïdes qui se chevauchent),
# éclairé d'en haut à gauche, taillé en pans plats (un ton de la pierre par pan).
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, T, apercu, contour, hasard, rgb  # noqa: E402

# la pierre des bâtiments (scripts/batiments/style_v2.py, PALETTE_SERRE['pierre']), prolongée
# de deux tons sombres et d'un clair ; le contour des blocs (scripts/carte/blocs.py, OUT)
GRIS = [(52, 48, 42), (74, 68, 58), (100, 92, 78), (125, 116, 99), (150, 140, 120), (173, 163, 143), (196, 186, 166), (220, 212, 194)]
CONTOUR = (36, 30, 20)
MOUSSE = [rgb(h)[:3] for h in ('#2e5a2c', '#467a36', '#6a9a44')]
OMBRE = (14, 30, 12, 92)                    # l'ombre portée sur l'herbe
LUMIERE = (-0.55, -0.75, 0.75)               # vers la lumière (x à droite, y vers le bas, z en haut)


def norme(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


L = norme(LUMIERE)


def rocher(w, h, blocs, mousse=0, fissures=(), graine=0):
    """Un rocher de w × h px : `blocs` = [(cx, cy, rx, ry, haut)] (des demi-ellipsoïdes : le
    champ de hauteurs est leur maximum) ; `mousse` : la part du dessus couverte de mousse ;
    `fissures` : [(x0, y0, x1, y1)] tracées en sombre sur la pierre ; son ombre au pied."""
    def hauteur(x, y):
        best = 0.0
        for cx, cy, rx, ry, hz in blocs:
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d < 1:
                best = max(best, hz * math.sqrt(1 - d))
        return best

    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    # l'ombre portée : la silhouette, aplatie et décalée vers le bas à droite
    for y in range(h):
        for x in range(w):
            if hauteur(x - 1.5, (y - h + 2) * 2.2 + h - 2 - 0.5) > 0 and hauteur(x + 0.5, y + 0.5) <= 0:
                px[x, y] = OMBRE
    # les facettes : la pierre est taillée en pans plats (un ton par pan, la moyenne de la
    # lumière sur le pan), des germes tous les ~5 px, un peu décalés au hasard
    germes = []
    for gy in range(0, h + 5, 5):
        for gx in range(0, w + 5, 5):
            germes.append((gx + hasard(graine, gx, gy, 1) * 4 - 2, gy + hasard(graine, gx, gy, 2) * 4 - 2))
    pan, lumi, haut = {}, {}, {}
    for y in range(h):
        for x in range(w):
            z = hauteur(x + 0.5, y + 0.5)
            if z <= 0:
                continue
            dx = hauteur(x + 1.5, y + 0.5) - hauteur(x - 0.5, y + 0.5)
            dy = hauteur(x + 0.5, y + 1.5) - hauteur(x + 0.5, y - 0.5)
            n = norme((-dx / 2, -dy / 2, 1.0))
            k = min(range(len(germes)), key=lambda i: (germes[i][0] - x) ** 2 + (germes[i][1] - y) ** 2)
            pan[(x, y)] = k
            lumi.setdefault(k, []).append(max(0.0, sum(a * b for a, b in zip(n, L))) + min(1.0, z / 12) * 0.25)
            haut[(x, y)] = (z, n)
    ton = {k: sum(v) / len(v) for k, v in lumi.items()}
    for (x, y), k in pan.items():
        z, n = haut[(x, y)]
        v = ton[k] - (0.2 if z < 1.6 else 0)          # (le pied, dans l'ombre de l'herbe)
        i = max(0, min(len(GRIS) - 2, int(v * (len(GRIS) - 1.5))))
        # l'arête d'un pan avec son voisin du dessus ou de gauche : un liseré clair
        if (pan.get((x, y - 1), k) != k or pan.get((x - 1, y), k) != k) and ton.get(pan.get((x, y - 1), k), 0) <= ton[k] + 0.05:
            i = min(len(GRIS) - 1, i + 1)
        c = GRIS[i]
        # la mousse : sur le dessus, à plat, par taches
        if mousse and n[2] > 0.82 and z > 4 and hasard(graine, x // 2, y // 2) < mousse:
            c = MOUSSE[2 if ton[k] > 0.8 else 1] if hasard(graine + 1, x, y) < 0.8 else MOUSSE[0]
        px[x, y] = c + (255,)
    for x0, y0, x1, y1 in fissures:
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
            if px[x, y][3] == 255 and px[x, y][:3] in GRIS:
                px[x, y] = GRIS[1] + (255,)
                if 0 <= y + 1 < h and px[x, y + 1][3] == 255 and px[x, y + 1][:3] in GRIS[3:]:
                    px[x, y + 1] = GRIS[6] + (255,)          # le bord éclairé sous la fissure
    # le contour : sur ce qui n'est ni pierre ni ombre
    pierre = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    pp = pierre.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 255:
                pp[x, y] = px[x, y]
    bord = contour(pierre, CONTOUR)
    bp = bord.load()
    for y in range(h):
        for x in range(w):
            if bp[x, y][3] == 255 and px[x, y][3] < 255:
                px[x, y] = bp[x, y]
    return im


def dessins():
    """Les rochers, à leur place dans l'image (en px)."""
    D = T
    return [
        # deux gros rochers de 2 × 2 cases
        ((0, 0), rocher(2 * D, 2 * D, [(14, 19, 11, 9, 12), (21, 16, 8, 8, 10), (9, 23, 7, 5, 5), (23, 24, 6, 4, 4)],
                        mousse=0.35, fissures=[(12, 13, 15, 19), (20, 12, 24, 16), (16, 22, 19, 25)], graine=1)),
        ((2 * D, 0), rocher(2 * D, 2 * D, [(16, 18, 12, 10, 13), (10, 22, 7, 6, 7), (24, 22, 6, 6, 6)],
                            mousse=0.25, fissures=[(14, 11, 17, 17), (17, 17, 22, 19), (9, 21, 12, 24)], graine=2)),
        # le rocher debout de 1 × 2 cases
        ((4 * D, 0), rocher(D, 2 * D, [(8, 18, 5.5, 11, 13), (10, 26, 4.5, 3.5, 4)], mousse=0.2,
                            fissures=[(7, 10, 8, 16), (8, 16, 10, 20)], graine=3)),
        # les rochers couchés de 2 × 1 cases
        ((5 * D, 0), rocher(2 * D, D, [(12, 9, 9, 5, 7), (21, 10, 7, 4, 5)], fissures=[(13, 6, 15, 10)], graine=4)),
        ((5 * D, D), rocher(2 * D, D, [(15, 9, 12, 5, 6), (8, 10, 5, 3.5, 3)], fissures=[(19, 6, 18, 10), (11, 7, 12, 9)], graine=5)),
        # le rocher moyen et les deux cailloux d'une case
        ((7 * D, 0), rocher(D, D, [(8, 9, 5.5, 4.5, 6)], fissures=[(7, 6, 8, 9)], graine=6)),
        ((7 * D, D), rocher(D, D, [(6, 10, 3.5, 2.8, 3.5), (11, 12, 2.6, 2, 2.5)], graine=7)),
    ]


def main():
    out = Image.new('RGBA', (8 * T, 2 * T), (0, 0, 0, 0))
    for (x, y), im in dessins():
        out.alpha_composite(im, (x, y))
    out.save(os.path.join(ASSETS, 'rochers.png'))
    print(f'assets/rochers.png : {out.width} × {out.height}')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', out.size, (96, 140, 70, 255))
        fond.alpha_composite(out)
        apercu(fond, 'apercu_rochers.png', zoom=8)


if __name__ == '__main__':
    main()
