# La terre arrosée d'une parcelle (assets/soil_wet.png), à partir de la terre sèche
# (assets/soil_dry.png) : la même terre, avec une tache sombre et humide en ellipse autour du
# pied de la plante, au lieu de toute la tuile assombrie.
#
#   python3 scripts/carte/terre_arrosee.py
#
# Les plantes sont posées au milieu du bas de la tuile (js/carte/ferme/modele.js, syncCrop) :
# leur pied (la graine, la tige) est vers y = 13 à 15. La tache est centrée sous lui (CENTRE),
# de rayons RAYONS, aplatie comme un rond vu de haut à 45° (10/16). Dedans, chaque couleur de la
# terre sèche prend sa teinte mouillée (HUMIDE) ; sur le bord, un anneau tramé (BAYER) mêle
# une teinte à mi-chemin et la terre sèche, pour un bord doux.
import colorsys
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, mel  # noqa: E402
SEC = os.path.join(ASSETS, 'soil_dry.png')
SORTIE = os.path.join(ASSETS, 'soil_wet.png')

CENTRE = (8.0, 11.8)
RAYONS = (6.8, 4.1)
BORD = 0.22          # épaisseur relative de l'anneau du bord
# terre sèche -> terre mouillée : même teinte, luminosité ×0,5, saturation ×1,2 (un brun
# chaud, bien foncé) ; les cailloux (gris) restent secs.


def humide(c):
    h, l, sat = colorsys.rgb_to_hls(*(v / 255 for v in c))
    r, g, b = colorsys.hls_to_rgb(h, l * 0.5, min(1, sat * 1.2))
    return (round(r * 255), round(g * 255), round(b * 255))


def terre(c):
    """Un brun de la terre (pas le gris d'un caillou)."""
    return c[0] - c[2] > 20


def main():
    sec = Image.open(SEC).convert('RGBA')
    out = sec.copy()
    for y in range(sec.height):
        for x in range(sec.width):
            r, g, b, a = sec.getpixel((x, y))
            c = (r, g, b)
            if not a or not terre(c):
                continue
            dx = (x + 0.5 - CENTRE[0]) / RAYONS[0]
            dy = (y + 0.5 - CENTRE[1]) / RAYONS[1]
            d = (dx * dx + dy * dy) ** 0.5    # 1 : sur l'ellipse
            if d <= 1 - BORD:
                out.putpixel((x, y), humide(c) + (a,))
            elif d <= 1 + BORD:
                # bord : de plus en plus sec en s'éloignant, tramé
                t = (d - (1 - BORD)) / (2 * BORD)          # 0 dedans, 1 dehors
                if (BAYER[y % 4][x % 4] + 0.5) / 16 > t:
                    out.putpixel((x, y), mel(humide(c), c, 0.45) + (a,))
    out.save(SORTIE, optimize=True)
    print(f'{os.path.relpath(SORTIE, ROOT)} écrit')


if __name__ == '__main__':
    main()
