# La malle de la calèche (js/engine/caleche.js, « la malle » ; la scène : js/carte/ferme/malle.js), au bout du chemin
# de la ferme : on y dépose ce qu'on veut vendre, la calèche y livre les commandes. Vue de haut à 45°, comme les
# blocs (scripts/carte/blocs.py) : une malle peinte en vert sapin sur une palette de bois gris, des ferrures dorées,
# un poteau et son panneau bleu nuit (la tête du cheval, une pièce, des étoiles), une cloche ; de la mousse et deux
# champignons sur la palette.
#   - Les dégradés : chaque matière a une rampe de teintes (le vert : VERTS, 48 ; les autres à proportion) et chaque
#     pixel une lumière (0 à 1) : la face du dessus plus claire vers l'avant, la face avant plus sombre vers le bas,
#     chaque planche sa nuance, le fil du bois, un peu de grain ; la lumière vient d'en haut à gauche. Sa couleur :
#     la teinte de la rampe la plus proche de sa lumière.
#   - Les ferrures comme sur une vraie malle : sur le couvercle, des bandes qui passent sur le dessus et s'arrêtent
#     à son bord (rivetées) ; sur le corps, d'autres, sous la fente entre le couvercle et le corps ; des équerres
#     aux coins, deux charnières derrière, un moraillon qui descend du couvercle sur la serrure.
#   - assets/malle.png : deux cases de 50 × 44 : 0 vide (fermée), 1 pleine (ouverte : le couvercle debout derrière,
#     doublé de rouge, ses charnières ; les produits vus d'en haut). Le bas de la palette sur la rangée 41 ;
#     la palette et le poteau tiennent dans les 48 premières colonnes (trois cases du jeu).
#
#   python3 scripts/carte/malle.py            écrit l'image
#   python3 scripts/carte/malle.py --apercu   écrit aussi apercu_malle.png (agrandi), à la racine du dépôt
import math
import os
import sys

from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets')
K = (36, 30, 20)

def rampe(ancres, n):
    """n teintes le long des ancres (du plus sombre au plus clair), réparties également."""
    out = []
    for i in range(n):
        t = i / (n - 1) * (len(ancres) - 1); k = min(int(t), len(ancres) - 2); u = t - k
        a, b = ancres[k], ancres[k + 1]
        out.append(tuple(round(a[j] + (b[j] - a[j]) * u) for j in range(3)))
    return out

# les rampes : du sombre au clair (les ombres tirent vers le bleu, les lumières vers le jaune)
VERT = [(14, 30, 34), (26, 62, 52), (48, 104, 74), (82, 146, 92), (150, 196, 118), (206, 228, 160)]
OR = [(86, 52, 18), (156, 110, 36), (214, 168, 64), (246, 214, 118), (255, 244, 196)]
ROUGE = [(60, 14, 22), (118, 34, 44), (176, 60, 70), (222, 112, 108)]
GRIS = [(46, 40, 26), (100, 86, 60), (150, 130, 92), (196, 172, 130), (220, 202, 162)]
BRUN = [(42, 28, 16), (86, 60, 36), (126, 92, 56), (170, 132, 84)]
MARINE = [(16, 20, 44), (36, 48, 92), (64, 80, 130)]
CREME = [(150, 132, 100), (214, 196, 160), (244, 232, 204)]
MOUSSE = [(40, 80, 40), (86, 140, 60), (150, 196, 90)]
BOIS_NU = [(96, 72, 44), (150, 120, 80), (196, 164, 116)]   # (le bois sous la peinture, usé)
PROD = [((238, 132, 40), (64, 150, 48)), ((214, 54, 46), (64, 150, 48)), ((150, 196, 64), (96, 140, 40)),
        ((240, 232, 214), (200, 190, 170)), ((236, 196, 88), (190, 150, 50)), ((150, 80, 170), (90, 140, 50)), ((226, 96, 120), (80, 150, 60))]

def bruit(x, y, k=0):
    h = (x * 73856093) ^ (y * 19349663) ^ ((k + 1) * 83492791)
    h = ((h ^ (h >> 13)) * 0x45d9f3b) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 0xffff

class Toile:
    def __init__(self, w, h, n):
        self.w, self.h, self.n = w, h, n
        self.px = {}
        self.rampes = {}
    def rampe(self, nom, ancres, n):
        self.rampes[nom] = rampe(ancres, max(2, n))
    def lum(self, x, y, nom, L):
        """Le pixel (x, y) : la matière `nom`, la lumière L (0..1) → sa teinte dans la rampe."""
        if not (0 <= x < self.w and 0 <= y < self.h): return
        r = self.rampes[nom]; L = max(0.0, min(1.0, L))
        self.px[(x, y)] = r[round(L * (len(r) - 1))]
    def col(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h: self.px[(x, y)] = tuple(c[:3])
    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); p = im.load()
        for (x, y), c in self.px.items(): p[x, y] = c + (255,)
        # le contour de la silhouette
        out = im.copy(); po = out.load()
        for y in range(self.h):
            for x in range(self.w):
                if p[x, y][3]: continue
                if any(0 <= x + dx < self.w and 0 <= y + dy < self.h and p[x + dx, y + dy][3] and p[x + dx, y + dy][:3] != K for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    po[x, y] = K + (255,)
        return out

def malle(n, pleine):
    """La malle (vide : fermée ; pleine : ouverte), le vert en n teintes (les autres rampes à proportion)."""
    T = Toile(50, 44, n)
    q = lambda base: max(2, round(base * n / 6))
    T.rampe('vert', VERT, n); T.rampe('or', OR, q(4)); T.rampe('rouge', ROUGE, q(3)); T.rampe('gris', GRIS, q(4))
    T.rampe('brun', BRUN, q(3)); T.rampe('marine', MARINE, q(2)); T.rampe('creme', CREME, q(2)); T.rampe('mousse', MOUSSE, q(2)); T.rampe('nu', BOIS_NU, q(2))
    x0, x1 = 5, 32
    ytop, yf, ybas = 14, 23, 35      # le dessus (ytop..yf-1), le bord du couvercle (yf..yf+2), la fente (yf+3), le corps (yf+4..ybas)
    lat = lambda x: 0.06 - 0.12 * (x - x0) / (x1 - x0)           # (la lumière vient de la gauche)
    fil = lambda x, y, k: 0.045 * math.sin(x * 0.9 + 2.2 * math.sin(x * 0.23 + k * 1.7)) + 0.03 * (bruit(x, y, k) - 0.5)
    planche_nuance = lambda k: 0.06 * (bruit(k, 7, 3) - 0.5)
    # --- la palette, sous la malle : des lattes grises vues d'en haut, de la mousse
    py0, py1 = 26, 41
    for y in range(py0, py1 + 1):
        for x in range(1, 37):
            r = (y - py0) % 3
            if y >= py1 - 1: L = 0.22 if x in (2, 3, 18, 19, 34, 35) else 0.38
            else: L = (0.78 if r == 0 else 0.62 if r == 1 else 0.36) + planche_nuance((y - py0) // 3) + 0.03 * (bruit(x, y, 9) - 0.5) + lat(x) * 0.5
            T.lum(x, y, 'gris', L)
    for x, y in ((2, 38), (3, 38), (2, 37), (4, 39), (34, 28), (35, 28), (35, 29), (14, 39), (15, 39)):
        T.lum(x, y, 'mousse', 0.4 + 0.5 * bruit(x, y, 4))
    for x in (3, 7):                      # (deux champignons)
        T.col(x, 39, (214, 64, 50)); T.col(x + 1, 39, (232, 92, 70)); T.col(x + 2, 39, (180, 50, 40)); T.col(x + 1, 38, (226, 74, 60)); T.col(x, 39, (250, 240, 230))
        T.col(x + 1, 40, (236, 226, 206))
    # (l'ombre de la malle sur la palette)
    for x in range(x0, x1 + 2): T.lum(x, ybas + 1, 'gris', 0.12)
    # --- le corps : la face avant, des planches horizontales, plus sombre vers le bas
    haut_corps = yf + 4 if not pleine else yf + 2
    for y in range(haut_corps, ybas + 1):
        k = (y - haut_corps) // 3; r = (y - haut_corps) % 3
        for x in range(x0, x1 + 1):
            L = 0.42 - 0.2 * (y - haut_corps) / (ybas - haut_corps) + lat(x) + fil(x, y, k) + planche_nuance(k + 10)
            if r == 0: L += 0.07
            if r == 2: L -= 0.12
            if y == ybas: L = 0.08
            T.lum(x, y, 'vert', L)
    # (le bois nu là où la peinture est usée : aux arêtes des planches)
    for x, y in ((x0 + 2, haut_corps), (x0 + 3, haut_corps), (x1 - 4, haut_corps + 3), (x0 + 12, haut_corps + 6), (x0 + 13, haut_corps + 6), (x1 - 1, ybas - 2)):
        T.lum(x, y, 'nu', 0.3 + 0.5 * bruit(x, y, 2))
    for x, y in ((x0, ybas - 1), (x0 + 1, ybas - 1), (x0, ybas - 2)):   # (de la mousse au pied)
        T.lum(x, y, 'mousse', 0.3 + 0.5 * bruit(x, y, 6))
    if pleine:
        # --- ouverte : le couvercle debout derrière (son dedans, doublé), le haut des parois, les produits
        cy0 = ytop - 10
        for y in range(cy0, ytop):
            for x in range(x0, x1 + 1):
                bord = x in (x0, x0 + 1, x1 - 1, x1) or y in (cy0, cy0 + 1)
                if bord: T.lum(x, y, 'vert', (0.6 if y == cy0 else 0.38) + lat(x) + fil(x, y, 20))
                else: T.lum(x, y, 'rouge', 0.62 - 0.4 * (y - cy0) / (ytop - cy0) + 0.05 * (bruit(x, y, 1) - 0.5) + lat(x) * 0.5)
        # (le bas du couvercle, son épaisseur, posé sur l'arrière du corps)
        for x in range(x0, x1 + 1): T.lum(x, ytop - 1, 'vert', 0.3 + lat(x))
        # le haut des parois : clair (le chant), l'arrière à l'ombre
        for y in range(ytop, yf + 2):
            for x in range(x0, x1 + 1):
                paroi = x in (x0, x0 + 1, x1 - 1, x1) or y in (ytop, ytop + 1) or y in (yf, yf + 1)
                if paroi: T.lum(x, y, 'vert', (0.68 if y in (yf, yf + 1) else 0.52) + lat(x) + fil(x, y, 30))
        # les produits, vus d'en haut
        for y in range(ytop + 2, yf):
            for x in range(x0 + 2, x1 - 1): T.col(x, y, (40, 26, 16) if y > ytop + 2 else (28, 18, 10))
        k = 0
        for rr, y in enumerate(range(ytop + 3, yf - 1, 3)):
            for x in range(x0 + 3 + (rr % 2) * 2, x1 - 3, 4):
                c, f = PROD[(k * 3 + rr) % len(PROD)]; k += 1
                for dx, dy in ((1, 0), (0, 1), (1, 1), (2, 1), (1, 2)): T.col(x + dx, y + dy, c)
                T.col(x, y + 1, tuple(min(255, int(v * 1.2)) for v in c)); T.col(x + 2, y + 1, tuple(int(v * 0.72) for v in c)); T.col(x + 1, y + 2, tuple(int(v * 0.8) for v in c)); T.col(x + 1, y, f)
        # les charnières, entre le couvercle et l'arrière du corps
        for bx in (x0 + 5, x1 - 6):
            for y in range(ytop - 2, ytop + 2):
                for x in (bx - 1, bx, bx + 1, bx + 2): T.lum(x, y, 'or', 0.55 + 0.25 * (x == bx - 1) - 0.1 * (y - ytop + 2) / 4)
            T.lum(bx, ytop, 'or', 0.2); T.lum(bx + 1, ytop, 'or', 0.2)
    else:
        # --- fermée : le dessus du couvercle (des planches dans la longueur, plus claires vers l'avant)
        for y in range(ytop, yf):
            k = (y - ytop) // 3; r = (y - ytop) % 3
            for x in range(x0, x1 + 1):
                L = 0.5 + 0.12 * (y - ytop) / (yf - ytop) + lat(x) + fil(x, y, k + 40) + planche_nuance(k + 40)
                if r == 0: L += 0.05
                if r == 2 and y < yf - 1: L -= 0.14
                T.lum(x, y, 'vert', L)
        # le bord du couvercle : l'arête claire, son chant, la fente sombre
        for x in range(x0 - 1, x1 + 2):
            T.lum(x, yf, 'vert', 0.72 + lat(x)); T.lum(x, yf + 1, 'vert', 0.44 + lat(x) + fil(x, yf + 1, 50)); T.lum(x, yf + 2, 'vert', 0.36 + lat(x))
            T.lum(x, yf + 3, 'vert', 0.04)
        for x, y in ((x0 + 6, yf), (x0 + 15, yf), (x1 - 3, ytop + 3), (x0 + 1, ytop + 6)):
            T.lum(x, y, 'nu', 0.4 + 0.4 * bruit(x, y, 8))
        # les bandes du couvercle : sur le dessus, jusqu'à son bord (rivets), qui s'arrêtent avant la fente
        for bx in (x0 + 5, x1 - 6):
            for y in range(ytop, yf + 3):
                for x in (bx, bx + 1):
                    L = (0.86 if x == bx else 0.62) - 0.15 * (y - ytop) / (yf + 3 - ytop) + (0.12 if y == yf else 0)
                    T.lum(x, y, 'or', L)
            for y in (ytop + 1, yf - 2, yf + 1): T.lum(bx, y, 'or', 1.0); T.lum(bx + 1, y, 'or', 0.3)
        # les équerres aux coins du couvercle
        for x, y in ((x0, ytop), (x0 + 1, ytop), (x0, ytop + 1), (x1, ytop), (x1 - 1, ytop), (x1, ytop + 1), (x0 - 1, yf), (x0 - 1, yf + 1), (x0, yf + 2), (x1 + 1, yf), (x1 + 1, yf + 1), (x1, yf + 2)):
            T.lum(x, y, 'or', 0.7)
        # le moraillon : il descend du bord du couvercle sur la serrure
        xm = (x0 + x1) // 2
        for y in range(yf, yf + 5):
            for x in (xm - 1, xm):
                T.lum(x, y, 'or', 0.9 - 0.12 * (y - yf) - (0.2 if x == xm else 0))
    # les bandes du corps : sous la fente (ou sous le bord des parois, ouverte), jusqu'au bas ; rivets ; équerres
    for bx in (x0 + 5, x1 - 6):
        for y in range(haut_corps, ybas + 1):
            for x in (bx, bx + 1):
                T.lum(x, y, 'or', (0.72 if x == bx else 0.48) - 0.3 * (y - haut_corps) / (ybas - haut_corps))
        for y in (haut_corps + 1, ybas - 2): T.lum(bx, y, 'or', 1.0); T.lum(bx + 1, y, 'or', 0.25)
    for x, y in ((x0, ybas), (x0 + 1, ybas), (x0, ybas - 1), (x0, ybas - 2), (x1, ybas), (x1 - 1, ybas), (x1, ybas - 1), (x1, ybas - 2)):
        T.lum(x, y, 'or', 0.45)
    # la serrure (sous le moraillon, ou seule quand elle est ouverte)
    xm = (x0 + x1) // 2
    sy = haut_corps + (2 if not pleine else 1)
    for y in range(sy, sy + 5):
        for x in range(xm - 2, xm + 2):
            T.lum(x, y, 'or', 0.78 - 0.08 * (y - sy) - 0.15 * (x - xm + 2) / 3)
    T.col(xm - 1, sy + 2, K); T.col(xm, sy + 2, K); T.col(xm - 1, sy + 3, K)
    # les poignées sur les côtés
    for y in range(yf + 6, yf + 9): T.lum(x0 - 1, y, 'or', 0.5); T.lum(x1 + 1, y, 'or', 0.3)
    # --- le poteau, le panneau bleu nuit étoilé, la cloche
    for y in range(11, 41):
        T.lum(41, y, 'brun', 0.75 - 0.3 * (y - 11) / 30 + 0.05 * (bruit(41, y, 3) - 0.5)); T.lum(42, y, 'brun', 0.4 - 0.2 * (y - 11) / 30)
    for y in range(1, 11):
        for x in range(36, 48):
            L = 0.75 - 0.5 * (y - 1) / 10 + 0.15 * (1 - (x - 36) / 11) * 0.5
            if y == 1: L = 1.0
            if y == 10: L = 0.0
            T.lum(x, y, 'marine', L)
    # la tête du cheval (crème) et la pièce (or), des étoiles
    for x, y in ((38, 4), (38, 5), (38, 6), (38, 7), (39, 3), (39, 4), (39, 5), (39, 6), (39, 7), (40, 3), (40, 4)):
        T.lum(x, y, 'creme', 0.5 + 0.5 * (y < 5))
    T.col(38, 4, (60, 40, 30))
    for x in range(43, 46):
        for y in range(4, 8): T.lum(x, y, 'or', 0.95 - 0.13 * (y - 4) - 0.1 * (x - 43))
    for x, y in ((42, 2), (46, 2), (37, 9), (46, 9)): T.col(x, y, (255, 240, 170))
    for x in range(38, 41):
        for y in range(15, 18): T.lum(x, y, 'or', 0.95 - 0.2 * (y - 15) - 0.12 * (x - 38))
    T.lum(39, 18, 'or', 0.3); T.lum(39, 14, 'brun', 0.3); T.lum(40, 14, 'brun', 0.3)
    return T.image()


VERTS = 48
W, H = 50, 44


def planche():
    out = Image.new('RGBA', (2 * W, H), (0, 0, 0, 0))
    for k, pleine in enumerate((False, True)):
        out.alpha_composite(malle(VERTS, pleine), (k * W, 0))
    return out


def main():
    im = planche()
    im.save(os.path.join(ASSETS, 'malle.png'))
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', im.size, (112, 164, 84, 255))
        fond.alpha_composite(im)
        fond.resize((im.width * 6, im.height * 6), Image.NEAREST).save(os.path.join(ASSETS, '..', 'apercu_malle.png'))


if __name__ == '__main__':
    main()
