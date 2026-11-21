#!/usr/bin/env python3
# Essais de scripts/capture/pixelart.py : des dessins connus sont agrandis en fausses captures
# d'écran (fond uni ou damier, agrandissement entier ou non, compression JPEG), puis relus ;
# le dessin retrouvé doit être celui du départ.
#
#   python3 scripts/capture/essais.py
import io
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixelart import convertit  # noqa: E402

PALETTE = ['#1b1b29', '#5a3a2e', '#a35b3c', '#e0a060', '#f6e3a1', '#3f7d3a', '#7fc24e', '#2f5fa8',
           '#6fb7e8', '#b03a48', '#f08a8a', '#7a4fa0', '#c9c9d6', '#ffffff', '#f2c230', '#4a4a5c']
PALETTE = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in PALETTE]


def dessin(taille, graine, couleurs=16):
    """Un bonhomme symétrique à contour sombre, qui remplit la toile : (taille × taille × 4)."""
    h = np.random.default_rng(graine)
    im = np.zeros((taille, taille, 4), dtype=np.uint8)
    c = (taille - 1) / 2
    for y in range(taille):
        for x in range(taille // 2):
            d = ((x - c) / (c + 0.5)) ** 2 + ((y - c) / (c + 0.5)) ** 2
            if d > 1:
                continue
            bord = d > 0.78
            k = 0 if bord else 1 + int(h.integers(0, couleurs - 1))
            im[y, x] = im[y, taille - 1 - x] = PALETTE[k] + (255,)
    # Le dessin touche les quatre bords, pour que sa taille soit sans équivoque.
    im[0, taille // 2 - 1:taille // 2 + 1] = PALETTE[0] + (255,)
    return im


def capture(im, facteur, fond, marge=(37, 23), damier=None, filtre=Image.NEAREST):
    """Le dessin agrandi et posé sur un fond, comme dans une capture d'écran."""
    t = im.shape[0]
    cote = round(t * facteur)
    grand = Image.fromarray(im, 'RGBA').resize((cote, cote), filtre)
    l, h = cote + 2 * marge[0] + 11, cote + 2 * marge[1] + 5
    toile = Image.new('RGBA', (l, h), fond + (255,))
    if damier:
        px = toile.load()
        for y in range(h):
            for x in range(l):
                if (x // 9 + y // 9) % 2:
                    px[x, y] = damier + (255,)
    toile.alpha_composite(grand, marge)
    return toile.convert('RGB')


def jpeg(image, qualite):
    tampon = io.BytesIO()
    image.save(tampon, 'JPEG', quality=qualite)
    return Image.open(io.BytesIO(tampon.getvalue()))


def accord(sortie, im):
    """La part des cases retrouvées à l'identique (couleur et transparence)."""
    lu = np.array(sortie.convert('RGBA'))
    if lu.shape != im.shape:
        return 0.0
    pareil = (lu[..., 3] == im[..., 3]) & ((lu[..., :3] == im[..., :3]).all(axis=2) | (im[..., 3] == 0))
    return float(pareil.mean())


def proche(sortie, im, ecart=20):
    lu = np.array(sortie.convert('RGBA')).astype(int)
    if lu.shape != im.shape:
        return 0.0
    pareil = (lu[..., 3] == im[..., 3]) & ((np.abs(lu[..., :3] - im[..., :3]).max(axis=2) <= ecart) | (im[..., 3] == 0))
    return float(pareil.mean())


ECHECS = []


def essai(nom, vrai, detail=''):
    print('%s %s%s' % ('ok   ' if vrai else 'ÉCHEC', nom, ' : ' + detail if detail and not vrai else ''))
    if not vrai:
        ECHECS.append(nom)


def main():
    blanc, gris, rose = (255, 255, 255), (204, 204, 204), (255, 0, 255)

    for taille in (16, 32):
        im = dessin(taille, taille)
        for facteur in (4, 10, 20):
            s, r = convertit(capture(im, facteur, rose))
            essai('%d × %d agrandi %d fois' % (taille, taille, facteur),
                  accord(s, im) == 1 and r['pixel_de_base'] == facteur and r['toile'] == taille,
                  '%s, accord %.3f' % (r, accord(s, im)))
        for facteur in (7.5, 12.5, 13.3):
            s, r = convertit(capture(im, facteur, rose, filtre=Image.BOX))
            essai('%d × %d agrandi %g fois (bords fondus)' % (taille, taille, facteur),
                  accord(s, im) == 1 and abs(r['pixel_de_base'] - facteur) < 0.1,
                  '%s, accord %.3f' % (r, accord(s, im)))
        s, r = convertit(capture(im, 12, blanc, damier=gris))
        essai('%d × %d sur un damier de transparence' % (taille, taille),
              accord(s, im) == 1 and len(r['fond']) == 2, '%s, accord %.3f' % (r, accord(s, im)))
        s, r = convertit(jpeg(capture(im, 12, rose), 85))
        essai('%d × %d en JPEG' % (taille, taille),
              proche(s, im) >= 0.99 and abs(r['pixel_de_base'] - 12) < 0.05 and len(r['palette']) <= 16,
              '%s, accord %.3f' % (r, proche(s, im)))
        s, r = convertit(Image.fromarray(im, 'RGBA'))
        essai('%d × %d déjà à sa taille' % (taille, taille), accord(s, im) == 1, str(r))

    # Le fond enfermé dans le dessin est gardé (le blanc d'un œil), sauf avec trous=True.
    im = dessin(16, 3, couleurs=3)
    im[7:9, 4:6] = im[7:9, 10:12] = blanc + (255,)
    s, r = convertit(capture(im, 10, blanc))
    essai('fond enfermé gardé', accord(s, im) == 1, str(r))
    s, r = convertit(capture(im, 10, blanc), trous=True)
    essai('fond enfermé retiré avec trous', np.array(s.convert('RGBA'))[7, 4, 3] == 0, str(r))

    # Un petit dessin de 16 garde sa taille : centré sur la toile, ou posé en bas.
    petit = np.zeros((16, 16, 4), dtype=np.uint8)
    petit[5:12, 4:12] = dessin(16, 5)[4:11, 4:12]
    petit[5:12, 4:12, 3] = 255
    s, r = convertit(capture(petit, 10, rose))
    essai('dessin de 8 × 7 centré sur 16', r['dessin'] == [8, 7] and r['toile'] == 16
          and np.array(s.convert('RGBA'))[4:11, 4:12, 3].all(), str(r))
    s, r = convertit(capture(petit, 10, rose), ancrage='bas')
    essai('dessin posé en bas', np.array(s.convert('RGBA'))[9:16, 4:12, 3].all(), str(r))

    # Un dessin de 32 demandé en 16 y est ramené ; un dessin trop grand est ramené à 32.
    s, r = convertit(capture(dessin(32, 6), 10, rose), taille=16)
    essai('32 ramené à 16', s.size == (16, 16) and r['dessin'] == [16, 16] and r['notes'], str(r))
    grand = np.kron(dessin(32, 7), np.ones((2, 2, 1), dtype=np.uint8))[::1]
    grand[::2, ::2, :3] = grand[::2, ::2, :3] // 2
    s, r = convertit(capture(grand, 5, rose))
    essai('64 ramené à 32', s.size == (32, 32) and r['dessin'] == [32, 32] and r['notes'], str(r))

    # La palette : plus de 16 couleurs au départ, 16 au plus à l'arrivée, toutes du dessin.
    riche = np.zeros((32, 32, 4), dtype=np.uint8)
    h = np.random.default_rng(11)
    for y in range(32):
        for x in range(32):
            riche[y, x] = tuple(60 + 65 * int(v) for v in h.integers(0, 4, 3)) + (255,)
    s, r = convertit(capture(riche, 8, (0, 0, 0)))
    depart = {'#%02x%02x%02x' % tuple(c[:3]) for c in riche.reshape(-1, 4)}
    essai('palette réduite à 16', len(r['palette']) == 16 and r['couleurs_lues'] > 16
          and set(r['palette']) <= depart, str(r))
    s, r = convertit(capture(riche, 8, (0, 0, 0)), couleurs=4)
    essai('palette réduite à 4', len(r['palette']) == 4 and len(s.convert('RGBA').getcolors()) == 4, str(r))

    # Les motifs : symétrie, contour, trame, motif répété (et sa correction).
    im = dessin(16, 8)
    s, r = convertit(capture(im, 10, rose))
    essai('symétrie et contour', r['motifs']['symetrie_gauche_droite'] == 1
          and r['motifs']['contour']['couleur'] == '#1b1b29', str(r['motifs']))
    trame = np.zeros((16, 16, 4), dtype=np.uint8)
    for y in range(16):
        for x in range(16):
            k = (5 if (x + y) % 2 else 6) if y < 8 else 7
            trame[y, x] = PALETTE[k] + (255,)
    s, r = convertit(capture(trame, 10, rose))
    essai('trame', r['motifs'].get('trames', [{}])[0].get('couleurs') == ['#3f7d3a', '#7fc24e'], str(r['motifs']))
    tuile = dessin(8, 9, couleurs=5)
    tuile[tuile[..., 3] == 0] = PALETTE[12] + (255,)
    mur = np.tile(tuile, (4, 4, 1))
    abime = mur.copy()
    abime[5, 5] = abime[20, 9] = PALETTE[9] + (255,)
    s, r = convertit(capture(abime, 8, rose))
    essai('motif répété corrigé', r['motifs']['motif_repete']['largeur'] == 8
          and r['motifs']['motif_repete']['hauteur'] == 8 and accord(s, mur) == 1, str(r['motifs']))
    s, r = convertit(capture(abime, 8, rose), corrige_motifs=False)
    essai('motif répété laissé tel quel', accord(s, abime) == 1, str(r['motifs']))

    print('%d échec(s)' % len(ECHECS))
    return 1 if ECHECS else 0


if __name__ == '__main__':
    sys.exit(main())
