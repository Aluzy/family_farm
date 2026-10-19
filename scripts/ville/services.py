# Les meubles et les enseignes des services et des loisirs de la ville (docs/plan-ville.md,
# étape 4, lot 2), un fichier assets/meuble_<nom>.png chacun, dans le style des meubles des
# commerces (scripts/ville/commerces.py) ; posés dans les lieux bâtis en blocs
# (js/carte/ville/lieux.js) :
#   - la mairie : pupitre (le pupitre des discours), drapeau (sur son mât), classeur (l'armoire
#     à dossiers), banc ;
#   - le musée : vitrine_musee (un vase et une couronne sous verre), statue (sur son socle),
#     dinosaure (le squelette), chevalet (un tableau) ;
#   - le cinéma : ecran_cinema (l'écran et ses rideaux), fauteuils (une rangée de trois),
#     popcorn (la machine), projecteur ;
#   - l'école : tableau_noir, pupitre_eleve (le pupitre et sa chaise), etagere_livres, globe ;
#   - le bureau de négoce : tableau_cours (le tableau des cours), coffre (le coffre-fort).
#
#   python3 scripts/ville/services.py            écrit les images
#   python3 scripts/ville/services.py --apercu   écrit aussi apercu_services.png (agrandi)
import os
import sys

from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from commerces import ASSETS, ROOT, C, box, canvas, enseigne, outline, painter, rect  # noqa: E402

# des tons en plus : le tableau noir, la craie, le velours des fauteuils, l'os, le bronze
C.update({
    'T0': (24, 46, 38), 'T1': (40, 70, 56), 'cr': (232, 236, 228),
    'v0': (96, 16, 28), 'v1': (150, 28, 40), 'v2': (196, 56, 64),
    'os': (226, 214, 186), 'os0': (172, 158, 126),
    'z0': (92, 70, 36), 'z1': (146, 110, 52), 'z2': (196, 156, 80),
})


def pupitre():
    """Le pupitre des discours (1 case) : le plan incliné de bois, un micro, le pied."""
    W, H = 16, 30
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 7, 0, 8, 4, 'i1'); put(7, 0, 'i3')                    # le micro
    box(put, 0, 4, W, 6, 0, 'w4', 'w4', edge='w3')
    rect(put, 2, 10, 13, 25, 'w2'); rect(put, 2, 10, 4, 25, 'w3'); rect(put, 11, 10, 13, 25, 'w1')
    rect(put, 6, 14, 9, 17, 'o1')                     # l'écusson doré
    rect(put, 0, 26, W - 1, 29, 'w0')
    outline(im)
    return im


def drapeau():
    """Le drapeau (1 case) : bleu, blanc, rouge, sur son mât et son pied."""
    W, H = 16, 42
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 3, 0, 4, 39, 'o1'); put(3, 0, 'o2'); put(4, 0, 'o2')
    for y in range(2, 16):
        o = 1 if 5 <= y <= 11 else 0                  # le pli
        for x in range(5, 15):
            k = 'B1' if x < 8 else 'c2' if x < 11 else 'R1'
            put(x, y + (o if x > 9 else 0), k)
    rect(put, 1, 39, 6, 41, 'i1')
    outline(im)
    return im


def classeur():
    """L'armoire à dossiers (1 case) : quatre tiroirs gris, leurs poignées, leurs étiquettes."""
    W, H = 16, 36
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 4, 31, 'a2', 'a1', edge='a2')
    for k in range(4):
        y = 6 + 7 * k
        rect(put, 1, y, 14, y, 'a0')
        rect(put, 5, y + 3, 10, y + 3, 'a3')
        rect(put, 6, y + 1, 9, y + 1, 'c2')
    rect(put, 0, 35, W - 1, 35, 'i0')
    outline(im)
    return im


def banc():
    """Le banc (3 cases) : le dossier, l'assise de lattes, les pieds."""
    W, H = 48, 22
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, W - 2, 6, 'w2'); rect(put, 1, 0, W - 2, 0, 'w3'); rect(put, 1, 3, W - 2, 3, 'w1')
    box(put, 0, 8, W, 6, 2, 'w3', 'w1', edge='w2')
    for y in (10, 12):
        rect(put, 0, y, W - 1, y, 'w2')
    for x in (3, W - 5):
        rect(put, x, 16, x + 1, 21, 'i1')
    outline(im)
    return im


def vitrine_musee():
    """La vitrine du musée (2 cases) : un vase et une couronne sous le verre, le socle sombre."""
    W, H = 32, 36
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, W - 2, 19, 'g4')                  # la cloche de verre
    rect(put, 1, 0, W - 2, 0, 'a3'); rect(put, 2, 1, 3, 17, 'a3')
    for y in range(4, 18):                            # le vase
        r = 3 + (2 if 8 <= y <= 13 else 0) - (1 if y < 6 else 0)
        rect(put, 9 - r, y, 9 + r, y, 't1' if y % 4 else 'J1')
    rect(put, 18, 12, 27, 17, 'o1')                   # la couronne
    for x in (18, 21, 24, 27):
        rect(put, x, 9, x, 11, 'o2')
    put(22, 14, 'R1'); put(25, 14, 'B1')
    box(put, 0, 20, W, 4, 10, 'w1', 'w0', edge='w2')
    rect(put, 0, 34, W - 1, 35, 'i0')
    outline(im)
    return im


def statue():
    """La statue (1 case) : un buste de bronze sur un socle de pierre."""
    W, H = 16, 42
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(0, 8):                             # la tête
        for x in range(4, 12):
            if ((x - 7.5) / 3.6) ** 2 + ((y - 4) / 4) ** 2 <= 1:
                put(x, y, 'z2' if x < 7 else 'z1')
    rect(put, 6, 8, 9, 10, 'z1')
    for y in range(10, 18):                           # les épaules
        rect(put, 2, y, 13, y, 'z1'); put(2, y, 'z2'); put(13, y, 'z0')
    box(put, 1, 18, 14, 4, 18, 'p3', 'p2', edge='p2')
    rect(put, 1, 22, 2, 39, 'p3'); rect(put, 13, 22, 14, 39, 'p1')
    rect(put, 4, 28, 11, 30, 'o1')                    # la plaque
    rect(put, 0, 40, W - 1, 41, 'p0')
    outline(im)
    return im


def dinosaure():
    """Le squelette de dinosaure (3 × 2) : le crâne, la colonne et les côtes, la queue, les
    pattes, sur une estrade."""
    W, H = 48, 46
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 32, W, 8, 4, 'p3', 'p1', edge='p2')    # l'estrade
    rect(put, 0, 44, W - 1, 45, 'p0')
    for i, x in enumerate(range(8, 42)):              # la colonne, de la tête à la queue
        y = 10 + abs(x - 22) // 4 + (0 if x < 34 else (x - 34) // 2)
        put(x, y, 'os'); put(x, y + 1, 'os0')
        if 14 <= x <= 30 and x % 2 == 0:              # les côtes
            for k in range(2, 10):
                put(x + (k > 6), y + k, 'os' if k < 8 else 'os0')
    for y in range(4, 12):                            # le crâne, la mâchoire
        for x in range(1, 11):
            if ((x - 5.5) / 5) ** 2 + ((y - 8) / 3.6) ** 2 <= 1:
                put(x, y, 'os')
    put(4, 7, 'x0'); rect(put, 1, 11, 8, 12, 'os0')
    for x0 in (14, 30):                               # les pattes
        rect(put, x0, 20, x0 + 1, 34, 'os'); rect(put, x0 - 2, 34, x0 + 2, 35, 'os0')
    rect(put, 22, 18, 22, 34, 'a1')                   # le support
    outline(im)
    return im


def chevalet():
    """Le chevalet (1 case) : un paysage dans son cadre doré, le pied de bois."""
    W, H = 16, 36
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 7, 0, 8, 35, 'w1'); rect(put, 1, 35, 14, 35, 'w1')
    rect(put, 0, 3, 15, 18, 'o1'); rect(put, 1, 4, 14, 17, 'o0')
    rect(put, 2, 5, 13, 10, 'e2'); rect(put, 2, 11, 13, 16, 'g2'); rect(put, 6, 9, 9, 12, 'g1')
    put(11, 6, 'J1')
    rect(put, 2, 19, 13, 20, 'w2')
    outline(im)
    return im


def ecran_cinema():
    """L'écran de cinéma (6 cases, contre le mur) : la toile blanche et son image, les rideaux
    de velours rouge, la scène."""
    W, H = 96, 44
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 3, 'v0')                   # la tringle, le lambrequin
    rect(put, 10, 4, W - 11, 31, 'c2')                # la toile
    rect(put, 14, 8, W - 15, 27, 'e1')                # l'image : un ciel, des collines, un soleil
    rect(put, 14, 18, W - 15, 27, 'g2')
    for x in range(14, W - 14):
        y = 18 - int(3 * abs(((x - 40) % 30) - 15) / 15)
        rect(put, x, y, x, 18, 'g1')
    rect(put, 60, 10, 64, 14, 'J1')
    for x0, x1 in ((0, 11), (W - 12, W - 1)):         # les rideaux et leurs plis
        for x in range(x0, x1 + 1):
            rect(put, x, 4, x, 35, 'v2' if x % 3 == 0 else 'v1')
    box(put, 0, 36, W, 4, 4, 'w2', 'w0', edge='w3')    # la scène
    outline(im)
    return im


def fauteuils():
    """Une rangée de fauteuils de cinéma (3 cases) : les dossiers de velours rouge, les assises,
    les accoudoirs."""
    W, H = 48, 24
    im = canvas(W, H)
    put, _ = painter(im)
    for k in range(3):
        x = k * 16
        rect(put, x + 2, 0, x + 13, 9, 'v1'); rect(put, x + 2, 0, x + 13, 0, 'v2'); rect(put, x + 3, 1, x + 4, 8, 'v2')
        box(put, x + 2, 10, 12, 5, 4, 'v2', 'v0')
        rect(put, x, 6, x + 1, 19, 'i1'); rect(put, x + 14, 6, x + 15, 19, 'i1')
    rect(put, 0, 20, W - 1, 23, 'i0')
    outline(im)
    return im


def popcorn():
    """La machine à pop-corn (1 case) : la cage vitrée rouge, le pop-corn, le chariot."""
    W, H = 16, 36
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, 14, 3, 'h1'); rect(put, 1, 0, 14, 0, 'R2')
    rect(put, 1, 4, 14, 17, 'g4'); rect(put, 1, 4, 1, 17, 'h1'); rect(put, 14, 4, 14, 17, 'h1')
    for y in range(10, 17):
        for x in range(2, 14):
            put(x, y, 'c2' if (x + y) % 3 else 'J2')
    rect(put, 1, 18, 14, 29, 'h1'); rect(put, 3, 20, 12, 27, 'R2')
    rect(put, 2, 30, 3, 35, 'i1'); rect(put, 12, 30, 13, 35, 'i1')
    outline(im)
    return im


def projecteur():
    """Le projecteur (1 case) : les deux bobines, le corps, l'objectif, le pied."""
    W, H = 16, 30
    im = canvas(W, H)
    put, _ = painter(im)
    for cx, cy in ((4, 4), (11, 4)):
        for y in range(0, 9):
            for x in range(0, 16):
                d = ((x - cx) / 3.6) ** 2 + ((y - cy) / 3.6) ** 2
                if d <= 1:
                    put(x, y, 'i2' if d > 0.4 else 'i0')
    box(put, 2, 9, 12, 3, 7, 'i2', 'i1')
    rect(put, 6, 18, 9, 20, 'a3')                     # l'objectif
    rect(put, 7, 21, 8, 26, 'i1'); rect(put, 3, 27, 12, 29, 'i0')
    outline(im)
    return im


def tableau_noir():
    """Le tableau noir (3 cases, contre le mur) : l'ardoise verte, des lettres à la craie, le
    rebord et ses craies."""
    W, H = 48, 32
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 24, 'w2'); rect(put, 2, 2, W - 3, 22, 'T1'); rect(put, 2, 2, W - 3, 3, 'T0')
    for y, (x0, x1) in ((6, (5, 20)), (10, (5, 28)), (14, (5, 16)), (18, (24, 40))):
        for x in range(x0, x1):
            if (x * 3 + y) % 4:
                put(x, y, 'cr')
    rect(put, 30, 5, 41, 5, 'cr'); rect(put, 30, 5, 30, 12, 'cr')  # un « + »
    rect(put, 0, 25, W - 1, 27, 'w3')
    rect(put, 8, 25, 10, 25, 'cr'); rect(put, 14, 25, 15, 25, 'J2')
    rect(put, 4, 28, 5, 31, 'w1'); rect(put, W - 6, 28, W - 5, 31, 'w1')
    outline(im)
    return im


def pupitre_eleve():
    """Le pupitre d'élève (1 case) : le plateau, un cahier ouvert, la chaise derrière."""
    W, H = 16, 24
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 3, 0, 12, 5, 'w2'); rect(put, 3, 0, 12, 0, 'w3')        # le dossier de la chaise
    box(put, 0, 6, W, 7, 3, 'w4', 'w2', edge='w3')
    rect(put, 3, 7, 7, 11, 'c2'); rect(put, 8, 7, 12, 11, 'b3'); rect(put, 7, 7, 8, 11, 'c0')
    rect(put, 4, 8, 6, 8, 'B1'); rect(put, 9, 9, 11, 9, 'B1')
    rect(put, 1, 16, 2, 23, 'i1'); rect(put, 13, 16, 14, 23, 'i1')
    outline(im)
    return im


def etagere_livres():
    """L'étagère à livres (2 cases, contre le mur) : trois rayons de livres de toutes les
    couleurs."""
    W, H = 32, 40
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 37, 'w1'); rect(put, 2, 2, W - 3, 35, 'w0')
    teintes = ['R1', 'B1', 'V1', 'J1', 'c1', 'R2', 'B2', 'V2', 'o1']
    for r, y in enumerate((3, 15, 27)):
        x = 2
        while x < W - 3:
            w = 2 + (x * 7 + r * 3) % 2
            h = 8 - (x + r) % 3
            rect(put, x, y + 9 - h, x + w - 1, y + 8, teintes[(x + r * 4) % len(teintes)])
            put(x, y + 9 - h, 'cr')
            x += w + (1 if (x + r) % 5 == 0 else 0)
        rect(put, 1, y + 9, W - 2, y + 10, 'w3')
    rect(put, 0, 38, W - 1, 39, 'w0')
    outline(im)
    return im


def globe():
    """Le globe terrestre (1 case) : la sphère bleue et ses continents, l'arceau, le pied."""
    W, H = 16, 28
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(1, 15):
        for x in range(1, 15):
            d = ((x - 7.5) / 6.5) ** 2 + ((y - 8) / 6.5) ** 2
            if d <= 1:
                terre = (x * 5 + y * 3) % 11 < 4
                put(x, y, ('g2' if terre else 'e1') if x < 9 else ('g1' if terre else 'e0'))
    for y in range(0, 17):
        put(14 if 3 < y < 13 else 13, y, 'o1')
    rect(put, 7, 16, 8, 22, 'w1'); rect(put, 3, 23, 12, 25, 'w2'); rect(put, 3, 26, 12, 27, 'w0')
    outline(im)
    return im


def tableau_cours():
    """Le tableau des cours (3 cases, contre le mur) : l'écran sombre, les lignes des produits,
    leurs prix en vert (en hausse) ou en rouge (en baisse), une courbe."""
    W, H = 48, 34
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 25, 'i1'); rect(put, 2, 2, W - 3, 23, 'x0')
    for k, y in enumerate(range(4, 20, 4)):
        rect(put, 4, y, 16, y + 1, 'a2')
        rect(put, 19, y, 24, y + 1, 'V2' if k % 2 == 0 else 'R2')
    for x in range(28, W - 4):                        # la courbe
        y = 18 - ((x * 7) % 9) // 2 - (x - 28) // 3
        put(x, max(4, y), 'J1')
    rect(put, 20, 26, 27, 29, 'i1'); rect(put, 14, 30, 33, 33, 'i0')
    outline(im)
    return im


def coffre():
    """Le coffre-fort (1 case) : la caisse d'acier, la porte, la molette, la poignée."""
    W, H = 16, 26
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 4, 20, 'i2', 'i1', edge='i2')
    rect(put, 2, 6, 13, 21, 'i2'); rect(put, 2, 6, 13, 6, 'i3')
    for y in range(9, 16):
        for x in range(4, 11):
            if ((x - 7) / 3) ** 2 + ((y - 12) / 3) ** 2 <= 1:
                put(x, y, 'o1' if (x + y) % 2 else 'o2')
    rect(put, 11, 11, 12, 13, 'a3')
    rect(put, 1, 24, 14, 25, 'i0')
    outline(im)
    return im


MEUBLES = {
    'pupitre': pupitre, 'drapeau': drapeau, 'classeur': classeur, 'banc': banc,
    'vitrine_musee': vitrine_musee, 'statue': statue, 'dinosaure': dinosaure, 'chevalet': chevalet,
    'ecran_cinema': ecran_cinema, 'fauteuils': fauteuils, 'popcorn': popcorn, 'projecteur': projecteur,
    'tableau_noir': tableau_noir, 'pupitre_eleve': pupitre_eleve, 'etagere_livres': etagere_livres, 'globe': globe,
    'tableau_cours': tableau_cours, 'coffre': coffre,
}
# les enseignes : le mot, le fond, l'encre (celle de l'école : celle de l'école de la carte,
# scripts/ville/carte.py)
ENSEIGNES = {
    'mairie': ('MAIRIE', (36, 58, 120), (246, 240, 226)),
    'musee': ('MUSÉE', (246, 238, 214), (90, 60, 30)),
    'cinema': ('CINÉMA', (120, 20, 34), (250, 220, 90)),
    'ecole': ('ÉCOLE', (246, 238, 214), (150, 52, 40)),
    'negoce': ('NÉGOCE', (30, 70, 56), (240, 236, 220)),
}


def main():
    out = {f'meuble_{k}.png': f() for k, f in MEUBLES.items()}
    for k, (mot, fond, encre) in ENSEIGNES.items():
        out[f'enseigne_{k}.png'] = enseigne(mot, fond=fond, encre=encre)
    for name, im in out.items():
        im.save(os.path.join(ASSETS, name), optimize=True)
    if '--apercu' in sys.argv:
        k, per = 4, 6
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
        ap.save(os.path.join(ROOT, 'apercu_services.png'))
    print(f'services : {len(out)} images')


if __name__ == '__main__':
    main()
