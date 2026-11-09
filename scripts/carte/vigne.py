#!/usr/bin/env python3
"""La vigne de la zone de culture (le lot 4 des évolutions du crafting), dessinée dans la source des cultures
(scripts/carte/sources/cultures.png), à sa place (planche_cultures.py SOURCE : la rangée 14, colonnes 0, 2, 4, 6 ; une
colonne vide entre deux dessins, pour qu'ils ne se touchent pas), puis : python3 scripts/carte/planche_cultures.py.

Le style V1 : le cep qui grimpe le long de son tuteur, de grandes feuilles à trois lobes, des grappes de raisin noir ;
la butte de terre est celle de la tomate (sa pousse, prise dans la source), le contour sombre d'un pixel, comme les
autres cultures. Quatre phases : la bouture (le jour de la plantation), le jeune pied, le feuillage, les grappes mûres.
Après la vendange, la vigne revient au feuillage (data/crops.json vivace).

Usage (depuis la racine du dépôt) : python3 scripts/carte/vigne.py
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'sources', 'cultures.png')
T = 16
L, H = 24, 44
OUT = (14, 38, 18)
V = [(38, 104, 44), (62, 140, 56), (104, 178, 72), (150, 210, 98)]
BOIS = [(56, 36, 22), (80, 54, 30), (124, 88, 54), (170, 130, 84)]
NOIR = [(40, 24, 58), (60, 40, 88), (89, 64, 122), (143, 116, 176)]
TOMATE = (27, 32, 11)            # la pousse de la tomate dans la source : sa rangée du bas, sa hauteur, sa colonne
PLACE = (14, 32, [0, 2, 4, 6])   # la vigne dans la source (planche_cultures.py SOURCE)
BAS, CX = 39, 12                 # le bas de la butte, la tige, dans le dessin de L × H


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (L, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def p(self, x, y, c):
        if 0 <= x < L and 0 <= y < H:
            self.px[x, y] = tuple(c) + (255,)

    def fini(self):
        """Le contour sombre d'un pixel, comme les autres cultures."""
        add = []
        for y in range(H):
            for x in range(L):
                if self.px[x, y][3]:
                    continue
                if any(0 <= x + dx < L and 0 <= y + dy < H and self.px[x + dx, y + dy][3] and self.px[x + dx, y + dy][:3] != OUT
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.px[x, y] = OUT + (255,)
        return self.im


def butte_tomate(src):
    """La butte de la pousse de tomate : ses 3 rangées du bas (sa terre et son contour) → [(dx, dy, couleur)]."""
    r, h, col = TOMATE
    px = src.load()
    x0, y1 = col * T, (r + 1) * T
    pts = [(x, y) for y in range(y1 - h, y1 + 5) for x in range(x0 - 3, x0 + T + 3) if px[x, y][3]]
    b = max(y for _, y in pts)
    terre = {(56, 36, 22), (84, 56, 34), (124, 88, 54), (80, 54, 30), (128, 92, 54), (103, 73, 55), (90, 43, 30), (14, 38, 18)}
    bas = [(x, y) for x, y in pts if y > b - 3 and px[x, y][:3] in terre]
    cx = (min(x for x, _ in bas) + max(x for x, _ in bas) + 1) / 2
    return [(round(x - cx), y - b, px[x, y][:3]) for x, y in bas]


def poser_butte(t, butte):
    for dx, dy, c in butte:
        if not t.px[CX + dx, BAS + dy][3]:
            t.p(CX + dx, BAS + dy, c)


def feuille(t, x, y, k=1):
    """Une feuille de vigne : trois lobes."""
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (-1, -1), (1, -1), (0, 1), (-2, -1), (2, -1), (0, -2)):
        t.p(x + dx, y + dy, V[min(3, max(0, k + (1 if dy < 0 and dx <= 0 else 0) - (1 if dy > 0 else 0)))])
    t.p(x, y + 1, V[0])


def grappe(t, x, y, n=4):
    """Une grappe : des grains en triangle (4, 3, 2, 1), pointe en bas, un reflet en haut à gauche."""
    t.p(x, y - 1, BOIS[2])
    t.p(x + 1, y - 2, V[1])
    for row in range(n):
        w = n - row
        x0 = x - (w - 1) // 2
        for i in range(w):
            t.p(x0 + i, y + row, NOIR[2] if (i + row) % 2 == 0 else NOIR[1])
    t.p(x - (n - 1) // 2, y, NOIR[3])
    t.p(x - (n - 1) // 2 + 1, y + 1, NOIR[3])
    t.p(x + (n - 1) // 2 - (1 - n % 2), y + n - 1, NOIR[0])


def tuteur(t, h):
    for k in range(h):
        t.p(CX + 4, BAS - 1 - k, BOIS[2] if k % 5 else BOIS[1])
        t.p(CX + 5, BAS - 1 - k, BOIS[1])


def cep(t, haut):
    """Le cep : un tronc noueux qui se tord en montant."""
    x = CX
    for k in range(haut):
        y = BAS - 1 - k
        if k % 4 == 3:
            x += 1 if (k // 4) % 2 == 0 else -1
        t.p(x, y, BOIS[1])
        t.p(x + 1, y, BOIS[2] if k % 3 else BOIS[3])
    return x, BAS - haut


def vigne(phase, butte):
    t = Toile()
    if phase == 0:
        # la bouture : un bout de sarment planté, un bourgeon
        for k in range(5):
            t.p(CX, BAS - 1 - k, BOIS[1])
            t.p(CX + 1, BAS - 1 - k, BOIS[2])
        t.p(CX + 2, BAS - 5, V[2])
        t.p(CX + 2, BAS - 6, V[3])
        poser_butte(t, butte)
        return t.fini()
    tuteur(t, 30 if phase >= 2 else 18)
    x, top = cep(t, 10 if phase == 1 else 16 if phase == 2 else 18)
    places = [(x - 3, top + 4), (x + 2, top + 1), (x - 1, top - 2)] if phase == 1 else \
        [(x - 4, top + 8), (x + 3, top + 5), (x - 3, top + 2), (x + 3, top - 2), (x - 1, top - 4), (x + 2, top - 8), (x - 3, top - 7), (x + 1, top - 11)]
    for i, (fx, fy) in enumerate(places):
        feuille(t, fx, fy, 1 + (i % 2))
    if phase == 3:
        for gx, gy in ((x - 4, top + 10), (x + 3, top + 6), (x - 3, top + 1)):
            grappe(t, gx, gy)
    poser_butte(t, butte)
    return t.fini()


def main():
    src = Image.open(SRC).convert('RGBA')
    butte = butte_tomate(src)
    r, h, cols = PLACE
    for phase, col in enumerate(cols):
        # (la case de la source, et ce qui déborde autour : effacés, puis le dessin, le bas de sa butte 1 px sous la case)
        x0, y1 = col * T, (r + 1) * T
        src.paste(Image.new('RGBA', (T + 8, h + 12), (0, 0, 0, 0)), (x0 - 4, y1 - h - 8))
        d = vigne(phase, butte)
        x, y = x0 + T // 2 - CX, y1 + 1 - BAS
        if x < 0:                                   # (la colonne 0 : les colonnes vides du dessin, à gauche, coupées)
            assert not d.crop((0, 0, -x, H)).getbbox()
            d, x = d.crop((-x, 0, L, H)), 0
        src.alpha_composite(d, (x, y))
    src.save(SRC, optimize=True)
    print('scripts/carte/sources/cultures.png : la vigne (rangée %d, colonnes %s) ; puis : python3 scripts/carte/planche_cultures.py' % (r, cols))


if __name__ == '__main__':
    main()
