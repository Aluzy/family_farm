# Les matières des bâtiments (coordonnées du monde, en px) : la brique de quatre couleurs, la
# pierre de taille, le verre, les tuiles de terre cuite et le faîtage, le toit plat, les
# planches de bois, les palissades et les tirets de la chaussée. Les motifs se répètent toutes
# les 8, 16 ou 32 px, calés sur la grille : la découpe en tuiles retrouve les mêmes tuiles d'un
# mur à l'autre. Les bâtiments eux-mêmes (façades, toits en 3/4) : scripts/ville/immeubles.py.
from commun import K, hasard, mel, teinte

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


# ---------- le verre ----------

VERRE = {
    'clair': ((150, 178, 190), (122, 150, 166), (214, 232, 238)),
    'sombre': ((104, 128, 146), (84, 104, 124), (162, 186, 200)),
    'verriere': ((176, 202, 212), (140, 170, 186), (230, 242, 246)),
}
MONTANT = (58, 64, 74)


# ---------- les toits ----------

TUILE = (134, 78, 56)
TUILE_C = (166, 102, 72)
TUILE_S = (88, 50, 38)
TUILE_J = (104, 60, 44)
OMBRAGE = {'bas': 1.0, 'haut': 0.8, 'gauche': 0.86, 'droite': 1.0}


# les couvertures : (tuile, arête claire, rang sombre, joint)
COUVERTURES = {
    'tuile': (TUILE, TUILE_C, TUILE_S, TUILE_J),
    'tuile_rouge': ((156, 66, 52), (190, 94, 72), (98, 40, 34), (120, 50, 42)),
    'ardoise': ((82, 88, 106), (112, 120, 140), (50, 54, 68), (64, 70, 86)),
    'tole_grise': ((130, 136, 146), (168, 174, 182), (82, 86, 96), (104, 110, 120)),
    'tole_bleue': ((82, 110, 148), (118, 148, 184), (50, 68, 96), (66, 88, 120)),
}


def tuile(x, y, sens, couv='tuile'):
    """Les rangées de tuiles d'un pan dont l'égout est du côté `sens` ; une tôle : des ondes
    qui descendent le pan."""
    T_, C_, S_, J_ = COUVERTURES[couv]
    a, b = (x, y) if sens in ('bas', 'haut') else (y, x)
    if couv.startswith('tole'):
        o = a % 6
        c = S_ if o == 0 else C_ if o == 1 else mel(T_, C_, 0.35) if o == 2 else T_
        return teinte(c, OMBRAGE[sens])
    rang = b // 8
    ta, tb = (a + 4 * (rang % 2)) % 8, b % 8
    if sens in ('haut', 'gauche'):
        tb = 7 - tb
    if tb <= 1:
        c = S_
    elif tb == 7:
        c = C_
    elif ta == 0:
        c = J_
    else:
        c = mel(T_, C_, (tb - 2) / 10)
    return teinte(c, OMBRAGE[sens])


def faitage(t, x0, y0, x1, y1, couv='tuile'):
    """Le faîtage : une ligne de tuiles rondes (horizontale ou verticale, en px)."""
    T_, C_, S_, J_ = COUVERTURES[couv]
    rangs = (K, C_, teinte(C_, 1.08), T_, S_, K)
    if y0 == y1:
        for x in range(x0, x1):
            for r, c in zip(range(-3, 3), rangs):
                t.put(x, y0 + r, c if (x % 8) or r in (-3, 2) else S_)
    else:
        for y in range(y0, y1):
            for r, c in zip(range(-3, 3), rangs):
                t.put(x0 + r, y, c if (y % 8) or r in (-3, 2) else S_)


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

