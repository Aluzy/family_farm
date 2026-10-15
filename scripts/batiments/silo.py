# assets/silo.png : le Silo de la carte, 28×62, dessiné à la main d'après l'image de référence : toit en dôme de bardeaux au
# bord bombé, aux couleurs de la serre comme les autres bâtiments (PALETTE_SERRE de scripts/batiments/style_v2.py), fût de planches verticales,
# collier de pierres claires en bas. Lumière à gauche. Puis python3 scripts/batiments/ruines.py (silo_ruine.png).
from PIL import Image
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style_v2 import PALETTE_SERRE as PS  # noqa: E402
TOIT = PS['toit']
W, H = 28, 62
C = {
 'out': tuple(round(c * 0.7) for c in TOIT[0]),
 'rj': TOIT[0], 'rd': TOIT[2], 'rm': TOIT[3], 'rl': TOIT[4], 'rh': TOIT[5],
 'wo': PS['cadre'][0], 'ws': PS['bois'][0], 'wd': PS['bois'][1], 'wm': PS['bois'][2], 'wl': PS['bois'][3], 'wh': PS['bois'][4],
 'so': PS['pierre'][0], 'sj': PS['pierre'][2], 'sd': PS['pierre'][3], 'sm': PS['pierre'][4], 'sl': (225, 217, 202),
}
im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
px = im.load()
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = C[c] + (255,)
cx = (W - 1) / 2
def ell(x, r, e):
    d = (x - cx) / r
    return e * math.sqrt(max(0.0, 1 - d * d))
# fût
TOP, BOT = 18, 55
for x in range(1, 27):
    t = (x - 1) / 25
    for y in range(TOP, int(round(BOT + ell(x, 13, 3))) + 1):
        if x in (1, 26): put(x, y, 'wo'); continue
        if (x - 1) % 4 == 0: put(x, y, 'ws'); continue      # joint entre deux planches
        if t < 0.12: c = 'wd'
        elif t < 0.3: c = 'wm'
        elif t < 0.55: c = 'wh' if (x - 1) % 4 == 1 else 'wl'
        elif t < 0.78: c = 'wm'
        else: c = 'wd'
        put(x, y, c)
# collier de pierres : bande bombée de 5 px de haut
for x in range(0, 28):
    top = round(48 + ell(x, 14, 4.2))
    bot = round(54 + ell(x, 14, 5.2))
    for y in range(top, bot + 1):
        if y == bot or y == top or x in (0, 27): put(x, y, 'so'); continue
        row = y - top
        bloc = (x + (2 if row >= 3 else 0)) % 5 == 0
        if bloc: c = 'sj'
        elif row == 1: c = 'sl' if x < 20 else 'sm'
        elif row >= bot - top - 1: c = 'sd'
        else: c = 'sm' if x < 22 else 'sd'
        put(x, y, c)
# toit : dôme (moitié cône, moitié quart de cercle : arrondi au sommet comme aux épaules), bord
# inférieur bombé (débord d'un pixel de chaque côté)
RR = 14.0
DOME = 0.6           # part du quart de cercle dans le profil (0 : cône, 1 : demi-cercle)
for x in range(0, 28):
    d = abs(x - cx) / RR
    if d > 1: continue
    ytop = round(13 * ((1 - DOME) * d ** 1.05 + DOME * (1 - math.sqrt(max(0.0, 1 - d * d)))))
    ybot = round(16 + ell(x, RR, 4.6))
    for y in range(ytop, ybot + 1):
        if y == ytop or y == ybot or x in (0, 27): put(x, y, 'out'); continue
        # rangées de bardeaux qui suivent la courbe du bord
        v = y - ell(x, RR, 4.6)
        r = math.floor(v / 3.2)
        joint_h = (v / 3.2) - r < 0.3
        joint_v = ((x + (r % 2) * 2) % 4 == 0)
        side = (x - cx) / RR
        base = 'rh' if side < -0.5 else 'rl' if side < -0.1 else 'rm' if side < 0.4 else 'rd'
        if x == round(cx) and y < ybot - 1: base = 'rm' if base == 'rl' else base  # arête
        c = 'rj' if (joint_h or joint_v) else base
        put(x, y, c)
    # ombre portée du toit sur le fût
    yb = round(16 + ell(x, RR, 4.6))
    if 1 <= x <= 26: put(x, yb + 1, 'ws')
# Usage : python3 scripts/batiments/silo.py [assets/silo.png] [aperçu agrandi ×10]
out = sys.argv[1] if len(sys.argv) > 1 else 'assets/silo.png'
im.save(out)
if len(sys.argv) > 2:
    big = im.resize((W * 10, H * 10), Image.NEAREST)
    bg = Image.new('RGBA', big.size, (40, 52, 44, 255)); bg.alpha_composite(big); bg.save(sys.argv[2])
