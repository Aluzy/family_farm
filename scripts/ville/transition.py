# La carte de transition entre la ferme et la ville (96 × 72 tuiles). À l'est (à partir de la
# colonne OUEST), la partie fixe : le bout du chemin de terre de la ferme qui devient la route
# goudronnée de la ville, ses trottoirs, ses réverbères et l'arrêt de bus (celui des enfants qui
# vont à l'école). La route continue dans la ville (la route de la ferme, à l'ouest de
# assets/ville.json).
#
# L'ouest (colonnes 0 à OUEST - 1) est tiré par le jeu pour chaque partie (js/engine/transition.js,
# docs/carte-generee.md) : le chemin, trois à cinq maisons de voisins bâties en blocs et leurs
# allées, la mare, le puits, les barrières, les arbres, les rochers, l'herbe haute, les fleurs.
# Ce script n'y met que de l'herbe, et écrit le kit dont le jeu se sert pour l'y dessiner
# (propriété « kit » de la carte, KIT) : les tuiles d'herbe et de chemin pour chaque jeu de
# coins, les fleurs, et des tampons (des blocs de tuiles, une grille par couche) : la mare, le
# puits, le tonneau, le banc, les buissons, les barrières de 2 à 8 tuiles et leur ombre.
#
# Les passages (couche d'objets « passages ») : un rectangle au bord de la carte, sa cible
# (la page et le point d'arrivée) et le sens de sa flèche bleue (js/ville-carte.js) ; les
# points d'arrivée (couche « arrivees »), un par carte d'où l'on vient. Les maisons n'ont pas
# de passage : on y entre à pied (js/carte/ville/transition.js).
#
# Comme à la ferme : les barrières de bois de la ferme (scripts/carte/barrieres.py) ; l'herbe
# haute qui penche quand on la traverse (couche d'objets « herbe_haute » : un point par touffe,
# type = sa rangée dans assets/herbe_haute.png) ; les arbres et les pins (couche « arbres » : le
# milieu de leur pied, type arbre ou pin ; leurs images : assets/arbre_clair_sp.png et
# pin_clair_sp.png) qu'on coupe à la hache, et les rochers et cailloux (couche « rochers » : le
# milieu de leur pied, propriété « image » : la case de assets/transition_objets.png) qu'on
# casse à la pioche. Ils ne sont pas dans les tuiles : le jeu les dessine (et les enlève).
#
#   python3 scripts/ville/transition.py            écrit assets/transition.tmj et ses planches
#   python3 scripts/ville/transition.py --apercu   écrit aussi apercu_transition.png
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

commun.W, commun.H = 96, 72          # (avant tout le reste : les toiles prennent cette taille)
W, H, T = commun.W, commun.H, commun.T

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'carte'))
import barrieres as BR  # noqa: E402
import blocs as BL  # noqa: E402
import batiments as B  # noqa: E402
import equipements as E  # noqa: E402
import ferme as F  # noqa: E402
import objets as O  # noqa: E402
import sol as S  # noqa: E402
from commun import ASSETS, ROOT, K, Planche, Toile, hasard, image, rgba, teinte  # noqa: E402
from sol import motif, tuile_ferme  # noqa: E402
from PIL import Image  # noqa: E402

PLANCHES = {p.nom.split('_', 1)[1]: p for p in (
    Planche('transition_sol', "L'herbe et le chemin de la ferme, la route et les trottoirs de la ville"),
    Planche('transition_decor', "Marquage, fleurs, barrières, puits, tonneau, banc, panneau, arrêt de bus, réverbères"),
    Planche('transition_eau', "La mare, l'eau de la ferme (8 images)", images=F.EAU_IMAGES, duree=F.EAU_DUREE),
    Planche('transition_vegetation', "Arbres, pins et buissons de la ferme, et leurs ombres"),
)}
COUCHES = [
    ('marquage', 'decor', 1), ('fleurs', 'decor', 1), ('ombres', 'vegetation', 1),
    ('fontaines', 'eau', F.EAU_IMAGES), ('mobilier', 'decor', 1),
    ('equipements', 'decor', 1), ('vegetation', 'vegetation', 1),
    # l'abri de bus et les réverbères, chacun dans sa couche : le jeu les range selon leur pied
    # (propriété « pied »), le personnage passe devant ou derrière, pas dessus (couche « obstacles »)
    ('abri', 'decor', 1), ('reverberes_haut', 'decor', 1), ('reverberes_bas', 'decor', 1),
]

# ---------- le plan ----------

OUEST = 48                     # les colonnes 0 à OUEST - 1 : tirées par le jeu
# (l'est : ses places d'origine, décalées de DX colonnes et DY rangées : la route au milieu)
DX, DY = 24, 18
ROUTE = (52, 33, 39)           # la chaussée : de la colonne 52 au bord est, rangées 33 à 39 (coins)
TROTTOIRS = (54, 31, 41)       # les trottoirs, au-dessus et au-dessous, à partir de la colonne 54
# Au-dessus de l'arrêt de bus, le livreur (js/carte/ville/livreur.js) : son habitation et
# l'entrepôt, bâtis en blocs par le jeu (js/engine/transition.js, LIVREUR), et entre les deux le
# parking de son triporteur électrique, en enrobé bordé de trottoir (coins : x0, y0, x1, y1).
# RESERVE (tuiles x0, y0, x1, y1) : ni arbre, ni herbe haute, ni fleur.
PARKING = (66, 26, 74, 31)
RESERVE = (60, 18, 83, 30)
# La mare (un tampon du kit) : ses rayons en px
MARE_R = (4 * T, 2.4 * T)
# Les barrières de la ferme (des tampons du kit, de 2 à 8 tuiles de long) : leur pied à
# PIED_BARRIERE px du haut de leur rangée.
PIED_BARRIERE = 7
# Les pieds des réverbères et de l'abri de bus, au milieu des trottoirs (px depuis le haut de
# la carte) : le trottoir du haut va de la rangée 31 au bord de la route (rangée 33), celui du
# bas du bord de la route (rangée 39) à la rangée 41.
PIED_HAUT = 32 * T + 4
PIED_BAS = 40 * T + 6
# Les rochers et les cailloux : (genre, milieu du pied en tuiles) ; le genre est une case de
# assets/transition_objets.png (ROCHERS_IMAGES).
# (ceux de l'est : ceux de l'ouest sont tirés par le jeu)
ROCHERS_PLAN = [(g, x + DX, y + DY) for g, x, y in (
    ('rocher_b', 24.5, 33), ('rocher_c', 40, 28), ('caillou_0', 44.5, 33.5),
    ('rocher_a', 45, -4), ('rocher_b', 34, 5), ('caillou_1', 30.5, 9.6), ('rocher_b', 31, 31),
)] + [('rocher_a', 78, 8), ('caillou_0', 88.5, 19.5), ('rocher_c', 60, 62), ('caillou_1', 84.5, 66.6), ('rocher_b', 92, 50)]
ARBRES, ROCHERS, HERBES = [], [], []
OBSTACLES = []                        # (x, y, largeur, hauteur) en px : on ne marche pas dessus
LUMIERES = []                         # les lanternes des réverbères (x, y) en px : couche « lumieres »
PIEDS = {'abri': PIED_HAUT, 'reverberes_haut': PIED_HAUT, 'reverberes_bas': PIED_BAS}     # remplis par dessine : (genre, x, y) en px ; (x, y, rangée)


def reserve(x, y):
    """La tuile (x, y) est-elle dans la place du livreur (RESERVE) ?"""
    return RESERVE[0] <= x <= RESERVE[2] and RESERVE[1] <= y <= RESERVE[3]


def chemin(x):
    """Les rangées de coins du chemin de terre à la colonne x (à l'est de OUEST)."""
    return 35, 37


def coins():
    g = [['herbe'] * (W + 1) for _ in range(H + 1)]
    # (à l'ouest, le chemin est tiré par le jeu : il arrive ici rangées 35 à 37)
    for x in range(OUEST, ROUTE[0] + 1):
        a, b = chemin(x)
        for y in range(a, b + 1):
            g[y][x] = 'chemin'
    for y in range(TROTTOIRS[1], TROTTOIRS[2] + 1):
        for x in range(TROTTOIRS[0], W + 1):
            g[y][x] = 'trottoir'
    # le parking du livreur : un trottoir autour, l'enrobé dedans
    x0, y0, x1, y1 = PARKING
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = 'asphalte' if x0 < x < x1 and y0 < y < y1 + 1 else 'trottoir'
    for y in range(ROUTE[1], ROUTE[2] + 1):
        for x in range(ROUTE[0], W + 1):
            g[y][x] = 'asphalte'
    return g


# ---------- les tuiles de sol ----------

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


# Les maisons des voisins : bâties en blocs (assets/blocs.png) par le jeu, à l'ouest
# (js/carte/ville/transition.js) ; MAISONS reste vide (couche « batiments »).
MAISONS = []     # (nom, x0, y0 de l'image, largeur, hauteur)


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
    mob = c['mobilier']
    mob.colle(poteau_ville(), 50 * T, 31 * T)
    # la route : les tirets, l'arrêt de bus, les réverbères
    mq = c['marquage']
    cy = (ROUTE[1] + ROUTE[2]) * T // 2
    B.tirets(mq, ROUTE[0] * T + 6 + 2 * T, W * T, cy - 2, cy + 2)
    abri = E.abri_bus()
    c['abri'].colle(abri, 60 * T, PIED_HAUT - abri.height)
    OBSTACLES.append((60 * T + 2, PIED_HAUT - 22, 42, 26))          # le banc, la vitre, le poteau
    rev = O.reverbere()
    for x in (56, 66, 76, 86):
        c['reverberes_haut'].colle(rev, x * T, PIED_HAUT - rev.height)
        c['reverberes_bas'].colle(rev, x * T, PIED_BAS - rev.height)
        LUMIERES.extend((O.lanterne(x * T, PIED_HAUT - rev.height), O.lanterne(x * T, PIED_BAS - rev.height)))
        for pied in (PIED_HAUT, PIED_BAS):
            OBSTACLES.append((x * T + 4, pied - 10, 8, 16))
    # les fleurs et herbes hautes, sur l'herbe de l'est (celles de l'ouest : le jeu)
    g = coins()
    f = c['fleurs']
    pris = {(int(x + dx), int(y - 0.5)) for _, x, y in ROCHERS_PLAN for dx in (-1, 0, 1)}
    # (pas d'herbe haute sur le poteau, l'abri, un réverbère : ni sur leur case, ni juste au-dessus)
    pleins = [c[n].images[0] for n in ('mobilier', 'equipements', 'abri', 'reverberes_haut', 'reverberes_bas')]
    occupe = lambda x, y: any(im.crop((x * T, y * T, x * T + T, y * T + 2 * T)).getbbox() for im in pleins)
    for y in range(H):
        for x in range(OUEST, W):
            if any(g[y + j][x + i] != 'herbe' for i in (0, 1) for j in (0, 1)):
                continue
            r = hasard(x, y, 51)
            if r > 0.95 and not reserve(x, y):
                f.colle(F.fleurs(int(hasard(x, y, 53) * 40)), x * T, y * T)
            elif r > 0.89 and (x, y) not in pris and not occupe(x, y) and not reserve(x, y):
                # une touffe d'herbe haute (le jeu la dessine) : son pied un peu au hasard dans la case
                HERBES.append((x * T + 4 + int(hasard(x, y, 54) * 9), y * T + 10 + int(hasard(x, y, 55) * 6), int(hasard(x, y, 52) * 3)))
    # les arbres de l'est : des bois au nord et au sud, rien sur le chemin, la route, ni le
    # long des trottoirs, ni sur les rochers ; les arbres et les pins sont des objets (le jeu les dessine, on les coupe), les
    # buissons restent dans les tuiles
    veg = c['vegetation']
    plantes = []
    for j, y in enumerate(range(4, H + 2, 4)):
        for i, x in enumerate(range(2, W, 4)):
            px = x + (hasard(i, j, 81) - 0.5) * 2.4
            py = y + (hasard(i, j, 82) - 0.5) * 1.6
            if hasard(i, j, 83) < 0.3 or px < OUEST + 1.5:
                continue
            if 29 <= py <= 43 or (x > 51 and 23 <= py < 31) or (x > 51 and 40 <= py <= 48):
                continue
            if any(abs(px - a) < 2.2 and abs(py - b) < 1.6 for _, a, b in ROCHERS_PLAN):
                continue
            if RESERVE[0] - 2 <= px <= RESERVE[2] + 2 and RESERVE[1] - 1 <= py <= RESERVE[3] + 2:
                continue
            r = hasard(i, j, 84)
            plantes.append((px, py, 'pin' if r < 0.25 else 'buisson_large' if r < 0.35 else 'buisson' if r < 0.4 else 'arbre'))
    plantes += [(51.5, 27.5, 'buisson_large'), (50, 45, 'pin')]
    images = {'arbre': F.arbre(), 'pin': F.pin(), 'buisson': F.buisson(), 'buisson_large': F.buisson(True)}
    for x, y, genre in sorted(plantes, key=lambda p: p[1]):
        im = images[genre]
        w, h = im.size
        x0, y0 = round(x * T - w / 2) // T * T, round(y * T - h) // T * T
        if genre in ('arbre', 'pin'):
            ARBRES.append((genre, x0 + w // 2, y0 + h))
        else:
            veg.colle(im, x0, y0)
    # les rochers et les cailloux
    for genre, x, y in ROCHERS_PLAN:
        ROCHERS.append((genre, round(x * T), round(y * T)))


# ---------- le kit de l'ouest ----------

def tampon_images(w, h, n=1):
    return [image(w * T, h * T) for _ in range(n)]


def mare(n):
    """La mare : n images (l'eau qui bouge), sur un bloc de tuiles ; son centre au milieu."""
    rx, ry = MARE_R
    w, h = math.ceil((2 * rx + 6) / T), math.ceil((2 * ry + 6) / T)
    cx, cy = w * T / 2, h * T / 2
    ims = tampon_images(w, h, n)
    for y in range(h * T):
        for x in range(w * T):
            q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if q > 1:
                continue
            q2 = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy) / (ry - 3)) ** 2
            for k in range(n):
                if q2 > 1:
                    col = (70, 82, 40) if q > 0.9 else (138, 112, 76)
                else:
                    ombre = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy + 6) / (ry - 3)) ** 2 > 1
                    col = O.eau(x, y, k, ombre)
                ims[k].putpixel((x, y), rgba(col))
    return ims


def barriere(n):
    """Une barrière droite de n tuiles (son pied dans la 2e rangée du bloc) et son ombre
    (décalée de 3 px vers le bas à droite, à moitié noire, comme à la ferme)."""
    img = tampon_images(n, 3)[0]
    BR.devant(img, BR.pieces(), 3, T + PIED_BARRIERE, round(n * T / BR.PAS) - 1)
    ombre = tampon_images(n, 3)[0]
    a = img.getchannel('A').point(lambda v: 128 if v else 0)
    noir = Image.new('RGBA', img.size, (0, 0, 0, 0))
    noir.putalpha(a)
    ombre.alpha_composite(noir, (3, 3))
    return img, ombre


def colle_bloc(im, w, h, sprite, x=0, y=0):
    im.alpha_composite(sprite, (x, y))
    return im


def kit():
    """Les tuiles et les tampons de l'ouest, ajoutés aux planches : { sol, fleurs, tampons }
    avec des (planche, numéro) que main() change en numéros de tuile de la carte."""
    sol = {'herbe': [], 'chemin': [], 'raccords': {}}
    for v in range(16):
        sol['herbe'].append(('sol', PLANCHES['sol'].ajoute(S.plein('herbe', v), f'herbe_{v}')))
    for v in range(8):
        sol['chemin'].append(('sol', PLANCHES['sol'].ajoute(F.bloc(v, 49), f'chemin_{v}')))
    for n in range(1, 15):
        c = ['chemin' if n & b else 'herbe' for b in (8, 4, 2, 1)]
        im, nom = S.tuile_ferme(c, 0, 0)
        sol['raccords'][str(n)] = ('sol', PLANCHES['sol'].ajoute(im, nom))
    fleurs = []
    for k in range(40):
        t = ('decor', PLANCHES['decor'].ajoute(F.fleurs(k)))
        if t not in fleurs:
            fleurs.append(t)
    tampons = {}

    def tampon(nom, couches, w, h):
        """couches : { couche: (planche, [images d'un bloc de w × h tuiles]) }"""
        out = {'w': w, 'h': h, 'couches': {}}
        for couche, (p, ims) in couches.items():
            grille = []
            for ty in range(h):
                for tx in range(w):
                    frames = [im.crop((tx * T, ty * T, tx * T + T, ty * T + T)) for im in ims]
                    grille.append(None if all(f.getbbox() is None for f in frames) else (p, PLANCHES[p].ajoute(frames)))
            out['couches'][couche] = grille
        tampons[nom] = out

    eau = mare(F.EAU_IMAGES)
    tampon('mare', {'fontaines': ('eau', eau)}, eau[0].width // T, eau[0].height // T)
    puits = Image.open(os.path.join(ASSETS, 'puits.png')).convert('RGBA').crop((0, 0, 34, 40))
    tampon('puits', {'mobilier': ('decor', [colle_bloc(tampon_images(3, 3)[0], 3, 3, puits)])}, 3, 3)
    tampon('tonneau', {'mobilier': ('decor', [colle_bloc(tampon_images(1, 2)[0], 1, 2, O.tonneau())])}, 1, 2)
    tampon('banc', {'mobilier': ('decor', [colle_bloc(tampon_images(3, 2)[0], 3, 2, O.banc())])}, 3, 2)
    for large in (False, True):
        b = F.buisson(large)
        tampon('buisson_large' if large else 'buisson', {'vegetation': ('vegetation', [colle_bloc(tampon_images(3, 2)[0], 3, 2, b)])}, 3, 2)
    for n in range(2, 9):
        img, ombre = barriere(n)
        tampon(f'barriere_{n}', {'mobilier': ('decor', [img]), 'ombres': ('vegetation', [ombre])}, n, 3)
    return {'sol': sol, 'fleurs': fleurs, 'tampons': tampons}


# ---------- les passages et les arrivées ----------

PASSAGES = [
    # (nom, rectangle en tuiles x0, y0, x1, y1, sens de la flèche, cible[, distance où la flèche paraît])
    ('vers_la_ferme', 0, 34, 1, 38, 'gauche', 'jeu.html?arrivee=est'),
    ('vers_la_ville', W - 1, 32, W, 40, 'droite', 'ville-carte.html?carte=ville&arrivee=ferme'),
]
ARRIVEES = {'ferme': (2.5, 36.9), 'ville': (W - 2.5, 32.6)}

# Les images des rochers et des cailloux (assets/transition_objets.png, cases de 32 × 32, le
# pied au milieu du bas) : lues dans la planche de la ferme, celles de ses rochers.
ROCHERS_IMAGES = {'rocher_a': (15, 6, 2, 2), 'rocher_b': (15, 8, 2, 1), 'rocher_c': (15, 9, 2, 2),
                  'caillou_0': (13, 10, 1, 1), 'caillou_1': (14, 10, 1, 1)}


def planche_objets():
    noms = list(ROCHERS_IMAGES)
    out = image(32 * len(noms), 32)
    for i, n in enumerate(noms):
        im = F.bloc(*ROCHERS_IMAGES[n])
        b = im.getbbox()
        im = im.crop(b)
        out.alpha_composite(im, (i * 32 + (32 - im.width) // 2, 32 - im.height))
    out.save(os.path.join(ASSETS, 'transition_objets.png'), optimize=True)
    return noms


def bus_scolaire():
    """Le bus de l'école (couche « bus ») : il vient de la ville par la file du haut, s'arrête à
    l'abri, fait demi-tour au bout du goudron et repart vers l'est. Le matin les enfants arrivent
    de la ferme par le chemin et montent (« enfants_matin ») ; le soir ils descendent et
    rentrent (« enfants_soir »). En px."""
    milieu = (ROUTE[1] + ROUTE[2]) * T / 2
    ouest_bus, haut, bas, est = 55 * T, milieu - 15, milieu + 15, W * T + 48
    tour = [(est, haut), (ouest_bus, haut), (ouest_bus, bas), (est, bas)]
    # (ils attendent le bus devant l'abri, au bord du trottoir : on ne traverse pas l'abri)
    devant = PIED_HAUT + 15
    chemin_ = [(0.5 * T, 36.9 * T), (50 * T, 36.6 * T), (54 * T, devant), (61.5 * T, devant)]
    return ({'bus_matin': tour, 'bus_soir': tour, 'enfants_matin': chemin_, 'enfants_soir': chemin_[::-1]},
            {'arret': (62 * T, haut)})
DEPART = (6, 36.9)


def objets_carte():
    i = 2
    passages = []
    for nom, x0, y0, x1, y1, sens, cible, *proche in PASSAGES:
        props = [{'name': 'cible', 'type': 'string', 'value': cible}, {'name': 'sens', 'type': 'string', 'value': sens}]
        if proche:
            props.append({'name': 'proche', 'type': 'int', 'value': proche[0]})
        passages.append({'id': i, 'name': nom, 'type': 'passage', 'rotation': 0, 'visible': True,
                         'x': x0 * T, 'y': y0 * T, 'width': (x1 - x0) * T, 'height': (y1 - y0) * T, 'properties': props})
        i += 1
    arrivees = []
    for nom, (x, y) in ARRIVEES.items():
        arrivees.append({'id': i, 'name': nom, 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                         'x': x * T, 'y': y * T, 'width': 0, 'height': 0})
        i += 1
    batis = []
    for nom, x0, y0, w, h in MAISONS:
        # l'emprise : toutes les cases de la maison (sans toit, on ne passe pas derrière : on
        # entre par la porte) ; « haut » : le haut du dessin (le haut des murs du fond)
        batis.append({'id': i, 'name': nom, 'type': 'batiment', 'rotation': 0, 'visible': True,
                      'x': x0 + 2, 'y': y0 + (BL.H - T) + 2, 'width': w - 4, 'height': h - (BL.H - T) - 4,
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
    point = lambda nom, genre, x, y, props=None: {'id': 0, 'name': nom, 'type': genre, 'point': True, 'rotation': 0, 'visible': True,
                                                   'x': x, 'y': y, 'width': 0, 'height': 0, **({'properties': props} if props else {})}
    noms = planche_objets()
    plantes = [point(f'arbre_{x}_{y}', genre, x, y) for genre, x, y in ARBRES]
    taille = lambda genre: (13, 24) if genre.startswith('rocher') else (7, 12)      # demi-largeur, hauteur où on le touche
    rochers = [point(f'rocher_{x}_{y}', genre.split('_')[0], x, y, [{'name': 'image', 'type': 'int', 'value': noms.index(genre)},
                                                                    {'name': 'demi', 'type': 'int', 'value': taille(genre)[0]},
                                                                    {'name': 'haut', 'type': 'int', 'value': taille(genre)[1]}])
               for genre, x, y in ROCHERS]
    obstacles = [{'id': 0, 'name': 'obstacle', 'type': '', 'rotation': 0, 'visible': True, 'x': x, 'y': y, 'width': w, 'height': h}
                 for x, y, w, h in OBSTACLES]
    herbes = [point('', str(v), x, y) for x, y, v in HERBES]
    for o in plantes + rochers + herbes + obstacles:
        o['id'] = i
        i += 1
    return passages, arrivees, batis, bus, (plantes, rochers, herbes, obstacles), i


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
    k = kit()
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
    for nom, p in PLANCHES.items():
        premier[nom] = gid
        gid += p.nombre()
        p.ecrit()
    numero = lambda t: 0 if t is None else premier[t[0]] + t[1]
    KIT = {
        'ouest': OUEST, 'sol': {'herbe': [numero(t) for t in k['sol']['herbe']], 'chemin': [numero(t) for t in k['sol']['chemin']],
                                'raccords': {n: numero(t) for n, t in k['sol']['raccords'].items()}},
        'fleurs': [numero(t) for t in k['fleurs']],
        'tampons': {nom: {'w': d['w'], 'h': d['h'], 'couches': {c: [numero(t) for t in g] for c, g in d['couches'].items()}}
                    for nom, d in k['tampons'].items()},
    }
    couches = []
    for i, nom in enumerate(['sol'] + [c[0] for c in COUCHES]):
        data = [0 if cel is None else premier[cel[0]] + cel[1] for ligne in cellules[nom] for cel in ligne]
        couches.append({'id': i + 1, 'name': nom, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                        'opacity': 1, 'visible': True, 'data': data,
                        **({'properties': [{'name': 'pied', 'type': 'int', 'value': PIEDS[nom]}]} if nom in PIEDS else {})})
    passages, arrivees, batis, bus, (plantes, rochers, herbes, obstacles), prochain = objets_carte()
    lumieres = []
    for x, y in LUMIERES:
        lumieres.append({'id': prochain, 'name': f'reverbere_{x}_{y}', 'type': 'reverbere', 'point': True, 'rotation': 0,
                         'visible': True, 'x': x, 'y': y, 'width': 0, 'height': 0})
        prochain += 1
    n = len(couches)
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'width': W, 'height': H, 'tilewidth': T, 'tileheight': T,
        'infinite': False, 'nextlayerid': n + 11, 'nextobjectid': prochain,
        # le kit de l'ouest (voir l'en-tête) : lu par js/carte/ville/transition.js
        'properties': [{'name': 'kit', 'type': 'string', 'value': json.dumps(KIT, separators=(',', ':'))}],
        'tilesets': [{'firstgid': premier[k], 'source': f'{p.nom}.tsx'} for k, p in PLANCHES.items()],
        'layers': couches + [
            objet_groupe(n + 1, 'depart', [{'id': 1, 'name': 'depart', 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                                            'x': DEPART[0] * T, 'y': DEPART[1] * T, 'width': 0, 'height': 0}]),
            objet_groupe(n + 2, 'arrivees', arrivees),
            objet_groupe(n + 3, 'passages', passages),
            objet_groupe(n + 4, 'batiments', batis),
            objet_groupe(n + 5, 'bus', bus),
            objet_groupe(n + 6, 'arbres', plantes),
            dict(objet_groupe(n + 7, 'rochers', rochers), properties=[
                {'name': 'planche', 'type': 'string', 'value': 'transition_objets.png'},
                {'name': 'largeur', 'type': 'int', 'value': 32}, {'name': 'hauteur', 'type': 'int', 'value': 32}]),
            objet_groupe(n + 8, 'herbe_haute', herbes),
            objet_groupe(n + 9, 'obstacles', obstacles),
            objet_groupe(n + 10, 'lumieres', lumieres),
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
        # les objets que le jeu dessine : herbe haute, rochers, arbres (rangés par leur pied)
        herbe = Image.open(os.path.join(ASSETS, 'herbe_haute.png')).convert('RGBA')
        objets = Image.open(os.path.join(ASSETS, 'transition_objets.png')).convert('RGBA')
        sprites = [(y, herbe.crop((0, v * 16, 22, v * 16 + 16)), x - 11, y - 16) for x, y, v in HERBES]
        for genre, x, y in ROCHERS:
            k = list(ROCHERS_IMAGES).index(genre)
            sprites.append((y, objets.crop((k * 32, 0, k * 32 + 32, 32)), x - 16, y - 32))
        ombre = F.ombre()
        for genre, x, y in ARBRES:
            im = F.arbre() if genre == 'arbre' else F.pin()
            rendu.alpha_composite(ombre, (x - 16, y - 8))
            sprites.append((y, im, x - im.width // 2, y - im.height))
        for _, im, x, y in sorted(sprites, key=lambda q: q[0]):
            rendu.alpha_composite(im, (max(0, x), max(0, y)))
        rendu.save(os.path.join(ROOT, 'apercu_transition.png'))


if __name__ == '__main__':
    main()
