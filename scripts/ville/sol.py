# Les sols de la ville : l'asphalte, le trottoir, l'herbe et les pavés de la place, en motifs
# qui se répètent toutes les 16 px, et leurs tuiles de passage (« coins de Wang ») : la tuile n
# d'un passage A → B a la matière B au coin haut-gauche si n & 8, haut-droit si n & 4,
# bas-gauche si n & 2, bas-droit si n & 1 (comme les rives de l'infra-monde). La matière B est
# celle qui est « au-dessus » : la bordure du trottoir sur la chaussée, l'herbe sur le trottoir…
# L'herbe est celle de la ferme (scripts/ville/ferme.py).
import ferme
from commun import T, hasard, image, mel, rgba, teinte

ASPH = (102, 89, 81)
ASPH_S = (88, 76, 70)
ASPH_C = (117, 104, 95)
ASPH_F = (72, 62, 58)
TROT = (134, 134, 142)
TROT_C = (152, 152, 160)
TROT_J = (102, 102, 112)
BORD = (146, 146, 156)
BORD_C = (176, 176, 184)
BORD_K = (70, 66, 74)
HERBE_S = (114, 142, 44)          # le vert sombre de l'herbe de la ferme
HERBE_K = (39, 83, 25)            # ses brins les plus sombres
PLACE = (162, 160, 164)
PLACE_S = (138, 136, 142)
PLACE_J = (108, 106, 114)
PLACE_C = (186, 184, 188)


# ---------- les motifs (coordonnées dans la tuile, 0..15) ----------

def asphalte(x, y, v=0):
    n = hasard(x, y, v * 7 + 1)
    c = ASPH
    if n < 0.09:
        c = ASPH_S
    elif n > 0.94:
        c = ASPH_C
    if v == 1:     # une fissure
        cx = 3 + round(10 * (y / 15)) + (1 if hasard(y, 5) > 0.6 else 0)
        if 2 <= y <= 13 and x == cx:
            c = ASPH_F
    elif v == 2:   # une tache d'huile
        d = ((x - 8) / 5) ** 2 + ((y - 9) / 3.4) ** 2
        if d < 1:
            c = teinte(c, 0.86 if d > 0.45 else 0.8)
    elif v == 3:   # des gravillons
        if hasard(x, y, 41) > 0.9:
            c = teinte(ASPH_C, 1.08)
    return c


def trottoir(x, y, v=0):
    rang = y // 8
    jx, jy = (x + 8 * (rang % 2)) % 16, y % 8
    if jx == 15 or jy == 7:
        return TROT_J
    c = TROT_C if jx == 0 or jy == 0 else TROT
    n = hasard(x, y, v + 3)
    if n < 0.06:
        c = mel(c, TROT_J, 0.55)
    elif v == 1 and n > 0.97:
        c = TROT_J
    return c


def herbe(x, y, v=0):
    """L'herbe claire de la ferme, sa variante v (0..15)."""
    return ferme.herbe(x, y, v)


def place(x, y, v=0):
    rang = y // 8
    dec = 4 * (rang % 2)
    jx, jy = (x + dec) % 8, y % 8
    if jx == 7 or jy == 7:
        return PLACE_J
    pierre = ((x + dec) // 8) % 2, rang
    c = teinte(PLACE, 0.94 + 0.1 * hasard(*pierre, v + 5))
    if jx == 0 or jy == 0:
        c = mel(c, PLACE_C, 0.6)
    elif jx == 6 or jy == 6:
        c = mel(c, PLACE_S, 0.6)
    return c


MOTIFS = {'asphalte': asphalte, 'trottoir': trottoir, 'herbe': herbe, 'place': place}
VARIANTES = {'asphalte': 4, 'trottoir': 2, 'herbe': 16, 'place': 2}
COULEURS = {'asphalte': '#665951', 'trottoir': '#94949c', 'herbe': '#86a534', 'place': '#a2a0a4'}


def plein(matiere, v=0):
    im = image(T, T)
    f = MOTIFS[matiere]
    for y in range(T):
        for x in range(T):
            im.putpixel((x, y), rgba(f(x, y, v)))
    return im


# ---------- les passages ----------

def dedans_b(x, y, n):
    """Le pixel (x, y) (hors de la tuile aussi, pour les bords) est-il de la matière B ?"""
    coins = [(0, 0, 8), (1, 0, 4), (0, 1, 2), (1, 1, 1)]
    nb = sum(1 for *_, b in coins if n & b)
    if nb == 0:
        return False
    if nb == 4:
        return True
    # le quart de tuile de chaque coin ; un coin isolé (ses deux voisins de l'autre matière) a
    # son angle intérieur arrondi. Les coins « cibles » sont ceux de la matière minoritaire.
    u, v = (x + 0.5) / T, (y + 0.5) / T
    r = 0.3
    cible = {(cx, cy) for cx, cy, b in coins if bool(n & b) == (nb <= 2)}
    qx, qy = (0 if u < 0.5 else 1), (0 if v < 0.5 else 1)
    dedans = (qx, qy) in cible
    if dedans and (1 - qx, qy) not in cible and (qx, 1 - qy) not in cible:
        # l'angle intérieur du quart (vers le centre de la tuile)
        ax = 0.5 - r if qx == 0 else 0.5 + r
        ay = 0.5 - r if qy == 0 else 0.5 + r
        au = (u - ax) * (1 if qx == 0 else -1)
        av = (v - ay) * (1 if qy == 0 else -1)
        if au > 0 and av > 0 and (au * au + av * av) ** 0.5 > r:
            dedans = False
    return dedans if nb <= 2 else not dedans


def distance(x, y, n, vers_b):
    """La distance (en px, arrondie, jusqu'à 4) du pixel au plus proche pixel de l'autre matière."""
    best = 9
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if dx == dy == 0:
                continue
            if dedans_b(x + dx, y + dy, n) == vers_b:
                best = min(best, (dx * dx + dy * dy) ** 0.5)
    return round(best)


PASSAGES = {
    # (A, B) : le style du bord de B sur A
    ('asphalte', 'trottoir'): 'bordure',
    ('trottoir', 'herbe'): 'herbe',
    ('asphalte', 'herbe'): 'herbe_bordure',
    ('herbe', 'place'): 'place',
}


def passage(a, b, n, v=0):
    style = PASSAGES[(a, b)]
    fa, fb = MOTIFS[a], MOTIFS[b]
    im = image(T, T)
    for y in range(T):
        for x in range(T):
            if dedans_b(x, y, n):
                c = fb(x, y, v)
                d = distance(x, y, n, False)
                if style == 'bordure':
                    c = {1: BORD_K, 2: BORD_C, 3: BORD}.get(d, c)
                elif style == 'herbe':
                    c = {1: HERBE_K, 2: HERBE_S}.get(d, c)
                elif style == 'herbe_bordure':
                    c = {1: BORD_K, 2: BORD_C, 3: BORD, 4: HERBE_K}.get(d, c)
                elif style == 'place':
                    c = {1: teinte(PLACE_J, 0.88), 2: PLACE_C}.get(d, c)
            else:
                c = fa(x, y, v)
                # l'ombre portée du bord (la lumière vient du haut à gauche)
                if style != 'place' and (dedans_b(x, y - 1, n) or dedans_b(x - 1, y, n)):
                    c = teinte(c, 0.78)
                elif style == 'place' and distance(x, y, n, True) == 1:
                    c = HERBE_S
            im.putpixel((x, y), rgba(c))
    return im


def jeu_de_passage(planche, a, b):
    """Les 16 tuiles du passage a → b dans la planche (avec leur jeu de Wang pour Tiled)."""
    ids = []
    for n in range(16):
        if n == 0:
            t = planche.ajoute(plein(a), f'{a}')
        elif n == 15:
            t = planche.ajoute(plein(b), f'{b}')
        else:
            t = planche.ajoute(passage(a, b, n), f'{a}_{b}_{n}')
        ids.append(t)
    planche.wangs.append((f'{a} / {b}', (a, COULEURS[a]), (b, COULEURS[b]), ids))
    return ids
