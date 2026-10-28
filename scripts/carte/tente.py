# La tente du bivouac (le récit, lot 8 : docs/recit/plan.md) : quand le personnage dort loin de la ferme
# avec sa tente, elle est plantée là où il est et le couvre (js/carte/ferme/chantier.js bedSpot, comme la
# couverture d'une paillasse). Une toile verte en A, vue de face un peu de haut (comme les maisons), son
# entrée sombre au milieu, la toile du flanc droit plus claire (la lumière vient d'en haut à gauche), la
# corde du faîte et deux piquets, un contour sombre d'un pixel.
#
#   python3 scripts/carte/tente.py      écrit assets/tente.png (40 × 34 px, le pied au milieu du bas)
#
# Relancer le script redonne la même image.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS  # noqa: E402

SORTIE = os.path.join(ASSETS, 'tente.png')
CONTOUR = (40, 30, 22)
TOILE = [(52, 84, 44), (72, 112, 56), (96, 140, 70), (124, 168, 88), (150, 190, 108)]
NUIT = [(20, 18, 18), (34, 28, 26), (48, 40, 36)]
BOIS = [(92, 64, 40), (148, 110, 72)]
CORDE = (214, 196, 150)


def tente():
    w, h = 40, 34
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    q = im.load()

    def pose(x, y, c):
        if 0 <= x < w and 0 <= y < h:
            q[x, y] = tuple(c) + (255,)

    sol, sommet, cx = h - 3, 3, 20
    for y in range(sommet, sol + 1):
        t = (y - sommet) / (sol - sommet)          # 0 au faîte, 1 au sol
        demi = round(1 + t * 17)                   # la demi-largeur de la façade
        for x in range(cx - demi, cx + demi + 1):
            gauche = x < cx
            c = TOILE[1] if gauche else TOILE[3]
            if (x + y) % 5 == 0:
                c = TOILE[0] if gauche else TOILE[2]   # le grain de la toile
            if abs(x - cx) <= 1:
                c = TOILE[4]                           # la couture du milieu, au jour
            pose(x, y, c)
        # l'entrée : un triangle sombre sous la moitié haute
        if t > 0.45:
            e = round((t - 0.45) / 0.55 * 6)
            for x in range(cx - e, cx + e + 1):
                pose(x, y, NUIT[0] if abs(x - cx) < e - 1 else NUIT[2])
    # le bas de la toile, posé au sol (une bande plus sombre)
    for x in range(cx - 18, cx + 19):
        pose(x, sol, TOILE[0])
    # la corde du faîte et ses deux piquets, de chaque côté
    for x0, sens in ((1, 1), (38, -1)):
        for k in range(8):
            pose(x0 + sens * k // 2, sol - 8 + k, CORDE)
        pose(x0, sol, BOIS[1])
        pose(x0, sol + 1, BOIS[0])
    pose(cx, sommet - 1, BOIS[1])
    pose(cx, sommet - 2, BOIS[0])
    # le contour : autour de ce qui est opaque
    src = im.copy().load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and src[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                q[x, y] = CONTOUR + (255,)
    return im


if __name__ == '__main__':
    tente().save(SORTIE)
    print('assets/tente.png : 40 × 34')
