# La terre arrosée d'une parcelle (assets/soil_wet.png), à partir de la terre sèche
# (assets/soil_dry.png) : la même terre, avec une tache sombre et humide en ellipse autour du
# pied de la plante, au lieu de toute la tuile assombrie.
#
#   python3 scripts/carte/terre_arrosee.py
#
# Les plantes sont posées au milieu du bas de la tuile (js/farm-stage.js, syncCrop) : la tache
# est centrée un peu sous le milieu (CENTRE), de rayons RAYONS. Dedans, chaque couleur de la
# terre sèche prend sa teinte mouillée (HUMIDE) ; sur le bord, un anneau tramé (BAYER) mêle
# une teinte à mi-chemin et la terre sèche, pour un bord doux.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, mel  # noqa: E402
SEC = os.path.join(ASSETS, 'soil_dry.png')
SORTIE = os.path.join(ASSETS, 'soil_wet.png')

CENTRE = (8.0, 10.5)
RAYONS = (7.2, 5.0)
BORD = 0.22          # épaisseur relative de l'anneau du bord
# terre sèche -> terre mouillée : même teinte, luminosité ×0,66, saturation ×1,15 (un brun
# chaud, foncé)
HUMIDE = {
    (0xae, 0x8d, 0x62): (0x73, 0x5a, 0x39),
    (0xa2, 0x7f, 0x56): (0x6b, 0x50, 0x31),
    (0x96, 0x6f, 0x49): (0x63, 0x45, 0x29),
}


def main():
    sec = Image.open(SEC).convert('RGBA')
    out = sec.copy()
    for y in range(sec.height):
        for x in range(sec.width):
            r, g, b, a = sec.getpixel((x, y))
            c = (r, g, b)
            if c not in HUMIDE:
                continue
            dx = (x + 0.5 - CENTRE[0]) / RAYONS[0]
            dy = (y + 0.5 - CENTRE[1]) / RAYONS[1]
            d = (dx * dx + dy * dy) ** 0.5    # 1 : sur l'ellipse
            if d <= 1 - BORD:
                out.putpixel((x, y), HUMIDE[c] + (a,))
            elif d <= 1 + BORD:
                # bord : de plus en plus sec en s'éloignant, tramé
                t = (d - (1 - BORD)) / (2 * BORD)          # 0 dedans, 1 dehors
                if (BAYER[y % 4][x % 4] + 0.5) / 16 > t:
                    out.putpixel((x, y), mel(HUMIDE[c], c, 0.45) + (a,))
    out.save(SORTIE, optimize=True)
    print(f'{os.path.relpath(SORTIE, ROOT)} écrit')


if __name__ == '__main__':
    main()
