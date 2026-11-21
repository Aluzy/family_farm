#!/usr/bin/env python3
# D'une capture d'écran d'un dessin en pixel art à son image d'origine, en 16 × 16 ou 32 × 32 :
#
#   python3 scripts/capture/pixelart.py capture.png [sortie.png] [options]
#
# Une capture montre le dessin agrandi (chaque pixel du dessin y fait 8, 12,5 ou 20 pixels
# d'écran), posé sur un fond, parfois flouté ou compressé. Le programme refait le chemin inverse :
#
#   1. le fond : ses couleurs sont lues sur le bord de l'image (une couleur unie, ou les deux
#      d'un damier de transparence) ; ce qui leur ressemble et touche l'extérieur est retiré ;
#   2. les pixels de base : la taille d'un pixel du dessin est cherchée dans les changements de
#      couleur, qui tombent tous sur une même grille ; le dessin doit tenir dans 16 × 16 ou
#      32 × 32, sinon il y est ramené ;
#   3. la palette : les couleurs des cases, puis leur réduction à 16 au plus ;
#   4. les motifs : symétrie, motif répété, trames (damiers de deux couleurs), contour ;
#   5. le dessin composé sur sa toile, enregistré en PNG (palette et transparence).
#
# Options : --taille auto|16|32, --couleurs N (16), --fond '#rrggbb', --tolerance N (28),
# --zone x,y,l,h (ne lire qu'une partie de la capture), --trous (retirer aussi le fond enfermé
# dans le dessin), --ancrage centre|bas, --symetrie (recopier la moitié gauche sur la droite),
# --sans-motifs (ne pas corriger un motif répété), --apercu N (écrire aussi le dessin agrandi
# N fois), --rapport fichier.json.
#
# Il faut Pillow et numpy (pip install -r requirements.txt). Essais : scripts/capture/essais.py.
import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image

TAILLES = (16, 32)


class Erreur(Exception):
    pass


# ---------- couleurs ----------

def hexa(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c[:3])


def oklab(rgb):
    """Couleurs sRGB (n × 3, de 0 à 255) -> Oklab, où les distances suivent mieux l'œil."""
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], axis=-1)


def couleur_dominante(pixels):
    """La couleur la plus présente d'un lot de pixels (n × 3) : la moyenne de son groupe."""
    cles = (pixels >> 3).astype(np.int32)
    cles = (cles[:, 0] << 10) | (cles[:, 1] << 5) | cles[:, 2]
    valeurs, comptes = np.unique(cles, return_counts=True)
    membres = pixels[cles == valeurs[np.argmax(comptes)]]
    return tuple(int(v) for v in np.rint(membres.mean(axis=0)))


# ---------- 1. le fond ----------

def couleurs_du_fond(rgb, opaque):
    """Les couleurs du bord de l'image : une couleur unie, ou les quelques couleurs d'un damier."""
    h, w = opaque.shape
    e = max(1, min(h, w) // 200)
    bord = np.zeros((h, w), dtype=bool)
    bord[:e], bord[-e:], bord[:, :e], bord[:, -e:] = True, True, True, True
    pixels = rgb[bord & opaque]
    if len(pixels) < 0.5 * bord.sum():
        return []                                     # une image déjà détourée : rien à lire
    cles = (pixels >> 4).astype(np.int32)
    cles = (cles[:, 0] << 8) | (cles[:, 1] << 4) | cles[:, 2]
    valeurs, comptes = np.unique(cles, return_counts=True)
    fond = []
    for i in np.argsort(-comptes)[:4]:
        if fond and comptes[i] < 0.08 * len(pixels):
            break
        fond.append(tuple(int(v) for v in np.median(pixels[cles == valeurs[i]], axis=0)))
    return fond


def masque_du_fond(rgb, opaque, fond, tolerance):
    """Vrai là où le pixel d'écran ressemble au fond (ou est déjà transparent)."""
    masque = ~opaque
    for c in fond:
        ecart = np.abs(rgb.astype(np.int16) - np.array(c, dtype=np.int16)).max(axis=2)
        masque |= ecart <= tolerance
    return masque


# ---------- 2. les pixels de base ----------

def profils(rgb, fond):
    """Par colonne puis par ligne, le nombre de changements de couleur qui touchent le dessin.

    profil[x] compte les changements entre la colonne x − 1 et la colonne x : dans une capture
    de pixel art, ils tombent tous sur la grille des pixels de base."""
    sujet = ~fond
    c = rgb.astype(np.int16)
    dx = np.abs(c[:, 1:] - c[:, :-1]).sum(axis=2) > 30
    dx = (dx & (sujet[:, 1:] | sujet[:, :-1])) | (sujet[:, 1:] != sujet[:, :-1])
    dy = np.abs(c[1:] - c[:-1]).sum(axis=2) > 30
    dy = (dy & (sujet[1:] | sujet[:-1])) | (sujet[1:] != sujet[:-1])
    ex = np.zeros(rgb.shape[1] + 1)
    ey = np.zeros(rgb.shape[0] + 1)
    ex[1:-1] = dx.sum(axis=0)
    ey[1:-1] = dy.sum(axis=1)
    return ex, ey


def _fenetre(p):
    return 3 if p >= 8 else 1


def _prise(e, p, f=None):
    """Ce que la grille de pas p attrape du profil e, à son meilleur décalage.

    f est la largeur de la fenêtre autour de chaque trait de la grille : 3 pixels d'écran
    pardonnent un pas approché ou un bord fondu, 1 seul exige le pas exact."""
    f = f or _fenetre(p)
    ef = e if f == 1 else np.convolve(e, np.ones(f), 'same')
    dernier = len(e) - 1
    decalages = np.arange(0, p, 0.25 if p < 8 else 0.5)
    k = np.arange(0, int(dernier / p) + 2)
    pos = np.rint(decalages[:, None] + k[None, :] * p).astype(int)
    sommes = (ef[np.minimum(pos, dernier)] * (pos <= dernier)).sum(axis=1)
    i = int(np.argmax(sommes))
    return float(sommes[i]), float(decalages[i])


def _score(ex, ey, p):
    """De 0 (la grille n'attrape que ce que le hasard donne) à 1 (tous les changements)."""
    total = ex.sum() + ey.sum()
    part = (_prise(ex, p)[0] + _prise(ey, p)[0]) / total
    hasard = _fenetre(p) / p
    return (part - hasard) / (1 - hasard)


def cherche_grille(ex, ey, etendue):
    """Le pas de la grille des pixels de base (en pixels d'écran) et son score, ou (None, 0).

    Les sous-multiples du vrai pas attrapent eux aussi tous les changements : on garde le plus
    grand pas qui fait aussi bien que le meilleur."""
    if ex.sum() + ey.sum() == 0:
        return None, 0.0
    pas = np.arange(2.0, max(2.05, etendue / 3), 0.05)
    scores = np.array([_score(ex, ey, p) for p in pas])
    meilleur = scores.max()
    if meilleur < 0.5:
        return None, float(meilleur)
    p = pas[np.nonzero(scores >= 0.9 * meilleur)[0][-1]]
    confiance = float(scores[np.nonzero(scores >= 0.9 * meilleur)[0][-1]])
    # Affinage : sans fenêtre, seul le pas exact garde tous ses traits sur les changements.
    fins = np.round(np.arange(max(2.0, p - 0.3), p + 0.3, 0.005), 3)
    s = np.array([_prise(ex, q, 1)[0] + _prise(ey, q, 1)[0] for q in fins])
    plateau = fins[s >= s.max() - 1e-9]
    p = float(plateau[len(plateau) // 2])
    entier = float(round(p))
    if abs(p - entier) < 0.05 and _prise(ex, entier, 1)[0] + _prise(ey, entier, 1)[0] >= 0.98 * s.max():
        p = entier
    return p, confiance


def echantillonne(rgb, fond, transparent, p, ox, oy, boite):
    """Les cases de la grille (pas p, origine ox, oy) qui couvrent la boîte du dessin.

    Rend les couleurs des cases (m × n × 3), la part de fond de chacune, celle de pixels déjà
    transparents, et l'indice de la première case en x et en y. Seul le cœur de chaque case est
    lu : ses bords sont flous dans une capture mise à l'échelle."""
    x0, y0, x1, y1 = boite
    kx0, kx1 = math.floor((x0 - ox) / p + 0.5), math.ceil((x1 - ox) / p - 0.5)
    ky0, ky1 = math.floor((y0 - oy) / p + 0.5), math.ceil((y1 - oy) / p - 0.5)
    n, m = max(1, kx1 - kx0), max(1, ky1 - ky0)
    h, w = fond.shape
    marge = p * 0.25 if p >= 2 else 0

    def bornes(k, o, limite):
        a = int(math.floor(o + k * p + marge + 0.5))
        b = int(math.floor(o + (k + 1) * p - marge + 0.5))
        a = min(max(a, 0), limite - 1)
        return a, min(max(b, a + 1), limite)

    couleurs = np.zeros((m, n, 3), dtype=np.uint8)
    part_fond = np.zeros((m, n))
    part_vide = np.zeros((m, n))
    for j in range(m):
        ya, yb = bornes(ky0 + j, oy, h)
        for i in range(n):
            xa, xb = bornes(kx0 + i, ox, w)
            f = fond[ya:yb, xa:xb]
            part_fond[j, i] = f.mean()
            part_vide[j, i] = transparent[ya:yb, xa:xb].mean()
            bloc = rgb[ya:yb, xa:xb]
            # Une case du dessin : sa couleur se lit sur ses pixels qui ne sont pas du fond.
            pixels = bloc[~f] if part_fond[j, i] < 0.5 else bloc.reshape(-1, 3)
            couleurs[j, i] = couleur_dominante(pixels)
    return couleurs, part_fond, part_vide, kx0, ky0


def detoure(part_fond, part_vide, trous):
    """Vrai pour les cases du dessin : le fond qui touche l'extérieur est retiré.

    Une case de la couleur du fond enfermée dans le dessin (le blanc d'un œil sur fond blanc)
    est gardée, sauf avec trous=True."""
    m, n = part_fond.shape
    comme_fond = part_fond >= 0.5
    if trous:
        return ~comme_fond
    # Une couronne de fond autour des cases, d'où part le remplissage.
    vu = np.zeros((m + 2, n + 2), dtype=bool)
    ouvert = np.ones((m + 2, n + 2), dtype=bool)
    ouvert[1:-1, 1:-1] = comme_fond
    pile = [(0, 0)]
    vu[0, 0] = True
    while pile:
        j, i = pile.pop()
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            a, b = j + dj, i + di
            if 0 <= a < m + 2 and 0 <= b < n + 2 and ouvert[a, b] and not vu[a, b]:
                vu[a, b] = True
                pile.append((a, b))
    return ~(vu[1:-1, 1:-1] | (part_vide >= 0.5))


def boite_de(masque):
    """(x0, y0, x1, y1) des cases vraies, bornes hautes exclues ; None s'il n'y en a pas."""
    ys, xs = np.nonzero(masque)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


# ---------- 3. la palette ----------

def reduit_palette(couleurs, maximum, fusion):
    """Les couleurs du dessin (k × 3, une par case) -> (palette, indice de chaque case, nombre
    de couleurs lues).

    D'abord les couleurs presque égales sont réunies (le grain d'une capture compressée), puis,
    s'il en reste plus que le maximum, les deux groupes les plus proches sont réunis tour à tour.
    Chaque groupe garde sa couleur la plus présente : une vraie couleur du dessin, pas une
    moyenne. La palette est rangée de la plus sombre à la plus claire."""
    uniques, inverse, comptes = np.unique(couleurs, axis=0, return_inverse=True, return_counts=True)
    inverse = inverse.reshape(-1)
    lab = oklab(uniques)
    ordre = np.argsort(-comptes, kind='stable')
    groupes = []                       # listes d'indices dans uniques, le plus présent en tête
    for u in ordre:
        for g in groupes:
            if np.linalg.norm(lab[u] - lab[g[0]]) < fusion:
                g.append(u)
                break
        else:
            groupes.append([int(u)])
    lues = len(groupes)

    poids = np.array([comptes[g].sum() for g in groupes], dtype=np.float64)
    centres = np.array([np.average(lab[g], axis=0, weights=comptes[g]) for g in groupes])
    vivant = np.ones(len(groupes), dtype=bool)

    def couts(i):
        # La racine du nombre de cases : une petite touche de couleur (un œil, un reflet) ne
        # doit pas disparaître parce qu'elle ne couvre que deux cases.
        a, b = np.sqrt(poids[i]), np.sqrt(poids)
        c = a * b / (a + b) * ((centres - centres[i]) ** 2).sum(axis=1)
        c[~vivant] = np.inf
        c[i] = np.inf
        return c

    if len(groupes) > maximum:
        d = np.array([couts(i) for i in range(len(groupes))])
        while vivant.sum() > maximum:
            i, j = np.unravel_index(np.argmin(d), d.shape)
            groupes[i] = sorted(groupes[i] + groupes[j], key=lambda u: -comptes[u])
            centres[i] = (centres[i] * poids[i] + centres[j] * poids[j]) / (poids[i] + poids[j])
            poids[i] += poids[j]
            vivant[j] = False
            d[j, :] = d[:, j] = np.inf
            d[i, :] = d[:, i] = couts(i)

    restants = [groupes[i] for i in range(len(groupes)) if vivant[i]]
    restants.sort(key=lambda g: (lab[g[0]][0], tuple(uniques[g[0]])))
    vers = np.zeros(len(uniques), dtype=np.int32)
    for k, g in enumerate(restants):
        vers[g] = k
    palette = [tuple(int(v) for v in uniques[g[0]]) for g in restants]
    return palette, vers[inverse], lues


# ---------- 4. les motifs ----------

def _diviseurs(n):
    return [d for d in range(1, n + 1) if n % d == 0]


def _motif_repete(grille):
    """Le plus petit motif qui, répété, redonne (presque) le dessin : (l, h, accord, motif)."""
    m, n = grille.shape
    meilleur = None
    for th in _diviseurs(m):
        for tw in _diviseurs(n):
            if (th == m and tw == n) or th * tw < 2:
                continue
            tuiles = grille.reshape(m // th, th, n // tw, tw).transpose(0, 2, 1, 3).reshape(-1, th, tw)
            valeurs = tuiles + 1                       # −1 (transparent) devient 0
            votes = np.stack([(valeurs == v).sum(axis=0) for v in range(valeurs.max() + 1)])
            motif = votes.argmax(axis=0) - 1
            if (motif == motif.flat[0]).all():
                continue
            accord = float((tuiles == motif).mean())
            if accord >= 0.95 and (meilleur is None or tw * th < meilleur[0] * meilleur[1]):
                meilleur = (tw, th, accord, motif)
    return meilleur


def analyse_motifs(grille, palette):
    """Ce qui se répète dans le dessin (grille d'indices de palette, −1 = transparent)."""
    m, n = grille.shape
    plein = grille >= 0
    motifs = {}

    for nom, miroir in (('gauche_droite', grille[:, ::-1]), ('haut_bas', grille[::-1])):
        utile = plein | (miroir >= 0)
        motifs['symetrie_' + nom] = round(float((grille == miroir)[utile].mean()), 3)

    r = _motif_repete(grille)
    if r:
        motifs['motif_repete'] = {'largeur': r[0], 'hauteur': r[1], 'accord': round(r[2], 3)}

    # Trames : les carrés 2 × 2 en damier de deux couleurs (a b / b a).
    a, b, c, d = grille[:-1, :-1], grille[:-1, 1:], grille[1:, :-1], grille[1:, 1:]
    damier = (a == d) & (b == c) & (a != b) & (a >= 0) & (b >= 0)
    paires = {}
    for u, v in zip(a[damier], b[damier]):
        cle = (min(int(u), int(v)), max(int(u), int(v)))
        paires[cle] = paires.get(cle, 0) + 1
    trames = [{'couleurs': [hexa(palette[u]), hexa(palette[v])], 'carres': k}
              for (u, v), k in sorted(paires.items(), key=lambda t: -t[1]) if k >= 3]
    if trames:
        motifs['trames'] = trames

    # Contour : la couleur des cases du dessin qui touchent le vide.
    vide = np.pad(~plein, 1, constant_values=True)
    au_bord = plein & (vide[:-2, 1:-1] | vide[2:, 1:-1] | vide[1:-1, :-2] | vide[1:-1, 2:])
    if au_bord.any():
        comptes = np.bincount(grille[au_bord], minlength=len(palette))
        k = int(comptes.argmax())
        part = float(comptes[k] / au_bord.sum())
        if part >= 0.5:
            motifs['contour'] = {'couleur': hexa(palette[k]), 'part': round(part, 3)}
    return motifs, (r[3] if r else None)


# ---------- le tout ----------

def convertit(image, taille='auto', couleurs=16, fond=None, tolerance=28, zone=None, trous=False,
              ancrage='centre', symetrie=False, corrige_motifs=True, fusion=0.02):
    """Une capture d'écran (image Pillow) -> (le dessin en palette, le rapport de ce qui a été lu)."""
    if taille not in ('auto',) + TAILLES:
        raise Erreur('taille : auto, 16 ou 32')
    if not 1 <= couleurs <= 255:
        raise Erreur('couleurs : de 1 à 255')
    image = image.convert('RGBA')
    if zone:
        x, y, l, h = zone
        image = image.crop((x, y, x + l, y + h))
    donnees = np.array(image)
    rgb, opaque = donnees[..., :3], donnees[..., 3] >= 128
    notes = []

    # 1. Le fond.
    teintes = [tuple(fond)] if fond else couleurs_du_fond(rgb, opaque)
    masque = masque_du_fond(rgb, opaque, teintes, tolerance)
    boite = boite_de(~masque)
    if boite is None:
        raise Erreur("l'image n'est que du fond : rien à détourer")
    etendue = max(boite[2] - boite[0], boite[3] - boite[1])

    # 2. Les pixels de base.
    ex, ey = profils(rgb, masque)
    if etendue <= max(TAILLES) and taille in ('auto',) + tuple(t for t in TAILLES if t >= etendue):
        pas, confiance = 1.0, 1.0                     # déjà à sa taille : un pixel par case
        ox = oy = 0.0
    else:
        pas, confiance = cherche_grille(ex, ey, etendue)
        if pas is not None:
            ox, oy = _prise(ex, pas)[1], _prise(ey, pas)[1]
    grille_lue = pas is not None

    def lit(p, ox, oy, boite):
        cases, part_fond, part_vide, kx, ky = echantillonne(rgb, masque, ~opaque, p, ox, oy, boite)
        dessin = detoure(part_fond, part_vide, trous)
        b = boite_de(dessin)
        if b is None:
            raise Erreur('tout le dessin a été pris pour du fond : essayer --fond ou --tolerance')
        ecran = (ox + (kx + b[0]) * p, oy + (ky + b[1]) * p, ox + (kx + b[2]) * p, oy + (ky + b[3]) * p)
        return cases[b[1]:b[3], b[0]:b[2]], dessin[b[1]:b[3], b[0]:b[2]], ecran

    def ajuste(boite, t):
        # Pas de grille sûre, ou un dessin trop grand : la boîte du dessin découpée en t cases.
        p = max(boite[2] - boite[0], boite[3] - boite[1]) / t
        return p, boite[0], boite[1]

    limite = max(TAILLES) if taille == 'auto' else taille
    if grille_lue:
        cases, dessin, ecran = lit(pas, ox, oy, boite)
        if max(dessin.shape) > limite:
            notes.append('le dessin fait %d × %d pixels de base : ramené à %d × %d'
                         % (dessin.shape[1], dessin.shape[0], limite, limite))
            pas, ox, oy = ajuste(ecran, limite)
            cases, dessin, ecran = lit(pas, ox, oy, ecran)
    else:
        if taille == 'auto':
            s16, s32 = (_score(ex, ey, max(2.0, etendue / t)) for t in TAILLES)
            limite = 16 if s16 >= 0.9 * s32 else 32
        notes.append('grille des pixels de base non reconnue (capture floue ?) : '
                     'dessin découpé en %d × %d' % (limite, limite))
        pas, ox, oy = ajuste(boite, limite)
        cases, dessin, ecran = lit(pas, ox, oy, boite)
    m, n = dessin.shape
    toile = taille if taille != 'auto' else next(t for t in TAILLES if t >= max(m, n))

    # 3. La palette.
    palette, indices, lues = reduit_palette(cases[dessin], couleurs, fusion)
    grille = np.full((m, n), -1, dtype=np.int32)
    grille[dessin] = indices

    # 4. Les motifs, et ce qu'ils corrigent.
    motifs, motif = analyse_motifs(grille, palette)
    if motif is not None and corrige_motifs and motifs['motif_repete']['accord'] < 1:
        grille = np.tile(motif, (m // motif.shape[0], n // motif.shape[1]))
        notes.append('motif répété : les cases qui s\'en écartaient ont été corrigées')
    if symetrie:
        moitie = n // 2
        grille[:, n - moitie:] = grille[:, :moitie][:, ::-1]
        notes.append('symétrie : la moitié gauche recopiée sur la droite')

    # 5. Le dessin composé sur sa toile : indice 0 transparent, puis la palette.
    px = (toile - n) // 2
    py = toile - m if ancrage == 'bas' else (toile - m) // 2
    plan = np.zeros((toile, toile), dtype=np.uint8)
    plan[py:py + m, px:px + n] = grille + 1
    sortie = Image.fromarray(plan, 'P')
    sortie.putpalette([0, 0, 0] + [v for c in palette for v in c])
    sortie.info['transparency'] = 0

    utilisees = sorted(set(int(v) for v in grille[grille >= 0]))
    rapport = {
        'fond': [hexa(c) for c in teintes],
        'pixel_de_base': round(pas, 2),
        'grille_reconnue': grille_lue,
        'confiance': round(confiance, 3) if grille_lue else 0,
        'dessin': [n, m],
        'toile': toile,
        'couleurs_lues': lues,
        'palette': [hexa(palette[k]) for k in utilisees],
        'motifs': motifs,
        'notes': notes,
    }
    return sortie, rapport


def imprime(rapport):
    r = rapport
    print('Fond          : %s' % (', '.join(r['fond']) or 'déjà transparent'))
    print('Pixel de base : %s px d\'écran (%s)' % (
        ('%g' % r['pixel_de_base']),
        'grille reconnue, confiance %d %%' % round(100 * r['confiance']) if r['grille_reconnue']
        else 'grille imposée'))
    print('Dessin        : %d × %d sur une toile de %d × %d' % (r['dessin'][0], r['dessin'][1], r['toile'], r['toile']))
    print('Palette       : %d couleurs (%d lues) : %s' % (len(r['palette']), r['couleurs_lues'], ' '.join(r['palette'])))
    mo = r['motifs']
    print('Symétrie      : gauche-droite %d %%, haut-bas %d %%' % (
        round(100 * mo['symetrie_gauche_droite']), round(100 * mo['symetrie_haut_bas'])))
    if 'motif_repete' in mo:
        print('Motif répété  : %d × %d (accord %d %%)' % (
            mo['motif_repete']['largeur'], mo['motif_repete']['hauteur'], round(100 * mo['motif_repete']['accord'])))
    for t in mo.get('trames', []):
        print('Trame         : %s et %s (%d carrés)' % (t['couleurs'][0], t['couleurs'][1], t['carres']))
    if 'contour' in mo:
        print('Contour       : %s (%d %% du bord)' % (mo['contour']['couleur'], round(100 * mo['contour']['part'])))
    for note in r['notes']:
        print('Note          : ' + note)


def _couleur(texte):
    t = texte.lstrip('#')
    if len(t) != 6:
        raise argparse.ArgumentTypeError('une couleur : #rrggbb')
    try:
        return tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        raise argparse.ArgumentTypeError('une couleur : #rrggbb')


def _zone(texte):
    try:
        x, y, l, h = (int(v) for v in texte.split(','))
    except ValueError:
        raise argparse.ArgumentTypeError('une zone : x,y,largeur,hauteur')
    if l <= 0 or h <= 0:
        raise argparse.ArgumentTypeError('une zone : largeur et hauteur positives')
    return x, y, l, h


def main(arguments=None):
    a = argparse.ArgumentParser(description="Refait un dessin en pixel art (16 × 16 ou 32 × 32, "
                                "16 couleurs au plus, fond retiré) depuis sa capture d'écran.")
    a.add_argument('capture', help="la capture d'écran (PNG, JPEG, WebP…)")
    a.add_argument('sortie', nargs='?', help='le PNG à écrire (par défaut : <capture>_pixelart.png)')
    a.add_argument('--taille', default='auto', choices=['auto', '16', '32'], help='la toile (auto)')
    a.add_argument('--couleurs', type=int, default=16, help='nombre maximal de couleurs (16)')
    a.add_argument('--fond', type=_couleur, help='la couleur du fond, #rrggbb (lue sur le bord sinon)')
    a.add_argument('--tolerance', type=int, default=28, help='écart admis avec le fond, par canal (28)')
    a.add_argument('--zone', type=_zone, help='ne lire que x,y,largeur,hauteur de la capture')
    a.add_argument('--trous', action='store_true', help='retirer aussi le fond enfermé dans le dessin')
    a.add_argument('--ancrage', default='centre', choices=['centre', 'bas'], help='place du dessin sur la toile')
    a.add_argument('--symetrie', action='store_true', help='recopier la moitié gauche sur la droite')
    a.add_argument('--sans-motifs', action='store_true', help='ne pas corriger un motif répété')
    a.add_argument('--apercu', type=int, metavar='N', help='écrire aussi le dessin agrandi N fois')
    a.add_argument('--rapport', metavar='FICHIER', help='écrire le rapport en JSON')
    o = a.parse_args(arguments)

    sortie = o.sortie or os.path.splitext(o.capture)[0] + '_pixelart.png'
    try:
        with Image.open(o.capture) as image:
            dessin, rapport = convertit(
                image, taille=o.taille if o.taille == 'auto' else int(o.taille), couleurs=o.couleurs,
                fond=o.fond, tolerance=o.tolerance, zone=o.zone, trous=o.trous, ancrage=o.ancrage,
                symetrie=o.symetrie, corrige_motifs=not o.sans_motifs)
    except (OSError, Erreur) as e:
        print('pixelart : %s' % e, file=sys.stderr)
        return 1
    dessin.save(sortie, transparency=0, optimize=True)
    imprime(rapport)
    print('Écrit         : ' + sortie)
    if o.apercu:
        nom = os.path.splitext(sortie)[0] + '_x%d.png' % o.apercu
        t = dessin.size[0] * o.apercu
        dessin.convert('RGBA').resize((t, t), Image.NEAREST).save(nom)
        print('Aperçu        : ' + nom)
    if o.rapport:
        with open(o.rapport, 'w', encoding='utf-8') as f:
            json.dump(rapport, f, ensure_ascii=False, indent=2)
            f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
