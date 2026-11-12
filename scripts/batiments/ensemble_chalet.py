# L'ensemble « chalet de montagne » de la boutique de gemmes (worker/src/boutique.mjs ARTICLES ensemble_chalet) : le
# lit de rondins et son édredon à carreaux, la table de chevet de pin au cœur découpé et sa lampe à l'abat-jour écossais,
# le tapis alpin, le tableau du sommet enneigé. Le plancher de mélèze et le lambris de pin sont avec les autres sols
# (scripts/carte/blocs.py, motif_meleze) et les autres papiers peints (scripts/carte/papiers_peints.py, lambris).
#
# Vus de haut à 45° (CLAUDE.md), en nuances (des rampes fines, chaque rondin, chaque planche, chaque carreau son
# ton). Ils gardent les mesures et les rangées des meubles qu'ils remplacent : le lit celles du lit adulte (20 × 34,
# l'oreiller rangées 5 à 9, la couverture à partir de 12 : le dormeur s'y couche pareil, js/carte/ferme/config.js
# litPieds, litSens), ses vues de dos et de profil, ses couvertures seules (_drap) ; la table de chevet celles de la
# table de chevet (14 × 22, 16 × 22 de profil, l'abat-jour centré rangée LAMPE_Y : la carte y pose sa lueur le soir,
# BLOCS_CARTE.lampeChevet) ; le tapis celles du tapis tressé (40 × 22, 14 × 44 de profil).
#
#   python3 scripts/batiments/ensemble_chalet.py            écrit assets/meuble_chalet_*.png
#   python3 scripts/batiments/ensemble_chalet.py --apercu   écrit aussi apercu_chalet.png (agrandi)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'carte'))
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

OUT = (34, 22, 18)
LAMPE_Y = 5
# le pin des rondins : trois rampes proches (chaque rondin la sienne), l'ombre froide, la lumière chaude
PINS = [rampe([(46, 28, 24), (92, 56, 36), (138, 90, 54), (180, 128, 76), (214, 168, 108), (240, 208, 152)], 160),
        rampe([(42, 26, 26), (86, 52, 38), (130, 84, 56), (172, 122, 80), (208, 162, 112), (236, 204, 156)], 160),
        rampe([(50, 30, 22), (98, 60, 34), (146, 96, 52), (188, 136, 74), (220, 176, 104), (244, 214, 148)], 160)]
COEUR_BOIS = rampe([(120, 74, 40), (176, 122, 72), (212, 164, 104), (236, 200, 140)], 80)
ROUGE = rampe([(70, 14, 26), (118, 24, 32), (164, 36, 38), (200, 58, 50), (228, 100, 80), (246, 160, 136)], 140)
CREME = rampe([(120, 108, 100), (170, 158, 140), (212, 200, 178), (236, 226, 206), (250, 244, 230), (255, 252, 244)], 140)
LIN = rampe([(124, 120, 116), (176, 170, 160), (214, 208, 196), (238, 234, 224), (252, 250, 244)], 120)
VERT = rampe([(20, 46, 34), (34, 76, 50), (54, 108, 68), (88, 144, 92), (134, 180, 124)], 100)
LAITON = rampe([(84, 56, 18), (150, 108, 36), (206, 164, 70), (240, 214, 132), (255, 246, 204)], 100)


class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def fini(self):
        return contour(self.im, OUT)


def rondin_h(t, x0, x1, y0, ep, k, lum0=0.0):
    """Un rondin couché, de x0 à x1, épais de ep rangées à partir de y0 : un cylindre vu de haut à 45° (sa rangée du
    haut au soleil, le dessous dans l'ombre froide), le fil du bois, des nœuds ; ses deux bouts ronds, leurs cernes."""
    R = PINS[k % 3]
    for y in range(y0, y0 + ep):
        v = (y - y0 + 0.5) / ep
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            lum = 0.84 - 0.62 * v - 0.14 * u + lum0 + 0.04 * bruit(x // 3, y, 40 + k)
            if (x * 7 + k * 5) % 13 == 0 and 0.2 < v < 0.8:
                lum -= 0.18                                   # un nœud
            t.put(x, y, ton(R, lum))
    for xb in (x0, x1):                                      # les bouts, ronds, leurs cernes
        for y in range(y0, y0 + ep):
            d = abs(y - y0 - (ep - 1) / 2) / max(1, ep / 2)
            t.put(xb, y, ton(COEUR_BOIS, 0.85 - 0.5 * d - (0.2 if xb == x1 else 0)))


def poteau(t, x0, x1, y0, y1, k):
    """Un montant de rondin debout : son bout du haut (ses cernes, vu d'en haut), son fût éclairé à gauche."""
    R = PINS[k % 3]
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0 + 0.5) / (x1 - x0 + 1)
            if y <= y0 + 1:
                t.put(x, y, ton(COEUR_BOIS, 0.95 - 0.4 * u - 0.15 * (y - y0)))
            else:
                t.put(x, y, ton(R, 0.74 - 0.55 * u + 0.04 * bruit(x, y // 2, 50 + k)))


def carreau(x, y, lum, pas=4):
    """Le tissu à carreaux rouges et crème de l'édredon (des bandes croisées) : sa couleur en (x, y), à la lumière lum."""
    a, b = (x % pas) < pas // 2, (y % pas) < pas // 2
    if a and b:
        return ton(ROUGE, lum * 0.80)
    if a or b:
        return ton(ROUGE, 0.30 + lum * 0.62)
    return ton(CREME, 0.20 + lum * 0.78)


# ---------- le lit ----------

def lit_face():
    W, H = 20, 34
    t = Toile(W, H)
    for y in range(4, H - 4):                                # le matelas, sous le drap de lin
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.78 - 0.12 * x / W - (0.2 if y == 4 else 0) + 0.03 * bruit(x // 3, y // 2, 61)))
    for y in range(5, 10):                                   # l'oreiller gonflé
        for x in range(3, W - 3):
            u, v = (x - (W - 1) / 2) / ((W - 6) / 2), (y - 7) / 2.5
            if abs(u) > 0.95 and abs(v) > 0.7:
                continue
            t.put(x, y, ton(LIN, 0.90 - 0.18 * u - 0.22 * v - 0.12 * (u * u + v * v)))
    for x in range(4, W - 4):
        t.put(x, 10, ton(LIN, 0.42))
    bas = H - 5
    for y in range(12, bas + 1):                             # l'édredon à carreaux, son revers de lin
        for x in range(1, W - 1):
            if y in (12, 13):
                t.put(x, y, ton(LIN, (0.95 if y == 12 else 0.66) - 0.12 * x / W))
                continue
            cx, cy = (x - 1) % 6, (y - 14) % 5
            bombe = 1 - ((cx - 2.5) / 3) ** 2 - ((cy - 2) / 2.5) ** 2
            lum = 0.56 + 0.26 * bombe - 0.22 * x / W - 0.10 * (y == bas)
            if x >= W - 3:
                lum -= 0.22 + 0.08 * (x - (W - 3))          # le pli qui tombe à droite
            if cx == 5 or cy == 4:
                lum -= 0.16                                  # la piqûre
            t.put(x, y, carreau(x, y, max(0.05, lum)))
    rondin_h(t, 0, W - 1, 0, 4, 0)                           # la tête de lit : un rondin couché
    rondin_h(t, 0, W - 1, H - 4, 4, 1, 0.04)                 # le pied de lit
    for x0 in (0, W - 2):                                    # les montants, dépassant
        poteau(t, x0, x0 + 1, 0, 4, 2)
        poteau(t, x0, x0 + 1, H - 5, H - 1, 1)
    return t.fini()


def lit_dos():
    W, H = 20, 34
    t = Toile(W, H)
    for y in range(2, H - 6):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.74 - 0.12 * x / W))
    for y in range(2, H - 14):                               # l'édredon, le pli à gauche (de dos)
        for x in range(1, W - 1):
            cx, cy = (x - 1) % 6, (y - 2) % 5
            bombe = 1 - ((cx - 2.5) / 3) ** 2 - ((cy - 2) / 2.5) ** 2
            lum = 0.56 + 0.26 * bombe - 0.22 * x / W
            if x <= 2:
                lum -= 0.26
            if cx == 5 or cy == 4:
                lum -= 0.16
            t.put(x, y, carreau(x, y, max(0.05, lum)))
    for y in (H - 17, H - 16, H - 15):                       # son revers
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.92 - 0.25 * (y - H + 17) / 2 - 0.1 * x / W))
    for y in range(H - 13, H - 8):                           # l'oreiller
        for x in range(3, W - 3):
            u, v = (x - (W - 1) / 2) / ((W - 6) / 2), (y - (H - 11)) / 2.5
            t.put(x, y, ton(LIN, 0.86 - 0.18 * u - 0.15 * v - 0.12 * (u * u + v * v)))
    rondin_h(t, 0, W - 1, 0, 2, 1)                           # le pied de lit, de chant
    for y in range(H - 7, H):                                # la tête de lit, sa face : deux rondins
        pass
    rondin_h(t, 0, W - 1, H - 7, 4, 0, 0.04)
    rondin_h(t, 0, W - 1, H - 3, 3, 2, -0.08)
    for x0 in (0, W - 2):
        poteau(t, x0, x0 + 1, H - 8, H - 1, 2)
    return t.fini()


def lit_cote():
    Wf, Hf = 20, 34
    W = Hf + 2
    ht = 14                                                  # (comme le lit adulte de profil : round(16 × FOND) + 4)
    hc, hb = 3, 8
    H = hb + ht + hc + 1
    t = Toile(W, H)
    y0, y1 = hb, hb + ht - 1
    for y in range(y0, y1 + 1):                              # le dessus du matelas
        for x in range(4, W - 1):
            t.put(x, y, ton(LIN, 0.80 - 0.18 * (y - y0) / ht))
    for y in range(y0 + 1, y1):                              # l'oreiller
        for x in range(5, 10):
            t.put(x, y, ton(LIN, 0.92 - 0.25 * (y - y0) / ht - 0.1 * (x - 5) / 5))
    for y in range(y0, y1 + 1):                              # l'édredon, son revers
        for x in range(12, W - 1):
            if x in (12, 13):
                t.put(x, y, ton(LIN, 0.92 - 0.2 * (y - y0) / ht - 0.18 * (x - 12)))
                continue
            cx, cy = (x - 14) % 6, (y - y0) % 5
            bombe = 1 - ((cx - 2.5) / 3) ** 2 - ((cy - 2) / 2.5) ** 2
            lum = 0.60 + 0.24 * bombe - 0.28 * (y - y0) / ht
            if cx == 5 or cy == 4:
                lum -= 0.16
            t.put(x, y, carreau(x, y, max(0.05, lum)))
    for y in range(y1 + 1, y1 + hc + 1):                     # la couverture qui retombe, puis le flanc de rondin
        for x in range(15, W - 1):
            t.put(x, y, carreau(x, y, 0.32 - 0.06 * (y - y1)))
    rondin_h(t, 4, 14, y1 + 1, hc, 1, -0.05)
    poteau(t, 0, 3, 0, H - 1, 0)                             # la tête de lit, de chant, haute
    for y in range(2, H - 1, 5):
        for x in range(0, 4):
            t.put(x, y, ton(PINS[0], 0.22))                  # (ses rondins empilés)
    poteau(t, W - 2, W - 1, y0 - 2, H - 1, 2)                # le pied de lit
    return t.fini()


def garde(im, dedans):
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if not dedans(x, y):
                px[x, y] = (0, 0, 0, 0)
    return out


# ---------- la table de chevet et sa lampe ----------

def chevet_vue(vue='face'):
    W, H = (16, 22) if vue == 'cote' else (14, 22)
    t = Toile(W, H)
    x0, x1 = (3, 12) if vue == 'cote' else (0, W - 1)
    cx = (W - 1) / 2
    haut, face = 9, 14
    for y in range(haut, face):                              # le dessus : deux planches de pin
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            k = 0 if y < 11 else 1
            t.put(x, y, ton(PINS[k], 0.84 - 0.14 * u + 0.05 * (face - y) / 5 - (0.14 if y == 11 else 0) + 0.03 * bruit(x // 3, y, 71)))
    for x in range(x0, x1 + 1):
        t.put(x, face - 1, ton(PINS[2], 0.96 - 0.15 * (x - x0) / max(1, x1 - x0)))
    for y in range(face, 21):                                # la face : des planches debout
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            k = ((x - x0) // 4) % 3
            lum = 0.56 - 0.22 * u - 0.06 * (y - face) / 6 + 0.04 * bruit(x, y // 2, 72)
            if (x - x0) % 4 == 3:
                lum -= 0.16
            if x == x0:
                lum += 0.14
            elif x == x1:
                lum -= 0.10
            t.put(x, y, ton(PINS[k], lum))
    if vue == 'face':                                        # le cœur découpé : on voit l'ombre dedans
        for (dx, dy) in ((-1, 0), (1, 0), (-2, -1), (-1, -1), (1, -1), (2, -1), (-1, 1), (0, 1), (1, 1), (0, 2), (0, 0)):
            x, y = round(cx) + dx - (1 if dx <= 0 else 0) + (0 if dx <= 0 else 0), 17 + dy
            t.put(round(cx) + dx, y, ton(PINS[0], 0.12 + 0.05 * (dy + 1)))
        t.put(round(cx) - 2, 16, ton(PINS[1], 0.25)); t.put(round(cx) + 2, 16, ton(PINS[1], 0.25))
    elif vue == 'cote':
        for y in range(15, 20):
            t.put(x1, y, ton(PINS[2], 0.72))
    for xp in (x0 + 1, x1 - 1):                              # les pieds
        t.put(xp, 21, ton(PINS[0], 0.42 if xp == x0 + 1 else 0.22))
        t.put(xp + (1 if xp == x0 + 1 else -1), 21, ton(PINS[0], 0.28))
    c = round(cx - 0.5)                                      # la lampe : un pied de bois tourné
    for x in range(c - 1, c + 3):
        t.put(x, 11, ton(PINS[2], 0.80 - 0.18 * (x - c + 1)))
        t.put(x, 12, ton(PINS[2], 0.42 - 0.06 * (x - c + 1)))
    for y in (9, 10):
        t.put(c, y, ton(PINS[2], 0.86))
        t.put(c + 1, y, ton(PINS[2], 0.45))
    for y in range(LAMPE_Y - 3, LAMPE_Y + 4):                # l'abat-jour écossais, un cône tronqué
        r = 2.4 + (y - (LAMPE_Y - 3)) * 0.55
        for x in range(W):
            d = x + 0.5 - (cx + 0.5)
            if abs(d) > r:
                continue
            u = d / r
            lum = 0.84 - 0.34 * u - 0.10 * u * u
            if y == LAMPE_Y - 3:
                t.put(x, y, ton(CREME, 0.95 - 0.3 * (u + 1) / 2))
                continue
            if y == LAMPE_Y + 3:
                lum -= 0.32
            t.put(x, y, carreau(x, y, max(0.05, lum), pas=2 if abs(u) < 0.6 else 4))
    for x in range(round(cx - 1), round(cx + 2)):
        t.put(x, LAMPE_Y - 3, ton(ROUGE, 0.12))              # l'intérieur, vu par le haut
    return t.fini()


# ---------- le tapis alpin ----------

def motif_tapis(u, v, lum):
    """Le tapis alpin : un fond crème, une bordure rouge en dents de scie, au milieu une étoile (edelweiss) verte et
    rouge ; u, v de 0 à 1 dans sa longueur et sa largeur."""
    bu, bv = min(u, 1 - u), min(v, 1 - v)
    if bu < 0.05 or bv < 0.10:
        return ton(ROUGE, 0.28 + 0.5 * lum)
    if bu < 0.09 or bv < 0.18:
        z = ((u * 40 + v * 22) % 4) < 2
        return ton(ROUGE if z else CREME, 0.35 + 0.5 * lum)
    du, dv = (u - 0.5) * 2.2, (v - 0.5) * 2
    r, a = math.hypot(du, dv), math.atan2(dv, du)
    petale = 0.5 + 0.22 * math.cos(a * 6)
    if r < 0.18:
        return ton(LAITON, 0.45 + 0.5 * lum)
    if r < petale:
        return ton(CREME, 0.55 + 0.45 * lum) if r < petale - 0.12 else ton(VERT, 0.35 + 0.5 * lum)
    for cu in (0.25, 0.75):                                  # deux petits cœurs rouges
        if math.hypot((u - cu) * 4, (v - 0.5) * 2.4) < 0.5:
            return ton(ROUGE, 0.40 + 0.5 * lum)
    return ton(CREME, 0.30 + 0.62 * lum)


def tapis(W, H, long_sur_x=True):
    t = Toile(W, H)
    for y in range(H):
        for x in range(W):
            if (x in (0, W - 1) and long_sur_x) or (y in (0, H - 1) and not long_sur_x):
                if (y if long_sur_x else x) % 2 == 0:
                    t.put(x, y, ton(CREME, 0.62))            # les franges
                continue
            u, v = (x / (W - 1), y / (H - 1)) if long_sur_x else (y / (H - 1), x / (W - 1))
            lum = 0.72 - 0.20 * x / W - 0.16 * y / H + 0.05 * bruit(x, y, 81) + (0.04 if (x + y) % 2 else -0.03)
            if y == H - 1:
                lum -= 0.25                                  # son épaisseur, devant
            t.put(x, y, motif_tapis(u, v, max(0.0, min(1.0, lum))))
    return t.fini()


# ---------- le tableau ----------

def tableau():
    W, H = 22, 14
    t = Toile(W, H)
    CIEL = rampe([(246, 196, 150), (238, 160, 140), (160, 140, 190), (96, 108, 170)], 80)
    NEIGE = rampe([(120, 130, 170), (190, 196, 220), (246, 244, 250)], 60)
    ROCHE = rampe([(60, 60, 80), (100, 100, 120), (140, 138, 150)], 60)
    for y in range(2, H - 2):                                # le ciel du soir
        for x in range(2, W - 2):
            t.put(x, y, ton(CIEL, 0.2 + 0.8 * (y - 2) / (H - 5) * 0.6 + 0.15 * (x / W)))
    for x in range(2, W - 2):                                # les sommets enneigés
        h = 3 + abs(((x - 2) % 10) - 5) * 0.8 + (2 if x > 11 else 0)
        for y in range(int(2 + h), H - 2):
            dans = y - (2 + h)
            if dans < 2.5 - abs(((x - 2) % 10) - 5) * 0.2:
                t.put(x, y, ton(NEIGE, 0.95 - 0.5 * ((x - 2) % 10 > 5)))
            else:
                t.put(x, y, ton(ROCHE, 0.6 - 0.3 * ((x - 2) % 10 > 5)))
    for x0 in (4, 7, 15, 18):                                # les sapins devant
        for y in range(H - 6, H - 2):
            for dx in range(-((y - (H - 6)) // 2), (y - (H - 6)) // 2 + 1):
                t.put(x0 + dx, y, ton(VERT, 0.25 + 0.2 * (dx < 0)))
    for x in range(W):                                       # le cadre de pin, son dessus clair
        for y in range(H):
            if x < 2 or x >= W - 2 or y < 2 or y >= H - 2:
                lum = 0.80 if y == 0 else 0.30 if y == H - 1 else 0.66 if x == 0 else 0.34 if x == W - 1 else 0.55
                t.put(x, y, ton(PINS[(x + y) // 6 % 3], lum + 0.04 * bruit(x, y, 91)))
    return t.fini()


IMAGES = {
    'chalet_lit': lit_face, 'chalet_lit_dos': lit_dos, 'chalet_lit_cote': lit_cote,
    'chalet_chevet': lambda: chevet_vue('face'), 'chalet_chevet_dos': lambda: chevet_vue('dos'),
    'chalet_chevet_cote': lambda: chevet_vue('cote'),
    'chalet_tapis': lambda: tapis(40, 22), 'chalet_tapis_dos': lambda: tapis(40, 22).transpose(Image.FLIP_LEFT_RIGHT),
    'chalet_tapis_cote': lambda: tapis(40, 22).rotate(90, expand=True),  # (le dessin de face, tourné de 90°)
    'chalet_tableau': tableau,
}


def main():
    out = {k: f() for k, f in IMAGES.items()}
    out['chalet_lit_drap'] = garde(out['chalet_lit'], lambda x, y: y >= 12)
    out['chalet_lit_dos_drap'] = garde(out['chalet_lit_dos'], lambda x, y: y <= out['chalet_lit_dos'].height - 15)
    out['chalet_lit_cote_drap'] = garde(out['chalet_lit_cote'], lambda x, y: x >= 12)
    for k, im in out.items():
        im.save(os.path.join(ASSETS, f'meuble_{k}.png'), optimize=True)
    print(f'ensemble chalet : {len(out)} images')
    if '--apercu' in sys.argv:
        ks = [k for k in out if not k.endswith('drap')]
        ap = Image.new('RGBA', (sum(out[k].width + 6 for k in ks) + 6, 50), (150, 120, 86, 255))
        x = 6
        for k in ks:
            ap.alpha_composite(out[k], (x, 48 - out[k].height))
            x += out[k].width + 6
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_chalet.png'))


if __name__ == '__main__':
    main()
