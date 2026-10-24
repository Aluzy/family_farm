# Le distributeur de grain du Poulailler (js/engine/distributeur.js), vu de haut à 45° comme les
# blocs (scripts/carte/blocs.py) : posé à droite de l'entonnoir de la botteleuse, il verse le blé
# dans la mangeoire à grain posée à sa droite. Dessinés comme des meubles (une image chacun, le
# bas de l'image sur le bas de sa case ; js/carte/ferme/chantier.js, syncMeuble) :
#   - assets/meuble_distributeur_<n>.png (16 × 40), n de 0 à 4 : une trémie de planches haute,
#     cerclée de fer, son couvercle en pente ; un hublot montre le grain (vide, puis un quart,
#     la moitié, trois quarts, plein) ; à gauche l'arrivée du tuyau de l'entonnoir, en bas à
#     droite la goulotte vers la mangeoire ;
#   - assets/meuble_mangeoire_grain_<vide|pleine>.png (32 × 24) : une auge basse de planches
#     (demi-hauteur), deux cases de large, trois cloisons ; vide (quelques grains), ou pleine.
#
#   python3 scripts/batiments/distributeur.py            écrit les images
#   python3 scripts/batiments/distributeur.py --apercu   écrit aussi apercu_distributeur.png
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'carte'))  # blocs.py
import blocs as B  # noqa: E402
from blocs import BAS, BOIS, FER, OUT, boite, pieds, planches, trame  # noqa: E402
from pixel import ASSETS, ROOT, contour  # noqa: E402

GRAIN = [(150, 104, 36), (196, 146, 52), (226, 184, 82), (246, 218, 130), (252, 238, 184)]
VITRE = (60, 72, 80)
NIVEAUX = 5                      # images du distributeur : de vide (0) à plein (NIVEAUX - 1)


class Toile:
    """Une image w × h et son pinceau (comme blocs.Toile, d'une autre taille)."""

    def __init__(self, w, h):
        self.W, self.H = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        if 0 <= x < self.W and 0 <= y < self.H and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)

    def fini(self):
        return contour(self.im, OUT)


def distributeur(niveau):
    """La trémie ; `niveau` de 0 (vide) à 1 (pleine) : le grain dans le hublot."""
    t = Toile(16, 40)
    base = 38
    pieds(t, (2, 12), base - 3, base)
    yd, yf = boite(t, 1, 14, base - 3, 26, 10, BOIS, planches(BOIS, 'v', pas=4, x0=1))
    for y in range(yd - 2, yd + 3):              # le couvercle en pente, qui déborde
        for x in range(0, 16):
            t.put(x, y, BOIS[4] if y < yd else BOIS[3])
    for x in range(0, 16):
        t.put(x, yd + 3, BOIS[1])
    for y in (yf + 3, base - 6):                 # deux cerclages de fer
        for x in range(1, 15):
            t.put(x, y, FER[3] if x == 1 else FER[2])
    h0, h1 = yf + 6, base - 9                    # le hublot, une fente vitrée
    for y in range(h0, h1 + 1):
        plein = niveau > 0 and y >= h1 - (h1 - h0) * niveau
        for x in (7, 8):
            t.put(x, y, (GRAIN[3] if x == 7 else GRAIN[2]) if plein else VITRE)
    for y in range(h0 - 1, h1 + 2):
        t.put(6, y, FER[1])
        t.put(9, y, FER[1])
    for y in (B.BOTTE_ENTREE + 16, B.BOTTE_ENTREE + 17):   # l'arrivée du tuyau de l'entonnoir
        t.put(0, y, FER[3] if y % 2 == 0 else FER[1])
        t.put(1, y, FER[2])
    for k in range(4):                           # la goulotte, vers la mangeoire
        t.put(13 + k // 2, base - 5 + k, FER[3])
        t.put(14 + k // 2, base - 5 + k, FER[1])
    return t.fini()


def mangeoire(pleine):
    """L'auge basse, deux cases de large ; pleine de grain, ou vide (quelques grains)."""
    t = Toile(32, 24)
    pieds(t, (2, 28), BAS - 2, BAS)
    yd, yf = boite(t, 1, 30, BAS - 2, 7, 9, BOIS, planches(BOIS, 'h', pas=3, y0=1))
    for y in range(yd + 1, yf - 1):
        for x in range(3, 29):
            if pleine:
                t.put(x, y, GRAIN[1 if (x * 5 + y * 3) % 9 == 0 else 3 if trame(x, y, 0.4) else 2])
            else:
                t.put(x, y, BOIS[0] if (x + y) % 5 else BOIS[1])
    for x in range(3, 29):
        t.put(x, yd + 1, BOIS[0])                # l'ombre du bord du fond
    for x in (8, 16, 24):                        # les cloisons
        for y in range(yd + 1, yf - 1):
            t.put(x, y, BOIS[2])
    if not pleine:
        for x, y in ((5, yd + 3), (12, yd + 4), (20, yd + 3)):
            t.put(x, y, GRAIN[2])
    return t.fini()


def main():
    out = {f'meuble_distributeur_{n}.png': distributeur(n / (NIVEAUX - 1)) for n in range(NIVEAUX)}
    out['meuble_mangeoire_grain_vide.png'] = mangeoire(False)
    out['meuble_mangeoire_grain_pleine.png'] = mangeoire(True)
    for name, im in out.items():
        im.save(os.path.join(ASSETS, name), optimize=True)
    if '--apercu' in sys.argv:
        k = 6
        W = sum(im.width * k + 8 for im in out.values())
        ap = Image.new('RGBA', (W, 40 * k), (88, 140, 64, 255))
        x = 0
        for im in out.values():
            big = im.resize((im.width * k, im.height * k), Image.NEAREST)
            ap.alpha_composite(big, (x, 40 * k - big.height))
            x += big.width + 8
        ap.save(os.path.join(ROOT, 'apercu_distributeur.png'))
    print(f'distributeur de grain : {len(out)} images')


if __name__ == '__main__':
    main()
