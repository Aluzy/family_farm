# La carte de l'infra-monde (assets/infra_monde.tmj, carte de travail Tiled ; le jeu lit
# assets/infra_monde.json, fabriqué par node scripts/build-map.mjs).
#
# Une île d'herbe pâle posée sur l'eau étoilée : ses côtes ondulent, un lac s'ouvre en son
# milieu (un îlot au centre), une rivière en descend vers le sud-est, et deux mares. La forme se
# décide sur la grille des coins des tuiles (sol ou eau) ; chaque tuile en déduit son dessin :
#   couche « eau »   partout, une variante de assets/infra_eau.png ;
#   couche « sol »   les tuiles toutes de sol (4 coins), une variante de assets/infra_sol.png ;
#   couche « rive »  les tuiles mi-sol mi-eau : la tuile de assets/infra_rive.png de leurs coins.
# Couches d'objets :
#   « arbres »  un point par arbre (assets/infra_arbre.png), au pied du tronc ;
#   « depart »  le point où l'habitant apparaît.
# Tout est tiré d'un hasard fixe : la carte est la même à chaque lancement.
#
#   python3 scripts/infra/carte.py && node scripts/build-map.mjs
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ROOT, T, hasard  # noqa: E402

W, H = 44, 34                    # en tuiles
ARBRES_ECART = 2.6               # tuiles, au moins entre deux arbres (1,5 fois plus en hauteur : un arbre fait 4 tuiles)
ARBRES_PART = 0.7               # la part des places possibles qui reçoivent un arbre
GID = {'eau': 1, 'sol': 33, 'rive': 65}     # premiers numéros de tuile (32, 32 et 16 tuiles)


def bruit(x, y, graine, pas):
    """Un bruit de valeurs lissé (entre 0 et 1), mailles de `pas` coins."""
    gx, gy = x / pas, y / pas
    x0, y0 = math.floor(gx), math.floor(gy)
    fx, fy = gx - x0, gy - y0
    s = lambda t: t * t * (3 - 2 * t)
    v = lambda i, j: hasard(i, j, graine)
    a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * s(fx)
    b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * s(fx)
    return a + (b - a) * s(fy)


def coins():
    """La grille (W + 1) × (H + 1) des coins : True pour le sol."""
    cx, cy = W / 2, H / 2
    g = []
    for y in range(H + 1):
        ligne = []
        for x in range(W + 1):
            # l'île : une ellipse aux côtes ondulées
            d = math.hypot((x - cx) / (W * 0.46), (y - cy) / (H * 0.45))
            ile = 1 - d + 0.28 * (bruit(x, y, 1, 6) - 0.5) + 0.12 * (bruit(x, y, 2, 3) - 0.5)
            sol = ile > 0.12
            # le lac du milieu, son îlot
            lac = math.hypot((x - cx + 3) / 7.5, (y - cy + 2) / 5.2) + 0.55 * (bruit(x, y, 3, 3) - 0.5) + 0.25 * (bruit(x, y, 9, 2) - 0.5)
            if lac < 1 and not lac < 0.32:
                sol = False
            # la rivière : du lac vers le sud-est, en serpentant
            t = (x - (cx + 2)) / (W * 0.5)
            if 0 <= t <= 1.1:
                ry = cy + 1 + t * H * 0.42 + 2.2 * math.sin(t * 7)
                if abs(y - ry) + 0.9 * (bruit(x, y, 10, 2) - 0.5) < 1.2 + 0.5 * t:
                    sol = False
            # deux mares
            for mx, my, r in ((cx - 11, cy + 6, 2.6), (cx + 8, cy - 9, 2.4)):
                if math.hypot(x - mx, (y - my) * 1.2) + 0.8 * (bruit(x, y, 4, 2) - 0.5) < r:
                    sol = False
            ligne.append(sol)
        g.append(ligne)
    # le bord de la carte : de l'eau
    for y in range(H + 1):
        for x in range(W + 1):
            if x in (0, W) or y in (0, H):
                g[y][x] = False
    # sans coin isolé (un pixel de sol dans l'eau, ou l'inverse)
    for _ in range(2):
        for y in range(1, H):
            for x in range(1, W):
                autour = [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]]
                if all(v != g[y][x] for v in autour):
                    g[y][x] = autour[0]
    return g


def variante(x, y, graine, probas):
    """Une variante tirée selon ses probabilités (comme le pinceau de Tiled)."""
    r = hasard(x, y, graine) * sum(probas)
    for i, p in enumerate(probas):
        r -= p
        if r < 0:
            return i
    return 0


def main():
    g = coins()
    eau, sol, rive = [], [], []
    plein = set()
    for y in range(H):
        for x in range(W):
            n = (8 if g[y][x] else 0) | (4 if g[y][x + 1] else 0) | (2 if g[y + 1][x] else 0) | (1 if g[y + 1][x + 1] else 0)
            eau.append(GID['eau'] + variante(x, y, 5, [0.12, 1, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]))
            if n == 15:
                plein.add((x, y))
                sol.append(GID['sol'] + variante(x, y, 6, [1, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07]))
                rive.append(0)
            else:
                sol.append(0)
                rive.append(GID['rive'] + n if n else 0)
    # les arbres : sur le sol, loin de l'eau (toutes les tuiles autour sont du sol), espacés
    cx, cy = W // 2, H // 2
    depart = None
    for r in range(max(W, H)):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if depart is None and all((x + dx, y + dy) in plein for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    depart = (x, y)
        if depart:
            break
    arbres = []
    places = [(x, y) for y in range(H) for x in range(W)
              if all((x + dx, y + dy) in plein for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
    places.sort(key=lambda p: hasard(p[0], p[1], 7))
    for x, y in places:
        if hasard(x, y, 8) > ARBRES_PART or math.hypot(x - depart[0], y - depart[1]) < 3:
            continue
        if all(math.hypot(x - a, (y - b) / 1.5) >= ARBRES_ECART for a, b in arbres):
            arbres.append((x, y))
    arbres.sort(key=lambda p: (p[1], p[0]))
    objets = [{'id': i + 1, 'name': 'arbre', 'type': 'arbre', 'point': True, 'rotation': 0, 'visible': True,
               'x': x * T + T / 2, 'y': y * T + T - 2, 'width': 0, 'height': 0} for i, (x, y) in enumerate(arbres)]
    couche = lambda i, nom, data: {'id': i, 'name': nom, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                                   'opacity': 1, 'visible': True, 'data': data}
    carte = {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
        'width': W, 'height': H, 'tilewidth': T, 'tileheight': T, 'infinite': False,
        'nextlayerid': 6, 'nextobjectid': len(objets) + 2,
        'tilesets': [{'firstgid': GID['eau'], 'source': 'infra_eau.tsx'}, {'firstgid': GID['sol'], 'source': 'infra_sol.tsx'},
                     {'firstgid': GID['rive'], 'source': 'infra_rive.tsx'}],
        'layers': [
            couche(1, 'eau', eau), couche(2, 'sol', sol), couche(3, 'rive', rive),
            {'id': 4, 'name': 'arbres', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0, 'objects': objets},
            {'id': 5, 'name': 'depart', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0,
             'objects': [{'id': len(objets) + 1, 'name': 'depart', 'type': '', 'point': True, 'rotation': 0, 'visible': True,
                          'x': depart[0] * T + T / 2, 'y': depart[1] * T + T - 2, 'width': 0, 'height': 0}]},
        ],
    }
    with open(os.path.join(ROOT, 'assets', 'infra_monde.tmj'), 'w') as f:
        json.dump(carte, f, indent=1)
        f.write('\n')
    print(f'assets/infra_monde.tmj : {W} × {H} tuiles, {len(plein)} de sol, {len(arbres)} arbres, départ {depart}')


if __name__ == '__main__':
    main()
