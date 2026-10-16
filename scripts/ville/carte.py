# La ville, redessinée tuile par tuile d'après l'image de référence (896 × 1168 px, soit
# 56 × 73 tuiles de 16 px), sans ses passants : assets/ville.tmj, carte de travail Tiled, et
# ses jeux de tuiles rangés par matière :
#
#   ville_asphalte    la chaussée (4 variantes : nue, fissurée, tachée, gravillonnée), les tirets
#   ville_trottoir    les dalles grises, la bordure du trottoir sur la chaussée (16 coins de Wang)
#   ville_herbe       l'herbe de la ferme (16 variantes), ses bords sur le trottoir et sur la
#                     chaussée, les fleurs et herbes hautes de la ferme
#   ville_pierre      les pavés de la place (et leurs bords de Wang sur l'herbe, pour Tiled), la pierre de taille de la
#                     bibliothèque (corniche, colonnes, entrée), les dalles du jardin, les cailloux
#   ville_brique      les murs de brique rouge, orange, ocre et bleue, bandeaux et colombages
#   ville_verre       les murs de verre de la tour, la verrière et les flancs de la bibliothèque
#   ville_toit        les tuiles de terre cuite (pans, faîtages, arêtiers, pignons), le dôme,
#                     le toit plat de la tour
#   ville_bois        le toit de planches de l'appentis, la remise, les palissades, bancs,
#                     panneau et tonneaux
#   ville_menuiserie  les fenêtres, portes, la porte vitrée, la bouche d'aération
#   ville_metal       les plaques d'égout, le climatiseur, les réverbères
#   ville_eau         les deux fontaines, remplies de l'eau de la ferme (8 images d'animation)
#   ville_vegetation  les arbres, pins et buissons de la ferme, et leurs ombres
#   ville_vehicules   les voitures garées, tirées de assets/ville_voitures.png (scripts/ville/
#                     voitures.py : cinq couleurs, huit directions, pour les faire rouler)
#
# Chaque matière est peinte sur sa propre couche de la carte, puis découpée en tuiles : une
# planche ne garde qu'un exemplaire de chaque tuile (les motifs sont calés sur la grille). Les
# sols sont posés en « coins de Wang » : la carte décide de la matière de chaque coin de
# tuile, chaque tuile en déduit son dessin (les .tsx déclarent ces jeux, pour Tiled).
# L'herbe, les arbres et buissons et l'eau sont ceux de la ferme (voir scripts/ville/ferme.py) :
# relancer ce script après avoir retouché la planche de la ferme.
#
# La couche d'objets « depart » : le point où l'on arrive en se promenant (ville-carte.html,
# js/ville-carte.js, qui lit assets/ville.json : node scripts/build-map.mjs).
#
#   python3 scripts/ville/carte.py            écrit les planches, les .tsx et la carte
#   python3 scripts/ville/carte.py --apercu   écrit aussi apercu_ville.png (la carte rendue)
#
# Les planches de RETOUCHEES ont été reprises à la main : le script ne réécrit pas leur .png
# (seulement leur .tsx), tant que leurs tuiles restent aux mêmes places ; --redessine les
# redessine quand même (et efface les retouches).
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batiments as B  # noqa: E402
import ferme as F  # noqa: E402
import objets as O  # noqa: E402
import sol as S  # noqa: E402
import voitures as V  # noqa: E402
from commun import ASSETS, ROOT, H, T, W, Planche, Toile, hasard, image  # noqa: E402

PLANCHES = {p.nom.split('_', 1)[1]: p for p in (
    Planche('ville_asphalte', "La chaussée et ses tirets"),
    Planche('ville_trottoir', "Le trottoir et sa bordure"),
    Planche('ville_herbe', "L'herbe de la ferme, ses bords, fleurs et herbes hautes"),
    Planche('ville_pierre', "Pavés de la place, pierre de taille, dalles, cailloux"),
    Planche('ville_brique', "Les murs de brique"),
    Planche('ville_verre', "Les murs de verre"),
    Planche('ville_toit', "Les toits"),
    Planche('ville_bois', "Planches, palissades, bancs, panneau, tonneaux"),
    Planche('ville_menuiserie', "Fenêtres et portes"),
    Planche('ville_metal', "Plaques d'égout, climatiseur, réverbères"),
    Planche('ville_eau', "Les fontaines et l'eau de la ferme (8 images)", images=F.EAU_IMAGES, duree=F.EAU_DUREE),
    Planche('ville_vegetation', "Arbres, pins et buissons de la ferme, et leurs ombres"),
    Planche('ville_vehicules', "Les voitures"),
)}
RETOUCHEES = {'ville_trottoir', 'ville_brique', 'ville_menuiserie'}
MATIERE_SOL = {'asphalte': 'asphalte', 'trottoir': 'trottoir', 'herbe': 'herbe', 'place': 'pierre'}
PLANCHE_PASSAGE = {('asphalte', 'trottoir'): 'trottoir', ('trottoir', 'herbe'): 'herbe',
                   ('asphalte', 'herbe'): 'herbe', ('herbe', 'place'): 'pierre'}

# Les couches peintes, de bas en haut : (nom, planche, images)
COUCHES = [
    ('marquage', 'asphalte', 1), ('egouts', 'metal', 1), ('dalles', 'pierre', 1), ('fleurs', 'herbe', 1),
    ('ombres', 'vegetation', 1), ('murs', 'brique', 1), ('pierre_de_taille', 'pierre', 1), ('vitrages', 'verre', 1),
    ('charpente', 'bois', 1), ('toits', 'toit', 1), ('menuiserie', 'menuiserie', 1), ('equipements', 'metal', 1),
    ('fontaines', 'eau', F.EAU_IMAGES), ('mobilier', 'bois', 1), ('vehicules', 'vehicules', 1), ('vegetation', 'vegetation', 1),
]


# ---------- le sol : la matière de chaque coin ----------

def coins():
    g = [['asphalte'] * (W + 1) for _ in range(H + 1)]

    def zone(m, x0, y0, x1, y1):       # coins [x0, x1] × [y0, y1]
        for y in range(max(0, y0), min(H, y1) + 1):
            for x in range(max(0, x0), min(W, x1) + 1):
                g[y][x] = m
    # en haut : les trottoirs devant les façades, le long de la tour
    zone('trottoir', 0, 0, 33, 3)
    zone('trottoir', 42, 0, 56, 3)
    zone('trottoir', 0, 0, 5, 11)
    # l'îlot du milieu : trottoirs, jardin de la bibliothèque, la bande d'herbe près de la tour
    zone('trottoir', 0, 10, 33, 33)
    zone('herbe', 13, 12, 31, 31)
    zone('herbe', 2, 12, 4, 15)
    # l'îlot de droite
    zone('trottoir', 42, 10, 56, 33)
    # en bas : le parc, le parking, le trottoir de droite et la place de la fontaine
    zone('herbe', 0, 42, 56, 73)
    zone('asphalte', 5, 48, 23, 73)
    zone('trottoir', 9, 61, 9, 73)
    zone('trottoir', 0, 40, 56, 41)      # le trottoir du bas, d'un bout à l'autre
    return g


def tuile_sol(g, x, y):
    c = [g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1]]
    if len(set(c)) == 1:
        m = c[0]
        r = hasard(x, y, 7)
        v = {'asphalte': 1 if r < 0.04 else 2 if r < 0.08 else 3 if r < 0.11 else 0,
             'trottoir': 1 if r < 0.12 else 0,
             'herbe': int(hasard(x, y, 8) * 16),
             'place': 1 if r < 0.3 else 0}[m]
        return MATIERE_SOL[m], S.plein(m, v), f'{m}_{v}'
    presentes = sorted(set(c))
    if len(presentes) > 2 or tuple(presentes) not in PASSAGES_TRIES:
        # trois matières à un même croisement : la moins présente prend la place d'une autre
        best = None
        for m in presentes:
            for r in presentes:
                if r == m:
                    continue
                cc = [r if v == m else v for v in c]
                p = tuple(sorted(set(cc)))
                if len(p) == 1 or p in PASSAGES_TRIES:
                    cout = c.count(m)
                    if best is None or cout < best[0]:
                        best = (cout, cc)
        c = best[1]
        if len(set(c)) == 1:
            return MATIERE_SOL[c[0]], S.plein(c[0]), c[0]
    a, b = PASSAGES_TRIES[tuple(sorted(set(c)))]
    n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == b)
    return PLANCHE_PASSAGE[(a, b)], S.passage(a, b, n), f'{a}_{b}_{n}'


PASSAGES_TRIES = {tuple(sorted(p)): p for p in S.PASSAGES}


# ---------- les bâtiments ----------

def batiments(c):
    murs, pierre, vitres, bois, toits, menu, equip = (c[k] for k in ('murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie', 'equipements'))
    fen, porte = O.fenetre(), O.porte()

    def fenetres(cols, ligne):
        for x in cols:
            menu.colle(fen, x * T, ligne * T)

    # --- en haut, le bas des façades coupées par le bord de l'image
    B.mur(murs, 5, 0, 14, 2, 'bleu', haut=False)
    fenetres((6, 7, 11, 12), 0)
    menu.colle(porte, 9 * T, 0)
    B.mur(murs, 16, 0, 30, 2, 'ocre', haut=False)
    fenetres((18, 19, 24), 0)
    B.mur(murs, 45, 0, 56, 2, 'rouge', haut=False, droite=False)
    fenetres((46, 49, 54), 0)
    menu.colle(porte, 51 * T, 0)

    # --- à gauche, la maison bleue (deux corps)
    B.pan(toits, 0, 0, 3 * T, 6 * T, 'droite')
    B.egout(toits, 3 * T, 0, 3 * T, 6 * T)
    B.mur(murs, 0, 6, 2, 16, 'bleu', gauche=False)
    fenetres((0,), 7)
    fenetres((0,), 11)
    B.pan(toits, 0, 16 * T, 5 * T, 22 * T, 'bas')
    B.faitage(toits, 0, 16 * T + 3, 5 * T, 16 * T + 3)
    B.mur(murs, 0, 22, 5, 32, 'bleu', gauche=False)
    fenetres((0, 3), 23)
    fenetres((0, 3), 26)
    fenetres((3,), 29)
    menu.colle(porte, 1 * T, 30 * T)

    # --- la tour de verre : toit plat, quatre étages de verre, socle de brique bleue
    toits_plat = c['toits_plat']
    B.toit_plat(toits_plat, 5 * T, 4 * T, 14 * T, 12 * T)
    equip.colle(O.climatiseur(), 10 * T + 8, 5 * T)
    # les flancs de verre montent jusque sous les coins coupés du toit (ils les remplissent)
    B.verre(vitres, 5, 10, 7, 27, 'sombre')
    B.verre(vitres, 7, 12, 12, 27, 'clair')
    B.verre(vitres, 12, 10, 14, 27, 'sombre')
    for x in (7 * T - 2, 12 * T - 2):
        B.cadre(vitres, x, 10 * T, x + 4, 27 * T)
    B.cadre(vitres, 5 * T, 27 * T, 14 * T, 28 * T)
    B.mur(murs, 5, 28, 14, 32, 'bleu', haut=False)
    menu.colle(O.porte_vitree(), 8 * T + 8, 30 * T)

    # --- la bibliothèque : dôme de tuiles, verrière, façade de pierre à colonnes, aile gauche
    B.pan(toits, 14 * T, 12 * T, 17 * T, 14 * T, 'bas')
    B.faitage(toits, 14 * T, 12 * T + 3, 17 * T, 12 * T + 3)
    B.mur(murs, 14, 14, 16, 22, 'ocre', haut=True)
    fenetres((14, 15), 15)
    fenetres((14, 15), 18)
    cx = 21 * T + 8
    dome = B.demi_ellipse_haut(cx, 9 * T, 5.5 * T, 4.5 * T)
    B.pan(toits, 16 * T, 9 * T, cx, 18 * T, 'gauche', dome)
    B.pan(toits, cx, 9 * T, 27 * T, 18 * T, 'droite', dome)
    haut_dome = next(y for y in range(9 * T, 18 * T) if dome(cx, y))
    B.faitage(toits, cx, haut_dome, cx, 18 * T)
    B.egout(toits, 16 * T, 18 * T, 27 * T, 18 * T)
    # le liseré clair du bord du dôme
    for y in range(9 * T, 18 * T):
        for x in range(16 * T, 27 * T):
            if dome(x, y) and not all(dome(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, -2))):
                toits.put(x, y, (214, 192, 150))
    B.verre(vitres, 17, 18, 26, 19, 'verriere', pas_x=24, oblique=True)
    B.verre(vitres, 16, 18, 17, 26, 'sombre', pas_x=8, pas_y=32)
    B.verre(vitres, 26, 18, 27, 26, 'sombre', pas_x=8, pas_y=32)
    B.facade_pierre(pierre, 17, 19, 26, 26)
    B.entablement(pierre, 17, 26, 19)
    for x in (18 * T + 3, 24 * T + 3):
        B.colonne(pierre, x, 20, 26)
    pierre.colle(O.entree(), 20 * T, 22 * T + 8)

    # --- l'immeuble orange : toit à croupe (arêtiers à 45°), trois étages de fenêtres
    X0, Y0, Yf, Y1 = 45 * T, 9 * T, 12 * T, 18 * T
    B.pan(toits, X0, Y0, W * T, Yf, 'haut', lambda x, y: x - X0 >= y - Y0)
    B.pan(toits, X0, Y0, X0 + 3 * T, Yf + 3 * T, 'gauche', lambda x, y: x - X0 < min(y - Y0, 2 * Yf - Y0 - y))
    B.pan(toits, X0, Yf, W * T, Y1, 'bas', lambda x, y: x - X0 >= 2 * Yf - Y0 - y)
    B.faitage(toits, X0 + 3 * T, Yf, W * T, Yf)
    B.aretier(toits, X0, Y0, X0 + 3 * T, Yf)
    B.aretier(toits, X0 + 3 * T, Yf, X0, Yf + 3 * T)
    B.egout(toits, X0, Y1, W * T, Y1)
    B.mur(murs, 45, 18, 56, 32, 'orange', droite=False)
    B.bandeau(murs, 45, 56, 23)
    B.bandeau(murs, 45, 56, 27)
    fenetres((46, 48, 50, 52, 54), 19)
    fenetres((46, 48, 50, 52, 54), 24)
    fenetres((46, 48, 53, 55), 28)
    menu.colle(porte, 51 * T, 30 * T)

    # --- la maison à pignons, en bas : deux ailes à pignon, un corps central
    Yt, Yb = 39 * T, 43 * T
    B.mur(murs, 25, 40, 42, 50, 'orange')
    for ax in (25, 38):
        g, d = ax * T, (ax + 4) * T
        m = (g + d) // 2
        pignon = lambda x, y, m=m: y > Yb - 52 + abs(x + 0.5 - m) * 1.5
        B.pan(toits, g, Yt, m, Yb, 'gauche', lambda x, y, p=pignon: not p(x, y))
        B.pan(toits, m, Yt, d, Yb, 'droite', lambda x, y, p=pignon: not p(x, y))
        B.faitage(toits, m, Yt, m, Yb - 52)
        for x in range(g, d):
            y = round(Yb - 52 + abs(x + 0.5 - m) * 1.5)
            for r, col in enumerate(((40, 31, 31), (88, 58, 40), (112, 76, 52), (40, 31, 31))):
                if y - 3 + r < Yb:
                    toits.put(x, y - 3 + r, col)
        menu.colle(fen, m - 8, 41 * T - 4)
    B.pan(toits, 29 * T, Yt, 38 * T, 41 * T, 'haut')
    B.pan(toits, 29 * T, 41 * T, 38 * T, Yb, 'bas')
    B.faitage(toits, 29 * T, 41 * T, 38 * T, 41 * T)
    B.egout(toits, 29 * T, Yb, 38 * T, Yb)
    for x in (29 * T, 38 * T - 4):
        B.poutre(murs, x, 43, 50)
    fenetres((26, 27, 30, 32, 34, 36, 39, 40), 43)
    fenetres((26, 27, 30, 32, 34, 39, 40), 46)
    menu.colle(porte, 37 * T, 48 * T)

    # --- en bas à gauche : la longue maison au faîtage vertical, son mur pignon, l'appentis
    B.pan(toits, 0, 42 * T, 40, 70 * T, 'gauche')
    B.pan(toits, 40, 42 * T, 5 * T, 70 * T, 'droite')
    B.faitage(toits, 40, 42 * T, 40, 70 * T)
    B.egout(toits, 0, 70 * T, 5 * T, 70 * T)
    B.mur(murs, 0, 70, 5, 73, 'ocre', gauche=False, bas=False)
    menu.colle(O.lucarne(), 0, 56 * T)
    B.toit_planches(bois, 5, 60, 9, 70, verticale=True)
    # la remise de bois du parking
    B.toit_planches(bois, 20, 69, 23, 71, verticale=False)
    B.porte_planches(bois, 20 * T, 71 * T, 23 * T, 73 * T)


# ---------- le sol : marquages, plaques, dalles, fleurs ----------

# La place de la fontaine (px) : centre et demi-axes de l'ellipse, sous le pied du bassin.
FONTAINE = (44 * T + 8 - 72, 62 * T + 8 - 72)        # le coin haut-gauche de l'image de la fontaine
PLACE = (FONTAINE[0] + 72, FONTAINE[1] + 64 + 12, 6.7 * T, 4.4 * T)

def details(c):
    m = c['marquage']
    for x0, x1 in ((14 * T, 34 * T), (42 * T, W * T)):
        B.tirets(m, x0 + 6, x1, 102, 106)
    for x0, x1 in ((0, 34 * T), (42 * T, W * T)):
        B.tirets(m, x0 + 6, x1, 582, 586)
    for y0, y1 in ((0, 3 * T), (10 * T, 34 * T)):
        B.tirets(m, 598, 602, y0 + 6, y1, horizontal=False)
    plaque = O.plaque_egout()
    for x, y in ((45, 4), (39, 14), (39, 27), (46, 36), (11, 63), (20, 62)):
        c['egouts'].colle(plaque, x * T, y * T)
    d = c['dalles']
    # la place de la fontaine : une ellipse de pavés (le cercle vu de 3/4, comme le bassin),
    # cernée d'un rang plus sombre
    cx, cy, rx, ry = PLACE

    def pave(x, y):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        q = ((dx / rx) ** 2 + (dy / ry) ** 2) ** 0.5
        if q > 1:
            return None
        # la distance au bord, en px, le long du rayon
        e = (1 - q) * (rx * ry) / max(1e-6, ((ry * dx) ** 2 + (rx * dy) ** 2) ** 0.5) * (dx * dx + dy * dy) ** 0.5 if q > 0 else ry
        if e < 1:
            return (90, 88, 96)
        if e < 2.5:
            return S.PLACE_C
        return S.place(x % T, y % T)
    d.remplit(int(cx - rx) - 1, int(cy - ry) - 1, int(cx + rx) + 2, int(cy + ry) + 2, pave)
    for y in range(26, 31):              # le chemin s'arrête à la palissade, avant le trottoir
        for x in (20, 21):
            d.colle(O.dalle(x + y), x * T, y * T)
    for x in range(27, 31):
        for y in (21, 22):
            d.colle(O.dalle(x * 3 + y), x * T, y * T)
    for x, y in ((21, 49), (47, 52), (12, 47), (33, 66)):
        d.colle(O.caillou(x + y), x * T, y * T)
    f = c['fleurs']
    bouquets = [(18, 27), (25, 26), (26, 27), (16, 30), (19, 23), (5, 40), (9, 45), (12, 42), (13, 45),
                (21, 50), (15, 51), (9, 50), (44, 42), (55, 46), (50, 61), (39, 72), (45, 72), (34, 51),
                (29, 57), (54, 59), (31, 69), (48, 70), (37, 56), (27, 46), (3, 47), (52, 66)]
    g = coins()
    herbe = lambda x, y: all(g[y + j][x + i] == 'herbe' for i in (0, 1) for j in (0, 1))
    for i, (x, y) in enumerate(bouquets):
        if herbe(x, y):                    # jamais sur un trottoir
            f.colle(F.fleurs(i * 5), x * T, y * T)
    pris = set(bouquets)
    for y in range(H):
        for x in range(W):
            sur_place = ((x + 0.5) * T - PLACE[0]) ** 2 / (PLACE[2] + 16) ** 2 + ((y + 0.5) * T - PLACE[1]) ** 2 / (PLACE[3] + 16) ** 2 < 1
            if (x, y) in pris or sur_place or not herbe(x, y):
                continue
            if hasard(x, y, 51) > 0.9:
                f.colle(F.herbe_haute(int(hasard(x, y, 52) * 16)), x * T, y * T)


# ---------- les objets ----------

# Les pieds des arbres, pins et buissons (en tuiles) : là où l'image a un grand arbre, deux
# ou trois arbres de la ferme, plus petits. Chacun tient dans son carré d'herbe (rien ne passe
# devant un mur ni sur une palissade) et le passage entre les palissades du parc reste libre.
ARBRES = [(3.5, 15), (6.5, 46), (9.5, 46.5), (12.5, 46), (15.5, 46.5), (18.5, 46), (21.5, 46.5),
          (28.5, 15.5), (30, 17), (28.5, 29), (30, 30.5), (29.5, 55.5), (31.5, 54), (34.5, 61.5), (36, 60),
          (52.5, 54.5), (54.5, 53), (27, 72.5), (30.5, 74), (33.5, 73.5), (36.5, 75), (51.5, 74.5),
          (54, 74.5), (56.5, 69), (57, 51)]
PINS = [(44, 51), (35, 53.5), (28, 55.5), (28, 67)]
BUISSONS = [(16.5, 29, True), (45.5, 43.5, True), (54.5, 44, True), (25.5, 58, False), (55.5, 59.5, False),
            (34, 72, True), (55.5, 66.5, False), (6.5, 73, False), (27.5, 14, False), (16, 26, False)]


def cale(v):
    """Une position calée sur la grille : le même arbre donne les mêmes tuiles partout."""
    return round(v / T) * T


def objets(c):
    veg, ombres = c['vegetation'], c['ombres']
    ombre = F.ombre()
    plantes = [(x, y, F.arbre()) for x, y in ARBRES] + [(x, y, F.pin()) for x, y in PINS]
    plantes += [(x, y, F.buisson(large)) for x, y, large in BUISSONS]
    # de l'arrière vers l'avant : un arbre plus bas passe devant
    for x, y, im in sorted(plantes, key=lambda p: p[1]):
        w, h = im.size
        x0, y0 = cale(x * T - w // 2), cale(y * T - h)
        if h > 32:
            ombres.colle(ombre, x0 + w // 2 - 16, y0 + h - 8)
        veg.colle(im, x0, y0)

    # les voitures garées : de 3/4 (scripts/ville/voitures.py), le centre au sol en (x, y), posées
    # au pixel près de la grille pour que les mêmes voitures retrouvent les mêmes tuiles
    v = c['vehicules']

    def gare(coul, direction, x, y):
        v.colle(V.voiture(coul, direction), x - V.ANCRE[0], y - V.ANCRE[1])
        GAREES.append((x, y) + V.emprise(direction))

    # contre le trottoir de la grand-rue, dans le sens de leur voie (vers la gauche), hors de la
    # file où l'on roule
    for coul, x in (('rouge', 6), ('bleue', 13), ('blanche', 19), ('blanche', 25)):
        gare(coul, 'gauche', x * T + 32, 34 * T + 10)
    # contre le trottoir de la rue qui descend : elles viennent vers nous
    for coul, y in (('rouge', 22), ('blanche', 27)):
        gare(coul, 'avant', 34 * T + 12, y * T + 40)
    # sur le parking, garées en marche avant (on voit leur coffre) ou en marche arrière
    for coul, sens, x in (('rouge', 'arriere', 6), ('marron', 'arriere', 9), ('blanche', 'avant', 13),
                          ('bleue', 'arriere', 16), ('bordeaux', 'avant', 20)):
        gare(coul, sens, x * T, 49 * T + 40)

    mob = c['mobilier']
    B.cloture_h(mob, 14 * T, 20 * T, 31 * T + 12)
    B.cloture_h(mob, 22 * T, 31 * T + 8, 31 * T + 12)
    B.cloture_v(mob, 31 * T + 8, 12 * T, 21 * T)
    B.cloture_v(mob, 31 * T + 8, 23 * T, 31 * T)
    B.cloture_v(mob, 24 * T + 6, 42 * T, 59 * T)
    B.cloture_v(mob, 24 * T + 6, 64 * T, H * T)
    B.cloture_h(mob, 24 * T, 27 * T, 59 * T + 12)
    mob.colle(O.banc(), 25 * T, 27 * T + 8)
    mob.colle(O.banc(), 37 * T, 50 * T + 8)
    mob.colle(O.banc(True), 50 * T + 8, 54 * T)
    mob.colle(O.banc(), 24 * T + 4, 60 * T)
    mob.colle(O.panneau(), 40 * T + 8, 50 * T)
    tonneau = O.tonneau()
    mob.colle(tonneau, 23 * T + 4, 44 * T)
    mob.colle(tonneau, 44 * T, 45 * T)
    rev = O.reverbere()
    for x in (5, 12, 23):
        c['equipements'].colle(rev, x * T, 39 * T)

    fo = c['fontaines']
    fo.colle([O.fontaine(k) for k in range(F.EAU_IMAGES)], *FONTAINE)
    fo.colle([O.fontaine_globe(k) for k in range(F.EAU_IMAGES)], 50 * T - 56, 46 * T + 8 - 128)


# ---------- la découpe et l'écriture ----------

DEPART = (14, 40)          # la tuile où l'on arrive en ville : le trottoir du bas, devant le parc

# La circulation (js/ville-carte.js) : les voies, au milieu de chaque file (on roule à droite),
# en px de la carte. La rue du haut (rangées 4 à 8), la rue qui descend (colonnes 34 à 40) et
# la grand-rue (rangées 34 à 38) ; les voitures garées le long des trottoirs leur laissent la place.
HAUT_O, HAUT_E = 86, 122          # la rue du haut : vers la gauche, vers la droite
RUE_S, RUE_N = 587, 617           # la rue qui descend : vers le bas, vers le haut
GRAND_O, GRAND_E = 578, 606       # la grand-rue : vers la gauche, vers la droite
HORS = 48                         # on entre et on sort à 48 px hors de la carte
GAUCHE, DROITE, DESSUS = -HORS, W * T + HORS, -HORS
ENTREES = {                       # où l'on arrive sur la carte, et le premier point de la voie
    'est_haut': (DROITE, HAUT_O), 'nord': (RUE_S, DESSUS), 'ouest': (GAUCHE, GRAND_E), 'est_bas': (DROITE, GRAND_O),
}
SORTIES = {
    'est_haut': (DROITE, HAUT_E), 'nord': (RUE_N, DESSUS), 'ouest': (GAUCHE, GRAND_O), 'est_bas': (DROITE, GRAND_E),
}
# chaque trajet : l'entrée, les coins (là où l'on tourne), la sortie ; l'impasse de la rue du
# haut (à gauche) n'en reçoit pas
TRAJETS = {
    ('est_haut', 'nord'): [(RUE_N, HAUT_O)],
    ('est_haut', 'ouest'): [(RUE_S, HAUT_O), (RUE_S, GRAND_O)],
    ('est_haut', 'est_bas'): [(RUE_S, HAUT_O), (RUE_S, GRAND_E)],
    ('nord', 'est_haut'): [(RUE_S, HAUT_E)],
    ('nord', 'ouest'): [(RUE_S, GRAND_O)],
    ('nord', 'est_bas'): [(RUE_S, GRAND_E)],
    ('ouest', 'est_bas'): [],
    ('ouest', 'nord'): [(RUE_N, GRAND_E)],
    ('ouest', 'est_haut'): [(RUE_N, GRAND_E), (RUE_N, HAUT_E)],
    ('est_bas', 'ouest'): [],
    ('est_bas', 'nord'): [(RUE_N, GRAND_O)],
    ('est_bas', 'est_haut'): [(RUE_N, GRAND_O), (RUE_N, HAUT_E)],
}
# les carrefours : une voiture n'y entre que si aucune de celles qui y sont ne croise son trajet
CARREFOURS = {'carrefour_haut': (34, 4, 41, 9), 'carrefour_bas': (34, 34, 41, 39)}   # en tuiles, [x0, x1[ × [y0, y1[


GAREES = []      # les voitures garées : (x, y, demi-largeur, demi-hauteur) de leur emprise au sol


def objets_carte(premier_id):
    """Les couches d'objets de la circulation : « routes » (une polyligne par trajet, nommée
    « entrée>sortie ») et « carrefours » (des rectangles)."""
    routes, carrefours, i = [], [], premier_id
    for (a, b), coins in TRAJETS.items():
        pts = [ENTREES[a]] + coins + [SORTIES[b]]
        x0, y0 = pts[0]
        routes.append({'id': i, 'name': f'{a}>{b}', 'type': 'route', 'rotation': 0, 'visible': True,
                       'x': x0, 'y': y0, 'width': 0, 'height': 0,
                       'polyline': [{'x': x - x0, 'y': y - y0} for x, y in pts]})
        i += 1
    for nom, (x0, y0, x1, y1) in CARREFOURS.items():
        carrefours.append({'id': i, 'name': nom, 'type': 'carrefour', 'rotation': 0, 'visible': True,
                           'x': x0 * T, 'y': y0 * T, 'width': (x1 - x0) * T, 'height': (y1 - y0) * T})
        i += 1
    garees = []
    for x, y, dx, dy in GAREES:
        garees.append({'id': i, 'name': 'voiture', 'type': 'garee', 'rotation': 0, 'visible': True,
                       'x': x - dx, 'y': y - dy, 'width': 2 * dx, 'height': 2 * dy})
        i += 1
    return routes, carrefours, garees, i

def main():
    # les jeux de Wang des passages, en tête de leurs planches
    for (a, b), p in PLANCHE_PASSAGE.items():
        S.jeu_de_passage(PLANCHES[p], a, b)
    for m, n in S.VARIANTES.items():
        for v in range(n):
            PLANCHES[MATIERE_SOL[m]].ajoute(S.plein(m, v), f'{m}_{v}')

    g = coins()
    cellules = {'sol': [[None] * W for _ in range(H)]}
    for y in range(H):
        for x in range(W):
            p, im, nom = tuile_sol(g, x, y)
            cellules['sol'][y][x] = (p, PLANCHES[p].ajoute(im, nom))

    toiles = {nom: Toile(nom, p, n) for nom, p, n in COUCHES}
    toiles['toits_plat'] = Toile('toits_plat', 'toit')
    batiments(toiles)
    toiles['toits'].contour()
    toiles['toits'].colle(toiles['toits_plat'].images[0], 0, 0)
    del toiles['toits_plat']
    details(toiles)
    objets(toiles)

    for nom, p, n in COUCHES:
        t = toiles[nom]
        grille = [[None] * W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                frames = [im.crop((x * T, y * T, x * T + T, y * T + T)) for im in t.images]
                if all(f.getbbox() is None for f in frames):
                    continue
                grille[y][x] = (p, PLANCHES[p].ajoute(frames))
        cellules[nom] = grille

    # les numéros de tuile : chaque planche à la suite
    premier, gid = {}, 1
    for k, p in PLANCHES.items():
        premier[k] = gid
        gid += p.nombre()
        p.ecrit(garde=p.nom in RETOUCHEES and '--redessine' not in sys.argv)
    V.planche()
    couches = []
    for i, nom in enumerate(['sol'] + [c[0] for c in COUCHES]):
        data = [0 if cel is None else premier[cel[0]] + cel[1] for ligne in cellules[nom] for cel in ligne]
        couches.append({'id': i + 1, 'name': nom, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                        'opacity': 1, 'visible': True, 'data': data})
    routes, carrefours, garees, prochain = objets_carte(2)
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'width': W, 'height': H, 'tilewidth': T, 'tileheight': T,
        'infinite': False, 'nextlayerid': len(couches) + 5, 'nextobjectid': prochain,
        'tilesets': [{'firstgid': premier[k], 'source': f'{p.nom}.tsx'} for k, p in PLANCHES.items()],
        'layers': couches + [
            # où la promeneuse arrive (ville-carte.html) : sur le trottoir du bas, devant le parc
            {'id': len(couches) + 1, 'name': 'depart', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
             'visible': True, 'x': 0, 'y': 0,
             'objects': [{'id': 1, 'name': 'depart', 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                          'x': DEPART[0] * T + T / 2, 'y': DEPART[1] * T + T - 2, 'width': 0, 'height': 0}]},
            # la circulation (js/ville-carte.js) : les trajets des voitures et les carrefours
            {'id': len(couches) + 2, 'name': 'routes', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
             'visible': True, 'x': 0, 'y': 0, 'objects': routes},
            {'id': len(couches) + 3, 'name': 'carrefours', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
             'visible': True, 'x': 0, 'y': 0, 'objects': carrefours},
            # l'emprise au sol des voitures garées : la promeneuse en fait le tour
            {'id': len(couches) + 4, 'name': 'garees', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
             'visible': True, 'x': 0, 'y': 0, 'objects': garees},
        ],
    }
    with open(os.path.join(ASSETS, 'ville.tmj'), 'w') as f:
        json.dump(carte, f, indent=1)
    total = sum(len(p.tuiles) for p in PLANCHES.values())
    for k, p in PLANCHES.items():
        print(f'assets/{p.nom}.png : {len(p.tuiles)} tuiles')
    print(f'assets/ville.tmj : {W} × {H} tuiles, {len(couches)} couches, {total} tuiles en tout')

    if '--apercu' in sys.argv:
        rendu = image(W * T, H * T)
        for nom in ['sol'] + [c[0] for c in COUCHES]:
            for y in range(H):
                for x in range(W):
                    cel = cellules[nom][y][x]
                    if cel:
                        rendu.alpha_composite(PLANCHES[cel[0]].tuiles[cel[1]][0], (x * T, y * T))
        rendu.save(os.path.join(ROOT, 'apercu_ville.png'))


if __name__ == '__main__':
    main()
