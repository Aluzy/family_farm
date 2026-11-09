#!/usr/bin/env python3
"""Les icônes du compost (docs/compost.md), en 16 × 16, dans assets/icones/ ; icones.json reçoit leur emoji.
Puis : python3 scripts/icones/build.py.

- le bac à compost (🪵‍🍂) : le bloc plein (scripts/carte/compost.py), sans le haut de son couvercle ;
- l'engrais (🟫‍✨), maquette E4 : un petit tas brun foncé, presque une pyramide, grumeleux, éclairé en haut à
  gauche (une rampe de seize tons, du prune au brun chaud), et quatre éclats violets autour (le violet des cases
  où l'on glisse l'engrais, et son scintillement sur la carte).

Usage (depuis la racine du dépôt) : python3 scripts/icones/engrais.py
"""
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS  # noqa: E402
from compost import compost, rampe, ton, hasard  # noqa: E402

ICONES = os.path.join(ASSETS, 'icones')

# du prune presque noir au brun chaud : le terreau
TERREAU = [(20, 10, 14), (38, 20, 20), (60, 34, 26), (84, 50, 32), (108, 68, 40), (134, 90, 54), (160, 114, 72), (186, 142, 98)]
# les éclats : du violet profond au lilas presque blanc
VIOLETS = [(96, 52, 160), (150, 98, 222), (196, 156, 250), (240, 226, 255)]


def icone_bac():
    """Le bloc plein à sa vraie taille, sans le haut de son couvercle : ses 16 rangées du bas."""
    bloc = compost(2)
    return bloc.crop((0, bloc.height - 17, 16, bloc.height - 1))


def eclat(P, x, y, grand):
    """Un éclat : une petite étoile à quatre branches (le cœur clair, les branches violettes)."""
    P[x, y] = VIOLETS[3] + (255,)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        P[x + dx, y + dy] = VIOLETS[2 if grand else 1] + (255,)
        if grand:
            P[x + 2 * dx, y + 2 * dy] = VIOLETS[0] + (255,)


def engrais():
    terre = rampe(TERREAU, 16)
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    P = im.load()
    cx, sommet, base = 7.6, 3.2, 13.6
    for y in range(16):
        for x in range(16):
            X, Y = x + 0.5, y + 0.5
            if Y < sommet:
                continue
            # les flancs : une pyramide un peu bombée, la base aplatie en ellipse
            demi = (Y - sommet) * 0.62 + 0.5 + 0.35 * math.sin((Y - sommet) / (base - sommet) * math.pi)
            dx = X - cx
            if abs(dx) > demi:
                continue
            if Y > base and (dx / 6.4) ** 2 + ((Y - base) / 1.4) ** 2 > 1:
                continue
            f = dx / max(1.0, demi)                       # -1 le flanc gauche, +1 le droit
            hauteur = (Y - sommet) / (base - sommet)       # 0 au sommet, 1 au pied
            v = 0.66 - 0.40 * f - 0.20 * hauteur
            if f < -0.1:
                v += 0.06                                  # le flanc gauche, dans la lumière
            if abs(f + 0.05) < 0.12 and hauteur < 0.85:
                v += 0.05                                  # l'arête, au milieu
            v += (hasard(x, y, 7) - 0.5) * 0.16            # le grain
            if hasard(x * 5, y * 3, 2) > 0.82:
                v += 0.18                                  # des grumeaux clairs
            elif hasard(x * 7, y * 11, 4) > 0.86:
                v -= 0.16                                  # et des creux
            if Y > base - 0.6:
                v -= 0.14                                  # l'ombre au pied
            P[x, y] = ton(terre, v) + (255,)
    # le contour : sombre, teinté du ton voisin
    contour = []
    for y in range(16):
        for x in range(16):
            if P[x, y][3]:
                continue
            vois = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < 16 and 0 <= y + b < 16 and P[x + a, y + b][3]]
            if vois:
                r, g, b, _ = P[vois[0]]
                q = 0.45 if (x < 8 and y < 9) else 0.3
                contour.append((x, y, (int(r * q + 10), int(g * q + 4), int(b * q + 12), 255)))
    for x, y, c in contour:
        P[x, y] = c
    # les éclats violets
    eclat(P, 2, 3, True)
    eclat(P, 13, 5, False)
    P[12, 1] = VIOLETS[1] + (255,)
    P[2, 8] = VIOLETS[2] + (255,)
    return im


def main():
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    for emoji, fichier, im in (('🪵‍🍂', 'bac_compost', icone_bac()), ('🟫‍✨', 'engrais', engrais())):
        im.save(os.path.join(ICONES, fichier + '.png'))
        table[emoji] = fichier + '.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print('2 icônes : le bac à compost, l\'engrais ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
