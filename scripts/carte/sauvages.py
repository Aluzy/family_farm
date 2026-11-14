#!/usr/bin/env python3
"""Les plants sauvages de l'île (le chantier « l'île à bâtir », fiche I7e : data/village.json VILLAGE.SAUVAGES) : l'ail
des ours des sous-bois et la salicorne des plages, vus de haut à 45° (comme la carte), lumière en haut à gauche.

Deux usages :
  - dans le grand monde, une petite plante (genre « basse », data/monde.json VEGETATION.SORTES : ail_ours_sauvage,
    salicorne_sauvage) : scripts/carte/vegetation.py appelle ail_ours_monde() et salicorne_monde() (deux variantes
    chacune ; une ombre douce au pied, comme les autres petites plantes du monde) ;
  - sur la ferme, la culture (data/crops.json : ail_ours, salicorne) : ses quatre phases (le plant repiqué, la jeune
    pousse, la touffe, la plante mûre : l'ail en fleurs, la salicorne rougie) dessinées dans la source des cultures
    (scripts/carte/sources/cultures.png, à leur place : planche_cultures.py SOURCE, la rangée 8), sur la butte de terre
    de la tomate, comme la vigne (scripts/carte/vigne.py) ; puis : python3 scripts/carte/planche_cultures.py.

Les nuances (CLAUDE.md, la règle de dessin) : des rampes fines (scripts/carte/nuances.py, 128 tons), plusieurs rampes
voisines par matière tirées feuille par feuille, tige par tige ; chaque feuille modelée (sa nervure, son bord gauche
éclairé, son bord droit et sa base dans l'ombre, sa pointe plus chaude) ; les ombres tirent vers le froid, les
lumières vers le chaud ; l'occlusion au pied ; un contour sombre d'un pixel. Une feuille qui s'avance vers nous montre
son dessus, raccourci (FOND : 10/16) ; une tige montre le dessus de son bout (un petit disque clair).

Usage (depuis la racine du dépôt) :
    python3 scripts/carte/sauvages.py             dessine les cultures dans la source (puis planche_cultures.py)
    python3 scripts/carte/sauvages.py --apercu    écrit aussi apercu_sauvages.png (agrandi, sur la terre et le sol)
    python3 scripts/carte/sauvages.py --couleurs  compte les couleurs de chaque dessin
"""
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from nuances import bruit, rampe, ton  # noqa: E402

SRC = os.path.join(HERE, 'sources', 'cultures.png')
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
T = 16
L, H = 24, 44                    # une case de la planche des cultures
BAS, CX = 39, 12                 # le bas de la butte, le pied de la plante, dans le dessin de L × H
TOMATE = (27, 32, 11)            # la pousse de la tomate dans la source : sa rangée du bas, sa hauteur, sa colonne
PLACES = {                       # les cultures dans la source (planche_cultures.py SOURCE)
    'ail_ours': (8, 32, [0, 2, 4, 6]),
    'salicorne': (8, 32, [8, 10, 12, 14]),
}
FOND = 10 / 16                   # une profondeur de p px se voit sur p × FOND rangées (scripts/carte/blocs.py)
N = 128                          # les tons d'une rampe

# ---------- les rampes : du sombre (froid) au clair (chaud) ----------

# l'ail des ours : un vert tendre et brillant, trois rampes voisines (plus jaune, plus bleu, plus franc)
VERTS_AIL = [
    rampe([(8, 26, 30), (16, 52, 40), (30, 92, 46), (58, 138, 52), (110, 182, 70), (186, 222, 120)], N),
    rampe([(8, 28, 36), (14, 56, 48), (28, 98, 56), (54, 142, 62), (104, 186, 82), (176, 224, 132)], N),
    rampe([(10, 26, 24), (20, 54, 34), (40, 96, 40), (72, 142, 46), (128, 186, 64), (204, 226, 118)], N),
]
# ses fleurs : un blanc qui bleuit dans l'ombre et dore à la lumière ; leur cœur vert-jaune
BLANC = rampe([(70, 84, 104), (130, 146, 166), (196, 206, 214), (236, 238, 232), (255, 252, 236)], N)
COEUR = rampe([(96, 112, 40), (156, 170, 60), (214, 216, 110)], N)
TIGE_AIL = rampe([(20, 46, 34), (46, 96, 50), (92, 150, 70), (150, 196, 104)], N)
# la salicorne : un vert gras de plante charnue (trois rampes), et le rouge pourpre de ses pointes à la fin de l'été
VERTS_SAL = [
    rampe([(14, 34, 30), (34, 70, 40), (66, 118, 46), (112, 160, 58), (172, 204, 96), (220, 232, 150)], N),
    rampe([(12, 34, 38), (28, 72, 52), (58, 120, 62), (104, 164, 74), (164, 206, 110), (214, 234, 160)], N),
    rampe([(18, 34, 26), (44, 72, 34), (82, 118, 38), (130, 160, 48), (186, 200, 84), (228, 230, 140)], N),
]
POURPRE = rampe([(40, 10, 34), (84, 18, 52), (128, 30, 66), (166, 52, 80), (198, 98, 108), (226, 156, 158)], N)
CONTOUR = (12, 30, 24)
CONTOUR_SAL = (20, 30, 22)


def melange(a, b, f):
    return tuple(round(a[k] * (1 - f) + b[k] * f) for k in range(3))


class Toile:
    """Une image en construction : des pixels {(x, y): (r, g, b, a)}, w × h."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}

    def pose(self, x, y, c, a=255):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = tuple(c[:3]) + (a,)

    def a(self, x, y):
        return (x, y) in self.px and self.px[(x, y)][3] > 128

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), c)
        return im


def contour(t, couleur):
    """Un contour d'un pixel autour du dessin (sur les pixels vides qui touchent un pixel plein)."""
    ajout = []
    for y in range(t.h):
        for x in range(t.w):
            if t.a(x, y):
                continue
            if any(t.a(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                ajout.append((x, y))
    for x, y in ajout:
        # (le contour du bas, sous la plante, un peu plus sombre ; celui du haut à gauche, un peu moins)
        k = 0.82 if t.a(x, y - 1) else 1.12 if (t.a(x + 1, y) or t.a(x, y + 1)) and not t.a(x - 1, y) else 1.0
        t.pose(x, y, tuple(min(255, round(v * k)) for v in couleur))


def ombre_douce(t, cx, cy, rx, ry, couleur=(14, 26, 30), force=110):
    """L'ombre au pied (posée avant la plante) : une ellipse douce, plus dense au centre, sans bord dur."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d >= 1:
                continue
            a = round(force * (1 - d) ** 1.3)
            if a > 6:
                t.pose(x, y, couleur, a)


# ---------- l'ail des ours ----------

def feuille_ail(t, r, x0, y0, angle, long, large, rmp, devant=0.0):
    """Une feuille d'ail des ours : elliptique, pointue, sa nervure au milieu, de la base (x0, y0) vers `angle` (0 : vers le
    haut ; négatif : à gauche). `devant` (0 à 1) : elle s'avance vers nous, couchée : son dessus raccourci (FOND), plus
    éclairé. Le modelé : le bord gauche (au soleil) plus clair, le droit plus sombre et plus froid, la base dans
    l'ombre du cœur, la pointe plus chaude."""
    ca, sa = math.cos(angle), math.sin(angle)
    raccourci = 1 - devant * (1 - FOND)
    ret = r.uniform(0.15, 0.35)                     # (la feuille retombe un peu vers sa pointe)
    pas = 0.35
    vus = {}
    n = int(long / pas)
    for k in range(n + 1):
        f = k / n
        hw = large * math.sin(math.pi * min(1.0, f ** 0.75)) ** 0.9
        cx = x0 + sa * long * f
        cy = y0 - ca * long * f * raccourci + ret * long * f * f * (0.5 + 0.5 * abs(sa)) * (1 - devant)
        u = -hw
        while u <= hw:
            x, y = cx + ca * u, cy + sa * u * raccourci
            cote = u / (hw + 1e-6)                  # -1 : le bord gauche (vers la lumière), 1 : le droit
            nerv = abs(u) < 0.45
            v = 0.42 + 0.20 * (-cote) + 0.18 * f + 0.10 * devant
            v -= 0.22 * max(0.0, 0.22 - f) / 0.22   # (la base, dans l'ombre du cœur)
            if abs(cote) > 0.8:
                v -= 0.10                           # (le bord, il tourne)
            if nerv:
                v += 0.16
            v += 0.035 * bruit(x * 3, y * 3, 7)
            vus[(int(round(x)), int(round(y)))] = v
            u += pas
    for (x, y), v in vus.items():
        # (son bord à l'ombre, à droite et en bas, plus sombre et plus froid : il la détache de la feuille de dessous)
        if (x + 1, y) not in vus or (x, y + 1) not in vus:
            v -= 0.16
        c = ton(rmp, v)
        if v < 0.4:
            c = melange(c, (20, 40, 70), 0.18 * (0.4 - v) / 0.4)   # (l'ombre tire vers le froid)
        t.pose(x, y, c)


def ombelle(t, r, x, y, n=6):
    """Une ombelle de fleurs blanches en étoile, vue d'en haut et de devant : le dessus des fleurs du haut plus clair,
    celles du bas (sous les autres) bleutées ; un cœur vert-jaune."""
    fleurs = []
    for k in range(n):
        a = k / n * 2 * math.pi + r.uniform(-0.25, 0.25)
        d = r.uniform(0.9, 1.8)
        fleurs.append((x + math.cos(a) * d, y + math.sin(a) * d * FOND))
    fleurs.sort(key=lambda p: p[1])
    for fx, fy in fleurs:
        haut = (y + 2 - fy) / 4                     # (les fleurs du haut de l'ombelle : au soleil)
        for dx, dy, v in ((0, 0, 0.92), (-1, 0, 0.80), (1, 0, 0.55), (0, -1, 0.97), (0, 1, 0.45)):
            vv = v * (0.7 + 0.3 * haut) + 0.03 * bruit(fx + dx, fy + dy, 11)
            t.pose(round(fx) + dx, round(fy) + dy, ton(BLANC, vv))
        t.pose(round(fx), round(fy), ton(COEUR, 0.5 + 0.4 * haut))
    t.pose(round(x), round(y), ton(COEUR, 0.25))


def tige(t, x0, y0, x1, y1, rmp):
    n = max(1, int(abs(y1 - y0) + abs(x1 - x0)))
    for k in range(n + 1):
        f = k / n
        x, y = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
        t.pose(round(x), round(y), ton(rmp, 0.35 + 0.45 * f))


def touffe_ail(t, r, cx, pied, nombre, long, large, fleurs=0, ouverture=1.0):
    """La touffe : `nombre` feuilles en éventail depuis le pied, celles du fond (vers le haut) d'abord, celles qui
    s'avancent vers nous ensuite ; `fleurs` ombelles sur leur tige, au-dessus."""
    feuilles = []
    for k in range(nombre):
        u = (k / max(1, nombre - 1) - 0.5) * 2 if nombre > 1 else 0.0
        a = u * 1.35 * ouverture + r.uniform(-0.12, 0.12)
        devant = max(0.0, abs(u) - 0.55) * 1.6 * ouverture
        feuilles.append((devant, a, long * r.uniform(0.82, 1.08) * (1 - 0.25 * abs(u)), large * r.uniform(0.85, 1.1)))
    # (les tiges des fleurs, derrière les feuilles)
    hampes = []
    for k in range(fleurs):
        hx = cx + (k - (fleurs - 1) / 2) * 4 + r.uniform(-0.8, 0.8)
        hy = pied - long * r.uniform(1.35, 1.55)
        tige(t, cx + (k - (fleurs - 1) / 2), pied - 1, hx, hy + 1, TIGE_AIL)
        hampes.append((hx, hy))
    for devant, a, lg, lr in sorted(feuilles, key=lambda f: (f[0], -abs(f[1]))):
        feuille_ail(t, r, cx + r.uniform(-0.6, 0.6), pied - 0.5, a, lg, lr, VERTS_AIL[r.randrange(3)], devant)
    for hx, hy in hampes:
        ombelle(t, r, hx, hy)
    # (l'occlusion : le cœur, au pied, plus sombre)
    for dx in range(-2, 3):
        for dy in range(0, 2):
            p = (round(cx) + dx, round(pied) - dy)
            if p in t.px and t.px[p][3] == 255:
                c = t.px[p]
                t.pose(p[0], p[1], melange(c, (14, 30, 34), 0.35 - 0.1 * abs(dx)))


def ail_ours_monde(variante):
    """L'ail des ours dans les sous-bois du monde : une touffe de larges feuilles, en fleurs (deux variantes)."""
    r = random.Random(7101 + variante * 13)
    w, h, pied = 20, 20, 16
    t = Toile(w, h)
    ombre_douce(t, w / 2, pied + 0.3, 6.5, 2.0)
    touffe_ail(t, r, w / 2, pied, 6 if variante == 0 else 5, 7.5 if variante == 0 else 6.8, 1.9, fleurs=2 if variante == 0 else 1)
    contour(t, CONTOUR)
    return (t.image(), w // 2, pied)


# ---------- la salicorne ----------

def brin(t, r, x, pied, haut, rmp, rouge=0.0, branches=1):
    """Un brin de salicorne : une tige charnue de deux px, articulée (un nœud plus sombre tous les trois px), le px de
    gauche au soleil, celui de droite à l'ombre ; son bout montre son dessus (un petit disque clair) ; `rouge` (0 à 1) :
    sa pointe rougit. Des rameaux plus courts partent de ses nœuds, en biais."""
    def segment(x0, y0, x1, y1, f0, f1):
        n = max(1, int(round(abs(y1 - y0))))
        for k in range(n + 1):
            f = k / n
            xx, yy = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
            g = f0 + (f1 - f0) * f                    # (de 0 au pied à 1 au bout)
            noeud = (int(round(pied - yy)) % 3) == 0
            for dx, v in ((0, 0.58), (1, 0.32)):
                vv = v + 0.28 * g - (0.14 if noeud else 0.0) + 0.04 * bruit(xx * 2 + dx, yy * 2, 5)
                vv -= 0.18 * max(0.0, 0.25 - g)       # (le pied, dans l'ombre des autres brins)
                # (la pointe rougit : le pourpre au même ton, sur la part `rouge` du haut du brin)
                c = ton(POURPRE, vv) if rouge and g > 1 - 0.45 * rouge else ton(rmp, vv)
                t.pose(round(xx) + dx, round(yy), c)
        # le bout : son dessus, un disque clair raccourci
        bx, by = round(x1), round(y1)
        R = POURPRE if rouge else rmp
        t.pose(bx, by - 1, ton(R, 0.92))
        t.pose(bx + 1, by - 1, ton(R, 0.72))
    penche = r.uniform(-1.5, 1.5)
    segment(x, pied, x + penche, pied - haut, 0.0, 1.0)
    for k in range(branches):
        h0 = haut * r.uniform(0.35, 0.6)
        sens = -1 if (k + int(x)) % 2 == 0 else 1
        bx0, by0 = x + penche * h0 / haut + (1 if sens > 0 else 0), pied - h0
        lg = haut * r.uniform(0.3, 0.5)
        segment(bx0, by0, bx0 + sens * lg * 0.55, by0 - lg, 0.45, 1.0)


def touffe_sal(t, r, cx, pied, nombre, haut, rouge=0.0, ecart=3.0):
    brins = []
    for k in range(nombre):
        u = (k / max(1, nombre - 1) - 0.5) * 2 if nombre > 1 else 0.0
        brins.append((cx + u * ecart * (nombre - 1) / 2 + r.uniform(-0.3, 0.3), haut * r.uniform(0.75, 1.05) * (1 - 0.3 * abs(u)), abs(u)))
    # (ceux du milieu, les plus hauts, derrière ; ceux des côtés devant)
    for x, hh, u in sorted(brins, key=lambda b: b[2]):
        brin(t, r, x - 0.5, pied, hh, VERTS_SAL[r.randrange(3)], rouge, branches=1 if hh > 6 else 0)
    for dx in range(-3, 4):
        p = (round(cx) + dx, round(pied))
        if p in t.px and t.px[p][3] == 255:
            t.pose(p[0], p[1], melange(t.px[p], (20, 28, 34), 0.3))


def salicorne_monde(variante):
    """La salicorne des plages du monde : une touffe de brins charnus, leurs pointes rougies (deux variantes)."""
    r = random.Random(7203 + variante * 17)
    w, h, pied = 20, 18, 15
    t = Toile(w, h)
    ombre_douce(t, w / 2, pied + 0.3, 6.5, 1.8, (60, 52, 40), 100)
    touffe_sal(t, r, w / 2 - 0.5, pied, 4 if variante == 0 else 3, 10 if variante == 0 else 8.5, rouge=0.6 if variante == 0 else 0.35)
    contour(t, CONTOUR_SAL)
    return (t.image(), w // 2, pied)


# ---------- les cultures, dans la source ----------

def butte_tomate(src):
    """La butte de la pousse de tomate : ses 3 rangées du bas (sa terre et son contour) → [(dx, dy, couleur)]
    (comme scripts/carte/vigne.py)."""
    r, h, col = TOMATE
    px = src.load()
    x0, y1 = col * T, (r + 1) * T
    pts = [(x, y) for y in range(y1 - h, y1 + 5) for x in range(x0 - 3, x0 + T + 3) if px[x, y][3]]
    b = max(y for _, y in pts)
    terre = {(56, 36, 22), (84, 56, 34), (124, 88, 54), (80, 54, 30), (128, 92, 54), (103, 73, 55), (90, 43, 30), (14, 38, 18)}
    bas = [(x, y) for x, y in pts if y > b - 3 and px[x, y][:3] in terre]
    cx = (min(x for x, _ in bas) + max(x for x, _ in bas) + 1) / 2
    return [(round(x - cx), y - b, px[x, y][:3]) for x, y in bas]


def culture(nom, phase, butte):
    """La phase `phase` (0 : le plant repiqué … 3 : mûre) de la culture `nom`, dans une case de L × H."""
    t = Toile(L, H)
    if nom == 'ail_ours':
        r = random.Random(7400 + phase * 11)
        n, lg, lr, fl, ouv = [(2, 4.0, 1.2, 0, 0.5), (3, 6.0, 1.6, 0, 0.8), (5, 8.5, 2.1, 0, 1.0), (6, 9.5, 2.3, 2, 1.0)][phase]
        touffe_ail(t, r, CX, BAS - 2, n, lg, lr, fleurs=fl, ouverture=ouv)
        couleur = CONTOUR
    else:
        r = random.Random(7500 + phase * 11)
        n, hh, rouge = [(2, 4.0, 0.0), (3, 7.5, 0.0), (4, 11.0, 0.15), (5, 13.5, 0.6)][phase]
        touffe_sal(t, r, CX - 0.5, BAS - 2, n, hh, rouge=rouge, ecart=2.6)
        couleur = CONTOUR_SAL
    contour(t, couleur)
    for dx, dy, c in butte:
        if not t.a(CX + dx, BAS + dy):
            t.pose(CX + dx, BAS + dy, c)
    return t.image()


def couleurs(im):
    return len({im.getpixel((x, y)) for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[3] > 0})


def main():
    src = Image.open(SRC).convert('RGBA')
    butte = butte_tomate(src)
    faits = {}
    for nom, (r, h, cols) in PLACES.items():
        for phase, col in enumerate(cols):
            x0, y1 = col * T, (r + 1) * T
            # (la case de la source, et ce qui déborde autour : effacés, puis le dessin, le bas de sa butte 1 px sous la case)
            src.paste(Image.new('RGBA', (T + 8, h + 12), (0, 0, 0, 0)), (max(0, x0 - 4), y1 - h - 8))
            d = culture(nom, phase, butte)
            faits[(nom, phase)] = d
            x, y = x0 + T // 2 - CX, y1 + 1 - BAS
            if x < 0:                                   # (la colonne 0 : les colonnes vides du dessin, à gauche, coupées)
                assert not d.crop((0, 0, -x, H)).getbbox()
                d, x = d.crop((-x, 0, L, H)), 0
            src.alpha_composite(d, (x, y))
    src.save(SRC, optimize=True)
    print('scripts/carte/sources/cultures.png : l\'ail des ours et la salicorne (rangée 8) ; puis : python3 scripts/carte/planche_cultures.py')
    if '--couleurs' in sys.argv:
        for (nom, phase), d in faits.items():
            print(f'  {nom} {phase} : {couleurs(d)} couleurs')
        for k in range(2):
            print(f'  ail_ours_sauvage {k} : {couleurs(ail_ours_monde(k)[0])} couleurs ; salicorne_sauvage {k} : {couleurs(salicorne_monde(k)[0])} couleurs')
    if '--apercu' in sys.argv:
        apercu(faits)


def apercu(faits):
    """Agrandi ×6 : les quatre phases de chaque culture sur la terre, puis les plantes du monde sur la mousse et le sable."""
    out = Image.new('RGBA', (L * 4 + 8 + 2 * 22, H * 2), (96, 68, 44, 255))
    for k, nom in enumerate(PLACES):
        for ph in range(4):
            out.alpha_composite(faits[(nom, ph)], (ph * L, k * H))
    fonds = [(58, 84, 40, 255), (222, 196, 140, 255)]
    for k, f in enumerate((ail_ours_monde, salicorne_monde)):
        for v in range(2):
            im = f(v)[0]
            fond = Image.new('RGBA', (22, 22), fonds[k])
            fond.alpha_composite(im, (1, 1))
            out.alpha_composite(fond, (L * 4 + 8 + v * 22, k * H + 10))
    out.resize((out.width * 6, out.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_sauvages.png'))
    print('apercu_sauvages.png')


if __name__ == '__main__':
    main()
