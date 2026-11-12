# Les cheminées d'intérieur de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : un meuble de deux
# cases de large posé dans la maison (data/recipes.json ATELIER.BLOCS cheminee_<matière>), vu de haut à 45°
# (CLAUDE.md, la règle de dessin) : chaque surface horizontale (le dessus de la hotte, la tablette du manteau,
# le sol de l'âtre, la sole) se voit d'en haut, au-dessus de sa face. Lumière en haut à gauche.
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

W, H = 32, 52
OUT = (34, 22, 16)
FEU_L, FEU_H, FEU_IMAGES, FEU_BAS = 14, 12, 4, 42
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
    """La cheminée vue de haut à 45° (CLAUDE.md, la règle de dessin) : de haut en bas, le dessus de la hotte
    (une bande raccourcie, éclairée) puis sa face ; le dessus de la tablette du manteau, qui avance devant la
    hotte (ce qui est posé dessus y tient debout), puis son chant ; la face du foyer et son ouverture vue d'en
    haut : le contrecœur noirci au fond, puis le sol de l'âtre qui vient vers nous, plus clair vers l'avant, les
    chenets et les bûches couchés dessus ; enfin la sole qui avance dans la pièce : son dessus, puis son chant."""
    R = MATIERES[nom]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = tuple(c[:3]) + (255,)

    def dessus(x0, x1, y0, y1, t0=0.92):
        """Une surface horizontale vue d'en haut : plus claire au fond, à gauche."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                put(x, y, ton(R, t0 - 0.12 * (x - x0) / max(1, x1 - x0) - 0.05 * (y - y0) / max(1, y1 - y0) + 0.02 * bruit(x, y, 14)))

    def face(x0, x1, y0, y1, appar=True):
        """Une face verticale : en dégradé de gauche à droite, plus sombre en bas, l'appareil de la matière."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                u = (x - x0) / max(1, x1 - x0)
                lum = 0.58 - 0.22 * u - 0.10 * (y - y0) / max(1, y1 - y0)
                if x == x0:
                    lum += 0.15
                elif x == x1:
                    lum -= 0.10
                put(x, y, ton(R, appareil(nom, x, y, lum) if appar else lum))

    # la hotte, contre le mur : son dessus (4 rangées), sa face
    dessus(7, 24, 0, 3)
    face(7, 24, 4, 19)
    # la tablette du manteau : elle avance devant la hotte, son dessus (5 rangées), son chant (2)
    dessus(1, 30, 20, 24, 0.95)
    for x in range(1, 31):
        put(x, 25, ton(R, 0.60 - 0.14 * x / 30))
        put(x, 26, ton(R, 0.40 - 0.10 * x / 30))
    # la face du foyer, ses piédroits et son linteau
    face(2, 29, 27, 45)
    # l'ouverture, vue d'en haut : le contrecœur au fond, puis le sol de l'âtre qui vient vers nous
    for y in range(30, 46):
        for x in range(9, 23):
            arc = nom != 'marbre' and y < 33 and abs(x - 15.5) > 4 + (y - 30) * 1.5
            if arc:
                continue
            if y < 37:                                        # le contrecœur, au fond, noirci
                c = ton(SUIE, 0.10 + 0.25 * (y - 30) / 6)
            else:                                             # le sol de l'âtre, vu d'en haut : plus clair vers l'avant
                c = ton(R, appareil(nom, x, y, 0.18 + 0.30 * (y - 37) / 8) - 0.05 * abs(x - 15.5) / 7)
            put(x, y, c)
    for x in (11, 20):                                        # les chenets, debout sur l'âtre
        for y in range(39, 44):
            put(x, y, ton(FER, 0.8 if y == 39 else 0.45))
    for (x0, x1, y) in ((12, 19, 41), (13, 18, 39)):          # les bûches couchées, vues d'en haut
        for x in range(x0, x1 + 1):
            put(x, y, ton(BUCHE, 0.80 - 0.04 * (x - x0)))     # leur dessus, éclairé
            put(x, y + 1, ton(BUCHE, 0.42))
        put(x0, y, ton(BUCHE, 0.98)); put(x0, y + 1, ton(BUCHE, 0.72))   # le bout scié
    # la sole, qui avance dans la pièce : son dessus (4 rangées), son chant (2)
    dessus(0, 31, 46, 49, 0.90)
    for x in range(0, W):
        put(x, 50, ton(R, 0.55 - 0.14 * x / 31))
        put(x, 51, ton(R, 0.35 - 0.10 * x / 31))
    # ce qui est posé sur le manteau : debout sur le dessus de la tablette (leur pied à la rangée 23)
    if nom == 'pierre':
        for x in (5, 26):                                     # deux bougeoirs
            put(x, 23, ton(LAITON, 0.85)); put(x + 1, 23, ton(LAITON, 0.5))
            put(x, 22, ton(CIRE, 0.95)); put(x, 21, ton(CIRE, 0.85)); put(x, 20, ton(CIRE, 0.75)); put(x, 19, ton(FEU, 0.95))
    elif nom == 'briques':
        for x in range(4, 8):                                 # un pot de fleurs : son bord vu d'en haut, son flanc
            put(x, 20, ton(BUCHE, 0.85)); put(x, 21, ton(BUCHE, 0.6)); put(x, 22, ton(BUCHE, 0.5)); put(x, 23, ton(BUCHE, 0.4))
        for (x, y, c) in ((4, 18, (110, 170, 90)), (6, 17, (110, 170, 90)), (7, 18, (90, 150, 80)), (5, 19, (130, 190, 100)),
                          (5, 16, (230, 120, 150)), (7, 16, (240, 200, 90)), (6, 19, (100, 160, 84))):
            put(x, y, c)
    else:
        for y in range(15, 23):                               # une pendule : son cadran rond cerclé d'or, son socle
            for x in range(12, 20):
                d = (x - 15.5) ** 2 + (y - 17.5) ** 2
                if d <= 7.5:
                    put(x, y, (250, 246, 232) if d <= 3.2 else ton(LAITON, 0.85 - 0.1 * (x - 12) / 7))
        for x in range(12, 20):
            put(x, 22, ton(LAITON, 0.95 - 0.1 * (x - 12) / 7))  # le dessus du socle
            put(x, 23, ton(LAITON, 0.55 - 0.1 * (x - 12) / 7))
        put(15, 17, (40, 30, 20)); put(15, 16, (40, 30, 20)); put(16, 17, (40, 30, 20))
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
