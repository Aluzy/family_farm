#!/usr/bin/env python3
"""Les gisements de minerai (docs/gisements.md), maquette G4 : un tas de blocs de pierre, riche en veines et en
pépites de métal, façon mines d'Age of Empires ; vu de haut à 45° comme les rochers du monde (scripts/carte/roches.py :
la même pierre, taillée en pans plats, éclairée en haut à gauche, un contour sombre).

  gisements('fer')   [(image, px, py)…] : 3 variantes de 34 × 28 px, le pied au milieu de la case de gauche
                     (deux cases de large, comme le gros bloc) ; roches.py les range dans assets/roches.png
                     (sortes gisement_fer, gisement_cuivre, gisement_or, gisement_platine ; data/monde.json ROCHES).

La ferme pose les mêmes images sur quelques-uns de ses gros rochers (js/carte/ferme/pioche.js).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from pixel import hasard  # noqa: E402

# les métaux : de l'ombre à l'éclat (5 tons) ; la patine vert-de-gris du cuivre
METAUX = {
    'fer': [(58, 26, 20), (122, 46, 28), (176, 74, 40), (214, 112, 64), (240, 176, 140)],
    'cuivre': [(92, 44, 22), (152, 78, 34), (204, 116, 52), (236, 158, 88), (252, 214, 168)],
    'or': [(120, 78, 10), (186, 130, 18), (232, 182, 40), (252, 222, 92), (255, 248, 200)],
    'platine': [(80, 92, 110), (130, 146, 166), (180, 196, 214), (218, 230, 242), (252, 254, 255)],
}
PATINE = [(58, 128, 108), (92, 168, 140)]

# les tas : [(cx, cy, rx, ry, haut)] des blocs (comme roches.py, pierre) ; trois variantes
TAS = [
    [(11, 16, 8, 7, 11), (23, 15, 8, 6.5, 10), (17, 21, 7, 5, 7), (6, 22, 4, 3, 4), (28, 22, 4.5, 3, 4)],
    [(12, 15, 9, 7.5, 12), (24, 17, 7, 6, 9), (17, 22, 6, 4.5, 6), (29, 23, 3.5, 2.5, 3)],
    [(10, 17, 7, 6, 9), (20, 14, 9, 7.5, 13), (27, 20, 5.5, 4.5, 7), (14, 22, 6, 4, 5), (5, 23, 3, 2.5, 3)],
]


def lum(c):
    return (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255


def interieur(im):
    """Les pixels de pierre (pas le contour, pas les bords)."""
    P = im.load()
    W, H = im.size
    out = set()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if P[x, y][3] and all(P[x + a, y + b][3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))) and lum(P[x, y]) > 0.12:
                out.add((x, y))
    return out


def veines(im, metal, graine, n, long):
    """Des veines sinueuses de métal à travers les blocs ; leur ton suit la lumière de la pierre dessous."""
    P = im.load()
    dedans = interieur(im)
    pal, pts = METAUX[metal], sorted(dedans)
    for v in range(n):
        x, y = pts[int(hasard(graine, v, 1) * len(pts))]
        a = hasard(graine, v, 2) * math.pi * 2
        for k in range(long):
            if (x, y) not in dedans:
                break
            i = 1 + min(3, int(lum(P[x, y]) * 5))
            P[x, y] = pal[i] + (255,)
            if hasard(graine, v, k, 3) < 0.35 and (x, y + 1) in dedans:
                P[x, y + 1] = pal[max(0, i - 2)] + (255,)       # l'ombre sous la veine
            if hasard(graine, v, k, 4) < 0.12:
                P[x, y] = pal[4] + (255,)                        # un éclat
            a += (hasard(graine, v, k, 5) - 0.5) * 1.1
            x, y = round(x + math.cos(a)), round(y + math.sin(a) * 0.7)
        if metal == 'cuivre':
            for k in range(3):
                P[pts[int(hasard(graine, v, k, 9) * len(pts))]] = PATINE[k % 2] + (255,)


def pepites(im, metal, graine, n):
    """Des pépites serties : de petits amas de métal, un reflet clair, une ombre dessous."""
    P = im.load()
    dedans = interieur(im)
    pal, pts = METAUX[metal], sorted(dedans)
    for v in range(n):
        x, y = pts[int(hasard(graine, v, 11) * len(pts))]
        forme = [(0, 0), (1, 0), (0, 1), (1, 1)] if v % 2 else [(0, 0), (1, 0), (-1, 0), (0, 1)]
        for dx, dy in forme:
            if (x + dx, y + dy) in dedans:
                P[x + dx, y + dy] = pal[2 if dy else 3] + (255,)
        if (x, y + 2) in dedans:
            P[x, y + 2] = pal[0] + (255,)
        if (x, y) in dedans:
            P[x, y] = pal[4] + (255,)


def gisements(metal):
    from roches import GRANIT, pierre  # (roches.py importe ce module : pas en tête de fichier)
    from rochers import GRIS
    pal = GRANIT if metal in ('or', 'platine') else GRIS
    base = {'fer': 500, 'cuivre': 520, 'or': 540, 'platine': 560}[metal]
    out = []
    for k, forme in enumerate(TAS):
        im = pierre(34, 28, forme, pal, base + k, mouchete=0.06, pans=6)
        veines(im, metal, base + k, n=3, long=9)
        pepites(im, metal, base + k + 3, n=8)
        out.append((im, 9, 26))
    return out
