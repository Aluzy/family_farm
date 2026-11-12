# Les décors de Noël de la boutique de gemmes (worker/src/boutique.mjs ARTICLES, `fete: 'noel'` : en vente en
# décembre) : le sapin décoré (un meuble d'une case, dans une pièce), ses guirlandes qui clignotent (une planche
# d'images posées par-dessus, assets/sapin_lumieres.png ; js/carte/ferme/chantier.js stepSurcouches) et sa lueur le
# soir (BLOCS_CARTE.sapin) ; la couronne de Noël (accrochée au mur, comme un tableau) ; le bonhomme de neige (dehors).
#
# Vus de haut à 45° (CLAUDE.md), en nuances : chaque étage de branches du sapin est une jupe dont on voit le dessus
# (éclairé à gauche, l'ombre froide à droite et dessous), chaque boule son reflet ; le pot montre son dessus (la terre)
# ; les boules de neige du bonhomme, leur dessus clair, leur ombre bleutée.
#
#   python3 scripts/batiments/noel.py            écrit assets/meuble_sapin_noel.png, sapin_lumieres.png,
#                                                meuble_couronne_noel.png, meuble_bonhomme_neige.png
#   python3 scripts/batiments/noel.py --apercu   écrit aussi apercu_noel.png (agrandi)
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (24, 22, 26)
SW, SH = 26, 46                      # le sapin
LUMIERES = 4                         # les images des guirlandes qui clignotent
SAPINS = [rampe([(10, 34, 30), (20, 62, 46), (34, 94, 60), (64, 130, 76), (112, 168, 100), (170, 206, 140)], 140),
          rampe([(12, 30, 34), (22, 56, 50), (38, 88, 66), (70, 124, 84), (118, 162, 108), (176, 202, 146)], 140),
          rampe([(8, 36, 28), (18, 66, 42), (30, 100, 56), (58, 138, 70), (104, 176, 94), (164, 212, 134)], 140)]
ROUGE = rampe([(80, 10, 20), (140, 20, 30), (196, 40, 44), (236, 96, 86), (255, 196, 180)], 100)
OR = rampe([(110, 70, 20), (176, 128, 40), (226, 184, 80), (252, 228, 150), (255, 252, 230)], 100)
ARGENT = rampe([(70, 80, 100), (130, 140, 160), (196, 204, 216), (240, 244, 250)], 80)
TERRE = rampe([(40, 26, 18), (76, 50, 32), (110, 76, 48)], 40)
POT = rampe([(70, 20, 22), (130, 36, 34), (180, 60, 50), (220, 110, 90)], 80)
NEIGE = rampe([(110, 130, 170), (170, 188, 216), (214, 226, 242), (240, 246, 252), (255, 255, 255)], 120)
NOIR = rampe([(14, 14, 20), (40, 40, 52), (80, 80, 96)], 40)
CAROTTE = rampe([(150, 60, 10), (220, 110, 30), (250, 170, 80)], 40)
BOIS = rampe([(50, 30, 20), (96, 62, 38), (140, 96, 60)], 40)
# les tiers de branches : (le milieu y, la demi-largeur, la hauteur de la jupe)
ETAGES = [(12, 5.5, 6), (19, 8.5, 7), (27, 11.5, 8), (34, 12.5, 7)]
CX = (SW - 1) / 2
# les ampoules des guirlandes : (x, y, couleur) ; les boules : (x, y, rampe)
AMPOULES = [(9, 14, 0), (14, 15, 1), (17, 13, 2), (7, 21, 3), (12, 22, 0), (17, 23, 1), (20, 21, 2),
            (5, 29, 1), (10, 30, 2), (15, 31, 3), (20, 30, 0), (4, 36, 3), (9, 37, 0), (14, 38, 1), (19, 37, 2), (23, 35, 3)]
TEINTES = [(255, 220, 120), (255, 110, 100), (130, 200, 255), (160, 255, 150)]
BOULES = [(11, 17, ROUGE), (15, 25, OR), (8, 26, ARGENT), (19, 26, ROUGE), (12, 33, OR), (6, 34, ROUGE), (18, 33, ARGENT), (16, 39, ROUGE), (10, 40, ARGENT)]


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c, a=255):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (a,)


def sapin():
    """Le sapin : le pot rouge (son dessus, la terre), le tronc, quatre jupes de branches (du haut vers le bas, chacune
    recouvre la précédente), les boules, l'étoile."""
    t = Toile(SW, SH)
    for y in range(SH - 7, SH - 1):                          # le pot : sa face, son dessus (la terre)
        for x in range(6, SW - 6):
            u = (x - 6) / (SW - 13)
            if y < SH - 5:
                t.put(x, y, ton(TERRE, 0.5 - 0.3 * u) if 8 <= x <= SW - 9 and y == SH - 7 else ton(POT, 0.9 - 0.3 * u))
            else:
                t.put(x, y, ton(POT, 0.62 - 0.4 * u - 0.05 * (y - SH + 5)))
    for y in range(SH - 9, SH - 6):
        t.put(CX, y, ton(BOIS, 0.7)); t.put(CX + 1, y, ton(BOIS, 0.35))
    for k, (cy, r, h) in enumerate(ETAGES):
        R = SAPINS[k % 3]
        for y in range(int(cy - h), int(cy + 2)):
            f = (y - (cy - h)) / h                           # de la pointe (0) au bord de la jupe (1)
            demi = r * min(1.0, f * 1.05) + 0.5
            for x in range(SW):
                d = x + 0.5 - (CX + 0.5)
                if abs(d) > demi:
                    continue
                u = d / max(1, demi)
                aiguilles = 0.08 if (x * 3 + y * 5 + k) % 4 == 0 else -0.04
                lum = 0.70 - 0.38 * (u + 1) / 2 - 0.20 * f + aiguilles + 0.04 * bruit(x, y, 170 + k)
                if y >= cy and abs(u) > 0.2 and (x + k) % 3 == 0:
                    continue                                 # le bord dentelé de la jupe
                if y >= cy:
                    lum -= 0.22                              # le dessous de la jupe, dans l'ombre froide
                t.put(x, y, ton(R, lum))
    for (x, y, R) in BOULES:                                 # les boules, leur reflet
        t.put(x, y, ton(R, 0.7)); t.put(x + 1, y, ton(R, 0.45))
        t.put(x, y + 1, ton(R, 0.4)); t.put(x + 1, y + 1, ton(R, 0.25))
        t.put(x, y, ton(R, 1.0))
    for (dx, dy, l) in ((0, -2, 1.0), (-1, -1, 0.8), (0, -1, 1.0), (1, -1, 0.6), (-2, 0, 0.7), (-1, 0, 0.9), (0, 0, 1.0),
                        (1, 0, 0.6), (2, 0, 0.45), (-1, 1, 0.6), (1, 1, 0.4)):
        t.put(CX + dx, 4 + dy, ton(OR, l))                   # l'étoile
    for (x, y, k) in AMPOULES:                               # les ampoules éteintes (la carte les allume)
        t.put(x, y, tuple(int(c * 0.45) for c in TEINTES[k]))
    return contour(t.im, OUT)


def lumieres(k):
    """Les guirlandes allumées, image k : une ampoule sur deux, en alternance, brille (un halo d'un pixel) ; l'étoile
    scintille."""
    t = Toile(SW, SH)
    for i, (x, y, c) in enumerate(AMPOULES):
        allumee = (i + k) % 2 == 0 or (i * 7 + k) % 5 == 0
        if allumee:
            col = TEINTES[c]
            t.put(x, y, col)
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                t.put(x + dx, y + dy, col, 110)
    if k % 2 == 0:
        for (dx, dy) in ((0, -3), (-3, 0), (3, 0)):
            t.put(CX + dx, 4 + dy, (255, 250, 220), 200)
    return t.im


def couronne():
    """La couronne de Noël, accrochée au mur : un anneau de branches (chaque touffe son ton), des baies rouges, un
    nœud rouge en bas ; éclairée en haut à gauche."""
    W, H = 18, 18
    t = Toile(W, H)
    cx, cy = 8.5, 8.0
    for y in range(H):
        for x in range(W):
            d = math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5)
            if 4.2 <= d <= 7.8:
                a = math.atan2(y - cy, x - cx)
                lum = 0.62 - 0.25 * math.cos(a + math.pi / 4) * ((d - 4.2) / 3.6) - 0.15 * (d > 6.8) + 0.06 * bruit(x, y, 180)
                t.put(x, y, ton(SAPINS[(x + y) % 3], lum))
    for (x, y) in ((4, 5), (13, 6), (3, 11), (14, 11), (9, 2)):
        t.put(x, y, ton(ROUGE, 0.9)); t.put(x + 1, y + 1, ton(ROUGE, 0.45))
    for (dx, dy, l) in ((-3, 0, 0.7), (-2, 0, 0.9), (-1, 1, 0.8), (0, 1, 0.6), (1, 1, 0.5), (2, 0, 0.6), (3, 0, 0.4),
                        (-2, 1, 0.6), (2, 1, 0.35), (-1, 2, 0.5), (1, 2, 0.3), (-1, 3, 0.45), (1, 3, 0.25)):
        t.put(cx + dx, 14 + dy, ton(ROUGE, l))               # le nœud
    return contour(t.im, OUT)


def bonhomme():
    """Le bonhomme de neige : deux boules (leur dessus clair, l'ombre bleutée en bas à droite), des yeux et des boutons
    de charbon, le nez de carotte, une écharpe rouge, un chapeau noir (son dessus, son bord), des bras de branches."""
    W, H = 22, 32
    t = Toile(W, H)
    cx = (W - 1) / 2
    for (cy, r) in ((24, 7.5), (13, 5.2)):
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(W):
                dx, dy = (x + 0.5 - cx - 0.5) / r, (y + 0.5 - cy) / (r * 0.92)
                d = dx * dx + dy * dy
                if d > 1:
                    continue
                nz = math.sqrt(1 - d)
                lum = 0.55 + 0.45 * (-0.55 * dx - 0.62 * dy + 0.56 * nz)
                t.put(x, y, ton(NEIGE, lum + 0.03 * bruit(x, y, 190)))
    for y in range(18, 21):                                  # l'écharpe
        for x in range(int(cx) - 5, int(cx) + 6):
            t.put(x, y, ton(ROUGE, 0.8 - 0.4 * (x - cx + 5) / 10 - 0.15 * (y - 18)))
    for y in range(20, 25):
        t.put(cx + 3, y, ton(ROUGE, 0.6 - 0.05 * (y - 20)))
    for (x, y) in ((cx - 2, 11), (cx + 2, 11)):
        t.put(x, y, ton(NOIR, 0.3))
    for y in (23, 26, 29):
        t.put(cx, y, ton(NOIR, 0.35))
    for x in range(int(cx) + 1, int(cx) + 4):
        t.put(x, 13, ton(CAROTTE, 0.9 - 0.2 * (x - cx)))
    for y in range(3, 9):                                    # le chapeau : son dessus, sa face, son bord
        for x in range(int(cx) - 3, int(cx) + 4):
            t.put(x, y, ton(NOIR, 0.7 - 0.4 * (x - cx + 3) / 6) if y == 3 else ton(NOIR, 0.45 - 0.3 * (x - cx + 3) / 6))
    for x in range(int(cx) - 5, int(cx) + 6):
        t.put(x, 9, ton(NOIR, 0.6 - 0.4 * (x - cx + 5) / 10))
    for x in range(int(cx) - 3, int(cx) + 4):
        t.put(x, 7, ton(ROUGE, 0.6))                         # le ruban du chapeau
    for k in range(5):                                       # les bras
        t.put(2 + k, 20 - k // 2, ton(BOIS, 0.6)); t.put(W - 3 - k, 20 - k // 2, ton(BOIS, 0.4))
    return contour(t.im, OUT)


def main():
    sapin().save(os.path.join(ASSETS, 'meuble_sapin_noel.png'), optimize=True)
    planche = Image.new('RGBA', (SW * LUMIERES, SH), (0, 0, 0, 0))
    for k in range(LUMIERES):
        planche.alpha_composite(lumieres(k), (k * SW, 0))
    planche.save(os.path.join(ASSETS, 'sapin_lumieres.png'))
    couronne().save(os.path.join(ASSETS, 'meuble_couronne_noel.png'), optimize=True)
    bonhomme().save(os.path.join(ASSETS, 'meuble_bonhomme_neige.png'), optimize=True)
    print('décors de Noël : le sapin, ses lumières, la couronne, le bonhomme de neige')
    if '--apercu' in sys.argv:
        ims = [sapin(), sapin(), couronne(), bonhomme()]
        ims[1].alpha_composite(lumieres(0))
        ap = Image.new('RGBA', (sum(i.width + 8 for i in ims) + 8, SH + 8), (150, 120, 86, 255))
        x = 8
        for i in ims:
            ap.alpha_composite(i, (x, SH + 4 - i.height))
            x += i.width + 8
        ap.resize((ap.width * 5, ap.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_noel.png'))


if __name__ == '__main__':
    main()
