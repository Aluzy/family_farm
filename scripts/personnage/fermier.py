# Les personnages de la carte (version provisoire). Pour chacun (VARIANTES) : une planche
# assets/<nom>.png de cases 16 × 32 px, assets/<nom>.json qui donne le nom de chaque case (dans
# l'ordre de la planche, 8 cases par rangée), et assets/portrait_<nom>.png (20 × 20 : la tête et
# les épaules de face, pour la carte du joueur en haut à gauche).
#   fermier     : chapeau de paille, cheveux courts, chemise rouge, salopette bleue ;
#   fermiere    : chapeau à ruban rose, cheveux longs auburn, chemisier vert, salopette bleue ;
#   papi        : cheveux gris courts, barbe, chemise à carreaux rouge, pantalon brun ;
#   jeune_homme : peau foncée, casquette verte, chemise en jean, pantalon sombre ;
#   rousse      : cheveux roux longs, taches de rousseur, haut jaune à rayures ;
#   lunettes    : peau mate, cheveux blonds aux épaules, lunettes, chemisier lilas ;
#   garcon      : peau mate, cheveux bruns, chapeau de paille à ruban rouge, haut orange.
# Les cinq derniers suivent les portraits de assets/portraits (scripts/personnage/portraits.py).
#
# Trois vues : « bas » (de face), « haut » (de dos), « cote » (de profil, tourné vers la
# droite ; la carte le retourne pour la gauche). Lumière en haut à gauche, contour sombre
# ajouté à la fin.
#
# Cases :
#   idle_<vue>_0..1          debout, il respire
#   marche_<vue>_0..3        marche (contact, passage, contact de l'autre pied, passage)
#   houe_<vue>_0..3          labourer : prêt, houe levée, élan, coup au sol
#   plante_<vue>_0..2        planter ou récolter : la main à la poche, accroupi, la main au sol
#   arrose_<vue>_0..2        arroser : arrosoir droit, penché, penché avec les gouttes
#   panier_<vue>_0..3        marche avec le panier d'œufs
#   cuisine_0..3             de dos, il remue la marmite
#   frigo_0..2               de dos, il ouvre le réfrigérateur et se penche
#   ramasse_0..2             de profil, il ramasse un œuf dans la paille
#   hache_cote_0..3          couper du bois : prêt, hache levée, élan, coup dans le tronc
#   pioche_cote_0..3         casser un rocher : prêt, pioche levée, élan, coup au sol devant lui
#   peche_<vue>_0..3         pêcher : canne tenue, armée en arrière, lancée (il attend la
#                            touche), relevée (il ferre). Le fil et le bouchon sont dessinés par
#                            la carte, depuis le bout de la canne (PECHE_BOUT dans js/fermier.js)
#
#   python3 scripts/personnage/fermier.py            écrit les images
#   python3 scripts/personnage/fermier.py --apercu   écrit aussi apercu_<nom>.png (agrandi)
import json
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
W, H = 16, 32
COLS = 8

C = {
    'K': (43, 29, 20),                                   # contour
    'sk': (242, 196, 141), 'sk2': (214, 156, 104),       # peau
    'hr': (107, 66, 38), 'hr2': (78, 46, 26),            # cheveux
    'st': (232, 194, 90), 'st2': (184, 138, 46),         # paille du chapeau
    'bd': (163, 50, 42),                                 # ruban du chapeau
    'sh': (200, 85, 61), 'sh2': (149, 57, 42),           # chemise
    'ov': (63, 111, 168), 'ov2': (44, 79, 124),          # salopette
    'bt': (90, 58, 34), 'bt2': (62, 40, 24),             # bottes
    'ey': (40, 26, 20),                                  # yeux
    'wd': (154, 106, 60), 'mt': (154, 163, 173),         # bois et fer de la houe
    'wc': (111, 143, 163), 'wc2': (80, 106, 122),        # arrosoir
    'dr': (120, 190, 235),                               # gouttes
    'bk': (176, 121, 62), 'bk2': (130, 86, 42),          # panier
    'eg': (251, 243, 224),                               # œuf
    'sd': (120, 84, 40),                                 # graine
    'ck': (232, 140, 120),                               # joues
    'rx': (204, 120, 84), 'gl': (40, 40, 48),            # taches de rousseur, lunettes
    'br': (214, 214, 208), 'bm': (150, 120, 110),        # barbe, bouche dans la barbe
    'cp': (60, 120, 70), 'cp2': (40, 86, 50), 'cpb': (230, 230, 220),   # casquette
    'sp': (236, 214, 190),                               # carreaux, pois
    'bn': (196, 52, 44), 'bn2': (141, 37, 31),           # bonnet
    'be': (40, 40, 46), 'ba': (196, 52, 44),             # béret, bandeau (et rubans des tresses)
    'fl': (232, 120, 170), 'fc': (236, 200, 60),         # fleur
    'yo': (236, 200, 60),                                # boucles d'oreilles
}
BASE = dict(C)

# Chaque personnage : ses couleurs (à la place de celles de C) et son style.
#   cheveux  : 'courts', 'mi' (aux épaules) ou 'longs' (dans le dos)
#   chapeau  : 'paille', 'casquette' ou None (on voit les cheveux sur le dessus)
#   barbe, lunettes, rousseur, joues : vrai ou faux ; motif : None, 'carreaux' ou 'rayures'
# Les cinq derniers suivent les portraits de assets/portraits (scripts/personnage/portraits.py).
# Les 50 du catalogue (scripts/personnage/catalogue.py) passent par variante_catalogue().
PEAU_CLAIRE = {'sk': (240, 196, 160), 'sk2': (196, 150, 118)}
PEAU_MATE = {'sk': (198, 142, 96), 'sk2': (150, 100, 64)}
PEAU_FONCEE = {'sk': (124, 80, 50), 'sk2': (88, 54, 32)}
VARIANTES = {
    'fermier': {'couleurs': {}, 'cheveux': 'courts', 'chapeau': 'paille'},
    'fermiere': {
        'couleurs': {'hr': (164, 84, 42), 'hr2': (120, 56, 28), 'bd': (214, 96, 140),
                     'sh': (104, 166, 96), 'sh2': (68, 120, 64)},
        'cheveux': 'longs', 'chapeau': 'paille', 'joues': True,
    },
    'papi': {
        'couleurs': {**PEAU_CLAIRE, 'hr': (200, 200, 194), 'hr2': (150, 150, 146), 'br': (214, 214, 208), 'bm': (150, 120, 110),
                     'sh': (206, 74, 58), 'sh2': (150, 42, 34), 'sp': (236, 214, 190),
                     'ov': (120, 84, 52), 'ov2': (88, 60, 36)},
        'cheveux': 'courts', 'chapeau': None, 'barbe': True, 'motif': 'carreaux',
    },
    'jeune_homme': {
        'couleurs': {**PEAU_FONCEE, 'hr': (60, 52, 48), 'hr2': (36, 30, 28),
                     'cp': (60, 120, 70), 'cp2': (40, 86, 50), 'cpb': (230, 230, 220),
                     'sh': (98, 134, 190), 'sh2': (58, 88, 140),
                     'ov': (52, 56, 70), 'ov2': (36, 38, 50), 'bt': (40, 36, 34), 'bt2': (26, 24, 22)},
        'cheveux': 'courts', 'chapeau': 'casquette',
    },
    'rousse': {
        'couleurs': {**PEAU_CLAIRE, 'hr': (206, 104, 44), 'hr2': (160, 70, 28), 'rx': (204, 120, 84),
                     'sh': (246, 214, 96), 'sh2': (206, 160, 40)},
        'cheveux': 'longs', 'chapeau': None, 'rousseur': True, 'motif': 'rayures',
    },
    'lunettes': {
        'couleurs': {**PEAU_MATE, 'hr': (236, 200, 104), 'hr2': (196, 154, 64), 'gl': (40, 40, 48),
                     'sh': (204, 174, 224), 'sh2': (150, 110, 172),
                     'ov': (90, 90, 104), 'ov2': (64, 64, 76)},
        'cheveux': 'mi', 'chapeau': None, 'lunettes': True,
    },
    'garcon': {
        'couleurs': {**PEAU_MATE, 'hr': (110, 70, 36), 'hr2': (74, 46, 22), 'bd': (176, 52, 44),
                     'sh': (238, 148, 74), 'sh2': (196, 102, 40),
                     'ov': (84, 120, 60), 'ov2': (60, 90, 42)},
        'cheveux': 'courts', 'chapeau': 'paille',
    },
}
STYLE = {}         # le style du personnage en cours de dessin

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402  (les 50 personnages du catalogue)


def variante_catalogue(d):
    """Couleurs et style d'un personnage du catalogue (scripts/personnage/catalogue.py)."""
    peau, hr = catalogue.PEAU[d['peau']], catalogue.CHEVEUX[d['cheveux']]
    hab, a = catalogue.HABITS[d['habit']], d['accessoire']
    couleurs = {
        'sk': peau['f'], 'sk2': peau['j'], 'hr': hr['b'], 'hr2': hr['c'], 'br': hr['b'], 'bm': hr['d'],
        'sh': hab['n'], 'sh2': hab['m'], 'sp': (200, 60, 60) if d['habit'] == 'blanc' else (244, 240, 228),
        'ov': d['bas'][0], 'ov2': d['bas'][1],
        'bd': a, 'cp': a, 'cp2': catalogue.fonce(a), 'bn': a, 'bn2': catalogue.fonce(a), 'be': a, 'ba': a, 'fl': a,
    }
    if a in (catalogue.ACCESSOIRES['jaune'], catalogue.ACCESSOIRES['blanc']):
        couleurs['fc'] = (232, 120, 60)
    style = {'cheveux': d['coupe'], 'chapeau': d['chapeau'], 'motif': d['motif']}
    for x in d['details']:
        style[x] = True
    return {'couleurs': couleurs, **style}


class Canvas:
    def __init__(self):
        self.px = [[None] * W for _ in range(H)]

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n)
            y = round(y0 + (y1 - y0) * i / n)
            for dx in range(w):
                self.put(x + dx, y, c)

    def outline(self):
        out = [row[:] for row in self.px]
        for y in range(H):
            for x in range(W):
                if self.px[y][x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.px[ny][nx] not in (None, 'K', 'dr', 'sd'):
                        out[y][x] = 'K'
                        break
        self.px = out


def arm(cv, sx, sy, hx, hy, sleeve='sh'):
    """Bras de l'épaule (sx, sy) à la main (hx, hy) : manche de 2 px, main en peau."""
    cv.line(sx, sy, hx, hy, sleeve, 2)
    cv.rect(hx, hy, hx + 1, hy + 1, 'sk')


def legs(cv, vue, walk, squat):
    """Jambes et bottes. walk : 0..3 (cycle), None : immobile. squat : accroupi (jambes pliées)."""
    if vue == 'cote':
        # jambe arrière (plus sombre) et jambe avant, écartées au contact
        spread = {None: (0, 0), 0: (-2, 2), 1: (0, 0), 2: (2, -2), 3: (0, 0)}[walk]
        top = 25 + squat
        for (x, shade) in ((7 + spread[0], 2), (7 + spread[1], 1)):
            ov = 'ov2' if shade == 2 else 'ov'
            bt = 'bt2' if shade == 2 else 'bt'
            cv.rect(x, top, x + 1, 28, ov)
            cv.rect(x, 29, x + 2, 30, bt)
        return
    lift = {None: (0, 0), 0: (0, 1), 1: (0, 0), 2: (1, 0), 3: (0, 0)}[walk]
    for i, x in enumerate((5, 8)):
        up = lift[i]
        cv.rect(x, 25 + squat, x + 2, 28 - up, 'ov' if i == 0 else 'ov2')
        cv.rect(x, 29 - up, x + 2, 30 - up, 'bt')


def couvre_chef(cv, vue, b):
    """Chapeau de paille, casquette, ou les cheveux du dessus de la tête."""
    chap = STYLE.get('chapeau')
    if chap == 'paille':
        cv.rect(5, 6 + b, 10, 9 + b, 'st')
        cv.rect(5, 9 + b, 10, 9 + b, 'bd')
        cv.rect(3, 10 + b, 13 if vue == 'cote' else 12, 10 + b, 'st2')
        cv.rect(6, 6 + b, 8, 6 + b, 'st')
    elif chap == 'casquette':
        cv.rect(5, 8 + b, 10, 10 + b, 'cp')
        cv.rect(6, 7 + b, 9, 7 + b, 'cp')
        cv.put(7, 7 + b, 'cpb')
        if vue == 'bas':
            cv.rect(4, 10 + b, 11, 10 + b, 'cp2')       # la visière, de face
        elif vue == 'cote':
            cv.rect(9, 10 + b, 13, 10 + b, 'cp2')       # la visière, devant
    elif chap == 'bonnet':
        cv.rect(5, 7 + b, 10, 10 + b, 'bn')
        cv.rect(6, 6 + b, 9, 6 + b, 'bn')
        cv.rect(4 if vue != 'cote' else 5, 10 + b, 11, 10 + b, 'bn2')   # le revers
        for x in (6, 9):
            cv.put(x, 8 + b, 'bn2')                     # les côtes de la laine
    elif chap == 'beret':
        cv.rect(4, 8 + b, 11, 9 + b, 'be')
        cv.rect(5, 7 + b, 10, 7 + b, 'be')
        cv.put(8, 6 + b, 'be')                          # la queue
    else:
        if STYLE.get('cheveux') == 'chauve':            # le crâne, une couronne de cheveux autour
            cv.rect(6, 8 + b, 9, 10 + b, 'sk')
            cv.rect(5, 9 + b, 5, 10 + b, 'sk')
            cv.rect(10, 9 + b, 10, 10 + b, 'sk2')
        else:
            cv.rect(5, 9 + b, 10, 10 + b, 'hr')
            cv.rect(6, 8 + b, 9, 8 + b, 'hr')
            cv.rect(9, 9 + b, 10, 10 + b, 'hr2')
            cv.put(6, 9 + b, 'hr2' if vue == 'haut' else 'hr')
        if chap == 'bandeau':
            cv.rect(5, 10 + b, 10, 10 + b, 'ba')
            if vue == 'haut':
                cv.put(8, 11 + b, 'ba')                 # le nœud et ses pans
                cv.put(9, 12 + b, 'ba')
            elif vue == 'cote':
                cv.put(5, 11 + b, 'ba')
                cv.put(4, 12 + b, 'ba')
        elif chap == 'fleur':
            fx = 6 if vue == 'cote' else 10
            for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                cv.put(fx + dx, 9 + b + dy, 'fl')
            cv.put(fx, 9 + b, 'fc')


def body(cv, vue, b):
    """Torse, tête et couvre-chef ; b : décalage vertical (respiration, pas, accroupi)."""
    cheveux = STYLE.get('cheveux', 'courts')
    bas = {'longs': 18, 'mi': 16, 'carre': 15, 'frange': 18, 'frange_carre': 15}.get(cheveux)   # où s'arrêtent les cheveux longs
    if vue == 'cote':
        cv.rect(6, 17 + b, 10, 19 + b, 'sh')
        cv.rect(6, 20 + b, 10, 24 + b, 'ov')
        cv.rect(9, 18 + b, 10, 19 + b, 'ov')            # bavette
        cv.put(6, 20 + b, 'ov2')
        cv.rect(6, 11 + b, 10, 16 + b, 'sk')            # tête
        cv.put(11, 14 + b, 'sk')                        # nez
        cv.rect(5, 11 + b, 7, 14 + b, 'hr')             # cheveux (nuque)
        cv.put(7, 15 + b, 'hr2')
        cv.put(9, 13 + b, 'ey')
        cv.put(8, 15 + b, 'sk2')
        if bas:                                         # la queue de cheval, dans le dos
            cv.rect(5, 11 + b, 6, bas + b, 'hr')
            cv.rect(5, bas - 1 + b, 6, bas + 1 + b, 'hr2')
        if STYLE.get('joues'):
            cv.put(9, 14 + b, 'ck')
        if STYLE.get('rousseur'):
            cv.put(8, 14 + b, 'rx')
            cv.put(10, 14 + b, 'rx')
        if STYLE.get('barbe'):
            cv.rect(7, 14 + b, 10, 16 + b, 'br')
            cv.put(11, 14 + b, 'sk')
            cv.put(9, 15 + b, 'bm')
        if STYLE.get('lunettes'):
            cv.put(8, 13 + b, 'gl')
            cv.put(10, 13 + b, 'gl')
        if STYLE.get('moustache'):
            cv.rect(9, 15 + b, 10, 15 + b, 'br')
        if STYLE.get('boucles'):
            cv.put(7, 15 + b, 'yo')
        if cheveux == 'couettes':                       # une tresse dans le dos
            cv.rect(5, 12 + b, 5, 17 + b, 'hr')
            cv.put(5, 18 + b, 'ba')
        elif cheveux == 'chignon':                      # le chignon, derrière la tête
            cv.rect(4, 10 + b, 5, 12 + b, 'hr')
            cv.put(4, 10 + b, 'hr2')
        elif cheveux == 'chauve':
            cv.rect(6, 11 + b, 7, 11 + b, 'sk')
        couvre_chef(cv, vue, b)
        return
    cv.rect(5, 17 + b, 10, 19 + b, 'sh')
    cv.rect(5, 20 + b, 10, 24 + b, 'ov')
    if vue == 'bas':
        cv.rect(6, 18 + b, 9, 19 + b, 'ov')             # bavette
        cv.put(6, 18 + b, 'ov2')
        cv.put(9, 18 + b, 'ov2')
        cv.rect(5, 11 + b, 10, 16 + b, 'sk')
        cv.rect(5, 11 + b, 10, 11 + b, 'hr')
        cv.put(5, 12 + b, 'hr')
        cv.put(10, 12 + b, 'hr')
        cv.put(6, 13 + b, 'ey')
        cv.put(9, 13 + b, 'ey')
        cv.rect(6, 15 + b, 9, 15 + b, 'sk2')
        if bas:                                         # cheveux sur les épaules
            cv.rect(4, 11 + b, 5, bas + b, 'hr')
            cv.rect(10, 11 + b, 11, bas + b, 'hr')
            cv.put(4, bas + b, 'hr2')
            cv.put(11, bas + b, 'hr2')
        if STYLE.get('joues'):
            cv.put(6, 14 + b, 'ck')
            cv.put(9, 14 + b, 'ck')
        if STYLE.get('rousseur'):
            for x in (6, 7, 9):
                cv.put(x, 14 + b, 'rx')
        if STYLE.get('barbe'):
            cv.rect(5, 14 + b, 10, 16 + b, 'br')
            cv.rect(7, 14 + b, 8, 14 + b, 'sk')         # sous le nez
            cv.rect(7, 15 + b, 8, 15 + b, 'bm')         # la bouche dans la barbe
            cv.rect(6, 17 + b, 9, 17 + b, 'br')
        if STYLE.get('lunettes'):
            for x in (5, 7, 8, 10):
                cv.put(x, 13 + b, 'gl')
        if STYLE.get('moustache'):
            cv.rect(6, 15 + b, 9, 15 + b, 'br')
        if cheveux in ('frange', 'frange_carre'):
            cv.rect(6, 12 + b, 9, 12 + b, 'hr')         # la frange sur le front
        elif cheveux == 'couettes':                     # deux tresses devant les épaules
            for x in (4, 11):
                cv.rect(x, 12 + b, x, 17 + b, 'hr')
                cv.put(x, 18 + b, 'ba')
        elif cheveux == 'chignon':
            cv.rect(7, 8 + b, 8, 8 + b, 'hr2')          # le haut du chignon dépasse
        elif cheveux == 'chauve':
            cv.rect(6, 11 + b, 9, 11 + b, 'sk')
        if STYLE.get('boucles'):
            cv.put(4, 15 + b, 'yo')
            cv.put(11, 15 + b, 'yo')
    else:                                               # de dos : bretelles et cheveux
        cv.put(6, 17 + b, 'ov')
        cv.put(9, 17 + b, 'ov')
        cv.rect(6, 18 + b, 6, 19 + b, 'ov')
        cv.rect(9, 18 + b, 9, 19 + b, 'ov')
        cv.rect(5, 11 + b, 10, 15 + b, 'hr')
        cv.rect(6, 14 + b, 9, 15 + b, 'hr2')
        cv.rect(6, 16 + b, 9, 16 + b, 'sk2')
        if bas:                                         # les cheveux tombent dans le dos
            cv.rect(5, 11 + b, 10, bas + 1 + b, 'hr')
            cv.rect(6, bas - 1 + b, 9, bas + 1 + b, 'hr2')
        if STYLE.get('lunettes'):
            cv.put(4, 13 + b, 'gl')                     # les branches
            cv.put(11, 13 + b, 'gl')
        if cheveux == 'couettes':
            for x in (5, 10):
                cv.rect(x, 15 + b, x, 18 + b, 'hr')
                cv.put(x, 19 + b, 'ba')
        elif cheveux == 'chignon':
            cv.rect(6, 11 + b, 9, 13 + b, 'hr')
            cv.rect(7, 12 + b, 8, 12 + b, 'hr2')
        elif cheveux == 'chauve':
            cv.rect(6, 11 + b, 9, 12 + b, 'sk')
    couvre_chef(cv, vue, b)


def motif(cv):
    """Carreaux ou rayures sur la chemise (pas sur les manches dans l'ombre)."""
    m = STYLE.get('motif')
    if not m:
        return
    for y in range(H):
        for x in range(W):
            if cv.px[y][x] != 'sh':
                continue
            if m == 'carreaux' and (x % 4 == 1 or y % 4 == 1):
                cv.px[y][x] = 'sp'
            elif m == 'rayures' and y % 2 == 0:
                cv.px[y][x] = 'sh2'
            elif m == 'pois' and (x + 2 * y) % 4 == 0:
                cv.px[y][x] = 'sp'


def figure(vue, walk=None, b=0, squat=0, hands=None, before=None, after=None):
    """Un personnage complet. hands : positions des mains (gauche, droite) ou (main avant,
    main arrière) de profil ; before / after : dessins sous et sur le corps (outils)."""
    cv = Canvas()
    if before:
        before(cv)
    if vue == 'cote':
        far = hands[1] if hands else (7, 23 + b)
        arm(cv, 7, 18 + b, far[0], far[1], 'sh2')      # bras arrière, dans l'ombre
    legs(cv, vue, walk, squat)
    body(cv, vue, b + squat)
    if vue == 'cote':
        near = hands[0] if hands else (8, 23 + b)
        arm(cv, 8, 18 + b + squat, near[0], near[1])
    else:
        lh, rh = hands or ((3, 22 + b), (11, 22 + b))
        arm(cv, 3, 18 + b + squat, lh[0], lh[1])
        arm(cv, 11, 18 + b + squat, rh[0], rh[1])
    if after:
        after(cv)
    motif(cv)
    cv.outline()
    return cv


# ---------- outils ----------

def hoe(x0, y0, x1, y1, blade):
    def draw(cv):
        cv.line(x0, y0, x1, y1, 'wd')
        for (x, y) in blade:
            cv.put(x, y, 'mt')
    return draw


def can(x, y, tilt, drops):
    def draw(cv):
        cv.rect(x, y, x + 2, y + 2, 'wc')
        cv.rect(x, y + 2, x + 2, y + 2, 'wc2')
        sx, sy = (x + 3, y) if tilt == 0 else (x + 3, y + 2)
        cv.line(x + 3, y + 1, sx + 1, sy - 1 if tilt == 0 else sy + 1, 'wc2')
        if drops:
            for (dx, dy) in ((5, 5), (4, 7), (5, 9)):
                cv.put(x + dx, y + dy, 'dr')
    return draw


def basket(x, y, eggs=2):
    def draw(cv):
        cv.rect(x, y + 1, x + 3, y + 3, 'bk')
        cv.rect(x, y + 3, x + 3, y + 3, 'bk2')
        cv.line(x, y + 1, x + 1, y - 1, 'bk2')
        cv.line(x + 3, y + 1, x + 2, y - 1, 'bk2')
        for i in range(eggs):
            cv.put(x + 1 + i, y, 'eg')
    return draw


def frames():
    F = {}
    for vue in ('bas', 'haut', 'cote'):
        # debout : il respire (le haut du corps descend d'un pixel)
        F[f'idle_{vue}_0'] = figure(vue)
        F[f'idle_{vue}_1'] = figure(vue, b=1)
        for k in range(4):
            F[f'marche_{vue}_{k}'] = figure(vue, walk=k, b=-1 if k in (1, 3) else 0,
                                            hands=None if vue != 'cote' else ((9 - (k == 0) * 2 + (k == 2) * 2, 22), (7 + (k == 0) * 2 - (k == 2) * 2, 22)))
    # labourer
    F['houe_cote_0'] = figure('cote', hands=((10, 20), (9, 21)), after=hoe(11, 21, 5, 9, [(4, 9), (4, 10), (5, 8)]))
    F['houe_cote_1'] = figure('cote', b=-1, hands=((9, 11), (8, 12)), after=hoe(9, 12, 3, 4, [(2, 4), (2, 5), (3, 3)]))
    F['houe_cote_2'] = figure('cote', hands=((11, 15), (10, 16)), after=hoe(11, 15, 15, 8, [(15, 7), (14, 7), (15, 9)]))
    F['houe_cote_3'] = figure('cote', squat=1, hands=((11, 21), (10, 22)), after=hoe(11, 21, 14, 28, [(14, 29), (15, 29), (13, 30)]))
    F['houe_bas_0'] = figure('bas', hands=((6, 21), (9, 21)), before=hoe(8, 21, 12, 9, [(12, 8), (13, 8), (12, 7)]))
    F['houe_bas_1'] = figure('bas', b=-1, hands=((6, 8), (9, 8)), after=hoe(8, 8, 8, 1, [(7, 1), (8, 0), (9, 1)]))
    F['houe_bas_2'] = figure('bas', hands=((6, 15), (9, 15)), after=hoe(8, 15, 8, 6, [(7, 5), (8, 5), (9, 5)]))
    F['houe_bas_3'] = figure('bas', squat=1, hands=((6, 23), (9, 23)), after=hoe(8, 23, 8, 29, [(7, 30), (8, 30), (9, 30)]))
    F['houe_haut_0'] = figure('haut', hands=((6, 21), (9, 21)), before=hoe(8, 21, 3, 9, [(3, 8), (2, 8), (3, 7)]))
    F['houe_haut_1'] = figure('haut', b=-1, hands=((6, 8), (9, 8)), after=hoe(8, 8, 8, 1, [(7, 1), (8, 0), (9, 1)]))
    F['houe_haut_2'] = figure('haut', hands=((6, 13), (9, 13)), after=hoe(8, 13, 8, 4, [(7, 3), (8, 3), (9, 3)]))
    F['houe_haut_3'] = figure('haut', squat=1, hands=((6, 19), (9, 19)), before=hoe(8, 19, 8, 12, [(7, 11), (8, 11), (9, 11)]))
    # planter / récolter : la main à la poche, accroupi, la main au sol (une graine tombe)
    seed = lambda pts: (lambda cv: [cv.put(x, y, 'sd') for (x, y) in pts])
    F['plante_cote_0'] = figure('cote', hands=((9, 21), (7, 22)))
    F['plante_cote_1'] = figure('cote', squat=2, hands=((11, 25), (7, 24)))
    F['plante_cote_2'] = figure('cote', squat=2, hands=((12, 27), (7, 24)), after=seed([(13, 30)]))
    F['plante_bas_0'] = figure('bas', hands=((3, 22), (10, 21)))
    F['plante_bas_1'] = figure('bas', squat=2, hands=((3, 24), (10, 26)))
    F['plante_bas_2'] = figure('bas', squat=2, hands=((3, 24), (8, 28)), after=seed([(9, 31)]))
    F['plante_haut_0'] = figure('haut', hands=((3, 22), (10, 21)))
    F['plante_haut_1'] = figure('haut', squat=2, hands=((3, 24), (11, 23)))
    F['plante_haut_2'] = figure('haut', squat=2, hands=((3, 24), (10, 22)))
    # arroser
    for k in range(3):
        F[f'arrose_cote_{k}'] = figure('cote', hands=((10, 21), (8, 22)), after=can(10, 21, min(k, 1), k == 2))
        F[f'arrose_bas_{k}'] = figure('bas', hands=((3, 22), (11, 22)), after=can(11, 22, min(k, 1), k == 2))
        F[f'arrose_haut_{k}'] = figure('haut', hands=((3, 22), (11, 20)), before=can(11, 19, min(k, 1), k == 2))
    # le panier d'œufs
    for vue in ('bas', 'haut', 'cote'):
        for k in range(4):
            b = -1 if k in (1, 3) else 0
            if vue == 'cote':
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((10, 21 + b), (7, 22)), after=basket(10, 21 + b))
            elif vue == 'bas':
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((3, 22 + b), (11, 21 + b)), after=basket(11, 22 + b))
            else:
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((3, 22 + b), (11, 21 + b)), before=basket(11, 21 + b))
    # cuisiner, de dos : la main droite tourne la cuillère
    for k, h in enumerate(((11, 17), (12, 16), (11, 15), (10, 16))):
        F[f'cuisine_{k}'] = figure('haut', hands=((4, 18), h), after=(lambda hx, hy: lambda cv: cv.line(hx, hy, hx - 1, hy - 3, 'wd'))(*h))
    # le réfrigérateur, de dos : il tend le bras, ouvre, se penche
    F['frigo_0'] = figure('haut', hands=((3, 22), (12, 15)))
    F['frigo_1'] = figure('haut', hands=((3, 22), (13, 17)))
    F['frigo_2'] = figure('haut', b=1, hands=((6, 16), (13, 17)))
    # ramasser un œuf, de profil
    F['ramasse_0'] = figure('cote', hands=((9, 21), (6, 22)), before=basket(3, 21))
    F['ramasse_1'] = figure('cote', squat=2, hands=((12, 27), (6, 24)), before=basket(3, 23))
    F['ramasse_2'] = figure('cote', squat=2, hands=((10, 23), (6, 24)), before=basket(3, 23, 3), after=lambda cv: cv.put(11, 22, 'eg'))
    # couper du bois, de profil (le tronc à droite) : prêt, hache levée derrière l'épaule,
    # élan, coup dans le tronc à hauteur de hanche (fer de 2 × 3 au bout du manche)
    head = lambda x, y: [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1), (x, y + 2), (x + 1, y + 2)]
    F['hache_cote_0'] = figure('cote', hands=((10, 21), (9, 22)), after=hoe(10, 21, 13, 15, head(13, 13)))
    F['hache_cote_1'] = figure('cote', b=-1, hands=((8, 12), (7, 13)), after=hoe(8, 12, 4, 6, head(2, 4)))
    F['hache_cote_2'] = figure('cote', hands=((10, 14), (9, 15)), after=hoe(10, 14, 13, 10, head(13, 8)))
    F['hache_cote_3'] = figure('cote', hands=((11, 20), (10, 20)), after=hoe(11, 20, 14, 20, head(14, 18)))
    # casser un rocher, de profil (le rocher à droite, au sol) : prêt, pioche levée derrière
    # l'épaule, élan au-dessus de la tête, coup sur le rocher. Le fer, en travers du bout du
    # manche, est une barre courbe de 5 pixels pointue des deux côtés.
    F['pioche_cote_0'] = figure('cote', hands=((10, 21), (9, 22)), after=hoe(10, 21, 13, 15, [(11, 15), (12, 14), (13, 14), (14, 14), (15, 15)]))
    F['pioche_cote_1'] = figure('cote', b=-1, hands=((8, 12), (7, 13)), after=hoe(8, 12, 4, 6, [(2, 7), (3, 6), (4, 5), (5, 5), (6, 4)]))
    F['pioche_cote_2'] = figure('cote', hands=((10, 14), (9, 15)), after=hoe(10, 14, 12, 8, [(10, 7), (11, 7), (12, 8), (13, 9), (13, 10)]))
    F['pioche_cote_3'] = figure('cote', squat=1, hands=((11, 21), (10, 22)), after=hoe(11, 21, 14, 25, [(12, 27), (13, 26), (14, 25), (15, 24), (15, 23)]))
    # pêcher : la canne (bois, un peu plus sombre au bout) ; le fil part de son bout
    rod = lambda x0, y0, x1, y1: (lambda cv: (cv.line(x0, y0, x1, y1, 'wd'), cv.put(x1, y1, 'bt2')))
    F['peche_cote_0'] = figure('cote', hands=((10, 21), (9, 22)), after=rod(10, 21, 15, 8))
    F['peche_cote_1'] = figure('cote', b=-1, hands=((8, 13), (7, 14)), after=rod(8, 13, 1, 3))
    F['peche_cote_2'] = figure('cote', hands=((11, 20), (10, 21)), after=rod(11, 20, 15, 13))
    F['peche_cote_3'] = figure('cote', b=-1, hands=((10, 18), (9, 19)), after=rod(10, 18, 13, 2))
    F['peche_bas_0'] = figure('bas', hands=((4, 22), (11, 21)), after=rod(11, 21, 14, 9))
    F['peche_bas_1'] = figure('bas', b=-1, hands=((4, 22), (11, 14)), after=rod(11, 14, 13, 1))
    F['peche_bas_2'] = figure('bas', hands=((4, 22), (11, 21)), after=rod(11, 21, 15, 27))
    F['peche_bas_3'] = figure('bas', b=-1, hands=((4, 22), (11, 17)), after=rod(11, 17, 15, 4))
    F['peche_haut_0'] = figure('haut', hands=((4, 22), (11, 20)), before=rod(11, 20, 14, 8))
    F['peche_haut_1'] = figure('haut', b=-1, hands=((4, 22), (11, 16)), after=rod(11, 16, 13, 29))
    F['peche_haut_2'] = figure('haut', hands=((4, 22), (11, 20)), before=rod(11, 20, 15, 5))
    F['peche_haut_3'] = figure('haut', b=-1, hands=((4, 22), (11, 17)), before=rod(11, 17, 14, 1))
    return F


def render(cv):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            c = cv.px[y][x]
            if c is not None:
                im.putpixel((x, y), C[c] + (255,))
    return im


def ecrire(nom, dossier='assets', portrait=True, cases=True):
    F = frames()
    names = list(F)
    rows = (len(names) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * W, rows * H), (0, 0, 0, 0))
    for i, n in enumerate(names):
        sheet.paste(render(F[n]), ((i % COLS) * W, (i // COLS) * H))
    sheet.save(os.path.join(ROOT, dossier, f'{nom}.png'))
    if cases:
        with open(os.path.join(ROOT, dossier, f'{nom if dossier == "assets" else "cases"}.json'), 'w', encoding='utf-8') as f:
            json.dump({'frameWidth': W, 'frameHeight': H, 'frames': names}, f, ensure_ascii=False, indent=0)
            f.write('\n')
    if not portrait:
        return
    # Portrait : la tête et les épaules de face (debout), dans un carré de 20 × 20.
    face = Image.new('RGBA', (W + 4, H), (0, 0, 0, 0))
    face.paste(render(F['idle_bas_0']), (2, 0))
    face.crop((0, 4, W + 4, 24)).save(os.path.join(ROOT, 'assets', f'portrait_{nom}.png'))
    print(f'assets/{nom}.png : {len(names)} cases de {W} × {H} px ({COLS} par rangée), et portrait_{nom}.png')
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (126, 170, 92, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(os.path.join(ROOT, f'apercu_{nom}.png'))


def dessiner(v):
    C.clear()
    C.update(BASE)
    C.update(v['couleurs'])
    STYLE.clear()
    STYLE.update({k: v[k] for k in v if k != 'couleurs'})


def main():
    for nom, v in VARIANTES.items():
        dessiner(v)
        ecrire(nom)
    # Les 50 du catalogue : assets/personnages/perso_XX.png, les noms des cases (les mêmes pour
    # tous) dans assets/personnages/cases.json ; leur portrait est dans assets/portraits.
    os.makedirs(os.path.join(ROOT, 'assets', 'personnages'), exist_ok=True)
    for i, (nom, d) in enumerate(catalogue.personnages()):
        dessiner(variante_catalogue(d))
        ecrire(nom, os.path.join('assets', 'personnages'), portrait=False, cases=(i == 0))


if __name__ == '__main__':
    main()
