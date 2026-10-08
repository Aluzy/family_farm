# Dessins de l'interface (lot « jeu ») :
#   - les bêtes des fiches (poule, œuf, mouton, vache), reprises des planches de la carte ;
#   - le bouton « Dormir » (allumé et en attente) ;
#   - la police pixel (FONT), chiffres et quelques signes : assets/police.png.
import importlib.util
import math
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'assets')


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def frame(sheet, w, h, n=0):
    im = Image.open(os.path.join(ASSETS, sheet)).convert('RGBA')
    return im.crop((n * w, 0, n * w + w, h))


def essai(emoji):
    spec = importlib.util.spec_from_file_location('art_essai', os.path.join(HERE, 'art_essai.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    rows = mod.ICONS[emoji]
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), rgb(mod.PALETTE[ch]))
    return im


def trim(im):
    box = im.getbbox()
    return im.crop(box) if box else im


# Bouton « Dormir » : disque de 28 px, croissant de lune ; allumé, deux « z ».
SLEEP_ON = {'line': '#16203a', 'dark': '#24386a', 'mid': '#33508e', 'light': '#4d6cae', 'rim': '#7590cc',
            'moon': '#f6e08a', 'moon2': '#d6b44e', 'moonl': '#fff6c8', 'z': '#ffffff', 'z2': '#b8c8ee'}
SLEEP_OFF = {'line': '#2a2d33', 'dark': '#5a5f68', 'mid': '#6e747d', 'light': '#848a93', 'rim': '#9aa0a8',
             'moon': '#c8ccd2', 'moon2': '#a6abb2', 'moonl': '#dde0e4', 'z': '#ffffff', 'z2': '#b8c8ee'}

Z_BIG = ['#####', '...#.', '..#..', '.#...', '#####']
Z_SMALL = ['###', '.#.', '###']


def sleep_button(pal, zs):
    S = 28
    c = (S - 1) / 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > 13.6:
                continue
            if d > 12.6:
                col = pal['line']
            else:
                t = ((x - c) + (y - c)) / 13  # -1 en haut à gauche, +1 en bas à droite
                if d > 11.4 and t < -0.3:
                    col = pal['rim']
                elif t < -0.55:
                    col = pal['light']
                elif t > 0.6:
                    col = pal['dark']
                else:
                    col = pal['mid']
            im.putpixel((x, y), rgb(col))
    # croissant : disque moins un disque décalé
    mx, my, r = (10.5, 14.5, 6.6) if zs else (12.5, 9.5, 5.4)  # en attente : lune en haut, les secondes dessous
    for y in range(S):
        for x in range(S):
            d1 = math.hypot(x - mx, y - my)
            d2 = math.hypot(x - (mx + 3.6), y - (my - 2.4))
            if d1 <= r and d2 > r - 0.6:
                col = pal['moon']
                if d1 > r - 1.2 and (x - mx) + (y - my) > 1:
                    col = pal['moon2']
                elif (x - mx) + (y - my) < -r * 0.9:
                    col = pal['moonl']
                im.putpixel((x, y), rgb(col))
    if zs:
        for gx, gy, glyph in ((16, 7, Z_BIG), (21, 3, Z_SMALL)):
            for yy, row in enumerate(glyph):
                for xx, ch in enumerate(row):
                    if ch == '#':
                        im.putpixel((gx + xx, gy + yy), rgb(pal['z']))
                        if gy + yy + 1 < S:
                            below = im.getpixel((gx + xx, gy + yy + 1))
                            if below[:3] != rgb(pal['z'])[:3]:
                                im.putpixel((gx + xx, gy + yy + 1), rgb(pal['line']))
    return im


def art():
    return {
        'hen': frame('poule.png', 16, 16, 0),
        'egg': trim(essai('🥚')),
        'sheep-wool': trim(frame('mouton.png', 32, 24, 0)),
        'cow': trim(frame('vache.png', 32, 24, 0)),
        'sleep-on': sleep_button(SLEEP_ON, True),
        'sleep-off': sleep_button(SLEEP_OFF, False),
    }


# Police pixel : 5 px de haut, la couleur vient du texte (masque CSS). '.' = vide.
FONT = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#', '##', '.#', '.#', '.#'],
    '2': ['###', '..#', '###', '#..', '###'],
    '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '###'],
    '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
    's': ['...', '.##', '#..', '..#', '##.'],
    'h': ['#..', '#..', '###', '#.#', '#.#'],
    'x': ['...', '#.#', '.#.', '#.#', '...'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    ' ': ['..', '..', '..', '..', '..'],
}
