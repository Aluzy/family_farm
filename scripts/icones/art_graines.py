# Lot « graines » : un sachet de graines par culture, avec le dessin du légume dessus, pour
# distinguer les graines d'un coup d'œil (inventaire, Marché). L'emoji d'un sachet est une
# suite « 🌱 + U+200D + icône du légume » (🌱‍🥕) : sans planche, on lit encore 🌱🥕.
# Les sachets sont calculés (derived) après toutes les autres icônes : le légume y est
# repris tel qu'il est dessiné ailleurs (crops.png, art_*.py), réduit pour tenir sur l'étiquette.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
from PIL import Image

ZWJ = '‍'
LEGUMES = ['🥕', '🍅', '🥒', '🍆', '🌻', '🧅', '🫑', '🥬', '🍓']

PALETTE = {
    'K': '#3a2414',  # contour
    'n': '#7a5232',  # pli du haut, ombre
    'U': '#d8a670',  # papier kraft
    'T': '#b07a48',  # kraft ombré
    'u': '#ecc896',  # kraft clair
    'w': '#fbf3e0',  # étiquette
    'E': '#e0d0b0',  # bord de l'étiquette
}

# Le sachet : bord du haut cranté et replié, étiquette crème (E/w) où se pose le légume.
SACHET = [
    '................',
    '.K.K.K.K.K.K.K..',
    '.KnKnKnKnKnKnK..',
    '.KTnTnTnTnTnTK..',
    '.KuUUUUUUUUUTK..',
    '.KuEEEEEEEEETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEwwwwwwwETK..',
    '.KuEEEEEEEEETK..',
    '.KuUUUUUUUUTTK..',
    '.KKKKKKKKKKKKK..',
]
# Où va le légume : la case du haut-gauche et la taille (il déborde un peu à droite et en bas,
# comme posé devant le sachet).
POSE = (5, 5)
TAILLE = 11


def _grille(rows):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in PALETTE:
                h = PALETTE[ch].lstrip('#')
                im.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    return im


def derived(icons):
    out = {}
    base = _grille(SACHET)
    for e in LEGUMES:
        src = icons.get(e)
        if src is None:
            continue
        box = src.getbbox()
        leg = src.crop(box) if box else src
        k = TAILLE / max(leg.width, leg.height)
        leg = leg.resize((max(1, round(leg.width * k)), max(1, round(leg.height * k))), Image.NEAREST)
        im = base.copy()
        x = min(16 - leg.width, POSE[0] + (TAILLE - leg.width) // 2)
        y = min(16 - leg.height, POSE[1] + (TAILLE - leg.height) // 2)
        im.alpha_composite(leg, (x, y))
        out['🌱' + ZWJ + e] = im
    return out
