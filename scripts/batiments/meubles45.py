# Les meubles de la maison en vue de haut à 45°, comme les blocs (scripts/carte/blocs.py) : une
# hauteur de h px se voit sur h × HAUT (14/16), une profondeur de p px sur p × FOND (10/16). De chaque
# meuble on voit le dessus, raccourci, puis la face avant ; le bas de l'image est le bas de sa case
# (un meuble de deux cases : 32 px de large). Les tons et le contour sont ceux des blocs ; lumière
# en haut à gauche. Un fichier assets/meuble_<id>.png chacun (data/meubles.json, le Marché) :
#   - rangements : buffet (le vaisselier), commode, armoire_chene, armoire_peinte, armoire_glace ;
#   - cuisine : cuisine_porte, cuisine_tiroirs, cuisine_sauge (les blocs bas, au gabarit de la
#     cuisinière), poubelle ;
#   - salon et chambre : bibliotheque (étroite), bibliotheque_vitree, lampadaire, coffre_jouets ;
#   - dix plantes vertes : plante_ficus, plante_monstera, plante_sansevieria, plante_cactus,
#     plante_fougere, plante_palmier, plante_citronnier, plante_orchidee, plante_aloe, plante_bonsai.
#
#   python3 scripts/batiments/meubles45.py            écrit les images
#   python3 scripts/batiments/meubles45.py --apercu   écrit aussi apercu_meubles45.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'carte'))  # blocs.py
import blocs as B  # noqa: E402
from blocs import BOIS, FER, VERT, TERRE, PAILLE, OUT, HAUT, FOND, hasard  # noqa: E402
from pixel import ASSETS, ROOT, contour  # noqa: E402


class T:
    def __init__(self, w, h):
        self.W, self.H = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.W and 0 <= y < self.H and c is not None:
            self.px[x, y] = tuple(c[:3]) + (255,)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.put(x, y, c)

    def efface(self, x, y):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.px[x, y] = (0, 0, 0, 0)

    def fini(self):
        return contour(self.im, OUT)


def boite(t, x0, x1, base, h, p, dessus, face, arete=True):
    return B.boite(t, x0, x1, base, h, p, dessus, face, arete)


def ell(t, cx, cy, rx, ry, c):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1:
                t.put(x, y, c)


# les tons en plus (du plus sombre au plus clair)
BLEU = [(40, 58, 84), (62, 88, 120), (90, 122, 156), (128, 160, 188), (176, 200, 216)]
SAUGE = [(70, 88, 70), (96, 118, 92), (126, 148, 116), (160, 180, 146), (198, 212, 184)]
BLANC = [(150, 148, 140), (188, 186, 178), (214, 212, 204), (234, 232, 224), (248, 246, 240)]
LAITON = [(110, 80, 30), (160, 120, 40), (206, 164, 64), (236, 204, 110), (252, 236, 170)]
MIROIR = [(92, 116, 136), (128, 158, 178), (168, 198, 212), (214, 232, 238)]
TC = [(104, 50, 30), (146, 72, 44), (184, 100, 62), (212, 134, 90), (232, 170, 128)]
ROUGE = [(110, 34, 34), (156, 50, 46), (196, 72, 60), (224, 112, 92)]
JAUNE = [(170, 120, 30), (214, 166, 52), (240, 204, 96), (252, 232, 160)]
OSIER = [(120, 88, 44), (160, 122, 66), (196, 158, 96), (224, 194, 136)]
NOIR = [(30, 32, 36), (48, 52, 58), (74, 80, 88), (104, 110, 118)]
FEUILLE = [(22, 56, 32), (36, 86, 44), (56, 120, 54), (92, 160, 70), (150, 200, 100)]
LIVRES = [ROUGE[1], BLEU[1], VERT[1], JAUNE[1], BLANC[2], ROUGE[2], BLEU[2], SAUGE[1], BOIS[1]]
CREME = (240, 232, 210)


def poignee(t, x, y, c=LAITON):
    t.put(x, y, c[3])


def face_porte(t, r, x0, x1, y0, y1, moulure=True):
    """Une porte : le cadre clair en haut et à gauche, sombre en bas et à droite, le panneau."""
    t.rect(x0, y0, x1, y1, r[2])
    t.rect(x0, y0, x1, y0, r[3]); t.rect(x0, y0, x0, y1, r[3])
    t.rect(x0, y1, x1, y1, r[1]); t.rect(x1, y0, x1, y1, r[1])
    if moulure and x1 - x0 >= 5 and y1 - y0 >= 5:
        t.rect(x0 + 2, y0 + 2, x1 - 2, y0 + 2, r[1]); t.rect(x0 + 2, y0 + 2, x0 + 2, y1 - 2, r[1])
        t.rect(x0 + 3, y1 - 2, x1 - 2, y1 - 2, r[3]); t.rect(x1 - 2, y0 + 3, x1 - 2, y1 - 2, r[3])


def tiroir(t, r, x0, x1, y0, y1, poignees=1):
    t.rect(x0, y0, x1, y1, r[2])
    t.rect(x0, y0, x1, y0, r[3]); t.rect(x0, y1, x1, y1, r[0])
    if poignees == 1:
        poignee(t, (x0 + x1) // 2, (y0 + y1) // 2)
    else:
        poignee(t, x0 + 3, (y0 + y1) // 2); poignee(t, x1 - 3, (y0 + y1) // 2)


def pieds(t, xs, y0, y1, r=BOIS):
    for x in xs:
        t.rect(x, y0, x, y1, r[2]); t.rect(x + 1, y0, x + 1, y1, r[1])


def livres(t, x0, x1, ybas, h, graine):
    x, i = x0, graine
    while x <= x1:
        k = LIVRES[(i * 7 + 3) % len(LIVRES)]
        hh = h - (i * 5) % 3
        t.rect(x, ybas - hh + 1, x, ybas, k)
        t.put(x, ybas - hh + 1, CREME)
        x += 1
        if (i * 13) % 11 == 0:
            x += 1
        i += 1


# ---------------------------------------------------------------- rangements
def buffet():
    """Le buffet vaisselier (2 cases) : le bas à deux tiroirs et deux portes, et posé sur le
    fond de son plateau, le haut ouvert : deux étagères d'assiettes et de bols."""
    W, H = 32, 42
    t = T(W, H)
    pieds(t, (2, 28), H - 2, H - 1)
    yd, yf = boite(t, 1, 30, H - 3, 14, 11, BOIS, BOIS)
    for x0, x1 in ((1, 15), (16, 30)):
        tiroir(t, BOIS, x0 + 1, x1 - 1, yf, yf + 2)
        face_porte(t, BOIS, x0 + 1, x1 - 1, yf + 3, H - 4)
    poignee(t, 14, yf + 7); poignee(t, 17, yf + 7)
    # le haut : 5 px de fond, sur le fond du plateau (les 3 rangées du haut du plateau)
    hd2, hf2 = boite(t, 2, 29, yd + 2, 18, 5, BOIS, BOIS)
    t.rect(1, hd2 - 1, 30, hd2 + 1, BOIS[3]); t.rect(1, hd2 - 1, 30, hd2 - 1, BOIS[4])   # corniche
    t.rect(4, hf2 + 1, 27, yd + 1, BOIS[0])                     # le dedans, dans l'ombre
    for y in (hf2 + 8, yd + 1):
        t.rect(4, y, 27, y, BOIS[3])                             # les étagères (leur chant)
    for i, x in enumerate(range(5, 26, 5)):                      # assiettes debout
        ell(t, x + 2, hf2 + 4.5, 2.2, 3, BLANC[4]); ell(t, x + 2, hf2 + 4.5, 1, 1.5, BLEU[2] if i % 2 else BLANC[2])
    for x in range(5, 27, 4):                                    # bols et tasses
        t.rect(x, yd - 2, x + 2, yd, BLANC[3] if x % 8 == 5 else BLEU[2]); t.put(x, yd - 2, BLANC[4])
    t.rect(2, hf2, 3, yd + 1, BOIS[3]); t.rect(28, hf2, 29, yd + 1, BOIS[1])   # montants
    # devant le haut, sur le plateau : une cruche
    t.rect(22, yd + 1, 25, yd + 4, BLANC[3]); t.put(26, yd + 2, BLANC[1]); t.rect(22, yd + 1, 25, yd + 1, BLANC[4])
    return t.fini()


def commode():
    """La commode (2 cases) : trois rangs de tiroirs ; dessus, un cadre photo et un vase."""
    W, H = 32, 30
    t = T(W, H)
    pieds(t, (2, 28), H - 2, H - 1)
    yd, yf = boite(t, 1, 30, H - 3, 14, 10, BOIS, BOIS)
    n, y = 3, yf
    for k in range(n):
        y1 = yf + (k + 1) * (H - 3 - yf + 1) // n - 1
        tiroir(t, BOIS, 2, 29, y, y1, poignees=2)
        y = y1 + 1
    # le cadre photo, debout sur le fond du plateau
    t.rect(5, yd - 5, 10, yd + 2, LAITON[2]); t.rect(5, yd - 5, 10, yd - 5, LAITON[3])
    t.rect(6, yd - 4, 9, yd + 1, (168, 210, 236)); t.rect(6, yd - 1, 9, yd + 1, VERT[2]); t.put(7, yd - 2, ROUGE[2])
    # le vase bleu et ses fleurs
    ell(t, 23.5, yd + 3, 3, 1.6, BLEU[1])
    t.rect(21, yd - 2, 26, yd + 3, BLEU[2]); t.rect(21, yd - 2, 21, yd + 3, BLEU[3]); t.rect(26, yd - 2, 26, yd + 3, BLEU[1])
    ell(t, 23.5, yd - 2, 2.5, 1.2, BLEU[0])
    for x, y, c in ((21, yd - 6, ROUGE[3]), (24, yd - 8, JAUNE[2]), (26, yd - 5, ROUGE[2]), (23, yd - 5, CREME)):
        t.rect(x, y, x + 1, y + 1, c)
    t.rect(23, yd - 4, 23, yd - 3, VERT[1]); t.put(25, yd - 4, VERT[2])
    return t.fini()


def armoire_chene():
    """L'armoire de chêne (2 cases) : la corniche qui déborde, deux portes en chapeau de gendarme."""
    W, H = 32, 46
    t = T(W, H)
    pieds(t, (2, 28), H - 2, H - 1)
    yd, yf = boite(t, 1, 30, H - 3, 38, 11, BOIS, BOIS)
    t.rect(0, yd, 31, yf + 1, BOIS[3]); t.rect(0, yd, 31, yd, BOIS[4])           # la corniche, plus large
    t.rect(1, yd + 1, 30, yf - 1, BOIS[3]); t.rect(1, yd + 1, 3, yf - 1, BOIS[4])
    t.rect(0, yf, 31, yf + 1, BOIS[2]); t.rect(0, yf + 1, 31, yf + 1, BOIS[1])
    for x0, x1 in ((3, 14), (17, 28)):
        for y in range(yf + 4, H - 6):
            for x in range(x0, x1 + 1):
                top = yf + 6 - 2 * math.sin(math.pi * (x - x0) / (x1 - x0))
                if y < top:
                    continue
                bord = y < top + 1 or x == x0
                t.put(x, y, BOIS[3] if bord else BOIS[1] if (x == x1 or y == H - 7) else BOIS[2])
        t.rect(x0 + 2, (yf + H) // 2, x1 - 2, (yf + H) // 2, BOIS[3])
    t.rect(15, yf + 2, 16, H - 5, BOIS[0])                                          # la fente entre les portes
    poignee(t, 13, (yf + H) // 2 - 2); poignee(t, 18, (yf + H) // 2 - 2)
    t.rect(1, H - 4, 30, H - 3, BOIS[1])                                            # la plinthe
    return t.fini()


def armoire_peinte():
    """L'armoire de campagne peinte en bleu (2 cases) : filets blancs, un bouquet peint par porte."""
    W, H = 32, 46
    t = T(W, H)
    pieds(t, (2, 28), H - 2, H - 1, BLEU)
    yd, yf = boite(t, 1, 30, H - 3, 38, 11, BLEU, BLEU)
    t.rect(0, yf - 1, 31, yf + 1, BLANC[3]); t.rect(0, yf + 1, 31, yf + 1, BLANC[1])
    t.rect(15, yf + 2, 16, H - 4, BLEU[0])
    for x0, x1 in ((3, 13), (18, 28)):
        t.rect(x0, yf + 4, x1, H - 6, BLANC[2]); t.rect(x0 + 1, yf + 5, x1 - 1, H - 7, BLEU[2])
        t.rect(x0 + 1, yf + 5, x0 + 1, H - 7, BLEU[3])
        cx, cy = (x0 + x1) // 2, yf + 12
        t.rect(cx, cy, cx, cy + 12, VERT[1])
        for dx, dy, c in ((0, -1, ROUGE[2]), (-1, 0, ROUGE[3]), (1, 0, ROUGE[3]), (0, 0, JAUNE[2]), (0, 1, ROUGE[1])):
            t.put(cx + dx, cy + dy, c)
        for dx, dy in ((-2, 4), (2, 6), (-2, 8), (2, 10)):
            t.rect(cx + min(dx, 0) + (1 if dx < 0 else 1), cy + dy, cx + max(dx, 0), cy + dy, VERT[2])
        t.put(cx - 2, cy + 3, ROUGE[2]); t.put(cx + 2, cy + 5, JAUNE[2])
    poignee(t, 14, yf + 18); poignee(t, 17, yf + 18)
    t.rect(1, H - 4, 30, H - 3, BLEU[0])
    return t.fini()


def armoire_glace():
    """L'armoire à glace (1 case) : le fronton cintré, la porte à miroir, un tiroir en bas."""
    W, H = 16, 46
    t = T(W, H)
    pieds(t, (2, 12), H - 2, H - 1)
    yd, yf = boite(t, 1, 14, H - 3, 38, 10, BOIS, BOIS)
    for x in range(1, 15):                                                          # le fronton
        hx = round(3 * math.sin(math.pi * (x - .5) / 14))
        t.rect(x, yf - hx, x, yf + 1, BOIS[2]); t.put(x, yf - hx, BOIS[4])
    # (le dessus remonte avec le fronton : le redessiner au-dessus)
    t.rect(1, yf + 1, 14, yf + 1, BOIS[1])
    t.rect(3, yf + 4, 12, H - 11, BOIS[3]); t.rect(4, yf + 5, 11, H - 12, MIROIR[1])
    t.rect(4, yf + 5, 5, H - 12, MIROIR[2]); t.rect(11, yf + 5, 11, H - 12, MIROIR[0])
    for i in range(6):                                                              # un reflet en biais
        t.put(6 + i // 2 + 0, yf + 9 + i * 2, MIROIR[3]); t.put(7 + i // 2, yf + 9 + i * 2, MIROIR[3])
    poignee(t, 13, (yf + H) // 2)
    tiroir(t, BOIS, 2, 13, H - 9, H - 5)
    return t.fini()


# ---------------------------------------------------------------- cuisine (même gabarit que la cuisinière)
def bas_cuisine(dessus, face, plinthe):
    t = T(16, 24)
    yd, yf = boite(t, 1, 14, 22, 11, 13, dessus, face)
    t.rect(1, 23, 14, 23, plinthe)
    return t, yd, yf


def bas_porte():
    """Bas à porte, chêne : une porte, un torchon à carreaux ; une miche de pain sur le plan."""
    t, yd, yf = bas_cuisine(BOIS, BOIS, BOIS[0])
    face_porte(t, BOIS, 2, 13, yf, 22)
    poignee(t, 11, yf + 3)
    t.rect(5, yf, 8, yf + 5, CREME); t.rect(5, yf + 2, 8, yf + 2, ROUGE[1]); t.rect(5, yf + 4, 8, yf + 4, ROUGE[1])
    ell(t, 7.5, yd + 4, 4.5, 2.4, PAILLE[2]); ell(t, 7, yd + 3.4, 3.2, 1.5, PAILLE[3])  # la miche
    t.put(5, yd + 4, PAILLE[1]); t.put(8, yd + 4, PAILLE[1])
    return t.fini()


def bas_tiroirs():
    """Bas à tiroirs, chêne : trois tiroirs ; un pot à ustensiles et une boîte à sel."""
    t, yd, yf = bas_cuisine(BOIS, BOIS, BOIS[0])
    for k in range(3):
        tiroir(t, BOIS, 2, 13, yf + k * 4 - (1 if k else 0) + (1 if k else 0), yf + k * 4 + 3 if k < 2 else 22)
    t.rect(9, yd, 12, yd + 4, BLANC[3]); t.rect(12, yd, 12, yd + 4, BLANC[1]); ell(t, 10.5, yd, 2, 1, BLANC[1])
    t.rect(10, yd - 4, 10, yd - 1, BOIS[3]); t.rect(11, yd - 3, 11, yd - 1, FER[3]); t.put(11, yd - 4, FER[4])
    t.rect(2, yd + 3, 6, yd + 5, ROUGE[1]); t.rect(2, yd + 3, 6, yd + 3, ROUGE[3])
    return t.fini()


def bas_sauge():
    """Bas vitré, peint vert sauge : plan de marbre, porte vitrée sur la vaisselle, un basilic."""
    marbre = [BLANC[0], BLANC[1], BLANC[2], BLANC[3], BLANC[4]]
    t, yd, yf = bas_cuisine(marbre, SAUGE, SAUGE[0])
    for x, y in ((3, 2), (4, 3), (5, 3), (10, 5), (11, 6), (12, 6)):
        t.put(x, yd + y, BLANC[1])
    face_porte(t, SAUGE, 2, 13, yf, 22, moulure=False)
    t.rect(4, yf + 2, 11, 20, (176, 212, 226))
    t.rect(4, yf + 6, 11, yf + 6, SAUGE[3])
    for x in range(5, 11, 2):
        t.rect(x, yf + 3, x, yf + 5, BLANC[4])                               # assiettes de chant
    t.rect(5, yf + 8, 6, yf + 9, BLEU[2]); t.rect(8, yf + 8, 9, yf + 9, BLANC[4])
    t.put(4, yf + 2, BLANC[4]); t.put(5, yf + 2, BLANC[4])
    poignee(t, 12, yf + 5)
    t.rect(10, yd + 1, 13, yd + 4, TC[2]); t.rect(13, yd + 1, 13, yd + 4, TC[1])   # pot de basilic
    ell(t, 11.5, yd - .5, 2.8, 2, FEUILLE[2]); t.put(10, yd - 1, FEUILLE[4]); t.put(12, yd, FEUILLE[1])
    return t.fini()


def pot(t, cx, gy, r, h, rp, terre=True, rebord=True):
    """Un pot rond posé au sol (gy : la rangée de son centre au sol) : la face bombée ombrée de
    gauche à droite, son bas arrondi, l'ouverture en ellipse (la terre dedans). Renvoie la
    rangée du centre de l'ouverture."""
    ry = r * FOND
    top = gy - h * HAUT
    for y in range(int(top), int(gy + ry) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            dx = (x + .5 - cx) / r
            if abs(dx) > 1:
                continue
            if y + .5 > gy + ry * math.sqrt(max(0, 1 - dx * dx)):
                continue
            k = 3 if dx < -.45 else 2 if dx < .35 else 1
            t.put(x, y, rp[k])
    if rebord:
        ell(t, cx, top, r + .6, ry + .5, rp[3])
    ell(t, cx, top, r - .4, ry - .3, TERRE[1] if terre else rp[0])
    return top


def poubelle():
    """La poubelle à pédale : le seau de métal, le couvercle bombé, sa charnière, la pédale."""
    t = T(16, 24)
    for y in range(9, 21):
        for x in range(2, 14):
            dx = (x + .5 - 8) / 6
            if y + .5 > 18 + 3.4 * math.sqrt(max(0, 1 - dx * dx)) or abs(dx) > 1:
                continue
            t.put(x, y, FER[4] if dx < -.5 else FER[3] if dx < .3 else FER[2])
    t.rect(2, 11, 13, 11, FER[2])
    ell(t, 8, 8.5, 6.3, 3.8, FER[2]); ell(t, 7.4, 8, 5, 3, FER[3]); ell(t, 6.5, 7.4, 2.5, 1.2, FER[4])
    t.rect(7, 4, 9, 4, FER[1])
    t.rect(6, 21, 10, 22, NOIR[1]); t.rect(6, 21, 10, 21, NOIR[3])
    return t.fini()


# ---------------------------------------------------------------- salon, chambre
def bibli_etroite():
    """La bibliothèque étroite, ouverte (1 case) : quatre rayons, des livres et des bibelots."""
    W, H = 16, 46
    t = T(W, H)
    yd, yf = boite(t, 1, 14, H - 1, 40, 8, BOIS, BOIS)
    t.rect(3, yf + 1, 12, H - 3, BOIS[0])
    rayons = [yf + 1 + k * 9 for k in range(1, 5)]
    for y in rayons:
        t.rect(3, y - 1, 12, y - 1, BOIS[1]); t.rect(3, y, 12, y, BOIS[3])
    livres(t, 3, 12, rayons[0] - 2, 6, 1)
    livres(t, 3, 7, rayons[1] - 2, 6, 4)
    ell(t, 10, rayons[1] - 4, 1.8, 2.2, BLEU[2]); t.put(9, rayons[1] - 5, BLEU[3])         # un vase
    t.rect(8, rayons[2] - 7, 11, rayons[2] - 2, LAITON[2]); t.rect(9, rayons[2] - 6, 10, rayons[2] - 3, (168, 210, 236))
    livres(t, 3, 6, rayons[2] - 2, 5, 9)
    livres(t, 4, 12, rayons[3] - 2, 6, 6)
    t.rect(1, H - 2, 14, H - 1, BOIS[1])
    return t.fini()


def bibli_vitree():
    """La grande bibliothèque vitrée (2 cases) : trois rayons derrière des portes à petits
    carreaux, un placard en bas."""
    W, H = 32, 46
    t = T(W, H)
    yd, yf = boite(t, 1, 30, H - 1, 40, 10, BOIS, BOIS)
    t.rect(0, yd, 31, yd + 1, BOIS[4]); t.rect(0, yf - 1, 31, yf + 1, BOIS[2]); t.rect(0, yf + 1, 31, yf + 1, BOIS[1])
    bas = H - 12
    t.rect(3, yf + 3, 28, bas - 2, BOIS[0])
    rayons = [yf + 3 + k * 7 for k in range(1, 4)]
    for k, y in enumerate(rayons):
        livres(t, 3, 28, y - 1, 6, 2 + 3 * k)
        t.rect(3, y, 28, y, BOIS[3])
    for x0 in (2, 16):                                                                     # les portes vitrées
        x1 = x0 + 13
        for y in range(yf + 2, bas - 1):
            for x in range(x0, x1 + 1):
                if x in (x0, x1, (x0 + x1) // 2) or y in (yf + 2, bas - 2) or (y - yf - 2) % 7 == 0:
                    t.put(x, y, BOIS[3] if x == x0 or y == yf + 2 else BOIS[2])
                elif (x + y) % 11 == 0 and (y - yf) % 7 < 4:
                    t.put(x, y, (200, 228, 240))
    t.rect(1, bas - 1, 30, bas - 1, BOIS[3])
    face_porte(t, BOIS, 2, 15, bas, H - 3); face_porte(t, BOIS, 16, 29, bas, H - 3)
    poignee(t, 14, bas + 4); poignee(t, 17, bas + 4)
    t.rect(1, H - 2, 30, H - 1, BOIS[1])
    return t.fini()


def lampadaire():
    """Le lampadaire : le socle rond, la tige de laiton, l'abat-jour plissé ; par son ouverture
    du haut, on voit l'ampoule."""
    W, H = 16, 46
    t = T(W, H)
    gy = H - 1 - 5
    ell(t, 8, gy, 4.5, 2.8, LAITON[1]); ell(t, 7.4, gy - .6, 3.2, 1.8, LAITON[3])
    t.rect(7, 12, 8, gy - 1, LAITON[2]); t.rect(7, 12, 7, gy - 1, LAITON[4])
    t.rect(6, 26, 9, 26, LAITON[1])
    top, bot = 2, 13
    for y in range(top, bot + 1):
        f = (y - top) / (bot - top)
        r = 3 + f * 3.4
        for x in range(0, W):
            dx = (x + .5 - 8) / r
            if abs(dx) <= 1:
                k = 3 if dx < -.4 else 2 if dx < .3 else 1
                if x % 3 == 1 and 0 < y - top < bot - top:
                    k = max(1, k - 1)
                t.put(x, y, JAUNE[k])
    ell(t, 8, bot, 6.4, 2.2, JAUNE[2]); t.rect(2, bot, 14, bot, JAUNE[0])
    ell(t, 8, top, 3.3, 2, JAUNE[3]); ell(t, 8, top + .3, 2.2, 1.2, (255, 248, 210))      # le haut ouvert, l'ampoule
    return t.fini()


def coffre_jouets():
    """Le coffre à jouets (2 cases) : peint en rouge, des cubes ABC sur la face ; le couvercle
    ouvert, relevé contre le mur ; dedans, vus de haut, un nounours, un ballon, une quille."""
    W, H = 32, 30
    t = T(W, H)
    yd, yf = boite(t, 2, 29, H - 2, 10, 11, ROUGE + [ROUGE[3]], ROUGE + [ROUGE[3]])
    # le couvercle relevé : sa face intérieure, jaune à pois
    t.rect(2, yd - 9, 29, yd, JAUNE[2]); t.rect(2, yd - 9, 29, yd - 9, JAUNE[3]); t.rect(2, yd, 29, yd, JAUNE[0])
    for x in range(5, 28, 5):
        t.put(x, yd - 6, ROUGE[2]); t.put(x + 2, yd - 3, BLEU[2])
    # le dedans : le bord (le chant des planches), le creux sombre, les jouets
    t.rect(3, yd + 1, 28, yf - 2, ROUGE[0])
    t.rect(2, yf - 1, 29, yf - 1, ROUGE[3])
    ell(t, 9, yd + 4, 3.5, 3, PAILLE[2]); ell(t, 6.5, yd + 1.5, 1.3, 1.2, PAILLE[2]); ell(t, 11.5, yd + 1.5, 1.3, 1.2, PAILLE[2])
    t.put(8, yd + 3, OUT); t.put(10, yd + 3, OUT); t.put(9, yd + 5, PAILLE[0]); t.put(8, yd + 4, PAILLE[3])
    ell(t, 17, yd + 4, 3, 2.8, BLEU[2]); t.rect(15, yd + 3, 19, yd + 3, BLANC[4]); t.put(16, yd + 2, BLEU[4])
    t.rect(22, yd + 1, 26, yd + 3, VERT[2]); t.rect(22, yd + 1, 26, yd + 1, VERT[3]); t.rect(23, yd + 4, 24, yd + 5, JAUNE[1])
    # la face : trois cubes ABC peints
    L = {'A': ('.#.', '#.#', '###', '#.#'), 'B': ('##.', '###', '#.#', '##.'), 'C': ('.##', '#..', '#..', '.##')}
    for i, (c, l) in enumerate(((JAUNE[1], 'A'), (BLEU[2], 'B'), (VERT[2], 'C'))):
        x = 6 + i * 8
        t.rect(x, yf + 1, x + 5, yf + 6, c); t.rect(x, yf + 1, x + 5, yf + 1, CREME)
        for dy, ligne in enumerate(L[l]):
            for dx, ch in enumerate(ligne):
                if ch == '#':
                    t.put(x + 1 + dx, yf + 2 + dy, CREME)
    t.rect(2, H - 1, 4, H - 1, ROUGE[0]); t.rect(27, H - 1, 29, H - 1, ROUGE[0])
    return t.fini()


# ---------------------------------------------------------------- plantes
def feuille(t, cx, cy, r, rp, i=0, ry=None):
    ry = ry or r * .8
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            u, v = (x + .5 - cx) / r, (y + .5 - cy) / ry
            if abs(u) + abs(v) <= 1.05:
                k = 3 if (u + v) < -.35 else 1 if (u + v) > .45 else 2
                t.put(x, y, rp[k + (1 if (i + x + y) % 7 == 0 and k < 3 else 0)])


def touffe(t, cx, cy, rx, ry, rp, n, r, graine=1, haut=0):
    """Un feuillage vu de haut à 45° : des feuilles semées dans une ellipse, celles du fond
    d'abord ; le bas (vers nous, dans l'ombre) plus sombre."""
    pts = []
    for i in range(n):
        a = hasard(graine, i) * 2 * math.pi
        d = math.sqrt(hasard(i, graine + 7))
        pts.append((cx + math.cos(a) * d * rx, cy + math.sin(a) * d * ry - haut * (1 - d)))
    pts.sort(key=lambda p: p[1])
    for i, (x, y) in enumerate(pts):
        sombre = (y - cy) / ry > .35
        feuille(t, x, y, r, [rp[0]] + rp[0:4] if sombre else rp, i)


def plante_ficus():
    t = T(32, 46)
    gy = 45 - 5
    top = pot(t, 16, gy, 5, 10, BLANC)
    t.rect(15, 18, 16, int(top), BOIS[1]); t.put(14, 26, BOIS[1]); t.put(17, 22, BOIS[1])
    touffe(t, 16, 13, 9.5, 8, FEUILLE, 60, 2.3, 5, 3)
    return t.fini()


def plante_monstera():
    t = T(32, 34)
    gy = 33 - 5
    top = pot(t, 16, gy, 6, 9, OSIER, rebord=True)
    for y in range(int(top) + 2, gy + 3, 2):
        t.rect(10, y, 22, y, OSIER[0])
    for i, (cx, cy, r) in enumerate([(9, 11, 5.5), (23, 10, 5.5), (16, 6, 5), (7, 18, 5), (25, 18, 5), (16, 15, 5.5)]):
        ell(t, cx, cy, r, r * .78, FEUILLE[1] if i % 2 else FEUILLE[2])
        ell(t, cx - 1, cy - 1, r * .62, r * .45, FEUILLE[3])
        t.rect(int(cx), int(cy - r * .6), int(cx), int(cy + r * .6), FEUILLE[0])
    im = t.fini()
    px = im.load()
    for x, y in ((7, 12), (11, 11), (21, 11), (25, 10), (15, 7), (6, 19), (26, 19), (14, 16), (18, 16)):
        px[x, y] = (0, 0, 0, 0)
    return im


def plante_sansevieria():
    t = T(16, 34)
    gy = 33 - 5
    top = pot(t, 8, gy, 5, 9, NOIR)
    for i, (x, h, pench) in enumerate([(4, 13, -1), (6, 20, 0), (9, 18, 1), (11, 12, 1), (7, 11, -1), (10, 15, 0)]):
        for y in range(int(top) - h, int(top) + 1):
            xx = x + (pench if y < top - h / 2 else 0)
            t.put(xx, y, FEUILLE[1]); t.put(xx + 1, y, FEUILLE[3] if (y // 2 + i) % 3 else (176, 196, 120))
        t.put(x + (pench if pench else 0) + 1, int(top) - h, (176, 196, 120))
    return t.fini()


def plante_cactus():
    t = T(16, 36)
    gy = 35 - 5
    top = pot(t, 8, gy, 4.5, 8, TC)

    def colonne(x0, x1, y0, y1):
        t.rect(x0, y0, x1, y1, FEUILLE[2]); t.rect(x0, y0, x0, y1, FEUILLE[3]); t.rect(x1, y0, x1, y1, FEUILLE[1])
        ell(t, (x0 + x1 + 1) / 2, y0, (x1 - x0 + 1) / 2, 1, FEUILLE[4])
        for y in range(y0 + 2, y1, 3):
            t.put((x0 + x1) // 2, y, CREME)
    colonne(6, 9, 6, int(top))
    colonne(2, 4, 11, 17); t.rect(3, 17, 6, 18, FEUILLE[2])
    colonne(11, 13, 9, 15); t.rect(9, 15, 12, 16, FEUILLE[2])
    t.put(7, 4, (224, 120, 150)); t.put(8, 4, (224, 120, 150)); t.put(7, 3, (246, 220, 232))
    return t.fini()


def plante_fougere():
    t = T(32, 30)
    gy = 29 - 5
    top = pot(t, 16, gy, 5, 8, BLEU)
    t.rect(11, int(top) + 3, 21, int(top) + 3, BLANC[3])
    for i, ang in enumerate([-175, -155, -132, -110, -90, -70, -48, -25, -5, -100, -80]):
        a = math.radians(ang)
        for s in range(13):
            f = s / 13
            x = 16 + math.cos(a) * s * 1.1
            y = top - 1 + math.sin(a) * s * .85 + f * f * 7
            rp = FEUILLE[1:] if i % 2 else FEUILLE
            t.put(x, y, rp[0])
            for side in (-1, 1):
                for e in range(1, 3 if s < 10 else 2):
                    t.put(x - math.sin(a) * side * e, y + math.cos(a) * side * e * .8, rp[2] if side > 0 else rp[3])
    ell(t, 16, top - 1, 4, 2, FEUILLE[2])
    return t.fini()


def plante_palmier():
    t = T(32, 46)
    gy = 45 - 5
    top = pot(t, 16, gy, 6, 10, BLANC)
    for x0, y0 in ((14, 15), (17, 19)):
        t.rect(x0, y0, x0 + 1, int(top), BOIS[2])
        for y in range(y0, int(top), 3):
            t.put(x0, y, BOIS[3]); t.put(x0 + 1, y + 1, BOIS[1])
    for cx, cy, angs in ((15, 15, (-165, -125, -90, -55, -15)), (18, 19, (-175, -145, -35, -5))):
        for a in angs:
            r = math.radians(a)
            for s in range(14):
                x = cx + math.cos(r) * s
                y = cy + math.sin(r) * s * .7 + (s / 14) ** 2 * 8
                t.put(x, y, FEUILLE[0])
                if s > 2:
                    t.put(x, y + 1, FEUILLE[2]); t.put(x, y - 1, FEUILLE[3] if s % 2 else FEUILLE[2])
    return t.fini()


def plante_citronnier():
    t = T(32, 46)
    gy = 45 - 5
    top = pot(t, 16, gy, 5.5, 9, TC)
    t.rect(11, int(top) + 3, 21, int(top) + 3, TC[0])
    t.rect(15, 18, 16, int(top), BOIS[1])
    ell(t, 16, 11, 10, 8.5, FEUILLE[1]); ell(t, 15, 10, 8.5, 7, FEUILLE[2]); ell(t, 13, 8, 5, 4, FEUILLE[3])
    for i in range(18):
        x, y = 7 + hasard(i, 2) * 18, 4 + hasard(3, i) * 14
        t.put(x, y, FEUILLE[4] if y < 10 else FEUILLE[0])
    for x, y in ((10, 9), (19, 6), (22, 13), (15, 15), (8, 15)):
        t.rect(x, y, x + 1, y + 1, (246, 222, 70)); t.put(x, y, (252, 244, 160))
    return t.fini()


def plante_orchidee():
    t = T(16, 32)
    gy = 31 - 5
    top = pot(t, 8, gy, 4, 8, BLANC, terre=False)
    ell(t, 5.5, top - .5, 3.5, 1.5, FEUILLE[2]); ell(t, 10.5, top, 3.5, 1.5, FEUILLE[1]); ell(t, 5, top - 1, 2, .8, FEUILLE[3])
    t.rect(8, 6, 8, int(top) - 1, FEUILLE[0]); t.rect(9, 5, 11, 5, FEUILLE[0])
    for x, y in ((11, 6), (6, 8), (11, 10), (6, 12), (9, 14)):
        t.rect(x - 1, y - 1, x + 1, y + 1, (246, 220, 232)); t.put(x, y, (224, 120, 150)); t.put(x, y + 1, ROUGE[1])
    return t.fini()


def plante_aloe():
    t = T(16, 26)
    gy = 25 - 5
    top = pot(t, 8, gy, 4.5, 7, TC)
    t.rect(4, int(top) + 3, 12, int(top) + 3, BLANC[4]); t.rect(4, int(top) + 4, 12, int(top) + 4, BLEU[2])
    for a in (-170, -140, -112, -90, -68, -40, -10, -100):
        r = math.radians(a)
        for s in range(8):
            x = 8 + math.cos(r) * s; y = top - .5 + math.sin(r) * s * .9
            t.put(x, y, (176, 196, 120) if s % 3 == 0 else FEUILLE[3])
            if s < 5:
                t.put(x + 1, y, FEUILLE[2])
    return t.fini()


def plante_bonsai():
    t = T(32, 28)
    # la coupe émaillée, basse et large : un pavé arrondi
    yd, yf = boite(t, 4, 27, 25, 5, 10, ROUGE + [ROUGE[3]], ROUGE + [ROUGE[3]])
    t.rect(5, yd + 1, 26, yf - 2, TERRE[1]); t.rect(8, yd + 2, 23, yf - 2, VERT[1])
    t.rect(6, 26, 8, 27, ROUGE[0]); t.rect(23, 26, 25, 27, ROUGE[0])
    t.rect(15, 10, 17, yd + 3, BOIS[1]); t.rect(11, 12, 15, 13, BOIS[1]); t.rect(17, 8, 21, 9, BOIS[1]); t.put(16, yd + 2, BOIS[0])
    for cx, cy, rx in ((9, 10, 5.5), (22, 6, 6), (15, 4, 4)):
        ell(t, cx, cy, rx, 2.8, FEUILLE[1]); ell(t, cx - .7, cy - .7, rx - 1.2, 1.7, FEUILLE[2]); t.put(int(cx) - 2, int(cy) - 1, FEUILLE[3])
    return t.fini()


MEUBLES = {
    'buffet': buffet, 'commode': commode, 'armoire_chene': armoire_chene, 'armoire_peinte': armoire_peinte,
    'armoire_glace': armoire_glace, 'cuisine_porte': bas_porte, 'cuisine_tiroirs': bas_tiroirs,
    'cuisine_sauge': bas_sauge, 'poubelle': poubelle, 'bibliotheque': bibli_etroite,
    'bibliotheque_vitree': bibli_vitree, 'lampadaire': lampadaire, 'coffre_jouets': coffre_jouets,
    'plante_ficus': plante_ficus, 'plante_monstera': plante_monstera, 'plante_sansevieria': plante_sansevieria,
    'plante_cactus': plante_cactus, 'plante_fougere': plante_fougere, 'plante_palmier': plante_palmier,
    'plante_citronnier': plante_citronnier, 'plante_orchidee': plante_orchidee, 'plante_aloe': plante_aloe,
    'plante_bonsai': plante_bonsai,
}


def main():
    out = {k: f() for k, f in MEUBLES.items()}
    for k, im in out.items():
        im.save(os.path.join(ASSETS, f'meuble_{k}.png'), optimize=True)
    if '--apercu' in sys.argv:
        k, gap = 4, 8
        W = sum(im.width * k + gap for im in out.values())
        H = max(im.height for im in out.values()) * k
        ap = Image.new('RGBA', (W, H), (152, 124, 88, 255))
        x = 0
        for im in out.values():
            big = im.resize((im.width * k, im.height * k), Image.NEAREST)
            ap.alpha_composite(big, (x, H - big.height))
            x += big.width + gap
        ap.save(os.path.join(ROOT, 'apercu_meubles45.png'))
    print(f'meubles de la maison (vue à 45°) : {len(out)} images')


if __name__ == '__main__':
    main()
