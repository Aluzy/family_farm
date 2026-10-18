# Ce qu'on ramasse à la main sur la ferme générée (docs/carte-generee.md, étape 3) : la petite
# pierre, le morceau de bois et l'herbe, posés au sol (le bas de l'image est le pied), puis une
# grappe de baies (posée plusieurs fois sur un buisson) : quatre images de 16 × 16 côte à côte.
#
#   python3 scripts/carte/ramassables.py            écrit assets/ramassables.png
#   python3 scripts/carte/ramassables.py --apercu   écrit aussi apercu_ramassables.png
#
# Même ordre que js/carte/ferme/config.js (RAMASSABLES.frames) : petite_pierre, morceau_bois,
# herbe, baies. La grappe : 4 × 4 pixels, un dégradé de rouges du clair (en haut à gauche) au
# sombre, sans les quatre coins (pas de carré) et sans contour ; au bas milieu de l'image. Les gris sont ceux des rochers de la carte, les bruns ceux des troncs, les verts ceux de
# l'herbe haute ; contour d'un pixel dans la teinte très sombre de la matière, lumière en haut à
# gauche.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, rangee, rgb  # noqa: E402

PALETTE = {
    # pierre
    'a': '#4e4c52', 'b': '#7a7880', 'c': '#a4a2a8', 'd': '#d0ced2',
    # bois
    'k': '#4a2c16', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48', 'e': '#d8b07a',
    # herbe
    'G': '#24502a', 'g': '#3a7a34', 'l': '#5aa040', 'L': '#8cc85a',
    # baies : du plus clair au plus sombre
    'h': '#ff9c8c', 'r': '#e8463e', 'm': '#c22a30', 'n': '#921c26', 'N': '#5e121a',
}
BAIES = [
    '.hr.',
    'hrmn',
    'rmnN',
    '.nN.',
]
CONTOURS = ['#28262c', '#2e1a0c', '#173418']

DESSINS = [
    # la petite pierre : deux cailloux
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
        '......cd........',
        '....bccdc.......',
        '...abcccb...cd..',
        '...abbbcb..bccb.',
        '....aabba..abba.',
        '................',
        '................',
    ],
    # le morceau de bois : une branche tombée, avec un rameau
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '.........s......',
        '..........s.....',
        '..........ts....',
        '..eTTTTTTTTTTt..',
        '..etssstttssss..',
        '...kkkkkkkkkk...',
        '................',
        '................',
    ],
    # l'herbe : une touffe haute, ses brins un peu penchés
    [
        '................',
        '................',
        '................',
        '.......L........',
        '...L...l...L....',
        '...l..Ll..Ll....',
        '....l.ll..l..L..',
        '....ll.l.ll..l..',
        '..L.ll.llll.ll..',
        '..ll.lllgll.l...',
        '...llglggglll...',
        '...lgggggggll...',
        '....gGgGggGg....',
        '.....GGGGGG.....',
        '................',
        '................',
    ],
]


def dessin(rangs, ombre):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, rang in enumerate(rangs):
        for x, ch in enumerate(rang):
            if ch != '.':
                im.putpixel((x, y), rgb(PALETTE[ch]))
    return contour(im, rgb(ombre))


def grappe():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, rang in enumerate(BAIES):
        for x, ch in enumerate(rang):
            if ch != '.':
                im.putpixel((6 + x, 12 + y), rgb(PALETTE[ch]))
    return im


def main():
    images = [dessin(d, c) for d, c in zip(DESSINS, CONTOURS)] + [grappe()]
    sheet = rangee(images, 16, 16)
    sheet.save(os.path.join(ASSETS, 'ramassables.png'))
    print(f'assets/ramassables.png : {len(images)} images de 16 × 16')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_ramassables.png', zoom=8, fond=(106, 150, 84))


if __name__ == '__main__':
    main()
