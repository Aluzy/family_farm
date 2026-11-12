# L'ensemble « bord de mer » de la boutique de gemmes (worker/src/boutique.mjs ARTICLES ensemble_mer) : le lit de bois
# flotté et son édredon à rayures marines, la table de chevet de bois flotté et sa lampe-bocal (du sable, des
# coquillages, un abat-jour de lin), le tapis de jute à bandes marines, le tableau du phare. Le plancher flotté et le
# papier peint aux vagues sont avec les autres sols (scripts/carte/blocs.py, motif_flotte) et papiers peints
# (scripts/carte/papiers_peints.py, vagues).
#
# Mêmes règles et mêmes mesures que les ensembles chalet et cottage (scripts/batiments/ensemble_chalet.py) : le lit aux
# rangées du lit adulte, le chevet à l'abat-jour centré rangée LAMPE_Y, le tapis de 40 × 22 (de profil : tourné de 90°).
#
#   python3 scripts/batiments/ensemble_mer.py            écrit assets/meuble_mer_*.png
#   python3 scripts/batiments/ensemble_mer.py --apercu   écrit aussi apercu_mer.png (agrandi)
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

# le bois flotté : gris argenté, un peu de miel dans les lumières, l'ombre bleutée ; trois rampes (une par planche)
FLOTTES = [rampe([(64, 66, 72), (108, 106, 104), (150, 144, 134), (188, 180, 164), (218, 210, 192), (240, 234, 220)], 140),
           rampe([(60, 64, 74), (102, 102, 104), (144, 140, 132), (182, 176, 162), (214, 206, 190), (238, 232, 218)], 140),
           rampe([(70, 68, 70), (114, 108, 100), (156, 146, 130), (194, 182, 160), (222, 212, 188), (244, 236, 216)], 140)]
MARINE = rampe([(14, 22, 52), (26, 40, 86), (40, 62, 122), (64, 92, 158), (110, 140, 196), (170, 194, 230)], 140)
BLANC = rampe([(120, 130, 150), (176, 184, 196), (220, 224, 228), (242, 242, 240), (252, 252, 248), (255, 255, 255)], 140)
LIN = C.LIN
JUTE = rampe([(88, 66, 38), (138, 108, 66), (178, 146, 96), (208, 180, 128), (232, 210, 164)], 120)
VERRE = rampe([(70, 110, 120), (120, 170, 176), (186, 222, 222), (232, 248, 246)], 80)
SABLE = rampe([(150, 120, 80), (200, 172, 120), (232, 210, 160), (248, 236, 200)], 80)
CORAIL = rampe([(150, 60, 50), (210, 110, 90), (246, 170, 140)], 60)


def rayure(x, y, lum, sens_x=False):
    """Les rayures marines de l'édredon : marine et blanc, deux pixels chacune."""
    k = (x if sens_x else y) // 2 % 2
    return ton(MARINE, 0.25 + lum * 0.6) if k else ton(BLANC, 0.2 + lum * 0.78)


def planche(t, x0, x1, y0, ep, k, lum0=0.0, vertical=False):
    """Une planche de bois flotté : son chant éclairé, le fil usé, des veines plus sombres, ses bouts arrondis."""
    R = FLOTTES[k % 3]
    for y in range(y0, y0 + ep):
        v = (y - y0 + 0.5) / ep
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            lum = 0.80 - 0.45 * v - 0.14 * u + lum0 + 0.05 * bruit(x // 2, y, 140 + k)
            if (x * 3 + y * 7 + k) % 11 == 0:
                lum -= 0.12                                   # une veine
            t.put(x, y, ton(R, lum))


def poteau(t, x0, x1, y0, y1, k):
    R = FLOTTES[k % 3]
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0 + 0.5) / (x1 - x0 + 1)
            t.put(x, y, ton(R, (0.92 - 0.3 * u) if y == y0 else 0.70 - 0.5 * u + 0.04 * bruit(x, y, 150 + k)))


def edredon(t, x0, x1, y0, y1, pli_droite=True, pli_gauche=False):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            lum = 0.80 - 0.22 * (x - x0) / max(1, x1 - x0) - 0.08 * ((y - y0) % 5 == 4)
            if pli_droite and x >= x1 - 1:
                lum -= 0.26 + 0.08 * (x - x1 + 1)
            if pli_gauche and x <= x0 + 1:
                lum -= 0.26
            if y == y1:
                lum -= 0.1
            t.put(x, y, rayure(x, y, max(0.05, lum)))


def lit_face():
    W, H = 20, 34
    t = Toile(W, H)
    for y in range(4, H - 4):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.80 - 0.12 * x / W - (0.2 if y == 4 else 0) + 0.03 * bruit(x // 3, y // 2, 61)))
    for y in range(5, 10):
        for x in range(3, W - 3):
            u, v = (x - (W - 1) / 2) / ((W - 6) / 2), (y - 7) / 2.5
            if abs(u) > 0.95 and abs(v) > 0.7:
                continue
            t.put(x, y, ton(BLANC, 0.92 - 0.18 * u - 0.22 * v - 0.12 * (u * u + v * v)))
    for x in range(4, W - 4):
        t.put(x, 10, ton(LIN, 0.42))
    for y in (12, 13):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, (0.95 if y == 12 else 0.66) - 0.12 * x / W))
    edredon(t, 1, W - 2, 14, H - 5)
    planche(t, 0, W - 1, 0, 4, 0)                            # la tête de lit : une planche flottée
    planche(t, 0, W - 1, H - 4, 4, 1, 0.04)                  # le pied de lit
    for x0 in (0, W - 2):
        poteau(t, x0, x0 + 1, 0, 4, 2)
        poteau(t, x0, x0 + 1, H - 5, H - 1, 1)
    for x in range(4, W - 4):                                # une corde nouée sur la tête de lit
        t.put(x, 2, ton(JUTE, 0.7 if x % 2 else 0.45))
    return t.fini()


def lit_dos():
    W, H = 20, 34
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
            t.put(x, y, ton(BLANC, 0.88 - 0.18 * u - 0.15 * v - 0.12 * (u * u + v * v)))
    planche(t, 0, W - 1, 0, 2, 1)
    planche(t, 0, W - 1, H - 7, 4, 0, 0.04)
    planche(t, 0, W - 1, H - 3, 3, 2, -0.08)
    for x0 in (0, W - 2):
        poteau(t, x0, x0 + 1, H - 8, H - 1, 2)
    return t.fini()


def lit_cote():
    W, H = 36, 26
    ht, hc, hb = 14, 3, 8
    t = Toile(W, H)
    y0, y1 = hb, hb + ht - 1
    for y in range(y0, y1 + 1):
        for x in range(4, W - 1):
            t.put(x, y, ton(LIN, 0.82 - 0.18 * (y - y0) / ht))
    for y in range(y0 + 1, y1):
        for x in range(5, 10):
            t.put(x, y, ton(BLANC, 0.94 - 0.25 * (y - y0) / ht - 0.1 * (x - 5) / 5))
    for y in range(y0, y1 + 1):
        for x in (12, 13):
            t.put(x, y, ton(LIN, 0.92 - 0.2 * (y - y0) / ht - 0.18 * (x - 12)))
        for x in range(14, W - 1):
            lum = 0.80 - 0.28 * (y - y0) / ht
            t.put(x, y, rayure(x, y, max(0.05, lum), sens_x=True))
    for y in range(y1 + 1, y1 + hc + 1):
        for x in range(15, W - 1):
            t.put(x, y, rayure(x, y, 0.30 - 0.06 * (y - y1), sens_x=True))
    planche(t, 4, 14, y1 + 1, hc, 1, -0.05)
    poteau(t, 0, 3, 0, H - 1, 0)
    poteau(t, W - 2, W - 1, y0 - 2, H - 1, 2)
    return t.fini()


def chevet_vue(vue='face'):
    W, H = (16, 22) if vue == 'cote' else (14, 22)
    t = Toile(W, H)
    x0, x1 = (3, 12) if vue == 'cote' else (0, W - 1)
    cx = (W - 1) / 2
    haut, face = 9, 14
    for y in range(haut, face):                              # le dessus : deux planches flottées
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            k = 0 if y < 11 else 1
            t.put(x, y, ton(FLOTTES[k], 0.84 - 0.14 * u + 0.04 * (face - y) / 5 - (0.14 if y == 11 else 0) + 0.03 * bruit(x // 3, y, 151)))
    for x in range(x0, x1 + 1):
        t.put(x, face - 1, ton(FLOTTES[2], 0.96 - 0.15 * (x - x0) / max(1, x1 - x0)))
    for y in range(face, 21):                                # la face : des planches couchées, une corde en poignée
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            k = ((y - face) // 3) % 3
            lum = 0.58 - 0.24 * u + 0.04 * bruit(x // 2, y, 152) - (0.16 if (y - face) % 3 == 2 else 0)
            if x == x0:
                lum += 0.12
            elif x == x1:
                lum -= 0.10
            t.put(x, y, ton(FLOTTES[k], lum))
    if vue == 'face':
        for x in range(round(cx) - 2, round(cx) + 3):
            t.put(x, 17 + (1 if abs(x - cx) < 1.5 else 0), ton(JUTE, 0.75 - 0.08 * (x - cx)))
    elif vue == 'cote':
        for y in range(15, 20):
            t.put(x1, y, ton(FLOTTES[2], 0.7))
    for xp in (x0 + 1, x1 - 1):
        t.put(xp, 21, ton(FLOTTES[0], 0.42 if xp == x0 + 1 else 0.22))
    c = round(cx - 0.5)                                      # la lampe : un bocal de verre, du sable, des coquillages
    for y in range(7, 13):
        for x in range(c - 1, c + 3):
            u = (x - c + 1) / 3
            if y >= 10:
                t.put(x, y, ton(SABLE, 0.85 - 0.4 * u))
            else:
                t.put(x, y, ton(VERRE, 0.80 - 0.45 * u + (0.2 if x == c - 1 and y == 8 else 0)))
    t.put(c, 10, ton(CORAIL, 0.8)); t.put(c + 1, 11, ton(BLANC, 0.95))
    for y in range(LAMPE_Y - 3, LAMPE_Y + 3):                # l'abat-jour de lin, droit
        r = 3.0 + (y - (LAMPE_Y - 3)) * 0.3
        for x in range(W):
            d = x + 0.5 - (cx + 0.5)
            if abs(d) > r:
                continue
            u = d / r
            lum = 0.88 - 0.34 * u - 0.08 * u * u + 0.03 * bruit(x, y, 153)
            if y == LAMPE_Y - 3:
                lum = 0.98 - 0.3 * (u + 1) / 2
            elif y == LAMPE_Y + 2:
                lum = 0.46 - 0.12 * u
            t.put(x, y, ton(LIN, lum))
    for x in range(round(cx - 1), round(cx + 2)):
        t.put(x, LAMPE_Y - 3, ton(LIN, 0.2))
    return t.fini()


def tapis():
    W, H = 40, 22
    t = Toile(W, H)
    for y in range(H):
        for x in range(W):
            if x in (0, W - 1):
                if y % 2 == 0:
                    t.put(x, y, ton(JUTE, 0.62))
                continue
            u, v = x / (W - 1), y / (H - 1)
            lum = 0.70 - 0.18 * u - 0.14 * v + 0.06 * bruit(x, y, 154) + (0.06 if (x + y) % 2 else -0.04)   # le tressage
            if y == H - 1:
                lum -= 0.25
            bu = min(u, 1 - u)
            if 0.08 < bu < 0.13 or 0.17 < bu < 0.19:
                t.put(x, y, ton(MARINE, 0.2 + 0.5 * lum))   # les bandes marines
            else:
                t.put(x, y, ton(JUTE, lum))
    return t.fini()


def tableau():
    W, H = 22, 14
    t = Toile(W, H)
    CIEL = rampe([(120, 170, 220), (180, 214, 240), (236, 246, 252)], 60)
    MER = rampe([(20, 60, 110), (40, 100, 160), (110, 170, 210)], 60)
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            if y < 8:
                t.put(x, y, ton(CIEL, 0.95 - 0.6 * (y - 2) / 6))
            else:
                t.put(x, y, ton(MER, 0.5 + 0.25 * ((x + y * 2) % 5 == 0) - 0.15 * (y - 8) / 4))
    for y in range(3, 10):                                   # le phare : rayé rouge et blanc, sa lanterne
        for x in (14, 15, 16):
            k = (y // 2) % 2
            t.put(x, y, ton(CORAIL, 0.6 - 0.2 * (x - 14)) if k else ton(BLANC, 0.95 - 0.2 * (x - 14)))
    for x in (13, 14, 15, 16, 17):
        t.put(x, 10, ton(FLOTTES[0], 0.4))                    # son rocher
    t.put(15, 2, ton(SABLE, 1.0)); t.put(14, 2, ton(MARINE, 0.3)); t.put(16, 2, ton(MARINE, 0.3))
    for x in (5, 6, 7):                                      # une voile au loin
        t.put(x, 7, ton(BLANC, 1.0 - 0.1 * (x - 5)))
    t.put(6, 6, ton(BLANC, 0.9))
    for x in range(W):                                       # le cadre de bois flotté
        for y in range(H):
            if x < 2 or x >= W - 2 or y < 2 or y >= H - 2:
                lum = 0.86 if y == 0 else 0.32 if y == H - 1 else 0.70 if x == 0 else 0.36 if x == W - 1 else 0.58
                t.put(x, y, ton(FLOTTES[(x + y) // 5 % 3], lum + 0.04 * bruit(x, y, 155)))
    return t.fini()


IMAGES = {
    'mer_lit': lit_face, 'mer_lit_dos': lit_dos, 'mer_lit_cote': lit_cote,
    'mer_chevet': lambda: chevet_vue('face'), 'mer_chevet_dos': lambda: chevet_vue('dos'),
    'mer_chevet_cote': lambda: chevet_vue('cote'),
    'mer_tapis': tapis, 'mer_tapis_dos': lambda: tapis().transpose(Image.FLIP_LEFT_RIGHT),
    'mer_tapis_cote': lambda: tapis().rotate(90, expand=True),  # (le dessin de face, tourné de 90°)
    'mer_tableau': tableau,
}


def main():
    out = {k: f() for k, f in IMAGES.items()}
    out['mer_lit_drap'] = garde(out['mer_lit'], lambda x, y: y >= 12)
    out['mer_lit_dos_drap'] = garde(out['mer_lit_dos'], lambda x, y: y <= out['mer_lit_dos'].height - 15)
    out['mer_lit_cote_drap'] = garde(out['mer_lit_cote'], lambda x, y: x >= 12)
    for k, im in out.items():
        im.save(os.path.join(ASSETS, f'meuble_{k}.png'), optimize=True)
    print(f'ensemble bord de mer : {len(out)} images')
    if '--apercu' in sys.argv:
        ks = [k for k in out if not k.endswith('drap')]
        ap = Image.new('RGBA', (sum(out[k].width + 6 for k in ks) + 6, 50), (150, 120, 86, 255))
        x = 6
        for k in ks:
            ap.alpha_composite(out[k], (x, 48 - out[k].height))
            x += out[k].width + 6
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_mer.png'))


if __name__ == '__main__':
    main()
