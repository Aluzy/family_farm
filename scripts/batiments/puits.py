# assets/puits.png : le puits de la ferme, en haut à gauche du Moulin, 3 images de 34×40 :
#   0 : le vieux puits seul (margelle de pierres, deux poteaux, toit de bardeaux, seau) ;
#   1 : le même, avec le tuyau de la pompe plongé dans le puits ;
#   2 : la pompe électrique seule, posée à droite du puits (par-dessus l'image 1 une fois la
#       pompe achetée ; la carte la fait vibrer d'un pixel vers la droite quand elle tourne).
#       Le tuyau de l'image 1 court sous son bord gauche : décalée, elle reste raccordée.
# Aux couleurs de la serre, comme les bâtiments (PALETTE_SERRE de scripts/batiments/style_v2.py) :
# toit en dôme, bois et pierres ; l'eau et la pompe gardent les leurs.
# Lumière à gauche.
from PIL import Image
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style_v2 import PALETTE_SERRE as PS  # noqa: E402

TOIT = PS['toit']

W, H = 34, 40
C = {
    'out': (36, 30, 20),
    # pierres
    'sj': PS['pierre'][0], 'sd': PS['pierre'][1], 'sm': PS['pierre'][2], 'sl': PS['pierre'][3], 'sh': PS['pierre'][4],
    # eau
    'eau': (28, 38, 58), 'eau_l': (64, 96, 138),
    # bois
    'wo': PS['cadre'][0], 'wd': PS['bois'][1], 'wm': PS['bois'][2], 'wl': PS['bois'][3],
    # toit (les tons des toits des bâtiments)
    'rj': TOIT[0], 'rd': TOIT[2], 'rm': TOIT[3], 'rl': TOIT[4], 'rh': TOIT[5],
    # pompe
    'po': (28, 32, 40), 'pd': (38, 62, 66), 'pm': (58, 92, 96), 'pl': (96, 140, 140),
    'tu': (120, 124, 130), 'tl': (176, 180, 186), 'voyant': (240, 204, 80),
}
CX = 13          # axe du puits
TOP, BOT = 24, 34  # centre de l'ellipse du haut de la margelle, et du bas
RX, RY = 10, 4


def frame(kind):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = (C[c] if isinstance(c, str) else c) + (a,)

    if kind == 'pompe':
        draw_pump(put)
        return im

    def half(x, ry):
        d = (x - CX) / (RX + 0.5)
        return ry * math.sqrt(max(0.0, 1 - d * d))

    # margelle : cylindre de pierres en rangées de 3 px, joints décalés
    for x in range(CX - RX, CX + RX + 1):
        y0 = round(TOP + half(x, RY))
        y1 = round(BOT + half(x, RY))
        for y in range(y0, y1 + 1):
            if x in (CX - RX, CX + RX) or y == y1:
                put(x, y, 'out'); continue
            row = (y - round(TOP + half(x, RY))) // 3
            joint_h = (y - round(TOP + half(x, RY))) % 3 == 2
            joint_v = (x + (row % 2) * 3) % 6 == 0
            if joint_h or joint_v:
                put(x, y, 'sj'); continue
            t = (x - (CX - RX)) / (2 * RX)
            put(x, y, 'sh' if t < 0.18 else 'sl' if t < 0.4 else 'sm' if t < 0.75 else 'sd')
    # dessus de la margelle : anneau clair, eau sombre au milieu
    for x in range(CX - RX, CX + RX + 1):
        h = half(x, RY)
        for y in range(round(TOP - h), round(TOP + h) + 1):
            inner = ((x - CX) / (RX - 2.5)) ** 2 + ((y - TOP) / (RY - 1.5)) ** 2 <= 1
            if y == round(TOP - h) or x in (CX - RX, CX + RX):
                put(x, y, 'out')
            elif inner:
                put(x, y, 'eau_l' if (y == TOP and CX - 4 <= x <= CX - 2) else 'eau')
            else:
                put(x, y, 'sh' if x < CX else 'sl')
    # poteaux
    for x0 in (CX - RX + 1, CX + RX - 2):
        for y in range(8, TOP + 1):
            put(x0, y, 'wl' if x0 < CX else 'wm')
            put(x0 + 1, y, 'wd')
    # treuil
    for x in range(CX - RX + 1, CX + RX):
        put(x, 12, 'wo')
        put(x, 13, 'wm')
        put(x, 14, 'wd')
    put(CX + RX, 13, 'wo'); put(CX + RX + 1, 13, 'wo'); put(CX + RX + 1, 14, 'wo')  # manivelle
    # corde et seau
    for y in range(15, 18):
        put(CX, y, 'wo')
    for y in range(18, 22):
        for x in range(CX - 2, CX + 3):
            if y == 21 or x in (CX - 2, CX + 2):
                put(x, y, 'wo')
            else:
                put(x, y, 'tl' if y == 19 else 'wl' if x < CX else 'wm')
    # toit en dôme, bardeaux : demi-largeur span(y), un quart de cercle aplati du sommet (y = 1)
    # à l'avant-toit ; vu de 3/4, son bord bas est une demi-ellipse (bombe(x) pixels plus bas au
    # milieu qu'aux bouts), et les rangées de bardeaux suivent cette courbe. Contour sombre.
    def span(y):
        t = (9.5 - min(y, 9)) / 9.0
        return 13.4 * math.sqrt(max(0.0, 1 - t * t)) if y >= 1 else -1

    def bombe(x):
        d = (x - CX) / 14.0
        return 2.2 * math.sqrt(max(0.0, 1 - d * d))

    def dedans(x, y):
        return abs(x - CX) <= span(y) and y <= 9 + bombe(x)

    for y in range(1, 13):
        for x in range(CX - 14, CX + 15):
            if not dedans(x, y):
                continue
            if not (dedans(x - 1, y) and dedans(x + 1, y) and dedans(x, y - 1) and dedans(x, y + 1)):
                put(x, y, 'rj'); continue
            v = y - bombe(x)                      # hauteur le long de la courbe
            row = math.floor((v - 1) / 3)
            if (v - 1) - 3 * row >= 2.2 or (x + (row % 2) * 2) % 4 == 0:
                put(x, y, 'rd'); continue
            t = (x - CX) / 13
            put(x, y, 'rh' if t < -0.45 else 'rl' if t < -0.1 else 'rm' if t < 0.45 else 'rd')
    if kind == 'tuyau':
        # tuyau : de la pompe au bord du puits, puis dedans
        for x in range(CX + 4, 27):
            put(x, 26, 'tl'); put(x, 27, 'tu')
        for y in range(TOP, 27):
            put(CX + 4, y, 'tu')
    return im


def draw_pump(put):
    # corps de la pompe
    for x in range(25, 33):
        for y in range(25, 36):
            if x in (25, 32) or y in (25, 35):
                put(x, y, 'po')
            elif y == 28:
                put(x, y, 'pd')
            else:
                put(x, y, 'pl' if x == 26 else 'pm' if x < 31 else 'pd')
    # moteur sur le dessus
    for x in range(26, 32):
        for y in range(21, 25):
            put(x, y, 'po' if y == 21 or x in (26, 31) else 'pl' if x == 27 else 'pm')
    for y in (22, 23):
        put(29, y, 'pd')
    put(30, 31, 'voyant')


sheet = Image.new('RGBA', (W * 3, H), (0, 0, 0, 0))
for n, kind in enumerate(('puits', 'tuyau', 'pompe')):
    sheet.paste(frame(kind), (n * W, 0))
out = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puits.png'))
sheet.save(out)
print('assets/puits.png : 3 images de', W, '×', H)
