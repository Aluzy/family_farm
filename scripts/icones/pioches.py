#!/usr/bin/env python3
"""Les icônes des niveaux de la pioche (data/crops.json PIOCHE.NIVEAUX : pierre, cuivre, fer, or) : l'icône de la pioche
(hammer_and_pick.png, 32 × 32), sa tête de la couleur du métal ; dans assets/icones/, icones.json reçoit leur emoji.
Puis : python3 scripts/icones/build.py.

Usage (depuis la racine du dépôt) : python3 scripts/icones/pioches.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from pixel import ASSETS  # noqa: E402

ICONES = os.path.join(ASSETS, 'icones')
TETE = [(108, 116, 126), (154, 163, 173), (214, 220, 226)]       # la tête de la pioche (sombre → clair)
NIVEAUX = {
    '⚒‍🪨': ('pioche_pierre', [(104, 98, 88), (146, 138, 124), (196, 188, 172)]),
    '⚒‍🟠': ('pioche_cuivre', [(150, 72, 32), (206, 116, 58), (246, 178, 120)]),
    '⚒‍⚙': ('pioche_fer', [(96, 104, 116), (150, 160, 172), (214, 220, 226)]),
    '⚒‍🟡': ('pioche_or', [(170, 120, 20), (226, 182, 46), (255, 236, 140)]),
}


def main():
    base = Image.open(os.path.join(ICONES, 'hammer_and_pick.png')).convert('RGBA')
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    for emoji, (fichier, rampe) in NIVEAUX.items():
        im = base.copy()
        px = im.load()
        t = dict(zip(TETE, rampe))
        for y in range(im.height):
            for x in range(im.width):
                if px[x, y][3] and px[x, y][:3] in t:
                    px[x, y] = t[px[x, y][:3]] + (255,)
        im.save(os.path.join(ICONES, fichier + '.png'))
        table[emoji] = fichier + '.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print(f'{len(NIVEAUX)} icônes de pioche ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
