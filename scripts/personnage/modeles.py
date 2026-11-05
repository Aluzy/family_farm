# Les modèles des personnages (scripts/personnage/modeles/<nom>.png, 12 × 79 px : de face, de
# dos, de profil ; voir chibi.py), tirés du catalogue (assets/personnages/catalogue.json, lu par
# scripts/personnage/catalogue.py). Ils suivent les motifs des modèles dessinés à
# la main (perso_01, perso_02) :
#   - la tête : 10 px de large sous le contour, arrondie en haut (6, 8 puis 10 px) ;
#   - les yeux : 2 × 2 px, le blanc dehors, la pupille vers le nez, le haut un ton plus sombre ;
#     la peau un ton plus sombre entre les yeux ; la bouche de 3 px, deux rangées plus bas ;
#   - les cheveux : l'ombre sur les deux colonnes de droite, quelques mèches d'un ton moyen ;
#   - le cou de 2 px, plus sombre ; la chemise au col en V ; les bras de 2 px, la main de 2 × 2
#     (un pixel d'ombre sur la main droite) ;
#   - la salopette : la bavette entre deux bretelles sombres ; la jambe gauche claire, la droite
#     sombre, une couture de deux tons entre elles ; les chaussures de trois bruns ;
#   - de profil : la tête reculée d'un pixel, le nez d'un pixel, l'œil devant (la pupille au
#     bord), l'oreille ; la main du bras lointain derrière le corps ; les jambes séparées.
# Chaque élément est une couche de lettres (une lettre, une couleur) posée dans l'ordre : le
# corps, le visage, la coiffure, le couvre-chef, les détails ; le contour est ajouté à la fin.
#
#   python3 scripts/personnage/modeles.py      écrit les modèles
#
# RETOUCHES : les modèles dessinés ou retouchés à la main (perso_01 à perso_03), en lettres eux aussi :
# scripts/personnage/retouches.json, leurs grilles (le contour « a » compris, tel qu'il a été dessiné) et
# leurs nuances, des couleurs propres codées 0 à 9, +, *, %, & ; chacune est une nuance d'une lettre de la
# palette (« base » : sa famille, donc sa couche) et garde sa couleur. lettres() donne les lettres de
# n'importe quel modèle, palette_de() ses couleurs (chantier « couches », docs/personnage-couches.md).
import json
import os
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles')
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'retouches.json'), encoding='utf-8') as _f:
    RETOUCHES_LETTRES = {k: v for k, v in json.load(_f).items() if not k.startswith('_')}
RETOUCHES = tuple(RETOUCHES_LETTRES)
CONTOUR = (43, 29, 20)
VUES = ('bas', 'haut', 'cote')
DEBUT = {'bas': 0, 'haut': 27, 'cote': 54}


def mix(a, b, t):
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def mul(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c)


# ---------- le corps (rangées 11..23) ----------
CORPS = {
    'bas': [
        '...opkkpq...',
        '..oprssrpq..',
        '.pppssssqqq.',
        '.ppssssssqq.',
        '.kksssssskt.',
        '.kmsssssskt.',
        '...ssssss...',
        '...sssrrr...',
        '...ssuvrr...',
        '...ssuvrr...',
        '...ssuvrr...',
        '...wwxyww...',
        '...wwxyww...',
    ],
    'haut': [
        '...pppppq...',
        '..ppprrpqq..',
        '.ppprssrpqq.',
        '.ppssssssqq.',
        '.kksssssskt.',
        '.kmsssssskt.',
        '...ssssss...',
        '...ssAZrr...',
        '...ssAZrr...',
        '...ssAZrr...',
        '...ssAZrr...',
        '...wwxyww...',
        '...wwxyww...',
    ],
    'cote': [
        '....pppp....',
        '...pppppp...',
        '...rssspp...',
        '...sssspq...',
        '..kssssskk..',
        '..kssssstk..',
        '...sssss....',
        '..ss..rr....',
        '..ss..rr....',
        '..ss..rr....',
        '..ss..rr....',
        '..www.xxx...',
        '..www.xxx...',
    ],
}

# ---------- le visage (rangées 0..10), sans cheveux ----------
TETE = {
    'bas': [
        '............',
        '...kkkkkk...',
        '..kkkkkkkk..',
        '..kkkkkkkk..',
        '..kkkkkkkk..',
        '.kkghddhgkk.',
        '.kkijkkjikk.',
        '..kkkkkkkt..',
        '..kkklllkt..',
        '...kkkkkt...',
        '.....mm.....',
    ],
    'haut': [
        '............',
        '...kkkkkk...',
        '..kkkkkkkk..',
        '..kkkkkkkk..',
        '..kkkkkkkk..',
        '.kkkkkkkkkk.',
        '.kkkkkkkkkk.',
        '..kkkkkkkk..',
        '..kkkkkkkt..',
        '...kkkkkt...',
        '.....mm.....',
    ],
    'cote': [
        '............',
        '..kkkkkk....',
        '.kkkkkkkk...',
        '.kkkkkkkk...',
        '.kkkkkkkk...',
        '.kkkkkghk...',
        '.kkdkkijk...',
        '.kkkkkkkkk..',
        '..kkkkklk...',
        '..kkkkkk....',
        '....kmk.....',
    ],
}

# ---------- les coiffures : {coupe: {vue: [rangées depuis 0]}} ----------
# B cheveux, C leur ombre, E une mèche (ton moyen), d la peau dans l'ombre (le front, l'oreille)
_HAUT_COURT = ['............', '...BBBBBC...', '..BBBBBBCC..', '..BBBEBBCC..', '..BBBBBEBC..',
               '.BBEBBBBBCC.', '.BBBBBEBBCC.', '..BBBBBBCC..', '..d......d..']
_HAUT_LONG = ['............', '...BBBBBC...', '..BBBBBBCC..', '..BBBEBBCC..', '.BBBBBBEBCC.',
              '.BBEBBBBBCC.', '.BBBBBEBBCC.', '.BBBEBBBBCC.', '.BBBBBBEBCC.', '.BBEBBBBCCC.']
_DOS = {      # les cheveux qui tombent dans le dos, à partir de la rangée 10
    'longs': ['..BEBBBBCC..', '...BEBBBC...', '...BBEBBC...', '...BBBEBC...', '...BEBBBC...', '....BBBC....'],
    'mi': ['..BEBBBBCC..', '...BEBBBC...', '...BBBBCC...'],
    'carre': ['..CCCCCCCC..'],
}
_FACE_LONG = ['............', '...BBBBBC...', '..BBBBBBCC..', '..BBBdBBCC..', '..BEBddEBC..',
              '.BB......BC.', '.BB.......C.', '.BB.......C.', '.BB......BC.', '.BBC....CCC.', '..BCC..CCB..']
_FACE_FRANGE = ['............', '...BBBBBC...', '..BBBBBBCC..', '..BBBBBBBC..', '.BBEBBEBBBC.']
_COTE_COURT = ['............', '..BBBBBC....', '.BBBBBBCC...', '.BBBBBBBC...', '.BBBBBE.....',
               '.BBB........', '.BB.........', '.BB.........', '..C.........']
_COTE_LONG = ['............', '..BBBBBC....', '.BBBBBBCC...', '.BBBBBBBC...', '.BBBBBEEB...',
              '.BBB.B......', '.BBB........', '.BBBB.......', '.BBBC.......', '..BBBB......', '..BBB.......']
_COTE_DOS = {
    'longs': ['.BBC........', '.BBC........', '.BC.........', '.BC.........', '.C..........'],
    'mi': ['.BBC........', '.BC.........'],
    'carre': [],
}


def _longueur(coupe):
    return {'longs': 'longs', 'frange': 'longs', 'mi': 'mi', 'carre': 'carre', 'frange_carre': 'carre'}[coupe]


def coiffure(coupe, vue):
    """Les rangées de la coiffure (depuis la rangée 0 de la tête)."""
    if coupe in ('longs', 'mi', 'carre', 'frange', 'frange_carre'):
        lg = _longueur(coupe)
        if vue == 'bas':
            g = list(_FACE_LONG)
            if coupe.startswith('frange'):
                g[:5] = _FACE_FRANGE
            if lg == 'mi':
                g[9], g[10] = '.BC......CC.', '............'
            elif lg == 'carre':
                g[8], g[9], g[10] = '.CC......CC.', '............', '............'
            return g
        if vue == 'haut':
            return _HAUT_LONG + _DOS[lg]
        g = list(_COTE_LONG)
        if coupe.startswith('frange'):
            g[4] = '.BBBBBBBEB..'
        if lg == 'carre':
            g[9], g[10] = '..CCC.......', '............'
        return g + _COTE_DOS[lg]
    if coupe == 'chauve':
        return {
            'bas': ['............', '............', '....ee......', '............', '.CB......BC.', '.BB......CC.', '.B........C.'],
            'haut': ['............', '............', '....ee......', '............', '.CBBBBBBBBC.', '.BBBBBBBBCC.', '..BBBBBBCC..'],
            'cote': ['............', '............', '...ee.......', '............', '.BB.........', '.BBB........', '.BB.........', '..C.........'],
        }[vue]
    # courts, et la base des couettes et du chignon
    g = {
        'bas': ['............', '...BBBBBC...', '..BBBBBBCC..', '..BBBBBBCC..', '..BBEddEBC..', '.BB......CC.'],
        'haut': list(_HAUT_COURT),
        'cote': list(_COTE_COURT),
    }[vue]
    if coupe == 'couettes':
        if vue == 'bas':
            g[4] = '..BEBBEBBC..'
            g += ['RB........CR', 'BB........CC', 'BB........CC', '.B........C.']
        elif vue == 'haut':
            g = g[:6] + ['RBBBBBEBBCCR', 'BBBBBBBBCCCC', 'BB........CC', '.B........C.']
        else:
            g = g[:6] + ['RBB.........', 'BB..........', 'BB..........', 'B...........']
    elif coupe == 'chignon':
        if vue == 'bas':
            g[0] = '....BBCC....'
        elif vue == 'haut':
            g[0] = '....BBCC....'
            g[2] = '..BBEEBCCC..'
            g[3] = '..BBEBBCCC..'
        else:
            g[2] = 'BBBBBBBCC...'
            g[3] = 'BCBBBBBBC...'
    return g


# ---------- les couvre-chefs ----------
# R couleur de l'accessoire, Q son ombre, H son reflet, V la visière ; S, T, U la paille
CHAPEAUX = {
    'casquette': {
        'bas': ['............', '...RRHRRQ...', '..RRHHRRRQ..', '..RRRRRRRQ..', '.VVVVVVVVVV.'],
        'haut': ['............', '...RRRRRQ...', '..RRHRRRRQ..', '..RRRRRRRQ..', '..RQQQQQQQ..'],
        'cote': ['............', '..RRHRRQ....', '.RRRHRRRQ...', '.RRRRRRRRQ..', '.QQRRRRVVVV.'],
    },
    'paille': {
        'bas': ['....SSSS....', '...SSTSSU...', '...SSSSSU...', '...RRRRRR...', 'SSSSSSSSSSUU'],
        'haut': ['....SSSS....', '...SSSSSU...', '...SSTSSU...', '...RRRRRR...', 'SSSSSSSSSSUU'],
        'cote': ['...SSSS.....', '..SSTSSU....', '..SSSSSU....', '..RRRRRR....', 'USSSSSSSSSSU'],
    },
    'bonnet': {
        'bas': ['....RRRR....', '...RRHRRQ...', '..RRHRRRQQ..', '..RRRRRRQQ..', '.QQQQQQQQQQ.'],
        'haut': ['....RRRR....', '...RRRRRQ...', '..RRHRRRQQ..', '..RRRRRRQQ..', '.QQQQQQQQQQ.'],
        'cote': ['...RRRR.....', '..RRHRRQ....', '.RRHRRRRQ...', '.RRRRRRRQ...', '.QQQQQQQQQ..'],
    },
    'beret': {
        'bas': ['.....Q......', '..RRRRRRRR..', '.RRHRRRRRRQ.', '..QQQQQQQQ..'],
        'haut': ['......Q.....', '..RRRRRRRR..', '.RRRRRRHRRQ.', '..QQQQQQQQ..'],
        'cote': ['....Q.......', '.RRRRRRR....', 'RRHRRRRRRQ..', '.QQQQQQQ....'],
    },
    'bandeau': {
        'bas': ['............', '............', '............', '..RRRRRRRR..'],
        'haut': ['............', '............', '............', '..RRRRRRRR..', '.........RR.', '..........R.'],
        'cote': ['............', '............', '............', '.RRRRRRRR...', 'RR..........', 'R...........'],
    },
    # (le casque-lampe de l'équipement, data/equipement.json « carte » : son dôme jaune, 1 l'ombre, 2 la teinte,
    # 3 le reflet, 4 la lampe ; CASQUE_LETTRES ; dessiné comme la casquette, rien sous la rangée 4 : le visage reste)
    'casque': {
        'bas': ['............', '....3221....', '...322221...', '..32244221..', '.1111111111.'],
        'haut': ['............', '....2221....', '...322221...', '..32222221..', '.1111111111.'],
        'cote': ['............', '...3221.....', '..322224....', '.3222224....', '.111111111..'],
    },
    'fleur': {
        'bas': ['............', '............', '.........R..', '........RFR.', '.........R..'],
        'haut': ['............', '............', '..R.........', '.RFR........', '..R.........'],
        'cote': ['............', '............', '...R........', '..RFR.......', '...R........'],
    },
}

# ---------- les détails : {détail: {vue: [(x, y, lettre)]}} ----------
DETAILS = {
    'barbe': {
        'bas': [(x, 7, 'B') for x in (2, 3, 8, 9)] + [(x, 8, 'B') for x in (2, 3, 4, 7, 8, 9)] + [(5, 8, 'l'), (6, 8, 'l')]
        + [(x, 9, 'B') for x in range(3, 9)] + [(x, 10, 'C') for x in range(4, 8)],
        'haut': [],
        'cote': [(x, 7, 'B') for x in (4, 5, 6)] + [(x, 8, 'B') for x in (3, 4, 5, 6, 8)] + [(7, 8, 'l')]
        + [(x, 9, 'B') for x in range(2, 8)] + [(x, 10, 'C') for x in (4, 5, 6)],
    },
    'moustache': {
        'bas': [(x, 7, 'B') for x in (4, 5, 6, 7)],
        'haut': [],
        'cote': [(7, 7, 'B'), (8, 7, 'B')],
    },
    'lunettes': {
        'bas': [(2, 5, 'G'), (5, 5, 'G'), (6, 5, 'G'), (9, 5, 'G'), (2, 6, 'G'), (9, 6, 'G')],
        'haut': [(1, 5, 'G'), (10, 5, 'G')],
        'cote': [(3, 5, 'G'), (4, 5, 'G'), (5, 5, 'G'), (8, 5, 'G'), (5, 6, 'G')],
    },
    'rousseur': {
        'bas': [(2, 7, 'X'), (4, 7, 'X'), (7, 7, 'X'), (9, 7, 'X')],
        'haut': [],
        'cote': [(5, 7, 'X'), (7, 7, 'X')],
    },
    'boucles': {
        'bas': [(1, 7, 'Y'), (10, 7, 'Y')],
        'haut': [(1, 7, 'Y'), (10, 7, 'Y')],
        'cote': [(3, 7, 'Y')],
    },
    'joues': {
        'bas': [(3, 7, 'P'), (8, 7, 'P')],
        'haut': [],
        'cote': [(6, 7, 'P')],
    },
    'pansement': {
        'bas': [(8, 7, 'W'), (9, 7, 'W')],
        'haut': [],
        'cote': [(5, 7, 'W'), (6, 7, 'W')],
    },
}

YEUX = catalogue.YEUX      # (pupille, reflet) : assets/personnages/catalogue.json


# La lisibilité des yeux (étape E1 de docs/personnage-couches.md) :
#   - sur une peau foncée (sa teinte moins lumineuse que PEAU_FONCEE), la pupille se confondait avec la
#     peau : le haut de la pupille (h) est assombri, le bas (j) éclairci dans sa propre teinte jusqu'à
#     ECART_PUPILLE de luminosité au-dessus de la peau ;
#   - des cheveux pâles (blancs, gris, platine : CHEVEUX_PALES) avaient presque la couleur du blanc des
#     yeux : les cheveux qui touchent le blanc d'un œil prennent leur ton sombre (la lettre D).
PEAU_FONCEE = 110
ECART_PUPILLE = 40
CHEVEUX_PALES = 150      # le plus petit canal de la teinte des cheveux au-dessus de ça : des cheveux pâles


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def pales(d):
    return min(catalogue.CHEVEUX[d['cheveux']]['b']) > CHEVEUX_PALES


def yeux(d, i=None):
    """La couleur des yeux (catalogue.json, identite.yeux)."""
    return d['yeux']


def palette(d, i):
    peau, hr, hab = catalogue.PEAU[d['peau']], catalogue.CHEVEUX[d['cheveux']], catalogue.HABITS[d['habit']]
    f, j = peau['f'], peau['j']
    a = d['accessoire']
    s, r = d['bas']
    blanc = d['habit'] == 'blanc'
    motif = (200, 60, 60) if blanc else (244, 240, 228)
    oeil = YEUX[yeux(d, i)]
    if lum(f) < PEAU_FONCEE:
        oeil = (mul(oeil[0], 0.4), mul(oeil[1], max(1, (lum(f) + ECART_PUPILLE) / max(1, lum(oeil[1])))))
    return {
        'k': f, 'd': mix(f, j, 0.25), 'm': mix(f, j, 0.45), 't': mix(f, j, 0.3), 'l': j, 'e': peau['e'], 'P': peau['k'],
        'g': (239, 239, 239), 'i': (255, 255, 255), 'h': oeil[0], 'j': oeil[1],
        'B': hr['b'], 'C': hr['c'], 'E': mix(hr['b'], hr['c'], 0.5), 'D': hr['d'],
        'p': hab['n'], 'q': mix(hab['n'], hab['m'], 0.55), 'o': motif if d['motif'] else mix(hab['n'], (255, 255, 255), 0.4),
        's': s, 'r': r, 'u': mul(s, 0.82), 'v': mul(s, 0.37), 'A': mul(s, 0.91), 'Z': mul(s, 0.55),
        'w': (90, 58, 34), 'x': (68, 44, 26), 'y': (46, 30, 18),
        'R': a, 'Q': catalogue.fonce(a), 'H': mix(a, (255, 255, 255), 0.3), 'V': catalogue.fonce(a, 0.56),
        'S': (232, 194, 90), 'T': (250, 222, 136), 'U': (184, 138, 46),
        'G': (40, 40, 48), 'X': mix(f, (180, 90, 50), 0.45), 'Y': (236, 200, 60), 'W': (244, 226, 196),
        # (des lettres de mêmes couleurs, qui disent l'élément : la peau et les rubans de la coupe, la barbe, la fleur)
        'f': mix(f, j, 0.25), 'z': peau['e'], 'N': a, 'b': hr['b'], 'c': hr['c'], 'J': j, 'F': (236, 200, 60),
        # (les cheveux qui touchent le blanc d'un œil : leur ton sombre quand ils sont pâles, sinon leur couleur)
        'B_': hr['d'] if pales(d) else hr['b'], 'E_': hr['d'] if pales(d) else mix(hr['b'], hr['c'], 0.5),
        'L': cils(oeil),
        **CASQUE_COULEURS,
    }


def cils(pupilles):
    """Le trait des yeux fermés (le sommeil, chibi.py ; l'expression « fermes ») : la pupille la plus sombre,
    un peu plus sombre encore, ou un brun sombre si elle est claire."""
    lum = lambda c: sum(c) / 3
    sombre = min(pupilles, key=lum)
    return mul(sombre, 0.85) if lum(sombre) < 90 else (54, 36, 24)


def poser(g, rangs, y0, x0=0):
    for y, rang in enumerate(rangs):
        for x, ch in enumerate(rang):
            if ch != '.':
                g[(x0 + x, y0 + y)] = ch


def motif(g, m):
    """Le motif de la chemise (les lettres p et q des rangées 11..16)."""
    if not m:
        return
    for (x, y), ch in list(g.items()):
        if ch not in 'pq' or not 11 <= y <= 16:
            continue
        if m == 'pois' and (x + 2 * y) % 4 == 0:
            g[(x, y)] = 'o'
        elif m == 'rayures' and y % 2 == 0:
            g[(x, y)] = 'q' if ch == 'p' else 'v_'
        elif m == 'carreaux' and (x % 3 == 0 or y % 3 == 0):
            g[(x, y)] = 'o'


def vue(d, v):
    g = {}
    poser(g, CORPS[v], 11)
    motif(g, d['motif'])
    poser(g, TETE[v], 0)
    # (ce que la coupe dessine en peau, le front dans l'ombre, le crâne, et ses rubans : des lettres à elle, f, z,
    # N, de mêmes couleurs que d, e, R, pour que chaque pixel dise de quel élément il vient : couches.py)
    poser(g, [r.translate(COIFFURE_LETTRES) for r in coiffure(d['coupe'], v)], 0)
    chap = d['chapeau']
    if chap:
        g.update(chapeau(chap, v))
        if chap in COUVRE_TETE:
            # sous le couvre-chef, le haut de la tête (rangées 0 à 3 : les cheveux, et la peau d'un crâne
            # chauve) ne dépasse pas (MASQUE_TETE)
            for (x, y) in [p for p in g if p[1] < MASQUE_TETE and famille(None, g[p]) in ('corps', 'coiffure')]:
                del g[(x, y)]
    # les cheveux qui touchent le blanc d'un œil : B_, E_ (des cheveux pâles les font sombres : palette)
    for (x, y), ch in list(g.items()):
        if ch in ('B', 'E') and bord_oeil(g, x, y):
            g[(x, y)] = ch + '_'
    for det in d['details']:
        for (x, y, ch) in DETAILS.get(det, {}).get(v, []):
            if det == 'barbe' and ch in 'BC' and (x, y) in g and g[(x, y)] in 'gihj':
                continue
            # (la barbe et la moustache : leurs lettres à elles, b, c, J, de mêmes couleurs que B, C, l)
            g[(x, y)] = ch.translate(PILOSITE_LETTRES) if det in ('barbe', 'moustache') else ch
    return g


COIFFURE_LETTRES = str.maketrans({'d': 'f', 'e': 'z', 'R': 'N'})
MASQUE_TETE = 4                    # rangées : sous une casquette, un bonnet, un chapeau de paille
COUPES = ['longs', 'mi', 'carre', 'courts', 'frange', 'frange_carre', 'couettes', 'chignon', 'chauve']
ORDRE_DETAILS_CARTE = ['barbe', 'moustache', 'rousseur', 'lunettes', 'boucles', 'pansement', 'joues']
COUVRE_TETE = ('casquette', 'bonnet', 'paille', 'casque')
CASQUE_LETTRES = {'1': 'casque_ombre', '2': 'casque', '3': 'casque_reflet', '4': 'lampe'}
CASQUE_COULEURS = {'casque_ombre': (199, 134, 42), 'casque': (242, 192, 64), 'casque_reflet': (251, 227, 138), 'lampe': (255, 250, 214)}


def chapeau(nom, v):
    """La grille d'un couvre-chef : {(x, y): lettre} (les chiffres du casque en lettres : CASQUE_LETTRES)."""
    g = {}
    poser(g, CHAPEAUX[nom][v], 0)
    return {p: CASQUE_LETTRES.get(L, L) for p, L in g.items()}


def bord_oeil(g, x, y):
    """La case (x, y) touche-t-elle le blanc d'un œil (g, i) ?"""
    return any(g.get((x + dx, y + dy)) in ('g', 'i') for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))


# ---------- les familles de lettres : la couche de chaque lettre (chantier « couches ») ----------
FAMILLES = {
    'corps': ['k', 'd', 't', 'm', 'l', 'e', 'g', 'i', 'h', 'j', 'L', 'Mk', 'Mv'],   # la peau, les yeux, la bouche, les cils
    'joues': ['P'], 'rousseur': ['X'],
    'coiffure': ['B', 'C', 'E', 'D', 'B_', 'E_', 'f', 'z', 'N'],      # les cheveux, la peau dans leur ombre, les rubans
    'pilosite': ['b', 'c', 'J'],                                       # la barbe, la moustache
    'haut': ['p', 'q', 'o', 'v_', 'Mp'],
    'bas': ['s', 'r', 'A', 'Z', 'u', 'v', 'Ms', 'Mr'], 'chaussures': ['w', 'x', 'y', 'Mw'],
    'couvre_chef': ['R', 'Q', 'H', 'V', 'S', 'T', 'U', 'F', 'casque_ombre', 'casque', 'casque_reflet', 'lampe'],
    'lunettes': ['G'], 'boucles': ['Y'], 'pansement': ['W'],
}
_FAMILLE = {L: f for f, Ls in FAMILLES.items() for L in Ls}


def famille(nom, lettre):
    """La famille de `lettre` (une nuance d'un modèle retouché : celle de sa base ; L×0.8 : celle de L), ou None."""
    if lettre is None:
        return None
    L = lettre.split('×')[0]
    return _FAMILLE.get(base(nom, L) if nom else L)
PILOSITE_LETTRES = str.maketrans({'B': 'b', 'C': 'c', 'l': 'J'})


# L'ordre des couches du haut du corps (chantier « couches ») : celui où vue() les pose l'une sur l'autre.
ORDRE_COUCHES = ['corps', 'haut', 'bas', 'chaussures', 'coiffure', 'couvre_chef',
                 'pilosite', 'rousseur', 'lunettes', 'boucles', 'pansement', 'joues']


def elements(nom, d):
    """Les éléments du modèle `nom`, chacun sa grille, sans ce qui les recouvre : [(couche, clé, {vue: {(x, y):
    lettre}})], dans l'ordre de ORDRE_COUCHES. Posés l'un sur l'autre (avec le masque d'un couvre-chef,
    MASQUE_TETE), ils redonnent vue() : verifier_elements(). Un modèle retouché : ses lettres, rangées par
    famille (sa clé : son nom)."""
    if nom in RETOUCHES_LETTRES:
        par = {}
        bras = {f'{v}:bras': g for v, g in lettres_bras(nom, d).items()}
        for v, g in list(lettres(nom, d).items()) + list(bras.items()):
            for p, L in g.items():
                if L != 'a':
                    par.setdefault(famille(nom, L), {}).setdefault(v, {})[p] = L
        # (une grille « <vue>:bras » pour chaque élément, même vide : elle remplace celle de la vue)
        return [(c, nom, {v: par[c].get(v, {}) for v in list(VUES) + list(bras)}) for c in ORDRE_COUCHES if c in par]
    out = {}
    for v in VUES:
        corps = {}
        poser(corps, CORPS[v], 11)
        haut = {p: L for p, L in corps.items() if famille(None, L) == 'haut'}
        motif(haut, d['motif'])
        tete = {}
        poser(tete, TETE[v], 0)
        coupe = {}
        poser(coupe, [r.translate(COIFFURE_LETTRES) for r in coiffure(d['coupe'], v)], 0)
        for (x, y), ch in list(coupe.items()):
            if ch in ('B', 'E') and bord_oeil(tete, x, y):
                coupe[(x, y)] = ch + '_'
        grilles = {
            ('corps', 'standard'): {**{p: L for p, L in corps.items() if famille(None, L) == 'corps'}, **tete},
            ('haut', d['motif'] or 'uni'): haut,
            ('bas', 'standard'): {p: L for p, L in corps.items() if famille(None, L) == 'bas'},
            ('chaussures', 'standard'): {p: L for p, L in corps.items() if famille(None, L) == 'chaussures'},
            ('coiffure', d['coupe']): coupe,
        }
        if d['chapeau']:
            grilles[('couvre_chef', d['chapeau'])] = chapeau(d['chapeau'], v)
        for det in d['details']:
            g = {(x, y): ch.translate(PILOSITE_LETTRES) if det in ('barbe', 'moustache') else ch
                 for (x, y, ch) in DETAILS.get(det, {}).get(v, [])}
            grilles[('pilosite' if det in ('barbe', 'moustache') else det, det)] = g
        for k, g in grilles.items():
            out.setdefault(k, {})[v] = g
    return sorted(((c, cle, g) for (c, cle), g in out.items()), key=lambda e: ORDRE_COUCHES.index(e[0]))


def aplatir(elts, chapeau):
    """Les éléments posés l'un sur l'autre (le masque d'un couvre-chef compris) : {vue: {(x, y): lettre}}."""
    out = {}
    for v in VUES:
        g = {}
        for c, _, grilles in elts:
            if c == 'couvre_chef' and chapeau in COUVRE_TETE:
                for p in [p for p in g if p[1] < MASQUE_TETE and famille(None, g[p]) in ('corps', 'coiffure')]:
                    del g[p]
            g.update(grilles.get(v, {}))
        out[v] = g
    return out


def contour(g):
    out = dict(g)
    for (x, y) in g:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in g and 0 <= n[0] < 12 and 0 <= n[1] < 25:
                out[n] = 'a'
    return out


def palette_de(nom, d, i):
    """Toutes les couleurs des lettres du modèle `nom` : sa palette, le contour, l'ombre des rayures, et
    les nuances d'un modèle retouché."""
    pal = palette(d, i)
    pal['a'] = CONTOUR
    pal['v_'] = mul(pal['q'], 0.85)
    for code, n in RETOUCHES_LETTRES.get(nom, {}).get('nuances', {}).items():
        pal[code] = tuple(int(n['couleur'][k:k + 2], 16) for k in (1, 3, 5))
    face = {p: pal[L] for p, L in lettres(nom, d)['bas'].items() if L != 'a' and pal[L] != CONTOUR}
    if nom in RETOUCHES_LETTRES:
        pupilles = [face[p] for p in YEUX_CASES if p in face and min(face[p]) < 230]
        if pupilles:
            pal['L'] = cils(pupilles)
    # Les rôles des pixels que chibi.py dessine lui-même (les bras, les jambes assises, la peau des yeux fermés) :
    # la couleur la plus fréquente du modèle, de face, là où sont la manche, les mains, les jambes, les chaussures,
    # la peau entre les yeux (comme les relevait chibi.py) ; les formes, elles, ne dépendent pas du modèle.
    def commune(pts, filtre=lambda c: True):
        n = Counter(face[p] for p in pts if p in face and filtre(face[p]))
        return n.most_common(1)[0][0] if n else None
    pal['Mp'] = commune([(x, y) for x in (0, 1, 2) for y in (12, 13, 14)])
    pal['Mk'] = commune([(x, y) for x in (1, 2, 9, 10) for y in (15, 16)])
    pal['Ms'] = commune([(x, y) for x in (3, 4) for y in range(18, 22)])
    pal['Mr'] = commune([(x, y) for x in (7, 8) for y in range(18, 22)])
    pal['Mw'] = commune([(x, y) for x in (3, 4) for y in (22, 23)])
    pal['Mv'] = commune(((5, 6), (6, 6), (5, 7), (6, 7)), lambda c: min(c) < 230) or pal['k']
    return pal


YEUX_CASES = [(x, y) for y in (5, 6) for x in (3, 4, 7, 8)]      # les yeux de face (chibi.YEUX)


def base(nom, lettre):
    """La lettre de la palette dont `lettre` est une nuance (elle-même, hors des nuances des retouches)."""
    n = RETOUCHES_LETTRES.get(nom, {}).get('nuances', {}).get(lettre)
    return n['base'] if n else lettre


# Les modèles retouchés dont un bras n'est pas là où le corps standard a les siens (modeles.CORPS : les zones des
# bras de chibi.ZONES) : quand les bras sont redessinés (la marche, les gestes), leur bras dessiné à la main serait
# resté sur le torse. Leurs grilles « <vue>:bras » (elements(), lettres_bras()) le recouvrent : chaque case de
# la manche ou de la main prend la lettre donnée. perso_01, de profil : la manche (p) et la main (k) au milieu
# du torse, recouvertes par la salopette (s).
RETOUCHES_BRAS = {
    'perso_01': {'cote': {'lettres': 'pk', 'par': 's', 'cases': [(x, y) for y in range(12, 17) for x in range(5, 8)]}},
}


def lettres_bras(nom, d):
    """Les vues de `nom` qui changent quand les bras sont redessinés (RETOUCHES_BRAS) : {vue: {(x, y): lettre}}."""
    out = {}
    for v, r in RETOUCHES_BRAS.get(nom, {}).items():
        g = dict(lettres(nom, d)[v])
        for p in r['cases']:
            if g.get(p) in tuple(r['lettres']):
                g[p] = r['par']
        out[v] = g
    return out


def lettres(nom, d):
    """Les lettres du modèle `nom` : {vue: {(x, y): lettre}} (rangées 0..24 de chaque vue, le contour « a »
    compris) ; un modèle retouché : ses grilles de retouches.json."""
    if nom in RETOUCHES_LETTRES:
        return {v: {(x, y): ch for y, rang in enumerate(rangs) for x, ch in enumerate(rang) if ch != '.'}
                for v, rangs in RETOUCHES_LETTRES[nom]['vues'].items()}
    return {v: {p: ch for p, ch in contour(vue(d, v)).items() if 0 <= p[0] < 12 and 0 <= p[1] < 25} for v in VUES}


def modele(nom, d, i):
    pal = palette_de(nom, d, i)
    im = Image.new('RGBA', (12, 79), (0, 0, 0, 0))
    for v, g in lettres(nom, d).items():
        for (x, y), ch in g.items():
            im.putpixel((x, DEBUT[v] + y), pal[ch] + (255,))
    return im


def enfants():
    import portraits_enfants
    import fermier
    out = []
    for nom, d in portraits_enfants.enfants():
        d = dict(d, coupe=fermier.COUPES_ENFANT.get(d['coupe'], 'courts'), chapeau=fermier.CHAPEAUX_ENFANT.get(d['chapeau']))
        d['details'] = [x for x in d['details'] if x in DETAILS]       # (les joues roses : dans le catalogue)
        out.append((nom, d))
    return out


def tous():
    return catalogue.personnages() + enfants()


def main():
    os.makedirs(DOSSIER, exist_ok=True)
    n = 0
    for i, (nom, d) in enumerate(tous()):
        modele(nom, d, i).save(os.path.join(DOSSIER, nom + '.png'))
        n += 1
    print(f'{n} modèles écrits dans scripts/personnage/modeles/ (dont {len(RETOUCHES)} retouchés à la main, en lettres : retouches.json)')


if __name__ == '__main__':
    main()
