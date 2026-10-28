"""Les bruits de bêtes que le jeu synthétise encore, à côté des vrais enregistrements.

Les poules, vaches, moutons, le cheval et le coq sont de vrais enregistrements libres de droits
(scripts/son/enregistrements/, crédits dans credits.json). Restent ici, faute
d'enregistrement libre accessible, les sabots : une diagonale de trot (deux sabots presque
ensemble) par fichier, sur trois sols.

Usage : python3 betes.py [dossier]  (défaut _sortie/betes)
"""
import os, sys, wave
import numpy as np
from synthlib import SR
from animaux import plein_air, pic
from betes_reelles import SABOTS, impact

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '_sortie', 'betes')


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
    for sol, modele in (('pierre', SABOTS[0]), ('terre', SABOTS[1]), ('herbe', SABOTS[2])):
        for k in range(4):
            sauve(f'sabots_{sol}_{k+1}', diagonale(modele, 600 + 10 * k + len(sol)))
    print('ok')
