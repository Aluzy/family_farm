# Les arbres d'ornement de la boutique de gemmes (worker/src/boutique.mjs ARTICLES) : un décor de 2 × 2 cases posé
# dehors (data/recipes.json ATELIER.BLOCS ornement_<espèce>, `dessin`), vu de haut à 45° (CLAUDE.md) : le tronc, un
# cylindre éclairé à gauche, évasé au pied ; la couronne, un amas de touffes rondes, chacune un volume (son dessus
# éclairé en haut à gauche, son dessous dans l'ombre froide, un liseré sombre qui la détache de sa voisine), chacune sa
# rampe ; les fleurs (cerisier, magnolia) posées dessus, plus claires vers la lumière ; les rameaux du saule qui
# retombent jusqu'au sol, devant et derrière le tronc. Le jeu n'a plus de saisons (version 1.6) : chaque arbre garde
# toute l'année son plus bel aspect (le cerisier en fleurs, l'érable rouge).
#
# Ce qui tombe est à part (assets/ornements_chute.png : une rangée par espèce, CHUTE_IMAGES images de W × H, posées
# par-dessus l'arbre, au même endroit) : les pétales roses du cerisier, les feuilles rouges de l'érable, les pétales
# blancs du magnolia, les feuilles fines du saule ; la carte les fait défiler (js/carte/ferme/chantier.js).
#
#   python3 scripts/batiments/ornements.py            écrit assets/meuble_ornement_<espèce>.png et ornements_chute.png
#   python3 scripts/batiments/ornements.py --apercu   écrit aussi apercu_ornements.png (agrandi, sur l'herbe)
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

W, H = 64, 80                                # (la couronne déborde de ses 2 × 2 cases, au-dessus et sur les côtés)
DY = 16                                      # (les formes sont décrites dans 48 × 64 : décalées vers le bas de DY)
OUT = (30, 24, 28)
CHUTE_IMAGES = 8
CX = 31.5
LUM = (-0.55, -0.62, 0.56)                       # la lumière, en haut à gauche, un peu devant
ESPECES = ['cerisier_japon', 'erable_rouge', 'magnolia', 'saule_pleureur']

ECORCES = {
    'cerisier_japon': [(34, 22, 30), (66, 40, 44), (104, 66, 62), (146, 104, 92), (186, 150, 130)],
    'erable_rouge': [(32, 26, 26), (62, 48, 42), (98, 80, 66), (136, 114, 92), (176, 156, 128)],
    'magnolia': [(40, 38, 42), (74, 70, 72), (112, 108, 104), (152, 146, 136), (194, 188, 172)],
    'saule_pleureur': [(36, 30, 24), (66, 56, 40), (100, 88, 62), (138, 124, 88), (178, 166, 122)],
}
# les feuillages : plusieurs rampes proches par espèce (une par touffe), l'ombre froide, la lumière chaude
FEUILLES = {
    'cerisier_japon': [[(74, 26, 70), (140, 50, 108), (200, 90, 146), (234, 140, 180), (250, 190, 212), (255, 228, 232)],
                       [(82, 30, 74), (152, 58, 116), (212, 102, 156), (242, 152, 190), (252, 200, 218), (255, 234, 236)],
                       [(66, 24, 74), (128, 46, 112), (188, 82, 146), (226, 128, 176), (246, 180, 206), (255, 222, 230)],
                       [(90, 34, 70), (164, 66, 114), (222, 114, 158), (248, 164, 194), (255, 208, 222), (255, 238, 238)]],
    'erable_rouge': [[(46, 10, 34), (96, 16, 36), (150, 24, 36), (194, 40, 38), (230, 76, 52), (255, 150, 96)],
                     [(52, 12, 36), (108, 18, 38), (164, 30, 38), (208, 50, 40), (240, 94, 58), (255, 166, 106)],
                     [(42, 8, 36), (88, 14, 40), (138, 22, 42), (182, 34, 44), (220, 64, 56), (250, 136, 96)],
                     [(56, 14, 32), (118, 24, 34), (176, 40, 34), (220, 66, 40), (250, 114, 62), (255, 184, 116)]],
    'magnolia': [[(14, 38, 40), (26, 68, 56), (44, 102, 66), (80, 140, 76), (132, 176, 92), (196, 214, 132)],
                 [(16, 42, 44), (30, 76, 60), (52, 112, 70), (90, 150, 80), (144, 186, 98), (206, 222, 140)],
                 [(12, 34, 40), (24, 62, 54), (40, 94, 64), (72, 130, 72), (122, 166, 88), (186, 206, 126)]],
    'saule_pleureur': [[(26, 50, 34), (48, 88, 44), (82, 128, 54), (128, 168, 70), (182, 204, 104), (226, 232, 160)],
                       [(30, 54, 36), (54, 96, 48), (92, 138, 58), (140, 178, 76), (192, 212, 112), (232, 238, 168)],
                       [(24, 46, 36), (44, 82, 46), (74, 120, 56), (118, 160, 68), (170, 196, 98), (218, 226, 152)]],
}
FLEUR_MAGNOLIA = rampe([(120, 70, 110), (190, 120, 160), (234, 186, 206), (252, 232, 236), (255, 252, 250)], 120)
COEUR_MAGNOLIA = rampe([(110, 40, 90), (170, 70, 130), (214, 120, 170)], 60)

# les houppes : pour chaque espèce, plusieurs formes (FORMES[espèce][forme]) ; une forme est un ensemble de masses
# (le milieu x, le milieu y, le rayon x, le rayon y, le nombre de touffes, leur rayon) et `pied`, le haut du tronc
# visible (là où la couronne le cache)
FORMES = {
    'cerisier_japon': {
        'parasol': {'pied': 40, 'masses': [(CX, 21, 22, 11, 36, (4.0, 6.4)), (CX, 28, 17, 7, 12, (3.6, 5.4))]},
        'nuages': {'pied': 42, 'masses': [(CX - 11, 31, 10, 6, 12, (3.6, 5.4)), (CX + 11, 26, 10, 6, 12, (3.6, 5.4)),
                                          (CX - 2, 16, 12, 7, 14, (3.8, 5.8)), (CX + 3, 7, 7, 4.5, 7, (3.4, 5.0))]},
        'penche': {'pied': 40, 'masses': [(CX + 4, 21, 19, 15, 38, (4.0, 6.4)), (CX - 14, 30, 8, 6, 9, (3.4, 5.0))]},
    },
    'erable_rouge': {
        'rond': {'pied': 40, 'masses': [(CX, 23, 19, 18, 42, (4.2, 6.4))]},
        'colonne': {'pied': 43, 'masses': [(CX, 22, 12, 21, 38, (4.0, 6.0))]},
        'coeur': {'pied': 40, 'masses': [(CX - 8, 20, 12, 14, 22, (4.0, 6.2)), (CX + 8, 20, 12, 14, 22, (4.0, 6.2)),
                                         (CX, 30, 15, 8, 12, (3.8, 5.6))]},
    },
    'magnolia': {
        'rond': {'pied': 39, 'masses': [(CX, 23, 18, 16, 38, (4.0, 6.2))]},
        'coupe': {'pied': 40, 'masses': [(CX, 15, 21, 10, 30, (4.0, 6.0)), (CX, 29, 11, 8, 10, (3.6, 5.4))]},
        'cone': {'pied': 42, 'masses': [(CX, 9, 7, 7, 8, (3.4, 5.0)), (CX, 20, 12, 9, 16, (3.8, 5.6)),
                                        (CX, 32, 17, 9, 22, (4.0, 6.0))]},
    },
    # le saule n'a pas de touffes : ses lianes partent toutes du haut, au milieu (une raie), suivent le dôme puis
    # retombent jusqu'au sol (lianes_saule) ; sa masse ne sert qu'à situer la couronne (boite)
    'saule_pleureur': {
        'raie': {'pied': 46, 'masses': [(CX, 18, 20, 13, 0, (4.0, 6.0))]},
    },
}
for _formes in FORMES.values():               # (décrites dans 48 × 64 : vers le bas de DY)
    for _f in _formes.values():
        _f['pied'] += DY
        _f['masses'] = [(m[0], m[1] + DY) + tuple(m[2:]) for m in _f['masses']]


def agrandie(forme, sx, sy):
    """La même houppe, plus large (sx) et plus haute (sy) : ses masses s'écartent du milieu et montent depuis le bas
    de la couronne (le tronc ne change pas) ; autant de touffes par surface."""
    bas = max(m[1] + m[3] for m in forme['masses'])
    return {'pied': forme['pied'], 'masses': [(CX + (m[0] - CX) * sx, bas - (bas - m[1]) * sy, m[2] * sx, m[3] * sy,
                                                round(m[4] * sx * sy), m[5]) for m in forme['masses']]}


# les propositions : plus haute, plus large, les deux (sur la houppe choisie)
GRANDES = {'haute': (1.0, 1.35), 'large': (1.35, 1.0), 'ample': (1.3, 1.3)}
for _e, _n in (('cerisier_japon', 'nuages'), ('erable_rouge', 'coeur'), ('magnolia', 'coupe')):
    for _g, (_sx, _sy) in GRANDES.items():
        FORMES[_e][_n + '_' + _g] = agrandie(FORMES[_e][_n], _sx, _sy)

FORME = {'cerisier_japon': 'nuages', 'erable_rouge': 'coeur', 'magnolia': 'coupe', 'saule_pleureur': 'raie'}   # celles du jeu


def boite(forme):
    """Le milieu et les demi-tailles de la couronne entière (l'éclairage d'ensemble, les pétales qui tombent)."""
    M = forme['masses']
    x0, x1 = min(m[0] - m[2] for m in M), max(m[0] + m[2] for m in M)
    y0, y1 = min(m[1] - m[3] for m in M), max(m[1] + m[3] for m in M)
    return (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2


HERBE = rampe([(30, 62, 30), (52, 96, 40), (78, 128, 50), (108, 156, 62), (146, 184, 82), (188, 210, 112)], 120)


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = tuple(int(v) for v in c[:3]) + (255,)

    def get(self, x, y):
        return self.px[int(x), int(y)] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)


def tronc(t, esp, forme, rng):
    """Le tronc : un cylindre éclairé à gauche, l'écorce en stries, évasé au pied (les racines) et arrondi en bas
    (vu de haut à 45°, sa base est une ellipse : le milieu descend plus bas que les côtés) ; une ou deux branches
    maîtresses qui montent dans la couronne."""
    R = rampe(ECORCES[esp], 140)
    haut = forme['pied'] - 8
    for y in range(haut, H - 2):
        f = (y - haut) / (H - 2 - haut)
        demi = 2.2 + (0.6 if esp == 'erable_rouge' else 0) + max(0, f - 0.78) * 14      # évasé au pied
        if esp == 'cerisier_japon':
            cx = CX + 1.2 * math.sin(y * 0.22)                                         # un tronc un peu tors
        else:
            cx = CX
        for x in range(int(cx - demi - 1), int(cx + demi + 2)):
            u = (x + 0.5 - cx) / demi
            if abs(u) > 1 or y > H - 3 - 3.2 * u * u + 0.4:
                continue                                     # (le bas arrondi)
            lum = 0.62 - 0.42 * (u + 1) / 2 - 0.10 * (1 - math.sqrt(max(0, 1 - u * u)))
            lum -= 0.16 * max(0, y - (H - 7)) / 4            # le pied dans l'ombre de l'herbe
            strie = esp in ('erable_rouge', 'saule_pleureur') and int(x * 1.7 + bruit(x, y // 3, 71) * 2) % 3 == 0
            anneau = esp in ('cerisier_japon', 'magnolia') and (y + int(bruit(x, 0, 72) * 2)) % 6 == 0   # lenticelles
            lum += -0.12 * strie - 0.10 * anneau + 0.04 * bruit(x, y, 73)
            t.put(x, y, ton(R, lum))
    # les branches maîtresses, qui partent vers la couronne
    for sens in (-1, 1):
        x, y = CX, haut + 2
        for i in range(12):
            x += sens * (0.9 if esp != 'saule_pleureur' else 0.6)
            y -= 0.9
            for k in (0, 1):
                t.put(x, y + k, ton(R, 0.42 - 0.2 * (sens > 0) + 0.05 * bruit(i, k, 74)))


def touffes(esp, forme, rng):
    out = []
    for (cx, cy, rx, ry, n, (r0, r1)) in forme['masses']:
        for i in range(n):
            a, d = rng.random() * 2 * math.pi, math.sqrt(rng.random())
            x, y = cx + math.cos(a) * d * max(0.5, rx - r0), cy + math.sin(a) * d * max(0.5, ry - r0 * 0.8)
            out.append((x, y, r0 + rng.random() * (r1 - r0), rng.randrange(len(FEUILLES[esp]))))
    out.sort(key=lambda c: c[1])                          # du fond vers l'avant : celles de devant recouvrent
    return out


def couronne(t, esp, forme, rng):
    """Les touffes, une à une, du fond vers l'avant : chacune une demi-sphère vue de haut à 45° (sa normale donne la
    lumière), le grain des feuilles, un liseré sombre en bas à droite qui la détache de la touffe de derrière."""
    rampes = [rampe(c, 160) for c in FEUILLES[esp]]
    cx0, cy0, rx0, ry0 = boite(forme)
    R0 = rampes[0]
    for (mx, my, mrx, mry, _, _) in forme['masses']:      # le cœur de chaque masse, dans l'ombre (l'occlusion)
        for y in range(int(my - mry), int(my + mry) + 1):
            for x in range(int(mx - mrx), int(mx + mrx) + 1):
                if ((x + 0.5 - mx) / max(1, mrx - 3)) ** 2 + ((y + 0.5 - my) / max(1, mry - 3)) ** 2 <= 1:
                    t.put(x, y, ton(R0, 0.10 + 0.08 * bruit(x, y, 78) - 0.04 * (y - cy0) / ry0))
    if esp in ('cerisier_japon', 'magnolia'):              # les rameaux sombres qu'on voit entre les touffes
        E = rampe(ECORCES[esp], 100)
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * 0.42
            x, y = CX, cy0 + ry0 * 0.55
            for j in range(int(rx0 * 0.8)):
                x += math.cos(a) * 1.0
                y += math.sin(a) * 0.7
                if any(((x + 0.5 - m[0]) / m[2]) ** 2 + ((y + 0.5 - m[1]) / m[3]) ** 2 <= 0.8 for m in forme['masses']):
                    t.put(x, y, ton(E, 0.25 + 0.1 * (j % 2)))   # (dans la couronne seulement)
    fleurs = []
    for (x0, y0, r, k) in touffes(esp, forme, rng):
        R = rampes[k]
        for y in range(int(y0 - r) - 1, int(y0 + r) + 2):
            for x in range(int(x0 - r) - 1, int(x0 + r) + 2):
                dx, dy = (x + 0.5 - x0) / r, (y + 0.5 - y0) / (r * 0.86)
                d = dx * dx + dy * dy
                g = bruit(x, y, 75 + k)
                if d > 1 - 0.18 * (g > 0.3):              # un bord déchiqueté : les feuilles qui dépassent
                    continue
                nz = math.sqrt(max(0.0, 1 - d))
                lum = 0.5 + 0.5 * (dx * LUM[0] + dy * LUM[1] + nz * LUM[2])
                # l'ombre de la couronne entière : plus sombre en bas et vers l'intérieur (l'occlusion)
                gy, gx = (y + 0.5 - cy0) / ry0, (x + 0.5 - cx0) / rx0
                lum += -0.22 * gy - 0.12 * gx - 0.10 * max(0, gy - 0.4) * 2
                lum += 0.08 * g + (0.06 if (x * 3 + y * 5 + k) % 7 == 0 else 0)           # le grain des feuilles
                if d > 0.72 and (dx + dy) > 0.4:
                    lum -= 0.16                                                         # le liseré d'ombre
                fond = 0.08 if esp in FEUILLE_FORMES else 0       # (sous les feuilles, la touffe plus sombre)
                t.put(x, y, ton(R, 0.12 + 0.82 * max(0, min(1, lum - fond))))
        feuillage(t, esp, R, x0, y0, r, (cx0, cy0, rx0, ry0), rng)
        if esp == 'magnolia' and rng.random() < 0.75:      # une fleur en tulipe sur la touffe, tournée vers le ciel
            fleurs.append((x0 + rng.uniform(-r / 2, r / 3), y0 - r * 0.45))
    for (x, y) in fleurs:                                   # (les fleurs par-dessus tout le feuillage)
        fleur(t, x, y, rng)


def eclairage(x, y, x0, y0, r, b):
    """La lumière d'un point (x, y) sur la touffe de milieu (x0, y0), de rayon r, dans la couronne de boîte b."""
    cx0, cy0, rx0, ry0 = b
    dx, dy = (x + 0.5 - x0) / r, (y + 0.5 - y0) / (r * 0.86)
    nz = math.sqrt(max(0.0, 1 - min(1.0, dx * dx + dy * dy)))
    lum = 0.5 + 0.5 * (dx * LUM[0] + dy * LUM[1] + nz * LUM[2])
    gy, gx = (y + 0.5 - cy0) / ry0, (x + 0.5 - cx0) / rx0
    return lum - 0.22 * gy - 0.12 * gx - 0.10 * max(0, gy - 0.4) * 2


# Les petites formes du feuillage, posées sur les touffes : [(dx, dy, écart de lumière)] ; l'ombre portée de la
# feuille (en bas à droite) est posée d'abord, la feuille par-dessus, son bord haut et gauche plus clair.
FEUILLE_FORMES = {
    'cerisier_japon': [   # une fleur de cerisier : cinq pétales autour d'un cœur plus pâle
        [(0, -1, 0.06), (-1, 0, 0.04), (1, 0, -0.04), (0, 1, -0.08), (0, 0, 0.14)],
        [(0, 0, 0.10), (1, 0, 0.0), (0, 1, -0.06), (1, 1, -0.10)],
    ],
    'erable_rouge': [     # une feuille d'érable : trois pointes
        [(0, -1, 0.10), (-1, 0, 0.06), (0, 0, 0.0), (1, 0, -0.06), (0, 1, -0.10)],
        [(-1, -1, 0.10), (1, -1, 0.02), (0, 0, 0.0), (0, 1, -0.10)],
        [(0, -1, 0.08), (-1, 0, 0.04), (0, 0, -0.02), (1, 1, -0.10)],
    ],
    'magnolia': [         # une feuille de magnolia : longue, ovale, penchée
        [(-1, -1, 0.10), (0, 0, 0.02), (1, 1, -0.08)],
        [(1, -1, 0.06), (0, 0, 0.0), (-1, 1, -0.06)],
        [(0, -1, 0.10), (0, 0, 0.02), (0, 1, -0.08), (1, 0, -0.04)],
        [(-1, 0, 0.08), (0, 0, 0.02), (1, 0, -0.06)],
    ],
}


def feuillage(t, esp, R, x0, y0, r, b, rng):
    """Un semblant de feuillage sur la touffe : de petites feuilles (des fleurs pour le cerisier), chacune éclairée
    selon sa place sur la touffe, son bord haut gauche plus clair, son ombre portée en bas à droite ; quelques-unes
    débordent du bord, la silhouette devient feuillue."""
    formes = FEUILLE_FORMES.get(esp)
    if not formes:
        return
    n = int(r * r * 0.40)
    for _ in range(n):
        a, d = rng.random() * 2 * math.pi, math.sqrt(rng.random()) * 1.08
        x, y = round(x0 + math.cos(a) * d * r), round(y0 + math.sin(a) * d * r * 0.86)
        if 0.6 < d < 0.98 and (math.cos(a) + math.sin(a)) > 0.5:
            continue                                        # (le liseré d'ombre de la touffe reste libre : son volume)
        forme = rng.choice(formes)
        base = eclairage(x, y, x0, y0, r, b) + rng.uniform(-0.07, 0.07)
        if d > 0.95 and (math.cos(a) + math.sin(a)) > 0.3:
            base -= 0.10                                    # (au bord, côté ombre)
        ombre = max(0, min(1, base - 0.46))
        for (dx, dy, _) in forme:                           # l'ombre de la feuille, décalée en bas à droite
            if not t.get(x + dx + 1, y + dy + 1)[3]:
                continue
            if (dx + 1, dy + 1) not in [(u, v) for (u, v, _) in forme]:
                t.put(x + dx + 1, y + dy + 1, ton(R, 0.12 + 0.82 * ombre))
        for (dx, dy, e) in forme:
            t.put(x + dx, y + dy, ton(R, 0.12 + 0.82 * max(0, min(1, base + 0.04 + 1.8 * e))))


def fleur(t, x0, y0, rng):
    for y in range(-3, 2):
        for x in range(-2, 3):
            if (x * x) / 6.5 + ((y + 0.8) ** 2) / 5.5 > 1:
                continue
            lum = 0.92 - 0.14 * (x + 2) / 4 - 0.12 * (y + 3) / 5 + 0.05 * bruit(x0 + x, y0 + y, 76)
            if x == 0 and y < 0:
                lum -= 0.12                                  # le creux entre les pétales
            t.put(x0 + x, y0 + y, ton(FLEUR_MAGNOLIA, lum))
    t.put(x0, y0 - 1, ton(COEUR_MAGNOLIA, 0.6))


RAIE_Y, DOME_RX, DOME_RY = 4 + DY, 20.5, 14            # la raie en haut du saule, la largeur et la hauteur de son dôme


def lianes_saule(t, rng, devant):
    """Les lianes du saule, comme une chevelure : chacune part de la raie, en haut au milieu, descend le long du
    dôme (un quart d'ellipse vers son côté), puis retombe presque droite jusqu'au sol en ondulant. Celles de
    derrière, plus sombres et froides, remplissent ; celles de devant sont éclairées sur le haut gauche du dôme et
    plus sombres en bas (l'ombre de la chevelure) ; un trou entre elles au milieu en bas, où l'on voit le tronc.
    Chaque liane a sa rampe et son ton ; ses feuilles fines alternent de part et d'autre."""
    rampes = [rampe(c, 160) for c in FEUILLES['saule_pleureur']]
    n = 24 if devant else 40
    for i in range(n):
        a = -1 + 2 * (i + 0.5 + rng.uniform(-0.25, 0.25)) / n   # de la gauche (-1) à la droite (1)
        R = rampes[rng.randrange(3)]
        teinte = rng.uniform(-0.05, 0.05)
        rx = DOME_RX * (0.96 + 0.06 * rng.random()) * (0.92 if not devant else 1)
        bas = H - 3 - rng.randrange(6) - (0 if devant else 3)
        if devant and abs(a) < 0.22:
            bas = min(bas, 40 + rng.randrange(6))         # (le tronc se voit entre les lianes du milieu)
        pts = []
        for k in range(40):                                # le dôme, de la raie vers le côté
            u = k / 39 * math.pi / 2
            pts.append((CX + (1 if a > 0 else -1) * 0.5 + a * rx * math.sin(u), RAIE_Y + DOME_RY * (1 - math.cos(u)) * (0.45 + 0.55 * abs(a))))
        x1, y1 = pts[-1]
        for y in range(int(y1) + 1, bas):                  # la chute, presque droite, qui ondule et s'écarte à peine
            f = (y - y1) / max(1, bas - y1)
            pts.append((x1 + a * 3.0 * f + 0.6 * math.sin(y * 0.35 + i), y))
        vus = set()
        for j, (x, y) in enumerate(pts):
            if (int(x), int(y)) in vus:
                continue
            vus.add((int(x), int(y)))
            chute = max(0.0, (y - y1) / max(1, bas - y1)) if j >= 40 else 0.0
            haut = (y - RAIE_Y) / (H - RAIE_Y)
            lum = 0.80 - 0.34 * (a + 1) / 2 - 0.30 * chute - 0.10 * haut + teinte + 0.05 * bruit(x, y, 77)
            if devant:                                      # le reflet sur l'arrondi du haut, côté lumière
                lum += 0.22 * math.exp(-((y - (RAIE_Y + DOME_RY * 0.55)) / 4.5) ** 2) * (1 - (a + 1) / 2)
            else:
                lum -= 0.42
            if j < 3:
                lum -= 0.18                                 # la raie, au creux du haut
            lum += 0.08 * (((int(y) + i) % 3) == 0)
            t.put(x, y, ton(R, lum))
            if j >= 40 and ((int(y) + i) % 4) == 0:      # une feuille fine de côté, dans la chute
                t.put(x + (1 if (int(y) // 4 + i) % 2 else -1), y, ton(R, lum - 0.08))
            elif devant and j < 40 and j % 2:              # (sur le dôme, la liane fait deux pixels : la chevelure)
                t.put(x + (1 if a > 0 else -1), y, ton(R, lum - 0.06))
    if devant:                                              # la raie : le creux au milieu du haut, d'où tout part
        Rr = rampes[0]
        for y in range(RAIE_Y, RAIE_Y + 5):
            t.put(CX, y, ton(Rr, 0.20 + 0.04 * (y - RAIE_Y)))


def herbe_au_pied(im, esp, rng):
    """Des brins d'herbe au pied du tronc, devant et sur les côtés, plus serrés au milieu : ils mangent le bas du
    contour et fondent l'arbre dans le sol ; chacun sa hauteur, son ton, sa pointe plus claire (chaude), sa base
    plus sombre (froide) ; quelques-uns derrière le tronc, plus sombres."""
    px = im.load()
    large = 8 if esp != 'saule_pleureur' else 11
    pris = set()
    for i in range(80):
        if len(pris) >= 30:
            break
        dx = max(-large, min(large, rng.gauss(0, large / 2.2)))
        x = int(round(CX + dx))
        if not 0 <= x < W or (x, 0) in pris or ((x - 1, 0) in pris and rng.random() < 0.6):
            continue                                     # (des brins séparés : on voit le pied entre eux)
        pris.add((x, 0))
        pres = max(0.0, 1 - abs(dx) / large)               # 1 contre le tronc, 0 au bord de la touffe
        base = H - 1 - (rng.random() < 0.3)
        h = 2 + int(round(pres * 3.5 + rng.random() * 1.5))
        pente = rng.choice((-1, 0, 0, 1)) if h > 2 else 0
        teinte = rng.uniform(-0.07, 0.07)
        for j in range(h):
            xx = x + (pente if j == h - 1 else 0)
            yy = base - j
            if 0 <= xx < W and 0 <= yy < H:
                l = 0.18 + 0.52 * (j + 1) / h + teinte + 0.04 * bruit(xx, yy, 79) - 0.10 * (pres > 0.7 and j == 0)
                px[xx, yy] = ton(HERBE, l) + (255,)


def arbre(esp, nom_forme=None):
    forme = FORMES[esp][nom_forme or FORME[esp]]
    rng = random.Random({'cerisier_japon': 11, 'erable_rouge': 23, 'magnolia': 37, 'saule_pleureur': 41}[esp])
    t = Toile()
    if esp == 'saule_pleureur':                            # la chevelure : derrière, le tronc, devant
        lianes_saule(t, random.Random(5), devant=False)
        tronc(t, esp, forme, rng)
        lianes_saule(t, random.Random(6), devant=True)
    else:
        tronc(t, esp, forme, rng)
        couronne(t, esp, forme, rng)
    im = contour(t.im, OUT)
    herbe_au_pied(im, esp, random.Random(len(esp) + 3))
    if esp == 'cerisier_japon':                            # quelques pétales déjà tombés, dans l'herbe
        px, R = im.load(), rampe(FEUILLES[esp][0], 100)
        for i, (x, y) in enumerate(((23, 78), (26, 79), (38, 78), (41, 79), (20, 79), (44, 78))):
            px[x, y] = ton(R, 0.78 + 0.04 * i) + (255,)
    return im


CHUTE = {
    'cerisier_japon': (FEUILLES['cerisier_japon'][1], 9, 0.85),
    'erable_rouge': (FEUILLES['erable_rouge'][1], 5, 0.62),
    'magnolia': ([(150, 110, 140), (220, 180, 200), (250, 236, 238), (255, 252, 250)], 4, 0.8),
    'saule_pleureur': (FEUILLES['saule_pleureur'][1], 4, 0.6),
}


def chute(esp, k):
    """Ce qui tombe, image k : des pétales (des feuilles) qui partent du bas de la couronne et descendent en
    tournoyant jusqu'au sol ; chacun son départ, son décalage dans le cycle, son tour."""
    cles, n, clair = CHUTE[esp]
    R = rampe(cles, 100)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    rng = random.Random(len(esp) * 13)
    cx, cy, rx, ry = boite(FORMES[esp][FORME[esp]])
    for i in range(n):
        x0 = cx + rng.uniform(-rx * 0.85, rx * 0.85)
        y0 = cy + rng.uniform(0, ry * 0.7)
        ph = (k / CHUTE_IMAGES + i / n) % 1
        y = y0 + ph * (H - 3 - y0)
        x = x0 + 3 * math.sin(ph * 2 * math.pi * 1.5 + i) + ph * 4
        a = int(255 * min(1, (1 - ph) * 4))
        vu = (k + i) % 2
        for (dx, dy, l) in (((0, 0, clair), (1, 0, clair - 0.15)) if vu else ((0, 0, clair - 0.05), (0, 1, clair - 0.22))):
            xx, yy = int(x + dx), int(y + dy)
            if 0 <= xx < W and 0 <= yy < H:
                px[xx, yy] = ton(R, l) + (a,)
    return im


def main():
    for e in ESPECES:
        arbre(e).save(os.path.join(ASSETS, f'meuble_ornement_{e}.png'), optimize=True)
    planche = Image.new('RGBA', (W * CHUTE_IMAGES, H * len(ESPECES)), (0, 0, 0, 0))
    for r, e in enumerate(ESPECES):
        for k in range(CHUTE_IMAGES):
            planche.alpha_composite(chute(e, k), (k * W, r * H))
    planche.save(os.path.join(ASSETS, 'ornements_chute.png'))
    print(f'arbres d\'ornement : {len(ESPECES)} espèces de {W} × {H} ; ce qui tombe : {CHUTE_IMAGES} images par espèce')
    if '--apercu' in sys.argv:
        n = max(len(f) for f in FORMES.values())
        ap = Image.new('RGBA', ((W + 6) * n, (H + 6) * len(ESPECES)), (92, 146, 62, 255))
        for j, e in enumerate(ESPECES):
            for i, f in enumerate(FORMES[e]):
                ap.alpha_composite(arbre(e, f), (i * (W + 6) + 3, j * (H + 6) + 3))
        ap.resize((ap.width * 4, ap.height * 4), Image.NEAREST).save(os.path.join(ROOT, 'apercu_ornements.png'))


if __name__ == '__main__':
    main()
