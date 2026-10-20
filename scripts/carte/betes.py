# Les planches des bêtes de la ferme (assets/vache.png, mouton.png, poule.png) : leurs huit
# premières cases (profil droit) sont les dessins d'origine, repris tels quels
# (scripts/carte/originaux/<bête>.png) ; à leur suite, pour qu'elles marchent dans toutes les
# directions et plus souplement (js/carte/ferme/config.js BETES, chantier.js stepBeasts) :
#   8        pas      de profil, entre deux pas : debout, le corps levé d'un pixel (la marche de
#                     profil passe par marche0, pas, marche1, pas)
#   9..12    bas_0..3 de face (elle vient vers nous) : quatre temps de marche, une patte avant
#                     levée, puis l'autre, le corps qui monte entre deux
#   13..16   haut_0..3 de dos (elle s'en va) : de même
# Mêmes couleurs que les dessins d'origine, contour sombre ajouté à la fin.
#
#   python3 scripts/carte/betes.py            écrit les trois planches
#   python3 scripts/carte/betes.py --apercu   écrit aussi apercu_betes.png (agrandi)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, apercu  # noqa: E402

ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')

# Les couleurs de chaque bête (celles de ses dessins d'origine).
COULEURS = {
    'vache': {'K': (45, 11, 11), 'b': (233, 225, 212), 'o': (210, 202, 191), 'g': (166, 143, 126), 'n': (51, 46, 41),
              'r': (178, 81, 98), 'd': (74, 36, 51), 'c': (103, 73, 63), 'x': (31, 41, 41)},
    'mouton': {'K': (43, 42, 46), 'b': (229, 225, 216), 'o': (202, 194, 185), 'g': (151, 143, 136), 'f': (112, 116, 122),
               'p': (95, 91, 89), 's': (103, 82, 61)},
    'poule': {'K': (59, 27, 43), 'b': (230, 226, 214), 'o': (195, 190, 183), 'g': (166, 148, 129), 'r': (184, 67, 74),
              'R': (110, 26, 34), 'j': (224, 162, 58), 'p': (208, 130, 58), 'a': (152, 160, 172)},
}
TAILLE = {'vache': (32, 24), 'mouton': (32, 24), 'poule': (16, 16)}


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def ovale(self, x0, y0, x1, y1, c, coins=1):
        """Un rectangle aux coins rognés de `coins` pixels (en escalier)."""
        for y in range(y0, y1 + 1):
            k = max(0, coins - min(y - y0, y1 - y))
            self.rect(x0 + k, y, x1 - k, y, c)

    def contour(self, c='K'):
        plein = set(self.px)
        for (x, y) in list(plein):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in plein and 0 <= q[0] < self.w and 0 <= q[1] < self.h:
                    self.px[q] = c

    def image(self, couleurs):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), couleurs[c] + (255,))
        return im


# Les quatre temps de la marche de face ou de dos : (patte avant gauche levée, avant droite
# levée, le corps levé) ; les pattes arrière font l'inverse des avant.
TEMPS = [(1, 0, 0), (0, 0, 1), (0, 1, 0), (0, 0, 1)]


def vache(vue, k):
    t = Toile(32, 24)
    g, d, haut = TEMPS[k]
    dy = -haut
    if vue == 'bas':
        # pattes arrière (derrière, plus courtes), puis le corps, les pattes avant, la tête
        for x, leve in ((11, g), (19, d)):
            t.rect(x, 17, x + 1, 21 - leve, 'g')
            t.rect(x, 21 - leve, x + 1, 21 - leve, 'x')
        t.ovale(7, 8 + dy, 24, 17 + dy, 'b', 2)
        t.rect(7, 15 + dy, 24, 17 + dy, 'o')
        t.ovale(7, 10 + dy, 9, 14 + dy, 'n', 1)                  # taches sur les flancs
        t.ovale(21, 9 + dy, 24, 12 + dy, 'n', 1)
        for x, leve in ((9, d), (21, g)):
            t.rect(x, 17, x + 1, 22 - leve, 'o')
            t.put(x + 1, 18, 'g')
            t.rect(x, 23 - leve, x + 1, 23 - leve, 'x')
        # la tête : les oreilles, les cornes, la face blanche tachée, le mufle rose
        t.rect(9, 7 + dy, 11, 8 + dy, 'o'); t.put(10, 8 + dy, 'r')
        t.rect(20, 7 + dy, 22, 8 + dy, 'o'); t.put(21, 8 + dy, 'r')
        t.put(12, 5 + dy, 'o'); t.put(11, 4 + dy, 'b')
        t.put(19, 5 + dy, 'o'); t.put(20, 4 + dy, 'b')
        t.ovale(12, 5 + dy, 19, 16 + dy, 'b', 1)
        t.rect(12, 5 + dy, 14, 9 + dy, 'n')                      # la tache sur l'œil gauche
        t.put(15, 5 + dy, 'n')
        t.put(13, 9 + dy, 'x'); t.put(18, 9 + dy, 'x')           # les yeux
        t.ovale(12, 13 + dy, 19, 16 + dy, 'r', 1)                # le mufle
        t.put(14, 15 + dy, 'd'); t.put(17, 15 + dy, 'd')
        t.rect(13, 12 + dy, 18, 12 + dy, 'o')
    else:
        # de dos : les pattes avant (au loin), le corps, la queue, les pattes arrière
        for x, leve in ((11, g), (19, d)):
            t.rect(x, 17, x + 1, 21 - leve, 'g')
            t.rect(x, 21 - leve, x + 1, 21 - leve, 'x')
        t.rect(9, 7 + dy, 11, 8 + dy, 'o'); t.put(10, 7 + dy, 'r')   # les oreilles, au-dessus du dos
        t.rect(20, 7 + dy, 22, 8 + dy, 'o'); t.put(21, 7 + dy, 'r')
        t.put(12, 6 + dy, 'o'); t.put(19, 6 + dy, 'o')
        t.ovale(12, 6 + dy, 19, 9 + dy, 'b', 1)                  # le haut de la tête, derrière
        t.ovale(7, 8 + dy, 24, 18 + dy, 'b', 3)
        t.rect(8, 16 + dy, 23, 18 + dy, 'o')
        t.ovale(8, 9 + dy, 12, 13 + dy, 'n', 1)                  # taches
        t.ovale(18, 12 + dy, 22, 15 + dy, 'n', 1)
        t.rect(13, 16 + dy, 18, 17 + dy, 'r')                    # le pis, entre les pattes
        t.rect(15, 9 + dy, 16, 9 + dy, 'o')                      # la queue
        t.rect(15, 10 + dy, 15, 16 + dy, 'g')
        t.rect(14, 16 + dy, 16, 18 + dy, 'n')
        for x, leve in ((9, d), (21, g)):
            t.rect(x, 18, x + 1, 22 - leve, 'o')
            t.put(x, 19, 'g')
            t.rect(x, 23 - leve, x + 1, 23 - leve, 'x')
    t.contour()
    return t


def mouton(vue, k):
    t = Toile(32, 24)
    g, d, haut = TEMPS[k]
    dy = -haut
    for x, leve in ((13, g), (18, d)):                           # pattes du fond (fines, comme de profil)
        t.rect(x, 19, x, 22 - leve, 'p')
        t.put(x, 22 - leve, 's')
    t.ovale(8, 11 + dy, 23, 20 + dy, 'b', 3)                     # la laine
    t.rect(9, 18 + dy, 22, 20 + dy, 'o')
    for (x, y) in ((10, 13), (14, 12), (19, 14), (11, 17), (17, 17), (21, 12)):
        t.put(x, y + dy, 'o')
    for x, leve in ((11, d), (20, g)):                           # pattes de devant
        t.rect(x, 20, x, 22 - leve, 'p')
        t.put(x, 23 - leve, 's')
    if vue == 'bas':
        t.rect(10, 13 + dy, 12, 14 + dy, 'f'); t.rect(19, 13 + dy, 21, 14 + dy, 'f')   # les oreilles
        t.ovale(13, 12 + dy, 18, 19 + dy, 'f', 1)               # la tête grise
        t.rect(13, 11 + dy, 18, 12 + dy, 'b')                    # le toupet de laine
        t.put(14, 14 + dy, 'K'); t.put(17, 14 + dy, 'K')         # les yeux
        t.rect(15, 17 + dy, 16, 17 + dy, 'p')                    # le museau
    else:
        t.rect(9, 12 + dy, 11, 13 + dy, 'f'); t.rect(20, 12 + dy, 22, 13 + dy, 'f')    # les oreilles, de dos
        t.rect(15, 12 + dy, 16, 14 + dy, 'o')                    # la petite queue
        t.put(15, 15 + dy, 'g')
    t.contour()
    return t


def poule(vue, k):
    t = Toile(16, 16)
    g, d, haut = TEMPS[k]
    dy = -haut
    for x, leve in ((6, g), (9, d)):                             # les pattes
        t.rect(x, 13, x, 14 - leve, 'p')
        t.rect(x - (1 if x < 8 else 0), 15 - leve, x + (0 if x < 8 else 1), 15 - leve, 'p')
    t.ovale(4, 7 + dy, 11, 13 + dy, 'b', 2)                      # le corps
    t.rect(5, 12 + dy, 10, 13 + dy, 'o')
    if vue == 'bas':
        t.rect(4, 9 + dy, 4, 11 + dy, 'o'); t.rect(11, 9 + dy, 11, 11 + dy, 'o')     # les ailes
        t.ovale(6, 4 + dy, 9, 8 + dy, 'b', 1)                    # la tête
        t.rect(7, 3 + dy, 8, 4 + dy, 'r')                        # la crête
        t.put(6, 5 + dy, 'K'); t.put(9, 5 + dy, 'K')             # les yeux
        t.rect(7, 6 + dy, 8, 6 + dy, 'j')                        # le bec
        t.rect(7, 7 + dy, 8, 7 + dy, 'R')                        # les barbillons
    else:
        t.ovale(6, 5 + dy, 9, 7 + dy, 'b', 1)                    # la tête, derrière
        t.rect(7, 4 + dy, 8, 5 + dy, 'r')                        # la crête
        t.rect(6, 6 + dy, 9, 9 + dy, 'g')                        # la queue, dressée
        t.rect(7, 5 + dy, 8, 6 + dy, 'o')
        t.rect(4, 9 + dy, 4, 11 + dy, 'o'); t.rect(11, 9 + dy, 11, 11 + dy, 'o')
    t.contour()
    return t


DESSINS = {'vache': vache, 'mouton': mouton, 'poule': poule}


def pas_de_profil(idle):
    """Entre deux pas, de profil : debout, le corps levé d'un pixel, les pattes allongées
    d'autant (la rangée des sabots reste en bas)."""
    w, h = idle.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(idle.crop((0, 1, w, h)), (0, 0))
    out.paste(idle.crop((0, h - 1, w, h)), (0, h - 1))
    return out


def planche(nom):
    w, h = TAILLE[nom]
    src = Image.open(os.path.join(ORIG, nom + '.png')).convert('RGBA')
    cases = [src.crop((i * w, 0, i * w + w, h)) for i in range(8)]
    cases.append(pas_de_profil(cases[0]))
    for vue in ('bas', 'haut'):
        for k in range(4):
            cases.append(DESSINS[nom](vue, k).image(COULEURS[nom]))
    out = Image.new('RGBA', (w * len(cases), h), (0, 0, 0, 0))
    for i, c in enumerate(cases):
        out.paste(c, (i * w, 0))
    return out


def main():
    planches = {nom: planche(nom) for nom in DESSINS}
    for nom, im in planches.items():
        im.save(os.path.join(ASSETS, nom + '.png'))
        print(f'assets/{nom}.png : {im.width // TAILLE[nom][0]} cases')
    if '--apercu' in sys.argv:
        W = max(im.width for im in planches.values())
        out = Image.new('RGBA', (W, sum(im.height + 4 for im in planches.values())), (0, 0, 0, 0))
        y = 0
        for im in planches.values():
            out.alpha_composite(im, (0, y))
            y += im.height + 4
        apercu(out, 'apercu_betes.png', 6, (126, 170, 92))


if __name__ == '__main__':
    main()
