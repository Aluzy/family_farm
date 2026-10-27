# Le cheval et son matériel (js/engine/cheval.js) : la tête du cheval (prise dans sa planche de
# la carte, assets/cheval.png, scripts/personnage/cheval.py), la corde de fibre enroulée, le
# poteau d'attache et son anneau, le râtelier de l'Écurie plein de foin.
# Format commun : voir scripts/icones/build.py. Contour de 1 px dessiné à la main, dans la teinte
# très sombre de chaque matière ; lumière en haut à gauche.
import os

from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets')

PALETTE = {
    # bois
    'k': '#3a2414', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48', 'e': '#d8b07a',
    # corde (fibre tressée)
    'C': '#3e2a10', 'c': '#8a6a32', 'r': '#b89448', 'R': '#e0c27a',
    # fer
    'm': '#1e2833', 'n': '#64707e', 'p': '#9aa8b8',
    # foin
    'O': '#4a3010', 'o': '#a8862e', 'y': '#d2b456', 'Y': '#ecd488',
}

ICONS = {
    # corde : un rouleau de corde tressée, le bout qui pend à droite
    '➰': [
        '................',
        '.....CCCCCC.....',
        '...CCrRRRRrCC...',
        '..CrRcccccrRrC..',
        '.CrRcCCCCCCcRrC.',
        '.CRcCrRRRRrCcRC.',
        'CrRcCRcCCcRCcRrC',
        'CrRcCRC..CRCcRrC',
        'CrRcCRcCCcRCcRrC',
        '.CRcCrRRRRrCcRC.',
        '.CrRcCCCCCCcRrCC',
        '..CrRcccccrRrCrC',
        '...CCrRRRRrCCRC.',
        '.....CCCCCC.CrC.',
        '............CRC.',
        '.............C..',
    ],
    # poteau d'attache : un pieu équarri planté dans la terre, son anneau de fer
    '🪵‍🔗': [
        '................',
        '.....kkkkk......',
        '.....keeTk......',
        '.....kTTtk......',
        '.....kTtsk......',
        '.....kTtsk......',
        '.....kTtskmmm...',
        '.....kTtskpnm...',
        '.....kTtskm.m...',
        '.....kTtskmnm...',
        '.....kTtsk.mm...',
        '.....kTtsk......',
        '.....kTtsk......',
        '...kkkTtskkk....',
        '..ksssssssssk...',
        '...kkkkkkkkk....',
    ],
    # râtelier : une grille de bois pleine de foin, une auge dessous
    '🌾‍🪜': [
        'kkkkkkkkkkkkkkkk',
        'keeeeeeeeeeeeeek',
        'kTyTyYTyoTyYTyTk',
        'ktYTyoTYyTyoTYtk',
        'kTyTYyToyTYyTyTk',
        'ktoTyYTyYToyTytk',
        'kTyTyoTYyTyYTyTk',
        'kkkkkkkkkkkkkkkk',
        'kOyYyoYyYoyYyoOk',
        'kTTTTTTTTTTTTTTk',
        'kttttttttttttttk',
        'kTTTTTTTTTTTTTTk',
        'kttttttttttttttk',
        'kkkkkkkkkkkkkkkk',
        '.kk..........kk.',
        '.kk..........kk.',
    ],
}


def icons():
    """La tête du cheval, de profil : prise dans sa planche (case 0, au repos : la tête retouchée
    à la main, fiche 12, qui va jusqu'au contour du bout du nez, colonne 45)."""
    planche = Image.open(os.path.join(ASSETS, 'cheval.png')).convert('RGBA')
    return {'🐴': planche.crop((30, 0, 46, 16)).copy()}
