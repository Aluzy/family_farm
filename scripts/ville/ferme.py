# Les éléments de la ferme repris dans la ville : l'herbe, ses fleurs et herbes hautes, les
# arbres et buissons, et l'eau animée. Ils sont lus dans la planche de la carte de la ferme
# (assets/farm_spring_summer.png), dans ses couleurs finales (après scripts/carte/teintes_carte.py),
# aux blocs que décrit scripts/carte/planche_v2.py (BLOCS) :
#   herbe_chemin  colonnes 0 à 15, rangée 45 : l'herbe claire de la ferme, 16 variantes ;
#   herbe_deco    colonnes 16 à 31 : rangée 45 les herbes hautes, rangée 49 les fleurs (même teinte) ;
#   eau           colonnes 32 à 47 : rangée 45 + 2k, l'image k (0..7) ; colonnes 32 à 39 le fond
#                 peu profond (nu, cailloux, herbes…), 40 à 47 le fond profond ;
#   arbre (48, 50, 3 × 4), pin (52, 50, 4 × 4), buisson rond (57, 50, 3 × 2), buisson large (61, 50, 3 × 2).
# L'ombre portée d'un arbre seul : assets/ombre_arbre.png (celle des arbres du Verger).
import os

from PIL import Image

from commun import ASSETS, T

EAU_IMAGES, EAU_DUREE = 8, 160      # voir scripts/carte/eau.py
_planche = None


def planche():
    global _planche
    if _planche is None:
        _planche = Image.open(os.path.join(ASSETS, 'farm_spring_summer.png')).convert('RGBA')
    return _planche


def bloc(c, r, w=1, h=1):
    return planche().crop((c * T, r * T, (c + w) * T, (r + h) * T))


_herbe = {}


def herbe(x, y, v=0):
    """Le pixel (x, y) de la variante v (0..15) de l'herbe de la ferme."""
    if v not in _herbe:
        _herbe[v] = bloc(v, 45).load()
    return _herbe[v][x, y][:3]


def herbe_haute(v):
    return bloc(16 + v % 16, 45)


def fleurs(v):
    return bloc(16 + v % 16, 49)


def arbre():
    return bloc(48, 50, 3, 4)


def pin():
    return bloc(52, 50, 4, 4)


def buisson(large=False):
    return bloc(61 if large else 57, 50, 3, 2)


def ombre():
    return Image.open(os.path.join(ASSETS, 'ombre_arbre.png')).convert('RGBA')


_eau = {}


def eau(x, y, k, profond=False, variante=0):
    """Le pixel (x % 16, y % 16) de l'eau de la ferme, image k (0..7)."""
    cle = (k, profond, variante)
    if cle not in _eau:
        _eau[cle] = bloc(32 + (8 if profond else 0) + variante, 45 + 2 * k).load()
    return _eau[cle][x % T, y % T][:3]
