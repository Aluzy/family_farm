# La forge (le chantier « l'île à bâtir », fiche I5a : data/recipes.json ATELIER.BLOCS enclume_foyer, comptoir,
# enseigne_forge ; le moteur : js/engine/artisans.js). Trois dessins, vus de haut à 45° (CLAUDE.md ; la projection de
# scripts/carte/blocs.py : une hauteur de h px sur h × 14/16 rangées, une profondeur de p px sur p × 10/16) ; le bas de
# l'image est le bas de la case, ce qui monte empiète sur la case du dessus ; la lumière en haut à gauche, un contour
# sombre d'un pixel ; pas d'ombre portée (des blocs de la ferme : la scène peint celle du soleil).
#
#   - l'enclume et son foyer (l'établi de la forge, dans la pièce ; deux cases de large, 32 × 46) :
#       le foyer de maçonnerie à gauche : sa face de pierres (chacune sa nuance, son biseau), 12 px de haut (10
#       rangées de face) ; son dessus, une margelle de pierres de taille (9 rangées : 14 px de profondeur) creusée de la
#       cuvette du feu, dont on voit le fond (le lit de charbon, plus clair vers l'avant), la paroi gauche éclairée, la
#       droite dans l'ombre, et la paroi du fond ; derrière, la cheminée de briques qui monte (sa face, son chapeau
#       dont on voit le dessus et le conduit), la gueule de la cheminée au-dessus du feu ; le soufflet de cuir posé
#       sur la margelle ; à droite, le billot de chêne (sa face d'écorce, son dessus aux cernes) et l'enclume (le
#       dessus d'acier poli, le plus clair, la bigorne vers la gauche, la face plus sombre, le pied évasé), le marteau
#       posé dessus ;
#       éteint (enclume_foyer) : des cendres grises, un reste de rouge ; allumé (enclume_foyer_braise_0 et _1, les
#       deux images qui alternent quand le commerce est ouvert) : les braises (du rouge sombre au jaune), leur lumière
#       qui teinte la margelle, la gueule de la cheminée et le flanc gauche de l'enclume ;
#   - le comptoir (dans la pièce d'un commerce, deux cases de large, 32 × 26) : la face à deux panneaux encadrés
#       (12 rangées), le plateau de planches (10 rangées de dessus, plus clair vers l'avant), la clochette de laiton, le
#       registre ouvert, la sébile de pièces ;
#   - l'enseigne du forgeron (dehors, près de la porte, deux cases de large, 32 × 46) : le poteau de chêne sur son socle
#       de pierre (le dessus de chacun), la potence de fer forgé, l'enclume de fer découpée qui la coiffe, la planche
#       pendue à ses chaînes (sa tranche du dessus raccourcie, sa face claire où la scène écrit le nom du commerce,
#       chantier.js stepEnseignes : BLOCS_CARTE.enseigne « commerce »), une enclume peinte sous le nom.
#
#   python3 scripts/batiments/forge.py            écrit assets/meuble_enclume_foyer.png, _braise_0, _braise_1,
#                                                 meuble_comptoir.png, meuble_enseigne_forge.png (et compte leurs couleurs)
#   python3 scripts/batiments/forge.py --apercu D écrit aussi D/apercu_forge.png (agrandi, sur le plancher et l'herbe)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (26, 18, 20)

# ---------- les matières : des rampes proches, qui glissent du froid (l'ombre) au chaud (la lumière) ----------

PIERRES = [rampe([(30, 30, 44), (62, 60, 72), (98, 92, 96), (138, 128, 122), (176, 164, 150), (214, 204, 184)], 160),
           rampe([(34, 30, 40), (68, 60, 64), (106, 94, 88), (146, 130, 114), (184, 168, 142), (220, 206, 176)], 160),
           rampe([(28, 32, 46), (58, 64, 78), (92, 98, 106), (130, 134, 134), (170, 172, 164), (208, 208, 194)], 160),
           rampe([(36, 30, 36), (72, 60, 60), (112, 92, 84), (152, 126, 106), (192, 164, 134), (226, 202, 170)], 160)]
BRIQUES = [rampe([(40, 16, 26), (82, 30, 34), (126, 50, 40), (166, 76, 52), (202, 112, 76), (232, 156, 112)], 160),
           rampe([(44, 18, 22), (90, 36, 30), (134, 58, 38), (174, 86, 50), (208, 124, 74), (236, 168, 112)], 160),
           rampe([(36, 18, 30), (76, 32, 40), (118, 52, 48), (158, 80, 60), (196, 116, 84), (228, 160, 122)], 160)]
JOINT = rampe([(30, 28, 36), (62, 58, 62), (100, 94, 92), (140, 132, 124), (178, 170, 156)], 100)
CHENE = [rampe([(30, 20, 24), (62, 40, 34), (98, 66, 46), (136, 94, 62), (176, 128, 84), (214, 168, 116)], 160),
         rampe([(28, 22, 30), (58, 44, 42), (94, 70, 54), (132, 100, 70), (172, 136, 94), (210, 178, 128)], 160),
         rampe([(34, 20, 22), (70, 40, 32), (108, 66, 42), (148, 94, 56), (188, 130, 78), (224, 172, 112)], 160)]
ECORCE = rampe([(22, 18, 22), (46, 36, 34), (74, 58, 48), (104, 82, 62), (136, 110, 82), (168, 140, 106)], 140)
CERNES = rampe([(70, 44, 28), (118, 80, 46), (162, 118, 70), (200, 158, 102), (230, 196, 140), (248, 226, 180)], 140)
ACIER = rampe([(14, 16, 26), (34, 38, 52), (62, 66, 80), (98, 102, 112), (140, 144, 150), (186, 190, 192), (228, 230, 228)], 180)
FONTE = rampe([(12, 12, 20), (28, 28, 38), (48, 48, 58), (72, 72, 80), (100, 100, 106), (132, 130, 132)], 140)
CUIR = rampe([(30, 16, 14), (66, 34, 22), (106, 58, 32), (146, 88, 46), (184, 124, 68), (216, 164, 104)], 140)
CENDRE = rampe([(26, 26, 32), (52, 50, 54), (84, 80, 80), (118, 112, 108), (154, 148, 140), (186, 180, 170)], 120)
BRAISE = rampe([(36, 6, 10), (92, 12, 10), (156, 30, 12), (210, 66, 16), (244, 124, 30), (255, 188, 64), (255, 236, 150)], 180)
CHARBON = rampe([(10, 8, 14), (24, 20, 26), (40, 34, 40), (58, 50, 54), (78, 70, 70)], 80)
EAU = rampe([(14, 26, 44), (24, 48, 72), (38, 74, 98), (60, 104, 124), (96, 140, 152), (150, 186, 192), (210, 232, 232)], 160)
DOUELLE = rampe([(34, 22, 22), (70, 46, 36), (110, 74, 50), (150, 104, 66), (190, 140, 90), (224, 180, 128)], 140)
LAITON = rampe([(48, 30, 8), (100, 66, 14), (154, 108, 26), (204, 158, 52), (236, 204, 104), (252, 238, 176)], 140)
PAPIER = rampe([(108, 98, 92), (156, 146, 132), (198, 188, 166), (226, 218, 194), (246, 240, 220)], 100)
ENCRE = rampe([(20, 18, 30), (46, 40, 54), (76, 68, 80)], 30)
PEINTURE = rampe([(46, 22, 18), (98, 50, 30), (150, 86, 46), (198, 132, 72), (234, 182, 110), (250, 224, 166)], 140)
NOIR = rampe([(8, 8, 14), (20, 20, 28), (36, 36, 44), (56, 56, 62)], 40)


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def teinter(self, x, y, c, f):
        """La lumière d'une source (le feu) sur ce qui est déjà peint : mêlée de `f`."""
        p = self.get(x, y)
        if p[3] and f > 0:
            self.put(x, y, melange(p[:3], c, min(1.0, f)))


def melange(c, d, f):
    return tuple(round(c[i] * (1 - f) + d[i] * f) for i in range(3))


def maconnerie(t, x0, x1, y0, y1, lignes, ramps, graine, decal=0, lum0=0.56, pente=0.22, lit=True, joints=True):
    """Un pan de maçonnerie (une face) : des rangs de `lignes` px, des blocs décalés d'un rang à l'autre, chacun sa
    rampe, sa nuance, son biseau (le haut et la gauche clairs, le bas et la droite sombres) ; plus sombre vers la
    droite (la lumière vient de la gauche) et vers le pied (`lit` : l'occlusion au pied)."""
    rang = 0
    y = y0
    while y <= y1:
        hb = min(lignes, y1 - y + 1)
        larg = 6 if rang % 2 == 0 else 5
        x = x0 - ((rang * 3 + decal) % larg)
        k = 0
        while x <= x1:
            xa, xb = max(x0, x), min(x1, x + larg - 1)
            R = ramps[(rang * 5 + k * 3 + graine) % len(ramps)]
            dk = 0.07 * bruit(k + 3 * rang, graine, 7)
            for yy in range(y, y + hb):
                for xx in range(xa, xb + 1):
                    u = (xx - x0) / max(1, x1 - x0)
                    g = (yy - y0) / max(1, y1 - y0)
                    lum = lum0 - pente * u + dk + 0.035 * bruit(xx, yy, graine + 11)
                    if lit:
                        lum -= 0.18 * g * g
                    if xx == x and joints:
                        lum = -1                                   # le joint vertical
                    elif yy == y and joints:
                        lum = -1                                   # le joint horizontal
                    elif yy == y + 1 or xx == x + 1:
                        lum += 0.10                                # le biseau : le haut et la gauche au jour
                    elif yy == y + hb - 1 or xx == x + larg - 1:
                        lum -= 0.10                                # le bas et la droite dans l'ombre
                    if lum < 0:
                        t.put(xx, yy, ton(JOINT, 0.36 - 0.2 * u - 0.12 * g + 0.05 * bruit(xx, yy, graine + 3)))
                    else:
                        t.put(xx, yy, ton(R, lum))
            x += larg
            k += 1
        y += hb
        rang += 1


# ---------- l'enclume et son foyer ----------

EW, EH = 32, 46
# le foyer : x 1 à 17 ; sa face, y 36 à 45 (10 rangées : 12 px de haut) ; sa margelle, y 27 à 35 (9 rangées : 14 px
# de profondeur) ; la cuvette du feu dans la margelle (x 5 à 13, y 29 à 34) ; la cheminée au fond (x 3 à 14, du
# chapeau, y 2, au dessus de la margelle, y 27)
FX0, FX1 = 1, 17
FACE0, FACE1 = 36, 45
MARG0, MARG1 = 27, 35
CUV = (5, 13, 29, 34)
CHX0, CHX1, CHY0 = 3, 14, 3


def foyer(t, etat):
    """Le foyer de maçonnerie : la face de pierres, la margelle, la cuvette du feu (vue d'en haut), la cheminée."""
    # la face : des pierres en rangs de 3 px (le biseau, l'occlusion au pied)
    maconnerie(t, FX0, FX1, FACE0, FACE1, 3, PIERRES, 3, decal=1, lum0=0.54, pente=0.24)
    # la margelle : de grandes pierres de taille, leur dessus (le plus clair), plus claires vers l'avant
    pierres = [(FX0, 8, MARG0, MARG1, 0), (9, FX1, MARG0, MARG0 + 3, 1), (9, FX1, MARG0 + 4, MARG1, 2)]
    for xa, xb, ya, yb, ri in pierres:
        R = PIERRES[(ri + 2) % len(PIERRES)]
        for y in range(ya, yb + 1):
            for x in range(xa, xb + 1):
                u = (x - FX0) / (FX1 - FX0)
                v = (y - MARG0) / (MARG1 - MARG0)
                lum = 0.66 + 0.22 * v - 0.20 * u + 0.04 * bruit(x, y, 13 + ri)
                if x == xa or y == ya:
                    lum += 0.08 if x != FX0 else 0.12
                if x == xb or y == yb:
                    lum -= 0.12
                if y == MARG1:
                    lum = 0.92 - 0.24 * u                           # l'arête avant, au soleil
                t.put(x, y, ton(R, lum))
    # l'arête gauche du foyer (éclairée), la droite (dans l'ombre)
    for y in range(MARG0, FACE1 + 1):
        t.put(FX0, y, ton(PIERRES[0], 0.78 if y <= MARG1 else 0.62 - 0.2 * (y - FACE0) / 9))
        t.put(FX1, y, ton(PIERRES[2], 0.30 if y <= MARG1 else 0.18))
    # la cuvette du feu : la paroi du fond (sa face, qui regarde vers nous), le fond (le lit de charbon ou de cendre),
    # la paroi gauche éclairée, la droite dans l'ombre
    x0, x1, y0, y1 = CUV
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            v = (y - y0) / (y1 - y0)
            if y <= y0 + 1:                                         # la paroi du fond
                lum = 0.32 - 0.12 * (x - x0) / (x1 - x0) + 0.04 * bruit(x, y, 17)
                t.put(x, y, ton(PIERRES[1], lum))
                continue
            if x == x0:                                             # la paroi gauche, éclairée
                t.put(x, y, ton(PIERRES[3], 0.52 - 0.1 * v))
                continue
            if x == x1:                                             # la paroi droite, dans l'ombre
                t.put(x, y, ton(PIERRES[2], 0.14 + 0.04 * v))
                continue
            # le fond : plus clair vers l'avant
            if etat == 'eteint':
                lum = 0.26 + 0.34 * v - 0.10 * (x - x0) / (x1 - x0) + 0.10 * bruit(x, y, 19)
                t.put(x, y, ton(CENDRE, lum))
            else:
                t.put(x, y, ton(CHARBON, 0.3 + 0.4 * v + 0.2 * bruit(x, y, 20)))
    # le feu : des braises (deux images qui alternent), ou un reste de rouge dans la cendre
    if etat == 'eteint':
        for (x, y) in ((8, 32), (10, 33), (9, 33)):
            t.put(x, y, ton(BRAISE, 0.24 + 0.06 * bruit(x, y, 21)))
    else:
        k = 0 if etat == 'braise_0' else 1
        cx, cy = (x0 + x1) / 2 + (0.6 if k else -0.4), y0 + 3.6
        for y in range(y0 + 2, y1 + 1):
            for x in range(x0 + 1, x1):
                d = math.hypot((x - cx) / 3.6, (y - cy) / 2.2)
                b = 0.5 + 0.5 * bruit(x * 3 + k * 7, y * 5 + k * 3, 23)
                chaud = max(0.0, 1.0 - d) * 0.75 + 0.35 * b - 0.06 * ((x + y + k) % 3 == 0)
                if chaud > 0.18:
                    t.put(x, y, ton(BRAISE, 0.20 + chaud * 0.82))
    # la cheminée de briques, au fond : sa face (la gueule au-dessus du feu), son chapeau (son dessus, le conduit)
    maconnerie(t, CHX0, CHX1, CHY0 + 3, MARG0 - 1, 2, BRIQUES, 5, decal=0, lum0=0.52, pente=0.24, lit=False)
    for y in range(CHY0 + 3, MARG0):
        t.put(CHX0, y, ton(BRIQUES[0], 0.66))                       # l'arête gauche, au jour
        t.put(CHX1, y, ton(BRIQUES[2], 0.18))                       # la droite, dans l'ombre
    # la gueule : un arc sombre au bas de la face, au-dessus de la cuvette
    for y in range(MARG0 - 6, MARG0):
        for x in range(CHX0 + 3, CHX1 - 2):
            dx = (x - (CHX0 + CHX1) / 2) / 3.6
            if dx * dx + ((y - (MARG0 - 1)) / 5.2) ** 2 <= 1.0:
                v = (y - (MARG0 - 6)) / 5
                t.put(x, y, ton(NOIR, 0.2 + 0.5 * v + 0.1 * bruit(x, y, 27)))
    # le chapeau : une dalle qui déborde (son dessus, sa tranche), le conduit noir dedans
    for y in range(CHY0, CHY0 + 3):
        for x in range(CHX0 - 1, CHX1 + 2):
            u = (x - CHX0 + 1) / (CHX1 - CHX0 + 2)
            if y < CHY0 + 2:
                lum = 0.70 + 0.12 * (y - CHY0) - 0.24 * u + 0.04 * bruit(x, y, 29)
            else:
                lum = 0.40 - 0.18 * u
            t.put(x, y, ton(PIERRES[0], lum))
    for x in range(CHX0 + 3, CHX1 - 2):
        t.put(x, CHY0, ton(NOIR, 0.3 + 0.1 * bruit(x, 0, 31)))
        t.put(x, CHY0 + 1, ton(NOIR, 0.15))


def soufflet(t):
    """Le soufflet de cuir posé sur la margelle, à gauche : ses deux planchettes (le dessus clair), le cuir plissé,
    la buse de fer tournée vers le feu."""
    xa, ya = 2, 31
    for y in range(ya, ya + 4):
        for x in range(xa, xa + 3):
            plis = (y - ya) % 2 == 1
            lum = 0.62 - 0.14 * (x - xa) - 0.10 * (y - ya) + (-0.12 if plis else 0.04) + 0.04 * bruit(x, y, 33)
            t.put(x, y, ton(CUIR, lum))
    for y in range(ya, ya + 4):
        t.put(xa - 1 + 0, y, ton(CHENE[1], 0.72 - 0.06 * (y - ya)))     # la planchette, sa tranche éclairée
    t.put(xa + 3, ya + 1, ton(FONTE, 0.6)); t.put(xa + 4, ya + 2, ton(FONTE, 0.4))


def billot_enclume(t, lueur):
    """Le billot de chêne (x 19 à 30) et l'enclume (le dessus poli, la bigorne vers la gauche, la face, la taille, le
    pied évasé) ; le marteau posé ; `lueur` : la lumière du feu sur son flanc gauche."""
    # le billot : sa face d'écorce (y 38 à 45 : 8 rangées, 9 px de haut), son dessus aux cernes (y 33 à 37)
    bx0, bx1, cx = 19, 30, 24.5
    for y in range(38, EH):
        for x in range(bx0, bx1 + 1):
            u = (x - bx0) / (bx1 - bx0)
            lum = 0.62 - 0.40 * u + 0.08 * math.sin(u * math.pi) - 0.16 * ((y - 38) / 7) ** 2 + 0.06 * bruit(x, y // 2, 35)
            if (x * 3 + y) % 7 == 0:
                lum -= 0.12                                          # les sillons de l'écorce
            t.put(x, y, ton(ECORCE, lum))
    for y in range(33, 38):
        for x in range(bx0, bx1 + 1):
            e = ((x - cx) / 6.0) ** 2 + ((y - 35.5) / 2.6) ** 2
            if e > 1.05:
                continue
            r = math.sqrt(e)
            lum = 0.78 - 0.22 * (x - bx0) / (bx1 - bx0) + 0.10 * (y - 33) / 4 - (0.10 if int(r * 4) % 2 else 0) + 0.03 * bruit(x, y, 36)
            if r > 0.86:
                lum = 0.52 - 0.2 * (x - bx0) / (bx1 - bx0)          # l'aubier, le bord du dessus
            t.put(x, y, ton(CERNES, lum))
    # l'enclume, de bas en haut : le pied évasé posé sur le billot (y 33 à 34), la taille (y 30 à 32), le corps (sa
    # face, y 27 à 29), le dessus d'acier poli (y 23 à 26 : 5 px de profondeur), la bigorne vers la gauche
    for y, (xa, xb) in ((34, (20, 29)), (33, (21, 28)), (32, (22, 27)), (31, (23, 26)), (30, (23, 26))):
        for x in range(xa, xb + 1):
            u = (x - xa) / max(1, xb - xa)
            lum = 0.50 - 0.34 * u - (0.10 if y >= 33 else 0) + 0.03 * bruit(x, y, 37)
            if x == xa:
                lum += 0.12
            t.put(x, y, ton(ACIER, lum))
    for y in range(27, 30):
        for x in range(19, 31):
            u = (x - 19) / 11
            lum = 0.58 - 0.34 * u - 0.05 * (y - 27) + 0.03 * bruit(x, y, 39)
            if x == 19:
                lum += 0.12
            if y == 29:
                lum -= 0.10                                          # le dessous du corps, avant la taille
            t.put(x, y, ton(ACIER, lum))
    for y in range(23, 27):
        for x in range(18, 31):
            u = (x - 18) / 12
            v = (y - 23) / 3
            lum = 0.80 + 0.12 * v - 0.20 * u + 0.03 * bruit(x, y, 41)
            if y == 26:
                lum = 0.99 - 0.18 * u                                # l'arête avant, polie
            if x == 30:
                lum -= 0.16
            t.put(x, y, ton(ACIER, lum))
    # la bigorne : un cône vers la gauche (x 13 à 17), son dessus clair, son dessous dans l'ombre
    for x in range(13, 18):
        f = (18 - x) / 5
        ya, yb = int(round(23 + 1.6 * f)), int(round(28 - 2.4 * f))
        for y in range(ya, yb + 1):
            dessus = y <= ya + 1
            lum = (0.88 - 0.06 * f if dessus else 0.46 - 0.10 * (y - ya - 2)) + 0.03 * bruit(x, y, 43)
            t.put(x, y, ton(ACIER, lum))
    # le trou carré (le trou de la tranche) ; le marteau posé en travers (le manche de chêne, la tête de fer)
    t.put(28, 24, ton(ACIER, 0.16)); t.put(28, 25, ton(ACIER, 0.30))
    for x in range(21, 27):
        t.put(x, 23, ton(CHENE[2], 0.84 - 0.08 * (x - 21)))          # le manche, son dessus
        t.put(x, 24, ton(CHENE[2], 0.46 - 0.05 * (x - 21)))
    for y in range(21, 25):
        for x in (26, 27, 28):
            t.put(x, y, ton(FONTE, (0.80, 0.56, 0.32)[x - 26] - 0.08 * (y - 21)))
    # la lumière du feu sur son flanc gauche (la bigorne, le corps), qui s'éteint vers la droite
    if lueur:
        for y in range(21, 35):
            for x in range(13, 23):
                t.teinter(x, y, (255, 140, 56), lueur * 0.42 * max(0.0, 1 - (x - 13) / 10) ** 1.5)


def lumiere_du_feu(t, f):
    """La lumière des braises sur ce qui entoure la cuvette : la margelle, la gueule de la cheminée."""
    cx, cy = (CUV[0] + CUV[1]) / 2, CUV[2] + 3
    for y in range(MARG0 - 7, FACE0 + 2):
        for x in range(FX0, FX1 + 1):
            if CUV[0] < x < CUV[1] and CUV[2] + 1 < y <= CUV[3]:
                continue
            d = math.hypot((x - cx) / 7.5, (y - cy) / 5.0)
            if d < 1:
                t.teinter(x, y, (255, 126, 44), f * (1 - d) * 0.62)


def enclume_foyer(etat):
    t = Toile(EW, EH)
    foyer(t, etat)
    soufflet(t)
    allume = etat != 'eteint'
    f = 0.0 if not allume else (1.0 if etat == 'braise_0' else 0.82)
    if allume:
        lumiere_du_feu(t, f)
    billot_enclume(t, f)
    return contour(t.im, OUT)


# ---------- le comptoir ----------

CW, CH = 32, 26
CT0, CT1 = 4, 13             # le plateau (10 rangées : toute la profondeur de la case)
CF0, CF1 = 14, 25            # la face (12 rangées : 14 px de haut)


def comptoir():
    t = Toile(CW, CH)
    # la face : un cadre de chêne (montants, traverses) et deux panneaux en retrait (plus sombres en haut, sous la
    # moulure : l'occlusion), chacun sa nuance
    for y in range(CF0, CF1 + 1):
        for x in range(1, CW - 1):
            u = (x - 1) / (CW - 3)
            g = (y - CF0) / (CF1 - CF0)
            montant = x in (1, 2, 15, 16, 29, 30) or y in (CF0, CF0 + 1, CF1 - 1, CF1)
            if montant:
                R = CHENE[0]
                lum = 0.62 - 0.30 * u - 0.10 * g + 0.04 * bruit(x, y, 51)
                if x in (1, 15, 29) or y == CF0:
                    lum += 0.10
                if x in (2, 16, 30) or y == CF1:
                    lum -= 0.08
                if y == CF1:
                    lum -= 0.10                                     # le pied, l'occlusion
            else:
                R = CHENE[1 if x < 15 else 2]
                lum = 0.44 - 0.24 * u + 0.10 * g + 0.04 * bruit(x, y // 2, 53)
                if y == CF0 + 2:
                    lum -= 0.14                                     # sous la moulure
                if x in (3, 17):
                    lum -= 0.10                                     # le retrait du panneau, côté gauche
                if x in (14, 28):
                    lum += 0.08                                     # sa feuillure, au jour
                if (x * 5 + y) % 9 == 0:
                    lum -= 0.06                                     # le fil du bois
            t.put(x, y, ton(R, lum))
    # le plateau : quatre planches en long (chacune son bois), plus claires vers l'avant ; le chant avant au soleil
    planches = ((CT0, CT0 + 1, 2), (CT0 + 2, CT0 + 4, 0), (CT0 + 5, CT0 + 7, 1), (CT0 + 8, CT1, 2))
    for ya, yb, ri in planches:
        for y in range(ya, yb + 1):
            for x in range(1, CW - 1):
                u = (x - 1) / (CW - 3)
                v = (y - CT0) / (CT1 - CT0)
                lum = 0.60 + 0.26 * v - 0.22 * u + 0.04 * bruit(x // 3, y, 55 + ri) - 0.05 * ((x * 7 + y * 3) % 13 == 0)
                if y == ya:
                    lum -= 0.13                                     # le joint
                if y == CT1:
                    lum = 0.94 - 0.24 * u
                if x == 1:
                    lum += 0.06
                if x == CW - 2:
                    lum -= 0.12
                t.put(x, y, ton(CHENE[ri], lum))
    # le registre ouvert (ses deux pages, la reliure, des lignes d'encre)
    for y in range(CT0 + 2, CT0 + 7):
        for x in range(4, 12):
            reliure = x in (7, 8)
            lum = 0.80 - 0.18 * (x - 4) / 7 + 0.06 * (y - CT0 - 2) / 4 - (0.20 if reliure else 0) + 0.03 * bruit(x, y, 57)
            t.put(x, y, ton(PAPIER, lum))
        if y % 2 == 1:
            for x in (5, 6, 9, 10):
                t.put(x, y, ton(ENCRE, 0.5 + 0.3 * bruit(x, y, 58)))
    for x in range(3, 13):
        t.put(x, CT0 + 7, ton(CUIR, 0.40 - 0.2 * (x - 3) / 9))          # la tranche de la couverture
    # la sébile de pièces (un bol de bois, les pièces vues d'en haut, leur reflet)
    for y in range(CT0 + 3, CT0 + 8):
        for x in range(16, 22):
            e = ((x - 18.5) / 3.0) ** 2 + ((y - (CT0 + 5)) / 2.2) ** 2
            if e > 1:
                continue
            if e > 0.55:
                t.put(x, y, ton(CHENE[2], 0.78 - 0.3 * (x - 16) / 5 - 0.2 * (y > CT0 + 5)))
            else:
                t.put(x, y, ton(LAITON, 0.62 + 0.3 * bruit(x * 2, y * 3, 59)))
    t.put(17, CT0 + 4, ton(LAITON, 0.98))
    # la clochette de laiton (le dôme modelé, son reflet, le bouton)
    bx, by = 26, CT0 + 3
    for y in range(by, by + 4):
        for x in range(bx - 2, bx + 3):
            e = ((x - bx) / 2.5) ** 2 + ((y - (by + 3)) / 3.2) ** 2
            if e > 1:
                continue
            lum = 0.80 - 0.22 * (x - bx + 2) / 4 - 0.12 * (y - by) / 3 + 0.03 * bruit(x, y, 61)
            t.put(x, y, ton(LAITON, lum))
    t.put(bx - 1, by + 1, ton(LAITON, 1.0)); t.put(bx, by - 1, ton(LAITON, 0.5)); t.put(bx, by - 2, ton(LAITON, 0.8))
    for x in range(bx - 3, bx + 4):
        t.put(x, by + 4, ton(CHENE[0], 0.30))                       # son pied, l'occlusion
    return contour(t.im, OUT)


# ---------- l'enseigne du forgeron ----------

NW, NH = 32, 46
PANNEAU = (5, 29, 16, 28)    # la face de la planche : x 5 à 29, y 16 à 28 (le nom, y 17 à 23 ; l'enclume peinte dessous)


def coiffe_enclume(t):
    """L'enclume découpée qui coiffe la potence (au milieu) : le dessus clair, la face sombre, la bigorne."""
    ax = 18
    for y in range(1, 7):
        for x in range(ax - 6, ax + 6):
            dessus = y <= 2
            corps = 3 <= y <= 4 and ax - 3 <= x <= ax + 5
            pied = y >= 5 and ax - 1 <= x <= ax + 3 + (y - 5)
            bigorne = y in (1, 2) and x < ax - 3 and x >= ax - 6 + (2 - y) * 0
            haut = y in (1, 2) and ax - 3 <= x <= ax + 5
            if not (haut or corps or pied or bigorne):
                continue
            u = (x - (ax - 6)) / 11
            lum = (0.80 if dessus else 0.40) - 0.24 * u + 0.04 * bruit(x, y, 69)
            t.put(x, y, ton(ACIER, lum))


def embleme_enclume(t):
    """Sous le nom (écrit au-dessus, y 17 à 23) : une enclume peinte en noir, sa bigorne vers la gauche."""
    for (y, xa, xb) in ((25, 13, 21), (26, 15, 20), (27, 16, 19)):
        for x in range(xa, xb + 1):
            t.put(x, y, ton(NOIR, 0.55 - 0.3 * (x - xa) / max(1, xb - xa) + 0.05 * bruit(x, y, 75)))
    t.put(12, 25, ton(NOIR, 0.4)); t.put(15, 27, ton(NOIR, 0.3)); t.put(20, 27, ton(NOIR, 0.3))


def enseigne(coiffe=coiffe_enclume, embleme=embleme_enclume, peinture=None):
    """L'enseigne d'un commerce (le poteau, la potence, la planche où s'écrit le nom) : `coiffe` dessine ce qui coiffe
    la potence, `embleme` ce qui est peint sous le nom, `peinture` la rampe du fond de la planche (I5c :
    scripts/batiments/commerces.py, la scierie, la boulangerie, la fromagerie)."""
    peinture = peinture or PEINTURE
    t = Toile(NW, NH)
    # le socle de pierre (son dessus, sa face), au pied
    for y in range(39, NH):
        for x in range(0, 8):
            u = x / 7
            if y < 42:
                lum = 0.74 + 0.06 * (y - 39) - 0.24 * u + 0.04 * bruit(x, y, 63)
                R = PIERRES[1]
            else:
                lum = 0.50 - 0.28 * u - 0.10 * (y - 42) / 3 + 0.04 * bruit(x, y, 64)
                R = PIERRES[3 if x < 4 else 2]
                if y == 42:
                    lum -= 0.06
            t.put(x, y, ton(R, lum))
    # le poteau de chêne (x 2 à 5) : la face gauche au jour, la droite dans l'ombre, le fil ; son chapeau
    for y in range(4, 41):
        for x in range(2, 6):
            lum = (0.70, 0.56, 0.40, 0.26)[x - 2] + 0.04 * bruit(x, y // 2, 65) - 0.06 * ((y * 3 + x) % 8 == 0)
            if y >= 37:
                lum -= 0.12 * (y - 36) / 4                          # le pied, dans le socle
            t.put(x, y, ton(CHENE[0], lum))
    for x in range(1, 7):
        t.put(x, 3, ton(CHENE[1], 0.86 - 0.08 * x))                  # le dessus du chapeau
        t.put(x, 4, ton(CHENE[1], 0.42 - 0.04 * x))                  # sa tranche
    # la potence de fer forgé (y 7 à 8), sa volute, et son dessus
    for x in range(5, 31):
        t.put(x, 7, ton(FONTE, 0.74 - 0.30 * x / 31 + 0.04 * bruit(x, 7, 67)))
        t.put(x, 8, ton(FONTE, 0.34 - 0.14 * x / 31))
    for (x, y, l) in ((7, 9, 0.6), (8, 10, 0.5), (9, 11, 0.4), (10, 11, 0.32), (11, 10, 0.4), (11, 9, 0.5)):
        t.put(x, y, ton(FONTE, l))                                   # la volute sous l'équerre
    # ce qui coiffe la potence (la forge : l'enclume découpée)
    coiffe(t)
    # les chaînes (deux), de la potence à la planche
    for cx in (9, 25):
        for y in range(9, 15):
            t.put(cx, y, ton(FONTE, 0.70 if y % 2 else 0.36))
    # la planche : sa tranche du dessus (2 rangées), sa face (claire, où s'écrit le nom), son cadre peint
    x0, x1, y0, y1 = PANNEAU
    for y in (y0 - 2, y0 - 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            t.put(x, y, ton(CHENE[2], (0.86 if y == y0 - 2 else 0.74) - 0.24 * u + 0.03 * bruit(x, y, 71)))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            g = (y - y0) / (y1 - y0)
            cadre = x in (x0, x1) or y in (y0, y1)
            if cadre:
                lum = 0.50 - 0.22 * u - 0.10 * g + (0.10 if x == x0 or y == y0 else -0.06)
                t.put(x, y, ton(CHENE[0], lum + 0.03 * bruit(x, y, 72)))
            else:
                planche = (y - y0) // 4
                lum = 0.84 - 0.20 * u - 0.10 * g + 0.04 * bruit(x // 2, y, 73 + planche) - (0.10 if (y - y0) % 4 == 0 else 0)
                t.put(x, y, ton(peinture, lum))
    # la tranche du bas de la planche, dans l'ombre
    for x in range(x0, x1 + 1):
        t.put(x, y1 + 1, ton(CHENE[0], 0.24 - 0.1 * (x - x0) / (x1 - x0)))
    # sous le nom (écrit au-dessus, y 17 à 23) : l'emblème peint (la forge : une enclume)
    embleme(t)
    return contour(t.im, OUT)


def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def main():
    images = {
        'enclume_foyer': enclume_foyer('eteint'),
        'enclume_foyer_braise_0': enclume_foyer('braise_0'),
        'enclume_foyer_braise_1': enclume_foyer('braise_1'),
        'comptoir': comptoir(),
        'enseigne_forge': enseigne(),
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
        ap.resize((ap.width * 8, ap.height * 8), Image.NEAREST).save(os.path.join(dossier, 'apercu_forge.png'))


if __name__ == '__main__':
    main()
