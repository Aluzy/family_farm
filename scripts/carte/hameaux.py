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
# Les sortes, leur ordre et leurs variantes sont ceux de data/monde.json (HAMEAUX.SORTES), puis ceux du port
# (data/village.json PORT.SORTES : scripts/carte/port.py, le chantier « l'île à bâtir ») ; la table
# (assets/hameaux.json : { "sorte": [[x, y, l, h, px, py]…] }, une entrée par variante : le rectangle
# dans la planche et le pied, le point posé au sol) a la forme de celle des rochers. Le pied d'une
# pièce d'une case : le milieu du bas de sa case ; de deux ou trois cases : le milieu du bas de ses
# cases ; un lit : 8 px plus haut (rangé derrière qui passe devant lui, comme à la ferme : PIED).
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'batiments'))  # style_v2.py (blocs.py)
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour, hasard  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402,F401
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


# ---------- les nuances (scripts/carte/nuances.py : bruit, rampe, ton) ----------

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
FRENE = rampe([(96, 70, 40), (150, 116, 72), (202, 168, 116), (236, 214, 170)])
ACIER = rampe([(30, 34, 40), (70, 78, 88), (122, 132, 144), (180, 188, 198), (236, 240, 244)])
BLEU = rampe([(22, 44, 70), (40, 78, 116), (66, 116, 158), (110, 160, 196), (170, 206, 228)])
FILET_R = rampe([(70, 64, 48), (120, 110, 84), (170, 160, 128), (214, 206, 176), (238, 234, 214)])
LIEGE = rampe([(110, 34, 24), (176, 62, 40), (222, 108, 66), (246, 160, 112)])
ROCHE = rampe([(44, 44, 50), (82, 82, 88), (124, 122, 124), (170, 166, 162), (212, 208, 200)])
CUIVRE_R = rampe([(96, 46, 22), (160, 86, 42), (214, 136, 74), (246, 196, 132)])
FERRUGINEUX = rampe([(70, 34, 26), (124, 62, 40), (176, 98, 62), (214, 146, 104)])
EAU_R = rampe([(20, 44, 66), (36, 76, 108), (60, 116, 150), (110, 168, 196), (200, 230, 240)])
OSIER = rampe([(90, 62, 30), (146, 104, 52), (196, 152, 86), (228, 196, 132), (246, 226, 176)])
HERBE_R = rampe([(30, 52, 24), (58, 88, 36), (98, 128, 54), (150, 170, 86), (196, 206, 130)])
SAUGE = rampe([(48, 62, 50), (82, 102, 80), (122, 142, 116), (168, 184, 156), (208, 218, 196)])
LAVANDE = rampe([(58, 36, 92), (96, 66, 140), (140, 108, 184), (186, 160, 220)])
CHAMPI_R = rampe([(70, 36, 20), (122, 66, 36), (176, 108, 62), (216, 160, 108), (240, 216, 180)])
BAIE_R = rampe([(56, 10, 30), (110, 22, 50), (170, 40, 70), (220, 90, 110), (250, 180, 190)])
CEPE = rampe([(52, 30, 16), (96, 56, 28), (142, 92, 48), (190, 142, 92), (236, 214, 176)])
FONTE_R = rampe([(14, 14, 16), (32, 32, 36), (56, 56, 62), (90, 90, 98), (140, 140, 150)])
ECORCE = rampe([(30, 20, 12), (58, 40, 24), (88, 64, 40), (120, 92, 60), (150, 120, 82)])


# ---------- les objets du hameau ----------

def banc():
    """Le banc de la place, vu de haut à 45° : deux cases de large ; un dossier de deux lattes de chêne
    sur ses montants, l'assise de trois lattes vue de dessus (le fil du bois, les vis), son chant ;
    des accoudoirs de fer forgé enroulés ; quatre pieds et leur entretoise ; l'ombre."""
    t = Toile(34, 26)
    for x in (4, 28):                                                 # les montants du dossier
        for y in range(3, 15):
            t.put(x, y, ton(CHENE, 0.62 - 0.02 * (y - 3)))
            t.put(x + 1, y, ton(CHENE, 0.32))
    for y0 in (4, 8):                                                 # les lattes du dossier
        for x in range(2, 32):
            fil = 0.03 * bruit(x // 3, y0, 201) + 0.025 * bruit(x, y0, 202)
            t.put(x, y0, ton(CHENE, 0.88 - 0.12 * x / 31 + fil))
            t.put(x, y0 + 1, ton(CHENE, 0.62 - 0.12 * x / 31 + fil))
            t.put(x, y0 + 2, ton(CHENE, 0.36 - 0.08 * x / 31))
    for x in (5, 28):
        for y0 in (5, 9):
            t.put(x, y0, ton(ACIER, 0.85))                             # les vis
    for x in (5, 26, 6, 27):                                          # les pieds
        for y in range(18, 25):
            t.put(x, y, ton(CHENE, (0.55 if x in (5, 26) else 0.28) - 0.02 * (y - 18)))
    for x in range(7, 26):                                            # l'entretoise
        t.put(x, 21, ton(CHENE, 0.42 - 0.1 * x / 25))
    for k, y in enumerate((12, 14, 16)):                              # l'assise : trois lattes vues de dessus
        for x in range(2, 32):
            fil = 0.03 * bruit(x // 4, y, 203 + k) + 0.02 * bruit(x, y, 204)
            t.put(x, y, ton(CHENE, 0.90 - 0.14 * x / 31 - 0.04 * k + fil))
            t.put(x, y + 1, ton(CHENE, 0.58 - 0.14 * x / 31 - 0.04 * k + fil))      # le bord de la latte, le jour entre deux
    for x in range(2, 32):                                            # le chant de l'assise
        t.put(x, 18, ton(CHENE, 0.40 - 0.1 * x / 31))
    for x in (6, 27):
        for y in (12, 14, 16):
            t.put(x, y + 1, ton(ACIER, 0.80))                          # les vis
    for x0, sens in ((1, 1), (32, -1)):                               # les accoudoirs de fer forgé
        for y in range(10, 19):
            t.put(x0, y, ton(FONTE_R, 0.55 if sens > 0 else 0.30))
        for k in range(3):
            t.put(x0 + sens * k, 10, ton(FONTE_R, 0.75 - 0.1 * k))
        t.put(x0 + sens * 2, 11, ton(FONTE_R, 0.5))
        t.put(x0 + sens, 12, ton(FONTE_R, 0.35))                       # l'enroulement
    im = ombre_portee(t.fini(), 17, 23.8, 16.5, 2.4)
    return im, (17, 25)


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
    """Le billot du bûcheron, vu de haut à 45° : une souche sciée net, son dessus en bois de bout
    (cernes, cœur, fentes) cerné d'un pixel d'écorce, son flanc d'écorce crevassée, ses racines, une
    hache plantée dedans (fer et fil brillant, manche de frêne) ; des copeaux au pied."""
    t = Toile(18, 24)
    cx, cy, rx, ry = 8.5, 11.5, 6.6, 3.6
    for y in range(11, 22):                                           # le flanc, de l'écorce
        for x in range(2, 16):
            dx = (x + .5 - cx) / rx
            if abs(dx) > 1:
                continue
            lum = 0.58 - 0.42 * dx - 0.12 * (y - 11) / 10 + 0.07 * bruit(x, y // 2, 61)
            if bruit(x, y // 3, 62) > 0.55:
                lum -= 0.22                                            # une crevasse
            yb = cy + ry * (1 - dx * dx) ** 0.5
            if y >= yb + 7:
                continue
            t.put(x, y, ton(ECORCE, lum))
    for x0, d in ((1, -1), (15, 1), (6, 0), (11, 0)):                  # les racines, au pied
        for k in range(3):
            x = x0 + d * k // 2
            y = 18 + k
            t.put(x, y, ton(ECORCE, 0.45 - 0.12 * k - 0.2 * max(0, d)))
            t.put(x + 1, y, ton(ECORCE, 0.30 - 0.1 * k))
    for y in range(7, 16):                                            # le dessus, en bois de bout
        for x in range(1, 17):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            d = (u * u + v * v) ** 0.5
            if d > 1:
                continue
            if d > 0.86:
                c = ton(ECORCE, 0.62 - 0.3 * (u + v) / 2)
            else:
                lum = 0.66 - 0.16 * (u + v) / 2 + 0.11 * math.sin(d * 13) - 0.18 * max(0, d - 0.7) / 0.16
                if d < 0.12:
                    lum -= 0.22                                        # le cœur
                if abs(v + 0.15 * u) < 0.16 and u > 0.2:
                    lum -= 0.32                                        # une fente
                if bruit(x, y, 63) > 0.85:
                    lum -= 0.1                                         # les traces de hache
                c = ton(COEUR, lum)
            t.put(x, y, c)
    for k in range(9):                                                # le manche, en biais
        x, y = 12 + k // 3, 9 - k
        t.put(x, y, ton(FRENE, 0.78 - 0.04 * k))
        t.put(x + 1, y, ton(FRENE, 0.40 - 0.02 * k))
    for y in range(8, 12):                                            # le fer, planté dans le bois
        for x in range(7, 13):
            if y == 11 and x in (7, 12):
                continue
            lum = 0.55 + 0.25 * (12 - x) / 5 - 0.15 * (y - 8) / 3
            if y == 8:
                lum += 0.3                                             # le dos, au soleil
            if x == 7:
                lum = 0.95                                             # le fil, brillant
            t.put(x, y, ton(ACIER, lum))
    t.put(11, 9, ton(ACIER, 0.15))                                     # l'œil du fer
    im = ombre_portee(t.fini(), 9, 21.3, 8.5, 2.2)
    p = im.load()
    for i in range(7):                                                # des copeaux
        x = int((bruit(i, 0, 64) + 1) * 8.5)
        y = 21 + int((bruit(i, 1, 64) + 1) * 1.4)
        if 0 <= x < 18 and y < 24 and p[x, y][3] < 200:
            p[x, y] = ton(COEUR, 0.55 + 0.35 * bruit(i, 2, 64)) + (255,)
    return im, (9, 22)


def barque():
    """La barque tirée au sec, vue de haut à 45° : la proue pointue à droite, le tableau arrière
    plat à gauche ; le plat-bord clair, l'intérieur en bordages et membrures, deux bancs, deux
    une rame couchée devant ; le flanc proche peint d'une bande bleue, le bas goudronné ; son ombre."""
    t = Toile(36, 22)
    yc = 8.5

    def demi(x):                                                      # la demi-largeur, vue à 45°
        s = (x + .5 - 2) / 31
        if s < 0 or s > 1:
            return 0
        if s < 0.4:
            return 5.0 * (0.66 + 0.34 * math.sin(math.pi / 2 * s / 0.4))
        return 5.0 * max(0, 1 - ((s - 0.4) / 0.6) ** 1.8)

    for x in range(1, 35):                                            # le flanc proche
        w = demi(x)
        if w <= 0:
            continue
        haut = int(3.6 * (1 - ((x + .5 - 2) / 31) ** 3)) + 1
        for k in range(haut + 1):
            y = int(yc + w) + k
            f = k / max(1, haut)
            if f < 0.30:
                c = ton(BLEU, 0.62 - 0.25 * f + 0.05 * bruit(x, y, 71))
            elif f < 0.85:
                c = ton(CHENE, 0.42 - 0.2 * f + 0.05 * bruit(x, y, 72) - (0.1 if k % 2 else 0))
            else:
                c = ton(NOYER, 0.12)
            t.put(x, y, c)
    for x in range(1, 35):                                            # le dessus : plat-bord, intérieur
        w = demi(x)
        if w <= 0:
            continue
        for y in range(int(yc - w - 1), int(yc + w + 2)):
            v = (y + .5 - yc) / w
            if abs(v) > 1:
                continue
            bord = abs(v) > 1 - 1.4 / max(w, 1.4) or x <= 2
            if bord:
                c = ton(CHENE, (0.88 if v < 0 else 0.64) + 0.04 * bruit(x, y, 73))
            else:
                lum = 0.50 - 0.26 * v + 0.04 * bruit(x, y, 74)        # le fond, la paroi éloignée éclairée
                if int((v + 1) * 3) != int((v + 1) * 3 + 0.22):
                    lum -= 0.10                                        # le joint des bordages
                if x % 4 == 0:
                    lum -= 0.07                                        # une membrure
                c = ton(CHENE, lum)
            t.put(x, y, c)
    for x0 in (10, 20):                                               # les bancs
        w = demi(x0)
        for y in range(int(yc - w) + 1, int(yc + w)):
            t.put(x0, y, ton(CHENE, 0.92))
            t.put(x0 + 1, y, ton(CHENE, 0.74))
            t.put(x0 + 2, y, ton(CHENE, 0.28))
    for x in range(5, 27):                                            # une rame couchée au sol, devant
        y = 18 + (x - 5) // 11
        t.put(x, y, ton(FRENE, 0.82))
        t.put(x, y + 1, ton(FRENE, 0.45))
    for x in range(27, 32):                                           # sa pelle
        t.rect(x, 19, x, 21, ton(FRENE, 0.78 - 0.08 * (x - 27)))
        t.put(x, 21, ton(FRENE, 0.40))
    im = ombre_portee(t.fini(), 17, 15.5, 16.5, 3.2)
    return im, (18, 19)


def poteau(t, x, y0, y1, R, s=0):
    """Un poteau rond de 2 px vu à 45° : le flanc au soleil, le flanc à l'ombre, sa tête claire."""
    for y in range(y0, y1 + 1):
        f = (y - y0) / max(1, y1 - y0)
        t.put(x, y, ton(R, 0.70 - 0.15 * f + 0.05 * bruit(x, y, s)))
        t.put(x + 1, y, ton(R, 0.36 - 0.10 * f + 0.04 * bruit(x + 1, y, s)))
    t.put(x, y0, ton(R, 0.92))
    t.put(x + 1, y0, ton(R, 0.66))


def sechoir():
    """Le séchoir à filets du pêcheur, vu de haut à 45° : deux perches plantées, calées par des
    piquets ; une traverse ronde ; le filet de chanvre qui pend en losanges, son bord de flotteurs
    de liège rouges, ses plombs ; le bas du filet qui traîne en tas ; l'ombre du tout au sol."""
    t = Toile(36, 34)
    for x in (3, 31):                                                 # les perches
        poteau(t, x, 2, 30, CHENE, 81)
        t.put(x - 1, 30, ton(CHENE, 0.3))
        t.put(x + 2, 30, ton(CHENE, 0.2))
    for k in range(4):                                                # les piquets qui les calent
        t.put(1 - k // 3, 27 + k, ton(CHENE, 0.6))
        t.put(34 + k // 3, 27 + k, ton(CHENE, 0.35))
    for x in range(2, 34):                                            # la traverse
        t.put(x, 3, ton(CHENE, 0.88 - 0.1 * x / 33))
        t.put(x, 4, ton(CHENE, 0.55 - 0.1 * x / 33))
        t.put(x, 5, ton(CHENE, 0.28))
    for x in (3, 4, 31, 32):                                          # les liens de corde
        t.put(x, 4, ton(FILET_R, 0.9))
    im = ombre_portee(t.fini(), 18, 31.3, 17.5, 2.4)
    # le filet, posé après le contour : ses mailles restent ajourées (l'herbe se voit au travers)
    filet = Toile(36, 34)
    filet.im, filet.px = im, im.load()
    t = filet
    for x in range(6, 31):                                            # le filet, une maille de 6 px
        bas = 23 + 3 * (1 - ((x - 18) / 13) ** 2)                     # il pend plus au milieu
        for y in range(6, int(bas) + 1):
            if (x + y) % 6 == 0 or (x - y) % 6 == 0:
                lum = 0.75 - 0.30 * (y - 6) / 20 + 0.08 * bruit(x, y, 82)
                if (x - y) % 6 == 0:
                    lum -= 0.18                                        # le fil qui part vers l'ombre
                if bruit(x // 3, y // 3, 83) > 0.7:
                    lum -= 0.15                                        # un pli
                t.put(x, y, ton(FILET_R, lum))
        if x % 3 == 0:                                                # les flotteurs, sous la traverse
            t.put(x, 6, ton(LIEGE, 0.85))
            t.put(x, 7, ton(LIEGE, 0.45))
        if x % 4 == 1:                                                # les plombs, au bas
            t.put(x, int(bas), ton(ACIER, 0.35))
    for x in range(7, 30):                                            # le bas du filet, en tas au sol
        h = int(2.4 * (1 - ((x - 18) / 12) ** 2)) + 1
        for k in range(h):
            y = 30 - k
            lum = 0.52 - 0.12 * k + 0.12 * bruit(x, y, 84)
            if (x + y) % 3 == 0:
                lum -= 0.18
            t.put(x, y, ton(FILET_R, lum))
    return im, (18, 31)


def wagonnet():
    """Le wagonnet du mineur, vu de haut à 45° : une caisse de chêne évasée, cerclée de fer et
    rivetée, pleine de minerai (pierres grises, éclats de cuivre et de fer) ;
    ses roues de fonte vues de chant ; le bout de voie sous lui (deux rails sur leurs traverses) ; son ombre."""
    t = Toile(18, 25)
    for y in (19, 22):                                                # les traverses de la voie
        for x in range(1, 17):
            t.put(x, y, ton(CHENE, 0.50 - 0.2 * (x / 16) + 0.05 * bruit(x, y, 91)))
            t.put(x, y + 1, ton(CHENE, 0.22))
    for x in (2, 14):                                                 # les rails
        for y in range(18, 25):
            t.put(x, y, ton(ACIER, 0.80))
            t.put(x + 1, y, ton(ACIER, 0.40))
    for y in range(9, 17):                                            # la face avant, en planches
        r = 1 if y >= 13 else 0                                        # un peu évasée vers le haut
        for x in range(1 + r, 17 - r):
            lum = 0.55 - 0.20 * (x - 1) / 15 - 0.10 * (y - 9) / 8 + 0.04 * bruit(x, y, 92)
            if (y - 9) % 3 == 0:
                lum -= 0.14                                            # le joint des planches
            c = ton(CHENE, lum)
            if y in (10, 15):
                c = ton(ACIER, 0.62 - 0.3 * (x - 1) / 15)               # les cercles de fer
            if x in (1 + r, 16 - r):
                c = ton(ACIER, 0.75 if x == 1 + r else 0.30)            # les cornières
            t.put(x, y, c)
    for x in (4, 8, 12):
        t.put(x + (1 if x == 12 else 0), 10, ton(ACIER, 0.95))         # les rivets
        t.put(x + (1 if x == 12 else 0), 15, ton(ACIER, 0.95))
    for y in range(4, 9):                                             # le dessus : le rebord et le minerai
        for x in range(0, 18):
            if y in (4, 8) or x in (0, 17):
                if y == 4 and x in (0, 17):
                    continue
                t.put(x, y, ton(CHENE, 0.88 if y == 4 or x == 0 else 0.60))
    pierres = [(3, 5, 0), (6, 4, 1), (9, 4, 2), (12, 5, 3), (14, 6, 4), (4, 7, 5), (8, 6, 6), (11, 7, 7), (2, 3, 8), (7, 2, 9),
               (10, 2, 10), (13, 3, 11), (5, 3, 12)]
    for px, py, k in pierres:                                         # le minerai qui dépasse
        R = CUIVRE_R if k in (2, 7) else FERRUGINEUX if k == 5 else ROCHE
        for dy in range(2):
            for dx in range(3 - dy):
                lum = 0.80 - 0.25 * dx - 0.35 * dy + 0.06 * bruit(px, py, k)
                t.put(px + dx, py + dy, ton(R, lum))
    for x in range(2, 16):                                            # le châssis, dans l'ombre
        t.put(x, 17, ton(NOYER, 0.10))
    for x0 in (2, 13):                                                # les roues, vues de chant sur les rails
        for y in range(17, 22):
            bombe = 1 if y in (17, 21) else 0
            t.put(x0 + bombe, y, ton(ACIER, 0.60 - 0.08 * (y - 17)))
            t.put(x0 + 1, y, ton(ACIER, 0.34 - 0.04 * (y - 17)))
            if not bombe:
                t.put(x0 + 2, y, ton(ACIER, 0.16))
        t.put(x0 + 1, 19, ton(ACIER, 0.85))                            # le moyeu
    im = ombre_portee(t.fini(), 9, 22.5, 8.8, 2.4)
    return im, (9, 22)


def caillou(t, cx, cy, rx, ry, R, s, veine=None):
    """Une pierre taillée par facettes, vue à 45° : le dessus au soleil, le flanc gauche à mi-ombre,
    le flanc droit à l'ombre, une arête sombre en bas et à droite ; veine : une rampe de minerai."""
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            d = u * u + v * v + 0.10 * bruit(x, y, s)
            if d > 1:
                continue
            if v < -0.2 + 0.25 * u:
                lum = 0.80 - 0.10 * u
            elif u < 0.1:
                lum = 0.55
            else:
                lum = 0.30
            lum += 0.03 * bruit(x, y, s + 1) + 0.07 * bruit(s, 0, 5)          # chaque pierre son ton
            lum += 0.08 * (1 - (u * u + v * v))                         # bombée au milieu
            if d > 0.70 and (u + v) > 0.1:
                lum -= 0.28                                            # l'arête, contre le voisin
            c = ton(R, lum)
            if veine and bruit(x + y, x - y, s + 2) > 0.78 and d < 0.6:
                c = ton(veine, lum + 0.15)                              # une veine de minerai
            t.put(x, y, c)


def tas_minerai():
    """Un tas de minerai, vu de haut à 45° : des pierres taillées par facettes, éclairées en haut à
    gauche, veinées de cuivre et de fer ; des éclats brillants ; du gravier au pied ; l'ombre."""
    t = Toile(18, 19)
    pierres = [(4.5, 13, 3.6, 3.0, ROCHE, CUIVRE_R), (13.5, 13.5, 3.6, 3.0, ROCHE, FERRUGINEUX),
               (9, 14.5, 3.4, 2.8, ROCHE, None), (6.5, 9.5, 3.2, 2.8, ROCHE, FERRUGINEUX),
               (11.5, 9.5, 3.4, 2.9, ROCHE, CUIVRE_R), (9, 6, 3.0, 2.6, ROCHE, CUIVRE_R)]
    for k, (cx, cy, rx, ry, R, veine) in enumerate(pierres):
        caillou(t, cx, cy, rx, ry, R, 100 + 7 * k, veine)
    for x, y in ((8, 5), (12, 8), (4, 12), (14, 12)):                 # les éclats qui brillent
        t.put(x, y, ton(CUIVRE_R, 1.0))
    im = ombre_portee(t.fini(), 9, 17.3, 8.6, 2)
    p = im.load()
    for i in range(8):                                                # le gravier au pied
        x = int((bruit(i, 0, 111) + 1) * 8.5)
        y = 17 + int((bruit(i, 1, 111) + 1))
        if 0 <= x < 18 and y < 19 and p[x, y][3] < 200:
            p[x, y] = ton(ROCHE, 0.4 + 0.3 * bruit(i, 2, 111)) + (255,)
    return im, (9, 18)


def auge():
    """L'auge de l'enclos du berger, vue de haut à 45° : un bac de planches de chêne évasé, cerclé
    de fer, posé sur deux tréteaux ; le rebord éclairé ; l'eau dedans, plus claire au fond, ses
    reflets et quelques brins de paille qui flottent ; des taches d'eau au sol ; l'ombre."""
    t = Toile(34, 21)
    for x0 in (4, 28):                                                # les tréteaux, aux deux bouts
        for k in range(5):
            t.put(x0 - 1 - k // 2, 13 + k, ton(CHENE, 0.55 - 0.05 * k))
            t.put(x0 + 2 + k // 2, 13 + k, ton(CHENE, 0.30 - 0.03 * k))
    for y in range(9, 16):                                            # la face avant, évasée vers le haut
        r = (y - 9) // 3
        for x in range(1 + r, 33 - r):
            lum = 0.55 - 0.18 * (x / 32) - 0.12 * (y - 9) / 6 + 0.04 * bruit(x, y, 121)
            if (y - 9) % 3 == 2:
                lum -= 0.14                                            # le joint des planches
            c = ton(CHENE, lum)
            if x in (6, 7, 26, 27):
                c = ton(ACIER, 0.62 if x in (6, 26) else 0.32)          # les cercles de fer
            t.put(x, y, c)
    for y in range(2, 9):                                             # le dessus : rebord et eau
        for x in range(0, 34):
            bord = y in (2, 8) or x in (0, 1, 32, 33)
            if y in (2, 8) and x in (0, 33):
                continue
            if bord:
                lum = 0.90 if (y == 2 or x <= 1) else 0.62
                t.put(x, y, ton(CHENE, lum + 0.03 * bruit(x, y, 122)))
            else:
                lum = 0.35 + 0.30 * (y - 3) / 4 + 0.05 * bruit(x, y, 123)
                if y == 3:
                    lum -= 0.15                                        # l'ombre du rebord du fond
                if (x - 2 * y) % 13 in (0, 1) and 3 < y < 7:
                    lum += 0.25                                        # un reflet
                t.put(x, y, ton(EAU_R, lum))
    for x, y in ((9, 5), (10, 5), (21, 6), (22, 7)):                  # des brins de paille qui flottent
        t.put(x, y, ton(PAILLE_R, 0.75))
    for x in (6, 7, 26, 27):                                          # les cercles passent sur le rebord
        t.put(x, 8, ton(ACIER, 0.7 if x in (6, 26) else 0.4))
    im = ombre_portee(t.fini(), 17, 18, 16.5, 2.6)
    p = im.load()
    for x, y in ((3, 19), (4, 19), (29, 20), (30, 20), (16, 20)):     # des flaques
        if p[x, y][3] < 200:
            p[x, y] = ton(EAU_R, 0.35) + (255,)
    return im, (17, 18)


def branche(t, x, y0, y1, s):
    """Un montant de branche brute (2 px), son écorce éclairée à gauche, un nœud ou deux."""
    for y in range(y0, y1 + 1):
        f = (y - y0) / max(1, y1 - y0)
        t.put(x, y, ton(ECORCE, 0.72 - 0.18 * f + 0.06 * bruit(x, y, s)))
        t.put(x + 1, y, ton(ECORCE, 0.38 - 0.10 * f + 0.05 * bruit(x + 1, y, s)))
        if bruit(x, y // 3, s + 1) > 0.85:
            t.put(x + 1, y, ton(ECORCE, 0.15))                      # un nœud
    t.put(x, y0, ton(COEUR, 0.80))
    t.put(x + 1, y0, ton(COEUR, 0.55))


def bouquet(t, x, y0, R, fleur, s):
    """Un bouquet d'herbes qui sèche la tête en bas : la ficelle, les tiges serrées, les feuilles
    qui s'évasent vers le bas ; fleur : une rampe de fleurs au bout (lavande…), ou rien."""
    t.put(x, y0, ton(FILET_R, 0.85))
    t.put(x, y0 + 1, ton(FILET_R, 0.60))
    for k in range(9):
        y = y0 + 2 + k
        demi = min(2, k // 3) + (1 if k > 6 else 0)
        for dx in range(-demi, demi + 1):
            if k > 6 and abs(dx) == demi and bruit(x + dx, y, s) < 0:
                continue                                               # le bord, effiloché
            lum = 0.62 - 0.14 * dx - 0.03 * k + 0.08 * bruit(x + dx, y, s)
            c = ton(R, lum)
            if fleur and k >= 6 and bruit(x + dx, y, s + 3) > -0.2:
                c = ton(fleur, lum + 0.1)
            t.put(x + dx, y, c)


def claie():
    """La claie du cueilleur, vue de haut à 45° : deux montants de branches brutes et leur traverse ;
    des bouquets d'herbes et de lavande qui sèchent la tête en bas, liés de ficelle ; en bas, un
    plateau d'osier tressé sur ses pieds, où sèchent des champignons ; l'ombre."""
    t = Toile(36, 31)
    for x in (2, 32):
        branche(t, x, 3, 28, 131 + x)
    for x in range(1, 35):                                            # la traverse
        t.put(x, 3, ton(ECORCE, 0.82 - 0.2 * x / 34))
        t.put(x, 4, ton(ECORCE, 0.45 - 0.1 * x / 34))
    for x in (2, 3, 32, 33):                                          # les ligatures
        t.put(x, 4, ton(FILET_R, 0.8))
    for x in (6, 29):                                                 # les pieds du plateau
        for y in range(23, 29):
            t.put(x, y, ton(CHENE, 0.55 - 0.04 * (y - 23)))
    for y in range(18, 24):                                           # le plateau d'osier, vu de dessus
        for x in range(4, 32):
            bord = y in (18, 23) or x in (4, 31)
            if bord:
                lum = 0.85 if (y == 18 or x == 4) else 0.45
            else:
                lum = 0.60 - 0.10 * (x - 4) / 27 + (0.14 if (x // 2 + y) % 2 else -0.08)   # le tressage
            t.put(x, y, ton(OSIER, lum + 0.03 * bruit(x, y, 150)))
    for x in range(4, 32):                                            # le chant du plateau
        t.put(x, 24, ton(OSIER, 0.35 - 0.1 * (x - 4) / 27))
    for k, x in enumerate(range(7, 30, 4)):                           # les champignons qui sèchent
        y = 20 + (k % 2)
        t.put(x, y, ton(CHAMPI_R, 0.85))
        t.put(x + 1, y, ton(CHAMPI_R, 0.60))
        t.put(x, y + 1, ton(CHAMPI_R, 0.45))
        t.put(x + 1, y + 1, ton(CHAMPI_R, 0.30))
    im = ombre_portee(t.fini(), 18, 28.6, 17.2, 2.2)
    # les bouquets, posés après le contour : on voit entre eux au travers de la claie
    t = Toile(36, 31)
    t.im, t.px = im, im.load()
    sortes = [(HERBE_R, None), (HERBE_R, LAVANDE), (SAUGE, None), (HERBE_R, LAVANDE), (SAUGE, None), (HERBE_R, None)]
    for k, x in enumerate(range(7, 31, 4)):
        R, fleur = sortes[k]
        bouquet(t, x, 5, R, fleur, 140 + k)
    return im, (18, 29)


def panier(rx, ry, h, contenu, s, anse=False):
    """Un panier d'osier vu de haut à 45°, sur sa propre toile cernée : son bord clair en ellipse,
    son flanc tressé en rangs décalés (éclairé à gauche), son contenu en tas ; anse : une anse
    d'osier par-dessus. Rend l'image et le point du milieu de son bord."""
    w, haut_anse = int(2 * rx) + 3, 6 if anse else 1
    t = Toile(w, int(2 * ry + h) + haut_anse + 3)
    cx, cy = w / 2, ry + haut_anse + 1
    for y in range(t.h):                                              # le flanc
        for x in range(w):
            u = (x + .5 - cx) / rx
            if abs(u) > 1:
                continue
            bas = cy + ry * (1 - u * u) ** 0.5
            if y < bas - 0.5 or y > bas + h:
                continue
            k = int(y - bas + 0.5)
            lum = 0.40 - 0.22 * u - 0.06 * k + (0.12 if (x + k) % 2 else -0.10)
            t.put(x, y, ton(OSIER, lum + 0.03 * bruit(x, y, s)))
    R, rond = contenu
    for y in range(t.h):                                              # le bord et le contenu
        for x in range(w):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            d = u * u + v * v
            if d > 1:
                continue
            if d > 0.74:
                c = ton(OSIER, 0.95 - 0.40 * (u + v) / 2)               # le bord tressé
                if (x + y) % 3 == 0:
                    c = ton(OSIER, 0.70 - 0.40 * (u + v) / 2)
            else:
                lum = 0.55 - 0.25 * (u + v) / 2 + 0.06 * bruit(x, y, s + 1)
                if rond:
                    lum += 0.40 if (x + 2 * y) % 3 == 0 else -0.18 if (x + 2 * y) % 3 == 1 else 0
                else:                                                  # des chapeaux de 3 × 2, en quinconce
                    i, j = (x + (y // 2) % 2) % 3, y % 2
                    lum = 0.75 if (i, j) == (0, 0) else 0.12 if i == 2 else 0.38 + 0.1 * bruit(x // 3, y // 2, s)
                c = ton(R, lum)
            t.put(x, y, c)
    if anse:
        for k in range(int(2 * rx) - 1):
            f = (k / (2 * rx - 2)) * 2 - 1
            x = int(cx - rx + 1) + k
            y = int(round(cy - (ry + 4) * (1 - f * f) ** 0.5))
            if y < cy - ry * (1 - f * f) ** 0.5 - 0.5:
                t.put(x, y, ton(OSIER, 0.90 - 0.4 * (f + 1) / 2))
                t.put(x, y + 1, ton(OSIER, 0.45 - 0.2 * (f + 1) / 2))
    return t.fini(), cx, cy


def paniers():
    """Deux paniers d'osier du cueilleur, vus de haut à 45° : derrière, le petit, plein de baies ;
    devant, le grand à anse, plein de cèpes ; chacun cerné ; leur ombre."""
    im = Image.new('RGBA', (20, 22), (0, 0, 0, 0))
    petit, pcx, pcy = panier(4.4, 2.8, 3, (BAIE_R, True), 161)
    grand, gcx, gcy = panier(5.8, 3.4, 3, (CEPE, False), 162, anse=True)
    im.alpha_composite(petit, (int(14 - pcx), int(8 - pcy)))
    im.alpha_composite(grand, (int(7 - gcx), int(13 - gcy)))
    return ombre_portee(im, 10, 20, 9.6, 2), (10, 21)


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
    # le port (le chantier « l'île à bâtir », fiche I1a : scripts/carte/port.py), à la suite : ses sortes sont
    # celles de data/village.json (PORT.SORTES), rangées après celles des hameaux
    import port
    images.update(port.images(hauts, ch))
    sortes = donnees['SORTES'] + json.load(open(os.path.join(ROOT, 'data', 'village.json'), encoding='utf-8'))['PORT']['SORTES']

    # la planche : les images rangées de gauche à droite, une rangée après l'autre
    table, places, x, y, hl = {}, [], 0, 0, 0
    for s in sortes:
        liste = images[s['nom']]
        if len(liste) != s['variantes']:
            raise SystemExit(f"{s['nom']} : {len(liste)} images pour {s['variantes']} variantes (data/monde.json, data/village.json)")
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
