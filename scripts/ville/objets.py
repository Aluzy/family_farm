# Les objets de la ville, dessinés une fois puis posés sur les toiles : fenêtres et portes,
# fontaines (l'eau de la ferme, animée), bancs, panneau, tonneau, réverbère, plaque
# d'égout, climatiseur, dalles et cailloux. Les arbres, buissons et fleurs sont ceux de la
# ferme (scripts/ville/ferme.py), les voitures dans scripts/ville/voitures.py.
import math

import ferme
from commun import K, contour, dessin, hasard, image, mel, rgba, teinte

# ---------- la menuiserie ----------

PIERRE_CLAIRE = (204, 188, 156)
PIERRE_OMBRE = (164, 146, 116)
BOIS_K = (78, 50, 36)
BOIS = (122, 80, 52)
BOIS_C = (152, 104, 68)
VITRE = (170, 186, 194)
VITRE_C = (212, 226, 232)
VITRE_S = (120, 138, 152)


def fenetre():
    """1 × 2 tuiles : linteau de pierre, cadre de bois, quatre carreaux, appui."""
    im = image(16, 32)
    d = dessin(im)
    d.rectangle((0, 2, 15, 4), fill=rgba(K))
    d.rectangle((1, 3, 14, 3), fill=rgba(PIERRE_CLAIRE))
    d.rectangle((1, 5, 14, 27), fill=rgba(BOIS_K))
    d.rectangle((2, 6, 13, 26), fill=rgba(VITRE))
    for y in range(6, 27):
        for x in range(2, 14):
            c = VITRE
            if y < 9:
                c = VITRE_S
            elif (x + (26 - y)) % 11 in (0, 1) and y < 22:
                c = VITRE_C
            elif hasard(x, y, 3) > 0.92:
                c = mel(VITRE, VITRE_C, 0.5)
            im.putpixel((x, y), rgba(c))
    d.rectangle((7, 6, 8, 26), fill=rgba(BOIS))
    d.rectangle((2, 16, 13, 16), fill=rgba(BOIS))
    d.rectangle((0, 27, 15, 29), fill=rgba(K))
    d.rectangle((1, 28, 14, 28), fill=rgba(PIERRE_CLAIRE))
    d.rectangle((1, 30, 14, 30), fill=(0, 0, 0, 70))
    return im


# ---------- le métal ----------

def plaque_egout():
    """2 × 2 tuiles : une plaque ronde vue de 3/4, donc une ellipse (écrasée de 0,7 comme le
    bassin des fontaines et la place), sa grille en losanges écrasés elle aussi."""
    im = image(32, 32)
    cx, cy, rx, ry = 15.5, 15.5, 14.5, 10.2
    for y in range(32):
        for x in range(32):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            r = math.hypot(dx, dy)
            if r > 1:
                continue
            if r > 0.9:
                c = (46, 40, 42)                                   # le joint dans l'asphalte
            elif r > 0.8:
                c = (104, 98, 100) if dy < -0.15 or dx < -0.5 else (70, 64, 66)   # le cadre
            else:
                gx, gy = x - cx, (y - cy) / 0.7
                c = (62, 58, 62) if round(gx + gy) % 4 == 0 or round(gx - gy) % 4 == 0 else (84, 80, 84)
                if hasard(x, y, 8) > 0.9:
                    c = teinte(c, 1.1)
            im.putpixel((x, y), rgba(c))
    return im


def climatiseur():
    """2 × 3 tuiles : le bloc de climatisation sur le toit plat de la tour."""
    im = image(32, 48)
    d = dessin(im)
    d.rectangle((3, 6, 30, 44), fill=(0, 0, 0, 60))
    d.rectangle((1, 3, 28, 41), fill=rgba(K))
    d.rectangle((2, 4, 27, 40), fill=rgba((176, 176, 172)))
    d.rectangle((2, 4, 27, 6), fill=rgba((208, 208, 204)))
    d.ellipse((5, 9, 24, 28), fill=rgba((60, 60, 64)))
    d.ellipse((7, 11, 22, 26), fill=rgba((96, 96, 100)))
    for a in range(0, 360, 60):
        x = 14.5 + 6 * math.cos(math.radians(a))
        y = 18.5 + 6 * math.sin(math.radians(a))
        d.line((14.5, 18.5, x, y), fill=rgba((60, 60, 64)))
    d.ellipse((13, 17, 16, 20), fill=rgba((150, 150, 150)))
    for y in range(31, 39, 2):
        d.rectangle((5, y, 24, y), fill=rgba((128, 128, 126)))
    return im


def reverbere():
    """1 × 3 tuiles : un réverbère noir à lanterne."""
    im = image(16, 48)
    d = dessin(im)
    d.ellipse((3, 42, 12, 47), fill=(0, 0, 0, 70))
    d.rectangle((7, 12, 8, 44), fill=rgba((52, 52, 60)))
    d.rectangle((7, 12, 7, 44), fill=rgba((92, 92, 104)))
    d.rectangle((5, 41, 10, 44), fill=rgba((52, 52, 60)))
    d.polygon(((4, 4), (11, 4), (12, 11), (3, 11)), fill=rgba((52, 52, 60)))
    d.rectangle((5, 6, 10, 10), fill=rgba((250, 228, 150)))
    d.rectangle((6, 1, 9, 3), fill=rgba((52, 52, 60)))
    return contour(im)


# ---------- la pierre ----------

def dalle(graine=0):
    """1 tuile : deux pierres plates d'un chemin dallé."""
    im = image(16, 16)
    d = dessin(im)
    for i, (x0, y0) in enumerate(((1, 1), (8, 8))):
        w = 6 + int(hasard(graine, i) * 2)
        h = 5 + int(hasard(graine, i, 1) * 2)
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=2, fill=rgba((150, 136, 108)))
        d.rounded_rectangle((x0, y0, x0 + w - 1, y0 + h - 1), radius=2, fill=rgba((212, 198, 160)))
        d.rounded_rectangle((x0 + 1, y0 + 1, x0 + w - 1, y0 + h - 1), radius=2, fill=rgba((192, 178, 142)))
    return im


def caillou(graine=0):
    im = image(16, 16)
    d = dessin(im)
    x, y = 4 + int(hasard(graine) * 6), 6 + int(hasard(graine, 1) * 5)
    d.ellipse((x, y + 1, x + 7, y + 5), fill=(0, 0, 0, 60))
    d.ellipse((x, y, x + 6, y + 4), fill=rgba((128, 126, 130)))
    d.ellipse((x + 1, y, x + 4, y + 2), fill=rgba((176, 174, 178)))
    return im


# ---------- le bois ----------

def banc(diagonal=False):
    """3 × 2 tuiles : un banc de bois vu de dessus (le dossier en haut) ; diagonal : tourné."""
    im = image(48, 32)
    d = dessin(im)
    d.rectangle((4, 22, 45, 26), fill=(0, 0, 0, 60))
    for x in (5, 40):
        d.rectangle((x, 8, x + 2, 24), fill=rgba((52, 44, 42)))
    d.rectangle((2, 4, 45, 8), fill=rgba(BOIS_K))
    d.rectangle((3, 5, 44, 6), fill=rgba(BOIS_C))
    for i, y in enumerate((11, 15, 19)):
        d.rectangle((2, y, 45, y + 3), fill=rgba(BOIS_K))
        d.rectangle((3, y, 44, y + 2), fill=rgba(BOIS if i else BOIS_C))
        d.rectangle((3, y, 44, y), fill=rgba(teinte(BOIS_C, 1.12)))
    im = contour(im)
    if diagonal:
        grand = image(64, 64)
        grand.paste(im, (8, 16))
        im = grand.rotate(-33, resample=0)
    return im


def panneau():
    """2 × 2 tuiles : le panneau d'affichage du parc."""
    im = image(32, 32)
    d = dessin(im)
    d.rectangle((6, 18, 8, 30), fill=rgba(BOIS_K))
    d.rectangle((23, 18, 25, 30), fill=rgba(BOIS_K))
    d.rectangle((1, 2, 30, 20), fill=rgba(BOIS_K))
    d.rectangle((2, 3, 29, 19), fill=rgba(BOIS))
    d.rectangle((4, 5, 27, 17), fill=rgba((236, 232, 220)))
    for i, y in enumerate((7, 10, 13)):
        d.rectangle((6, y, 13 + 6 * (i % 2), y + 1), fill=rgba((60, 56, 60)))
        d.rectangle((17, y, 25 - 3 * (i % 2), y + 1), fill=rgba((60, 56, 60)))
    return contour(im)


def tonneau():
    """1 × 2 tuiles : un tonneau de bois cerclé."""
    im = image(16, 32)
    d = dessin(im)
    d.ellipse((1, 25, 15, 31), fill=(0, 0, 0, 70))
    d.rounded_rectangle((2, 12, 13, 29), radius=3, fill=rgba(BOIS))
    for x in range(3, 13, 3):
        d.line((x, 13, x, 28), fill=rgba(BOIS_K))
    d.rectangle((2, 16, 13, 16), fill=rgba((70, 66, 70)))
    d.rectangle((2, 25, 13, 25), fill=rgba((70, 66, 70)))
    d.ellipse((2, 9, 13, 15), fill=rgba(BOIS_K))
    d.ellipse((3, 10, 12, 14), fill=rgba((88, 58, 40)))
    d.line((4, 12, 11, 12), fill=rgba(BOIS))
    return contour(im)


# ---------- l'eau des fontaines ----------

EAU = [(28, 86, 158), (68, 162, 208), (76, 172, 214), (133, 199, 227), (222, 231, 242)]   # les bleus de l'eau de la ferme
MARGELLE = [(118, 104, 84), (164, 146, 116), (200, 184, 150), (226, 214, 186)]


def eau(x, y, k, ombre=False):
    """L'eau de la ferme (scripts/ville/ferme.py) au pixel (x, y), image k : le fond peu profond,
    une variante par tuile (le plus souvent nue) ; ombre : sous le rebord, plus sombre."""
    r = hasard(x // 16, y // 16, 4)
    c = ferme.eau(x, y, k, False, 0 if r < 0.7 else 1 + int(r * 70) % 7)
    return teinte(c, 0.78) if ombre else c


def anneau(im, cx, cy, r0, r1, ry=1.0):
    """La margelle de pierre entre les rayons r0 et r1 (éclairée en haut à gauche)."""
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r = math.hypot(x - cx, (y - cy) / ry)
            if r0 <= r <= r1:
                a = math.atan2(y - cy, x - cx)
                lum = -math.cos(a + math.pi / 4)
                c = MARGELLE[2]
                if r > r1 - 1.5 or r < r0 + 1:
                    c = MARGELLE[0]
                elif r < r0 + 3 and lum < 0.3:
                    c = MARGELLE[1]
                elif lum > 0.5 and r > r1 - 4:
                    c = MARGELLE[3]
                elif lum < -0.4:
                    c = MARGELLE[1]
                if hasard(x, y, 77) > 0.94:
                    c = teinte(c, 0.93)
                im.putpixel((x, y), rgba(c))


def vasque(im, cx, cy, rx, ry, e, h, k, phase=0):
    """Une vasque vue de 3/4 : le dessus du rebord (l'ellipse cx, cy, rx, ry, de largeur e), sa
    paroi de face haute de h px, l'eau de la ferme (image k + phase) un peu sous le rebord, et la
    paroi intérieure, dans l'ombre, au fond."""
    w, hh = im.size
    dedans = lambda x, y, a, b, dy=0: ((x + 0.5 - cx) / a) ** 2 + ((y + 0.5 - cy - dy) / b) ** 2 <= 1
    ri, rj = rx - e, ry - e * ry / rx
    for x in range(w):
        u = (x + 0.5 - cx) / rx
        if abs(u) > 1:
            continue
        bas = cy + ry * math.sqrt(1 - u * u)
        for y in range(int(bas) - 1, min(hh, int(bas + h) + 1)):
            if y + 0.5 < bas or dedans(x, y, rx, ry):
                continue
            c = MARGELLE[1] if u < 0.35 else MARGELLE[0]
            if u < -0.6:
                c = MARGELLE[2]
            if (x + 3) % 12 == 0:
                c = teinte(c, 0.82)
            if y + 0.5 > bas + h - 1.5:
                c = K
            elif y + 0.5 < bas + 2:
                c = teinte(MARGELLE[0], 0.8)
            im.putpixel((x, y), rgba(c))
    for y in range(hh):
        for x in range(w):
            if not dedans(x, y, rx, ry):
                continue
            if dedans(x, y, ri, rj):
                if dedans(x, y, ri, rj, 3):
                    im.putpixel((x, y), rgba(eau(x, y, (k + phase) % 8, not dedans(x, y, ri, rj, 6))))
                else:
                    im.putpixel((x, y), rgba(teinte(MARGELLE[1], 0.78)))
                continue
            a = math.atan2((y + 0.5 - cy) / ry, (x + 0.5 - cx) / rx)
            lum = -math.cos(a + math.pi / 4)
            c = MARGELLE[3] if lum > 0.45 else MARGELLE[2] if lum > -0.5 else MARGELLE[1]
            if not dedans(x, y, rx - 1.2, ry - 1.2 * ry / rx):
                c = MARGELLE[0]
            im.putpixel((x, y), rgba(c))


def colonne_ronde(im, x0, x1, y0, y1):
    """Un fût de pierre (cylindre éclairé à gauche) de x0 à x1, de y0 à y1."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0 - 1)
            c = MARGELLE[3] if t < 0.25 else MARGELLE[2] if t < 0.6 else MARGELLE[1] if t < 0.85 else MARGELLE[0]
            im.putpixel((x, y), rgba(K if x in (x0, x1 - 1) else c))


def fontaine(k):
    """9 × 9 tuiles, image k (0..7) : la grande fontaine de la place, vue de 3/4 comme le reste de
    la carte : un grand bassin (rebord, paroi de face, eau de la ferme), un fût qui porte une
    vasque, un pinacle et son jet d'eau qui retombe en gerbe dans la vasque et le bassin."""
    im = image(144, 144)
    cx = 71.5
    vasque(im, cx, 64, 68, 42, 8, 14, k)
    # les remous où retombe la gerbe
    for i in range(12):
        a = (i + 0.5) / 12 * math.tau
        x, y = cx + math.cos(a) * 36, 74 + math.sin(a) * 20
        for j in range(-2, 3):
            if (j + k + i) % 4 < 2:
                im.putpixel((int(x + j), int(y)), rgba(EAU[4]))
    colonne_ronde(im, 63, 81, 50, 80)
    vasque(im, cx, 46, 27, 15, 4, 7, k, 4)
    colonne_ronde(im, 68, 76, 22, 47)
    d = dessin(im)
    d.ellipse((66, 16, 77, 25), fill=rgba(K))
    d.ellipse((67, 17, 76, 24), fill=rgba(MARGELLE[2]))
    d.ellipse((68, 18, 71, 20), fill=rgba(MARGELLE[3]))
    im = contour(im)
    # le jet : une colonne d'eau qui monte, puis la gerbe qui retombe dans la vasque (les arcs
    # courts) et dans le bassin (les longs) ; les gouttes avancent d'image en image sur leur arc
    for y in range(2, 17):
        for x in (70, 71, 72, 73):
            c = EAU[4] if (y + k) % 4 < 2 and x in (71, 72) else EAU[3]
            im.putpixel((x, y), rgba(c))
    for i in range(12):
        a = (i + 0.5) / 12 * math.tau
        dx, dy = math.cos(a), math.sin(a)
        long = i % 2 == 1
        portee, arrivee = (40, 74 + dy * 24) if long else (20, 47 + dy * 8)
        for s in range(0, 16, 2):
            t = ((s + k / 2) % 16) / 16
            x = cx + dx * portee * t
            y = 4 - 12 * t + (arrivee - 4 + 12) * t * t
            for ddx, ddy, c in ((0, 0, EAU[4]), (1, 0, EAU[3]), (0, 1, EAU[3]), (1, 1, EAU[1])):
                if 0 <= int(x) + ddx < 144 and 0 <= int(y) + ddy < 144:
                    im.putpixel((int(x) + ddx, int(y) + ddy), rgba(c))
    return im


def fontaine_globe(k):
    """7 × 10 tuiles, image k (0..7) : la fontaine au globe, sur ses quatre piliers."""
    im = image(112, 160)
    cx, cy, rx, ry = 55.5, 128, 54, 30
    for y in range(160):
        for x in range(112):
            if ((x - cx) / (rx - 9)) ** 2 + ((y - cy) / (ry - 7)) ** 2 < 1:
                im.putpixel((x, y), rgba(eau(x, y, k, y < cy - ry + 13)))
    for y in range(160):
        for x in range(112):
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            i = ((x - cx) / (rx - 9)) ** 2 + ((y - cy) / (ry - 7)) ** 2
            if e <= 1 and i >= 1:
                c = MARGELLE[2] if y < cy else MARGELLE[1]
                if y > cy + ry - 8:
                    c = MARGELLE[0] if e > 0.86 else MARGELLE[1]
                elif i < 1.12:
                    c = MARGELLE[3] if y < cy else MARGELLE[2]
                im.putpixel((x, y), rgba(c))
    d = dessin(im)
    # les quatre piliers
    piliers = (((18, 112), (24, 74), (32, 44)), ((40, 126), (42, 90), (46, 64)),
               ((71, 126), (69, 90), (65, 64)), ((93, 112), (87, 74), (79, 44)))
    for (x0, y0), (x1, y1), (x2, y2) in piliers:
        pts = []
        for s in range(21):
            t = s / 20
            pts.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t * t * y2))
        d.line(pts, fill=rgba(MARGELLE[0]), width=7)
        d.line(pts, fill=rgba(MARGELLE[2]), width=4)
        d.line([(x - 1, y) for x, y in pts], fill=rgba(MARGELLE[3]), width=1)
    # le globe
    gx, gy, gr = 55.5, 36, 33
    for y in range(160):
        for x in range(112):
            r = math.hypot(x - gx, y - gy)
            if r <= gr:
                t = math.hypot(x - (gx - 11), y - (gy - 12)) / (gr * 1.5)
                c = [(196, 222, 228), (150, 188, 198), (112, 152, 166), (80, 114, 130)][min(3, int(t * 4.4))]
                # les continents en relief
                if hasard(x // 3, y // 3, 31) > 0.62 and r < gr - 2:
                    c = teinte(c, 0.86)
                if r > gr - 1.2:
                    c = (52, 76, 90)
                im.putpixel((x, y), rgba(c))
    for s in range(-6, 7):
        y = int(gy + s * 4)
        x = int(gx - 20 + abs(s) * 2)
        if 0 <= y < 160:
            im.putpixel((x, y), rgba((236, 246, 248)))
    # l'eau qui ruisselle du globe dans le bassin
    for i in range(6):
        x = int(cx - 24 + i * 9)
        im.putpixel((x, 116 + (i * 3 + k) % 8), rgba(EAU[4]))
    return contour(im)
