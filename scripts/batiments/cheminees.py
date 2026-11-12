# Les cheminées d'intérieur de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : un meuble de deux
# cases de large posé dans la maison (data/recipes.json ATELIER.BLOCS cheminee_<matière>), vu de haut à 45° :
# la hotte qui monte contre le mur, le manteau (sa tablette éclairée, ce qui est posé dessus), le foyer (ses
# piédroits, son ouverture noircie, les chenets et les bûches), la sole devant. Lumière en haut à gauche.
#
# Le feu est à part (assets/cheminee_feu.png : FEU_IMAGES images de FEU_L × FEU_H) : la carte le pose dans le
# foyer, le soir, et fait danser ses images (js/carte/ferme/chantier.js syncCheminees, stepLanterns) ; son
# bas est la rangée FEU_BAS de l'image de la cheminée.
#
#   python3 scripts/batiments/cheminees.py            écrit assets/meuble_cheminee_<matière>.png et cheminee_feu.png
#   python3 scripts/batiments/cheminees.py --apercu   écrit aussi apercu_cheminees.png (agrandi, éteintes et allumées)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))           # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))  # scripts/carte/nuances.py
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 32, 46
OUT = (34, 22, 16)
FEU_L, FEU_H, FEU_IMAGES, FEU_BAS = 14, 12, 4, 40
SUIE = rampe([(10, 8, 8), (30, 22, 18), (58, 40, 30)])
FER = rampe([(24, 24, 28), (60, 60, 68), (120, 120, 130)])
BUCHE = rampe([(40, 24, 14), (90, 56, 32), (150, 104, 62), (220, 176, 120)])
LAITON = rampe([(84, 56, 18), (150, 108, 36), (206, 164, 70), (250, 230, 160)])
CIRE = rampe([(200, 186, 150), (240, 232, 210), (255, 250, 236)])
FEU = rampe([(120, 20, 10), (210, 70, 20), (250, 140, 40), (255, 210, 90), (255, 250, 210)])
MATIERES = {
    'pierre': rampe([(70, 62, 54), (110, 100, 88), (150, 140, 124), (190, 180, 162), (222, 214, 198)]),
    'briques': rampe([(80, 34, 26), (130, 56, 40), (170, 82, 58), (204, 120, 90), (230, 170, 140)]),
    'marbre': rampe([(150, 146, 140), (196, 192, 186), (226, 224, 220), (244, 244, 242), (255, 255, 255)]),
}


def appareil(nom, x, y, lum):
    """La texture de la matière au pixel (x, y) : les joints des pierres, des briques ; les veines du marbre."""
    if nom == 'pierre':
        r = y // 4
        joint = y % 4 == 3 or (x + (r % 2) * 3) % 6 == 0
        return lum - 0.22 if joint else lum + 0.08 * bruit((x + (r % 2) * 3) // 6, r, 11)
    if nom == 'briques':
        r = y // 3
        joint = y % 3 == 2 or (x + (r % 2) * 2) % 5 == 0
        return lum - 0.25 if joint else lum + 0.06 * bruit((x + (r % 2) * 2) // 5, r, 12)
    veine = abs(math.sin(x * 0.45 + y * 0.8 + 2 * math.sin(y * 0.3))) < 0.12
    return lum - (0.18 if veine else 0) + 0.02 * bruit(x, y, 13)


def cheminee(nom):
    R = MATIERES[nom]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = tuple(c[:3]) + (255,)

    for y in range(0, 18):                                    # la hotte, contre le mur
        for x in range(6, 26):
            u = (x - 6) / 19
            lum = 0.62 - 0.22 * u - 0.10 * (y / 17)
            if x == 6:
                lum += 0.15
            put(x, y, ton(R, appareil(nom, x, y, lum)))
    for x in range(6, 26):
        put(x, 0, ton(R, 0.9 - 0.2 * (x - 6) / 19))           # son arête
    for y in range(18, 21):                                   # la tablette du manteau, vue de dessus
        for x in range(1, 31):
            put(x, y, ton(R, 0.92 - 0.14 * x / 30 - 0.04 * (y - 18) + 0.02 * bruit(x, y, 14)))
    for y in (21, 22):                                        # son chant
        for x in range(1, 31):
            put(x, y, ton(R, (0.55 if y == 21 else 0.38) - 0.12 * x / 30))
    for y in range(23, 42):                                   # le foyer : les piédroits, le linteau
        for x in range(2, 30):
            if 9 <= x <= 22 and y >= 26:
                continue
            u = (x - 2) / 27
            lum = 0.58 - 0.22 * u - 0.08 * (y - 23) / 18
            if x == 2:
                lum += 0.16
            put(x, y, ton(R, appareil(nom, x, y, lum)))
    for y in range(26, 42):                                   # l'ouverture noircie (cintrée en pierre, en briques)
        for x in range(9, 23):
            arc = nom != 'marbre' and y < 29 and abs(x - 15.5) > 4 + (y - 26) * 1.5
            if arc:
                put(x, y, ton(R, appareil(nom, x, y, 0.45)))
                continue
            put(x, y, ton(SUIE, 0.15 + 0.5 * (y - 26) / 15 * (1 - abs(x - 15.5) / 8)))
    for x in (10, 21):                                        # les chenets
        for y in range(37, 42):
            put(x, y, ton(FER, 0.75 if y == 37 else 0.4))
    for k, (x0, x1, y) in enumerate(((11, 20, 39), (12, 19, 37))):   # les bûches
        for x in range(x0, x1 + 1):
            put(x, y, ton(BUCHE, 0.75 - 0.04 * (x - x0)))
            put(x, y + 1, ton(BUCHE, 0.40))
        put(x0, y, ton(BUCHE, 0.95)); put(x0, y + 1, ton(BUCHE, 0.7))   # le bout scié
    for y in range(42, H):                                    # la sole, devant
        for x in range(0, W):
            put(x, y, ton(R, (0.85 if y == 42 else 0.6 - 0.1 * (y - 43)) - 0.12 * x / 31))
    # ce qui est posé sur le manteau
    if nom == 'pierre':
        for x in (5, 26):                                     # deux bougeoirs
            put(x, 17, ton(LAITON, 0.8)); put(x, 16, ton(CIRE, 0.9)); put(x, 15, ton(CIRE, 0.8)); put(x, 14, ton(FEU, 0.9))
    elif nom == 'briques':
        for x in range(4, 8):                                 # un pot de fleurs
            put(x, 17, ton(BUCHE, 0.6)); put(x, 16, ton(BUCHE, 0.7))
        for (x, y) in ((4, 15), (6, 14), (7, 15), (5, 14)):
            put(x, y, (110, 170, 90))
        put(5, 13, (230, 120, 150)); put(7, 13, (240, 200, 90))
    else:
        for y in range(11, 18):                               # une pendule : son cadran rond cerclé d'or, son socle
            for x in range(12, 20):
                d = (x - 15.5) ** 2 + (y - 13.5) ** 2
                if d <= 7.5:
                    put(x, y, (250, 246, 232) if d <= 3.2 else ton(LAITON, 0.85 - 0.1 * (x - 12) / 7))
        for x in range(12, 20):
            put(x, 17, ton(LAITON, 0.8 - 0.1 * (x - 12) / 7))
        put(15, 13, (40, 30, 20)); put(15, 12, (40, 30, 20)); put(16, 13, (40, 30, 20))
    return contour(im, OUT)


def feu(k):
    """Le feu, image k : des flammes qui dansent au-dessus des bûches, des braises dessous."""
    im = Image.new('RGBA', (FEU_L, FEU_H), (0, 0, 0, 0))
    px = im.load()
    for x in range(FEU_L):
        h = 5 + 4 * max(0, math.sin((x + 1) * 0.55 + k * 1.7)) + 2 * math.sin(x * 1.3 + k * 2.3)
        h *= 1 - ((x - 6.5) / 7.5) ** 2 * 0.7
        for j in range(int(h)):
            y = FEU_H - 3 - j
            if y < 0:
                break
            t = 0.95 - 0.75 * j / max(1, h)
            px[x, y] = ton(FEU, t) + (255 if j < h - 1 else 200,)
    for x in range(1, FEU_L - 1):                             # les braises
        px[x, FEU_H - 2] = ton(FEU, 0.55 + 0.35 * ((x + k) % 3 == 0)) + (255,)
        px[x, FEU_H - 1] = ton(FEU, 0.3) + (255,)
    return im


def main():
    for nom in MATIERES:
        cheminee(nom).save(os.path.join(ASSETS, f'meuble_cheminee_{nom}.png'), optimize=True)
    planche = Image.new('RGBA', (FEU_L * FEU_IMAGES, FEU_H), (0, 0, 0, 0))
    for k in range(FEU_IMAGES):
        planche.alpha_composite(feu(k), (k * FEU_L, 0))
    planche.save(os.path.join(ASSETS, 'cheminee_feu.png'))
    print(f'cheminées : {len(MATIERES)} matières de {W} × {H} ; le feu : {FEU_IMAGES} images de {FEU_L} × {FEU_H}')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', ((W + 6) * len(MATIERES) * 2, H + 4), (150, 120, 86, 255))
        for i, nom in enumerate(MATIERES):
            for j in range(2):
                c = cheminee(nom)
                if j:
                    c.alpha_composite(feu(1), ((W - FEU_L) // 2, FEU_BAS - FEU_H + 1))
                ap.alpha_composite(c, ((i * 2 + j) * (W + 6) + 3, 2))
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_cheminees.png'))


if __name__ == '__main__':
    main()
