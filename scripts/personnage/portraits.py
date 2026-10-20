# Portraits 32 × 32 des 50 personnages du catalogue (scripts/personnage/catalogue.py,
# perso_01 à perso_50 : assets/portraits/perso_XX.png), dérivés du portrait modèle dessiné à la
# main (scripts/personnage/modeles/portrait.png : la jeune femme aux cheveux châtains et au
# chemisier vert, perso_01) et de la forme de son visage (portrait_visage.png : le même, le
# contour du visage tracé en noir).
#
# Un portrait est une base, le visage, sur laquelle on pose une coiffure, puis le reste :
#   - le visage (visage()) : tout ce qui est dans le contour noir (le crâne, le front, les joues,
#     le menton), le contour lui-même (le bord du visage), le cou et la chemise. Ce que les
#     cheveux du modèle couvraient dans le contour (le front, le haut du crâne) devient de la
#     peau. Les yeux sont ceux du modèle, de la même taille pour tous : chaque œil fait 5 pixels
#     de large (le blanc aux bords), l'iris 3 × 3 en trois nuances, la pupille 1 pixel ;
#   - la coiffure (COUPES), à partir des cheveux du modèle : sa mèche sur le front (dans le
#     contour) et sa chevelure autour du visage (dehors). Mi-longs : ceux du modèle ; longs : en
#     plus, des mèches sur les épaules ; carré : coupés au menton ; courts : la mèche et une
#     calotte serrée sur le crâne, au-dessus des oreilles (qui apparaissent) ; frange : le front
#     couvert jusqu'aux sourcils ; couettes et chignon : sur les cheveux courts ; crâne dégarni :
#     une couronne au-dessus des oreilles ;
#   - le couvre-chef (COUVRE_CHEFS) et les détails (DETAILS : barbe, moustache, lunettes, taches
#     de rousseur, boucles d'oreilles), puis le motif de la chemise ;
#   - les couleurs : la peau et l'iris gardent les nuances du modèle (chaque couleur × la
#     nouvelle teinte / celle du modèle) ; les cheveux, la chemise et les accessoires prennent les
#     couleurs du catalogue.
# Le contour est ajouté à la fin autour de ce qui dépasse (cheveux, oreilles, couvre-chef).
#
#   python3 scripts/personnage/portraits.py            écrit assets/portraits/perso_XX.png
#   python3 scripts/personnage/portraits.py --apercu   écrit aussi apercu_portraits.png (agrandi)
#
# Les enfants ont leurs portraits à part : scripts/personnage/portraits_enfants.py.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402
import modeles  # noqa: E402  (la couleur des yeux de chacun, la même que sur la carte)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, melange  # noqa: E402
DIR = os.path.join(ASSETS, 'portraits')
MODELES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles')
MODELE = os.path.join(MODELES, 'portrait.png')
VISAGE = os.path.join(MODELES, 'portrait_visage.png')
MODELE_DE = 'perso_01'          # le personnage que le modèle représente
N = 32

CONTOUR = (51, 39, 23)
TRAIT = (0, 0, 0)               # le contour du visage, dans portrait_visage.png
# Les rôles des couleurs du modèle
CHEVEUX = {(135, 96, 44): 'b', (79, 58, 30): 'c', (182, 128, 60): 'l'}     # clair, ombre, reflet
SOURCILS = (99, 72, 32)
PEAU_MODELE = (240, 185, 141)
IRIS_MODELE = (71, 106, 68)
IRIS = {(71, 106, 68), (65, 97, 62), (53, 83, 50), (59, 88, 56), (71, 108, 68), (77, 117, 74), (59, 90, 56), (65, 99, 62)}
BLANCS = {(191, 191, 191), (231, 231, 231), (48, 48, 48)}                   # (et la pupille)
CHEMISE = {(36, 52, 22): 'l', (136, 169, 108): 'm', (185, 231, 146): 'n'}
LEVRES = {(176, 102, 68), (165, 96, 64)}


def classe(c):
    if c == CONTOUR:
        return 'contour'
    if c in CHEVEUX or c == SOURCILS:
        return 'cheveux'
    if c in IRIS or c in BLANCS:
        return 'oeil'
    if c in CHEMISE:
        return 'chemise'
    return 'peau'


def lire():
    """Le modèle { (x, y): couleur }, le contour du visage (un ensemble de cases) et ce qu'il
    enferme (le visage, sans le contour)."""
    im = Image.open(MODELE).convert('RGBA')
    v = Image.open(VISAGE).convert('RGBA')
    g = {(x, y): im.getpixel((x, y))[:3] for y in range(N) for x in range(N) if im.getpixel((x, y))[3]}
    trait = {(x, y) for y in range(N) for x in range(N) if v.getpixel((x, y))[3] and v.getpixel((x, y))[:3] == TRAIT}
    # dehors : ce qu'on atteint depuis le bord de l'image sans franchir le trait
    dehors, pile = set(), [(x, y) for x in range(N) for y in (0, N - 1)] + [(x, y) for y in range(N) for x in (0, N - 1)]
    while pile:
        q = pile.pop()
        if q in dehors or q in trait or not (0 <= q[0] < N and 0 <= q[1] < N):
            continue
        dehors.add(q)
        pile += [(q[0] + 1, q[1]), (q[0] - 1, q[1]), (q[0], q[1] + 1), (q[0], q[1] - 1)]
    dedans = {(x, y) for y in range(N) for x in range(N)} - dehors - trait
    return g, trait, dedans


# Les couleurs « jetons » (posées par les coupes, couvre-chefs et détails, résolues à la fin)
B, C, L = ('cheveux', 'b'), ('cheveux', 'c'), ('cheveux', 'l')
PEAU, PEAU_OMBRE, PEAU_CLAIRE = PEAU_MODELE, (230, 156, 95), (242, 193, 154)
A1, A2, A3 = ('acc', 1), ('acc', 2), ('acc', 3)                 # l'accessoire, son ombre, son reflet
P1, P2, P3 = ('paille', 1), ('paille', 2), ('paille', 3)
LUNETTES, ROUSSEUR, OR, COEUR, MOTIF = ('lunettes',), ('rousseur',), ('or',), ('coeur',), ('motif',)


class Portrait:
    def __init__(self, g):
        self.g = dict(g)

    def set(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.g[(x, y)] = c

    def efface(self, x, y):
        self.g.pop((x, y), None)

    def cls(self, x, y):
        c = self.g.get((x, y))
        if c is None:
            return None
        if isinstance(c, tuple) and c and isinstance(c[0], str):
            return 'cheveux' if c[0] == 'cheveux' else 'objet'
        return classe(c)

    def peau(self):
        return [p for p in self.g if self.cls(*p) == 'peau']

    def bornes_visage(self, y):
        """Le bord du visage sur la rangée y : les cases du contour du visage (à gauche, à droite)."""
        xs = [x for (x, yy) in TRAIT_CASES if yy == y]
        return (min(xs) + 1, max(xs) - 1) if len(xs) >= 2 else (None, None)

    def contour(self):
        """Le contour autour de ce qui touche le vide (sauf la chemise, qui a le sien)."""
        for (x, y) in list(self.g):
            c = self.g[(x, y)]
            if c == CONTOUR or (not isinstance(c[0], str) and classe(c) == 'chemise'):
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if 0 <= n[0] < N and 0 <= n[1] < N and n not in self.g:
                    self.g[n] = CONTOUR


TRAIT_CASES = set()     # le contour du visage (lire)
DEDANS = set()          # ce qu'il enferme
MECHE = {}              # les cheveux du modèle dans le contour et sur lui : sa mèche sur le front
CHEVELURE = {}          # les cheveux du modèle dehors, autour du visage


def cou(x, y):
    """La case est-elle entre les deux traits du cou (le contour du visage sous la mâchoire) ?"""
    # (sous le dernier trait, dans le col de la chemise : entre les traits de la dernière rangée)
    ty = min(y, max(t for (_, t) in TRAIT_CASES))
    xs = [tx for (tx, t) in TRAIT_CASES if t == ty]
    return len(xs) >= 2 and min(xs) < x < max(xs)


def visage(g):
    """La base : le visage sans cheveux (la peau sous la mèche du modèle), le contour du visage,
    le cou et la chemise."""
    p = Portrait({})
    for (x, y) in DEDANS:
        c = g.get((x, y))
        if c is not None and classe(c) in ('peau', 'oeil') or c == SOURCILS:
            p.set(x, y, c)
            continue
        # sous la mèche : de la peau, plus sombre au bord du crâne, un reflet en haut à gauche
        bord = any((x + dx, y + dy) in TRAIT_CASES for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        p.set(x, y, PEAU_OMBRE if bord and x >= 16 else (PEAU_CLAIRE if bord and y <= 5 else PEAU))
    for q in TRAIT_CASES:
        p.set(*q, CONTOUR)
    for (x, y), c in g.items():
        if (x, y) in DEDANS or (x, y) in TRAIT_CASES:
            continue
        # la chemise, et le cou : la peau sous le menton, entre les deux traits du cou (rien
        # dans l'angle du cou et de la mâchoire)
        if classe(c) == 'chemise' or (classe(c) == 'peau' and y >= 22 and cou(x, y)):
            p.set(x, y, c)
    return p


def meche(p, jusqua=N):
    """La mèche du modèle sur le front (ses cheveux dans le contour et sur lui), jusqu'à la rangée `jusqua`."""
    for (x, y), c in MECHE.items():
        if y < jusqua:
            p.set(x, y, c)


def chevelure(p, jusqua=N):
    """La chevelure du modèle autour du visage (dehors), jusqu'à la rangée `jusqua` (exclue)."""
    for (x, y), c in CHEVELURE.items():
        if y < jusqua:
            p.set(x, y, c)
    # (le contour du visage sous les cheveux redevient des cheveux, comme dans le modèle)


def mi(p):
    meche(p)
    chevelure(p)


def longs(p):
    """Les cheveux du modèle, et des mèches qui tombent sur les épaules, devant la chemise."""
    mi(p)
    for y in range(22, N):
        for x0, x1 in ((3, 8), (23, 28)):
            for x in range(x0, x1 + 1):
                if y > 28 and x in (x0, x1):
                    continue
                p.set(x, y, C if x in (3, 28) else (L if (x + y) % 5 == 0 else B))


def carre(p):
    """Coupés au menton (rangée 18), d'une ligne nette."""
    meche(p, 19)
    chevelure(p, 19)
    for (x, y) in list(p.g):
        if y == 18 and p.cls(x, y) == 'cheveux' and p.g[(x, y)] != SOURCILS:
            p.set(x, y, C)


def frange(p):
    """Le front couvert de cheveux jusqu'aux sourcils (rangée 9 : l'ombre de la frange)."""
    for (x, y) in DEDANS:
        if 1 <= y <= 9 and p.g.get((x, y)) != SOURCILS:
            p.set(x, y, C if y == 9 else (L if x % 4 == 1 and y <= 7 else B))     # (des mèches claires, verticales)


def oreilles(p):
    """Les oreilles, contre le contour du visage (rangées 11 à 15), quand les cheveux ne les cachent plus."""
    for y in range(11, 16):
        x0, x1 = p.bornes_visage(y)
        if x0 is None:
            continue
        for x, o in ((x0 - 2, -1), (x1 + 2, 1)):
            p.set(x, y, PEAU_OMBRE if y in (11, 15) else PEAU)
            if 12 <= y <= 14:
                p.set(x + o, y, PEAU_OMBRE)


def calotte(p, bas=10):
    """Les cheveux courts : une calotte serrée sur le crâne (le contour du visage et une case
    autour, jusqu'à la rangée `bas`), la mèche du modèle sur le front, et les pattes."""
    meche(p, bas + 1)
    for (x, y) in TRAIT_CASES:
        if y > bas:
            continue
        for dx in (-1, 0, 1):
            for dy in (-1, 0):
                q = (x + dx, y + dy)
                if q not in DEDANS and 0 <= q[0] < N and 0 <= q[1] < N:
                    p.set(*q, C if (x >= 16 and dx >= 0) or dy < 0 and y <= 2 else (L if (q[0] + q[1]) % 6 == 0 else B))


def courts(p):
    calotte(p)
    oreilles(p)


def couettes(p):
    """La calotte et la frange ; les cheveux descendent devant les oreilles (on ne les voit pas)
    jusqu'aux deux couettes nouées d'un ruban."""
    calotte(p)
    frange(p)
    for y in range(9, 14):
        x0, x1 = p.bornes_visage(y)
        if x0 is None:
            continue
        for x in (x0 - 3, x0 - 2):
            p.set(x, y, C if x == x0 - 3 else B)
        for x in (x1 + 2, x1 + 3):
            p.set(x, y, C if x == x1 + 3 else B)
    for cx in (2, 29):
        for y in range(12, 22):
            r = 2.6 - abs(y - 16.5) * 0.28
            for x in range(cx - 3, cx + 4):
                if abs(x - cx) <= r and 0 <= x < N:
                    p.set(x, y, C if abs(x - cx) > r - 1 else (L if (x + y) % 4 == 0 else B))
        for x in range(cx - 1, cx + 2):                 # le ruban
            p.set(x, 11, A1)
        p.set(cx, 10, A2)


def chignon(p):
    courts(p)
    for y in range(0, 5):
        for x in range(12, 21):
            if (x - 16) ** 2 / 18 + (y - 2) ** 2 / 5 <= 1:
                p.set(x, y, C if x >= 19 or y == 4 else (L if (x + y) % 4 == 0 else B))


def chauve(p):
    """Le crâne nu (la base), une couronne de cheveux au-dessus des oreilles."""
    for (x, y) in TRAIT_CASES:
        if 7 <= y <= 11:
            for dx in (-1, 0):
                q = (x + dx if x < 16 else x - dx, y)
                p.set(*q, C if x >= 16 else B)
    for x, y in ((12, 3), (13, 3), (12, 4)):           # un reflet sur le crâne
        p.set(x, y, (250, 214, 184))
    oreilles(p)


COUPES = {
    'longs': longs, 'mi': mi, 'carre': carre, 'courts': courts,
    'frange': lambda p: (longs(p), frange(p)), 'frange_carre': lambda p: (carre(p), frange(p)),
    'couettes': couettes, 'chignon': chignon, 'chauve': chauve,
}


# ---------- couvre-chefs ----------

def tete(p, y0, y1):
    """Les cases de la tête entre les rangées y0 et y1 (comprises)."""
    return [(x, y) for (x, y) in p.g if y0 <= y <= y1 and p.cls(x, y) in ('cheveux', 'peau', 'contour', 'objet')]


def casquette(p):
    for (x, y) in tete(p, 0, 7):
        if p.g[(x, y)] == CONTOUR:
            continue
        p.set(x, y, A2 if x >= 23 else (A3 if 9 <= x <= 11 and y <= 4 else A1))
    for x in range(3, 30):
        p.set(x, 8, A2)
    for x in range(5, 28):
        p.set(x, 9, (0, 0, 0, 'visiere'))


def paille(p):
    for y in range(0, 6):
        for x in range(9, 23):
            if y == 0 and not 11 <= x <= 20:
                continue
            p.set(x, y, P3 if x <= 11 and y < 4 else (P2 if x >= 21 else P1))
    for y in (4, 5):
        for x in range(9, 23):
            p.set(x, y, A1)
    for x in range(0, N):
        p.set(x, 6, P1 if 2 <= x <= 29 else P2)
        if 1 <= x <= 30:
            p.set(x, 7, P2)


def bonnet(p):
    for y in range(0, 6):
        for x in range(5, 27):
            if (y == 0 and not 10 <= x <= 21) or (y == 1 and not 7 <= x <= 24):
                continue
            p.set(x, y, A2 if x % 3 == 0 or x >= 24 else (A3 if 8 <= x <= 10 and y <= 3 else A1))
    for y in (6, 7, 8):
        for x in range(3, 29):
            p.set(x, y, A2 if y == 8 else A1)


def beret(p):
    for y in range(0, 6):
        for x in range(2, 30):
            if ((x - 14) ** 2) / 156 + ((y - 3.2) ** 2) / 7.5 <= 1:
                p.set(x, y, A2 if y >= 5 or x >= 25 else (A3 if 8 <= x <= 11 and y <= 2 else A1))
    p.set(16, 0, A2)


def bandeau(p):
    for y in (6, 7):
        for (x, yy) in [q for q in tete(p, y, y)]:
            if p.g[(x, yy)] != CONTOUR:
                p.set(x, yy, A1 if y == 6 else A2)


def fleur(p):
    cx, cy = 24, 6
    for dx, dy in ((0, -2), (-2, 0), (2, 0), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (-1, 0), (1, 0), (0, 1)):
        p.set(cx + dx, cy + dy, A1 if abs(dx) + abs(dy) == 2 and dx * dy == 0 else (A3 if dy < 0 else A2))
    p.set(cx, cy, COEUR)


COUVRE_CHEFS = {None: lambda p: None, 'casquette': casquette, 'paille': paille, 'bonnet': bonnet,
                'beret': beret, 'bandeau': bandeau, 'fleur': fleur}


# ---------- détails ----------

def bouche(p):
    pts = [q for q in p.g if p.g[q] in LEVRES]
    xs, ys = [x for x, _ in pts], [y for _, y in pts]
    return min(xs), max(xs), min(ys), max(ys)


def barbe(p):
    """La barbe : le bas du visage sous la bouche et autour d'elle, et le long des joues
    jusqu'aux pattes (deux cases du bord) ; la bouche reste visible, le cou aussi."""
    x0, x1, y0, y1 = bouche(p)
    for (x, y) in list(p.g):
        if p.cls(x, y) != 'peau' or p.g[(x, y)] in LEVRES or y >= 24 or y < 13:
            continue
        b0, b1 = p.bornes_visage(y)
        joue = x - b0 < 2 or b1 - x < 2
        if y < y0 - 1 and not joue:
            continue
        if y0 <= y <= y1 and x0 <= x <= x1:
            continue
        p.set(x, y, C if b1 - x < 1 else (L if (x * 3 + y) % 7 == 0 else B))


def moustache(p):
    x0, x1, y0, _ = bouche(p)
    for x in range(x0 - 2, x1 + 3):
        p.set(x, y0 - 1, B if x0 - 1 <= x <= x1 + 1 else C)
    for x in range(x0, x1 + 1):
        p.set(x, y0 - 2, B)


def yeux_bornes(p):
    pts = [q for q in p.g if p.g[q] in IRIS or p.g[q] in BLANCS]
    gauche = [q for q in pts if q[0] < 16]
    droite = [q for q in pts if q[0] >= 16]
    return [(min(x for x, _ in s), max(x for x, _ in s), min(y for _, y in s), max(y for _, y in s)) for s in (gauche, droite)]


def lunettes(p):
    oeils = yeux_bornes(p)
    for (x0, x1, y0, y1) in oeils:
        for x in range(x0 - 1, x1 + 2):
            p.set(x, y0 - 1, LUNETTES)
            p.set(x, y1 + 1, LUNETTES)
        for y in range(y0 - 1, y1 + 2):
            p.set(x0 - 1, y, LUNETTES)
            p.set(x1 + 1, y, LUNETTES)
    (_, g1, gy, _), (d0, _, _, _) = oeils
    for x in range(g1 + 2, d0 - 1):
        p.set(x, gy, LUNETTES)                          # le pont


def rousseur(p):
    (_, g1, _, gy1), (d0, _, _, _) = yeux_bornes(p)
    for x, y in ((g1 - 4, gy1 + 2), (g1 - 2, gy1 + 3), (g1, gy1 + 2), (d0, gy1 + 2), (d0 + 2, gy1 + 3), (d0 + 4, gy1 + 2)):
        if p.cls(x, y) == 'peau':
            p.set(x, y, ROUSSEUR)


def boucles(p):
    for y in (16, 17):
        x0, x1 = p.bornes_visage(15)
        if x0 is None:
            continue
        p.set(x0 - 1, y, OR)
        p.set(x1 + 1, y, OR)


DETAILS = {'barbe': barbe, 'moustache': moustache, 'lunettes': lunettes, 'rousseur': rousseur, 'boucles': boucles}


def motif(p, m):
    if not m:
        return
    for (x, y), c in list(p.g.items()):
        if c not in CHEMISE or CHEMISE[c] == 'l':
            continue
        if m == 'pois' and (x + 2 * y) % 5 == 0:
            p.set(x, y, MOTIF)
        elif m == 'rayures' and y % 2 == 0:
            p.set(x, y, ('chemise', 'm'))
        elif m == 'carreaux' and (x % 4 == 0 or y % 4 == 0):
            p.set(x, y, MOTIF)


# ---------- les couleurs ----------

def transfert(c, de, vers):
    return tuple(max(0, min(255, round(v * t / max(1, f)))) for v, f, t in zip(c, de, vers))


def couleurs(d, i):
    peau, hr, hab = catalogue.PEAU[d['peau']], catalogue.CHEVEUX[d['cheveux']], catalogue.HABITS[d['habit']]
    oeil = modeles.YEUX[modeles.yeux(d, i)][1]
    a = d['accessoire']
    hrs = {'b': hr['b'], 'c': hr['c'], 'l': melange(hr['b'], (255, 255, 255), 0.25)}
    chem = {'l': hab['l'], 'm': hab['m'], 'n': hab['n']}
    jetons = {
        ('acc', 1): a, ('acc', 2): catalogue.fonce(a), ('acc', 3): melange(a, (255, 255, 255), 0.35),
        ('paille', 1): (232, 194, 90), ('paille', 2): (184, 138, 46), ('paille', 3): (250, 222, 136),
        ('lunettes',): (40, 40, 48), ('rousseur',): melange(peau['f'], (150, 80, 40), 0.4), ('or',): (236, 200, 60),
        ('coeur',): (232, 120, 60) if a in (catalogue.ACCESSOIRES['jaune'], catalogue.ACCESSOIRES['blanc']) else (236, 200, 60),
        ('motif',): (200, 60, 60) if d['habit'] == 'blanc' else (244, 240, 228),
        (0, 0, 0, 'visiere'): catalogue.fonce(a, 0.55),
    }

    def couleur(c):
        if isinstance(c, tuple) and c and isinstance(c[0], str):
            if c[0] == 'cheveux':
                return hrs[c[1]]
            if c[0] == 'chemise':
                return chem[c[1]]
            return jetons[c]
        if c in jetons:
            return jetons[c]
        if c == CONTOUR:
            return c
        if c in CHEVEUX:
            return hrs[CHEVEUX[c]]
        if c == SOURCILS:
            return melange(hr['c'], hr['d'], 0.5)
        if c in CHEMISE:
            return chem[CHEMISE[c]]
        if c in IRIS:
            return transfert(c, IRIS_MODELE, oeil)
        if c in BLANCS:
            return c
        return transfert(c, PEAU_MODELE, peau['f'])
    return couleur


def portrait(g, d, i):
    p = visage(g)
    COUPES[d['coupe']](p)
    COUVRE_CHEFS[d['chapeau']](p)
    for x in d['details']:
        if x in DETAILS:
            DETAILS[x](p)
    motif(p, d['motif'])
    p.contour()
    couleur = couleurs(d, i)
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for (x, y), c in p.g.items():
        im.putpixel((x, y), couleur(c) + (255,))
    return im


def main():
    base, trait, dedans = lire()
    TRAIT_CASES.update(trait)
    DEDANS.update(dedans)
    for q, c in base.items():
        if classe(c) == 'cheveux' and c != SOURCILS:
            (MECHE if q in dedans or q in trait else CHEVELURE)[q] = c
    images = []
    for i, (nom, d) in enumerate(catalogue.personnages()):
        # (perso_01 : le modèle lui-même)
        im = Image.open(MODELE).convert('RGBA') if nom == MODELE_DE else portrait(base, d, i)
        im.save(os.path.join(DIR, f'{nom}.png'))
        images.append(im)
    print(f'assets/portraits : {len(images)} portraits de {N} × {N} dérivés du modèle')
    if '--apercu' in sys.argv:
        S, M, cols = 4, 6, 10
        rows = (len(images) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (N * S + M) + M, rows * (N * S + M) + M), (230, 214, 180, 255))
        for k, im in enumerate(images):
            sheet.alpha_composite(im.resize((N * S, N * S), Image.NEAREST), (M + (k % cols) * (N * S + M), M + (k // cols) * (N * S + M)))
        sheet.save(os.path.join(ROOT, 'apercu_portraits.png'))


if __name__ == '__main__':
    main()
