# Portraits 32 × 32 des 50 personnages du catalogue (scripts/personnage/catalogue.py,
# perso_01 à perso_50 : assets/portraits/perso_XX.png), dérivés du portrait modèle dessiné à la
# main (scripts/personnage/modeles/portrait.png : la jeune femme aux cheveux châtains et au
# chemisier vert, perso_01).
#
# Chaque couleur du modèle a un rôle (ROLES : contour, cheveux, sourcils, peau, iris, blanc de
# l'œil, chemise). Un portrait part du modèle, puis :
#   - la coupe (COUPES) : les mèches longues tombent sur les épaules, les cheveux mi-longs sont
#     ceux du modèle, le carré est coupé au menton, les cheveux courts au-dessus des oreilles (les
#     oreilles apparaissent), la frange couvre le front, les couettes et le chignon partent des
#     cheveux courts, le crâne dégarni n'a plus qu'une couronne ;
#   - le couvre-chef (COUVRE_CHEFS) et les détails (DETAILS : barbe, moustache, lunettes, taches
#     de rousseur, boucles d'oreilles), puis le motif de la chemise ;
#   - les couleurs : la peau et l'iris gardent les nuances du modèle (chaque couleur × la
#     nouvelle teinte / celle du modèle) ; les cheveux, la chemise et les accessoires prennent les
#     couleurs du catalogue.
# Le contour (celui du modèle) n'est refait que là où la silhouette a changé.
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
MODELE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles', 'portrait.png')
MODELE_DE = 'perso_01'          # le personnage que le modèle représente
N = 32

CONTOUR = (51, 39, 23)
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
    im = Image.open(MODELE).convert('RGBA')
    return {(x, y): im.getpixel((x, y))[:3] for y in range(N) for x in range(N) if im.getpixel((x, y))[3]}


# Les couleurs « jetons » (posées par les coupes, couvre-chefs et détails, résolues à la fin)
B, C, L = ('cheveux', 'b'), ('cheveux', 'c'), ('cheveux', 'l')
PEAU, PEAU_OMBRE = PEAU_MODELE, (230, 156, 95)
A1, A2, A3 = ('acc', 1), ('acc', 2), ('acc', 3)                 # l'accessoire, son ombre, son reflet
P1, P2, P3 = ('paille', 1), ('paille', 2), ('paille', 3)
LUNETTES, ROUSSEUR, OR, COEUR, MOTIF = ('lunettes',), ('rousseur',), ('or',), ('coeur',), ('motif',)


class Portrait:
    def __init__(self, g):
        self.g = dict(g)
        self.touche = set()        # les cases autour desquelles refaire le contour

    def set(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.g[(x, y)] = c
            self.touche.add((x, y))

    def efface(self, x, y):
        if (x, y) in self.g:
            del self.g[(x, y)]
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                self.touche.add((x + dx, y + dy))

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
        xs = [x for (x, yy) in self.peau() if yy == y]
        return (min(xs), max(xs)) if xs else (None, None)

    def contour(self):
        for (x, y) in list(self.g):
            if self.g[(x, y)] != CONTOUR:
                continue
            if not any((x + dx, y + dy) in self.g and self.g[(x + dx, y + dy)] != CONTOUR for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                del self.g[(x, y)]
        for (x, y) in list(self.touche):
            if (x, y) not in self.g or self.g[(x, y)] == CONTOUR:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if 0 <= n[0] < N and 0 <= n[1] < N and n not in self.g:
                    self.g[n] = CONTOUR


# ---------- coupes ----------

def oreilles(p):
    """Les oreilles, au bord du visage (rangées 12 à 15), quand les cheveux ne les cachent plus."""
    for y in range(12, 16):
        x0, x1 = p.bornes_visage(y)
        if x0 is None:
            continue
        for x, o in ((x0 - 1, 1), (x1 + 1, -1)):
            p.set(x, y, PEAU_OMBRE if y in (12, 15) else PEAU)
            if y in (13, 14):
                p.set(x - o, y, PEAU_OMBRE)


def coupe_a(p, y0, oreilles_visibles=True):
    """Coupe les cheveux à partir de la rangée y0 (ce qui pend sur les côtés)."""
    for (x, y) in list(p.g):
        if y >= y0 and p.cls(x, y) == 'cheveux' and p.g[(x, y)] != SOURCILS:
            p.efface(x, y)
    if oreilles_visibles:
        oreilles(p)


def longs(p):
    """Des mèches qui tombent sur les épaules, devant la chemise."""
    for y in range(22, N):
        for x0, x1 in ((3, 8), (23, 28)):
            for x in range(x0, x1 + 1):
                bord = x in (x0, x1)
                if y > 28 and bord:
                    continue
                p.set(x, y, C if (x == x0 and x0 == 3) or (x == x1 and x1 == 28) else (L if (x + y) % 5 == 0 else B))


def carre(p):
    coupe_a(p, 19, oreilles_visibles=False)
    for y in (17, 18):                      # la ligne nette du carré
        for x in range(2, 30):
            if p.cls(x, y) == 'cheveux' and p.g[(x, y)] != SOURCILS:
                p.set(x, y, C)


def frange(p):
    for y in range(6, 10):
        x0, x1 = p.bornes_visage(y)
        if x0 is None:
            continue
        for x in range(x0, x1 + 1):
            p.set(x, y, C if y == 9 else (L if (x + 2 * y) % 4 == 0 else B))


def courts(p):
    coupe_a(p, 12)
    for y in (10, 11):                      # les pattes
        x0, x1 = p.bornes_visage(y)
        if x0 is not None:
            p.set(x0 - 1, y, C)
            p.set(x1 + 1, y, C)


def couettes(p):
    courts(p)
    frange(p)
    for cx in (2, 29):
        for y in range(13, 23):
            r = 2.6 - abs(y - 17.5) * 0.28
            for x in range(cx - 3, cx + 4):
                if abs(x - cx) <= r and 0 <= x < N:
                    p.set(x, y, C if abs(x - cx) > r - 1 else (L if (x + y) % 4 == 0 else B))
        for x in range(cx - 1, cx + 2):                 # le ruban
            p.set(x, 12, A1)
        p.set(cx, 11, A2)


def chignon(p):
    courts(p)
    for y in range(0, 6):
        for x in range(12, 21):
            if (x - 16) ** 2 / 20 + (y - 2.5) ** 2 / 7 <= 1:
                p.set(x, y, C if x >= 19 or y == 5 else (L if (x + y) % 4 == 0 else B))


def chauve(p):
    coupe_a(p, 16)
    for (x, y) in list(p.g):
        if y <= 8 and p.cls(x, y) == 'cheveux' and p.g[(x, y)] != SOURCILS:
            p.set(x, y, PEAU)
    for (x, y) in list(p.g):                            # l'ombre du crâne, à droite
        if y <= 8 and p.g[(x, y)] == PEAU and (x + 1, y) not in p.g or (p.g.get((x, y)) == PEAU and p.g.get((x + 1, y)) == CONTOUR):
            p.set(x, y, PEAU_OMBRE)
    for x, y in ((12, 3), (13, 3), (12, 4)):           # un reflet
        p.set(x, y, (250, 214, 184))
    for y in range(9, 16):                              # la couronne au-dessus des oreilles
        x0, x1 = p.bornes_visage(y)
        if x0 is not None and y < 12:
            p.set(x0 - 1, y, C)
            p.set(x1 + 1, y, C)


COUPES = {
    'longs': longs, 'mi': lambda p: None, 'carre': carre, 'courts': courts,
    'frange': lambda p: (frange(p), longs(p)), 'frange_carre': lambda p: (carre(p), frange(p)),
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


def portrait(base, d, i):
    p = Portrait(base)
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
    base = lire()
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
