# Le port de l'île (docs/ile-300.md : le bloc « Port », un ponton et sa halle) : ses dessins, dans leur planche
# (assets/port_ile.png, port_ile.json : pour chaque image, [x, y, largeur, hauteur, pied x, pied y]).
#
#   python3 scripts/carte/port_ile.py            écrit la planche ; compte les couleurs de chaque dessin
#   python3 scripts/carte/port_ile.py --apercu   écrit aussi apercu_port_ile.png : les quatre ports montés (le
#                                                ponton sur l'eau, la halle à côté de son pied, sur l'herbe),
#                                                agrandis
#
# Tout est vu de haut à 45° (CLAUDE.md) : le dessus et la face avant de chaque chose, la lumière en haut à gauche,
# un contour sombre d'un pixel, des rampes fines de tons (le froid dans l'ombre, le chaud dans la lumière), chaque
# planche, bardeau, pierre avec sa nuance. Les matières et les pièces reprises du port d'avant : scripts/carte/port.py
# (le bois blanchi par la mer, le chêne, la pierre, le poteau de la halle, le comptoir).
#
#   - le ponton (2 × 8 cases, dans les quatre directions) : des planches posées en travers du sens de la marche,
#     la gauche et le haut éclairés ; sa culée, la première travée posée sur la rive (un seuil de pierre côté terre) ;
#     le long de ses deux bords, sur l'eau, des potelets (une case sur deux) : leur tête ronde dépasse des
#     planches, leur fût s'enfonce dans l'eau (mouillé, puis verdi d'algues, un rond d'eau sombre au pied) ; vers
#     nous (le bout vers le sud, la rangée du bas vers l'est ou l'ouest), la face de la poutre de rive et des
#     pieux sous elle ; deux bittes d'amarrage au bout ;
#   - la halle (3 × 3 cases) : son plancher (un peu surélevé : sa face avant), ses quatre poteaux (ceux du port
#     d'avant), son comptoir (celui du port d'avant, trois cases, au milieu) ; son toit de bardeaux à croupes, à part
#     (la scène l'efface quand on est dessous).
#
# Relancer le script redonne les mêmes images (aucun hasard qui ne soit tiré de clés fixes).
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402
import port as P  # noqa: E402

T = 16
OUT = P.OUT
N = P.N
BOIS = P.BOIS_MER
LONG = 8                                   # le ponton : 8 cases, la culée comprise
LARGE = 4                                  # une planche : 4 px (la période divise 16)
FACE = 3                                   # la face de la poutre de rive (px)
PIEU = 4                                   # sous elle, les pieux jusqu'à l'eau (px)
TETE = 3                                   # la tête d'un potelet dépasse des planches de 3 px
MARGE = 4                                  # la marge autour du ponton (les potelets débordent)
BARDEAU = [rampe(c, N) for c in (
    [(30, 30, 40), (60, 54, 56), (96, 82, 72), (134, 112, 90), (170, 142, 110), (204, 176, 138), (230, 208, 170)],
    [(28, 32, 42), (56, 58, 62), (90, 88, 82), (126, 118, 100), (162, 150, 122), (198, 184, 150), (226, 214, 182)],
    [(34, 28, 36), (68, 52, 50), (108, 80, 64), (148, 108, 80), (184, 140, 100), (216, 172, 128), (240, 204, 160)],
    [(26, 30, 38), (52, 56, 60), (84, 86, 84), (118, 116, 104), (154, 148, 128), (190, 182, 156), (220, 214, 188)],
)]


def planche(k, s):
    """La rampe et le ton de la planche k (tirés d'elle : toujours les mêmes)."""
    return BOIS[int((bruit(k, 3, s) + 1) * 2) % len(BOIS)], 0.56 + 0.09 * bruit(k, 7, s)


# ---------- le ponton ----------

def ponton(sens):
    """Le ponton, sens 'S', 'N', 'E' ou 'O' (vers où il part de la rive). Une image : le ponton, ses potelets, sa
    face et ses pieux vers nous ; MARGE px tout autour. Son pied (l'ancrage) : le coin haut gauche de sa culée
    (x, y en px dans l'image). → (image, (px, py))."""
    vertical = sens in ('S', 'N')
    lw, lh = (2 * T, LONG * T) if vertical else (LONG * T, 2 * T)
    W, H = lw + 2 * MARGE, lh + 2 * MARGE
    t = P.Toile(W, H)
    x0, y0 = MARGE, MARGE
    # la profondeur visible vers nous : au bout (S), le long du bas (E, O) ; vers le nord, sa culée (sur le sable)
    if sens == 'S':
        bas_deck = y0 + lh - FACE - PIEU                     # le dessus s'arrête là ; puis la face, puis les pieux
    elif sens == 'N':
        bas_deck = y0 + lh - FACE - 2
    else:
        bas_deck = y0 + lh - FACE - PIEU
    # le dessus : les planches en travers de la marche
    for y in range(y0, bas_deck):
        for x in range(x0, x0 + lw):
            u, v = x - x0, y - y0
            k, r = (v // LARGE, v % LARGE) if vertical else (u // LARGE, u % LARGE)
            R, b = planche(k, 21)
            fil = 0.04 * bruit(u // 3 if vertical else u, v if vertical else v // 3, 22 + k) + 0.03 * bruit(u, v, 23)
            c = b + fil
            if r == 0:
                c += 0.13                                    # l'arête éclairée de la planche
            elif r == LARGE - 1:
                c = 0.11 + 0.04 * bruit(u, v, 24)            # le joint, dans l'ombre
            elif r == LARGE - 2:
                c -= 0.06
            # la lumière en haut à gauche : un peu plus sombre vers la droite et le bas
            c -= 0.06 * (u / lw) + 0.03 * (v / lh)
            # les clous, sur les longerons (deux par moitié)
            if r == 1:
                q = u if vertical else v
                if q % 16 in (3, 12):
                    c = 0.84
                elif q % 16 in (4, 13):
                    c = 0.24
            t.put(x, y, ton(R, c))
    # ses bords : la gauche et le haut éclairés, la droite et le bas dans l'ombre
    for y in range(y0, bas_deck):
        for x, dk in ((x0, 0.14), (x0 + lw - 1, -0.20)):
            p = t.get(x, y)
            if p[3]:
                u, v = x - x0, y - y0
                k = v // LARGE if vertical else u // LARGE
                if (v if vertical else u) % LARGE != LARGE - 1:
                    R, b = planche(k, 21)
                    t.put(x, y, ton(R, b + dk + 0.03 * bruit(u, v, 25)))
    for x in range(x0, x0 + lw):
        u = x - x0
        k = 0 if vertical else u // LARGE
        if vertical or u % LARGE != LARGE - 1:
            R, b = planche(k, 21)
            t.put(x, y0, ton(R, b + 0.18))
    # la culée : son seuil de pierre côté terre (S : en haut ; E : à gauche ; O : à droite) ; vers le nord, la
    # culée est vers nous : la face de sa poutre posée sur le sable
    seuil(t, sens, x0, y0, lw, lh, bas_deck)
    # la face de la poutre de rive et les pieux, vers nous
    if sens in ('S', 'E', 'O'):
        face(t, x0, x0 + lw, bas_deck, pieux=True, cote=sens)
    else:
        face(t, x0, x0 + lw, bas_deck, pieux=False, cote=sens)
    # les potelets, le long des deux bords, sur l'eau (une case sur deux)
    potelets(t, sens, x0, y0, lw, lh, bas_deck)
    # les bittes d'amarrage, au bout
    bittes(t, sens, x0, y0, lw, lh, bas_deck)
    im = t.fini()
    # (l'ancrage : le coin haut gauche de la culée ; vers le nord, elle est en bas ; vers l'ouest, à droite)
    ax = x0 + (LONG - 1) * T if sens == 'O' else x0
    ay = y0 + (LONG - 1) * T if sens == 'N' else y0
    return im, (ax, ay)


def seuil(t, sens, x0, y0, lw, lh, bas_deck):
    """Le seuil de la culée : une bordure de pierres taillées vue de haut, côté terre, l'ombre des planches."""
    if sens == 'N':
        return
    if sens == 'S':
        zone = [(x, y) for y in range(y0, y0 + LARGE) for x in range(x0, x0 + lw)]
        long_axe = lambda x, y: x - x0  # noqa: E731
    elif sens == 'E':
        zone = [(x, y) for y in range(y0, bas_deck) for x in range(x0, x0 + LARGE)]
        long_axe = lambda x, y: y - y0  # noqa: E731
    else:
        zone = [(x, y) for y in range(y0, bas_deck) for x in range(x0 + lw - LARGE, x0 + lw)]
        long_axe = lambda x, y: y - y0  # noqa: E731
    for x, y in zone:
        q = long_axe(x, y)
        pierre = q // 8
        R = P.PIERRE[int((bruit(pierre, 1, 70) + 1) * 1.5) % 3]
        a = q % 8
        # chaque pierre biseautée : son haut et sa gauche clairs, son bas et sa droite sombres
        if sens == 'S':
            d = y - y0
            g = 0.74 - 0.10 * d + (0.10 if a == 0 else 0) - (0.16 if a == 7 else 0)
        else:
            d = x - (x0 if sens == 'E' else x0 + lw - LARGE)
            g = 0.72 - 0.06 * d + (0.12 if a == 0 else 0) - (0.18 if a == 7 else 0)
        g += 0.04 * bruit(x, y, 71) + 0.04 * bruit(pierre, 0, 72)
        t.put(x, y, ton(R, g))


def face(t, xa, xb, y, pieux, cote):
    """La face de la poutre de rive, de xa à xb, sous la rangée y du dessus ; puis (pieux) les pieux et l'ombre du
    ponton sur l'eau, sinon (le nord : la culée sur le sable) l'ombre sur le sable."""
    R = P.CHENE[2]
    for x in range(xa, xb):
        u = x - xa
        t.put(x, y, ton(R, 0.70 - 0.10 * u / (xb - xa) + 0.04 * bruit(u, 0, 27)))   # l'arête du dessus
        for dy in range(1, FACE):
            g = 0.38 - 0.10 * dy / FACE - 0.08 * u / (xb - xa) + 0.04 * bruit(u, dy, 28)
            if u % 8 == 1:
                g += 0.08                                                          # un boulon
            t.put(x, y + dy, ton(R, g))
    if not pieux:
        for x in range(xa, xb):
            t.put(x, y + FACE, ton(P.MOUILLE, 0.20 + 0.04 * bruit(x, 0, 29)), 120)
            t.put(x, y + FACE + 1, ton(P.MOUILLE, 0.30), 60)
        return
    # les pieux : ronds, le flanc gauche au soleil, mouillés puis verdis ; un tous les 8 px
    for xc in range(xa + 3, xb - 2, 8):
        for dy in range(FACE, FACE + PIEU):
            f = (dy - FACE) / PIEU
            for dx, tt in ((0, 0.62), (1, 0.42), (2, 0.22)):
                r = P.ALGUE if f > 0.5 else P.MOUILLE
                t.put(xc + dx, y + dy, ton(r, tt * (0.9 if f > 0.5 else 1.0) + 0.05 * bruit(xc + dx, dy, 30)))
    # l'ombre du ponton sur l'eau, entre les pieux (translucide : l'eau du jeu se voit dessous)
    for x in range(xa, xb):
        for dy in range(FACE, FACE + PIEU):
            if 0 <= y + dy < t.h and not t.get(x, y + dy)[3]:
                t.put(x, y + dy, ton(P.EAU, 0.05 + 0.04 * (dy - FACE) / PIEU), 100 - 20 * (dy - FACE))


def potelet(t, cx, ytop, ybas_eau, s):
    """Un potelet : sa tête ronde vue de dessus en ytop, son fût (3 px de large, le flanc gauche éclairé), mouillé
    puis verdi sous la ligne d'eau (ybas_eau - 3), un rond d'eau sombre à son pied."""
    R = P.CHENE[s % 3]
    for dx, g in ((-1, 0.80), (0, 0.68), (1, 0.48)):            # la tête, vue de dessus
        t.put(cx + dx, ytop, ton(R, g + 0.03 * bruit(cx, dx, 80 + s)))
    t.put(cx, ytop - 1, ton(R, 0.86))
    t.put(cx - 1, ytop - 1, OUT)
    t.put(cx + 1, ytop - 1, OUT)
    eau = ybas_eau - 3
    for y in range(ytop + 1, ybas_eau):
        for dx, tt in ((-1, 0.58), (0, 0.40), (1, 0.20)):
            if y < eau:
                c = ton(R, tt + 0.04 * bruit(cx + dx, y, 81 + s) - 0.10 * (y - ytop) / max(1, eau - ytop))
            else:
                f = (y - eau) / 3
                c = ton(P.ALGUE if f > 0.4 else P.MOUILLE, tt + 0.08 + 0.04 * bruit(cx + dx, y, 82 + s))
            t.put(cx + dx, y, c)
    # le rond d'eau sombre autour du pied
    vide = lambda x, y: 0 <= x < t.w and 0 <= y < t.h and not t.get(x, y)[3]  # noqa: E731
    for dx in range(-3, 4):
        x = cx + dx
        if vide(x, ybas_eau):
            t.put(x, ybas_eau, ton(P.EAU, 0.10), 110 - 18 * abs(dx))
        if abs(dx) == 2 and vide(x, ybas_eau - 1):
            t.put(x, ybas_eau - 1, ton(P.EAU, 0.08), 70)


def potelets(t, sens, x0, y0, lw, lh, bas_deck):
    """Les potelets le long des deux bords, sur l'eau : une case sur deux, des cases 1 à 7 (la culée n'en a pas)."""
    ks = (2, 4, 6, 7)
    if sens in ('S', 'N'):
        for k in ks:
            kk = k if sens == 'S' else LONG - 1 - k
            yc = y0 + kk * T + T // 2
            if sens == 'S' and k == LONG - 1:
                yc = bas_deck - 3
            if sens == 'N' and k == LONG - 1:
                yc = y0 + 3
            for cx in (x0 - 2, x0 + lw + 1):
                potelet(t, cx, yc - TETE, yc + 7, k + (cx > x0))
    else:
        for k in ks:
            kk = k if sens == 'E' else LONG - 1 - k
            xc = x0 + kk * T + T // 2
            if sens == 'E' and k == LONG - 1:
                xc = x0 + lw - 3
            if sens == 'O' and k == LONG - 1:
                xc = x0 + 2
            # le bord du haut : la tête seule dépasse (le fût passe derrière le ponton)
            potelet(t, xc, y0 - TETE + 1, y0 + 1, k)
            # le bord du bas, devant la face : tout le fût, jusque dans l'eau
            potelet(t, xc, bas_deck - TETE + 1, bas_deck + FACE + PIEU + 1, k + 7)


def bittes(t, sens, x0, y0, lw, lh, bas_deck):
    """Deux bittes d'amarrage de fer près du bout : leur tête vue de dessus, leur corps, leur ombre."""
    if sens == 'S':
        places = [(x0 + 3, bas_deck - 8), (x0 + lw - 7, bas_deck - 8)]
    elif sens == 'N':
        places = [(x0 + 3, y0 + 5), (x0 + lw - 7, y0 + 5)]
    elif sens == 'E':
        places = [(x0 + lw - 9, y0 + 4), (x0 + lw - 9, bas_deck - 9)]
    else:
        places = [(x0 + 5, y0 + 4), (x0 + 5, bas_deck - 9)]
    for bx, by in places:
        for y in range(by, by + 4):
            for x in range(bx, bx + 4):
                u = (x - bx) / 3
                c = ton(P.FER, 0.76 - 0.30 * u) if y == by else ton(P.FER, 0.48 - 0.32 * u - 0.05 * (y - by))
                t.put(x, y, c)
        for x in range(bx, bx + 4):
            t.put(x, by - 1, OUT)
            t.put(x, by + 4, ton(BOIS[0], 0.18))
        t.put(bx - 1, by, OUT)
        t.put(bx + 4, by, OUT)


# ---------- la halle ----------

HAUT_SOL = 2                               # le plancher de la halle, surélevé de 2 px (sa face avant)


def halle_sol():
    """Le plancher de la halle, 3 × 3 cases : des planches de chêne dans la longueur (4 px, chacune sa nuance),
    la gauche et le haut éclairés, l'occlusion le long des bords ; sa face avant (HAUT_SOL px). 48 × 50, le pied
    au bas de la face."""
    w, h = 3 * T, 3 * T + HAUT_SOL
    t = P.Toile(w, h)
    for y in range(3 * T):
        for x in range(w):
            k, r = y // LARGE, y % LARGE
            seg = (x + 13 * k) // 24                           # les planches aboutées, décalées d'un rang à l'autre
            R = P.CHENE[int((bruit(k, seg, 90) + 1) * 1.5) % 3]
            g = 0.58 + 0.07 * bruit(k, seg, 91) + 0.03 * bruit(x // 3, k, 92) + 0.02 * bruit(x, y, 93)
            if r == 0:
                g += 0.10
            elif r == LARGE - 1:
                g = 0.16 + 0.04 * bruit(x, y, 94)
            if (x + 13 * k) % 24 == 0:
                g = 0.20                                       # le joint d'about
            g -= 0.08 * x / w + 0.04 * y / h
            # l'occlusion le long des bords (sous les poteaux et le toit, un peu plus sombre au fond)
            d = min(x, w - 1 - x, y)
            if d < 3:
                g -= 0.06 * (3 - d)
            if x == 0 and r != LARGE - 1:
                g += 0.10
            t.put(x, y, ton(R, g))
    for x in range(w):
        for dy in range(HAUT_SOL):
            t.put(x, 3 * T + dy, ton(P.CHENE[2], 0.36 - 0.10 * dy - 0.10 * x / w + 0.03 * bruit(x, dy, 95)))
    return t.fini(), (w // 2, h)


DEBORD = 5                                 # le toit déborde de 5 px tout autour
HAUT_POTEAU = 44                           # le haut des poteaux, au-dessus de leur pied (le toit y repose)
PENTE = 14                                 # la hauteur du faîtage au-dessus de l'égout, vue (px)


def dans(px, py, poly):
    """Le point (px, py) est-il dans le polygone convexe ou non `poly` (règle pair-impair) ?"""
    n, ok = len(poly), False
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
            ok = not ok
    return ok


def halle_toit():
    """Le toit de la halle, à croupes, couvert de bardeaux de bois gris, posé sur ses quatre poteaux : le pan de
    devant face à nous, celui de derrière en raccourci (une bande claire), les deux croupes (la gauche dans la
    lumière, la droite à l'ombre), le faîtage, l'égout et sa planche de rive. Son rectangle d'égout couvre les
    poteaux (2 cases d'écart entre ceux du devant et ceux du fond, la largeur de la halle) et déborde de DEBORD px.
    Son pied : le bas de l'égout, au milieu (posé HAUT_POTEAU - DEBORD px au-dessus du pied des poteaux de devant).
    → (image, (px, py))."""
    L = 3 * T + 2 * DEBORD
    Pr = 2 * T + 2 * DEBORD
    w, h = L + 2, Pr + PENTE + 6
    t = P.Toile(w, h)
    eg = h - 4                                 # l'égout de devant
    ar = eg - Pr                               # l'égout du fond
    yf = (eg + ar) // 2 - PENTE                # le faîtage
    if yf < ar + 4:
        yf = ar + 4
    xa, xb = 1, w - 2
    xf0, xf1 = xa + Pr // 2, xb - Pr // 2
    pans = {
        'derriere': [(xa, ar), (xb, ar), (xf1, yf), (xf0, yf)],
        'devant': [(xf0, yf), (xf1, yf), (xb, eg), (xa, eg)],
        'gauche': [(xa, ar), (xf0, yf), (xa, eg)],
        'droite': [(xb, ar), (xb, eg), (xf1, yf)],
    }
    ombre = {'devant': 1.0, 'derriere': 1.15, 'gauche': 1.10, 'droite': 0.74}
    for y in range(h):
        for x in range(w):
            pan = next((k for k, poly in pans.items() if dans(x + 0.5, y + 0.5, poly)), None)
            if not pan:
                continue
            # les rangs de bardeaux (4 px), parallèles à l'égout de leur pan ; décalés d'un rang à l'autre
            if pan == 'devant':
                v = eg - y
                q = x
            elif pan == 'derriere':
                v = (y - ar) * 2
                q = x
            elif pan == 'gauche':
                v = x - xa
                q = y
            else:
                v = xb - x
                q = y
            rang = int(v) // 4
            qq = q + (rang % 2) * 3
            bard = qq // 6
            R = BARDEAU[int((bruit(rang, bard, 100) + 1) * 2) % 4]
            g = 0.58 + 0.08 * bruit(rang, bard, 101) + 0.03 * bruit(x, y, 102)
            r = int(v) % 4
            if r == 0:
                g -= 0.20                                   # le bas du bardeau : l'ombre du rang qui le recouvre
            elif r == 3:
                g += 0.06
            if qq % 6 == 0:
                g -= 0.10                                   # le joint entre deux bardeaux
            g *= ombre[pan]
            if pan == 'devant':
                g -= 0.06 * (y - yf) / max(1, eg - yf)      # un peu plus sombre vers l'égout (froid)
            t.put(x, y, ton(R, max(0.05, min(0.97, g))))
    # le faîtage : des bardeaux posés à cheval, clairs dessus, leur ombre dessous
    for x in range(xf0 - 1, xf1 + 2):
        u = (x - xf0) / max(1, xf1 - xf0)
        t.put(x, yf - 1, ton(BARDEAU[1], 0.88 - 0.16 * u))
        t.put(x, yf, ton(BARDEAU[1], 0.70 - 0.16 * u))
        t.put(x, yf + 1, ton(BARDEAU[1], 0.30 - 0.08 * u))
    # les arêtiers : un trait clair (à gauche) ou sombre (à droite)
    for (xs, ys), (xe, ye), c in (((xf0, yf), (xa, ar), 0.86), ((xf0, yf), (xa, eg), 0.80), ((xf1, yf), (xb, ar), 0.40), ((xf1, yf), (xb, eg), 0.26)):
        n = max(abs(xe - xs), abs(ye - ys))
        for k in range(n + 1):
            t.put(round(xs + (xe - xs) * k / n), round(ys + (ye - ys) * k / n), ton(BARDEAU[0], c))
    # l'égout : la planche de rive sous le pan de devant (claire à gauche, à l'ombre à droite)
    for x in range(xa, xb + 1):
        u = (x - xa) / (xb - xa)
        t.put(x, eg + 1, ton(P.CHENE[1], 0.66 - 0.26 * u + 0.03 * bruit(x, 0, 103)))
        t.put(x, eg + 2, ton(P.CHENE[1], 0.38 - 0.16 * u))
    im = t.fini()
    return im, (w // 2, eg + 3)


# ---------- la planche ----------

def images():
    """Les images, dans l'ordre de la planche : {nom: (image, pied)}."""
    poteau, comptoir = P.poteau_halle(), P.comptoir()
    out = {f'ponton_{s}': ponton(s) for s in ('S', 'N', 'E', 'O')}
    out['halle_sol'] = halle_sol()
    out['halle_poteau'] = poteau
    out['halle_comptoir'] = comptoir
    out['halle_toit'] = halle_toit()
    return out


def couleurs(im):
    b = im.convert('RGBA').tobytes()
    return len({b[k:k + 3] for k in range(0, len(b), 4) if b[k + 3] == 255})


def ecrire_planche(im):
    """Range les images de gauche à droite sur des rangées ; écrit assets/port_ile.png et port_ile.json."""
    largeur = 256
    table, places, x, y, hl = {}, [], 0, 0, 0
    for nom, (i, pied) in im.items():
        w, h = i.size
        if x + w > largeur:
            x, y, hl = 0, y + hl + 1, 0
        table[nom] = [x, y, w, h, pied[0], pied[1]]
        places.append((i, x, y))
        x += w + 1
        hl = max(hl, h)
    pl = Image.new('RGBA', (largeur, y + hl), (0, 0, 0, 0))
    for i, xx, yy in places:
        pl.alpha_composite(i, (xx, yy))
    pl.save(os.path.join(ASSETS, 'port_ile.png'))
    with open(os.path.join(ASSETS, 'port_ile.json'), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/port_ile.png : {pl.width} × {pl.height}')


def apercu(im):
    """Les quatre ports montés sur de l'eau et de l'herbe (la halle à côté du pied du ponton), agrandis ×3."""
    vues = []
    for s in ('S', 'N', 'E', 'O'):
        # la scène : 16 × 14 cases ; la rive au milieu, l'eau du côté du ponton
        C, Rg = 16, 14
        f = Image.new('RGBA', (C * T, Rg * T))
        px = f.load()
        if s == 'S':
            rx, ry = 7, 3                                    # la culée (case gauche du ponton)
        elif s == 'N':
            rx, ry = 7, 10
        elif s == 'E':
            rx, ry = 4, 6
        else:
            rx, ry = 11, 6
        for yy in range(Rg * T):
            for xx in range(C * T):
                c, r = xx // T, yy // T
                eau = (s == 'S' and r > ry) or (s == 'N' and r < ry) or (s == 'E' and c > rx) or (s == 'O' and c < rx)
                g = bruit(xx // 2, yy // 2, 5)
                px[xx, yy] = (52 + int(8 * g), 104 + int(8 * g), 146 + int(6 * g), 255) if eau else (98 + int(10 * g), 142 + int(10 * g), 66 + int(6 * g), 255)
        pi, (ax, ay) = im[f'ponton_{s}']
        f.alpha_composite(pi, (rx * T - ax, ry * T - ay))
        # la halle : 3 × 3 cases à côté du pied, sur la terre
        if s == 'S':
            hx, hy = rx - 3, ry - 2
        elif s == 'N':
            hx, hy = rx - 3, ry
        elif s == 'E':
            hx, hy = rx - 2, ry - 3
        else:
            hx, hy = rx, ry - 3
        si, (spx, spy) = im['halle_sol']
        f.alpha_composite(si, (hx * T + 24 - spx, (hy + 3) * T - spy + HAUT_SOL))
        po, (ppx, ppy) = im['halle_poteau']
        co, (cpx, cpy) = im['halle_comptoir']
        dessins = [(po, hx * T + 8 - ppx, (hy + 1) * T - ppy, (hy + 1) * T), (po, (hx + 2) * T + 8 - ppx, (hy + 1) * T - ppy, (hy + 1) * T),
                   (co, hx * T + 24 - cpx, (hy + 2) * T - cpy, (hy + 2) * T),
                   (po, hx * T + 8 - ppx, (hy + 3) * T - ppy, (hy + 3) * T), (po, (hx + 2) * T + 8 - ppx, (hy + 3) * T - ppy, (hy + 3) * T)]
        for i, x, y, _ in sorted(dessins, key=lambda d: d[3]):
            f.alpha_composite(i, (x, y))
        toit, (tpx, tpy) = im['halle_toit']
        toit_seul = f.copy()
        toit_seul.alpha_composite(toit, (hx * T + 24 - tpx, (hy + 3) * T - HAUT_POTEAU + DEBORD - tpy))
        vues.append(toit_seul)
        vues.append(f)
    W2, H2 = vues[0].size
    out = Image.new('RGBA', (W2 * 4 + 12, H2 * 2 + 4), (20, 20, 24, 255))
    for k, v in enumerate(vues):
        out.alpha_composite(v, ((k // 2) * (W2 + 4), (k % 2) * (H2 + 4)))
    out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
    out.save(os.path.join(ROOT, 'apercu_port_ile.png'))
    print('apercu_port_ile.png écrit')


def main():
    im = images()
    ecrire_planche(im)
    print('Les couleurs opaques de chaque dessin :')
    for nom, (i, _) in im.items():
        print(f'  {nom} : {couleurs(i)}')
    if '--apercu' in sys.argv:
        apercu(im)


if __name__ == '__main__':
    main()
