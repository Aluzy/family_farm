# Lot « gens et horloges » : portraits de la famille (4 × 6 teints), la famille,
# visages (humeur, sommeil, maladie), main qui salue, les 12 horloges.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
from PIL import Image

ZWJ = '‍'
TEINTS = ['', '\U0001F3FB', '\U0001F3FC', '\U0001F3FD', '\U0001F3FE', '\U0001F3FF']

# --- Teints de peau : k contour, S clair, s moyen, z ombre, p joues, e yeux, m bouche
PEAUX = [
    # '' : clair-moyen chaleureux (pas le jaune des emojis)
    {'k': '#5a2e1a', 'S': '#f8cfa4', 's': '#e8a878', 'z': '#c07e52', 'p': '#e88a70', 'e': '#2a1810', 'm': '#a04a3a'},
    # 🏻
    {'k': '#6a3a2a', 'S': '#fde6d4', 's': '#f4c8ac', 'z': '#d89c80', 'p': '#f0a090', 'e': '#2a1810', 'm': '#b0505a'},
    # 🏼
    {'k': '#5a3420', 'S': '#f2d0a0', 's': '#deb07c', 'z': '#b88654', 'p': '#e09070', 'e': '#2a1810', 'm': '#a04a3a'},
    # 🏽
    {'k': '#46240e', 'S': '#d8a070', 's': '#bc8250', 'z': '#925c32', 'p': '#c06a50', 'e': '#1e0e06', 'm': '#7a3424'},
    # 🏾
    {'k': '#2e1608', 'S': '#a86e46', 's': '#8a5432', 'z': '#663c20', 'p': '#9a4e3a', 'e': '#140804', 'm': '#4a1c14'},
    # 🏿
    {'k': '#1e0e06', 'S': '#7a4c2e', 's': '#5e3820', 'z': '#432614', 'p': '#74362a', 'e': '#0e0604', 'm': '#2e100c'},
]

# --- Cheveux : K contour, h moyen, H reflet. Par personnage, puis plus foncés aux teints 🏽+.
CHEVEUX = {
    'femme':  {'K': '#3a1a0c', 'h': '#8a4a24', 'H': '#b8703a'},
    'homme':  {'K': '#2a160a', 'h': '#5a3418', 'H': '#7e4e2a'},
    'fille':  {'K': '#4a2008', 'h': '#c0662a', 'H': '#e8964a'},
    'garcon': {'K': '#3a2410', 'h': '#9a6a30', 'H': '#c8984e'},
}
CHEVEUX_FONCES = [
    None, None, None,
    {'K': '#1e0e06', 'h': '#3e2412', 'H': '#62402a'},   # 🏽
    {'K': '#120804', 'h': '#2a1a10', 'H': '#4a3222'},   # 🏾
    {'K': '#0c0604', 'h': '#221610', 'H': '#40302a'},   # 🏿
]

# --- Vêtements : D contour, c clair, C moyen, d ombre ; r/R ruban de la fille
HABITS = {
    'femme':  {'D': '#4a1418', 'c': '#e2707a', 'C': '#b8434a', 'd': '#8a2a32'},
    'homme':  {'D': '#163a5c', 'c': '#7cc0f0', 'C': '#4aa0e0', 'd': '#2a70b0'},
    'fille':  {'D': '#5a2a08', 'c': '#ffe48a', 'C': '#f2c040', 'd': '#c7862a', 'r': '#e04a6a', 'R': '#8a1a34'},
    'garcon': {'D': '#1f4a22', 'c': '#8cd06a', 'C': '#4a9a3a', 'd': '#2f6e2c'},
}

PORTRAITS = {}
PORTRAITS['femme'] = [  # 👩 cheveux longs jusqu'aux épaules, joues roses, haut rouge
    '................',
    '.....KKKKKK.....',
    '....KHHhhhhK....',
    '...KHHhhhhhhK...',
    '...KHhSSShhhK...',
    '..KHhSSsssshhK..',
    '..KHhSeSseshhK..',
    '..KhhpSssszhhK..',
    '..KhhsSmmszhhK..',
    '..KhhkssszkhhK..',
    '..KhhhkszkhhhK..',
    '.KhhDDkzzkDDhhK.',
    '.KhhcccsscCCdhK.',
    '.DKhccCCCCCChKD.',
    '.DcKcCCCCCCCKdD.',
    '.DcCCCCCCCCCCdD.',
]
PORTRAITS['homme'] = [  # 👨 cheveux courts, barbe, chemise bleue
    '................',
    '....KKKKKKKK....',
    '...KHHHhhhhhK...',
    '...KHhhhhhhhK...',
    '...KhSSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kSSsssszzk...',
    '...KhhsmmshhK...',
    '...KhhhhhhhhK...',
    '....KKhhhhKK....',
    '.DDDDkKKKKkDDDD.',
    'DccccDkzzkDCCCdD',
    'DcCCCCDkkDCCCCdD',
    'DcCCCCCDDCCCCCdD',
    'DcCCCCCCCCCCCddD',
]
PORTRAITS['fille'] = [  # 👧 couettes avec rubans, grosse tête, petit corps
    '................',
    '................',
    '.....KKKKKK.....',
    '....KHHhhhhK....',
    '.RrKHHhhhhhhKrR.',
    'KhrKHhhSShhhKrhK',
    'KHhKhSSsssshKhhK',
    'KhhKhSeSseshKhhK',
    'KhhKkpSssszpkhhK',
    '.KhK.kSmmszk.KhK',
    '.KK...kkkkk..KK.',
    '.......kzk......',
    '.....DDDDDDD....',
    '....DcccCCCdD...',
    '...DccCCCCCCdD..',
    '...DcCCCCCCCdD..',
]
PORTRAITS['garcon'] = [  # 👦 cheveux courts en épi, petite taille, tee-shirt vert
    '................',
    '................',
    '.......KK.......',
    '.....KKHhKK.....',
    '....KHHhhhhK....',
    '...KHHhhhhhhK...',
    '...KHhSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kpSssssszp...',
    '....kSsmmszk....',
    '.....kkzzkk.....',
    '....DDkzzkDD....',
    '...DccDkkDCCD...',
    '..DccCCCCCCCdD..',
    '..DcCCCCCCCCdD..',
]

EMOJI_PORTRAIT = {'femme': '\U0001F469', 'homme': '\U0001F468', 'fille': '\U0001F467', 'garcon': '\U0001F466'}

# --- Version 1.12 : la planche d'avatars. Quatre coiffures par personnage (femme, homme,
# fille, garçon), soit 8 avatars d'adultes et 8 d'enfants, chacun dans les 6 teints.
# Coiffure 0 : le portrait ci-dessus ; 1 : roux ; 2 : frisé ; 3 : cheveux gris et lunettes
# (adultes) ou casquette (enfants). L'emoji de l'icône : portrait + teint + ZWJ + COIFFURES[n]
# (les composants de cheveux des emojis, 🧢 pour la casquette) ; data/general.json
# (FAMILY.PROFIL.STYLES) en garde la liste.
COIFFURES = {
    'adulte': ['', '\U0001F9B0', '\U0001F9B1', '\U0001F9B3'],
    'enfant': ['', '\U0001F9B0', '\U0001F9B1', '\U0001F9E2'],
}
VARIANTES = {}
# ---------------- FEMME ----------------
# 1 : rousse, cheveux longs, haut vert (même coupe que la base)
# 2 : frisée, gros volume
VARIANTES[('femme', 2)] = [
    '..KK.KKKKKK.KK..',
    '.KHhKHhHHhhKhhK.',
    'KHhhhHhhhhhhHhhK',
    'KhHhHhhhhhhhhHhK',
    'KhhHhhSSShhhhhhK',
    'KhHhhSSsssshhHhK',
    'KhhhhSeSseshhhhK',
    'KhHhhpSssszhhHhK',
    'KhhhhsSmmszhhhhK',
    '.KhHhkssszkhHhK.',
    '.KhhhhkszkhhhhK.',
    '..KKDDkzzkDDKK..',
    '.DDccccsscCCCdD.',
    '.DcccCCCCCCCCdD.',
    '.DcCCCCCCCCCCdD.',
    '.DcCCCCCCCCCCdD.',
]
# 3 : cheveux gris en chignon, lunettes, gilet violet
VARIANTES[('femme', 3)] = [
    '......KKKK......',
    '.....KHHhhK.....',
    '....KKHhhhKK....',
    '...KHHhhhhhhK...',
    '...KHhSSShhhK...',
    '...KhSSsssshK...',
    '...GGGGsGGGGk...',
    '...kGeGssGeGk...',
    '...kpSGmmGzpk...',
    '....kSssszk.....',
    '.....kszk.......',
    '...DDkzzkDD.....',
    '..DccsssccCdD...',
    '.DccCCCCCCCCdD..',
    '.DcCCCCCCCCCCdD.',
    '.DcCCCCCCCCCCdD.',
]
# ---------------- HOMME ----------------
# 1 : roux, sans barbe, chemise verte
VARIANTES[('homme', 1)] = [
    '................',
    '....KKKKKKKK....',
    '...KHHHhhhhhK...',
    '...KHhhhhhhhK...',
    '...KhSSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kpSssssszp...',
    '...kSSsmmszzk...',
    '....kSssssszk...',
    '.....kkzzkk.....',
    '.DDDDkzzzzkDDDD.',
    'DccccDkzzkDCCCdD',
    'DcCCCCDkkDCCCCdD',
    'DcCCCCCDDCCCCCdD',
    'DcCCCCCCCCCCCddD',
]
# 2 : frisé, tee-shirt orange
VARIANTES[('homme', 2)] = [
    '...KK.KKKK.KK...',
    '..KHhKHhhHKhhK..',
    '..KhHhhhhhhhHK..',
    '..KHhhhhhhhhhK..',
    '...KhSSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kpSssssszp...',
    '...kSSsmmszzk...',
    '....kSssssszk...',
    '.....kkzzkk.....',
    '.DDDDkzzzzkDDDD.',
    'DccccDkzzkDCCCdD',
    'DcCCCCDDDDCCCCdD',
    'DcCCCCCCCCCCCCdD',
    'DcCCCCCCCCCCCddD',
]
# 3 : cheveux gris, lunettes, moustache, veste marron
VARIANTES[('homme', 3)] = [
    '................',
    '....KKKKKKKK....',
    '...KHHhhhhhhK...',
    '...KHh....hhK...',
    '...KhSSSSSShK...',
    '...kSSSssssSk...',
    '...GGGGsGGGGk...',
    '...kGeGssGeGk...',
    '...kSGhhhhGzk...',
    '....kSsmmszk....',
    '.....kkzzkk.....',
    '.DDDDkzzzzkDDDD.',
    'DccccDkwwkDCCCdD',
    'DcCCCCDwwDCCCCdD',
    'DcCCCCCDDCCCCCdD',
    'DcCCCCCCCCCCCddD',
]
# ---------------- FILLE ----------------
# 1 : rousse à couettes (même dessin, autres couleurs)
# 2 : frisée
VARIANTES[('fille', 2)] = [
    '................',
    '...KK.KKKK.KK...',
    '..KHhKHhhhKhhK..',
    '.KHhhhhhhhhhhHK.',
    '.KhHhhhhhhhhhhK.',
    'KhhHhhSShhhHhhhK',
    'KhHhhSSsssshhHhK',
    'KhhhhSeSseshhhhK',
    '.KhHkpSssszpkHK.',
    '.KhhK.kSmmszkhK.',
    '..KK...kkkkk.K..',
    '.......kzk......',
    '.....DDDDDDD....',
    '....DcccCCCdD...',
    '...DccCCCCCCdD..',
    '...DcCCCCCCCdD..',
]
# 3 : casquette (Q visière, q ombre), cheveux longs dessous
VARIANTES[('fille', 3)] = [
    '................',
    '................',
    '.....QQQQQQ.....',
    '....QqQQQQQQ....',
    '...QQQQQQQQQQQq.',
    '...KHhhSShhhK...',
    '..KHhSSsssshK...',
    '..KhhSeSseshK...',
    '..KhhpSssszpK...',
    '..Khh.kSmmszk...',
    '..Khh..kkkkk....',
    '...KK..kzk......',
    '.....DDDDDDD....',
    '....DcccCCCdD...',
    '...DccCCCCCCdD..',
    '...DcCCCCCCCdD..',
]
# ---------------- GARÇON ----------------
# 1 : roux (même dessin)
# 2 : frisé
VARIANTES[('garcon', 2)] = [
    '................',
    '................',
    '....KK.KK.KK....',
    '...KHhKHhKhhK...',
    '..KHhhhhhhhhHK..',
    '..KhHhhhhhhhhK..',
    '...KHhSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kpSssssszp...',
    '....kSsmmszk....',
    '.....kkzzkk.....',
    '....DDkzzkDD....',
    '...DccDkkDCCD...',
    '..DccCCCCCCCdD..',
    '..DcCCCCCCCCdD..',
]
# 3 : casquette rouge
VARIANTES[('garcon', 3)] = [
    '................',
    '................',
    '.....QQQQQQ.....',
    '....QqQQQQQQ....',
    '...QQQQQQQQQQQq.',
    '...KHhSShhhhK...',
    '...kSSSssssSk...',
    '...kSeSsseszk...',
    '...kpSssssszp...',
    '....kSsmmszk....',
    '.....kkzzkk.....',
    '......kzk.......',
    '....DDkzzkDD....',
    '...DccDkkDCCD...',
    '..DccCCCCCCCdD..',
    '..DcCCCCCCCCdD..',
]

# Une grille absente : le dessin de la coiffure 0, avec les couleurs de la coiffure.
CHEVEUX_ROUX = {'K': '#5a1a08', 'h': '#c0481c', 'H': '#e87a3a'}
CHEVEUX_FRISES = {'K': '#140a04', 'h': '#2e1a0e', 'H': '#4e3220'}
CHEVEUX_GRIS = {'K': '#4a4a52', 'h': '#a4a4ac', 'H': '#dcdce4'}
# Vêtements (et lunettes G, col w, casquette Q/q) de chaque coiffure
HABITS_VARIANTES = {
    ('femme', 1): {'D': '#14402a', 'c': '#7ad09a', 'C': '#3a9a5e', 'd': '#246a40'},
    ('femme', 2): {'D': '#5a3a08', 'c': '#ffe07a', 'C': '#f0b030', 'd': '#b87a1a'},
    ('femme', 3): {'D': '#3a1a4a', 'c': '#c89ae0', 'C': '#8a5ab0', 'd': '#5e3a80', 'G': '#2a2a30'},
    ('homme', 1): {'D': '#1f4a22', 'c': '#8cd06a', 'C': '#4a9a3a', 'd': '#2f6e2c'},
    ('homme', 2): {'D': '#5a2a08', 'c': '#ffb070', 'C': '#f07a30', 'd': '#b84a14'},
    ('homme', 3): {'D': '#3a2410', 'c': '#c89a6a', 'C': '#8a5e34', 'd': '#5e3e20', 'G': '#2a2a30', 'w': '#f4f4f4'},
    ('fille', 1): {'D': '#0e3e46', 'c': '#7ad8e0', 'C': '#2aa8b8', 'd': '#1a7480', 'r': '#f0d040', 'R': '#9a7a10'},
    ('fille', 2): {'D': '#3a1a4a', 'c': '#e0a8f0', 'C': '#a860c8', 'd': '#743a90', 'r': '#e04a6a', 'R': '#8a1a34'},
    ('fille', 3): {'D': '#5a2a08', 'c': '#ffe48a', 'C': '#f2c040', 'd': '#c7862a', 'Q': '#3a7ad8', 'q': '#1a4a9a'},
    ('garcon', 1): {'D': '#5a2a08', 'c': '#ffb070', 'C': '#f07a30', 'd': '#b84a14'},
    ('garcon', 2): {'D': '#163a5c', 'c': '#7cc0f0', 'C': '#4aa0e0', 'd': '#2a70b0'},
    ('garcon', 3): {'D': '#1f4a22', 'c': '#8cd06a', 'C': '#4a9a3a', 'd': '#2f6e2c', 'Q': '#d83a3a', 'q': '#8a1a1a'},
}


def coiffure_cheveux(nom, style, t):
    if style == 1:
        return CHEVEUX_ROUX
    if style == 2:
        return CHEVEUX_FRISES
    if style == 3 and nom in ('femme', 'homme'):
        return CHEVEUX_GRIS
    return CHEVEUX_FONCES[t] or CHEVEUX[nom]


def avatar(nom, style, t):
    if style == 0:
        return portrait(nom, t)
    pal = {}
    pal.update(PEAUX[t])
    pal.update(coiffure_cheveux(nom, style, t))
    pal.update(HABITS[nom])
    pal.update(HABITS_VARIANTES[(nom, style)])
    return render(VARIANTES.get((nom, style), PORTRAITS[nom]), pal)


# --- Visages ronds (jaune doré, contour brun) et horloges
PALETTE = {
    'K': '#3a2414', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a', 'O': '#8a5418',
    'e': '#3a2414', 'm': '#6e2a1a', 'r': '#e86a5a', 'b': '#4aa0e0', 'B': '#c4e8ff', 'q': '#163a5c',
    'w': '#ffffff', 'W': '#c8d0dc', 'g': '#5a6270', 'R': '#d83a3a', 'f': '#f2a048',
}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def render(rows, pal):
    assert len(rows) == 16, rows
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        assert len(row) == 16, (y, row)
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), rgb(pal[ch]))
    return im


def overlay(base, rows):
    """Superpose une grille de lettres ('.' = garder) sur une grille de base."""
    out = []
    for b, r in zip(base, rows):
        assert len(r) == 16, r
        out.append(''.join(bc if rc == '.' else rc for bc, rc in zip(b, r)))
    return out


def portrait(nom, t):
    pal = {}
    pal.update(PEAUX[t])
    pal.update(CHEVEUX_FONCES[t] or CHEVEUX[nom])
    pal.update(HABITS[nom])
    return render(PORTRAITS[nom], pal)


# Visage rond : disque de 16 px avec reflet haut-gauche et ombre bas-droite
DISQUE = [
    '.....KKKKKK.....',
    '...KKYYYyyyKK...',
    '..KYYyyyyyyyyK..',
    '.KYYyyyyyyyyyoK.',
    '.KYyyyyyyyyyyoK.',
    'KYyyyyyyyyyyyyoK',
    'KYyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyooK',
    'KyyyyyyyyyyyyooK',
    '.KyyyyyyyyyyyoK.',
    '.KoyyyyyyyyyooK.',
    '..KooyyyyyyooK..',
    '...KKooooooKK...',
    '.....KKKKKK.....',
]
ICONS = {}
ICONS['🙂'] = overlay(DISQUE, [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....e....e.....',
    '.....e....e.....',
    '................',
    '................',
    '...r........r...',
    '....m......m....',
    '.....mmmmmm.....',
    '................',
    '................',
    '................',
    '................',
])
def trace(base, pixels, contour, dirs=((1, 0), (-1, 0), (0, 1), (0, -1))):
    """Pose des pixels {(x, y): lettre} sur une grille, entourés d'un contour de 1 px."""
    g = [list(r) for r in base]
    for (x, y) in pixels:
        for dx, dy in dirs:
            u, v = x + dx, y + dy
            if 0 <= u < 16 and 0 <= v < 16 and (u, v) not in pixels:
                g[v][u] = contour
    for (x, y), ch in pixels.items():
        g[y][x] = ch
    return [''.join(r) for r in g]


SOMMEIL = overlay(DISQUE, [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...e......e.....',
    '....eee..eee....',
    '................',
    '................',
    '......mmm.......',
    '.....mOOOm......',
    '......mmm.......',
    '................',
    '................',
])
# un « Z » clair avec une ombre portée bleu nuit (à droite et en bas)
Z = {(10, 0): 'B', (11, 0): 'B', (12, 0): 'B', (13, 0): 'B', (12, 1): 'B', (11, 2): 'B',
     (10, 3): 'B', (11, 3): 'B', (12, 3): 'B', (13, 3): 'B'}
ICONS['😴'] = trace(SOMMEIL, Z, 'q', ((1, 0), (0, 1), (1, 1)))

FIEVRE = overlay(DISQUE, [
    '................',
    '................',
    '................',
    '................',
    '................',
    '....ee....ee....',
    '................',
    '...rr......rr...',
    '................',
    '................',
    '................',
    '....mmm.........',
    '...mOOOm........',
    '....mmm.........',
    '................',
    '................',
])
THERMO = {(7, 12): 'R', (8, 12): 'R', (8, 11): 'R', (9, 11): 'R'}
for i in range(5):
    THERMO[(9 + i, 10 - i)] = 'w'
    THERMO[(10 + i, 10 - i)] = 'W'
THERMO[(9, 10)] = 'R'
ICONS['🤒'] = trace(FIEVRE, THERMO, 'g')


# 👋 main ouverte (teint par défaut) : quatre doigts de 2 px, pouce à gauche, contour calculé
def main_grille():
    g = [['.'] * 16 for _ in range(16)]
    doigts = [(4, 2), (7, 1), (10, 2), (13, 4)]  # (colonne gauche, rangée du bout)
    for x, top in doigts:
        for y in range(top, 10):
            g[y][x] = 'S'
            g[y][x + 1] = 's'
    for y in range(9, 14):
        for x in range(4, 15):
            g[y][x] = 's'
    for x, y in [(4, 14), (5, 14), (6, 14), (7, 14), (8, 14), (9, 14), (10, 14), (11, 14), (12, 14), (13, 14)]:
        g[y][x] = 's'
    for x, y in [(1, 7), (2, 7), (1, 8), (2, 8), (3, 8), (2, 9), (3, 9), (3, 10), (3, 11), (3, 12)]:
        g[y][x] = 'S'
    g[14][4] = '.'
    g[14][13] = '.'
    # lumière : paume claire en haut à gauche, ombre en bas à droite
    for x, y in [(4, 9), (5, 9), (6, 9), (4, 10), (5, 10), (4, 11), (8, 9), (7, 9), (10, 9), (11, 9)]:
        g[y][x] = 'S'
    for x, y in [(14, 10), (14, 11), (14, 12), (13, 12), (13, 13), (12, 13), (12, 14), (11, 14), (10, 14), (14, 13)]:
        if g[y][x] != '.':
            g[y][x] = 'z'
    for x, top in doigts:
        g[top][x + 1] = 'S' if x != 13 else 's'
    filled = {(x, y) for y in range(16) for x in range(16) if g[y][x] != '.'}
    for y in range(16):
        for x in range(16):
            if g[y][x] == '.' and any((x + dx, y + dy) in filled for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                g[y][x] = 'k'
    return [''.join(r) for r in g]


MAIN = main_grille()


# --- Famille : deux grandes têtes derrière, deux petites devant (teint par défaut)
FAM_PAL = dict(PEAUX[0])
FAM_PAL.update({
    'K': '#2e1a10',
    'a': '#7e4e2a', 'A': '#5a3418',          # papa : cheveux et barbe
    'b': '#b8703a', 'B': '#8a4a24',          # maman : cheveux longs
    'n': '#c8984e', 'N': '#9a6a30',          # garçon
    'g': '#e8964a', 'G': '#c0662a',          # fille
    'r': '#e04a6a', 'R': '#8a1a34',          # nœud
    'u': '#7cc0f0', 'U': '#4aa0e0', 'D': '#163a5c',
    'v': '#e2707a', 'V': '#b8434a', 'W': '#4a1418',
    'l': '#8cd06a', 'L': '#4a9a3a', 'E': '#1f4a22',
    'y': '#ffe48a', 'Y': '#f2c040', 'F': '#5a2a08',
})
FAM_PAPA = [  # colonnes 0-7, rangées 0-15
    '.KKKKKK.',
    'KaaAAAAK',
    'KaSSSSAK',
    'kSeSSezk',
    'kSSsszzk',
    'KAAmmAAK',
    '.KAAAAK.',
    'DuuUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
    'DuUUUUUD',
]
FAM_MAMAN = [  # colonnes 8-15
    '.KKKKKK.',
    'KbbBBBBK',
    'BbSSSBBB',
    'BSeSSezB',
    'BSpssszB',
    'BBSmmzBB',
    'BBkkkkBB',
    'BBvVVVBB',
    'WBvVVVBB',
    'WvVVVVVB',
    'WvVVVVVW',
    'WvVVVVVW',
    'WvVVVVVW',
    'WvVVVVVW',
    'WvVVVVVW',
    'WvVVVVVW',
]
FAM_GARCON = [  # colonnes 1-7, à partir de la rangée 7
    '.KKKKK.',
    'KnnNNNK',
    'kSeSezk',
    'kSsmszk',
    '.kkkkk.',
    'ElLLLLE',
    'ElLLLLE',
    'ElLLLLE',
    'ElLLLLE',
]
FAM_FILLE = [  # colonnes 8-14, à partir de la rangée 6
    '....rR.',
    '.KKKRK.',
    'KggGGGK',
    'kSeSezk',
    'kSsmszk',
    '.kkkkk.',
    'FyYYYYF',
    'FyYYYYF',
    'FyYYYYF',
    'FyYYYYF',
]


def famille():
    g = [['.'] * 16 for _ in range(16)]
    for x0, y0, rows in ((0, 0, FAM_PAPA), (8, 0, FAM_MAMAN), (1, 7, FAM_GARCON), (8, 6, FAM_FILLE)):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    g[y0 + y][x0 + x] = ch
    return render([''.join(r) for r in g], FAM_PAL)


# --- Horloges
CADRAN = {'K': '#3a2a1e', 'w': '#fdf6e4', 'W': '#e6d6b2', 't': '#b09a74', 'a': '#2a1e18', 'A': '#8a5a34', 'x': '#b8434a'}
CADRAN_GRILLE = [
    '................',
    '.....KKKKK......',
    '...KKwwwwwKK....',
    '..KwwwwtwwwWK...',
    '.KwwwwwwwwwwWK..',
    '.KwwwwwwwwwwWK..',
    'KwwwwwwwwwwwwWK.',
    'KwwwwwwwwwwwwWK.',
    'KwtwwwwwwwwwtWK.',
    'KwwwwwwwwwwwwWK.',
    'KwwwwwwwwwwwWWK.',
    '.KwwwwwwwwwwWK..',
    '.KWwwwwwwwwWWK..',
    '..KWWwwtwwWWK...',
    '...KKWWWWWKK....',
    '.....KKKKK......',
]
CENTRE = (7, 8)
# petite aiguille : pixels relatifs au centre, choisis à la main pour chaque heure
HEURE = {
    12: [(0, -1), (0, -2), (0, -3)],
    1: [(1, -1), (2, -2), (2, -3)],
    2: [(1, -1), (2, -1), (3, -2)],
    3: [(1, 0), (2, 0), (3, 0)],
    4: [(1, 1), (2, 1), (3, 2)],
    5: [(1, 1), (1, 2), (2, 3)],
    6: [(0, 1), (0, 2), (0, 3)],
    7: [(-1, 1), (-1, 2), (-2, 3)],
    8: [(-1, 1), (-2, 1), (-3, 2)],
    9: [(-1, 0), (-2, 0), (-3, 0)],
    10: [(-1, -1), (-2, -1), (-3, -2)],
    11: [(-1, -1), (-2, -2), (-2, -3)],
}


def horloge(h):
    im = render(CADRAN_GRILLE, CADRAN)
    cx, cy = CENTRE
    for dy in range(1, 6):  # grande aiguille vers le haut
        im.putpixel((cx, cy - dy), rgb(CADRAN['A']))
    for dx, dy in HEURE[h]:
        im.putpixel((cx + dx, cy + dy), rgb(CADRAN['a']))
    im.putpixel((cx, cy), rgb(CADRAN['x']))
    return im


def icons():
    out = {}
    for nom in ('femme', 'homme', 'fille', 'garcon'):
        age = 'enfant' if nom in ('fille', 'garcon') else 'adulte'
        for t, mod in enumerate(TEINTS):
            for style, comp in enumerate(COIFFURES[age]):
                out[EMOJI_PORTRAIT[nom] + mod + (ZWJ + comp if comp else '')] = avatar(nom, style, t)
    out['\U0001F468' + ZWJ + '\U0001F469' + ZWJ + '\U0001F467' + ZWJ + '\U0001F466'] = famille()
    out['👋'] = render(MAIN, PEAUX[0])
    for i in range(12):
        out[chr(0x1F550 + i)] = horloge(i + 1)
    return out
