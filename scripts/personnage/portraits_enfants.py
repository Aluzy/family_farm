# Portraits 16 × 16 des enfants, dérivés du portrait modèle d'enfant
# (assets/portraits/modele_enfant.png : l'enfant aux cheveux châtains et au t-shirt vert) ; les
# enfants partent tous (version 2) du modèle de garçon (assets/portraits/modele_garcon.png).
# Même méthode que scripts/personnage/portraits.py pour les adultes : chaque enfant part de la
# grille du modèle et la transforme (couleurs, coupe, couvre-chef, détails, motif), puis le
# contour est refait. Les couleurs de peau, de cheveux, d'habits et d'accessoires sont celles
# du catalogue des adultes (scripts/personnage/catalogue.py).
#
# La tête de l'enfant est plus petite que celle de l'adulte : les trois rangées du haut sont
# libres (couettes, queue de cheval, chignon, chapeaux).
#
#   python3 scripts/personnage/portraits_enfants.py            écrit assets/portraits/enfant_XX.png
#   python3 scripts/personnage/portraits_enfants.py --apercu   écrit aussi apercu_enfants.png (numérotés)
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, copie  # noqa: E402
DIR = os.path.join(ASSETS, 'portraits')
N = 16
COU = 11           # première rangée du vêtement

# Rôle de chaque couleur du modèle, avec les mêmes lettres que les adultes (portraits.py) :
# a contour, b c d cheveux, f peau, j ombre, k bouche, g h i yeux, l m n vêtement.
ROLES = {
    (7, 5, 2): 'a',
    (135, 96, 44): 'b', (79, 58, 30): 'c', (67, 48, 21): 'd',
    (240, 185, 141): 'f', (184, 141, 107): 'j', (214, 127, 58): 'k',
    (41, 41, 40): 'g', (236, 236, 236): 'h', (197, 194, 194): 'i',
    (36, 52, 22): 'l', (136, 169, 108): 'm', (185, 231, 146): 'n',
}
HAIR, SHIRT = set('bcd'), set('lmn')


def lire_modele():
    im = Image.open(os.path.join(DIR, 'modele_enfant.png')).convert('RGBA')
    g = [['.'] * N for _ in range(N)]
    pal = {}
    for y in range(N):
        for x in range(N):
            p = im.getpixel((x, y))
            if p[3]:
                g[y][x] = ROLES[p[:3]]
                pal[ROLES[p[:3]]] = p[:3]
    return g, pal


# Les garçons (version 2) : assets/portraits/modele_garcon.png (cheveux châtains coiffés sur
# le côté, sourcils, t-shirt vert). Mêmes lettres, plus p le sourcil (la couleur des cheveux,
# entre clair et ombre). Ses yeux sont une rangée plus bas que ceux du modèle d'enfant : les
# détails du visage ont leur propre place (DETAILS_GARCON).
ROLES_GARCON = {
    (7, 5, 2): 'a',
    (135, 96, 44): 'b', (79, 58, 30): 'c', (67, 48, 21): 'd', (122, 85, 35): 'p',
    (240, 185, 141): 'f', (189, 107, 84): 'k',
    (41, 41, 40): 'g', (236, 236, 236): 'h', (197, 194, 194): 'i',
    (36, 52, 22): 'l', (136, 169, 108): 'm', (185, 231, 146): 'n',
}


def lire_garcon():
    im = Image.open(os.path.join(DIR, 'modele_garcon.png')).convert('RGBA')
    g = [['.'] * N for _ in range(N)]
    pal = {}
    for y in range(N):
        for x in range(N):
            p = im.getpixel((x, y))
            if p[3]:
                g[y][x] = ROLES_GARCON[p[:3]]
                pal[ROLES_GARCON[p[:3]]] = p[:3]
    return g, pal


def garcon(d):
    """Version 2 : tous les enfants partent du modèle de garçon (coupes, couvre-chefs et
    détails se posent dessus)."""
    return True


def put(g, pts, c):
    for (x, y) in pts:
        if 0 <= x < N and 0 <= y < N:
            g[y][x] = c


def contour(g):
    side = ((1, 0), (-1, 0), (0, 1), (0, -1))
    solid = lambda x, y: 0 <= x < N and 0 <= y < N and g[y][x] not in '.a'
    out = copie(g)
    for y in range(N):
        for x in range(N):
            if g[y][x] == 'a' and not any(solid(x + dx, y + dy) for dx, dy in side):
                out[y][x] = '.'
    g2 = copie(out)
    for y in range(COU):
        for x in range(N):
            if out[y][x] == '.' and any(0 <= x + dx < N and 0 <= y + dy < N and out[y + dy][x + dx] not in '.alm'
                                         for dx, dy in side):
                g2[y][x] = 'a'
    return g2


# ---------- coupes ----------

def long_(g):
    """Cheveux qui tombent sur les épaules."""
    put(g, [(2, y) for y in range(5, 13)], 'b')
    put(g, [(3, y) for y in (10, 11, 12)], 'c')
    for y in range(9, 14):
        for x in (10, 11, 12):
            g[y][x] = 'c' if x == 12 or y > 11 else 'b'
    return g


def couettes(g):
    put(g, [(1, 5), (2, 5), (1, 6), (2, 6), (1, 7)], 'b')
    put(g, [(12, 5), (13, 5), (12, 6), (13, 6), (13, 7)], 'c')
    put(g, [(2, 4), (12, 4)], 'B')                      # les élastiques
    return g


def queue(g):
    """Queue de cheval qui remonte derrière la tête."""
    put(g, [(11, 3), (12, 3), (12, 4), (13, 4), (13, 5), (13, 6), (12, 2)], 'b')
    put(g, [(11, 4)], 'B')
    return g


def chignon(g):
    put(g, [(6, 2), (7, 2), (8, 2), (7, 1)], 'b')
    put(g, [(8, 1)], 'c')
    return g


def frange(g):
    put(g, [(x, 5) for x in range(4, 9)], 'b')
    put(g, [(5, 5), (7, 5)], 'c')
    return g


def herisse(g):
    """Cheveux en épis."""
    put(g, [(5, 2), (7, 2), (9, 2), (10, 3)], 'b')
    put(g, [(x, 3) for x in range(5, 10)], 'b')
    return g


def boucles(g):
    """Cheveux bouclés, en boule."""
    put(g, [(x, 2) for x in range(5, 11)], 'b')
    put(g, [(x, 3) for x in range(4, 12)], 'b')
    put(g, [(2, y) for y in range(4, 10)], 'b')
    put(g, [(12, y) for y in range(4, 10)], 'c')
    put(g, [(11, y) for y in range(4, 10)], 'b')
    put(g, [(6, 2), (9, 2), (2, 5), (2, 8), (12, 6)], 'c')
    put(g, [(3, 4), (4, 4)], 'b')
    return g


def meche(g):
    """Une mèche sur le côté."""
    put(g, [(4, 5), (5, 5), (6, 5), (5, 4), (6, 4), (7, 4)], 'b')
    put(g, [(4, 5)], 'c')
    return g


COUPES = {'court': lambda g: g, 'long': long_, 'couettes': couettes, 'queue': queue, 'chignon': chignon,
          'frange': frange, 'herisse': herisse, 'boucles': boucles, 'meche': meche}


# ---------- couvre-chefs ----------

def casquette(g):
    for y in (2, 3, 4):
        for x in range(4, 12):
            g[y][x] = 'D' if y == 4 else 'C'
    put(g, [(x, 5) for x in range(1, 5)], 'D')          # la visière, vers le regard
    put(g, [(8, 2)], 'E')
    return g


def bonnet(g):
    for y in (1, 2, 3, 4):
        for x in range(4, 12):
            if y == 1 and not 5 <= x <= 10:
                continue
            g[y][x] = 'X' if y == 4 or (x + y) % 3 == 0 else 'W'
    put(g, [(7, 0), (8, 0)], 'E')                       # le pompon
    return g


def paille(g):
    for y in (2, 3):
        for x in range(5, 11):
            g[y][x] = 'B' if y == 3 else 'S'
    put(g, [(x, 4) for x in range(2, 14)], 'T')
    return g


def noeud(g):
    put(g, [(8, 2), (8, 3), (10, 2), (10, 3)], 'B')
    put(g, [(9, 3)], 'X')
    return g


def serre_tete(g):
    put(g, [(x, 4) for x in range(4, 11)], 'H')
    put(g, [(3, 5)], 'H')
    return g


def fleur(g):
    put(g, [(10, 2), (9, 3), (11, 3), (10, 4)], 'F')
    put(g, [(10, 3)], 'Y')
    return g


COUVRE_CHEFS = {None: lambda g: g, 'casquette': casquette, 'bonnet': bonnet, 'paille': paille,
                'noeud': noeud, 'serre_tete': serre_tete, 'fleur': fleur}


# ---------- détails ----------

def lunettes(g):
    put(g, [(3, 5), (4, 5), (6, 5), (7, 5), (5, 6), (8, 6)], 'G')
    return g


def rousseur(g):
    put(g, [(6, 8), (8, 8), (7, 9)], 'R')
    return g


def joues(g):
    put(g, [(7, 8), (8, 8)], 'K')
    return g


def pansement(g):
    put(g, [(7, 8), (8, 8)], 'Z')
    return g


def salopette(g):
    """Une salopette par-dessus le t-shirt : deux bretelles et la bavette."""
    for y in range(12, N):
        for x in range(5, 10):
            if g[y][x] in SHIRT and g[y][x] != 'l':
                g[y][x] = 'O' if y >= 13 else g[y][x]
    put(g, [(5, 11), (5, 12), (9, 11), (9, 12)], 'O')
    put(g, [(6, 13), (8, 13)], 'o')                     # les boutons
    return g


DETAILS = {'lunettes': lunettes, 'rousseur': rousseur, 'joues': joues, 'pansement': pansement, 'salopette': salopette}


# les détails du visage du garçon (ses yeux : rangée 7, colonnes 4-5 et 7-8)
def lunettes_garcon(g):
    put(g, [(4, 6), (5, 6), (7, 6), (8, 6), (3, 7), (6, 7), (9, 7)], 'G')
    return g


def rousseur_garcon(g):
    put(g, [(4, 9), (8, 9), (7, 10)], 'R')
    return g


def joues_garcon(g):
    put(g, [(7, 9), (8, 9)], 'K')
    return g


def pansement_garcon(g):
    put(g, [(7, 9), (8, 9)], 'Z')
    return g


def meche_garcon(g):
    """La mèche plus longue, qui barre le front."""
    put(g, [(4, 5), (5, 5), (6, 5), (7, 5)], 'b')
    put(g, [(3, 6)], 'b')
    return g


def frange_garcon(g):
    put(g, [(x, 5) for x in range(4, 9)], 'b')
    put(g, [(5, 5), (7, 5)], 'c')
    return g


DETAILS_GARCON = dict(DETAILS, lunettes=lunettes_garcon, rousseur=rousseur_garcon, joues=joues_garcon,
                      pansement=pansement_garcon)
COUPES_GARCON = dict(COUPES, meche=meche_garcon, frange=frange_garcon)


# ---------- motifs ----------

def motif(g, m):
    for y in range(COU, N):
        for x in range(N):
            if g[y][x] not in 'nm':
                continue
            if m == 'rayures' and y % 2 == 0:
                g[y][x] = 'm'
            elif m == 'carreaux' and (x % 3 == 0 or y % 3 == 1):
                g[y][x] = 'P'
            elif m == 'pois' and (x + 2 * y) % 4 == 0:
                g[y][x] = 'P'
    return g


# ---------- les 50 enfants ----------
# (peau, cheveux, coupe, couvre-chef, couleur de l'accessoire, détails, habit, motif)
ENFANTS = [
    ('claire', 'chatains', 'frange', None, None, '', 'vert', None),
    ('tres_claire', 'blonds', 'couettes', None, 'rose', 'rousseur', 'rose', 'pois'),
    ('mate', 'noirs', 'court', 'casquette', 'rouge', '', 'blanc', None),
    ('foncee', 'noirs', 'boucles', None, None, '', 'jaune', None),
    ('claire', 'roux', 'herisse', None, None, 'rousseur', 'jean', 'rayures'),
    ('rosee', 'blonds', 'queue', None, 'violet', 'joues', 'lilas', None),
    ('olive', 'chocolat', 'meche', None, None, 'pansement', 'kaki', None),
    ('tres_foncee', 'noirs', 'couettes', None, 'jaune', '', 'orange', 'pois'),
    ('claire', 'platine', 'court', None, None, 'lunettes', 'marine', None),
    ('mate', 'bruns', 'court', 'bonnet', 'rouge', '', 'vert', 'rayures'),
    ('tres_claire', 'auburn', 'chignon', None, None, 'joues', 'bordeaux', None),
    ('foncee', 'chocolat', 'court', 'paille', 'bleu', 'salopette', 'jaune', None),
    ('rosee', 'roses', 'couettes', 'noeud', 'blanc', '', 'ciel', 'pois'),
    ('claire', 'bruns', 'herisse', None, None, 'pansement', 'rouge', 'carreaux'),
    ('olive', 'noirs', 'long', 'serre_tete', 'rouge', '', 'turquoise', None),
    ('mate', 'roux', 'frange', None, None, 'lunettes', 'lilas', None),
    ('tres_foncee', 'chocolat', 'boucles', 'fleur', 'jaune', '', 'vert', None),
    ('claire', 'roux', 'meche', None, None, 'rousseur', 'carreaux', 'carreaux'),
    ('tres_claire', 'blonds', 'long', 'paille', 'rose', '', 'blanc', None),
    ('foncee', 'bleus', 'herisse', None, None, '', 'noir', None),
    ('rosee', 'chatains', 'queue', 'bonnet', 'vert', 'rousseur', 'jaune', None),
    ('claire', 'noirs', 'frange', 'fleur', 'rouge', '', 'rouge', None),
    ('mate', 'chatains', 'court', 'casquette', 'bleu', 'salopette', 'orange', None),
    ('olive', 'auburn', 'couettes', None, 'vert', 'joues', 'kaki', 'rayures'),
    ('tres_claire', 'chatains', 'court', None, None, 'lunettes', 'marine', 'rayures'),
    ('foncee', 'noirs', 'chignon', 'noeud', 'rose', '', 'rose', None),
    ('claire', 'chocolat', 'long', 'serre_tete', 'jaune', '', 'jean', 'pois'),
    ('mate', 'roux', 'boucles', None, None, 'rousseur', 'vert', None),
    ('tres_foncee', 'noirs', 'court', None, None, 'pansement', 'marron', None),
    ('rosee', 'platine', 'chignon', 'fleur', 'rose', '', 'ciel', None),
    ('claire', 'bruns', 'meche', 'casquette', 'vert', '', 'orange', 'rayures'),
    ('olive', 'noirs', 'queue', None, 'rouge', 'lunettes', 'bordeaux', None),
    ('foncee', 'chocolat', 'herisse', 'bonnet', 'gris', '', 'kaki', None),
    ('tres_claire', 'roux', 'couettes', None, 'vert', 'rousseur', 'vert', 'carreaux'),
    ('mate', 'verts', 'court', None, None, '', 'noir', None),
    ('claire', 'blonds', 'herisse', 'paille', 'rouge', 'salopette', 'blanc', None),
    ('tres_foncee', 'noirs', 'boucles', 'serre_tete', 'orange', '', 'turquoise', None),
    ('rosee', 'auburn', 'long', None, None, 'joues', 'rose', 'pois'),
    ('claire', 'noirs', 'court', None, None, 'lunettes', 'rouge', None),
    ('olive', 'blonds', 'couettes', 'paille', 'vert', '', 'rouge', 'carreaux'),
    ('mate', 'auburn', 'frange', 'noeud', 'violet', '', 'lilas', None),
    ('foncee', 'roux', 'long', None, None, 'rousseur', 'ciel', None),
    ('tres_claire', 'chatains', 'meche', 'casquette', 'jaune', 'lunettes', 'kaki', None),
    ('claire', 'platine', 'chignon', None, None, 'joues', 'lilas', None),
    ('mate', 'roses', 'queue', None, 'blanc', '', 'turquoise', 'rayures'),
    ('tres_foncee', 'chocolat', 'couettes', 'fleur', 'blanc', '', 'jaune', None),
    ('rosee', 'bruns', 'boucles', None, None, 'pansement', 'vert', 'pois'),
    ('olive', 'noirs', 'herisse', 'bonnet', 'bleu', '', 'jean', None),
    ('claire', 'auburn', 'long', 'paille', 'violet', 'rousseur', 'lilas', None),
    ('foncee', 'blonds', 'frange', 'serre_tete', 'rouge', 'salopette', 'blanc', 'rayures'),
]
EXTRA = {
    'G': (40, 40, 48), 'R': (204, 120, 84), 'K': (236, 140, 130), 'Z': (244, 226, 190),
    'S': (232, 196, 96), 'T': (190, 146, 56), 'E': (240, 240, 232), 'Y': (236, 200, 60),
    'O': (63, 111, 168), 'o': (236, 200, 60),
}
SPECIAL = {'carreaux': ('rouge', 'carreaux')}


def enfants():
    """Les 50 enfants : [(nom, description)]."""
    out = []
    for i, (peau, cheveux, coupe, chap, acc, details, habit, m) in enumerate(ENFANTS):
        if habit in SPECIAL:
            habit, impose = SPECIAL[habit]
            m = m or impose
        out.append((f'enfant_{i + 1:02d}', {
            'peau': peau, 'cheveux': cheveux, 'coupe': coupe, 'chapeau': chap,
            'accessoire': catalogue.ACCESSOIRES[acc or 'rouge'], 'details': [d for d in details.split(',') if d],
            'habit': habit, 'motif': m, 'bas': catalogue.BAS[i % len(catalogue.BAS)],
        }))
    return out


def portrait(base, pal0, d, garcons=None):
    """Le portrait d'un enfant ; un garçon (garcon()) part du modèle de garçon : garcons =
    (grille, palette)."""
    gar = garcons and garcon(d)
    if gar:
        base, pal0 = garcons
    g = (COUPES_GARCON if gar else COUPES)[d['coupe']](copie(base))
    g = COUVRE_CHEFS[d['chapeau']](g)
    g = motif(g, d['motif'])
    for x in d['details']:
        g = (DETAILS_GARCON if gar else DETAILS)[x](g)
    g = contour(g)
    pal = dict(pal0)
    pal.update(catalogue.PEAU[d['peau']]); pal.update(catalogue.CHEVEUX[d['cheveux']]); pal.update(catalogue.HABITS[d['habit']])
    pal.update(EXTRA)
    a = d['accessoire']
    pal.update({'B': a, 'C': a, 'D': catalogue.fonce(a), 'W': a, 'X': catalogue.fonce(a), 'H': a, 'F': a})
    pal['O'], pal['P'] = d['bas'][0], ((200, 60, 60) if d['habit'] == 'blanc' else (244, 240, 228))
    if gar:
        c = catalogue.CHEVEUX[d['cheveux']]
        pal['p'] = tuple((u + v) // 2 for u, v in zip(c['b'], c['c']))      # les sourcils
    if d['chapeau'] == 'fleur' and a in (catalogue.ACCESSOIRES['jaune'], catalogue.ACCESSOIRES['blanc']):
        pal['Y'] = (232, 120, 60)
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            if g[y][x] != '.':
                im.putpixel((x, y), pal[g[y][x]] + (255,))
    return im


def main():
    base, pal0 = lire_modele()
    garcons = lire_garcon()
    images = []
    for nom, d in enfants():
        im = portrait(base, pal0, d, garcons)
        im.save(os.path.join(DIR, f'{nom}.png'))
        images.append(im)
    print(f'assets/portraits : {len(images)} portraits d\'enfants dérivés du modèle')
    if '--apercu' in sys.argv:
        S, M, LAB, cols = 7, 10, 18, 10
        rows = (len(images) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (N * S + M) + M, rows * (N * S + M + LAB) + M), (230, 214, 180, 255))
        d = ImageDraw.Draw(sheet)
        for i, im in enumerate(images):
            x = M + (i % cols) * (N * S + M)
            y = M + (i // cols) * (N * S + M + LAB)
            sheet.alpha_composite(im.resize((N * S, N * S), Image.NEAREST), (x, y + LAB))
            d.text((x + 2, y + 2), str(i + 1), fill=(60, 30, 10, 255))
        sheet.save(os.path.join(ROOT, 'apercu_enfants.png'))


if __name__ == '__main__':
    main()
