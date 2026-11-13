# Les bâtiments des projets du village (le chantier « l'île à bâtir », fiche I8a : data/village.json VOCATIONS.village
# PROJETS ; data/recipes.json ATELIER.BLOCS lavoir, kiosque, fontaine_village, four_commun) et les lampions de la fête
# du village (js/carte/ferme/fete.js). Vus de haut à 45° (CLAUDE.md), chacun en deux états : en chantier
# (meuble_<nom>_chantier : à moitié monté, un échafaudage, une pile de matériaux) puis achevé (meuble_<nom>).
#
# Comment c'est dessiné : chaque bâtiment est fait de volumes simples (des pavés, des cylindres, des prismes
# octogonaux, des toits en pointe ou à deux pans, des dômes, des creux qu'on y taille), posés dans un petit monde en
# pixels (x de gauche à droite, y la hauteur, z de l'avant vers le fond). Chaque pixel de l'image regarde ce monde
# selon la projection de la carte (scripts/carte/blocs.py) : une hauteur de h px se voit sur h × HAUT (14/16) rangées,
# une profondeur de p px sur p × FOND (10/16) ; le premier volume touché, de l'avant vers le fond, donne sa matière et
# la direction de sa surface. On voit donc le dessus ET la face avant de tout (le plateau du kiosque, la margelle du
# lavoir, l'eau, le seuil du four), et l'intérieur des ouvertures (la gueule du four : sa sole, plus claire vers
# l'avant, sa paroi gauche éclairée, la droite dans l'ombre). Le bas de l'image est l'avant de la case du bas.
#
# Les nuances (CLAUDE.md, règle 5) : chaque matière a plusieurs rampes proches (scripts/carte/nuances.py, 160 tons),
# tirées par élément (chaque pierre, planche, tuile, lampion) ; chaque élément a son biseau (le haut et la gauche plus
# clairs, le bas et la droite plus sombres) et un grain fixe ; la lumière vient d'en haut à gauche ; les ombres
# tirent vers le froid, les lumières vers le chaud (les rampes glissent de teinte) ; l'occlusion assombrit les angles,
# le dessous de ce qui avance et le pied des murs ; les braises du four teintent sa gueule. Un contour sombre d'un
# pixel. Pas d'ombre portée : ce sont des blocs de la ferme (la scène peint celle du soleil).
#
#   python3 scripts/batiments/projets_village.py            écrit assets/meuble_<bâtiment>[_chantier].png et
#                                                         assets/fete_lampions.png ; dit les couleurs comptées
#   python3 scripts/batiments/projets_village.py --apercu   écrit aussi apercu_projets_village.png (agrandi, sur l'herbe)
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

HAUT, FOND = 14 / 16, 10 / 16
OUT = (30, 24, 26)
PAS = 0.2                      # px de profondeur entre deux essais du rayon
LUMIERE = np.array([-0.52, 0.74, -0.42])
LUMIERE = LUMIERE / np.linalg.norm(LUMIERE)


# ---------- les rampes ----------

def famille(cles, n=4, ecart=10, s=0):
    """`n` rampes proches de la même matière : la teinte et le ton de chacune glissent un peu (chaque élément tire la
    sienne)."""
    out = []
    for k in range(n):
        dr, dg, db = (bruit(k, 1, s) * ecart, bruit(k, 2, s) * ecart * 0.8, bruit(k, 3, s) * ecart)
        f = lambda i: (i + 1) / len(cles)  # noqa: E731
        out.append(rampe([tuple(max(0, min(255, c[j] + d * f(i))) for j, d in enumerate((dr, dg, db))) for i, c in enumerate(cles)], 160))
    return out


PIERRE = famille([(44, 46, 62), (84, 84, 92), (128, 122, 118), (170, 160, 146), (206, 196, 176), (236, 228, 208)], 5, 14, 1)
PIERRE_CLAIRE = famille([(70, 70, 86), (120, 116, 118), (168, 160, 150), (206, 198, 182), (232, 224, 206), (250, 244, 228)], 4, 10, 2)
PAVE = famille([(48, 44, 56), (92, 84, 86), (140, 126, 116), (182, 166, 146), (214, 198, 174), (238, 226, 204)], 4, 12, 3)
BOIS = famille([(36, 22, 26), (72, 44, 36), (114, 72, 48), (156, 106, 68), (196, 144, 94), (230, 186, 132)], 5, 12, 4)
BOIS_PEINT = famille([(70, 74, 92), (130, 132, 140), (182, 180, 176), (220, 214, 202), (240, 234, 220), (252, 248, 236)], 3, 8, 5)
PLANCHER = famille([(44, 28, 28), (86, 56, 42), (132, 92, 60), (172, 128, 84), (208, 166, 112), (236, 204, 150)], 5, 14, 6)
TUILE = famille([(58, 26, 34), (106, 42, 38), (156, 64, 44), (196, 98, 62), (226, 138, 88), (246, 184, 136)], 5, 14, 7)
ZINC = famille([(22, 42, 52), (34, 72, 78), (52, 108, 102), (82, 146, 128), (128, 184, 158), (190, 222, 196)], 4, 10, 8)
CHAUME = famille([(52, 40, 34), (98, 76, 52), (144, 112, 68), (184, 150, 90), (214, 186, 120), (238, 218, 160)], 4, 10, 9)
TORCHIS = famille([(64, 46, 46), (118, 86, 70), (168, 126, 92), (204, 164, 118), (228, 198, 150), (246, 228, 190)], 4, 10, 10)
EAU = rampe([(18, 40, 70), (28, 70, 108), (44, 108, 148), (78, 152, 188), (136, 200, 222), (210, 240, 248)], 160)
CUIVRE = rampe([(52, 24, 22), (104, 50, 30), (160, 88, 44), (206, 132, 70), (236, 180, 112), (255, 228, 176)], 140)
FER = rampe([(18, 20, 28), (42, 44, 54), (74, 76, 84), (112, 112, 118), (156, 156, 160), (206, 206, 206)], 120)
BRAISE = rampe([(70, 16, 18), (140, 36, 22), (206, 78, 28), (246, 140, 44), (255, 204, 96), (255, 244, 196)], 140)
SUIE = rampe([(14, 10, 16), (32, 22, 26), (56, 36, 34), (86, 54, 42), (120, 76, 52)], 100)
CORDE = rampe([(54, 40, 30), (102, 80, 56), (150, 124, 86), (196, 170, 124), (228, 210, 168)], 100)
OR = rampe([(80, 52, 20), (140, 100, 36), (196, 152, 62), (234, 200, 110), (255, 244, 196)], 120)
LAMPIONS = [rampe([(80, 14, 30), (150, 30, 40), (210, 60, 52), (240, 112, 84), (255, 178, 140)], 140),
            rampe([(100, 56, 10), (176, 110, 20), (232, 170, 40), (250, 214, 92), (255, 244, 176)], 140),
            rampe([(18, 36, 90), (34, 74, 150), (62, 118, 200), (110, 168, 230), (178, 214, 250)], 140),
            rampe([(18, 60, 34), (36, 108, 52), (66, 156, 72), (116, 196, 104), (184, 232, 160)], 140),
            rampe([(100, 34, 12), (176, 72, 20), (230, 120, 40), (250, 168, 80), (255, 216, 152)], 140),
            rampe([(70, 20, 70), (130, 40, 120), (186, 74, 168), (224, 128, 206), (250, 196, 236)], 140)]
LAMPIONS_ALLUMES = [rampe([(150, 40, 40), (220, 90, 60), (250, 150, 96), (255, 210, 150), (255, 244, 214)], 140),
                    rampe([(190, 120, 30), (240, 180, 60), (255, 220, 120), (255, 242, 190), (255, 252, 232)], 140),
                    rampe([(70, 100, 170), (120, 160, 220), (170, 204, 245), (214, 232, 255), (244, 250, 255)], 140),
                    rampe([(60, 130, 70), (110, 190, 110), (170, 226, 150), (214, 246, 200), (244, 255, 236)], 140),
                    rampe([(190, 90, 30), (240, 140, 60), (255, 190, 110), (255, 226, 170), (255, 248, 226)], 140),
                    rampe([(150, 60, 140), (210, 110, 196), (240, 166, 228), (252, 210, 246), (255, 240, 252)], 140)]


# ---------- les volumes ----------

class Vol:
    """Un volume : sa matière, son élément (pour tirer sa rampe) ; `creux` : ce qu'on y taille (ouvertures, bassins)."""

    def __init__(self, mat, creux=(), **o):
        self.mat, self.creux, self.o = mat, list(creux), o

    def dedans(self, X, Y, Z):
        m = self.forme(X, Y, Z)
        for c in self.creux:
            m = m & ~c.forme(X, Y, Z)
        return m

    def dans_creux(self, x, y, z, marge=1.2):
        return any(c.forme(np.array([x, x - marge, x + marge, x, x]), np.array([y, y, y, y + marge, y]), np.array([z, z, z, z, z - marge])).any() for c in self.creux)


class Pave(Vol):
    def __init__(self, mat, x0, x1, y0, y1, z0, z1, **o):
        super().__init__(mat, **o)
        self.b = (x0, x1, y0, y1, z0, z1)

    def forme(self, X, Y, Z):
        x0, x1, y0, y1, z0, z1 = self.b
        return (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1) & (Z >= z0) & (Z < z1)


class Cylindre(Vol):
    """Debout : son axe vertical en (cx, cz), de y0 à y1."""

    def __init__(self, mat, cx, cz, r, y0, y1, **o):
        super().__init__(mat, **o)
        self.b = (cx, cz, r, y0, y1)

    def forme(self, X, Y, Z):
        cx, cz, r, y0, y1 = self.b
        return ((X - cx) ** 2 + (Z - cz) ** 2 <= r * r) & (Y >= y0) & (Y < y1)


class Buche(Vol):
    """Couché, de l'avant vers le fond : son axe en (cx, cy), de z0 à z1 (une bûche, un goulot)."""

    def __init__(self, mat, cx, cy, r, z0, z1, **o):
        super().__init__(mat, **o)
        self.b = (cx, cy, r, z0, z1)

    def forme(self, X, Y, Z):
        cx, cy, r, z0, z1 = self.b
        return ((X - cx) ** 2 + (Y - cy) ** 2 <= r * r) & (Z >= z0) & (Z < z1)


class Octo(Vol):
    """Un prisme octogonal debout (son apothème r), de y0 à y1 ; `pointe` : il se rétrécit jusqu'à rien en y1 (un toit
    en pointe) ; `r1` : son apothème en haut."""

    def __init__(self, mat, cx, cz, r, y0, y1, r1=None, **o):
        super().__init__(mat, **o)
        self.b = (cx, cz, r, y0, y1, r if r1 is None else r1)

    def forme(self, X, Y, Z):
        cx, cz, r, y0, y1, r1 = self.b
        t = np.clip((Y - y0) / max(1e-6, y1 - y0), 0, 1)
        rr = r + (r1 - r) * t
        dx, dz = np.abs(X - cx), np.abs(Z - cz)
        return (dx <= rr) & (dz <= rr) & (dx + dz <= rr * math.sqrt(2) * 1.0824) & (Y >= y0) & (Y < y1)


class Pignon(Vol):
    """Un toit à deux pans, le faîte de gauche à droite (en z = cz), de x0 à x1 : sa demi-largeur `demi` au bas (y0),
    rien au faîte (y0 + h)."""

    def __init__(self, mat, x0, x1, cz, demi, y0, h, epais=None, **o):
        super().__init__(mat, **o)
        self.b = (x0, x1, cz, demi, y0, h, epais)

    def forme(self, X, Y, Z):
        x0, x1, cz, demi, y0, h, ep = self.b
        lim = demi * (1 - (Y - y0) / h)
        m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y0 + h) & (np.abs(Z - cz) <= lim)
        if ep:
            m &= ~((np.abs(Z - cz) <= lim - ep) & (Y >= y0) & (X >= x0 + 1) & (X < x1 - 1) & (Y < y0 + h - ep))
        return m


class Dome(Vol):
    """La moitié haute d'un ellipsoïde (un four, une coupole), de base y0."""

    def __init__(self, mat, cx, cz, rx, rz, ry, y0, **o):
        super().__init__(mat, **o)
        self.b = (cx, cz, rx, rz, ry, y0)

    def forme(self, X, Y, Z):
        cx, cz, rx, rz, ry, y0 = self.b
        return (((X - cx) / rx) ** 2 + ((Z - cz) / rz) ** 2 + ((Y - y0) / ry) ** 2 <= 1) & (Y >= y0)


class Boule(Vol):
    def __init__(self, mat, cx, cy, cz, rx, ry=None, rz=None, **o):
        super().__init__(mat, **o)
        self.b = (cx, cy, cz, rx, ry or rx, rz or rx)

    def forme(self, X, Y, Z):
        cx, cy, cz, rx, ry, rz = self.b
        return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2 <= 1


class Arche(Vol):
    """Une ouverture voûtée, taillée d'avant en arrière : de x0 à x1, du sol y0 au haut de l'arc y1, de z0 à z1."""

    def __init__(self, mat, x0, x1, y0, y1, z0, z1, **o):
        super().__init__(mat, **o)
        self.b = (x0, x1, y0, y1, z0, z1)

    def forme(self, X, Y, Z):
        x0, x1, y0, y1, z0, z1 = self.b
        cx, r = (x0 + x1) / 2, (x1 - x0) / 2
        ys = y1 - r
        dans = (X >= x0) & (X < x1) & (Y >= y0) & (Z >= z0) & (Z < z1)
        return dans & ((Y < ys) | ((X - cx) ** 2 + (Y - ys) ** 2 <= r * r))


class Coupe(Vol):
    """Un volume coupé à la hauteur `y` (le chantier : ce qui est déjà monté)."""

    def __init__(self, v, y):
        super().__init__(v.mat, **v.o)
        self.v, self.y, self.creux = v, y, []

    def forme(self, X, Y, Z):
        return self.v.dedans(X, Y, Z) & (Y < self.y)

    def dans_creux(self, x, y, z, marge=1.2):
        return self.v.dans_creux(x, y, z, marge)


# ---------- le rendu ----------

def rendu(vols, W, H, prof, matieres, lumiere=None, nom=''):
    """L'image W × H du monde `vols` (de l'avant, z = 0, au fond, z = prof), ses matières (fonctions qui donnent la
    couleur d'un point vu). → une image RGBA (sans contour)."""
    rows, cols = np.mgrid[0:H, 0:W]
    X = cols + 0.5
    touche = np.full((H, W), -1)
    hy = np.zeros((H, W))
    hz = np.zeros((H, W))
    z = 0.0
    while z <= prof + 1e-6:
        Y = (H - (rows + 0.5) - FOND * z) / HAUT
        libre = (touche < 0) & (Y >= 0)
        if not libre.any():
            if (Y < 0).all():
                break
        for i, v in enumerate(vols):
            m = libre & v.dedans(X, Y, np.full_like(Y, z))
            if m.any():
                touche[m] = i
                hy[m] = Y[m]
                hz[m] = z
                libre &= ~m
        z += PAS
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    tous = lambda x, y, z: any(v.dedans(np.array([x]), np.array([y]), np.array([z]))[0] for v in vols)  # noqa: E731
    for r in range(H):
        for c in range(W):
            i = touche[r, c]
            if i < 0:
                continue
            v = vols[i]
            x, y, z = c + 0.5, hy[r, c], hz[r, c]
            n = normale(v, x, y, z)
            cav = v.dans_creux(x, y, z)
            # la lumière : le dessus le plus clair, le bord gauche éclairé (dans une ouverture : la paroi gauche)
            nx = -n[0] if cav else n[0]
            d = max(0.0, -0.52 * nx + 0.74 * n[1] - 0.42 * n[2])
            lum = 0.18 + 0.86 * d
            # l'occlusion : ce qui l'entoure (les angles, sous ce qui avance, le pied des murs)
            occ = 0
            for k, (ox, oy, oz) in enumerate(((0, 1.6, 0), (-1.4, 0.8, 0), (1.4, 0.8, 0), (0, 0.8, 1.4), (0, 1.8, -1.2), (0.9, 2.6, 0.9))):
                q = (x + ox + n[0] * 0.8, y + oy * (1 if n[1] >= -0.2 else -1) + n[1] * 0.8, z + oz + n[2] * 0.8)
                if tous(*q):
                    occ += 1
            lum -= 0.055 * occ
            if n[1] < 0.5:
                lum -= 0.16 * max(0.0, (2.2 - y) / 2.2)        # au pied
            if cav:
                lum -= 0.12
            ctx = {'x': x, 'y': y, 'z': z, 'n': n, 'cav': cav, 'lum': lum, 'v': v, 'r': r, 'c': c}
            col = matieres[v.mat](ctx)
            if lumiere:
                col = lumiere(ctx, col)
            px[c, r] = tuple(int(max(0, min(255, round(k)))) for k in col[:3]) + (255,)
    return im


def normale(v, x, y, z, e=0.9):
    """La direction de la surface du volume `v` en (x, y, z) : vers le vide (de quoi l'éclairer)."""
    def o(a, b, c):
        return 1.0 if v.dedans(np.array([a]), np.array([b]), np.array([c]))[0] else 0.0
    n = np.array([o(x - e, y, z) - o(x + e, y, z), o(x, y - e, z) - o(x, y + e, z), o(x, y, z - e) - o(x, y, z + e)])
    if not n.any():
        n = np.array([o(x - 2 * e, y, z) - o(x + 2 * e, y, z), o(x, y - 2 * e, z) - o(x, y + 2 * e, z), o(x, y, z - 2 * e) - o(x, y, z + 2 * e)])
    if not n.any():
        n = np.array([0.0, 0.0, -1.0]) if o(x, y + 0.5, z) else np.array([0.0, 1.0, 0.0])
    return n / np.linalg.norm(n)


# ---------- les matières ----------

def face(ctx):
    """'dessus' (une surface tournée vers le haut), 'avant', ou 'pente' (un toit)."""
    n = ctx['n']
    return 'dessus' if n[1] > 0.8 else 'avant' if n[1] < 0.35 else 'pente'


def uv(ctx):
    """Les coordonnées de la surface vue : (u vers la droite, v vers le haut de l'image)."""
    x, y, z = ctx['x'], ctx['y'], ctx['z']
    f = face(ctx)
    if f == 'dessus':
        return x, z
    if f == 'avant':
        n = ctx['n']
        # (une face tournée de biais : on la déroule)
        return x + (z if abs(n[0]) > 0.6 else 0) * (1 if n[0] < 0 else -1), y
    return x, y * HAUT + z * FOND


def appareil(u, v, hl, lg, decal=0.5):
    """Un appareil de blocs (des rangées de `hl`, des blocs de `lg`, décalés d'une rangée à l'autre) : (rangée, bloc,
    fu, fv : la place dans le bloc de 0 à 1, joint : sur un joint)."""
    rg = math.floor(v / hl)
    uu = u + (decal * lg if rg % 2 else 0)
    bl = math.floor(uu / lg)
    fu, fv = uu / lg - bl, v / hl - rg
    joint = fu < 0.6 / lg or fv < 0.6 / hl
    return rg, bl, fu, fv, joint


def biseau(fu, fv, k=0.16):
    """Le modelé d'un élément : le haut et la gauche plus clairs, le bas et la droite plus sombres."""
    return k * (fv - 0.5) - k * 0.7 * (fu - 0.5) + (0.06 if fv > 0.82 else 0) - (0.06 if fu > 0.86 else 0)


def pierre(familles=PIERRE, hl=4.0, lg=7.0, s=0):
    def f(ctx):
        u, v = uv(ctx)
        rg, bl, fu, fv, joint = appareil(u, v, hl, lg)
        R = familles[int((bruit(bl, rg, 11 + s) + 1) * 997) % len(familles)]
        lum = ctx['lum'] + 0.07 * bruit(bl, rg, 12 + s) + biseau(fu, fv) + 0.035 * bruit(int(u * 2), int(v * 2), 13 + s)
        if joint:
            lum -= 0.22
        return ton(R, lum)
    return f


def planches(familles=PLANCHER, larg=3.0, sens='x', s=0):
    def f(ctx):
        u, v = uv(ctx)
        a, b = (u, v) if sens == 'x' else (v, u)
        k = math.floor(b / larg)
        fb = b / larg - k
        R = familles[int((bruit(k, 7, 21 + s) + 1) * 991) % len(familles)]
        bout = math.floor((a + 11 * bruit(k, 3, 22 + s) + 40) / 13)
        lum = ctx['lum'] + 0.06 * bruit(k, bout, 23 + s) + 0.13 * (fb - 0.5) * (1 if sens == 'x' else -1)
        lum += 0.04 * bruit(int(a * 1.5), k, 24 + s)        # le fil du bois
        if fb < 0.22 or (abs(((a + 11 * bruit(k, 3, 22 + s) + 40) / 13) - bout) < 0.08):
            lum -= 0.18
        return ton(R, lum)
    return f


def bois(familles=BOIS, s=0):
    def f(ctx):
        x, y, z = ctx['x'], ctx['y'], ctx['z']
        k = int(math.floor(x / 2) * 7 + math.floor(z / 2) * 3)
        R = familles[abs(k) % len(familles)]
        lum = ctx['lum'] + 0.05 * bruit(int(x * 3), int(y / 3), 31 + s) - 0.05 * (int(y * 1.3 + x) % 5 == 0)
        return ton(R, lum)
    return f


def tuiles(familles=TUILE, s=0):
    """Des tuiles en rangées (chacune son ton, son arrondi : le haut clair, le bas qui ombre la rangée d'en dessous)."""
    def f(ctx):
        x, y, z = ctx['x'], ctx['y'], ctx['z']
        v = y * HAUT + z * FOND
        rg = math.floor(v / 2.6)
        uu = x + (1.5 if rg % 2 else 0)
        bl = math.floor(uu / 3)
        fu, fv = uu / 3 - bl, v / 2.6 - rg
        R = familles[int((bruit(bl, rg, 41 + s) + 1) * 983) % len(familles)]
        lum = ctx['lum'] + 0.06 * bruit(bl, rg, 42 + s) + 0.18 * (fv - 0.5) - 0.12 * abs(fu - 0.5)
        if fv < 0.25:
            lum -= 0.16
        return ton(R, lum)
    return f


def zinc(familles=ZINC, nb=16, cx=24.0, cz=24.0, s=0):
    """Un toit de zinc vert-de-gris à côtes, en rayons depuis la pointe (le kiosque)."""
    def f(ctx):
        x, z = ctx['x'], ctx['z']
        a = (math.atan2(z - cz, x - cx) / (2 * math.pi)) * nb
        k = math.floor(a)
        fa = a - k
        R = familles[int((bruit(k, 1, 51 + s) + 1) * 977) % len(familles)]
        lum = ctx['lum'] + 0.05 * bruit(k, int(ctx['y'] / 3), 52 + s) + 0.12 * (0.5 - abs(fa - 0.5)) * 2 - 0.06
        if fa < 0.12:
            lum += 0.14                                   # la côte, au soleil
        return ton(R, lum)
    return f


def unie(R, grain=0.03, s=0):
    def f(ctx):
        return ton(R, ctx['lum'] + grain * bruit(int(ctx['x'] * 2), int(ctx['y'] * 2 + ctx['z']), 61 + s))
    return f


def eau(cx, cz, rx, rz):
    """L'eau vue d'en haut : claire au bord (le reflet de la margelle, l'écume), plus sombre au large, des rides."""
    def f(ctx):
        x, z = ctx['x'], ctx['z']
        d = math.sqrt(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2)
        lum = 0.42 + 0.30 * max(0.0, d - 0.55) / 0.45 + 0.05 * bruit(int(x), int(z), 71)
        if (int(x * 0.7 + z * 1.3) % 7 == 0) and d < 0.85:
            lum += 0.18                                   # une ride, au soleil
        if d > 0.94:
            lum += 0.16                                   # l'écume contre la pierre
        lum -= 0.10 * max(0.0, (z - cz) / rz)             # plus sombre vers le fond (l'ombre de la margelle)
        return ton(EAU, lum)
    return f


def torchis(ctx):
    """Le dôme du four : un enduit d'argile chaude, des pierres prises dedans, plus sombre en bas (l'occlusion)."""
    x, y, z = ctx['x'], ctx['y'], ctx['z']
    k = int(math.floor(x / 5) * 13 + math.floor(y / 4) * 7)
    R = TORCHIS[abs(k) % len(TORCHIS)]
    lum = ctx['lum'] + 0.05 * bruit(int(x * 2), int(y * 2 + z), 81)
    if bruit(int(x / 3), int((y + z) / 3), 82) > 0.72:
        return ton(PIERRE[abs(k) % len(PIERRE)], lum + 0.02)
    return ton(R, lum)


# ---------- les bâtiments ----------

def kiosque(chantier=False):
    W, H, P = 48, 64, 48
    cx, cz = 24.0, 25.0
    base = Octo('pierre', cx, cz, 21, 0, 6)
    marche = Pave('pierre_claire', 18, 30, 0, 3, 0.5, 5)
    plateau = Octo('plancher', cx, cz, 20.2, 6, 6.8)
    poteaux = [Cylindre('poteau', cx + 17.4 * math.cos(a), cz + 17.4 * math.sin(a), 1.25, 6.8, 31) for a in [k * math.pi / 4 + math.pi / 8 for k in range(8)]]
    # (le garde-corps : un anneau ajouré, ouvert devant, entre les poteaux)
    class GardeCorps(Vol):
        def forme(self, X, Y, Z):
            dx, dz = X - cx, Z - cz
            d = np.maximum(np.maximum(np.abs(dx), np.abs(dz)), (np.abs(dx) + np.abs(dz)) / (math.sqrt(2) * 1.0824))
            ang = np.arctan2(dz, dx)
            anneau = (d >= 16.6) & (d <= 17.9) & (Y >= 6.8) & (Y < 12)
            devant = (np.abs(dx) < 5.5) & (dz < 0)
            barreau = (np.mod(ang * 52 / (2 * math.pi), 1.0) < 0.42) | (Y >= 10.8) | (Y < 7.6)
            return anneau & ~devant & barreau
    garde = GardeCorps('peint')
    corniche = Octo('peint', cx, cz, 22.6, 30.4, 32.4)
    frise = Octo('frise', cx, cz, 22.0, 29.0, 30.4, creux=[Octo('x', cx, cz, 20.4, 28, 31)])
    toit = Octo('zinc', cx, cz, 23.4, 32.4, 47.5, r1=0.6)
    lanterneau = Octo('peint', cx, cz, 2.6, 46.0, 49.5)
    epi = Boule('or', cx, 51.2, cz, 1.6)
    hampe = Cylindre('fer', cx, cz, 0.45, 49.5, 56)
    vols = [epi, hampe, lanterneau, toit, corniche, frise, garde, *poteaux, plateau, base, marche]
    if chantier:
        coupe = 18.0
        vols = [Coupe(v, coupe) for v in [*poteaux]] + [plateau, base, marche]
        # (l'échafaudage : deux perches et une traverse, à gauche ; une pile de planches et de tuiles, devant à droite)
        vols = [Pave('perche', 2.0, 3.6, 0, 30, 9.0, 10.6), Pave('perche', 2.0, 3.6, 0, 30, 30.0, 31.6), Pave('perche', 2.0, 3.6, 22, 23.4, 9.0, 31.6),
                Pave('planche_pile', 33, 45, 0, 1.6, 1.0, 7.0), Pave('planche_pile', 34, 46, 1.6, 3.2, 1.5, 6.5), Pave('planche_pile', 33.5, 45, 3.2, 4.8, 2.0, 7.0),
                Pave('tuiles_pile', 4, 11, 0, 4.5, 1.0, 6.0)] + vols
    mats = {
        'pierre': pierre(PIERRE, 3.0, 6.0), 'pierre_claire': pierre(PIERRE_CLAIRE, 1.5, 6.0, 3), 'plancher': planches(PLANCHER, 2.6, 'x'),
        'poteau': unie(BOIS_PEINT[0], 0.03), 'peint': unie(BOIS_PEINT[1], 0.035, 2), 'frise': frise_kiosque(cx, cz), 'zinc': zinc(ZINC, 16, cx, cz),
        'or': unie(OR, 0.05), 'fer': unie(FER), 'perche': bois(BOIS), 'planche_pile': planches(PLANCHER, 1.6, 'x', 5), 'tuiles_pile': tuiles(TUILE, 2),
    }
    return rendu(vols, W, H, P, mats)


def frise_kiosque(cx, cz):
    """La frise sous la corniche : des festons peints, crème et vert, chacun son ton."""
    def f(ctx):
        a = math.atan2(ctx['z'] - cz, ctx['x'] - cx) * 24 / (2 * math.pi)
        k = math.floor(a)
        feston = (ctx['y'] - 29.0) > 0.7 + 0.7 * abs(math.sin((a - k) * math.pi))
        R = BOIS_PEINT[k % len(BOIS_PEINT)] if feston else ZINC[k % len(ZINC)]
        return ton(R, ctx['lum'] + (0.08 if feston else -0.04) + 0.04 * bruit(k, 1, 91))
    return f


def lavoir(chantier=False):
    W, H, P = 48, 54, 32
    bassin = Pave('pierre', 6, 42, 0, 7, 3, 25, creux=[Pave('x', 9, 39, 2, 9, 6, 22)])
    eau_ = Pave('eau', 9, 39, 2, 5.2, 6, 22)
    pierres = Pave('pierre_laver', 9, 39, 5.6, 7.4, 3, 6.4)        # (la pierre à laver, devant, en pente douce)
    poteaux = [Pave('poteau', x0, x0 + 2.2, 0, 27, z0, z0 + 2.2) for x0 in (3.4, 42.4) for z0 in (4.0, 25.5)]
    sabliere = [Pave('poutre', 2.4, 45.6, 25.5, 27.5, z0 - 0.4, z0 + 2.6) for z0 in (4.0, 25.5)]
    toit = Pignon('tuile', 0.5, 47.5, 15.0, 16.5, 26.5, 11.5)
    vols = [toit, *sabliere, *poteaux, pierres, eau_, bassin]
    # (un battoir de bois et un panier de linge, posés sur la margelle)
    vols += [Pave('poteau', 12, 16, 7, 7.8, 3.6, 5.2), Boule('panier', 37.0, 8.8, 4.8, 3.2, 2.2, 2.4)]
    if chantier:
        vols = [Coupe(p, 14) for p in poteaux] + [pierres, Coupe(bassin, 7)] + [
            Pave('perche', 1.0, 2.4, 0, 26, 14.0, 15.4), Pave('perche', 45.6, 47.0, 0, 26, 14.0, 15.4), Pave('perche', 1.0, 47.0, 20.5, 21.7, 14.0, 15.4),
            Pave('planche_pile', 18, 30, 7, 8.4, 9, 13), Pave('pierres_pile', 30, 40, 7, 10, 10, 18)]
    mats = {
        'pierre': pierre(PIERRE, 3.2, 6.5, 2), 'pierre_laver': pierre(PIERRE_CLAIRE, 2.0, 8.0, 5), 'eau': eau(24, 14, 15, 8),
        'poteau': bois(BOIS, 1), 'poutre': planches(BOIS, 2.0, 'x', 2), 'tuile': tuiles(TUILE),
        'panier': unie(CHAUME[1], 0.08, 3), 'perche': bois(BOIS, 3), 'planche_pile': planches(PLANCHER, 1.4, 'x', 4),
        'pierres_pile': pierre(PIERRE, 2.0, 3.0, 7),
    }
    return rendu(vols, W, H, P, mats)


def fontaine(chantier=False):
    W, H, P = 32, 50, 32
    cx, cz = 16.0, 17.0
    bassin = Octo('pierre', cx, cz, 14.2, 0, 6, creux=[Octo('x', cx, cz, 11.6, 1.8, 8)])
    eau_ = Octo('eau', cx, cz, 11.6, 1.8, 5.0)
    socle = Pave('pierre_claire', 12.5, 19.5, 0, 6.4, 13.5, 20.5)
    pilier = Pave('pierre_claire', 13.5, 18.5, 6.4, 21, 14.5, 19.5)
    chapiteau = Pave('pierre_claire', 12.2, 19.8, 21, 23, 13.2, 20.8)
    vasque = Octo('pierre_claire', cx, cz, 4.4, 23, 25.5, creux=[Octo('x', cx, cz, 3.2, 24, 27)])
    boule = Boule('cuivre', cx, 27.2, cz, 1.9)
    goulots = [Buche('cuivre', cx, 15.0, 0.75, 11.6, 14.5), Pave('cuivre', 9.6, 13.5, 14.3, 15.6, cz - 0.7, cz + 0.7), Pave('cuivre', 18.5, 22.4, 14.3, 15.6, cz - 0.7, cz + 0.7)]
    filets = [Pave('filet', cx - 0.5, cx + 0.5, 5.0, 15.0, 11.4, 11.9), Pave('filet', 9.4, 10.2, 5.0, 14.4, cz - 0.4, cz + 0.4), Pave('filet', 21.8, 22.6, 5.0, 14.4, cz - 0.4, cz + 0.4)]
    vols = [boule, vasque, chapiteau, *goulots, *filets, pilier, socle, eau_, bassin]
    if chantier:
        vols = [Coupe(bassin, 4.0), Coupe(pilier, 12), socle,
                Pave('pierres_pile', 2, 9, 0, 3.5, 1.0, 5.0), Cylindre('seau', 26.0, 4.0, 2.2, 0, 4.0, creux=[Cylindre('x', 26.0, 4.0, 1.5, 1.0, 5.0)]),
                Pave('perche', 23.5, 24.7, 0, 24, 22.0, 23.2), Pave('corde', 16, 24, 22, 22.8, 22.2, 22.8)]
    mats = {
        'pierre': pierre(PIERRE, 3.0, 5.5, 4), 'pierre_claire': pierre(PIERRE_CLAIRE, 2.2, 4.0, 6), 'eau': eau(cx, cz, 11.6, 11.6),
        'cuivre': unie(CUIVRE, 0.05), 'filet': lambda c: ton(EAU, 0.78 + 0.12 * bruit(int(c['y'] * 2), 1, 99)),
        'pierres_pile': pierre(PIERRE, 1.8, 2.6, 8), 'seau': planches(BOIS, 1.5, 'y', 6), 'perche': bois(BOIS, 5), 'corde': unie(CORDE, 0.05),
    }
    return rendu(vols, W, H, P, mats)


def four(chantier=False):
    W, H, P = 32, 50, 32
    cx, cz = 16.0, 18.0
    socle = Pave('pierre', 2, 30, 0, 8, 4, 30)
    dessus = Pave('dalle', 2.5, 29.5, 8, 8.6, 4.5, 29.5)
    gueule = Arche('x', 12.4, 19.6, 8.6, 16.4, 0, 16)
    dome = Dome('torchis', cx, cz, 12.5, 11.5, 14, 8.6, creux=[gueule, Dome('x', cx, cz, 9.8, 8.8, 11, 8.6)])
    arc = Arche('voussoir', 11.2, 20.8, 8.6, 17.6, 6.0, 8.2, creux=[gueule])
    sole = Pave('sole', 12.4, 19.6, 8.0, 8.6, 6.0, 26)
    braises = Pave('braise', 13.6, 18.4, 8.6, 9.6, 14.0, 22)
    cheminee = Cylindre('pierre_claire', 22.5, 24.0, 2.3, 16, 30.5, creux=[Cylindre('x', 22.5, 24.0, 1.3, 26, 32)])
    # (les bûches, rangées contre le flanc gauche : leurs bouts ronds devant, le fil du bois en rayons)
    buches = [Buche('buche', 4.6 + 2.4 * i + (1.2 if r % 2 else 0), 9.8 + 2.1 * r, 1.15, 5.0, 12.0) for r in range(3) for i in range(3 - r)]
    pelle = Pave('poteau', 25.5, 26.3, 8.6, 24, 6.5, 7.3)
    vols = [*buches, pelle, cheminee, arc, braises, sole, dome, dessus, socle]
    if chantier:
        vols = [Coupe(dome, 15.0), Coupe(arc, 15.0), sole, dessus, socle,
                Pave('cintre', 12.4, 19.6, 8.6, 9.6, 2.0, 14.0), Pave('pierres_pile', 23, 30, 8.6, 12, 5.0, 10.0), Pave('pierres_pile', 2.5, 9, 0, 3.0, 0.5, 4.0)]
    glow = (cx, 10.0, 14.0)

    def lumiere(ctx, col):
        # (la braise teinte la gueule et ce qui l'entoure : la sole, les parois, le bas de l'arc)
        if chantier:
            return col
        d = math.sqrt((ctx['x'] - glow[0]) ** 2 + ((ctx['y'] - glow[1]) * 1.3) ** 2 + ((ctx['z'] - glow[2]) * 0.6) ** 2)
        k = max(0.0, 1 - d / 9.0) * (0.75 if ctx['cav'] or ctx['v'].mat in ('sole', 'braise', 'voussoir') else 0.25)
        return tuple(c * (1 - k) + g * k for c, g in zip(col, ton(BRAISE, 0.75)))
    mats = {
        'pierre': pierre(PIERRE, 3.0, 6.0, 9), 'dalle': pierre(PIERRE_CLAIRE, 4.0, 7.0, 10), 'torchis': torchis,
        'voussoir': voussoirs(cx), 'sole': sole_four(cz), 'braise': lambda c: ton(BRAISE, 0.45 + 0.4 * (bruit(int(c['x'] * 2), int(c['z'] * 2), 101) + 1) / 2),
        'pierre_claire': pierre(PIERRE_CLAIRE, 2.0, 3.5, 11), 'buche': buche_bout, 'poteau': bois(BOIS, 6),
        'cintre': planches(PLANCHER, 1.2, 'x', 8), 'pierres_pile': pierre(PIERRE, 1.8, 2.8, 12),
    }
    return rendu(vols, W, H, P, mats, lumiere)


def voussoirs(cx):
    """Les pierres de l'arc de la gueule, en éventail (chacune son ton, son biseau)."""
    def f(ctx):
        a = math.atan2(ctx['y'] - 13.0, ctx['x'] - cx)
        k = math.floor(a * 9 / math.pi)
        R = PIERRE_CLAIRE[abs(k) % len(PIERRE_CLAIRE)]
        fa = a * 9 / math.pi - k
        lum = ctx['lum'] + 0.06 * bruit(k, 2, 111) + 0.10 * (0.5 - fa) - (0.2 if fa < 0.12 else 0)
        return ton(R, lum)
    return f


def sole_four(cz):
    """La sole de la gueule : vue d'en haut, plus claire vers l'avant, la suie au fond."""
    def f(ctx):
        t = max(0.0, min(1.0, (ctx['z'] - 6.0) / 14.0))
        return ton(SUIE, 0.85 - 0.7 * t + 0.05 * bruit(int(ctx['x'] * 2), int(ctx['z'] * 2), 121))
    return f


def buche_bout(ctx):
    """Une bûche : son bout rond devant (les cernes, le cœur plus clair), l'écorce dessus."""
    if face(ctx) == 'avant' and ctx['n'][2] < -0.7:
        # (les cernes : la distance au cœur de la bûche la plus proche)
        cx = round((ctx['x'] - 4.6) / 1.2) * 1.2 + 4.6
        cy = round((ctx['y'] - 9.8) / 2.1) * 2.1 + 9.8
        d = math.hypot(ctx['x'] - cx, ctx['y'] - cy)
        return ton(PLANCHER[2], 0.78 - 0.32 * d + (0.1 if int(d * 3) % 2 else 0))
    return ton(BOIS[int(ctx['y'] * 3) % len(BOIS)], ctx['lum'] - 0.05 + 0.06 * bruit(int(ctx['z'] * 2), int(ctx['y'] * 3), 131))


# ---------- les lampions de la fête ----------

def lampions(allumes=False):
    """La guirlande de la fête (js/carte/ferme/fete.js) : deux mâts de bois, une corde qui ploie entre eux, six lampions
    de papier (chacun sa couleur, ses côtes, son dessus plus clair, son fond dans l'ombre) ; allumés le soir (le cœur
    chaud, le papier qui luit). Trois cases de large, posée derrière la table de la fête."""
    W, H, P = 48, 40, 16
    mats = [Cylindre('mat', 6.5, 8.0, 1.0, 0, 36), Cylindre('mat', 41.5, 8.0, 1.0, 0, 36),
            Boule('pomme', 6.5, 36.6, 8.0, 1.3), Boule('pomme', 41.5, 36.6, 8.0, 1.3)]
    corde = []
    for k in range(80):
        t = k / 79
        x = 6.5 + 35 * t
        y = 34.2 - 9.5 * 4 * t * (1 - t)
        corde.append(Boule('corde', x, y, 8.0, 0.45))
    lamp = []
    for i in range(6):
        t = (i + 0.5) / 6
        x = 6.5 + 35 * t
        y = 34.2 - 9.5 * 4 * t * (1 - t) - 3.6
        v = Boule(f'lampion{i}', x, y, 8.0, 2.2, 2.8, 2.2)
        lamp.append(v)
        lamp.append(Cylindre('ferlamp', x, 8.0, 1.0, y + 2.4, y + 3.3))
        lamp.append(Cylindre('ferlamp', x, 8.0, 0.9, y - 3.2, y - 2.4))
    vols = [*lamp, *corde, *mats]

    def lampion(i):
        R = (LAMPIONS_ALLUMES if allumes else LAMPIONS)[i % 6]

        def f(ctx):
            x0 = 6.5 + 35 * (i + 0.5) / 6
            cote = (int((ctx['x'] - x0 + 3) * 1.4) % 2 == 0)
            lum = (0.55 + 0.40 * (1 - abs(ctx['x'] - x0) / 2.4)) if allumes else ctx['lum'] + 0.1
            if cote:
                lum -= 0.10
            return ton(R, lum + 0.03 * bruit(int(ctx['x'] * 3), int(ctx['y'] * 3), 141 + i))
        return f
    m = {'mat': bois(BOIS, 7), 'pomme': unie(BOIS_PEINT[0], 0.04), 'corde': unie(CORDE, 0.05), 'ferlamp': unie(FER, 0.04)}
    for i in range(6):
        m[f'lampion{i}'] = lampion(i)
    return rendu(vols, W, H, P, m)


# ---------- l'écriture ----------

def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def finir(im):
    return contour(im, OUT)


BATIMENTS = [('kiosque', kiosque), ('lavoir', lavoir), ('fontaine_village', fontaine), ('four_commun', four)]


def main():
    images = []
    for nom, f in BATIMENTS:
        for chantier in (False, True):
            im = finir(f(chantier))
            n = f'{nom}_chantier' if chantier else nom
            im.save(os.path.join(ASSETS, f'meuble_{n}.png'), optimize=True)
            print(f'{n} : {im.width} × {im.height}, {couleurs(im)} couleurs')
            images.append(im)
    jour, soir = finir(lampions(False)), finir(lampions(True))
    planche = Image.new('RGBA', (jour.width * 2, jour.height), (0, 0, 0, 0))
    planche.paste(jour, (0, 0))
    planche.paste(soir, (jour.width, 0))
    planche.save(os.path.join(ASSETS, 'fete_lampions.png'), optimize=True)
    print(f'lampions : {jour.width} × {jour.height} × 2, {couleurs(jour)} et {couleurs(soir)} couleurs')
    if '--apercu' in sys.argv:
        images += [jour, soir]
        L = sum(i.width for i in images) + 8 * (len(images) + 1)
        Hm = max(i.height for i in images) + 16
        ap = Image.new('RGBA', (L, Hm), (92, 146, 62, 255))
        x = 8
        for i in images:
            ap.alpha_composite(i, (x, Hm - 8 - i.height))
            x += i.width + 8
        ap.resize((ap.width * 5, ap.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_projets_village.png'))


if __name__ == '__main__':
    main()
