# Les graines de l'île (docs/ile-300.md) : ce qu'une plante coupée lâche au sol (le personnage les ramasse en marchant
# dessus) et la graine plantée, avant qu'elle ne pousse. Une image de 16 × 16 par graine, côte à côte, le bas de l'image
# au pied ; puis la pousse d'une plante qui n'est pas un arbre (deux feuilles qui sortent de terre).
# Vues de haut à 45° (CLAUDE.md) : chaque grain montre son dessus (la lumière en haut à gauche, chaude) et sa face avant
# (une bande plus sombre, froide, sous le dessus) ; chaque grain sa nuance (des rampes de 120 tons, un bruit fixe) ;
# une ombre douce au sol ; un contour d'un pixel dans le ton le plus sombre de la matière.
#
#   python3 scripts/carte/graines_ile.py            écrit assets/graines_ile.png
#   python3 scripts/carte/graines_ile.py --apercu   écrit aussi apercu_graines_ile.png
#
# L'ordre des images : ORDRE puis REPRISES, le même que js/carte/nature.js (GRAINES_ILE).
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nuances import bruit, rampe, ton  # noqa: E402
from pixel import ASSETS, apercu, rangee  # noqa: E402

N = 120          # les tons d'une rampe
L = (-0.55, -0.75, 0.45)   # la lumière : en haut à gauche, un peu de face


def hexa(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


def matiere(*cles):
    """Une rampe de la matière : du sombre froid au clair chaud (les couleurs clés, du sombre au clair)."""
    return rampe([hexa(c) for c in cles], N)


def poser(px, x, y, c, a=255):
    if 0 <= x < 16 and 0 <= y < 16:
        if a >= 255 or px[x][y] is None:
            px[x][y] = (c, a)
        else:
            (c0, a0) = px[x][y]
            if a0 < 255:
                px[x][y] = (c, max(a, a0))


def ombre(px, cx, cy, rx, ry, force=70):
    """Une ombre douce au sol, un peu vers le bas et la droite (sous ce qui est posé)."""
    for y in range(16):
        for x in range(16):
            d = ((x + 0.5 - cx - 0.6) / rx) ** 2 + ((y + 0.5 - cy - 0.4) / ry) ** 2
            if d < 1 and px[x][y] is None:
                px[x][y] = ((28, 34, 44), int(force * (1 - d) ** 0.7))


def grain(px, cx, cy, rx, ry, r, angle=0.0, epais=1.0, s=0, eclat=0.0):
    """Un grain ovale, vu de haut à 45° : son dessus (rx × ry, tourné de `angle`), éclairé en haut à gauche, et sa face
    avant, une bande sous lui de `epais` px, plus sombre. `eclat` : un reflet (une graine luisante)."""
    ca, sa = math.cos(angle), math.sin(angle)
    # la face avant d'abord (le dessus la recouvre)
    for y in range(16):
        for x in range(16):
            for dy in (epais,):
                u = (x + 0.5 - cx) * ca + (y + 0.5 - cy - dy) * sa
                v = -(x + 0.5 - cx) * sa + (y + 0.5 - cy - dy) * ca
                d = (u / rx) ** 2 + (v / ry) ** 2
                if d <= 1:
                    t = 0.16 + 0.12 * (1 - d) + 0.04 * bruit(x, y, s + 7) - 0.06 * ((x - cx) / max(rx, 1))
                    poser(px, x, y, ton(r, t))
    for y in range(16):
        for x in range(16):
            u = (x + 0.5 - cx) * ca + (y + 0.5 - cy) * sa
            v = -(x + 0.5 - cx) * sa + (y + 0.5 - cy) * ca
            d = (u / rx) ** 2 + (v / ry) ** 2
            if d > 1:
                continue
            # la normale d'un ellipsoïde (le dessus bombé)
            nx, ny = u / rx, v / ry
            nz = math.sqrt(max(0.0, 1 - d))
            gx, gy = nx * ca - ny * sa, nx * sa + ny * ca
            lum = (gx * L[0] + gy * L[1] + nz * L[2]) / 1.05
            t = 0.44 + 0.44 * lum + 0.08 * bruit(x, y, s) + (0.12 if eclat and lum > 0.75 else 0)
            # (le bord bas et droit, dans l'ombre : l'occlusion)
            t -= 0.08 * max(0.0, d - 0.65) * (1 if gy > 0 or gx > 0 else 0.3)
            px[x][y] = (ton(r, t), 255)


def contourner(px, r):
    """Un contour d'un pixel, dans le ton le plus sombre de la matière, autour de ce qui est opaque."""
    c = ton(r, 0.0)
    plein = [[px[x][y] is not None and px[x][y][1] >= 255 for y in range(16)] for x in range(16)]
    for y in range(16):
        for x in range(16):
            if plein[x][y]:
                continue
            if any(0 <= x + dx < 16 and 0 <= y + dy < 16 and plein[x + dx][y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x][y] = (c, 255)


def image(px):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for x in range(16):
        for y in range(16):
            if px[x][y] is not None:
                c, a = px[x][y]
                im.putpixel((x, y), tuple(c) + (a,))
    return im


def vide():
    return [[None] * 16 for _ in range(16)]


def tas(grains, r, cont=None, ombre_r=(5, 2.2), s=0):
    """Quelques grains posés en tas : [(cx, cy, rx, ry, angle)], de l'arrière vers l'avant ; leur ombre, leur contour."""
    px = vide()
    xs = [g[0] for g in grains]
    ys = [g[1] for g in grains]
    ombre(px, sum(xs) / len(xs), max(ys) + 0.8, *ombre_r)
    couches = []
    rampes = r if isinstance(r[0], list) else [r]   # (une rampe, ou une liste de rampes : une par grain)
    for k, (cx, cy, rx, ry, a) in enumerate(sorted(grains, key=lambda g: g[1])):
        q = vide()
        grain(q, cx, cy, rx, ry, rampes[k % len(rampes)], a, 1.0 if ry > 1.2 else 0.6, s + k * 31)
        contourner(q, cont or rampes[0])
        couches.append(q)
    for q in couches:
        for x in range(16):
            for y in range(16):
                if q[x][y] is not None:
                    px[x][y] = q[x][y]
    return image(px)


# ---------- les matières ----------

BRUN = matiere('#2a1810', '#5a3418', '#8a5428', '#b8804a', '#e2b27a')
BRUN_ROUX = matiere('#2a120c', '#5e2a14', '#94481e', '#c2702e', '#eaa25a')
CHATAIGNE = matiere('#1e0e0a', '#4a2010', '#7a3a18', '#a85c2a', '#e09a5a', '#f8d0a0')
NOIR = matiere('#0c0c14', '#24222e', '#403c4c', '#666270', '#9c96a2', '#c6c0c8')
GRIS = matiere('#1e2028', '#3e4048', '#6a6a72', '#9a968e', '#c8c2b0')
BEIGE = matiere('#3a2a1a', '#6e5638', '#a08458', '#cab080', '#f0e0b8')
PAILLE = matiere('#3a2a10', '#6e5218', '#a8862a', '#d6b648', '#f6e690')
VERT = matiere('#0e2418', '#1e4a28', '#367a34', '#62a840', '#a6d86a', '#d8f4a0')
CREME = matiere('#4a4a52', '#8a8a90', '#c0beb8', '#e6e2d6', '#fffcf2')
MAUVE = matiere('#1a1020', '#3e2440', '#644068', '#8e6a8e', '#c0a2b8')
ROUILLE = matiere('#200c0c', '#4a1a14', '#7a3420', '#a85a34', '#d8925a')


def samare(px, cx, cy, angle, r_aile, r_graine, s):
    """Une samare (l'érable, le frêne des prés) : la graine ronde et son aile fine, claire, presque à plat."""
    ca, sa = math.cos(angle), math.sin(angle)
    for k in range(10):
        for w in (-1.2, -0.4, 0.4, 1.2):
            ex = cx + ca * (k * 0.55 + 1) - sa * w * (0.4 + k * 0.07)
            ey = cy + sa * (k * 0.55 + 1) + ca * w * (0.4 + k * 0.07)
            x, y = int(ex), int(ey)
            if 0 <= x < 16 and 0 <= y < 16:
                t = 0.62 + 0.22 * (1 - k / 10) - 0.18 * (w > 0) + 0.04 * bruit(x, y, s)
                px[x][y] = (ton(r_aile, t), 255)
    grain(px, cx, cy, 1.6, 1.3, r_graine, angle, 0.8, s)


def dessin_bouleau():
    px = vide()
    ombre(px, 8, 12.5, 5, 2)
    # trois petites samares à deux ailes (des nœuds de papillon), éparses
    for k, (cx, cy, a) in enumerate([(5, 10, 0.3), (10, 9, -0.5), (8, 12.5, 0.1)]):
        for side in (-1, 1):
            grain(px, cx + side * 1.8, cy, 1.6, 1.1, BEIGE, a, 0.5, 40 + k * 7 + side)
        grain(px, cx, cy, 0.9, 1.0, BRUN, 0, 0.6, 50 + k)
    contourner(px, BRUN)
    return image(px)


def dessin_saule():
    px = vide()
    ombre(px, 8, 12.5, 5.5, 2.2, 60)
    # une boule de coton blanc (les aigrettes), quelques graines brunes dedans
    for k in range(70):
        a = bruit(k, 1, 91) * math.pi
        rr = 3.6 * abs(bruit(k, 2, 92)) ** 0.6
        x, y = int(8 + math.cos(a) * rr * 1.3), int(9.5 + math.sin(a) * rr)
        if 0 <= x < 16 and 0 <= y < 16:
            t = 0.55 + 0.4 * (-(x - 8) * 0.12 - (y - 9.5) * 0.16) + 0.08 * bruit(x, y, 93)
            px[x][y] = (ton(CREME, t), 255)
    for (x, y) in ((7, 10), (9, 9), (8, 11)):
        px[x][y] = (ton(BRUN, 0.35 + 0.05 * bruit(x, y, 94)), 255)
    contourner(px, GRIS)
    return image(px)


def dessin_arbre_pre():
    px = vide()
    ombre(px, 8, 12, 5.5, 2)
    samare(px, 7, 11, -2.5, BEIGE, BRUN_ROUX, 61)
    samare(px, 8, 11, -0.6, BEIGE, BRUN_ROUX, 62)
    contourner(px, BRUN)
    return image(px)


def dessin_fleurs_champs():
    # des graines de toutes sortes mêlées : brunes, noires, beiges
    return tas([(5, 10, 1.4, 1.1, 0.2), (8, 9, 1.2, 1.0, -0.4), (11, 10, 1.4, 1.1, 0.5), (6, 12.5, 1.3, 1.0, 0.0), (9.5, 12.5, 1.5, 1.1, 0.3)],
               [BRUN, NOIR, BEIGE, BRUN_ROUX, GRIS], BRUN, (5.5, 2.2), 70)


def petits(r, s, cont=None):
    """Un petit tas de graines fines (les fleurs) : sept grains d'environ 3 px, en quinconce, chacun sa nuance."""
    places = [(4.6, 10.2), (7.6, 9.6), (10.8, 10.0), (6.0, 12.0), (9.2, 11.8), (12.0, 12.2), (7.6, 13.6)]
    g = [(x + 0.5 * bruit(k, 0, s), y + 0.4 * bruit(k, 1, s), 1.45, 1.1, 0.6 * bruit(k, 2, s)) for k, (x, y) in enumerate(places)]
    return tas(g, r, cont, (6, 2.4), s)


def dessin_lupin():
    return tas([(6, 10.5, 1.8, 1.5, 0.2), (10, 10, 1.8, 1.5, -0.3), (8, 12.5, 1.9, 1.5, 0.1)], BEIGE, BRUN, (5, 2.2), 80)


def dessin_chataigne():
    px = vide()
    ombre(px, 8.5, 13, 5.5, 2.3)
    q = vide()
    grain(q, 8, 10.5, 4.2, 3.2, CHATAIGNE, 0, 1.6, 81, eclat=1)
    # (le dessous clair, le « hile », à l'avant ; la pointe en haut)
    for x in range(5, 12):
        for y in range(12, 15):
            if q[x][y] is not None and y >= 12 + abs(x - 8) * 0.25:
                q[x][y] = (ton(BEIGE, 0.55 + 0.1 * bruit(x, y, 82) - 0.12 * (y - 12)), 255)
    q[8][6] = (ton(CHATAIGNE, 0.75), 255)
    contourner(q, CHATAIGNE)
    for x in range(16):
        for y in range(16):
            if q[x][y] is not None:
                px[x][y] = q[x][y]
    return image(px)


def dessin_pepins(r):
    return tas([(5.5, 10.5, 1.9, 1.2, 0.6), (9.5, 10, 1.9, 1.2, -0.5), (7.5, 12.5, 2.0, 1.2, 0.1)], r, None, (5, 2.2), 90)


def dessin_noyau(r, rx, ry, rides, s):
    px = vide()
    ombre(px, 8.5, 12.8, rx + 1.5, 2.2)
    q = vide()
    grain(q, 8, 10.5, rx, ry, r, 0.2, 1.4, s)
    if rides:
        # les sillons du noyau de pêche : des creux sombres, un peu tordus
        for k in range(14):
            x, y = int(8 + 3.2 * bruit(k, 0, s + 1)), int(10.5 + 2.2 * bruit(k, 1, s + 1))
            if q[x][y] is not None:
                q[x][y] = (ton(r, 0.22 + 0.06 * bruit(x, y, s + 2)), 255)
    contourner(q, r)
    for x in range(16):
        for y in range(16):
            if q[x][y] is not None:
                px[x][y] = q[x][y]
    return image(px)


def dessin_buisson():
    # de petites graines rondes, brun-violet (celles des baies)
    return tas([(5.5, 11, 1.5, 1.3, 0), (8.5, 10, 1.5, 1.3, 0), (11, 11.5, 1.5, 1.3, 0), (7.5, 12.8, 1.6, 1.3, 0)], [ROUILLE, MAUVE], ROUILLE, (5, 2.2), 100)


def dessin_herbe():
    # quelques grains d'herbe dorés (des épillets), chacun avec sa barbe fine
    px = vide()
    ombre(px, 8, 12.5, 5.5, 2)
    for k, (cx, cy, a) in enumerate([(5, 11, -0.9), (8, 10, -0.6), (11, 11, -0.3), (7, 12.8, -0.75), (10, 13, -0.5)]):
        grain(px, cx, cy, 1.9, 0.9, PAILLE, a, 0.6, 110 + k)
        # la barbe : 3 px vers le haut à droite
        for d in range(1, 4):
            x, y = int(cx + math.cos(a) * (2 + d)), int(cy + math.sin(a) * (2 + d))
            if 0 <= x < 16 and 0 <= y < 16 and px[x][y] is None or (0 <= x < 16 and 0 <= y < 16 and px[x][y][1] < 255):
                px[x][y] = (ton(PAILLE, 0.7 - 0.1 * d), 255)
    contourner(px, PAILLE)
    return image(px)


def dessin_spores():
    # un petit tas de poudre brune (les spores) : un monticule bas, piqué de grains clairs et sombres
    px = vide()
    ombre(px, 8.5, 12.5, 5.5, 2.2)
    grain(px, 8, 11, 4.6, 2.4, BRUN, 0, 1.2, 121)
    for k in range(26):
        x, y = int(8 + 4.2 * bruit(k, 0, 122)), int(11 + 2.2 * bruit(k, 1, 122))
        if 0 <= x < 16 and 0 <= y < 16 and px[x][y] is not None and px[x][y][1] >= 255:
            px[x][y] = (ton(BEIGE if k % 3 else NOIR, 0.35 + 0.4 * abs(bruit(x, y, 123))), 255)
    contourner(px, BRUN)
    return image(px)


def dessin_pousse():
    # une pousse : un peu de terre retournée, une tige, deux feuilles ovales ouvertes vers le haut
    px = vide()
    ombre(px, 8.5, 13.2, 4.5, 1.8)
    grain(px, 8, 13, 3.2, 1.2, BRUN, 0, 0.8, 131)
    for y in range(8, 13):
        px[8][y] = (ton(VERT, 0.35 + 0.05 * (12 - y)), 255)
    q = vide()
    grain(q, 5.6, 7.6, 2.6, 1.3, VERT, -0.45, 0.8, 132)
    grain(q, 10.4, 7.2, 2.6, 1.3, VERT, 0.45, 0.8, 133)
    for x in range(16):
        for y in range(16):
            if q[x][y] is not None:
                px[x][y] = q[x][y]
    contourner(px, VERT)
    return image(px)


ORDRE = [
    ('graine_ile_bouleau', dessin_bouleau),
    ('graine_ile_saule', dessin_saule),
    ('graine_ile_arbre_pre', dessin_arbre_pre),
    ('graine_ile_chataignier', dessin_chataigne),
    ('graine_ile_fleurs', dessin_fleurs_champs),
    ('graine_ile_coquelicot', lambda: petits(NOIR, 141)),
    ('graine_ile_pavot_californie', lambda: petits(GRIS, 142)),
    ('graine_ile_myosotis', lambda: petits(matiere('#0a0a10', '#221c24', '#40343c', '#6a5860', '#9a8486', '#c4aea8'), 143)),
    ('graine_ile_lavande', lambda: petits(BRUN, 144)),
    ('graine_ile_lupin', dessin_lupin),
    ('graine_ile_fleur_rouge', lambda: petits(BRUN_ROUX, 145)),
    ('graine_ile_fleur_mauve', lambda: petits(MAUVE, 146)),
    ('graine_ile_pommier_sauvage', lambda: dessin_pepins(matiere('#1a0c08', '#40200e', '#6a3a1a', '#94582a', '#c8884a'))),
    ('graine_ile_poirier_sauvage', lambda: dessin_pepins(matiere('#140c0a', '#30180e', '#523018', '#7a4a26', '#a8703e'))),
    ('graine_ile_cerisier_sauvage', lambda: dessin_noyau(CREME, 2.6, 2.3, False, 151)),
    ('graine_ile_abricotier_sauvage', lambda: dessin_noyau(BEIGE, 3.6, 2.6, False, 152)),
    ('graine_ile_pecher_sauvage', lambda: dessin_noyau(BRUN_ROUX, 3.8, 3.0, True, 153)),
    ('graine_buisson', dessin_buisson),
    ('graine_herbe', dessin_herbe),
    ('spores_champignon', dessin_spores),
    ('pousse_plante', dessin_pousse),
]


# Puis, copiées de assets/ramassables.png (scripts/carte/ramassables.py) : le gland, la pomme de pin et les pousses
# d'arbre, pour que la scène dessine toutes les graines plantées d'une seule planche.
REPRISES = [('pomme_de_pin', 5), ('gland', 6), ('pousse_pin', 7), ('pousse_arbre', 8)]


def main():
    images = [f() for _, f in ORDRE]
    ram = Image.open(os.path.join(ASSETS, 'ramassables.png')).convert('RGBA')
    images += [ram.crop((k * 16, 0, k * 16 + 16, 16)) for _, k in REPRISES]
    sheet = rangee(images, 16, 16)
    sheet.save(os.path.join(ASSETS, 'graines_ile.png'))
    for (nom, _), im in zip(ORDRE, images[:len(ORDRE)]):
        n = len({p for p in im.getdata() if p[3] == 255})
        print(f'{nom:32} {n:3} couleurs opaques')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_graines_ile.png', zoom=8, fond=(98, 140, 70))


if __name__ == '__main__':
    main()
