# assets/tileset_ferme.png : un nouveau jeu de tuiles de 16 px pour la carte de la ferme, dans le
# style des bâtiments redessinés (scripts/batiments/) : formes nettes, 3 à 5 teintes par matière,
# contour d'un pixel dans une teinte sombre de chaque matière, lumière en haut à gauche, pas de
# bruit ni de tramage. Plus vivant que farm_spring_summer : herbe plus chaude et variée, fleurs de
# plusieurs couleurs, arbres fruitiers et en fleur, eau animée.
#
#   python3 scripts/carte/tileset.py            écrit assets/tileset_ferme.png et .tsx
#   python3 scripts/carte/tileset.py --demo     écrit aussi demo_tileset.png : une scène faite
#                                               uniquement de ces tuiles
#
# Contenu (16 tuiles par rangée ; l'emplacement exact de chaque élément est dans TUILES, et
# dans le .tsx : propriété « nom » de chaque tuile) :
#   - herbe : 8 variantes de sol, à mélanger au hasard ;
#   - détails posés sur l'herbe (calque au-dessus du sol) : touffes, trèfle, fleurs (blanches,
#     jaunes, rouges, bleues, mauves), champignons, cailloux, feuilles mortes ;
#   - 4 terrains raccordés à l'herbe par les coins (16 tuiles chacun, jeux de Wang « coins » du
#     .tsx, pour peindre au pinceau de terrain dans Tiled) : prairie claire, chemin de terre,
#     pavés, eau (3 images animées). Les bords suivent des courbes douces, sans couture d'une
#     tuile à l'autre ;
#   - au bord de l'eau : roseaux, nénuphars ;
#   - arbres (3×3 tuiles) : chêne, pommier, cerisier en fleur ; sapin (2×3) ;
#   - buissons, rochers, souche, rondin, clôture de bois (bouts, milieu, poteau, montant,
#     portillon), tonneau, caisse, botte de foin.
import json
import math
import os
import random
import sys

from PIL import Image

T = 16
COLS = 16
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')
NAME = 'tileset_ferme'

P = {
    # herbe : vert chaud et franc
    'go': (34, 72, 44), 'gd': (52, 108, 58), 'gm': (68, 132, 66), 'gl': (96, 160, 78), 'gh': (140, 192, 96),
    # prairie claire
    'mo': (70, 110, 50), 'md': (112, 158, 72), 'mm': (140, 182, 86), 'ml': (172, 206, 108), 'mh': (206, 226, 142),
    # terre battue
    'do': (86, 56, 36), 'dd': (124, 86, 54), 'dm': (156, 114, 72), 'dl': (184, 142, 94), 'dh': (210, 172, 122),
    # pavés (la pierre du puits, un peu plus chaude)
    'so': (58, 48, 46), 'sj': (96, 86, 78), 'sd': (122, 114, 104), 'sm': (150, 142, 128), 'sl': (178, 170, 152), 'sh': (204, 198, 180),
    # eau
    'wo': (26, 52, 84), 'wd': (42, 94, 144), 'wm': (60, 128, 182), 'wl': (104, 172, 218), 'wh': (200, 236, 250),
    # feuillage des arbres
    'fo': (22, 50, 32), 'fd': (38, 86, 46), 'fm': (58, 120, 56), 'fl': (90, 156, 70), 'fh': (140, 196, 92),
    # sapin (plus bleuté)
    'po': (16, 40, 34), 'pd': (28, 70, 52), 'pm': (40, 98, 66), 'pl': (64, 132, 82), 'ph': (104, 168, 104),
    # fleurs de cerisier
    'ko': (110, 52, 78), 'kd': (196, 104, 140), 'km': (232, 148, 176), 'kl': (248, 196, 212), 'kh': (255, 236, 242),
    # écorce, bois
    'bo': (48, 28, 20), 'bd': (78, 48, 30), 'bm': (108, 70, 42), 'bl': (138, 96, 60), 'bh': (166, 124, 82),
    # bois clair (clôture, caisse)
    'eo': (74, 46, 26), 'ed': (128, 84, 48), 'em': (164, 116, 70), 'el': (196, 150, 98), 'eh': (220, 182, 130),
    # roche
    'ro': (44, 44, 50), 'rd': (88, 90, 96), 'rm': (120, 122, 126), 'rl': (156, 158, 160), 'rh': (196, 198, 196),
    # fleurs et fruits
    'white': (248, 248, 240), 'white2': (214, 218, 222), 'yellow': (250, 214, 72), 'yellow2': (210, 160, 40),
    'red': (226, 66, 60), 'red2': (150, 34, 40), 'blue': (110, 150, 240), 'blue2': (60, 86, 180),
    'mauve': (184, 120, 220), 'mauve2': (118, 70, 160), 'heart': (250, 200, 70),
    'shroom': (214, 72, 56), 'shroom2': (140, 36, 34), 'stem': (236, 226, 204),
    'leaf': (210, 140, 52), 'leaf2': (168, 90, 36),
    # foin
    'ho': (110, 80, 30), 'hd': (186, 146, 60), 'hm': (220, 184, 84), 'hl': (240, 214, 120),
}


def rgba(c):
    return (P[c] if isinstance(c, str) else c) + (255,)


class Tile:
    """Une ou plusieurs tuiles (w × h tuiles) dessinées sur une seule image."""

    def __init__(self, w=1, h=1):
        self.W, self.H = w * T, h * T
        self.im = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.W and 0 <= y < self.H:
            self.px[x, y] = rgba(c)

    def opaque(self, x, y):
        return 0 <= x < self.W and 0 <= y < self.H and self.px[x, y][3] > 0

    def shape(self, inside, color, outline=None):
        pts = [(x, y) for y in range(self.H) for x in range(self.W) if inside(x + 0.5, y + 0.5)]
        s = set(pts)
        if outline:
            for x, y in pts:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in s:
                        self.put(q[0], q[1], outline)
        for x, y in pts:
            self.put(x, y, color(x, y))
        return s


def rng(*k):
    return random.Random('-'.join(map(str, k)))


# ---------------------------------------------------------------- herbe

def grass_base(t, variant):
    """Sol d'herbe : un vert uni, quelques touffes en V, plus claires sur le dessus. Les touffes
    restent à l'intérieur de la tuile : deux tuiles côte à côte se raccordent toujours."""
    for y in range(T):
        for x in range(T):
            t.put(x, y, 'gm')
    r = rng('herbe', variant)
    n = [2, 3, 1, 3, 2, 3, 4, 0][variant]
    spots = []
    for _ in range(n):
        for _try in range(20):
            x, y = r.randint(1, 13), r.randint(2, 14)
            if all(abs(x - a) + abs(y - b) > 4 for a, b in spots):
                spots.append((x, y))
                break
    for x, y in spots:
        tuft(t, x, y, r.random() < 0.5)
    if variant in (5, 6):                         # quelques taches plus sombres
        for _ in range(2):
            x, y = r.randint(2, 12), r.randint(2, 12)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 1)):
                if t.px[x + dx, y + dy][:3] == P['gm']:
                    t.put(x + dx, y + dy, 'gd')


def tuft(t, x, y, big=False):
    t.put(x, y, 'gd')
    t.put(x + 2, y, 'gd')
    t.put(x + 1, y + 1, 'gd')
    t.put(x, y - 1, 'gl')
    t.put(x + 2, y - 1, 'gl')
    if big:
        t.put(x + 1, y - 1, 'gd')
        t.put(x + 1, y - 2, 'gh')


# ---------------------------------------------------------------- détails sur l'herbe

def deco(kind, variant=0):
    t = Tile()
    r = rng('deco', kind, variant)
    if kind == 'touffes':
        for x, y, b in ((3, 7, True), (9, 11, False), (11, 5, True)):
            tuft(t, x, y, b)
            t.put(x + 1, y + 2, 'go')
    elif kind == 'herbes_hautes':
        for x0 in (4, 7, 10):
            h = r.randint(6, 9)
            for i in range(h):
                xx = x0 + (1 if i > h - 3 and x0 == 4 else -1 if i > h - 3 and x0 == 10 else 0)
                t.put(xx, 13 - i, 'gh' if i > h - 3 else 'gl' if i > 2 else 'gd')
            t.put(x0 + 1, 13, 'go')
            t.put(x0 - 1, 13, 'go')
    elif kind == 'trefle':
        for cx, cy in ((5, 6), (10, 10)):
            for dx, dy in ((0, -1), (-1, 0), (1, 0)):
                t.put(cx + dx, cy + dy, 'gl')
                t.put(cx + dx * 2, cy + dy * 2 - (1 if dy == 0 else 0), 'gl')
            t.put(cx, cy, 'gd')
            t.put(cx, cy + 1, 'gd')
            t.put(cx, cy + 2, 'go')
    elif kind.startswith('fleurs_'):
        col = kind.split('_')[1]
        c1, c2 = {'blanches': ('white', 'white2'), 'jaunes': ('yellow', 'yellow2'), 'rouges': ('red', 'red2'),
                  'bleues': ('blue', 'blue2'), 'mauves': ('mauve', 'mauve2')}[col]
        pos = [(4, 5), (10, 4), (7, 10), (12, 11), (3, 12)][: 3 + variant]
        for cx, cy in pos:
            t.put(cx, cy + 1, 'gd')                    # tige
            t.put(cx, cy + 2, 'gd')
            t.put(cx - 1, cy + 2, 'gl')
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                t.put(cx + dx, cy + dy, c1)
            t.put(cx + 1, cy + 1, c2)
            t.put(cx, cy, 'heart' if col != 'jaunes' else 'yellow2')
            t.put(cx, cy + 3, 'go')
    elif kind == 'champignons':
        for cx, cy, s in ((5, 9, 2), (10, 11, 1)):
            for dx in range(-s, s + 1):
                t.put(cx + dx, cy - 1, 'shroom')
            for dx in range(-s + 1, s):
                t.put(cx + dx, cy - 2, 'shroom')
            t.put(cx - s + 1, cy - 2, 'white')
            t.put(cx, cy - 1, 'white') if s == 2 else None
            for dx in range(-s - 1, s + 2):
                t.put(cx + dx, cy, 'shroom2' if abs(dx) == s + 1 else 'shroom2')
            t.put(cx, cy, 'stem')
            t.put(cx, cy + 1, 'stem')
            t.put(cx, cy + 2, 'go')
    elif kind == 'cailloux':
        for cx, cy, w in ((4, 9, 3), (10, 6, 2), (11, 12, 2)):
            t.shape(lambda x, y: ((x - cx) / w) ** 2 + ((y - cy) / (w * 0.7)) ** 2 <= 1,
                    lambda x, y: 'rh' if y < cy - 0.5 and x < cx else 'rl' if y < cy else 'rm', 'ro')
    elif kind == 'feuilles':
        for cx, cy in ((4, 5), (11, 8), (6, 12)):
            t.put(cx, cy, 'leaf')
            t.put(cx + 1, cy, 'leaf')
            t.put(cx + 1, cy - 1, 'leaf')
            t.put(cx + 2, cy - 1, 'leaf2')
            t.put(cx, cy + 1, 'leaf2')
    return t.im


# ---------------------------------------------------------------- terrains raccordés (coins)

def periodic_wobble(x, y, seed):
    """Bruit doux de période 16 : identique sur les deux bords d'une tuile, donc sans couture."""
    return 0.5 * math.sin(2 * math.pi * ((x + 0.5) / 16 + seed)) + 0.5 * math.sin(2 * math.pi * ((y + 0.5) / 16 + seed * 1.7))


def skeleton_distance(px_, py_, pts, value):
    """Distance au squelette des coins de valeur `value` : ces coins et les bords qui en joignent
    deux."""
    best = 99.0
    for (cx, cy), v in pts.items():
        if v == value:
            best = min(best, math.hypot(px_ - cx, py_ - cy))
    for (a, b) in (((0, 0), (16, 0)), ((0, 16), (16, 16)), ((0, 0), (0, 16)), ((16, 0), (16, 16))):
        if pts[a] == value and pts[b] == value:
            best = min(best, abs(py_ - a[1]) if a[1] == b[1] else abs(px_ - a[0]))
    return best


def corner_field(x, y, tl, tr, bl, br):
    """Champ signé : négatif dans le terrain. Le bord passe à égale distance des coins du terrain
    et des coins d'herbe (avec les bords qui joignent deux coins de même nature). Sur un bord de
    tuile, seuls comptent les deux coins de ce bord : deux tuiles voisines se raccordent toujours.
    Coins sortants arrondis, coins rentrants creusés en courbe."""
    px_, py_ = x + 0.5, y + 0.5
    pts = {(0, 0): tl, (16, 0): tr, (0, 16): bl, (16, 16): br}
    return skeleton_distance(px_, py_, pts, 1) - skeleton_distance(px_, py_, pts, 0)


def fill_meadow(x, y, frame=0):
    """Prairie : herbe claire, de rares brins plus clairs et quelques fleurs."""
    if (x, y) in ((3, 4), (11, 9), (6, 13)):
        return 'mh'
    if (x, y) in ((4, 4), (12, 9)):
        return 'md'
    if (x, y) == (13, 3):
        return 'yellow'
    if (x, y) == (8, 7):
        return 'white'
    return 'mm'


def fill_dirt(x, y, frame=0):
    """Terre battue : unie, avec deux petits cailloux et une ornière plus sombre."""
    if (x, y) in ((4, 5), (11, 12)):
        return 'dh'
    if (x, y) in ((4, 6), (5, 6), (11, 13), (12, 13)):
        return 'dd'
    if y == 9 and 7 <= x <= 10:
        return 'dd'
    return 'dm'


# pavés : un motif de pierres arrondies de période 16
COBBLES = [(3, 3, 3.2, 2.6), (10, 2, 3.4, 2.4), (14.5, 7, 2.4, 2.6), (6, 8, 3.0, 2.6), (1, 9, 1.8, 2.4),
           (11, 11, 3.2, 2.6), (3.5, 13.5, 3.0, 2.2), (8.5, 14.5, 2.0, 1.6), (15, 14, 1.6, 2.0)]


def fill_cobble(x, y, frame=0):
    for cx, cy, rx, ry in COBBLES:
        for ox in (-16, 0, 16):
            for oy in (-16, 0, 16):
                d = ((x + 0.5 - cx - ox) / rx) ** 2 + ((y + 0.5 - cy - oy) / ry) ** 2
                if d <= 1:
                    if d > 0.72:
                        return 'sd' if (x + 0.5 - cx - ox) + (y + 0.5 - cy - oy) > 0 else 'sm'
                    return 'sh' if (x + 0.5 - cx - ox) + (y + 0.5 - cy - oy) < -1.6 else 'sl'
    return 'sj'


def fill_water(x, y, frame=0):
    # vaguelettes : petits traits clairs qui glissent d'une image à l'autre (période 16)
    xx = (x + frame * 5) % 16
    for (wx, wy, n) in ((2, 3, 3), (9, 6, 4), (4, 11, 3), (12, 13, 2)):
        if y == wy and wx <= xx < wx + n:
            return 'wl'
    if (xx, y) in ((10, 5), (5, 10)) and frame == 1:
        return 'wh'
    return 'wm'


TERRAINS = {
    'prairie': {'fill': fill_meadow, 'rim_in': 'ml', 'rim_out': 'gd', 'line': 'mo', 'seed': 0.1},
    'terre': {'fill': fill_dirt, 'rim_in': 'dd', 'rim_out': 'gd', 'line': 'do', 'seed': 0.4},
    'paves': {'fill': fill_cobble, 'rim_in': 'sm', 'rim_out': 'gd', 'line': 'so', 'seed': 0.7},
    'eau': {'fill': fill_water, 'rim_in': 'wd', 'rim_out': 'dl', 'line': 'wo', 'seed': 0.9},
}


def terrain_tile(name, tl, tr, bl, br, frame=0):
    """Tuile du terrain `name` sur l'herbe ; tl, tr, bl, br : chaque coin est-il du terrain ?"""
    cfg = TERRAINS[name]
    t = Tile()
    grass_base(t, 0)
    if not (tl or tr or bl or br):
        return t.im
    for y in range(T):
        for x in range(T):
            d = corner_field(x, y, tl, tr, bl, br) + 1.4 * periodic_wobble(x, y, cfg['seed'])
            if d <= 0:
                if d > -2:
                    c = cfg['line']                      # bord : contour sombre
                elif d > -4.4:
                    c = cfg['rim_in']                    # liseré intérieur
                else:
                    c = cfg['fill'](x, y, frame)
                t.put(x, y, c)
            elif d < 3.2:
                if name == 'eau':
                    t.put(x, y, 'dl' if d < 1.8 else 'dd')     # berge de terre autour de l'eau
                else:
                    t.put(x, y, cfg['rim_out'])                # herbe plus sombre au bord
    return t.im


# ---------------------------------------------------------------- plantes de l'eau

def roseaux():
    t = Tile()
    for x0, h in ((4, 11), (7, 13), (10, 9), (12, 12)):
        for i in range(h):
            t.put(x0, 15 - i, 'gl' if i < h - 3 else 'gh')
        t.put(x0, 15 - h, 'bm')                         # massette
        t.put(x0, 16 - h, 'bd')
        t.put(x0, 17 - h, 'bd')
        t.put(x0 + 1, 16 - h, 'bo')
        t.put(x0 + 1, 15, 'go')
    return t.im


def nenuphars():
    t = Tile()
    for cx, cy, r in ((5, 6, 3.2), (11, 11, 2.6)):
        t.shape(lambda x, y: math.hypot(x - cx, y - cy) <= r and not (x > cx and abs(y - cy) < 0.8),
                lambda x, y: 'gh' if x + y < cx + cy - 1 else 'gl', 'gd')
    t.put(5, 5, 'kl')
    t.put(4, 5, 'km')
    t.put(5, 4, 'km')
    return t.im


# ---------------------------------------------------------------- arbres

def canopy(t, blobs, pal, fruit=None):
    """Feuillage fait de boules qui se chevauchent : chacune éclairée en haut à gauche."""
    o, d, m, l, h = pal
    def inside(x, y):
        return any(math.hypot(x - cx, (y - cy) * 1.05) <= r for cx, cy, r in blobs)
    def color(x, y):
        best = None
        for cx, cy, r in blobs:
            dd = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.05)
            if dd <= r:
                tt = ((x + 0.5 - cx) + (y + 0.5 - cy)) / r
                c = h if tt < -0.95 else l if tt < -0.25 else m if tt < 0.55 else d
                best = c                                   # la dernière boule passe devant
        return best
    s = t.shape(inside, color, o)
    if fruit:
        r = rng('fruit', len(blobs), fruit[0])
        pts = sorted(s)
        for _ in range(fruit[2]):
            x, y = r.choice(pts)
            if t.opaque(x + 1, y + 1) and t.opaque(x - 1, y):
                t.put(x, y, fruit[0])
                t.put(x + 1, y, fruit[1])
                t.put(x, y + 1, fruit[1])


def trunk(t, x0, y0, y1, w=4):
    for y in range(y0, y1 + 1):
        for x in range(x0, x0 + w):
            k = x - x0
            t.put(x, y, 'bl' if k == 0 else 'bd' if k == w - 1 else 'bm')
        t.put(x0 - 1, y, 'bo')
        t.put(x0 + w, y, 'bo')
    for x in range(x0 - 2, x0 + w + 2):                  # racines
        t.put(x, y1 + 1, 'bo')
    t.put(x0 - 1, y1, 'bm')
    t.put(x0 + w, y1, 'bd')


def arbre(kind):
    t = Tile(3, 3)
    trunk(t, 22, 30, 44)
    blobs = [(24, 22, 13), (14, 26, 9), (34, 26, 9), (18, 15, 9), (30, 15, 9), (24, 10, 8), (24, 28, 9)]
    if kind == 'chene':
        canopy(t, blobs, ('fo', 'fd', 'fm', 'fl', 'fh'))
    elif kind == 'pommier':
        canopy(t, blobs, ('fo', 'fd', 'fm', 'fl', 'fh'), ('red', 'red2', 26))
    elif kind == 'cerisier':
        canopy(t, blobs, ('ko', 'kd', 'km', 'kl', 'kh'))
        r = rng('petales')
        for _ in range(6):                               # quelques pétales tombés au pied
            t.put(r.randint(10, 38), r.randint(44, 46), 'kl')
    return t.im


def sapin():
    t = Tile(2, 3)
    trunk(t, 14, 38, 44, 4)
    tiers = [(16, 2, 4, 12), (16, 10, 8, 22), (16, 18, 12, 32), (16, 26, 15, 40)]
    def inside(x, y):
        for cx, top, half, bot in tiers:
            if top <= y <= bot:
                w = half * (y - top) / (bot - top) + 1
                if abs(x - cx) <= w:
                    return True
        return False
    def color(x, y):
        for cx, top, half, bot in reversed(tiers):
            if top <= y + 0.5 <= bot:
                w = half * (y + 0.5 - top) / (bot - top) + 1
                if abs(x + 0.5 - cx) <= w:
                    rel = (x + 0.5 - cx) / max(1, w)
                    if y + 0.5 > bot - 2:
                        return 'pd'
                    return 'ph' if rel < -0.6 else 'pl' if rel < -0.1 else 'pm' if rel < 0.5 else 'pd'
        return 'pm'
    t.shape(inside, color, 'po')
    return t.im


def buisson(kind):
    t = Tile()
    blobs = [(8, 10, 5.5), (5, 9, 3.6), (11, 9, 3.6), (8, 6, 4)]
    if kind == 'vert':
        canopy(t, blobs, ('fo', 'fd', 'fm', 'fl', 'fh'))
    elif kind == 'baies':
        canopy(t, blobs, ('fo', 'fd', 'fm', 'fl', 'fh'), ('blue', 'blue2', 7))
    elif kind == 'fleuri':
        canopy(t, blobs, ('fo', 'fd', 'fm', 'fl', 'fh'), ('kl', 'km', 8))
    elif kind == 'petit':
        canopy(t, [(8, 11, 4), (6, 10, 2.8), (10, 10, 2.8)], ('fo', 'fd', 'fm', 'fl', 'fh'))
    return t.im


# ---------------------------------------------------------------- rochers, bois, objets

def rocher(big=False):
    t = Tile(2 if big else 1, 1)
    if big:
        blobs = [(12, 10, 8, 5.5), (21, 11, 6, 4.2)]
    else:
        blobs = [(8, 10, 5.5, 4.2)]
    def inside(x, y):
        return any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 for cx, cy, rx, ry in blobs)
    def color(x, y):
        for cx, cy, rx, ry in reversed(blobs):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                tt = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
                return 'rh' if tt < -0.9 else 'rl' if tt < -0.1 else 'rm' if tt < 0.7 else 'rd'
    t.shape(inside, color, 'ro')
    # une fissure et un peu de mousse
    t.put(int(blobs[0][0]) + 1, int(blobs[0][1]) - 1, 'rd')
    t.put(int(blobs[0][0]) + 2, int(blobs[0][1]), 'rd')
    t.put(int(blobs[0][0]) - 3, int(blobs[0][1]) - 3, 'gl')
    t.put(int(blobs[0][0]) - 2, int(blobs[0][1]) - 3, 'gl')
    return t.im


def souche():
    t = Tile()
    for y in range(8, 14):
        for x in range(3, 13):
            k = x - 3
            t.put(x, y, 'bl' if k < 2 else 'bd' if k > 7 else 'bm')
    t.shape(lambda x, y: ((x - 8) / 5.2) ** 2 + ((y - 8) / 2.4) ** 2 <= 1,
            lambda x, y: 'eh' if math.hypot(x - 8, (y - 8) * 2) < 1.5 else 'el' if math.hypot(x - 8, (y - 8) * 2) < 3.5 else 'em', None)
    for x in range(2, 14):
        t.put(x, 14, 'bo')
    for y in range(7, 14):
        t.put(2, y, 'bo')
        t.put(13, y, 'bo')
    for x in range(4, 12):
        t.put(x, 5, 'bo')
    t.put(1, 14, 'bo'); t.put(14, 14, 'bo')
    return t.im


def rondin():
    t = Tile(2, 1)
    for y in range(6, 13):
        for x in range(4, 28):
            k = y - 6
            t.put(x, y, 'bl' if k < 2 else 'bd' if k > 4 else 'bm')
    for x in range(4, 28):
        t.put(x, 5, 'bo'); t.put(x, 13, 'bo')
    t.shape(lambda x, y: ((x - 27.5) / 2.6) ** 2 + ((y - 9.5) / 4.2) ** 2 <= 1,
            lambda x, y: 'eh' if abs(x - 27.5) + abs(y - 9.5) < 2 else 'el', 'bo')
    for x in (10, 18):                                  # nœuds
        t.put(x, 9, 'bo'); t.put(x + 1, 9, 'bd')
    return t.im


def cloture(part):
    t = Tile()
    def post(x0):
        for y in range(3, 15):
            t.put(x0, y, 'el'); t.put(x0 + 1, y, 'ed')
        t.put(x0, 2, 'eo'); t.put(x0 + 1, 2, 'eo')
        for y in range(2, 16):
            t.put(x0 - 1, y, 'eo'); t.put(x0 + 2, y, 'eo')
        t.put(x0, 15, 'eo'); t.put(x0 + 1, 15, 'eo')
    def rail(x0, x1, y):
        for x in range(x0, x1 + 1):
            t.put(x, y - 1, 'eo'); t.put(x, y, 'eh'); t.put(x, y + 1, 'em'); t.put(x, y + 2, 'eo')
    if part in ('milieu', 'gauche', 'droite'):
        x0 = 0 if part != 'gauche' else 7
        x1 = 15 if part != 'droite' else 8
        rail(x0, x1, 5)
        rail(x0, x1, 10)
        post(7)
    elif part == 'poteau':
        post(7)
    elif part == 'montant':
        for y in range(0, 16):
            t.put(6, y, 'eo'); t.put(7, y, 'el'); t.put(8, y, 'ed'); t.put(9, y, 'eo')
    elif part == 'portillon':
        rail(0, 15, 4)
        rail(0, 15, 11)
        for i in range(12):                              # écharpe en diagonale
            x, y = 2 + i, 12 - i * 0.7
            t.put(x, int(y), 'el'); t.put(x, int(y) + 1, 'ed')
        post(0)
        post(14)
    return t.im


def tonneau():
    t = Tile()
    def inside(x, y):
        return 3 <= y <= 15 and abs(x - 8) <= 4.2 + 1.1 * math.sin(math.pi * (y - 3) / 12)
    def color(x, y):
        rel = (x + 0.5 - 8) / 5
        if y in (5, 12):
            return 'rd' if rel > 0.2 else 'rl'          # cerclages de fer
        return 'bh' if rel < -0.55 else 'bl' if rel < -0.1 else 'bm' if rel < 0.5 else 'bd'
    t.shape(inside, color, 'bo')
    for x in range(5, 12):
        t.put(x, 3, 'bd')
    t.put(6, 3, 'bm'); t.put(7, 3, 'bm')
    return t.im


def caisse():
    t = Tile()
    for y in range(3, 15):
        for x in range(2, 14):
            k = (y - 3) % 4
            t.put(x, y, 'ed' if k == 3 else 'eh' if k == 0 else 'el')
    for i in range(12):
        t.put(2 + i, 3 + i, 'em'); t.put(3 + i, 3 + i, 'ed')
    for x in range(2, 14):
        t.put(x, 3, 'eh')
    for y in range(3, 15):
        t.put(2, y, 'el'); t.put(13, y, 'ed')
    for x in range(1, 15):
        t.put(x, 2, 'eo'); t.put(x, 15, 'eo')
    for y in range(2, 16):
        t.put(1, y, 'eo'); t.put(14, y, 'eo')
    return t.im


def foin():
    t = Tile()
    def inside(x, y):
        return 4 <= y <= 14 and 1 <= x <= 14 and not ((x < 2.5 or x > 13.5) and (y < 5.5 or y > 13.5))
    def color(x, y):
        if y in (7, 11):
            return 'ho'                                  # liens
        k = (x * 3 + y) % 5
        return 'hl' if y < 6 or k == 0 else 'hm' if x < 11 else 'hd'
    t.shape(inside, color, 'ho')
    return t.im


# ---------------------------------------------------------------- planche

CORNER_ORDER = [(tl, tr, bl, br) for tl in (0, 1) for tr in (0, 1) for bl in (0, 1) for br in (0, 1)]


def build():
    items = []          # (nom, image, largeur en tuiles, hauteur en tuiles)
    for v in range(8):
        t = Tile()
        grass_base(t, v)
        items.append((f'herbe_{v}', t.im, 1, 1))
    for k, v in (('touffes', 0), ('herbes_hautes', 0), ('trefle', 0), ('fleurs_blanches', 0), ('fleurs_blanches', 2),
                 ('fleurs_jaunes', 0), ('fleurs_jaunes', 2), ('fleurs_rouges', 1), ('fleurs_bleues', 1),
                 ('fleurs_mauves', 1), ('champignons', 0), ('cailloux', 0), ('feuilles', 0)):
        items.append((f'{k}_{v}', deco(k, v), 1, 1))
    items.append(('roseaux', roseaux(), 1, 1))
    items.append(('nenuphars', nenuphars(), 1, 1))
    for b in ('vert', 'baies', 'fleuri', 'petit'):
        items.append((f'buisson_{b}', buisson(b), 1, 1))
    items.append(('rocher', rocher(), 1, 1))
    items.append(('souche', souche(), 1, 1))
    items.append(('tonneau', tonneau(), 1, 1))
    items.append(('caisse', caisse(), 1, 1))
    items.append(('foin', foin(), 1, 1))
    for p in ('gauche', 'milieu', 'droite', 'poteau', 'montant', 'portillon'):
        items.append((f'cloture_{p}', cloture(p), 1, 1))
    items.append(('grand_rocher', rocher(True), 2, 1))
    items.append(('rondin', rondin(), 2, 1))
    terr = []
    for name in TERRAINS:
        frames = 3 if name == 'eau' else 1
        for f in range(frames):
            row = [terrain_tile(name, *c, frame=f) for c in CORNER_ORDER]
            terr.append((name, f, row))
    big = [('chene', arbre('chene'), 3, 3), ('pommier', arbre('pommier'), 3, 3), ('cerisier', arbre('cerisier'), 3, 3),
           ('sapin', sapin(), 2, 3)]

    # placement : les terrains d'abord (une rangée de 16 par terrain et par image), puis les
    # grands éléments côte à côte, puis les petites tuiles
    grid = {}
    names = {}
    tiles_meta = {}
    row = 0
    for name, f, tl in terr:
        for i, im in enumerate(tl):
            grid[(i, row)] = im
            c = CORNER_ORDER[i]
            names[(i, row)] = f'{name}_{"".join(map(str, c))}' + (f'_image{f}' if f else '')
        tiles_meta[(name, f)] = row
        row += 1
    x = 0
    for nm, im, w, h in big:
        for ty in range(h):
            for tx in range(w):
                grid[(x + tx, row + ty)] = im.crop((tx * T, ty * T, tx * T + T, ty * T + T))
                names[(x + tx, row + ty)] = f'{nm}_{tx}_{ty}'
        x += w
    row += 3
    x = 0
    for nm, im, w, h in items:
        if x + w > COLS:
            x, row = 0, row + 1
        for tx in range(w):
            grid[(x + tx, row)] = im.crop((tx * T, 0, tx * T + T, T))
            names[(x + tx, row)] = nm if w == 1 else f'{nm}_{tx}'
        x += w
    rows = row + 1
    sheet = Image.new('RGBA', (COLS * T, rows * T), (0, 0, 0, 0))
    for (cx, cy), im in grid.items():
        sheet.alpha_composite(im, (cx * T, cy * T))
    sheet.save(os.path.join(ASSETS, NAME + '.png'))
    index = {nm: cy * COLS + cx for (cx, cy), nm in names.items()}
    write_tsx(rows, index, tiles_meta)
    print(f'assets/{NAME}.png : {COLS}×{rows} tuiles ({len(names)} dessinées)')
    return sheet, index, tiles_meta


def write_tsx(rows, index, tiles_meta):
    """Jeu de tuiles Tiled : nom de chaque tuile, animation de l'eau, un jeu de Wang « coins »
    par terrain (couleur 1 : l'herbe, couleur 2 : le terrain)."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<tileset version="1.10" tiledversion="1.10.2" name="{NAME}" tilewidth="{T}" tileheight="{T}" '
        f'tilecount="{COLS * rows}" columns="{COLS}">',
        f' <image source="{NAME}.png" width="{COLS * T}" height="{rows * T}"/>',
    ]
    water_rows = [tiles_meta[('eau', f)] for f in range(3)]
    for nm, i in sorted(index.items(), key=lambda kv: kv[1]):
        anim = ''
        cy, cx = divmod(i, COLS)
        if cy == water_rows[0]:
            frames = ''.join(f'<frame tileid="{r * COLS + cx}" duration="420"/>' for r in water_rows)
            anim = f'<animation>{frames}</animation>'
        lines.append(f' <tile id="{i}"><properties><property name="nom" value="{nm}"/></properties>{anim}</tile>')
    lines.append(' <wangsets>')
    for name in TERRAINS:
        row = tiles_meta[(name, 0)]
        lines.append(f'  <wangset name="{name}" type="corner" tile="{row * COLS + 15}">')
        lines.append('   <wangcolor name="herbe" color="#448442" tile="-1" probability="1"/>')
        lines.append(f'   <wangcolor name="{name}" color="#{ {"prairie": "aed06c", "terre": "9c7248", "paves": "968e80", "eau": "3c80b6"}[name] }" tile="-1" probability="1"/>')
        for i, (tl, tr, bl, br) in enumerate(CORNER_ORDER):
            c = lambda b: 2 if b else 1
            # wangid : haut, haut-droite, droite, bas-droite, bas, bas-gauche, gauche, haut-gauche
            lines.append(f'   <wangtile tileid="{row * COLS + i}" wangid="0,{c(tr)},0,{c(br)},0,{c(bl)},0,{c(tl)}"/>')
        lines.append('  </wangset>')
    lines.append(' </wangsets>')
    lines.append('</tileset>')
    with open(os.path.join(ASSETS, NAME + '.tsx'), 'w', encoding='utf8') as f:
        f.write('\n'.join(lines) + '\n')


# ---------------------------------------------------------------- scène de démonstration

def demo(sheet, index, tiles_meta, W=48, H=30):
    """Une scène faite uniquement de ces tuiles : prairie, chemin, pavés, mare, arbres, clôture."""
    r = random.Random(7)
    def tile(nm):
        i = index[nm]
        cy, cx = divmod(i, COLS)
        return sheet.crop((cx * T, cy * T, cx * T + T, cy * T + T))
    out = Image.new('RGBA', (W * T, H * T))
    # coins de terrain : une grille (W+1)×(H+1) par terrain
    def blob(cx, cy, rx, ry, wob=0.25, seed=0):
        rr = random.Random(seed)
        ph = [rr.random() * 6 for _ in range(3)]
        def f(x, y):
            a = math.atan2(y - cy, x - cx)
            k = 1 + wob * (math.sin(3 * a + ph[0]) * 0.5 + math.sin(5 * a + ph[1]) * 0.3)
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
    corners = {
        'prairie': [blob(10, 8, 7, 5, seed=1), blob(36, 22, 8, 5, seed=2), blob(40, 5, 5, 3, seed=3)],
        'terre': [path([(0, 15), (14, 15), (20, 19), (34, 19)], 1.2)],
        'paves': [path([(26, 0), (26, 9), (47, 9)], 1.1)],
        'eau': [blob(13, 24, 6, 3.5, wob=0.3, seed=4)],
    }
    grids = {k: [[any(f(x, y) for f in fs) for x in range(W + 1)] for y in range(H + 1)] for k, fs in corners.items()}
    for y in range(H):
        for x in range(W):
            base = tile(f'herbe_{r.choice([0, 0, 0, 1, 2, 3, 4, 5, 6, 7])}')
            out.alpha_composite(base, (x * T, y * T))
            for name in ('prairie', 'terre', 'paves', 'eau'):
                g = grids[name]
                c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
                if any(c):
                    nm = f'{name}_{"".join(str(int(b)) for b in c)}'
                    out.alpha_composite(tile(nm), (x * T, y * T))
    occupied = set()
    def free(x, y, w=1, h=1):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if not (0 <= xx < W and 0 <= yy < H) or (xx, yy) in occupied:
                    return False
                for name in ('terre', 'paves', 'eau'):
                    g = grids[name]
                    if g[yy][xx] or g[yy][xx + 1] or g[yy + 1][xx] or g[yy + 1][xx + 1]:
                        return False
        return True
    def place(nm, x, y, w=1, h=1):
        for ty in range(h):
            for tx in range(w):
                out.alpha_composite(tile(f'{nm}_{tx}_{ty}' if w * h > 1 and f'{nm}_{tx}_{ty}' in index else
                                         f'{nm}_{tx}' if w > 1 else nm), ((x + tx) * T, (y + ty) * T))
                occupied.add((x + tx, y + ty))
    # au bord de l'eau
    for x in range(W):
        for y in range(H):
            g = grids['eau']
            c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
            if all(c) and r.random() < 0.09:
                out.alpha_composite(tile('nenuphars'), (x * T, y * T))
            elif any(c) and not all(c) and r.random() < 0.3 and (c[2] and c[3]):
                out.alpha_composite(tile('roseaux'), (x * T, (y - 1) * T))
    # arbres en lisière et quelques isolés
    plan = []
    for x in range(0, W, 3):
        plan.append((r.choice(['chene', 'chene', 'pommier', 'cerisier']), x, -1 if x % 2 else 0))
    plan += [('sapin', 30, 12), ('chene', 2, 2), ('pommier', 20, 3), ('cerisier', 41, 13), ('sapin', 44, 24),
             ('chene', 3, 17), ('pommier', 28, 23)]
    for nm, x, y in plan:
        w, h = (2, 3) if nm == 'sapin' else (3, 3)
        if y < 0 or free(x, y, w, h):
            for ty in range(h):
                for tx in range(w):
                    if 0 <= y + ty < H and 0 <= x + tx < W:
                        out.alpha_composite(tile(f'{nm}_{tx}_{ty}'), ((x + tx) * T, (y + ty) * T))
                        occupied.add((x + tx, y + ty))
    # clôture autour d'un enclos, avec un portillon
    fx0, fx1, fy = 32, 40, 15
    for x in range(fx0, fx1 + 1):
        nm = 'cloture_gauche' if x == fx0 else 'cloture_droite' if x == fx1 else 'cloture_portillon' if x == 36 else 'cloture_milieu'
        if free(x, fy):
            place(nm, x, fy)
    # détails et objets
    decos = ['touffes_0'] * 5 + ['herbes_hautes_0'] * 3 + ['trefle_0'] * 2 + ['fleurs_blanches_0', 'fleurs_blanches_2',
             'fleurs_jaunes_0', 'fleurs_jaunes_2', 'fleurs_rouges_1', 'fleurs_bleues_1', 'fleurs_mauves_1',
             'champignons_0', 'cailloux_0', 'feuilles_0']
    for _ in range(170):
        x, y = r.randrange(W), r.randrange(H)
        if free(x, y):
            place(r.choice(decos), x, y)
    for nm in ['buisson_vert'] * 6 + ['buisson_baies'] * 3 + ['buisson_fleuri'] * 3 + ['buisson_petit'] * 4 + \
              ['rocher'] * 3 + ['souche', 'tonneau', 'caisse', 'foin', 'foin']:
        for _ in range(30):
            x, y = r.randrange(W), r.randrange(H)
            if free(x, y):
                place(nm, x, y)
                break
    for nm in ('grand_rocher', 'rondin'):
        for _ in range(40):
            x, y = r.randrange(W - 1), r.randrange(H)
            if free(x, y, 2, 1):
                place(nm, x, y, 2, 1)
                break
    return out


if __name__ == '__main__':
    sheet, index, meta = build()
    if '--demo' in sys.argv:
        d = demo(sheet, index, meta)
        d.save(os.path.join(ROOT, 'demo_tileset.png'))
        print('demo_tileset.png')
