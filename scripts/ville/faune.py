# Les animaux des cartes du voyage en train et les trouvailles qu'on y ramasse, au pixel, dans
# le style des personnages (contour sombre, lumière du haut à gauche) :
#
#   la montagne   la marmotte (assise, à quatre pattes), le bouquetin (debout, en marche),
#                 l'aigle (vu de dessus, en vol : son ombre court au sol, js/ville-carte.js)
#   la plage      la mouette (debout, en vol), le crabe (de dessus), le dauphin (son saut)
#   trouvailles   l'ammonite et le trilobite (fossiles), le quartz et l'améthyste (pierres),
#                 la coquille Saint-Jacques et le bulot (coquillages), le corail, la perle
#
#   python3 scripts/ville/faune.py        écrit assets/faune_<espèce>.png, assets/trouvailles.png
#                                         et assets/faune.json (les cases, leurs noms, l'ancre)
#   python3 scripts/ville/faune.py --apercu    écrit aussi apercu_faune.png
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, ROOT, K, contour, dessin, image, rgba, teinte  # noqa: E402
from PIL import Image  # noqa: E402


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((int(x), int(y)), rgba(c))


def ellipse(im, x0, y0, x1, y1, c, ombre=None, clair=None):
    """Une ellipse pleine (bornes comprises), assombrie en bas à droite, éclairée en haut à gauche."""
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0 + 1) / 2, (y1 - y0 + 1) / 2
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if u * u + v * v > 1:
                continue
            col = c
            if ombre and u * 0.5 + v > 0.45:
                col = ombre
            elif clair and u * 0.6 + v < -0.62:
                col = clair
            px(im, x, y, col)


def trait(im, pts, c, epais=1):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 2))
        for i in range(n + 1):
            x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
            for e in range(epais):
                px(im, round(x), round(y) + e, c)


def fini(im):
    return contour(im, K)


# ---------- la montagne ----------

POIL = (156, 108, 64)
POIL_S = (110, 74, 46)
POIL_C = (198, 156, 106)


def marmotte(pose, k):
    """16 × 16, de profil (vers la droite), les pieds en bas au milieu. pose : 'assise' (debout
    sur ses pattes arrière, k : la tête tournée) ou 'marche' (k : les pattes)."""
    im = image(16, 16)
    if pose == 'assise':
        ellipse(im, 4, 13, 7, 15, POIL_S)                      # la queue, posée
        ellipse(im, 5, 6, 11, 15, POIL, POIL_S, POIL_C)        # le corps
        ellipse(im, 8, 9, 10, 14, POIL_C)                      # le ventre
        hx = 7 + (1 if k else 0)
        ellipse(im, hx, 2, hx + 5, 7, POIL, POIL_S, POIL_C)    # la tête
        px(im, hx + 1, 2, POIL_S)                              # l'oreille
        px(im, hx + 4, 4, K)                                   # l'œil
        px(im, hx + 5, 5, (60, 40, 30))                        # le nez
        px(im, hx + 4, 6, POIL_C)
        px(im, 10, 10, POIL_S)
        px(im, 11, 10, POIL_S)                                 # les pattes avant, repliées
    else:
        ellipse(im, 1, 9, 4, 11, POIL_S)
        ellipse(im, 3, 8, 12, 14, POIL, POIL_S, POIL_C)
        ellipse(im, 10, 6, 14, 11, POIL, POIL_S, POIL_C)
        px(im, 11, 6, POIL_S)
        px(im, 13, 8, K)
        px(im, 14, 9, (60, 40, 30))
        for x, d in ((4, 0), (10, 1)):
            dy = 1 if (k + d) % 2 else 0
            px(im, x, 14 + dy - 1, POIL_S)
            px(im, x + 1, 14, POIL_S)
    return fini(im)


BOUQ = (150, 128, 100)
BOUQ_S = (108, 92, 72)
BOUQ_C = (196, 180, 150)
CORNE = (122, 108, 90)


def bouquetin(k, marche):
    """32 × 32, de profil (vers la droite), les sabots en bas au milieu (y 29). marche : k la
    foulée (0..3) ; sinon k : la tête baissée (il broute) ou levée."""
    im = image(32, 32)
    # les pattes : deux devant, deux derrière ; en marche elles se croisent
    pas = [(-2, 2), (0, 0), (2, -2), (0, 0)][k % 4] if marche else (0, 0)
    for x0, dx, ton in ((9, pas[0], BOUQ_S), (12, -pas[0], BOUQ), (20, pas[1], BOUQ_S), (23, -pas[1], BOUQ)):
        trait(im, [(x0, 19), (x0 + dx * 0.5, 24), (x0 + dx, 29)], ton, 1)
        trait(im, [(x0 + 1, 19), (x0 + 1 + dx * 0.5, 24), (x0 + 1 + dx, 29)], ton, 1)
        px(im, x0 + dx, 29, (52, 44, 40))
        px(im, x0 + 1 + dx, 29, (52, 44, 40))
    ellipse(im, 6, 11, 26, 21, BOUQ, BOUQ_S, BOUQ_C)            # le corps
    ellipse(im, 9, 17, 22, 21, BOUQ_C)                           # le ventre
    ellipse(im, 4, 12, 7, 15, BOUQ_S)                            # la queue
    baisse = not marche and k % 2 == 1
    hy = 14 if baisse else 6
    trait(im, [(23, 15), (26, hy + 4)], BOUQ, 3)                 # le cou
    ellipse(im, 24, hy, 30, hy + 5, BOUQ, BOUQ_S, BOUQ_C)        # la tête
    px(im, 29, hy + 4, (60, 50, 44))
    px(im, 27, hy + 2, K)
    trait(im, [(28, hy + 5), (28, hy + 8)], BOUQ_S, 1)           # la barbiche
    # les cornes : un grand arc vers l'arrière, annelé
    cornes = [(25, hy), (23, hy - 3), (20, hy - 5), (17, hy - 4), (16, hy - 2)]
    trait(im, cornes, CORNE, 2)
    for x, y in cornes[1:4]:
        px(im, x, y, teinte(CORNE, 1.3))
    px(im, 26, hy - 1, BOUQ_S)                                   # l'oreille
    return fini(im)


AIGLE = (110, 74, 44)
AIGLE_S = (74, 50, 32)
AIGLE_C = (170, 128, 74)


def aigle(k):
    """32 × 32, vu de dessus, le bec vers le haut ; k : les ailes déployées ou relevées."""
    im = image(32, 32)
    env = 15 if k == 0 else 11                   # la demi-envergure
    for s in (-1, 1):
        # l'aile : un trapèze qui s'effile, les rémiges sombres au bout
        for i in range(env):
            x = 16 + s * (2 + i)
            larg = 6 - i * 3 // env
            for j in range(larg):
                y = 13 + i // 4 + j
                c = AIGLE_S if i > env - 4 else AIGLE_C if j == 0 else AIGLE
                px(im, x, y, c)
            if i > env - 4 and i % 2 == 0:
                px(im, x, 13 + i // 4 + larg, AIGLE_S)
    ellipse(im, 14, 10, 18, 22, AIGLE, AIGLE_S, AIGLE_C)       # le corps
    ellipse(im, 14, 7, 17, 11, (196, 158, 92))                  # la tête dorée
    px(im, 15, 6, (234, 196, 60))
    px(im, 16, 6, (234, 196, 60))                               # le bec
    for x in range(13, 20):
        px(im, x, 23, AIGLE_S if x % 2 else AIGLE)              # la queue
        px(im, x, 24, AIGLE_S)
    return fini(im)


# ---------- la plage ----------

BLANC = (238, 240, 242)
GRIS = (156, 166, 178)
BEC = (236, 184, 58)


def mouette(pose, k):
    """16 × 16. pose 'debout' (de profil, vers la droite ; k : le bec ouvert) ou 'vol' (vue de
    dessus, k : les ailes hautes ou basses)."""
    im = image(16, 16)
    if pose == 'debout':
        trait(im, [(7, 12), (7, 15)], (226, 132, 70))
        trait(im, [(9, 12), (9, 15)], (226, 132, 70))
        ellipse(im, 3, 7, 12, 12, BLANC, teinte(BLANC, 0.82))
        ellipse(im, 3, 7, 10, 10, GRIS, teinte(GRIS, 0.8))      # l'aile repliée
        trait(im, [(2, 9), (4, 9)], (40, 40, 46))               # le bout des ailes
        ellipse(im, 9, 3, 13, 7, BLANC, teinte(BLANC, 0.85))
        px(im, 12, 4, K)
        px(im, 14, 5, BEC)
        px(im, 15, 5, BEC)
        if k:
            px(im, 14, 6, BEC)
    else:
        ellipse(im, 6, 5, 9, 12, BLANC, teinte(BLANC, 0.85))
        y = 7 if k == 0 else 5
        for s in (-1, 1):
            trait(im, [(8 + s * 2, 8), (8 + s * 5, y), (8 + s * 7, y + 1)], GRIS)
            trait(im, [(8 + s * 2, 9), (8 + s * 5, y + 1)], BLANC)
            px(im, 8 + s * 7, y + 1, (40, 40, 46))
        px(im, 7, 4, BEC)
        px(im, 8, 4, BEC)
    return fini(im)


CRABE = (214, 84, 52)
CRABE_S = (156, 52, 36)
CRABE_C = (240, 140, 96)


def crabe(k):
    """16 × 16, vu de dessus ; k : les pattes."""
    im = image(16, 16)
    d = 1 if k else 0
    for s in (-1, 1):
        for i in range(3):
            x0 = 8 + s * 3
            trait(im, [(x0, 9 + i), (x0 + s * 3, 9 + i + (d if i % 2 else -d) - 1 + i)], CRABE_S)
        # les pinces
        trait(im, [(8 + s * 2, 8), (8 + s * 4, 5)], CRABE_S)
        ellipse(im, 8 + s * 5 - 1, 3, 8 + s * 5 + 1, 5, CRABE, CRABE_S, CRABE_C)
    ellipse(im, 4, 7, 11, 12, CRABE, CRABE_S, CRABE_C)
    px(im, 6, 7, K)
    px(im, 9, 7, K)
    return fini(im)


DAUPHIN = (96, 120, 150)
DAUPHIN_S = (68, 88, 114)
DAUPHIN_C = (190, 202, 214)


def dauphin(k):
    """32 × 32 : le saut, de profil (vers la droite). k : 0 il sort de l'eau, 1 il monte, 2 en
    haut, 3 il replonge, 4 la gerbe d'eau seule. La surface de l'eau : la ligne y = 24."""
    im = image(32, 32)
    if k == 4:
        for i, (x, y) in enumerate(((12, 22), (15, 19), (18, 18), (21, 20), (24, 23), (10, 24), (26, 24))):
            ellipse(im, x - 1, y - 1, x + 1, y + 1, (226, 240, 248), (170, 210, 230))
        return fini(im)
    # le corps : une courbe épaisse, de la queue au rostre, selon l'angle du saut
    angle = {0: -50, 1: -25, 2: 0, 3: 35}[k]
    a = math.radians(angle)
    cx, cy = 16, {0: 18, 1: 13, 2: 11, 3: 14}[k]
    pts = []
    for i in range(-10, 11):
        cour = 0.012 * (i * i) * (1 if k != 2 else 0.6)
        x = cx + i * math.cos(a) - cour * math.sin(a) * 6
        y = cy + i * math.sin(a) + cour * 6 * math.cos(a) * 0.4
        pts.append((x, y, i))
    for x, y, i in pts:
        r = 3.2 - abs(i) * 0.22 if i < 7 else 2.2 - (i - 7) * 0.4
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                if dx * dx + dy * dy <= r * r:
                    yy = round(y + dy)
                    if k in (0, 3) and yy > 23:
                        continue                      # sous l'eau
                    px(im, round(x + dx), yy, DAUPHIN_C if dy > r * 0.3 else DAUPHIN if dy > -r * 0.5 else DAUPHIN_S)
    # la queue, l'aileron, l'œil
    xq, yq, _ = pts[0]
    if not (k == 0):
        trait(im, [(xq - 2, yq - 3), (xq, yq), (xq - 2, yq + 3)], DAUPHIN_S, 1)
    xm, ym, _ = pts[9]
    px(im, round(xm - 2 * math.sin(a)), round(ym - 4 * math.cos(a)), DAUPHIN_S)
    px(im, round(xm - 1 - 2 * math.sin(a)), round(ym - 5 * math.cos(a)), DAUPHIN_S)
    xe, ye, _ = pts[17]
    if not (k in (0, 3) and ye > 23):
        px(im, round(xe), round(ye - 1), K)
    if k in (0, 3):
        for x in range(8, 25):
            if 23 <= max(p[1] for p in pts if abs(p[0] - x) < 2) if any(abs(p[0] - x) < 2 for p in pts) else False:
                px(im, x, 24, (226, 240, 248))
    return fini(im)


# ---------- les trouvailles ----------

def trouvaille(nom):
    """16 × 16 : posée au sol, une petite ombre dessous."""
    im = image(16, 16)
    d = dessin(im)
    d.ellipse((3, 11, 13, 14), fill=(0, 0, 0, 50))
    if nom == 'ammonite':
        c, s, l = (190, 170, 134), (138, 118, 90), (226, 210, 176)
        ellipse(im, 3, 4, 12, 12, c, s, l)
        for i in range(48):
            t = i / 48 * 3.2 * math.pi
            r = 4.2 * (1 - t / (3.6 * math.pi))
            px(im, round(7.5 + r * math.cos(t)), round(8 + r * math.sin(t) * 0.9), s)
        for t in range(0, 360, 40):
            a = math.radians(t)
            px(im, round(7.5 + 4 * math.cos(a)), round(8 + 3.6 * math.sin(a)), l)
    elif nom == 'trilobite':
        c, s, l = (124, 112, 104), (84, 76, 72), (164, 154, 144)
        ellipse(im, 4, 3, 11, 13, c, s, l)
        for y in range(6, 13, 2):
            trait(im, [(5, y), (10, y)], s)
        trait(im, [(7, 4), (7, 12)], l)
        ellipse(im, 4, 2, 11, 5, l, c)
    elif nom == 'quartz':
        for x0, h, w in ((4, 8, 3), (7, 10, 3), (10, 6, 3)):
            for y in range(12 - h, 12):
                for x in range(x0, x0 + w):
                    pointe = y < 12 - h + 2 and abs(x - (x0 + w // 2)) > (y - (12 - h))
                    if not pointe:
                        px(im, x, y, (236, 242, 248) if x == x0 else (196, 214, 230) if x == x0 + w - 1 else (220, 232, 242))
        px(im, 8, 4, (255, 255, 255))
    elif nom == 'amethyste':
        ellipse(im, 3, 9, 12, 13, (128, 118, 110), (96, 88, 84))
        for x0, h, w in ((4, 6, 3), (7, 8, 3), (10, 5, 2)):
            for y in range(11 - h, 11):
                for x in range(x0, x0 + w):
                    pointe = y < 11 - h + 2 and abs(x - (x0 + w // 2)) > (y - (11 - h))
                    if not pointe:
                        px(im, x, y, (196, 150, 226) if x == x0 else (112, 66, 152) if x == x0 + w - 1 else (150, 96, 192))
    elif nom == 'coquille':
        c, s, l = (238, 168, 132), (196, 116, 92), (252, 214, 190)
        for y in range(4, 13):
            for x in range(2, 14):
                u, v = (x + 0.5 - 8) / 6, (y + 0.5 - 12) / 8
                if u * u + v * v <= 1 and y < 12:
                    a = math.atan2(y + 0.5 - 12, x + 0.5 - 8)
                    raie = int((a + math.pi) / math.pi * 9) % 2
                    px(im, x, y, l if y < 6 and raie else c if raie else s)
        for x in range(6, 11):
            px(im, x, 12, s)
        px(im, 5, 12, s)
        px(im, 10, 12, s)
    elif nom == 'bulot':
        c, s, l = (206, 186, 150), (140, 102, 70), (236, 222, 196)
        for i, (x0, x1, y) in enumerate(((7, 8, 3), (6, 9, 4), (6, 9, 5), (5, 10, 6), (5, 10, 7), (4, 11, 8), (4, 11, 9), (5, 11, 10), (6, 10, 11))):
            for x in range(x0, x1 + 1):
                px(im, x, y, s if (y + x // 2) % 3 == 0 else l if x == x0 else c)
        ellipse(im, 8, 9, 10, 11, (232, 190, 160))
    elif nom == 'corail':
        c, s, l = (222, 72, 70), (164, 44, 48), (246, 132, 120)
        trait(im, [(8, 13), (8, 8), (6, 5), (5, 3)], c, 1)
        trait(im, [(8, 9), (11, 6), (11, 3)], c, 1)
        trait(im, [(7, 7), (4, 7)], c, 1)
        trait(im, [(10, 7), (13, 5)], c, 1)
        trait(im, [(9, 13), (9, 9)], s, 1)
        for x, y in ((5, 3), (11, 3), (4, 7), (13, 5)):
            px(im, x, y, l)
    elif nom == 'perle':
        c, s, l = (150, 150, 158), (104, 102, 112), (196, 196, 204)
        ellipse(im, 2, 7, 13, 13, c, s, l)                      # la coquille du dessous
        ellipse(im, 3, 8, 12, 12, (220, 212, 214), (190, 180, 186))     # la nacre
        ellipse(im, 3, 2, 12, 7, s, teinte(s, 0.8), c)          # celle du dessus, entrouverte
        ellipse(im, 6, 8, 9, 11, (246, 244, 236), (210, 206, 200), (255, 255, 255))
    return contour(im, K)


TROUVAILLES = [
    ('ammonite', 'fossile', 'Une ammonite fossile'),
    ('trilobite', 'fossile', 'Un trilobite fossile'),
    ('quartz', 'pierre', 'Un cristal de quartz'),
    ('amethyste', 'pierre', 'Une améthyste'),
    ('coquille', 'coquillage', 'Une coquille Saint-Jacques'),
    ('bulot', 'coquillage', 'Un bulot'),
    ('corail', 'corail', 'Une branche de corail'),
    ('perle', 'perle', 'Une perle, dans son huître'),
]

ESPECES = {
    'marmotte': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Une marmotte',
                 'images': [('assise_0', lambda: marmotte('assise', 0)), ('assise_1', lambda: marmotte('assise', 1)),
                            ('marche_0', lambda: marmotte('marche', 0)), ('marche_1', lambda: marmotte('marche', 1))]},
    'bouquetin': {'taille': (32, 32), 'ancre': (16, 30), 'nom': 'Un bouquetin',
                  'images': [('debout_0', lambda: bouquetin(0, False)), ('debout_1', lambda: bouquetin(1, False))]
                  + [(f'marche_{k}', (lambda k=k: bouquetin(k, True))) for k in range(4)]},
    'aigle': {'taille': (32, 32), 'ancre': (16, 16), 'nom': 'Un aigle royal',
              'images': [('vol_0', lambda: aigle(0)), ('vol_1', lambda: aigle(1))]},
    'mouette': {'taille': (16, 16), 'ancre': (8, 15), 'nom': 'Une mouette',
                'images': [('debout_0', lambda: mouette('debout', 0)), ('debout_1', lambda: mouette('debout', 1)),
                           ('vol_0', lambda: mouette('vol', 0)), ('vol_1', lambda: mouette('vol', 1))]},
    'crabe': {'taille': (16, 16), 'ancre': (8, 12), 'nom': 'Un crabe',
              'images': [('marche_0', lambda: crabe(0)), ('marche_1', lambda: crabe(1))]},
    'dauphin': {'taille': (32, 32), 'ancre': (16, 24), 'nom': 'Un dauphin',
                'images': [(f'saut_{k}', (lambda k=k: dauphin(k))) for k in range(4)] + [('gerbe', lambda: dauphin(4))]},
}


def main():
    meta = {'especes': {}, 'trouvailles': {}}
    apercu = []
    for nom, e in ESPECES.items():
        w, h = e['taille']
        ims = [f() for _, f in e['images']]
        sheet = image(w * len(ims), h)
        for k, im in enumerate(ims):
            sheet.alpha_composite(im, (k * w, 0))
        sheet.save(os.path.join(ASSETS, f'faune_{nom}.png'), optimize=True)
        meta['especes'][nom] = {'image': f'faune_{nom}.png', 'frameWidth': w, 'frameHeight': h,
                                'anchor': {'x': e['ancre'][0], 'y': e['ancre'][1]},
                                'frames': [n for n, _ in e['images']], 'nom': e['nom']}
        apercu.append(sheet)
    sheet = image(16 * len(TROUVAILLES), 16)
    for k, (nom, genre, texte) in enumerate(TROUVAILLES):
        sheet.alpha_composite(trouvaille(nom), (k * 16, 0))
        meta['trouvailles'][nom] = {'frame': k, 'genre': genre, 'nom': texte}
    sheet.save(os.path.join(ASSETS, 'trouvailles.png'), optimize=True)
    apercu.append(sheet)
    with open(os.path.join(ASSETS, 'faune.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write('\n')
    if '--apercu' in sys.argv:
        W = max(s.width for s in apercu) + 8
        Hh = sum(s.height + 4 for s in apercu) + 4
        out = Image.new('RGBA', (W, Hh), (216, 196, 140, 255))
        y = 4
        for s in apercu:
            out.alpha_composite(s, (4, y))
            y += s.height + 4
        out.resize((W * 6, Hh * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_faune.png'))


if __name__ == '__main__':
    main()
