# Les équipements de la grande ville, dessinés une fois puis posés sur les toiles (comme
# scripts/ville/objets.py) : la voie ferrée et ses quais, les étals du marché, la statue du
# parc, l'amphithéâtre, les jeux d'enfants, les cheminées d'usine, les caisses des entrepôts,
# l'abri de bus et les enseignes (une petite police de 3 × 5 px).
import math

from commun import K, contour, dessin, hasard, image, mel, rgba, teinte
from objets import BOIS, BOIS_C, BOIS_K, MARGELLE, VITRE, VITRE_C, VITRE_S

ACIER = ((70, 72, 80), (120, 124, 134), (176, 180, 188))
BALLAST = ((104, 98, 94), (128, 122, 116), (84, 78, 76), (150, 144, 138))
TRAVERSE = ((92, 64, 44), (118, 84, 58), (64, 44, 32))
PIERRE = ((208, 190, 152), (172, 154, 122), (226, 212, 180), (140, 124, 98))


# ---------- les enseignes ----------

# une police de 3 × 5 px, en capitales (assez pour les noms de la ville)
FONTE = {
    'A': ('010', '101', '111', '101', '101'), 'B': ('110', '101', '110', '101', '110'),
    'C': ('011', '100', '100', '100', '011'), 'D': ('110', '101', '101', '101', '110'),
    'E': ('111', '100', '110', '100', '111'), 'É': ('111', '100', '110', '100', '111'),
    'F': ('111', '100', '110', '100', '100'), 'G': ('011', '100', '101', '101', '011'),
    'H': ('101', '101', '111', '101', '101'), 'I': ('111', '010', '010', '010', '111'),
    'J': ('001', '001', '001', '101', '010'), 'L': ('100', '100', '100', '100', '111'),
    'M': ('10001', '11011', '10101', '10001', '10001'), 'N': ('1001', '1101', '1011', '1001', '1001'),
    'O': ('010', '101', '101', '101', '010'), 'P': ('110', '101', '110', '100', '100'),
    'Q': ('010', '101', '101', '011', '001'), 'R': ('110', '101', '110', '101', '101'),
    'S': ('011', '100', '010', '001', '110'), 'T': ('111', '010', '010', '010', '010'),
    'U': ('101', '101', '101', '101', '111'), 'V': ('101', '101', '101', '101', '010'),
    'X': ('101', '101', '010', '101', '101'), 'Y': ('101', '101', '010', '010', '010'),
    'Z': ('111', '001', '010', '100', '111'), ' ': ('0', '0', '0', '0', '0'),
}


def largeur_texte(texte):
    return sum(len(FONTE[c][0]) + 1 for c in texte) - 1


def texte(im, x, y, mot, encre):
    for c in mot:
        g = FONTE[c]
        for j, ligne in enumerate(g):
            for i, b in enumerate(ligne):
                if b == '1':
                    im.putpixel((x + i, y + j), rgba(encre))
        if c == 'É':
            im.putpixel((x + 1, y - 2), rgba(encre))
        x += len(g[0]) + 1


def enseigne(mot, fond=(236, 228, 204), encre=(52, 40, 36), bord=BOIS_K):
    """Un panneau d'enseigne : le mot en capitales sur un fond clair, cerclé de bois ; sa
    largeur arrondie à la tuile (centré dedans)."""
    w = largeur_texte(mot) + 8
    W = -(-w // 16) * 16
    im = image(W, 14)
    d = dessin(im)
    x0 = (W - w) // 2
    d.rectangle((x0, 1, x0 + w - 1, 12), fill=rgba(K))
    d.rectangle((x0 + 1, 2, x0 + w - 2, 11), fill=rgba(bord))
    d.rectangle((x0 + 2, 3, x0 + w - 3, 10), fill=rgba(fond))
    d.rectangle((x0 + 2, 10, x0 + w - 3, 10), fill=rgba(teinte(fond, 0.85)))
    texte(im, x0 + 4, 5, mot, encre)
    return im


# ---------- la voie ferrée ----------

def voie(t, xc, y0, y1, nue=False):
    """Une voie ferrée verticale (px), centrée sur xc (multiple de 16) : le ballast sur deux
    tuiles, les traverses tous les 8 px, les deux rails. nue : sans ballast ni traverses (le
    passage à niveau, les rails pris dans la chaussée)."""
    for y in range(y0, y1):
        for x in range(xc - 16, xc + 16):
            u = x - xc
            if not nue:
                c = BALLAST[int(hasard(x % 16, y % 16, 61) * 4)]
                if abs(u) >= 15:
                    c = teinte(c, 0.8)
                if y % 8 < 4 and -14 <= u <= 13:
                    q = y % 8
                    c = TRAVERSE[2] if q == 3 or u in (-14, 13) else TRAVERSE[1] if q == 0 else TRAVERSE[0]
                t.put(x, y, c)
            if u in (-9, 8):
                t.put(x, y, ACIER[0])
            elif u in (-8, 7):
                t.put(x, y, ACIER[2] if not nue else ACIER[1])
            elif nue and u in (-10, -7, 6, 9):
                t.put(x, y, (52, 48, 50))


def ballast(t, x0, x1, y0, y1):
    """Le ballast seul (px), entre deux voies."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            t.put(x, y, BALLAST[int(hasard(x % 16, y % 16, 61) * 4)])


def zebre(t, x0, x1, y0, y1, horizontal):
    """Un passage piéton (px) : des bandes blanches de 6 px tous les 12 px, en travers de la
    chaussée (horizontal : la chaussée va de gauche à droite, les bandes sont verticales)."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            q = (x if horizontal else y) % 12
            if 3 <= q < 9:
                c = (222, 220, 212) if hasard(x, y, 71) > 0.06 else (196, 194, 186)
                t.put(x, y, c)


def bord_de_quai(t, x, y0, y1):
    """La ligne jaune du bord de quai (px), deux pixels de large."""
    for y in range(y0, y1):
        t.put(x, y, (226, 196, 72))
        t.put(x + 1, y, (196, 166, 56))


# ---------- le marché ----------

AUVENTS = {
    'rouge': ((196, 58, 52), (236, 230, 220)), 'vert': ((70, 146, 72), (236, 230, 220)),
    'jaune': ((232, 182, 58), (226, 120, 52)), 'bleu': ((70, 112, 186), (236, 230, 220)),
    'violet': ((132, 84, 160), (236, 230, 220)),
}
PRODUITS = [(206, 54, 46), (98, 168, 64), (234, 132, 40), (240, 214, 120), (150, 70, 140), (226, 196, 80)]


def etal(couleur, graine=0):
    """3 × 3 tuiles : un étal du marché vu de 3/4, l'auvent rayé en haut, le comptoir et ses
    cagettes de fruits et légumes devant."""
    im = image(48, 48)
    d = dessin(im)
    a, b = AUVENTS[couleur]
    d.ellipse((4, 40, 44, 47), fill=(0, 0, 0, 60))
    # les montants
    for x in (5, 41):
        d.rectangle((x, 12, x + 2, 42), fill=rgba(BOIS_K))
    # le comptoir : le dessus (vu de 3/4) et sa face
    d.rectangle((3, 26, 44, 31), fill=rgba(BOIS_C))
    d.rectangle((3, 32, 44, 42), fill=rgba(BOIS))
    for x in range(6, 44, 8):
        d.line((x, 33, x, 41), fill=rgba(BOIS_K))
    # les cagettes et leurs produits
    for i in range(4):
        x0 = 5 + i * 10
        p = PRODUITS[int(hasard(graine, i, 5) * len(PRODUITS))]
        d.rectangle((x0, 24, x0 + 8, 29), fill=rgba(BOIS_K))
        d.rectangle((x0 + 1, 25, x0 + 7, 28), fill=rgba(teinte(BOIS_C, 1.1)))
        for j in range(5):
            px, py = x0 + 1 + (j * 3) % 7, 21 + (j % 2) * 2
            d.ellipse((px, py, px + 3, py + 3), fill=rgba(p))
            im.putpixel((px + 1, py + 1), rgba(teinte(p, 1.3)))
    # l'auvent : un pan rayé incliné, son bord festonné
    for y in range(2, 16):
        for x in range(1, 47):
            q = (y - 2) / 13
            if x < 1 + q * 1 or x > 46 - q * 1:
                continue
            c = a if (x // 6) % 2 == 0 else b
            c = teinte(c, 1.08 - 0.18 * q)
            im.putpixel((x, y), rgba(c))
    for x in range(1, 47):
        k = x % 6
        if k in (1, 2, 3, 4):
            c = a if (x // 6) % 2 == 0 else b
            im.putpixel((x, 16), rgba(teinte(c, 0.8)))
            if k in (2, 3):
                im.putpixel((x, 17), rgba(teinte(c, 0.7)))
    d.line((1, 2, 46, 2), fill=rgba(teinte(a, 1.2)))
    return contour(im)


# ---------- le parc ----------

def statue():
    """6 × 6 tuiles : le monument du parc, en vue de dessus à 45° comme le reste de la ville : trois
    degrés et un socle (le dessus de chacun, éclairé, puis sa face de devant), et la figure de
    bronze debout dessus, un bras levé (le haut de sa tête et de ses épaules vu d'en haut).
    L'image est carrée (96 × 96) ; le milieu du dessus du premier degré : (48, 79)."""
    im = image(96, 96)
    d = dessin(im)

    def bloc(x0, x1, y, dessus, face):
        """Un bloc de pierre : son dessus (de y, haut de `dessus` px) puis sa face (haute de `face`)."""
        d.rectangle((x0, y, x1, y + dessus - 1), fill=rgba(PIERRE[2]))
        d.line((x0, y, x1, y), fill=rgba(teinte(PIERRE[2], 1.06)))
        d.line((x1, y, x1, y + dessus - 1), fill=rgba(PIERRE[0]))
        f = y + dessus
        d.rectangle((x0, f, x1, f + face - 1), fill=rgba(PIERRE[0]))
        d.rectangle((x0, f, x0 + 1, f + face - 1), fill=rgba(PIERRE[2]))
        d.rectangle((x1 - 2, f, x1, f + face - 1), fill=rgba(PIERRE[1]))
        d.line((x0, f + face - 1, x1, f + face - 1), fill=rgba(PIERRE[3]))
        d.line((x0, f, x1, f), fill=rgba(PIERRE[1]))

    # les trois degrés, du plus large (devant, en bas) au plus étroit
    bloc(4, 91, 71, 15, 6)
    bloc(13, 82, 63, 13, 6)
    bloc(22, 73, 56, 11, 6)
    # le socle : son dessus (où se tient la figure), sa face (la plaque), la corniche
    bloc(31, 64, 23, 12, 22)
    d.rectangle((29, 33, 66, 35), fill=rgba(PIERRE[1]))
    d.line((29, 33, 66, 33), fill=rgba(PIERRE[2]))
    d.rectangle((40, 41, 55, 50), fill=rgba(PIERRE[1]))
    d.rectangle((41, 42, 54, 49), fill=rgba(teinte(PIERRE[1], 1.08)))
    # la figure : son ombre sur le socle, la robe (vue d'en haut : courte), les épaules, la tête,
    # le bras levé
    BR = ((58, 96, 86), (88, 132, 116), (126, 170, 150), (40, 70, 64))
    d.ellipse((38, 26, 59, 33), fill=(0, 0, 0, 70))
    d.polygon(((38, 31), (58, 31), (56, 18), (40, 18)), fill=rgba(BR[1]))
    d.polygon(((38, 31), (58, 31), (57, 26), (39, 26)), fill=rgba(BR[0]))
    d.line((48, 19, 48, 30), fill=rgba(BR[0]))
    d.ellipse((37, 13, 59, 21), fill=rgba(BR[1]))                      # les épaules
    d.ellipse((39, 13, 51, 18), fill=rgba(BR[2]))
    d.line((39, 18, 37, 27), fill=rgba(BR[0]), width=4)                 # le bras le long du corps
    d.line((56, 16, 66, 3), fill=rgba(BR[1]), width=5)                  # le bras levé
    d.line((55, 15, 64, 3), fill=rgba(BR[2]), width=1)
    d.ellipse((63, 0, 69, 6), fill=rgba(BR[1]))                         # la main
    d.ellipse((42, 4, 54, 15), fill=rgba(BR[1]))                        # la tête
    d.ellipse((43, 4, 51, 10), fill=rgba(BR[2]))
    d.arc((42, 4, 54, 15), 20, 160, fill=rgba(BR[3]))
    return contour(im)


def amphitheatre(t, cx, cy, rx, ry, rangs=5):
    """Les gradins (px) : des demi-anneaux de pierre vus de 3/4 autour d'une scène de terre
    battue, ouverte vers le bas de l'écran ; cx, cy : le milieu du devant de la scène."""
    pas = rx / (rangs + 2)

    def f(x, y):
        dx, dy = x + 0.5 - cx, (y + 0.5 - cy) * rx / ry
        if dy > 0:
            return None
        r = math.hypot(dx, dy)
        if r > rx:
            return None
        k = r / pas
        if k < 2:                       # la scène
            c = (196, 170, 124) if hasard(x % 16, y % 16, 3) > 0.1 else (176, 150, 108)
            return K if k > 1.94 else c
        q = (k - 2) % 1
        c = PIERRE[2] if q < 0.25 else PIERRE[0] if q < 0.7 else PIERRE[3]
        if r > rx - 1.5:
            c = K
        return c
    t.remplit(int(cx - rx) - 1, int(cy - ry) - 1, int(cx + rx) + 2, int(cy) + 1, f)
    for x in range(int(cx - rx), int(cx + rx) + 1):
        t.put(x, int(cy), K)


def toboggan():
    """3 × 4 tuiles : une tour de jeu au toit rouge et son toboggan bleu."""
    im = image(48, 64)
    d = dessin(im)
    d.ellipse((2, 54, 46, 63), fill=(0, 0, 0, 60))
    for x in (6, 20):
        d.rectangle((x, 26, x + 2, 58), fill=rgba(BOIS_K))
    d.rectangle((5, 34, 23, 37), fill=rgba(BOIS_C))
    d.rectangle((5, 38, 23, 40), fill=rgba(BOIS))
    d.polygon(((3, 26), (14, 8), (25, 26)), fill=rgba((196, 58, 52)))
    d.polygon(((14, 8), (25, 26), (19, 26)), fill=rgba((150, 40, 38)))
    d.polygon(((22, 36), (27, 36), (44, 56), (39, 58)), fill=rgba((70, 120, 196)))
    d.line((24, 36, 41, 57), fill=rgba((126, 170, 226)))
    for y in range(40, 58, 4):
        d.line((8, y, 20, y), fill=rgba(BOIS_C))
    return contour(im)


def balancoire():
    """3 × 3 tuiles : un portique et ses deux balançoires."""
    im = image(48, 48)
    d = dessin(im)
    d.ellipse((2, 40, 46, 47), fill=(0, 0, 0, 50))
    R = (196, 70, 56)
    d.line((4, 44, 10, 8), fill=rgba(R), width=3)
    d.line((44, 44, 38, 8), fill=rgba(R), width=3)
    d.rectangle((8, 7, 40, 10), fill=rgba(teinte(R, 0.85)))
    for x in (16, 30):
        d.line((x, 10, x, 32), fill=rgba((70, 70, 78)))
        d.line((x + 5, 10, x + 5, 32), fill=rgba((70, 70, 78)))
        d.rectangle((x - 1, 32, x + 6, 34), fill=rgba(BOIS))
    return contour(im)


# ---------- l'industrie ----------

def cheminee(fumee=True):
    """2 × 6 tuiles : une cheminée de brique et son panache de fumée."""
    im = image(32, 96)
    d = dessin(im)
    B = ((150, 76, 62), (118, 58, 50), (180, 100, 82))
    d.rectangle((10, 40, 21, 95), fill=rgba(B[0]))
    d.rectangle((10, 40, 12, 95), fill=rgba(B[2]))
    d.rectangle((19, 40, 21, 95), fill=rgba(B[1]))
    for y in range(44, 96, 6):
        d.line((10, y, 21, y), fill=rgba(B[1]))
    d.rectangle((8, 36, 23, 41), fill=rgba((70, 66, 70)))
    d.rectangle((9, 37, 22, 38), fill=rgba((110, 106, 112)))
    im = contour(im)
    if fumee:
        for i, (x, y, r) in enumerate(((16, 30, 5), (18, 22, 6), (22, 13, 7), (26, 5, 5))):
            for yy in range(y - r, y + r + 1):
                for xx in range(x - r, x + r + 1):
                    if 0 <= xx < 32 and 0 <= yy < 96 and math.hypot(xx - x, yy - y) <= r:
                        c = (232, 232, 236) if math.hypot(xx - x + 2, yy - y + 2) < r * 0.6 else (196, 196, 204)
                        im.putpixel((xx, yy), rgba(c, 200 - i * 30))
    return im


def caisse(graine=0):
    """1 tuile : une caisse de bois (ou une pile de deux)."""
    im = image(16, 16)
    d = dessin(im)
    d.rectangle((1, 13, 15, 15), fill=(0, 0, 0, 60))
    d.rectangle((1, 4, 14, 14), fill=rgba(BOIS))
    d.rectangle((1, 4, 14, 6), fill=rgba(BOIS_C))
    d.line((2, 7, 13, 13), fill=rgba(BOIS_K))
    d.line((1, 10, 14, 10), fill=rgba(BOIS_K))
    if hasard(graine, 9) > 0.5:
        d.rectangle((4, 0, 12, 4), fill=rgba(BOIS_C))
    return contour(im)


# ---------- la rue ----------

def abri_bus():
    """3 × 3 tuiles : l'abri de l'arrêt de bus (un toit, une vitre, un banc) et son poteau."""
    im = image(48, 48)
    d = dessin(im)
    d.rectangle((2, 42, 40, 46), fill=(0, 0, 0, 60))
    d.rectangle((3, 14, 37, 42), fill=rgba(VITRE_S))
    for y in range(15, 42):
        for x in range(4, 37):
            c = VITRE_C if (x + (42 - y)) % 14 in (0, 1) else VITRE
            im.putpixel((x, y), rgba(c, 170))
    d.rectangle((2, 10, 38, 14), fill=rgba((60, 64, 74)))
    d.rectangle((2, 10, 38, 11), fill=rgba((110, 116, 128)))
    for x in (3, 36):
        d.rectangle((x, 14, x + 1, 43), fill=rgba((60, 64, 74)))
    d.rectangle((8, 33, 32, 35), fill=rgba(BOIS))
    # le poteau et le panneau « BUS »
    d.rectangle((43, 8, 44, 45), fill=rgba((70, 72, 80)))
    d.rectangle((39, 0, 47, 9), fill=rgba((40, 92, 160)))
    im = contour(im)
    texte(im, 40, 2, 'B', (240, 240, 244))
    return im


def abri_bus_profil():
    """28 × 66 px : le même abri, tourné d'un quart de tour, le long d'une rue nord-sud (vue de
    dessus à 45° : le toit, long dans le sens de la rue ; le bout sud, sa vitre et le banc
    derrière ; le poteau « BUS » côté chaussée, à l'est). Le pied (le bas des montants) : y 60."""
    im = image(28, 66)
    d = dessin(im)
    # l'ombre au sol, un peu décalée vers le sud-est
    d.rectangle((4, 30, 22, 63), fill=(0, 0, 0, 55))
    # le fond, sous le toit : la vitre du côté ouest (le dos de l'abri), vue de biais
    d.rectangle((3, 36, 18, 59), fill=rgba(VITRE_S))
    # le banc, le long de la vitre du fond, vu de côté (on en voit le bout et le dessus)
    d.rectangle((6, 48, 15, 50), fill=rgba(BOIS))
    d.rectangle((6, 48, 15, 48), fill=rgba(BOIS_C))
    for x in (7, 14):
        d.rectangle((x, 51, x, 55), fill=rgba(BOIS_K))
    # la vitre du bout sud, par-dessus (transparente : le banc se voit au travers)
    for y in range(41, 59):
        for x in range(4, 18):
            c = VITRE_C if (x + (58 - y)) % 11 in (0, 1) else VITRE
            r, g, b, a = im.getpixel((x, y))
            fond = (r, g, b) if a else VITRE_S
            im.putpixel((x, y), rgba(mel(fond, c, 0.55)))
    # les montants du bout sud
    for x in (2, 17):
        d.rectangle((x, 38, x + 1, 60), fill=rgba((60, 64, 74)))
    # le toit : son dessus, long dans le sens de la rue, puis son épaisseur au bout sud
    d.rectangle((1, 3, 19, 37), fill=rgba((92, 98, 110)))
    d.rectangle((1, 3, 19, 4), fill=rgba((132, 138, 150)))
    d.rectangle((1, 3, 2, 37), fill=rgba((118, 124, 136)))
    for y in range(9, 36, 6):                     # les nervures de la tôle
        d.line((3, y, 18, y), fill=rgba((80, 86, 98)))
    d.rectangle((1, 37, 19, 40), fill=rgba((60, 64, 74)))
    d.rectangle((1, 37, 19, 37), fill=rgba((110, 116, 128)))
    # le poteau et le panneau « BUS », au bord de la chaussée
    d.rectangle((23, 24, 24, 61), fill=rgba((70, 72, 80)))
    d.rectangle((20, 14, 27, 23), fill=rgba((40, 92, 160)))
    im = contour(im)
    texte(im, 22, 16, 'B', (240, 240, 244))
    return im


def drapeau():
    """1 × 3 tuiles : un mât et son drapeau (devant l'école)."""
    im = image(16, 48)
    d = dessin(im)
    d.rectangle((2, 2, 3, 46), fill=rgba((150, 150, 158)))
    d.rectangle((4, 3, 7, 10), fill=rgba((40, 70, 160)))
    d.rectangle((8, 3, 11, 10), fill=rgba((236, 236, 240)))
    d.rectangle((12, 3, 15, 10), fill=rgba((206, 50, 52)))
    return contour(im)
