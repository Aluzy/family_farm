# Les voitures de la ville, vues en 3/4 de dessus (la vue de la carte : le sol écrasé de
# KY = 0,7, comme les bassins et la place de la fontaine, la hauteur de KZ = 0,75), dans les
# huit directions : de côté (droite, gauche), de face (avant : elle vient vers nous), de dos
# (arrière : elle s'éloigne vers le haut) et de trois quarts (avant_droite, avant_gauche,
# arriere_droite, arriere_gauche).
#
# Chaque image est le rendu au pixel d'une même voiture en volume (une caisse aux coins
# arrondis, un habitacle vitré, quatre roues), tournée sur elle-même : on lance un rayon par
# pixel, la première matière touchée donne la couleur, éclairée du haut à gauche et réduite
# à quatre tons. Puis le contour sombre et l'ombre au sol, comme les autres objets.
#
# Les images (CASE × CASE px) ont toutes le centre de la voiture, au sol, au pixel ANCRE :
# assets/ville_voitures.png (une rangée par couleur, une colonne par direction) et
# assets/ville_voitures.json (le nom de chaque case, « rouge_avant_droite »…), pour les faire
# rouler sur la carte. Les voitures garées de la carte (la couche « vehicules ») en sont tirées.
import json
import math
import os

from commun import ASSETS, K, contour, image, rgba, teinte

KY, KZ = 0.7, 0.75
CASE = 64
ANCRE = (32, 40)

COULEURS = {
    'rouge': (198, 60, 54),
    'bleue': (66, 114, 198),
    'blanche': (226, 228, 232),
    'marron': (142, 94, 62),
    'bordeaux': (128, 60, 72),
}
# le cap de l'avant de la voiture (en degrés, 0 : vers la droite, 90 : vers le bas de l'écran)
DIRECTIONS = {
    'droite': 0, 'avant_droite': 45, 'avant': 90, 'avant_gauche': 135,
    'gauche': 180, 'arriere_gauche': 225, 'arriere': 270, 'arriere_droite': 315,
}

# la voiture, en px : longueur 2 × HL, largeur 2 × HW
HL, HW = 29, 13
ROUES = 18          # l'essieu, à ±18 du centre
RR = 5.5            # le rayon des roues
CAISSE = (3, 13)    # le bas et le haut de la caisse
TOIT = 23           # le haut du toit

VERRE = [(28, 34, 46), (40, 50, 66), (62, 76, 98), (136, 158, 184)]
PNEU = [(26, 24, 28), (34, 32, 36), (46, 44, 50), (60, 58, 64)]
JANTE = [(96, 96, 104), (130, 130, 138), (160, 160, 168), (190, 190, 198)]
CHROME = [(108, 108, 116), (140, 140, 148), (172, 172, 180), (206, 206, 212)]
CALANDRE = [(30, 28, 34), (44, 42, 48), (58, 56, 62), (70, 68, 74)]
PHARE = [(214, 200, 140), (240, 226, 160), (250, 238, 180), (255, 250, 220)]
FEU = [(150, 26, 30), (196, 40, 40), (226, 64, 58), (246, 110, 96)]
PLAQUE = [(184, 184, 176), (214, 214, 206), (232, 232, 226), (244, 244, 240)]


def tons(c):
    return [teinte(c, 0.6), teinte(c, 0.8), c, teinte(c, 1.18)]


def habitacle(w):
    """Les bords de l'habitacle à la hauteur w : arrière, avant, demi-largeur."""
    t = (w - CAISSE[1]) / (TOIT - CAISSE[1])
    return -18 + 5 * t, 8 - 10 * t, 12 - 2.5 * t


def matiere(u, v, w):
    """La matière au point (u : vers l'avant, v : vers la droite de la voiture, w : vers le
    haut), ou None."""
    if w < 0 or w > TOIT:
        return None
    av = abs(v)
    # les roues : des cylindres d'axe v, un peu rentrés sous la caisse
    for e in (-ROUES, ROUES):
        d = math.hypot(u - e, w - RR)
        if d <= RR and HW - 5 <= av <= HW - 0.5:
            return 'jante' if d < 2.6 and av > HW - 1.6 else 'pneu'
    # les rétroviseurs
    if 5 <= u <= 7.5 and HW <= av <= HW + 2 and 12 <= w <= 14:
        return 'caisse'
    if w <= CAISSE[1]:
        if w < CAISSE[0]:
            return None
        # les passages de roue
        if av > HW - 6 and any(math.hypot(u - e, w - RR) < RR + 1.5 for e in (-ROUES, ROUES)):
            return None
        # le capot descend vers le nez, le coffre un peu vers l'arrière
        haut = CAISSE[1] - max(0, u - 21) * 0.4 - max(0, -23 - u) * 0.35
        if w > haut:
            return None
        # le plan : un rectangle aux coins arrondis, chanfreiné en haut
        retrait = max(0, w - (haut - 2))
        lu, lv = HL - retrait, HW - retrait
        r = 6
        du, dv = max(0, abs(u) - (lu - r)), max(0, av - (lv - r))
        if abs(u) > lu or av > lv or math.hypot(du, dv) > r:
            return None
        nez, cul = u > HL - 2, u < -HL + 2
        if nez or cul:
            if w < CAISSE[0] + 2.2:
                return 'chrome'
            if 7.5 <= av <= 11.5 and 8 <= w <= 10.5:
                return 'phare' if nez else 'feu'
            if nez and av < 6 and 5.5 <= w <= 8:
                return 'calandre'
            if cul and av < 3.5 and 5.5 <= w <= 7.5:
                return 'plaque'
        # la porte : un joint sur le flanc
        if av > HW - 1.5 and abs(u + 4) < 0.5 and 5 <= w <= 12:
            return 'calandre'
        return 'caisse'
    # l'habitacle : un tronc qui se resserre vers le toit
    ar, fr, dl = habitacle(w)
    if not (ar <= u <= fr and av <= dl):
        return None
    if w > TOIT - 1.2:
        return 'caisse'
    pres_avant, pres_arriere, pres_flanc = u > fr - 1.6, u < ar + 1.6, av > dl - 1.6
    if w < CAISSE[1] + 1.2:
        return 'caisse'
    if pres_flanc and (pres_avant or pres_arriere or abs(u + 4) < 1.2 or u < ar + 2):
        return 'caisse'           # les montants
    return 'verre'


def voiture(couleur, direction, ombre=True):
    """L'image CASE × CASE de la voiture, le centre au sol au pixel ANCRE."""
    palettes = {'caisse': tons(COULEURS[couleur]), 'verre': VERRE, 'pneu': PNEU, 'jante': JANTE,
                'chrome': CHROME, 'calandre': CALANDRE, 'phare': PHARE, 'feu': FEU, 'plaque': PLAQUE}
    a = math.radians(DIRECTIONS[direction])
    ca, sa = math.cos(a), math.sin(a)

    def local(x, y):
        return x * ca + y * sa, -x * sa + y * ca

    def plein(x, y, z):
        u, v = local(x, y)
        return matiere(u, v, z) is not None

    lum = (-0.45, -0.55, 0.7)
    n_l = math.sqrt(sum(c * c for c in lum))
    lum = tuple(c / n_l for c in lum)
    im = image(CASE, CASE)
    px = im.load()
    for py in range(CASE):
        for qx in range(CASE):
            x = qx + 0.5 - ANCRE[0]
            sy = py + 0.5 - ANCRE[1]
            z = TOIT + 0.5
            touche = None
            while z >= 0:
                y = (sy + KZ * z) / KY
                u, v = local(x, y)
                m = matiere(u, v, z)
                if m:
                    touche = (x, y, z, m)
                    break
                z -= 0.2
            if not touche:
                continue
            x, y, z, m = touche
            # la normale : vers où la matière s'arrête
            nx = plein(x - 1, y, z) - plein(x + 1, y, z)
            ny = plein(x, y - 1, z) - plein(x, y + 1, z)
            nz = plein(x, y, z - 1) - plein(x, y, z + 1)
            n = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            b = (nx * lum[0] + ny * lum[1] + nz * lum[2]) / n
            if nx == ny == 0 and nz == 0:
                b = 0.5
            ton = 3 if b > 0.72 else 2 if b > 0.3 else 1 if b > -0.15 else 0
            if m == 'verre':
                # un reflet en biais sur les vitres
                ton = 3 if (qx + py) % 11 in (0, 1) and ton >= 1 else 2 if ton == 3 else 1
            px[qx, py] = rgba(palettes[m][ton])
    im = contour(im, K)
    if not ombre:
        return im
    fond = image(CASE, CASE)
    fpx = fond.load()
    for py in range(CASE):
        for qx in range(CASE):
            x = qx + 0.5 - ANCRE[0] - 2
            y = (py + 0.5 - ANCRE[1] - 1) / KY
            u, v = local(x, y)
            du, dv = max(0, abs(u) - (HL - 6)), max(0, abs(v) - (HW - 6))
            if abs(u) <= HL + 1 and abs(v) <= HW + 1 and math.hypot(du, dv) <= 7:
                fpx[qx, py] = (0, 0, 0, 64)
    fond.alpha_composite(im)
    return fond


def planche():
    """assets/ville_voitures.png et .json : une rangée par couleur, une colonne par direction."""
    noms = []
    sheet = image(CASE * len(DIRECTIONS), CASE * len(COULEURS))
    for r, c in enumerate(COULEURS):
        for k, d in enumerate(DIRECTIONS):
            sheet.alpha_composite(voiture(c, d), (k * CASE, r * CASE))
            noms.append(f'{c}_{d}')
    sheet.save(os.path.join(ASSETS, 'ville_voitures.png'), optimize=True)
    meta = {
        'image': 'ville_voitures.png', 'frameWidth': CASE, 'frameHeight': CASE,
        'anchor': {'x': ANCRE[0], 'y': ANCRE[1]},
        'couleurs': list(COULEURS), 'directions': {d: a for d, a in DIRECTIONS.items()},
        'frames': noms,
    }
    with open(os.path.join(ASSETS, 'ville_voitures.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return sheet


if __name__ == '__main__':
    planche()
