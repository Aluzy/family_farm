# Les matières des bâtiments, peintes sur les toiles au pixel près (coordonnées du monde, en
# px) : la brique de quatre couleurs, la pierre de taille, le verre des façades, les tuiles de
# terre cuite des toits (pans, faîtages, arêtiers, égouts), le toit plat de la tour et les
# planches de bois. Les motifs se répètent toutes les 8, 16 ou 32 px, calés sur la grille : la
# découpe en tuiles retrouve les mêmes tuiles d'un mur à l'autre.
import math

from commun import K, T, hasard, mel, teinte

# ---------- la brique ----------

BRIQUES = {
    # brique, joint, arête claire
    'rouge': ((152, 76, 64), (108, 56, 50), (176, 96, 80)),
    'orange': ((184, 120, 86), (146, 90, 64), (204, 140, 100)),
    'ocre': ((190, 158, 106), (156, 126, 84), (210, 180, 128)),
    'bleu': ((106, 138, 170), (76, 102, 134), (128, 160, 190)),
}


def brique(x, y, couleur):
    b, j, c = BRIQUES[couleur]
    rang = y // 8
    bx, by = (x + 8 * (rang % 2)) % 16, y % 8
    if by == 7 or bx == 15:
        return j
    if by == 0 or bx == 0:
        return c
    n = hasard(x % 16, y % 16, 5)
    if n < 0.07:
        return teinte(b, 0.92)
    if n > 0.96:
        return teinte(b, 1.06)
    return b


def mur(t, x0, y0, x1, y1, couleur, haut=True, bas=True, gauche=True, droite=True):
    """Un mur de brique sur les tuiles [x0, x1[ × [y0, y1[ : l'ombre du toit en haut, une
    plinthe de pierre en bas, une arête sombre sur les côtés."""
    X0, Y0, X1, Y1 = x0 * T, y0 * T, x1 * T, y1 * T
    pl = (150, 140, 128)

    def f(x, y):
        c = brique(x, y, couleur)
        if bas and y >= Y1 - 4:
            c = K if y == Y1 - 1 else (teinte(pl, 1.2) if y == Y1 - 4 else pl)
        if haut and y < Y0 + 3:
            c = teinte(c, 0.7 + 0.08 * (y - Y0))
        if gauche and x == X0 or droite and x == X1 - 1:
            c = K
        elif gauche and x == X0 + 1:
            c = teinte(c, 1.1)
        elif droite and x == X1 - 2:
            c = teinte(c, 0.82)
        return c
    t.remplit(X0, Y0, X1, Y1, f)


def bandeau(t, x0, x1, y, couleur='pierre'):
    """Un bandeau de pierre claire entre deux étages (au milieu de la rangée y)."""
    Y = y * T + 6

    def f(x, ypx):
        if ypx in (Y, Y + 4):
            return K
        return (214, 198, 166) if ypx == Y + 1 else (190, 174, 142)
    t.remplit(x0 * T, Y, x1 * T, Y + 5, f)


def poutre(t, x, y0, y1):
    """Un poteau de bois sombre (colombage), x en px."""
    def f(xx, yy):
        return K if xx in (x, x + 3) else ((112, 76, 52) if xx == x + 1 else (88, 58, 40))
    t.remplit(x, y0 * T, x + 4, y1 * T, f)


# ---------- la pierre de taille ----------

TAILLE = ((208, 190, 152), (172, 154, 122), (226, 212, 180))


def taille(x, y):
    b, j, c = TAILLE
    rang = y // 8
    bx, by = (x + 16 * (rang % 2)) % 32, y % 8
    if by == 7 or bx == 31:
        return j
    if by == 0 or bx == 0:
        return c
    return teinte(b, 0.97) if hasard(x % 32, y % 16, 6) < 0.08 else b


def facade_pierre(t, x0, y0, x1, y1):
    X0, Y0, X1, Y1 = x0 * T, y0 * T, x1 * T, y1 * T

    def f(x, y):
        c = taille(x, y)
        if y >= Y1 - 4:
            c = K if y == Y1 - 1 else TAILLE[1]
        if x in (X0, X1 - 1):
            c = K
        return c
    t.remplit(X0, Y0, X1, Y1, f)


def entablement(t, x0, x1, y):
    """La corniche claire au-dessus des colonnes (rangée y)."""
    Y0 = y * T

    def f(x, yy):
        r = yy - Y0
        if r in (0, 11) or x in (x0 * T, x1 * T - 1):
            return K
        if r < 3:
            return TAILLE[2]
        if r == 6:
            return TAILLE[1]
        return (232, 220, 192) if r < 6 else TAILLE[0]
    t.remplit(x0 * T, Y0, x1 * T, Y0 + 12, f)


def colonne(t, x, y0, y1):
    """Une colonne claire de 10 px (x : le bord gauche, en px) avec chapiteau et base."""
    Y0, Y1 = y0 * T, y1 * T

    def f(xx, yy):
        r = xx - x
        if yy < Y0 + 4 or yy >= Y1 - 5:
            if r in (-2, 11) or yy in (Y0, Y1 - 1):
                return K
            return TAILLE[2] if yy < Y0 + 2 or yy == Y1 - 5 else TAILLE[0]
        if not 0 <= r <= 9:
            return None
        if r in (0, 9):
            return K
        return (236, 226, 202) if r in (2, 3) else (TAILLE[1] if r >= 7 else TAILLE[0])
    t.remplit(x - 2, Y0, x + 12, Y1, f)


# ---------- le verre ----------

VERRE = {
    'clair': ((150, 178, 190), (122, 150, 166), (214, 232, 238)),
    'sombre': ((104, 128, 146), (84, 104, 124), (162, 186, 200)),
    'verriere': ((176, 202, 212), (140, 170, 186), (230, 242, 246)),
}
MONTANT = (58, 64, 74)


def verre(t, x0, y0, x1, y1, ton='clair', pas_x=32, pas_y=48, oblique=False):
    """Un mur de verre : des montants tous les pas_x px, des traverses tous les pas_y px, des
    reflets en diagonale (période 64 px). oblique : les montants penchent (la verrière)."""
    b, s, c = VERRE[ton]
    X0, Y0, X1, Y1 = x0 * T, y0 * T, x1 * T, y1 * T

    def f(x, y):
        mx = (x + (y - Y0) // 2) if oblique else x
        if (mx % pas_x) in (0, 1) or y % pas_y in (0, 1) or x in (X0, X1 - 1) or y in (Y0, Y1 - 1):
            return MONTANT
        r = (x + y) % 64
        if r in (0, 1, 2, 7, 8):
            return c
        if r in (3, 9):
            return mel(b, c, 0.5)
        return s if (y % pas_y) < 4 else b
    t.remplit(X0, Y0, X1, Y1, f)


def cadre(t, x0, y0, x1, y1, couleur=(204, 186, 150)):
    """Un pilier ou une bande de pierre claire cerclée de noir (en px)."""
    def f(x, y):
        if x in (x0, x1 - 1) or y in (y0, y1 - 1):
            return K
        return teinte(couleur, 1.08) if x == x0 + 1 or y == y0 + 1 else couleur
    t.remplit(x0, y0, x1, y1, f)


# ---------- les toits ----------

TUILE = (134, 78, 56)
TUILE_C = (166, 102, 72)
TUILE_S = (88, 50, 38)
TUILE_J = (104, 60, 44)
OMBRAGE = {'bas': 1.0, 'haut': 0.8, 'gauche': 0.86, 'droite': 1.0}


def tuile(x, y, sens):
    """Les rangées de tuiles d'un pan dont l'égout est du côté `sens`."""
    a, b = (x, y) if sens in ('bas', 'haut') else (y, x)
    rang = b // 8
    ta, tb = (a + 4 * (rang % 2)) % 8, b % 8
    if sens in ('haut', 'gauche'):
        tb = 7 - tb
    if tb <= 1:
        c = TUILE_S
    elif tb == 7:
        c = TUILE_C
    elif ta == 0:
        c = TUILE_J
    else:
        c = mel(TUILE, TUILE_C, (tb - 2) / 10)
    return teinte(c, OMBRAGE[sens])


def pan(t, x0, y0, x1, y1, sens, dedans=None):
    """Un pan de toit sur [x0, x1[ × [y0, y1[ (px) ; dedans(x, y) restreint la forme."""
    t.remplit(x0, y0, x1, y1, lambda x, y: tuile(x, y, sens) if dedans is None or dedans(x, y) else None)


def faitage(t, x0, y0, x1, y1):
    """Le faîtage : une ligne de tuiles rondes (horizontale ou verticale, en px)."""
    if y0 == y1:
        for x in range(x0, x1):
            for r, c in zip(range(-3, 3), (K, TUILE_C, teinte(TUILE_C, 1.08), TUILE, TUILE_S, K)):
                t.put(x, y0 + r, c if (x % 8) or r in (-3, 2) else TUILE_S)
    else:
        for y in range(y0, y1):
            for r, c in zip(range(-3, 3), (K, TUILE_C, teinte(TUILE_C, 1.08), TUILE, TUILE_S, K)):
                t.put(x0 + r, y, c if (y % 8) or r in (-3, 2) else TUILE_S)


def aretier(t, x0, y0, x1, y1):
    """Un arêtier à 45° de (x0, y0) à (x1, y1) (px)."""
    n = abs(x1 - x0)
    sx, sy = (1 if x1 > x0 else -1), (1 if y1 > y0 else -1)
    for i in range(n):
        x, y = x0 + i * sx, y0 + i * sy
        for r, c in zip(range(-2, 3), (K, TUILE_C, teinte(TUILE_C, 1.08), TUILE_S, K)):
            t.put(x + r, y, c)


def egout(t, x0, y0, x1, y1):
    """Le bord bas d'un pan (la rive) : deux rangées sombres le long du segment (px)."""
    if y0 == y1:
        for x in range(x0, x1):
            t.put(x, y0 - 1, K)
            t.put(x, y0 - 2, TUILE_S)
    else:
        for y in range(y0, y1):
            t.put(x0 - 1 if x0 > 0 else x0, y, K)


def toit_plat(t, x0, y0, x1, y1, pan_coupe=32):
    """Le toit plat de la tour : un fond brun, un rebord de pierre claire, les deux coins du bas
    coupés en biais (px)."""
    def dedans(x, y, m=0):
        if not (x0 + m <= x < x1 - m and y0 + m <= y < y1 - m):
            return False
        c = pan_coupe + m * 0.4
        return (y - (y1 - m - c)) <= (x - x0 - m) and (y - (y1 - m - c)) <= (x1 - m - 1 - x)

    def f(x, y):
        if not dedans(x, y):
            return None
        if not dedans(x, y, 1):
            return K
        if not dedans(x, y, 7):
            return (226, 210, 176) if not dedans(x, y, 3) else (200, 182, 148)
        if not dedans(x, y, 8):
            return K
        if not dedans(x, y, 10):
            return (84, 58, 44)
        c = (122, 86, 62)
        return teinte(c, 0.94) if hasard(x % 16, y % 16, 12) < 0.12 else c
    t.remplit(x0, y0, x1, y1, f)


# ---------- le bois de construction ----------

PLANCHE = ((138, 92, 58), (96, 62, 40), (164, 114, 74))


def planche(x, y, verticale=True):
    a, b = (x, y) if verticale else (y, x)
    b_, j, c = PLANCHE
    if a % 8 == 7:
        return j
    if a % 8 == 0:
        return c
    if (b + 5 * (a // 8)) % 32 == 0:
        return j
    if (b + 5 * (a // 8)) % 32 == 3 and a % 8 == 3:
        return (60, 56, 58)
    return teinte(b_, 0.94) if hasard(a % 16, b % 16, 13) < 0.15 else b_


def toit_planches(t, x0, y0, x1, y1, verticale=True):
    X0, Y0, X1, Y1 = x0 * T, y0 * T, x1 * T, y1 * T

    def f(x, y):
        if x in (X0, X1 - 1) or y in (Y0, Y1 - 1):
            return K
        if x in (X0 + 1, X0 + 2) or y in (Y0 + 1, Y0 + 2):
            return PLANCHE[2]
        if x in (X1 - 3, X1 - 2) or y in (Y1 - 3, Y1 - 2):
            return PLANCHE[1]
        return planche(x, y, verticale)
    t.remplit(X0, Y0, X1, Y1, f)


def porte_planches(t, x0, y0, x1, y1):
    """La grande porte de bois de la remise (px), deux battants et leurs écharpes."""
    def f(x, y):
        if x in (x0, x1 - 1, (x0 + x1) // 2) or y in (y0, y1 - 1):
            return K
        u = (x - x0) % ((x1 - x0) // 2)
        v = y - y0
        if abs(u - v * (x1 - x0) / 2 / (y1 - y0)) < 1.5:
            return PLANCHE[2]
        return planche(x, y, True)
    t.remplit(x0, y0, x1, y1, f)


def cloture_h(t, x0, x1, yb):
    """Une palissade basse vue de face (px) : piquets pointus tous les 4 px, deux lisses ; yb : le pied."""
    for x in range(x0, x1):
        for y in (yb - 9, yb - 4):
            t.put(x, y, PLANCHE[1])
            t.put(x, y - 1, PLANCHE[2])
    for x in range(x0 + 1, x1 - 1, 4):
        for y in range(yb - 12, yb + 1):
            t.put(x, y, PLANCHE[2] if y > yb - 12 else K)
            t.put(x + 1, y, PLANCHE[0] if y > yb - 11 else K)
        t.put(x, yb + 1, (20, 50, 40, 90))
        t.put(x + 1, yb + 1, (20, 50, 40, 90))


def cloture_v(t, x, y0, y1):
    """Une palissade vue de dessus (px) : une lisse et un piquet tous les 8 px ; x : le milieu."""
    for y in range(y0, y1):
        t.put(x - 1, y, PLANCHE[1])
        t.put(x, y, PLANCHE[0])
        t.put(x + 1, y, (20, 50, 40, 90))
    for y in range(y0 + 2, y1 - 2, 8):
        for dy in range(-2, 3):
            for dx in range(-2, 2):
                bord = dx in (-2, 1) or dy in (-2, 2)
                t.put(x + dx, y + dy, K if bord else (PLANCHE[2] if dy < 0 else PLANCHE[0]))
        t.put(x + 2, y + 2, (20, 50, 40, 90))


def tirets(t, x0, x1, y0, y1, horizontal=True, periode=48, long=24):
    """Les tirets jaunes du milieu de la chaussée (px) : un tiret de `long` px tous les `periode`."""
    jaune, clair, sombre = (206, 178, 108), (232, 208, 142), (160, 134, 84)
    if horizontal:
        for x in range(x0, x1):
            if (x - x0) % periode >= long:
                continue
            for y in range(y0, y1):
                c = clair if y == y0 else (sombre if y == y1 - 1 else jaune)
                if hasard(x % 16, y % 16, 21) > 0.9:
                    c = mel(c, (102, 89, 81), 0.5)
                t.put(x, y, c)
    else:
        for y in range(y0, y1):
            if (y - y0) % periode >= long:
                continue
            for x in range(x0, x1):
                c = clair if x == x0 else (sombre if x == x1 - 1 else jaune)
                if hasard(x % 16, y % 16, 21) > 0.9:
                    c = mel(c, (102, 89, 81), 0.5)
                t.put(x, y, c)


def demi_ellipse_haut(cx, y0, hw, ry):
    """Pour un dôme : la forme (x, y) sous la demi-ellipse de sommet (cx, y0)."""
    def dedans(x, y):
        u = (x + 0.5 - cx) / hw
        if abs(u) > 1:
            return False
        return y + 0.5 >= y0 + ry * (1 - math.sqrt(1 - u * u))
    return dedans
