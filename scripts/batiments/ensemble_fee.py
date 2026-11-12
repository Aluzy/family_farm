# L'ensemble « chambre d'enfant féerique » de la boutique de gemmes (worker/src/boutique.mjs ARTICLES ensemble_fee) :
# le lit d'enfant blanc à la tête de lit en nuage et son édredon lilas étoilé, la table de chevet pastel et sa lampe
# champignon (un chapeau rouge à pois blancs), le tapis arc-en-ciel, le tableau de la licorne. Le parquet pastel et le
# papier peint aux nuages sont avec les autres sols (scripts/carte/blocs.py, motif_pastel) et papiers peints
# (scripts/carte/papiers_peints.py, nuages).
#
# Mêmes règles que les autres ensembles (scripts/batiments/ensemble_chalet.py). Le lit garde les mesures et les rangées
# du lit enfant (16 × 28 ; l'oreiller rangées 5 à 9, la couverture à partir de 12 ; de profil 30 × 22) ; le chevet
# l'abat-jour (ici le chapeau du champignon) centré rangée LAMPE_Y ; le tapis 40 × 22 (de profil : tourné de 90°).
#
#   python3 scripts/batiments/ensemble_fee.py            écrit assets/meuble_fee_*.png
#   python3 scripts/batiments/ensemble_fee.py --apercu   écrit aussi apercu_fee.png (agrandi)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ensemble_chalet as C  # noqa: E402
from ensemble_chalet import LAMPE_Y, Toile, garde  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402
from pixel import ASSETS, ROOT  # noqa: E402

BLANC = rampe([(120, 120, 160), (176, 176, 206), (220, 220, 236), (242, 242, 250), (252, 252, 255), (255, 255, 255)], 140)
LILAS = rampe([(60, 40, 100), (100, 72, 150), (146, 112, 192), (186, 156, 222), (220, 198, 240), (244, 232, 252)], 140)
OR = rampe([(150, 110, 40), (220, 180, 80), (250, 226, 140), (255, 248, 210)], 80)
MENTHE = rampe([(70, 130, 120), (120, 184, 168), (176, 224, 206), (220, 246, 236)], 100)
ROSE = rampe([(150, 70, 110), (210, 120, 160), (244, 174, 200), (255, 220, 232)], 100)
ROUGE = rampe([(110, 20, 30), (170, 40, 44), (216, 70, 62), (244, 120, 100)], 100)
LIN = C.LIN
ARC = [(232, 96, 96), (244, 164, 86), (246, 220, 104), (130, 200, 120), (110, 160, 220), (160, 120, 210)]


def etoile(x, y):
    """Le semis d'étoiles de l'édredon (période 7 × 6)."""
    return (x * 3 + y * 5) % 7 == 0 and y % 3 == 1


def edredon(t, x0, x1, y0, y1, pli_droite=True, pli_gauche=False):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cx, cy = (x - x0) % 5, (y - y0) % 5
            bombe = 1 - ((cx - 2) / 2.5) ** 2 - ((cy - 2) / 2.5) ** 2
            lum = 0.52 + 0.22 * bombe - 0.22 * (x - x0) / max(1, x1 - x0)
            if pli_droite and x >= x1 - 1:
                lum -= 0.24 + 0.08 * (x - x1 + 1)
            if pli_gauche and x <= x0 + 1:
                lum -= 0.26
            if y == y1:
                lum -= 0.1
            t.put(x, y, ton(OR, 0.6 + 0.4 * lum) if etoile(x, y) else ton(LILAS, max(0.05, lum)))


def nuage_tete(t, W, y0, h, devant=False):
    """La tête de lit en nuage : des bosses rondes en haut, peintes en blanc, éclairées à gauche."""
    for y in range(y0, y0 + h):
        for x in range(W):
            bosse = min(abs(((x + 2) % 6) - 3), 3) * 0.5
            if y < y0 + bosse:
                continue
            u = x / (W - 1)
            lum = 0.92 - 0.3 * u - 0.25 * (y - y0) / h + (0.08 if y - y0 - bosse < 1 else 0)
            t.put(x, y, ton(BLANC, lum))


def lit_face():
    W, H = 16, 28
    t = Toile(W, H)
    for y in range(4, H - 4):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.82 - 0.12 * x / W - (0.2 if y == 4 else 0)))
    for y in range(5, 10):
        for x in range(3, W - 3):
            u, v = (x - (W - 1) / 2) / ((W - 6) / 2), (y - 7) / 2.5
            if abs(u) > 0.95 and abs(v) > 0.7:
                continue
            t.put(x, y, ton(ROSE, 0.95 - 0.18 * u - 0.2 * v - 0.12 * (u * u + v * v)))
    for x in range(4, W - 4):
        t.put(x, 10, ton(LIN, 0.42))
    for y in (12, 13):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, (0.95 if y == 12 else 0.66) - 0.12 * x / W))
    edredon(t, 1, W - 2, 14, H - 5)
    nuage_tete(t, W, 0, 4)
    for y in range(H - 4, H):                                # le pied de lit, blanc
        for x in range(W):
            u = x / (W - 1)
            t.put(x, y, ton(BLANC, (0.92 - 0.2 * u) if y == H - 4 else 0.60 - 0.25 * u - 0.05 * (y - H + 3)))
    t.put(3, H - 2, ton(OR, 0.9)); t.put(W - 4, H - 2, ton(OR, 0.9))   # deux étoiles dorées
    return t.fini()


def lit_dos():
    W, H = 16, 28
    t = Toile(W, H)
    for y in range(2, H - 6):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.76 - 0.12 * x / W))
    edredon(t, 1, W - 2, 2, H - 18, pli_droite=False, pli_gauche=True)
    for y in (H - 17, H - 16, H - 15):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.92 - 0.25 * (y - H + 17) / 2 - 0.1 * x / W))
    for y in range(H - 13, H - 8):
        for x in range(3, W - 3):
            u, v = (x - (W - 1) / 2) / ((W - 6) / 2), (y - (H - 11)) / 2.5
            t.put(x, y, ton(ROSE, 0.90 - 0.18 * u - 0.15 * v - 0.12 * (u * u + v * v)))
    for y in (0, 1):
        for x in range(W):
            t.put(x, y, ton(BLANC, 0.9 - 0.25 * x / W - 0.3 * y))
    nuage_tete(t, W, H - 7, 7, devant=True)
    return t.fini()


def lit_cote():
    W, H = 30, 22                                            # (comme le lit enfant de profil : 28 + 2 ; 8 + 10 + 3 + 1)
    ht, hc, hb = 10, 3, 8
    t = Toile(W, H)
    y0, y1 = hb, hb + ht - 1
    for y in range(y0, y1 + 1):
        for x in range(4, W - 1):
            t.put(x, y, ton(LIN, 0.82 - 0.18 * (y - y0) / ht))
    for y in range(y0 + 1, y1):
        for x in range(5, 10):
            t.put(x, y, ton(ROSE, 0.94 - 0.25 * (y - y0) / ht - 0.1 * (x - 5) / 5))
    for y in range(y0, y1 + 1):
        for x in (12, 13):
            t.put(x, y, ton(LIN, 0.92 - 0.2 * (y - y0) / ht - 0.18 * (x - 12)))
    edredon(t, 14, W - 2, y0, y1, pli_droite=False)
    for y in range(y1 + 1, y1 + hc + 1):
        for x in range(4, W - 1):
            t.put(x, y, ton(LILAS, 0.30 - 0.06 * (y - y1)) if x >= 15 else ton(BLANC, 0.6 - 0.1 * (y - y1)))
    for y in range(0, H):                                    # la tête de lit en nuage, de chant
        for x in range(0, 4):
            if y < 2 and x in (0, 3):
                continue
            t.put(x, y, ton(BLANC, 0.9 - 0.15 * x - 0.2 * y / H))
    for y in range(y0 - 2, H):
        t.put(W - 2, y, ton(BLANC, 0.85)); t.put(W - 1, y, ton(BLANC, 0.45))
    return t.fini()


def chevet_vue(vue='face'):
    W, H = (16, 22) if vue == 'cote' else (14, 22)
    t = Toile(W, H)
    x0, x1 = (3, 12) if vue == 'cote' else (0, W - 1)
    cx = (W - 1) / 2
    haut, face = 9, 14
    for y in range(haut, face):                              # le dessus, menthe pastel
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            t.put(x, y, ton(MENTHE, 0.86 - 0.16 * u + 0.04 * (face - y) / 5))
    for x in range(x0, x1 + 1):
        t.put(x, face - 1, ton(MENTHE, 0.98 - 0.15 * (x - x0) / max(1, x1 - x0)))
    for y in range(face, 21):                                # la face, le tiroir rose, sa poignée étoile
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            lum = 0.62 - 0.26 * u - 0.06 * (y - face) / 6 + (0.12 if x == x0 else -0.1 if x == x1 else 0)
            t.put(x, y, ton(MENTHE, lum))
    if vue == 'face':
        for y in range(15, 20):
            for x in range(x0 + 2, x1 - 1):
                t.put(x, y, ton(ROSE, 0.78 - 0.3 * (x - x0) / W - (0.3 if y == 19 else 0) + (0.1 if y == 15 else 0)))
        c = round(cx)
        for (dx, dy, l) in ((0, -1, 0.9), (-1, 0, 0.8), (0, 0, 1.0), (1, 0, 0.6), (0, 1, 0.5)):
            t.put(c + dx, 17 + dy, ton(OR, l))
    elif vue == 'cote':
        for y in range(15, 20):
            t.put(x1, y, ton(ROSE, 0.7))
    for xp in (x0 + 1, x1 - 1):
        t.put(xp, 21, ton(MENTHE, 0.45 if xp == x0 + 1 else 0.25))
    c = round(cx - 0.5)                                      # la lampe champignon : le pied blanc
    for y in range(LAMPE_Y + 3, 13):
        for x in (c, c + 1):
            t.put(x, y, ton(BLANC, 0.9 if x == c else 0.55))
    for y in range(LAMPE_Y - 3, LAMPE_Y + 3):                # le chapeau rouge à pois blancs, bombé
        r = 3.8 - abs(y - LAMPE_Y - 1) * 0.35 if y >= LAMPE_Y - 1 else 1.6 + (y - (LAMPE_Y - 3)) * 1.1
        for x in range(W):
            d = x + 0.5 - (cx + 0.5)
            if abs(d) > r:
                continue
            u = d / max(1, r)
            lum = 0.85 - 0.35 * u - 0.15 * (y - LAMPE_Y + 3) / 6
            pois = (x * 2 + y * 3) % 5 == 0 and y < LAMPE_Y + 2
            t.put(x, y, ton(BLANC, 0.95 - 0.2 * u) if pois else ton(ROUGE, lum))
    for x in range(round(cx - 2), round(cx + 3)):            # le dessous des lamelles, sous le chapeau
        t.put(x, LAMPE_Y + 3, ton(ROSE, 0.6))
    return t.fini()


def tapis():
    W, H = 40, 22
    t = Toile(W, H)
    for y in range(H):
        for x in range(W):
            u, v = (x - (W - 1) / 2) / (W / 2), (y - (H - 1)) / (H - 2)
            r = math.hypot(u, v * 0.95)                      # un arc-en-ciel en demi-cercle, posé sur un nuage
            if r > 1.0:
                continue
            lum = 0.72 - 0.18 * x / W + 0.04 * bruit(x, y, 161) + (0.04 if (x + y) % 2 else -0.03)
            if y == H - 1:
                lum -= 0.22
            k = int((1 - r) * 9)
            if k < len(ARC):
                c = ARC[k]
                R = rampe([tuple(int(v * 0.45) for v in c), c, tuple(min(255, int(v * 1.25)) for v in c)], 40)
                t.put(x, y, ton(R, lum))
            else:
                t.put(x, y, ton(BLANC, 0.6 + 0.4 * lum))     # le nuage au milieu
    return t.fini()


def tableau():
    W, H = 22, 14
    t = Toile(W, H)
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            t.put(x, y, ton(MENTHE if y > 8 else ROSE, 0.85 - 0.3 * (y - 2) / (H - 4)))
    for i, c in enumerate(ARC):                              # l'arc-en-ciel
        for a in range(18):
            ang = math.pi * a / 17
            x, y = 11 + (8 - i * 0.7) * math.cos(ang), 10 - (6 - i * 0.6) * math.sin(ang)
            if 2 <= x < W - 2 and 2 <= y < H - 2:
                t.put(x, y, c)
    for (x, y) in ((8, 8), (9, 8), (10, 8), (11, 8), (8, 9), (11, 9)):   # la licorne : un corps blanc, sa corne d'or
        t.put(x, y, ton(BLANC, 0.95))
    t.put(12, 7, ton(BLANC, 0.9)); t.put(13, 6, ton(OR, 0.9)); t.put(11, 7, ton(ROSE, 0.7))
    for x in range(W):                                       # le cadre lilas, ses coins étoilés
        for y in range(H):
            if x < 2 or x >= W - 2 or y < 2 or y >= H - 2:
                lum = 0.86 if y == 0 else 0.32 if y == H - 1 else 0.7 if x == 0 else 0.36 if x == W - 1 else 0.58
                t.put(x, y, ton(LILAS, lum))
    for (x, y) in ((0, 0), (W - 2, 0), (0, H - 2), (W - 2, H - 2)):
        t.put(x, y, ton(OR, 1.0)); t.put(x + 1, y + 1, ton(OR, 0.7))
    return t.fini()


IMAGES = {
    'fee_lit': lit_face, 'fee_lit_dos': lit_dos, 'fee_lit_cote': lit_cote,
    'fee_chevet': lambda: chevet_vue('face'), 'fee_chevet_dos': lambda: chevet_vue('dos'),
    'fee_chevet_cote': lambda: chevet_vue('cote'),
    'fee_tapis': tapis, 'fee_tapis_dos': lambda: tapis().transpose(Image.FLIP_LEFT_RIGHT),
    'fee_tapis_cote': lambda: tapis().rotate(90, expand=True),  # (le dessin de face, tourné de 90°)
    'fee_tableau': tableau,
}


def main():
    out = {k: f() for k, f in IMAGES.items()}
    out['fee_lit_drap'] = garde(out['fee_lit'], lambda x, y: y >= 12)
    out['fee_lit_dos_drap'] = garde(out['fee_lit_dos'], lambda x, y: y <= out['fee_lit_dos'].height - 15)
    out['fee_lit_cote_drap'] = garde(out['fee_lit_cote'], lambda x, y: x >= 12)
    for k, im in out.items():
        im.save(os.path.join(ASSETS, f'meuble_{k}.png'), optimize=True)
    print(f'ensemble chambre féerique : {len(out)} images')
    if '--apercu' in sys.argv:
        ks = [k for k in out if not k.endswith('drap')]
        ap = Image.new('RGBA', (sum(out[k].width + 6 for k in ks) + 6, 50), (150, 120, 86, 255))
        x = 6
        for k in ks:
            ap.alpha_composite(out[k], (x, 48 - out[k].height))
            x += out[k].width + 6
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_fee.png'))


if __name__ == '__main__':
    main()
