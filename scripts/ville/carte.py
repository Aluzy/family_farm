# La grande ville (168 × 219 tuiles de 16 px), d'après la maquette en photo : son plan (les
# rues, les îlots, les quartiers, le réseau des voies) est dans scripts/ville/plan.py, ses
# bâtiments dans scripts/ville/immeubles.py, ses équipements (voie ferrée, marché, parcs) dans
# scripts/ville/equipements.py. Sans ses passants : assets/ville.tmj, carte de travail Tiled,
# et ses jeux de tuiles rangés par matière :
#
#   ville_asphalte    la chaussée (4 variantes : nue, fissurée, tachée, gravillonnée), les tirets
#   ville_trottoir    les dalles grises, la bordure du trottoir sur la chaussée (16 coins de Wang)
#   ville_herbe       l'herbe de la ferme (16 variantes), ses bords sur le trottoir et sur la
#                     chaussée, les fleurs et herbes hautes de la ferme
#   ville_pierre      les pavés des places et des quais (et leurs bords de Wang), le sable des
#                     jeux, la pierre de taille (corniches, colonnes, entrées), les dalles des
#                     allées, les cailloux, l'amphithéâtre
#   ville_brique      les murs de brique rouge, orange, ocre et bleue, bandeaux et colombages
#   ville_verre       les murs de verre de la tour, la verrière et les flancs de la bibliothèque
#   ville_toit        les tuiles de terre cuite (pans, faîtages, arêtiers, pignons), le dôme,
#                     le toit plat de la tour
#   ville_bois        le toit de planches de la remise, les palissades, bancs, panneau,
#                     tonneaux, caisses, étals du marché, statue et jeux d'enfants
#   ville_menuiserie  les fenêtres, portes, la porte vitrée, la bouche d'aération
#   ville_metal       la voie ferrée, les plaques d'égout, le climatiseur, les réverbères,
#                     l'abri de bus, le drapeau
#   ville_eau         les deux fontaines et le lac, remplis de l'eau de la ferme (8 images d'animation)
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
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batiments as B  # noqa: E402
import equipements as E  # noqa: E402
import ferme as F  # noqa: E402
import immeubles as I  # noqa: E402
import objets as O  # noqa: E402
import plan as P  # noqa: E402
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
RETOUCHEES = {'ville_trottoir'}     # (la brique et la menuiserie : redessinées avec les bâtiments en 3/4)
MATIERE_SOL = {'asphalte': 'asphalte', 'trottoir': 'trottoir', 'herbe': 'herbe', 'place': 'pierre', 'sable': 'pierre'}
PLANCHE_PASSAGE = {('asphalte', 'trottoir'): 'trottoir', ('trottoir', 'herbe'): 'herbe',
                   ('asphalte', 'herbe'): 'herbe', ('herbe', 'place'): 'pierre', ('trottoir', 'place'): 'pierre',
                   ('asphalte', 'place'): 'pierre', ('herbe', 'sable'): 'pierre'}

# Les couches peintes, de bas en haut : (nom, planche, images)
COUCHES = [
    ('rails', 'metal', 1), ('marquage', 'asphalte', 1), ('egouts', 'metal', 1), ('dalles', 'pierre', 1), ('fleurs', 'herbe', 1),
    ('ombres', 'vegetation', 1), ('murs', 'brique', 1), ('pierre_de_taille', 'pierre', 1), ('vitrages', 'verre', 1),
    ('charpente', 'bois', 1), ('toits', 'toit', 1), ('menuiserie', 'menuiserie', 1), ('equipements', 'metal', 1),
    ('fontaines', 'eau', F.EAU_IMAGES), ('mobilier', 'bois', 1), ('vehicules', 'vehicules', 1), ('vegetation', 'vegetation', 1),
]


# ---------- le sol : la matière de chaque coin ----------

# Les îlots et leur sol, en tuiles [x0, x1[ × [y0, y1[ : posés dans l'ordre (le dernier
# l'emporte), puis les chaussées par-dessus. Ce qui n'est ni chaussée ni îlot est trottoir.
SOLS = [
    # l'ouest : les cours des entrepôts, les bois le long de la voie, les quais et la place de
    # la gare, la cour du sud
    ('asphalte', 0, 34, 0, 34), ('herbe', 0, 34, 36, 60), ('herbe', 0, 8, 60, 112),
    ('place', 8, 23, 60, 112), ('place', 23, 34, 100, 112), ('herbe', 0, 13, 112, 168),
    ('asphalte', 0, 34, 178, H),
    # le milieu : le jardin de la bibliothèque, la cour de l'école, le parking, le parc aux
    # fontaines, le grand parc
    ('herbe', 60, 78, 82, 102), ('asphalte', 55, 80, 129, 147), ('herbe', 46, 55, 116, 147),
    ('herbe', 58, 80, 114, 127), ('herbe', 90, 108, 114, 147), ('herbe', 46, 108, 159, H),
    ('place', 74, 87, 164, 179),
    # l'est : le marché, le parc de jeux et ses bacs à sable
    ('place', 120, 145, 80, 102), ('place', 120, 140, 114, 147), ('herbe', 120, W, 159, H),
    ('sable', 124, 143, 186, 205), ('sable', 150, 163, 165, 179), ('sable', 152, 160, 194, 201),
]


def coins():
    g = [['trottoir'] * (W + 1) for _ in range(H + 1)]

    def zone(m, x0, x1, y0, y1):       # les tuiles [x0, x1[ × [y0, y1[ : leurs coins
        for y in range(max(0, y0), min(H, y1) + 1):
            for x in range(max(0, x0), min(W, x1) + 1):
                g[y][x] = m
    for m, x0, x1, y0, y1 in SOLS:
        # un îlot au bord de la carte va jusqu'au bord
        zone(m, x0, x1 - 1 if x1 < W else W, y0, y1 - 1 if y1 < H else H)
    for _, x0, x1, y0, y1 in P.RUES_V + P.RUES_H:
        zone('asphalte', x0, x1, y0, y1)
    return g


_TUILES_SOL = {}


def tuile_sol(g, x, y):
    """La tuile de sol (planche, image, nom) d'après la matière de ses quatre coins ; une même
    tuile n'est dessinée qu'une fois."""
    c = [g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1]]
    if len(set(c)) > 1:
        v = None
    elif c[0] == 'herbe':
        v = int(hasard(x, y, 8) * 16)
    else:
        v = math.floor(hasard(x, y, 7) * 100)
    cle = (tuple(c), v)
    if cle not in _TUILES_SOL:
        _TUILES_SOL[cle] = _tuile_sol(c, x, y)
    return _TUILES_SOL[cle]


def _tuile_sol(c, x, y):
    if len(set(c)) == 1:
        m = c[0]
        r = hasard(x, y, 7)
        v = {'asphalte': 1 if r < 0.04 else 2 if r < 0.08 else 3 if r < 0.11 else 0,
             'trottoir': 1 if r < 0.12 else 0,
             'herbe': int(hasard(x, y, 8) * 16),
             'place': 1 if r < 0.3 else 0,
             'sable': 0}[m]
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

BATIMENTS = []        # les bâtiments dessinés (immeubles.Batiment), pour la couche « batiments »
BRIQUES = ['rouge', 'orange', 'ocre', 'bleu']
COUVS = ['tuile', 'tuile_rouge', 'ardoise', 'tuile']


def batiments(c):
    """Les bâtiments, en 3/4 (scripts/ville/immeubles.py) : façade vers le bas de l'écran, toit
    vu au-dessus, aussi profond que le bâtiment. Dessinés de l'arrière vers l'avant : le toit
    d'un bâtiment de devant passe sur le pied de celui de derrière."""
    Bt = I.Batiment
    a_faire = []

    def bat(*a, apres=None, **k):
        a_faire.append((Bt(*a, **k), apres))

    def enseigne(mot, x, y, **k):
        im = E.enseigne(mot, **k)
        c['menuiserie'].colle(im, round(x - im.width / 2), y)

    def rangee(nom, x0, x1, base, etages=3, prof=4, graine=0, toit='pignon'):
        """Des maisons de ville accolées, chacune son pignon sur la rue."""
        larg = [5, 4, 6, 5, 4, 6]
        x, i = x0, 0
        while x < x1:
            w = larg[(i + graine) % len(larg)]
            if x1 - (x + w) < 4:
                w = x1 - x
            porte = x + w // 2 - (1 if w % 2 == 0 and (i + graine) % 2 else 0)
            hautes = [x + 1, x + w - 2] + ([x + w // 2] if w >= 5 and w % 2 else [])
            bas = [k for k in hautes if k != porte]
            bat(f'{nom}_{i}', x, x + w, base, prof, etages, BRIQUES[(i + graine) % 4], toit,
                fenetres=[bas, sorted(set(hautes))], portes=[porte], couv=COUVS[(i * 3 + graine) % 4])
            x += w
            i += 1

    def facades(nom, x0, x1, graine=0):
        """Le pied des façades du haut, coupées par le bord de la carte."""
        larg = [5, 6, 4, 5]
        x, i = x0, 0
        while x < x1:
            w = min(larg[(i + graine) % 4], x1 - x)
            if x1 - (x + w) < 3:
                w = x1 - x
            cols = list(range(x + 1, x + w - 1, 2))
            porte = cols[len(cols) // 2] if cols else x
            bat(f'{nom}_{i}', x, x + w, 8, 4, 3, BRIQUES[(i + graine) % 4], None,
                fenetres=[[k for k in cols if k != porte], cols], portes=[porte])
            x += w
            i += 1

    def bureau(nom, x0, x1, base, prof, etages, matiere='pierre', ton='clair', enseigne_=None):
        """Un immeuble de bureaux : un toit plat, des bandes de verre à chaque étage, une porte
        vitrée."""
        def verres(b):
            X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
            for k in range(1, etages):
                I.verre(c['vitrages'], X0 + 10, BASE - (k + 1) * I.ETAGE + 6, X1 - 10, BASE - k * I.ETAGE - 4,
                        ton if k % 2 else ('sombre' if ton == 'clair' else 'clair'))
            m = (X0 + X1) // 2
            I.verre(c['vitrages'], X0 + 10, BASE - 44, m - 22, BASE - 7, 'sombre', pas_x=24)
            I.verre(c['vitrages'], m + 22, BASE - 44, X1 - 10, BASE - 7, 'sombre', pas_x=24)
            I.porte_double(c['menuiserie'], m - 16, BASE - 6, haut=38, verre=True)
            if enseigne_:
                enseigne(enseigne_, m, BASE - I.hauteur_facade(etages) + 1)
        bat(nom, x0, x1, base, prof, etages, matiere, 'plat', bandeaux=matiere != 'pierre', apres=verres)

    def entrepot(nom, x0, x1, base, prof, matiere, couv, mot=None, etages=1):
        """Un entrepôt : un grand toit de tôle (ou de tuiles), une porte de planches, son nom."""
        def portes(b):
            X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
            m = (X0 + X1) // 2
            B.porte_planches(c['charpente'], m - 24, BASE - 40, m + 24, BASE)
            for x in (X0 + 16, X1 - 32):
                if X1 - X0 >= 8 * T:
                    I.fenetre(c['menuiserie'], x, BASE)
            if mot:
                enseigne(mot, m, BASE - I.hauteur_facade(etages) + 1)
        bat(nom, x0, x1, base, prof, etages, matiere, 'pans', couv=couv, bandeaux=False, apres=portes)

    # --- l'ouest : la zone industrielle du nord (les trois entreprises), la gare, les bureaux,
    # la cour du sud
    entrepot('conserverie', 1, 12, 16, 7, 'rouge', 'tole_grise', 'CONSERVERIE', etages=2)
    entrepot('fromagerie', 19, 27, 16, 7, 'ocre', 'tole_bleue', 'FROMAGERIE', etages=2)
    entrepot('confiturerie', 27, 34, 16, 7, 'orange', 'tuile_rouge', 'CONFITURERIE', etages=2)

    def cheminees(xs, y):
        def f(b):
            for x in xs:
                c['toits_plat'].colle(E.cheminee(), x * T - 16, y * T - 96)
        return f
    bat('usine', 1, 12, 30, 6, 2, 'rouge', 'plat', bandeaux=False, fenetres=[[2, 4, 8, 10], [2, 4, 6, 8, 10]],
        portes=[6], apres=cheminees((3, 5), 24))
    entrepot('hangar', 20, 33, 32, 8, 'bleu', 'tole_grise')
    bureau('bureaux_de_la_gare', 23, 34, 76, 8, 3, 'rouge')

    def gare(b):
        X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
        m = (X0 + X1) // 2
        I.porte_double(c['pierre_de_taille'], m - 16, BASE, haut=48, verre=True)
        enseigne('GARE', m, BASE - I.hauteur_facade(2) + 1, fond=(40, 70, 130), encre=(240, 240, 244))
    bat('gare', 23, 34, 98, 10, 2, 'pierre', 'croupe', couv='ardoise', bandeaux=False,
        fenetres=[[24, 26, 31, 32], [24, 26, 28, 30, 32]], apres=gare)
    bureau('residence_verre', 1, 11, 138, 8, 4, 'bleu', 'clair')
    bureau('tour_de_la_gare', 21, 33, 132, 8, 6, 'pierre', 'clair')
    bureau('residence_ocre', 1, 11, 166, 10, 5, 'ocre', 'sombre')
    bureau('bureaux_du_sud', 20, 34, 166, 10, 3, 'pierre', 'sombre')
    entrepot('entrepot_sud', 1, 12, 192, 8, 'rouge', 'tole_bleue')
    entrepot('entrepot_du_quai', 20, 33, 194, 10, 'ocre', 'tole_grise')
    bat('usine_sud', 1, 12, 214, 6, 2, 'rouge', 'plat', bandeaux=False, fenetres=[[2, 4, 8, 10], [2, 4, 6, 8, 10]],
        portes=[6], apres=cheminees((4, 7), 208))
    bat('maison_du_garde', 22, 32, 214, 6, 1, 'orange', 'pans', fenetres=[[23, 25, 29, 30]], portes=[27])

    # --- le milieu : les façades du haut, trois rangées de maisons de chaque côté de la rue
    facades('facades_nord_a', 46, 80, 0)
    facades('facades_nord_b', 90, 108, 2)
    for k, base in enumerate((33, 52, 70)):
        rangee(f'maisons_a{k}', 46, 80, base, graine=k)
        rangee(f'maisons_b{k}', 90, 108, base, graine=k + 3)

    # la bibliothèque et ses voisines (l'échantillon d'origine, décalé de 46 et 70 tuiles)
    bat('maison_bleue', 46, 51, 102, 6, 3, 'bleu', 'pans', fenetres=[[49], [47, 49]], portes=[47])

    def tour(b):
        X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
        for k in range(1, 5):
            I.verre(c['vitrages'], X0 + 10, BASE - (k + 1) * I.ETAGE + 6, X1 - 10, BASE - k * I.ETAGE - 4,
                    'clair' if k % 2 else 'sombre')
        I.verre(c['vitrages'], X0 + 10, BASE - 44, X1 - 10, BASE - 7, 'sombre', pas_x=24)
        I.porte_double(c['menuiserie'], (X0 + X1) // 2 - 16, BASE - 6, haut=38, verre=True)
        c['toits_plat'].colle(O.climatiseur(), X0 + 72, BASE - I.hauteur_facade(5) - 8 * T + 24)
    bat('tour', 52, 60, 102, 8, 5, 'pierre', 'plat', bandeaux=False, apres=tour)
    bat('aile_ouest', 61, 64, 95, 5, 1, 'ocre', 'pans', fenetres=[[62]])
    bat('aile_est', 72, 75, 95, 5, 1, 'ocre', 'pans', fenetres=[[73]])

    def bibliotheque(b):
        X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
        pierre = c['pierre_de_taille']
        cx = (X0 + X1) // 2
        egout = BASE - I.hauteur_facade(2)
        for x in (X0 + 14, X0 + 34, X1 - 44, X1 - 24):
            I.colonne(pierre, x, egout + I.FRISE, BASE - 6)
        I.porte_double(pierre, cx - 16, BASE, haut=48)
        I.marches(pierre, cx - 20, cx + 20, BASE, n=2)
        I.dome(c['toits_plat'], cx, egout - 3 * T, 40)
        b.haut = egout - 3 * T - 40 - 16
    bat('bibliotheque', 64, 72, 95, 6, 2, 'pierre', 'plat', bandeaux=False, apres=bibliotheque)

    # l'école : l'ancien immeuble orange, sa porte en haut des marches, son enseigne, son drapeau
    def ecole(b):
        X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
        m = (X0 + X1) // 2
        I.porte_double(c['pierre_de_taille'], m - 16, BASE, haut=48)
        I.marches(c['pierre_de_taille'], m - 20, m + 20, BASE, n=1)
        enseigne('ÉCOLE', m, BASE - I.hauteur_facade(2) + 1, fond=(246, 238, 214), encre=(150, 52, 40))
        c['equipements'].colle(E.drapeau(), X0 + 8, BASE + 2 * T - 48)
    bat('ecole', 90, 108, 100, 9, 2, 'orange', 'croupe',
        fenetres=[[91, 93, 95, 97, 101, 103, 105], [91, 93, 95, 97, 99, 101, 103, 105]], apres=ecole)

    # sous la rue de l'école : la longue maison, la maison à pignons et son jardin, la remise
    bat('longue_maison', 46, 52, 147, 24, 1, 'ocre', 'pignon', fenetres=[[46.5, 50.5]], portes=[48.5])
    bat('maison_corps', 63, 72, 124, 4, 2, 'orange', 'pans', fenetres=[[64, 66, 70], [64, 66, 68, 70]], portes=[68])
    bat('maison_aile_ouest', 59, 63, 124, 4, 2, 'orange', 'pignon', fenetres=[[60.5]])
    bat('maison_aile_est', 72, 76, 124, 4, 2, 'orange', 'pignon', fenetres=[[73.5]])

    def remise(b):
        B.porte_planches(c['charpente'], (b.x0 + 1) * T, b.base * T - 40, (b.x1 - 1) * T, b.base * T)
    bat('remise', 76, 80, 147, 3, 1, 'bois', 'planches', pilastres=False, bandeaux=False, apres=remise)

    # --- l'est : les bureaux, les façades du haut, le marché et le grand magasin
    facades('facades_nord_c', 120, 136, 1)
    facades('facades_nord_d', 146, W, 3)
    bureau('bureaux_bleus', 120, 136, 32, 6, 3, 'bleu', 'clair')
    bureau('bureaux_bruns', 120, 136, 52, 6, 3, 'rouge', 'sombre')
    bureau('bureaux_clairs', 120, 136, 70, 5, 3, 'pierre', 'clair')
    rangee('maisons_d0', 146, 156, 33, graine=1)
    bureau('verriere_est', 156, W, 32, 6, 3, 'pierre', 'clair')
    bureau('immeuble_ocre', 146, W, 52, 6, 3, 'ocre', 'sombre')
    bureau('bureaux_est', 146, W, 70, 5, 3, 'bleu', 'clair')
    bureau('bureaux_du_marche', 147, W, 102, 8, 4, 'pierre', 'clair')

    def magasin(b):
        X0, X1, BASE = b.x0 * T, b.x1 * T, b.base * T
        m = (X0 + X1) // 2
        I.verre(c['vitrages'], X0 + 10, BASE - 2 * I.ETAGE + 6, X1 - 10, BASE - I.ETAGE - 4, 'clair')
        I.verre(c['vitrages'], X0 + 10, BASE - 44, m - 22, BASE - 7, 'clair', pas_x=32)
        I.verre(c['vitrages'], m + 22, BASE - 44, X1 - 10, BASE - 7, 'clair', pas_x=32)
        I.porte_double(c['menuiserie'], m - 16, BASE - 6, haut=38, verre=True)
        enseigne('GRAND MAGASIN', m, BASE - I.hauteur_facade(2) + 1, fond=(132, 84, 160), encre=(246, 240, 250))
    bat('grand_magasin', 142, W, 147, 12, 2, 'pierre', 'plat', bandeaux=False, droite=False, apres=magasin)

    # de l'arrière vers l'avant ; les toits d'un même rang dans l'ordre
    for b, apres in sorted(a_faire, key=lambda p: p[0].base):
        b.dessine(c)
        if apres:
            apres(b)
        BATIMENTS.append(b)


# ---------- le sol : marquages, voie ferrée, plaques, dalles, fleurs ----------

# La place de la grande fontaine (px) : centre et demi-axes de l'ellipse, sous le pied du bassin.
FONTAINE = (99 * T + 8 - 72, 132 * T + 8 - 72)        # le coin haut-gauche de l'image de la fontaine
PLACE = (FONTAINE[0] + 72, FONTAINE[1] + 64 + 12, 6.7 * T, 4.4 * T)
GLOBE = (101 * T, 114 * T)                            # le coin haut-gauche de la fontaine au globe
LAC = (77 * T, 204 * T, 20 * T, 11 * T)               # le lac du grand parc : centre et demi-axes


def lac_dedans(x, y, marge=0):
    cx, cy, rx, ry = LAC
    a = math.atan2((y - cy) / ry, (x - cx) / rx)
    # un bord irrégulier : quelques ondulations
    r = 1 + 0.06 * math.sin(3 * a + 0.7) + 0.04 * math.sin(5 * a + 2.1) + 0.03 * math.sin(8 * a)
    return ((x - cx) / (rx * r - marge)) ** 2 + ((y - cy) / (ry * r - marge * ry / rx)) ** 2 <= 1


def details(c):
    m = c['marquage']
    carrefours = P.croisements()
    # les tirets au milieu de chaque chaussée, coupés aux carrefours ; les passages piétons
    # devant chaque carrefour
    for nom, x0, x1, y0, y1 in P.RUES_V:
        cx = round(P.milieu_v((nom, x0, x1, y0, y1)))
        coupes = sorted((cy0, cy1) for v, _, _, _, cy0, cy1 in carrefours if v == nom)
        debut = y0 * T
        for cy0, cy1 in coupes + [(y1, y1)]:
            B.tirets(m, cx - 2, cx + 2, debut + 6 + 3 * T, cy0 * T - 3 * T, horizontal=False)
            debut = cy1 * T
    for nom, x0, x1, y0, y1 in P.RUES_H:
        cy = round(P.milieu_h((nom, x0, x1, y0, y1)))
        coupes = sorted((cx0, cx1) for _, h, cx0, cx1, _, _ in carrefours if h == nom)
        debut = x0 * T
        for cx0, cx1 in coupes + [(x1, x1)]:
            B.tirets(m, debut + 6 + 3 * T, cx0 * T - 3 * T, cy - 2, cy + 2)
            debut = cx1 * T
    rues = {r[0]: r for r in P.RUES_V + P.RUES_H}
    for v, h, x0, x1, y0, y1 in carrefours:
        rv, rh = rues[v], rues[h]
        if rv[3] < y0 - 2:
            E.zebre(m, x0 * T, x1 * T, (y0 - 2) * T, y0 * T - 4, True)
        if rv[4] > y1 + 2:
            E.zebre(m, x0 * T, x1 * T, y1 * T + 4, (y1 + 2) * T, True)
        if rh[1] < x0 - 2:
            E.zebre(m, (x0 - 2) * T, x0 * T - 4, y0 * T, y1 * T, False)
        if rh[2] > x1 + 2:
            E.zebre(m, x1 * T + 4, (x1 + 2) * T, y0 * T, y1 * T, False)

    # la voie ferrée, de la montagne à la plage ; prise dans la chaussée au passage à niveau
    rails = c['rails']
    route = [r for r in P.RUES_H if r[0] == 'route_de_la_ferme'][0]
    a, b = route[3] * T, route[4] * T
    for xc in P.VOIES:
        E.voie(rails, xc, 0, a)
        E.voie(rails, xc, a, b, nue=True)
        E.voie(rails, xc, b, H * T)
    E.ballast(rails, 15 * T, 16 * T, 0, a)
    E.ballast(rails, 15 * T, 16 * T, b, H * T)
    for x0, x1, y0, y1 in P.QUAIS:
        E.bord_de_quai(m, x1 * T - 3 if x1 <= P.FER[0] else x0 * T + 1, y0 * T, y1 * T)

    plaque = O.plaque_egout()
    for x, y in ((39, 30), (84, 40), (113, 60), (40, 120), (113, 130), (60, 152), (140, 152),
                 (100, 107), (128, 13), (20, 172), (39, 200), (113, 190), (150, 75)):
        c['egouts'].colle(plaque, x * T, y * T)

    d = c['dalles']
    # la place de la grande fontaine : une ellipse de pavés (le cercle vu de 3/4, comme le
    # bassin), cernée d'un rang plus sombre
    cx, cy, rx, ry = PLACE

    def pave(x, y):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        q = ((dx / rx) ** 2 + (dy / ry) ** 2) ** 0.5
        if q > 1:
            return None
        e = (1 - q) * (rx * ry) / max(1e-6, ((ry * dx) ** 2 + (rx * dy) ** 2) ** 0.5) * (dx * dx + dy * dy) ** 0.5 if q > 0 else ry
        if e < 1:
            return (90, 88, 96)
        if e < 2.5:
            return S.PLACE_C
        return S.place(x % T, y % T)
    d.remplit(int(cx - rx) - 1, int(cy - ry) - 1, int(cx + rx) + 2, int(cy + ry) + 2, pave)
    # les allées dallées : du jardin de la bibliothèque, devant la maison à pignons, dans les parcs
    allees = [(x, y) for y in range(96, 101) for x in (67, 68)]
    allees += [(68, y) for y in range(124, 128)]
    allees += [(80, y) for y in range(159, 164)] + [(x, 183) for x in range(47, 108) if not 74 <= x <= 86]
    allees += [(x, 183) for x in range(121, W)] + [(146, y) for y in range(159, 219)]
    allees += [(136, y) for y in range(179, 186)]
    for x, y in allees:
        if not lac_dedans((x + 0.5) * T, (y + 0.5) * T, -24):
            d.colle(O.dalle(x + y), x * T, y * T)
    for i, (x, y) in enumerate(((21, 49), (66, 118), (98, 150), (52, 166), (130, 210), (8, 45), (160, 214))):
        d.colle(O.caillou(x + y), x * T, y * T)
    # l'amphithéâtre
    E.amphitheatre(d, 136 * T, 178 * T, 9 * T, 6 * T)

    g = coins()
    herbe = lambda x, y: all(g[y + j][x + i] == 'herbe' for i in (0, 1) for j in (0, 1))
    dallees = set(allees)
    f = c['fleurs']
    pris = set()
    for y in range(H):
        for x in range(W):
            if not herbe(x, y) or lac_dedans((x + 0.5) * T, (y + 0.5) * T, -24):
                continue
            sur_place = ((x + 0.5) * T - PLACE[0]) ** 2 / (PLACE[2] + 16) ** 2 + ((y + 0.5) * T - PLACE[1]) ** 2 / (PLACE[3] + 16) ** 2 < 1
            if sur_place or (x, y) in dallees:
                continue
            r = hasard(x, y, 51)
            if r > 0.965:
                f.colle(F.fleurs(int(hasard(x, y, 53) * 40)), x * T, y * T)
            elif r > 0.9:
                f.colle(F.herbe_haute(int(hasard(x, y, 52) * 16)), x * T, y * T)


# ---------- les objets ----------

def cale(v):
    """Une position calée sur la grille : le même arbre donne les mêmes tuiles partout."""
    return round(v / T) * T


# Les arbres, pins et buissons (en tuiles, le pied) posés à la main, puis ceux semés dans les
# parcs et les bois (une grille tirée au hasard, toujours la même), loin des allées et du lac.
ARBRES = [(61, 85), (76.5, 85.5), (61, 99), (76.5, 99.5), (92, 117), (106, 128), (92, 146.5), (107, 146),
          (47.5, 118), (53, 121), (48, 140), (57.5, 117), (79, 117)]
PINS = [(104, 141), (90.5, 128), (54, 131)]
BUISSONS = [(62.5, 83, False), (75.5, 93, True), (91, 122, True), (106.5, 120, False), (79, 126, True)]
SEMIS = [  # (x0, x1, y0, y1, pas)
    (1, 12, 38, 59, 4), (19, 34, 38, 59, 4), (1, 8, 61, 75, 4), (1, 7, 80, 110, 5),
    (47, 108, 160, 219, 4), (121, 168, 160, 219, 4),
]


def libre_pour_un_arbre(x, y, g):
    tx, ty = int(x), int(y)
    for j in range(ty - 2, ty + 1):
        for i in range(tx - 1, tx + 2):
            if not (0 <= i < W and 0 <= j < H) or any(g[j + b][i + a] != 'herbe' for a in (0, 1) for b in (0, 1)):
                return False
    if lac_dedans(x * T, y * T, -40):
        return False
    # jamais derrière un bâtiment (le feuillage passerait devant son toit)
    for b in BATIMENTS:
        if b.x0 - 1.5 <= x <= b.x1 + 1.5 and b.haut / T - 0.5 <= y <= b.base + 0.5:
            return False
    if 72 <= x <= 89 and 162 <= y <= 182:          # la place du monument
        return False
    if 124 <= x <= 149 and 168 <= y <= 186:        # l'amphithéâtre
        return False
    if abs(y - 183.5) < 2.5 or abs(x - 146.5) < 2 or (abs(x - 80.5) < 2 and y < 165):     # les allées
        return False
    return True


def objets(c):
    veg, ombres = c['vegetation'], c['ombres']
    g = coins()
    ombre = F.ombre()
    plantes = [(x, y, F.arbre()) for x, y in ARBRES] + [(x, y, F.pin()) for x, y in PINS]
    plantes += [(x, y, F.buisson(large)) for x, y, large in BUISSONS]
    for k, (x0, x1, y0, y1, pas) in enumerate(SEMIS):
        for j, y in enumerate(range(y0 + pas, y1 + 1, pas)):
            for i, x in enumerate(range(x0 + 2, x1, pas)):
                px = x + (hasard(i, j, k, 81) - 0.5) * pas * 0.6
                py = y + (hasard(i, j, k, 82) - 0.5) * pas * 0.4
                if hasard(i, j, k, 83) < 0.25 or not libre_pour_un_arbre(px, py, g):
                    continue
                r = hasard(i, j, k, 84)
                plantes.append((px, py, F.pin() if r < 0.2 else F.buisson(r < 0.3) if r < 0.32 else F.arbre()))
    # de l'arrière vers l'avant : un arbre plus bas passe devant
    for x, y, im in sorted(plantes, key=lambda p: p[1]):
        w, h = im.size
        x0, y0 = cale(x * T - w // 2), cale(y * T - h)
        if h > 32:
            ombres.colle(ombre, x0 + w // 2 - 16, y0 + h - 8)
        veg.colle(im, x0, y0)

    # les voitures garées : de 3/4 (scripts/ville/voitures.py), le centre au sol en (x, y),
    # contre le trottoir, hors des files où l'on roule
    v = c['vehicules']

    def gare(coul, direction, x, y):
        v.colle(V.voiture(coul, direction), x - V.ANCRE[0], y - V.ANCRE[1])
        GAREES.append((x, y) + V.emprise(direction))
    couleurs = list(V.COULEURS)
    rues = {r[0]: r for r in P.RUES_V + P.RUES_H}
    # (rue, côté, de, à) : le long des larges rues, entre deux carrefours
    for nom, cote, a, b in (('avenue_ouest', 'ouest', 20, 66), ('avenue_ouest', 'est', 118, 146),
                            ('boulevard', 'est', 20, 66), ('boulevard', 'ouest', 160, 210),
                            ('rue_de_l_ecole', 'sud', 48, 80), ('rue_de_l_ecole', 'sud', 122, 136),
                            ('rue_des_parcs', 'nord', 50, 78), ('rue_des_parcs', 'sud', 124, 164)):
        r = rues[nom]
        for i, k in enumerate(range(a, b, 5)):
            if hasard(k, i, 91) < 0.35:
                continue
            coul = couleurs[int(hasard(k, i, 92) * len(couleurs))]
            if cote == 'ouest':
                gare(coul, 'avant', r[1] * T + 12, k * T + 40)
            elif cote == 'est':
                gare(coul, 'arriere', r[2] * T - 12, k * T + 40)
            elif cote == 'nord':
                gare(coul, 'gauche', k * T + 32, r[3] * T + 10)
            else:
                gare(coul, 'droite', k * T + 32, r[4] * T - 10)
    # le parking, en deux rangs
    for rang, y in enumerate((132 * T + 8, 141 * T + 8)):
        for i, x in enumerate(range(58, 79, 3)):
            if hasard(i, rang, 93) < 0.3:
                continue
            gare(couleurs[int(hasard(i, rang, 94) * len(couleurs))], 'arriere' if (i + rang) % 2 else 'avant', x * T, y)

    mob = c['mobilier']
    # les palissades : le jardin de la bibliothèque, le jardin de jeux
    B.cloture_h(mob, 60 * T, 67 * T, 101 * T + 12)
    B.cloture_h(mob, 69 * T, 78 * T, 101 * T + 12)
    B.cloture_v(mob, 77 * T + 8, 82 * T, 92 * T)
    B.cloture_v(mob, 77 * T + 8, 94 * T, 101 * T)
    B.cloture_h(mob, 148 * T, 166 * T, 187 * T)
    B.cloture_h(mob, 148 * T, 155 * T, 206 * T)
    B.cloture_h(mob, 157 * T, 166 * T, 206 * T)
    B.cloture_v(mob, 148 * T, 187 * T, 206 * T)
    B.cloture_v(mob, 166 * T, 187 * T, 206 * T)
    for x, y, diag in ((70, 99, False), (96, 137, False), (88, 126, True), (60, 182, False), (100, 182, False),
                       (77, 168, False), (125, 182, False), (152, 192, False), (156, 199, False), (40.2, 98, False)):
        mob.colle(O.banc(diag), x * T, y * T)
    mob.colle(O.panneau(), 92 * T, 113 * T)
    tonneau = O.tonneau()
    for x, y in ((47, 114), (78, 114)):
        mob.colle(tonneau, x * T + 4, y * T)
    # les caisses des cours d'entrepôts
    for i, (x, y) in enumerate(((19, 18), (20, 18), (32, 18), (3, 33), (4, 33), (19, 197), (20, 197),
                                (12, 216), (33, 205))):
        if not P.FER[0] <= x < P.FER[1]:
            mob.colle(E.caisse(i), x * T, y * T)
    # le marché : trois rangs d'étals de chaque côté de la rue de l'école
    couleurs_etal = list(E.AUVENTS)
    n = 0
    for y in (82, 89, 96):
        for x in (122, 127, 132, 137, 142):
            if x + 3 <= 145:
                mob.colle(E.etal(couleurs_etal[n % 5], n), x * T, y * T)
                n += 1
    for y in (116, 123, 130, 137):
        for x in (122, 127, 133):
            mob.colle(E.etal(couleurs_etal[n % 5], n), x * T, y * T)
            n += 1
    # le monument, les jeux d'enfants
    mob.colle(E.statue(), 80 * T + 8 - 24, 177 * T - 96)
    mob.colle(E.toboggan(), 127 * T, 189 * T)
    mob.colle(E.toboggan(), 137 * T, 196 * T)
    mob.colle(E.balancoire(), 132 * T, 188 * T)
    # l'arrêt de bus devant l'école, les réverbères
    c['equipements'].colle(E.abri_bus(), 93 * T, 101 * T)
    rev = O.reverbere()
    trottoir = lambda x, y: 0 <= x < W and 0 <= y < H and all(g[y + j][x + i] == 'trottoir' for i in (0, 1) for j in (0, 1))
    pres_d_une_rue = lambda x, y, rs: any(r[1] - 3 <= x <= r[2] + 2 and r[3] - 3 <= y <= r[4] + 2 for r in rs)
    for _, x0, x1, y0, y1 in P.RUES_H:
        for x in range(x0 + 5, x1 - 2, 10):
            if trottoir(x, y0 - 1) and not pres_d_une_rue(x, y0 - 1, P.RUES_V):
                c['equipements'].colle(rev, x * T, (y0 - 3) * T)
    for _, x0, x1, y0, y1 in P.RUES_V:
        for y in range(y0 + 5, y1 - 2, 10):
            if trottoir(x0 - 1, y) and not pres_d_une_rue(x0 - 1, y, P.RUES_H):
                c['equipements'].colle(rev, (x0 - 1) * T, (y - 2) * T)

    fo = c['fontaines']
    fo.colle([O.fontaine(k) for k in range(F.EAU_IMAGES)], *FONTAINE)
    fo.colle([O.fontaine_globe(k) for k in range(F.EAU_IMAGES)], *GLOBE)
    lac(fo)


def lac(t):
    """Le lac du grand parc : l'eau de la ferme (animée), plus sombre sous la berge du haut,
    une berge de terre et de cailloux."""
    cx, cy, rx, ry = LAC
    x0, x1, y0, y1 = int(cx - rx * 1.15), int(cx + rx * 1.15), int(cy - ry * 1.15), int(cy + ry * 1.15)
    for y in range(max(0, y0), min(H * T, y1)):
        for x in range(x0, x1):
            if not lac_dedans(x + 0.5, y + 0.5):
                continue
            if not lac_dedans(x + 0.5, y + 0.5, 4):
                # la berge : terre, cailloux, le contour
                c = (138, 112, 76) if hasard(x, y, 95) > 0.25 else (164, 156, 146)
                if not lac_dedans(x + 0.5, y + 0.5, 1):
                    c = (70, 82, 40)
                for k in range(F.EAU_IMAGES):
                    t.put(x, y, c, k)
                continue
            ombre = not lac_dedans(x + 0.5, y + 0.5 + 7, 4)
            for k in range(F.EAU_IMAGES):
                t.put(x, y, O.eau(x, y, k, ombre), k)


# ---------- la découpe et l'écriture ----------

DEPART = (35, 167)          # la tuile où l'on arrive en ville : le trottoir de l'avenue, près de la route de la ferme

GAREES = []      # les voitures garées : (x, y, demi-largeur, demi-hauteur) de leur emprise au sol


def objets_carte(premier_id):
    """Les couches d'objets de la circulation : « routes » (une polyligne par trajet, nommée
    « entrée>sortie », plan.trajets) et « carrefours » (des rectangles) ; les emprises des
    bâtiments et des voitures garées."""
    routes, carrefours, i = [], [], premier_id
    for nom, pts in P.trajets().items():
        x0, y0 = pts[0]
        routes.append({'id': i, 'name': nom, 'type': 'route', 'rotation': 0, 'visible': True,
                       'x': x0, 'y': y0, 'width': 0, 'height': 0,
                       'polyline': [{'x': x - x0, 'y': y - y0} for x, y in pts]})
        i += 1
    for v, h, x0, x1, y0, y1 in P.croisements():
        carrefours.append({'id': i, 'name': f'{v}/{h}', 'type': 'carrefour', 'rotation': 0, 'visible': True,
                           'x': x0 * T, 'y': y0 * T, 'width': (x1 - x0) * T, 'height': (y1 - y0) * T})
        i += 1
    batiments = []
    for b in BATIMENTS:
        batiments.append(b.objet(i))
        i += 1
    garees = []
    for x, y, dx, dy in GAREES:
        garees.append({'id': i, 'name': 'voiture', 'type': 'garee', 'rotation': 0, 'visible': True,
                       'x': x - dx, 'y': y - dy, 'width': 2 * dx, 'height': 2 * dy})
        i += 1
    return routes, carrefours, garees, batiments, i


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
    routes, carrefours, garees, batis, prochain = objets_carte(2)
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'width': W, 'height': H, 'tilewidth': T, 'tileheight': T,
        'infinite': False, 'nextlayerid': len(couches) + 6, 'nextobjectid': prochain,
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
            # les bâtiments : leur emprise au sol (on n'y marche pas) et le haut de leur dessin
            # (propriété « haut ») ; ce qui est dessiné au-dessus de l'emprise passe devant la
            # promeneuse quand elle est derrière (js/ville-carte.js)
            {'id': len(couches) + 5, 'name': 'batiments', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
             'visible': True, 'x': 0, 'y': 0, 'objects': batis},
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
