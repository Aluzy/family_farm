# Le panneau du village (le chantier « l'île à bâtir », fiche I7g : data/recipes.json ATELIER.BLOCS panneau_village,
# fabriqué à l'Atelier) : deux cases de large, il monte au-dessus de sa case (32 × 40), vu de haut à 45° (CLAUDE.md).
# Deux poteaux ronds en rondins (le dessus coupé, ses cernes ; l'écorce, éclairée à gauche), un petit toit de bardeaux à
# deux pans (le pan arrière raccourci, le faîte, le pan avant au soleil, le rebord et sa tranche), la planche du nom
# (deux planches clouées : le dessus de la planche du haut vu d'en haut, chaque face son ton et son biseau, le joint, les
# clous), un pied de pierres sèches autour de chaque poteau (chaque pierre son ton, son dessus clair) et des fleurs des
# champs dans l'herbe. La planche est claire : la carte y écrit le nom du village en brun (js/carte/ferme/chantier.js
# stepEnseignes ; BLOCS_CARTE.enseigne « village » : où, et sur quelle largeur) ; le nom n'est pas dessiné. Pas d'ombre
# portée (un bloc de la ferme : la scène peint celle du soleil).
#
#   python3 scripts/batiments/panneau_village.py                   écrit assets/meuble_panneau_village.png
#   python3 scripts/batiments/panneau_village.py --apercu DOSSIER  écrit aussi DOSSIER/apercu_panneau_village.png (agrandi)
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 32, 40
OUT = (30, 22, 20)
# le bois des planches du nom : un miel clair (le nom s'y lit en brun), l'ombre glisse vers un brun violacé
PLANCHES = [rampe([(54, 34, 36), (102, 70, 54), (150, 108, 72), (192, 148, 98), (222, 186, 130), (242, 218, 168), (252, 238, 200)], 160),
            rampe([(50, 36, 40), (96, 72, 58), (144, 110, 78), (186, 150, 104), (218, 188, 138), (240, 220, 176), (250, 240, 208)], 160),
            rampe([(58, 32, 32), (108, 66, 48), (158, 104, 66), (198, 144, 90), (228, 182, 124), (246, 214, 160), (254, 236, 194)], 160)]
# l'écorce des rondins, et le bois coupé de leur dessus (les cernes)
ECORCE = [rampe([(26, 20, 26), (48, 36, 38), (78, 58, 48), (110, 82, 60), (146, 112, 80), (180, 144, 104)], 140),
          rampe([(24, 22, 30), (44, 38, 42), (72, 60, 54), (104, 86, 68), (138, 116, 88), (172, 148, 112)], 140)]
CERNES = rampe([(96, 62, 40), (146, 102, 62), (196, 150, 96), (228, 192, 136), (246, 222, 172)], 100)
BARDEAUX = [rampe([(34, 30, 44), (64, 54, 62), (100, 80, 76), (142, 110, 90), (184, 146, 112), (220, 184, 142)], 140),
            rampe([(38, 28, 40), (72, 50, 56), (112, 76, 66), (152, 104, 78), (192, 140, 100), (226, 178, 132)], 140),
            rampe([(30, 32, 46), (58, 58, 68), (92, 88, 86), (132, 122, 108), (176, 162, 136), (214, 200, 170)], 140)]
PIERRES = [rampe([(34, 34, 46), (66, 66, 76), (102, 100, 104), (140, 136, 134), (180, 174, 166), (214, 208, 196)], 120),
           rampe([(40, 34, 42), (74, 64, 68), (112, 98, 94), (150, 134, 122), (188, 172, 154), (220, 206, 186)], 120),
           rampe([(30, 36, 44), (60, 70, 74), (94, 104, 102), (132, 140, 132), (172, 178, 164), (208, 212, 196)], 120)]
FER = rampe([(18, 20, 28), (42, 44, 54), (72, 74, 82), (108, 110, 116), (152, 154, 158), (204, 204, 206)], 120)
HERBE = rampe([(26, 58, 34), (44, 90, 42), (70, 122, 50), (102, 152, 62), (140, 182, 80), (184, 208, 110)], 120)
FLEURS = [rampe([(120, 30, 60), (190, 60, 80), (236, 112, 120), (252, 176, 170)], 60),      # coquelicot
          rampe([(70, 60, 150), (110, 100, 200), (160, 150, 236), (210, 204, 252)], 60),    # bleuet
          rampe([(150, 110, 30), (214, 170, 50), (246, 214, 96), (254, 242, 170)], 60)]     # bouton d'or


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)


def poteau(t, x0, k):
    """Un rondin (x0 à x0 + 3) : son dessus coupé (une ellipse aplatie, deux rangées : les cernes, clairs), puis
    l'écorce, un cylindre éclairé à gauche, ses gerçures ; plus sombre sous la planche et au pied."""
    R = ECORCE[k % 2]
    x1, haut, bas = x0 + 3, 7, H - 3
    for y in range(haut, bas + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0 + 0.5) / 4
            if y < haut + 2:                                            # le dessus coupé, sous le toit (vu d'en haut)
                d = abs(u - 0.45) * 2 + (0.5 if y == haut else 0)
                t.put(x, y, ton(CERNES, 0.85 - 0.45 * d + 0.06 * bruit(x, y, 40 + k)))
                continue
            lum = 0.74 - 0.62 * u + 0.07 * bruit(x, y // 2, 41 + k)
            if (x * 7 + y // 3 + k) % 5 == 0:
                lum -= 0.16                                             # une gerçure de l'écorce
            if 14 <= y <= 29:
                lum -= 0.10                                             # derrière la planche, dans son ombre
            lum -= 0.22 * max(0, y - (bas - 4)) / 4                     # le pied, entre les pierres
            t.put(x, y, ton(R, lum))


def toit(t):
    """Le petit toit à deux pans, de gauche à droite au-dessus des poteaux (y 0 à 8) : le pan arrière, une bande courte
    et moins éclairée ; le faîte, la ligne la plus claire ; le pan avant (deux rangées de bardeaux décalés, chacun son
    ton) ; le bas des bardeaux, qui ombre ; la tranche du rebord ; les pignons, sombres à droite."""
    for y in range(0, 9):
        for x in range(0, W):
            if y == 0 and (x < 3 or x > W - 4):
                continue
            if y == 1 and (x < 1 or x > W - 2):
                continue
            u = x / (W - 1)
            b = (x + 2 * (y // 2)) // 4
            R = BARDEAUX[(b * 7 + y // 2) % 3]
            nb = 0.05 * bruit(b, y // 2, 50)
            if y == 0:
                lum = 0.46 - 0.14 * u + nb                                     # le pan arrière, raccourci
            elif y == 1:
                lum = 0.58 - 0.16 * u + nb
            elif y == 2:
                lum = 0.97 - 0.18 * u                                          # le faîte
            elif y <= 6:
                joint = (x + 2 * ((y - 3) // 2)) % 4 == 0
                lum = 0.86 - 0.30 * u - 0.07 * (y - 3) - (0.16 if joint else 0) + nb + 0.03 * bruit(x, y, 51)
            elif y == 7:
                lum = 0.40 - 0.16 * u + nb                                     # le bas des bardeaux
            else:
                lum = 0.24 - 0.10 * u                                          # la tranche du rebord
            if x == W - 1 and y >= 2:
                lum -= 0.14
            if x == 0 and y >= 3:
                lum += 0.05
            t.put(x, y, ton(R, lum))


def planche(t):
    """La planche du nom, de x 3 à 28 : son dessus (y 13 à 14, vu d'en haut, le plus clair), deux planches sur sa face
    (y 15 à 21, puis 22 à 28 : chacune son ton, le haut clair, le bas plus sombre, le fil du bois qui reste discret
    pour que le nom se lise), le joint, la tranche droite, les quatre clous ; sous elle, l'ombre."""
    x0, x1 = 3, 28
    for y in (13, 14):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            lum = 0.96 - 0.16 * u - 0.07 * (y == 13) + 0.02 * bruit(x, y, 60)
            t.put(x, y, ton(PLANCHES[2], lum))
    for k, (ya, yb) in enumerate(((15, 21), (22, 28))):
        R = PLANCHES[k]
        dk = 0.03 * bruit(k, 1, 61)
        for y in range(ya, yb + 1):
            for x in range(x0, x1 + 1):
                u, v = (x - x0) / (x1 - x0), (y - ya) / (yb - ya)
                if y == ya:
                    lum = 0.86 - 0.20 * u                                   # l'arête du haut, au soleil
                elif y == yb:
                    lum = 0.34 - 0.12 * u                                   # le joint, dans l'ombre
                else:
                    fil = 0.035 * bruit(x // 3, y, 62 + k) - 0.03 * ((x + 5 * k + y // 3) % 9 == 0)
                    lum = 0.78 - 0.22 * u - 0.10 * v + fil
                lum += dk - 0.04 * k
                if x == x0:
                    lum += 0.04                                             # le bord gauche, éclairé
                if x == x1:
                    lum -= 0.16                                             # la tranche droite
                t.put(x, y, ton(R, lum))
    for (x, y) in ((4, 17), (27, 17), (4, 25), (27, 25)):                   # les clous : un point clair, son ombre
        t.put(x, y, ton(FER, 0.74 if x < 16 else 0.56))
        t.put(x + 1, y + 1, ton(FER, 0.20))
    for x in range(x0 + 1, x1):                                             # sous la planche, l'ombre sur les poteaux
        if 5 < x < 26:
            continue
        t.put(x, 29, ton(ECORCE[0], 0.12))


def pierres(t, cx, rng, k):
    """Le pied de pierres sèches autour d'un poteau : une rangée de cinq pierres, chacune son ton (une rampe tirée),
    son dessus clair (vu d'en haut), sa face qui fonce vers le bas et la droite."""
    xs = [cx - 5, cx - 3, cx - 1, cx + 1, cx + 3]
    for i, xa in enumerate(xs):
        R = PIERRES[(i + k) % 3]
        w = 2 + (i % 2)
        haut = H - 4 - (i % 2)
        for y in range(haut, H - 1):
            for x in range(xa, xa + w):
                u = (x - xa) / max(1, w - 1)
                if y == haut:
                    lum = 0.88 - 0.18 * u                                   # le dessus, au soleil
                else:
                    lum = 0.58 - 0.28 * u - 0.16 * (y - haut - 1) + rng.uniform(-0.04, 0.04)
                t.put(x, y, ton(R, lum + 0.04 * bruit(x, y, 70 + i + k)))


def herbe(im, cx, large, rng, n=16, fleurs=0):
    """Des brins d'herbe et des fleurs des champs au pied (par-dessus le contour : le panneau se fond dans le sol)."""
    px = im.load()
    for _ in range(n):
        dx = max(-large, min(large, rng.gauss(0, large / 2)))
        x = int(round(cx + dx))
        if not 0 <= x < W:
            continue
        hh = 2 + rng.randrange(3)
        for j in range(hh):
            px[x, H - 1 - j] = ton(HERBE, 0.18 + 0.6 * (j + 1) / hh + rng.uniform(-0.06, 0.06)) + (255,)
    for _ in range(fleurs):
        x = int(round(cx + rng.uniform(-large, large)))
        y = H - 3 - rng.randrange(2)
        if not 1 <= x < W - 1:
            continue
        F = FLEURS[rng.randrange(3)]
        px[x, y] = ton(F, 0.95) + (255,)                                    # le cœur au soleil
        px[x - 1, y] = ton(F, 0.70) + (255,)
        px[x + 1, y] = ton(F, 0.42) + (255,)                                # le pétale de droite, à l'ombre
        px[x, y + 1] = ton(F, 0.30) + (255,)
        px[x, y + 2] = ton(HERBE, 0.35) + (255,)                            # la tige


def panneau():
    t = Toile()
    poteau(t, 4, 0)
    poteau(t, 24, 1)
    planche(t)
    toit(t)
    rng = random.Random(7)
    pierres(t, 6, rng, 0)
    pierres(t, 26, rng, 1)
    im = contour(t.im, OUT)
    herbe(im, 6, 7, random.Random(11), n=10)
    herbe(im, 26, 7, random.Random(12), n=10)
    herbe(im, 16, 5, random.Random(13), n=10, fleurs=3)
    return im


def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def main():
    im = panneau()
    im.save(os.path.join(ASSETS, 'meuble_panneau_village.png'), optimize=True)
    print(f'panneau du village : {W} × {H}, {couleurs(im)} couleurs')
    if '--apercu' in sys.argv:
        i = sys.argv.index('--apercu')
        dossier = sys.argv[i + 1] if i + 1 < len(sys.argv) else '.'
        ap = Image.new('RGBA', (W + 10, H + 8), (92, 146, 62, 255))
        ap.alpha_composite(im, (5, 4))
        ap.resize((ap.width * 10, ap.height * 10), Image.NEAREST).save(os.path.join(dossier, 'apercu_panneau_village.png'))


if __name__ == '__main__':
    main()
