# Le port de l'île (le chantier « l'île à bâtir », docs/ile.md, fiche I1a) : ses dessins, rangés à la suite de ceux
# des hameaux dans leur planche (scripts/carte/hameaux.py les y met : assets/hameaux.png, hameaux.json ; les sortes
# et leurs variantes sont celles de data/village.json, PORT.SORTES).
#
#   python3 scripts/carte/port.py               pose les dessins du port dans la planche des hameaux telle qu'elle
#                                               est (assets/hameaux.png, hameaux.json), sous ses images, sans
#                                               redessiner celles des hameaux (elles ne bougent pas d'un pixel) ;
#                                               relancé, il remplace ceux qu'il y avait mis ; compte leurs couleurs
#   python3 scripts/carte/port.py --apercu      écrit aussi apercu_port.png (les dessins agrandis, sur l'eau et sur
#                                               l'herbe)
#   python3 scripts/carte/hameaux.py            refait toute la planche des hameaux, le port compris
#
# Tout est vu de haut à 45° (CLAUDE.md : le dessus et la face avant de chaque chose, la lumière en haut à gauche,
# un contour sombre d'un pixel, des rampes fines de tons qui glissent du froid dans l'ombre au chaud dans la
# lumière, chaque planche, pierre, douelle avec sa nuance, l'occlusion sous ce qui avance) :
#   - le quai : des planches de bois blanchi par la mer, posées en travers, sur deux cases de large (les deux
#     moitiés : la gauche éclairée, la droite à l'ombre) ; son bout montre la face de sa poutre de rive et ses
#     pieux qui plongent dans l'eau (l'eau se voit entre eux), l'ombre du quai sur l'eau, deux bittes d'amarrage ;
#     vers l'est, les planches posées dans l'autre sens et la face tout du long de la rangée du bas. Ses
#     planches font 4 px : la période divise 16, pas de couture d'une case à l'autre ;
#   - la cale : une rampe de pierres qui descend dans l'eau, ses bordures, la pierre mouillée et ses algues vers
#     le bas, l'eau qui la recouvre au bout (vers le sud : de haut en bas ; vers l'est : de gauche à droite) ;
#   - le poteau de la halle : un poteau de chêne équarri sur un dé de pierre, ses aisseliers sous le toit ;
#   - le comptoir (trois cases) : son plateau vu de dessus, sa face à panneaux, un registre ouvert, une caisse
#     à monnaie et des pièces, un encrier ;
#   - la balance : un pied de chêne sur son socle, le fléau de laiton, deux plateaux vus d'en haut (leur fond,
#     leur bord) pendus à leurs chaînes ;
#   - les caisses (deux, puis trois, empilées), les tonneaux (un grand et un petit, puis deux), le mât à fanion
#     (son drapeau qui flotte, sa drisse), le panneau du port (une ancre peinte) ;
#   - les lanternes sont les réverbères de la ferme (assets/murs_hauts.png : éteint, puis ses deux images
#     allumées), repris tels quels ;
#   - le bac, sa passerelle et les caisses qu'il emporte (fiche I1c) : scripts/carte/port_bac.py.
# Les objets ont une ombre douce au sol (CLAUDE.md, règle 7 : ceux des hameaux) ; le quai et la cale, posés sur
# l'eau, n'en ont pas (l'ombre du quai sur l'eau est peinte sous lui).
#
# Relancer le script redonne les mêmes images (aucun hasard qui ne soit tiré de clés fixes).
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (36, 30, 20)                       # le contour (celui des blocs, blocs.py OUT)
N = 140                                  # les nuances d'une rampe

# Les matières : chacune plusieurs rampes proches (une par planche, pierre, douelle…), dont la teinte glisse du
# froid (l'ombre, bleutée) au chaud (la lumière, dorée).
BOIS_MER = [rampe(c, N) for c in (
    [(28, 30, 40), (58, 56, 60), (94, 86, 78), (132, 120, 102), (170, 156, 128), (204, 190, 158), (232, 222, 192)],
    [(30, 30, 38), (62, 56, 56), (100, 88, 74), (140, 122, 96), (178, 158, 122), (212, 194, 152), (238, 226, 186)],
    [(26, 30, 42), (54, 56, 64), (88, 88, 84), (124, 120, 108), (162, 156, 136), (198, 192, 168), (228, 224, 202)],
    [(32, 28, 36), (66, 54, 52), (106, 86, 70), (146, 118, 90), (184, 152, 114), (216, 188, 146), (240, 220, 180)],
)]
CHENE = [rampe(c, N) for c in (
    [(30, 22, 26), (64, 44, 36), (104, 72, 48), (146, 104, 66), (186, 140, 90), (220, 178, 122), (244, 212, 160)],
    [(32, 22, 24), (70, 44, 32), (112, 72, 44), (154, 104, 62), (194, 142, 86), (226, 182, 118), (248, 216, 156)],
    [(28, 24, 30), (60, 46, 40), (98, 76, 54), (138, 108, 74), (178, 144, 98), (212, 182, 130), (238, 214, 168)],
)]
PIERRE = [rampe(c, N) for c in (
    [(34, 36, 46), (66, 68, 76), (102, 102, 104), (140, 136, 132), (178, 172, 160), (212, 204, 186), (236, 230, 212)],
    [(36, 36, 44), (72, 68, 72), (110, 104, 100), (148, 140, 128), (186, 176, 156), (218, 208, 182), (240, 232, 208)],
    [(32, 38, 46), (62, 70, 76), (96, 104, 106), (132, 138, 134), (170, 174, 164), (204, 208, 192), (230, 234, 218)],
)]
MOUILLE = rampe([(14, 24, 30), (28, 44, 48), (44, 64, 62), (64, 86, 76), (90, 110, 94)], N)
ALGUE = rampe([(14, 30, 22), (26, 52, 32), (44, 78, 40), (70, 104, 52), (108, 134, 70)], N)
EAU = rampe([(16, 40, 70), (28, 66, 104), (44, 96, 138), (74, 132, 170), (130, 180, 206)], N)
LAITON = rampe([(44, 30, 20), (96, 64, 28), (150, 106, 40), (198, 152, 62), (232, 196, 104), (252, 234, 170)], N)
FER = rampe([(16, 18, 24), (40, 44, 52), (72, 78, 88), (112, 118, 128), (160, 166, 174), (210, 214, 220)], N)
PAPIER = rampe([(120, 104, 80), (170, 154, 122), (212, 198, 162), (236, 226, 196), (250, 244, 224)], N)
ROUGE = rampe([(56, 14, 20), (104, 24, 30), (156, 40, 40), (200, 66, 54), (232, 112, 86), (250, 170, 140)], N)
BLANC = rampe([(96, 104, 120), (150, 156, 166), (198, 200, 202), (230, 228, 220), (250, 246, 236)], N)
BLEU = rampe([(14, 22, 44), (26, 42, 76), (40, 66, 112), (66, 98, 146), (110, 140, 180)], N)
CORDE = rampe([(70, 52, 32), (118, 92, 58), (164, 136, 90), (204, 180, 130), (232, 214, 170)], N)


class Toile:
    """Une image où l'on pose des pixels (sans couture : rien n'est posé hors du cadre)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c, a=255):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[x, y] = tuple(c[:3]) + (a,)

    def get(self, x, y):
        return self.px[int(x), int(y)]

    def fini(self):
        return contour(self.im, OUT)


def ombre_portee(im, cx, cy, rx, ry, a=70):
    """Une ombre douce au sol (une ellipse, plus dense au milieu), glissée sous le dessin déjà cerné."""
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    p = sh.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            d = u * u + v * v
            if d <= 1:
                p[x, y] = (18, 26, 30, int(a * (1 - d * 0.6)))
    return Image.alpha_composite(sh, im)


def lum(t, x, y, s, k=0.05):
    """Une nuance t troublée d'un bruit fixe (le grain)."""
    return t + k * bruit(x, y, s)


# ---------- le quai ----------

LARGE = 4                              # une planche : 4 px (la période divise 16)
FACE, PIEUX = (10, 13), 16             # le bout : la face de la poutre de rive (rangées 10 à 12), les pieux en dessous


def planche_ton(p, s):
    """La rampe et le ton de base de la planche p (tirés d'elle : la même d'une case à l'autre du quai)."""
    r = BOIS_MER[int((bruit(p, 3, s) + 1) * 2) % len(BOIS_MER)]
    return r, 0.55 + 0.09 * bruit(p, 7, s)


def quai(v):
    """Une case du quai, variante v : vers le sud (planches en travers, horizontales), 0 la moitié gauche, 1 la
    droite, 2 et 3 leur bout (la face, les pieux) ; vers l'est (planches verticales), 4 la rangée du haut, 5 celle
    du bas (sa face, ses pieux tout du long), 6 et 7 leur bout à l'est. 16 × 16, le pied au bas de la case."""
    t = Toile(16, 16)
    sud, j, bout = v < 4, v & 1, bool(v & 2)
    face = (sud and bout) or (not sud and j == 1)
    y_fin = FACE[0] if face else 16
    for y in range(y_fin):
        for x in range(16):
            # la planche (en travers vers le sud : sa rangée ; vers l'est : sa colonne) et la place dans elle
            p, r = (y // LARGE, y % LARGE) if sud else (x // LARGE + 4 * j, x % LARGE)
            R, b = planche_ton(p + (0 if sud else 10), 21)
            fil = 0.04 * bruit(x // 3 if sud else x, y if sud else y // 3, 22 + p) + 0.03 * bruit(x, y, 23)
            c = b + fil
            if r == 0:
                c += 0.14                                   # l'arête éclairée de la planche
            elif r == LARGE - 1:
                c = 0.10 + 0.04 * bruit(x, y, 24)           # le joint, dans l'ombre (l'eau loin dessous)
            elif r == LARGE - 2:
                c -= 0.06
            # (vers le sud, les clous sur les deux longerons ; vers l'est, sur la traverse du milieu)
            if sud and r == 1 and x in ((3, 4) if j == 0 else (11, 12)):
                c = 0.22 if x in (4, 12) else 0.82
            if not sud and r == 1 and y in (7, 8):
                c = 0.82 if y == 7 else 0.22
            # le bord du quai : la gauche éclairée, la droite à l'ombre ; le haut (vers l'est) : un bord net
            t.put(x, y, ton(R, c))
    # les bords
    if sud:
        xb, xi, dk = (0, 1, 0.16) if j == 0 else (15, 14, -0.18)
        for y in range(y_fin):
            if t.get(xi, y)[3]:
                R, b = planche_ton(y // LARGE, 21)
                if y % LARGE != LARGE - 1:
                    t.put(xi, y, ton(R, b + dk + 0.03 * bruit(xi, y, 25)))
            t.put(xb, y, OUT)
    else:
        if j == 0:
            for x in range(16):
                t.put(x, 0, OUT)
                R, b = planche_ton(x // LARGE, 21)
                if x % LARGE != LARGE - 1:
                    t.put(x, 1, ton(R, b + 0.18))
        if bout:
            for y in range(y_fin):
                R, b = planche_ton(3 + 4 * j + 10, 21)
                t.put(14, y, ton(R, b - 0.2 + 0.03 * bruit(14, y, 26)))
                t.put(15, y, OUT)
    # la face de la poutre de rive et les pieux (le bout vers le sud, la rangée du bas vers l'est)
    if face:
        xs = range(16)
        for x in xs:
            if (sud and ((j == 0 and x == 0) or (j == 1 and x == 15))) or (not sud and bout and x == 15):
                for y in range(FACE[0], FACE[1] + 1):
                    t.put(x, y, OUT)
                continue
            R = CHENE[2]
            t.put(x, FACE[0], ton(R, 0.66 + 0.04 * bruit(x, 0, 27)))       # l'arête du dessus de la poutre
            for y in range(FACE[0] + 1, FACE[1]):
                g = 0.36 - 0.10 * (y - FACE[0]) / 3 + 0.04 * bruit(x, y, 28)
                if x % 8 == 1:
                    g += 0.08                                                  # un boulon, la tête au soleil
                t.put(x, y, ton(R, g))
            t.put(x, FACE[1], OUT)
        # les pieux : ronds, le flanc gauche au soleil, mouillés et verdis dans l'eau
        cols = ((2, 3, 4), (10, 11, 12)) if sud else ((1, 2, 3), (9, 10, 11))
        for k, (a, b2, c2) in enumerate(cols):
            for y in range(FACE[1] + 1, PIEUX):
                f = (y - FACE[1]) / (PIEUX - FACE[1])
                for x, tt in ((a, 0.62), (b2, 0.42), (c2, 0.2)):
                    if f > 0.45:
                        t.put(x, y, ton(ALGUE, tt * 0.9 + 0.05 * bruit(x, y, 30 + k)))
                    else:
                        t.put(x, y, ton(MOUILLE, tt + 0.1 + 0.05 * bruit(x, y, 31 + k)))
                t.put(a - 1, y, OUT)
                t.put(c2 + 1, y, OUT)
        # l'ombre du quai sur l'eau, entre les pieux (translucide : l'eau du jeu se voit dessous)
        for y in range(FACE[1] + 1, PIEUX):
            for x in range(16):
                if not t.get(x, y)[3]:
                    t.put(x, y, ton(EAU, 0.05 + 0.04 * (y - FACE[1]) / 3), 95 - 22 * (y - FACE[1] - 1))
    # deux bittes d'amarrage aux coins du bout (vers le sud : aux deux bords ; vers l'est : en haut et en bas)
    if bout:
        bx = (1 if j == 0 else 11) if sud else 10
        by = 5 if sud else (3 if j == 0 else 4)
        for y in range(by, by + 4):
            for x in range(bx, bx + 4):
                u = (x - bx) / 3
                if y == by:
                    c = ton(FER, 0.75 - 0.3 * u)                 # la tête, vue de dessus
                else:
                    c = ton(FER, 0.48 - 0.32 * u - 0.05 * (y - by))
                t.put(x, y, c)
        for x in range(bx, bx + 4):
            t.put(x, by - 1, OUT)
            t.put(x, by + 4, ton(BOIS_MER[0], 0.18))             # son ombre sur les planches
        t.put(bx - 1, by, OUT)
        t.put(bx + 4, by, OUT)
    return t.im, (8, 16)


# ---------- la cale ----------

def cale(v):
    """La cale : une rampe de pierres qui descend dans l'eau, vue de haut à 45°. v 0 : vers le sud (16 × 32, de
    la rive en haut au large en bas) ; v 1 : vers l'est (32 × 16, sa bordure du bas montre sa face)."""
    sud = v == 0
    w, h = (16, 32) if sud else (32, 16)
    t = Toile(w, h)
    L = h if sud else w                                       # la longueur de la rampe
    for y in range(h):
        for x in range(w):
            a = y if sud else x                               # la place le long de la rampe (0 : la rive)
            bcote = x if sud else y                           # en travers
            f = a / (L - 1)                                   # de la rive (0) au large (1)
            # les pierres : un appareil en rangs de 4 px le long de la rampe, décalés d'un rang à l'autre
            rang = a // 4
            col = (bcote + (2 if rang % 2 else 0)) // 5
            pierre = rang * 7 + col
            R = PIERRE[pierre % len(PIERRE)]
            base = 0.62 + 0.08 * bruit(pierre, 1, 40) - 0.25 * f           # plus sombre en descendant (l'ombre)
            ea, eb = a % 4, (bcote + (2 if rang % 2 else 0)) % 5
            if ea == 0 or eb == 0:
                c = ton(MOUILLE if f > 0.5 else R, 0.16 + 0.1 * (1 - f))    # les joints
            else:
                g = base + (0.08 if ea == 1 else -0.06 if ea == 3 else 0) + (0.05 if eb == 1 else -0.05 if eb == 4 else 0)
                g += 0.04 * bruit(x, y, 41)
                c = ton(R, g)
                if f > 0.55:                                  # la pierre mouillée, ses algues
                    m = (f - 0.55) / 0.45
                    c = ton(ALGUE if bruit(x // 2, y // 2, 42) > 0.2 else MOUILLE, g * (1 - 0.5 * m) + 0.05)
            # les bordures : la gauche (ou le haut) éclairée, la droite (ou le bas) à l'ombre
            if bcote <= 1:
                c = ton(PIERRE[0], (0.86 if bcote == 1 else 0.70) - 0.3 * f + 0.03 * bruit(x, y, 43))
            elif bcote >= (w if sud else h) - 2:
                c = ton(PIERRE[1], (0.30 if bcote == (w if sud else h) - 2 else 0.18) - 0.1 * f)
            # vers l'est : la face de la bordure du bas (3 rangées)
            if not sud and y >= h - 4:
                c = ton(PIERRE[2], 0.36 - 0.08 * (y - (h - 4)) - 0.2 * f + 0.03 * bruit(x, y, 44))
            alpha = 255
            if f > 0.78:                                      # l'eau qui la recouvre au bout
                e = (f - 0.78) / 0.22
                c = tuple(round(c[k] * (1 - 0.6 * e) + ton(EAU, 0.45)[k] * 0.6 * e) for k in range(3))
                alpha = int(255 - 150 * e)
            t.put(x, y, c, alpha)
    # le contour, sur les côtés seulement (le bout se fond dans l'eau ; la rive : la terre)
    if sud:
        for y in range(h):
            t.put(0, y, OUT, 255 if y < h * 0.8 else 120)
            t.put(15, y, OUT, 255 if y < h * 0.8 else 120)
    else:
        for x in range(w):
            t.put(x, 0, OUT, 255 if x < w * 0.8 else 120)
            t.put(x, 15, OUT, 255 if x < w * 0.8 else 120)
    return t.im, ((8, 32) if sud else (16, 16))


# ---------- la halle ----------

def poteau_halle():
    """Le poteau de la halle : un poteau de chêne équarri (sa face avant, l'arête gauche au soleil, la droite à
    l'ombre, le fil du bois), sur un dé de pierre vu de haut à 45° (son dessus, sa face), ses deux aisseliers en
    haut, sous le toit. 16 × 46, le pied au bas de la case."""
    t = Toile(16, 46)
    R = CHENE[0]
    for y in range(4, 39):                                    # le poteau
        for x in range(6, 10):
            g = (0.80, 0.58, 0.46, 0.26)[x - 6] - 0.18 * (1 - (y - 4) / 34) ** 3
            g += 0.03 * bruit(x, y // 2, 50) + 0.02 * bruit(x, y, 51)
            if y > 33:
                g -= 0.10 * (y - 33) / 5                      # le pied, près du sol (l'occlusion)
            t.put(x, y, ton(R, g))
    for k, (dx, x0) in enumerate(((-1, 5), (1, 10))):        # les aisseliers
        for n in range(6):
            x, y = x0 + dx * n, 4 + n
            t.put(x, y, ton(CHENE[1], (0.70 if dx < 0 else 0.42) - 0.03 * n))
            t.put(x, y + 1, ton(CHENE[1], (0.46 if dx < 0 else 0.24) - 0.03 * n))
    for x in range(1, 15):                                    # la sablière, sous le toit
        t.put(x, 2, ton(CHENE[2], 0.62 - 0.3 * x / 14 + 0.03 * bruit(x, 2, 52)))
        t.put(x, 3, ton(CHENE[2], 0.34 - 0.16 * x / 14))
    for y in range(39, 45):                                   # le dé de pierre
        for x in range(4, 12):
            u = (x - 4) / 7
            if y <= 41:
                g = 0.84 - 0.18 * u - 0.05 * (y - 39)         # son dessus
            else:
                g = 0.46 - 0.22 * u - 0.06 * (y - 42)         # sa face
            t.put(x, y, ton(PIERRE[(x + y) % 3], g + 0.03 * bruit(x, y, 53)))
    for x in range(6, 10):
        t.put(x, 39, ton(CHENE[0], 0.12))                     # l'ombre du poteau sur le dé
    im = t.fini()
    im = ombre_portee(im, 8, 44.5, 5.5, 1.6, 60)
    return im, (8, 46)


def comptoir():
    """Le comptoir de la halle, trois cases : son plateau de chêne vu de dessus (trois planches dans la longueur,
    l'arête avant éclairée), sa face à trois panneaux (le cadre clair, le panneau en retrait : son haut et sa gauche
    dans l'ombre du cadre), le socle sombre ; dessus, un registre ouvert, une caisse à monnaie de laiton, des pièces,
    un encrier et sa plume. 48 × 30, le pied au milieu du bas."""
    w, h = 48, 30
    t = Toile(w, h)
    top0, top1, face1 = 6, 12, 26                             # le plateau (6 rangées), la face (14 rangées)
    for y in range(top0, top1):
        for x in range(1, w - 1):
            p = (y - top0) // 2
            R = CHENE[p % 3]
            g = 0.70 + 0.05 * bruit(p, 0, 60) + 0.03 * bruit(x // 4, p, 61) + 0.02 * bruit(x, y, 62)
            if (y - top0) % 2 == 1:
                g -= 0.07
            g -= 0.10 * (x / w)                               # la lumière vient de la gauche
            if y == top0:
                g += 0.06
            t.put(x, y, ton(R, g))
    for x in range(1, w - 1):                                 # l'arête avant du plateau, puis son chant
        t.put(x, top1, ton(CHENE[0], 0.88 - 0.12 * x / w))
        t.put(x, top1 + 1, ton(CHENE[0], 0.40 - 0.08 * x / w))
    for y in range(top1 + 2, face1):                          # la face
        for x in range(1, w - 1):
            k, xl = (x - 1) // 16, (x - 1) % 16
            yl = y - (top1 + 2)
            R = CHENE[(k + 1) % 3]
            cadre = xl < 2 or xl > 13 or yl < 2 or yl > 9
            if cadre:
                g = 0.56 - 0.12 * xl / 15 + (0.10 if xl == 0 else 0) - (0.12 if xl == 15 else 0)
            else:
                g = 0.44 + 0.04 * bruit(k, yl // 3, 63)
                if yl == 2 or xl == 2:
                    g -= 0.16                                 # le retrait : l'ombre du cadre
                if yl == 9 or xl == 13:
                    g += 0.10
                g += 0.03 * bruit(x, y // 2, 64)
            if yl > 9:
                g -= 0.14                                     # le socle
            g -= 0.08 * yl / 11
            t.put(x, y, ton(R, g))
    # le registre ouvert (ses deux pages, leurs lignes, le pli)
    for y in range(3, 10):
        for x in range(5, 19):
            u = (x - 5) / 13
            if x == 12:
                g, R = 0.30, PAPIER
            else:
                g, R = 0.86 - 0.18 * abs(u - 0.5) - 0.04 * (y - 3) / 6, PAPIER
                if y in (5, 7) and x not in (6, 11, 13, 18):
                    g -= 0.28
            t.put(x, y, ton(R, g + 0.02 * bruit(x, y, 65)))
    for x in range(5, 19):
        t.put(x, 10, ton(CHENE[0], 0.30))                     # son ombre sur le plateau
    # la caisse à monnaie (laiton) : son couvercle vu de dessus, sa face, la serrure
    for y in range(3, 11):
        for x in range(28, 37):
            u = (x - 28) / 8
            if y <= 6:
                g = 0.84 - 0.22 * u - 0.04 * (y - 3)
            else:
                g = 0.52 - 0.26 * u - 0.05 * (y - 7)
            if y == 7:
                g += 0.12
            t.put(x, y, ton(LAITON, g + 0.03 * bruit(x, y, 66)))
    t.put(32, 8, ton(FER, 0.1))
    t.put(32, 9, ton(FER, 0.2))
    for x in range(28, 37):
        t.put(x, 11, ton(CHENE[0], 0.30))
    for k, (x, y) in enumerate(((39, 9), (41, 10), (40, 8), (24, 10))):   # des pièces
        t.put(x, y, ton(LAITON, 0.92 - 0.05 * k))
        t.put(x + 1, y, ton(LAITON, 0.58))
    for y in range(6, 10):                                    # l'encrier, sa plume
        for x in range(42, 45):
            t.put(x, y, ton(BLEU, (0.62 if y == 6 else 0.28) - 0.12 * (x - 42)))
    for n in range(6):
        t.put(44 - n // 2, 5 - n, ton(BLANC, 0.92 - 0.06 * n))
    im = t.fini()
    im = ombre_portee(im, 24, 27.2, 23, 2.6, 70)
    return im, (24, 28)


def balance():
    """La balance du port : un pied de chêne sur son socle, le fléau de laiton et son aiguille, deux plateaux vus
    d'en haut à 45° (leur fond plus clair vers l'avant, leur bord), pendus à leurs chaînes ; un poids sur l'un.
    18 × 36, le pied au milieu du bas."""
    w, h = 18, 36
    t = Toile(w, h)
    for y in range(28, 34):                                   # le socle : son dessus, sa face
        for x in range(3, 15):
            u = (x - 3) / 11
            g = (0.80 - 0.2 * u - 0.04 * (y - 28)) if y <= 30 else (0.40 - 0.2 * u - 0.05 * (y - 31))
            t.put(x, y, ton(CHENE[y % 3], g + 0.03 * bruit(x, y, 70)))
    for y in range(7, 29):                                    # le pied
        for x, g in ((8, 0.74), (9, 0.36)):
            t.put(x, y, ton(CHENE[0], g - 0.12 * (y - 7) / 21 + 0.03 * bruit(x, y, 71)))
    for x in range(2, 16):                                    # le fléau
        t.put(x, 6, ton(LAITON, 0.92 - 0.3 * abs(x - 8.5) / 7))
        t.put(x, 7, ton(LAITON, 0.50 - 0.2 * abs(x - 8.5) / 7))
    t.put(8, 4, ton(LAITON, 0.95)); t.put(8, 5, ton(LAITON, 0.7)); t.put(9, 5, ton(LAITON, 0.4))   # l'aiguille
    for cx, poids in ((3.5, False), (13.5, True)):           # les chaînes, les plateaux
        for y in range(8, 15):
            t.put(int(cx - 2 + (y - 8) * 0.0), y, ton(FER, 0.5 + 0.2 * ((y % 2))))
            t.put(int(cx + 2), y, ton(FER, 0.3 + 0.2 * ((y % 2))))
        for y in range(14, 20):
            for x in range(int(cx - 3), int(cx + 4)):
                u, v = (x + .5 - cx) / 3.5, (y + .5 - 16.8) / 2.6
                d = u * u + v * v
                if d > 1:
                    continue
                if d > 0.55:
                    g = 0.88 - 0.35 * (u + 1) / 2 if v < 0.2 else 0.40 - 0.2 * (u + 1) / 2   # le bord
                else:
                    g = 0.46 + 0.22 * (v + 0.6) - 0.15 * u                                # le fond, plus clair vers l'avant
                t.put(x, y, ton(LAITON, g + 0.03 * bruit(x, y, 72)))
        if poids:
            for y in range(13, 17):
                for x in range(12, 16):
                    t.put(x, y, ton(FER, (0.74 if y == 13 else 0.42) - 0.1 * (x - 12)))
    im = t.fini()
    im = ombre_portee(im, 9, 33.8, 7.5, 1.8, 65)
    return im, (9, 35)


# ---------- sur le quai et alentour ----------

def caisse(t, x0, y0, l, face, dessus, s):
    """Une caisse de planches vue de haut à 45° : son dessus (ses planches, l'arête avant éclairée), sa face (ses
    planches, la croix de renfort, les montants d'angle), son coin haut gauche en (x0, y0)."""
    R = CHENE[s % 3]
    for y in range(y0, y0 + dessus):
        for x in range(x0, x0 + l):
            p = (x - x0) // 3
            g = 0.78 + 0.05 * bruit(p, s, 80) - 0.12 * (x - x0) / l + 0.02 * bruit(x, y, 81)
            if (x - x0) % 3 == 2:
                g -= 0.18
            if y == y0 + dessus - 1:
                g += 0.08
            t.put(x, y, ton(R, g))
    for y in range(y0 + dessus, y0 + dessus + face):
        for x in range(x0, x0 + l):
            yl, xl = y - y0 - dessus, x - x0
            g = 0.46 + 0.04 * bruit(yl // 3, s, 82) - 0.14 * xl / l + 0.02 * bruit(x, y, 83)
            if yl % 3 == 2:
                g -= 0.12                                     # les joints des planches
            if xl <= 1 or xl >= l - 2:
                g = 0.62 - 0.36 * (xl >= l - 2) - 0.04 * yl / face   # les montants
            dia = abs((xl - 1) * (face - 1) / max(1, l - 3) - yl) < 0.9
            if dia and 1 < xl < l - 2:
                g = 0.58 - 0.12 * xl / l                      # la croix de renfort
            t.put(x, y, ton(R, g))
    for x in range(x0, x0 + l):
        t.put(x, y0 + dessus, ton(R, 0.86 - 0.12 * (x - x0) / l))   # l'arête du dessus


def caisses(v):
    """Des caisses empilées : v 0, une grande et une petite posée dessus ; v 1, trois (deux côte à côte, une
    dessus). Le pied au milieu du bas."""
    if v == 0:
        t = Toile(18, 30)
        caisse(t, 2, 14, 14, 10, 4, 1)
        caisse(t, 5, 4, 9, 7, 3, 2)
        for x in range(5, 14):
            t.put(x, 14, ton(CHENE[1], 0.22))                 # l'ombre de la petite sur la grande
        im = ombre_portee(t.fini(), 9, 28, 8.5, 1.8, 70)
        return im, (9, 29)
    t = Toile(22, 30)
    caisse(t, 1, 15, 10, 9, 3, 0)
    caisse(t, 11, 14, 10, 10, 4, 2)
    caisse(t, 5, 4, 11, 8, 3, 1)
    for x in range(5, 16):
        t.put(x, 15, ton(CHENE[0], 0.22))
    im = ombre_portee(t.fini(), 11, 28, 10.5, 1.8, 70)
    return im, (11, 29)


def tonneau(t, cx, y0, rx, hauteur, s):
    """Un tonneau debout vu de haut à 45° : son fond (douelles, le cercle de fer autour) en ellipse, son corps
    bombé (les douelles, chacune sa nuance, la lumière à gauche, deux paires de cercles), son coin haut en y0."""
    ry = max(2, round(rx * 0.55))
    yb = y0 + ry
    for y in range(yb, yb + hauteur):                         # le corps
        f = (y - yb) / max(1, hauteur - 1)
        bombe = 1 + 0.12 * math.sin(math.pi * f)
        r = rx * bombe
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            u = (x + .5 - cx) / r
            if abs(u) > 1:
                continue
            yy = y + ry * (math.sqrt(max(0, 1 - u * u)) - 1) * 0.0
            d = int((u + 1) * 4)                              # la douelle
            R = CHENE[(d + s) % 3]
            g = 0.66 - 0.42 * (u + 1) / 2 + 0.06 * bruit(d, s, 90) + 0.02 * bruit(x, y, 91)
            if abs(((u + 1) * 4) % 1) < 0.18:
                g -= 0.12                                     # le joint
            if f < 0.08 or f > 0.92:
                g -= 0.06
            cercle = f in () or abs(f - 0.18) < 0.07 or abs(f - 0.82) < 0.07
            if cercle:
                t.put(x, int(yy), ton(FER, 0.64 - 0.44 * (u + 1) / 2))
            else:
                t.put(x, int(yy), ton(R, g))
    for y in range(y0, yb + ry + 1):                          # le fond (le dessus), son cercle
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u, v = (x + .5 - cx) / rx, (y + .5 - yb) / ry
            d = u * u + v * v
            if d > 1:
                continue
            if d > 0.62:
                g = 0.80 - 0.34 * (u + 1) / 2
                t.put(x, y, ton(FER, g))
            else:
                k = int((v + 1) * 2.5)
                g = 0.80 - 0.10 * (u + 1) / 2 - 0.08 * v + 0.04 * bruit(k, s, 92)
                if abs(((v + 1) * 2.5) % 1) < 0.15:
                    g -= 0.16
                t.put(x, y, ton(CHENE[(k + s) % 3], g))


def tonneaux(v):
    """Des tonneaux : v 0, un grand et un petit devant lui ; v 1, deux côte à côte. Le pied au milieu du bas."""
    if v == 0:
        t = Toile(20, 28)
        tonneau(t, 8.5, 2, 6, 16, 0)
        tonneau(t, 14, 13, 4, 9, 1)
        im = ombre_portee(t.fini(), 10, 26, 9, 1.8, 70)
        return im, (10, 27)
    t = Toile(24, 26)
    tonneau(t, 7, 3, 5.5, 15, 2)
    tonneau(t, 17, 4, 5.5, 14, 1)
    im = ombre_portee(t.fini(), 12, 24.2, 11, 1.8, 70)
    return im, (12, 25)


def mat_fanion():
    """Le mât à fanion du quai : un mât rond (le flanc gauche au soleil), sa pomme, sa drisse ; le fanion rouge et
    blanc qui flotte (ses plis : le creux dans l'ombre, la crête dans la lumière) ; son pied cerclé de fer dans un
    billot vu de haut à 45°. 20 × 60, le pied au milieu du bas."""
    w, h = 20, 60
    t = Toile(w, h)
    for y in range(4, 52):                                    # le mât
        f = (y - 4) / 47
        t.put(8, y, ton(BOIS_MER[1], 0.84 - 0.12 * f + 0.03 * bruit(8, y, 100)))
        t.put(9, y, ton(BOIS_MER[1], 0.50 - 0.10 * f))
        if y > 20:
            t.put(10, y, ton(BOIS_MER[2], 0.26 - 0.06 * f))
    for x, g in ((8, 0.95), (9, 0.70), (10, 0.40)):          # la pomme
        t.put(x, 3, ton(LAITON, g))
        t.put(x, 2, ton(LAITON, g - 0.12))
    for y in range(5, 51):                                    # la drisse
        t.put(7 - (1 if y % 9 < 4 else 0) * 0, y, ton(CORDE, 0.55 + 0.15 * (y % 2)))
    for y in range(6, 19):                                    # le fanion
        for x in range(11, 19):
            k = x - 11
            haut, bas = 6 + k * 0.45 + 1.2 * math.sin(k * 0.9), 18 - k * 0.75 + 1.2 * math.sin(k * 0.9)
            if not (haut <= y <= bas):
                continue
            pli = math.sin(k * 0.9 + 1.2)
            bande = (y - haut) / max(1, bas - haut)
            R = BLANC if 0.38 < bande < 0.62 else ROUGE
            t.put(x, y, ton(R, 0.56 + 0.30 * pli - 0.10 * bande + 0.03 * bruit(x, y, 101)))
    for y in range(52, 58):                                   # le billot
        for x in range(4, 15):
            u = (x - 4) / 10
            g = (0.80 - 0.24 * u - 0.05 * (y - 52)) if y <= 54 else (0.42 - 0.22 * u - 0.06 * (y - 55))
            t.put(x, y, ton(CHENE[(x + y) % 3], g + 0.03 * bruit(x, y, 102)))
    for x in (7, 8, 9, 10):
        t.put(x, 52, ton(FER, 0.6 - 0.12 * (x - 7)))
    im = ombre_portee(t.fini(), 10, 57.6, 7, 1.6, 65)
    return im, (10, 59)


def panneau_port():
    """Le panneau du port : une planche de chêne peinte en crème, son bord, une ancre bleue ; son chapeau de
    planche vu d'en haut (son dessus, son chant) ; deux poteaux. 26 × 32, le pied au milieu du bas."""
    w, h = 26, 32
    t = Toile(w, h)
    for x0 in (4, 20):                                        # les poteaux
        for y in range(10, 30):
            t.put(x0, y, ton(CHENE[0], 0.70 - 0.2 * (y - 10) / 19 + 0.03 * bruit(x0, y, 110)))
            t.put(x0 + 1, y, ton(CHENE[0], 0.34 - 0.1 * (y - 10) / 19))
    for y in range(2, 5):                                     # le chapeau : son dessus, son chant
        for x in range(1, w - 1):
            t.put(x, y, ton(CHENE[1], 0.82 - 0.2 * x / w - 0.04 * (y - 2) + 0.03 * bruit(x, y, 111)))
    for x in range(1, w - 1):
        t.put(x, 5, ton(CHENE[1], 0.36 - 0.1 * x / w))
    for y in range(6, 19):                                    # la planche
        for x in range(2, w - 2):
            bord = x in (2, w - 3) or y in (6, 18)
            if bord:
                g, R = 0.58 - 0.2 * x / w - (0.2 if x == w - 3 or y == 18 else 0), CHENE[2]
            else:
                g, R = 0.82 - 0.14 * x / w - 0.08 * (y - 7) / 11 + 0.025 * bruit(x, y, 112), PAPIER
                if y == 7:
                    g -= 0.12                                 # l'ombre du chapeau
            t.put(x, y, ton(R, g))
    # l'ancre : l'anneau, la verge, le jas, les bras et leurs pattes
    ancre = {(12, 8), (13, 8), (11, 9), (14, 9), (12, 10), (13, 10), (10, 11), (11, 11), (12, 11), (13, 11), (14, 11), (15, 11)}
    for y in range(11, 17):
        ancre.add((12, y)); ancre.add((13, y))
    for k in range(4):
        ancre.add((8 + k, 13 + (3 - k) * 0 + min(k, 2))); ancre.add((17 - k, 13 + min(k, 2)))
    ancre |= {(9, 15), (10, 16), (11, 16), (16, 15), (15, 16), (14, 16), (8, 13), (17, 13), (8, 12), (17, 12)}
    for (x, y) in ancre:
        t.put(x, y, ton(BLEU, 0.62 - 0.3 * (x - 8) / 9 - 0.04 * (y - 8)))
    im = ombre_portee(t.fini(), 13, 30, 11, 1.8, 65)
    return im, (13, 31)


# ---------- la planche ----------

def images(hauts=None, ch=None):
    """Les images du port, par sorte (dans l'ordre de PORT.SORTES) : {sorte: [(image, pied)…]}. `hauts` : la
    planche des murs hauts (assets/murs_hauts.png) d'où viennent les lanternes, `ch` ses colonnes."""
    import port_bac as B
    if hauts is None:
        hauts = Image.open(os.path.join(ASSETS, 'murs_hauts.png')).convert('RGBA')
        ch = hauts.width // 16
    reverbere = 1337                                          # BLOCS_CARTE.hauts.candelabre (éteint), puis allumé
    haut = lambda n: hauts.crop(((n % ch) * 16, (n // ch) * 40, (n % ch + 1) * 16, (n // ch + 1) * 40))  # noqa: E731
    return {
        'quai': [quai(v) for v in range(8)],
        'cale_port': [cale(0), cale(1)],
        'poteau_halle': [poteau_halle()],
        'comptoir': [comptoir()],
        'balance': [balance()],
        'caisses': [caisses(0), caisses(1)],
        'tonneaux': [tonneaux(0), tonneaux(1)],
        'mat_fanion': [mat_fanion()],
        'panneau_port': [panneau_port()],
        'lanterne_port': [(haut(reverbere + k), None) for k in range(3)],
        # le bac, sa passerelle, ses caisses (fiche I1c : scripts/carte/port_bac.py)
        'bac_port': [B.bac(0), B.bac(1)],
        'passerelle_port': [B.passerelle(0), B.passerelle(1)],
        'caisses_bac': [B.caisses_bac(v) for v in range(3)],
    }


def couleurs(im):
    """Le nombre de couleurs opaques distinctes d'une image."""
    b = im.convert('RGBA').tobytes()
    return len({b[k:k + 3] for k in range(0, len(b), 4) if b[k + 3] == 255})


def poser(im):
    """Pose les images du port (images()) dans la planche des hameaux telle qu'elle est : sous les images des
    autres sortes (celles d'une pose précédente du port ôtées), rangées de gauche à droite comme hameaux.py ; la
    table reçoit leurs entrées à la suite, dans l'ordre de PORT.SORTES."""
    import json
    sortes = json.load(open(os.path.join(ROOT, 'data', 'village.json'), encoding='utf-8'))['PORT']['SORTES']
    noms = {s['nom'] for s in sortes}
    chemin_png, chemin_json = os.path.join(ASSETS, 'hameaux.png'), os.path.join(ASSETS, 'hameaux.json')
    planche = Image.open(chemin_png).convert('RGBA')
    table = {k: v for k, v in json.load(open(chemin_json, encoding='utf-8')).items() if k not in noms}
    y0 = max(y + h for v in table.values() for x, y, w, h, px, py in v) + 1
    largeur = planche.width
    places, x, y, hl = [], 0, y0, 0
    for s in sortes:
        liste = im[s['nom']]
        if len(liste) != s['variantes']:
            raise SystemExit(f"{s['nom']} : {len(liste)} images pour {s['variantes']} variantes (data/village.json)")
        table[s['nom']] = []
        for i, pied in liste:
            w, h = i.size
            if x + w > largeur:
                x, y, hl = 0, y + hl + 1, 0
            px, py = pied if pied else (w // 2, h)
            table[s['nom']].append([x, y, w, h, px, py])
            places.append((i, x, y))
            x += w + 1
            hl = max(hl, h)
    neuve = Image.new('RGBA', (largeur, y + hl), (0, 0, 0, 0))
    neuve.alpha_composite(planche.crop((0, 0, largeur, min(planche.height, y0))), (0, 0))
    for i, x0, yy in places:
        neuve.alpha_composite(i, (x0, yy))
    neuve.save(chemin_png)
    with open(chemin_json, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/hameaux.png : {neuve.width} × {neuve.height}, le port posé sous les hameaux (à partir de la rangée {y0})')


def main():
    im = images()
    poser(im)
    print('Les couleurs opaques de chaque dessin du port :')
    for nom, liste in im.items():
        if nom == 'lanterne_port':
            continue
        print(f'  {nom} : ' + ', '.join(f'{couleurs(i)}' for i, _ in liste))
    if '--apercu' in sys.argv:
        tout = [(i, nom) for nom, liste in im.items() for i, _ in liste]
        W = sum(i.width + 4 for i, _ in tout) + 4
        H = max(i.height for i, _ in tout) + 8
        fond = Image.new('RGBA', (W, H * 2), (0, 0, 0, 255))
        for y in range(H):
            for x in range(W):
                fond.putpixel((x, y), (58, 112, 150, 255))
                fond.putpixel((x, y + H), (106, 150, 72, 255))
        x = 4
        for i, _ in tout:
            fond.alpha_composite(i, (x, H - 4 - i.height))
            fond.alpha_composite(i, (x, 2 * H - 4 - i.height))
            x += i.width + 4
        fond.resize((W * 4, H * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_port.png'))
        print('apercu_port.png écrit')


if __name__ == '__main__':
    main()
