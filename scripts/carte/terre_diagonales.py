# assets/terre_diagonales.png : les deux tuiles « diagonale » de la terre des zones de culture
# (version 1.13, double grille, voir ZONE_TILES dans js/farm-stage.js).
#
#   python3 scripts/carte/terre_diagonales.py            écrit assets/terre_diagonales.png
#   python3 scripts/carte/terre_diagonales.py --apercu   écrit aussi apercu_terre_diagonales.png
#
# Le jeu de tuiles n'a pas de tuile pour deux coins de terre opposés. Chacune se compose de
# deux coins d'herbe « en creux » du jeu de tuiles (l'herbe arrondie d'un trou d'herbe dans
# la terre), symétriques par rapport à la diagonale de la tuile :
#   case 0 (masque 6 : terre en haut à droite et en bas à gauche) : herbe en haut à gauche
#          (tuile 1539) + herbe en bas à droite (tuile 1387) ;
#   case 1 (masque 9 : terre en haut à gauche et en bas à droite) : herbe en haut à droite
#          (tuile 1537) + herbe en bas à gauche (tuile 1389).
# Un pixel d'herbe de l'une ou l'autre tuile reste de l'herbe ; le reste est la terre.
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
T, COLS = 16, 75


def tile(sheet, gid):
    n = gid - 1
    return sheet.crop(((n % COLS) * T, (n // COLS) * T, (n % COLS) * T + T, (n // COLS) * T + T))


def grass(p):
    r, g, b = p[:3]
    return g > r


def union(a, b):
    out = a.copy()
    pa, pb, po = a.load(), b.load(), out.load()
    for y in range(T):
        for x in range(T):
            if grass(pb[x, y]) and not grass(pa[x, y]):
                po[x, y] = pb[x, y]
    return out


def main():
    sheet = Image.open(os.path.join(ROOT, 'assets', 'farm_spring_summer.png')).convert('RGBA')
    out = Image.new('RGBA', (2 * T, T))
    out.paste(union(tile(sheet, 1539), tile(sheet, 1387)), (0, 0))
    out.paste(union(tile(sheet, 1537), tile(sheet, 1389)), (T, 0))
    out.save(os.path.join(ROOT, 'assets', 'terre_diagonales.png'))
    if '--apercu' in sys.argv:
        out.resize((out.width * 12, out.height * 12), Image.NEAREST).save(os.path.join(ROOT, 'apercu_terre_diagonales.png'))


if __name__ == '__main__':
    main()
