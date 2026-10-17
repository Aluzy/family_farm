# L'asperseur rotatif de l'arrosage automatique (assets/asperseur.png) : une tige verte plantée
# en terre, une tête en laiton et le bras du jet. 8 images de 9 × 13 px, une par direction du
# bras (0 : vers la droite, puis tous les 45° dans le sens des aiguilles d'une montre, vue de
# dessus à 45° comme la carte). Le pied de la tige est en bas au milieu (x = 4, y = 12). Les
# gouttes sont dessinées par la carte (js/farm-stage.js, SPRINKLER).
#
#   python3 scripts/batiments/asperseur.py            écrit l'image
#   python3 scripts/batiments/asperseur.py --apercu   écrit aussi apercu_asperseur.png (agrandi)
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, points, rangee  # noqa: E402

W, H, N = 9, 13, 8
K = (34, 24, 16)
TIGE = [(92, 140, 76), (58, 98, 52), (36, 64, 34)]
LAITON = [(236, 196, 96), (196, 148, 52), (128, 90, 30)]
METAL = [(196, 204, 210), (130, 140, 150)]


def image(k):
    px = {}
    put = lambda x, y, c: px.__setitem__((x, y), c)
    for y in range(6, 13):                       # la tige, éclairée à gauche
        put(3, y, TIGE[1])
        put(4, y, TIGE[2])
    put(3, 6, TIGE[0])
    for x in range(2, 6):                        # la tête en laiton (dessus, face)
        put(x, 4, LAITON[0] if x < 4 else LAITON[1])
        put(x, 5, LAITON[1] if x < 4 else LAITON[2])
    a = k * math.pi / 4                          # le bras du jet, depuis le dessus de la tête
    cx, cy = 3.5, 3
    for r, c in ((1.6, METAL[1]), (2.8, METAL[0])):
        put(round(cx + math.cos(a) * r), round(cy + math.sin(a) * r * 0.7), c)
    put(round(cx), 3, LAITON[2])                 # l'axe
    return contour(points(px, W, H), K)                # contour sombre autour du dessin


def main():
    sheet = rangee([image(k) for k in range(N)], W, H)
    sheet.save(os.path.join(ASSETS, 'asperseur.png'), optimize=True)
    print(f'assets/asperseur.png : {N} images de {W} × {H} px')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_asperseur.png', 8, (150, 112, 74))


if __name__ == '__main__':
    main()
