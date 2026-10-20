# Les planches des bêtes de la ferme (assets/vache.png, mouton.png, poule.png) : les huit
# premières cases (profil droit) de la vache et du mouton sont les dessins d'origine, repris
# tels quels (scripts/carte/originaux/<bête>.png) ; celles de la poule sont redessinées aux
# proportions de sa vue de face (poule_profil) ; à leur suite, pour qu'elles marchent dans toutes les
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

    def sur(self, autre):
        """Pose `autre` (déjà contourée) par-dessus : son contour la détache de ce qui est dessous."""
        self.px.update(autre.px)
        return self

    def image(self, couleurs):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), couleurs[c] + (255,))
        return im


# Les quatre temps de la marche de face ou de dos : (patte avant gauche levée, avant droite
# levée, le corps levé) ; les pattes arrière font l'inverse des avant.
TEMPS = [(1, 0, 0), (0, 0, 1), (0, 1, 0), (0, 0, 1)]


# La règle de la vue de dessus à 45° (comme les meubles et le personnage : on voit le dessus
# des choses, raccourci, et leur face avant) appliquée aux bêtes, d'après leur profil
# d'origine (PROFIL, mesuré sur scripts/carte/originaux/<bête>.png, en px de contour à contour) :
#   - de face ou de dos, la longueur du corps devient sa profondeur : on voit le dos, raccourci
#     de DESSUS (un tiers), au-dessus de la face (le poitrail ou la croupe), qui garde la hauteur
#     du corps ; la largeur du corps vaut LARGEUR fois sa hauteur ;
#   - la tête garde sa hauteur ; de face, sa largeur vaut 0,8 fois sa hauteur, posée devant le
#     poitrail ; de dos, on n'en voit que le sommet (le front, les oreilles, les cornes),
#     derrière le dos ;
#   - les pattes gardent celles du profil : un pixel de large, la même longueur, les mêmes
#     couleurs (la proche claire, l'autre dans l'ombre ; la lumière vient d'en haut à gauche) ;
#     les pattes du fond sont cachées par le corps.
DESSUS, LARGEUR = 0.35, 1.6
PROFIL = {
    'vache': {'long': 18, 'haut': 10, 'pattes': 4, 'tete': 9},
    'mouton': {'long': 14, 'haut': 9, 'pattes': 4, 'tete': 8},
}


def gabarit(nom):
    """Les rangées et colonnes de la vue de face ou de dos (pieds sur la dernière rangée)."""
    P = PROFIL[nom]
    w, h = TAILLE[nom]
    bas_corps = h - 1 - P['pattes']                  # la dernière rangée du corps
    face = P['haut']
    dessus = round(P['long'] * DESSUS)
    larg = round(P['haut'] * LARGEUR)
    x0 = (w - larg) // 2
    return {'x0': x0, 'x1': x0 + larg - 1, 'cx': w // 2, 'haut_dos': bas_corps - face - dessus + 1,
            'haut_face': bas_corps - face + 1, 'bas': bas_corps, 'pied': h - 1, 'tete': P['tete']}


def vache(vue, k):
    t = Toile(32, 24)
    g, d, haut = TEMPS[k]
    G = gabarit('vache')
    dy = -haut
    x0, x1, cx = G['x0'], G['x1'], G['cx']
    yd, yf, yb = G['haut_dos'] + dy, G['haut_face'] + dy, G['bas'] + dy
    # les deux pattes de devant (de face) ou de derrière (de dos) : 1 px, la gauche claire
    for x, leve, c in ((x0 + 3, g, 'o'), (x1 - 3, d, 'g')):
        t.rect(x, G['bas'] + 1, x, G['pied'] - 1 - leve, c)
        t.put(x, G['pied'] - leve, 'c')
    if vue == 'bas':
        t.ovale(x0, yd, x1, yb, 'o', 2)                         # le corps : la face (le poitrail)
        t.ovale(x0, yd, x1, yf, 'b', 2)                         # le dos, vu d'en haut, plus clair
        t.rect(x0 + 1, yb, x1 - 1, yb, 'g')                     # le dessous, dans l'ombre
        t.ovale(x0 + 1, yd + 2, x0 + 4, yd + 5, 'n', 1)         # taches
        t.ovale(x1 - 4, yd + 1, x1 - 1, yd + 3, 'n', 1)
        t.ovale(x1 - 3, yf + 2, x1, yf + 5, 'n', 1)
        # la tête, devant le poitrail : 0,8 de sa hauteur en largeur ; son contour à elle
        t.contour()
        corps, t = t, Toile(32, 24)
        th = G['tete']; tw = round(th * 0.8)
        hx0 = cx - tw // 2; hx1 = hx0 + tw - 1; hy0 = yf - 2; hy1 = hy0 + th - 1
        t.rect(hx0 - 2, hy0 + 2, hx0 - 1, hy0 + 3, 'o'); t.put(hx0 - 2, hy0 + 3, 'r')     # oreilles
        t.rect(hx1 + 1, hy0 + 2, hx1 + 2, hy0 + 3, 'o'); t.put(hx1 + 2, hy0 + 3, 'r')
        t.put(hx0, hy0 - 1, 'c'); t.put(hx1, hy0 - 1, 'c')                                # cornes
        t.ovale(hx0, hy0, hx1, hy1, 'b', 1)
        t.rect(hx0, hy0, hx0 + 2, hy0 + 3, 'n')                 # la tache autour d'un œil
        t.put(hx0 + 1, hy0 + 3, 'x'); t.put(hx1 - 1, hy0 + 3, 'x')                        # yeux
        t.ovale(hx0, hy1 - 3, hx1, hy1, 'r', 1)                 # le mufle
        t.put(hx0 + 1, hy1 - 1, 'd'); t.put(hx1 - 1, hy1 - 1, 'd')
        t.contour()
        return corps.sur(t)
    else:
        # de dos : le sommet de la tête au fond, derrière le dos, puis le dos et la croupe
        th = G['tete']; tw = round(th * 0.8)
        hx0 = cx - tw // 2; hx1 = hx0 + tw - 1
        t.rect(hx0 - 2, yd, hx0 - 1, yd + 1, 'o'); t.rect(hx1 + 1, yd, hx1 + 2, yd + 1, 'o')   # oreilles
        t.put(hx0, yd - 2, 'c'); t.put(hx1, yd - 2, 'c')                                      # cornes
        t.ovale(hx0, yd - 1, hx1, yd + 2, 'b', 1)
        t.contour()
        tete, t = t, Toile(32, 24)
        for x, leve, c in ((x0 + 3, g, 'o'), (x1 - 3, d, 'g')):
            t.rect(x, G['bas'] + 1, x, G['pied'] - 1 - leve, c)
            t.put(x, G['pied'] - leve, 'c')
        t.ovale(x0, yd + 1, x1, yb, 'o', 2)                     # la croupe
        t.ovale(x0, yd + 1, x1, yf, 'b', 2)                     # le dos
        t.rect(x0 + 1, yb, x1 - 1, yb, 'g')
        t.ovale(x0 + 1, yd + 3, x0 + 4, yd + 6, 'n', 1)         # taches
        t.ovale(x1 - 4, yf + 1, x1 - 1, yf + 4, 'n', 1)
        t.rect(cx - 2, yb - 1, cx + 1, yb, 'r')                 # le pis, entre les pattes
        t.put(cx, yf - 1, 'g'); t.rect(cx, yf, cx, yb - 2, 'g')  # la queue, de la croupe au jarret
        t.rect(cx - 1, yb - 2, cx + 1, yb - 1, 'n')
        t.contour()
        return tete.sur(t)
    t.contour()
    return t


def mouton(vue, k):
    t = Toile(32, 24)
    g, d, haut = TEMPS[k]
    G = gabarit('mouton')
    dy = -haut
    x0, x1, cx = G['x0'], G['x1'], G['cx']
    yd, yf, yb = G['haut_dos'] + dy, G['haut_face'] + dy, G['bas'] + dy
    for x, leve in ((x0 + 3, g), (x1 - 3, d)):                  # les pattes : 1 px, sombres
        t.rect(x, G['bas'] + 1, x, G['pied'] - 1 - leve, 'p')
        t.put(x, G['pied'] - leve, 's')
    th = G['tete']; tw = round(th * 0.8)
    hx0 = cx - tw // 2; hx1 = hx0 + tw - 1
    if vue == 'bas':
        t.ovale(x0, yd, x1, yb, 'o', 3)                         # la laine : la face
        t.ovale(x0, yd, x1, yf, 'b', 3)                         # le dos, plus clair
        for (x, y) in ((x0 + 2, yd + 2), (cx, yd + 1), (x1 - 3, yd + 3), (x0 + 3, yb - 2), (x1 - 3, yb - 2)):
            t.put(x, y, 'g')                                    # les boucles de la laine
        hy0 = yf - 1; hy1 = hy0 + th - 1
        t.contour()
        corps, t = t, Toile(32, 24)
        t.rect(hx0 - 2, hy0 + 2, hx0 - 1, hy0 + 3, 'f'); t.rect(hx1 + 1, hy0 + 2, hx1 + 2, hy0 + 3, 'f')   # oreilles
        t.ovale(hx0, hy0, hx1, hy1, 'f', 1)                     # la tête grise
        t.rect(hx0, hy0, hx1, hy0 + 1, 'b')                     # le toupet
        t.put(hx0 + 1, hy0 + 3, 'K'); t.put(hx1 - 1, hy0 + 3, 'K')                        # yeux
        t.rect(cx - 1, hy1 - 1, cx, hy1 - 1, 'p')               # le museau
        t.contour()
        return corps.sur(t)
    else:
        t.rect(hx0 - 1, yd, hx0, yd + 1, 'f'); t.rect(hx1, yd, hx1 + 1, yd + 1, 'f')      # oreilles, au fond
        t.ovale(hx0 + 1, yd - 1, hx1 - 1, yd + 1, 'b', 1)       # le toupet, derrière le dos
        t.ovale(x0, yd + 1, x1, yb, 'o', 3)                     # la croupe
        t.ovale(x0, yd + 1, x1, yf, 'b', 3)                     # le dos
        for (x, y) in ((x0 + 2, yd + 3), (cx + 1, yd + 2), (x1 - 3, yd + 4), (x0 + 3, yb - 2), (x1 - 3, yb - 2)):
            t.put(x, y, 'g')
        t.rect(cx - 1, yf - 1, cx, yf + 1, 'b'); t.rect(cx - 1, yf + 2, cx, yf + 2, 'g')   # la petite queue
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
    if nom == 'poule':                                           # redessinée aux nouvelles proportions
        cases = [poule_profil(p).image(COULEURS[nom]) for p in POSES_POULE]
    else:
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
