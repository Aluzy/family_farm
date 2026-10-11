# Jeu de tuiles de la carte de la ferme, dessiné en code d'après le guide graphique
# (docs/direction-artistique/guide-graphique-pastoral.md) : palette fermée de 60 couleurs,
# lumière haut-gauche en aplats durs, contour selon la famille, textures en amas, ombre de
# contact translucide sous les objets posés.
#
#   python3 scripts/carte/tileset.py           écrit assets/tileset_ferme.png, .tsx et .json
#   python3 scripts/carte/tileset.py --demo    écrit aussi demo_tileset.png (une scène faite de
#                                              ces tuiles)
#   python3 scripts/carte/tileset.py --qa      passe chaque sprite au contrôle du guide
#                                              (scripts/qa_sprites.py)
#
# Contenu :
#   - remplissages (16×16, se raccordent à eux-mêmes) : herbe sombre V3 (aplat et variantes à
#     touffes), herbe moyenne V6, herbe claire V8, terre T3 à chevrons, pavés (3 variantes),
#     eau E2 (3 images, jouées 0-1-2-1) ;
#   - taches et trous à fond transparent, à poser sur n'importe quel sol (16 tuiles par sol,
#     rangées par combinaison de coins, jeux de Wang « coins » du .tsx) : herbe moyenne, herbe
#     claire, terre, pavés (l'herbe paraît dans les joints), eau avec ses berges. Tuile de bord :
#     4 px vides, 9 px de bande (brins de 1 px, deux tons de frange), 3 px pleins ;
#   - micro-décor (16×16, sans collision) : touffes, fleurs, trèfle, champignon, caillou,
#     feuilles ;
#   - objets : rochers, souche, bûche, tonneau, caisse, foin, clôture (piquet de 3 px tous les
#     8 px, 14 px de haut), plantes d'eau ;
#   - buissons (32×32) et arbres adultes (80×80) : feuillu, en fleurs, en fruits ; sapin.
import json
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from pastoral import (PAL, Canvas, amas, level, ombre_contact, outline_construit,  # noqa: E402
                      outline_cote_ombre, outline_feuillage, qa)

T = 16
COLS = 16
NAME = 'tileset_ferme'
ASSETS = os.path.join(ROOT, 'assets')


def rng(*k):
    return random.Random('-'.join(map(str, k)))


def ancrer(im):
    """Pose le sprite au ras du bas de son gabarit (guide : pivot en bas au centre, une rangée
    vide au plus sous le pied, ombre de contact comprise)."""
    box = im.getbbox()
    if not box:
        return im
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im.crop(box), (box[0], im.height - (box[3] - box[1])))
    return out


# ================================================================ remplissages

def touffe(cv, x, y, a='V4', b='V5'):
    """Touffe de trois brins en V (guide : 14 × 8 au plus, tons V4 et V5)."""
    for dx, h, c in ((0, 2, a), (2, 3, b), (4, 2, a)):
        for k in range(h):
            xx = x + dx + (0 if dx == 2 else (-1 if dx == 0 else 1)) * (k // 2)
            cv.put(xx, y - k, c)


def fill_grass(base, variant, tufts=('V4', 'V5')):
    cv = Canvas(T, T)
    cv.rect(0, 0, T - 1, T - 1, base)
    spots = {0: [], 1: [(3, 7)], 2: [(9, 5), (2, 13)], 3: [(5, 11), (11, 8)]}[variant]
    for x, y in spots:
        touffe(cv, x, y, *tufts)
    return cv.im


def fill_terre():
    """Terre de chemin : chevrons T2 sur T3, période de 16 px, un caillou T1."""
    cv = Canvas(T, T)
    cv.rect(0, 0, T - 1, T - 1, 'T3')
    for cx, cy in ((4, 4), (12, 9), (5, 13)):
        for k in range(3):
            cv.put(cx - k, cy + k // 2 + (k > 0), 'T2')
            cv.put(cx + k, cy + k // 2 + (k > 0), 'T2')
    cv.put(10, 3, 'T1'); cv.put(11, 3, 'T1'); cv.put(10, 4, 'T1')
    return cv.im


# pavés : pierres arrondies de 6 à 8 px, deux par rangée, rangées décalées ; une pierre
# chevauche chaque bord de la tuile (raccord sans couture) ; 3 variantes
PAVES = {
    0: [(3, 15, 8, 5), (11, 15, 8, 5), (7, 4, 8, 5), (15, 4, 8, 5), (4, 9, 8, 6), (12, 9, 8, 6)],
    1: [(2, 15, 9, 5), (11, 15, 7, 5), (6, 4, 7, 5), (13, 4, 9, 5), (5, 9, 8, 6), (13, 9, 7, 6)],
    2: [(4, 15, 7, 5), (11, 15, 9, 5), (8, 4, 8, 5), (16, 4, 8, 5), (3, 9, 9, 6), (12, 9, 7, 6)],
}


def stone(cv, x0, y0, w, h, wrap=True):
    """Une pierre : coins arrondis, dessus P4 et P3, corps P2, dessous P1 et P0 sur 2 px.
    Avec `wrap`, elle se coupe au bord de la tuile et reprend de l'autre côté (remplissage) ;
    sinon seuls ses pixels dans la tuile sont posés (taches)."""
    for yy in range(h - 1):
        for xx in range(w - 1):
            if (xx in (0, w - 2)) and (yy in (0, h - 2)):
                continue
            x, y = x0 + xx, y0 + yy
            if wrap:
                x, y = x % T, y % T
            elif not (0 <= x < T and 0 <= y < T):
                continue
            if yy == 0:
                c = 'P4'
            elif yy == 1 and xx < w - 3:
                c = 'P3'
            elif yy >= h - 3:
                c = 'P0' if yy == h - 2 else 'P1'
            else:
                c = 'P1' if xx == w - 2 else 'P2'
            cv.put(x, y, c)


def fill_paves(variant, cv=None):
    cv = cv or Canvas(T, T)
    for x0, y0, w, h in PAVES[variant]:
        stone(cv, x0, y0, w, h)
    return cv.im


def water_dashes(frame):
    """Tirets de reflet (E3) et stries (E0) de l'eau, période 16 ; 3 images : quelques tirets
    glissent d'un pixel (environ 5 % des pixels changent)."""
    s = frame
    return [(2 + s, 3, 3, 'E3'), (10 - s, 6, 4, 'E3'), (5, 10, 2, 'E3'), (11 + s, 13, 3, 'E3'),
            (1, 8, 2, 'E0'), (8, 12, 3, 'E0')]


def fill_eau(frame):
    cv = Canvas(T, T)
    cv.rect(0, 0, T - 1, T - 1, 'E2')
    for x0, y, n, c in water_dashes(frame):
        for k in range(n):
            cv.put((x0 + k) % T, y, c)
    return cv.im


# ================================================================ taches et trous

def skeleton(px_, py_, pts, value):
    best = 99.0
    for (cx, cy), v in pts.items():
        if v == value:
            best = min(best, math.hypot(px_ - cx, py_ - cy))
    for a, b in (((0, 0), (16, 0)), ((0, 16), (16, 16)), ((0, 0), (0, 16)), ((16, 0), (16, 16))):
        if pts[a] == value and pts[b] == value:
            best = min(best, abs(py_ - a[1]) if a[1] == b[1] else abs(px_ - a[0]))
    return best


def corner_field(x, y, c):
    """Champ signé (négatif dans le sol) : le bord passe à égale distance des coins du sol et
    des autres coins. Sur un bord de tuile, seuls comptent les deux coins de ce bord : deux
    tuiles voisines se raccordent toujours. Coins sortants arrondis, coins rentrants en courbe.
    Sur une tuile de bord droit : 4 px vides (champ > 8), bande de 9 px, 3 px pleins (< -10)."""
    tl, tr, bl, br = c
    pts = {(0, 0): tl, (16, 0): tr, (0, 16): bl, (16, 16): br}
    return skeleton(x + 0.5, y + 0.5, pts, 1) - skeleton(x + 0.5, y + 0.5, pts, 0)


# brins : hauteur (0 à 3 px) selon la position le long du bord, période 16 ; 1 px de large
BRINS = [0, 2, 0, 0, 3, 1, 0, 0, 2, 0, 1, 0, 0, 3, 0, 1]
JAG1 = [0, 1, 1, 0, -1, -1, 0, 1, 2, 1, 0, -1, -2, -1, 0, 0]       # frange 1 → frange 2 (amas)
JAG2 = [1, 0, -1, -2, -1, 0, 2, 2, 1, 0, -1, 0, 1, 2, 1, 0]        # frange 2 → centre


def along(c, x, y):
    """Coordonnée le long du bord : x pour un bord plutôt horizontal, y sinon."""
    f = lambda a, b: corner_field(a, b, c)
    gx, gy = f(x + 1, y) - f(x - 1, y), f(x, y + 1) - f(x, y - 1)
    return (x if abs(gy) >= abs(gx) else y) % 16, gx, gy


SOLS = {
    # sol : (frange 1, frange 2, centre)
    'herbe_moyenne': ('V4', 'V5', 'V6'),
    'herbe_claire': ('V5', 'V7', 'V8'),
    'terre': ('T0', 'T2', 'T3'),
}


def tache_sol(name, c):
    """Tache d'herbe ou de terre, fond transparent : brins de la frange 1 qui débordent, puis
    les deux tons de frange par amas, puis le centre (avec sa texture)."""
    f1, f2, centre = SOLS[name]
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    tex = fill_terre() if name == 'terre' else fill_grass(centre, 0)
    tpx = tex.load()
    for y in range(T):
        for x in range(T):
            d = corner_field(x, y, c)
            u, gx, gy = along(c, x, y)
            if d <= -6 + JAG2[u]:
                cv.px[x, y] = tpx[x, y]
            elif d <= -2 + JAG1[u]:
                cv.put(x, y, f2)
            elif d <= 1:
                cv.put(x, y, f1)
            elif d <= 1 + 2 * BRINS[u] and d <= 8:
                cv.put(x, y, f1)                       # brin
    return cv.im


def tache_paves(c, variant=0):
    """Pavés posés sur le sol : les pierres du motif (et celles des tuiles voisines qui
    débordent) dont le centre, ramené au bord de la tuile, est dans la tache ; seuls leurs
    pixels dans la tuile sont posés. L'herbe paraît dans les joints et autour."""
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    for x0, y0, w, h in PAVES[variant]:
        for ox in (-16, 0, 16):
            for oy in (-16, 0, 16):
                sx, sy = x0 % 16 + ox, y0 % 16 + oy
                cx, cy = sx + w / 2 - 0.5, sy + h / 2 - 0.5
                if not (-w < sx < T and -h < sy < T):
                    continue
                kx, ky = min(15, max(0, cx)), min(15, max(0, cy))
                if corner_field(kx, ky, c) <= -1.5:
                    stone(cv, sx, sy, w, h, wrap=False)
    return cv.im


def tache_eau(c, frame=0):
    """Eau et sa berge, fond transparent. Berge nord : dessus (T2, lèvre T1) et face (W2, W1)
    sur 7 à 9 px, écume E4, puis une bande d'eau profonde E1 de 6 à 8 px. Berges latérales et
    sud : le dessus seul, 4 à 5 px, écume verticale (1 px sur 2) sur les côtés."""
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    for y in range(T):
        for x in range(T):
            d = corner_field(x, y, c)
            u, gx, gy = along(c, x, y)
            n = math.hypot(gx, gy) or 1
            north = -gy / n > 0.55          # le bord regarde vers le haut : berge nord
            side = abs(gx / n) > 0.55
            if d > 0:
                if north:
                    if d <= 4:
                        cv.put(x, y, 'W1' if d <= 1.5 else 'W2')          # face de la berge
                    elif d <= 7 + (BRINS[u] > 1):
                        cv.put(x, y, 'T1' if d > 6 else 'T2')             # dessus, lèvre
                elif d <= 4 + (BRINS[u] > 1):
                    cv.put(x, y, 'T1' if d > 3 else 'T2')                 # dessus seul
                continue
            depth = -d
            col = 'E2'
            if depth <= 1:
                col = 'E4' if not side or y % 2 == 0 else 'E3'            # écume
            elif north and depth <= 7:
                col = 'E1'                                                 # eau profonde
            cv.put(x, y, col)
            if col == 'E2':
                for x0, yy, k, cc in water_dashes(frame):
                    if yy == y and (x - x0) % 16 < k:
                        cv.put(x, y, cc)
    return cv.im


CORNERS = [(tl, tr, bl, br) for tl in (0, 1) for tr in (0, 1) for bl in (0, 1) for br in (0, 1)]


# ================================================================ micro-décor

def micro(kind):
    cv = Canvas(T, T)
    if kind == 'touffes':
        touffe(cv, 2, 9); touffe(cv, 9, 13)
    elif kind == 'touffes_claires':
        touffe(cv, 3, 10, 'V7', 'V8'); touffe(cv, 9, 6, 'V7', 'V8')
    elif kind.startswith('fleurs'):
        petal = {'fleurs_blanches': ('A3', 'A2'), 'fleurs_jaunes': ('A4', 'A5'), 'fleurs_lavande': ('A2', 'A1')}[kind]
        for cx, cy in ((4, 6), (11, 10)):
            cv.vline(cx, cy + 2, cy + 5, 'V6')               # tige
            cv.put(cx + 1, cy + 4, 'V6')
            for dx, dy in ((-2, 0), (1, 0), (-1, -2), (-1, 1)):  # pétales de 2 × 2
                for ex in (0, 1):
                    for ey in (0, 1):
                        cv.put(cx + dx + ex, cy + dy + ey - 1, petal[0] if dy <= 0 else petal[1])
            cv.put(cx, cy, 'A6')                             # cœur
    elif kind == 'trefle':
        for cx, cy in ((5, 7), (11, 11)):
            for dx, dy in ((-1, -1), (1, -1), (0, 1)):
                cv.put(cx + dx, cy + dy, 'V8'); cv.put(cx + dx + (1 if dx >= 0 else -1), cy + dy, 'V6')
            cv.put(cx, cy, 'V5'); cv.put(cx, cy + 2, 'V5')
    elif kind == 'champignon':
        # chapeau A7 (baie) taché de C1, pied C1 et C0, ombre de contact
        for y, (a, b) in enumerate(((5, 9), (4, 10), (3, 11), (3, 11))):
            for x in range(a, b + 1):
                cv.put(x, 5 + y, 'A8' if x < 6 or y == 0 else 'A7')
        cv.hline(3, 11, 9, 'W0')
        cv.put(6, 6, 'C1'); cv.put(9, 7, 'C1'); cv.put(5, 8, 'C1')
        cv.rect(6, 10, 8, 12, 'C1'); cv.vline(8, 10, 12, 'C0')
        cv.hline(5, 9, 13, 'B1')
        ombre_contact(cv, 4, 10, 14, 1)
    elif kind == 'caillou':
        # 13 × 8 au plus, R1 à R3, bord d'ombre N2, ombre de contact
        def inside(x, y):
            return ((x + 0.5 - 7.5) / 6) ** 2 + ((y + 0.5 - 10) / 3.4) ** 2 <= 1
        for y in range(T):
            for x in range(T):
                if inside(x, y):
                    lv = level((x + 0.5 - 7.5) / 6, (y + 0.5 - 10) / 3.4)
                    cv.put(x, y, 'R3' if lv >= 3 else 'R2' if lv == 2 else 'R1')
        outline_cote_ombre(cv, inside, 'N2')
        ombre_contact(cv, 3, 12, 14, 1)
    elif kind == 'feuilles':
        for cx, cy, c1, c2 in ((4, 5, 'A6', 'W3'), (11, 9, 'A4', 'A6'), (6, 12, 'A6', 'W3')):
            cv.put(cx, cy, c1); cv.put(cx + 1, cy, c1); cv.put(cx + 1, cy - 1, c1); cv.put(cx, cy + 1, c2)
    return ancrer(cv.im)


# ================================================================ objets

def rocher(w=32, h=32, big=True):
    """Rocher (organique dur) : plans anguleux séparés par des fissures ; plans du haut et de
    gauche en R3, base R2, ombre R1 ; bord d'ombre et fissures N2 ; reflet R0 de 2 à 4 px côté
    ombre ; ombre de contact."""
    cv = Canvas(w, h)
    if big:
        cx, cy, rx, ry = w / 2, h - 11.5, 12.5, 9
    else:
        cx, cy, rx, ry = w / 2, h - 6.5, 6.5, 4.6

    def inside(x, y):
        a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        k = 1 + 0.08 * math.cos(3 * a + 0.6) + 0.05 * math.cos(5 * a)
        return ((x + 0.5 - cx) / (rx * k)) ** 2 + ((y + 0.5 - cy) / (ry * k)) ** 2 <= 1 and y + 0.5 <= cy + ry * 0.75

    for y in range(h):
        for x in range(w):
            if not inside(x, y):
                continue
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            a = math.atan2(ny, nx)
            facet = round(a / (math.pi / 3)) * (math.pi / 3)        # plans anguleux
            mag = min(1, math.hypot(nx, ny))
            lv = level(math.cos(facet) * mag, math.sin(facet) * mag - 0.25)
            cv.put(x, y, 'R3' if lv >= 3 else 'R2' if lv == 2 else 'R1')
    for k in range(int(rx * 0.7)):                                     # fissures
        cv.put(int(cx) + k // 2, int(cy - ry * 0.5) + k, 'N2')
    if big:
        for k in range(5):
            cv.put(int(cx - rx * 0.45) + k, int(cy + 1) + k // 3, 'N2')
    outline_cote_ombre(cv, inside, 'N2')
    pts = [(x, y) for y in range(h) for x in range(w) if inside(x, y) and not inside(x + 1, y + 1) and x > cx and y > cy - 1]
    for x, y in pts[: 4 if big else 2]:                                # reflet violet côté ombre
        cv.put(x - 1, y - 1, 'R0')
    ombre_contact(cv, int(cx - rx * 0.8), int(cx + rx * 0.8), int(cy + ry * 0.75) + 1, 2)
    return ancrer(cv.im)


def souche():
    """Souche (organique) : écorce W, dessus annelé B2/B1, contour côté ombre N2."""
    cv = Canvas(32, 32)
    x0, x1, y0, y1 = 9, 22, 19, 28

    def body(x, y):
        return x0 <= x <= x1 and y0 <= y <= y1 or (y1 < y <= y1 + 1 and x0 - 2 <= x <= x1 + 2)

    for y in range(y0, y1 + 2):
        for x in range(x0 - 2, x1 + 3):
            if body(x, y):
                k = (x - x0) / (x1 - x0)
                cv.put(x, y, 'W4' if k < 0.2 else 'W3' if k < 0.6 else 'W2' if k < 0.9 else 'W1')
    for x in (12, 16, 19):                                   # veines d'écorce
        cv.vline(x, y0 + 3, y0 + 7, 'W1')

    def top(x, y):
        return ((x + 0.5 - 15.5) / 7) ** 2 + ((y + 0.5 - y0) / 2.6) ** 2 <= 1
    for y in range(y0 - 3, y0 + 3):
        for x in range(x0 - 1, x1 + 2):
            if top(x, y):
                rr = math.hypot((x + 0.5 - 15.5) / 7, (y + 0.5 - y0) / 2.6)
                cv.put(x, y, 'B2' if rr > 0.75 or 0.35 < rr < 0.5 else 'B1')
    outline_cote_ombre(cv, lambda x, y: body(x, y) or top(x, y), 'N2')
    ombre_contact(cv, x0 - 2, x1 + 2, y1 + 2, 2)
    return cv.im


def buche():
    """Bûche couchée (organique), 32 × 16 : bout coupé à gauche (B2/B1, face à la lumière),
    écorce W éclairée par le haut, contour côté ombre N2."""
    cv = Canvas(32, 16)

    def body(x, y):
        return 7 <= x <= 28 and 5 <= y <= 12

    for y in range(5, 13):
        for x in range(7, 29):
            k = (y - 5) / 7
            cv.put(x, y, 'W4' if k < 0.25 else 'W3' if k < 0.6 else 'W2' if k < 0.85 else 'W1')
    for x in (12, 18, 23):
        cv.hline(x, x + 3, 8, 'W2')

    def end(x, y):
        return ((x + 0.5 - 6) / 2.6) ** 2 + ((y + 0.5 - 9) / 4.2) ** 2 <= 1
    for y in range(4, 14):
        for x in range(2, 10):
            if end(x, y):
                rr = math.hypot((x + 0.5 - 6) / 2.6, (y + 0.5 - 9) / 4.2)
                cv.put(x, y, 'B2' if rr > 0.6 or (x < 6 and y < 9) else 'B1')
    outline_cote_ombre(cv, lambda x, y: body(x, y) or end(x, y), 'N2')
    ombre_contact(cv, 4, 27, 14, 2)
    return ancrer(cv.im)


def tonneau():
    """Tonneau (construit), 18 × 24 dans 32 × 32 : couvercle visible (un cinquième de la
    hauteur), douelles W, cerclages W1, contour continu W0, ombre de contact."""
    cv = Canvas(32, 32)
    top, bot, lid = 7, 29, 11

    def inside(x, y):
        if not top <= y <= bot:
            return False
        bulge = 1.2 * math.sin(math.pi * (y - top) / (bot - top))
        return 8 - bulge <= x <= 23 + bulge

    for y in range(top, bot + 1):
        for x in range(32):
            if not inside(x, y):
                continue
            if y < lid:
                cv.put(x, y, 'W2' if y == lid - 1 else 'W4' if y == top or x < 13 else 'B2')   # couvercle
                continue
            bulge = 1.2 * math.sin(math.pi * (y - top) / (bot - top))
            k = (x - (8 - bulge)) / (15 + 2 * bulge)
            c = 'W4' if k < 0.18 else 'W3' if k < 0.55 else 'W2' if k < 0.85 else 'W1'
            if (x - 8) % 4 == 3 and 0.1 < k < 0.9 and c != 'W1':
                c = 'W2'                                                    # joints des douelles
            if y in (lid + 3, bot - 4):
                c = 'W1'                                                    # cerclages
            cv.put(x, y, c)
    outline_construit(cv, inside, 'W0')
    ombre_contact(cv, 8, 23, bot + 2, 2)
    return cv.im


def caisse():
    """Caisse (construit), 16 × 16 : dessus clair, planches, écharpe, contour W0."""
    cv = Canvas(16, 16)
    cv.rect(2, 4, 13, 13, 'W3')
    cv.rect(2, 2, 13, 3, 'W4')                                  # dessus
    for y in (6, 10):
        cv.hline(2, 13, y, 'W2')                                # joints de planches
    for k in range(10):                                         # écharpe
        cv.put(3 + k, max(4, 13 - k), 'W4')
        cv.put(4 + k, max(4, 13 - k), 'W2')
    cv.vline(13, 4, 13, 'W2')
    outline_construit(cv, lambda x, y: 2 <= x <= 13 and 2 <= y <= 13, 'W0')
    ombre_contact(cv, 2, 13, 15, 1)
    return cv.im


def foin():
    """Botte de foin (construit, paille) 32 × 16 : A4 et A5, liens W2, contour W1."""
    cv = Canvas(32, 16)

    def inside(x, y):
        return 3 <= x <= 28 and 3 <= y <= 13 and not ((x < 5 or x > 26) and (y < 5 or y > 11))
    for y in range(16):
        for x in range(32):
            if inside(x, y):
                c = 'A4' if y < 6 else 'A5' if y < 11 else 'A6'
                if (x - 3) % 6 == 0 and 5 < y < 12:
                    c = 'A5'                                   # brins en amas verticaux
                if x in (10, 21):
                    c = 'W2'                                   # liens
                cv.put(x, y, c)
    outline_construit(cv, inside, 'W1')
    ombre_contact(cv, 4, 27, 15, 1)
    return cv.im


def cloture(part):
    """Clôture (construit, module de 16 × 16) : piquets de 3 px tous les 8 px, 14 px de haut,
    deux lisses ; contour W0. Les lisses rejoignent le module voisin."""
    cv = Canvas(16, 16)
    posts = {'gauche': [3, 11], 'milieu': [3, 11], 'droite': [3, 11], 'poteau': [6]}[part]
    a = 3 if part == 'gauche' else 0
    b = 13 if part == 'droite' else 15
    rails = set()
    if part != 'poteau':
        for y in (5, 6, 10, 11):
            for x in range(a, b + 1):
                rails.add((x, y))
    post_px = {(x, y) for px_ in posts for x in range(px_, px_ + 3) for y in range(2, 16)}
    shape = rails | post_px
    outline_construit(cv, lambda x, y: (x, y) in shape, 'W0')
    for (x, y) in rails:
        cv.put(x, y, 'W4' if y in (5, 10) else 'W3')
    for (x, y) in post_px:
        k = min(x - px_ for px_ in posts if px_ <= x)
        cv.put(x, y, 'W4' if k == 0 or y == 2 else 'W3' if k == 1 else 'W2')
    if part in ('milieu', 'droite'):                       # raccord à gauche : pas de contour
        for y in (5, 6, 10, 11):
            cv.put(0, y, 'W4' if y in (5, 10) else 'W3')
    if part in ('milieu', 'gauche'):
        for y in (5, 6, 10, 11):
            cv.put(15, y, 'W4' if y in (5, 10) else 'W3')
    return cv.im


def roseaux():
    cv = Canvas(16, 16)
    for x0, hgt in ((4, 11), (7, 13), (10, 9), (12, 12)):
        cv.vline(x0, 15 - hgt + 3, 15, 'V5')
        cv.vline(x0 + 1 if x0 < 12 else x0 - 1, 15 - hgt // 2, 15, 'V2')
        cv.rect(x0, 15 - hgt, x0, 15 - hgt + 2, 'W2')     # massette
        cv.put(x0, 15 - hgt, 'W3')
    return cv.im


def nenuphars():
    cv = Canvas(16, 16)
    for cx, cy, r in ((5, 6, 3.4), (11, 11, 2.8)):
        def inside(x, y, cx=cx, cy=cy, r=r):
            return math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r and not (x + 0.5 > cx and abs(y + 0.5 - cy) < 0.9)
        for y in range(16):
            for x in range(16):
                if inside(x, y):
                    cv.put(x, y, 'V8' if (x + 0.5 - cx) + (y + 0.5 - cy) < -1 else 'V6')
        outline_cote_ombre(cv, inside, 'V2')
    cv.rect(4, 4, 5, 5, 'A8'); cv.put(4, 4, 'A2')
    return ancrer(cv.im)


# ================================================================ feuillage

def foliage(cv, blobs, tones, seed, fruit=None, flowers=None):
    """Feuillage en amas superposés : chaque boule est éclairée en haut à gauche (normale mêlée
    à celle du houppier entier), les boules du haut passent devant et ombrent celles du dessous ;
    creux sombres, quelques touches d'indigo A0 dans la moitié basse et droite ; bord d'ombre
    cerné, bord éclairé ouvert. `tones` : [ombre profonde, ombre, base, lumière, reflet]."""
    X0 = min(cx - r for cx, cy, r in blobs); X1 = max(cx + r for cx, cy, r in blobs)
    Y0 = min(cy - r for cx, cy, r in blobs); Y1 = max(cy + r for cx, cy, r in blobs)
    CX, CY, RX, RY = (X0 + X1) / 2, (Y0 + Y1) / 2, (X1 - X0) / 2, (Y1 - Y0) / 2

    def owner(x, y):
        k = None
        for i, (cx, cy, r) in enumerate(blobs):
            a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r * (1 + 0.07 * math.cos(5 * a + i)):   # bord dentelé
                k = i
        return k
    own = {(x, y): owner(x, y) for y in range(cv.h) for x in range(cv.w)}
    inside = lambda x, y: own.get((x, y)) is not None
    for (x, y), k in own.items():
        if k is None:
            continue
        cx, cy, r = blobs[k]
        nx = 0.75 * (x + 0.5 - cx) / r + 0.45 * (x + 0.5 - CX) / RX
        ny = 0.75 * (y + 0.5 - cy) / r + 0.45 * (y + 0.5 - CY) / RY
        lv = level(nx, ny)
        for dd in (1, 2):                                     # ombre d'une boule de devant
            q = own.get((x - dd, y - dd))
            if q is not None and q > k:
                lv = 0 if dd == 1 else min(lv, 1)
                break
        cv.put(x, y, tones[lv])
    outline_feuillage(cv, inside, tones[0], tones[1], seed)
    r = rng('feuillage', seed)
    deep = sorted((x, y) for (x, y), k in own.items() if k is not None and cv.get(x, y)[:3] == PAL[tones[0]]
                  and x > CX and y > CY)
    for _ in range(2):                                        # touches d'indigo au creux
        if deep:
            x, y = r.choice(deep)
            for p in amas(r, x, y, r.randint(2, 4)):
                if inside(*p):
                    cv.put(*p, 'A0')
    pts = sorted(p for p, k in own.items() if k is not None and inside(p[0] + 1, p[1] + 1) and inside(p[0] - 1, p[1] - 1))
    if fruit:
        for _ in range(fruit[1]):
            x, y = r.choice(pts)
            cv.rect(x, y, x + 1, y + 1, fruit[0][0])
            cv.put(x + 1, y + 1, fruit[0][1])
    if flowers:
        for _ in range(flowers[1]):
            x, y = r.choice(pts)
            lit = cv.get(x, y)[:3] in (PAL[tones[3]], PAL[tones[4]])
            for p in amas(r, x, y, r.randint(2, 4)):
                if inside(*p):
                    cv.put(*p, flowers[0][0] if lit else flowers[0][1])
    return own


V_RAMP = ['V1', 'V2', 'V6', 'V8', 'V10']         # ombre profonde, ombre, base, lumière, reflet
V_RAMP_CLAIR = ['V2', 'V5', 'V8', 'V10', 'V11']


def buisson(kind):
    """Buisson 32 × 26 dans 32 × 32 : trois ou quatre amas, les plus clairs en haut à gauche,
    pas de tronc ni d'ombre de contact."""
    cv = Canvas(32, 32)
    blobs = [(16, 23, 9), (8, 21, 7), (24, 21, 7), (13, 14, 7.5), (20, 14, 7)]
    if kind == 'vert':
        foliage(cv, blobs, V_RAMP, 1)
    elif kind == 'baies':
        foliage(cv, blobs, V_RAMP, 2, fruit=(('A7', 'W0'), 7))
    elif kind == 'fleuri':
        foliage(cv, blobs, V_RAMP, 3, flowers=(('A3', 'A2'), 6))
    return cv.im


def trunk(cv, x0, top, bot, w=7, forks=True):
    """Tronc de 6 à 8 px : flanc gauche W4, milieu W3, droite W2 puis W1 ; contour W0 ;
    racines ; deux fourches qui partent dans le feuillage."""
    pts = set()
    for y in range(top, bot + 1):
        spread = 2 if y > bot - 2 else 1 if y > bot - 4 else 0
        for x in range(x0 - spread, x0 + w + spread):
            pts.add((x, y))
    if forks:
        for k in range(9):
            pts.add((x0 + 1 - k // 2, top - k)); pts.add((x0 + 2 - k // 2, top - k))
            pts.add((x0 + w - 2 + k // 2, top - k)); pts.add((x0 + w - 3 + k // 2, top - k))
    outline_construit(cv, lambda x, y: (x, y) in pts, 'W0')
    for (x, y) in pts:
        k = (x - x0) / w
        cv.put(x, y, 'W4' if k < 0.2 else 'W3' if k < 0.55 else 'W2' if k < 0.85 else 'W1')
    return pts


def arbre(kind):
    """Arbre adulte, gabarit 80 × 80 : houppier aux deux tiers de la hauteur, tronc de 7 px dont
    les fourches se voient dans le feuillage ; pas d'ombre de contact."""
    cv = Canvas(80, 80)
    trunk(cv, 37, 54, 79)
    # du bas vers le haut : les boules du haut passent devant et ombrent celles du dessous
    blobs = [(40, 50, 11), (25, 45, 11), (55, 45, 11), (40, 37, 14), (28, 30, 11), (52, 30, 11),
             (40, 21, 12), (32, 14, 9), (48, 14, 9)]
    if kind == 'feuillu':
        foliage(cv, blobs, V_RAMP, 10)
    elif kind == 'fruits':
        foliage(cv, blobs, V_RAMP, 11, fruit=(('A7', 'W0'), 18))
    elif kind == 'fleurs':
        foliage(cv, blobs, V_RAMP_CLAIR, 12, flowers=(('A3', 'A8'), 22))
    trunk(cv, 37, 61, 79, forks=False)                    # le pied repasse devant le feuillage
    return cv.im


def sapin():
    """Sapin 48 × 64 : étages de branches, chaque étage ombre celui du dessous ; flanc gauche
    éclairé ; bord d'ombre cerné, bord éclairé ouvert."""
    cv = Canvas(48, 64)
    trunk(cv, 21, 56, 63, 6, forks=False)
    tiers = [(24, 2, 5, 16), (24, 11, 10, 28), (24, 22, 15, 42), (24, 34, 20, 56)]

    def tier_of(x, y):
        for i, (cx, top, half, bot) in enumerate(tiers):
            if top <= y + 0.5 <= bot:
                w = half * (y + 0.5 - top) / (bot - top) + 1
                if abs(x + 0.5 - cx) <= w:
                    return i, w
        return None, 0
    own = {(x, y): tier_of(x, y) for y in range(64) for x in range(48)}
    tones = ['V0', 'V2', 'V4', 'V6', 'V8']
    for (x, y), (i, w) in own.items():
        if i is None:
            continue
        cx, top, half, bot = tiers[i]
        rel = (x + 0.5 - cx) / max(1, w)
        lv = 4 if rel < -0.65 else 3 if rel < -0.2 else 2 if rel < 0.35 else 1
        if y + 0.5 > bot - 2:
            lv = min(lv, 1)
        for dd in (1, 2):
            above = own.get((x, y - dd), (None, 0))[0]
            if above is not None and above < i:
                lv = 0
                break
        cv.put(x, y, tones[lv])
    outline_feuillage(cv, lambda x, y: own.get((x, y), (None, 0))[0] is not None, 'V0', 'V1', 5)
    return cv.im


# ================================================================ assemblage

def build():
    """Rassemble tout sur une planche de 16 colonnes ; renvoie (planche, index nom → case,
    blocs des grands éléments, sprites nommés pour le contrôle)."""
    tiles = []          # (nom, image 16×16)
    sprites = {}        # nom de fichier attendu par qa_sprites.py → image
    for v in range(4):
        im = fill_grass('V3', v)
        tiles.append((f'herbe_sombre_{v}', im)); sprites[f'tuile_terrain_herbe-sombre-{v}_16x16.png'] = im
    for base, nom, tufts in (('V6', 'herbe_moyenne', ('V4', 'V5')), ('V8', 'herbe_claire', ('V7', 'V9'))):
        for v in (0, 1, 2):
            im = fill_grass(base, v, tufts)
            tiles.append((f'{nom}_{v}', im)); sprites[f'tuile_terrain_{nom.replace("_", "-")}-{v}_16x16.png'] = im
    im = fill_terre()
    tiles.append(('terre', im)); sprites['tuile_terrain_terre_16x16.png'] = im
    for v in range(3):
        cv = Canvas(T, T)
        cv.rect(0, 0, T - 1, T - 1, 'V3')
        im = fill_paves(v, cv=cv)
        tiles.append((f'paves_{v}', im)); sprites[f'tuile_terrain_paves-{v}_16x16.png'] = im
    for f in range(3):
        im = fill_eau(f)
        tiles.append((f'eau_image{f}', im)); sprites[f'tuile_terrain_eau-{f}_16x16.png'] = im
    wang = {sol: [tache_sol(sol, c) for c in CORNERS] for sol in ('herbe_moyenne', 'herbe_claire', 'terre')}
    wang['paves'] = [tache_paves(c) for c in CORNERS]
    eau_frames = [[tache_eau(c, f) for c in CORNERS] for f in range(3)]
    wang['eau'] = eau_frames[0]
    rows_wang = {}
    for sol, ims in wang.items():
        while len(tiles) % COLS:                       # chaque sol commence une rangée
            tiles.append((None, None))
        rows_wang[sol] = len(tiles)
        for c, im in zip(CORNERS, ims):
            tiles.append((f'{sol}_{"".join(map(str, c))}', im))
            sprites[f'tuile_transition_{sol.replace("_", "-")}-{"".join(map(str, c))}_16x16.png'] = im
    eau_rows = [rows_wang['eau']]
    for f in (1, 2):
        eau_rows.append(len(tiles))
        for c, im in zip(CORNERS, eau_frames[f]):
            tiles.append((f'eau_{"".join(map(str, c))}_image{f}', im))
    for k in ('touffes', 'touffes_claires', 'fleurs_blanches', 'fleurs_jaunes', 'fleurs_lavande', 'trefle',
              'champignon', 'caillou', 'feuilles'):
        im = micro(k)
        tiles.append((k, im))
        famille = 'organique' if k in ('champignon', 'caillou') else 'feuillage' if k == 'trefle' else 'terrain'
        sprites[f'micro_{famille}_{k.replace("_", "-")}_16x16.png'] = im
    im = caisse(); tiles.append(('caisse', im)); sprites['objet_construit_caisse_16x16.png'] = im
    for p in ('gauche', 'milieu', 'droite', 'poteau'):
        im = cloture(p); tiles.append((f'cloture_{p}', im)); sprites[f'objet_construit_cloture-{p}_16x16.png'] = im
    im = rocher(16, 16, big=False); tiles.append(('petit_rocher', im)); sprites['objet_organique_petit-rocher_16x16.png'] = im
    im = roseaux(); tiles.append(('roseaux', im)); sprites['micro_feuillage_roseaux_16x16.png'] = im
    im = nenuphars(); tiles.append(('nenuphars', im)); sprites['micro_feuillage_nenuphars_16x16.png'] = im
    big = [('rocher', rocher(), 'objet_organique_rocher_32x32.png'), ('souche', souche(), 'objet_organique_souche_32x32.png'),
           ('tonneau', tonneau(), 'objet_construit_tonneau_32x32.png'),
           ('buisson_vert', buisson('vert'), 'arbre_feuillage_buisson-vert_32x32.png'),
           ('buisson_baies', buisson('baies'), 'arbre_feuillage_buisson-baies_32x32.png'),
           ('buisson_fleuri', buisson('fleuri'), 'arbre_feuillage_buisson-fleuri_32x32.png'),
           ('buche', buche(), 'objet_organique_buche_32x16.png'), ('foin', foin(), 'objet_construit_foin_32x16.png'),
           ('sapin', sapin(), 'arbre_feuillage_sapin_48x64.png'),
           ('arbre_feuillu', arbre('feuillu'), 'arbre_feuillage_feuillu_80x80.png'),
           ('arbre_fruits', arbre('fruits'), 'arbre_feuillage_fruits_80x80.png'),
           ('arbre_fleurs', arbre('fleurs'), 'arbre_feuillage_fleurs_80x80.png')]
    for nm, im, qa_name in big:
        sprites[qa_name] = im
    grid, names = {}, {}
    for i, (nm, im) in enumerate(tiles):
        if im is not None:
            grid[(i % COLS, i // COLS)] = im
            names[(i % COLS, i // COLS)] = nm
    row = (len(tiles) + COLS - 1) // COLS
    x, row_h, blocks = 0, 0, {}
    for nm, im, _ in big:
        w, h = im.width // T, im.height // T
        if x + w > COLS:
            x, row, row_h = 0, row + row_h, 0
        blocks[nm] = (x, row, w, h)
        for ty in range(h):
            for tx in range(w):
                grid[(x + tx, row + ty)] = im.crop((tx * T, ty * T, tx * T + T, ty * T + T))
                names[(x + tx, row + ty)] = f'{nm}_{tx}_{ty}'
        x += w
        row_h = max(row_h, h)
    rows = row + row_h
    sheet = Image.new('RGBA', (COLS * T, rows * T), (0, 0, 0, 0))
    for (cx, cy), im in grid.items():
        sheet.alpha_composite(im, (cx * T, cy * T))
    sheet.save(os.path.join(ASSETS, NAME + '.png'))
    index = {nm: cy * COLS + cx for (cx, cy), nm in names.items()}
    write_tsx(rows, index, rows_wang, eau_rows, [index[f'eau_image{f}'] for f in range(3)])
    with open(os.path.join(ASSETS, NAME + '.json'), 'w', encoding='utf8') as f:
        json.dump({'//': 'Jeu de tuiles de la ferme (scripts/carte/tileset.py) : nom → numéro de case (rangée × 16 + colonne) ; '
                         'les grands éléments → [colonne, rangée, largeur, hauteur] en cases.',
                   'tuiles': index, 'blocs': blocks}, f, ensure_ascii=False, indent=0)
        f.write('\n')
    print(f'assets/{NAME}.png : {COLS}×{rows} cases')
    return sheet, index, blocks, sprites


def write_tsx(rows, index, rows_wang, eau_rows, eau_fill):
    colors = {'herbe_moyenne': '#407f4f', 'herbe_claire': '#6a9755', 'terre': '#ae8e61', 'paves': '#b7ac91', 'eau': '#5b9daf'}
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           f'<tileset version="1.10" tiledversion="1.10.2" name="{NAME}" tilewidth="{T}" tileheight="{T}" tilecount="{COLS * rows}" columns="{COLS}">',
           f' <image source="{NAME}.png" width="{COLS * T}" height="{rows * T}"/>']
    seq = lambda ids: ''.join(f'<frame tileid="{t}" duration="300"/>' for t in ids)
    for nm, i in sorted(index.items(), key=lambda kv: kv[1]):
        anim = ''
        if i == eau_fill[0]:
            anim = f'<animation>{seq([eau_fill[0], eau_fill[1], eau_fill[2], eau_fill[1]])}</animation>'
        elif eau_rows[0] <= i < eau_rows[0] + 16:
            k = i - eau_rows[0]
            ids = [eau_rows[0] + k, eau_rows[1] + k, eau_rows[2] + k]
            anim = f'<animation>{seq([ids[0], ids[1], ids[2], ids[1]])}</animation>'
        out.append(f' <tile id="{i}"><properties><property name="nom" value="{nm}"/></properties>{anim}</tile>')
    out.append(' <wangsets>')
    for sol, start in rows_wang.items():
        out.append(f'  <wangset name="{sol}" type="corner" tile="{start + 15}">')
        out.append('   <wangcolor name="fond" color="#226152" tile="-1" probability="1"/>')
        out.append(f'   <wangcolor name="{sol}" color="{colors[sol]}" tile="-1" probability="1"/>')
        for k, (tl, tr, bl, br) in enumerate(CORNERS):
            c = lambda b: 2 if b else 1
            out.append(f'   <wangtile tileid="{start + k}" wangid="0,{c(tr)},0,{c(br)},0,{c(bl)},0,{c(tl)}"/>')
        out.append('  </wangset>')
    out += [' </wangsets>', '</tileset>']
    with open(os.path.join(ASSETS, NAME + '.tsx'), 'w', encoding='utf8') as f:
        f.write('\n'.join(out) + '\n')


# ================================================================ scène de démonstration

def demo(sheet, index, blocks, W=48, H=30):
    r = random.Random(7)

    def tile(nm):
        i = index[nm]
        return sheet.crop(((i % COLS) * T, (i // COLS) * T, (i % COLS) * T + T, (i // COLS) * T + T))

    def block(nm):
        x, y, w, h = blocks[nm]
        return sheet.crop((x * T, y * T, (x + w) * T, (y + h) * T))
    out = Image.new('RGBA', (W * T, H * T))

    def blob(cx, cy, rx, ry, seed):
        rr = random.Random(seed)
        ph = [rr.random() * 6 for _ in range(2)]
        def f(x, y):
            a = math.atan2(y - cy, x - cx)
            k = 1 + 0.22 * math.sin(3 * a + ph[0]) + 0.12 * math.sin(5 * a + ph[1])
            return ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 <= 1
        return f

    def path(points, width):
        def f(x, y):
            for (ax, ay), (bx, by) in zip(points, points[1:]):
                vx, vy = bx - ax, by - ay
                t = max(0, min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
                if math.hypot(x - ax - t * vx, y - ay - t * vy) <= width:
                    return True
            return False
        return f
    layers = [
        ('herbe_moyenne', [blob(12, 8, 9, 6, 1), blob(38, 23, 9, 6, 2)]),
        ('herbe_claire', [blob(11, 8, 5, 3.4, 3), blob(39, 23, 5, 3, 4), blob(41, 5, 4, 2.6, 5)]),
        ('eau', [blob(13, 23, 6, 3.6, 6)]),
        ('terre', [path([(0, 15), (14, 15), (20, 18), (34, 18)], 1.25)]),
        ('paves', [path([(26, 0), (26, 9), (47, 9)], 1.2)]),
    ]
    grids = {k: [[any(f(x, y) for f in fs) for x in range(W + 1)] for y in range(H + 1)] for k, fs in layers}
    for y in range(H):
        for x in range(W):
            out.alpha_composite(tile(f'herbe_sombre_{r.choice([0, 0, 0, 0, 1, 2, 3])}'), (x * T, y * T))
            for sol, _ in layers:
                g = grids[sol]
                c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
                if any(c):
                    out.alpha_composite(tile(f'{sol}_{"".join(str(int(b)) for b in c)}'), (x * T, y * T))
    occ = set()

    def free(x, y):
        if not (0 <= x < W and 0 <= y < H) or (x, y) in occ:
            return False
        for sol in ('terre', 'paves', 'eau'):
            g = grids[sol]
            if g[y][x] or g[y][x + 1] or g[y + 1][x] or g[y + 1][x + 1]:
                return False
        return True

    g = grids['eau']
    for y in range(H):
        for x in range(W):
            c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
            if all(c) and r.random() < 0.08:
                out.alpha_composite(tile('nenuphars'), (x * T, y * T))
    for x in range(-2, W, 4):                                  # lisière d'arbres en haut
        nm = r.choice(['arbre_feuillu', 'arbre_feuillu', 'arbre_fruits', 'arbre_fleurs'])
        out.alpha_composite(block(nm), (x * T, (-2 - (x // 4) % 2) * T))
    for nm, x, y in (('arbre_feuillu', 0, 15), ('arbre_fruits', 17, 1), ('sapin', 29, 11), ('arbre_fleurs', 41, 11),
                     ('sapin', 44, 24), ('arbre_feuillu', 27, 22)):
        _, _, w, h = blocks[nm]
        if free(x + w // 2, y + h - 1):
            out.alpha_composite(block(nm), (x * T, y * T))
            occ.add((x + w // 2, y + h - 1))
    for x in range(32, 41):                                    # clôture
        nm = 'cloture_gauche' if x == 32 else 'cloture_droite' if x == 40 else 'cloture_milieu'
        if free(x, 15):
            out.alpha_composite(tile(nm), (x * T, 15 * T)); occ.add((x, 15))
    micro_k = ['touffes'] * 4 + ['touffes_claires', 'fleurs_blanches', 'fleurs_jaunes', 'fleurs_lavande', 'trefle',
               'champignon', 'caillou', 'feuilles']
    for _ in range(W * H // 10):                               # environ un élément pour 10 cases
        x, y = r.randrange(W), r.randrange(H)
        if free(x, y):
            out.alpha_composite(tile(r.choice(micro_k)), (x * T, y * T)); occ.add((x, y))
    for nm, n in (('buisson_vert', 5), ('buisson_baies', 2), ('buisson_fleuri', 2), ('rocher', 2), ('souche', 1),
                  ('tonneau', 1), ('buche', 1), ('foin', 2)):
        for _ in range(n):
            for _try in range(40):
                _, _, w, h = blocks[nm]
                x, y = r.randrange(W - w + 1), r.randrange(H - h + 1)
                if all(free(xx, y + h - 1) for xx in range(x, x + w)):
                    out.alpha_composite(block(nm), (x * T, y * T))
                    for xx in range(x, x + w):
                        occ.add((xx, y + h - 1))
                    break
    for nm in ('petit_rocher', 'caisse', 'caisse'):
        for _try in range(40):
            x, y = r.randrange(W), r.randrange(H)
            if free(x, y):
                out.alpha_composite(tile(nm), (x * T, y * T)); occ.add((x, y))
                break
    return out


if __name__ == '__main__':
    sheet, index, blocks, sprites = build()
    if '--demo' in sys.argv:
        demo(sheet, index, blocks).save(os.path.join(ROOT, 'demo_tileset.png'))
        print('demo_tileset.png')
    if '--qa' in sys.argv:
        rejets, rapport = qa(sprites, os.path.join(ROOT, 'qa_tileset'))
        print(rapport)
        print(f'{len(sprites) - rejets}/{len(sprites)} sprites conformes')
