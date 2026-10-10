# assets/terre_bords.png : la terre labourée de la carte, posée par-dessus l'herbe
# (version 1.15, « double grille », voir ZONE_TILES dans js/farm-stage.js).
#
#   python3 scripts/carte/terre_bords.py            écrit assets/terre_bords.png
#   python3 scripts/carte/terre_bords.py --apercu   écrit aussi apercu_terre_bords.png
#
# 16 cases de 16×16, une par masque de coins (bits : 8 haut-gauche, 4 haut-droite,
# 2 bas-gauche, 1 bas-droite = coin labouré). Chaque case reprend la tuile de terre du jeu
# de tuiles pour ce masque, et son herbe devient transparente : la terre se pose ainsi sur
# n'importe quelle herbe de la carte (claire ou foncée) sans y laisser de carré d'herbe foncée.
# Les deux diagonales (6 et 9), absentes du jeu de tuiles, réunissent deux coins d'herbe
# arrondis symétriques par rapport à la diagonale de la tuile (6 : herbe en haut à gauche,
# tuile 1539, et en bas à droite, tuile 1387 ; 9 : en haut à droite, 1537, et en bas à
# gauche, 1389).
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
T, COLS = 16, 75
TUILES = {1: 1612, 2: 1614, 3: 1613, 4: 1762, 5: 1687, 7: 1539, 8: 1764, 10: 1689, 11: 1537,
          12: 1763, 13: 1389, 14: 1387, 15: 1688}
DIAGONALES = {6: (1539, 1387), 9: (1537, 1389)}


def tile(sheet, gid):
    n = gid - 1
    return sheet.crop(((n % COLS) * T, (n // COLS) * T, (n % COLS) * T + T, (n // COLS) * T + T))


def grass(p):
    return p[3] == 0 or p[1] > p[0]


def union(a, b):
    out = a.copy()
    pa, pb, po = a.load(), b.load(), out.load()
    for y in range(T):
        for x in range(T):
            if grass(pb[x, y]) and not grass(pa[x, y]):
                po[x, y] = pb[x, y]
    return out


def sans_herbe(im):
    out = im.copy()
    px = out.load()
    for y in range(T):
        for x in range(T):
            if grass(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return out


def main():
    sheet = Image.open(os.path.join(ROOT, 'assets', 'farm_spring_summer.png')).convert('RGBA')
    out = Image.new('RGBA', (16 * T, T), (0, 0, 0, 0))
    for m in range(1, 16):
        im = union(tile(sheet, DIAGONALES[m][0]), tile(sheet, DIAGONALES[m][1])) if m in DIAGONALES else tile(sheet, TUILES[m])
        out.paste(sans_herbe(im), (m * T, 0))
    out.save(os.path.join(ROOT, 'assets', 'terre_bords.png'))
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', out.size, (40, 90, 70, 255))
        bg.alpha_composite(out)
        bg.resize((out.width * 8, out.height * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_terre_bords.png'))


if __name__ == '__main__':
    main()
