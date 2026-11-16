# L'étal du joueur (le chantier « l'île à bâtir », fiche I4 : data/recipes.json ATELIER.BLOCS etal, fabriqué à
# l'Atelier, posé dehors) : le joueur y met en vente ce qu'il veut, les villageois viennent y acheter
# (js/engine/bourse.js). Deux cases de large ; il monte au-dessus de sa case (32 × 40 : le bas de l'image est le bas
# de la case, l'auvent empiète sur la case du dessus). Vu de haut à 45° (CLAUDE.md ; la projection de
# scripts/carte/blocs.py : une hauteur de h px sur h × 14/16 rangées, une profondeur de p px sur p × 10/16) :
#   - le comptoir : 11 px de haut (10 rangées de face), toute la profondeur de sa case (10 rangées de dessus) ; sa
#     face de planches verticales (chacune son bois, son biseau : le bord gauche clair, le droit sombre ; le fil, un
#     nœud), le chant avant du plateau au soleil, le pied plus sombre (l'occlusion) ; son plateau de trois planches
#     en long, plus clair vers l'avant, plus sombre au fond, sous l'auvent ;
#   - deux poteaux au fond (la face gauche éclairée, la droite dans l'ombre) qui portent l'auvent de toile rayée :
#     son dessus raccourci (les rayures rouges et crème, chacune sa nuance, les plis), puis son lambrequin à festons
#     qui pend devant (une face, plus sombre que le dessus) ;
#   - une ardoise accrochée à la face (les prix à la craie) ;
#   - vide : une cagette vide (on voit son fond, plus clair vers l'avant, sa paroi gauche éclairée, la droite dans
#     l'ombre) et un torchon plié ;
#   - garni : un panier d'osier de pommes (l'intérieur vu d'en haut, chaque pomme modelée, son reflet), une cagette de
#     carottes (leurs fanes), un pot de miel (le verre, le miel qui s'y éclaire, le couvercle de tissu), une meule de
#     fromage entamée.
# La lumière en haut à gauche ; un contour sombre d'un pixel. Pas d'ombre portée (un bloc de la ferme : la scène
# peint celle du soleil, js/carte/ferme/soleil.js).
#
#   python3 scripts/batiments/etal.py            écrit assets/meuble_etal_vide.png et meuble_etal_garni.png
#   python3 scripts/batiments/etal.py --apercu   écrit aussi apercu_etal.png (agrandi, sur l'herbe, les deux)
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 32, 40
OUT = (30, 20, 20)
# (les rangées : le haut du plateau, sa face, le bas)
TOP0, TOP1 = 20, 29          # le plateau, du fond (20) à l'avant (29)
FACE0, FACE1 = 30, 39        # la face du comptoir

# le bois : des rampes proches (une par planche), qui glissent du froid (l'ombre, un brun violacé) au chaud (un miel)
BOIS = [rampe([(36, 24, 30), (72, 46, 40), (114, 76, 52), (156, 110, 68), (198, 150, 94), (234, 196, 138)], 150),
        rampe([(34, 26, 34), (68, 50, 46), (108, 80, 58), (150, 114, 76), (192, 154, 104), (228, 200, 146)], 150),
        rampe([(42, 24, 26), (82, 46, 36), (126, 76, 48), (168, 108, 62), (208, 146, 86), (240, 188, 124)], 150),
        rampe([(32, 28, 36), (64, 54, 50), (102, 84, 64), (142, 118, 84), (184, 156, 112), (222, 202, 156)], 150),
        rampe([(40, 26, 28), (78, 52, 40), (120, 84, 54), (162, 118, 72), (204, 160, 100), (238, 204, 146)], 150)]
POTEAU = rampe([(28, 22, 28), (58, 42, 40), (96, 68, 50), (136, 98, 66), (176, 136, 92), (212, 176, 128)], 140)
# la toile de l'auvent : des rouges (de l'ombre lie-de-vin au vermillon clair) et des crèmes (de l'ombre bleutée au
# blanc chaud)
ROUGES = [rampe([(62, 14, 34), (118, 24, 38), (172, 40, 42), (214, 74, 56), (244, 128, 94), (255, 182, 146)], 150),
          rampe([(58, 16, 40), (110, 26, 44), (164, 44, 48), (208, 80, 62), (240, 134, 100), (254, 188, 152)], 150)]
CREMES = [rampe([(70, 72, 92), (128, 124, 132), (180, 172, 164), (220, 210, 188), (244, 236, 212), (255, 250, 232)], 150),
          rampe([(74, 70, 88), (132, 122, 126), (186, 172, 158), (224, 210, 182), (246, 234, 206), (255, 248, 228)], 150)]
ARDOISE = rampe([(16, 18, 26), (32, 36, 46), (50, 56, 66), (72, 78, 88), (98, 104, 112)], 100)
CRAIE = rampe([(150, 150, 150), (200, 200, 196), (236, 234, 226)], 30)
FER = rampe([(20, 22, 30), (46, 48, 58), (80, 82, 90), (120, 122, 128), (170, 172, 176), (214, 214, 214)], 100)
OSIER = rampe([(44, 30, 22), (88, 60, 34), (138, 98, 50), (184, 140, 72), (220, 180, 104), (244, 214, 150)], 140)
POMME = [rampe([(54, 8, 22), (110, 16, 28), (170, 30, 34), (214, 58, 46), (240, 110, 80), (255, 196, 170)], 120),
         rampe([(60, 14, 18), (120, 26, 24), (180, 52, 30), (222, 92, 44), (244, 146, 80), (255, 210, 160)], 120)]
CAROTTE = rampe([(84, 26, 12), (150, 54, 18), (206, 94, 26), (240, 136, 44), (255, 182, 92), (255, 222, 160)], 120)
FANE = rampe([(18, 42, 22), (34, 78, 30), (58, 116, 40), (94, 152, 56), (140, 190, 84), (190, 220, 128)], 120)
MIEL = rampe([(70, 30, 6), (136, 70, 10), (196, 120, 20), (232, 170, 46), (250, 212, 104), (255, 240, 180)], 120)
VERRE = rampe([(40, 52, 60), (84, 104, 112), (140, 160, 166), (196, 214, 216), (240, 248, 248)], 80)
TISSU = rampe([(36, 46, 84), (60, 74, 128), (88, 104, 164), (124, 140, 196), (170, 184, 226), (214, 224, 246)], 120)
FROMAGE = rampe([(96, 66, 18), (160, 118, 34), (214, 170, 62), (240, 206, 108), (252, 232, 166), (255, 246, 214)], 120)
CROUTE = rampe([(70, 40, 16), (118, 72, 26), (164, 108, 40), (200, 146, 62), (228, 184, 96)], 100)
FOND = rampe([(30, 22, 24), (62, 44, 38), (100, 72, 52), (140, 104, 70), (180, 140, 96), (214, 178, 130)], 120)
TORCHON = rampe([(60, 56, 72), (112, 104, 116), (170, 160, 160), (214, 206, 196), (240, 236, 226)], 100)
RAYE = rampe([(70, 20, 30), (130, 36, 40), (180, 64, 56), (214, 104, 86)], 60)


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)


def melange(c, d, f):
    return tuple(round(c[i] * (1 - f) + d[i] * f) for i in range(3))


def comptoir(t):
    """Le comptoir : la face de planches verticales, le plateau de planches en long, le chant avant."""
    # la face : huit planches de 4 px (chacune son bois), le biseau (le bord gauche clair, le droit sombre), le fil, un
    # nœud ; plus sombre au pied (l'herbe, l'occlusion), plus clair sous le chant
    for k in range(8):
        R = BOIS[(k * 3 + 1) % len(BOIS)]
        dk = 0.05 * bruit(k, 1, 21)
        x0 = k * 4
        for x in range(x0, x0 + 4):
            for y in range(FACE0, FACE1 + 1):
                u = (x - x0) / 3
                g = (y - FACE0) / (FACE1 - FACE0)
                lum = 0.58 - 0.18 * u - 0.26 * g + dk + 0.05 * bruit(x, y // 2, 22) - 0.08 * ((y + 2 * k) % 6 == 0 and u > 0.3)
                lum -= 0.18 * (x / (W - 1))                     # la lumière vient de la gauche
                if x == x0:
                    lum += 0.12                                  # le bord gauche, au soleil
                if x == x0 + 3:
                    lum -= 0.16                                  # le joint, dans l'ombre
                if y == FACE0:
                    lum -= 0.10                                  # sous le chant du plateau
                if y >= FACE1 - 1:
                    lum -= 0.10                                  # le pied, dans l'herbe
                t.put(x, y, ton(R, lum))
        # un nœud sur une planche sur trois
        if k % 3 == 1:
            nx, ny = x0 + 1, FACE0 + 3 + (k % 2) * 3
            t.put(nx, ny, ton(R, 0.12)); t.put(nx + 1, ny, ton(R, 0.22)); t.put(nx, ny + 1, ton(R, 0.30))
    # la traverse du bas (un peu en retrait : plus sombre) et ses clous
    for x in range(W):
        t.put(x, FACE1 - 2, ton(BOIS[3], 0.30 - 0.14 * x / (W - 1) + 0.03 * bruit(x, 3, 23)))
    for x in (1, 9, 17, 25):
        t.put(x + 1, FACE0 + 1, ton(FER, 0.75 - 0.4 * x / W)); t.put(x + 2, FACE0 + 1, ton(FER, 0.25))
    # le plateau : trois planches en long (chacune son bois), plus claires vers l'avant ; le fond, sous l'auvent, plus
    # sombre (l'occlusion) ; le chant avant (la dernière rangée) le plus clair
    bandes = ((TOP0, TOP0 + 2, 0), (TOP0 + 3, TOP0 + 5, 2), (TOP0 + 6, TOP1, 4))
    for ya, yb, ri in bandes:
        R = BOIS[ri]
        for y in range(ya, yb + 1):
            for x in range(W):
                u = x / (W - 1)
                v = (y - TOP0) / (TOP1 - TOP0)
                lum = 0.62 + 0.26 * v - 0.24 * u + 0.04 * bruit(x // 3, y, 24 + ri) - 0.05 * ((x * 7 + y * 3) % 11 == 0)
                if y == ya:
                    lum -= 0.14                                  # le joint entre deux planches
                if y == TOP1:
                    lum = 0.95 - 0.22 * u                        # le chant avant, au soleil
                if y <= TOP0 + 2:
                    lum -= 0.14 * (TOP0 + 3 - y) / 3             # le fond, sous l'auvent
                if x == 0:
                    lum += 0.06
                if x == W - 1:
                    lum -= 0.12                                  # la tranche droite
                t.put(x, y, ton(R, lum))


def poteaux(t):
    """Les deux poteaux du fond (x 1-2 et 29-30), du plateau jusqu'à l'auvent : la face gauche éclairée, la droite
    sombre ; un peu plus sombres en haut, sous la toile."""
    for x0 in (1, 29):
        for y in range(8, TOP0 + 1):
            for x in (x0, x0 + 1):
                lum = (0.66 if x == x0 else 0.34) - 0.12 * (x0 > 16) + 0.04 * bruit(x, y // 2, 31)
                lum -= 0.20 * max(0, 14 - y) / 6                 # sous la toile
                t.put(x, y, ton(POTEAU, lum))


def auvent(t):
    """L'auvent : le dessus de la toile, raccourci (y 2 à 11 : la pente vers l'avant), les rayures de 4 px (rouge,
    crème), chacune sa nuance, les plis ; puis le lambrequin qui pend devant (y 12 à 15), à festons."""
    for x in range(W):
        bande = x // 4
        R = (ROUGES if bande % 2 == 0 else CREMES)[(bande // 2) % 2]
        u = x / (W - 1)
        for y in range(2, 12):
            if y == 2 and (x < 2 or x > W - 3):
                continue                                         # (les coins du fond : la toile se tend)
            v = (y - 2) / 9
            # le dessus : clair vers l'avant (il fait face au ciel et à la lumière), plus sombre au fond
            lum = 0.52 + 0.34 * v - 0.22 * u + 0.05 * bruit(x, y, 41 + bande)
            lum -= 0.10 * ((x % 4) == 3)                         # le pli entre deux rayures
            lum += 0.06 * ((x % 4) == 0)
            if y == 11:
                lum = 0.96 - 0.18 * u                            # l'arête avant, au soleil
            t.put(x, y, ton(R, lum))
        # le lambrequin : une face (plus sombre que le dessus), les festons en arc (un par rayure)
        k = x % 4
        bas = 15 if k in (1, 2) else 14
        for y in range(12, bas + 1):
            lum = 0.56 - 0.26 * u - 0.10 * (y - 12) + 0.04 * bruit(x, y, 45)
            if k == 3:
                lum -= 0.08
            t.put(x, y, ton(R, lum))
    # la barre de fer qui tient la toile, sous l'arête
    for x in range(W):
        if t.get(x, 12)[3]:
            c = t.get(x, 12)
            t.put(x, 12, melange(c[:3], ton(FER, 0.3), 0.25))


def ombre_auvent(t):
    """L'ombre douce de l'auvent sur le fond du plateau et le haut des poteaux (plus sombre et plus froide)."""
    for y in range(TOP0, TOP0 + 4):
        f = 0.22 * (TOP0 + 4 - y) / 4
        for x in range(W):
            c = t.get(x, y)
            if c[3]:
                t.put(x, y, melange(c[:3], (40, 36, 70), f))


def ardoise(t):
    """L'ardoise accrochée à la face (x 12 à 19, y 32 à 36) : son cadre de bois, la craie (des prix)."""
    for y in range(31, 38):
        for x in range(12, 20):
            cadre = x in (12, 19) or y in (31, 37)
            if cadre:
                lum = 0.70 - 0.40 * (x - 12) / 7 - 0.10 * (y == 37)
                t.put(x, y, ton(BOIS[1], lum))
            else:
                lum = 0.55 - 0.30 * (x - 13) / 5 - 0.10 * (y - 32) / 4 + 0.08 * bruit(x, y, 51)
                t.put(x, y, ton(ARDOISE, lum))
    for (x, y) in ((14, 33), (15, 33), (17, 33), (14, 35), (16, 35), (17, 35)):
        t.put(x, y, ton(CRAIE, 0.5 + 0.4 * bruit(x, y, 52)))
    # le clou, et la ficelle
    t.put(15, 30, ton(FER, 0.8)); t.put(16, 30, ton(FER, 0.3))


def cagette(t, x0, x1, ya, yb, contenu=None):
    """Une cagette de lattes vue de haut à 45° : la face avant (lattes, ya+4 … yb), le rebord, et, ouverte vers le
    ciel, son intérieur : le fond (plus clair vers l'avant), la paroi gauche éclairée, la droite dans l'ombre.
    `contenu` : (fn) qui peint ce qu'elle contient, par-dessus le fond."""
    hf = 3                                                       # la face avant : 3 rangées
    yi0, yi1 = ya, yb - hf                                       # l'ouverture (le dessus)
    # l'intérieur : le fond, plus clair vers l'avant
    for y in range(yi0 + 1, yi1):
        for x in range(x0 + 1, x1):
            v = (y - yi0) / max(1, yi1 - yi0)
            lum = 0.22 + 0.32 * v - 0.10 * (x - x0) / max(1, x1 - x0) + 0.04 * bruit(x, y, 61)
            if (y - yi0) % 2 == 0:
                lum -= 0.06                                      # les lattes du fond
            t.put(x, y, ton(FOND, lum))
        t.put(x0 + 1, y, ton(BOIS[2], 0.60 - 0.1 * (y - yi0)))   # la paroi gauche, éclairée
        t.put(x1 - 1, y, ton(BOIS[2], 0.18))                     # la paroi droite, dans l'ombre
    # le rebord (le dessus des quatre côtés)
    for x in range(x0, x1 + 1):
        t.put(x, yi0, ton(BOIS[0], 0.58 - 0.24 * (x - x0) / max(1, x1 - x0)))
        t.put(x, yi1, ton(BOIS[0], 0.92 - 0.24 * (x - x0) / max(1, x1 - x0)))
    for y in range(yi0, yi1 + 1):
        t.put(x0, y, ton(BOIS[0], 0.80))
        t.put(x1, y, ton(BOIS[0], 0.40))
    if contenu:
        contenu(t)
    # la face avant : deux lattes (chacune son ton), le jour entre elles
    for y in range(yi1 + 1, yb + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            jour = y == yi1 + 2
            R = BOIS[1 if y < yi1 + 2 else 3]
            lum = (0.20 if jour else 0.66 - 0.30 * u - 0.10 * (y - yi1)) + 0.04 * bruit(x, y, 62)
            if x == x0:
                lum += 0.10
            t.put(x, y, ton(FOND if jour else R, lum))


def pommes(t, x0, x1, ya, yb):
    """Un panier d'osier rond, plein de pommes : l'osier tressé (sa face, son rebord), l'intérieur d'en haut, les
    pommes modelées (le reflet en haut à gauche, l'ombre en bas à droite), chacune sa teinte."""
    cx = (x0 + x1) / 2
    rx = (x1 - x0) / 2
    yr = ya + 2                                                  # le centre de l'ouverture
    # la face d'osier : la tresse (un motif de 2 px), plus sombre en bas et à droite
    for y in range(yr, yb + 1):
        for x in range(x0, x1 + 1):
            d = (x - cx) / (rx + 0.5)
            if abs(d) > 1:
                continue
            if y == yb and abs(d) > 0.8:
                continue
            tresse = ((x + (y // 2) * 2) % 4) < 2
            lum = 0.62 - 0.28 * (x - x0) / (x1 - x0) - 0.06 * (y - yr) + (0.10 if tresse else -0.06) + 0.04 * bruit(x, y, 71)
            t.put(x, y, ton(OSIER, lum))
    # le rebord (une ellipse claire), l'intérieur
    for y in range(ya, yr + 2):
        for x in range(x0, x1 + 1):
            e = ((x - cx) / (rx + 0.5)) ** 2 + ((y - yr) / 2.4) ** 2
            if e <= 1.0:
                t.put(x, y, ton(OSIER, 0.18 + 0.2 * (y - ya) / 3))
            if 0.62 <= e <= 1.0:
                t.put(x, y, ton(OSIER, 0.86 - 0.36 * (x - x0) / (x1 - x0)))
    # les pommes : des disques de 3 px, en tas (celles du fond d'abord)
    rnd = random.Random(73)
    tas = [(x0 + 2, ya - 1), (x0 + 5, ya - 2), (x1 - 3, ya - 1), (x0 + 3, ya + 1), (x0 + 6, ya), (x1 - 2, ya + 1)]
    for i, (px, py) in enumerate(tas):
        R = POMME[i % 2]
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                if abs(dx) + abs(dy) > 1 and (dx, dy) != (-1, -1) and (dx, dy) != (1, 1):
                    continue
                lum = 0.46 - 0.16 * dx - 0.14 * dy + 0.05 * rnd.uniform(-1, 1)
                t.put(px + dx, py + dy, ton(R, lum))
        t.put(px - 1, py - 1, ton(R, 0.94))                        # le reflet
        t.put(px, py - 2, ton(FANE, 0.4))                         # la queue, une feuille
        if i % 2:
            t.put(px + 1, py - 2, ton(FANE, 0.7))


def carottes(t, x0, x1, ya, yi1):
    """Les carottes couchées dans la cagette, la pointe vers l'avant, leurs fanes au fond."""
    for k, x in enumerate(range(x0 + 2, x1 - 1, 2)):
        R = CAROTTE
        for y in range(ya + 2, yi1 + 1):
            f = (y - ya - 2) / max(1, yi1 - ya - 2)
            lum = 0.72 - 0.30 * f - 0.10 * (k % 2) + 0.04 * bruit(x, y, 81 + k)
            t.put(x, y, ton(R, lum))
            if f < 0.6:
                t.put(x + 1, y, ton(R, lum - 0.22))
        # les fanes, qui dépassent au fond
        for j, (dx, dy) in enumerate(((0, 0), (-1, -1), (1, -1), (0, -2), (1, -3), (-1, -2))):
            t.put(x + dx, ya + 1 + dy, ton(FANE, 0.80 - 0.10 * j + 0.06 * bruit(x, j, 82)))


def pot_miel(t, x0, ya, yb):
    """Un pot de miel (x0 à x0 + 4) : le couvercle de tissu (un dessus, un rebord), le verre où le miel s'éclaire à
    gauche, le reflet du verre."""
    x1 = x0 + 4
    for y in range(ya + 2, yb + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / 4
            lum = 0.78 - 0.46 * u - 0.10 * (y - ya - 2) / (yb - ya) + 0.04 * bruit(x, y, 91)
            t.put(x, y, ton(MIEL, lum))
        t.put(x0 + 1, y, ton(VERRE, 0.95 if y < yb - 1 else 0.7))  # le reflet du verre
    for x in range(x0 - 1, x1 + 2):                               # le couvercle de tissu à carreaux
        for y in (ya, ya + 1):
            carreau = ((x + y) % 2 == 0)
            t.put(x, y, ton(TISSU, (0.84 if y == ya else 0.56) - 0.30 * (x - x0 + 1) / 6 + (0.10 if carreau else -0.08)))
    t.put(x0 + 2, ya + 2, ton(FER, 0.5))                          # la ficelle


def fromage(t, x0, ya, yb):
    """Une meule de fromage entamée : le dessus (la pâte, entamée d'un coin : la coupe, plus claire), la croûte de la
    face, plus sombre à droite."""
    x1 = x0 + 6
    for y in range(ya, yb + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / 6
            if y <= ya + 2:
                if x >= x1 - 2 and y <= ya + 1:
                    continue                                       # l'entame
                lum = 0.78 - 0.28 * u + 0.08 * (y - ya) / 2 + 0.04 * bruit(x, y, 95)
                t.put(x, y, ton(FROMAGE, lum))
            else:
                lum = 0.62 - 0.34 * u - 0.08 * (y - ya - 3) + 0.04 * bruit(x, y, 96)
                t.put(x, y, ton(CROUTE, lum))
    for y in (ya + 1, ya + 2):                                     # la coupe, au soleil
        t.put(x1 - 2, y, ton(FROMAGE, 0.98)); t.put(x1 - 1, ya + 2, ton(FROMAGE, 0.9))
    for (x, y) in ((x0 + 2, ya + 1), (x0 + 4, ya + 2)):            # les trous
        t.put(x, y, ton(FROMAGE, 0.45))


def torchon(t, x0, ya):
    """Un torchon plié (rayé de rouge) : son dessus clair, la tranche des plis plus sombre."""
    for y in range(ya, ya + 4):
        for x in range(x0, x0 + 7):
            u = (x - x0) / 6
            raye = (x - x0) in (2, 3)
            lum = (0.86 if y < ya + 2 else 0.50) - 0.26 * u + 0.04 * bruit(x, y, 99)
            t.put(x, y, ton(RAYE if raye else TORCHON, lum))


def etal(garni):
    t = Toile()
    comptoir(t)
    poteaux(t)
    ombre_auvent(t)
    if garni:
        pommes(t, 3, 11, 22, 28)
        cagette(t, 13, 21, 21, 28, lambda tt: carottes(tt, 13, 21, 21, 25))
        fromage(t, 23, 24, 28)
        pot_miel(t, 25, 19, 25)
    else:
        cagette(t, 5, 13, 21, 28)
        torchon(t, 18, 24)
    ardoise(t)
    auvent(t)
    im = contour(t.im, OUT)
    return im


def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def main():
    vide, garni = etal(False), etal(True)
    vide.save(os.path.join(ASSETS, 'meuble_etal_vide.png'), optimize=True)
    garni.save(os.path.join(ASSETS, 'meuble_etal_garni.png'), optimize=True)
    print(f'étal : {W} × {H}, vide {couleurs(vide)} couleurs, garni {couleurs(garni)} couleurs')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (2 * W + 24, H + 10), (92, 146, 62, 255))
        ap.alpha_composite(vide, (6, 5))
        ap.alpha_composite(garni, (W + 18, 5))
        ap.resize((ap.width * 10, ap.height * 10), Image.NEAREST).save(os.path.join(ROOT, 'apercu_etal.png'))


if __name__ == '__main__':
    main()
