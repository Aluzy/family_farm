# Les sols des biomes du grand monde (docs/grand-monde.md, étape 4 : fiche 4b), en tuiles de
# 16 × 16, vue de haut (lumière en haut à gauche) : des tuiles provisoires mais propres, en
# attendant les décors de l'étape 5.
#
#   python3 scripts/carte/sols_monde.py            écrit assets/sols_monde.png
#   python3 scripts/carte/sols_monde.py --apercu   écrit aussi apercu_sols_monde.png (un essai
#                                                  de raccords, agrandi, à la racine du dépôt)
#
# Le jeu les lit dans js/engine/monde-sol.js (SOLS_MONDE : mêmes noms, mêmes places) ; l'herbe, le
# chemin, l'eau et ses rives d'herbe restent ceux de la planche de la ferme (herbe_chemin, eau,
# rive_herbe : js/engine/planche.js), qui se posent à côté de celles-ci.
#
# La planche : 16 colonnes ; pour chaque sol de SOLS (dans cet ordre), trois rangées :
#   3k      le sol plein, 16 variantes (0 à 7 : unies ; 8 à 15, une fois sur sept : un détail au milieu) ;
#   3k + 1  le sol posé sur un autre sol, plus bas que lui : la tuile n couvre les coins de la
#           case marqués dans n (« coins de Wang » : haut-gauche si n & 8, haut-droit si n & 4,
#           bas-gauche si n & 2, bas-droit si n & 1), transparente ailleurs ; la tuile 0 est vide ;
#   3k + 2  le même, posé sur l'eau : une rive (un liseré mouillé, l'écume au pied).
# Puis :
#   27      le chemin posé sur un sol autre que l'herbe (mêmes coins ; sa texture est celle du
#           chemin plein de la planche de la ferme, herbe_chemin rangée 4 : ils se raccordent) ;
#   28      le gué : des pierres plates posées sur l'eau, 8 variantes (une case de rivière que
#           traverse un chemin).
#
# Raccords : la texture de chaque sol est périodique (16 px) et ses détails (de 8 à 15) restent
# loin des bords : toute tuile pleine se pose à côté de toute autre. Le bord d'une tuile
# partielle suit un champ (les coins, interpolés, plus un bruit périodique) qui, à moins de MARGE
# px d'un côté, ne dépend que des deux coins de ce côté : deux tuiles qui partagent un côté y ont
# le même bord, et le liseré, l'ombre, la face d'une falaise s'y prolongent sans couture.
import functools
import os
import sys
import zlib

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, T, apercu  # noqa: E402

SORTIE = os.path.join(ASSETS, 'sols_monde.png')
PLANCHE_FERME = os.path.join(ASSETS, 'farm_spring_summer.png')
COLS = 16
MARGE = 3                     # px du bord où le champ ne dépend que des coins de ce côté
BRUIT_BORD = 0.2              # l'amplitude du bruit qui fait onduler les bords

# Les sols, dans l'ordre de la planche (SOLS_MONDE.sols, js/engine/monde-sol.js). Pour chacun :
#   fond      ses tons, du plus sombre au plus clair (le bruit choisit) ;
#   grain     des points semés partout (périodiques) : [(couleur, densité)] ;
#   liseré    le bord d'un sol posé sur un autre : (clair, côté lumière ; sombre, côté ombre) ;
#   ombre     l'ombre qu'il porte sur le sol d'à côté (opacité ; 0 : à plat) ;
#   face      une falaise : la paroi qui tombe sous son bord (ses tons), sinon None ;
#   detail    le détail des variantes 8 à 15 (une fonction de dessin, plus bas).
SOLS = {
    'sable': dict(fond=[(205, 182, 124), (216, 194, 138), (226, 205, 152)], grain=[((190, 166, 112), 0.06), ((238, 222, 176), 0.05)],
                  lisere=((236, 220, 172), (184, 160, 104)), ombre=0.0, face=None, detail='coquillage'),
    'galets': dict(fond=[(170, 160, 140), (182, 172, 152), (192, 183, 164)], grain=[], galets=True,
                   lisere=((204, 196, 180), (132, 124, 112)), ombre=0.18, face=None, detail='gros_galet'),
    'marais': dict(fond=[(78, 90, 50), (88, 100, 56), (98, 110, 62)], grain=[((64, 70, 42), 0.08), ((112, 124, 70), 0.05)],
                   lisere=((110, 122, 70), (58, 64, 38)), ombre=0.0, face=None, detail='flaque'),
    'lande': dict(fond=[(128, 128, 66), (140, 140, 74), (152, 151, 84)], grain=[((132, 88, 122), 0.07), ((160, 112, 146), 0.04), ((172, 164, 96), 0.06)],
                  lisere=((166, 164, 96), (100, 98, 50)), ombre=0.12, face=None, detail='bruyere'),
    'foret': dict(fond=[(48, 72, 34), (56, 82, 38), (64, 92, 44)], grain=[((88, 68, 38), 0.07), ((104, 80, 44), 0.04), ((76, 104, 50), 0.05)],
                  lisere=((78, 106, 52), (34, 52, 24)), ombre=0.22, face=None, detail='feuilles'),
    'eboulis': dict(fond=[(132, 124, 114), (144, 136, 126), (156, 148, 138)], grain=[], cailloux=True,
                    lisere=((176, 170, 160), (100, 94, 88)), ombre=0.2, face=None, detail='pierre'),
    'roche': dict(fond=[(118, 116, 114), (128, 126, 123), (140, 138, 134)], grain=[((152, 150, 146), 0.05)], fissures=True,
                  lisere=((166, 164, 160), (88, 86, 84)), ombre=0.28, face=None, detail='fissure'),
    'falaise': dict(fond=[(100, 92, 86), (110, 102, 95), (120, 112, 104)], grain=[((132, 124, 116), 0.05)], strates=True,
                    lisere=((146, 138, 128), (74, 68, 64)), ombre=0.3, face=[(86, 80, 76), (74, 68, 64), (62, 57, 54), (52, 48, 46)], detail='fissure'),
    'neige': dict(fond=[(222, 230, 242), (234, 239, 247), (244, 247, 251)], grain=[((208, 218, 236), 0.05), ((255, 255, 255), 0.05)],
                  lisere=((255, 255, 255), (186, 200, 226)), ombre=0.16, face=None, detail='congere'),
}
ECUME = (255, 255, 255)
GUE = [(150, 146, 138), (172, 168, 160), (122, 118, 112), (196, 192, 184)]   # pierre : fond, clair, ombre, reflet


# ---------- le hasard fixe et les bruits périodiques (16 px) ----------

@functools.lru_cache(maxsize=None)
def hasard(*k):
    """Un nombre fixe dans [0, 1[ pour ces clés, quelles qu'elles soient (des noms, des nombres) :
    les images sont les mêmes à chaque lancement."""
    h = zlib.crc32(repr(k).encode())
    h = ((h ^ (h >> 16)) * 0x45d9f3b) & 0xffffffff
    h = ((h ^ (h >> 16)) * 0x45d9f3b) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffff) / 0x1000000


def _lisse(t):
    return t * t * (3 - 2 * t)


def bruit(cle, x, y, maille):
    """Un bruit lisse de 0 à 1, périodique sur 16 px : des valeurs tirées aux nœuds d'une grille
    de `maille` px (qui divise 16), interpolées."""
    n = T // maille
    fx, fy = x / maille, y / maille
    ix, iy = int(fx // 1), int(fy // 1)
    tx, ty = _lisse(fx - ix), _lisse(fy - iy)
    v = lambda a, b: hasard(cle, a % n, b % n)  # noqa: E731
    haut = v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx
    bas = v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx
    return haut * (1 - ty) + bas * ty


@functools.lru_cache(maxsize=None)
def bruits(cle, x, y):
    return 0.55 * bruit(cle + ':8', x, y, 8) + 0.3 * bruit(cle + ':4', x, y, 4) + 0.15 * bruit(cle + ':2', x, y, 2)


# ---------- la texture d'un sol (périodique) ----------

def texture(nom):
    """Le sol plein uni : 16 × 16 couleurs (x, y) -> (r, g, b), périodique."""
    S = SOLS[nom]
    # (les tons extrêmes rapprochés du ton moyen : une texture qui se répète tous les 16 px ne
    # doit pas faire de damier)
    tons = [mel3(S['fond'][0], S['fond'][1], 0.4), S['fond'][1], mel3(S['fond'][2], S['fond'][1], 0.4)]
    px = {}
    for y in range(T):
        for x in range(T):
            v = bruits(nom, x, y) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.18
            px[x, y] = tons[0] if v < 0.42 else tons[1] if v < 0.6 else tons[2]
            for k, (c, d) in enumerate(S['grain']):
                if hasard(nom, 'grain', k, x, y) < d:
                    px[x, y] = c
    # (des cailloux, des galets, des fissures, des strates : semés en boucle, périodiques)
    if S.get('galets'):
        for k in range(5):
            cx, cy = int(hasard(nom, 'g', k, 'x') * T), int(hasard(nom, 'g', k, 'y') * T)
            r = 1
            base = [(140, 136, 130), (160, 154, 146), (122, 118, 114), (176, 168, 156)][k % 4]
            caillou(px, cx, cy, r, base)
    if S.get('cailloux'):
        for k in range(4):
            cx, cy = int(hasard(nom, 'c', k, 'x') * T), int(hasard(nom, 'c', k, 'y') * T)
            caillou(px, cx, cy, 1, [(112, 106, 100), (168, 160, 150), (124, 116, 106)][k % 3], anguleux=True)
    if S.get('fissures'):
        for k in range(3):
            x, y = int(hasard(nom, 'f', k, 'x') * T), int(hasard(nom, 'f', k, 'y') * T)
            for n in range(5 + int(hasard(nom, 'f', k, 'l') * 4)):
                px[x % T, y % T] = (96, 94, 92)
                px[(x + 1) % T, y % T] = mel3(px[(x + 1) % T, y % T], (160, 158, 154), 0.5)
                x += 1 if hasard(nom, 'f', k, n) < 0.6 else 0
                y += 1 if hasard(nom, 'f', k, n, 'y') < 0.5 else 0
    if S.get('strates'):
        for y0 in (3, 9, 14):
            for x in range(T):
                y = (y0 + (1 if bruit(nom + ':s', x, y0, 8) > 0.55 else 0)) % T
                px[x, y] = (84, 78, 74)
                px[x, (y - 1) % T] = mel3(px[x, (y - 1) % T], (138, 130, 120), 0.5)
    return px


def mel3(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def caillou(px, cx, cy, r, base, anguleux=False):
    """Un caillou (vue de haut) de rayon r centré en (cx, cy), posé en boucle (périodique) :
    clair en haut à gauche, sombre en bas à droite, une ombre dessous."""
    clair, sombre = mel3(base, (235, 230, 220), 0.35), mel3(base, (40, 36, 34), 0.35)
    for dy in range(-r, r + 2):
        for dx in range(-r, r + 2):
            d = max(abs(dx), abs(dy)) if anguleux else (dx * dx + dy * dy) ** 0.5
            x, y = (cx + dx) % T, (cy + dy) % T
            if d <= r + 0.3:
                c = base
                if dx + dy < -r * 0.6:
                    c = clair
                elif dx + dy > r * 0.6:
                    c = sombre
                px[x, y] = c
            elif dx >= 0 and dy >= 1 and d <= r + 1.3:
                px[x, y] = mel3(px[x, y], (30, 28, 26), 0.35)


# ---------- les détails des variantes 8 à 15 (au milieu de la tuile) ----------

def detail(nom, px, v):
    S = SOLS[nom]
    cle = (nom, 'detail', v)
    cx, cy = 4 + int(hasard(*cle, 'x') * 8), 4 + int(hasard(*cle, 'y') * 8)
    sorte = S['detail']
    if sorte == 'coquillage':
        for k in range(2):
            x, y = 4 + int(hasard(*cle, k, 'x') * 8), 4 + int(hasard(*cle, k, 'y') * 8)
            if k == 0:
                px[x, y], px[x + 1, y], px[x, y + 1] = (246, 228, 222), (226, 196, 186), (206, 176, 166)
            else:
                caillou(px, x, y, 1, (150, 144, 136))
    elif sorte == 'gros_galet':
        caillou(px, cx, cy, 2, (150, 146, 140))
        caillou(px, 4 + (cx + 5) % 8, 4 + (cy + 3) % 8, 1, (166, 158, 146))
    elif sorte == 'flaque':
        for dy in range(-2, 3):
            for dx in range(-3, 4):
                if (dx / 3.4) ** 2 + (dy / 2.2) ** 2 <= 1:
                    px[cx + dx, cy + dy] = (52, 78, 76) if dy > -1 else (70, 98, 94)
        px[cx - 1, cy - 1] = (128, 160, 152)
        px[cx + 2, cy + 2] = (60, 66, 40)
        for k in range(3):    # des brins de jonc au bord
            x = cx - 3 + k * 3
            for h in range(2 + k % 2):
                px[x, cy - 3 - h] = (52, 82, 36) if h else (70, 100, 44)
    elif sorte == 'bruyere':
        for k in range(7):
            x, y = cx + int(hasard(*cle, k, 'a') * 5) - 2, cy + int(hasard(*cle, k, 'b') * 4) - 2
            px[x, y] = [(150, 98, 140), (122, 78, 116), (178, 126, 166)][k % 3]
            px[x, y + 1] = (84, 92, 44)
    elif sorte == 'feuilles':
        for k in range(6):
            x, y = cx + int(hasard(*cle, k, 'a') * 6) - 3, cy + int(hasard(*cle, k, 'b') * 6) - 3
            c = [(132, 92, 40), (150, 110, 48), (112, 70, 34)][k % 3]
            px[x, y] = c
            px[x + 1, y] = mel3(c, (0, 0, 0), 0.2)
        if v % 2:              # une brindille
            for k in range(4):
                px[cx - 2 + k, cy + 2 - k // 2] = (96, 70, 42)
    elif sorte == 'pierre':
        caillou(px, cx, cy, 2, (138, 130, 122), anguleux=True)
    elif sorte == 'fissure':
        x, y = cx - 3, cy - 2
        for n in range(7):
            px[x, y] = (78, 74, 72)
            px[x, y + 1] = mel3(px[x, y + 1], (170, 166, 160), 0.4)
            x += 1
            if hasard(*cle, n) < 0.45:
                y += 1 if hasard(*cle, n, 's') < 0.6 else -1
            y = max(3, min(T - 4, y))
    elif sorte == 'congere':
        for dx in range(-3, 4):
            for dy in range(0, 2):
                if abs(dx) + dy * 2 <= 3:
                    px[cx + dx, cy + dy] = (206, 216, 236)
            px[cx + dx, cy - 1] = (255, 255, 255)


# ---------- les coins : le champ du bord ----------

def _coord(p):
    """La position (px, de -MARGE à 16 + MARGE) ramenée entre 0 et 1, plate à MARGE px des bords."""
    u = (p + 0.5 - MARGE) / (T - 2 * MARGE)
    return 0.0 if u < 0 else 1.0 if u > 1 else u


def dedans(n, x, y):
    """Le pixel (x, y) (même un peu hors de la tuile : jusqu'à MARGE px) est-il couvert par le sol
    des coins n ?"""
    u, v = _lisse(_coord(x)), _lisse(_coord(y))
    a, b, c, d = (n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1
    f = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
    if n in (0, 15):
        return n == 15
    return f + (bruits('bord', x % T, y % T) - 0.5) * 2 * BRUIT_BORD > 0.5


def partielle(nom, n, tex, rive):
    """La tuile du sol `nom` sur les coins n (transparente ailleurs) ; `rive` : sur l'eau."""
    S = SOLS.get(nom)
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    if n == 0:
        return im
    D = lambda x, y: dedans(n, x, y)  # noqa: E731
    clair, sombre = S['lisere'] if S else ((0, 0, 0), (0, 0, 0))
    for y in range(T):
        for x in range(T):
            if D(x, y):
                c = tex[x, y]
                if not D(x - 1, y) or not D(x, y - 1):
                    c = clair            # le bord éclairé (haut, gauche)
                if not D(x + 1, y) or not D(x, y + 1):
                    c = sombre           # le bord dans l'ombre (bas, droite)
                if rive and not all(D(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    c = mel3(c, (60, 70, 72), 0.35)      # mouillé
                im.putpixel((x, y), c + (255,))
                continue
            # dehors : la face d'une falaise sous son bord, l'ombre portée, l'écume
            if S and S['face']:
                for k in range(1, len(S['face']) + 1):
                    if D(x, y - k):
                        im.putpixel((x, y), S['face'][k - 1] + (255,))
                        break
                if im.getpixel((x, y))[3]:
                    continue
            if rive:
                if any(D(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    im.putpixel((x, y), ECUME + (190,))
                elif any(D(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, 1))) and (x + y) % 2 == 0:
                    im.putpixel((x, y), ECUME + (90,))
            elif S and S['ombre'] and (D(x - 1, y - 1) or D(x, y - 1)):
                im.putpixel((x, y), (20, 24, 16, round(255 * S['ombre'])))
    return im


def depuis_texture(tex):
    im = Image.new('RGBA', (T, T))
    for (x, y), c in tex.items():
        im.putpixel((x, y), c + (255,))
    return im


# ---------- le chemin et le gué ----------

def texture_chemin():
    """La texture du chemin plein de la planche de la ferme (herbe_chemin, rangée 4, tuile 0)."""
    p = Image.open(PLANCHE_FERME).convert('RGB')
    x0, y0 = 0, (45 + 4) * T
    return {(x, y): p.getpixel((x0 + x, y0 + y)) for y in range(T) for x in range(T)}


def chemin(n, tex):
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    if n == 0:
        return im
    D = lambda x, y: dedans(n, x, y)  # noqa: E731
    for y in range(T):
        for x in range(T):
            if D(x, y):
                c = tex[x, y]
                if not all(D(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    c = mel3(c, (70, 46, 28), 0.3)       # le bord tassé
                im.putpixel((x, y), c + (255,))
            elif D(x, y - 1) or D(x - 1, y):
                im.putpixel((x, y), (40, 30, 20, 60))    # un peu d'ombre au pied
    return im


def gue(v):
    """Des pierres plates sur l'eau (transparente) : deux ou trois, en travers de la case."""
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    fond, clair, ombre, reflet = GUE
    pierres = [(4, 4), (11, 6), (6, 11), (12, 12)]
    for k, (cx, cy) in enumerate(pierres):
        if hasard('gue', v, k) < 0.25 and k:
            continue
        cx += int(hasard('gue', v, k, 'x') * 3) - 1
        cy += int(hasard('gue', v, k, 'y') * 3) - 1
        rx, ry = 2 + int(hasard('gue', v, k, 'r') * 2), 2
        for dy in range(-ry - 1, ry + 2):
            for dx in range(-rx - 1, rx + 2):
                x, y = cx + dx, cy + dy
                if not (0 <= x < T and 0 <= y < T):
                    continue
                e = (dx / (rx + 0.4)) ** 2 + (dy / (ry + 0.4)) ** 2
                if e <= 1:
                    c = clair if dy < 0 and dx < 1 else fond
                    if dy == ry:
                        c = ombre
                    im.putpixel((x, y), c + (255,))
                elif e <= 1.7 and dy >= 0:
                    im.putpixel((x, y), ECUME + (110,))
        im.putpixel((cx - 1, cy - 1), reflet + (255,))
    return im


# ---------- la planche ----------

def planche():
    rangees = 3 * len(SOLS) + 2
    out = Image.new('RGBA', (COLS * T, rangees * T), (0, 0, 0, 0))
    for k, nom in enumerate(SOLS):
        tex = texture(nom)
        for v in range(16):
            px = dict(tex)
            if v >= 8:
                detail(nom, px, v)
            out.paste(depuis_texture(px), (v * T, 3 * k * T))
        for n in range(16):
            out.paste(partielle(nom, n, tex, False), (n * T, (3 * k + 1) * T))
            out.paste(partielle(nom, n, tex, True), (n * T, (3 * k + 2) * T))
    tc = texture_chemin()
    for n in range(16):
        out.paste(chemin(n, tc), (n * T, (3 * len(SOLS)) * T))
    for v in range(8):
        out.paste(gue(v), (v * T, (3 * len(SOLS) + 1) * T))
    return out


def essai(out):
    """Un essai de raccords : chaque sol en tache sur l'herbe, sur l'eau et sur ses voisins."""
    ferme = Image.open(PLANCHE_FERME).convert('RGBA')
    herbe = ferme.crop((0, 45 * T, T, 46 * T))
    eau = ferme.crop((32 * T, 45 * T, 33 * T, 46 * T))
    W, H = 12, 8
    im = Image.new('RGBA', (W * T * len(SOLS), H * T * 2), (0, 0, 0, 255))
    for k, nom in enumerate(SOLS):
        for fond, rive, y0 in ((herbe, False, 0), (eau, True, H)):
            # une tache : les coins dans une ellipse
            coin = lambda x, y: ((x - W / 2) / 4) ** 2 + ((y - H / 2) / 2.6) ** 2 < 1  # noqa: E731
            for ty in range(H):
                for tx in range(W):
                    X, Y = (k * W + tx) * T, (y0 + ty) * T
                    im.paste(fond, (X, Y))
                    n = (8 if coin(tx, ty) else 0) | (4 if coin(tx + 1, ty) else 0) | (2 if coin(tx, ty + 1) else 0) | (1 if coin(tx + 1, ty + 1) else 0)
                    if n == 15:
                        t = out.crop((((tx * 7 + ty * 3) % 16) * T, 3 * k * T, ((tx * 7 + ty * 3) % 16 + 1) * T, (3 * k + 1) * T))
                    else:
                        r = 3 * k + (2 if rive else 1)
                        t = out.crop((n * T, r * T, (n + 1) * T, (r + 1) * T))
                    im.alpha_composite(t, (X, Y))
    return im


def main():
    out = planche()
    out.save(SORTIE)
    print(f'assets/sols_monde.png : {out.width // T} × {out.height // T} tuiles ({len(SOLS)} sols, le chemin, le gué)')
    if '--apercu' in sys.argv:
        apercu(essai(out), 'apercu_sols_monde.png', zoom=2)


if __name__ == '__main__':
    main()
