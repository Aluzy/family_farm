# Lot « symboles » : pictogrammes d'interface (avertissement, coche, croix, cadenas, chrono…).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
# Les formes géométriques sont calculées (disques, croix, étoiles) puis contournées et
# ombrées par les petites fonctions ci-dessous ; les autres sont dessinées à la main.
import math

PALETTE = {
    # or
    'K': '#3a2414', 'Y': '#fbe38a', 'y': '#f2c040', 'o': '#c7862a', 'O': '#8a5418',
    # rouge
    'R': '#4a1418', 'p': '#f08a84', 'r': '#c8404a', 'd': '#8a2430',
    # vert
    'G': '#1f4a22', 'm': '#8cd06a', 'g': '#4a9a3a', 'h': '#2f6e2c',
    # bleu
    'q': '#163a5c', 'B': '#9cd4f8', 'b': '#4aa0e0', 'n': '#2a70b0',
    # blanc, crème
    'w': '#ffffff', 'W': '#dfe6ee', 'e': '#f6efe0', 'E': '#d8c6a8',
    # acier
    'A': '#262c36', 'L': '#e0e6ee', 'a': '#a0aab6', 'i': '#66707e',
    # bois
    'U': '#d09a60', 'u': '#b07a48', 't': '#8a5a34', 'T': '#6a4426',
    # verre, sable
    'v': '#2a4a5c', 'c': '#d4eef8', 'S': '#f0c868', 's': '#c8903a',
    # gomme, mine, bulle
    'P': '#f4a6b4', 'Q': '#c8687e', 'Z': '#4a4a58', 'k': '#3a2a24', 'C': '#5a8ac0',
}

# ---------------------------------------------------------------- outils de dessin

def blank():
    return [['.'] * 16 for _ in range(16)]


def rows(cv):
    return [''.join(r) for r in cv]


def inb(x, y):
    return 0 <= x < 16 and 0 <= y < 16


def disc(cx, cy, r):
    return {(x, y) for x in range(16) for y in range(16)
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r}


def layer(cv, cells, base, hi=None, sh=None, ol=None):
    """Pose une forme pleine : contour 4-voisins en `ol`, reflet en haut à gauche, ombre en bas à droite."""
    cells = {c for c in cells if inb(*c)}
    if ol:
        for (x, y) in cells:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if inb(*n) and n not in cells:
                    cv[n[1]][n[0]] = ol
    for (x, y) in cells:
        up = (x, y - 1) not in cells or (x - 1, y) not in cells
        dn = (x, y + 1) not in cells or (x + 1, y) not in cells
        ch = base
        if up and not dn and hi:
            ch = hi
        elif dn and not up and sh:
            ch = sh
        cv[y][x] = ch
    return cells


def put(cv, ch, pts):
    for (x, y) in pts:
        if inb(x, y):
            cv[y][x] = ch


ICONS = {}

# ---------------------------------------------------------------- ⚠ avertissement
ICONS['⚠'] = [
    '................',
    '.......KK.......',
    '......KYyK......',
    '......KYyK......',
    '.....KYyyoK.....',
    '.....KYKKoK.....',
    '....KYyKKyoK....',
    '....KYyKKyoK....',
    '...KYyyKKyyoK...',
    '...KYyyKKyyoK...',
    '..KYyyyyyyyyoK..',
    '..KYyyyKKyyyoK..',
    '.KYyyyyKKyyyyoK.',
    '.KyyyyyyyyyyyoK.',
    'KoooooooooooooOK',
    'KKKKKKKKKKKKKKKK',
]

# ---------------------------------------------------------------- ✅ / ⬜ cases d'objectif

def case(fill, hi, sh, ol):
    cv = blank()
    for x in range(2, 14):
        cv[1][x] = cv[14][x] = ol
    for y in range(2, 14):
        cv[y][1] = cv[y][14] = ol
        for x in range(2, 14):
            cv[y][x] = fill
    for x in range(2, 14):
        cv[2][x] = hi
        cv[13][x] = sh
    for y in range(2, 14):
        cv[y][2] = hi
        cv[y][13] = sh
    cv[2][13] = fill
    cv[13][2] = fill
    return cv


COCHE = [(11, 4), (12, 4), (10, 5), (11, 5), (12, 5), (9, 6), (10, 6), (11, 6),
         (3, 7), (4, 7), (8, 7), (9, 7), (10, 7), (3, 8), (4, 8), (5, 8), (7, 8), (8, 8), (9, 8),
         (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (5, 10), (6, 10), (7, 10), (6, 11)]
cv = case('g', 'm', 'h', 'G')
put(cv, 'h', [(x, y + 1) for (x, y) in COCHE if (x, y + 1) not in COCHE])  # ombre portée
put(cv, 'w', COCHE)
ICONS['✅'] = rows(cv)
ICONS['⬜'] = rows(case('e', 'w', 'E', 'G'))

# ---------------------------------------------------------------- ❌ croix rouge
cv = blank()
layer(cv, {(x, y) for x in range(2, 14) for y in range(2, 14)
           if abs(x - y) <= 1 or abs(x + y - 15) <= 1}, 'r', 'p', 'd', 'R')
ICONS['❌'] = rows(cv)

# ---------------------------------------------------------------- ⛔ sens interdit
cv = blank()
layer(cv, disc(7.5, 7.5, 6.6), 'r', 'p', 'd', 'R')
put(cv, 'w', [(x, y) for x in range(3, 13) for y in (6, 7)])
put(cv, 'W', [(x, 8) for x in range(3, 13)])
ICONS['⛔'] = rows(cv)

# ---------------------------------------------------------------- ➕ plus vert
cv = blank()
layer(cv, {(x, y) for x in range(2, 14) for y in range(2, 14)
           if 6 <= x <= 9 or 6 <= y <= 9}, 'g', 'm', 'h', 'G')
ICONS['➕'] = rows(cv)

# ---------------------------------------------------------------- ℹ information
cv = blank()
layer(cv, disc(7.5, 7.5, 6.6), 'b', 'B', 'n', 'q')
put(cv, 'w', [(7, 3), (8, 3), (7, 4), (8, 4)])
put(cv, 'w', [(6, 6), (7, 6), (8, 6)] + [(x, y) for x in (7, 8) for y in range(7, 12)]
    + [(6, 11), (9, 11)])
put(cv, 'W', [(x, 12) for x in range(6, 10)])
ICONS['ℹ'] = rows(cv)

# ---------------------------------------------------------------- ✨ étincelles

def etoile(cx, cy, L, gros):
    s = set()
    for x in range(16):
        for y in range(16):
            dx, dy = abs(x - cx), abs(y - cy)
            if (dx == 0 and dy <= L) or (dy == 0 and dx <= L) or dx + dy <= (2 if gros else 1):
                s.add((x, y))
            if gros and ((dx <= 1 and dy <= 3) or (dy <= 1 and dx <= 3)):
                s.add((x, y))
    return s


cv = blank()
grande = etoile(6, 9, 5, True)
layer(cv, grande, 'y', 'Y', 'o', 'K')
put(cv, 'w', [(6, 9)])
layer(cv, etoile(12, 3, 2, False), 'y', 'Y', 'o', 'K')
layer(cv, {(13, 11), (12, 11), (14, 11), (13, 10), (13, 12)}, 'y', 'Y', 'o', 'K')
ICONS['✨'] = rows(cv)

# ---------------------------------------------------------------- ❤ cœur
ICONS['❤'] = [
    '................',
    '................',
    '...RRR....RRR...',
    '..RpprR..RprrR..',
    '.RpprrrRRrrrrdR.',
    '.RprrrrrrrrrrdR.',
    '.RprrrrrrrrrrdR.',
    '.RrrrrrrrrrrddR.',
    '..RrrrrrrrrrdR..',
    '...RrrrrrrrdR...',
    '....RrrrrrdR....',
    '.....RrrrdR.....',
    '......RrdR......',
    '.......RR.......',
    '................',
    '................',
]

# ---------------------------------------------------------------- 🔒 cadenas
ICONS['🔒'] = [
    '................',
    '.....AAAAAA.....',
    '....ALLLLaaA....',
    '...ALaAAAAaiA...',
    '...ALaA..AaiA...',
    '...ALaA..AaiA...',
    '..KKKKKKKKKKKK..',
    '..KYYYYYYYYYoK..',
    '..KYyyyKKyyyoK..',
    '..KYyyKKKKyyoK..',
    '..KYyyKKKKyyoK..',
    '..KYyyyKKyyyoK..',
    '..KYyyyKKyyyoK..',
    '..KyooooooooOK..',
    '..KKKKKKKKKKKK..',
    '................',
]

# ---------------------------------------------------------------- 🔁 deux flèches en boucle
cv = blank()
haut = {(x, y) for x in range(3, 11) for y in (3, 4)} | {(x, y) for x in (2, 3) for y in range(4, 9)} \
    | {(11, y) for y in range(1, 7)} | {(12, y) for y in range(2, 6)} | {(13, 3), (13, 4)}
haut.discard((2, 3))
bas = {(x, y) for x in range(5, 13) for y in (11, 12)} | {(x, y) for x in (12, 13) for y in range(7, 12)} \
    | {(4, y) for y in range(9, 15)} | {(3, y) for y in range(10, 14)} | {(2, 11), (2, 12)}
bas.discard((13, 12))
layer(cv, haut | bas, 'b', 'B', 'n', 'q')
ICONS['🔁'] = rows(cv)

# ---------------------------------------------------------------- ⏳ sablier
ICONS['⏳'] = [
    '.KKKKKKKKKKKKKK.',
    '.KUuuuuuuuuuutK.',
    '.KKKKKKKKKKKKKK.',
    '..vwcccccccccv..',
    '..vwcccccccccv..',
    '...vcSSSSSSsv...',
    '....vSSSSSsv....',
    '......vSsv......',
    '......vScv......',
    '....vccScccv....',
    '...vcccSScccv...',
    '..vcSSSSSSSscv..',
    '..vSSSSSSSSssv..',
    '.KKKKKKKKKKKKKK.',
    '.KUuuuuuuuuuutK.',
    '.KKKKKKKKKKKKKK.',
]

# ---------------------------------------------------------------- ⏱ chronomètre
cv = blank()
layer(cv, {(7, 1), (8, 1), (6, 1), (9, 1), (7, 2), (8, 2)}, 'a', 'L', 'i', 'A')
layer(cv, {(12, 3), (13, 4), (12, 4)}, 'a', 'L', 'i', 'A')
corps = layer(cv, disc(7.5, 9, 5.6), 'a', 'L', 'i', 'A')
face = disc(7.5, 9, 4.2)
put(cv, 'w', face)
put(cv, 'W', [(x, y) for (x, y) in face if (x + 1, y) not in face or (x, y + 1) not in face])
put(cv, 'A', [(7, y) for y in range(6, 10)] + [(8, 9), (9, 9)])
put(cv, 'r', [(8, 6)])
ICONS['⏱'] = rows(cv)

# ---------------------------------------------------------------- 📅 calendrier « Jour 1 »
ICONS['📅'] = [
    '................',
    '....A......A....',
    '..RRaRRRRRRaRR..',
    '.RprLrrrrrrLrdR.',
    '.RprrrrrrrrrrdR.',
    '.RddddddddddddR.',
    '.kwwwwwwwwwwwWk.',
    '.kwwwwwkkwwwwWk.',
    '.kwwwwkkkwwwwWk.',
    '.kwwwwwkkwwwwWk.',
    '.kwwwwwkkwwwwWk.',
    '.kwwwwwkkwwwwWk.',
    '.kwwwwkkkkwwwWk.',
    '.kWWWWWWWWWWWXk.',
    '.kkkkkkkkkkkkkk.',
    '................',
]
PALETTE['X'] = '#b8c4d0'

# ---------------------------------------------------------------- 🔎 loupe
cv = blank()
manche = {(x, y) for x in range(16) for y in range(16)
          if 9 <= x <= 14 and 9 <= y <= 14 and abs(x - y) <= 1 and x + y >= 19}
layer(cv, manche, 'u', 'U', 't', 'K')
anneau = layer(cv, disc(6, 6, 4.9), 'a', 'L', 'i', 'A')
verre = disc(6, 6, 3.3)
put(cv, 'c', verre)
put(cv, 'B', [(x, y) for (x, y) in verre if x + y >= 14])
put(cv, 'w', [(4, 4), (5, 4), (4, 5)])
ICONS['🔎'] = rows(cv)

# ---------------------------------------------------------------- 💬 bulle de dialogue
ICONS['💬'] = [
    '................',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwWk.',
    'kwwwwwwwwwwwwwWk',
    'kwwwwwwwwwwwwwWk',
    'kwwCCwwCCwwCCwWk',
    'kwwCCwwCCwwCCwWk',
    'kwwwwwwwwwwwwwWk',
    'kwwwwwwwwwwwwWWk',
    '.kWwwwwwwwwWWWk.',
    '..kkwWWkkkkkkk..',
    '...kwWk.........',
    '...kWk..........',
    '..kWk...........',
    '..kk............',
    '................',
]

# ---------------------------------------------------------------- 🎉 cotillon et confettis
cv = blank()


def dans_triangle(px, py, a, b, c):
    def s(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
    p = (px, py)
    d1, d2, d3 = s(p, a, b), s(p, b, c), s(p, c, a)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)


cone = {(x, y) for x in range(16) for y in range(16)
        if dans_triangle(x, y, (1, 14), (2.5, 6.0), (9.0, 12.5))}
layer(cv, cone, 'y', 'Y', 'o', 'K')
for (x, y) in cone:  # rayures rouges
    if (x - y) % 4 == 0 and cv[y][x] != 'K':
        cv[y][x] = 'r'
# serpentins et confettis
layer(cv, {(6, 4), (7, 3), (8, 3), (9, 4)}, 'b', 'B', 'n', 'q')
layer(cv, {(11, 8), (12, 7), (12, 6), (13, 5)}, 'g', 'm', 'h', 'G')
layer(cv, {(11, 1), (12, 1), (11, 2), (12, 2)}, 'r', 'p', 'd', 'R')
layer(cv, {(13, 11), (14, 11), (13, 12), (14, 12)}, 'y', 'Y', 'o', 'K')
layer(cv, {(3, 1), (4, 1)}, 'g', 'm', 'h', 'G')
ICONS['🎉'] = rows(cv)

# ---------------------------------------------------------------- 🏆 trophée
ICONS['🏆'] = [
    '................',
    '..KKKKKKKKKKKK..',
    '..KYYYYYYYYYoK..',
    'KKKYyyyyyyyyoKKK',
    'KYKYyyyyyyyyoKoK',
    'KYKYyyyyyyyyoKoK',
    '.KKKYyyyyyyoKKK.',
    '...KYyyyyyyoK...',
    '....KYyyyyoK....',
    '.....KKyoKK.....',
    '......KyoK......',
    '.....KYyyoK.....',
    '...KKKKKKKKKK...',
    '...KUuuuuuutK...',
    '...KuttttttTK...',
    '...KKKKKKKKKK...',
]

# ---------------------------------------------------------------- 🏅 médaille
cv = blank()
gauche = {(x, y) for y in range(0, 7) for x in range(16) if 2 + y // 2 <= x <= 5 + y // 2}
droite = {(x, y) for y in range(0, 7) for x in range(16) if 10 - y // 2 <= x <= 13 - y // 2}
layer(cv, gauche, 'b', 'B', 'n', 'q')
layer(cv, droite, 'r', 'p', 'd', 'R')
layer(cv, disc(7.5, 10.5, 4.6), 'y', 'Y', 'o', 'K')
anneau_m = [(x, y) for x in range(16) for y in range(16)
            if 2.0 < math.hypot(x - 7.5, y - 10.5) <= 3.0]
put(cv, 'o', [(x, y) for (x, y) in anneau_m if x + y > 18])
put(cv, 'Y', [(x, y) for (x, y) in anneau_m if x + y <= 18])
ICONS['🏅'] = rows(cv)

# ---------------------------------------------------------------- ✏ crayon
cv = blank()
r2 = math.sqrt(2)
crayon = {}
for x in range(16):
    for y in range(16):
        t = ((x - 2) - (y - 13)) / 2 / 11  # 0 à la pointe (2,13), 1 à la gomme (13,2)
        d = ((x - 7.5) + (y - 7.5)) / r2
        larg = 1.6 if t > 0.3 else 0.3 + t * 4.4
        if -0.05 <= t <= 1.0 and abs(d) <= larg:
            crayon[(x, y)] = (t, d)
layer(cv, set(crayon), 'y', 'Y', 'o', 'K')
for (x, y), (t, d) in crayon.items():
    if cv[y][x] == 'K':
        continue
    if t < 0.14:
        cv[y][x] = 'Z'
    elif t < 0.32:
        cv[y][x] = 'U' if d < 0.4 else 't'
    elif t < 0.80:
        cv[y][x] = 'Y' if d < -0.6 else ('o' if d > 0.6 else 'y')
    elif t < 0.88:
        cv[y][x] = 'L' if d < -0.6 else ('i' if d > 0.6 else 'a')
    else:
        cv[y][x] = 'P' if d < 0.6 else 'Q'
ICONS['✏'] = rows(cv)
