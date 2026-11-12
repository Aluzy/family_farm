# Les fontaines de jardin de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : un décor de 2 × 2 cases posé
# dehors (data/recipes.json ATELIER.BLOCS fontaine_<modèle>, `dessin`), vu de haut à 45° (CLAUDE.md) :
#   - le bassin rond : une ellipse ; le dessus de sa margelle (un anneau, éclairé au fond à gauche), l'eau vue d'en
#     haut dedans (claire au bord, plus sombre au large, la paroi intérieure du fond qui y descend), la face
#     extérieure de la margelle sur la moitié avant ;
#   - au milieu, la colonne (un cylindre éclairé à gauche) qui porte la vasque (son dessus, son eau, sa face) et
#     l'ornement du modèle : une pomme de pin (pierre), une boule dorée (marbre), une grenouille qui crache l'eau
#     (pas de vasque), un angelot qui verse son urne.
# Nuances (CLAUDE.md, règle 5) : chaque pierre de la margelle sa rampe et son biseau, ombres froides, lumières
# chaudes, occlusion sous la vasque et au pied de la colonne ; des centaines de couleurs.
#
# L'eau qui bouge est à part (assets/fontaine_eau.png : une rangée par modèle, EAU_IMAGES images de W × H, posées
# par-dessus la fontaine, au même endroit) : les filets qui tombent de la vasque (ou le jet de la grenouille), les
# gouttes, les ronds dans l'eau du bassin ; la carte les fait défiler (js/carte/ferme/chantier.js stepLanterns).
#
#   python3 scripts/batiments/fontaines.py            écrit assets/meuble_fontaine_<modèle>.png et fontaine_eau.png
#   python3 scripts/batiments/fontaines.py --apercu   écrit aussi apercu_fontaines.png (agrandi, sur l'herbe)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))           # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))  # scripts/carte/nuances.py
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 32, 47                                # (le bas de la face du bassin : rangée 45 ; son contour : 46)
OUT = (30, 26, 30)
EAU_IMAGES = 4
CX = 15.5                                   # le milieu
BAS = H - 1                                 # le bas de l'image : le pied du bassin
# le bassin : le dessus de la margelle (l'ellipse extérieure, l'intérieure), sa face (FACE rangées sous l'ellipse)
RX, RY, CY = 15.5, 9.6, 30.5
RXI, RYI = 12.4, 7.2
FACE = 5
# la colonne et la vasque
COL = (14, 17)
VX, VY, VRX, VRY, VFACE = CX, 13.5, 7.5, 3.0, 2
EAU = rampe([(22, 50, 84), (34, 82, 124), (52, 120, 164), (90, 166, 204), (150, 210, 232), (220, 244, 252)], 140)
PIERRES = [rampe([(56, 58, 70), (96, 94, 100), (140, 134, 128), (182, 174, 160), (216, 208, 190), (240, 234, 220)], 160),
           rampe([(60, 58, 66), (102, 98, 98), (146, 138, 126), (188, 178, 160), (222, 212, 192), (244, 238, 222)], 160),
           rampe([(54, 58, 72), (92, 96, 106), (134, 136, 138), (176, 176, 170), (212, 212, 202), (238, 238, 228)], 160)]
MARBRES = [rampe([(126, 124, 140), (172, 170, 180), (208, 206, 208), (232, 230, 226), (248, 246, 240), (255, 254, 250)], 160),
           rampe([(130, 126, 134), (178, 172, 172), (214, 208, 202), (236, 230, 222), (250, 246, 238), (255, 253, 248)], 160),
           rampe([(120, 126, 142), (166, 172, 184), (204, 208, 214), (230, 232, 232), (246, 248, 246), (255, 255, 252)], 160)]
OR = rampe([(80, 52, 20), (140, 100, 36), (196, 152, 62), (234, 200, 110), (255, 244, 196)], 120)
VERT = rampe([(20, 56, 30), (40, 100, 46), (80, 150, 66), (140, 196, 96), (200, 232, 150)], 120)
MOUSSE = rampe([(40, 70, 40), (70, 110, 56), (110, 150, 74)], 80)
MODELES = ['pierre', 'marbre', 'grenouille', 'angelot']


def pierre_de(modele, x, y, lum, s=0):
    """La pierre de la fontaine en (x, y) : de petits blocs taillés (pierre) ou de grandes plaques veinées
    (marbre), chacun sa rampe, son ton, son biseau, son grain."""
    marbre = modele in ('marbre', 'angelot')
    R = MARBRES if marbre else PIERRES
    if marbre:
        k = (int(x // 8), int(y // 7))
        lum += 0.04 * bruit(k[0], k[1], 51 + s) + 0.02 * bruit(x, y, 52)
        if abs(math.sin(x * 0.5 + y * 0.9 + 2 * math.sin(y * 0.35) + k[0])) < 0.09:
            lum -= 0.14
        return ton(R[int((bruit(k[0], k[1], 53) + 1) * 1.5) % 3], lum)
    k = (int(x // 5), int(y // 3))
    u, v = (x % 5) / 4, (y % 3) / 2
    if x % 5 == 0 or y % 3 == 0:
        return ton(R[0], lum - 0.20)
    lum += 0.07 * bruit(k[0], k[1], 54 + s) + 0.05 * (u < 0.3) + 0.04 * (v < 0.5) - 0.05 * (u > 0.8) - 0.04 * (v > 0.9)
    lum += 0.025 * bruit(x, y, 55)
    return ton(R[int((bruit(k[0], k[1], 56) + 1) * 1.5) % 3], lum)


def fontaine(modele):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            px[int(x), int(y)] = tuple(int(v) for v in c[:3]) + (a,)

    # 1. la face extérieure de la margelle (la moitié avant de l'ellipse, descendue de FACE rangées)
    for x in range(W):
        u = (x + 0.5 - CX) / RX
        if abs(u) > 1:
            continue
        haut = CY + RY * math.sqrt(1 - u * u)
        for y in range(int(haut), int(haut) + FACE + 1):
            f = (y - haut) / FACE
            lum = 0.56 - 0.28 * (u + 1) / 2 - 0.16 * f - 0.08 * u * u
            put(x, y, pierre_de(modele, x, y + 40, lum, 1))
            if f > 0.7 and bruit(x, y, 57) > 0.5 and modele == 'pierre':
                put(x, y, ton(MOUSSE, 0.5 + 0.3 * bruit(x, y, 58)))   # un peu de mousse au pied
    # 2. le dessus de la margelle (l'anneau) et l'eau du bassin
    for y in range(int(CY - RY) - 1, int(CY + RY) + 2):
        for x in range(W):
            u, v = (x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY
            d = u * u + v * v
            if d > 1:
                continue
            ui, vi = (x + 0.5 - CX) / RXI, (y + 0.5 - CY) / RYI
            di = ui * ui + vi * vi
            if di > 1:                                       # la margelle : éclairée au fond à gauche
                ang = math.atan2(v, u)
                lum = 0.84 - 0.18 * (u + 1) / 2 + 0.10 * (v < 0) - 0.06 * (di < 1.25)
                put(x, y, pierre_de(modele, ang * 9 + 30, d * 9, lum, 2))
            else:                                            # l'eau, vue d'en haut
                prof = 1 - di
                lum = 0.62 - 0.30 * prof + 0.10 * (vi > 0.5) - 0.04 * ui + 0.03 * bruit(x, y, 59)
                if vi < -0.55 and di > 0.55:                 # la paroi intérieure du fond, qui descend dans l'eau
                    lum = 0.30 + 0.12 * (vi + 1)
                    put(x, y, pierre_de(modele, x, y + 60, lum, 3))
                    continue
                put(x, y, ton(EAU, lum))
    # quelques reflets sur l'eau, et l'ombre de la vasque au milieu
    for x, y in ((9, 33), (10, 33), (22, 34), (7, 29)):
        put(x, y, ton(EAU, 0.95))
    for y in range(int(CY - 2), int(CY + 3)):
        for x in range(10, 22):
            if ((x + 0.5 - CX) / 6) ** 2 + ((y + 0.5 - CY) / 2.4) ** 2 <= 1 and px[x, y][3]:
                r, g, b, a = px[x, y]
                px[x, y] = (r * 4 // 5, g * 4 // 5, b * 9 // 10, a)
    # 3. la colonne : un cylindre, éclairé à gauche, plus sombre au pied ; une bague
    haut_col = int(VY + VRY + VFACE) if modele != 'grenouille' else 18
    for y in range(haut_col, int(CY) + 1):
        for x in range(COL[0], COL[1] + 1):
            u = (x - COL[0]) / (COL[1] - COL[0])
            lum = 0.72 - 0.42 * u - 0.12 * (y - haut_col) / max(1, CY - haut_col)
            put(x, y, pierre_de(modele, x, y, lum, 4))
    for x in range(COL[0] - 1, COL[1] + 2):                  # la bague et le pied évasé
        u = (x - COL[0] + 1) / (COL[1] - COL[0] + 2)
        put(x, int(CY) - 6, pierre_de(modele, x, CY, 0.86 - 0.4 * u, 5))
        put(x, int(CY), pierre_de(modele, x, CY + 1, 0.60 - 0.35 * u, 5))
    # 4. la vasque (sauf la grenouille) : sa face, puis son dessus et son eau
    if modele != 'grenouille':
        for x in range(W):
            u = (x + 0.5 - VX) / VRX
            if abs(u) > 1:
                continue
            haut = VY + VRY * math.sqrt(1 - u * u)
            for y in range(int(haut), int(haut) + VFACE + 2):
                lum = 0.60 - 0.30 * (u + 1) / 2 - 0.12 * (y - haut) / (VFACE + 1)
                put(x, y, pierre_de(modele, x, y + 20, lum, 6))
        for y in range(int(VY - VRY) - 1, int(VY + VRY) + 2):
            for x in range(W):
                u, v = (x + 0.5 - VX) / VRX, (y + 0.5 - VY) / VRY
                if u * u + v * v > 1:
                    continue
                if u * u + v * v > 0.5:
                    put(x, y, pierre_de(modele, x * 2, y * 3, 0.88 - 0.2 * (u + 1) / 2 + 0.08 * (v < 0), 7))
                else:
                    put(x, y, ton(EAU, 0.70 - 0.25 * (1 - u * u - v * v) + 0.05 * bruit(x, y, 60)))
    # 5. l'ornement du modèle
    if modele == 'pierre':                                   # une pomme de pin sur son pied
        for y in range(4, 11):
            r = 2.6 - abs(y - 7.5) * 0.45
            for x in range(W):
                u = (x + 0.5 - CX) / max(0.6, r)
                if abs(u) <= 1:
                    lum = 0.74 - 0.35 * (u + 1) / 2 + (0.10 if (x + y) % 2 else -0.08)
                    put(x, y, pierre_de(modele, x + 100, y, lum, 8))
        for x in (15, 16):
            put(x, 11, pierre_de(modele, x, 11, 0.5, 9))
    elif modele == 'marbre':                                 # une boule dorée sur un piédouche de marbre
        for y in range(6, 11):
            for x in range(W):
                d = ((x + 0.5 - CX) / 2.6) ** 2 + ((y + 0.5 - 8.2) / 2.4) ** 2
                if d <= 1:
                    put(x, y, ton(OR, 0.98 - 0.55 * d - 0.20 * (x - 13) / 6 + (0.25 if x == 14 and y == 7 else 0)))
        for x in range(14, 18):
            put(x, 11, pierre_de(modele, x, 11, 0.8 - 0.1 * (x - 14), 9))
    elif modele == 'grenouille':                             # une grenouille assise en haut de la colonne
        for y in range(10, 19):
            for x in range(W):
                d = ((x + 0.5 - CX) / 4.6) ** 2 + ((y + 0.5 - 15) / 3.6) ** 2
                if d <= 1:
                    put(x, y, ton(VERT, 0.80 - 0.45 * d - 0.20 * (x - 11) / 9 + 0.04 * bruit(x, y, 61)))
        for x0 in (12, 18):                                  # ses yeux, leur reflet
            put(x0, 11, ton(VERT, 0.9)); put(x0 + 1, 11, ton(VERT, 0.6))
            put(x0, 12, (30, 26, 20)); put(x0 + 1, 12, (240, 230, 160))
        for x in range(13, 19):
            put(x, 15, ton(VERT, 0.3))                        # la bouche
        for x in (11, 20):                                    # les pattes avant
            put(x, 18, ton(VERT, 0.55)); put(x, 19, ton(VERT, 0.35))
    else:                                                    # un angelot qui tient une urne
        PEAU = rampe([(160, 120, 110), (214, 182, 168), (242, 224, 214), (255, 246, 240)], 100)
        for y in range(1, 11):
            for x in range(W):
                tete = ((x + 0.5 - 15.5) / 2.2) ** 2 + ((y + 0.5 - 2.8) / 2.0) ** 2
                corps = ((x + 0.5 - 15.5) / 2.8) ** 2 + ((y + 0.5 - 7.5) / 3.2) ** 2
                if tete <= 1 or corps <= 1:
                    d = min(tete, corps)
                    put(x, y, ton(PEAU, 0.92 - 0.45 * d - 0.25 * (x - 13) / 6))
        for y in range(4, 9):                                 # les ailes
            for x in (11, 12, 19, 20):
                if abs(x - 15.5) - 4 < (8 - y) * 0.5:
                    put(x, y, ton(MARBRES[1], 0.95 - 0.1 * (x > 15) - 0.05 * (8 - y)))
        for y in range(6, 10):                                # l'urne, penchée vers la droite
            for x in range(17, 21):
                put(x, y, ton(OR, 0.85 - 0.12 * (x - 17) - 0.06 * (y - 6)))
        put(14, 3, (90, 70, 60)); put(16, 3, (90, 70, 60))   # les yeux
    return contour(im, OUT)


def eau(modele, k):
    """L'eau qui bouge, image k : les filets qui tombent de la vasque (ou le jet de la grenouille, ou l'urne de
    l'angelot), les gouttes qui sautent, les ronds qui s'élargissent dans le bassin."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()

    def put(x, y, t, a):
        if 0 <= x < W and 0 <= y < H:
            px[int(x), int(y)] = ton(EAU, t) + (int(a),)

    ph = k / EAU_IMAGES
    if modele == 'grenouille':                               # un jet en arc de la bouche vers le bassin
        for i in range(40):
            f = i / 39
            x = 17 + f * 8
            y = 15 - 6 * f + 16 * f * f
            vif = ((i / 4 + k) % 2) < 1
            put(x, y, 0.95 if vif else 0.75, 230)
            put(x, y + 1, 0.70, 140)
        chutes = [(25, 32)]
    elif modele == 'angelot':                                # un filet de l'urne vers la vasque
        for y in range(9, 15):
            put(21, y, 0.95 if (y + k) % 3 else 0.7, 220)
            put(22, y, 0.75, 120)
        chutes = []
    else:
        chutes = []
    if modele != 'grenouille':                               # les filets qui débordent de la vasque, tout autour
        for xb in (9, 12, 19, 22):
            y0 = int(VY + VRY * math.sqrt(max(0, 1 - ((xb + 0.5 - VX) / VRX) ** 2)) + VFACE)
            y1 = int(CY + 2)
            for y in range(y0, y1):
                vif = ((y + k * 2 + xb) % 4) < 2
                put(xb, y, 0.92 if vif else 0.72, 200 if vif else 150)
            chutes.append((xb, y1))
    for i, (xc, yc) in enumerate(chutes):                    # les ronds dans l'eau, qui s'élargissent
        r = 1 + ((ph + i * 0.37) % 1) * 3.5
        for a in range(24):
            t = a / 24 * 2 * math.pi
            x, y = xc + r * math.cos(t), yc + r * 0.45 * math.sin(t)
            if ((x + 0.5 - CX) / RXI) ** 2 + ((y + 0.5 - CY) / RYI) ** 2 <= 1:
                put(x, y, 0.92, 210 * (1 - ((ph + i * 0.37) % 1) * 0.7))
        for j in range(2):                                   # les gouttes qui sautent
            g = (ph * 2 + j * 0.5 + i * 0.3) % 1
            put(xc + (j * 2 - 1) * (1 + g * 2), yc - 3 * math.sin(g * math.pi), 1.0, 230)
    return im


def main():
    for m in MODELES:
        fontaine(m).save(os.path.join(ASSETS, f'meuble_fontaine_{m}.png'), optimize=True)
    planche = Image.new('RGBA', (W * EAU_IMAGES, H * len(MODELES)), (0, 0, 0, 0))
    for r, m in enumerate(MODELES):
        for k in range(EAU_IMAGES):
            planche.alpha_composite(eau(m, k), (k * W, r * H))
    planche.save(os.path.join(ASSETS, 'fontaine_eau.png'))
    print(f'fontaines : {len(MODELES)} modèles de {W} × {H} ; l\'eau : {EAU_IMAGES} images par modèle')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', ((W + 8) * len(MODELES) * 2, H + 8), (92, 146, 62, 255))
        for i, m in enumerate(MODELES):
            for j in range(2):
                f = fontaine(m)
                if j:
                    f.alpha_composite(eau(m, 1))
                ap.alpha_composite(f, ((i * 2 + j) * (W + 8) + 4, 4))
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_fontaines.png'))


if __name__ == '__main__':
    main()
