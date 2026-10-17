# Tuiles d'eau animées : un fond peu profond (on y voit des cailloux, des rochers, des herbes),
# un fond profond (sombre), les raccords en dégradé entre les deux, et l'écume qui bouge.
#
#   python3 scripts/carte/eau.py            écrit assets/eau.png et assets/eau.tsx
#   python3 scripts/carte/eau.py --apercu   écrit aussi apercu_eau.gif (une mare animée, avec
#                                           les bordures de assets/bordure_eau.png)
#
# La planche : 16 tuiles par rangée, IMAGES images d'animation l'une sous l'autre ; chaque image
# fait deux rangées :
#   rangée 0   le fond peu profond (8 variantes : nu, cailloux, rocher, herbes…), puis le fond
#              profond (8 variantes : nu, remous sombres) ;
#   rangée 1   les raccords peu profond / profond, une tuile par combinaison de coins (« coins de
#              Wang ») : la tuile n a du profond au coin haut-gauche si n & 8, haut-droit si n & 4,
#              bas-gauche si n & 2, bas-droit si n & 1 ; un dégradé tramé en quatre tons.
# L'image k de la tuile t est la tuile t + k × 32 ; assets/eau.tsx déclare ces animations (Tiled
# et Phaser les jouent) et un jeu de coins « peu profond / profond ».
# Raccords : le fond ne déborde jamais d'une tuile (détails posés à l'intérieur) et le dégradé
# ne dépend, le long d'un côté, que de ses deux coins ; l'écume est un motif qui se répète tous
# les 16 pixels, le même sur toutes les tuiles : elle passe d'une tuile à l'autre sans couture.
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, T, melange, wangid  # noqa: E402
SORTIE = os.path.join(ASSETS, 'eau')
COLS = 16
IMAGES = 8                    # images de l'animation
DUREE = 160                   # ms par image
DERIVE = T // IMAGES          # pixels de dérive de l'écume par image (un tour complet en 8 images)

# Les tons, du peu profond au profond (le dégradé passe par les deux du milieu).
TONS = [(76, 172, 214), (60, 146, 200), (46, 120, 184), (34, 96, 170)]
GRAIN = {0: [(68, 162, 208), (86, 182, 220)], 3: [(28, 86, 158), (40, 104, 178)]}
REMOUS = (24, 74, 142)
ECUME = (255, 255, 255)


# ---------------------------------------------------------------- les fonds (fixes)

def fond(ton, graine):
    """Un fond uni d'un ton, avec un grain léger (tirage fixe)."""
    rng = random.Random(graine)
    tuile = Image.new('RGBA', (T, T), TONS[ton] + (255,))
    grains = GRAIN.get(ton, [melange(TONS[ton], TONS[0], 0.25), melange(TONS[ton], TONS[3], 0.25)])
    for y in range(T):
        for x in range(T):
            if rng.random() < 0.10:
                tuile.putpixel((x, y), rng.choice(grains) + (255,))
    return tuile


def sous_l_eau(tuile, x, y, c, force=0.5):
    """Un pixel du fond vu à travers l'eau : sa couleur mêlée à celle de l'eau au-dessus."""
    if 0 <= x < T and 0 <= y < T:
        eau = tuile.getpixel((x, y))[:3]
        tuile.putpixel((x, y), melange(eau, c, force) + (255,))


def caillou(tuile, x, y, rng):
    gris = rng.choice([(150, 150, 140), (170, 160, 130), (130, 135, 140)])
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        sous_l_eau(tuile, x + dx, y + dy, gris, 0.45)
    sous_l_eau(tuile, x, y, (230, 230, 220), 0.4)                 # reflet
    sous_l_eau(tuile, x + 1, y + 2, (20, 60, 90), 0.35)           # ombre


def rocher(tuile, cx, cy, r):
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.3)
            if d <= r:
                lum = 0.55 if (x - cx) + (y - cy) < -r * 0.5 else 0.42 if (x - cx) + (y - cy) < r * 0.4 else 0.32
                sous_l_eau(tuile, x, y, (150, 150, 140), lum)
            elif d <= r + 1 and y > cy:
                sous_l_eau(tuile, x, y, (20, 60, 90), 0.3)         # ombre sous le rocher


def herbes(tuile, x0, y0, rng):
    for k in range(rng.randint(3, 4)):
        x = x0 + k * 2 - 2 + rng.randint(0, 1)
        h = rng.randint(4, 7)
        for t in range(h):
            xx = x + (1 if t > h // 2 and k % 2 else 0) - (1 if t > h // 2 and not k % 2 else 0)
            sous_l_eau(tuile, xx, y0 - t, (60, 150, 80) if t < h - 1 else (110, 190, 100), 0.38)


def peu_profond(n):
    """Variante n du fond peu profond : nue, cailloux, rocher, herbes, ou un peu de tout."""
    rng = random.Random(100 + n)
    tuile = fond(0, 200 + n)
    if n in (1, 5, 7):
        for _ in range(rng.randint(2, 4)):
            caillou(tuile, rng.randint(1, T - 4), rng.randint(1, T - 5), rng)
    if n in (2, 6):
        rocher(tuile, rng.uniform(6, 10), rng.uniform(6, 9), rng.uniform(2.6, 3.6))
    if n in (3, 6, 7):
        herbes(tuile, rng.randint(4, 11), rng.randint(10, 13), rng)
    if n == 4:
        herbes(tuile, 4, 12, rng)
        herbes(tuile, 11, 9, rng)
    return tuile


def profond(n):
    """Variante n du fond profond : nue, ou des remous plus sombres (le fond qui se dérobe)."""
    rng = random.Random(300 + n)
    tuile = fond(3, 400 + n)
    if n % 2:
        cx, cy, r = rng.uniform(5, 11), rng.uniform(5, 11), rng.uniform(3, 4.5)
        for y in range(1, T - 1):
            for x in range(1, T - 1):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
                if d < 1 and BAYER[y % 4][x % 4] / 16 < 1 - d:
                    tuile.putpixel((x, y), REMOUS + (255,))
    return tuile


def champ(x, y, coins):
    tl, tr, bl, br = coins
    u, v = (x + 0.5) / T, (y + 0.5) / T
    s = lambda t: t * t * (3 - 2 * t)
    su, sv = s(u), s(v)
    return tl * (1 - su) * (1 - sv) + tr * su * (1 - sv) + bl * (1 - su) * sv + br * su * sv


def raccord(n):
    """Raccord n entre peu profond (0) et profond (1) : un dégradé tramé en quatre tons."""
    coins = [(n >> k) & 1 for k in (3, 2, 1, 0)]
    clair, sombre = fond(0, 500 + n), fond(3, 600 + n)
    tuile = Image.new('RGBA', (T, T))
    for y in range(T):
        for x in range(T):
            f = champ(x, y, coins) * 3 + (BAYER[y % 4][x % 4] / 16 - 0.47)
            k = max(0, min(3, int(round(f))))
            c = clair.getpixel((x, y)) if k == 0 else sombre.getpixel((x, y)) if k == 3 else TONS[k] + (255,)
            tuile.putpixel((x, y), c)
    return tuile


# ---------------------------------------------------------------- l'écume (animée)

# Chaque tuile a ses rides (graine propre) : une ride naît, s'allonge, glisse d'un pixel, puis
# s'efface, chacune à son rythme sur les IMAGES images. Elles restent dans la tuile (aucune ne
# passe un bord) : pas de motif qui se répète d'une tuile à l'autre, pas de couture.
VIE = [0, 1, 2, 3, 3, 2, 1, 0]           # longueur relative de la ride au fil des images


def rides(graine, nombre=4):
    rng = random.Random(graine)
    out = []
    for _ in range(nombre):
        n = rng.randint(2, 4)
        out.append((rng.randint(1, T - n - 3), rng.randint(1, T - 2), n, rng.randrange(IMAGES), rng.choice((-1, 1))))
    return out


def ecume(graine, k):
    """L'écume de l'image k pour la tuile de graine donnée : {(x, y): force}."""
    out = {}
    for (x, y, n, phase, sens) in rides(graine):
        age = (k + phase) % IMAGES
        long = round(n * VIE[age] / 3)
        dx = (1 if age >= 4 else 0) * sens
        for i in range(long):
            crete = i == long - 1 and VIE[age] == 3
            out[(x + dx + i, y)] = 1.0 if crete else 0.32
    # un scintillement, une image sur quatre
    rng = random.Random(graine + 1)
    sx, sy, sp = rng.randint(1, T - 2), rng.randint(1, T - 2), rng.randrange(4)
    if k % 4 == sp:
        out[(sx, sy)] = 0.7
    return out


def anime(tuile, k, graine):
    out = tuile.copy()
    for (x, y), force in ecume(graine, k).items():
        c = out.getpixel((x, y))[:3]
        out.putpixel((x, y), (melange(c, ECUME, 0.85) if force >= 1 else melange(c, ECUME, force)) + (255,))
    return out


# ---------------------------------------------------------------- planche, Tiled, aperçu

def tuiles_fixes():
    return [peu_profond(n) for n in range(8)] + [profond(n) for n in range(8)] + [raccord(n) for n in range(16)]


def planche():
    fixes = tuiles_fixes()
    par_image = len(fixes)
    out = Image.new('RGBA', (COLS * T, IMAGES * (par_image // COLS) * T))
    for k in range(IMAGES):
        for i, t in enumerate(fixes):
            j = k * par_image + i
            out.paste(anime(t, k, 900 + i * 7), ((j % COLS) * T, (j // COLS) * T))
    return out, par_image


def tsx(img, par_image):
    lignes = []
    for i in range(par_image):
        frames = ''.join(f'<frame tileid="{i + k * par_image}" duration="{DUREE}"/>' for k in range(IMAGES))
        # le fond nu (peu profond 0, profond 0 et 2) plus souvent que les variantes à détails
        proba = '' if i in (0, 8, 10) or i >= 16 else ' probability="0.2"'
        lignes.append(f'  <tile id="{i}"{proba}><animation>{frames}</animation></tile>')
    wang = []
    for i in range(8):
        wang.append(f'   <wangtile tileid="{i}" wangid="0,1,0,1,0,1,0,1"/>')
        wang.append(f'   <wangtile tileid="{8 + i}" wangid="0,2,0,2,0,2,0,2"/>')
    for n in range(1, 15):
        wang.append(f'   <wangtile tileid="{16 + n}" wangid="{wangid(n)}"/>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="eau" tilewidth="{T}" tileheight="{T}" tilecount="{(img.width // T) * (img.height // T)}" columns="{img.width // T}">
 <image source="eau.png" width="{img.width}" height="{img.height}"/>
{chr(10).join(lignes)}
 <wangsets>
  <wangset name="fond de l'eau" type="corner" tile="-1">
   <wangcolor name="peu profond" color="#4cacd6" tile="0" probability="1"/>
   <wangcolor name="profond" color="#2260aa" tile="8" probability="1"/>
{chr(10).join(wang)}
  </wangset>
 </wangsets>
</tileset>
'''


def apercu(img, par_image):
    """Une mare animée : le fond (profond au milieu, peu profond près des rives) et, par-dessus,
    les bordures de assets/bordure_eau.png. Un GIF, agrandi × 3."""
    bord = Image.open(os.path.join(ASSETS, 'bordure_eau.png')).convert('RGBA')
    W, H = 22, 15

    def terre(x, y):
        a = math.atan2(y - 7, x - 10.5)
        r = math.hypot((x - 10.5) / 1.3, y - 7)
        return r > 5.6 + 0.7 * math.sin(3 * a) + 0.5 * math.cos(5 * a + 1) or math.hypot(x - 14, (y - 8) * 1.2) < 1.6

    def profond_(x, y):                      # profond si aucune terre à moins de 2 sommets
        return not any(terre(x + dx, y + dy) for dx in range(-2, 3) for dy in range(-2, 3))

    rng = random.Random(5)
    choix = {}
    for ty in range(H):
        for tx in range(W):
            n = (profond_(tx, ty) << 3) | (profond_(tx + 1, ty) << 2) | (profond_(tx, ty + 1) << 1) | profond_(tx + 1, ty + 1)
            nu = rng.random() < 0.75
            choix[(tx, ty)] = (0 if nu else rng.randrange(1, 8)) if n == 0 else 8 + (rng.choice((0, 2)) if nu else rng.randrange(8)) if n == 15 else 16 + n
    images = []
    for k in range(IMAGES):
        carte = Image.new('RGBA', (W * T, H * T))
        for ty in range(H):
            for tx in range(W):
                j = k * par_image + choix[(tx, ty)]
                carte.paste(img.crop(((j % COLS) * T, (j // COLS) * T, (j % COLS + 1) * T, (j // COLS + 1) * T)), (tx * T, ty * T))
                n = (terre(tx, ty) << 3) | (terre(tx + 1, ty) << 2) | (terre(tx, ty + 1) << 1) | terre(tx + 1, ty + 1)
                carte.alpha_composite(bord.crop(((n % 4) * T, (n // 4) * T, (n % 4 + 1) * T, (n // 4 + 1) * T)), (tx * T, ty * T))
        images.append(carte.resize((carte.width * 3, carte.height * 3), Image.NEAREST).convert('RGB'))
    return images


def main():
    img, par_image = planche()
    img.save(SORTIE + '.png')
    with open(SORTIE + '.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx(img, par_image))
    print(f'assets/eau.png : {img.width // T} × {img.height // T} tuiles ({par_image} tuiles × {IMAGES} images) ; assets/eau.tsx')
    if '--apercu' in sys.argv:
        images = apercu(img, par_image)
        images[0].save(os.path.join(ROOT, 'apercu_eau.gif'), save_all=True, append_images=images[1:], duration=DUREE, loop=0)
        images[0].save(os.path.join(ROOT, 'apercu_eau.png'))
        print('apercu_eau.gif')


if __name__ == '__main__':
    main()
