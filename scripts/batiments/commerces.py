# La scierie, la boulangerie, la fromagerie (le chantier « l'île à bâtir », fiche I5c : data/recipes.json ATELIER.BLOCS
# scie_long, four_boulanger, cave_affinage, enseigne_scierie, enseigne_boulangerie, enseigne_fromagerie ; le moteur :
# js/engine/artisans.js). Vus de haut à 45° (CLAUDE.md ; la projection de scripts/carte/blocs.py : une hauteur de h px sur
# h × 14/16 rangées, une profondeur de p px sur p × 10/16) ; le bas de l'image est le bas de la case, ce qui monte empiète
# sur la case du dessus ; la lumière en haut à gauche (les dessus les plus clairs, le bord gauche éclairé, le droit et
# les dessous dans l'ombre ; les ombres tirent vers le froid, les lumières vers le chaud), un contour sombre d'un pixel ;
# pas d'ombre portée (des blocs de la ferme). Ce qui existe est repris : la toile, la maçonnerie, les matières et
# l'enseigne de la forge (scripts/batiments/forge.py), la houle des flammes du four de la maison (scripts/batiments/four.py,
# HAUTEURS).
#
#   - la scie de long et l'établi (l'établi de la scierie, deux cases de large, 32 × 40) : l'établi de chêne (son
#       plateau de quatre planches, vu d'en haut, plus clair vers l'avant ; sa ceinture, ses pieds, la tablette du bas
#       et ses planches empilées, l'ombre dessous), la presse à vis à gauche, un rabot et des copeaux sur le plateau, une
#       planche posée en travers qu'entame la scie de long : son cadre de chêne debout (les montants, la traverse, la
#       corde tordue et son garrot, la lame d'acier), la sciure au pied de la coupe ;
#   - le four à bois et l'étal à pains (l'établi de la boulangerie, deux cases de large, 32 × 46) : le four voûté de
#       briques (chaque brique sa nuance, le dôme modelé comme une sphère, sa cheminée dont on voit le dessus et le
#       conduit), sur son socle de pierres ; le tablier devant la gueule (son dessus) ; dans la gueule, la sole (plus
#       claire vers l'avant), la paroi gauche éclairée, la droite dans l'ombre, la voûte du fond ; une pile de bûches ;
#       l'étal à pains (deux tablettes dont on voit le dessus, ses montants ; des miches grignées, des baguettes, un
#       panier) ; éteint (four_boulanger) : de la cendre, un reste de rouge ; allumé (four_boulanger_feu_0 à _3, les
#       images qui défilent quand le commerce est ouvert) : le feu au fond de la sole, sa lumière sur la gueule, le
#       tablier, le dôme et le flanc de l'étal ;
#   - la cave d'affinage (l'établi de la fromagerie, deux cases de large, 32 × 46) : une niche voûtée de pierres (son
#       arc, son seuil dont on voit le dessus), dedans le mur du fond dans l'ombre fraîche, la paroi gauche éclairée, la
#       droite sombre, le sol de la cave plus clair vers l'avant ; trois tablettes de planches (leur dessus, leur chant)
#       et leurs meules (le dessus de chacune, sa croûte, son flanc ; des tommes dorées, des fleuries blanches, une
#       entamée qui montre sa pâte) ; un seau de caillé sur le sol (son bord, le caillé blanc dedans) ;
#   - les trois enseignes (dehors, près de la porte, 32 × 46) : celle de la forge (forge.py enseigne), coiffée d'une scie
#       découpée et peinte d'un rabot (le menuisier), d'un croissant doré et d'une miche (le boulanger), d'une meule
#       entamée et d'une part (le fromager).
#
#   python3 scripts/batiments/commerces.py            écrit assets/meuble_scie_long.png, meuble_four_boulanger.png,
#                                                     _feu_0 à _3, meuble_cave_affinage.png, meuble_enseigne_<sorte>.png
#                                                     (et compte leurs couleurs)
#   python3 scripts/batiments/commerces.py --apercu D écrit aussi D/apercu_commerces.png (agrandi, sur le plancher)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402
from forge import (OUT, PIERRES, BRIQUES, CHENE, ECORCE, CERNES, ACIER, FONTE, CUIR, CENDRE, BRAISE, CHARBON,  # noqa: E402
                   LAITON, NOIR, Toile, maconnerie, enseigne, couleurs)
from four import HAUTEURS  # noqa: E402

# ---------- les matières de plus : des rampes qui glissent du froid (l'ombre) au chaud (la lumière) ----------

SAPIN = [rampe([(36, 28, 34), (76, 58, 50), (122, 94, 70), (166, 132, 94), (204, 172, 124), (236, 210, 160)], 160),
         rampe([(34, 30, 38), (72, 62, 56), (116, 100, 76), (160, 138, 100), (200, 178, 130), (234, 214, 168)], 160),
         rampe([(40, 28, 30), (82, 56, 44), (128, 90, 62), (172, 128, 86), (210, 168, 118), (240, 206, 156)], 160)]
COPEAU = rampe([(98, 70, 46), (150, 112, 70), (198, 158, 104), (230, 198, 142), (250, 230, 186)], 100)
SCIURE = rampe([(92, 72, 56), (140, 112, 82), (186, 154, 114), (220, 192, 148), (242, 222, 184)], 100)
TERRE = rampe([(36, 24, 28), (72, 42, 36), (114, 64, 44), (158, 92, 58), (198, 128, 82), (230, 168, 116)], 160)
CROUTE = [rampe([(46, 28, 20), (98, 62, 26), (152, 104, 36), (198, 148, 56), (232, 190, 92), (250, 224, 150)], 160),
          rampe([(52, 30, 18), (108, 66, 24), (164, 112, 34), (210, 160, 58), (240, 202, 100), (252, 232, 162)], 160),
          rampe([(40, 30, 24), (88, 64, 34), (140, 106, 50), (186, 150, 74), (224, 192, 110), (246, 224, 164)], 160)]
FLEURIE = rampe([(70, 70, 82), (122, 120, 126), (172, 168, 164), (210, 206, 196), (236, 232, 222), (252, 250, 244)], 140)
PATE = rampe([(150, 120, 60), (196, 164, 90), (230, 204, 128), (248, 232, 170), (254, 248, 214)], 100)
CAILLE = rampe([(120, 124, 136), (170, 172, 176), (210, 210, 208), (236, 236, 230), (252, 252, 248)], 100)
MIE = [rampe([(54, 26, 14), (110, 58, 22), (164, 96, 36), (208, 140, 60), (236, 184, 104), (250, 222, 160)], 160),
       rampe([(48, 24, 16), (100, 52, 22), (154, 88, 34), (200, 132, 56), (232, 176, 96), (248, 216, 150)], 160)]
FARINE = rampe([(150, 140, 132), (196, 188, 176), (228, 222, 210), (246, 242, 232)], 60)
OSIER = rampe([(46, 30, 20), (96, 66, 34), (146, 104, 52), (190, 146, 78), (222, 186, 112)], 120)
FRAIS = rampe([(14, 18, 34), (26, 32, 52), (42, 48, 66), (62, 66, 80), (86, 88, 98)], 100)   # (l'ombre fraîche de la cave)
FEU = rampe([(60, 10, 8), (132, 28, 10), (196, 64, 14), (238, 118, 26), (252, 176, 52), (255, 226, 120), (255, 248, 210)], 180)
PEINTE = rampe([(46, 30, 22), (100, 70, 42), (152, 112, 66), (200, 158, 100), (234, 204, 148), (250, 236, 196)], 140)
OR = rampe([(60, 34, 10), (116, 72, 18), (172, 118, 30), (220, 168, 58), (246, 210, 110), (254, 240, 190)], 140)


def melange(c, d, f):
    return tuple(round(c[i] * (1 - f) + d[i] * f) for i in range(3))


def dessus_bois(t, x0, x1, y0, y1, R, graine, lum0=0.62, avant=0.26, pente=0.24, joint=True):
    """Le dessus d'une planche (ou d'un plateau) : plus clair vers l'avant, la gauche au jour, le fil du bois ; le chant
    avant au soleil ; un joint sombre à l'arrière."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            v = (y - y0) / max(1, y1 - y0)
            lum = lum0 + avant * v - pente * u + 0.04 * bruit(x // 3, y, graine) - 0.05 * ((x * 7 + y * 3 + graine) % 13 == 0)
            if joint and y == y0:
                lum -= 0.12
            if x == x0:
                lum += 0.06
            if x == x1:
                lum -= 0.10
            t.put(x, y, ton(R, lum))


def face_bois(t, x0, x1, y0, y1, R, graine, lum0=0.46, pente=0.26, pied=0.16):
    """Une face de bois tournée vers nous : plus sombre vers la droite et vers le pied (l'occlusion), le fil vertical."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            g = (y - y0) / max(1, y1 - y0)
            lum = lum0 - pente * u - pied * g * g + 0.04 * bruit(x, y // 2, graine) - 0.05 * ((x * 5 + y + graine) % 9 == 0)
            if x == x0:
                lum += 0.08
            if x == x1:
                lum -= 0.08
            t.put(x, y, ton(R, lum))


# ---------- la scie de long et l'établi ----------

SW, SH = 32, 40
PL0, PL1 = 20, 28        # le plateau de l'établi (9 rangées : 14 px de profondeur)
CE0, CE1 = 29, 30        # sa ceinture (le chant épais du plateau)
PIED1 = 39               # le pied de l'établi (le bas de la case)


def etabli(t):
    # l'ombre sous l'établi : le dessous du plateau, l'arrière, le sol entre les pieds (froid, plus sombre au fond)
    for y in range(CE1 + 1, PIED1 + 1):
        for x in range(3, 29):
            g = (y - CE1) / (PIED1 - CE1)
            t.put(x, y, ton(FRAIS, 0.30 + 0.30 * g - 0.12 * (x - 3) / 25 + 0.05 * bruit(x, y, 81)))
    # la traverse du fond (entre les pieds de derrière), dans l'ombre
    for x in range(4, 28):
        t.put(x, 33, ton(CHENE[1], 0.22 - 0.08 * (x - 4) / 23))
        t.put(x, 34, ton(CHENE[1], 0.16 - 0.06 * (x - 4) / 23))
    # la tablette du bas : son dessus (3 rangées), son chant ; les planches empilées dessus
    for y in range(35, 38):
        for x in range(4, 28):
            u = (x - 4) / 23
            t.put(x, y, ton(CHENE[2], 0.40 + 0.10 * (y - 35) - 0.20 * u + 0.04 * bruit(x // 2, y, 83)))
    for x in range(4, 28):
        t.put(x, 38, ton(CHENE[2], 0.30 - 0.14 * (x - 4) / 23))
    for k, (ya, xa, xb, R) in enumerate(((34, 6, 24, SAPIN[0]), (33, 7, 23, SAPIN[1]), (32, 8, 21, SAPIN[2]))):
        for x in range(xa, xb + 1):
            u = (x - xa) / max(1, xb - xa)
            t.put(x, ya, ton(R, 0.66 - 0.24 * u + 0.04 * bruit(x, ya, 85 + k)))             # leur dessus
            t.put(x, ya + 1, ton(R, 0.40 - 0.18 * u + 0.03 * bruit(x, ya, 86 + k)))          # leur chant, dans l'ombre
        t.put(xb, ya, ton(R, 0.30)); t.put(xa, ya + 1, ton(R, 0.52))
    # les quatre pieds (de face : la gauche au jour, la droite dans l'ombre ; l'occlusion au pied)
    for xa in (2, 27):
        for y in range(CE1 + 1, PIED1 + 1):
            g = (y - CE1) / (PIED1 - CE1)
            for i, x in enumerate((xa, xa + 1, xa + 2)):
                lum = (0.64, 0.48, 0.30)[i] - 0.18 * g * g + 0.03 * bruit(x, y, 87)
                if xa == 27:
                    lum -= 0.08
                t.put(x, y, ton(CHENE[0], lum))
    # la ceinture : le chant épais du plateau, face à nous
    for y in (CE0, CE1):
        for x in range(1, 31):
            u = (x - 1) / 29
            lum = (0.50 if y == CE0 else 0.40) - 0.26 * u + 0.04 * bruit(x // 2, y, 89)
            t.put(x, y, ton(CHENE[1], lum))
    # le plateau : quatre planches en long, chacune son bois, plus claires vers l'avant
    for k, (ya, yb, R) in enumerate(((PL0, PL0 + 1, CHENE[2]), (PL0 + 2, PL0 + 4, CHENE[0]), (PL0 + 5, PL0 + 6, CHENE[1]), (PL0 + 7, PL1, CHENE[2]))):
        for y in range(ya, yb + 1):
            for x in range(1, 31):
                u = (x - 1) / 29
                v = (y - PL0) / (PL1 - PL0)
                lum = 0.58 + 0.28 * v - 0.22 * u + 0.04 * bruit(x // 3, y, 91 + k) - 0.05 * ((x * 7 + y * 3 + k) % 11 == 0)
                if y == ya:
                    lum -= 0.12                                         # le joint
                if y == PL1:
                    lum = 0.94 - 0.24 * u                               # l'arête avant, au soleil
                if x == 1:
                    lum += 0.06
                if x == 30:
                    lum -= 0.12
                t.put(x, y, ton(R, lum))
    # les trous des valets (deux, sombres, vus d'en haut)
    for (x, y) in ((9, PL0 + 3), (17, PL0 + 3)):
        t.put(x, y, ton(NOIR, 0.30)); t.put(x + 1, y, ton(NOIR, 0.40))
    # la presse à vis, à gauche : le mors de chêne (son dessus, sa face), la vis et sa poignée
    for y in range(PL1 - 2, CE1 + 3):
        for x in range(1, 6):
            dessus = y < PL1
            lum = (0.80 - 0.06 * (x - 1) if dessus else 0.54 - 0.08 * (x - 1) - 0.04 * (y - PL1)) + 0.03 * bruit(x, y, 93)
            t.put(x, y, ton(CHENE[0], lum))
    for x in range(0, 7):
        t.put(x, CE1 + 1, ton(ACIER, 0.70 - 0.08 * x))                          # la poignée de fer
    t.put(3, CE1 + 2, ton(ACIER, 0.36))
    # le rabot, posé sur le plateau : sa semelle, son dessus de hêtre, la lame qui pointe, la poignée
    for y in range(PL0 + 4, PL0 + 7):
        for x in range(8, 14):
            dessus = y < PL0 + 6
            lum = (0.86 - 0.05 * (x - 8) if dessus else 0.50 - 0.04 * (x - 8)) + 0.03 * bruit(x, y, 95)
            t.put(x, y, ton(SAPIN[2], lum))
    t.put(10, PL0 + 4, ton(ACIER, 0.86)); t.put(11, PL0 + 4, ton(ACIER, 0.62))
    t.put(12, PL0 + 3, ton(CHENE[0], 0.78)); t.put(12, PL0 + 2, ton(CHENE[0], 0.66))
    # des copeaux en boucles, sur le plateau et au bord
    for (x, y, l) in ((4, PL0 + 6, 0.9), (5, PL0 + 7, 0.7), (6, PL0 + 6, 0.8), (15, PL0 + 7, 0.86), (16, PL0 + 6, 0.66),
                      (14, PL0 + 8, 0.74), (6, PL1, 0.92), (7, PL1 - 1, 0.6)):
        t.put(x, y, ton(COPEAU, l + 0.05 * bruit(x, y, 97)))


def planche_en_travers(t):
    """La planche de sapin posée en travers du plateau (son dessus, son chant), que la scie entame à droite."""
    xa, xb, ya = 15, 30, PL0 + 2
    for y in range(ya, ya + 4):
        for x in range(xa, xb + 1):
            u = (x - xa) / (xb - xa)
            lum = 0.72 + 0.12 * (y - ya) / 3 - 0.20 * u + 0.04 * bruit(x // 2, y, 99) - 0.06 * ((x + 2 * y) % 7 == 0)
            if y == ya:
                lum -= 0.06
            t.put(x, y, ton(SAPIN[0], lum))
    for x in range(xa, xb + 1):
        t.put(x, ya + 4, ton(SAPIN[0], 0.44 - 0.18 * (x - xa) / (xb - xa)))      # son chant
    # le trait de scie, sombre, et la sciure au pied de la coupe (sur la planche, sur le plateau, au sol)
    for y in range(ya, ya + 5):
        t.put(25, y, ton(NOIR, 0.30 + 0.05 * y % 2))
    for (x, y, l) in ((24, ya + 5, 0.9), (26, ya + 5, 0.8), (25, ya + 6, 0.7), (23, ya + 6, 0.6), (27, ya + 6, 0.66),
                      (24, ya + 7, 0.5), (26, PIED1, 0.62), (25, PIED1 - 1, 0.5), (23, PIED1, 0.56), (28, ya + 5, 0.6)):
        t.put(x, y, ton(SCIURE, l + 0.06 * bruit(x, y, 101)))


def scie_de_long(t):
    """La scie à cadre (la scie de long), penchée dans la coupe : les deux montants de chêne, la traverse du milieu, la
    corde tordue et son garrot en haut, la lame d'acier en bas, qui mord la planche."""
    y0, y1 = 3, PL0 + 3
    pente = lambda y: (y1 - y) / 5.0                                      # (le cadre penche vers la droite)
    xg0, xd0 = 19, 27
    def montant(xm, y):
        return int(round(xm + pente(y)))
    # les montants : leur face (la gauche au jour), leur bout du haut, dont on voit le dessus
    for xm, ri in ((xg0, 0), (xd0, 2)):
        for y in range(y0, y1 + 1):
            g = (y - y0) / (y1 - y0)
            x = montant(xm, y)
            t.put(x, y, ton(CHENE[ri], 0.70 - 0.12 * g + 0.04 * bruit(xm, y, 103)))
            t.put(x + 1, y, ton(CHENE[ri], 0.42 - 0.10 * g + 0.04 * bruit(xm, y, 104)))
        x = montant(xm, y0 - 1)
        t.put(x, y0 - 1, ton(CHENE[ri], 0.90)); t.put(x + 1, y0 - 1, ton(CHENE[ri], 0.72))
    # la traverse (au milieu) : son dessus clair, sa face
    ym = 12
    for x in range(montant(xg0, ym) + 2, montant(xd0, ym)):
        u = (x - xg0) / (xd0 - xg0)
        t.put(x, ym, ton(CHENE[1], 0.84 - 0.20 * u + 0.03 * bruit(x, ym, 105)))
        t.put(x, ym + 1, ton(CHENE[1], 0.46 - 0.16 * u))
    # la corde tordue (deux brins entrelacés) entre le haut des montants, le garrot qui la serre
    for y in (y0 + 1, y0 + 2):
        for x in range(montant(xg0, y) + 2, montant(xd0, y)):
            t.put(x, y, ton(CUIR, (0.74 if (x + y) % 2 else 0.44) + 0.03 * bruit(x, y, 106)))
    for y in range(y0 + 1, ym):
        x = int(round(23 + pente(y) * 0.9))
        t.put(x, y, ton(SAPIN[2], 0.80 - 0.03 * (y - y0)))
    # la lame d'acier, en bas : son fil clair, ses dents, qui mordent la planche
    for x in range(montant(xg0, y1) + 2, montant(xd0, y1)):
        u = (x - xg0) / (xd0 - xg0)
        t.put(x, y1 - 1, ton(ACIER, 0.94 - 0.30 * u + 0.03 * bruit(x, y1, 107)))
        t.put(x, y1, ton(ACIER, 0.40 - 0.12 * u if x % 2 else 0.64 - 0.12 * u))


def scie_long():
    t = Toile(SW, SH)
    etabli(t)
    planche_en_travers(t)
    scie_de_long(t)
    return contour(t.im, OUT)


# ---------- le four à bois et l'étal à pains ----------

FW, FH = 32, 46
# le four : le socle de pierres (x 1 à 20 ; sa face y 37 à 45 : 9 rangées), le tablier devant la gueule (y 33 à 36 : son
# dessus), le dôme de briques (centre (10.5, 30), demi-axes 9.5 × 13 : son haut à y 17), la gueule (x 6 à 15, y 26 à
# 34), la cheminée sur le dôme (x 13 à 17, du chapeau y 9 au dôme)
OX0, OX1 = 1, 20
SOC0, SOC1 = 37, 45
TAB0, TAB1 = 33, 36
DCX, DCY, DRX, DRY = 10.5, 31.0, 9.6, 14.0
GX0, GX1, GY0, GY1 = 6, 15, 25, 34
CMX0, CMX1, CMY0 = 13, 17, 9


def dome(t, feu):
    """Le dôme de briques : une demi-sphère vue d'en haut à 45° (la lumière en haut à gauche), des rangs de briques qui
    suivent sa courbe, chacune sa nuance ; la lueur du feu sur le bas de son avant."""
    for y in range(int(DCY - DRY), TAB0):
        for x in range(OX0, OX1 + 1):
            dx, dy = (x + 0.5 - DCX) / DRX, (y + 0.5 - DCY) / DRY
            e = dx * dx + dy * dy
            if e > 1.0:
                continue
            nz = math.sqrt(max(0.0, 1 - e))
            # (la normale : vers le haut et la gauche, plus claire)
            lum = 0.16 + 0.62 * nz - 0.30 * dx - 0.18 * dy
            rang = int((y - (DCY - DRY)) / 3.0)
            larg = 5
            col = int((x + (rang * 3) % larg) / larg)
            R = BRIQUES[(rang * 3 + col) % len(BRIQUES)]
            lum += 0.05 * bruit(col, rang, 111)
            if (y - int(DCY - DRY)) % 3 == 0 or (x + (rang * 3) % larg) % larg == 0:
                t.put(x, y, ton(PIERRES[1], 0.10 + 0.42 * lum))           # le joint de mortier, dans le ton du dôme
                continue
            if e > 0.86:
                lum -= 0.12                                               # le bord, qui tourne
            t.put(x, y, ton(R, lum + 0.02 * bruit(x, y, 113)))
            if feu:
                f = max(0.0, 1 - math.hypot((x - (GX0 + GX1) / 2) / 7.0, (y - GY0) / 6.0))
                t.teinter(x, y, (255, 150, 60), feu * 0.55 * f)


def cheminee(t):
    """La cheminée de briques sur le dôme : sa face, son arête gauche au jour, son chapeau dont on voit le dessus, le
    conduit noir."""
    maconnerie(t, CMX0, CMX1, CMY0 + 2, int(DCY - DRY) + 4, 2, BRIQUES, 7, decal=1, lum0=0.54, pente=0.26, lit=False)
    for y in range(CMY0 + 2, int(DCY - DRY) + 5):
        t.put(CMX0, y, ton(BRIQUES[0], 0.70))
        t.put(CMX1, y, ton(BRIQUES[2], 0.20))
    for y in range(CMY0, CMY0 + 2):
        for x in range(CMX0 - 1, CMX1 + 2):
            u = (x - CMX0 + 1) / (CMX1 - CMX0 + 2)
            t.put(x, y, ton(PIERRES[0], (0.84 if y == CMY0 else 0.46) - 0.24 * u + 0.04 * bruit(x, y, 115)))
    t.put(CMX0 + 1, CMY0, ton(NOIR, 0.24)); t.put(CMX0 + 2, CMY0, ton(NOIR, 0.18)); t.put(CMX0 + 3, CMY0, ton(NOIR, 0.30))


def socle_et_tablier(t, feu):
    """Le socle de pierres (sa face) et le tablier devant la gueule (son dessus, plus clair vers l'avant ; l'arête avant au
    soleil) ; la lueur du feu sur le tablier."""
    maconnerie(t, OX0, OX1, SOC0, SOC1, 3, PIERRES, 9, decal=2, lum0=0.54, pente=0.24)
    for y in range(SOC0, SOC1 + 1):
        t.put(OX0, y, ton(PIERRES[0], 0.66 - 0.2 * (y - SOC0) / 8))
        t.put(OX1, y, ton(PIERRES[2], 0.18))
    for y in range(TAB0, TAB1 + 1):
        for x in range(OX0, OX1 + 1):
            u = (x - OX0) / (OX1 - OX0)
            v = (y - TAB0) / (TAB1 - TAB0)
            dalle = (x - OX0) // 7
            lum = 0.64 + 0.20 * v - 0.22 * u + 0.04 * bruit(x, y, 117 + dalle)
            if (x - OX0) % 7 == 0 and x != OX0:
                lum -= 0.16                                               # le joint des dalles
            if y == TAB1:
                lum = 0.92 - 0.26 * u
            t.put(x, y, ton(PIERRES[(dalle + 2) % len(PIERRES)], lum))
            if feu:
                f = max(0.0, 1 - math.hypot((x - (GX0 + GX1) / 2) / 8.0, (y - GY1) / 4.0))
                t.teinter(x, y, (255, 150, 60), feu * 0.5 * f)


def gueule(t, etat, k):
    """La gueule du four, une arche dans le dôme : la voûte du fond (sombre), la paroi gauche éclairée, la droite dans
    l'ombre, la sole vue d'en haut (plus claire vers l'avant) ; la cendre (éteint), ou le feu au fond (allumé : l'image
    k, la houle des flammes de four.py)."""
    cx, w = (GX0 + GX1) / 2, (GX1 - GX0) / 2 + 0.5
    sole0 = GY1 - 4
    feu = etat != 'eteint'
    for y in range(GY0, GY1 + 1):
        for x in range(GX0, GX1 + 1):
            dx = (x + 0.5 - cx) / w
            haut = GY0 + 4 * (1 - math.sqrt(max(0.0, 1 - dx * dx))) * 1.4
            if y < haut:
                continue
            if abs(dx) > 0.98:
                continue
            if y < sole0:                                                 # la voûte et le fond du four
                lum = 0.14 + 0.08 * (y - GY0) / 5 + 0.04 * bruit(x, y, 119)
                t.put(x, y, ton(BRIQUES[0], lum) if not feu else ton(FEU, 0.30 + 0.20 * (y - GY0) / 5 + 0.06 * bruit(x + k, y, 120)))
                continue
            v = (y - sole0) / (GY1 - sole0)
            if x == GX0 or x == GX0 + 1 and y < GY1 - 1:                  # la paroi gauche, éclairée
                t.put(x, y, ton(BRIQUES[1], (0.50 if not feu else 0.66) - 0.1 * v))
                continue
            if x >= GX1 - 1:                                              # la paroi droite, dans l'ombre
                t.put(x, y, ton(BRIQUES[2], (0.14 if not feu else 0.26) + 0.04 * v))
                continue
            # la sole : de grandes briques réfractaires, plus claires vers l'avant
            if feu:
                t.put(x, y, ton(TERRE, 0.42 + 0.34 * v + 0.05 * bruit(x, y, 121)))
            else:
                t.put(x, y, ton(CENDRE, 0.26 + 0.34 * v - 0.08 * (x - GX0) / (GX1 - GX0) + 0.08 * bruit(x, y, 122)))
    if not feu:
        for (x, y) in ((9, GY1 - 3), (11, GY1 - 2), (12, GY1 - 3)):
            t.put(x, y, ton(BRAISE, 0.26 + 0.06 * bruit(x, y, 123)))
        return
    # le feu : des bûches au fond de la sole, des flammes qui montent et ondulent (HAUTEURS de four.py, image k)
    for x in range(GX0 + 2, GX1 - 1):
        t.put(x, sole0, ton(ECORCE, 0.36 + 0.14 * bruit(x, 0, 125)))
        t.put(x, sole0 + 1, ton(BRAISE, 0.50 + 0.30 * (0.5 + 0.5 * bruit(x * 3 + k, 1, 126))))
    for x in range(GX0 + 2, GX1 - 1):
        base = 3 + (1 if 8 <= x <= 13 else 0)
        h = max(1, base + HAUTEURS(2 * k, x))
        for i in range(h):
            y = sole0 - 1 - i
            if y < GY0 + 1:
                break
            f = 1 - i / max(1, h)
            t.put(x, y, ton(FEU, 0.36 + 0.60 * f + 0.06 * bruit(x, y + k, 127)))


def buches(t):
    """La pile de bûches à côté du four (sur le sol, contre le socle) : leurs bouts vus de face, les cernes, l'écorce."""
    for (cx, cy, r) in ((19.5, 43.0, 2.4), (23.5, 43.2, 2.4), (21.5, 40.2, 2.4)):
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                d = math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / r)
                if d > 1.0:
                    continue
                if d > 0.72:
                    t.put(x, y, ton(ECORCE, 0.52 - 0.3 * (x - cx + r) / (2 * r) + 0.04 * bruit(x, y, 129)))
                else:
                    t.put(x, y, ton(CERNES, 0.70 - 0.22 * (x - cx + r) / (2 * r) - (0.12 if int(d * 5) % 2 else 0) + 0.03 * bruit(x, y, 130)))


def miche(t, cx, cy, rx, ry, R, graine, feu=0.0):
    """Une miche ronde vue d'en haut : sa croûte modelée (le haut et la gauche dorés, le bas et la droite plus cuits), la
    grigne claire, un voile de farine."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            e = dx * dx + dy * dy
            if e > 1:
                continue
            lum = 0.56 + 0.30 * math.sqrt(1 - e) - 0.22 * dx - 0.18 * dy + 0.04 * bruit(x, y, graine)
            if abs(dy + 0.15 * dx) < 0.18 and abs(dx) < 0.62:
                lum += 0.20                                               # la grigne
            t.put(x, y, ton(R, lum))
            if (x * 3 + y * 5 + graine) % 11 == 0 and e < 0.5:
                t.put(x, y, ton(FARINE, 0.6 + 0.3 * bruit(x, y, graine + 1)))
            if feu:
                t.teinter(x, y, (255, 150, 60), feu * max(0.0, 0.5 - dx * 0.4))


def baguette(t, x0, y0, n, R, graine):
    """Une baguette couchée en biais (vers le bas à droite) : son dessus doré, ses grignes, son flanc plus cuit."""
    for i in range(n):
        x, y = x0 + i, y0 + i // 3
        t.put(x, y, ton(R, 0.84 - 0.02 * i + (0.10 if i % 3 == 1 else 0) + 0.03 * bruit(x, y, graine)))
        t.put(x, y + 1, ton(R, 0.50 - 0.02 * i + 0.03 * bruit(x, y, graine + 1)))


def etal_a_pains(t, feu):
    """L'étal à pains, à droite du four : ses montants, deux tablettes dont on voit le dessus (et le chant), les miches sur
    celle du haut, les baguettes et un pain long sur celle du milieu ; un panier de baguettes debout au pied."""
    xa, xb = 21, 30
    T1, T2 = 24, 32                                                       # le dessus des deux tablettes
    # le fond, entre les montants, dans l'ombre (les planches du dos)
    for y in range(T1 + 3, FH):
        for x in range(xa + 2, xb - 1):
            t.put(x, y, ton(SAPIN[1], 0.18 + 0.05 * ((x - xa) % 3 == 0) + 0.04 * bruit(x, y, 133) - 0.05 * (y > 40)))
    # les montants (de face : le gauche au jour, le droit dans l'ombre ; l'occlusion au pied)
    for y in range(T1, FH):
        g = ((y - T1) / (FH - T1)) ** 2
        for x, l in ((xa, 0.66), (xa + 1, 0.48), (xb - 1, 0.34), (xb, 0.22)):
            t.put(x, y, ton(CHENE[0], l - 0.14 * g + 0.03 * bruit(x, y, 131)))
    # les tablettes : leur dessus (3 rangées, plus clair vers l'avant), leur chant, l'ombre dessous
    for k, y0 in enumerate((T1, T2)):
        for y in range(y0, y0 + 3):
            for x in range(xa, xb + 1):
                u = (x - xa) / (xb - xa)
                t.put(x, y, ton(SAPIN[k], 0.60 + 0.12 * (y - y0) - 0.22 * u + 0.04 * bruit(x, y, 135 + k)))
        for x in range(xa, xb + 1):
            t.put(x, y0 + 3, ton(SAPIN[k], 0.42 - 0.18 * (x - xa) / (xb - xa)))
        for x in range(xa + 2, xb - 1):
            t.put(x, y0 + 4, ton(FRAIS, 0.20))
    # les miches posées sur la tablette du haut (elles dépassent au-dessus), les baguettes et un pain long au milieu
    miche(t, 23.6, T1 - 0.2, 2.6, 2.0, MIE[0], 137, feu)
    miche(t, 27.8, T1 + 0.4, 2.4, 1.8, MIE[1], 139, feu * 0.6)
    baguette(t, xa + 1, T2 - 1, 8, MIE[0], 143)
    baguette(t, xa + 2, T2 + 1, 7, MIE[1], 144)
    # le panier d'osier au pied (son bord dont on voit le dessus, sa face tressée), des baguettes debout dedans
    for y in range(41, FH):
        for x in range(xa + 1, xb):
            u = (x - xa - 1) / (xb - xa - 2)
            lum = 0.56 - 0.26 * u + (0.10 if (x + y) % 2 else -0.04) - 0.06 * (y - 41) / 4 + 0.03 * bruit(x, y, 147)
            t.put(x, y, ton(OSIER, lum))
    for x in range(xa + 1, xb):
        t.put(x, 40, ton(OSIER, 0.84 - 0.26 * (x - xa) / (xb - xa)))
    for bx, h, R in ((23, 3, MIE[0]), (25, 4, MIE[1]), (27, 3, MIE[0])):
        for y in range(40 - h, 41):
            t.put(bx, y, ton(R, 0.84 - 0.04 * (40 - y) + (0.08 if y % 3 == 0 else 0)))
            t.put(bx + 1, y, ton(R, 0.52 + (0.06 if y % 3 == 0 else 0)))
        t.put(bx, 39 - h, ton(R, 0.96)); t.put(bx + 1, 39 - h, ton(R, 0.70))
    if feu:
        for y in range(T1 - 3, FH):
            for x in range(xa, xa + 4):
                t.teinter(x, y, (255, 160, 70), feu * 0.30 * (1 - (x - xa) / 4))


def four_boulanger(etat):
    t = Toile(FW, FH)
    feu = 0.0 if etat == 'eteint' else (0.85 + 0.15 * math.sin(int(etat[-1]) * 1.7))
    k = 0 if etat == 'eteint' else int(etat[-1])
    socle_et_tablier(t, feu)
    dome(t, feu)
    cheminee(t)
    gueule(t, etat, k)
    buches(t)
    etal_a_pains(t, feu)
    return contour(t.im, OUT)


# ---------- la cave d'affinage ----------

CW, CH = 32, 46
NX0, NX1, NY0 = 4, 27, 8        # la niche : x 4 à 27, sa voûte en haut (y 8) ; son sol, y 38 à 42 ; le seuil, y 43 à 45
SOL0, SOL1 = 38, 42
SEU0, SEU1 = 43, 45


def niche(t):
    """Le pourtour de pierres et sa voûte, la niche dedans : le mur du fond dans l'ombre fraîche, la paroi gauche
    éclairée, la droite sombre, le sol de la cave (plus clair vers l'avant) ; le seuil dont on voit le dessus."""
    maconnerie(t, 1, 30, 4, SEU0 - 1, 3, PIERRES, 151, decal=1, lum0=0.56, pente=0.24)
    for y in range(4, SEU0):
        t.put(1, y, ton(PIERRES[0], 0.74 - 0.1 * (y - 4) / 40))
        t.put(30, y, ton(PIERRES[2], 0.20))
    # le haut du mur : son dessus (une rangée de pierres de taille)
    for y in range(2, 4):
        for x in range(1, 31):
            u = (x - 1) / 29
            t.put(x, y, ton(PIERRES[(x // 6) % len(PIERRES)], (0.84 if y == 2 else 0.70) - 0.24 * u + 0.04 * bruit(x, y, 153)))
    cx, w = (NX0 + NX1) / 2, (NX1 - NX0) / 2 + 0.5
    for y in range(NY0, SOL1 + 1):
        for x in range(NX0, NX1 + 1):
            dx = (x + 0.5 - cx) / w
            haut = NY0 + 6 * (1 - math.sqrt(max(0.0, 1 - dx * dx)))
            if y < haut or abs(dx) > 0.99:
                continue
            if y >= SOL0:                                                 # le sol de la cave : plus clair vers l'avant
                v = (y - SOL0) / (SOL1 - SOL0)
                t.put(x, y, ton(PIERRES[2], 0.24 + 0.30 * v - 0.12 * (x - NX0) / (NX1 - NX0) + 0.05 * bruit(x, y, 155)))
                continue
            if x <= NX0 + 1:                                              # la paroi gauche, éclairée
                t.put(x, y, ton(PIERRES[3], 0.56 - 0.06 * (x - NX0) + 0.04 * bruit(x, y, 157)))
                continue
            if x >= NX1 - 1:                                              # la paroi droite, dans l'ombre
                t.put(x, y, ton(FRAIS, 0.40 + 0.06 * bruit(x, y, 159)))
                continue
            # le mur du fond : des pierres dans l'ombre fraîche, plus sombre en haut sous la voûte
            g = (y - NY0) / (SOL0 - NY0)
            joint = (y % 4 == 0) or ((x + (y // 4) * 3) % 6 == 0)
            lum = 0.34 + 0.24 * g - 0.10 * (x - NX0) / (NX1 - NX0) + 0.05 * bruit(x // 3, y // 4, 161)
            t.put(x, y, ton(FRAIS, lum - (0.14 if joint else 0)))
    # l'arc de la voûte : des claveaux clairs (leur face), l'intrados dans l'ombre
    for x in range(NX0 - 1, NX1 + 2):
        dx = (x + 0.5 - cx) / (w + 1)
        if abs(dx) > 1:
            continue
        y = int(round(NY0 + 6 * (1 - math.sqrt(max(0.0, 1 - dx * dx))))) - 1
        t.put(x, y, ton(PIERRES[1], 0.78 - 0.24 * (x - NX0) / (NX1 - NX0) - 0.08 * ((x // 3) % 2)))
        t.put(x, y - 1, ton(PIERRES[0], 0.62 - 0.24 * (x - NX0) / (NX1 - NX0)))
    # le seuil : une dalle dont on voit le dessus, son arête avant au soleil, sa face
    for y in range(SEU0, SEU1 + 1):
        for x in range(1, 31):
            u = (x - 1) / 29
            lum = (0.72 + 0.10 * (y - SEU0) if y < SEU1 else 0.44) - 0.24 * u + 0.04 * bruit(x, y, 163)
            t.put(x, y, ton(PIERRES[1], lum))


def tablette(t, y0, graine):
    """Une tablette de planches entre les parois de la niche : son dessus (3 rangées), son chant ; l'ombre dessous."""
    xa, xb = NX0 + 1, NX1 - 1
    for y in range(y0, y0 + 3):
        for x in range(xa, xb + 1):
            u = (x - xa) / (xb - xa)
            lum = 0.56 + 0.12 * (y - y0) - 0.24 * u + 0.04 * bruit(x // 2, y, graine) - 0.05 * ((x * 7 + y) % 9 == 0)
            t.put(x, y, ton(CHENE[graine % 3], lum))
    for x in range(xa, xb + 1):
        t.put(x, y0 + 3, ton(CHENE[graine % 3], 0.36 - 0.16 * (x - xa) / (xb - xa)))
        t.put(x, y0 + 4, ton(FRAIS, 0.16))


def meule(t, cx, ybas, r, haut, R, graine, entame=False):
    """Une meule posée sur sa tablette (son pied à `ybas`) : son dessus (une ellipse raccourcie, la croûte, plus claire en
    haut à gauche, le talon plus sombre), son flanc (une bande de `haut` rangées, plus sombre à droite et au pied) ;
    entamée : une part ôtée à droite, la pâte claire sur le dessus de la coupe et sur la coupe."""
    ry = max(1.0, r * 0.5)
    yd = ybas - haut - ry + 0.5                                            # le centre du dessus
    for x in range(int(cx - r) - 1, int(cx + r) + 2):
        dx = (x + 0.5 - cx) / r
        if abs(dx) > 1:
            continue
        b = ry * math.sqrt(max(0.0, 1 - dx * dx))
        part = entame and dx > 0.25
        for y in range(int(yd - ry) - 1, ybas + 1):
            yy = y + 0.5
            if yd - b <= yy <= yd + b:                                     # le dessus
                dy = (yy - yd) / ry
                if part and dy < 0.2:
                    t.put(x, y, ton(PATE, 0.82 - 0.18 * dx + 0.04 * bruit(x, y, graine + 3)))
                    continue
                lum = 0.70 + 0.16 * math.sqrt(max(0.0, 1 - dx * dx - dy * dy)) - 0.22 * dx - 0.08 * dy + 0.05 * bruit(x, y, graine)
                if dx * dx + dy * dy > 0.62:
                    lum -= 0.10                                           # le talon, l'arrondi du bord
                t.put(x, y, ton(R, lum))
            elif yd + b < yy <= yd + b + haut:                            # le flanc
                g = (yy - yd - b) / haut
                if part and dx > 0.25 and yy < yd + b + haut * 0.5 and dx < 0.6:
                    t.put(x, y, ton(PATE, 0.58 - 0.12 * dx + 0.04 * bruit(x, y, graine + 4)))
                    continue
                lum = 0.48 - 0.28 * dx - 0.16 * g + 0.04 * bruit(x, y, graine + 1)
                if abs(g - 0.5) < 0.2 and (x + graine) % 3 == 0:
                    lum -= 0.06                                           # la marque de la toile, sur le flanc
                t.put(x, y, ton(R, lum))


def cave_affinage():
    t = Toile(CW, CH)
    niche(t)
    # les tablettes et leurs meules (des tommes dorées, des fleuries, une entamée)
    for k, (y0, meules) in enumerate((
        (17, ((9.5, 3.4, 3, CROUTE[0], False), (17.0, 3.2, 3, FLEURIE, False), (23.5, 2.6, 2, CROUTE[2], False))),
        (26, ((8.8, 3.0, 2, FLEURIE, False), (15.5, 3.6, 3, CROUTE[1], True), (22.8, 3.2, 3, CROUTE[0], False))),
        (35, ((10.0, 3.6, 3, CROUTE[2], False), (19.5, 3.8, 3, CROUTE[1], False))),
    )):
        tablette(t, y0, 165 + k)
        for i, (cx, r, h, R, entame) in enumerate(meules):
            meule(t, cx, y0 + 1, r, h, R, 171 + 7 * k + i, entame)
    # le seau de caillé, sur le sol de la cave : ses douelles (le flanc), son bord dont on voit le dessus, le caillé blanc
    cx, cy, r = 24.5, 40.5, 2.6
    for y in range(int(cy - 2), SEU0 + 1):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx = (x + 0.5 - cx) / r
            if abs(dx) > 1:
                continue
            bord = 1.3 * math.sqrt(max(0.0, 1 - dx * dx))
            if (y + 0.5 - cy) ** 2 <= bord * bord:
                inner = abs(dx) < 0.72 and abs(y + 0.5 - cy) < bord * 0.7
                t.put(x, y, ton(CAILLE, 0.70 + 0.2 * (1 - dx) / 2 + 0.04 * bruit(x, y, 191)) if inner else ton(CHENE[1], 0.74 - 0.24 * (dx + 1) / 2))
            elif y + 0.5 > cy:
                lum = 0.48 - 0.26 * (dx + 1) / 2 - (0.10 if (x % 2) else 0) + 0.03 * bruit(x, y, 193)
                t.put(x, y, ton(CHENE[1], lum))
    # le cercle de fer du seau
    for x in range(int(cx - r), int(cx + r) + 1):
        t.put(x, int(cy) + 2, ton(FONTE, 0.56 - 0.3 * (x - cx + r) / (2 * r)))
    # la brosse à croûte, posée sur le sol, à gauche
    for x in range(7, 12):
        t.put(x, 40, ton(CHENE[0], 0.80 - 0.05 * (x - 7)))
        t.put(x, 41, ton(SAPIN[0], 0.46 if x % 2 else 0.60))
    return contour(t.im, OUT)


# ---------- les enseignes : la planche de la forge (forge.py), d'autres coiffes, d'autres emblèmes ----------

def coiffe_scie(t):
    """Une scie égoïne découpée dans la tôle : la lame (le dos clair, les dents), la poignée de chêne à droite."""
    for x in range(10, 23):
        f = (x - 10) / 12
        h = int(round(1 + 3 * f))
        for y in range(6 - h, 7):
            dessus = y == 6 - h
            t.put(x, y, ton(ACIER, (0.88 if dessus else 0.52 - 0.12 * f) + 0.04 * bruit(x, y, 201)))
        if x % 2 == 0:
            t.put(x, 6, ton(ACIER, 0.30))                                 # les dents
    for y in range(1, 7):
        for x in range(23, 27):
            if (x, y) in ((25, 3), (25, 4)):
                continue                                                  # le jour de la poignée
            t.put(x, y, ton(CHENE[0], 0.74 - 0.10 * (x - 23) - 0.04 * (y - 1) + 0.03 * bruit(x, y, 203)))


def embleme_rabot(t):
    """Peint sous le nom : un rabot (son fût, sa poignée, la lame) et un copeau qui s'enroule."""
    for y in range(25, 28):
        for x in range(12, 20):
            t.put(x, y, ton(NOIR, 0.52 - 0.28 * (x - 12) / 7 - 0.06 * (y - 25) + 0.04 * bruit(x, y, 205)))
    t.put(14, 24, ton(NOIR, 0.4)); t.put(15, 24, ton(NOIR, 0.32)); t.put(17, 24, ton(ACIER, 0.5))
    for (x, y) in ((21, 26), (22, 25), (23, 26), (22, 27)):
        t.put(x, y, ton(COPEAU, 0.40))


def coiffe_croissant(t):
    """Un croissant de laiton doré : un croissant de lune dodu, ses côtes, le dessus du métal au jour."""
    cx, cy = 18.0, 4.2
    for y in range(0, 8):
        for x in range(cx.__int__() - 7, int(cx) + 8):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            dans = (dx / 6.6) ** 2 + (dy / 3.6) ** 2 <= 1
            creux = (dx / 4.4) ** 2 + ((dy + 2.6) / 2.6) ** 2 <= 1
            if not dans or creux:
                continue
            lum = 0.78 - 0.26 * (dy / 3.6) - 0.20 * (dx / 6.6) + 0.05 * bruit(x, y, 207)
            if int(dx + 7) % 3 == 0:
                lum -= 0.16                                               # les côtes
            t.put(x, y, ton(OR, lum))


def embleme_miche(t):
    """Peint sous le nom : une miche grignée et deux épis."""
    for y in range(24, 28):
        for x in range(13, 21):
            e = ((x + 0.5 - 17) / 4.2) ** 2 + ((y + 0.5 - 26) / 2.2) ** 2
            if e > 1:
                continue
            lum = 0.62 - 0.30 * (x - 13) / 7 - 0.10 * (y - 24) + 0.04 * bruit(x, y, 209)
            if y == 25 and 15 <= x <= 18:
                lum += 0.22
            t.put(x, y, ton(MIE[0], lum))
    for (x, y) in ((10, 27), (11, 26), (11, 25), (23, 27), (22, 26), (22, 25)):
        t.put(x, y, ton(OR, 0.5))


def coiffe_meule(t):
    """Une meule de fromage découpée, peinte : son dessus (une ellipse), son flanc ; une part ôtée."""
    cx, yd, r = 18, 3.0, 5.0
    for y in range(0, 7):
        for x in range(cx - 6, cx + 7):
            dx = (x + 0.5 - cx) / r
            if abs(dx) > 1:
                continue
            b = 1.8 * math.sqrt(max(0.0, 1 - dx * dx))
            dessus = abs(y + 0.5 - yd) <= b
            flanc = yd < y + 0.5 <= yd + b + 3 and not dessus
            if not (dessus or flanc):
                continue
            if dx > 0.2 and y + 0.5 < yd + 0.6 * (x + 0.5 - cx):
                t.put(x, y, ton(PATE, 0.80 - 0.1 * dx))
                continue
            lum = (0.82 - 0.24 * dx if dessus else 0.48 - 0.26 * dx) + 0.04 * bruit(x, y, 211)
            t.put(x, y, ton(CROUTE[1], lum))


def embleme_part(t):
    """Peint sous le nom : une part de fromage, ses trous."""
    for y in range(24, 28):
        for x in range(13, 22):
            if x - 13 < (y - 24) * 2 + 1 or x > 21:
                continue
            lum = 0.80 - 0.26 * (x - 13) / 8 - 0.10 * (y - 24) + 0.04 * bruit(x, y, 213)
            t.put(x, y, ton(PATE, lum - (0.30 if (x, y) in ((17, 26), (20, 25)) else 0)))
    for x in range(13, 22):
        t.put(x, 28, ton(CROUTE[1], 0.40 - 0.2 * (x - 13) / 8))


def main():
    images = {
        'scie_long': scie_long(),
        'four_boulanger': four_boulanger('eteint'),
        'four_boulanger_feu_0': four_boulanger('feu_0'),
        'four_boulanger_feu_1': four_boulanger('feu_1'),
        'four_boulanger_feu_2': four_boulanger('feu_2'),
        'four_boulanger_feu_3': four_boulanger('feu_3'),
        'cave_affinage': cave_affinage(),
        'enseigne_scierie': enseigne(coiffe_scie, embleme_rabot, PEINTE),
        'enseigne_boulangerie': enseigne(coiffe_croissant, embleme_miche),
        'enseigne_fromagerie': enseigne(coiffe_meule, embleme_part, PEINTE),
    }
    for nom, im in images.items():
        im.save(os.path.join(ASSETS, f'meuble_{nom}.png'), optimize=True)
        print(f'{nom} : {im.width} × {im.height}, {couleurs(im)} couleurs')
    if '--apercu' in sys.argv:
        dossier = sys.argv[sys.argv.index('--apercu') + 1] if len(sys.argv) > sys.argv.index('--apercu') + 1 else '.'
        L = list(images.values())
        ap = Image.new('RGBA', (sum(i.width for i in L) + 8 * (len(L) + 1), max(i.height for i in L) + 16), (0, 0, 0, 255))
        px = ap.load()
        for y in range(ap.height):
            for x in range(ap.width):
                px[x, y] = (150, 112, 74, 255) if (x // 4 + y // 16) % 2 else (140, 104, 70, 255)
        x = 8
        for im in L:
            ap.alpha_composite(im, (x, ap.height - 8 - im.height))
            x += im.width + 8
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(dossier, 'apercu_commerces.png'))


if __name__ == '__main__':
    main()
