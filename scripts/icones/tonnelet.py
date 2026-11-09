#!/usr/bin/env python3
"""Les icônes du tonnelet d'affinage (le lot 6 des évolutions du crafting, docs/tonnelet.md), en 16 × 16, dans
assets/icones/ ; icones.json reçoit leur emoji. Puis : python3 scripts/icones/build.py.

- le tonnelet (🛢️‍🧀) : le bloc (scripts/carte/tonnelet.py) rendu deux fois plus grand, réduit à 16 px de haut ;
- la tomme d'alpage (🧀‍⚪) : le fromage (cheese_wedge.png) d'une pâte fraîche, crème, sans croûte dorée ;
- le moût de houblon (🍺‍🟤) : la chope (beer_mug.png), un liquide trouble et ambré, sans mousse.

Usage (depuis la racine du dépôt) : python3 scripts/icones/tonnelet.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS  # noqa: E402
from tonnelet import tonnelet  # noqa: E402

ICONES = os.path.join(ASSETS, 'icones')

TOMME = {(255, 242, 176): (255, 252, 238), (248, 216, 96): (246, 238, 214), (232, 176, 48): (226, 214, 182),
         (192, 138, 32): (184, 170, 136), (90, 58, 16): (92, 78, 56), (90, 58, 10): (92, 78, 56)}
MOUT = {(255, 255, 255): (214, 160, 84), (244, 234, 216): (196, 134, 62), (251, 227, 138): (196, 134, 62),
        (242, 192, 64): (170, 108, 44), (232, 176, 48): (150, 92, 36), (199, 134, 42): (120, 70, 28)}


def recolore(nom, table):
    im = Image.open(os.path.join(ICONES, nom)).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3] and c[:3] in table:
                px[x, y] = table[c[:3]] + (c[3],)
    return im


def icone_tonnelet():
    grand = tonnelet(2)
    grand = grand.crop(grand.getbbox())
    h = 16
    w = max(1, round(grand.width * h / grand.height))
    petit = grand.resize((w, h), Image.BOX)
    px = petit.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    im.alpha_composite(petit, ((16 - w) // 2, 0))
    return im


def main():
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    for emoji, fichier, im in (('🛢️‍🧀', 'tonnelet', icone_tonnelet()),
                               ('🧀‍⚪', 'tomme_alpage', recolore('cheese_wedge.png', TOMME)),
                               ('🍺‍🟤', 'mout_houblon', recolore('beer_mug.png', MOUT))):
        im.save(os.path.join(ICONES, fichier + '.png'))
        table[emoji] = fichier + '.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print('3 icônes : tonnelet, tomme d\'alpage, moût de houblon ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
