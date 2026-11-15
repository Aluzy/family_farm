# La charrette du village (le chantier « l'île à bâtir », fiche I2b : js/engine/charrette.js ; la scène :
# js/carte/ferme/charrette-village.js), dessinée vue de haut à 45° (CLAUDE.md) d'après les maquettes validées : on
# voit le dessus et la face avant de tout, l'intérieur de ce qui est ouvert (le plateau, la caisse du wagonnet, leur
# chargement) ; lumière en haut à gauche, contour sombre d'un pixel ; des rampes de tons fines (scripts/carte/
# nuances.py, n ≥ 100), une rampe par planche, chaque planche modelée (biseau, grain), les ombres froides, les
# lumières chaudes, l'occlusion dans les angles et au pied. Les outils viennent de scripts/carte/portage.py (la
# charrette du joueur, fiche I2), le cheval de scripts/personnage/cheval.py.
#
# Le charretier n'est pas dans les images : la scène le pose avec sa propre planche (ses cases marche_<vue>_<k>,
# idle_<vue>_0 à bras ; assis_<vue>_0 sur le siège, sur le bord du wagonnet), entre deux couches : la rangée 0 de
# chaque planche, ce qui est derrière lui ; la rangée 1, ce qui est devant lui. PLACE[mode][vue] : le milieu du bas de
# sa case par rapport au point de la route (le milieu de la caisse, au sol), que js/carte/ferme/charrette-village.js
# reprend.
#
#   - assets/charrette_bras.png (cases de 96 × 100, le point de la route en (48, 72)) : la charrette tirée à bras
#     (paliers de vitesse 1 et 2) : une charrette à deux roues hautes, un plateau de 30 × 16 à ridelles basses, la
#     ridelle de devant peinte du bleu-vert du village et marquée du croissant de lune ; deux brancards jusqu'aux mains
#     du charretier. (Chaque planche range ses n cases de la couche de derrière, puis les n de devant, rangée par
#     rangée, au plus 4 096 px de large : la case i de devant est la case n + i.) La case de la vue v (cote 0, bas 1,
#     haut 2), chargée ou non (c), du temps k de la roue (0 à 3) :
#     (v × 2 + c) × 4 + k ; puis les dessus (DECOS : les rehausses à claire-voie, palier de capacité 3 ; les rehausses
#     et la bâche, palier 4 et plus) : 24 + d × 3 + v, dans la rangée de la caisse (celle de derrière, sauf de dos) ; puis
#     la charrette seule, rangée sur la ferme (de profil, les brancards au sol) : 30.
#   - assets/charrette_cheval.png (cases de 144 × 136, le point en (72, 100)) : la même caisse attelée au cheval de
#     trait (paliers 3 et 4) : la limonière, le siège du charretier en travers devant, le cheval harnaché. La case :
#     (v × 2 + c) × 5 + k, k le temps du pas (4 : à l'arrêt) ; les dessus : 30 + d × 3 + v.
#   - assets/charrette_wagonnet.png (cases de 144 × 136, le point en (72, 100), au milieu de la voie) : le wagonnet
#     (palier 5), une caisse de bois cerclée de fer sur quatre petites roues à boudin, tiré au halage par le cheval qui
#     marche à côté de la voie (au sud quand elle va d'ouest en est, à l'est quand elle va du nord au sud), un trait de
#     corde au palonnier ; le charretier assis sur le bord de la caisse, les rênes longues. La case : (v × 2 + c) × 5 + k
#     (k : 4, à l'arrêt) ; puis le wagonnet seul, à la gare : 30.
#   - assets/rails.png (cases de 16 × 16, le bas de l'image au bas de la case) : les rails, dans l'ordre de
#     js/engine/dehors.js IMAGES_RAILS : ns, eo, ne, no, se, so (les courbes d'un quart de cercle, nommées des deux
#     voisins qu'elles relient), ns_chemin, eo_chemin (le passage planchéié : les rails à fleur entre des madriers, la
#     terre du chemin entre eux). Quatre traverses par case, une tous les 4 px : pas de couture.
#   python3 scripts/carte/charrette_village.py            écrit les images
#   python3 scripts/carte/charrette_village.py --apercu   écrit aussi apercu_charrette_village.png (agrandi, avec un
#                                                          charretier des planches) et compte les couleurs
import json
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
from portage import (BOIS, CAROTTE, CHOU, CITROUILLE, FER, OUT, PAILLE, POMME, TOILE, Toile, boule, caisse, face,  # noqa: E402
                     mel, ovale, planche, roue, sac, ton, varie)

HT, FD = 14 / 16, 10 / 16          # la projection (scripts/carte/blocs.py : HAUT, FOND)
CHAUD = (255, 226, 160)
FROID = (22, 28, 52)


def r(h):
    """Une hauteur h → des rangées."""
    return round(h * HT)


def p(d):
    """Une profondeur d → des rangées."""
    return round(d * FD)


# la peinture du village : un bleu-vert passé, d'une rampe qui glisse du froid (l'ombre) au chaud (la lumière)
PEINT = [varie([(18, 30, 46), (30, 56, 74), (46, 90, 106), (74, 128, 134), (120, 168, 160), (186, 212, 188), (232, 234, 206)], k, 5)
         for k in range(4)]
CREME = rampe([(96, 84, 64), (170, 156, 120), (222, 210, 172), (248, 240, 214), (255, 250, 232)], 120)
ACIER = rampe([(14, 16, 24), (34, 38, 50), (62, 66, 80), (100, 104, 116), (150, 152, 158), (204, 200, 192), (246, 236, 214)], 160)
ROUILLE = rampe([(40, 22, 18), (86, 44, 28), (132, 74, 44), (170, 110, 70), (204, 150, 108)], 120)
GRAVIER = [rampe([(38, 36, 40), (70, 66, 66), (106, 100, 94), (142, 134, 122), (182, 172, 154), (222, 212, 190)], 140),
           rampe([(40, 36, 36), (76, 68, 62), (114, 104, 92), (150, 138, 118), (188, 176, 150), (226, 214, 184)], 140),
           rampe([(34, 36, 44), (64, 66, 74), (98, 100, 104), (134, 136, 134), (174, 174, 166), (216, 214, 200)], 140)]
CHENE = [varie([(30, 22, 26), (58, 40, 36), (92, 66, 48), (128, 96, 66), (168, 132, 92), (206, 172, 128), (232, 208, 168)], k, 8)
         for k in range(8)]
MADRIER = [varie([(36, 26, 26), (72, 52, 40), (114, 84, 58), (156, 120, 80), (196, 160, 112), (230, 202, 152)], k, 7)
           for k in range(6)]
BACHE = [varie([(52, 50, 40), (98, 94, 72), (150, 144, 110), (196, 188, 148), (228, 220, 184), (248, 242, 214)], k, 6) for k in range(3)]
CORDE = [varie([(40, 30, 20), (90, 72, 46), (150, 126, 86), (206, 186, 140), (236, 224, 190)], k, 5) for k in range(2)]
CUIR = [(40, 24, 18), (70, 42, 28), (98, 62, 40)]
LONG, LARGE = 30, 16               # la caisse de la charrette : 30 de long, 16 de large
PLANCHER, RIDELLE = 11, 18         # son plancher à 11 du sol, le haut de ses ridelles à 18
WLONG = 32                         # la caisse du wagonnet : 32 de long, 16 de large
VUES = ('cote', 'bas', 'haut')
DECOS = ('rehausses', 'bache')

# les cases, le point de la route, et où se pose le charretier (le milieu du bas de sa case, par rapport au point)
BRAS = {'w': 96, 'h': 100, 'ax': 48, 'ay': 72}
ATTELAGE = {'w': 144, 'h': 136, 'ax': 72, 'ay': 100}
PLACE = {'bras': {}, 'cheval': {}, 'wagonnet': {}}


# ---------------------------------------------------------------- outils

def brancard(t, x0, y0, x1, y1, rr, s, clair=0.66):
    """Un brancard : une perche de deux rangées (le dessus clair, le dessous dans l'ombre), plus chaude au bout éclairé."""
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        u = i / n
        x, y = round(x0 + (x1 - x0) * u), round(y0 + (y1 - y0) * u)
        g = bruit(i // 3, 0, s) * 0.04
        t.put(x, y, ton(rr, clair + 0.05 * u + g))
        t.put(x, y + 1, ton(rr, clair - 0.3 + g))


def montant(t, x, y0, y1, rr, s):
    """Un montant de ridelle (une latte debout) : la gauche claire, la droite sombre, le pied plus sombre."""
    for y in range(y0, y1 + 1):
        h = (y - y0) / max(1, y1 - y0)
        t.put(x, y, ton(rr, 0.62 - 0.18 * h + bruit(x, y, s) * 0.03))
        t.put(x + 1, y, ton(rr, 0.4 - 0.18 * h + bruit(x + 1, y, s) * 0.03))


def croissant(t, cx, cy, rr=CREME):
    """L'emblème du village peint sur la ridelle : un croissant de lune (Moon Bloom), 7 × 7 : un disque d'où l'on ôte
    un disque décalé vers la droite et le haut ; ses cornes s'effilent (ce n'est pas un « C », d'épaisseur égale), le
    ventre éclairé en haut à gauche ; une petite étoile dans son creux."""
    for j in range(-3, 4):
        for i in range(-3, 4):
            d1 = math.hypot(i, j)
            d2 = math.hypot(i - 1.7, j + 0.9)
            if d1 <= 3.25 and d2 > 2.55:
                v = 0.92 - 0.06 * (i + 3) / 6 - 0.1 * (j + 3) / 6
                t.put(cx + i, cy + j, ton(rr, v))
    t.put(cx + 2, cy + 1, ton(rr, 0.8))            # l'étoile, dans le creux
    t.put(cx + 3, cy + 1, ton(rr, 0.55))
    t.put(cx + 2, cy + 2, ton(rr, 0.55))


def paille_eparse(t, x0, x1, y0, y1, s):
    """Quelques brins de paille sur un plancher vide."""
    for k in range(int((x1 - x0) * (y1 - y0) / 9)):
        x = x0 + int((bruit(k, 1, s) + 1) / 2 * (x1 - x0))
        y = y0 + int((bruit(k, 2, s) + 1) / 2 * (y1 - y0 + 1))
        if y0 <= y <= y1:
            t.put(x, y, ton(PAILLE, 0.6 + bruit(k, 3, s) * 0.25))
            if bruit(k, 4, s) > 0:
                t.put(x + 1, y, ton(PAILLE, 0.45))


def panier(t, cx, cy, s):
    """Un panier d'osier rond (son bord, son intérieur, sa panse), garni de pommes."""
    OSIER = varie([(52, 34, 18), (98, 66, 34), (150, 108, 58), (196, 152, 92), (232, 200, 140)], s, 6)
    ovale(t, cx, cy + 1, 4, 3, lambda x, y, dx, dy, d: ton(OSIER, 0.55 - 0.25 * dx - 0.2 * dy + (0.06 if (x + y) % 2 else -0.04)))
    ovale(t, cx, cy - 1, 3.5, 1.6, lambda x, y, dx, dy, d: ton(OSIER, 0.3 + 0.2 * dy))
    for i, (dx, dy) in enumerate(((-1, -1), (1, -1), (0, -2))):
        boule(t, cx + dx, cy + dy, 1.2, 1.0, POMME, s + i)


def ligne(t, x0, y0, x1, y1, f):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        u = i / n
        t.put(round(x0 + (x1 - x0) * u), round(y0 + (y1 - y0) * u), f(u))


def rene(t, x0, y0, x1, y1, creux=2):
    """Les rênes : une lanière de cuir qui pend un peu entre les mains et le mors."""
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        u = i / n
        x = x0 + (x1 - x0) * u
        y = y0 + (y1 - y0) * u + creux * 4 * u * (1 - u)
        t.put(x, y, CUIR[1] if i % 5 else CUIR[2])


def corde(t, x0, y0, x1, y1, creux=3, s=0):
    """Le trait de corde, qui pend un peu, sa torsade (un pixel clair sur trois)."""
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        u = i / n
        x = x0 + (x1 - x0) * u
        y = y0 + (y1 - y0) * u + creux * 4 * u * (1 - u)
        t.put(x, y, ton(CORDE[s % 2], 0.62 if i % 3 == 0 else 0.42))


def couleurs(im):
    return len({px[:3] for px in im.getdata() if px[3] == 255})


def ombre_sous(im, ells):
    """Une ombre douce au sol (des ellipses : cx, cy, rx, ry), posée sous l'image."""
    o = Image.new('RGBA', im.size, (0, 0, 0, 0))
    q = o.load()
    for cx, cy, rx, ry in ells:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1 and 0 <= x < im.width and 0 <= y < im.height:
                    q[x, y] = (18, 24, 34, max(q[x, y][3], int(78 * (1 - d * 0.6))))
    o.alpha_composite(im)
    return o


def cheval_cote(k):
    return cheval.harnache_redessine(k) or cheval.profil('marche' if k < 4 else 'idle', k % 4, harnais=True).image()


def cheval_vue(vue, k):
    return cheval.case_redessinee(vue, k) or (cheval.face(k) if vue == 'bas' else cheval.dos(k)).image()


# ---------------------------------------------------------------- le chargement

def chargement(t, x0, x1, y0, y1, s, haut=3):
    """Le chargement d'un plateau, vu de haut à 45°, du fond vers l'avant (de y0 à y1) : des caisses à claire-voie,
    des sacs de toile, un panier de pommes, des choux, une citrouille, des carottes ; il dépasse de `haut` rangées."""
    ll = x1 - x0
    caisse(t, x0, y0 - haut, min(8, ll // 3), 3, 4, s + 1)
    sac(t, x0 + ll // 2, y0 - haut + 3, 3, 3, s + 2)
    if ll > 16:
        caisse(t, x1 - 8, y0 - haut + 1, 8, 3, 4, s + 3)
    for k, y in enumerate(range(y0 + 2, y1 - 1, 2)):
        for x in range(x0 + 1 + (k % 2), x1 - 1, 3):
            n = int((bruit(x, y, s) + 1) * 2.6) % 5
            if n == 0:
                boule(t, x, y, 1.6, 1.3, CHOU, s + x)
            elif n == 1:
                boule(t, x, y, 1.2, 1.1, POMME, s + x + 1)
            elif n == 2:
                for i in range(3):
                    t.put(x + i, y + (i > 1), ton(CAROTTE, 0.75 - i * 0.14))
                t.put(x - 1, y - 1, ton(CHOU, 0.7))
            elif n == 3:
                boule(t, x, y, 1.5, 1.2, CITROUILLE, s + x + 2)
            else:
                boule(t, x, y, 1.3, 1.1, CHOU, s + x + 3)
    panier(t, x0 + ll // 3, y1 - 3, s + 4)
    sac(t, x1 - 5, y1 - 3, 3, 2.5, s + 5)
    if ll > 14:
        boule(t, x0 + 2 * ll // 3, y1 - 2, 2.4, 2.0, CITROUILLE, s + 6)


# ---------------------------------------------------------------- la caisse de la charrette, de profil

def caisse_profil(t, X0, SOL, charge, s=0, phase=0, siege=False, roues=True):
    """La caisse de profil, tournée vers la droite : X0 son arrière, SOL la rangée où ses roues touchent le sol (le
    côté qui nous regarde). → (X1, ybr, yt) : l'avant, la rangée des brancards, le haut de la ridelle proche."""
    X1 = X0 + LONG
    xw = X0 + 13                                  # l'essieu, un peu en arrière du milieu
    yfond = SOL - p(LARGE)
    if roues:
        roue(t, xw, yfond - r(8), 7, 6, phase, BOIS[1])   # la roue du fond : on n'en voit que le bas
    face(t, X0 + 2, SOL - r(PLANCHER) + 1, X1 - 1, SOL - r(PLANCHER) + 2, BOIS[0], 0.32, s + 1)
    ytf = yfond - r(RIDELLE)
    planche(t, X0, ytf - 1, X1, ytf, BOIS[3], 0.74, s + 2, sens='h')
    face(t, X0 + 1, ytf + 1, X1 - 1, ytf + 3, BOIS[2], 0.5, s + 3)
    face(t, X0 + 1, ytf + 4, X1 - 1, yfond - r(PLANCHER), BOIS[7], 0.44, s + 4)
    for x in range(X0 + 1, X1):
        t.assombrit(x, ytf + 3, 0.3)
        t.assombrit(x, yfond - r(PLANCHER), 0.3)
    yp0, yp1 = yfond - r(PLANCHER) + 1, SOL - r(RIDELLE) - 1
    for k, y in enumerate(range(yp0, yp1 + 1)):
        planche(t, X0 + 1, y, X1 - 1, y, BOIS[(k * 4 + s) % 9], 0.6 + 0.07 * k, s + 10 + k, sens='h')
    for x in range(X0 + 1, X1):
        t.assombrit(x, yp0, 0.3)
    for xb, ss in ((X0, 4), (X1 - 1, 5)):
        for y in range(ytf - 1, SOL - r(RIDELLE) + 1):
            t.put(xb, y, ton(BOIS[6], 0.66 - 0.2 * (y - ytf) / 12 + bruit(xb, y, s + ss) * 0.03))
            t.put(xb + 1 if xb == X0 else xb - 1, y, ton(BOIS[6], 0.44 - 0.15 * (y - ytf) / 12))
    if charge:
        chargement(t, X0 + 2, X1 - 2, ytf + 1, yp1, s + 30, haut=5)
    else:
        paille_eparse(t, X0 + 2, X1 - 2, yp0, yp1, s + 31)
        for y in range(ytf + 1, yp1 + 1):
            t.assombrit(X0 + 2, y, 0.25); t.assombrit(X1 - 2, y, 0.3)
    yt = SOL - r(RIDELLE)
    planche(t, X0 - 1, yt, X1 + 1, yt, BOIS[5], 0.74, s + 40, sens='h')
    yb = SOL - r(PLANCHER)
    for x in range(X0, X1 + 1):
        for y in range(yt + 1, yb + 1):
            h = (y - yt - 1) / max(1, yb - yt - 1)
            if y <= yt + 3:
                v = 0.6 - 0.1 * h + bruit(x // 2, y, s + 41) * 0.04 + (0.08 if y == yt + 1 else 0)
                c = ton(PEINT[(x // 9 + s) % 4], v)
                if bruit(x, y, s + 42) > 0.82:
                    c = ton(BOIS[4], 0.5)
            else:
                c = ton(BOIS[(x // 11 + 6) % 9], 0.5 - 0.2 * h + bruit(x // 3, y, s + 43) * 0.04)
            t.put(x, y, c)
    for x in range(X0, X1 + 1):
        t.assombrit(x, yt + 4, 0.38)
        t.eclaire(x, yt + 5, 0.06, CHAUD)
    for x in (X0 + 1, X0 + 11, X1 - 2):
        montant(t, x, yt - 1, yb + 1, BOIS[1], s + 44 + x)
    croissant(t, X0 + 21, yt + 2, CREME)
    for x in range(X0, X1 + 1):
        t.assombrit(x, yb + 1, 0.3)
    if siege:
        planche(t, X1 - 7, yt - 3, X1 - 1, yt - 2, BOIS[7], 0.76, s + 50, sens='h')
        face(t, X1 - 7, yt - 1, X1 - 1, yt - 1, BOIS[8], 0.4, s + 51)
    if roues:
        roue(t, xw, SOL - r(8), 8, 7, phase, BOIS[2])
    return X1, SOL - r(10), yt


# ---------------------------------------------------------------- de face (elle vient vers nous) ou de dos

def tranche(t, x, ysol, phase, s, gauche=True, R=8):
    """Une roue vue sur la tranche : une jante étroite (un pixel de fer, un de bois) qui s'éclaircit vers le haut, les
    rais qui défilent, un petit moyeu ; plus légère qu'une bande sombre (on la voit à peine de face)."""
    h = r(2 * R)
    for k, y in enumerate(range(ysol - h, ysol + 1)):
        u = k / h
        bord = 0.66 - 0.3 * u + bruit(x, y, s) * 0.03
        t.put(x, y, ton(FER, bord + (0.1 if gauche else -0.06)))
        if 1 < k < h - 1:
            t.put(x + 1, y, ton(BOIS[2], bord + 0.04 + (0 if gauche else -0.1)))
    for j in range(2):
        y = ysol - h + 2 + ((phase * 2 + j * 6) % (h - 3))
        t.put(x + 1, y, ton(BOIS[2], 0.34))
    yc = ysol - h // 2
    m = x - 1 if gauche else x + 2
    t.put(m, yc, ton(FER, 0.66)); t.put(m, yc + 1, ton(FER, 0.42))


def caisse_axe(t, cx, yN, charge, s=0, phase=0, siege=False, vers='bas'):
    """La caisse vue dans l'axe : cx le milieu, yN la rangée du sol sous la ridelle la plus proche. 'bas' : elle vient
    vers nous (l'avant peint) ; 'haut' : elle s'en va (le hayon, peint aussi). → (ytN, ytF) : le haut de la ridelle
    proche et de celle du fond."""
    L, D = LARGE // 2, p(LONG)
    yF = yN - D
    ytF = yF - r(RIDELLE)
    planche(t, cx - L, ytF - 1, cx + L, ytF, BOIS[3], 0.74, s + 2, sens='h')
    face(t, cx - L + 1, ytF + 1, cx + L - 1, ytF + 2, BOIS[2], 0.5, s + 3)
    face(t, cx - L + 1, ytF + 3, cx + L - 1, ytF + 5, BOIS[7], 0.42, s + 4)
    for x in range(cx - L + 1, cx + L):
        t.assombrit(x, ytF + 3, 0.25)
    if siege and vers == 'haut':
        planche(t, cx - L + 1, ytF - 3, cx + L - 1, ytF - 2, BOIS[7], 0.76, s + 50, sens='h')
    yp0, ytN = ytF + 6, yN - r(RIDELLE)
    for k, x0 in enumerate(range(cx - L + 1, cx + L - 1, 3)):
        planche(t, x0, yp0, min(cx + L - 1, x0 + 2), ytN - 1, BOIS[(k * 5 + s) % 9], 0.56 + 0.04 * (k % 3), s + 10 + k, sens='v')
    for y in range(yp0, ytN):
        u = (y - yp0) / max(1, ytN - yp0)
        for x in range(cx - L + 1, cx + L):
            if u > 0.5:
                t.eclaire(x, y, 0.1 * (u - 0.5), CHAUD)
            else:
                t.assombrit(x, y, 0.16 * (0.5 - u))
    for x in range(cx - L + 1, cx + L):
        t.assombrit(x, yp0, 0.4); t.assombrit(x, yp0 + 1, 0.15)
    for y in range(ytF - 1, ytN + 1):
        t.put(cx - L, y, ton(BOIS[5], 0.72 + bruit(0, y, s) * 0.03)); t.put(cx - L - 1, y, ton(BOIS[5], 0.56))
        t.put(cx + L, y, ton(BOIS[5], 0.46 + bruit(1, y, s) * 0.03)); t.put(cx + L + 1, y, ton(BOIS[5], 0.32))
        t.assombrit(cx - L + 1, y, 0.22); t.assombrit(cx + L - 1, y, 0.32)
    if charge:
        chargement(t, cx - L + 1, cx + L - 1, ytF + 2, ytN - 1, s + 30, haut=4)
    else:
        paille_eparse(t, cx - L + 2, cx + L - 2, yp0 + 1, ytN - 1, s + 31)
    planche(t, cx - L - 1, ytN, cx + L + 1, ytN, BOIS[5], 0.74, s + 40, sens='h')
    yb = yN - r(PLANCHER)
    for x in range(cx - L - 1, cx + L + 2):
        for y in range(ytN + 1, yb + 1):
            h = (y - ytN - 1) / max(1, yb - ytN - 1)
            if y <= ytN + 3:
                c = ton(PEINT[(x // 7 + s) % 4], 0.62 - 0.1 * h - 0.08 * (x - cx + L) / (2 * L) + bruit(x // 2, y, s + 41) * 0.04
                        + (0.08 if y == ytN + 1 else 0))
                if bruit(x, y, s + 42) > 0.84:
                    c = ton(BOIS[4], 0.5)
            else:
                c = ton(BOIS[(x // 6 + 6) % 9], 0.5 - 0.2 * h - 0.06 * (x - cx + L) / (2 * L) + bruit(x // 3, y, s + 43) * 0.04)
            t.put(x, y, c)
    for x in range(cx - L - 1, cx + L + 2):
        t.assombrit(x, ytN + 4, 0.38)
    for x in (cx - L - 1, cx + L):
        montant(t, x, ytN - 1, yb + 1, BOIS[1], s + 44 + x)
    croissant(t, cx - 2, ytN + 2, CREME)
    face(t, cx - L + 1, yb + 1, cx + L - 1, yb + 2, BOIS[0], 0.3, s + 1)
    yr = yN - D // 2
    tranche(t, cx - L - 3, yr, phase, s + 60, gauche=True)
    tranche(t, cx + L + 2, yr, phase, s + 61, gauche=False)
    if siege and vers == 'bas':
        planche(t, cx - L + 1, ytN - 3, cx + L - 1, ytN - 2, BOIS[7], 0.76, s + 50, sens='h')
        face(t, cx - L + 1, ytN - 1, cx + L - 1, ytN - 1, BOIS[8], 0.4, s + 51)
    return ytN, ytF


# ---------------------------------------------------------------- les dessus : rehausses, bâche

def rehausses_profil(t, X0, SOL, s=0):
    """Les rehausses à claire-voie, de profil : des lattes debout au-dessus des ridelles (celle du fond, celle de
    devant), une lisse en haut ; la lumière sur leur gauche."""
    X1, yt, yf = X0 + LONG, SOL - r(RIDELLE), SOL - p(LARGE) - r(RIDELLE)
    for y0, clair in ((yf, 0.5), (yt, 0.68)):
        for x in range(X0, X1 + 1, 5):
            for y in range(y0 - 6, y0):
                t.put(x, y, ton(BOIS[(x // 5 + s) % 9], clair - 0.12 * (y0 - y) / 6 + bruit(x, y, s) * 0.03))
                t.put(x + 1, y, ton(BOIS[(x // 5 + s) % 9], clair - 0.22))
        planche(t, X0, y0 - 7, X1, y0 - 6, BOIS[(s + 3) % 9], clair + 0.08, s + 5, sens='h')


def bache_profil(t, X0, SOL, s=0):
    """La bâche tendue sur le chargement, de profil : un dos arrondi de toile, ses plis (plus sombres et plus froids
    dans les creux), ficelée aux rehausses."""
    X1, yt = X0 + LONG, SOL - r(RIDELLE)
    yb = yt - 1
    for x in range(X0 + 1, X1):
        u = (x - X0) / LONG
        h = 9 + 3 * math.sin(u * math.pi)
        for y in range(round(yb - h), yb + 1):
            v = (y - (yb - h)) / h
            pli = 0.08 * math.sin(x * 0.9 + s)
            t.put(x, y, ton(BACHE[(x // 8 + s) % 3], 0.82 - 0.32 * v - 0.06 * u + pli + bruit(x, y, s) * 0.03))
    for x in range(X0 + 3, X1 - 2, 6):
        ligne(t, x, yb - 10, x + 1, yb, lambda u: ton(CORDE[0], 0.3 + 0.2 * u))


def rehausses_axe(t, cx, yN, s=0):
    """Les rehausses, vues dans l'axe : sur la ridelle proche et celle du fond, et les côtés sur la tranche."""
    L, D = LARGE // 2, p(LONG)
    ytN, ytF = yN - r(RIDELLE), yN - D - r(RIDELLE)
    for y0, clair in ((ytF, 0.5), (ytN, 0.68)):
        for x in range(cx - L - 1, cx + L + 2, 4):
            for y in range(y0 - 6, y0):
                t.put(x, y, ton(BOIS[(x // 4 + s) % 9], clair - 0.12 * (y0 - y) / 6))
        planche(t, cx - L - 1, y0 - 7, cx + L + 1, y0 - 6, BOIS[(s + 3) % 9], clair + 0.06, s + 6, sens='h')
    for y in range(ytF - 7, ytN - 6):
        t.put(cx - L - 1, y, ton(BOIS[5], 0.66)); t.put(cx + L + 1, y, ton(BOIS[5], 0.36))


def bache_axe(t, cx, yN, s=0):
    """La bâche, vue dans l'axe : un dos de toile entre les ridelles, plus clair au sommet, ses plis en travers."""
    L, D = LARGE // 2, p(LONG)
    ytN, ytF = yN - r(RIDELLE), yN - D - r(RIDELLE)
    for y in range(ytF - 6, ytN):
        u = (y - (ytF - 6)) / max(1, ytN - ytF + 6)
        for x in range(cx - L, cx + L + 1):
            w = (x - cx) / L
            bombe = 1 - w * w
            v = 0.5 + 0.3 * bombe - 0.12 * u + 0.06 * math.sin(y * 1.1 + s) - 0.08 * w
            t.put(x, y, ton(BACHE[(y // 6 + s) % 3], v + bruit(x, y, s) * 0.03))
    for y in range(ytF - 4, ytN, 5):
        ligne(t, cx - L, y, cx + L, y, lambda u: ton(CORDE[1], 0.28 + 0.24 * (1 - u)))


# ---------------------------------------------------------------- à bras

def bras_cases(vue, charge, k):
    """[derrière, devant] : la charrette tirée à bras (vue, chargée ou non, temps k de la roue). Le charretier entre les
    deux couches (PLACE['bras'][vue])."""
    W, H, ax, ay = BRAS['w'], BRAS['h'], BRAS['ax'], BRAS['ay']
    d, f = Toile(W, H), Toile(W, H)
    s = 3 + 2 * VUES.index(vue)
    if vue == 'cote':
        X0, SOL = ax - LONG // 2, ay
        vx, yv = X0 + LONG + 10, SOL - 5          # le charretier : sa case, ses pieds
        brancard(d, X0 + LONG - 1, SOL - 14, vx + 9, yv - 10, BOIS[3], 7, 0.5)
        X1, ybr, _ = caisse_profil(d, X0, SOL, charge, s=s, phase=k)
        brancard(f, X1 - 3, ybr, vx + 1, yv - 8, BOIS[4], 8)
        main = [(43, 29, 20), (240, 196, 160), (214, 160, 124)]
        for dx, dy in ((-1, 0), (2, 0), (0, -1), (1, -1), (0, 2), (1, 2)):
            f.put(vx + 1 + dx, yv - 9 + dy, main[0])
        f.put(vx + 1, yv - 9, main[1]); f.put(vx + 2, yv - 9, main[2]); f.put(vx + 1, yv - 8, main[2]); f.put(vx + 2, yv - 8, main[0])
        PLACE['bras']['cote'] = (vx + 8 - ax, yv - ay)
        ells = [(X0 + 15, SOL - 1, 19, 3.2)]
    elif vue == 'bas':
        cx, yN = ax, ay + 10
        YV = yN + 9                               # ses pieds, devant la charrette
        caisse_axe(d, cx, yN, charge, s=s, phase=k, vers='bas')
        for x, ss in ((cx - 6, 11), (cx + 4, 12)):
            brancard(d, x, yN - 9, x, YV - 9, BOIS[3] if x < cx else BOIS[4], ss, 0.68 if x < cx else 0.5)
            brancard(d, x + 1, yN - 9, x + 1, YV - 9, BOIS[3], ss + 1, 0.4)
        PLACE['bras']['bas'] = (0, YV - ay)
        ells = [(cx, yN - 9, 13, 5)]
    else:
        # (de dos : le charretier s'en va devant elle, un peu plus loin que le bout de la caisse, pour qu'on le voie
        # entier au-dessus de la ridelle du fond ; les brancards vont du plancher à ses mains)
        cx, yN = ax, ay + 10
        yF = yN - p(LONG)
        yP = yF - 20
        for x, ss in ((cx - 6, 21), (cx + 4, 22)):
            brancard(d, x, yP - 10, x, yF - 6, BOIS[3], ss, 0.62)
            brancard(d, x + 1, yP - 10, x + 1, yF - 6, BOIS[3], ss + 1, 0.36)
        caisse_axe(f, cx, yN, charge, s=s, phase=k, vers='haut')
        PLACE['bras']['haut'] = (0, yP - ay)
        ells = [(cx, yN - 9, 13, 5), (cx, yP, 6, 2)]
    return [ombre_sous(contour(d.im, OUT), ells), contour(f.im, OUT)]


def bras_deco(vue, deco):
    """Le dessus de la caisse (rehausses, bâche) dans la case à bras de la vue."""
    W, H, ax, ay = BRAS['w'], BRAS['h'], BRAS['ax'], BRAS['ay']
    t = Toile(W, H)
    s = 3 + 2 * VUES.index(vue)
    if vue == 'cote':
        X0, SOL = ax - LONG // 2, ay
        rehausses_profil(t, X0, SOL, s)
        if deco == 'bache':
            bache_profil(t, X0, SOL, s)
    else:
        cx, yN = ax, ay + 10
        rehausses_axe(t, cx, yN, s)
        if deco == 'bache':
            bache_axe(t, cx, yN, s)
    return contour(t.im, OUT)


def charrette_seule():
    """La charrette rangée sur la ferme, de profil, vide, les brancards posés au sol."""
    W, H, ax, ay = BRAS['w'], BRAS['h'], BRAS['ax'], BRAS['ay']
    t = Toile(W, H)
    X0, SOL = ax - LONG // 2, ay
    brancard(t, X0 + LONG - 1, SOL - 14, X0 + LONG + 18, SOL - 7, BOIS[3], 7, 0.5)
    X1, ybr, _ = caisse_profil(t, X0, SOL, False, s=3)
    brancard(t, X1 - 3, ybr, X1 + 22, SOL - 2, BOIS[4], 8)
    return ombre_sous(contour(t.im, OUT), [(X0 + 18, SOL - 1, 22, 3.2)])


# ---------------------------------------------------------------- au cheval

def cheval_cases(vue, charge, k):
    """[derrière, devant] : la charrette attelée au cheval de trait (vue, chargée ou non, temps k : 4 à l'arrêt). Le
    charretier, assis sur le siège, entre les deux (PLACE['cheval'][vue]), au milieu de la caisse."""
    W, H, ax, ay = ATTELAGE['w'], ATTELAGE['h'], ATTELAGE['ax'], ATTELAGE['ay']
    d, f = Toile(W, H), Toile(W, H)
    s = 13 + 2 * VUES.index(vue)
    ph = k % 4
    if vue == 'cote':
        X0, SOL = ax - LONG // 2, ay
        X1 = X0 + LONG
        hx, hy = X1 + 3, SOL - 39
        brancard(d, X1 - 3, SOL - 15, hx + 30, hy + 15, BOIS[3], 5, 0.48)
        X1, ybr, yt = caisse_profil(d, X0, SOL, charge, s=s, phase=ph, siege=True)
        f.colle(cheval_cote(k), hx, hy)
        brancard(f, X1 - 3, ybr - 1, hx + 32, hy + 19, BOIS[4], 6)
        top = yt - 3 - 27
        rene(f, X1 - 3, top + 20, hx + 41, hy + 13, 3)
        PLACE['cheval']['cote'] = (X1 - 13 + 8 - ax, top + 32 - ay)
        ells = [(X0 + 40, SOL - 3, 42, 3.4)]
    elif vue == 'bas':
        cx, yN = ax, ay + 10
        ytN, ytF = caisse_axe(d, cx, yN, charge, s=s, phase=ph, siege=True, vers='bas')
        top = ytN - 3 - 24
        for x, ss in ((cx - 8, 31), (cx + 7, 32)):
            brancard(f, x, yN - 9, x + (1 if x < cx else -1), yN + 10, BOIS[3], ss, 0.6 if x < cx else 0.45)
        hx, hy = cx - 24, yN + 21 - 38
        f.colle(cheval_vue('bas', k), hx, hy)
        rene(f, cx - 3, top + 21, cx - 4, hy + 15, 1)
        rene(f, cx + 2, top + 21, cx + 3, hy + 15, 1)
        PLACE['cheval']['bas'] = (0, top + 32 - ay)
        ells = [(cx, yN - 4, 20, 9)]
    else:
        cx, yN = ax, ay + 10
        yF = yN - p(LONG)
        d.colle(cheval_vue('haut', k), cx - 24, yF - 20 - 38)
        for x, ss in ((cx - 8, 41), (cx + 7, 42)):
            brancard(d, x + (1 if x < cx else -1), yF - 30, x, yF - 9, BOIS[3], ss, 0.58)
        ytF = yF - r(RIDELLE)
        top = ytF - 3 - 24
        rene(d, cx - 3, top + 20, cx - 2, yF - 20 - 38 + 12, 1)
        rene(d, cx + 2, top + 20, cx + 3, yF - 20 - 38 + 12, 1)
        planche(d, cx - LARGE // 2 + 1, ytF - 3, cx + LARGE // 2 - 1, ytF - 2, BOIS[7], 0.76, s + 50, sens='h')
        caisse_axe(f, cx, yN, charge, s=s, phase=ph, siege=False, vers='haut')
        PLACE['cheval']['haut'] = (0, top + 32 - ay)
        ells = [(cx, yN - 14, 20, 12)]
    return [ombre_sous(contour(d.im, OUT), ells), contour(f.im, OUT)]


def cheval_deco(vue, deco):
    W, H, ax, ay = ATTELAGE['w'], ATTELAGE['h'], ATTELAGE['ax'], ATTELAGE['ay']
    t = Toile(W, H)
    s = 13 + 2 * VUES.index(vue)
    if vue == 'cote':
        rehausses_profil(t, ax - LONG // 2, ay, s)
        if deco == 'bache':
            bache_profil(t, ax - LONG // 2, ay, s)
    else:
        rehausses_axe(t, ax, ay + 10, s)
        if deco == 'bache':
            bache_axe(t, ax, ay + 10, s)
    return contour(t.im, OUT)


# ---------------------------------------------------------------- le wagonnet

def roue_fer(t, cx, cy, s, phase=0):
    """Une petite roue de fer à boudin, de flanc : le disque éclairé en haut à gauche, le boudin plus sombre au bord,
    le moyeu ; un rivet qui tourne avec elle (le temps)."""
    def fn(x, y, dx, dy, d):
        if d > 0.7:
            return ton(ACIER, 0.34 - 0.18 * dx - 0.2 * dy)
        return ton(ACIER, 0.6 - 0.22 * dx - 0.26 * dy - 0.1 * d + bruit(x, y, s) * 0.03)
    ovale(t, cx, cy, 3.4, 3.0, fn)
    t.put(cx, cy, ton(ROUILLE, 0.4)); t.put(cx - 1, cy - 1, ton(ACIER, 0.9))
    a = phase * math.pi / 2 + 0.6
    t.put(round(cx + 2 * math.cos(a)), round(cy + 1.7 * math.sin(a)), ton(ROUILLE, 0.62))


def fer_bord():
    return varie([(20, 22, 30), (50, 54, 64), (92, 96, 104), (150, 150, 150), (210, 204, 190)], 1, 4)


def wagon_profil(t, X0, yr, charge, s=0, phase=0):
    """Le wagonnet de profil, vers la droite : X0 son arrière, yr la rangée du champ du rail proche. → (X1, yt)."""
    X1 = X0 + WLONG
    for xw in (X0 + 6, X1 - 6):
        roue_fer(t, xw, yr - 9 - 3, s + xw, phase)
    face(t, X0 + 2, yr - 5, X1 - 2, yr - 4, BOIS[0], 0.3, s + 1)
    yb, yt = yr - r(5), yr - r(13)
    ytf = yt - p(LARGE)
    planche(t, X0, ytf - 1, X1, ytf, fer_bord(), 0.7, s + 2)
    face(t, X0 + 1, ytf + 1, X1 - 1, ytf + 3, BOIS[2], 0.5, s + 3)
    face(t, X0 + 1, ytf + 4, X1 - 1, ytf + 6, BOIS[7], 0.42, s + 4)
    for k, y in enumerate(range(ytf + 7, yt)):
        planche(t, X0 + 2, y, X1 - 2, y, BOIS[(k * 4 + s) % 9], 0.6 + 0.08 * k, s + 10 + k, sens='h')
    for x in range(X0 + 1, X1):
        t.assombrit(x, ytf + 7, 0.3)
    for y in range(ytf - 1, yb + 1):
        u = (y - ytf) / max(1, yb - ytf)
        xa, xb = X0 + round(1 * u), X1 - round(1 * u)
        t.put(xa, y, ton(BOIS[6], 0.66 - 0.2 * u)); t.put(xb, y, ton(BOIS[6], 0.42 - 0.15 * u))
    if charge:
        chargement(t, X0 + 2, X1 - 2, ytf + 1, yt - 1, s + 30, haut=5)
    else:
        paille_eparse(t, X0 + 2, X1 - 2, ytf + 7, yt - 1, s + 31)
    for x in range(X0, X1 + 1):
        for y in range(yt, yb + 1):
            u = (y - yt) / max(1, yb - yt)
            if y == yt:
                c = ton(ACIER, 0.8 - 0.2 * (x - X0) / WLONG + bruit(x, y, s + 40) * 0.03)
            elif y <= yt + 3:
                c = ton(PEINT[(x // 7 + s) % 4], 0.6 - 0.12 * u + bruit(x // 2, y, s + 41) * 0.04)
            else:
                c = ton(BOIS[(x // 9 + 5) % 9], 0.48 - 0.2 * u + bruit(x // 3, y, s + 43) * 0.04)
            t.put(x, y, c)
    for x in range(X0, X1 + 1):
        t.assombrit(x, yt + 4, 0.35)
    for xb in (X0, X0 + WLONG // 2, X1 - 1):
        for y in range(yt, yb + 1):
            t.put(xb, y, ton(FER, 0.62 - 0.3 * (y - yt) / (yb - yt))); t.put(xb + 1, y, ton(FER, 0.3 - 0.15 * (y - yt) / (yb - yt)))
        t.put(xb, yt + 2, ton(ACIER, 0.95)); t.put(xb, yb - 1, ton(ACIER, 0.7))
    croissant(t, X0 + 8, yt + 3, CREME)
    for x in range(X0 + 1, X1):
        t.assombrit(x, yb + 1, 0.3)
    for xw in (X0 + 6, X1 - 6):
        roue_fer(t, xw, yr - 3, s + 50 + xw, phase)
    return X1, yt


def wagon_axe(t, cx, yN, charge, s=0, phase=0, vers='bas'):
    """Le wagonnet dans l'axe de la voie : cx le milieu de la voie, yN la rangée du sol sous sa face proche. → yt."""
    L, D = LARGE // 2, p(WLONG)
    yt, yb = yN - r(13), yN - r(5)
    ytf = yt - D
    planche(t, cx - L, ytf - 1, cx + L, ytf, fer_bord(), 0.7, s + 2)
    face(t, cx - L + 1, ytf + 1, cx + L - 1, ytf + 3, BOIS[2], 0.5, s + 3)
    face(t, cx - L + 1, ytf + 4, cx + L - 1, ytf + 6, BOIS[7], 0.42, s + 4)
    for k, x0 in enumerate(range(cx - L + 1, cx + L - 1, 3)):
        planche(t, x0, ytf + 7, min(cx + L - 1, x0 + 2), yt - 1, BOIS[(k * 5 + s) % 9], 0.56 + 0.04 * (k % 3), s + 10 + k, sens='v')
    for x in range(cx - L + 1, cx + L):
        t.assombrit(x, ytf + 7, 0.35)
    for y in range(ytf - 1, yt + 1):
        t.put(cx - L, y, ton(BOIS[5], 0.72)); t.put(cx - L - 1, y, ton(FER, 0.5))
        t.put(cx + L, y, ton(BOIS[5], 0.44)); t.put(cx + L + 1, y, ton(FER, 0.26))
        t.assombrit(cx - L + 1, y, 0.2); t.assombrit(cx + L - 1, y, 0.3)
    if charge:
        chargement(t, cx - L + 1, cx + L - 1, ytf + 2, yt - 1, s + 30, haut=4)
    else:
        paille_eparse(t, cx - L + 2, cx + L - 2, ytf + 8, yt - 1, s + 31)
    for x in range(cx - L - 1, cx + L + 2):
        for y in range(yt, yb + 1):
            u = (y - yt) / max(1, yb - yt)
            if y == yt:
                c = ton(ACIER, 0.82 - 0.2 * (x - cx + L) / LARGE)
            elif y <= yt + 3:
                c = ton(PEINT[(x // 5 + s) % 4], 0.6 - 0.12 * u - 0.06 * (x - cx + L) / LARGE + bruit(x // 2, y, s + 41) * 0.04)
            else:
                c = ton(BOIS[(x // 5 + 5) % 9], 0.48 - 0.2 * u - 0.06 * (x - cx + L) / LARGE + bruit(x // 3, y, s + 43) * 0.04)
            t.put(x, y, c)
    for x in range(cx - L - 1, cx + L + 2):
        t.assombrit(x, yt + 4, 0.35)
    for xb in (cx - L - 1, cx + L):
        for y in range(yt, yb + 1):
            t.put(xb, y, ton(FER, 0.6 - 0.3 * (y - yt) / (yb - yt)))
    croissant(t, cx - 2, yt + 3, CREME)
    for j, xw in enumerate((cx - 5, cx + 4)):     # les roues, sur la tranche, sur les rails (colonnes 3 et 12)
        for y in range(yb + 1, yN + 1):
            t.put(xw, y, ton(ACIER, 0.6 - 0.1 * (y - yb) + (0.12 if (y + phase) % 4 == 0 else 0))); t.put(xw + 1, y, ton(ACIER, 0.3))
    face(t, cx - L + 1, yb + 1, cx + L - 1, yb + 1, BOIS[0], 0.28, s + 1)
    return yt, ytf


def wagonnet_cases(vue, charge, k):
    """[derrière, devant] : le wagonnet au halage (vue, chargé ou non, temps k du pas du cheval : 4 à l'arrêt)."""
    W, H, ax, ay = ATTELAGE['w'], ATTELAGE['h'], ATTELAGE['ax'], ATTELAGE['ay']
    d, f = Toile(W, H), Toile(W, H)
    s = 21 + 2 * VUES.index(vue)
    ph = k % 4
    if vue == 'cote':
        yr = ay - 2                                # le champ du rail proche (la rangée 12 de sa case)
        X0 = ax - WLONG // 2
        X1, yt = wagon_profil(d, X0, yr, charge, s=s, phase=ph)
        top = yt - 27
        hx, hy = X1 + 6, yr + 16 - 38 + 2          # le cheval, sur le chemin au sud de la voie, devant
        f.colle(cheval_cote(k), hx, hy)
        planche(f, hx + 4, hy + 24, hx + 6, hy + 30, BOIS[3], 0.6, 5, sens='v')
        corde(d, X1 + 1, yt + 6, hx + 5, hy + 27, 2, 0)
        corde(f, hx + 6, hy + 24, hx + 29, hy + 19, 1, 1)
        rene(f, X1 - 1, top + 20, hx + 41, hy + 13, 4)
        PLACE['wagonnet']['cote'] = (X1 - 12 + 8 - ax, top + 32 - ay)
        ells = [(X0 + 16, yr + 1, 16, 2.5), (hx + 24, hy + 39, 15, 2.5)]
    elif vue == 'bas':
        cx, yN = ax, ay + 10
        yt, ytf = wagon_axe(d, cx, yN, charge, s=s, phase=ph, vers='bas')
        top = yt - 24
        hx, hy = cx + 16 - 24, yN + 22 - 38        # le cheval à l'est de la voie, devant
        corde(f, cx + 8, yt + 6, hx + 17, hy + 24, 2, 0)
        f.colle(cheval_vue('bas', k), hx, hy)
        rene(f, cx - 2, top + 21, hx + 21, hy + 15, 2)
        PLACE['wagonnet']['bas'] = (0, top + 32 - ay)
        ells = [(cx, yN - 6, 9, 9), (hx + 24, hy + 36, 7, 4)]
    else:
        cx, yN = ax, ay + 10
        yF = yN - p(WLONG)
        hx, hy = cx + 16 - 24, yF - 32 - 38 + 8    # le cheval à l'est de la voie, devant (plus loin)
        d.colle(cheval_vue('haut', k), hx, hy)
        yt, ytf = wagon_axe(f, cx, yN, charge, s=s, phase=ph, vers='haut')
        top = ytf - 24
        corde(d, cx + 7, ytf + 2, hx + 24, hy + 30, 2, 0)
        rene(d, cx - 1, top + 20, hx + 22, hy + 12, 2)
        PLACE['wagonnet']['haut'] = (0, top + 32 - ay)
        ells = [(cx, yN - 6, 9, 9), (hx + 24, hy + 36, 7, 4)]
    return [ombre_sous(contour(d.im, OUT), ells), contour(f.im, OUT)]


def wagonnet_seul():
    """Le wagonnet à la gare, de profil, vide, sans cheval."""
    W, H, ax, ay = ATTELAGE['w'], ATTELAGE['h'], ATTELAGE['ax'], ATTELAGE['ay']
    t = Toile(W, H)
    yr = ay - 2
    X0 = ax - WLONG // 2
    wagon_profil(t, X0, yr, False, s=21)
    return ombre_sous(contour(t.im, OUT), [(X0 + 16, yr + 1, 16, 2.5)])


# ---------------------------------------------------------------- les rails

S = 16
G = (3, 12)                 # les deux rails : la colonne (nord-sud) ou la rangée (est-ouest) de leur champ


def caillou(x, y):
    """Le ballast : des cailloux de 2 × 2 (décalés une rangée sur deux), chacun sa rampe et son ton, modelés."""
    cx = (x + (y // 2) % 2) // 2
    cy = y // 2
    k = int((bruit(cx, cy, 71) + 1) * 1.5) % 3
    v = 0.48 + bruit(cx, cy, 72) * 0.16
    lx, ly = (x + (y // 2) % 2) % 2, y % 2
    v += 0.1 if (lx == 0 and ly == 0) else (-0.12 if (lx == 1 and ly == 1) else 0)
    return ton(GRAVIER[k], v)


def rails_droit(sens):
    """Un tronçon droit : 'ns' (nord-sud) ou 'eo' (est-ouest) : le ballast, quatre traverses (leur dessus, leur face),
    les rails (leur champ poli, leur flanc dans l'ombre), les tire-fonds."""
    t = Toile(S, S)
    for y in range(S):
        for x in range(S):
            a, b = (x, y) if sens == 'ns' else (y, x)
            bord = 1 if bruit(b, 3, 70) > 0.2 else 0
            if bord <= a <= S - 1 - bord:
                t.put(x, y, caillou(x, y))
    for k in range(4):
        rr = CHENE[(k * 3 + (1 if sens == 'eo' else 0)) % 8]
        if sens == 'ns':
            y0 = 4 * k + 1
            for x in range(1, 15):
                for y in (y0, y0 + 1):
                    v = 0.6 + (0.1 if y == y0 else 0) + (0.07 if x == 1 else 0) - 0.08 * (x / 14) + bruit(x // 3, y, 80 + k) * 0.05
                    t.put(x, y, ton(rr, v))
                t.put(x, y0 + 2, ton(rr, 0.32 - 0.06 * (x / 14) + bruit(x, k, 81) * 0.03))
            for x in range(1, 15):
                t.assombrit(x, y0 + 3, 0.25)
        else:
            x0 = 4 * k + 1
            for y in range(1, 14):
                for x in (x0, x0 + 1):
                    v = 0.58 + (0.1 if x == x0 else -0.04) + (0.06 if y == 1 else 0) - 0.06 * (y / 13) + bruit(x, y // 3, 90 + k) * 0.05
                    t.put(x, y, ton(rr, v))
            for x in (x0, x0 + 1):
                t.put(x, 14, ton(rr, 0.3 - (0.04 if x > x0 else 0)))
            for y in range(1, 15):
                t.assombrit(x0 + 2, y, 0.22)
            t.assombrit(x0, 15, 0.25); t.assombrit(x0 + 1, 15, 0.25)
    for g in G:
        if sens == 'ns':
            for y in range(S):
                t.put(g, y, ton(ACIER, 0.86 - 0.08 * (y / 15) + bruit(g, y, 100) * 0.03))
                t.put(g + 1, y, ton(ACIER, 0.36 + bruit(g + 1, y, 101) * 0.04))
                t.assombrit(g + 2, y, 0.32)
                t.assombrit(g - 1, y, 0.12)
            for k in range(4):
                y = 4 * k + 2
                t.put(g - 1, y, ton(ROUILLE, 0.5)); t.put(g + 2, y, ton(ROUILLE, 0.3))
        else:
            for x in range(S):
                t.put(x, g, ton(ACIER, 0.88 - 0.06 * (x / 15) + bruit(x, g, 102) * 0.03))
                t.put(x, g + 1, ton(ACIER, 0.34 + bruit(x, g + 1, 103) * 0.04))
                t.assombrit(x, g + 2, 0.34)
            for k in range(4):
                x = 4 * k + 1
                t.put(x, g - 1, ton(ROUILLE, 0.55)); t.put(x + 1, g + 2, ton(ROUILLE, 0.28))
    return t.im


def rails_courbe(coin):
    """Une courbe d'un quart de cercle, centrée sur le coin de la case entre les deux voisins qu'elle relie ('ne' : le
    nord et l'est…) ; les rails aux rayons qui prolongent ceux des tronçons droits ; les traverses rayonnantes."""
    t = Toile(S, S)
    cx = S if 'e' in coin else 0
    cy = 0 if coin[0] == 'n' else S
    R = (S - G[1] - 0.5, S - G[0] - 0.5) if cx == S else (G[0] + 0.5, G[1] + 0.5)
    ri, re = min(R), max(R)

    def polaire(x, y):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        return math.hypot(dx, dy), math.atan2(abs(dy), abs(dx))
    for y in range(S):
        for x in range(S):
            rr, a = polaire(x, y)
            if ri - 2.6 + (bruit(int(a * 9), 1, 70) > 0.3) <= rr <= re + 2.6 - (bruit(int(a * 9), 2, 70) > 0.3):
                t.put(x, y, caillou(x, y))
    dessus = {}
    for k, a0 in enumerate((0.16, 0.56, 1.0, 1.4)):
        for y in range(S):
            for x in range(S):
                rr, a = polaire(x, y)
                if ri - 2 <= rr <= re + 2 and abs(a - a0) * rr <= 1.05:
                    dessus[(x, y)] = k
    for (x, y), k in dessus.items():
        rr, _ = polaire(x, y)
        t.put(x, y, ton(CHENE[(k * 3 + 2) % 8], 0.62 - 0.1 * (rr - ri) / (re - ri) + bruit(x, y, 110 + k) * 0.05))
    for (x, y), k in dessus.items():
        if (x, y + 1) not in dessus and y + 1 < S:
            t.put(x, y + 1, ton(CHENE[(k * 3 + 2) % 8], 0.3))
            if y + 2 < S:
                t.assombrit(x, y + 2, 0.22)
    rails = set()
    for y in range(S):
        for x in range(S):
            rr, a = polaire(x, y)
            for R0 in (ri, re):
                if abs(rr - R0) <= 0.72:
                    rails.add((x, y))
    for (x, y) in rails:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        n = -(dx + dy) / max(0.1, math.hypot(dx, dy))
        t.put(x, y, ton(ACIER, 0.6 + 0.2 * n + bruit(x, y, 120) * 0.03))
    for (x, y) in rails:
        if (x, y + 1) not in rails and y + 1 < S:
            t.put(x, y + 1, ton(ACIER, 0.3))
            if y + 2 < S and (x, y + 2) not in rails:
                t.assombrit(x, y + 2, 0.3)
        if (x + 1, y) not in rails and x + 1 < S:
            t.assombrit(x + 1, y, 0.18)
    return t.im


def rails_chemin(sens):
    """Le passage planchéié : les rails à travers un chemin ('ns' : les rails vont du nord au sud). Des madriers à fleur
    dans le sens des rails, chacun sa rampe, modelé ; les rails affleurants, la rainure où passent les boudins ; entre
    les madriers, la terre du chemin (le sol du jeu, laissé à jour)."""
    t = Toile(S, S)
    for k, (a0, a1) in enumerate(((1, 2), (5, 7), (8, 10), (14, 14))):
        rr = MADRIER[(k * 2 + (1 if sens == 'eo' else 0)) % 6]
        if sens == 'ns':
            planche(t, a0, 0, a1, S - 1, rr, 0.56 + 0.04 * (k % 2), 130 + k, sens='v')
        else:
            planche(t, 0, a0, S - 1, a1, rr, 0.58 + 0.04 * (k % 2), 130 + k, sens='h')
    for g in G:
        for b in range(S):
            x, y = (g, b) if sens == 'ns' else (b, g)
            t.put(x, y, ton(ACIER, 0.84 + bruit(x, y, 140) * 0.04))
            xi, yi = (g + (1 if g == G[0] else -1), b) if sens == 'ns' else (b, g + (1 if g == G[0] else -1))
            t.put(xi, yi, mel(ton(ACIER, 0.12), FROID, 0.3))
    for a in range(1, 15):
        x, y = (a, 15) if sens == 'ns' else (15, a)
        t.assombrit(x, y, 0.18)
    return t.im


IMAGES_RAILS = ['ns', 'eo', 'ne', 'no', 'se', 'so', 'ns_chemin', 'eo_chemin']


def rails_images():
    out = {'ns': rails_droit('ns'), 'eo': rails_droit('eo')}
    for c in ('ne', 'no', 'se', 'so'):
        out[c] = rails_courbe(c)
    out['ns_chemin'] = rails_chemin('ns')
    out['eo_chemin'] = rails_chemin('eo')
    return [out[n] for n in IMAGES_RAILS]


# ---------------------------------------------------------------- les planches

def planche_feuille(cases, w, h, n):
    """Les cases [(numéro, couche, image)] en une planche : la case n de la couche c est la case c × n + n, rangée par
    rangée, la planche au plus de 4 096 px de large (la taille d'une texture que toute carte graphique accepte)."""
    cols = min(2 * n, 4096 // w)
    lignes = -(-2 * n // cols)
    out = Image.new('RGBA', (w * cols, h * lignes), (0, 0, 0, 0))
    for num, row, im in cases:
        if im is not None:
            i = row * n + num
            out.alpha_composite(im, ((i % cols) * w, (i // cols) * h))
    out.n = n
    out.cases = (w, h, cols)
    return out


def rangee_caisse(mode, vue):
    """La rangée où est la caisse dans la vue (0 : derrière le charretier, 1 : devant lui)."""
    return 1 if vue == 'haut' else 0


def feuilles():
    fe = {}
    # à bras
    cases = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            for k in range(4):
                der, dev = bras_cases(vue, bool(c), k)
                n = (v * 2 + c) * 4 + k
                cases += [(n, 0, der), (n, 1, dev)]
    for d, deco in enumerate(DECOS):
        for v, vue in enumerate(VUES):
            cases.append((24 + d * 3 + v, rangee_caisse('bras', vue), bras_deco(vue, deco)))
    cases.append((30, 0, charrette_seule()))
    fe['charrette_bras'] = planche_feuille(cases, BRAS['w'], BRAS['h'], 31)
    # au cheval
    cases = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            for k in range(5):
                der, dev = cheval_cases(vue, bool(c), k)
                n = (v * 2 + c) * 5 + k
                cases += [(n, 0, der), (n, 1, dev)]
    for d, deco in enumerate(DECOS):
        for v, vue in enumerate(VUES):
            cases.append((30 + d * 3 + v, rangee_caisse('cheval', vue), cheval_deco(vue, deco)))
    fe['charrette_cheval'] = planche_feuille(cases, ATTELAGE['w'], ATTELAGE['h'], 36)
    # le wagonnet
    cases = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            for k in range(5):
                der, dev = wagonnet_cases(vue, bool(c), k)
                n = (v * 2 + c) * 5 + k
                cases += [(n, 0, der), (n, 1, dev)]
    cases.append((30, 0, wagonnet_seul()))
    fe['charrette_wagonnet'] = planche_feuille(cases, ATTELAGE['w'], ATTELAGE['h'], 31)
    rails = rails_images()
    r_ = Image.new('RGBA', (S * len(rails), S), (0, 0, 0, 0))
    for i, im in enumerate(rails):
        r_.alpha_composite(im, (i * S, 0))
    fe['rails'] = r_
    return fe, rails


def main():
    fe, rails = feuilles()
    for nom, im in fe.items():
        im.save(os.path.join(ASSETS, nom + '.png'), optimize=True)
    # où se pose le charretier (js/carte/ferme/charrette-village.js : PLACE)
    print('PLACE =', json.dumps(PLACE))
    if '--apercu' in sys.argv:
        apercu(fe, rails)


# ---------------------------------------------------------------- l'aperçu (hors du jeu)

def perso(case, nom='perso_12'):
    cases = json.load(open(os.path.join(ASSETS, 'personnages', 'cases.json')))['frames']
    im = Image.open(os.path.join(ASSETS, 'personnages', nom + '.png')).convert('RGBA')
    k = cases.index(case)
    return im.crop(((k % 8) * 16, (k // 8) * 32, (k % 8) * 16 + 16, (k // 8) * 32 + 32))


def prendre(feuille, num, row):
    w, h, cols = feuille.cases
    i = row * feuille.n + num
    return feuille.crop(((i % cols) * w, (i // cols) * h, (i % cols) * w + w, (i // cols) * h + h))


def compose(feuille, w, h, col, mode, vue, image, deco=None, deco_col=None):
    """Une case composée comme la scène le fait : derrière, le charretier, devant (et le dessus de la caisse)."""
    der = prendre(feuille, col, 0)
    dev = prendre(feuille, col, 1)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(der)
    rc = rangee_caisse(mode, vue)
    ov = prendre(feuille, deco_col, rc) if deco_col is not None else None
    if ov is not None and rc == 0:
        out.alpha_composite(ov)
    if image:
        dx, dy = PLACE[mode][vue]
        ax, ay = (BRAS if mode == 'bras' else ATTELAGE)['ax'], (BRAS if mode == 'bras' else ATTELAGE)['ay']
        out.alpha_composite(perso(image), (ax + dx - 8, ay + dy - 32))
    out.alpha_composite(dev)
    if ov is not None and rc == 1:
        out.alpha_composite(ov)
    return out


def apercu(fe, rails):
    herbe = (112, 164, 84, 255)
    lignes = []
    B, Cv, Wg = fe['charrette_bras'], fe['charrette_cheval'], fe['charrette_wagonnet']
    ims = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            ims.append(compose(B, BRAS['w'], BRAS['h'], (v * 2 + c) * 4, 'bras', vue, f'marche_{vue}_0'))
    lignes.append(ims)
    ims = []
    for v, vue in enumerate(VUES):
        ims.append(compose(B, BRAS['w'], BRAS['h'], (v * 2 + 1) * 4, 'bras', vue, f'marche_{vue}_1', deco_col=24 + v))
        ims.append(compose(B, BRAS['w'], BRAS['h'], (v * 2 + 1) * 4, 'bras', vue, f'marche_{vue}_2', deco_col=27 + v))
    lignes.append(ims)
    ims = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            ims.append(compose(Cv, ATTELAGE['w'], ATTELAGE['h'], (v * 2 + c) * 5, 'cheval', vue, f'assis_{vue}_0', deco_col=(30 + 3 + v) if c else None))
    lignes.append(ims)
    ims = []
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            ims.append(compose(Wg, ATTELAGE['w'], ATTELAGE['h'], (v * 2 + c) * 5 + 1, 'wagonnet', vue, f'assis_{vue}_0'))
    lignes.append(ims)
    larg = max(sum(i.width for i in l) + 8 * len(l) for l in lignes)
    haut = sum(max(i.height for i in l) for l in lignes) + 8 * len(lignes) + 40
    ap = Image.new('RGBA', (larg, haut), herbe)
    y = 4
    for l in lignes:
        x = 4
        for im in l:
            ap.alpha_composite(im, (x, y))
            x += im.width + 8
        y += max(i.height for i in l) + 8
    for i, im in enumerate(rails):
        ap.alpha_composite(im, (4 + i * 20, y + 4))
    ap.resize((ap.width * 3, ap.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_charrette_village.png'))
    print('couleurs opaques distinctes :')
    def case(f, w, h, col, row=None):
        if row is None:
            out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            out.alpha_composite(prendre(f, col, 0))
            out.alpha_composite(prendre(f, col, 1))
            return out
        return prendre(f, col, row)
    for v, vue in enumerate(VUES):
        for c in (0, 1):
            n = 'chargée' if c else 'vide'
            print(f'  à bras, {vue}, {n} : {couleurs(case(B, BRAS["w"], BRAS["h"], (v * 2 + c) * 4))}'
                  f' ; au cheval : {couleurs(case(Cv, ATTELAGE["w"], ATTELAGE["h"], (v * 2 + c) * 5))}'
                  f' ; le wagonnet : {couleurs(case(Wg, ATTELAGE["w"], ATTELAGE["h"], (v * 2 + c) * 5))}')
    for d, deco in enumerate(DECOS):
        print(f'  {deco} (à bras, de profil) : {couleurs(case(B, BRAS["w"], BRAS["h"], 24 + d * 3, 0))}')
    print(f'  la charrette rangée : {couleurs(case(B, BRAS["w"], BRAS["h"], 30, 0))} ; le wagonnet à la gare : {couleurs(case(Wg, ATTELAGE["w"], ATTELAGE["h"], 30, 0))}')
    print('  les rails :', ', '.join(f'{n} {couleurs(im)}' for n, im in zip(IMAGES_RAILS, rails)), '; les huit :', couleurs(fe['rails']))
    for nom, im in fe.items():
        print(f'  la planche {nom} : {im.width} × {im.height}, {couleurs(im)} couleurs')


if __name__ == '__main__':
    main()
