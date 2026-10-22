# Versions délabrées des bâtiments de la carte, pour le début de partie : tous les bâtiments
# sont là, mais abîmés, et le joueur les répare.
#
#   python3 scripts/batiments/ruines.py            écrit assets/<image>_ruine.png
#   python3 scripts/batiments/ruines.py --apercu   écrit aussi apercu_ruines.png (avant / après, agrandi)
#
# Chaque image délabrée part de l'image d'origine (même taille, même découpe en cases) :
# elle se substitue à l'originale sans autre réglage. Les dégâts sont posés à la main, case
# par case (coordonnées en pixels de l'image), avec quelques outils communs :
#   vieillir()        couleurs passées, bois plus sombre, crasse ;
#   trou()            trou dans un toit ou un mur : vide sombre, chevrons visibles, bord cassé ;
#   vitre()           carreau cassé : vide derrière, éclats restés dans les angles ;
#   planche()         planche manquante : fente sombre aux bouts irréguliers ;
#   clouer()          planche clouée en travers (fenêtre ou porte condamnée) ;
#   fissure(), toile(), herbes(), mousse().
# Le hasard est fixe (graine par bâtiment) : relancer le script redonne les mêmes images.
#
# Images d'origine : celles de scripts/batiments/style_v2.py (la ferme et la serre du décor
# version 2), silo.png du dépôt. Lancer style_v2.py avant ce script. Seules les images de printemps (_sp) sont faites : la carte garde
# l'apparence du printemps toute l'année (SEASONS_ON_MAP dans js/farm-stage.js).
import colorsys
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style_v2 import TOIT, TOIT_SERRE  # noqa: E402

TOITS = set(TOIT) | set(TOIT_SERRE)    # le poulailler garde TOIT ; la maison, l'étable et le moulin ont TOIT_SERRE

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS  # noqa: E402

VIDE = (24, 13, 16)          # l'intérieur, vu par un trou
VIDE_VITRE = (20, 22, 34)    # derrière un carreau cassé
CHEVRON = (62, 40, 30)       # bois de charpente vu dans un trou de toit
BOIS = [(56, 30, 26), (92, 64, 48), (120, 96, 72), (146, 128, 98)]     # contour, ombre, bois, lumière (bois gris, vieilli)
CLOU = (44, 44, 52)
TOILE = (226, 226, 232)
HERBE = [(38, 74, 40), (58, 104, 50), (88, 136, 64), (120, 160, 78)]
MOUSSE = [(70, 96, 52), (92, 120, 60), (60, 82, 46)]


class Ruine:
    def __init__(self, source, graine, image=None):
        self.source = source
        self.orig = Image.open(os.path.join(ASSETS, source)).convert('RGBA')
        self.im = (image or self.orig).copy()
        self.W, self.H = self.im.size
        self.px = self.im.load()
        self.rng = random.Random(graine)

    # --- accès ---
    def get(self, x, y):
        if 0 <= x < self.W and 0 <= y < self.H:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def put(self, x, y, c, a=255):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.px[x, y] = tuple(c[:3]) + (a,)

    def plein(self, x, y):
        return self.get(x, y)[3] > 200

    # --- outils ---
    def vieillir(self, sat=0.72, lum=0.92, crasse=0.06, x0=0, y0=0, x1=None, y1=None):
        """Couleurs passées et un peu plus sombres, taches de crasse au hasard."""
        x1 = self.W if x1 is None else x1
        y1 = self.H if y1 is None else y1
        for y in range(y0, y1):
            for x in range(x0, x1):
                r, g, b, a = self.px[x, y]
                if a == 0:
                    continue
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                s *= sat
                v *= lum
                if self.rng.random() < crasse:
                    v *= 0.8
                r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
                self.px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)

    def trou(self, rects, pente=(0, 1), ecart=4, dedans=None, bord=0.6):
        """Trou dans un toit ou un mur : réunion de rectangles (x, y, l, h), posés en marches
        comme les rangées de bardeaux arrachés. Dedans : le vide, et les chevrons de la
        charpente (droites parallèles à `pente` = (dx, dy), tous les `ecart` px). Bords
        grignotés au hasard, bord cassé assombri. `dedans(x, y)` limite le trou (par exemple
        aux pixels du toit)."""
        trou = set()
        for (x0, y0, l, h) in rects:
            for y in range(y0, y0 + h):
                for x in range(x0, x0 + l):
                    bordure = x in (x0, x0 + l - 1) or y in (y0, y0 + h - 1)
                    if bordure and self.rng.random() < 0.3:
                        continue
                    if self.plein(x, y) and (dedans is None or dedans(x, y)):
                        trou.add((x, y))
        dx, dy = pente
        for (x, y) in trou:
            self.put(x, y, CHEVRON if (x * dy - y * dx) % ecart == 0 else VIDE)
        for (x, y) in list(trou):
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) not in trou and self.plein(nx, ny):
                    r, g, b, a = self.get(nx, ny)
                    self.put(nx, ny, (int(r * bord), int(g * bord), int(b * bord)))
        return trou

    def vitre(self, x0, y0, x1, y1, eclats=2, verre=None):
        """Carreau cassé dans le rectangle : le verre (pixels clairs) devient vide, sauf des
        éclats triangulaires dans deux ou trois angles ; une fissure claire sur ce qui reste."""
        verre = verre or (lambda c: sum(c[:3]) / 3 > 140)
        coins = self.rng.sample([(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)], 3)
        tailles = [self.rng.randint(1, eclats + 1) for _ in coins]
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = self.get(x, y)
                if c[3] < 200 or not verre(c):
                    continue
                garde = any((x - cx) * sx + (y - cy) * sy <= t for (cx, cy, sx, sy), t in zip(coins, tailles))
                if not garde:
                    self.put(x, y, VIDE_VITRE if (x + y) % 5 else (34, 36, 52))

    def planche(self, x0, y0, x1, y1, ombre=True):
        """Planche manquante : fente sombre, bouts irréguliers (une colonne sur deux mord de
        1 ou 2 px de plus)."""
        for x in range(x0, x1 + 1):
            haut = y0 + self.rng.randint(0, 2)
            bas = y1 - self.rng.randint(0, 2)
            for y in range(haut, bas + 1):
                if self.plein(x, y):
                    c = VIDE
                    if ombre and x == x0:
                        c = (40, 24, 22)
                    self.put(x, y, c)

    def planche_h(self, x0, y0, x1, y1):
        """Planche horizontale manquante : bouts gauche et droit irréguliers."""
        for y in range(y0, y1 + 1):
            g = x0 + self.rng.randint(0, 2)
            d = x1 - self.rng.randint(0, 2)
            for x in range(g, d + 1):
                if self.plein(x, y):
                    self.put(x, y, VIDE if y > y0 else (40, 24, 22))

    def clouer(self, xa, ya, xb, yb, epaisseur=2):
        """Planche clouée de (xa, ya) à (xb, yb) : contour sombre, bois, reflet, deux clous."""
        n = max(abs(xb - xa), abs(yb - ya))
        pts = [(round(xa + (xb - xa) * i / n), round(ya + (yb - ya) * i / n)) for i in range(n + 1)]
        for (x, y) in pts:
            for k in range(-1, epaisseur + 1):
                c = BOIS[0] if k in (-1, epaisseur) else (BOIS[3] if k == 0 else BOIS[2])
                self.put(x, y + k, c)
        for (x, y) in (pts[1], pts[-2]):
            self.put(x, y + epaisseur - 1, CLOU)

    def fissure(self, pts, c=(40, 22, 22)):
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            n = max(abs(xb - xa), abs(yb - ya), 1)
            for i in range(n + 1):
                x, y = round(xa + (xb - xa) * i / n), round(ya + (yb - ya) * i / n)
                if self.plein(x, y):
                    self.put(x, y, c)

    def toile(self, x, y, sx, sy, n=4):
        """Toile d'araignée dans un angle (sx, sy = sens vers l'intérieur)."""
        for i in range(n + 1):
            self.put(x + sx * i, y, TOILE, 150)
            self.put(x, y + sy * i, TOILE, 150)
        for i in range(1, n):
            self.put(x + sx * i, y + sy * (n - i), TOILE, 120)
        self.put(x + sx, y + sy, TOILE, 170)

    def herbes(self, x0, x1, ybas, hmax=4, densite=0.55):
        """Touffes d'herbe qui montent depuis la ligne ybas (devant le bas du bâtiment)."""
        for x in range(x0, x1 + 1):
            if self.rng.random() > densite:
                continue
            h = self.rng.randint(1, hmax)
            for k in range(h):
                c = HERBE[min(3, k)] if k < h - 1 else HERBE[self.rng.randint(2, 3)]
                self.put(x, ybas - k, c)

    def mousse(self, x0, y0, x1, y1, densite=0.35, dedans=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.plein(x, y) and (dedans is None or dedans(x, y)) and self.rng.random() < densite:
                    self.put(x, y, self.rng.choice(MOUSSE))

    def deplacer(self, x0, y0, x1, y1, dx, dy, fond=VIDE):
        """Décale un morceau (volet ou porte qui pend) : le trou laissé est sombre."""
        bloc = self.im.crop((x0, y0, x1 + 1, y1 + 1))
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.plein(x, y):
                    self.put(x, y, fond)
        self.im.alpha_composite(bloc, (x0 + dx, y0 + dy))
        self.px = self.im.load()

    def enregistrer(self):
        nom = self.source[:-4] + '_ruine.png'
        self.im.save(os.path.join(ASSETS, nom))
        return nom


# Couleurs : un pixel « de toit » est l'un des oranges des bardeaux (style_v2.TOIT), repéré
# sur l'image d'origine (avant vieillissement).
def orange(c):
    return tuple(c[:3]) in TOITS


def maison():
    """house_sp.png (94×97, la ferme du décor version 2, scripts/batiments/style_v2.py) :
    grand toit orange à deux pentes, pignon de planches dorées avec une fenêtre à volets
    turquoise, auvent orange au-dessus du rez-de-chaussée, annexe à droite, deux fenêtres à
    volets, porte au centre, terrasse de planches grises sur pilotis."""
    m = Ruine('house_sp.png', 11)
    m.vieillir()
    toit = lambda x, y: orange(m.orig.getpixel((x, y))) if 0 <= x < m.W and 0 <= y < m.H else False
    # bardeaux arrachés : en marches, comme les rangées du toit ; chevrons verticaux dedans
    m.trou([(12, 20, 8, 3), (9, 23, 11, 3), (11, 26, 8, 3), (14, 29, 4, 2)], pente=(0, 1), ecart=3, dedans=toit)
    m.trou([(52, 24, 6, 3), (53, 27, 6, 3), (55, 30, 3, 2)], pente=(0, 1), ecart=3, dedans=toit)
    m.trou([(80, 44, 5, 5)], pente=(0, 1), ecart=3, dedans=toit)     # toit de l'annexe
    m.trou([(14, 55, 6, 3)], pente=(1, 0), ecart=3, dedans=toit)     # auvent
    m.trou([(60, 56, 4, 3)], pente=(1, 0), ecart=3, dedans=toit)
    # bardeaux isolés tombés : petites fentes sans charpente visible
    for (x, y) in ((28, 10), (6, 36), (44, 16), (62, 38), (24, 34), (88, 54)):
        m.trou([(x, y, 3, 2)], ecart=99, dedans=toit)
    m.vitre(32, 40, 40, 48)                               # fenêtre du pignon
    m.vitre(63, 66, 73, 76)                               # fenêtre de droite
    m.clouer(61, 68, 75, 73)                              # planche en travers
    m.deplacer(11, 66, 15, 77, 0, 2)                      # un volet de gauche pend
    m.clouer(38, 67, 48, 78)                              # porte condamnée : planches en croix
    m.clouer(38, 77, 48, 68)
    m.planche_h(8, 83, 22, 85)                            # planches manquantes de la terrasse
    m.planche_h(62, 85, 72, 87)
    m.fissure([(20, 42), (22, 45), (21, 48)])
    m.toile(32, 40, 1, 1, 3)
    m.mousse(4, 30, 30, 48, 0.18, dedans=toit)
    m.mousse(4, 56, 70, 62, 0.12, dedans=toit)
    m.herbes(2, 92, 96, hmax=4, densite=0.35)
    return m


def serre():
    """serre_sp.png (96×81, scripts/batiments/style_v2.py) : toit de lattes claires (rangées 19
    à 37), bandeau vitré (40 à 43), vitres des deux ailes et double porte vitrée (46 à 70) dans
    un cadre de bois, soubassement de planches. Lattes du toit arrachées, carreaux brisés,
    porte condamnée, plantes qui envahissent le bas."""
    m = Ruine('serre_sp.png', 41)
    m.vieillir(sat=0.6, lum=0.9, crasse=0.08)
    toit = lambda x, y: 22 <= y <= 37
    m.trou([(10, 24, 6, 4), (8, 28, 9, 4), (11, 32, 4, 3)], pente=(1, 0), ecart=4, dedans=toit)
    m.trou([(70, 22, 5, 4), (68, 26, 8, 4)], pente=(1, 0), ecart=4, dedans=toit)
    for (x, y) in ((40, 25), (55, 30), (86, 33), (26, 34)):
        m.trou([(x, y, 3, 3)], ecart=99, dedans=toit)
    # carreaux brisés : les ailes (vitres entre les montants), le bandeau, la porte
    for r in ((9, 46, 12, 58), (19, 52, 22, 65), (24, 46, 27, 56), (73, 46, 76, 60), (83, 54, 86, 65),
              (88, 46, 90, 53), (14, 40, 22, 43), (70, 40, 78, 43), (41, 46, 46, 58), (58, 50, 63, 62)):
        m.vitre(*r)
    m.clouer(32, 52, 63, 58)                             # la porte condamnée
    m.planche_h(8, 74, 20, 76)                           # planches du soubassement manquantes
    m.planche_h(72, 74, 84, 76)
    verre_sombre = (70, 64, 52)
    m.fissure([(15, 48), (16, 52), (15, 56)], verre_sombre)
    m.fissure([(79, 56), (80, 60), (79, 64)], verre_sombre)
    m.toile(5, 46, 1, 1, 4)
    m.toile(90, 46, -1, 1, 4)
    m.mousse(1, 66, 94, 78, 0.18)
    m.herbes(1, 94, 79, hmax=6, densite=0.5)
    return m


def silo():
    """silo.png (28×62, scripts/batiments/silo.py) : bardeaux arrachés, planches manquantes,
    pierres du collier tombées."""
    m = Ruine('silo.png', 61)
    m.vieillir()
    toit = lambda x, y: y < 18
    m.trou([(8, 8, 5, 2), (6, 10, 7, 3), (8, 13, 4, 2)], pente=(0, 1), ecart=3, dedans=toit)
    for (x, y) in ((17, 6), (20, 12), (12, 4)):
        m.trou([(x, y, 3, 2)], ecart=99, dedans=toit)
    m.planche(10, 24, 11, 44)
    m.planche(19, 30, 20, 46)
    m.trou([(4, 51, 3, 2), (21, 52, 3, 2)], ecart=99)
    m.fissure([(14, 49), (15, 52), (13, 55)])
    m.herbes(1, 26, 61, hmax=3, densite=0.4)
    return m


BATIMENTS = [maison, serre, silo]


def apercu(faits, k=5):
    larg = sum(f.W for f in faits) * 2 * k + 30 * len(faits)
    haut = max(f.H for f in faits) * k
    out = Image.new('RGBA', (larg, haut), (105, 150, 84, 255))
    x = 0
    for f in faits:
        for im in (f.orig, f.im):
            out.alpha_composite(im.resize((f.W * k, f.H * k), Image.NEAREST), (x, 0))
            x += f.W * k + 10
        x += 20
    return out


if __name__ == '__main__':
    faits = [b() for b in BATIMENTS]
    for f in faits:
        print('assets/' + f.enregistrer(), f'{f.W}×{f.H}')
    if '--apercu' in sys.argv:
        apercu(faits).save('apercu_ruines.png')
        print('apercu_ruines.png')
