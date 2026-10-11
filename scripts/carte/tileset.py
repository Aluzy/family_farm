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
from pastoral import (OMBRE_CONTACT, PAL, Canvas, amas, level, ombre_contact, outline_construit,  # noqa: E402
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


def stone(cv, x0, y0, w, h, wrap=True, sunk=False):
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
            if sunk:                                       # pierre enfoncée : un cran plus sombre
                c = {'P4': 'P3', 'P3': 'P2', 'P2': 'P1', 'P1': 'P0', 'P0': 'P0'}[c]
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


def along(c, x, y):
    """Coordonnée le long du bord : x pour un bord plutôt horizontal, y sinon."""
    f = lambda a, b: corner_field(a, b, c)
    gx, gy = f(x + 1, y) - f(x - 1, y), f(x, y + 1) - f(x, y - 1)
    return (x if abs(gy) >= abs(gx) else y) % 16, gx, gy


def cluster_map(seed, n=30):
    """Carte d'amas de 16 × 16, périodique : chaque pixel appartient à l'amas de la graine la plus
    proche (sur la tuile répétée), et chaque amas (6 à 10 px) porte une valeur entre 0 et 1,
    réparties uniformément. Elle sert à fondre deux tons par amas, jamais pixel par pixel."""
    r = random.Random(seed)
    seeds = [(r.random() * 16, r.random() * 16, (i + r.random()) / n) for i in range(n)]
    m = [[0.0] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            best = None
            for sx, sy, v in seeds:
                dx = min(abs(x + 0.5 - sx), 16 - abs(x + 0.5 - sx))
                dy = min(abs(y + 0.5 - sy), 16 - abs(y + 0.5 - sy))
                dd = dx * dx + dy * dy
                if best is None or dd < best[0]:
                    best = (dd, v)
            m[y][x] = best[1]
    return m


AMAS = cluster_map('amas')
AMAS2 = cluster_map('amas2')
AMAS_FIN = cluster_map('amas-fin', 64)          # amas d'environ 4 px, pour la présence du sol

# Fondu d'un sol posé sur l'herbe sombre, sur toute la tuile de bord : la part du sol `p`
# monte doucement de 0 (8 px dehors) à 1 (8 px dedans). Un pixel est au sol si la valeur de son
# amas est sous `p` : au-dehors, des amas épars de plus en plus serrés ; au-dedans, des îlots
# d'herbe qui se raréfient. Les pixels du sol prennent les tons de frange selon `p`, puis le
# centre. La carte d'amas est la même pour toutes les tuiles : aucune couture.
FONDUS = {
    # sol : tons de frange du bord vers le centre
    'herbe_moyenne': ['V4', 'V5'],
    'herbe_claire': ['V5', 'V6', 'V7'],
    'terre': ['T1', 'T2'],                 # pas de T0 : il redessinerait une ligne de bord
}
BRIN = {'herbe_moyenne': None, 'herbe_claire': None, 'terre': ('V4', 'V5')}   # brins d'herbe qui mordent dedans
LARGEUR_FONDU = 16.0   # en unités du champ (2 par pixel) : toute la tuile de bord, 8 px de part et d'autre


def part_du_sol(d):
    t = min(1.0, max(0.0, (LARGEUR_FONDU - d) / (2 * LARGEUR_FONDU)))
    return t * t * (3 - 2 * t)


def tache_sol(name, c):
    """Tache d'herbe ou de terre, fond transparent, fondue dans l'herbe sombre par amas (voir
    FONDUS) ; pour la terre, des brins d'herbe mordent en plus sur le bord."""
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    tex = (fill_terre() if name == 'terre' else fill_grass({'herbe_moyenne': 'V6', 'herbe_claire': 'V8'}[name], 0)).load()
    tons = FONDUS[name]
    for y in range(T):
        for x in range(T):
            d = corner_field(x, y, c)
            p = part_du_sol(d)
            if p <= 0 or AMAS_FIN[y][x] * 0.92 + 0.04 >= p:
                continue                                         # l'herbe du dessous paraît
            # ton selon la profondeur dans le sol (2 unités par pixel), décalé par amas
            depth = -d + (AMAS[y][x] - 0.5) * 6
            k = int((depth + 4) / 4.5)
            if k < len(tons):
                cv.put(x, y, tons[max(0, k)])
            else:
                cv.px[x, y] = tex[x, y]
            u, gx, gy = along(c, x, y)
            brin = BRIN[name]
            if brin and -6 < d <= 0 and BRINS[u] and d > -2 * BRINS[u]:
                cv.put(x, y, brin[1] if d > -2 * BRINS[u] + 1 else brin[0])   # brin d'herbe
    return cv.im


def tache_paves(c, variant=0):
    """Pavés posés sur le sol, fondus au bord : au cœur, toutes les pierres ; vers le bord,
    des pierres plus rares et enfoncées (plus sombres) ; au-dehors, quelques cailloux épars.
    L'herbe paraît dans les joints et autour."""
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    r = random.Random(f'paves-{c}-{variant}')
    for x0, y0, w, h in PAVES[variant]:
        for ox in (-16, 0, 16):
            for oy in (-16, 0, 16):
                sx, sy = x0 % 16 + ox, y0 % 16 + oy
                if not (-w < sx < T and -h < sy < T):
                    continue
                cx, cy = sx + w / 2 - 0.5, sy + h / 2 - 0.5
                kx, ky = min(15, max(0, cx)), min(15, max(0, cy))
                d = corner_field(kx, ky, c)
                keep = (x0 * 7 + y0 * 13) % 10 / 10                # le même choix des deux côtés d'un bord
                if d <= -6 or (d <= -1.5 and keep < 0.75):
                    stone(cv, sx, sy, w, h, wrap=False, sunk=d > -6)
                elif d <= 3 and keep < 0.3:
                    stone(cv, sx + 2, sy + 1, max(4, w - 4), max(3, h - 2), wrap=False, sunk=True)
    return cv.im


def tache_eau(c, frame=0):
    """Eau et sa berge, fond transparent, du dehors vers le large : herbe humide (V2, par amas),
    dessus de berge (T3, T2, T1), face de la berge au nord (W2, W1), écume brisée (E4), eau peu
    profonde claire (E3 et E2 mêlés) avec quelques galets côté sud, eau profonde (E1, stries E0)
    sous la berge nord, puis l'eau (E2, tirets E3)."""
    cv = Canvas(T, T)
    if not any(c):
        return cv.im
    for y in range(T):
        for x in range(T):
            d = corner_field(x, y, c)
            u, gx, gy = along(c, x, y)
            n = math.hypot(gx, gy) or 1
            north = -gy / n > 0.55
            south = gy / n > 0.55
            side = abs(gx / n) > 0.55
            a = AMAS[y][x]
            if d > 0:
                if north:
                    if d <= 4:
                        cv.put(x, y, 'W1' if d <= 1.5 else 'W2')                     # face de la berge
                    elif d <= 7 + (a - 0.5) * 2:
                        cv.put(x, y, 'T1' if d > 6 else 'T2' if a < 0.55 else 'T3')  # dessus, lèvre
                    elif d <= 10 and AMAS2[y][x] > 0.6:
                        cv.put(x, y, 'V2')                                          # herbe humide
                else:
                    if d <= 3 + (a - 0.5) * 2:
                        cv.put(x, y, 'T3' if south and d < 1.6 else 'T2' if a < 0.6 else 'T1')
                    elif d <= 4.5 + BRINS[u] * 0.5:
                        cv.put(x, y, 'T1')
                    elif d <= 7.5 and AMAS2[y][x] > 0.62:
                        cv.put(x, y, 'V2')
                continue
            depth = -d
            col = 'E2'
            if depth <= 1:
                col = 'E4' if a > 0.3 and (not side or y % 2 == 0) else 'E3'               # écume brisée
            elif north and depth <= 7:
                col = 'E1' if not (depth > 5.5 and a > 0.6) else 'E2'                     # eau profonde
                if depth > 2.5 and (x + y * 3) % 11 == 0:
                    col = 'E0'
            elif depth <= 3.5 + (a - 0.5) * 2:
                col = 'E3' if a > 0.45 else 'E2'                                           # peu profonde
                if south and depth <= 3 and AMAS2[y][x] > 0.85:
                    col = 'B2' if a > 0.7 else 'B1'                                        # galets
            cv.put(x, y, col)
            if col == 'E2':
                for x0, yy, k, cc in water_dashes(frame):
                    if yy == y and (x - x0) % 16 < k:
                        cv.put(x, y, cc)
    return cv.im


CORNERS = [(tl, tr, bl, br) for tl in (0, 1) for tr in (0, 1) for bl in (0, 1) for br in (0, 1)]


# ================================================================ micro-décor

FLEURS = {
    # nom : (pétales éclairés, pétales à l'ombre, cœur)
    'fleurs_blanches': ('A3', 'A2', 'A6'), 'fleurs_jaunes': ('A4', 'A5', 'A6'), 'fleurs_lavande': ('A2', 'A1', 'A6'),
    'marguerites': ('A3', 'A2', 'A4'), 'coquelicots': ('A7', 'A7', 'W0'), 'bleuets': ('A9', 'A1', 'A0'),
    'roses': ('A8', 'A8', 'A2'),
}


def micro(kind):
    cv = Canvas(T, T)
    if kind == 'touffes':
        touffe(cv, 2, 9); touffe(cv, 9, 13)
    elif kind == 'touffes_claires':
        touffe(cv, 3, 10, 'V7', 'V8'); touffe(cv, 9, 6, 'V7', 'V8')
    elif kind in FLEURS:
        lit, shade, heart = FLEURS[kind]
        for cx, cy in ((4, 6), (11, 10), (7, 12))[: 2 if kind != 'marguerites' else 3]:
            cv.vline(cx, cy + 2, cy + 5, 'V6')               # tige
            cv.put(cx + 1, cy + 4, 'V5')
            for dx, dy in ((-2, 0), (1, 0), (-1, -2), (-1, 1)):  # pétales de 2 × 2
                for ex in (0, 1):
                    for ey in (0, 1):
                        cv.put(cx + dx + ex, cy + dy + ey - 1, lit if dy <= 0 and dx < 1 else shade)
            cv.put(cx, cy, heart)                            # cœur
    elif kind == 'lavande':
        for x0, h in ((4, 9), (7, 11), (10, 8), (12, 10)):
            cv.vline(x0, 15 - h + 4, 15, 'V5')
            for k in range(4):                                # épi
                cv.put(x0, 15 - h + k, 'A1' if k % 2 else 'A2')
                if k % 2 == 0:
                    cv.put(x0 + 1, 15 - h + k + 1, 'A1')
    elif kind == 'chardon':
        cv.vline(8, 7, 15, 'V5')
        for dx, y in ((-3, 12), (2, 11), (-2, 9), (3, 13)):   # feuilles piquantes
            cv.hline(min(8, 8 + dx), max(8, 8 + dx), y, 'V6')
            cv.put(8 + dx, y - 1, 'V8')
        cv.rect(6, 4, 9, 6, 'A8'); cv.hline(6, 9, 3, 'A2'); cv.put(7, 4, 'A2')
        cv.hline(6, 9, 7, 'V2')
    elif kind == 'pissenlit':
        for cx, cy, puff in ((5, 8, False), (11, 6, True)):
            cv.vline(cx, cy + 2, 15, 'V6')
            if puff:
                for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1), (0, -2), (-2, 0), (2, 0), (0, 0)):
                    cv.put(cx + dx, cy + dy, 'A3' if dy <= 0 else 'A2')
            else:
                cv.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'A4'); cv.put(cx + 1, cy + 1, 'A6')
        cv.hline(3, 7, 14, 'V5'); cv.put(2, 13, 'V6'); cv.put(8, 13, 'V6')
    elif kind == 'fougere':
        for ang, ln in ((-2.2, 7), (-1.6, 8), (-1.0, 7), (-0.5, 6), (-2.7, 6)):
            for k in range(ln):
                x = round(8 + math.cos(ang) * k * 0.9)
                y = round(14 + math.sin(ang) * k)
                cv.put(x, y, 'V8' if ang < -1.3 else 'V6')
                if k % 2 == 1 and k < ln - 1:                 # folioles
                    cv.put(x + (1 if ang > -1.6 else -1), y, 'V5')
    elif kind == 'herbes_hautes':
        for x0, h, c in ((3, 9, 'V5'), (5, 11, 'V7'), (8, 12, 'V5'), (10, 9, 'V7'), (12, 10, 'V5')):
            for k in range(h):
                cv.put(x0 + (k > h - 3) * (1 if x0 > 7 else -1), 15 - k, c if k < h - 2 else 'V9')
    elif kind == 'champignons_bruns':
        for cx, cy, w in ((5, 11, 3), (11, 13, 2)):
            for k in range(2):
                cv.hline(cx - w + k, cx + w - k, cy - 1 - k, 'B2' if k else 'B1')
            cv.put(cx - w + 1, cy - 2, 'C1')
            cv.vline(cx, cy, cy + 2, 'C1')
        ombre_contact(cv, 3, 13, 15, 1)
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
        # deux cailloux à facettes, R1 à R3, bord d'ombre N2, ombre de contact
        pierre(cv, 11, 13, 2.6, 1.7, 1.2, 21, n=5)
        pierre(cv, 5.5, 13, 4, 2.4, 2, 20, n=6)
    elif kind == 'feuilles':
        for cx, cy, c1, c2 in ((4, 5, 'A6', 'W3'), (11, 9, 'A4', 'A6'), (6, 12, 'A6', 'W3')):
            cv.put(cx, cy, c1); cv.put(cx + 1, cy, c1); cv.put(cx + 1, cy - 1, c1); cv.put(cx, cy + 1, c2)
    return ancrer(cv.im)


# ================================================================ objets

LUM3 = (-0.62, -0.3, 0.72)          # vers la lumière en 3D : haut-gauche et d'au-dessus


def pierre(cv, cx, by, rx, ry, hz, seed, moss=False, n=8):
    """Pierre en vue de trois quarts : une assise irrégulière de `n` sommets posée au sol, un
    plateau plus étroit, décalé vers le haut-gauche et levé de `hz` à l'écran ; les faces entre
    les deux reçoivent la lumière selon leur normale 3D (par rang : R3, R2, R1), le plateau est
    clair (R3) ; arête du plateau, fissure, reflet R0 au bas du côté ombre, mousse éventuelle ;
    bord d'ombre N2. Renvoie la forme (ensemble de pixels)."""
    r = rng('pierre', seed)
    cy = by - ry
    base, top = [], []
    sx, sy = -rx * r.uniform(0.08, 0.2), -ry * r.uniform(0.1, 0.25)
    for i in range(n):
        a = 2 * math.pi * (i + r.uniform(-0.22, 0.22)) / n
        k = r.uniform(0.82, 1.0)
        x, y = cx + math.cos(a) * rx * k, cy + math.sin(a) * ry * k
        base.append((x, min(y, by)))
        kt = r.uniform(0.58, 0.78)
        top.append((cx + sx + math.cos(a) * rx * k * kt, cy + sy + math.sin(a) * ry * k * kt))
    P = lambda x, y, z: (x, y - z)                         # projection : la hauteur monte à l'écran

    def poly_in(poly, x, y):
        c = False
        for i in range(len(poly)):
            (x1, y1), (x2, y2) = poly[i], poly[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c
    faces = []
    for i in range(n):
        j = (i + 1) % n
        g = [(base[i][0], base[i][1], 0), (base[j][0], base[j][1], 0), (top[j][0], top[j][1], hz), (top[i][0], top[i][1], hz)]
        u = [g[1][k] - g[0][k] for k in range(3)]; v = [g[3][k] - g[0][k] for k in range(3)]
        nx, ny, nz = u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]
        if nz < 0:
            nx, ny, nz = -nx, -ny, -nz
        ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
        d = (nx * LUM3[0] + ny * LUM3[1] + nz * LUM3[2]) / ln
        faces.append(((base[i][1] + base[j][1]) / 2, [P(*q) for q in g], d))
    rank = sorted(range(n), key=lambda t: -faces[t][2])
    tone = {}
    for k, t in enumerate(rank):
        f = k / n
        tone[t] = 'R3' if f < 0.25 else 'R2' if f < 0.6 else 'R1'
    own = {}
    X0, X1 = int(cx - rx - 2), int(cx + rx + 3)
    Y0, Y1 = int(cy - ry - hz - 2), int(by) + 1
    for t in sorted(range(n), key=lambda t: faces[t][0]):          # du fond vers le devant
        for y in range(Y0, Y1):
            for x in range(X0, X1):
                if poly_in(faces[t][1], x + 0.5, y + 0.5):
                    own[(x, y)] = t
    plateau = [P(x, y, hz) for x, y in top]
    for y in range(Y0, Y1):
        for x in range(X0, X1):
            if poly_in(plateau, x + 0.5, y + 0.5):
                own[(x, y)] = -1
    inside = lambda x, y: (x, y) in own
    for (x, y), t in own.items():
        cv.put(x, y, 'R3' if t == -1 else tone[t])
    for (x, y), t in own.items():                         # arête du plateau sur une face claire
        if t != -1 and tone[t] == 'R3' and any(own.get((x + dx, y + dy)) == -1 for dx, dy in ((1, 0), (0, -1), (1, -1))):
            cv.put(x, y, 'R2')
    pl = sorted(p for p, t in own.items() if t == -1)
    if len(pl) > 12:                                      # fissure sur le plateau
        x, y = pl[len(pl) // 2]
        for k in range(r.randint(2, 4)):
            if own.get((x + k // 2, y + k)) is not None:
                cv.put(x + k // 2, y + k, 'R1')
    faces_px = {}
    for q, t in own.items():
        if t != -1:
            faces_px.setdefault(tone[t], []).append(q)
    for c, grain in (('R1', 'R2'), ('R2', 'R1')):         # grain de la roche : amas d'un ton voisin
        cand = sorted(q for q in faces_px.get(c, []) if inside(q[0] + 1, q[1] + 1) and inside(q[0] - 1, q[1] - 1))
        cset = set(cand)
        for _ in range(len(cand) // 24):                  # strates : traits horizontaux de 2 à 4 px
            x, y = r.choice(cand)
            for k in range(r.randint(2, 4)):
                if (x + k, y) in cset:
                    cv.put(x + k, y, grain)
    outline_cote_ombre(cv, inside, 'N2')
    low = sorted(((x, y) for (x, y) in own if not inside(x, y + 1) and x > cx), key=lambda p: -p[0])
    for x, y in low[1:1 + max(1, int(rx / 3))]:           # reflet violet au bas du côté ombre
        if inside(x, y - 1) and inside(x - 1, y - 1):
            cv.put(x, y - 1, 'R0')
    if moss and pl:
        for _ in range(2):
            x, y = r.choice(pl)
            for q in amas(r, x, y, r.randint(3, 6)):
                if own.get(q) == -1:
                    cv.put(*q, 'V6' if q[0] < cx else 'V4')
    ombre_portee(cv, base + [(x + 1.2, y + 1.2) for x, y in base] + [(x + hz * 0.95, y + hz * 0.55) for x, y in top], set(own))
    return set(own)


SOMBRIR = {'R3': 'R2', 'R2': 'R1', 'R1': 'N2', 'B2': 'B1', 'B1': 'R1', 'V6': 'V4', 'V5': 'V3', 'V4': 'V3'}


def ombre_portee(cv, pts, mine):
    """Ombre portée d'un volume : l'enveloppe convexe de son pied et de ses points hauts projetés
    au sol vers le bas-droite (lumière haut-gauche). Sur le sol (pixels transparents) elle prend
    la prune translucide ; sur un autre objet déjà peint, elle l'assombrit d'un ton."""
    pts = sorted(set((round(x, 2), round(y, 2)) for x, y in pts))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for q in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], q) <= 0:
            lower.pop()
        lower.append(q)
    for q in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], q) <= 0:
            upper.pop()
        upper.append(q)
    hull = lower[:-1] + upper[:-1]
    inv = {PAL[k]: v for k, v in SOMBRIR.items()}
    for y in range(int(min(q[1] for q in hull)), int(max(q[1] for q in hull)) + 1):
        for x in range(int(min(q[0] for q in hull)), int(max(q[0] for q in hull)) + 2):
            px_, py_ = x + 0.5, y + 0.5
            sides = [cross(hull[i], hull[(i + 1) % len(hull)], (px_, py_)) for i in range(len(hull))]
            if all(v >= 0 for v in sides) or all(v <= 0 for v in sides):
                if (x, y) in mine or not (0 <= x < cv.w and 0 <= y < cv.h):
                    continue
                c = cv.px[x, y]
                if c[3] == 0:
                    cv.px[x, y] = OMBRE_CONTACT
                elif c[3] == 255 and c[:3] in inv:
                    cv.put(x, y, inv[c[:3]])


def assise(shape):
    """Rangée du bas de la forme : là où l'ombre de contact commence."""
    return max(y for x, y in shape) + 1


def herbe_au_pied(cv, shape, seed, n=3):
    """Quelques brins d'herbe qui montent devant l'assise : l'objet est posé dans l'herbe."""
    r = rng('herbe-pied', seed)
    base = sorted((x, y) for (x, y) in shape if (x, y + 1) not in shape)
    for _ in range(n):
        if not base:
            return
        x, y = r.choice(base)
        h = r.randint(2, 3)
        for k in range(h):
            cv.put(x, y - k, 'V5' if k == h - 1 else 'V4')
        cv.put(x + 1, y, 'V4')


def rocher(w=32, h=32, big=True):
    """Rocher (organique dur) : un bloc à facettes (crête au haut-gauche, assise aplatie) et, pour
    le grand, une pierre plus petite blottie contre lui ; mousse sur le dessus, herbe au pied,
    ombre de contact."""
    cv = Canvas(w, h)
    if big:
        s1 = pierre(cv, 23, h - 4, 6, 3.5, 3, 11, n=7)
        s2 = pierre(cv, 13, h - 4, 11.5, 6.5, 7, 10, moss=True, n=9)
        shape = s1 | s2
        herbe_au_pied(cv, shape, 1, 4)
    else:
        shape = pierre(cv, 7, h - 4, 5.5, 3.4, 3.5, 12, n=7)
        herbe_au_pied(cv, shape, 2, 2)
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
    """Clôture rustique (construit, module de 16 × 16) : un piquet de 4 px par module, tête
    chanfreinée et hauteur un peu inégale, deux lisses clouées devant qui fléchissent entre les
    piquets ; fil du bois en amas, clous, herbe et ombre de contact au pied ; contour W0. Les
    lisses rejoignent le module voisin (même hauteur aux deux bords)."""
    cv = Canvas(16, 16)
    if part == 'verticale':
        return cloture_verticale()
    tete = {'gauche': 2, 'milieu': 3, 'droite': 2, 'poteau': 2}[part]
    post = set()
    for x in range(6, 10):
        top = tete + (1 if x in (6, 9) else 0)               # tête chanfreinée
        for y in range(top, 16):
            post.add((x, y))
    a = 6 if part == 'gauche' else 0
    b = 9 if part == 'droite' else 15
    rails = {}
    if part != 'poteau':
        for x in range(a, b + 1):
            sag = 1 if x < 3 or x > 12 else 0                 # la lisse fléchit entre deux piquets
            for y0 in (5, 10):
                rails[(x, y0 + sag)] = 0
                rails[(x, y0 + sag + 1)] = 1
    shape = post | set(rails)
    outline_construit(cv, lambda x, y: (x, y) in shape, 'W0')
    for (x, y) in post:
        k = x - 6
        cv.put(x, y, 'W4' if y <= tete + 1 and k in (1, 2) else ('W4', 'W3', 'W2', 'W1')[k])
    cv.vline(7, 7, 9, 'W2'); cv.vline(8, 12, 14, 'W2')        # fil du bois
    for (x, y), row in rails.items():
        cv.put(x, y, 'W4' if row == 0 else 'W2')
    if part != 'poteau':
        for x in range(a + 2, b - 1):                         # fil des lisses
            if (x * 7 + 3) % 11 < 3 and (x, 6) in rails and rails[(x, 6)] == 1:
                cv.put(x, 6, 'W3')
            if (x * 5 + 1) % 13 < 3 and (x, 11) in rails and rails[(x, 11)] == 1:
                cv.put(x, 11, 'W3')
        cv.put(7, 5, 'R2'); cv.put(8, 10, 'R2')               # clous
    if part in ('milieu', 'droite'):                          # raccord à gauche : pas de contour
        for (x, y), row in rails.items():
            if x == 0:
                cv.put(0, y - 1 if row == 0 else y + 1, 'W0')
    ombre_contact(cv, 3, 12, 15, 1)
    touffe_pied(cv, 3, 15, 4); touffe_pied(cv, 10, 15, 5)        # herbe au pied
    if part != 'poteau':
        touffe_pied(cv, 13, 15, 6); touffe_pied(cv, 0, 15, 7)
    return cv.im


def touffe_pied(cv, x, y, seed):
    """Touffe d'herbe de 3 à 4 brins au pied d'un piquet (V4 à V6, la pointe claire)."""
    r = rng('touffe-pied', seed, x, y)
    for k, dx in enumerate((0, 1, 2)):
        h = r.randint(3, 4) if k != 1 else r.randint(4, 6)
        for j in range(h):
            if cv.get(x + dx, y - j)[3] == 0 or cv.get(x + dx, y - j)[3] < 255:
                cv.put(x + dx, y - j, 'V8' if j == h - 1 else 'V5' if j < 2 else 'V6')


def cloture_verticale():
    """Clôture qui file vers le bas (module de 16 × 16), comme celle du jeu de tuiles
    d'origine : une colonne étroite de 4 px où se suivent la lisse, vue de bout et dans l'ombre
    (W1, une arête W2), et la tête du piquet suivant (chapeau W4, face éclairée à gauche) ;
    touffes d'herbe des deux côtés au pied du piquet ; contour W0, ombre à droite. Le haut et
    le bas du module se raccordent."""
    cv = Canvas(16, 16)
    col = {(x, y) for x in range(6, 10) for y in range(7, 16)} | {(x, y) for x in (7, 8) for y in range(7)}
    outline_construit(cv, lambda x, y: (x, y) in col, 'W0')
    for y in range(16):
        cv.px[10 if y < 7 else 11, y] = OMBRE_CONTACT
        if y < 7:                                            # la lisse, plus étroite que le piquet
            cv.put(7, y, 'W3'); cv.put(8, y, 'W1')
        else:                                                # le piquet
            for x in range(6, 10):
                cv.put(x, y, ('W4', 'W3', 'W2', 'W1')[x - 6])
    cv.hline(6, 9, 7, 'W0')                                  # dessus du piquet
    cv.put(7, 8, 'W4'); cv.put(8, 8, 'W4')
    cv.vline(7, 11, 13, 'W2')                                # fil du bois
    cv.put(8, 4, 'R2')                                       # clou
    touffe_pied(cv, 3, 15, 1); touffe_pied(cv, 11, 15, 2)
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

def houppier(seed, cx, cy, rx, ry, n, rmin, rmax, tufts, tuft_r):
    """Houppier foisonnant : `n` touffes (rayon `rmin` à `rmax`, plus grosses au cœur) semées
    dans l'ellipse (cx, cy, rx, ry), et `tufts` petites touffes sur le pourtour qui festonnent
    la silhouette. Rangées du bas vers le haut : celles du haut passent devant."""
    r = rng('houppier', seed)
    blobs = []
    for _ in range(3000):
        if len(blobs) >= n:
            break
        a = r.random() * 2 * math.pi
        d = math.sqrt(r.random())
        rad = rmax - (rmax - rmin) * d + r.uniform(-0.6, 0.6)
        x = cx + math.cos(a) * d * (rx - rad)
        y = cy + math.sin(a) * d * (ry - rad)
        if all(math.hypot(x - bx, y - by) > 0.55 * (rad + br) for bx, by, br in blobs):
            blobs.append((x, y, rad))
    for i in range(tufts):
        a = 2 * math.pi * (i + r.uniform(0, 0.7)) / tufts
        rad = r.uniform(*tuft_r)
        blobs.append((cx + math.cos(a) * (rx - rad * 0.7), cy + math.sin(a) * (ry - rad * 0.7), rad))
    blobs.sort(key=lambda b: -b[1])
    fond = []                                             # touffes de fond, derrière : aucun trou
    for gy in range(-2, 3):
        for gx in range(-2, 3):
            x, y = cx + gx * (rx - rmax) / 2.4, cy + gy * (ry - rmax) / 2.4
            if (gx / 2.4) ** 2 + (gy / 2.4) ** 2 <= 1:
                fond.append((x, y, rmax))
    fond.sort(key=lambda b: -b[1])
    return fond + blobs


# petites feuilles posées sur les aplats : trois pixels, la pointe vers le haut
FEUILLES = (((0, 0), (1, 0), (1, -1)), ((0, 0), (1, 0), (0, -1)), ((0, 0), (0, -1), (1, -1)))


def foliage(cv, blobs, tones, seed, fruit=None, flowers=None, local=0.5):
    """Feuillage en touffes superposées : chaque touffe est éclairée en haut à gauche (normale
    mêlée à celle du houppier entier), les touffes du haut passent devant et ombrent celles du
    dessous ; dessous de chaque touffe foncé, petites feuilles claires sur les aplats éclairés et
    sombres dans l'ombre, creux d'indigo A0 ; bord d'ombre cerné, bord éclairé ouvert.
    `tones` : [ombre profonde, ombre, base, lumière, reflet]."""
    X0 = min(cx - r for cx, cy, r in blobs); X1 = max(cx + r for cx, cy, r in blobs)
    Y0 = min(cy - r for cx, cy, r in blobs); Y1 = max(cy + r for cx, cy, r in blobs)
    CX, CY, RX, RY = (X0 + X1) / 2, (Y0 + Y1) / 2, (X1 - X0) / 2, (Y1 - Y0) / 2

    def owner(x, y):
        k = None
        for i, (cx, cy, r) in enumerate(blobs):
            if abs(x + 0.5 - cx) > r + 1 or abs(y + 0.5 - cy) > r + 1:
                continue
            a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r * (1 + 0.1 * math.cos(5 * a + i * 1.7)):   # bord dentelé
                k = i
        return k
    own = {(x, y): owner(x, y) for y in range(cv.h) for x in range(cv.w)}
    inside = lambda x, y: own.get((x, y)) is not None
    lvl = {}
    for (x, y), k in own.items():
        if k is None:
            continue
        cx, cy, r = blobs[k]
        nx = local * (x + 0.5 - cx) / r + 0.7 * (x + 0.5 - CX) / RX
        ny = local * (y + 0.5 - cy) / r + 0.8 * (y + 0.5 - CY) / RY        # le bas du houppier fonce
        lv = level(nx, ny, 0.08)
        if own.get((x, y + 2)) != k and lv > 1:
            lv -= 1                                       # dessous de la touffe : un cran plus sombre
        feuille = FEUILLES_AMAS[(y + seed) % 16][(x + seed * 3) % 16]
        if 1 <= lv <= 3 and feuille > 0.88:
            lv += 1                                       # amas de feuilles qui accrochent la lumière
        elif 2 <= lv <= 3 and feuille < 0.1:
            lv -= 1                                       # amas de feuilles dans l'ombre
        for dd in (1, 2):                                     # ombre d'une touffe de devant
            q = own.get((x - dd, y - dd))
            if q is not None and q > k:
                lv = 0 if dd == 1 else min(lv, 1)
                break
        lvl[(x, y)] = lv
    r = rng('feuillage', seed)
    for gy in range(0, cv.h, 5):                              # petites feuilles, une par case de 6 × 5
        for gx in range(0, cv.w, 6):
            x, y = gx + r.randint(0, 5), gy + r.randint(0, 4)
            shape = r.choice(FEUILLES)
            cells = [(x + dx, y + dy) for dx, dy in shape]
            if not all(own.get(c) == own.get((x, y)) and c in lvl for c in cells):
                continue
            lv = lvl[(x, y)]
            if any(lvl[c] != lv for c in cells):
                continue
            new = lv + 1 if lv == 3 or lv == 2 and r.random() < 0.5 else lv - 1 if lv == 1 and r.random() < 0.4 else None
            if new is not None:
                for c in cells:
                    lvl[c] = new
    for (x, y), lv in lvl.items():
        cv.put(x, y, tones[lv])
    outline_feuillage(cv, inside, tones[0], tones[1], seed)
    deep = sorted((x, y) for (x, y), k in own.items() if k is not None and cv.get(x, y)[:3] == PAL[tones[0]]
                  and x > CX and y > CY and inside(x + 1, y + 1) and inside(x - 1, y - 1))
    for _ in range(max(2, len(blobs) // 8)):                  # touches d'indigo au creux
        if deep:
            x, y = r.choice(deep)
            for p in amas(r, x, y, r.randint(2, 4)):
                if inside(*p) and inside(p[0] + 1, p[1] + 1):
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
            for p in amas(r, x, y, r.randint(2, 5)):
                if inside(*p):
                    cv.put(*p, flowers[0][0] if lit else flowers[0][1])
    return own


FEUILLES_AMAS = cluster_map('feuilles', 40)        # amas de feuilles, pour casser les grands aplats
V_RAMP = ['V1', 'V2', 'V6', 'V8', 'V10']         # ombre profonde, ombre, base, lumière, reflet
V_RAMP_CLAIR = ['V2', 'V5', 'V8', 'V10', 'V11']


def buisson(kind):
    """Buisson 32 × 26 dans 32 × 32 : une douzaine de touffes festonnées, les plus claires en
    haut à gauche, pas de tronc."""
    cv = Canvas(32, 32)
    blobs = houppier({'vert': 1, 'baies': 2, 'fleuri': 3, 'roses': 4}[kind], 16, 20, 14.5, 10.5,
                     7, 3.2, 5.5, 12, (2.0, 3.0))
    if kind == 'vert':
        foliage(cv, blobs, V_RAMP, 1)
    elif kind == 'baies':
        foliage(cv, blobs, V_RAMP, 2, fruit=(('A7', 'W0'), 7))
    elif kind == 'fleuri':
        foliage(cv, blobs, V_RAMP, 3, flowers=(('A3', 'A2'), 6))
    elif kind == 'roses':
        foliage(cv, blobs, V_RAMP, 4, flowers=(('A8', 'A7'), 8))
    ombre_pied(cv, 16, 13, 31, 2)
    return ancrer(cv.im)


def arbuste():
    """Petit arbuste 16 × 16 : trois amas sur un pied court."""
    cv = Canvas(16, 16)
    cv.vline(7, 12, 15, 'W2'); cv.vline(8, 12, 15, 'W1')
    foliage(cv, [(8, 10, 4.5), (5, 8, 3), (11, 8, 3), (8, 5, 3.5)], V_RAMP, 7)
    cv.vline(7, 14, 15, 'W2'); cv.vline(8, 14, 15, 'W1')
    ombre_pied(cv, 8, 5, 15, 1)
    return cv.im


# ================================================================ troncs et branches

EVASEMENT = ([0, 0, 1, 1, 2, 4], [0, 1, 1, 2, 3, 5])      # pied : surplus à gauche, à droite (6 rangées)


def trunk(cv, x0, top, bot, w=7, ramp=('W4', 'W3', 'W2', 'W1'), outline='W0', lean=0, seed=0, marks=None):
    """Tronc : pied évasé et dissymétrique dont les racines s'écartent (la dernière rangée ne
    garde que leurs pointes), légère inclinaison vers le haut, flanc gauche éclairé, droite
    dans l'ombre, stries d'écorce en amas ; contour continu. Renvoie le centre du haut."""
    s = w / 7
    rows = {}
    for y in range(top, bot + 1):
        t = (bot - y) / max(1, bot - top)
        off = round(lean * t * t)
        fr = bot - y
        el = round(EVASEMENT[0][5 - fr] * s) if fr < 6 else 0
        er = round(EVASEMENT[1][5 - fr] * s) if fr < 6 else 0
        rows[y] = (x0 + off - el, x0 + off + w + er - 1)
    pts = set()
    for y, (a, b) in rows.items():
        for x in range(a, b + 1):
            pts.add((x, y))
    a, b = rows[bot]                                           # pointes des racines, creux entre elles
    for x in range(a, b + 1):
        tip = x <= a + max(1, round(2 * s)) - 1 or x >= b - max(1, round(2 * s)) + 1 or x0 + 1 <= x <= x0 + w - 2
        if not tip:
            pts.discard((x, bot))
    outline_construit(cv, lambda x, y: (x, y) in pts, outline)
    for (x, y) in pts:
        a, b = rows[y]
        k = (x - a + 0.5) / (b - a + 1)
        cv.put(x, y, ramp[0] if k < 0.22 else ramp[1] if k < 0.55 else ramp[2] if k < 0.82 else ramp[3])
    r = rng('ecorce', seed)
    for _ in range(max(2, (bot - top) // 4)):                  # stries d'écorce
        y = r.randint(top, bot - 3)
        a, b = rows[y]
        x = r.randint(a + 1, max(a + 1, b - 2))
        for yy in range(y, y + r.randint(2, 4)):
            if (x, yy) in pts:
                cv.put(x, yy, marks or ramp[2] if (x - rows[yy][0]) / (rows[yy][1] - rows[yy][0] + 1) < 0.55 else ramp[3])
    return (rows[top][0] + rows[top][1]) / 2


def branches(cv, base, limbs, ramp=('W3', 'W2', 'W1'), outline='W0', only=None, upto=1.0):
    """Branches qui partent du haut du tronc vers (x, y), en s'affinant de `t` à 1 px : dessus
    éclairé, dessous dans l'ombre et cerné. `only` : couleurs sur lesquelles seulement on peint
    (pour qu'elles paraissent dans les creux sombres du feuillage)."""
    bx, by = base
    allowed = None if only is None else {PAL[c] for c in only}

    def put(x, y, c):
        if allowed is None or cv.get(x, y)[:3] in allowed and cv.get(x, y)[3] == 255:
            cv.put(x, y, c)
    for x1, y1, t in limbs:
        n = max(abs(x1 - bx), abs(y1 - by), 1)
        for i in range(int(n * upto) + 1):
            f = i / n
            x = round(bx + (x1 - bx) * f)
            y = round(by + (y1 - by) * f - 2 * math.sin(math.pi * f))     # légère courbe vers le haut
            th = max(1, round(t - (t - 1) * f))
            for j in range(th):
                put(x, y + j, ramp[0] if j == 0 and th > 1 else ramp[1] if j < th - 1 or th == 1 else ramp[2])
            if th > 1 or f < 0.8:
                put(x, y + th, outline)


def ombre_pied(cv, cx, rx, bottom, rows=3):
    """Ombre au sol autour du pied (prune translucide), sur les pixels transparents des dernières
    rangées : une flaque courte, jamais d'ombre portée longue."""
    from pastoral import OMBRE_CONTACT
    for y in range(bottom - rows + 1, bottom + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - bottom - 0.5) / (rows + 0.5)) ** 2 <= 1:
                if 0 <= x < cv.w and 0 <= y < cv.h and cv.px[x, y][3] == 0:
                    cv.px[x, y] = OMBRE_CONTACT


def ombre_tronc(cv, own, x0, x1, rows=3, lit=('W4', 'W3', 'C1', 'C0')):
    """Le haut du tronc, juste sous le feuillage, est dans l'ombre du houppier."""
    lit = {PAL[c] for c in lit}
    for x in range(x0, x1 + 1):
        ys = [y for (xx, y), k in own.items() if xx == x and k is not None]
        if not ys:
            continue
        y0 = max(ys) + 1
        for y in range(y0, y0 + rows):
            if cv.get(x, y)[:3] in lit:
                cv.put(x, y, 'W1' if y < y0 + rows - 1 else 'W2')


def arbre_feuillu(cv, seed, trunk_args, limbs, crown, tones, fruit=None, flowers=None,
                  bramp=('W3', 'W2', 'W1'), boutline='W0', bark=None):
    """Tronc, branches, houppier foisonnant, branches revues dans les creux sombres."""
    W = cv.w
    top = trunk(cv, *trunk_args[:4], **trunk_args[4])
    base = (round(top), trunk_args[1] + 1)
    branches(cv, base, limbs, bramp, boutline)
    own = foliage(cv, houppier(seed, *crown), tones, seed, fruit=fruit, flowers=flowers)
    branches(cv, base, limbs, (bramp[1], bramp[2], boutline), boutline, only=(tones[0], 'A0'), upto=0.7)
    x0, w = trunk_args[0], trunk_args[3]
    ombre_tronc(cv, own, x0 - 2, x0 + w + 2)
    ombre_pied(cv, W / 2, W * 0.19, cv.h - 1)
    return own


def arbre(kind):
    """Arbre adulte, gabarit 80 × 80 : houppier large et foisonnant (une trentaine de touffes)
    qui déborde sur ses voisins pour former une canopée ; tronc incliné au pied évasé, dont les
    branches se voient sous le feuillage et dans ses creux ; ombre du houppier sur le haut du
    tronc, flaque d'ombre au pied."""
    cv = Canvas(80, 80)
    seed = {'feuillu': 10, 'fruits': 11, 'fleurs': 12}[kind]
    limbs = [(22, 45, 3), (59, 44, 3), (28, 32, 2), (52, 30, 2), (41, 18, 2)]
    crown = (40, 28, 38, 26, 26, 5.0, 9.0, 26, (3.0, 4.5))
    if kind == 'feuillu':
        arbre_feuillu(cv, seed, (36, 60, 79, 7, {'lean': 1, 'seed': seed}), limbs, crown, V_RAMP)
    elif kind == 'fruits':
        arbre_feuillu(cv, seed, (36, 60, 79, 7, {'lean': 1, 'seed': seed}), limbs, crown, V_RAMP,
                      fruit=(('A7', 'W0'), 22))
    elif kind == 'fleurs':  # noqa
        arbre_feuillu(cv, seed, (36, 60, 79, 7, {'lean': -1, 'seed': seed}), limbs, crown, V_RAMP_CLAIR,
                      flowers=(('A3', 'A8'), 52))
    return cv.im


def chene_jeune(size):
    """Chêne plus jeune : 48 × 48 (moyen) ou 32 × 32 (jeune)."""
    cv = Canvas(size, size)
    if size == 48:
        arbre_feuillu(cv, 20, (21, 40, 47, 5, {'lean': 1, 'seed': 20}),
                      [(12, 30, 2), (36, 29, 2), (18, 17, 1), (31, 15, 1)],
                      (24, 20, 23, 18, 14, 3.5, 6.5, 16, (2.2, 3.2)), V_RAMP)
    else:
        arbre_feuillu(cv, 21, (14, 26, 31, 4, {'lean': 1, 'seed': 21}),
                      [(8, 19, 1), (24, 18, 1)],
                      (16, 13, 15, 12, 8, 3.0, 4.8, 12, (1.8, 2.6)), V_RAMP)
    return ancrer(cv.im)


def bouleau():
    """Bouleau 64 × 64 : tronc fin et clair (C1, C0) marqué de traits sombres, branches fines et
    sombres, houppier léger en petites touffes claires ; contour du tronc R1."""
    cv = Canvas(64, 64)
    arbre_feuillu(cv, 30, (30, 48, 63, 4, {'lean': 2, 'seed': 30, 'ramp': ('C1', 'C1', 'C0', 'C0'),
                                           'outline': 'R1', 'marks': 'R1'}),
                  [(18, 34, 2), (46, 32, 2), (24, 19, 1), (42, 17, 1), (33, 10, 1)],
                  (32, 24, 25, 22, 22, 3.5, 6.0, 22, (2.2, 3.2)), ['V2', 'V5', 'V8', 'V10', 'V11'],
                  bramp=('C0', 'R1', 'R1'), boutline='N0')
    r = rng('bouleau')
    for y in range(48, 61, 4):                                # lenticelles sous le houppier
        x = 30 + r.randint(0, 2)
        if cv.get(x, y)[:3] in (PAL['C1'], PAL['C0']):
            cv.put(x, y, 'R1'); cv.put(x + 1, y, 'R1')
    return cv.im


def saule():
    """Saule pleureur 80 × 80 : un dôme de touffes d'où pendent des rideaux de rameaux (V6, V8,
    pointes V10), plus sombres à droite ; tronc trapu au pied évasé."""
    cv = Canvas(80, 80)
    top = trunk(cv, 36, 56, 79, 8, lean=1, seed=40)
    limbs = [(16, 38, 3), (64, 36, 3), (28, 26, 2), (52, 24, 2)]
    branches(cv, (round(top), 58), limbs)
    dome = houppier(40, 40, 32, 34, 18, 18, 4.5, 8.5, 22, (3.0, 4.0))
    own = foliage(cv, dome, V_RAMP, 40)
    branches(cv, (round(top), 58), limbs, ('W2', 'W1', 'W0'), only=('V1', 'A0'), upto=0.7)
    r = rng('saule')
    for x in range(8, 73):                                # rideaux de rameaux, avec des trouées
        if x % 6 == 5:
            continue
        base = max((y for y in range(80) if own.get((x, y)) is not None), default=None)
        if base is None:
            continue
        ln = r.randint(14, 26) - abs(x - 40) // 3
        for k in range(-2, max(4, ln)):
            y = base + k
            if y >= 75:
                break
            if k == ln - 1:
                col = 'V10'
            elif x < 34:
                col = 'V8' if (k // 3 + x) % 3 else 'V6'
            elif x < 48:
                col = 'V6' if (k // 3 + x) % 3 else 'V5'
            else:
                col = 'V2' if (k // 3 + x) % 3 else 'V1'
            cv.put(x, y, col)
    sub = Canvas(80, 80)                                  # le pied du tronc repasse devant les rideaux
    trunk(sub, 36, 56, 79, 8, lean=1, seed=40)
    for y in range(73, 80):
        for x in range(80):
            if sub.px[x, y][3]:
                cv.px[x, y] = sub.px[x, y]
    ombre_pied(cv, 40, 17, 79)
    return cv.im


def arbre_sombre():
    """Arbre sombre 64 × 64 : houppier dense et rond, tons profonds (V0 à V7), creux indigo."""
    cv = Canvas(64, 64)
    arbre_feuillu(cv, 50, (29, 51, 63, 6, {'lean': -1, 'seed': 50}),
                  [(15, 38, 3), (50, 37, 3), (22, 25, 2), (43, 23, 2), (32, 14, 2)],
                  (32, 25, 31, 23, 22, 4.5, 8.0, 22, (2.6, 3.8)), ['V0', 'V1', 'V3', 'V5', 'V7'])
    return cv.im


def sapin_etages(cv, tiers, seed, tones=('V0', 'V2', 'V4', 'V6', 'V8')):
    """Étages d'un sapin : chaque étage porte trois groupes de branches — à gauche (éclairé),
    au milieu, à droite (dans l'ombre) — séparés par des sillons sombres et terminés chacun par
    une pointe, ce qui festonne le bas de l'étage ; l'étage du dessus ombre celui du dessous ;
    bord d'ombre cerné, bord éclairé ouvert."""
    D = 3                                                  # profondeur des creux entre les pointes

    def tier_of(x, y):
        for i, (cx, top, half, bot) in enumerate(tiers):
            if not top <= y + 0.5 <= bot:
                continue
            w = half * (y + 0.5 - top) / (bot - top) + 1
            rb = (x + 0.5 - cx) / (half + 1)              # position sous l'étage, de -1 à 1
            if abs(x + 0.5 - cx) > w:
                continue
            a = abs(rb)
            if a < 0.85:
                bot_eff = bot - D * math.sin(math.pi * a / 0.85) ** 2
            else:
                bot_eff = bot - D * (a - 0.85) / 0.15
            if y + 0.5 <= bot_eff:
                return i, w, rb
        return None, 0, 0
    own = {(x, y): tier_of(x, y) for y in range(cv.h) for x in range(cv.w)}
    inside = lambda x, y: own.get((x, y), (None,))[0] is not None
    for (x, y), (i, w, rb) in own.items():
        if i is None:
            continue
        cx, top, half, bot = tiers[i]
        g = 0 if rb < -0.36 else 1 if rb <= 0.36 else 2         # groupe : gauche, milieu, droite
        lv = (3, 2, 1)[g]
        centre = (-0.68, 0, 0.68)[g]
        gr = (rb - centre) / 0.32                              # position dans le groupe, de -1 à 1
        if gr < -0.35:
            lv += 1                                            # chaque groupe a son flanc éclairé
        elif gr > 0.55:
            lv -= 1
        f = (y + 0.5 - top) / (bot - top)
        if f < 0.3 and g != 2:
            lv = max(lv, 3)                                    # haut de l'étage, près du tronc : clair
        dx = x + 0.5 - cx
        sillon = f > 0.35 and abs(abs(dx) - 0.38 * w) < 0.6         # sillon entre deux groupes
        lv = max(0, min(4, lv))
        for dd in (1, 2):
            above = own.get((x, y - dd), (None,))[0]
            if above is not None and above < i:
                lv = 0 if dd == 1 else min(lv, 1)
                break
        if sillon and lv > 0:
            cv.put(x, y, 'V1' if dx < 0 else tones[0])
        else:
            cv.put(x, y, tones[lv])
    outline_feuillage(cv, inside, tones[0], tones[1], seed)
    return own


def sapin_jeune():
    """Jeune sapin 32 × 48."""
    cv = Canvas(32, 48)
    trunk(cv, 14, 38, 47, 4, seed=6)
    sapin_etages(cv, [(16, 2, 5, 15), (16, 9, 9, 27), (16, 18, 13, 42)], 6)
    ombre_pied(cv, 16, 8, 47)
    return cv.im


def sapin():
    """Sapin 48 × 64 : quatre étages de branches, trois groupes par étage ; pied évasé."""
    cv = Canvas(48, 64)
    trunk(cv, 21, 52, 63, 6, seed=5)
    sapin_etages(cv, [(24, 1, 6, 16), (24, 9, 11, 29), (24, 19, 16, 43), (24, 30, 21, 57)], 5)
    ombre_pied(cv, 24, 11, 63)
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
            classe = 'relief' if sol == 'eau' else 'tuile'
            sprites[f'{classe}_transition_{sol.replace("_", "-")}-{"".join(map(str, c))}_16x16.png'] = im
    eau_rows = [rows_wang['eau']]
    for f in (1, 2):
        eau_rows.append(len(tiles))
        for c, im in zip(CORNERS, eau_frames[f]):
            tiles.append((f'eau_{"".join(map(str, c))}_image{f}', im))
    for k in ('touffes', 'touffes_claires', 'herbes_hautes', 'fougere', 'trefle', 'fleurs_blanches', 'fleurs_jaunes',
              'fleurs_lavande', 'marguerites', 'coquelicots', 'bleuets', 'roses', 'lavande', 'chardon', 'pissenlit',
              'champignon', 'champignons_bruns', 'caillou', 'feuilles'):
        im = micro(k)
        tiles.append((k, im))
        famille = 'organique' if k in ('champignon', 'champignons_bruns', 'caillou') else 'feuillage' if k in ('trefle', 'fougere') else 'terrain'
        sprites[f'micro_{famille}_{k.replace("_", "-")}_16x16.png'] = im
    im = caisse(); tiles.append(('caisse', im)); sprites['objet_construit_caisse_16x16.png'] = im
    for p in ('gauche', 'milieu', 'droite', 'poteau', 'verticale'):
        im = cloture(p); tiles.append((f'cloture_{p}', im)); sprites[f'objet_construit_cloture-{p}_16x16.png'] = im
    im = rocher(16, 16, big=False); tiles.append(('petit_rocher', im)); sprites['objet_organique_petit-rocher_16x16.png'] = im
    im = roseaux(); tiles.append(('roseaux', im)); sprites['micro_feuillage_roseaux_16x16.png'] = im
    im = arbuste(); tiles.append(('arbuste', im)); sprites['arbre_feuillage_arbuste_16x16.png'] = im
    im = nenuphars(); tiles.append(('nenuphars', im)); sprites['micro_feuillage_nenuphars_16x16.png'] = im
    big = [('rocher', rocher(), 'objet_organique_rocher_32x32.png'), ('souche', souche(), 'objet_organique_souche_32x32.png'),
           ('tonneau', tonneau(), 'objet_construit_tonneau_32x32.png'),
           ('buisson_vert', buisson('vert'), 'arbre_feuillage_buisson-vert_32x32.png'),
           ('buisson_baies', buisson('baies'), 'arbre_feuillage_buisson-baies_32x32.png'),
           ('buisson_fleuri', buisson('fleuri'), 'arbre_feuillage_buisson-fleuri_32x32.png'),
           ('buisson_roses', buisson('roses'), 'arbre_feuillage_buisson-roses_32x32.png'),
           ('chene_jeune', chene_jeune(32), 'arbre_feuillage_chene-jeune_32x32.png'),
           ('sapin_jeune', sapin_jeune(), 'arbre_feuillage_sapin-jeune_32x48.png'),
           ('chene_moyen', chene_jeune(48), 'arbre_feuillage_chene-moyen_48x48.png'),
           ('buche', buche(), 'objet_organique_buche_32x16.png'), ('foin', foin(), 'objet_construit_foin_32x16.png'),
           ('sapin', sapin(), 'arbre_feuillage_sapin_48x64.png'),
           ('arbre_feuillu', arbre('feuillu'), 'arbre_feuillage_feuillu_80x80.png'),
           ('arbre_fruits', arbre('fruits'), 'arbre_feuillage_fruits_80x80.png'),
           ('arbre_fleurs', arbre('fleurs'), 'arbre_feuillage_fleurs_80x80.png'),
           ('saule', saule(), 'arbre_feuillage_saule_80x80.png'),
           ('bouleau', bouleau(), 'arbre_feuillage_bouleau_64x64.png'),
           ('arbre_sombre', arbre_sombre(), 'arbre_feuillage_arbre-sombre_64x64.png')]
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
