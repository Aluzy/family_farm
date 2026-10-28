# Outils communs à tous les générateurs d'images (scripts/<dossier>/*.py) : les chemins du
# dépôt, quelques aides de dessin au pixel (contour, mélange de couleurs, hasard fixe, aperçu
# agrandi…).
#
# Les générateurs se lancent depuis la racine du dépôt (python3 scripts/<dossier>/<fichier>.py) :
# Python ne voit alors que leur propre dossier. Chacun ajoute donc scripts/ au chemin avant
# d'importer ce module, par la même ligne :
#
#   sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
#
# (les modules d'un dossier qui ont leur propre commun.py — ville, infra — passent par lui).
# Seules les aides vraiment identiques d'un dossier à l'autre sont ici : les autres (planche(),
# tsx(), …) gardent leur version, propre à leur image.
import colorsys
import math
import os

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ASSETS = os.path.join(ROOT, 'assets')
T = 16                        # une tuile de la carte : 16 × 16 px

# Trame ordonnée 4 × 4 (seuils de 0 à 15) : un fondu tramé entre deux couleurs, sans demi-teinte.
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

# ---------- couleurs ----------

def rgb(h):
    """'#rrggbb' -> (r, g, b, 255)."""
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def hls(c):
    """(r, g, b) de 0 à 255 -> (teinte, luminosité, saturation) de 0 à 1."""
    return colorsys.rgb_to_hls(*(v / 255 for v in c))


def mel(a, b, t):
    """De a (t = 0) à b (t = 1), en (r, g, b) : a + (b - a) × t."""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def melange(a, b, t=0.5):
    """a × (1 - t) + b × t, composante par composante (autant que les deux couleurs en ont).
    Pas tout à fait mel() : les arrondis des deux formules ne tombent pas toujours pareil."""
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def hasard(*k):
    """Un nombre fixe dans [0, 1[ pour ces clés (les images sont les mêmes à chaque lancement)."""
    x = math.sin(sum(v * c for v, c in zip(k, (12.9898, 78.233, 37.719, 4.581, 91.27))) + 0.5) * 43758.5453
    return x - math.floor(x)


# ---------- images ----------

def contour(im, couleur, diagonales=False, seuil=0):
    """Un contour d'un pixel de `couleur` sur les pixels transparents qui touchent le dessin
    (haut, bas, gauche, droite, et les diagonales si `diagonales`). Un voisin compte s'il est plus
    opaque que `seuil`."""
    w, h = im.size
    src = im.load()
    out = im.copy()
    dst = out.load()
    vois = ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (-1, -1), (1, -1), (-1, 1)) if diagonales else ())
    c = tuple(couleur[:3]) + (255,)
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and src[x + dx, y + dy][3] > seuil for dx, dy in vois):
                dst[x, y] = c
    return out


def points(px, w, h):
    """L'image w × h des points {(x, y): (r, g, b)} (ceux qui sortent du cadre sont oubliés)."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < w and 0 <= y < h:
            im.putpixel((x, y), c + (255,))
    return im


def rangee(images, w, h):
    """Une planche d'une rangée : les images de w × h côte à côte, de gauche à droite."""
    sheet = Image.new('RGBA', (w * len(images), h), (0, 0, 0, 0))
    for k, im in enumerate(images):
        sheet.paste(im, (k * w, 0))
    return sheet


def apercu(im, nom, zoom=6, fond=(20, 18, 28)):
    """Écrit l'image agrandie × zoom sur un fond uni, à la racine du dépôt (apercu_*.png)."""
    bg = Image.new('RGBA', im.size, fond + (255,))
    bg.alpha_composite(im)
    bg.resize((im.width * zoom, im.height * zoom), Image.NEAREST).save(os.path.join(ROOT, nom))


def cote_a_cote(gauche, droite, ecart=24, fond=(40, 40, 40)):
    """Deux images côte à côte (en haut), sur un fond uni : la planche et sa carte d'exemple."""
    out = Image.new('RGBA', (gauche.width + droite.width + ecart, max(gauche.height, droite.height)), fond + (255,))
    out.paste(gauche, (0, 0))
    out.paste(droite, (gauche.width + ecart, 0))
    return out


def copie(g):
    """Une copie d'une grille de lettres (liste de rangées)."""
    return [row[:] for row in g]


# ---------- Tiled ----------

def wangid(n, c1=1, c2=2):
    """Le wangid Tiled d'une tuile de coins n (n & 8 haut-gauche, 4 haut-droit, 2 bas-gauche,
    1 bas-droit de la couleur c2, les autres coins de c1). Ordre de Tiled : haut, haut-droit,
    droite, bas-droit, bas, bas-gauche, gauche, haut-gauche."""
    tl, tr, bl, br = [c2 if (n >> k) & 1 else c1 for k in (3, 2, 1, 0)]
    return f'0,{tr},0,{br},0,{bl},0,{tl}'
