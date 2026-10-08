# Lot « lieux et bêtes » : maisons, cabane, ruine, chantier, fontaine, chariot, panier, carton,
# seau, bidon d'huile, poubelle, laine, vache, chien, chat, empreintes.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
PALETTE = {
    # bois (maison, cabane, seau)
    'K': '#2e1a12', 's': '#6a4426', 't': '#8a5a34', 'u': '#b07a48', 'U': '#d8a868',
    # murs crème
    'c': '#f2e6cc', 'C': '#d2bc98',
    # toit bordeaux (comme la maison de la carte)
    'X': '#2a0c18', 'R': '#5e1a2a', 'r': '#8a2c3e', 'p': '#b8465a',
    # vitre / eau
    'q': '#163a5c', 'd': '#2a70b0', 'b': '#4aa0e0', 'B': '#c4e8ff',
    # végétal
    'G': '#1f4a22', 'g': '#2f6e2c', 'l': '#4a9a3a', 'm': '#8cd06a',
    # métal / pierre
    'A': '#262a36', 'a': '#5a6272', 'i': '#8c96a4', 'I': '#c4ccd6', 'w': '#ffffff',
    # or / huile
    'O': '#3a2414', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a', 'n': '#8a5418',
    # paille (chaume, osier)
    'J': '#3a2a10', 'h': '#ecc870', 'H': '#c99a48', 'j': '#94682a',
    # ruine (teintes ternes)
    'Z': '#2a221e', 'x': '#a89a86', 'v': '#7e7062', 'V': '#5a4e44', 'f': '#7a5656', 'F': '#523a3c',
    # briques
    '%': '#c0603a', '&': '#8a3a24', '*': '#3a1810',
    # carton
    '+': '#e8bc7c', 'e': '#c8925a', 'E': '#f6e6b8', 'k': '#9a6a38',
    # laine
    '0': '#4a3624', '9': '#b8a07c', 'W': '#fbf4e4',
    # vache (palette de vache.png)
    '1': '#2d0b0b', '2': '#332e29', '3': '#e9e1d4', '4': '#d2cabf', '5': '#b25162', '6': '#e08c9c',
    '7': '#a68f7e',
    # chien
    'D': '#2e1a10', 'L': '#e2b878', 'P': '#c08a50', 'Q': '#7a4a28', 'z': '#f6e8cc',
    # chat (palette de chat.png)
    '8': '#2a1521', 'T': '#eabb68', 'S': '#d19f4b', 'N': '#cf7128', 'M': '#a24b1e', 'c2': '#000',
}
del PALETTE['c2']

ICONS = {}


def overlay(base, over):
    """Recopie les lettres de `over` (hors '.') par-dessus `base`."""
    return [''.join(o if o != '.' else b for b, o in zip(rb, ro)) for rb, ro in zip(base, over)]


ICONS['🏠'] = [  # maison : toit bordeaux, murs crème, fenêtre et porte
'................',
'.......XX.......',
'......XprX......',
'.....XpprRX.....',
'....XpprrrRX....',
'...XpprrrrRRX...',
'..XpprrrrrrRRX..',
'.XpprrrrrrrrRRX.',
'.XXXXXXXXXXXXXX.',
'..KccccccccccK..',
'..KqqqqcKKKKCK..',
'..KqBbqcKutKCK..',
'..KqbdqcKtsKCK..',
'..KqqqqcKtsKCK..',
'..KCCCCCKtsKCK..',
'..KKKKKKKKKKKK..',
]

ICONS['🏡'] = overlay(ICONS['🏠'], [  # même maison, avec une haie devant
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'.GGG............',
'GmmlGG.....GGG..',
'GmlllgG...GmmlG.',
'GllgggG...GllgG.',
'.GGGGG.....GGG..',
])

ICONS['🛖'] = [  # cabane : toit de chaume, murs de planches
'................',
'.......JJ.......',
'......JhhJ......',
'.....JhhhHJ.....',
'....JhhhhHHJ....',
'...JhhHhhhHHJ...',
'..JhhhhhHhhHjJ..',
'.JhhhhHhhhhHjjJ.',
'.JJjJJjJJjJJjJJ.',
'...KuttKKKKtsK..',
'...KuttKssKtsK..',
'...KuttKssKtsK..',
'...KuttKssKtsK..',
'...KuttKssKtsK..',
'...KKKKKKKKKKK..',
'................',
]

ICONS['🏚'] = [  # maison en ruine : toit troué, fenêtre condamnée, teintes ternes
'................',
'.......ZZ.......',
'......ZffZ......',
'.....ZffFFZ.....',
'....ZffZZFFZ....',
'...ZffZZZZFFZ...',
'..ZffFZZZFFFFZ..',
'.ZffFFFZFFFFZ...',
'.ZZZZZZZZZZZZ.Z.',
'..ZxvxxvxxvxvZ..',
'..ZxZZZZvZZZvZ..',
'..ZvZxVZxZVZxZ..',
'..ZxZVxZvZVZvZ..',
'..ZvZZZZxZVxZZ..',
'..ZxvxxvxZVZxZ..',
'..ZZZZZZZZZZZZ..',
]

ICONS['🏗'] = [  # chantier : grue jaune et mur de briques en cours
'................',
'...OO...........',
'.OOyyOOOOOOOOOO.',
'.OYyyYYYYYYYYyO.',
'.OOyoOOOOOOOOOO.',
'...OyoO......O..',
'...OyoO......O..',
'...OyoO.....OoO.',
'...OyoO......O..',
'...OyoO.........',
'...OyoO...***...',
'...OyoO..*%%&*..',
'...OyoO.**&**%*.',
'...OyoO.*%%*%&*.',
'..OOOOOO*&*%&**.',
'..OooooO********',
]

ICONS['⛲'] = [  # fontaine : jet d'eau, vasque, bassin de pierre
'......qqqq......',
'....qqBBbbqq....',
'...qBBqbbqqbq...',
'..qBq.qbdq.qbq..',
'..qbq.qbdq.qdq..',
'..qbqAAAAAAqdq..',
'..qbAIIiiiaAdq..',
'..qb.AaaaaA.dq..',
'..qq..AiaA..qq..',
'.AAAAAAiaAAAAAA.',
'AIIIqbBbbbdqiiaA',
'AIiiqqqqqqqqiaaA',
'AIIIIIIiiiiiiaaA',
'AiiiiiiiiiiaaaaA',
'.AAAAAAAAAAAAAA.',
'................',
]

ICONS['🛒'] = [  # chariot de courses
'................',
'................',
'AA..............',
'ArA.............',
'.AA.............',
'..AAAAAAAAAAAAA.',
'..AIiIiIiIiIiaA.',
'..AiAiAiAiAiAaA.',
'...AIiIiIiIiaA..',
'...AiAiAiAiAaA..',
'....AAAAAAAAA...',
'....A.......A...',
'...AAAAAAAAAAA..',
'...AaA.....AaA..',
'...AAA.....AAA..',
'................',
]

ICONS['🧺'] = [  # panier en osier
'................',
'................',
'.....JJJJJJ.....',
'....JHjjjjHJ....',
'...JH.....jHJ...',
'...Jj......jJ...',
'.JJJJJJJJJJJJJJ.',
'.JhhhhhhhhhhHjJ.',
'.JJJJJJJJJJJJJJ.',
'..JhHhHhHhHhjJ..',
'..JHhHhHhHhHjJ..',
'..JhHhHhHhHhjJ..',
'...JHhHhHhHjJ...',
'...JjjjjjjjjJ...',
'....JJJJJJJJ....',
'................',
]

ICONS['📦'] = [  # carton fermé, ruban adhésif
'................',
'....OOOOOOOOOOO.',
'...O+++++EE+OkO.',
'..O+++++EE++OkO.',
'.OOOOOOOEEOOOkO.',
'.OeeeeeeEEeeOkkO',
'.OeeeeeeEEeeOkkO',
'.OeeeeeeEEeeOkkO',
'.OeeeeeeeeeeOkkO',
'.OeeeeeeeeeeOkkO',
'.OeeeeeeeeeeOkkO',
'.OeeeeeeeeeeOkO.',
'.OeeeeeeeeeeOO..',
'.OOOOOOOOOOOO...',
'................',
'................',
]

ICONS['🪣'] = [  # seau en bois cerclé de métal, anse
'................',
'.....AAAAAA.....',
'....A......A....',
'...A........A...',
'..A..........A..',
'.KKKKKKKKKKKKKK.',
'.KssssssssssssK.',
'.KKKKKKKKKKKKKK.',
'..AIiiiiiiiiaA..',
'..KUuutuuutusK..',
'..KUuutuuutusK..',
'...AIiiiiiiaA...',
'...KUutuuutsK...',
'...KUutuuutsK...',
'...KKKKKKKKKK...',
'................',
]

ICONS['🛢'] = [  # bidon d'huile de tournesol doré, bouchon, goutte
'.........OO.....',
'....OOOOOyyO....',
'...OYYYYYYYyO...',
'...OooooooonO...',
'...OYyyyyyyoO...',
'...OYyyyyyyoO...',
'...OnnnnnnnnO...',
'...OYyyynyyoO...',
'...OYyynnnyoO...',
'...OYyynnnyoO...',
'...OnnnnnnnnO...',
'...OYyyyyyyoO...',
'...OYyyyyyyoO...',
'...OyoooooonO...',
'....OOOOOOOO....',
'................',
]

ICONS['🗑'] = [  # poubelle en métal
'................',
'......AAAA......',
'......A..A......',
'..AAAAAAAAAAAA..',
'.AIIIIIIIIIiiaA.',
'.AAAAAAAAAAAAAA.',
'..AIiaiiaiiaaA..',
'..AIiaiiaiiaaA..',
'..AIiaiiaiiaaA..',
'..AIiaiiaiiaaA..',
'...AiaiiaiiaA...',
'...AiaiiaiiaA...',
'...AiaiiaiiaA...',
'...AaaaaaaaaA...',
'....AAAAAAAA....',
'................',
]

ICONS['🧶'] = [  # pelote de laine crème, brin qui dépasse
'................',
'.....000000.....',
'...00WWccc900...',
'..0WWc99ccc990..',
'..0Wc9cccc9cc0..',
'.0Wcc9ccc9ccc90.',
'.0Wc9ccc9ccc9c0.',
'.0cc9cc9ccc9cc0.',
'.0c9ccc9cc9cc90.',
'.0c9cc9ccc9c990.',
'.0cc9c9cc9cc990.',
'..0c99cc9c9990..',
'..0cc9cc99990...',
'...00999990c0...',
'.....00000.0c00.',
'............0cc0',
]

ICONS['🐄'] = [  # vache pie noire de profil (palette de vache.png)
'................',
'................',
'................',
'...........1..1.',
'..........171171',
'..........122221',
'.111111111233131',
'.122333332233331',
'.122233322236661',
'.123333222366561',
'.144332223411111',
'.1441661441.....',
'.1441111441.....',
'.1221..1221.....',
'.1111..1111.....',
'................',
]

ICONS['🐶'] = [  # tête de chien brun clair, oreilles tombantes
'................',
'....DDDDDDDD....',
'.DDDLLLLLLLPDDD.',
'DQQDLLLLLLLPDQQD',
'DQQDLDLLLLDPDQQD',
'DQQDLDLLLLDPDQQD',
'DQQDLLLzzLLPDQQD',
'DQQDLLzzzzLPDQQD',
'DQQDLzzDDzzPDQQD',
'.DQDPzzDDzzPDQD.',
'..DDPzDzzDzPDD..',
'...DPPz66zPPD...',
'....DDDDDDDD....',
'................',
'................',
'................',
]

ICONS['🐱'] = [  # tête de chat roux (palette de chat.png)
'................',
'..8..........8..',
'..88........88..',
'..8T8......8N8..',
'..8T58888885N8..',
'.8TSSSMSSMSSSN8.',
'.8TSSSSSSSSSSN8.',
'.8TSl8SSSSl8SN8.',
'.8TSl8SSSSl8SN8.',
'8TSSSSS55SSSSSN8',
'.8zzzS8558SzzzM8',
'..8zzzzzzzzzz8..',
'...88zzzzzz88...',
'.....888888.....',
'................',
'................',
]

_PAW = [  # une empreinte : quatre doigts en arc et un coussinet (silhouette pleine)
'..uu.ut..',
'..ts.ts..',
'ut.....ut',
'ts.uut.ts',
'..utttt..',
'.utttttss',
'.tttttss.',
'..sssss..',
]


def _paws():
    g = [['.'] * 16 for _ in range(16)]
    for ox, oy in ((7, 0), (0, 8)):
        for y, row in enumerate(_PAW):
            for x, ch in enumerate(row):
                if ch != '.':
                    g[oy + y][ox + x] = ch
    return [''.join(r) for r in g]


ICONS['🐾'] = _paws()  # deux empreintes de pattes
