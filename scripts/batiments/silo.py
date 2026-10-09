# assets/silo.png : le Silo de la carte, 28×62, dessiné à la main d'après l'image de référence : toit conique de bardeaux prune au
# bord bombé, fût de planches verticales, collier de pierres claires en bas. Lumière à gauche.
from PIL import Image
import math, sys
W, H = 28, 62
C = {
 'out': (40, 18, 24), 'rj': (58, 30, 44), 'rd': (76, 42, 58), 'rm': (94, 54, 74), 'rl': (110, 66, 88), 'rh': (124, 80, 100),
 'wo': (48, 22, 18), 'ws': (82, 40, 26), 'wd': (128, 72, 42), 'wm': (156, 94, 58), 'wl': (176, 114, 72), 'wh': (190, 128, 84),
 'so': (92, 64, 48), 'sj': (178, 160, 128), 'sd': (200, 186, 152), 'sm': (222, 210, 180), 'sl': (240, 232, 208),
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
# toit : cône aux épaules arrondies, bord inférieur bombé (débord d'un pixel de chaque côté)
RR = 14.0
for x in range(0, 28):
    d = abs(x - cx) / RR
    if d > 1: continue
    ytop = round(13 * d ** 1.05)
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
