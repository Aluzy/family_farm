# L'entrée de la mine, sur la ferme générée : un tas de terre brune de 3 × 3 tuiles, vu de haut
# à 45° comme les rochers (scripts/carte/rochers.py), avec, au pied de son flanc avant, une porte
# sombre étayée de poutres. On y entre pour descendre à la mine (les niveaux de la grotte,
# js/ville-carte.js).
#
#   python3 scripts/carte/mine.py            écrit assets/mine.png (48 × 48)
#   python3 scripts/carte/mine.py --apercu   écrit aussi apercu_mine.png
#
# Puis scripts/carte/planche_v2.py (le bloc « mine » de la planche de la carte) ; js/engine/
# planche.js (MINE) et js/carte/ferme/config.js (MINE) en lisent les tuiles. Le dessin : le
# dessus bombé (des demi-ellipsoïdes qui se chevauchent, éclairés d'en haut à gauche, en pans
# d'un ton de terre chacun), quelques cailloux et touffes d'herbe dessus ; le flanc avant, une
# paroi à pic plus sombre, striée de couches ; la porte au milieu ; l'ombre portée sur l'herbe.
# Contour sombre d'un pixel.
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, hasard  # noqa: E402

W, H = 48, 48
TERRE = [(54, 34, 26), (76, 48, 34), (100, 64, 44), (126, 84, 58), (152, 108, 74), (178, 134, 94), (204, 164, 120)]
PAROI = [(46, 28, 24), (64, 38, 30), (84, 52, 38), (104, 66, 46)]
CAILLOU = [(92, 86, 76), (130, 122, 106), (176, 168, 150)]
HERBE = [(36, 84, 30), (62, 120, 44), (98, 156, 60)]
BOIS = [(58, 36, 20), (98, 64, 34), (140, 98, 54)]
NOIR = (18, 14, 20)
CONTOUR = (34, 20, 16)
OMBRE = (14, 30, 12, 96)
LUMIERE = (-0.55, -0.75, 0.75)
SOL = 45                        # la rangée du pied (le bas du flanc avant)
FLANC = 15                      # la hauteur du flanc avant au milieu (px)
# le dessus : (cx, cy, rx, ry, hauteur) ; le champ de hauteurs est leur maximum
BOSSES = [(24, 16, 22, 12, 12), (12, 19, 11, 9, 8), (36, 18, 11, 10, 9), (24, 9, 13, 6, 10)]
PORTE = (19, 29)                # ses montants (x du premier pixel de chacun)


def norme(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


L = norme(LUMIERE)


def hauteur(x, y):
    best = 0.0
    for cx, cy, rx, ry, hz in BOSSES:
        d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
        if d < 1:
            best = max(best, hz * math.sqrt(1 - d))
    return best


def dessus(x, y):
    return 0 <= x < W and 0 <= y < H and hauteur(x, y) > 0


def bas_du_dessus(x):
    """La dernière rangée du dessus dans la colonne x, ou None."""
    ys = [y for y in range(H) if dessus(x, y)]
    return max(ys) if ys else None


def dessin():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    # le flanc avant : sous le dessus, jusqu'au pied (plus bas au milieu qu'aux bords)
    flanc = {}
    for x in range(W):
        b = bas_du_dessus(x)
        if b is None:
            continue
        haut_flanc = round(FLANC * math.sqrt(max(0.0, 1 - ((x + 0.5 - 24) / 23.5) ** 4)))
        for y in range(b + 1, min(SOL, b + 1 + haut_flanc)):
            flanc[(x, y)] = (y - b - 1) / max(1, haut_flanc - 1)
    # l'ombre portée : la silhouette décalée vers le bas à droite, aplatie
    for y in range(H):
        for x in range(W):
            sx, sy = x - 3, y - 2
            if (dessus(sx, sy) or (sx, sy) in flanc) and y >= 30:
                px[x, y] = OMBRE
    # le dessus : éclairé selon la pente, un ton par pan
    for y in range(H):
        for x in range(W):
            if not dessus(x, y):
                continue
            gx = hauteur(x + 1, y) - hauteur(x - 1, y)
            gy = hauteur(x, y + 1) - hauteur(x, y - 1)
            n = norme((-gx / 2, -gy / 2, 1))
            e = sum(a * b for a, b in zip(n, L))
            v = 1.2 + e * 5.0 + (hasard(x // 2, y // 2, 1) - 0.5) * 1.1
            c = TERRE[max(1, min(len(TERRE) - 1, round(v)))]
            r = hasard(x, y, 7)
            if r < 0.04:
                c = TERRE[max(0, TERRE.index(c) - 2)]            # un creux, une motte
            px[x, y] = c + (255,)
    # le bord du dessus, au-dessus du flanc : une arête éclairée
    for x in range(W):
        b = bas_du_dessus(x)
        if b is not None and (x, b + 1) in flanc:
            px[x, b] = TERRE[5 if x < 30 else 4] + (255,)
    # le flanc : une paroi à pic, des couches de terre, plus sombre vers le pied
    for (x, y), t in flanc.items():
        k = 3 - round(t * 2.2) - (1 if hasard(x, (y + x // 5) // 3, 2) < 0.3 else 0)
        if x > 30:
            k -= 1                                               # le côté droit, dans l'ombre
        px[x, y] = PAROI[max(0, min(3, k))] + (255,)
        if hasard(x // 3, y, 5) < 0.12:
            px[x, y] = PAROI[0] + (255,)                         # une strie
    # des cailloux sur le dessus
    for cx, cy in ((10, 18), (31, 12), (38, 24), (19, 27), (28, 22)):
        for dx, dy, k in ((0, 0, 1), (1, 0, 2), (0, 1, 0), (1, 1, 1)):
            if dessus(cx + dx, cy + dy):
                px[cx + dx, cy + dy] = CAILLOU[k] + (255,)
    # des touffes d'herbe sur le dessus et au pied
    for cx, cy in ((15, 9), (36, 15), (8, 25), (40, 29), (22, 15)):
        for dx, dy, k in ((0, 0, 1), (1, -1, 2), (2, 0, 1), (1, 0, 0), (-1, 0, 0)):
            if dessus(cx + dx, cy + dy):
                px[cx + dx, cy + dy] = HERBE[k] + (255,)
    # la porte : l'ouverture sombre, ses montants et son linteau de bois
    g, d = PORTE
    b = max(bas_du_dessus(x) for x in range(g, d + 2))
    haut = b + 3
    for y in range(haut, SOL):
        for x in range(g + 2, d):
            arrondi = y == haut and x in (g + 2, d - 1)
            if not arrondi:
                px[x, y] = NOIR + (255,)
        for x in (g, g + 1, d, d + 1):
            px[x, y] = BOIS[1 if x in (g, d) else 2] + (255,)
    for x in range(g - 1, d + 3):
        px[x, haut - 1] = BOIS[2] + (255,)
        px[x, haut - 2] = BOIS[1] + (255,)
    for x in (g - 1, d + 2):
        px[x, haut - 1] = BOIS[1] + (255,)
    # le seuil : un peu de terre battue devant la porte
    for x in range(g + 1, d + 1):
        px[x, SOL] = TERRE[2] + (255,)
    # le contour, puis l'ombre des montants dans l'ouverture
    im = contour(im, CONTOUR, seuil=120)
    px = im.load()
    for y in range(haut, SOL):
        px[g + 2, y] = (34, 26, 30, 255)
    for x in range(g + 2, d):
        px[x, haut] = NOIR + (255,) if x not in (g + 2, d - 1) else px[x, haut]
    return im


def main():
    im = dessin()
    im.save(os.path.join(ASSETS, 'mine.png'))
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', (W + 16, H + 16), (70, 128, 52, 255))
        fond.alpha_composite(im, (8, 8))
        apercu(fond, 'apercu_mine.png', zoom=8)
    print('assets/mine.png')


if __name__ == '__main__':
    main()
