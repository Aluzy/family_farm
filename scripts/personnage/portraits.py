# Portraits 32 × 32 des 50 adultes (perso_01 à perso_50, scripts/personnage/catalogue.py) et des
# 50 enfants (enfant_01 à enfant_50, scripts/personnage/portraits_enfants.py) :
# assets/portraits/<nom>.png, tous dans le style des portraits dessinés à la main
# (scripts/personnage/modeles/portraits_dessines.png : neuf cases de 28 × 32, trois personnes
# en trois variantes).
#
# Les neuf dessins sont des portraits du jeu tels quels (DESSINS). Les autres sont assemblés à
# partir de leurs pièces :
#   - deux visages : « M » (le jeune et l'homme à moustache, colonnes 1 et 2 : le même visage,
#     chacun complétant ce que les cheveux de l'autre cachent) et « F » (la femme blonde,
#     colonne 3 : plus long, les cils, les lèvres) ; chacun avec son cou et son haut ;
#   - les coiffures : celles des dessins (la frange du jeune, les cheveux courts de l'homme, les
#     cheveux hérissés violets, les cheveux longs de la femme), puis celles qu'on en tire
#     (crâne dégarni, mi-longs, carré, cheveux attachés en chignon, couettes ou queue de
#     cheval, boucles) ;
#   - les couvre-chefs et détails : la casquette, le bandeau, les lunettes et la moustache des
#     dessins ; le chapeau de paille, le bonnet, le béret, la fleur, la barbe, les taches de
#     rousseur, les boucles d'oreilles, les rides (cheveux gris ou blancs) dessinés ici ;
#   - les couleurs : chaque pixel garde la nuance du dessin par rapport à la couleur de base de
#     sa région (peau, cheveux, haut, yeux, accessoire), transposée sur la couleur du catalogue.
# Un enfant est un portrait du même genre dont la tête descend de 3 rangées sur un corps plus
# étroit, sans rides ni pilosité, les joues roses.
#
#   python3 scripts/personnage/portraits.py            écrit assets/portraits/perso_XX.png et enfant_XX.png
#   python3 scripts/personnage/portraits.py --apercu   écrit aussi apercu_portraits.png (agrandi)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402
import modeles  # noqa: E402  (la couleur des yeux de chacun, la même que sur la carte)
import portraits_enfants  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, melange  # noqa: E402
DIR = os.path.join(ASSETS, 'portraits')
PLANCHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles', 'portraits_dessines.png')
N = 32
LARGE = 28                      # une case de la planche : 28 × 32, posée à DX du bord gauche
DX = 2

# Les neuf dessins : (colonne, rangée) de la planche ; la case du bas à gauche commence une
# rangée plus haut (ses mèches dépassent). L'homme à moustache est perso_07, le personnage par
# défaut d'un homme (data/general.json PERSO_DEFAUT, scripts/personnage/chibi.py DEFAUTS).
DESSINS = {
    'perso_01': (0, 0), 'perso_04': (2, 0), 'perso_05': (0, 1), 'perso_06': (2, 1),
    'perso_07': (1, 0), 'perso_08': (1, 1), 'perso_09': (0, 2), 'perso_10': (1, 2), 'perso_11': (2, 2),
}
HAUT = {(0, 2): 1}
# Les portraits générés validés : gardés tels quels dans assets/portraits (ce script ne les
# réécrit plus).
VALIDES = {f'perso_{n:02d}' for n in (3, 14, 15, 20, 21, 22, 25, 27, 29, 31, 33, 34, 35, 36,
                                       41, 42, 43, 44, 45, 48, 49)}

PEAU = (240, 185, 141)          # la peau des dessins (celle du catalogue « claire » s'en déduit)
BLANCS = {(238, 237, 236), (210, 205, 204), (255, 255, 255)}
# Le rôle des couleurs des trois dessins de base : (couleurs, couleur de base) par région ;
# le reste est de la peau.
ROLES = {
    'A': {
        'cheveux': ({(135, 96, 44), (182, 128, 60), (51, 39, 23), (148, 105, 50), (79, 58, 30), (200, 150, 87),
                     (123, 88, 40), (101, 74, 38), (90, 66, 34), (212, 171, 123), (208, 164, 111)}, (135, 96, 44)),
        'iris': ({(82, 129, 70), (63, 96, 55)}, (82, 129, 70)),
        'chemise': ({(185, 231, 146), (136, 169, 108), (36, 52, 22)}, (185, 231, 146)),
    },
    'B': {
        'cheveux': ({(52, 47, 43), (66, 50, 39), (88, 68, 54), (81, 62, 50), (64, 50, 40), (51, 43, 38),
                     (68, 63, 57), (76, 71, 64), (79, 58, 30)}, (88, 68, 54)),
        'iris': ({(56, 106, 178), (36, 71, 118)}, (56, 106, 178)),
        'chemise': ({(72, 80, 122), (60, 65, 90), (41, 43, 54)}, (72, 80, 122)),
    },
    'F': {
        'cheveux': ({(191, 163, 55), (219, 183, 44), (144, 122, 38), (202, 176, 74)}, (191, 163, 55)),
        'iris': ({(63, 96, 55), (73, 126, 60), (156, 226, 138)}, (73, 126, 60)),
        'chemise': ({(225, 141, 240), (188, 106, 202), (150, 63, 165)}, (225, 141, 240)),
        'cils': ({(11, 56, 0)}, None),
        'levres': ({(176, 56, 38), (217, 82, 61)}, None),
    },
    'H': {      # les cheveux hérissés violets (la case du bas à gauche)
        'cheveux': ({(42, 31, 88), (81, 63, 157), (71, 31, 120), (88, 53, 129), (18, 13, 37)}, (81, 63, 157)),
    },
}
CASES = {'A': (0, 0), 'B': (1, 0), 'F': (2, 0), 'H': (0, 2)}
CASQUETTE = {(36, 50, 122), (9, 11, 71), (17, 20, 105), (20, 31, 88), (9, 17, 58)}
BANDEAU = {(255, 0, 0), (223, 25, 25), (182, 9, 9)}
NOIR = (0, 0, 0)


def planche():
    return Image.open(PLANCHE).convert('RGBA')


def case(im, col, row, haut=None):
    """La case (col, row) : { (x, y): couleur } dans le cadre 32 × 32."""
    if haut is None:
        haut = HAUT.get((col, row), 0)
    x0, y0 = (0, 34, 68)[col], (0, 33, 66)[row] - haut
    g = {}
    for y in range(N):
        for x in range(LARGE):
            if 0 <= y0 + y < im.height:
                p = im.getpixel((x0 + x, y0 + y))
                if p[3]:
                    g[(x + DX, y)] = p[:3]
    return g


def jeton(src, c):
    """Le jeton d'un pixel du dessin `src` : (région, couleur, couleur de base de la région)."""
    for region, (couleurs, base) in ROLES[src].items():
        if c in couleurs:
            if region == 'cils':
                return ('fixe', c, None)
            if region == 'levres':
                return ('peau', c, PEAU)
            return (region, c, base)
    if c in BLANCS:
        return ('fixe', c, None)
    return ('peau', c, PEAU)


def lire(im, src, haut=None):
    col, row = CASES[src]
    return {q: jeton(src, c) for q, c in case(im, col, row, haut).items()}


def voisins4(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))


# ---------- les pièces ----------

class Pieces:
    def __init__(self):
        im = planche()
        A, B, F = lire(im, 'A'), lire(im, 'B'), lire(im, 'F')
        self.A, self.B, self.F = A, B, F
        # le visage M : celui de l'homme, complété par celui du jeune
        m = {q: t for q, t in B.items() if t[0] != 'cheveux'}
        for q, t in A.items():
            if q not in m and t[0] != 'cheveux':
                m[q] = t
        self.visage_m = m
        self.silhouette_b = set(B)
        # les cheveux
        self.frange = {q: t for q, t in A.items() if t[0] == 'cheveux'}
        cb = {q: t for q, t in B.items() if t[0] == 'cheveux'}
        self.moustache = {(x, y): t for (x, y), t in cb.items() if 17 <= y <= 19 and 10 <= x <= 21}
        self.machoire = {(x, y): t for (x, y), t in cb.items() if y >= 17 and (x, y) not in self.moustache}
        self.courts = {(x, y): t for (x, y), t in cb.items() if y < 17}
        h = {q: jeton('H', c) for q, c in case(im, 0, 2, 0).items()}
        self.herisses = {q: t for q, t in h.items() if t[0] == 'cheveux'}
        for (x, y) in list(self.herisses):      # (le haut des mèches, coupé par la case : refermé)
            if y == 0:
                self.herisses[(x, y)] = ('cheveux', (18, 13, 37), ROLES['H']['cheveux'][1])
        self.longs = {q: t for q, t in F.items() if t[0] == 'cheveux'}
        self.visage_f = {q: t for q, t in F.items() if t[0] != 'cheveux'}
        # les accessoires des variantes
        a2 = case(im, 0, 1)
        self.lunettes = {q: ('fixe', c, None) for q, c in a2.items() if c == NOIR}
        b2 = case(im, 1, 1)
        self.casquette = {(x, y): ('acc', c, (17, 20, 105)) for (x, y), c in b2.items() if y <= 8 and c in CASQUETTE}
        f2 = case(im, 2, 1)
        self.bandeau = {(x, y): (('fixe', c, None) if c == (255, 255, 255) else ('acc', c, (223, 25, 25)))
                        for (x, y), c in f2.items() if 5 <= y <= 7 and (c in BANDEAU or c == (255, 255, 255))}


P = None


def pieces():
    global P
    if P is None:
        P = Pieces()
    return P


# ---------- un portrait ----------

def ton(t, c):
    """Le même jeton, une autre nuance (la couleur `c`, de la même région)."""
    return (t[0], c, t[2])


def cheveux_sombre(base):
    """Le contour des cheveux (les plus sombres) d'une coiffure de base `base`."""
    return {
        (135, 96, 44): (51, 39, 23), (88, 68, 54): (52, 47, 43), (191, 163, 55): (144, 122, 38),
        (81, 63, 157): (18, 13, 37),
    }[base]


def cheveux_ombre(base):
    return {
        (135, 96, 44): (79, 58, 30), (88, 68, 54): (66, 50, 39), (191, 163, 55): (144, 122, 38),
        (81, 63, 157): (42, 31, 88),
    }[base]


def cheveux_clair(base):
    return {
        (135, 96, 44): (182, 128, 60), (88, 68, 54): (88, 68, 54), (191, 163, 55): (219, 183, 44),
        (81, 63, 157): (81, 63, 157),
    }[base]


def H(base, c):
    return ('cheveux', c, base)


def S(c):
    return ('peau', c, PEAU)


PEAU_BORD, PEAU_OMBRE, PEAU_CLAIRE, PEAU_RIDE = (230, 156, 95), (234, 161, 100), (244, 201, 168), (226, 140, 69)


class Portrait:
    def __init__(self, visage):
        self.g = dict(visage)

    def poser(self, calque, sous=None):
        """Pose un calque { (x, y): jeton } ; `sous` : les régions qu'il ne recouvre pas."""
        for q, t in calque.items():
            if 0 <= q[0] < N and 0 <= q[1] < N and not (sous and q in self.g and self.g[q][0] in sous):
                self.g[q] = t

    def region(self, q):
        t = self.g.get(q)
        return t[0] if t else None

    def ote(self, test):
        for q in [q for q, t in self.g.items() if test(q, t)]:
            del self.g[q]


def crane(p):
    """La peau du crâne là où ni le visage ni une coiffure ne la donnent (sous la silhouette de
    l'homme) : plus sombre au bord et à droite, un reflet en haut à gauche."""
    sil = pieces().silhouette_b
    for (x, y) in sil:
        if (x, y) in p.g or y > 18:
            continue
        bord = any(n not in sil for n in voisins4(x, y))
        c = PEAU_BORD if bord else (PEAU_OMBRE if x >= 21 else PEAU)
        p.g[(x, y)] = S(c)
    for q in ((11, 3), (12, 3), (11, 4)):
        if p.region(q) == 'peau':
            p.g[q] = S(PEAU_CLAIRE)


def sourcils(p, base):
    for y, xs in ((10, range(9, 14)), (10, range(17, 22))):
        for x in xs:
            p.g[(x, y)] = H(base, cheveux_ombre(base) if x in (9, 21) else cheveux_sombre(base))


def contour(p):
    """Le bord de ce qui touche le vide : les cheveux au plus sombre, la peau un ton plus sombre."""
    for (x, y), t in list(p.g.items()):
        if not any(n not in p.g for n in voisins4(x, y)):
            continue
        if t[0] == 'cheveux':
            p.g[(x, y)] = ton(t, cheveux_sombre(t[2]))
        elif t[0] == 'peau' and t[1] in (PEAU, PEAU_CLAIRE, PEAU_OMBRE):
            p.g[(x, y)] = S(PEAU_BORD)


# ---------- les coiffures ----------

def c_frange(p):
    p.poser(pieces().frange)


def c_courts(p):
    p.poser(pieces().courts)


def c_herisses(p):
    p.poser(pieces().herisses)


def c_chauve(p):
    """Le crâne nu, une couronne de cheveux courts au-dessus des oreilles."""
    crane(p)
    base = ROLES['B']['cheveux'][1]
    p.poser({(x, y): t for (x, y), t in pieces().courts.items() if 11 <= y and (x <= 7 or x >= 24)})
    sourcils(p, base)


def c_boucles(p):
    """Des boucles : la frange du jeune, piquée de reflets et d'ombres en damier, le bord festonné."""
    fr = pieces().frange
    base = ROLES['A']['cheveux'][1]
    out = {}
    for (x, y), t in fr.items():
        bord = any(n not in fr for n in voisins4(x, y))
        if bord:
            out[(x, y)] = t
        elif (x + 2 * y) % 5 == 0:
            out[(x, y)] = H(base, cheveux_clair(base))
        elif (x + 2 * y) % 5 == 2:
            out[(x, y)] = H(base, cheveux_ombre(base))
        else:
            out[(x, y)] = H(base, base)
    for (x, y), t in fr.items():            # festons : une case de plus, une sur trois, vers le dehors
        if t[1] == cheveux_sombre(base) and (x + y) % 3 == 0 and y <= 12:
            for n in voisins4(x, y):
                if n not in fr and n[1] < y + 1 and 0 <= n[0] < N and 0 <= n[1] < N:
                    out[n] = H(base, cheveux_sombre(base))
                    out[(x, y)] = H(base, cheveux_ombre(base))
                    break
    p.poser(out)


def coupe_f(jusqua):
    """Les cheveux longs de la femme coupés à la rangée `jusqua` (exclue), d'une ligne sombre."""
    def f(p):
        lg = pieces().longs
        cal = {(x, y): t for (x, y), t in lg.items() if y < jusqua}
        for (x, y), t in cal.items():
            if y == jusqua - 1 and t[1] != cheveux_sombre(t[2]):
                cal[(x, y)] = ton(t, cheveux_ombre(t[2]))
        p.poser(cal)
    return f


def c_longs(p):
    p.poser(pieces().longs)


def frange_droite(p):
    """Une frange droite sur le front, jusqu'aux sourcils."""
    base = ROLES['F']['cheveux'][1]
    for x in range(7, 25):
        for y in range(8, 11):
            if p.region((x, y)) in ('peau', 'cheveux'):
                c = cheveux_ombre(base) if y == 10 else (cheveux_clair(base) if (x * 3 + y) % 7 == 0 else base)
                p.g[(x, y)] = H(base, c)


def attaches(p):
    """Les cheveux tirés en arrière : la chevelure de la femme réduite à la forme de la tête de
    l'homme (ses cheveux courts) et à une case autour du visage, jusqu'au menton."""
    lg = pieces().longs
    vis = pieces().visage_f
    sil = pieces().silhouette_b
    cal = {}
    for (x, y), t in lg.items():
        if y > 21:
            continue
        if (x, y) in sil or any((x + dx, y) in vis and vis[(x + dx, y)][0] == 'peau' for dx in (-1, 1)):
            cal[(x, y)] = t
    p.poser(cal)


def touffe(p, cx, y0, y1, base, lien=True):
    """Une mèche nouée (couette, queue de cheval) : un fuseau de cheveux centré en cx."""
    milieu = (y0 + y1) / 2
    for y in range(y0, y1 + 1):
        r = 2.4 - abs(y - milieu) * 2.0 / max(1, (y1 - y0))
        for x in range(int(cx - 3), int(cx + 4)):
            if abs(x - cx) <= r and 0 <= x < N:
                bord = abs(x - cx) > r - 1 or y in (y0, y1)
                c = cheveux_sombre(base) if bord else (cheveux_clair(base) if (x + y) % 4 == 0 and x < cx else base)
                p.g[(x, y)] = H(base, c)
    if lien:
        for x in range(int(cx) - 1, int(cx) + 2):
            p.g[(x, y0)] = ('acc', (223, 25, 25), (223, 25, 25))


def c_chignon(p):
    """Les cheveux tirés en arrière, noués en chignon derrière le haut de la tête (à droite)."""
    attaches(p)
    base = ROLES['F']['cheveux'][1]
    for y in range(0, 8):
        for x in range(21, 30):
            e = (x - 25.5) ** 2 / 12 + (y - 3.5) ** 2 / 12
            if e <= 1 and (x, y) not in p.g or e <= 1 and x >= 25:
                bord = e > 0.6
                mèche = (x - y) % 4 == 0
                p.g[(x, y)] = H(base, cheveux_sombre(base) if bord else (cheveux_ombre(base) if mèche else
                                                                          (cheveux_clair(base) if x <= 24 and y <= 3 else base)))


def c_couettes(p):
    """Les cheveux longs de la femme jusqu'aux oreilles, puis deux couettes nouées qui tombent
    sur les épaules."""
    base = ROLES['F']['cheveux'][1]
    p.poser({(x, y): t for (x, y), t in pieces().longs.items() if y <= 15})
    touffe(p, 4.5, 15, 27, base)
    touffe(p, 27.5, 15, 27, base)


def c_queue(p):
    attaches(p)
    base = ROLES['F']['cheveux'][1]
    touffe(p, 27, 7, 21, base)


COUPES = {
    # adultes
    'frange': ('M', c_frange), 'courts': ('M', c_courts), 'chauve': ('M', c_chauve),
    'longs': ('F', c_longs), 'mi': ('F', coupe_f(27)), 'carre': ('F', coupe_f(23)),
    'frange_carre': ('F', lambda p: (coupe_f(23)(p), frange_droite(p))),
    'couettes': ('F', c_couettes), 'chignon': ('F', c_chignon),
    # enfants
    'court': ('M', c_courts), 'herisse': ('M', c_herisses), 'meche': ('M', c_frange), 'boucles': ('M', c_boucles),
    'long': ('F', c_longs), 'queue': ('F', c_queue),
}


# ---------- les couvre-chefs ----------

def sous_chapeau(p, jusqua):
    """Ôte les cheveux qui dépasseraient au-dessus de la rangée `jusqua`."""
    p.ote(lambda q, t: q[1] < jusqua and t[0] == 'cheveux')


def h_casquette(p):
    sous_chapeau(p, 7)
    p.poser(pieces().casquette)


def h_bandeau(p):
    p.poser({q: t for q, t in pieces().bandeau.items() if q in p.g})


def A(c):
    return ('acc', c, (160, 160, 160))


def h_bonnet(p):
    """Le haut de la tête (au-dessus de la rangée 8) devient un bonnet, côtelé en bas."""
    sil = pieces().silhouette_b
    p.ote(lambda q, t: q[1] <= 7 and q not in sil)
    tete = [q for q, t in p.g.items() if q[1] <= 7 and t[0] in ('cheveux', 'peau')]
    for (x, y) in tete:
        bord = any(n not in p.g for n in voisins4(x, y))
        if bord:
            c = (70, 70, 70)
        elif y >= 6:
            c = (190, 190, 190) if x % 2 else (130, 130, 130)
        else:
            c = (200, 200, 200) if x < 14 and y <= 3 else ((120, 120, 120) if x >= 22 else (160, 160, 160))
        p.g[(x, y)] = A(c)
    for (x, y) in ((15, 0), (16, 0)):
        p.g[(x, y)] = A((210, 210, 210))


def h_beret(p):
    sous_chapeau(p, 3)
    for y in range(0, 6):
        for x in range(4, 28):
            e = (x - 16) ** 2 / 121 + (y - 2.6 + (x - 16) * 0.06) ** 2 / 5.5
            if e <= 1:
                c = (70, 70, 70) if e > 0.7 else ((200, 200, 200) if y <= 2 and x < 15 else (150, 150, 150))
                p.g[(x, y)] = A(c)
    p.g[(17, 0)] = A((70, 70, 70))


PAILLE = {'S': (232, 194, 90), 'T': (250, 222, 136), 'U': (184, 138, 46), 'V': (120, 84, 30)}


def h_paille(p):
    sous_chapeau(p, 7)
    for y in range(0, 7):
        for x in range(9, 23):
            if y == 0 and not 11 <= x <= 20:
                continue
            bord = x in (9, 22) or y == 0 or (y == 1 and x in (10, 21))
            c = PAILLE['V'] if bord else (PAILLE['T'] if (x + y) % 4 == 0 else PAILLE['S'])
            p.g[(x, y)] = ('fixe', c, None)
    for x in range(10, 22):                         # le ruban
        p.g[(x, 5)] = A((160, 160, 160))
        p.g[(x, 6)] = A((110, 110, 110))
    for y, (x0, x1) in ((7, (2, 29)), (8, (1, 30)), (9, (3, 28))):
        for x in range(x0, x1 + 1):
            bord = x in (x0, x1) or y == 9
            c = PAILLE['V'] if bord else (PAILLE['U'] if y == 8 else (PAILLE['T'] if x % 3 == 0 else PAILLE['S']))
            p.g[(x, y)] = ('fixe', c, None)


def h_fleur(p):
    cx, cy = 23, 6
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        p.g[(cx + dx, cy + dy)] = A((200, 200, 200))
    for dx, dy in ((-1, -1), (1, 1)):
        p.g[(cx + dx, cy + dy)] = A((130, 130, 130))
    p.g[(cx, cy)] = ('fixe', (236, 200, 60), None)


def h_noeud(p):
    """Un nœud sur le côté du haut de la tête."""
    for (x, y), c in (((21, 2), 200), ((22, 2), 160), ((21, 3), 160), ((22, 3), 120), ((23, 3), 90),
                      ((25, 2), 200), ((24, 2), 160), ((25, 3), 160), ((24, 3), 120)):
        p.g[(x, y)] = A((c, c, c))
    p.g[(23, 2)] = A((110, 110, 110))


def h_serre_tete(p):
    for x in range(4, 28):
        for y in range(4, 7):
            if p.region((x, y)) == 'cheveux' and y == 5 + (abs(x - 16) // 6):
                p.g[(x, y)] = A((170, 170, 170) if x < 16 else (130, 130, 130))


COUVRE_CHEFS = {None: lambda p: None, 'casquette': h_casquette, 'bandeau': h_bandeau, 'bonnet': h_bonnet,
                'beret': h_beret, 'paille': h_paille, 'fleur': h_fleur, 'noeud': h_noeud, 'serre_tete': h_serre_tete}


# ---------- les détails ----------

def d_lunettes(p):
    """Les lunettes du jeune ; sur le visage F (des yeux plus grands, plus haut), des montures
    tracées autour de chaque œil."""
    if p.visage == 'M':
        p.poser(pieces().lunettes)
        return
    noir = ('fixe', NOIR, None)
    for x0, x1 in ((7, 15), (16, 24)):
        for x in range(x0 + 1, x1):
            p.g[(x, 9)] = noir
            p.g[(x, 14)] = noir
        for y in range(10, 14):
            p.g[(x0, y)] = noir
            p.g[(x1, y)] = noir


def d_moustache(p):
    if p.visage == 'M':
        p.poser({q: ton(t, t[1]) for q, t in pieces().moustache.items()})


def d_barbe(p):
    """La barbe : la moustache, et un collier sur le bord de la mâchoire et le menton (la
    bouche reste visible) ; plus clairsemée vers les joues."""
    if p.visage != 'M':
        return
    base = ROLES['B']['cheveux'][1]
    p.poser(pieces().moustache)
    for (x, y), t in list(p.g.items()):
        if t[0] != 'peau' or y < 17 or y > 22:
            continue
        bord = any(p.region((x + dx, y)) not in ('peau', 'fixe', 'iris') for dx in (-1, 1))
        menton = y >= 21 and 11 <= x <= 20
        bouche = 19 <= y <= 20 and 12 <= x <= 19
        if bouche or not (bord or menton) or (y == 17 and not bord):
            continue
        if y <= 18 and (x + y) % 2:
            continue                         # (clairsemée sur les joues)
        c = (52, 47, 43) if y == 22 or (bord and y >= 20) else ((66, 50, 39) if (x + 2 * y) % 3 else (88, 68, 54))
        p.g[(x, y)] = H(base, c)


# Les places des détails sur chaque visage (le visage F a les yeux une rangée plus haut, la
# bouche et le menton plus bas).
PLACES = {
    'rousseur': {'M': ((8, 15), (10, 16), (11, 15), (20, 15), (21, 16), (23, 15)),
                 'F': ((8, 16), (10, 17), (11, 16), (21, 16), (22, 17), (24, 16))},
    'joues': {'M': ((9, 18), (10, 18), (21, 18), (22, 18)), 'F': ((9, 19), (10, 19), (21, 19), (22, 19))},
    'rides': {'M': ((9, 16), (10, 16), (21, 16), (22, 16), (12, 18), (12, 19), (19, 18), (19, 19)),
              'F': ((9, 16), (10, 16), (22, 16), (23, 16), (12, 20), (12, 21), (19, 20), (19, 21))},
    'boucles': {'M': ((7, 18), (24, 18)), 'F': ((7, 21), (24, 21))},
}


def taches(p, quoi, c):
    for q in PLACES[quoi][p.visage]:
        if p.region(q) == 'peau':
            p.g[q] = S(c)


def d_rousseur(p):
    taches(p, 'rousseur', (214, 127, 58))


def d_boucles(p):
    for (x, y) in PLACES['boucles'][p.visage]:
        p.g[(x, y)] = ('fixe', (236, 200, 60), None)
        p.g[(x, y + 1)] = ('fixe', (184, 138, 46), None)


def d_joues(p):
    taches(p, 'joues', (236, 150, 130))


def d_rides(p):
    """L'âge : un pli sous les yeux et de chaque côté de la bouche."""
    taches(p, 'rides', PEAU_RIDE)


def d_pansement(p):
    for (x, y), c in (((19, 17), (244, 226, 190)), ((20, 17), (240, 240, 232)), ((21, 17), (244, 226, 190)),
                      ((20, 16), (220, 196, 160)), ((20, 18), (220, 196, 160))):
        p.g[(x, y)] = ('fixe', c, None)


def d_salopette(p):
    """Les bretelles et la bavette d'une salopette sur le haut."""
    for (x, y), t in list(p.g.items()):
        if t[0] != 'chemise':
            continue
        if x in (10, 11, 20, 21) and y >= 26 or 10 <= x <= 21 and y >= 30:
            p.g[(x, y)] = ('fixe', (63, 111, 168) if x not in (11, 21) or y >= 30 else (44, 79, 124), None)


DETAILS = {'lunettes': d_lunettes, 'moustache': d_moustache, 'barbe': d_barbe, 'rousseur': d_rousseur,
           'boucles': d_boucles, 'joues': d_joues, 'rides': d_rides, 'pansement': d_pansement, 'salopette': d_salopette}


def motif(p, m):
    """Le motif du haut, sur ses pixels clairs."""
    if not m:
        return
    for (x, y), t in list(p.g.items()):
        if t[0] != 'chemise' or t[1] != t[2]:
            continue
        if m == 'rayures' and y % 2 == 0:
            p.g[(x, y)] = ('chemise', melange(t[2], (0, 0, 0), 0.25), t[2])
        elif m == 'carreaux' and (x % 3 == 0 or y % 3 == 0):
            p.g[(x, y)] = ('motif', None, None)
        elif m == 'pois' and (x + 2 * y) % 4 == 0 and y % 2 == 0:
            p.g[(x, y)] = ('motif', None, None)


# ---------- la base ----------

def corps_f(p):
    """Le haut de la femme sous ses cheveux : les épaules complétées en pente."""
    vis = pieces().visage_f
    ch = [(x, y) for (x, y), t in vis.items() if t[0] == 'chemise']
    base = ROLES['F']['chemise'][1]
    for y, (x0, x1) in ((26, (7, 24)), (27, (5, 26)), (28, (4, 27)), (29, (3, 28)), (30, (2, 29)), (31, (2, 29))):
        for x in range(x0, x1 + 1):
            if (x, y) not in p.g:
                p.g[(x, y)] = ('chemise', (150, 63, 165) if x in (x0, x1) else base, base)
    return ch


def base(visage):
    pc = pieces()
    p = Portrait(pc.visage_m if visage == 'M' else pc.visage_f)
    p.visage = visage
    if visage == 'F':
        corps_f(p)
    return p


def enfant(p):
    """La tête descend de 3 rangées sur un corps plus étroit (resserré de 20 % autour du milieu)."""
    cou_y = 23 if p.visage == 'M' else 26
    corps = {q: t for q, t in p.g.items() if t[0] in ('chemise', 'motif') or (t[0] == 'fixe' and q[1] >= 26)
             or (t[0] == 'peau' and q[1] >= cou_y)}
    tete = {q: t for q, t in p.g.items() if q not in corps}
    g = {}
    for y in range(N):
        for x in range(N):
            sx = round(15.5 + (x - 15.5) / 0.8)
            t = corps.get((sx, y - 3))
            if t:
                g[(x, y)] = t
    for (x, y), t in tete.items():
        if y + 3 < N:
            g[(x, y + 3)] = t
    p.g = g


# ---------- les couleurs ----------

def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def transfert(c, de, vers):
    """Composante par composante : la nuance de c par rapport à `de`, posée sur `vers`."""
    out = []
    for a, b, v in zip(c, de, vers):
        if a <= b:
            out.append(v * a / max(1, b))
        else:
            out.append(v + (255 - v) * (a - b) / max(1, 255 - b) * 0.8)
    return tuple(max(0, min(255, round(u))) for u in out)


def teinte(c, de, vers):
    """Par la luminosité : c est k fois plus clair que `de` ; la couleur `vers`, autant."""
    k = lum(c) / max(1, lum(de))
    if k <= 1:
        return tuple(round(v * k) for v in vers)
    return tuple(min(255, round(v + (255 - v) * min(1, (k - 1) * 1.2) * 0.7)) for v in vers)


IRIS = {'brun': (110, 72, 40), 'noisette': (150, 104, 52), 'vert': (82, 129, 70), 'bleu': (56, 106, 178),
        'violet': (120, 70, 170), 'turquoise': (11, 175, 193)}


def peindre(p, d, i):
    peau = catalogue.PEAU[d['peau']]['f']
    peau_cible = transfert(PEAU, catalogue.PEAU['claire']['f'], peau)
    hr = catalogue.CHEVEUX[d['cheveux']]['b']
    chem = catalogue.HABITS[d['habit']]['n']
    oeil = IRIS[modeles.yeux(d, i)]
    acc = d['accessoire']
    mot = (200, 60, 60) if d['habit'] == 'blanc' else (244, 240, 228)
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for (x, y), (r, c, b) in p.g.items():
        if r == 'peau':
            out = transfert(c, b, peau_cible)
        elif r == 'cheveux':
            out = teinte(c, b, hr)
        elif r == 'chemise':
            out = teinte(c, b, chem)
        elif r == 'iris':
            out = transfert(c, b, oeil)
        elif r == 'acc':
            out = teinte(c, b, acc)
        elif r == 'motif':
            out = mot
        else:
            out = c
        im.putpixel((x, y), out + (255,))
    return im


def portrait(d, i, est_enfant=False):
    vis, coupe = COUPES[d['coupe']]
    if any(x in d['details'] for x in ('barbe', 'moustache')):
        vis = 'M'
    p = base(vis)
    coupe(p)
    details = list(d['details'])
    if est_enfant:
        details = [x for x in details if x not in ('barbe', 'moustache')] + ['joues']
        if vis == 'F':
            for q, t in p.g.items():        # (pas de rouge à lèvres)
                if t[0] == 'peau' and t[1] in ROLES['F']['levres'][0]:
                    p.g[q] = S(PEAU_BORD if t[1] == (217, 82, 61) else PEAU_RIDE)
    elif d['cheveux'] in ('gris', 'blancs'):
        details.append('rides')
    for x in details:
        if x in DETAILS and x not in ('lunettes', 'salopette'):
            DETAILS[x](p)
    COUVRE_CHEFS[d['chapeau']](p)
    if 'lunettes' in details:
        d_lunettes(p)
    motif(p, d['motif'])
    if 'salopette' in details:
        d_salopette(p)
    contour(p)
    if est_enfant:
        enfant(p)
    return peindre(p, d, i)


def dessin(nom):
    col, row = DESSINS[nom]
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for q, c in case(planche(), col, row).items():
        im.putpixel(q, c + (255,))
    return im


def tous():
    """[(nom, image)] : les 50 adultes, puis les 50 enfants."""
    out = []
    for i, (nom, d) in enumerate(catalogue.personnages()):
        if nom in VALIDES:
            out.append((nom, Image.open(os.path.join(DIR, f'{nom}.png')).convert('RGBA')))
        else:
            out.append((nom, dessin(nom) if nom in DESSINS else portrait(d, i)))
    for i, (nom, d) in enumerate(portraits_enfants.enfants()):
        out.append((nom, portrait(d, 50 + i, True)))     # (i : son rang parmi tous, comme modeles.tous())
    return out


def main():
    images = tous()
    for nom, im in images:
        im.save(os.path.join(DIR, f'{nom}.png'))
    print(f'assets/portraits : {len(images)} portraits de {N} × {N} ({len(DESSINS)} dessinés à la main)')
    if '--apercu' in sys.argv:
        S_, M, cols = 4, 6, 10
        rows = (len(images) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (N * S_ + M) + M, rows * (N * S_ + M) + M), (230, 214, 180, 255))
        for k, (_, im) in enumerate(images):
            sheet.alpha_composite(im.resize((N * S_, N * S_), Image.NEAREST), (M + (k % cols) * (N * S_ + M), M + (k // cols) * (N * S_ + M)))
        sheet.save(os.path.join(ROOT, 'apercu_portraits.png'))


if __name__ == '__main__':
    main()
