# La boîte aux lettres d'un villageois (le chantier « l'île à bâtir », fiche I3a : data/recipes.json ATELIER.BLOCS
# boite_aux_lettres, fabriquée à l'Atelier) : posée dehors contre la porte d'une maison, elle la marque « à un
# villageois » (js/engine/blocs.js, maisonsMarquees). Une case de large, elle monte au-dessus de sa case (16 × 28),
# vue de haut à 45° (CLAUDE.md) : un poteau de bois brut, un coffre de planches clouées (chaque planche son ton, son
# biseau : le dessus clair, le bas et la droite plus sombres), son couvercle à deux pans de bardeaux (le dessus des
# deux pans, la tranche du pignon), la fente vue d'en haut (on voit le fond, plus clair vers l'avant), le drapeau
# rouge levé sur sa tige de fer, une plaque de laiton, l'herbe au pied. Pas d'ombre portée (un bloc de la ferme :
# la scène peint celle du soleil). Rustique, sans peinture : elle ne se confond pas avec les boîtes de la boutique
# de gemmes (scripts/batiments/enseignes.py).
#
#   python3 scripts/batiments/boite_villageois.py            écrit assets/meuble_boite_aux_lettres.png
#   python3 scripts/batiments/boite_villageois.py --apercu   écrit aussi apercu_boite_villageois.png (agrandi, sur l'herbe)
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 16, 28
OUT = (30, 22, 18)
# le bois des planches : des rampes proches (une par planche), qui glissent du froid (l'ombre, un brun violacé) au
# chaud (la lumière, un miel doré)
PLANCHES = [rampe([(38, 26, 30), (74, 50, 42), (116, 80, 54), (156, 112, 70), (196, 150, 96), (232, 194, 136)], 140),
            rampe([(36, 28, 32), (70, 52, 44), (110, 82, 58), (150, 114, 76), (190, 152, 102), (226, 196, 142)], 140),
            rampe([(42, 26, 28), (80, 48, 38), (124, 78, 50), (164, 110, 66), (204, 148, 90), (238, 190, 128)], 140),
            rampe([(34, 28, 34), (66, 54, 48), (104, 84, 62), (144, 116, 82), (184, 154, 108), (222, 198, 150)], 140)]
POTEAU = rampe([(30, 24, 26), (60, 44, 38), (98, 70, 48), (138, 100, 66), (176, 136, 92), (210, 172, 124)], 140)
# les bardeaux du couvercle : un bois plus gris, patiné
BARDEAUX = [rampe([(34, 32, 40), (64, 58, 60), (100, 90, 82), (140, 126, 106), (182, 166, 136), (218, 204, 172)], 140),
            rampe([(38, 30, 36), (70, 56, 56), (108, 88, 76), (148, 124, 100), (188, 164, 130), (222, 202, 166)], 140),
            rampe([(30, 32, 42), (58, 60, 66), (94, 92, 88), (134, 128, 112), (176, 170, 142), (214, 208, 178)], 140)]
FER = rampe([(18, 20, 28), (42, 44, 54), (72, 74, 82), (108, 110, 116), (152, 154, 158), (204, 204, 206)], 120)
ROUGE = rampe([(70, 12, 30), (128, 24, 34), (182, 44, 40), (222, 82, 58), (248, 140, 96)], 120)
LAITON = rampe([(70, 48, 18), (130, 96, 40), (190, 150, 70), (232, 204, 120), (255, 244, 196)], 100)
FOND = rampe([(12, 10, 16), (34, 26, 30), (62, 46, 42), (96, 72, 56), (128, 98, 72)], 100)
HERBE = rampe([(30, 62, 30), (52, 96, 40), (78, 128, 50), (108, 156, 62), (146, 184, 82), (188, 210, 112)], 120)


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)


def poteau(t):
    """Le poteau carré (x 6 à 9) : son dessus caché sous le coffre ; sa face éclairée à gauche, le fil du bois, une
    fente sèche, plus sombre au pied (l'occlusion de l'herbe)."""
    x0, x1, y0, y1 = 6, 9, 17, H - 2
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            lum = 0.70 - 0.42 * u + 0.05 * bruit(x, y // 3, 11) - 0.07 * ((x * 5 + y // 5) % 4 == 0)
            lum -= 0.20 * max(0, y - (y1 - 5)) / 5           # le pied, dans l'herbe
            lum -= 0.16 * max(0, (y0 + 2) - y) / 2           # sous le coffre : l'ombre qu'il porte
            if x == 8 and 20 <= y <= 23:
                lum -= 0.22                                  # une fente du bois
            t.put(x, y, ton(POTEAU, lum))


def coffre(t):
    """Le coffre : trois planches horizontales sur sa face (x 1 à 14, y 9 à 17), le dessus (y 6 à 8) vu d'en haut,
    chaque planche son ton ; la fente, ouverte sur le fond ; la tranche droite dans l'ombre."""
    x0, x1 = 1, 14
    # le dessus du coffre (sous le couvercle, on n'en voit que l'avant : une bande claire)
    for y in range(7, 9):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            lum = 0.90 - 0.22 * u - 0.06 * (y == 7) + 0.03 * bruit(x, y, 12)
            t.put(x, y, ton(PLANCHES[3], lum))
    # la face : trois planches (chacune son ton, son biseau : le haut clair, le bas sombre ; le joint entre elles)
    for k, (ya, yb) in enumerate(((9, 11), (12, 14), (15, 17))):
        R = PLANCHES[k % 4]
        dk = 0.04 * bruit(k, 0, 13)
        for y in range(ya, yb + 1):
            for x in range(x0, x1 + 1):
                u = (x - x0) / (x1 - x0)
                if y == ya:
                    lum = 0.74 - 0.30 * u                     # l'arête du haut, au soleil
                elif y == yb:
                    lum = 0.30 - 0.14 * u                     # le joint, dans l'ombre
                else:
                    lum = 0.60 - 0.34 * u + 0.05 * bruit(x // 2, y, 14 + k) - 0.06 * ((x + 3 * k) % 5 == 0)
                lum += dk - 0.05 * k                          # plus bas, un peu plus sombre (l'occlusion)
                if x == x1:
                    lum -= 0.12                               # la tranche droite
                t.put(x, y, ton(R, lum))
    # les clous : un point clair, son ombre
    for (x, y) in ((2, 10), (13, 10), (2, 13), (13, 13), (2, 16), (13, 16)):
        t.put(x, y, ton(FER, 0.72 if x < 8 else 0.55))
        t.put(x + 1, y, ton(FER, 0.22))
    # la fente, vue de haut : le fond (plus clair vers l'avant), la paroi gauche éclairée, la droite dans l'ombre
    for x in range(4, 12):
        t.put(x, 10, ton(FOND, 0.05 + 0.02 * (x - 4) / 7))
        t.put(x, 11, ton(FOND, 0.55 - 0.05 * (x - 4)))
    t.put(4, 10, ton(FOND, 0.45)); t.put(11, 11, ton(FOND, 0.12))
    # la plaque de laiton (le numéro de la maison) : son dessus clair, sa face qui fonce vers la droite
    for x in range(6, 10):
        t.put(x, 13, ton(LAITON, 0.92 - 0.12 * (x - 6)))
        t.put(x, 14, ton(LAITON, 0.62 - 0.12 * (x - 6)))
    t.put(7, 14, ton(LAITON, 0.18)); t.put(8, 14, ton(LAITON, 0.25))       # le chiffre gravé


def couvercle(t):
    """Le couvercle à deux pans de bardeaux, le faîte de gauche à droite (y 2 à 8), qui déborde du coffre : vu de haut
    à 45°, le pan arrière n'est qu'une bande raccourcie (tournée vers le fond, moins éclairée), le faîte la ligne la
    plus claire, le pan avant la plus grande surface (au soleil, deux rangées de bardeaux décalées, chacun son ton),
    puis le rebord avant, la tranche dans l'ombre ; le pignon droit, une petite face sombre."""
    for y in range(2, 9):
        for x in range(0, W):
            if y == 2 and (x < 2 or x > 13):
                continue                                      # (le pan arrière, plus court : la perspective)
            u = x / (W - 1)
            R = BARDEAUX[(x + 2 * (y // 2)) // 4 % 3]
            if y == 2:
                lum = 0.50 - 0.16 * u + 0.04 * bruit(x, y, 16)            # le pan arrière
            elif y == 3:
                lum = 0.96 - 0.20 * u                                       # le faîte
            elif y <= 6:
                rang = (y - 4) // 2 if y < 6 else 1
                joint = (x + 2 * rang) % 4 == 0
                lum = 0.84 - 0.30 * u - 0.08 * (y - 4) - (0.15 if joint else 0) + 0.05 * bruit(x, y, 15)
            elif y == 7:
                lum = 0.40 - 0.16 * u                                       # le bas des bardeaux, qui ombre
            else:
                lum = 0.26 - 0.12 * u                                       # la tranche du rebord
            if x == W - 1 and y >= 4:
                lum -= 0.14                                                 # le pignon droit, dans l'ombre
            t.put(x, y, ton(R, lum))


def drapeau(t):
    """Le drapeau rouge levé, sur sa tige de fer, contre le flanc droit : la tige (éclairée à gauche), le drapeau
    (son dessus clair, son pli)."""
    for y in range(0, 15):
        t.put(15, y, ton(FER, 0.62 - 0.03 * y))
    t.put(15, 15, ton(FER, 0.2))
    for y in range(0, 3):
        for x in range(12, 15):
            lum = 0.92 - 0.12 * (x - 12) - 0.12 * y + (0.08 if (x + y) % 3 == 0 else 0)
            t.put(x, y, ton(ROUGE, lum))
    t.put(12, 2, ton(ROUGE, 0.25))                             # le pli, dans l'ombre


def herbe(im, cx, large, rng, n=16):
    """Des brins d'herbe au pied (par-dessus le contour : la boîte se fond dans le sol)."""
    px = im.load()
    for _ in range(n):
        dx = max(-large, min(large, rng.gauss(0, large / 2)))
        x = int(round(cx + dx))
        if not 0 <= x < W:
            continue
        hh = 2 + rng.randrange(3)
        for j in range(hh):
            px[x, H - 1 - j] = ton(HERBE, 0.18 + 0.6 * (j + 1) / hh + rng.uniform(-0.06, 0.06)) + (255,)


def boite():
    t = Toile()
    poteau(t)
    coffre(t)
    couvercle(t)
    drapeau(t)
    im = contour(t.im, OUT)
    herbe(im, 7.5, 3, random.Random(31))
    return im


def couleurs(im):
    px = im.load()
    return len({px[x, y] for x in range(im.width) for y in range(im.height) if px[x, y][3] == 255})


def main():
    im = boite()
    im.save(os.path.join(ASSETS, 'meuble_boite_aux_lettres.png'), optimize=True)
    print(f'boîte aux lettres d\'un villageois : {W} × {H}, {couleurs(im)} couleurs')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (W + 8, H + 6), (92, 146, 62, 255))
        ap.alpha_composite(im, (4, 3))
        ap.resize((ap.width * 10, ap.height * 10), Image.NEAREST).save(os.path.join(ROOT, 'apercu_boite_villageois.png'))


if __name__ == '__main__':
    main()
