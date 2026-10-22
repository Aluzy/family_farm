# La courgette dans assets/crops.png (rangée 11), cases de 16 × 16 :
#   colonne 0 : les graines dans leur trou de semis (comme les autres cultures, scripts/carte/cultures.py) ;
#   colonnes 1 à 3 : le plant qui pousse (jeune pousse, plant en fleur, plant avec ses courgettes) ;
#   colonne 4 : la courgette récoltée (icône 🥒, scripts/icones/build.py ; son sachet de
#   graines en est tiré, scripts/icones/art_graines.py).
# Chaque case est redessinée en entier : le script peut être relancé.
# data/crops.json : "sprite": { "r": 11, "h": 16, "c": [0, 1, 2, 3] }.
#
#   python3 scripts/carte/courgette.py            réécrit les cases de assets/crops.png
#   python3 scripts/carte/courgette.py --apercu   écrit aussi apercu_courgette.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, T  # noqa: E402
SHEET = os.path.join(ASSETS, 'crops.png')
ROW = 11

C = {
    # feuillage
    'D': (12, 89, 73), 'M': (29, 116, 69), 'L': (51, 139, 68), 'H': (86, 154, 55),
    # tige, terre
    'S': (90, 43, 30), 'B': (103, 73, 55),
    # courgette : contour, vert foncé, vert, rayures claires, reflet
    'K': (16, 52, 34), 'g': (31, 92, 52), 'G': (46, 118, 62), 's': (118, 168, 82), 'h': (168, 208, 122),
    # pédoncule, bout de la fleur
    't': (201, 149, 72), 'y': (216, 178, 96),
    # fleur
    'Y': (242, 192, 64), 'O': (224, 138, 32),
}


def blank():
    return Image.new('RGBA', (T, T), (0, 0, 0, 0))


def put(im, x, y, k):
    if 0 <= x < T and 0 <= y < T:
        im.putpixel((x, y), C[k] + (255,))


def courgette(im, x0, y0, x1, y1, r, stem=True):
    """Une courgette couchée de (x0, y0) (bout de la fleur) à (x1, y1) (pédoncule) : un
    cylindre arrondi, ombré dessous, rayé en long, avec un reflet sur le dessus."""
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy)
    ux, uy = dx / n, dy / n
    px, py = -uy, ux  # perpendiculaire (vers le haut-gauche pour une courgette montante)
    if py > 0:
        px, py = -px, -py
    for y in range(T):
        for x in range(T):
            cx, cy = x + 0.5 - x0, y + 0.5 - y0
            t = cx * ux + cy * uy
            o = cx * px + cy * py  # > 0 : côté éclairé
            tt = max(0.0, min(n, t))
            d = math.hypot(cx - tt * ux, cy - tt * uy)
            if d > r + 0.75:
                continue
            if d > r - 0.25:
                put(im, x, y, 'K')
                continue
            band = int((t + 40) // 1.6) % 2  # rayures en long
            if o > r * 0.45:
                k = 'h' if band else 's'
            elif o > -r * 0.2:
                k = 's' if band else 'G'
            else:
                k = 'g'
            if t < 0.9:
                k = 'y' if o > 0 else 'g'  # bout de la fleur
            put(im, x, y, k)
    if stem:
        sx, sy = x1 + ux * (r + 0.6), y1 + uy * (r + 0.6)
        put(im, round(sx - 0.5), round(sy - 0.5), 't')
        put(im, round(sx + ux - 0.5), round(sy + uy - 0.5), 'S')


def leaf(im, cx, cy, rx, ry):
    """Une grande feuille de courgette (ellipse lobée), éclairée en haut à gauche, nervure claire."""
    for y in range(T):
        for x in range(T):
            ex, ey = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = ex * ex + ey * ey
            lobe = 0.12 * math.cos(5 * math.atan2(ey, ex)) if rx > 3 else 0  # petites feuilles : rondes
            if d > 1 + lobe:
                continue
            if d > 0.62 + lobe:
                k = 'D'
            elif ex + ey < -0.35:
                k = 'L'
            else:
                k = 'M'
            if abs(ex - ey * 0.2) < 0.12 and ey < 0.4:
                k = 'H'
            put(im, x, y, k)


def stem(im, x, y0, y1):
    for y in range(y0, y1 + 1):
        put(im, x, y, 'S' if y == y1 else 'M')


def flower(im, x, y):
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        put(im, x + dx, y + dy, 'Y')
    put(im, x, y, 'O')


def phase1():
    # jeune pousse : une tige et ses deux cotylédons ronds
    im = blank()
    stem(im, 8, 10, 14)
    leaf(im, 5.8, 10.2, 2.4, 1.7)
    leaf(im, 10.4, 9.8, 2.4, 1.7)
    return im


def phase2():
    im = blank()
    stem(im, 8, 9, 15)
    leaf(im, 4.5, 10, 3.6, 2.8)
    leaf(im, 11.5, 9.5, 3.8, 3.0)
    leaf(im, 8, 6.5, 3.2, 2.6)
    flower(im, 9, 12)
    return im


def phase3():
    # plant mûr : grandes feuilles, une fleur, et une belle courgette couchée à son pied
    im = blank()
    leaf(im, 4.5, 8.0, 3.8, 3.0)
    leaf(im, 11.5, 7.5, 4.0, 3.1)
    leaf(im, 8, 5.0, 3.3, 2.7)
    flower(im, 13, 11)
    courgette(im, 2.2, 13.6, 10.6, 11.6, 1.9)
    return im


def harvested():
    im = blank()
    courgette(im, 2.5, 13.5, 12.5, 3.5, 2.4)
    return im


def graines():
    """Le trou de semis et ses graines plates, crème (celui des autres cultures : cultures.py)."""
    from cultures import graine
    return graine([(176, 160, 112), (230, 216, 168), (246, 238, 204)], 'rond').crop((0, 16, 16, 32))


def main():
    sheet = Image.open(SHEET).convert('RGBA')
    cells = {0: graines(), 1: phase1(), 2: phase2(), 3: phase3(), 4: harvested()}
    for col, im in cells.items():
        box = (col * T, ROW * T, (col + 1) * T, (ROW + 1) * T)
        sheet.paste(Image.new('RGBA', (T, T), (0, 0, 0, 0)), box)
        sheet.alpha_composite(im, (col * T, ROW * T))
    sheet.save(SHEET, optimize=True)
    if '--apercu' in sys.argv:
        row = sheet.crop((0, ROW * T, 5 * T, (ROW + 1) * T)).resize((5 * T * 8, T * 8), Image.NEAREST)
        bg = Image.new('RGBA', row.size, (105, 150, 84, 255))
        bg.alpha_composite(row)
        bg.save(os.path.join(ROOT, 'apercu_courgette.png'))
    print('crops.png : courgette réécrite (rangée %d, colonnes 0 à 4)' % ROW)


if __name__ == '__main__':
    main()
