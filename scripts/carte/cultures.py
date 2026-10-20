# Les cultures de la carte, dessinées pour le jeu (elles ne viennent plus du pack) : la carotte,
# la pomme de terre, l'épinard, la fraise, le blé, le riz, le tournesol et le houblon, et la
# graine des cultures déjà redessinées (l'aubergine, le poivron, l'ail, le cacao, le café, la
# vanille), qui commencent elles aussi par une graine.
#
#   python3 scripts/carte/cultures.py            ajoute les rangées à assets/crops.png
#   python3 scripts/carte/cultures.py --apercu   écrit aussi apercu_cultures.png
#
# assets/crops.png garde ses rangées 0 à 17 (les icônes des récoltes s'y découpent,
# scripts/icones/build.py) ; ce script réécrit les rangées BASE et suivantes : des bandes de deux
# rangées (cases de 16 × 32, le dessin posé au bas de la case), trois cultures par bande, cinq
# colonnes par culture (data/crops.json : sprite { r, h: 32, c }, une colonne par phase) :
#   - les cultures redessinées ici : 4 phases (graine, pousse, plante, plante mûre) ;
#   - les cultures déjà redessinées : leur graine, puis leurs 4 dessins (repris de leur rangée
#     d'avant : 5 phases).
# Toutes commencent par la graine : le jour où on la plante, on voit des graines dans un petit
# trou de terre, pas déjà une pousse. Lumière en haut à gauche, contour sombre d'un pixel.
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, hasard  # noqa: E402
SHEET = os.path.join(ASSETS, 'crops.png')
T = 16
W, H = 16, 32
BASE = 18                    # première rangée écrite par ce script

# Les couleurs
VERT = [(22, 70, 30), (38, 104, 44), (62, 140, 56), (104, 178, 72), (150, 210, 98)]
TIGE = (58, 116, 46)
CONTOUR = (14, 38, 18)
TROU = [(56, 36, 22), (84, 56, 34)]          # le trou de semis, son bord
TERRE = (124, 88, 54)
ORANGE = [(150, 62, 14), (214, 108, 30), (246, 152, 58), (255, 196, 120)]
POMME_TERRE = [(112, 76, 42), (168, 124, 76), (204, 166, 112), (232, 206, 156)]
ROUGE = [(110, 14, 26), (190, 28, 40), (236, 70, 70), (255, 160, 150)]
BLANC = [(196, 196, 186), (240, 240, 230), (255, 255, 250)]
JAUNE = [(178, 120, 20), (232, 176, 36), (252, 214, 74), (255, 240, 150)]
OR = [(132, 98, 34), (186, 146, 56), (222, 186, 92), (244, 220, 140)]
BRUN = [(52, 30, 16), (92, 58, 30), (136, 92, 50), (176, 132, 84)]
BOIS = [(80, 54, 30), (128, 92, 54), (170, 130, 84)]
VIOLET = [(120, 70, 150), (180, 130, 210)]
CONE = [(96, 140, 54), (146, 190, 82), (200, 226, 132)]


class Dessin:
    """Une case de 16 × 32 ; on y pose des pixels, puis on la ferme d'un contour."""

    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()
        self.sans_contour = Image.new('RGBA', (W, H), (0, 0, 0, 0))   # posé après le contour
        self.sc = self.sans_contour.load()

    def p(self, x, y, c, nu=False):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H:
            (self.sc if nu else self.px)[x, y] = tuple(c[:3]) + (255,)

    def ligne(self, x0, y0, x1, y1, c, nu=False):
        n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 2))
        for i in range(n + 1):
            self.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, nu)

    def feuille(self, cx, cy, rx, ry, ang=0.0, rampe=VERT, nervure=True, lisere=False):
        """Une feuille ovale, tournée de `ang` (radians), éclairée en haut à gauche ; `lisere` :
        un bord sombre, qui la détache des feuilles qu'elle recouvre."""
        ca, sa = math.cos(ang), math.sin(ang)
        r = max(rx, ry) + 1
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                u, v = dx * ca + dy * sa, -dx * sa + dy * ca
                d = (u / rx) ** 2 + (v / ry) ** 2
                if d > 1:
                    continue
                l = -(dx + dy) / (rx + ry) * 1.6 + 0.2 - d * 0.6
                k = 1 + (l > -0.35) + (l > 0.15) + (l > 0.55)
                if nervure and abs(v) < 0.5 and rx >= 2.5 and ry < rx:
                    k = min(len(rampe) - 1, k + 1)
                if lisere and d > 0.7:
                    k = 0
                self.p(x, y, rampe[max(0, min(len(rampe) - 1, k))])

    def rond(self, cx, cy, r, rampe):
        """Un fruit ou une boule : un disque ombré, reflet en haut à gauche."""
        for y in range(int(cy - r - 1), int(cy + r) + 2):
            for x in range(int(cx - r - 1), int(cx + r) + 2):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                if dx * dx + dy * dy > r * r:
                    continue
                l = -(dx + dy) / (2 * r)
                k = 1 + (l > -0.2) + (l > 0.35)
                if r >= 1.5 and dx < -r * 0.2 and dy < -r * 0.2 and dx * dx + dy * dy < r * r * 0.3:
                    k = len(rampe) - 1
                self.p(x, y, rampe[max(0, min(len(rampe) - 1, k))])

    def image(self):
        out = self.im.copy()
        bord = contour(self.im, CONTOUR)
        out.alpha_composite(bord)
        out.alpha_composite(self.im)
        out.alpha_composite(self.sans_contour)
        return out


# ---------- la graine : un trou de semis et ses graines ----------

def graine(couleurs, forme='rond', n=3):
    """Le trou de semis (une petite cuvette de terre au bas de la case) et `n` graines dedans."""
    d = Dessin()
    for x in range(4, 12):
        d.p(x, 29, TROU[1], nu=True)
        d.p(x, 30, TROU[0] if 5 <= x <= 10 else TROU[1], nu=True)
        d.p(x, 31, TERRE, nu=True)
    for x in (3, 12):
        d.p(x, 30, TERRE, nu=True)
    places = [(6, 29), (9, 30), (8, 28)][:n]
    for i, (x, y) in enumerate(places):
        if forme == 'rond':
            d.p(x, y, couleurs[1], nu=True)
            d.p(x + 1, y, couleurs[0], nu=True)
            d.p(x, y - 1, couleurs[2] if len(couleurs) > 2 else couleurs[1], nu=True)
        elif forme == 'grain':           # un grain allongé (blé, riz)
            d.p(x, y, couleurs[1], nu=True)
            d.p(x + 1, y - 1, couleurs[2], nu=True)
            d.p(x - 1, y, couleurs[0], nu=True)
        elif forme == 'raye':            # la graine de tournesol, rayée
            d.p(x, y, (40, 36, 34), nu=True)
            d.p(x, y - 1, (230, 226, 210), nu=True)
            d.p(x + 1, y, (40, 36, 34), nu=True)
            d.p(x + 1, y - 1, (90, 86, 80), nu=True)
        elif forme == 'feve':            # une fève (cacao, café) : deux tons, un sillon
            d.p(x, y, couleurs[2], nu=True)
            d.p(x + 1, y, couleurs[1], nu=True)
            d.p(x, y - 1, couleurs[1], nu=True)
            d.p(x + 1, y - 1, couleurs[0], nu=True)
    return d.image()


def plant_tubercule(rampe):
    """Un tubercule (la pomme de terre de semence), à demi enterré."""
    d = Dessin()
    d.rond(8, 28.5, 3, rampe)
    for x, y in ((7, 27), (9, 29)):
        d.p(x, y, rampe[0])
    for x in range(3, 13):
        d.p(x, 30, TROU[1], nu=True)
        d.p(x, 31, TERRE, nu=True)
    return d.image()


def caieu():
    """Une gousse d'ail, pointe en haut, à demi enterrée."""
    d = Dessin()
    for y, (x0, x1) in zip(range(25, 30), ((8, 8), (7, 9), (7, 9), (6, 10), (6, 10))):
        for x in range(x0, x1 + 1):
            d.p(x, y, BLANC[2] if x < 8 else BLANC[1] if x < 10 else BLANC[0])
    d.p(8, 24, (150, 140, 110))
    for x in range(4, 13):
        d.p(x, 30, TROU[1], nu=True)
        d.p(x, 31, TERRE, nu=True)
    return d.image()


def bouture():
    """La vanille : une bouture de liane (une tige verte, un nœud), plantée."""
    d = Dessin()
    d.ligne(7, 29, 9, 23, TIGE)
    d.p(8, 26, VERT[3])
    d.feuille(10.5, 23.5, 1.6, 1.0, -0.5)
    for x in range(4, 12):
        d.p(x, 30, TROU[1], nu=True)
        d.p(x, 31, TERRE, nu=True)
    return d.image()


# ---------- les pousses ----------

def pousse(h=4, ecart=2.0, rampe=VERT):
    """Une jeune pousse : une tige et deux cotylédons."""
    d = Dessin()
    d.ligne(8, 31, 8, 31 - h, TIGE)
    d.feuille(8 - ecart, 31 - h, 1.9, 1.2, 0.35, rampe, nervure=False)
    d.feuille(8 + ecart + 0.6, 31 - h - 0.3, 1.9, 1.2, -0.35, rampe, nervure=False)
    return d


def brins(d, x, y0, h, n, ecart, couleurs=(VERT[1], VERT[3])):
    """Des brins fins (graminées) qui partent d'un pied, sans contour (il les souderait),
    un sur deux plus clair."""
    for i in range(n):
        dx = (i - (n - 1) / 2) * ecart
        d.ligne(x + dx * 0.3, y0, x + dx, y0 - h + abs(dx) * 0.5, couleurs[i % 2], nu=True)


# ---------- la carotte ----------

def fane(d, x, y0, h, ang):
    """Une fane de carotte : une tige fine et des folioles de part et d'autre."""
    x1, y1 = x + math.sin(ang) * h, y0 - math.cos(ang) * h
    d.ligne(x, y0, x1, y1, TIGE)
    for k in range(1, int(h)):
        t = k / h
        cx, cy = x + (x1 - x) * t, y0 + (y1 - y0) * t
        if k % 2 == 0:
            d.p(cx - 1, cy, VERT[3])
            d.p(cx + 1, cy - 0.5, VERT[2])
    d.p(x1, y1, VERT[4])


def carotte(phase):
    if phase == 0:
        return graine(BRUN[1:], 'rond')
    d = Dessin()
    if phase == 1:
        fane(d, 7.5, 30, 4, -0.4)
        fane(d, 8.5, 30, 5, 0.3)
    elif phase == 2:
        for a, h in ((-0.6, 7), (-0.2, 9), (0.25, 8), (0.65, 6)):
            fane(d, 8, 29, h, a)
        d.p(7, 30, ORANGE[2])
        d.p(8, 30, ORANGE[1])
    else:
        for a, h in ((-0.75, 9), (-0.35, 12), (0.05, 13), (0.4, 11), (0.8, 8)):
            fane(d, 8, 27, h, a)
        # le collet orange de la carotte, qui sort de terre
        for y, (x0, x1) in zip(range(27, 32), ((6, 10), (6, 10), (6, 10), (7, 9), (7, 9))):
            for x in range(x0, x1 + 1):
                d.p(x, y, ORANGE[3] if x == x0 and y < 29 else ORANGE[2] if x < x1 else ORANGE[1])
        d.p(8, 30, ORANGE[0])
    return d.image()


# ---------- la pomme de terre ----------

def touffe_patate(d, cx, cy, n, r):
    for i in range(n):
        a = i / n * math.pi * 2 + 0.3
        d.feuille(cx + math.cos(a) * r, cy + math.sin(a) * r * 0.7, 2.2, 1.6, a, nervure=False, lisere=True)
    d.feuille(cx, cy - 1, 2.4, 1.8, 0.0, nervure=False, lisere=True)


def patate(phase):
    if phase == 0:
        return plant_tubercule(POMME_TERRE)
    if phase == 1:
        return pousse(4, 2.2).image()
    d = Dessin()
    if phase == 2:
        d.ligne(8, 31, 8, 25, TIGE)
        touffe_patate(d, 8, 25, 5, 3.2)
    else:
        d.ligne(8, 31, 8, 22, TIGE)
        touffe_patate(d, 8, 23, 7, 4.4)
        for x, y in ((5, 19), (10, 19), (8, 18)):
            d.p(x, y, BLANC[2])
            d.p(x + 1, y, VIOLET[1])
        # deux pommes de terre qui affleurent
        d.rond(4.5, 30.5, 1.8, POMME_TERRE)
        d.rond(11.5, 30.8, 1.6, POMME_TERRE)
    return d.image()


# ---------- l'épinard ----------

def rosette(d, cx, cy, n, rx, ry, rampe=VERT):
    for i in range(n):
        a = -math.pi / 2 + (i - (n - 1) / 2) * (math.pi / (n + 0.5)) * 1.6
        d.feuille(cx + math.sin(a) * rx * 0.8, cy - math.cos(a) * ry * 0.8, rx * 0.55, ry * 0.45, a + math.pi / 2, rampe, lisere=True)


def epinard(phase):
    if phase == 0:
        return graine([(120, 104, 66), (170, 150, 100), (206, 190, 140)], 'rond')
    if phase == 1:
        return pousse(3, 2.0).image()
    d = Dessin()
    if phase == 2:
        rosette(d, 8, 29, 4, 5, 5)
    else:
        rosette(d, 8, 29, 6, 7.5, 7.5, [VERT[0], VERT[0], VERT[1], VERT[2], VERT[3]])
        d.feuille(8, 25.5, 2.4, 3.2, 0.0, [VERT[0], VERT[1], VERT[2], VERT[3], VERT[4]], lisere=True)
    return d.image()


# ---------- la fraise ----------

def trefle(d, cx, cy, s=1.0):
    """Une feuille de fraisier : trois folioles dentées sur un pétiole."""
    d.ligne(cx, cy + 3 * s, cx, cy, TIGE)
    d.feuille(cx - 1.6 * s, cy - 0.4 * s, 1.5 * s, 1.2 * s, 0.5)
    d.feuille(cx + 1.6 * s, cy - 0.4 * s, 1.5 * s, 1.2 * s, -0.5)
    d.feuille(cx, cy - 1.6 * s, 1.3 * s, 1.5 * s, 0.0)


def fraise_fruit(d, x, y):
    for dx, dy, c in ((0, 0, ROUGE[2]), (1, 0, ROUGE[1]), (0, 1, ROUGE[1]), (1, 1, ROUGE[1]), (0, 2, ROUGE[0]), (-1, 0, ROUGE[2])):
        d.p(x + dx, y + dy, c)
    d.p(x - 1, y, ROUGE[3])
    d.p(x, y - 1, VERT[3])
    d.p(x, y + 1, JAUNE[2], nu=True)


def fraise(phase):
    if phase == 0:
        return graine([(150, 110, 40), (210, 170, 70), (240, 210, 120)], 'rond')
    if phase == 1:
        d = Dessin()
        trefle(d, 8, 27, 1.0)
        return d.image()
    d = Dessin()
    trefle(d, 5, 26, 1.1)
    trefle(d, 11, 26.5, 1.1)
    trefle(d, 8, 24, 1.2)
    if phase == 2:
        for x, y in ((4, 29), (12, 29)):
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                d.p(x + dx, y + dy, BLANC[2], nu=True)
            d.p(x, y, JAUNE[2], nu=True)
    else:
        fraise_fruit(d, 4, 28)
        fraise_fruit(d, 12, 28)
        fraise_fruit(d, 8, 29)
    return d.image()


# ---------- le blé et le riz ----------

def epi(d, x, y, n, rampe, barbes=True):
    """Un épi : des grains en quinconce de part et d'autre de la tige, et ses barbes."""
    for k in range(n):
        d.p(x - (k % 2), y + k, rampe[2 if k % 2 else 1], nu=True)
        d.p(x + 1 - (k % 2), y + k, rampe[1 if k % 2 else 2], nu=True)
    if barbes:
        d.p(x - 1, y - 1, rampe[3], nu=True)
        d.p(x + 1, y - 2, rampe[3], nu=True)


def ble(phase):
    if phase == 0:
        return graine(OR, 'grain')
    d = Dessin()
    if phase == 1:
        brins(d, 8, 31, 6, 4, 1.6)
    elif phase == 2:
        for i, (x, h) in enumerate(((4, 12), (7, 15), (10, 14), (13, 11))):
            d.ligne(x, 31, x, 31 - h, VERT[1 + i % 2], nu=True)
            d.ligne(x, 31 - h * 0.4, x - 2, 31 - h * 0.65, VERT[3], nu=True)
            epi(d, x, 31 - h - 3, 4, [VERT[0], VERT[2], VERT[3], VERT[4]], barbes=False)
    else:
        for i, (x, h) in enumerate(((3, 14), (6, 17), (9, 18), (12, 15))):
            d.ligne(x, 31, x, 31 - h, OR[1 + i % 2], nu=True)
            d.ligne(x, 31 - h * 0.35, x + 2, 31 - h * 0.6, OR[2], nu=True)
            epi(d, x, 31 - h - 5, 5, OR)
    return d.image()


def riz(phase):
    if phase == 0:
        return graine([(150, 132, 88), (214, 196, 140), (240, 228, 186)], 'grain')
    d = Dessin()
    vif = [(30, 96, 40), (60, 150, 52), (110, 196, 70), (170, 226, 110)]
    if phase == 1:
        brins(d, 8, 31, 5, 5, 1.4, (vif[1], vif[3]))
    elif phase == 2:
        brins(d, 8, 31, 12, 7, 1.6, (vif[1], vif[2]))
        brins(d, 8, 31, 9, 4, 1.4, (vif[2], vif[3]))
    else:
        brins(d, 8, 31, 12, 7, 1.6, ((96, 132, 48), (150, 176, 70)))
        # les panicules, lourdes, qui retombent en arc
        for x0, s in ((5, -1), (8, 1), (11, 1)):
            for k in range(7):
                x, y = x0 + s * k * 0.7, 19 + k * 0.8 + k * k * 0.1
                d.p(x, y, OR[3] if k % 2 else OR[2], nu=True)
                d.p(x + s * 0.8, y + 0.6, OR[1], nu=True)
    return d.image()


# ---------- le tournesol ----------

def tournesol(phase):
    if phase == 0:
        return graine(None, 'raye')
    if phase == 1:
        return pousse(5, 2.2).image()
    d = Dessin()
    if phase == 2:
        d.ligne(8, 31, 8, 15, TIGE)
        for y, s in ((26, -1), (22, 1), (18, -1)):
            d.feuille(8 + s * 3, y, 2.8, 1.6, s * 0.35)
        d.rond(8, 13.5, 2.0, VERT[1:])                 # le bouton, encore fermé
        d.p(7, 12, VERT[4])
    else:
        d.ligne(8, 31, 8, 10, TIGE)
        d.ligne(9, 31, 9, 12, VERT[1])
        for y, s in ((27, -1), (23, 1), (19, -1), (15, 1)):
            d.feuille(8.5 + s * 3.4, y, 3.2, 1.8, s * 0.35)
        # la fleur : des pétales jaunes autour d'un cœur brun
        cx, cy = 8.5, 7.5
        for y in range(H):
            for x in range(W):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                r = math.hypot(dx, dy)
                a = math.atan2(dy, dx)
                if r <= 2.6:
                    d.p(x, y, BRUN[1] if (x + y) % 2 else BRUN[2])
                elif r <= 5.2 + 0.7 * math.cos(a * 10):
                    l = -(dx + dy) / 10
                    d.p(x, y, JAUNE[3] if l > 0.15 else JAUNE[2] if l > -0.2 else JAUNE[1])
    return d.image()


# ---------- le houblon : une liane qui grimpe le long d'un tuteur ----------

def tuteur(d, haut):
    for y in range(haut, 32):
        d.p(11, y, BOIS[1] if y % 3 else BOIS[2])
        d.p(12, y, BOIS[0])


def houblon(phase):
    if phase == 0:
        return graine(BRUN[1:], 'rond', n=2)
    d = Dessin()
    if phase == 1:
        tuteur(d, 8)
        d.ligne(9, 31, 10, 26, TIGE)
        d.feuille(8, 27, 1.8, 1.3, 0.4, nervure=False)
        d.feuille(11.5, 25.5, 1.6, 1.2, -0.4, nervure=False)
    else:
        tuteur(d, 1)
        haut = 16 if phase == 2 else 3
        # la liane s'enroule autour du tuteur, des feuilles de part et d'autre
        y = 31
        k = 0
        while y > haut:
            x = 10 + (1 if (y // 3) % 2 else -1)
            d.p(x, y, TIGE)
            if y % 3 == 0:
                s = -1 if k % 2 else 1
                d.feuille(11.5 + s * 3.4, y - 0.5, 2.6, 1.9, s * 0.4)
                k += 1
            y -= 1
        if phase == 3:
            # les cônes, vert pâle, en grappes pendantes (écailles claires et sombres)
            for x, y in ((6, 7), (14, 11), (6, 16), (14, 20), (7, 25)):
                for dy in range(4):
                    w = 3 if 0 < dy < 3 else 2
                    for dx in range(w):
                        d.p(x + dx - (w == 3), y + dy, CONE[2] if (dx + dy) % 2 == 0 else CONE[1])
    return d.image()


NOUVELLES = {
    'carotte': carotte, 'patate': patate, 'epinard': epinard, 'fraise': fraise,
    'ble': ble, 'riz': riz, 'tournesol': tournesol, 'houblon': houblon,
}

# les cultures déjà redessinées : leur graine, puis leurs 4 dessins (rangée et colonnes d'avant)
GRAINES = {
    'aubergine': (lambda: graine([(150, 140, 100), (214, 200, 150), (236, 226, 184)], 'rond'), 15, [0, 1, 2, 3]),
    'poivron': (lambda: graine([(160, 140, 90), (226, 208, 150), (244, 232, 190)], 'rond'), 17, [0, 1, 2, 3]),
    'ail': (caieu, 17, [4, 5, 6, 7]),
    'cacao': (lambda: graine([(60, 32, 20), (106, 62, 36), (150, 96, 60)], 'feve', n=2), 15, [4, 5, 6, 7]),
    'cafe': (lambda: graine([(48, 26, 16), (86, 50, 28), (126, 82, 48)], 'feve', n=2), 15, [8, 9, 10, 11]),
    'vanille': (bouture, 15, [12, 13, 14, 15]),
}


def bandes():
    """{ culture: (rangée du bas r, colonnes) } : trois cultures par bande de deux rangées."""
    out = {}
    noms = list(GRAINES) + list(NOUVELLES)
    for i, nom in enumerate(noms):
        r = BASE + 2 * (i // 3) + 1
        c0 = (i % 3) * 5
        n = 5 if nom in GRAINES else 4
        out[nom] = (r, list(range(c0, c0 + n)))
    return out


def main():
    sheet = Image.open(SHEET).convert('RGBA')
    places = bandes()
    rangees = max(r for r, _ in places.values()) + 1
    out = Image.new('RGBA', (sheet.width, rangees * T), (0, 0, 0, 0))
    out.alpha_composite(sheet.crop((0, 0, sheet.width, BASE * T)), (0, 0))
    for nom, (r, cols) in places.items():
        y = (r + 1) * T - H
        if nom in GRAINES:
            f, r0, c0 = GRAINES[nom]
            cases = [f()] + [sheet.crop((c * T, (r0 + 1) * T - H, c * T + T, (r0 + 1) * T)) for c in c0]
        else:
            cases = [NOUVELLES[nom](k) for k in range(4)]
        for c, im in zip(cols, cases):
            out.alpha_composite(im, (c * T, y))
    out.save(SHEET, optimize=True)
    print(f'assets/crops.png : {out.width} × {out.height} (rangées {BASE} à {rangees - 1})')
    for nom, (r, cols) in places.items():
        print(f'  "{nom}": {{ "r": {r}, "h": 32, "c": {cols} }}')
    if '--apercu' in sys.argv:
        bas = out.crop((0, BASE * T, out.width, out.height))
        fond = Image.new('RGBA', bas.size, (120, 84, 50, 255))
        fond.alpha_composite(bas)
        apercu(fond, 'apercu_cultures.png', 4)


if __name__ == '__main__':
    main()
