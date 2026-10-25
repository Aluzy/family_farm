# Lot « s'orienter » (fiche 8) : les lieux de la carte du monde et la boussole — le hameau, l'entrée
# d'une grotte de la montagne, la boussole. Format commun à tous les fichiers art_*.py : voir
# scripts/icones/build.py.
import math

from PIL import Image

from pixel import PALETTE_EAU, rgb  # build.py met scripts/ dans le chemin

PALETTE = {
    **PALETTE_EAU,  # les vitres (scripts/pixel.py)
    # bois, murs crème (comme 🏠, art_lieux.py)
    'K': '#2e1a12', 's': '#6a4426', 't': '#8a5a34', 'c': '#f2e6cc', 'C': '#d2bc98',
    # toits : tuiles bordeaux, ardoise
    'X': '#2a0c18', 'R': '#5e1a2a', 'r': '#8a2c3e', 'p': '#b8465a',
    'S': '#262a36', 'a': '#4a5262', 'e': '#6e7888',
    # herbe
    'G': '#1f4a22', 'g': '#2f6e2c', 'l': '#4a9a3a', 'm': '#8cd06a',
    # roche (la bouche des grottes : scripts/carte/lieux.py), l'arche noire
    'A': '#262a36', 'v': '#5a6272', 'i': '#8c96a4', 'I': '#c4ccd6', 'n': '#0e0c12', 'N': '#241e26',
}

ICONS = {}

ICONS['🏘'] = [  # un hameau : deux maisons, l'une derrière l'autre (ardoise, tuiles)
    '................',
    '..SS............',
    '.SeaS...........',
    'SeeaaS..........',
    'SSSSSSS...XX....',
    '.KccccK..XprX...',
    '.KqqcCK.XpprrX..',
    '.KbqcCKXpprrrRX.',
    '.KqqcCXpprrrrrRX',
    '.KccccXXXXXXXXXX',
    '.KcKKc.KccccccCK',
    '.KcKtc.KqqcKKKCK',
    '.KcKsc.KqbcKtsCK',
    '.KKKKK.KqqcKtsCK',
    'GlmlgGlKccCKtsCK',
    'GGGGGGGKKKKKKKKK',
]

ICONS['🕳'] = [  # l'entrée d'une grotte : un éperon de granit, l'arche noire au pied
    '................',
    '................',
    '......AAAA......',
    '....AAiIIiAA....',
    '...AiIIiiiivA...',
    '..AiIiiiiivvvA..',
    '..AiiiAAAAvvvA..',
    '.AiiiANNNNAvvvA.',
    '.AiiANnnnnNAvvA.',
    'AiiiANnnnnNAvvvA',
    'AivANnnnnnnNAvvA',
    'AivANnnnnnnNAvvA',
    'AvvANnnnnnnNAvvA',
    'AvvANnnnnnnNAvvA',
    'AAAANnnnnnnNAAAA',
    '....AAAAAAAA....',
]


def icons():
    """🧭 la boussole : un anneau de laiton, le cadran crème, l'aiguille rouge vers le nord."""
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    contour, laiton, clair, cadran, ombre = rgb('#3a2414'), rgb('#c99a3b'), rgb('#f2d27a'), rgb('#f6ecd2'), rgb('#d8c6a0')
    rouge, rouge_s, gris, gris_s, axe = rgb('#d0402c'), rgb('#8a2018'), rgb('#9aa4b4'), rgb('#5a6272'), rgb('#3a2414')
    cx = cy = 7.5
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - cx, y - cy)
            if d <= 7.6:
                c = contour
                if d <= 6.7:
                    c = clair if (x - cx) + (y - cy) < -2 else laiton
                if d <= 5.4:
                    c = cadran if (x - cx) + (y - cy) < 3 else ombre
                im.putpixel((x, y), c)
    # l'aiguille : rouge vers le nord, grise vers le sud ; les repères des points cardinaux
    for y in range(2, 14):
        demi = max(0, 2 - abs(y - 7.5) / 3)
        for x in range(16):
            if abs(x - cx) <= demi - 0.2:
                c = (rouge if x < cx else rouge_s) if y < 8 else (gris if x < cx else gris_s)
                im.putpixel((x, y), c)
    for x, y in ((7, 7), (8, 7), (7, 8), (8, 8)):
        im.putpixel((x, y), axe)
    for x, y in ((2, 7), (2, 8), (13, 7), (13, 8)):
        im.putpixel((x, y), contour)
    return {'🧭': im}
