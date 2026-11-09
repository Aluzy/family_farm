#!/usr/bin/env python3
"""Aligne les dessins des cultures dans assets/crops.png : chaque dessin (une phase d'une culture, data/crops.json
sprite : la rangée du bas r, la hauteur h, les colonnes c) est descendu au bas de sa case, et sa tige (le milieu de
ses trois rangées du bas) est mise au milieu de la case, au plus près sans rogner un pixel (une case fait 16 px de
large). La carte pose le bas de chaque case à CULTURE_MONTE px du bas de la case de terre (js/carte/ferme/config.js) :
toutes les cultures ont ainsi le pied à la même place, au milieu de leur case.

Les scripts qui écrivent la planche (scripts/carte/cultures.py, courgette.py) l'appellent avant d'enregistrer ; on
peut aussi le lancer seul (il ne change rien à une planche déjà alignée) :

    python3 scripts/carte/aligner_cultures.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from pixel import ASSETS, ROOT  # noqa: E402

SHEET = os.path.join(ASSETS, 'crops.png')
T = 16


def sprites():
    with open(os.path.join(ROOT, 'data', 'crops.json'), encoding='utf8') as f:
        C = json.load(f)['CULTURES']
    return {k: v['sprite'] for k, v in C.items() if isinstance(v, dict) and v.get('sprite')}


def decalage(case):
    """(dx, dy) qui pose le pied du dessin au bas de la case, sa tige au milieu (sans rogner), ou None (vide)."""
    px = case.load()
    pts = [(x, y) for y in range(case.height) for x in range(case.width) if px[x, y][3]]
    if not pts:
        return None
    bas = max(p[1] for p in pts)
    pied = [p[0] for p in pts if p[1] >= bas - 2]
    cx = (min(pied) + max(pied) + 1) / 2
    dx = round(case.width / 2 - cx)
    dx = max(-min(p[0] for p in pts), min(case.width - 1 - max(p[0] for p in pts), dx))
    return dx, case.height - 1 - bas


def aligner(sheet):
    """Aligne la planche `sheet` (une image RGBA) en place. Renvoie le nombre de dessins déplacés."""
    n = 0
    for sp in sprites().values():
        for col in sp['c']:
            box = (col * T, (sp['r'] + 1) * T - sp['h'], col * T + T, (sp['r'] + 1) * T)
            case = sheet.crop(box)
            d = decalage(case)
            if not d or d == (0, 0):
                continue
            neuve = Image.new('RGBA', case.size, (0, 0, 0, 0))
            neuve.paste(case, d)
            sheet.paste(neuve, box)
            n += 1
    return n


def main():
    sheet = Image.open(SHEET).convert('RGBA')
    n = aligner(sheet)
    sheet.save(SHEET, optimize=True)
    print(f'assets/crops.png : {n} dessin(s) réaligné(s)')


if __name__ == '__main__':
    main()
