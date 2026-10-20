# Le camion de la logistique (docs/plan-ville.md, étape 5c ; ECONOMIE.CAMIONS), vu en 3/4 de
# dessus comme les voitures et le bus (scripts/ville/voitures.py et bus.py : la même vue, la
# même lumière, le même rendu au pixel par lancer de rayons), dans les huit directions : une
# cabine bleue à l'avant (son pare-brise, ses phares), une haute caisse blanche à l'arrière
# (une bande bleue sur les flancs, les portes du hayon), quatre roues.
#
#   python3 scripts/ville/camion.py   écrit assets/ville_camion.png (8 images de 112 × 112, dans
#                                     l'ordre de voitures.DIRECTIONS) et assets/ville_camion.json
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, K, contour, image, rgba, teinte  # noqa: E402
from voitures import CHROME, FEU, JANTE, KY, KZ, PHARE, PNEU, VERRE, DIRECTIONS  # noqa: E402

CASE = 112
ANCRE = (56, 70)
HL, HW = 40, 14            # demi-longueur, demi-largeur (px)
ROUES = (-26, 26)
RR = 6
CABINE = (16, 24)          # la cabine : de u = 16 au nez, haute de 24
CAISSE = (-HL, 13, 34)     # la caisse : de l'arrière à u = 13, haute de 34
BLEU = (52, 96, 170)
BLANC = (226, 228, 222)


def tons(c):
    return [teinte(c, 0.6), teinte(c, 0.8), c, teinte(c, 1.12)]


def arrondi(u, v, lu, lv, r):
    du, dv = max(0, abs(u) - (lu - r)), max(0, abs(v) - (lv - r))
    return abs(u) <= lu and abs(v) <= lv and math.hypot(du, dv) <= r


def matiere(u, v, w):
    """La matière au point (u : vers l'avant, v : vers la droite, w : vers le haut), ou None."""
    av = abs(v)
    if w < 0 or w > CAISSE[2]:
        return None
    for e in ROUES:
        d = math.hypot(u - e, w - RR)
        if d <= RR and HW - 5 <= av <= HW - 0.5:
            return 'jante' if d < 2.6 and av > HW - 1.6 else 'pneu'
    if av > HW - 6 and any(math.hypot(u - e, w - RR) < RR + 1.5 for e in ROUES):
        return None
    if w < 3:
        return None
    if w < 6:
        return 'noir' if arrondi(u, v, HL, HW, 4) else None    # le châssis
    # la caisse, haute et blanche
    if CAISSE[0] <= u <= CAISSE[1] and w <= CAISSE[2]:
        if not arrondi(u - (CAISSE[0] + CAISSE[1]) / 2, v, (CAISSE[1] - CAISSE[0]) / 2, HW, 2):
            return None
        if av > HW - 1.2 and 14 <= w <= 20:
            return 'bleu'                                       # la bande des flancs
        if u < CAISSE[0] + 1.2:
            if av < 0.8 or (8 <= w <= 9):
                return 'noir'                                   # les portes du hayon
            if 9 <= w <= 11 and 9 <= av <= 12:
                return 'feu'
        return 'caisse'
    # la cabine, à l'avant
    if CAISSE[1] < u <= HL and w <= CABINE[1]:
        retrait = max(0, w - (CABINE[1] - 4)) * 1.0
        if not arrondi(u - (CABINE[0] + HL) / 2, v, (HL - CABINE[0]) / 2 + 1 - retrait, HW - retrait, 4):
            return None
        if u > HL - 2:
            if 14 <= w <= 22 and av < HW - 2:
                return 'verre'                                  # le pare-brise
            if 8 <= w <= 11 and 8 <= av <= 11:
                return 'phare'
            if 6 <= w <= 11 and av < 5:
                return 'noir'                                   # la calandre
        if av > HW - 1.5 and 14 <= w <= 21 and u > CABINE[0] + 4:
            return 'verre'                                      # les vitres des portières
        return 'cabine'
    return None


def camion(direction, ombre=True):
    palettes = {'caisse': tons(BLANC), 'cabine': tons(BLEU), 'bleu': tons(BLEU), 'verre': VERRE, 'pneu': PNEU,
                'jante': JANTE, 'chrome': CHROME, 'phare': PHARE, 'feu': FEU,
                'noir': [(26, 24, 28), (34, 32, 38), (44, 42, 48), (58, 56, 62)]}
    a = math.radians(DIRECTIONS[direction])
    ca, sa = math.cos(a), math.sin(a)
    local = lambda x, y: (x * ca + y * sa, -x * sa + y * ca)
    plein = lambda x, y, z: matiere(*local(x, y), z) is not None
    lum = (-0.45, -0.55, 0.7)
    n_l = math.sqrt(sum(c * c for c in lum))
    lum = tuple(c / n_l for c in lum)
    im = image(CASE, CASE)
    px = im.load()
    for py in range(CASE):
        for qx in range(CASE):
            x = qx + 0.5 - ANCRE[0]
            sy = py + 0.5 - ANCRE[1]
            z = CAISSE[2] + 0.5
            touche = None
            while z >= 0:
                y = (sy + KZ * z) / KY
                m = matiere(*local(x, y), z)
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
        sheet.alpha_composite(camion(d), (k * CASE, 0))
    sheet.save(os.path.join(ASSETS, 'ville_camion.png'), optimize=True)
    with open(os.path.join(ASSETS, 'ville_camion.json'), 'w') as f:
        json.dump({'image': 'ville_camion.png', 'frameWidth': CASE, 'frameHeight': CASE,
                   'anchor': {'x': ANCRE[0], 'y': ANCRE[1]}, 'directions': DIRECTIONS,
                   'longueur': 2 * HL, 'largeur': 2 * HW}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return sheet


if __name__ == '__main__':
    planche()
