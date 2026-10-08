# Lot « nature » : tournesol, arbre, herbes, soleil, lune, lever du jour, pluie, flocon, feu,
# feuilles d'automne, châtaigne, plante en pot, poire, aubergine, ail, vanille, paille, glaçon.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
#
# Les grilles ci-dessous ne donnent que le REMPLISSAGE : le contour de 1 px est ajouté
# automatiquement autour (fonction contour), dans la teinte très sombre de la matière voisine
# (table SOMBRE). Les verts des plantes sont ceux de assets/crops.png.

PALETTE = {
    # végétal (verts de crops.png)
    'G': '#0e4a3c', 'g': '#1f6650', 'l': '#3f8a44', 'L': '#6aae48', 'm': '#9ccf78',
    # or / jaune
    'K': '#3a2414', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a', 'O': '#8a5418',
    # cœur du tournesol
    'N': '#4a2a14', 'n': '#7e4f2c', 'a': '#a65a2b',
    # bois
    'k': '#2e1c10', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48',
    # glace, eau
    'q': '#163a5c', 'd': '#2a70b0', 'b': '#4aa0e0', 'i': '#8cc8f0', 'B': '#c8ecff', 'w': '#ffffff',
    # nuage
    'c': '#2a3444', 'X': '#7d8c9e', 'x': '#aab6c4', 'C': '#dfe6ee',
    # feu
    'R': '#5a1a0a', 'r': '#d84a20', 'f': '#f08a20', 'F': '#ffd040',
    # aubergine (violets de crops.png)
    'P': '#22163a', 'p': '#3c2858', 'v': '#59407a', 'V': '#6a4a8c', 'u': '#9a74b8',
    # ail
    'H': '#3e2c3c', 'E': '#f6f2ea', 'e': '#ddd6c8', 'h': '#aaa294',
    # terre cuite
    'Z': '#4a1e10', 'J': '#8a3a22', 'z': '#b8583a', 'j': '#e08a5a',
    # poire
    '1': '#34420e', '5': '#6a8a20', '2': '#9ab830', '3': '#c8d448', '4': '#eef09a',
    # lune
    'M': '#f4e4a0', 'W': '#fffbe2', 'A': '#d2b866',
    # ciel du matin
    '8': '#c84a50', '7': '#ec7046', '6': '#f8a050',
    # châtaigne
    '9': '#4e2210', 'Q': '#7e3a1c', 'U': '#b0643a', '0': '#ecd6a8', '-': '#c8a878',
    # vanille
    'S': '#4a2c18',
}

# couleur de remplissage → couleur du contour posé à côté
SOMBRE = {}
for _fill, _out in [('glLm', 'G'), ('YyoOM WA', 'K'), ('Nna', 'K'), ('stTS', 'k'),
                    ('dbiBw', 'q'), ('XxC', 'c'), ('rfF', 'R'), ('pvVu', 'P'),
                    ('Eeh', 'H'), ('Jzj', 'Z'), ('23455', '1'), ('876', '8'),
                    ('QU0-', '9')]:
    for _c in _fill:
        if _c != ' ':
            SOMBRE[_c] = _out
SOMBRE['8'] = 'R'
SOMBRE['7'] = 'R'
SOMBRE['6'] = 'R'


def vide():
    return [['.'] * 16 for _ in range(16)]


def grille(rows):
    assert len(rows) == 16, len(rows)
    for r in rows:
        assert len(r) == 16, r
    return [list(r) for r in rows]


def contour(g, sombre=SOMBRE, coins=False):
    """Ajoute le contour de 1 px autour du remplissage (voisinage 4, ou 8 si coins)."""
    out = [row[:] for row in g]
    vois = [(0, -1), (-1, 0), (1, 0), (0, 1)]
    if coins:
        vois += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for y in range(16):
        for x in range(16):
            if g[y][x] != '.':
                continue
            for dx, dy in vois:
                X, Y = x + dx, y + dy
                if 0 <= X < 16 and 0 <= Y < 16 and g[Y][X] != '.':
                    c = g[Y][X]
                    out[y][x] = sombre.get(c, c)
                    break
    return [''.join(r) for r in out]


def gelule(g, a, b, ra, rb, teintes, lum=(-0.7, -0.7)):
    """Remplit une « gélule » (disques de rayon ra→rb le long du segment a→b), ombrée :
    teintes = (reflet, base, ombre, ombre profonde), lumière en haut à gauche."""
    import math
    (ax, ay), (bx, by) = a, b
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy or 1e-9
    n = math.hypot(*lum)
    lx, ly = lum[0] / n, lum[1] / n
    for y in range(16):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / L2))
            cx, cy = ax + t * vx, ay + t * vy
            r = ra + (rb - ra) * t
            dx, dy = px - cx, py - cy
            d = math.hypot(dx, dy)
            if d > r:
                continue
            s = (dx * lx + dy * ly) / r
            if s > 0.45:
                c = teintes[0]
            elif s > -0.3:
                c = teintes[1]
            elif s > -0.7 or len(teintes) < 4:
                c = teintes[2]
            else:
                c = teintes[3]
            g[y][x] = c
    return g


def poser(g, rows):
    """Superpose une grille de 16 rangées (les '.' laissent voir le dessous)."""
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.':
                g[y][x] = c
    return g


ICONS = {}

# ---------------------------------------------------------------- tournesol
ICONS['🌻'] = contour(grille([
    '................',
    '.....Y..Y.......',
    '..YY.YyYyy.o....',
    '..YYyyNNNNyoo...',
    '...yyNannnNoo...',
    '.YyyNaannnnNyoo.',
    '..yyNannnnnNoo..',
    '.YyyNnnnnnnNyoo.',
    '..yyNnnnnnnNoo..',
    '...yyNnnnnNoo...',
    '..yyooNNNNNooo..',
    '...o.oo.lgo.o...',
    '...Ll...lg.LLl..',
    '..mLLl..lgLllg..',
    '...lllg.lglgg...',
    '................',
]))

# ---------------------------------------------------------------- arbre
ICONS['🌳'] = contour(grille([
    '................',
    '......mLLl......',
    '....mmLLLLll....',
    '...mLLLmLLllg...',
    '..mLLLmLLLlllg..',
    '..LLLLLLllllgg..',
    '.mLLmLllllglggg.',
    '.LLmLLlllgllggg.',
    '.LLLllllgllgggg.',
    '..lllllggglggg..',
    '...llgggtsgggg..',
    '.......Tts......',
    '.......Tts......',
    '.......tts......',
    '......tt.ss.....',
    '................',
]))

# ---------------------------------------------------------------- herbes / houblon
ICONS['🌿'] = contour(grille([
    '................',
    '...........mL...',
    '.....mL...mLLl..',
    '....mLLl..LLlg..',
    '....LLlg.lg.....',
    '.....lgg.g..mL..',
    '.........g.mLLl.',
    '..mLl...g.LLlg..',
    '.mLLlg..g.lgg...',
    '..Llgg.g........',
    '......g..mLl....',
    '......g.mLLlg...',
    '.....g...Llgg...',
    '....g...........',
    '...g............',
    '................',
]))

# ---------------------------------------------------------------- soleil
ICONS['☀'] = contour(grille([
    '................',
    '.......Yy.......',
    '..Yy...yo...Yy..',
    '..yo........yo..',
    '......YYyy......',
    '.....YYYyyy.....',
    '....YYyyyyyo....',
    '.Yy.YyyyyyyoYy..',
    '.yo.yyyyyyyoyo..',
    '....yyyyyyoo....',
    '.....yyyyoo.....',
    '......oooo......',
    '..Yy........Yy..',
    '..yo...Yy...yo..',
    '.......yo.......',
    '................',
]))


def _lune():
    import math
    g = vide()
    for y in range(16):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            d1 = math.hypot(px - 7.5, py - 8.0)
            d2 = math.hypot(px - 10.8, py - 5.6)
            if d1 <= 6.6 and d2 > 5.6:
                # reflet sur le bord gauche-haut, ombre près du creux et en bas
                if d1 > 5.2 and (px - 7.5) + (py - 8.0) < -1.5:
                    g[y][x] = 'W'
                elif d2 < 7.0 or (py > 12.0 and px > 6.0):
                    g[y][x] = 'A'
                else:
                    g[y][x] = 'M'
    return contour(g)


ICONS['🌙'] = _lune()

# ---------------------------------------------------------------- lever du jour
ICONS['🌅'] = contour(grille([
    '................',
    '..888888888888..',
    '.88888888888888.',
    '.88888888888888.',
    '.77777777777777.',
    '.77777777777777.',
    '.66666YYYy66666.',
    '.6666YYyyyy6666.',
    '.666YYyyyyyo666.',
    '.666Yyyyyyyo666.',
    '.LLLLLLLLLLLLLL.',
    '.lllLLlllllLLll.',
    '.lglllllgglllgl.',
    '.gggggggggggggg.',
    '..gggggggggggg..',
    '................',
]))

# ---------------------------------------------------------------- pluie
ICONS['🌧'] = contour(grille([
    '................',
    '................',
    '......CCC.......',
    '.....CCCCCxCC...',
    '...CCCCCCxxCCx..',
    '..CCCxxxxxxxxxx.',
    '..CxxxxxxxxxxXX.',
    '...XXXXXXXXXXX..',
    '................',
    '................',
    '...B....B....B..',
    '...b....b....b..',
    '................',
    '.....B....B.....',
    '.....b....b.....',
    '................',
]))


ICONS['❄'] = contour(grille([
    '................',
    '.......B........',
    '.....B.B.B......',
    '......BBB.......',
    '.B.....B.....B..',
    '..BB...B...BB...',
    '.BB.BB.B.BB.BB..',
    '......BwB.......',
    '.BB.BB.B.BB.BB..',
    '..BB...B...BB...',
    '.B.....B.....B..',
    '......BBB.......',
    '.....B.B.B......',
    '.......B........',
    '................',
    '................',
]))

# ---------------------------------------------------------------- feu
ICONS['🔥'] = contour(grille([
    '................',
    '.......f........',
    '......ff........',
    '......fff..f....',
    '.....ffff..ff...',
    '..f..fffff.ff...',
    '..ff.ffFfffff...',
    '..fffffFFffff...',
    '..ffffFFYFfff...',
    '.ffffFFYYFFfff..',
    '.fffFFYYYYFfrf..',
    '.rffFFYYYYFFfr..',
    '.rfffFYYYFFffr..',
    '..rrffFFFFffr...',
    '....rrrfffrr....',
    '................',
]))

# ---------------------------------------------------------------- feuilles d'automne
def _feuille(pointe, base, larg, teintes, nervure, queue):
    """Feuille en amande de la pointe à la base, nervure centrale, queue jusqu'à `queue`."""
    g = vide()
    mx, my = (pointe[0] + base[0]) / 2, (pointe[1] + base[1]) / 2
    gelule(g, pointe, (mx, my), 0.7, larg, teintes)
    gelule(g, (mx, my), base, larg, 0.9, teintes)
    trait(g, pointe, base, nervure, debut=0.2)
    trait(g, base, queue, nervure)
    return g


def trait(g, a, b, c, debut=0.0):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    for i in range(n + 1):
        t = i / n
        if t < debut:
            continue
        x, y = int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t)
        if 0 <= x < 16 and 0 <= y < 16:
            g[y][x] = c


def _automne():
    brune = _feuille((1.5, 2.5), (7.5, 11.0), 3.0, ('T', 't', 's', 's'), 's', (6.5, 14.0))
    orange = _feuille((14.5, 1.5), (8.5, 11.0), 3.2, ('y', 'f', 'r', 'r'), 'r', (9.5, 14.0))
    fond = contour(brune)
    dessus = contour(orange)
    g = [list(r) for r in fond]
    poser(g, dessus)
    return [''.join(r) for r in g]


ICONS['🍂'] = _automne()

# ---------------------------------------------------------------- châtaigne
ICONS['🌰'] = contour(grille([
    '................',
    '................',
    '.......U........',
    '......UQ........',
    '.....UUQQ.......',
    '....UUQQQQ......',
    '...UUwQQQQ9.....',
    '..UUwUQQQQQ9....',
    '..UUUQQQQQQ99...',
    '..UQQQQQQQQ99...',
    '..QQQQQQQQQ99...',
    '..00000000---...',
    '...0000000--....',
    '................',
    '................',
    '................',
]))

# ---------------------------------------------------------------- plante en pot
ICONS['🪴'] = contour(grille([
    '................',
    '.......mL.......',
    '..mL..mLLl..Lm..',
    '..LLl.LLlg.LLl..',
    '...Llg.Llg.lgg..',
    '.mLlllglglLlgl..',
    '..lllgLglgllgg..',
    '...gglgggggg....',
    '................',
    '..jjjjjjjjjjjj..',
    '..zzzzzzzzzzzJ..',
    '...jzzzzzzzzJ...',
    '...jzzzzzzzzJ...',
    '....zzzzzzzJ....',
    '....zzzzzzJJ....',
    '................',
]))

# ---------------------------------------------------------------- poire
ICONS['🍐'] = contour(grille([
    '................',
    '.......t.mL.....',
    '.......tLLl.....',
    '......4433......',
    '.....443332.....',
    '.....433332.....',
    '.....333322.....',
    '....43333322....',
    '...4433333322...',
    '..443333333322..',
    '..433333333322..',
    '..333333333225..',
    '..333333332255..',
    '...3333322255...',
    '.....222555.....',
    '................',
]))

# ---------------------------------------------------------------- ail
ICONS['🧄'] = contour(grille([
    '................',
    '.......e........',
    '.......Ee.......',
    '......EEe.......',
    '.....EEEeh......',
    '....EEuEEeh.....',
    '...EEEuEEuehh...',
    '..EEEuEEEueehh..',
    '..EEuEEEEueehh..',
    '.EEEuEEEEuEehhh.',
    '.EEEuEEEEueehhh.',
    '.EEuEEEEEuEehh..',
    '..uuEEEEEuuhh...',
    '...uuuEuuuhh....',
    '....h.h.h.......',
    '................',
]))

# ---------------------------------------------------------------- vanille
ICONS['🫘'] = contour(grille([
    '................',
    '..W.M...........',
    '.WWMMM..........',
    '..MyM........tS.',
    '.MMMAA......tS..',
    '..A.A......tS...',
    '..........tS..tS',
    '.........tS..tS.',
    '........tS..tS..',
    '.......tS..tS...',
    '......tS..tS....',
    '.....tS..tS.....',
    '....tS..tS......',
    '...tS..tS.......',
    '..tS..tS........',
    '................',
]))

# ---------------------------------------------------------------- paille
ICONS['🪹'] = contour(grille([
    '................',
    '................',
    '................',
    '..YYYYrYYYYrYY..',
    '.YYyYYrYyYYrYYY.',
    '.yyyyyryyyyryyy.',
    '.yoyyoryoyyroyo.',
    '.yyyoyryyyorryy.',
    '.oyyyyryoyyryoy.',
    '.yyoyyryyyoryyo.',
    '.yyyyoryyyyroyy.',
    '.oyyyyryoyyryyo.',
    '.ooooooooooooOO.',
    '................',
    '................',
    '................',
]))

# ---------------------------------------------------------------- glaçon
ICONS['🧊'] = contour(grille([
    '................',
    '................',
    '....wBBBBBBBBB..',
    '...wBBBBBBBBBi..',
    '..wwwwwwwwwwii..',
    '.wBBBBBBBBBwii..',
    '.wwBBBBBBBBwii..',
    '.wBBBBBBBBBwii..',
    '.wBBBBBBBBiwii..',
    '.wBBBBBBBiiwii..',
    '.wBBBBBBiiiwib..',
    '.wBBBBBiiiiwb...',
    '.wiiiiiiiiiwb...',
    '.wiiiiiiiiiw....',
    '................',
    '................',
]))


def _aubergine():
    g = vide()
    gelule(g, (5.0, 10.6), (10.0, 5.6), 4.2, 2.6, ('u', 'V', 'v', 'p'))
    poser(g, [
        '................',
        '............g...',
        '...........lg...',
        '........LLllglL.',
        '.........LllggL.',
        '..........Llg...',
        '...........l....',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
    ])
    return contour(g)


ICONS['🍆'] = _aubergine()
