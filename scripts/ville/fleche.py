# La flèche bleue des passages d'une carte à l'autre (la ferme, la carte de transition, la
# ville) : une grosse flèche en relief (le dessus bleu, un biseau clair en haut à gauche, son
# épaisseur plus sombre en bas à droite, cernée de sombre), son ombre au sol. Quatre images
# de 32 × 32 : droite, gauche, haut, bas.
#
#   python3 scripts/ville/fleche.py      écrit assets/fleche_passage.png
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, K, image, rgba  # noqa: E402

BLEU = (66, 134, 228)
CLAIR = (156, 204, 255)
SOMBRE = (34, 72, 156)
EPAIS = 3          # l'épaisseur du relief (px, vers le bas et la droite)

# la flèche vers la droite, en px (dans un carré de 32) : la hampe et la pointe
def dedans(x, y):
    if 5 <= x < 17 and 11 <= y < 20:
        return True
    return 16 <= x < 27 and abs(y - 15.5) <= (27 - x) * 0.95


SENS = {
    'droite': lambda x, y: dedans(x, y), 'gauche': lambda x, y: dedans(31 - x, y),
    'haut': lambda x, y: dedans(31 - y, x), 'bas': lambda x, y: dedans(y, x),
}


def fleche(sens):
    """La flèche tournée vers `sens`, toujours éclairée du haut à gauche."""
    dedans = SENS[sens]
    im = image(32, 32)
    px = im.load()
    # l'ombre au sol, puis l'épaisseur, puis le dessus
    for y in range(32):
        for x in range(32):
            if dedans(x - EPAIS - 1, y - EPAIS - 2):
                px[x, y] = (0, 0, 0, 70)
    for k in range(EPAIS, 0, -1):
        for y in range(32):
            for x in range(32):
                if dedans(x - k, y - k):
                    px[x, y] = rgba(SOMBRE)
    for y in range(32):
        for x in range(32):
            if not dedans(x, y):
                continue
            bord_haut = not dedans(x, y - 1) or not dedans(x - 1, y)
            bord_bas = not dedans(x, y + 1) or not dedans(x + 1, y)
            c = CLAIR if bord_haut else (52, 112, 204) if bord_bas else BLEU
            if not bord_haut and (not dedans(x, y - 2) or not dedans(x - 2, y)):
                c = (110, 172, 246)
            px[x, y] = rgba(c)
    # le contour
    out = im.copy()
    po = out.load()
    for y in range(32):
        for x in range(32):
            if px[x, y][3] >= 200:
                continue
            if any(0 <= x + dx < 32 and 0 <= y + dy < 32 and px[x + dx, y + dy][3] >= 200
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                po[x, y] = rgba(K)
    return out


def planche():
    images = [fleche(s) for s in SENS]
    out = image(32 * 4, 32)
    for i, im in enumerate(images):
        out.alpha_composite(im, (32 * i, 0))
    out.save(os.path.join(ASSETS, 'fleche_passage.png'), optimize=True)
    return out


if __name__ == '__main__':
    planche()
