#!/usr/bin/env python3
"""Les meubles clés des projets du village (docs/economie.md, E15), vus de haut à 45° comme les autres meubles :

  meuble_tableau_liege.png   la mairie : un tableau en liège accroché au mur, des graphiques épinglés (18 × 14)
  meuble_tableau_ardoise.png l'école : un tableau noir en ardoise accroché au mur, sa tablette à craies (26 × 16)
  meuble_piano_droit.png     le lieu de divertissement : un piano droit, deux cases de large (32 × 30) ; il tourne
                             comme les autres meubles : meuble_piano_droit_dos.png (32 × 24), _cote.png (16 × 44)

(la boîte aux lettres d'un logement et le comptoir du restaurant sont ceux qui existent déjà.)

La projection (scripts/carte/blocs.py) : une hauteur de h px se voit sur h × 14/16 rangées, une profondeur de p px sur
p × 10/16 rangées ; la lumière en haut à gauche ; des rampes fines (nuances.py, n ≥ 100), une rampe par élément (chaque
planche, chaque papier), les ombres froides, les lumières chaudes ; un contour sombre d'un pixel, teinté.

  python3 scripts/batiments/projets.py            écrit les trois images dans assets/
  python3 scripts/batiments/projets.py --apercu   et apercus-ile/projets.png (agrandi ×8), et compte leurs couleurs
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'carte'))
from nuances import bruit, rampe, ton  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')
N = 120  # les nuances d'une rampe


def glisse(cles, dt):
    """Une rampe dont la teinte glisse un peu (un élément voisin, pas tout à fait le même)."""
    return rampe([tuple(max(0, min(255, round(c + dt * k))) for c, k in zip(col, (1.0, 0.6, -0.8))) for col in cles], N)


# les matières : du sombre (froid) au clair (chaud)
CHENE = [(40, 28, 34), (88, 58, 46), (138, 96, 62), (182, 136, 86), (220, 180, 122), (244, 216, 160)]
NOYER = [(18, 12, 20), (40, 22, 26), (70, 38, 32), (104, 60, 42), (142, 90, 58), (186, 132, 86)]
LIEGE = [(84, 34, 22), (140, 70, 36), (182, 108, 52), (212, 140, 70), (234, 172, 96), (248, 204, 140)]
ARDOISE = [(14, 20, 26), (24, 34, 38), (36, 50, 52), (52, 68, 68), (74, 92, 90), (104, 120, 116)]
PAPIER = [(120, 120, 136), (176, 174, 180), (214, 210, 206), (236, 232, 222), (250, 248, 238)]
CRAIE = [(150, 156, 164), (196, 200, 204), (230, 232, 230), (252, 250, 242)]
IVOIRE = [(96, 92, 100), (160, 152, 146), (212, 204, 190), (240, 234, 220), (254, 250, 238)]
EBENE = [(4, 4, 10), (16, 14, 20), (36, 32, 38), (70, 64, 70)]
LAITON = [(58, 38, 22), (118, 84, 34), (184, 140, 52), (228, 196, 100), (252, 236, 170)]
ROUGE = [(70, 14, 28), (140, 30, 36), (198, 60, 50), (236, 116, 84)]
BLEU = [(18, 26, 70), (36, 60, 130), (70, 112, 186), (130, 170, 226)]
VERT = [(16, 50, 40), (34, 96, 56), (70, 150, 74), (140, 200, 110)]
JAUNE = [(110, 74, 16), (190, 140, 30), (236, 196, 64), (252, 234, 140)]


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.p = self.im.load()

    def mettre(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = tuple(c[:3]) + (255,)

    def lire(self, x, y):
        return self.p[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def pave(self, x0, y0, x1, y1, r, base, pente=0.25, biseau=0.12, grain=0.04, s=0):
        """Un rectangle modelé : un dégradé (plus clair en haut à gauche), un biseau (le bord haut et gauche plus
        clairs, le bas et la droite plus sombres), un grain fixe."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                u = (x - x0) / max(1, x1 - x0)
                v = (y - y0) / max(1, y1 - y0)
                t = base + pente * (0.5 - (u + v) / 2) + grain * bruit(x, y, s)
                if y == y0 or x == x0:
                    t += biseau
                if y == y1 or x == x1:
                    t -= biseau
                self.mettre(x, y, ton(r, t))

    def assombrir(self, x, y, f, froid=8):
        r, g, b, a = self.lire(x, y)
        if a:
            self.mettre(x, y, (int(r * f), int(g * f), min(255, int(b * f + froid * (1 - f) * 4)), 255))

    def contour(self):
        """Un contour sombre d'un pixel autour de l'objet, teinté du ton voisin (plus doux en haut à gauche)."""
        P, w, h = self.p, self.w, self.h
        bord = []
        for y in range(h):
            for x in range(w):
                if P[x, y][3]:
                    continue
                voisins = [P[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h and P[x + dx, y + dy][3]]
                if voisins:
                    r = sum(c[0] for c in voisins) / len(voisins)
                    g = sum(c[1] for c in voisins) / len(voisins)
                    b = sum(c[2] for c in voisins) / len(voisins)
                    f = 0.34 if (x < w / 2 and y < h / 2) else 0.22
                    bord.append((x, y, (int(r * f), int(g * f), int(b * f + 14), 255)))
        for x, y, c in bord:
            P[x, y] = c


def cadre(t, x0, y0, x1, y1, ep, s):
    """Un cadre de chêne : quatre baguettes, chacune sa rampe, modelées ; le dessus de la baguette du haut (une bande
    d'une rangée, plus claire : on le voit d'en haut)."""
    bag = [glisse(CHENE, d) for d in (0, 6, -5, 3)]
    t.pave(x0, y0, x1, y0 + ep - 1, bag[0], 0.62, s=s)                     # le haut
    t.pave(x0, y1 - ep + 1, x1, y1, bag[1], 0.42, s=s + 1)                 # le bas (dans l'ombre)
    t.pave(x0, y0 + ep, x0 + ep - 1, y1 - ep, bag[2], 0.6, s=s + 2)        # la gauche (éclairée)
    t.pave(x1 - ep + 1, y0 + ep, x1, y1 - ep, bag[3], 0.38, s=s + 3)       # la droite (dans l'ombre)
    for x in range(x0, x1 + 1):                                            # le dessus du cadre
        t.mettre(x, y0, ton(bag[0], 0.9 - 0.15 * (x - x0) / max(1, x1 - x0) + 0.03 * bruit(x, 0, s)))
    # les onglets des coins : un joint sombre
    for k in range(ep):
        t.assombrir(x0 + k, y0 + k, 0.86)
        t.assombrir(x1 - k, y1 - k, 0.8)


def epingle(t, x, y, r):
    t.mettre(x, y, ton(r, 0.75))
    t.mettre(x - 1, y, ton(r, 0.5))
    t.mettre(x, y + 1, ton(r, 0.3))
    t.mettre(x - 1, y + 1, ton(r, 0.15))
    t.assombrir(x + 1, y + 1, 0.7)       # son ombre sur le papier


def papier(t, x0, y0, x1, y1, s):
    pr = glisse(PAPIER, (s % 5) - 2)
    t.pave(x0, y0, x1, y1, pr, 0.74, pente=0.18, biseau=0.06, grain=0.025, s=s)
    for y in range(y0 + 1, y1 + 2):                                        # son ombre portée sur le liège
        t.assombrir(x1 + 1, y, 0.72)
    for x in range(x0 + 1, x1 + 2):
        t.assombrir(x, y1 + 1, 0.74)
    return pr


def tableau_liege():
    """La mairie : un tableau en liège (18 × 14), accroché au mur ; épinglés : un graphique en barres, une courbe qui
    monte, un camembert, une petite note."""
    t = Toile(18, 14)
    cadre(t, 0, 0, 17, 13, 2, 11)
    li = rampe(LIEGE, N)
    for y in range(2, 12):                                                 # le liège : grain serré, des taches
        for x in range(2, 16):
            v = 0.5 - 0.12 * (x + y) / 26 + 0.2 * bruit(x, y, 3) + 0.08 * bruit(x // 2, y // 2, 4)
            if y == 2:
                v -= 0.16                                                  # sous la baguette du haut : l'ombre
            if x == 2:
                v -= 0.08
            t.mettre(x, y, ton(li, v))
    # le graphique en barres
    papier(t, 3, 3, 8, 8, 21)
    for i, (h, r) in enumerate(((2, BLEU), (3, VERT), (4, ROUGE))):
        rr = rampe(r, N)
        for y in range(8 - h, 8):
            t.mettre(4 + i * 2, y, ton(rr, 0.62 - 0.08 * (y - (8 - h))))
    for x in range(4, 9):
        t.mettre(x, 8, ton(rampe(PAPIER, N), 0.3))                         # l'axe
    epingle(t, 5, 3, rampe(ROUGE, N))
    # la courbe qui monte
    papier(t, 10, 3, 15, 7, 33)
    rr = rampe(ROUGE, N)
    for x, y in ((10, 7), (11, 6), (12, 6), (13, 5), (14, 4), (15, 3)):
        t.mettre(x, y, ton(rr, 0.55 + 0.05 * (x - 10)))
    epingle(t, 13, 3, rampe(BLEU, N))
    # le camembert
    papier(t, 10, 9, 13, 11, 45)
    jr, br = rampe(JAUNE, N), rampe(BLEU, N)
    for (x, y, r, v) in ((11, 9, jr, 0.7), (12, 9, br, 0.6), (11, 10, jr, 0.5), (12, 10, jr, 0.62)):
        t.mettre(x, y, ton(r, v))
    epingle(t, 11, 9, rampe(VERT, N))
    # la petite note, un peu de travers
    nr = rampe([(140, 120, 40), (220, 200, 90), (252, 240, 150)], N)
    for y in range(10, 12):
        for x in range(4 + (y - 10), 8 + (y - 10)):
            t.mettre(x, y, ton(nr, 0.7 - 0.1 * (y - 10) + 0.04 * bruit(x, y, 9)))
    for x in range(5, 8):
        t.mettre(x, 11, ton(nr, 0.25))
    t.contour()
    return t.im


def tableau_ardoise():
    """L'école : un tableau noir en ardoise (26 × 16) ; écrits à la craie : « 1 + 2 = 3 », une maison, une ligne ;
    en bas, la tablette à craies qui avance (on voit son dessus) et une craie, l'éponge."""
    t = Toile(26, 16)
    cadre(t, 0, 0, 25, 13, 2, 51)
    ar = rampe(ARDOISE, N)
    for y in range(2, 12):
        for x in range(2, 24):
            v = 0.5 - 0.16 * (x + y) / 34 + 0.05 * bruit(x, y, 6)
            v += 0.08 * max(0, bruit(x // 3, y // 2, 7))                  # les traces d'effacé, plus claires
            if y == 2:
                v -= 0.14
            if x == 2:
                v -= 0.06
            t.mettre(x, y, ton(ar, v))
    cr = rampe(CRAIE, N)
    trait = lambda pts, v=0.8: [t.mettre(x, y, ton(cr, v + 0.12 * bruit(x, y, 8))) for x, y in pts]
    # « 1 + 2 = 3 »
    trait([(4, 4), (4, 5), (4, 6), (3, 4)])
    trait([(6, 5), (7, 4), (7, 5), (7, 6), (8, 5)], 0.7)
    trait([(10, 4), (11, 4), (11, 5), (10, 6), (11, 6)])
    trait([(13, 5), (14, 5), (13, 6), (14, 6)], 0.65)
    trait([(16, 4), (17, 4), (17, 5), (16, 5), (17, 6), (16, 6)])
    # une petite maison
    trait([(19, 8), (20, 7), (21, 6), (22, 7), (23, 8), (19, 9), (19, 10), (23, 9), (23, 10), (20, 10), (21, 10), (22, 10)], 0.72)
    # une ligne soulignée
    trait([(x, 9) for x in range(4, 16) if x % 3], 0.6)
    # la tablette : elle avance de 3 px (2 rangées de dessus) sous le cadre
    tab = glisse(CHENE, 4)
    for x in range(1, 25):
        for y, v in ((13, 0.86), (14, 0.7)):
            t.mettre(x, y, ton(tab, v - 0.12 * x / 24 + 0.03 * bruit(x, y, 12)))
        t.mettre(x, 15, ton(tab, 0.34 - 0.1 * x / 24))                    # sa face
    t.pave(5, 13, 8, 13, cr, 0.92, pente=0.1, biseau=0.04, s=13)          # la craie
    t.assombrir(5, 14, 0.8)
    t.assombrir(6, 14, 0.8)
    ep = rampe([(40, 40, 60), (90, 80, 110), (150, 140, 160)], N)         # l'éponge (feutre)
    t.pave(17, 12, 21, 13, ep, 0.6, pente=0.2, biseau=0.1, s=14)
    for x in range(17, 22):
        t.mettre(x, 12, ton(rampe([(120, 90, 50), (180, 140, 80), (230, 200, 140)], N), 0.6 + 0.04 * bruit(x, 1, 2)))
    t.assombrir(21, 14, 0.75)
    t.contour()
    return t.im


def piano_droit():
    """Le lieu de divertissement : un piano droit de noyer (32 × 30, deux cases de large) : 28 px de large, 9 de fond
    (le dessus : 6 rangées), haut de 20 px (sa face : 18 rangées) ; le clavier avance de 4 px à 11 px du sol (son dessus :
    les touches, 3 rangées), le pupitre, deux bougeoirs de laiton, les pédales au pied."""
    t = Toile(32, 30)
    X0, X1 = 2, 29
    # le dessus du couvercle (6 rangées) : deux planches, chacune sa rampe ; plus clair vers l'avant
    for y in range(0, 6):
        for x in range(X0, X1 + 1):
            pl = glisse(NOYER, 4 if y < 3 else -3)
            v = 0.62 + 0.16 * y / 5 - 0.18 * (x - X0) / (X1 - X0) + 0.04 * bruit(x, y, 21) + 0.03 * ((x * 7 + y) % 5 == 0)
            if y == 0:
                v -= 0.08
            t.mettre(x, y, ton(pl, v))
    for x in range(X0 + 1, X1):                                           # le bord avant du couvercle, éclairé
        t.mettre(x, 5, ton(rampe(NOYER, N), 0.9 - 0.2 * (x - X0) / (X1 - X0)))
    # les bougeoirs (laiton) posés sur le dessus, et leurs bougies
    la, ci = rampe(LAITON, N), rampe(IVOIRE, N)
    for bx in (6, 25):
        for y, v in ((1, 0.7), (2, 0.85), (3, 0.6)):
            t.mettre(bx, y, ton(la, v))
        t.mettre(bx + 1, 3, ton(la, 0.35))
        t.mettre(bx, 0, ton(ci, 0.85))
        t.assombrir(bx + 1, 2, 0.75)                                      # leur ombre
    # la face haute (au-dessus du clavier : 8 rangées) : un panneau encadré, le pupitre
    haut = [glisse(NOYER, d) for d in (0, 5, -4)]
    t.pave(X0, 6, X1, 13, haut[0], 0.44, pente=0.3, biseau=0.1, s=31)
    t.pave(X0 + 3, 7, X1 - 3, 11, haut[1], 0.36, pente=0.26, biseau=0.14, s=32)   # le panneau en creux
    for x in range(X0 + 4, X1 - 3):                                       # la marqueterie : un filet clair
        if x % 2 == 0:
            t.mettre(x, 9, ton(rampe(CHENE, N), 0.55 + 0.05 * bruit(x, 9, 1)))
    pu = glisse(NOYER, 8)                                                 # le pupitre : il avance, son dessus se voit
    for x in range(X0 + 7, X1 - 6):
        t.mettre(x, 11, ton(pu, 0.78 - 0.2 * (x - X0) / (X1 - X0)))
        t.mettre(x, 12, ton(pu, 0.44 - 0.12 * (x - X0) / (X1 - X0)))
    pa = rampe(PAPIER, N)                                                 # une partition ouverte : deux pages, leurs portées
    for y in range(8, 11):
        for x in range(11, 21):
            if x == 16:
                continue
            v = 0.84 - 0.05 * (y - 8) - 0.06 * (x > 16) + 0.03 * bruit(x, y, 5)
            if y in (8, 10) and x not in (11, 20):
                v -= 0.22                                                 # les lignes de la portée, grises
            t.mettre(x, y, ton(pa, v))
    t.assombrir(16, 9, 0.7)                                               # le pli entre les pages
    # le clavier : son dessus (3 rangées) — les touches blanches, les noires par groupes de 2 et 3
    iv, eb = rampe(IVOIRE, N), rampe(EBENE, N)
    for x in range(X0, X1 + 1):
        for y in (14, 15, 16):
            t.mettre(x, y, ton(iv, 0.86 - 0.05 * (y - 14) - 0.16 * (x - X0) / (X1 - X0) + 0.02 * bruit(x, y, 2)))
        if (x - X0) % 2 == 1:
            t.mettre(x, 16, ton(iv, 0.42))                               # le joint entre deux touches
    for x in range(X0 + 1, X1):
        k = (x - X0) % 14
        if k in (1, 3, 7, 9, 11):
            t.mettre(x, 14, ton(eb, 0.55))
            t.mettre(x, 15, ton(eb, 0.3))
    for x in range(X0, X1 + 1):                                           # les joues du clavier, la réglette
        t.mettre(x, 13, ton(rampe(NOYER, N), 0.2))                        # l'ombre sous le panneau
    jo = glisse(NOYER, -6)
    for y in (14, 15, 16):
        t.mettre(X0, y, ton(jo, 0.7))
        t.mettre(X1, y, ton(jo, 0.32))
    # le devant du clavier (2 rangées), éclairé à gauche
    t.pave(X0, 17, X1, 18, glisse(NOYER, 2), 0.5, pente=0.35, biseau=0.12, s=41)
    # le bas (en retrait, dans l'ombre du clavier : 9 rangées) : deux panneaux, les pieds, les pédales
    bas = [glisse(NOYER, d) for d in (-2, 3, -5)]
    t.pave(X0 + 1, 19, X1 - 1, 28, bas[0], 0.32, pente=0.26, biseau=0.08, s=51)
    t.pave(X0 + 3, 21, 14, 26, bas[1], 0.27, pente=0.24, biseau=0.12, s=52)
    t.pave(17, 21, X1 - 3, 26, bas[2], 0.24, pente=0.24, biseau=0.12, s=53)
    for x in range(X0 + 1, X1):                                           # l'occlusion sous le clavier
        t.assombrir(x, 19, 0.62)
        t.assombrir(x, 20, 0.8)
    for x0 in (X0, X1 - 1):                                               # les pieds
        for y in range(19, 30):
            t.mettre(x0, y, ton(jo, (0.62 if x0 == X0 else 0.3) - 0.2 * (y - 19) / 10 + 0.03 * bruit(x0, y, 3)))
            t.mettre(x0 + 1, y, ton(jo, (0.48 if x0 == X0 else 0.22) - 0.16 * (y - 19) / 10))
    for px in (13, 15, 17):                                               # les pédales de laiton, et leur reflet au sol
        t.mettre(px, 27, ton(la, 0.85))
        t.mettre(px + 1, 27, ton(la, 0.55))
        t.mettre(px, 28, ton(la, 0.4))
        t.mettre(px + 1, 28, ton(la, 0.25))
    for x in range(X0 + 2, X1 - 1):                                       # le pied du piano, l'ombre au sol (dedans)
        t.mettre(x, 29, ton(rampe(NOYER, N), 0.1 + 0.03 * bruit(x, 29, 4)))
    t.contour()
    return t.im


def piano_dos():
    """Le piano tourné, vu de dos (32 × 24) : le dessus du couvercle (6 rangées), puis son dos : un panneau de planches
    verticales, deux traverses, plus sombre (le dos ne prend pas la lumière de face), l'ombre au pied."""
    t = Toile(32, 24)
    X0, X1 = 2, 29
    for y in range(0, 6):
        for x in range(X0, X1 + 1):
            pl = glisse(NOYER, -3 if y < 3 else 4)
            v = 0.58 + 0.16 * y / 5 - 0.18 * (x - X0) / (X1 - X0) + 0.04 * bruit(x, y, 61)
            t.mettre(x, y, ton(pl, v - (0.08 if y == 0 else 0)))
    for x in range(X0 + 1, X1):
        t.mettre(x, 5, ton(rampe(NOYER, N), 0.84 - 0.2 * (x - X0) / (X1 - X0)))
    for k, x0 in enumerate(range(X0, X1 + 1, 4)):                         # les planches du dos, chacune sa rampe
        r = glisse(NOYER, (k % 3 - 1) * 5)
        t.pave(x0, 6, min(X1, x0 + 3), 22, r, 0.3 - 0.06 * (k % 2), pente=0.2, biseau=0.1, grain=0.05, s=70 + k)
    for y in (9, 17):                                                     # les traverses
        t.pave(X0, y, X1, y + 1, glisse(CHENE, -10), 0.32, pente=0.25, biseau=0.12, s=80 + y)
    for x in range(X0, X1 + 1):
        t.mettre(x, 23, ton(rampe(NOYER, N), 0.08 + 0.03 * bruit(x, 23, 4)))
    t.contour()
    return t.im


def piano_cote():
    """Le piano tourné de profil, sa face (le clavier) à droite (16 × 44, deux cases de haut) : le dessus du couvercle
    s'allonge vers le haut (26 rangées), puis la joue du piano (18 rangées) ; le clavier dépasse à droite, à 11 px du
    sol : son dessus (les touches, en long) et son devant ; les pieds."""
    t = Toile(16, 44)
    for y in range(0, 26):                                                # le dessus du couvercle, deux planches
        for x in range(1, 11):
            pl = glisse(NOYER, 4 if x < 6 else -3)
            v = 0.6 - 0.12 * y / 25 + 0.12 * (x - 1) / 9 + 0.04 * bruit(x, y, 91)
            if x == 1:
                v -= 0.1
            t.mettre(x, y, ton(pl, v))
    for y in range(0, 26):
        t.mettre(10, y, ton(rampe(NOYER, N), 0.84 - 0.2 * y / 25))       # le bord avant (côté clavier), éclairé
    la, ci = rampe(LAITON, N), rampe(IVOIRE, N)
    for by in (4, 21):                                                    # les bougeoirs
        for y, v in ((by, 0.7), (by + 1, 0.85), (by + 2, 0.6)):
            t.mettre(8, y, ton(la, v))
        t.mettre(8, by - 1, ton(ci, 0.85))
    # la joue (le flanc) : un panneau encadré, dans l'ombre (il regarde vers nous mais de biais)
    t.pave(1, 26, 10, 43, glisse(NOYER, 2), 0.36, pente=0.3, biseau=0.1, s=93)
    t.pave(3, 28, 8, 33, glisse(NOYER, -5), 0.3, pente=0.24, biseau=0.14, s=94)
    # le clavier, qui avance à droite : son dessus (de y 8 à 33 : à 11 px du sol), les touches en long
    iv, eb = rampe(IVOIRE, N), rampe(EBENE, N)
    for y in range(8, 34):
        for x in (11, 12, 13):
            v = 0.84 - 0.05 * (x - 11) - 0.12 * (y - 8) / 25 + 0.02 * bruit(x, y, 3)
            if (y - 8) % 2 == 1 and x == 13:
                v -= 0.3                                                  # le joint entre deux touches
            t.mettre(x, y, ton(iv, v))
        k = (y - 8) % 14
        if k in (1, 3, 7, 9, 11):
            t.mettre(11, y, ton(eb, 0.5))
            t.mettre(12, y, ton(eb, 0.3))
    for y in range(8, 34):
        t.mettre(14, y, ton(glisse(NOYER, -6), 0.36))                     # la joue du clavier, à droite
    for x in range(11, 15):                                               # le devant du clavier
        t.mettre(x, 34, ton(glisse(NOYER, 2), 0.5 - 0.05 * (x - 11)))
        t.mettre(x, 35, ton(glisse(NOYER, 2), 0.3 - 0.05 * (x - 11)))
    for y in range(36, 44):                                               # le pied avant, sous le clavier
        t.mettre(12, y, ton(glisse(NOYER, -6), 0.42 - 0.2 * (y - 36) / 8))
        t.mettre(13, y, ton(glisse(NOYER, -6), 0.26 - 0.14 * (y - 36) / 8))
    for y in range(36, 40):                                               # l'ombre sous le clavier, sur la joue
        t.assombrir(10, y, 0.7)
    t.contour()
    return t.im


def couleurs(im):
    return len({im.getpixel((x, y)) for x in range(im.width) for y in range(im.height) if im.getpixel((x, y))[3]})


def main():
    images = {
        'meuble_tableau_liege.png': tableau_liege(),
        'meuble_tableau_ardoise.png': tableau_ardoise(),
        'meuble_piano_droit.png': piano_droit(),
        'meuble_piano_droit_dos.png': piano_dos(),
        'meuble_piano_droit_cote.png': piano_cote(),
    }
    for nom, im in images.items():
        im.save(os.path.join(ASSETS, nom))
        print(nom, im.size, couleurs(im), 'couleurs')
    if '--apercu' in sys.argv:
        k, marge = 8, 8
        W = sum(im.width * k + marge for im in images.values()) + marge
        H = max(im.height for im in images.values()) * k + 2 * marge
        ap = Image.new('RGBA', (W, H), (98, 132, 74, 255))
        x = marge
        for im in images.values():
            ap.alpha_composite(im.resize((im.width * k, im.height * k), Image.NEAREST), (x, marge))
            x += im.width * k + marge
        os.makedirs(os.path.join(ROOT, 'apercus-ile'), exist_ok=True)
        ap.save(os.path.join(ROOT, 'apercus-ile', 'projets.png'))


if __name__ == '__main__':
    main()
