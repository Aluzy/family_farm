# Portraits 16 × 16 des personnages, dérivés du portrait modèle. Cinq personnages nommés
# (PERSONNAGES, plus bas) et les 50 du catalogue (scripts/personnage/catalogue.py,
# perso_01 à perso_50) (assets/portraits/modele.png :
# la jeune femme aux cheveux châtains et au chemisier vert). Chaque variante part de la grille
# du modèle et la transforme : couleurs (peau, cheveux, vêtement), coupe de cheveux, barbe,
# lunettes, taches de rousseur, chapeau ou casquette, motif du vêtement. Le contour est
# refait à la fin autour de la nouvelle silhouette.
#
#   python3 scripts/personnage/portraits.py            écrit assets/portraits/<nom>.png
#   python3 scripts/personnage/portraits.py --apercu   écrit aussi apercu_portraits.png (agrandi)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402  (les 50 personnages du catalogue)

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DIR = os.path.join(ROOT, 'assets', 'portraits')
N = 16

# Rôle de chaque couleur du modèle (lu dans l'image, couleur par couleur).
ROLES = {
    (7, 5, 2): 'a',                                          # contour
    (135, 96, 44): 'b', (79, 58, 30): 'c', (67, 48, 21): 'd',   # cheveux : clair, ombre, sombre
    (242, 203, 173): 'e', (240, 185, 141): 'f', (184, 141, 107): 'j', (238, 160, 98): 'k',   # peau : lumière, peau, ombre, bouche
    (41, 41, 40): 'g', (236, 236, 236): 'h', (197, 194, 194): 'i',   # yeux
    (36, 52, 22): 'l', (136, 169, 108): 'm', (185, 231, 146): 'n',   # vêtement : contour, ombre, clair
}
HAIR, SKIN, SHIRT = set('bcd'), set('efjk'), set('lmn')


def lire_modele():
    im = Image.open(os.path.join(DIR, 'modele.png')).convert('RGBA')
    g = [['.'] * N for _ in range(N)]
    pal = {}
    for y in range(N):
        for x in range(N):
            p = im.getpixel((x, y))
            if p[3] == 0:
                continue
            g[y][x] = ROLES[p[:3]]
            pal[ROLES[p[:3]]] = p[:3]
    return g, pal


def copie(g):
    return [row[:] for row in g]


def contour(g):
    """Retire le contour qui ne borde plus rien et le refait autour de la tête (le vêtement,
    en bas, a son propre contour)."""
    side = ((1, 0), (-1, 0), (0, 1), (0, -1))
    solid = lambda x, y: 0 <= x < N and 0 <= y < N and g[y][x] not in '.a'
    out = copie(g)
    for y in range(N):
        for x in range(N):
            if g[y][x] == 'a' and not any(solid(x + dx, y + dy) for dx, dy in side):
                out[y][x] = '.'
    g2 = copie(out)
    for y in range(10):
        for x in range(N):
            if out[y][x] == '.' and any(0 <= x + dx < N and 0 <= y + dy < N and out[y + dy][x + dx] not in '.alm'
                                         for dx, dy in side):
                g2[y][x] = 'a'
    return g2


# ---------- transformations ----------

def cheveux_courts(g, coupe):
    """Coupe les cheveux au-dessous de la rangée `coupe` : le visage se découvre (joue et
    oreille à droite), ce qui tombait sur les épaules devient du vêtement. La rangée du
    dessus est arrondie (les mèches les plus larges partent)."""
    for x in range(N):
        if g[coupe - 1][x] in HAIR and (x <= 1 or x >= 14):
            g[coupe - 1][x] = '.'
    for y in range(coupe, N):
        for x in range(N):
            if g[y][x] not in HAIR:
                continue
            if y >= 10:
                g[y][x] = 'n' if 2 < x < 13 else '.'
            elif x == 9:
                g[y][x] = 'f'                           # la joue
            elif x == 10 and y <= 8:
                g[y][x] = 'j'                           # l'oreille
            else:
                g[y][x] = '.'
    return g


def barbe(g):
    for y in range(7, 11):
        for x in range(3, 11):
            if g[y][x] in SKIN and not (y == 7 and x in (5, 6)):
                g[y][x] = 'q'
    g[9][5] = 'Q'; g[9][6] = 'Q'                       # la bouche dans la barbe
    for x in range(4, 10):
        if g[10][x] in SHIRT or g[10][x] in SKIN:
            g[10][x] = 'q' if 4 < x < 9 else g[10][x]
    return g


def lunettes(g):
    for (x, y) in ((4, 4), (5, 4), (7, 4), (8, 4), (3, 5), (6, 5), (9, 5)):
        g[y][x] = 'G'
    return g


def rousseur(g):
    for (x, y) in ((4, 7), (8, 7), (7, 8)):
        g[y][x] = 'R'
    return g


def chapeau(g, bord=True):
    """Chapeau de paille : calotte sur les rangées 0 à 2, bord sur la rangée 3."""
    for y in range(0, 3):
        for x in range(4, 12):
            g[y][x] = 'S' if y else 'a'
        g[y][3] = 'a' if y else '.'
        g[y][12] = 'a' if y else '.'
    for x in range(4, 12):
        g[2][x] = 'B'                                   # ruban
    if bord:
        for x in range(0, 16):
            g[3][x] = 'T' if 1 <= x <= 14 else 'a'
    return g


def casquette(g):
    """Casquette, la visière vers la gauche (le regard)."""
    for y in range(0, 3):
        for x in range(3, 13):
            g[y][x] = 'a' if y == 0 else 'C'
    for x in range(3, 13):
        g[2][x] = 'D'
    for x in range(0, 7):
        g[3][x] = 'D' if x >= 1 else 'a'
    g[1][8] = 'E'                                       # le bouton
    return g


def rayures(g, rows=(12, 14)):
    for y in rows:
        for x in range(N):
            if g[y][x] == 'n':
                g[y][x] = 'm'
    return g


def carreaux(g):
    for y in range(10, N):
        for x in range(N):
            if g[y][x] in 'nm' and (x % 3 == 0 or y % 3 == 1):
                g[y][x] = 'P'
    return g


def couettes(g):
    """Deux mèches tressées qui tombent devant les épaules."""
    for y in range(10, 14):
        g[y][1] = 'b' if y % 2 else 'c'
        g[y][0] = 'a'
        g[y][2] = 'a' if g[y][2] == '.' else g[y][2]
    g[14][1] = 'B'
    return g


def moustache(g):
    for x in range(4, 9):
        if g[8][x] in SKIN:
            g[8][x] = 'q'
    return g


def frange(g):
    """Une frange sur le front."""
    for x in range(4, 9):
        g[3][x] = 'b' if x % 2 else 'c'
    return g


def chignon(g):
    """Un chignon en haut à droite de la tête."""
    for (x, y) in ((12, 0), (13, 0), (12, 1), (13, 1), (14, 1), (13, 2), (14, 2)):
        g[y][x] = 'b' if (x + y) % 2 else 'c'
    return g


def chauve(g):
    """Le dessus du crâne dégarni : il reste une couronne de cheveux sur les côtés."""
    for y in range(0, 3):
        for x in range(N):
            if g[y][x] in HAIR:
                g[y][x] = 'e' if y < 2 and 5 <= x <= 8 else 'f'
    for x in range(3, 13):
        if g[3][x] in HAIR and 4 <= x <= 10:
            g[3][x] = 'f'
    return g


def bonnet(g):
    """Bonnet de laine à revers, sur le haut de la tête."""
    for y in range(0, 4):
        for x in range(2, 14):
            if y == 0 and not 4 <= x <= 11:
                continue
            g[y][x] = 'X' if y == 3 else ('W' if (x + y) % 3 else 'X')
    g[0][3] = 'a'; g[0][12] = 'a'
    return g


def beret(g):
    """Béret penché vers la droite."""
    for x in range(4, 14):
        g[1][x] = 'V'
        g[2][x] = 'V'
    for x in range(3, 15):
        g[2][x] = 'V'
    g[0][8] = 'V'                                       # la queue du béret
    return g


def bandeau(g):
    """Bandeau noué dans les cheveux."""
    for x in range(1, 15):
        if g[2][x] in HAIR:
            g[2][x] = 'H'
    g[3][14] = 'H'
    g[4][15] = 'H'
    return g


def fleur(g):
    """Une fleur piquée dans les cheveux, à droite."""
    for (x, y) in ((11, 1), (13, 1), (12, 0), (12, 2)):
        g[y][x] = 'F'
    g[1][12] = 'Y'
    return g


def boucles(g):
    """Boucles d'oreilles (visibles quand les cheveux sont courts)."""
    g[9][10] = 'Y'
    return g


def pois(g):
    for y in range(10, N):
        for x in range(N):
            if g[y][x] in 'nm' and (x + 2 * y) % 4 == 0:
                g[y][x] = 'P'
    return g


# ---------- les personnages ----------

PEAUX = {
    'claire': {'e': (246, 214, 190), 'f': (240, 196, 160), 'j': (196, 150, 118), 'k': (232, 150, 120)},
    'mate': {'e': (218, 166, 120), 'f': (198, 142, 96), 'j': (150, 100, 64), 'k': (200, 110, 80)},
    'foncee': {'e': (150, 100, 66), 'f': (124, 80, 50), 'j': (88, 54, 32), 'k': (170, 84, 66)},
}
CHEVEUX = {
    'gris': {'b': (200, 200, 194), 'c': (150, 150, 146), 'd': (112, 112, 108)},
    'noirs': {'b': (60, 52, 48), 'c': (36, 30, 28), 'd': (24, 20, 18)},
    'roux': {'b': (206, 104, 44), 'c': (160, 70, 28), 'd': (120, 50, 20)},
    'blonds': {'b': (236, 200, 104), 'c': (196, 154, 64), 'd': (150, 112, 40)},
    'bruns': {'b': (110, 70, 36), 'c': (74, 46, 22), 'd': (54, 34, 16)},
}
HABITS = {
    'rouge': {'l': (70, 18, 14), 'm': (150, 42, 34), 'n': (206, 74, 58)},
    'jean': {'l': (18, 30, 56), 'm': (58, 88, 140), 'n': (98, 134, 190)},
    'jaune': {'l': (80, 60, 10), 'm': (206, 160, 40), 'n': (246, 214, 96)},
    'lilas': {'l': (56, 30, 66), 'm': (150, 110, 172), 'n': (204, 174, 224)},
    'orange': {'l': (84, 36, 10), 'm': (196, 102, 40), 'n': (238, 148, 74)},
}
EXTRA = {
    'q': (206, 206, 200), 'Q': (150, 120, 110),         # barbe, bouche dans la barbe
    'G': (40, 40, 48),                                  # monture des lunettes
    'R': (204, 120, 84),                                # taches de rousseur
    'S': (232, 196, 96), 'T': (190, 146, 56), 'B': (176, 52, 44),   # chapeau de paille
    'C': (60, 120, 70), 'D': (40, 86, 50), 'E': (230, 230, 220),    # casquette
    'P': (236, 214, 190),                               # carreaux
}

PERSONNAGES = {
    'papi': {'peau': 'claire', 'cheveux': 'gris', 'habit': 'rouge',
             'faire': lambda g: carreaux(barbe(cheveux_courts(g, 6)))},
    'jeune_homme': {'peau': 'foncee', 'cheveux': 'noirs', 'habit': 'jean',
                    'faire': lambda g: casquette(cheveux_courts(g, 6))},
    'rousse': {'peau': 'claire', 'cheveux': 'roux', 'habit': 'jaune',
               'faire': lambda g: couettes(rayures(rousseur(g)))},
    'lunettes': {'peau': 'mate', 'cheveux': 'blonds', 'habit': 'lilas',
                 'faire': lambda g: lunettes(cheveux_courts(g, 9))},
    'garcon': {'peau': 'mate', 'cheveux': 'bruns', 'habit': 'orange',
               'faire': lambda g: chapeau(cheveux_courts(g, 6))},
}


def image(g, pal):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            c = g[y][x]
            if c != '.':
                im.putpixel((x, y), pal[c] + (255,))
    return im


COUPES = {
    'longs': lambda g: g,
    'mi': lambda g: cheveux_courts(g, 8),
    'carre': lambda g: cheveux_courts(g, 9),
    'courts': lambda g: cheveux_courts(g, 6),
    'frange': lambda g: frange(g),
    'frange_carre': lambda g: frange(cheveux_courts(g, 9)),
    'couettes': lambda g: couettes(g),
    'chignon': lambda g: chignon(cheveux_courts(g, 8)),
    'chauve': lambda g: cheveux_courts(chauve(g), 6),
}
COUVRE_CHEFS = {None: lambda g: g, 'paille': chapeau, 'casquette': casquette, 'bonnet': bonnet,
                'beret': beret, 'bandeau': bandeau, 'fleur': fleur}
DETAILS = {'barbe': barbe, 'moustache': moustache, 'lunettes': lunettes, 'rousseur': rousseur, 'boucles': boucles}
MOTIFS = {None: lambda g: g, 'rayures': rayures, 'carreaux': carreaux, 'pois': pois}


def portrait_catalogue(base, pal0, d):
    """Le portrait d'un personnage du catalogue (scripts/personnage/catalogue.py)."""
    g = COUPES[d['coupe']](copie(base))
    g = COUVRE_CHEFS[d['chapeau']](g)
    for x in d['details']:
        g = DETAILS[x](g)
    g = MOTIFS[d['motif']](g)
    g = contour(g)
    pal = dict(pal0)
    pal.update(catalogue.PEAU[d['peau']]); pal.update(catalogue.CHEVEUX[d['cheveux']]); pal.update(catalogue.HABITS[d['habit']]); pal.update(EXTRA)
    a = d['accessoire']
    pal.update({'C': a, 'D': catalogue.fonce(a), 'W': a, 'X': catalogue.fonce(a), 'V': a, 'H': a, 'F': a, 'B': a,
                'Y': (236, 200, 60)})
    if d['chapeau'] == 'fleur' and a in (catalogue.ACCESSOIRES['jaune'], catalogue.ACCESSOIRES['blanc']):
        pal['Y'] = (232, 120, 60)                       # le cœur de la fleur
    if d['motif'] in ('pois', 'carreaux'):
        pal['P'] = (200, 60, 60) if d['habit'] == 'blanc' else (244, 240, 228)
    h = catalogue.CHEVEUX[d['cheveux']]
    pal['q'] = h['b']; pal['Q'] = h['d']                # barbe et moustache : la couleur des cheveux
    return image(g, pal)


def main():
    base, pal0 = lire_modele()
    images = [('modele', image(base, pal0))]
    for nom, p in PERSONNAGES.items():
        pal = dict(pal0)
        pal.update(PEAUX[p['peau']]); pal.update(CHEVEUX[p['cheveux']]); pal.update(HABITS[p['habit']]); pal.update(EXTRA)
        g = contour(p['faire'](copie(base)))
        im = image(g, pal)
        im.save(os.path.join(DIR, f'{nom}.png'))
        images.append((nom, im))
    for nom, d in catalogue.personnages():
        im = portrait_catalogue(base, pal0, d)
        im.save(os.path.join(DIR, f'{nom}.png'))
        images.append((nom, im))
    print(f'assets/portraits : {len(images) - 1} portraits dérivés du modèle')
    if '--apercu' in sys.argv:
        S, M = 10, 8
        cols = 14
        rows = (len(images) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (N * S + M) + M, rows * (N * S + M) + M), (230, 214, 180, 255))
        for i, (_, im) in enumerate(images):
            sheet.alpha_composite(im.resize((N * S, N * S), Image.NEAREST), (M + (i % cols) * (N * S + M), M + (i // cols) * (N * S + M)))
        sheet.save(os.path.join(ROOT, 'apercu_portraits.png'))


if __name__ == '__main__':
    main()
