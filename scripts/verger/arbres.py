# assets/verger.png : les dessins du Verger sur la carte (version 1.13, v2 lot 9).
#
#   python3 scripts/verger/arbres.py            écrit assets/verger.png
#   python3 scripts/verger/arbres.py --apercu   écrit aussi apercu_verger.png (agrandi ×4)
#
# Une planche de 6 cases de 80×80 (la taille des arbres de basic_sp.png), chaque dessin
# posé pied au bas de la case, centré :
#   0 emplacement libre   butte de terre labourée (plot-soil des icônes)
#   1 jeune arbre         jeune plant et son tuteur (tree-young des icônes)
#   2 arbuste             petit arbre fruitier (tree-adult des icônes)
#   3 arbre               l'arbre de la carte (première case de basic_sp.png)
#   4 pommier en fruits   le même, chargé de pommes rouges
#   5 poirier en fruits   le même, chargé de poires jaune-vert
# Les pixels restent à l'échelle de la carte : aucun dessin n'est agrandi.
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'icones'))
import art_verger as A  # noqa: E402

CASE = 80

# Pommes et poires posées sur le houppier de basic_sp.png (coin haut-gauche du fruit).
FRUITS = [(20, 14), (36, 9), (52, 15), (14, 28), (30, 24), (46, 26), (60, 30),
          (22, 40), (38, 38), (54, 42), (30, 50), (46, 52)]


def fruit_image(kind):
    cv = A.Canvas(8, 8)
    A.fruit(cv, 1, 1, kind)
    cv.outline(A.OUT, A.PRIO)
    return cv.image()


def base_tree():
    return Image.open(os.path.join(ROOT, 'assets', 'basic_sp.png')).convert('RGBA').crop((0, 0, CASE, CASE))


def with_fruits(kind):
    im = base_tree()
    f = fruit_image(kind)
    for x, y in FRUITS:
        im.alpha_composite(f, (x, y))
    return im


def foot(im):
    """Case de 80×80 avec le dessin centré, pied sur le bas."""
    out = Image.new('RGBA', (CASE, CASE), (0, 0, 0, 0))
    box = im.getbbox()
    im = im.crop(box)
    out.alpha_composite(im, ((CASE - im.width) // 2, CASE - im.height))
    return out


def planche():
    cases = [
        foot(A.soil()),
        foot(A.young_tree()),
        foot(A.adult_tree()),
        base_tree(),
        with_fruits('apple'),
        with_fruits('pear'),
    ]
    sheet = Image.new('RGBA', (CASE * len(cases), CASE), (0, 0, 0, 0))
    for i, im in enumerate(cases):
        sheet.alpha_composite(im, (i * CASE, 0))
    return sheet


def main():
    sheet = planche()
    sheet.save(os.path.join(ROOT, 'assets', 'verger.png'))
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (74, 112, 58, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_verger.png'))


if __name__ == '__main__':
    main()
