# Les enseignes de ferme de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : pour chaque matière (bois
# gravé, émail, fer forgé), un panneau de deux cases et une boîte aux lettres d'une case, posés dehors
# (data/recipes.json ATELIER.BLOCS enseigne_<matière>, boite_lettres_<matière>), vus de haut à 45° (CLAUDE.md) :
# chaque poteau, chaque planche, chaque plaque montre son dessus (une bande claire) au-dessus de sa face.
#
# La partie peinte (la plaque, le panneau, le fer forgé, le coffre de la boîte) est dessinée dans les tons exacts de
# sa palette (data/meubles.json PALETTES enseigne_<matière>, sept tons) : l'outil 🎨 de Construire la repeint dans les
# cinq couleurs (PEINTURES enseigne_<matière>). Le reste (les poteaux de bois, le fer des poteaux de l'émail, les
# chaînes, la visserie, l'herbe) a ses rampes fines. Le nom de la famille n'est pas dessiné : la carte l'écrit sur la
# plaque (js/carte/ferme/chantier.js stepEnseignes ; BLOCS_CARTE.enseigne : où, et sur quelle largeur).
#
#   python3 scripts/batiments/enseignes.py            écrit assets/meuble_enseigne_<matière>.png, meuble_boite_lettres_<matière>.png
#   python3 scripts/batiments/enseignes.py --apercu   écrit aussi apercu_enseignes.png (agrandi, sur l'herbe, les cinq couleurs)
import json
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

DATA = json.load(open(os.path.join(ROOT, 'data', 'meubles.json'), encoding='utf-8'))
PALETTES, PEINTURES = DATA['PALETTES'], DATA['PEINTURES']
MATIERES = ['bois', 'email', 'fer']
OUT = (28, 22, 20)
PW, PH = 32, 36            # le panneau : deux cases de large, il monte au-dessus de sa case
BW, BH = 16, 28            # la boîte aux lettres
BOIS = [rampe([(44, 28, 20), (82, 54, 34), (122, 84, 52), (160, 116, 74), (196, 154, 104), (226, 192, 142)], 140),
        rampe([(40, 26, 22), (76, 50, 36), (116, 80, 56), (154, 112, 78), (190, 150, 108), (222, 188, 146)], 140),
        rampe([(48, 30, 18), (88, 58, 32), (128, 88, 48), (166, 122, 70), (202, 160, 100), (232, 198, 138)], 140)]
FER = rampe([(18, 20, 26), (40, 42, 50), (68, 70, 78), (102, 104, 110), (146, 148, 152), (196, 198, 200)], 120)
LAITON = rampe([(70, 48, 18), (130, 96, 40), (190, 150, 70), (232, 204, 120), (255, 244, 196)], 100)
HERBE = rampe([(30, 62, 30), (52, 96, 40), (78, 128, 50), (108, 156, 62), (146, 184, 82), (188, 210, 112)], 120)
FENTE = rampe([(10, 8, 10), (34, 28, 30), (60, 52, 50)], 40)


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)


def peint(P, i):
    """Le ton i (0 sombre … 6 clair) de la palette peinte : exactement l'un des sept (la carte les remplace)."""
    return hexrgb(P[max(0, min(6, int(round(i))))])


def poteau_bois(t, x0, x1, haut, bas, k):
    """Un poteau carré en bois : son dessus (deux rangées claires, le cœur des cernes), sa face éclairée à gauche,
    le fil du bois, plus sombre au pied (l'herbe)."""
    R = BOIS[k % 3]
    for y in range(haut, bas + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            if y < haut + 2:
                lum = 0.86 - 0.18 * u + 0.05 * bruit(x, y, 90 + k) - (0.1 if (x - x0 == 1 and y == haut) else 0)
            else:
                lum = 0.66 - 0.40 * u + 0.06 * bruit(x, y // 3, 91 + k) - 0.08 * ((x + y // 4) % 3 == 0)
                lum -= 0.18 * max(0, y - (bas - 5)) / 5
            t.put(x, y, ton(R, lum))


def poteau_fer(t, x0, x1, haut, bas, R=None, P=None):
    """Un poteau de fer rond (un cylindre éclairé à gauche) et sa boule au sommet ; peint (P : la palette) ou brut."""
    for y in range(haut, bas + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0 + 0.5) / (x1 - x0 + 1)
            lum = 0.72 - 0.55 * u - 0.12 * max(0, y - (bas - 5)) / 5
            t.put(x, y, peint(P, 1 + lum * 6) if P else ton(R or FER, lum + 0.03 * bruit(x, y, 92)))
    cx = (x0 + x1) / 2
    for y in range(haut - 3, haut):
        for x in range(int(cx - 2), int(cx + 3)):
            d = ((x + 0.5 - cx - 0.5) / 1.8) ** 2 + ((y + 0.5 - haut + 1.5) / 1.6) ** 2
            if d <= 1:
                lum = 0.95 - 0.6 * d - 0.25 * (x - cx + 1) / 3
                t.put(x, y, peint(P, lum * 6) if P else ton(R or FER, lum))


def herbe(im, cx, large, rng, n=14):
    """Des brins d'herbe au pied (par-dessus le contour : l'objet se fond dans le sol)."""
    px = im.load()
    w, h = im.size
    for _ in range(n):
        dx = max(-large, min(large, rng.gauss(0, large / 2)))
        x = int(round(cx + dx))
        if not 0 <= x < w:
            continue
        hh = 2 + rng.randrange(3)
        for j in range(hh):
            y = h - 1 - j
            px[x, y] = ton(HERBE, 0.2 + 0.55 * (j + 1) / hh + rng.uniform(-0.06, 0.06)) + (255,)


# ---------- les panneaux ----------

def panneau_bois(P):
    """Bois gravé : deux poteaux, un petit toit de planches (son dessus, son rebord), le panneau peint de trois
    planches (chacune son dessus clair, sa face qui fonce vers la droite, le joint entre elles)."""
    t = Toile(PW, PH)
    poteau_bois(t, 2, 5, 6, PH - 2, 0)
    poteau_bois(t, 26, 29, 6, PH - 2, 1)
    for y in range(3, 8):                                   # le toit : son dessus (3 rangées), son rebord
        for x in range(0, PW):
            u = x / (PW - 1)
            if y < 6:
                lum = 0.80 - 0.20 * u + 0.06 * bruit(x // 4, y, 93) - 0.10 * (x % 4 == 0)   # les bardeaux
            else:
                lum = 0.46 - 0.22 * u - 0.10 * (y == 7)
            t.put(x, y, ton(BOIS[x // 4 % 3], lum))
    for y in range(8, 10):                                  # le dessus du panneau, sous le toit
        for x in range(5, 27):
            t.put(x, y, peint(P, 6 if y == 8 else 5))
    for p, (y0, y1) in enumerate(((10, 15), (16, 21), (22, 26))):
        for y in range(y0, y1 + 1):
            for x in range(5, 27):
                u = (x - 5) / 21
                if y == y0:
                    i = 5 - (u > 0.7)
                elif y == y1:
                    i = 1
                else:
                    i = 4 - 2 * u + (0.5 if (x + p * 3) % 7 == 0 else 0) - (0.4 if (x * 3 + y + p) % 11 == 0 else 0)
                t.put(x, y, peint(P, i))
    for (x, y) in ((6, 14), (25, 14), (6, 24), (25, 24)):   # les chevilles
        t.put(x, y, ton(BOIS[2], 0.30))
    im = contour(t.im, OUT)
    herbe(im, 3.5, 3, random.Random(1))
    herbe(im, 27.5, 3, random.Random(2))
    return im


def panneau_email(P):
    """Émail : une plaque bombée aux coins arrondis (son dessus, une bande de brillance en biais), son liseré blanc,
    quatre rivets ; deux poteaux de fer brut."""
    t = Toile(PW, PH)
    poteau_fer(t, 3, 5, 9, PH - 2)
    poteau_fer(t, 26, 28, 9, PH - 2)
    x0, x1, y0, y1 = 2, 29, 10, 27
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            coin = min(x - x0, x1 - x) + min(y - y0, y1 - y)
            if coin < 2 and min(x - x0, x1 - x) < 2 and min(y - y0, y1 - y) < 2 and coin < 1:
                continue
            u, v = (x - x0) / (x1 - x0), (y - y0) / (y1 - y0)
            if y == y0:
                i = 6                                       # le dessus de la plaque (sa tranche, au soleil)
            elif min(x - x0, x1 - x, y1 - y) == 0:
                i = 1                                       # le bord, qui tourne vers l'ombre
            else:
                i = 4.6 - 2.2 * (u * 0.5 + v * 0.7)
                if abs((u * 0.8 + v) - 0.42) < 0.06:
                    i += 1.5                                # la brillance de l'émail, en biais
            t.put(x, y, peint(P, i))
    BL = rampe([(150, 146, 136), (214, 210, 198), (246, 242, 232)], 40)
    for y in range(y0 + 2, y1 - 1):                         # le liseré blanc
        for x in range(x0 + 2, x1 - 1):
            if x in (x0 + 2, x1 - 2) or y in (y0 + 2, y1 - 2):
                t.put(x, y, ton(BL, 0.95 - 0.4 * ((x - x0) / (x1 - x0) * 0.4 + (y - y0) / (y1 - y0) * 0.6)))
    for (x, y) in ((x0 + 4, y0 + 4), (x1 - 4, y0 + 4), (x0 + 4, y1 - 4), (x1 - 4, y1 - 4)):
        t.put(x, y, ton(FER, 0.75)); t.put(x + 1, y + 1, ton(FER, 0.25))
    im = contour(t.im, OUT)
    herbe(im, 4, 3, random.Random(3))
    herbe(im, 27, 3, random.Random(4))
    return im


def panneau_fer(P):
    """Fer forgé : deux poteaux à boule, une traverse coiffée de volutes, la plaque pendue par deux chaînes (son
    cadre plus clair, son fond sombre) ; tout le fer est peint."""
    t = Toile(PW, PH)
    poteau_fer(t, 3, 4, 6, PH - 2, P=P)
    poteau_fer(t, 27, 28, 6, PH - 2, P=P)
    for y in (8, 9):                                        # la traverse : son dessus, sa face
        for x in range(3, 29):
            t.put(x, y, peint(P, 6 - 0.8 * (x / 28) if y == 8 else 3 - 1.5 * (x / 28)))
    for sens in (-1, 1):                                    # les volutes au-dessus, du milieu vers les poteaux
        for k in range(48):
            a = k / 47 * 2.6 * math.pi
            r = 3.6 * (1 - k / 60)
            x = 15.5 + sens * (2 + 4.5 * k / 47) + sens * r * math.cos(a) * 0.9
            y = 5.5 - r * math.sin(a) * 0.8
            if y < 8:
                t.put(x, y, peint(P, 5 - 3 * (sens > 0) + (1 if math.sin(a) > 0 else 0)))
    for cx in (9, 22):                                      # les chaînes (fer brut)
        for y in range(10, 13):
            t.put(cx, y, ton(FER, 0.75 if y % 2 else 0.4))
    x0, x1, y0, y1 = 6, 25, 13, 25
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u, v = (x - x0) / (x1 - x0), (y - y0) / (y1 - y0)
            if y == y0:
                i = 6
            elif x in (x0, x1) or y in (y0 + 1, y1):
                i = 5 - 2 * u - (1 if y == y1 else 0)       # le cadre
            else:
                i = 2.2 - 1.2 * (u * 0.4 + v * 0.6)
            t.put(x, y, peint(P, i))
    im = contour(t.im, OUT)
    herbe(im, 3.5, 3, random.Random(5))
    herbe(im, 27.5, 3, random.Random(6))
    return im


# ---------- les boîtes aux lettres ----------

def boite(matiere, P):
    """La boîte aux lettres : un poteau, le coffre peint (son dessus, sa face, la fente sombre vue d'en haut) ; le
    bois a son petit toit, l'émail son dôme, le fer forgé sa volute et son drapeau rouge."""
    t = Toile(BW, BH)
    if matiere == 'bois':
        poteau_bois(t, 6, 9, 15, BH - 2, 2)
    else:
        poteau_fer(t, 7, 8, 16, BH - 2, P=P if matiere == 'fer' else None)
    x0, x1 = 1, 14
    haut = 5 if matiere != 'email' else 4
    for y in range(haut, 16):
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            if matiere == 'email':                         # un dôme : le dessus s'arrondit
                c = (x + 0.5 - 7.5) / 7
                if y < haut + 4 - 4 * math.sqrt(max(0, 1 - c * c)):
                    continue
                dome = y < haut + 5
                i = (6 - 2.5 * u - 0.8 * c * c) if dome else (4.2 - 2.4 * u - 0.6 * (y - haut - 5) / 6)
            else:
                if y < haut + 3:
                    i = 6 - 1.5 * u - (0.6 if y == haut + 2 else 0)   # le dessus du coffre
                else:
                    i = 4.2 - 2.6 * u - 0.8 * (y - haut - 3) / 8
            t.put(x, y, peint(P, i))
    for x in range(4, 12):                                  # la fente : on y voit le fond, plus clair vers l'avant
        t.put(x, 10, ton(FENTE, 0.2 if x < 11 else 0.1))
        t.put(x, 11, ton(FENTE, 0.7 - 0.05 * (x - 4)))
    if matiere == 'bois':
        for y in range(1, 5):                               # le petit toit de planches
            for x in range(0, BW):
                lum = (0.82 - 0.2 * x / 15 - 0.1 * (x % 4 == 0)) if y < 4 else 0.42 - 0.2 * x / 15
                t.put(x, y, ton(BOIS[x // 4 % 3], lum))
    if matiere == 'fer':
        for k in range(10):                                 # la volute sous le coffre, côté gauche
            a = k / 9 * 1.6 * math.pi
            t.put(6 - 1.6 * math.cos(a), 17.5 + 1.6 * math.sin(a), peint(P, 4))
        D = rampe([(90, 14, 18), (180, 36, 36), (236, 90, 76)], 40)
        for y in range(5, 9):                               # le drapeau, levé
            for x in (15,):
                t.put(x, y, ton(FER, 0.5))
        for y in range(5, 8):
            for x in range(12, 15):
                t.put(x + 3 - 3, y - 3, ton(D, 0.9 - 0.2 * (x - 12) - 0.1 * (y - 5)))
    t.put(7, 13 if matiere != 'email' else 13, ton(LAITON, 0.8))   # la petite plaque de laiton
    t.put(8, 13, ton(LAITON, 0.5))
    im = contour(t.im, OUT)
    herbe(im, 7.5, 3, random.Random(7 + len(matiere)))
    return im


PANNEAUX = {'bois': panneau_bois, 'email': panneau_email, 'fer': panneau_fer}


def palette(matiere, variante=None):
    k = 'enseigne_' + matiere + ('_' + variante if variante else '')
    return PALETTES[k]


def main():
    for m in MATIERES:
        PANNEAUX[m](palette(m)).save(os.path.join(ASSETS, f'meuble_enseigne_{m}.png'), optimize=True)
        boite(m, palette(m)).save(os.path.join(ASSETS, f'meuble_boite_lettres_{m}.png'), optimize=True)
    print(f'enseignes : {len(MATIERES)} matières (un panneau de {PW} × {PH}, une boîte aux lettres de {BW} × {BH})')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', ((PW + BW + 10) * 5, (PH + 6) * 3), (92, 146, 62, 255))
        for j, m in enumerate(MATIERES):
            for i, v in enumerate(PEINTURES['enseigne_' + m]):
                P = palette(m, v['id'] if v.get('remplace') else None)
                ap.alpha_composite(PANNEAUX[m](P), (i * (PW + BW + 10) + 2, j * (PH + 6) + 3))
                ap.alpha_composite(boite(m, P), (i * (PW + BW + 10) + PW + 5, j * (PH + 6) + 3 + PH - BH))
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_enseignes.png'))


if __name__ == '__main__':
    main()
