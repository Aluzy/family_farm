# Le bac du port (le chantier « l'île à bâtir », docs/ile.md, fiche I1c) : ses dessins, posés avec ceux du port dans
# la planche des hameaux (scripts/carte/port.py les y range, dans l'ordre de data/village.json PORT.SORTES : bac_port,
# passerelle_port, caisses_bac). La scène les montre quand le bac est à quai (js/carte/ferme/bac.js).
#
#   - le bac (bac_port) : un bateau ponté, vu de haut à 45° (CLAUDE.md) : son pont de planches (chacune sa nuance,
#     ses aboutements), son plat-bord peint en blanc, sa cabine (le toit goudronné, la face aux planches blanches, une
#     fenêtre qui montre son dedans, la porte, une bouée), le tuyau du poêle, l'écoutille de la cale à l'avant (son
#     dessus, sa face), les bittes et un rouleau de cordage, la coque peinte (ses virures, la bande rouge, le bas
#     mouillé) ; l'ombre douce sur l'eau à droite et en bas. Variante 0 : le long d'un quai vers le sud (l'avant au
#     nord, on voit le tableau arrière) ; 1 : le long d'un quai vers l'est (l'avant à l'est, on voit son flanc) ;
#   - la passerelle (passerelle_port) : une planche à tasseaux et sa main courante de corde, du quai au bac (0 : en
#     travers, vers l'est ; 1 : vers le sud) ;
#   - les caisses chargées (caisses_bac) : ce qui a été vendu depuis son dernier départ, sur le quai (0 : une caisse
#     et un sac ; 1 : deux caisses, un sac ; 2 : trois caisses empilées et un sac).
# Rien n'est tiré au hasard hors de clés fixes : relancer le script redonne les mêmes images.
import math

from nuances import bruit, rampe, ton
import port as P

N = P.N
PEINT = [rampe(c, N) for c in (
    [(10, 22, 36), (20, 44, 60), (32, 72, 88), (52, 104, 114), (88, 140, 138), (142, 182, 164), (196, 222, 196)],
    [(12, 20, 38), (22, 42, 64), (34, 68, 94), (56, 100, 122), (92, 136, 146), (146, 178, 172), (200, 218, 204)],
    [(8, 24, 34), (18, 48, 56), (30, 78, 82), (50, 110, 106), (84, 146, 128), (138, 186, 156), (192, 226, 188)],
)]
TOIT = [rampe(c, N) for c in (
    [(20, 14, 20), (44, 26, 28), (78, 42, 36), (116, 62, 46), (156, 90, 62), (194, 126, 88), (226, 168, 124)],
    [(22, 14, 18), (48, 26, 24), (84, 42, 32), (122, 62, 42), (162, 92, 58), (200, 130, 84), (230, 172, 120)],
)]
VITRE = rampe([(10, 16, 30), (22, 38, 60), (44, 70, 96), (84, 120, 146), (150, 186, 200), (222, 236, 236)], N)
DEDANS = rampe([(26, 16, 14), (60, 36, 26), (104, 64, 40), (150, 98, 60), (200, 146, 92)], N)
TOILE = rampe([(48, 36, 24), (92, 72, 46), (136, 110, 74), (178, 152, 106), (214, 192, 146), (238, 224, 186)], N)
ECUME = (224, 236, 238)


def _ombre_eau(t, pixels, a=72):
    """L'ombre douce du bac sur l'eau : sur les pixels vides donnés ([(x, y, force)]), un bleu sombre translucide."""
    for x, y, f in pixels:
        if 0 <= x < t.w and 0 <= y < t.h and not t.get(x, y)[3]:
            t.put(x, y, (14, 30, 44), int(a * f))


def _bitte(t, bx, by):
    """Une bitte d'amarrage (3 × 4) : sa tête vue de dessus, son fût, la lumière à gauche."""
    for x in range(bx, bx + 3):
        u = (x - bx) / 2
        t.put(x, by, ton(P.FER, 0.86 - 0.34 * u))
        t.put(x, by + 1, ton(P.FER, 0.62 - 0.36 * u))
        t.put(x, by + 2, ton(P.FER, 0.44 - 0.30 * u))
        t.put(x, by + 3, ton(P.FER, 0.30 - 0.22 * u))


def _rouleau(t, cx, cy, rx, ry, s):
    """Un rouleau de cordage vu d'en haut : des anneaux de corde, plus clairs en haut à gauche, le creux sombre."""
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
            d = math.sqrt(u * u + v * v)
            if d > 1:
                continue
            if d < 0.3:
                t.put(x, y, ton(P.CORDE, 0.10))                  # le creux
                continue
            anneau = math.sin(d * 11 + s)
            g = 0.52 + 0.22 * anneau - 0.18 * (u + v) / 2 + 0.03 * bruit(x, y, 300 + s)
            t.put(x, y, ton(P.CORDE, g))


def _bouee(t, cx, cy, r):
    """Une bouée pendue à la cabine : un anneau rouge et blanc (quatre quartiers), son trou sombre, sa lumière à gauche."""
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            u, v = x + .5 - cx, y + .5 - cy
            d = math.hypot(u, v)
            if d > r or d < r * 0.42:
                continue
            q = (math.atan2(v, u) + math.pi) / (math.pi / 2)
            R = P.ROUGE if int(q) % 2 == 0 else P.BLANC
            g = 0.70 - 0.28 * (u + v) / (2 * r) + (0.1 if d > r * 0.8 else 0) - (0.12 if d < r * 0.55 else 0)
            t.put(x, y, ton(R, g))


def _cabine_face(t, x0, x1, y0, y1, fen, porte, bouee, s):
    """La face de la cabine (de x0 à x1, rangées y0 à y1) : des planches blanches posées à clin (chacune sa nuance,
    l'ombre du clin), plus sombre vers la droite et vers le bas ; une fenêtre (fen : x, y, l, h) qui montre le dedans (le
    plancher plus clair vers l'avant, le montant gauche éclairé, le droit dans l'ombre, la vitre et son reflet), une
    porte (porte : x, l) de chêne, une bouée (bouee : x, y)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u, v = (x - x0) / max(1, x1 - x0), (y - y0) / max(1, y1 - y0)
            k = (y - y0) // 2                                         # la planche (deux rangées)
            g = 0.80 - 0.26 * u - 0.12 * v + 0.04 * bruit(k, s, 310) + 0.02 * bruit(x, y, 311)
            if (y - y0) % 2 == 1:
                g -= 0.12                                             # l'ombre sous le clin
            if x == x0:
                g += 0.08                                             # l'arête gauche, au soleil
            if x == x1:
                g -= 0.18                                             # l'arête droite, à l'ombre
            t.put(x, y, ton(P.BLANC, g))
    t.put(x0, y0, ton(P.BLANC, 0.98))
    fx, fy, fl, fh = fen                                              # la fenêtre
    for y in range(fy - 1, fy + fh + 1):
        for x in range(fx - 1, fx + fl + 1):
            bord = x in (fx - 1, fx + fl) or y in (fy - 1, fy + fh)
            if bord:
                t.put(x, y, ton(P.CHENE[1], 0.70 - 0.3 * (x - fx) / fl - (0.2 if y == fy + fh else 0)))
                continue
            u, v = (x - fx) / max(1, fl - 1), (y - fy) / max(1, fh - 1)
            if v > 0.6:
                g = 0.30 + 0.35 * (v - 0.6) / 0.4 - 0.1 * u               # le plancher du dedans, plus clair vers l'avant
                c = ton(DEDANS, g)
            elif u < 0.2:
                c = ton(DEDANS, 0.55 - 0.2 * v)                           # le montant gauche, éclairé
            elif u > 0.8:
                c = ton(DEDANS, 0.12)                                     # le montant droit, dans l'ombre
            else:
                c = ton(VITRE, 0.30 + 0.22 * (1 - v) - 0.15 * u + 0.03 * bruit(x, y, 312))
            t.put(x, y, c)
    t.put(fx, fy, ton(VITRE, 0.95)); t.put(fx + 1, fy, ton(VITRE, 0.78))   # le reflet
    px, pl = porte                                                    # la porte
    for y in range(y0 + 1, y1 + 1):
        for x in range(px, px + pl):
            u = (x - px) / max(1, pl - 1)
            g = 0.50 - 0.28 * u - 0.10 * (y - y0) / (y1 - y0) + 0.03 * bruit(x, y, 313)
            if x == px:
                g += 0.12
            if (x - px) == pl // 2 and y in (y0 + 3, y0 + 6):
                g -= 0.2                                              # les traverses
            t.put(x, y, ton(P.CHENE[s % 3], g))
    t.put(px + pl - 2, y0 + (y1 - y0) // 2 + 1, ton(P.LAITON, 0.95))       # la poignée
    _bouee(t, bouee[0], bouee[1], 2.6)


def _toit(t, x0, x1, y0, y1, s):
    """Le toit goudronné de la cabine, vu de dessus : ses lés (chacun sa nuance), le bord éclairé à gauche et en haut,
    l'égout devant (une arête claire, l'ombre dessous)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u, v = (x - x0) / max(1, x1 - x0), (y - y0) / max(1, y1 - y0)
            le = (x - x0) // 4
            R = TOIT[le % 2]
            g = 0.56 - 0.22 * u - 0.06 * v + 0.05 * bruit(le, s, 320) + 0.025 * bruit(x, y, 321)
            if (x - x0) % 4 == 3:
                g -= 0.12                                             # le recouvrement des lés
            if y == y0 or x == x0:
                g += 0.16
            if y == y1:
                g = 0.74 - 0.3 * u                                    # l'égout, au soleil
            t.put(x, y, ton(R, g))


def _tuyau(t, x, y_haut, y_bas):
    """Le tuyau du poêle : rond (le flanc gauche au soleil), son chapeau vu d'en haut."""
    for y in range(y_haut + 1, y_bas + 1):
        f = (y - y_haut) / max(1, y_bas - y_haut)
        t.put(x, y, ton(P.FER, 0.62 - 0.12 * f))
        t.put(x + 1, y, ton(P.FER, 0.36 - 0.10 * f))
        t.put(x + 2, y, ton(P.FER, 0.18))
    for xx, g in ((x - 1, 0.5), (x, 0.82), (x + 1, 0.6), (x + 2, 0.34), (x + 3, 0.2)):
        t.put(xx, y_haut, ton(P.FER, g))
    t.put(x, y_haut - 1, ton(P.FER, 0.7)); t.put(x + 1, y_haut - 1, ton(P.FER, 0.5)); t.put(x + 2, y_haut - 1, ton(P.FER, 0.3))


def _ecoutille(t, x0, x1, y0, y1, haut, s):
    """L'écoutille de la cale : un panneau de planches surélevé de `haut` rangées (son dessus, sa face), ses ferrures."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            u, v = (x - x0) / max(1, x1 - x0), (y - y0) / max(1, y1 - y0)
            p = (x - x0) // 3
            g = 0.74 - 0.2 * u - 0.06 * v + 0.05 * bruit(p, s, 330) + 0.02 * bruit(x, y, 331)
            if (x - x0) % 3 == 2:
                g -= 0.16
            if y == y0 or x == x0:
                g += 0.1
            t.put(x, y, ton(P.CHENE[(p + s) % 3], g))
        if y in (y0 + 1, y1 - 1):
            for x in range(x0 + 1, x1):
                t.put(x, y, ton(P.FER, 0.56 - 0.3 * (x - x0) / (x1 - x0)))     # les ferrures
    for k in range(1, haut + 1):
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            t.put(x, y1 + k, ton(P.CHENE[1], 0.42 - 0.2 * u - 0.06 * k))


def bac_sud():
    """Le bac le long d'un quai vers le sud : l'avant au nord, le tableau arrière vers nous. 38 × 60, le pied au
    milieu du bas de la coque (la ligne de flottaison du tableau)."""
    w, h = 38, 60
    t = P.Toile(w, h)
    cx, X0 = 19.0, 3
    yd0, yd1 = 9, 48                                               # le pont : 64 px de long vus sur 40 rangées
    face = 7                                                       # le tableau : 8 px de franc-bord, sur 7 rangées

    def demi(y):
        f = (y - yd0) / (yd1 - yd0)
        hw = 16 * (0.22 + 0.78 * math.sqrt(min(1.0, f / 0.34)))
        if f > 0.93:
            hw *= 1 - 0.14 * ((f - 0.93) / 0.07) ** 2
        return hw

    # le pont, le plat-bord
    for y in range(yd0, yd1 + 1):
        hw = demi(y)
        for x in range(w):
            u = x + .5 - cx
            if abs(u) > hw:
                continue
            d = hw - abs(u)
            f = (y - yd0) / (yd1 - yd0)
            if d < 2.2:                                            # le plat-bord peint en blanc
                gauche = u < 0
                g = (0.92 if gauche else 0.58) - 0.12 * f + (0.06 if d < 1.1 else -0.08) + 0.02 * bruit(x, y, 340)
                t.put(x, y, ton(P.BLANC, g))
                continue
            p = int((x - (cx - 14)) // 3)                          # la planche du pont (le long du bac)
            R = P.BOIS_MER[(p + 1) % len(P.BOIS_MER)]
            g = 0.66 + 0.06 * bruit(p, 0, 341) - 0.16 * (u + 14) / 28 - 0.10 * f + 0.025 * bruit(x, y, 342)
            if (x - int(cx - 14)) % 3 == 2:
                g -= 0.18                                          # le joint (calfat)
            if (y - yd0 + p * 5) % 13 == 0:
                g -= 0.14                                          # l'aboutement
            if d < 3.4:
                g -= 0.12                                          # l'ombre au pied du plat-bord
            t.put(x, y, ton(R, g))
    # l'écoutille de la cale, à l'avant ; une bitte devant elle
    _ecoutille(t, int(cx - 6), int(cx + 5), 14, 20, 3, 1)
    _bitte(t, int(cx - 1), yd0 + 2)
    # la cabine : sa base sur le pont (rangées 30 à 42), son toit 10 rangées plus haut, sa face devant
    bx0, bx1, base0, base1 = int(cx - 9), int(cx + 8), 30, 42
    for y in range(base1 + 1, base1 + 3):                          # son ombre sur le pont, en bas et à droite
        for x in range(bx0 + 1, bx1 + 3):
            c = t.get(x, y)
            if c[3]:
                t.put(x, y, tuple(max(0, int(v * 0.62)) for v in c[:3]))
    for y in range(base0 - 8, base1 + 2):
        for x in (bx1 + 1, bx1 + 2):
            c = t.get(x, y)
            if c[3]:
                t.put(x, y, tuple(max(0, int(v * 0.66)) for v in c[:3]))
    _toit(t, bx0 - 1, bx1 + 1, base0 - 10, base1 - 10, 2)
    _cabine_face(t, bx0, bx1, base1 - 9, base1, (bx0 + 2, base1 - 7, 4, 4), (int(cx - 1), 4), (bx1 - 2.5, base1 - 5.5), 0)
    _tuyau(t, bx1 - 4, base0 - 17, base0 - 11)
    # à l'arrière : deux bittes, le rouleau de cordage
    _bitte(t, int(cx - 12), yd1 - 4)
    _bitte(t, int(cx + 10), yd1 - 4)
    _rouleau(t, cx - 0.5, yd1 - 2.5, 3.6, 2.2, 1)
    # le tableau arrière : la coque peinte (ses virures), la bande rouge, le bas mouillé ; les coins arrondis
    hw1 = demi(yd1)
    for k in range(face):
        y = yd1 + 1 + k
        hwk = hw1 - 0.35 * k - (0.9 if k >= face - 2 else 0)
        for x in range(w):
            u = x + .5 - cx
            if abs(u) > hwk:
                continue
            a = (u + hwk) / (2 * hwk)                              # de la gauche (0, éclairée) à la droite
            if k == 0:
                c = ton(P.BLANC, 0.70 - 0.3 * a)                    # le liston
            elif k >= face - 2:
                c = ton(P.MOUILLE, 0.55 - 0.3 * a + 0.05 * bruit(x, y, 343) - 0.1 * (k - face + 2))
            elif k == face - 3:
                c = ton(P.ROUGE, 0.56 - 0.3 * a + 0.03 * bruit(x, y, 344))
            else:
                R = PEINT[k % len(PEINT)]
                g = 0.58 - 0.34 * a - 0.04 * k + 0.03 * bruit(x, y, 345)
                if k % 2 == 0:
                    g -= 0.08                                      # le joint de la virure
                c = ton(R, g)
            t.put(x, y, c)
    for y in range(yd1 + 2, yd1 + face):                           # l'étambot du gouvernail
        t.put(int(cx), y, ton(P.CHENE[0], 0.24))
    im = t.fini()
    # l'ombre douce sur l'eau (à droite et en bas, la lumière vient d'en haut à gauche), l'écume au pied
    t2 = P.Toile(w, h)
    t2.im = im
    t2.px = im.load()
    ombre = []
    for y in range(yd0 + 6, yd1 + face + 3):
        hw = demi(min(y, yd1))
        for k in range(1, 4):
            ombre.append((int(cx + hw) + k, y, 1 - (k - 1) / 3))
    for x in range(int(cx - hw1), int(cx + hw1) + 3):
        for k in range(1, 3):
            ombre.append((x, yd1 + face + k, 1 - (k - 1) / 2))
    _ombre_eau(t2, ombre)
    for x in range(int(cx - hw1) + 1, int(cx + hw1)):
        if bruit(x, 1, 346) > 0.1:
            t2.put(x, yd1 + face + 1, ECUME, 150)
    return t2.im, (19, yd1 + face + 1)


def bac_est():
    """Le bac le long d'un quai vers l'est : l'avant à l'est, son flanc vers nous. 72 × 44, le pied au milieu du bas
    de la coque."""
    w, h = 72, 44
    t = P.Toile(w, h)
    X0, X1 = 3, 66                                                 # la coque : 64 px de long
    cy = 22.5                                                      # le milieu du pont (32 px de large vus sur 20)
    face = 7

    def demi(x):
        f = (x + .5 - X0) / (X1 - X0)
        hd = 10.0
        if f > 0.64:
            hd *= 0.22 + 0.78 * math.sqrt(max(0.0, (1 - f) / 0.36))
        if f < 0.05:
            hd *= 1 - 0.12 * ((0.05 - f) / 0.05) ** 2
        return hd

    for x in range(X0, X1 + 1):
        hd = demi(x)
        f = (x - X0) / (X1 - X0)
        for y in range(h):
            v = y + .5 - cy
            if abs(v) > hd:
                continue
            d = hd - abs(v)
            if d < 1.6:
                haut = v < 0
                g = (0.92 if haut else 0.66) - 0.14 * f + (0.05 if d < 0.8 else -0.08) + 0.02 * bruit(x, y, 350)
                t.put(x, y, ton(P.BLANC, g))
                continue
            p = int((y - (cy - 9)) // 2)                           # la planche (le long du bac : une par deux rangées)
            R = P.BOIS_MER[(p + 2) % len(P.BOIS_MER)]
            g = 0.66 + 0.06 * bruit(p, 1, 351) - 0.10 * (v + 9) / 18 - 0.16 * f + 0.025 * bruit(x, y, 352)
            if (y - int(cy - 9)) % 2 == 1 and (x + p * 3) % 4 == 0:
                g -= 0.04
            if (y - int(cy - 9)) % 2 == 1:
                g -= 0.1                                           # le joint
            if (x - X0 + p * 9) % 17 == 0:
                g -= 0.14                                          # l'aboutement
            if d < 2.6:
                g -= 0.1
            t.put(x, y, ton(R, g))
    # l'écoutille à l'avant, ses bittes
    _ecoutille(t, 44, 54, int(cy - 7), int(cy), 3, 2)
    _bitte(t, 60, int(cy - 2))
    _bitte(t, 6, int(cy - 7))
    _bitte(t, 6, int(cy + 3))
    _rouleau(t, 11.5, cy + 1, 2.8, 2.2, 2)
    # la cabine : sa base (x 15 à 38, rangées 16 à 28), le toit 10 rangées plus haut, sa face devant
    bx0, bx1, base0, base1 = 15, 38, int(cy - 6), int(cy + 6)
    for y in range(base1 + 1, base1 + 3):
        for x in range(bx0 + 1, bx1 + 3):
            c = t.get(x, y)
            if c[3]:
                t.put(x, y, tuple(max(0, int(v * 0.62)) for v in c[:3]))
    for y in range(base0 - 8, base1 + 2):
        for x in (bx1 + 1, bx1 + 2):
            c = t.get(x, y)
            if c[3]:
                t.put(x, y, tuple(max(0, int(v * 0.66)) for v in c[:3]))
    _toit(t, bx0 - 1, bx1 + 1, base0 - 10, base1 - 10, 3)
    _cabine_face(t, bx0, bx1, base1 - 9, base1, (bx0 + 3, base1 - 7, 5, 4), (bx0 + 12, 4), (bx1 - 3.5, base1 - 5.5), 1)
    _tuyau(t, bx0 + 4, base0 - 17, base0 - 11)
    # le flanc : sous le bord bas du pont, de la poupe à la proue (il suit la courbe), ses virures, la bande rouge,
    # le bas mouillé, des hublots de laiton
    bas = {}
    for x in range(X0, X1 + 1):
        hd = demi(x)
        yb = int(math.floor(cy + hd - 0.5))
        bas[x] = yb
        f = (x - X0) / (X1 - X0)
        haut_face = face if f < 0.9 else max(2, int(face * (1 - (f - 0.9) / 0.1 * 0.6)))
        for k in range(1, haut_face + 1):
            y = yb + k
            g0 = 0.60 - 0.2 * f
            if k == 1:
                c = ton(P.BLANC, 0.68 - 0.2 * f)
            elif k >= haut_face - 1:
                c = ton(P.MOUILLE, 0.5 - 0.2 * f + 0.05 * bruit(x, y, 353) - 0.08 * (k - haut_face + 1))
            elif k == haut_face - 2:
                c = ton(P.ROUGE, 0.56 - 0.2 * f + 0.03 * bruit(x, y, 354))
            else:
                R = PEINT[k % len(PEINT)]
                g = g0 - 0.06 * k + 0.03 * bruit(x, y, 355)
                if k % 2 == 1:
                    g -= 0.08
                c = ton(R, g)
            t.put(x, y, c)
    for hx in (22, 32, 42):                                        # les hublots
        y = bas[hx] + 3
        for (dx, dy, g) in ((0, 0, 0.9), (1, 0, 0.7), (0, 1, 0.6), (1, 1, 0.35)):
            t.put(hx + dx, y + dy, ton(P.LAITON, g))
        t.put(hx + 1, y + 1, ton(VITRE, 0.4))
    im = t.fini()
    t2 = P.Toile(w, h)
    t2.im = im
    t2.px = im.load()
    ombre = []
    for x in range(X0 + 2, X1 + 3):
        yb = bas.get(min(x, X1), bas[X1])
        for k in range(1, 3):
            ombre.append((x, yb + face + k, 1 - (k - 1) / 2))
    for y in range(int(cy - 4), int(cy + 12)):
        for k in range(1, 3):
            ombre.append((X1 + k, y, 0.6))
    _ombre_eau(t2, ombre)
    for x in range(X0 + 1, X1 - 2):
        if bruit(x, 2, 356) > 0.15:
            t2.put(x, bas[x] + face + 1, ECUME, 150)
    return t2.im, ((X0 + X1) // 2, bas[(X0 + X1) // 2] + face + 1)


def bac(v):
    return bac_sud() if v == 0 else bac_est()


def passerelle(v):
    """La passerelle du quai au bac : une planche à tasseaux (son dessus, sa face au bout), sa main courante de corde
    sur deux piquets. v 0 : en travers, vers l'est (18 × 12) ; 1 : vers le sud (12 × 20). Le pied au milieu du bas."""
    if v == 0:
        w, h = 18, 12
        t = P.Toile(w, h)
        for y in range(4, 9):
            for x in range(2, 16):
                u, vv = (x - 2) / 13, (y - 4) / 4
                g = 0.74 - 0.14 * u - 0.12 * vv + 0.03 * bruit(x, y, 360)
                if (x - 2) % 3 == 0:
                    g += 0.12                                      # un tasseau, au soleil
                if (x - 2) % 3 == 1:
                    g -= 0.08
                t.put(x, y, ton(P.BOIS_MER[(x // 3) % 4], g))
        for x in range(2, 16):                                     # sa face (le chant de la planche)
            t.put(x, 9, ton(P.BOIS_MER[1], 0.34 - 0.12 * (x - 2) / 13))
        for px in (3, 14):                                         # les piquets, la corde
            for y in range(1, 5):
                t.put(px, y, ton(P.CHENE[0], 0.66 - 0.08 * y))
        for x in range(3, 15):
            sag = 1 + round(1.2 * math.sin(math.pi * (x - 3) / 11))
            t.put(x, sag, ton(P.CORDE, 0.62 + 0.15 * ((x % 2))))
        im = P.ombre_portee(t.fini(), 9, 10.4, 7, 1.4, 60)
        return im, (9, 11)
    w, h = 12, 20
    t = P.Toile(w, h)
    for y in range(3, 16):
        for x in range(2, 9):
            u, vv = (x - 2) / 6, (y - 3) / 12
            g = 0.76 - 0.2 * u - 0.10 * vv + 0.03 * bruit(x, y, 361)
            if (y - 3) % 2 == 0:
                g += 0.1                                           # les tasseaux, en travers
            if x == 2:
                g += 0.08
            if x == 8:
                g -= 0.16
            t.put(x, y, ton(P.BOIS_MER[(y // 2) % 4], g))
    for x in range(2, 9):
        t.put(x, 16, ton(P.BOIS_MER[1], 0.34 - 0.14 * (x - 2) / 6))
        t.put(x, 17, ton(P.BOIS_MER[1], 0.22 - 0.1 * (x - 2) / 6))
    for y in range(0, 4):
        t.put(1, y, ton(P.CHENE[0], 0.7 - 0.08 * y))
    for y in range(1, 15):
        t.put(1, y + 1, ton(P.CORDE, 0.58 + 0.15 * (y % 2)))      # la main courante, à gauche
    im = P.ombre_portee(t.fini(), 6, 18.2, 5, 1.3, 60)
    return im, (6, 19)


def sac(t, cx, y0, l, hh, s):
    """Un sac de toile ficelé, vu de haut à 45° : son col noué (le dessus), sa panse bombée, la lumière à gauche."""
    for y in range(y0, y0 + hh):
        f = (y - y0) / max(1, hh - 1)
        r = l / 2 * (0.45 + 0.55 * math.sin(math.pi * min(1.0, 0.25 + f * 0.85)))
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            u = (x + .5 - cx) / max(0.5, r)
            if abs(u) > 1:
                continue
            g = 0.70 - 0.36 * (u + 1) / 2 - 0.12 * f + 0.05 * bruit(x, y, 370 + s)
            if (x + y) % 3 == 0:
                g -= 0.04                                          # la trame
            t.put(x, y, ton(TOILE, g))
    for x in range(int(cx - 1), int(cx + 2)):
        t.put(x, y0 + 1, ton(P.CORDE, 0.36))                       # la ficelle du col
    t.put(int(cx), y0 - 1, ton(TOILE, 0.8))
    t.put(int(cx) - 1, y0, ton(TOILE, 0.7))
    t.put(int(cx) + 1, y0, ton(TOILE, 0.5))


def sangle(t, x0, y0, l, dessus, face):
    """Une corde qui ceinture une caisse : sur son dessus (en travers) et sur sa face (debout)."""
    xm = x0 + l // 2
    for y in range(y0, y0 + dessus + face):
        t.put(xm, y, ton(P.CORDE, 0.70 if y < y0 + dessus else 0.46))
        t.put(xm + 1, y, ton(P.CORDE, 0.44 if y < y0 + dessus else 0.30))


def caisses_bac(v):
    """Les caisses chargées, qui partent avec le bac : v 0, une caisse cordée et un sac ; v 1, deux caisses et un sac ;
    v 2, trois caisses empilées et un sac. Le pied au milieu du bas."""
    if v == 0:
        t = P.Toile(22, 22)
        P.caisse(t, 2, 8, 12, 9, 4, 2)
        sangle(t, 2, 8, 12, 4, 9)
        sac(t, 17, 10, 7, 11, 0)
        im = P.ombre_portee(t.fini(), 11, 20.4, 10, 1.6, 70)
        return im, (11, 21)
    if v == 1:
        t = P.Toile(28, 24)
        P.caisse(t, 1, 10, 11, 9, 4, 0)
        P.caisse(t, 12, 9, 11, 10, 4, 1)
        sangle(t, 12, 9, 11, 4, 10)
        sac(t, 24, 13, 6, 10, 1)
        im = P.ombre_portee(t.fini(), 14, 22.4, 13, 1.6, 70)
        return im, (14, 23)
    t = P.Toile(28, 32)
    P.caisse(t, 1, 18, 11, 9, 4, 2)
    P.caisse(t, 12, 17, 11, 10, 4, 0)
    P.caisse(t, 6, 6, 12, 9, 4, 1)
    sangle(t, 6, 6, 12, 4, 9)
    for x in range(6, 18):
        t.put(x, 19, ton(P.CHENE[0], 0.2))                         # l'ombre de celle du dessus
    sac(t, 24, 21, 6, 10, 2)
    im = P.ombre_portee(t.fini(), 14, 30.4, 13, 1.6, 70)
    return im, (14, 31)
