#!/usr/bin/env python3
"""L'icône du bassin (data/items.json : bassin, 🪷‍🧱), en 16 × 16, dans assets/icones/ ; icones.json reçoit son emoji.
Une case de bassin vue de haut : la margelle de pierre taillée (une dalle à chaque coin, les joints nets), l'eau de la
carte, un nénuphar et sa fleur (comme js/carte/ferme/bassins.js). Puis : python3 scripts/icones/build.py.

Usage (depuis la racine du dépôt) : python3 scripts/icones/bassin.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from pixel import ASSETS  # noqa: E402

P = [(72, 64, 52), (100, 92, 78), (125, 116, 99), (150, 140, 120), (173, 163, 143), (196, 186, 166)]
OUT = (36, 30, 20)
EAU = [(76, 172, 214), (60, 146, 200), (46, 120, 184), (34, 96, 170)]
VERT = [(30, 78, 40), (52, 104, 48), (88, 150, 64), (146, 196, 92)]


def icone():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    put = lambda x, y, c: px.__setitem__((x, y), tuple(c) + (255,))  # noqa: E731
    # le cadre : 1..14 en largeur, 1..12 en hauteur, la face au sud (13, 14), le contour
    for y in range(1, 13):
        for x in range(1, 15):
            k = min(x - 1, 14 - x, y - 1, 12 - y)
            if k < 3:
                coin = (x < 4 or x > 11) and (y < 4 or y > 9)
                c = P[5] if k == 0 and (x < 8 or y < 6) else P[2] if k == 2 or (k == 0) else P[4]
                if not coin and ((x + 1) % 5 == 0 and (y < 4 or y > 9) or (y % 5 == 0 and (x < 4 or x > 11))):
                    c = P[0]
                put(x, y, c)
            else:
                put(x, y, P[2] if y == 4 else EAU[min(3, k - 3)])
    for x in range(1, 15):
        put(x, 13, P[1])
        put(x, 14, OUT)
    for y in range(0, 14):
        put(0, y, OUT)
        put(15, y, OUT)
    for x in range(1, 15):
        put(x, 0, OUT)
    # le nénuphar et sa fleur
    for dx, dy in ((-2, 0), (-1, 0), (0, 0), (-1, -1), (0, -1), (1, -1), (-1, 1), (0, 1), (1, 1), (2, 1)):
        put(8 + dx, 8 + dy, VERT[2] if dy < 1 else VERT[1])
    put(7, 7, VERT[3])
    put(9, 7, (246, 170, 200)); put(10, 7, (250, 214, 228)); put(9, 6, (250, 230, 240))
    return im


def main():
    icones = os.path.join(ASSETS, 'icones')
    icone().save(os.path.join(icones, 'bassin.png'))
    chemin = os.path.join(icones, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    table['🪷‍🧱'] = 'bassin.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print('assets/icones/bassin.png ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
