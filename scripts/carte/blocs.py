# Les blocs qu'on pose sur la ferme générée (docs/carte-generee.md, étapes 4 et 5b), vus de
# haut à 45° comme la carte et ses bâtiments : de chaque bloc on voit le dessus (raccourci) et
# la face avant (tournée vers le bas de l'écran). Des images de 16 × 24 côte à côte ; le bas de
# chaque image est le bas de sa case, le haut dépasse sur la case du dessus.
#
#   python3 scripts/carte/blocs.py            écrit assets/blocs.png et assets/murs_hauts.png
#                                             (les murs une case plus hauts des maisons de la
#                                             carte de transition, voir murs_hauts())
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
#            haut, le battant ouvert contre le montant ;
#   31 à 46 : le plancher (BLOCS_CARTE.sols) : 31 + masque des planchers voisins, à plat sur sa
#            case (les 16 px du bas de l'image), sous les blocs qu'on pose dessus ;
#   47 à 49 : le four qui cuit (BLOCS_CARTE.feu) : ses flammes bougent, une image après
#            l'autre (FLAMMES) ;
#   50 à 65 : la barrière raccordée à ses voisines (BLOCS_CARTE.barrieres + masque) ;
#   66 à 68 : la lanterne scintillante (BLOCS_CARTE.lanterne) : éteinte, puis allumée (deux
#            images qui alternent, la nuit) ;
#   69 et 70 : l'escalier, puis son haut vu de l'étage (BLOCS_CARTE.escalier, un essai).
#   71 et 72 : la ruche, vide puis pleine (le miel se devine : BLOCS_CARTE.frames.ruche,
#            ruche_pleine).
#   73 : le bac à fleurs (BLOCS_CARTE.frames.bac_fleurs).
#   74 à 80 : la botteleuse (BLOCS_CARTE.frames) : l'entonnoir, la machine à l'arrêt puis en
#            marche, le convoyeur (deux images qui alternent quand la bande tourne), puis son
#            dernier segment (le rouleau d'où la botte tombe ; deux images aussi).
#   81 à 88 : la meule qui moud (BLOCS_CARTE.meule) : sa pierre du dessus et sa manivelle
#            tournent, une image après l'autre (un tour en 8 images).
#   89 : la boîte à nourriture ;
#   90 à 201 : les modèles de sols (BLOCS_CARTE.modelesSols, MODELES_SOLS) : 16 images
#            raccordées chacun, comme le plancher ;
#   202 à 208 : les modèles de portes percées dans un mur vertical (BLOCS_CARTE.portesVerticales,
#            MODELES_PORTES).
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

# les matières des immeubles de la ville (scripts/ville/batiments.py : la brique, la pierre de
# taille), chargées par leur chemin (un dossier scripts/batiments porte le même nom)
import importlib.util  # noqa: E402
sys.path.append(os.path.join(HERE, '..', 'ville'))   # (son commun.py)
_spec = importlib.util.spec_from_file_location('ville_batiments', os.path.join(HERE, '..', 'ville', 'batiments.py'))
VB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(VB)

W, H = 16, 24
HAUT, FOND = 14 / 16, 10 / 16
BAS = H - 1                        # la rangée du pied (le bas de la case)
FACE = round(16 * HAUT)            # la face d'un mur plein : 14 px
CHAPE = H - FACE                   # son dessus : 10 px (rangées 0 à 9)
LINTEAU = 4                        # le linteau de la porte, bien plus fin

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
INFRA = [(42, 24, 56), (72, 46, 104), (110, 74, 150), (152, 112, 196), (200, 164, 232)]   # le bois de l'infra-monde
LUEUR = [(14, 58, 64), (31, 140, 138), (79, 240, 210), (200, 255, 244)]                   # le champignon lumineux


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
    bas = v >= BAS - CHAPE - 5                   # (les deux dernières assises)
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
    """La porte dans un mur horizontal, comme le bloc de la première version : un linteau de
    pierre fin (LINTEAU rangées, bien moins haut que la chape des murs voisins), le bas aligné
    sur l'arête de leur chape ; au-dessous, une porte de planches cintrée sur presque toute la
    largeur de la case, ses deux pentures et sa poignée, le seuil en bas."""
    t = Toile()
    yl = CHAPE - LINTEAU                         # le haut du linteau ; son bas : l'arête des murs
    for y in range(LINTEAU):                     # le linteau : contour, dessus, l'arête claire
        for x in range(W):
            t.put(x, yl + y, (OUT, PIERRE[4], PIERRE[3], PIERRE[5])[y])
    t.put(15, yl + 2, PIERRE[2])
    x0, x1, y0 = 2, 13, CHAPE                    # le battant, de x0 à x1
    bois = planches([CADRE[1], BOIS[1], BOIS[2], BOIS[3]], pas=2, x0=x0)
    for y in range(y0, H):
        t.put(0, y, OUT)
        t.put(15, y, OUT)
        t.put(1, y, CADRE[0])                    # le chambranle
        t.put(14, y, CADRE[0])
        for x in range(x0, x1 + 1):
            t.put(x, y, bois(x, y))
    # le cintre : les coins du haut restent en pierre, l'arc sombre au-dessus du battant
    for x, y, c in ((1, y0, PIERRE[3]), (2, y0, PIERRE[3]), (3, y0, PIERRE[2]), (12, y0, PIERRE[2]), (13, y0, PIERRE[1]), (14, y0, PIERRE[1]),
                    (1, y0 + 1, PIERRE[3]), (14, y0 + 1, PIERRE[1])):
        t.put(x, y, c)
    for x, y in ((4, y0), (5, y0), (10, y0), (11, y0), (2, y0 + 1), (3, y0 + 1), (12, y0 + 1), (13, y0 + 1)):
        t.put(x, y, CADRE[0])
    for x in range(6, 10):
        t.put(x, y0, CADRE[0])
    for x in range(4, 12):                       # le haut du battant, éclairé
        t.put(x, y0 + 1, BOIS[3] if x % 2 else BOIS[2])
    for y in (y0 + 3, y0 + 10):                  # les pentures
        for x in range(x0, x1 + 1):
            t.put(x, y, FER[1])
        t.put(x0, y, FER[2])
        t.put(x1, y, FER[0])
    t.put(x1 - 2, y0 + 6, FER[4])                # la poignée
    t.put(x1 - 2, y0 + 7, FER[0])
    for x in range(1, 15):                       # le seuil
        t.put(x, BAS - 1, CADRE[2])
        t.put(x, BAS, OUT)
    return t.im


def porte_verticale(tons=None):
    """La porte percée dans un mur vertical : de haut, le seuil de planches entre les deux
    bouts du mur, et le battant ouvert, debout contre le montant de droite (`tons` : ceux de
    son chant, clair, moyen, sombre, ombre ; le bois de la porte de planches sans eux)."""
    clair, moyen, sombre, ombre = tons or (BOIS[4], BOIS[3], BOIS[2], BOIS[1])
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
        t.put(11, y, clair if y < yp else sombre)
        t.put(12, y, moyen if y < yp else ombre)
        t.put(10, y, OUT)
        t.put(13, y, OUT)
    for x in (11, 12):
        t.put(x, yb - 1, OUT)
        t.put(x, BAS, OUT)
        t.put(x, yp - 1, clair)
    t.put(11, yb + 3, FER[2])
    t.put(11, yp + 2, FER[2])
    return t.im


# ---------- les modèles de portes ----------
# Les portes qu'on fabrique à l'Atelier en plus de la porte de planches (MODELES_PORTES, dans
# l'ordre de BLOCS_CARTE.hauts.modelesPortes) : chacune peint son battant (une fonction de la
# rangée u et de la colonne v d'un battant de w × h px : sa couleur), et les tons de son chant
# quand elle est ouverte dans un mur vertical (porte_verticale : clair, moyen, sombre, ombre).
# Le même battant, plus petit, fait l'icône de son objet (scripts/icones/art_blocs.py).
CHENE = [(48, 28, 16), (78, 46, 26), (106, 66, 38), (140, 92, 54)]
GRANGE = [(84, 22, 20), (132, 38, 32), (168, 54, 42), (200, 86, 66)]
BLANC_GRANGE = (232, 228, 214)
BLEU_PORTE = [(24, 40, 72), (42, 70, 118), (64, 100, 156), (108, 146, 194)]
VERT_ECURIE = [(22, 52, 32), (36, 84, 50), (54, 118, 68), (94, 158, 98)]
CREME = [(150, 146, 132), (196, 192, 178), (224, 220, 206), (246, 244, 234)]
LAITON = [(120, 86, 30), (206, 164, 70), (244, 214, 120)]
VITRE_PORTE = [(46, 68, 92), (92, 132, 166), (150, 192, 216), (214, 236, 244)]


def _panneau(u, v, u0, u1, v0, v1, tons, creux=False):
    """Un panneau de u0..u1 × v0..v1 : en relief (le haut et la gauche éclairés), ou en creux
    (l'inverse) ; None hors de lui."""
    if not (u0 <= u <= u1 and v0 <= v <= v1):
        return None
    sombre, moyen, clair = tons
    haut = u == u0 or v == v0
    bas = u == u1 or v == v1
    if haut:
        return sombre if creux else clair
    if bas:
        return clair if creux else sombre
    return moyen


def battant_chene(u, v, w, h):
    """Du chêne sombre : deux panneaux en relief en haut, deux en bas, une poignée de laiton."""
    C, mid, rail = CHENE, w // 2, round(h * 0.45)
    if (u, v) == (rail + 1, w - 3):
        return LAITON[2]
    if (u, v) == (rail + 2, w - 3):
        return LAITON[0]
    for u0, u1 in ((1, rail - 1), (rail + 2, h - 2)):
        for v0, v1 in ((1, mid - 2), (mid + 1, w - 2)):
            p = _panneau(u, v, u0, u1, v0, v1, (C[0], C[2], C[3]))
            if p:
                return p
    return C[1] if (u + 2 * v) % 7 else C[0]


def battant_vitre(u, v, w, h):
    """Un cadre de bois clair, quatre carreaux en haut, un panneau plein en bas."""
    g = round(h * 0.58)
    if (u, v) == (g + 2, w - 3):
        return FER[4]
    if 1 <= u <= g - 1 and 1 <= v <= w - 2:
        if v == w // 2 or u == g // 2:
            return BOIS[3]                       # les croisillons
        if u == 1 or v == 1:
            return VITRE_PORTE[0]                # l'ombre du cadre sur le verre
        return VITRE_PORTE[3] if (u + v) % 6 in (0, 1) else VITRE_PORTE[1]
    p = _panneau(u, v, g + 1, h - 2, 1, w - 2, (BOIS[1], BOIS[2], BOIS[4]))
    return p or BOIS[3]


def battant_grange(u, v, w, h):
    """Des planches rouges dans un cadre blanc, croisé d'un X blanc."""
    t = u / (h - 1) * (w - 1)
    if v in (0, w - 1) or u in (0, h - 1) or abs(v - t) < 0.75 or abs(v - (w - 1 - t)) < 0.75:
        return BLANC_GRANGE
    return GRANGE[1] if v % 3 == 2 else GRANGE[3] if v % 3 == 0 and u % 5 == 1 else GRANGE[2]


def battant_bleu(u, v, w, h):
    """Des planches peintes en bleu, deux pentures noires, une poignée de fer."""
    if (u, v) == (h // 2, w - 2):
        return FER[4]
    if u in (2, h - 4) and v <= w - 3:
        return FER[1] if v == w - 3 else FER[0]
    return BLEU_PORTE[3] if v % 3 == 0 else BLEU_PORTE[1] if v % 3 == 2 else BLEU_PORTE[2]


def battant_fer(u, v, w, h):
    """Des plaques de fer rivetées, l'une au-dessus de l'autre, un anneau pour l'ouvrir."""
    if (u, v) in ((h // 2, w - 3), (h // 2 + 1, w - 4), (h // 2 + 1, w - 2), (h // 2 + 2, w - 3)):
        return FER[4]
    if v in (0, w - 1) or u == h - 1:
        return FER[1]
    if u % 5 == 4:
        return FER[0]                            # la jointure de deux plaques
    if u % 5 == 1 and v in (1, w - 2):
        return FER[4]                            # un rivet
    return FER[3] if u % 5 == 0 else FER[2]


def battant_ecurie(u, v, w, h):
    """La porte d'écurie, verte : deux vantaux l'un au-dessus de l'autre, chacun barré d'une
    écharpe, la tablette de bois entre eux."""
    s, V = h // 2, VERT_ECURIE
    if u == s:
        return BOIS[4]                           # la tablette
    if u == s + 1:
        return V[0]                              # son ombre
    if (u, v) == (s - 2, w - 3):
        return FER[4]
    if v in (0, w - 1) or u in (0, h - 1):
        return V[1]
    u0, hh = (0, s) if u < s else (s + 1, h - s - 1)
    t = (u - u0) / max(1, hh - 1) * (w - 1)
    if abs(v - (w - 1 - t)) < 0.75:
        return V[3]                              # l'écharpe
    return V[1] if v % 3 == 2 else V[2]


def battant_blanc(u, v, w, h):
    """Une porte blanche à moulures : quatre panneaux en creux, une poignée de laiton."""
    mid, r = w // 2, round(h * 0.4)
    if (u, v) == (round(h * 0.52), w - 2):
        return LAITON[2]
    if (u, v) == (round(h * 0.52) + 1, w - 2):
        return LAITON[0]
    for u0, u1 in ((1, r - 1), (r + 2, h - 2)):
        for v0, v1 in ((1, mid - 2), (mid + 1, w - 2)):
            p = _panneau(u, v, u0, u1, v0, v1, (CREME[1], CREME[2], CREME[3]), creux=True)
            if p:
                return p
    return CREME[2]


# id du bloc : (le battant, les tons de son chant dans un mur vertical)
MODELES_PORTES = {
    'porte_chene': (battant_chene, (CHENE[3], CHENE[2], CHENE[1], CHENE[0])),
    'porte_vitree': (battant_vitre, (VITRE_PORTE[3], BOIS[3], BOIS[2], BOIS[1])),
    'porte_grange': (battant_grange, (BLANC_GRANGE, GRANGE[3], GRANGE[2], GRANGE[1])),
    'porte_bleue': (battant_bleu, (BLEU_PORTE[3], BLEU_PORTE[2], BLEU_PORTE[1], BLEU_PORTE[0])),
    'porte_fer': (battant_fer, (FER[4], FER[3], FER[2], FER[1])),
    'porte_ecurie': (battant_ecurie, (VERT_ECURIE[3], VERT_ECURIE[2], VERT_ECURIE[1], VERT_ECURIE[0])),
    'porte_blanche': (battant_blanc, (CREME[3], CREME[2], CREME[1], CREME[0])),
}


def icone_porte(battant):
    """L'icône de 16 × 16 d'une porte : son battant de 10 × 13 dans son chambranle, le seuil."""
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y in range(0, 15):
        for x in range(2, 14):
            px[x, y] = OUT + (255,)
    for u in range(13):
        for v in range(10):
            px[3 + v, 1 + u] = battant(u, v, 10, 13) + (255,)
    for x in range(3, 13):
        px[x, 14] = CADRE[2] + (255,)
    for x in range(2, 14):
        px[x, 15] = OUT + (255,)
    for x, y in ((2, 0), (13, 0)):
        px[x, y] = (0, 0, 0, 0)
    for x, y in ((3, 1), (12, 1)):
        px[x, y] = OUT + (255,)
    return im


# ---------- les murs hauts (les maisons de la carte de transition) ----------
# Les mêmes murs, une case plus hauts : une face de FACE + 16 px (images de 16 × 40, le bas sur
# la case, le haut dépasse de 24 px au-dessus) ; murs_hauts.png : les 16 murs raccordés
# (masque comme plus haut), puis la porte, percée au pied d'un mur plein, puis les 16 murs à
# fenêtre (17 + masque) et les 16 murs aux pierres d'angle (33 + masque), les fenêtres qu'une
# voisine prolonge (une grande fenêtre : 49, 65, 81 + masque) et les parois vitrées (97 à 160).
HAUTEUR_EN_PLUS = T


def porte_haute(fond=None, linteau=None, battant=None):
    """La porte dans un mur haut : le mur plein (raccordé à gauche et à droite), un linteau
    (`linteau` : ses tons clair, moyen, des coins du cintre ; de la pierre sans lui), et
    au-dessous la porte de planches cintrée, ses pentures, sa poignée, le seuil ; ou le
    battant d'un modèle de porte (`battant`, MODELES_PORTES), cintré de même."""
    t = Toile(fond(2 | 8) if fond else mur(2 | 8))
    clair, moyen, coin = linteau or (PIERRE[5], PIERRE[3], PIERRE[2])
    y0, x0, x1 = H - 22, 2, 13                   # le haut du battant (22 px de porte)
    for x in range(1, 15):                       # le linteau : clair, son ombre
        t.put(x, y0 - 3, OUT)
        t.put(x, y0 - 2, clair)
        t.put(x, y0 - 1, moyen)
    bois = planches([CADRE[1], BOIS[1], BOIS[2], BOIS[3]], pas=2, x0=x0)
    for y in range(y0, H):
        t.put(1, y, CADRE[0])                    # le chambranle
        t.put(14, y, CADRE[0])
        for x in range(x0, x1 + 1):
            t.put(x, y, battant(y - y0, x - x0, x1 - x0 + 1, BAS - 1 - y0) if battant and y < BAS - 1 else bois(x, y))
    if battant:
        for x, y in ((2, y0), (3, y0), (12, y0), (13, y0), (2, y0 + 1), (13, y0 + 1)):
            t.put(x, y, coin)
        for x, y in ((4, y0), (11, y0), (3, y0 + 1), (12, y0 + 1)):
            t.put(x, y, CADRE[0])
        for x in range(5, 11):
            t.put(x, y0, CADRE[0])
        for x in range(1, 15):                   # le seuil
            t.put(x, BAS - 1, CADRE[2])
            t.put(x, BAS, OUT)
        return t.im
    for x, y in ((2, y0), (3, y0), (12, y0), (13, y0), (2, y0 + 1), (13, y0 + 1)):
        t.put(x, y, coin)                        # le cintre : les coins du haut restent du linteau
    for x, y in ((4, y0), (11, y0), (3, y0 + 1), (12, y0 + 1)):
        t.put(x, y, CADRE[0])
    for x in range(5, 11):
        t.put(x, y0, CADRE[0])
    for x in range(4, 12):                       # le haut du battant, éclairé
        t.put(x, y0 + 1, BOIS[3] if x % 2 else BOIS[2])
    for y in (y0 + 4, y0 + 15):                  # les pentures
        for x in range(x0, x1 + 1):
            t.put(x, y, FER[1])
        t.put(x0, y, FER[2])
        t.put(x1, y, FER[0])
    t.put(x1 - 2, y0 + 10, FER[4])               # la poignée
    t.put(x1 - 2, y0 + 11, FER[0])
    for x in range(1, 15):                       # le seuil
        t.put(x, BAS - 1, CADRE[2])
        t.put(x, BAS, OUT)
    return t.im


VITRE = [(52, 74, 96), (96, 136, 168), (150, 192, 216), (214, 236, 244)]   # le verre, du fond au reflet
VITRE_ALPHA = [255, 150, 165, 210]   # son opacité : on voit l'intérieur au travers (le reflet, moins)


def fenetre(m, j=0, fond=None):
    """Le mur haut de masque m percé d'une fenêtre : sur la face (un mur sans voisin
    au-dessous), un cadre de bois, quatre carreaux et leurs croisillons, un appui de pierre ;
    un mur qui descend (vu de dessus seulement) reste plein ; `fond` : le mur où elle est percée
    (le mur en pierre, sinon). j : les fenêtres voisines qui la
    prolongent (1 à gauche, 2 à droite) : le verre, l'appui et le linteau vont jusqu'au bord
    de ce côté (deux fenêtres côte à côte font une grande fenêtre). Le verre est un peu
    transparent (VITRE_ALPHA) : on voit l'intérieur au travers."""
    t = Toile(fond(m) if fond else mur(m))
    if m & 4:
        return t.im
    g, d = j & 1, j & 2
    x0, x1, y0, y1 = 0 if g else 4, 15 if d else 11, CHAPE + 6, BAS - 8       # le dedans du cadre
    for y in range(y0 - 1, y1 + 2):                  # le cadre (pas du côté d'une fenêtre voisine)
        for x in range(max(0, x0 - 1), min(15, x1 + 1) + 1):
            bord = (x == x0 - 1 and not g) or (x == x1 + 1 and not d) or y in (y0 - 1, y1 + 1)
            t.put(x, y, CADRE[0] if bord else None)
    for y in range(y0, y1 + 1):                      # les carreaux : sombres en bas, un reflet en haut à gauche
        for x in range(x0, x1 + 1):
            k = 1 if y > (y0 + y1) // 2 else 2
            if not g and x - x0 + (y - y0) < 3:
                k = 3
            t.px[x, y] = VITRE[k] + (VITRE_ALPHA[k],)
    xm, ym = 7, (y0 + y1) // 2
    for y in range(y0, y1 + 1):                      # les croisillons de bois (et entre deux fenêtres)
        t.put(xm, y, BOIS[2])
        if g:
            t.put(0, y, BOIS[1])
    for x in range(x0, x1 + 1):
        t.put(x, ym, BOIS[2])
    for x in range(max(0, x0 - 2), min(15, x1 + 2) + 1):   # l'appui de pierre, éclairé, son ombre
        t.put(x, y1 + 2, PIERRE[5])
        t.put(x, y1 + 3, PIERRE[1])
    for x in range(max(0, x0 - 1), min(15, x1 + 1) + 1):   # le linteau
        t.put(x, y0 - 2, PIERRE[4])
    return t.im


# les tons du métal de la paroi vitrée, à la place de ceux de la pierre
METAL = {PIERRE[0]: FER[1], PIERRE[1]: FER[1], PIERRE[2]: FER[2], PIERRE[3]: FER[3], PIERRE[4]: FER[3], PIERRE[5]: FER[4]}
VERRE = [(46, 84, 104), (70, 122, 148), (118, 170, 196), (196, 228, 240)]   # le verre teinté, du fond au reflet


def paroi_vitree(m, j=0):
    """Le mur haut de masque m en paroi vitrée : le dessus en métal ; sur la face, du verre
    teinté du pied à la chape, des montants de métal au bord droit (et au bord gauche, sans
    paroi voisine de ce côté) et des traverses (un étage d'immeuble tous les 13 px), des reflets
    en biais qui suivent d'une paroi à l'autre. j : les parois voisines (1 à gauche, 2 à droite)."""
    t = Toile(mur(m))
    for y in range(H):
        for x in range(W):
            c = t.im.getpixel((x, y))
            if c[3] and c[:3] in METAL:
                t.put(x, y, METAL[c[:3]])
    if m & 4:
        return t.im
    xa, xb = (0 if m & 8 else 1), (15 if m & 2 else 14)
    for y in range(CHAPE + 1, BAS):
        v = y - (CHAPE + 1)
        for x in range(xa, xb + 1):
            if (x == xa and not j & 1) or x == xb or v % 13 == 0 or y == BAS - 1:
                c = FER[1] if y == BAS - 1 else FER[2]   # les montants, les traverses, le socle
            elif (x + y) % 16 in (0, 1):
                c = VERRE[2]                             # le reflet en biais
            elif (x + y) % 16 == 2:
                c = VERRE[3]
            else:
                c = VERRE[1] if v % 13 < 7 else VERRE[0]
            t.put(x, y, c)
    return t.im


# le verre de la serre, clair et presque transparent (du fond au reflet, et son opacité), le
# dessus vu au travers un peu plus transparent que la face
VERRE_SERRE = [(150, 204, 192), (186, 226, 214), (226, 246, 238), (250, 255, 252)]
VERRE_ALPHA = {'dessus': 96, 'face': 128, 'reflet': 190}


def verre_serre(m, j=0):
    """Le mur haut de masque m de la serre : du verre clair, qu'on voit au travers, dans des
    arêtes de bois. Le dessus : une vitre posée à plat, une poutre de bois sur chaque bord libre
    et sur l'arête de la chape ; la face (un mur sans voisin au-dessous) : des vitres entre un
    montant de bois au bord droit (et au bord gauche, sans paroi voisine de ce côté), une
    traverse au milieu, une sablière sous la chape et un soubassement de planches au pied ; des
    reflets en biais. j : les murs de serre voisins (1 à gauche, 2 à droite)."""
    t = Toile()
    n, e, s, w = (m & 1, m & 2, m & 4, m & 8)
    fin = BAS if s else CHAPE - 1

    def vitre(x, y, a):
        k = 2 if (x + y) % 16 in (0, 1) else 3 if (x + y) % 16 == 2 else 1 if y % 9 < 5 else 0
        t.px[x, y] = VERRE_SERRE[k] + ((VERRE_ALPHA['reflet'] if k >= 2 else a),)

    for y in range(0, fin + 1):                   # le dessus : la vitre à plat
        for x in range(W):
            vitre(x, y, VERRE_ALPHA['dessus'])
    for x in range(W):                            # ses poutres : sur les bords libres
        if not n:
            t.put(x, 1, BOIS[3])
            t.put(x, 2, BOIS[2])
    for y in range(0, fin + 1):
        if not w:
            t.put(1, y, BOIS[3])
            t.put(2, y, BOIS[2])
        if not e:
            t.put(13, y, BOIS[1])
            t.put(14, y, BOIS[0])
    if not s:
        xa, xb = (0 if w else 1), (15 if e else 14)
        for x in range(W):
            t.put(x, CHAPE - 2, BOIS[3])          # l'arête de la chape : une poutre claire
            t.put(x, CHAPE - 1, BOIS[2])
            t.put(x, CHAPE, CADRE[0])             # son ombre sur la face
        for y in range(CHAPE + 1, BAS):
            v = y - (CHAPE + 1)
            for x in range(xa, xb + 1):
                if y >= BAS - 4:                  # le soubassement de planches
                    t.put(x, y, BOIS[1] if y == BAS - 4 or x % 8 == 7 else BOIS[2] if y < BAS - 1 else BOIS[0])
                elif v < 2:                       # la sablière
                    t.put(x, y, BOIS[2] if v == 0 else BOIS[1])
                elif (x == xa and not j & 1) or x == xb:
                    t.put(x, y, BOIS[2] if x == xa else BOIS[1])   # les montants
                elif v == (BAS - 4 - CHAPE) // 2:
                    t.put(x, y, BOIS[2])          # la traverse
                else:
                    vitre(x, y, VERRE_ALPHA['face'])
    # les bords libres : le contour
    if not n:
        for x in range(W):
            t.put(x, 0, OUT)
    if not w:
        for y in range(H):
            t.put(0, y, OUT)
    if not e:
        for y in range(H):
            t.put(15, y, OUT)
    if not s:
        for x in range(W):
            t.put(x, BAS, OUT)
    if s and e:
        for y in range(CHAPE, H):
            t.put(15, y, OUT)
    if s and w:
        for y in range(CHAPE, H):
            t.put(0, y, OUT)
    if not n and not w:
        t.efface(0, 0)
    if not n and not e:
        t.efface(15, 0)
    return t.im


def porte_serre():
    """La porte de la serre, dans un mur de verre horizontal : un battant de bois vitré (un
    cadre, deux carreaux, une traverse, un panneau plein en bas), sa poignée, le seuil."""
    t = Toile(verre_serre(2 | 8))
    y0, x0, x1 = H - 22, 2, 13                    # le haut du battant (22 px de porte)
    for y in range(y0 - 2, H):
        for x in range(x0 - 1, x1 + 2):
            t.efface(x, y)
    for x in range(x0 - 1, x1 + 2):               # le linteau
        t.put(x, y0 - 2, BOIS[3])
        t.put(x, y0 - 1, CADRE[0])
    for y in range(y0, BAS):
        for x in range(x0 - 1, x1 + 2):
            cadre = x in (x0 - 1, x1 + 1, x0, x1) or y in (y0, y0 + 1) or y >= BAS - 7 or y == y0 + 7
            if x in (x0 - 1, x1 + 1):
                t.put(x, y, CADRE[0])             # le chambranle
            elif cadre:
                t.put(x, y, BOIS[2] if y < BAS - 7 or (x + y) % 5 else BOIS[1])
            else:
                k = 2 if (x + y) % 12 in (0, 1) else 1
                t.px[x, y] = VERRE_SERRE[k] + ((VERRE_ALPHA['reflet'] if k == 2 else VERRE_ALPHA['face']),)
    t.put(x1 - 2, BAS - 10, FER[4])               # la poignée
    t.put(x1 - 2, BAS - 9, FER[0])
    for x in range(W):                            # le seuil
        t.put(x, BAS, OUT)
    return t.im


def pierre_angle(m):
    """Le mur haut de masque m aux pierres d'angle : sur la face, de grosses pierres taillées
    plus claires, une longue et une courte en alternance, aux bords libres (sans mur voisin à
    côté) ; entre deux murs, aux deux bords (un pilier)."""
    t = Toile(mur(m))
    if m & 4:
        return t.im
    bords = [b for b, libre in (('g', not m & 8), ('d', not m & 2)) if libre] or ['g', 'd']
    for k, y0 in enumerate(range(CHAPE + 1, BAS - 1, 5)):
        long_ = 7 if k % 2 == 0 else 4
        for b in bords:
            xs = range(1, 1 + long_) if b == 'g' else range(15 - long_, 15)
            for y in range(y0, min(y0 + 5, BAS)):
                for x in xs:
                    bordure = y == y0 + 4 or (b == 'g' and x == xs[-1]) or (b == 'd' and x == xs[0])
                    t.put(x, y, PIERRE[0] if bordure else (250, 240, 214) if y == y0 else PIERRE[5] if (x + y) % 6 else PIERRE[4])
    return t.im


# les murs aux matières des immeubles de la ville : (nom, motif (x, y) → couleur, tons de la
# corniche : base, joint, clair), dans l'ordre de murs_hauts.png
MATIERES_VILLE = [
    ('brique_rouge', lambda x, y: VB.brique(x, y, 'rouge'), VB.TAILLE),
    ('brique_orange', lambda x, y: VB.brique(x, y, 'orange'), VB.TAILLE),
    ('brique_ocre', lambda x, y: VB.brique(x, y, 'ocre'), VB.TAILLE),
    ('brique_bleue', lambda x, y: VB.brique(x, y, 'bleu'), VB.TAILLE),
    ('pierre_taille', VB.taille, VB.TAILLE),
]
SOCLE_VILLE = ((150, 140, 128), (118, 110, 102), (184, 176, 164))   # le soubassement (immeubles.py SOCLE)


def mur_ville(m, motif, dessus):
    """Le mur haut de masque m à la matière d'un immeuble de la ville : le dessus de la même
    matière, un peu plus clair ; la face, du motif `motif` (calé sur la case : deux murs voisins
    se raccordent), sous une corniche de pierre de taille et au-dessus d'un soubassement ; les
    bords libres gardent le contour du mur en pierre."""
    t = Toile(mur(m))
    b, j, c = dessus
    for y in range(H):
        for x in range(W):
            p = t.im.getpixel((x, y))
            if not p[3] or p[:3] == OUT:
                continue
            face = not m & 4 and CHAPE < y < BAS
            if face:
                r = BAS - y                               # la hauteur au-dessus du pied
                if y <= CHAPE + 2:
                    col = (40, 31, 31) if y == CHAPE + 2 else VB.teinte(b, 0.9)    # la corniche, son ombre
                elif r <= 5:
                    col = SOCLE_VILLE[2] if r == 5 else SOCLE_VILLE[0] if x % 16 else SOCLE_VILLE[1]
                else:
                    col = motif(x, y + 4)
                if (not m & 8 and x == 1) or (not m & 2 and x == 14):
                    col = VB.teinte(col, 1.12 if x == 1 else 0.82)   # les arêtes : claire à gauche, sombre à droite
            else:
                # le dessus : la même matière, un peu plus claire (le haut du mur, au soleil)
                col = c if y == 1 and not m & 1 else VB.teinte(motif(x, y), 1.06)
            t.put(x, y, col)
    return t.im


def mur_bois(m):
    """Le mur haut de masque m en bois : des planches couchées sur la face (un joint sombre
    toutes les 4 rangées, les aboutements décalés d'une planche à l'autre, calés sur la case :
    deux murs voisins se raccordent), une lisse plus claire en haut, une sablière sombre au
    pied ; le dessus, des planches au soleil ; les bords libres gardent le contour du mur."""
    t = Toile(mur(m))
    for y in range(H):
        for x in range(W):
            p = t.im.getpixel((x, y))
            if not p[3] or p[:3] == OUT:
                continue
            if not m & 4 and CHAPE < y < BAS:
                r = BAS - y                               # la hauteur au-dessus du pied
                if y == CHAPE + 1:
                    col = BOIS[4]                         # la lisse, au soleil
                elif r <= 2:
                    col = BOIS[0] if r == 2 else BOIS[1]  # la sablière
                else:
                    v = y - CHAPE - 2                     # les rangées de planches, de haut en bas
                    k = v // 4
                    if v % 4 == 3:
                        col = BOIS[0]                     # le joint entre deux planches
                    elif (x + 8 * (k % 2)) % 16 == 0:
                        col = BOIS[1]                     # l'aboutement de deux planches
                    elif v % 4 == 0:
                        col = BOIS[3]                     # le haut de la planche, éclairé
                    else:
                        col = BOIS[2] if hasard(x // 3, k) < 0.25 and (x + v) % 5 == 0 else BOIS[2 if hasard(k, 7) < 0.5 else 3] if v % 4 == 2 else BOIS[3 if hasard(k, 5) < 0.5 else 2]
                if (not m & 8 and x == 1) or (not m & 2 and x == 14):
                    col = BOIS[3] if x == 1 else BOIS[1]  # les arêtes : claire à gauche, sombre à droite
            else:
                # le dessus : des planches au soleil, dans le sens du mur
                col = BOIS[4] if y == 1 and not m & 1 else planches([BOIS[1], BOIS[2], BOIS[3], BOIS[4]], 'h' if m & 5 == 0 or m & 10 else 'v')(x, y)
            t.put(x, y, col)
    return t.im


def murs_hauts():
    """Les 16 murs raccordés et la porte, une case plus hauts (images de 16 × (24 + 16)) ; puis
    les 16 murs à fenêtre et les 16 murs aux pierres d'angle (BLOCS_CARTE.hauts.variantes) ; puis
    les fenêtres prolongées à gauche, à droite, des deux côtés (49, 65, 81 + masque) et les
    parois vitrées seules, prolongées à gauche, à droite, des deux côtés (97, 113, 129, 145 +
    masque ; BLOCS_CARTE.hauts.joints) ; puis les murs aux matières des immeubles de la ville
    (MATIERES_VILLE : 161, 177, 193, 209, 225 + masque) ; puis, dans le mur de briques ocre
    (l'immeuble de la ville), les fenêtres seules, prolongées à gauche, à droite, des deux
    côtés (241, 257, 273, 289 + masque) et la porte (305) ; puis les murs de verre de la serre,
    seuls, prolongés à gauche, à droite, des deux côtés (306, 322, 338, 354 + masque) et sa
    porte (370) ; puis le mur en bois (371 + masque) ; puis la porte dans les murs des autres
    matières (387 à 391 : briques rouges, orange, bleues, pierre de taille, bois ; celle des
    briques ocre est la 305), son linteau de pierre, de bois dans le mur en bois ; puis les
    modèles de portes (MODELES_PORTES, 392 + 7 × leur rang), chacun dans les 7 murs de
    BLOCS_CARTE.hauts.matieresPortes."""
    global H, BAS, FACE
    garde = H, BAS, FACE
    motif, dessus = next((mo, de) for nom, mo, de in MATIERES_VILLE if nom == 'brique_ocre')
    ocre = lambda m: mur_ville(m, motif, dessus)   # noqa: E731
    # (les modèles de portes, chacun dans les murs de BLOCS_CARTE.hauts.matieresPortes : la
    # pierre, les briques rouges, orange, ocre, bleues, la pierre de taille, le bois)
    ville = {nom: (lambda m, mo=mo, de=de: mur_ville(m, mo, de)) for nom, mo, de in MATIERES_VILLE}
    fonds_portes = [(None, None)] + [(ville[k], None) for k in ('brique_rouge', 'brique_orange', 'brique_ocre', 'brique_bleue', 'pierre_taille')] + [(mur_bois, (BOIS[4], BOIS[2], BOIS[1]))]
    H += HAUTEUR_EN_PLUS
    BAS, FACE = H - 1, FACE + HAUTEUR_EN_PLUS
    try:
        return ([mur(m) for m in range(16)] + [porte_haute()] + [fenetre(m) for m in range(16)] + [pierre_angle(m) for m in range(16)]
                + [fenetre(m, j) for j in (1, 2, 3) for m in range(16)] + [paroi_vitree(m, j) for j in range(4) for m in range(16)]
                + [mur_ville(m, motif, dessus) for _, motif, dessus in MATIERES_VILLE for m in range(16)]
                + [fenetre(m, j, ocre) for j in range(4) for m in range(16)] + [porte_haute(ocre)]
                + [verre_serre(m, j) for j in range(4) for m in range(16)] + [porte_serre()]
                + [mur_bois(m) for m in range(16)]
                + [porte_haute(lambda m, mo=motif, de=dessus: mur_ville(m, mo, de)) for nom, motif, dessus in MATIERES_VILLE if nom != 'brique_ocre']
                + [porte_haute(mur_bois, (BOIS[4], BOIS[2], BOIS[1]))]
                + [porte_haute(fond, linteau, battant) for battant, _ in MODELES_PORTES.values() for fond, linteau in fonds_portes], H)
    finally:
        H, BAS, FACE = garde


# ---------- la façade de l'immeuble de la ville ----------
# L'immeuble en blocs de la ville (js/carte/ville/immeuble.js) a des étages de ETAGE_IMMEUBLE px,
# comme ceux des immeubles de la ville (scripts/ville/immeubles.py : des étages plus hauts que les
# murs hauts de la ferme) : immeuble_ville.png, des images de 16 × (CHAPE + ETAGE_IMMEUBLE). Ses
# murs sont en briques ocre ; sur leur face :
#   - au rez-de-chaussée, le soubassement gris ; aux étages, le bandeau de pierre au plancher ;
#     au dernier, en plus, la corniche sous le toit ;
#   - aux bords libres (les angles de la façade), les pierres d'angle à refends, une longue et
#     une courte en alternance (les pilastres des immeubles) ;
#   - les fenêtres de la ville (un linteau de pierre, un cadre de bois, quatre carreaux, un
#     appui), avec de l'espace au-dessus et au-dessous ;
#   - au rez-de-chaussée, la porte double vitrée de l'entrée dans son encadrement de pierre (deux
#     images : la moitié gauche, la moitié droite).
# Dans la planche : pour chaque sorte d'étage (rez-de-chaussée, étage, dernier), les 16 murs
# (+ masque) puis les 16 murs à fenêtre ; puis les deux moitiés de la porte (96, 97). Une planche
# par matière des immeubles de la ville (FACADES : immeuble_ville.png en briques ocre,
# immeuble_ville_bleu.png en briques bleues, comme la résidence de verre ; rouges et orange pour
# les maisons de ville ; en pierre de taille pour la tour de la gare).
ETAGE_IMMEUBLE = 40
SORTES_ETAGE = ('rez', 'etage', 'dernier')
PIERRE_VILLE = ((208, 190, 152), (172, 154, 122), (226, 212, 180))   # immeubles.py PIERRE
K_VILLE = (40, 31, 31)
FACADES = [('immeuble_ville', 'brique_ocre'), ('immeuble_ville_bleu', 'brique_bleue'), ('immeuble_ville_rouge', 'brique_rouge'),
           ('immeuble_ville_orange', 'brique_orange'), ('immeuble_ville_pierre', 'pierre_taille')]


def facade_immeuble(m, sorte, fenetre_=False, matiere='brique_ocre'):
    """Le mur de masque m de l'immeuble, à l'étage `sorte`, avec ou sans sa fenêtre."""
    motif, dessus = next((mo, de) for nom, mo, de in MATIERES_VILLE if nom == matiere)
    t = Toile(mur_ville(m, motif, dessus))
    if m & 4:
        return t.im
    P, F0 = PIERRE_VILLE, CHAPE + 3          # (sous la corniche de mur_ville)
    x0, x1 = (0 if m & 8 else 1), (15 if m & 2 else 14)
    # (sous un autre étage, pas de corniche : la brique monte jusqu'au bandeau du dessus)
    if sorte != 'dernier':
        for y in range(CHAPE + 1, F0):
            for x in range(x0, x1 + 1):
                t.put(x, y, motif(x, y + 4))
    for y in range(F0, BAS):
        r = BAS - y                           # la hauteur au-dessus du plancher
        for x in range(x0, x1 + 1):
            c = None
            # le bandeau au plancher (aux étages), la corniche sous le toit (au dernier)
            if sorte != 'rez' and r <= 4:
                c = K_VILLE if r == 1 else P[2] if r == 4 else P[0]
            if sorte == 'dernier' and y < F0 + 5:
                q = y - F0
                c = P[2] if q == 0 else (P[1] if x % 6 in (0, 1) and q in (2, 3) else P[0]) if q < 4 else K_VILLE
            # les pierres d'angle aux bords libres : à refends, une longue, une courte
            for bord, sens in ((x0, 1), (x1, -1)):
                if (sens == 1 and m & 8) or (sens == -1 and m & 2):
                    continue
                u = (x - bord) * sens
                larg = 9 if (r // 8) % 2 else 6
                if u < larg and r > (5 if sorte == 'rez' else 1):
                    c = P[2] if u == 0 else P[1] if u == larg - 1 or r % 8 == 0 else P[0]
            if c:
                t.put(x, y, c)
    if fenetre_:
        # la fenêtre de la ville (scripts/ville/objets.py fenetre), raccourcie à 24 px : l'appui
        # à 8 px du plancher (au-dessus du bandeau), de l'espace au-dessus du linteau
        haut, bas = 24, BAS - 8
        y0 = bas - haut
        for y in range(y0, bas + 1):
            v = y - y0
            for x in range(2, 14):
                if v == 0 or v == haut - 1:
                    c = K_VILLE
                elif v == 1:
                    c = P[2]
                elif v == haut - 2:
                    c = P[2]
                elif v == haut:
                    c = (0, 0, 0)
                elif x in (2, 13) or v == 2 or v == haut - 3:
                    c = (78, 50, 36)
                elif x in (7, 8) or v == haut // 2:
                    c = (122, 80, 52)
                elif v < 5:
                    c = (120, 138, 152)
                elif (x + (haut - v)) % 11 in (0, 1) and v < haut - 6:
                    c = (212, 226, 232)
                else:
                    c = (170, 186, 194)
                if v == haut:
                    continue
                t.put(x, y, c)
            if v in (0, haut - 1):
                t.put(1, y, K_VILLE)
                t.put(14, y, K_VILLE)
    return t.im


def porte_immeuble(matiere='brique_ocre'):
    """Les deux moitiés de la porte double vitrée de l'entrée, dans son encadrement de pierre,
    percée dans le mur du rez-de-chaussée (masque 2 | 8)."""
    gauche, droite = Toile(facade_immeuble(2 | 8, 'rez', matiere=matiere)), Toile(facade_immeuble(2 | 8, 'rez', matiere=matiere))
    larg, haut, P = 26, 34, PIERRE_VILLE
    x0, sol = 3, BAS
    y0 = sol - haut
    for y in range(y0 - 3, sol):
        for xx in range(x0 - 3, x0 + larg + 3):
            u, v = xx - x0, y - y0
            if u < 0 or u >= larg or v < 0:
                c = K_VILLE if xx in (x0 - 3, x0 + larg + 2) or y == y0 - 3 else (P[2] if y < y0 - 1 or u < 0 else P[1])
            elif u in (0, larg - 1, larg // 2 - 1, larg // 2) or v == 0:
                c = K_VILLE
            else:
                c = (212, 226, 232) if (u + (haut - v)) % 13 in (0, 1) else ((170, 186, 194) if v > 4 else (120, 138, 152))
            t, x = (gauche, xx) if xx < 16 else (droite, xx - 16)
            t.put(x, y, c)
    for xx in (x0 + larg // 2 - 3, x0 + larg // 2 + 2):
        for y in range(sol - haut // 2 - 3, sol - haut // 2 + 3):
            t, x = (gauche, xx) if xx < 16 else (droite, xx - 16)
            t.put(x, y, (220, 224, 228))
    return [gauche.im, droite.im]


def immeuble_ville(matiere='brique_ocre'):
    """La planche de la façade de l'immeuble de la ville à la matière `matiere` (voir plus haut)
    et la hauteur de ses images."""
    global H, BAS, FACE
    garde = H, BAS, FACE
    H = CHAPE + ETAGE_IMMEUBLE
    BAS, FACE = H - 1, ETAGE_IMMEUBLE
    try:
        out = []
        for sorte in SORTES_ETAGE:
            out += [facade_immeuble(m, sorte, False, matiere) for m in range(16)] + [facade_immeuble(m, sorte, True, matiere) for m in range(16)]
        return out + porte_immeuble(matiere), H
    finally:
        H, BAS, FACE = garde


# ---------- le plancher ----------

def plancher(m):
    """Le plancher de masque m (1 un plancher au-dessus, 2 à droite, 4 au-dessous, 8 à
    gauche), à plat sur sa case : des lames couchées de 4 px, joints de bout décalés d'une lame
    à l'autre (motif de 16 px de période : deux planchers voisins se raccordent). Un bord libre
    a son contour ; en bas, le chant des lames, plus sombre."""
    t = Toile()
    n, e, s, w = (m & 1, m & 2, m & 4, m & 8)
    y0 = H - T
    for y in range(y0, H):
        v = (y - y0) % 16
        lame, k = v // 4, v % 4
        bout = (5 * lame + 3) % 16                # où la lame s'arrête
        for x in range(W):
            if k == 3:
                c = CADRE[2]                      # le joint entre deux lames
            elif x % 16 == bout:
                c = CADRE[3]                      # le joint de bout
            elif k == 0:
                c = BOIS[4] if hasard(lame, (x - bout) % 16 // 8) < 0.5 else BOIS[3]
            elif (x + 2 * lame) % 7 == 0 and k == 1:
                c = BOIS[1]                       # un nœud
            else:
                c = BOIS[3] if hasard(lame, (x - bout) % 16 // 8, 7) < 0.45 else BOIS[2]
            t.put(x, y, c)
    if not s:
        for x in range(W):
            t.put(x, BAS - 1, BOIS[1])            # le chant
            t.put(x, BAS, OUT)
    if not n:
        for x in range(W):
            t.put(x, y0, OUT)
            t.put(x, y0 + 1, BOIS[4])
    if not w:
        for y in range(y0, H):
            t.put(0, y, OUT)
    if not e:
        for y in range(y0, H):
            t.put(15, y, OUT)
    return t.im


# ---------- la barrière ----------

def barriere(m):
    """La barrière de masque m (1 une barrière au-dessus, 2 à droite, 4 au-dessous, 8 à
    gauche) : un poteau de bois au milieu de la case (son dessus clair, la face au ton moyen,
    le bord droit dans l'ombre) et deux lisses vers chaque voisine ; vers le haut et le bas,
    les lisses fuient vers le fond : on en voit le dessus, une bande de bois le long du poteau.
    Contour sombre autour (fini) : deux barrières voisines se raccordent sans couture."""
    t = Toile()
    n, e, s, w = (m & 1, m & 2, m & 4, m & 8)
    x0, x1, haut = 6, 9, 9                       # le poteau : 4 px de large, son dessus en haut
    # les lisses vers le fond (au-dessus) et vers nous (au-dessous) : leur dessus
    if n:
        t.rect(x0 + 1, 0, x1 - 1, haut, BOIS[3])
        for y in range(0, haut):
            t.put(x0 + 1, y, BOIS[4])
    if s:
        t.rect(x0 + 1, BAS - 6, x1 - 1, BAS, BOIS[3])
        for y in range(BAS - 6, BAS + 1):
            t.put(x0 + 1, y, BOIS[4])
    # les lisses à gauche et à droite : deux planches couchées (le dessus clair, la face)
    for y0 in (12, 17):
        for (a, b, ok) in ((0, x0 - 1, w), (x1 + 1, W - 1, e)):
            if not ok:
                continue
            for x in range(a, b + 1):
                t.put(x, y0, BOIS[4])
                t.put(x, y0 + 1, BOIS[2] if (x + y0) % 7 else BOIS[1])
                t.put(x, y0 + 2, BOIS[1])
    # le poteau
    for y in range(haut, BAS + 1):
        for x in range(x0, x1 + 1):
            c = BOIS[3] if x == x0 else BOIS[1] if x == x1 else BOIS[2]
            if y in (haut, haut + 1):
                c = BOIS[4] if y == haut else BOIS[3]  # le dessus du poteau, coupé net
            t.put(x, y, c)
    for x in range(x0, x1 + 1):
        t.put(x, BAS, BOIS[0])                   # le pied, dans l'herbe
    return t.fini()


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


# Les flammes du four : (x, y, ton de FEU). FLAMMES[0] : le four au repos ; les suivantes, en
# boucle, quand une préparation cuit (BLOCS_CARTE.feu) : la flamme penche, monte, retombe.
FLAMMES = [
    ((7, 16, 3), (8, 16, 3), (7, 15, 4), (8, 14, 3), (6, 16, 2), (9, 16, 2)),
    ((6, 16, 3), (7, 16, 4), (8, 16, 3), (7, 15, 3), (7, 14, 4), (6, 13, 2), (9, 16, 2), (8, 15, 2)),
    ((7, 16, 3), (8, 16, 4), (9, 16, 3), (8, 15, 4), (8, 14, 3), (9, 13, 2), (8, 12, 1), (6, 16, 2), (9, 15, 2)),
    ((6, 16, 2), (7, 16, 3), (8, 16, 3), (6, 15, 3), (7, 15, 4), (7, 14, 3), (7, 13, 2), (9, 16, 2)),
]


def four(flamme=0):
    """Le four de pierre : une voûte de moellons sur son socle, la bouche où rougeoie le feu,
    tournée vers le bas de l'écran. flamme : l'image du feu (FLAMMES), les braises en suivent
    le rythme."""
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
        t.put(x, 18, FEU[2] if (x + flamme) % 2 else FEU[1])
        t.put(x, 17, FEU[1] if (x + flamme) % 3 else FEU[2])
    for x, y, k in FLAMMES[flamme]:
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


def meule(a=0.0):
    """La meule : deux meules de pierre l'une sur l'autre, vues de haut sur leur bâti de bois ;
    l'œil et l'axe de fer, la manivelle, de la farine au pied. `a` (radians) : où en est la meule
    du dessus dans son tour (la manivelle, les rayures de la pierre) ; 0 : la manivelle à droite."""
    import math
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
    # les rayures de la meule du dessus (elles tournent avec elle), entre l'œil et le bord
    for b in (a + 2 * math.pi / 3, a + 4 * math.pi / 3):
        for u in (0.55, 0.75, 0.92):
            t.put(int(7.5 + u * 5.5 * math.cos(b)), int(9.5 + u * 3.4 * math.sin(b)), PIERRE[1])
    t.rect(7, 9, 8, 10, FER[0])                  # l'œil, l'axe
    t.put(7, 9, FER[3])
    bx, by = int(7.5 + 4.5 * math.cos(a)), int(9.5 + 2.8 * math.sin(a))
    for y in range(by - 5, by + 1):              # la manivelle, plantée au bord de la meule
        t.put(bx, y, BOIS[3])
    t.put(bx, by - 6, BOIS[4])
    t.put(bx - round(math.cos(a)), by - 1 - round(math.sin(a)), FER[2])
    for x, y in ((3, 22), (4, 22), (5, 21), (10, 22), (11, 22)):
        t.put(x, y, FARINE[x % 2])
    return t.fini()


def lanterne(eclat=None):
    """La lanterne scintillante : un poteau tordu de bois de l'infra-monde, sa potence, et la
    cage de fer où luit un champignon de la grotte. eclat None : éteinte (le jour), la vitre
    sombre ; 0 ou 1 : allumée, le champignon et la vitre clairs (deux images qui alternent :
    elle scintille)."""
    t = Toile()
    for y in range(8, BAS + 1):                  # le poteau, qui ondule un peu
        x = 4 + (1 if 12 <= y <= 17 else 0)
        t.put(x, y, INFRA[3])
        t.put(x + 1, y, INFRA[2] if (y * 5) % 7 else INFRA[4])
        t.put(x + 2, y, INFRA[1])
    for x in range(3, 9):
        t.put(x, BAS, INFRA[0])                  # le pied, dans l'herbe
    for x in range(4, 12):                       # la potence
        t.put(x, 6, INFRA[4] if x < 6 else INFRA[3])
        t.put(x, 7, INFRA[1])
    t.put(11, 8, FER[1])                         # le crochet
    on = eclat is not None
    vitre = LUEUR[2] if on else LUEUR[0]
    for y in range(9, 18):                       # la cage : un toit de fer, la vitre, un fond
        for x in range(8, 15):
            if y == 9:
                c = FER[3] if 9 <= x <= 13 else None
            elif y == 10:
                c = FER[3] if x == 8 else FER[2]
            elif y == 17:
                c = FER[1]
            elif x in (8, 14):
                c = FER[2] if x == 8 else FER[1]
            elif x == 11:
                c = FER[1]                       # le montant du milieu
            else:
                c = vitre
            t.put(x, y, c)
    # le champignon, derrière la vitre : son chapeau et son pied
    cap = LUEUR[3] if on else LUEUR[1]
    for x in range(9, 14):
        t.put(x, 12, cap if x != 11 else (LUEUR[2] if on else LUEUR[1]))
    for x in range(10, 13):
        t.put(x, 11, cap)
    for y in (13, 14, 15):
        t.put(11, y, (236, 232, 222) if on else (118, 112, 100))
    if on:
        for x, y in ((9, 15 + eclat), (13, 14 - eclat), (12, 11 - eclat) if eclat else (10, 16)):
            t.put(x, y, LUEUR[3])                # des spores qui brillent
    return t.fini()


MURS = 14                                        # le premier des 16 murs raccordés
DESSINS = [mur(0), porte(), atelier(), paillasse(), drap(), four(), cuisiniere(), panneau(),
           batterie(), nichoir(), mangeoire(), bac_semis(), coffre_grain(), meule()] \
    + [mur(m) for m in range(16)] + [porte_verticale()]
PORTE_VERTICALE = len(DESSINS) - 1
SOLS = len(DESSINS)                              # le premier des 16 planchers raccordés
DESSINS += [plancher(m) for m in range(16)]
FEU_FOUR = len(DESSINS)                          # les flammes qui bougent (BLOCS_CARTE.feu)
DESSINS += [four(k) for k in range(1, len(FLAMMES))]
BARRIERES = len(DESSINS)                         # les 16 barrières raccordées (BLOCS_CARTE.barrieres)
DESSINS += [barriere(m) for m in range(16)]
LANTERNE = len(DESSINS)                          # la lanterne éteinte, puis allumée (2 images)
DESSINS += [lanterne(), lanterne(0), lanterne(1)]


# ---------- l'escalier (un essai : l'étage, js/engine/etage.js) ----------

def escalier():
    """L'escalier vu d'en bas : quatre marches de bois qui montent vers le fond de la case (la
    plus haute dépasse au-dessus d'elle), entre deux limons plus sombres."""
    t = Toile()
    for k in range(4):                           # de la plus haute (au fond) à la plus basse
        y0 = 3 + k * 5
        for x in range(1, 15):
            for y in range(y0, y0 + 3):          # le giron, éclairé
                t.put(x, y, BOIS[3] if (x + k) % 5 else BOIS[2])
            t.put(x, y0, BOIS[4])                # le nez de la marche
            for y in range(y0 + 3, y0 + 5):      # la contremarche, dans l'ombre
                t.put(x, y, BOIS[1])
    for y in range(3, H):                        # les limons, de chaque côté
        for x in (1, 2):
            t.put(x, y, CADRE[1] if x == 2 else CADRE[2])
        for x in (13, 14):
            t.put(x, y, CADRE[0])
    for x in range(1, 15):
        t.put(x, 2, OUT)
        t.put(x, BAS, OUT)
    for y in range(2, H):
        t.put(0, y, OUT)
        t.put(15, y, OUT)
    return t.im


def escalier_haut():
    """Le haut de l'escalier, vu de l'étage : la trémie (un trou sombre où les marches
    descendent, de plus en plus dans l'ombre) entourée d'une main courante de bois."""
    t = Toile()
    y0 = H - T                                   # le haut de la case
    sombre = [BOIS[2], BOIS[1], CADRE[0], OUT]
    for y in range(y0 + 2, H - 1):
        k = min(3, (y - y0 - 2) // 3)
        for x in range(3, 13):
            t.put(x, y, sombre[k] if (y - y0) % 3 else OUT)
    for x in range(1, 15):                       # la main courante (haut et bas)
        t.put(x, y0, BOIS[4])
        t.put(x, y0 + 1, BOIS[2])
        t.put(x, BAS, BOIS[1])
    for y in range(y0, H):                       # et ses côtés
        for x in (1, 2, 13, 14):
            t.put(x, y, BOIS[3] if x in (1, 13) else BOIS[1])
    for x in range(W):
        t.put(x, y0 - 1, OUT)
    for y in range(y0 - 1, H):
        t.put(0, y, OUT)
        t.put(15, y, OUT)
    return t.im


ESCALIER = len(DESSINS)                          # l'escalier, puis son haut (BLOCS_CARTE.escalier)
DESSINS += [escalier(), escalier_haut()]


# ---------- la ruche (js/engine/ruches.js) ----------

PEINT = [(112, 84, 38), (176, 140, 66), (214, 182, 98), (238, 214, 140), (252, 238, 188)]   # le bois peint, jaune pâle
MIEL = [(150, 84, 14), (214, 136, 22), (246, 186, 48), (255, 226, 120)]                  # le miel, du fond au reflet


def ruche(pleine=False):
    """La ruche : deux hausses de planches peintes sur un petit socle, le toit plat qui
    déborde, le trou de vol en bas. Pleine, le miel se devine : il luit entre les hausses et
    perle au trou de vol, une goutte coule sur la planche d'envol."""
    t = Toile()
    pieds(t, (3, 11), 20, BAS - 1)
    yd, yf = boite(t, 2, 13, 19, 12, 5, PEINT, planches(PEINT, 'h', pas=3, y0=1))
    joint = yf + (19 - yf) // 2                  # le joint entre les deux hausses
    for x in range(2, 14):
        t.put(x, joint, PEINT[0])
        t.put(x, joint + 1, PEINT[4] if x == 2 else PEINT[3])
    # le toit : une planche plate qui déborde, son chant sombre
    for y in range(yd - 2, yd + 2):
        for x in range(1, 15):
            t.put(x, y, TOIT[4] if y < yd + 1 else TOIT[2])
    for x in range(1, 15):
        t.put(x, yd + 2, TOIT[1])
    # le trou de vol et la planche d'envol
    t.rect(6, 18, 9, 18, OUT)
    for x in range(5, 11):
        t.put(x, 19, PEINT[4] if x == 5 else PEINT[3])
    if pleine:
        for x in (4, 7, 10, 12):                 # le miel luit dans le joint
            t.put(x, joint, MIEL[2])
        t.put(8, joint, MIEL[3])
        t.put(7, 18, MIEL[1])                    # il perle au trou de vol
        t.put(8, 18, MIEL[2])
        t.put(8, 19, MIEL[2])                    # une goutte coule sur la planche
        t.put(8, 20, MIEL[1])
    return t.fini()


RUCHE = len(DESSINS)                             # la ruche vide, puis pleine (BLOCS_CARTE.frames)
DESSINS += [ruche(), ruche(True)]


# ---------- le bac à fleurs (un bloc `fleurs` : les abeilles des ruches y butinent) ----------

FLEURS = [((214, 64, 72), (246, 120, 120)), ((240, 196, 48), (255, 232, 120)), ((150, 96, 210), (196, 156, 240)),
          ((236, 236, 240), (255, 255, 255)), ((236, 120, 170), (255, 176, 210))]   # (cœur sombre, pétales)


def bac_fleurs():
    """Le bac à fleurs : une jardinière de planches basse, vue de haut, pleine de terreau ; des
    tiges et des feuilles, et des fleurs de cinq couleurs qui dépassent du bord."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 7, 9, BOIS, planches(BOIS, 'h', pas=3, y0=2))
    for y in range(yd + 1, yf - 1):              # le terreau
        for x in range(2, 14):
            t.put(x, y, TERRE[2] if (x + 2 * y) % 5 else TERRE[3])
    for x in range(2, 14):
        t.put(x, yd + 1, TERRE[0])
    # les tiges et les feuilles, puis les fleurs (une croix de pétales autour d'un cœur)
    places = [(3, yd - 2), (6, yd - 4), (9, yd - 2), (12, yd - 4), (5, yd + 1), (10, yd + 1), (13, yd)]
    for k, (cx, cy) in enumerate(places):
        for y in range(cy + 1, yf - 1):
            t.put(cx, y, VERT[1])
        t.put(cx + (1 if k % 2 else -1), cy + 2, VERT[2])
    for k, (cx, cy) in enumerate(places):
        coeur, petale = FLEURS[k % len(FLEURS)]
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            t.put(cx + dx, cy + dy, petale)
        t.put(cx, cy, (250, 210, 60) if k % len(FLEURS) != 1 else (200, 120, 30))
    for x in range(2, 14):
        t.put(x, BAS - 1, BOIS[0])
    return t.fini()


BAC_FLEURS = len(DESSINS)                        # le bac à fleurs (BLOCS_CARTE.frames.bac_fleurs)
DESSINS += [bac_fleurs()]



# ---------- la botteleuse (js/engine/botteleuse.js) : l'entonnoir, la machine, le convoyeur ----------
# Posés côte à côte sur une rangée, de gauche à droite : l'entonnoir déverse dans la machine par
# un tuyau qui sort à droite à hauteur de BOTTE_ENTREE ; la machine rend la botte de paille à
# droite, sur le convoyeur, dont la bande est à la hauteur BANDE (le haut de la bande : la botte
# y pose son pied, js/carte/ferme/config.js BOTTELEUSE.bande). Les images s'enchaînent sans
# couture d'une case à l'autre.

BANDE = 16                                       # la rangée du haut de la bande du convoyeur
BOTTE_ENTREE = 15                                # la rangée du tuyau de l'entonnoir
CAOUTCHOUC = [(30, 30, 34), (48, 48, 54), (70, 70, 78)]
VOYANT = [(40, 70, 40), (110, 220, 110)]         # le voyant de la machine : éteint, allumé


def entonnoir():
    """L'entonnoir : un grand cône de tôle sur un bâti de bois, vu de haut (son ouverture
    ronde et sombre, le bord éclairé à gauche), qui se resserre en un tuyau coudé vers la droite,
    vers la machine."""
    t = Toile()
    pieds(t, (3, 10), 17, BAS - 1)
    for x in range(2, 13):                       # la traverse du bâti
        t.put(x, 17, BOIS[3] if x == 2 else BOIS[2])
        t.put(x, 18, BOIS[1])
    # le cône : des rangées de plus en plus étroites, de la bouche (y 5) au bec (y 14)
    for y in range(5, 15):
        r = 7 - (y - 5) * 0.55
        x0, x1 = round(7.5 - r), round(7.5 + r) - 1
        for x in range(x0, x1 + 1):
            k = 4 if x <= x0 + 1 else 1 if x >= x1 - 1 else 3 if x < 8 else 2
            t.put(x, y, FER[k])
    # la bouche : une ellipse sombre (l'intérieur), son rebord
    for y in range(2, 9):
        for x in range(W):
            d = ((x + 0.5 - 7.5) / 7.2) ** 2 + ((y + 0.5 - 5) / 3.2) ** 2
            if d <= 1:
                inner = ((x + 0.5 - 7.5) / 5.8) ** 2 + ((y + 0.5 - 5) / 2.2) ** 2
                t.put(x, y, (CAOUTCHOUC[0] if y >= 5 else CAOUTCHOUC[1]) if inner <= 1 else FER[4] if x < 8 and y < 6 else FER[3])
    for x in (5, 7, 9):                          # quelques brins de fibre au fond
        t.put(x, 6, VERT[1])
    t.put(8, 5, VERT[2])
    # le bec, puis le tuyau coudé vers la droite (jusqu'au bord : il entre dans la machine)
    for y in range(15, BOTTE_ENTREE + 2):
        t.put(7, y, FER[3])
        t.put(8, y, FER[1])
    for x in range(7, W):
        t.put(x, BOTTE_ENTREE, FER[3])
        t.put(x, BOTTE_ENTREE + 1, FER[1])
    t.put(12, BOTTE_ENTREE, FER[4])
    return t.fini()


def botteleuse(marche=False):
    """La machine (la botteleuse) : un caisson de bois cerclé de fer sur un socle, sa trappe
    d'entrée à gauche (le tuyau de l'entonnoir), la presse au-dessus (un volant), la bouche de
    sortie à droite au ras du convoyeur, un voyant (allumé : elle travaille, `marche`)."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 13, 10, BOIS, planches(BOIS, 'h', pas=3, y0=1))
    for x in range(0, W):                        # le socle de fer
        t.put(x, BAS, FER[1] if 0 < x < 15 else FER[0])
    for y in range(yd, BAS):                     # les cerclages de fer
        for x in (1, 14):
            t.put(x, y, FER[3] if x == 1 else FER[1])
    for x in range(1, 15):
        t.put(x, yf + 4, FER[2])
        t.put(x, yf + 5, FER[1])
    for x in (3, 7, 12):
        t.put(x, yf + 4, FER[4])                 # des rivets
    # le volant de la presse, sur le dessus
    for y in range(yd - 3, yd + 4):
        for x in range(W):
            d = ((x + 0.5 - 8) / 4.5) ** 2 + ((y + 0.5 - (yd + 1)) / 2.4) ** 2
            if 0.45 <= d <= 1:
                t.put(x, y, FER[3] if x < 8 else FER[2])
    t.rect(7, yd, 8, yd + 1, FER[1])             # l'axe
    t.put(7, yd, FER[4])
    # l'entrée (le tuyau de l'entonnoir) à gauche, la sortie à droite, au ras de la bande
    t.put(0, BOTTE_ENTREE, FER[3])
    t.put(0, BOTTE_ENTREE + 1, FER[1])
    t.rect(11, BANDE - 1, 15, BAS - 2, CAOUTCHOUC[0])
    for x in range(11, W):
        t.put(x, BANDE - 2, FER[2])
    for x, y in ((12, BAS - 3), (13, BAS - 2), (14, BAS - 3)):
        t.put(x, y, PAILLE[2])                   # de la paille qui dépasse
    # le voyant
    t.put(4, yf + 1, VOYANT[1] if marche else VOYANT[0])
    t.put(4, yf + 2, FER[0])
    return t.fini()


def convoyeur(phase=0, bout=False):
    """Un segment de convoyeur : une bande de caoutchouc vue de haut entre deux longerons de
    bois, sur des pieds bas ; ses tasseaux défilent vers la droite (`phase` : 0 ou 1, deux
    images qui alternent quand elle tourne). `bout` : le dernier segment, avec le rouleau
    d'extrémité d'où la botte tombe."""
    t = Toile()
    pieds(t, (2, 12), BAS - 3, BAS)
    fin = 13 if bout else W - 1
    # la bande (le dessus), puis son épaisseur
    for y in range(BANDE, BANDE + 4):
        for x in range(0, fin + 1):
            raye = (x + 2 * phase) % 4 == 0
            t.put(x, y, CAOUTCHOUC[2] if raye else CAOUTCHOUC[1] if y > BANDE else CAOUTCHOUC[2] if x % 2 else CAOUTCHOUC[1])
    for x in range(0, fin + 1):
        t.put(x, BANDE + 4, CAOUTCHOUC[0])
    # les longerons (devant et derrière)
    for x in range(0, fin + 1):
        t.put(x, BANDE - 1, BOIS[3])
        t.put(x, BANDE + 5, BOIS[2])
        t.put(x, BANDE + 6, BOIS[1])
    if bout:                                     # le rouleau d'extrémité
        for y in range(BANDE - 1, BANDE + 6):
            t.put(14, y, FER[3] if y < BANDE + 2 else FER[2])
            t.put(15, y, FER[1])
        t.put(14, BANDE + 2, FER[4])
    return t.fini()


BOTTELEUSE = len(DESSINS)                        # l'entonnoir, la machine (à l'arrêt, en marche),
DESSINS += [entonnoir(), botteleuse(), botteleuse(True)]   # puis le convoyeur (BLOCS_CARTE.frames)
CONVOYEUR = len(DESSINS)
DESSINS += [convoyeur(0), convoyeur(1), convoyeur(0, True), convoyeur(1, True)]

# la meule qui moud (BLOCS_CARTE.meule) : sa pierre du dessus et sa manivelle font un tour en
# MEULE_IMAGES images (dans le sens inverse des aiguilles d'une montre)
MEULE = len(DESSINS)
MEULE_IMAGES = 8
DESSINS += [meule(-2 * 3.141592653589793 * k / MEULE_IMAGES) for k in range(MEULE_IMAGES)]

# ---------- l'aperçu : une pièce close et les objets, sur l'herbe de la carte ----------

PIECE = [
    'MMMMMMM...',
    'M=f=c=M...',
    'M=====P.MM',
    'M=p=d=M.MM',
    'MMMPMMM...',
    '..........',
    'a.n.g.s.r.',
    '..........',
    'b.m.o.l...',
    '..........',
    'BBBB..B...',
    '...B..B...',
    '...BBBB...',
]
SORTES = {'f': 5, 'c': 6, 'p': 3, 'd': 4, 'a': 2, 'n': 9, 'g': 10, 's': 11, 'b': 8, 'm': 13, 'o': 12, 'r': 7, 'l': 67}


def boite_nourriture():
    """La boîte à nourriture : une caisse de planches ouverte, vue de haut, où la famille vient
    prendre à manger : des carottes, une tomate, une patate, une boîte de conserve."""
    t = Toile()
    yd, yf = boite(t, 1, 14, BAS - 1, 8, 10, BOIS, planches(BOIS, 'h', pas=3, y0=1))
    for y in range(yd + 1, yf - 1):              # le fond de la caisse, dans l'ombre
        for x in range(2, 14):
            t.put(x, y, BOIS[0] if (x + y) % 4 else BOIS[1])
    # deux carottes couchées, leurs fanes
    for x in range(3, 7):
        t.put(x, yd + 2, (226, 120, 40) if x < 6 else (196, 92, 30))
    t.put(7, yd + 2, VERT[2]); t.put(7, yd + 1, VERT[3])
    for x in range(4, 8):
        t.put(x, yd + 4, (226, 120, 40) if x < 7 else (196, 92, 30))
    t.put(8, yd + 4, VERT[2]); t.put(8, yd + 3, VERT[3])
    # une tomate
    t.rect(9, yd + 1, 11, yd + 3, (204, 52, 48))
    t.put(9, yd + 1, (236, 110, 96)); t.put(10, yd, VERT[2])
    # une patate
    t.rect(10, yd + 4, 12, yd + 5, (176, 132, 76))
    t.put(12, yd + 5, (140, 100, 56))
    # une boîte de conserve, debout dans le coin
    t.rect(2, yd - 2, 4, yd + 1, (150, 156, 166))
    t.rect(2, yd - 1, 4, yd, (196, 60, 52))
    t.put(2, yd - 2, (214, 220, 228))
    for x in range(2, 14):
        t.put(x, BAS - 1, BOIS[0])
    return t.fini()


BOITE_NOURRITURE = len(DESSINS)                  # la boîte à nourriture (BLOCS_CARTE.frames.boite_nourriture)
DESSINS += [boite_nourriture()]


# ---------- les modèles de sols ----------
# Les sols qu'on fabrique à l'Atelier en plus du plancher (MODELES_SOLS, dans l'ordre de
# BLOCS_CARTE.modelesSols) : chacun un motif de 16 px de période (une fonction de x et de la
# rangée v de la case : sa couleur ; deux sols voisins de même sorte se raccordent), le ton du
# bord du haut et celui du chant du bas, comme le plancher.
DALLE = [(70, 64, 56), (128, 120, 106), (150, 142, 126), (172, 164, 146), (198, 190, 172)]
DAMIER = [(46, 50, 60), (62, 68, 80), (226, 220, 200), (244, 240, 226)]
TOMETTE = [(92, 40, 24), (150, 70, 42), (176, 88, 54), (198, 108, 68), (220, 140, 96)]
CHEVRON = [(112, 70, 36), (176, 120, 62), (198, 144, 82), (220, 170, 108)]
MARBRE = [(150, 150, 162), (184, 184, 194), (218, 218, 226), (236, 236, 242)]
PAVE = [(54, 50, 48), (104, 100, 96), (128, 124, 118), (152, 146, 138), (178, 172, 162)]
MOSAIQUE = [(214, 206, 186), (232, 188, 72), (98, 158, 214), (36, 70, 140)]


def motif_dalles(x, v):
    """De grandes dalles de pierre de 8 px, décalées d'une rangée à l'autre."""
    r = v // 8
    d = (x + 4 * (r % 2)) % 16
    if v % 8 == 7 or d % 8 == 7:
        return DALLE[0]
    if v % 8 == 0 or d % 8 == 0:
        return DALLE[4]
    k = hasard(r, d // 8, 3)
    return DALLE[1] if k < 0.33 else DALLE[2] if k < 0.66 else DALLE[3]


def motif_damier(x, v):
    """Un carrelage noir et blanc de carreaux de 4 px, un reflet au coin de chaque carreau."""
    blanc = ((x // 4) + (v // 4)) % 2 == 0
    coin = x % 4 == 0 and v % 4 == 0
    return (DAMIER[3] if coin else DAMIER[2]) if blanc else (DAMIER[1] if coin else DAMIER[0])


def motif_tomettes(x, v):
    """Des tomettes de terre cuite, rangées en quinconce, les coins coupés (presque des
    hexagones), chacune son ton."""
    r = v // 4
    d = (x + 4 * (r % 2)) % 16
    if v % 4 == 3 or d % 8 == 7 or (v % 4 == 0 and d % 8 in (0, 6)):
        return TOMETTE[0]
    k = hasard(r, d // 8, 5)
    if v % 4 == 0:
        return TOMETTE[4]
    return TOMETTE[1] if k < 0.3 else TOMETTE[2] if k < 0.7 else TOMETTE[3]


def motif_chevrons(x, v):
    """Un parquet à chevrons (point de Hongrie) : des lames en biais, d'un sens puis de l'autre,
    par bandes de 4 px."""
    b, i = x // 4, x % 4
    if i == 3:
        return CHEVRON[0]
    k = (i + v) if b % 2 == 0 else (i - v)
    if k % 4 == 0:
        return CHEVRON[0]
    return CHEVRON[3] if (k // 4 + b) % 2 else CHEVRON[2]


def motif_marbre(x, v):
    """Des plaques de marbre blanc de 8 px, veinées de gris."""
    if v % 8 == 7 or x % 8 == 7:
        return MARBRE[1]
    veine = (x + v + (2 if (v // 3) % 2 else 0)) % 9 == 0 and hasard(x // 8, v // 8, 9) < 0.8
    if veine:
        return MARBRE[0]
    return MARBRE[3] if hasard(x, v, 11) < 0.35 else MARBRE[2]


def motif_paves(x, v):
    """Des pavés de 4 px, en quinconce, le haut de chacun éclairé."""
    r = v // 4
    d = (x + 2 * (r % 2)) % 16
    if v % 4 == 3 or d % 4 == 3:
        return PAVE[0]
    k = hasard(r, d // 4, 7)
    if v % 4 == 0 and d % 4 == 0:
        return PAVE[4]
    return PAVE[1] if k < 0.33 else PAVE[2] if k < 0.66 else PAVE[3]


def motif_mosaique(x, v):
    """Une mosaïque de tesselles de 3 px dans un joint clair : un losange or et bleu par case."""
    if x % 4 == 3 or v % 4 == 3:
        return MOSAIQUE[0]
    d = abs(x // 4 - 1.5) + abs(v // 4 - 1.5)
    return MOSAIQUE[1] if d < 1.5 else MOSAIQUE[2] if d < 2.5 else MOSAIQUE[3]


# id du bloc : (le motif, le bord du haut, le chant du bas)
MODELES_SOLS = {
    'sol_dalles': (motif_dalles, DALLE[4], DALLE[0]),
    'sol_carrelage': (motif_damier, DAMIER[3], DAMIER[0]),
    'sol_tomettes': (motif_tomettes, TOMETTE[4], TOMETTE[0]),
    'sol_chevrons': (motif_chevrons, CHEVRON[3], CHEVRON[0]),
    'sol_marbre': (motif_marbre, MARBRE[3], MARBRE[0]),
    'sol_paves': (motif_paves, PAVE[4], PAVE[0]),
    'sol_mosaique': (motif_mosaique, MOSAIQUE[0], MOSAIQUE[3]),
}


def sol_modele(m, motif, haut, chant):
    """Le sol de masque m (comme le plancher), du motif `motif`."""
    t = Toile()
    n, e, s, w = (m & 1, m & 2, m & 4, m & 8)
    y0 = H - T
    for y in range(y0, H):
        for x in range(W):
            t.put(x, y, motif(x, y - y0))
    if not s:
        for x in range(W):
            t.put(x, BAS - 1, chant)
            t.put(x, BAS, OUT)
    if not n:
        for x in range(W):
            t.put(x, y0, OUT)
            t.put(x, y0 + 1, haut)
    if not w:
        for y in range(y0, H):
            t.put(0, y, OUT)
    if not e:
        for y in range(y0, H):
            t.put(15, y, OUT)
    return t.im


SOLS_MODELES = len(DESSINS)                      # les sols, 16 images chacun (BLOCS_CARTE.modelesSols)
DESSINS += [sol_modele(m, *MODELES_SOLS[k]) for k in MODELES_SOLS for m in range(16)]
PORTES_VERTICALES = len(DESSINS)                 # les portes dans un mur vertical (BLOCS_CARTE.portesVerticales)
DESSINS += [porte_verticale(MODELES_PORTES[k][1]) for k in MODELES_PORTES]


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
    sol = [[x > 0 and y > 0 and x < 6 and y < 4 for x in range(len(PIECE[0]))] for y in range(len(PIECE))]
    for y in range(len(PIECE)):
        for x in range(len(PIECE[0])):
            if sol[y][x]:
                m = sum(b for b, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))) if sol[y + dy][x + dx])
                fond.alpha_composite(sheet.crop(((SOLS + m) * W, 0, (SOLS + m + 1) * W, H)), ((x + 1) * T, (y + 2) * T - H))
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
            elif ch == 'B':                    # une barrière, raccordée aux voisines
                k = BARRIERES + sum(b for b, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0)))
                                    if 0 <= y + dy < len(PIECE) and 0 <= x + dx < len(rang) and PIECE[y + dy][x + dx] == 'B')
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
    hauts, h = murs_hauts()
    rangee(hauts, W, h).save(os.path.join(ASSETS, 'murs_hauts.png'))
    print(f'assets/murs_hauts.png : {len(hauts)} images de {W} × {h}')
    for nom, matiere in FACADES:
        imm, h = immeuble_ville(matiere)
        rangee(imm, W, h).save(os.path.join(ASSETS, nom + '.png'))
        print(f'assets/{nom}.png : {len(imm)} images de {W} × {h}')
    if '--apercu' in sys.argv:
        apercu_piece(sheet)


if __name__ == '__main__':
    main()
