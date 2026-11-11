# Les hameaux bâtis du grand monde (docs/grand-monde.md, étape 7 : fiche 7a) : la planche de tout ce
# qu'on y voit, posée comme la végétation (js/carte/ferme/vegetation.js, la planche « hameaux »).
#
#   python3 scripts/carte/hameaux.py            écrit assets/hameaux.png et assets/hameaux.json
#   python3 scripts/carte/hameaux.py --apercu   écrit aussi apercu_hameaux.png (la planche agrandie,
#                                               sur l'herbe)
#
# Relancer le script redonne la même image (aucun hasard qui ne soit tiré de clés fixes).
#
# Les maisons des hameaux sont faites des mêmes blocs que la maison du joueur : leurs murs, leurs
# fenêtres et leurs portes sont repris de assets/murs_hauts.png et assets/blocs.png (scripts/carte/
# blocs.py : les murs hauts en pierre, en pierre de taille — la pierre blanche de la côte — et en
# bois, raccordés à leurs voisins par leur masque, comme à la ferme), leurs meubles des dessins des
# meubles (assets/meuble_*.png), leurs sols des modèles de sols, les arbres des jardins de
# assets/verger.png (en fruits), les légumes des potagers de assets/crops.png, le puits de
# assets/puits.png. Le relancer après avoir retouché ces dessins les reprend.
#
# Ce qui manquait est dessiné ici, dans le style des blocs (vue de haut à 45°, lumière en haut à
# gauche, contour brun sombre d'un pixel, le bois et la pierre de blocs.py) : le banc de la place, le
# panneau au nom du hameau, les tas de bois, le billot du bûcheron, la barque et le séchoir à filets
# du pêcheur, le wagonnet et le tas de minerai du mineur, l'auge de l'enclos du berger, la claie et
# les paniers du cueilleur, le poulailler, le coffre de la salle commune. Les toits (tuiles, ardoise,
# chaume, roseaux) sont dessinés par la scène (CarteKit.toit, js/carte/toit.js).
#
# Les sortes, leur ordre et leurs variantes sont ceux de data/monde.json (HAMEAUX.SORTES) ; la table
# (assets/hameaux.json : { "sorte": [[x, y, l, h, px, py]…] }, une entrée par variante : le rectangle
# dans la planche et le pied, le point posé au sol) a la forme de celle des rochers. Le pied d'une
# pièce d'une case : le milieu du bas de sa case ; de deux ou trois cases : le milieu du bas de ses
# cases ; un lit : 8 px plus haut (rangé derrière qui passe devant lui, comme à la ferme : PIED).
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'batiments'))  # style_v2.py (blocs.py)
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour, hasard  # noqa: E402
import blocs as B  # noqa: E402

SORTIE = os.path.join(ASSETS, 'hameaux.png')
SORTIE_JSON = os.path.join(ASSETS, 'hameaux.json')
DONNEES = os.path.join(ROOT, 'data', 'monde.json')
LARGEUR_PLANCHE = 512

OUT = B.OUT
BOIS, PIERRE, PAILLE, FER, TERRE, VERT = B.BOIS, B.PIERRE, B.PAILLE, B.FER, B.TERRE, B.VERT
FILET = [(92, 96, 88), (150, 152, 138), (204, 204, 186)]
EAU = [(40, 84, 120), (66, 128, 168)]
CUIVRE = [(120, 62, 30), (184, 104, 52), (226, 160, 96)]
BAIES = [(110, 30, 60), (176, 52, 84)]
CHAMPI = [(150, 70, 40), (214, 120, 70), (240, 226, 200)]
HERBES = [(70, 96, 40), (112, 140, 60), (168, 182, 90)]
PIED = 8   # (un lit : son pied est remonté d'autant)

# Les cadres des planches reprises (config.js, BLOCS_CARTE : leurs numéros)
MURS_HAUTS = {'pierre': 0, 'taille': 225, 'bois': 371}
FENETRES = 441                     # BLOCS_CARTE.hauts.fenetres.modeles.mur_fenetre
MATIERE = {'pierre': 0, 'taille': 5, 'bois': 6}   # rang dans matieresPortes
PORTES = {'pierre': 16, 'taille': 390, 'bois': 391}
PORTE_VERTICALE, FOUR, CUISINIERE, BARRIERES = 30, 5, 6, 50
SOLS = {'sol_plancher': 31, 'sol_dalles': 90, 'sol_tomettes': 122, 'paves': 170}
MEUBLES = {'lit_adulte': 'lit_adulte', 'lit_enfant': 'lit_enfant', 'table': 'table', 'table_basse': 'table_basse',
           'chaise': 'chaise', 'buffet': 'buffet', 'armoire': 'armoire_chene', 'chevet': 'chevet'}
LEGUMES = ['carotte', 'patate', 'tomate', 'oignon', 'epinard', 'fraise']


# ---------- un petit pinceau ----------

class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def poly(self, pts, f):
        """Remplit un polygone ; f(x, y) → la couleur."""
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                px, py, dedans, j = x + .5, y + .5, False, len(pts) - 1
                for i in range(len(pts)):
                    (xi, yi), (xj, yj) = pts[i], pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        dedans = not dedans
                    j = i
                if dedans:
                    self.put(x, y, f(x, y))

    def ellipse(self, cx, cy, rx, ry, f):
        """Remplit une ellipse ; f(u, v) → la couleur (u, v de -1 à 1 : la place dans l'ellipse)."""
        for y in range(self.h):
            for x in range(self.w):
                u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                if u * u + v * v <= 1:
                    self.put(x, y, f(u, v))

    def fini(self):
        return contour(self.im, OUT)


def boite(t, x0, x1, base, face, dessus, tons, joints=None):
    """Une boîte de bois vue à 45° : son dessus (dessus px, éclairé), sa face (face px) au-dessus de
    `base` ; tons : 5 tons du sombre au clair ; joints : tous les combien de px une planche."""
    for y in range(base - face - dessus + 1, base + 1):
        for x in range(x0, x1 + 1):
            if y <= base - face:
                c = tons[4] if y == base - face - dessus + 1 else tons[3]
            else:
                c = tons[2] if (y - (base - face)) % (joints or 99) else tons[1]
                if x == x0:
                    c = tons[3]
                elif x == x1:
                    c = tons[1]
            t.put(x, y, c)


# ---------- les nuances : des rampes de tons interpolés, un bruit fixe ----------

def bruit(x, y, s=0):
    """Un bruit fixe de -1 à 1, tiré de (x, y, s) (le même à chaque relance)."""
    h = (int(x) * 374761393 + int(y) * 668265263 + s * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 32767.5 - 1


def rampe(cles, n=40):
    """n nuances interpolées entre des couleurs clés, du sombre au clair."""
    out = []
    for i in range(n):
        f = i / (n - 1) * (len(cles) - 1)
        k = min(int(f), len(cles) - 2)
        r = f - k
        out.append(tuple(round(cles[k][j] * (1 - r) + cles[k + 1][j] * r) for j in range(3)))
    return out


def ton(r, t):
    """La nuance t (0 sombre … 1 clair) de la rampe r."""
    return r[round(max(0.0, min(1.0, t)) * (len(r) - 1))]


def ombre_portee(im, cx, cy, rx, ry, a=80):
    """Une ombre douce au sol (une ellipse translucide), glissée sous le dessin déjà cerné."""
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    p = sh.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            if u * u + v * v <= 1:
                p[x, y] = (20, 30, 10, a)
    return Image.alpha_composite(sh, im)


CHENE = rampe([(46, 30, 18), (82, 56, 34), (124, 88, 54), (164, 124, 80), (204, 166, 112), (232, 204, 150)])
MIEL = rampe([(70, 40, 16), (118, 74, 30), (162, 112, 48), (200, 150, 70), (228, 186, 104), (246, 218, 150)])
NOYER = rampe([(30, 18, 12), (56, 34, 22), (86, 54, 34), (118, 78, 48), (150, 106, 66), (184, 140, 92)])
VITRE = rampe([(30, 52, 64), (52, 92, 108), (98, 146, 160), (176, 214, 220)])
FER_R = rampe([(34, 36, 40), (70, 74, 80), (128, 132, 138)])
PAILLE_R = rampe([(150, 112, 44), (214, 176, 90), (246, 226, 160)])
COEUR = rampe([(96, 56, 26), (150, 100, 52), (198, 146, 82), (230, 190, 126), (248, 226, 172)])
ECORCE = rampe([(30, 20, 12), (58, 40, 24), (88, 64, 40), (120, 92, 60), (150, 120, 82)])


# ---------- les objets du hameau ----------

def banc():
    """Le banc de la place : deux cases de large, une planche d'assise sur quatre pieds, un dossier."""
    t = Toile(32, 22)
    for x in (4, 27):
        t.rect(x, 4, x + 1, 13, BOIS[1])          # les montants du dossier
    t.rect(3, 5, 28, 6, BOIS[3]); t.rect(3, 7, 28, 7, BOIS[2])     # le dossier
    t.rect(3, 9, 28, 9, BOIS[1])
    for x in (5, 26):
        t.rect(x, 15, x + 1, 20, BOIS[0])         # les pieds
    t.rect(2, 12, 29, 13, BOIS[4]); t.rect(2, 14, 29, 15, BOIS[2])     # l'assise
    for x in range(6, 28, 7):
        t.put(x, 12, BOIS[3])
    return t.fini(), (16, 22)


def panneau():
    """Le panneau au nom du hameau : un poteau, une planche clouée où le nom se devine."""
    t = Toile(22, 30)
    t.rect(10, 10, 11, 29, BOIS[1]); t.put(10, 10, BOIS[3])
    t.rect(1, 3, 20, 12, BOIS[3])
    t.rect(1, 3, 20, 3, BOIS[4]); t.rect(1, 12, 20, 12, BOIS[1])
    for y in (6, 9):
        for x in range(4, 18):
            if hasard(x, y, 7) < 0.75:
                t.put(x, y, BOIS[0])                 # les lettres peintes
    for x, y in ((2, 4), (19, 4), (2, 11), (19, 11)):
        t.put(x, y, FER[2])
    return t.fini(), (11, 30)


# La face d'une bûche, ronde (6 × 6) : un pixel d'écorce tout autour (e), l'aubier clair (a), le cœur
# (c) ; le chiffre : la lumière, venue d'en haut à gauche (9 clair … 0 sombre). L'écorce cerne chaque
# face : deux cœurs voisins ne se touchent jamais.
FACE = ['..e6e6..',
        'e7a9a8a7e3',
        'e6a8c4c3a6e2',
        'e5a7c3c2a5e1',
        'e4a6a5a4a3e1',
        '..e2e1..']


def _lire(ligne):
    out, i = [], 0
    while i < len(ligne):
        if ligne[i] == '.':
            out.append(None)
            i += 1
        else:
            out.append((ligne[i], int(ligne[i + 1])))
            i += 2
    return out


FACE = [_lire(ligne) for ligne in FACE]


def face_buche(t, x0, y0, s):
    """La face avant d'une bûche, posée en (x0, y0) ; s : sa graine (son ton, sa fente)."""
    dl = 0.07 * bruit(s, 0, 51)
    fente = bruit(s, 1, 51) > 0.3
    for j, ligne in enumerate(FACE):
        for i, p in enumerate(ligne):
            if p is None:
                continue
            k, n = p
            lum = n / 9 + dl
            if k == 'e':
                c = ton(ECORCE, 0.10 + 0.80 * lum + 0.06 * bruit(x0 + i, y0 + j, s))
            elif k == 'a':
                c = ton(COEUR, 0.45 + 0.50 * lum + 0.04 * bruit(i, j, s))
            else:
                c = ton(COEUR, 0.12 + 0.45 * lum)
            if fente and k == 'a' and i == 3 and j >= 4:
                c = ton(COEUR, 0.15)                         # la fente, du cœur vers le bas
            t.put(x0 + i, y0 + j, c)


def dessus_buche(t, x0, y0, y1, s):
    """Le dessus d'une bûche couchée vers le fond (6 px de large) : son écorce, de y0 à y1."""
    for y in range(y0, y1 + 1):
        for x in range(x0 + 1, x0 + 5):
            dx = (x - x0 - 2.5) / 2.5
            lum = 0.62 - 0.38 * dx - 0.15 * (y1 - y) / max(1, y1 - y0) + 0.08 * bruit(x, y * 2, s)
            if bruit(x, y, s + 5) > 0.75:
                lum -= 0.22                                  # une crevasse de l'écorce
            t.put(x, y, ton(ECORCE, lum))


def tas_bois(v):
    """Un tas de bûches de chêne rangées, vues de face à 45° : leurs faces rondes cernées d'écorce,
    le dessus de celles du haut ; v = 0 : en pyramide ; v = 1 : en carré, tenu entre deux piquets."""
    t = Toile(16, 25)
    rangs = [(18, [2, 8]), (12, [2, 8]), (6, [5])] if v == 0 else [(18, [2, 8]), (12, [2, 8]), (6, [2, 8])]
    t.rect(3, 8, 12, 22, ton(ECORCE, 0.02))                  # le fond, dans l'ombre entre les bûches
    if v == 0:
        t.rect(2, 13, 13, 22, ton(ECORCE, 0.02))
    for x in rangs[-1][1]:
        dessus_buche(t, x, 3, 6, 7 * v + x)
    if v == 0:
        for x in (2, 8):
            dessus_buche(t, x, 10, 12, 3 + x)
    for k, (y, xs) in enumerate(rangs):
        for j, x in enumerate(xs):
            face_buche(t, x, y, 17 * v + 5 * k + j)
    if v == 1:
        for x in (0, 15):                                    # les piquets
            for y in range(4, 24):
                t.put(x, y, ton(CHENE, 0.55 - 0.15 * (y - 4) / 19 + 0.05 * bruit(x, y, 21)))
            t.put(x, 4, ton(CHENE, 0.85))
    im = ombre_portee(t.fini(), 8.5, 23.6, 8.3, 2.2)
    p = im.load()
    for i in range(4):                                       # des copeaux au pied
        x = int((bruit(i, 0, 41 + v) + 1) * 7.5)
        if p[x, 24][3] < 200:
            p[x, 24] = ton(COEUR, 0.6 + 0.3 * bruit(i, 3, 41)) + (255,)
    return im, (8, 24)


def billot():
    """Le billot du bûcheron : une souche coupée net, une hache plantée dedans."""
    t = Toile(16, 22)
    t.ellipse(8, 11, 6, 3, lambda u, v: PAILLE[3] if u * u + v * v < 0.35 else PAILLE[2])
    t.rect(2, 12, 13, 19, BOIS[2]); t.rect(2, 12, 2, 19, BOIS[3]); t.rect(13, 12, 13, 19, BOIS[1])
    for x in (5, 9):
        t.rect(x, 13, x, 18, BOIS[1])
    t.rect(1, 20, 14, 21, BOIS[0])
    t.rect(9, 1, 10, 10, BOIS[3])                 # le manche
    t.rect(6, 8, 12, 10, FER[3]); t.rect(6, 10, 12, 10, FER[1])     # le fer
    return t.fini(), (8, 22)


def barque():
    """La barque tirée au sec, vue de haut : sa coque de planches, deux bancs, une rame."""
    t = Toile(34, 18)
    t.ellipse(17, 9, 15.5, 7, lambda u, v: BOIS[2] if abs(v) > 0.7 else BOIS[3] if v < 0 else BOIS[2])
    t.ellipse(17, 9, 13, 4.6, lambda u, v: BOIS[1] if v < -0.5 else BOIS[2])
    for x in (11, 22):
        t.rect(x, 5, x + 1, 13, BOIS[4])
    for x in range(5, 30):
        t.put(x, 9, BOIS[1] if x % 4 else BOIS[0])
    t.rect(6, 15, 28, 15, BOIS[4]); t.rect(26, 14, 29, 16, BOIS[3])   # la rame
    return t.fini(), (17, 18)


def sechoir():
    """Le séchoir à filets : deux perches, une traverse, le filet qui pend en losanges, des flotteurs."""
    t = Toile(34, 30)
    for x in (3, 30):
        t.rect(x, 2, x + 1, 29, BOIS[1]); t.put(x, 2, BOIS[3])
    t.rect(2, 3, 31, 4, BOIS[3])
    for y in range(5, 25):
        for x in range(5, 30):
            if ((x + y) % 6 == 0 or (x - y) % 6 == 0) and y < 24 - abs(x - 17) // 4:
                t.put(x, y, FILET[2] if (x + y) % 6 == 0 else FILET[1])
    for x in range(6, 30, 5):
        t.put(x, 6, (210, 90, 50)); t.put(x + 1, 6, (230, 130, 70))
    return t.fini(), (17, 30)


def wagonnet():
    """Le wagonnet du mineur : une caisse de bois cerclée de fer sur ses roues, pleine de minerai."""
    t = Toile(16, 22)
    boite(t, 1, 14, 18, 8, 5, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]])
    for x in range(2, 14):
        t.put(x, 8 + (1 if hasard(x, 3) < 0.4 else 0), PIERRE[2])
    for x in (3, 6, 9, 12):
        t.put(x, 7, CUIVRE[2] if x % 2 else PIERRE[4])
    t.rect(1, 12, 14, 12, FER[2]); t.rect(1, 16, 14, 16, FER[2])
    for x in (4, 11):
        t.ellipse(x + 0.5, 19.5, 2.2, 2.2, lambda u, v: FER[1] if u * u + v * v > 0.3 else FER[3])
    return t.fini(), (8, 22)


def tas_minerai():
    """Un tas de minerai : des pierres grises, des éclats de cuivre."""
    t = Toile(16, 16)
    for k, (x, y, r) in enumerate([(5, 11, 3.6), (11, 11, 3.6), (8, 7.5, 3.4), (8, 12, 3)]):
        t.ellipse(x, y, r, r * 0.85, lambda u, v, k=k: PIERRE[4] if v < -0.3 and u < 0.2 else PIERRE[2] if v > 0.4 else PIERRE[3])
    for x, y in ((6, 9), (10, 12), (9, 6), (4, 12)):
        t.put(x, y, CUIVRE[1]); t.put(x + 1, y, CUIVRE[2])
    return t.fini(), (8, 16)


def auge():
    """L'auge de l'enclos du berger : un bac de planches, de l'eau dedans."""
    t = Toile(32, 16)
    boite(t, 2, 29, 14, 6, 5, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]], joints=3)
    t.rect(4, 5, 27, 7, EAU[0]); t.rect(4, 5, 27, 5, EAU[1])
    return t.fini(), (16, 16)


def claie():
    """La claie du cueilleur : un châssis de branches, des bouquets d'herbes qui sèchent la tête en bas."""
    t = Toile(34, 26)
    for x in (3, 30):
        t.rect(x, 3, x + 1, 25, BOIS[1])
    t.rect(2, 4, 31, 5, BOIS[3])
    for k, x in enumerate(range(6, 30, 4)):
        c = HERBES[k % 3]
        for y in range(6, 14):
            for dx in range(-1, 2):
                if hasard(x, y, dx) < 0.8 - (y - 6) * 0.04:
                    t.put(x + dx, y, c if dx else HERBES[2])
        t.put(x, 6, PAILLE[1])
    t.rect(4, 22, 29, 23, BOIS[2])                  # le plateau du bas, des champignons qui sèchent
    for x in range(6, 28, 3):
        t.put(x, 21, CHAMPI[1]); t.put(x + 1, 21, CHAMPI[0])
    return t.fini(), (17, 26)


def paniers():
    """Des paniers d'osier : l'un de champignons, l'autre de baies."""
    t = Toile(16, 18)
    for (x0, x1, y, fruit) in ((1, 8, 16, CHAMPI), (8, 14, 13, BAIES)):
        for y2 in range(y - 5, y + 1):
            for x in range(x0, x1 + 1):
                t.put(x, y2, PAILLE[1] if (x + y2) % 2 else PAILLE[2])
        for x in range(x0 + 1, x1):
            t.put(x, y - 6, fruit[1] if x % 2 else fruit[0])
            t.put(x, y - 7, fruit[1] if (x % 3) else fruit[-1])
    return t.fini(), (8, 18)


def coffre():
    """Le coffre de la salle commune : deux cases de large, des planches de chêne, son couvercle
    bombé, deux bandes de fer et la serrure."""
    t = Toile(30, 22)
    boite(t, 1, 28, 20, 10, 7, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]], joints=4)
    t.rect(1, 9, 28, 9, BOIS[1])                     # le bord du couvercle
    for x in (6, 23):
        t.rect(x, 4, x + 1, 20, FER[1]); t.put(x, 4, FER[3]); t.put(x, 10, FER[3])
    t.rect(13, 11, 16, 14, FER[2]); t.put(14, 13, OUT)
    t.rect(1, 21, 28, 21, BOIS[0])
    return t.fini(), (15, 23)


def toit_planches(t):
    """Le toit à deux pans du poulailler, le faîte vers le fond : de longues planches couleur miel
    qui descendent du faîte à l'égout, un couvre-joint sur chaque joint ; le pan de gauche au
    soleil, celui de droite à l'ombre ; le faîtage et les planches de rive par-dessus."""
    for cote in (-1, 1):
        for y in range(1, 25):
            for x in range(32):
                u = (16 - x) / 15 if cote < 0 else (x - 16) / 15     # 0 au faîte, 1 à l'égout
                if u < 0 or u > 1.02:
                    continue
                v = y - (2 + 9 * u)                                   # le long du faîte, 0 au fond
                if v < 0 or v > 12:
                    continue
                lum = (0.72 if cote < 0 else 0.40) - 0.08 * u + 0.06 * (1 - v / 12)
                lum += 0.08 * bruit(int(v / 2.4), 0, 3) + 0.04 * bruit(x, y, 9)
                if v % 2.4 < 0.8:
                    lum -= 0.2                                        # le couvre-joint, son flanc
                elif v % 2.4 < 1.4:
                    lum += 0.12                                       # son dessus
                t.put(x, y, ton(MIEL, lum))
    for y in range(2, 15):                                            # le faîtage
        t.put(15, y, ton(MIEL, 0.82 - 0.02 * y))
        t.put(16, y, ton(MIEL, 0.58 - 0.02 * y))
        t.put(17, y, ton(MIEL, 0.40))
    for k in range(16):                                               # les planches de rive
        for cote in (-1, 1):
            x, y = 16 + cote * k, 14 + round(k * 9 / 15)
            if 0 <= x < 32:
                t.put(x, y, ton(MIEL, 0.88 if cote < 0 else 0.62))
                t.put(x, y + 1, ton(MIEL, 0.30))


def poulailler():
    """Le poulailler (vide : les poules viendront avec les habitants) : une cabane de planches de
    chêne sur pieds, vue de haut à 45°, son toit de planches à couvre-joints, le pignon et son
    œil-de-bœuf, la fenêtre, la trappe ouverte, le nichoir, la rampe à tasseaux."""
    t = Toile(32, 43)
    for x in range(4, 28):                                            # le mur de planches
        for y in range(22, 34):
            pl = (x - 4) // 3
            lum = 0.52 + 0.07 * bruit(pl, 0, 0) + 0.035 * bruit(x, y * 3, 1)
            lum -= 0.20 * max(0, 1 - (y - 22) / 4)                    # l'ombre du toit
            lum -= 0.10 * max(0, (y - 30) / 3)                        # le bas, terni
            if (x - 4) % 3 == 0:
                lum -= 0.18
            elif (x - 4) % 3 == 1:
                lum += 0.06
            if bruit(pl, y // 4, 3) > 0.9 and (x - 4) % 3 == 2:
                lum -= 0.2                                            # un nœud
            t.put(x, y, ton(CHENE, lum))
    t.poly([(16, 13), (4, 22), (28, 22)], lambda x, y: ton(CHENE, 0.26 + 0.18 * (y - 13) / 9
                                                          + (0.06 if x < 16 else -0.04) - (0.12 if (x - 4) % 3 == 0 else 0)))
    for y in range(22, 34):                                           # les poteaux d'angle
        t.put(4, y, ton(CHENE, 0.80))
        t.put(27, y, ton(CHENE, 0.30))
    for x in range(4, 28):
        t.put(x, 23, ton(CHENE, 0.62))                                # la lisse
    t.ellipse(16, 18.5, 2, 1.8, lambda u, v: ton(CHENE, 0.72) if u * u + v * v > 0.45 else ton(CHENE, 0.06 + 0.06 * (v + 1)))
    for y in range(25, 30):                                           # la fenêtre
        for x in range(6, 12):
            if x in (6, 11) or y in (25, 29):
                t.put(x, y, ton(CHENE, 0.75 if x == 6 or y == 25 else 0.4))
            else:
                t.put(x, y, ton(VITRE, 0.25 + 0.5 * (1 - (y - 26) / 3) * (1 - (x - 7) / 4) + (0.4 if x - 7 == y - 26 else 0)))
    for x in range(5, 13):
        t.put(x, 30, ton(CHENE, 0.85))                                # l'appui
    for y in range(26, 34):                                           # la trappe ouverte
        for x in range(14, 19):
            t.put(x, y, ton(NOYER, 0.04 + 0.10 * (y - 26) / 7))
        t.put(13, y, ton(CHENE, 0.85))
        t.put(19, y, ton(CHENE, 0.35))
    for x in range(13, 20):
        t.put(x, 25, ton(CHENE, 0.8))
    for x in (20, 21):                                                # le battant, ses pentures
        for y in range(27, 34):
            t.put(x, y, ton(CHENE, 0.62 if x == 20 else 0.45))
    t.put(20, 28, ton(FER_R, 0.5))
    t.put(20, 32, ton(FER_R, 0.5))
    for y in range(26, 32):                                           # le nichoir
        for x in range(24, 27):
            t.put(x, y, ton(CHENE, 0.70 - 0.05 * (y - 26) + 0.03 * bruit(x, y, 2)))
    for x in range(23, 28):
        t.put(x, 25, ton(CHENE, 0.92))
    for x in (5, 26):                                                 # les pieds
        for y in range(34, 41):
            t.put(x, y, ton(CHENE, 0.55 - 0.04 * (y - 34)))
            t.put(x + 1, y, ton(CHENE, 0.28 - 0.02 * (y - 34)))
    for x in range(4, 28):
        t.put(x, 34, ton(CHENE, 0.22))                                # la poutre sous le plancher
    for k in range(9):                                                # la rampe à tasseaux
        y = 34 + k // 2
        for x in range(16 + k, 19 + k):
            t.put(x, y, ton(CHENE, 0.70 - 0.03 * k + 0.04 * bruit(x, y, 6)))
        if k % 2:
            t.put(18 + k, y, ton(CHENE, 0.32))
    toit_planches(t)
    im = ombre_portee(t.fini(), 16.5, 40, 15.5, 3.2)
    p = im.load()
    for i in range(14):                                               # des brins de paille au pied
        x = 3 + int((bruit(i, 0, 31) + 1) * 13)
        y = 39 + int((bruit(i, 1, 31) + 1) * 1.6)
        if 0 <= x < 32 and y < 43 and p[x, y][3] < 200:
            p[x, y] = ton(PAILLE_R, 0.5 + 0.5 * bruit(i, 2, 31)) + (255,)
    return im, (16, 41)


# ---------- les images reprises ----------

def cadre(planche, n, w, h, colonnes):
    return planche.crop(((n % colonnes) * w, (n // colonnes) * h, (n % colonnes + 1) * w, (n // colonnes + 1) * h))


def main():
    donnees = json.load(open(DONNEES, encoding='utf-8'))['HAMEAUX']
    hauts = Image.open(os.path.join(ASSETS, 'murs_hauts.png')).convert('RGBA')
    blocs = Image.open(os.path.join(ASSETS, 'blocs.png')).convert('RGBA')
    puits = Image.open(os.path.join(ASSETS, 'puits.png')).convert('RGBA')
    verger = Image.open(os.path.join(ASSETS, 'verger.png')).convert('RGBA')
    crops = Image.open(os.path.join(ASSETS, 'crops.png')).convert('RGBA')
    terre = Image.open(os.path.join(ASSETS, 'soil_dry.png')).convert('RGBA')
    cultures = json.load(open(os.path.join(ROOT, 'data', 'crops.json'), encoding='utf-8'))
    cultures = cultures.get('CULTURES', cultures)
    ch = hauts.width // 16
    haut = lambda n: cadre(hauts, n, 16, 40, ch)  # noqa: E731
    bloc = lambda n: cadre(blocs, n, 16, 24, blocs.width // 16)  # noqa: E731
    sol = lambda n: bloc(n).crop((0, 8, 16, 24))  # noqa: E731   (le sol : les 16 px du bas)
    meuble = lambda nom: Image.open(os.path.join(ASSETS, f'meuble_{nom}.png')).convert('RGBA')  # noqa: E731

    def legume(nom):
        sp = cultures[nom]['sprite']
        c = sp['c'][-1]
        return crops.crop((c * sp['l'], sp['r'] * sp['h'], (c + 1) * sp['l'], (sp['r'] + 1) * sp['h']))

    # chaque sorte : ses images, une par variante, et leur pied ; par défaut le milieu du bas
    images = {}
    for m in ('pierre', 'taille', 'bois'):
        images['mur_' + m] = [(haut(MURS_HAUTS[m] + k), None) for k in range(16)]
        images['fenetre_' + m] = [(haut(FENETRES + MATIERE[m] * 4 * 16 + k), None) for k in range(16)]
        images['porte_' + m] = [(haut(PORTES[m]), None)]
    images['porte_cote'] = [(bloc(PORTE_VERTICALE), None)]
    for s, nom in MEUBLES.items():
        im = meuble(nom)
        # (le pied : le milieu du bas, 1 px sous l'image comme à la ferme ; un lit, PIED px plus haut)
        images[s] = [(im, (im.width // 2, im.height + 1 - (PIED if s.startswith('lit') else 0)))]
    images['four'] = [(bloc(FOUR), None)]
    images['cuisiniere'] = [(bloc(CUISINIERE), None)]
    images['barriere'] = [(bloc(BARRIERES + k), None) for k in range(16)]
    images['puits'] = [(puits.crop((0, 0, 50, 50)), (25, 49))]
    for nom, f in (('coffre', coffre), ('banc', banc), ('panneau', panneau), ('billot', billot), ('barque', barque), ('sechoir', sechoir),
                   ('wagonnet', wagonnet), ('tas_minerai', tas_minerai), ('auge', auge), ('claie', claie),
                   ('paniers', paniers), ('poulailler', poulailler)):
        images[nom] = [f()]
    images['tas_bois'] = [tas_bois(0), tas_bois(1)]
    images['fruitier'] = [(verger.crop(((5 + 4 * k) * 80, 0, (6 + 4 * k) * 80, 80)), (40, 80)) for k in range(5)]
    for s, n in SOLS.items():
        images[s] = [(sol(n + k), None) for k in range(16)]
    images['terre'] = [(terre, None)]
    images['potager'] = [(legume(n), None) for n in LEGUMES]
    images['tapis'] = [(meuble(f'tapis_{k}'), None) for k in (1, 2, 3)]

    # la planche : les images rangées de gauche à droite, une rangée après l'autre
    table, places, x, y, hl = {}, [], 0, 0, 0
    for s in donnees['SORTES']:
        liste = images[s['nom']]
        if len(liste) != s['variantes']:
            raise SystemExit(f"{s['nom']} : {len(liste)} images pour {s['variantes']} variantes (data/monde.json)")
        table[s['nom']] = []
        for im, pied in liste:
            w, h = im.size
            if x + w > LARGEUR_PLANCHE:
                x, y, hl = 0, y + hl + 1, 0
            px, py = pied if pied else (w // 2, h)
            table[s['nom']].append([x, y, w, h, px, py])
            places.append((im, x, y))
            x += w + 1
            hl = max(hl, h)
    planche = Image.new('RGBA', (LARGEUR_PLANCHE, y + hl), (0, 0, 0, 0))
    for im, x0, y0 in places:
        planche.alpha_composite(im, (x0, y0))
    planche.save(SORTIE)
    with open(SORTIE_JSON, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/hameaux.png : {planche.width} × {planche.height}, {len(places)} images de {len(table)} sortes')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', planche.size, (106, 150, 72, 255))
        fond.alpha_composite(planche)
        fond.resize((planche.width * 3, planche.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_hameaux.png'))


if __name__ == '__main__':
    main()
