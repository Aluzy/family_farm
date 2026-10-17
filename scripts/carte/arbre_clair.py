# Un arbre plus clair (pour l'herbe vive de herbe_chemin) et deux buissons tirés de son
# feuillage, à partir d'un arbre modèle.
#
#   python3 scripts/carte/arbre_clair.py            écrit assets/arbre_clair.png
#   python3 scripts/carte/arbre_clair.py --apercu   écrit aussi apercu_arbre_clair.png
#
# Modèle : scripts/carte/originaux/arbre_modele.png (48 × 64) — un feuillu très sombre, tronc
# brun, une touffe d'herbe au pied.
#
# assets/arbre_clair.png : trois dessins côte à côte, chacun dans une case de 48 × 64, posé pied
# au milieu du bas de sa case :
#   0 l'arbre : scripts/carte/originaux/arbre_feuillu.png (48 × 64), dessiné à la main, repris
#     tel quel (couleurs et contour compris) ;
#   1 un buisson rond (trois bosses), 2 un buisson large (six bosses) : des dômes éclairés en
#     haut à gauche, du feuillage de l'arbre modèle éclairci (chaque vert du modèle prend sa
#     place, selon sa luminosité, sur une rampe de verts tirée de l'herbe ; le relief est
#     gardé), contour sombre.
# assets/pin_clair.png : le pin (scripts/carte/originaux/pin_modele.png, 58 × 64) harmonisé de
# la même façon, sur une rampe un peu plus froide et profonde (un conifère, même famille).
# assets/arbre_clair_sp.png et assets/pin_clair_sp.png : 3 images d'inclinaison (le coup de
# hache) de l'arbre (48 × 64) et du pin (centré sur 64 × 64), avec une marge de chaque côté.
# Les ombres portées ne sont pas dans les dessins : le jeu (ou la carte) les pose au sol.
import colorsys
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, contour, hls  # noqa: E402
MODELE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'arbre_modele.png')
ARBRE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'arbre_feuillu.png')
SORTIE = os.path.join(ASSETS, 'arbre_clair.png')
CW, CH = 48, 64

# La rampe des verts, du plus sombre au plus clair : les verts de l'herbe (herbe_chemin),
# prolongés vers le sombre pour le cœur du feuillage.
RAMPE = [(6, 40, 8), (12, 66, 6), (22, 96, 6), (44, 128, 8), (74, 160, 10), (106, 190, 16),
         (140, 220, 36), (178, 244, 84)]
CONTOUR = (6, 40, 8)
# Le pin : une rampe un peu plus froide et plus profonde (un conifère), de la même famille.
RAMPE_PIN = [(4, 34, 18), (8, 56, 28), (14, 82, 36), (28, 112, 42), (52, 142, 48), (86, 174, 58),
             (124, 206, 80), (164, 232, 118)]
MODELE_PIN = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'pin_modele.png')
SORTIE_PIN = os.path.join(ASSETS, 'pin_clair.png')


def vert(c, hmax=170):
    h, l, s = hls(c)
    return 70 / 360 <= h <= hmax / 360 or (l < 0.05)


def sur_rampe(t, rampe=None):
    rampe = rampe or RAMPE
    t = max(0.0, min(1.0, t)) * (len(rampe) - 1)
    i = min(len(rampe) - 2, int(t))
    f = t - i
    return tuple(round(a * (1 - f) + b * f) for a, b in zip(rampe[i], rampe[i + 1]))


def eclaircir(modele, rampe=None, hmax=170, clarte=(0.08, 0.92, 0.85)):
    """L'arbre éclairci : les verts répartis sur la rampe selon leur rang de luminosité
    (l'ordre des tons, donc le relief, est gardé), le tronc un peu plus clair et plus chaud.
    hmax : la teinte la plus bleue encore comptée comme feuillage (le pin est bleuté) ;
    clarte : (départ, étendue, courbe) de la place sur la rampe selon le rang."""
    px = modele.load()
    w, h = modele.size
    verts = sorted({px[x, y][:3] for y in range(h) for x in range(w) if px[x, y][3] and vert(px[x, y][:3], hmax)},
                   key=lambda c: hls(c)[1])
    rang = {c: i / max(1, len(verts) - 1) for i, c in enumerate(verts)}
    out = Image.new('RGBA', (w, h))
    po = out.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if not p[3]:
                continue
            c = p[:3]
            if c in rang:
                n = sur_rampe(clarte[0] + clarte[1] * rang[c] ** clarte[2], rampe)
            else:                                   # le tronc : plus clair, plus chaud
                hh, l, s = hls(c)
                r, g, b = colorsys.hls_to_rgb(hh, min(0.62, l * 1.35 + 0.04), min(1, s * 1.1))
                n = (round(r * 255), round(g * 255), round(b * 255))
            po[x, y] = n + (255,)
    return out


def buisson(texture, bosses, graine):
    """Un buisson : des bosses rondes (cx, cy, r en pixels, par rapport au pied), chacune un
    dôme éclairé du haut à gauche, le bord bosselé ; la couleur est celle du feuillage de
    l'arbre éclairci (texture), plus claire ou plus sombre selon la lumière ; contour sombre.
    Posé pied au milieu du bas d'une case CW × CH."""
    pt = texture.load()
    tw, th = texture.size
    cx0, base = CW // 2, CH - 2
    L = (-0.55, -0.75, 0.9)
    n = math.sqrt(sum(c * c for c in L))
    L = tuple(c / n for c in L)

    def haut(x, y):
        best = 0.0
        for (bx, by, r) in bosses:
            ax, ay = cx0 + bx, base + by
            a = math.atan2(y - ay, x - ax)
            rr = r * (1 + 0.07 * math.sin(a * 7 + graine) + 0.05 * math.sin(a * 11 + graine * 2))
            d2 = (x - ax) ** 2 + (y - ay) ** 2
            if d2 < rr * rr and y <= base:
                best = max(best, math.sqrt(rr * rr - d2))
        return best

    out = Image.new('RGBA', (CW, CH))
    for y in range(CH):
        for x in range(CW):
            hz = haut(x + 0.5, y + 0.5)
            if hz <= 0:
                continue
            gx = (haut(x + 1.1, y + 0.5) - haut(x - 0.1, y + 0.5)) / 1.2
            gy = (haut(x + 0.5, y + 1.1) - haut(x + 0.5, y - 0.1)) / 1.2
            nn = math.sqrt(gx * gx + gy * gy + 1)
            lam = (-gx * L[0] - gy * L[1] + L[2]) / nn
            c = pt[(x * 3 + graine * 5) % tw, (y + graine * 3) % th]
            if not c[3] or not vert(c[:3]):
                c = RAMPE[3] + (255,)
            k = 0.55 + 0.75 * max(0.0, lam) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.12
            out.putpixel((x, y), tuple(min(255, round(v * k)) for v in c[:3]) + (255,))
    return contour(out, CONTOUR)       # il se détache de l'herbe vive


def planche(modele):
    # le houppier du modèle éclairci (le haut, sans le tronc) sert de texture aux buissons
    houppier = eclaircir(modele).crop((4, 4, 44, 40))
    rond = buisson(houppier, [(0, -10, 11), (-6, -5, 7), (6, -5, 7)], 3)
    large = buisson(houppier, [(-9, -8, 9), (8, -9, 10), (0, -14, 9), (-1, -5, 8), (14, -4, 6), (-15, -4, 5)], 7)
    out = Image.new('RGBA', (CW * 3, CH))
    arbre = Image.open(ARBRE).convert('RGBA')
    assert arbre.size == (CW, CH), f'arbre_feuillu.png : {arbre.size}, il faut {CW} × {CH}'
    out.paste(arbre, (0, 0))
    out.alpha_composite(rond, (CW, 0))
    out.alpha_composite(large, (CW * 2, 0))
    return out


# L'inclinaison sous un coup de hache : l'arbre reste d'un seul bloc et penche, autour de son
# pied, d'INCLINAISON degrés. Trois images : droit, penché à droite, penché à gauche (le jeu les
# enchaîne : droite, milieu, gauche, milieu, droite, milieu ; CHOP_TREES dans farm-stage.js).
# Chaque image a MARGE px de plus de chaque côté : le houppier penché ne sort pas du cadre.
# La rotation se fait sur l'image agrandie ROT fois puis réduite (pas de pixels arrachés).
INCLINAISON = 3.5
MARGE = 4
ROT = 8


def inclinaison(img, pied_y):
    w, h = img.size
    W = w + 2 * MARGE
    out = Image.new('RGBA', (W * 3, h))
    for k, angle in enumerate((0, -INCLINAISON, INCLINAISON)):        # PIL : un angle positif tourne vers la gauche
        cadre = Image.new('RGBA', (W, h))
        cadre.alpha_composite(img, (MARGE, 0))
        if angle:
            grand = cadre.resize((W * ROT, h * ROT), Image.NEAREST)
            grand = grand.rotate(angle, resample=Image.NEAREST, center=(W * ROT / 2, pied_y * ROT))
            cadre = grand.resize((W, h), Image.NEAREST)
        out.alpha_composite(cadre, (k * W, 0))
    return out


def main():
    modele = Image.open(MODELE).convert('RGBA')
    img = planche(modele)
    img.save(SORTIE)
    print('assets/arbre_clair.png : arbre, buisson rond, buisson large (cases de 48 × 64)')
    pin0 = Image.open(MODELE_PIN).convert('RGBA')
    pin = contour(eclaircir(pin0, RAMPE_PIN, 200, (0.04, 0.82, 1.2)), CONTOUR)      # un peu plus sombre que le feuillu
    pin.save(SORTIE_PIN)
    print(f'assets/pin_clair.png : le pin harmonisé ({pin.width} × {pin.height}, pied au milieu du bas)')
    # les feuilles d'inclinaison (hache) : l'arbre (48 × 64), le pin centré sur 64 × 64 ; pied
    # au bas de l'image
    inclinaison(img.crop((0, 0, CW, CH)), CH - 1).save(os.path.join(ASSETS, 'arbre_clair_sp.png'))
    pin64 = Image.new('RGBA', (64, 64))
    pin64.alpha_composite(pin, ((64 - pin.width) // 2, 64 - pin.height))
    inclinaison(pin64, 62).save(os.path.join(ASSETS, 'pin_clair_sp.png'))
    print(f'assets/arbre_clair_sp.png, assets/pin_clair_sp.png : 3 images (droit, à droite, à gauche), {MARGE} px de marge')
    if '--apercu' in sys.argv:
        herbe = Image.open(os.path.join(ASSETS, 'herbe_chemin.png')).convert('RGBA')
        fond = Image.new('RGBA', (CW * 4 + 2 * 60, CH))
        for y in range(0, CH, 16):
            for x in range(0, fond.width, 16):
                fond.paste(herbe.crop((x % 256, 0, x % 256 + 16, 16)), (x, y))
        fond.alpha_composite(modele, (0, 0))
        fond.alpha_composite(img, (CW, 0))
        fond.alpha_composite(pin0, (CW * 4, 0))
        fond.alpha_composite(pin, (CW * 4 + 60, 0))
        fond.resize((fond.width * 5, fond.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_arbre_clair.png'))
        print('apercu_arbre_clair.png')


if __name__ == '__main__':
    main()
