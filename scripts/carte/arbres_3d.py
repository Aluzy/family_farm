# Les arbres de la carte en volume (effet 3D), à partir des planches d'origine du pack.
#
#   python3 scripts/carte/arbres_3d.py            refait les images ci-dessous
#   python3 scripts/carte/arbres_3d.py --apercu   écrit aussi apercu_arbres_3d.png (avant / après)
#
# Sources (jamais modifiées) : scripts/carte/originaux/ — farm_spring_summer.png (la planche
# de la carte), basic_sp.png et pine_sp.png (les feuilles de sprites des arbres : 8 images
# chacune, l'arbre qui tremble sous un coup de hache). Écrit dans assets/ :
#   - farm_spring_summer.png : la planche, où seules les tuiles posées dans les couches
#     d'arbres de la carte (layer_tree_*) sont refaites ;
#   - basic_sp.png, pine_sp.png : chaque image refaite de la même façon ;
#   - ombres_arbres.png : les ombres portées des arbres de la carte, une image de la taille
#     de la carte que js/farm-stage.js pose sur le sol (sous les arbres, qui en sont exclus) ;
#   - ombre_arbre.png : l'ombre d'un arbre seul, posée sous les arbres du Verger.
# Puis refaire assets/verger.png (python3 scripts/verger/arbres.py), qui part de basic_sp.png,
# et la planche agrandie (python3 scripts/carte/planche_v2.py) : ce script n'écrit que ses 45
# premières rangées.
#
# La lumière vient du haut à gauche, comme sur toute la carte. Le dessin garde ses pixels et
# ses couleurs : chaque pixel prend une autre couleur de sa famille (feuillage, tronc), plus
# claire ou plus sombre selon le volume ; les reflets bleus restent tels quels.
#   - Feuillage : un relief fait d'un dôme (le houppier entier, plus haut au cœur) et des
#     touffes que le dessin d'origine montre déjà (ses taches claires) ; ce relief est éclairé
#     (Lambert), et le dessous du houppier passe dans l'ombre (occlusion).
#   - Tronc : un cylindre, clair à gauche et sombre à droite, assombri sous les feuilles.
#   - Ombre portée : un ovale aplati au pied, poussé en bas à droite, au bord tramé.
# Deux teintes s'ajoutent au feuillage (un vert de reflet, un vert d'ombre profonde) et une au
# tronc (un brun d'ombre profonde). Un tramage ordonné adoucit le passage d'une teinte à l'autre.
import json
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, T, hls  # noqa: E402
ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')
# La carte d'origine (avant la version 2 du décor, scripts/carte/carte_v2.py) : ses arbres
# disent quelles tuiles de la planche refaire.
CARTE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'carte_printemps_elargie_v1.tmj')
if not os.path.exists(CARTE):
    CARTE = os.path.join(ASSETS, 'carte_printemps_elargie.tmj')
CARTE_JEU = os.path.join(ASSETS, 'carte_printemps_elargie.tmj')
COLS = 75                                   # colonnes de la planche
TRONC_MIN = 100                             # pixels de tronc d'un groupe de tuiles d'arbre
SPRITES = {'basic_sp.png': (80, 80), 'pine_sp.png': (58, 64)}

LUMIERE = (-0.55, -0.75, 0.9)               # vers la lumière : gauche, haut, vers l'écran
GAIN = 2.4                                  # crans de couleur par unité d'éclairage
CRAN = 0.12                                 # écart de luminosité d'un cran
EXTRA = {'f': [(196, 206, 142), (1, 30, 42)], 't': [(52, 24, 20)]}
OMBRE = (8, 40, 30)                         # teinte de l'ombre portée
OMBRE_A = 92                                # son opacité (sur 255) ; le bord tramé en vaut le tiers

_n = math.sqrt(sum(c * c for c in LUMIERE))
L = tuple(c / _n for c in LUMIERE)


def famille(c):
    """'f' feuillage, 'b' reflet bleu (inchangé), 't' tronc et branches."""
    h, l, s = hls(c)
    deg = h * 360
    if 205 <= deg <= 265 and s > 0.3:
        return 'b'
    if 60 <= deg < 205:
        return 'f'
    return 't'


class Palette:
    def __init__(self, couleurs):
        self.c = sorted(set(couleurs), key=lambda c: hls(c)[1])
        self.hls = [hls(c) for c in self.c]

    def proche(self, cible_l, h0, s0):
        best, bd = None, 9.0
        for c, (h, l, s) in zip(self.c, self.hls):
            dh = min(abs(h - h0), 1 - abs(h - h0))
            d = (l - cible_l) ** 2 + 0.35 * dh * dh + 0.12 * (s - s0) ** 2
            if d < bd:
                best, bd = c, d
        return best


def distance(masque, w, h):
    """Distance (en pixels, chanfrein 3-4) de chaque pixel du masque à son bord."""
    inf = 10 ** 6
    d = [0 if not m else inf for m in masque]
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if not d[i]:
                continue
            v = d[i]
            if x > 0: v = min(v, d[i - 1] + 3)
            else: v = min(v, 3)
            if y > 0:
                v = min(v, d[i - w] + 3)
                if x > 0: v = min(v, d[i - w - 1] + 4)
                if x < w - 1: v = min(v, d[i - w + 1] + 4)
            else:
                v = min(v, 3)
            d[i] = v
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            i = y * w + x
            if not d[i]:
                continue
            v = d[i]
            if x < w - 1: v = min(v, d[i + 1] + 3)
            else: v = min(v, 3)
            if y < h - 1:
                v = min(v, d[i + w] + 3)
                if x < w - 1: v = min(v, d[i + w + 1] + 4)
                if x > 0: v = min(v, d[i + w - 1] + 4)
            else:
                v = min(v, 3)
            d[i] = v
    return [v / 3 for v in d]


def composantes(masque, w, h):
    """Numéro de composante (8-connexité) de chaque pixel du masque, et leurs rangées."""
    num = [-1] * (w * h)
    rangs = []
    for i0 in range(w * h):
        if not masque[i0] or num[i0] >= 0:
            continue
        k = len(rangs)
        y0, y1 = h, 0
        pile = [i0]
        num[i0] = k
        while pile:
            i = pile.pop()
            x, y = i % w, i // w
            y0, y1 = min(y0, y), max(y1, y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h:
                        j = yy * w + xx
                        if masque[j] and num[j] < 0:
                            num[j] = k
                            pile.append(j)
        rangs.append((y0, y1))
    return num, rangs


def volume(img, palettes):
    """L'image refaite en volume (feuillage éclairé, tronc en cylindre)."""
    w, h = img.size
    px = list(img.convert('RGBA').get_flattened_data())
    fam = [famille(p[:3]) if p[3] > 0 else None for p in px]
    F = [f == 'f' for f in fam]
    lum = [hls(p[:3])[1] if F[i] else 0.0 for i, p in enumerate(px)]
    dist = distance(F, w, h)
    num, rangs = composantes(F, w, h)

    # détail : la luminosité d'origine, adoucie sur 3 × 3 (les touffes du dessin)
    det = [0.0] * (w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if not F[i]:
                continue
            s = n = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and F[yy * w + xx]:
                        s += lum[yy * w + xx]
                        n += 1
            det[i] = s / n
    haut = [(2.2 * math.sqrt(min(dist[i], 14)) + 9.0 * det[i]) if F[i] else 0.0 for i in range(w * h)]

    def hz(x, y):
        return haut[y * w + x] if 0 <= x < w and 0 <= y < h else 0.0

    out = list(px)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            f = fam[i]
            if f is None or f == 'b':
                continue
            p = px[i]
            h0, l0, s0 = hls(p[:3])
            if f == 'f':
                gx = (hz(x + 1, y) - hz(x - 1, y)) / 2
                gy = (hz(x, y + 1) - hz(x, y - 1)) / 2
                n = math.sqrt(gx * gx + gy * gy + 1)
                lam = (-gx * L[0] - gy * L[1] + L[2]) / n
                y0, y1 = rangs[num[i]]
                t = (y - y0) / max(1, y1 - y0)
                ao = max(0.0, t - 0.35) / 0.65 * 1.2 if y1 - y0 >= 12 else 0.0
                cran = (lam - 0.6) * GAIN - ao
            else:
                # tronc : la course horizontale de tronc qui contient ce pixel
                x0 = x
                while x0 > 0 and fam[i - (x - x0) - 1] == 't':
                    x0 -= 1
                x1 = x
                while x1 < w - 1 and fam[i + (x1 - x) + 1] == 't':
                    x1 += 1
                if x1 - x0 >= 2:
                    u = (x - x0) / (x1 - x0)
                    cran = 0.9 - 2.0 * u
                else:
                    cran = -0.3                                  # une branche fine
                if any(F[(y - k) * w + x] for k in range(1, 7) if y - k >= 0):
                    cran -= 0.7                                  # sous les feuilles
            cible = l0 + cran * CRAN + (BAYER[y % 4][x % 4] / 16 - 0.47) * CRAN * 0.8
            out[i] = palettes[f].proche(cible, h0, s0) + (p[3],)
    res = Image.new('RGBA', (w, h))
    res.putdata(out)
    return res


def carte():
    with open(CARTE, encoding='utf-8') as f:
        return json.load(f)


def couches_arbres(m):
    return [l for l in m['layers'] if l['type'] == 'tilelayer' and 'tree' in l['name'] and l.get('visible', True)]


def tuiles_arbres(m):
    """Numéros (dans la planche, à partir de 0) des tuiles posées dans les couches d'arbres."""
    first = next(t['firstgid'] for t in m['tilesets'] if 'farm_spring_summer' in (t.get('source') or t.get('name', '')))
    count = 3375
    out = set()
    for l in couches_arbres(m):
        for c in l['data']:
            g = c & 0x0FFFFFFF
            if first <= g < first + count:
                out.add(g - first)
    return out


def groupes(tuiles):
    """Les tuiles d'arbres groupées par voisinage dans la planche : un rectangle par groupe."""
    reste = set(tuiles)
    rects = []
    while reste:
        pile = [reste.pop()]
        groupe = set(pile)
        while pile:
            n = pile.pop()
            x, y = n % COLS, n // COLS
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                v = (y + dy) * COLS + x + dx
                if 0 <= x + dx < COLS and v in reste:
                    reste.discard(v)
                    groupe.add(v)
                    pile.append(v)
        xs = [n % COLS for n in groupe]
        ys = [n // COLS for n in groupe]
        rects.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, groupe))
    return rects


def palettes(images):
    cols = {'f': list(EXTRA['f']), 't': list(EXTRA['t'])}
    for im in images:
        for c in set(p[:3] for p in im.get_flattened_data() if p[3] > 0):
            f = famille(c)
            if f in cols:
                cols[f].append(c)
    return {f: Palette(c) for f, c in cols.items()}


def refaire_planche(planche, tuiles, pal):
    """La planche, où chaque groupe de tuiles d'arbres est refait (dans son entier, pour que
    le volume voie tout l'arbre) ; seules les tuiles posées dans la carte sont recopiées.
    Les couches d'arbres portent aussi des taches d'herbe, des fleurs, des champignons : un
    groupe sans vrai tronc (TRONC_MIN pixels) n'est pas un arbre et reste tel quel."""
    out = planche.copy()
    for x0, y0, x1, y1, groupe in groupes(tuiles):
        vue = planche.crop((x0 * T, y0 * T, x1 * T, y1 * T)).get_flattened_data()
        if sum(1 for p in vue if p[3] and famille(p[:3]) == 't') < TRONC_MIN:
            continue
        # une tuile de marge : l'arbre peut déborder sur une tuile qui n'est pas posée
        bx0, by0 = max(0, x0 - 1), max(0, y0 - 1)
        bx1, by1 = min(COLS, x1 + 1), min(planche.height // T, y1 + 1)
        crop = planche.crop((bx0 * T, by0 * T, bx1 * T, by1 * T))
        neuf = volume(crop, pal)
        for n in groupe:
            tx, ty = n % COLS, n // COLS
            box = ((tx - bx0) * T, (ty - by0) * T, (tx - bx0 + 1) * T, (ty - by0 + 1) * T)
            out.paste(neuf.crop(box), (tx * T, ty * T))
    return out


def refaire_sprites(img, taille, pal):
    fw, fh = taille
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    for k in range(img.width // fw):
        out.paste(volume(img.crop((k * fw, 0, (k + 1) * fw, fh)), pal), (k * fw, 0))
    return out


def ovale(dest, cx, cy, rx, ry):
    """Ajoute une ombre ovale à `dest` (dictionnaire pixel -> opacité, on garde la plus forte)."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1:
                continue
            if d < 0.55:
                a = OMBRE_A
            elif d < 0.8:
                a = OMBRE_A * 2 // 3
            elif BAYER[y % 4][x % 4] < 8:
                continue                                         # bord tramé
            else:
                a = OMBRE_A // 3
            dest[(x, y)] = max(dest.get((x, y), 0), a)


def pieds(arbres):
    """Les pieds des arbres d'une image : (x du milieu, y du bas, demi-largeur du houppier).
    Chaque tronc (pixels de tronc qui se touchent, branches comprises) d'au moins 25 pixels
    et 8 de haut, avec du feuillage au-dessus de son pied, est un arbre ; son pied est sa
    rangée la plus basse. Les bouts de branche que le feuillage coupe du tronc sont trop
    petits pour compter."""
    w, h = arbres.size
    px = arbres.load()
    fam = [None] * (w * h)
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] > 0:
                fam[y * w + x] = famille(p[:3])
    vus = bytearray(w * h)
    out = []
    for i0 in range(w * h):
        if fam[i0] != 't' or vus[i0]:
            continue
        pile, comp = [i0], []
        vus[i0] = 1
        while pile:
            i = pile.pop()
            comp.append(i)
            x, y = i % w, i // w
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h:
                        j = yy * w + xx
                        if fam[j] == 't' and not vus[j]:
                            vus[j] = 1
                            pile.append(j)
        ys = [i // w for i in comp]
        if len(comp) < 25 or max(ys) - min(ys) < 8:
            continue
        cy = max(ys)
        base = [i % w for i in comp if i // w >= cy - 1]
        cx = (min(base) + max(base) + 1) / 2
        if not any(fam[(cy - k) * w + int(cx)] == 'f' for k in range(8, 70) if cy - k >= 0):
            continue
        # demi-largeur du houppier, à 22 pixels au-dessus du pied (trous de 2 pixels admis)
        yy = max(0, cy - 22)
        largeur = []
        for sens in (-1, 1):
            x, trou, d = int(cx), 0, 0
            while 0 <= x < w and trou <= 2:
                trou = 0 if fam[yy * w + x] else trou + 1
                x += sens
                d += 1
            largeur.append(d - trou)
        out.append((cx, cy + 1, sum(largeur) / 2))
    return out


def ombre_de(pied):
    cx, cy, hw = pied
    rx = max(6.0, min(34.0, hw * 0.95))
    ry = max(3.0, round(rx * 0.27))
    return cx + rx * 0.22, cy - 1, rx, ry


def ombres_carte(m, planche):
    """Les ombres portées de tous les arbres de la carte, hors des pixels des arbres."""
    W, H = m['width'], m['height']
    arbres = Image.new('RGBA', (W * T, H * T), (0, 0, 0, 0))
    for l in couches_arbres(m):
        for i, c in enumerate(l['data']):
            g = c & 0x0FFFFFFF
            if not 1 <= g <= 3375:
                continue
            n = g - 1
            tuile = planche.crop(((n % COLS) * T, (n // COLS) * T, (n % COLS + 1) * T, (n // COLS + 1) * T))
            arbres.alpha_composite(tuile, ((i % W) * T, (i // W) * T))
    alpha = {}
    liste = pieds(arbres)
    for pied in liste:
        ovale(alpha, *ombre_de(pied))
        # contact : plus sombre juste au pied du tronc
        cx, cy = pied[0], pied[1]
        for y in range(int(cy) - 3, int(cy) + 1):
            for x in range(int(cx) - 4, int(cx) + 5):
                if BAYER[y % 4][x % 4] < 12:
                    alpha[(x, y)] = max(alpha.get((x, y), 0), OMBRE_A + 40)
    out = Image.new('RGBA', arbres.size, (0, 0, 0, 0))
    ap = arbres.load()
    op = out.load()
    for (x, y), a in alpha.items():
        if 0 <= x < out.width and 0 <= y < out.height and ap[x, y][3] == 0:
            op[x, y] = OMBRE + (a,)
    return out, len(liste)


def ombre_seule(sprite, taille):
    """L'ombre d'un arbre de la feuille de sprites (première image), dans une image à part,
    et la position de son coin haut-gauche par rapport au pied de l'image (milieu du bas)."""
    fw, fh = taille
    image = sprite.crop((0, 0, fw, fh))
    marge = Image.new('RGBA', (fw, fh + 16), (0, 0, 0, 0))
    marge.paste(image, (0, 0))
    p = pieds(marge)
    if not p:
        return None
    cx, cy, rx, ry = ombre_de(p[0])
    alpha = {}
    ovale(alpha, cx, cy, rx, ry)
    xs = [q[0] for q in alpha]
    ys = [q[1] for q in alpha]
    x0, y0 = min(xs), min(ys)
    out = Image.new('RGBA', (max(xs) - x0 + 1, max(ys) - y0 + 1), (0, 0, 0, 0))
    for (x, y), a in alpha.items():
        out.putpixel((x - x0, y - y0), OMBRE + (a,))
    return out, (x0 - fw / 2, y0 - fh)


def main():
    m = carte()
    planche0 = Image.open(os.path.join(ORIG, 'farm_spring_summer.png')).convert('RGBA')
    sprites0 = {n: Image.open(os.path.join(ORIG, n)).convert('RGBA') for n in SPRITES}
    tuiles = tuiles_arbres(m)
    vues = [planche0.crop(((n % COLS) * T, (n // COLS) * T, (n % COLS + 1) * T, (n // COLS + 1) * T)) for n in tuiles]
    pal = palettes(vues + list(sprites0.values()))

    planche = refaire_planche(planche0, tuiles, pal)
    planche.save(os.path.join(ASSETS, 'farm_spring_summer.png'))
    print(f'assets/farm_spring_summer.png : tuiles d\'arbres refaites ({len(tuiles)} tuiles dans les couches d\'arbres)')
    sprites = {}
    for nom, taille in SPRITES.items():
        sprites[nom] = refaire_sprites(sprites0[nom], taille, pal)
        sprites[nom].save(os.path.join(ASSETS, nom))
        print(f'assets/{nom} : {sprites0[nom].width // taille[0]} images refaites')
    if CARTE != CARTE_JEU:
        # la carte du jeu est celle de la version 2 : ses ombres viennent de carte_v2.py
        print('assets/ombres_arbres.png : inchangé (carte version 2 : voir scripts/carte/carte_v2.py)')
    else:
        ombres, n = ombres_carte(m, planche)
        ombres.save(os.path.join(ASSETS, 'ombres_arbres.png'))
        print(f'assets/ombres_arbres.png : {n} arbres')
    seule = ombre_seule(sprites['basic_sp.png'], SPRITES['basic_sp.png'])
    if seule:
        seule[0].save(os.path.join(ASSETS, 'ombre_arbre.png'))
        print(f'assets/ombre_arbre.png : coin haut-gauche à {seule[1]} du pied de l\'arbre')

    if '--apercu' in sys.argv:
        herbe = (105, 150, 84, 255)
        z = 4
        a0 = sprites0['basic_sp.png'].crop((0, 0, 80, 80))
        a1 = sprites['basic_sp.png'].crop((0, 0, 80, 80))
        p0 = sprites0['pine_sp.png'].crop((0, 0, 58, 64))
        p1 = sprites['pine_sp.png'].crop((0, 0, 58, 64))
        ap = Image.new('RGBA', ((80 + 58) * 2 * z + 60, 96 * z), (40, 40, 40, 255))
        x = 0
        for im in (a0, a1, p0, p1):
            bg = Image.new('RGBA', (im.width, 96), herbe)
            bg.alpha_composite(im)
            if im is a1 and seule:
                o = Image.new('RGBA', bg.size, (0, 0, 0, 0))
                o.alpha_composite(seule[0], (int(im.width / 2 + seule[1][0]), int(80 + seule[1][1])))
                bg2 = Image.new('RGBA', bg.size, herbe)
                bg2.alpha_composite(o)
                bg2.alpha_composite(im)
                bg = bg2
            ap.paste(bg.resize((bg.width * z, bg.height * z), Image.NEAREST), (x, 0))
            x += bg.width * z + 20
        ap.save(os.path.join(ROOT, 'apercu_arbres_3d.png'))
        print('apercu_arbres_3d.png')


if __name__ == '__main__':
    main()
