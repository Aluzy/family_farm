# La calèche du grand monde (fiche 7c : js/engine/caleche.js ; la scène : js/carte/ferme/caleche.js),
# dessinée ici en entier, dans le style du cheval (scripts/personnage/cheval.py, dont elle reprend le
# cheval bai : de profil, de face, de dos, ses quatre temps du pas) et des blocs (le bois, la toile,
# le fer de scripts/carte/blocs.py) :
#   - assets/caleche.png (cases de 96 × 64, les roues et les sabots sur la rangée 60, le milieu de
#     l'attelage au milieu de la case) : une voiture couverte (une caisse de planches sur deux essieux,
#     une bâche de toile tendue sur des arceaux, les roues cerclées de fer et leurs rayons), son
#     cocher sur le banc (un chapeau, une veste verte, les rênes), une lanterne accrochée à l'avant,
#     le cheval attelé par deux brancards. Trois vues : 'cote' (de profil, vers la droite : la scène la
#     retourne pour la gauche), 'bas' (elle vient vers nous : le cheval devant, la voiture derrière),
#     'haut' (elle s'en va : la voiture devant, le cheval au-delà). Par vue, cinq cases : les quatre
#     temps du pas, les roues tournées d'un huitième de tour à chaque temps (k = 0..3), puis 4 : à
#     l'arrêt. Deux rangées : le jour (la lanterne éteinte), la nuit (allumée). La case de la vue v,
#     du temps k, de la rangée r : r × 15 + v × 5 + k (v : cote 0, bas 1, haut 2).
#   - LANTERNE : où est la flamme de la lanterne dans chaque vue (px de la case, de profil vers la
#     droite) : la scène y pose la lueur de la nuit (js/carte/ferme/caleche.js, CALECHE.lanterne).
# Lumière en haut à gauche, contour sombre.
#
#   python3 scripts/carte/caleche.py            écrit l'image
#   python3 scripts/carte/caleche.py --apercu   écrit aussi apercu_caleche.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'personnage'))  # cheval.py
from pixel import ASSETS, apercu, contour  # noqa: E402
from blocs import BOIS, FER, TOILE  # noqa: E402
import cheval  # noqa: E402

W, H = 96, 64
SOL = 60                               # la rangée des roues et des sabots
OUT = (40, 26, 18)
ROUGE = [(86, 30, 26), (132, 48, 38), (170, 70, 52)]         # la caisse peinte
VESTE = [(30, 58, 40), (48, 88, 56), (70, 118, 72)]          # le cocher
PEAU = [(168, 112, 82), (212, 156, 118), (236, 190, 150)]
CHAPEAU = [(44, 32, 24), (72, 52, 36), (98, 74, 52)]
VERRE = {'jour': [(88, 70, 40), (126, 102, 58)], 'nuit': [(236, 168, 64), (255, 236, 150)]}
LANTERNE = {'cote': (55, 27), 'bas': (68, 20), 'haut': (25, 31)}
VUES = ['cote', 'bas', 'haut']


class Toile:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and c is not None:
            self.px[x, y] = tuple(c[:3]) + (255,)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def colle(self, im, x, y):
        self.im.alpha_composite(im, (x, y))


def roue(t, cx, cy, r, phase, face=False):
    """Une roue de rayon r, cerclée de fer, son moyeu et ses rayons (tournés de phase × 22,5°) ; de
    face (vue de devant ou de derrière) : une roue vue sur la tranche, un ovale étroit."""
    if face:
        for y in range(cy - r, cy + r + 1):
            for x in (cx - 1, cx, cx + 1):
                t.put(x, y, FER[1] if x == cx - 1 else BOIS[1])
        t.put(cx, cy, FER[3])
        for k in range(3):                                   # les rayons qui défilent
            y = cy - r + 1 + ((phase * 2 + k * 5) % (2 * r - 1))
            t.put(cx, y, BOIS[3])
        return
    for a in range(0, 360, 4):
        x, y = cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))
        t.put(x, y, FER[1] if 200 < a < 340 else FER[0])
        x, y = cx + (r - 1) * math.cos(math.radians(a)), cy + (r - 1) * math.sin(math.radians(a))
        t.put(x, y, BOIS[1])
    for k in range(4):
        ang = math.radians(phase * 22.5 + k * 45)
        for s in range(1, r - 1):
            t.put(cx + s * math.cos(ang), cy + s * math.sin(ang), BOIS[3] if k % 2 else BOIS[2])
            t.put(cx - s * math.cos(ang), cy - s * math.sin(ang), BOIS[3] if k % 2 else BOIS[2])
    t.rect(cx - 1, cy - 1, cx + 1, cy + 1, FER[2])
    t.put(cx - 1, cy - 1, FER[3])


def bache(t, x0, x1, y0, y1, ouverte=False):
    """La bâche : une voûte de toile de x0 à x1, du haut y0 au bord y1, ses arceaux, son ombre ;
    ouverte : vue de derrière, l'intérieur sombre au milieu."""
    w = x1 - x0
    for x in range(x0, x1 + 1):
        u = (x - x0) / max(1, w)
        top = y0 + round((1 - math.sin(math.pi * u) ** 0.6) * (y1 - y0) * 0.55)
        for y in range(top, y1 + 1):
            c = TOILE[4] if y - top < 2 else TOILE[3] if u < 0.55 else TOILE[2]
            if y >= y1 - 1:
                c = TOILE[1]
            t.put(x, y, c)
        t.put(x, top, TOILE[4])
    if ouverte:
        cx, cy = (x0 + x1) // 2, y1 - 2
        for y in range(y0 + 6, y1):
            half = round((w * 0.3) * math.sqrt(max(0, 1 - ((cy - y) / max(1, (y1 - y0 - 6))) ** 2)))
            for x in range(cx - half, cx + half + 1):
                t.put(x, y, (52, 40, 30) if y > y0 + 8 else TOILE[0])
    return


def arceaux(t, xs, y0, y1):
    for x in xs:
        for y in range(y0, y1):
            if t.px[x, y][3]:
                t.put(x, y, TOILE[0] if y > y0 + 1 else TOILE[1])


def lanterne(t, x, y, nuit):
    """Une lanterne de fer et de verre ; sa flamme en (x, y)."""
    v = VERRE['nuit' if nuit else 'jour']
    t.put(x, y - 3, FER[1]); t.rect(x - 1, y - 2, x + 1, y - 2, FER[0])
    t.rect(x - 1, y - 1, x + 1, y + 1, v[0]); t.put(x, y, v[1])
    if nuit:
        t.put(x, y - 1, v[1])
    t.rect(x - 1, y + 2, x + 1, y + 2, FER[0])


def cocher(t, x, y, vue):
    """Le cocher assis (x : son milieu, y : le haut de son chapeau)."""
    if vue == 'haut':                                        # de dos : son chapeau dépasse
        t.rect(x - 3, y + 1, x + 3, y + 1, CHAPEAU[0]); t.rect(x - 2, y - 1, x + 2, y, CHAPEAU[1])
        return
    t.rect(x - 3, y + 2, x + 3, y + 2, CHAPEAU[0])           # le bord du chapeau
    t.rect(x - 2, y, x + 2, y + 1, CHAPEAU[1]); t.put(x - 1, y, CHAPEAU[2])
    t.rect(x - 2, y + 3, x + 2, y + 6, PEAU[1]); t.put(x - 2, y + 3, PEAU[2])
    if vue == 'bas':
        t.put(x - 1, y + 4, OUT); t.put(x + 1, y + 4, OUT)
    else:
        t.put(x + 1, y + 4, OUT); t.put(x + 2, y + 5, PEAU[0])
    t.rect(x - 3, y + 7, x + 3, y + 12, VESTE[1]); t.rect(x - 3, y + 7, x - 2, y + 12, VESTE[2])
    t.rect(x + 2, y + 8, x + 3, y + 12, VESTE[0])
    if vue == 'cote':
        t.rect(x + 3, y + 10, x + 5, y + 10, VESTE[1]); t.put(x + 6, y + 10, PEAU[1])   # le bras, les rênes
    else:
        t.put(x - 4, y + 11, PEAU[1]); t.put(x + 4, y + 11, PEAU[1])


def ombre(im, cx, w, h):
    """Une ombre douce, sous l'attelage (sans contour)."""
    o = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    p = o.load()
    for y in range(SOL - h, SOL + 3):
        for x in range(cx - w, cx + w + 1):
            if ((x - cx) / w) ** 2 + ((y - (SOL + 0.5)) / (h + 0.5)) ** 2 <= 1 and 0 <= x < W and 0 <= y < H:
                p[x, y] = (20, 24, 16, 70)
    o.alpha_composite(im)
    return o


def de_profil(k, nuit):
    """De profil, vers la droite : la voiture à gauche, le cheval à droite."""
    t = Toile()
    marche = k < 4
    rp = k if marche else 0
    t.rect(6, 38, 50, 47, ROUGE[1]); t.rect(6, 38, 50, 39, ROUGE[2]); t.rect(6, 46, 50, 47, ROUGE[0])
    for x in range(10, 50, 8):
        t.rect(x, 40, x, 45, ROUGE[0])
    t.rect(4, 47, 52, 48, BOIS[1])                            # le plancher
    bache(t, 7, 43, 14, 38)
    arceaux(t, [12, 22, 32, 41], 14, 38)
    t.rect(43, 33, 53, 35, BOIS[2]); t.rect(43, 33, 53, 33, BOIS[3])   # le banc du cocher
    t.rect(51, 35, 52, 44, BOIS[1])
    cocher(t, 47, 20, 'cote')
    lanterne(t, *LANTERNE['cote'], nuit)
    roue(t, 18, SOL - 8, 8, rp)                               # la grande roue arrière
    roue(t, 45, SOL - 6, 6, rp)                               # la petite roue avant
    for i in range(34):                                       # le brancard, jusqu'au poitrail du cheval
        t.put(50 + i, 44 - i * 6 // 34, BOIS[2]); t.put(50 + i, 45 - i * 6 // 34, BOIS[1])
    for i in range(34):                                       # les rênes, de ses mains au mors
        t.put(53 + i, 30 - (i * 6) // 34 + (2 if 6 < i < 24 else 0), (70, 40, 30))
    h = cheval.profil('marche' if marche else 'idle', k % 4, selle=True)
    h.px = {p: c for p, c in h.px.items() if c not in ('B',)}  # (pas de tapis de selle : un harnais)
    hi = h.image()
    t.colle(hi, 50, SOL - 38)
    for x in range(68, 82):                                   # la sangle du harnais
        t.put(x, SOL - 38 + 17, (70, 40, 30))
    return contour(t.im, OUT)


def de_face(k, nuit):
    """De face : elle vient vers nous, le cheval devant (en bas), la voiture derrière."""
    t = Toile()
    marche = k < 4
    t.rect(24, 22, 72, 40, ROUGE[1]); t.rect(24, 22, 72, 23, ROUGE[2]); t.rect(24, 39, 72, 40, ROUGE[0])
    bache(t, 26, 70, 2, 24)
    arceaux(t, [36, 48, 60], 2, 24)
    t.rect(40, 24, 56, 26, BOIS[2])                           # le banc
    cocher(t, 48, 11, 'bas')
    lanterne(t, *LANTERNE['bas'], nuit)
    roue(t, 22, 44, 9, k if marche else 0, face=True)
    roue(t, 74, 44, 9, k if marche else 0, face=True)
    for y in range(40, 52):                                   # les brancards
        t.put(33, y, BOIS[2]); t.put(63, y, BOIS[2])
    hi = cheval.face(k if marche else 4, 'tout', selle=False).image()
    t.colle(hi, 24, SOL - 38)
    return contour(t.im, OUT)


def de_dos(k, nuit):
    """De dos : elle s'en va, la voiture devant (en bas), le cheval au-delà (en haut)."""
    t = Toile()
    marche = k < 4
    hi = cheval.dos(k if marche else 4, 'tout', selle=False).image()
    t.colle(hi, 24, 2)
    cocher(t, 48, 16, 'haut')
    bache(t, 26, 70, 17, 44, ouverte=True)
    arceaux(t, [27, 69], 17, 44)
    t.rect(24, 44, 72, 54, ROUGE[1]); t.rect(24, 44, 72, 45, ROUGE[2]); t.rect(24, 53, 72, 54, ROUGE[0])
    t.rect(30, 47, 66, 47, ROUGE[0])
    lanterne(t, *LANTERNE['haut'], nuit)
    roue(t, 22, 51, 9, k if marche else 0, face=True)
    roue(t, 74, 51, 9, k if marche else 0, face=True)
    return contour(t.im, OUT)


def planche():
    out = Image.new('RGBA', (W * 15, H * 2), (0, 0, 0, 0))
    for r, nuit in enumerate((False, True)):
        for v, f in enumerate((de_profil, de_face, de_dos)):
            for k in range(5):
                im = f(k, nuit)
                im = ombre(im, 48 if v else 32, 40 if v == 0 else 30, 3)
                out.alpha_composite(im, ((v * 5 + k) * W, r * H))
    return out


def main():
    im = planche()
    im.save(os.path.join(ASSETS, 'caleche.png'))
    if '--apercu' in sys.argv:
        apercu(im, 'apercu_caleche.png', zoom=3, fond=(112, 164, 84))


if __name__ == '__main__':
    main()
