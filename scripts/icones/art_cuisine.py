# Icônes du lot « cuisine » : plats, ingrédients et boissons des recettes (data/recipes.json).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
#
# Les grilles ci-dessous ne donnent que l'INTÉRIEUR des objets : le contour de 1 px est ajouté
# par contour(), autour de chaque matière, dans la teinte très sombre que donne SOMBRE.
# ',' = case transparente qui ne doit pas recevoir de contour (trou d'anse).
PALETTE = {
    # fonte / métal sombre
    'I': '#1c1d26', '1': '#353845', '2': '#4f5364', '3': '#6f7488', '4': '#9aa0b4',
    # métal clair (couverts, papier alu)
    'f': '#eef1f6', 'F': '#a8b0c0',
    # bois
    'K': '#3a2414', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48', 'U': '#d8a670',
    # blanc (porcelaine, blanc d'œuf, farine, riz, os, crème)
    'k': '#3a2a24', 'w': '#ffffff', 'e': '#f4ead8', 'E': '#d8c6a8',
    # jaune d'œuf, or, bière
    'O': '#5a3a10', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a',
    # croûte de pain, pâte
    'B': '#4a2410', 'b': '#8a4a1a', 'c': '#b8702a', 'C': '#d8963e', 'L': '#f0c070', 'm': '#f8e4b0',
    # rouge (laque, étiquette, fraise, tomate)
    'R': '#4a1218', 'h': '#8a2a32', 'r': '#b8434a', 'H': '#e8737a',
    # vert (salade, petits pois)
    'G': '#1f4a22', 'g': '#2f6e2c', 'l': '#4a9a3a', 'M': '#8cd06a',
    # bleu (porcelaine, verre)
    'q': '#163a5c', 'd': '#2a70b0', 'u': '#4aa0e0', 'v': '#c4e8ff',
    # chocolat, café
    'X': '#24100a', 'x': '#4a2414', 'z': '#6e3a1e', 'Z': '#9a5a34',
    # fromage, flan
    'N': '#5a3a0a', 'i': '#c08a20', 'J': '#e8b030', 'j': '#f8d860', 'n': '#fff2b0',
    # viande crue et gras
    'p': '#d04a52', 'P': '#f27c7c', 'a': '#962a36', 'A': '#fbeee4', 'S': '#e8c4b4',
    # viande cuite, caramel, ragoût
    '6': '#7a3218', '7': '#a8502a', '8': '#d07a3a', '9': '#f0a860',
    # vapeur
    '0': '#8496b0', 'V': '#f4f8fc',
    # terre cuite
    '$': '#4a1a0a', '%': '#a04a24', '&': '#c8683a', '*': '#e8925a',
    # rose (glace)
    ']': '#5a1a2a', ')': '#c85a78', '(': '#f08aa4', '[': '#ffd0dc',
    # orange (carotte)
    '<': '#e0782a', '>': '#f8a850',
}

# matière → teinte de son contour
SOMBRE = {}
for _fill, _out in (('1234', 'I'), ('fF', 'I'), ('stTU', 'K'), ('weE', 'k'), ('YyoJ', 'O'),
                    ('bcCLm', 'B'), ('hrH', 'R'), ('glM', 'G'), ('duv', 'q'), ('xzZ', 'X'),
                    ('ijn', 'N'), ('pPaAS', 'R'), ('6789', 'B'), ('V', '0'), ('%&*', '$'),
                    ('()[', ']'), ('<>', 'B')):
    for _c in _fill:
        SOMBRE[_c] = _out
CONTOURS = set(SOMBRE.values())


def contour(rows):
    """Complète à 16×16 et entoure chaque matière d'un contour de 1 px (4 voisins)."""
    g = [list(r.ljust(16, '.')) for r in rows] + [list('.' * 16)] * (16 - len(rows))
    g = [r[:] for r in g]
    for y, r in enumerate(g):
        assert len(r) == 16, (y, ''.join(r))
    out = [r[:] for r in g]
    for y in range(16):
        for x in range(16):
            if g[y][x] != '.':
                continue
            votes = {}
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                X, Y = x + dx, y + dy
                if 0 <= X < 16 and 0 <= Y < 16 and g[Y][X] in SOMBRE:
                    o = SOMBRE[g[Y][X]]
                    votes[o] = votes.get(o, 0) + 1
            if votes:
                out[y][x] = max(votes, key=lambda o: votes[o])
    return [''.join(r).replace(',', '.') for r in out]


def sur(base, dessus):
    """Pose la grille « dessus » sur « base » ('.' laisse voir la base)."""
    b = [list(r.ljust(16, '.')) for r in base]
    for y, r in enumerate(dessus):
        for x, ch in enumerate(r):
            if ch != '.':
                b[y][x] = ch
    return [''.join(r) for r in b]


ICONS = {}

# 🍳 cuisiner : poêle en fonte vue de dessus, œuf au plat, manche en bois
ICONS['🍳'] = contour([
    '',
    '',
    '',
    '....44443',
    '...4111113',
    '..411www113',
    '.41wwwwww113',
    '.41wwYyyww133TT',
    '.4wwwyyyww132ts',
    '.41wwyyoEE12',
    '.41EEEEEE112',
    '..311EE1112',
    '...3111112',
    '....22222',
])

# 🍲 plat mijoté : marmite en fonte, ragoût dedans, deux filets de vapeur
ICONS['🍲'] = contour([
    '',
    '.....V....V',
    '.....VV...VV',
    '......V....V',
    '',
    '...4444444443',
    '..49897<977l63',
    '..4l877787<763',
    '..444444444443',
    '.2342222222212',
    '.2342222222212',
    '..342222222211',
    '..332222221111',
    '...3222222111',
])

# 🍽 repas : assiette blanche à filet bleu, fourchette et couteau posés dessus
def _assiette():
    rows = []
    for y in range(16):
        r = ''
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            d = (dx * dx + dy * dy) ** 0.5
            if d > 6.6:
                r += '.'
            elif d > 5.6:  # filet bleu au bord
                r += 'd' if dx + dy > 3 else 'u'
            elif d > 4.0:  # aile
                r += 'E' if dx + dy > 4 else 'e'
            else:
                r += 'E' if dx + dy > 4 else 'w'
        rows.append(r)
    return rows


ICONS['🍽'] = contour(sur(_assiette(), [
    '',
    '',
    '.I.I.......II',
    'IfIfI.....IffI',
    'IfIfI.....IfFI',
    'IfffI.....IfFI',
    '.IfI......IfFI',
    '.IfI......IIFI',
    '.IfI......ITtI',
    '.IfI......ITtI',
    '.IFI......ITtI',
    '.IFI......ITtI',
    '.IFI......ITtI',
    '..I........II',
]))

# 🍞 pain : miche de campagne ronde, grignes claires
ICONS['🍞'] = contour([
    '',
    '',
    '',
    '',
    '.....LLLLCC',
    '...LLLLmCCCCc',
    '..LLLLmCCCmCcc',
    '..LLLmCCCmCCcc',
    '..LLCCCCmCCmcc',
    '..LCCCCmCCmCcc',
    '..CCCCCCCmCccc',
    '..cCCCCCCCcccb',
    '...ccccccccbb',
    '...bbbbbbbbb',
])


# 🥖 baguette : en diagonale, grignes claires
def _baguette():
    g = [['.'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            s = x + y            # 15 = axe de la baguette
            if not (2 <= x <= 13 and 2 <= y <= 13):
                continue
            k = s - 15
            if abs(k) > 1:
                continue
            if (x, y) in ((2, 12), (2, 13), (13, 2), (12, 2), (3, 13), (13, 3)) and k != 0:
                continue
            c = {-1: 'L', 0: 'C', 1: 'c'}[k]
            g[y][x] = c
    for x in (4, 7, 10):  # grignes
        g[15 - x - 1][x] = 'm'
        g[15 - x][x] = 'm' if x != 4 else g[15 - x][x]
    return [''.join(r) for r in g]


ICONS['🥖'] = contour(_baguette())

# 🥧 tarte : tarte aux pommes à croisillons, bord cannelé
def _tarte():
    """Tarte ronde vue de dessus, croisillons, une part déjà coupée (quart bas droit)."""
    import math
    rows = []
    for y in range(16):
        r = ''
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            d = math.hypot(dx, dy)
            lum = -(dx + dy)  # > 0 : côté éclairé (haut gauche)
            if d > 7.0 or (x >= 9 and y >= 9):  # la part coupée
                r += '.'
            elif d > 5.4:  # bord cannelé
                ang = math.atan2(dy, dx)
                creux = int((ang + math.pi) / (2 * math.pi) * 14) % 2
                if lum > 2:
                    r += 'C' if creux else 'L'
                elif lum > -3:
                    r += 'c' if creux else 'C'
                else:
                    r += 'b' if creux else 'c'
            elif (x == 8 and y >= 9) or (y == 8 and x >= 9):  # tranche : pommes
                r += 'n' if (x + y) % 2 else 'j'
            elif (x + y) % 5 == 0 or (x - y) % 5 == 0:  # croisillons en biais
                r += 'm' if lum > 2 else ('L' if lum > -4 else 'C')
            else:
                r += '8' if lum > 4 else ('7' if lum > -3 else '6')
        rows.append(r)
    return rows


ICONS['🥧'] = contour(_tarte())

# 🍚 riz : bol laqué rouge, dôme de riz blanc
ICONS['🍚'] = contour([
    '',
    '',
    '',
    '......wwww',
    '....wwwweee',
    '...wwEwweEee',
    '..wwweeeEeeEe',
    '..weEeeeeEeeE',
    '.HHHHHHHHHHrrr',
    '.HrrrrrrrrrrrhH',
    '..Hrrrrrrrrrhh',
    '..Hrrrrrrrrhhh',
    '....hhhhhhh',
    '.....rrrrh',
])

# 🍫 chocolat : tablette croquée en haut à droite, papier rouge et alu
ICONS['🍫'] = contour([
    '',
    '...Zzzzz.',
    '...ZZZzxZz',
    '...Zzzzxzzz',
    '...zzzzxzzzz',
    '...xxxxxxxxx',
    '...ZZZzxZZZz',
    '...Zzzzxzzzz',
    '...ffFfFffFf',
    '...HrrrrrrrrH',
    '...HyyyyyyyyH',
    '...HrrrrrrrhH',
    '...HrrrrrrrhH',
    '...Hrrrrrrrhh',
    '...hhhhhhhhhh',
])

# 🧀 fromage : part à trous
ICONS['🧀'] = contour([
    '',
    '',
    '',
    '..........nnn',
    '........nnnjnj',
    '......nnnnjjjj',
    '....nnnjjnjjjj',
    '..nnnnjjjjjjjJ',
    '.JJJJJJJJJJJJJ',
    '.jjijjjjjjiijJ',
    '.jiijjjiijiijJ',
    '.jjjjjjiijjjjJ',
    '.jjjjijjjjjjJJ',
    '.JJJJJJJJJJJJJ',
])

# 🫙 bocal : bocal en verre de légumes (carottes, petits pois), couvercle doré
ICONS['🫙'] = contour([
    '',
    '...YYyyyyyyo',
    '...yyyyyyyyo',
    '....oooooooo',
    '....vvvvvvvv',
    '..vvvvvvvvvvvv',
    '..wv<>l<<<l<<v',
    '..wv<<<l<<<<<d',
    '..wvl<<<<l<<<d',
    '..wv<<<l<<<<ld',
    '..wv<l<<<<l<<d',
    '..vv<<<<l<<<<d',
    '..vvvvvvvvvvdd',
    '...dddddddddd',
])

# 🥫 conserve : boîte en fer, étiquette rouge à bande crème
ICONS['🥫'] = contour([
    '',
    '',
    '....ffffff',
    '...fFFFFFFf',
    '...ffffffff',
    '...HrrrrrrhH',
    '...HrrrrrrhH',
    '...eeeeeeeE',
    '...erHrrhreE',
    '...eeeeeeeE',
    '...HrrrrrrhH',
    '...HrrrrrrhH',
    '...ffffffFF',
    '....FFFFFF',
])

# 🥩 viande de mouton : pièce de viande crue, bord de gras
ICONS['🥩'] = contour([
    '',
    '',
    '',
    '.......AAAA',
    '.....AAApppAA',
    '...AAPPPppppAS',
    '..APPPpppAppppS',
    '.APPpppppAAppaS',
    '.APppppppppAppS',
    '.APpppAppppppaS',
    '..SppppAAppppaS',
    '..SSapppppppaS',
    '....SSSaaaaSS',
    '.......SSSS',
])

# 🥣 farine : jatte en bois remplie de farine blanche, cuillère en bois plantée
ICONS['🥣'] = contour([
    '',
    '...........U',
    '..........UT',
    '.........Ut',
    '........Ut',
    '.....wwwTww',
    '...wwwwTeeeee',
    '..wwwweeeeeeEE',
    '.UUUUUUUUUUUUTt',
    '.TTTTTTTTTTTttt',
    '..TTTTTTTTTttt',
    '...tttttttts',
    '.....ssssss',
])

# 🍖 viande de bœuf : viande rôtie sur l'os, os qui dépasse des deux côtés
ICONS['🍖'] = contour([
    '',
    '............w.w',
    '............weE',
    '.......888.weE',
    '.....8888877E',
    '....888877776',
    '...88877777a6',
    '...8877777aa6',
    '...877777aa66',
    '...77777aa66',
    '...7777aa666',
    '..we7aa6666',
    '.weE.6666',
    '.eE',
    '.E.E',
])

# 🍗 viande de volaille : pilon doré
ICONS['🍗'] = contour([
    '',
    '',
    '.......9999',
    '......998888',
    '.....99888887',
    '.....98888877',
    '.....988888776',
    '.....88888776',
    '......887766',
    '.....w7766',
    '....we66',
    '..ww.e',
    '.wwee',
    '.weE',
    '..E',
])

# 🥘 poêlée / gratin : plat en terre cuite à deux anses, dessus gratiné
ICONS['🥘'] = contour([
    '',
    '',
    '',
    '',
    '',
    '....HHHHHHHH',
    '..HHYYYyyyyyHH',
    '.HYYy8yyy8yyyor',
    '.HYy88yyyyy8oor',
    '.rrooyyyyyooorh',
    '.hHHHHHHHHHHHrh',
    '.hhrrrrrrrrrrhh',
    '..hrrrrrrrrrrh',
    '...hhhhhhhhhh',
])

# 🍮 flan : flan doré nappé de caramel, sur une soucoupe
ICONS['🍮'] = contour([
    '',
    '',
    '',
    '',
    '.....777777',
    '....78877776',
    '....n7jj7jj6',
    '....nnjjjj6J',
    '...nnjjjjjjJi',
    '...njjjjjjjJi',
    '...njjjjjjJJi',
    '.weeeeeeeeeeeE',
    '..EEEEEEEEEEE',
])

# 🥗 salade : bol bleu, feuilles vertes, rondelles de tomate
ICONS['🥗'] = contour([
    '',
    '',
    '',
    '.....M.MM',
    '...MMlMMlMM',
    '..MlMMlrlMlg',
    '.MlMrHllMMglg',
    '.lMlrrlMlgrlgg',
    '.vvvvvvvvvvvvvu',
    '.vuuuuuuuuuuuud',
    '..uuuuuuuuuuud',
    '...uuuuuuuuud',
    '....ddddddd',
])

# 🍰 part de gâteau : génoise, crème, fraise
ICONS['🍰'] = contour([
    '',
    '',
    '.........HH',
    '........HHrr',
    '.......wwrrh',
    '.....wwweeeE',
    '...wwweeeeeeE',
    '.wwweeeeeeeeE',
    '.LLLLLCCCCCCc',
    '.wwwwwwweeeeE',
    '.LLLLCCCCCCCc',
    '.CCCCCCCCCccc',
    '.cccccccccccb',
])

# 🍨 glace : coupe en métal, boule rose et boule vanille
ICONS['🍨'] = contour([
    '',
    '',
    '......[[(',
    '.....[((((',
    '..www((((()',
    '.wwwe(((())',
    '.wweee())))',
    '.weeeeE))))',
    '..ffffffffF',
    '..fFFFFFFFF',
    '....fFFFF',
    '......F',
    '......F',
    '....ffFFF',
])

# 🍺 bière : chope en verre, mousse qui déborde
ICONS['🍺'] = contour([
    '',
    '',
    '...wwwww',
    '..wwwwweew',
    '..weewweeee',
    '..YyyyyyyyJ',
    '..YyYyyyyyJOOO',
    '..YyYyyyyyJ,,O',
    '..YyYyyyyyJ,,O',
    '..YyYyyyyyJ,,O',
    '..YyyyyyyyJOOO',
    '..YyyyyyyJJ',
    '..JJJJJJJJo',
])

# ☕ café : tasse fumante sur sa soucoupe
ICONS['☕'] = contour([
    '',
    '....V..V',
    '....VV.VV',
    '.....V..V',
    '',
    '',
    '...zzzzzzzz',
    '...wxxxxxxe',
    '...wweeeeeEkkk',
    '...wweeeeeEk,k',
    '...wweeeeeEkkk',
    '....weeeeE',
    '.weeeeeeeeeeE',
    '..EEEEEEEEEE',
])
