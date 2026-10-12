# Meubles de l'intérieur de la maison (assets/maison_interieur.json), un fichier
# assets/meuble_<nom>.png chacun :
#   - les appareils, qui ouvrent leur fenêtre : four (four à pain voûté, feu dans la gueule),
#     cuisine (fourneau sur son meuble, marmite fumante), frigo (réfrigérateur à deux portes) ;
#   - le décor de la cuisine : evier, plan (plan de travail), fenetre, plante ;
#   - les meubles du Marché (data/meubles.json) : chaise, table, tapis_1 à 3, lit_adulte,
#     lit_enfant, chevet, canape, table_basse, tableau_1 à 3.
# Vus de face (les tapis : de dessus), posés contre le mur du fond ; lumière à gauche.
#
#   python3 scripts/batiments/meubles.py            écrit les images
#   python3 scripts/batiments/meubles.py --apercu   écrit aussi apercu_meubles.png (agrandi)
import math
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

C = {
    'K': (34, 22, 16),                                           # contour
    # pierre
    'p0': (74, 66, 62), 'p1': (112, 102, 94), 'p2': (148, 138, 126), 'p3': (186, 176, 160), 'mo': (92, 82, 76),
    # feu
    'f0': (40, 18, 12), 'f1': (168, 52, 24), 'f2': (232, 120, 36), 'f3': (252, 200, 72), 'f4': (255, 240, 170),
    # bois
    'w0': (60, 30, 22), 'w1': (96, 54, 32), 'w2': (134, 82, 46), 'w3': (170, 112, 64), 'w4': (204, 150, 92),
    # fonte, métal
    'i0': (28, 30, 38), 'i1': (52, 56, 66), 'i2': (86, 92, 104), 'i3': (134, 140, 152),
    # marmite rouge, vapeur
    'r0': (92, 24, 28), 'r1': (150, 44, 44), 'r2': (196, 76, 64), 's': (236, 240, 244),
    # frigo
    'b0': (150, 156, 164), 'b1': (196, 202, 206), 'b2': (228, 232, 232), 'b3': (250, 250, 246), 'ch': (176, 184, 192),
    # eau, ciel, verre
    'e0': (52, 104, 156), 'e1': (96, 156, 208), 'e2': (168, 212, 240),
    # végétal, terre cuite
    'g0': (24, 74, 40), 'g1': (46, 118, 58), 'g2': (88, 160, 72), 'g3': (150, 200, 96), 't0': (130, 60, 36), 't1': (178, 92, 52), 't2': (212, 132, 80),
    # tissus : rouge, bleu, vert, jaune, crème
    'R0': (110, 30, 36), 'R1': (164, 50, 52), 'R2': (210, 92, 80),
    'B0': (30, 52, 104), 'B1': (52, 92, 160), 'B2': (110, 150, 210),
    'V0': (40, 82, 56), 'V1': (66, 124, 80), 'V2': (112, 168, 110),
    'J0': (176, 124, 32), 'J1': (226, 176, 60), 'J2': (248, 216, 120),
    'c0': (196, 176, 140), 'c1': (226, 210, 176), 'c2': (246, 238, 214),
    'o0': (140, 96, 28), 'o1': (204, 152, 52), 'o2': (240, 204, 104),   # dorure des cadres
}


def rect(put, x0, y0, x1, y1, k):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(x, y, k)


def cabinet(put, W, top, H, wood=('w1', 'w2', 'w3')):
    """Meuble bas de cuisine : deux portes, poignées, de top à H - 1."""
    d, m, l = wood
    rect(put, 1, top, W - 2, H - 2, m)
    rect(put, 1, top, 2, H - 2, d)
    rect(put, 1, H - 2, W - 2, H - 2, d)
    mid = W // 2
    rect(put, mid - 1, top, mid, H - 2, 'w0')
    for x in (3, W - 4):
        rect(put, x, top + 2, x, H - 4, l)
    put(mid - 3, top + 4, 'i3'); put(mid + 2, top + 4, 'i3')


def canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def painter(im):
    px = im.load()
    w, h = im.size

    def put(x, y, k, a=255):
        if 0 <= x < w and 0 <= y < h:
            px[int(x), int(y)] = C[k] + (a,)

    def get(x, y):
        return px[x, y][3] if 0 <= x < w and 0 <= y < h else 0
    return put, get


def outline(im):
    """Contour sombre de 1 px autour de tout ce qui est dessiné."""
    put, get = painter(im)
    w, h = im.size
    pts = [(x, y) for y in range(h) for x in range(w) if not get(x, y) and any(get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in pts:
        put(x, y, 'K')


def four():
    W, H = 32, 40
    im = canvas(W, H)
    put, _ = painter(im)
    cx = 15.5
    # cheminée
    for y in range(2, 14):
        for x in range(20, 25):
            put(x, y, 'i1' if x < 23 else 'i0')
        put(20, y, 'i2')
    for x in range(19, 26):
        put(x, 2, 'i2')
    # voûte de pierre : un demi-disque sur un socle
    for y in range(8, 38):
        for x in range(2, 30):
            dx = (x + 0.5 - cx) / 14.0
            top = 24 - 15 * math.sqrt(max(0.0, 1 - dx * dx))
            if y + 0.5 < top:
                continue
            # pierres en quinconce, joints de mortier
            row = (y - 6) // 4
            off = 3 if row % 2 else 0
            joint = (y - 6) % 4 == 0 or (x + off) % 6 == 0
            light = 'p3' if x < 9 else 'p2' if x < 20 else 'p1'
            k = 'mo' if joint else light
            if y >= 34:
                k = 'p0' if joint else 'p1'          # socle plus sombre
            put(x, y, k)
    # gueule du four : arche sombre, braises et flammes
    for y in range(20, 33):
        for x in range(8, 24):
            dx = (x + 0.5 - cx) / 7.5
            top = 26 - 6 * math.sqrt(max(0.0, 1 - dx * dx))
            if y + 0.5 < top:
                continue
            put(x, y, 'f0')
    flames = {32: 'f1', 31: 'f2', 30: 'f2', 29: 'f3', 28: 'f3', 27: 'f4'}
    for y, k in flames.items():
        half = {32: 6, 31: 5, 30: 4, 29: 3, 28: 2, 27: 1}[y]
        for x in range(int(cx - half), int(cx + half) + 1):
            if (x + y) % 3 or y >= 31:
                put(x, y, k)
    for x in range(9, 23, 2):
        put(x, 32, 'f2')
    # rebord de pierre clair sous la gueule
    for x in range(7, 25):
        put(x, 33, 'p3')
    outline(im)
    return im


def cuisine():
    W, H = 32, 34
    im = canvas(W, H)
    put, _ = painter(im)
    # meuble de bois : plan de travail, deux portes, poignées
    for y in range(18, 33):
        for x in range(1, 31):
            k = 'w2'
            if x in (1, 2) or y == 32:
                k = 'w1'
            if x == 15 or x == 16:
                k = 'w0'                              # séparation des portes
            if y in (19, 31) and x not in (15, 16):
                k = 'w1'
            if x in (4, 27) and 20 <= y <= 30:
                k = 'w3'                              # moulures
            put(x, y, k)
    for x in (12, 19):
        for y in (24, 25):
            put(x, y, 'i3')
    for x in range(0, 32):
        put(x, 16, 'w4')
        put(x, 17, 'w3')
    # fourneau de fonte posé sur le plan
    for y in range(9, 16):
        for x in range(3, 29):
            put(x, y, 'i1' if y > 10 else 'i2')
    for x in range(4, 28):
        put(x, 9, 'i3')
    for bx in (9, 22):                                # feux, l'un allumé
        for x in range(bx - 3, bx + 3):
            put(x, 10, 'i0')
    for x in range(19, 25):
        put(x, 10, 'f2' if x % 2 else 'f3')
    put(6, 13, 'i3'); put(25, 13, 'i3')               # boutons
    # marmite rouge sur le feu de gauche, couvercle, vapeur
    for y in range(3, 10):
        for x in range(4, 15):
            k = 'r2' if x < 7 else 'r1'
            if y == 3:
                k = 'i3' if 6 <= x <= 12 else None
            if k:
                put(x, y, k)
    for x in range(5, 14):
        put(x, 4, 'r0')
    put(9, 2, 'i2'); put(10, 2, 'i2')
    for (x, y) in ((8, 0), (9, 1), (12, 0), (11, 1)):
        put(x, y, 's', 200)
    outline(im)
    return im


def frigo():
    W, H = 20, 38
    im = canvas(W, H)
    put, _ = painter(im)
    for y in range(1, 37):
        for x in range(1, 19):
            # coins du haut arrondis
            if y < 3 and (x < 3 - y + 1 or x > 16 + y - 1):
                continue
            k = 'b3' if x < 6 else 'b2' if x < 14 else 'b1'
            if x == 18:
                k = 'b0'
            put(x, y, k)
    for x in range(1, 19):                            # jointure entre congélateur et frigo
        put(x, 12, 'b0')
        put(x, 13, 'b1')
    for y in list(range(4, 10)) + list(range(16, 27)):  # poignées chromées
        put(15, y, 'ch')
        put(16, y, 'b0')
    for x in range(2, 18):                            # socle
        put(x, 35, 'b0')
        put(x, 36, 'i1')
    put(4, 4, 'b3'); put(4, 15, 'b3')
    outline(im)
    return im


def plan():
    W, H = 32, 22
    im = canvas(W, H)
    put, _ = painter(im)
    cabinet(put, W, 6, H)
    rect(put, 0, 4, W - 1, 4, 'w4')
    rect(put, 0, 5, W - 1, 5, 'w3')
    rect(put, 5, 1, 15, 3, 'w4')                      # planche à découper
    rect(put, 5, 3, 15, 3, 'w3')
    rect(put, 8, 0, 11, 1, 'g2')                      # une courgette posée dessus
    rect(put, 20, 2, 26, 3, 'b1')                     # couteau
    rect(put, 20, 2, 22, 3, 'w1')
    outline(im)
    return im


def evier():
    W, H = 32, 22
    im = canvas(W, H)
    put, _ = painter(im)
    cabinet(put, W, 6, H)
    rect(put, 0, 4, W - 1, 4, 'w4')
    rect(put, 0, 5, W - 1, 5, 'w3')
    rect(put, 6, 3, 25, 5, 'b1')                      # bac en inox
    rect(put, 7, 4, 24, 4, 'e1')                      # l'eau
    rect(put, 15, 0, 16, 3, 'ch')                     # robinet
    rect(put, 15, 0, 19, 0, 'ch')
    put(19, 1, 'e1')
    outline(im)
    return im


def fenetre():
    W, H = 24, 18
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, H - 1, 'w2')
    rect(put, 2, 2, W - 3, H - 4, 'e2')
    rect(put, 2, 9, W - 3, H - 4, 'e1')               # le ciel plus bleu en bas, une colline
    rect(put, 2, 11, W - 3, H - 4, 'g2')
    rect(put, 11, 2, 12, H - 4, 'w2')                 # croisillons
    rect(put, 2, 8, W - 3, 8, 'w2')
    rect(put, 0, H - 3, W - 1, H - 1, 'w4')           # rebord
    put(4, 4, 'b3'); put(5, 4, 'b3'); put(15, 5, 'b3')
    outline(im)
    return im


def plante():
    W, H = 16, 24
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 4, 16, 11, 22, 't1')                    # pot de terre cuite
    rect(put, 3, 15, 12, 16, 't2')
    rect(put, 10, 17, 11, 22, 't0')
    leaves = [(7, 2), (5, 4), (10, 4), (3, 7), (12, 7), (6, 7), (9, 8), (4, 11), (11, 11), (7, 11)]
    for i, (cx, cy) in enumerate(leaves):
        for y in range(cy - 2, cy + 3):
            for x in range(cx - 1, cx + 2):
                put(x, y, 'g2' if (x + y + i) % 3 else 'g3')
        put(cx - 1, cy + 2, 'g1')
    rect(put, 7, 8, 8, 15, 'g1')
    outline(im)
    return im


def chaise():
    W, H = 12, 20
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, 10, 8, 'w2')                      # dossier à barreaux
    rect(put, 3, 2, 3, 7, 'w1'); rect(put, 6, 2, 6, 7, 'w1'); rect(put, 9, 2, 9, 6, 'w1')
    rect(put, 0, 9, 11, 11, 'w3')                     # assise
    rect(put, 1, 12, 2, 19, 'w1'); rect(put, 9, 12, 10, 19, 'w1')
    outline(im)
    return im


def table():
    W, H = 40, 22
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 4, W - 1, 8, 'w3')                   # plateau
    rect(put, 0, 4, W - 1, 4, 'w4')
    rect(put, 1, 8, W - 2, 9, 'w1')
    rect(put, 2, 10, 4, 21, 'w2'); rect(put, W - 5, 10, W - 3, 21, 'w2')
    rect(put, 16, 1, 22, 3, 'c2')                     # une nappe pliée, un bol de fruits
    rect(put, 26, 1, 31, 3, 't1'); put(27, 0, 'R1'); put(29, 0, 'J1')
    outline(im)
    return im


def tapis(n):
    W, H = (40, 22) if n != 2 else (48, 26)
    im = canvas(W, H)
    put, _ = painter(im)
    cx, cy = (W - 1) / 2, (H - 1) / 2
    for y in range(H):
        for x in range(W):
            if n == 1:                                # tapis tressé ovale, beige
                d = ((x - cx) / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2
                if d > 1:
                    continue
                ring = int(d * 5)
                put(x, y, ('c2', 'c1', 'c0', 'c1', 'c0')[ring % 5])
            elif n == 2:                              # tapis rouge à motif, franges
                if x in (0, W - 1):
                    if y % 2 == 0:
                        put(x, y, 'c1')
                    continue
                k = 'R1'
                if 3 <= x <= W - 4 and 3 <= y <= H - 4:
                    k = 'R2' if (abs(x - cx) + abs(y - cy)) % 6 < 2 else 'R1'
                else:
                    k = 'J1' if (x + y) % 4 == 0 else 'R0'
                put(x, y, k)
            else:                                     # tapis bleu rayé
                k = 'B1' if (y // 3) % 2 else 'B2'
                if y in (1, H - 2):
                    k = 'c2'
                put(x, y, k)
    outline(im)
    return im


def lit(enfant):
    W, H = (16, 26) if enfant else (20, 32)
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 4, 'w2')                   # tête de lit
    rect(put, 0, 0, W - 1, 0, 'w3')
    rect(put, 1, 5, W - 2, H - 3, 'c2')               # drap
    rect(put, 3, 6, W - 4, 9, 'b3')                   # oreiller
    rect(put, 3, 9, W - 4, 9, 'b1')
    cover = ('J1', 'J2', 'J0') if enfant else ('V1', 'V2', 'V0')
    rect(put, 1, 12, W - 2, H - 3, cover[0])          # couverture
    rect(put, 1, 12, W - 2, 13, cover[1])
    for y in range(15, H - 3, 4):
        for x in range(3, W - 3, 4):
            put(x, y, cover[1] if enfant else cover[2])
    rect(put, 0, H - 2, W - 1, H - 1, 'w1')           # pied de lit
    outline(im)
    return im


def chevet():
    W, H = 12, 20
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 8, 10, 18, 'w2')
    rect(put, 0, 7, 11, 8, 'w3')
    rect(put, 2, 11, 9, 11, 'w1'); put(6, 13, 'i3')
    rect(put, 4, 2, 7, 5, 'J2')                       # lampe
    rect(put, 5, 6, 6, 6, 'i2')
    outline(im)
    return im


def canape():
    W, H = 44, 24
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 3, 0, W - 4, 11, 'V1')                  # dossier
    rect(put, 3, 0, W - 4, 1, 'V2')
    rect(put, 0, 6, 4, 20, 'V0'); rect(put, W - 5, 6, W - 1, 20, 'V0')   # accoudoirs
    rect(put, 0, 6, 4, 7, 'V2')
    for x0 in (5, 17, 29):                            # trois coussins
        rect(put, x0, 11, x0 + 10, 17, 'V2')
        rect(put, x0, 17, x0 + 10, 17, 'V1')
    rect(put, 5, 18, W - 6, 20, 'V0')
    rect(put, 2, 21, 3, 23, 'w1'); rect(put, W - 4, 21, W - 3, 23, 'w1')
    outline(im)
    return im


def table_basse():
    W, H = 30, 12
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 2, W - 1, 5, 'w3')
    rect(put, 0, 2, W - 1, 2, 'w4')
    rect(put, 2, 6, 3, 11, 'w1'); rect(put, W - 4, 6, W - 3, 11, 'w1')
    rect(put, 10, 0, 13, 1, 'c2')                     # une tasse, un livre
    rect(put, 18, 0, 23, 1, 'R1')
    outline(im)
    return im


def tableau(n):
    W, H = {1: (20, 14), 2: (14, 18), 3: (22, 14)}[n]
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, H - 1, 'o1')               # cadre doré
    rect(put, 0, 0, W - 1, 0, 'o2'); rect(put, 0, H - 1, W - 1, H - 1, 'o0')
    if n == 1:                                        # la ferme : ciel, colline, maison rouge
        rect(put, 2, 2, W - 3, 7, 'e2')
        rect(put, 2, 8, W - 3, H - 3, 'g2')
        rect(put, 11, 5, 15, 9, 'R1'); rect(put, 11, 4, 15, 4, 'R0'); put(13, 8, 'w0')
        put(4, 3, 'J2'); put(5, 3, 'J2')
    elif n == 2:                                      # bouquet de fleurs dans un vase
        rect(put, 2, 2, W - 3, H - 3, 'c1')
        rect(put, 5, 10, 8, H - 4, 'B1')
        for (x, y, k) in ((4, 4, 'R2'), (7, 3, 'J1'), (9, 5, 'R1'), (6, 6, 'B2'), (3, 7, 'J2'), (9, 8, 'R2')):
            rect(put, x, y, x + 1, y + 1, k)
        rect(put, 6, 7, 7, 9, 'g1')
    else:                                             # la mer : ciel, vagues, voilier
        rect(put, 2, 2, W - 3, 6, 'e2')
        rect(put, 2, 7, W - 3, H - 3, 'e0')
        for x in range(2, W - 2, 3):
            put(x, 8, 'e1'); put(x + 1, 10, 'e1')
        rect(put, 12, 3, 12, 7, 'w1'); rect(put, 13, 3, 15, 6, 'c2'); rect(put, 10, 7, 15, 7, 'w2')
        put(5, 3, 'J2')
    outline(im)
    return im


def main():
    images = {
        'four': four(), 'cuisine': cuisine(), 'frigo': frigo(),
        'evier': evier(), 'plan': plan(), 'fenetre': fenetre(), 'plante': plante(),
        'chaise': chaise(), 'table': table(), 'tapis_1': tapis(1), 'tapis_2': tapis(2), 'tapis_3': tapis(3),
        'lit_adulte': lit(False), 'lit_enfant': lit(True), 'chevet': chevet(), 'canape': canape(),
        'table_basse': table_basse(), 'tableau_1': tableau(1), 'tableau_2': tableau(2), 'tableau_3': tableau(3),
    }
    out = {f'meuble_{k}.png': im for k, im in images.items()}
    for name, im in out.items():
        im.save(os.path.join(ROOT, 'assets', name), optimize=True)
    if '--apercu' in sys.argv:
        k = 4
        per = 7
        rows = [list(out.values())[i:i + per] for i in range(0, len(out), per)]
        W = max(sum(im.width * k + 16 for im in r) for r in rows)
        RH = max(im.height for im in out.values()) * k + 16
        ap = Image.new('RGBA', (W, RH * len(rows)), (152, 124, 88, 255))
        for j, r in enumerate(rows):
            x = 0
            for im in r:
                big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                ap.alpha_composite(big, (x, (j + 1) * RH - 8 - big.height))
                x += big.width + 16
        ap.save(os.path.join(ROOT, 'apercu_meubles.png'))
    print(f'meubles de la maison : {len(out)} images')


if __name__ == '__main__':
    main()
