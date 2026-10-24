# L'ombre portée d'un arbre seul (assets/ombre_arbre.png, 44 × 12), posée sous les arbres du
# Verger et des voisins (js/carte/nature.js NATURE.ombre) : un ovale
# vert très sombre et transparent, plein au milieu, plus léger vers le bord, le bord tramé
# (matrice de Bayer 4 × 4).
#
#   python3 scripts/carte/ombre_arbre.py            écrit assets/ombre_arbre.png
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER  # noqa: E402

OMBRE = (8, 40, 30)                         # teinte de l'ombre portée
OMBRE_A = 92                                # son opacité (sur 255) ; le bord tramé en vaut le tiers
# l'ovale : son centre (px ; la trame de Bayer en dépend) et ses rayons
OVALE = (40.92, 71, 22.29, 6)


def ovale(cx, cy, rx, ry):
    """{ (x, y): opacité } de l'ovale."""
    out = {}
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1:
                continue
            if d < 0.55:
                a = OMBRE_A
            elif d < 0.8:
                a = OMBRE_A * 2 // 3
            elif BAYER[y % 4][x % 4] < 8:
                continue                                         # bord tramé
            else:
                a = OMBRE_A // 3
            out[(x, y)] = max(out.get((x, y), 0), a)
    return out


def image(cx, cy, rx, ry):
    alpha = ovale(cx, cy, rx, ry)
    x0, y0 = min(x for x, _ in alpha), min(y for _, y in alpha)
    out = Image.new('RGBA', (max(x for x, _ in alpha) - x0 + 1, max(y for _, y in alpha) - y0 + 1), (0, 0, 0, 0))
    for (x, y), a in alpha.items():
        out.putpixel((x - x0, y - y0), OMBRE + (a,))
    return out


def main():
    image(*OVALE).save(os.path.join(ASSETS, 'ombre_arbre.png'))
    print('assets/ombre_arbre.png écrit')


if __name__ == '__main__':
    main()
