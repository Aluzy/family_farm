# Le nouveau dessin des personnages de la carte, à l'essai sur perso_01 : une grosse tête
# (10 px de large, 11 de haut avec le contour), de grands yeux (le blanc, la pupille), une
# frange, une salopette à bavette et ses bretelles, un contour brun. Mêmes cases, même taille
# (16 × 32, les pieds en bas) et mêmes positions des mains et des outils que
# scripts/personnage/fermier.py (ses frames() avec la figure d'ici) : rien ne change pour la carte.
#
#   python3 scripts/personnage/chibi.py            écrit assets/personnages/perso_01.png
#   python3 scripts/personnage/chibi.py --apercu   écrit aussi apercu_chibi.png (agrandi)
#
# Les têtes sont dessinées à la main (TETES, une grille de 12 × 11 par vue, posée en x 2,
# y 7) ; le corps suit le modèle (la bavette, les poches, la couture entre les jambes).
# fermier.py n'écrit plus les planches de ESSAIS.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402
import fermier as F  # noqa: E402
from fermier import Canvas, arm, legs_assis  # noqa: E402

TX, TY = 2, 7         # le coin haut-gauche de la tête

# K contour ; H cheveux, D leur ombre, M une mèche ; S peau, L peau dans l'ombre, B joue,
# J bouche, N cou ; W blanc de l'œil, P pupille.
TETES = {
    'bas': [
        '...KKKKKK...',
        '..KHHHHHDK..',
        '.KHHHHHHHDK.',
        '.KHHHHHLHDK.',
        'KHHMHHLMHHDK',
        'KHHWPHLPWLDK',
        'KHHWPSSPWSDK',
        'KHHSSSSSBSDK',
        'KHHSSJJJSHDK',
        '.KHDSSSSDHK.',
        '..KDDNNDDK..',
    ],
    'haut': [
        '...KKKKKK...',
        '..KHHHHHDK..',
        '.KHHHHHHHDK.',
        '.KHHMHHMHDK.',
        'KHHHMHHMHHDK',
        'KHHMHHHHMHDK',
        'KHHMHHHHMHDK',
        'KHMHHHMHHMDK',
        'KHMHHHMHHMDK',
        '.KDDHHHHDDK.',
        '..KDDNNDDK..',
    ],
    'cote': [
        '...KKKKKK...',
        '..KHHHHHHK..',
        '.KHHHHHHHHK.',
        '.KHHMHHHHMHK',
        'KDHMHHHHMLHK',
        'KDHHHHHLSWPK',
        'KDHMHSHSSWPK',
        'KDHMHLSSSSSK',
        'KDHHHSSSSJK.',
        '.KDHHSSSSSK.',
        '..KDDNNNK...',
    ],
}
LETTRES = {'K': 'K', 'H': 'hr', 'D': 'hr2', 'M': 'hrm', 'S': 'sk', 'L': 'skl', 'B': 'skb', 'J': 'sk2',
           'N': 'skn', 'W': 'wh', 'P': 'pu'}


def mul(c, k):
    return tuple(max(0, min(255, round(v * f))) for v, f in zip(c, k))


def mix(a, b, t):
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def couleurs():
    """Les nuances du modèle, tirées des couleurs du personnage (fermier.C)."""
    C = F.C
    C.update({
        'hrm': mix(C['hr'], C['hr2'], 0.6),
        'skl': mul(C['sk'], (0.983, 0.918, 0.838)), 'skb': mul(C['sk'], (0.99, 0.96, 0.92)),
        'skn': mul(C['sk'], (0.958, 0.796, 0.594)),
        'wh': (255, 255, 255), 'pu': (82, 68, 56),
        'sh3': mul(C['sh'], (0.914, 0.974, 0.822)), 'sh4': mul(C['sh'], (0.87, 0.96, 0.733)),
        'ov3': mul(C['ov'], (0.94, 0.94, 0.94)), 'ov4': mul(C['ov'], (0.875, 0.875, 0.87)),
        'ov5': mul(C['ov2'], (0.73, 0.73, 0.73)),
        'bt3': mul(C['bt'], (0.88, 0.88, 0.88)), 'pin': (204, 88, 206),
    })


def tete(cv, vue, b):
    """La tête (et le cou) ; rend les cases de la tête."""
    cases = set()
    for j, rang in enumerate(TETES[vue]):
        for i, ch in enumerate(rang):
            if ch != '.':
                cv.put(TX + i, TY + j + b, LETTRES[ch])
                cases.add((TX + i, TY + j + b))
    return cases


def torse(cv, vue, b):
    """La chemise, la bavette et la salopette, de l'épaule (y 18) à la taille (y 24)."""
    if vue == 'cote':
        cv.rect(6, 18 + b, 10, 20 + b, 'sh')
        cv.rect(9, 19 + b, 10, 20 + b, 'ov')            # la bavette, devant
        cv.put(8, 19 + b, 'ov2')                        # la bretelle
        cv.put(8, 18 + b, 'ov2')
        cv.rect(6, 21 + b, 10, 24 + b, 'ov')
        cv.put(6, 21 + b, 'ov2')
        cv.put(9, 22 + b, 'ov3')                        # la poche
        cv.put(10, 23 + b, 'ov4')
        return
    if vue == 'bas':
        for x, c in zip(range(5, 11), ('sh', 'sh', 'sk', 'sk', 'hr', 'sh3')):
            cv.put(x, 18 + b, c)                        # le col ouvert, une mèche sur l'épaule
        for x, c in zip(range(5, 11), ('sh', 'ov2', 'ov', 'ov', 'pin', 'sh')):
            cv.put(x, 19 + b, c)                        # la bretelle, la bavette, le bouton
        for x, c in zip(range(5, 11), ('sh', 'ov', 'ov', 'ov', 'hr', 'sh')):
            cv.put(x, 20 + b, c)
        cv.rect(5, 21 + b, 10, 24 + b, 'ov')
        cv.put(6, 22 + b, 'ov3')                        # les poches
        cv.put(9, 22 + b, 'ov3')
        cv.put(5, 23 + b, 'ov4')
        cv.put(10, 23 + b, 'ov4')
        return
    cv.rect(5, 18 + b, 10, 20 + b, 'sh')                # de dos : les bretelles croisées
    for (x, y) in ((6, 18), (9, 18), (7, 19), (8, 19), (6, 20), (9, 20)):
        cv.put(x, y + b, 'ov2')
    cv.rect(5, 21 + b, 10, 24 + b, 'ov')
    cv.put(10, 21 + b, 'ov3')
    cv.put(10, 22 + b, 'ov4')


def jambes(cv, vue, walk, squat):
    """Les jambes (la couture entre les deux) et les chaussures ; walk : 0..3, None immobile."""
    if vue == 'cote':
        spread = {None: (0, 0), 0: (-2, 2), 1: (0, 0), 2: (2, -2), 3: (0, 0)}[walk]
        for (x, ombre) in ((7 + spread[0], True), (7 + spread[1], False)):
            cv.rect(x, 25 + squat, x + 1, 28, 'ov2' if ombre else 'ov')
            cv.rect(x, 29, x + 2, 30, 'bt3' if ombre else 'bt')
            if not ombre:
                cv.put(x + 2, 30, 'bt2')
        return
    lift = {None: (0, 0), 0: (0, 1), 1: (0, 0), 2: (1, 0), 3: (0, 0)}[walk]
    for i, x in enumerate((5, 8)):
        up = lift[i]
        cv.rect(x, 25 + squat, x + 2, 28 - up, 'ov' if i == 0 else 'ov2')
        cv.rect(x, 29 - up, x + 2, 30 - up, 'bt')
        cv.put(x + 1 + (i == 0), 29 - up, 'bt3' if i == 0 else 'bt')
    # la couture : le creux entre les deux jambes
    for y in range(26 + squat, 29 - max(lift)):
        cv.put(7, y, 'ov3')
        cv.put(8, y, 'ov5')
    cv.put(7, 29 - lift[0], 'bt3')
    cv.put(8, 29 - lift[1], 'bt2')
    cv.put(8, 30 - lift[1], 'bt2')
    cv.put(7, 30 - lift[0], 'bt3')


def bras(cv, sx, sy, hx, hy, manche, tete_cases):
    """Un bras par-dessus le reste ; sur la tête, un contour le détache des cheveux."""
    couche = Canvas()
    arm(couche, sx, sy, hx, hy, manche)
    pts = [(x, y) for y in range(F.H) for x in range(F.W) if couche.px[y][x] is not None]
    for (x, y) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in tete_cases and couche.px[ny][nx] is None:
                cv.put(nx, ny, 'K')
    for (x, y) in pts:
        cv.put(x, y, couche.px[y][x])


def figure(vue, walk=None, b=0, squat=0, hands=None, before=None, after=None, sit=False):
    """Comme fermier.figure (mêmes paramètres, mêmes mains), avec le nouveau dessin."""
    cv = Canvas()
    if before:
        before(cv)
    if vue == 'cote':
        far = hands[1] if hands else (7, 22 + b)
        arm(cv, 7, 19 + b + squat, far[0], far[1], 'sh2')
    if sit:
        legs_assis(cv, vue)
    else:
        jambes(cv, vue, walk, squat)
    torse(cv, vue, b + squat)
    tc = tete(cv, vue, b + squat)
    if vue == 'cote':
        near = hands[0] if hands else (8, 22 + b)
        bras(cv, 8, 19 + b + squat, near[0], near[1], 'sh', tc)
    else:
        lh, rh = hands or ((3, 22 + b), (11, 22 + b))
        bras(cv, 4, 19 + b + squat, lh[0], lh[1], 'sh', tc)
        bras(cv, 11, 19 + b + squat, rh[0], rh[1], 'sh', tc)
        if not hands:
            cv.put(12, 20 + b + squat, 'sh3')           # le bras droit, dans l'ombre
            cv.put(12, 21 + b + squat, 'sh4')
            cv.put(12, 22 + b + squat, 'skl')
            cv.put(12, 23 + b + squat, 'skl')
    if after:
        after(cv)
    F.motif(cv)
    cv.outline()
    return cv


def main():
    nom, d = catalogue.personnages()[0]
    F.dessiner(F.variante_catalogue(d))
    couleurs()
    cases = F.frames(figure)
    noms = list(cases)
    rangs = (len(noms) + F.COLS - 1) // F.COLS
    sheet = Image.new('RGBA', (F.COLS * F.W, rangs * F.H), (0, 0, 0, 0))
    for i, n in enumerate(noms):
        sheet.paste(F.render(cases[n]), ((i % F.COLS) * F.W, (i // F.COLS) * F.H))
    sheet.save(os.path.join(F.ASSETS, 'personnages', f'{nom}.png'))
    print(f'assets/personnages/{nom}.png : {len(noms)} cases (nouveau dessin, à l\'essai)')
    if '--apercu' in sys.argv:
        F.apercu(sheet, 'apercu_chibi.png', 6, (126, 170, 92))


if __name__ == '__main__':
    main()
