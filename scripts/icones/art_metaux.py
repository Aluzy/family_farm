# Lot « métaux » : les minerais de la grotte (fer, cuivre, or, platine : un bloc de roche semé
# de pépites), les lingots qu'on en fond au Four, et la lampe de mineur (arbre des
# technologies, branche Outils). Format commun : voir scripts/icones/build.py.
PALETTE = {
    # la roche et les contours
    'k': '#2a2622', 's': '#5e5954', 'g': '#8a8580', 'G': '#b0aba4',
}
# les métaux : (sombre, moyen, clair) ; le minerai de fer est rouille (hématite)
METAUX = {
    'fer': ('#5a5e66', '#9aa0aa', '#d4d8de'),
    'cuivre': ('#7a3a1a', '#c8682e', '#f0a46a'),
    'or': ('#9a6a10', '#e8b830', '#fbe58a'),
    'platine': ('#7c8696', '#c8d2de', '#f4f8fc'),
}
MINERAI_FER = ('#6a3a28', '#a8644a', '#d29a7a')
# emoji de chaque objet (data/items.json)
EMOJI = {
    'fer': ('🪨‍🔩', '🧈‍🔩'),
    'cuivre': ('🪨‍🟠', '🧈‍🟠'),
    'or': ('🪨‍🟡', '🧈‍🟡'),
    'platine': ('🪨‍⚪', '🧈‍⚪'),
}

# un bloc de roche, éclairé en haut à gauche ; d / m / M : les pépites (sombre, moyen, clair)
ROCHE = [
    '................',
    '................',
    '................',
    '......kkkkk.....',
    '....kkGGGgGkk...',
    '...kGGGgggMmgk..',
    '..kGGMmgggggggk.',
    '..kGgmdggGgggsk.',
    '.kGggggggmMggsk.',
    '.kggggMmggmdgssk',
    '.kgggmmdggggsssk',
    '.kggggggggMmsssk',
    '..ksgggssgmdssk.',
    '...kkssssssskk..',
    '.....kkkkkkk....',
    '................',
]
# un lingot vu de dessus à 45° : le dessus (M), la face avant (m), le côté droit (d)
LINGOT = [
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkkkk...',
    '....kMMMMMMMMk..',
    '...kMMwMMMMMMdk.',
    '..kMMMMMMMMMMddk',
    '.kkkkkkkkkkkkddk',
    '.kmmmmmmmmmmkddk',
    '.kmmmmmmmmmmkdk.',
    '.kmmmmmmmmmmkk..',
    '.kkkkkkkkkkkk...',
    '................',
    '................',
    '................',
]


def _lettres(grille, couleurs):
    """Remplace d / m / M par des lettres propres à chaque métal (la palette est commune)."""
    return [''.join(couleurs.get(ch, ch) for ch in row) for row in grille]


ICONS = {}
for i, (metal, (sombre, moyen, clair)) in enumerate(METAUX.items()):
    a, b, c = 'abcd'[i] * 1, 'efhi'[i], 'jlno'[i]
    PALETTE[a], PALETTE[b], PALETTE[c] = sombre, moyen, clair
    ma, mb, mc = 'pqrt'[i], 'uvxy'[i], 'zABC'[i]
    PALETTE[ma], PALETTE[mb], PALETTE[mc] = MINERAI_FER if metal == 'fer' else (sombre, moyen, clair)
    minerai, lingot = EMOJI[metal]
    ICONS[minerai] = _lettres(ROCHE, {'d': ma, 'm': mb, 'M': mc})
    ICONS[lingot] = _lettres(LINGOT, {'d': a, 'm': b, 'M': c})
PALETTE['w'] = '#ffffff'

# la lampe de mineur : une lanterne à anse, verre jaune allumé, monture de laiton
PALETTE.update({'Y': '#f2c040', 'y': '#fbe38a', 'O': '#8a5418', 'D': '#c7862a'})
ICONS['🔦'] = [
    '................',
    '......kkkk......',
    '.....k....k.....',
    '.....k....k.....',
    '....kkkkkkkk....',
    '....kDDDDDDk....',
    '....kkkkkkkk....',
    '....kyyYYyyk....',
    '....kyYwwYyk....',
    '....kyYwwYyk....',
    '....kyYYYYyk....',
    '....kkkkkkkk....',
    '....kDDOODDk....',
    '.....kkkkkk.....',
    '................',
    '................',
]

for _e, _g in ICONS.items():
    assert len(_g) == 16 and all(len(r) == 16 for r in _g), _e
