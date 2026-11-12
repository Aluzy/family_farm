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
SUIE = rampe([(6, 5, 8), (20, 14, 14), (40, 28, 24), (70, 50, 40)], 120)
FER = rampe([(18, 18, 26), (44, 44, 54), (82, 82, 92), (140, 138, 140), (200, 196, 190)], 120)
BUCHE = rampe([(34, 20, 16), (70, 42, 26), (112, 72, 42), (158, 110, 66), (210, 166, 112), (240, 210, 160)], 120)
LAITON = rampe([(70, 44, 20), (130, 90, 34), (186, 140, 58), (226, 190, 100), (252, 236, 180)], 120)
CIRE = rampe([(176, 160, 140), (222, 212, 192), (244, 238, 222), (255, 252, 242)], 120)
FEU = rampe([(110, 18, 12), (190, 50, 18), (236, 110, 30), (252, 170, 60), (255, 220, 120), (255, 250, 220)], 160)
BRAISE = rampe([(60, 16, 10), (140, 34, 14), (220, 80, 24), (255, 150, 60)], 120)
# les matières : trois rampes proches chacune (une par pierre, brique… tirée au hasard fixe), dont la teinte glisse
# du froid dans l'ombre au chaud dans la lumière (CLAUDE.md, la règle des nuances)
MATIERES = {
    'pierre': [rampe([(52, 52, 62), (90, 88, 92), (132, 126, 120), (174, 166, 152), (210, 202, 184), (236, 230, 214)], 160),
               rampe([(56, 54, 60), (96, 92, 90), (140, 132, 120), (182, 172, 152), (216, 206, 182), (240, 232, 210)], 160),
               rampe([(50, 54, 64), (86, 90, 98), (126, 128, 128), (168, 166, 158), (204, 202, 190), (232, 230, 218)], 160)],
    'briques': [rampe([(60, 24, 30), (108, 42, 36), (154, 66, 46), (192, 100, 70), (222, 142, 106), (244, 190, 156)], 160),
                rampe([(66, 28, 28), (118, 50, 34), (166, 80, 48), (204, 116, 76), (232, 160, 116), (248, 204, 168)], 160),
                rampe([(54, 22, 34), (100, 38, 42), (142, 58, 52), (180, 90, 72), (212, 130, 106), (238, 178, 150)], 160)],
    'marbre': [rampe([(120, 118, 132), (166, 164, 172), (202, 200, 202), (228, 226, 222), (246, 244, 238), (255, 254, 250)], 160),
               rampe([(124, 120, 128), (172, 166, 166), (208, 202, 196), (232, 226, 218), (248, 244, 236), (255, 253, 248)], 160),
               rampe([(116, 120, 136), (160, 166, 178), (198, 202, 208), (226, 228, 228), (244, 246, 244), (255, 255, 252)], 160)],
}
JOINT = {'pierre': rampe([(40, 36, 36), (74, 68, 64), (110, 102, 94)], 80),
         'briques': rampe([(70, 60, 54), (130, 118, 104), (176, 164, 146)], 80),
         'marbre': rampe([(96, 98, 112), (132, 134, 146)], 80)}


def element(nom, x, y):
    """L'élément de la matière au pixel (x, y) : (joint ?, son numéro, sa place dedans (u, v de 0 à 1))."""
    if nom == 'pierre':
        r = y // 4
        dx = x + (r % 2) * 3
        if y % 4 == 3 or dx % 6 == 0:
            return True, None, 0, 0
        return False, (dx // 6, r), (dx % 6) / 5, (y % 4) / 2
    if nom == 'briques':
        r = y // 3
        dx = x + (r % 2) * 2
        if y % 3 == 2 or dx % 5 == 0:
            return True, None, 0, 0
        return False, (dx // 5, r), (dx % 5) / 4, (y % 3) / 1
    # le marbre : de grandes dalles (8 × 10), les veines qui y serpentent
    return (x % 8 == 7 or y % 10 == 9), (x // 8, y // 10), (x % 8) / 6, (y % 10) / 8


def matiere(nom, x, y, lum):
    """La couleur de la matière en (x, y) pour une lumière `lum` : chaque élément sa rampe et son ton, modelé
    (biseau : le haut et la gauche plus clairs, le bas et la droite plus sombres), les joints en retrait."""
    joint, k, u, v = element(nom, x, y)
    if joint and nom != 'marbre':
        return ton(JOINT[nom], lum * 0.85 + 0.03 * bruit(x, y, 21))
    if joint:
        return ton(MATIERES[nom][1], lum - 0.10)
    R = MATIERES[nom][int((bruit(k[0], k[1], 22) + 1) * 1.5) % 3]
    lum += 0.07 * bruit(k[0], k[1], 23)                     # le ton de l'élément
    lum += 0.06 * (1 - u) * (u < 0.3) + 0.05 * (v < 0.4) - 0.06 * (u > 0.8) - 0.05 * (v > 0.8)   # le biseau
    lum += 0.025 * bruit(x, y, 24)                          # le grain
    if nom == 'marbre':                                     # les veines grises qui serpentent
        if abs(math.sin(x * 0.45 + y * 0.8 + 2 * math.sin(y * 0.3) + k[0])) < 0.10:
            lum -= 0.16
    return ton(R, lum)


def cheminee(nom):
    """La cheminée vue de haut à 45° (CLAUDE.md, la règle de dessin) : de haut en bas, le dessus de la hotte
    (une bande raccourcie, éclairée) puis sa face ; le dessus de la tablette du manteau, qui avance devant la
    hotte (ce qui est posé dessus y tient debout), puis son chant ; la face du foyer et son ouverture vue d'en
    haut : le contrecœur noirci au fond, puis le sol de l'âtre qui vient vers nous, plus clair vers l'avant, les
    chenets et les bûches couchés dessus ; enfin la sole qui avance dans la pièce : son dessus, puis son chant.
    Chaque pierre, brique ou dalle a sa nuance et son biseau ; les ombres sous ce qui avance et dans les angles."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = tuple(c[:3]) + (255,)

    def dessus(x0, x1, y0, y1, t0=0.92):
        """Une surface horizontale vue d'en haut : plus claire au fond et à gauche, ses dalles."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                lum = t0 - 0.14 * (x - x0) / max(1, x1 - x0) - 0.07 * (y - y0) / max(1, y1 - y0)
                if y == y0:
                    lum += 0.04                               # l'arête du fond, au soleil
                dalle = x // 8                                # de grandes dalles, chacune sa nuance
                R = MATIERES[nom][int((bruit(dalle, y0, 41) + 1) * 1.5) % 3]
                lum += 0.05 * bruit(dalle, y0, 42) + 0.015 * bruit(x, y, 43)
                if x % 8 == 0 and x > x0:
                    lum -= 0.10                               # le joint entre deux dalles
                elif x % 8 == 1:
                    lum += 0.03
                put(x, y, ton(R, lum))

    def chant(x0, x1, y0, y1, t0=0.58):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                put(x, y, matiere(nom, x, y, t0 - 0.16 * (x - x0) / max(1, x1 - x0) - 0.18 * (y - y0) / max(1, y1 - y0 + 1)))

    def face(x0, x1, y0, y1, ombre_haut=0):
        """Une face verticale : dégradé de gauche à droite, plus sombre en bas ; l'ombre portée de ce qui
        avance au-dessus (ombre_haut rangées)."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                u = (x - x0) / max(1, x1 - x0)
                lum = 0.60 - 0.24 * u - 0.10 * (y - y0) / max(1, y1 - y0)
                if x == x0:
                    lum += 0.14
                elif x == x1:
                    lum -= 0.10
                if y - y0 < ombre_haut:
                    lum -= 0.18 * (1 - (y - y0) / ombre_haut)
                put(x, y, matiere(nom, x, y, lum))

    dessus(7, 24, 0, 3)                                       # la hotte : son dessus, sa face
    face(7, 24, 4, 19, ombre_haut=2)
    dessus(1, 30, 20, 24, 0.96)                               # la tablette du manteau
    chant(1, 30, 25, 26, 0.62)
    face(2, 29, 27, 45, ombre_haut=3)                         # la face du foyer, sous l'ombre de la tablette
    for y in range(30, 46):                                   # l'ouverture, vue d'en haut
        for x in range(9, 23):
            arc = nom != 'marbre' and y < 33 and abs(x - 15.5) > 4 + (y - 30) * 1.5
            if arc:
                continue
            bord = min(x - 9, 22 - x)
            if y < 37:                                        # le contrecœur, noirci, plus sombre en haut
                c = ton(SUIE, 0.12 + 0.30 * (y - 30) / 6 - 0.08 * (bord < 1) + 0.04 * bruit(x, y, 31))
            else:                                             # le sol de l'âtre : les cendres vers nous, plus claires
                f = (y - 37) / 8
                c = ton(SUIE, 0.45 + 0.45 * f - 0.15 * (bord < 1) + 0.08 * bruit(x, y, 32)) if f < 0.7 else matiere(nom, x, y, 0.22 + 0.25 * f - 0.08 * (bord < 1))
            put(x, y, c)
    for x in range(9, 23):                                    # l'ombre du linteau sur le haut du foyer
        if px[x, 33][3]:
            r, g, b, a = px[x, 33]
            px[x, 33] = (r * 3 // 4, g * 3 // 4, b * 3 // 4, a)
    for xc in (11, 20):                                       # les chenets : leur pied, leur tige, leur pommeau
        for y in range(39, 45):
            put(xc, y, ton(FER, 0.75 - 0.06 * (y - 39)))
            put(xc + 1, y, ton(FER, 0.30 - 0.03 * (y - 39)))
        put(xc, 38, ton(LAITON, 0.95)); put(xc + 1, 38, ton(LAITON, 0.55))
        put(xc - 1, 44, ton(FER, 0.55)); put(xc + 2, 44, ton(FER, 0.2))
    for (x0, x1, y) in ((12, 19, 41), (13, 18, 39)):          # les bûches couchées : l'écorce, le bout scié
        for x in range(x0, x1 + 1):
            t = (x - x0) / max(1, x1 - x0)
            put(x, y, ton(BUCHE, 0.70 - 0.20 * t + 0.06 * bruit(x, y, 33)))
            put(x, y + 1, ton(BUCHE, 0.38 - 0.12 * t + 0.05 * bruit(x, y + 1, 34)))
        put(x0, y, ton(BUCHE, 0.98)); put(x0, y + 1, ton(BUCHE, 0.80))
        put(x0 + 1, y, ton(BUCHE, 0.62))
    dessus(0, 31, 46, 49, 0.92)                               # la sole qui avance : son dessus, son chant
    chant(0, 31, 50, 51, 0.52)
    for x in range(2, 30):                                    # l'ombre du foyer au bord du fond de la sole
        if px[x, 46][3]:
            r, g, b, a = px[x, 46]
            px[x, 46] = (r * 4 // 5, g * 4 // 5, b * 4 // 5, a)
    # ce qui est posé sur le manteau, debout sur la tablette (pied à la rangée 23), son ombre derrière lui
    if nom == 'pierre':
        for x in (5, 26):                                     # deux bougeoirs de laiton, leurs chandelles
            put(x - 1, 23, ton(LAITON, 0.92)); put(x, 23, ton(LAITON, 0.75)); put(x + 1, 23, ton(LAITON, 0.42))
            put(x, 22, ton(LAITON, 0.62)); put(x + 1, 22, ton(LAITON, 0.35))
            for k, y in enumerate((21, 20, 19)):
                put(x, y, ton(CIRE, 0.95 - 0.06 * k)); put(x + 1, y, ton(CIRE, 0.62 - 0.05 * k))
            put(x, 18, ton(FEU, 0.98)); put(x, 17, ton(FEU, 0.75))
            put(x + 2, 21, ton(MATIERES[nom][0], 0.62))     # l'ombre de la chandelle sur la hotte
    elif nom == 'briques':
        for y, t in ((20, 0.90), (21, 0.68), (22, 0.52), (23, 0.40)):   # un pot de terre : son bord, son flanc
            for x in range(3, 9):
                put(x, y, ton(BUCHE, t - 0.18 * (x - 3) / 5 + (0.06 if y == 20 and x == 3 else 0)))
        for x in range(4, 8):
            put(x, 20, ton(BUCHE, 0.28))                      # la terre, dans le pot
        VERT = rampe([(28, 64, 40), (60, 116, 60), (110, 170, 90), (176, 214, 140)], 80)
        for (cx, cy, r) in ((5.5, 17.5, 2.6), (4, 16, 1.6), (7.2, 16.2, 1.7)):   # le feuillage, en touffes rondes
            for y in range(13, 21):
                for x in range(1, 11):
                    d = ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (r * r)
                    if d <= 1:
                        put(x, y, ton(VERT, 0.85 - 0.45 * d - 0.15 * ((x - cx) + (y - cy)) / r + 0.06 * bruit(x, y, 44)))
        for x, y, c in ((5, 14, (238, 128, 160)), (6, 14, (250, 170, 196)), (8, 15, (248, 206, 96)), (3, 15, (250, 236, 150)), (6, 16, (232, 110, 150))):
            put(x, y, c)
    else:
        for y in range(14, 22):                               # une pendule : son cadran cerclé d'or, ses aiguilles
            for x in range(12, 20):
                d = (x - 15.5) ** 2 + (y - 17.5) ** 2
                if d <= 7.8:
                    if d <= 3.2:
                        put(x, y, ton(CIRE, 1.0 - 0.06 * d - 0.08 * (x > 15)))
                    else:
                        put(x, y, ton(LAITON, 0.95 - 0.30 * (x - 12) / 7 - 0.10 * (y - 14) / 7))
        for x in range(11, 21):
            put(x, 22, ton(LAITON, 0.98 - 0.25 * (x - 11) / 9))   # le dessus du socle
            put(x, 23, ton(LAITON, 0.52 - 0.18 * (x - 11) / 9))
        put(15, 17, (46, 34, 24)); put(15, 16, (46, 34, 24)); put(16, 17, (60, 44, 30))
        put(14, 16, ton(CIRE, 1.0))
    return contour(im, OUT)


def feu(k):
    """Le feu, image k : des flammes qui dansent au-dessus des bûches (le cœur blanc-jaune, les bords rouges, le
    haut qui s'efface), des braises qui rougeoient dessous."""
    im = Image.new('RGBA', (FEU_L, FEU_H), (0, 0, 0, 0))
    px = im.load()
    for x in range(FEU_L):
        h = 5 + 4 * max(0, math.sin((x + 1) * 0.55 + k * 1.7)) + 2 * math.sin(x * 1.3 + k * 2.3)
        h *= 1 - ((x - 6.5) / 7.5) ** 2 * 0.7
        centre = 1 - abs(x - 6.5) / 7.5
        for j in range(int(h)):
            y = FEU_H - 3 - j
            if y < 0:
                break
            f = j / max(1, h)
            t = 0.98 - 0.70 * f - 0.18 * (1 - centre) + 0.05 * bruit(x, y + k * 7, 35)
            a = 255 if f < 0.7 else int(255 * (1 - (f - 0.7) / 0.3 * 0.55))
            px[x, y] = ton(FEU, t) + (a,)
    for x in range(1, FEU_L - 1):                             # les braises
        px[x, FEU_H - 2] = ton(BRAISE, 0.55 + 0.35 * bruit(x, k, 36)) + (255,)
        px[x, FEU_H - 1] = ton(BRAISE, 0.25 + 0.20 * bruit(x, k + 9, 37)) + (255,)
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
