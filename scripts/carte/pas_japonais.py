# Les pas japonais : des pas d'ardoise, de pierre ou de bois enfoncés dans l'herbe, pour habiller
# les allées de la ferme (des sols du dehors, posés comme le chemin : BLOCS sol_pas_*).
#
#   python3 scripts/carte/pas_japonais.py            écrit assets/pas_japonais.png et les icônes
#   python3 scripts/carte/pas_japonais.py --apercu   écrit aussi apercu_pas_japonais.png
#
# Vue de haut à 45° comme la carte (un dessus aplati : une profondeur de p px se voit sur p × FOND),
# lumière en haut à gauche. Un pas est enfoncé, au ras du sol :
#   - ni tranche ni ombre portée ;
#   - un joint autour, qui assombrit le sol d'en dessous en haut et à gauche (le bord du creux lui
#     fait de l'ombre) et l'éclaire en bas et à droite (la paroi du creux regarde la lumière) : le
#     joint est demi-transparent, la tuile laisse voir l'herbe (ou la terre) de la carte ;
#   - le bord haut-gauche du pas dans l'ombre ;
#   - des brins d'herbe qui débordent sur ses bords ;
#   - des tons sourds, usés, proches du sol, sans contour noir.
# Les trois sortes (SORTES, dans l'ordre de BLOCS_CARTE.pasJaponais.sortes) :
#   sol_pas_ardoise : deux éclats d'ardoise bleutée par case, en pas alternés ;
#   sol_pas_pierre  : une dalle de pierre irrégulière ;
#   sol_pas_bois    : deux rondelles de bois patiné (une grande, une petite), leurs cernes, une fente.
#
# La planche : par sorte, 4 rangées de 16 images (une par masque des voisins de même sorte, comme
# les autres sols : 1 au-dessus, 2 à droite, 4 au-dessous, 8 à gauche). Les rangées : le côté du pas
# (0 : à droite de l'axe de l'allée, 1 : à gauche ; le jeu alterne d'une case à l'autre) puis la
# forme (deux tirages). Une allée qui va de gauche à droite (des voisins à gauche ou à droite, aucun
# au-dessus ni au-dessous) a ses pas tournés en travers. L'image n° sorte × 64 + (côté + 2 × forme)
# × 16 + masque (js/carte/ferme/chantier.js, syncFloors).
#
# Les icônes (assets/icones/pas_*.png, 16 × 16) : un carré d'herbe, ses pas.
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT  # noqa: E402

T = 16
FOND = 10 / 16
SORTIE = os.path.join(ASSETS, 'pas_japonais.png')


def bruit(x, y, g):
    return random.Random(x * 7919 + y * 104729 + g * 31337).random()


# ---------- les formes, au sol (x à droite, y vers le bas, aplaties par la vue) ----------

def galet(cx, cy, rx, rug, rnd):
    """Un contour arrondi, irrégulier : son rayon varie avec l'angle."""
    ph = [rnd.uniform(0, 6.3) for _ in range(3)]
    am = [rnd.uniform(0, rug) for _ in range(3)]

    def dedans(x, y):
        dx, dy = (x - cx) / rx, (y - cy) / (rx * FOND)
        a = math.atan2(dy, dx)
        return math.hypot(dx, dy) <= 1 + am[0] * math.sin(2 * a + ph[0]) + am[1] * math.sin(3 * a + ph[1]) + am[2] * math.sin(5 * a + ph[2])
    return dedans


def eclat(cx, cy, rx, rnd, n=6, rug=0.18):
    """Un éclat anguleux (l'ardoise) : n sommets, chacun à son rayon."""
    ang = rnd.uniform(0, 1)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.22, 0.22) + ang
        rr = rx * (1 - rnd.uniform(0, rug))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * FOND))

    def dedans(x, y):
        ok, j = False, len(pts) - 1
        for i in range(len(pts)):
            (xi, yi), (xj, yj) = pts[i], pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                ok = not ok
            j = i
        return ok
    return dedans


# ---------- un pas enfoncé ----------

HERBE = [(70, 110, 34), (104, 140, 44), (144, 178, 56)]     # des brins, du sombre au clair
OMBRE = (24, 18, 10, 140)                                   # le joint, en haut et à gauche
LUMIERE = (255, 236, 190, 60)                               # la paroi du creux, en bas et à droite


def enfoncer(px, dedans, couleur, g):
    """Pose un pas sur la tuile px. couleur(x, y, rive) : son dessus ; rive : 'ombre' (le bord
    haut-gauche), 'lumiere' (le bord bas-droit), None."""
    M = {(x, y) for y in range(-3, T + 3) for x in range(-3, T + 3) if dedans(x + 0.5, y + 0.5)}
    joint = {(x + dx, y + dy) for (x, y) in M for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - M
    for (x, y) in joint:
        if 0 <= x < T and 0 <= y < T and px[x, y][3] < 200:
            px[x, y] = OMBRE if ((x, y + 1) in M or (x + 1, y) in M) else LUMIERE
    for (x, y) in M:
        if 0 <= x < T and 0 <= y < T:
            ombre = (x, y - 1) not in M or (x - 1, y) not in M
            lum = (x, y + 1) not in M or (x + 1, y) not in M
            px[x, y] = couleur(x, y, 'ombre' if ombre else 'lumiere' if lum else None) + (255,)
    # des brins qui débordent sur le bord du pas
    bords = sorted(p for p in joint if 0 <= p[0] < T and 1 <= p[1] < T)
    r = random.Random(g * 97 + 5)
    for (x, y) in r.sample(bords, min(len(bords), 5)):
        if (x, y - 1) in M or (x + 1, y) in M or (x - 1, y) in M:
            px[x, y] = HERBE[1] + (255,)
            if (x, y - 1) in M:
                px[x, y - 1] = HERBE[2 if r.random() < 0.5 else 0] + (255,)


def teinte(rampe, grain, gr):
    """Une surface : la rampe (sombre, ombre, moyen, clair) ; grain : la part des pixels qui
    changent de ton."""
    def f(x, y, rive):
        if rive == 'ombre':
            return rampe[1]
        k = bruit(x, y, gr)
        if k < grain * 0.5:
            return rampe[1]
        if k > 1 - grain * 0.5:
            return rampe[3]
        return rampe[3] if rive == 'lumiere' else rampe[2]
    return f


# ---------- les matières : des tons sourds ----------

ARDOISE = [(40, 46, 60), (62, 70, 88), (84, 94, 112), (106, 116, 132)]
PIERRE = [(98, 92, 80), (128, 122, 108), (152, 146, 130), (174, 168, 150)]
BOIS = [(84, 72, 58), (112, 98, 80), (138, 124, 102), (160, 148, 124)]          # le bois patiné


def feuillets(rampe):
    """L'ardoise : des feuillets en biais, à peine plus sombres."""
    base = teinte(rampe, 0.25, 11)

    def f(x, y, rive):
        if rive is None and (x * 2 + y * 3) % 8 == 0:
            return rampe[1]
        return base(x, y, rive)
    return f


def cernes(cx, cy, rx, rampe):
    """Le dessus d'une rondelle : ses cernes, son cœur, une fente ; l'écorce au bord."""
    def f(x, y, rive):
        dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / (rx * FOND)
        d = math.hypot(dx, dy)
        if d > 0.84:
            return rampe[0]
        if rive == 'ombre':
            return rampe[1]
        if abs(dx * 0.5 + dy) < 0.1 and 0.1 < dx and d < 0.72:
            return rampe[0]
        if d < 0.16:
            return rampe[1]
        if int(d * 5) % 2:
            return rampe[2]
        return rampe[3] if rive == 'lumiere' or bruit(x, y, 7) >= 0.5 else rampe[2]
    return f


# ---------- les sortes ----------
# Chacune : (px, rnd, graine, cote, travers). cote : +1 / -1, le côté de l'axe de l'allée ;
# travers : l'allée va de gauche à droite.

def ardoise(px, r, g, cote, travers):
    for k, s in ((0, -cote), (1, cote)):
        if travers:
            cx, cy = 4.2 + 7.6 * k, 8 + s * 1.8
        else:
            cx, cy = 8 + s * 2.8, 4.6 + 7 * k
        enfoncer(px, eclat(cx, cy, r.uniform(4.6, 5.2), r), feuillets(ARDOISE), g + k)


def pierre(px, r, g, cote, travers):
    cx, cy = (8, 8 + cote * 1.6 * FOND) if travers else (8 + cote * 1.6, 8)
    enfoncer(px, galet(cx, cy, r.uniform(6.6, 7.2), 0.11, r), teinte(PIERRE, 0.35, 21), g)


def bois(px, r, g, cote, travers):
    for k, (u, v, rr) in enumerate(((-2.2, -2.4, 5.4), (3.6, 3.6, 3.8))):
        if travers:
            u, v = v * 1.1, u * 0.9
        cx, cy = 8 + u * cote, 8 + v
        enfoncer(px, galet(cx, cy, rr, 0.02, r), cernes(cx, cy, rr, BOIS), g + k)


SORTES = [('sol_pas_ardoise', ardoise), ('sol_pas_pierre', pierre), ('sol_pas_bois', bois)]


def image(f, n, cote, forme, m):
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    travers = bool(m & 10) and not (m & 5)
    g = n * 1000 + forme * 100 + cote * 10 + 1
    f(im.load(), random.Random(g), g, 1 if cote == 0 else -1, travers)
    return im


def planche():
    out = Image.new('RGBA', (16 * T, len(SORTES) * 4 * T), (0, 0, 0, 0))
    for n, (_, f) in enumerate(SORTES):
        for forme in range(2):
            for cote in range(2):
                rang = n * 4 + cote + 2 * forme
                for m in range(16):
                    out.alpha_composite(image(f, n, cote, forme, m), (m * T, rang * T))
    return out


# ---------- les icônes : un carré d'herbe et ses pas ----------

ICONES = {'sol_pas_ardoise': 'pas_ardoise.png', 'sol_pas_pierre': 'pas_pierre.png', 'sol_pas_bois': 'pas_bois.png'}
HERBE_ICONE = [(30, 70, 26), (88, 140, 52), (112, 164, 60), (134, 186, 70)]


def icone(f, n):
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    px = im.load()
    for y in range(T):
        for x in range(T):
            bord = x in (0, T - 1) or y in (0, T - 1)
            k = bruit(x, y, 40 + n)
            px[x, y] = (HERBE_ICONE[0] if bord else HERBE_ICONE[3] if k > 0.85 else HERBE_ICONE[1] if k < 0.2 else HERBE_ICONE[2]) + (255,)
    pas = image(f, n, 0, 0, 5)                   # une allée de haut en bas
    im.alpha_composite(pas)
    for y in range(T):                           # le bord, par-dessus
        for x in (0, T - 1):
            px[x, y] = HERBE_ICONE[0] + (255,)
            px[y, x] = HERBE_ICONE[0] + (255,)
    return im


def main():
    p = planche()
    p.save(SORTIE)
    print(f'assets/pas_japonais.png : {len(SORTES)} sortes × 64 images de {T} × {T}')
    for n, (nom, f) in enumerate(SORTES):
        icone(f, n).save(os.path.join(ASSETS, 'icones', ICONES[nom]))
    print('assets/icones/' + ', '.join(ICONES.values()))
    if '--apercu' in sys.argv:
        herbe = Image.open(os.path.join(ASSETS, 'herbe_chemin.png')).convert('RGBA')
        fond = Image.new('RGBA', p.size)
        for y in range(0, p.height, T):
            for x in range(0, p.width, T):
                fond.paste(herbe.crop(((x // T) % 16 * T, 0, (x // T) % 16 * T + T, T)), (x, y))
        fond.alpha_composite(p)
        fond.resize((fond.width * 4, fond.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_pas_japonais.png'))
        print('apercu_pas_japonais.png')


if __name__ == '__main__':
    main()
