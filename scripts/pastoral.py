# Outils communs aux dessins faits en code, d'après le guide graphique
# (docs/direction-artistique/guide-graphique-pastoral.md, style_pastoral.json) :
#   - palette fermée de 60 couleurs (assets/palette_pastorale.gpl), désignées par leur
#     identifiant (V3, N2, W0…) : aucun pixel n'en sort ;
#   - lumière unique en haut à gauche, 4 à 5 aplats durs, environ 35 % d'ombre ;
#   - contour selon la famille : construit (1 px continu, ton le plus sombre du matériau),
#     organique (côté ombre seulement), feuillage (bord d'ombre cerné, bord éclairé ouvert),
#     terrain (aucun) ;
#   - textures en amas de 2 à 12 px, jamais de bruit pixel par pixel ;
#   - ombre de contact : bande de 1 à 2 px de prune translucide (S0 à 41 %) sous les objets
#     posés (rochers, tonneaux, panneaux, champignons), jamais sous les arbres, les buissons ni
#     les bâtiments.
import math
import os
import random

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
GPL = os.path.join(ROOT, 'assets', 'palette_pastorale.gpl')
HEX = os.path.join(ROOT, 'assets', 'palette_pastorale.hex')

# Ombre de contact (guide, version 2) : seule couleur semi-transparente admise par qa_sprites.py.
OMBRE_CONTACT = (44, 15, 40, 105)


def load_palette():
    pal = {}
    for line in open(GPL, encoding='utf8'):
        parts = line.split()
        if len(parts) >= 4 and parts[0].isdigit():
            pal[parts[3]] = (int(parts[0]), int(parts[1]), int(parts[2]))
    assert len(pal) == 60, len(pal)
    return pal


PAL = load_palette()


def rgba(c):
    if isinstance(c, str):
        return PAL[c] + (255,)
    return tuple(c) if len(c) == 4 else tuple(c) + (255,)


class Canvas:
    """Toile en pixels logiques ; on y pose des identifiants de la palette."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = rgba(c)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def opaque(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h and self.px[x, y][3] == 255

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def hline(self, x0, x1, y, c):
        for x in range(x0, x1 + 1):
            self.put(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(y0, y1 + 1):
            self.put(x, y, c)

    def box(self, x0, y0, x1, y1, c):
        self.hline(x0, x1, y0, c)
        self.hline(x0, x1, y1, c)
        self.vline(x0, y0, y1, c)
        self.vline(x1, y0, y1, c)

    def paste(self, other, x, y):
        self.im.alpha_composite(other.im if isinstance(other, Canvas) else other, (x, y))


# ---------------------------------------------------------------- lumière

LIGHT = (-1 / math.sqrt(2), -1 / math.sqrt(2))      # vers la lumière : haut-gauche


def level(nx, ny, bias=0.0):
    """Niveau de lumière d'une surface ronde de normale (nx, ny) (longueur ≤ ~1) :
    4 = reflet, 3 = lumière, 2 = base, 1 = ombre, 0 = ombre profonde. Les seuils visent les
    parts du guide : environ 35 % de lumières, 28 % de base, 35 % d'ombres."""
    lit = nx * LIGHT[0] + ny * LIGHT[1] + bias
    if lit > 0.55:
        return 4
    if lit > 0.12:
        return 3
    if lit > -0.22:
        return 2
    if lit > -0.62:
        return 1
    return 0


# ---------------------------------------------------------------- contours

def _neighbours(inside, x, y):
    return [(dx, dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if inside(x + dx, y + dy)]


def outline_construit(cv, inside, color):
    """Contour continu de 1 px, à l'extérieur de la forme."""
    pts = [(x, y) for y in range(-1, cv.h + 1) for x in range(-1, cv.w + 1)
           if not inside(x, y) and _neighbours(inside, x, y)]
    for x, y in pts:
        cv.put(x, y, color)


def edge_pixels(inside, w, h):
    """Pixels de la forme qui touchent l'extérieur, avec le côté où se trouve le vide."""
    out = {}
    for y in range(h):
        for x in range(w):
            if not inside(x, y):
                continue
            sides = [(dx, dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if not inside(x + dx, y + dy)]
            if sides:
                out[(x, y)] = sides
    return out


def outline_cote_ombre(cv, inside, color, lit_color=None):
    """Contour sur le bord de la forme, côté ombre seulement (bas et droite) ; le bord éclairé
    touche le fond (ou prend `lit_color`, un ton du matériau)."""
    for (x, y), sides in edge_pixels(inside, cv.w, cv.h).items():
        if any(dx > 0 or dy > 0 for dx, dy in sides):
            cv.put(x, y, color)
        elif lit_color:
            cv.put(x, y, lit_color)


def outline_feuillage(cv, inside, dark, mid, seed=0):
    """Feuillage : bord d'ombre (bas, droite) cerné du ton sombre ; bord éclairé ouvert, à part
    quelques amas du ton intermédiaire au creux des dentelures."""
    r = random.Random(seed)
    edges = edge_pixels(inside, cv.w, cv.h)
    for (x, y), sides in edges.items():
        shadow_side = any(dx > 0 or dy > 0 for dx, dy in sides)
        lit_side = any(dx < 0 or dy < 0 for dx, dy in sides)
        if shadow_side and not lit_side:
            cv.put(x, y, dark)
        elif shadow_side and lit_side:
            cv.put(x, y, mid)
        elif (x // 3 + y // 3 + seed) % 4 == 0 and r.random() < 0.5:
            cv.put(x, y, mid)


# ---------------------------------------------------------------- textures et ombres

def amas(rng, cx, cy, size):
    """Un amas de `size` pixels (2 à 12) autour de (cx, cy), compact et irrégulier."""
    pts = {(cx, cy)}
    while len(pts) < size:
        x, y = rng.choice(sorted(pts))
        dx, dy = rng.choice(((1, 0), (-1, 0), (0, 1), (0, -1), (1, 0), (-1, 0)))
        pts.add((x + dx, y + dy))
    return pts


def ombre_contact(cv, x0, x1, y, rows=2):
    """Bande d'ombre de contact sous le pied, de x0 à x1, sur `rows` rangées à partir de y
    (seulement là où le dessin est transparent)."""
    for yy in range(y, y + rows):
        inset = yy - y
        for x in range(x0 + inset, x1 - inset + 1):
            if 0 <= x < cv.w and 0 <= yy < cv.h and cv.px[x, yy][3] == 0:
                cv.px[x, yy] = OMBRE_CONTACT


# ---------------------------------------------------------------- contrôle

def qa(sprites, folder):
    """Écrit chaque sprite sous le nom attendu par qa_sprites.py et lance le contrôle.
    `sprites` : {nom_de_fichier: Image}. Renvoie (nombre de rejets, texte du rapport)."""
    import subprocess
    import sys
    os.makedirs(folder, exist_ok=True)
    paths = []
    for name, im in sprites.items():
        p = os.path.join(folder, name)
        im.save(p)
        paths.append(p)
    res = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'qa_sprites.py'), HEX] + paths,
                         capture_output=True, text=True)
    rejets = res.stdout.count('REJET')
    return rejets, res.stdout
