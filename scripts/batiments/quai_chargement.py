# Le quai de chargement de la ferme productive (le chantier « l'île à bâtir », fiche I8b : data/recipes.json
# ATELIER.BLOCS quai_chargement, fabriqué à l'Atelier à partir du port de niveau 2 ; posé dehors sur la ferme, il
# regroupe les envois de la tournée du port : js/engine/taches.js porteeNavette). Deux cases de large ; il monte
# au-dessus de sa case (32 × 44 : la potence empiète sur la case du dessus, jamais vers le bas), vu de haut à 45°
# (CLAUDE.md) : une plate-forme de planches surélevée (16 px de fond : 10 rangées de dessus ; 8 px de haut : 7 rangées
# de face), ses planches de pont chacune son ton (le bord avant au soleil, les joints sombres), sa face de madriers
# sur trois poteaux boulonnés ; dessus, des caisses clouées (leur dessus et leur face, la traverse en écharpe), un
# tonneau cerclé (son fond vu d'en haut), une potence de chargement (le poteau, la flèche, sa jambe de force, la
# poulie) d'où pend une caisse au bout de sa corde. Lumière en haut à gauche, contour sombre d'un pixel ; pas d'ombre
# portée (un bloc de la ferme : la scène peint celle du soleil), l'occlusion au pied des caisses et sous la flèche.
#
#   python3 scripts/batiments/quai_chargement.py            écrit assets/meuble_quai_chargement.png
#   python3 scripts/batiments/quai_chargement.py --apercu   écrit aussi apercu_quai_chargement.png (agrandi, sur l'herbe)
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 32, 44
OUT = (28, 20, 18)
# le pont : un bois patiné, gris-brun (une rampe par planche : du froid de l'ombre au chaud du soleil)
PONT = [rampe([(30, 28, 38), (62, 56, 60), (100, 88, 80), (140, 124, 104), (182, 164, 134), (222, 206, 170)], 160),
        rampe([(34, 28, 36), (68, 56, 56), (108, 88, 74), (150, 124, 98), (192, 164, 128), (228, 204, 164)], 160),
        rampe([(28, 30, 40), (58, 60, 66), (94, 92, 86), (134, 128, 110), (176, 168, 140), (216, 208, 178)], 160),
        rampe([(36, 26, 32), (72, 52, 50), (114, 84, 68), (156, 118, 90), (198, 158, 120), (232, 198, 156)], 160)]
# les madriers de la face et les poteaux : un chêne plus sombre, plus rouge
MADRIERS = [rampe([(26, 18, 26), (52, 34, 36), (86, 56, 46), (122, 82, 60), (160, 114, 80), (196, 150, 106)], 160),
            rampe([(24, 20, 30), (48, 38, 42), (80, 60, 52), (116, 88, 66), (154, 120, 88), (190, 156, 116)], 160)]
POTEAU = rampe([(20, 14, 22), (42, 28, 30), (72, 46, 38), (106, 70, 50), (142, 100, 68), (178, 136, 96)], 160)
# les caisses : du pin clair, neuf (une rampe par caisse)
CAISSES = [rampe([(44, 32, 34), (90, 64, 48), (138, 100, 62), (184, 140, 84), (220, 180, 116), (246, 218, 160)], 160),
           rampe([(40, 34, 38), (84, 68, 54), (130, 104, 70), (176, 144, 94), (214, 184, 126), (242, 222, 170)], 160),
           rampe([(46, 30, 30), (94, 60, 44), (144, 94, 58), (190, 132, 78), (226, 172, 108), (250, 212, 150)], 160)]
TONNEAU = rampe([(30, 14, 20), (64, 30, 30), (104, 52, 40), (146, 80, 54), (184, 114, 76), (220, 156, 108)], 160)
FER = rampe([(14, 16, 24), (36, 40, 50), (66, 70, 80), (104, 108, 116), (150, 154, 160), (206, 208, 212)], 140)
CORDE = rampe([(54, 40, 30), (104, 82, 56), (150, 124, 84), (196, 168, 118), (232, 210, 160)], 120)


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def assombrir(self, x, y, k):
        """L'occlusion : le pixel déjà peint, plus sombre et un peu plus froid."""
        if 0 <= x < W and 0 <= y < H and self.px[x, y][3]:
            r, g, b, a = self.px[x, y]
            self.px[x, y] = (int(r * (1 - k)), int(g * (1 - k)), int(min(255, b * (1 - k * 0.7))), a)


# la plate-forme : x 1 à 30 ; le dessus y 26 à 35 (10 rangées), la face y 36 à 42 (7 rangées), le contour autour
X0, X1, DY0, DY1, FY0, FY1 = 1, 30, 26, 35, 36, 42


def pont(t):
    """Le dessus : des planches de 4 px qui vont de l'avant vers le fond, chacune son ton ; plus clair vers l'avant
    (le bord au soleil) et à gauche ; les joints sombres ; le fil du bois, des nœuds."""
    for x in range(X0, X1 + 1):
        k = (x - X0) // 4
        R = PONT[(k * 3 + 1) % 4]
        dk = 0.05 * bruit(k, 1, 41)
        joint = (x - X0) % 4 == 3
        for y in range(DY0, DY1 + 1):
            v = (y - DY0) / (DY1 - DY0)                       # 0 au fond, 1 à l'avant
            u = (x - X0) / (X1 - X0)
            lum = 0.52 + 0.26 * v - 0.16 * u + dk + 0.05 * bruit(x, y // 2, 42) - 0.05 * ((y + 3 * k) % 5 == 0)
            if joint:
                lum = 0.16 + 0.10 * v - 0.06 * u
            elif (x - X0) % 4 == 0:
                lum += 0.06                                   # le chant gauche de la planche, éclairé
            if y == DY1:
                lum = 0.86 - 0.20 * u + dk                    # le nez du pont, au soleil
            if (x, y) in ((6, 30), (19, 28), (26, 33)):
                lum -= 0.16                                   # un nœud
            t.put(x, y, ton(R, lum))


def face(t):
    """La face : deux madriers sur la hauteur, une lisse en haut, trois poteaux boulonnés ; plus sombre en bas (le
    pied, l'occlusion du sol)."""
    for y in range(FY0, FY1 + 1):
        for x in range(X0, X1 + 1):
            u = (x - X0) / (X1 - X0)
            m = 0 if y <= 38 else 1
            R = MADRIERS[m]
            if y == FY0:
                lum = 0.46 - 0.18 * u                         # la lisse, sous le nez du pont
            elif y in (38, 42):
                lum = 0.20 - 0.08 * u                         # le joint, le pied
            else:
                lum = 0.40 - 0.20 * u + 0.05 * bruit(x // 2, y, 43 + m) - 0.04 * (y - FY0) / 6
            t.put(x, y, ton(R, lum))
    for px0 in (1, 15, 29):
        for y in range(FY0, FY1 + 1):
            for x in (px0, px0 + 1):
                lum = (0.50 if x == px0 else 0.26) - 0.05 * (y - FY0) / 6 + 0.03 * bruit(x, y, 44)
                t.put(x, y, ton(POTEAU, lum))
        for y in (37, 40):
            t.put(px0, y, ton(FER, 0.78))
            t.put(px0 + 1, y, ton(FER, 0.30))


def caisse(t, x0, x1, base, haut, fond, R, seed):
    """Une caisse clouée posée sur le pont : sa face (x0 à x1, `haut` rangées au-dessus de `base`), son dessus (`fond`
    rangées) ; le cadre clair, les planches entre deux, la traverse en écharpe, la tranche droite à l'ombre."""
    fy0 = base - haut + 1
    for y in range(fy0 - fond, fy0):                          # le dessus : le plus clair
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            v = (y - (fy0 - fond)) / max(1, fond - 1)
            lum = 0.80 + 0.10 * v - 0.18 * u + 0.04 * bruit(x, y, seed)
            if (x - x0) % 3 == 2:
                lum -= 0.10                                   # les joints des planches du couvercle
            if x in (x0, x1) or y == fy0 - fond:
                lum += 0.04
            t.put(x, y, ton(R, lum))
    for y in range(fy0, base + 1):                            # la face
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            cadre = x in (x0, x1) or y in (fy0, base)
            lum = (0.62 if cadre else 0.48) - 0.22 * u + 0.04 * bruit(x, y, seed + 1)
            if not cadre and (y - fy0) % 3 == 0:
                lum -= 0.10                                   # les joints des planches de la face
            if y == base:
                lum -= 0.14                                   # le pied, à l'ombre de la caisse
            if x == x1:
                lum -= 0.10
            t.put(x, y, ton(R, lum))
    n = max(1, x1 - x0)
    for k in range(n + 1):                                    # la traverse en écharpe, du bas à gauche au haut à droite
        x = x0 + k
        y = base - round(k * (haut - 1) / n)
        if fy0 < y < base and x0 < x < x1:
            t.put(x, y, ton(R, 0.72 - 0.20 * k / n))
            t.put(x, y + 1, ton(R, 0.30 - 0.10 * k / n))
    for (x, y) in ((x0, fy0), (x1, fy0), (x0, base), (x1, base)):
        t.put(x, y, ton(FER, 0.62 if x == x0 else 0.38))      # les clous des coins


def tonneau(t, x0, x1, base):
    """Un tonneau debout : son fond vu d'en haut (une ellipse claire, plus claire à gauche, les douelles), le corps
    bombé (plus clair au milieu à gauche), trois cercles de fer."""
    cx = (x0 + x1) / 2
    rx = (x1 - x0) / 2
    top0, top1 = base - 9, base - 6
    for y in range(top0, base + 1):
        for x in range(x0, x1 + 1):
            u = (x - cx) / rx
            if y <= top1:                                     # le fond : une ellipse aplatie (le raccourci)
                vy = (y - (top0 + top1) / 2) / 2.0
                if u * u + vy * vy > 1.05:
                    continue
                lum = 0.90 - 0.20 * (u + 1) / 2 + 0.04 * bruit(x, y, 51) - (0.08 if (x - x0) % 2 else 0)
                if u * u + vy * vy > 0.55:
                    lum = 0.50 - 0.14 * u                     # le jable, son rebord
            else:
                if abs(u) > 1.0:
                    continue
                bombe = 1 - u * u
                lum = 0.22 + 0.42 * bombe - 0.16 * max(0, u) + 0.04 * bruit(x, y, 52)
                if y in (top1 + 2, base - 4, base - 1):
                    t.put(x, y, ton(FER, 0.30 + 0.45 * bombe - 0.15 * max(0, u)))
                    continue
                if y == base:
                    lum -= 0.10
            t.put(x, y, ton(TONNEAU, lum))


def potence(t):
    """La potence : le poteau (x 26 à 28) planté dans le pont, la flèche vers la gauche (y 2 à 4), sa jambe de force,
    la poulie de fer ; le dessus de chaque pièce le plus clair."""
    for y in range(1, 34):
        for x in range(26, 29):
            lum = (0.70, 0.46, 0.24)[x - 26] + 0.04 * bruit(x, y // 3, 61) - 0.08 * (y > 30)
            if y == 1:
                lum = 0.82 - 0.14 * (x - 26)                  # la tête du poteau, vue d'en haut
            t.put(x, y, ton(POTEAU, lum))
    for x in range(15, 30):                                   # la flèche
        u = (x - 15) / 14
        t.put(x, 2, ton(POTEAU, 0.84 - 0.16 * u))             # son dessus
        t.put(x, 3, ton(POTEAU, 0.52 - 0.14 * u + 0.04 * bruit(x, 3, 62)))
        t.put(x, 4, ton(POTEAU, 0.26 - 0.08 * u))             # son dessous, à l'ombre
    for k in range(7):                                        # la jambe de force, en écharpe
        x, y = 25 - k, 11 - k
        if y >= 5:
            t.put(x, y, ton(POTEAU, 0.58 - 0.03 * k))
            t.put(x + 1, y, ton(POTEAU, 0.28))
    for (x, y, l) in ((16, 5, 0.70), (17, 5, 0.46), (16, 6, 0.40), (17, 6, 0.22)):
        t.put(x, y, ton(FER, l))                              # la poulie
    for y in (2, 3, 4):
        t.assombrir(26, y + 1, 0.0)


def charge(t):
    """La corde qui pend de la poulie, et la caisse qu'elle soulève (un peu à gauche : elle se balance)."""
    for y in range(7, 13):
        t.put(16, y, ton(CORDE, 0.70 - 0.03 * (y - 7)))
        t.put(17, y, ton(CORDE, 0.36))
    for (x, y) in ((15, 13), (18, 13)):
        t.put(x, y, ton(CORDE, 0.55))
    caisse(t, 14, 19, 17, 4, 2, CAISSES[2], 71)


def herbe(im, rng, n=18):
    """Quelques brins d'herbe au pied des poteaux (par-dessus le contour : le quai se pose dans le pré)."""
    px = im.load()
    herbes = rampe([(30, 62, 30), (52, 96, 40), (78, 128, 50), (108, 156, 62), (146, 184, 82), (188, 210, 112)], 120)
    for _ in range(n):
        x = rng.choice((0, 1, 2, 3, 14, 15, 16, 17, 28, 29, 30, 31)) + rng.randrange(-1, 2)
        if not 0 <= x < W:
            continue
        hh = 1 + rng.randrange(3)
        for j in range(hh):
            px[x, H - 1 - j] = ton(herbes, 0.18 + 0.6 * (j + 1) / hh + rng.uniform(-0.06, 0.06)) + (255,)


def quai():
    t = Toile()
    pont(t)
    face(t)
    # (au fond : la potence et deux caisses empilées à gauche ; devant : le tonneau, une caisse au bord du pont)
    potence(t)
    caisse(t, 3, 10, 30, 6, 4, CAISSES[0], 81)
    caisse(t, 4, 9, 24, 5, 3, CAISSES[1], 82)
    tonneau(t, 19, 24, 31)
    caisse(t, 12, 17, 34, 5, 3, CAISSES[1], 83)
    charge(t)
    # (l'occlusion : au pied des caisses et du tonneau sur le pont, sous la flèche contre le poteau)
    for x in range(3, 11):
        t.assombrir(x, 31, 0.30)
    for x in range(19, 25):
        t.assombrir(x, 32, 0.26)
    for x in range(12, 18):
        t.assombrir(x, 35, 0.18)
    for x in range(26, 29):
        t.assombrir(x, 5, 0.25)
    im = contour(t.im, OUT)
    herbe(im, random.Random(37))
    return im


def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def main():
    im = quai()
    im.save(os.path.join(ASSETS, 'meuble_quai_chargement.png'), optimize=True)
    print(f'quai de chargement : {W} × {H}, {couleurs(im)} couleurs')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (W + 16, H + 8), (92, 146, 62, 255))
        ap.alpha_composite(im, (8, 4))
        ap.resize((ap.width * 10, ap.height * 10), Image.NEAREST).save(os.path.join(ROOT, 'apercu_quai_chargement.png'))


if __name__ == '__main__':
    main()
