# La ruche (js/engine/ruches.js) : l'objet du Marché, à poser sur la ferme. Le même bois peint
# jaune pâle et le même toit que son dessin sur la carte (scripts/carte/blocs.py ruche), une
# abeille qui vole à côté. Le bac à fleurs (où les abeilles butinent) : sa jardinière de
# planches et ses fleurs (scripts/carte/blocs.py bac_fleurs).
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
    'B': '#8a5a34',   # planches
    'D': '#5e3c22',   # planches, joints
    'h': '#b07a48',   # planches, clair
    'e': '#4a3222',   # terreau
    'v': '#3e8a3a',   # feuilles
    'r': '#f67878', 'o': '#ffe878', 'u': '#c49cf0', 'x': '#ffffff', 'R': '#ffb0d2', 'c': '#e0a020',
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

ICONS['🪴‍🌷'] = [
    '................',
    '...r.....o......',
    '..rcr...oco..x..',
    '...r..u..o..xcx.',
    '...v.ucu.v...x..',
    '.R.v..u..v.r.v..',
    'RcRvv.v.vvrcrv..',
    '.RvKKKKKKKKrKK..',
    '.KeeeeeeeeeeeeK.',
    '.KhhhhhhhhhhhhK.',
    '.KBBBBDBBBBBBBK.',
    '.KDDDDDDDDDDDDK.',
    '.KhhhhhhhDhhhhK.',
    '.KBBBBBBBDBBBBK.',
    '.KKKKKKKKKKKKKK.',
    '................',
]
