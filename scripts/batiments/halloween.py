# Les décors d'Halloween de la boutique de gemmes (worker/src/boutique.mjs ARTICLES, `fete: 'halloween'` : en vente du
# 15 octobre au 2 novembre) : la citrouille sculptée (dehors, une case) et le tas de trois citrouilles (deux cases).
# Leurs visages découpés laissent voir la bougie : une planche d'images posées par-dessus (assets/citrouilles_bougie.png,
# une rangée par décor ; js/carte/ferme/chantier.js stepSurcouches) fait vaciller sa lumière ; le soir, elles éclairent
# le sol (BLOCS_CARTE.lampeChevet.par).
#
# Vues de haut à 45° (CLAUDE.md) : chaque citrouille est une sphère aplatie à côtes (chaque côte son ton, éclairée en
# haut à gauche, l'ombre froide en bas à droite), son dessus et sa queue ; on voit, par les trous du visage, l'intérieur
# éclairé (plus clair vers le haut) ; une ombre douce au pied.
#
#   python3 scripts/batiments/halloween.py            écrit assets/meuble_citrouille_halloween.png, meuble_tas_citrouilles.png,
#                                                     citrouilles_bougie.png
#   python3 scripts/batiments/halloween.py --apercu   écrit aussi apercu_halloween.png (agrandi)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (30, 18, 14)
BOUGIE = 3                                   # les images de la bougie qui vacille
ORANGES = [rampe([(70, 22, 10), (140, 52, 14), (206, 96, 24), (240, 146, 46), (255, 196, 110), (255, 230, 180)], 140),
           rampe([(74, 26, 12), (148, 60, 16), (214, 106, 28), (246, 156, 52), (255, 204, 118), (255, 234, 186)], 140),
           rampe([(66, 20, 12), (132, 48, 16), (198, 90, 26), (236, 138, 44), (252, 188, 104), (255, 226, 176)], 140)]
QUEUE = rampe([(30, 40, 18), (60, 80, 30), (100, 120, 50), (150, 160, 80)], 60)
FEU = [rampe([(120, 40, 10), (230, 120, 30), (255, 210, 90), (255, 250, 200)], 40),
       rampe([(110, 36, 10), (220, 110, 26), (255, 196, 80), (255, 240, 180)], 40),
       rampe([(130, 44, 12), (240, 130, 34), (255, 220, 100), (255, 252, 210)], 40)]
CREUX = (40, 14, 8)
# les décors : (largeur, hauteur de l'image, les citrouilles : (milieu x, milieu y, rayon x, rayon y, sculptée ?))
DECORS = {
    'citrouille_halloween': (18, 18, [(8.5, 10.5, 7.5, 6.2, True)]),
    'tas_citrouilles': (32, 24, [(9.5, 10.5, 6.5, 5.4, False), (22.5, 9.5, 6.0, 5.0, False), (15.5, 15.5, 8.0, 6.6, True)]),
}
MODELES = list(DECORS)


# le visage découpé, pixel par pixel, centré sur la face : deux yeux en triangle, le nez, la bouche dentée
VISAGE = ['.#....#.',
          '##....##',
          '...##...',
          '########',
          '.##..##.']


def trou(x, y, cx, cy):
    """Le pixel (x, y) est-il un trou du visage de la citrouille de milieu (cx, cy) ?"""
    i, j = int(round(x - cx + 3.5)), int(round(y - cy + 1))
    return 0 <= j < len(VISAGE) and 0 <= i < 8 and VISAGE[j][i] == '#'


def citrouille(t, cx, cy, rx, ry, sculptee, k, feu=None):
    """Une citrouille (ou, avec `feu`, seulement la lumière de ses trous, pour la planche de la bougie)."""
    R = ORANGES[k % 3]
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = u * u + v * v
            if d > 1:
                continue
            if sculptee and trou(x, y, cx, cy):
                prof = (y - cy + 1) / 5                      # l'intérieur, vu par le trou : éclairé, plus clair en haut
                if feu is not None:
                    t[x, y] = ton(feu, 0.95 - 0.5 * prof) + (255,)
                elif t is not None:
                    t[x, y] = CREUX + (255,)
                continue
            if feu is not None:
                continue
            nz = math.sqrt(1 - d)
            cote = math.cos(u * math.pi * 2.6) * 0.5 + 0.5    # les côtes
            lum = 0.40 + 0.40 * (-0.55 * u - 0.6 * v + 0.55 * nz) + 0.10 * cote - 0.10 * (cote < 0.15)
            lum += 0.03 * bruit(x, y, 200 + k)
            t[x, y] = ton(R, lum) + (255,)
    if feu is None:
        for y in range(int(cy - ry) - 2, int(cy - ry) + 1):  # la queue, sur le dessus
            t[int(cx), y] = ton(QUEUE, 0.7)
            t[int(cx) + 1, y] = ton(QUEUE, 0.35)


def decor(nom, feu=None):
    W, H, liste = DECORS[nom]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    class P:
        def __setitem__(self, k, c):
            x, y = int(k[0]), int(k[1])
            if 0 <= x < W and 0 <= y < H:
                px[x, y] = c
    p = P()
    for k, (cx, cy, rx, ry, sc) in enumerate(liste):
        citrouille(p, cx, cy, rx, ry, sc, k, feu)
    if feu is not None:
        return im
    return contour(im, OUT)


def main():
    for m in MODELES:
        decor(m).save(os.path.join(ASSETS, f'meuble_{m}.png'), optimize=True)
    W = max(d[0] for d in DECORS.values()); H = max(d[1] for d in DECORS.values())
    planche = Image.new('RGBA', (W * BOUGIE, H * len(MODELES)), (0, 0, 0, 0))
    for r, m in enumerate(MODELES):
        w, h, _ = DECORS[m]
        for k in range(BOUGIE):
            im = decor(m, FEU[k])
            # (chaque image a la taille du décor, posée en bas au milieu d'une case de W × H : comme le décor sur la carte)
            planche.alpha_composite(im, (k * W + (W - w) // 2, r * H + H - h))
    planche.save(os.path.join(ASSETS, 'citrouilles_bougie.png'))
    print(f'Halloween : {len(MODELES)} décors ; la bougie : {BOUGIE} images de {W} × {H} par décor')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (90, 30), (70, 110, 50, 255))
        x = 4
        for m in MODELES:
            a, b = decor(m), decor(m)
            b.alpha_composite(decor(m, FEU[0]))
            for im in (a, b):
                ap.alpha_composite(im, (x, 28 - im.height)); x += im.width + 4
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_halloween.png'))


if __name__ == '__main__':
    main()
