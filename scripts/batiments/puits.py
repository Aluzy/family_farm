# assets/puits.png : le puits de la ferme, à droite de la maison, 2 images de 34×40 :
#   0 : le vieux puits seul (margelle de pierres, deux poteaux, toit de bardeaux, seau) ;
#   1 : le même, avec la pompe électrique achetée, posée à sa droite, son tuyau plongé dans le puits.
# Toit aux couleurs de celui de la maison. Lumière à gauche.
from PIL import Image
import math
import os

W, H = 34, 40
C = {
    'out': (50, 34, 40),
    # pierres
    'sj': (70, 64, 62), 'sd': (96, 92, 88), 'sm': (124, 120, 112), 'sl': (156, 152, 140), 'sh': (184, 180, 166),
    # eau
    'eau': (28, 38, 58), 'eau_l': (64, 96, 138),
    # bois
    'wo': (60, 30, 22), 'wd': (92, 50, 30), 'wm': (128, 76, 44), 'wl': (162, 104, 62),
    # toit (comme house_sp.png)
    'rj': (60, 17, 35), 'rd': (72, 41, 62), 'rm': (96, 58, 80), 'rl': (116, 74, 98),
    # pompe
    'po': (28, 32, 40), 'pd': (38, 62, 66), 'pm': (58, 92, 96), 'pl': (96, 140, 140),
    'tu': (120, 124, 130), 'tl': (176, 180, 186), 'voyant': (240, 204, 80),
}
CX = 13          # axe du puits
TOP, BOT = 24, 34  # centre de l'ellipse du haut de la margelle, et du bas
RX, RY = 10, 4


def frame(pompe):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = (C[c] if isinstance(c, str) else c) + (a,)

    def half(x, ry):
        d = (x - CX) / (RX + 0.5)
        return ry * math.sqrt(max(0.0, 1 - d * d))

    # ombre au sol
    for x in range(0, W):
        for y in range(34, 40):
            if ((x - (CX + 3)) / 15) ** 2 + ((y - 37) / 2.6) ** 2 <= 1:
                put(x, y, (24, 44, 30), 90)
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
    # toit à deux pans, bardeaux
    for y in range(1, 10):
        span = round((y - 1) * 13 / 8)
        for x in range(CX - span, CX + span + 1):
            if y == 9 or abs(x - CX) == span:
                put(x, y, 'rj'); continue
            if (y - 1) % 3 == 2:
                put(x, y, 'rd'); continue
            put(x, y, 'rl' if x < CX - 2 else 'rm' if x <= CX + 2 else 'rd')
        put(CX, y, 'rj')   # faîtage
    if pompe:
        # tuyau : de la pompe au bord du puits, puis dedans
        for x in range(CX + 4, 27):
            put(x, 26, 'tl'); put(x, 27, 'tu')
        for y in range(TOP, 27):
            put(CX + 4, y, 'tu')
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
    return im


sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
sheet.paste(frame(False), (0, 0))
sheet.paste(frame(True), (W, 0))
out = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puits.png'))
sheet.save(out)
print('assets/puits.png : 2 images de', W, '×', H)
