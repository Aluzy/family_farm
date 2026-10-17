# Planche d'herbe et de chemin, à partir d'une seule tuile modèle (16 × 16).
#
#   python3 scripts/carte/herbe_chemin.py            écrit assets/herbe_chemin.png et .tsx
#   python3 scripts/carte/herbe_chemin.py --apercu   écrit aussi apercu_herbe_chemin.png
#
# Modèle : scripts/carte/originaux/tuile_herbe_chemin.png — de l'herbe vert vif (fond, tons
# voisins, points clairs, petits traits vert sombre) et, en bas à droite, un coin de chemin
# jaune bordé de bruns olive.
#
# La planche (16 tuiles par rangée) :
#   rangées 0 à 3   l'herbe, 16 variantes par rangée ; une rangée par teinte (TEINTES_HERBE) :
#                   celle du modèle, puis de plus en plus foncée ;
#   rangée 4        le chemin plein : 8 variantes jaunes, puis 8 de la teinte plus foncée ;
#   rangées 5 à 12  les raccords herbe / chemin, une rangée par (teinte d'herbe, teinte de
#                   chemin) : 16 tuiles, une par combinaison de coins (« coins de Wang ») ; la
#                   tuile n a du chemin au coin haut-gauche si n & 8, haut-droit si n & 4,
#                   bas-gauche si n & 2, bas-droit si n & 1 ;
#   rangées 13 à 15 les raccords d'une herbe à la suivante, plus foncée (mêmes coins : la plus
#                   foncée aux coins marqués), par une frontière tramée.
# Raccords : l'herbe n'a aucune forme qui traverse un bord (des points et des traits courts
# posés à l'intérieur), donc toute tuile d'herbe se pose à côté de toute autre ; le bord du
# chemin ne dépend, le long d'un côté, que des deux coins de ce côté, donc deux raccords qui
# partagent un côté se rejoignent. assets/herbe_chemin.tsx décrit le tout pour Tiled (un jeu
# de coins « herbe et chemin » : peindre au pinceau de terrain).
import colorsys
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, ROOT, T, cote_a_cote, wangid  # noqa: E402
MODELE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'tuile_herbe_chemin.png')
SORTIE = os.path.join(ASSETS, 'herbe_chemin')
COLS = 16

# Teintes de l'herbe : (luminosité, saturation, décalage de teinte en degrés vers le bleu-vert).
TEINTES_HERBE = [(1.0, 1.0, 0), (0.84, 1.0, 5), (0.70, 1.02, 10), (0.57, 1.05, 15)]
NOMS_HERBE = ['herbe', 'herbe sombre', 'herbe foncée', 'herbe très foncée']
# Teintes du chemin : celle du modèle, puis une plus foncée (ocre).
TEINTES_CHEMIN = [(1.0, 1.0, 0), (0.80, 1.0, -6)]
NOMS_CHEMIN = ['chemin', 'chemin foncé']

# Couleurs du modèle. Le chemin : fond, tons du sol, et sa bordure (du plus clair, côté
# chemin, au plus sombre, côté herbe).
CHEMIN_FOND = (251, 214, 10)
CHEMIN_TONS = [(242, 205, 4), (227, 192, 4), (212, 176, 4)]
BORD = [(182, 153, 4), (152, 127, 4), (122, 102, 4), (92, 78, 3)]


def teinte(c, t):
    """La couleur c dans la teinte t = (luminosité, saturation, décalage de teinte)."""
    k, ks, dh = t
    if t == (1.0, 1.0, 0):
        return c
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c))
    h = (h + dh / 360) % 1
    r, g, b = colorsys.hsv_to_rgb(h, min(1, s * ks), v * k)
    return (round(r * 255), round(g * 255), round(b * 255))


def est_herbe(c):
    """Un pixel d'herbe du modèle (vert), et non du chemin (jaune, ocre) ou de sa bordure."""
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c))
    return 70 / 360 <= h <= 160 / 360


def quarts_herbe(modele):
    """Toutes les fenêtres 8 × 8 du modèle qui ne sont que de l'herbe (le coin bas-droit porte
    le chemin), et leurs miroirs (gauche-droite, haut-bas : les traits restent verticaux)."""
    quarts = []
    for qy in range(T - 7):
        for qx in range(T - 7):
            q = modele.crop((qx, qy, qx + 8, qy + 8))
            if all(est_herbe(p[:3]) for p in q.get_flattened_data()):
                quarts += [q, q.transpose(Image.FLIP_LEFT_RIGHT), q.transpose(Image.FLIP_TOP_BOTTOM),
                           q.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)]
    return quarts


def herbe(quarts, graine):
    """Une tuile d'herbe : quatre quarts du modèle tirés au sort (graine fixe : la planche ne
    change pas d'une fois sur l'autre)."""
    rng = random.Random(graine)
    tuile = Image.new('RGBA', (T, T))
    for qy in (0, 8):
        for qx in (0, 8):
            tuile.paste(rng.choice(quarts), (qx, qy))
    return tuile


def chemin(graine):
    """Une tuile de chemin plein : le fond jaune, des grains plus sombres et quelques cailloux."""
    rng = random.Random(graine)
    tuile = Image.new('RGBA', (T, T), CHEMIN_FOND + (255,))
    for y in range(T):
        for x in range(T):
            r = rng.random()
            if r < 0.16:
                tuile.putpixel((x, y), CHEMIN_TONS[0] + (255,))
            elif r < 0.22:
                tuile.putpixel((x, y), CHEMIN_TONS[1] + (255,))
    for _ in range(rng.randint(1, 3)):                   # cailloux : 2 pixels, ombre dessous
        x, y = rng.randint(1, T - 3), rng.randint(1, T - 3)
        tuile.putpixel((x, y), CHEMIN_TONS[1] + (255,))
        tuile.putpixel((x + 1, y), CHEMIN_TONS[1] + (255,))
        tuile.putpixel((x, y + 1), CHEMIN_TONS[2] + (255,))
        tuile.putpixel((x + 1, y + 1), CHEMIN_TONS[2] + (255,))
    return tuile


def en_teinte(tuile, t):
    out = tuile.copy()
    px = out.load()
    for y in range(T):
        for x in range(T):
            p = px[x, y]
            px[x, y] = teinte(p[:3], t) + (p[3],)
    return out


def bosse(x, y):
    """Petites irrégularités du bord du chemin, nulles sur les côtés de la tuile (les raccords
    se rejoignent) et fixes d'une tuile à l'autre."""
    u, v = (x + 0.5) / T, (y + 0.5) / T
    calme = math.sin(math.pi * u) * math.sin(math.pi * v)
    return calme * 0.10 * (math.sin(u * 17.0 + v * 5.0) + math.sin(v * 13.0 - u * 7.0)) / 2


def champ(x, y, coins):
    """Part de chemin au pixel (x, y) : les quatre coins (haut-gauche, haut-droit, bas-gauche,
    bas-droit ; 1 = chemin) interpolés, arrondis par un lissage, plus les bosses."""
    tl, tr, bl, br = coins
    u, v = (x + 0.5) / T, (y + 0.5) / T
    s = lambda t: t * t * (3 - 2 * t)
    su, sv = s(u), s(v)
    f = tl * (1 - su) * (1 - sv) + tr * su * (1 - sv) + bl * (1 - su) * sv + br * su * sv
    return f + (bosse(x, y) if 0 < f < 1 else 0)


def raccord(fond_herbe, fond_chemin, n, t_chemin):
    """Tuile de raccord n (coins : n & 8 haut-gauche, 4 haut-droit, 2 bas-gauche, 1 bas-droit)."""
    coins = [(n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1]
    bord = [teinte(c, t_chemin) for c in BORD]
    out = fond_herbe.copy()
    px = out.load()
    pc = fond_chemin.load()
    f = [[champ(x, y, coins) for x in range(T)] for y in range(T)]
    for y in range(T):
        for x in range(T):
            v = f[y][x]
            if v >= 0.5:
                px[x, y] = pc[x, y]
            # la bordure, côté herbe, comme dans le modèle : brun olive, plus sombre au bord
            elif v >= 0.40:
                px[x, y] = bord[0 if v >= 0.45 else 1] + (255,)
            elif v >= 0.33 and BAYER[y % 4][x % 4] < 9:
                px[x, y] = bord[2 if v >= 0.37 else 3] + (255,)
    return out


def fondu(clair, fonce, n):
    """Raccord entre deux teintes d'herbe voisines (la même herbe, deux teintes) : la plus
    foncée aux coins de n (comme raccord()), une frontière tramée entre les deux."""
    coins = [(n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1]
    out = clair.copy()
    px = out.load()
    pf = fonce.load()
    for y in range(T):
        for x in range(T):
            if champ(x, y, coins) > 0.5 + (BAYER[y % 4][x % 4] / 16 - 0.47) * 0.45:
                px[x, y] = pf[x, y]
    return out


def planche(modele):
    quarts = quarts_herbe(modele)
    herbes = [[en_teinte(herbe(quarts, 1000 + i), t) for i in range(COLS)] for t in TEINTES_HERBE]
    chemins = [[en_teinte(chemin(2000 + i), t) for i in range(8)] for t in TEINTES_CHEMIN]
    rangs = len(TEINTES_HERBE) + 1 + len(TEINTES_HERBE) * len(TEINTES_CHEMIN) + len(TEINTES_HERBE) - 1
    out = Image.new('RGBA', (COLS * T, rangs * T), (0, 0, 0, 0))
    for r, ligne in enumerate(herbes):
        for i, t in enumerate(ligne):
            out.paste(t, (i * T, r * T))
    r = len(TEINTES_HERBE)
    for p, ligne in enumerate(chemins):
        for i, t in enumerate(ligne):
            out.paste(t, ((p * 8 + i) * T, r * T))
    raccords = {}
    for h in range(len(TEINTES_HERBE)):
        for p in range(len(TEINTES_CHEMIN)):
            r += 1
            for n in range(16):
                t = raccord(herbes[h][n], chemins[p][n % 8], n, TEINTES_CHEMIN[p])
                out.paste(t, (n * T, r * T))
                raccords[(h, p, n)] = r * COLS + n
    # raccords entre une herbe et la suivante, plus foncée
    for h in range(len(TEINTES_HERBE) - 1):
        r += 1
        for n in range(16):
            out.paste(fondu(herbes[h][n], herbes[h + 1][n], n), (n * T, r * T))
            raccords[('h', h, n)] = r * COLS + n
    return out, raccords


def tsx(raccords, largeur, hauteur):
    """Le jeu de tuiles pour Tiled, avec un jeu de coins « herbe et chemin » : couleurs 1 à 4
    les herbes, 5 et 6 les chemins. Les tuiles pleines y sont aussi (variantes tirées au sort
    par le pinceau de terrain)."""
    nh, npc = len(TEINTES_HERBE), len(TEINTES_CHEMIN)
    couleurs_h = ['#76c504', '#5ea70a', '#4a8a10', '#3a7016']
    couleurs_c = ['#fbd60a', '#c99d10']
    lignes = []
    for h in range(nh):
        for i in range(COLS):
            c = h + 1
            lignes.append(f'   <wangtile tileid="{h * COLS + i}" wangid="0,{c},0,{c},0,{c},0,{c}"/>')
    for p in range(npc):
        for i in range(8):
            c = nh + 1 + p
            lignes.append(f'   <wangtile tileid="{nh * COLS + p * 8 + i}" wangid="0,{c},0,{c},0,{c},0,{c}"/>')
    for (h, p, n), tid in raccords.items():
        if n in (0, 15):
            continue                          # tout herbe, tout chemin : déjà les tuiles pleines
        if h == 'h':
            ch, cc = p + 1, p + 2             # une herbe et la suivante
        else:
            ch, cc = h + 1, nh + 1 + p
        lignes.append(f'   <wangtile tileid="{tid}" wangid="{wangid(n, ch, cc)}"/>')
    noms = [(NOMS_HERBE[h], couleurs_h[h]) for h in range(nh)] + [(NOMS_CHEMIN[p], couleurs_c[p]) for p in range(npc)]
    couleurs = '\n'.join(f'   <wangcolor name="{n}" color="{c}" tile="-1" probability="1"/>' for n, c in noms)
    total = (largeur // T) * (hauteur // T)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="herbe_chemin" tilewidth="{T}" tileheight="{T}" tilecount="{total}" columns="{largeur // T}">
 <image source="herbe_chemin.png" width="{largeur}" height="{hauteur}"/>
 <wangsets>
  <wangset name="herbe et chemin" type="corner" tile="-1">
{couleurs}
{chr(10).join(lignes)}
  </wangset>
 </wangsets>
</tileset>
'''


def apercu(img, raccords):
    """Une petite carte peinte avec la planche : les quatre herbes en bandes ondulées (raccords
    tramés), un chemin jaune qui serpente et un chemin foncé, agrandie ×3, à côté de la planche."""
    W, H = 30, 18
    rng = random.Random(7)
    # sommets : teinte d'herbe (0 à 3) et chemin (0 rien, 1 jaune, 2 foncé)
    herbe_s = [[min(3, max(0, int((x + 2 * math.sin(y / 3.0)) / 7.5))) for x in range(W + 1)] for y in range(H + 1)]
    chem = [[0] * (W + 1) for _ in range(H + 1)]
    for x in range(W + 1):
        y = int(H / 2 + 3.5 * math.sin(x / 4.0))
        for dy in (0, 1):
            chem[min(H, max(0, y + dy))][x] = 1
    for y in range(H + 1):
        for x in range(W + 1):
            if (x - 6) ** 2 + (y - 3) ** 2 <= 5:
                chem[y][x] = 2
    carte = Image.new('RGBA', (W * T, H * T))
    for ty in range(H):
        for tx in range(W):
            vs = [(ty, tx), (ty, tx + 1), (ty + 1, tx), (ty + 1, tx + 1)]
            c = [chem[a][b] for a, b in vs]
            hs = [herbe_s[a][b] for a, b in vs]
            h = min(hs)
            n = sum((1 << (3 - k)) for k, v in enumerate(c) if v)
            if n == 15:
                tid = len(TEINTES_HERBE) * COLS + (c[0] - 1) * 8 + rng.randrange(8)
            elif n:
                tid = raccords[(h, max(c) - 1, n)]
            elif max(hs) > h:
                tid = raccords[('h', h, sum((1 << (3 - k)) for k, v in enumerate(hs) if v > h))]
            else:
                tid = h * COLS + rng.randrange(COLS)
            tile = img.crop(((tid % COLS) * T, (tid // COLS) * T, (tid % COLS + 1) * T, (tid // COLS + 1) * T))
            carte.paste(tile, (tx * T, ty * T))
    z = 3
    a = carte.resize((carte.width * z, carte.height * z), Image.NEAREST)
    b = img.resize((img.width * z, img.height * z), Image.NEAREST)
    return cote_a_cote(b, a)


def main():
    modele = Image.open(MODELE).convert('RGBA')
    img, raccords = planche(modele)
    img.save(SORTIE + '.png')
    with open(SORTIE + '.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx(raccords, img.width, img.height))
    print(f'assets/herbe_chemin.png : {img.width // T} × {img.height // T} tuiles ; assets/herbe_chemin.tsx')
    if '--apercu' in sys.argv:
        apercu(img, raccords).save(os.path.join(ROOT, 'apercu_herbe_chemin.png'))
        print('apercu_herbe_chemin.png')


if __name__ == '__main__':
    main()
