# Meubles de l'intérieur de la maison (assets/maison_interieur.json) : chacun ouvre sa fenêtre.
#   assets/meuble_four.png    : le four à pain, voûte de pierre, feu dans la gueule (32×40)
#   assets/meuble_cuisine.png : le fourneau sur son meuble de cuisine, marmite fumante (32×34)
#   assets/meuble_frigo.png   : le réfrigérateur blanc à deux portes (20×38)
# Vus de face, posés contre le mur du fond ; lumière à gauche.
#
#   python3 scripts/batiments/meubles.py            écrit les trois images
#   python3 scripts/batiments/meubles.py --apercu   écrit aussi apercu_meubles.png (agrandi)
import math
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

C = {
    'K': (34, 22, 16),                                           # contour
    # pierre
    'p0': (74, 66, 62), 'p1': (112, 102, 94), 'p2': (148, 138, 126), 'p3': (186, 176, 160), 'mo': (92, 82, 76),
    # feu
    'f0': (40, 18, 12), 'f1': (168, 52, 24), 'f2': (232, 120, 36), 'f3': (252, 200, 72), 'f4': (255, 240, 170),
    # bois
    'w0': (60, 30, 22), 'w1': (96, 54, 32), 'w2': (134, 82, 46), 'w3': (170, 112, 64), 'w4': (204, 150, 92),
    # fonte, métal
    'i0': (28, 30, 38), 'i1': (52, 56, 66), 'i2': (86, 92, 104), 'i3': (134, 140, 152),
    # marmite rouge, vapeur
    'r0': (92, 24, 28), 'r1': (150, 44, 44), 'r2': (196, 76, 64), 's': (236, 240, 244),
    # frigo
    'b0': (150, 156, 164), 'b1': (196, 202, 206), 'b2': (228, 232, 232), 'b3': (250, 250, 246), 'ch': (176, 184, 192),
}


def canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def painter(im):
    px = im.load()
    w, h = im.size

    def put(x, y, k, a=255):
        if 0 <= x < w and 0 <= y < h:
            px[int(x), int(y)] = C[k] + (a,)

    def get(x, y):
        return px[x, y][3] if 0 <= x < w and 0 <= y < h else 0
    return put, get


def outline(im):
    """Contour sombre de 1 px autour de tout ce qui est dessiné."""
    put, get = painter(im)
    w, h = im.size
    pts = [(x, y) for y in range(h) for x in range(w) if not get(x, y) and any(get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in pts:
        put(x, y, 'K')


def four():
    W, H = 32, 40
    im = canvas(W, H)
    put, _ = painter(im)
    cx = 15.5
    # cheminée
    for y in range(2, 14):
        for x in range(20, 25):
            put(x, y, 'i1' if x < 23 else 'i0')
        put(20, y, 'i2')
    for x in range(19, 26):
        put(x, 2, 'i2')
    # voûte de pierre : un demi-disque sur un socle
    for y in range(8, 38):
        for x in range(2, 30):
            dx = (x + 0.5 - cx) / 14.0
            top = 24 - 15 * math.sqrt(max(0.0, 1 - dx * dx))
            if y + 0.5 < top:
                continue
            # pierres en quinconce, joints de mortier
            row = (y - 6) // 4
            off = 3 if row % 2 else 0
            joint = (y - 6) % 4 == 0 or (x + off) % 6 == 0
            light = 'p3' if x < 9 else 'p2' if x < 20 else 'p1'
            k = 'mo' if joint else light
            if y >= 34:
                k = 'p0' if joint else 'p1'          # socle plus sombre
            put(x, y, k)
    # gueule du four : arche sombre, braises et flammes
    for y in range(20, 33):
        for x in range(8, 24):
            dx = (x + 0.5 - cx) / 7.5
            top = 26 - 6 * math.sqrt(max(0.0, 1 - dx * dx))
            if y + 0.5 < top:
                continue
            put(x, y, 'f0')
    flames = {32: 'f1', 31: 'f2', 30: 'f2', 29: 'f3', 28: 'f3', 27: 'f4'}
    for y, k in flames.items():
        half = {32: 6, 31: 5, 30: 4, 29: 3, 28: 2, 27: 1}[y]
        for x in range(int(cx - half), int(cx + half) + 1):
            if (x + y) % 3 or y >= 31:
                put(x, y, k)
    for x in range(9, 23, 2):
        put(x, 32, 'f2')
    # rebord de pierre clair sous la gueule
    for x in range(7, 25):
        put(x, 33, 'p3')
    outline(im)
    return im


def cuisine():
    W, H = 32, 34
    im = canvas(W, H)
    put, _ = painter(im)
    # meuble de bois : plan de travail, deux portes, poignées
    for y in range(18, 33):
        for x in range(1, 31):
            k = 'w2'
            if x in (1, 2) or y == 32:
                k = 'w1'
            if x == 15 or x == 16:
                k = 'w0'                              # séparation des portes
            if y in (19, 31) and x not in (15, 16):
                k = 'w1'
            if x in (4, 27) and 20 <= y <= 30:
                k = 'w3'                              # moulures
            put(x, y, k)
    for x in (12, 19):
        for y in (24, 25):
            put(x, y, 'i3')
    for x in range(0, 32):
        put(x, 16, 'w4')
        put(x, 17, 'w3')
    # fourneau de fonte posé sur le plan
    for y in range(9, 16):
        for x in range(3, 29):
            put(x, y, 'i1' if y > 10 else 'i2')
    for x in range(4, 28):
        put(x, 9, 'i3')
    for bx in (9, 22):                                # feux, l'un allumé
        for x in range(bx - 3, bx + 3):
            put(x, 10, 'i0')
    for x in range(19, 25):
        put(x, 10, 'f2' if x % 2 else 'f3')
    put(6, 13, 'i3'); put(25, 13, 'i3')               # boutons
    # marmite rouge sur le feu de gauche, couvercle, vapeur
    for y in range(3, 10):
        for x in range(4, 15):
            k = 'r2' if x < 7 else 'r1'
            if y == 3:
                k = 'i3' if 6 <= x <= 12 else None
            if k:
                put(x, y, k)
    for x in range(5, 14):
        put(x, 4, 'r0')
    put(9, 2, 'i2'); put(10, 2, 'i2')
    for (x, y) in ((8, 0), (9, 1), (12, 0), (11, 1)):
        put(x, y, 's', 200)
    outline(im)
    return im


def frigo():
    W, H = 20, 38
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(1, 37):
        for x in range(1, 19):
            # coins du haut arrondis
            if y < 3 and (x < 3 - y + 1 or x > 16 + y - 1):
                continue
            k = 'b3' if x < 6 else 'b2' if x < 14 else 'b1'
            if x == 18:
                k = 'b0'
            put(x, y, k)
    for x in range(1, 19):                            # jointure entre congélateur et frigo
        put(x, 12, 'b0')
        put(x, 13, 'b1')
    for y in list(range(4, 10)) + list(range(16, 27)):  # poignées chromées
        put(15, y, 'ch')
        put(16, y, 'b0')
    for x in range(2, 18):                            # socle
        put(x, 35, 'b0')
        put(x, 36, 'i1')
    put(4, 4, 'b3'); put(4, 15, 'b3')
    outline(im)
    return im


def main():
    out = {'meuble_four.png': four(), 'meuble_cuisine.png': cuisine(), 'meuble_frigo.png': frigo()}
    for name, im in out.items():
        im.save(os.path.join(ROOT, 'assets', name), optimize=True)
    if '--apercu' in sys.argv:
        k = 6
        W = sum(im.width for im in out.values()) * k + 40
        H = max(im.height for im in out.values()) * k
        ap = Image.new('RGBA', (W, H), (152, 124, 88, 255))
        x = 0
        for im in out.values():
            big = im.resize((im.width * k, im.height * k), Image.NEAREST)
            ap.alpha_composite(big, (x, H - big.height))
            x += big.width + 20
        ap.save(os.path.join(ROOT, 'apercu_meubles.png'))
    print('meubles de la maison : ' + ', '.join(out))


if __name__ == '__main__':
    main()
