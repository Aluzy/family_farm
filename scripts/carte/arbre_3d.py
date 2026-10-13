# assets/arbre_3d.png : un arbre de la carte redessiné avec du volume (essai d'effet 3D).
#
#   python3 scripts/carte/arbre_3d.py            écrit assets/arbre_3d.png
#   python3 scripts/carte/arbre_3d.py --apercu   écrit aussi apercu_arbre_3d.png (avant / après, ×6)
#
# Point de départ : le feuillu de la planche farm_spring_summer.png (4 × 5 tuiles, colonnes
# 12 à 15, rangées 0 à 4) et la touffe d'herbe posée au pied de son tronc (tuiles 325 et 326).
# Le dessin garde ses pixels et sa palette ; seule la lumière change :
#   - le houppier devient un tas de touffes sphériques : chacune est éclairée du haut à gauche
#     (comme toute la carte), avec un reflet clair au sommet et son ombre propre en bas à droite ;
#   - le cœur et le dessous du houppier s'assombrissent (occlusion), le tronc aussi sous les
#     feuilles ;
#   - le tronc est un cylindre : clair à gauche, sombre à droite ;
#   - une ombre portée, ovale et douce, s'étend au sol en bas à droite du pied.
# Chaque couleur reste une teinte de sa rampe (feuillage, tronc) : on monte ou descend d'un ou
# deux crans, avec un tramage ordonné pour les demi-crans. Deux teintes sont ajoutées : un
# vert de reflet, plus clair que la plus claire de la planche, et un vert d'ombre profonde.
import math
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
T = 16
SRC = (12, 0, 4, 5)            # colonne, rangée, largeur, hauteur (en tuiles) dans la planche
HERBE = ((325, 1, 4), (326, 2, 4))   # tuile de la planche, colonne et rangée dans l'arbre
MARGE = (4, 2, 12, 6)          # gauche, haut, droite, bas : place pour l'ombre portée
W0, H0 = SRC[2] * T, SRC[3] * T
W, H = W0 + MARGE[0] + MARGE[2], H0 + MARGE[1] + MARGE[3]

# Rampes de couleurs, de la plus sombre à la plus claire.
FEUILLES = [(1, 30, 42), (2, 48, 58), (23, 86, 73), (57, 125, 83), (105, 150, 84), (155, 172, 116), (196, 206, 142)]
TRONC = [(52, 24, 20), (74, 36, 29), (104, 74, 55), (137, 113, 84), (147, 136, 120)]
BLEU = (45, 60, 127)           # les reflets bleus du feuillage : restent tels quels
OMBRE = (8, 40, 30, 92)        # ombre portée sur l'herbe (couleur, opacité)

# Touffes du houppier (dans le repère de l'arbre d'origine, 64 × 80) : x, y, rayon.
TOUFFES = [(21, 15, 11), (36, 10, 11), (49, 18, 11), (11, 30, 10), (27, 28, 12), (43, 31, 12),
           (56, 35, 8), (16, 45, 10), (31, 44, 11), (47, 46, 10)]
LUMIERE = (-0.55, -0.75, 0.9)  # vers la lumière : gauche, haut, vers l'écran
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def norm(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


L = norm(LUMIERE)


def hauteur(x, y):
    """Relief du houppier : la plus haute des touffes en (x, y), 0 hors de toutes."""
    h = 0.0
    for cx, cy, r in TOUFFES:
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        if d2 < r * r:
            h = max(h, math.sqrt(r * r - d2))
    return h


def eclairage(x, y):
    """Lambert sur le relief des touffes, de -1 (dos) à 1 (face à la lumière)."""
    e = 0.6
    gx = (hauteur(x + e, y) - hauteur(x - e, y)) / (2 * e)
    gy = (hauteur(x, y + e) - hauteur(x, y - e)) / (2 * e)
    n = norm((-gx, -gy, 1.0))
    return sum(a * b for a, b in zip(n, L))


def source():
    planche = Image.open(os.path.join(ROOT, 'assets', 'farm_spring_summer.png')).convert('RGBA')
    c, r, w, h = SRC
    arbre = planche.crop((c * T, r * T, (c + w) * T, (r + h) * T))
    cols = planche.width // T
    for n, x, y in HERBE:
        tuile = planche.crop(((n % cols) * T, (n // cols) * T, (n % cols + 1) * T, (n // cols + 1) * T))
        arbre.alpha_composite(tuile, (x * T, y * T))
    return arbre


def rampe(rgb):
    for nom, ramp in (('f', FEUILLES), ('t', TRONC)):
        if rgb in ramp:
            return nom, ramp, ramp.index(rgb)
    return None, None, None


def tronc_colonnes(src):
    """Colonnes occupées par le tronc sous le houppier (pour son ombrage cylindrique)."""
    xs = [x for y in range(56, 72) for x in range(W0) if src.getpixel((x, y))[3] and src.getpixel((x, y))[:3] in TRONC]
    return (min(xs), max(xs)) if xs else (28, 36)


def volume(src):
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    t0, t1 = tronc_colonnes(src)
    bas = max(y for y in range(H0) for x in range(W0) if src.getpixel((x, y))[3])   # le pied

    # ombre portée : un ovale aplati sous le houppier, poussé en bas à droite
    ox, oy = MARGE[0], MARGE[1]
    cx, cy, rx, ry = ox + 38, oy + bas - 3, 30, 8
    for y in range(H):
        for x in range(W):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1:
                a = OMBRE[3] if d < 0.55 else OMBRE[3] * 2 // 3 if d < 0.8 else OMBRE[3] // 3
                if d >= 0.8 and BAYER[y % 4][x % 4] < 8:
                    continue                                  # bord tramé
                out.putpixel((x, y), OMBRE[:3] + (a,))
    # contact : plus sombre juste au pied du tronc
    for y in range(oy + bas - 4, oy + bas + 1):
        for x in range(ox + t0 - 2, ox + t1 + 5):
            if BAYER[y % 4][x % 4] < 12:
                out.putpixel((x, y), OMBRE[:3] + (OMBRE[3] + 40,))

    arbre = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H0):
        for x in range(W0):
            p = src.getpixel((x, y))
            if not p[3]:
                continue
            nom, ramp, i = rampe(p[:3])
            if ramp is None:                                  # reflets bleus, herbe du pied
                arbre.putpixel((x + ox, y + oy), p)
                continue
            if nom == 'f':
                e = eclairage(x + 0.5, y + 0.5)
                h = hauteur(x + 0.5, y + 0.5)
                cran = (e - 0.6) * 2.6                        # lumière propre de la touffe
                cran -= max(0.0, (y - 34) / 26) * 0.9         # le dessous du houppier
                if h < 2.5:
                    cran -= 0.6                               # creux entre deux touffes
                if e > 0.93 and h > 7 and i >= 3:
                    cran += 0.6                               # reflet au sommet de la touffe
                i0 = i if i > 0 else 1                        # le plus sombre de la planche
                k = i0 + cran
            else:
                # tronc : cylindre (gauche claire, droite sombre), assombri sous les feuilles
                u = (x - t0) / max(1, t1 - t0)                # 0 à gauche, 1 à droite
                cran = 0.9 - 2.0 * u if y >= 54 else -0.3     # les branches : à peine plus sombres
                cran -= min(1.0, max(0.0, (62 - y) / 10)) * 0.9   # sous les feuilles
                k = i + cran
            base = math.floor(k)
            if BAYER[y % 4][x % 4] / 16 < k - base:
                base += 1
            k = max(0, min(len(ramp) - 1, base))
            arbre.putpixel((x + ox, y + oy), ramp[k] + (255,))
    out.alpha_composite(arbre)
    return out


def main():
    src = source()
    img = volume(src)
    dest = os.path.join(ROOT, 'assets', 'arbre_3d.png')
    img.save(dest)
    print(f'{os.path.relpath(dest, ROOT)} : {img.width} × {img.height}')
    if '--apercu' in sys.argv:
        herbe = (105, 150, 84, 255)
        avant = Image.new('RGBA', (W, H), herbe)
        avant.alpha_composite(src, (MARGE[0], MARGE[1]))
        apres = Image.new('RGBA', (W, H), herbe)
        apres.alpha_composite(img)
        z = 6
        ap = Image.new('RGBA', (W * z * 2 + 24, H * z), (40, 40, 40, 255))
        ap.paste(avant.resize((W * z, H * z), Image.NEAREST), (0, 0))
        ap.paste(apres.resize((W * z, H * z), Image.NEAREST), (W * z + 24, 0))
        ap.save(os.path.join(ROOT, 'apercu_arbre_3d.png'))
        print('apercu_arbre_3d.png')


if __name__ == '__main__':
    main()
