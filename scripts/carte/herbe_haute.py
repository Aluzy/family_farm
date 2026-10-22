# L'herbe haute de la carte : les trois herbes dessinées à la main de
# scripts/carte/originaux/herbes_hautes.png, telles quelles, avec cinq images d'oscillation
# chacune (le jeu les joue quand le personnage la traverse, voir TALL_GRASS dans
# js/farm-stage.js ; il les teinte d'après l'herbe sous leur pied).
#
#   python3 scripts/carte/herbe_haute.py            écrit assets/herbe_haute.png et
#                                                   assets/herbe_haute_fleurs.png
#   python3 scripts/carte/herbe_haute.py --apercu   écrit aussi apercu_herbe_haute.png
#
# assets/herbe_haute.png : des cases de L × H px, pied au milieu du bas ; une rangée par variante,
# une colonne par image : 0 droite, 1 et 2 penchée à
# droite (un peu, plus), 3 et 4 penchée à gauche. Les brins penchent d'autant plus qu'ils sont
# hauts (le pied ne bouge pas).
#
# Les variantes : les trois herbes du modèle (de gauche à droite), dans chaque TEINTE (le vert du
# modèle, puis ses tons rapportés à une autre gamme, luminosité gardée), sans puis avec des
# fleurs (une tige d'un pixel qui dépasse du bout d'un brin, une petite fleur au bout). Rangée
# r = herbe + 3 × (2 × teinte + fleurs) : les rangées 0..2 restent les herbes du modèle.
# assets/herbe_haute_fleurs.png (même découpe) : les fleurs seules ; le jeu les pose par-dessus
# la touffe sans la teinte du sol, qui les ternirait.
#
# Les zones d'herbe haute étaient posées sur la carte de Tiled par l'ancien scripts/carte/carte_v2.py (couche
# d'objets « herbe_haute » : un point par touffe, type = rangée de l'herbe).
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, T, apercu  # noqa: E402
HERBES = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'herbes_hautes.png')
SORTIE = os.path.join(ASSETS, 'herbe_haute.png')
SORTIE_FLEURS = os.path.join(ASSETS, 'herbe_haute_fleurs.png')
L, H = 22, 20                    # (le haut : la place des tiges fleuries)
H0 = 16                          # la hauteur des herbes du modèle
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


# Les teintes : (sombre, moyen, clair) ; chaque couleur du modèle prend la couleur de la gamme
# à sa luminosité (relative au vert le plus sombre et au plus clair du modèle).
TEINTES = [
    None,                                                      # le vert du modèle
    ((34, 62, 6), (88, 112, 30), (160, 178, 60)),               # vert roussi
    ((62, 42, 14), (124, 92, 40), (190, 154, 84)),              # brun léger
    ((40, 18, 44), (84, 44, 88), (140, 94, 132)),               # mauve foncé
]
# Les fleurs : (pétale, cœur), une par tige.
FLEURS = [((238, 236, 222), (236, 200, 60)), ((236, 196, 70), (196, 120, 30)),
          ((222, 132, 170), (250, 214, 226)), ((150, 170, 232), (236, 236, 250)),
          ((196, 140, 220), (240, 220, 250))]


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def teinter(img, gamme):
    if gamme is None:
        return img.copy()
    px = img.load()
    cs = [px[x, y][:3] for y in range(img.height) for x in range(img.width) if px[x, y][3]]
    l0, l1 = min(map(lum, cs)), max(map(lum, cs))
    out = img.copy()
    po = out.load()
    for y in range(img.height):
        for x in range(img.width):
            if not px[x, y][3]:
                continue
            t = (lum(px[x, y]) - l0) / max(1, l1 - l0)
            a, b, k = (gamme[0], gamme[1], t * 2) if t < 0.5 else (gamme[1], gamme[2], t * 2 - 1)
            po[x, y] = tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(3)) + (255,)
    return out


def fleurir(img, graine):
    """Une à deux tiges d'un pixel, du ton moyen de l'herbe, qui partent du bout d'un brin et
    dépassent de 2 à 3 px ; au bout, une petite fleur (le cœur, un pétale à côté et un dessus).
    Renvoie la touffe fleurie et ses fleurs seules."""
    hasard = random.Random(graine)
    out = img.copy()
    seules = Image.new('RGBA', img.size)
    ps = seules.load()
    po = out.load()
    w, h = out.size
    cs = sorted((po[x, y][:3] for y in range(h) for x in range(w) if po[x, y][3]), key=lum)
    tige = cs[len(cs) // 2]
    # les bouts des brins : un pixel sans rien au-dessus, haut dans la touffe
    bouts = [(x, y) for x in range(1, w - 1) for y in range(h) if po[x, y][3] and (y == 0 or not po[x, y - 1][3])
             and all(not po[x, yy][3] for yy in range(y))]
    bouts.sort(key=lambda q: q[1])
    bouts = [q for q in bouts if q[1] <= bouts[0][1] + 4]
    hasard.shuffle(bouts)
    pris = []
    for (x, y) in bouts:
        if len(pris) == (1 if hasard.random() < 0.5 else 2):
            break
        if any(abs(x - px_) < 4 for px_ in pris):
            continue
        n = hasard.choice((2, 3))
        if y - n - 1 < 1:
            continue
        for k in range(1, n + 1):
            po[x, y - k] = tige + (255,)
        petale, coeur = hasard.choice(FLEURS)
        fy = y - n - 1
        cote = hasard.choice((-1, 1))
        for q, c in (((x, fy), coeur), ((x, fy - 1), petale), ((x + cote, fy), petale)):
            po[q] = ps[q] = c + (255,)
        pris.append(x)
    return out, seules


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
        k = round(d * (img.height - 1 - y) / (H0 - 1))
        out.alpha_composite(img.crop((0, y, img.width, y + 1)), (k, y))
    return out


def double(t, dx):
    """Une touffe haute : une deuxième touffe derrière, plus haut, décalée de dx px."""
    out = Image.new('RGBA', (t.width + abs(dx), t.height + 5))
    out.alpha_composite(t, (max(0, dx), 0))
    out.alpha_composite(t.transpose(Image.FLIP_LEFT_RIGHT), (max(0, -dx), 5))
    return out


def main():
    herbes = [cadre(h) for h in herbes_dessinees()]
    variantes, fleurs = [], []
    for t, gamme in enumerate(TEINTES):
        for fleuri in (False, True):
            for n, h in enumerate(herbes):
                v, f = fleurir(teinter(h, gamme), 10 * t + n) if fleuri else (teinter(h, gamme), Image.new('RGBA', h.size))
                variantes.append(v)
                fleurs.append(f)
    planche = Image.new('RGBA', (L * len(PENTES), H * len(variantes)))
    planche_fleurs = Image.new('RGBA', planche.size)
    for r, (v, f) in enumerate(zip(variantes, fleurs)):
        for c, d in enumerate(PENTES):
            planche.alpha_composite(pencher(v, d), (c * L, r * H))
            planche_fleurs.alpha_composite(pencher(f, d), (c * L, r * H))
    planche.save(SORTIE)
    planche_fleurs.save(SORTIE_FLEURS)
    print(f'assets/herbe_haute.png : {len(variantes)} variantes × {len(PENTES)} images de {L} × {H}')
    if '--apercu' in sys.argv:
        apercu(planche, 'apercu_herbe_haute.png', 8, (120, 170, 70))


if __name__ == '__main__':
    main()
