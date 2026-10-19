# Les meubles et les enseignes des commerces de la ville (docs/plan-ville.md, étape 4), un fichier
# assets/meuble_<nom>.png chacun, dans le style des meubles de la maison (scripts/batiments/
# meubles.py : vue de dessus à 45°, le dessus raccourci et la face avant, lumière en haut à
# gauche, contour sombre) ; posés dans les lieux bâtis en blocs (js/carte/ville/lieux.js) :
#   - partout : comptoir (le comptoir et sa caisse enregistreuse) ;
#   - la boulangerie : four_boulanger (le four à soles d'acier), petrin, vitrine_pain (la
#     vitrine des viennoiseries), etagere_pain (les baguettes et les miches) ;
#   - la pizzeria : four_pizza (le four à bois en coupole de briques, une pizza dans la gueule) ;
#   - le fast-food : friteuse, grill (la plaque et ses steaks) ;
#   - la poissonnerie : etal_poisson (les poissons sur la glace), bac_homards ;
#   - le magasin d'informatique : presentoir (les ordinateurs portables), etagere_info (les
#     cartons), bureau_ordi (le bureau et son écran).
# Les enseignes des façades (assets/enseigne_<lieu>.png) : le panneau des enseignes de la ville
# (scripts/ville/equipements.py enseigne).
#
#   python3 scripts/ville/commerces.py            écrit les images
#   python3 scripts/ville/commerces.py --apercu   écrit aussi apercu_commerces.png (agrandi)
import os
import sys

from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'batiments'))
sys.path.insert(0, ICI)
from meubles import C, box, canvas, doors, outline, painter, rect  # noqa: E402
from equipements import enseigne  # noqa: E402

ASSETS = os.path.join(ICI, '..', '..', 'assets')
ROOT = os.path.join(ICI, '..', '..')

# des tons en plus : la pâte et la croûte du pain, l'acier, la glace, les poissons, le carton
C.update({
    'P0': (150, 88, 36), 'P1': (196, 132, 60), 'P2': (232, 178, 96), 'P3': (248, 220, 150),
    'a0': (96, 104, 112), 'a1': (148, 156, 164), 'a2': (192, 198, 204), 'a3': (226, 230, 234),
    'g4': (214, 236, 244), 'n0': (60, 80, 96), 'n1': (110, 140, 160), 'n2': (170, 196, 210),
    'k0': (150, 112, 70), 'k1': (192, 150, 98), 'k2': (220, 184, 130),
    'x0': (20, 24, 30), 'x1': (40, 70, 110), 'x2': (80, 140, 200),
    'h0': (120, 20, 20), 'h1': (190, 50, 40), 'y0': (200, 150, 30), 'y1': (240, 200, 80),
})


def comptoir():
    """Le comptoir (3 cases) : le plateau de bois, la face avant à panneaux, la caisse
    enregistreuse à droite."""
    W, H = 48, 30
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 6, W, 9, 13, 'w4', 'w2', edge='w3')
    rect(put, 0, 6, W - 1, 6, 'c2')
    doors(put, 0, 15, W, 12, n=3)
    rect(put, 0, 27, W - 1, 29, 'w0')
    # la caisse : le socle, l'écran incliné, les touches
    box(put, 32, 3, 12, 5, 4, 'i2', 'i1')
    rect(put, 34, 0, 41, 3, 'x1'); rect(put, 35, 1, 40, 2, 'x2')
    for x in (33, 36, 39):
        put(x, 5, 'a3')
    # un panier de monnaie, un carnet
    rect(put, 6, 8, 11, 11, 'o1'); rect(put, 7, 9, 10, 10, 'o2')
    rect(put, 16, 8, 22, 12, 'c2'); rect(put, 16, 12, 22, 12, 'c1')
    outline(im)
    return im


def four_boulanger():
    """Le four de boulanger (2 × 2) : un four à soles d'acier, trois portes vitrées
    rougeoyantes, la hotte au-dessus."""
    W, H = 32, 44
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 2, 0, 28, 4, 4, 'a2', 'a1')              # la hotte
    rect(put, 12, 0, 19, 0, 'a3')
    box(put, 0, 8, W, 6, 28, 'a3', 'a1', edge='a2')    # le corps
    rect(put, 0, 14, 2, 41, 'a2')
    for k, y in enumerate((16, 24, 32)):              # les soles : portes vitrées, poignées
        rect(put, 4, y, 27, y + 5, 'a0')
        rect(put, 5, y + 1, 26, y + 4, 'f1')
        rect(put, 6, y + 2, 25, y + 3, 'f2' if k != 1 else 'f3')
        for x in range(8, 24, 5):
            rect(put, x, y + 2, x + 2, y + 3, 'P1')   # les pains qui cuisent
        rect(put, 4, y - 1, 27, y - 1, 'a3')
    rect(put, 1, 42, 30, 43, 'i1')
    outline(im)
    return im


def petrin():
    """Le pétrin (1 case) : la cuve d'acier vue de dessus, la pâte, le bras, le pied."""
    W, H = 16, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 6, 0, 13, 3, 'a1'); rect(put, 11, 3, 13, 12, 'a1')     # la tête et le bras
    for y in range(8, 18):
        for x in range(0, 16):
            d = ((x - 7.5) / 7.5) ** 2 + ((y - 12.5) / 4.6) ** 2
            if d <= 1:
                put(x, y, 'a2' if d > 0.6 else ('P3' if y < 13 else 'P2'))
    rect(put, 1, 18, 14, 22, 'a1'); rect(put, 1, 18, 3, 22, 'a2')
    rect(put, 5, 23, 10, 27, 'i1'); rect(put, 3, 28, 12, 29, 'i0')
    outline(im)
    return im


def vitrine_pain():
    """La vitrine (2 cases) : le dessus de verre, les viennoiseries et les tartes dessous, le
    socle de bois."""
    W, H = 32, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 11, 0, 'g4', 'g4', edge='n2')
    for i, (x, y) in enumerate(((3, 5), (10, 4), (17, 6), (24, 5))):
        rect(put, x, y, x + 4, y + 2, 'P2' if i % 2 else 'P1')       # croissants, chaussons
        rect(put, x + 1, y, x + 3, y, 'P3')
    rect(put, 2, 13, W - 3, 18, 'n2')                 # la face vitrée
    for x in range(4, W - 4, 7):
        rect(put, x, 14, x + 4, 16, 'h1' if x % 2 else 'P1')        # tartes aux fraises, flans
        rect(put, x, 14, x + 4, 14, 'P3')
    rect(put, 0, 19, W - 1, 25, 'w2'); rect(put, 0, 19, W - 1, 19, 'w3')
    rect(put, 0, 26, W - 1, 27, 'w0')
    outline(im)
    return im


def etagere_pain():
    """L'étagère à pains (2 cases, contre le mur) : trois rayons, les baguettes debout, les
    miches."""
    W, H = 32, 40
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 37, 'w1')
    rect(put, 2, 2, W - 3, 35, 'w0')
    for y in (12, 24, 35):
        rect(put, 1, y, W - 2, y + 1, 'w3')
    for x in range(4, 28, 4):                         # les baguettes, en haut
        rect(put, x, 3, x + 1, 11, 'P1'); put(x, 3, 'P2'); put(x + 1, 5, 'P3')
    for x in range(3, 28, 7):                         # les miches
        for y in range(16, 24):
            for xx in range(x, x + 6):
                if ((xx - x - 2.5) / 3) ** 2 + ((y - 20) / 3.6) ** 2 <= 1:
                    put(xx, y, 'P2' if y < 19 else 'P1')
        put(x + 2, 18, 'P3')
    for x in range(3, 28, 5):                         # les pains de mie
        rect(put, x, 29, x + 3, 34, 'P1'); rect(put, x, 29, x + 3, 29, 'P3')
    rect(put, 0, 38, W - 1, 39, 'w0')
    outline(im)
    return im


def four_pizza():
    """Le four à pizza (2 × 2) : la coupole de briques, la gueule et son feu de bois, une pizza
    sur la sole, la cheminée."""
    W, H = 32, 42
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 20, 0, 24, 10, 'i1'); rect(put, 20, 0, 21, 10, 'i2')
    for y in range(6, 34):
        for x in range(1, 31):
            dx = (x + 0.5 - 15.5) / 14.5
            top = 22 - 15 * max(0.0, 1 - dx * dx) ** 0.5
            if y + 0.5 < top:
                continue
            row = (y - 6) // 3
            joint = (y - 6) % 3 == 0 or (x + (2 if row % 2 else 0)) % 5 == 0
            k = 'R0' if joint else ('R2' if x < 10 else 'R1')
            put(x, y, k)
    for y in range(18, 31):                           # la gueule
        for x in range(8, 24):
            dx = (x + 0.5 - 15.5) / 7.5
            if y + 0.5 >= 24 - 6 * max(0.0, 1 - dx * dx) ** 0.5:
                put(x, y, 'f0')
    for x in range(10, 16):                           # le feu au fond, à gauche
        put(x, 21 + abs(x - 12), 'f3' if x % 2 else 'f2')
    for y in range(25, 30):                           # la pizza sur la sole
        for x in range(13, 23):
            d = ((x - 17.5) / 5) ** 2 + ((y - 27.5) / 2.2) ** 2
            if d <= 1:
                put(x, y, 'P2' if d > 0.6 else 'h1')
    put(16, 27, 'c2'); put(19, 28, 'c2'); put(17, 28, 'g1')
    rect(put, 0, 34, W - 1, 39, 'p2'); rect(put, 0, 34, W - 1, 34, 'p3')     # le socle de pierre
    rect(put, 0, 40, W - 1, 41, 'p0')
    outline(im)
    return im


def friteuse():
    """La friteuse (1 case) : la cuve d'huile dorée vue de dessus, deux paniers, la face
    d'acier et ses boutons."""
    W, H = 16, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 3, 0, 5, 6, 'i1'); rect(put, 10, 0, 12, 6, 'i1')       # les manches
    box(put, 0, 6, W, 9, 13, 'a3', 'a1', edge='a2')
    rect(put, 2, 8, 13, 13, 'y0'); rect(put, 2, 8, 13, 8, 'y1')       # l'huile
    rect(put, 3, 9, 6, 12, 'a2'); rect(put, 9, 9, 12, 12, 'a2')       # les paniers
    rect(put, 4, 10, 5, 11, 'J2'); rect(put, 10, 10, 11, 11, 'J2')    # des frites
    for x in (3, 7, 11):
        put(x, 18, 'h1')
    rect(put, 0, 28, W - 1, 29, 'i0')
    outline(im)
    return im


def grill():
    """Le grill (2 cases) : la plaque sombre et ses steaks, les pains ouverts sur le côté, la
    face d'acier."""
    W, H = 32, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 11, 13, 'a2', 'a1', edge='a2')
    rect(put, 2, 3, 21, 11, 'i0')                     # la plaque
    for x, y in ((4, 4), (11, 5), (16, 8), (6, 8)):
        rect(put, x, y, x + 3, y + 2, 'w0'); put(x + 1, y, 'w1')     # les steaks
    for x in (24, 28):                                # les pains à burger
        rect(put, x - 1, 4, x + 1, 6, 'P2'); rect(put, x - 1, 8, x + 1, 10, 'P1')
    for x in (4, 12, 20, 27):
        put(x, 18, 'i0'); put(x, 19, 'a3')            # les boutons
    rect(put, 0, 26, W - 1, 27, 'i0')
    outline(im)
    return im


def etal_poisson():
    """L'étal de la poissonnerie (3 cases) : la glace pilée en pente, les poissons couchés, les
    citrons, le bord de l'étal en carrelage blanc et bleu."""
    W, H = 48, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 13, 0, 'g4', 'g4')
    for y in range(2, 15):                            # la glace : des grains clairs
        for x in range(0, W, 3):
            if (x * 7 + y * 3) % 5 == 0:
                put(x, y, 'a3')
    poissons = [(3, 4, 'n1'), (16, 3, 'a1'), (29, 5, 'n1'), (8, 9, 'R2'), (22, 10, 'a1'), (35, 9, 'n0')]
    for x, y, k in poissons:
        rect(put, x, y, x + 8, y + 2, k)
        rect(put, x, y, x + 8, y, 'a3')               # le ventre argenté au soleil
        put(x + 9, y, k); put(x + 9, y + 2, k)        # la queue
        put(x + 1, y + 1, 'x0')                       # l'œil
    for x in (41, 44):
        rect(put, x, 4, x + 1, 5, 'J1')               # des citrons
    for x in range(0, W, 4):                          # le carrelage de la face
        rect(put, x, 15, x + 3, 25, 'b3' if (x // 4) % 2 else 'B2')
    rect(put, 0, 15, W - 1, 15, 'a2')
    rect(put, 0, 26, W - 1, 27, 'i1')
    outline(im)
    return im


def bac_homards():
    """Le bac à homards (1 case) : l'eau bleue vue de dessus, deux homards, le meuble."""
    W, H = 16, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 11, 0, 'e1', 'e1')
    rect(put, 0, 2, W - 1, 3, 'e2')
    for x, y in ((2, 5), (8, 8)):
        rect(put, x, y, x + 4, y + 1, 'h1'); put(x + 5, y - 1, 'h0'); put(x + 5, y + 2, 'h0')
    rect(put, 0, 13, W - 1, 24, 'n0'); rect(put, 1, 14, W - 2, 23, 'n1')
    rect(put, 0, 25, W - 1, 27, 'i0')
    outline(im)
    return im


def presentoir():
    """Le présentoir (2 cases) : une table claire, deux ordinateurs portables ouverts (l'écran
    bleu), une souris."""
    W, H = 32, 26
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 6, W, 10, 3, 'b3', 'b1', edge='b2')
    for x in (3, 18):
        rect(put, x, 0, x + 10, 6, 'i1'); rect(put, x + 1, 1, x + 9, 5, 'x2')   # l'écran
        rect(put, x + 2, 2, x + 4, 2, 'e2')
        rect(put, x, 7, x + 10, 11, 'i2'); rect(put, x + 1, 8, x + 9, 10, 'i1')  # le clavier
    rect(put, 2, 19, 3, 25, 'i1'); rect(put, W - 4, 19, W - 3, 25, 'i1')
    outline(im)
    return im


def etagere_info():
    """L'étagère du magasin (2 cases, contre le mur) : des cartons d'ordinateurs et d'écrans,
    des boîtes de câbles."""
    W, H = 32, 40
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 37, 'i1')
    rect(put, 2, 2, W - 3, 35, 'i0')
    for y in (12, 24, 35):
        rect(put, 1, y, W - 2, y + 1, 'a2')
    for x, y, w, h in ((3, 4, 9, 8), (14, 6, 7, 6), (23, 3, 6, 9), (3, 16, 12, 8), (17, 18, 11, 6), (3, 28, 6, 7), (11, 29, 8, 6), (21, 27, 8, 8)):
        rect(put, x, y, x + w - 1, y + h - 1, 'k1')
        rect(put, x, y, x + w - 1, y, 'k2'); rect(put, x + w - 1, y, x + w - 1, y + h - 1, 'k0')
        rect(put, x + 1, y + 2, x + 3, y + 3, 'x1')   # l'étiquette
    rect(put, 0, 38, W - 1, 39, 'i0')
    outline(im)
    return im


def bureau_ordi():
    """Le bureau (2 cases) : le plateau, l'écran, le clavier, l'unité centrale au pied."""
    W, H = 32, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 10, 0, 23, 9, 'i0'); rect(put, 11, 1, 22, 8, 'x1'); rect(put, 12, 2, 16, 3, 'x2')
    rect(put, 15, 10, 18, 11, 'i1')
    box(put, 0, 10, W, 9, 3, 'w3', 'w1', edge='w2')
    rect(put, 9, 13, 22, 15, 'i2'); rect(put, 10, 14, 21, 14, 'a2')   # le clavier
    rect(put, 25, 14, 27, 16, 'i2')                   # la souris
    rect(put, 1, 22, 2, 29, 'w1')
    rect(put, 22, 20, 29, 29, 'i1'); rect(put, 23, 21, 24, 28, 'i2'); put(27, 23, 'V2')
    outline(im)
    return im


MEUBLES = {
    'comptoir': comptoir, 'four_boulanger': four_boulanger, 'petrin': petrin, 'vitrine_pain': vitrine_pain,
    'etagere_pain': etagere_pain, 'four_pizza': four_pizza, 'friteuse': friteuse, 'grill': grill,
    'etal_poisson': etal_poisson, 'bac_homards': bac_homards, 'presentoir': presentoir, 'etagere_info': etagere_info,
    'bureau_ordi': bureau_ordi,
}
# les enseignes : le mot, le fond, l'encre
ENSEIGNES = {
    'boulangerie': ('BOULANGERIE', (246, 232, 196), (120, 70, 30)),
    'pizzeria': ('PIZZERIA', (36, 110, 60), (246, 240, 226)),
    'burger': ('BURGERS', (200, 50, 40), (250, 220, 90)),
    'poissonnerie': ('POISSONNERIE', (40, 90, 150), (240, 244, 250)),
    'informatique': ('INFORMATIQUE', (30, 34, 44), (120, 200, 250)),
}


def main():
    out = {f'meuble_{k}.png': f() for k, f in MEUBLES.items()}
    for k, (mot, fond, encre) in ENSEIGNES.items():
        out[f'enseigne_{k}.png'] = enseigne(mot, fond=fond, encre=encre)
    for name, im in out.items():
        im.save(os.path.join(ASSETS, name), optimize=True)
    if '--apercu' in sys.argv:
        k, per = 4, 5
        ims = list(out.values())
        rows = [ims[i:i + per] for i in range(0, len(ims), per)]
        W = max(sum(im.width * k + 16 for im in r) for r in rows)
        RH = max(im.height for im in ims) * k + 16
        ap = Image.new('RGBA', (W, RH * len(rows)), (152, 124, 88, 255))
        for j, r in enumerate(rows):
            x = 0
            for im in r:
                big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                ap.alpha_composite(big, (x, (j + 1) * RH - 8 - big.height))
                x += big.width + 16
        ap.save(os.path.join(ROOT, 'apercu_commerces.png'))
    print(f'commerces : {len(out)} images')


if __name__ == '__main__':
    main()
