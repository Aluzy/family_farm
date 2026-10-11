# Bâtiments de la carte, dessinés en code d'après le guide graphique
# (docs/direction-artistique/guide-graphique-pastoral.md) : palette fermée de 60 couleurs,
# lumière haut-gauche en aplats durs, contour continu de 1 px du ton le plus sombre de chaque
# matière (W0 bois, N0 toit, V1 serre), gabarits multiples de 16 avec pivot en bas au centre,
# pas d'ombre de contact sous les bâtiments.
#
# Matières (guide, section Matériaux) :
#   toiture   N0 à N3 : rangs de 5 px, tuiles de 8 à 12 px, joints décalés, aplat N2, traits N3 ;
#             bardeaux bruns (étable, moulin) : la même recette dans la rampe du bois ;
#   enduit    P4 en aplat, découpé par un colombage W3 ; C0 sous l'avant-toit ;
#   bois      W0 à W4 : planches de 3 à 4 px, veines verticales de 1 px, joints W1, arête W4 ;
#   pierre    B1 (base), B2 (lumière), B0 (joints) : blocs de 6 à 8 px, rangs décalés ;
#   verre     G0 à G3 : panneaux entre des montants de 1 px, reflets diagonaux G3, touches A1.
# Fenêtres de 8 × 8, portes d'environ 12 × 16, toits à pente de 2 pour 1 avec un faîtage de bois.
#
#   python3 scripts/batiments/remaster.py           écrit assets/batiments_remaster.png et .json
#   python3 scripts/batiments/remaster.py --qa      passe chaque bâtiment au contrôle du guide
import json
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from pastoral import PAL, Canvas, amas, level, outline_feuillage, qa  # noqa: E402

PRUNE = {'o': 'N0', 's': 'N1', 'm': 'N2', 'l': 'N3'}          # toiture des maisons
BRUN = {'o': 'W0', 's': 'W1', 'm': 'W2', 'l': 'W3', 'h': 'W4'}  # bardeaux bruns


# ================================================================ motifs

def roof_color(rr, x, lit, roof='prune', t=0.5):
    """Couleur d'un pixel de toiture : `rr` = distance au haut du pan (rangs de 5 px), `x` la
    colonne (tuiles de 10 px, joints décalés d'un rang à l'autre), `lit` le pan éclairé, `t` la
    position de 0 (faîtage) à 1 (égout). Le pan s'assombrit vers l'égout."""
    row, k = divmod(int(rr), 5)
    if roof == 'prune':
        if k == 4 or (x + (row % 2) * 5) % 10 == 0:
            return 'N0'                                        # joints
        if t > 0.86:
            return 'N1'                                        # dernier rang, sous son débord
        if lit:
            return 'N3' if k == 0 and t < 0.7 else 'N2'
        return 'N2' if k == 0 and t < 0.5 else 'N1'
    # bardeaux bruns
    if k == 4 or (x + (row % 2) * 5) % 10 == 0:
        return 'W1'
    if t > 0.86:
        return 'W1'
    if lit:
        return 'W4' if k == 0 and t < 0.6 else 'W3'
    return 'W3' if k == 0 and t < 0.5 else 'W2'


def planks(cv, x0, y0, x1, y1, vertical=True, width=4, base='W3', seed=0):
    """Planches de bois : joints W1, arête éclairée W4, veines verticales W2 de 2 à 6 px."""
    r = random.Random(seed)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            k = ((x - x0) if vertical else (y - y0)) % width
            c = 'W1' if k == width - 1 else 'W4' if k == 0 else base
            cv.put(x, y, c)
    if vertical:
        for px_ in range(x0 + 1, x1, width):
            for _ in range(max(1, (y1 - y0) // 10)):
                y = r.randint(y0 + 1, max(y0 + 1, y1 - 6))
                for k in range(r.randint(2, 6)):
                    cv.put(px_ + 1, y + k, 'W2')


def plaster(cv, inside, light='P4', shade='C0'):
    """Enduit : aplat P4 ; C0 là où le mur est dans l'ombre (`shade` posé ensuite)."""
    for y in range(cv.h):
        for x in range(cv.w):
            if inside(x, y):
                cv.put(x, y, light)


def window8(cv, x, y, frame='W2'):
    """Fenêtre de 8 × 8 : cadre de bois, verre G2 avec reflet diagonal G3, ombre G1 sous le
    linteau et à gauche (la vitre est en retrait), croisillon, appui éclairé."""
    cv.box(x, y, x + 7, y + 7, 'W0')
    for yy in range(y + 1, y + 7):
        for xx in range(x + 1, x + 7):
            c = 'G2'
            if yy == y + 1 or xx == x + 1:
                c = 'G1'
            elif (xx - x) + (yy - y) in (5, 6) and xx != x + 4 and yy != y + 4:
                c = 'G3'
            cv.put(xx, yy, c)
    cv.vline(x + 4, y + 1, y + 6, frame)
    cv.hline(x + 1, x + 6, y + 4, frame)
    cv.hline(x - 1, x + 8, y + 8, 'W4')                      # appui
    cv.put(x - 1, y + 8, 'W0'); cv.put(x + 8, y + 8, 'W0')


def door(cv, x, y, w=12, h=16, window=True):
    """Porte d'environ 12 × 16 : planches verticales, en retrait (ombre W1 en haut et à gauche),
    petite vitre, poignée A4."""
    cv.box(x, y, x + w - 1, y + h - 1, 'W0')
    planks(cv, x + 1, y + 1, x + w - 2, y + h - 1, True, 3, 'W2', seed=x)
    cv.hline(x + 1, x + w - 2, y + 1, 'W1')
    cv.vline(x + 1, y + 1, y + h - 1, 'W1')
    if window:
        for yy in range(y + 3, y + 7):
            for xx in range(x + 4, x + w - 4):
                cv.put(xx, yy, 'G1' if yy == y + 3 else 'G2' if (xx + yy) % 5 else 'G3')
        cv.box(x + 3, y + 2, x + w - 4, y + 7, 'W0')
    cv.put(x + w - 3, y + h // 2 + 1, 'A4')


def stones(cv, x0, y0, x1, y1, bw=7, bh=4, seed=0):
    """Mur de pierres : blocs de 6 à 8 px sur 4, rangs décalés ; dessus et gauche de chaque
    bloc en B2, base B1, joints B0."""
    for y in range(y0, y1 + 1):
        row = (y - y0) // bh
        k = (y - y0) % bh
        off = (row % 2) * (bw // 2) + (row * 3 % 2)
        for x in range(x0, x1 + 1):
            kx = (x - x0 + off) % bw
            if k == bh - 1 or kx == bw - 1:
                c = 'B0'
            elif k == 0 or kx == 0:
                c = 'B2'
            else:
                c = 'B1'
            cv.put(x, y, c)


def ivy(cv, cx, cy, rx, ry, seed=0):
    """Plante grimpante ou buisson au pied d'un mur : amas V, bord d'ombre cerné."""
    def inside(x, y):
        a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        k = 1 + 0.12 * math.cos(4 * a + seed)
        return ((x + 0.5 - cx) / (rx * k)) ** 2 + ((y + 0.5 - cy) / (ry * k)) ** 2 <= 1
    tones = ['V1', 'V2', 'V6', 'V8', 'V10']
    for y in range(cv.h):
        for x in range(cv.w):
            if inside(x, y):
                cv.put(x, y, tones[level((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)])
    outline_feuillage(cv, inside, 'V1', 'V2', seed)


def outline_by_material(cv):
    """Contour continu de 1 px autour de la silhouette, du ton le plus sombre de la matière
    voisine : N0 pour la toiture, V1 pour le verre et le feuillage, W0 pour le reste."""
    prune = {PAL[k] for k in ('N0', 'N1', 'N2', 'N3')}
    verre = {PAL[k] for k in ('G0', 'G1', 'G2', 'G3', 'V1', 'V2', 'V6', 'V8', 'V10')}
    pts = []
    for y in range(cv.h):
        for x in range(cv.w):
            if cv.opaque(x, y):
                continue
            nb = [cv.get(x + dx, y + dy)[:3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if cv.opaque(x + dx, y + dy)]
            if nb:
                c = 'N0' if any(n in prune for n in nb) else 'V1' if all(n in verre for n in nb) else 'W0'
                pts.append((x, y, c))
    for x, y, c in pts:
        cv.put(x, y, c)


def gable_roof(cv, ridge, x_left, x_right, top, thick, roof='prune'):
    """Toit à deux pans, pente de 2 pour 1 : pan gauche éclairé, pan droit dans l'ombre ;
    faîtage de bois (W3, W4) sur l'arête ; renvoie les fonctions « dans le pan »."""
    def left(x, y):
        return x_left <= x < ridge and top + (ridge - 1 - x) // 2 <= y < top + thick + (ridge - 1 - x) // 2

    def right(x, y):
        return ridge < x <= x_right and top + (x - ridge - 1) // 2 <= y < top + thick + (x - ridge - 1) // 2
    for y in range(cv.h):
        for x in range(cv.w):
            if left(x, y):
                rr = y - top - (ridge - 1 - x) // 2
                cv.put(x, y, roof_color(rr, x, True, roof, rr / thick))
            elif right(x, y):
                rr = y - top - (x - ridge - 1) // 2
                cv.put(x, y, roof_color(rr, x, False, roof, rr / thick))
    o = 'N0' if roof == 'prune' else 'W0'
    for x in range(x_left, ridge):                           # rive éclairée
        cv.put(x, top + (ridge - 1 - x) // 2, 'N3' if roof == 'prune' else 'W4')
    cv.vline(ridge, top - 1, top + thick, 'W4')              # faîtage de bois
    cv.put(ridge, top - 2, o)
    for x in range(x_left, x_right + 1):                     # sous-face des pans, à l'égout
        if x < ridge:
            cv.put(x, top + thick + (ridge - 1 - x) // 2, o)
        elif x > ridge:
            cv.put(x, top + thick + (x - ridge - 1) // 2, o)
    return left, right


def gable_wall(cv, ridge, x0, x1, top_y, bottom_y, timber=True):
    """Pignon : enduit P4 sous les pans, bande C0 sous la sous-face (ombre de surplomb),
    colombage W3 (sablière et deux poteaux)."""
    def inside(x, y):
        return x0 <= x <= x1 and top_y + abs(x - ridge) // 2 <= y <= bottom_y
    for y in range(cv.h):
        for x in range(cv.w):
            if inside(x, y):
                t = y - (top_y + abs(x - ridge) // 2)
                cv.put(x, y, 'C0' if t < 2 else 'P4')
    if timber:
        cv.hline(x0, x1, bottom_y, 'W3')
        cv.hline(x0, x1, bottom_y - 1, 'W2')
    return inside


# ================================================================ la maison (96 × 96)

def maison():
    """Maison : grand toit prune à deux pans (le pan droit garde la géométrie de l'ancienne
    maison : les panneaux solaires s'y posent), annexe à droite, auvent sur la galerie, façade
    d'enduit et colombage, porte de 12 × 16 sur l'axe d'une case, deux fenêtres de 8 × 8,
    terrasse et marches."""
    cv = Canvas(96, 96)
    R = 38                                                   # faîtage
    gable_wall(cv, R, 10, 66, 33, 50)
    window8(cv, R - 4, 38)
    left, right = gable_roof(cv, R, 5, 70, 2, 30)
    # annexe à droite
    for y in range(39, 52):
        for x in range(71, 94):
            cv.put(x, y, roof_color(y - 39, x, False, 'prune', (y - 39) / 13))
    cv.hline(71, 93, 39, 'N2')
    # auvent sur toute la largeur (appentis : traits N3 sur le dessus)
    for y in range(51, 61):
        for x in range(2, 94):
            cv.put(x, y, roof_color(y - 51, x, x < 48, 'prune', (y - 51) / 10))
    cv.hline(2, 93, 51, 'N3')
    # façade : enduit et colombage, à l'ombre de l'auvent en haut
    for y in range(61, 81):
        for x in range(5, 91):
            cv.put(x, y, 'C0' if y < 63 else 'P4')
    for bx in (5, 30, 59, 90):
        cv.vline(bx, 61, 80, 'W3')
    cv.hline(5, 90, 80, 'W2')
    window8(cv, 15, 66)
    window8(cv, 71, 66)
    door(cv, 42, 65)
    # buissons au pied du mur
    ivy(cv, 10, 77, 6, 4, 1)
    ivy(cv, 34, 78, 4, 3, 4)
    ivy(cv, 64, 78, 4, 3, 7)
    ivy(cv, 86, 77, 6, 4, 2)
    # poteaux de la galerie
    for px_ in (3, 26, 64, 91):
        cv.vline(px_, 61, 82, 'W4')
        cv.vline(px_ + 1, 61, 82, 'W2')
    # terrasse : dessus clair, chant dans l'ombre
    planks(cv, 1, 81, 94, 86, False, 3, 'W3')
    cv.hline(1, 94, 87, 'W1')
    for fx in (4, 22, 72, 89):                               # pieds
        cv.rect(fx, 88, fx + 2, 91, 'W1')
    # marches, sous la porte
    for i, (x0, x1) in enumerate(((39, 56), (38, 57))):
        y0 = 88 + i * 4
        cv.rect(x0, y0, x1, y0 + 2, 'W3')
        cv.hline(x0, x1, y0, 'W4')
        cv.hline(x0, x1, y0 + 3, 'W1')
    outline_by_material(cv)
    return cv.im


def panneaux_toit(n):
    """Panneaux solaires sur le pan droit de la maison (32 × 48, posés au point (39, 2)) : cellules
    A0 (indigo) quadrillées de A1, reflet A3, cadre R2 et R1 ; ils suivent la pente du toit."""
    cv = Canvas(32, 48)
    OX, OY, R = 39, 2, 38
    places = [(1, 0), (1, 1), (1, 2), (0, 0), (0, 1), (0, 2)][:n]
    for row, col in places:
        x0 = 41 + col * 10
        for dx in range(9):
            x = x0 + dx
            top = 2 + (x - R - 1) // 2 + (6 if row == 0 else 18)
            for dy in range(10):
                y = top + dy
                if dx == 0 or dy == 0:
                    c = 'R3'
                elif dx == 8 or dy == 9:
                    c = 'R1'
                elif dx == 4 or dy in (3, 6):
                    c = 'A1'
                else:
                    c = 'A0'
                cv.put(x - OX, y - OY, c)
        for dx, dy in ((1, 1), (2, 1), (1, 2)):
            x = x0 + dx
            cv.put(x - OX, 2 + (x - R - 1) // 2 + (6 if row == 0 else 18) + dy - OY, 'A3')
    return cv.im


# ================================================================ l'étable (112 × 96)

def etable():
    """Étable : toit de bardeaux bruns, pignon d'enduit à croix de Saint-André et lucarne ronde,
    murs de planches verticales, grande double porte à écharpes, deux baies sombres."""
    cv = Canvas(112, 96)
    R = 56
    gable_wall(cv, R, 12, 100, 32, 56)
    for y in range(40, 56):                                   # croix du pignon
        t = (y - 40) / 15
        for s in (-1, 1):
            x = round(R + s * (9 + t * 24))
            cv.put(x, y, 'W3'); cv.put(x + 1, y, 'W2')
    for y in range(41, 52):                                   # lucarne ronde
        for x in range(49, 64):
            d = math.hypot(x + 0.5 - (R + 0.5), (y + 0.5 - 46.5) * 1.1)
            if d <= 5.4:
                cv.put(x, y, 'W0' if d > 4.4 else 'B0' if y > 45 else 'N1')
    gable_roof(cv, R, 3, 108, 2, 29, 'brun')
    # poutre
    cv.rect(3, 57, 108, 59, 'W3')
    cv.hline(3, 108, 57, 'W4')
    cv.hline(3, 108, 59, 'W1')
    # murs de planches verticales, l'ombre de la poutre en haut
    planks(cv, 4, 60, 107, 92, True, 4, 'W2', seed=3)
    cv.hline(4, 107, 60, 'W1')
    cv.hline(4, 107, 92, 'W1')
    # baies sombres
    for x0 in (10, 85):
        cv.rect(x0, 64, x0 + 16, 89, 'N2')
        cv.rect(x0, 64, x0 + 16, 69, 'N1')
        cv.box(x0 - 1, 63, x0 + 17, 90, 'W0')
        cv.vline(x0 + 16, 64, 89, 'W2')                       # montant droit, vu de biais
    # grande double porte à écharpes
    for x0, x1 in ((38, 55), (56, 73)):
        planks(cv, x0, 62, x1, 92, True, 4, 'W3', seed=x0)
        cv.box(x0, 62, x1, 92, 'W0')
        for y in range(63, 92):
            t = (y - 63) / 28
            for x in (round(x0 + 1 + t * (x1 - x0 - 3)), round(x1 - 2 - t * (x1 - x0 - 3))):
                cv.put(x, y, 'W4'); cv.put(x + 1, y, 'W2')
        cv.hline(x0 + 1, x1 - 1, 63, 'W1')
    cv.box(37, 61, 74, 93, 'W0')
    cv.hline(3, 108, 93, 'W1')
    outline_by_material(cv)
    return cv.im


# ================================================================ le poulailler (48 × 64 × 3)

def poulailler(porte):
    """Poulailler : toit prune, mur d'enduit et colombage, lucarne, porte ronde (fermée,
    entrouverte, ouverte), pilotis et rampe."""
    cv = Canvas(48, 64)
    R = 24
    for y in range(22, 50):                                   # mur
        for x in range(7, 41):
            cv.put(x, y, 'C0' if y < 25 else 'P4')
    cv.vline(7, 22, 49, 'W3'); cv.vline(40, 22, 49, 'W3')
    cv.hline(7, 40, 35, 'W3'); cv.hline(7, 40, 49, 'W2')
    window8(cv, 28, 25)

    def door_shape(x, y):
        return 14 <= x <= 24 and 37 <= y <= 49 and (y >= 42 or math.hypot(x + 0.5 - 19.5, y + 0.5 - 42) <= 5.5)
    for y in range(64):
        for x in range(48):
            if door_shape(x, y):
                cv.put(x, y, 'N1' if y < 44 else 'B0')
    if porte < 2:
        x_end = 24 if porte == 0 else 18
        for y in range(64):
            for x in range(14, x_end + 1):
                if door_shape(x, y):
                    cv.put(x, y, 'W1' if (x - 14) % 3 == 2 else 'W3' if (x - 14) % 3 == 0 else 'W2')
        if porte == 0:
            cv.put(22, 44, 'A4')
    for y in range(64):                                      # chambranle
        for x in range(48):
            if not door_shape(x, y) and any(door_shape(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) and y < 50:
                cv.put(x, y, 'W0')
    # toit prune à deux pans débordants
    left, right = gable_roof(cv, R, 2, 45, 2, 17)
    # pilotis et rampe
    for fx in (9, 37):
        cv.rect(fx, 50, fx + 2, 63, 'W2')
        cv.vline(fx, 50, 63, 'W4')
    for i in range(12):
        x, y = 19 + i, 50 + i * 0.9
        cv.put(x, int(y), 'W4'); cv.put(x, int(y) + 1, 'W3'); cv.put(x, int(y) + 2, 'W1')
    outline_by_material(cv)
    return cv.im


# ================================================================ le moulin (96 × 128 × 4)

def moulin(n):
    """Moulin : soubassement de pierres et porte, corps d'enduit à colombage et fenêtres,
    balcon, chapeau de bardeaux bruns, quatre ailes de toile (C1, C0) sur un treillis de bois
    W3, tournant d'un huitième de tour par image."""
    cv = Canvas(96, 128)
    HX, HY = 48, 42
    stones(cv, 26, 90, 69, 127, seed=1)
    door(cv, 42, 112, 12, 16, window=False)
    ivy(cv, 30, 116, 5, 9, 3)
    ivy(cv, 66, 121, 5, 6, 8)
    for y in range(48, 87):                                   # corps
        for x in range(30, 66):
            cv.put(x, y, 'C0' if y < 51 or x > 60 else 'P4')
    for bx in (30, 47, 65):
        cv.vline(bx, 48, 86, 'W3')
    cv.hline(30, 65, 67, 'W3')
    cv.hline(30, 65, 86, 'W2')
    window8(cv, 35, 71)
    window8(cv, 53, 71)
    window8(cv, 53, 54)
    cv.rect(24, 87, 71, 89, 'W3')                             # balcon
    cv.hline(24, 71, 87, 'W4')
    cv.hline(24, 71, 89, 'W1')
    # chapeau
    for y in range(26, 48):
        half = 12 + (y - 26) * 0.55
        for x in range(96):
            if abs(x + 0.5 - 48) <= half:
                cv.put(x, y, roof_color(y - 26, x, x < 48, 'brun', (y - 26) / 22))
    # ailes
    a0 = n * math.pi / 8
    L, W0, W1 = 40, 2.0, 9.0
    shapes = {}
    for y in range(128):
        for x in range(96):
            dx, dy = x + 0.5 - HX, y + 0.5 - HY
            for k in range(4):
                a = a0 + k * math.pi / 2
                u = dx * math.cos(a) + dy * math.sin(a)
                v = -dx * math.sin(a) + dy * math.cos(a)
                if 3 <= u <= L:
                    if abs(v) <= 0.9:
                        shapes[(x, y)] = 'W3'                  # longeron
                    elif W0 <= v <= W1 and u >= 8:
                        lattice = int(u) % 6 == 0 or abs(v - (W0 + W1) / 2) < 0.5
                        shapes[(x, y)] = 'W2' if lattice else ('C1' if v < 5 else 'C0')
    for (x, y), c in shapes.items():
        cv.put(x, y, c)
    for y in range(HY - 3, HY + 4):                           # moyeu
        for x in range(HX - 3, HX + 4):
            d = math.hypot(x + 0.5 - HX, y + 0.5 - HY)
            if d <= 3.2:
                cv.put(x, y, 'W0' if d > 2.3 else 'W4' if x < HX and y < HY else 'W3')
    outline_by_material(cv)
    return cv.im


# ================================================================ la serre (96 × 80)

def serre():
    """Serre : pavillon central en ogive entre deux ailes vitrées ; panneaux de verre G2 entre des
    montants de 1 px G0, reflets diagonaux G3, touches A1, ombre G1 sous les traverses ; plantes
    derrière les vitres ; contour V1. Posée à même le sol."""
    cv = Canvas(96, 80)

    def pane(x0, y0, x1, y1, plants=0.0, seed=0):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                cv.put(x, y, 'G1' if y == y0 else 'G2')
        if plants:
            top = y1 - round((y1 - y0) * plants)
            for x in range(x0, x1 + 1):
                yy = top + round(1.5 * math.sin((x + seed) * 1.3))
                for y in range(max(y0 + 1, yy), y1 + 1):
                    cv.put(x, y, 'V8' if y == max(y0 + 1, yy) else 'V6' if y < yy + 3 else 'V2')
        for y in range(y0 + 1, y1 + 1):                       # reflet diagonal
            for x in range(x0, x1 + 1):
                d = (x - x0) + (y - y0)
                if d in (3 + seed % 3, 4 + seed % 3):
                    if cv.get(x, y)[:3] == PAL['G2']:
                        cv.put(x, y, 'G3')
        cv.put(x0, y0 + 2, 'A1')

    def wing(x0, x1, seed):
        for y in range(16, 26):                               # toit de verre
            for x in range(x0, x1 + 1):
                cv.put(x, y, 'G3' if y < 19 else 'G2')
        for x in range(x0, x1 + 1, 5):
            cv.vline(x, 16, 25, 'G0')
        cv.hline(x0, x1, 26, 'G0'); cv.hline(x0, x1, 27, 'V1')   # chéneau
        w = (x1 - x0) // 3
        for i in range(3):
            a, b = x0 + i * w, x0 + (i + 1) * w if i < 2 else x1
            pane(a + 1, 28, b - 1, 35, 0, seed + i)
            pane(a + 1, 37, b - 1, 77, 0.45, seed * 7 + i * 3)
            cv.vline(a, 28, 78, 'G0')
        cv.vline(x1, 28, 78, 'G0')
        cv.hline(x0, x1, 36, 'G0')
        cv.hline(x0, x1, 78, 'G0')
        cv.hline(x0, x1, 79, 'V1')

    wing(1, 29, 1)
    wing(66, 94, 2)
    # pavillon central : ogive
    CX0, CX1, MID = 30, 65, 47.5
    for y in range(4, 28):
        r = 27.0
        half = (CX1 - CX0) / 2
        dy = 27 - y
        if dy > r:
            continue
        hw = MID - (MID - half + r - math.sqrt(max(0, r * r - dy * dy)))
        for x in range(CX0, CX1 + 1):
            d = abs(x + 0.5 - (MID + 0.5))
            if d <= hw - 1:
                cv.put(x, y, 'G3' if (x < MID and y < 14) else 'G2' if x < MID + 6 else 'G1')
            elif d <= hw:
                cv.put(x, y, 'G0')
    for y in range(5, 28):
        cv.put(int(MID), y, 'G0'); cv.put(int(MID) + 1, y, 'G0')
    for x in range(CX0 + 3, CX1 - 2):                         # traverse courbe
        d = abs(x + 0.5 - (MID + 0.5))
        cv.put(x, 15 + round((d / 17.5) ** 2 * 5), 'G0')
    cv.put(int(MID), 2, 'A4'); cv.put(int(MID), 3, 'A6'); cv.put(int(MID) + 1, 3, 'A6')   # épi
    cv.hline(CX0, CX1, 28, 'G0'); cv.hline(CX0, CX1, 29, 'V1')
    pane(CX0 + 1, 30, CX0 + 8, 77, 0.45, 11)
    pane(CX1 - 8, 30, CX1 - 1, 77, 0.45, 4)
    for x in (CX0, CX0 + 9, CX1 - 9, CX1):
        cv.vline(x, 30, 78, 'G0')
    # imposte et double porte vitrée
    for y in range(31, 40):
        for x in range(CX0 + 10, CX1 - 9):
            d = math.hypot(x + 0.5 - (MID + 0.5), (y + 0.5 - 40) * 1.2)
            if d <= 8:
                cv.put(x, y, 'G0' if d > 7 else 'G3' if x < MID else 'G2')
    cv.hline(CX0 + 10, CX1 - 10, 40, 'G0')
    for a, b in ((CX0 + 10, int(MID)), (int(MID) + 1, CX1 - 10)):
        pane(a + 1, 42, b - 1, 70, 0, a)
        cv.rect(a + 1, 71, b - 1, 77, 'G0')
        cv.hline(a + 1, b - 1, 71, 'G1')
        cv.box(a, 41, b, 78, 'G0')
    cv.put(int(MID) - 2, 58, 'A4'); cv.put(int(MID) + 3, 58, 'A4')
    cv.hline(CX0, CX1, 78, 'G0')
    cv.hline(0, 95, 79, 'V1')
    outline_by_material(cv)
    return cv.im


# ================================================================ silo, puits, citerne

def silo():
    """Silo (32 × 64) : toit conique prune, fût de douelles de bois, soubassement de pierres."""
    cv = Canvas(32, 64)
    stones(cv, 3, 52, 28, 63, 6, 4, seed=2)
    for y in range(18, 52):
        for x in range(4, 28):
            k = (x - 4) / 23
            c = 'W4' if k < 0.15 else 'W3' if k < 0.55 else 'W2' if k < 0.85 else 'W1'
            if (x - 4) % 4 == 3 and c != 'W1':
                c = 'W2'
            cv.put(x, y, c)
    for y in (26, 42):
        cv.hline(4, 27, y, 'W1')
    for y in range(2, 20):
        half = (y - 2) * 0.8 + 1
        for x in range(32):
            rel = (x + 0.5 - 16) / half
            if abs(rel) <= 1:
                rr = y - 2
                c = roof_color(rr, x, rel < 0, 'prune', rr / 18)
                cv.put(x, y, c)
    outline_by_material(cv)
    return cv.im


def puits(kind):
    """Puits (48 × 48) : margelle de pierres, eau sombre, deux poteaux, treuil, seau, toit prune.
    `kind` : 'puits' (seul), 'tuyau' (avec le tuyau de la pompe), 'pompe' (la pompe seule, posée
    par-dessus ; acier non observé dans le guide : rampe de la roche R)."""
    cv = Canvas(48, 48)
    CX = 21                                                    # puits et pompe ensemble : centrés
    PX = CX + 15                                               # bord gauche de la pompe
    if kind == 'pompe':
        cv.rect(PX, 31, PX + 7, 46, 'R2')
        cv.vline(PX, 31, 46, 'R3')
        cv.vline(PX + 7, 31, 46, 'R1')
        cv.rect(PX + 1, 26, PX + 6, 30, 'R2')
        cv.vline(PX + 1, 26, 30, 'R3'); cv.vline(PX + 6, 26, 30, 'R1')
        cv.hline(PX, PX + 7, 35, 'R1')
        cv.put(PX + 5, 40, 'A4')
        shape = lambda x, y: (PX <= x <= PX + 7 and 31 <= y <= 46) or (PX + 1 <= x <= PX + 6 and 26 <= y <= 30)
        for y in range(48):
            for x in range(48):
                if not shape(x, y) and any(shape(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    cv.put(x, y, 'N2')
        return cv.im
    # margelle : cylindre de pierres
    for y in range(28, 47):
        for x in range(CX - 12, CX + 13):
            if abs(x + 0.5 - (CX + 0.5)) > 12:
                continue
            row = (y - 28) // 4
            k = (y - 28) % 4
            kx = (x + (row % 2) * 3) % 6
            rel = (x + 0.5 - CX) / 12
            if k == 3 or kx == 5:
                c = 'B0'
            elif rel < -0.4 or k == 0:
                c = 'B2'
            else:
                c = 'B1'
            cv.put(x, y, c)
    for x in range(CX - 11, CX + 12):                          # ouverture : eau sombre
        for y in range(25, 30):
            if ((x + 0.5 - (CX + 0.5)) / 10) ** 2 + ((y + 0.5 - 27.5) / 2.4) ** 2 <= 1:
                cv.put(x, y, 'E0' if y < 28 else 'E1')
    for x in range(CX - 12, CX + 13):
        cv.put(x, 24 if abs(x - CX) < 9 else 25, 'B2')
    # poteaux, treuil, corde, seau
    for px_ in (CX - 11, CX + 10):
        cv.vline(px_, 9, 26, 'W4'); cv.vline(px_ + 1, 9, 26, 'W2')
    cv.hline(CX - 10, CX + 10, 13, 'W3'); cv.hline(CX - 10, CX + 10, 14, 'W1')
    cv.vline(CX, 15, 18, 'W1')
    cv.rect(CX - 2, 19, CX + 2, 22, 'W3'); cv.hline(CX - 2, CX + 2, 19, 'W4'); cv.hline(CX - 2, CX + 2, 22, 'W1')
    # toit prune
    for y in range(1, 10):
        half = (y - 1) * 1.7 + 1
        for x in range(48):
            rel = (x + 0.5 - (CX + 0.5)) / half
            if abs(rel) <= 1:
                cv.put(x, y, roof_color(y - 1, x, rel < 0, 'prune', (y - 1) / 9))
    if kind == 'tuyau':
        cv.hline(CX + 6, PX + 1, 30, 'R3'); cv.hline(CX + 6, PX + 1, 31, 'R1')
        cv.vline(CX + 6, 27, 31, 'R2')
    outline_by_material(cv)
    return cv.im


def citerne(niveau):
    """Citerne (32 × 48) : cuve de tôle (rampe de la roche, l'acier n'est pas observé), cerclages,
    tube de niveau (verre G, eau E1 et E2), socle de planches ; `niveau` de 0 (vide) à 4 (plein)."""
    cv = Canvas(32, 48)
    for y in range(10, 40):
        for x in range(5, 26):
            k = (x - 5) / 20
            c = 'R3' if k < 0.2 else 'R2' if k < 0.65 else 'R1'
            if y in (18, 30):
                c = 'R1'                                               # cerclages
            cv.put(x, y, c)
    for x in range(5, 26):                                     # couvercle, vu de dessus
        for y in range(6, 10):
            cv.put(x, y, 'R3' if x < 15 else 'R2')
    cv.rect(12, 4, 18, 6, 'R2'); cv.hline(12, 18, 4, 'R3')
    g0, g1 = 13, 36                                            # tube de niveau
    plein = round((g1 - g0 + 1) * niveau / 4)
    for y in range(g0, g1 + 1):
        filled = y > g1 - plein
        cv.put(19, y, 'E2' if filled else 'G3')
        cv.put(20, y, 'E1' if filled else 'G3')
    cv.box(18, g0 - 1, 21, g1 + 1, 'W0')
    planks(cv, 3, 40, 28, 45, False, 3, 'W3')                 # socle
    cv.hline(0, 4, 17, 'R3'); cv.hline(0, 4, 18, 'R1')        # arrivée du tuyau de la pompe
    outline_by_material(cv)
    return cv.im


# ================================================================ planche et contrôle

def main():
    entries = [
        ('maison', [maison()], 'batiment_construit_maison_96x96.png'),
        ('etable', [etable()], 'batiment_construit_etable_112x96.png'),
        ('moulin', [moulin(i) for i in range(4)], 'batiment_construit_moulin_96x128.png'),
        ('serre', [serre()], 'batiment_verre_serre_96x80.png'),
        ('poulailler', [poulailler(i) for i in range(3)], 'batiment_construit_poulailler_48x64.png'),
        ('silo', [silo()], 'batiment_construit_silo_32x64.png'),
        ('puits', [puits(k) for k in ('puits', 'tuyau', 'pompe')], 'batiment_construit_puits_48x48.png'),
        ('citerne', [citerne(i) for i in range(5)], 'objet_construit_citerne_32x48.png'),
        ('panneaux_toit', [panneaux_toit(n) for n in range(1, 7)], None),
    ]
    MAXW, GAP = 512, 2
    placed, x, y, row_h = {}, 0, 0, 0
    for name, ims, _ in entries:
        w, h = ims[0].size
        total = len(ims) * w + (len(ims) - 1) * GAP
        if x and x + total > MAXW:
            x, y, row_h = 0, y + row_h + GAP, 0
        placed[name] = {'x': x, 'y': y, 'w': w, 'h': h, 'images': len(ims), 'ims': ims}
        x += total + GAP
        row_h = max(row_h, h)
    sheet_w = max(p['x'] + p['images'] * (p['w'] + GAP) - GAP for p in placed.values())
    sheet = Image.new('RGBA', (sheet_w, y + row_h), (0, 0, 0, 0))
    for p in placed.values():
        for i, im in enumerate(p['ims']):
            sheet.alpha_composite(im, (p['x'] + i * (p['w'] + GAP), p['y']))
    sheet.save(os.path.join(ASSETS, 'batiments_remaster.png'))
    atlas = {'//': 'Planche des bâtiments (scripts/batiments/remaster.py) : nom → coin haut-gauche de la première image, '
                   'taille d\'une image, nombre d\'images ; les images d\'un bâtiment se suivent vers la droite, à 2 px d\'écart. '
                   'panneaux_toit se pose au point (39, 2) de la maison.',
             'ecart': GAP}
    atlas.update({k: {kk: v for kk, v in p.items() if kk != 'ims'} for k, p in placed.items()})
    with open(os.path.join(ASSETS, 'batiments_remaster.json'), 'w', encoding='utf8') as f:
        json.dump(atlas, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'assets/batiments_remaster.png : {sheet_w}×{y + row_h}, {len(placed)} bâtiments')
    if '--qa' in sys.argv:
        sprites = {}
        for name, ims, qa_name in entries:
            if not qa_name:
                continue
            for i, im in enumerate(ims[:2] if name == 'puits' else ims):
                nm = qa_name if len(ims) == 1 else qa_name.replace('.png', f'_v{i}.png')
                sprites[nm] = im
        rejets, rapport = qa(sprites, os.path.join(ROOT, 'qa_batiments'))
        print(rapport)
        print(f'{len(sprites) - rejets}/{len(sprites)} sprites conformes')
    return placed


if __name__ == '__main__':
    main()
