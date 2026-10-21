# La ruche (js/engine/ruches.js) : l'objet du Marché, à poser sur la ferme. Le même bois peint
# jaune pâle et le même toit que son dessin sur la carte (scripts/carte/blocs.py ruche), une
# abeille qui vole à côté.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.

PALETTE = {
    'K': '#24180e',   # contour
    't': '#5a3e2a',   # toit
    'T': '#7e5a3c',   # toit, dessus
    'p': '#b08c42',   # bois peint, ombre
    'P': '#d6b662',   # bois peint
    'L': '#eed68c',   # bois peint, clair
    'w': '#fcf0bc',   # reflet
    'n': '#120c08',   # trou de vol
    'y': '#f6ba30',   # abeille
    'b': '#1c1410',   # rayures de l'abeille
    'a': '#d8f0ff',   # ailes
}

ICONS = {}

ICONS['🐝'] = [
    '...........aa...',
    '..........aaa.a.',
    '.........byybyb.',
    '..........byyb..',
    '.KKKKKKKKKKK....',
    'KTTTTTTTTTTTK...',
    'KtttttttttttK...',
    '.KKKKKKKKKKK....',
    '.KwLLLLLLLLpK...',
    '.KLPPPPPPPPpK...',
    '.KpppppppppKK...',
    '.KwLLLLLLLLpK...',
    '.KLPPnnnnPPpK...',
    '.KpPLLLLLLppK...',
    '..KKKpKKpKKK....',
    '....KK..KK......',
]
