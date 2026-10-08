# Lot « verger et bêtes » : dessins de carte (sans emoji), à l'échelle des bêtes de la carte
# (1 pixel du dessin = 1 pixel de la case de 32×32, pas d'ART_SCALE).
#   tree-young    jeune plant fruitier avec tuteur, sur sa butte
#   tree-adult    arbre fruitier adulte (houppier rond)
#   tree-pommier  le même, chargé de pommes rouges
#   tree-poirier  houppier plus haut et plus étroit, poires jaune-vert
#   plot-soil     emplacement vide : butte de terre labourée
#   sheep-shorn   mouton tondu, tiré de la première case de assets/mouton.png
# Les arbres sont calculés : un houppier = des touffes rondes, chacune éclairée en haut à
# gauche, les plus basses devant ; ombre d'ensemble en bas à droite ; contour sombre.
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PALETTE = {
    # feuillage (teintes des arbres de la carte)
    'O': '#123a2e', '1': '#1d5a3e', '2': '#367d3c', '3': '#63914b', '4': '#9cb062',
    # feuillage du poirier, un peu plus bleu (les poires jaunes ressortent)
    '5': '#174c3c', '6': '#2a6a46', '7': '#4a874c', '8': '#80a65e',
    # tronc (gris-brun de la carte)
    'K': '#33221a', 'T': '#5f4a38', 't': '#7e6a52', 'h': '#9c8a6c',
    # tuteur (bois clair) et lien
    'w': '#c49a62', 'W': '#8a5a34', 'J': '#3a2414', 'l': '#d8d0b0',
    # pommes
    'R': '#5e1018', 'r': '#b8303a', 'p': '#e0605a', 'P': '#f4b0a0',
    # poires
    'Y': '#5a5018', 'y': '#e0d040', 'v': '#b0a628', 'V': '#fcf6b0',
    'q': '#4a3020',  # queue des fruits
    # terre (assets/soil_dry.png)
    'S': '#4e3420', 'f': '#7e5a3a', 's': '#966f49', 'm': '#a27f56', 'M': '#ae8d62', 'n': '#c8aa7c',
}

LEAF = '1234'
LEAF_PEAR = '5678'


# ---------------------------------------------------------------- outils de grille
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}      # (x, y) -> lettre
        self.mat = {}     # (x, y) -> matière (pour la couleur du contour)

    def put(self, x, y, c, mat):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = c
            self.mat[(x, y)] = mat

    def outline(self, colors, prio):
        """Contour 1 px (4-voisins) autour de chaque matière, dans sa teinte sombre."""
        add = {}
        for y in range(self.h):
            for x in range(self.w):
                if (x, y) in self.px:
                    continue
                best = None
                for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    m = self.mat.get((x + dx, y + dy))
                    if m and (best is None or prio.index(m) < prio.index(best)):
                        best = m
                if best:
                    add[(x, y)] = colors[best]
        for k, c in add.items():
            self.px[k] = c
            self.mat[k] = 'outline'

    def image(self):
        xs = [x for x, _ in self.px]
        ys = [y for _, y in self.px]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        im = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x - x0, y - y0), rgb(PALETTE[c]))
        return im


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def grid(rows):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        assert len(row) == w, (y, row, len(row))
        for x, c in enumerate(row):
            if c != '.':
                im.putpixel((x, y), rgb(PALETTE[c]))
    return im


# ---------------------------------------------------------------- feuillage et tronc
def canopy(cv, clumps, tones, box):
    """clumps : (cx, cy, r). Les touffes du bas passent devant celles du haut ; le bas d'une
    touffe recouverte par une autre plus basse prend la teinte la plus sombre (relief)."""
    bx0, by0, bx1, by1 = box
    gcx, gcy = (bx0 + bx1) / 2, (by0 + by1) / 2
    grx, gry = (bx1 - bx0) / 2, (by1 - by0) / 2
    if len(clumps) > 8:  # léger désordre fixe, pour casser l'alignement en rangées
        clumps = [(cx + ((i * 37) % 5 - 2) * .3, cy + ((i * 53 + 1) % 5 - 2) * .35,
                   r + ((i * 29) % 3 - 1) * .3) for i, (cx, cy, r) in enumerate(clumps)]
    order = sorted(clumps, key=lambda c: (c[1], -abs(c[0] - gcx)))
    own = {}
    for y in range(cv.h):
        for x in range(cv.w):
            for i, (cx, cy, r) in enumerate(order):
                if (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r:
                    own[(x, y)] = i
    for (x, y), i in own.items():
        cx, cy, r = order[i]
        # éclairage de la touffe (lumière en haut à gauche)
        d = ((cx - x - .5) * .6 + (cy - y - .5) * .8) / r
        t = 3 if d > .6 else 2 if d > .1 else 1 if d > -.5 else 0
        # ombre d'ensemble : bas et droite du houppier plus sombres
        g = (x + .5 - gcx) / grx * .45 + (y + .5 - gcy) / gry
        if g > .45:
            t -= 1
        if g > .95:
            t -= 1
        if g < -.85:
            t += 1
        below = own.get((x, y + 1))
        if below is not None and below != i:
            t = min(t - 1, 1)
        t = max(0, min(3, t))
        cv.put(x, y, tones[t], 'leaf')


def trunk(cv, cx, top, bottom):
    """Tronc vertical centré sur cx : 4 px, évasé au pied en racines ; ombre sous le houppier."""
    n = bottom - top
    for y in range(top, bottom + 1):
        k = y - top
        w = 6 if y == bottom else 5 if y == bottom - 1 else 4
        x0 = int(round(cx - w / 2))
        for i in range(w):
            c = 'h' if i == 1 and 1 < k < n - 1 else 't' if i <= w // 2 - (0 if i else 1) or i == 1 else 'T'
            if k < 2:
                c = 'T'      # ombre portée du houppier
            cv.put(x0 + i, y, c, 'trunk')
    cv.put(int(round(cx - 3)) - 1, bottom, 'T', 'trunk')   # racine gauche
    cv.put(int(round(cx + 3)), bottom, 'T', 'trunk')       # racine droite


def branches(cv, pts):
    for x, y, c in pts:
        cv.put(x, y, c, 'trunk')


def fruit(cv, x, y, kind):
    if kind == 'apple':
        rows = ['.q..', 'rprR', 'pPrR', 'rrrR', '.RR.']
        rows = ['..q.', '.rr.', 'rPpR', 'rprR', '.RR.']
    else:
        rows = ['..q.', '.vy.', '.yy.', 'yVyv', 'yyvY', '.YY.']
    for dy, row in enumerate(rows):
        for dx, c in enumerate(row):
            if c != '.':
                cv.put(x + dx, y + dy, c, 'fruit')


OUT = {'leaf': 'O', 'trunk': 'K', 'fruit': 'O', 'stake': 'J', 'soil': 'S'}
PRIO = ['soil', 'trunk', 'stake', 'fruit', 'leaf']


def adult_tree(kind=None):
    cv = Canvas(32, 32)
    pear = kind == 'pear'
    if pear:
        # houppier en ogive : plus haut et plus étroit que celui du pommier
        clumps = [(15.5, 3.2, 3.2),
                  (12.6, 6.6, 3.5), (18.4, 6.6, 3.5),
                  (9.6, 10.2, 3.6), (15.5, 10, 3.6), (21.4, 10.2, 3.6),
                  (7.4, 13.8, 3.6), (12.5, 13.6, 3.6), (18.5, 13.6, 3.6), (23.6, 13.8, 3.6),
                  (8.2, 17.2, 3.4), (13, 17.4, 3.6), (18, 17.4, 3.6), (22.8, 17.2, 3.4),
                  (12.2, 19.6, 2.8), (18.8, 19.6, 2.8)]
        box = (4, 0, 27, 22.5)
        tones = LEAF_PEAR
        top = 21
    else:
        clumps = [(11.2, 4, 3.6), (15.5, 3.4, 3.6), (19.8, 4, 3.6),
                  (6.6, 7.6, 3.8), (11, 7.4, 3.8), (15.5, 7.2, 3.8), (20, 7.4, 3.8), (24.4, 7.6, 3.8),
                  (4.2, 11.6, 3.5), (8.6, 11.4, 3.7), (13.1, 11.2, 3.7), (17.9, 11.2, 3.7),
                  (22.4, 11.4, 3.7), (26.8, 11.6, 3.5),
                  (6.2, 15.4, 3.6), (10.8, 15.6, 3.7), (15.5, 15.6, 3.7), (20.2, 15.6, 3.7),
                  (24.8, 15.4, 3.6),
                  (11.2, 18.4, 3), (19.8, 18.4, 3)]
        box = (1, 0, 30, 21.5)
        tones = LEAF
        top = 19
    canopy(cv, clumps, tones, box)
    trunk(cv, 15.5, top, 29)
    # départ des branches dans le creux du houppier
    branches(cv, [(13, top - 1, 'T'), (12, top - 2, 'K'), (18, top - 1, 'T'), (19, top - 2, 'K'),
                  (14, top - 1, 't'), (17, top - 1, 'T'), (15, top - 1, 'T'), (16, top - 1, 'T')])
    if kind == 'apple':
        for x, y in ((8, 6), (19, 3), (23, 10), (12, 11), (4, 13), (18, 14)):
            fruit(cv, x, y, 'apple')
    elif pear:
        for x, y in ((14, 3), (9, 9), (19, 8), (14, 13), (21, 14), (8, 16)):
            fruit(cv, x, y, 'pear')
    cv.outline(OUT, PRIO)
    return cv.image()


YOUNG_TREE = [  # tige, deux feuilles au sommet, une sur le côté, tuteur lié, butte de terre
    '......OOO......',
    '.OO..O443O.....',
    'O43O.O432O..J..',
    'O432OO32O..JwJ.',
    '.O3221O2O..JwJ.',
    '..O221hTO..JwJ.',
    '...OOKhTK..JwJ.',
    '.OO..KhTK..JwJ.',
    'O432OOhTK..JwJ.',
    'O32211hTK..JwJ.',
    '.O21OKhTK..JwJ.',
    '..OO.KhTllllwJ.',
    '.....KhTK..JwJ.',
    '.....KhTK..JwJ.',
    '.....KhTK..JwJ.',
    '.....KhTK..JwJ.',
    '....KKhTKK.JwJ.',
    '...SSShTSSSSwS.',
    '.SnnnMMMMMMMmmS',
    'SnMMMMMMMMMmmsS',
    '.SSSSSSSSSSSSS.',
]


def young_tree():
    return grid(YOUNG_TREE)


PLOT_SOIL = [  # billons éclairés dessus, sillons sombres
    '.....SSSSSSSSSSSSSSSS.....',
    '...SSnnnnnnnMMMMMMMMmSS...',
    '.SSnMffffnfffffffMfffmmSS.',
    'SnMMMMfMMMMMMnMMMMMMMMmmsS',
    'SMmfffffMffffffffnffffmmsS',
    'SMMMnMMMMMMMMMMMfMMMMmmssS',
    'SMmmffffffMffffffffffmsssS',
    '.SSmmmmmmmmmmmmmmmmmsssSS.',
    '...SSSSSSSSSSSSSSSSSSSS...',
]


def soil():
    return grid(PLOT_SOIL)


# ---------------------------------------------------------------- mouton tondu
# Lettres de la planche : a contour, b/c/e laine (remplacées), d/f/g tête et pattes.
SHEEP_SRC = {'a': '#2b2a2e', 'b': '#e5e1d8', 'c': '#cac2b9', 'd': '#70747a',
             'e': '#978f88', 'f': '#5f5b59', 'g': '#67523d'}
# peau rase : crème rosée, plus foncée que la laine
SKIN = {'u': '#efdcc8', 'k': '#dcbfa6', 'x': '#c09e88', 'z': '#9c7a66'}
SHORN = [  # rangées 10 à 19 de la case ; 20 à 23 (pattes) reprises telles quelles
    '...................aaaa.........',
    '..................aukkka........',
    '..........aaaaaaaaaukkxa........',
    '.........auukkkkkkkkaadda.......',
    '........aukkxxkkkkkkadada.......',
    '.......aukkkkkkkxxkkxdddda......',
    '.......akkkxxkkkkkkkxaddda......',
    '........akkkkkkxxkkkxaaa........',
    '........akkxxkkkkkkxza..........',
    '........azzxxxxxxxzza...........',
]


def sheep_shorn():
    src = Image.open(os.path.join(ROOT, 'assets', 'mouton.png')).convert('RGBA').crop((0, 0, 32, 24))
    im = Image.new('RGBA', (32, 24), (0, 0, 0, 0))
    for y in range(20, 24):
        for x in range(32):
            im.putpixel((x, y), src.getpixel((x, y)))
    cols = dict(SHEEP_SRC, **SKIN)
    for i, row in enumerate(SHORN):
        assert len(row) == 32, (i, len(row))
        for x, c in enumerate(row):
            if c != '.':
                im.putpixel((x, 10 + i), rgb(cols[c]))
    return im


def art():
    return {
        'tree-young': young_tree(),
        'tree-adult': adult_tree(),
        'tree-pommier': adult_tree('apple'),
        'tree-poirier': adult_tree('pear'),
        'plot-soil': soil(),
        'sheep-shorn': sheep_shorn(),
    }
