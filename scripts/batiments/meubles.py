# Meubles de l'intérieur de la maison (assets/maison_interieur.json), un fichier
# assets/meuble_<nom>.png chacun :
#   - les appareils, qui ouvrent leur fenêtre : four (four à pain voûté, feu dans la gueule),
#     cuisine (fourneau sur son meuble, marmite fumante), frigo (réfrigérateur à deux portes) ;
#   - le décor de la cuisine : evier, plan (plan de travail), fenetre, plante ;
#   - cuisine et evier sont les modèles dessinés à la main, repris tels quels :
#     scripts/batiments/originaux/meuble_cuisine.png (32 × 32) et meuble_evier.png (32 × 26) ;
#   - les meubles du Marché (data/meubles.json) : chaise, table, tapis_1 à 3, lit_adulte,
#     lit_enfant, chevet, canape, table_basse, tableau_1 à 3 ;
#   - la paillasse (sans lit acheté, le personnage dort dessus) et les couvertures seules
#     des lits (lit_adulte_drap, lit_enfant_drap, paillasse_drap), posées sur le dormeur.
# Vue de dessus à 45° (comme la carte) : on voit le dessus de chaque meuble, raccourci, et sa
# face avant ; les tapis sont à plat, la fenêtre et les tableaux accrochés au mur (de face).
# Lumière en haut à gauche.
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


def box(put, x0, y0, w, depth, height, top, front, edge=None):
    """Un bloc vu de dessus à 45° : le dessus (w × depth, couleur `top`, bord avant `edge`)
    puis la face avant (w × height, couleur `front`), de (x0, y0) vers le bas."""
    rect(put, x0, y0, x0 + w - 1, y0 + depth - 1, top)
    if edge:
        rect(put, x0, y0 + depth - 1, x0 + w - 1, y0 + depth - 1, edge)
    if height > 0:
        rect(put, x0, y0 + depth, x0 + w - 1, y0 + depth + height - 1, front)


def doors(put, x0, y0, w, h, n=2):
    """Portes d'un meuble bas sur sa face avant : séparations sombres, moulures, poignées."""
    for i in range(1, n):
        x = x0 + i * w // n
        rect(put, x - 1, y0, x - 1, y0 + h - 1, 'w0')
    for i in range(n):
        a = x0 + i * w // n
        b = x0 + (i + 1) * w // n - 2
        rect(put, a + 1, y0 + 1, b - 1, y0 + 1, 'w3')
        put(b - 2 if i % 2 == 0 else a + 2, y0 + h // 2, 'i3')


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


def frigo():
    # le réfrigérateur : un mince dessus clair, puis la face avant à deux portes
    W, H = 20, 40
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 1, 0, 18, 5, 33, 'b3', 'b2', edge='b1')
    rect(put, 1, 5, 5, 37, 'b3')                      # reflet à gauche
    rect(put, 15, 5, 18, 37, 'b1')                    # ombre à droite
    rect(put, 1, 15, 18, 15, 'b0')                    # jointure congélateur / frigo
    for y in list(range(7, 13)) + list(range(18, 29)):  # poignées chromées
        put(14, y, 'ch')
        put(15, y, 'b0')
    rect(put, 2, 38, 17, 39, 'i1')                    # socle
    outline(im)
    return im

def plan():
    # plan de travail : un large dessus de bois clair (planche, courgette, couteau), deux portes
    W, H = 32, 24
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 11, 10, 'w4', 'w2', edge='w3')
    rect(put, 0, 13, 1, 22, 'w1')
    doors(put, 0, 13, W, 10)
    rect(put, 0, 23, W - 1, 23, 'w0')
    rect(put, 4, 4, 15, 10, 'w3')                     # planche à découper
    rect(put, 4, 10, 15, 10, 'w1')
    rect(put, 6, 6, 12, 7, 'g1'); rect(put, 6, 6, 12, 6, 'g2')   # une courgette couchée
    rect(put, 20, 6, 27, 6, 'b2'); rect(put, 20, 6, 22, 7, 'w0')  # couteau
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
    # plante verte : un feuillage en touffe vu d'en haut, dans un pot de terre cuite (le bord
    # du pot en ovale, la terre sombre dedans, puis la face avant du pot)
    W, H = 18, 24
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 4, 17, 13, 22, 't1')
    rect(put, 11, 17, 13, 22, 't0')
    rect(put, 4, 17, 5, 22, 't2')
    for y in range(13, 18):
        for x in range(2, 16):
            d = ((x - 8.5) / 6.8) ** 2 + ((y - 15) / 2.4) ** 2
            if d <= 1:
                put(x, y, 't2' if d > 0.55 else 'w0')
    leaves = [(9, 3), (5, 5), (13, 5), (3, 9), (15, 9), (7, 8), (11, 8), (9, 11), (5, 12), (13, 12)]
    for i, (cx, cy) in enumerate(leaves):
        for y in range(cy - 2, cy + 2):
            for x in range(cx - 2, cx + 2):
                if abs(x - cx + 0.5) + abs(y - cy + 0.5) <= 2.5:
                    put(x, y, 'g3' if y < cy - 0.5 and x < cx else 'g2' if (i + x) % 3 else 'g1')
    outline(im)
    return im

def chaise():
    # chaise : le dossier à barreaux derrière, l'assise vue de dessus, les pieds avant
    W, H = 14, 22
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 1, 0, 12, 1, 'w3')                      # haut du dossier
    for x in (1, 4, 7, 10, 12):
        rect(put, x, 2, x, 9, 'w2' if x < 12 else 'w1')
    box(put, 0, 10, W, 6, 2, 'w4', 'w2', edge='w3')   # assise : dessus clair, chant
    rect(put, 1, 18, 2, 21, 'w1'); rect(put, 11, 18, 12, 21, 'w1')
    outline(im)
    return im

def table():
    # table : le grand plateau vu de dessus (nappe, bol de fruits, pichet), son chant, et les
    # pieds avant
    W, H = 42, 26
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 2, W, 16, 3, 'w3', 'w1', edge='w2')
    rect(put, 0, 2, W - 1, 2, 'w4')
    rect(put, 3, 22 - 2, 5, 25, 'w2'); rect(put, W - 6, 22 - 2, W - 4, 25, 'w2')
    rect(put, 14, 5, 27, 14, 'c2')                    # nappe
    rect(put, 14, 14, 27, 14, 'c1')
    for y in range(6, 12):                            # bol de fruits
        for x in range(16, 25):
            if ((x - 20) / 4.5) ** 2 + ((y - 9) / 2.8) ** 2 <= 1:
                put(x, y, 't1' if y > 9 else 't2')
    put(18, 7, 'R1'); put(20, 7, 'J1'); put(22, 7, 'g2'); put(19, 8, 'R2'); put(21, 8, 'J2')
    rect(put, 31, 4, 34, 9, 'b2'); rect(put, 31, 4, 34, 4, 'b3')  # pichet
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
    # lit vu de dessus : la tête de lit contre le mur (son chant), le matelas, l'oreiller, la
    # couverture rabattue, et le pied de lit (sa face avant)
    W, H = (16, 28) if enfant else (20, 34)
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 0, W - 1, 3, 'w2')                   # tête de lit (vue d'en haut et de face)
    rect(put, 0, 0, W - 1, 0, 'w3')
    rect(put, 1, 4, W - 2, H - 5, 'c2')               # matelas
    rect(put, 3, 5, W - 4, 9, 'b3')                   # oreiller
    rect(put, 3, 9, W - 4, 9, 'b1')
    cover = ('J1', 'J2', 'J0') if enfant else ('V1', 'V2', 'V0')
    rect(put, 1, 12, W - 2, H - 5, cover[0])          # couverture, le haut rabattu
    rect(put, 1, 12, W - 2, 14, cover[1])
    rect(put, W - 3, 15, W - 2, H - 5, cover[2])      # le pli sur le côté droit
    for y in range(17, H - 5, 4):
        for x in range(3, W - 4, 4):
            put(x, y, cover[1] if enfant else cover[2])
    box(put, 0, H - 4, W, 1, 3, 'w3', 'w1')           # pied de lit : son dessus, sa face
    outline(im)
    return im

def paillasse():
    # sans lit acheté, on dort sur une paillasse posée par terre : le matelas de paille (ses
    # brins), l'oreiller, une couverture bleue rapiécée. Mêmes proportions que le lit adulte
    # (l'oreiller aux rangées 5 à 9, la couverture à partir de la rangée 12) : le personnage
    # s'y couche de la même façon.
    W, H = 20, 34
    im = canvas(W, H)
    put, _ = painter(im)
    rect(put, 0, 3, W - 1, H - 2, 'J0')               # matelas de paille
    rect(put, 1, 3, W - 2, H - 3, 'J1')
    for y in range(4, H - 3, 3):                      # brins de paille
        for x in range(1 + y % 2, W - 1, 3):
            put(x, y, 'J2')
    rect(put, 3, 5, W - 4, 9, 'b3')                   # oreiller
    rect(put, 3, 9, W - 4, 9, 'b1')
    rect(put, 1, 12, W - 2, H - 3, 'B1')              # couverture, le haut rabattu
    rect(put, 1, 12, W - 2, 14, 'B2')
    rect(put, 4, 19, 8, 23, 'R1'); rect(put, 11, 25, 15, 28, 'J2')   # pièces cousues
    rect(put, 1, H - 3, W - 2, H - 3, 'B0')
    outline(im)
    return im


def drap(im, y0):
    # la couverture seule (les rangées y0 et suivantes de l'image du lit) : posée par-dessus
    # le personnage couché, elle le cache jusqu'aux épaules
    out = im.copy()
    px = out.load()
    for y in range(min(y0, out.height)):
        for x in range(out.width):
            px[x, y] = (0, 0, 0, 0)
    return out


def chevet():
    # table de chevet : son dessus (la lampe posée dessus), sa face avec un tiroir
    W, H = 14, 22
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 9, W, 5, 8, 'w4', 'w2', edge='w3')
    rect(put, 2, 15, 11, 15, 'w1'); put(7, 17, 'i3')
    rect(put, 1, 21, 2, 21, 'w0'); rect(put, 11, 21, 12, 21, 'w0')
    rect(put, 5, 9, 8, 11, 'i2')                      # pied de la lampe, posé sur le dessus
    for y in range(2, 8):                             # abat-jour
        for x in range(3, 11):
            if abs(x - 6.5) <= 2 + (y - 2) * 0.5:
                put(x, y, 'J2' if x < 7 else 'J1')
    outline(im)
    return im

def canape():
    # canapé vu de dessus à 45° : le haut du dossier, le dossier, les trois coussins de
    # l'assise (leur dessus), les accoudoirs (dessus et face), la face avant
    W, H = 46, 28
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 3, 0, W - 6, 3, 8, 'V2', 'V1')           # dossier : son haut, sa face
    for x0 in (6, 18, 30):                            # coussins du dossier
        rect(put, x0, 4, x0 + 9, 9, 'V1')
        rect(put, x0, 4, x0 + 9, 4, 'V2')
    for x0 in (5, 17, 29):                            # coussins de l'assise, vus de dessus
        box(put, x0, 11, 12, 7, 2, 'V2', 'V1')
        rect(put, x0 + 11, 11, x0 + 11, 19, 'V0')
    box(put, 0, 6, 5, 6, 12, 'V2', 'V0')              # accoudoirs
    box(put, W - 5, 6, 5, 6, 12, 'V2', 'V0')
    rect(put, 5, 20, W - 6, 23, 'V0')                 # face avant
    rect(put, 2, 24, 3, 27, 'w1'); rect(put, W - 4, 24, W - 3, 27, 'w1')
    outline(im)
    return im

def table_basse():
    # table basse : le plateau vu de dessus (une tasse, un livre), son chant, des pieds courts
    W, H = 30, 18
    im = canvas(W, H)
    put, _ = painter(im)
    box(put, 0, 0, W, 11, 3, 'w3', 'w1', edge='w2')
    rect(put, 0, 0, W - 1, 0, 'w4')
    rect(put, 2, 14, 3, 17, 'w1'); rect(put, W - 4, 14, W - 3, 17, 'w1')
    rect(put, 6, 3, 9, 6, 'c2'); rect(put, 7, 4, 8, 5, 'w0')      # tasse vue d'en haut
    rect(put, 15, 3, 23, 8, 'R1'); rect(put, 15, 3, 23, 3, 'R2')  # livre
    rect(put, 22, 3, 23, 8, 'c2')
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


def modele(nom):
    return Image.open(os.path.join(ROOT, 'scripts', 'batiments', 'originaux', f'meuble_{nom}.png')).convert('RGBA')


def main():
    images = {
        'four': four(), 'cuisine': modele('cuisine'), 'frigo': frigo(),
        'evier': modele('evier'), 'plan': plan(), 'fenetre': fenetre(), 'plante': plante(),
        'chaise': chaise(), 'table': table(), 'tapis_1': tapis(1), 'tapis_2': tapis(2), 'tapis_3': tapis(3),
        'lit_adulte': lit(False), 'lit_enfant': lit(True), 'chevet': chevet(), 'canape': canape(),
        'table_basse': table_basse(), 'tableau_1': tableau(1), 'tableau_2': tableau(2), 'tableau_3': tableau(3),
    }
    images['paillasse'] = paillasse()
    # les couvertures des lits (rangée 12 : le haut rabattu) : js/fermier.js les pose
    # par-dessus le personnage quand il dort
    for k in ('lit_adulte', 'lit_enfant', 'paillasse'):
        images[k + '_drap'] = drap(images[k], 12)
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
