"""La liane fleurie de l'écran de chargement (jeu.html, #chargement ; css/jeu.css, .chargement-liane).

Aux couleurs du logo (assets/logo.png) : une jauge pervenche comme ses lettres, dans un cadre vert de ses feuilles, une
liane de feuilles autour, et cinq boutons qui s'ouvrent en fleurs du logo à mesure qu'elle se remplit. Écrit
assets/chargement_liane.png : 5 calques de 90 × 30, côte à côte, posés l'un sur l'autre par la page (agrandis 3 fois) :
  0 le fond : le cadre et le creux sombre ;
  1 le plein : la jauge pleine (la page n'en montre que la part chargée, de gauche à droite : de 4 à 4 + PLEIN px) ;
  2 les feuilles de la liane ;
  3 les cinq boutons ;
  4 les cinq fleurs (la page montre, pour chacune, le bouton ou la fleur : FLEURS, leur case de 8 × 8).
Lancer : python3 scripts/chargement/liane.py (les nombres de la page, css/jeu.css et jeu.html, suivent X0, LARGEUR,
FLEURS).
"""
import math
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
W, H = 90, 30
X0, Y0, LARGEUR, HAUTEUR = 3, 13, 84, 9          # le cadre ; le plein va de X0 + 1 à X0 + LARGEUR - 1
FLEURS = [10, 27, 44, 61, 78]                     # le milieu des fleurs, depuis X0 ; leur case : (X0 + f - 4, Y0 - 6)

# les couleurs du logo
G1, G2, G3 = (0x2c, 0x54, 0x28), (0x3d, 0x78, 0x36), (0x51, 0xa4, 0x4a)
B, BL, BD = (0xb2, 0xbf, 0xff), (0xdc, 0xe2, 0xff), (0x74, 0x80, 0xd6)
CREUX = (0x2a, 0x1f, 0x3d)
Y1, Y2 = (0xec, 0xe8, 0x34), (0xdf, 0xd9, 0x14)
TEINTES = [((0xd0, 0x74, 0xd6), (0xe2, 0x3f, 0xec)), ((0x9d, 0x14, 0xdf), (0x96, 0x73, 0xa7)),
           ((0x74, 0x80, 0xd6), (0x44, 0x4f, 0x9f)), ((0xfb, 0x09, 0x09), (0xd0, 0x5d, 0x5d)),
           ((0xff, 0x65, 0x00), (0xff, 0xb4, 0x00))]
FLEUR = ["..aa.aa.", ".abbabba", ".aabbaab", "..bbYYba", ".aabYYbb", ".aabbbaa", "..ab.ba.", "........"]
BOUTON = ["...G...", "..GbG..", ".GbabG.", ".GbbbG.", "..GgG..", "...g..."]
FEUILLE = ["..GG...", ".GggG..", "GgggggG", "GgggggG", ".GgggG.", "..GGG..", "...G..."]


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), c + (255,))


def rect(im, x, y, w, h, c):
    for j in range(h):
        for i in range(w): px(im, x + i, y + j, c)


def motif(im, x, y, lignes, couleurs, flip=False, rot=False):
    n, m = len(lignes[0]), len(lignes)
    for j, l in enumerate(lignes):
        for i, ch in enumerate(l):
            c = couleurs(ch, i, j)
            if c: px(im, x + (n - 1 - i if flip else i), y + (m - 1 - j if rot else j), c)


def calque(k):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x, y, w, h = X0, Y0, LARGEUR, HAUTEUR
    if k == 0:
        rect(im, x + 1, y, w - 2, 1, G1); rect(im, x + 1, y + h - 1, w - 2, 1, G1)
        rect(im, x, y + 1, 1, h - 2, G1); rect(im, x + w - 1, y + 1, 1, h - 2, G1)
        rect(im, x + 1, y + 1, w - 2, h - 2, CREUX)
    elif k == 1:
        rect(im, x + 1, y + 1, w - 2, h - 2, B); rect(im, x + 1, y + 1, w - 2, 1, BL); rect(im, x + 1, y + h - 2, w - 2, 1, BD)
    elif k == 2:
        for i, f in enumerate(range(2, w, 10)):
            motif(im, x + f - 2, y + h - 3 if i % 2 else y - 4, FEUILLE,
                  lambda ch, a, b: G1 if ch == 'G' else (G3 if (a, b) in ((2, 2), (3, 3)) else G2) if ch == 'g' else None,
                  flip=bool(i % 2), rot=not i % 2)
    else:
        for i, f in enumerate(FLEURS):
            a, b = TEINTES[i]
            if k == 3:
                motif(im, x + f - 3, y - 5, BOUTON, lambda ch, *_: {'G': G1, 'g': G2, 'a': a, 'b': b}.get(ch))
            else:
                motif(im, x + f - 4, y - 6, FLEUR, lambda ch, i_, j: {'a': a, 'b': b, 'Y': Y1 if j < 4 else Y2}.get(ch))
    return im


if __name__ == '__main__':
    planche = Image.new('RGBA', (W * 5, H), (0, 0, 0, 0))
    for k in range(5): planche.alpha_composite(calque(k), (k * W, 0))
    planche.save(RACINE / 'assets/chargement_liane.png', optimize=True)
    print('assets/chargement_liane.png', planche.size)
