# Les tuiles de l'infra-monde, dérivées des modèles de scripts/infra/originaux/ :
#
#   assets/infra_sol.png   le sol (sol.png : une herbe pâle semée de fleurs lumineuses) :
#                          8 variantes sur une rangée, IMAGES rangées d'animation (le cœur des
#                          fleurs palpite, chaque variante à son rythme). Variante 0 : nue,
#                          1 : le modèle, 2 à 7 : d'autres semis de fleurs et de points.
#   assets/infra_eau.png   l'eau (eau.png : une eau nocturne où brillent des étoiles) : 8
#                          variantes, IMAGES rangées (les étoiles scintillent, des reflets
#                          s'allument). Variante 0 : le modèle, 1 : sans étoile, 2 à 7 : d'autres.
#   assets/infra_rive.png  les bords d'eau : 16 tuiles (4 × 4), une par combinaison de coins
#                          sol / eau (« coins de Wang ») : la tuile n a du sol au coin haut-gauche
#                          si n & 8, haut-droit si n & 4, bas-gauche si n & 2, bas-droit si n & 1.
#                          L'eau y est transparente : elles se posent sur un calque d'eau.
#                          Au sud d'une terre (l'eau en dessous), on voit sa berge : trois pixels
#                          de pierre violette (les couleurs de l'arbre), puis une ligne de lueur ;
#                          ailleurs, un liseré de lueur au ras de l'eau, un bord clair au nord.
# L'image k de la tuile t est la tuile t + k × colonnes ; les .tsx déclarent ces animations.
#
#   python3 scripts/infra/tuiles.py            écrit les images et les .tsx
#   python3 scripts/infra/tuiles.py --apercu   écrit aussi apercu_infra_tuiles.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, EAU, FLEUR, LUEUR, PIERRE, SOL, SOL_CLAIR, T, apercu, hasard, melange, modele, tsx  # noqa: E402

IMAGES = 4
VARIANTES = 8


# ---------- le sol ----------

def fleurs_du_modele(m):
    """Les motifs du modèle : (dx, dy, couleur) relatifs au coin de leur boîte."""
    def motif(x0, y0, x1, y1):
        out = []
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = m.getpixel((x, y))[:3]
                if c != SOL:
                    out.append((x - x0, y - y0, c))
        return out
    return {'petite': motif(2, 2, 4, 4), 'grande': motif(4, 9, 7, 12), 'point': [(0, 0, SOL_CLAIR)]}


def sol(m):
    motifs = fleurs_du_modele(m)
    # le semis de chaque variante : (motif, x, y)
    semis = {0: [('point', 11, 6)], 1: None}
    for v in range(2, VARIANTES):
        lst = []
        n = 1 + int(hasard(v, 1) * 3)
        for k in range(n):
            nom = ['petite', 'grande', 'point', 'point'][int(hasard(v, k, 2) * 4)]
            lst.append((nom, 1 + int(hasard(v, k, 3) * 11), 1 + int(hasard(v, k, 4) * 11)))
        semis[v] = lst
    sheet = Image.new('RGBA', (VARIANTES * T, IMAGES * T))
    for k in range(IMAGES):
        for v in range(VARIANTES):
            if semis[v] is None:
                tile = m.copy()
            else:
                tile = Image.new('RGBA', (T, T), SOL + (255,))
                for nom, x0, y0 in semis[v]:
                    for dx, dy, c in motifs[nom]:
                        if 0 <= x0 + dx < T and 0 <= y0 + dy < T:
                            tile.putpixel((x0 + dx, y0 + dy), c + (255,))
            # la palpitation : le cœur s'éclaire puis revient ; le halo suit, plus doucement
            p = (math.sin(2 * math.pi * (k + v * 0.37 * IMAGES) / IMAGES) + 1) / 2
            for y in range(T):
                for x in range(T):
                    c = tile.getpixel((x, y))[:3]
                    if c == FLEUR:
                        tile.putpixel((x, y), melange(FLEUR, (226, 255, 190), p) + (255,))
                    elif c == SOL_CLAIR and p > 0.6:
                        tile.putpixel((x, y), melange(SOL_CLAIR, (196, 222, 170), (p - 0.6) / 0.4) + (255,))
            sheet.paste(tile, (v * T, k * T))
    anims = {v: [v + k * VARIANTES for k in range(IMAGES)] for v in range(VARIANTES)}
    probas = {v: (1 if v == 0 else 0.25) for v in range(VARIANTES)}
    return sheet, anims, probas


# ---------- l'eau ----------

ETOILE = {(166, 142, 184), (180, 160, 196), (77, 66, 86), (104, 91, 114), (48, 41, 54)}


def eau(m):
    # le fond (le modèle sans ses étoiles) et les deux étoiles du modèle
    fond = m.copy()
    etoiles = {'grande': [], 'petite': []}
    for y in range(T):
        for x in range(T):
            c = m.getpixel((x, y))[:3]
            if c in ETOILE:
                fond.putpixel((x, y), EAU + (255,))
                (etoiles['grande'] if y < 9 else etoiles['petite']).append((x, y, c))
    # recentre chaque étoile sur son centre (le pixel le plus clair)
    for nom, lst in etoiles.items():
        cx, cy = max(lst, key=lambda p: sum(p[2]))[:2]
        etoiles[nom] = [(x - cx, y - cy, c) for x, y, c in lst]
    semis = {0: None, 1: []}
    for v in range(2, VARIANTES):
        lst = []
        for k in range(int(hasard(v, 7) * 3)):
            lst.append((['grande', 'petite', 'petite'][int(hasard(v, k, 8) * 3)], 3 + int(hasard(v, k, 9) * 10), 3 + int(hasard(v, k, 10) * 10)))
        semis[v] = lst
    sheet = Image.new('RGBA', (VARIANTES * T, IMAGES * T))
    for v in range(VARIANTES):
        # le fond de chaque variante : celui du modèle, retourné ou décalé (tous les 16 px : sans couture)
        base = fond.transpose(Image.FLIP_LEFT_RIGHT) if v % 2 else fond
        if v % 3 == 2:
            base = base.transpose(Image.FLIP_TOP_BOTTOM)
        for k in range(IMAGES):
            tile = m.copy() if semis[v] is None else base.copy()
            for nom, x0, y0 in semis[v] or []:
                for dx, dy, c in etoiles[nom]:
                    tile.putpixel(((x0 + dx) % T, (y0 + dy) % T), c + (255,))
            # le scintillement : le centre des étoiles s'éclaire, chaque variante décalée
            p = (math.sin(2 * math.pi * (k + v) / IMAGES) + 1) / 2
            for y in range(T):
                for x in range(T):
                    c = tile.getpixel((x, y))[:3]
                    if c == (180, 160, 196):
                        tile.putpixel((x, y), melange(c, (238, 228, 252), p) + (255,))
                    elif c == (166, 142, 184):
                        tile.putpixel((x, y), melange(c, (200, 182, 222), p * 0.6) + (255,))
            # des reflets : un ou deux pixels du fond s'allument à leur tour
            for r in range(2):
                if int(hasard(v, r, 11) * IMAGES) == k:
                    x, y = 1 + int(hasard(v, r, 12) * 14), 1 + int(hasard(v, r, 13) * 14)
                    if tile.getpixel((x, y))[:3] not in ETOILE:
                        tile.putpixel((x, y), (70, 88, 130, 255))
            sheet.paste(tile, (v * T, k * T))
    anims = {v: [v + k * VARIANTES for k in range(IMAGES)] for v in range(VARIANTES)}
    probas = {v: (1 if v == 1 else 0.3) for v in range(VARIANTES)}
    return sheet, anims, probas


# ---------- les rives ----------

def terre(n, x, y):
    """Le sol au pixel (x, y) de la tuile n (y peut sortir de la tuile vers le haut : on reste
    sur son bord). Les coins se mélangent (bilinéaire), avec une ondulation nulle sur les bords
    de la tuile : deux tuiles voisines se rejoignent."""
    y = max(0, y)
    u, w = (x + 0.5) / T, (y + 0.5) / T
    c = [1 if n & b else 0 for b in (8, 4, 2, 1)]
    f = c[0] * (1 - u) * (1 - w) + c[1] * u * (1 - w) + c[2] * (1 - u) * w + c[3] * u * w
    f += 0.07 * math.sin(math.pi * u * 2) * math.sin(math.pi * w)
    return f > 0.5


def rive(n):
    tile = Image.new('RGBA', (T, T))
    put = lambda x, y, c: tile.putpixel((x, y), c + (255,))
    for y in range(T):
        for x in range(T):
            if terre(n, x, y):
                c = SOL
                if not terre(n, x, y - 1) and y > 0:
                    c = SOL_CLAIR                                  # le bord nord, éclairé
                elif not (terre(n, x - 1, y) if x > 0 else True) or not (terre(n, x + 1, y) if x < T - 1 else True):
                    c = melange(SOL, (90, 112, 80), 0.45)          # les flancs est et ouest
                put(x, y, c)
                continue
            # dans l'eau : la berge sous une terre (3 px), puis la lueur au ras de l'eau
            k = next((k for k in range(1, 5) if terre(n, x, y - k)), None)
            if k in (1, 2, 3):
                put(x, y, [PIERRE[0], PIERRE[1], PIERRE[2]][k - 1])
            elif k == 4:
                put(x, y, LUEUR[0] if x % 4 < 2 else LUEUR[1])
            elif any(0 <= x + dx < T and 0 <= y + dy < T and terre(n, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1))):
                put(x, y, LUEUR[1])
    return tile


def rives():
    sheet = Image.new('RGBA', (4 * T, 4 * T))
    for n in range(16):
        sheet.paste(rive(n), ((n % 4) * T, (n // 4) * T))
    return sheet


def main():
    s, anims, probas = sol(modele('sol'))
    s.save(os.path.join(ASSETS, 'infra_sol.png'), optimize=True)
    tsx('infra_sol', s, VARIANTES, VARIANTES * IMAGES, anims, probabilites=probas)
    e, anims, probas = eau(modele('eau'))
    e.save(os.path.join(ASSETS, 'infra_eau.png'), optimize=True)
    tsx('infra_eau', e, VARIANTES, VARIANTES * IMAGES, anims, probabilites=probas, duree=220)
    r = rives()
    r.save(os.path.join(ASSETS, 'infra_rive.png'), optimize=True)
    tsx('infra_rive', r, 4, 16, wang=('eau et sol', ('eau', '#1f2943'), ('sol', '#86a76a')))
    print('assets/infra_sol.png, infra_eau.png, infra_rive.png (+ .tsx)')
    if '--apercu' in sys.argv:
        # une mare : l'eau, puis les rives d'après une grille de coins, puis le sol
        coins = ['111111111', '111000111', '110000011', '110000111', '111001111', '111111111']
        W, H = len(coins[0]) - 1, len(coins) - 1
        im = Image.new('RGBA', (W * T + 8 * T + 8, max(H, 4) * T))
        for ty in range(H):
            for tx in range(W):
                c = [coins[ty][tx], coins[ty][tx + 1], coins[ty + 1][tx], coins[ty + 1][tx + 1]]
                n = sum(8 >> i for i, v in enumerate(c) if v == '1')
                v = (tx * 3 + ty) % VARIANTES
                im.alpha_composite(e.crop((v * T, 0, v * T + T, T)), (tx * T, ty * T))
                if n == 15:
                    im.alpha_composite(s.crop((v * T, 0, v * T + T, T)), (tx * T, ty * T))
                else:
                    im.alpha_composite(r.crop(((n % 4) * T, (n // 4) * T, (n % 4) * T + T, (n // 4) * T + T)), (tx * T, ty * T))
        im.alpha_composite(r, (W * T + 8, 0))
        apercu(im, 'apercu_infra_tuiles.png')


if __name__ == '__main__':
    main()
