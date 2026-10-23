# assets/citerne.png : la citerne (le réservoir du jeu), un bloc posé dehors.
# Vue de haut à 45° comme les blocs (scripts/rendu45.py) : une cuve ronde de tôle galvanisée,
# cerclée en bas, au milieu et en haut, sur un socle rond de planches, coiffée d'un couvercle
# conique ; un tube de niveau en façade, un peu à droite.
# 5 images de 28×38 : le tube de niveau vide (0), puis rempli au quart, à moitié, aux trois
# quarts et plein (4). La cuve est au milieu de l'image (la carte la centre sur sa case), le bas
# du socle sur le bas de l'image.
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py, scripts/rendu45.py
from pixel import ASSETS, rangee  # noqa: E402
from rendu45 import Toile, cylindre, disque, ton  # noqa: E402

W, H = 28, 38
N = 5
X0, Y0 = 14, 32                       # le pied de l'axe de la cuve dans l'image

GALVA = [(84, 92, 100), (112, 122, 132), (144, 154, 164), (176, 186, 194), (206, 214, 220)]
BOIS = [(60, 30, 22), (92, 50, 30), (128, 76, 44), (162, 104, 62), (196, 140, 92)]
CADRE = (40, 42, 48)                  # le cadre du tube de niveau
EAU = [(58, 118, 188), (110, 168, 224)]
VERRE = [(150, 176, 190), (190, 212, 222)]

R, Z0, Z1, HC = 9.5, 3, 27, 3         # la cuve : rayon, bas, haut ; la hauteur du couvercle
TUBE = 1.5 * math.pi + 0.45           # l'angle du tube de niveau (devant : 3 pi / 2)


def jauge(phi, z, niveau):
    """La couleur du tube de niveau en (phi, z), ou None hors du tube. Il se remplit du bas."""
    a = (phi - TUBE + math.pi) % (2 * math.pi) - math.pi
    u = abs(a * R)                     # (la distance à l'axe du tube, sur la cuve)
    if u >= 0.9 or not (Z0 + 1.5 < z < Z1 - 1.5):
        return None
    if u > 0.55:
        return CADRE
    plein = z < Z0 + 1.5 + (Z1 - Z0 - 3) * niveau
    return (EAU if plein else VERRE)[1 if u < 0.2 else 0]


def image(niveau):
    t = Toile(W, H, X0, Y0, lies=[('socle', 'cuve'), ('cuve', 'couvercle')])
    # le socle : un rond de planches
    cylindre(t, 0, 0, R + 1, 0, Z0, lambda p, z, s: ton(BOIS, s * 0.7 + 0.2, -1 if (p * (R + 1) / 2.5) % 1 < 0.2 else 0), 'socle')
    disque(t, 0, 0, R, R + 1, Z0, lambda r, p, s: BOIS[3], 'socle')

    # la cuve : des tôles (un joint tous les 3 px), trois cerclages, le tube de niveau
    def cuve(phi, z, s):
        j = jauge(phi, z, niveau)
        if j:
            return j
        if any(abs(z - c) < 0.5 for c in (Z0 + 1, (Z0 + Z1) / 2, Z1 - 1)):
            return ton(GALVA, s, -2)
        return ton(GALVA, s * 0.9 + 0.08, -1 if (phi * R / 3) % 1 < 0.12 else 0)
    cylindre(t, 0, 0, R, Z0, Z1, cuve, 'cuve')

    # le couvercle conique, huit plis
    def relief(rho, phi):
        k = HC / R
        return HC * (1 - rho / R), (math.cos(phi) * k, math.sin(phi) * k, 1)

    def couvercle(rho, phi, s):
        if rho < 1.2 or rho > R:
            return GALVA[1]
        return ton(GALVA, s * 0.95, -1 if (phi * 8 / (2 * math.pi)) % 1 < 0.06 else 0)
    disque(t, 0, 0, 0, R + 0.4, Z1, couvercle, 'couvercle', relief=relief)
    return t.image()


sheet = rangee([image(n / (N - 1)) for n in range(N)], W, H)
sheet.save(os.path.join(ASSETS, 'citerne.png'))
print('assets/citerne.png :', N, 'images de', W, '×', H)
