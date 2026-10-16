# Le plan de la grande ville (168 × 219 tuiles, neuf fois l'échantillon d'origine), relevé
# sur la maquette en photo : les rues, les îlots et leurs quartiers, et le réseau des voies
# d'où l'on tire les trajets des voitures (js/ville-carte.js).
#
#   à l'ouest   la zone industrielle (les entrepôts, futures entreprises : conserverie,
#               fromagerie, confiturerie), la voie ferrée nord-sud et la gare, des bureaux
#   au milieu   les rangées de maisons, la bibliothèque, l'école, le parc aux fontaines
#   à l'est     les bureaux, le marché et le grand magasin
#   au sud      le grand parc (le lac, le monument) et le parc de jeux (l'amphithéâtre)
#
# Toutes les mesures sont en tuiles de 16 px : une chaussée va de x0 à x1 (exclu), de y0 à y1.
from commun import H, T, W

# ---------- les rues ----------

# (nom, x0, x1, y0, y1) : les chaussées nord-sud, puis est-ouest
RUES_V = [
    ('avenue_ouest', 36, 44, 0, H),
    ('rue_des_maisons', 82, 88, 0, 157),
    ('boulevard', 110, 118, 0, H),
    ('rue_des_bureaux', 138, 144, 0, 78),
]
RUES_H = [
    ('rue_du_haut', 36, W, 10, 16),
    ('rue_de_la_bibliotheque', 36, W, 72, 78),
    ('rue_de_l_ecole', 36, W, 104, 112),
    ('rue_des_parcs', 36, W, 149, 157),
    ('route_de_la_ferme', 0, 44, 170, 176),     # vers la carte de transition et la ferme
]

# la voie ferrée : deux voies nord-sud (leurs axes, en px), de la montagne (au nord) à la plage
VOIES = (14 * T, 17 * T)
FER = (13, 18)            # les colonnes du ballast

# les quais et la gare
QUAIS = [(8, 13, 60, 112), (18, 23, 60, 112)]


def croisements():
    """Les carrefours : (rue nord-sud, rue est-ouest, x0, x1, y0, y1) là où deux chaussées se
    recouvrent."""
    out = []
    for v in RUES_V:
        for h in RUES_H:
            x0, x1 = max(v[1], h[1]), min(v[2], h[2])
            y0, y1 = max(v[3], h[3]), min(v[4], h[4])
            if x0 < x1 and y0 < y1:
                out.append((v[0], h[0], x0, x1, y0, y1))
    return out


# ---------- la circulation : les voies et les trajets ----------

HORS = 48           # on entre et on sort à 48 px hors de la carte
ECART = 15          # chaque file à 15 px du milieu de la chaussée (on roule à droite)


def milieu_v(r):
    return (r[1] + r[2]) / 2 * T


def milieu_h(r):
    return (r[3] + r[4]) / 2 * T


def file_v(r, vers_le_bas):
    """L'abscisse de la file d'une rue nord-sud : vers le bas, à gauche de l'écran."""
    return milieu_v(r) + (-ECART if vers_le_bas else ECART)


def file_h(r, vers_la_droite):
    """L'ordonnée de la file d'une rue est-ouest : vers la gauche, en haut."""
    return milieu_h(r) + (ECART if vers_la_droite else -ECART)


def reseau():
    """Le graphe des rues : les nœuds (carrefours et bouts de rue au bord de la carte), et pour
    chaque rue la suite de ses nœuds dans l'ordre. Un nœud : (x, y) en px, au milieu."""
    rues = {r[0]: ('v', r) for r in RUES_V}
    rues.update({r[0]: ('h', r) for r in RUES_H})
    noeuds = {}            # nom -> (x, y, {rue: position le long de la rue})
    for v, h, x0, x1, y0, y1 in croisements():
        noeuds[f'{v}/{h}'] = ((x0 + x1) / 2 * T, (y0 + y1) / 2 * T, {v: (y0 + y1) / 2, h: (x0 + x1) / 2})
    entrees = {}
    for nom, (sens, r) in rues.items():
        if sens == 'v':
            for bout, y in (('nord', r[3]), ('sud', r[4])):
                if y in (0, H):
                    n = f'{nom}:{bout}'
                    noeuds[n] = (milieu_v(r), -HORS if y == 0 else H * T + HORS, {nom: -1 if y == 0 else H + 1})
                    entrees[n] = (nom, bout)
        else:
            for bout, x in (('ouest', r[1]), ('est', r[2])):
                if x in (0, W):
                    n = f'{nom}:{bout}'
                    noeuds[n] = (-HORS if x == 0 else W * T + HORS, milieu_h(r), {nom: -1 if x == 0 else W + 1})
                    entrees[n] = (nom, bout)
    suites = {}
    for nom in rues:
        sur = [(p[nom], n) for n, (_, _, p) in noeuds.items() if nom in p]
        suites[nom] = [n for _, n in sorted(sur)]
    return rues, noeuds, suites, entrees


def chemin(depart, arrivee, noeuds, suites):
    """Le plus court chemin (en nombre de carrefours) : la liste des (nœud, rue prise pour y
    arriver)."""
    voisins = {}
    for rue, ns in suites.items():
        for a, b in zip(ns, ns[1:]):
            voisins.setdefault(a, []).append((b, rue))
            voisins.setdefault(b, []).append((a, rue))
    prec = {depart: None}
    file = [depart]
    for n in file:
        if n == arrivee:
            break
        for m, rue in voisins.get(n, []):
            if m not in prec:
                prec[m] = (n, rue)
                file.append(m)
    if arrivee not in prec:
        return None
    out = []
    n = arrivee
    while prec[n]:
        p, rue = prec[n]
        out.append((n, rue))
        n = p
    out.append((depart, None))
    return out[::-1]


def trajet(depart, arrivee):
    """La polyligne (px) d'un trajet d'une entrée à une sortie : le point d'entrée, un coin à
    chaque carrefour où l'on tourne (là où la file d'arrivée croise la file de départ), le
    point de sortie."""
    rues, noeuds, suites, _ = reseau()
    c = chemin(depart, arrivee, noeuds, suites)
    if not c or len(c) < 2:
        return None
    # pour chaque tronçon : la rue et le sens
    troncons = []
    for (a, _), (b, rue) in zip(c, c[1:]):
        (xa, ya, _), (xb, yb, _) = noeuds[a], noeuds[b]
        sens, r = rues[rue]
        if sens == 'v':
            troncons.append(('v', r, yb > ya))
        else:
            troncons.append(('h', r, xb > xa))
    # fusionne les tronçons d'une même rue dans le même sens
    fusion = [troncons[0]]
    for t in troncons[1:]:
        if t[1] is fusion[-1][1] and t[2] == fusion[-1][2]:
            continue
        fusion.append(t)

    def ligne(t):
        sens, r, s = t
        return ('x', file_v(r, s)) if sens == 'v' else ('y', file_h(r, s))

    x0, y0, _ = noeuds[depart]
    x1, y1, _ = noeuds[arrivee]
    premier, dernier = ligne(fusion[0]), ligne(fusion[-1])
    pts = [(premier[1], y0) if premier[0] == 'x' else (x0, premier[1])]
    for a, b in zip(fusion, fusion[1:]):
        la, lb = ligne(a), ligne(b)
        if la[0] == lb[0]:
            return None            # (un demi-tour : pas de trajet)
        pts.append((la[1], lb[1]) if la[0] == 'x' else (lb[1], la[1]))
    pts.append((dernier[1], y1) if dernier[0] == 'x' else (x1, dernier[1]))
    return pts


def trajets(par_entree=4):
    """Les trajets des voitures : de chaque entrée, vers `par_entree` sorties prises de loin en
    loin dans la liste (toujours les mêmes)."""
    _, _, _, entrees = reseau()
    noms = sorted(entrees)
    out = {}
    for i, a in enumerate(noms):
        autres = [b for b in noms if b != a]
        for k in range(par_entree):
            b = autres[(i * 3 + k * max(1, len(autres) // par_entree)) % len(autres)]
            pts = trajet(a, b)
            if pts:
                out[f'{a}>{b}'] = pts
    return out
