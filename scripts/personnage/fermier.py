# Le personnage de la carte (version provisoire), une planche assets/fermier.png de cases
# 16 × 32 px, et assets/fermier.json qui donne le nom de chaque case (dans l'ordre de la
# planche, 8 cases par rangée).
#
# Trois vues : « bas » (de face), « haut » (de dos), « cote » (de profil, tourné vers la
# droite ; la carte le retourne pour la gauche). Il porte un chapeau de paille, une chemise
# rouge et une salopette bleue. Lumière en haut à gauche, contour sombre ajouté à la fin.
#
# Cases :
#   idle_<vue>_0..1          debout, il respire
#   marche_<vue>_0..3        marche (contact, passage, contact de l'autre pied, passage)
#   houe_<vue>_0..3          labourer : prêt, houe levée, élan, coup au sol
#   plante_<vue>_0..2        planter ou récolter : la main à la poche, accroupi, la main au sol
#   arrose_<vue>_0..2        arroser : arrosoir droit, penché, penché avec les gouttes
#   panier_<vue>_0..3        marche avec le panier d'œufs
#   cuisine_0..3             de dos, il remue la marmite
#   frigo_0..2               de dos, il ouvre le réfrigérateur et se penche
#   ramasse_0..2             de profil, il ramasse un œuf dans la paille
#
#   python3 scripts/personnage/fermier.py            écrit les images
#   python3 scripts/personnage/fermier.py --apercu   écrit aussi apercu_fermier.png (agrandi)
import json
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
W, H = 16, 32
COLS = 8

C = {
    'K': (43, 29, 20),                                   # contour
    'sk': (242, 196, 141), 'sk2': (214, 156, 104),       # peau
    'hr': (107, 66, 38), 'hr2': (78, 46, 26),            # cheveux
    'st': (232, 194, 90), 'st2': (184, 138, 46),         # paille du chapeau
    'bd': (163, 50, 42),                                 # ruban du chapeau
    'sh': (200, 85, 61), 'sh2': (149, 57, 42),           # chemise
    'ov': (63, 111, 168), 'ov2': (44, 79, 124),          # salopette
    'bt': (90, 58, 34), 'bt2': (62, 40, 24),             # bottes
    'ey': (40, 26, 20),                                  # yeux
    'wd': (154, 106, 60), 'mt': (154, 163, 173),         # bois et fer de la houe
    'wc': (111, 143, 163), 'wc2': (80, 106, 122),        # arrosoir
    'dr': (120, 190, 235),                               # gouttes
    'bk': (176, 121, 62), 'bk2': (130, 86, 42),          # panier
    'eg': (251, 243, 224),                               # œuf
    'sd': (120, 84, 40),                                 # graine
}


class Canvas:
    def __init__(self):
        self.px = [[None] * W for _ in range(H)]

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n)
            y = round(y0 + (y1 - y0) * i / n)
            for dx in range(w):
                self.put(x + dx, y, c)

    def outline(self):
        out = [row[:] for row in self.px]
        for y in range(H):
            for x in range(W):
                if self.px[y][x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.px[ny][nx] not in (None, 'K', 'dr', 'sd'):
                        out[y][x] = 'K'
                        break
        self.px = out


def arm(cv, sx, sy, hx, hy, sleeve='sh'):
    """Bras de l'épaule (sx, sy) à la main (hx, hy) : manche de 2 px, main en peau."""
    cv.line(sx, sy, hx, hy, sleeve, 2)
    cv.rect(hx, hy, hx + 1, hy + 1, 'sk')


def legs(cv, vue, walk, squat):
    """Jambes et bottes. walk : 0..3 (cycle), None : immobile. squat : accroupi (jambes pliées)."""
    if vue == 'cote':
        # jambe arrière (plus sombre) et jambe avant, écartées au contact
        spread = {None: (0, 0), 0: (-2, 2), 1: (0, 0), 2: (2, -2), 3: (0, 0)}[walk]
        top = 25 + squat
        for (x, shade) in ((7 + spread[0], 2), (7 + spread[1], 1)):
            ov = 'ov2' if shade == 2 else 'ov'
            bt = 'bt2' if shade == 2 else 'bt'
            cv.rect(x, top, x + 1, 28, ov)
            cv.rect(x, 29, x + 2, 30, bt)
        return
    lift = {None: (0, 0), 0: (0, 1), 1: (0, 0), 2: (1, 0), 3: (0, 0)}[walk]
    for i, x in enumerate((5, 8)):
        up = lift[i]
        cv.rect(x, 25 + squat, x + 2, 28 - up, 'ov' if i == 0 else 'ov2')
        cv.rect(x, 29 - up, x + 2, 30 - up, 'bt')


def body(cv, vue, b):
    """Torse, tête et chapeau ; b : décalage vertical (respiration, pas, accroupi)."""
    if vue == 'cote':
        cv.rect(6, 17 + b, 10, 19 + b, 'sh')
        cv.rect(6, 20 + b, 10, 24 + b, 'ov')
        cv.rect(9, 18 + b, 10, 19 + b, 'ov')            # bavette
        cv.put(6, 20 + b, 'ov2')
        cv.rect(6, 11 + b, 10, 16 + b, 'sk')            # tête
        cv.put(11, 14 + b, 'sk')                        # nez
        cv.rect(5, 11 + b, 7, 14 + b, 'hr')             # cheveux (nuque)
        cv.put(7, 15 + b, 'hr2')
        cv.put(9, 13 + b, 'ey')
        cv.put(8, 15 + b, 'sk2')
        cv.rect(5, 6 + b, 10, 9 + b, 'st')              # chapeau
        cv.rect(5, 9 + b, 10, 9 + b, 'bd')
        cv.rect(3, 10 + b, 13, 10 + b, 'st2')
        cv.rect(6, 6 + b, 8, 6 + b, 'st')
        return
    cv.rect(5, 17 + b, 10, 19 + b, 'sh')
    cv.rect(5, 20 + b, 10, 24 + b, 'ov')
    if vue == 'bas':
        cv.rect(6, 18 + b, 9, 19 + b, 'ov')             # bavette
        cv.put(6, 18 + b, 'ov2')
        cv.put(9, 18 + b, 'ov2')
        cv.rect(5, 11 + b, 10, 16 + b, 'sk')
        cv.rect(5, 11 + b, 10, 11 + b, 'hr')
        cv.put(5, 12 + b, 'hr')
        cv.put(10, 12 + b, 'hr')
        cv.put(6, 13 + b, 'ey')
        cv.put(9, 13 + b, 'ey')
        cv.rect(6, 15 + b, 9, 15 + b, 'sk2')
    else:                                               # de dos : bretelles et cheveux
        cv.put(6, 17 + b, 'ov')
        cv.put(9, 17 + b, 'ov')
        cv.rect(6, 18 + b, 6, 19 + b, 'ov')
        cv.rect(9, 18 + b, 9, 19 + b, 'ov')
        cv.rect(5, 11 + b, 10, 15 + b, 'hr')
        cv.rect(6, 14 + b, 9, 15 + b, 'hr2')
        cv.rect(6, 16 + b, 9, 16 + b, 'sk2')
    cv.rect(5, 6 + b, 10, 9 + b, 'st')
    cv.rect(5, 9 + b, 10, 9 + b, 'bd')
    cv.rect(3, 10 + b, 12, 10 + b, 'st2')
    cv.rect(5, 6 + b, 7, 6 + b, 'st')


def figure(vue, walk=None, b=0, squat=0, hands=None, before=None, after=None):
    """Un personnage complet. hands : positions des mains (gauche, droite) ou (main avant,
    main arrière) de profil ; before / after : dessins sous et sur le corps (outils)."""
    cv = Canvas()
    if before:
        before(cv)
    if vue == 'cote':
        far = hands[1] if hands else (7, 23 + b)
        arm(cv, 7, 18 + b, far[0], far[1], 'sh2')      # bras arrière, dans l'ombre
    legs(cv, vue, walk, squat)
    body(cv, vue, b + squat)
    if vue == 'cote':
        near = hands[0] if hands else (8, 23 + b)
        arm(cv, 8, 18 + b + squat, near[0], near[1])
    else:
        lh, rh = hands or ((3, 22 + b), (11, 22 + b))
        arm(cv, 3, 18 + b + squat, lh[0], lh[1])
        arm(cv, 11, 18 + b + squat, rh[0], rh[1])
    if after:
        after(cv)
    cv.outline()
    return cv


# ---------- outils ----------

def hoe(x0, y0, x1, y1, blade):
    def draw(cv):
        cv.line(x0, y0, x1, y1, 'wd')
        for (x, y) in blade:
            cv.put(x, y, 'mt')
    return draw


def can(x, y, tilt, drops):
    def draw(cv):
        cv.rect(x, y, x + 2, y + 2, 'wc')
        cv.rect(x, y + 2, x + 2, y + 2, 'wc2')
        sx, sy = (x + 3, y) if tilt == 0 else (x + 3, y + 2)
        cv.line(x + 3, y + 1, sx + 1, sy - 1 if tilt == 0 else sy + 1, 'wc2')
        if drops:
            for (dx, dy) in ((5, 5), (4, 7), (5, 9)):
                cv.put(x + dx, y + dy, 'dr')
    return draw


def basket(x, y, eggs=2):
    def draw(cv):
        cv.rect(x, y + 1, x + 3, y + 3, 'bk')
        cv.rect(x, y + 3, x + 3, y + 3, 'bk2')
        cv.line(x, y + 1, x + 1, y - 1, 'bk2')
        cv.line(x + 3, y + 1, x + 2, y - 1, 'bk2')
        for i in range(eggs):
            cv.put(x + 1 + i, y, 'eg')
    return draw


def frames():
    F = {}
    for vue in ('bas', 'haut', 'cote'):
        # debout : il respire (le haut du corps descend d'un pixel)
        F[f'idle_{vue}_0'] = figure(vue)
        F[f'idle_{vue}_1'] = figure(vue, b=1)
        for k in range(4):
            F[f'marche_{vue}_{k}'] = figure(vue, walk=k, b=-1 if k in (1, 3) else 0,
                                            hands=None if vue != 'cote' else ((9 - (k == 0) * 2 + (k == 2) * 2, 22), (7 + (k == 0) * 2 - (k == 2) * 2, 22)))
    # labourer
    F['houe_cote_0'] = figure('cote', hands=((10, 20), (9, 21)), after=hoe(11, 21, 5, 9, [(4, 9), (4, 10), (5, 8)]))
    F['houe_cote_1'] = figure('cote', b=-1, hands=((9, 11), (8, 12)), after=hoe(9, 12, 3, 4, [(2, 4), (2, 5), (3, 3)]))
    F['houe_cote_2'] = figure('cote', hands=((11, 15), (10, 16)), after=hoe(11, 15, 15, 8, [(15, 7), (14, 7), (15, 9)]))
    F['houe_cote_3'] = figure('cote', squat=1, hands=((11, 21), (10, 22)), after=hoe(11, 21, 14, 28, [(14, 29), (15, 29), (13, 30)]))
    F['houe_bas_0'] = figure('bas', hands=((6, 21), (9, 21)), before=hoe(8, 21, 12, 9, [(12, 8), (13, 8), (12, 7)]))
    F['houe_bas_1'] = figure('bas', b=-1, hands=((6, 8), (9, 8)), after=hoe(8, 8, 8, 1, [(7, 1), (8, 0), (9, 1)]))
    F['houe_bas_2'] = figure('bas', hands=((6, 15), (9, 15)), after=hoe(8, 15, 8, 6, [(7, 5), (8, 5), (9, 5)]))
    F['houe_bas_3'] = figure('bas', squat=1, hands=((6, 23), (9, 23)), after=hoe(8, 23, 8, 29, [(7, 30), (8, 30), (9, 30)]))
    F['houe_haut_0'] = figure('haut', hands=((6, 21), (9, 21)), before=hoe(8, 21, 3, 9, [(3, 8), (2, 8), (3, 7)]))
    F['houe_haut_1'] = figure('haut', b=-1, hands=((6, 8), (9, 8)), after=hoe(8, 8, 8, 1, [(7, 1), (8, 0), (9, 1)]))
    F['houe_haut_2'] = figure('haut', hands=((6, 13), (9, 13)), after=hoe(8, 13, 8, 4, [(7, 3), (8, 3), (9, 3)]))
    F['houe_haut_3'] = figure('haut', squat=1, hands=((6, 19), (9, 19)), before=hoe(8, 19, 8, 12, [(7, 11), (8, 11), (9, 11)]))
    # planter / récolter : la main à la poche, accroupi, la main au sol (une graine tombe)
    seed = lambda pts: (lambda cv: [cv.put(x, y, 'sd') for (x, y) in pts])
    F['plante_cote_0'] = figure('cote', hands=((9, 21), (7, 22)))
    F['plante_cote_1'] = figure('cote', squat=2, hands=((11, 25), (7, 24)))
    F['plante_cote_2'] = figure('cote', squat=2, hands=((12, 27), (7, 24)), after=seed([(13, 30)]))
    F['plante_bas_0'] = figure('bas', hands=((3, 22), (10, 21)))
    F['plante_bas_1'] = figure('bas', squat=2, hands=((3, 24), (10, 26)))
    F['plante_bas_2'] = figure('bas', squat=2, hands=((3, 24), (8, 28)), after=seed([(9, 31)]))
    F['plante_haut_0'] = figure('haut', hands=((3, 22), (10, 21)))
    F['plante_haut_1'] = figure('haut', squat=2, hands=((3, 24), (11, 23)))
    F['plante_haut_2'] = figure('haut', squat=2, hands=((3, 24), (10, 22)))
    # arroser
    for k in range(3):
        F[f'arrose_cote_{k}'] = figure('cote', hands=((10, 21), (8, 22)), after=can(10, 21, min(k, 1), k == 2))
        F[f'arrose_bas_{k}'] = figure('bas', hands=((3, 22), (11, 22)), after=can(11, 22, min(k, 1), k == 2))
        F[f'arrose_haut_{k}'] = figure('haut', hands=((3, 22), (11, 20)), before=can(11, 19, min(k, 1), k == 2))
    # le panier d'œufs
    for vue in ('bas', 'haut', 'cote'):
        for k in range(4):
            b = -1 if k in (1, 3) else 0
            if vue == 'cote':
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((10, 21 + b), (7, 22)), after=basket(10, 21 + b))
            elif vue == 'bas':
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((3, 22 + b), (11, 21 + b)), after=basket(11, 22 + b))
            else:
                F[f'panier_{vue}_{k}'] = figure(vue, walk=k, b=b, hands=((3, 22 + b), (11, 21 + b)), before=basket(11, 21 + b))
    # cuisiner, de dos : la main droite tourne la cuillère
    for k, h in enumerate(((11, 17), (12, 16), (11, 15), (10, 16))):
        F[f'cuisine_{k}'] = figure('haut', hands=((4, 18), h), after=(lambda hx, hy: lambda cv: cv.line(hx, hy, hx - 1, hy - 3, 'wd'))(*h))
    # le réfrigérateur, de dos : il tend le bras, ouvre, se penche
    F['frigo_0'] = figure('haut', hands=((3, 22), (12, 15)))
    F['frigo_1'] = figure('haut', hands=((3, 22), (13, 17)))
    F['frigo_2'] = figure('haut', b=1, hands=((6, 16), (13, 17)))
    # ramasser un œuf, de profil
    F['ramasse_0'] = figure('cote', hands=((9, 21), (6, 22)), before=basket(3, 21))
    F['ramasse_1'] = figure('cote', squat=2, hands=((12, 27), (6, 24)), before=basket(3, 23))
    F['ramasse_2'] = figure('cote', squat=2, hands=((10, 23), (6, 24)), before=basket(3, 23, 3), after=lambda cv: cv.put(11, 22, 'eg'))
    return F


def render(cv):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            c = cv.px[y][x]
            if c is not None:
                im.putpixel((x, y), C[c] + (255,))
    return im


def main():
    F = frames()
    names = list(F)
    rows = (len(names) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * W, rows * H), (0, 0, 0, 0))
    for i, n in enumerate(names):
        sheet.paste(render(F[n]), ((i % COLS) * W, (i // COLS) * H))
    sheet.save(os.path.join(ROOT, 'assets', 'fermier.png'))
    with open(os.path.join(ROOT, 'assets', 'fermier.json'), 'w', encoding='utf-8') as f:
        json.dump({'frameWidth': W, 'frameHeight': H, 'frames': names}, f, ensure_ascii=False, indent=0)
        f.write('\n')
    print(f'assets/fermier.png : {len(names)} cases de {W} × {H} px ({COLS} par rangée)')
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (126, 170, 92, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_fermier.png'))


if __name__ == '__main__':
    main()
