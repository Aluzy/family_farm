#!/usr/bin/env python3
"""Essai : un personnage dessiné plus fin (le mode test, « Personnage en essai » : js/ui/testmode.js).

La source (scripts/personnage/modeles/essai_hd_source.jpg) est une planche de 24 personnages agrandis
(un pixel du dessin ≈ 4,7 px), en JPEG sur fond blanc : 4 rangées de 6 (face, dos, profil vers la droite,
puis debout, houe, arrosoir, salut, main tendue à droite, main tendue à gauche).

Le script retrouve la grille de pixels de chaque personnage (taille et décalage qui collent le mieux),
prend la couleur au centre de chaque pixel, rend le fond transparent, ramène les couleurs à une palette
commune (le bruit du JPEG) et ôte l'ombre grise sous les pieds. Il range ensuite les images dans l'ordre
des cases du jeu (assets/fermier.json : 111 cases, 8 par rangée) ; une case sans dessin prend la pose
la plus proche (table POSES). Les vues de profil du jeu regardent à gauche : les profils sont retournés.

Sortie : assets/personnages/essai_hd.png (cases de LARGEUR × HAUTEUR) et essai_hd.json ; le jeu
l'affiche à l'échelle ECHELLE, pour que le personnage ait la taille des autres (25 px de haut).

    python3 scripts/personnage/essai_hd.py
"""
import json
import os
import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
SOURCE = os.path.join(ICI, 'modeles', 'essai_hd_source.jpg')
SORTIE = os.path.join(RACINE, 'assets', 'personnages', 'essai_hd')
CASES = json.load(open(os.path.join(RACINE, 'assets', 'fermier.json')))['frames']
COULEURS = 40          # la palette commune
LARGEUR, HAUTEUR = 48, 42   # une case (la houe dépasse du corps)
HAUT_JEU = 25          # la hauteur d'un personnage du jeu (assets/fermiere.png : 25 px, pieds en bas de case)

# Les 24 dessins de la source, dans l'ordre de lecture.
FACE = [0, 1, 2, 3, 4, 5]            # debout, puis la marche
DOS = [6, 7, 8, 9, 10, 11]
PROFIL = [12, 13, 14, 15, 16, 17]     # vers la droite
DEBOUT, HOUE, ARROSOIR, SALUT, MAIN_D, MAIN_G = 18, 19, 20, 21, 22, 23


def vue(nom):
    return 'cote' if '_cote' in nom else 'haut' if '_haut' in nom else 'bas'


def idle(v, k=0):
    return {'bas': [FACE[0], DEBOUT], 'haut': [DOS[0], DOS[5]], 'cote': [PROFIL[0], PROFIL[5]]}[v][k % 2]


def marche(v, k):
    return {'bas': FACE, 'haut': DOS, 'cote': PROFIL}[v][1 + k % 4]


# La case du jeu → (le dessin, retourné ?). Les profils de la source regardent à droite.
def pose(nom):
    v, k = vue(nom), int(nom.rsplit('_', 1)[1]) if nom.rsplit('_', 1)[1].isdigit() else 0
    geste = nom.split('_')[0]
    if geste == 'idle': d = idle(v, k)
    elif geste in ('marche', 'panier'): d = marche(v, k)
    elif geste in ('houe', 'hache', 'pioche', 'faux'): d = HOUE if v != 'haut' else DOS[0]
    elif geste == 'arrose': d = ARROSOIR if v != 'haut' else DOS[0]
    elif geste in ('cuisine', 'frigo'): d = MAIN_D
    elif geste in ('jette', 'peche'): d = MAIN_D if v != 'haut' else DOS[0]
    elif geste == 'ramasse' or geste == 'plante': d = DEBOUT if v != 'haut' else DOS[0]
    else: d = idle(v, k)   # assis, dort… : debout dans sa vue
    retourne = v == 'cote' and d in PROFIL + [HOUE, ARROSOIR, MAIN_D, MAIN_G, DEBOUT, SALUT]
    return d, retourne


def segments(a):
    r, s = [], None
    for i, v in enumerate(a):
        if v and s is None: s = i
        if not v and s is not None: r.append((s, i)); s = None
    if s is not None: r.append((s, len(a)))
    return r


def grille(cellule):
    """La taille de pixel et le décalage qui reconstruisent le mieux la cellule : (p, ox, oy)."""
    best = None
    for p10 in range(42, 53):
        p = p10 / 10
        for ox in np.arange(0, p, 0.5):
            for oy in np.arange(0, p, 0.5):
                ys = np.arange(oy + p / 2, cellule.shape[0], p).astype(int)
                xs = np.arange(ox + p / 2, cellule.shape[1], p).astype(int)
                yi = np.clip(((np.arange(cellule.shape[0]) - oy) // p).astype(int), 0, len(ys) - 1)
                xi = np.clip(((np.arange(cellule.shape[1]) - ox) // p).astype(int), 0, len(xs) - 1)
                e = np.abs(cellule[np.ix_(ys, xs)][np.ix_(yi, xi)] - cellule).mean()
                if best is None or e < best[0]: best = (e, p, ox, oy)
    return best[1:]


def extraire():
    im = np.asarray(Image.open(SOURCE).convert('RGB')).astype(float)
    fond = np.abs(im - 255).sum(2) > 60
    dessins = []
    for (r0, r1) in segments(fond.any(1)):
        for (c0, c1) in [c for c in segments(fond[r0:r1].any(0)) if c[1] - c[0] > 20]:
            y0, x0 = max(0, r0 - 6), max(0, c0 - 6)
            cel = im[y0:min(im.shape[0], r1 + 6), x0:min(im.shape[1], c1 + 6)]
            p, ox, oy = grille(cel)
            ys, xs = np.arange(oy + p / 2, cel.shape[0], p), np.arange(ox + p / 2, cel.shape[1], p)
            out = np.zeros((len(ys), len(xs), 4))
            for j, y in enumerate(ys):
                for i, x in enumerate(xs):
                    blk = cel[int(y - p / 4):int(y + p / 4) + 1, int(x - p / 4):int(x + p / 4) + 1].reshape(-1, 3)
                    c = np.median(blk, 0)
                    out[j, i, :3], out[j, i, 3] = c, 0 if np.abs(c - 255).sum() < 70 else 255
            dessins.append(out)
    assert len(dessins) == 24, len(dessins)
    # la palette commune (k-moyennes, graine fixe)
    px = np.concatenate([d[d[..., 3] > 0][:, :3] for d in dessins])
    C = px[np.random.default_rng(1).choice(len(px), COULEURS, replace=False)]
    for _ in range(25):
        lab = ((px[:, None] - C[None]) ** 2).sum(2).argmin(1)
        for k in range(COULEURS):
            if (lab == k).any(): C[k] = px[lab == k].mean(0)
    images = []
    for d in dessins:
        m = d[..., 3] > 0
        d[m, :3] = C[((d[m][:, :3][:, None] - C[None]) ** 2).sum(2).argmin(1)]
        h = d.shape[0]
        for j in range(h - 4, h):          # l'ombre grise sous les pieds
            for i in range(d.shape[1]):
                r, g, b = d[j, i, :3]
                if d[j, i, 3] and max(r, g, b) - min(r, g, b) < 18 and 70 < r < 200: d[j, i, 3] = 0
        img = Image.fromarray(d.round().clip(0, 255).astype('uint8'), 'RGBA')
        images.append(img.crop(img.getbbox()))
    return images


def ancre(img):
    """Le milieu de la tête (les 12 rangées du haut) : ce qui se place au milieu de la case."""
    a = np.asarray(img)[:12, :, 3] > 0
    cols = np.where(a.any(0))[0]
    return (cols[0] + cols[-1] + 1) / 2


def main():
    images = extraire()
    n = len(CASES)
    planche = Image.new('RGBA', (8 * LARGEUR, ((n + 7) // 8) * HAUTEUR), (0, 0, 0, 0))
    for k, nom in enumerate(CASES):
        d, retourne = pose(nom)
        img = images[d].transpose(Image.FLIP_LEFT_RIGHT) if retourne else images[d]
        x = round(LARGEUR / 2 - ancre(img))
        y = HAUTEUR - img.height
        case = Image.new('RGBA', (LARGEUR, HAUTEUR), (0, 0, 0, 0))
        case.alpha_composite(img, (max(0, x), max(0, y)) if x >= 0 else (0, max(0, y)))
        planche.alpha_composite(case, ((k % 8) * LARGEUR, (k // 8) * HAUTEUR))
    planche.save(SORTIE + '.png', optimize=True)
    hauteur = max(im.height for im in images[:18])
    echelle = round(HAUT_JEU / hauteur, 4)
    json.dump({'frameWidth': LARGEUR, 'frameHeight': HAUTEUR, 'echelle': echelle, 'frames': CASES},
              open(SORTIE + '.json', 'w'), ensure_ascii=False)
    print(f'{SORTIE}.png : {planche.size}, {n} cases de {LARGEUR} × {HAUTEUR}, échelle {echelle}')


if __name__ == '__main__':
    main()
