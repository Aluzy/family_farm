# Les modèles des personnages (scripts/personnage/modeles/<nom>.png, 12 × 79 px : de face, de
# dos, de profil ; voir chibi.py), tirés du catalogue (scripts/personnage/catalogue.py pour les
# adultes, portraits_enfants.py pour les enfants). Ils suivent les motifs des modèles dessinés à
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
#   python3 scripts/personnage/modeles.py      écrit les modèles (sauf ceux de RETOUCHES)
#
# RETOUCHES : les modèles dessinés ou retouchés à la main, que ce script n'écrase pas.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles')
RETOUCHES = ('perso_01', 'perso_02', 'perso_03')
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
    'fleur': {
        'bas': ['............', '............', '.........R..', '........RYR.', '.........R..'],
        'haut': ['............', '............', '..R.........', '.RYR........', '..R.........'],
        'cote': ['............', '............', '...R........', '..RYR.......', '...R........'],
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

YEUX = {
    'brun': ((54, 36, 24), (84, 58, 40)), 'noisette': ((96, 62, 28), (128, 88, 44)),
    'vert': ((20, 102, 16), (26, 128, 20)), 'bleu': ((30, 66, 150), (46, 96, 190)),
    'violet': ((70, 36, 120), (100, 60, 160)), 'turquoise': ((10, 110, 124), (20, 150, 166)),
}


def yeux(d, i):
    if d.get('yeux'):
        return d['yeux']
    if d['cheveux'] in ('blonds', 'platine', 'roux', 'auburn', 'roses', 'bleus', 'verts'):
        return ('bleu', 'vert')[i % 2]
    return ('brun', 'noisette')[i % 2]


def palette(d, i):
    peau, hr, hab = catalogue.PEAU[d['peau']], catalogue.CHEVEUX[d['cheveux']], catalogue.HABITS[d['habit']]
    f, j = peau['f'], peau['j']
    a = d['accessoire']
    s, r = d['bas']
    blanc = d['habit'] == 'blanc'
    motif = (200, 60, 60) if blanc else (244, 240, 228)
    oeil = YEUX[yeux(d, i)]
    return {
        'k': f, 'd': mix(f, j, 0.25), 'm': mix(f, j, 0.45), 't': mix(f, j, 0.3), 'l': j, 'e': peau['e'], 'P': peau['k'],
        'g': (239, 239, 239), 'i': (255, 255, 255), 'h': oeil[0], 'j': oeil[1],
        'B': hr['b'], 'C': hr['c'], 'E': mix(hr['b'], hr['c'], 0.5),
        'p': hab['n'], 'q': mix(hab['n'], hab['m'], 0.55), 'o': motif if d['motif'] else mix(hab['n'], (255, 255, 255), 0.4),
        's': s, 'r': r, 'u': mul(s, 0.82), 'v': mul(s, 0.37), 'A': mul(s, 0.91), 'Z': mul(s, 0.55),
        'w': (90, 58, 34), 'x': (68, 44, 26), 'y': (46, 30, 18),
        'R': a, 'Q': catalogue.fonce(a), 'H': mix(a, (255, 255, 255), 0.3), 'V': catalogue.fonce(a, 0.56),
        'S': (232, 194, 90), 'T': (250, 222, 136), 'U': (184, 138, 46),
        'G': (40, 40, 48), 'X': mix(f, (180, 90, 50), 0.45), 'Y': (236, 200, 60), 'W': (244, 226, 196),
    }


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
    poser(g, coiffure(d['coupe'], v), 0)
    chap = d['chapeau']
    if chap:
        poser(g, CHAPEAUX[chap][v], 0)
        if chap in ('casquette', 'bonnet', 'paille'):
            # sous le couvre-chef, le haut des cheveux ne dépasse pas
            for (x, y) in [p for p in g if p[1] < 4 and g[p] in 'BCEe']:
                del g[(x, y)]
    for det in d['details']:
        for (x, y, ch) in DETAILS.get(det, {}).get(v, []):
            if det == 'barbe' and ch in 'BC' and (x, y) in g and g[(x, y)] in 'gihj':
                continue
            g[(x, y)] = ch
    return g


def contour(g):
    out = dict(g)
    for (x, y) in g:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in g and 0 <= n[0] < 12 and 0 <= n[1] < 25:
                out[n] = 'a'
    return out


def modele(d, i):
    pal = palette(d, i)
    pal['a'] = CONTOUR
    pal['v_'] = mul(pal['q'], 0.85)
    im = Image.new('RGBA', (12, 79), (0, 0, 0, 0))
    for v in VUES:
        g = contour(vue(d, v))
        for (x, y), ch in g.items():
            if 0 <= x < 12 and 0 <= y < 25:
                im.putpixel((x, DEBUT[v] + y), pal[ch] + (255,))
    return im


def enfants():
    import portraits_enfants
    import fermier
    out = []
    for nom, d in portraits_enfants.enfants():
        d = dict(d, coupe=fermier.COUPES_ENFANT.get(d['coupe'], 'courts'), chapeau=fermier.CHAPEAUX_ENFANT.get(d['chapeau']))
        d['details'] = [x for x in d['details'] if x in DETAILS] + ['joues']
        out.append((nom, d))
    return out


def tous():
    return catalogue.personnages() + enfants()


def main():
    os.makedirs(DOSSIER, exist_ok=True)
    n = 0
    for i, (nom, d) in enumerate(tous()):
        if nom in RETOUCHES:
            continue
        modele(d, i).save(os.path.join(DOSSIER, nom + '.png'))
        n += 1
    print(f'{n} modèles écrits dans scripts/personnage/modeles/ ({len(RETOUCHES)} retouchés à la main gardés)')


if __name__ == '__main__':
    main()
