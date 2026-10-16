# La carte de transition entre la ferme et la ville (48 × 36 tuiles) : à l'ouest, l'herbe et le
# chemin de terre de la ferme (ses propres tuiles, lues dans la planche de la ferme), deux
# maisons de voisins dans le style de la ferme, un puits, une mare ; à l'est, le chemin
# devient la route goudronnée de la ville, ses trottoirs, ses réverbères et l'arrêt de bus
# (celui des enfants qui vont à l'école). La route continue dans la ville (la route de la
# ferme, à l'ouest de assets/ville.json).
#
# Les passages (couche d'objets « passages ») : un rectangle au bord de la carte, sa cible
# (la page et le point d'arrivée) et le sens de sa flèche bleue (js/ville-carte.js) ; les
# points d'arrivée (couche « arrivees »), un par carte d'où l'on vient.
#
#   python3 scripts/ville/transition.py            écrit assets/transition.tmj et ses planches
#   python3 scripts/ville/transition.py --apercu   écrit aussi apercu_transition.png
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

commun.W, commun.H = 48, 36          # (avant tout le reste : les toiles prennent cette taille)
W, H, T = commun.W, commun.H, commun.T

import batiments as B  # noqa: E402
import equipements as E  # noqa: E402
import ferme as F  # noqa: E402
import objets as O  # noqa: E402
import sol as S  # noqa: E402
from commun import ASSETS, ROOT, K, Planche, Toile, hasard, image, rgba, teinte  # noqa: E402
from PIL import Image  # noqa: E402

PLANCHES = {p.nom.split('_', 1)[1]: p for p in (
    Planche('transition_sol', "L'herbe et le chemin de la ferme, la route et les trottoirs de la ville"),
    Planche('transition_decor', "Marquage, fleurs, ombres, palissades, puits, panneau, arrêt de bus, réverbères"),
    Planche('transition_maisons', "Les maisons des voisins, dans le style de la ferme"),
    Planche('transition_eau', "La mare, l'eau de la ferme (8 images)", images=F.EAU_IMAGES, duree=F.EAU_DUREE),
    Planche('transition_vegetation', "Arbres, pins et buissons de la ferme, et leurs ombres"),
)}
COUCHES = [
    ('marquage', 'decor', 1), ('fleurs', 'decor', 1), ('ombres', 'vegetation', 1),
    ('fontaines', 'eau', F.EAU_IMAGES), ('murs', 'maisons', 1), ('mobilier', 'decor', 1),
    ('equipements', 'decor', 1), ('vegetation', 'vegetation', 1),
]

# ---------- le plan ----------

ROUTE = (28, 15, 21)           # la chaussée : de la colonne 28 au bord est, rangées 15 à 21 (coins)
TROTTOIRS = (30, 13, 23)       # les trottoirs, au-dessus et au-dessous, à partir de la colonne 30
MARE = (9 * T, 28 * T, 4 * T, 2.4 * T)


def chemin(x):
    """Les rangées de coins du chemin de terre à la colonne x (il ondule un peu)."""
    if x <= 9:
        return 17, 19
    if x <= 19:
        return 16, 18
    return 17, 19


def coins():
    g = [['herbe'] * (W + 1) for _ in range(H + 1)]
    for x in range(0, ROUTE[0] + 1):
        a, b = chemin(x)
        for y in range(a, b + 1):
            g[y][x] = 'chemin'
    # les allées de terre jusqu'aux portes des maisons
    for x, y0 in ((10, 14), (21, 14)):
        for y in range(y0, 17):
            g[y][x] = g[y][x + 1] = 'chemin'
    for y in range(TROTTOIRS[1], TROTTOIRS[2] + 1):
        for x in range(TROTTOIRS[0], W + 1):
            g[y][x] = 'trottoir'
    for y in range(ROUTE[1], ROUTE[2] + 1):
        for x in range(ROUTE[0], W + 1):
            g[y][x] = 'asphalte'
    return g


# ---------- les tuiles de sol ----------

def tuile_ferme(c, x, y):
    """Une tuile d'herbe et de chemin de la ferme (sa planche : la rangée 49 le chemin plein,
    la rangée 50 les raccords, la tuile n ayant du chemin aux coins n & 8, 4, 2, 1)."""
    n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == 'chemin')
    if n == 0:
        v = int(hasard(x, y, 8) * 16)
        return S.plein('herbe', v), f'herbe_{v}'
    if n == 15:
        v = int(hasard(x, y, 9) * 8)
        return F.bloc(v, 49), f'chemin_{v}'
    return F.bloc(n, 50), f'herbe_chemin_{n}'


def motif(m, x, y):
    if m == 'chemin':
        return F.bloc(0, 49).getpixel((x % T, y % T))[:3]
    return S.MOTIFS[m](x % T, y % T, 0)


def tuile_jointure(c, x, y):
    """Là où le chemin de terre rejoint le goudron : chaque quart de tuile prend la matière de
    son coin, le bord du goudron un peu déchiqueté et plus sombre."""
    im = image(T, T)
    quart = lambda u, v: c[(1 if u >= 8 else 0) + (2 if v >= 8 else 0)]
    for v in range(T):
        for u in range(T):
            j = int(hasard(u, v, 13) * 3) - 1
            m = quart(min(15, max(0, u + j)), v)
            col = motif(m, u, v)
            if m == 'asphalte' and any(quart(min(15, max(0, u + du + j)), min(15, max(0, v + dv))) == 'chemin'
                                       for du, dv in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                col = teinte(col, 0.7)
            im.putpixel((u, v), rgba(col))
    return im, 'jointure_' + '_'.join(c)


PASSAGES_TRIES = {tuple(sorted(p)): p for p in S.PASSAGES}


def tuile_sol(g, x, y):
    c = [g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1]]
    m = set(c)
    if m <= {'herbe', 'chemin'}:
        return tuile_ferme(c, x, y)
    if 'chemin' in m:
        return tuile_jointure(c, x, y)
    if len(m) == 1:
        k = c[0]
        v = 1 if k == 'asphalte' and hasard(x, y, 7) < 0.05 else 0
        return S.plein(k, v), f'{k}_{v}'
    if tuple(sorted(m)) in PASSAGES_TRIES:
        a, b = PASSAGES_TRIES[tuple(sorted(m))]
        n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == b)
        return S.passage(a, b, n), f'{a}_{b}_{n}'
    # trois matières : le trottoir l'emporte sur l'herbe
    c = ['trottoir' if v == 'herbe' else v for v in c]
    n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == 'trottoir')
    return S.passage('asphalte', 'trottoir', n), f'asphalte_trottoir_{n}'


# ---------- les maisons ----------

def maison(couleur):
    """La maison de la ferme (assets/house_sp.png), le toit repeint : 'rouge' ou 'ardoise'."""
    im = Image.open(os.path.join(ASSETS, 'house_sp.png')).convert('RGBA')
    px = im.load()
    f = {'rouge': (1.32, 0.86, 0.72), 'ardoise': (0.86, 0.96, 1.16)}[couleur]
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            # le toit : le haut de l'image, les tons bruns
            if a and y < 46 and r >= g >= b and r - b < 70:
                px[x, y] = (min(255, round(r * f[0])), min(255, round(g * f[1])), min(255, round(b * f[2])), a)
    return im


MAISONS = []     # (nom, x0, y0 de l'image, largeur, hauteur) : pour la couche « batiments »


def poteau_ville():
    """Le panneau « VILLE » sur son poteau, à l'entrée de la route."""
    im = image(32, 48)
    d = commun.dessin(im)
    d.rectangle((14, 12, 17, 46), fill=rgba(O.BOIS_K))
    d.rectangle((15, 12, 15, 46), fill=rgba(O.BOIS_C))
    d.ellipse((8, 43, 24, 47), fill=(0, 0, 0, 60))
    ens = E.enseigne('VILLE')
    im.alpha_composite(ens, ((32 - ens.width) // 2, 2))
    # la pointe, vers l'est
    d.polygon(((28, 3), (31, 8), (28, 13)), fill=rgba(O.BOIS_K))
    return im


def dessine(c):
    m = c['murs']
    for nom, couleur, x0, base in (('maison_rouge', 'rouge', 7 * T + 4, 14 * T + 6), ('maison_ardoise', 'ardoise', 18 * T + 4, 14 * T + 6)):
        im = maison(couleur)
        m.colle(im, x0, base - im.height)
        MAISONS.append((nom, x0, base - im.height, im.width, im.height))
    mob = c['mobilier']
    puits = Image.open(os.path.join(ASSETS, 'puits.png')).convert('RGBA').crop((0, 0, 34, 40))
    mob.colle(puits, 25 * T, 10 * T)
    B.cloture_h(mob, 3 * T, 10 * T, 15 * T + 12)
    B.cloture_h(mob, 12 * T, 21 * T, 15 * T + 12)
    B.cloture_h(mob, 23 * T, 26 * T, 15 * T + 12)
    mob.colle(O.tonneau(), 15 * T, 12 * T)
    mob.colle(poteau_ville(), 26 * T, 13 * T)
    mob.colle(O.banc(), 14 * T, 25 * T)
    # la route : les tirets, l'arrêt de bus, les réverbères
    mq = c['marquage']
    cy = (ROUTE[1] + ROUTE[2]) * T // 2
    B.tirets(mq, ROUTE[0] * T + 6 + 2 * T, W * T, cy - 2, cy + 2)
    eq = c['equipements']
    eq.colle(E.abri_bus(), 36 * T, ROUTE[1] * T - 48)
    rev = O.reverbere()
    for x in (32, 42):
        eq.colle(rev, x * T, (ROUTE[1] - 3) * T)
        eq.colle(rev, x * T, (ROUTE[2] - 1) * T)
    # la mare
    cx, cy, rx, ry = MARE
    eau = c['fontaines']
    for y in range(int(cy - ry) - 2, int(cy + ry) + 3):
        for x in range(int(cx - rx) - 2, int(cx + rx) + 3):
            q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if q > 1:
                continue
            q2 = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy) / (ry - 3)) ** 2
            for k in range(F.EAU_IMAGES):
                if q2 > 1:
                    col = (70, 82, 40) if q > 0.9 else (138, 112, 76)
                else:
                    ombre = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy + 6) / (ry - 3)) ** 2 > 1
                    col = O.eau(x, y, k, ombre)
                eau.put(x, y, col, k)
    # les fleurs et herbes hautes, sur l'herbe
    g = coins()
    f = c['fleurs']
    for y in range(H):
        for x in range(W):
            if any(g[y + j][x + i] != 'herbe' for i in (0, 1) for j in (0, 1)):
                continue
            if ((x + 0.5) * T - cx) ** 2 / (rx + 20) ** 2 + ((y + 0.5) * T - cy) ** 2 / (ry + 20) ** 2 < 1:
                continue
            r = hasard(x, y, 51)
            if r > 0.95:
                f.colle(F.fleurs(int(hasard(x, y, 53) * 40)), x * T, y * T)
            elif r > 0.88:
                f.colle(F.herbe_haute(int(hasard(x, y, 52) * 16)), x * T, y * T)
    # les arbres : des bois au nord et au sud, rien sur le chemin, la route ou devant les maisons
    veg, ombres = c['vegetation'], c['ombres']
    ombre = F.ombre()
    plantes = []
    for j, y in enumerate(range(4, H + 2, 4)):
        for i, x in enumerate(range(2, W, 4)):
            px = x + (hasard(i, j, 81) - 0.5) * 2.4
            py = y + (hasard(i, j, 82) - 0.5) * 1.6
            if hasard(i, j, 83) < 0.3:
                continue
            if 11 <= py <= 25 or (x > 27 and py < 13) or (x > 27 and 22 <= py <= 26):
                continue
            if abs(px - cx / T) < rx / T + 2.5 and abs(py - cy / T) < ry / T + 3:
                continue
            r = hasard(i, j, 84)
            plantes.append((px, py, F.pin() if r < 0.25 else F.buisson(r < 0.35) if r < 0.4 else F.arbre()))
    plantes += [(4, 11, F.arbre()), (27.5, 9.5, F.buisson(True)), (16, 26, F.arbre()), (24, 27, F.pin())]
    for x, y, im in sorted(plantes, key=lambda p: p[1]):
        w, h = im.size
        x0, y0 = round(x * T - w / 2) // T * T, round(y * T - h) // T * T
        if h > 32:
            ombres.colle(ombre, x0 + w // 2 - 16, y0 + h - 8)
        veg.colle(im, x0, y0)


# ---------- les passages et les arrivées ----------

PASSAGES = [
    # (nom, rectangle en tuiles x0, y0, x1, y1, sens de la flèche, cible)
    ('vers_la_ferme', 0, 16, 1, 20, 'gauche', 'jeu.html?arrivee=est'),
    ('vers_la_ville', W - 1, 14, W, 22, 'droite', 'ville-carte.html?carte=ville&arrivee=ferme'),
]
ARRIVEES = {'ferme': (2.5, 18.9), 'ville': (45.5, 14.6)}


def bus_scolaire():
    """Le bus de l'école (couche « bus ») : il vient de la ville par la file du haut, s'arrête à
    l'abri, fait demi-tour au bout du goudron et repart vers l'est. Le matin les enfants arrivent
    de la ferme par le chemin et montent (« enfants_matin ») ; le soir ils descendent et
    rentrent (« enfants_soir »). En px."""
    milieu = (ROUTE[1] + ROUTE[2]) * T / 2
    ouest_bus, haut, bas, est = 31 * T, milieu - 15, milieu + 15, W * T + 48
    tour = [(est, haut), (ouest_bus, haut), (ouest_bus, bas), (est, bas)]
    chemin_ = [(0.5 * T, 18.9 * T), (26 * T, 18.6 * T), (30 * T, 14.6 * T), (37 * T, 14.5 * T)]
    return ({'bus_matin': tour, 'bus_soir': tour, 'enfants_matin': chemin_, 'enfants_soir': chemin_[::-1]},
            {'arret': (38 * T, haut)})
DEPART = (6, 18.9)


def objets_carte():
    i = 2
    passages = []
    for nom, x0, y0, x1, y1, sens, cible in PASSAGES:
        passages.append({'id': i, 'name': nom, 'type': 'passage', 'rotation': 0, 'visible': True,
                         'x': x0 * T, 'y': y0 * T, 'width': (x1 - x0) * T, 'height': (y1 - y0) * T,
                         'properties': [{'name': 'cible', 'type': 'string', 'value': cible},
                                        {'name': 'sens', 'type': 'string', 'value': sens}]})
        i += 1
    arrivees = []
    for nom, (x, y) in ARRIVEES.items():
        arrivees.append({'id': i, 'name': nom, 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                         'x': x * T, 'y': y * T, 'width': 0, 'height': 0})
        i += 1
    batis = []
    for nom, x0, y0, w, h in MAISONS:
        # l'emprise : le bas de la maison (on passe derrière le toit) ; « haut » : le haut du dessin
        batis.append({'id': i, 'name': nom, 'type': 'batiment', 'rotation': 0, 'visible': True,
                      'x': x0 + 4, 'y': y0 + h - 30, 'width': w - 8, 'height': 24,
                      'properties': [{'name': 'haut', 'type': 'int', 'value': int(y0)}]})
        i += 1
    bus = []
    lignes, points = bus_scolaire()
    for nom, pts in lignes.items():
        x0, y0 = pts[0]
        bus.append({'id': i, 'name': nom, 'type': 'bus', 'rotation': 0, 'visible': True, 'x': x0, 'y': y0,
                    'width': 0, 'height': 0, 'polyline': [{'x': x - x0, 'y': y - y0} for x, y in pts]})
        i += 1
    for nom, (x, y) in points.items():
        bus.append({'id': i, 'name': nom, 'type': 'arret', 'point': True, 'rotation': 0, 'visible': True,
                    'x': x, 'y': y, 'width': 0, 'height': 0})
        i += 1
    return passages, arrivees, batis, bus, i


def objet_groupe(id_, nom, objets):
    return {'id': id_, 'name': nom, 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
            'visible': True, 'x': 0, 'y': 0, 'objects': objets}


def main():
    for m, n in (('asphalte', 2), ('trottoir', 1)):
        for v in range(n):
            PLANCHES['sol'].ajoute(S.plein(m, v), f'{m}_{v}')
    g = coins()
    cellules = {'sol': [[None] * W for _ in range(H)]}
    cache = {}
    for y in range(H):
        for x in range(W):
            cle = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1], int(hasard(x, y, 8) * 16), int(hasard(x, y, 9) * 8), hasard(x, y, 7) < 0.05)
            if cle not in cache:
                cache[cle] = tuile_sol(g, x, y)
            im, nom = cache[cle]
            cellules['sol'][y][x] = ('sol', PLANCHES['sol'].ajoute(im, nom))
    toiles = {nom: Toile(nom, p, n) for nom, p, n in COUCHES}
    dessine(toiles)
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
    premier, gid = {}, 1
    for k, p in PLANCHES.items():
        premier[k] = gid
        gid += p.nombre()
        p.ecrit()
    couches = []
    for i, nom in enumerate(['sol'] + [c[0] for c in COUCHES]):
        data = [0 if cel is None else premier[cel[0]] + cel[1] for ligne in cellules[nom] for cel in ligne]
        couches.append({'id': i + 1, 'name': nom, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                        'opacity': 1, 'visible': True, 'data': data})
    passages, arrivees, batis, bus, prochain = objets_carte()
    n = len(couches)
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'width': W, 'height': H, 'tilewidth': T, 'tileheight': T,
        'infinite': False, 'nextlayerid': n + 6, 'nextobjectid': prochain,
        'tilesets': [{'firstgid': premier[k], 'source': f'{p.nom}.tsx'} for k, p in PLANCHES.items()],
        'layers': couches + [
            objet_groupe(n + 1, 'depart', [{'id': 1, 'name': 'depart', 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                                            'x': DEPART[0] * T, 'y': DEPART[1] * T, 'width': 0, 'height': 0}]),
            objet_groupe(n + 2, 'arrivees', arrivees),
            objet_groupe(n + 3, 'passages', passages),
            objet_groupe(n + 4, 'batiments', batis),
            objet_groupe(n + 5, 'bus', bus),
        ],
    }
    with open(os.path.join(ASSETS, 'transition.tmj'), 'w') as f:
        json.dump(carte, f, indent=1)
    for k, p in PLANCHES.items():
        print(f'assets/{p.nom}.png : {len(p.tuiles)} tuiles')
    print(f'assets/transition.tmj : {W} × {H} tuiles, {len(couches)} couches')
    if '--apercu' in sys.argv:
        rendu = image(W * T, H * T)
        for nom in ['sol'] + [c[0] for c in COUCHES]:
            for y in range(H):
                for x in range(W):
                    cel = cellules[nom][y][x]
                    if cel:
                        rendu.alpha_composite(PLANCHES[cel[0]].tuiles[cel[1]][0], (x * T, y * T))
        rendu.save(os.path.join(ROOT, 'apercu_transition.png'))


if __name__ == '__main__':
    main()
