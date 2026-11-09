#!/usr/bin/env python3
"""Les icônes des colorants, des fleurs sauvages et du mortier (data/items.json : colorant_*, fleur_*, mortier),
dessinées ici en 16 × 16, dans assets/icones/ ; icones.json reçoit leur emoji. Puis :
python3 scripts/icones/build.py (la planche des icônes).

  - les colorants : un petit pot de terre plein de poudre en dôme, de la couleur du colorant (COULEURS ; les mêmes
    poudres que le mortier, scripts/carte/blocs.py POUDRES) ;
  - les fleurs coupées : leur tige, une feuille, la fleur en grand (le coquelicot et son cœur noir, le pavot de
    Californie, le myosotis et ses petites fleurs bleues, la lavande en épis, le lupin en grappe ; le tournesol a
    déjà son icône, sunflower.png) ;
  - le mortier : le mortier de pierre, sa poudre rouge, le pilon (celui du bloc, scripts/carte/blocs.py).

Usage (depuis la racine du dépôt) : python3 scripts/icones/colorants.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))                 # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))        # scripts/carte/blocs.py
from pixel import ASSETS, contour  # noqa: E402
import blocs as B  # noqa: E402

ICONES = os.path.join(ASSETS, 'icones')
OUT = (36, 30, 20)
COULEURS = B.POUDRES
TERRE = [(110, 62, 34), (156, 92, 50), (196, 128, 74), (226, 170, 112)]
TIGE = [(30, 80, 30), (56, 128, 48), (96, 170, 70)]
GLAUQUE = [(60, 92, 80), (100, 136, 118), (150, 180, 160)]

# l'emoji de chaque icône (icones.json) et son fichier
EMOJIS = {
    '🔴': ('colorant_rouge', 'rouge'), '🟠': ('colorant_orange', 'orange'), '🟡': ('colorant_jaune', 'jaune'),
    '🟢': ('colorant_vert', 'vert'), '🔵': ('colorant_bleu', 'bleu'), '🟣': ('colorant_violet', 'violet'),
    '🌺': ('fleur_coquelicot', 'coquelicot'), '🏵': ('fleur_pavot', 'pavot'), '💠': ('fleur_myosotis', 'myosotis'),
    '🪻': ('fleur_lavande', 'lavande'), '💮': ('fleur_lupin', 'lupin'), '⚱': ('mortier', 'mortier'),
}


class Ico:
    def __init__(self):
        self.im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        self.px = self.im.load()

    def p(self, x, y, c):
        if 0 <= x < 16 and 0 <= y < 16:
            self.px[x, y] = tuple(c[:3]) + (255,)

    def fini(self):
        return contour(self.im, OUT)


def pot(c):
    """Un petit pot de terre, plein de poudre colorée en dôme."""
    t = Ico()
    for y in range(8, 15):
        for x in range(3, 13):
            if y == 14 and x in (3, 12):
                continue
            t.p(x, y, TERRE[3 if x == 4 else 0 if x == 12 else 1 if x > 9 else 2])
    for x in range(2, 14):
        t.p(x, 8, TERRE[3])
        t.p(x, 9, TERRE[1])
    for y, x0, x1 in ((7, 3, 12), (6, 4, 11), (5, 5, 10), (4, 6, 9)):
        for x in range(x0, x1 + 1):
            t.p(x, y, c[3] if x < x0 + 2 and y < 6 else c[2] if x < (x0 + x1) / 2 else c[1])
    return t.fini()


def fleur(nom):
    """Une fleur coupée : sa tige, une feuille, la fleur en grand."""
    t = Ico()
    if nom == 'myosotis':
        for y in range(7, 15):
            t.p(7, y, TIGE[1])
        for x, y in ((8, 12), (9, 11), (6, 10)):
            t.p(x, y, TIGE[2])
        c = COULEURS['bleu']
        for cx, cy in ((5, 4), (10, 3), (8, 7), (4, 8), (11, 7)):
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                t.p(cx + dx, cy + dy, c[3] if dy < 0 else c[2])
            t.p(cx, cy, (250, 226, 80))
    elif nom == 'lavande':
        c = COULEURS['violet']
        for k, x in enumerate((5, 8, 11)):
            top = 2 + (k % 2)
            for y in range(top + 6, 15):
                t.p(x - (1 if y > 12 and k == 0 else 0) + (1 if y > 12 and k == 2 else 0), y, (110, 132, 108))
            for d in range(6):
                t.p(x, top + d, c[2] if d % 2 else c[3] if d == 0 else c[1])
                if d in (1, 3):
                    t.p(x + 1, top + d + 1, c[0])
    elif nom == 'lupin':
        c = COULEURS['violet']
        for d in range(9):
            larg = 1 + d // 3
            for dx in range(-(larg // 2), larg - larg // 2):
                t.p(8 + dx, 1 + d, c[3] if d < 2 else c[2] if d < 5 else c[1])
        for y in range(10, 15):
            t.p(8, y, TIGE[1])
        for x, y in ((5, 12), (6, 12), (10, 12), (11, 12), (6, 11), (10, 11)):
            t.p(x, y, TIGE[2])
    else:
        # le coquelicot (rouge, son cœur noir) et le pavot de Californie (orange, sa tige glauque)
        c = COULEURS['rouge' if nom == 'coquelicot' else 'orange']
        tige = TIGE if nom == 'coquelicot' else GLAUQUE
        for k, y in enumerate(range(8, 15)):
            t.p(8 - (1 if k > 4 else 0), y, tige[1])
        t.p(9, 11, tige[2])
        t.p(10, 10, tige[2])
        for dx in range(-3, 4):
            for dy in range(-2, 3):
                if dx * dx / 10 + dy * dy / 5 <= 1:
                    t.p(8 + dx, 5 + dy, c[2] if dy < 0 else c[1])
        t.p(8, 3, c[3])
        t.p(6, 4, c[3])
        if nom == 'coquelicot':
            t.p(8, 6, (30, 16, 16))
            t.p(7, 6, (30, 16, 16))
        else:
            t.p(8, 6, c[0])
            t.p(8, 7, (246, 196, 60))
    return t.fini()


def mortier():
    """Le mortier de pierre et son pilon (celui du bloc), sa poudre rouge."""
    t = B.Toile()
    B.bol_mortier(t, 8, 13, 5.5, 3.2, 3, COULEURS['rouge'])
    return contour(t.im.crop((0, 6, 16, 22)), OUT)


def main():
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    for emoji, (fichier, quoi) in EMOJIS.items():
        im = pot(COULEURS[quoi]) if fichier.startswith('colorant_') else mortier() if quoi == 'mortier' else fleur(quoi)
        im.save(os.path.join(ICONES, fichier + '.png'))
        table[emoji] = fichier + '.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print(f'{len(EMOJIS)} icônes écrites dans assets/icones/ ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
