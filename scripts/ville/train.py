# Le train de la gare (la ville, la montagne, la plage), vu en 3/4 de dessus comme les voitures
# et le bus (scripts/ville/voitures.py : la même vue, la même lumière, le même rendu au pixel par
# lancer de rayons). Les voies sont nord-sud : on voit le toit de chaque voiture, son épaule
# arrondie aux couleurs du train (le bas bleu, la bande blanche des vitres) et sa face sud.
#
# Une rame réversible, comme un autorail : une cabine à chaque bout, une voiture au milieu ; elle
# repart dans l'autre sens sans manœuvre (la montagne et la plage sont des terminus). Trois
# images : la cabine du nord (le nez vers le haut), la voiture, la cabine du sud (le nez vers le
# bas : on voit son pare-brise et sa face jaune).
#
#   python3 scripts/ville/train.py     écrit assets/ville_train.png (3 images de CASE_W × CASE_H,
#                                      de haut en bas de la rame) et assets/ville_train.json
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, K, contour, image, rgba, teinte  # noqa: E402
from voitures import KY, KZ, PHARE, VERRE  # noqa: E402

CASE_W, CASE_H = 48, 112
ANCRE = (24, 66)           # le centre de la voiture, au sol
HL, HW = 52, 14            # demi-longueur, demi-largeur (px, au sol)
TOIT = 34
EPAULE = 9                 # le rayon de l'épaule du toit
JEU = 3                    # l'écart (au sol) entre deux voitures
BLEU = (52, 92, 170)
BLANC = (226, 230, 234)
GRIS = (150, 154, 164)
JAUNE = (240, 196, 50)

PIECES = [('cabine_nord', 270, True), ('voiture', 90, False), ('cabine_sud', 90, True)]


def tons(c):
    return [teinte(c, 0.6), teinte(c, 0.8), c, teinte(c, 1.16)]


def matiere(u, v, w, nez):
    """La matière au point (u : vers l'avant, v : de côté, w : vers le haut), ou None. nez : une
    cabine, son nez vers l'avant (u > 0)."""
    av = abs(v)
    if w < 0 or w > TOIT + 5:
        return None
    if w > TOIT:
        # sur le toit : les blocs de climatisation, le pantographe des cabines
        if w <= TOIT + 2.5:
            blocs = ((-34, -16),) if nez else ((-30, -12), (12, 30))
            if any(a <= u <= b for a, b in blocs) and av <= 8:
                return 'clim'
        if nez and 4 <= w - TOIT <= 5 and -2 <= u <= 14 and av <= 9 and (av >= 8 or abs(u - 6) >= 7 or abs(u - 6) <= 0.6):
            return 'panto'
        if nez and w - TOIT < 4 and abs(u - 6) <= 0.8 and av <= 1:
            return 'panto'
        return None
    if w < 5:
        # le châssis et les bogies, rentrés sous la caisse
        return 'noir' if av <= HW - 3 and abs(u) <= HL - 4 else None
    retrait = 0
    if w > TOIT - EPAULE:
        d = (w - (TOIT - EPAULE)) / EPAULE
        retrait = EPAULE * (1 - math.sqrt(max(0, 1 - d * d)))
    lv = HW - retrait
    if av > lv:
        return None
    avant = HL - (max(0, w - 12) * 0.45 if nez else 0)      # le nez se couche vers le toit
    if u > avant or u < -HL:
        return None
    r = 6 if nez else 2
    if u > 0:
        du, dv = max(0, u - (avant - r)), max(0, av - (lv - r))
        if math.hypot(du, dv) > r:
            return None
    if nez and u > avant - 1.5 and w < TOIT - 3:
        if 20 <= w and av < lv - 2:
            return 'verre'
        if 9 <= w <= 11.5 and 6 <= av <= 10:
            return 'phare'
        return 'jaune'
    bout = u < -HL + 1.5 or (not nez and u > HL - 1.5)
    if bout and av < 7 and 6 <= w <= 30:
        return 'noir'                       # le soufflet entre deux voitures
    if w < 8:
        return 'noir'
    if w < 16:
        return 'bleu'
    if w < TOIT - EPAULE:
        return 'blanc'
    # vu de dessus : le toit gris, l'épaule aux couleurs du train (une bande blanche, la bande
    # des vitres hautes, le bord bleu), le nez des cabines jaune
    if nez and u > avant - 14:
        return 'jaune'
    if av <= 5.5:
        return 'gris'
    if av <= 8:
        return 'blanc'
    if av <= 10.5:
        return 'verre' if (u + 200) % 14 > 3 else 'bleu'
    return 'bleu'


def piece(cap, nez, ombre=True):
    palettes = {'bleu': tons(BLEU), 'blanc': tons(BLANC), 'gris': tons(GRIS), 'jaune': tons(JAUNE), 'verre': VERRE,
                'phare': PHARE, 'clim': tons((184, 188, 196)), 'panto': [(30, 30, 36), (44, 44, 50), (60, 60, 66), (80, 80, 86)],
                'noir': [(26, 24, 28), (34, 32, 38), (44, 42, 48), (58, 56, 62)]}
    a = math.radians(cap)
    ca, sa = math.cos(a), math.sin(a)
    local = lambda x, y: (x * ca + y * sa, -x * sa + y * ca)
    plein = lambda x, y, z: matiere(*local(x, y), z, nez) is not None
    lum = (-0.45, -0.55, 0.7)
    n_l = math.sqrt(sum(c * c for c in lum))
    lum = tuple(c / n_l for c in lum)
    im = image(CASE_W, CASE_H)
    px = im.load()
    for py in range(CASE_H):
        for qx in range(CASE_W):
            x = qx + 0.5 - ANCRE[0]
            sy = py + 0.5 - ANCRE[1]
            z = TOIT + 5.5
            touche = None
            while z >= 0:
                y = (sy + KZ * z) / KY
                m = matiere(*local(x, y), z, nez)
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
    fond = image(CASE_W, CASE_H)
    fpx = fond.load()
    for py in range(CASE_H):
        for qx in range(CASE_W):
            u, v = local(qx + 0.5 - ANCRE[0] - 2, (py + 0.5 - ANCRE[1] - 1) / KY)
            if abs(u) <= HL and abs(v) <= HW + 1:
                fpx[qx, py] = (0, 0, 0, 64)
    fond.alpha_composite(im)
    return fond


def planche():
    sheet = image(CASE_W * len(PIECES), CASE_H)
    for k, (nom, cap, nez) in enumerate(PIECES):
        sheet.alpha_composite(piece(cap, nez), (k * CASE_W, 0))
    sheet.save(os.path.join(ASSETS, 'ville_train.png'), optimize=True)
    with open(os.path.join(ASSETS, 'ville_train.json'), 'w') as f:
        json.dump({'image': 'ville_train.png', 'frameWidth': CASE_W, 'frameHeight': CASE_H,
                   'anchor': {'x': ANCRE[0], 'y': ANCRE[1]}, 'pieces': [p[0] for p in PIECES],
                   # d'un centre de voiture au suivant, à l'écran (px)
                   'pas': round((2 * HL + JEU) * KY), 'longueur': round(2 * HL * KY)}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return sheet


if __name__ == '__main__':
    planche()
