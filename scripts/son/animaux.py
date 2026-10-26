"""Family Farm — les bêtes de la ferme, deuxième version : trois propositions par son.

A « réaliste »   : source glottique (impulsions de Rosenberg, jitter, shimmer, souffle,
                   rugosité par sous-harmonique) dans des formants qui bougent dans le temps.
B « dessin animé » : les mêmes voix, contours exagérés et accordés sur la gamme du jeu,
                   plus nettes et plus courtes ; sabots en « noix de coco ».
C « rétro doux » : voix carrées et triangles à enveloppe de hauteur, comme une console douce,
                   pour aller avec la musique au synthé.

Usage : python3 animaux.py [dossier]  (par défaut _sortie/animaux) → un WAV par proposition.
"""
import os, sys, json
import numpy as np
from scipy import signal
from synthlib import SR, mtof, lowpass, highpass, bandpass, resonator, make_ir, fade_edges

OUT = sys.argv[1] if len(sys.argv) > 1 else '_sortie/animaux'
INFO = {}


# ===================================================================== outils

def courbe(points, n):
    """Contour piecewise-lineaire : points = [(t0..1, valeur), …] → n valeurs."""
    t = np.linspace(0, 1, n)
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def bruit_lent(n, fc, rng):
    x = rng.standard_normal(n + SR // 2)
    b, a = signal.butter(1, max(fc, 0.5) / (SR / 2))
    y = signal.lfilter(b, a, x)[SR // 2:]
    return y / (np.std(y) + 1e-9)


def source_glottique(f0, rng, ouvert=0.55, ferme=0.18, jitter=0.01, shimmer=0.08, souffle=0.04,
                     rugosite=0.0, sous=0.5):
    """Dérivée d'un train d'impulsions de Rosenberg à hauteur variable (f0 : tableau en Hz)."""
    n = len(f0)
    f = f0 * (1 + jitter * bruit_lent(n, 40, rng))
    ph = np.cumsum(f) / SR
    p = ph % 1.0
    g = np.where(p < ouvert, 0.5 * (1 - np.cos(np.pi * p / ouvert)),
                 np.where(p < ouvert + ferme, np.cos(np.pi * (p - ouvert) / (2 * ferme)), 0.0))
    d = np.diff(g, prepend=0) * SR / (f + 1)            # dérivée normalisée : riche en harmoniques
    amp = 1 + shimmer * bruit_lent(n, 30, rng)
    s = d * amp
    if rugosite:
        # doublement de période (voix éraillée) : une période sur deux plus faible
        per = np.floor(ph) % 2
        s *= 1 - rugosite * per * (0.5 + 0.5 * bruit_lent(n, 8, rng).clip(-1, 1))
        s += rugosite * sous * np.sin(np.pi * ph) * 0.3 * (0.5 + 0.5 * bruit_lent(n, 5, rng))
    s += souffle * rng.standard_normal(n) * (0.4 + g)
    return s


def formants(x, pistes, bloc=128):
    """Banc de résonateurs à fréquences mouvantes. pistes : [(f(t), bw(t), gain), …] tableaux."""
    n = len(x)
    out = np.zeros(n)
    for fr, bw, gain in pistes:
        y = np.zeros(n); zi = np.zeros(2)
        for i in range(0, n, bloc):
            j = min(n, i + bloc); k = (i + j) // 2
            r = np.exp(-np.pi * bw[k] / SR); th = 2 * np.pi * fr[k] / SR
            a = [1, -2 * r * np.cos(th), r * r]; b = [(1 - r * r) * 0.5, 0, -(1 - r * r) * 0.5]
            y[i:j], zi = signal.lfilter(b, a, x[i:j], zi=zi)
        out += y * gain
    return out


def env(n, a, r, forme=1.0):
    e = np.ones(n); an, rn = max(1, int(a * SR)), max(1, int(r * SR))
    an = min(an, n // 2); rn = min(rn, n - an)
    e[:an] = np.linspace(0, 1, an) ** forme; e[n - rn:] = np.linspace(1, 0, rn) ** 1.5
    return e


def plein_air(y, wet=0.15, seed=3, decay=0.8):
    ir = make_ir(decay * 1.2, decay, 6000, seed)
    out = np.zeros((2, len(y) + ir.shape[1] - 1))
    for c in range(2):
        out[c] = signal.fftconvolve(y, ir[c])
    dry = np.zeros_like(out); dry[:, :len(y)] = y
    return dry * (1 - wet) + out * wet * 0.35


def pic(x, db=-1.0):
    return x * (10 ** (db / 20) / (np.max(np.abs(x)) + 1e-12))


def suite(parts):
    """Concatène [(signal, silence_après_s), …]."""
    out = []
    for s, gap in parts:
        out += [s, np.zeros(int(gap * SR))]
    return np.concatenate(out)


def sauve(cle, prop, y, note):
    y = np.asarray(y)
    if y.ndim == 1:
        y = np.stack([y, y])
    y = fade_edges(pic(y, -1.0), 0.003, 0.03)
    os.makedirs(OUT, exist_ok=True)
    nom = f'{cle}_{prop}'
    import wave
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(f'{OUT}/{nom}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    INFO[nom] = dict(cle=cle, prop=prop, note=note, duree=round(y.shape[1] / SR, 2))


def carre(f, n, duty=0.5):
    ph = np.cumsum(f) / SR
    return np.where(ph % 1 < duty, 1.0, -1.0)


def triangle(f, n):
    ph = np.cumsum(f) / SR
    return 2 * np.abs(2 * (ph % 1) - 1) - 1


def crush(x, bits=6, keep=4):
    y = np.round(x * (2 ** (bits - 1))) / (2 ** (bits - 1))
    y = np.repeat(y[::keep], keep)[:len(x)]
    return lowpass(y, 9000)


# ===================================================================== POULE

def poule_A(seed):
    """Gloussements « tok-tok… tok-tok-tôôk », formants nasaux qui se ferment."""
    rng = np.random.default_rng(seed); parts = []
    for i in range(rng.integers(3, 6)):
        d = rng.uniform(0.06, 0.1); n = int(d * SR); f0 = rng.uniform(330, 430)
        f = courbe([(0, f0 * 0.85), (0.3, f0 * 1.15), (1, f0 * 0.9)], n)
        s = source_glottique(f, rng, jitter=0.02, shimmer=0.15, souffle=0.08, rugosite=0.25)
        y = formants(s, [(courbe([(0, 1100), (1, 750)], n), np.full(n, 160), 1.0),
                         (courbe([(0, 2100), (1, 1700)], n), np.full(n, 220), 0.6),
                         (np.full(n, 3300), np.full(n, 400), 0.25)])
        parts.append((y * env(n, 0.006, 0.035), rng.uniform(0.05, 0.16)))
    if rng.random() < 0.7:   # le « tôôk » montant de la fin
        d = 0.32; n = int(d * SR); f0 = rng.uniform(420, 520)
        f = courbe([(0, f0), (0.2, f0 * 1.55), (0.7, f0 * 1.45), (1, f0 * 1.1)], n)
        s = source_glottique(f, rng, jitter=0.02, shimmer=0.12, souffle=0.08, rugosite=0.4)
        y = formants(s, [(courbe([(0, 900), (0.3, 1300), (1, 1000)], n), np.full(n, 150), 1.0),
                         (courbe([(0, 1900), (0.3, 2300), (1, 2000)], n), np.full(n, 220), 0.7),
                         (np.full(n, 3400), np.full(n, 400), 0.3)])
        parts.append((y * env(n, 0.02, 0.12), 0))
    y = suite(parts)
    return plein_air(highpass(y, 180), 0.12, seed)


def poule_B(seed):
    """Dessin animé : « bok bok bok BAWK ! » accordé (do, mi, sol)."""
    rng = np.random.default_rng(seed); parts = []
    notes = [72, 72, 76, 72] if seed % 2 else [74, 74, 74, 79]
    for i, m in enumerate(notes[:-1]):
        n = int(0.08 * SR); f0 = mtof(m - 12)
        f = courbe([(0, f0 * 0.9), (0.4, f0 * 1.05), (1, f0)], n)
        s = source_glottique(f, rng, jitter=0.004, shimmer=0.03, souffle=0.02)
        y = formants(s, [(np.full(n, 1000), np.full(n, 140), 1), (np.full(n, 1900), np.full(n, 200), 0.5)])
        parts.append((y * env(n, 0.005, 0.03), 0.09))
    n = int(0.3 * SR); f0 = mtof(notes[-1] - 12)
    f = courbe([(0, f0), (0.15, f0 * 1.5), (1, f0 * 1.35)], n)
    s = source_glottique(f, rng, jitter=0.006, shimmer=0.04, souffle=0.03, rugosite=0.15)
    y = formants(s, [(courbe([(0, 900), (0.3, 1400), (1, 1200)], n), np.full(n, 140), 1),
                     (np.full(n, 2300), np.full(n, 220), 0.6)])
    parts.append((y * env(n, 0.01, 0.1), 0))
    return plein_air(suite(parts), 0.1, seed)


def poule_C(seed):
    rng = np.random.default_rng(seed); parts = []
    for i in range(4):
        n = int(0.07 * SR); m = [76, 76, 79, 84][i] + (seed % 3)
        f = courbe([(0, mtof(m) * 0.8), (0.3, mtof(m)), (1, mtof(m) * 0.95)], n)
        parts.append((carre(f, n, 0.25) * env(n, 0.002, 0.03) * 0.5, 0.06 if i < 3 else 0))
    return crush(suite(parts))


# ===================================================================== COQ

def coq_A():
    """« Co-co-ri-cooo » éraillé : quatre syllabes, la dernière longue et qui retombe."""
    rng = np.random.default_rng(11); parts = []
    syl = [(0.14, [(0, 520), (1, 600)], 0.06), (0.16, [(0, 600), (1, 720)], 0.05),
           (0.3, [(0, 760), (0.4, 880), (1, 840)], 0.04),
           (1.15, [(0, 860), (0.15, 900), (0.6, 820), (0.85, 640), (1, 470)], 0)]
    for d, contour, gap in syl:
        n = int(d * SR); f = courbe(contour, n)
        f *= 1 + 0.012 * np.sin(2 * np.pi * 7 * np.arange(n) / SR) * np.linspace(0, 1, n)
        s = source_glottique(f, rng, ouvert=0.5, ferme=0.12, jitter=0.025, shimmer=0.18, souffle=0.1, rugosite=0.55, sous=0.7)
        y = formants(s, [(courbe([(0, 900), (0.5, 1200), (1, 800)], n), np.full(n, 180), 1.0),
                         (courbe([(0, 1900), (0.5, 2300), (1, 1700)], n), np.full(n, 250), 0.8),
                         (np.full(n, 3300), np.full(n, 380), 0.45),
                         (np.full(n, 4500), np.full(n, 600), 0.15)])
        parts.append((y * env(n, 0.015, min(0.3, d * 0.4)), gap))
    y = highpass(suite(parts), 250)
    return plein_air(y, 0.28, 12, 1.6)   # au loin, dans l'air du matin


def coq_B():
    """Accordé sur le thème du matin : sol-sol-do-mi… ré, comme une petite fanfare."""
    rng = np.random.default_rng(13); parts = []
    for d, m0, m1, gap in ((0.13, 67, 67, 0.05), (0.13, 67, 69, 0.05), (0.25, 72, 72, 0.04), (0.95, 76, 74, 0)):
        n = int(d * SR); f = courbe([(0, mtof(m0 - 12)), (0.25, mtof(m1 - 12)), (1, mtof(m1 - 12) * (0.93 if d > 0.5 else 1))], n)
        f *= 1 + 0.008 * np.sin(2 * np.pi * 6 * np.arange(n) / SR) * np.linspace(0, 1, n)
        s = source_glottique(f, rng, jitter=0.006, shimmer=0.05, souffle=0.04, rugosite=0.2)
        y = formants(s, [(courbe([(0, 900), (0.5, 1250), (1, 950)], n), np.full(n, 150), 1),
                         (np.full(n, 2100), np.full(n, 220), 0.7), (np.full(n, 3200), np.full(n, 350), 0.3)])
        parts.append((y * env(n, 0.012, min(0.25, d * 0.4)), gap))
    return plein_air(suite(parts), 0.22, 14, 1.3)


def coq_C():
    parts = []
    for d, m0, m1, gap in ((0.12, 79, 79, 0.04), (0.12, 79, 81, 0.04), (0.2, 84, 84, 0.03), (0.8, 88, 86, 0)):
        n = int(d * SR); f = courbe([(0, mtof(m0)), (0.2, mtof(m1)), (1, mtof(m1))], n)
        f *= 1 + 0.02 * np.sin(2 * np.pi * 7 * np.arange(n) / SR) * np.linspace(0, 1, n)
        parts.append((carre(f, n, 0.3) * env(n, 0.005, d * 0.4) * 0.5, gap))
    y = crush(suite(parts))
    return plein_air(y, 0.2, 15, 1.0)


# ===================================================================== MOUTON

def mouton_A(seed):
    """« Bêêê » chevrotant : 7 à 9 battements par seconde, en hauteur et en volume."""
    rng = np.random.default_rng(seed); d = rng.uniform(0.75, 1.05); n = int(d * SR)
    f0 = rng.uniform(230, 300); t = np.arange(n) / SR; v = rng.uniform(7, 9.5)
    trem = np.sin(2 * np.pi * v * t)
    f = courbe([(0, f0 * 1.08), (0.15, f0), (1, f0 * 0.9)], n) * (1 + 0.05 * trem)
    s = source_glottique(f, rng, jitter=0.02, shimmer=0.1, souffle=0.1, rugosite=0.3)
    y = formants(s, [(courbe([(0, 450), (0.12, 750), (1, 680)], n), np.full(n, 120), 1.0),     # « m » → « ê »
                     (courbe([(0, 1200), (0.12, 1800), (1, 1650)], n), np.full(n, 180), 0.7),
                     (np.full(n, 2700), np.full(n, 300), 0.35)])
    y *= (0.6 + 0.4 * (0.5 + 0.5 * trem)) * env(n, 0.04, 0.2)
    return plein_air(highpass(y, 150), 0.14, seed)


def mouton_B(seed):
    rng = np.random.default_rng(seed); n = int(0.8 * SR); t = np.arange(n) / SR
    m = 64 + (seed % 3) * 2; trem = np.sin(2 * np.pi * 9 * t)
    f = courbe([(0, mtof(m - 12) * 1.12), (0.12, mtof(m - 12)), (1, mtof(m - 12) * 0.97)], n) * (1 + 0.035 * trem)
    s = source_glottique(f, rng, jitter=0.006, shimmer=0.04, souffle=0.04)
    y = formants(s, [(courbe([(0, 500), (0.12, 780), (1, 760)], n), np.full(n, 110), 1),
                     (courbe([(0, 1300), (0.12, 1850), (1, 1800)], n), np.full(n, 160), 0.7),
                     (np.full(n, 2800), np.full(n, 280), 0.3)])
    y *= (0.65 + 0.35 * (0.5 + 0.5 * trem)) * env(n, 0.03, 0.18)
    return plein_air(y, 0.1, seed)


def mouton_C(seed):
    n = int(0.7 * SR); t = np.arange(n) / SR; m = 67 + (seed % 3) * 2
    f = mtof(m) * (1 + 0.06 * np.sin(2 * np.pi * 10 * t)) * courbe([(0, 1.1), (0.1, 1), (1, 0.95)], n)
    y = triangle(f, n) * 0.6 + carre(f, n, 0.125) * 0.2
    y *= (0.55 + 0.45 * (np.sin(2 * np.pi * 10 * t) > 0)) * env(n, 0.01, 0.2)
    return crush(y)


# ===================================================================== VACHE

def vache_A(seed):
    """« Mmmeuuuh » : bouche fermée (nasal grave), qui s'ouvre, monte un peu, retombe dans un souffle."""
    rng = np.random.default_rng(seed); d = rng.uniform(1.6, 2.2); n = int(d * SR)
    f0 = rng.uniform(95, 125)
    f = courbe([(0, f0 * 0.85), (0.25, f0 * 1.1), (0.65, f0 * 1.18), (1, f0 * 0.82)], n)
    s = source_glottique(f, rng, ouvert=0.6, ferme=0.25, jitter=0.012, shimmer=0.08, souffle=0.05, rugosite=0.2, sous=0.8)
    ouv = courbe([(0, 0), (0.22, 0.15), (0.45, 1), (0.85, 0.9), (1, 0.6)], n)
    y = formants(s, [(250 + 300 * ouv, np.full(n, 90), 1.0),
                     (700 + 400 * ouv, np.full(n, 140), 0.25 + 0.6 * ouv.mean()),
                     (np.full(n, 2400), np.full(n, 300), 0.12)])
    y = lowpass(y * (0.35 + 0.65 * ouv) * env(n, 0.15, 0.4), 3200)
    sou = bandpass(rng.standard_normal(int(0.5 * SR)), 300, 2200) * np.hanning(int(0.5 * SR)) * 0.08
    y = np.concatenate([y, sou])
    return plein_air(y, 0.16, seed, 1.0)


def vache_B(seed):
    rng = np.random.default_rng(seed); n = int(1.5 * SR)
    f0 = mtof(45 + (seed % 2) * 2)
    f = courbe([(0, f0 * 0.9), (0.3, f0 * 1.12), (0.7, f0 * 1.12), (1, f0 * 0.75)], n)
    f *= 1 + 0.015 * np.sin(2 * np.pi * 5 * np.arange(n) / SR) * np.linspace(0, 1, n)
    s = source_glottique(f, rng, jitter=0.004, shimmer=0.03, souffle=0.02)
    ouv = courbe([(0, 0), (0.25, 1), (1, 0.8)], n)
    y = formants(s, [(280 + 350 * ouv, np.full(n, 80), 1), (750 + 350 * ouv, np.full(n, 120), 0.5), (np.full(n, 2400), np.full(n, 250), 0.1)])
    return plein_air(lowpass(y * (0.4 + 0.6 * ouv) * env(n, 0.1, 0.35), 3000), 0.12, seed)


def vache_C(seed):
    n = int(1.2 * SR); t = np.arange(n) / SR; m = 48 + (seed % 2) * 2
    f = mtof(m) * courbe([(0, 0.9), (0.3, 1.12), (1, 0.8)], n) * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))
    y = lowpass(carre(f, n, 0.4), courbe([(0, 300), (0.3, 1400), (1, 600)], n).mean())
    y = lowpass(y, 1600) * env(n, 0.08, 0.3)
    return crush(y)


# ===================================================================== CHEVAL

def hennissement_A():
    """Le hennissement : une montée aiguë, des trilles rapides qui descendent, un ébrouement."""
    rng = np.random.default_rng(21); d = 1.5; n = int(d * SR); t = np.arange(n) / SR
    base = courbe([(0, 650), (0.08, 1050), (0.3, 980), (0.7, 700), (1, 420)], n)
    trille = 1 + courbe([(0, 0.03), (0.2, 0.12), (1, 0.08)], n) * np.sin(2 * np.pi * courbe([(0, 9), (1, 13)], n).cumsum() / SR * 1)
    f = base * trille
    s = source_glottique(f, rng, jitter=0.03, shimmer=0.2, souffle=0.12, rugosite=0.5, sous=0.6)
    y = formants(s, [(courbe([(0, 1100), (1, 800)], n), np.full(n, 200), 1.0),
                     (courbe([(0, 2000), (1, 1600)], n), np.full(n, 260), 0.7),
                     (np.full(n, 3200), np.full(n, 400), 0.35)])
    y *= env(n, 0.04, 0.45) * (0.75 + 0.25 * np.abs(np.sin(np.pi * courbe([(0, 6), (1, 11)], n).cumsum() / SR)))
    eb = ebrouement_A(seed=22, seul=False)
    return plein_air(highpass(np.concatenate([y, np.zeros(int(0.12 * SR)), eb * 0.8]), 120), 0.18, 23, 1.1)


def ebrouement_A(seed=24, seul=True):
    """Le cheval souffle par les naseaux : un bruit nasal, les lèvres qui battent (~25 Hz)."""
    rng = np.random.default_rng(seed); n = int(0.6 * SR); t = np.arange(n) / SR
    flux = bandpass(rng.standard_normal(n), 180, 2400)
    battement = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * courbe([(0, 28), (1, 18)], n).cumsum() / SR))
    y = flux * (0.4 + 0.6 * battement) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
    y = formants(y, [(np.full(n, 450), np.full(n, 250), 1.0), (np.full(n, 1300), np.full(n, 400), 0.5)]) + flux * 0.15
    y *= env(n, 0.03, 0.25)
    return plein_air(y, 0.12, seed) if seul else y


def renaclement_A():
    """Le petit rire grave (« hu-hu-hu ») d'un cheval content."""
    rng = np.random.default_rng(25); n = int(0.9 * SR); t = np.arange(n) / SR
    f = courbe([(0, 95), (1, 80)], n)
    s = source_glottique(f, rng, jitter=0.02, shimmer=0.1, souffle=0.2, rugosite=0.3)
    puls = (np.sin(2 * np.pi * 7.5 * t) > -0.2) * np.hanning(n) ** 0.4
    y = formants(s, [(np.full(n, 350), np.full(n, 120), 1), (np.full(n, 900), np.full(n, 200), 0.4)]) * puls
    return plein_air(lowpass(y, 2500), 0.12, 26)


def hennissement_B():
    rng = np.random.default_rng(27); n = int(1.2 * SR); t = np.arange(n) / SR
    base = courbe([(0, mtof(79)), (0.1, mtof(84)), (0.5, mtof(79)), (1, mtof(72))], n)
    f = base * (1 + 0.07 * np.sin(2 * np.pi * 11 * t))
    s = source_glottique(f, rng, jitter=0.008, shimmer=0.05, souffle=0.04, rugosite=0.2)
    y = formants(s, [(np.full(n, 1200), np.full(n, 200), 1), (np.full(n, 2100), np.full(n, 250), 0.6)]) * env(n, 0.03, 0.4)
    return plein_air(np.concatenate([y, np.zeros(int(0.1 * SR)), ebrouement_A(28, False) * 0.6]), 0.14, 29)


def hennissement_C():
    n = int(1.0 * SR); t = np.arange(n) / SR
    f = courbe([(0, mtof(84)), (0.1, mtof(91)), (1, mtof(79))], n) * (1 + 0.08 * np.sin(2 * np.pi * 12 * t))
    y = carre(f, n, 0.25) * env(n, 0.01, 0.3) * 0.5
    nz = np.random.default_rng(30).standard_normal(int(0.3 * SR))
    nz = np.repeat(nz[::40], 40)[:int(0.3 * SR)] * np.hanning(int(0.3 * SR)) * 0.3
    return crush(np.concatenate([y, np.zeros(int(0.08 * SR)), nz]))


# ===================================================================== SABOTS

def sabot(sol, rng, style):
    n = int(0.16 * SR); t = np.arange(n) / SR
    if style == 'B':   # noix de coco : deux demi-coques de bois
        exc = rng.standard_normal(n) * np.exp(-t / 0.0015)
        return (resonator(exc, rng.uniform(850, 1000), 18) + resonator(exc, rng.uniform(1700, 1900), 22) * 0.4) * (1.2 if sol == 'pierre' else 1)
    if style == 'C':
        f = courbe([(0, 900 if sol == 'pierre' else 300), (1, 200 if sol == 'pierre' else 90)], n)
        y = triangle(f, n) * np.exp(-t / 0.03)
        if sol != 'pierre':
            nz = rng.standard_normal(n); y += np.repeat(nz[::8], 8)[:n] * np.exp(-t / 0.02) * 0.3
        return y
    # A : la corne qui frappe (creux), puis le sol
    exc = rng.standard_normal(n) * np.exp(-t / 0.0012)
    corne = resonator(exc, rng.uniform(520, 640), 7) * 0.9 + resonator(exc, rng.uniform(1150, 1350), 10) * 0.5
    if sol == 'pierre':
        y = corne * 0.8 + resonator(exc, rng.uniform(2600, 3100), 18) * 0.7 + highpass(rng.standard_normal(n), 3000) * np.exp(-t / 0.006) * 0.3
    elif sol == 'herbe':
        y = lowpass(corne, 1500) * 0.6 + lowpass(rng.standard_normal(n), 160) * np.exp(-t / 0.03) * 1.2
        y += bandpass(rng.standard_normal(n) * (rng.random(n) < 0.05), 2000, 7000) * np.exp(-t / 0.05) * 1.2
    else:   # terre
        y = corne * 0.8 + lowpass(rng.standard_normal(n), 220) * np.exp(-t / 0.025) * 1.4
        y += bandpass(rng.standard_normal(n) * (rng.random(n) < 0.08), 800, 4000) * np.exp(-t / 0.04) * 0.7
    return y


ALLURES = {   # instants des sabots dans un cycle, durée du cycle (s)
    'pas': ([0.0, 0.25, 0.5, 0.75], 1.0),            # quatre temps égaux
    'trot': ([0.0, 0.04, 0.5, 0.54], 0.62),           # deux temps (diagonales presque ensemble)
}


def sabots(sol, allure, style, seed, cycles=2):
    rng = np.random.default_rng(seed)
    temps, cyc = ALLURES[allure]
    n = int(cyc * cycles * SR + 0.2 * SR); y = np.zeros(n)
    for c in range(cycles):
        for k, tk in enumerate(temps):
            h = sabot(sol, rng, style) * rng.uniform(0.7, 1.0) * (1.0 if k % 2 == 0 else 0.8)
            s = int((c * cyc + tk * cyc + rng.uniform(-0.008, 0.008)) * SR); s = max(0, s)
            y[s:s + len(h)] += h[: n - s]
    if style == 'A' and sol != 'pierre':
        y += lowpass(np.random.default_rng(seed + 1).standard_normal(n), 300) * 0.01   # le harnais, le souffle
    return plein_air(y, 0.08 if style != 'C' else 0.04, seed)


# ===================================================================== ENCLOS (fonds)

def fond_poulailler(dur=24.0, seed=40):
    """Basse-cour : grattements, paille, petits roucoulements contents, gloussements épars."""
    rng = np.random.default_rng(seed); N = int(dur * SR); buf = np.zeros((2, N))
    paille = bandpass(rng.standard_normal(N), 1500, 7000) * (rng.random(N) < 0.02) * 0.6
    for c in range(2):
        buf[c] += lowpass(np.roll(paille, c * 999), 8000) * 0.25
    t = 0.0
    while t < dur:   # roucoulement de contentement (« rrrou » grave et trillé)
        d = rng.uniform(0.4, 0.8); n = int(d * SR); tt = np.arange(n) / SR
        f = courbe([(0, rng.uniform(260, 320)), (1, rng.uniform(220, 260))], n)
        s = source_glottique(f, rng, jitter=0.03, shimmer=0.2, souffle=0.1)
        y = formants(s, [(np.full(n, 700), np.full(n, 150), 1), (np.full(n, 1500), np.full(n, 250), 0.4)])
        y *= (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(14, 20) * tt)) * env(n, 0.05, 0.2) * rng.uniform(0.15, 0.35)
        st = int(t * SR); e = min(N, st + n); p = rng.uniform(-0.7, 0.7)
        buf[0, st:e] += y[: e - st] * np.cos((p + 1) * np.pi / 4); buf[1, st:e] += y[: e - st] * np.sin((p + 1) * np.pi / 4)
        t += rng.uniform(0.8, 2.2)
    return buf


def fond_etable(dur=24.0, seed=50, cloche=True):
    """Étable : souffle lent, mastication, paille, une clochette qui tinte quand une vache bouge."""
    rng = np.random.default_rng(seed); N = int(dur * SR); buf = np.zeros((2, N)); t0 = np.arange(N) / SR
    for c in range(2):   # respirations lentes de deux bêtes
        per = rng.uniform(3.5, 4.5)
        resp = np.clip(np.sin(2 * np.pi * t0 / per + c), 0, 1) ** 2
        buf[c] += bandpass(rng.standard_normal(N), 150, 900) * resp * 0.05
    t = rng.uniform(0, 1)
    while t < dur:   # mastication : petits craquements rythmés (~1,4/s)
        n = int(0.09 * SR); tt = np.arange(n) / SR
        y = bandpass(rng.standard_normal(n), 400, 2500) * np.exp(-tt / 0.03) * 0.12
        st = int(t * SR); buf[:, st:st + n] += y[: N - st]
        t += rng.uniform(0.6, 0.8) if rng.random() < 0.9 else rng.uniform(2, 4)
    if cloche:
        t = rng.uniform(1, 4)
        while t < dur - 2:
            n = int(1.5 * SR); tt = np.arange(n) / SR; f = 820 * rng.uniform(0.97, 1.03)
            y = sum(np.sin(2 * np.pi * f * h * tt) * np.exp(-tt / (0.5 / h ** 0.5)) * g for h, g in ((1, 1), (2.32, 0.5), (3.9, 0.3), (5.4, 0.15)))
            for j in range(rng.integers(1, 4)):
                st = int((t + j * rng.uniform(0.25, 0.45)) * SR); buf[:, st:st + n] += (y * 0.06 * rng.uniform(0.5, 1))[: N - st]
            t += rng.uniform(4, 9)
    paille = bandpass(rng.standard_normal(N), 1200, 6000) * (rng.random(N) < 0.01) * 0.4
    buf += np.stack([paille, np.roll(paille, 777)]) * 0.3
    return buf


def fond_bergerie(dur=24.0, seed=60, sonnailles=True):
    rng = np.random.default_rng(seed); N = int(dur * SR); buf = np.zeros((2, N))
    pas_ = bandpass(rng.standard_normal(N), 300, 3000) * (rng.random(N) < 0.004) * 0.6
    buf += np.stack([pas_, np.roll(pas_, 555)]) * 0.4
    if sonnailles:   # les petites sonnailles de cuivre, qui tintent en marchant
        t = rng.uniform(0, 2)
        while t < dur - 1:
            n = int(0.6 * SR); tt = np.arange(n) / SR; f = rng.choice([1450, 1620, 1880])
            y = sum(np.sin(2 * np.pi * f * h * tt) * np.exp(-tt / (0.18 / h)) * g for h, g in ((1, 1), (2.7, 0.4), (4.1, 0.2)))
            for j in range(rng.integers(2, 5)):
                st = int((t + j * rng.uniform(0.15, 0.3)) * SR); buf[:, st:st + n] += (y * 0.035 * rng.uniform(0.4, 1))[: N - st]
            t += rng.uniform(2.5, 6)
    return buf


def boucle(buf, xf=1.5):
    """Rend une boucle : la fin fondue sur le début."""
    n = int(xf * SR); body = buf[:, :-n].copy(); w = np.sqrt(np.linspace(0, 1, n))
    body[:, :n] = body[:, :n] * w + buf[:, -n:] * w[::-1]
    return body


# ===================================================================== tout

if __name__ == '__main__':
    for v, s in enumerate((301, 302, 303)):
        sauve(f'poule_{v+1}', 'A', poule_A(s), 'gloussements nasaux, « tôôk » montant')
        sauve(f'poule_{v+1}', 'B', poule_B(s + v), '« bok bok BAWK » accordé')
        sauve(f'poule_{v+1}', 'C', poule_C(s + v), 'voix carrée')
        sauve(f'mouton_{v+1}', 'A', mouton_A(320 + v), 'bêlement chevrotant')
        sauve(f'mouton_{v+1}', 'B', mouton_B(320 + v), '« mèèè » doux et accordé')
        sauve(f'mouton_{v+1}', 'C', mouton_C(320 + v), 'triangle trémolo')
    for v, s in enumerate((311, 312)):
        sauve(f'vache_{v+1}', 'A', vache_A(s), '« mmmeuuuh » bouche qui s\'ouvre')
        sauve(f'vache_{v+1}', 'B', vache_B(s + v), 'meuh rond, vibrato')
        sauve(f'vache_{v+1}', 'C', vache_C(s + v), 'carré filtré')
    sauve('coq', 'A', coq_A(), 'éraillé, au loin')
    sauve('coq', 'B', coq_B(), 'accordé sur le thème du matin')
    sauve('coq', 'C', coq_C(), 'fanfare de console')
    sauve('hennissement', 'A', hennissement_A(), 'trilles qui descendent + ébrouement')
    sauve('hennissement', 'B', hennissement_B(), 'hennissement net et accordé')
    sauve('hennissement', 'C', hennissement_C(), 'console')
    sauve('ebrouement', 'A', ebrouement_A(), 'naseaux et lèvres')
    sauve('ebrouement', 'B', ebrouement_A(31) * 0.8, 'naseaux, plus court')
    sauve('ebrouement', 'C', crush(ebrouement_A(32, False)), 'console')
    sauve('renaclement', 'A', renaclement_A(), 'petit rire grave')
    for style in 'ABC':
        for sol in ('terre', 'herbe', 'pierre'):
            for allure in ('pas', 'trot'):
                sauve(f'sabots_{allure}_{sol}', style, sabots(sol, allure, style, 70 + ord(style) + len(sol)),
                      {'A': 'corne et sol', 'B': 'noix de coco', 'C': 'percussion de console'}[style])
    # fonds d'enclos (boucles)
    sauve('fond_poulailler', 'A', boucle(fond_poulailler()), 'basse-cour : paille, roucoulements')
    sauve('fond_etable', 'A', boucle(fond_etable()), 'étable : souffle, mastication, clochette')
    sauve('fond_etable', 'B', boucle(fond_etable(cloche=False)), 'étable sans clochette')
    sauve('fond_bergerie', 'A', boucle(fond_bergerie()), 'bergerie : sonnailles, bêlements lointains')
    sauve('fond_bergerie', 'B', boucle(fond_bergerie(sonnailles=False)), 'bergerie sans sonnailles')
    json.dump(INFO, open(f'{OUT}/info.json', 'w'), ensure_ascii=False, indent=1)
    print(len(INFO), 'sons')
