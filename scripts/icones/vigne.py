#!/usr/bin/env python3
"""Les icônes de la vigne (data/items.json : raisin 🍇, plant_vigne 🌱‍🍇), en 16 × 16, dans assets/icones/ ; icones.json
reçoit leur emoji. Le raisin : une grappe de grains noirs (les couleurs de la vigne, scripts/carte/vigne.py), sa rafle et
une feuille ; le plant : le sachet des graines de tournesol, sa fleur en violet (comme les graines de fleurs). Puis :
python3 scripts/icones/build.py.

Usage (depuis la racine du dépôt) : python3 scripts/icones/vigne.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from pixel import ASSETS, contour  # noqa: E402

ICONES = os.path.join(ASSETS, 'icones')
OUT = (14, 38, 18)
NOIR = [(40, 24, 58), (60, 40, 88), (89, 64, 122), (143, 116, 176)]
V = [(38, 104, 44), (62, 140, 56), (104, 178, 72), (150, 210, 98)]
BOIS = (124, 88, 54)


def raisin():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    p = lambda x, y, c: im.putpixel((x, y), tuple(c) + (255,))  # noqa: E731
    # la feuille et la rafle
    for x, y in ((9, 1), (10, 1), (11, 2), (10, 2), (9, 2), (12, 3), (11, 3)):
        p(x, y, V[2] if y < 3 else V[1])
    p(8, 2, BOIS); p(8, 3, BOIS)
    # les grains, en rangées de 4, 4, 3, 2, 1 (2 × 2 px chacun, un reflet)
    rangs = [(3, 4, 4), (3, 6, 4), (4, 8, 3), (5, 10, 2), (6, 12, 1)]
    for x0, y0, n in rangs:
        for i in range(n):
            gx = x0 + i * 2 + (1 if y0 % 4 == 2 else 0)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                p(gx + dx, y0 + dy, NOIR[1] if (dx + dy) else NOIR[2])
            p(gx, y0, NOIR[3] if i == 0 or y0 < 7 else NOIR[2])
    return contour(im, OUT)


def plant():
    im = Image.open(os.path.join(ICONES, 'seedling+sunflower.png')).convert('RGBA')
    table = {(251, 227, 138): NOIR[3], (242, 192, 64): NOIR[2], (199, 134, 42): NOIR[1]}
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            q = px[x, y]
            if q[3] and q[:3] in table:
                px[x, y] = tuple(table[q[:3]]) + (255,)
    return im


def main():
    raisin().save(os.path.join(ICONES, 'raisin.png'))
    plant().save(os.path.join(ICONES, 'plant_vigne.png'))
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    table['🍇'] = 'raisin.png'
    table['🌱‍🍇'] = 'plant_vigne.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print('assets/icones/raisin.png, plant_vigne.png ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
