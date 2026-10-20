# Le poteau d'arrêt des lignes de bus de la ville (docs/plan-ville.md, étape 6 ; LIGNES,
# js/carte/ville/config.js), posé par le jeu sur le trottoir : un poteau gris, en haut le
# panneau « BUS » et, dessous, le numéro de chaque ligne qui s'y arrête, à sa couleur
# (scripts/ville/bus.py : LIGNES).
#   python3 scripts/ville/arret_bus.py     écrit assets/ville_arret_bus.png : 3 images de
#                                          16 × 48 (la ligne 1, la ligne 2, les deux) ; le pied
#                                          du poteau : y 46
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, contour, dessin, image, rgba  # noqa: E402
from equipements import texte  # noqa: E402
from bus import LIGNES  # noqa: E402

W, H = 16, 48
POTEAU = (70, 72, 80)
PANNEAU = (40, 92, 160)
BLANC = (240, 240, 244)


def poteau(lignes):
    im = image(W, H)
    d = dessin(im)
    d.ellipse((4, 44, 12, 47), fill=(0, 0, 0, 60))
    d.rectangle((7, 10, 8, 46), fill=rgba(POTEAU))
    d.rectangle((7, 10, 7, 46), fill=rgba((100, 104, 114)))
    # le panneau « BUS »
    d.rectangle((2, 1, 13, 8), fill=rgba(PANNEAU))
    # le numéro de chaque ligne, sur sa couleur
    for k, n in enumerate(lignes):
        y = 10 + k * 8
        d.rectangle((3, y, 12, y + 6), fill=rgba(LIGNES[n - 1]))
    im = contour(im)
    texte(im, 3, 2, 'BUS', BLANC)
    for k, n in enumerate(lignes):
        texte(im, 6, 11 + k * 8, str(n), BLANC)
    return im


if __name__ == '__main__':
    planche = image(W * 3, H)
    for k, lignes in enumerate(([1], [2], [1, 2])):
        planche.alpha_composite(poteau(lignes), (k * W, 0))
    chemin = os.path.join(ASSETS, 'ville_arret_bus.png')
    planche.save(chemin, optimize=True)
    print('écrit :', chemin)
