# Les sols des biomes du grand monde (docs/grand-monde.md, étape 5 : fiche 5a), en tuiles de
# 16 × 16, vue de haut (lumière en haut à gauche), dans les tons de la ferme (son herbe vive, son
# chemin brun-orangé, son eau claire) : le sable et les galets de la plage, l'eau basse et la vase du
# marais, la terre nue et l'herbe rase de la lande, les feuilles, les aiguilles et la mousse de la
# forêt, les éboulis et la roche de la montagne, la falaise, la neige des sommets.
#
#   python3 scripts/carte/sols_monde.py            écrit assets/sols_monde.png
#   python3 scripts/carte/sols_monde.py --apercu   écrit aussi apercu_sols_monde.png (chaque sol
#                                                  en tache sur l'herbe de la ferme et sur l'eau,
#                                                  agrandi, à la racine du dépôt)
#
# Le jeu les lit dans js/engine/monde-sol.js (SOLS_MONDE : mêmes noms, même ordre, mêmes places) ;
# l'herbe, le chemin, l'eau et ses rives d'herbe restent ceux de la planche de la ferme
# (herbe_chemin, eau, rive_herbe : js/engine/planche.js), qui se posent à côté de celles-ci.
#
# La planche : 16 colonnes ; pour chaque sol de SOLS (dans cet ordre), RANGEES = 1 + BORDS + RIVES
# rangées :
#   la 1re        le sol plein, 16 variantes : 0 à 11 courantes, 12 à 15 (plus rares) avec un
#                 détail (un coquillage, un nénuphar, une pomme de pin…) ;
#   les BORDS     le sol posé sur un autre sol, plus bas que lui, BORDS variantes : la tuile n
#                 couvre les coins de la case marqués dans n (« coins de Wang » : haut-gauche si
#                 n & 8, haut-droit si n & 4, bas-gauche si n & 2, bas-droit si n & 1),
#                 transparente ailleurs ; la tuile 0 est vide ;
#   les RIVES     le même, posé sur l'eau : une rive (le bord mouillé, l'écume au pied).
# Puis CHEMINS rangées du chemin posé sur un sol autre que l'herbe (mêmes coins ; sa texture est
# celle du chemin plein de la planche de la ferme, herbe_chemin rangée 4 : ils se raccordent), et
# une rangée de gués : des pierres plates posées sur l'eau, 8 variantes, et une rangée d'eau
# profonde posée sur l'eau peu profonde (mêmes coins).
#
# Raccords. Les sols pleins n'ont pas de dégradé lent ni de forme qui traverse un bord (du grain,
# et des détails posés à l'intérieur) : toutes les variantes se posent côte à côte sans couture,
# et sans motif qui se répète (les variantes sont tirées au hasard, case par case). Le bord d'une
# tuile partielle suit un champ (les coins interpolés, plus un bruit) qui, à moins de MARGE px d'un
# côté, ne dépend que des deux coins de ce côté et d'un bruit commun à toutes les variantes : deux
# tuiles qui partagent un côté y ont le même bord ; plus loin des côtés, chaque variante a son bruit
# (les bords d'une frontière ne se répètent pas). Les sols « doux » (les herbes, la vase, les
# feuilles, le sable…) ont un bord tramé, sans liseré, qui se fond dans le sol d'à côté ; les sols
# « nets » (la roche, la falaise, la neige, les éboulis) un liseré clair côté lumière, sombre côté
# ombre, et l'ombre qu'ils portent.
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
BORDS, RIVES, CHEMINS = 3, 2, 3      # les variantes des bords, des rives, du chemin (SOLS_MONDE)
RANGEES = 1 + BORDS + RIVES
MARGE = 3                     # px du bord où le champ ne dépend que des coins de ce côté
BRUIT_BORD = 0.12             # l'amplitude du bruit commun qui fait onduler les bords
BRUIT_VARIANTE = 0.16         # celle du bruit propre à chaque variante, loin des côtés
TRAME = 0.16                  # la trame d'un bord doux (sa largeur, en part du champ)
ECUME = (255, 255, 255)


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


def mel3(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def trame(x, y):
    """Le seuil de la trame ordonnée en (x, y), de -0.5 à 0.5."""
    return (BAYER[y % 4][x % 4] + 0.5) / 16 - 0.5


# ---------- les sols ----------
#
# Chaque sol : ses tons (fond : le plus sombre, le moyen, le clair), un dessin (une fonction qui
# pose son grain et ses motifs sur la tuile, variante v, détail si v >= 12), le style de son bord
# (doux ou net : liseré clair et sombre, ombre portée), sa face (la falaise : la paroi sous son
# bord) et la teinte de sa rive mouillée.

FORMES = [((0, 0), (1, 0)), ((0, 0), (1, 0), (0, 1)), ((0, 0), (1, 0), (2, 0)), ((0, 0), (1, 0), (1, 1), (2, 1)),
          ((0, 0), (0, 1)), ((0, 0), (1, 0), (0, 1), (1, 1)), ((0, 0),)]


def fond(px, ton, cle, v, taches=14):
    """Le fond : le ton moyen, semé de petites taches (deux à quatre pixels) du ton sombre et du
    ton clair, posées au hasard de la variante (un grain sans dégradé lent ni trame : rien qui
    marque le bord des tuiles ni ne se répète)."""
    sombre, moyen, clair = ton
    for y in range(T):
        for x in range(T):
            px[x, y] = moyen
    for k in range(taches):
        forme = FORMES[int(hasard(cle, v, k, 'f') * len(FORMES))]
        c = sombre if k % 2 == 0 else clair
        x0, y0 = int(hasard(cle, v, k, 'x') * T), int(hasard(cle, v, k, 'y') * T)
        for dx, dy in forme:
            x, y = x0 + dx, y0 + dy
            if x < T and y < T:
                px[x, y] = c


@functools.lru_cache(maxsize=None)
def _herbe_ferme(v):
    p = Image.open(PLANCHE_FERME).convert('RGB')
    return {(x, y): p.getpixel((v * T + x, 45 * T + y)) for y in range(T) for x in range(T)}


HERBE_BASE = (134, 165, 52)      # le ton moyen de l'herbe de la ferme


def herbe(px, v, cible, contraste=0.8, chaleur=0.0):
    """L'herbe de la ferme (herbe_chemin, variante v % 16), reteinte : chaque pixel garde son écart
    de clarté au ton moyen (× contraste), autour de `cible` ; `chaleur` le tire vers le jaune
    quand il est clair (les brins secs). Les sols d'herbe des biomes gardent ainsi ses brins, ses
    points, son dessin."""
    L0 = 0.3 * HERBE_BASE[0] + 0.59 * HERBE_BASE[1] + 0.11 * HERBE_BASE[2]
    for (x, y), c in _herbe_ferme((v * 7 + 3) % 16).items():
        L = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
        k = 1 + contraste * (L / L0 - 1)
        n = tuple(max(0, min(255, round(cible[i] * k))) for i in range(3))
        if chaleur and k > 1.05:
            n = mel3(n, (n[0] + 30, n[1] + 14, max(0, n[2] - 20)), min(1, chaleur * (k - 1) * 4))
        px[x, y] = tuple(max(0, min(255, q)) for q in n)


def seme(px, cle, v, couleurs, densite, marge=0):
    """Des points isolés : [(couleur, part)] avec `densite` points par pixel."""
    for y in range(marge, T - marge):
        for x in range(marge, T - marge):
            r = hasard(cle, v, x, y)
            if r < densite:
                acc = 0
                for c, part in couleurs:
                    acc += part
                    if r < densite * acc:
                        px[x, y] = c
                        break


def place(cle, v, k, marge, larg=0, haut=0):
    """Un point au hasard pour le motif k (à `marge` px au moins des côtés, plus sa taille)."""
    x = marge + int(hasard(cle, v, k, 'x') * (T - 2 * marge - larg))
    y = marge + int(hasard(cle, v, k, 'y') * (T - 2 * marge - haut))
    return x, y


def caillou(px, cx, cy, rx, ry, base, ombre=0.35, anguleux=False):
    """Un caillou vu de haut (une ellipse de rayons rx, ry ; anguleux : un losange arrondi), clair
    en haut à gauche, sombre en bas à droite, une ombre portée dessous."""
    clair, sombre = mel3(base, (246, 242, 232), 0.38), mel3(base, (30, 26, 24), 0.32)
    pts = {}
    for dy in range(-ry - 1, ry + 2):
        for dx in range(-rx - 1, rx + 2):
            e = (abs(dx) / (rx + 0.45) + abs(dy) / (ry + 0.45)) if anguleux else (dx / (rx + 0.45)) ** 2 + (dy / (ry + 0.45)) ** 2
            if e <= 1:
                pts[dx, dy] = True
    for (dx, dy) in pts:
        x, y = cx + dx, cy + dy
        if not (0 <= x < T and 0 <= y < T):
            continue
        c = base
        if (dx - 1, dy) not in pts or (dx, dy - 1) not in pts:
            c = clair
        if (dx + 1, dy) not in pts or (dx, dy + 1) not in pts:
            c = sombre
        px[x, y] = c
    if ombre:
        for (dx, dy) in pts:
            for ox, oy in ((1, 1), (0, 1)):
                q = (dx + ox, dy + oy)
                x, y = cx + q[0], cy + q[1]
                if q not in pts and 0 <= x < T and 0 <= y < T:
                    px[x, y] = mel3(px[x, y], (24, 20, 16), ombre)


def touffe(px, cx, cy, sombre, moyen, clair, haut=3):
    """Une touffe d'herbe vue d'en haut à 45° : quelques brins qui montent en éventail."""
    for k, dx in enumerate((-1, 0, 1)):
        h = haut - abs(dx)
        for t in range(h):
            x, y = cx + dx + (dx if t == h - 1 and dx else 0), cy - t
            if 0 <= x < T and 0 <= y < T:
                px[x, y] = clair if t == h - 1 else moyen if t else sombre
    if 0 <= cy + 1 < T:
        for dx in (-1, 0, 1):
            if 0 <= cx + dx < T:
                px[cx + dx, cy + 1] = mel3(px[cx + dx, cy + 1], (20, 30, 10), 0.35)


# -- le sable : un grain fin, quelques grains sombres, des ridules ; détails : coquillages, galet
def d_sable(px, v):
    fond(px, ((214, 182, 122), (224, 194, 136), (234, 208, 154)), 'sable', v, 18)
    seme(px, 'sable:g', v, [((196, 160, 104), 0.6), ((244, 226, 178), 0.4)], 0.07)
    if v % 3 == 0:     # une ridule laissée par le vent (courte, dans la tuile)
        x0, y0 = place('sable:r', v, 0, 2, 8, 2)
        for k in range(7):
            y = y0 + (1 if 2 <= k <= 4 else 0)
            px[x0 + k, y] = (206, 172, 114)
            px[x0 + k, y - 1] = (238, 216, 166)
    if v >= 12:
        x, y = place('sable:d', v, 0, 3, 3, 2)
        if v % 2:      # un coquillage rosé (une coquille Saint-Jacques en éventail)
            for dx, dy, c in ((0, 0, (246, 214, 204)), (1, 0, (232, 188, 176)), (2, 0, (246, 214, 204)),
                              (0, 1, (222, 176, 164)), (1, 1, (244, 206, 196)), (2, 1, (214, 166, 154)),
                              (1, 2, (196, 150, 136))):
                px[x + dx, y + dy] = c
        else:          # un petit galet
            caillou(px, x + 1, y + 1, 1, 1, (164, 156, 144), 0.3)


# -- les galets : des cailloux ronds serrés sur du sable gris
def d_galets(px, v):
    fond(px, ((178, 166, 140), (190, 178, 152), (200, 190, 166)), 'galets', v, 12)
    tons = [(150, 146, 140), (172, 164, 150), (128, 126, 124), (186, 176, 158), (142, 136, 150)]
    n = 6 + (v % 3)
    for k in range(n):
        x, y = place('galets:c', v, k, 2, 0, 0)
        rx = 1 + (1 if hasard('galets', v, k, 'r') < 0.45 else 0)
        caillou(px, x, y, rx, 1 if rx == 1 else (1 + (hasard('galets', v, k, 's') < 0.5)), tons[int(hasard('galets', v, k, 't') * len(tons))], 0.3)
    if v >= 12:        # un gros galet
        x, y = place('galets:d', v, 0, 4)
        caillou(px, x, y, 3, 2, (158, 154, 148), 0.4)


# -- l'eau basse du marais : une eau sombre et verte, des reflets, des touffes ; détails : nénuphars
def d_eau_basse(px, v):
    fond(px, ((62, 104, 92), (72, 116, 102), (84, 128, 112)), 'eau_basse', v, 14)
    for k in range(2):  # des reflets clairs, couchés
        x, y = place('eau_basse:r', v, k, 2, 4, 0)
        for dx in range(2 + int(hasard('eau_basse', v, k, 'l') * 3)):
            px[x + dx, y] = (128, 170, 156)
    for k in range(1 + v % 2):  # une touffe de joncs
        x, y = place('eau_basse:t', v, k, 3, 0, 2)
        y += 2
        touffe(px, x, y, (56, 92, 36), (88, 132, 48), (128, 168, 64))
        for dx in (-2, 2):      # le rond d'eau autour du pied
            if 0 <= x + dx < T and y + 1 < T:
                px[x + dx, y + 1] = (96, 140, 124)
    if v >= 12:        # un nénuphar
        x, y = place('eau_basse:n', v, 0, 4)
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if dx * dx + dy * dy <= 5 and not (dx >= 1 and dy == 0):
                    px[x + dx, y + dy] = (86, 138, 50) if dx + dy < 1 else (66, 112, 40)
        px[x - 1, y - 1] = (124, 172, 72)
        if v % 2:
            px[x, y - 1], px[x - 1, y] = (240, 220, 230), (226, 190, 204)


# -- la vase : une boue brune et humide, des luisants, des touffes d'herbe ; détails : une flaque
def d_vase(px, v):
    herbe(px, v, (98, 100, 54), 0.4)
    for k in range((v * 5) % 3 // 2):  # de la boue à nu, sombre et luisante
        x0, y0 = place('vase:b', v, k, 1, 4, 2)
        for dy in range(3):
            for dx in range(5):
                if (dx - 2) ** 2 / 6.5 + (dy - 1) ** 2 / 1.6 <= 1 and hasard('vase', v, k, dx, dy) < 0.85:
                    px[x0 + dx, y0 + dy] = (76, 70, 42) if dy else (88, 80, 50)
        px[x0 + 1, y0 + 1] = (132, 132, 100)
    for k in range((0, 1, 2, 0, 1, 1, 2, 0)[v % 8]):   # des touffes de joncs
        x, y = place('vase:t', v, k, 3, 0, 2)
        touffe(px, x, y + 2, (56, 82, 30), (88, 120, 42), (132, 160, 62), 3)
    if v >= 12:        # une petite flaque, son reflet
        x, y = place('vase:f', v, 0, 4, 0, 0)
        for dy in range(-1, 2):
            for dx in range(-3, 4):
                if (dx / 3.4) ** 2 + (dy / 1.6) ** 2 <= 1:
                    px[x + dx, y + dy] = (66, 98, 88) if dy >= 0 else (78, 110, 98)
        px[x - 1, y - 1] = (140, 178, 166)
        px[x + 1, y - 1] = (112, 150, 136)


# -- la terre nue de la lande : brun-ocre, des cailloux, des fentes
def d_terre(px, v):
    fond(px, ((150, 118, 80), (162, 130, 88), (174, 142, 98)), 'terre', v, 18)
    seme(px, 'terre:g', v, [((132, 102, 70), 0.6), ((188, 160, 116), 0.4)], 0.07)
    for k in range(1 + v % 2):
        x, y = place('terre:c', v, k, 2)
        caillou(px, x, y, 1, 1 if k else 0, (156, 150, 138), 0.3)
    if v >= 12:        # une fente sèche
        x, y = place('terre:f', v, 0, 3, 7, 3)
        for k in range(7):
            px[x + k, y] = (118, 90, 60)
            if hasard('terre', v, k) < 0.4:
                y += 1 if hasard('terre', v, k, 's') < 0.5 else -1
                y = max(3, min(T - 4, y))


# -- l'herbe rase de la lande : jaune-olive, de petits brins, de la bruyère ; détails : un ajonc
def d_lande(px, v):
    herbe(px, v, (158, 160, 72), 0.55, 0.6)
    for k in range(2 + v % 2):  # la bruyère : un petit bouquet violet
        x, y = place('lande:h', v, k, 2, 1, 1)
        for dx, dy, c in ((0, 0, (156, 96, 146)), (1, 0, (128, 76, 122)), (0, 1, (110, 70, 100)), (1, 1, (96, 108, 46))):
            px[x + dx, y + dy] = c
    if v >= 12:        # un ajonc en fleur (jaune)
        x, y = place('lande:a', v, 0, 4)
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, -1), (0, 1), (1, 1)):
            px[x + dx, y + dy] = (232, 200, 70) if (dx + dy) % 2 == 0 else (204, 168, 52)
        px[x, y + 2] = (88, 100, 40)


# -- les feuilles mortes de la forêt : un sous-bois vert sombre, des feuilles brunes et rousses
def d_feuilles(px, v):
    herbe(px, v, (70, 98, 40), 0.5)
    tons = [(156, 104, 46), (182, 128, 56), (128, 82, 40), (112, 120, 46), (170, 92, 44)]
    for k in range(4 + v % 3):  # une feuille : trois pixels en coin, la queue plus sombre
        x, y = place('feuilles:f', v, k, 1, 1, 1)
        c = tons[int(hasard('feuilles', v, k, 'c') * len(tons))]
        px[x, y] = mel3(c, (255, 230, 170), 0.18)
        px[x + 1, y] = c
        px[x, y + 1] = c
        px[x + 1, y + 1] = mel3(c, (40, 24, 12), 0.35)
    if v >= 12:        # une brindille
        x, y = place('feuilles:b', v, 0, 3, 6, 3)
        for k in range(6):
            px[x + k, y + k // 3] = (92, 64, 38)
            px[x + k, y + k // 3 + 1] = mel3(px[x + k, y + k // 3 + 1], (20, 24, 10), 0.4)


# -- les aiguilles de pin : un tapis roux, des aiguilles en biais ; détails : une pomme de pin
def d_aiguilles(px, v):
    fond(px, ((96, 72, 44), (110, 82, 50), (124, 94, 58)), 'aiguilles', v, 16)
    for k in range(16):  # des aiguilles : de fins traits de trois pixels, en biais
        x, y = place('aiguilles:a', v, k, 0, 3, 3)
        sx = 1 if hasard('aiguilles', v, k, 's') < 0.5 else -1
        c = (166, 128, 80) if hasard('aiguilles', v, k, 'c') < 0.55 else (92, 66, 42)
        for t in range(3):
            xx = x + (t if sx > 0 else 2 - t)
            yy = y + t if hasard('aiguilles', v, k, 'h') < 0.6 else y + (1 if t == 2 else 0)
            px[xx, yy] = c
    seme(px, 'aiguilles:g', v, [((76, 100, 40), 0.6), ((60, 84, 34), 0.4)], 0.05)
    if v >= 12:        # une pomme de pin
        x, y = place('aiguilles:p', v, 0, 4, 2, 3)
        for dy in range(3):
            for dx in range(2):
                px[x + dx, y + dy] = (138, 92, 50) if (dx + dy) % 2 == 0 else (98, 64, 36)
        px[x, y + 3] = (60, 40, 24)
        px[x + 1, y + 3] = mel3(px[x + 1, y + 3], (20, 16, 10), 0.4)


# -- la mousse : des coussins verts bombés (clairs en haut à gauche) ; détails : des champignons ?
#    non (fiche 5b) : de petites fleurs blanches
def d_mousse(px, v):
    herbe(px, v, (72, 120, 42), 0.45)
    for k in range(3 + v % 2):  # des coussins : un rond, clair en haut à gauche, sombre dessous
        x, y = place('mousse:c', v, k, 3)
        r = 2 if hasard('mousse', v, k, 'r') < 0.6 else 1
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r + 0.5:
                    d = dx + dy
                    px[x + dx, y + dy] = (112, 160, 62) if d < -r * 0.5 else (46, 82, 28) if d > r * 0.6 else (88, 138, 50)
    seme(px, 'mousse:g', v, [((126, 172, 70), 0.5), ((44, 78, 28), 0.5)], 0.05)
    if v >= 12:        # de petites fleurs blanches
        for k in range(3):
            x, y = place('mousse:f', v, k, 3)
            px[x, y] = (238, 240, 226)
            px[x, y + 1] = (60, 96, 36)


# -- les éboulis : des pierres anguleuses grises sur un lit de graviers
def d_eboulis(px, v):
    fond(px, ((134, 126, 116), (146, 138, 126), (158, 150, 138)), 'eboulis', v, 18)
    seme(px, 'eboulis:g', v, [((120, 114, 106), 0.5), ((172, 166, 154), 0.5)], 0.04)
    tons = [(126, 120, 112), (156, 150, 140), (112, 108, 104), (140, 132, 120)]
    for k in range((0, 1, 2, 1, 3, 2, 1, 2)[v % 8]):
        x, y = place('eboulis:p', v, k, 2)
        r = 1 if hasard('eboulis', v, k, 'r') < 0.65 else 2
        caillou(px, x, y, r, max(1, r - (k % 2)), tons[k % len(tons)], 0.35, anguleux=True)
    if v >= 12:        # une grosse pierre
        x, y = place('eboulis:d', v, 0, 5)
        caillou(px, x, y, 3, 2, (134, 128, 120), 0.4, anguleux=True)


# -- la roche nue : de grandes dalles grises, des fissures, du lichen
def d_roche(px, v):
    fond(px, ((122, 118, 114), (132, 128, 124), (144, 140, 134)), 'roche', v, 12)
    seme(px, 'roche:g', v, [((158, 154, 148), 1.0)], 0.04)
    x, y = place('roche:f', v, 0, 2, 9, 4)       # une fissure, son bord éclairé (une fois sur deux)
    for n in range(6 + v % 4 if v % 2 == 0 else 0):
        px[x, y] = (92, 88, 86)
        px[x, y + 1] = (170, 166, 160)
        x += 1
        if hasard('roche', v, n) < 0.4:
            y = max(2, min(T - 4, y + (1 if hasard('roche', v, n, 's') < 0.55 else -1)))
    if v == 5 or v >= 12:   # du lichen
        x, y = place('roche:l', v, 1, 3)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (1, 1)):
            px[x + dx, y + dy] = (156, 162, 102) if (dx + dy) % 2 else (176, 170, 100)


# -- la falaise (vue du dessus : une roche brune et litée ; sa paroi tombe sous son bord)
def d_falaise(px, v):
    fond(px, ((104, 94, 86), (114, 104, 95), (126, 116, 106)), 'falaise', v, 14)
    seme(px, 'falaise:g', v, [((138, 128, 116), 1.0)], 0.05)
    x, y = place('falaise:f', v, 0, 3, 4, 2)    # une fente courte
    for k in range(4):
        px[x + k, y + (k > 1)] = (82, 74, 68)
        px[x + k, y + (k > 1) + 1] = (140, 130, 120)


# -- la neige : un blanc bleuté, des ombres douces, des scintillements ; détails : une congère
def d_neige(px, v):
    fond(px, ((222, 230, 244), (234, 240, 249), (244, 247, 252)), 'neige', v, 12)
    seme(px, 'neige:g', v, [((255, 255, 255), 0.6), ((206, 218, 238), 0.4)], 0.05)
    if v % 3 == 0:     # le creux d'un pas de vent : une ombre bleue courte
        x, y = place('neige:o', v, 0, 2, 6, 1)
        for k in range(5):
            px[x + k, y] = (208, 220, 240)
            px[x + k, y + 1] = (250, 252, 255)
    if v >= 12:        # une congère
        x, y = place('neige:c', v, 0, 4)
        for dx in range(-3, 4):
            for dy in range(0, 2):
                if abs(dx) + dy * 2 <= 3:
                    px[x + dx, y + dy] = (204, 216, 238)
            px[x + dx, y - 1] = (255, 255, 255)


# style : 'doux' (bord tramé, sans liseré) ou 'net' (liseré, ombre portée) ; lisere : (clair,
# sombre) ; ombre : l'opacité de l'ombre portée ; face : la paroi (falaise) ; mouille : la teinte
# du sol mouillé au bord de l'eau
SOLS = {
    'sable': dict(dessin=d_sable, style='doux', lisere=((240, 222, 176), (200, 166, 108)), ombre=0.0, mouille=(176, 150, 104)),
    'galets': dict(dessin=d_galets, style='doux', lisere=((210, 202, 184), (150, 140, 122)), ombre=0.0, mouille=(140, 132, 118)),
    'eau_basse': dict(dessin=d_eau_basse, style='doux', lisere=((98, 140, 120), (52, 88, 76)), ombre=0.0, mouille=(58, 98, 88)),
    'vase': dict(dessin=d_vase, style='doux', lisere=((122, 112, 72), (72, 64, 40)), ombre=0.0, mouille=(70, 64, 40)),
    'terre': dict(dessin=d_terre, style='doux', lisere=((184, 152, 108), (132, 102, 70)), ombre=0.0, mouille=(118, 92, 62)),
    'lande': dict(dessin=d_lande, style='doux', lisere=((176, 176, 90), (116, 124, 50)), ombre=0.0, mouille=(110, 116, 52)),
    'feuilles': dict(dessin=d_feuilles, style='doux', lisere=((92, 118, 52), (44, 66, 26)), ombre=0.0, mouille=(48, 70, 30)),
    'aiguilles': dict(dessin=d_aiguilles, style='doux', lisere=((146, 110, 70), (90, 64, 40)), ombre=0.0, mouille=(90, 66, 42)),
    'mousse': dict(dessin=d_mousse, style='doux', lisere=((110, 158, 60), (44, 80, 28)), ombre=0.0, mouille=(46, 80, 30)),
    'eboulis': dict(dessin=d_eboulis, style='net', lisere=((178, 172, 162), (102, 96, 90)), ombre=0.18, mouille=(104, 100, 94)),
    'roche': dict(dessin=d_roche, style='net', lisere=((170, 166, 160), (88, 86, 84)), ombre=0.26, mouille=(96, 94, 92)),
    'falaise': dict(dessin=d_falaise, style='net', lisere=((148, 138, 126), (74, 68, 64)), ombre=0.3, mouille=(80, 74, 70),
                    face=[(98, 90, 84), (88, 80, 75), (78, 71, 67), (68, 62, 59), (58, 53, 51)]),
    'neige': dict(dessin=d_neige, style='net', lisere=((255, 255, 255), (184, 198, 226)), ombre=0.14, mouille=(196, 208, 228)),
}
GUE = [(150, 146, 138), (178, 174, 166), (116, 112, 106), (204, 200, 192)]   # pierre : fond, clair, ombre, reflet


@functools.lru_cache(maxsize=None)
def tuile_pleine(nom, v):
    """Le sol plein `nom`, variante v : {(x, y): (r, g, b)}."""
    px = {}
    SOLS[nom]['dessin'](px, v)
    return px


# ---------- les coins : le champ du bord ----------

def _forme(n, u, v):
    """La forme des coins n en (u, v) (de 0 à 1 sur la tuile) : plus de 0.5 dedans. Comme les
    « carrés qui marchent » : la frontière coupe chaque côté en son milieu (là où ses deux coins
    diffèrent) et va droit d'un côté à l'autre ; un coin seul est un triangle, deux coins d'un même
    côté un demi-carré, trois coins le carré moins le triangle du quatrième. Une frontière en biais
    (des coins en escalier) devient ainsi une ligne droite à 45°, et non des marches."""
    a, b, c, d = (n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1
    tentes = ((a, 1 - u - v), (b, u - v), (c, v - u), (d, u + v - 1))
    if a + b + c + d >= 3:
        # le carré moins le triangle du coin qui manque
        return 1 - max(t for k, t in tentes if not k)
    f = max([t for k, t in tentes if k] + [0.0])
    for k, t in (((a and b), 1 - v), ((c and d), v), ((a and c), 1 - u), ((b and d), u)):
        if k:
            f = max(f, t)
    return f


def _fenetre(x, y):
    """0 à moins de MARGE px d'un côté, jusqu'à 1 au milieu : là où une variante a son bruit."""
    d = min(x + 0.5, T - 0.5 - x, y + 0.5, T - 0.5 - y) - MARGE
    return 0.0 if d <= 0 else min(1.0, d / 3)


def champ(n, j, x, y):
    """Le champ des coins n (variante j) au pixel (x, y), même un peu hors de la tuile (il y est
    pris au bord de la tuile : celui de la voisine) : plus de 0.5, le sol de ces coins. Un bruit
    commun à toutes les tuiles (périodique) fait onduler la frontière ; loin des côtés, un bruit
    propre à la variante."""
    u = min(1.0, max(0.0, (x + 0.5) / T)) if 0 <= x < T else (0.0 if x < 0 else 1.0)
    v = min(1.0, max(0.0, (y + 0.5) / T)) if 0 <= y < T else (0.0 if y < 0 else 1.0)
    f = _forme(n, u, v)
    f += (bruits('bord', x % T, y % T) - 0.5) * 2 * BRUIT_BORD
    if 0 <= x < T and 0 <= y < T:
        f += (bruits('bord:' + str(j), x, y) - 0.5) * 2 * BRUIT_VARIANTE * _fenetre(x, y)
    return f


def dedans(n, j, x, y, doux=False):
    """Le pixel (x, y) (même un peu hors de la tuile : jusqu'à MARGE px) est-il couvert par le sol
    des coins n ? Doux : par une trame (le bord se fond dans le sol d'à côté)."""
    if n in (0, 15):
        return n == 15
    f = champ(n, j, x, y)
    if doux:
        f += trame(x % T, y % T) * TRAME
    return f > 0.5


def partielle(nom, n, j, rive):
    """La tuile du sol `nom` sur les coins n, variante j (transparente ailleurs) ; `rive` : sur
    l'eau."""
    S = SOLS[nom]
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    if n == 0:
        return im
    doux = S['style'] == 'doux' and not rive
    tex = tuile_pleine(nom, (j * 5 + n) % 12)
    D = lambda x, y: dedans(n, j, x, y, doux)  # noqa: E731
    clair, sombre = S['lisere']
    for y in range(T):
        for x in range(T):
            if D(x, y):
                c = tex[x, y]
                if not doux:
                    if not D(x - 1, y) or not D(x, y - 1):
                        c = clair            # le bord éclairé (haut, gauche)
                    if not D(x + 1, y) or not D(x, y + 1):
                        c = sombre           # le bord dans l'ombre (bas, droite)
                elif not D(x + 1, y + 1) and not D(x, y + 1):
                    c = mel3(c, sombre, 0.5)  # (doux : un rien plus sombre au pied)
                if rive:
                    # le sol mouillé, sur deux pixels, puis un pixel plus sombre au ras de l'eau
                    pres = not all(D(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                    loin = not all(D(x + dx, y + dy) for dx in (-2, 0, 2) for dy in (-2, 0, 2))
                    if pres:
                        c = mel3(c, S['mouille'], 0.75)
                    elif loin:
                        c = mel3(c, S['mouille'], 0.4)
                im.putpixel((x, y), c + (255,))
                continue
            # dehors : la face d'une falaise sous son bord, l'ombre portée, l'écume
            if S.get('face'):
                for k in range(1, len(S['face']) + 1):
                    if D(x, y - k):
                        c = S['face'][k - 1]
                        if (x + k) % 5 == 0:
                            c = mel3(c, (40, 36, 34), 0.25)    # des fentes verticales
                        im.putpixel((x, y), c + (255,))
                        break
                if im.getpixel((x, y))[3]:
                    continue
            if rive:
                if any(D(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    im.putpixel((x, y), ECUME + (200,))
                elif any(D(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, 1), (1, -1), (-1, -1))) and (x + 2 * y) % 3 == 0:
                    im.putpixel((x, y), ECUME + (110,))
            elif S['ombre'] and (D(x - 1, y - 1) or D(x, y - 1)):
                im.putpixel((x, y), (20, 24, 16, round(255 * S['ombre'])))
    return im


def depuis(px):
    im = Image.new('RGBA', (T, T))
    for (x, y), c in px.items():
        im.putpixel((x, y), c + (255,))
    return im


# ---------- le chemin et le gué ----------

def texture_chemin():
    """La texture du chemin plein de la planche de la ferme (herbe_chemin, rangée 4, tuile 0)."""
    p = Image.open(PLANCHE_FERME).convert('RGB')
    x0, y0 = 0, (45 + 4) * T
    return {(x, y): p.getpixel((x0 + x, y0 + y)) for y in range(T) for x in range(T)}


def chemin(n, j, tex):
    """Le chemin de la ferme sur les coins n (variante j), posé sur un autre sol : son bord tassé
    plus sombre, une ombre légère au pied du sol d'à côté."""
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    if n == 0:
        return im
    D = lambda x, y: dedans(n, j + 7, x, y)  # noqa: E731
    for y in range(T):
        for x in range(T):
            if D(x, y):
                c = tex[x, y]
                if not all(D(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    c = mel3(c, (84, 54, 32), 0.45)       # le bord tassé
                elif not all(D(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2))):
                    c = mel3(c, (120, 80, 50), 0.15)
                im.putpixel((x, y), c + (255,))
            elif D(x, y - 1) or D(x - 1, y):
                im.putpixel((x, y), (40, 30, 20, 70))    # un peu d'ombre au pied
    return im


def gue(v):
    """Des pierres plates sur l'eau (transparente) : trois ou quatre, en travers de la case, un
    remous clair autour."""
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    fond_, clair, ombre, reflet = GUE
    pierres = [(4, 4), (11, 5), (5, 11), (12, 12)]
    for k, (cx, cy) in enumerate(pierres):
        if hasard('gue', v, k) < 0.2 and k:
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
                    c = clair if dy < 0 and dx < 1 else fond_
                    if dy == ry or (dy == ry - 1 and abs(dx) == rx):
                        c = ombre
                    im.putpixel((x, y), c + (255,))
                elif e <= 1.8 and dy >= 0:
                    im.putpixel((x, y), ECUME + (130,))
        im.putpixel((cx - 1, cy - 1), reflet + (255,))
    return im


# ---------- la planche ----------

TONS_EAU = [(76, 172, 214), (60, 146, 200), (46, 120, 184), (34, 96, 170)]   # scripts/carte/eau.py, TONS


def profond(n):
    """L'eau profonde sur les coins n, posée sur l'eau peu profonde (scripts/carte/eau.py : ses
    tons) : la même forme que les bords des sols (une frontière droite en biais, qui ondule), un
    dégradé tramé en trois tons. Pour la mer, les lacs et les rivières du monde : la limite du
    profond suit la rive sans faire d'escalier."""
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    if n == 0:
        return im
    for y in range(T):
        for x in range(T):
            f = champ(n, 9, x, y) + trame(x, y) * 0.12 if n != 15 else 1.0
            if f > 0.66:
                c = TONS_EAU[3]
                if hasard('profond', n, x, y) < 0.08:
                    c = (28, 86, 158) if hasard('profond', n, x, y, 'c') < 0.6 else (40, 104, 178)
            elif f > 0.56:
                c = TONS_EAU[2]
            elif f > 0.46:
                c = TONS_EAU[1]
            else:
                continue
            im.putpixel((x, y), c + (255,))
    return im


def planche():
    rangees = RANGEES * len(SOLS) + CHEMINS + 2
    out = Image.new('RGBA', (COLS * T, rangees * T), (0, 0, 0, 0))
    for k, nom in enumerate(SOLS):
        r0 = RANGEES * k
        for v in range(16):
            out.paste(depuis(tuile_pleine(nom, v)), (v * T, r0 * T))
        for j in range(BORDS):
            for n in range(16):
                out.paste(partielle(nom, n, j, False), (n * T, (r0 + 1 + j) * T))
        for j in range(RIVES):
            for n in range(16):
                out.paste(partielle(nom, n, j, True), (n * T, (r0 + 1 + BORDS + j) * T))
    tc = texture_chemin()
    for j in range(CHEMINS):
        for n in range(16):
            out.paste(chemin(n, j, tc), (n * T, (RANGEES * len(SOLS) + j) * T))
    for v in range(8):
        out.paste(gue(v), (v * T, (RANGEES * len(SOLS) + CHEMINS) * T))
    for n in range(16):
        out.paste(profond(n), (n * T, (RANGEES * len(SOLS) + CHEMINS + 1) * T))
    return out


def couleur_moyenne(nom):
    """La couleur moyenne du sol plein (ses 16 variantes) : celle du sol uni provisoire
    (COULEURS_BIOMES, js/engine/monde-sol.js)."""
    s = [0, 0, 0]
    for v in range(16):
        for c in tuile_pleine(nom, v).values():
            for i in range(3):
                s[i] += c[i]
    return '#' + ''.join(f'{round(x / (16 * T * T)):02x}' for x in s)


def essai(out):
    """Un essai de raccords : chaque sol en tache (aux coins tirés par un bruit) sur l'herbe de la
    ferme, sur l'eau et sur le sol d'avant lui."""
    ferme = Image.open(PLANCHE_FERME).convert('RGBA')
    herbe = [ferme.crop((k * T, 45 * T, (k + 1) * T, 46 * T)) for k in range(16)]
    eau = ferme.crop((32 * T, 45 * T, 33 * T, 46 * T))
    noms = list(SOLS)
    W, H = 12, 9
    im = Image.new('RGBA', (W * T * len(SOLS), H * T * 3), (0, 0, 0, 255))
    tuile = lambda r, c: out.crop((c * T, r * T, (c + 1) * T, (r + 1) * T))  # noqa: E731
    for k, nom in enumerate(noms):
        coin = lambda x, y: ((x - W / 2) / 4.2) ** 2 + ((y - H / 2) / 3) ** 2 + (hasard('essai', k, x, y) - 0.5) * 0.9 < 1  # noqa: E731
        for bande in range(3):
            for ty in range(H):
                for tx in range(W):
                    X, Y = (k * W + tx) * T, (bande * H + ty) * T
                    r = int(hasard('v', k, tx, ty, bande) * 1000)
                    if bande == 0:
                        im.paste(herbe[r % 16], (X, Y))
                    elif bande == 1:
                        im.paste(eau, (X, Y))
                    else:
                        im.alpha_composite(tuile(RANGEES * max(0, k - 1), r % 12), (X, Y))
                    n = (8 if coin(tx, ty) else 0) | (4 if coin(tx + 1, ty) else 0) | (2 if coin(tx, ty + 1) else 0) | (1 if coin(tx + 1, ty + 1) else 0)
                    if n == 15:
                        t = tuile(RANGEES * k, r % 16 if r % 6 == 0 else r % 12)
                    else:
                        rang = RANGEES * k + (1 + BORDS + r % RIVES if bande == 1 else 1 + r % BORDS)
                        t = tuile(rang, n)
                    im.alpha_composite(t, (X, Y))
    return im


def main():
    out = planche()
    out.save(SORTIE)
    print(f'assets/sols_monde.png : {out.width // T} × {out.height // T} tuiles ({len(SOLS)} sols, le chemin, le gué, l\'eau profonde)')
    print('couleurs moyennes : ' + ', '.join(f'{n} {couleur_moyenne(n)}' for n in SOLS))
    if '--apercu' in sys.argv:
        apercu(essai(out), 'apercu_sols_monde.png', zoom=2)


if __name__ == '__main__':
    main()
