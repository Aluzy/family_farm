"""Les bruits de bêtes que le jeu synthétise encore, à côté des vrais enregistrements.

Les poules, vaches, moutons et le cheval sont de vrais enregistrements libres de droits
(scripts/son/enregistrements/, crédits dans credits.json). Restent ici, faute
d'enregistrement libre accessible :
- le coq du réveil : voix synthétique (source glottique + formants) réglée sur des mesures
  générales de chants de coq — hauteur médiane ≈ 750 Hz, formants ≈ 880 / 1 680 / 2 970 Hz,
  quatre syllabes dont la dernière longue (≈ 1,4 s en tout) ;
- les sabots : une diagonale de trot (deux sabots presque ensemble) par fichier, sur trois sols ;
- les fonds des enclos : paille et roucoulements, souffle et mastication avec une clochette,
  pas et sonnailles des moutons (boucles, sans cris : le jeu y ajoute les vrais).

Usage : python3 betes.py [dossier]  (défaut _sortie/betes)
"""
import os, sys, wave
import numpy as np
from synthlib import SR, highpass
from animaux import source_glottique, formants, courbe, env, plein_air, pic, suite, fond_poulailler, fond_etable, fond_bergerie, boucle
from betes_reelles import SABOTS, impact

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '_sortie', 'betes')


def coq(seed, hauteur=1.0, eraille=0.4):
    """« Co-co-ri-cooo » : deux syllabes brèves, une montante, la dernière longue qui retombe."""
    rng = np.random.default_rng(seed); parts = []
    syl = [(0.13, [(0, 600), (1, 680)], 0.07), (0.15, [(0, 680), (1, 800)], 0.06),
           (0.28, [(0, 820), (0.4, 930), (1, 900)], 0.05),
           (1.0, [(0, 900), (0.15, 940), (0.6, 860), (0.85, 700), (1, 520)], 0)]
    for d, contour, gap in syl:
        n = int(d * SR); f = courbe(contour, n) * hauteur
        f *= 1 + 0.01 * np.sin(2 * np.pi * 7 * np.arange(n) / SR) * np.linspace(0, 1, n)
        s = source_glottique(f, rng, ouvert=0.42, ferme=0.08, jitter=0.012, shimmer=0.12, souffle=0.08, rugosite=eraille, sous=0.6)
        y = formants(s, [(courbe([(0, 820), (0.5, 940), (1, 820)], n), np.full(n, 190), 1.0),
                         (courbe([(0, 1600), (0.5, 1760), (1, 1600)], n), np.full(n, 240), 0.85),
                         (np.full(n, 2970), np.full(n, 360), 0.5), (np.full(n, 4300), np.full(n, 600), 0.2)])
        parts.append((y * env(n, 0.012, min(0.28, d * 0.35)), gap))
    return plein_air(highpass(suite(parts), 300), 0.26, seed, 1.6)   # au loin, dans l'air du matin


def diagonale(s, seed):
    """Un temps de trot : deux sabots presque ensemble (≈ 30 ms)."""
    rng = np.random.default_rng(seed)
    a = impact(s, rng, rng.uniform(0.85, 1.0)); b = impact(s, rng, rng.uniform(0.6, 0.8))
    d = int(rng.uniform(0.022, 0.034) * SR)
    y = np.zeros(len(a) + d); y[:len(a)] += a; y[d:d + len(b)] += b
    return plein_air(y, 0.06, seed)


def sauve(nom, y):
    y = np.asarray(y)
    if y.ndim == 1:
        y = np.stack([y, y])
    y = pic(y, -1.0)
    n1, n2 = int(0.003 * SR), int(0.03 * SR)
    y[:, :n1] *= np.linspace(0, 1, n1); y[:, -n2:] *= np.linspace(1, 0, n2)
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(f'{OUT}/{nom}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    sauve('coq_1', coq(501, 1.0, 0.4))
    sauve('coq_2', coq(502, 0.92, 0.5))
    sauve('coq_3', coq(503, 1.06, 0.35))
    for sol, modele in (('pierre', SABOTS[0]), ('terre', SABOTS[1]), ('herbe', SABOTS[2])):
        for k in range(4):
            sauve(f'sabots_{sol}_{k+1}', diagonale(modele, 600 + 10 * k + len(sol)))
    sauve('fond_poulailler', boucle(fond_poulailler()))
    sauve('fond_etable', boucle(fond_etable(cloche=False)))   # la clochette : le vrai enregistrement, joué à part
    sauve('fond_bergerie', boucle(fond_bergerie()))
    print('ok')
