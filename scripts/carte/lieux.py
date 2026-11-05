# Les lieux du grand monde qui ont leur dessin (docs/grand-monde.md, étape 6 : fiche 6b) : l'entrée
# des grottes de la montagne et le petit décor des coins de pêche, dans le style des rochers et des
# falaises de la fiche 5c (scripts/carte/roches.py : vue de haut à 45°, lumière en haut à gauche,
# pierre taillée en pans plats, contour sombre d'un pixel) et du bois de l'épave.
#
#   python3 scripts/carte/lieux.py            écrit assets/lieux_monde.png et assets/lieux_monde.json
#   python3 scripts/carte/lieux.py --apercu   écrit aussi apercu_lieux.png (la planche agrandie, chaque
#                                             dessin posé sur son sol)
#
# Relancer le script redonne la même image (tout le hasard est tiré de clés fixes).
#
# Les sortes et leur nombre de variantes sont ceux de data/monde.json (LIEUX.SORTES) : le jeu y lit
# où les poser (js/engine/monde-lieux.js) ; la planche et sa table ont la forme de celles des rochers
# (assets/lieux_monde.json : { "sorte": [[x, y, l, h, px, py]…] }, le rectangle dans la planche et le
# pied, le point du dessin posé au sol).
#
#   entree_grotte   la bouche d'une grotte : un éperon de granit (la roche de la montagne), sa face
#                   en strates comme les falaises, une arche noire au milieu du bas, des éboulis au
#                   pied ; 0 : nu, 1 : le dessus des pitons enneigé (haut dans la montagne). Le pied : le milieu
#                   du bas de l'arche (la case de l'entrée, devant laquelle on se tient).
#   ponton          un ponton de planches qui avance sur l'eau depuis la rive (trois cases), ses pieux,
#                   son bord : 0 vers le nord, 1 vers le sud, 2 vers l'ouest, 3 vers l'est. Le pied :
#                   le milieu de son bout du côté de la rive (sur la limite de la case de la rive).
#   piquets         deux piquets de bois plantés sur la rive, une nasse d'osier et un filet qui sèche
#                   entre eux (au bord d'une rivière, ou d'une eau trop étroite pour un ponton).
#
# Le lieu du récit qui est un dessin (docs/recit/bible.md ; lieux.recit du plan, monde-gen.js ; la cabane de
# Johnny et l'atelier de Frida sont bâtis en blocs, comme les maisons des hameaux : monde-hameaux.js) :
#   epave           l'épave de Johnny : la coque d'un voilier couchée sur le sable, ses membrures à nu,
#                   le mât cassé, un lambeau de voile.
#   cale            la cale du bac, aux Mouettes (le récit : la seule porte vers Cadolon, par où la famille
#                   est arrivée) : une jetée de pierre de cinq cases qui avance dans la mer depuis la rive,
#                   ses bittes d'amarrage, et le bac amarré le long de son bout (un bateau ponté, sa cabine,
#                   ses bouées) ; 0 vers le nord, 1 vers le sud, 2 vers l'ouest, 3 vers l'est. Le pied :
#                   comme le ponton, le milieu du bout de la jetée du côté de la rive.
#
# Les secrets du monde (D-2, docs/phase-4.md ; lieux.secrets du plan, monde-gen.js) :
#   ruine           de vieux murs de pierre écroulés, la mousse sur leur faîte, un bloc tombé devant ;
#                   0 : la pierre grise (prairie, lande), 1 : plus moussue (forêt).
#   cairn           un tas de pierres posées une à une, en cône, une pierre plate au sommet.
#   arbre_ancien    un arbre immense, son houppier large et sombre, un tronc épais aux racines à nu.
#   belvedere       une dalle de roche plate, une table d'orientation de pierre sur son pilier.
#   pierre_levee    un menhir dressé, gris, piqué de lichen, une touffe d'herbe à son pied.
# Le pied : le milieu du bas (la case du secret).
import json
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scripts/carte : roches, rochers
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, hasard  # noqa: E402
from rochers import CONTOUR  # noqa: E402
import roches as R  # noqa: E402

SORTIE = os.path.join(ASSETS, 'lieux_monde.png')
SORTIE_JSON = os.path.join(ASSETS, 'lieux_monde.json')
DONNEES = os.path.join(ROOT, 'data', 'monde.json')
LARGEUR_PLANCHE = 256

NOIR = [(10, 8, 9), (20, 16, 16), (32, 26, 25), (46, 39, 36)]
OSIER = [(78, 56, 30), (118, 88, 48), (160, 126, 74), (196, 164, 110)]
FILET = (200, 196, 176)


# ---------- l'entrée d'une grotte ----------

def entree(neige):
    """L'éperon de roche et sa bouche : 56 × 50 px. La masse : des blocs de granit inégaux (le
    champ de hauteurs des rochers : un piton à gauche, une épaule à droite), la face avant en
    strates (la texture des falaises, roches.face_texture) qui suit le bas de la masse, l'arche
    noire au milieu du bas (de plus en plus sombre vers le fond, son linteau éclairé, deux dents de
    roche qui pendent), des éboulis de chaque côté du pied. neige : le dessus des pitons enneigé."""
    w, h = 56, 50
    blocs = [(22, 14, 12, 12, 15), (34, 17, 13, 11, 12), (13, 22, 10, 11, 9), (45, 23, 10, 10, 8), (27, 25, 21, 9, 8),
             (17, 8, 6, 7, 13), (40, 11, 7, 7, 10)]
    im = R.pierre(w, 34, blocs, R.GRANIT, graine=601 + neige, neige=0.72 if neige else 0.0, mouchete=0.14, pans=5,
                  fissures=((12, 18, 16, 27), (41, 16, 44, 24)))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(im, (0, 0))
    px = out.load()
    # la face avant : une bande de falaise en strates sous la masse, de hauteur inégale (plus haute
    # au milieu, sous la bouche), qui rentre aux bouts
    tex = R.face_texture(R.GRANIT, 1013, haut=22)
    for x in range(2, w - 2):
        bout = min(x - 2, w - 3 - x)
        haut = min(20, 9 + bout // 2) - (2 if hasard(1013, x // 4) < 0.3 else 0)
        for v in range(haut):
            y = h - 3 - v
            px[x, y] = tex[(x % R.PERIODE, v)] + (255,)
        px[x, h - 2] = R.GRANIT[0] + (255,)                # le pied, contre le sol
    # l'arche : une demi-ellipse au milieu du bas, noire au fond, son bord dans l'ombre
    cx, base, rx, ry = 28, h - 2, 9.5, 18
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5 - cx) / rx, (base - y - 0.5) / ry
            if v < 0 or u * u + v * v > 1:
                continue
            d = u * u + v * v
            c = NOIR[0] if d < 0.45 else NOIR[1] if d < 0.7 else NOIR[2] if d < 0.86 else NOIR[3]
            if y >= base - 2 and d < 0.8:
                c = (40, 34, 30)                           # le sol qui entre dans la grotte
            px[x, y] = c + (255,)
    # le linteau éclairé et les dents de roche
    for x in range(int(cx - rx), int(cx + rx) + 1):
        u = (x + 0.5 - cx) / rx
        if abs(u) >= 1:
            continue
        y = round(base - ry * math.sqrt(1 - u * u)) - 1
        if 0 <= y < h:
            px[x, y] = R.GRANIT[6 if u < 0.2 else 4] + (255,)
            if y - 1 >= 0 and u < -0.3:
                px[x, y - 1] = R.GRANIT[5] + (255,)
    for x0, l in ((24, 3), (31, 2), (27, 1)):
        for k in range(l):
            px[x0, base - 17 + k] = R.GRANIT[3 - min(2, k)] + (255,)
    # les éboulis au pied, de chaque côté (de petits cailloux, comme ceux des tas)
    tas = R.tas(w, 12, [(6, 7, 3.2, 2.4, 3), (11, 9, 2.4, 2, 2.4), (48, 8, 3.4, 2.6, 3), (43, 9.5, 2.2, 1.8, 2), (16, 10, 1.6, 1.3, 1.6), (40, 10.5, 1.4, 1.2, 1.4)], R.GRANIT, 611)
    out.alpha_composite(tas, (0, h - 12))
    return R.avec_contour(out, CONTOUR), 28, h - 2


# ---------- le ponton ----------

def planches(longueur, larg, graine):
    """Des planches posées en travers d'un ponton, vues de dessus : {(i, j): couleur}, i le long
    (0 : côté rive), j en travers. Chaque planche a son ton, le grain du bois, un clou à chaque bout."""
    r = random.Random(graine)
    out = {}
    for i in range(longueur):
        k = i // 3
        ton = 3 + (1 if hasard(graine, k) < 0.4 else 0) - (1 if hasard(graine + 1, k) < 0.2 else 0)
        for j in range(larg):
            c = R.BOIS[ton]
            if i % 3 == 2:
                c = R.BOIS[1]                              # le jour entre deux planches
            elif hasard(graine + 2, i, j) < 0.12:
                c = R.BOIS[ton - 1]                        # le grain
            elif i % 3 == 0 and j in (1, larg - 2):
                c = R.BOIS[0]                              # les clous
            if j == 0:
                c = R.BOIS[min(5, ton + 1)] if i % 3 != 2 else c   # le bord gauche, éclairé
            out[(i, j)] = c
    r.random()
    return out


def ponton(sens):
    """Un ponton de trois cases (48 px) qui part de la rive dans le sens `sens` (0 nord, 1 sud,
    2 ouest, 3 est), 12 px de large, posé sur ses pieux ; vu à 45°, son flanc sud et ses pieux
    (dans l'eau) se voient sous lui. → (image, px, py)."""
    L, l, flanc = 46, 12, 2
    p = planches(L, l, 701 + sens)
    if sens in (0, 1):
        w, h = 16, L + flanc + 3
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        q = im.load()
        for (i, j), c in p.items():
            y = (L - 1 - i) if sens == 0 else i
            q[2 + j, y] = c + (255,)
        # le bout au large : son flanc, ses deux pieux qui plongent dans l'eau
        yb = 0 if sens == 0 else L
        for j in range(l):
            for d in range(flanc):
                y = (L + d) if sens == 1 else (L + d)
                if sens == 1:
                    q[2 + j, y] = R.BOIS[1 if d else 2] + (255,)
        for xx in (2, 2 + l - 1):
            for d in range(flanc + 2):
                y = (L + d) if sens == 1 else (d + 2)
                if sens == 0 and d < 2:
                    continue
                if 0 <= y < h:
                    q[xx, y] = R.BOIS[0 if d > 1 else 1] + (255,)
        # (vers le nord, le flanc est du côté de la rive : caché ; des pieux le long du bord droit)
        if sens == 0:
            for y in range(4, L, 12):
                q[2 + l, y] = R.BOIS[0] + (255,)
                q[2 + l, y + 1] = R.BOIS[0] + (255,)
        out = R.avec_contour(im, CONTOUR)
        _ = yb
        return (out, 8, L) if sens == 0 else (out, 8, 0)
    # vers l'ouest ou l'est : le ponton couché, son flanc sud (3 px) et ses pieux sous lui
    w, h = L + 2, l + flanc + 4
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    q = im.load()
    for (i, j), c in p.items():
        x = (L - 1 - i) if sens == 2 else i
        q[1 + x, 1 + j] = c + (255,)
    for x in range(L):
        for d in range(flanc):
            q[1 + x, 1 + l + d] = R.BOIS[2 if d == 0 else 1] + (255,)
    for k in range(4):
        x = 1 + (4 + k * 13 if sens == 3 else L - 5 - k * 13)
        for d in range(3):
            q[x, 1 + l + flanc + d] = R.BOIS[0] + (255,)
    out = R.avec_contour(im, CONTOUR)
    return (out, 1 + L, 1 + l // 2 + 1) if sens == 2 else (out, 1, 1 + l // 2 + 1)


# ---------- les piquets, la nasse, le filet ----------

def piquets(k):
    """Deux piquets de bois plantés dans la rive, un filet qui sèche entre eux (des mailles en
    losanges, qui pendent), une nasse d'osier posée au pied ; k : la nasse à gauche ou à droite.
    24 × 22 px, le pied au milieu du bas."""
    w, h = 24, 22
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    q = im.load()
    for x0 in (3, 19):
        for y in range(4, h - 2):
            q[x0, y] = R.BOIS_GRIS[3 if y < 6 else 2] + (255,)
            q[x0 + 1, y] = R.BOIS_GRIS[1] + (255,)
        q[x0, 3] = R.BOIS_GRIS[4] + (255,)
        q[x0 + 1, 3] = R.BOIS_GRIS[2] + (255,)
    # le filet : la corde du haut qui pend un peu, les mailles en losanges
    for x in range(5, 19):
        t = (x - 5) / 13
        yc = round(5 + 2.2 * math.sin(t * math.pi))
        q[x, yc] = FILET + (255,)
        for y in range(yc + 1, yc + 9):
            if (x + y) % 3 == 0 or (x - y) % 3 == 0:
                q[x, y] = (FILET if y < yc + 6 else (168, 164, 146)) + (255,)
    # la nasse : un cône d'osier couché, ses cercles
    nx = 2 if k == 0 else 12
    for y in range(13, 20):
        for x in range(nx, nx + 10):
            u, v = (x + 0.5 - (nx + 5)) / 5, (y + 0.5 - 16.5) / 3.5
            if u * u + v * v > 1:
                continue
            c = OSIER[2] if (x + y) % 2 else OSIER[1]
            if (x - nx) % 3 == 0:
                c = OSIER[0]
            if v < -0.5:
                c = OSIER[3]
            q[x, y] = c + (255,)
    out = R.avec_contour(im, CONTOUR)
    return R.ombre_sous(out, 12, h - 2, 10, 2.2, alpha=70), 12, h - 1


# ---------- les lieux du récit ----------

def _toile(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, im.load()


def _pose(q, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h:
        q[x, y] = tuple(c[:3]) + (255,)


MOUSSE = [(58, 84, 40), (82, 112, 52), (110, 140, 66)]
VOILE = [(176, 168, 146), (206, 198, 176)]
SABLE = [(196, 168, 116), (214, 186, 132), (230, 206, 156)]


def epave_recit():
    """L'épave de Johnny : 72 × 40 px. La coque d'un petit voilier couchée sur le flanc, sur le sable : le
    bordé sombre et délavé, les membrures à nu là où les planches manquent, le pont penché, le mât
    cassé couché en travers, un lambeau de voile ; du sable poussé contre elle. Le pied : le milieu du bas."""
    w, h = 72, 40
    im, q = _toile(w, h)
    B, G = R.BOIS, R.BOIS_GRIS
    cx, cy, rx, ry = 34, 24, 30, 11
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            larg = 1 - max(0.0, u) ** 2.2                       # la proue pointe à droite
            if abs(u) > 1 or v * v > larg or v < -0.85:
                continue
            if v < -0.25:
                c = G[3] if x % 4 else G[2]                      # le pont, penché vers nous
            else:
                k = int((v + 0.25) * 8) % 2
                c = G[1] if k else G[2]                          # le bordé, en virures
                trou = 0.12 + 0.05 * math.sin(y * 1.7) < u < 0.42 + 0.04 * math.cos(y * 1.3)
                if trou and v > 0.05:                            # les planches arrachées : les membrures
                    c = B[3] if x % 3 == 0 else NOIR[2] if v < 0.6 else NOIR[1]
            if hasard(931, x // 3, y // 2) < 0.12:
                c = MOUSSE[0]                                    # des algues sèches
            _pose(q, w, h, x, y, c)
    # le mât cassé, couché en travers vers la gauche, et un lambeau de voile
    for d in range(34):
        x, y = 46 - d, 1 + int(d * 0.42)
        _pose(q, w, h, x, y, G[5])
        _pose(q, w, h, x, y + 1, G[3])
        _pose(q, w, h, x, y + 2, G[1])
    for y in range(4, 16):
        for x in range(22, 34):
            haut = 1 + int((46 - x) * 0.42) + 2
            if y > haut and y - haut < 9 - (x - 22) * 0.5 and hasard(932, x, y) < 0.9:
                _pose(q, w, h, x, y, VOILE[1] if (x + 2 * y) % 5 else VOILE[0])
    # le sable poussé contre la coque, en bas
    for y in range(28, h):
        for x in range(4, 66):
            if q[x, y][3] == 0 and hasard(933, x, y) < 0.5 and abs(x - cx) < 30 - (y - 28):
                _pose(q, w, h, x, y, SABLE[2] if hasard(934, x, y) < 0.5 else SABLE[1])
    out = R.avec_contour(im, CONTOUR)
    return out, 34, h - 2


# ---------- la cale du bac ----------

PEINTURE = [(52, 70, 96), (74, 98, 132), (104, 134, 170)]     # la coque du bac, bleue
BLANC = [(170, 166, 156), (206, 202, 192), (236, 232, 222)]    # le pont, la cabine
ROUGE = [(120, 36, 30), (170, 58, 46), (214, 96, 76)]          # la ligne de flottaison, les bouées
CORDE = (196, 176, 128)


def cale_nord():
    """La cale vers le nord, vue de dessus : 46 × 82 px. La jetée (18 px de large, 80 de long) en blocs de
    granit, plus clairs sur le dessus, joints sombres, deux bittes d'amarrage ; le bac le long de son bout, à
    droite : la coque bleue, le pont clair, la cabine, un cordage jusqu'à la bitte. → (image, px, py)."""
    L, lj = 80, 18
    w, h = lj + 28, L + 2
    im, q = _toile(w, h)
    G = R.GRANIT
    # la jetée : des blocs de 6 × 4 px, en quinconce, une arête claire en haut à gauche de chacun
    for y in range(L):
        for x in range(lj):
            rang = y // 4
            dx = (x + (3 if rang % 2 else 0)) % 6
            if dx == 0 or y % 4 == 0:
                c = G[2]                                    # les joints
            elif dx == 1 or y % 4 == 1:
                c = G[6]                                    # l'arête éclairée
            else:
                c = G[5] if hasard(811, x // 6, rang) < 0.6 else G[4]
            if x == lj - 1:
                c = G[1]                                    # le flanc droit, dans l'ombre
            _pose(q, w, h, x, h - 1 - y, c)
    # les bittes d'amarrage, près du bout, et une à mi-longueur
    for (bx, by) in ((lj - 5, 10), (lj - 5, 30), (3, 52)):
        for yy in range(by, by + 4):
            for xx in range(bx, bx + 3):
                _pose(q, w, h, xx, yy, NOIR[2] if yy == by + 3 else G[1] if xx == bx else G[0])
    # le bac : la coque (22 × 52 px), arrondie à la proue (vers le large), contre la jetée
    x0, y0, bl, bh = lj + 2, 4, 22, 52
    for y in range(bh):
        t = y / bh
        demi = bl / 2 if t > 0.18 else bl / 2 * math.sqrt(max(0.0, t / 0.18))   # la proue en pointe arrondie
        for x in range(bl):
            u = abs(x + 0.5 - bl / 2)
            if u > demi:
                continue
            bord = u > demi - 2.2
            if bord:
                c = ROUGE[1] if x < bl / 2 else ROUGE[0]                       # le liston rouge
            elif u > demi - 5.5:
                c = PEINTURE[2] if x < bl / 2 else PEINTURE[0] if u > demi - 4 else PEINTURE[1]   # la coque, éclairée à gauche
            else:
                c = BLANC[1] if (y // 3) % 2 else BLANC[0]                     # le pont, en lattes
            _pose(q, w, h, x0 + x, y0 + y, c)
    # la cabine, au milieu du pont : son toit de bois (en planches, plus sombre à droite), son ombre portée
    for y in range(20, 38):
        for x in range(6, bl - 6):
            if y >= 36:
                c = NOIR[3] if x > 7 else BLANC[0]                           # l'ombre de la cabine sur le pont
            elif x in (6, bl - 7) or y in (20, 35):
                c = R.BOIS[1]                                                # son bord
            else:
                c = R.BOIS[4] if x < bl / 2 else R.BOIS[3]
                if y % 4 == 0:
                    c = R.BOIS[2]
            _pose(q, w, h, x0 + x, y0 + y, c)
    # une bouée de chaque côté de la poupe, le cordage jusqu'à la bitte
    for (cx, cy) in ((x0 + 3, y0 + bh - 6), (x0 + bl - 4, y0 + bh - 6)):
        for yy in range(cy - 2, cy + 2):
            for xx in range(cx - 2, cx + 2):
                _pose(q, w, h, xx, yy, ROUGE[2] if (xx + yy) % 2 else BLANC[2])
    for k in range(6):
        _pose(q, w, h, lj - 4 + k, 12 + (k // 3), CORDE)
    out = R.avec_contour(im, CONTOUR)
    return out, lj // 2, h


def cale(sens):
    """La cale dans le sens `sens` : celle du nord, retournée ou couchée. → (image, px, py)."""
    im, px, py = cale_nord()
    w, h = im.size
    if sens == 0:
        return im, px, py
    if sens == 1:                                   # vers le sud : retournée de haut en bas
        return im.transpose(Image.FLIP_TOP_BOTTOM), px, h - py
    # vers l'ouest ou l'est : couchée (le bac passe au sud de la jetée)
    t = im.transpose(Image.TRANSPOSE)               # (x, y) → (y, x) : le nord devient l'ouest
    if sens == 2:
        return t, py, px
    return t.transpose(Image.FLIP_LEFT_RIGHT), h - py, px


# ---------- les secrets du monde (D-2) ----------

import vegetation as V  # noqa: E402

LICHEN = [(150, 156, 96), (184, 186, 120)]


def _mur(q, w, h, x0, y_bas, l, haut, ep, pal, graine, mousse):
    """Un pan de mur de pierres sèches vu de haut à 45° : la face (rangées de 4 px, pierres de 5 à 9 px, joints
    sombres), le dessus (ep px, plus clair), un faîte écroulé (la hauteur varie par tronçons)."""
    x = x0
    hauts = []
    while x < x0 + l:
        n = 4 + int(hasard(graine, x) * 5)
        hh = max(4, haut - int(hasard(graine + 1, x) * haut * 0.6))
        hauts += [hh] * n
        x += n
    hauts = hauts[:l]
    for k, hh in enumerate(hauts):
        x = x0 + k
        for d in range(hh):
            y = y_bas - d
            rang = d // 4
            dec = (rang * 3 + int(hasard(graine + 2, rang) * 5)) % 7
            joint = d % 4 == 3 or (k + dec) % 7 == 0
            lum = 4 if k < 2 else 3
            c = pal[1] if joint else pal[lum - (1 if hasard(graine + 3, x // 3, rang) < 0.3 else 0)]
            _pose(q, w, h, x, y, c)
        for e in range(ep):
            y = y_bas - hh - e
            c = pal[6] if e == ep - 1 else pal[5]
            if mousse and hasard(graine + 4, x // 2, e) < mousse:
                c = MOUSSE[2] if e == ep - 1 else MOUSSE[1]
            _pose(q, w, h, x, y, c)


def ruine(variante):
    """Une ruine : 76 × 44 px. Deux pans de mur en équerre, un troisième abattu, un bloc tombé devant."""
    w, h = 76, 44
    im, q = _toile(w, h)
    pal = R.GRANIT[1:] + [R.GRANIT[-1]]
    mousse = 0.25 if variante == 0 else 0.6
    g = 40 + variante * 9
    _mur(q, w, h, 4, 30, 20, 18, 5, pal, g, mousse)          # le pan du fond, à gauche
    _mur(q, w, h, 40, 28, 30, 12, 5, pal, g + 5, mousse)     # le pan du fond, à droite (plus bas)
    _mur(q, w, h, 2, 41, 10, 14, 4, pal, g + 9, mousse)      # le retour, devant à gauche
    _mur(q, w, h, 60, 41, 12, 7, 4, pal, g + 13, mousse)     # un reste, devant à droite
    out = R.avec_contour(im, CONTOUR)
    # un bloc tombé et quelques pierres dans l'herbe
    bloc = R.pierre(14, 10, [(7, 5, 6, 4, 4)], R.GRIS, g + 20, mousse=mousse, pans=3)
    out.alpha_composite(bloc, (30, 32))
    for k, (x, y) in enumerate([(24, 38), (50, 36), (16, 33)]):
        out.alpha_composite(R.pierre(7, 6, [(3.5, 3, 3, 2.4, 2)], R.GRIS, g + 30 + k, mousse=mousse, pans=2), (x, y))
    return out, 38, h - 2


def cairn():
    """Un cairn : 24 × 32 px. Des pierres empilées en cône, de plus en plus petites, une pierre plate au sommet."""
    w, h = 24, 32
    cail = [(6, 27, 5, 3.5, 4), (12, 28, 5.5, 3.6, 4), (18, 27, 4.5, 3.4, 4),
            (8, 22, 4.5, 3.2, 3.5), (15, 22, 4.5, 3.2, 3.5),
            (12, 17, 4.5, 3, 3.2), (11, 12.5, 3.8, 2.6, 3), (12, 8.5, 3.2, 2.2, 2.6), (12, 5, 4, 1.6, 1.5)]
    out = R.tas(w, h, sorted(cail, key=lambda c: -c[1]), R.GRIS, 71)
    return out, 12, h - 2


def pierre_levee():
    """Une pierre levée : 22 × 44 px. Un menhir gris, un peu penché, plus large à mi-hauteur, piqué de lichen ;
    éclairé à gauche ; une touffe d'herbe à son pied."""
    w, h = 22, 44
    im, q = _toile(w, h)
    pal = R.GRANIT
    for y in range(2, h - 2):
        f = (y - 2) / (h - 4)
        larg = 5 + 9 * math.sin(min(1.0, f * 1.25) * math.pi * 0.55) + (2 if f > 0.9 else 0)
        cx = 11 + (1 - f) * 1.5
        xa, xb = int(round(cx - larg / 2)), int(round(cx + larg / 2))
        for x in range(xa, xb):
            u = (x - xa + 0.5) / max(1, xb - xa)
            k = 6 - int(u * 4.5) - (1 if hasard(81, x, y // 2) < 0.2 else 0)
            if y < 6:
                k = min(7, k + 1)
            c = pal[max(1, min(7, k))]
            if hasard(82, x // 2, y // 2) < 0.12:
                c = LICHEN[0] if u > 0.5 else LICHEN[1]
            _pose(q, w, h, x, y, c)
    out = R.avec_contour(im, CONTOUR)
    t = V.Toile(w, h)
    V.herbe_pied(t, 11, h - 2, 83, largeur=16, rampe=V.RAMPE_PRE)
    out.alpha_composite(t.image())
    return out, 11, h - 2


def belvedere():
    """Un belvédère : 52 × 36 px. Une dalle de roche plate, et dessus une table d'orientation : un disque de pierre
    gravé sur son pilier."""
    w, h = 52, 36
    dalle = R.pierre(w, 22, [(26, 12, 24, 9, 3), (14, 13, 11, 7, 3.5), (38, 12, 12, 7, 3.2)], R.GRANIT, 91, mousse=0.1, pans=4, mouchete=0.2)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(dalle, (0, h - 22))
    im, q = _toile(w, h)
    pal = R.GRANIT
    # le pilier
    for y in range(12, 25):
        for x in range(23, 30):
            u = (x - 23) / 6
            _pose(q, w, h, x, y, pal[6 if u < 0.3 else 5 if u < 0.6 else 3])
    # le disque, vu de biais (une ellipse), sa rose gravée
    for y in range(5, 15):
        for x in range(14, 39):
            d = ((x + 0.5 - 26.5) / 12.5) ** 2 + ((y + 0.5 - 10) / 5) ** 2
            if d > 1:
                continue
            c = pal[7] if y < 9 else pal[6]
            if d > 0.75:
                c = pal[4]
            if (x == 26 or y == 10) and d < 0.6:
                c = pal[3]
            _pose(q, w, h, x, y, c)
    for y in range(15, 17):
        for x in range(15, 38):
            if abs(x - 26.5) < 12 - (y - 15) * 2:
                _pose(q, w, h, x, y, pal[3])
    out.alpha_composite(R.avec_contour(im, CONTOUR))
    return out, 26, h - 3


def arbre_ancien():
    """Un arbre ancien : 96 × 98 px. Un houppier immense et sombre, en larges bosses ; un tronc très épais, ses
    racines à nu qui s'étalent au pied."""
    w, h = 96, 98
    r = random.Random(1201)
    bosses = [(48, 34, 30), (24, 40, 18), (72, 40, 18), (36, 18, 17), (60, 18, 17), (14, 52, 11), (82, 52, 11), (48, 50, 20), (30, 56, 13), (66, 56, 13)]
    bosses = [(cx + r.uniform(-1.5, 1.5), cy + r.uniform(-1.5, 1.5), rr * r.uniform(0.95, 1.05)) for cx, cy, rr in bosses]
    t = V.Toile(w, h)
    V.tronc(t, 48, 54, h - 2, 16, 22, V.ECORCE, 1203, racines=7)
    # les racines à nu, qui rampent de part et d'autre
    for sens in (-1, 1):
        for k in range(2):
            x0, y0 = 48 + sens * (8 + k * 4), h - 6 + k * 2
            for d in range(10 + k * 6):
                x, y = x0 + sens * d, y0 + int(d * 0.25)
                for e in range(3 - (d > 8)):
                    t.pose(x, y - e, V.sur(V.ECORCE, 3.2 - e * 0.8))
    V.herbe_pied(t, 48, h - 2, 1204, largeur=50)
    hb = V.champ_bosses(bosses, 1205)
    bas = max(cy + rr for cx, cy, rr in bosses)
    cime = V.Toile(w, h)
    V.feuillage(cime, hb, V.RAMPE_FORET, 1206, pied=(bas - 18, bas))
    V.contour(cime, V.RAMPE_FORET[0])
    for k, c in cime.px.items():
        t.px[k] = c
    V.contour(t, V.assombrir(V.RAMPE_FORET[0], 0.8))
    return t.image(), 48, h - 2


# ---------- la planche ----------

def charge_sortes():
    with open(DONNEES, encoding='utf-8') as f:
        d = json.load(f)
    return d['LIEUX']['SORTES']


def dessins():
    return {
        'entree_grotte': [entree(0), entree(1)],
        'ponton': [ponton(s) for s in range(4)],
        'piquets': [piquets(0), piquets(1)],
        'epave': [epave_recit()],
        'cale': [cale(s) for s in range(4)],
        'ruine': [ruine(0), ruine(1)],
        'cairn': [cairn()],
        'arbre_ancien': [arbre_ancien()],
        'belvedere': [belvedere()],
        'pierre_levee': [pierre_levee()],
    }


def main():
    sortes = charge_sortes()
    d = dessins()
    for s in sortes:
        assert len(d.get(s['nom'], [])) == s['variantes'], f"{s['nom']} : {len(d.get(s['nom'], []))} images, il en faut {s['variantes']} (data/monde.json)"
    x = y = haut = 0
    places, items = {}, []
    for s in sortes:
        for k, (im, px, py) in enumerate(d[s['nom']]):
            items.append((s['nom'], k, im, px, py))
    for nom, k, im, px, py in items:
        if x + im.width > LARGEUR_PLANCHE:
            x, y, haut = 0, y + haut + 1, 0
        places[(nom, k)] = (x, y)
        x += im.width + 1
        haut = max(haut, im.height)
    img = Image.new('RGBA', (LARGEUR_PLANCHE, y + haut), (0, 0, 0, 0))
    table = {}
    for nom, k, im, px, py in items:
        x, y = places[(nom, k)]
        img.alpha_composite(im, (x, y))
        table.setdefault(nom, []).append([x, y, im.width, im.height, px, py])
    img.save(SORTIE)
    with open(SORTIE_JSON, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/lieux_monde.png : {img.width} × {img.height}, {sum(len(v) for v in table.values())} images')
    if '--apercu' in sys.argv:
        apercu(d)


def apercu(d):
    """Chaque dessin posé sur son sol : l'entrée sur les éboulis, le ponton et les piquets au bord
    de l'eau ; agrandi quatre fois."""
    W, H = 300, 120
    out = Image.new('RGBA', (W, H), (138, 130, 120, 255))
    for y in range(H):
        for x in range(150, W):
            out.putpixel((x, y), (79, 172, 211, 255) if y < 60 or x > 250 else (223, 193, 136, 255))
    for k, (im, px, py) in enumerate(d['entree_grotte']):
        out.alpha_composite(im, (6 + k * 66 + 28 - px, 70 - py))
    ps = d['ponton']
    out.alpha_composite(ps[0][0], (170 - ps[0][1], 60 - ps[0][2]))
    out.alpha_composite(ps[3][0], (251 - ps[3][1], 90 - ps[3][2]))
    out.alpha_composite(ps[2][0], (250 - ps[2][1] - 60, 100 - ps[2][2]))
    for k, (im, px, py) in enumerate(d['piquets']):
        out.alpha_composite(im, (200 + k * 28 - px, 80 - py))
    out.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_lieux.png'))
    print('apercu_lieux.png')


if __name__ == '__main__':
    main()
