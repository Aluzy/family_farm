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
# Les enfants partent du portrait d'enfant dessiné à la main (modeles/portrait_enfant.png, 20 × 25,
# en bas au milieu de la case) : leurs coiffures, couvre-chefs et détails sont dessinés ici.
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
# Les portraits générés puis retouchés à la main (scripts/personnage/modeles/portraits_retouches.png :
# les 50 adultes en 10 × 5 cases de 32 × 32, 2 px entre elles) : portraits du jeu tels quels. Trois
# servent aussi de modèles aux autres (PIECES_RETOUCHEES) : les couettes de perso_02, les lunettes
# du visage F de perso_16 et la barbe de perso_18.
RETOUCHES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles', 'portraits_retouches.png')
RETOUCHES_NOMS = ('perso_02', 'perso_16', 'perso_17', 'perso_18', 'perso_20')
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
    }.get(base) or tuple(min(255, round(v * 0.4)) for v in base)


def cheveux_ombre(base):
    return {
        (135, 96, 44): (79, 58, 30), (88, 68, 54): (66, 50, 39), (191, 163, 55): (144, 122, 38),
        (81, 63, 157): (42, 31, 88),
    }.get(base) or tuple(min(255, round(v * 0.7)) for v in base)


def cheveux_clair(base):
    return {
        (135, 96, 44): (182, 128, 60), (88, 68, 54): (88, 68, 54), (191, 163, 55): (219, 183, 44),
        (81, 63, 157): (81, 63, 157),
    }.get(base) or tuple(min(255, round(v * 1.15)) for v in base)


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


def c_chauve(p):
    """Le crâne nu, une couronne de cheveux courts au-dessus des oreilles."""
    crane(p)
    base = ROLES['B']['cheveux'][1]
    p.poser({(x, y): t for (x, y), t in pieces().courts.items() if 11 <= y and (x <= 7 or x >= 24)})
    sourcils(p, base)


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
    """Les couettes retouchées à la main (perso_02) : les cheveux longs jusqu'aux oreilles, deux
    couettes ondulées nouées d'un lien."""
    p.poser(pieces_retouchees()['couettes'])


COUPES = {
    # adultes
    'frange': ('M', c_frange), 'courts': ('M', c_courts), 'chauve': ('M', c_chauve),
    'longs': ('F', c_longs), 'mi': ('F', coupe_f(27)), 'carre': ('F', coupe_f(23)),
    'frange_carre': ('F', lambda p: (coupe_f(23)(p), frange_droite(p))),
    'couettes': ('F', c_couettes), 'chignon': ('F', c_chignon),
}


# ---------- les pièces retouchées ----------

def retouche(nom):
    """La case de `nom` (perso_XX ou enfant_XX) sur sa planche de retouches : { (x, y): couleur }."""
    im = Image.open(RETOUCHES_ENFANTS if nom.startswith('enfant') else RETOUCHES).convert('RGBA')
    i = int(nom[-2:]) - 1
    x0, y0 = (i % 10) * 34, (i // 10) * 34
    return {(x, y): im.getpixel((x0 + x, y0 + y))[:3] for y in range(N) for x in range(N) if im.getpixel((x0 + x, y0 + y))[3]}


def ecart(c, cible):
    """L'écart entre c et la couleur `cible` portée à la même luminosité."""
    k = lum(c) / max(1, lum(cible))
    return sum(abs(a - min(255, b * k)) for a, b in zip(c, cible))


def calque_retouche(nom, ref, garde):
    """Ce que la retouche de `nom` ajoute à la référence `ref` (un portrait en jetons, sans le
    détail retouché) : chaque pixel qui diffère, en jeton de la région que `garde(q, c, regions)`
    choisit parmi les régions possibles (cheveux, accessoire, peau : la plus proche d'abord)."""
    d = dict(catalogue.personnages())[nom]
    i = int(nom[-2:]) - 1
    avant = peindre(ref, d, i)
    peau = transfert(PEAU, catalogue.PEAU['claire']['f'], catalogue.PEAU[d['peau']]['f'])
    bases = {'cheveux': catalogue.CHEVEUX[d['cheveux']]['b'], 'acc': d['accessoire'], 'peau': peau}
    out = {}
    for q, c in retouche(nom).items():
        a = avant.getpixel(q)
        if a[3] and a[:3] == c:
            continue
        regions = sorted(bases, key=lambda r: ecart(c, bases[r]))
        r = garde(q, c, regions)
        if r == 'fixe':
            out[q] = ('fixe', c, None)
        elif r:
            out[q] = (r, c, bases[r])
    return out


PR = None


def pieces_retouchees():
    global PR
    if PR is None:
        cat = dict(catalogue.personnages())
        # les couettes : les cheveux et les liens (sur le visage F nu)
        # (la peau, ses taches de rousseur, n'en fait pas partie)
        couettes = calque_retouche('perso_02', base('F'), lambda q, c, rs: None if rs[0] == 'peau' else rs[0])
        # la barbe : les poils sous les cheveux courts (rangées 16 à 24)
        p = base('M')
        c_courts(p)
        motif(p, cat['perso_18']['motif'])
        contour(p)
        barbe = calque_retouche('perso_18', p, lambda q, c, rs: 'cheveux' if 16 <= q[1] <= 24 else None)
        # les lunettes du visage F : la monture (sa couleur), l'ombre qu'elle pose sur la peau
        p = base('F')
        c_chignon(p)
        d_rides(p)
        motif(p, cat['perso_16']['motif'])
        contour(p)
        monture = (165, 72, 72)
        lunettes = calque_retouche('perso_16', p, lambda q, c, rs: None if not 9 <= q[1] <= 17 else
                                   ('fixe' if sum(abs(a - b) for a, b in zip(c, monture)) < 40 else 'peau'))
        PR = {'couettes': couettes, 'barbe': barbe, 'lunettes': lunettes}
    return PR


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


COUVRE_CHEFS = {None: lambda p: None, 'casquette': h_casquette, 'bandeau': h_bandeau, 'bonnet': h_bonnet,
                'beret': h_beret, 'paille': h_paille, 'fleur': h_fleur}


# ---------- les détails ----------

def d_lunettes(p):
    """Les lunettes du jeune ; sur le visage F, celles retouchées à la main (perso_16)."""
    p.poser(pieces().lunettes if p.visage == 'M' else pieces_retouchees()['lunettes'])


def d_moustache(p):
    if p.visage == 'M':
        p.poser({q: ton(t, t[1]) for q, t in pieces().moustache.items()})


def d_barbe(p):
    """La barbe retouchée à la main (perso_18) : moustache et collier, la bouche visible."""
    if p.visage == 'M':
        p.poser(pieces_retouchees()['barbe'])


# Les places des détails sur chaque visage (le visage F a les yeux une rangée plus haut, la
# bouche et le menton plus bas).
PLACES = {
    'rousseur': {'M': ((8, 15), (10, 16), (11, 15), (20, 15), (21, 16), (23, 15)),
                 'F': ((8, 16), (10, 17), (11, 16), (21, 16), (22, 17), (24, 16))},
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


def d_rides(p):
    """L'âge : un pli sous les yeux et de chaque côté de la bouche."""
    taches(p, 'rides', PEAU_RIDE)


DETAILS = {'lunettes': d_lunettes, 'moustache': d_moustache, 'barbe': d_barbe, 'rousseur': d_rousseur,
           'boucles': d_boucles, 'rides': d_rides}


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


def jetons(d):
    """Le portrait d'un adulte en jetons (avant les couleurs)."""
    vis, coupe = COUPES[d['coupe']]
    if any(x in d['details'] for x in ('barbe', 'moustache')):
        vis = 'M'
    p = base(vis)
    coupe(p)
    details = list(d['details'])
    if d['cheveux'] in ('gris', 'blancs'):
        details.append('rides')
    for x in details:
        if x in DETAILS and x != 'lunettes':
            DETAILS[x](p)
    COUVRE_CHEFS[d['chapeau']](p)
    if 'lunettes' in details:
        d_lunettes(p)
    motif(p, d['motif'])
    contour(p)
    return p


def portrait(d, i):
    return peindre(jetons(d), d, i)


# ---------- les enfants ----------
# Le modèle dessiné à la main (scripts/personnage/modeles/portrait_enfant.png, 20 × 25 : le garçon
# à la coupe au bol et au t-shirt vert, les couleurs du jeune des adultes), posé en bas au milieu
# de la case 32 × 32 (EX, EY) : la place au-dessus et sur les côtés reçoit chignon, couettes,
# queue de cheval, mèches hérissées et chapeaux. Les coordonnées ci-dessous sont celles du modèle.

MODELE_ENFANT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles', 'portrait_enfant.png')
EX, EY = 6, 7
CH = ROLES['A']['cheveux'][1]
# les nuances des cheveux du modèle : contour, sombre, base, mi-clair, reflet
C_O, C_D, C_B, C_M, C_L = (51, 39, 23), (101, 74, 38), (135, 96, 44), (148, 105, 50), (182, 128, 60)


class Enfant(Portrait):
    """Un portrait d'enfant, en coordonnées du modèle (décalées de EX, EY à la pose)."""

    def __init__(self):
        im = Image.open(MODELE_ENFANT).convert('RGBA')
        super().__init__({(x, y): jeton('A', im.getpixel((x, y))[:3])
                          for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[3]})
        self.visage = 'E'

    def met(self, x, y, t):
        if -EX <= x < N - EX and -EY <= y < N - EY:
            self.g[(x, y)] = t

    def cheveux(self):
        return {q for q, t in self.g.items() if t[0] == 'cheveux'}


def ch(c):
    return H(CH, c)


def e_cotes_courts(p):
    """Les cheveux coupés au-dessus des oreilles : les côtés du bol ôtés sous la rangée 6, la
    peau du bord du visage complétée, les oreilles."""
    p.ote(lambda q, t: t[0] == 'cheveux' and q[1] >= 7)
    for y in range(7, 12):
        xs = [x for (x, yy) in p.g if yy == y]
        for x in (min(xs) - 1, max(xs) + 1):
            p.g[(x, y)] = S(PEAU_BORD)
    for x in (2, 17):
        for y, c in ((8, PEAU_BORD), (9, PEAU), (10, PEAU_BORD)):
            p.g[(x, y)] = S(c)


def e_frange(p):
    pass


def e_court(p):
    e_cotes_courts(p)


def e_meche(p):
    """La mèche rabattue sur le côté : le front dégagé à droite, les cheveux en biais à gauche."""
    e_cotes_courts(p)
    for x in range(4, 16):
        if x <= 9:
            p.g[(x, 6)] = ch(C_M if x % 2 else C_B)
        else:
            p.g[(x, 6)] = S(PEAU)
    for x in range(12, 16):
        p.g[(x, 5)] = ch(C_D)


def e_herisse(p):
    """Courts, des mèches dressées sur le dessus."""
    e_cotes_courts(p)
    for x0 in (3, 6, 9, 12, 15):
        for k in range(1, 3):
            for x in range(x0 - (2 - k), x0 + 1):
                p.met(x, -k + (x0 in (3, 15)), ch(C_L if x == x0 - 1 and k == 1 else C_B))


def e_boucles(p):
    """Des boucles : le bol grossi d'une case en festons, piqué de reflets et d'ombres."""
    che = p.cheveux()
    for (x, y) in list(che):
        for n in voisins4(x, y):
            if n not in p.g and n[1] <= 12 and (n[0] + n[1]) % 2 == 0:
                p.met(*n, ch(C_B))
    for (x, y) in p.cheveux():
        if p.g[(x, y)][1] != C_O and (x + 3 * y) % 7 == 0:
            p.g[(x, y)] = ch(C_L)
        elif p.g[(x, y)][1] != C_O and (x + 3 * y) % 7 == 3:
            p.g[(x, y)] = ch(C_D)


def e_long(p):
    """Les cheveux qui tombent sur les épaules, de chaque côté du visage."""
    for y in range(11, 21):
        for x0, x1 in ((1, 3), (16, 18)):
            if y >= 14:
                x0, x1 = (x0, x1 + 1) if x0 == 1 else (x0 - 1, x1)
            for x in range(x0, x1 + 1):
                if y == 20 and x in (x0, x1):
                    continue
                p.g[(x, y)] = ch(C_L if (x + y) % 5 == 0 else (C_D if x in (1, 18) else C_B))


def e_touffe(p, cx, y0, y1, lien=True):
    """Une mèche nouée (couette, queue de cheval) : un fuseau qui s'évase puis se resserre."""
    for y in range(y0, y1 + 1):
        r = 0.6 + 1.6 * (1 - abs((y - y0) / max(1, y1 - y0) - 0.45) / 0.55)
        for x in range(int(cx - 3), int(cx + 4)):
            if abs(x - cx) <= r:
                p.met(x, y, ch(C_L if x < cx and (x + y) % 3 == 0 else (C_D if x > cx else C_B)))
    if lien:
        for x in range(int(cx) - 1, int(cx) + 2):
            p.met(x, y0, A((150, 150, 150)))


def e_couettes(p):
    e_touffe(p, 0.5, 8, 17)
    e_touffe(p, 18.5, 8, 17)


def e_queue(p):
    e_touffe(p, 19, 3, 15)


def e_chignon(p):
    for y in range(-3, 1):
        for x in range(6, 14):
            e = (x - 9.5) ** 2 / 10 + (y + 1.2) ** 2 / 3.5
            if e <= 1:
                p.met(x, y, ch(C_L if x <= 8 and y <= -2 else (C_D if x >= 12 else C_B)))


COUPES_ENFANT = {'frange': e_frange, 'court': e_court, 'meche': e_meche, 'herisse': e_herisse,
                 'boucles': e_boucles, 'long': e_long, 'couettes': e_couettes, 'queue': e_queue,
                 'chignon': e_chignon}


def e_sous(p, jusqua):
    p.ote(lambda q, t: t[0] == 'cheveux' and q[1] < jusqua)


def e_dessus(p, jusqua, rebord=None):
    """Le haut de la tête (au-dessus de la rangée `jusqua`) devient le couvre-chef : clair en
    haut à gauche, sombre à droite et au bord ; `rebord` : la rangée côtelée ou la visière."""
    for (x, y) in [q for q, t in p.g.items() if q[1] < jusqua and t[0] in ('cheveux', 'peau')]:
        bord = any(n not in p.g for n in voisins4(x, y))
        c = 70 if bord else (205 if x <= 7 and y <= 2 else (125 if x >= 14 else 165))
        p.g[(x, y)] = A((c, c, c))


def e_casquette(p):
    e_dessus(p, 4)
    for x in range(1, 19):
        p.g[(x, 4)] = A((90, 90, 90) if x in (1, 18) else (115, 115, 115))
    for x in range(3, 17):
        p.g[(x, 5)] = ch(C_D)                   # (l'ombre de la visière sur le front)


def e_bonnet(p):
    e_dessus(p, 5)
    for x in range(2, 18):
        p.g[(x, 4)] = A((185, 185, 185) if x % 2 else (125, 125, 125))
    for (x, y) in ((9, -1), (10, -1), (9, -2), (10, -2)):
        p.met(x, y, A((215, 215, 215) if y == -2 else (175, 175, 175)))


def e_paille(p):
    e_sous(p, 2)
    for y in range(-3, 2):
        for x in range(4, 16):
            if y == -3 and x in (4, 15):
                continue
            bord = x in (4, 15) or y == -3
            p.met(x, y, ('fixe', PAILLE['V'] if bord else (PAILLE['T'] if (x + y) % 4 == 0 else PAILLE['S']), None))
    for x in range(5, 15):
        p.met(x, 1, A((160, 160, 160)))
    for x in range(-1, 21):
        p.met(x, 2, ('fixe', PAILLE['V'] if x in (-1, 20) else (PAILLE['T'] if x % 3 == 0 else PAILLE['S']), None))
    for x in range(0, 20):
        p.met(x, 3, ('fixe', PAILLE['V'] if x in (0, 19) else PAILLE['U'], None))


def e_noeud(p):
    for (x, y), c in (((13, 0), 200), ((14, 0), 160), ((13, 1), 160), ((14, 1), 120), ((15, 1), 90),
                      ((17, 0), 200), ((16, 0), 160), ((17, 1), 160), ((16, 1), 120), ((15, 0), 110)):
        p.met(x, y, A((c, c, c)))


def e_serre_tete(p):
    for x in range(3, 17):
        if p.region((x, 2)) == 'cheveux':
            p.g[(x, 2)] = A((175, 175, 175) if x < 10 else (130, 130, 130))


def e_fleur(p):
    cx, cy = 15, 2
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        p.met(cx + dx, cy + dy, A((200, 200, 200)))
    for dx, dy in ((-1, -1), (1, 1)):
        p.met(cx + dx, cy + dy, A((130, 130, 130)))
    p.met(cx, cy, ('fixe', (236, 200, 60), None))


COUVRE_CHEFS_ENFANT = {None: lambda p: None, 'casquette': e_casquette, 'bonnet': e_bonnet, 'paille': e_paille,
                       'noeud': e_noeud, 'serre_tete': e_serre_tete, 'fleur': e_fleur}


def e_lunettes(p):
    noir = ('fixe', (40, 40, 46), None)
    for x0, x1 in ((4, 10), (10, 16)):
        for x in range(x0 + 1, x1):
            p.g[(x, 6)] = noir
            p.g[(x, 10)] = noir
        for y in range(7, 10):
            p.g[(x0, y)] = noir
            p.g[(x1, y)] = noir


# les taches de rousseur retouchées à la main (enfant_02, peau très claire), et deux reflets
ROUSSEUR_ENFANT = ((225, 159, 105), ((5, 11), (7, 11), (9, 11), (12, 11), (14, 11), (6, 12), (9, 12), (10, 12), (13, 12)),
                   (246, 196, 160), ((10, 9), (11, 12)))


def e_rousseur(p):
    base = transfert(PEAU, catalogue.PEAU['claire']['f'], catalogue.PEAU['tres_claire']['f'])
    tache, taches, reflet, reflets = ROUSSEUR_ENFANT
    for c, qs in ((tache, taches), (reflet, reflets)):
        for q in qs:
            if p.region(q) == 'peau':
                p.g[q] = ('peau', c, base)


def e_joues(p):
    for q in ((5, 12), (6, 12), (13, 12), (14, 12)):
        if p.region(q) == 'peau':
            p.g[q] = S((236, 150, 130))


def e_pansement(p):
    for (x, y), c in (((13, 12), (244, 226, 190)), ((14, 12), (240, 240, 232)), ((15, 12), (244, 226, 190)),
                      ((14, 11), (220, 196, 160)), ((14, 13), (220, 196, 160))):
        p.g[(x, y)] = ('fixe', c, None)


def e_salopette(p):
    """Les bretelles et la bavette d'une salopette sur le t-shirt."""
    for (x, y), t in list(p.g.items()):
        if t[0] not in ('chemise', 'motif'):
            continue
        if x in (4, 5, 14, 15) and y >= 18 or 4 <= x <= 15 and y >= 22:
            p.g[(x, y)] = ('fixe', (44, 79, 124) if x in (5, 15) and y < 22 or y == 22 else (63, 111, 168), None)
    p.g[(4, 21)] = p.g[(15, 21)] = ('fixe', (236, 200, 60), None)


DETAILS_ENFANT = {'rousseur': e_rousseur, 'joues': e_joues, 'pansement': e_pansement}


# Les enfants retouchés à la main (scripts/personnage/modeles/portraits_enfants_retouches.png,
# la planche des 50 enfants) : portraits du jeu tels quels. Ce que la retouche change à la coupe
# (cheveux, bord du visage, oreilles) est repris sur les autres enfants de la même coupe ; les
# paupières claires des peaux foncées sont passées à la couleur de la peau (enfant_04, 08, 12).
RETOUCHES_ENFANTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles', 'portraits_enfants_retouches.png')
RETOUCHES_ENFANTS_NOMS = ('enfant_01', 'enfant_02', 'enfant_03', 'enfant_04', 'enfant_05', 'enfant_07', 'enfant_08', 'enfant_12')
COUPES_RETOUCHEES = {'frange': 'enfant_01', 'couettes': 'enfant_02', 'court': 'enfant_03', 'boucles': 'enfant_04',
                     'herisse': 'enfant_05', 'meche': 'enfant_07'}
PAUPIERES = ((6, 10), (7, 10), (8, 10), (12, 10), (13, 10), (14, 10))
CR = {}


def coupe_retouchee(coupe):
    """Ce que la retouche de l'enfant de COUPES_RETOUCHEES[coupe] change à sa coupe, en jetons
    (coordonnées du modèle) ; None : un pixel ôté."""
    if coupe not in CR:
        nom = COUPES_RETOUCHEES[coupe]
        enfants = dict(portraits_enfants.enfants())
        d = enfants[nom]
        i = 50 + int(nom[-2:]) - 1
        p = jetons_enfant(d, False)
        avant = peindre(p, d, i)
        peau = transfert(PEAU, catalogue.PEAU['claire']['f'], catalogue.PEAU[d['peau']]['f'])
        bases = {'cheveux': catalogue.CHEVEUX[d['cheveux']]['b'], 'peau': peau, 'acc': d['accessoire']}
        apres = retouche(nom)
        out = {}
        for y in range(N):
            for x in range(N):
                a, c = avant.getpixel((x, y)), apres.get((x, y))
                if (a[3] and c == a[:3]) or (not a[3] and c is None):
                    continue
                vieux = p.region((x, y))
                q = (x - EX, y - EY)
                if c is None:
                    if vieux in ('cheveux', 'acc', 'peau'):
                        out[q] = None
                    continue
                e = {r: ecart(c, b) for r, b in bases.items()}
                r = 'cheveux' if e['cheveux'] <= min(e.values()) + 10 else min(e, key=e.get)
                visage = 4 <= q[0] <= 15 and 9 <= q[1] <= 15      # (taches de rousseur, paupières : pas la coupe)
                if vieux in (None, 'cheveux', 'acc') or (r == 'cheveux' and not visage):
                    out[q] = (r, c, bases[r])
        CR[coupe] = out
    return CR[coupe]


def jetons_enfant(d, retouches=True):
    p = Enfant()
    COUPES_ENFANT[d['coupe']](p)
    if retouches and d['coupe'] in COUPES_RETOUCHEES:
        for q, t in coupe_retouchee(d['coupe']).items():
            if t is None:
                p.g.pop(q, None)
            else:
                p.g[q] = t
    if retouches and d['peau'] in ('foncee', 'tres_foncee'):
        for q in PAUPIERES:
            if p.region(q) == 'peau':
                p.g[q] = S(PEAU)
    for x in d['details']:
        if x in DETAILS_ENFANT:
            DETAILS_ENFANT[x](p)
    COUVRE_CHEFS_ENFANT[d['chapeau']](p)
    if 'lunettes' in d['details']:
        e_lunettes(p)
    motif(p, d['motif'])
    if 'salopette' in d['details']:
        e_salopette(p)
    contour(p)
    p.g = {(x + EX, y + EY): t for (x, y), t in p.g.items()}
    return p


def portrait_enfant(d, i):
    return peindre(jetons_enfant(d), d, i)


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
        if nom in RETOUCHES_NOMS:
            im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
            for q, c in retouche(nom).items():
                im.putpixel(q, c + (255,))
            out.append((nom, im))
        elif nom in VALIDES:
            out.append((nom, Image.open(os.path.join(DIR, f'{nom}.png')).convert('RGBA')))
        else:
            out.append((nom, dessin(nom) if nom in DESSINS else portrait(d, i)))
    for i, (nom, d) in enumerate(portraits_enfants.enfants()):
        if nom in RETOUCHES_ENFANTS_NOMS:
            im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
            for q, c in retouche(nom).items():
                im.putpixel(q, c + (255,))
            out.append((nom, im))
        else:
            out.append((nom, portrait_enfant(d, 50 + i)))     # (i : son rang parmi tous, comme modeles.tous())
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
