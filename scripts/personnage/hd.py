# Essai : les personnages en résolution double (portraits 32 × 32, planches de cases 32 × 64).
#
# Ce n'est pas un simple agrandissement (les mêmes gros pixels) : on part des grilles de lettres
# des scripts de dessin (portraits.py, fermier.py), puis
#   1. Scale2x (EPX) : chaque pixel devient 2 × 2, et les escaliers des diagonales s'adoucissent ;
#   2. le contour extérieur redevient fin (un pixel au lieu de deux) ;
#   3. du relief : un liseré clair en haut et à gauche de chaque zone de couleur, un liseré sombre
#      en bas et à droite (la lumière vient d'en haut à gauche) ;
#   4. des mèches dans les cheveux.
# Les couleurs claires et sombres sont tirées de la couleur de chaque zone.
#
#   python3 scripts/personnage/hd.py   écrit assets/portraits_hd/perso_XX.png et
#                                      assets/personnages_hd/perso_XX.png pour ESSAI
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402
import portraits  # noqa: E402
import fermier  # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ESSAI = [1, 5, 10, 22, 44]          # les personnages de l'essai (catalogue)
SIDE = ((1, 0), (-1, 0), (0, 1), (0, -1))


def scale2x(g, vide, proteges=()):
    """EPX ; les petits détails (proteges : yeux, bouche, motifs) sont seulement agrandis."""
    h, w = len(g), len(g[0])
    at = lambda x, y: g[y][x] if 0 <= x < w and 0 <= y < h else vide
    out = [[vide] * (2 * w) for _ in range(2 * h)]
    for y in range(h):
        for x in range(w):
            p = g[y][x]
            a, b, c, d = at(x, y - 1), at(x + 1, y), at(x - 1, y), at(x, y + 1)
            e1 = e2 = e3 = e4 = p
            if p in proteges or any(v in proteges for v in (a, b, c, d)):
                out[2 * y][2 * x] = out[2 * y][2 * x + 1] = out[2 * y + 1][2 * x] = out[2 * y + 1][2 * x + 1] = p
                continue
            if c == a and c != d and a != b:
                e1 = a
            if a == b and a != c and b != d:
                e2 = b
            if d == c and d != b and c != a:
                e3 = c
            if b == d and b != a and d != c:
                e4 = d
            out[2 * y][2 * x], out[2 * y][2 * x + 1], out[2 * y + 1][2 * x], out[2 * y + 1][2 * x + 1] = e1, e2, e3, e4
    return out


def contour_fin(g, vide, contours):
    """Un pixel de contour qui touche le vide, doublé vers l'intérieur par un autre pixel de
    contour, devient vide : le contour extérieur ne fait plus qu'un pixel."""
    h, w = len(g), len(g[0])
    out = [row[:] for row in g]
    for y in range(h):
        for x in range(w):
            if g[y][x] not in contours:
                continue
            for dx, dy in SIDE:
                nx, ny = x + dx, y + dy
                dehors = not (0 <= nx < w and 0 <= ny < h) or g[ny][nx] == vide
                ix, iy = x - dx, y - dy
                if dehors and 0 <= ix < w and 0 <= iy < h and g[iy][ix] in contours:
                    out[y][x] = vide
                    break
    return out


def relief(g, vide, contours, cheveux, proteges=()):
    """Ton de chaque pixel : +1 (clair), -1 (sombre) ou 0. Seulement au bord des zones (contre
    le contour ou le vide) : un liseré clair en haut à gauche, sombre en bas à droite."""
    h, w = len(g), len(g[0])
    tons = [[0] * w for _ in range(h)]
    bord = lambda x, y: not (0 <= x < w and 0 <= y < h) or g[y][x] == vide or g[y][x] in contours
    for y in range(h):
        for x in range(w):
            c = g[y][x]
            if c == vide or c in contours or c in proteges:
                continue
            if bord(x, y - 1) or bord(x - 1, y):
                tons[y][x] = 1
            elif bord(x, y + 1) or bord(x + 1, y):
                tons[y][x] = -1
            elif c in cheveux and (x - y // 2) % 5 == 0 and not bord(x, y + 2):
                tons[y][x] = -1                         # une mèche
    return tons


def ton(rgb, t):
    if t > 0:
        return tuple(min(255, int(v + (255 - v) * 0.22)) for v in rgb)
    if t < 0:
        return tuple(int(v * 0.8) for v in rgb)
    return rgb


def rendre(g, tons, pal, vide):
    h, w = len(g), len(g[0])
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            c = g[y][x]
            if c != vide:
                im.putpixel((x, y), ton(pal[c], tons[y][x]) + (255,))
    return im


def hd(g, pal, vide, contours, cheveux, proteges=()):
    g2 = contour_fin(scale2x(g, vide, set(proteges)), vide, contours)
    return rendre(g2, relief(g2, vide, contours, cheveux, set(proteges)), pal, vide)


# Les petits détails, agrandis sans être adoucis.
PROTEGES_PORTRAIT = {'g', 'h', 'i', 'k', 'G', 'R', 'P', 'Q', 'Y', 'E'}
PROTEGES_CASE = {'ey', 'ck', 'rx', 'gl', 'sp', 'bm', 'yo', 'fc', 'cpb', 'sk2', 'eg', 'dr', 'sd'}


def main():
    os.makedirs(os.path.join(ROOT, 'assets', 'portraits_hd'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'assets', 'personnages_hd'), exist_ok=True)
    base, pal0 = portraits.lire_modele()
    persos = dict(catalogue.personnages())
    for n in ESSAI:
        nom = f'perso_{n:02d}'
        d = persos[nom]
        g, pal = portraits.grille_catalogue(base, pal0, d)
        hd(g, pal, '.', {'a', 'l'}, {'b', 'c', 'd'}, PROTEGES_PORTRAIT).save(os.path.join(ROOT, 'assets', 'portraits_hd', f'{nom}.png'))
        fermier.dessiner(fermier.variante_catalogue(d))
        F = fermier.frames()
        names = list(F)
        cols = fermier.COLS
        rows = (len(names) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * 32, rows * 64), (0, 0, 0, 0))
        for i, k in enumerate(names):
            im = hd(F[k].px, dict(fermier.C), None, {'K'}, {'hr', 'hr2'}, PROTEGES_CASE)
            sheet.paste(im, ((i % cols) * 32, (i // cols) * 64))
        sheet.save(os.path.join(ROOT, 'assets', 'personnages_hd', f'{nom}.png'))
    print(f'essai HD : {len(ESSAI)} portraits 32 × 32 et {len(ESSAI)} planches de cases 32 × 64')


if __name__ == '__main__':
    main()
