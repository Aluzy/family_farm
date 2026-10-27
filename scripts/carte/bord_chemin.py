# Le bord des chemins (fiche 15) : sa forme sur les coins d'une tuile, commune au chemin de la
# ferme (scripts/carte/herbe_chemin.py, ses raccords avec l'herbe) et à celui du grand monde
# (scripts/carte/sols_monde.py, le chemin posé sur un autre sol).
#
# Une tuile de coins n (n & 8 haut-gauche, 4 haut-droit, 2 bas-gauche, 1 bas-droit : le chemin à
# ces coins). Le champ du bord, en tuiles : positif dans le chemin, négatif dans l'herbe.
#   - Les coins arrondis : un coin de chemin seul est un quart de disque de rayon 1/2 (centré sur
#     le coin, un peu aplati : ROND), un coin d'herbe seul le creux d'un disque pareil ; deux coins
#     d'un même côté, un demi-carré ; deux coins en diagonale, une bande de chemin entre deux creux
#     d'herbe. Partout la
#     frontière coupe un côté en son milieu (là où ses deux coins diffèrent) et y arrive d'équerre :
#     deux tuiles voisines se raccordent sans cassure, les virages du chemin sont des arcs.
#   - Le bord irrégulier : un bruit lisse, périodique sur 16 px (le même dans toutes les tuiles),
#     déplace la frontière de ± BRUIT px. Comme il ne dépend que du pixel de la carte modulo 16, deux
#     tuiles voisines le continuent l'une dans l'autre : aucune couture.
#   - Les brins d'herbe qui débordent : un second bruit, en colonnes (des brins debout, de 1 à
#     BRINS px de long, plus ou moins serrés), repousse encore la frontière par endroits dans le
#     chemin. Périodique lui aussi : les brins se suivent d'une tuile à l'autre.
# Ce sont des tuiles comme avant (mêmes places, mêmes numéros) : le dessin de la carte ne change
# pas, ni son coût.
import functools
import math
import os
import sys
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import T  # noqa: E402

BRUIT = 1.6        # px : l'ondulation du bord
BRINS = 4          # px : la longueur des plus longs brins
MARGE = 3          # px du bord de la tuile où une variante n'a pas son bruit propre
# la rondeur des coins, l'exposant de la « distance » au coin (2 : un vrai quart de cercle, 1 : un
# triangle) : un peu moins qu'un cercle, pour qu'un chemin en biais, fait de coins en escalier,
# ondule à peine au lieu de faire des festons
ROND = 1.6


@functools.lru_cache(maxsize=None)
def _hasard(*k):
    h = zlib.crc32(repr(k).encode())
    h = ((h ^ (h >> 16)) * 0x45d9f3b) & 0xffffffff
    h = ((h ^ (h >> 16)) * 0x45d9f3b) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffff) / 0x1000000


def _lisse(t):
    return t * t * (3 - 2 * t)


def _bruit(cle, x, y, maille):
    """Un bruit lisse de 0 à 1, périodique sur 16 px (valeurs aux nœuds d'une grille de `maille` px,
    qui divise 16, interpolées)."""
    n = T // maille
    fx, fy = x / maille, y / maille
    ix, iy = math.floor(fx), math.floor(fy)
    tx, ty = _lisse(fx - ix), _lisse(fy - iy)
    v = lambda a, b: _hasard(cle, a % n, b % n)  # noqa: E731
    haut = v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx
    bas = v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx
    return haut * (1 - ty) + bas * ty


def ondulation(x, y, cle='bord'):
    """L'ondulation du bord en (x, y) (px de la carte, modulo 16) : de -1 à 1."""
    return 2 * (0.6 * _bruit(cle + ':8', x, y, 8) + 0.4 * _bruit(cle + ':4', x, y, 4)) - 1


def brin(x, y):
    """La longueur du brin d'herbe de la colonne x (px de la carte, modulo 16), par tranches de 3
    rangées : 0 (pas de brin) à BRINS px."""
    h = _hasard('brin', x % T, (y % T) // 3)
    if h < 0.35:
        return 0
    return 1 + int((h - 0.35) / 0.65 * BRINS)


def forme(n, u, v):
    """Le champ des coins n en (u, v) (de 0 à 1 sur la tuile ; un peu au-delà, chez la voisine), en
    tuiles : positif dans le chemin (voir l'en-tête)."""
    if n == 15:
        return 1.0
    if n == 0:
        return -1.0
    coins = ((0, 0, n & 8), (1, 0, n & 4), (0, 1, n & 2), (1, 1, n & 1))
    chemin = [(cx, cy) for cx, cy, k in coins if k]
    herbe = [(cx, cy) for cx, cy, k in coins if not k]
    d = lambda c: (abs(u - c[0]) ** ROND + abs(v - c[1]) ** ROND) ** (1 / ROND)  # noqa: E731
    if len(chemin) == 1:
        return 0.5 - d(chemin[0])
    if len(herbe) == 1:
        return d(herbe[0]) - 0.5
    (ax, ay), (bx, by) = chemin
    if ax == bx:                                   # un côté vertical : un demi-carré
        return 0.5 - abs(u - ax)
    if ay == by:                                   # un côté horizontal
        return 0.5 - abs(v - ay)
    return min(d(herbe[0]), d(herbe[1])) - 0.5    # en diagonale : une bande entre deux creux


def _fenetre(x, y):
    """0 à moins de MARGE px d'un côté de la tuile, jusqu'à 1 au milieu."""
    dd = min(x + 0.5, T - 0.5 - x, y + 0.5, T - 0.5 - y) - MARGE
    return 0.0 if dd <= 0 else min(1.0, dd / 3)


def champ(n, x, y, variante=None, brins=True):
    """Le champ du bord au pixel (x, y) de la tuile de coins n, en px (même un peu hors de la tuile :
    il y est celui de la voisine) : positif, le chemin. `variante` : un bruit de plus, propre à
    elle, loin des côtés (les tuiles d'une même forme ne se ressemblent pas toutes). `brins` : les
    brins d'herbe débordent sur le chemin."""
    if n in (0, 15):
        return T if n == 15 else -T
    u, v = (x + 0.5) / T, (y + 0.5) / T
    f = forme(n, u, v) * T + ondulation(x % T, y % T) * BRUIT
    if variante is not None and 0 <= x < T and 0 <= y < T:
        f += ondulation(x, y, 'bord:' + str(variante)) * BRUIT * _fenetre(x, y)
    if brins and 0 <= f < BRINS + 1:
        f -= brin(x % T, y % T) * 1.0
    return f
