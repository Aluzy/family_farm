# Le bus scolaire, vu en 3/4 de dessus comme les voitures (scripts/ville/voitures.py : la même
# vue, la même lumière, le même rendu au pixel par lancer de rayons), dans les huit directions :
# une longue caisse jaune, une bande de vitres tout autour, un pare-brise, quatre roues, un
# pare-chocs noir et le panneau « ÉCOLE » sur le toit.
#
# Les bus des lignes de la ville (docs/plan-ville.md, étape 6) : le même bus, sans le panneau, à
# la couleur de sa ligne (LIGNES).
#
#   python3 scripts/ville/bus.py      écrit assets/ville_bus.png (8 images de 112 × 112, dans
#                                     l'ordre de voitures.DIRECTIONS) et assets/ville_bus.json ;
#                                     assets/ville_bus_lignes.png (une rangée de 8 par ligne)
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, K, contour, image, rgba, teinte  # noqa: E402
from voitures import CHROME, FEU, JANTE, KY, KZ, PHARE, PNEU, VERRE, DIRECTIONS  # noqa: E402

CASE = 112
ANCRE = (56, 70)
HL, HW = 46, 15            # demi-longueur, demi-largeur (px)
ROUES = 30
RR = 6.5
CAISSE = (3, 30)           # le bas et le haut de la caisse
JAUNE = (236, 178, 40)
NOIR = (40, 38, 44)
# la couleur de chaque ligne de la ville (js/carte/ville/config.js, LIGNES : dans cet ordre)
LIGNES = [(58, 150, 88), (132, 82, 172)]


def tons(c):
    return [teinte(c, 0.6), teinte(c, 0.8), c, teinte(c, 1.16)]


def matiere(u, v, w, panneau=True):
    """La matière au point (u : vers l'avant, v : vers la droite, w : vers le haut), ou None."""
    av = abs(v)
    if w < 0 or w > CAISSE[1] + 4:
        return None
    for e in (-ROUES, ROUES):
        d = math.hypot(u - e, w - RR)
        if d <= RR and HW - 5 <= av <= HW - 0.5:
            return 'jante' if d < 3 and av > HW - 1.6 else 'pneu'
    # le panneau ÉCOLE, sur le toit à l'avant
    if panneau and CAISSE[1] < w <= CAISSE[1] + 4 and 28 <= u <= 40 and av <= 7:
        return 'panneau' if w > CAISSE[1] + 1 else 'noir'
    if w > CAISSE[1] or w < CAISSE[0]:
        return None
    if av > HW - 6 and any(math.hypot(u - e, w - RR) < RR + 1.5 for e in (-ROUES, ROUES)):
        return None
    # le plan : un long rectangle aux coins arrondis, le toit un peu bombé
    retrait = max(0, w - (CAISSE[1] - 2)) * 1.2
    lu, lv, r = HL - retrait, HW - retrait, 5
    du, dv = max(0, abs(u) - (lu - r)), max(0, av - (lv - r))
    if abs(u) > lu or av > lv or math.hypot(du, dv) > r:
        return None
    nez, cul = u > HL - 2, u < -HL + 2
    if w < CAISSE[0] + 3:
        return 'noir'                                  # le pare-chocs et le bas de caisse
    if nez:
        if 17 <= w <= 27 and av < HW - 2:
            return 'verre'                             # le pare-brise
        if 8 <= w <= 11 and 9 <= av <= 12:
            return 'phare'
        if 6 <= w <= 12 and av < 6:
            return 'noir'                              # la calandre
    if cul:
        if 18 <= w <= 26 and av < HW - 4:
            return 'verre'
        if 8 <= w <= 11 and 10 <= av <= 13:
            return 'feu'
    # sur les flancs : la bande de vitres, coupée de montants, et le filet noir
    if av > HW - 1.5 and not nez and not cul:
        if 17 <= w <= 26:
            return 'noir' if (u + 100) % 12 < 1.5 else 'verre'
        if 12 <= w <= 13:
            return 'noir'
    return 'caisse'


def bus(direction, ombre=True, couleur=JAUNE, panneau=True):
    palettes = {'caisse': tons(couleur), 'verre': VERRE, 'pneu': PNEU, 'jante': JANTE, 'chrome': CHROME,
                'phare': PHARE, 'feu': FEU, 'noir': [(26, 24, 28), (34, 32, 38), (44, 42, 48), (58, 56, 62)],
                'panneau': [(150, 40, 36), (196, 52, 46), (220, 70, 60), (240, 110, 96)]}
    a = math.radians(DIRECTIONS[direction])
    ca, sa = math.cos(a), math.sin(a)
    local = lambda x, y: (x * ca + y * sa, -x * sa + y * ca)
    plein = lambda x, y, z: matiere(*local(x, y), z, panneau) is not None
    lum = (-0.45, -0.55, 0.7)
    n_l = math.sqrt(sum(c * c for c in lum))
    lum = tuple(c / n_l for c in lum)
    im = image(CASE, CASE)
    px = im.load()
    for py in range(CASE):
        for qx in range(CASE):
            x = qx + 0.5 - ANCRE[0]
            sy = py + 0.5 - ANCRE[1]
            z = CAISSE[1] + 4.5
            touche = None
            while z >= 0:
                y = (sy + KZ * z) / KY
                m = matiere(*local(x, y), z, panneau)
                if m:
                    touche = (x, y, z, m)
                    break
                z -= 0.25
            if not touche:
                continue
            x, y, z, m = touche
            nx = plein(x - 1, y, z) - plein(x + 1, y, z)
            ny = plein(x, y - 1, z) - plein(x, y + 1, z)
            nz = plein(x, y, z - 1) - plein(x, y, z + 1)
            n = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            b = (nx * lum[0] + ny * lum[1] + nz * lum[2]) / n if (nx or ny or nz) else 0.5
            ton = 3 if b > 0.72 else 2 if b > 0.3 else 1 if b > -0.15 else 0
            if m == 'verre':
                ton = 3 if (qx + py) % 11 in (0, 1) and ton >= 1 else 2 if ton == 3 else 1
            px[qx, py] = rgba(palettes[m][ton])
    im = contour(im, K)
    if not ombre:
        return im
    fond = image(CASE, CASE)
    fpx = fond.load()
    for py in range(CASE):
        for qx in range(CASE):
            u, v = local(qx + 0.5 - ANCRE[0] - 2, (py + 0.5 - ANCRE[1] - 1) / KY)
            du, dv = max(0, abs(u) - (HL - 6)), max(0, abs(v) - (HW - 6))
            if abs(u) <= HL + 1 and abs(v) <= HW + 1 and math.hypot(du, dv) <= 7:
                fpx[qx, py] = (0, 0, 0, 64)
    fond.alpha_composite(im)
    return fond


def planche():
    sheet = image(CASE * len(DIRECTIONS), CASE)
    for k, d in enumerate(DIRECTIONS):
        sheet.alpha_composite(bus(d), (k * CASE, 0))
    sheet.save(os.path.join(ASSETS, 'ville_bus.png'), optimize=True)
    with open(os.path.join(ASSETS, 'ville_bus.json'), 'w') as f:
        json.dump({'image': 'ville_bus.png', 'frameWidth': CASE, 'frameHeight': CASE,
                   'anchor': {'x': ANCRE[0], 'y': ANCRE[1]}, 'directions': DIRECTIONS,
                   'longueur': 2 * HL, 'largeur': 2 * HW}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    lignes = image(CASE * len(DIRECTIONS), CASE * len(LIGNES))
    for r, c in enumerate(LIGNES):
        for k, d in enumerate(DIRECTIONS):
            lignes.alpha_composite(bus(d, couleur=c, panneau=False), (k * CASE, r * CASE))
    lignes.save(os.path.join(ASSETS, 'ville_bus_lignes.png'), optimize=True)
    return sheet


if __name__ == '__main__':
    planche()
