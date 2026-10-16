# Les tuiles et objets des grottes de la montagne. Les niveaux eux-mêmes sont tirés au hasard
# par le jeu (js/ville-carte.js, ?carte=grotte) : ici, seulement les morceaux qu'il assemble.
#
#   assets/grotte_tuiles.png   16 × 16, 16 colonnes :
#     sol_0..7          le sol de la grotte (terre battue, cailloux, flaque, mousse)
#     plafond_<n>       le dessus d'un mur vu d'en haut, n : les côtés qui touchent le sol
#                       (1 nord, 2 est, 4 sud, 8 ouest) y ont un rebord éclairé
#     paroi_0..3        la face d'un mur, au-dessus d'une case de sol (on la voit de face)
#     fer, cuivre, or, platine   le minerai, posé sur un mur (une couche à part)
#     champignon, cristal        des décors posés au sol
#   assets/grotte_objets.png   32 × 32 : echelle (on remonte), trou (on descend), stalagmite_0, _1
#   assets/grotte.json         le nom de chaque case, les minerais (nom, couleur)
#
#   python3 scripts/ville/grotte.py [--apercu]
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, ROOT, K, contour, dessin, hasard, image, mel, rgba, teinte  # noqa: E402
from PIL import Image  # noqa: E402

T = 16
SOL = [(70, 60, 56), (84, 72, 66), (98, 86, 78), (58, 50, 48)]
PAROI = [(52, 46, 46), (74, 66, 64), (96, 88, 84), (122, 114, 108)]
PLAFOND = [(30, 26, 28), (40, 35, 37), (50, 44, 46)]

MINERAIS = {
    'fer': {'nom': 'Du minerai de fer', 'tons': [(150, 104, 84), (186, 132, 104), (214, 170, 140)]},
    'cuivre': {'nom': 'Du minerai de cuivre', 'tons': [(170, 90, 50), (214, 126, 70), (90, 170, 140)]},
    'or': {'nom': 'Une pépite d’or', 'tons': [(196, 150, 40), (240, 200, 70), (255, 240, 160)]},
    'platine': {'nom': 'Du platine, très rare', 'tons': [(170, 180, 196), (212, 222, 236), (255, 255, 255)]},
}


def sol(v):
    im = image(T, T)
    p = im.load()
    for y in range(T):
        for x in range(T):
            n = hasard(x, y, 101 + v)
            c = SOL[1] if n < 0.55 else SOL[0] if n < 0.85 else SOL[2]
            p[x, y] = rgba(c)
    d = dessin(im)
    if v in (1, 2):              # des cailloux
        for i in range(3 if v == 1 else 2):
            x, y = int(hasard(v, i, 102) * 12) + 1, int(hasard(v, i, 103) * 12) + 1
            d.ellipse((x, y, x + 3, y + 2), fill=rgba(SOL[3]))
            d.point((x + 1, y), fill=rgba(SOL[2]))
    elif v == 3:                 # une flaque
        d.ellipse((3, 5, 13, 11), fill=rgba((44, 54, 70)))
        d.ellipse((4, 6, 10, 9), fill=rgba((62, 78, 100)))
        d.point((6, 7), fill=rgba((150, 176, 200)))
    elif v == 4:                 # un peu de mousse
        for i in range(10):
            x, y = int(hasard(i, 104) * 15), int(hasard(i, 105) * 15)
            d.point((x, y), fill=rgba((70, 92, 52)))
    return im


def plafond(n):
    """Le dessus d'un mur ; un rebord clair sur les côtés qui donnent sur le sol."""
    im = image(T, T)
    p = im.load()
    for y in range(T):
        for x in range(T):
            c = PLAFOND[1] if hasard(x, y, 106) < 0.7 else PLAFOND[0] if hasard(x, y, 107) < 0.6 else PLAFOND[2]
            bord = (n & 1 and y < 2) or (n & 2 and x > 13) or (n & 8 and x < 2)
            if bord:
                c = PAROI[3] if (n & 1 and y == 0) or (n & 8 and x == 0) else PAROI[2]
            if n & 4 and y > 13:
                c = PAROI[1]
            p[x, y] = rgba(c)
    return im


def paroi(v):
    """La face d'un mur vu de face : des strates, plus claire en haut, sombre au pied."""
    im = image(T, T)
    p = im.load()
    for y in range(T):
        for x in range(T):
            ton = 3 if y < 2 else 2 if y < 8 else 1
            if int(y + 2 * math.sin((x + v * 5) / 3)) % 6 == 0:
                ton = max(0, ton - 1)
            if hasard(x, y, 108 + v) < 0.08:
                ton = max(0, ton - 1)
            if (x + v * 7) % 11 == 0 and y > 3:
                ton = 0
            c = PAROI[ton]
            if y == 15:
                c = K
            p[x, y] = rgba(c)
    return im


def minerai(nom):
    """Des éclats de minerai pris dans la roche (transparent autour)."""
    a, b, c = MINERAIS[nom]['tons']
    im = image(T, T)
    d = dessin(im)
    for i, (x, y) in enumerate(((3, 4), (9, 3), (6, 9), (11, 10), (2, 12))):
        if nom == 'platine' and i > 2:
            break
        w = 3 if i % 2 == 0 else 2
        d.polygon(((x, y + w), (x + w, y), (x + 2 * w, y + w), (x + w, y + 2 * w)), fill=rgba(a))
        d.polygon(((x + 1, y + w), (x + w, y + 1), (x + w + 1, y + w)), fill=rgba(b))
        d.point((x + w, y + 1), fill=rgba(c))
    return contour(im, K)


def champignon():
    im = image(T, T)
    d = dessin(im)
    for x, y, r in ((5, 9, 3), (10, 11, 2)):
        d.rectangle((x, y, x, y + 4), fill=rgba((200, 210, 190)))
        d.ellipse((x - r, y - r // 2 - 1, x + r, y + 1), fill=rgba((90, 210, 200)))
        d.point((x - 1, y - 1), fill=rgba((200, 255, 250)))
    return contour(im, K)


def cristal():
    im = image(T, T)
    d = dessin(im)
    for x0, h in ((4, 7), (7, 10), (10, 6)):
        d.polygon(((x0, 14), (x0, 14 - h + 2), (x0 + 1, 14 - h), (x0 + 2, 14 - h + 2), (x0 + 2, 14)), fill=rgba((150, 110, 210)))
        d.line((x0, 14, x0, 14 - h + 2), fill=rgba((206, 180, 250)))
    return contour(im, K)


def echelle():
    """32 × 32 : l'échelle qui remonte, appuyée contre le haut, la lumière qui tombe du trou."""
    im = image(32, 32)
    d = dessin(im)
    d.ellipse((4, 0, 28, 10), fill=(250, 240, 200, 110))
    d.ellipse((9, 2, 23, 8), fill=(255, 250, 220, 170))
    for x in (10, 21):
        d.rectangle((x, 2, x + 1, 30), fill=rgba((122, 80, 52)))
    for y in range(5, 30, 5):
        d.rectangle((10, y, 22, y + 1), fill=rgba((152, 104, 68)))
    d.ellipse((7, 27, 25, 31), fill=(0, 0, 0, 70))
    return contour(im, K)


def trou():
    """32 × 32 : un puits qui descend, le haut d'une échelle qui dépasse."""
    im = image(32, 32)
    d = dessin(im)
    d.ellipse((2, 10, 30, 30), fill=rgba(PAROI[2]))
    d.ellipse((4, 12, 28, 29), fill=rgba((14, 10, 14)))
    d.ellipse((6, 13, 26, 22), fill=rgba((28, 22, 26)))
    for x in (11, 20):
        d.rectangle((x, 6, x + 1, 26), fill=rgba((122, 80, 52)))
    for y in (9, 15, 21):
        d.rectangle((11, y, 21, y + 1), fill=rgba((152, 104, 68)))
    return contour(im, K)


def stalagmite(v):
    im = image(32, 32)
    d = dessin(im)
    d.ellipse((6, 26, 26, 31), fill=(0, 0, 0, 80))
    pics = ((16, 6, 6), (10, 16, 4), (22, 14, 4)) if v == 0 else ((14, 10, 5), (20, 4, 5))
    for x, top, r in pics:
        d.polygon(((x - r, 29), (x, top), (x + r, 29)), fill=rgba(PAROI[1]))
        d.polygon(((x - r, 29), (x, top), (x - 1, 29)), fill=rgba(PAROI[3]))
    return contour(im, K)


def main():
    tuiles, noms = [], []

    def ajoute(nom, im):
        noms.append(nom)
        tuiles.append(im)
    for v in range(8):
        ajoute(f'sol_{v}', sol(v if v < 5 else 0))
    for n in range(16):
        ajoute(f'plafond_{n}', plafond(n))
    for v in range(4):
        ajoute(f'paroi_{v}', paroi(v))
    for m in MINERAIS:
        ajoute(m, minerai(m))
    ajoute('champignon', champignon())
    ajoute('cristal', cristal())
    col = 16
    rows = math.ceil(len(tuiles) / col)
    sheet = image(col * T, rows * T)
    for i, im in enumerate(tuiles):
        sheet.alpha_composite(im, ((i % col) * T, (i // col) * T))
    sheet.save(os.path.join(ASSETS, 'grotte_tuiles.png'), optimize=True)
    objets = [('echelle', echelle()), ('trou', trou()), ('stalagmite_0', stalagmite(0)), ('stalagmite_1', stalagmite(1))]
    obj = image(32 * len(objets), 32)
    for i, (_, im) in enumerate(objets):
        obj.alpha_composite(im, (i * 32, 0))
    obj.save(os.path.join(ASSETS, 'grotte_objets.png'), optimize=True)
    with open(os.path.join(ASSETS, 'grotte.json'), 'w') as f:
        json.dump({'tuiles': {n: i for i, n in enumerate(noms)}, 'colonnes': col,
                   'objets': [n for n, _ in objets],
                   'minerais': {k: {'nom': v['nom']} for k, v in MINERAIS.items()}}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    if '--apercu' in sys.argv:
        out = Image.new('RGBA', (max(sheet.width, obj.width) + 8, sheet.height + obj.height + 12), (20, 18, 20, 255))
        out.alpha_composite(sheet, (4, 4))
        out.alpha_composite(obj, (4, sheet.height + 8))
        out.resize((out.width * 5, out.height * 5), Image.NEAREST).save(os.path.join(ROOT, 'apercu_grotte.png'))


if __name__ == '__main__':
    main()
