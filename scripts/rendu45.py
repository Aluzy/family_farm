# Un petit rendu « vue de haut à 45° » pour les objets ronds de la ferme (le puits, le
# réfrigérateur ; le silo a le sien en JS, js/carte/ferme/silo.js, sur le même principe) : des
# surfaces décrites en 3D, échantillonnées finement, projetées comme les blocs
# (scripts/carte/blocs.py : une hauteur de h px se voit sur h × HAUT, une profondeur de p px
# sur p × FOND), un tampon de profondeur, puis un contour sombre d'un pixel.
#
# Repère : x vers la droite, d vers le fond (devant : d < 0), z vers le haut. La lumière vient
# d'en haut à gauche, un peu de devant. Chaque surface donne sa couleur d'après sa matière et
# son éclairement s (0 à 1 : la normale contre la lumière) ; ton() la prend dans une rampe (du
# plus sombre au plus clair).
import math

from PIL import Image

HAUT, FOND = 14 / 16, 10 / 16
_L = (-0.55, -0.45, 0.70)
LUMIERE = tuple(c / math.sqrt(sum(v * v for v in _L)) for c in _L)
TRAIT = (36, 30, 20)                 # le contour (celui des blocs)
PAS = 0.25                           # l'écart entre deux points échantillonnés (px)


class Toile:
    """Une image w × h ; (x0, y0) : où tombe le point (0, 0, 0). `lies` : les paires d'objets
    sans trait entre eux (la corde sous le toit…)."""

    def __init__(self, w, h, x0, y0, lies=()):
        self.w, self.h, self.x0, self.y0 = w, h, x0, y0
        self.buf = {}
        self.lies = set(lies) | {(b, a) for a, b in lies}

    def point(self, x, d, z, couleur, obj):
        sx = math.floor(self.x0 + x)
        sy = math.floor(self.y0 - z * HAUT - d * FOND)
        if not (0 <= sx < self.w and 0 <= sy < self.h):
            return
        k = z * FOND - d * HAUT          # plus grand : plus près de l'œil
        old = self.buf.get((sx, sy))
        if old is None or k > old[0]:
            self.buf[(sx, sy)] = (k, couleur, obj)

    def image(self, traits=True, ecart=2.5):
        """L'image : les points, un trait là où un objet passe devant un autre (bien plus loin
        derrière lui), et le contour autour du tout."""
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for (x, y), (k, c, o) in self.buf.items():
            px[x, y] = tuple(c) + (255,)
        if traits:
            for (x, y), (k, c, o) in self.buf.items():
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    v = self.buf.get((x + dx, y + dy))
                    if v is not None and v[2] != o and v[0] < k - ecart and (o, v[2]) not in self.lies:
                        px[x + dx, y + dy] = TRAIT + (255,)
        src = im.copy().load()
        for y in range(self.h):
            for x in range(self.w):
                if not src[x, y][3] and any(0 <= x + a < self.w and 0 <= y + b < self.h and src[x + a, y + b][3]
                                            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    px[x, y] = TRAIT + (255,)
        return im


def eclairage(n):
    l = math.sqrt(sum(c * c for c in n)) or 1
    return max(0.0, sum(a * b / l for a, b in zip(n, LUMIERE)))


def ton(rampe, s, decal=0):
    """La couleur de la rampe pour l'éclairement s, décalée de `decal` tons."""
    i = int(round(s * (len(rampe) - 1))) + decal
    return rampe[max(0, min(len(rampe) - 1, i))]


def frange(a, b, pas=PAS):
    n = max(1, int(math.ceil((b - a) / pas)))
    return [a + (b - a) * i / n for i in range(n + 1)]


def cylindre(t, cx, cd, r, z0, z1, couleur, obj, interieur=False):
    """Le flanc d'un cylindre vertical ; couleur(phi, z, s), phi : 0 à droite, -pi/2 devant.
    `interieur` : vu du dedans (la paroi d'un puits)."""
    n = max(8, int(2 * math.pi * r / PAS))
    for z in frange(z0, z1):
        for i in range(n):
            phi = 2 * math.pi * i / n
            nx, nd = math.cos(phi), math.sin(phi)
            s = eclairage((-nx, -nd, 0) if interieur else (nx, nd, 0))
            t.point(cx + r * nx, cd + r * nd, z, couleur(phi, z, s), obj)


def disque(t, cx, cd, r0, r1, z, couleur, obj, relief=None):
    """Un anneau horizontal (rayons r0 à r1) à la hauteur z ; couleur(rho, phi, s).
    relief(rho, phi) -> (dz, normale) le bombe (un cône, un dôme)."""
    for rho in frange(r0, r1):
        n = max(8, int(2 * math.pi * max(rho, 0.5) / PAS))
        for i in range(n):
            phi = 2 * math.pi * i / n
            dz, nrm = (0, (0, 0, 1)) if relief is None else relief(rho, phi)
            t.point(cx + rho * math.cos(phi), cd + rho * math.sin(phi), z + dz, couleur(rho, phi, eclairage(nrm)), obj)


def boite(t, x0, x1, d0, d1, z0, z1, couleur, obj):
    """Un pavé (le dessus, le devant, les deux côtés) ; couleur(face, u, v, s) : sur le dessus
    (x, d), sur le devant (x, z), sur un côté (d, z)."""
    for x in frange(x0, x1):
        for d in frange(d0, d1):
            t.point(x, d, z1, couleur('dessus', x, d, eclairage((0, 0, 1))), obj)
        for z in frange(z0, z1):
            t.point(x, d0, z, couleur('devant', x, z, eclairage((0, -1, 0))), obj)
    for d in frange(d0, d1):
        for z in frange(z0, z1):
            t.point(x0, d, z, couleur('gauche', d, z, eclairage((-1, 0, 0))), obj)
            t.point(x1, d, z, couleur('droite', d, z, eclairage((1, 0, 0))), obj)
