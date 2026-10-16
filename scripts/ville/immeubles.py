# Les bâtiments de la ville en 3/4 : une même règle pour tous, à la taille des personnages
# (la fermière : 16 × 32 px).
#
#   - un bâtiment a une emprise au sol (colonnes x0..x1, rangées base - prof .. base) ; sa
#     façade, tournée vers le bas de l'écran, monte de la ligne de base (le trottoir) ; son toit
#     est l'emprise vue de 3/4 : on le voit au-dessus de la façade, aussi profond que le
#     bâtiment. Tout ce qui est dessiné au-dessus de l'emprise cache le sol de derrière : on y
#     passe (js/ville-carte.js le dessine alors devant la promeneuse, en transparence) ;
#   - un étage fait ETAGE = 48 px (3 tuiles) ; la façade : le soubassement, les étages, la
#     corniche (FRISE = 16 px), des pilastres de pierre aux angles, un bandeau entre les étages ;
#   - les portes (40 px de haut) touchent le trottoir (ou le haut des marches) ; les fenêtres
#     sont au milieu de leur étage, l'appui à 11 px du plancher, le haut au niveau des portes.
#
# Les toits : à deux pans (faîtage parallèle à la façade, le pan de devant grand, celui de
# derrière vu en raccourci), à croupe (les deux bouts en triangle), plat (un rebord), à pignon
# (le faîtage part vers l'arrière, le mur pignon en triangle sur la façade), en planches.
import math

import batiments as B
import objets as O
from commun import K, T, dessin, image, mel, rgba, teinte

ETAGE = 48
FRISE = 16
DEVANT = 0.75          # la part du pan de devant dans la profondeur d'un toit à deux pans

PIERRE = ((208, 190, 152), (172, 154, 122), (226, 212, 180))
SOCLE = ((150, 140, 128), (118, 110, 102), (184, 176, 164))


def hauteur_facade(etages):
    return etages * ETAGE + FRISE


# ---------- les façades ----------

def facade(t, X0, X1, base, etages, matiere, pilastres=True, bandeaux=True, gauche=True, droite=True):
    """La façade (px) : brique `matiere` (ou 'pierre'), le soubassement, la corniche, les
    bandeaux entre les étages, les pilastres d'angle à refends."""
    Hw = hauteur_facade(etages)
    Y0 = base - Hw

    def fond(x, y):
        if matiere == 'pierre':
            return B.taille(x, y)
        if matiere == 'bois':
            return B.planche(x, y, True)
        return B.brique(x, y, matiere)

    def f(x, y):
        r = base - y          # la hauteur au-dessus du sol
        c = fond(x, y)
        # sous la corniche, l'ombre du toit
        if y < Y0 + FRISE + 3 and y >= Y0 + FRISE:
            c = teinte(c, 0.72 + 0.08 * (y - Y0 - FRISE))
        # les bandeaux entre les étages (au plancher de chaque étage)
        if bandeaux and r > 8:
            for k in range(1, etages):
                d = r - k * ETAGE
                if 0 <= d < 4:
                    c = K if d == 0 else (PIERRE[2] if d == 3 else PIERRE[0])
        # le soubassement
        if r <= 6:
            c = K if r == 1 else (SOCLE[2] if r == 6 else SOCLE[0] if (x // 16 + (r < 4)) % 2 or x % 16 else SOCLE[1])
        # la corniche
        if y < Y0 + FRISE:
            q = y - Y0
            c = (K if q in (0, FRISE - 1) else PIERRE[2] if q in (1, 2) else teinte(PIERRE[0], 0.9) if q == 3
                 else (PIERRE[1] if (x % 6 in (0, 1) and 8 <= q <= 11) else PIERRE[0]) if q < 12
                 else teinte(PIERRE[1], 0.85))
        # les pilastres d'angle : 10 px de pierre, à refends (un bloc long, un court)
        for bord, sens in ((X0, 1), (X1 - 1, -1)):
            if not pilastres or (sens == 1 and not gauche) or (sens == -1 and not droite):
                continue
            u = (x - bord) * sens
            if 0 <= u < 10 and y >= Y0 + FRISE - 2 and r > 1:
                bloc = ((base - y) // 8) % 2
                larg = 10 if bloc else 7
                if u < larg:
                    c = PIERRE[2] if u == 1 else PIERRE[1] if u == larg - 1 or (base - y) % 8 == 0 else PIERRE[0]
        if (gauche and x == X0) or (droite and x == X1 - 1):
            c = K
        return c
    t.remplit(X0, Y0, X1, base, f)


def fenetre(t, x, plancher):
    """Une fenêtre (16 px) posée au plancher `plancher` (px) : l'appui à 11 px au-dessus."""
    t.colle(O.fenetre(), x, plancher - 40)


def image_porte():
    """16 × 40 px : une porte de bois à panneaux de 36 px de haut (un peu plus que les
    personnages), sa poignée, son seuil de pierre au ras du sol."""
    im = image(16, 40)
    d = dessin(im)
    d.rectangle((1, 1, 14, 37), fill=rgba(K))
    d.rectangle((0, 0, 15, 1), fill=rgba(PIERRE[2]))
    d.rectangle((2, 2, 13, 37), fill=rgba(O.BOIS))
    for y0, y1 in ((5, 17), (21, 34)):
        d.rectangle((4, y0, 11, y1), fill=rgba(O.BOIS_K))
        d.rectangle((5, y0 + 1, 11, y1), fill=rgba(O.BOIS_C))
        d.rectangle((5, y0 + 1, 10, y1 - 1), fill=rgba(O.BOIS))
    d.rectangle((11, 19, 12, 20), fill=rgba((236, 200, 96)))
    d.rectangle((0, 38, 15, 39), fill=rgba(SOCLE[0]))
    d.rectangle((0, 38, 15, 38), fill=rgba(SOCLE[2]))
    return im


def porte(t, x, sol):
    t.colle(image_porte(), x, sol - 40)


# ---------- les toits ----------

def toit_pans(t, X0, X1, egout, prof, debord=4):
    """Deux pans, faîtage parallèle à la façade. egout : le haut de la façade (px) ; prof :
    la profondeur du bâtiment (px). Le toit déborde de `debord` px sur les côtés."""
    devant = round(prof * DEVANT)
    faite = egout - devant
    haut = egout - prof
    x0, x1 = X0 - debord, X1 + debord

    def f(x, y):
        if y >= faite:
            c = B.tuile(x, y, 'bas')
        else:
            c = teinte(B.tuile(x, y, 'haut'), 1.12)
        if x in (x0, x1 - 1) or y == haut:
            return K
        if x in (x0 + 1, x1 - 2):
            return teinte(c, 0.8)
        return c
    t.remplit(x0, haut, x1, egout + 2, f)
    B.faitage(t, x0 + 1, faite, x1 - 1, faite)
    for x in range(x0, x1):
        t.put(x, egout + 1, K)
        t.put(x, egout, B.TUILE_S)


def toit_croupe(t, X0, X1, egout, prof, debord=4, gauche=True, droite=True):
    """Toit à croupe : le pan de devant en trapèze, les croupes en triangle aux deux bouts
    (gauche / droite : False si le bâtiment sort de la carte de ce côté)."""
    devant = round(prof * DEVANT)
    faite = egout - devant
    haut = egout - prof
    x0, x1 = X0 - debord, X1 + debord
    rentre = prof // 2           # le faîtage commence à prof / 2 du bout

    def zone(x, y):
        # 'bas', 'haut', 'gauche', 'droite' : le pan sous ce pixel
        if gauche and x < x0 + rentre:
            # la croupe gauche : un triangle (x0, egout) - (x0, haut) - (x0 + rentre, faite)
            if y >= faite and (x - x0) < rentre * (egout - y) / devant:
                return 'gauche'
            if y < faite and (x - x0) < rentre * (y - haut) / (faite - haut):
                return 'gauche'
        if droite and x >= x1 - rentre:
            if y >= faite and (x1 - 1 - x) < rentre * (egout - y) / devant:
                return 'droite'
            if y < faite and (x1 - 1 - x) < rentre * (y - haut) / (faite - haut):
                return 'droite'
        return 'bas' if y >= faite else 'haut'

    def f(x, y):
        z = zone(x, y)
        c = B.tuile(x, y, z)
        if z == 'haut':
            c = teinte(c, 1.12)
        elif z == 'gauche':
            c = teinte(c, 1.18)
        # les arêtiers : là où le pan change
        if any(zone(x + dx, y + dy) != z for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            return B.TUILE_C if z in ('gauche', 'haut') else K
        if (gauche and x == x0) or (droite and x == x1 - 1) or y == haut:
            return K
        return c
    t.remplit(x0, haut, x1, egout + 2, f)
    a = x0 + (rentre if gauche else 0)
    b = x1 - (rentre if droite else 0)
    B.faitage(t, a, faite, b, faite)
    for x in range(x0, x1):
        t.put(x, egout + 1, K)
        t.put(x, egout, B.TUILE_S)


def toit_plat(t, X0, X1, egout, prof):
    """Le toit plat vu d'en haut : la profondeur du bâtiment, un rebord de pierre."""
    B.toit_plat(t, X0, egout - prof, X1, egout + 1, pan_coupe=0)


def pignon(t_murs, t_toit, X0, X1, egout, prof, matiere, debord=4):
    """Le faîtage part vers l'arrière : sur la façade, le mur pignon en triangle ; au-dessus,
    les deux pans vus de 3/4 (celui de gauche dans la lumière), le faîtage qui s'enfonce."""
    xm = (X0 + X1) / 2
    demi = (X1 - X0) / 2
    G = round(demi * 0.62)            # la hauteur du pignon

    def ligne(x):                     # le bord du toit au-dessus du pixel x (la rive)
        return egout - G * (1 - min(1, abs(x + 0.5 - xm) / (demi + debord)))

    # le mur pignon
    def mur(x, y):
        if y < ligne(x) + 3:
            return None
        c = B.taille(x, y) if matiere == 'pierre' else B.brique(x, y, matiere)
        return teinte(c, 0.8) if y < ligne(x) + 6 else c
    t_murs.remplit(X0, egout - G, X1, egout, mur)
    # un oculus au milieu du pignon
    oy = round(egout - G * 0.45)
    for y in range(oy - 5, oy + 5):
        for x in range(round(xm) - 5, round(xm) + 5):
            d = math.hypot(x + 0.5 - xm, y + 0.5 - oy)
            if d < 4.6:
                t_murs.put(x, y, K if d > 3.6 else (O.VITRE_C if x + y < round(xm) + oy - 1 else O.VITRE))
    # les pans
    x0, x1 = round(X0 - debord), round(X1 + debord)

    def pan(x, y):
        bas = ligne(x)
        if not (bas - prof <= y <= bas + 2):
            return None
        sens = 'gauche' if x < xm else 'droite'
        c = B.tuile(x, y, sens)
        c = teinte(c, 1.16) if sens == 'gauche' else teinte(c, 0.9)
        if y >= bas - 1:
            return K if y >= bas + 1 else B.PLANCHE[2] if y == bas else c
        if y >= bas - 3:
            return B.PLANCHE[0]               # la planche de rive
        if x in (x0, x1 - 1) or y < bas - prof + 1:
            return K
        return c
    t_toit.remplit(x0, round(egout - G - prof), x1, egout + 3, pan)
    xr = round(xm)
    B.faitage(t_toit, xr, round(egout - G - prof) + 1, xr, round(egout - G) - 2)


def dome(t, cx, cy, R):
    """Un dôme de tuiles (une demi-sphère vue de 3/4) posé sur un tambour de pierre, sa
    lanterne ; cy : le centre de sa base (px)."""
    lum = (-0.5, -0.62, 0.6)
    # le tambour
    for y in range(cy - 6, cy + round(R * 0.32) + 6):
        for x in range(cx - R - 4, cx + R + 4):
            u = (x + 0.5 - cx) / (R + 3)
            if abs(u) > 1:
                continue
            bas = cy + 6 + R * 0.32 * math.sqrt(1 - u * u)
            if y > bas:
                continue
            c = B.taille(x, y)
            c = teinte(c, 1.0 - 0.25 * max(0, u))
            if y >= bas - 1 or abs(u) > 0.97:
                c = K
            t.put(x, y, c)
    for y in range(cy - R - 1, cy + round(R * 0.32) + 1):
        for x in range(cx - R, cx + R + 1):
            nx, ny = (x + 0.5 - cx) / R, (y + 0.5 - cy) / R
            # la sphère, coupée en bas par l'ellipse de sa base
            if nx * nx + ny * ny > 1 and not (ny > 0 and nx * nx + (ny / 0.32) ** 2 <= 1):
                continue
            if ny > 0 and nx * nx + (ny / 0.32) ** 2 > 1:
                continue
            nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
            b = nx * lum[0] + ny * lum[1] + nz * lum[2]
            c = mel(B.TUILE_S, B.TUILE_C, max(0, min(1, 0.25 + b * 0.85)))
            # les côtes : des méridiens
            phi = math.atan2(nx, max(0.05, nz))
            if abs(((phi / (math.pi / 7)) + 0.5) % 1 - 0.5) < 0.09:
                c = teinte(c, 0.7)
            # les rangs de tuiles
            elif (y - cy) % 5 == 0:
                c = teinte(c, 0.88)
            if nx * nx + ny * ny > 0.93 and ny < 0.2:
                c = K
            t.put(x, y, c)
    # la lanterne
    lx, ly = cx, cy - R
    for y in range(ly - 16, ly + 2):
        for x in range(lx - 6, lx + 6):
            u = x - lx
            if y < ly - 12:
                if abs(u) <= 2 + (y - (ly - 16)) // 2:
                    t.put(x, y, K if abs(u) == 2 + (y - (ly - 16)) // 2 or y == ly - 16 else B.TUILE_C)
            else:
                c = K if abs(u) in (5, 6) or y in (ly - 12, ly + 1) else (PIERRE[2] if u < -1 else PIERRE[0] if u < 2 else PIERRE[1])
                if ly - 9 <= y <= ly - 3 and u in (-2, -1, 1, 2):
                    c = (44, 30, 34)
                if abs(u) <= 5:
                    t.put(x, y, c)


def colonne(t, x, y0, y1):
    """Une colonne de pierre de 10 px (px), sa base et son chapiteau."""
    for y in range(y0, y1):
        for xx in range(x - 2, x + 12):
            r = xx - x
            if y < y0 + 4 or y >= y1 - 5:
                c = K if r in (-2, 11) or y in (y0, y1 - 1) else (PIERRE[2] if y < y0 + 2 or y == y1 - 5 else PIERRE[0])
            elif 0 <= r <= 9:
                c = K if r in (0, 9) else ((236, 226, 202) if r in (2, 3) else (PIERRE[1] if r >= 7 else PIERRE[0]))
            else:
                continue
            t.put(xx, y, c)


def marches(t, x0, x1, y, n=2, pas=6):
    """Des marches de pierre devant une porte : la première à la ligne y, n marches qui
    descendent vers le bas de l'écran, chacune plus large de 4 px."""
    for k in range(n):
        a, b = x0 - 4 * (k + 1), x1 + 4 * (k + 1)
        for yy in range(y + k * pas, y + (k + 1) * pas):
            for x in range(a, b):
                q = yy - (y + k * pas)
                c = K if x in (a, b - 1) or q == pas - 1 else (PIERRE[2] if q == 0 else PIERRE[0] if q < 3 else PIERRE[1])
                t.put(x, yy, c)


def porte_double(t, x, sol, larg=32, haut=48, verre=False):
    """Une grande porte à deux battants (px) dans son encadrement de pierre, posée au sol."""
    y0 = sol - haut
    for y in range(y0 - 4, sol):
        for xx in range(x - 4, x + larg + 4):
            u, v = xx - x, y - y0
            if u < 0 or u >= larg or v < 0:
                c = K if xx in (x - 4, x + larg + 3) or y == y0 - 4 else (PIERRE[2] if y < y0 - 1 or u < 0 else PIERRE[1])
            elif u in (0, larg - 1, larg // 2 - 1, larg // 2) or v == 0:
                c = K
            elif verre:
                c = O.VITRE_C if (u + (haut - v)) % 13 in (0, 1) else (O.VITRE if v > 4 else O.VITRE_S)
            else:
                p = u % (larg // 2)
                c = O.BOIS_C if p in (2, 3) else O.BOIS_K if p in (larg // 2 - 3,) or v in (haut // 2,) else O.BOIS
            t.put(xx, y, c)
    for xx in (x + larg // 2 - 3, x + larg // 2 + 2):
        for y in range(sol - haut // 2 - 3, sol - haut // 2 + 3):
            t.put(xx, y, (236, 200, 96) if not verre else (220, 224, 228))


def verre(t, x0, y0, x1, y1, ton='clair', pas_x=16):
    """Un pan de verre (px) : des montants tous les pas_x px, des reflets en biais."""
    b, s_, c = B.VERRE[ton]

    def f(x, y):
        if (x - x0) % pas_x in (0, 1) or x == x1 - 1 or y in (y0, y1 - 1):
            return B.MONTANT
        r = (x + y) % 64
        if r in (0, 1, 2, 7, 8):
            return c
        if r in (3, 9):
            return mel(b, c, 0.5)
        return s_ if y < y0 + 4 else b
    t.remplit(x0, y0, x1, y1, f)


# ---------- un bâtiment entier ----------

class Batiment:
    """Un bâtiment : son emprise (x0..x1, base - prof .. base, en tuiles), ses étages, sa
    matière, son toit ; `haut` : le haut du dessin (px), pour la carte (couche « batiments »)."""

    def __init__(self, nom, x0, x1, base, prof, etages, matiere, toit, fenetres=(), portes=(), **opts):
        self.nom, self.x0, self.x1, self.base, self.prof = nom, x0, x1, base, prof
        self.etages, self.matiere, self.toit = etages, matiere, toit
        self.fenetres, self.portes, self.opts = fenetres, portes, opts
        self.haut = None

    def dessine(self, c):
        X0, X1, BASE, P = self.x0 * T, self.x1 * T, self.base * T, self.prof * T
        Hw = hauteur_facade(self.etages)
        egout = BASE - Hw
        o = self.opts
        g, d = o.get('gauche', True), o.get('droite', True)
        toile = {'pierre': 'pierre_de_taille', 'bois': 'charpente'}.get(self.matiere, 'murs')
        facade(c[toile], X0, X1, BASE, self.etages, self.matiere, gauche=g, droite=d,
               bandeaux=o.get('bandeaux', True), pilastres=o.get('pilastres', True))
        # les fenêtres : par étage, une liste de colonnes (la même pour tous si une seule)
        for k in range(self.etages):
            # (la dernière liste vaut pour les étages suivants)
            cols = self.fenetres[min(k, len(self.fenetres) - 1)] if self.fenetres else ()
            for x in cols:
                fenetre(c['menuiserie'], round(x * T), BASE - k * ETAGE)
        for x in self.portes:
            porte(c['menuiserie'], round(x * T), BASE)
        t = self.toit
        if t is None:                     # (coupé par le haut de la carte)
            self.haut = egout
        elif t == 'pans':
            toit_pans(c['toits'], X0, X1, egout, P)
            self.haut = egout - P
        elif t == 'croupe':
            toit_croupe(c['toits'], X0, X1, egout, P, gauche=g, droite=d)
            self.haut = egout - P
        elif t == 'plat':
            toit_plat(c['toits_plat'], X0, X1, egout, P)
            self.haut = egout - P
        elif t == 'pignon':
            G = round((X1 - X0) / 2 * 0.62)
            pignon(c['murs'], c['toits'], X0, X1, egout, P, self.matiere)
            self.haut = egout - G - P
        elif t == 'planches':
            # un appentis : un seul pan de planches, vu de 3/4
            haut = egout - P
            t_ = c['charpente']
            for y in range(haut, egout + 2):
                for x in range(X0 - 3, X1 + 3):
                    q = y - haut
                    if x in (X0 - 3, X1 + 2) or y in (haut, egout + 1):
                        col = K
                    elif y >= egout - 2:
                        col = B.PLANCHE[1]
                    else:
                        col = B.planche(x, y, True)
                        col = teinte(col, 1.06 - 0.12 * q / P)
                    t_.put(x, y, col)
            self.haut = haut
        return self

    def objet(self, i):
        """L'objet de la couche « batiments » (Tiled) : l'emprise au sol, et le haut du dessin."""
        return {'id': i, 'name': self.nom, 'type': 'batiment', 'rotation': 0, 'visible': True,
                'x': self.x0 * T, 'y': (self.base - self.prof) * T,
                'width': (self.x1 - self.x0) * T, 'height': self.prof * T,
                'properties': [{'name': 'haut', 'type': 'int', 'value': int(self.haut)}]}
