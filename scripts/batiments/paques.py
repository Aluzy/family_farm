# Les décors de Pâques de la boutique de gemmes (worker/src/boutique.mjs ARTICLES, `fete: 'paques'` : en vente des deux
# semaines avant Pâques au lundi de Pâques) : le panier d'œufs peints et l'œuf géant dans son nid de paille, posés
# dehors.
#
# Vus de haut à 45° (CLAUDE.md) : le panier d'osier montre son bord (le dessus de la vannerie), sa face tressée et,
# par son ouverture, son fond de paille et les œufs posés dedans ; chaque œuf a son motif (rayures, pois, zigzag) et
# son modelé (éclairé en haut à gauche, l'ombre froide en bas à droite) ; le nid montre ses brins.
#
#   python3 scripts/batiments/paques.py            écrit assets/meuble_panier_oeufs.png, meuble_oeuf_geant.png
#   python3 scripts/batiments/paques.py --apercu   écrit aussi apercu_paques.png (agrandi)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (34, 24, 20)
OSIER = [rampe([(60, 38, 18), (112, 76, 36), (160, 116, 60), (204, 160, 96), (232, 200, 140)], 120),
         rampe([(56, 36, 20), (104, 70, 38), (150, 108, 62), (196, 152, 98), (228, 194, 140)], 120)]
PAILLE = rampe([(110, 84, 30), (170, 136, 60), (214, 184, 100), (240, 220, 150)], 80)
TEINTES = [rampe([(120, 60, 120), (190, 120, 200), (230, 190, 240)], 60),      # lilas
           rampe([(60, 120, 160), (120, 190, 220), (200, 236, 250)], 60),      # bleu ciel
           rampe([(170, 100, 40), (240, 180, 80), (255, 230, 160)], 60),       # jaune d'or
           rampe([(170, 60, 90), (240, 130, 160), (255, 210, 222)], 60),       # rose
           rampe([(60, 130, 70), (130, 200, 120), (210, 244, 196)], 60)]       # vert tendre
DECOR = rampe([(240, 240, 250), (255, 255, 255)], 10)


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)


def oeuf(t, cx, cy, rx, ry, k, motif):
    """Un œuf : un ovale plus pointu en haut, éclairé en haut à gauche ; son motif peint (des bandes, des pois, un
    zigzag) d'un ton plus clair ou blanc."""
    R = TEINTES[k % len(TEINTES)]
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            # la forme d'un œuf : une ellipse dont la largeur, à la hauteur v (−1 en haut, 1 en bas), est multipliée
            # par (1 + 0.16 v) : plus large un peu sous le milieu, le haut plus étroit mais rond
            v = (y + 0.5 - cy) / ry
            if abs(v) > 1:
                continue
            demi = rx * math.sqrt(1 - v * v) * (1 + 0.16 * v)
            if demi <= 0:
                continue
            u = (x + 0.5 - cx) / demi
            if abs(u) > 1:
                continue
            d = u * u * (1 - v * v) + v * v
            nz = math.sqrt(max(0.0, 1 - d))
            lum = 0.45 + 0.5 * (-0.55 * u - 0.6 * v + 0.55 * nz)
            peint = (motif == 'bandes' and abs(v) < 0.18) or (motif == 'bandes' and abs(v + 0.55) < 0.1) \
                or (motif == 'pois' and (x + y * 2) % 4 == 0) \
                or (motif == 'zigzag' and abs(v - 0.25 * ((x % 4) - 1.5) / 1.5) < 0.12)
            t.put(x, y, ton(DECOR, lum) if peint and motif == 'pois' else ton(R, lum + (0.35 if peint else 0)))


def panier():
    """Le panier d'osier : sa face tressée (un rang sur deux décalé), son bord, l'ouverture où l'on voit le fond de
    paille et cinq œufs peints ; l'anse qui passe par-dessus."""
    W, H = 22, 22
    t = Toile(W, H)
    x0, x1, yb, haut = 2, W - 3, H - 2, 12
    for y in range(haut, yb + 1):                            # la face tressée, un peu évasée vers le haut
        e = (yb - y) * 0.15
        for x in range(int(x0 - e), int(x1 + e) + 1):
            u = (x - x0 + e) / (x1 - x0 + 2 * e)
            tresse = ((x + (y // 2) % 2 * 2) // 2) % 2
            lum = 0.62 - 0.36 * u - 0.10 * (y - haut) / (yb - haut) + (0.08 if tresse else -0.06)
            t.put(x, y, ton(OSIER[tresse], lum))
    cy, rx, ry = haut - 1, (x1 - x0) / 2 + 2, 4.2               # l'ouverture : le bord (un anneau), le fond de paille
    cx = (W - 1) / 2
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(W):
            u, v = (x + 0.5 - cx - 0.5) / rx, (y + 0.5 - cy) / ry
            d = u * u + v * v
            if d > 1:
                continue
            if d > 0.62:
                t.put(x, y, ton(OSIER[(x // 2) % 2], 0.85 - 0.3 * (u + 1) / 2 + 0.06 * (v < 0)))
            else:
                t.put(x, y, ton(PAILLE, 0.35 + 0.35 * (v + 1) / 2 + 0.1 * ((x + y) % 3 == 0)))
    for i, (ex, ey, m) in enumerate(((7, 9, 'bandes'), (11, 8, 'pois'), (15, 9, 'zigzag'), (9, 11, 'pois'), (13, 11, 'bandes'))):
        oeuf(t, ex, ey, 2.2, 2.8, i, m)
    for k in range(18):                                      # l'anse
        a = math.pi * k / 17
        x, y = cx + 0.5 + (rx - 1.5) * math.cos(a), cy - 0.5 - 8 * math.sin(a)
        t.put(x, y, ton(OSIER[k % 2], 0.75 - 0.35 * (math.cos(a) < 0)))
        t.put(x, y + 1, ton(OSIER[k % 2], 0.35))
    return contour(t.im, OUT)


def oeuf_geant():
    """L'œuf géant : peint de bandes et de pois, posé dans un nid de paille (son dessus en couronne, ses brins)."""
    W, H = 20, 28
    t = Toile(W, H)
    cx = (W - 1) / 2
    for y in range(H - 8, H - 1):                            # le nid
        for x in range(W):
            u, v = (x + 0.5 - cx - 0.5) / 9.5, (y + 0.5 - (H - 5)) / 3.6
            if u * u + v * v > 1:
                continue
            lum = 0.6 - 0.3 * (u + 1) / 2 - 0.15 * v + (0.15 if (x * 2 + y) % 3 == 0 else -0.05)
            t.put(x, y, ton(PAILLE, lum))
    oeuf(t, cx + 0.5, 12.5, 7.6, 9.6, 0, 'zigzag')
    for x in range(W):                                       # deux bandes d'or, qui épousent le ventre de l'œuf (vues
        u = (x - cx) / 7.6                                   # d'en haut à 45° : plus basses au milieu)
        if abs(u) > 1:
            continue
        creux = round(1.4 * (1 - u * u))
        for y0 in (7, 15):
            for y in (y0 + creux, y0 + creux + 1):
                if 0 <= y < H and t.px[x, y][3]:
                    t.put(x, y, ton(TEINTES[2], 0.9 - 0.45 * (u + 1) / 2 - 0.1 * (y - y0 - creux)))
    for (x, y) in ((6, 12), (10, 11), (13, 13), (8, 19), (12, 20)):
        t.put(x, y, ton(DECOR, 1.0))
    for x in range(W):                                       # le bord du nid devant l'œuf
        for y in (H - 5, H - 4):
            u = (x + 0.5 - cx - 0.5) / 9.5
            if abs(u) < 0.95:
                t.put(x, y, ton(PAILLE, 0.55 - 0.3 * (u + 1) / 2 + (0.15 if (x + y) % 2 else 0)))
    return contour(t.im, OUT)


def main():
    panier().save(os.path.join(ASSETS, 'meuble_panier_oeufs.png'), optimize=True)
    oeuf_geant().save(os.path.join(ASSETS, 'meuble_oeuf_geant.png'), optimize=True)
    print('Pâques : le panier d\'œufs, l\'œuf géant')
    if '--apercu' in sys.argv:
        ims = [panier(), oeuf_geant()]
        ap = Image.new('RGBA', (sum(i.width + 6 for i in ims) + 6, 34), (92, 146, 62, 255))
        x = 6
        for i in ims:
            ap.alpha_composite(i, (x, 32 - i.height)); x += i.width + 6
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_paques.png'))


if __name__ == '__main__':
    main()
