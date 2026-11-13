# Le portage et le chemin du port (le chantier « l'île à bâtir », fiche I2 : js/engine/portage.js, js/engine/dehors.js ;
# la scène : js/carte/portage.js), dessinés vus de haut à 45° (CLAUDE.md) : on voit le dessus et la face avant de tout,
# l'intérieur de ce qui est ouvert (le plateau de la brouette, celui de la charrette, leur chargement) ; lumière en haut à
# gauche, contour sombre ; des rampes de tons fines (scripts/carte/nuances.py), une rampe par planche, chaque planche
# modelée (son biseau, son grain), les ombres froides, les lumières chaudes, l'occlusion dans les angles et au pied.
#   - le pont de planches (un bloc posé sur une rivière, hors de la ferme) : assets/meuble_pont_planches_ns_<m>.png (on
#     le traverse du nord au sud : les planches en travers, deux garde-roues ; m : 1 un pont au-dessus, 2 au-dessous ;
#     sans pont au-dessous, on voit la face avant du tablier et ses poutres) et assets/meuble_pont_planches_eo_<m>.png
#     (d'ouest en est : les planches debout, le garde-roue du fond et celui de devant, la face avant toujours ; m : 1 un
#     pont à gauche, 2 à droite ; sans voisin, un poteau au coin). 16 × 16, le bas de l'image au bas de la case.
#   - la brouette (assets/brouette.png, cases de 32 × 24, le sol à la dernière rangée) : poussée par le personnage à
#     pied, chargée (des légumes, un sac, une caisse). Trois vues, quatre temps de la roue chacune : 'cote' (vers la
#     droite : la scène la retourne pour la gauche), 'bas' (elle vient vers nous : devant lui), 'haut' (elle s'en va :
#     devant lui, plus haut). La case de la vue v, du temps k : v × 4 + k (v : cote 0, bas 1, haut 2).
#   - la charrette attelée au cheval (assets/charrette.png, cases de 96 × 64, d'après scripts/carte/caleche.py : les
#     roues et les sabots sur la rangée 60, le milieu de l'attelage au milieu de la case) : un plateau de planches à
#     ridelles basses sur un essieu, chargé (des caisses, des sacs, des citrouilles, des choux), le banc où s'assied le
#     personnage (la scène le pose dans ses cases assis_<vue> : PLACE), le cheval harnaché (scripts/personnage/
#     cheval.py). Trois vues comme la calèche, cinq cases chacune (les quatre temps du pas, 4 : à l'arrêt) ; deux
#     couches : la rangée 0, ce qui est derrière le personnage, la rangée 1, ce qui est devant lui. La case de la vue v,
#     du temps k, de la couche c : c × 15 + v × 5 + k.
#   python3 scripts/carte/portage.py            écrit les images
#   python3 scripts/carte/portage.py --apercu   écrit aussi apercu_portage.png (agrandi) et compte les couleurs
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'personnage'))
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe  # noqa: E402
import cheval  # noqa: E402

OUT = (30, 22, 20)
FROID = (22, 28, 52)       # l'ombre tire vers le bleu
CHAUD = (255, 226, 160)    # la lumière vers le miel


def varie(cles, k, d=7):
    """Une rampe proche de `cles` : la k-ième, un peu plus chaude ou plus froide, plus claire ou plus sombre."""
    dr = round(math.sin(k * 2.1) * d)
    dg = round(math.sin(k * 1.3 + 1) * d * 0.6)
    db = round(math.cos(k * 1.7) * d)
    return rampe([(max(0, min(255, r + dr)), max(0, min(255, g + dg)), max(0, min(255, b + db))) for r, g, b in cles], 160)


BOIS_CLES = [(34, 24, 32), (66, 46, 42), (108, 74, 52), (150, 106, 68), (192, 146, 92), (230, 192, 132), (248, 226, 176)]
BOIS = [varie(BOIS_CLES, k) for k in range(9)]
GRIS_CLES = [(30, 30, 40), (60, 56, 60), (98, 88, 80), (140, 126, 104), (182, 166, 134), (222, 208, 172)]
GRIS = [varie(GRIS_CLES, k, 6) for k in range(6)]      # le bois patiné du pont
FER = rampe([(16, 18, 26), (40, 42, 54), (70, 72, 84), (108, 110, 120), (156, 158, 164), (210, 210, 214)], 140)
TOILE = rampe([(54, 44, 40), (100, 84, 66), (150, 128, 96), (196, 174, 132), (228, 212, 172), (246, 236, 206)], 140)
CAROTTE = rampe([(90, 28, 14), (160, 60, 20), (218, 108, 34), (246, 160, 70), (255, 214, 140)], 120)
CHOU = rampe([(20, 46, 30), (40, 90, 44), (76, 136, 60), (124, 180, 84), (186, 222, 132)], 120)
POMME = rampe([(70, 12, 22), (128, 26, 30), (186, 48, 40), (228, 96, 70), (252, 170, 140)], 120)
CITROUILLE = rampe([(96, 36, 10), (168, 74, 18), (222, 124, 32), (246, 172, 64), (255, 220, 140)], 120)
PAILLE = rampe([(96, 66, 26), (150, 112, 46), (200, 160, 74), (232, 202, 118), (250, 234, 174)], 120)


def ton(r, t):
    return r[round(max(0.0, min(1.0, t)) * (len(r) - 1))]


def mel(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h and self.px[x, y][3]:
            return self.px[x, y][:3]
        return None

    def assombrit(self, x, y, f):
        """L'occlusion : le pixel (x, y), plus sombre et plus froid de f (0 à 1)."""
        c = self.get(x, y)
        if c is not None:
            self.put(x, y, mel(mel(c, (0, 0, 0), f * 0.55), FROID, f * 0.35))

    def eclaire(self, x, y, f, teinte=CHAUD):
        c = self.get(x, y)
        if c is not None:
            self.put(x, y, mel(c, teinte, f))

    def colle(self, im, x, y):
        calque = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        calque.paste(im, (x, y))
        self.im.alpha_composite(calque)
        self.px = self.im.load()


def planche(t, x0, y0, x1, y1, r, base, s, sens='h', clous=()):
    """Une planche (le rectangle x0..x1 × y0..y1, inclus), modelée : sa rampe `r` autour du ton `base`, un dégradé
    le long de son fil (plus chaude au bout éclairé), le biseau (le bord haut et gauche clairs, le bas et la droite
    sombres), le grain (un bruit fixe qui suit le fil) ; des clous."""
    L = max(1, (x1 - x0) if sens == 'h' else (y1 - y0))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = ((x - x0) if sens == 'h' else (y - y0)) / L
            v = base + 0.06 * (0.5 - u)
            g = bruit((x // 3) if sens == 'h' else x, y if sens == 'h' else (y // 3), s) * 0.05 + bruit(x, y, s + 7) * 0.025
            v += g
            if y == y0:
                v += 0.11
            if x == x0:
                v += 0.08
            if y == y1:
                v -= 0.12
            if x == x1:
                v -= 0.1
            t.put(x, y, ton(r, v))
    for cx, cy in clous:
        t.put(cx, cy, ton(FER, 0.3))
        t.put(cx - 1, cy - 1, ton(FER, 0.55))


def face(t, x0, y0, x1, y1, r, base, s, sens='h'):
    """La face d'une pièce de bois (dans l'ombre plus que son dessus) : plus claire en haut, sombre au pied."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            h = (y - y0) / max(1, y1 - y0)
            v = base - 0.12 * h + bruit(x // 2 if sens == 'h' else x, y, s) * 0.04
            if x == x0:
                v += 0.07
            if x == x1:
                v -= 0.08
            if y == y1:
                v -= 0.08
            t.put(x, y, ton(r, v))


def bout(t, x0, y0, x1, y1, r, s):
    """Le bout d'une poutre (le bois de bout : des cernes)."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d = math.hypot(x - cx, (y - cy) * 1.2)
            v = 0.32 + 0.1 * math.cos(d * 2.2) + bruit(x, y, s) * 0.03 - 0.06 * (y - y0) / max(1, y1 - y0)
            t.put(x, y, ton(r, v))


def ovale(t, cx, cy, rx, ry, f):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x - cx) / max(0.5, rx), (y - cy) / max(0.5, ry)
            d = dx * dx + dy * dy
            if d <= 1:
                t.put(x, y, f(x, y, dx, dy, d))


def boule(t, cx, cy, rx, ry, r, s=0):
    """Un légume rond (un chou, une pomme, une citrouille) : éclairé en haut à gauche, sombre et froid en bas à droite."""
    ovale(t, cx, cy, rx, ry, lambda x, y, dx, dy, d: ton(r, 0.62 - 0.32 * dx - 0.38 * dy - 0.18 * d + bruit(x, y, s) * 0.04))
    t.put(cx - rx * 0.4, cy - ry * 0.45, ton(r, 0.97))


# ---------------------------------------------------------------- le pont de planches

def pont_ns(m):
    """Le pont traversé du nord au sud (m : 1 un pont au-dessus, 2 au-dessous)."""
    t = Toile(16, 16)
    bas = not (m & 2)
    fin = 12 if bas else 15                       # la dernière rangée du tablier
    # les garde-roues : deux poutres le long des bords (leur dessus, leur face intérieure)
    for x0, s in ((0, 1), (14, 2)):
        planche(t, x0, 0, x0 + 1, fin, GRIS[s], 0.6, 30 + s, sens='v')
    # les planches en travers, chacune son ton (trois rangées : une planche de 5 px vue de haut)
    k = 0
    for y0 in range(0, fin + 1, 3):
        y1 = min(fin, y0 + 2)
        planche(t, 2, y0, 13, y1, GRIS[(k * 5 + m) % 6], 0.52 + 0.05 * math.sin(k * 1.9), 40 + k * 3 + m * 17, sens='h',
                clous=((3, y0 + 1), (12, y0 + 1)) if y1 - y0 >= 2 else ())
        k += 1
    # l'occlusion : l'ombre du garde-roue de gauche sur les planches, les joints
    for y in range(0, fin + 1):
        t.assombrit(2, y, 0.35)
        t.assombrit(13, y, 0.12)
        t.eclaire(1, y, 0.12)
    if not (m & 1):                                # le haut du pont : le seuil, posé sur la rive
        planche(t, 0, 0, 15, 1, GRIS[3], 0.66, 77, sens='h', clous=((4, 1), (11, 1)))
    if bas:                                        # le bas du pont : la face avant du tablier, ses poutres
        face(t, 2, 13, 13, 13, GRIS[4], 0.36, 81)
        face(t, 2, 14, 13, 15, GRIS[5], 0.22, 82)
        for x0 in (0, 14):
            bout(t, x0, 13, x0 + 1, 15, GRIS[1], 83 + x0)
        for x in range(2, 14):
            t.assombrit(x, 15, 0.4)
    return contour_interieur(t.im)


def pont_eo(m):
    """Le pont traversé d'ouest en est (m : 1 un pont à gauche, 2 à droite)."""
    t = Toile(16, 16)
    # le garde-roue du fond (son dessus), puis les planches debout, le garde-roue de devant, la face avant
    planche(t, 0, 0, 15, 1, GRIS[1], 0.6, 90, sens='h')
    for k, x0 in enumerate(range(0, 16, 3)):
        x1 = min(15, x0 + 2)
        planche(t, x0, 2, x1, 10, GRIS[(k * 5 + m * 2) % 6], 0.5 + 0.05 * math.sin(k * 2.3 + m), 100 + k * 3 + m * 11, sens='v',
                clous=((x0 + 1, 3), (x0 + 1, 9)) if x1 - x0 >= 2 else ())
    for x in range(16):
        t.assombrit(x, 2, 0.3)                     # sous le garde-roue du fond
    planche(t, 0, 11, 15, 12, GRIS[2], 0.62, 120, sens='h')
    face(t, 0, 13, 15, 13, GRIS[4], 0.36, 121)
    face(t, 0, 14, 15, 15, GRIS[5], 0.2, 122)
    for x in range(16):
        t.assombrit(x, 15, 0.35)
    # les poteaux des coins, sans voisin : leur dessus, leur face
    for bord, x0 in ((1, 0), (2, 13)):
        if not (m & bord):
            for y0 in (0, 10):
                planche(t, x0, y0 - 2 if y0 else 0, x0 + 2, y0 + 1 if y0 else 1, BOIS[4], 0.62, 130 + x0 + y0, sens='v')
                face(t, x0, y0 + 2, x0 + 2, y0 + 3 if y0 else 2, BOIS[5], 0.34, 131 + x0 + y0)
    return contour_interieur(t.im)


def contour_interieur(im):
    """Le contour sombre d'un pixel, posé dans l'image (le tablier va d'un bord à l'autre de sa case)."""
    w, h = im.size
    p = im.load()
    out = im.copy()
    q = out.load()
    for y in range(h):
        for x in range(w):
            if not p[x, y][3]:
                continue
            if any(not (0 <= x + dx < w and 0 <= y + dy < h) or not p[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                if (y == 0 or y == h - 1) and 0 < x < w - 1:
                    continue           # (les bords haut et bas : le pont continue, ou la face fait le bord)
                if (x == 0 or x == w - 1):
                    continue
                q[x, y] = OUT + (255,)
    return out


# ---------------------------------------------------------------- les roues

def roue(t, cx, cy, rx, ry, phase, r=BOIS[2], tranche=False):
    """Une roue cerclée de fer : de flanc (une ellipse, ses rayons tournés de phase × 22,5°), ou sur la tranche (vue de
    devant ou de derrière : une bande étroite, les rayons qui défilent)."""
    if tranche:
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for k, x in enumerate(range(int(cx - rx), int(cx + rx) + 1)):
                v = 0.55 - 0.25 * k / max(1, 2 * rx) - 0.25 * (y - cy + ry) / (2 * ry) + bruit(x, y, 5) * 0.03
                t.put(x, y, ton(FER, v) if k == 0 else ton(r, v))
        for j in range(3):
            y = cy - ry + 1 + ((phase * 2 + j * 5) % max(1, int(2 * ry - 1)))
            t.put(cx, y, ton(r, 0.2))
        return
    def f(x, y, dx, dy, d):
        if d > 0.72:          # le cercle de fer, éclairé en haut à gauche
            return ton(FER, 0.6 - 0.3 * dx - 0.35 * dy)
        if d > 0.56:          # la jante
            return ton(r, 0.55 - 0.25 * dx - 0.3 * dy)
        return None
    ovale(t, cx, cy, rx, ry, f)
    for k in range(4):
        a = math.radians(phase * 22.5 + k * 45)
        for s in range(1, int(rx * 0.78) + 1):
            for sg in (1, -1):
                x, y = cx + sg * s * math.cos(a), cy + sg * s * math.sin(a) * ry / rx
                t.put(x, y, ton(r, 0.62 - 0.2 * sg * math.sin(a) - 0.1 * (k % 2)))
    t.put(cx, cy, ton(FER, 0.4)); t.put(cx - 1, cy, ton(FER, 0.7)); t.put(cx + 1, cy, ton(FER, 0.25)); t.put(cx, cy - 1, ton(FER, 0.75))


# ---------------------------------------------------------------- le chargement

def caisse(t, x0, y0, l, p, h, s):
    """Une caisse à claire-voie : son dessus (p rangées) et sa face (h rangées), ses lattes."""
    planche(t, x0, y0, x0 + l - 1, y0 + p - 1, BOIS[(s * 3) % 9], 0.66, 200 + s, sens='h')
    face(t, x0, y0 + p, x0 + l - 1, y0 + p + h - 1, BOIS[(s * 3 + 1) % 9], 0.4, 210 + s)
    for x in range(x0, x0 + l):
        t.assombrit(x, y0 + p + h // 2, 0.35)       # la fente entre deux lattes
    for y in range(y0 + p, y0 + p + h):
        t.eclaire(x0, y, 0.1)


def sac(t, cx, cy, rx, ry, s):
    """Un sac de toile ficelé (sa panse, le nœud)."""
    ovale(t, cx, cy, rx, ry, lambda x, y, dx, dy, d: ton(TOILE, 0.66 - 0.3 * dx - 0.36 * dy - 0.12 * d + bruit(x, y, s) * 0.05))
    t.put(cx, cy - ry, ton(PAILLE, 0.3)); t.put(cx - 1, cy - ry - 1, ton(TOILE, 0.85)); t.put(cx + 1, cy - ry - 1, ton(TOILE, 0.5))


def carotte(t, x, y, s):
    for k in range(4):
        t.put(x + k, y + (k > 1), ton(CAROTTE, 0.75 - k * 0.12 + bruit(x, k, s) * 0.05))
    t.put(x - 1, y - 1, ton(CHOU, 0.7)); t.put(x - 1, y, ton(CHOU, 0.45))


def tas_legumes(t, x0, x1, y0, y1, s):
    """Un tas de légumes en vrac sur un plateau : des choux, des pommes, des carottes, du plus loin au plus près."""
    k = 0
    for y in range(y0, y1 + 1, 2):
        for x in range(x0 + (y // 2) % 2, x1, 3):
            n = int((bruit(x, y, s) + 1) * 2.4) % 4
            if n == 0:
                boule(t, x + 1, y, 1.6, 1.3, CHOU, s + k)
            elif n == 1:
                boule(t, x + 1, y, 1.2, 1.1, POMME, s + k)
            elif n == 2:
                carotte(t, x, y, s + k)
            else:
                boule(t, x + 1, y, 1.5, 1.2, CITROUILLE, s + k)
            k += 1


# ---------------------------------------------------------------- la brouette

BW, BH = 32, 24


def brouette(vue, k):
    t = Toile(BW, BH)
    if vue == 'cote':
        # le pied arrière (derrière), les brancards, la caisse (le dedans, la ridelle de devant), la roue
        face(t, 11, 15, 12, 21, BOIS[6], 0.3, 1, sens='v')
        for i in range(10):                                   # le brancard, jusqu'aux mains (à gauche)
            y = 13 - i * 2 // 10
            t.put(i, y, ton(BOIS[1], 0.62)); t.put(i, y + 1, ton(BOIS[1], 0.36))
        # le dedans : la ridelle du fond (sa face intérieure, éclairée), le fond en pente, le chargement
        face(t, 8, 5, 25, 7, BOIS[3], 0.55, 3)
        planche(t, 9, 8, 24, 10, BOIS[4], 0.5, 4, sens='h')
        tas_legumes(t, 10, 23, 3, 9, 11 + k * 0)
        sac(t, 20, 6, 3, 2.5, 13)
        # la ridelle de devant : son dessus (un bord), sa face, plus étroite en bas (la caisse en trapèze)
        planche(t, 7, 10, 26, 11, BOIS[5], 0.66, 5, sens='h', clous=((9, 11), (24, 11)))
        for y in range(12, 17):
            a, b = 8 + (y - 12), 25 - (y - 12) // 2
            face(t, a, y, b, y, BOIS[6], 0.44 - 0.04 * (y - 12), 6)
        for y in range(12, 17):
            t.assombrit(8 + (y - 12) + 1, y, 0.15)
        face(t, 17, 15, 18, 21, BOIS[7], 0.4, 7, sens='v')    # le pied de devant
        roue(t, 25, 18, 5, 4.5, k, BOIS[2])
    elif vue == 'bas':
        # elle vient vers nous : les brancards montent vers le personnage, la caisse, la roue devant
        for i in range(8):
            t.put(9 + i // 4, 7 - i, ton(BOIS[1], 0.55)); t.put(22 - i // 4, 7 - i, ton(BOIS[1], 0.4))
        face(t, 8, 5, 23, 6, BOIS[3], 0.58, 21)              # la ridelle du fond, de dos (sa face intérieure)
        planche(t, 9, 7, 22, 11, BOIS[4], 0.5, 22, sens='h')
        tas_legumes(t, 10, 21, 5, 10, 23)
        sac(t, 13, 7, 3, 2.5, 24)
        planche(t, 8, 12, 23, 13, BOIS[5], 0.68, 25, sens='h', clous=((9, 13), (22, 13)))
        for y in range(14, 19):
            face(t, 9 + (y - 14) // 2, y, 22 - (y - 14) // 2, y, BOIS[6], 0.42 - 0.04 * (y - 14), 26)
        face(t, 9, 18, 10, 21, BOIS[7], 0.3, 27, sens='v'); face(t, 21, 18, 22, 21, BOIS[7], 0.26, 28, sens='v')
        roue(t, 16, 20, 1.5, 3.5, k, BOIS[2], tranche=True)
    else:
        # elle s'en va : la roue au loin (en haut), la caisse, le chargement, la ridelle de derrière, les brancards
        roue(t, 16, 6, 1.5, 3.5, k, BOIS[2], tranche=True)
        face(t, 8, 7, 23, 8, BOIS[3], 0.55, 31)
        planche(t, 9, 9, 22, 13, BOIS[4], 0.5, 32, sens='h')
        tas_legumes(t, 10, 21, 7, 12, 33)
        sac(t, 19, 10, 3, 2.5, 34)
        planche(t, 8, 14, 23, 15, BOIS[5], 0.68, 35, sens='h', clous=((9, 15), (22, 15)))
        face(t, 8, 16, 23, 18, BOIS[6], 0.4, 36)
        face(t, 9, 19, 10, 22, BOIS[7], 0.3, 37, sens='v'); face(t, 21, 19, 22, 22, BOIS[7], 0.26, 38, sens='v')
        for i in range(5):
            t.put(10 - i // 3, 18 + i, ton(BOIS[1], 0.55)); t.put(21 + i // 3, 18 + i, ton(BOIS[1], 0.4))
    return ombre_douce(contour(t.im, OUT), BW, BH, 16 if vue != 'cote' else 17, 9, 2)


def ombre_douce(im, w, h, cx, rx, ry):
    """Une ombre douce au sol, sous ce qui roule (sans contour)."""
    o = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    p = o.load()
    for y in range(h - 2 * ry - 1, h):
        for x in range(cx - rx, cx + rx + 1):
            d = ((x - cx) / rx) ** 2 + ((y - (h - ry - 0.5)) / (ry + 0.5)) ** 2
            if d <= 1 and 0 <= x < w:
                p[x, y] = (18, 24, 30, int(80 * (1 - d * 0.6)))
    o.alpha_composite(im)
    return o


# ---------------------------------------------------------------- la charrette

CW, CH = 96, 64
SOL = 60
# où s'assied le personnage dans chaque vue : le coin haut-gauche de sa case de 16 × 32 (js/carte/portage.js le lit)
PLACE = {'cote': (36, 3), 'bas': (40, -2), 'haut': (40, 0)}


def chargement(t, x0, x1, y0, y1, s):
    """Le chargement d'un plateau, vu de haut à 45° : des caisses, des sacs, des citrouilles, un tas de légumes."""
    tas_legumes(t, x0, x1, y0 + 1, y1, s)
    l = x1 - x0
    caisse(t, x0 + 1, y0 - 2, 8, 3, 4, s + 1)
    caisse(t, x0 + l // 2 - 2, y0 - 1, 7, 3, 4, s + 2)
    sac(t, x0 + l - 6, y0 + 1, 4, 3, s + 3)
    sac(t, x0 + 12, y0 + 3, 3, 2.5, s + 4)
    boule(t, x0 + l - 11, y1 - 1, 2.6, 2.2, CITROUILLE, s + 5)


def plateau_profil(t, x0, x1, k):
    """La charrette de profil (vers la droite) : la roue du fond, la ridelle du fond, le plateau et son chargement, la
    ridelle de devant, la roue de devant (la couche de derrière : tout sauf le cheval)."""
    roue(t, 26, 43, 7, 6, k, BOIS[1])                                   # la roue du fond, à demi cachée
    face(t, x0, 27, x1, 31, BOIS[2], 0.6, 50)                           # la ridelle du fond (sa face intérieure)
    planche(t, x0, 25, x1, 26, BOIS[3], 0.7, 51, sens='h')
    for kk, y in enumerate(range(32, 38)):                              # le plancher du plateau, planche par planche
        planche(t, x0 + 1, y, x1 - 1, y, BOIS[(kk + 4) % 9], 0.5 + 0.03 * kk, 52 + kk, sens='h')
    for x in range(x0 + 1, x1):
        t.assombrit(x, 32, 0.35)                                        # l'ombre de la ridelle du fond
    chargement(t, x0 + 3, x1 - 4, 27, 35, 60 + k * 0)
    planche(t, x0 - 1, 38, x1 + 1, 39, BOIS[5], 0.7, 53, sens='h', clous=((x0 + 1, 39), ((x0 + x1) // 2, 39), (x1 - 1, 39)))
    face(t, x0, 40, x1, 45, BOIS[6], 0.44, 54)                          # la ridelle de devant, sa face
    for x in range(x0 + 6, x1, 10):
        face(t, x, 40, x, 45, BOIS[1], 0.3, 55 + x, sens='v')           # ses montants
    face(t, x0 + 2, 46, x1 - 2, 47, BOIS[0], 0.3, 56)                   # le châssis, dans l'ombre
    for x in range(x0, x1 + 1):
        t.assombrit(x, 45, 0.25)
    roue(t, 26, SOL - 9, 9, 8, k, BOIS[2])                              # la grande roue de devant


def banc(t, x0, x1, y0, s):
    planche(t, x0, y0, x1, y0 + 2, BOIS[7], 0.7, s, sens='h')
    face(t, x0, y0 + 3, x1, y0 + 5, BOIS[8], 0.4, s + 1)


def charrette(vue, k):
    """[derrière, devant] : les deux couches de la case (vue, temps k ; 4 : à l'arrêt)."""
    d, f = Toile(CW, CH), Toile(CW, CH)
    marche = k < 4
    rp = k if marche else 0
    if vue == 'cote':
        plateau_profil(d, 6, 44, rp)
        banc(d, 40, 52, 30, 70)
        face(d, 50, 36, 51, 46, BOIS[1], 0.35, 72, sens='v')
        for i in range(34):                                             # les brancards, jusqu'au collier
            f.put(48 + i, 44 - i * 6 // 34, ton(BOIS[3], 0.66)); f.put(48 + i, 45 - i * 6 // 34, ton(BOIS[3], 0.36))
        f.colle(cheval.harnache_redessine(k if marche else 4) or cheval.profil('marche' if marche else 'idle', k % 4, harnais=True).image(), 50, SOL - 38)
    elif vue == 'bas':
        # elle vient vers nous : la ridelle du fond, le plateau chargé, le banc, la ridelle de devant, les roues ; le
        # cheval devant (la couche de devant)
        face(d, 25, 6, 70, 9, BOIS[2], 0.6, 80)
        planche(d, 24, 4, 71, 5, BOIS[3], 0.7, 81, sens='h')
        for kk, y in enumerate(range(10, 32, 2)):
            planche(d, 25, y, 70, y + 1, BOIS[(kk + 2) % 9], 0.5 + 0.02 * (kk % 3), 82 + kk, sens='h')
        for x in range(25, 71):
            d.assombrit(x, 10, 0.35)
        for y in range(6, 33):
            d.assombrit(25, y, 0.2); d.eclaire(70, y, 0.05)
        chargement(d, 28, 66, 9, 22, 90)
        banc(d, 34, 62, 24, 95)
        planche(d, 23, 32, 72, 33, BOIS[5], 0.7, 96, sens='h', clous=((25, 33), (47, 33), (70, 33)))
        face(d, 24, 34, 71, 39, BOIS[6], 0.44, 97)
        for x in range(30, 70, 9):
            face(d, x, 34, x, 39, BOIS[1], 0.3, 98 + x, sens='v')
        roue(d, 22, 44, 1.5, 9, rp, BOIS[2], tranche=True)
        roue(d, 74, 44, 1.5, 9, rp, BOIS[2], tranche=True)
        for y in range(40, 53):
            f.put(33, y, ton(BOIS[3], 0.6)); f.put(63, y, ton(BOIS[3], 0.4))
        f.colle(cheval.case_redessinee('bas', k) or cheval.face(k if marche else 4, 'tout').image(), 24, SOL - 38)
    else:
        # elle s'en va : le cheval au loin et le banc (derrière le personnage) ; le plateau chargé, la ridelle de
        # derrière et les roues devant lui
        d.colle(cheval.case_redessinee('haut', k) or cheval.dos(k if marche else 4, 'tout').image(), 24, -1)
        banc(d, 34, 62, 24, 101)
        face(f, 25, 29, 70, 31, BOIS[2], 0.6, 102)                       # la ridelle de devant (au loin), sa face intérieure
        planche(f, 24, 27, 71, 28, BOIS[3], 0.7, 103, sens='h')
        for kk, y in enumerate(range(32, 46, 2)):
            planche(f, 25, y, 70, y + 1, BOIS[(kk + 5) % 9], 0.5 + 0.02 * (kk % 3), 104 + kk, sens='h')
        for x in range(25, 71):
            f.assombrit(x, 32, 0.35)
        chargement(f, 28, 66, 33, 43, 110)
        planche(f, 23, 46, 72, 47, BOIS[5], 0.7, 115, sens='h', clous=((25, 47), (47, 47), (70, 47)))
        face(f, 24, 48, 71, 53, BOIS[6], 0.44, 116)
        for x in range(30, 70, 9):
            face(f, x, 48, x, 53, BOIS[1], 0.3, 117 + x, sens='v')
        roue(f, 22, 51, 1.5, 9, rp, BOIS[2], tranche=True)
        roue(f, 74, 51, 1.5, 9, rp, BOIS[2], tranche=True)
    cx, rx = (48, 40) if vue == 'cote' else (48, 30)
    return [ombre_douce(contour(d.im, OUT), CW, CH, cx, rx, 3), contour(f.im, OUT)]


# ---------------------------------------------------------------- les planches

def couleurs(im):
    return len({p[:3] for p in im.getdata() if p[3] == 255})


def main():
    ims = {}
    for m in range(4):
        for nom, f in (('ns', pont_ns), ('eo', pont_eo)):
            im = f(m)
            im.save(os.path.join(ASSETS, f'meuble_pont_planches_{nom}_{m}.png'))
            ims[f'pont_{nom}_{m}'] = im
    b = Image.new('RGBA', (BW * 12, BH), (0, 0, 0, 0))
    for v, vue in enumerate(('cote', 'bas', 'haut')):
        for k in range(4):
            b.alpha_composite(brouette(vue, k), ((v * 4 + k) * BW, 0))
    b.save(os.path.join(ASSETS, 'brouette.png'))
    c = Image.new('RGBA', (CW * 15, CH * 2), (0, 0, 0, 0))
    for v, vue in enumerate(('cote', 'bas', 'haut')):
        for k in range(5):
            der, dev = charrette(vue, k)
            c.alpha_composite(der, ((v * 5 + k) * CW, 0))
            c.alpha_composite(dev, ((v * 5 + k) * CW, CH))
    c.save(os.path.join(ASSETS, 'charrette.png'))
    if '--apercu' in sys.argv:
        print('couleurs opaques distinctes :')
        tous = Image.new('RGBA', (16 * 8, 16), (0, 0, 0, 0))
        for i, (n, im) in enumerate(ims.items()):
            tous.paste(im, (i * 16, 0))
        print('  le pont (8 images)', couleurs(tous), ' — une image :', couleurs(ims['pont_ns_2']), couleurs(ims['pont_eo_0']))
        print('  la brouette', couleurs(b), ' — une case :', couleurs(b.crop((0, 0, BW, BH))))
        print('  la charrette', couleurs(c), ' — une case (les deux couches) :', couleurs(Image.alpha_composite(c.crop((0, 0, CW, CH)), c.crop((0, CH, CW, 2 * CH)))))
        # l'aperçu : sur l'herbe et l'eau, agrandi
        ap = Image.new('RGBA', (CW * 6, CH * 2 + 40), (112, 164, 84, 255))
        for x in range(0, 16 * 8):
            for y in range(0, 40):
                ap.putpixel((x, y), (52, 120, 170, 255))
        ap.alpha_composite(ims['pont_ns_2'], (8, 4)); ap.alpha_composite(ims['pont_ns_3'], (8, 20))
        ap.alpha_composite(ims['pont_ns_1'], (8, 36 - 0) if False else (8, 36 - 16 + 16) if False else (40, 4))
        for i, m in enumerate((2, 3, 1)):
            ap.alpha_composite(ims[f'pont_eo_{m}'], (64 + i * 16, 12))
        ap.alpha_composite(ims['pont_ns_0'], (120, 12))
        for v in range(3):
            ap.alpha_composite(b.crop(((v * 4) * BW, 0, (v * 4 + 1) * BW, BH)), (160 + v * 36, 10))
        for v in range(3):
            der = c.crop(((v * 5) * CW, 0, (v * 5 + 1) * CW, CH))
            dev = c.crop(((v * 5) * CW, CH, (v * 5 + 1) * CW, 2 * CH))
            ap.alpha_composite(der, (v * CW * 2, 40)); ap.alpha_composite(dev, (v * CW * 2, 40))
            ap.alpha_composite(dev, (v * CW * 2 + CW, 40 + CH))
        ap.resize((ap.width * 3, ap.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_portage.png'))


if __name__ == '__main__':
    main()
