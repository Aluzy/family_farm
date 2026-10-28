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
