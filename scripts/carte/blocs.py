# Les blocs qu'on pose sur la ferme générée (docs/carte-generee.md, étapes 4 et 5b), vus de
# haut à 45° comme la carte et ses bâtiments : de chaque bloc on voit le dessus (raccourci) et
# la face avant (tournée vers le bas de l'écran). Des images de 16 × 24 côte à côte ; le bas de
# chaque image est le bas de sa case, le haut dépasse sur la case du dessus.
#
#   python3 scripts/carte/blocs.py            écrit assets/blocs.png
#   python3 scripts/carte/blocs.py --apercu   écrit aussi apercu_blocs.png (la planche, puis
#                                             une pièce close sur l'herbe de la carte)
#
# La projection : une hauteur de h px se voit sur h × HAUT, une profondeur de p px (du devant
# de la case vers le fond) sur p × FOND. Un mur plein (16 de haut, 16 de fond) : 14 px de face
# et 10 de dessus, soit les 24 de l'image.
#
# Les couleurs sont celles des bâtiments (PALETTE_SERRE de scripts/batiments/style_v2.py : la
# pierre et le bois de la maison, de l'étable, du moulin, du puits) ; le contour, le brun sombre
# du puits. Lumière en haut à gauche : le dessus est le plus clair, le bord gauche éclairé, le
# bord droit dans l'ombre. Pas d'ombre portée : la scène peint celles du soleil d'après la
# silhouette de chaque image (js/carte/ferme/soleil.js).
#
# Ordre des images (js/carte/ferme/config.js, BLOCS_CARTE.frames) :
#   0 à 13 : mur_pierre (seul), porte, atelier, paillasse, drap (la couverture, posée par-dessus
#            le dormeur), four, cuisiniere, panneau, batterie, nichoir (le bloc clé du
#            Poulailler), mangeoire (de l'Étable), bac_semis (de la Serre), coffre_grain (du
#            Silo), meule (du Moulin) ;
#   14 à 29 : le mur raccordé à ses voisins (BLOCS_CARTE.murs) : 14 + masque, masque : 1 un mur
#            au-dessus, 2 à droite, 4 au-dessous, 8 à gauche (une porte compte à gauche et à
#            droite, pas au-dessus ni au-dessous : un mur s'arrête devant une porte percée dans
#            un mur vertical, sa face avant se voit) ;
#   30 : la porte percée dans un mur vertical (BLOCS_CARTE.porteVerticale) : le seuil vu de
#            haut, le battant ouvert contre le montant.
# Un mur qui a un voisin au-dessous n'a pas de face avant : son dessus descend jusqu'au bas de
# la case et rejoint celui du voisin (un côté de la pièce fait une bande continue, seul le
# dernier mur montre sa face). Les pierres suivent la case dans la carte (un motif de 16 px de
# période) : deux murs voisins se raccordent sans couture.
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'batiments'))  # style_v2.py
from pixel import ASSETS, BAYER, ROOT, T, contour, hasard, rangee  # noqa: E402
from style_v2 import PALETTE_SERRE as PS  # noqa: E402

W, H = 16, 24
HAUT, FOND = 14 / 16, 10 / 16
BAS = H - 1                        # la rangée du pied (le bas de la case)
FACE = round(16 * HAUT)            # la face d'un mur plein : 14 px
CHAPE = H - FACE                   # son dessus : 10 px (rangées 0 à 9)

# ---------- les matières (du plus sombre au plus clair) ----------
OUT = (36, 30, 20)                                     # le contour (celui du puits)
PIERRE = [(72, 64, 52)] + list(PS['pierre'])           # 0 : le joint, puis les 5 tons
BOIS = list(PS['bois'])
CADRE = list(PS['cadre'])
TOIT = list(PS['toit'])
FER = [(34, 38, 46), (62, 68, 80), (98, 106, 118), (146, 154, 164), (196, 202, 208)]
PAILLE = [(112, 78, 30), (168, 124, 50), (208, 166, 76), (236, 206, 122), (250, 232, 170)]
TOILE = [(118, 102, 78)] + list(PS['toile'])
LAINE = [(80, 26, 30), (136, 44, 44), (178, 70, 60), (214, 112, 88)]
FEU = [(70, 20, 12), (176, 58, 24), (232, 122, 36), (252, 196, 72), (255, 240, 176)]
TERRE = [(40, 28, 18), (62, 44, 28), (86, 62, 40), (108, 82, 54)]
VERT = [(30, 66, 36), (52, 104, 48), (88, 150, 64), (146, 196, 92)]
CELLULE = [(22, 34, 62), (36, 62, 112), (62, 104, 164), (138, 182, 226)]
OEUF = [(206, 192, 164), (238, 228, 206), (252, 248, 236)]
FARINE = [(196, 188, 170), (236, 232, 222)]
ROUGE, NOIR = (178, 52, 44), (40, 40, 44)


class Toile:
    """Une image de W × H et ses pinceaux."""

    def __init__(self, im=None):
        self.im = im.copy() if im else Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def efface(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = (0, 0, 0, 0)

    def fini(self):
        """L'image, entourée du contour sombre (les objets ; les murs posent le leur)."""
        return contour(self.im, OUT)


def trame(x, y, t):
    """Vrai pour une proportion t des pixels (trame ordonnée) : un fondu sans demi-teinte."""
    return BAYER[y % 4][x % 4] < t * 16


def boite(t, x0, x1, base, h, p, dessus, face, arete=True):
    """Un bloc droit vu de haut : sa face avant (h px de haut, avant projection) posée sur la
    rangée `base`, de x0 à x1, et son dessus (p px de fond) au-dessus. dessus, face : des
    fonctions (x, y) -> couleur, ou une rampe (le dessus clair, la face au ton moyen, son bord
    gauche éclairé, son bord droit dans l'ombre). Renvoie (haut du dessus, haut de la face)."""
    hf, hd = round(h * HAUT), round(p * FOND)
    yf, yd = base - hf + 1, base - hf - hd + 1
    fd = dessus if callable(dessus) else (lambda x, y, r=dessus: r[4] if x == x0 else r[3])
    ff = face if callable(face) else (lambda x, y, r=face: r[3] if x == x0 else r[1] if x == x1 else r[2])
    for y in range(yd, yf):
        for x in range(x0, x1 + 1):
            t.put(x, y, fd(x, y))
    for y in range(yf, base + 1):
        for x in range(x0, x1 + 1):
            t.put(x, y, ff(x, y))
    if arete and hf and not callable(dessus):
        for x in range(x0, x1 + 1):              # l'arête du dessus, éclairée
            t.put(x, yf - 1, dessus[4])
    return yd, yf


def planches(r, sens='v', pas=4, x0=0, y0=0):
    """Une surface de planches (rampe r) : joints sombres tous les `pas` px, le fil du bois ;
    sens 'v' : planches debout, 'h' : couchées."""
    def f(x, y):
        u, v = (x - x0, y - y0) if sens == 'v' else (y - y0, x - x0)
        if u % pas == pas - 1:
            return r[0]
        k = u // pas
        if (v + 3 * k) % 7 == 0 and hasard(k, v // 7) < 0.6:
            return r[1]                          # un nœud, une fente
        return r[2] if hasard(k, 3) < 0.4 else r[3]
    return f


def pieds(t, xs, y0, y1, r=BOIS):
    """Des pieds de 2 px de large (le gauche éclairé), de y0 à y1."""
    for x in xs:
        for y in range(y0, y1 + 1):
            t.put(x, y, r[2])
            t.put(x + 1, y, r[1])


# ---------- le mur en pierre ----------

def pierre_dessus(x, y):
    """Les dalles du dessus d'un mur : rangées de 4 px, joints décalés ; v suit la carte."""
    v = (y - 8) % 16
    rang = v // 4
    u = (x + (4 if rang % 2 else 0)) % 16
    if v % 4 == 3 or u % 8 == 7:
        return PIERRE[1]
    if v % 4 == 0 or u % 8 == 0:
        return PIERRE[5]                         # le haut et la gauche de la dalle, éclairés
    return PIERRE[4] if hasard(rang, u // 8) < 0.55 else PIERRE[3]


# les joints verticaux de chaque assise de la face (période 16)
ASSISES = [(0, 6, 11), (3, 9, 14), (1, 7, 12)]


def pierre_face(x, y):
    """Les moellons de la face avant : assises de 4 px sous l'arête de la chape, le bas du mur
    un ton plus sombre."""
    v = y - (CHAPE + 1)
    rang, w = v // 4, v % 4
    joints = ASSISES[rang % len(ASSISES)]
    if w == 3 or x % 16 in joints:
        return PIERRE[0]
    bas = rang >= 2
    if w == 0:
        return PIERRE[2 if bas else 3]
    if w == 2 or (x + 1) % 16 in joints:
        return PIERRE[1]
    return PIERRE[2] if (bas or hasard(rang, x // 5) < 0.35) else PIERRE[3]


def mur(m):
    """Le mur de masque m (1 haut, 2 droite, 4 bas, 8 gauche : les voisins qui le
    prolongent)."""
    t = Toile()
    n, e, s, w = (m & 1, m & 2, m & 4, m & 8)
    fin = BAS if s else CHAPE - 1               # la dernière rangée du dessus
    for y in range(0, fin + 1):
        for x in range(W):
            t.put(x, y, pierre_dessus(x, y))
    if not s:
        for x in range(W):
            t.put(x, CHAPE - 1, PIERRE[5])       # l'arête de la chape
            t.put(x, CHAPE, PIERRE[0])           # son ombre sur la face
            t.put(x, BAS, OUT)                   # le pied
        for y in range(CHAPE + 1, BAS):
            for x in range(W):
                t.put(x, y, pierre_face(x, y))
    # les bords libres : contour, liseré clair à gauche, ombre à droite
    if not n:
        for x in range(W):
            t.put(x, 1, PIERRE[5])
            t.put(x, 0, OUT)
    if not w:
        for y in range(1, H):
            t.put(1, y, PIERRE[5] if y <= fin else PIERRE[3])
        for y in range(H):
            t.put(0, y, OUT)
    if not e:
        for y in range(1, H):
            t.put(14, y, PIERRE[2] if y <= fin else PIERRE[1])
        for y in range(H):
            t.put(15, y, OUT)
    if not s:
        for x in range(W):
            t.put(x, BAS, OUT)
    # un mur qui descend (voisin au-dessous) à côté d'un mur qui ne descend pas : l'arête
    # entre son dessus et la face avant du voisin
    if s and e:
        for y in range(CHAPE, H):
            t.put(15, y, OUT)
    if s and w:
        for y in range(CHAPE, H):
            t.put(0, y, OUT)
    # les coins libres arrondis
    if not n and not w:
        t.efface(0, 0)
    if not n and not e:
        t.efface(15, 0)
    return t.im


def porte():
    """La porte dans un mur horizontal : la chape en linteau, une porte de planches cintrée,
    ses pentures et sa poignée, entre deux montants de pierre."""
    t = Toile(mur(2 | 8))
    x0, x1, y0 = 3, 12, CHAPE + 1
    bois = planches([CADRE[1], BOIS[1], BOIS[2], BOIS[3]], pas=3, x0=x0)
    for y in range(y0, BAS):
        t.put(x0 - 1, y, OUT)
        t.put(x1 + 1, y, OUT)
        for x in range(x0, x1 + 1):
            t.put(x, y, bois(x, y))
    # le cintre : les coins du haut de la porte, en pierre ; l'arc sombre au-dessus
    for x in range(x0, x1 + 1):
        t.put(x, y0 - 1, OUT if x0 < x < x1 else PIERRE[0])
    t.put(x0, y0, OUT)
    t.put(x1, y0, OUT)
    for x in range(x0 + 1, x1):
        t.put(x, y0, BOIS[3])
    for y in (y0 + 3, y0 + 9):                   # les pentures
        for x in range(x0, x1):
            t.put(x, y, FER[1])
        t.put(x0, y, FER[2])
    t.put(x1 - 2, y0 + 6, FER[4])                # la poignée
    t.put(x1 - 2, y0 + 7, FER[1])
    for x in range(x0, x1 + 1):                  # le seuil
        t.put(x, BAS - 1, CADRE[2])
    return t.im


def porte_verticale():
    """La porte percée dans un mur vertical : de haut, le seuil de planches entre les deux
    bouts du mur, et le battant ouvert, debout contre le montant de droite."""
    t = Toile()
    y0 = H - T                                   # le haut de la case
    seuil = planches([CADRE[1], BOIS[1], BOIS[2], BOIS[3]], 'h', pas=4, y0=y0)
    for y in range(y0, H):
        for x in range(1, W - 1):
            t.put(x, y, seuil(x, y))
        t.put(1, y, BOIS[4])
        t.put(W - 2, y, BOIS[0])
        t.put(0, y, OUT)
        t.put(W - 1, y, OUT)
    for x in range(W):
        t.put(x, y0, OUT)
        t.put(x, BAS, OUT)
    # le battant : une planche debout, son chant vu de haut puis son bas vu de face
    yb, yp = y0 - 4, BAS - 6
    for y in range(yb, BAS):
        t.put(11, y, BOIS[4] if y < yp else BOIS[2])
        t.put(12, y, BOIS[3] if y < yp else BOIS[1])
        t.put(10, y, OUT)
        t.put(13, y, OUT)
    for x in (11, 12):
        t.put(x, yb - 1, OUT)
        t.put(x, BAS, OUT)
        t.put(x, yp - 1, BOIS[4])
    t.put(11, yb + 3, FER[2])
    t.put(11, yp + 2, FER[2])
    return t.im


# ---------- les objets ----------

def atelier():
    """L'Atelier : un établi de planches, vu de haut ; dessus, un marteau et une scie."""
    t = Toile()
    pieds(t, (2, 12), 18, 22)
    boite(t, 1, 14, 17, 3, 18, planches(BOIS, 'h', pas=3), lambda x, y: BOIS[0] if y == 17 else BOIS[3] if x == 1 else BOIS[2])
    for x in range(1, 15):
        t.put(x, 15, BOIS[4])                    # l'arête du plateau
    for x in range(4, 12):                       # la traverse basse
        t.put(x, 21, BOIS[1])
    # le marteau : le manche, la tête de fer
    for k in range(5):
        t.put(3 + k, 12 - k // 2, BOIS[4] if k < 4 else BOIS[3])
    t.rect(7, 8, 8, 10, FER[2])
    t.put(7, 8, FER[4])
    t.put(8, 10, FER[1])
    # la scie : la lame, ses dents, la poignée
    for x in range(9, 14):
        t.put(x, 6, FER[3])
        t.put(x, 7, FER[2] if x % 2 else FER[1])
    t.rect(13, 5, 13, 7, BOIS[0])
    t.put(12, 5, BOIS[0])
    return t.fini()


def paillasse():
    """La paillasse : un sac de toile bourré de paille, à plat, vu de haut ; la paille dépasse
    aux deux bouts."""
    t = Toile()

    def dessus(x, y):
        if y in (8, 9, 19):
            return PAILLE[3] if (x + y) % 3 else PAILLE[2]
        if x in (2, 13):
            return TOILE[1]
        if (x - 3) % 4 == 0:
            return TOILE[2]                      # les rayures de la toile
        return TOILE[4] if trame(x, y, 0.15) else TOILE[3]
    boite(t, 2, 13, 21, 2, 20, dessus, lambda x, y: TOILE[0] if y == 21 else TOILE[1], arete=False)
    for x in range(4, 13, 3):                    # les capitons
        t.put(x, 13, TOILE[0])
        t.put(x, 16, TOILE[0])
    t.efface(2, 8)
    t.efface(13, 8)
    return t.fini()


def drap():
    """La couverture : de la laine rouge sur le bas de la paillasse (et sur le dormeur)."""
    t = Toile()

    def dessus(x, y):
        if y == 13:
            return LAINE[3]                      # le bord retourné, plus clair
        if x in (1, 14):
            return LAINE[1]
        return LAINE[3] if trame(x, y, 0.2) else LAINE[2]
    boite(t, 1, 14, 21, 3, 13, dessus, lambda x, y: LAINE[0] if x in (1, 14) else LAINE[1], arete=False)
    for x in range(2, 14):                       # la rayure de la couverture
        t.put(x, 17, LAINE[3] if x % 2 else TOILE[4])
    return t.fini()


def four():
    """Le four de pierre : une voûte de moellons sur son socle, la bouche où rougeoie le feu,
    tournée vers le bas de l'écran."""
    t = Toile()
    cx, cy, rx, ry = 7.5, 13.0, 7.0, 9.5
    for y in range(19):
        for x in range(W):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy > 1:
                continue
            # la voûte : un dôme éclairé en haut à gauche ; des moellons en quinconce
            lum = 1 - (dx * 0.6 + dy * 0.8 + 0.2)
            rang = (y - 3) // 3
            joint = (y - 3) % 3 == 2 or (x + 2 * rang) % 5 == 0
            k = 5 if lum > 1.15 else 4 if lum > 0.8 else 3 if lum > 0.45 else 2
            t.put(x, y, PIERRE[max(1, k - 2)] if joint else PIERRE[k])
    # le socle : une marche de pierre, dessus clair, face sombre
    boite(t, 1, 14, BAS - 1, 4, 4, PIERRE, lambda x, y: PIERRE[0] if y == BAS - 1 else PIERRE[3] if x == 1 else PIERRE[2])
    # la bouche : une arche sombre, les braises et la flamme
    for y in range(11, 19):
        for x in range(4, 12):
            dx = (x + 0.5 - 8) / 4
            if y + 0.5 >= 14 - 3 * max(0.0, 1 - dx * dx) ** 0.5:
                t.put(x, y, FEU[0])
    for x in range(5, 11):
        t.put(x, 18, FEU[2] if x % 2 else FEU[1])
        t.put(x, 17, FEU[1] if x % 3 else FEU[2])
    for x, y, k in ((7, 16, 3), (8, 16, 3), (7, 15, 4), (8, 14, 3), (6, 16, 2), (9, 16, 2)):
        t.put(x, y, FEU[k])
    for x in range(4, 12):
        t.put(x, 19, PIERRE[5])                  # la sole, au bord de la bouche
    return t.fini()


def cuisiniere():
    """La cuisinière : un fourneau de fonte vu de haut, deux plaques et la marmite, la porte
    du foyer sur la face, le feu derrière la grille."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 11, 13, lambda x, y: FER[2] if x == 1 else FER[1],
                   lambda x, y: FER[2] if x == 1 else FER[0] if x == 14 else FER[1])
    for x in range(1, 15):
        t.put(x, yf - 1, FER[3])                 # l'arête du dessus
        t.put(x, BAS - 1, FER[0])
    # les plaques
    for cx in (4, 11):
        for x in range(cx - 2, cx + 2):
            t.put(x, yd + 2, FER[2])
            t.put(x, yd + 4, FER[0])
        t.put(cx - 2, yd + 3, FER[2])
        t.put(cx - 1, yd + 3, FER[0])
        t.put(cx, yd + 3, FEU[1])
        t.put(cx + 1, yd + 3, FER[0])
    # la marmite, sur la plaque de gauche
    for y in range(yd - 3, yd + 3):
        for x in range(2, 7):
            t.put(x, y, LAINE[2] if x == 2 else LAINE[0] if x == 6 else LAINE[1])
    for x in range(2, 7):
        t.put(x, yd - 3, LAINE[3])
    t.put(4, yd - 4, NOIR)
    # la porte du foyer : la grille, le feu
    t.rect(4, yf + 1, 11, yf + 6, FER[0])
    for x in range(5, 11):
        t.put(x, yf + 5, FEU[2] if x % 2 else FEU[1])
        t.put(x, yf + 4, FEU[3] if x in (7, 8) else FEU[1])
    t.put(7, yf + 3, FEU[4])
    for x in range(4, 12, 2):
        t.put(x, yf + 2, FER[2])
    t.put(12, yf + 3, FER[4])                    # la poignée
    return t.fini()


def panneau():
    """Le panneau solaire : un cadre de fer incliné vers le bas de l'écran, ses cellules
    bleues où passe le reflet du ciel, sur deux pieds."""
    t = Toile()
    pieds(t, (3, 11), 15, 22, FER)
    x0, x1, y0, y1 = 1, 14, 4, 15
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x in (x0, x1) or y in (y0, y1):
                c = FER[3] if (x == x0 or y == y0) else FER[1]
            elif (x - x0) % 4 == 0 or (y - y0) % 4 == 0:
                c = CELLULE[1]
            elif x - y in (-3, -2) or x - y == 6:
                c = CELLULE[3]
            else:
                c = CELLULE[2]
            t.put(x, y, c)
    for x in range(x0, x1 + 1):                  # le chant du cadre, en bas
        t.put(x, y1 + 1, FER[0])
    return t.fini()


def batterie():
    """La batterie : un coffre de fer, vu de haut avec ses deux bornes ; l'éclair sur la face."""
    t = Toile()
    yd, yf = boite(t, 2, 13, BAS - 1, 10, 9, FER, FER)
    for x, c in ((4, ROUGE), (10, NOIR)):        # les bornes
        t.rect(x, yd + 1, x + 1, yd + 3, c)
        t.put(x, yd + 1, FER[4])
    for x, y in ((8, 0), (7, 1), (6, 2), (7, 2), (8, 2), (7, 3), (6, 4)):
        t.put(x, yf + 2 + y, PAILLE[3])
    for x in range(2, 14):
        t.put(x, BAS - 1, FER[0])
    return t.fini()


def nichoir():
    """Le nichoir : une caisse de planches sur pieds, son toit à deux pentes, le nid de paille
    et deux œufs dans l'ouverture."""
    t = Toile()
    pieds(t, (2, 12), 18, 22)
    yd, yf = boite(t, 1, 14, 17, 9, 6, BOIS, planches(BOIS, pas=3))
    t.rect(3, yf + 1, 12, 16, CADRE[0])          # l'ouverture
    for x in range(3, 13):
        t.put(x, 16, PAILLE[2] if x % 2 else PAILLE[3])
        t.put(x, 15, PAILLE[1] if x % 3 else PAILLE[2])
    for cx in (5, 9):
        t.put(cx, 14, OEUF[1])
        t.put(cx + 1, 14, OEUF[0])
        t.put(cx, 13, OEUF[2])
        t.put(cx + 1, 13, OEUF[1])
    # le toit : deux pentes de bardeaux, vues de haut, le faîte au milieu
    for y in range(3, yf):
        for x in range(W):
            c = TOIT[4] if x < 8 else TOIT[2]
            t.put(x, y, TOIT[1] if (y - 3) % 3 == 2 else c)
        t.put(7, y, TOIT[5])
    for x in range(W):
        t.put(x, yf, CADRE[1])                   # le bord du toit
    return t.fini()


def mangeoire():
    """La mangeoire : une auge de planches sur pieds, vue de haut, pleine de foin."""
    t = Toile()
    pieds(t, (2, 12), 18, 22)
    yd, yf = boite(t, 1, 14, 18, 6, 14, BOIS, planches(BOIS, 'h', pas=3, y0=1))
    for y in range(yd + 1, yf - 1):              # le foin, dans l'auge
        for x in range(3, 13):
            k = 1 if (x * 3 + y) % 7 == 0 else 3 if trame(x, y, 0.3) else 2
            t.put(x, y, PAILLE[k])
    for x in range(3, 13):
        t.put(x, yd + 1, BOIS[0])                # l'ombre du bord du fond
    for x in (4, 7, 10):                         # des brins qui dépassent
        t.put(x, yd, PAILLE[3])
        t.put(x + 1, yd - 1, PAILLE[4])
    return t.fini()


def bac_semis():
    """Le bac à semis : une caisse de planches basse, vue de haut, pleine de terreau, des
    pousses en rangs."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 6, 16, BOIS, planches(BOIS, 'h', pas=3, y0=2))
    for y in range(yd + 2, yf - 1):
        for x in range(3, 13):
            t.put(x, y, TERRE[2] if (x + 2 * y) % 5 else TERRE[3])
    for x in range(3, 13):
        t.put(x, yd + 2, TERRE[0])
    for x in (4, 8, 12):                          # deux rangs de pousses
        for y0 in (yd + 5, yd + 9):
            t.put(x, y0, VERT[1])
            t.put(x - 1, y0 - 1, VERT[3])
            t.put(x, y0 - 1, VERT[2])
            t.put(x + 1, y0 - 2, VERT[2])
    for x in range(2, 14):
        t.put(x, BAS - 1, BOIS[0])
    return t.fini()


def coffre_grain():
    """Le coffre à grain : un coffre de planches cerclé de fer, vu de haut, son couvercle
    ouvert et le blé qui déborde."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 9, 12, BOIS, planches(BOIS, pas=3))
    for y in range(yd + 1, yf - 1):
        for x in range(2, 14):
            k = 1 if (x + y) % 5 == 0 else 3 if trame(x, y, 0.4) else 2
            t.put(x, y, PAILLE[k])
    for x in range(2, 14):
        t.put(x, yd, PAILLE[4] if x % 3 else PAILLE[3])
    for y in range(yd - 4, yd):                  # le couvercle ouvert, debout derrière
        for x in range(1, 15):
            t.put(x, y, BOIS[4] if y == yd - 4 else BOIS[3])
    for x in range(1, 15):
        t.put(x, yd - 2, FER[2])
    for y in (yf + 1, BAS - 2):                  # les cercles de fer, la serrure
        for x in range(1, 15):
            t.put(x, y, FER[3] if x == 1 else FER[2])
    t.rect(7, yf + 3, 8, yf + 4, FER[3])
    t.put(8, yf + 4, FER[0])
    for x in range(2, 14):
        t.put(x, BAS - 1, BOIS[0])
    return t.fini()


def meule():
    """La meule : deux meules de pierre l'une sur l'autre, vues de haut sur leur bâti de bois ;
    l'œil et l'axe de fer, la manivelle, de la farine au pied."""
    t = Toile()
    pieds(t, (2, 12), 18, 22)
    boite(t, 1, 14, 18, 4, 14, BOIS, lambda x, y: BOIS[0] if y == 18 else BOIS[3] if x == 1 else BOIS[2])
    for cy, ep, rx, ry in ((12.5, 2, 6.5, 4.0), (9.5, 2, 5.5, 3.4)):
        for y in range(H):
            for x in range(W):
                dx = (x + 0.5 - 7.5) / rx
                if abs(dx) > 1:
                    continue
                hy = ry * (1 - dx * dx) ** 0.5
                if cy - hy <= y + 0.5 <= cy + hy:
                    d = dx * dx + ((y + 0.5 - cy) / ry) ** 2
                    lum = 0.6 - 0.5 * dx - 0.4 * (y + 0.5 - cy) / ry
                    k = 2 if 0.25 < d < 0.4 else 5 if lum > 0.95 else 4 if lum > 0.55 else 3
                    t.put(x, y, PIERRE[k])
                elif cy + hy < y + 0.5 <= cy + hy + ep:
                    t.put(x, y, PIERRE[2] if dx < 0.3 else PIERRE[1])    # la tranche
    t.rect(7, 9, 8, 10, FER[0])                  # l'œil, l'axe
    t.put(7, 9, FER[3])
    for y in range(4, 10):                       # la manivelle
        t.put(12, y, BOIS[3])
    t.put(12, 3, BOIS[4])
    t.put(11, 8, FER[2])
    for x, y in ((3, 22), (4, 22), (5, 21), (10, 22), (11, 22)):
        t.put(x, y, FARINE[x % 2])
    return t.fini()


MURS = 14                                        # le premier des 16 murs raccordés
DESSINS = [mur(0), porte(), atelier(), paillasse(), drap(), four(), cuisiniere(), panneau(),
           batterie(), nichoir(), mangeoire(), bac_semis(), coffre_grain(), meule()] \
    + [mur(m) for m in range(16)] + [porte_verticale()]
PORTE_VERTICALE = len(DESSINS) - 1


# ---------- l'aperçu : une pièce close et les objets, sur l'herbe de la carte ----------

PIECE = [
    'MMMMMMM...',
    'M.f.c.M...',
    'M.....P.MM',
    'M.p.d.M.MM',
    'MMMPMMM...',
    '..........',
    'a.n.g.s.r.',
    '..........',
    'b.m.o.....',
]
SORTES = {'f': 5, 'c': 6, 'p': 3, 'd': 4, 'a': 2, 'n': 9, 'g': 10, 's': 11, 'b': 8, 'm': 13, 'o': 12, 'r': 7}


def masque(g, x, y):
    """Comme js/carte/ferme/chantier.js (wallMask) : les murs voisins, et les portes à gauche
    et à droite."""
    def est(dx, dy, portes):
        yy, xx = y + dy, x + dx
        return 0 <= yy < len(g) and 0 <= xx < len(g[yy]) and (g[yy][xx] == 'M' or (portes and g[yy][xx] == 'P'))
    return (1 if est(0, -1, False) else 0) | (2 if est(1, 0, True) else 0) | (4 if est(0, 1, False) else 0) | (8 if est(-1, 0, True) else 0)


def apercu_piece(sheet):
    herbe = Image.open(os.path.join(ASSETS, 'herbe_chemin.png')).convert('RGBA').crop((0, T, T, 2 * T))
    cols, rows = len(PIECE[0]) + 2, len(PIECE) + 2
    fond = Image.new('RGBA', (cols * T, rows * T))
    for y in range(rows):
        for x in range(cols):
            fond.paste(herbe, (x * T, y * T))
    pose = []
    for y, rang in enumerate(PIECE):
        for x, ch in enumerate(rang):
            if ch == 'M':
                k = MURS + masque(PIECE, x, y)
            elif ch == 'P':
                m = masque(PIECE, x, y)
                vert = any(0 <= y + d < len(PIECE) and PIECE[y + d][x] == 'M' for d in (-1, 1)) and not m & 10
                k = PORTE_VERTICALE if vert else 1
            elif ch == 'd':                    # une paillasse et sa couverture
                pose.append((y, x, SORTES['p']))
                k = SORTES['d']
            elif ch in SORTES:
                k = SORTES[ch]
            else:
                continue
            pose.append((y, x, k))
    for y, x, k in sorted(pose, key=lambda p: (p[0], p[1])):
        im = sheet.crop((k * W, 0, (k + 1) * W, H))
        fond.alpha_composite(im, ((x + 1) * T, (y + 2) * T - H))
    planche = Image.new('RGBA', sheet.size, (106, 150, 84, 255))
    planche.alpha_composite(sheet)
    planche = planche.resize((planche.width * 3, planche.height * 3), Image.NEAREST)
    big = fond.resize((fond.width * 5, fond.height * 5), Image.NEAREST)
    out = Image.new('RGBA', (max(planche.width, big.width), planche.height + 12 + big.height), (40, 40, 40, 255))
    out.paste(planche, (0, 0))
    out.paste(big, (0, planche.height + 12))
    out.save(os.path.join(ROOT, 'apercu_blocs.png'))


def main():
    sheet = rangee(DESSINS, W, H)
    sheet.save(os.path.join(ASSETS, 'blocs.png'))
    print(f'assets/blocs.png : {len(DESSINS)} images de {W} × {H}')
    if '--apercu' in sys.argv:
        apercu_piece(sheet)


if __name__ == '__main__':
    main()
