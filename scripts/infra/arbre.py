# L'arbre de l'infra-monde qui se balance (assets/infra_arbre.png), dérivé du modèle
# scripts/infra/originaux/arbre.png (32 × 64 : un tronc tordu, des volutes aux éclats violets,
# son pied dans une flaque d'ombre).
#
# IMAGES images de 32 × 64 côte à côte, une boucle : chaque rangée de pixels se décale d'un
# côté puis de l'autre, d'autant plus qu'elle est haute (le pied, au sol, ne bouge pas), avec un
# retard qui grandit vers la cime : le haut suit le tronc comme une branche souple. Les éclats
# violets des volutes palpitent doucement.
#
#   python3 scripts/infra/arbre.py            écrit l'image
#   python3 scripts/infra/arbre.py --apercu   écrit aussi apercu_infra_arbre.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, apercu, melange, modele  # noqa: E402

IMAGES = 8
AMPLITUDE = 1.6     # px, le décalage de la cime
RETARD = 0.9        # radians, le retard de la cime sur le bas du tronc
PIED = 54           # la rangée où le tronc sort de la flaque : en dessous, rien ne bouge
ECLAT = (165, 117, 204)


def image(m, k):
    w, h = m.size
    out = Image.new('RGBA', (w, h))
    a = 2 * math.pi * k / IMAGES
    p = (math.sin(a) + 1) / 2
    for y in range(h):
        hauteur = max(0.0, (PIED - y) / PIED)
        dx = round(AMPLITUDE * hauteur ** 1.4 * math.sin(a - RETARD * hauteur))
        for x in range(w):
            c = m.getpixel((x, y))
            if not c[3] or not 0 <= x + dx < w:
                continue
            if c[:3] == ECLAT:
                c = melange(ECLAT, (214, 172, 246), p) + (255,)
            out.putpixel((x + dx, y), c)
    return out


def main():
    m = modele('arbre')
    w, h = m.size
    sheet = Image.new('RGBA', (w * IMAGES, h))
    for k in range(IMAGES):
        sheet.paste(image(m, k), (k * w, 0))
    sheet.save(os.path.join(ASSETS, 'infra_arbre.png'), optimize=True)
    print(f'assets/infra_arbre.png : {IMAGES} images de {w} × {h} px')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_infra_arbre.png', 4, (134, 167, 106))


if __name__ == '__main__':
    main()
