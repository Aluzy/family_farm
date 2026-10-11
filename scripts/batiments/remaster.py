# Bâtiments de la carte redessinés dans le style des dessins faits en code (silo, puits, citerne,
# panneaux du toit, serre) : formes nettes, 3 à 4 teintes par matière, contour d'un pixel dans une
# teinte sombre de chaque matière, lumière en haut à gauche, pas de bruit ni de tramage.
#
# Chaque bâtiment garde la taille de son image d'origine (et le nombre de ses images) : il peut la
# remplacer sans toucher au placement sur la carte.
#   maison      93×97        house_sp.png (le versant droit du toit garde sa géométrie : les
#                            panneaux de panneaux_toit.png s'y posent toujours)
#   etable      104×93       barn_sp.png
#   poulailler  44×55 × 3    poulailler.png (porte fermée, entrouverte, ouverte)
#   moulin      96×128 × 4   windmill_sp.png (les ailes tournent d'un huitième de tour par image)
#
# Le script assemble aussi la planche de tous les bâtiments redessinés, avec ceux déjà faits en
# code (serre, silo, puits et pompe, citerne, panneaux du toit) :
#   assets/batiments_remaster.png    la planche
#   assets/batiments_remaster.json   nom → { x, y, w, h, images } (images côte à côte)
#
#   python3 scripts/batiments/serre.py && python3 scripts/batiments/remaster.py [--apercu]
#   (--apercu : écrit aussi apercu_batiments.png, la planche agrandie et légendée)
import json
import math
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')

# Palette commune : une matière = contour, ombre, moyen, clair, reflet.
P = {
    # bardeaux prune (maison, poulailler) : ceux du toit d'origine de la maison
    'rj': (60, 17, 35), 'rd': (72, 41, 62), 'rm': (96, 58, 80), 'rl': (116, 74, 98), 'rh': (138, 94, 118),
    # bardeaux bruns (étable, moulin)
    'bj': (46, 26, 20), 'bd': (82, 50, 34), 'bm': (110, 70, 46), 'bl': (138, 94, 60), 'bh': (166, 120, 80),
    # bois chaud (murs, poteaux, terrasse)
    'wo': (58, 30, 22), 'wd': (92, 52, 32), 'wm': (128, 78, 46), 'wl': (162, 106, 64), 'wh': (192, 136, 88),
    # bois sombre (portes)
    'do': (40, 20, 18), 'dd': (66, 34, 28), 'dm': (90, 50, 38), 'dl': (116, 70, 50),
    # crépi crème
    'co': (92, 70, 54), 'cd': (190, 168, 136), 'cm': (218, 202, 170), 'cl': (238, 228, 204),
    # verre
    'go': (36, 52, 66), 'gd': (112, 150, 170), 'gm': (150, 190, 204), 'gl': (196, 226, 232), 'gh': (236, 248, 248),
    # pierre (comme la margelle du puits)
    'so': (50, 40, 44), 'sj': (70, 64, 62), 'sd': (96, 92, 88), 'sm': (124, 120, 112), 'sl': (156, 152, 140), 'sh': (184, 180, 166),
    # feuillage
    'vo': (24, 52, 30), 'vd': (42, 90, 48), 'vm': (66, 124, 60), 'vl': (104, 160, 78), 'vh': (150, 196, 104),
    # toile des ailes du moulin
    'to': (92, 76, 58), 'td': (196, 182, 150), 'tm': (226, 214, 184), 'tl': (244, 236, 214),
    # intérieur sombre (ouvertures)
    'nn': (40, 22, 34), 'nd': (62, 34, 50),
    # laiton
    'yo': (74, 48, 20), 'ym': (200, 150, 60), 'yl': (244, 214, 120),
}


class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = (P[c] if isinstance(c, str) else c) + (255,)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def box(self, x0, y0, x1, y1, c):
        for x in range(x0, x1 + 1):
            self.put(x, y0, c)
            self.put(x, y1, c)
        for y in range(y0, y1 + 1):
            self.put(x0, y, c)
            self.put(x1, y, c)

    def hline(self, x0, x1, y, c):
        for x in range(x0, x1 + 1):
            self.put(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(y0, y1 + 1):
            self.put(x, y, c)

    def fill(self, inside, color):
        """Remplit les pixels où inside(x, y) ; color(x, y) donne la couleur."""
        for y in range(self.h):
            for x in range(self.w):
                if inside(x, y):
                    self.put(x, y, color(x, y))

    def outline(self, inside, c):
        """Contour d'un pixel autour de la forme inside(x, y), à l'extérieur."""
        pts = []
        for y in range(self.h):
            for x in range(self.w):
                if inside(x, y):
                    continue
                if any(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    pts.append((x, y))
        for x, y in pts:
            self.put(x, y, c)


# ---------------------------------------------------------------- motifs

def shingle_color(m, rr, x, row, joint=9, left_light=0.5):
    """Bardeaux : rangées de 3 px séparées par un joint sombre ; le haut de chaque rangée est
    éclairé ; joints verticaux espacés et décalés d'une rangée à l'autre, à peine marqués."""
    k = rr % 3
    if k == 2:
        return m + 'd'
    if (x + (row % 2) * 4) % joint == 0:
        return m + 'm' if left_light else m + 'd'
    if k == 0:
        return m + 'h' if left_light else m + 'l'
    return m + 'l' if left_light else m + 'm'


def planks_v(cv, x0, y0, x1, y1, m='w', width=4):
    """Planches verticales : un joint sombre, le bord gauche de chaque planche éclairé."""
    for x in range(x0, x1 + 1):
        k = (x - x0) % width
        for y in range(y0, y1 + 1):
            cv.put(x, y, m + 'd' if k == width - 1 else m + 'l' if k == 0 else m + 'm')


def planks_h(cv, x0, y0, x1, y1, m='w', height=3):
    for y in range(y0, y1 + 1):
        k = (y - y0) % height
        for x in range(x0, x1 + 1):
            cv.put(x, y, m + 'd' if k == height - 1 else m + 'h' if k == 0 and m + 'h' in P else m + 'l' if k == 0 else m + 'm')


def window(cv, x0, y0, x1, y1, frame='w', bars=True):
    """Fenêtre : cadre de bois, verre clair en haut, reflet oblique, croisillon."""
    cv.box(x0, y0, x1, y1, frame + 'o')
    for y in range(y0 + 1, y1):
        for x in range(x0 + 1, x1):
            t = (y - y0) / max(1, y1 - y0)
            cv.put(x, y, 'gl' if t < 0.3 else 'gm' if t < 0.75 else 'gd')
            if (x - x0) + (y - y0) in (3, 4):
                cv.put(x, y, 'gh')
    if bars:
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2
        cv.vline(mx, y0 + 1, y1 - 1, frame + 'l')
        cv.hline(x0 + 1, x1 - 1, my, frame + 'l')
    cv.hline(x0, x1, y1 + 1, 'cl')      # appui clair
    cv.put(x0 - 1, y1 + 1, 'co')
    cv.put(x1 + 1, y1 + 1, 'co')


def bush(cv, cx, cy, rx, ry, seed=0):
    """Touffe de feuillage : masse ronde, éclairée en haut à gauche, contour sombre."""
    def inside(x, y):
        d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        wob = 0.12 * math.sin((x + seed) * 1.7) + 0.1 * math.sin((y + seed) * 2.3)
        return d <= 1 + wob

    def color(x, y):
        t = ((x - cx) / rx + (y - cy) / ry) / 2
        if (x * 3 + y * 5 + seed) % 11 == 0:
            return 'vh'
        return 'vl' if t < -0.35 else 'vm' if t < 0.3 else 'vd'
    cv.outline(inside, 'vo')
    cv.fill(inside, color)


# ---------------------------------------------------------------- la maison (93×97)

def maison():
    cv = Cv(93, 97)
    RIDGE = 36

    def right_slope(x, y):                       # même géométrie que house_sp.png
        return 37 <= x <= 68 and 2 + (x - 37) // 2 <= y <= 31 + (x - 37) // 2

    def left_slope(x, y):
        return 3 <= x <= 35 and 2 + (35 - x) // 2 <= y <= 31 + (35 - x) // 2

    def gable(x, y):
        return 9 <= x <= 63 and 32 + abs(x - RIDGE) // 2 <= y <= 51

    # pignon : crépi crème encadré de colombages, œil-de-bœuf
    cv.fill(gable, lambda x, y: 'cm' if x < RIDGE + 10 else 'cd')
    for x in range(9, 64):
        top = 32 + abs(x - RIDGE) // 2
        if top <= 51:
            cv.put(x, top, 'wd')
            cv.put(x, top + 1, 'wl')
    cv.hline(9, 63, 50, 'wl')
    cv.hline(9, 63, 51, 'wd')
    for bx in (22, 50):
        top = 32 + abs(bx - RIDGE) // 2
        cv.vline(bx, top + 1, 50, 'wl')
        cv.vline(bx + 1, top + 1, 50, 'wd')
    # œil-de-bœuf
    for y in range(36, 48):
        for x in range(29, 44):
            d = math.hypot(x - 36, (y - 42) * 1.1)
            if d <= 6.2:
                cv.put(x, y, 'wo' if d > 5.2 else 'wl' if d > 4.4 else ('gh' if (x - 30) + (y - 37) in (4, 5) else 'gl' if y < 41 else 'gm'))
    cv.vline(36, 37, 47, 'wl')
    cv.hline(31, 41, 42, 'wl')
    # versants : bardeaux prune, rangées parallèles à la pente
    cv.fill(left_slope, lambda x, y: shingle_color('r', y - (35 - x) // 2, x, (y - (35 - x) // 2) // 3, left_light=True))
    cv.fill(right_slope, lambda x, y: shingle_color('r', y - (x - 37) // 2, x, (y - (x - 37) // 2) // 3, left_light=False))
    # rives (bords des versants) et faîtage
    for x in range(3, 36):
        cv.put(x, 2 + (35 - x) // 2, 'rh')
        cv.put(x, 31 + (35 - x) // 2, 'rj')
    for x in range(37, 69):
        cv.put(x, 2 + (x - 37) // 2, 'rl')
        cv.put(x, 31 + (x - 37) // 2, 'rj')
    cv.vline(RIDGE, 1, 33, 'rj')
    cv.outline(lambda x, y: left_slope(x, y) or right_slope(x, y) or x == RIDGE and 1 <= y <= 33, 'rj')
    # annexe à droite : toit plus bas
    cv.rect(69, 38, 91, 51, 'rm')
    for y in range(38, 52):
        for x in range(69, 92):
            cv.put(x, y, shingle_color('r', y - 38, x, (y - 38) // 3, left_light=False))
    cv.box(69, 37, 91, 52, 'rj')
    # auvent de la galerie : bande de bardeaux sur toute la largeur
    for y in range(52, 62):
        for x in range(2, 91):
            cv.put(x, y, shingle_color('r', y - 52, x, (y - 52) // 3, left_light=x < 46))
    cv.box(1, 51, 91, 62, 'rj')
    cv.hline(2, 90, 52, 'rh')
    # murs de planches, sous la galerie (à l'ombre)
    planks_h(cv, 4, 63, 88, 80, 'w', 3)
    for y in range(63, 66):                      # ombre portée de l'auvent
        cv.hline(4, 88, y, 'wd')
    # fenêtres
    window(cv, 12, 67, 24, 76)
    window(cv, 64, 67, 76, 76)
    # porte
    cv.rect(39, 65, 51, 80, 'dm')
    planks_v(cv, 40, 66, 50, 80, 'd', 3)
    cv.box(38, 64, 52, 81, 'do')
    window(cv, 42, 67, 48, 71, 'd', bars=False)
    cv.put(49, 74, 'yl'); cv.put(49, 75, 'ym')
    # buissons au pied des murs
    bush(cv, 8, 77, 6, 5, 1)
    bush(cv, 31, 78, 5, 4, 4)
    bush(cv, 60, 78, 5, 4, 7)
    bush(cv, 85, 77, 6, 5, 2)
    # poteaux de la galerie
    for px in (3, 33, 56, 88):
        cv.vline(px, 63, 82, 'wl')
        cv.vline(px + 1, 63, 82, 'wd')
        cv.put(px, 62, 'wo'); cv.put(px + 1, 62, 'wo')
    # terrasse de planches
    for y in range(82, 89):
        for x in range(1, 92):
            k = (y - 82) % 3
            cv.put(x, y, 'wd' if k == 2 else 'wh' if k == 0 else 'wl')
    cv.box(0, 81, 92, 89, 'wo')
    for fx in (4, 20, 70, 86):                   # pieds
        cv.rect(fx, 90, fx + 2, 92, 'wo')
    # marches
    for i, (x0, x1) in enumerate(((32, 56), (31, 57))):
        y0 = 90 + i * 3
        cv.rect(x0, y0, x1, y0 + 2, 'wl')
        cv.hline(x0, x1, y0, 'wh')
        cv.box(x0 - 1, y0 - 1, x1 + 1, y0 + 3, 'wo')
    return cv.im


# ---------------------------------------------------------------- l'étable (104×93)

def etable():
    cv = Cv(104, 93)
    RIDGE = 51

    def left_slope(x, y):
        return 2 <= x <= 50 and 2 + (50 - x) // 2 <= y <= 30 + (50 - x) // 2

    def right_slope(x, y):
        return 52 <= x <= 101 and 2 + (x - 52) // 2 <= y <= 30 + (x - 52) // 2

    def gable(x, y):
        return 10 <= x <= 93 and 31 + abs(x - RIDGE) // 2 <= y <= 54

    cv.fill(gable, lambda x, y: 'cm' if x < RIDGE + 12 else 'cd')
    # colombages du pignon : croix de Saint-André et lucarne ronde
    for x in range(10, 94):
        top = 31 + abs(x - RIDGE) // 2
        if top <= 54:
            cv.put(x, top, 'wd')
            cv.put(x, top + 1, 'wl')
    for y in range(38, 54):
        t = (y - 38) / 16
        for s in (-1, 1):
            x = round(RIDGE + s * (8 + t * 22))
            cv.put(x, y, 'wl'); cv.put(x + 1, y, 'wd')
    for y in range(40, 50):
        for x in range(45, 59):
            d = math.hypot(x - 51.5, (y - 45) * 1.1)
            if d <= 5.4:
                cv.put(x, y, 'wo' if d > 4.4 else 'nd' if y > 44 else 'nn')
    cv.fill(left_slope, lambda x, y: shingle_color('b', y - (50 - x) // 2, x, (y - (50 - x) // 2) // 3, left_light=True))
    cv.fill(right_slope, lambda x, y: shingle_color('b', y - (x - 52) // 2, x, (y - (x - 52) // 2) // 3, left_light=False))
    for x in range(2, 51):
        cv.put(x, 2 + (50 - x) // 2, 'bh')
        cv.put(x, 30 + (50 - x) // 2, 'bj')
    for x in range(52, 102):
        cv.put(x, 2 + (x - 52) // 2, 'bl')
        cv.put(x, 30 + (x - 52) // 2, 'bj')
    cv.vline(RIDGE, 1, 32, 'bj')
    cv.outline(lambda x, y: left_slope(x, y) or right_slope(x, y) or x == RIDGE and 1 <= y <= 32, 'bj')
    # poutre sous le pignon
    cv.rect(2, 55, 101, 57, 'wm')
    cv.hline(2, 101, 55, 'wh')
    cv.hline(2, 101, 57, 'wd')
    cv.box(1, 54, 102, 58, 'wo')
    # murs de planches verticales
    planks_v(cv, 3, 59, 100, 89, 'b', 4)
    cv.box(2, 58, 101, 90, 'bj')
    # baies sombres de part et d'autre
    for x0 in (9, 78):
        cv.rect(x0, 63, x0 + 16, 86, 'nd')
        cv.rect(x0, 63, x0 + 16, 66, 'nn')
        cv.box(x0 - 1, 62, x0 + 17, 87, 'wo')
        cv.hline(x0 - 1, x0 + 17, 87, 'wl')
    # grande double porte à croix
    cv.rect(35, 61, 68, 89, 'wm')
    for x0, x1 in ((35, 51), (52, 68)):
        planks_v(cv, x0, 61, x1, 89, 'w', 4)
        cv.box(x0, 61, x1, 89, 'wo')
        for y in range(62, 89):
            t = (y - 62) / 26
            for x in (round(x0 + 1 + t * (x1 - x0 - 2)), round(x1 - 1 - t * (x1 - x0 - 2))):
                cv.put(x, y, 'wh')
                cv.put(x + 1, y, 'wd')
        cv.hline(x0 + 1, x1 - 1, 62, 'wh')
        cv.hline(x0 + 1, x1 - 1, 88, 'wd')
    cv.box(34, 60, 69, 90, 'wo')
    # seuil de terre battue
    cv.hline(2, 101, 91, 'bd')
    cv.hline(3, 100, 92, 'bj')
    return cv.im


# ---------------------------------------------------------------- le poulailler (44×55 × 3)

def poulailler(porte):
    cv = Cv(44, 55)
    RIDGE = 21

    def roof(x, y):
        return 1 <= x <= 42 and 1 + abs(x - RIDGE) * 0.62 <= y <= 15 + abs(x - RIDGE) * 0.3

    # mur crépi et colombages
    cv.rect(5, 18, 38, 45, 'cm')
    cv.rect(26, 18, 38, 45, 'cd')
    for bx in (5, 37):
        cv.vline(bx, 18, 45, 'wl'); cv.vline(bx + 1, 18, 45, 'wd')
    cv.hline(5, 38, 31, 'wl'); cv.hline(5, 38, 32, 'wd')
    cv.box(4, 17, 39, 46, 'wo')
    # lucarne
    window(cv, 26, 21, 33, 27, bars=False)
    # porte ronde : fermée, entrouverte, ouverte
    def door(x, y):
        return 12 <= x <= 22 and (y >= 38 or math.hypot(x - 17, y - 38) <= 5.2) and 33 <= y <= 46
    cv.fill(door, lambda x, y: 'nn' if y < 40 else 'nd')
    if porte < 2:
        x1 = 22 if porte == 0 else 16
        cv.fill(lambda x, y: door(x, y) and x <= x1, lambda x, y: 'dl' if (x - 12) % 3 == 0 else 'dm')
        if porte == 0:
            cv.put(20, 41, 'yl')
    cv.outline(door, 'do')
    # toit de bardeaux prune, débordant
    cv.fill(roof, lambda x, y: shingle_color('r', int(y - abs(x - RIDGE) * 0.3), x, int(y - abs(x - RIDGE) * 0.3) // 3, left_light=x < RIDGE))
    cv.outline(roof, 'rj')
    cv.vline(RIDGE, 1, 15, 'rj')
    # pieds
    for fx in (6, 35):
        cv.rect(fx, 47, fx + 2, 52, 'wd')
        cv.vline(fx, 47, 52, 'wl')
    # rampe : une planche qui descend de la porte vers le sol, à droite, avec ses barreaux
    def ramp(x, y):
        return 16 <= x <= 31 and 0 <= y - (46 + (x - 16) * 0.45) <= 2
    cv.fill(ramp, lambda x, y: 'wh' if y - (46 + (x - 16) * 0.45) < 1 else 'wl' if (x - 16) % 4 else 'wd')
    cv.outline(ramp, 'wo')
    return cv.im


# ---------------------------------------------------------------- le moulin (96×128 × 4)

def moulin(n):
    cv = Cv(96, 128)
    HX, HY = 48, 41            # moyeu des ailes
    # soubassement de pierres
    def base(x, y):
        return 24 <= x <= 71 and 86 <= y <= 125
    for y in range(86, 126):
        row = (y - 86) // 4
        for x in range(24, 72):
            if (y - 86) % 4 == 3 or (x + (row % 2) * 5) % 10 == 0:
                cv.put(x, y, 'sj')
            else:
                t = (x - 24) / 47
                cv.put(x, y, 'sh' if (y - 86) % 4 == 0 and t < 0.5 else 'sl' if t < 0.35 else 'sm' if t < 0.75 else 'sd')
    cv.outline(base, 'so')
    # porte
    cv.rect(41, 103, 54, 125, 'dm')
    planks_v(cv, 41, 104, 54, 125, 'd', 3)
    cv.box(40, 102, 55, 126, 'do')
    cv.put(52, 115, 'yl')
    # lierre sur la pierre
    bush(cv, 28, 112, 5, 9, 3)
    bush(cv, 66, 118, 5, 6, 8)
    # corps à colombages, un peu plus étroit que la base
    def body(x, y):
        return 28 <= x <= 67 and 46 <= y <= 85
    cv.fill(body, lambda x, y: 'cm' if x < 52 else 'cd')
    for bx in (28, 47, 66):
        cv.vline(bx, 46, 85, 'wl'); cv.vline(bx + 1, 46, 85, 'wd')
    cv.hline(28, 67, 64, 'wl'); cv.hline(28, 67, 65, 'wd')
    cv.hline(28, 67, 84, 'wl'); cv.hline(28, 67, 85, 'wd')
    window(cv, 34, 69, 42, 78)
    window(cv, 53, 69, 61, 78)
    window(cv, 52, 50, 60, 58, bars=False)
    cv.outline(body, 'wo')
    # balcon de bois sous le corps
    cv.rect(22, 86, 73, 88, 'wl')
    cv.hline(22, 73, 86, 'wh')
    cv.hline(22, 73, 88, 'wd')
    cv.box(21, 85, 74, 89, 'wo')
    # chapeau de bardeaux bruns
    def cap(x, y):
        return 24 <= x <= 71 and 24 + max(0, abs(x - 47.5) - 8) * 0.9 <= y <= 45
    cv.fill(cap, lambda x, y: shingle_color('b', y - 24, x, (y - 24) // 3, left_light=x < 48))
    cv.outline(cap, 'bj')
    # ailes : quatre bras de toile tendue sur un treillis, un huitième de tour par image
    a0 = n * math.pi / 8
    L, W0, W1 = 39, 2.0, 9.0       # longueur, début et bord de la toile
    def sail(x, y):
        dx, dy = x + 0.5 - HX, y + 0.5 - HY
        for k in range(4):
            a = a0 + k * math.pi / 2
            u = dx * math.cos(a) + dy * math.sin(a)       # le long du bras
            v = -dx * math.sin(a) + dy * math.cos(a)      # en travers (la toile d'un seul côté)
            if 3 <= u <= L:
                if abs(v) <= 0.9:
                    return 'spar'
                if W0 <= v <= W1 and u >= 8:
                    edge = v > W1 - 1 or u > L - 1 or u < 9
                    lattice = int(u) % 6 == 0 or abs(v - (W0 + W1) / 2) < 0.5
                    return 'edge' if edge else 'lat' if lattice else 'cloth'
        return None
    shapes = {}
    for y in range(128):
        for x in range(96):
            s = sail(x, y)
            if s:
                shapes[(x, y)] = s
    for (x, y), s in shapes.items():
        cv.put(x, y, {'spar': 'wm', 'edge': 'wd', 'lat': 'wl', 'cloth': 'tm' if (x + y) % 9 else 'tl'}[s])
    cv.outline(lambda x, y: (x, y) in shapes, 'wo')
    # moyeu
    for y in range(HY - 3, HY + 4):
        for x in range(HX - 3, HX + 4):
            d = math.hypot(x + 0.5 - HX, y + 0.5 - HY)
            if d <= 3.2:
                cv.put(x, y, 'wo' if d > 2.3 else 'wh' if x < HX and y < HY else 'wl')
    return cv.im


# ---------------------------------------------------------------- planche

def frames(name, n, w, h):
    im = Image.open(os.path.join(ASSETS, name)).convert('RGBA')
    return [im.crop((i * w, 0, i * w + w, h)) for i in range(n)]


def main():
    entries = [
        ('maison', [maison()]),
        ('etable', [etable()]),
        ('moulin', [moulin(i) for i in range(4)]),
        ('serre', frames('serre_essai.png', 1, 94, 83)),
        ('poulailler', [poulailler(i) for i in range(3)]),
        ('silo', frames('silo.png', 1, 28, 62)),
        ('puits', frames('puits.png', 3, 34, 40)),
        ('citerne', frames('citerne.png', 5, 24, 34)),
        ('panneaux_toit', frames('panneaux_toit.png', 6, 32, 47)),
    ]
    # rangées : on remplit de gauche à droite jusqu'à MAXW, 2 px d'écart
    MAXW, GAP = 512, 2
    placed, x, y, row_h = {}, 0, 0, 0
    for name, ims in entries:
        w, h = ims[0].size
        total = len(ims) * w + (len(ims) - 1) * GAP
        if x and x + total > MAXW:
            x, y, row_h = 0, y + row_h + GAP, 0
        placed[name] = {'x': x, 'y': y, 'w': w, 'h': h, 'images': len(ims), 'ims': ims}
        x += total + GAP
        row_h = max(row_h, h)
    sheet_w = max(p['x'] + p['images'] * (p['w'] + GAP) - GAP for p in placed.values())
    sheet_h = y + row_h
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    for p in placed.values():
        for i, im in enumerate(p['ims']):
            sheet.alpha_composite(im, (p['x'] + i * (p['w'] + GAP), p['y']))
    sheet.save(os.path.join(ASSETS, 'batiments_remaster.png'))
    atlas = {
        '//': 'Planche des bâtiments redessinés (scripts/batiments/remaster.py) : nom → coin haut-gauche de la première '
              'image, taille d\'une image, nombre d\'images ; les images d\'un bâtiment se suivent vers la droite, à 2 px d\'écart.',
        'ecart': GAP,
    }
    atlas.update({k: {kk: v for kk, v in p.items() if kk != 'ims'} for k, p in placed.items()})
    with open(os.path.join(ASSETS, 'batiments_remaster.json'), 'w', encoding='utf8') as f:
        json.dump(atlas, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'assets/batiments_remaster.png : {sheet_w}×{sheet_h}, {len(placed)} bâtiments')
    if '--apercu' in sys.argv:
        k = 3
        big = Image.new('RGBA', (sheet_w * k, sheet_h * k + 20 * len(set(p['y'] for p in placed.values()))), (64, 104, 64, 255))
        big.alpha_composite(sheet.resize((sheet_w * k, sheet_h * k), Image.NEAREST), (0, 0))
        big.save(os.path.join(ROOT, 'apercu_batiments.png'))
        print('apercu_batiments.png')
    return placed


if __name__ == '__main__':
    main()
