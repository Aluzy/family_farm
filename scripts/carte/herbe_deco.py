# Décors à poser sur la planche herbe_chemin : herbes hautes, fleurs, mauvaises herbes.
#
#   python3 scripts/carte/herbe_deco.py            écrit assets/herbe_deco.png et .tsx
#   python3 scripts/carte/herbe_deco.py --apercu   écrit aussi apercu_herbe_deco.png
#
# Modèles (scripts/carte/originaux/) :
#   big_grass_1.png   des brins verticaux (une tuile pleine) : la texture des herbes hautes ;
#   big_grass_2.png   une touffe de mauvaise herbe sur la terre (feuilles, contour très sombre) ;
#   fleurs_1.png, fleurs_2.png   six fleurs de 3 × 4 (pétales, cœur jaune, feuilles, tige).
#
# Tuiles transparentes de 16 × 16, à poser par-dessus (calque au-dessus de l'herbe ou du
# chemin), 16 par rangée :
#   rangées 0 à 3   herbes hautes, une rangée par teinte d'herbe (TEINTES_HERBE de
#                   herbe_chemin.py) : des touffes de brins en éventail, petites à larges, ou
#                   deux et trois ensemble, plus profondes que le sol, pointes claires,
#                   contour sombre, une ombre légère au pied ;
#   rangées 4 à 7   fleurs, une rangée par teinte d'herbe (les tiges et les feuilles suivent
#                   la teinte) : 1 à 4 fleurs par tuile, d'une couleur ou mêlées ;
#   rangée 8        mauvaises herbes vertes, pour la terre et le chemin : des touffes de
#                   formes et de tailles diverses, contour très sombre comme le modèle ;
#   rangée 9        les mêmes, sèches (jaune olive).
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import herbe_chemin as HC  # noqa: E402  (teintes d'herbe, planche herbe_chemin.png)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, T, cote_a_cote  # noqa: E402
ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')
SORTIE = os.path.join(ASSETS, 'herbe_deco')
COLS = 16

# Herbes hautes : les couleurs du modèle (de la plus sombre à la plus claire), et celles de
# l'herbe de la planche qui les remplacent (du vert sombre des traits au reflet vif).
HAUTE_MODELE = [(14, 45, 2), (23, 75, 4), (54, 141, 21), (47, 156, 5), (116, 220, 75)]
HAUTE_HERBE = [(8, 66, 0), (36, 108, 4), (62, 146, 6), (104, 196, 14), (150, 238, 52)]
# Mauvaise herbe : contour (le cadre du modèle) et couleurs des feuilles ; la même, sèche.
MAUVAISE = {(9, 30, 1): (9, 30, 1), (14, 45, 2): (14, 45, 2), (23, 75, 4): (23, 75, 4),
            (54, 141, 21): (54, 141, 21), (116, 220, 75): (116, 220, 75)}
SECHE = {(9, 30, 1): (44, 34, 6), (14, 45, 2): (66, 52, 8), (23, 75, 4): (110, 92, 16),
         (54, 141, 21): (156, 136, 32), (116, 220, 75): (206, 192, 84)}
# Fleurs : pétales (sombre, moyen, clair). Les quatre du modèle, puis d'autres.
PETALES = {
    'rouge': [(114, 0, 0), (144, 0, 0), (174, 0, 0)],
    'orange': [(206, 139, 29), (219, 148, 31), (229, 167, 67)],
    'bleu': [(110, 140, 176), (138, 164, 193), (168, 190, 214)],
    'magenta': [(186, 4, 197), (214, 4, 227), (239, 40, 251)],
    'blanc': [(196, 198, 210), (228, 230, 236), (252, 252, 252)],
    'jaune': [(214, 170, 8), (240, 204, 30), (252, 232, 96)],
    'violet': [(88, 44, 150), (118, 66, 192), (156, 106, 228)],
    'rose': [(208, 96, 140), (234, 138, 172), (250, 184, 206)],
}
COEUR = (225, 194, 76)
TIGES = [(7, 69, 0), (8, 84, 0), (10, 99, 0), (14, 129, 0)]


def charger(nom):
    return Image.open(os.path.join(ORIG, nom)).convert('RGBA')


def ombre_pied(out, cx, y, rx, teinte):
    """Une ombre douce au pied d'une touffe : la plus sombre des couleurs de l'herbe."""
    c = HC.teinte((10, 99, 0), teinte)
    for x in range(int(cx - rx), int(cx + rx) + 1):
        for dy in (0, 1):
            yy = y + dy
            if not (0 <= x < T and 0 <= yy < T) or out.getpixel((x, yy))[3]:
                continue
            d = abs(x + 0.5 - cx) / rx + dy * 0.6
            if d < 1 and (d < 0.6 or BAYER[yy % 4][x % 4] < 8):
                out.putpixel((x, yy), c + (80 if d < 0.6 else 50,))


# ---------------------------------------------------------------- herbes hautes

def touffe(texture, rng, cx, largeur, hauteur, base, teinte, out):
    """Une touffe de feuilles en pointe, en éventail : chaque feuille part du pied (2 ou 3
    pixels de large), s'affine jusqu'à sa pointe et s'écarte du milieu en montant ; les plus
    hautes au milieu. Éclairée à gauche (comme la carte), un reflet à la pointe, les rayures du
    modèle (big_grass_1) dans le vert du corps ; un contour sombre la détache de l'herbe, une
    ombre légère la pose au sol. Couleurs : celles de l'herbe, plus profondes, même teinte."""
    table = [HC.teinte(h, teinte) for h in HAUTE_HERBE]
    contour, ombre, corps, clair, reflet = table
    pointe = HC.teinte((182, 252, 100), teinte)
    nb = max(2, int(round(largeur / 3.2)) + 1)
    dx0 = rng.randrange(T)
    feuilles = []
    for i in range(nb):
        bx = cx - largeur / 2 + (i + 0.5) * largeur / nb
        u = (bx - cx) / (largeur / 2)
        h = hauteur * (1 - 0.45 * u * u) * rng.uniform(0.75, 1.0)
        pente = u * rng.uniform(0.35, 0.6) + rng.uniform(-0.08, 0.08)
        larg = 3 if abs(u) < 0.5 else 2
        feuilles.append((h, bx, pente, larg))
    masque = {}
    # les plus hautes (au fond) d'abord, les plus basses devant
    for h, bx, pente, larg in sorted(feuilles, key=lambda f: -f[0]):
        n = max(2, int(round(h)))
        for t in range(n + 1):
            y = base - t
            if y < 0:
                break
            c0 = bx + pente * t
            demi = max(0.5, larg / 2 * (1 - t / n))
            for x in range(int(math.floor(c0 - demi)), int(math.ceil(c0 + demi))):
                if not (0 <= x < T) or abs(x + 0.5 - c0) > demi + 0.01:
                    continue
                if t == n:
                    c = pointe
                elif t >= n - 2:
                    c = reflet
                elif x + 0.5 < c0:
                    c = clair                                  # côté éclairé
                else:
                    src = texture.getpixel(((x + dx0) % T, y))[:3]
                    c = ombre if src in HAUTE_MODELE[:2] else corps
                if t <= 1:
                    c = ombre                                  # pied dans l'ombre
                masque[(x, y)] = c
    for (x, y), c in masque.items():
        out.putpixel((x, y), c + (255,))
    for (x, y) in list(masque):
        for q in ((x - 1, y), (x + 1, y), (x, y - 1), (x - 1, y - 1), (x + 1, y - 1)):
            if q not in masque and 0 <= q[0] < T and 0 <= q[1] < T and q[1] <= base and out.getpixel(q)[3] < 255:
                if q[1] == y - 1 and q[0] != x and (q[0], y) in masque:
                    continue                                   # diagonales : seulement au-dessus du vide
                out.putpixel(q, contour + (255,))
    ombre_pied(out, cx, base + 1, largeur / 2 + 1.5, teinte)


def herbe_haute(texture, n, teinte):
    """La n-ième variante (0 à 15) : une touffe petite, moyenne, large, ou deux, ou trois."""
    rng = random.Random(3000 + n)
    out = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    formes = [
        [(8, 7, 8)], [(8, 9, 10)], [(8, 11, 12)], [(8, 13, 13)],
        [(5, 6, 7), (11, 6, 9)], [(5, 7, 10), (11, 5, 7)], [(4, 5, 6), (9, 6, 9), (13, 4, 6)],
        [(8, 5, 6)], [(7, 9, 9)], [(9, 10, 11)], [(4, 6, 8), (12, 6, 8)], [(8, 12, 13)],
        [(3, 5, 6), (8, 6, 10), (13, 5, 6)], [(7, 7, 7)], [(8, 13, 11)], [(5, 8, 11), (12, 5, 6)],
    ]
    for cx, larg, haut in sorted(formes[n % len(formes)], key=lambda f: -f[2]):
        base = rng.randint(13, 14)
        touffe(texture, rng, cx + rng.uniform(-0.5, 0.5), larg, haut, base, teinte, out)
    return out


# ---------------------------------------------------------------- fleurs

def gabarits(*images):
    """Les fleurs des modèles : pour chacune, ses pixels par rôle (pétales triés du plus sombre
    au plus clair, cœur, tiges et feuilles), relatifs à son coin haut-gauche."""
    out = []
    for im in images:
        vus = set()
        for y in range(T):
            for x in range(T):
                if im.getpixel((x, y))[3] == 0 or (x, y) in vus:
                    continue
                pile, comp = [(x, y)], []
                vus.add((x, y))
                while pile:
                    p = pile.pop()
                    comp.append(p)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            q = (p[0] + dx, p[1] + dy)
                            if 0 <= q[0] < T and 0 <= q[1] < T and q not in vus and im.getpixel(q)[3]:
                                vus.add(q)
                                pile.append(q)
                x0, y0 = min(p[0] for p in comp), min(p[1] for p in comp)
                cols = {p: im.getpixel(p)[:3] for p in comp}
                petales = sorted({c for c in cols.values() if c != COEUR and c not in TIGES}, key=lambda c: sum(c))
                roles = {}
                for (px, py), c in cols.items():
                    if c == COEUR:
                        r = 'coeur'
                    elif c in TIGES:
                        r = ('tige', TIGES.index(c))
                    else:
                        k = petales.index(c)
                        r = ('petale', 0 if len(petales) == 1 else round(k * 2 / (len(petales) - 1)))
                    roles[(px - x0, py - y0)] = r
                out.append(roles)
    return out


def poser_fleur(out, g, x, y, couleur, teinte):
    for (dx, dy), r in g.items():
        if r == 'coeur':
            c = COEUR
        elif r[0] == 'tige':
            c = HC.teinte(TIGES[r[1]], teinte)
        else:
            c = PETALES[couleur][r[1]]
        out.putpixel((x + dx, y + dy), c + (255,))


def fleurs(gabs, n, teinte):
    """La n-ième variante : 1 à 4 fleurs, d'une couleur ou mêlées, placées sans se toucher."""
    rng = random.Random(4000 + n)
    out = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    couleurs = list(PETALES)
    nb = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 1, 2, 3, 2, 3, 4][n % 16]
    une = rng.random() < 0.5
    c0 = couleurs[n % len(couleurs)]
    places = []
    for _ in range(nb):
        for _essai in range(60):
            x, y = rng.randint(1, T - 4), rng.randint(1, T - 5)
            if all(abs(x - a) > 3 or abs(y - b) > 4 for a, b in places):
                places.append((x, y))
                break
    for x, y in sorted(places, key=lambda p: p[1]):
        poser_fleur(out, rng.choice(gabs), x, y, c0 if une else rng.choice(couleurs), teinte)
    return out


# ---------------------------------------------------------------- mauvaises herbes

def texture_mauvaise(modele):
    """Les feuilles du modèle (sans le jaune de la terre ni le cadre), en texture 14 × 14."""
    tex = Image.new('RGBA', (14, 14))
    for y in range(14):
        for x in range(14):
            c = modele.getpixel((x + 1, y + 1))[:3]
            tex.putpixel((x, y), (c if c in MAUVAISE else (23, 75, 4)) + (255,))
    return tex


def mauvaise(tex, n, seche):
    """La n-ième variante : une touffe faite de 1 à 3 ronds bosselés, la texture du modèle
    dedans, un contour très sombre autour (plus épais en bas : la touffe pose sur la terre)."""
    rng = random.Random(5000 + n)
    table = SECHE if seche else MAUVAISE
    ronds = [[(8, 8, 6.5)], [(8, 9, 5)], [(8, 10, 3.6)], [(6, 9, 4), (11, 10, 3.2)],
             [(5, 10, 3), (11, 8, 4)], [(8, 8, 5.5), (12, 12, 2.5)], [(4, 11, 2.6), (8, 9, 3.4), (12, 11, 2.6)],
             [(8, 11, 2.8)], [(7, 8, 5.5)], [(9, 9, 6)], [(5, 6, 3), (10, 11, 4)], [(8, 9, 4.5), (4, 12, 2)],
             [(8, 7, 6.8)], [(6, 10, 3.5), (11, 7, 3.5)], [(10, 10, 4)], [(4, 9, 2.6), (11, 10, 2.6)]][n % 16]
    graine = rng.random() * 10
    dedans = lambda x, y: any(
        math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1) < r * (1 + 0.18 * math.sin(math.atan2(y - cy, x - cx) * 5 + graine))
        for cx, cy, r in ronds)
    fx, fy = rng.random() < 0.5, rng.random() < 0.5
    masque = {(x, y) for y in range(1, T - 1) for x in range(1, T - 1) if dedans(x, y)}
    out = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    for (x, y) in masque:
        tx, ty = (13 - (x - 1) if fx else x - 1), (13 - (y - 1) if fy else y - 1)
        out.putpixel((x, y), table[tex.getpixel((tx % 14, ty % 14))[:3]] + (255,))
    contour, sol = table[(14, 45, 2)], table[(9, 30, 1)]
    for y in range(T):
        for x in range(T):
            if (x, y) in masque:
                continue
            voisins = [(x + dx, y + dy) in masque for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(voisins):
                out.putpixel((x, y), (sol if (x, y - 1) in masque else contour) + (255,))
    return out


# ---------------------------------------------------------------- planche

def planche():
    tex_haute = charger('big_grass_1.png')
    gabs = gabarits(charger('fleurs_1.png'), charger('fleurs_2.png'))
    tex_mauv = texture_mauvaise(charger('big_grass_2.png'))
    nh = len(HC.TEINTES_HERBE)
    out = Image.new('RGBA', (COLS * T, (2 * nh + 2) * T), (0, 0, 0, 0))
    for h, t in enumerate(HC.TEINTES_HERBE):
        for n in range(COLS):
            out.paste(herbe_haute(tex_haute, n, t), (n * T, h * T))
            out.paste(fleurs(gabs, n, t), (n * T, (nh + h) * T))
    for k, seche in enumerate((False, True)):
        for n in range(COLS):
            out.paste(mauvaise(tex_mauv, n, seche), (n * T, (2 * nh + k) * T))
    return out


def tsx(img):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="herbe_deco" tilewidth="{T}" tileheight="{T}" tilecount="{(img.width // T) * (img.height // T)}" columns="{img.width // T}">
 <image source="herbe_deco.png" width="{img.width}" height="{img.height}"/>
</tileset>
'''


def apercu(deco):
    """Une carte herbe_chemin (sa propre carte d'exemple), avec des décors semés par-dessus :
    herbes hautes et fleurs sur l'herbe (de sa teinte), mauvaises herbes sur le chemin."""
    hc = Image.open(HC.SORTIE + '.png').convert('RGBA')
    _, raccords = HC.planche(Image.open(HC.MODELE).convert('RGBA'))
    W, H = 30, 18
    carte = HC.apercu(hc, raccords)
    # la carte d'exemple est à droite de la planche, agrandie × 3 : on la reprend à la taille 1
    z = 3
    bx = hc.width * z + 24
    sol = carte.crop((bx, 0, bx + W * T * z, H * T * z)).resize((W * T, H * T), Image.NEAREST)
    rng = random.Random(11)
    nh = len(HC.TEINTES_HERBE)
    for ty in range(H):
        for tx in range(W):
            tuile = sol.crop((tx * T, ty * T, (tx + 1) * T, (ty + 1) * T))
            px = list(tuile.get_flattened_data())
            jaune = sum(1 for p in px if p[0] > 150 and p[1] > 100 and p[2] < 60)
            vert = len(px) - jaune
            r = rng.random()
            if jaune == len(px):
                if r < 0.18:
                    n = rng.randrange(COLS)
                    k = 1 if rng.random() < 0.35 else 0
                    sol.alpha_composite(deco.crop((n * T, (2 * nh + k) * T, (n + 1) * T, (2 * nh + k + 1) * T)), (tx * T, ty * T))
            elif vert == len(px):
                # la teinte d'herbe de la tuile : la plus proche de sa couleur moyenne
                moy = [sum(p[i] for p in px) / len(px) for i in range(3)]
                h = min(range(nh), key=lambda k: sum((a - b) ** 2 for a, b in zip(moy, HC.teinte((118, 197, 4), HC.TEINTES_HERBE[k]))))
                if r < 0.10:
                    rang = h
                elif r < 0.20:
                    rang = nh + h
                else:
                    continue
                n = rng.randrange(COLS)
                sol.alpha_composite(deco.crop((n * T, rang * T, (n + 1) * T, (rang + 1) * T)), (tx * T, ty * T))
    a = sol.resize((sol.width * z, sol.height * z), Image.NEAREST)
    fond = Image.new('RGBA', deco.size, (118, 197, 4, 255))
    for k in range(2 * nh, 2 * nh + 2):
        for x in range(COLS):
            fond.paste(Image.new('RGBA', (T, T), HC.CHEMIN_FOND + (255,)), (x * T, k * T))
    for h in range(nh):
        c = HC.teinte((118, 197, 4), HC.TEINTES_HERBE[h])
        for k in (h, nh + h):
            fond.paste(Image.new('RGBA', (COLS * T, T), c + (255,)), (0, k * T))
    fond.alpha_composite(deco)
    b = fond.resize((fond.width * z, fond.height * z), Image.NEAREST)
    return cote_a_cote(b, a)


def main():
    img = planche()
    img.save(SORTIE + '.png')
    with open(SORTIE + '.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx(img))
    print(f'assets/herbe_deco.png : {img.width // T} × {img.height // T} tuiles ; assets/herbe_deco.tsx')
    if '--apercu' in sys.argv:
        apercu(img).save(os.path.join(ROOT, 'apercu_herbe_deco.png'))
        print('apercu_herbe_deco.png')


if __name__ == '__main__':
    main()
