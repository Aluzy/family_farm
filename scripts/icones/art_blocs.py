# Les icônes tirées des images des blocs de la carte : chaque mur a la sienne (un carré de sa
# face, pris dans assets/murs_hauts.png : le mur seul, sans voisin) ; chaque modèle de porte, son
# battant en petit (scripts/carte/blocs.py, MODELES_PORTES) ; chaque modèle de sol, sa case seule
# (assets/blocs.png, BLOCS_CARTE.modelesSols) ; et l'escalier, dessiné de profil (son image de
# la carte, vue de haut, ne se lit pas en petit). Le menu Construire
# (js/ui/chantier.js) et l'inventaire les montrent : l'emoji de chaque objet (data/items.json).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
import importlib.util
import os
import sys

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
# emoji : le modèle de porte (MODELES_PORTES), le modèle de sol (MODELES_SOLS), dans leur ordre
PORTES = {'porte_chene': '🚪‍🟤', 'porte_vitree': '🚪‍🪟', 'porte_grange': '🚪‍🟥', 'porte_bleue': '🚪‍🟦',
          'porte_fer': '🚪‍⬛', 'porte_ecurie': '🚪‍🟩', 'porte_blanche': '🚪‍⬜'}
SOLS = {'sol_dalles': '🟫‍🔲', 'sol_carrelage': '🟫‍🏁', 'sol_tomettes': '🟫‍🟧', 'sol_chevrons': '🟫‍🪵',
        'sol_marbre': '🟫‍⬜', 'sol_paves': '🟫‍⚫', 'sol_mosaique': '🟫‍🟦'}
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
    # (scripts/carte/blocs.py, chargé par son chemin : ses battants, ses sols)
    # (ses chemins et ses modules ôtés ensuite : les autres art_*.py gardent les leurs)
    chemins, modules = list(sys.path), set(sys.modules)
    spec = importlib.util.spec_from_file_location('carte_blocs', os.path.join(ASSETS, '..', 'scripts', 'carte', 'blocs.py'))
    B = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(B)
    sys.path[:] = chemins
    for m in set(sys.modules) - modules:
        del sys.modules[m]
    for k, e in PORTES.items():
        out[e] = B.icone_porte(B.MODELES_PORTES[k][0])
    blocs = Image.open(os.path.join(ASSETS, 'blocs.png')).convert('RGBA')
    for i, k in enumerate(B.MODELES_SOLS):
        x = (B.SOLS_MODELES + 16 * i) * 16          # (le sol seul : masque 0, tout son bord)
        out[SOLS[k]] = blocs.crop((x, 8, x + 16, 24))
    return out
