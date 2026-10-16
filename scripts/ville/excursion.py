# Les outils communs des cartes du voyage en train (scripts/ville/montagne.py, plage.py), sur
# le modèle de la carte de transition (scripts/ville/transition.py) : le sol par coins (l'herbe
# et le chemin de la ferme, les sols de scripts/ville/sol.py et leurs passages), les toiles
# découpées en tuiles, l'écriture de la carte Tiled (.tmj) et de ses couches d'objets, et ce
# que les deux cartes partagent : la voie ferrée en terminus, son heurtoir, le quai, la gare,
# les rochers, l'eau.
#
# Le script de chaque carte fixe la taille (commun.W, commun.H) avant d'importer ce module.
import json
import math
import os
import sys

import commun
import equipements as E
import ferme as F
import immeubles as I
import objets as O
import sol as S
from commun import ASSETS, ROOT, K, T, Toile, contour, hasard, image, mel, rgba, teinte

# Les couches de bâtiment ont les noms de la ville : js/ville-carte.js les double d'un exemplaire
# « _devant » pour passer derrière.
BATI = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie']


# ---------- le sol ----------

def tuile_ferme(c, x, y):
    """Herbe et chemin de la ferme (scripts/ville/transition.py)."""
    n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == 'chemin')
    if n == 0:
        v = int(hasard(x, y, 8) * 16)
        return S.plein('herbe', v), f'herbe_{v}'
    if n == 15:
        v = int(hasard(x, y, 9) * 8)
        return F.bloc(v, 49), f'chemin_{v}'
    return F.bloc(n, 50), f'herbe_chemin_{n}'


def motif(m, x, y):
    if m == 'chemin':
        return F.bloc(0, 49).getpixel((x % T, y % T))[:3]
    return S.MOTIFS[m](x % T, y % T, 0)


def tuile_quarts(c, x, y):
    """Plus de deux matières, ou deux sans passage dessiné : chaque quart prend la matière de son
    coin, le bord un peu déchiqueté."""
    im = image(T, T)
    quart = lambda u, v: c[(1 if u >= 8 else 0) + (2 if v >= 8 else 0)]
    for v in range(T):
        for u in range(T):
            j = int(hasard(u, v, 13) * 3) - 1
            im.putpixel((u, v), rgba(motif(quart(min(15, max(0, u + j)), v), u, v)))
    return im, 'quarts_' + '_'.join(c)


def tuile_sol(c, x, y, styles):
    """La tuile aux quatre coins c (haut-gauche, haut-droit, bas-gauche, bas-droit). styles :
    {(A, B): style} les passages de la carte (B la matière du dessus)."""
    m = set(c)
    if m <= {'herbe', 'chemin'}:
        return tuile_ferme(c, x, y)
    if len(m) == 1:
        k = c[0]
        return S.plein(k, 0), f'{k}_0'
    if len(m) == 2:
        for (a, b), style in styles.items():
            if m == {a, b}:
                n = sum(bit for v, bit in zip(c, (8, 4, 2, 1)) if v == b)
                return S.passage(a, b, n, style=style), f'{a}_{b}_{n}'
    return tuile_quarts(c, x, y)


# ---------- les objets dessinés ----------

def rocher(w, h, graine=0, mousse=True):
    """Un rocher (w × h px) vu de 3/4 : une masse arrondie et facettée, éclairée du haut à
    gauche, un peu de mousse dessus, son ombre au sol."""
    im = image(w, h)
    p = im.load()
    cx, cy = w / 2, h * 0.58
    rx, ry = w / 2 - 1.5, h * 0.42
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            a = math.atan2(v, u)
            bosse = 1 + 0.12 * math.sin(3 * a + graine) + 0.08 * math.sin(5 * a + 2 * graine)
            r = math.hypot(u, v)
            if r > bosse:
                if r < bosse + 0.25 and v > 0.2:
                    p[x, y] = (0, 0, 0, 60)                  # l'ombre au sol
                continue
            # les facettes : la lumière selon la pente
            f = int(hasard(int((a + 4) * 2.2), int(r * 3), graine, 31) * 3)
            l = -u * 0.6 - v * 0.8 + 0.25 * (f - 1)
            c = (176, 170, 160) if l > 0.5 else (150, 144, 136) if l > 0 else (120, 114, 108) if l > -0.5 else (92, 88, 84)
            if mousse and v < -0.35 and hasard(x, y, graine, 32) < 0.55:
                c = (108, 132, 60) if hasard(x, y, 33) < 0.6 else (84, 110, 46)
            p[x, y] = rgba(c)
    return contour(im, K)


def heurtoir():
    """Le butoir du bout de la voie (32 × 32) : deux poutres rouges et blanches sur leur cadre."""
    im = image(32, 32)
    d = commun.dessin(im)
    d.ellipse((2, 26, 30, 31), fill=(0, 0, 0, 60))
    for x in (5, 23):
        d.rectangle((x, 12, x + 3, 28), fill=rgba((92, 64, 44)))
        d.rectangle((x, 12, x + 1, 28), fill=rgba((118, 84, 58)))
    d.rectangle((2, 10, 29, 18), fill=rgba(K))
    for x in range(3, 29):
        c = (210, 52, 46) if (x // 4) % 2 else (240, 240, 236)
        d.line((x, 11, x, 17), fill=rgba(c))
    d.line((3, 11, 28, 11), fill=rgba((250, 250, 250)))
    return contour(im, K)


def gare(c, nom, x0, x1, base, matiere, couv, mot='GARE'):
    """La gare : une maison de plain-pied (immeubles.Batiment), une porte vitrée au milieu et
    son enseigne. Renvoie le bâtiment (pour la couche « batiments »)."""
    m = (x0 + x1) / 2
    fen = [x0 + 1, x1 - 2]
    b = I.Batiment(nom, x0, x1, base, 5, 1, matiere, 'pans', fenetres=[fen], couv=couv, bandeaux=False)
    b.dessine(c)
    X = round(m * T)
    I.porte_double(c['menuiserie'], X - 16, base * T, haut=40, verre=True)
    ens = E.enseigne(mot, fond=(40, 70, 130), encre=(240, 240, 244))
    c['menuiserie'].colle(ens, X - ens.width // 2, base * T - I.hauteur_facade(1) + 1)
    return b


def eau_ovale(t, cx, cy, rx, ry, rive=(138, 112, 76), herbe=(70, 82, 40)):
    """Une mare ou un lac (px), l'eau animée de la ferme, sa rive."""
    for y in range(int(cy - ry) - 2, int(cy + ry) + 3):
        for x in range(int(cx - rx) - 2, int(cx + rx) + 3):
            q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if q > 1:
                continue
            q2 = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy) / (ry - 3)) ** 2
            for k in range(F.EAU_IMAGES):
                if q2 > 1:
                    col = herbe if q > 0.9 else rive
                else:
                    ombre = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - cy + 6) / (ry - 3)) ** 2 > 1
                    col = O.eau(x, y, k, ombre)
                t.put(x, y, col, k)


def plantes(veg, ombres, liste):
    """Les arbres (x, y en tuiles : le pied ; im), du fond vers l'avant, calés sur la grille."""
    ombre = F.ombre()
    for x, y, im in sorted(liste, key=lambda p: p[1]):
        w, h = im.size
        x0, y0 = round(x * T - w / 2) // T * T, round(y * T - h) // T * T
        if h > 32:
            ombres.colle(ombre, x0 + w // 2 - 16, y0 + h - 8)
        veg.colle(im, x0, y0)


# ---------- les objets de la carte ----------

class Objets:
    """Les couches d'objets de la carte : chacune une liste d'objets Tiled."""

    def __init__(self):
        self.i = 1
        self.couches = {}

    def _ajoute(self, couche, o):
        o['id'] = self.i
        self.i += 1
        self.couches.setdefault(couche, []).append(o)
        return o

    @staticmethod
    def _props(props):
        out = []
        for k, v in (props or {}).items():
            out.append({'name': k, 'type': 'int' if isinstance(v, int) else 'string', 'value': v})
        return out

    def point(self, couche, nom, x, y, type_='', **props):
        """(x, y en px)"""
        return self._ajoute(couche, {'name': nom, 'type': type_, 'point': True, 'rotation': 0, 'visible': True,
                                     'x': x, 'y': y, 'width': 0, 'height': 0, 'properties': self._props(props)})

    def rect(self, couche, nom, x, y, w, h, type_='', **props):
        return self._ajoute(couche, {'name': nom, 'type': type_, 'rotation': 0, 'visible': True,
                                     'x': x, 'y': y, 'width': w, 'height': h, 'properties': self._props(props)})

    def batiment(self, b):
        o = b.objet(0)
        o.pop('id')
        return self._ajoute('batiments', o)


# ---------- l'écriture ----------

def ecrit(nom, planches, couches, g, styles, dessine, objets, planche_sol='sol'):
    """Découpe le sol (la grille des coins g) et les toiles (dessine(toiles) les peint) en
    tuiles, écrit les planches, assets/<nom>.tmj et, avec --apercu, apercu_<nom>.png."""
    W, H = commun.W, commun.H
    cellules = {'sol': [[None] * W for _ in range(H)]}
    cache = {}
    for y in range(H):
        for x in range(W):
            c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
            cle = c + (int(hasard(x, y, 8) * 16), int(hasard(x, y, 9) * 8))
            if cle not in cache:
                cache[cle] = tuile_sol(list(c), x, y, styles)
            im, n = cache[cle]
            cellules['sol'][y][x] = (planche_sol, planches[planche_sol].ajoute(im, n))
    toiles = {n: Toile(n, p, k) for n, p, k in couches}
    dessine(toiles)
    for n, p, k in couches:
        t = toiles[n]
        grille = [[None] * W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                frames = [im.crop((x * T, y * T, x * T + T, y * T + T)) for im in t.images]
                if all(f.getbbox() is None for f in frames):
                    continue
                grille[y][x] = (p, planches[p].ajoute(frames))
        cellules[n] = grille
    premier, gid = {}, 1
    for k, p in planches.items():
        premier[k] = gid
        gid += p.nombre()
        p.ecrit()
    noms = ['sol'] + [c[0] for c in couches]
    layers = []
    for i, n in enumerate(noms):
        data = [0 if cel is None else premier[cel[0]] + cel[1] for ligne in cellules[n] for cel in ligne]
        layers.append({'id': i + 1, 'name': n, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                       'opacity': 1, 'visible': True, 'data': data})
    for j, (n, objs) in enumerate(objets.couches.items()):
        layers.append({'id': len(noms) + j + 1, 'name': n, 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
                       'visible': True, 'x': 0, 'y': 0, 'objects': objs})
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'width': W, 'height': H, 'tilewidth': T, 'tileheight': T,
        'infinite': False, 'nextlayerid': len(layers) + 1, 'nextobjectid': objets.i,
        'tilesets': [{'firstgid': premier[k], 'source': f'{p.nom}.tsx'} for k, p in planches.items()],
        'layers': layers,
    }
    with open(os.path.join(ASSETS, f'{nom}.tmj'), 'w') as f:
        json.dump(carte, f, indent=1)
    for k, p in planches.items():
        print(f'assets/{p.nom}.png : {len(p.tuiles)} tuiles')
    print(f'assets/{nom}.tmj : {W} × {H} tuiles, {len(noms)} couches')
    if '--apercu' in sys.argv:
        rendu = image(W * T, H * T)
        for n in noms:
            for y in range(H):
                for x in range(W):
                    cel = cellules[n][y][x]
                    if cel:
                        rendu.alpha_composite(planches[cel[0]].tuiles[cel[1]][0], (x * T, y * T))
        rendu.save(os.path.join(ROOT, f'apercu_{nom}.png'))
