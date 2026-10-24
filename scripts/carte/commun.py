# Outils communs des cartes (venus de l'ancienne ville : grotte.py, fleche.py, briques.py,
# faune.py) : les toiles du monde (une par matière et par
# couche), les planches de tuiles 16 × 16 qu'on en découpe (une par matière), l'écriture des jeux
# de tuiles Tiled (.tsx) et quelques aides de dessin.
#
# Le principe : chaque matière est peinte sur sa propre toile, à la taille de la carte, avec des
# motifs qui se répètent tous les 16 px (ou 32, 64) et calés sur la grille. La découpe en tuiles
# retrouve alors les mêmes tuiles d'un bout à l'autre de la ville : une planche ne garde qu'un
# exemplaire de chaque tuile.
#
# Les chemins du dépôt, le hasard fixe, le mélange de couleurs et le contour viennent de
# scripts/pixel.py, comme pour les autres dossiers.
import math
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
import pixel  # noqa: E402
from pixel import ASSETS, ROOT, T, hasard, mel  # noqa: E402,F401
W, H = 168, 219               # la carte, en tuiles (la maquette de la ville en photo, à 3 px de carte pour 1 px de photo)
K = (40, 31, 31)              # le contour


def teinte(c, f):
    """f < 1 assombrit, f > 1 éclaircit (vers le blanc)."""
    if f <= 1:
        return tuple(round(v * f) for v in c[:3])
    return mel(c[:3], (255, 255, 255), f - 1)


def rgba(c, a=255):
    return tuple(c[:3]) + (a,)


def contour(im, couleur=K, diagonales=False):
    """Un contour d'un pixel autour du dessin (sur les pixels transparents voisins de pixels
    plus qu'à moitié opaques)."""
    return pixel.contour(im, couleur, diagonales, seuil=128)


def image(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def dessin(im):
    return ImageDraw.Draw(im)


class Toile:
    """Une couche de la carte entière (W × H tuiles), peinte au pixel. `images` > 1 : une
    animation (l'eau des fontaines), chaque image peinte à part."""

    def __init__(self, nom, planche, images=1):
        self.nom, self.planche = nom, planche
        self.images = [image(W * T, H * T) for _ in range(images)]
        self.px = [im.load() for im in self.images]

    def put(self, x, y, c, k=None):
        if not (0 <= x < W * T and 0 <= y < H * T):
            return
        a = c[3] if len(c) == 4 else 255
        for i in (range(len(self.px)) if k is None else (k,)):
            if a >= 255:
                self.px[i][x, y] = rgba(c)
            elif a > 0:
                d = self.px[i][x, y]
                if d[3] == 0:
                    self.px[i][x, y] = rgba(c, a)
                else:
                    t = a / 255
                    na = round(255 * (t + d[3] / 255 * (1 - t)))
                    self.px[i][x, y] = rgba(mel(d, c, t), na)

    def get(self, x, y, k=0):
        if not (0 <= x < W * T and 0 <= y < H * T):
            return (0, 0, 0, 0)
        return self.px[k][x, y]

    def colle(self, sprite, x, y, k=None):
        """Pose une image (ou une liste d'images, une par image d'animation) au pixel (x, y)."""
        frames = sprite if isinstance(sprite, (list, tuple)) else [sprite] * len(self.images)
        x, y = round(x), round(y)
        for i, im in enumerate(self.images):
            if k is not None and i != k:
                continue
            f = frames[min(i, len(frames) - 1)]
            # rogné au bord de la carte (alpha_composite ne prend pas de position négative)
            gx, gy = max(0, -x), max(0, -y)
            if gx >= f.width or gy >= f.height:
                continue
            f = f.crop((gx, gy, f.width, f.height))
            if f.width > 0 and f.height > 0 and x + gx < im.width and y + gy < im.height:
                im.alpha_composite(f, (x + gx, y + gy))
        self.px = [im.load() for im in self.images]

    def remplit(self, x0, y0, x1, y1, f, k=None):
        """Peint les pixels [x0, x1[ × [y0, y1[ : f(x, y) donne la couleur (ou None)."""
        for y in range(max(0, y0), min(H * T, y1)):
            for x in range(max(0, x0), min(W * T, x1)):
                c = f(x, y)
                if c is not None:
                    self.put(x, y, c, k)

    def contour(self, couleur=K):
        self.images = [contour(im, couleur) for im in self.images]
        self.px = [im.load() for im in self.images]


class Planche:
    """Un jeu de tuiles d'une matière : assets/<nom>.png et assets/<nom>.tsx. Chaque tuile
    n'y est gardée qu'une fois. Une planche animée (images > 1) range l'image k de chaque
    tuile k blocs plus bas (la tuile t + k × colonnes × rangées), le .tsx le déclare."""

    def __init__(self, nom, titre, images=1, duree=220, colonnes=16):
        self.nom, self.titre, self.images, self.duree, self.colonnes = nom, titre, images, duree, colonnes
        self.tuiles = []
        self.cles = {}
        self.noms = {}
        self.wangs = []

    def ajoute(self, frames, nom=None):
        frames = list(frames) if isinstance(frames, (list, tuple)) else [frames]
        frames += [frames[-1]] * (self.images - len(frames))
        cle = b''.join(f.tobytes() for f in frames)
        if cle not in self.cles:
            self.cles[cle] = len(self.tuiles)
            self.tuiles.append(frames)
        t = self.cles[cle]
        if nom and nom not in self.noms:
            self.noms[nom] = t
        return t

    def rangees(self):
        return max(1, math.ceil(len(self.tuiles) / self.colonnes))

    def nombre(self):
        """Le nombre de numéros de tuile que la planche occupe (images d'animation comprises)."""
        return self.colonnes * self.rangees() * self.images

    def ecrit(self, garde=False):
        """Écrit le .png et le .tsx. garde : le .png est une planche retouchée à la main, on la
        laisse telle quelle (elle doit avoir encore la taille de la planche dessinée : ses
        tuiles aux mêmes places), seul le .tsx est réécrit."""
        c, r = self.colonnes, self.rangees()
        im = image(c * T, r * T * self.images)
        for t, frames in enumerate(self.tuiles):
            for k, f in enumerate(frames):
                im.paste(f, ((t % c) * T, (t // c + k * r) * T))
        png = os.path.join(ASSETS, self.nom + '.png')
        if garde and os.path.exists(png):
            taille = Image.open(png).size
            if taille != im.size:
                raise SystemExit(f'{self.nom}.png (retouchée) fait {taille}, la planche dessinée {im.size} : '
                                 'ses tuiles ont bougé, relancer avec --redessine puis reprendre les retouches')
        else:
            im.save(png, optimize=True)
        noms = {t: n for n, t in sorted(self.noms.items(), key=lambda kv: kv[0])}
        lignes = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<tileset version="1.10" tiledversion="1.12.2" name="{self.nom}" tilewidth="{T}" tileheight="{T}" tilecount="{self.nombre()}" columns="{c}">',
            f' <!-- {self.titre} -->',
            f' <image source="{self.nom}.png" width="{im.width}" height="{im.height}"/>',
        ]
        for t, frames in enumerate(self.tuiles):
            anime = self.images > 1 and any(f.tobytes() != frames[0].tobytes() for f in frames[1:])
            if t not in noms and not anime:
                continue
            corps = ''
            if t in noms:
                corps += f'<properties><property name="nom" value="{noms[t]}"/></properties>'
            if anime:
                corps += '<animation>' + ''.join(f'<frame tileid="{t + k * c * r}" duration="{self.duree}"/>' for k in range(self.images)) + '</animation>'
            lignes.append(f'  <tile id="{t}">{corps}</tile>')
        if self.wangs:
            lignes.append(' <wangsets>')
            for nom, (n1, c1), (n2, c2), ids in self.wangs:
                lignes += [f'  <wangset name="{nom}" type="corner" tile="{ids[15]}">',
                           f'   <wangcolor name="{n1}" color="{c1}" tile="{ids[0]}" probability="1"/>',
                           f'   <wangcolor name="{n2}" color="{c2}" tile="{ids[15]}" probability="1"/>']
                for n, t in enumerate(ids):
                    v = lambda bit: 2 if n & bit else 1
                    lignes.append(f'   <wangtile tileid="{t}" wangid="0,{v(4)},0,{v(1)},0,{v(2)},0,{v(8)}"/>')
                lignes.append('  </wangset>')
            lignes.append(' </wangsets>')
        lignes.append('</tileset>')
        with open(os.path.join(ASSETS, self.nom + '.tsx'), 'w') as f:
            f.write('\n'.join(lignes) + '\n')
        return im
