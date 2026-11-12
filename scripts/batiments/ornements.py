# Les arbres d'ornement de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : un décor de 2 × 2 cases posé
# dehors (data/recipes.json ATELIER.BLOCS ornement_<espèce>, `dessin`), vu de haut à 45° (CLAUDE.md) : le tronc, un
# cylindre éclairé à gauche, évasé au pied ; la couronne, un amas de touffes rondes, chacune un volume (son dessus
# éclairé en haut à gauche, son dessous dans l'ombre froide, un liseré sombre qui la détache de sa voisine), chacune sa
# rampe ; les fleurs (cerisier, magnolia) posées dessus, plus claires vers la lumière ; les rameaux du saule qui
# retombent jusqu'au sol, devant et derrière le tronc. Le jeu n'a plus de saisons (version 1.6) : chaque arbre garde
# toute l'année son plus bel aspect (le cerisier en fleurs, l'érable rouge).
#
# Ce qui tombe est à part (assets/ornements_chute.png : une rangée par espèce, CHUTE_IMAGES images de W × H, posées
# par-dessus l'arbre, au même endroit) : les pétales roses du cerisier, les feuilles rouges de l'érable, les pétales
# blancs du magnolia, les feuilles fines du saule ; la carte les fait défiler (js/carte/ferme/chantier.js).
#
#   python3 scripts/batiments/ornements.py            écrit assets/meuble_ornement_<espèce>.png et ornements_chute.png
#   python3 scripts/batiments/ornements.py --apercu   écrit aussi apercu_ornements.png (agrandi, sur l'herbe)
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 48, 64
OUT = (30, 24, 28)
CHUTE_IMAGES = 8
CX = 23.5
LUM = (-0.55, -0.62, 0.56)                       # la lumière, en haut à gauche, un peu devant
ESPECES = ['cerisier_japon', 'erable_rouge', 'magnolia', 'saule_pleureur']

ECORCES = {
    'cerisier_japon': [(34, 22, 30), (66, 40, 44), (104, 66, 62), (146, 104, 92), (186, 150, 130)],
    'erable_rouge': [(32, 26, 26), (62, 48, 42), (98, 80, 66), (136, 114, 92), (176, 156, 128)],
    'magnolia': [(40, 38, 42), (74, 70, 72), (112, 108, 104), (152, 146, 136), (194, 188, 172)],
    'saule_pleureur': [(36, 30, 24), (66, 56, 40), (100, 88, 62), (138, 124, 88), (178, 166, 122)],
}
# les feuillages : plusieurs rampes proches par espèce (une par touffe), l'ombre froide, la lumière chaude
FEUILLES = {
    'cerisier_japon': [[(74, 26, 70), (140, 50, 108), (200, 90, 146), (234, 140, 180), (250, 190, 212), (255, 228, 232)],
                       [(82, 30, 74), (152, 58, 116), (212, 102, 156), (242, 152, 190), (252, 200, 218), (255, 234, 236)],
                       [(66, 24, 74), (128, 46, 112), (188, 82, 146), (226, 128, 176), (246, 180, 206), (255, 222, 230)],
                       [(90, 34, 70), (164, 66, 114), (222, 114, 158), (248, 164, 194), (255, 208, 222), (255, 238, 238)]],
    'erable_rouge': [[(46, 10, 34), (96, 16, 36), (150, 24, 36), (194, 40, 38), (230, 76, 52), (255, 150, 96)],
                     [(52, 12, 36), (108, 18, 38), (164, 30, 38), (208, 50, 40), (240, 94, 58), (255, 166, 106)],
                     [(42, 8, 36), (88, 14, 40), (138, 22, 42), (182, 34, 44), (220, 64, 56), (250, 136, 96)],
                     [(56, 14, 32), (118, 24, 34), (176, 40, 34), (220, 66, 40), (250, 114, 62), (255, 184, 116)]],
    'magnolia': [[(14, 38, 40), (26, 68, 56), (44, 102, 66), (80, 140, 76), (132, 176, 92), (196, 214, 132)],
                 [(16, 42, 44), (30, 76, 60), (52, 112, 70), (90, 150, 80), (144, 186, 98), (206, 222, 140)],
                 [(12, 34, 40), (24, 62, 54), (40, 94, 64), (72, 130, 72), (122, 166, 88), (186, 206, 126)]],
    'saule_pleureur': [[(26, 50, 34), (48, 88, 44), (82, 128, 54), (128, 168, 70), (182, 204, 104), (226, 232, 160)],
                       [(30, 54, 36), (54, 96, 48), (92, 138, 58), (140, 178, 76), (192, 212, 112), (232, 238, 168)],
                       [(24, 46, 36), (44, 82, 46), (74, 120, 56), (118, 160, 68), (170, 196, 98), (218, 226, 152)]],
}
FLEUR_MAGNOLIA = rampe([(120, 70, 110), (190, 120, 160), (234, 186, 206), (252, 232, 236), (255, 252, 250)], 120)
COEUR_MAGNOLIA = rampe([(110, 40, 90), (170, 70, 130), (214, 120, 170)], 60)

# la forme de chaque couronne : (le milieu x, le milieu y, le rayon x, le rayon y, le nombre de touffes, leur rayon)
COURONNES = {
    'cerisier_japon': (CX, 24, 22, 15, 46, (4.0, 6.4)),
    'erable_rouge': (CX, 23, 19, 18, 42, (4.2, 6.4)),
    'magnolia': (CX, 23, 18, 16, 38, (4.0, 6.2)),
    'saule_pleureur': (CX, 18, 20, 13, 26, (4.0, 6.0)),
}
PIED = {'cerisier_japon': 40, 'erable_rouge': 40, 'magnolia': 39, 'saule_pleureur': 34}   # le haut du tronc visible


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def get(self, x, y):
        return self.px[int(x), int(y)] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)


def tronc(t, esp, rng):
    """Le tronc : un cylindre éclairé à gauche, l'écorce en stries, évasé au pied (les racines) ; une ou deux
    branches maîtresses qui montent dans la couronne."""
    R = rampe(ECORCES[esp], 140)
    haut = PIED[esp] - 8
    for y in range(haut, H - 1):
        f = (y - haut) / (H - 1 - haut)
        demi = 2.2 + (0.6 if esp == 'erable_rouge' else 0) + max(0, f - 0.78) * 14      # évasé au pied
        if esp == 'cerisier_japon':
            cx = CX + 1.2 * math.sin(y * 0.22)                                         # un tronc un peu tors
        else:
            cx = CX
        for x in range(int(cx - demi - 1), int(cx + demi + 2)):
            u = (x + 0.5 - cx) / demi
            if abs(u) > 1:
                continue
            lum = 0.62 - 0.42 * (u + 1) / 2 - 0.10 * (1 - math.sqrt(max(0, 1 - u * u)))
            strie = esp in ('erable_rouge', 'saule_pleureur') and int(x * 1.7 + bruit(x, y // 3, 71) * 2) % 3 == 0
            anneau = esp in ('cerisier_japon', 'magnolia') and (y + int(bruit(x, 0, 72) * 2)) % 6 == 0   # lenticelles
            lum += -0.12 * strie - 0.10 * anneau + 0.04 * bruit(x, y, 73) - 0.10 * (f > 0.9)
            t.put(x, y, ton(R, lum))
    # les branches maîtresses, qui partent vers la couronne
    for sens in (-1, 1):
        x, y = CX, haut + 2
        for i in range(12):
            x += sens * (0.9 if esp != 'saule_pleureur' else 0.6)
            y -= 0.9
            for k in (0, 1):
                t.put(x, y + k, ton(R, 0.42 - 0.2 * (sens > 0) + 0.05 * bruit(i, k, 74)))


def touffes(esp, rng):
    cx, cy, rx, ry, n, (r0, r1) = COURONNES[esp]
    out = []
    for i in range(n * 4):
        if len(out) >= n:
            break
        a, d = rng.random() * 2 * math.pi, math.sqrt(rng.random())
        x, y = cx + math.cos(a) * d * (rx - r0), cy + math.sin(a) * d * (ry - r0 * 0.8)
        out.append((x, y, r0 + rng.random() * (r1 - r0), rng.randrange(len(FEUILLES[esp]))))
    out.sort(key=lambda c: c[1])                          # du fond vers l'avant : celles de devant recouvrent
    return out


def couronne(t, esp, rng):
    """Les touffes, une à une, du fond vers l'avant : chacune une demi-sphère vue de haut à 45° (sa normale donne la
    lumière), le grain des feuilles, un liseré sombre en bas à droite qui la détache de la touffe de derrière."""
    rampes = [rampe(c, 160) for c in FEUILLES[esp]]
    cx0, cy0, rx0, ry0 = COURONNES[esp][:4]
    R0 = rampes[0]
    for y in range(int(cy0 - ry0), int(cy0 + ry0) + 1):   # le cœur de la couronne, dans l'ombre (l'occlusion)
        for x in range(int(cx0 - rx0), int(cx0 + rx0) + 1):
            if ((x + 0.5 - cx0) / (rx0 - 3)) ** 2 + ((y + 0.5 - cy0) / (ry0 - 3)) ** 2 <= 1:
                t.put(x, y, ton(R0, 0.10 + 0.08 * bruit(x, y, 78) - 0.04 * (y - cy0) / ry0))
    if esp in ('cerisier_japon', 'magnolia'):              # les rameaux sombres qu'on voit entre les touffes
        E = rampe(ECORCES[esp], 100)
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * 0.42
            x, y = cx0, cy0 + ry0 * 0.55
            for j in range(int(rx0 * 0.8)):
                x += math.cos(a) * 1.0
                y += math.sin(a) * 0.7
                t.put(x, y, ton(E, 0.25 + 0.1 * (j % 2)))
    for (x0, y0, r, k) in touffes(esp, rng):
        R = rampes[k]
        for y in range(int(y0 - r) - 1, int(y0 + r) + 2):
            for x in range(int(x0 - r) - 1, int(x0 + r) + 2):
                dx, dy = (x + 0.5 - x0) / r, (y + 0.5 - y0) / (r * 0.86)
                d = dx * dx + dy * dy
                g = bruit(x, y, 75 + k)
                if d > 1 - 0.18 * (g > 0.3):              # un bord déchiqueté : les feuilles qui dépassent
                    continue
                nz = math.sqrt(max(0.0, 1 - d))
                lum = 0.5 + 0.5 * (dx * LUM[0] + dy * LUM[1] + nz * LUM[2])
                # l'ombre de la couronne entière : plus sombre en bas et vers l'intérieur (l'occlusion)
                gy, gx = (y + 0.5 - cy0) / ry0, (x + 0.5 - cx0) / rx0
                lum += -0.22 * gy - 0.12 * gx - 0.10 * max(0, gy - 0.4) * 2
                lum += 0.08 * g + (0.06 if (x * 3 + y * 5 + k) % 7 == 0 else 0)           # le grain des feuilles
                if d > 0.72 and (dx + dy) > 0.4:
                    lum -= 0.16                                                         # le liseré d'ombre
                t.put(x, y, ton(R, 0.12 + 0.82 * max(0, min(1, lum))))
        if esp == 'magnolia' and rng.random() < 0.75:      # une fleur en tulipe sur la touffe, tournée vers le ciel
            fleur(t, x0 + rng.uniform(-r / 2, r / 3), y0 - r * 0.45, rng)


def fleur(t, x0, y0, rng):
    for y in range(-3, 2):
        for x in range(-2, 3):
            if (x * x) / 6.5 + ((y + 0.8) ** 2) / 5.5 > 1:
                continue
            lum = 0.92 - 0.14 * (x + 2) / 4 - 0.12 * (y + 3) / 5 + 0.05 * bruit(x0 + x, y0 + y, 76)
            if x == 0 and y < 0:
                lum -= 0.12                                  # le creux entre les pétales
            t.put(x0 + x, y0 + y, ton(FLEUR_MAGNOLIA, lum))
    t.put(x0, y0 - 1, ton(COEUR_MAGNOLIA, 0.6))


def rameaux_saule(t, rng, devant):
    """Les rameaux du saule qui retombent : des fils de feuilles fines, courbés, du bord de la couronne vers le sol ;
    ceux de derrière plus sombres (sous la couronne), ceux de devant éclairés à gauche."""
    rampes = [rampe(c, 160) for c in FEUILLES['saule_pleureur']]
    cx, cy, rx, ry = COURONNES['saule_pleureur'][:4]
    for i in range(22):
        a = (i / 22) * math.pi + (math.pi if not devant else 0)
        x = cx + math.cos(a) * (rx - 1) * (0.55 + 0.45 * rng.random())
        y = cy + math.sin(a) * ry * 0.6
        bas = H - 4 - rng.randrange(8) - (6 if not devant else 0)
        R = rampes[i % 3]
        if devant and abs(x - cx) < 4:
            continue                                     # (on voit le tronc entre les rameaux de devant)
        for yy in range(int(y), bas):
            f = (yy - y) / max(1, bas - y)
            xx = x + (x - cx) * 0.18 * f + math.sin(yy * 0.4 + i) * 0.5
            lum = (0.62 if devant else 0.34) - 0.30 * (xx - cx + rx) / (2 * rx) * (1 if devant else 0.5) - 0.12 * f
            lum += 0.10 * (((yy + i) % 3) == 0) + 0.05 * bruit(xx, yy, 77)
            t.put(xx, yy, ton(R, lum))
            if ((yy + i) % 3) == 0:
                t.put(xx + (1 if (yy // 3) % 2 else -1), yy, ton(R, lum - 0.06))      # une feuille de côté


def arbre(esp):
    rng = random.Random(hash(esp) % 1000 + 7)
    rng = random.Random({'cerisier_japon': 11, 'erable_rouge': 23, 'magnolia': 37, 'saule_pleureur': 41}[esp])
    t = Toile()
    if esp == 'saule_pleureur':
        rameaux_saule(t, random.Random(5), devant=False)
    tronc(t, esp, rng)
    couronne(t, esp, rng)
    if esp == 'saule_pleureur':
        rameaux_saule(t, random.Random(6), devant=True)
    im = contour(t.im, OUT)
    if esp == 'cerisier_japon':                            # quelques pétales déjà tombés, au pied (sans contour)
        px, R = im.load(), rampe(FEUILLES[esp][0], 100)
        for i, (x, y) in enumerate(((15, 62), (18, 63), (30, 62), (33, 63), (12, 63), (36, 62))):
            if not px[x, y][3]:
                px[x, y] = ton(R, 0.78 + 0.04 * i) + (255,)
    return im


CHUTE = {
    'cerisier_japon': (FEUILLES['cerisier_japon'][1], 9, 0.85),
    'erable_rouge': (FEUILLES['erable_rouge'][1], 5, 0.62),
    'magnolia': ([(150, 110, 140), (220, 180, 200), (250, 236, 238), (255, 252, 250)], 4, 0.8),
    'saule_pleureur': (FEUILLES['saule_pleureur'][1], 4, 0.6),
}


def chute(esp, k):
    """Ce qui tombe, image k : des pétales (des feuilles) qui partent du bas de la couronne et descendent en
    tournoyant jusqu'au sol ; chacun son départ, son décalage dans le cycle, son tour."""
    cles, n, clair = CHUTE[esp]
    R = rampe(cles, 100)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    rng = random.Random(len(esp) * 13)
    cx, cy, rx, ry = COURONNES[esp][:4]
    for i in range(n):
        x0 = cx + rng.uniform(-rx * 0.85, rx * 0.85)
        y0 = cy + rng.uniform(0, ry * 0.7)
        ph = (k / CHUTE_IMAGES + i / n) % 1
        y = y0 + ph * (H - 3 - y0)
        x = x0 + 3 * math.sin(ph * 2 * math.pi * 1.5 + i) + ph * 4
        a = int(255 * min(1, (1 - ph) * 4))
        vu = (k + i) % 2
        for (dx, dy, l) in (((0, 0, clair), (1, 0, clair - 0.15)) if vu else ((0, 0, clair - 0.05), (0, 1, clair - 0.22))):
            xx, yy = int(x + dx), int(y + dy)
            if 0 <= xx < W and 0 <= yy < H:
                px[xx, yy] = ton(R, l) + (a,)
    return im


def main():
    for e in ESPECES:
        arbre(e).save(os.path.join(ASSETS, f'meuble_ornement_{e}.png'), optimize=True)
    planche = Image.new('RGBA', (W * CHUTE_IMAGES, H * len(ESPECES)), (0, 0, 0, 0))
    for r, e in enumerate(ESPECES):
        for k in range(CHUTE_IMAGES):
            planche.alpha_composite(chute(e, k), (k * W, r * H))
    planche.save(os.path.join(ASSETS, 'ornements_chute.png'))
    print(f'arbres d\'ornement : {len(ESPECES)} espèces de {W} × {H} ; ce qui tombe : {CHUTE_IMAGES} images par espèce')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', ((W + 6) * len(ESPECES), H + 6), (92, 146, 62, 255))
        for i, e in enumerate(ESPECES):
            f = arbre(e)
            f.alpha_composite(chute(e, 2))
            ap.alpha_composite(f, (i * (W + 6) + 3, 3))
        ap.resize((ap.width * 5, ap.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_ornements.png'))


if __name__ == '__main__':
    main()
