# Les animaux et les trouvailles des biomes à venir du grand monde (docs/grand-monde.md ; ils
# vivaient sur les anciennes cartes de la montagne, de la plage et de la ville), au pixel, dans
# le style des personnages (contour sombre, lumière du haut à gauche) :
#
#   la montagne   la marmotte (assise, à quatre pattes), le bouquetin (debout, en marche),
#                 l'aigle (vu de dessus, en vol : son ombre court au sol)
#   la plage      la mouette (debout, en vol), le crabe (de dessus), le dauphin (son saut)
#   la ville      sur le lac du parc : le cygne et le canard colvert (le mâle, la cane), qui
#                 nagent ou plongent la tête sous l'eau ; le canard, hors de l'eau, debout ou
#                 en marche sur ses pattes (fiche 14)
#   la forêt      le chevreuil (debout, il broute, en marche), le renard roux (assis, debout, en
#                 marche), le lapin de garenne (assis, il saute), l'écureuil roux (assis, il court)
#   la lande      le lièvre (assis, il file), la perdrix grise (debout, elle picore, marche, vol)
#                 (fiche 6b : les bêtes du grand monde, js/carte/ferme/faune-monde.js ; les espèces
#                 d'avant sont dessinées comme avant, au pixel près)
#   trouvailles   l'ammonite et le trilobite (fossiles), le quartz et l'améthyste (pierres),
#                 les herbes de montagne (herbe : dans les prés),
#                 la coquille Saint-Jacques et le bulot (coquillages), le corail, la perle
#
#   python3 scripts/carte/faune.py        écrit assets/faune_<espèce>.png, assets/trouvailles.png
#                                         et assets/faune.json (les cases, leurs noms, l'ancre)
#   python3 scripts/carte/faune.py --apercu    écrit aussi apercu_faune.png
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, ROOT, K, contour, dessin, image, rgba, teinte  # noqa: E402
from PIL import Image  # noqa: E402


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((int(x), int(y)), rgba(c))


def ellipse(im, x0, y0, x1, y1, c, ombre=None, clair=None):
    """Une ellipse pleine (bornes comprises), assombrie en bas à droite, éclairée en haut à gauche."""
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0 + 1) / 2, (y1 - y0 + 1) / 2
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if u * u + v * v > 1:
                continue
            col = c
            if ombre and u * 0.5 + v > 0.45:
                col = ombre
            elif clair and u * 0.6 + v < -0.62:
                col = clair
            px(im, x, y, col)


def trait(im, pts, c, epais=1):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 2))
        for i in range(n + 1):
            x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
            for e in range(epais):
                px(im, round(x), round(y) + e, c)


def fini(im):
    return contour(im, K)


# ---------- la montagne ----------

POIL = (156, 108, 64)
POIL_S = (110, 74, 46)
POIL_C = (198, 156, 106)


def marmotte(pose, k):
    """16 × 16, de profil (vers la droite), les pieds en bas au milieu. pose : 'assise' (debout
    sur ses pattes arrière, k : la tête tournée) ou 'marche' (k : les pattes)."""
    im = image(16, 16)
    if pose == 'assise':
        ellipse(im, 4, 13, 7, 15, POIL_S)                      # la queue, posée
        ellipse(im, 5, 6, 11, 15, POIL, POIL_S, POIL_C)        # le corps
        ellipse(im, 8, 9, 10, 14, POIL_C)                      # le ventre
        hx = 7 + (1 if k else 0)
        ellipse(im, hx, 2, hx + 5, 7, POIL, POIL_S, POIL_C)    # la tête
        px(im, hx + 1, 2, POIL_S)                              # l'oreille
        px(im, hx + 4, 4, K)                                   # l'œil
        px(im, hx + 5, 5, (60, 40, 30))                        # le nez
        px(im, hx + 4, 6, POIL_C)
        px(im, 10, 10, POIL_S)
        px(im, 11, 10, POIL_S)                                 # les pattes avant, repliées
    else:
        ellipse(im, 1, 9, 4, 11, POIL_S)
        ellipse(im, 3, 8, 12, 14, POIL, POIL_S, POIL_C)
        ellipse(im, 10, 6, 14, 11, POIL, POIL_S, POIL_C)
        px(im, 11, 6, POIL_S)
        px(im, 13, 8, K)
        px(im, 14, 9, (60, 40, 30))
        for x, d in ((4, 0), (10, 1)):
            dy = 1 if (k + d) % 2 else 0
            px(im, x, 14 + dy - 1, POIL_S)
            px(im, x + 1, 14, POIL_S)
    return fini(im)


# (le bouquetin : plus bas, avec le chevreuil, d'après le dessin du joueur, fiche 22)


AIGLE = (110, 74, 44)
AIGLE_S = (74, 50, 32)
AIGLE_C = (170, 128, 74)


def aigle(k):
    """32 × 32, vu de dessus, le bec vers le haut ; k : les ailes déployées ou relevées."""
    im = image(32, 32)
    env = 15 if k == 0 else 11                   # la demi-envergure
    for s in (-1, 1):
        # l'aile : un trapèze qui s'effile, les rémiges sombres au bout
        for i in range(env):
            x = 16 + s * (2 + i)
            larg = 6 - i * 3 // env
            for j in range(larg):
                y = 13 + i // 4 + j
                c = AIGLE_S if i > env - 4 else AIGLE_C if j == 0 else AIGLE
                px(im, x, y, c)
            if i > env - 4 and i % 2 == 0:
                px(im, x, 13 + i // 4 + larg, AIGLE_S)
    ellipse(im, 14, 10, 18, 22, AIGLE, AIGLE_S, AIGLE_C)       # le corps
    ellipse(im, 14, 7, 17, 11, (196, 158, 92))                  # la tête dorée
    px(im, 15, 6, (234, 196, 60))
    px(im, 16, 6, (234, 196, 60))                               # le bec
    for x in range(13, 20):
        px(im, x, 23, AIGLE_S if x % 2 else AIGLE)              # la queue
        px(im, x, 24, AIGLE_S)
    return fini(im)


# ---------- la plage ----------

BLANC = (238, 240, 242)
GRIS = (156, 166, 178)
BEC = (236, 184, 58)


def mouette(pose, k):
    """16 × 16. pose 'debout' (de profil, vers la droite ; k : le bec ouvert) ou 'vol' (vue de
    dessus, k : les ailes hautes ou basses)."""
    im = image(16, 16)
    if pose == 'debout':
        trait(im, [(7, 12), (7, 15)], (226, 132, 70))
        trait(im, [(9, 12), (9, 15)], (226, 132, 70))
        ellipse(im, 3, 7, 12, 12, BLANC, teinte(BLANC, 0.82))
        ellipse(im, 3, 7, 10, 10, GRIS, teinte(GRIS, 0.8))      # l'aile repliée
        trait(im, [(2, 9), (4, 9)], (40, 40, 46))               # le bout des ailes
        ellipse(im, 9, 3, 13, 7, BLANC, teinte(BLANC, 0.85))
        px(im, 12, 4, K)
        px(im, 14, 5, BEC)
        px(im, 15, 5, BEC)
        if k:
            px(im, 14, 6, BEC)
    else:
        ellipse(im, 6, 5, 9, 12, BLANC, teinte(BLANC, 0.85))
        y = 7 if k == 0 else 5
        for s in (-1, 1):
            trait(im, [(8 + s * 2, 8), (8 + s * 5, y), (8 + s * 7, y + 1)], GRIS)
            trait(im, [(8 + s * 2, 9), (8 + s * 5, y + 1)], BLANC)
            px(im, 8 + s * 7, y + 1, (40, 40, 46))
        px(im, 7, 4, BEC)
        px(im, 8, 4, BEC)
    return fini(im)


CRABE = (214, 84, 52)
CRABE_S = (156, 52, 36)
CRABE_C = (240, 140, 96)


def crabe(k):
    """16 × 16, vu de dessus ; k : les pattes."""
    im = image(16, 16)
    d = 1 if k else 0
    for s in (-1, 1):
        for i in range(3):
            x0 = 8 + s * 3
            trait(im, [(x0, 9 + i), (x0 + s * 3, 9 + i + (d if i % 2 else -d) - 1 + i)], CRABE_S)
        # les pinces
        trait(im, [(8 + s * 2, 8), (8 + s * 4, 5)], CRABE_S)
        ellipse(im, 8 + s * 5 - 1, 3, 8 + s * 5 + 1, 5, CRABE, CRABE_S, CRABE_C)
    ellipse(im, 4, 7, 11, 12, CRABE, CRABE_S, CRABE_C)
    px(im, 6, 7, K)
    px(im, 9, 7, K)
    return fini(im)


DAUPHIN = (96, 120, 150)
DAUPHIN_S = (68, 88, 114)
DAUPHIN_C = (190, 202, 214)


def dauphin(k):
    """32 × 32 : le saut, de profil (vers la droite). k : 0 il sort de l'eau, 1 il monte, 2 en
    haut, 3 il replonge, 4 la gerbe d'eau seule. La surface de l'eau : la ligne y = 24."""
    im = image(32, 32)
    if k == 4:
        for i, (x, y) in enumerate(((12, 22), (15, 19), (18, 18), (21, 20), (24, 23), (10, 24), (26, 24))):
            ellipse(im, x - 1, y - 1, x + 1, y + 1, (226, 240, 248), (170, 210, 230))
        return fini(im)
    # le corps : une courbe épaisse, de la queue au rostre, selon l'angle du saut
    angle = {0: -50, 1: -25, 2: 0, 3: 35}[k]
    a = math.radians(angle)
    cx, cy = 16, {0: 18, 1: 13, 2: 11, 3: 14}[k]
    pts = []
    for i in range(-10, 11):
        cour = 0.012 * (i * i) * (1 if k != 2 else 0.6)
        x = cx + i * math.cos(a) - cour * math.sin(a) * 6
        y = cy + i * math.sin(a) + cour * 6 * math.cos(a) * 0.4
        pts.append((x, y, i))
    for x, y, i in pts:
        r = 3.2 - abs(i) * 0.22 if i < 7 else 2.2 - (i - 7) * 0.4
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                if dx * dx + dy * dy <= r * r:
                    yy = round(y + dy)
                    if k in (0, 3) and yy > 23:
                        continue                      # sous l'eau
                    px(im, round(x + dx), yy, DAUPHIN_C if dy > r * 0.3 else DAUPHIN if dy > -r * 0.5 else DAUPHIN_S)
    # la queue, l'aileron, l'œil
    xq, yq, _ = pts[0]
    if not (k == 0):
        trait(im, [(xq - 2, yq - 3), (xq, yq), (xq - 2, yq + 3)], DAUPHIN_S, 1)
    xm, ym, _ = pts[9]
    px(im, round(xm - 2 * math.sin(a)), round(ym - 4 * math.cos(a)), DAUPHIN_S)
    px(im, round(xm - 1 - 2 * math.sin(a)), round(ym - 5 * math.cos(a)), DAUPHIN_S)
    xe, ye, _ = pts[17]
    if not (k in (0, 3) and ye > 23):
        px(im, round(xe), round(ye - 1), K)
    if k in (0, 3):
        for x in range(8, 25):
            if 23 <= max(p[1] for p in pts if abs(p[0] - x) < 2) if any(abs(p[0] - x) < 2 for p in pts) else False:
                px(im, x, 24, (226, 240, 248))
    return fini(im)


# ---------- le lac du parc de la ville ----------

REMOUS = (214, 236, 246)
BEC_CYGNE = (232, 122, 44)
PATTE_CANARD = (232, 132, 44)
COLVERT = {'tete': (40, 112, 64), 'tete_s': (24, 76, 44), 'poitrail': (118, 70, 50), 'corps': (176, 174, 168),
           'corps_s': (130, 128, 124), 'bec': (226, 198, 64), 'queue': (40, 40, 46)}
CANE = {'tete': (132, 98, 64), 'tete_s': (96, 70, 46), 'poitrail': (150, 112, 72), 'corps': (156, 118, 76),
        'corps_s': (112, 82, 52), 'bec': (214, 128, 50), 'queue': (110, 80, 52)}


def sous_l_eau(im, y):
    """Ce qui est sous la surface (y et plus bas) n'est pas vu."""
    for yy in range(y, im.height):
        for x in range(im.width):
            im.putpixel((x, yy), (0, 0, 0, 0))


def remous(im, x0, x1, y, k):
    """Les petites vagues autour d'un oiseau qui nage (la ligne y), k : elles bougent."""
    for x in range(x0, x1 + 1):
        if (x + k) % 3 != 2:
            px(im, x, y, REMOUS)
    px(im, x0 - 1 - k % 2, y + 1, REMOUS)
    px(im, x1 + 1 + k % 2, y + 1, REMOUS)


def cygne(pose, k):
    """32 × 32, de profil (vers la droite), posé sur l'eau (la surface : y = 24). pose 'nage'
    (k : le cou se balance) ou 'plonge' (la tête sous l'eau, le cou courbé)."""
    im = image(32, 32)
    ellipse(im, 3, 14, 8, 20, BLANC, teinte(BLANC, 0.84))            # la queue relevée
    ellipse(im, 4, 16, 23, 30, BLANC, teinte(BLANC, 0.82))           # le corps, bas sur l'eau
    ellipse(im, 7, 15, 19, 22, teinte(BLANC, 0.94), teinte(BLANC, 0.8), (255, 255, 255))   # l'aile
    trait(im, [(8, 19), (12, 21), (17, 21)], teinte(BLANC, 0.78))
    if pose == 'nage':
        d = k
        # le cou en S : il part du poitrail, se creuse, la tête penchée en avant
        trait(im, [(19, 19), (22, 17), (23, 14), (22 + d, 11), (20 + d, 9), (20 + d, 6)], BLANC, 2)
        ellipse(im, 19 + d, 3, 24 + d, 7, BLANC, teinte(BLANC, 0.85))
        px(im, 22 + d, 4, K)
        px(im, 24 + d, 4, K)
        for x, y in ((25, 5), (26, 5), (27, 6), (25, 6)):
            px(im, x + d, y, BEC_CYGNE)
    else:
        trait(im, [(19, 19), (23, 16), (26, 17), (27, 21), (27, 24)], BLANC, 2)
    im = fini(im)
    sous_l_eau(im, 24)
    remous(im, 3, 24, 24, k)
    return im


def canard(sorte, pose, k):
    """16 × 16, de profil (vers la droite), posé sur l'eau (la surface : y = 12). sorte : le
    colvert ('m') ou la cane ('f') ; pose 'nage' (k : la tête bouge) ou 'plonge' (la tête sous
    l'eau, la queue en l'air) ; hors de l'eau (fiche 14) : 'debout' (k : la tête bouge) ou 'marche'
    (k : les pattes)."""
    C = COLVERT if sorte == 'm' else CANE
    im = image(16, 16)
    if pose == 'nage':
        trait(im, [(2, 8), (3, 9)], C['queue'])
        ellipse(im, 2, 7, 12, 14, C['corps'], C['corps_s'])
        ellipse(im, 9, 8, 13, 13, C['poitrail'], teinte(C['poitrail'], 0.8))
        ellipse(im, 4, 7, 10, 10, teinte(C['corps'], 0.9), C['corps_s'])       # l'aile
        h = k
        ellipse(im, 10, 3 + h, 13, 7 + h, C['tete'], C['tete_s'])
        px(im, 12, 4 + h, K)
        px(im, 14, 5 + h, C['bec'])
        px(im, 15, 5 + h, C['bec'])
        if sorte == 'm':
            px(im, 10, 8, (238, 238, 232))
            px(im, 11, 8, (238, 238, 232))
    elif pose == 'plonge':
        ellipse(im, 4, 7, 11, 14, C['corps'], C['corps_s'])
        trait(im, [(4, 8), (3, 5), (4, 3)], C['queue'], 2)
        ellipse(im, 5, 6, 9, 9, teinte(C['corps'], 0.9), C['corps_s'])
    else:
        # (fiche 14) sur la terre : debout sur ses pattes orange, le pied sur la ligne y = 12 (l'ancre,
        # comme la surface de l'eau quand il nage) ; 'debout' (k : la tête bouge), 'marche' (k : les
        # pattes, l'une après l'autre)
        d = k if pose == 'marche' else 0
        for x, dx in ((6, -d), (9, d)):
            px(im, x, 11, PATTE_CANARD)
            px(im, x + dx, 12, PATTE_CANARD)
            px(im, x + dx + 1, 12, PATTE_CANARD)
        trait(im, [(2, 7), (3, 8)], C['queue'])
        ellipse(im, 2, 5, 12, 11, C['corps'], C['corps_s'])
        ellipse(im, 9, 6, 13, 11, C['poitrail'], teinte(C['poitrail'], 0.8))
        ellipse(im, 4, 5, 10, 8, teinte(C['corps'], 0.9), C['corps_s'])       # l'aile
        h = k if pose == 'debout' else 0
        ellipse(im, 10, 1 + h, 13, 5 + h, C['tete'], C['tete_s'])
        px(im, 12, 2 + h, K)
        px(im, 14, 3 + h, C['bec'])
        px(im, 15, 3 + h, C['bec'])
        if sorte == 'm':
            px(im, 10, 6, (238, 238, 232))
            px(im, 11, 6, (238, 238, 232))
        return fini(im)
    im = fini(im)
    sous_l_eau(im, 12)
    remous(im, 2, 13, 12, k)
    return im


# ---------- la forêt (fiche 6b) ----------

# Le chevreuil (et le bouquetin, de la montagne) : les dessins du joueur (fiche 22).
#
# La première image (debout_0) de chacun est celle que le joueur a dessinée, gardée au pixel près,
# museau compris (il dépassait de sa case : tout l'animal est poussé de 5 pixels vers la gauche,
# dans les 6 images) : une grille de lettres, une lettre par couleur ('.' : transparent).
# Les autres en sont tirées :
#   - il broute : sa tête, telle quelle (même taille, mêmes yeux, oreilles, bois ou cornes),
#     tournée d'un quart de tour, le museau au sol, au bout d'une encolure qui descend ;
#   - la marche : le corps reste, les pattes sont redessinées d'après leurs colonnes dans le
#     dessin (couleurs, longueur). Les lointaines (la vue plonge un peu) sont plus courtes de deux
#     pixels ; elles ont la largeur des proches, qui ne les cachent qu'en passant devant ; en
#     marche, proches et lointaines vont en sens contraire.

PAL_CHEV = {
    'A': (40, 31, 31),  # le contour
    'B': (96, 74, 52),  # les bois
    'C': (118, 70, 40),  # l'ombre, les pattes lointaines
    'D': (206, 150, 96),  # le ventre, le dos éclairé
    'E': (168, 104, 58),  # la robe fauve, les pattes proches
    'F': (236, 226, 206),  # le miroir blanc
    'G': (52, 40, 32),  # les sabots
}

CHEV_DEBOUT = [
    '.....................AA.........',
    '....................ABBA........',
    '..................AABBA.........',
    '.................ACAABA.........',
    '..................ACABAA........',
    '..................ADDBEEA.......',
    '.................ADEEEAEAA......',
    '.................AEEEEECEEA.....',
    '.................AEECCCCCCEA....',
    '.................AEEECAAAAA.....',
    '.................AEEEA..........',
    '..A..............AEEEA..........',
    '.ACA.AAAAAAAAAAAAEEEA...........',
    '.AFCADDDDDDDDEEEEEEEA...........',
    '.AFFDDDDDDEEEEEEEEEEA...........',
    '.AFFDDEEEEEEEEEEEEEEA...........',
    '.AFFEEEEEEEEEEEEEEEEA...........',
    '..AEEEDDDDDDDDDDDECA............',
    '...AEEDDDDDDDDDDDDCA............',
    '....ACDDDDDDDDDDDEA.............',
    '....ACAEAAAAAAACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....ACAEA.....ACAEA.............',
    '....AGAEA.....AGAEA.............',
    '.....AAEA......AAEA.............',
    '......AGA.......AGA.............',
    '.......A.........A..............',
]

PAL_BOUQ = {
    'A': (40, 31, 31),  # le contour
    'B': (122, 108, 90),  # les cornes
    'C': (162, 152, 140),  # leur reflet
    'D': (108, 92, 72),  # l'ombre, les pattes proches
    'E': (196, 180, 150),  # le ventre, le dos éclairé
    'F': (150, 128, 100),  # la robe, les pattes lointaines
    'G': (60, 50, 44),  # la bouche
    'H': (123, 104, 82),  # le genou (patte lointaine)
    'I': (81, 68, 54),  # le jarret (patte proche)
    'J': (52, 44, 40),  # les sabots
}

BOUQ_DEBOUT = [
    '..............AA................',
    '............AABCAA..............',
    '...........ACBBBBBA.............',
    '..........ABBAAABBCA............',
    '..........ABA...ABBBAA..........',
    '..........ABA....ABBADAAA.......',
    '...........A......ABBEFFFAAA....',
    '..................AEBFAFFFFFA...',
    '..................AFFFFFFDAFA...',
    '.................AFFFFFDDDDDA...',
    '...AAAAAAAAAAAAAAFFFDDDDGAAA....',
    '..AFFFFEEEEEEEFFFFFFFFADA.......',
    '.AFFEEEEEEEFFFFFFFFFFFADA.......',
    '.AFFEEEEFFFFFFFFFFFFFAADA.......',
    '.AFEEFFFFFFFFFFFFFFFFAADA.......',
    '.AEFFFFFFFFFFFFFFFFFFA.A........',
    '.AFFFFFFFFFFFFFFFFFFDA..........',
    '.AFFFEEEEEEEEEEEDDFDDA..........',
    '..AFEEEEEEEEEEEEEDDDA...........',
    '...AEEEEEEEEEEEEEDFA............',
    '...ADEEEEEEEEEEEDAFA............',
    '...ADDAFAAAAAAADDAFA............',
    '...ADDAFA.....ADDAHA............',
    '...ADDAHA.....ADDAFA............',
    '...ADIAFA.....ADIAFA............',
    '...ADIAFA.....ADIAFA............',
    '...ADDAFA.....ADDAFA............',
    '...ADDAJA.....ADDAJA............',
    '...ADDAA......ADDAA.............',
    '...AJJA.......AJJA..............',
    '....AA.........AA...............',
    '................................',
]

# Il broute : ce qui part du dessin debout (la tête et l'encolure), la tête (tournée d'un quart de
# tour autour de `pivot`, qui vient en `cible`), l'encolure qui descend (un polygone, peint de
# la robe, contour refait).
BROUTE_CHEV = {'efface': lambda x, y: (y <= 11 and x >= 16) or (y == 12 and 17 <= x <= 19),
               'tete': lambda x, y: y <= 9, 'pivot': (23, 7), 'cible': (23, 24), 'robe': 'E',
               'cou': [(16.5, 12.5), (21.5, 17.5), (23.5, 18.5), (21.5, 21.5), (19.5, 19.5), (18.5, 17.5)]}
BROUTE_BOUQ = {'efface': lambda x, y: (y <= 9 and x >= 10) or (y == 10 and x >= 17) or (11 <= y <= 15 and x >= 21),
               'tete': lambda x, y: (y <= 9 and x >= 10) or (y == 10 and x >= 20), 'pivot': (23, 8), 'cible': (22, 23),
               'robe': 'F', 'cou': [(16.5, 10.5), (21.5, 13.5), (24.5, 18.5), (20.5, 21.5), (19.5, 19.5), (19.5, 17.5)]}

# Les pattes : (colonnes dans le dessin, colonnes qu'elle occupe, proche ?, devant ?), et la
# rangée sous le ventre (y0) d'où elles partent. Une lointaine plus fine dans le dessin n'y est
# qu'en partie cachée : dégagée, elle a la largeur de la proche.
PATTES_CHEV = {'y0': 20, 'pattes': [([5], [5], False, False), ([7], [7], True, False),
                                    ([15], [15], False, True), ([17], [17], True, True)]}
PATTES_BOUQ = {'y0': 21, 'pattes': [([4, 5], [4, 5], True, False), ([7], [6, 7], False, False),
                                    ([15, 16], [15, 16], True, True), ([18], [17, 18], False, True)]}

# La foulée, en 4 images : deux paires en diagonale (devant-proche avec derrière-lointaine, et
# l'inverse), chacune (déplacement du sabot, levée) ; tour à tour l'une pose et l'autre passe,
# repliée. Les lointaines ne s'écartent que d'un pixel et ne se lèvent que d'un.
FOULEE = [((2, 0), (-2, 0)), ((0, 0), (0, 2)), ((-2, 0), (2, 0)), ((0, 2), (0, 0))]


def contour_grille(g):
    """Le contour du joueur : un pixel de contour ('A') sur chaque case vide voisine (haut, bas,
    gauche, droite) d'une case peinte."""
    h, w = len(g), len(g[0])
    out = [list(r) for r in g]
    for y in range(h):
        for x in range(w):
            if g[y][x] == '.' and any(0 <= x + dx < w and 0 <= y + dy < h and g[y + dy][x + dx] not in '.A'
                                      for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = 'A'
    return [''.join(r) for r in out]


def dans(poly, x, y):
    """Le point (x, y) est-il dans le polygone ?"""
    c = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


def broute(debout, b):
    """La tête baissée : la tête du dessin, tournée d'un quart de tour (le museau vers le sol),
    au bout de l'encolure."""
    g = [[('.' if b['efface'](x, y) or (c == 'A' and y < 20) else c) for x, c in enumerate(r)]
         for y, r in enumerate(debout)]
    (cx, cy), (tx, ty) = b['pivot'], b['cible']
    tete = {(tx - (y - cy), ty + (x - cx)): c for y, r in enumerate(debout) for x, c in enumerate(r)
            if c != '.' and b['tete'](x, y)}
    bord = {p for p, c in tete.items()
            if c == 'A' and any((p[0] + dx, p[1] + dy) not in tete for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for (x, y), c in tete.items():
        g[y][x] = c
    for y in range(32):
        for x in range(32):
            if dans(b['cou'], x + 0.5, y + 0.5) and (g[y][x] == '.' or (x, y) in bord or (g[y][x] == 'A' and (x, y) not in tete)):
                g[y][x] = b['robe']
    return contour_grille([''.join(r) for r in g])


def foulee(debout, pattes, k):
    """L'image k (0..3) de la marche : le corps du dessin, les pattes redessinées, inclinées (le
    sabot en avant ou en arrière) ou levées (plus courtes, repliées)."""
    y0 = pattes['y0']
    g = [list(r) if y < y0 else ['.'] * 32 for y, r in enumerate(debout)]
    lointaine = set()
    paire_a, paire_b = FOULEE[k % 4]
    # les lointaines d'abord : les proches passent devant
    for src, cols, proche, devant in sorted(pattes['pattes'], key=lambda p: p[2]):
        dx, leve = paire_a if proche == devant else paire_b
        if not proche:
            dx, leve = (dx > 0) - (dx < 0), min(leve, 1)
        rangs = []   # la patte du dessin, rangée par rangée, jusqu'au sabot
        for y in range(y0, 32):
            s = ''.join(debout[y][x] for x in src)
            if all(c in '.A' for c in s):
                break
            rangs.append(s[0] * len(cols) if len(src) < len(cols) else s)
        if leve:
            rangs = rangs[:len(rangs) - 1 - leve] + rangs[-1:]
        n = len(rangs)
        for i, s in enumerate(rangs):
            f = i / (n - 1)
            d = (1 if proche and f > 0.5 else 0) if leve else int(abs(dx) * f + 0.5) * (1 if dx > 0 else -1)
            y = y0 + i
            for j, c in enumerate(s):
                g[y][cols[0] + j + d] = c
                (lointaine.add if not proche else lointaine.discard)((cols[0] + j + d, y))
            if proche:   # devant une lointaine : un trait de contour entre les deux
                for x in (cols[0] + d - 1, cols[-1] + d + 1):
                    if (x, y) in lointaine:
                        g[y][x] = 'A'
    return contour_grille([''.join(r) for r in g])


def de_grille(g, pal):
    im = image(32, 32)
    for y, r in enumerate(g):
        for x, c in enumerate(r):
            if c != '.':
                im.putpixel((x, y), pal[c] + (255,))
    return im


def chevreuil(k, marche):
    """32 × 32, de profil (vers la droite), les sabots en bas (y 30 les proches, 28 les
    lointaines) : le dessin du joueur, fin et haut sur pattes, la robe fauve, le miroir blanc, les
    bois courts (le brocard), le museau pointé en avant. marche : k la foulée (0..3) ; sinon k :
    la tête levée (0) ou baissée dans l'herbe (il broute)."""
    if marche:
        return de_grille(foulee(CHEV_DEBOUT, PATTES_CHEV, k), PAL_CHEV)
    return de_grille(broute(CHEV_DEBOUT, BROUTE_CHEV) if k % 2 else CHEV_DEBOUT, PAL_CHEV)


def bouquetin(k, marche):
    """32 × 32, de profil (vers la droite), les sabots en bas (y 29 les proches, 27 les
    lointaines) : le dessin du joueur, trapu, l'encolure épaisse, la barbiche, les grandes cornes
    annelées en arc vers l'arrière. marche : k la foulée (0..3) ; sinon k : la tête levée (0) ou
    baissée dans l'herbe (il broute)."""
    if marche:
        return de_grille(foulee(BOUQ_DEBOUT, PATTES_BOUQ, k), PAL_BOUQ)
    return de_grille(broute(BOUQ_DEBOUT, BROUTE_BOUQ) if k % 2 else BOUQ_DEBOUT, PAL_BOUQ)


ROUX = (212, 102, 38)
ROUX_S = (150, 66, 26)
ROUX_C = (238, 150, 78)
CREME = (244, 232, 214)


def renard(k, marche):
    """32 × 32 (le dessin tient en 26 × 14), de profil (vers la droite), les pattes en bas au milieu
    (y 29) : roux, la gorge et le bout de la queue blancs, les pattes noires, le museau pointu.
    marche : k la foulée ; sinon k : assis la queue autour (0) ou debout le nez au vent (1)."""
    im = image(32, 32)
    if not marche and k == 0:
        # assis : le dos rond, la queue enroulée devant les pattes
        ellipse(im, 9, 18, 24, 29, ROUX, ROUX_S, ROUX_C)
        ellipse(im, 6, 25, 22, 29, ROUX, ROUX_S, ROUX_C)            # la queue, posée
        ellipse(im, 6, 26, 9, 29, CREME)
        ellipse(im, 17, 19, 22, 27, CREME, teinte(CREME, 0.85))     # la gorge
        trait(im, [(20, 25), (20, 29)], (44, 30, 26))
        hy = 12
    else:
        pas = [(-2, 2), (0, 0), (2, -2), (0, 0)][k % 4] if marche else (0, 0)
        for x0, dx in ((10, pas[0]), (11, -pas[0]), (20, pas[1]), (21, -pas[1])):
            trait(im, [(x0, 23), (x0 + dx, 29)], (44, 30, 26), 1)
        ellipse(im, 8, 18, 24, 25, ROUX, ROUX_S, ROUX_C)             # le corps
        ellipse(im, 12, 22, 21, 25, CREME)
        # la queue en panache, horizontale
        ellipse(im, 0, 17, 10, 22, ROUX, ROUX_S, ROUX_C)
        ellipse(im, 0, 18, 3, 21, CREME)
        hy = 13
    ellipse(im, 21, hy, 27, hy + 5, ROUX, ROUX_S, ROUX_C)           # la tête
    trait(im, [(27, hy + 3), (30, hy + 4)], ROUX, 2)                 # le museau
    px(im, 31, hy + 4, K)
    px(im, 28, hy + 5, CREME)
    px(im, 29, hy + 5, CREME)
    px(im, 25, hy + 2, K)                                            # l'œil
    for x, y in ((22, hy - 1), (23, hy - 2), (23, hy - 1), (24, hy - 1)):   # l'oreille pointue
        px(im, x, y, ROUX_S)
    px(im, 23, hy - 3, (44, 30, 26))
    return fini(im)


LAPIN = (150, 122, 96)
LAPIN_S = (104, 82, 64)
LAPIN_C = (190, 166, 136)


def lapin(pose, k):
    """16 × 16, de profil (vers la droite), les pattes en bas au milieu : le lapin de garenne, gris
    brun, la queue blanche. pose 'assis' (k : les oreilles dressées ou couchées) ou 'saut' (k :
    ramassé, détendu)."""
    im = image(16, 16)
    if pose == 'assis':
        ellipse(im, 3, 8, 11, 15, LAPIN, LAPIN_S, LAPIN_C)
        ellipse(im, 2, 11, 4, 13, (244, 242, 236))                  # la queue
        ellipse(im, 8, 5, 13, 10, LAPIN, LAPIN_S, LAPIN_C)          # la tête
        px(im, 11, 7, K)
        px(im, 13, 8, (120, 80, 70))
        if k == 0:
            trait(im, [(9, 5), (8, 1)], LAPIN_S, 1)
            trait(im, [(10, 5), (10, 1)], LAPIN, 1)
            px(im, 10, 2, (214, 170, 160))
        else:
            trait(im, [(9, 6), (5, 4)], LAPIN_S, 1)
            trait(im, [(9, 5), (6, 3)], LAPIN, 1)
        px(im, 10, 14, LAPIN_S)
        px(im, 11, 14, LAPIN_S)
    else:
        dy = 0 if k == 0 else -2
        ellipse(im, 2, 8 + dy, 12, 13 + dy, LAPIN, LAPIN_S, LAPIN_C)
        ellipse(im, 1, 8 + dy, 3, 10 + dy, (244, 242, 236))
        ellipse(im, 10, 5 + dy, 14, 9 + dy, LAPIN, LAPIN_S, LAPIN_C)
        px(im, 12, 6 + dy, K)
        trait(im, [(10, 6 + dy), (7, 3 + dy)], LAPIN_S, 1)
        if k == 0:
            trait(im, [(3, 13), (6, 14)], LAPIN_S, 1)               # les pattes arrière, ramassées
            px(im, 11, 14, LAPIN_S)
        else:
            trait(im, [(3, 11 + dy), (0, 14)], LAPIN_S, 1)          # détendu : pattes arrière tendues
            trait(im, [(11, 12 + dy), (14, 14)], LAPIN_S, 1)
    return fini(im)


ECUR = (186, 82, 36)
ECUR_S = (128, 52, 24)
ECUR_C = (226, 128, 70)


def ecureuil(pose, k):
    """16 × 16, de profil (vers la droite) : l'écureuil roux, la grande queue en panache relevée
    dans le dos, les pinceaux aux oreilles. pose 'assis' (il grignote : k les pattes avant) ou
    'course' (k : ramassé, étiré)."""
    im = image(16, 16)
    if pose == 'assis':
        # la queue : une crosse qui remonte dans le dos et se recourbe
        ellipse(im, 1, 3, 6, 14, ECUR, ECUR_S, ECUR_C)
        ellipse(im, 2, 1, 7, 5, ECUR, ECUR_S, ECUR_C)
        ellipse(im, 5, 8, 11, 15, ECUR, ECUR_S, ECUR_C)             # le corps
        ellipse(im, 8, 10, 10, 14, CREME)                            # le ventre
        ellipse(im, 8, 4, 12, 8, ECUR, ECUR_S, ECUR_C)               # la tête
        px(im, 11, 5, K)
        px(im, 12, 7, (60, 30, 20))
        px(im, 9, 3, ECUR_S)
        px(im, 9, 2, (60, 30, 20))                                   # le pinceau
        px(im, 11, 9 + k, (110, 78, 40))                             # la noisette
        px(im, 10, 9 + k, ECUR_S)
    else:
        d = 0 if k == 0 else 1
        ellipse(im, 4, 9 - d, 12, 13, ECUR, ECUR_S, ECUR_C)
        ellipse(im, 0, 5 - d, 5, 10, ECUR, ECUR_S, ECUR_C)           # la queue derrière, relevée
        ellipse(im, 10, 7 - d, 14, 11 - d, ECUR, ECUR_S, ECUR_C)
        px(im, 12, 8 - d, K)
        px(im, 11, 6 - d, ECUR_S)
        if d:
            trait(im, [(5, 12), (3, 14)], ECUR_S)
            trait(im, [(11, 12), (13, 14)], ECUR_S)
        else:
            trait(im, [(6, 13), (7, 14)], ECUR_S)
            trait(im, [(10, 13), (9, 14)], ECUR_S)
    return fini(im)


# ---------- la lande (fiche 6b) ----------

LIEVRE = (170, 138, 92)
LIEVRE_S = (118, 92, 60)
LIEVRE_C = (208, 182, 136)


def lievre(pose, k):
    """16 × 16, de profil (vers la droite) : plus grand et plus fauve que le lapin, de très longues
    oreilles au bout noir, les pattes arrière longues. pose 'assis' (k : les oreilles) ou 'course'
    (k : ramassé, étiré : il file)."""
    im = image(16, 16)
    if pose == 'assis':
        ellipse(im, 2, 8, 11, 15, LIEVRE, LIEVRE_S, LIEVRE_C)
        ellipse(im, 9, 5, 14, 10, LIEVRE, LIEVRE_S, LIEVRE_C)
        px(im, 12, 7, (190, 120, 40))                                 # l'œil doré
        px(im, 14, 8, (110, 70, 60))
        ox = 0 if k == 0 else 1
        trait(im, [(10, 5), (9 - ox, 0)], LIEVRE_S, 1)
        trait(im, [(11, 5), (11 - ox, 0)], LIEVRE, 1)
        px(im, 9 - ox, 0, K)
        px(im, 11 - ox, 0, K)
        trait(im, [(3, 14), (8, 14)], LIEVRE_S)
    else:
        e = k == 1
        ellipse(im, 2, 8, 12, 12, LIEVRE, LIEVRE_S, LIEVRE_C)
        ellipse(im, 10, 5, 15, 9, LIEVRE, LIEVRE_S, LIEVRE_C)
        px(im, 13, 6, (190, 120, 40))
        trait(im, [(11, 5), (6, 3)], LIEVRE_S, 1)                    # les oreilles couchées
        px(im, 6, 3, K)
        if e:
            trait(im, [(3, 11), (0, 13)], LIEVRE_S, 1)
            trait(im, [(11, 11), (15, 13)], LIEVRE_S, 1)
        else:
            trait(im, [(4, 12), (8, 14)], LIEVRE_S, 1)
            trait(im, [(10, 12), (8, 14)], LIEVRE_S, 1)
    return fini(im)


PERDRIX = (150, 140, 124)
PERDRIX_S = (104, 96, 86)
PERDRIX_C = (196, 186, 166)
ORANGE_P = (214, 130, 62)


def perdrix(pose, k):
    """16 × 16, de profil (vers la droite) : la perdrix grise, ronde, la face orangée, le fer à
    cheval brun sur le ventre, les flancs rayés de roux. pose 'debout' (k : elle picore), 'marche'
    (k : les pattes) ou 'vol' (k : les ailes, vues de côté)."""
    im = image(16, 16)
    if pose == 'vol':
        ellipse(im, 4, 6, 12, 11, PERDRIX, PERDRIX_S, PERDRIX_C)
        ellipse(im, 10, 4, 14, 8, ORANGE_P, teinte(ORANGE_P, 0.8))
        px(im, 12, 5, K)
        px(im, 15, 6, (90, 80, 60))
        y = 1 if k == 0 else 11
        trait(im, [(6, 7), (4, y), (9, y)], PERDRIX_S, 1)
        trait(im, [(7, 7), (6, y + (1 if k == 0 else -1))], PERDRIX_C, 1)
        return fini(im)
    bas = 1 if pose == 'debout' and k == 1 else 0
    ellipse(im, 3, 7 + bas, 12, 13, PERDRIX, PERDRIX_S, PERDRIX_C)
    for x in (5, 7, 9):
        px(im, x, 10, (176, 98, 52))                                   # les rayures des flancs
    px(im, 9, 11, (110, 70, 40))
    px(im, 10, 11, (110, 70, 40))                                       # le fer à cheval
    hx, hy = (10, 4) if not bas else (11, 8)
    ellipse(im, hx, hy, hx + 4, hy + 4, ORANGE_P, teinte(ORANGE_P, 0.8))
    px(im, hx + 2, hy + 1, K)
    px(im, hx + 5, hy + 2, (90, 80, 60))
    trait(im, [(2, 8 + bas), (3, 9 + bas)], PERDRIX_S)                  # la queue courte
    d = k if pose == 'marche' else 0
    px(im, 7 - d, 14, (150, 120, 90))
    px(im, 9 + d, 14, (150, 120, 90))
    px(im, 7 - d, 15, (150, 120, 90))
    px(im, 9 + d, 15, (150, 120, 90))
    return fini(im)


# ---------- les trouvailles ----------

def trouvaille(nom):
    """16 × 16 : posée au sol, une petite ombre dessous."""
    im = image(16, 16)
    d = dessin(im)
    d.ellipse((3, 11, 13, 14), fill=(0, 0, 0, 50))
    if nom == 'ammonite':
        c, s, l = (190, 170, 134), (138, 118, 90), (226, 210, 176)
        ellipse(im, 3, 4, 12, 12, c, s, l)
        for i in range(48):
            t = i / 48 * 3.2 * math.pi
            r = 4.2 * (1 - t / (3.6 * math.pi))
            px(im, round(7.5 + r * math.cos(t)), round(8 + r * math.sin(t) * 0.9), s)
        for t in range(0, 360, 40):
            a = math.radians(t)
            px(im, round(7.5 + 4 * math.cos(a)), round(8 + 3.6 * math.sin(a)), l)
    elif nom == 'trilobite':
        c, s, l = (124, 112, 104), (84, 76, 72), (164, 154, 144)
        ellipse(im, 4, 3, 11, 13, c, s, l)
        for y in range(6, 13, 2):
            trait(im, [(5, y), (10, y)], s)
        trait(im, [(7, 4), (7, 12)], l)
        ellipse(im, 4, 2, 11, 5, l, c)
    elif nom == 'quartz':
        for x0, h, w in ((4, 8, 3), (7, 10, 3), (10, 6, 3)):
            for y in range(12 - h, 12):
                for x in range(x0, x0 + w):
                    pointe = y < 12 - h + 2 and abs(x - (x0 + w // 2)) > (y - (12 - h))
                    if not pointe:
                        px(im, x, y, (236, 242, 248) if x == x0 else (196, 214, 230) if x == x0 + w - 1 else (220, 232, 242))
        px(im, 8, 4, (255, 255, 255))
    elif nom == 'amethyste':
        ellipse(im, 3, 9, 12, 13, (128, 118, 110), (96, 88, 84))
        for x0, h, w in ((4, 6, 3), (7, 8, 3), (10, 5, 2)):
            for y in range(11 - h, 11):
                for x in range(x0, x0 + w):
                    pointe = y < 11 - h + 2 and abs(x - (x0 + w // 2)) > (y - (11 - h))
                    if not pointe:
                        px(im, x, y, (196, 150, 226) if x == x0 else (112, 66, 152) if x == x0 + w - 1 else (150, 96, 192))
    elif nom == 'coquille':
        c, s, l = (238, 168, 132), (196, 116, 92), (252, 214, 190)
        for y in range(4, 13):
            for x in range(2, 14):
                u, v = (x + 0.5 - 8) / 6, (y + 0.5 - 12) / 8
                if u * u + v * v <= 1 and y < 12:
                    a = math.atan2(y + 0.5 - 12, x + 0.5 - 8)
                    raie = int((a + math.pi) / math.pi * 9) % 2
                    px(im, x, y, l if y < 6 and raie else c if raie else s)
        for x in range(6, 11):
            px(im, x, 12, s)
        px(im, 5, 12, s)
        px(im, 10, 12, s)
    elif nom == 'bulot':
        c, s, l = (206, 186, 150), (140, 102, 70), (236, 222, 196)
        for i, (x0, x1, y) in enumerate(((7, 8, 3), (6, 9, 4), (6, 9, 5), (5, 10, 6), (5, 10, 7), (4, 11, 8), (4, 11, 9), (5, 11, 10), (6, 10, 11))):
            for x in range(x0, x1 + 1):
                px(im, x, y, s if (y + x // 2) % 3 == 0 else l if x == x0 else c)
        ellipse(im, 8, 9, 10, 11, (232, 190, 160))
    elif nom == 'corail':
        c, s, l = (222, 72, 70), (164, 44, 48), (246, 132, 120)
        trait(im, [(8, 13), (8, 8), (6, 5), (5, 3)], c, 1)
        trait(im, [(8, 9), (11, 6), (11, 3)], c, 1)
        trait(im, [(7, 7), (4, 7)], c, 1)
        trait(im, [(10, 7), (13, 5)], c, 1)
        trait(im, [(9, 13), (9, 9)], s, 1)
        for x, y in ((5, 3), (11, 3), (4, 7), (13, 5)):
            px(im, x, y, l)
    elif nom == 'perle':
        c, s, l = (150, 150, 158), (104, 102, 112), (196, 196, 204)
        ellipse(im, 2, 7, 13, 13, c, s, l)                      # la coquille du dessous
        ellipse(im, 3, 8, 12, 12, (220, 212, 214), (190, 180, 186))     # la nacre
        ellipse(im, 3, 2, 12, 7, s, teinte(s, 0.8), c)          # celle du dessus, entrouverte
        ellipse(im, 6, 8, 9, 11, (246, 244, 236), (210, 206, 200), (255, 255, 255))
    elif nom == 'herbes_montagne':
        # une touffe d'herbes des prés (thym, serpolet) : des brins qui s'écartent, quelques
        # fleurs de gentiane (bleues) et d'edelweiss (blanches, le cœur jaune)
        c, s, l = (92, 156, 70), (48, 104, 50), (150, 204, 104)
        for x0, x1, y1, col in ((7, 3, 4, c), (8, 6, 2, l), (8, 10, 3, c), (9, 13, 5, c), (7, 5, 6, s),
                                (9, 11, 7, s), (8, 8, 5, l), (6, 2, 8, s), (10, 14, 8, s)):
            trait(im, [(x0, 13), (x1, y1)], col)
        for x, y in ((4, 6), (12, 7), (6, 4), (11, 4)):
            px(im, x, y, l)
        for x, y in ((3, 4), (13, 5)):                   # les gentianes
            px(im, x, y, (70, 102, 214))
            px(im, x, y - 1, (126, 156, 240))
        for x, y in ((8, 3), (10, 9)):                   # les edelweiss
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                px(im, x + dx, y + dy, (244, 244, 236))
            px(im, x, y, (236, 200, 80))
    return contour(im, K)


TROUVAILLES = [
    ('ammonite', 'fossile', 'Une ammonite fossile'),
    ('trilobite', 'fossile', 'Un trilobite fossile'),
    ('quartz', 'pierre', 'Un cristal de quartz'),
    ('amethyste', 'pierre', 'Une améthyste'),
    ('coquille', 'coquillage', 'Une coquille Saint-Jacques'),
    ('bulot', 'coquillage', 'Un bulot'),
    ('corail', 'corail', 'Une branche de corail'),
    ('perle', 'perle', 'Une perle, dans son huître'),
    # (à la fin : les cases des autres ne bougent pas, scripts/icones/build.py les reprend)
    ('herbes_montagne', 'herbe', 'Des herbes de montagne'),
]

ESPECES = {
    'marmotte': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Une marmotte',
                 'images': [('assise_0', lambda: marmotte('assise', 0)), ('assise_1', lambda: marmotte('assise', 1)),
                            ('marche_0', lambda: marmotte('marche', 0)), ('marche_1', lambda: marmotte('marche', 1))]},
    'bouquetin': {'taille': (32, 32), 'ancre': (16, 30), 'nom': 'Un bouquetin',
                  'images': [('debout_0', lambda: bouquetin(0, False)), ('debout_1', lambda: bouquetin(1, False))]
                  + [(f'marche_{k}', (lambda k=k: bouquetin(k, True))) for k in range(4)]},
    'aigle': {'taille': (32, 32), 'ancre': (16, 16), 'nom': 'Un aigle royal',
              'images': [('vol_0', lambda: aigle(0)), ('vol_1', lambda: aigle(1))]},
    'mouette': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Une mouette',
                'images': [('debout_0', lambda: mouette('debout', 0)), ('debout_1', lambda: mouette('debout', 1)),
                           ('vol_0', lambda: mouette('vol', 0)), ('vol_1', lambda: mouette('vol', 1))]},
    'crabe': {'taille': (16, 16), 'ancre': (8, 12), 'nom': 'Un crabe',
              'images': [('marche_0', lambda: crabe(0)), ('marche_1', lambda: crabe(1))]},
    'cygne': {'taille': (32, 32), 'ancre': (16, 24), 'nom': 'Un cygne',
              'images': [('nage_0', lambda: cygne('nage', 0)), ('nage_1', lambda: cygne('nage', 1)),
                         ('plonge_0', lambda: cygne('plonge', 0)), ('plonge_1', lambda: cygne('plonge', 1))]},
    'canard': {'taille': (16, 16), 'ancre': (8, 12), 'nom': 'Un canard colvert',
               'images': [(f'{s}_{p}_{k}', (lambda s=s, p=p, k=k: canard(s, p, k))) for s in ('m', 'f') for p in ('nage', 'plonge', 'debout', 'marche') for k in (0, 1)]},
    'dauphin': {'taille': (32, 32), 'ancre': (16, 24), 'nom': 'Un dauphin',
                'images': [(f'saut_{k}', (lambda k=k: dauphin(k))) for k in range(4)] + [('gerbe', lambda: dauphin(4))]},
    # la forêt et la lande du grand monde (fiche 6b)
    'chevreuil': {'taille': (32, 32), 'ancre': (16, 30), 'nom': 'Un chevreuil',
                  'images': [('debout_0', lambda: chevreuil(0, False)), ('debout_1', lambda: chevreuil(1, False))]
                  + [(f'marche_{k}', (lambda k=k: chevreuil(k, True))) for k in range(4)]},
    'renard': {'taille': (32, 32), 'ancre': (16, 30), 'nom': 'Un renard roux',
               'images': [('assis_0', lambda: renard(0, False)), ('debout_0', lambda: renard(1, False))]
               + [(f'marche_{k}', (lambda k=k: renard(k, True))) for k in range(4)]},
    'lapin': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Un lapin de garenne',
              'images': [('assis_0', lambda: lapin('assis', 0)), ('assis_1', lambda: lapin('assis', 1)),
                         ('saut_0', lambda: lapin('saut', 0)), ('saut_1', lambda: lapin('saut', 1))]},
    'ecureuil': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Un écureuil roux',
                 'images': [('assis_0', lambda: ecureuil('assis', 0)), ('assis_1', lambda: ecureuil('assis', 1)),
                            ('course_0', lambda: ecureuil('course', 0)), ('course_1', lambda: ecureuil('course', 1))]},
    'lievre': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Un lièvre',
               'images': [('assis_0', lambda: lievre('assis', 0)), ('assis_1', lambda: lievre('assis', 1)),
                          ('course_0', lambda: lievre('course', 0)), ('course_1', lambda: lievre('course', 1))]},
    'perdrix': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Une perdrix grise',
                'images': [('debout_0', lambda: perdrix('debout', 0)), ('debout_1', lambda: perdrix('debout', 1)),
                           ('marche_0', lambda: perdrix('marche', 0)), ('marche_1', lambda: perdrix('marche', 1)),
                           ('vol_0', lambda: perdrix('vol', 0)), ('vol_1', lambda: perdrix('vol', 1))]},
}


def main():
    meta = {'especes': {}, 'trouvailles': {}}
    apercu = []
    for nom, e in ESPECES.items():
        w, h = e['taille']
        ims = [f() for _, f in e['images']]
        sheet = image(w * len(ims), h)
        for k, im in enumerate(ims):
            sheet.alpha_composite(im, (k * w, 0))
        sheet.save(os.path.join(ASSETS, f'faune_{nom}.png'), optimize=True)
        meta['especes'][nom] = {'image': f'faune_{nom}.png', 'frameWidth': w, 'frameHeight': h,
                                'anchor': {'x': e['ancre'][0], 'y': e['ancre'][1]},
                                'frames': [n for n, _ in e['images']], 'nom': e['nom']}
        apercu.append(sheet)
    sheet = image(16 * len(TROUVAILLES), 16)
    for k, (nom, genre, texte) in enumerate(TROUVAILLES):
        sheet.alpha_composite(trouvaille(nom), (k * 16, 0))
        meta['trouvailles'][nom] = {'frame': k, 'genre': genre, 'nom': texte}
    sheet.save(os.path.join(ASSETS, 'trouvailles.png'), optimize=True)
    apercu.append(sheet)
    with open(os.path.join(ASSETS, 'faune.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write('\n')
    if '--apercu' in sys.argv:
        W = max(s.width for s in apercu) + 8
        Hh = sum(s.height + 4 for s in apercu) + 4
        out = Image.new('RGBA', (W, Hh), (216, 196, 140, 255))
        y = 4
        for s in apercu:
            out.alpha_composite(s, (4, y))
            y += s.height + 4
        out.resize((W * 6, Hh * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_faune.png'))


if __name__ == '__main__':
    main()
