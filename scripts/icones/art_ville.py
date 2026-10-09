# Lot « ville » : sorties en ville (parc, bibliothèque, arcade, cinéma, spectacle), voyages
# (train, bus), denrées (poisson, miel, sucre, épices, cèpe, myrtilles, raclette), la ville,
# le bonheur ; et le poteau indicateur de la carte (ART 'carte-panneau_ville', natif).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
PALETTE = {
    # or / visage (mêmes teintes que 🙂 de art_gens.py)
    'K': '#3a2414', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a', 'O': '#8a5418',
    'e': '#3a2414', 'm': '#6e2a1a', 'c': '#e86a5a',
    # rouges
    'R': '#6e1a22', 'r': '#d83a3a', 'p': '#f07a6a', 'x': '#a82a30',
    # bleus
    'q': '#163a5c', 'b': '#4aa0e0', 'B': '#c4e8ff', 'd': '#2a70b0',
    # verts
    'G': '#1f4a22', 'g': '#2f6e2c', 'l': '#4a9a3a', 'L': '#8cd06a',
    # bois / brun
    's': '#3a2414', 't': '#6a4426', 'u': '#8a5a34', 'v': '#b07a48',
    # blancs, gris (pour le blanc : contour bleu-gris sombre)
    'w': '#ffffff', 'W': '#dfe6ee', 'a': '#a8b4c4', 'A': '#5a6270', 'k': '#262a36', 'n': '#3e4452',
    # crème (pied de cèpe, pommes de terre)
    'C': '#f4ead8', 'E': '#d8c6a8', 'H': '#a8906a',
    # violets (myrtilles, masques)
    'V': '#2a1a4a', 'P': '#5a4ab0', 'i': '#8a80e0', 'I': '#c8c0f8',
    'j': '#1c1c48', 'J': '#34388a', 'h': '#5562c0', 'z': '#a0b4f0',
    # tissu à carreaux (miel)
    'f': '#e05050', 'F': '#f8d0c0',
    # panneau de la carte (couleurs de assets/sign.png)
    '1': '#42141b', '2': '#59362a', '3': '#684a37', '4': '#897154', '5': '#938878',
    '6': '#c8c5c1', '7': '#292439', '8': '#e8e4dc',
}


def pose(base, motif, x0, y0):
    """Pose un motif (liste de chaînes, '.' = transparent) sur une grille 16×16 en (x0, y0)."""
    g = [list(r) for r in base]
    for dy, row in enumerate(motif):
        for dx, ch in enumerate(row):
            if ch != '.':
                g[y0 + dy][x0 + dx] = ch
    return [''.join(r) for r in g]


VIDE = ['.' * 16] * 16

ICONS = {}

ICONS['🛝'] = [  # toboggan : échelle bleue, glissière rouge
    '................',
    '................',
    '.qqqqqq.........',
    '.qBBBbqRR.......',
    '.qdddddpRR......',
    '.qbqqbqrpRR.....',
    '.qbq.qRxrpRR....',
    '.qyyyyqRxrpRR...',
    '.qbqqbq.RxrpRR..',
    '.qbq.qq..RxrpRR.',
    '.qyyyyq...RxrpR.',
    '.qbqqbq....RxrpR',
    '.qbq.qb.....RxpR',
    '.qyyyyq......RRR',
    '.qbq.qb......qq.',
    '.qqq.qq......qq.',
]

ICONS['📚'] = [  # pile de trois livres
    '................',
    '................',
    '...qqqqqqqqqq...',
    '..qBbbbbbbbbbq..',
    '..qbWWWWWWWWdq..',
    '..qqqqqqqqqqqq..',
    '.RRRRRRRRRRRR...',
    '.RprrrrrrrrrxR..',
    '.RrWWWWWWWWWWR..',
    '.RRRRRRRRRRRRR..',
    '..GGGGGGGGGGGGG.',
    '..GLlllyylllllG.',
    '..GllllyylllgG..',
    '..GlWWWWWWWWWWG.',
    '..GGGGGGGGGGGGG.',
    '................',
]

ICONS['🕹'] = [  # joystick à boule rouge sur socle
    '................',
    '.....RRRR.......',
    '....RpprrR......',
    '....RprrrR......',
    '....RrrrxR......',
    '.....RRRR.......',
    '......kk........',
    '......kn........',
    '......kn........',
    '..kkkkknkkkkkk..',
    '.kaaaaaaaaaaaak.',
    '.kAAAAAAAArrAAk.',
    '.kAAAAAAARppRAk.',
    '.knnnnnnnnRRnnk.',
    '..kkkkkkkkkkkk..',
    '................',
]

ICONS['🎬'] = [  # clap de cinéma ouvert, rayures noires et blanches
    '................',
    '.........kkkkk..',
    '.....kkkkwwnnwk.',
    '.kkkkwwnnwwnkk..',
    '.kwwnnwwnkkk....',
    '.kkkkkkk........',
    '.kkkkkkkkkkkkkk.',
    '.kwwnnwwnnwwnnk.',
    '.kwnnwwnnwwnnwk.',
    '.kkkkkkkkkkkkkk.',
    '.knnnnnnnnnnnnk.',
    '.knWWWWWWWWWnnk.',
    '.knnnnnnnnnnnnk.',
    '.knWWWWWWnnnnnk.',
    '.kkkkkkkkkkkkkk.',
    '................',
]

ICONS['🎭'] = [  # masques de théâtre : comédie dorée, tragédie violette
    '................',
    '.KKKKKK.........',
    'KYyyyyyK........',
    'KyKyyKyK..VVVVV.',
    'KyKyyKyKVViiiiiV',
    'KyyyyyyKViiiiiiV',
    'KcyyyycKiViiiViV',
    'KyKyyKyKiiViiiVV',
    '.KyKKyKViiiiiiV.',
    '.KyyyyKViiiiiiV.',
    '..KyyK.ViiVVViV.',
    '...KK..ViVPPPVV.',
    '........ViiiiV..',
    '.........VPPV...',
    '..........VV....',
    '................',
]

ICONS['🚆'] = [  # locomotive de face, rouge et verte
    '................',
    '....RRRRRRRR....',
    '...RpprrrrrrR...',
    '..RprrrrrrrrxR..',
    '..RrqqqqqqqqxR..',
    '..RrqBBbbbbqxR..',
    '..RrqBbbbbdqxR..',
    '..RrqqqqqqqqxR..',
    '..RrrrrrrrrrxR..',
    '..GllllllllllG..',
    '..GlYYllllYYgG..',
    '..GllllllllllG..',
    '..GGGGGGGGGGGG..',
    '...kAk....kAk...',
    '..kk..kkkk..kk..',
    '................',
]

ICONS['🚌'] = [  # bus jaune de profil
    '................',
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KYYYYYYYYYYYYYyK',
    'KyqqqqqqqqqqqqyK',
    'KyqBbqBbqBbqBbyK',
    'KyqbbqbbqbbqbdyK',
    'KyqqqqqqqqqqqqyK',
    'KyyyyyyyyyyyyyyK',
    'KOOOOOOOOOOOOOOK',
    'KyyyyyyyyyyyyyoK',
    'KookkkooookkkooK',
    '.KkAaAkKKkAaAkK.',
    '...kAk....kAk...',
    '................',
]

ICONS['🐟'] = [  # poisson bleu argenté
    '................',
    '................',
    '................',
    '......qqqq......',
    '....qqBBBbqq....',
    '...qBBBbbbbbq.qq',
    '..qBkBbbbbbbbqbq',
    '.qBBBbbbbbbbbbbq',
    '.qbbbbbbbbbbbbdq',
    '..qWWbbbbbbbdqdq',
    '...qWWWWWdddq.qq',
    '....qqWWddqq....',
    '......qqqq......',
    '................',
    '................',
    '................',
]

ICONS['🍯'] = [  # pot de miel, couvercle en tissu à carreaux, étiquette
    '................',
    '...RRRRRRRRRR...',
    '..RfFfFfFfFfFR..',
    '.RFfFfFfFfFfFfR.',
    '..RRRRRRRRRRRR..',
    '...KKKKKKKKKK...',
    '..KYyyyyyyyyoK..',
    '.KYyyyyyyyyyyoK.',
    '.KYyCCCCCCCCyoK.',
    '.KyyCEEEEEECyoK.',
    '.KyyCCCCCCCCyoK.',
    '.KyyyyyyyyyyooK.',
    '.KoyyyyyyyyyooK.',
    '..KooooooooooK..',
    '...KKKKKKKKKK...',
    '................',
]

# sucre : petit tas de trois morceaux (dessus blanc, face gris clair, côté ombré)
_MORCEAU = [
    '.qqqqqq.',
    'qwwwwwwq',
    'qwwwwwWq',
    'qWWWWWaq',
    'qWWWWWaq',
    'qWWWWaaq',
    'qaaaaaaq',
    '.qqqqqq.',
]
ICONS['🍬'] = pose(pose(pose(VIDE, _MORCEAU, 0, 7), _MORCEAU, 8, 7), _MORCEAU, 4, 1)

ICONS['🌶'] = [  # piment rouge
    '................',
    '..........GG....',
    '.........GlG....',
    '........GLlG....',
    '.......GgllgG...',
    '......RGGgGGR...',
    '.....RprrrrrrR..',
    '....RprrrrrrxR..',
    '...RprrrrrrxR...',
    '..RprrrrrrxR....',
    '..RrrrrrrxR.....',
    '.RrrrrrxRR......',
    '.RrrrxRR........',
    'RrxRR...........',
    'RR..............',
    '................',
]

ICONS['🍄'] = [  # cèpe brun à pied crème
    '................',
    '................',
    '.....ssssss.....',
    '...ssvvvvuuss...',
    '..svvvuuuuuuts..',
    '.svvuuuuuuuuuts.',
    '.svuuuuuuuuuuts.',
    '.sututtttttttts.',
    '..ssHEEEEEEHss..',
    '....sCCCCCEs....',
    '...sCCCCCCCEs...',
    '...sCCCCCCCEs...',
    '...sCCCCCCEEs...',
    '...sCCCCCEEHs...',
    '....sEEEEHHs....',
    '.....ssssss.....',
]

# myrtilles : baies bleu-violet avec leur couronne sombre, une feuille
_BAIE = [
    '..jjj..',
    '.jzzhj.',
    'jzzhhhj',
    'jzhjJhj',
    'jhhJjhj',
    '.jhhJj.',
    '..jjj..',
]
_FEUILLE = [
    '....GGG',
    '..GGLlG',
    '.GLllgG',
    'GLlggG.',
    'GGGGG..',
]
ICONS['🫐'] = pose(pose(pose(pose(VIDE, _FEUILLE, 9, 1), _BAIE, 3, 2), _BAIE, 8, 6), _BAIE, 2, 8)

ICONS['🫕'] = [  # poêlon de fromage doré qui coule sur des pommes de terre
    '................',
    '.....kkkkkkkkk..',
    '....kAAAAAAAAnk.',
    '...kAKKKKKKKKnk.',
    '..kAKYYYyyOyyKnk',
    '.kAKYyyOyyyyyoKk',
    'kkAKyyyyyyyOyoKk',
    'kAkknnKyKnnnnnk.',
    '.kk.kkKyKkkkkk..',
    '......KyK.......',
    '...sssKyKsssss..',
    '..svvKyyyKvvuus.',
    '.svvvKyoyKvuuuts',
    '.svvuuKKKuuuuuts',
    '..stttts.stttts.',
    '...ssss...ssss..',
]

ICONS['🏙'] = [  # trois immeubles : brique, verre, ocre
    '................',
    '.......qqqq.....',
    '.......qBbq.....',
    '.......qbbq.....',
    '.RRRR..qBdq.....',
    '.RprR.qqbbqqKKKK',
    '.RrrRRqbBdqKYyyK',
    '.RwRwRqbbbqKyqyK',
    '.RrrrRqBbdqKyyyK',
    '.RwRwRqbbbqKyqyK',
    '.RrrrRqBbdqKyyyK',
    '.RwRwRqbbbqKyqoK',
    '.RrrrRqBbdqKyyoK',
    '.RrrrRqbbdqKyqoK',
    '.RRRRRqqqqqKKKKK',
    '................',
]

# bonheur : même disque que 🙂 (art_gens.py), yeux plissés en arcs, joues roses, grand sourire
_DISQUE = [
    '.....KKKKKK.....',
    '...KKYYYyyyKK...',
    '..KYYyyyyyyyyK..',
    '.KYYyyyyyyyyyoK.',
    '.KYyyyyyyyyyyoK.',
    'KYyyyyyyyyyyyyoK',
    'KYyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyyoK',
    'KyyyyyyyyyyyyooK',
    'KyyyyyyyyyyyyooK',
    '.KyyyyyyyyyyyoK.',
    '.KoyyyyyyyyyooK.',
    '..KooyyyyyyooK..',
    '...KKooooooKK...',
    '.....KKKKKK.....',
]


def overlay(base, rows):
    """Superpose une grille de lettres ('.' = garder) sur une grille de base."""
    return [''.join(b if t == '.' else t for b, t in zip(rb, rt)) for rb, rt in zip(base, rows)]


ICONS['😊'] = overlay(_DISQUE, [
    '................',
    '................',
    '................',
    '................',
    '................',
    '....e....e......',
    '...e.e..e.e.....',
    '................',
    '..cc......cc....',
    '..cc......cc....',
    '....m....m......',
    '.....mmmm.......',
    '................',
    '................',
    '................',
    '................',
])

# Poteau indicateur de bord de chemin (carte), 20×28 natif, même facture que assets/sign.png :
# planche en flèche vers la gauche, petite silhouette de ville claire dessus.
ART = {}
ART['carte-panneau_ville'] = [
    '....................',
    '....................',
    '....................',
    '....................',
    '.....111111111111111',
    '....1555555555555551',
    '...15444444444444431',
    '..154444444448444431',
    '.1544444844488844431',
    '15444448884488844431',
    '13444488888488888431',
    '.1344488888888888431',
    '..134444444444444431',
    '...13333333333333331',
    '....1222222222222221',
    '.....111111111111111',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '.........1321.......',
    '......7771321777....',
    '.......77777777.....',
    '....................',
]
