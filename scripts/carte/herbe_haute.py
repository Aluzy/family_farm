# L'herbe haute de la carte : les trois herbes dessinées à la main de
# scripts/carte/originaux/herbes_hautes.png, telles quelles, avec cinq images d'oscillation
# chacune (le jeu les joue quand le personnage la traverse, voir TALL_GRASS dans
# js/farm-stage.js ; il les teinte d'après l'herbe sous leur pied).
#
#   python3 scripts/carte/herbe_haute.py            écrit assets/herbe_haute.png
#   python3 scripts/carte/herbe_haute.py --apercu   écrit aussi apercu_herbe_haute.png
#
# assets/herbe_haute.png : des cases de L × H px, pied au milieu du bas ; une rangée par herbe
# (de gauche à droite dans le modèle), une colonne par image : 0 droite, 1 et 2 penchée à
# droite (un peu, plus), 3 et 4 penchée à gauche. Les brins penchent d'autant plus qu'ils sont
# hauts (le pied ne bouge pas).
#
# Les zones d'herbe haute sont posées sur la carte par scripts/carte/carte_v2.py (couche
# d'objets « herbe_haute » : un point par touffe, type = rangée de l'herbe).
import math
import os
import random
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
HERBES = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'herbes_hautes.png')
SORTIE = os.path.join(ROOT, 'assets', 'herbe_haute.png')
L, H = 22, 16
T = 16
VARIANTES = (0, 1, 2)            # les herbes tirées pour les touffes, en alternance
PENTES = [0, 1, 3, -1, -3]       # décalage (px) du haut des brins, pour chaque image


# Les zones d'herbe haute (en tuiles) : (centre x, centre y, rayon). Chaque zone est une tache
# aux bords irréguliers ; seules ses cases d'herbe libres (rien posé dessus, hors des
# rectangles de la carte) reçoivent des touffes.
ZONES = [(7, 12, 3.0), (6, 21, 2.6), (24, 12, 2.4), (41, 9, 3.0), (54, 12, 3.2), (66, 20, 2.8), (45, 34, 2.8),
         (62, 33, 3.2), (36, 44, 3.4), (51, 48, 3.0), (29, 52, 2.6)]


def touffes(libre):
    """Les touffes des ZONES : [(x, y, variante)] en px (pied), libre(tx, ty) dit si une case
    peut en porter. Une herbe sur la plupart des cases (parfois deux, parfois aucune), un peu
    décalée (toujours la même)."""
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
                for _ in range(0 if hasard.random() < 0.15 else 1 if hasard.random() < 0.85 else 2):
                    out.append((tx * T + 8 + hasard.randint(-4, 4), ty * T + 12 + hasard.randint(-3, 3), hasard.choice(VARIANTES)))
        if len(out) == n0:
            print(f'  herbe haute : la zone {k} ({cx}, {cy}) ne porte aucune touffe')
    return sorted(out, key=lambda t: (t[1], t[0]))


def herbes_dessinees():
    """Les herbes de herbes_hautes.png : chaque groupe de pixels voisins (8 voisins) à part."""
    im = Image.open(HERBES).convert('RGBA')
    px = im.load()
    w, h = im.size
    vu = set()
    out = []
    for x0 in range(w):
        for y0 in range(h):
            if (x0, y0) in vu or not px[x0, y0][3]:
                continue
            pile, groupe = [(x0, y0)], []
            vu.add((x0, y0))
            while pile:
                x, y = pile.pop()
                groupe.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        q = (x + dx, y + dy)
                        if 0 <= q[0] < w and 0 <= q[1] < h and q not in vu and px[q][3]:
                            vu.add(q)
                            pile.append(q)
            if len(groupe) < 12:                     # un brin isolé : avec le groupe le plus proche (plus bas)
                continue
            xs, ys = [p[0] for p in groupe], [p[1] for p in groupe]
            out.append((min(xs), max(xs) + 1, groupe))
    out.sort()
    images = []
    for x0, x1, groupe in out:
        img = Image.new('RGBA', (x1 - x0, h))
        for (x, y) in groupe:
            img.putpixel((x - x0, y), px[x, y])
        images.append(img)
    # les brins isolés : rendus à l'herbe dont ils sont le plus près
    for x in range(w):
        for y in range(h):
            if px[x, y][3] and (x, y) not in {(gx, gy) for _, _, g in out for (gx, gy) in g}:
                k = min(range(len(out)), key=lambda i: 0 if out[i][0] <= x < out[i][1] else min(abs(x - out[i][0]), abs(x - out[i][1] + 1)))
                images[k].putpixel((max(0, min(images[k].width - 1, x - out[k][0])), y), px[x, y])
    return images


def contour(img):
    """Un contour d'un pixel, du vert le plus sombre de la touffe, sur les côtés et le haut :
    deux touffes qui se chevauchent restent deux touffes."""
    px = img.load()
    w, h = img.size
    sombre = min((px[x, y][:3] for y in range(h) for x in range(w) if px[x, y][3]), key=sum)
    sombre = tuple(round(v * 0.75) for v in sombre)
    out = Image.new('RGBA', (w + 2, h + 1))
    out.alpha_composite(img, (1, 1))
    po = out.load()
    ajout = [(x, y) for y in range(h + 1) for x in range(w + 2) if not po[x, y][3]
             and any(0 <= x + dx < w + 2 and 0 <= y + dy < h + 1 and po[x + dx, y + dy][3] for dx, dy in ((-1, 0), (1, 0), (0, 1)))]
    for q in ajout:
        po[q] = sombre + (255,)
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
    variantes = [cadre(h) for h in herbes_dessinees()]
    planche = Image.new('RGBA', (L * len(PENTES), H * len(variantes)))
    for r, v in enumerate(variantes):
        for c, d in enumerate(PENTES):
            planche.alpha_composite(pencher(v, d), (c * L, r * H))
    planche.save(SORTIE)
    print(f'assets/herbe_haute.png : {len(variantes)} herbes × {len(PENTES)} images de {L} × {H}')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', planche.size, (120, 170, 70, 255))
        fond.alpha_composite(planche)
        fond.resize((fond.width * 8, fond.height * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_herbe_haute.png'))


if __name__ == '__main__':
    main()
