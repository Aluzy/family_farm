# L'herbe haute de la carte : la touffe d'herbe du pied de l'arbre (arbre_feuillu.png), sans le
# tronc, éclaircie sur les verts de l'herbe, en trois variantes et cinq images d'oscillation
# (le jeu les joue quand le personnage la traverse, voir TALL_GRASS dans js/farm-stage.js).
#
#   python3 scripts/carte/herbe_haute.py            écrit assets/herbe_haute.png
#   python3 scripts/carte/herbe_haute.py --apercu   écrit aussi apercu_herbe_haute.png
#
# assets/herbe_haute.png : des cases de L × H px, pied au milieu du bas ; une rangée par
# variante (0 une touffe haute : deux touffes l'une derrière l'autre, 1 la même retournée,
# 2 une touffe seule, plus basse), une colonne par
# image : 0 droite, 1 et 2 penchée à droite (un peu, plus), 3 et 4 penchée à gauche. Les brins
# penchent d'autant plus qu'ils sont hauts (le pied ne bouge pas).
#
# Les zones d'herbe haute sont posées sur la carte par scripts/carte/carte_v2.py (couche
# d'objets « herbe_haute » : un point par touffe).
import math
import os
import random
import sys

from PIL import Image

import arbre_clair as AC

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ARBRE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'arbre_feuillu.png')
SORTIE = os.path.join(ROOT, 'assets', 'herbe_haute.png')
L, H = 28, 16
T = 16
TOUFFE = (12, 54, 36, 64)        # la touffe dans l'arbre (x0, y0, x1, y1)
PENTES = [0, 1, 3, -1, -3]       # décalage (px) du haut des brins, pour chaque image


# Les zones d'herbe haute (en tuiles) : (centre x, centre y, rayon). Chaque zone est une tache
# aux bords irréguliers ; seules ses cases d'herbe libres (rien posé dessus, hors des
# rectangles de la carte) reçoivent des touffes.
ZONES = [(7, 12, 3.0), (6, 21, 2.6), (24, 12, 2.4), (41, 9, 3.0), (54, 12, 3.2), (66, 20, 2.8), (45, 34, 2.8),
         (62, 33, 3.2), (36, 44, 3.4), (51, 48, 3.0), (29, 52, 2.6)]


def touffes(libre):
    """Les touffes des ZONES : [(x, y, variante)] en px (pied), libre(tx, ty) dit si une case
    peut en porter. Une ou deux touffes par case, un peu décalées (toujours les mêmes)."""
    out = []
    for k, (cx, cy, r) in enumerate(ZONES):
        n0 = len(out)
        hasard = random.Random(k)
        bosses = [hasard.uniform(-0.35, 0.35) for _ in range(5)]
        for ty in range(int(cy - r - 2), int(cy + r + 3)):
            for tx in range(int(cx - r - 2), int(cx + r + 3)):
                a = math.atan2(ty - cy, tx - cx)
                bord = r * (1 + sum(b * math.sin((n + 2) * a + n) for n, b in enumerate(bosses)) / 2)
                if math.hypot(tx - cx, (ty - cy) * 1.2) > bord or not libre(tx, ty):
                    continue
                for _ in range(0 if hasard.random() < 0.2 else 1 if hasard.random() < 0.8 else 2):
                    out.append((tx * T + 8 + hasard.randint(-5, 5), ty * T + 12 + hasard.randint(-4, 3), hasard.choice((0, 0, 1, 1, 2))))
        if len(out) == n0:
            print(f'  herbe haute : la zone {k} ({cx}, {cy}) ne porte aucune touffe')
    return sorted(out, key=lambda t: (t[1], t[0]))


def herbe(p):
    """Un pixel d'herbe : vert plus que rouge (le tronc est brun)."""
    return p[3] and p[1] > p[0] + 8


def touffe():
    """La touffe, sans le tronc : là où passait le tronc, l'herbe de la même rangée la plus
    proche ; au-dessus (entre les deux bouquets de brins), le bouquet de gauche retourné."""
    src = Image.open(ARBRE).convert('RGBA').crop(TOUFFE)
    sp = src.load()
    w, h = src.size
    out = Image.new('RGBA', (w, h))
    po = out.load()
    for y in range(h):
        for x in range(w):
            if herbe(sp[x, y]):
                po[x, y] = sp[x, y]
    # les rangées pleines du bas : on bouche les trous du tronc
    for y in range(h - 6, h):
        xs = [x for x in range(w) if po[x, y][3]]
        if not xs:
            continue
        for x in range(min(xs), max(xs) + 1):
            if not po[x, y][3]:
                k = min(xs, key=lambda q: abs(q - x))
                po[x, y] = po[k, y]
    # les brins du haut, au milieu : le bouquet de gauche, retourné
    gauche = out.crop((0, 0, 7, h - 6)).transpose(Image.FLIP_LEFT_RIGHT)
    milieu = Image.new('RGBA', out.size)
    milieu.alpha_composite(gauche, (w // 2 - 4, 1))
    milieu.alpha_composite(out)
    return milieu


def eclaircir(img):
    """Les verts de la touffe (sombres : elle est à l'ombre de l'arbre) répartis, dans l'ordre de
    leur clarté, sur la rampe des verts de l'herbe (scripts/carte/arbre_clair.py) : du vert
    profond du contour au vert vif des brins."""
    px = img.load()
    tons = sorted({px[x, y][:3] for y in range(img.height) for x in range(img.width) if px[x, y][3]}, key=sum)
    rang = {c: i / max(1, len(tons) - 1) for i, c in enumerate(tons)}
    out = img.copy()
    po = out.load()
    for y in range(img.height):
        for x in range(img.width):
            if px[x, y][3]:
                po[x, y] = AC.sur_rampe(0.12 + 0.82 * rang[px[x, y][:3]] ** 0.8) + (255,)
    return out


def cadre(img):
    c = Image.new('RGBA', (L, H))
    bb = img.getbbox()
    img = img.crop(bb)
    c.alpha_composite(img, ((L - img.width) // 2, H - img.height))
    return c


def pencher(img, d):
    """Les brins penchés : chaque rangée glisse de d × (hauteur au-dessus du pied) / H."""
    out = Image.new('RGBA', img.size)
    for y in range(img.height):
        k = round(d * (img.height - 1 - y) / (img.height - 1))
        out.alpha_composite(img.crop((0, y, img.width, y + 1)), (k, y))
    return out


def double(t, dx):
    """Une touffe haute : une deuxième touffe derrière, plus haut, décalée de dx px."""
    out = Image.new('RGBA', (t.width + abs(dx), t.height + 5))
    out.alpha_composite(t, (max(0, dx), 0))
    out.alpha_composite(t.transpose(Image.FLIP_LEFT_RIGHT), (max(0, -dx), 5))
    return out


def main():
    t = eclaircir(touffe())
    variantes = [cadre(double(t, 3)), cadre(double(t, 3).transpose(Image.FLIP_LEFT_RIGHT)), cadre(t)]
    planche = Image.new('RGBA', (L * len(PENTES), H * len(variantes)))
    for r, v in enumerate(variantes):
        for c, d in enumerate(PENTES):
            planche.alpha_composite(pencher(v, d), (c * L, r * H))
    planche.save(SORTIE)
    print(f'assets/herbe_haute.png : {len(variantes)} touffes × {len(PENTES)} images de {L} × {H}')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', planche.size, (120, 170, 70, 255))
        fond.alpha_composite(planche)
        fond.resize((fond.width * 8, fond.height * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_herbe_haute.png'))


if __name__ == '__main__':
    main()
