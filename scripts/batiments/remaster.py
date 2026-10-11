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
from pastoral import OMBRE_CONTACT, PAL, Canvas, amas, level, outline_feuillage, qa  # noqa: E402

PRUNE = {'o': 'N0', 's': 'N1', 'm': 'N2', 'l': 'N3'}          # toiture des maisons
BRUN = {'o': 'W0', 's': 'W1', 'm': 'W2', 'l': 'W3', 'h': 'W4'}  # bardeaux bruns


# ================================================================ motifs

def roof_color(rr, x, lit, roof='prune', t=0.5):
    """Couleur d'un pixel de toiture : `rr` = distance au haut du pan (rangs de 5 px), `x` la
    colonne (tuiles de 10 px, joints décalés d'un rang à l'autre), `lit` le pan éclairé, `t` la
    position de 0 (faîtage) à 1 (égout). Le pan s'assombrit vers l'égout."""
    row, k = divmod(int(rr), 5)
    if roof == 'prune':
        if t > 0.94:
            return 'N0'                                        # épaisseur du débord, vue par-dessous
        if k == 4 or (x + (row % 2) * 5) % 10 == 0:
            return 'N0'                                        # joints
        if t > 0.84:
            return 'N1'                                        # dernier rang, sous son débord
        if lit:
            return 'N3' if k == 0 or (k == 1 and t < 0.4) else 'N2'
        return 'N2' if k == 0 and t < 0.45 else 'N1'
    # bardeaux bruns
    if t > 0.94:
        return 'W0'
    if k == 4 or (x + (row % 2) * 5) % 10 == 0:
        return 'W1'
    if t > 0.84:
        return 'W1'
    if lit:
        return 'W4' if k == 0 or (k == 1 and t < 0.4) else 'W3'
    return 'W3' if k == 0 and t < 0.45 else 'W2'


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


def remonter(cv, n):
    """Remonte le dessin de `n` px (ses `n` premières rangées doivent être vides), pour laisser
    la place de l'ombre au sol sous le pied."""
    im = cv.im.crop((0, n, cv.w, cv.h))
    cv.im = Image.new('RGBA', (cv.w, cv.h), (0, 0, 0, 0))
    cv.im.paste(im, (0, 0))
    cv.px = cv.im.load()


def ombre_sol(cv, rows=2, bande=10, extra=()):
    """Ombre au sol (prune translucide, guide : ombre de contact) : sous chaque colonne dont le
    bas touche la bande du sol (les `bande` dernières rangées), sur `rows` rangées transparentes ;
    `extra` : flaques (cx, rx, bas) au pied des parties posées sur des piliers."""
    for x in range(cv.w):
        low = max((y for y in range(cv.h) if cv.px[x, y][3] == 255), default=None)
        if low is None or low < cv.h - bande:
            continue
        for y in range(low + 1, min(cv.h, low + 1 + rows)):
            if cv.px[x, y][3] == 0:
                cv.px[x, y] = OMBRE_CONTACT
    for cx, rx, bottom in extra:
        for y in range(bottom - 2, bottom + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - bottom - 0.5) / 3.5) ** 2 <= 1:
                    if 0 <= x < cv.w and 0 <= y < cv.h and cv.px[x, y][3] == 0:
                        cv.px[x, y] = OMBRE_CONTACT


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


def toit_3d(cv, R, xl, xr, ey, ay, D, roof='prune'):
    """Toit à pignon sur rue, vu de trois quarts : le pignon avant (rives de (xl, ey) au
    faîte (R, ay) puis à (xr, ey)) et, derrière, les deux pans qui filent vers le fond sur `D`
    px (le faîtage monte à la verticale de l'écran). Pan gauche éclairé, pan droit dans l'ombre ;
    rangs de tuiles parallèles au faîtage (donc verticaux à l'écran), joints décalés ; égout
    plus sombre ; faîtage de bois ; planche de rive de 2 px à l'avant.
    Renvoie `pan(x, y)` → (côté, s, z) ou None : s de 0 (égout) à 1 (faîte), z la profondeur."""
    pr = roof == 'prune'
    T = {'g': ('N2', 'N3', 'N1'), 'd': ('N1', 'N2', 'N0')} if pr else \
        {'g': ('W3', 'W4', 'W2'), 'd': ('W2', 'W3', 'W1')}

    def pan(x, y):
        if xl <= x < R:
            side, s = 'g', (x + 0.5 - xl) / (R - xl)
        elif R < x <= xr:
            side, s = 'd', (xr + 0.5 - x) / (xr - R)
        else:
            return None
        yf = ey + s * (ay - ey)                               # rive avant à cette colonne
        z = yf - (y + 0.5)
        if 0 <= z <= D:
            return side, s, z
        return None
    for y in range(cv.h):
        for x in range(cv.w):
            q = pan(x, y)
            if q is None:
                continue
            side, s, z = q
            base, light, dark = T[side]
            w = s * ((R - xl) if side == 'g' else (xr - R))
            col = int(w / 5)                                  # rang de tuiles (vertical à l'écran)
            c = base
            if w % 5 < 1:
                c = dark
            elif (z + (col % 2) * 4) % 8 < 1:
                c = dark                                      # joint entre deux tuiles du rang
            elif w % 5 >= 4 and side == 'g':
                c = light                                     # arête éclairée de chaque rang
            if s < 0.05:
                c = dark                                      # l'égout
            if z < 2:
                c = ('W4' if z < 1 else 'W2') if side == 'g' else ('W2' if z < 1 else 'W1')   # planche de rive
            cv.put(x, y, c)
    for y in range(int(ay - D), int(ay) + 1):                 # faîtage de bois
        cv.put(R, y, 'W4' if y < ay - 1 else 'W3')
    return pan


def gable_wall(cv, ridge, x0, x1, top_y, bottom_y, timber=True):
    """Pignon : enduit P4 sous les pans, bande C0 sous la sous-face (ombre de surplomb),
    colombage W3 (sablière et deux poteaux)."""
    def inside(x, y):
        return x0 <= x <= x1 and top_y + abs(x - ridge) // 2 <= y <= bottom_y
    for y in range(cv.h):
        for x in range(cv.w):
            if inside(x, y):
                t = y - (top_y + abs(x - ridge) // 2)
                cv.put(x, y, 'C0' if t < 3 else 'P4')         # ombre de surplomb sous les pans
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
    gable_wall(cv, R, 9, 67, 23, 50)
    window8(cv, R - 4, 36)
    toit_3d(cv, R, 5, 70, 40, 22, 20)
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
            cv.put(x, y, 'C0' if y < 64 or y == 79 else 'P4')   # ombre de l'auvent, pied du mur
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
    ombre_sol(cv)                                             # sous la terrasse, entre les pieds
    return cv.im


def panneaux_toit(n):
    """Panneaux solaires sur le pan droit de la maison (32 × 48, posés au point (39, 2)) : chaque
    panneau suit le pan vu de trois quarts (bords parallèles à la rive et au faîtage) ; cellules
    A0 quadrillées de A1, reflet A3, cadre R3 côté faîte et fond, R1 côté égout et avant."""
    cv = Canvas(32, 48)
    OX, OY = 39, 2
    R, XR, EY, AY = 38, 70, 40, 22
    places = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)][:n]
    W = XR - R
    for row, col in places:                                  # row 0 : près du faîte ; col : vers le fond
        s0, s1 = (0.93, 0.55) if row == 0 else (0.5, 0.12)
        z0, z1 = 3 + col * 5.6, 3 + col * 5.6 + 4.6
        for x in range(R + 1, XR + 1):
            s_ = (XR + 0.5 - x) / W
            if not (s1 <= s_ <= s0):
                continue
            yf = EY + s_ * (AY - EY)
            for y in range(int(yf - z1) - 1, int(yf - z0) + 2):
                z = yf - (y + 0.5)
                if not (z0 <= z <= z1):
                    continue
                es0, es1, ez0, ez1 = (s0 - s_) * W, (s_ - s1) * W, z - z0, z1 - z
                if es0 < 1 or ez1 < 0.9:
                    c = 'R3'
                elif es1 < 1 or ez0 < 0.9:
                    c = 'R1'
                elif int(es1) % 4 == 0 or int(ez0) % 3 == 0:
                    c = 'A1'
                else:
                    c = 'A0'
                cv.put(x - OX, y - OY, c)
        x = round(XR + 0.5 - (s0 - 0.1) * W)                  # reflet près du faîte
        y = round(EY + (s0 - 0.1) * (AY - EY) - z1 + 2)
        for dx, dy in ((0, 0), (0, 1), (1, 1)):
            if cv.get(x + dx - OX, y + dy - OY)[:3] == PAL['A0']:
                cv.put(x + dx - OX, y + dy - OY, 'A3')
    return cv.im


# ================================================================ l'étable (112 × 96)

def etable():
    """Étable : toit de bardeaux bruns, pignon d'enduit à croix de Saint-André et lucarne ronde,
    murs de planches verticales, grande double porte à écharpes, deux baies sombres."""
    cv = Canvas(112, 96)
    R = 56
    gable_wall(cv, R, 6, 106, 33, 56)
    for y in range(44, 56):                                   # croix du pignon
        t = (y - 44) / 11
        for s in (-1, 1):
            x = round(R + s * (9 + t * 24))
            cv.put(x, y, 'W3'); cv.put(x + 1, y, 'W2')
    for y in range(40, 51):                                   # lucarne ronde
        for x in range(49, 64):
            d = math.hypot(x + 0.5 - (R + 0.5), (y + 0.5 - 45.5) * 1.1)
            if d <= 5.4:
                cv.put(x, y, 'W0' if d > 4.4 else 'B0' if y > 45 else 'N1')
    toit_3d(cv, R, 3, 108, 57, 30, 27, 'brun')
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
    ombre_sol(cv)
    return cv.im


# ================================================================ le poulailler (48 × 64 × 3)

def poulailler(porte):
    """Poulailler : toit prune, mur d'enduit et colombage, lucarne, porte ronde (fermée,
    entrouverte, ouverte), pilotis et rampe."""
    cv = Canvas(48, 64)
    R = 24
    for y in range(25, 50):                                   # mur
        for x in range(7, 41):
            cv.put(x, y, 'C0' if y < 28 else 'P4')
    cv.vline(7, 25, 49, 'W3'); cv.vline(40, 25, 49, 'W3')
    cv.hline(7, 40, 35, 'W3'); cv.hline(7, 40, 49, 'W2')
    window8(cv, 28, 28)

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
    gable_wall(cv, R, 8, 39, 15, 25, timber=False)
    toit_3d(cv, R, 2, 45, 26, 15, 13)
    # pilotis et rampe
    for fx in (9, 37):
        cv.rect(fx, 50, fx + 2, 63, 'W2')
        cv.vline(fx, 50, 63, 'W4')
    for i in range(12):
        x, y = 19 + i, 50 + i * 0.9
        cv.put(x, int(y), 'W4'); cv.put(x, int(y) + 1, 'W3'); cv.put(x, int(y) + 2, 'W1')
    outline_by_material(cv)
    ombre_sol(cv, extra=((24, 20, 63),))                      # sous le poulailler, entre ses pilotis
    return cv.im


# ================================================================ le moulin (96 × 128 × 4)

K_ELL = 0.3                                                   # vue de trois quarts : ry = 0,3 × rx


def revolution(cv, cx, profil, paint, pente=0.0):
    """Surface de révolution vue de trois quarts (fût, tronc de cône, dôme) : `profil(h)`
    donne, pour h de 0 (haut) à 1 (bas), le centre vertical et le rayon de la section ; chaque
    section est une ellipse aplatie (K_ELL), seule sa moitié avant se voit. `paint(x, y, u, v,
    lv, t)` reçoit l'angle `t` (−π/2 à gauche, 0 devant, π/2 à droite), `u` la longueur d'arc,
    `v` = h, le niveau de lumière `lv` (flanc gauche éclairé ; `pente` > 0 éclaire une surface
    tournée vers le ciel, comme un toit). Renvoie {pixel: (t, h)}."""
    y0, r0 = profil(0)
    y1, r1 = profil(1)
    nh = int(abs(y1 - y0) * 3) + 4
    seen = {}
    for i in range(nh + 1):
        h = i / nh
        yc, r = profil(h)
        nt = int(r * 6) + 8
        for j in range(nt + 1):
            t = -math.pi / 2 + math.pi * j / nt
            x = int(math.floor(cx + r * math.sin(t)))
            y = int(math.floor(yc + r * K_ELL * math.cos(t)))
            seen[(x, y)] = (t, h, r)
    for (x, y), (t, h, r) in seen.items():
        lv = level(math.sin(t) * 1.05, -pente - 0.05 + 0.25 * (1 - math.cos(t)) * 0)
        paint(x, y, r * (t + math.pi / 2), h, lv, t)
    return {k: v[:2] for k, v in seen.items()}


ASSOMBRIR = {'C1': 'P4', 'P4': 'C0', 'P3': 'C0', 'C0': 'P1', 'P1': 'P0', 'B2': 'B1', 'B1': 'R1', 'R1': 'B0',
             'W4': 'W2', 'W3': 'W2', 'W2': 'W1', 'W1': 'W0', 'G3': 'G1', 'G2': 'G1', 'G1': 'G0'}


def assombrir(cv, x, y):
    """Un ton plus sombre, dans la même matière (ombre portée)."""
    c = cv.get(x, y)
    if c[3] != 255:
        return
    for k, v in ASSOMBRIR.items():
        if c[:3] == PAL[k]:
            cv.put(x, y, v)
            return


def moulin(n):
    """Moulin, volume de révolution : soubassement rond de pierres (rangs courbes), tour
    d'enduit qui s'affine vers le haut, colombages qui suivent la courbure, fenêtres en
    retrait, galerie ronde de planches avec sa balustrade, chapeau en dôme de bardeaux avec
    son débord et l'ombre qu'il jette sur la tour ; quatre ailes de toile (C1, C0) sur un
    treillis W3, au bout d'un arbre qui sort du chapeau, tournant d'un huitième de tour par
    image ; les ailes portent leur ombre sur la tour ; ombre ronde au sol."""
    cv = Canvas(96, 128)
    CX = 48
    pierre = pierres_rondes(4, 7)
    # soubassement : de y 96 (r 19) à y 117 (r 20)
    revolution(cv, CX, lambda h: (96 + 21 * h, 19 + 1.2 * h),
               lambda x, y, u, v, lv, t: cv.put(x, y, pierre(x, y, u, (v * 21) + 0.5, lv)))
    # tour d'enduit : de y 54 (r 14) à y 95 (r 17)
    ENDUIT = ('P1', 'C0', 'P3', 'P4', 'C1')

    def enduit(x, y, u, v, lv, t):
        c = ENDUIT[lv]
        if any(abs(t - a) < 0.07 for a in (-1.05, -0.35, 0.35, 1.05)) or abs(v - 0.5) < 0.018:
            c = 'W3' if lv >= 2 else 'W2'                      # colombages : ils suivent la courbe
        cv.put(x, y, c)
    revolution(cv, CX, lambda h: (54 + 41 * h, 14 + 3 * h), enduit)
    # fenêtres en retrait, plus étroites vers les bords
    for t0, yw in ((-0.75, 60), (0.1, 60), (-0.2, 74), (0.75, 74)):
        xc = CX + 15 * math.sin(t0)
        w = max(4, round(8 * math.cos(t0)))
        x0 = round(xc - w / 2)
        yy = yw + round(15 * K_ELL * math.cos(t0))
        cv.rect(x0 - 1, yy - 1, x0 + w, yy + 8, 'W1')        # encadrement
        cv.rect(x0, yy, x0 + w - 1, yy + 7, 'G2')
        cv.hline(x0, x0 + w - 1, yy, 'G0'); cv.vline(x0, yy, yy + 7, 'G0')   # ébrasement dans l'ombre
        cv.hline(x0 + 1, x0 + w - 1, yy + 1, 'G1')
        if w >= 6:
            cv.vline(x0 + w // 2, yy + 1, yy + 7, 'W2'); cv.hline(x0 + 1, x0 + w - 1, yy + 4, 'W2')
        cv.put(x0 + 1 + (w > 5), yy + 2, 'G3')
        cv.hline(x0 - 1, x0 + w, yy + 8, 'W3')              # appui
    # galerie ronde à y 93 : plancher (dessus et tranche), balustrade sur la moitié avant
    RG = 24
    for (x, y) in disque(CX, 93, RG, RG * K_ELL):
        d = math.hypot((x + 0.5 - CX) / RG, (y + 0.5 - 93) / (RG * K_ELL))
        tour = ((x + 0.5 - CX) / 17.2) ** 2 + ((y + 0.5 - 93) / (17.2 * K_ELL)) ** 2 < 1 and y + 0.5 < 93
        if tour:
            continue                                            # la tour passe derrière la galerie
        cv.put(x, y, 'W4' if x < CX - 6 else 'W3' if x < CX + 10 else 'W2')
        if int(math.atan2(y + 0.5 - 93, (x + 0.5 - CX) / 3.3) * 6) % 2 == 0 and d > 0.4:
            cv.put(x, y, 'W3' if x < CX + 10 else 'W1')         # planches rayonnantes
    for x in range(CX - RG, CX + RG + 1):                       # tranche du plancher
        dx = x + 0.5 - CX
        e = ellipse_e(dx, RG, RG * K_ELL)
        for k in range(2):
            cv.put(x, int(93 + e) + 1 + k, 'W1' if dx < 10 else 'W0')
    for i in range(13):                                         # balustrade : poteaux et lisse
        t = -math.pi / 2 + math.pi * (i + 0.5) / 13
        x = int(CX + (RG - 1.5) * math.sin(t))
        y = int(93 + (RG - 1.5) * K_ELL * math.cos(t))
        cv.vline(x, y - 5, y, 'W3' if t < 0.3 else 'W2')
    for x in range(CX - RG + 2, CX + RG - 1):
        dx = x + 0.5 - CX
        y = int(93 + ellipse_e(dx, RG - 1.5, (RG - 1.5) * K_ELL)) - 5
        cv.put(x, y, 'W4' if dx < -4 else 'W3' if dx < 10 else 'W2')
    # porte cintrée, en retrait, et sa marche
    cv.rect(41, 106, 54, 123, 'B0')
    for y in range(107, 124):
        for x in range(42, 54):
            if y < 112 and math.hypot(x + 0.5 - 48, (y + 0.5 - 112) * 1.2) > 6:
                continue
            cv.put(x, y, 'W1' if x < 44 or y < 109 else 'W3' if (x - 42) % 4 else 'W2')
    cv.put(51, 116, 'A4')
    for (x, y) in disque(48, 124.5, 9, 2):
        cv.put(x, y, 'B2' if x < 48 else 'B1')
    ivy(cv, 31, 119, 4, 6, 3)
    ivy(cv, 66, 121, 4, 4, 8)
    # chapeau en dôme : du sommet (y 22) à la base (y 50, r 19), débord sur la tour
    def bardeau(x, y, u, v, lv, t):
        row = int(v * 28 / 4)
        if v > 0.93:
            c = 'W0' if v > 0.97 else 'W1'                      # épaisseur du débord
        elif (v * 28) % 4 < 1 or (u + row * 4) % 8 < 1:
            c = ('W0', 'W1', 'W2', 'W2', 'W3')[lv]              # rangs et joints des bardeaux
        else:
            c = ('W1', 'W2', 'W3', 'W4', 'W4')[lv]
        cv.put(x, y, c)
    revolution(cv, CX, lambda h: (22 + 28 * h, 1.5 + 17.5 * math.sqrt(h)), bardeau, pente=0.35)
    for x in range(CX - 18, CX + 19):                           # ombre du débord sur la tour
        dx = x + 0.5 - CX
        y0 = int(50 + ellipse_e(dx, 19, 19 * K_ELL)) + 1
        for y in range(y0, y0 + 3):
            assombrir(cv, x, y)
    # ailes, au bout de l'arbre qui sort du chapeau
    HX, HY = 48, 46
    cv.rect(HX - 1, HY - 1, HX + 1, HY + 4, 'W2'); cv.vline(HX - 1, HY - 1, HY + 4, 'W3')
    a0 = n * math.pi / 8
    L, W0_, W1_ = 40, 2.0, 9.0
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
                    elif W0_ <= v <= W1_ and u >= 8:
                        lattice = int(u) % 6 == 0 or abs(v - (W0_ + W1_) / 2) < 0.5
                        shapes[(x, y)] = 'W2' if lattice else ('C1' if v < 5 else 'C0')
    for (x, y) in shapes:                                       # ombre des ailes sur la tour
        q = (x + 3, y + 4)
        if q not in shapes:
            assombrir(cv, *q)
    for (x, y), c in shapes.items():
        cv.put(x, y, c)
    for y in range(HY - 3, HY + 4):                           # moyeu
        for x in range(HX - 3, HX + 4):
            d = math.hypot(x + 0.5 - HX, y + 0.5 - HY)
            if d <= 3.2:
                cv.put(x, y, 'W0' if d > 2.3 else 'W4' if x < HX and y < HY else 'W3')
    outline_by_material(cv)
    ombre_ronde(cv, CX, 118, 20.5, 6)
    return cv.im


# ================================================================ la serre (96 × 80)

def serre():
    """Serre en volume : deux ailes en retrait (leur pied est plus haut que celui du pavillon)
    sous des toits de verre en croupe vus de dessus (pan avant éclairé, petits-bois qui
    convergent vers la croupe, faîtage), un pavillon central qui avance, coiffé d'un dôme dont
    les côtes s'incurvent ; montants épais (ombre de chaque montant sur la vitre), traverses qui
    ombrent le dessous, intérieur visible (cadres du mur du fond, plantes sur deux rangs, table) ;
    le pavillon jette son ombre sur l'aile droite ; contour V1. Posée à même le sol."""
    cv = Canvas(96, 80)
    WB, PB = 75, 78                                           # pieds des ailes et du pavillon

    def interieur(x0, y0, x1, y1, seed, plantes=True):
        """Vitre et ce qu'on voit derrière : cadres du mur du fond (plus haut), plantes."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                cv.put(x, y, 'G2')
        for x in range(x0, x1 + 1):                           # mur du fond : montants vus à travers
            if (x - x0 + seed) % 7 == 3:
                cv.vline(x, y0, y1, 'G1')
        back = y1 - round((y1 - y0) * 0.5)                    # rang du fond : plus haut, plus sombre
        front = y1 - round((y1 - y0) * 0.3)
        for x in range(x0, x1 + 1 if plantes else x0):
            yb = back + round(1.6 * math.sin((x + seed) * 0.9))
            for y in range(max(y0 + 1, yb), y1 + 1):
                cv.put(x, y, 'V2' if y > yb else 'V6')
            yf = front + round(1.5 * math.sin((x + seed) * 1.4 + 1))
            for y in range(max(y0 + 1, yf), y1 - 2):
                cv.put(x, y, 'V8' if y == yf else 'V6' if y < yf + 3 else 'V2')
            cv.put(x, y1 - 2, 'W2'); cv.put(x, y1 - 1, 'W1')    # table de culture
        for y in range(y0, y1 + 1):                           # reflet diagonal
            for x in range(x0, x1 + 1):
                d = (x - x0) + (y - y0)
                if d in (3 + seed % 3, 4 + seed % 3) and cv.get(x, y)[:3] in (PAL['G2'], PAL['G1']):
                    cv.put(x, y, 'G3')
        cv.put(x0, y0 + 2, 'A1')

    def montants(x0, x1, xs, y0, y1):
        for x in xs:
            cv.vline(x, y0, y1, 'G0')
            for y in range(y0, y1 + 1):                       # ombre du montant sur la vitre
                if x + 1 <= x1 and cv.get(x + 1, y)[:3] in (PAL['G2'], PAL['G3']):
                    cv.put(x + 1, y, 'G1')

    def aile(x0, x1, outer, seed):
        EAVE, RIDGE, HIP = 27, 13, 9
        # toit en croupe : pan avant (trapèze), faîtage, petits-bois qui convergent
        for y in range(RIDGE, EAVE + 1):
            f = (y - RIDGE) / (EAVE - RIDGE)                  # 0 au faîtage, 1 à l'égout
            inset = round(HIP * (1 - f))
            a = x0 + inset if outer == 'g' else x0
            b = x1 - inset if outer == 'd' else x1
            for x in range(a, b + 1):
                c = 'G3' if f < 0.3 else 'G2' if f < 0.85 else 'G1'
                cv.put(x, y, c)
            for k in range(0, 7):                             # petits-bois
                xa = x0 + (x1 - x0) * k / 6
                xr = x0 + HIP + (x1 - x0 - HIP) * k / 6 if outer == 'g' else x0 + (x1 - HIP - x0) * k / 6
                x = round(xr + (xa - xr) * f)
                if a <= x <= b:
                    cv.put(x, y, 'G0')
                    if x + 1 <= b and f > 0.1:
                        cv.put(x + 1, y, 'G1' if f > 0.5 else 'G2')
            cv.put(a, y, 'G0'); cv.put(b, y, 'G0')            # arêtiers
        ra = x0 + HIP if outer == 'g' else x0
        rb = x1 - HIP if outer == 'd' else x1
        cv.hline(ra, rb, RIDGE, 'G0')
        cv.hline(ra, rb, RIDGE - 1, 'V1')                     # crête du faîtage
        for x in range(ra + 2, rb - 1, 5):
            cv.put(x, RIDGE - 2, 'V1')
        cv.hline(x0, x1, EAVE + 1, 'G0'); cv.hline(x0, x1, EAVE + 2, 'V1')   # chéneau
        # façade : imposte, traverse, grandes vitres
        w = (x1 - x0) // 3
        for i in range(3):
            aa, bb = x0 + i * w, x0 + (i + 1) * w if i < 2 else x1
            interieur(aa + 1, EAVE + 3, bb - 1, 35, seed + i, plantes=False)
            interieur(aa + 1, 37, bb - 1, WB - 1, seed * 7 + i * 3)
        for y in (EAVE + 3, EAVE + 4):                        # ombre du chéneau sur la façade
            for x in range(x0, x1 + 1):
                assombrir(cv, x, y)
        cv.hline(x0, x1, 36, 'G0')
        for x in range(x0, x1 + 1):
            assombrir(cv, x, 37)                              # ombre de la traverse
        montants(x0, x1, [x0 + i * w for i in range(3)] + [x1], EAVE + 3, WB)
        cv.hline(x0, x1, WB, 'G0')
        cv.hline(x0, x1, WB + 1, 'V1')                        # solin, au ras du sol

    aile(1, 31, 'g', 1)
    aile(64, 94, 'd', 2)
    # pavillon central : dôme sur une corniche, façade qui avance
    CX0, CX1, MID = 30, 65, 47.5
    RX, TOP, BASE = 17.5, 4, 28
    for y in range(TOP, BASE + 1):
        for x in range(CX0, CX1 + 1):
            dx = (x + 0.5 - (MID + 0.5)) / RX
            dy = (BASE - (y + 0.5)) / (BASE - TOP)
            q = dx * dx + dy * dy
            if q > 1:
                continue
            nz = math.sqrt(max(0, 1 - q))
            lv = level(dx * 1.1, -dy * 0.9 + 0.15)
            c = ('G0', 'G1', 'G2', 'G3', 'G3')[lv]
            if q > 0.9:
                c = 'G0'                                      # bord du dôme
            t = math.asin(max(-1, min(1, dx / math.sqrt(max(1e-6, 1 - dy * dy)))))
            if any(abs(t - c0) < 0.09 for c0 in (-1.0, -0.33, 0.33, 1.0)) and dy < 0.96:
                c = 'G0'                                      # côtes qui s'incurvent vers le sommet
            if abs(dy - 0.45) < 0.035:
                c = 'G0'                                      # anneau
            cv.put(x, y, c)
    cv.put(int(MID), 2, 'A4'); cv.put(int(MID), 3, 'A6'); cv.put(int(MID) + 1, 3, 'A6')   # épi
    cv.hline(CX0 - 1, CX1 + 1, BASE, 'G0'); cv.hline(CX0 - 1, CX1 + 1, BASE + 1, 'V1')    # corniche
    interieur(CX0 + 1, 31, CX0 + 8, PB - 1, 11)
    interieur(CX1 - 8, 31, CX1 - 1, PB - 1, 4)
    for y in (31, 32):
        for x in range(CX0, CX1 + 1):
            assombrir(cv, x, y)
    montants(CX0, CX1, [CX0, CX0 + 9, CX1 - 9, CX1], 30, PB)
    # imposte et double porte vitrée, en retrait (ébrasement dans l'ombre en haut et à gauche)
    for y in range(31, 41):
        for x in range(CX0 + 10, CX1 - 9):
            d = math.hypot(x + 0.5 - (MID + 0.5), (y + 0.5 - 41) * 1.2)
            if d <= 8:
                cv.put(x, y, 'G0' if d > 7 else 'G3' if x < MID - 2 else 'G2')
    cv.hline(CX0 + 10, CX1 - 10, 41, 'G0')
    for a, b in ((CX0 + 10, int(MID)), (int(MID) + 1, CX1 - 10)):
        interieur(a + 1, 43, b - 1, 70, a, plantes=False)
        cv.rect(a + 1, 71, b - 1, PB - 1, 'G0')
        cv.hline(a + 1, b - 1, 71, 'G1')
        cv.box(a, 42, b, PB, 'G0')
        cv.hline(a + 1, b - 1, 43, 'G0'); cv.vline(a + 1, 43, 70, 'G1')   # ébrasement
    cv.put(int(MID) - 2, 58, 'A4'); cv.put(int(MID) + 3, 58, 'A4')
    cv.hline(CX0, CX1, PB, 'G0')
    cv.hline(CX0, CX1, PB + 1, 'V1')
    for x in range(CX1 + 1, CX1 + 5):                         # ombre du pavillon sur l'aile droite
        for y in range(BASE + 2, WB + 1):
            assombrir(cv, x, y)
    outline_by_material(cv)
    ombre_sol(cv)
    return cv.im


# ================================================================ silo, puits, citerne

# ================================================================ volumes ronds

def ellipse_e(dx, rx, ry):
    """Demi-hauteur de l'ellipse (rx, ry) à la distance `dx` du centre."""
    q = 1 - (dx / rx) ** 2
    return ry * math.sqrt(q) if q > 0 else 0.0


def cylindre(cv, cx, y_top, y_bot, rx, ry, paint):
    """Fût de cylindre vu de trois quarts : ses bords haut et bas sont des demi-ellipses
    (centres y_top et y_bot), le bas s'arrondit vers le spectateur. `paint(x, y, u, v, lv)`
    reçoit la position sur la surface : `u` la longueur d'arc depuis le bord gauche (les motifs
    se resserrent donc vers les bords), `v` la hauteur depuis le bord haut, `lv` le niveau de
    lumière (flanc gauche éclairé). Renvoie les pixels peints."""
    pts = set()
    for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
        dx = x + 0.5 - cx
        if abs(dx) > rx:
            continue
        e = ellipse_e(dx, rx, ry)
        ang = math.asin(max(-1, min(1, dx / rx)))
        u = rx * (ang + math.pi / 2)
        for y in range(int(y_top + e), int(y_bot + e) + 1):
            if y + 0.5 < y_top + e or y + 0.5 > y_bot + e + 0.5:
                continue
            lv = level(math.sin(ang) * 1.05, 0.05)
            paint(x, y, u, y + 0.5 - (y_top + e), lv)
            pts.add((x, y))
    return pts


def disque(cx, cy, rx, ry):
    """Pixels de l'ellipse pleine (cx, cy, rx, ry)."""
    return {(x, y) for y in range(int(cy - ry) - 1, int(cy + ry) + 2) for x in range(int(cx - rx) - 1, int(cx + rx) + 2)
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def pierres_rondes(bh=4, bw=6):
    """Peinture d'un mur de pierres rond : rangs courbes de `bh` px, blocs de `bw` px d'arc
    (plus étroits vers les bords), joints B0 ; face éclairée B2, base B1, ombre R1."""
    def paint(x, y, u, v, lv, cv=None):
        row, k = divmod(int(v), bh)
        kx = (u + (row % 2) * bw / 2) % bw
        if k == bh - 1 or kx < 1:
            c = 'B0'
        elif lv >= 3:
            c = 'B2' if k == 0 or kx < 2 or lv == 4 else 'B1'
        elif lv == 2:
            c = 'B2' if k == 0 and kx < 3 else 'B1'
        else:
            c = 'B1' if k == 0 and lv == 1 else 'R1'
        return c
    return paint


def ombre_ronde(cv, cx, cy, rx, ry):
    """Ombre au sol d'un objet rond : l'ellipse de son pied, poussée vers le bas-droite (lumière
    haut-gauche), sur les pixels transparents seulement."""
    for (x, y) in disque(cx + 2.5, cy + 1.2, rx + 1.5, ry + 1):
        if 0 <= x < cv.w and 0 <= y < cv.h and cv.px[x, y][3] == 0:
            cv.px[x, y] = OMBRE_CONTACT


def silo():
    """Silo (32 × 64) : un cylindre de douelles de bois (plus étroites vers les bords, cerclages
    courbes), posé sur un soubassement rond de pierres un peu plus large ; toit conique prune
    dont le bord avant suit l'ellipse, avec un débord ; ombre ronde au sol."""
    cv = Canvas(32, 64)
    CX = 16
    pierre = pierres_rondes(4, 6)
    cylindre(cv, CX, 50, 57, 13, 4.5, lambda x, y, u, v, lv: cv.put(x, y, pierre(x, y, u, v, lv)))

    def bois(x, y, u, v, lv):
        k = u % 4
        c = ('W1', 'W2', 'W3', 'W4', 'W4')[lv]
        if k < 0.9:
            c = 'W1' if lv >= 2 else 'W0'                       # joint entre deux douelles
        if int(v) in (8, 22):
            c = 'W0' if lv <= 1 else 'W1'                       # cerclages
        cv.put(x, y, c)
    cylindre(cv, CX, 18, 47, 12, 4, bois)
    for x in range(CX - 12, CX + 13):                           # dessus du soubassement, devant le fût
        dx = x + 0.5 - CX
        e1, e2 = ellipse_e(dx, 13, 4.5), ellipse_e(dx, 12, 4)
        for y in range(int(47 + e2) + 1, int(50 + e1) + 1):
            if abs(dx) <= 12.5:
                cv.put(x, y, 'B2' if dx < 4 else 'B1')
    # toit conique : sommet (CX, 1), base elliptique centrée en y = 19, débord de 2 px
    RX, RY, AY, BY = 14.5, 5, 1, 19
    for y in range(AY, BY + 7):
        for x in range(32):
            dx = x + 0.5 - CX
            t = (y + 0.5 - AY) / (BY - AY)                      # 0 au sommet, 1 à la base
            if t <= 0:
                continue
            half = RX * min(1, t)
            if abs(dx) > half:
                continue
            bottom = BY + ellipse_e(dx, RX, RY)
            if y + 0.5 > bottom:
                continue
            ang = math.asin(max(-1, min(1, dx / RX)))
            u = RX * (ang + math.pi / 2)
            near_edge = bottom - (y + 0.5) < 1.2
            rel = dx / max(1, half)
            lv = level(rel, -0.3)
            row = int((y + 0.5 - AY) / 3)
            if near_edge:
                c = 'N0'                                        # épaisseur du débord
            elif (u * 0.9 + row * 2) % 5 < 1 and t > 0.2:
                c = 'N0' if lv <= 1 else 'N1'                   # joints des bardeaux
            else:
                c = ('N1', 'N1', 'N2', 'N3', 'N3')[lv]
            cv.put(x, y, c)
    for x in range(CX - 12, CX + 13):                           # ombre du débord sur le haut du fût
        dx = x + 0.5 - CX
        y0 = int(BY + ellipse_e(dx, RX, RY)) + 1
        for y in (y0, y0 + 1):
            c = cv.get(x, y)[:3]
            if c in (PAL['W4'], PAL['W3']):
                cv.put(x, y, 'W2')
            elif c == PAL['W2']:
                cv.put(x, y, 'W1')
    outline_by_material(cv)
    ombre_ronde(cv, CX, 57.5, 13, 4.5)
    return cv.im


def puits(kind):
    """Puits (48 × 48) : margelle ronde de pierres (rangs courbes, bas arrondi vers le
    spectateur), dessus en couronne autour de l'eau sombre, deux poteaux posés sur la margelle,
    treuil, seau, toit prune ; ombre ronde au sol. `kind` : 'puits' (seul), 'tuyau' (avec le
    tuyau de la pompe), 'pompe' (la pompe seule, posée par-dessus ; acier non observé dans le
    guide : rampe de la roche R)."""
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
    C = CX + 0.5
    RX, RY, YT, YB = 12.5, 4.5, 30, 41
    pierre = pierres_rondes(4, 6)
    cylindre(cv, C, YT, YB, RX, RY, lambda x, y, u, v, lv: cv.put(x, y, pierre(x, y, u, v, lv)))
    top = disque(C, YT, RX, RY)                                 # dessus : couronne de pierres
    eau = disque(C, YT + 0.3, RX - 3, RY - 1.6)
    for (x, y) in top:
        dx = x + 0.5 - C
        if (x, y) in eau:
            d = y + 0.5 - (YT + 0.3 - ellipse_e(dx, RX - 3, RY - 1.6))
            if d < 1.5:
                cv.put(x, y, 'B1' if dx < 2 else 'R1')         # paroi du fond, vue de face
            elif d < 3:
                cv.put(x, y, 'B0')                              # la paroi plonge dans l'ombre
            else:
                cv.put(x, y, 'E1' if -6 < dx < -2 else 'E0')    # l'eau, tout au fond, un reflet
        else:
            ang = math.atan2((y + 0.5 - YT) / RY, dx / RX)
            seg = int((ang + math.pi) / (2 * math.pi) * 14)
            joint = abs(((ang + math.pi) / (2 * math.pi) * 14) - round((ang + math.pi) / (2 * math.pi) * 14)) < 0.08
            c = 'B0' if joint else 'B2' if dx < 3 or y + 0.5 < YT else 'B1'
            cv.put(x, y, c)
    # poteaux posés sur la margelle, treuil, corde, seau
    for px_ in (CX - 10, CX + 9):
        cv.vline(px_, 9, 30, 'W4'); cv.vline(px_ + 1, 9, 30, 'W2')
    cv.hline(CX - 9, CX + 9, 13, 'W3'); cv.hline(CX - 9, CX + 9, 14, 'W1')
    cv.vline(CX, 15, 22, 'W1')
    cv.rect(CX - 2, 23, CX + 2, 26, 'W3'); cv.hline(CX - 2, CX + 2, 23, 'W4'); cv.hline(CX - 2, CX + 2, 26, 'W1')
    # toit prune
    for y in range(1, 10):
        half = (y - 1) * 1.7 + 1
        for x in range(48):
            rel = (x + 0.5 - (CX + 0.5)) / half
            if abs(rel) <= 1:
                cv.put(x, y, roof_color(y - 1, x, rel < 0, 'prune', (y - 1) / 9))
    if kind == 'tuyau':
        cv.hline(CX + 12, PX + 1, 34, 'R3'); cv.hline(CX + 12, PX + 1, 35, 'R1')
        cv.vline(CX + 11, 33, 35, 'R2')
    outline_by_material(cv)
    ombre_ronde(cv, C, YB, RX, RY)
    return cv.im


def citerne(niveau):
    """Citerne (32 × 48) : cuve ronde de tôle (rampe de la roche, l'acier n'est pas observé),
    couvercle elliptique vu de dessus, cerclages courbes, tube de niveau (verre G, eau E1 et
    E2), socle de planches ; `niveau` de 0 (vide) à 4 (plein)."""
    cv = Canvas(32, 48)
    C, RX, RY = 15.5, 10.5, 3.5
    # socle rond de planches : dessus elliptique, tranche aux planches verticales
    def planche(x, y, u, v, lv):
        c = 'W3' if lv >= 3 else 'W1'
        if u % 3 < 0.8:
            c = 'W1' if lv >= 3 else 'W0'
        cv.put(x, y, c)
    cylindre(cv, C, 37, 41.5, 12.5, 4.2, planche)
    for (x, y) in disque(C, 37, 12.5, 4.2):
        cv.put(x, y, 'W3' if x + 0.5 < C + 5 else 'W1')

    def tole(x, y, u, v, lv):
        c = ('R1', 'R1', 'R2', 'R3', 'R3')[lv]
        if int(v) in (8, 20):
            c = 'R1' if lv >= 2 else 'W0'                       # cerclages
        cv.put(x, y, c)
    cylindre(cv, C, 9, 36, RX, RY, tole)
    for (x, y) in disque(C, 9, RX, RY):                         # couvercle
        cv.put(x, y, 'R3' if x + 0.5 < C + 2 else 'R2')
    for (x, y) in disque(C, 7.5, 3.5, 1.4):                     # trappe
        cv.put(x, y, 'R2' if x + 0.5 < C else 'R1')
    cv.hline(13, 18, 6, 'R3')
    g0, g1 = 14, 36                                            # tube de niveau
    plein = round((g1 - g0 + 1) * niveau / 4)
    for y in range(g0, g1 + 1):
        filled = y > g1 - plein
        cv.put(19, y, 'E2' if filled else 'G3')
        cv.put(20, y, 'E1' if filled else 'G3')
    cv.box(18, g0 - 1, 21, g1 + 1, 'W0')
    cv.hline(0, 5, 17, 'R3'); cv.hline(0, 5, 18, 'R1')        # arrivée du tuyau de la pompe
    outline_by_material(cv)
    ombre_ronde(cv, C, 41.5, 12.5, 4.2)
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
