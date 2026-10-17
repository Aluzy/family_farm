# assets/citerne.png : la citerne (le réservoir du jeu), à droite de la pompe du puits.
# Cuve de tôle cerclée sur un socle de bois, tube de niveau en façade, tuyau d'arrivée à
# gauche qui rejoint le moteur de la pompe (puits.png, posé juste à gauche).
# 5 images de 24×34 : le tube de niveau vide (0), puis rempli au quart, à moitié, aux trois
# quarts et plein (4). Lumière à gauche.
from PIL import Image
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, rangee  # noqa: E402

W, H = 24, 34
N = 5
C = {
    'out': (36, 40, 50),
    'md': (78, 88, 98), 'mm': (110, 124, 134), 'ml': (150, 164, 172), 'mh': (186, 198, 204),
    'band': (64, 72, 82), 'rivet': (196, 206, 212),
    'verre': (176, 200, 212), 'eau': (58, 118, 188), 'eau_l': (110, 168, 224),
    'wo': (60, 30, 22), 'wd': (92, 50, 30), 'wm': (128, 76, 44), 'wl': (162, 104, 62),
    'tu': (120, 124, 130), 'tl': (176, 180, 186),
}
CX = 11.5        # axe de la cuve
X0, X1 = 3, 20   # bords de la cuve
TOP, BOT = 6, 27
RY = 2
GAUGE_X = 15     # tube de niveau : 2 px de large
G_TOP, G_BOT = 10, 25


def frame(niveau):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = (C[c] if isinstance(c, str) else c) + (a,)

    def half(x):
        d = (x - CX) / ((X1 - X0) / 2 + 0.5)
        return RY * math.sqrt(max(0.0, 1 - d * d))

    # socle de bois
    for x in range(X0 - 1, X1 + 2):
        for y in range(28, 32):
            if y == 31 or x in (X0 - 1, X1 + 1):
                put(x, y, 'wo')
            elif y == 28:
                put(x, y, 'wl')
            else:
                put(x, y, 'wd' if (x - X0) % 5 == 4 else 'wm')
    # cuve : cylindre de tôle, deux cerclages rivetés
    for x in range(X0, X1 + 1):
        y0 = round(TOP + half(x))
        y1 = round(BOT + half(x))
        t = (x - X0) / (X1 - X0)
        base = 'mh' if t < 0.15 else 'ml' if t < 0.4 else 'mm' if t < 0.75 else 'md'
        for y in range(y0, y1 + 1):
            if x in (X0, X1) or y == y1:
                put(x, y, 'out')
            elif y - round(half(x)) in (12, 20):
                put(x, y, 'rivet' if (x - X0) % 4 == 2 else 'band')
            else:
                put(x, y, base)
    # couvercle : ellipse claire, trappe au milieu
    for x in range(X0, X1 + 1):
        h = half(x)
        for y in range(round(TOP - h), round(TOP + h) + 1):
            if y == round(TOP - h) or x in (X0, X1):
                put(x, y, 'out')
            else:
                put(x, y, 'mh' if x < CX else 'ml')
    for x in range(9, 15):
        put(x, TOP - 1, 'out')
        put(x, TOP, 'md')
    for x in range(10, 14):
        put(x, TOP - 2, 'mm')
    # tube de niveau : l'eau monte du bas selon le remplissage
    haut = G_BOT - G_TOP + 1
    plein = round(haut * niveau / (N - 1))
    for y in range(G_TOP - 1, G_BOT + 2):
        for x in (GAUGE_X - 1, GAUGE_X + 2):
            put(x, y, 'out')
    for x in range(GAUGE_X - 1, GAUGE_X + 3):
        put(x, G_TOP - 1, 'out')
        put(x, G_BOT + 1, 'out')
    for y in range(G_TOP, G_BOT + 1):
        rempli = y > G_BOT - plein
        for x in (GAUGE_X, GAUGE_X + 1):
            if rempli:
                put(x, y, 'eau_l' if (y == G_BOT - plein + 1 or x == GAUGE_X) else 'eau')
            else:
                put(x, y, 'verre' if x == GAUGE_X else 'ml')
    # tuyau d'arrivée, depuis le moteur de la pompe (à gauche), puis le long de la cuve
    for x in range(0, X0 + 1):
        put(x, 15, 'tl')
        put(x, 16, 'tu')
    put(X0, 14, 'out'); put(X0, 17, 'out')
    return im


sheet = rangee([frame(n) for n in range(N)], W, H)
sheet.save(os.path.join(ASSETS, 'citerne.png'))
print('assets/citerne.png :', N, 'images de', W, '×', H)
