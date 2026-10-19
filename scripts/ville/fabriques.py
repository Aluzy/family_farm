# Les machines et les enseignes des fabriques de la ville (docs/plan-ville.md, étape 4, lot 3), un
# fichier assets/meuble_<nom>.png chacune, dans le style des meubles des commerces
# (scripts/ville/commerces.py) ; posées dans les lieux bâtis en blocs (js/carte/ville/lieux.js) :
#   - la minoterie : silo_grain, moulin (le moulin à cylindres et sa trémie), sacs_farine ;
#   - la fabrique textile : metier_tisser, bobines, rouleaux_tissu, machine_coudre ;
#   - la fabrique de mayonnaise : cuve, remplisseuse (la chaîne qui remplit les pots),
#     palette_pots, caisse_oeufs ;
#   - la fabrique de matériaux : betonniere, presse_briques, palette_briques, sacs_ciment ;
#   - les usines électronique et informatique : chaine_montage (le tapis et ses cartes),
#     etabli_soudure, armoire_composants, robot_bras, serveur ;
#   - la menuiserie : etabli, scie (la scie circulaire sur table), planches, armoire ;
#   - partout : palette (des cartons sur une palette), chariot (le chariot élévateur).
#
#   python3 scripts/ville/fabriques.py            écrit les images
#   python3 scripts/ville/fabriques.py --apercu   écrit aussi apercu_fabriques.png (agrandi)
import os
import sys

from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from commerces import ASSETS, ROOT, C, box, canvas, enseigne, outline, painter, rect  # noqa: E402
import services  # noqa: E402,F401  (ses tons : le velours, l'os, le bronze)

# des tons en plus : la peinture jaune et orange des machines, la brique, le ciment, le circuit
C.update({
    'M0': (176, 120, 20), 'M1': (226, 172, 40), 'M2': (248, 214, 96),
    'O0': (170, 72, 24), 'O1': (222, 112, 40), 'O2': (244, 160, 84),
    'q0': (120, 48, 36), 'q1': (168, 72, 52), 'q2': (204, 108, 80),
    'ci0': (110, 110, 106), 'ci1': (156, 154, 148), 'ci2': (196, 194, 186),
    'pc0': (20, 80, 44), 'pc1': (40, 130, 70), 'pc2': (96, 180, 110),
    'my': (246, 236, 180),
})


def cylindre(put, x0, x1, y0, y1, tons, rond=3):
    """Un cylindre debout vu de 3/4 : le dessus en ovale, le corps ombré de gauche à droite."""
    a, b, c = tons
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            put(x, y, c if u < 0.25 else b if u < 0.7 else a)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2 + 0.5
    for y in range(y0 - rond, y0 + rond + 1):
        for x in range(x0, x1 + 1):
            if ((x - cx) / rx) ** 2 + ((y - y0) / (rond + 0.5)) ** 2 <= 1:
                put(x, y, c)


def silo_grain():
    """Le silo à grain (2 × 2) : la cuve de tôle ondulée, son toit conique, l'échelle, la
    goulotte."""
    W, H = 32, 52
    im = canvas(W, H)
    put, _ = painter(im)
    cylindre(put, 3, 28, 10, 44, ('a0', 'a1', 'a2'), rond=4)
    for y in range(12, 44, 3):
        rect(put, 3, y, 28, y, 'a0')
    for y in range(0, 10):                            # le toit conique
        r = 2 + y * 13 // 10
        rect(put, 16 - r, y, 15 + r, y, 'a2' if y < 5 else 'a1')
    for y in range(12, 44, 2):                        # l'échelle
        put(25, y, 'i0'); put(27, y, 'i0'); put(26, y, 'i1')
    rect(put, 12, 45, 19, 49, 'a1'); rect(put, 14, 50, 17, 51, 'a0')
    outline(im)
    return im


def moulin():
    """Le moulin à cylindres (2 × 2) : la trémie de grain en haut, le bâti jaune, les deux
    cylindres derrière leurs volets, la goulotte de farine."""
    W, H = 32, 44
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(0, 10):                            # la trémie
        r = 13 - y
        rect(put, 16 - r, y, 15 + r, y, 'a2' if y < 3 else 'a1')
    rect(put, 6, 2, 25, 4, 'P2')                      # le blé
    box(put, 2, 10, 28, 4, 24, 'M2', 'M1', edge='M1')
    rect(put, 2, 14, 4, 37, 'M2'); rect(put, 27, 14, 29, 37, 'M0')
    for x in (7, 17):                                 # les volets et leurs hublots
        rect(put, x, 18, x + 7, 30, 'M0'); rect(put, x + 1, 19, x + 6, 29, 'a2')
        rect(put, x + 2, 22, x + 5, 26, 'a0')
    rect(put, 12, 34, 19, 39, 'c2')                   # la goulotte, la farine
    rect(put, 1, 40, 30, 43, 'i0')
    outline(im)
    return im


def sacs(couleurs):
    """Une pile de sacs (2 cases) : deux rangs de sacs couchés, leurs coutures."""
    W, H = 32, 22
    im = canvas(W, H)
    put, _ = painter(im)
    a, b, c = couleurs
    for (x0, y0) in ((1, 8), (11, 8), (21, 8), (6, 1), (16, 1)):
        for y in range(y0, y0 + 10):
            for x in range(x0, x0 + 10):
                if ((x - x0 - 4.5) / 5) ** 2 + ((y - y0 - 4.5) / 5.4) ** 2 <= 1:
                    put(x, y, c if y < y0 + 3 else b if x < x0 + 6 else a)
        rect(put, x0 + 2, y0 + 5, x0 + 7, y0 + 5, a)
    rect(put, 0, 18, W - 1, 21, 'w1'); rect(put, 0, 18, W - 1, 18, 'w3')     # la palette
    outline(im)
    return im


def metier_tisser():
    """Le métier à tisser (2 × 2) : le cadre de bois, les fils tendus, le tissu rayé qui
    s'enroule devant."""
    W, H = 32, 42
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, 30, 2, 'w3'); rect(put, 1, 0, 2, 38, 'w2'); rect(put, 29, 0, 30, 38, 'w1')
    for x in range(4, 28):                            # les fils
        rect(put, x, 3, x, 18, 'c1' if x % 2 else 'B2')
    rect(put, 3, 19, 28, 21, 'w2')                    # le battant
    for y in range(22, 32):                           # le tissu
        rect(put, 3, y, 28, y, ['R1', 'c2', 'B1', 'c2'][(y // 2) % 4])
    rect(put, 3, 32, 28, 34, 'w1')                    # l'ensouple
    rect(put, 0, 38, W - 1, 41, 'w0')
    outline(im)
    return im


def bobines():
    """Le râtelier de bobines (2 cases) : deux rangées de cônes de fil de couleur."""
    W, H = 32, 32
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 28, 'w1'); rect(put, 2, 2, W - 3, 26, 'w0')
    teintes = ['R1', 'J1', 'B1', 'V1', 'c2', 'R2', 'B2']
    for r, y in enumerate((4, 16)):
        for k, x in enumerate(range(3, 28, 5)):
            t = teintes[(k + r * 3) % len(teintes)]
            for yy in range(y, y + 9):
                w = 1 + (yy - y) // 3
                rect(put, x + 2 - w, yy, x + 2 + w, yy, t)
            put(x + 2, y, 'c2')
        rect(put, 1, y + 9, W - 2, y + 10, 'w3')
    rect(put, 0, 29, W - 1, 31, 'w0')
    outline(im)
    return im


def rouleaux_tissu():
    """Des rouleaux de tissu (2 cases) : trois rouleaux couchés, en pyramide."""
    W, H = 32, 22
    im = canvas(W, H)
    put, _ = painter(im)
    for x0, y0, t in ((1, 9, ('B0', 'B1', 'B2')), (11, 9, ('R0', 'R1', 'R2')), (21, 9, ('V0', 'V1', 'V2')), (6, 1, ('J0', 'J1', 'J2')), (16, 1, ('c0', 'c1', 'c2'))):
        a, b, c = t
        rect(put, x0, y0, x0 + 9, y0 + 8, b); rect(put, x0, y0, x0 + 9, y0 + 1, c); rect(put, x0, y0 + 7, x0 + 9, y0 + 8, a)
        rect(put, x0 + 8, y0 + 2, x0 + 9, y0 + 6, a); put(x0 + 9, y0 + 4, 'w0')
    rect(put, 0, 18, W - 1, 21, 'w1')
    outline(im)
    return im


def machine_coudre():
    """La machine à coudre (1 case) : la machine sur sa petite table, un coupon de tissu."""
    W, H = 16, 28
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 3, 0, 12, 3, 'i1'); rect(put, 11, 3, 12, 8, 'i1'); rect(put, 3, 3, 5, 8, 'i1')   # le bras
    rect(put, 4, 1, 9, 1, 'o1')
    box(put, 0, 9, W, 6, 3, 'w3', 'w1', edge='w2')
    rect(put, 2, 10, 7, 13, 'R1')
    rect(put, 1, 18, 2, 27, 'w1'); rect(put, 13, 18, 14, 27, 'w1')
    outline(im)
    return im


def cuve():
    """La cuve de mélange (2 × 2) : le cylindre d'inox, son hublot (la mayonnaise), le
    moteur du malaxeur sur le dessus, les pieds."""
    W, H = 32, 46
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 13, 0, 18, 5, 'i1'); rect(put, 14, 0, 17, 0, 'i2')        # le moteur
    cylindre(put, 3, 28, 9, 37, ('a1', 'a2', 'a3'), rond=4)
    for y in range(18, 28):                           # le hublot
        for x in range(10, 22):
            d = ((x - 15.5) / 5.5) ** 2 + ((y - 22.5) / 4.5) ** 2
            if d <= 1:
                put(x, y, 'a0' if d > 0.75 else 'my')
    rect(put, 3, 31, 28, 31, 'a0')
    for x in (5, 25):
        rect(put, x, 38, x + 2, 45, 'i1')
    outline(im)
    return im


def remplisseuse():
    """La chaîne de remplissage (3 cases) : le tapis, les pots qui avancent, la buse qui
    remplit."""
    W, H = 48, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 18, 0, 25, 6, 'a1'); rect(put, 20, 7, 23, 9, 'a0')       # la buse
    box(put, 0, 10, W, 6, 8, 'i1', 'a1', edge='i0')
    for x in range(1, W - 1, 4):
        put(x, 12, 'i2')
    for k, x in enumerate(range(3, W - 6, 7)):        # les pots
        rect(put, x, 7, x + 4, 13, 'g4'); rect(put, x, 6, x + 4, 7, 'J1' if k % 2 else 'R1')
        if k != 3:
            rect(put, x + 1, 9, x + 3, 13, 'my')
    for x in (2, W - 4):
        rect(put, x, 24, x + 1, 29, 'i1')
    outline(im)
    return im


def palette_pots():
    """Une palette de pots de mayonnaise (2 cases) : deux rangs de pots, leurs couvercles."""
    W, H = 32, 24
    im = canvas(W, H)
    put, _ = painter(im)
    for r, y in enumerate((2, 9)):
        for x in range(1 + 2 * r, W - 4, 6):
            rect(put, x, y, x + 4, y + 7, 'my'); rect(put, x, y, x + 4, y, 'J1'); rect(put, x + 3, y + 1, x + 4, y + 7, 'c1')
            rect(put, x + 1, y + 3, x + 3, y + 4, 'h1')       # l'étiquette
    rect(put, 0, 18, W - 1, 23, 'w1'); rect(put, 0, 18, W - 1, 18, 'w3'); rect(put, 4, 21, 8, 23, 'w0'); rect(put, 22, 21, 26, 23, 'w0')
    outline(im)
    return im


def caisse_oeufs():
    """Une caisse d'œufs (1 case) : les œufs dans leurs alvéoles, la caisse de bois."""
    W, H = 16, 20
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 9, 7, 'k0', 'w2', edge='w3')
    for y in (3, 6, 9):
        for x in (2, 6, 10):
            rect(put, x, y, x + 2, y + 2, 'c2'); put(x, y, 'b3')
    rect(put, 0, 18, W - 1, 19, 'w0')
    outline(im)
    return im


def betonniere():
    """La bétonnière (2 × 2) : la cuve orange inclinée, sa bouche, le châssis et ses roues."""
    W, H = 32, 38
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(2, 26):
        for x in range(4, 28):
            d = ((x - 16) / 12) ** 2 + ((y - 14) / 11) ** 2
            if d <= 1:
                put(x, y, 'O2' if x < 11 else 'O1' if x < 21 else 'O0')
    for y in range(3, 10):                            # la bouche et le béton
        for x in range(9, 19):
            if ((x - 13.5) / 5) ** 2 + ((y - 6) / 3.2) ** 2 <= 1:
                put(x, y, 'ci1' if ((x - 13.5) / 5) ** 2 + ((y - 6) / 3.2) ** 2 < 0.55 else 'i0')
    for y in range(8, 22, 4):
        rect(put, 6, y, 26, y, 'O0')
    rect(put, 6, 26, 25, 29, 'i1')
    for cx in (8, 23):
        rect(put, cx - 3, 30, cx + 3, 36, 'i0'); rect(put, cx - 1, 32, cx + 1, 34, 'a2')
    outline(im)
    return im


def presse_briques():
    """La presse à briques (2 × 2) : la trémie d'argile, le bâti jaune, le piston, les briques
    qui sortent."""
    W, H = 32, 42
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(0, 8):
        r = 11 - y
        rect(put, 16 - r, y, 15 + r, y, 'a1')
    rect(put, 7, 1, 24, 3, 'q1')                      # l'argile
    box(put, 2, 8, 28, 4, 22, 'M2', 'M1', edge='M1')
    rect(put, 13, 14, 18, 24, 'a2'); rect(put, 14, 14, 15, 24, 'a3')    # le piston
    rect(put, 4, 14, 7, 18, 'h1'); put(5, 15, 'J2')                     # le bouton rouge
    for x in range(4, 28, 6):                         # les briques fraîches
        rect(put, x, 31, x + 4, 33, 'q1'); rect(put, x, 31, x + 4, 31, 'q2')
    rect(put, 1, 34, 30, 41, 'i0'); rect(put, 1, 34, 30, 35, 'i1')
    outline(im)
    return im


def palette_briques():
    """Une palette de briques (2 cases) : les briques empilées en quinconce, la palette."""
    W, H = 32, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 1, 2, 30, 6, 0, 'q2', 'q2')
    for y in range(8, 22):
        off = 4 if (y // 3) % 2 else 0
        for x in range(1, 31):
            k = 'q0' if y % 3 == 2 or (x + off) % 8 == 0 else ('q1' if x > 20 else 'q2' if x < 6 else 'q1')
            put(x, y, k)
    rect(put, 0, 22, W - 1, 27, 'w1'); rect(put, 0, 22, W - 1, 22, 'w3'); rect(put, 4, 25, 8, 27, 'w0'); rect(put, 22, 25, 26, 27, 'w0')
    outline(im)
    return im


def chaine_montage():
    """La chaîne de montage (3 cases) : le tapis, les cartes électroniques vertes et leurs
    puces, le bâti d'acier."""
    W, H = 48, 26
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 4, W, 9, 6, 'i1', 'a1', edge='i0')
    for x in range(1, W - 1, 4):
        put(x, 5, 'i2')
    for x in range(3, W - 8, 11):                     # les cartes
        rect(put, x, 5, x + 7, 10, 'pc1'); rect(put, x, 5, x + 7, 5, 'pc2')
        rect(put, x + 2, 7, x + 3, 8, 'x0'); rect(put, x + 5, 7, x + 6, 8, 'a3'); put(x + 1, 9, 'o2')
    rect(put, 36, 0, 39, 4, 'M1')                     # un témoin lumineux
    for x in (2, W - 4):
        rect(put, x, 19, x + 1, 25, 'i1')
    outline(im)
    return im


def etabli_soudure():
    """L'établi de soudure (2 cases) : la station et son fer, une loupe, une carte en cours,
    les tiroirs."""
    W, H = 32, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 22, 0, 23, 8, 'a1'); rect(put, 18, 0, 23, 1, 'a1'); rect(put, 17, 1, 19, 4, 'g4')   # la loupe
    box(put, 0, 8, W, 8, 12, 'w4', 'w2', edge='w3')
    rect(put, 2, 9, 8, 13, 'i1'); put(4, 10, 'h1'); put(6, 10, 'V2')   # la station
    rect(put, 9, 11, 15, 11, 'a2')                    # le fer
    rect(put, 18, 10, 26, 14, 'pc1'); rect(put, 20, 11, 21, 12, 'x0')  # la carte
    for y in (19, 23):
        rect(put, 2, y, 29, y, 'w1'); rect(put, 14, y + 2, 17, y + 2, 'a2')
    rect(put, 0, 28, W - 1, 29, 'w0')
    outline(im)
    return im


def armoire_composants():
    """L'armoire à composants (1 case) : des dizaines de petits tiroirs étiquetés."""
    W, H = 16, 36
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 3, 32, 'a2', 'a0', edge='a1')
    for y in range(4, 34, 3):
        for x in (1, 5, 9, 13):
            if x + 2 < W:
                rect(put, x, y, x + 2, y + 1, 'B2' if (x + y) % 3 else 'c2')
    outline(im)
    return im


def robot_bras():
    """Le bras robot (1 case) : le socle, les deux segments articulés, la pince."""
    W, H = 16, 38
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 2, 32, 13, 37, 'i1'); rect(put, 3, 30, 12, 31, 'M0')
    rect(put, 6, 18, 9, 30, 'M1'); rect(put, 6, 18, 6, 30, 'M2')        # le premier segment
    rect(put, 5, 16, 10, 19, 'i1')                                      # l'articulation
    for k in range(10):                                                 # le second, penché
        rect(put, 9 - k // 2, 15 - k, 11 - k // 2, 15 - k, 'M1')
    rect(put, 2, 3, 6, 5, 'i1'); rect(put, 1, 6, 2, 9, 'a2'); rect(put, 6, 6, 7, 9, 'a2')   # la pince
    outline(im)
    return im


def serveur():
    """La baie de serveurs (1 case) : l'armoire noire, ses tiroirs, leurs voyants."""
    W, H = 16, 40
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 3, 35, 'i1', 'x0', edge='i0')
    for k, y in enumerate(range(5, 36, 4)):
        rect(put, 1, y, 14, y + 2, 'i0'); rect(put, 2, y + 1, 8, y + 1, 'i1')
        put(11, y + 1, 'V2' if k % 3 else 'M2'); put(13, y + 1, 'pc2' if k % 2 else 'h1')
    outline(im)
    return im


def etabli():
    """L'établi du menuisier (3 cases) : le plateau épais, un rabot, un marteau, une scie
    égoïne, l'étau, les outils au-dessus."""
    W, H = 48, 32
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 2, 0, W - 3, 7, 'k1'); rect(put, 2, 0, W - 3, 0, 'k2')   # le panneau à outils
    for x, k in ((6, 'a2'), (12, 'w1'), (18, 'a2'), (26, 'w1'), (34, 'a2'), (40, 'w1')):
        rect(put, x, 2, x + 1, 6, k)
    box(put, 0, 8, W, 9, 10, 'w4', 'w2', edge='w3')
    rect(put, 4, 10, 11, 12, 'w1'); rect(put, 6, 9, 8, 9, 'a2')         # le rabot
    rect(put, 16, 12, 24, 12, 'w1'); rect(put, 24, 10, 26, 13, 'a1')    # le marteau
    rect(put, 30, 10, 40, 13, 'a2'); rect(put, 40, 10, 43, 13, 'w1')    # la scie
    rect(put, W - 6, 17, W - 2, 21, 'i1')                               # l'étau
    rect(put, 2, 18, 4, 31, 'w1'); rect(put, W - 5, 22, W - 3, 31, 'w1'); rect(put, 2, 26, W - 3, 27, 'w1')
    outline(im)
    return im


def scie():
    """La scie circulaire (2 cases) : la table, la lame et son carter, une planche engagée."""
    W, H = 32, 26
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 4, W, 9, 6, 'a2', 'a1', edge='a1')
    rect(put, 3, 7, 28, 10, 'k1'); rect(put, 3, 7, 28, 7, 'k2')         # la planche
    for y in range(1, 9):                                               # la lame
        for x in range(13, 21):
            d = ((x - 16.5) / 4) ** 2 + ((y - 5) / 4) ** 2
            if d <= 1:
                put(x, y, 'a3' if d > 0.5 else 'a1')
    rect(put, 12, 0, 21, 1, 'M1')                                       # le carter
    for x in (2, W - 4):
        rect(put, x, 19, x + 1, 25, 'i1')
    outline(im)
    return im


def planches():
    """Une pile de planches (3 cases) : les planches de longueurs inégales, leurs bouts clairs."""
    W, H = 48, 20
    im = canvas(W, H)
    put, _ = painter(im)
    for k, y in enumerate(range(2, 16, 3)):
        x0, x1 = (k * 3) % 5, W - 1 - (k * 7) % 6
        rect(put, x0, y, x1, y + 2, 'k1'); rect(put, x0, y, x1, y, 'k2'); rect(put, x1 - 1, y, x1, y + 2, 'k2')
    rect(put, 2, 17, 5, 19, 'w1'); rect(put, W - 6, 17, W - 3, 19, 'w1')
    outline(im)
    return im


def armoire():
    """Une armoire neuve (1 case) : deux portes, leurs moulures, la corniche."""
    W, H = 16, 40
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 3, 35, 'w4', 'w2', edge='w3')
    rect(put, 0, 3, W - 1, 4, 'w3')
    rect(put, 7, 5, 8, 36, 'w0')
    for x0, x1 in ((2, 5), (10, 13)):
        rect(put, x0, 7, x1, 33, 'w3'); rect(put, x0 + 1, 8, x1 - 1, 32, 'w2')
    put(6, 20, 'o2'); put(9, 20, 'o2')
    rect(put, 1, 38, 2, 39, 'w0'); rect(put, 13, 38, 14, 39, 'w0')
    outline(im)
    return im


def palette():
    """Une palette de cartons (2 cases) : cinq cartons, leurs adhésifs, la palette."""
    W, H = 32, 26
    im = canvas(W, H)
    put, _ = painter(im)
    for x, y, w, h in ((1, 10, 14, 10), (16, 10, 15, 10), (4, 1, 12, 9), (17, 3, 12, 7)):
        rect(put, x, y, x + w - 1, y + h - 1, 'k1'); rect(put, x, y, x + w - 1, y, 'k2'); rect(put, x + w - 1, y, x + w - 1, y + h - 1, 'k0')
        rect(put, x + w // 2, y, x + w // 2, y + h - 1, 'k2')
    rect(put, 0, 20, W - 1, 25, 'w1'); rect(put, 0, 20, W - 1, 20, 'w3'); rect(put, 4, 23, 8, 25, 'w0'); rect(put, 22, 23, 26, 25, 'w0')
    outline(im)
    return im


def chariot():
    """Le chariot élévateur (2 cases) : la cabine orange, le siège, le mât et ses fourches, les
    roues."""
    W, H = 32, 32
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 2, 0, 3, 22, 'i1'); rect(put, 6, 0, 7, 22, 'i1'); rect(put, 2, 4, 7, 5, 'i0')   # le mât
    rect(put, 0, 21, 9, 22, 'a2')                                       # les fourches
    rect(put, 12, 0, 28, 1, 'i0'); rect(put, 12, 0, 13, 14, 'i0'); rect(put, 27, 0, 28, 14, 'i0')   # le toit
    box(put, 10, 14, 20, 4, 8, 'O2', 'O1', edge='O1')
    rect(put, 16, 9, 22, 13, 'i1'); rect(put, 16, 9, 22, 9, 'i2')       # le siège
    rect(put, 26, 18, 29, 21, 'O0')
    for cx in (13, 26):
        rect(put, cx - 3, 24, cx + 3, 30, 'i0'); rect(put, cx - 1, 26, cx + 1, 28, 'a2')
    outline(im)
    return im


MEUBLES = {
    'silo_grain': silo_grain, 'moulin': moulin, 'sacs_farine': lambda: sacs(('c0', 'c1', 'c2')),
    'metier_tisser': metier_tisser, 'bobines': bobines, 'rouleaux_tissu': rouleaux_tissu, 'machine_coudre': machine_coudre,
    'cuve': cuve, 'remplisseuse': remplisseuse, 'palette_pots': palette_pots, 'caisse_oeufs': caisse_oeufs,
    'betonniere': betonniere, 'presse_briques': presse_briques, 'palette_briques': palette_briques, 'sacs_ciment': lambda: sacs(('ci0', 'ci1', 'ci2')),
    'chaine_montage': chaine_montage, 'etabli_soudure': etabli_soudure, 'armoire_composants': armoire_composants, 'robot_bras': robot_bras, 'serveur': serveur,
    'etabli': etabli, 'scie': scie, 'planches': planches, 'armoire': armoire, 'palette': palette, 'chariot': chariot,
}
# les enseignes : le mot, le fond, l'encre
ENSEIGNES = {
    'minoterie': ('MINOTERIE', (236, 228, 204), (110, 70, 30)),
    'textile': ('TEXTILE', (120, 40, 90), (246, 236, 240)),
    'mayonnaise': ('MAYONNAISE', (246, 236, 180), (150, 40, 30)),
    'materiaux': ('MATÉRIAUX', (110, 110, 106), (250, 236, 200)),
    'electronique': ('ÉLECTRONIQUE', (20, 80, 44), (180, 240, 190)),
    'usine_info': ('USINE INFORMATIQUE', (30, 34, 44), (120, 200, 250)),
    'menuiserie': ('MENUISERIE', (150, 104, 60), (250, 240, 220)),
}


def main():
    out = {f'meuble_{k}.png': f() for k, f in MEUBLES.items()}
    for k, (mot, fond, encre) in ENSEIGNES.items():
        out[f'enseigne_{k}.png'] = enseigne(mot, fond=fond, encre=encre)
    for name, im in out.items():
        im.save(os.path.join(ASSETS, name), optimize=True)
    if '--apercu' in sys.argv:
        k, per = 4, 7
        ims = list(out.values())
        rows = [ims[i:i + per] for i in range(0, len(ims), per)]
        W = max(sum(im.width * k + 16 for im in r) for r in rows)
        RH = max(im.height for im in ims) * k + 16
        ap = Image.new('RGBA', (W, RH * len(rows)), (152, 124, 88, 255))
        for j, r in enumerate(rows):
            x = 0
            for im in r:
                big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                ap.alpha_composite(big, (x, (j + 1) * RH - 8 - big.height))
                x += big.width + 16
        ap.save(os.path.join(ROOT, 'apercu_fabriques.png'))
    print(f'fabriques : {len(out)} images')


if __name__ == '__main__':
    main()
