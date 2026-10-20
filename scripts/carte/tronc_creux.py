# Le tronc creux au bord de l'étang (le passage vers l'infra-monde) : une bûche couchée de deux
# tuiles, dessinée pour le jeu (elle ne vient plus du pack).
#
#   python3 scripts/carte/tronc_creux.py            écrit assets/tronc_creux.png (32 × 16)
#   python3 scripts/carte/tronc_creux.py --apercu   écrit aussi apercu_tronc_creux.png
#
# Puis scripts/carte/planche_v2.py (le bloc « tronc_creux » de la planche de la carte) ;
# js/engine/planche.js (TRONC_CREUX) et js/carte/ferme/config.js (HOLLOW.gids) en lisent les
# tuiles. Le dessin : un cylindre d'écorce éclairé en haut à gauche (le dessus clair, le dessous
# dans l'ombre), des fibres, de la mousse sur le dos ; à gauche, sa coupe (un anneau de bois
# clair) autour du creux sombre où luisent les couleurs de l'infra-monde ; à droite, le bout
# arrondi ; des touffes d'herbe au pied et l'ombre sur le sol. Contour sombre d'un pixel.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, hasard  # noqa: E402
W, H = 32, 16

ECORCE = [(44, 28, 18), (66, 42, 26), (90, 60, 36), (116, 80, 48), (142, 102, 62), (168, 126, 80)]
BOIS = [(132, 96, 58), (176, 136, 88), (206, 170, 118)]          # la coupe : cerne, aubier, cœur
CREUX = (18, 12, 22)
LUEURS = [(31, 140, 138), (79, 240, 210), (138, 98, 176), (200, 160, 232)]   # le bois de l'infra-monde
MOUSSE = [(46, 92, 40), (74, 128, 52), (112, 164, 70)]
HERBE = [(36, 84, 30), (62, 120, 44), (98, 156, 60)]
CONTOUR = (34, 22, 14)
OMBRE = (14, 30, 12, 96)
HAUT, BAS = 3, 13                   # le dessus et le dessous de la bûche
X0, X1 = 5, 29                      # le centre de la coupe (gauche), le bout (droite)


def dans_buche(x, y):
    cy, ry = (HAUT + BAS) / 2, (BAS - HAUT) / 2
    if abs(y + 0.5 - cy) > ry:
        return False
    if x + 0.5 < X0:
        return ((x + 0.5 - X0) / 3.6) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
    if x + 0.5 > X1:
        return ((x + 0.5 - X1) / 2.4) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
    return True


def dessin():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    cy, ry = (HAUT + BAS) / 2, (BAS - HAUT) / 2
    # l'ombre sur le sol, sous la bûche et un peu à droite
    for y in range(BAS - 1, H):
        for x in range(3, W):
            if dans_buche(x - 2, y - 3):
                px[x, y] = OMBRE
    for y in range(H):
        for x in range(W):
            if not dans_buche(x, y):
                continue
            t = (y + 0.5 - HAUT) / (BAS - HAUT)            # 0 le dessus, 1 le dessous
            # la coupe, à gauche : un anneau de bois autour du creux
            dx, dy = (x + 0.5 - X0) / 3.6, (y + 0.5 - cy) / ry
            d = (dx * dx + dy * dy) ** 0.5
            if d <= 1:
                if d < 0.66:
                    c = CREUX
                    # les lueurs, plus nombreuses au fond du creux
                    if hasard(x, y, 3) < 0.55 - 0.5 * d:
                        c = LUEURS[int(hasard(x, y, 4) * len(LUEURS))]
                elif d < 0.8:
                    c = BOIS[2] if dy < 0 else BOIS[1]
                else:
                    c = BOIS[1] if dy < 0.2 else BOIS[0]
                px[x, y] = c + (255,)
                continue
            # l'écorce : le cylindre éclairé d'en haut, des fibres le long de la bûche
            v = 4.6 - 5.2 * abs(t - 0.28) - (1.2 if t > 0.75 else 0)
            v += (hasard(x // 3, y, 9) - 0.5) * 1.4
            if hasard(x // 4, y, 2) < 0.18:
                v -= 1.2                                     # une fente dans l'écorce
            c = ECORCE[max(0, min(len(ECORCE) - 1, round(v)))]
            # la mousse, sur le dos
            if t < 0.3 and hasard(x // 2, y, 5) < 0.45 and X0 + 3 < x < X1 - 1:
                c = MOUSSE[2 if t < 0.12 else 1] if hasard(x, y, 6) < 0.8 else MOUSSE[0]
            px[x, y] = c + (255,)
    # le contour, sur ce qui n'est ni bûche ni ombre
    buche = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pb = buche.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 255:
                pb[x, y] = px[x, y]
    bord = contour(buche, CONTOUR)
    bp = bord.load()
    for y in range(H):
        for x in range(W):
            if bp[x, y][3] == 255 and px[x, y][3] < 255:
                px[x, y] = bp[x, y]
    # des touffes d'herbe au pied, devant la bûche
    for x0 in (9, 15, 22, 27):
        for k, (dx, h) in enumerate(((0, 2), (1, 3), (2, 2))):
            for dy in range(h):
                y, x = H - 1 - dy, x0 + dx
                px[x, y] = HERBE[min(2, dy + (k == 1))] + (255,)
    return im


def main():
    im = dessin()
    im.save(os.path.join(ASSETS, 'tronc_creux.png'))
    print(f'assets/tronc_creux.png : {im.width} × {im.height}')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', im.size, (96, 140, 70, 255))
        fond.alpha_composite(im)
        apercu(fond, 'apercu_tronc_creux.png', 10)


if __name__ == '__main__':
    main()
