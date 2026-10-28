# La galerie secrète de la mine de la ferme (le récit, lot 10 : docs/recit/aventure.md, « le fil de la lune » ;
# js/engine/fil-lune.js, js/grotte.js) : les images de ce qui ne se voit qu'une nuit de pleine lune, dans le
# style de la mine (scripts/carte/grotte.py : vue de face un peu de haut, lumière en haut à gauche, contour
# sombre d'un pixel). Une planche de cases de 32 × 32, dans cet ordre :
#
#   0  fissure     une fente dans la paroi, d'où sort une lumière froide (bleutée) ; posée sur la case du
#                  mur, le pied au bas de la case
#   1  couverture  une couverture de laine pliée, posée par terre, élimée
#   2  tasse       une tasse de fer-blanc, cabossée, à côté
#   3  gravures    les phases de la lune gravées dans la paroi : cinq ronds, de la lune noire à la pleine et retour
#   4  pierre      la pierre : un galet clair, tiède, qui luit d'un bleu très pâle, sur un petit lit de sable
#
#   python3 scripts/carte/galerie.py      écrit assets/galerie.png (160 × 32)
#
# Relancer le script redonne la même image.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS  # noqa: E402

SORTIE = os.path.join(ASSETS, 'galerie.png')
C = 32
CONTOUR = (24, 18, 20)
ROCHE = [(34, 28, 30), (52, 44, 46), (72, 62, 62), (96, 84, 82)]
FROID = [(120, 176, 220), (176, 214, 240), (226, 244, 255)]
LAINE = [(70, 40, 34), (110, 62, 48), (150, 92, 66), (186, 130, 92)]
FER = [(70, 74, 80), (112, 118, 124), (160, 166, 170), (206, 210, 212)]
SABLE = [(118, 98, 70), (150, 128, 92)]
PIERRE = [(150, 168, 190), (190, 208, 226), (222, 236, 248), (250, 254, 255)]


def toile():
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    return im, im.load()


def pose(q, x, y, c):
    if 0 <= x < C and 0 <= y < C:
        q[x, y] = tuple(c) + (255,)


def contour(im):
    src = im.copy().load()
    q = im.load()
    for y in range(C):
        for x in range(C):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < C and 0 <= y + dy < C and src[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                q[x, y] = CONTOUR + (255,)
    return im


def fissure():
    """Une fente en zigzag au milieu de la paroi, du haut vers le bas de la case ; sa lumière froide déborde
    sur la roche autour (des pixels plus clairs, bleutés)."""
    im, q = toile()
    xs = [16, 15, 15, 16, 17, 17, 16, 15, 14, 14, 15, 16, 16, 17, 17, 16, 15, 15, 16, 16]
    for k, x in enumerate(xs):
        y = 10 + k
        for d in (-1, 0, 1):
            pose(q, x + d, y, FROID[2] if d == 0 else FROID[1])
        # la lueur sur la roche, de part et d'autre
        for d in (-3, -2, 2, 3):
            if (k + d) % 3:
                pose(q, x + d, y, FROID[0])
    return im


def couverture():
    """Une couverture de laine pliée en trois, posée par terre, un coin relevé ; deux raies plus claires."""
    im, q = toile()
    for y in range(18, 29):
        for x in range(5, 27):
            c = LAINE[2] if x < 16 else LAINE[1]
            if y in (21, 25):
                c = LAINE[3]                                # les raies
            if y == 28 or x == 26:
                c = LAINE[0]                                # le dessous, dans l'ombre
            if (x + y) % 7 == 0 and y not in (21, 25):
                c = LAINE[1]                                # l'usure
            pose(q, x, y, c)
    for x in range(20, 27):
        pose(q, x, 17, LAINE[3])                            # le coin relevé
    return contour(im)


def tasse():
    """Une tasse de fer-blanc cabossée, son anse à droite."""
    im, q = toile()
    for y in range(20, 29):
        for x in range(12, 20):
            c = FER[2] if x < 15 else FER[1]
            if y == 20:
                c = FER[0]                                  # le dedans, sombre
            if (x, y) in ((17, 24), (18, 25)):
                c = FER[0]                                  # la bosse
            pose(q, x, y, c)
    for y in range(22, 27):
        pose(q, 21, y, FER[1])
    pose(q, 20, 22, FER[1])
    pose(q, 20, 26, FER[1])
    pose(q, 13, 21, FER[3])                                 # un reflet
    return contour(im)


def gravures():
    """Cinq ronds gravés dans la paroi, d'un bout à l'autre du mois : la lune noire (le cercle seul), la
    croissante (sa moitié droite claire), la pleine, la décroissante (sa moitié gauche), la noire."""
    im, q = toile()
    for k, phase in enumerate(('noire', 'croissante', 'pleine', 'decroissante', 'noire')):
        cx, cy = 4 + k * 6, 15
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                d2 = dx * dx + dy * dy
                if d2 > 5:
                    continue
                bord = d2 >= 4
                clair = phase == 'pleine' or (phase == 'croissante' and dx > 0) or (phase == 'decroissante' and dx < 0)
                pose(q, cx + dx, cy + dy, ROCHE[0] if bord else (178, 166, 152) if clair else ROCHE[1])
    return im


def pierre():
    """La pierre : un galet ovale, clair, son reflet en haut à gauche, sur un peu de sable."""
    im, q = toile()
    for y in range(26, 30):
        for x in range(8, 24):
            if abs(x - 16) < 8 - (y - 26):
                pose(q, x, y, SABLE[(x + y) % 2])
    for y in range(18, 28):
        for x in range(10, 22):
            u, v = (x + 0.5 - 16) / 6, (y + 0.5 - 23) / 5
            if u * u + v * v > 1:
                continue
            c = PIERRE[1]
            if u + v < -0.6:
                c = PIERRE[3]
            elif u + v < -0.1:
                c = PIERRE[2]
            elif u + v > 0.8:
                c = PIERRE[0]
            pose(q, x, y, c)
    return contour(im)


def main():
    images = [fissure(), couverture(), tasse(), gravures(), pierre()]
    out = Image.new('RGBA', (C * len(images), C), (0, 0, 0, 0))
    for k, im in enumerate(images):
        out.alpha_composite(im, (k * C, 0))
    out.save(SORTIE)
    print(f'assets/galerie.png : {out.width} × {out.height}')


if __name__ == '__main__':
    main()
