# La terre labourée de la carte, dessinée pour le jeu (elle ne vient plus du pack) :
#   assets/terre_bords.png : la terre labourée et ses bordures, posées par-dessus l'herbe
#     (version 1.15, voir ZONE_TILES dans js/farm-stage.js) ;
#   assets/soil_dry.png : la terre sèche d'une parcelle (la tuile pleine), sous la plante.
# Puis scripts/carte/terre_arrosee.py (la terre mouillée, assets/soil_wet.png).
#
#   python3 scripts/carte/terre_bords.py            écrit les deux images
#   python3 scripts/carte/terre_bords.py --apercu   écrit aussi apercu_terre_bords.png
#
# La terre : des sillons horizontaux qui ondulent (un tous les 4 px : le dessus de la butte
# éclairé, son flanc, le creux dans l'ombre ; la lumière vient du haut à gauche), des mottes,
# des trous d'ombre et un petit caillou. La texture se répète tous les 16 px : deux tuiles
# voisines se raccordent.
# terre_bords.png : 16 cases de 16×16, une par masque de coins d'une tuile (bits : 8
# haut-gauche, 4 haut-droite, 2 bas-gauche, 1 bas-droite = coin de terre ; 15 : la tuile
# labourée). Un pixel est de la terre quand le mélange des quatre coins (bilinéaire, un peu
# bruité) dépasse la moitié : les bords sont arrondis et se raccordent d'une tuile à l'autre
# (le mélange ne dépend, sur un côté, que des deux coins de ce côté). Près du bord, la terre
# s'éboule (un ton plus sombre, des grains épars). Le reste de la case est transparent : la
# terre se pose sur l'herbe de la carte.
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, hasard  # noqa: E402
T = 16

# Les bruns de la terre, du creux le plus sombre au dessus de butte le plus clair.
TERRE = [(70, 44, 26), (92, 60, 36), (114, 78, 48), (136, 96, 60), (156, 114, 74), (176, 134, 90), (196, 156, 110)]
CAILLOU = [(96, 92, 86), (146, 140, 128), (190, 184, 170)]


def ton(x, y):
    """Le rang du brun d'un pixel de terre (texture de 16 × 16 qui se répète)."""
    x, y = x % T, y % T
    # les sillons ondulent : par endroits, la butte descend d'un pixel
    yy = y + (1 if math.sin((x + 2 * (y // 4)) * math.pi / 8) > 0.55 else 0)
    v = (3.2, 4.3, 3.3, 1.7)[yy % 4]       # le dessus de la butte, son flanc, le bas, le creux
    v += 0.3 * math.cos((x + 5 * (yy // 4)) * math.pi / 8)
    v += (hasard(x, y, 7) - 0.5) * 1.5      # le grain
    if hasard(x // 2, yy // 4, 3) < 0.14 and yy % 4 in (0, 1):
        v += 1.0                            # une motte claire sur la butte
    if hasard(x, yy // 4, 13) < 0.08 and yy % 4 == 2:
        v -= 1.4                            # un trou d'ombre dans le flanc
    return max(0, min(len(TERRE) - 1, round(v)))


def caillou(x, y):
    """Un petit caillou (clair, ombre), à une place fixe de la tuile."""
    for cx, cy in ((11, 5),):
        if (x, y) == (cx, cy):
            return CAILLOU[2]
        if (x, y) == (cx + 1, cy):
            return CAILLOU[1]
    return None


def tuile(masque=15):
    """La tuile de terre pour un masque de coins (15 : pleine)."""
    hg, hd, bg, bd = (masque >> 3) & 1, (masque >> 2) & 1, (masque >> 1) & 1, masque & 1
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    px = im.load()
    for y in range(T):
        for x in range(T):
            u, v = (x + 0.5) / T, (y + 0.5) / T
            m = hg * (1 - u) * (1 - v) + hd * u * (1 - v) + bg * (1 - u) * v + bd * u * v
            if 0 < m < 1:
                m += (hasard(x, y, masque, 11) - 0.5) * 0.18
            if m < 0.5:
                continue
            c = caillou(x, y) if m > 0.75 else None
            if c is None:
                k = ton(x, y)
                if m < 0.62:                 # le bord : la terre s'éboule, plus sombre, des grains
                    if hasard(x, y, 5) < 0.35:
                        continue
                    k = max(0, k - 2)
                c = TERRE[k]
            px[x, y] = c + (255,)
    return im


def main():
    bords = Image.new('RGBA', (16 * T, T), (0, 0, 0, 0))
    for m in range(1, 16):
        bords.alpha_composite(tuile(m), (m * T, 0))
    bords.save(os.path.join(ASSETS, 'terre_bords.png'))
    tuile(15).save(os.path.join(ASSETS, 'soil_dry.png'))
    print('assets/terre_bords.png et assets/soil_dry.png écrits')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', bords.size, (96, 140, 70, 255))
        fond.alpha_composite(bords)
        apercu(fond, 'apercu_terre_bords.png', 6)


if __name__ == '__main__':
    main()
