# Les barrières de bois du décor version 2, dessinées avec les pièces des modèles.
#
# Modèles : scripts/carte/originaux/barriere_*.png (40 × 48) — de petits enclos :
#   barriere_fermee.png           l'enclos fermé (les pièces de base) ;
#   barriere_portail_ferme.png    un portail à deux battants, fermé, sur le devant ;
#   barriere_portail_ouvert.png   le même, ouvert ; barriere_portillon*.png : un portillon sur le côté.
# Les poteaux du devant et du fond font 5 px de large, un tous les PAS px, avec trois lisses
# (rangées 35 à 37 du modèle) ; les côtés empilent des tronçons de poteau de TRONCON px.
#
# Utilisé par l'ancien scripts/carte/carte_v2.py : chaque barrière de la carte (BARRIERES) y était dessinée
# au pixel près, puis découpée en tuiles de 16 px (les tuiles identiques une seule fois) :
# assets/barrieres.png (bloc « barrieres » de scripts/carte/planche_v2.py).
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, T  # noqa: E402
ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')
SORTIE = os.path.join(ASSETS, 'barrieres.png')
PAS = 9            # d'un poteau au suivant, devant et au fond
TRONCON = 10       # un tronçon de poteau sur les côtés
HAUT_DEVANT = 15   # un poteau du devant, du chapeau au pied

# Les barrières de la carte (en tuiles) :
#   ('enclos', x0, y0, x1, y1, portail) : côtés aux colonnes x0 et x1, du haut de la rangée y0
#     (contre un bâtiment : pas de barrière au fond) au devant, dans la rangée y1 ; portail :
#     None, ou la colonne de tuile autour de laquelle centrer le portail à deux battants ;
#   ('rangee', x0, x1, y) : une barrière droite de la colonne x0 à x1, dans la rangée y.
#   fond (enclos seulement) : None, ou (gauche, droite, pied) en px : le bâtiment contre lequel
#     l'enclos s'appuie (le bas de ses murs) ; une barrière de fond relie chaque côté au mur,
#     pour qu'il ne reste aucun passage.
# L'Étable : barn_sp.png (104 × 93, murs des colonnes 4 à 99) posée bas-centre sur le rectangle
# `grange` de la carte (x 304,98, largeur 126,13, bas à y 335,45) : murs de x 320 à 415.
BARRIERES = [
    ('enclos', 19, 20, 27, 25, 23.5, (320, 415, 334)),     # l'enclos de l'Étable
    ('rangee', 29, 33, 22),                                # devant la maison
]


# Les bois des modèles, éclaircis vers les bois du décor version 2 (planches dorées et cadres
# bruns des bâtiments, scripts/batiments/style_v2.py) : chaque ton prend sa place, dans le même
# ordre, du contour au reflet du chapeau.
TEINTES = {
    (34, 24, 16): (70, 46, 28), (44, 30, 18): (92, 60, 32), (66, 45, 26): (122, 84, 40),
    (77, 52, 30): (140, 98, 46), (99, 65, 38): (150, 106, 52), (104, 74, 55): (160, 120, 72),
    (116, 83, 62): (170, 130, 80), (137, 113, 84): (196, 164, 110), (171, 124, 93): (214, 170, 118),
    (84, 60, 45): (146, 104, 58), (62, 62, 61): (84, 84, 88),     # cadre du portail, gonds
}


def modele(nom):
    im = Image.open(os.path.join(ORIG, nom)).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3]:
                px[x, y] = TEINTES.get(p[:3], p[:3]) + (p[3],)
    return im


def pieces():
    m = modele('barriere_fermee.png')
    p = modele('barriere_portail_ferme.png')
    return {
        'coin_g': m.crop((1, 31, 6, 46)),            # poteau d'angle du devant, à gauche
        'coin_d': m.crop((28, 31, 33, 46)),          # à droite
        'poteau': m.crop((10, 31, 15, 46)),          # poteau du devant
        'lisses': m.crop((6, 31, 10, 46)),           # entre deux poteaux : les lisses seules
        'chapeau': m.crop((1, 1, 6, 2)),             # le haut d'un côté (rangée « fff »)
        'troncon': m.crop((1, 12, 6, 22)),           # un tronçon de côté (chapeau, puis le bois)
        'portail': p.crop((1, 31, 33, 47)),          # deux poteaux et le portail fermé, 3 pas
    }


def devant(img, P, x0, y, n, portail=None, coins=True):
    """La barrière du devant : n pas depuis le poteau x0 (px), pied à la rangée y (px) ;
    portail : le pas où commence le portail (3 pas), ou None."""
    haut = y - HAUT_DEVANT + 1
    for k in range(n):
        img.alpha_composite(P['lisses'], (x0 + k * PAS + 5, haut))
    for k in range(n + 1):
        if portail is not None and portail < k < portail + 3:
            continue
        piece = P['coin_g'] if coins and k == 0 else P['coin_d'] if coins and k == n else P['poteau']
        img.alpha_composite(piece, (x0 + k * PAS, haut))
    if portail is not None:
        img.alpha_composite(P['portail'], (x0 + portail * PAS, haut))


def cote(img, P, x, y_haut, y_devant, chapeau=True):
    """Un côté : le chapeau à y_haut (sans chapeau : il part du pied d'un poteau d'angle du
    fond), puis des tronçons jusqu'au poteau d'angle du devant."""
    if chapeau:
        img.alpha_composite(P['chapeau'], (x, y_haut))
    y = y_haut + 1
    fin = y_devant - HAUT_DEVANT + 1
    while y < fin:
        t = P['troncon'].crop((0, 0, 5, min(TRONCON, fin - y)))
        img.alpha_composite(t, (x, y))
        y += TRONCON


def dessiner(W, H):
    """Toutes les barrières de BARRIERES sur une image de la taille de la carte (W × H tuiles)."""
    P = pieces()
    img = Image.new('RGBA', (W * T, H * T))
    for b in BARRIERES:
        if b[0] == 'enclos':
            _, x0, y0, x1, y1, portail, fond = b
            g = x0 * T + 5
            n = round((x1 - x0) * T / PAS)
            d = g + n * PAS
            pied = y1 * T + 14
            if fond:
                # le fond : du côté gauche au mur, du mur au côté droit ; les poteaux du côté
                # droit partent du côté (au pas), ceux qui tombent sous le mur sont cachés par lui
                bg, bd, pf = fond
                ng = max(1, -(-(bg - g) // PAS))
                nd = max(1, -(-(d - bd) // PAS))
                devant(img, P, g, pf, ng)
                devant(img, P, d - nd * PAS, pf, nd)
                cote(img, P, g, pf, pied, chapeau=False)
                cote(img, P, d, pf, pied, chapeau=False)
            else:
                haut = pied - HAUT_DEVANT + 1 - TRONCON * round((pied - HAUT_DEVANT + 1 - y0 * T) / TRONCON) - 1
                cote(img, P, g, haut, pied)
                cote(img, P, d, haut, pied)
            p = None
            if portail is not None:
                p = round(((portail * T) - g) / PAS - 1.5)
            devant(img, P, g, pied, n, p)
        else:
            _, x0, x1, y = b
            g = x0 * T + 3
            n = round((x1 + 1 - x0) * T / PAS) - 1
            devant(img, P, g, y * T + 14, n)
    return img


def portails(W):
    """Les cases (numéros dans la carte de W tuiles de large) tout entières dans l'ouverture d'un
    portail, entre ses deux poteaux : le personnage y passe (il ouvre le portail), pas les bêtes."""
    out = set()
    for b in BARRIERES:
        if b[0] != 'enclos' or b[5] is None:
            continue
        _, x0, _, _, y1, portail, _ = b
        g = x0 * T + 5
        p = round(((portail * T) - g) / PAS - 1.5)
        a, z = g + p * PAS + 5, g + (p + 3) * PAS          # entre les deux poteaux du portail
        out |= {y1 * W + tx for tx in range(-(-a // T), z // T)}
    return out


def tuiles(img, W, H):
    """Découpe en tuiles : {case: numéro de tuile dans la planche}, et les tuiles (uniques)."""
    uniques, index, cases = [], {}, {}
    for ty in range(H):
        for tx in range(W):
            t = img.crop((tx * T, ty * T, tx * T + T, ty * T + T))
            if not t.getbbox():
                continue
            cle = t.tobytes()
            if cle not in index:
                index[cle] = len(uniques)
                uniques.append(t)
            cases[ty * W + tx] = index[cle]
    return cases, uniques


def planche(uniques, cols, rangs):
    assert len(uniques) <= cols * rangs, f'{len(uniques)} tuiles de barrière : la planche en tient {cols * rangs}'
    out = Image.new('RGBA', (cols * T, rangs * T))
    for k, t in enumerate(uniques):
        out.paste(t, ((k % cols) * T, (k // cols) * T))
    out.save(SORTIE)
    return out
