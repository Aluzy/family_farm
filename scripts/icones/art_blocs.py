# Les icônes tirées des images des blocs de la carte : chaque mur a la sienne (un carré de sa
# face, pris dans assets/murs_hauts.png : le mur seul, sans voisin) ; et l'escalier, dessiné de
# profil (son image de la carte, vue de haut, ne se lit pas en petit). Le menu Construire
# (js/ui/chantier.js) et l'inventaire les montrent : l'emoji de chaque objet (data/items.json).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
import os

from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets')
TRAIT = (36, 30, 20, 255)

# emoji : la première image du mur dans murs_hauts.png (js/carte/ferme/config.js,
# BLOCS_CARTE.hauts.variantes ; + 0 : le mur seul)
MURS = {
    '🧱‍🪨': 0,      # mur en pierre
    '🪟': 17,        # fenêtre
    '🧱‍📐': 33,     # pierre d'angle
    '🧱‍🪟': 97,     # paroi vitrée
    '🧱‍🟥': 161,    # briques rouges
    '🧱‍🟧': 177,    # briques orange
    '🧱‍🟨': 193,    # briques ocre
    '🧱‍🟦': 209,    # briques bleues
    '🧱‍⬜': 225,    # pierre de taille
    '🧱‍🟫': 371,    # mur en bois
}
FACE = 14            # la rangée où commence le carré de la face (sous le dessus du mur)
# l'escalier de profil : quatre marches de bois (K contour, d sombre, m moyen, l clair)
PALETTE = {'K': '#241e14', 'd': '#6e4a2a', 'm': '#9a6a3c', 'l': '#c99a5e'}
ESCALIER = [
    '................',
    '..........KKKKKK',
    '..........KllllK',
    '..........KmmmmK',
    '.......KKKKddddK',
    '.......KllllmmmK',
    '.......KmmmmmmmK',
    '....KKKKdddddddK',
    '....KllllmmmmmmK',
    '....KmmmmmmmmmmK',
    '.KKKKddddddddddK',
    '.KllllmmmmmmmmmK',
    '.KmmmmmmmmmmmmmK',
    '.KddddddddddddK.',
    '.KKKKKKKKKKKKKK.',
    '................',
]


def icons():
    out = {}
    hauts = Image.open(os.path.join(ASSETS, 'murs_hauts.png')).convert('RGBA')
    for e, f in MURS.items():
        x = f * 16
        ic = hauts.crop((x, FACE, x + 16, FACE + 16)).copy()
        # un trait en haut et en bas (les côtés ont déjà le contour du mur)
        for xx in range(16):
            ic.putpixel((xx, 0), TRAIT)
            ic.putpixel((xx, 15), TRAIT)
        out[e] = ic
    esc = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(ESCALIER):
        for x, ch in enumerate(row):
            if ch != '.':
                c = PALETTE[ch]
                esc.putpixel((x, y), (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255))
    out['🪜'] = esc
    return out
