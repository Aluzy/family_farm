#!/usr/bin/env python3
"""Ce qui brille la nuit dans le grand monde (docs/gisements.md, lot 2) : les champignons lumineux des forêts et les
amas de cristaux (quartz, améthyste) des montagnes. Vus de haut à 45°, la lumière en haut à gauche, un contour sombre
teinté ; le jour, ils se voient à peine plus que leurs voisins ; la nuit, la scène pose une lueur sur chacun
(js/carte/ferme/lumineux.js), et leurs teintes vives ressortent.

  champignons_lumineux(k)   (image, px, py) : une touffe de 2 ou 3 petits champignons (vegetation.py la range dans
                            assets/vegetation.png : sorte champignons_lumineux, genre « haute ») ;
  cristaux('quartz', k)     (image, px, py) : un amas de prismes sur un socle de granit (roches.py : sortes
  cristaux('amethyste', k)  cristaux_quartz, cristaux_amethyste, genre « bloc »).

Les couleurs sont celles des champignons et des cristaux de l'ancienne mine (js/grotte.js, les lanternes : le cyan
0x8ff5e0), pour qu'on les reconnaisse.
"""
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from pixel import hasard  # noqa: E402

# le chapeau des champignons : de l'ombre bleu-vert au cyan presque blanc ; le pied, pâle
CHAPEAU = [(22, 52, 64), (32, 98, 104), (52, 158, 152), (92, 214, 196), (150, 246, 226), (226, 255, 248)]
PIED = [(122, 132, 128), (176, 186, 176), (222, 230, 216)]
# les cristaux : de l'ombre à l'éclat
QUARTZ = [(92, 110, 134), (136, 160, 186), (184, 206, 226), (224, 238, 248), (252, 254, 255)]
AMETHYSTE = [(54, 22, 84), (96, 46, 146), (146, 88, 206), (194, 148, 242), (236, 214, 255)]
GRANIT = [(62, 61, 62), (82, 80, 80), (104, 101, 99), (126, 122, 118), (148, 144, 138)]


def contour(im, force=0.3):
    P = im.load()
    W, H = im.size
    out = []
    for y in range(H):
        for x in range(W):
            if P[x, y][3]:
                continue
            v = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < W and 0 <= y + b < H and P[x + a, y + b][3]]
            if v:
                r, g, b, _ = P[v[0]]
                out.append((x, y, (int(r * force + 8), int(g * force + 8), int(b * force + 14), 255)))
    for x, y, c in out:
        P[x, y] = c
    return im


# les touffes : [(x du pied, haut du chapeau, rayon)] des champignons, du fond vers l'avant
TOUFFES = [
    [(5, 7, 3.0), (10, 5, 3.8), (13, 10, 2.4)],
    [(6, 6, 3.6), (12, 8, 3.0)],
    [(4, 9, 2.6), (9, 4, 4.0), (14, 8, 2.8)],
]


def champignons_lumineux(k):
    W, H = 18, 16
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    P = im.load()
    sol = H - 2
    for cx, haut, r in sorted(TOUFFES[k], key=lambda t: t[1]):
        top = haut
        cy = top + r * 0.6                      # le bord du chapeau
        # le pied : une tige pâle, plus claire à gauche, qui s'évase au sol
        large = (0, 1) if r >= 3.4 else (0,)
        for y in range(int(cy), sol + 1):
            for dx in large:
                x = int(cx) + dx
                if 0 <= x < W:
                    P[x, y] = PIED[2 if dx == 0 else 1] + (255,)
            if y == sol and 0 <= int(cx) - 1 < W:
                P[int(cx) - 1, y] = PIED[0] + (255,)
        # le chapeau : un demi-dôme, éclairé en haut à gauche, le bord un peu plus sombre ; des points clairs
        for y in range(H):
            for x in range(W):
                dx, dy = (x + 0.5 - (cx + 0.5)) / r, (y + 0.5 - cy) / (r * 0.75)
                if dx * dx + dy * dy > 1 or y + 0.5 > cy + 0.6:
                    continue
                v = 0.62 - 0.38 * dx - 0.3 * dy
                if dy > 0.1:
                    v -= 0.22                     # le dessous du bord, dans l'ombre
                v += (hasard(k, x, y) - 0.5) * 0.08
                P[x, y] = CHAPEAU[max(0, min(len(CHAPEAU) - 1, round(v * (len(CHAPEAU) - 1))))] + (255,)
        # les taches claires du chapeau
        for j in range(2):
            x, y = int(cx + 0.5 - r * 0.35 + j * r * 0.55), int(cy - r * 0.45 + j)
            if 0 <= x < W and 0 <= y < H and P[x, y][3]:
                P[x, y] = CHAPEAU[5] + (255,)
    return contour(im, 0.28), W // 2, sol + 1


# les amas : [(x du pied, hauteur, demi-largeur, pente)] des prismes, du fond vers l'avant
AMAS = [
    [(9, 12, 2.4, 0.0), (5, 8, 1.8, -0.35), (13, 9, 2.0, 0.4), (11, 5, 1.4, 0.2)],
    [(8, 10, 2.2, -0.15), (12, 12, 2.4, 0.25), (5, 6, 1.6, -0.45), (14, 6, 1.4, 0.55)],
    [(10, 13, 2.6, 0.1), (6, 9, 2.0, -0.3), (14, 7, 1.6, 0.45), (8, 5, 1.2, -0.1), (12, 4, 1.2, 0.3)],
]


def cristaux(sorte, k):
    pal = QUARTZ if sorte == 'quartz' else AMETHYSTE
    W, H = 20, 20
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    P = im.load()
    sol = H - 3
    # le socle : une pierre plate de granit
    for y in range(sol - 1, H):
        for x in range(2, W - 2):
            dx, dy = (x + 0.5 - W / 2) / (W / 2 - 2), (y + 0.5 - (sol + 0.5)) / 2.2
            if dx * dx + dy * dy <= 1:
                P[x, y] = GRANIT[max(0, min(4, round(3 - 1.6 * dx - 1.2 * dy + (hasard(k, x, y) - 0.5))))] + (255,)
    # les prismes : chacun deux faces (la gauche éclairée, la droite dans l'ombre), une pointe claire
    for bx, haut, larg, pente in AMAS[k]:
        for t in range(int(haut * 4)):
            h = t / 4
            yc = sol - h
            xc = bx + pente * h
            w = larg * (1 if h < haut - larg else max(0.0, (haut - h) / larg))
            for x in range(int(math.floor(xc - w)), int(math.ceil(xc + w)) + 1):
                if not (0 <= x < W and 0 <= int(yc) < H):
                    continue
                f = (x + 0.5 - xc) / max(0.6, w)
                i = 3 if f < -0.35 else 2 if f < 0.2 else 1
                if h > haut - larg - 0.5:
                    i = min(4, i + 1)               # la pointe, plus claire
                if h < 1.2:
                    i = max(0, i - 1)               # le pied, dans l'ombre du socle
                P[x, int(yc)] = pal[i] + (255,)
        tx, ty = int(bx + pente * (haut - 1.6)), int(sol - haut + 1.6)
        if 0 <= tx < W and 0 <= ty < H:
            P[tx, ty] = pal[4] + (255,)          # un éclat sur la pointe
    return contour(im, 0.3), W // 2, sol + 1


# le grand amas d'améthyste du récit (lieux.recit, sorte « geode » : la cachette de Maurice enfant, où dort la pierre
# de lune ; docs/gisements.md, lot 3) : de hauts prismes sur un socle de granit, trois cases de large
GEODE = [(22, 30, 4.2, 0.0), (14, 22, 3.4, -0.35), (30, 24, 3.6, 0.35), (19, 15, 2.6, -0.15), (27, 16, 2.4, 0.25),
         (9, 12, 2.4, -0.55), (35, 13, 2.4, 0.6), (24, 10, 2.0, 0.1)]


def geode():
    """L'amas d'améthyste : 44 × 44 px, le pied au bas du milieu."""
    from roches import GRANIT as G, pierre
    W, H = 44, 44
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    socle = pierre(W, 14, [(12, 8, 10, 5, 6), (24, 7, 13, 6, 8), (35, 8, 8, 5, 5)], G, 901, mouchete=0.06, pans=5)
    P = im.load()
    sol = H - 6
    for bx, haut, larg, pente in sorted(GEODE, key=lambda g: -g[1]):
        for t in range(int(haut * 4)):
            h = t / 4
            yc = sol - h
            xc = bx + pente * h
            w = larg * (1 if h < haut - larg * 1.2 else max(0.0, (haut - h) / (larg * 1.2)))
            for x in range(int(math.floor(xc - w)), int(math.ceil(xc + w)) + 1):
                if not (0 <= x < W and 0 <= int(yc) < H):
                    continue
                f = (x + 0.5 - xc) / max(0.6, w)
                i = 3 if f < -0.4 else 2 if f < 0.15 else 1
                if h > haut - larg * 1.2 - 0.5:
                    i = min(4, i + 1)
                if h < 2:
                    i = max(0, i - 1)
                P[x, int(yc)] = AMETHYSTE[i] + (255,)
        # l'arête claire de la face gauche, un éclat à la pointe
        for t in range(int((haut - larg) * 2)):
            h = t / 2 + 1
            x, y = int(bx + pente * h - larg * 0.3), int(sol - h)
            if 0 <= x < W and 0 <= y < H and P[x, y][3] and hasard(901, bx, t) < 0.6:
                P[x, y] = AMETHYSTE[3] + (255,)
        tx, ty = int(bx + pente * (haut - 1.5)), int(sol - haut + 1.5)
        if 0 <= tx < W and 0 <= ty < H:
            P[tx, ty] = AMETHYSTE[4] + (255,)
    im = contour(im, 0.3)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(socle, (0, H - 14))
    out.alpha_composite(im)
    return out, W // 2, H - 2
