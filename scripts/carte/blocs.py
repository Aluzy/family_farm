# Les blocs qu'on pose sur la ferme générée (docs/carte-generee.md, étape 4) : le mur en pierre,
# la porte, l'Atelier, la paillasse et sa couverture. Cinq images de 16 × 24 côte à côte ; le
# bas de chaque image est le bas de sa case (les murs, la porte et l'Atelier ont de la hauteur :
# ils dépassent sur la case du dessus, vus un peu de haut comme les bâtiments).
#
#   python3 scripts/carte/blocs.py            écrit assets/blocs.png
#   python3 scripts/carte/blocs.py --apercu   écrit aussi apercu_blocs.png
#
# Même ordre que js/carte/ferme/config.js (BLOCS_CARTE.frames) : mur_pierre, porte, atelier,
# paillasse, drap (la couverture, posée par-dessus le personnage couché). Gris des rochers,
# bruns des troncs, paille du poulailler ; lumière en haut à gauche, contour sombre de la
# matière.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, rangee, rgb  # noqa: E402

PALETTE = {
    # pierre : contour, ombre, moyen, clair, reflet, joint
    'a': '#28262c', 'b': '#5e5c64', 'c': '#86848c', 'd': '#aeacb2', 'e': '#d4d2d6', 'j': '#45434a',
    # bois
    'k': '#2e1c10', 's': '#5a3a20', 't': '#7e522e', 'T': '#a46e42', 'E': '#c89462',
    # fer
    'm': '#1e2833', 'n': '#64707e', 'p': '#aab6c4',
    # paille, toile
    'O': '#4a3010', 'o': '#b07a28', 'y': '#e2b448', 'Y': '#f6d880',
    'u': '#5a4630', 'v': '#c4ac84', 'w': '#e8d8b0', 'W': '#f6ecd0',
    # couverture (laine rouge)
    'R': '#4a1418', 'r': '#9a3238', 'q': '#c8484a', 'Q': '#e07466',
}

DESSINS = [
    # mur en pierre : le dessus (clair), puis les assises de moellons, sur toute la hauteur
    [
        'aaaaaaaaaaaaaaaa',
        'aeeeeeeeeeeeeeea',
        'addddddddddddddc',
        'ajjjjjjjjjjjjjja',
        'adddcadddddcaddc',
        'accccacccccbaccb',
        'abbbbabbbbbbabbb',
        'ajjjjjjjjjjjjjja',
        'addddddcaddddddc',
        'acccccccaccccccb',
        'abbbbbbbabbbbbbb',
        'ajjjjjjjjjjjjjja',
        'adddcadddddcaddc',
        'accccacccccbaccb',
        'abbbbabbbbbbabbb',
        'ajjjjjjjjjjjjjja',
        'addddddcaddddddc',
        'acccccccaccccccb',
        'abbbbbbbabbbbbbb',
        'ajjjjjjjjjjjjjja',
        'adddcadddddcaddc',
        'accccacccccbaccb',
        'abbbbabbbbbbabbb',
        'aaaaaaaaaaaaaaaa',
    ],
    # porte : le linteau de pierre, la porte de planches cintrée, ses pentures, la poignée
    [
        'aaaaaaaaaaaaaaaa',
        'aeeeeeeeeeeeeeea',
        'addddddddddddddc',
        'ajjjjjjjjjjjjjja',
        'acccckkkkkkccccb',
        'acckkETETETkkccb',
        'ackETETETETETkcb',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akmnnnnnnnnnnmka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTpTtka',
        'akTtTtTtTtTmTtka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akmnnnnnnnnnnmka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'akTtTtTtTtTtTtka',
        'aksssssssssssska',
        'aaaaaaaaaaaaaaaa',
    ],
    # l'Atelier : un établi de bois, un marteau et une scie posés dessus
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '..mm............',
        '.mpnm.......mm..',
        '..ks......mpppm.',
        'kkkkkkkkkkkkkkkk',
        'kEEEEEEEEEEEEEEk',
        'kTTTTTTTTTTTTTTk',
        'ktttttttttttttttk',
        'kkkkkkkkkkkkkkkk',
        '.ks..........sk.',
        '.ks..........sk.',
        '.kskkkkkkkkkksk.',
        '.ks.ttttttttsk..',
        '.ks..........sk.',
        '.ks..........sk.',
        '.kk..........kk.',
    ],
    # paillasse : un sac de toile bourré de paille, posé au sol
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '..uuuuuuuuuuuu..',
        '.uWWWWWWWWWWWWu.',
        '.uWwwwwwwwwwwvu.',
        '.uwwvwwwwvwwwvu.',
        '.uwwwwwvwwwwwvu.',
        '.uwvwwwwwwvwwvu.',
        '.uwwwwvwwwwwwvu.',
        '.uwwwwwwwvwwwvu.',
        '.uvwwvwwwwwwvvu.',
        '.uvvvvvvvvvvvvu.',
        '.uyoyuuuuuuyoyu.',
        '..uuu......uuu..',
        '................',
        '................',
    ],
    # la couverture : posée sur le bas de la paillasse (et sur le dormeur)
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '..RRRRRRRRRRRR..',
        '.RQQQQQQQQQQQqR.',
        '.RqqqqqqqqqqqrR.',
        '.RqqQqqqqQqqqrR.',
        '.RqqqqqqqqqqqrR.',
        '.RrrrrrrrrrrrrR.',
        '..RRRRRRRRRRRR..',
        '................',
        '................',
        '................',
    ],
]


def dessin(rangs):
    im = Image.new('RGBA', (16, 24), (0, 0, 0, 0))
    for y, rang in enumerate(rangs):
        for x, ch in enumerate(rang[:16]):
            if ch != '.':
                im.putpixel((x, y), rgb(PALETTE[ch]))
    return im


def main():
    sheet = rangee([dessin(d) for d in DESSINS], 16, 24)
    sheet.save(os.path.join(ASSETS, 'blocs.png'))
    print(f'assets/blocs.png : {len(DESSINS)} images de 16 × 24')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_blocs.png', zoom=8, fond=(106, 150, 84))


if __name__ == '__main__':
    main()
