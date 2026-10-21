# La planche de la poule de la ferme (assets/poule.png), dessinée ici en entier :
#   0..7     ses huit poses de profil droit (idle, picore0, picore1, marche0, marche1, gratte,
#            couvee, ailes : l'ordre de js/carte/ferme/config.js BETES.poule), aux proportions
#            de sa vue de face (poule_profil : le corps de 8 × 7 px aux coins arrondis, la tête
#            de 4 × 5, la crête, le bec, le barbillon, la queue dressée, les pattes)
#   8        pas      de profil, entre deux pas : debout, le corps levé d'un pixel (la marche de
#                     profil passe par marche0, pas, marche1, pas)
#   9..12    bas_0..3 de face (elle vient vers nous) : quatre temps de marche, une patte levée,
#                     puis l'autre, le corps qui monte entre deux
#   13..16   haut_0..3 de dos (elle s'en va) : de même
# Mêmes couleurs que le dessin d'origine, contour sombre ajouté à la fin. Elle marche ainsi
# dans toutes les directions (js/carte/ferme/chantier.js stepBeasts, js/ambient-life.js).
#
#   python3 scripts/carte/betes.py            écrit la planche
#   python3 scripts/carte/betes.py --apercu   écrit aussi apercu_betes.png (agrandi)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu  # noqa: E402

# Les couleurs de chaque bête (celles de ses dessins d'origine).
COULEURS = {
    'poule': {'K': (59, 27, 43), 'b': (230, 226, 214), 'o': (195, 190, 183), 'g': (166, 148, 129), 'r': (184, 67, 74),
              'R': (110, 26, 34), 'j': (224, 162, 58), 'p': (208, 130, 58), 'a': (152, 160, 172)},
}
TAILLE = {'poule': (16, 16)}


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


# La poule de profil, aux proportions de celle de face et de dos (le corps de 8 × 7 px aux
# coins arrondis, la tête de 4 × 5, la crête de 2, les pattes de 2 rangées et leurs doigts) :
# ses huit poses, dans l'ordre de la planche d'origine (js/carte/ferme/config.js, BETES.poule).
def poule_profil(pose):
    t = Toile(16, 16)
    tete = {'idle': (9, 3), 'picore0': (10, 7), 'picore1': (10, 10), 'couvee': (9, 5), 'ailes': (9, 3)}.get(pose, (9, 3))
    assise = pose == 'couvee'
    by = 2 if assise else 0                                      # assise : le corps plus bas
    # les pattes (pas assise) : ( x de la patte, doigts : x0, x1, rangée du pied )
    if not assise:
        pattes = {'marche0': ((5, 4, 5, 15), (9, 9, 10, 15)), 'marche1': ((7, 6, 8, 15), (8, 8, 9, 14)),
                  'gratte': ((8, 8, 9, 15), (5, 3, 4, 14))}.get(pose, ((6, 6, 7, 15), (8, 8, 9, 15)))
        for x, a, b, py in pattes:
            t.rect(x, 14, x, py - 1, 'p') if py > 14 else None
            t.rect(a, py, b, py, 'p')
    # la queue, dressée vers l'arrière (plus haut quand elle picore : elle bascule)
    qy = -2 if pose.startswith('picore') else 0
    t.rect(2, 5 + qy + by, 3, 8 + by, 'g'); t.rect(4, 6 + qy + by, 4, 8 + by, 'g'); t.put(3, 5 + qy + by, 'o')
    t.ovale(3, 7 + by, 11 if not assise else 12, 13 + by, 'b', 2)        # le corps
    t.rect(5, 12 + by, 10, 13 + by, 'o')
    if pose == 'ailes':                                          # les ailes levées, déployées
        t.ovale(3, 3, 7, 8, 'b', 1); t.rect(4, 7, 7, 8, 'o'); t.put(3, 3, 'o')
    else:
        t.rect(5, 9 + by, 8, 10 + by, 'o'); t.rect(6, 11 + by, 8, 11 + by, 'g')   # l'aile, repliée
    hx, hy = tete
    hy += by if assise else 0
    t.ovale(hx, hy, hx + 3, hy + 4, 'b', 1)                      # la tête
    t.rect(hx + 1, hy - 1, hx + 2, hy, 'r')                      # la crête
    t.put(hx + 2, hy + 1, 'K')                                   # l'œil
    t.put(hx + 4, hy + 2, 'j')                                   # le bec
    t.rect(hx + 3, hy + 3, hx + 3, hy + 4, 'R')                  # le barbillon
    t.contour()
    return t


POSES_POULE = ['idle', 'picore0', 'picore1', 'marche0', 'marche1', 'gratte', 'couvee', 'ailes']


DESSINS = {'poule': poule}


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
    cases = [poule_profil(p).image(COULEURS[nom]) for p in POSES_POULE]
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
