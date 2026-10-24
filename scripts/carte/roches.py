# Les rochers, les falaises et la côte du grand monde (docs/grand-monde.md, étape 5 : fiche 5c),
# dans le style des rochers de la ferme (scripts/carte/rochers.py : vue de haut à 45°, lumière en
# haut à gauche, pierre taillée en pans plats, contour sombre d'un pixel, le dessus clair et le
# flanc avant dans l'ombre) et de la végétation de la fiche 5b (scripts/carte/vegetation.py).
#
#   python3 scripts/carte/roches.py            écrit assets/roches.png et assets/roches.json
#   python3 scripts/carte/roches.py --apercu   écrit aussi apercu_roches.png (la planche agrandie,
#                                              chaque dessin sur le sol de son biome, à côté des
#                                              rochers de la ferme) et apercu_parois.png (des
#                                              falaises montées colonne par colonne)
#
# Relancer le script redonne la même image (tout le hasard est tiré de clés fixes).
#
# Les sortes et leur nombre de variantes sont ceux de data/monde.json (ROCHES.SORTES) : le jeu y
# lit où les poser (js/engine/monde-roches.js) ; ce script dessine chaque variante. Comme pour la
# végétation, la planche range les dessins par rangées et assets/roches.json donne, pour chaque
# sorte, ses images : { "sorte": [[x, y, l, h, px, py]…] } (le rectangle dans la planche et le
# pied : le point du dessin posé au sol). Le pied d'une pièce de deux cases de large (gros bloc,
# rocher moussu, éboulis) est au milieu de sa case de gauche ; celui de l'épave, au milieu de sa
# case avant gauche. « ecume » (pas une sorte) : les quatre images de l'écume qui bat autour d'un
# rocher dans l'eau (la scène les fait tourner).
#
# Les falaises (paroi, paroi_herbe, paroi_neige) sont des colonnes de 16 px de large, posées côte à
# côte au bas de chaque bande de cases de falaise (ou de sommet) du plan : une face verticale vue
# à 45° (14 px de haut par case, comme les blocs : scripts/carte/blocs.py), faite de pans de roche
# étirés en strates (l'arête du dessus éclairée, le dessous dans l'ombre) ; en haut, son rebord (de
# la roche, de l'herbe qui pend, ou de la neige et des glaçons). La face est une texture de 48 px
# de large qui se répète : chaque colonne en est une tranche de 16 px (le jeu prend la tranche
# colonne modulo 3), et deux colonnes voisines, au même pied, se raccordent sans couture. Chaque
# colonne a 3 hauteurs (1, 2 ou 3 cases), 9 bouts (à gauche et à droite : la bande continue, une
# marche quand la voisine commence une case plus haut, l'arête là où la bande s'arrête) et 3
# tranches : variante = ((hauteur - 1) × 9 + gauche + 3 × droite) × 3 + tranche.
#
# Les ombres ne sont pas dans les grands dessins (le jeu les porte au sol selon le soleil, comme
# celles des rochers et des arbres de la ferme, js/carte/ferme/soleil.js) ; les petites pièces,
# peintes dans le sol de leur région, ont une ombre légère à leur pied.
import json
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scripts/carte : rochers, vegetation
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, hasard  # noqa: E402
from rochers import CONTOUR, GRIS, MOUSSE  # noqa: E402
from rochers import LUMIERE as LUMIERE_ROCHERS  # noqa: E402
import vegetation as V  # noqa: E402

SORTIE = os.path.join(ASSETS, 'roches.png')
SORTIE_JSON = os.path.join(ASSETS, 'roches.json')
DONNEES = os.path.join(ROOT, 'data', 'monde.json')
LARGEUR_PLANCHE = 512


# ---------- les couleurs ----------
#
# GRIS : la pierre des rochers de la ferme (rochers.py), pour les rochers des prairies, des landes,
# des plages. Les autres en sont des voisines : le granit de la montagne, un peu plus froid et
# moucheté ; la roche brune des falaises (celle du sol « falaise », scripts/carte/sols_monde.py) ;
# la pierre mouillée des rochers dans l'eau. Toutes vont du plus sombre au plus clair.

GRANIT = [(44, 44, 46), (62, 61, 62), (82, 80, 80), (104, 101, 99), (126, 122, 118), (148, 144, 138), (172, 168, 160), (200, 196, 188)]
FALAISE = [(44, 38, 34), (60, 53, 48), (76, 68, 62), (92, 83, 76), (108, 98, 90), (124, 114, 104), (144, 134, 122), (170, 160, 146)]
NEIGE = [(150, 168, 196), (182, 198, 222), (212, 224, 240), (236, 242, 250), (252, 254, 255)]
GLACE = [(120, 168, 214), (168, 206, 236), (214, 236, 250)]
HERBE = [(38, 70, 26), (60, 98, 36), (92, 132, 46), (126, 164, 58), (158, 190, 82)]
ECUME = (238, 246, 252)
SABLE_MOUILLE = (150, 128, 92)
BOIS = [(42, 28, 18), (66, 44, 28), (92, 64, 40), (120, 86, 54), (148, 110, 72), (176, 138, 96)]
BOIS_GRIS = [(52, 48, 44), (78, 72, 64), (106, 98, 88), (134, 126, 112), (164, 156, 140), (192, 186, 170)]


def norme(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


L = norme(LUMIERE_ROCHERS)


def clair(c, k):
    """La couleur c éclaircie (k > 0) ou assombrie (k < 0), de k (de -1 à 1)."""
    if k >= 0:
        return tuple(round(v + (255 - v) * k) for v in c[:3])
    return tuple(round(v * (1 + k)) for v in c[:3])


# ---------- les rochers : un champ de hauteurs taillé en pans ----------

def pierre(w, h, blocs, pal=GRIS, graine=0, mousse=0.0, neige=0.0, mouille=0, fissures=(), mouchete=0.0,
           pans=5, contour_c=CONTOUR, ecume=False, champ=None):
    """Un rocher de w × h px, comme ceux de la ferme (rochers.py, rocher) : `blocs` = [(cx, cy,
    rx, ry, haut)] des demi-ellipsoïdes (le champ de hauteurs est leur maximum), éclairé d'en haut
    à gauche, taillé en pans plats (un ton de `pal` par pan, des germes tous les `pans` px), une
    arête claire entre deux pans, des `fissures` [(x0, y0, x1, y1)], de la `mousse` (la part du
    dessus), de la `neige` (le dessus, à plat, au-dessus de cette part de sa hauteur : 0 sans
    neige), `mouille` px du bas mouillés (plus sombres ; `ecume` : un liseré d'écume au ras de
    l'eau), un `mouchete` (le grain du granit). Sans son ombre portée : le jeu la pose au soleil.
    → une image RGBA."""
    def hauteur(x, y):
        if champ:
            return champ(x, y)
        best = 0.0
        for cx, cy, rx, ry, hz in blocs:
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d < 1:
                best = max(best, hz * math.sqrt(1 - d))
        return best

    zmax = max(b[4] for b in blocs) if blocs else max(champ(x + 0.5, y + 0.5) for x in range(w) for y in range(h))
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    germes = []
    for gy in range(0, h + pans, pans):
        for gx in range(0, w + pans, pans):
            germes.append((gx + hasard(graine, gx, gy, 1) * (pans - 1) - pans / 2.5, gy + hasard(graine, gx, gy, 2) * (pans - 1) - pans / 2.5))
    pan, lumi, haut = {}, {}, {}
    for y in range(h):
        for x in range(w):
            z = hauteur(x + 0.5, y + 0.5)
            if z <= 0:
                continue
            dx = hauteur(x + 1.5, y + 0.5) - hauteur(x - 0.5, y + 0.5)
            dy = hauteur(x + 0.5, y + 1.5) - hauteur(x + 0.5, y - 0.5)
            n = norme((-dx / 2, -dy / 2, 1.0))
            k = min(range(len(germes)), key=lambda i: (germes[i][0] - x) ** 2 + (germes[i][1] - y) ** 2)
            pan[(x, y)] = k
            lumi.setdefault(k, []).append(max(0.0, sum(a * b for a, b in zip(n, L))) + min(1.0, z / 12) * 0.25)
            haut[(x, y)] = (z, n)
    ton = {k: sum(v) / len(v) for k, v in lumi.items()}
    bas = max((y for (x, y) in pan), default=h - 1)
    for (x, y), k in pan.items():
        z, n = haut[(x, y)]
        v = ton[k] - (0.2 if z < 1.6 else 0)
        i = max(0, min(len(pal) - 2, int(v * (len(pal) - 1.5))))
        if (pan.get((x, y - 1), k) != k or pan.get((x - 1, y), k) != k) and ton.get(pan.get((x, y - 1), k), 0) <= ton[k] + 0.05:
            i = min(len(pal) - 1, i + 1)
        if mouchete and hasard(graine + 7, x, y) < mouchete:
            i = max(0, min(len(pal) - 1, i + (1 if hasard(graine + 8, x, y) < 0.45 else -1)))
        c = pal[i]
        if mousse and n[2] > 0.82 and z > 3 and hasard(graine, x // 2, y // 2) < mousse:
            c = MOUSSE[2 if ton[k] > 0.8 else 1] if hasard(graine + 1, x, y) < 0.8 else MOUSSE[0]
        if neige and n[2] > 0.7 and z > zmax * neige - 0.4 * (hasard(graine + 3, x // 2, y) - 0.5) * zmax:
            c = NEIGE[4] if ton[k] > 0.85 else NEIGE[3] if ton[k] > 0.62 else NEIGE[2]
        if mouille and y > bas - mouille:
            c = clair(c, -0.32)
        px[x, y] = c + (255,)
    for x0, y0, x1, y1 in fissures:
        nn = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(nn + 1):
            x, y = round(x0 + (x1 - x0) * i / nn), round(y0 + (y1 - y0) * i / nn)
            if 0 <= x < w and 0 <= y < h and px[x, y][3] == 255 and px[x, y][:3] in pal:
                px[x, y] = pal[1] + (255,)
                if 0 <= y + 1 < h and px[x, y + 1][3] == 255 and px[x, y + 1][:3] in pal[3:]:
                    px[x, y + 1] = pal[6] + (255,)
    if ecume:
        # le ras de l'eau : un liseré d'écume sur le bas de la silhouette, coupé par endroits
        for x in range(w):
            ys = [y for y in range(h) if px[x, y][3] == 255]
            if ys and hasard(graine + 5, x) < 0.8:
                px[x, ys[-1]] = ECUME + (255,)
                if hasard(graine + 6, x) < 0.35 and ys[-1] - 1 >= 0:
                    px[x, ys[-1] - 1] = (196, 220, 236, 255)
    return avec_contour(im, contour_c)


def avec_contour(im, couleur):
    """Un contour d'un pixel autour du dessin (sur ce qui n'est pas opaque)."""
    w, h = im.size
    src = im.load()
    out = im.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 255:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and src[x + dx, y + dy][3] == 255 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                dst[x, y] = tuple(couleur[:3]) + (255,)
    return out


def ombre_sous(im, cx, cy, rx, ry, alpha=84, couleur=(14, 30, 12)):
    """Une ombre légère posée sous un petit dessin (sous lui : là où il est transparent), bord tramé."""
    w, h = im.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    o = out.load()
    for y in range(h):
        for x in range(w):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1 or (d > 0.55 and BAYER[y % 4][x % 4] < 8):
                continue
            o[x, y] = tuple(couleur) + (alpha,)
    out.alpha_composite(im)
    return out


def tas(w, h, cailloux, pal, graine, mousse=0.0, neige=0.0):
    """Un amas de cailloux (un éboulis, des galets) : chacun un petit rocher avec son contour,
    posés de l'arrière vers l'avant (`cailloux` : [(cx, cy, rx, ry, haut)])."""
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for k, (cx, cy, rx, ry, hz) in enumerate(sorted(cailloux, key=lambda c: c[1])):
        x0, y0 = int(cx - rx) - 2, int(cy - ry) - 2
        lw, lh = int(rx * 2) + 5, int(ry * 2) + 5
        p = pierre(lw, lh, [(cx - x0, cy - y0, rx, ry, hz)], pal, graine * 31 + k, mousse=mousse, neige=neige, pans=3)
        out.alpha_composite(p, (x0, y0))
    return out


# ---------- les grands rochers (des images, rangées selon leur pied) ----------

def rochers_moyens():
    """Le rocher d'une case (rocher) : 4 variantes, la pierre de la ferme."""
    out = []
    formes = [
        [(9, 11, 6.5, 5, 7), (13, 12, 4, 3.5, 4)],
        [(10, 10, 7, 5.5, 8), (5, 13, 3.5, 2.5, 3)],
        [(9, 11, 6, 5, 9), (11, 8, 4, 3.5, 9.5)],
        [(8, 12, 5.5, 4, 6), (14, 12, 4.5, 3.5, 5), (11, 9, 4, 3, 6)],
    ]
    fis = [[(8, 8, 10, 12)], [(11, 7, 9, 11)], [(8, 6, 9, 10)], [(12, 9, 13, 12)]]
    for k, (f, fi) in enumerate(zip(formes, fis)):
        im = pierre(20, 17, f, GRIS, 40 + k, mousse=0.12 if k == 1 else 0, fissures=fi)
        out.append((im, 10, 15))
    return out


def blocs_granit():
    """Le gros bloc de granit (bloc, deux cases de large) : 4 variantes, le pied au milieu de la case
    de gauche (x = 9 : une marge d'un pixel)."""
    out = []
    formes = [
        [(15, 17, 13, 9, 14), (24, 19, 8, 6, 9), (8, 21, 6, 4, 5)],
        [(17, 16, 14, 10, 16), (9, 20, 7, 5, 7)],
        [(13, 18, 11, 8, 12), (23, 15, 9, 8, 15), (27, 22, 5, 3.5, 4)],
        [(16, 18, 14, 8, 11), (12, 13, 8, 6, 13), (25, 21, 6, 4, 5)],
    ]
    fis = [[(13, 10, 16, 17), (22, 13, 25, 19)], [(16, 8, 14, 15), (20, 15, 25, 18)], [(22, 9, 20, 15), (11, 15, 14, 20)], [(12, 9, 15, 14), (20, 14, 22, 20)]]
    for k, (f, fi) in enumerate(zip(formes, fis)):
        im = pierre(34, 28, f, GRANIT, 60 + k, fissures=fi, mouchete=0.09, pans=6)
        out.append((im, 9, 26))
    return out


def rochers_moussus():
    """Le rocher moussu de la forêt (rocher_moussu, deux cases) : 3 variantes, plus rond, couvert
    de mousse sur le dessus, des fougères à son pied viennent de la végétation."""
    out = []
    formes = [
        [(15, 16, 12, 9, 12), (24, 19, 7, 5, 7)],
        [(16, 16, 13, 9, 11), (8, 20, 5, 4, 5), (22, 13, 7, 6, 12)],
        [(14, 17, 11, 8, 10), (22, 17, 9, 7, 11)],
    ]
    for k, f in enumerate(formes):
        im = pierre(34, 26, f, GRIS, 80 + k, mousse=0.62, fissures=[(14 + k, 17, 17 + k, 21)], pans=5)
        out.append((im, 9, 24))
    return out


def eboulis():
    """Un éboulis (eboulis, deux cases) : un amas de pierres tombées au pied d'une pente, les
    grosses en bas, les petites qui ont roulé autour."""
    out = []
    for k in range(3):
        r = random.Random(100 + k)
        cailloux = []
        for i in range(16):
            # un tas en dôme : plus haut au milieu, plus large en bas
            u = r.uniform(-1, 1)
            hy = r.uniform(0, 1) ** 0.8
            cx = 16 + u * (13 - 7 * hy)
            cy = 20 - hy * 9 + r.uniform(-1, 1)
            rr = r.uniform(2.2, 4.2) * (1.15 - 0.35 * hy)
            cailloux.append((cx, cy, rr, rr * 0.75, rr * 1.2))
        for i in range(5):
            cailloux.append((r.uniform(3, 30), r.uniform(19, 22), r.uniform(1.4, 2.2), r.uniform(1.1, 1.6), 2))
        im = tas(34, 26, cailloux, GRANIT if k < 2 else GRIS, 120 + k)
        out.append((im, 9, 23))
    return out


def pitons(neige=False):
    """Une aiguille de roche (piton, piton_neige) : trois ou quatre colonnes de granit serrées,
    de plus en plus hautes et minces vers le sommet, décalées (pas de symétrie), taillées en
    grands pans ; la seconde sorte a de la neige sur sa pointe et ses replats."""
    out = []
    n = 2 if neige else 3
    for k in range(n):
        g = 140 + k + (10 if neige else 0)
        r = random.Random(g)
        w, h = 26, 52 + k * 5
        pied = h - 4
        cx = 13
        s0 = r.choice((-1, 1))
        blocs = [(cx + s0 * 3, pied - 4, 8, 4.5, 7), (cx - s0 * 4, pied - 3, 5, 3.5, 5)]
        y, rx, z, dx = pied - 12, 7.5, 16, 0.0
        while y > 10:
            dx += r.uniform(-1.6, 1.6)
            ry = r.uniform(7, 10)
            blocs.append((cx + dx, y, rx, ry, z))
            if r.random() < 0.5 and y > pied - 24:
                blocs.append((cx + dx + s0 * rx * 0.7, y + ry * 0.5, rx * 0.55, ry * 0.6, z * 0.7))
            y -= ry * 0.9
            rx *= 0.8
            z += 9
        blocs.append((cx + dx * 1.2, max(5.0, y + 2), max(2.2, rx * 0.8), 5.5, z))
        fis = []
        for yy in range(pied - 12, 10, -9):
            fis.append((cx - 4 + r.randint(-1, 1), yy, cx + 3 + r.randint(-1, 1), yy + r.randint(0, 2)))
        im = pierre(w, h, blocs, GRANIT, g, fissures=fis, mouchete=0.08, pans=6)
        if neige:
            # la neige : la pointe, puis les replats éclairés
            q = im.load()
            haut = min(y for y in range(h) for x in range(w) if q[x, y][3])
            for y in range(h):
                for x in range(w):
                    c = q[x, y]
                    if c[3] < 255 or c[:3] == CONTOUR:
                        continue
                    i = GRANIT.index(c[:3]) if c[:3] in GRANIT else 0
                    if (y < haut + 8 and i >= 3) or (i >= 6 and hasard(g, x, y) < 0.75):
                        q[x, y] = (NEIGE[4] if i >= 5 else NEIGE[3]) + (255,)
        out.append((im, 13, pied))
    return out


def rochers_neige():
    """Le rocher enneigé (rocher_neige) : 3 variantes, du granit couvert de neige sur le dessus."""
    out = []
    formes = [
        [(10, 12, 7, 5.5, 8), (15, 13, 4, 3.5, 5)],
        [(10, 12, 8, 5, 7), (5, 14, 3.5, 2.5, 3)],
        [(9, 12, 6, 5, 9), (12, 9, 4.5, 4, 10), (15, 14, 3.5, 2.5, 3)],
    ]
    for k, f in enumerate(formes):
        im = pierre(21, 19, f, GRANIT, 170 + k, neige=0.35, mouchete=0.08)
        out.append((im, 10, 17))
    return out


def sapins_neige():
    """Le sapin enneigé (sapin_neige) : le sapin de la montagne (vegetation.py, sapin), la neige
    posée sur le dessus de chaque étage de branches."""
    out = []
    for k, (w, h) in enumerate([(30, 48), (26, 42), (34, 54)]):
        t, fx, fy = V.sapin(w, h, V.RAMPE_SAPIN, 700 + k * 7, etages=6 if h > 44 else 5, asym=0.1 * (k - 1), tronc_h=5)
        im = t.image()
        px = im.load()
        rampe = V.RAMPE_SAPIN
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if p[3] < 200 or tuple(p[:3]) in (ECORCE[:3] for ECORCE in V.ECORCE):
                    continue
                if y > fy - 6:
                    continue
                dessus = y == 0 or px[x, y - 1][3] < 200 or tuple(px[x, y - 1][:3]) == tuple(V.assombrir(rampe[0], 0.85))
                # (la neige : le bord du dessus de chaque branche, et les tons clairs, éclairés)
                lum = rampe.index(tuple(p[:3])) if tuple(p[:3]) in rampe else -1
                if dessus and lum >= 2:
                    px[x, y] = NEIGE[4 if x < fx else 3] + (255,)
                elif lum >= 6 and hasard(k, x, y) < 0.7:
                    px[x, y] = NEIGE[3 if x < fx else 2] + (255,)
                elif lum == 5 and hasard(k + 9, x, y) < 0.3:
                    px[x, y] = NEIGE[2] + (255,)
        out.append((im, fx, fy))
    return out


def rochers_mer():
    """Le rocher dans l'eau (rocher_mer) : 4 variantes, de la pierre mouillée, sombre en bas, un
    liseré d'écume au ras de l'eau (l'écume qui bat autour est à part : ecume)."""
    out = []
    formes = [
        [(10, 11, 7, 5.5, 8), (15, 13, 4, 3, 4)],
        [(9, 11, 6, 6, 10), (13, 13, 4.5, 3, 4)],
        [(11, 12, 8, 5, 6), (5, 13, 3.5, 2.5, 3), (15, 10, 4, 3, 6)],
        [(10, 11, 6.5, 5, 9)],
    ]
    for k, f in enumerate(formes):
        im = pierre(22, 18, f, GRIS, 200 + k, mouille=4, ecume=True, mousse=0.18 if k == 2 else 0,
                    fissures=[(9, 7, 11, 11)] if k != 2 else [])
        out.append((im, 11, 15))
    return out


def ecumes():
    """L'écume qui bat autour d'un rocher dans l'eau : 4 images d'un anneau d'écume brisé qui
    s'écarte et revient (posées sous le rocher, la scène les fait tourner)."""
    out = []
    w, h = 34, 16
    for k in range(4):
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = im.load()
        R = 10.5 + [0, 1.5, 3, 1.5][k] * (1 if k != 3 else 0.6)
        ry = 4.4 + [0, 0.6, 1.2, 0.4][k]
        fort = [235, 210, 150, 225][k]
        for y in range(h):
            for x in range(w):
                d = math.sqrt(((x + 0.5 - 17) / R) ** 2 + ((y + 0.5 - 8) / ry) ** 2)
                if 0.84 < d < 1.08:
                    a = math.atan2(y + 0.5 - 8, x + 0.5 - 17)
                    if math.sin(a * 5 + k * 2.1) + 0.6 * math.sin(a * 11 - k * 1.7) > -0.3 - 0.2 * (k == 0):
                        px[x, y] = ECUME + (fort if d < 1.0 else fort // 2,)
                elif d <= 0.84 and hasard(k, x, y) < 0.1 + 0.15 * (1 - d):
                    px[x, y] = (210, 232, 246, 140)
        out.append((im, 17, 10))
    return out


def epaves():
    """L'épave (epave) : une barque échouée vue de haut, penchée sur le sable : son flanc de
    planches vers la mer (en bas), le plat-bord clair tout autour, le fond de planches et ses
    membrures, deux bancs, un trou ; l'arrière cassé, à moitié pris dans le sable ; un bout de mât
    couché. 2 variantes (la proue à gauche ou à droite). 3 cases sur 2 : le pied au milieu de la
    case avant gauche (x = 9 : une marge d'un pixel)."""
    out = []
    SABLE = [(196, 168, 116), (214, 186, 132), (230, 206, 156)]
    for k in range(2):
        w, h = 52, 36
        t = V.Toile(w, h)
        sens = 1 if k == 0 else -1
        cx, cy, rx, ry = 26, 18, 22, 9
        def forme(x, y, gonfle=0.0):
            u = (x + 0.5 - cx) / (rx + gonfle) * sens          # -1 l'arrière, 1 la proue
            if abs(u) > 1:
                return None
            larg = (ry + gonfle) * (1 - max(0.0, u) ** 2.4) ** 0.6 * (1 - 0.15 * max(0.0, -u) ** 3)
            v = (y + 0.5 - cy) / max(0.2, larg)
            return (u, v) if abs(v) <= 1 else None
        # le flanc vers la mer : la coque vue de côté, sous le plat-bord (de bas en haut, 5 px)
        for x in range(w):
            for y in range(h):
                f = forme(x, y - 5)
                if f is None or forme(x, y) is not None and forme(x, y)[1] < 0.9:
                    continue
                u, v = f
                if v < 0.2:
                    continue
                j = (y - int(cy + 5)) % 2
                t.pose(x, y, BOIS[2] if j else BOIS[1])
        for x in range(w):
            for y in range(h):
                f = forme(x, y)
                if f is None:
                    continue
                u, v = f
                bord = forme(x, y, -2.2) is None
                if bord:
                    c = BOIS[5] if v < 0 else BOIS[4]
                else:
                    # le fond : des planches dans la longueur, des membrures en travers
                    c = BOIS[1] if (y % 3 == 0) else BOIS[2]
                    xx = round((x + 0.5 - cx) * sens)
                    if xx % 6 == 0:
                        c = BOIS[3]
                    if v < -0.55:
                        c = BOIS[0]                       # l'ombre du bord, au fond
                    if xx in (-6, -5, 6, 7) and abs(v) < 0.9:
                        c = BOIS[4] if xx in (-6, 6) else BOIS[3]   # les bancs
                t.pose(x, y, c)
        # un trou dans le fond, et l'arrière cassé : le plat-bord rompu, des membrures nues
        for x in range(w):
            for y in range(h):
                f = forme(x, y)
                if f is None:
                    continue
                u, v = f
                if 0.18 < u < 0.38 and 0.0 < v < 0.5:
                    t.pose(x, y, (42, 30, 22) if v < 0.3 else BOIS[0])
                if u < -0.62:
                    # le sable a recouvert l'arrière
                    ondule = 0.08 * math.sin(y * 1.3 + x)
                    if u < -0.72 + ondule:
                        t.pose(x, y, SABLE[1] if hasard(k, x, y) < 0.7 else SABLE[0])
                    elif (round((x + 0.5 - cx) * sens) % 3) and not forme(x, y, -2.2) is None:
                        t.pose(x, y, SABLE[0])
        for j in range(3):
            xx = round(cx - sens * (14 + j * 2.5))
            for d in range(4 + j):
                t.pose(xx, int(cy - 9 - d + j), BOIS[4])
                t.pose(xx + sens, int(cy - 9 - d + j), BOIS[1])
        # le bout de mât couché en travers, gris de sel, un bout de corde
        for d in range(24):
            x = round(cx - sens * 10 + sens * d)
            y = int(cy - 3 + d * 0.35)
            t.pose(x, y, BOIS_GRIS[4])
            t.pose(x, y + 1, BOIS_GRIS[2])
        for d in range(4):
            t.pose(round(cx + sens * 2) + (d % 2), int(cy) + d, (206, 182, 128))
        # du sable poussé contre le flanc, côté terre
        for x in range(w):
            for y in range(h):
                if t.a(x, y):
                    continue
                f = forme(x, y, 2.2)
                if f and f[1] < 0 and hasard(k + 4, x, y) < 0.55:
                    t.pose(x, y, SABLE[2] if hasard(k + 5, x, y) < 0.5 else SABLE[1])
        V.contour(t, (40, 28, 18))
        im = t.image()
        pied = h - 4
        out.append((im, 9, pied))
    return out


# ---------- les falaises : des colonnes de 16 px ----------

PERIODE = 48          # la face des falaises : une texture de 48 px de large qui se répète
LIP = 5               # le rebord, au-dessus de la face


def face_texture(pal, graine, haut=44):
    """La face d'une falaise : des pans de roche irréguliers (des germes semés au hasard, un peu
    étirés en largeur), chacun son ton, l'arête du dessus et du côté gauche éclairée, le dessous
    dans l'ombre ; des strates (une corniche claire et son ombre, toutes les 14 px, qui ondulent et
    se cassent par endroits) ; le bas dans l'ombre du sol. Une texture de PERIODE px de large qui se
    répète (tout y est lu modulo PERIODE). → {(x, v): couleur} (v : la hauteur au-dessus du pied)."""
    r = random.Random(graine)
    n = PERIODE * (haut + 8) // 52
    germes = [(r.uniform(0, PERIODE), r.uniform(-4, haut + 4), r.random()) for _ in range(n)]

    def pan(x, v):
        best, k = 1e9, 0
        for i, (gx, gy, _) in enumerate(germes):
            dx = abs(x + 0.5 - gx)
            dx = min(dx, PERIODE - dx)
            d = dx * dx + ((v + 0.5 - gy) * 1.5) ** 2
            if d < best:
                best, k = d, i
        return k

    def strate(x, j):
        # la hauteur de la j-ième corniche à la colonne x (elle ondule d'un pixel), ou None (cassée)
        if hasard(graine, j, (x // 5) % (PERIODE // 5 + 1)) < 0.18 and x // 5 < PERIODE // 5:
            return None
        return 6 + 14 * j + round(1.1 * math.sin(2 * math.pi * x / PERIODE * 2 + j * 1.7))

    pans = {(x, v): pan(x, v) for x in range(PERIODE) for v in range(-1, haut + 1)}
    out = {}
    for v in range(haut):
        for x in range(PERIODE):
            k = pans[(x, v)]
            u = germes[k][2]
            i = 3 + (1 if u > 0.7 else -1 if u < 0.25 else 0) + (1 if v > 24 and u > 0.4 else 0)
            if pans[(x, v + 1)] != k:
                i = min(7, i + 1 + (u > 0.5))        # l'arête du dessus du pan, éclairée
            elif pans[(x, v - 1)] != k:
                i = max(1, i - 2)                    # le dessous, dans l'ombre
            elif pans[((x - 1) % PERIODE, v)] != k:
                i = min(7, i + 1)                    # le côté gauche du pan
            elif pans[((x + 1) % PERIODE, v)] != k:
                i = max(1, i - 1)
            elif hasard(graine, x, v) < 0.07:
                i = max(1, i - 1)                    # le grain de la roche
            for j in range(4):
                sv = strate(x, j)
                if sv is None:
                    continue
                if v == sv:
                    i = 6                            # la corniche
                elif v == sv - 1:
                    i = 1                            # son ombre
                elif v == sv - 2:
                    i = max(1, i - 1)
            if v < 3:
                i = max(0, i - (3 - v) // 2 - 1)    # le bas, dans l'ombre du sol
            out[(x, v)] = pal[i]
    return out


FACES = {}


def paroi(rebord, classe, bouts, k):
    """Une colonne de falaise : 16 px de large, la tranche k (0, 1, 2) de la texture de la face (le
    jeu prend k = colonne modulo 3 : des colonnes voisines se raccordent), haute de 14 × `classe`
    px, son rebord en haut (« roche », « herbe », « neige »), ses arêtes là où la bande s'arrête
    (`bouts` = gauche + 3 × droite, chacun 0 : la bande continue, 1 : une marche, 2 : l'arête).
    → (image, px, py)."""
    pal = GRANIT if rebord == 'neige' else FALAISE
    if rebord not in FACES:
        FACES[rebord] = face_texture(pal, 1009 if rebord == 'neige' else 77)
    tex = FACES[rebord]
    graine = classe * 131 + bouts * 17 + k * 7 + {'roche': 0, 'herbe': 1, 'neige': 2}[rebord] * 1009
    H = 14 * classe
    w, h = 16, LIP + H + 1
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    gauche, droite = bouts % 3, bouts // 3
    X0 = 16 * k                                  # la tranche de la texture
    for y in range(LIP, LIP + H):
        v = LIP + H - 1 - y
        for x in range(w):
            px[x, y] = tex[(X0 + x, v)] + (255,)
    # le pied : une ligne sombre (le contact avec le sol)
    for x in range(w):
        px[x, LIP + H] = pal[0] + (255,)
    # le rebord (son profil ne dépend que de la colonne de la texture : il se raccorde aussi)
    for x in range(w):
        X = X0 + x
        bosse = 1 if hasard(rebord == 'neige', 11, X // 3) < 0.4 else 0
        if rebord == 'roche':
            px[x, LIP - 1] = pal[5] + (255,)
            px[x, LIP - 2] = pal[7] + (255,)
            if bosse:
                px[x, LIP - 3] = pal[6] + (255,)
        elif rebord == 'herbe':
            pend = int(hasard(12, X) * 4) if hasard(13, X // 2) < 0.6 else 0
            px[x, LIP - 3] = HERBE[3] + (255,)
            px[x, LIP - 2] = HERBE[2] + (255,)
            px[x, LIP - 1] = HERBE[1] + (255,)
            if bosse:
                px[x, LIP - 4] = HERBE[4] + (255,)
            for d in range(pend):
                px[x, LIP + d] = (HERBE[1] if d < pend - 1 else HERBE[0]) + (255,)
        else:
            glacon = int(2 + hasard(14, X) * 5) if hasard(15, X) < 0.3 else 0
            px[x, LIP - 3] = NEIGE[4] + (255,)
            px[x, LIP - 2] = NEIGE[3] + (255,)
            px[x, LIP - 1] = NEIGE[2] + (255,)
            if bosse:
                px[x, LIP - 4] = NEIGE[4] + (255,)
            # des glaçons qui pendent du rebord
            for d in range(min(glacon, H - 2)):
                px[x, LIP + d] = (GLACE[2] if d < glacon - 2 else GLACE[1] if d < glacon - 1 else GLACE[0]) + (255,)
            # de la neige sur les arêtes claires des pans, par endroits
            for y in range(LIP + 3, LIP + H - 3):
                c = px[x, y][:3]
                if c == pal[7] and hasard(16, X, y) < 0.5:
                    px[x, y] = NEIGE[3] + (255,)
    # les bouts : là où la bande s'arrête (2), l'arête de la falaise (éclairée à gauche, dans
    # l'ombre à droite), le rebord arrondi ; une marche (1 : la voisine commence une case plus
    # haut), un pli plus discret, sans contour
    if gauche == 2:
        for y in range(h):
            px[0, y] = (0, 0, 0, 0)
            if y > LIP - 1 and px[1, y][3]:
                px[1, y] = clair(px[1, y][:3], 0.3) + (255,)
        for y in range(LIP):
            px[1, y] = (0, 0, 0, 0)
    elif gauche == 1:
        for y in range(LIP, h - 1):
            px[0, y] = clair(px[0, y][:3], 0.22) + (255,)
    if droite == 2:
        for y in range(h):
            px[15, y] = (0, 0, 0, 0)
            if px[14, y][3] and y >= LIP:
                px[14, y] = clair(px[14, y][:3], -0.4) + (255,)
            if px[13, y][3] and y >= LIP:
                px[13, y] = clair(px[13, y][:3], -0.15) + (255,)
        for y in range(LIP - 1):
            px[14, y] = (0, 0, 0, 0)
    elif droite == 1:
        for y in range(LIP, h - 1):
            px[15, y] = clair(px[15, y][:3], -0.3) + (255,)
    # le contour : en haut et aux arêtes (la neige, d'un bleu sombre)
    cc = NEIGE[0] if rebord == 'neige' else CONTOUR
    pleine = im.copy()
    pp = pleine.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            voisins = [(0, 1), (0, -1)] + ([(1, 0)] if x < w - 1 else []) + ([(-1, 0)] if x > 0 else [])
            if any(0 <= y + dy < h and pp[x + dx, y + dy][3] == 255 for dx, dy in voisins):
                px[x, y] = (cc if y < LIP + 1 else CONTOUR) + (255,)
    return im, 8, LIP + H


# ---------- les petites pièces (peintes dans le sol de leur région) ----------

def petites_pierres(mousse=False):
    """Des pierres (pierres, pierres_moussues) : une à trois, posées dans l'herbe ou la terre."""
    out = []
    n = 3 if mousse else 6
    for k in range(n):
        r = random.Random(300 + k + (50 if mousse else 0))
        cailloux = []
        for i in range(1 + k % 3):
            rr = r.uniform(1.8, 3.2) if i else r.uniform(2.6, 3.8)
            cx = 6 + r.uniform(-3, 3) * (i > 0) + i * 2.5
            cailloux.append((max(rr + 1.5, min(12.5 - rr, cx)), 7 + r.uniform(-1.5, 1), rr, rr * 0.75, rr * 1.4))
        im = tas(14, 11, cailloux, GRIS, 310 + k, mousse=0.5 if mousse else 0)
        out.append((ombre_sous(im, 7.5, 8.6, 5.5, 1.8), 7, 9))
    return out


def galets():
    """Des galets (galets) : de petits cailloux ronds, polis, de plusieurs couleurs."""
    out = []
    couleurs = [GRIS, GRANIT, [clair(c, 0.1) for c in GRIS], [(c[0] - 6, c[1] + 2, c[2] + 10) for c in GRANIT]]
    for k in range(6):
        r = random.Random(400 + k)
        im = Image.new('RGBA', (14, 10), (0, 0, 0, 0))
        for i in range(2 + k % 3):
            rr = r.uniform(1.4, 2.4)
            cx, cy = r.uniform(3.5, 10.5), r.uniform(4.5, 7)
            g = pierre(9, 8, [(4.5, 4, rr, rr * 0.75, rr * 1.2)], couleurs[(k + i) % 4], 410 + k * 7 + i, pans=9)
            im.alpha_composite(g, (round(cx - 4.5), round(cy - 4)))
        out.append((ombre_sous(im, 7, 7.6, 6, 1.6, alpha=60), 7, 8))
    return out


def coquillages():
    """Des coquillages (coquillages) : une coquille Saint-Jacques, un bigorneau, une moule, un
    couteau, une coque rose, un petit tas mêlé ; sur le sable mouillé."""
    out = []
    dessins = [
        # (pixels : lettre → couleur)
        ['.ccc.', 'cCcCc', 'cCcCc', '.cdc.', '..d..'],               # Saint-Jacques
        ['.bb.', 'bBbb', 'bbBb', '.bbs'],                             # bigorneau
        ['.mmm.', 'mMmmm', '.mmm.'],                                  # moule
        ['kkkkkkk', 'KKKKKKk'],                                       # couteau
        ['.rr.', 'rRrr', 'rrRr', '.rr.'],                             # coque rose
        ['cc..mm', 'Cc.mMm', '..rr..', '.rRr..'],                     # un petit tas
    ]
    pal = {'c': (236, 222, 196), 'C': (206, 184, 150), 'd': (176, 150, 116), 'b': (150, 110, 76), 'B': (196, 160, 116),
           's': (110, 80, 56), 'm': (52, 56, 86), 'M': (96, 104, 140), 'k': (218, 206, 178), 'K': (170, 152, 122),
           'r': (232, 170, 160), 'R': (250, 210, 196)}
    for k, d in enumerate(dessins):
        w, h = 12, 9
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = im.load()
        x0, y0 = (w - len(d[0])) // 2, h - 2 - len(d)
        for j, ligne in enumerate(d):
            for i, ch in enumerate(ligne):
                if ch != '.':
                    px[x0 + i, y0 + j] = pal[ch] + (255,)
        im = avec_contour(im, (96, 76, 52))
        out.append((ombre_sous(im, w / 2, h - 2, 4, 1.2, alpha=50, couleur=(70, 50, 24)), w // 2, h - 2))
    return out


def etoiles_mer():
    """Des étoiles de mer (etoile_mer) : cinq bras, orange, rouge ou violette, des points clairs."""
    out = []
    for k, (c, cc) in enumerate([((226, 112, 52), (250, 170, 100)), ((196, 58, 52), (236, 120, 100)), ((150, 82, 150), (200, 140, 196))]):
        w = h = 11
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = im.load()
        for y in range(h):
            for x in range(w):
                dx, dy = x + 0.5 - 5.5, (y + 0.5 - 5.5) * 1.25
                rr = math.hypot(dx, dy)
                a = math.atan2(dy, dx) + k * 0.4
                bras = 1.6 + 3.4 * max(0.0, math.cos(a * 5 / 2) ** 8)
                if rr < bras and rr < 5.2:
                    px[x, y] = (cc if (x + y) % 3 == 0 and rr > 1.5 else c) + (255,)
        im = avec_contour(im, (96, 40, 24))
        out.append((ombre_sous(im, 5.5, 7.5, 4.5, 1.5, alpha=50, couleur=(70, 50, 24)), 5, 8))
    return out


def algues():
    """Des algues (algues) échouées sur le sable mouillé : des lanières vertes ou brunes."""
    out = []
    for k, pal in enumerate([[(36, 72, 34), (60, 108, 48), (96, 140, 62)], [(70, 56, 24), (104, 86, 36), (140, 120, 56)],
                             [(36, 72, 34), (60, 108, 48), (96, 140, 62)], [(52, 70, 30), (84, 104, 40), (120, 140, 60)]]):
        r = random.Random(500 + k)
        w, h = 16, 8
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = im.load()
        for j in range(3 + k % 2):
            y0 = r.uniform(2, 5)
            x0 = r.uniform(1, 4)
            ph = r.uniform(0, 6)
            for d in range(r.randint(8, 12)):
                x = round(x0 + d)
                y = round(y0 + math.sin(d * 0.8 + ph) * 1.1)
                if 0 <= x < w and 0 <= y < h:
                    px[x, y] = pal[1 + (d + j) % 2] + (255,)
        im = avec_contour(im, (30, 36, 18))
        out.append((im, 8, 5))
    return out


def congeres():
    """Des congères (congere) : de la neige poussée par le vent contre une bosse, basse et longue,
    sa crête nette côté vent (en haut, éclairée), son ombre bleue dessous ; quelques cailloux qui
    en sortent."""
    out = []
    for k in range(4):
        r = random.Random(600 + k)
        w, h = 24, 9
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = im.load()
        L0 = r.uniform(7, 9)
        for x in range(1, w - 1):
            u = (x - w / 2) / (w / 2 - 1)
            ep = max(0.0, (1 - u * u)) ** 0.6 * (3.2 + 0.8 * math.sin(x * 0.7 + k))
            crete = round(6 - ep)
            for y in range(crete, 7):
                c = NEIGE[3] if y == crete else NEIGE[4] if y < crete + 2 else NEIGE[2] if y < 6 else NEIGE[1]
                px[x, y] = c + (255,)
            if crete <= 5:
                px[x, crete - 1] = NEIGE[1] + (255,)       # le liseré de la crête
        for j in range(k % 3):
            cx = r.randint(6, 18)
            px[cx, 5] = GRANIT[2] + (255,)
            px[cx + 1, 5] = GRANIT[4] + (255,)
        out.append((ombre_sous(im, w / 2, 7.2, w / 2 - 1, 1.4, alpha=80, couleur=(110, 130, 170)), w // 2, 7))
    return out


# ---------- la planche ----------

def charge_sortes():
    with open(DONNEES, encoding='utf-8') as f:
        d = json.load(f)
    return d['ROCHES']['SORTES']


def dessins():
    """{ sorte: [(image, px, py)…] }, et « ecume »."""
    out = {
        'rocher': rochers_moyens(),
        'bloc': blocs_granit(),
        'rocher_moussu': rochers_moussus(),
        'eboulis': eboulis(),
        'piton': pitons(),
        'piton_neige': pitons(neige=True),
        'rocher_neige': rochers_neige(),
        'sapin_neige': sapins_neige(),
        'rocher_mer': rochers_mer(),
        'epave': epaves(),
        'galets': galets(),
        'pierres': petites_pierres(),
        'pierres_moussues': petites_pierres(mousse=True),
        'coquillages': coquillages(),
        'etoile_mer': etoiles_mer(),
        'algues': algues(),
        'congere': congeres(),
    }
    for nom, rebord in (('paroi', 'roche'), ('paroi_herbe', 'herbe'), ('paroi_neige', 'neige')):
        out[nom] = [paroi(rebord, classe, bouts, k) for classe in (1, 2, 3) for bouts in range(9) for k in range(3)]
    out['ecume'] = ecumes()
    return out


def planche(sortes, d):
    """Range les dessins par rangées, et la table des images (comme vegetation.py)."""
    items = []
    noms = [s['nom'] for s in sortes] + ['ecume']
    for s in sortes:
        assert len(d.get(s['nom'], [])) == s['variantes'], f"{s['nom']} : {len(d.get(s['nom'], []))} images dessinées, il en faut {s['variantes']} (data/monde.json)"
    for nom in noms:
        for k, (im, px, py) in enumerate(d[nom]):
            items.append((nom, k, im, px, py))
    x = y = haut = 0
    places = {}
    for nom, k, im, px, py in items:
        if x + im.width > LARGEUR_PLANCHE:
            x, y, haut = 0, y + haut + 1, 0
        places[(nom, k)] = (x, y)
        x += im.width + 1
        haut = max(haut, im.height)
    out = Image.new('RGBA', (LARGEUR_PLANCHE, y + haut), (0, 0, 0, 0))
    table = {}
    for nom, k, im, px, py in items:
        x, y = places[(nom, k)]
        out.alpha_composite(im, (x, y))
        table.setdefault(nom, []).append([x, y, im.width, im.height, px, py])
    return out, table


def main():
    sortes = charge_sortes()
    d = dessins()
    img, table = planche(sortes, d)
    img.save(SORTIE)
    with open(SORTIE_JSON, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/roches.png : {img.width} × {img.height}, {sum(len(v) for v in table.values())} images')
    if '--apercu' in sys.argv:
        apercu(img, d)


def apercu(img, d):
    """La planche agrandie (à côté des rochers de la ferme), et des falaises montées colonne par
    colonne : une bande droite, une marche, ses deux bouts, au bord de l'eau et sur la neige."""
    fond = Image.new('RGBA', img.size, (124, 116, 104, 255))
    fond.alpha_composite(img)
    ferme = Image.open(os.path.join(ASSETS, 'rochers.png')).convert('RGBA')
    out = Image.new('RGBA', (fond.width + 140, max(fond.height, 40)), (132, 165, 52, 255))
    out.alpha_composite(ferme, (4, 4))
    out.alpha_composite(fond, (140, 0))
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_roches.png'))
    # les falaises : (rebord, sol du dessus, sol du dessous, profil de la bande : [(bas, haut)…])
    scene = Image.new('RGBA', (3 * 16 * 14 + 40, 150), (40, 40, 40, 255))
    for j, (rebord, dessus, dessous) in enumerate([('roche', (114, 104, 95), (36, 90, 150)), ('herbe', (132, 169, 60), (223, 193, 136)), ('neige', (234, 240, 249), (138, 130, 120))]):
        ox = 8 + j * (16 * 14 + 8)
        bas = [7, 7, 7, 7, 8, 8, 8, 7, 7, 6, 6, 6, 7, 7]
        haut = [3, 3, 2, 3, 3, 4, 4, 4, 4, 3, 3, 3, 3, 3]
        for c in range(14):
            for r in range(9):
                col = dessus if r < bas[c] else dessous
                for y in range(16):
                    for x in range(16):
                        scene.putpixel((ox + c * 16 + x, 4 + r * 16 + y), col + (255,))
        for c in range(13):
            n = bas[c] - haut[c]
            classe = max(1, min(3, n))
            g = 2 if c == 0 or bas[c - 1] < bas[c] - 1 else 1 if bas[c - 1] < bas[c] else 0
            dr = 2 if c == 12 or bas[c + 1] < bas[c] - 1 else 1 if bas[c + 1] < bas[c] else 0
            im, px, py = d[{'roche': 'paroi', 'herbe': 'paroi_herbe', 'neige': 'paroi_neige'}[rebord]][((classe - 1) * 9 + g + 3 * dr) * 3 + c % 3]
            fy = 4 + bas[c] * 16 - (6 if dessous[2] > 140 else 2)
            scene.alpha_composite(im, (ox + c * 16 + 8 - px, fy - py))
    scene.resize((scene.width * 3, scene.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_parois.png'))
    print('apercu_roches.png, apercu_parois.png')


if __name__ == '__main__':
    main()
