# La mercerie (le chantier « l'île à bâtir », fiche I5b : data/recipes.json ATELIER.BLOCS rouet_metier, enseigne_mercerie ;
# le moteur : js/engine/artisans.js ; le comptoir est celui de la forge, scripts/batiments/forge.py). Deux dessins, vus de
# haut à 45° (CLAUDE.md ; la projection de scripts/carte/blocs.py : une hauteur de h px sur h × 14/16 rangées, une
# profondeur de p px sur p × 10/16) ; le bas de l'image est le bas de la case, ce qui monte empiète sur la case du
# dessus ; la lumière en haut à gauche, un contour sombre d'un pixel ; pas d'ombre portée (des blocs de la ferme : la
# scène peint celle du soleil).
#
#   - le rouet et le métier à tisser (l'établi de la mercerie, dans la pièce ; deux cases de large, 32 × 46) :
#       à gauche, le métier à tisser : ses montants de frêne (la face gauche au jour, la droite dans l'ombre), sa
#       traverse du haut (son dessus raccourci) où sèchent quatre écheveaux teints (rouge, bleu, moutarde, vert : les
#       tons exacts de data/meubles.json PALETTES tissu_*), les lames et leurs lisses de fer ; la nappe de la chaîne,
#       un plan horizontal vu d'en haut (les fils clairs, la navette posée dessus), la toile déjà tissée vers l'avant
#       (son armure, plus claire vers l'avant), la poitrinière (son dessus, sa face) ; dessous, dans l'ombre, l'ensouple
#       où s'enroule la toile et les pédales au sol (le fond plus clair vers l'avant, la paroi gauche éclairée) ;
#       à droite, le rouet de noyer : le banc (son dessus, sa face, ses pieds), la grande roue debout dont on voit le
#       dessus de la jante, ses six rayons, le moyeu, la manivelle et la bielle jusqu'à la pédale ; l'épinglier et sa
#       bobine de fil ; la quenouille et son nuage de laine ;
#       au repos (rouet_metier) : la roue arrêtée ; le commerce ouvert (rouet_metier_0 à _3, que la carte fait défiler :
#       BLOCS_CARTE.commerces) : la roue tourne (ses rayons d'un quart de rayon par image), la bielle et la pédale suivent
#       la manivelle, l'épinglier tourne, le fil file de la quenouille à la bobine ;
#   - l'enseigne de la mercerie (dehors, près de la porte, deux cases de large, 32 × 46) : le poteau de chêne sur son
#       socle de pierre (le dessus de chacun), la potence de fer forgé et sa volute (celles de l'enseigne du forgeron), la
#       pelote de laine découpée, piquée de deux aiguilles, qui la coiffe ; la planche pendue à ses chaînes (sa tranche du
#       dessus raccourcie, sa face claire où la scène écrit le nom du commerce : chantier.js stepEnseignes,
#       BLOCS_CARTE.enseigne « commerce », au même endroit que sur celle du forgeron), une bobine et son aiguille peintes
#       sous le nom.
#
#   python3 scripts/batiments/mercerie.py            écrit assets/meuble_rouet_metier.png, _0 à _3,
#                                                    meuble_enseigne_mercerie.png (et compte leurs couleurs)
#   python3 scripts/batiments/mercerie.py --apercu D écrit aussi D/apercu_mercerie.png (agrandi, sur le plancher et l'herbe)
import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402
from forge import CHENE, FONTE, NOIR, OUT, PIERRES, Toile, couleurs  # noqa: E402

ROOT = os.path.join(HERE, '..', '..')
PALETTES = json.load(open(os.path.join(ROOT, 'data', 'meubles.json'), encoding='utf-8'))['PALETTES']


def hexa(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


# ---------- les matières : des rampes proches, qui glissent du froid (l'ombre) au chaud (la lumière) ----------

FRENE = [rampe([(36, 28, 34), (76, 60, 54), (122, 98, 74), (166, 136, 98), (204, 174, 128), (234, 210, 166)], 160),
         rampe([(34, 30, 38), (72, 62, 60), (116, 100, 80), (160, 138, 104), (200, 176, 134), (232, 212, 172)], 160),
         rampe([(40, 28, 30), (82, 58, 48), (128, 96, 66), (172, 134, 90), (210, 172, 120), (238, 208, 158)], 160)]
NOYER = [rampe([(22, 14, 22), (50, 30, 32), (84, 52, 42), (120, 78, 54), (158, 108, 72), (196, 144, 98)], 160),
         rampe([(20, 16, 26), (46, 34, 38), (80, 56, 48), (116, 82, 62), (154, 114, 82), (190, 150, 108)], 160)]
LAINE = rampe([(92, 90, 108), (138, 132, 142), (180, 172, 170), (214, 204, 190), (238, 228, 206), (252, 244, 222)], 160)
TOILE = [rampe([(78, 72, 82), (124, 114, 112), (168, 154, 138), (204, 190, 164), (228, 216, 188), (244, 236, 210)], 140),
         rampe([(72, 70, 86), (118, 112, 118), (162, 152, 144), (198, 188, 170), (224, 214, 192), (242, 234, 214)], 140)]
CHAINE = rampe([(98, 94, 108), (150, 142, 146), (196, 186, 176), (232, 222, 200), (250, 242, 224)], 120)
LISSE = rampe([(20, 22, 32), (52, 56, 68), (92, 96, 106), (140, 144, 148), (192, 194, 190)], 100)
OMBRE = rampe([(12, 10, 18), (26, 22, 30), (44, 36, 42), (64, 52, 54), (88, 72, 66)], 100)
PEINTURE = rampe([(60, 40, 56), (110, 78, 96), (162, 122, 136), (206, 168, 170), (236, 206, 196), (250, 234, 222)], 140)
# les écheveaux : les tons exacts des tissus (data/meubles.json PALETTES, neuf tons chacun, du sombre au clair)
ECHEVEAUX = [[hexa(c) for c in PALETTES[k]] for k in ('tissu_rouge', 'tissu_bleu', 'tissu_moutarde', 'tissu_vert')]

EW, EH = 32, 46


def montant(t, x0, x1, y0, y1, R, graine, pied=True):
    """Un montant de bois (une face) : la gauche au jour, la droite dans l'ombre, le fil, plus sombre au pied."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            g = (y - y0) / max(1, y1 - y0)
            lum = 0.70 - 0.38 * u + 0.04 * bruit(x, y // 2, graine) - 0.05 * ((y * 3 + x + graine) % 7 == 0)
            if pied:
                lum -= 0.16 * g * g
            t.put(x, y, ton(R, lum))


def traverse(t, x0, x1, ydessus, yface, R, graine):
    """Une traverse : son dessus (le plus clair, plus clair vers l'avant), sa face (plus sombre en bas)."""
    for y in range(ydessus, yface[1] + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            if y < yface[0]:
                lum = 0.84 + 0.06 * (y - ydessus) - 0.22 * u + 0.03 * bruit(x, y, graine)
            else:
                lum = 0.52 - 0.12 * (y - yface[0]) - 0.24 * u + 0.04 * bruit(x // 2, y, graine + 1)
            if x == x0:
                lum += 0.08
            if x == x1:
                lum -= 0.10
            t.put(x, y, ton(R, lum))


# ---------- le métier à tisser (x 1 à 16) ----------
# le château (les montants du fond, x 2-3 et 14-15, de la traverse du haut, y 11-13, au sol du fond, y 36) ; la nappe
# de la chaîne, à 12 px du sol : un plan vu d'en haut de y 27 (le fond, 12 px de profondeur : 7 rangées) à y 33 ; la
# poitrinière, y 33 (dessus) à 36 (face) ; les montants de devant, x 1-2 et 15-16, de y 33 au sol, y 45.

def metier(t):
    # le dessous, entre les montants de devant : l'ombre de l'intérieur (le sol plus clair vers l'avant, la paroi
    # gauche éclairée, la droite dans l'ombre), sous la nappe
    for y in range(37, 46):
        for x in range(3, 15):
            v = (y - 37) / 8
            lum = 0.18 + 0.42 * v - 0.12 * (x - 3) / 11 + 0.03 * bruit(x, y, 101)
            if x == 3:
                lum += 0.16                                         # la paroi gauche, au jour
            if x == 14:
                lum -= 0.08                                         # la droite, dans l'ombre
            t.put(x, y, ton(OMBRE, lum))
    # l'ensouple de devant (la toile enroulée, sous la poitrinière) : un rouleau, son dessus clair
    for y in range(37, 40):
        for x in range(3, 15):
            u = (x - 3) / 11
            lum = (0.62, 0.48, 0.30)[y - 37] - 0.22 * u + 0.04 * bruit(x, y, 103)
            t.put(x, y, ton(TOILE[0], lum))
    # les deux pédales au sol, leur dessus (plus clair vers l'avant), leur tranche
    for k, (xa, xb) in enumerate(((4, 8), (10, 13))):
        for y in (42, 43, 44):
            for x in range(xa, xb + 1):
                u = (x - xa) / max(1, xb - xa)
                lum = (0.50 + 0.12 * (y - 42) if y < 44 else 0.30) - 0.20 * u + 0.03 * bruit(x, y, 105 + k)
                t.put(x, y, ton(FRENE[k], lum))
    # les montants du fond (le château), derrière la nappe
    for k, (xa, xb) in enumerate(((2, 3), (14, 15))):
        montant(t, xa, xb, 13, 32, FRENE[(k + 1) % 3], 107 + k, pied=False)
    # les lames et leurs lisses (y 16 à 25) : deux barres, les fils de fer
    for x in range(4, 14):
        for y in range(16, 26):
            if y in (16, 25):
                t.put(x, y, ton(FRENE[2], 0.62 - 0.26 * (x - 4) / 9 + 0.03 * bruit(x, y, 109)))
            elif y in (17, 24):
                t.put(x, y, ton(FRENE[2], 0.34 - 0.14 * (x - 4) / 9))
            elif x % 2 == 0:
                g = (y - 17) / 7
                t.put(x, y, ton(LISSE, 0.70 - 0.30 * (x - 4) / 9 - 0.10 * g + 0.05 * bruit(x, y, 111)))
            else:
                t.put(x, y, ton(OMBRE, 0.30 + 0.12 * (y - 17) / 7 + 0.04 * bruit(x, y, 113)))
    # la traverse du haut (son dessus, y 11 ; sa face, y 12-13), qui déborde un peu les montants
    traverse(t, 1, 16, 11, (12, 13), FRENE[0], 115)
    # quatre écheveaux teints, jetés sur la traverse : chacun une boucle tordue qui pend, les tons exacts de sa
    # couleur (la gauche au jour, la droite dans l'ombre, la torsade, plus sombre au creux)
    for k, x0 in enumerate((4, 7, 10, 13)):
        P = ECHEVEAUX[k]
        long = 7 + (k % 2)
        for dy in range(0, long):
            y = 10 + dy
            for dx in range(0, 3):
                x = x0 + dx - (1 if k == 3 and dx == 2 else 0)
                if dy == 0 and dx != 1:
                    continue                                        # le haut arrondi, sur la traverse
                tors = (dx + dy + k) % 3 == 0
                lum = 0.80 - 0.32 * dx - 0.08 * dy / long + (-0.14 if tors else 0.06) + 0.05 * bruit(x, y, 117 + k)
                if dy >= long - 2:
                    lum -= 0.16                                     # le bas de la boucle, dans son ombre
                if dy == 1:
                    lum += 0.10                                     # le dessus, sur la traverse, au jour
                t.put(x, y, P[max(0, min(8, round(lum * 8)))])
        t.put(x0 + 1, 10 + long, P[1])                              # le bout de la torsade
    # la nappe de la chaîne, vue d'en haut (y 26 à 30) : les fils clairs, l'ombre des lames au fond ; la navette posée
    for y in range(26, 31):
        for x in range(3, 15):
            v = (y - 26) / 4
            fil = x % 2 == 1
            lum = (0.46 + 0.36 * v if fil else 0.22 + 0.20 * v) - 0.14 * (x - 3) / 11 + 0.03 * bruit(x, y, 119)
            t.put(x, y, ton(CHAINE if fil else OMBRE, lum))
    for x in range(5, 12):                                          # la navette : son dessus poli, sa tranche, sa canette
        u = (x - 5) / 6
        t.put(x, 28, ton(NOYER[0], 0.88 - 0.30 * u))
        t.put(x, 29, ton(NOYER[0], 0.44 - 0.18 * u))
    t.put(8, 28, ton(LAINE, 0.9)); t.put(9, 28, ton(LAINE, 0.76))
    # la toile déjà tissée (y 31 à 33) : l'armure (un point sur deux décalé), plus claire vers l'avant
    for y in range(31, 34):
        for x in range(3, 15):
            v = (y - 31) / 2
            point = (x + y) % 2 == 0
            lum = 0.58 + 0.30 * v - 0.18 * (x - 3) / 11 + (0.06 if point else -0.06) + 0.03 * bruit(x, y, 121)
            t.put(x, y, ton(TOILE[(x // 4) % 2], lum))
    # la poitrinière : son dessus (y 34), sa face (y 35-36) ; les montants de devant, au sol
    traverse(t, 1, 16, 34, (35, 36), FRENE[1], 123)
    for k, (xa, xb) in enumerate(((1, 2), (15, 16))):
        montant(t, xa, xb, 37, 45, FRENE[(k + 2) % 3], 125 + k)
    # les montants du fond, au-dessus de la traverse : leurs têtes (le dessus de chacune)
    for xa in (2, 14):
        t.put(xa, 10, ton(FRENE[0], 0.92)); t.put(xa + 1, 10, ton(FRENE[0], 0.74))


# ---------- le rouet (x 17 à 30) ----------
# le banc de noyer : son dessus (y 35 à 38 : 6 px de profondeur), sa face (y 39-40), ses pieds jusqu'au sol (y 45) ; la
# grande roue debout au fond du banc (son centre x 25, y 27 ; 6,5 px de rayon, 5,7 rangées en hauteur) ; l'épinglier
# et sa bobine à gauche (x 18 à 22, y 30 à 34) ; la quenouille (x 20) et son nuage de laine (y 12 à 21).

RX, RY, RR = 25, 27, 6.6


def rouet(t, f, tourne):
    a0 = math.radians(15 * f)                                       # (six rayons : un tour en quatre images d'un quart)
    # la quenouille, au fond à gauche : sa tige, puis son nuage de laine (des mèches, plus claires en haut à gauche)
    for y in range(18, 35):
        t.put(20, y, ton(NOYER[1], 0.62 - 0.2 * (y - 18) / 16))
        t.put(21, y, ton(NOYER[1], 0.32 - 0.1 * (y - 18) / 16))
    for y in range(11, 23):
        for x in range(16, 25):
            e = ((x - 20.2) / 3.8) ** 2 + ((y - 16.6) / 5.1) ** 2 + 0.10 * bruit(x, y, 131)
            if e > 1:
                continue
            # (le nuage modelé : clair en haut à gauche, froid en bas à droite ; des mèches en spirale autour de la
            # tige, chacune son creux et son reflet)
            lum = 0.86 - 0.40 * (x - 16) / 8 - 0.26 * (y - 11) / 11 - 0.20 * e + 0.06 * bruit(x * 2, y * 3, 133)
            meche = (x * 2 + y * 3) % 7
            if meche == 0:
                lum -= 0.16
            elif meche == 1:
                lum += 0.08
            t.put(x, y, ton(LAINE, lum))
    for y in range(11, 23):
        t.put(20, y, ton(NOYER[1], 0.5)) if (y % 4 == 0) else None   # la tige, entre les mèches
    # le dos du banc (sa moitié du fond, derrière la roue)
    for y in range(35, 37):
        for x in range(17, 31):
            u = (x - 17) / 13
            t.put(x, y, ton(NOYER[0], 0.66 + 0.08 * (y - 35) - 0.26 * u + 0.03 * bruit(x, y, 135)))
    # les deux montants de la roue, du banc au moyeu (derrière la roue)
    for x in (24, 26):
        for y in range(RY, 36):
            t.put(x, y, ton(NOYER[1], (0.48 if x == 24 else 0.26) - 0.1 * (y - RY) / 9))
    # la grande roue : la jante (son dessus au jour sur l'arc du haut, sa face), les six rayons, le moyeu ; entre les
    # rayons, on voit à travers (des jours, rendus transparents après le contour : t.jours)
    ry = RR * 14 / 16
    for y in range(int(RY - ry) - 2, int(RY + ry) + 2):
        for x in range(int(RX - RR) - 1, int(RX + RR) + 2):
            dx, dy = (x - RX) / RR, (y - RY) / ry
            d = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            if 0.84 <= d <= 1.06:
                # la jante : plus claire en haut à gauche ; le dessus de la jante (sa tranche, vue d'en haut) sur l'arc
                # du haut, plus clair encore ; dessous, dans l'ombre
                lum = 0.60 - 0.16 * dx - 0.20 * dy + 0.04 * bruit(x, y, 137)
                if dy < -0.30 and d >= 0.96:
                    lum += 0.20
                if dy > 0.55:
                    lum -= 0.12
                if d < 0.92:
                    lum -= 0.30                                     # le bord intérieur de la jante, dans son ombre
                t.put(x, y, ton(FRENE[2], lum))
            elif 0.24 < d < 0.84:
                # les rayons : à six, tournés de a0 ; fins, le bord du jour plus clair ; entre eux, un jour
                k = (ang - a0) % (math.pi / 3)
                ecart = min(k, math.pi / 3 - k) * d * RR
                if ecart < 0.55:
                    lum = 0.74 - 0.22 * dx - 0.14 * dy + 0.04 * bruit(x, y, 139)
                    t.put(x, y, ton(FRENE[1], lum))
                else:
                    t.jours.add((x, y))
            elif d <= 0.24:
                t.put(x, y, ton(NOYER[0], 0.76 - 0.3 * (dx + dy)))  # le moyeu
    t.put(RX, RY, ton(FONTE, 0.85))                                 # l'axe
    # la manivelle et la bielle : de l'axe à la pédale (la manivelle tourne avec la roue)
    cx, cy = RX + round(2.2 * math.cos(a0 * 4)), RY + round(1.9 * math.sin(a0 * 4))
    t.put(cx, cy, ton(FONTE, 0.6))
    py = 43 + (1 if math.sin(a0 * 4) > 0.3 else 0)
    for k in range(0, 12):
        x = round(cx + (23 - cx) * k / 11)
        y = round(cy + (py - cy) * k / 11)
        if y > 36:
            t.put(x, y, ton(NOYER[1], 0.40 - 0.1 * k / 11))
    # l'épinglier et sa bobine (à gauche du banc) : les deux bras en U, la bobine de fil, la courroie vers la roue
    for y in range(30, 35):
        t.put(18, y, ton(NOYER[0], 0.62)); t.put(22, y, ton(NOYER[0], 0.30))
    bob = (0, 1, 0, 1)[f] if tourne else 0
    for y in range(31, 34):
        for x in range(19, 22):
            fil = (x + y + bob) % 2 == 0
            t.put(x, y, ton(LAINE, (0.86 if fil else 0.66) - 0.16 * (x - 19) / 2 - 0.08 * (y - 31) / 2))
    for x in range(18, 23):
        t.put(x, 29, ton(NOYER[0], 0.80 - 0.1 * (x - 18)))         # le dessus de l'épinglier
    for k in range(0, 5):                                           # la courroie, de la gorge de la roue à la bobine
        t.put(round(22 + k * (RX - RR - 22 + 1) / 4), 32 - k // 3, ton(CHAINE, 0.4))
    # le fil qui file, de la quenouille à l'orifice (le commerce ouvert : il ondule)
    if tourne:
        for k in range(0, 9):
            x = 19 - (k // 4)
            y = 21 + k
            if (k + f) % 4 != 0:
                t.put(x if k < 8 else 18, y, ton(LAINE, 0.98 - 0.02 * k))
    # le devant du banc : son dessus (y 37-38, plus clair vers l'avant), sa face (y 39-40), ses pieds
    for y in range(37, 41):
        for x in range(17, 31):
            u = (x - 17) / 13
            if y <= 38:
                lum = 0.80 + 0.06 * (y - 37) - 0.26 * u + 0.03 * bruit(x, y, 141)
            else:
                lum = 0.44 - 0.12 * (y - 39) - 0.24 * u + 0.04 * bruit(x // 2, y, 143)
            if x == 17:
                lum += 0.08
            if x == 30:
                lum -= 0.10
            t.put(x, y, ton(NOYER[0], lum))
    for xa in (18, 28):
        montant(t, xa, xa + 1, 41, 45, NOYER[1], 145 + xa)
    # la pédale au sol (son dessus, sa tranche), sous le banc
    for x in range(21, 27):
        u = (x - 21) / 5
        t.put(x, py, ton(NOYER[1], 0.58 - 0.2 * u))
        t.put(x, py + 1, ton(NOYER[1], 0.30 - 0.1 * u))


def rouet_metier(f=0, tourne=False):
    t = Toile(EW, EH)
    t.jours = set()
    metier(t)
    rouet(t, f, tourne)
    im = contour(t.im, OUT)
    # (les jours de la roue : on voit à travers, entre les rayons ; peints par-dessus ensuite, ils restent peints)
    px = im.load()
    for (x, y) in t.jours:
        if 0 <= x < EW and 0 <= y < EH and t.px[x, y][3] == 0:
            px[x, y] = (0, 0, 0, 0)
    return im


# ---------- l'enseigne de la mercerie ----------

NW, NH = 32, 46
PANNEAU = (5, 29, 16, 28)    # la face de la planche : la même que celle du forgeron (le nom, y 17 à 23 ; dessous, la bobine)


def enseigne():
    t = Toile(NW, NH)
    # le socle de pierre (son dessus, sa face), au pied
    for y in range(39, NH):
        for x in range(0, 8):
            u = x / 7
            if y < 42:
                lum = 0.74 + 0.06 * (y - 39) - 0.24 * u + 0.04 * bruit(x, y, 163)
                R = PIERRES[1]
            else:
                lum = 0.50 - 0.28 * u - 0.10 * (y - 42) / 3 + 0.04 * bruit(x, y, 164)
                R = PIERRES[3 if x < 4 else 2]
                if y == 42:
                    lum -= 0.06
            t.put(x, y, ton(R, lum))
    # le poteau de chêne (x 2 à 5) : la face gauche au jour, la droite dans l'ombre, le fil ; son chapeau
    for y in range(4, 41):
        for x in range(2, 6):
            lum = (0.70, 0.56, 0.40, 0.26)[x - 2] + 0.04 * bruit(x, y // 2, 165) - 0.06 * ((y * 3 + x) % 8 == 0)
            if y >= 37:
                lum -= 0.12 * (y - 36) / 4
            t.put(x, y, ton(CHENE[0], lum))
    for x in range(1, 7):
        t.put(x, 3, ton(CHENE[1], 0.86 - 0.08 * x))
        t.put(x, 4, ton(CHENE[1], 0.42 - 0.04 * x))
    # la potence de fer forgé (y 7 à 8), sa volute, et son dessus
    for x in range(5, 31):
        t.put(x, 7, ton(FONTE, 0.74 - 0.30 * x / 31 + 0.04 * bruit(x, 7, 167)))
        t.put(x, 8, ton(FONTE, 0.34 - 0.14 * x / 31))
    for (x, y, l) in ((7, 9, 0.6), (8, 10, 0.5), (9, 11, 0.4), (10, 11, 0.32), (11, 10, 0.4), (11, 9, 0.5)):
        t.put(x, y, ton(FONTE, l))
    # la bobine découpée qui coiffe la potence, debout : sa joue du haut (un disque vu d'en haut, son dessus raccourci,
    # le trou au milieu), le fil rouge enroulé (les tons exacts du tissu rouge, ses spires), la joue du bas
    bx = 19
    for y in range(1, 7):
        for x in range(bx - 4, bx + 5):
            u = (x - (bx - 4)) / 8
            if y <= 2:                                              # la joue du haut : son dessus
                if abs(x - bx) > 4 - (1 if y == 1 else 0):
                    continue
                lum = 0.86 - 0.26 * u + 0.04 * bruit(x, y, 169)
                if y == 2 and x == bx:
                    lum = 0.20                                      # le trou de l'axe
                t.put(x, y, ton(NOYER[0], lum))
            elif y == 6:                                            # la joue du bas : sa tranche
                t.put(x, y, ton(NOYER[0], 0.46 - 0.24 * u))
            elif abs(x - bx) <= 3:                                  # le fil, ses spires
                spire = (y + x // 2) % 2 == 0
                lum = 0.80 - 0.42 * (x - (bx - 3)) / 6 + (0.08 if spire else -0.08) + 0.04 * bruit(x, y, 170)
                t.put(x, y, ECHEVEAUX[0][max(0, min(8, round(lum * 8)))])
    t.put(bx + 4, 3, ECHEVEAUX[0][3]); t.put(bx + 5, 4, ECHEVEAUX[0][2]); t.put(bx + 5, 5, ECHEVEAUX[0][1])   # le bout du fil
    # les chaînes (deux), de la potence à la planche
    for cx in (9, 25):
        for y in range(9, 15):
            t.put(cx, y, ton(FONTE, 0.70 if y % 2 else 0.36))
    # la planche : sa tranche du dessus (2 rangées), sa face (claire, où s'écrit le nom), son cadre
    x0, x1, y0, y1 = PANNEAU
    for y in (y0 - 2, y0 - 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            t.put(x, y, ton(CHENE[2], (0.86 if y == y0 - 2 else 0.74) - 0.24 * u + 0.03 * bruit(x, y, 171)))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            g = (y - y0) / (y1 - y0)
            if x in (x0, x1) or y in (y0, y1):
                lum = 0.50 - 0.22 * u - 0.10 * g + (0.10 if x == x0 or y == y0 else -0.06)
                t.put(x, y, ton(CHENE[0], lum + 0.03 * bruit(x, y, 172)))
            else:
                planche = (y - y0) // 4
                lum = 0.84 - 0.20 * u - 0.10 * g + 0.04 * bruit(x // 2, y, 173 + planche) - (0.10 if (y - y0) % 4 == 0 else 0)
                t.put(x, y, ton(PEINTURE, lum))
    for x in range(x0, x1 + 1):
        t.put(x, y1 + 1, ton(CHENE[0], 0.24 - 0.1 * (x - x0) / (x1 - x0)))
    # sous le nom : une pelote peinte (les tons exacts du tissu bleu, ses brins) et l'aiguille qui la pique
    for y in range(24, 28):
        for x in range(13, 19):
            dx, dy = (x - 15.5) / 2.6, (y - 25.6) / 2.1
            if dx * dx + dy * dy > 1:
                continue
            brin = (x + 2 * y) % 3 == 0
            lum = 0.78 - 0.22 * dx - 0.26 * dy + (-0.16 if brin else 0.04) + 0.03 * bruit(x, y, 175)
            t.put(x, y, PEL[max(0, min(8, round(lum * 8)))])
    for k in range(0, 7):
        t.put(17 + k, 24 + (k * 3) // 6, ton(NOIR, 0.62 - 0.05 * k))   # l'aiguille, en travers
    t.put(19, 27, PEL[3]); t.put(20, 27, PEL[4]); t.put(21, 26, PEL[3])  # un brin qui s'échappe
    return contour(t.im, OUT)


# la pelote : les tons exacts du tissu bleu (data/meubles.json PALETTES tissu_bleu)
PEL = ECHEVEAUX[1]


def main():
    images = {'rouet_metier': rouet_metier(0, False)}
    for f in range(4):
        images[f'rouet_metier_{f}'] = rouet_metier(f, True)
    images['enseigne_mercerie'] = enseigne()
    for nom, im in images.items():
        im.save(os.path.join(ASSETS, f'meuble_{nom}.png'), optimize=True)
        print(f'{nom} : {im.width} × {im.height}, {couleurs(im)} couleurs')
    if '--apercu' in sys.argv:
        dossier = sys.argv[sys.argv.index('--apercu') + 1] if len(sys.argv) > sys.argv.index('--apercu') + 1 else '.'
        L = list(images.values())
        ap = Image.new('RGBA', (sum(i.width for i in L) + 8 * (len(L) + 1), max(i.height for i in L) + 16), (0, 0, 0, 255))
        px = ap.load()
        for y in range(ap.height):
            for x in range(ap.width):
                px[x, y] = (150, 112, 74, 255) if (x // 4 + y // 16) % 2 else (140, 104, 70, 255)
        x = 8
        for im in L:
            ap.alpha_composite(im, (x, ap.height - 8 - im.height))
            x += im.width + 8
        ap.resize((ap.width * 8, ap.height * 8), Image.NEAREST).save(os.path.join(dossier, 'apercu_mercerie.png'))


if __name__ == '__main__':
    main()
