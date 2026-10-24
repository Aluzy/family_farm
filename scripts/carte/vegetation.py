# La végétation des biomes du grand monde (docs/grand-monde.md, étape 5 : fiche 5b), dans le style
# des arbres de la ferme (vue de haut à 45°, lumière en haut à gauche, contour sombre, feuillage en
# petites touffes claires sur un fond sombre) : les arbres, les buissons, les plantes hautes et les
# petites plantes de chaque biome.
#
#   python3 scripts/carte/vegetation.py            écrit assets/vegetation.png et assets/vegetation.json
#   python3 scripts/carte/vegetation.py --apercu   écrit aussi apercu_vegetation.png (la planche
#                                                  agrandie, chaque dessin sur le sol de son biome,
#                                                  à côté de l'arbre et du pin de la ferme)
#
# Relancer le script redonne la même image (tout le hasard est tiré de clés fixes).
#
# Les sortes et leur nombre de variantes sont ceux de data/monde.json (VEGETATION.SORTES) : le jeu
# y lit où les poser (js/engine/monde-vegetation.js) ; ce script dessine chaque variante. La planche
# n'est pas une grille : chaque dessin a sa taille, rangé par rangées de même hauteur ; le fichier
# assets/vegetation.json donne, pour chaque sorte, ses images : { "sorte": [[x, y, l, h, px, py]…] }
# (le rectangle dans la planche, et le pied : le point du dessin posé sur le sol, au milieu du bas
# du tronc). Une plante qui penche quand on la traverse (les roseaux, les massettes) a cinq images
# par variante, à la suite (droite, penchée à droite un peu puis plus, à gauche un peu puis plus),
# comme l'herbe haute de la ferme (scripts/carte/herbe_haute.py).
#
# Les ombres ne sont pas dans les grands dessins : le jeu les porte au sol selon le soleil (comme
# celles des arbres de la ferme, js/carte/ferme/soleil.js). Les petites plantes, peintes dans le
# sol de leur région, ont une ombre légère à leur pied, comme les décors de l'herbe de la ferme
# (herbe_deco.py).
import json
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, hasard  # noqa: E402

SORTIE = os.path.join(ASSETS, 'vegetation.png')
SORTIE_JSON = os.path.join(ASSETS, 'vegetation.json')
DONNEES = os.path.join(ROOT, 'data', 'monde.json')
ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')
LARGEUR_PLANCHE = 512
LUMIERE = (-0.55, -0.75, 0.9)       # en haut à gauche, comme les buissons de la ferme (arbre_clair.py)


# ---------- les couleurs ----------
#
# Les rampes : du plus sombre (le contour, les creux) au plus clair (les reflets). Celle de la
# prairie est celle de l'arbre de la ferme (scripts/carte/originaux/arbre_feuillu.png : ses tons
# rangés par luminosité) ; les autres en sont des voisines, plus sombres et plus froides en forêt,
# plus jaunes pour le bouleau, bleutées pour le saule, celles du pin de la ferme pour les conifères.

RAMPE_PRE = [(7, 25, 6), (12, 41, 9), (19, 61, 15), (27, 85, 21), (45, 99, 39), (52, 140, 42), (59, 181, 45), (96, 190, 84)]
RAMPE_FORET = [(5, 21, 9), (9, 35, 13), (15, 53, 19), (23, 73, 25), (34, 94, 32), (44, 124, 38), (58, 152, 46), (98, 178, 84)]
RAMPE_OLIVE = [(12, 24, 6), (21, 39, 9), (33, 57, 13), (48, 78, 18), (66, 102, 25), (88, 130, 32), (116, 158, 42), (160, 188, 80)]
RAMPE_BOULEAU = [(16, 40, 8), (30, 64, 12), (50, 94, 16), (76, 126, 22), (104, 156, 32), (136, 184, 48), (170, 208, 74), (206, 230, 120)]
RAMPE_SAULE = [(8, 32, 24), (16, 52, 34), (28, 74, 44), (44, 98, 56), (66, 124, 70), (94, 150, 88), (128, 178, 112), (170, 206, 148)]
RAMPE_PIN = [(4, 30, 16), (8, 50, 26), (14, 74, 34), (26, 102, 40), (46, 130, 46), (76, 160, 56), (112, 192, 76), (152, 220, 112)]
RAMPE_SAPIN = [(3, 22, 16), (6, 38, 24), (10, 58, 32), (18, 80, 38), (32, 104, 44), (54, 132, 52), (86, 162, 70), (128, 196, 104)]
RAMPE_MONT = [(10, 30, 22), (18, 46, 30), (28, 66, 38), (42, 86, 44), (60, 108, 52), (84, 134, 62), (116, 162, 84), (156, 192, 118)]
RAMPE_LANDE = [(22, 30, 8), (36, 48, 12), (52, 68, 16), (70, 90, 22), (92, 114, 30), (118, 140, 40), (148, 166, 56), (186, 196, 92)]
ECORCE = [(30, 20, 12), (52, 36, 20), (76, 54, 30), (100, 72, 42), (126, 92, 56), (156, 118, 74), (186, 146, 98)]
ECORCE_GRISE = [(34, 30, 28), (58, 52, 48), (84, 76, 70), (112, 104, 96), (142, 134, 124), (176, 168, 156), (210, 204, 192)]
BOULEAU = [(34, 32, 30), (90, 86, 80), (176, 172, 160), (214, 210, 198), (238, 236, 226)]


def sur(rampe, t):
    """La couleur de la rampe au niveau t (0 : la première ; borné)."""
    k = max(0, min(len(rampe) - 1, int(round(t))))
    return rampe[k]


def assombrir(c, k):
    return tuple(max(0, round(v * k)) for v in c[:3])


class Toile:
    """Une image en construction : des pixels {(x, y): (r, g, b, a)}, w × h."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}

    def pose(self, x, y, c, a=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = tuple(c[:3]) + (a,)

    def a(self, x, y):
        return (x, y) in self.px

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), c)
        return im


def contour(t, couleur, diagonales=False):
    """Un contour d'un pixel autour du dessin (sur les pixels vides qui touchent un pixel plein)."""
    vois = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (-1, -1), (1, -1), (-1, 1)] if diagonales else [])
    ajout = []
    for y in range(t.h):
        for x in range(t.w):
            if t.a(x, y):
                continue
            if any(t.px.get((x + dx, y + dy), (0, 0, 0, 0))[3] > 128 for dx, dy in vois):
                ajout.append((x, y))
    for x, y in ajout:
        t.pose(x, y, couleur)


def ombre_pied(t, cx, cy, rx, ry, couleur=(10, 30, 14), alpha=90):
    """Une ombre légère au pied d'une petite plante (sous elle : posée avant le dessin), bord tramé."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1 or t.a(x, y):
                continue
            if d > 0.55 and BAYER[y % 4][x % 4] < 8:
                continue
            t.pose(x, y, couleur, alpha)


# ---------- les volumes : des bosses éclairées ----------

def _lumiere():
    n = math.sqrt(sum(c * c for c in LUMIERE))
    return tuple(c / n for c in LUMIERE)


L3 = _lumiere()


def champ_bosses(bosses, graine, bosse=0.08):
    """La hauteur d'un volume fait de bosses rondes [(cx, cy, r, aplati)] (px ; aplati : la
    hauteur de la bosse rapportée à son rayon), le bord un peu bosselé : une fonction (x, y) → h."""
    def h(x, y):
        best = 0.0
        for k, b in enumerate(bosses):
            cx, cy, r = b[:3]
            ap = b[3] if len(b) > 3 else 1.0
            a = math.atan2(y - cy, x - cx)
            rr = r * (1 + bosse * math.sin(a * 7 + graine + k) + bosse * 0.6 * math.sin(a * 13 + graine * 2 + k))
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if d2 < rr * rr:
                best = max(best, math.sqrt(rr * rr - d2) * ap + (b[4] if len(b) > 4 else 0))
        return best
    return h


def eclairage(h, x, y):
    """La lumière (de -1 à 1) en (x, y) d'un champ de hauteur h (lumière en haut à gauche)."""
    gx = (h(x + 1.0, y) - h(x - 1.0, y)) / 2
    gy = (h(x, y + 1.0) - h(x, y - 1.0)) / 2
    n = math.sqrt(gx * gx + gy * gy + 1)
    return (-gx * L3[0] - gy * L3[1] + L3[2]) / n


# Les touffes de feuilles (comme celles de l'arbre de la ferme : de petits croissants clairs,
# éclairés en haut à gauche, avec un creux sombre en bas à droite). Chaque forme : les pixels du
# reflet (+1), du corps (0), de l'ombre qu'elle fait (-2).
FEUILLES = [
    ([(0, 0), (1, 0)], [(-1, 1), (0, 1), (1, 1), (2, 1)], [(0, 2), (1, 2), (2, 2)]),
    ([(0, 0)], [(1, 0), (-1, 1), (0, 1), (1, 1)], [(0, 2), (1, 2), (2, 1)]),
    ([(0, 0), (1, 0), (2, 0)], [(0, 1), (1, 1), (2, 1)], [(1, 2), (2, 2), (3, 1)]),
    ([(1, 0)], [(0, 0), (0, 1), (1, 1), (2, 1), (1, 2)], [(2, 2), (0, 2), (1, 3)]),
    ([(0, 0), (0, 1)], [(1, 0), (1, 1), (2, 1)], [(1, 2), (2, 2)]),
]


def feuillage(t, h, rampe, graine, pas=3, base=1.6, etendue=4.6, creux=2.0, pied=None, lumiere=None):
    """Remplit la toile là où h > 0 : un fond sombre, puis des touffes de feuilles posées sur une
    grille de `pas` px décalée au hasard, de haut en bas, chacune de la teinte de la lumière à sa
    place (base + etendue × lumière), son reflet un ton plus clair, son ombre `creux` tons plus
    sombre. `pied` : (y0, y1) le bas du feuillage s'assombrit de y0 à y1 (le dessous, à l'ombre)."""
    r = random.Random(graine)
    lum = {}
    for y in range(t.h):
        for x in range(t.w):
            if h(x + 0.5, y + 0.5) > 0:
                l = lumiere(x, y) if lumiere else eclairage(h, x + 0.5, y + 0.5)
                if pied and y > pied[0]:
                    l -= 0.9 * min(1.0, (y - pied[0]) / max(1, pied[1] - pied[0]))
                lum[(x, y)] = l
    niveau = lambda x, y: base + etendue * lum[(x, y)]  # noqa: E731
    for (x, y) in lum:
        t.pose(x, y, sur(rampe, niveau(x, y) - creux - 0.3 + (BAYER[y % 4][x % 4] / 16 - 0.5)))
    points = []
    for gy in range(-2, t.h + 2, pas):
        for gx in range(-2, t.w + 2, pas):
            x, y = gx + r.randint(0, pas - 1), gy + r.randint(0, pas - 1)
            points.append((y, x, r.randrange(len(FEUILLES)), r.random()))
    points.sort()
    for y, x, f, v in points:
        if (x, y) not in lum:
            continue
        n0 = niveau(x, y) + (v - 0.5) * 0.9
        reflet, corps, ombre = FEUILLES[f]
        for dx, dy in ombre:
            if (x + dx, y + dy) in lum:
                t.pose(x + dx, y + dy, sur(rampe, n0 - creux))
        for dx, dy in corps:
            if (x + dx, y + dy) in lum:
                t.pose(x + dx, y + dy, sur(rampe, n0))
        for dx, dy in reflet:
            if (x + dx, y + dy) in lum:
                t.pose(x + dx, y + dy, sur(rampe, n0 + 1))
    return lum


def tronc(t, x0, y0, y1, l0, l1, ecorce=ECORCE, graine=0, racines=2, penche=0.0):
    """Un tronc de y0 (haut) à y1 (bas, le pied), large de l0 en haut et l1 en bas, centré en x0
    (+ penche px par px de hauteur, vers le haut) : éclairé à gauche, sombre à droite, des
    stries d'écorce ; les racines s'évasent sur `racines` px au pied."""
    r = random.Random(graine)
    stries = {r.randint(-6, 6): r.random() for _ in range(5)}
    for y in range(y0, y1 + 1):
        f = (y - y0) / max(1, y1 - y0)
        l = l0 + (l1 - l0) * f
        if y > y1 - racines:
            l += (y - (y1 - racines)) * 2.2
        cx = x0 + penche * (y1 - y)
        xa, xb = int(round(cx - l / 2)), int(round(cx + l / 2))
        for x in range(xa, xb):
            u = (x - xa + 0.5) / max(1, xb - xa)       # 0 à gauche, 1 à droite
            k = 4.4 - 3.2 * u + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.8
            dx = x - int(round(cx))
            if dx in stries and (y + int(stries[dx] * 7)) % 5 < 3:
                k -= 1.3
            t.pose(x, y, sur(ecorce, k))


# ---------- les arbres ----------

def feuillu(forme, rampe, graine, ecorce=ECORCE, touffe=True):
    """Un feuillu : un houppier de bosses (forme : 'rond', 'large', 'haut'), un tronc dessous."""
    r = random.Random(graine)
    if forme == 'rond':
        w, h, fx = 50, 64, 25
        bosses = [(25, 22, 21), (14, 26, 12), (36, 26, 12), (25, 12, 13), (18, 34, 10), (32, 35, 10)]
        tr = (25, 36, 60, 7, 9)
    elif forme == 'large':
        w, h, fx = 64, 62, 32
        bosses = [(32, 20, 17), (16, 26, 13), (48, 25, 14), (24, 13, 11), (42, 12, 12), (9, 32, 8), (55, 32, 8), (32, 32, 13)]
        tr = (32, 34, 58, 9, 11)
    else:
        w, h, fx = 40, 70, 20
        bosses = [(20, 30, 15), (20, 16, 12), (13, 38, 10), (27, 38, 10), (20, 8, 8), (20, 44, 9)]
        tr = (20, 46, 66, 6, 8)
    bosses = [(cx + r.uniform(-1.5, 1.5), cy + r.uniform(-1.5, 1.5), rr * r.uniform(0.94, 1.06)) for cx, cy, rr in bosses]
    t = Toile(w, h)
    tronc(t, tr[0], tr[1], tr[2], tr[3], tr[4], ecorce, graine)
    if touffe:
        herbe_pied(t, tr[0], tr[2], graine, largeur=tr[4] + 6)
    hb = champ_bosses(bosses, graine)
    bas = max(cy + rr for cx, cy, rr in bosses)
    cime = Toile(w, h)
    feuillage(cime, hb, rampe, graine + 1, pied=(bas - 14, bas))
    contour(cime, rampe[0])
    for k, c in cime.px.items():
        t.px[k] = c
    contour(t, assombrir(rampe[0], 0.8))
    return t, fx, tr[2] - 1


def herbe_pied(t, cx, y, graine, largeur=14, rampe=None):
    """Quelques brins d'herbe sombre au pied d'un tronc (comme l'arbre de la ferme)."""
    rampe = rampe or RAMPE_PRE
    r = random.Random(graine * 7 + 3)
    for k in range(int(largeur * 0.8)):
        x = cx - largeur // 2 + r.randint(0, largeur)
        hh = r.randint(2, 5)
        for d in range(hh):
            t.pose(x + (1 if d == hh - 1 and r.random() < 0.4 else 0), y - d, sur(rampe, 1 + d * 0.8 + r.random()))


def sapin(w, h, rampe, graine, etages=5, asym=0.0, sec=False, tronc_h=6):
    """Un conifère, comme le pin de la ferme : des étages de branches qui retombent, de haut en
    bas, chacun posé devant celui du dessus. Chaque étage : une branche de chaque côté (un arc
    qui part du tronc et retombe, épais près du tronc, effilé au bout) et une jupe au milieu ; le
    dessus des branches est clair (le soleil), le dessous sombre ; des aiguilles en petits traits.
    asym : un côté plus long que l'autre (un arbre battu par le vent) ; sec : des trous, des
    branches mortes (en montagne)."""
    r = random.Random(graine)
    t = Toile(w, h)
    cx = w / 2
    pied = h - 2
    tronc(t, round(cx), pied - tronc_h - 4, pied, 3, 5, ECORCE, graine, racines=2)
    haut, bas = 1, pied - tronc_h + 1
    lum = {}
    pas = (bas - haut) / (etages + 1.5)
    # la pointe
    for y in range(haut, int(haut + pas * 1.4)):
        demi = 0.6 + (y - haut) * 0.45
        for x in range(w):
            dx = x + 0.5 - cx
            if abs(dx) <= demi:
                lum[(x, y)] = (0.5 - dx / 2.5 - 0.3 * (y - haut) / pas, 0, 0)
    for k in range(etages):
        f = (k + 1) / etages                              # l'étage du bas : 1
        y0 = haut + pas * (k + 0.7)                       # le haut de l'étage (à l'axe)
        long = 3.0 + (w / 2 - 3.0) * f ** 0.9             # la longueur des branches
        tombe = pas * (0.9 + 0.6 * f)                     # de combien le bout retombe
        epais = pas * 1.45
        for cote in (-1, 1):
            L = long * (1 + asym * cote) * r.uniform(0.82, 1.08)
            for x in range(w):
                dx = (x + 0.5 - cx) * cote
                if dx < -2.5 or dx > L + 0.5:
                    continue
                u = max(0.0, dx) / max(1.0, L)
                arc = y0 + tombe * u ** 1.5 - 1.0 * u * (1 - u)   # le dessus de la branche
                # le dessous : festonné (des bouquets d'aiguilles qui pendent)
                feston = 1.4 * abs(math.sin((dx + k * 1.7 + graine) * 0.9))
                ep = epais * (1 - 0.8 * u ** 1.4) + feston * (1 - u)
                for y in range(int(arc), int(arc + ep) + 1):
                    if not (0 <= y < h):
                        continue
                    v = (y - arc) / max(1.0, ep)              # 0 dessus, 1 dessous
                    l = 0.95 - 1.9 * v - 0.5 * cote * min(1.0, dx / 6 + 0.2) - 0.1 * u
                    lum[(x, y)] = (l, u, k)
    for (x, y), (l, u, k) in lum.items():
        n = 3.2 + 2.2 * l + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.8
        if sec and r.random() < 0.06:
            continue
        t.pose(x, y, sur(rampe, n))
    # les aiguilles : de petits traits qui descendent vers le bout des branches, clairs sur le
    # dessus, avec un creux sombre dessous (comme les touffes des feuillus)
    pts = sorted(lum, key=lambda p: (p[1], p[0]))
    for (x, y) in pts:
        if r.random() > 0.2:
            continue
        l, u, k = lum[(x, y)]
        cote = 1 if x + 0.5 > cx else -1
        n0 = 3.2 + 2.2 * l + 1.2
        for d in range(3):
            p = (x + cote * d, y + (d + 1) // 2)
            if p in lum:
                t.pose(p[0], p[1], sur(rampe, n0 - d * 0.4))
        p = (x + cote, y + 2)
        if p in lum:
            t.pose(p[0], p[1], sur(rampe, n0 - 3.2))
    if sec:
        # une branche morte, nue
        y = int(haut + (bas - haut) * 0.55)
        for d in range(int(w * 0.35)):
            t.pose(int(cx) - d, y - d // 3, ECORCE_GRISE[2 + (d % 2)])
    contour(t, assombrir(rampe[0], 0.85))
    return t, int(cx), pied - 1


def bouleau(graine, variante):
    """Un bouleau : un tronc fin et blanc, marqué de noir, un houppier léger, clair, en trois ou
    quatre touffes."""
    r = random.Random(graine)
    w, h = 38, 64
    t = Toile(w, h)
    cx = 19 + r.randint(-1, 1)
    pied = h - 3
    # le tronc blanc
    for y in range(26, pied + 1):
        l = 3 + (1 if y > pied - 6 else 0) + (1 if y > pied - 2 else 0)
        xa = cx - l // 2 + (1 if y < 40 and variante == 1 else 0)
        for x in range(xa, xa + l):
            u = (x - xa + 0.5) / l
            k = 3.6 - 2.4 * u
            t.pose(x, y, sur(BOULEAU, k))
        if r.random() < 0.28:
            for x in range(xa, xa + r.randint(1, l)):
                t.pose(x, y, BOULEAU[0])
    # une branche
    for k in range(6):
        t.pose(cx + 2 + k, 40 - k // 2, BOULEAU[1])
    formes = [
        [(19, 22, 12), (11, 30, 8), (27, 28, 9), (19, 36, 8), (14, 16, 7)],
        [(18, 24, 11), (27, 20, 8), (10, 28, 9), (22, 34, 9), (19, 13, 7)],
        [(19, 20, 10), (19, 32, 10), (11, 24, 7), (27, 26, 8), (24, 38, 6)],
    ][variante % 3]
    hb = champ_bosses([(a + r.uniform(-1, 1), b, c) for a, b, c in formes], graine, bosse=0.14)
    cime = Toile(w, h)
    feuillage(cime, hb, RAMPE_BOULEAU, graine + 5, pas=3, base=2.0, etendue=4.0, pied=(32, 44))
    # des trous dans le feuillage (on voit le ciel à travers : un houppier léger)
    for (x, y) in list(cime.px):
        if hasard(x * 0.37, y * 0.71, graine) < 0.035 and hb(x + 0.5, y + 0.5) > 3:
            del cime.px[(x, y)]
    contour(cime, RAMPE_BOULEAU[0])
    for k, c in cime.px.items():
        t.px[k] = c
    herbe_pied(t, cx + 1, pied, graine, 10)
    contour(t, assombrir(RAMPE_BOULEAU[0], 0.7))
    return t, cx + 1, pied - 1


def saule(graine, variante):
    """Un saule pleureur : un dôme bleuté d'où retombent des rameaux en mèches jusqu'au sol (des
    rubans de feuilles, chacun éclairé à gauche, effilé au bout), le tronc entrevu entre eux."""
    r = random.Random(graine)
    w, h = 58, 60
    t = Toile(w, h)
    cx, pied = 29, h - 3
    tronc(t, cx, 24, pied, 6, 8, ECORCE_GRISE, graine)
    dome = [(29, 20, 18, 0.7), (16, 23, 11, 0.7), (42, 23, 11, 0.7), (29, 11, 12, 0.7)]
    hb = champ_bosses(dome, graine)
    cime = Toile(w, h)
    lum = feuillage(cime, hb, RAMPE_SAULE, graine + 2, pas=3, base=2.4, etendue=4.0)
    bord = {}
    for (x, y) in lum:
        bord[x] = max(bord.get(x, 0), y)
    # les mèches : de l'arrière (le milieu, derrière le tronc pour la première variante) vers
    # l'avant ; chacune 3 px de large, qui s'écarte un peu en tombant
    n = 15
    meches = []
    for i in range(n):
        u = (i + 0.5) / n * 2 - 1                       # de -1 (gauche) à 1 (droite)
        x0 = cx + u * 25 + r.uniform(-1, 1)
        milieu = abs(u) < 0.3
        y0 = bord.get(int(x0), 24) - 4 - r.randint(0, 3)
        if milieu and variante == 0:
            fin = y0 + 8 + r.randint(0, 4)              # on voit le tronc
        else:
            fin = pied - 1 - r.randint(0, 7) - (3 if milieu else 0)
        meches.append((0 if milieu else 1, r.random(), x0, y0, fin, u))
    meches.sort()
    for _, _, x0, y0, fin, u in meches:
        for y in range(int(y0), int(fin)):
            f = (y - y0) / max(1, fin - y0)
            xc = x0 + u * 3.5 * f + math.sin(y * 0.45 + x0) * 0.6
            larg = 3 if f < 0.75 else 2 if f < 0.92 else 1
            for d in range(larg):
                x = int(round(xc - larg / 2 + d))
                l = 0.4 - 0.7 * u - 0.6 * f + (0.8 if d == 0 else -0.6 if d == larg - 1 else 0)
                k = 3.0 + 2.2 * l + (0.9 if (y + int(x0)) % 3 == 0 and d == 0 else 0)
                cime.pose(x, y, sur(RAMPE_SAULE, k))
    contour(cime, RAMPE_SAULE[0])
    for k, c in cime.px.items():
        t.px[k] = c
    contour(t, assombrir(RAMPE_SAULE[0], 0.8))
    return t, cx, pied - 1


def pin_tordu(graine, variante):
    """Un petit pin tordu de la lande : un tronc qui penche et se courbe, deux ou trois touffes
    d'aiguilles aplaties, comme des parasols."""
    r = random.Random(graine)
    w, h = 46, 50
    t = Toile(w, h)
    pied = h - 3
    sens = 1 if variante == 0 else -1
    cx = 23 - sens * 4
    # le tronc : une courbe
    pts = []
    for k in range(30):
        f = k / 29
        x = cx + sens * (9 * f + 3 * math.sin(f * 3.2 + graine))
        y = pied - 26 * f
        pts.append((x, y))
    for (x, y) in pts:
        for dx in range(-2, 2):
            u = (dx + 2.5) / 4
            t.pose(int(round(x + dx)), int(round(y)), sur(ECORCE, 4.2 - 2.8 * u))
    for d in range(4):
        t.pose(int(cx) - 3 - d, pied - (d > 2), ECORCE[2])
        t.pose(int(cx) + 2 + d, pied - (d > 2), ECORCE[1])
    # une branche
    bx, by = pts[14]
    for k in range(8):
        t.pose(int(bx) - sens * k, int(by) - k // 2, ECORCE[2])
    touffes = [(pts[-1][0], pts[-1][1] - 2, 11, 0.55), (bx - sens * 8, by - 6, 8, 0.55), (pts[-1][0] - sens * 9, pts[-1][1] + 2, 7, 0.5)]
    cime = Toile(w, h)
    for k, (x, y, rr, ap) in enumerate(touffes):
        hb = champ_bosses([(x, y, rr * 1.15, 0.5), (x - rr * 0.5, y + 1, rr * 0.7, 0.5), (x + rr * 0.6, y + 1, rr * 0.7, 0.5)], graine + k, bosse=0.16)
        # aplatie : on écrase le champ en hauteur
        hh = (lambda hb, y: (lambda X, Y: hb(X, y + (Y - y) * 1.7)))(hb, y)
        sub = Toile(w, h)
        feuillage(sub, hh, RAMPE_PIN, graine + 10 + k, pas=2, base=2.0, etendue=4.4)
        contour(sub, RAMPE_PIN[0])
        for kk, c in sub.px.items():
            cime.px[kk] = c
    for k, c in cime.px.items():
        t.px[k] = c
    herbe_pied(t, int(cx), pied, graine, 10, RAMPE_LANDE)
    contour(t, assombrir(RAMPE_PIN[0], 0.8))
    return t, int(cx), pied - 1


# ---------- les buissons ----------

def dome(w, h, bosses, rampe, graine, pas=2, base=1.8, etendue=4.4, creux=2.0):
    """Un buisson en dôme : des bosses éclairées, couvertes de touffes de feuilles, son contour."""
    t = Toile(w, h)
    hb = champ_bosses(bosses, graine, bosse=0.12)
    lum = feuillage(t, hb, rampe, graine, pas=pas, base=base, etendue=etendue, creux=creux)
    return t, lum, hb


def fleurit(t, lum, couleurs, graine, part, haut=0.0, taille=1):
    """Sème des fleurs (couleurs : sombre, moyenne, claire) sur un feuillage, plutôt en haut et à la
    lumière : `part` des pixels, en petits bouquets de 1 à 3 px."""
    r = random.Random(graine)
    for (x, y), l in sorted(lum.items()):
        if r.random() > part * (0.6 + l + haut * (1 if y < t.h / 2 else -0.5)):
            continue
        t.pose(x, y, couleurs[1])
        if taille > 1 and (x + 1, y) in lum:
            t.pose(x + 1, y, couleurs[2] if l > 0.3 else couleurs[1])
        if (x, y + 1) in lum and r.random() < 0.6:
            t.pose(x, y + 1, couleurs[0])
        if l > 0.4 and r.random() < 0.5:
            t.pose(x, y, couleurs[2])


def buissons_ferme():
    """Le buisson rond et le buisson large de la ferme (assets/arbre_clair.png), tels quels."""
    planche = Image.open(os.path.join(ASSETS, 'arbre_clair.png')).convert('RGBA')
    out = []
    for k in (1, 2):
        im = planche.crop((48 * k, 0, 48 * k + 48, 64))
        x0, y0, x1, y1 = im.getbbox()
        out.append((im.crop((x0, y0, x1, y1)), 24 - x0, 62 - y0 - 1))
    return out


def ronces(graine, variante):
    """Un roncier : un tas de feuilles sombres d'où sortent des tiges en arceaux, rouge sombre,
    des mûres noires (ou des fleurs blanches)."""
    r = random.Random(graine)
    w, h = 34, 24
    bosses = [(17, 16, 9, 0.8), (9, 18, 6, 0.8), (25, 18, 7, 0.8), (13, 12, 6, 0.8), (22, 12, 6, 0.8)]
    t, lum, hb = dome(w, h, [(a + r.uniform(-1, 1), b, c, d) for a, b, c, d in bosses], RAMPE_FORET, graine, base=1.4, etendue=4.0)
    # les tiges en arceaux, qui débordent
    for k in range(6):
        x0 = 17 + r.uniform(-8, 8)
        sens = -1 if x0 < 17 else 1
        long = r.uniform(8, 13)
        for d in range(int(long * 3)):
            f = d / (long * 3)
            x = x0 + sens * long * f
            y = 14 - 7 * math.sin(f * math.pi) + 6 * f
            c = (96, 34, 40) if f < 0.7 else (124, 52, 52)
            t.pose(int(round(x)), int(round(y)), c)
            if d % 5 == 2:
                t.pose(int(round(x)), int(round(y)) - 1, (150, 90, 80))
    if variante == 2:
        fleurit(t, lum, [(170, 150, 160), (236, 226, 232), (255, 255, 255)], graine + 1, 0.025)
    else:
        fleurit(t, lum, [(20, 8, 24), (52, 20, 50), (120, 70, 120)] if variante == 0 else [(90, 10, 20), (170, 30, 40), (230, 90, 90)], graine + 1, 0.035)
    contour(t, (12, 18, 8))
    return t, 17, h - 3


def souche(graine, variante):
    """Une souche : le dessus coupé (le bois clair, ses cernes), l'écorce sur le côté, les racines ;
    l'une couverte de mousse, l'autre avec des champignons."""
    r = random.Random(graine)
    w, h = 22, 18
    t = Toile(w, h)
    cx, top, bas = 11, 5, 14
    rx, ry = 6.5 + variante * 0.5, 3.0
    # le côté (l'écorce)
    for y in range(top, bas + 1):
        for x in range(w):
            dx = (x + 0.5 - cx) / rx
            ext = 1 + (0.35 * (y - top) / (bas - top)) ** 2 * 6 if y > bas - 3 else 1
            if abs(dx) <= ext:
                u = (dx + 1) / 2
                k = 4.6 - 3.4 * u + (BAYER[y % 4][x % 4] / 16 - 0.5)
                if (x * 7) % 5 == 0:
                    k -= 1.1
                t.pose(x, y, sur(ECORCE, k))
    # les racines
    for s_ in (-1, 1):
        for d in range(4):
            t.pose(int(cx + s_ * (rx + d)), bas - (d // 2), ECORCE[2 if s_ < 0 else 1])
    # le dessus : une ellipse claire, des cernes
    for y in range(int(top - ry) - 1, int(top + ry) + 2):
        for x in range(w):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - top) / ry) ** 2
            if d <= 1:
                anneau = int(math.sqrt(d) * 4)
                c = [(214, 176, 120), (196, 156, 100), (214, 176, 120), (176, 132, 82)][min(3, anneau)]
                if d > 0.82:
                    c = (120, 84, 50)
                t.pose(x, y, c)
    if variante == 1:
        # la mousse sur le dessus et le côté
        for (x, y) in list(t.px):
            if hasard(x * 0.9, y * 1.3, graine) < 0.35 and y < top + 4:
                t.pose(x, y, sur(RAMPE_FORET, 3 + 2 * hasard(x, y, 3)))
    if variante == 2:
        for k, (x, y) in enumerate([(cx + 6, bas - 2), (cx + 8, bas - 1)]):
            for dx in range(-1, 2):
                t.pose(x + dx, y - 2, (200, 120, 60) if dx < 1 else (150, 80, 40))
            t.pose(x, y - 1, (230, 220, 200))
            t.pose(x, y, (230, 220, 200))
    contour(t, (30, 20, 12))
    return t, cx, bas


def tronc_couche(graine, variante):
    """Un tronc couché dans les feuilles : un cylindre d'écorce, éclairé dessus, son bout coupé à
    gauche (les cernes), de la mousse dessus, un moignon de branche."""
    r = random.Random(graine)
    w, h = 40, 18
    t = Toile(w, h)
    y0, y1, x0, x1 = 5, 14, 4, 37
    for x in range(x0, x1):
        bosse = 0.6 * math.sin(x * 0.4 + graine)
        for y in range(int(y0 + bosse), y1):
            v = (y - y0) / (y1 - y0)
            k = 5.0 - 4.4 * v + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.8
            if (x + int(y * 1.7)) % 6 == 0:
                k -= 1.0
            t.pose(x, y, sur(ECORCE if variante == 0 else ECORCE_GRISE, k))
        if variante == 0 and hasard(x * 0.3, graine) < 0.45:
            for y in range(int(y0 + bosse), int(y0 + bosse) + 2 + int(hasard(x, 2) * 2)):
                t.pose(x, y, sur(RAMPE_FORET, 4 + hasard(x, y) * 2))
    # le bout coupé (une ellipse debout)
    for y in range(y0, y1):
        for x in range(x0 - 3, x0 + 3):
            d = ((x + 0.5 - x0) / 2.6) ** 2 + ((y + 0.5 - (y0 + y1) / 2) / ((y1 - y0) / 2)) ** 2
            if d <= 1:
                t.pose(x, y, [(214, 176, 120), (190, 150, 96), (214, 176, 120), (170, 126, 78)][min(3, int(math.sqrt(d) * 4))])
    # le moignon d'une branche
    for d in range(5):
        t.pose(24 + d, y0 - 1 - d // 2, ECORCE[3])
        t.pose(24 + d, y0 - d // 2, ECORCE[2])
    contour(t, (28, 20, 12))
    return t, 10, y1 - 1


def ajonc(graine, variante):
    """Un ajonc : un buisson sombre et piquant, semé de fleurs jaune vif."""
    r = random.Random(graine)
    w, h = 28, 24
    bosses = [[(14, 15, 9, 0.9), (8, 17, 6, 0.9), (20, 17, 6, 0.9), (14, 9, 6, 0.9)],
              [(13, 15, 8, 0.9), (20, 14, 7, 0.9), (8, 17, 5, 0.9)],
              [(14, 14, 10, 0.9), (7, 18, 5, 0.9), (21, 18, 5, 0.9)]][variante]
    t, lum, hb = dome(w, h, bosses, RAMPE_SAPIN, graine, pas=2, base=1.6, etendue=3.6, creux=2.4)
    # des piquants qui dépassent
    for (x, y), l in sorted(lum.items()):
        if (x - 1, y) not in lum and r.random() < 0.3:
            t.pose(x - 1, y - 1, RAMPE_SAPIN[2])
        if (x, y - 1) not in lum and r.random() < 0.35:
            t.pose(x, y - 1, RAMPE_SAPIN[3])
    fleurit(t, lum, [(176, 120, 10), (240, 196, 30), (255, 238, 120)], graine + 3, 0.09, haut=0.4, taille=2)
    contour(t, (10, 24, 10))
    return t, 14, h - 3


def genet(graine, variante):
    """Un genêt : un bouquet de tiges vertes et droites, en éventail, couvertes de fleurs jaunes
    vers le haut."""
    r = random.Random(graine)
    w, h = 26, 32
    t = Toile(w, h)
    pied = h - 3
    tiges = []
    for k in range(14):
        a = (k / 13 - 0.5) * (1.4 if variante == 0 else 1.1) + r.uniform(-0.08, 0.08)
        L = r.uniform(18, 27) * (1 - 0.3 * abs(a))
        tiges.append((a, L))
    lum = {}
    for a, L in sorted(tiges, key=lambda q: -abs(q[0])):
        for d in range(int(L)):
            f = d / L
            x = 13 + math.sin(a) * L * f + math.sin(a) * 3 * f * f
            y = pied - math.cos(a) * L * f
            p = (int(round(x)), int(round(y)))
            t.pose(p[0], p[1], sur(RAMPE_LANDE, 2.5 + 2.5 * f - 1.2 * a))
            if f > 0.35:
                lum[p] = 0.5 - a
    fleurit(t, lum, [(170, 120, 0), (236, 196, 24), (255, 236, 110)], graine + 4, 0.16, taille=1)
    contour(t, (20, 28, 6))
    return t, 13, pied


def rhododendron(graine, variante):
    """Un rhododendron : un buisson rond de grandes feuilles sombres et luisantes, des bouquets de
    fleurs roses."""
    r = random.Random(graine)
    w, h = 32, 26
    bosses = [(16, 15, 10, 0.85), (8, 18, 7, 0.85), (24, 18, 7, 0.85), (12, 10, 6, 0.85), (21, 10, 6, 0.85)]
    t, lum, hb = dome(w, h, [(a + r.uniform(-1, 1), b, c, d) for a, b, c, d in bosses], RAMPE_MONT, graine, pas=3, base=1.6, etendue=4.4)
    roses = [(120, 30, 80), (206, 74, 146), (246, 156, 204)] if variante == 0 else [(110, 40, 110), (176, 86, 186), (224, 168, 236)]
    for k in range(6):
        x, y = r.randint(5, 26), r.randint(4, 15)
        if (x, y) not in lum:
            continue
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1)]:
            if (x + dx, y + dy) in lum:
                t.pose(x + dx, y + dy, roses[1])
        t.pose(x - 1, y - 1, roses[2])
        t.pose(x, y - 1, roses[2])
        t.pose(x + 1, y + 1, roses[0])
    contour(t, (10, 26, 18))
    return t, 16, h - 3


# ---------- les plantes hautes, qui penchent ----------

PENTES = [0, 1, 3, -1, -3]       # de combien penche le haut (px), pour chaque image (herbe_haute.py)


def penchees(dessine, w, h, pied):
    """Les cinq images d'une plante qui penche : dessine(pente) → Toile ; le haut se décale de
    pente px, d'autant moins qu'on est près du pied."""
    out = []
    for p in PENTES:
        t = dessine(p)
        out.append((t.image(), w // 2, pied))
    return out


def roseaux(graine, variante):
    """Une touffe de roseaux : beaucoup de tiges fines, serrées, vert-jaune, de longues feuilles en
    biais, de petits plumeaux clairs qui retombent au bout."""
    w, h, pied = 24, 36, 33
    r0 = random.Random(graine)
    tiges = sorted([(r0.uniform(-10, 10), r0.uniform(18, 31), r0.random()) for _ in range(8 + variante * 2)], key=lambda q: q[2])
    feuilles = [(r0.uniform(-4, 4), r0.uniform(4, 16), r0.choice((-1, 1)), r0.uniform(6, 10)) for _ in range(8)]
    vert = [(36, 50, 14), (58, 76, 22), (84, 104, 32), (112, 132, 44), (142, 158, 62), (172, 182, 90), (200, 204, 124)]

    def dessine(pente):
        t = Toile(w, h)
        ombre_pied(t, w / 2, pied + 0.5, 7, 2, (20, 34, 20), 80)
        dec = lambda y: pente * ((pied - y) / 30) ** 1.6  # noqa: E731
        for x0, L, v in tiges:
            for d in range(int(L)):
                y = pied - d
                x = 12 + x0 * (0.1 + 0.9 * d / L) + dec(y)
                t.pose(int(round(x)), y, sur(vert, 1.2 + v * 2.2 + (d / L) * 1.6))
                if d < L * 0.6 and not t.a(int(round(x)) + 1, y):
                    t.pose(int(round(x)) + 1, y, vert[0])        # son ombre : la tige se détache
            ytop = pied - int(L)
            xt = 12 + x0 + dec(ytop)
            # le plumeau : un petit panache qui penche d'un côté
            cote = 1 if x0 > 0 else -1
            for k in range(5):
                c = (196, 174, 130) if k < 2 else (160, 132, 96) if k < 4 else (116, 92, 70)
                t.pose(int(round(xt + cote * (k // 2) + pente * 0.2)), ytop + k - 1, c)
                if k in (1, 2):
                    t.pose(int(round(xt + cote * (k // 2) + pente * 0.2)) + cote, ytop + k - 1, (136, 110, 80))
        for x0, L, s_, long in feuilles:
            for d in range(int(long)):
                f = d / long
                y = pied - L - d * 0.7 + f * f * 5
                x = 12 + x0 + s_ * d * 0.75 + dec(y)
                t.pose(int(round(x)), int(round(y)), sur(vert, 3.6 - f * 2.0))
        return t

    return penchees(dessine, w, h, pied)


def massette(graine, variante):
    """Des massettes : de longues feuilles en lanières, deux ou trois tiges et leurs épis bruns en
    cylindre, une pointe fine au-dessus."""
    w, h, pied = 18, 32, 29
    r0 = random.Random(graine)
    tiges = [(r0.uniform(-4, 4), r0.uniform(18, 25)) for _ in range(2 + variante)]
    feuilles = [(r0.uniform(-4, 4), r0.uniform(12, 20), r0.uniform(-0.5, 0.5)) for _ in range(6)]

    def dessine(pente):
        t = Toile(w, h)
        ombre_pied(t, w / 2, pied + 0.5, 5, 2, (20, 34, 20), 80)
        dec = lambda y: pente * ((pied - y) / 24) ** 1.6  # noqa: E731
        for x0, L, a in feuilles:
            for d in range(int(L)):
                y = pied - d
                x = 9 + x0 * 0.4 + a * d + dec(y)
                for dx in (0, 1):
                    t.pose(int(round(x)) + dx, y, sur(RAMPE_PIN, 4.2 - dx * 1.6 - d / L))
        for x0, L in tiges:
            for d in range(int(L)):
                y = pied - d
                t.pose(int(round(9 + x0 * (d / L) + dec(y))), y, (96, 120, 50))
            ytop = pied - int(L)
            xt = int(round(9 + x0 + dec(ytop)))
            for k in range(7):
                t.pose(xt - 1, ytop + 2 + k, (150, 92, 48))
                t.pose(xt, ytop + 2 + k, (110, 62, 30))
                t.pose(xt + 1, ytop + 2 + k, (74, 40, 20))
            for k in range(3):
                t.pose(xt, ytop - k + 1, (120, 120, 70))
        contour(t, (18, 30, 10))
        return t

    return penchees(dessine, w, h, pied)


# ---------- les petites plantes (peintes dans le sol) ----------

def petite(w, h, pied, ombre=(5, 1.6)):
    t = Toile(w, h)
    if ombre:
        ombre_pied(t, w / 2, pied + 0.5, ombre[0], ombre[1])
    return t


def fini(t, fx, fy, couleur):
    contour(t, couleur)
    return (t.image(), fx, fy)


def fougere(graine, variante):
    """Une fougère : des frondes qui s'arquent depuis le cœur, chacune une nervure et ses folioles."""
    r = random.Random(graine)
    w, h = 22, 16
    t = petite(w, h, 13, (7, 2))
    rampe = RAMPE_FORET if variante < 3 else RAMPE_OLIVE
    angles = sorted([(-1.25 + 2.5 * k / 6 + r.uniform(-0.12, 0.12)) for k in range(7)], key=lambda a: -abs(a))
    for a in angles:
        L = r.uniform(7, 10) * (1 - 0.15 * abs(a))
        for d in range(int(L * 1.4)):
            f = d / (L * 1.4)
            x = 11 + math.sin(a) * L * f * 1.2
            y = 13 - math.cos(a) * L * f * 0.9 + 4 * f * f * (abs(a) + 0.3)
            n = 5.2 - 2.6 * f - 1.0 * (a > 0)
            t.pose(int(round(x)), int(round(y)), sur(rampe, n - 1))
            if d % 2 == 0 and f < 0.85:
                for s_ in (-1, 1):
                    t.pose(int(round(x + s_ * math.cos(a))), int(round(y + s_ * math.sin(a) * 0.6)) - 1 * (s_ < 0), sur(rampe, n + (0.8 if s_ < 0 else -0.6)))
    return fini(t, 11, 13, assombrir(rampe[0], 0.8))


def champignons(graine, variante):
    """Des champignons : une amanite rouge à points blancs, des cèpes bruns, un bouquet de petits
    champignons clairs, une vesse-de-loup."""
    r = random.Random(graine)
    w, h = 14, 12
    t = petite(w, h, 10, (5, 1.5))
    chapeaux = [((176, 30, 30), (224, 70, 50), (120, 20, 20)), ((104, 66, 34), (150, 102, 56), (70, 42, 22)),
                ((196, 170, 120), (226, 204, 156), (150, 124, 84)), ((214, 210, 196), (240, 238, 228), (170, 164, 150))][variante]
    poses = [[(7, 10, 3)], [(5, 10, 3), (9, 10, 2)], [(4, 10, 2), (7, 9, 2), (10, 10, 2)], [(6, 10, 3), (9, 10, 2)]][variante]
    for cx, pied, rr in poses:
        # le pied
        for y in range(pied - rr, pied + 1):
            t.pose(cx, y, (226, 218, 200))
            t.pose(cx + 1, y, (186, 176, 160))
        # le chapeau
        for y in range(pied - rr * 2 - 1, pied - rr + 1):
            for x in range(cx - rr, cx + rr + 2):
                d = ((x + 0.5 - cx - 0.5) / (rr + 0.6)) ** 2 + ((y + 0.5 - (pied - rr)) / (rr + 0.4)) ** 2
                if d <= 1 and y <= pied - rr:
                    c = chapeaux[1] if x <= cx and y < pied - rr - 1 else chapeaux[0] if y < pied - rr else chapeaux[2]
                    t.pose(x, y, c)
        if variante == 0:
            for dx, dy in [(-1, -4), (1, -5), (2, -3)]:
                t.pose(cx + dx, pied + dy, (250, 246, 236))
    return fini(t, 7, 10, (40, 24, 16))


def touffe(graine, w, h, rampe, brins, haut, large, clair=0):
    """Une touffe d'herbe : des brins en éventail, plus clairs au bout, contour sombre."""
    r = random.Random(graine)
    t = petite(w, h, h - 3, (w * 0.32, 1.6))
    pied = h - 3
    for k in range(brins):
        a = (k / max(1, brins - 1) - 0.5) * large + r.uniform(-0.15, 0.15)
        L = haut * r.uniform(0.6, 1.0) * (1 - 0.25 * abs(a))
        for d in range(int(L)):
            f = d / L
            x = w / 2 + math.sin(a) * L * f + math.sin(a) * 2 * f * f
            y = pied - math.cos(a) * L * f
            t.pose(int(round(x)), int(round(y)), sur(rampe, 2.2 + 3.6 * f + clair + (0.8 if a < 0 else 0)))
    return t, w // 2, pied


def bruyere(graine, variante):
    """De la bruyère : un coussin bas de rameaux sombres, en fleur (rose, mauve) ou non."""
    r = random.Random(graine)
    w, h = 16, 11
    t = petite(w, h, 8, (6.5, 1.8))
    bosses = [(8, 8, 5.5, 0.6), (4.5, 9, 3.5, 0.6), (11.5, 9, 3.8, 0.6)]
    hb = champ_bosses([(a + r.uniform(-0.6, 0.6), b, c, d) for a, b, c, d in bosses], graine, bosse=0.2)
    rampe = [(26, 30, 12), (38, 44, 16), (52, 62, 22), (70, 82, 30), (92, 104, 40), (118, 124, 52), (146, 146, 70), (176, 170, 96)]
    if variante == 5:
        rampe = [(32, 30, 18), (48, 46, 26), (66, 64, 36), (86, 84, 48), (106, 104, 62), (128, 124, 78), (150, 144, 96), (174, 166, 118)]
    sub = Toile(w, h)
    lum = feuillage(sub, hb, rampe, graine, pas=2, base=1.8, etendue=4.0, creux=1.6)
    for k, c in sub.px.items():
        t.px[k] = c
    if variante < 3:
        fl = [[(110, 40, 100), (176, 82, 168), (226, 146, 214)], [(120, 50, 110), (196, 100, 176), (240, 170, 220)], [(90, 40, 110), (150, 84, 170), (200, 150, 220)]][variante]
        fleurit(t, lum, fl, graine + 7, 0.4, haut=0.3)
    return fini(t, 8, 8, (18, 20, 8))


def jonc(graine, variante):
    """Des joncs : une touffe serrée de tiges droites, vert sombre, un bouquet brun sur le côté."""
    t, fx, fy = touffe(graine, 16, 18, RAMPE_SAPIN, 14 + variante * 2, 14, 1.0, clair=-0.4)
    r = random.Random(graine)
    for k in range(2):
        x, y = r.randint(4, 9), r.randint(5, 8)
        t.pose(x, y, (120, 82, 44))
        t.pose(x + 1, y, (90, 60, 30))
    return fini(t, fx, fy, (10, 30, 14))


def herbe_seche(graine, variante):
    rampe = [(54, 44, 14), (84, 70, 22), (116, 98, 36), (146, 126, 50), (176, 152, 70), (200, 178, 96), (222, 204, 130), (240, 228, 170)]
    t, fx, fy = touffe(graine, 16, 16, rampe, 9 + variante * 2, 11 + variante, 1.6)
    return fini(t, fx, fy, (46, 36, 12))


def oyat(graine, variante):
    """Des oyats : une touffe de longues feuilles fines et arquées, vert pâle bleuté, couleur paille
    au bout."""
    rampe = [(56, 70, 44), (80, 98, 62), (106, 126, 82), (134, 154, 104), (164, 178, 126), (192, 198, 146), (216, 214, 166), (236, 230, 190)]
    t, fx, fy = touffe(graine, 18, 18, rampe, 10 + variante, 13 + variante % 2 * 2, 2.2)
    return fini(t, fx, fy, (58, 64, 36))


def chardon(graine, variante):
    """Un chardon bleu des dunes : des feuilles épineuses gris-bleu, deux ou trois têtes bleues."""
    r = random.Random(graine)
    w, h = 14, 14
    t = petite(w, h, 11, (5, 1.6))
    for k in range(9):
        a = (k / 8 - 0.5) * 2.6
        L = r.uniform(3, 5.5)
        for d in range(int(L * 1.5)):
            f = d / (L * 1.5)
            x, y = 7 + math.sin(a) * L * f, 11 - math.cos(a) * L * f * 0.8
            t.pose(int(round(x)), int(round(y)), (124, 152, 160) if a < 0 else (92, 120, 134))
            if d == int(L * 1.5) - 1:
                t.pose(int(round(x + math.sin(a))), int(round(y)) - 1, (170, 196, 204))
    for x, y in [(5, 4), (9, 3), (7, 6)][:2 + variante]:
        for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1)]:
            t.pose(x + dx, y + dy, (88, 104, 186) if dx else (134, 150, 222))
        t.pose(x, y - 1, (180, 196, 236))
    return fini(t, 7, 11, (36, 52, 64))


def bois_flotte(graine, variante):
    """Du bois flotté : une branche blanchie par la mer, couchée sur le sable, une fourche."""
    w, h = 20, 9
    t = petite(w, h, 6, (8, 1.4))
    pts = [(2, 5), (6, 5), (10, 4), (14, 4), (17, 3)] if variante == 0 else [(2, 4), (7, 5), (12, 5), (17, 6)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for d in range(x1 - x0 + 1):
            x = x0 + d
            y = round(y0 + (y1 - y0) * d / max(1, x1 - x0))
            t.pose(x, y - 1, (226, 218, 198))
            t.pose(x, y, (184, 172, 150))
    fx, fy = (10, 4) if variante == 0 else (12, 5)
    for d in range(4):
        t.pose(fx + d, fy - 1 - d, (210, 200, 178))
    return fini(t, 10, 6, (96, 86, 70))


def touffe_mont(graine, variante):
    t, fx, fy = touffe(graine, 14, 14, RAMPE_MONT, 8 + variante, 9, 1.5, clair=0.5)
    fl = [(240, 240, 236), (250, 214, 60), (70, 100, 220)][variante]
    r = random.Random(graine)
    for k in range(2):
        x, y = r.randint(3, 10), r.randint(3, 7)
        t.pose(x, y, fl)
    return fini(t, fx, fy, (16, 36, 26))


def nenuphar(graine, variante):
    """Des nénuphars sur l'eau basse : des feuilles rondes (vues de biais : des ovales), échancrées,
    claires au bord éclairé ; une fleur blanche ou rose sur les deux dernières variantes."""
    r = random.Random(graine)
    w, h = 18, 11
    t = Toile(w, h)
    feuilles = [[(9, 6, 5)], [(6, 6, 4), (12, 5, 3.5)], [(8, 6, 4.5), (13, 7, 3)], [(7, 5, 4), (12, 7, 3.5)]][variante]
    for cx, cy, rr in feuilles:
        enc = r.uniform(0, 2 * math.pi)
        for y in range(h):
            for x in range(w):
                dx, dy = (x + 0.5 - cx) / rr, (y + 0.5 - cy) / (rr * 0.6)
                d = dx * dx + dy * dy
                if d > 1:
                    continue
                a = math.atan2(dy, dx)
                if abs(((a - enc + math.pi) % (2 * math.pi)) - math.pi) < 0.28 and d > 0.05:
                    continue                                   # l'échancrure
                k = 3.4 - 1.6 * (dx + dy) * 0.6 + (1.0 if d > 0.6 and dx + dy < 0 else 0)
                t.pose(x, y, sur(RAMPE_FORET, k + 0.6))
        # les nervures
        for d in range(int(rr) - 1):
            t.pose(int(cx) + d, int(cy), sur(RAMPE_FORET, 3))
    if variante >= 2:
        cx, cy = feuilles[0][0], feuilles[0][1] - 1
        pet = [(236, 236, 226), (255, 255, 250)] if variante == 2 else [(226, 140, 176), (250, 196, 216)]
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (-1, -1), (1, -1), (0, 1)]:
            t.pose(cx + dx, cy + dy, pet[0] if dy >= 0 else pet[1])
        t.pose(cx, cy, (240, 200, 40))
    return fini(t, 9, 7, (14, 46, 30))


def deco_ferme(rangee, colonnes, assombri=1.0):
    """Des décors de l'herbe de la ferme (assets/herbe_deco.png, tuiles de 16 × 16 : rangée, colonnes),
    tels quels (ou assombris), le pied au milieu du bas de la tuile."""
    planche = Image.open(os.path.join(ASSETS, 'herbe_deco.png')).convert('RGBA')
    out = []
    for c in colonnes:
        im = planche.crop((c * 16, rangee * 16, c * 16 + 16, rangee * 16 + 16))
        if assombri != 1.0:
            px = im.load()
            for y in range(16):
                for x in range(16):
                    p = px[x, y]
                    if p[3]:
                        px[x, y] = (round(p[0] * assombri * 0.9), round(p[1] * assombri), round(p[2] * assombri * 0.9), p[3])
        out.append((im, 8, 13))
    return out


# ---------- la planche ----------

def charge_sortes():
    with open(DONNEES, encoding='utf-8') as f:
        d = json.load(f)
    return d['VEGETATION']['SORTES']


def dessins():
    """{ sorte: [(image, px, py)…] } (pour une plante qui penche : cinq images par variante)."""
    out = {}
    g = 11
    out['feuillu'] = []
    for k, (forme, rampe) in enumerate([('rond', RAMPE_FORET), ('large', RAMPE_FORET), ('haut', RAMPE_FORET),
                                        ('rond', RAMPE_OLIVE), ('large', RAMPE_OLIVE), ('haut', RAMPE_OLIVE)]):
        t, fx, fy = feuillu(forme, rampe, g + k * 13)
        out['feuillu'].append((t.image(), fx, fy))
    out['bouleau'] = [(lambda t: (t[0].image(), t[1], t[2]))(bouleau(200 + k * 7, k)) for k in range(3)]
    out['sapin'] = []
    for k, (w, h, rampe) in enumerate([(40, 66, RAMPE_SAPIN), (36, 58, RAMPE_SAPIN), (42, 70, RAMPE_PIN), (34, 54, RAMPE_PIN)]):
        t, fx, fy = sapin(w, h, rampe, 300 + k * 5, etages=7 if h > 60 else 6)
        out['sapin'].append((t.image(), fx, fy))
    out['saule'] = [(lambda t: (t[0].image(), t[1], t[2]))(saule(400 + k * 3, k)) for k in range(2)]
    out['pin_tordu'] = [(lambda t: (t[0].image(), t[1], t[2]))(pin_tordu(500 + k * 9, k)) for k in range(2)]
    out['sapin_nain'] = []
    for k, (w, h, a) in enumerate([(26, 38, 0.15), (22, 32, -0.2), (28, 42, 0.3)]):
        t, fx, fy = sapin(w, h, RAMPE_MONT, 600 + k * 5, etages=5 if h > 36 else 4, asym=a, sec=True, tronc_h=4)
        out['sapin_nain'].append((t.image(), fx, fy))
    pre = [(Image.open(os.path.join(ORIG, 'arbre_feuillu.png')).convert('RGBA'), 24, 61)]
    for k, forme in enumerate(['large', 'haut']):
        t, fx, fy = feuillu(forme, RAMPE_PRE, 700 + k * 11)
        pre.append((t.image(), fx, fy))
    out['arbre_pre'] = pre
    out['buisson_pre'] = buissons_ferme()
    une = lambda f, g0, n: [(lambda t: (t[0].image(), t[1], t[2]))(f(g0 + k * 17, k)) for k in range(n)]  # noqa: E731
    out['ronces'] = une(ronces, 800, 3)
    out['souche'] = une(souche, 820, 3)
    out['tronc_couche'] = une(tronc_couche, 840, 2)
    out['ajonc'] = une(ajonc, 860, 3)
    out['genet'] = une(genet, 880, 2)
    out['rhododendron'] = une(rhododendron, 900, 2)
    out['roseaux'] = [im for k in range(3) for im in roseaux(920 + k * 7, k)]
    out['massette'] = [im for k in range(2) for im in massette(940 + k * 7, k)]
    out['fougere'] = [fougere(960 + k * 5, k) for k in range(4)]
    out['champignons'] = [champignons(980 + k * 5, k) for k in range(4)]
    out['touffe_foret'] = deco_ferme(3, (0, 3, 13), 0.78)
    out['bruyere'] = [bruyere(1000 + k * 5, k) for k in range(6)]
    out['herbe_seche'] = [herbe_seche(1040 + k * 5, k) for k in range(3)]
    out['jonc'] = [jonc(1060 + k * 5, k) for k in range(3)]
    out['nenuphar'] = [nenuphar(1080 + k * 5, k) for k in range(4)]
    out['oyat'] = [oyat(1100 + k * 5, k) for k in range(4)]
    out['chardon'] = [chardon(1120 + k * 5, k) for k in range(2)]
    out['bois_flotte'] = [bois_flotte(1140 + k * 5, k) for k in range(2)]
    out['touffe_mont'] = [touffe_mont(1160 + k * 5, k) for k in range(3)]
    # (les décors de l'herbe de la ferme : une rangée par teinte de l'herbe)
    out['fleurs'] = [im for te in range(4) for im in deco_ferme(4 + te, (1, 5, 9, 14))]
    out['touffe_pre'] = [im for te in range(4) for im in deco_ferme(te, (0, 3, 7, 13))]
    return out


def planche(sortes, d):
    """Range les dessins par rangées (de même hauteur, triés), et la table des images."""
    items = []
    for s in sortes:
        nom, n = s['nom'], s['variantes'] * (5 if s.get('penche') else 1)
        imgs = d.get(nom, [])
        assert len(imgs) == n, f'{nom} : {len(imgs)} images dessinées, il en faut {n} (data/monde.json)'
        for k, (im, px, py) in enumerate(imgs):
            bb = im.getbbox() or (0, 0, 1, 1)
            items.append((nom, k, im, px, py))
    # des rangées de gauche à droite, chaque dessin à sa place (1 px d'écart : pas de bavure)
    x = y = haut = 0
    places = {}
    for nom, k, im, px, py in items:
        if x + im.width > LARGEUR_PLANCHE:
            x, y, haut = 0, y + haut + 1, 0
        places[(nom, k)] = (x, y)
        x += im.width + 1
        haut = max(haut, im.height)
    out = Image.new('RGBA', (LARGEUR_PLANCHE, y + haut), (0, 0, 0, 0))
    table = {}
    for nom, k, im, px, py in items:
        x, y = places[(nom, k)]
        out.alpha_composite(im, (x, y))
        table.setdefault(nom, []).append([x, y, im.width, im.height, px, py])
    return out, table


def main():
    sortes = charge_sortes()
    d = dessins()
    img, table = planche(sortes, d)
    img.save(SORTIE)
    with open(SORTIE_JSON, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/vegetation.png : {img.width} × {img.height}, {sum(len(v) for v in table.values())} images')
    if '--apercu' in sys.argv:
        apercu(img, table)


def apercu(img, table):
    fond = Image.new('RGBA', img.size, (76, 99, 41, 255))
    fond.alpha_composite(img)
    ferme = Image.open(os.path.join(ORIG, 'arbre_feuillu.png')).convert('RGBA')
    pin = Image.open(os.path.join(ASSETS, 'pin_clair.png')).convert('RGBA')
    out = Image.new('RGBA', (fond.width + 130, max(fond.height, 70)), (132, 165, 52, 255))
    out.alpha_composite(fond, (130, 0))
    out.alpha_composite(ferme, (2, 2))
    out.alpha_composite(pin, (56, 2))
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_vegetation.png'))
    print('apercu_vegetation.png')


if __name__ == '__main__':
    main()
