#!/usr/bin/env python3
"""Le tonnelet d'affinage et de fermentation (le lot 6 des évolutions du crafting, docs/tonnelet.md), style P1 :
un tonnelet trapu de chêne miel, deux cercles de fer, vu de haut à 45° comme les autres blocs.

Il est rendu en volume plutôt que dessiné pixel à pixel : un fût (une surface de révolution, renflée au milieu)
éclairé en haut à gauche, des rampes de douze tons (les ombres froides et saturées, les lumières chaudes), le fil
du bois, les joints des douelles, le reflet du fer ; le dessus : le bout des douelles en anneau, le fond enfoncé
et ses planches, l'ombre du bord du fond ; un contour sombre teinté du ton voisin, plus doux en haut à gauche.

  tonnelet()        l'image du bloc, 16 × 24 (scripts/carte/blocs.py la range dans assets/blocs.png)
  tonnelet(k=2)     deux fois plus grande, pour l'icône (scripts/icones/tonnelet.py)

En action, la carte le fait s'écraser et se relever (js/carte/ferme/tonnelets.js, le ressort des bêtes) ; prêt,
une bulle montre son produit (comme la ruche) : une seule image.
"""
import math

from PIL import Image

L = (-0.55, -0.62, 0.56)        # la lumière : en haut à gauche, un peu vers nous
_n = math.sqrt(sum(c * c for c in L))
L = tuple(c / _n for c in L)

BOIS = [(46, 22, 20), (82, 38, 28), (124, 64, 38), (164, 98, 54), (198, 136, 76), (226, 176, 110), (246, 214, 156)]
FER = [(22, 24, 36), (48, 52, 66), (84, 90, 104), (128, 134, 146), (182, 188, 196), (236, 240, 244)]
CERCLES = [(0.13, 2), (0.87, 2)]          # (hauteur sur le fût, de 0 en haut à 1 en bas ; épaisseur en px)
DOUELLES = [0.03, -0.02, 0.04, -0.03, 0.0, 0.03, -0.04, 0.02, -0.01, 0.02, 0]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rampe(cles, n):
    """Une rampe de n tons, interpolée entre des couleurs clés."""
    out = []
    for k in range(n):
        f = k / (n - 1) * (len(cles) - 1)
        i = min(int(f), len(cles) - 2)
        out.append(lerp(cles[i], cles[i + 1], f - i))
    return out


def ton(r, v):
    return r[max(0, min(len(r) - 1, round(v * (len(r) - 1))))]


def tonnelet(k=1):
    W, H = 16 * k, 24 * k
    bois, metal = rampe(BOIS, 12), rampe(FER, 10)
    cx, yt, yb, R0, ventre, RY = 8.0 * k, 8.4 * k, 20.2 * k, 6.0 * k, 0.9 * k, 3.0 * k
    R = lambda u: R0 + ventre * math.sin(math.pi * u)
    px = {}
    # le fût : la moitié de devant d'une surface de révolution, échantillonnée finement
    nu, nt = 400 * k, 180 * k
    for iu in range(nu + 1):
        u = iu / nu
        r = R(u)
        dr = ventre * math.pi * math.cos(math.pi * u)       # le renflement : la normale penche
        for it in range(-nt, nt + 1):
            th = it / nt * math.pi / 2
            X = cx + r * math.sin(th)
            Y = yt + u * (yb - yt) + RY * r / R0 * math.cos(th)
            x, y = int(X), int(Y)
            if not (0 <= x < W and 0 <= y < H):
                continue
            nx, ny, nz = math.sin(th), -dr / (yb - yt) * 0.9, math.cos(th)
            nn = math.sqrt(nx * nx + ny * ny + nz * nz)
            nx, ny, nz = nx / nn, ny / nn, nz / nn
            lam = max(0, nx * L[0] + ny * L[1] + nz * L[2])
            spec = max(0, (2 * lam * nz - L[2])) ** 12
            st = int((th / math.pi + 0.5) * 9)
            if (y, x) in px and px[(y, x)][0] > Y:
                continue
            px[(y, x)] = (Y, dict(u=u, th=th, lam=lam, spec=spec, st=st))
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    P = im.load()
    for (y, x), (_, d) in px.items():
        u, lam = d['u'], d['lam']
        v = 0.12 + 0.82 * lam + DOUELLES[d['st']] - 0.16 * max(0, u - 0.8) / 0.2     # l'ombre du pied
        c = ton(bois, v + math.sin(u * 23 + d['st'] * 1.7) * 0.035)                    # le fil du bois
        for (uc, ep) in CERCLES:
            du = (u - uc) * (yb - yt) / k
            if -ep / 2 - 0.05 <= du <= ep / 2:
                f = (du + ep / 2) / ep                       # 0 : le bord du haut, 1 : celui du bas
                c = ton(metal, 0.12 + 0.55 * lam + 0.18 * (1 - f) - 0.12 * f + 0.45 * d['spec'])
            elif ep / 2 < du <= ep / 2 + 0.9:
                c = ton(bois, v - 0.28)                      # l'ombre sous le cercle
        P[x, y] = c + (255,)
    # les joints des douelles : des colonnes fixes (projetées au ventre), sombres ; le bord éclairé à leur gauche
    rv = R0 + ventre
    for j in range(1, 6):
        th = -math.pi / 2 + j * math.pi / 6
        x = int(cx + rv * math.sin(th))
        for y in range(H):
            if (y, x) not in px or not P[x, y][3]:
                continue
            d = px[(y, x)][1]
            if any(abs((d['u'] - uc) * (yb - yt) / k) <= ep / 2 + 0.9 for uc, ep in CERCLES):
                continue
            for dx in range(k):
                if 0 <= x + dx < W and P[x + dx, y][3]:
                    r, g, b, _ = P[x + dx, y]
                    P[x + dx, y] = (int(r * .72), int(g * .66), int(b * .66), 255)
            if x - 1 >= 0 and math.sin(th) < 0.3 and P[x - 1, y][3]:
                r, g, b, _ = P[x - 1, y]
                P[x - 1, y] = (min(255, int(r * 1.08)), min(255, int(g * 1.08)), min(255, int(b * 1.06)), 255)
    # le dessus : le bout des douelles en anneau, puis le fond enfoncé, ses planches
    for y in range(H):
        for x in range(W):
            dx, dy = (x + 0.5 - cx) / R0, (y + 0.5 - yt) / RY
            dd = dx * dx + dy * dy
            if dd > 1:
                continue
            if dd > 0.62:
                vv = 0.6 + 0.26 * (-dx * 0.5 + dy * 0.6)
                c = ton(bois, vv)
                ang = math.atan2(dy, dx)
                if abs(((ang / math.pi + 1) * 9) % 1 - 0.5) > 0.42:
                    c = ton(bois, vv - 0.2)
            else:
                yy = (y + 0.5 - yt) / RY
                planche = int((yy + 1) * 1.8)
                vv = 0.55 + (-dx) * 0.12 + [0.02, -0.04, 0.05, -0.02, 0.03][planche % 5]
                if dy < -0.35 and dd > 0.25:
                    vv -= 0.28 * (1 - (dy + 1) / 0.65)          # l'ombre du bord du fond, au fond
                c = ton(bois, vv + math.sin(x / k * 2.1 + planche) * 0.03)
                if abs(((yy + 1) * 1.8) % 1) < 0.18 / k:
                    c = ton(bois, vv - 0.25)                     # les joints des planches
            P[x, y] = c + (255,)
    # le contour sélectif : sombre, teinté du ton voisin ; plus doux en haut à gauche
    contour = []
    for y in range(H):
        for x in range(W):
            if P[x, y][3]:
                continue
            vois = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < W and 0 <= y + b < H and P[x + a, y + b][3]]
            if vois:
                r, g, b, _ = P[vois[0]]
                q = 0.42 if (x < cx and y < yt + 2 * k) else 0.26
                contour.append((x, y, (int(r * q + 14), int(g * q + 6), int(b * q + 8), 255)))
    for x, y, c in contour:
        P[x, y] = c
    return im


if __name__ == '__main__':
    tonnelet().resize((96, 144), Image.NEAREST).save('apercu_tonnelet.png')
