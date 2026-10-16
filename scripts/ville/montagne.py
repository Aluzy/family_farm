# La montagne (56 × 44 tuiles), où mène le train de la ville (vers le nord) : un terminus au
# pied des alpages. La voie arrive par le sud jusqu'à son heurtoir, la petite gare de bois est à
# côté du quai ; un chemin de terre traverse l'alpage (les pins, les rochers, le lac) jusqu'au
# pied de la falaise et à ses deux grottes. Sur le plateau, au-dessus de la falaise, la neige.
#
# Les couches d'objets, pour js/ville-carte.js :
#   gare        « arret » (la voie, et où s'arrête le milieu du train), « quai » (où l'on monte)
#   arrivees    « gare » : devant la porte de la gare, là où l'on paraît en descendant du train
#   batiments   l'emprise de la gare (on la touche pour ouvrir la fenêtre des départs)
#   grottes     l'entrée de chaque grotte (des points)
#   trouvailles les endroits où l'on peut trouver quelque chose (« genre » : fossile, pierre)
#   animaux     les zones des animaux (« espece » : marmotte, bouquetin, aigle)
#
#   python3 scripts/ville/montagne.py [--apercu]     écrit assets/montagne.tmj et ses planches
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

commun.W, commun.H = 56, 44
W, H, T = commun.W, commun.H, commun.T

import excursion as X  # noqa: E402
import equipements as E  # noqa: E402
import ferme as F  # noqa: E402
import objets as O  # noqa: E402
import sol as S  # noqa: E402
from commun import K, Planche, contour, hasard, image, mel, rgba, teinte  # noqa: E402

PLANCHES = {p.nom.split('_', 1)[1]: p for p in (
    Planche('montagne_sol', "L'alpage, le chemin, la roche, le quai"),
    Planche('montagne_decor', "La voie, le heurtoir, les cailloux, les rochers, le panneau"),
    Planche('montagne_roche', "La falaise, ses grottes, le plateau enneigé"),
    Planche('montagne_eau', "Le lac, l'eau de la ferme (8 images)", images=F.EAU_IMAGES, duree=F.EAU_DUREE),
    Planche('montagne_batiment', "La gare de montagne"),
    Planche('montagne_vegetation', "Pins, arbres, buissons, fleurs"),
)}
COUCHES = [
    ('rails', 'decor', 1), ('marquage', 'decor', 1), ('fleurs', 'vegetation', 1), ('ombres', 'vegetation', 1),
    ('falaise', 'roche', 1), ('fontaines', 'eau', F.EAU_IMAGES),
    ('murs', 'batiment', 1), ('pierre_de_taille', 'batiment', 1), ('vitrages', 'batiment', 1),
    ('charpente', 'batiment', 1), ('toits', 'batiment', 1), ('menuiserie', 'batiment', 1),
    ('mobilier', 'decor', 1), ('vegetation', 'vegetation', 1),
]
STYLES = {('herbe', 'roche'): 'roche', ('roche', 'neige'): 'neige', ('herbe', 'place'): 'place', ('roche', 'place'): 'joint'}

# ---------- le plan (en tuiles) ----------

VOIE = 8                  # l'axe de la voie (en tuiles : x = 8 × 16 px)
HEURTOIR = 17             # la voie s'arrête là
ARRET = 25.5              # le milieu du train à l'arrêt
QUAI = (9, 12, 17, 37)    # x0, x1, y0, y1
GARE = (12, 20, 28)       # x0, x1, base
PARVIS = (9, 23, 28, 31)
GROTTES = [30, 46]        # les colonnes des deux grottes
LAC = (40 * T, 33.5 * T, 6.5 * T, 3 * T)


def haut_falaise(x):
    """Le bord du plateau (px) à la colonne de pixels x."""
    return 9.5 * T + 10 * math.sin(x / 37) + 6 * math.sin(x / 13 + 1)


def pied(x):
    """Le pied de la falaise (px)."""
    return haut_falaise(x) + 46 + 8 * math.sin(x / 23 + 2)


def chemin_cases():
    """Les coins du chemin de terre : du parvis vers l'est, puis vers chaque grotte."""
    cases = set()
    for x in range(PARVIS[1], GROTTES[0] + 2):
        cases |= {(x, 29), (x, 30)}
    for y in range(int(pied(GROTTES[0] * T) / T) + 1, 31):
        cases |= {(GROTTES[0], y), (GROTTES[0] + 1, y)}
    for x in range(GROTTES[0], GROTTES[1] + 2):
        cases |= {(x, 21), (x, 22)}
    for y in range(int(pied(GROTTES[1] * T) / T) + 1, 23):
        cases |= {(GROTTES[1], y), (GROTTES[1] + 1, y)}
    return cases


def coins():
    g = [['herbe'] * (W + 1) for _ in range(H + 1)]
    for y in range(H + 1):
        for x in range(W + 1):
            p = pied(x * T)
            if y * T < p + 1.6 * T + 10 * hasard(x, 3):
                g[y][x] = 'roche'
    for x, y in chemin_cases():
        if g[y][x] == 'herbe':
            g[y][x] = 'chemin'
    x0, x1, y0, y1 = QUAI
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = 'place'
    x0, x1, y0, y1 = PARVIS
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = 'place'
    return g


# ---------- la falaise ----------

PAROI = [(92, 86, 82), (118, 110, 104), (142, 134, 126), (170, 162, 152)]


def falaise(t):
    """La falaise en 3/4 : le plateau (roche et neige) jusqu'au bord, la paroi qui descend
    jusqu'au pied (des piliers éclairés à gauche, des strates, des fissures), puis les grottes."""
    for x in range(W * T):
        bord, bas = haut_falaise(x), pied(x)
        pilier = int(x / 9 + 3 * math.sin(x / 31))
        for y in range(0, int(bas) + 1):
            if y < bord:
                # le plateau : la roche, de plus en plus de neige vers le haut
                limite = 4.5 * T + 14 * math.sin(x / 29) + 8 * math.sin(x / 11)
                # (au bord de la neige, un liseré tramé)
                neige = y < limite - 2 or (y < limite + 2 and (x + y) % 2 == 0)
                if neige:
                    c = S.neige(x % T, y % T)
                else:
                    n = hasard(x, y, 64)
                    strate = int(y + 3 * math.sin(x / 9)) % 7 == 0
                    c = PAROI[1] if strate else PAROI[2] if n < 0.7 else PAROI[3] if n < 0.92 else PAROI[1]
                if bord - y < 3:
                    c = (226, 232, 240) if neige else PAROI[3]          # l'arête, au soleil
                t.put(x, y, c)
                continue
            q = (y - bord) / max(1, bas - bord)
            u = x / 9 + 3 * math.sin(x / 31) - pilier                     # 0..1 dans le pilier
            ton = 3 if u < 0.2 else 2 if u < 0.65 else 1
            if u > 0.9:
                ton = 0                                                    # la fissure
            if int(y + 4 * math.sin(x / 17)) % 11 == 0:
                ton = max(0, ton - 1)                                      # une strate
            if q > 0.85:
                ton = max(0, ton - 1)                                      # l'ombre du pied
            if hasard(x, y, 62) < 0.06:
                ton = max(0, ton - 1)
            c = PAROI[ton]
            if y > bas - 1.5:
                c = K
            t.put(x, y, c)
        # la neige qui déborde sur le haut de la paroi
        for y in range(int(bord), int(bord) + 2 + int(hasard(x // 3, 63) * 3)):
            if x // 4 % 3:
                t.put(x, y, (232, 238, 246))
    for gx in GROTTES:
        grotte(t, gx * T + T, pied(gx * T + T))


def grotte(t, cx, bas):
    """L'entrée d'une grotte : une arche sombre au pied de la paroi, bordée de pierres."""
    rx, h = 15, 32
    for y in range(int(bas - h - 4), int(bas) + 1):
        for x in range(int(cx - rx - 4), int(cx + rx + 5)):
            u = (x + 0.5 - cx) / rx
            v = (bas - (y + 0.5)) / h            # 0 au sol, 1 en haut de l'arche
            r = u * u + max(0, v - 0.35) ** 2 / 0.65 ** 2 * 1.0
            if v < 0:
                continue
            if r <= 1:
                prof = min(1, (1 - r) * 2.2)
                t.put(x, y, mel((54, 46, 48), (18, 14, 18), prof))
            elif r <= 1.45:
                bloc = int(math.atan2(v, u) * 4) % 2
                t.put(x, y, PAROI[3] if bloc and r < 1.2 else PAROI[2] if r < 1.3 else K)


# ---------- les décors ----------

def poteau(mot):
    im = image(48, 48)
    d = commun.dessin(im)
    d.rectangle((22, 12, 25, 46), fill=rgba(O.BOIS_K))
    d.rectangle((23, 12, 23, 46), fill=rgba(O.BOIS_C))
    d.ellipse((16, 43, 32, 47), fill=(0, 0, 0, 60))
    ens = E.enseigne(mot)
    im.alpha_composite(ens, ((48 - ens.width) // 2, 2))
    return im


def dessine(c):
    # la voie, son heurtoir, le quai
    E.voie(c['rails'], VOIE * T, HEURTOIR * T + 8, H * T)
    c['mobilier'].colle(X.heurtoir(), VOIE * T - 16, HEURTOIR * T - 14)
    E.bord_de_quai(c['marquage'], QUAI[0] * T + 1, QUAI[2] * T, QUAI[3] * T)
    falaise(c['falaise'])
    # les éboulis au pied de la falaise
    for x in range(0, W * T, 6):
        if hasard(x, 71) < 0.5:
            c['marquage'].colle(O.caillou(int(hasard(x, 72) * 9)), x - 8, round(pied(x)) + int(hasard(x, 73) * 22) - 4)
    X.eau_ovale(c['fontaines'], *LAC)
    OBJ.batiment(X.gare(c, 'gare', GARE[0], GARE[1], GARE[2], 'bois', 'ardoise'))
    mob = c['mobilier']
    mob.colle(O.banc(), 19 * T, 31 * T)
    mob.colle(O.banc(), 37 * T, 29 * T)
    mob.colle(poteau('GROTTES'), (GROTTES[0] - 2) * T, 25 * T)
    rev = O.reverbere()
    for x in (10, 22):
        mob.colle(rev, x * T, 26 * T)
    for x, y, w, h, gr in ((24, 18, 44, 32, 1), (35, 15.5, 64, 44, 2), (51, 23, 52, 38, 3), (49, 34, 36, 26, 4),
                           (3, 26, 44, 32, 5), (26, 38, 32, 24, 6), (15, 40, 40, 28, 7), (54, 40, 32, 24, 8)):
        mob.colle(X.rocher(w, h, gr), round(x * T - w / 2), round(y * T - h))
    # les fleurs et herbes hautes sur l'alpage
    g = coins()
    cx, cy, rx, ry = LAC
    fl = c['fleurs']
    for y in range(H):
        for x in range(W):
            if any(g[y + j][x + i] != 'herbe' for i in (0, 1) for j in (0, 1)):
                continue
            if ((x + 0.5) * T - cx) ** 2 / (rx + 20) ** 2 + ((y + 0.5) * T - cy) ** 2 / (ry + 20) ** 2 < 1:
                continue
            r = hasard(x, y, 51)
            if r > 0.93:
                fl.colle(F.fleurs(int(hasard(x, y, 53) * 40)), x * T, y * T)
            elif r > 0.85:
                fl.colle(F.herbe_haute(int(hasard(x, y, 52) * 16)), x * T, y * T)
    # les pins (et quelques arbres), loin de la voie, de la gare, du chemin et du lac
    chemin = chemin_cases()
    liste = []
    for j, y in enumerate(range(18, H + 3, 3)):
        for i, x in enumerate(range(1, W, 3)):
            px = x + (hasard(i, j, 81) - 0.5) * 2
            py = y + (hasard(i, j, 82) - 0.5) * 1.4
            if hasard(i, j, 83) < 0.45:
                continue
            if px < 24 and py < 34 or px < 12:
                continue
            if py * T < pied(px * T) + 3 * T:
                continue
            if any(abs(px - a) < 2.5 and 0 < b + 1 - py + 1.5 < 4.5 for a, b in chemin):
                continue
            if abs(px - cx / T) < rx / T + 2.5 and abs(py - cy / T) < ry / T + 3:
                continue
            r = hasard(i, j, 84)
            liste.append((px, py, F.pin() if r < 0.7 else F.buisson(r < 0.8) if r < 0.9 else F.arbre()))
    liste += [(3, 42, F.pin()), (6, 21, F.pin()), (2, 33, F.pin()), (13, 43, F.buisson(True))]
    X.plantes(c['vegetation'], c['ombres'], liste)


OBJ = X.Objets()

TROUVAILLES = [
    # (x, y en tuiles, genre) : les fossiles dans les éboulis, les pierres près des rochers et du lac
    (19, None, 'fossile'), (26, None, 'fossile'), (34, None, 'fossile'), (41, None, 'fossile'), (51, None, 'fossile'),
    (22.5, 18.6, 'pierre'), (38.5, 18.2, 'pierre'), (54, 25.5, 'pierre'), (47, 34.4, 'pierre'), (5.2, 27.6, 'pierre'),
    (28, 38.6, 'pierre'), (33.5, 33.5, 'pierre'), (13, 40.5, 'pierre'),
]


def main():
    obj = OBJ
    obj.point('depart', 'depart', 16 * T, 29.3 * T)
    obj.point('arrivees', 'gare', 16 * T, 29.3 * T)
    obj.point('gare', 'arret', VOIE * T, ARRET * T)
    obj.point('gare', 'quai', 9.7 * T, ARRET * T)
    for gx in GROTTES:
        obj.point('grottes', f'grotte_{gx}', gx * T + T, round(pied(gx * T + T)) + 6)
    for x, y, genre in TROUVAILLES:
        if y is None:
            y = (pied(x * T) + 20) / T
        obj.point('trouvailles', f'{genre}_{len(obj.couches.get("trouvailles", []))}', round(x * T), round(y * T), genre=genre)
    for nom, (x, y, w, h) in (('marmotte', (19, 16.5, 12, 7)), ('marmotte', (45, 19, 10, 9)), ('marmotte', (2, 23, 6, 8)),
                              ('bouquetin', (12, 14.3, 42, 2.4)), ('aigle', (0, 0, W, H))):
        obj.rect('animaux', nom, x * T, y * T, w * T, h * T, espece=nom)
    # (la couche « batiments » : remplie par dessine, la gare une fois dessinée)
    X.ecrit('montagne', PLANCHES, COUCHES, coins(), STYLES, dessine, obj)


if __name__ == '__main__':
    main()
