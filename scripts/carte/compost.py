#!/usr/bin/env python3
"""Le bac à compost (js/engine/compost.js, docs/compost.md), maquette C3 : un bac de planches debout, son
couvercle relevé contre le fond, vu de haut à 45° comme les autres blocs.

Le dessin est fait en coordonnées continues (une case = 16 unités), échantillonnées au centre de chaque pixel :
  compost(niveau)        l'image du bloc, 16 × 24 (scripts/carte/blocs.py la range dans assets/blocs.png)
  compost(niveau, k=2)   deux fois plus grande, pour l'icône (scripts/icones/compost.py)
`niveau` : 0 vide, 1 moins de la moitié de ses engrais, 2 la moitié au moins (le compost déborde, une pousse
dessus) ; la carte choisit l'image selon ce que le bac contient (js/carte/ferme/chantier.js).

La lumière vient d'en haut à gauche ; des rampes de seize tons (les ombres froides, tirant sur le prune, les
lumières chaudes, tirant sur le miel), chaque planche sa teinte, le fil du bois, les clous, l'ombre portée du
couvercle sur le compost, un peu de mousse au pied ; un contour sombre teinté du ton voisin.
"""
import math

from PIL import Image

# le bois : du prune sombre au miel clair
BOIS = [(34, 18, 24), (62, 32, 30), (96, 50, 34), (132, 74, 42), (166, 104, 56), (196, 136, 76), (222, 170, 106), (244, 208, 150)]
# le bois du couvercle, un peu plus gris (il prend la pluie)
VIEUX = [(30, 22, 28), (56, 40, 40), (86, 62, 50), (118, 88, 64), (148, 116, 84), (180, 148, 108), (212, 184, 142)]
FER = [(24, 24, 34), (58, 58, 70), (104, 104, 114), (164, 164, 170), (222, 222, 226)]
# le compost : du presque noir au brun chaud ; les bribes (épluchures, feuilles, coquilles)
TERRE = [(18, 10, 10), (36, 22, 16), (58, 36, 22), (82, 52, 30), (108, 72, 42), (138, 96, 58), (166, 124, 80)]
BRIBES = [(92, 138, 50), (128, 168, 66), (70, 112, 44), (204, 122, 48), (170, 78, 46), (226, 214, 180)]
MOUSSE = [(46, 84, 40), (70, 116, 48), (104, 148, 60)]
POUSSE = [(56, 104, 40), (96, 154, 58), (150, 200, 84)]

# les planches de la face (5) et du couvercle (4) : leur écart de ton, leur teinte (+ chaude, - froide)
PLANCHES = [(0.03, 0.02), (-0.04, -0.03), (0.05, 0.04), (-0.02, -0.02)]
PL_COUV = [(0.02, 0.0), (-0.05, -0.02), (0.04, 0.02), (-0.02, 0.01)]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rampe(cles, n):
    out = []
    for k in range(n):
        f = k / (n - 1) * (len(cles) - 1)
        i = min(int(f), len(cles) - 2)
        out.append(lerp(cles[i], cles[i + 1], f - i))
    return out


def ton(r, v, chaud=0.0):
    c = r[max(0, min(len(r) - 1, round(v * (len(r) - 1))))]
    if chaud:   # (une planche plus chaude ou plus froide : le rouge et le bleu bougent en sens contraires)
        c = (max(0, min(255, round(c[0] * (1 + chaud)))), c[1], max(0, min(255, round(c[2] * (1 - chaud * 1.5)))))
    return c


def hasard(*k):
    x = math.sin(sum(v * c for v, c in zip(k, (12.9898, 78.233, 37.719, 4.581))) + 0.5) * 43758.5453
    return x - math.floor(x)


# la géométrie (en unités d'une case de 16) : le bac, de X0 à X1 ; le dessus de ses bords de YT à YF ; sa face
# de YF à YB ; le couvercle relevé de YC à YT
X0, X1 = 1.0, 15.0
YC, YT, YF, YB = 1.5, 8.5, 15.0, 22.5
EP = 1.0          # l'épaisseur des planches (le bord, vu de dessus)
JOINTS = (4, 8, 12)   # les colonnes des joints entre les planches de la face (4 planches)
CLOUS = (2, 13)        # les clous des traverses, aux deux bouts


def compost(niveau=2, k=1):
    W, H = 16 * k, 24 * k
    bois, vieux, fer, terre = rampe(BOIS, 16), rampe(VIEUX, 16), rampe(FER, 8), rampe(TERRE, 16)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    P = im.load()
    larg = X1 - X0
    # la hauteur du tas au-dessus du fond (en unités de l'écran : il monte vers le haut)
    haut_tas = [0.8, 3.6, 7.6][niveau]

    def tas_haut(x):
        """Le haut du tas de compost à l'abscisse x (une ordonnée d'écran), ou None."""
        dx = (x - (X0 + larg / 2 - 0.3)) / (larg / 2 - EP)
        if abs(dx) >= 1:
            return None
        bosse = 0.55 * math.sin(x * 2.1 + niveau) + 0.35 * math.sin(x * 4.7 + 1.3)
        return YF - 0.6 - haut_tas * (1 - dx * dx) ** 0.7 - (bosse if niveau else 0.2 * bosse)

    for py in range(H):
        for pxx in range(W):
            x, y = (pxx + 0.5) / k, (py + 0.5) / k
            if not (X0 <= x < X1):
                continue
            u = (x - X0) / larg                      # 0 à gauche, 1 à droite
            c = None
            # 1. le couvercle relevé, contre le fond (ses planches debout, deux traverses, les charnières)
            retrait = 0.9 * max(0, (YT - y) / (YT - YC))
            if YC <= y < YT + 0.5 and X0 + retrait <= x < X1 - retrait:
                u = (x - X0 - retrait) / (larg - 2 * retrait)
                pl = min(3, int(u * 4))
                v0, ch = PL_COUV[pl]
                fil = 0.03 * math.sin(y * 3.1 + pl * 2.0) + 0.02 * math.sin(y * 7.3 + x)
                v = 0.62 - 0.30 * u + v0 + fil - 0.10 * (y - YC) / (YT - YC)
                if (u * 4) % 1 > 0.86 and pl < 3:
                    v -= 0.26                                        # le joint entre deux planches
                if abs(y - (YC + 1.6)) < 0.55 or abs(y - (YT - 1.6)) < 0.55:
                    v = 0.50 - 0.26 * u                               # les traverses
                    if abs(y - (YC + 2.2)) < 0.5 or abs(y - (YT - 1.0)) < 0.5:
                        v -= 0.14                                     # (leur ombre)
                if y < YC + 0.6:
                    v += 0.12                                         # la tranche du haut, éclairée
                c = ton(vieux, v, ch)
                # les clous des traverses
                for cx_ in (X0 + 1.6, X1 - 1.8):
                    for cy_ in (YC + 1.6, YT - 1.6):
                        if abs(x - cx_) < 0.5 and abs(y - cy_) < 0.5:
                            c = ton(fer, 0.62 if cx_ < 8 else 0.42)
                # les charnières, en bas
                for cx_ in (X0 + 3.0, X1 - 3.2):
                    if abs(x - cx_) < 1.0 and YT - 0.6 <= y:
                        c = ton(fer, 0.5 - 0.2 * u + (0.2 if x < cx_ else 0))
            u = (x - X0) / larg
            # 2. le dessus du bac : ses bords (le bout des planches) et le dedans
            if YT <= y < YF:
                bord = x < X0 + EP or x >= X1 - EP or y < YT + EP * 0.7 or y >= YF - EP
                if bord:
                    v = 0.78 - 0.30 * u
                    if y >= YF - EP:
                        v += 0.06                                     # le bord de devant, en pleine lumière
                    if x >= X1 - EP:
                        v -= 0.12
                    pl = sum(1 for j in JOINTS if x >= j)
                    c = ton(bois, v + PLANCHES[pl][0], PLANCHES[pl][1])
                    if y >= YF - EP and int(x) in JOINTS:
                        c = ton(bois, v - 0.3)                        # les bouts des planches, séparés
                else:
                    # le dedans : le fond, sombre ; l'ombre du couvercle et du bord de gauche
                    ombre = 0.10 * max(0, 1 - (y - YT) / 2.5) + 0.06 * max(0, 1 - (x - X0) / 2.5)
                    c = ton(terre, 0.14 - ombre + 0.05 * (hasard(pxx, py, 3) - 0.5))
            # 3. le tas de compost (par-dessus le dedans, et au-dessus du bord quand il déborde)
            th = tas_haut(x)
            if th is not None and th <= y < YF - (EP if y >= YT else 0) and (y >= YT + EP * 0.7 or niveau == 2):
                if y >= YT + EP * 0.7 or (y < YT + EP * 0.7 and th < YT):
                    prof = (y - th) / max(1.0, haut_tas)
                    v = 0.80 - 0.34 * u - 0.40 * prof + 0.14 * (hasard(pxx // k, py // k, 7) - 0.5)
                    v -= (0.18 - 0.1 * niveau) * max(0, 1 - (y - YT) / 2.0) if y > YT else 0   # l'ombre du couvercle, au fond
                    if y - th < 1.0:
                        v += 0.14                                     # le dessus du tas, dans la lumière
                    c = ton(terre, v)
                    # des bribes en surface : une épluchure, une feuille, une coquille
                    if y - th < 2.2 and hasard(pxx // k * 3, py // k * 5, niveau) > (0.80 if niveau == 2 else 0.88):
                        b = BRIBES[int(hasard(py // k, pxx // k, 11) * len(BRIBES))]
                        c = lerp(b, (0, 0, 0), 0.25 * prof + 0.2 * u)
            # 4. la face : cinq planches debout, deux traverses clouées, l'ombre au pied, un peu de mousse
            if YF <= y < YB:
                pl = sum(1 for j in JOINTS if x >= j)
                v0, ch = PLANCHES[pl]
                fil = 0.035 * math.sin(y * 2.6 + pl * 1.7) + 0.02 * math.sin(y * 6.1 + x * 0.7)
                v = 0.70 - 0.36 * u + v0 + fil
                joint = int(x) in JOINTS
                if int(x) + 1 in JOINTS:
                    v -= 0.06                                            # chaque planche s'arrondit vers sa droite
                if int(x) - 1 in JOINTS or x < X0 + 1:
                    v += 0.07                                            # et accroche la lumière à sa gauche
                if joint:
                    v -= 0.32                                            # le joint
                tr = [YF + 2.0, YB - 2.4]
                for t in tr:
                    if abs(y - t) < 0.55:
                        v = 0.56 - 0.32 * u                              # une traverse
                    elif t + 0.55 <= y < t + 1.1:
                        v -= 0.16                                        # son ombre
                if y < YF + 0.5:
                    v += 0.10                                            # l'arête du haut
                v -= 0.22 * max(0, (y - (YB - 1.6)) / 1.6)               # l'ombre au pied
                c = ton(bois, v, ch)
                if joint and niveau and YF + 1.2 < y < YB - 1.6 and hasard(pxx // k, py // k, 2) > 0.55:
                    c = ton(terre, 0.22)                                 # (le compost entre deux planches)
                # les clous des traverses : un par planche
                for t in tr:
                    if abs(y - t) < 0.5 and int(x) in CLOUS:
                        c = ton(fer, 0.7 - 0.4 * u)
                # la mousse au pied, aux coins
                if y >= YB - 1.4 and (x < X0 + 2.2 or x > X1 - 1.8) and hasard(pxx // k, py // k, 5) > 0.35:
                    c = MOUSSE[int(hasard(py // k, pxx // k, 9) * 3)]
            if c is not None:
                P[pxx, py] = c + (255,)
    # la pousse du bac plein, sur le tas
    if niveau == 2:
        for (dx, dy, i) in ((0, 0, 0), (0, -1, 1), (-1, -2, 2), (1, -2, 1), (1, -3, 2)):
            x, y = 9 + dx, int(tas_haut(9.5) - 0.4) + dy
            for a in range(k):
                for b in range(k):
                    P[x * k + a, y * k + b] = POUSSE[i] + (255,)
    # le contour sélectif : sombre, teinté du ton voisin ; plus doux en haut à gauche
    contour = []
    for y in range(H):
        for x in range(W):
            if P[x, y][3]:
                continue
            vois = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < W and 0 <= y + b < H and P[x + a, y + b][3]]
            if vois:
                r, g, b, _ = P[vois[0]]
                q = 0.42 if (x < W / 2 and y < H / 2) else 0.26
                contour.append((x, y, (int(r * q + 14), int(g * q + 6), int(b * q + 10), 255)))
    for x, y, c in contour:
        P[x, y] = c
    return im


if __name__ == '__main__':
    import sys
    out = Image.new('RGBA', (3 * 16 * 8 + 40, 24 * 8 + 20), (98, 148, 66, 255))
    for n in range(3):
        g = compost(n).resize((128, 192), Image.NEAREST)
        out.alpha_composite(g, (10 + n * 138, 10))
    out.save(sys.argv[1] if len(sys.argv) > 1 else 'apercu_compost.png')
