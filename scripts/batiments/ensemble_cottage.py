# L'ensemble « cottage anglais » de la boutique de gemmes (worker/src/boutique.mjs ARTICLES ensemble_cottage) : le lit
# de fer forgé blanc à pommeaux de laiton et son édredon de chintz à roses, la table de chevet peinte en blanc et sa
# lampe de porcelaine à l'abat-jour rose plissé, le tapis au médaillon de roses, le tableau du jardin du cottage. Le
# plancher blanchi et le papier peint aux roses anglaises sont avec les autres sols (scripts/carte/blocs.py,
# motif_blanchi) et papiers peints (scripts/carte/papiers_peints.py, roses).
#
# Mêmes règles et mêmes mesures que l'ensemble chalet (scripts/batiments/ensemble_chalet.py, dont il reprend les
# outils) : le lit aux rangées du lit adulte, le chevet à l'abat-jour centré rangée LAMPE_Y, le tapis de 40 × 22.
#
#   python3 scripts/batiments/ensemble_cottage.py            écrit assets/meuble_cottage_*.png
#   python3 scripts/batiments/ensemble_cottage.py --apercu   écrit aussi apercu_cottage.png (agrandi)
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

# le fer peint en blanc (l'ombre bleutée, froide), le laiton des pommeaux
BLANC = rampe([(96, 102, 120), (150, 156, 170), (204, 206, 212), (234, 234, 232), (250, 248, 242), (255, 254, 250)], 140)
LAITON = rampe([(84, 56, 18), (150, 108, 36), (206, 164, 70), (240, 214, 132), (255, 246, 204)], 100)
CHINTZ = rampe([(150, 136, 116), (200, 188, 164), (232, 222, 200), (246, 240, 224), (255, 252, 242)], 120)
ROSE = rampe([(96, 24, 48), (150, 44, 72), (198, 78, 104), (232, 130, 150), (250, 190, 200), (255, 230, 234)], 140)
FEUILLE = rampe([(30, 56, 36), (52, 92, 52), (84, 128, 70), (128, 166, 98), (176, 202, 140)], 100)
LIN = C.LIN
BOIS_BLANC = rampe([(110, 104, 100), (164, 158, 150), (208, 204, 196), (234, 230, 222), (248, 246, 240), (255, 255, 250)], 140)
PORCELAINE = rampe([(70, 90, 130), (120, 146, 190), (196, 210, 232), (240, 244, 250), (255, 255, 255)], 100)
ABAT = rampe([(120, 50, 70), (180, 92, 112), (224, 150, 162), (246, 200, 206), (255, 236, 238)], 120)


def chintz(x, y, lum):
    """Le chintz de l'édredon : un fond crème, des roses (période 6 × 5, en quinconce) et leurs feuilles."""
    r = y // 5
    cx, cy = (x + 3 * (r % 2)) % 6, y % 5
    d = (cx - 2.5) ** 2 / 2.2 + (cy - 2) ** 2 / 1.6
    if d < 1:
        return ton(ROSE, 0.25 + lum * 0.7 - 0.25 * d)
    if d < 1.8 and (cx + cy) % 3 == 0:
        return ton(FEUILLE, 0.2 + lum * 0.6)
    return ton(CHINTZ, 0.15 + lum * 0.82)


def barreaux(t, x0, x1, y0, y1, fond=None):
    """Le cadre de fer forgé : la barre du haut, les barreaux ; entre eux, ce qu'on voit derrière (fond(x, y))."""
    if fond:
        for y in range(y0 + 2, y1 + 1):
            for x in range(x0, x1 + 1):
                t.put(x, y, fond(x, y))
    for x in range(x0, x1 + 1):
        u = (x - x0) / max(1, x1 - x0)
        t.put(x, y0, ton(BLANC, 0.95 - 0.2 * u))
        t.put(x, y0 + 1, ton(BLANC, 0.55 - 0.2 * u))
    for x in range(x0 + 2, x1 - 1, 3):
        for y in range(y0 + 2, y1 + 1):
            t.put(x, y, ton(BLANC, 0.86 - 0.3 * (x - x0) / (x1 - x0)))


def pommeau(t, x, y):
    t.put(x, y, ton(LAITON, 0.95)); t.put(x + 1, y, ton(LAITON, 0.55))
    t.put(x, y + 1, ton(LAITON, 0.6)); t.put(x + 1, y + 1, ton(LAITON, 0.3))


def edredon(t, x0, x1, y0, y1, pli_droite=True, pli_gauche=False):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cx, cy = (x - x0) % 6, (y - y0) % 5
            bombe = 1 - ((cx - 2.5) / 3) ** 2 - ((cy - 2) / 2.5) ** 2
            lum = 0.56 + 0.22 * bombe - 0.22 * (x - x0) / max(1, x1 - x0)
            if pli_droite and x >= x1 - 1:
                lum -= 0.24 + 0.08 * (x - x1 + 1)
            if pli_gauche and x <= x0 + 1:
                lum -= 0.26
            if y == y1:
                lum -= 0.1
            t.put(x, y, chintz(x, y, max(0.05, lum)))


def lit_face():
    W, H = 20, 34
    t = Toile(W, H)
    for y in range(4, H - 4):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, 0.80 - 0.12 * x / W - (0.2 if y == 4 else 0) + 0.03 * bruit(x // 3, y // 2, 61)))
    for y in range(5, 10):                                   # l'oreiller, son volant de dentelle
        for x in range(2, W - 2):
            u, v = (x - (W - 1) / 2) / ((W - 4) / 2), (y - 7) / 2.5
            lum = 0.92 - 0.18 * u - 0.22 * v - 0.12 * (u * u + v * v)
            if x in (2, W - 3) or y in (5, 9):
                lum += 0.06 if (x + y) % 2 else -0.12        # la dentelle
            t.put(x, y, ton(LIN, lum))
    for x in range(3, W - 3):
        t.put(x, 10, ton(LIN, 0.42))
    for y in (12, 13):
        for x in range(1, W - 1):
            t.put(x, y, ton(LIN, (0.95 if y == 12 else 0.66) - 0.12 * x / W))
    edredon(t, 1, W - 2, 14, H - 5)
    barreaux(t, 0, W - 1, 0, 3, lambda x, y: ton(LIN, 0.34 - 0.1 * x / W))   # la tête de lit (derrière : le matelas)
    barreaux(t, 0, W - 1, H - 4, H - 1, lambda x, y: chintz(x, y, 0.22))     # le pied de lit (derrière : l'édredon)
    for x0 in (0, W - 2):
        pommeau(t, x0, 0)
        pommeau(t, x0, H - 4)
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
        for x in range(2, W - 2):
            u, v = (x - (W - 1) / 2) / ((W - 4) / 2), (y - (H - 11)) / 2.5
            lum = 0.88 - 0.18 * u - 0.15 * v - 0.12 * (u * u + v * v)
            if x in (2, W - 3):
                lum -= 0.12 if (x + y) % 2 else 0
            t.put(x, y, ton(LIN, lum))
    barreaux(t, 0, W - 1, 0, 1)
    barreaux(t, 0, W - 1, H - 7, H - 1, lambda x, y: ton(LIN, 0.36 - 0.1 * x / W))   # la tête de lit, haute, devant
    for x0 in (0, W - 2):
        pommeau(t, x0, H - 8)
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
            t.put(x, y, ton(LIN, 0.94 - 0.25 * (y - y0) / ht - 0.1 * (x - 5) / 5 - (0.1 if (x + y) % 2 and x == 9 else 0)))
    for y in range(y0, y1 + 1):
        for x in (12, 13):
            t.put(x, y, ton(LIN, 0.92 - 0.2 * (y - y0) / ht - 0.18 * (x - 12)))
    edredon(t, 14, W - 2, y0, y1, pli_droite=False)
    for y in range(y1 + 1, y1 + hc + 1):                     # l'édredon qui retombe, le flanc de fer
        for x in range(15, W - 1):
            t.put(x, y, chintz(x, y, 0.30 - 0.06 * (y - y1)))
        for x in range(4, 15):
            t.put(x, y, ton(BLANC, 0.6 - 0.1 * (y - y1)))
    for y in range(0, H):                                    # la tête de lit, de chant : deux montants, des barreaux
        for x in (0, 3):
            t.put(x, y, ton(BLANC, 0.9 if x == 0 else 0.5))
        if y % 3 == 0:
            for x in (1, 2):
                t.put(x, y, ton(BLANC, 0.7))
    pommeau(t, 0, 0); pommeau(t, 2, 0)
    for y in range(y0 - 2, H):                               # le pied de lit
        t.put(W - 2, y, ton(BLANC, 0.85)); t.put(W - 1, y, ton(BLANC, 0.45))
    pommeau(t, W - 2, y0 - 3)
    return t.fini()


def chevet_vue(vue='face'):
    W, H = (16, 22) if vue == 'cote' else (14, 22)
    t = Toile(W, H)
    x0, x1 = (3, 12) if vue == 'cote' else (0, W - 1)
    cx = (W - 1) / 2
    haut, face = 9, 14
    for y in range(haut, face):                              # le dessus, peint en blanc, un napperon de dentelle
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            t.put(x, y, ton(BOIS_BLANC, 0.88 - 0.16 * u + 0.04 * (face - y) / 5 + 0.02 * bruit(x, y, 71)))
    for x in range(x0 + 2, x1 - 1):
        for y in (10, 12):
            if (x + y) % 2 == 0:
                t.put(x, y, ton(LIN, 1.0))
    for x in range(x0, x1 + 1):
        t.put(x, face - 1, ton(BOIS_BLANC, 0.98 - 0.15 * (x - x0) / max(1, x1 - x0)))
    for y in range(face, 21):                                # la face peinte, ses moulures
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            lum = 0.66 - 0.26 * u - 0.06 * (y - face) / 6
            if x == x0:
                lum += 0.12
            elif x == x1:
                lum -= 0.10
            t.put(x, y, ton(BOIS_BLANC, lum))
    if vue == 'face':                                        # le tiroir : sa moulure, une poignée de porcelaine
        for x in range(x0 + 2, x1 - 1):
            t.put(x, 15, ton(BOIS_BLANC, 0.36))
            t.put(x, 19, ton(BOIS_BLANC, 0.80))
        for y in range(15, 20):
            t.put(x0 + 2, y, ton(BOIS_BLANC, 0.36))
            t.put(x1 - 2, y, ton(BOIS_BLANC, 0.78))
        t.put(round(cx), 17, ton(PORCELAINE, 0.95)); t.put(round(cx) + 1, 17, ton(PORCELAINE, 0.5))
    elif vue == 'dos':
        for x in range(x0 + 3, x1, 4):
            for y in range(face, 21):
                t.put(x, y, ton(BOIS_BLANC, 0.40))
    else:
        for y in range(15, 20):
            t.put(x1, y, ton(BOIS_BLANC, 0.78))
    for xp in (x0 + 1, x1 - 1):                              # les pieds tournés
        t.put(xp, 21, ton(BOIS_BLANC, 0.50 if xp == x0 + 1 else 0.30))
        t.put(xp + (1 if xp == x0 + 1 else -1), 21, ton(BOIS_BLANC, 0.36))
    c = round(cx - 0.5)                                      # la lampe : un vase de porcelaine bleue et blanche
    for y in range(8, 13):
        r = 1.8 - abs(y - 10.5) * 0.35
        for x in range(W):
            d = x + 0.5 - (c + 1)
            if abs(d) > r + 0.5:
                continue
            u = d / max(0.8, r)
            lum = 0.95 - 0.5 * (u + 1) / 2
            if y == 10:
                t.put(x, y, ton(PORCELAINE, lum - 0.55))     # (le filet bleu)
            else:
                t.put(x, y, ton(PORCELAINE, lum))
    for y in range(LAMPE_Y - 3, LAMPE_Y + 4):                # l'abat-jour rose, plissé, en cloche
        r = 2.2 + (y - (LAMPE_Y - 3)) * 0.62
        for x in range(W):
            d = x + 0.5 - (cx + 0.5)
            if abs(d) > r:
                continue
            u = d / r
            lum = 0.82 - 0.34 * u - 0.10 * u * u + (0.07 if x % 2 == 0 else -0.05)
            if y == LAMPE_Y - 3:
                lum = 0.96 - 0.3 * (u + 1) / 2
            elif y == LAMPE_Y + 3:
                lum = 0.36 - 0.12 * u + (0.1 if x % 2 else 0)   # (la frange)
            t.put(x, y, ton(ABAT, lum))
    for x in range(round(cx - 1), round(cx + 2)):
        t.put(x, LAMPE_Y - 3, ton(ABAT, 0.18))
    return t.fini()


def motif_tapis(u, v, lum):
    """Le tapis au médaillon de roses : un fond vieux rose, une bordure vert sauge et crème, le médaillon crème au
    milieu et ses roses, des bouquets aux coins."""
    VR = rampe([(110, 60, 70), (160, 96, 104), (200, 140, 140), (226, 182, 176)], 100)
    SAUGE = rampe([(56, 76, 60), (96, 120, 92), (140, 162, 128), (190, 204, 172)], 100)
    bu, bv = min(u, 1 - u), min(v, 1 - v)
    if bu < 0.04 or bv < 0.08:
        return ton(SAUGE, 0.25 + 0.55 * lum)
    if bu < 0.07 or bv < 0.14:
        return ton(CHINTZ, 0.35 + 0.55 * lum) if ((u * 50 + v * 30) % 3) < 1.5 else ton(SAUGE, 0.4 + 0.5 * lum)
    du, dv = (u - 0.5) * 2.4, (v - 0.5) * 2
    r = math.hypot(du, dv)
    if r < 0.62:
        if r < 0.22:
            return ton(ROSE, 0.3 + 0.6 * lum)
        if 0.36 < r < 0.5 and (math.atan2(dv, du) * 4) % 2 < 1:
            return ton(ROSE, 0.45 + 0.5 * lum)
        if 0.36 < r < 0.5:
            return ton(FEUILLE, 0.4 + 0.5 * lum)
        return ton(CHINTZ, 0.4 + 0.58 * lum)
    for (cu, cv) in ((0.16, 0.3), (0.84, 0.3), (0.16, 0.7), (0.84, 0.7)):
        if math.hypot((u - cu) * 5, (v - cv) * 3) < 0.4:
            return ton(ROSE, 0.4 + 0.5 * lum)
    return ton(VR, 0.25 + 0.65 * lum)


def tapis(W, H, long_sur_x=True):
    t = Toile(W, H)
    for y in range(H):
        for x in range(W):
            if (x in (0, W - 1) and long_sur_x) or (y in (0, H - 1) and not long_sur_x):
                if (y if long_sur_x else x) % 2 == 0:
                    t.put(x, y, ton(CHINTZ, 0.62))
                continue
            u, v = (x / (W - 1), y / (H - 1)) if long_sur_x else (y / (H - 1), x / (W - 1))
            lum = 0.72 - 0.20 * x / W - 0.16 * y / H + 0.05 * bruit(x, y, 82) + (0.04 if (x + y) % 2 else -0.03)
            if y == H - 1:
                lum -= 0.25
            t.put(x, y, motif_tapis(u, v, max(0.0, min(1.0, lum))))
    return t.fini()


def tableau():
    W, H = 22, 14
    t = Toile(W, H)
    CIEL = rampe([(150, 190, 230), (196, 220, 240), (240, 246, 250)], 60)
    MUR = rampe([(170, 150, 120), (214, 196, 160), (240, 228, 200)], 60)
    TOIT = rampe([(70, 60, 50), (110, 96, 76), (150, 134, 104)], 60)
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            t.put(x, y, ton(CIEL, 0.9 - 0.5 * (y - 2) / (H - 4)))
    for y in range(6, H - 4):                                # le cottage : un mur crème, un toit de chaume
        for x in range(9, 16):
            t.put(x, y, ton(MUR, 0.8 - 0.3 * (x - 9) / 7))
    for y in range(3, 6):
        for x in range(8 + (5 - y), 17 - (5 - y)):
            t.put(x, y + 1, ton(TOIT, 0.75 - 0.35 * (x - 8) / 9))
    t.put(12, 8, ton(TOIT, 0.2)); t.put(12, 9, ton(TOIT, 0.2))   # la porte
    for x in range(2, W - 2):                                # le jardin : l'herbe, les roses trémières
        for y in range(H - 4, H - 2):
            t.put(x, y, ton(FEUILLE, 0.5 - 0.15 * (y - H + 4) + 0.08 * bruit(x, y, 92)))
        if x % 2 == 0 and not 9 <= x <= 15:
            for y in range(H - 7, H - 4):
                t.put(x, y, ton(FEUILLE, 0.4))
            t.put(x, H - 7 + (x % 3), ton(ROSE, 0.6 + 0.2 * (x % 4 == 0)))
    OR = rampe([(110, 76, 24), (176, 132, 52), (226, 190, 100), (250, 230, 160)], 80)
    for x in range(W):                                       # le cadre doré
        for y in range(H):
            if x < 2 or x >= W - 2 or y < 2 or y >= H - 2:
                lum = 0.92 if y == 0 else 0.30 if y == H - 1 else 0.72 if x == 0 else 0.38 if x == W - 1 else 0.58
                t.put(x, y, ton(OR, lum + (0.08 if (x + y) % 3 == 0 else 0)))
    return t.fini()


IMAGES = {
    'cottage_lit': lit_face, 'cottage_lit_dos': lit_dos, 'cottage_lit_cote': lit_cote,
    'cottage_chevet': lambda: chevet_vue('face'), 'cottage_chevet_dos': lambda: chevet_vue('dos'),
    'cottage_chevet_cote': lambda: chevet_vue('cote'),
    'cottage_tapis': lambda: tapis(40, 22), 'cottage_tapis_dos': lambda: tapis(40, 22).transpose(Image.FLIP_LEFT_RIGHT),
    'cottage_tapis_cote': lambda: tapis(14, 44, False),
    'cottage_tableau': tableau,
}


def main():
    out = {k: f() for k, f in IMAGES.items()}
    out['cottage_lit_drap'] = garde(out['cottage_lit'], lambda x, y: y >= 12)
    out['cottage_lit_dos_drap'] = garde(out['cottage_lit_dos'], lambda x, y: y <= out['cottage_lit_dos'].height - 15)
    out['cottage_lit_cote_drap'] = garde(out['cottage_lit_cote'], lambda x, y: x >= 12)
    for k, im in out.items():
        im.save(os.path.join(ASSETS, f'meuble_{k}.png'), optimize=True)
    print(f'ensemble cottage : {len(out)} images')
    if '--apercu' in sys.argv:
        ks = [k for k in out if not k.endswith('drap')]
        ap = Image.new('RGBA', (sum(out[k].width + 6 for k in ks) + 6, 50), (150, 120, 86, 255))
        x = 6
        for k in ks:
            ap.alpha_composite(out[k], (x, 48 - out[k].height))
            x += out[k].width + 6
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_cottage.png'))


if __name__ == '__main__':
    main()
