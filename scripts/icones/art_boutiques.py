# Icônes du lot « boutiques » : ce qu'on achète dans les commerces de la ville
# (docs/plan-ville.md, étape 5b ; VILLE.BOUTIQUES, data/ville.json).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
#
# Chaque dessin donne l'intérieur de l'objet ; contour() l'entoure d'un trait de 1 px sombre
# (comme scripts/icones/art_cuisine.py).
import math

PALETTE = {
    'K': '#2a1a12',                                                   # contour
    # croûte, pâte, pain
    'b': '#8a4a1a', 'c': '#b8702a', 'C': '#d8963e', 'L': '#f0c070', 'm': '#f8e4b0',
    # tomate, sauce, ketchup
    'r': '#b8434a', 'R': '#e0605a',
    # fromage
    'j': '#f8d860', 'n': '#fff2b0',
    # basilic, salade
    'g': '#2f6e2c', 'l': '#4a9a3a', 'M': '#8cd06a',
    # steak
    '6': '#5a2a14', '7': '#7a3a1c',
    # frites, cornet
    'y': '#f2c040', 'Y': '#fbe38a', 'h': '#c8303a', 'H': '#e85a5a', 'w': '#ffffff',
    # ordinateur
    'I': '#1c1d26', '2': '#4f5364', '3': '#6f7488', '4': '#9aa0b4', 'd': '#2a70b0', 'u': '#4aa0e0', 'v': '#c4e8ff',
}


def contour(rows):
    """Entoure d'un trait 'K' tout ce qui est dessiné (les cases vides voisines d'une case
    pleine, en croix)."""
    g = [list(r) for r in rows]
    H, W = len(g), len(g[0])
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.':
                continue
            if any(0 <= y + dy < H and 0 <= x + dx < W and g[y + dy][x + dx] not in '.K' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = 'K'
    return [''.join(r) for r in out]


ICONS = {}


def _croissant():
    """Le croissant : un arc doré, ses côtes."""
    g = [['.'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, (y - 10.5) * 1.25
            d = math.hypot(dx, dy)
            if 3.2 <= d <= 7.2 and y <= 12:
                lum = -(dx * 0.4 + (y - 6))
                ang = math.atan2(dy, dx)
                cote = int((ang + math.pi) * 5) % 3 == 0
                g[y][x] = 'b' if cote else ('L' if lum > 2 else 'C' if lum > -2 else 'c')
    return [''.join(r) for r in g]


ICONS['🥐'] = contour(_croissant())


def _pizza():
    """Une part de pizza : la croûte en haut, le fromage, deux rondelles de tomate, du
    basilic."""
    g = [['.'] * 16 for _ in range(16)]
    for y in range(1, 15):
        half = (15 - y) * 6 // 14
        for x in range(7 - half, 8 + half + 1):
            if y <= 2:
                g[y][x] = 'C' if y == 1 else 'c'
            else:
                g[y][x] = 'n' if (x + y) % 4 == 0 else 'j'
    for cx, cy in ((5, 5), (9, 7), (7, 10)):
        for y in range(cy - 1, cy + 1):
            for x in range(cx - 1, cx + 1):
                if g[y][x] != '.':
                    g[y][x] = 'R' if (x, y) == (cx - 1, cy - 1) else 'r'
    for x, y in ((8, 4), (6, 8)):
        g[y][x] = 'l'
    return [''.join(r) for r in g]


ICONS['🍕'] = contour(_pizza())


def _burger():
    """Le burger : le pain du dessus et ses graines, la salade, le fromage, le steak, le pain
    du dessous."""
    rows = [
        '................',
        '................',
        '.....LLLLLL.....',
        '...LLmLLLLmLL...',
        '..LLLLLLmLLLLL..',
        '..CCCCCCCCCCCC..',
        '.lMlMlMlMlMlMlM.',
        '..jjjjjjjjjjjj..',
        '..j77777777777j.',
        '..666666666666..',
        '..677777777776..',
        '..666666666666..',
        '..cccccccccccc..',
        '...bbbbbbbbbb...',
        '................',
        '................',
    ]
    return rows


ICONS['🍔'] = contour(_burger())


def _frites():
    """Un cornet de frites : les frites dorées qui dépassent, le cornet rouge et blanc."""
    rows = [
        '................',
        '.....Y..Y.......',
        '....yY.yY.Y.....',
        '....yy.yyyY.Y...',
        '...YyyYyyyyyY...',
        '...yyyyyyyyyy...',
        '...hHhhhhhhHh...',
        '...hHwwwwwwHh...',
        '...hHhhhhhhHh...',
        '....hHhhhhHh....',
        '....hHhhhhHh....',
        '....hHwwwwHh....',
        '.....hHhhHh.....',
        '.....hhhhhh.....',
        '................',
        '................',
    ]
    return rows


ICONS['🍟'] = contour(_frites())


def _ordinateur():
    """L'ordinateur portable : l'écran bleu et son reflet, le clavier."""
    rows = [
        '................',
        '................',
        '..22222222222...',
        '..2ddddddddd2...',
        '..2duuvdddud2...',
        '..2duvddddud2...',
        '..2dvddddudd2...',
        '..2ddddduddd2...',
        '..2ddddddddd2...',
        '..22222222222...',
        '.3444444444443..',
        '.4343434343434..',
        '.4434343434344..',
        '.3333333333333..',
        '................',
        '................',
    ]
    return rows


ICONS['💻'] = contour(_ordinateur())
