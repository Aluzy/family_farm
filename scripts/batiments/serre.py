# assets/serre_essai.png : essai d'une nouvelle Serre pour la carte, 94×83 (la taille de la découpe
# « batiment » de serre_sp.png, posée sur le rectangle `serre` de la carte), dans le style des
# dessins faits en code (silo, puits, citerne, panneaux du toit) : formes nettes, 3 à 4 teintes
# par matière, contour d'un pixel dans une teinte sombre de chaque matière, lumière en haut à
# gauche, pas de bruit ni de tramage.
#
# Pavillon central en ogive (verrière cintrée, épi de faîtage, double porte vitrée) entre deux
# ailes vitrées à toit de verre ; ossature de fer peinte en vert ; soubassement de pierres comme
# la margelle du puits ; des plantes se devinent derrière les vitres.
#
#   python3 scripts/batiments/serre.py            écrit assets/serre_essai.png
#   python3 scripts/batiments/serre.py --apercu   écrit aussi apercu_serre.png (l'original et
#                                                 l'essai côte à côte, agrandis ×4)
import math
import os
import sys

from PIL import Image

W, H = 94, 83
C = {
    # ossature de fer peinte
    'fo': (22, 48, 42), 'fd': (40, 84, 70), 'fm': (64, 120, 96), 'fl': (104, 162, 128), 'fh': (150, 200, 160),
    # verre
    'gd': (112, 162, 164), 'gm': (150, 198, 196), 'gl': (192, 228, 222), 'gh': (234, 248, 244),
    # plantes derrière le verre (teintes passées par la vitre)
    'pd': (60, 116, 84), 'pm': (86, 146, 96), 'pl': (126, 180, 112),
    # pierres (comme la margelle du puits)
    'so': (50, 40, 44), 'sj': (70, 64, 62), 'sd': (96, 92, 88), 'sm': (124, 120, 112), 'sl': (156, 152, 140), 'sh': (184, 180, 166),
    # laiton (poignées, épi)
    'yo': (74, 48, 20), 'ym': (200, 150, 60), 'yl': (244, 214, 120),
}

im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
px = im.load()


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = C[c] + (255,)


def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(x, y, c)


# ---------------------------------------------------------------- vitres

def pane(x0, y0, x1, y1, plants=0, seed=0):
    """Vitre de (x0, y0) à (x1, y1) inclus : verre clair en haut, plus soutenu en bas, un reflet
    en diagonale, et `plants` (0 à 1) : la hauteur des feuillages qui se devinent derrière."""
    h = y1 - y0 + 1
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            t = (y - y0) / max(1, h - 1)
            c = 'gl' if t < 0.18 else 'gm' if t < 0.7 else 'gd'
            put(x, y, c)
    # feuillage : une ligne de crête en bosses, plus claire sur le dessus
    if plants > 0:
        top = y1 - round(h * plants)
        for x in range(x0, x1 + 1):
            bump = round(1.6 * math.sin((x + seed) * 1.3) + 1.2 * math.sin((x + seed) * 0.55 + 1))
            yy = top + bump
            for y in range(max(y0 + 1, yy), y1 + 1):
                put(x, y, 'pl' if y == max(y0 + 1, yy) else 'pm' if y < yy + 3 else 'pd')
    # reflet : deux traits obliques, le premier plus large
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d = (x - x0) + (y - y0)
            k = (seed * 3) % 5 + 3
            if d in (k, k + 1) or d == k + 6:
                put(x, y, 'gh')


def frame_v(x, y0, y1):
    """Montant de 2 px : côté éclairé à gauche."""
    for y in range(y0, y1 + 1):
        put(x, y, 'fl')
        put(x + 1, y, 'fd')


def frame_h(x0, x1, y):
    """Traverse de 2 px : dessus éclairé."""
    for x in range(x0, x1 + 1):
        put(x, y, 'fl')
        put(x, y + 1, 'fd')


def outline_rect(x0, y0, x1, y1, c='fo'):
    for x in range(x0, x1 + 1):
        put(x, y0, c)
        put(x, y1, c)
    for y in range(y0, y1 + 1):
        put(x0, y, c)
        put(x1, y, c)


# ---------------------------------------------------------------- soubassement de pierres

BASE_Y0, BASE_Y1 = 72, 82


def stones(x0, x1):
    for y in range(BASE_Y0, BASE_Y1 + 1):
        row = (y - BASE_Y0 - 1) // 3
        for x in range(x0, x1 + 1):
            if y in (BASE_Y0, BASE_Y1) or x in (x0, x1):
                put(x, y, 'so')
                continue
            if (y - BASE_Y0 - 1) % 3 == 2 or (x + (row % 2) * 4) % 8 == 0:
                put(x, y, 'sj')
                continue
            t = (x - x0) / max(1, x1 - x0)
            put(x, y, 'sh' if y == BASE_Y0 + 1 else 'sl' if t < 0.3 else 'sm' if t < 0.75 else 'sd')


# ---------------------------------------------------------------- les ailes

WING_ROOF_Y0, WING_ROOF_Y1 = 14, 26     # toit de verre (vu de face : une bande inclinée)
WALL_Y0, WALL_Y1 = 27, 71


def wing(x0, x1, seed):
    # toit vitré : vitres hautes et étroites, plus claires (le ciel s'y reflète)
    rect(x0, WING_ROOF_Y0, x1, WING_ROOF_Y1, 'fd')
    n = 4
    w = (x1 - x0 - 1) // n
    for i in range(n):
        a = x0 + 1 + i * w
        b = x0 + (i + 1) * w - 1 if i < n - 1 else x1 - 2
        for y in range(WING_ROOF_Y0 + 2, WING_ROOF_Y1 - 1):
            for x in range(a + 1, b + 1):
                t = (y - WING_ROOF_Y0) / (WING_ROOF_Y1 - WING_ROOF_Y0)
                put(x, y, 'gh' if t < 0.25 else 'gl' if t < 0.6 else 'gm')
        for y in range(WING_ROOF_Y0 + 2, WING_ROOF_Y1 - 1):
            put(a, y, 'fl')
    frame_h(x0, x1, WING_ROOF_Y0)
    frame_h(x0, x1, WING_ROOF_Y1 - 1)
    # chéneau : une traverse plus épaisse sous le toit
    rect(x0, WALL_Y0, x1, WALL_Y0 + 2, 'fm')
    for x in range(x0, x1 + 1):
        put(x, WALL_Y0, 'fh')
        put(x, WALL_Y0 + 2, 'fd')
    # mur vitré : 3 travées, une imposte en haut, des plantes dans le bas
    n = 3
    w = (x1 - x0) // n
    for i in range(n):
        a = x0 + i * w
        b = x0 + (i + 1) * w if i < n - 1 else x1
        pane(a + 2, WALL_Y0 + 3, b - 1, WALL_Y0 + 10, 0, seed + i)                 # imposte
        pane(a + 2, WALL_Y0 + 13, b - 1, WALL_Y1 - 1, 0.55, seed * 7 + i * 3)     # grande vitre
        frame_v(a, WALL_Y0 + 3, WALL_Y1)
    frame_v(x1 - 1, WALL_Y0 + 3, WALL_Y1)
    frame_h(x0, x1, WALL_Y0 + 11)
    frame_h(x0, x1, WALL_Y1)
    outline_rect(x0, WING_ROOF_Y0 - 1, x1, WALL_Y1 + 1)


# ---------------------------------------------------------------- le pavillon central

CX0, CX1 = 30, 63          # bords du pavillon
CMID = (CX0 + CX1) / 2     # 46,5 : l'axe
ARCH_TOP = 3               # sommet de l'ogive
ARCH_BASE = 26             # naissance de l'ogive


def arch_half_width(y):
    """Demi-largeur de l'ogive à la hauteur y (deux arcs de cercle qui se rejoignent au sommet)."""
    if y >= ARCH_BASE:
        return (CX1 - CX0) / 2
    r = 26.0                                   # rayon des deux arcs
    half = (CX1 - CX0) / 2
    cx_left = CMID - half + r                  # centre de l'arc gauche (côté droit de l'axe)
    dy = ARCH_BASE - y
    if dy > r:
        return -1
    x = cx_left - math.sqrt(r * r - dy * dy)   # bord gauche de l'arc à cette hauteur
    return CMID - x


def pavilion():
    # verrière cintrée : verre, côtes qui suivent la courbe, nervure centrale
    for y in range(ARCH_TOP, ARCH_BASE + 1):
        hw = arch_half_width(y)
        if hw < 0:
            continue
        for x in range(CX0, CX1 + 1):
            d = abs(x + 0.5 - (CMID + 0.5))
            if d > hw + 0.5:
                continue
            edge = d > hw - 1.0
            if edge:
                put(x, y, 'fo')
            elif d > hw - 2.6:
                put(x, y, 'fl' if x < CMID else 'fd')        # bandeau de l'arc
            else:
                t = (y - ARCH_TOP) / (ARCH_BASE - ARCH_TOP)
                put(x, y, 'gh' if t < 0.3 and x < CMID else 'gl' if t < 0.55 else 'gm')
    # côtes : deux arcs intérieurs et la nervure centrale
    for y in range(ARCH_TOP + 4, ARCH_BASE):
        hw = arch_half_width(y)
        for k in (0.45,):
            for s in (-1, 1):
                x = round(CMID + s * hw * k)
                put(x, y, 'fd' if s > 0 else 'fl')
    for y in range(ARCH_TOP + 1, ARCH_BASE + 1):
        put(int(CMID), y, 'fl')
        put(int(CMID) + 1, y, 'fd')
    # traverse courbe à mi-hauteur : la verrière se lit en panneaux
    mid = ARCH_TOP + 11
    for x in range(CX0 + 3, CX1 - 2):
        d = abs(x + 0.5 - (CMID + 0.5))
        if d < arch_half_width(mid) - 2.6:
            y = mid + round((d / 16.5) ** 2 * 4)
            put(x, y, 'fl')
            put(x, y + 1, 'fd')
    # épi de faîtage en laiton
    put(int(CMID), ARCH_TOP - 1, 'yl'); put(int(CMID) + 1, ARCH_TOP - 1, 'ym')
    put(int(CMID), ARCH_TOP - 2, 'yl'); put(int(CMID) + 1, ARCH_TOP - 2, 'ym')
    put(int(CMID), ARCH_TOP - 3, 'yo'); put(int(CMID) + 1, ARCH_TOP - 3, 'yo')
    for x in (int(CMID) - 1, int(CMID) + 2):
        put(x, ARCH_TOP - 1, 'yo'); put(x, ARCH_TOP - 2, 'yo')
    # entablement sous l'ogive
    rect(CX0, ARCH_BASE + 1, CX1, ARCH_BASE + 3, 'fm')
    for x in range(CX0, CX1 + 1):
        put(x, ARCH_BASE + 1, 'fh')
        put(x, ARCH_BASE + 3, 'fd')
    # façade : imposte en éventail au-dessus de la porte, deux vitres de côté
    y0 = ARCH_BASE + 4
    pane(CX0 + 2, y0, CX0 + 8, WALL_Y1 - 1, 0.5, 11)
    pane(CX1 - 7, y0, CX1 - 1, WALL_Y1 - 1, 0.5, 4)
    frame_v(CX0, y0, WALL_Y1)
    frame_v(CX0 + 9, y0, WALL_Y1)
    frame_v(CX1 - 9, y0, WALL_Y1)
    frame_v(CX1 - 1, y0, WALL_Y1)
    # imposte en demi-cercle
    dx0, dx1 = CX0 + 11, CX1 - 10
    cx = (dx0 + dx1) / 2
    r = (dx1 - dx0) / 2 + 0.5
    ty = y0 + 9
    for y in range(y0, ty + 1):
        for x in range(dx0, dx1 + 1):
            d = math.hypot(x - cx, (y - ty) * 1.15)
            if d <= r:
                put(x, y, 'fd' if d > r - 1.2 else 'gl')
    for x in (round(cx - r / 3), round(cx + r / 3)):   # deux petits bois : trois carreaux
        for y in range(y0, ty + 1):
            if math.hypot(x - cx, (y - ty) * 1.15) <= r - 1.2:
                put(x, y, 'fd')
    frame_h(dx0, dx1, ty + 1)
    # double porte vitrée
    dy0 = ty + 3
    for a, b, sd in ((dx0, int(cx) - 1, 2), (int(cx) + 1, dx1, 6)):
        pane(a + 1, dy0 + 1, b - 1, WALL_Y1 - 6, 0, sd)
        rect(a + 1, WALL_Y1 - 5, b - 1, WALL_Y1 - 1, 'fm')          # soubassement plein de la porte
        for x in range(a + 1, b):
            put(x, WALL_Y1 - 5, 'fh')
        outline_rect(a, dy0, b, WALL_Y1, 'fd')
    put(int(cx), dy0, 'fo')
    for y in range(dy0, WALL_Y1 + 1):
        put(int(cx), y, 'fo')
    # poignées
    put(int(cx) - 2, dy0 + 12, 'ym'); put(int(cx) - 2, dy0 + 13, 'yo')
    put(int(cx) + 2, dy0 + 12, 'ym'); put(int(cx) + 2, dy0 + 13, 'yo')
    frame_h(CX0, CX1, WALL_Y1)
    # contour du pavillon (sous l'ogive)
    for y in range(ARCH_BASE, WALL_Y1 + 2):
        put(CX0, y, 'fo')
        put(CX1, y, 'fo')


# ---------------------------------------------------------------- assemblage

wing(1, CX0 - 1, 1)
wing(CX1 + 1, W - 2, 2)
pavilion()
stones(0, W - 1)
# marche devant la porte
for x in range(CX0 + 10, CX1 - 9):
    put(x, BASE_Y0, 'sh')
    put(x, BASE_Y0 + 1, 'sl')

out = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'serre_essai.png'))
im.save(out)
print('assets/serre_essai.png :', W, '×', H)

if '--apercu' in sys.argv:
    orig = Image.open(os.path.join(os.path.dirname(out), 'serre_sp.png')).convert('RGBA').crop((0, 0, 94, 83))
    sheet = Image.new('RGBA', (W * 2 + 12, H + 8), (64, 104, 64, 255))
    sheet.alpha_composite(orig, (4, 4))
    sheet.alpha_composite(im, (W + 8, 4))
    sheet = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    sheet.save(os.path.join(os.path.dirname(out), '..', 'apercu_serre.png'))
    print('apercu_serre.png : l\'original à gauche, l\'essai à droite')
