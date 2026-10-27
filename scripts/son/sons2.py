"""Family Farm — deuxième lot : tout ce que le jeu demande en plus du prototype.

Animaux de la ferme et faune du grand monde, pêche, houe, faux, semis, ramassage, mine,
eau (mer, lac, mare, grenouilles), forêt, montagne, hameau, machines, interface et progression.
"""
import sys
import numpy as np
from scipy import signal
from synthlib import *
import sons1 as M
from sons1 import (peak_to, env_exp, glide_tone, hann_env, whoosh, creak, drop, rustle, chime,
                         slow_lfo, latch, rev_tail, BIRDS)

M.A = sys.argv[1] if len(sys.argv) > 1 else '_sortie/pack2/audio'
R = np.random.default_rng(4242)
save = M.save


def mix_into(n, *parts):
    y = np.zeros(n)
    for st, s, g in parts:
        st = int(st * SR); e = min(n, st + len(s)); y[st:e] += s[: e - st] * g
    return y


# ======================= synthèse vocale animale =======================

def voice(f_contour, dur, formants, breath=0.15, rough=0.0, vib=(0, 0), seed=0, src='saw'):
    """Source glottale à hauteur variable → formants (pics résonants)."""
    r = np.random.default_rng(seed)
    n = int(round(dur * SR)); t = np.arange(n) / SR
    k = np.linspace(0, 1, n)
    f = np.interp(k, np.linspace(0, 1, len(f_contour)), f_contour)
    if vib[0]:
        f = f * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t))
    if rough:
        f = f * (1 + rough * lowpass(r.standard_normal(n), 60, 1) * 8)
    ph = np.cumsum(f) / SR
    if src == 'saw':
        s = 2 * (ph % 1) - 1
    else:  # impulsions (voix « pincée »)
        s = np.sin(2 * np.pi * ph) ** 9
    s = s + breath * r.standard_normal(n)
    out = np.zeros(n)
    for fr, q, g in formants:
        out += resonator(s, fr, q) * g
    return out


def morph(a_sig, b_sig, curve=None):
    n = min(len(a_sig), len(b_sig)); k = np.linspace(0, 1, n) if curve is None else curve
    return a_sig[:n] * (1 - k) + b_sig[:n] * k


def animal_env(n, a=0.04, r=0.12):
    e = np.ones(n); an, rn = int(a * SR), int(r * SR)
    e[:an] = np.linspace(0, 1, an); e[-rn:] = np.linspace(1, 0, rn) ** 1.5
    return e


def outdoor(y, wet=0.18, seed=21):
    return rev_tail(y, make_ir(0.9, 0.7, 6000, seed), wet)[0]


def hen_clucks(seed):
    r = np.random.default_rng(seed); parts = []
    for i in range(r.integers(3, 6)):
        d = r.uniform(0.07, 0.12); f0 = r.uniform(380, 520)
        v = voice([f0 * 0.9, f0 * 1.25, f0], d, [(900, 6, 1), (1800, 8, 0.6), (3000, 10, 0.25)], 0.25, 0.4, seed=seed + i)
        parts += [v * animal_env(len(v), 0.008, 0.04) * r.uniform(0.6, 1), np.zeros(int(r.uniform(0.06, 0.18) * SR))]
    if r.random() < 0.6:  # le « co-dêêt » final
        d = 0.35; f0 = r.uniform(450, 560)
        v = voice([f0, f0 * 1.6, f0 * 1.5, f0 * 1.2], d, [(1000, 5, 1), (2000, 7, 0.7), (3200, 9, 0.3)], 0.3, 0.6, seed=seed + 99)
        parts.append(v * animal_env(len(v), 0.02, 0.1))
    return outdoor(np.concatenate(parts))


def rooster():
    d = 1.9
    a = voice([480, 520, 900, 880, 820, 700, 420], d, [(800, 5, 1), (1600, 6, 0.8), (2800, 8, 0.4)], 0.2, 0.5, vib=(9, 0.01), seed=7)
    b = voice([480, 520, 900, 880, 820, 700, 420], d, [(600, 5, 1), (1100, 6, 0.8), (2500, 8, 0.3)], 0.2, 0.5, vib=(9, 0.01), seed=7)
    n = len(a); k = np.clip(np.linspace(-0.5, 1.5, n), 0, 1)
    y = morph(a, b, k)
    # trois syllabes « co-co-ri-co »
    e = np.zeros(n)
    for st, ln in ((0, 0.16), (0.2, 0.16), (0.42, 0.35), (0.82, 1.05)):
        s0, l0 = int(st * SR), int(ln * SR); e[s0:s0 + l0] = hann_env(l0, 0.15)
    return outdoor(y * e, 0.25)


def cow_moo(seed):
    r = np.random.default_rng(seed); d = r.uniform(1.3, 1.9); f0 = r.uniform(105, 135)
    a = voice([f0 * 0.9, f0 * 1.15, f0 * 1.2, f0], d, [(320, 4, 1), (750, 5, 0.6), (2400, 8, 0.15)], 0.08, 0.15, seed=seed)
    b = voice([f0 * 0.9, f0 * 1.15, f0 * 1.2, f0], d, [(550, 4, 1), (1000, 5, 0.6), (2400, 8, 0.2)], 0.08, 0.15, seed=seed)
    k = np.sin(np.linspace(0, np.pi, len(a))) ** 2
    y = morph(a, b, k) * animal_env(len(a), 0.12, 0.35)
    y = lowpass(y, 2500)
    return outdoor(y, 0.2)


def sheep_baa(seed):
    r = np.random.default_rng(seed); d = r.uniform(0.6, 1.0); f0 = r.uniform(280, 360)
    y = voice([f0 * 1.1, f0, f0 * 0.95], d, [(750, 5, 1), (1250, 6, 0.8), (2600, 8, 0.35)], 0.18, 0.2,
              vib=(r.uniform(7, 9), 0.06), seed=seed)
    t = np.arange(len(y)) / SR
    y *= 0.65 + 0.35 * np.sin(2 * np.pi * r.uniform(7, 9) * t)  # chevrotement
    return outdoor(y * animal_env(len(y), 0.03, 0.15), 0.18)


def cat_meow(seed):
    r = np.random.default_rng(seed); d = r.uniform(0.55, 0.8); f0 = r.uniform(550, 700)
    a = voice([f0 * 0.9, f0 * 1.35, f0 * 1.3, f0 * 0.85], d, [(1800, 6, 0.7), (3000, 8, 0.5), (700, 4, 0.6)], 0.06, 0.05, seed=seed)
    b = voice([f0 * 0.9, f0 * 1.35, f0 * 1.3, f0 * 0.85], d, [(700, 5, 1), (1200, 6, 0.6), (2600, 8, 0.2)], 0.06, 0.05, seed=seed)
    y = morph(a, b, np.linspace(0, 1, len(a)) ** 0.7) * animal_env(len(a), 0.05, 0.2)
    return outdoor(y, 0.12)


def cat_purr(dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    puls = (np.sin(2 * np.pi * 25 * t) > 0.6) * 1.0
    y = lowpass(noise(n) * puls, 350) + 0.4 * lowpass(noise(n), 120)
    y *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.55 * t) ** 2  # inspiration / expiration
    return fade_edges(y, 0.2, 0.4)


def dog_bark(seed):
    r = np.random.default_rng(seed); parts = []
    for i in range(r.integers(1, 3)):
        d = r.uniform(0.12, 0.18); f0 = r.uniform(260, 380)
        v = voice([f0 * 0.9, f0 * 1.3, f0 * 0.8], d, [(600, 4, 1), (1200, 5, 0.9), (2400, 7, 0.4)], 0.5, 0.8, seed=seed + i)
        parts += [v * animal_env(len(v), 0.005, 0.06), np.zeros(int(r.uniform(0.12, 0.25) * SR))]
    return outdoor(np.concatenate(parts), 0.2)


def horse_neigh():
    d = 1.4
    y = voice([700, 950, 900, 800, 650, 500, 380], d, [(900, 4, 1), (1700, 5, 0.7), (2700, 7, 0.3)], 0.3, 0.3,
              vib=(11, 0.05), seed=17)
    t = np.arange(len(y)) / SR
    y *= 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 6 * t)) * np.clip(t / 0.3, 0, 1)
    sn = bandpass(noise(int(0.35 * SR)), 250, 1600) * hann_env(int(0.35 * SR), 0.2) * 0.5
    return outdoor(np.concatenate([y * animal_env(len(y), 0.05, 0.4), np.zeros(int(0.1 * SR)), sn]), 0.2)


def horse_snort():
    n = int(0.5 * SR)
    y = bandpass(noise(n), 200, 1800) * (np.sin(np.linspace(0, np.pi, n)) ** 0.6)
    y *= 1 + 0.8 * (np.sin(2 * np.pi * 28 * np.arange(n) / SR) > 0.3)
    return outdoor(y, 0.12)


def hoof(surface, r):
    n = int(0.12 * SR); exc = noise(n) * env_exp(n, 0.002)
    if surface == 'stone':
        y = resonator(exc, r.uniform(900, 1200), 10) + resonator(exc, r.uniform(2200, 2700), 14) * 0.6
    else:
        y = resonator(exc, r.uniform(280, 360), 6) * 1.5 + lowpass(noise(n), 200) * env_exp(n, 0.02)
        y += bandpass(noise(n), 1000, 4000) * env_exp(n, 0.015) * (0.6 if surface == 'grass' else 0.3)
    return y


def hooves(surface, seed):
    """Un « clip-clop » au pas : 4 sabots."""
    r = np.random.default_rng(seed); n = int(0.75 * SR); y = np.zeros(n)
    for st in (0.0, 0.11, 0.37, 0.48):
        h = hoof(surface, r); s = max(0, int((st + r.uniform(-0.01, 0.01)) * SR)); y[s:s + len(h)] += h * r.uniform(0.7, 1)
    return fade_edges(peak_to(y, -1))


# ======================= faune du grand monde =======================

def eagle_cry():
    d = 1.1
    y = voice([2600, 3000, 2700, 2200, 1900], d, [(2800, 3, 1), (5200, 5, 0.4)], 0.25, 0.9, vib=(18, 0.03), seed=31)
    y *= animal_env(len(y), 0.02, 0.4)
    return rev_tail(y, make_ir(2.2, 1.8, 6000, 33), 0.35)[0]


def swan_honk(seed):
    r = np.random.default_rng(seed); parts = []
    for i in range(r.integers(2, 4)):
        d = r.uniform(0.22, 0.32); f0 = r.uniform(380, 460)
        v = voice([f0, f0 * 1.05, f0 * 0.95], d, [(900, 3, 1), (1500, 5, 0.9), (2600, 7, 0.5)], 0.1, 0.1, seed=seed + i, src='pulse')
        parts += [v * animal_env(len(v), 0.02, 0.08), np.zeros(int(r.uniform(0.12, 0.25) * SR))]
    return outdoor(np.concatenate(parts), 0.25)


def squirrel_chatter(seed):
    r = np.random.default_rng(seed); parts = []
    for i in range(r.integers(6, 12)):
        d = r.uniform(0.02, 0.04)
        s = glide_tone(r.uniform(3500, 5000), r.uniform(2500, 4000), d, 0.3) * hann_env(int(d * SR), 0.3)
        parts += [s, np.zeros(int(r.uniform(0.03, 0.06) * SR))]
    return outdoor(np.concatenate(parts), 0.15)


def marmot_whistle():
    d = 0.32
    y = glide_tone(2900, 2700, d, 0.08) * animal_env(int(d * SR), 0.01, 0.12)
    return rev_tail(y, make_ir(2.5, 2.2, 7000, 41), 0.45)[0]  # écho de montagne


def dolphin():
    parts = []
    r = np.random.default_rng(51)
    clicks = np.zeros(int(0.4 * SR))
    for k in range(20):
        p = int(k * 0.018 * SR); clicks[p:p + 40] += np.hanning(40) * r.uniform(0.3, 0.7)
    clicks = highpass(clicks, 3000)
    wh = glide_tone(5000, 9000, 0.25, 0.1, 0.7) * hann_env(int(0.25 * SR), 0.2)
    wh2 = glide_tone(8500, 6000, 0.3, 0.1, 1.5) * hann_env(int(0.3 * SR), 0.2)
    splash = bandpass(noise(int(0.6 * SR)), 400, 6000) * env_exp(int(0.6 * SR), 0.12)
    y = np.concatenate([clicks, wh * 0.6, np.zeros(2000), wh2 * 0.6, np.zeros(int(0.2 * SR)), splash * 0.9])
    return outdoor(y, 0.2)


def hare_thump():
    n = int(0.25 * SR); y = np.zeros(int(0.7 * SR))
    for st in (0, 0.12, 0.42):
        th = lowpass(noise(n), 150) * env_exp(n, 0.025) * 2 + bandpass(noise(n), 2000, 7000) * env_exp(n, 0.04) * 0.4
        s = int(st * SR); y[s:s + n] += th[: len(y) - s]
    return fade_edges(peak_to(y, -1))


def ibex_rocks():
    r = np.random.default_rng(61); y = np.zeros(int(1.2 * SR))
    for k in range(9):
        h = hoof('stone', r); s = int(r.uniform(0, 0.9) * SR); y[s:s + len(h)] += h * r.uniform(0.3, 1)
    pebbles = np.zeros_like(y)
    for k in range(15):
        n = int(0.04 * SR); exc = noise(n) * env_exp(n, 0.002)
        pb = resonator(exc, r.uniform(2500, 5000), 18); s = int(r.uniform(0.2, 1.1) * SR); pebbles[s:s + n] += pb[: len(y) - s] * 0.4
    return outdoor(y + pebbles, 0.3)


def owl_or_frog_loop(dur=24, seed=71):
    """Grenouilles de la mare, la nuit (boucle)."""
    r = np.random.default_rng(seed); N = int(dur * SR); buf = np.zeros((2, N))
    for v in range(5):
        f0 = r.uniform(180, 320); per = r.uniform(1.2, 3.5); dist = r.uniform(0.3, 1)
        t = r.uniform(0, per)
        while t < dur:
            n = int(r.uniform(0.15, 0.3) * SR); tt = np.arange(n) / SR
            puls = (np.sin(2 * np.pi * r.uniform(30, 45) * tt) > 0) * 1.0
            cro = voice([f0, f0 * 1.05], n / SR, [(700, 4, 1), (1500, 6, 0.4)], 0.1, 0.1, seed=v * 100 + int(t * 10), src='pulse') * puls
            cro *= hann_env(n, 0.2) * (0.3 + 0.7 * dist)
            place_circular(buf, lowpass(cro, 2000 + 4000 * dist), int(t * SR), p=r.uniform(-0.8, 0.8), gain=0.3)
            t += per * r.uniform(0.7, 1.3)
    return reverb_circular(buf, make_ir(1.5, 1.2, 5000, 72), 0.25)


def bee_buzz_loop(dur=8.0):
    n = int((dur + 2) * SR); chans = []
    for c in range(2):
        r = np.random.default_rng(80 + c); y = np.zeros(n); t = np.arange(n) / SR
        for b in range(7):
            f = r.uniform(190, 260) * (1 + 0.03 * slow_lfo(n, 2.0, 90 + b * 3 + c))
            ph = np.cumsum(f) / SR; s = 2 * (ph % 1) - 1
            am = 0.3 + 0.7 * slow_lfo(n, 0.7, 120 + b * 7 + c)
            y += lowpass(s, 1800) * am
        chans.append(y)
    return loop_crossfade(np.stack(chans), 2.0)


# ======================= outils et gestes =======================

def hoe(seed):
    r = np.random.default_rng(seed); n = int(0.45 * SR)
    swing = whoosh(0.12, 200, 1500) * 0.15
    chop = lowpass(noise(n), 250) * env_exp(n, 0.03) * 1.8
    chop += bandpass(noise(n) * ((r.random(n) < 0.08) + 0.25), 700, 4000) * env_exp(n, 0.09) * 0.9
    scrape = bandpass(noise(int(0.2 * SR)), 1500, 6000) * np.hanning(int(0.2 * SR)) * 0.25
    y = np.concatenate([swing, chop]); s0 = len(swing) + int(0.12 * SR); y[s0:s0 + len(scrape)] += scrape[: len(y) - s0]
    return fade_edges(peak_to(y, -1), 0.002, 0.05), len(swing) / SR


def scythe(seed):
    r = np.random.default_rng(seed); d = 0.42; n = int(d * SR)
    sw = whoosh(d, 400, 4000, seed) * 0.5
    cut = bandpass(noise(n) * ((r.random(n) < 0.06) * 2 + 0.4), 2500, 10000) * np.clip(np.sin(np.linspace(-0.5, np.pi, n)), 0, 1) ** 2
    ring = np.sin(2 * np.pi * r.uniform(3800, 4400) * np.arange(n) / SR) * env_exp(n, 0.15) * 0.04
    return fade_edges(peak_to(sw + cut + ring, -1), 0.005, 0.05)


def sow(seed):
    r = np.random.default_rng(seed); n = int(0.5 * SR); y = np.zeros(n)
    for k in range(6):  # graines qui tombent
        m = int(0.02 * SR); exc = noise(m) * env_exp(m, 0.002)
        s = int(r.uniform(0.02, 0.2) * SR); y[s:s + m] += resonator(exc, r.uniform(3000, 6000), 15) * 0.2
    pat = lowpass(noise(n), 300) * env_exp(n, 0.03); s = int(0.28 * SR)
    y[s:] += pat[: n - s] * 1.2
    y[s:] += bandpass(noise(n - s), 800, 3000) * env_exp(n - s, 0.05) * 0.3
    return fade_edges(peak_to(y, -1))


def pickup(kind, seed):
    r = np.random.default_rng(seed)
    if kind == 'stone':
        n = int(0.25 * SR); y = np.zeros(n)
        for st in (0, 0.07):
            m = int(0.12 * SR); exc = noise(m) * env_exp(m, 0.002)
            c = resonator(exc, r.uniform(1800, 2600), 10) + resonator(exc, r.uniform(3500, 4500), 14) * 0.5
            s = int(st * SR); y[s:s + m] += c * (1 if st == 0 else 0.6)
    elif kind == 'wood':
        n = int(0.3 * SR); y = np.zeros(n)
        for st in (0, 0.09):
            m = int(0.18 * SR); exc = noise(m) * env_exp(m, 0.003)
            c = resonator(exc, r.uniform(300, 380), 8) + resonator(exc, r.uniform(800, 950), 12) * 0.5
            s = int(st * SR); y[s:s + m] += c * (1 if st == 0 else 0.7)
    elif kind == 'herb':
        return rustle(0.22, seed, 2000, 9000)
    elif kind == 'ore':  # cristal, minerai
        n = int(0.6 * SR); t = np.arange(n) / SR
        y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.15) * g for f, g in ((2093, 1), (3136, 0.5), (4186, 0.3)))
        y += resonator(noise(n) * env_exp(n, 0.002), 2400, 10) * 0.5
    return fade_edges(peak_to(y, -1))


def fishing_cast():
    sw = whoosh(0.35, 500, 5000) * 0.6
    n = int(0.6 * SR); t = np.arange(n) / SR
    ticks = np.zeros(n)
    rate = 40 * np.exp(-t * 3) + 5; ph = np.cumsum(rate) / SR
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    for i in idx:
        m = 200; ticks[i:i + m] += (resonator(noise(m) * env_exp(m, 0.0005), 4200, 12) * 0.4)[: n - i]
    return fade_edges(peak_to(np.concatenate([sw, ticks * 0.6]), -1))


def plop(size=1.0, seed=0):
    r = np.random.default_rng(seed); n = int(0.5 * SR); t = np.arange(n) / SR
    f0 = r.uniform(500, 700) / size
    bub = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 3 * t)) / SR) * np.exp(-t / (0.03 * size))
    spl = bandpass(noise(n), 800, 7000) * env_exp(n, 0.06 * size) * 0.5
    return fade_edges(peak_to(bub + spl, -1))


def fish_bite():
    a = plop(0.6, 3); b = plop(0.5, 4)
    y = np.zeros(int(0.5 * SR)); y[: len(a)] += a[: len(y)]; s = int(0.16 * SR); y[s:] += b[: len(y) - s] * 0.8
    return fade_edges(peak_to(y, -1))


def fish_catch():
    n = int(0.9 * SR)
    spl = bandpass(noise(n), 300, 8000) * env_exp(n, 0.18)
    drops_ = np.zeros(n); r = np.random.default_rng(5)
    for p in r.integers(int(0.1 * SR), n - 3000, 40):
        d = drop(r.uniform(1500, 5000), 0.006, 1500); drops_[p:p + len(d)] += d * r.uniform(0.1, 0.4)
    flap = np.zeros(n)
    for k in range(6):
        m = int(0.05 * SR); s = int((0.15 + k * 0.08) * SR)
        flap[s:s + m] += bandpass(noise(m), 600, 3000) * np.hanning(m) * 0.6
    y = spl * 0.8 + drops_ + flap
    c = chime([79, 83, 86], 0.08, 0.6)
    out = np.zeros(n + len(c)); out[:n] += y; out[int(0.35 * SR):int(0.35 * SR) + len(c)] += c * 0.35
    return fade_edges(peak_to(out, -1))


def fish_miss():
    a = plop(1.2, 9)
    return fade_edges(peak_to(np.concatenate([a, glide_tone(330, 250, 0.3, 0.2) * hann_env(int(0.3 * SR), 0.2) * 0.25]), -1))


def reel_loop():
    n = int(1.2 * SR); y = np.zeros(n); per = int(SR / 22)
    for k in range(n // per):
        m = 180; s = k * per
        y[s:s + m] += resonator(noise(m) * env_exp(m, 0.0006), 3800 + 200 * (k % 2), 14)[: n - s]
    return y


def water_fill(dur=1.4):
    n = int(dur * SR); r = np.random.default_rng(91)
    flow = bandpass(pink(n), 300, 3000) * 0.4
    bub = np.zeros(n)
    for p in r.integers(0, n - 4000, int(dur * 60)):
        t = np.arange(3000) / SR; f0 = r.uniform(300, 900) * (1 + 0.8 * np.arange(n)[p] / n)
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2 * t)) / SR) * np.exp(-t / 0.01)
        bub[p:p + 3000] += b * r.uniform(0.1, 0.4)
    e = np.ones(n); e[: int(0.1 * SR)] = np.linspace(0, 1, int(0.1 * SR)); e[-int(0.3 * SR):] = np.linspace(1, 0, int(0.3 * SR))
    return fade_edges(peak_to((flow + bub) * e, -1))


def block_place(material, seed):
    r = np.random.default_rng(seed); n = int(0.35 * SR); exc = noise(n) * env_exp(n, 0.003)
    if material == 'wood':
        y = resonator(exc, r.uniform(180, 230), 7) * 1.4 + resonator(exc, r.uniform(450, 520), 10) * 0.6
    elif material == 'stone':
        y = resonator(exc, r.uniform(500, 650), 6) * 1.2 + resonator(exc, r.uniform(1400, 1700), 10) * 0.4
        y += bandpass(noise(n), 2000, 7000) * env_exp(n, 0.03) * 0.4
    else:  # métal
        t = np.arange(n) / SR
        y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) * g for f, g in ((620, 1), (1490, 0.6), (2730, 0.4)))
        y += lowpass(noise(n), 300) * env_exp(n, 0.02)
    y += lowpass(noise(n), 120) * env_exp(n, 0.02) * 1.2
    return fade_edges(peak_to(y, -1))


def block_remove(seed):
    r = np.random.default_rng(seed); n = int(0.4 * SR)
    y = bandpass(noise(n) * ((r.random(n) < 0.1) * 1.5 + 0.3), 500, 5000) * env_exp(n, 0.08)
    y += lowpass(noise(n), 200) * env_exp(n, 0.04)
    return fade_edges(peak_to(np.concatenate([whoosh(0.1, 300, 2000) * 0.2, y]), -1))


def ladder(seed):
    r = np.random.default_rng(seed); y = np.zeros(int(1.1 * SR))
    for k in range(4):
        n = int(0.15 * SR); exc = noise(n) * env_exp(n, 0.003)
        st = resonator(exc, r.uniform(220, 280), 8) + resonator(exc, r.uniform(600, 700), 12) * 0.4
        s = int(k * 0.24 * SR); y[s:s + n] += st * r.uniform(0.7, 1)
    c = creak(0.4, 60, 80, res=(450, 900, 1800), seed=seed) * 0.2; y[int(0.3 * SR):int(0.3 * SR) + len(c)] += c
    return fade_edges(peak_to(y, -1))


def tricycle_bell():
    n = int(1.0 * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for st in (0, 0.18):
        s = int(st * SR); tt = t[: n - s]
        y[s:] += sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.35) * g for f, g in ((2350, 1), (5100, 0.4), (3900, 0.3)))
    return fade_edges(peak_to(y, -2))


def pedal_loop():
    n = int(1.2 * SR); y = np.zeros(n); per = int(SR / 14)
    for k in range(n // per):
        m = 120; s = k * per
        y[s:s + m] += resonator(noise(m) * env_exp(m, 0.0005), 5200, 18)[: n - s] * (0.6 if k % 2 else 1)
    y += bandpass(pink(n), 200, 1200) * 0.05
    return y


def sleep_zzz():
    notes = [76, 72, 67]
    return chime(notes, 0.35, 1.5, inst=lambda f, d: bell(f, d, ratio=2.0, idx=0.5))


# ======================= ambiances de lieux =======================

def sea_loop(dur=32.0):
    n = int((dur + 4) * SR); chans = []
    for c in range(2):
        r = np.random.default_rng(100 + c); t = np.arange(n) / SR
        swell = np.zeros(n); pos = 0.0
        while pos < dur + 4:
            per = r.uniform(6.5, 9); ln = int(per * SR); s = int(pos * SR)
            k = np.linspace(0, 1, ln); e = np.where(k < 0.35, (k / 0.35) ** 2, np.exp(-(k - 0.35) * 5))
            e2 = e[: n - s] if s < n else e[:0]
            swell[s:s + len(e2)] = np.maximum(swell[s:s + len(e2)], e2 * r.uniform(0.7, 1))
            pos += per * r.uniform(0.85, 1.0)
        low = lowpass(brown(n), 400) * (0.25 + 0.75 * swell)
        foam = bandpass(pink(n), 1500, 9000) * swell ** 2 * 0.5
        chans.append(low * 0.7 + foam)
    return loop_crossfade(np.stack(chans), 4.0)


def lake_loop(dur=24.0):
    n = int((dur + 3) * SR); chans = []
    for c in range(2):
        r = np.random.default_rng(110 + c)
        bed = bandpass(pink(n), 200, 1500) * 0.08
        laps = np.zeros(n)
        for p in r.integers(0, n - 8000, int(dur * 2.2)):
            m = int(r.uniform(0.08, 0.2) * SR)
            lp = bandpass(noise(m), r.uniform(250, 500), r.uniform(1200, 2500)) * np.hanning(m) ** 0.8
            laps[p:p + m] += lp * r.uniform(0.2, 0.6)
        chans.append(bed + laps)
    return loop_crossfade(np.stack(chans), 3.0)


def forest_loop(dur=30.0):
    n = int((dur + 4) * SR); chans = []
    for c in range(2):
        leaves = bandpass(pink(n), 1200, 7000) * (0.2 + 0.8 * slow_lfo(n, 0.15, 130 + c) ** 2) * 0.35
        trunk = lowpass(brown(n), 200) * 0.25
        chans.append(leaves + trunk)
    buf = loop_crossfade(np.stack(chans), 4.0)
    r = np.random.default_rng(140)
    for k in range(3):  # pic-vert lointain
        st = int(r.uniform(2, dur - 3) * SR)
        for j in range(r.integers(8, 14)):
            m = int(0.03 * SR); exc = noise(m) * env_exp(m, 0.001)
            tk = resonator(exc, 1100, 12) * 0.08
            s = st + int(j * 0.055 * SR)
            if s + m < buf.shape[1]:
                buf[:, s:s + m] += pan(tk, 0.5 - k * 0.4)
    for k in range(2):  # branche qui craque
        c2 = creak(0.4, 40, 60, res=(300, 700, 1400), seed=150 + k) * 0.06
        s = int(r.uniform(2, dur - 2) * SR); buf[:, s:s + len(c2)] += pan(c2, r.uniform(-0.7, 0.7))
    return buf


def mountain_wind_loop(dur=30.0):
    n = int((dur + 4) * SR); chans = []
    for c in range(2):
        b = brown(n); lfo = slow_lfo(n, 0.08, 160 + c)
        whistle = np.zeros(n); blk = 2048
        base = bandpass(noise(n), 500, 1400)
        # sifflement : résonance qui glisse avec la rafale
        for i in range(0, n, blk):
            f = 700 + 600 * lfo[i]
            seg = resonator(noise(min(blk, n - i)), f, 25)
            whistle[i:i + len(seg)] = seg
        whistle = lowpass(whistle, 3000)
        chans.append(lowpass(b, 500) * (0.4 + 0.6 * lfo) + whistle * lfo ** 2 * 0.25 + base * 0.05)
    return loop_crossfade(np.stack(chans), 4.0)


def village_loop(dur=36.0):
    N = int(dur * SR); buf = np.zeros((2, N)); r = np.random.default_rng(170)
    t = r.uniform(0, 3)
    while t < dur:  # bûcheron au loin
        y, _ = M.axe_impact(r); place_circular(buf, lowpass(y, 2500) * 0.18, int(t * SR), p=-0.5)
        t += r.uniform(2.2, 3.5) if r.random() < 0.8 else r.uniform(6, 10)
    t = r.uniform(5, 8)
    while t < dur:  # forgeron / marteau
        for j in range(r.integers(3, 6)):
            n = int(0.3 * SR); tt = np.arange(n) / SR
            an = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.18) * g for f, g in ((1240, 1), (2980, 0.5), (4700, 0.25)))
            place_circular(buf, lowpass(an, 4000) * 0.07, int((t + j * 0.45) * SR), p=0.55)
        t += r.uniform(9, 14)
    for k in range(2):
        hc = hen_clucks(180 + k); place_circular(buf, lowpass(hc, 3000) * 0.1, int(r.uniform(0, dur) * SR), p=r.uniform(-0.3, 0.3))
    dg = dog_bark(190); place_circular(buf, lowpass(dg, 2500) * 0.08, int(r.uniform(0, dur) * SR), p=0.8)
    bed = bandpass(pink(N + 2 * SR), 150, 1200) * 0.03
    bed = loop_crossfade(np.stack([bed, np.roll(bed, 4444)]), 2.0)[:, :N]
    return reverb_circular(buf + bed, make_ir(1.6, 1.3, 5000, 171), 0.25)


def cave_loop(dur=30.0):
    N = int(dur * SR); r = np.random.default_rng(200)
    drone = lowpass(brown(N + 4 * SR), 110)
    drone = loop_crossfade(np.stack([drone, np.roll(drone, 9999)]), 4.0)[:, :N] * 0.35
    buf = np.zeros((2, N))
    t = 0.3
    while t < dur:
        f = r.uniform(900, 2600); m = int(0.25 * SR); tt = np.arange(m) / SR
        d = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * tt / 0.25)) / SR) * np.exp(-tt / 0.02)
        place_circular(buf, d * r.uniform(0.1, 0.35), int(t * SR), p=r.uniform(-0.9, 0.9))
        t += r.exponential(1.4)
    for k in range(2):  # grondement lointain
        m = int(3 * SR); g = lowpass(brown(m), 80) * np.hanning(m) * 0.5
        place_circular(buf, g, int(r.uniform(0, dur) * SR), p=r.uniform(-0.4, 0.4))
    buf = reverb_circular(buf, make_ir(4.0, 3.5, 3500, 201), 0.6)
    return buf + drone


def fire_loop(dur=12.0):
    n = int((dur + 2) * SR); chans = []
    for c in range(2):
        r = np.random.default_rng(210 + c)
        roar = lowpass(brown(n), 300) * (0.6 + 0.4 * slow_lfo(n, 1.5, 220 + c)) * 0.4
        cr = np.zeros(n)
        for p in r.integers(0, n - 2000, int(dur * 25)):
            m = int(r.uniform(0.002, 0.01) * SR)
            cr[p:p + m] += highpass(noise(m), 1500) * np.hanning(m) * r.uniform(0.1, 1) ** 2
        chans.append(roar + cr * 0.8)
    return loop_crossfade(np.stack(chans), 2.0)


# ======================= machines =======================

def sprinkler_loop():
    n = int(2.4 * SR); y = np.zeros(n); per = int(0.12 * SR)
    for k in range(n // per):
        m = int(0.05 * SR); s = k * per
        y[s:s + m] += bandpass(noise(m), 2500, 9000) * env_exp(m, 0.01) * (0.6 + 0.4 * (k % 4 == 0))
    y += bandpass(pink(n), 1500, 8000) * 0.12
    return y


def pump_loop():
    n = int(2.0 * SR); t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 100 * h * t) / h for h in (1, 2, 3, 5)) * 0.3
    chug = lowpass(noise(n), 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) ** 4 * 0.8
    return hum + chug + bandpass(noise(n), 2000, 6000) * 0.02


def robot_loop():
    n = int(3.0 * SR); t = np.arange(n) / SR
    f = 140 * (1 + 0.3 * np.sin(2 * np.pi * 0.7 * t) ** 2)
    ph = np.cumsum(f) / SR; s = bandpass(2 * (ph % 1) - 1, 300, 2500) * 0.5
    s *= 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.7 * t))
    for st in (0.4, 1.9):  # petits bips
        m = int(0.07 * SR); b = np.sin(2 * np.pi * 1760 * np.arange(m) / SR) * np.hanning(m) * 0.25
        k = int(st * SR); s[k:k + m] += b
    return s


def baler_cycle():
    n = int(1.6 * SR); y = mix_into(n,
        (0.0, M.whoosh(0.4, 200, 900) * 0.4, 1),
        (0.4, block_place('metal', 3), 0.6),
        (0.42, lowpass(noise(int(0.4 * SR)), 300) * env_exp(int(0.4 * SR), 0.06), 1.2),
        (0.9, rustle(0.4, 230, 1500, 6000), 0.4),
        (1.25, latch(5), 0.8))
    return fade_edges(peak_to(y, -1))


def grain_pour(dur=1.5):
    n = int(dur * SR); r = np.random.default_rng(240); y = np.zeros(n)
    for p in r.integers(0, n - 500, int(dur * 3000)):
        m = 60; y[p:p + m] += np.hanning(m) * r.uniform(-1, 1)
    y = bandpass(y, 1500, 9000)
    e = np.ones(n); e[: int(0.1 * SR)] = np.linspace(0, 1, int(0.1 * SR)); e[-int(0.4 * SR):] = np.linspace(1, 0, int(0.4 * SR))
    return fade_edges(peak_to(y * e, -1))


def egg_pop():
    n = int(0.25 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * np.cumsum(500 * (1 + 2 * t)) / SR) * np.exp(-t / 0.03)
    return fade_edges(peak_to(y + pickup('wood', 7)[: n] * 0.2, -1))


def milk_squirt():
    n = int(0.9 * SR); y = np.zeros(n)
    for k in range(3):
        m = int(0.18 * SR); s = int(k * 0.28 * SR)
        sq = bandpass(noise(m), 1200, 5000) * np.hanning(m) ** 0.5 * 0.5 + resonator(noise(m), 900, 6) * np.hanning(m) * 0.3
        y[s:s + m] += sq
    return fade_edges(peak_to(y, -1))


def shear_snip():
    n = int(0.6 * SR); y = np.zeros(n); r = np.random.default_rng(250)
    for k in range(3):
        m = int(0.06 * SR); s = int(k * 0.17 * SR); exc = noise(m) * env_exp(m, 0.003)
        y[s:s + m] += resonator(exc, r.uniform(3200, 4000), 12) * 0.6 + bandpass(noise(m), 4000, 10000) * env_exp(m, 0.01) * 0.3
    return fade_edges(peak_to(y, -1))


def feed_pour():
    return grain_pour(0.9)


# ======================= interface et progression =======================

def ui_tone(notes, step=0.06, dec=0.35, inst='pluck', gain_db=-3):
    I = {'pluck': lambda f, d: pluck(f, d, 3000), 'bell': lambda f, d: bell(f, d, 2.0, 0.6),
         'kal': kalimba, 'marimba': lambda f, d: kalimba(f, d) * 1.0}
    return peak_to(chime(notes, step, dec, inst=I[inst]), gain_db)


def ui_open():
    y = glide_tone(500, 900, 0.07, 0.2) * hann_env(int(0.07 * SR), 0.3)
    return fade_edges(peak_to(np.concatenate([y, np.zeros(400)]) + 0, -6))


def ui_close():
    y = glide_tone(800, 450, 0.07, 0.2) * hann_env(int(0.07 * SR), 0.3)
    return fade_edges(peak_to(y, -7))


def ui_tab():
    n = int(0.04 * SR); t = np.arange(n) / SR
    return fade_edges(peak_to(np.sin(2 * np.pi * 1300 * t) * np.exp(-t / 0.008) + resonator(noise(n) * env_exp(n, 0.001), 3000, 8) * 0.3, -9))


def ui_error():
    a = glide_tone(220, 210, 0.12, 0.6) * hann_env(int(0.12 * SR), 0.2)
    b = glide_tone(185, 175, 0.18, 0.6) * hann_env(int(0.18 * SR), 0.2)
    y = lowpass(np.concatenate([a, np.zeros(int(0.04 * SR)), b]), 1600)
    return fade_edges(peak_to(y, -5))


def coins(seed, n_coins=4):
    r = np.random.default_rng(seed); n = int(0.8 * SR); y = np.zeros(n)
    for k in range(n_coins):
        m = int(0.35 * SR); t = np.arange(m) / SR; f = r.uniform(3000, 4200)
        c = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t / (0.08 / h)) * g for h, g in ((1, 1), (1.47, 0.6), (2.09, 0.4), (2.74, 0.25)))
        s = int((k * r.uniform(0.04, 0.08)) * SR); y[s:s + m] += c[: n - s] * r.uniform(0.5, 1)
    return fade_edges(peak_to(y, -3))


def craft_done():
    h = M.hammer_wood(260)
    c = ui_tone([72, 79, 84], 0.07, 0.6)
    n = len(h) + len(c); y = np.zeros(n); y[: len(h)] += h * 0.6; y[int(len(h) * 0.85):int(len(h) * 0.85) + len(c)] += c
    return fade_edges(peak_to(y, -2))


def cook_done():
    n = int(0.6 * SR); sizzle = highpass(noise(n), 3000) * (0.5 + 0.5 * (np.random.default_rng(3).random(n) < 0.3)) * np.hanning(n) * 0.15
    ding = bell(mtof(88), 1.4, ratio=3.0, idx=1.0)
    y = np.zeros(n + len(ding)); y[:n] += sizzle; y[int(0.4 * SR):int(0.4 * SR) + len(ding)] += ding * 0.8
    return fade_edges(peak_to(y, -2))


def level_up():
    notes = [67, 72, 76, 79, 84, 88]
    a = chime(notes, 0.075, 1.2, inst=lambda f, d: pluck(f, d, 3500))
    b = chime([84, 91], 0.0, 1.6, inst=lambda f, d: bell(f, d, 2.0, 0.8))
    y = np.zeros(len(a) + int(0.2 * SR)); y[: len(a)] += a; s = int(0.45 * SR); y[s:s + len(b)] += b[: len(y) - s] * 0.6
    st = rev_tail(y, make_ir(1.5, 1.2, 7000, 270), 0.3)
    return fade_edges(peak_to(st, -1))


def chapter_done():
    spb = 60 / 92; n = int(4.2 * SR); y = np.zeros((2, n))
    mel = [(0, 0.5, 72), (0.5, 0.5, 76), (1, 0.5, 79), (1.5, 1.5, 84), (3, 0.5, 81), (3.5, 0.5, 83), (4, 2.0, 84)]
    for b, d, m in mel:
        s = flute_lead(mtof(m), d * spb + 0.2); place(y, s * 0.6, int(b * spb * SR), p=0.1)
    for b, ch in ((0, [60, 64, 67]), (1.5, [57, 60, 65]), (3, [55, 59, 62]), (4, [48, 60, 64, 67])):
        for k, m in enumerate(ch):
            s = soft_pad(mtof(m), 2.0 * spb + 0.8, bright=1800); place(y, s * 0.25, int(b * spb * SR), p=(-0.4 + 0.3 * k))
    for b, m in ((4, 96), (4.1, 91)):
        s = bell(mtof(m), 1.5); place(y, s * 0.15, int(b * spb * SR), p=0.5)
    y = reverb_circular(np.pad(y, ((0, 0), (0, int(2 * SR)))), make_ir(2.4, 2.0, 6000, 280), 0.35)
    return fade_edges(peak_to(y, -1), 0.005, 0.5)


def tech_unlock():
    r = np.random.default_rng(290); n = int(1.3 * SR); y = np.zeros(n)
    for k in range(10):
        f = mtof(79 + k * 2 + r.integers(0, 2)); s = bell(f, 0.6, 2.0, 0.4); st = int(k * 0.05 * SR)
        y[st:st + len(s)] += s[: n - st] * (0.4 + 0.06 * k)
    sweep = glide_tone(300, 1500, 0.6, 0.1) * hann_env(int(0.6 * SR), 0.4) * 0.15
    y[: len(sweep)] += sweep
    return fade_edges(peak_to(y, -2))


def discovery():
    n = int(0.35 * SR)
    flip = bandpass(noise(n) * np.hanning(n) ** 2, 1500, 7000) * 0.4
    c = ui_tone([84, 88, 91], 0.06, 0.8, 'bell')
    y = np.zeros(n + len(c)); y[:n] += flip; y[int(0.15 * SR):int(0.15 * SR) + len(c)] += c
    return fade_edges(peak_to(y, -3))


def dinner_bell():
    n = int(2.0 * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(4):
        s = int(k * 0.32 * SR); tt = t[: n - s]
        y[s:] += sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.6) * g for f, g in ((1175, 1), (2820, 0.5), (4410, 0.25), (590, 0.3)))
    return fade_edges(peak_to(outdoor(y, 0.25), -2))


def new_day():
    return peak_to(chime([72, 76, 79, 84], 0.12, 1.4, inst=lambda f, d: kalimba(f, d)), -4)


def welcome_back():
    return peak_to(chime([67, 72, 76], 0.1, 1.2, inst=lambda f, d: soft_pad(f, d, bright=2500) + kalimba(f, d) * 0.6), -4)


def toast(kind):
    return {'info': ui_tone([84, 88], 0.07, 0.5, 'bell', -8), 'success': ui_tone([76, 83], 0.08, 0.6, 'kal', -6),
            'alert': ui_tone([81, 77, 81], 0.1, 0.5, 'bell', -6)}[kind]


def mine_jingle_ore():
    return pickup('ore', 300)


if __name__ == '__main__':
    S = lambda rel, x, cat, loop=False, gain=0.6, **k: save(rel, x, cat, loop, gain, **k)
    N = lambda x, db=-1: fade_edges(peak_to(x, db), 0.002, 0.03)
    # --- animaux de la ferme
    for v in range(3): S(f'sfx/animals/hen_{v+1:02d}.ogg', N(hen_clucks(300 + v)), 'environment', gain=0.45, group='hen')
    S('sfx/animals/rooster_01.ogg', N(rooster()), 'environment', gain=0.55, group='rooster')
    for v in range(3): S(f'sfx/animals/cow_{v+1:02d}.ogg', N(cow_moo(310 + v)), 'environment', gain=0.55, group='cow')
    for v in range(3): S(f'sfx/animals/sheep_{v+1:02d}.ogg', N(sheep_baa(320 + v)), 'environment', gain=0.5, group='sheep')
    for v in range(2): S(f'sfx/animals/cat_{v+1:02d}.ogg', N(cat_meow(330 + v)), 'environment', gain=0.45, group='cat')
    S('sfx/animals/cat_purr_01.ogg', N(cat_purr(), -6), 'environment', gain=0.4, group='cat_purr')
    for v in range(3): S(f'sfx/animals/dog_{v+1:02d}.ogg', N(dog_bark(340 + v)), 'environment', gain=0.5, group='dog')
    S('sfx/animals/horse_neigh_01.ogg', N(horse_neigh()), 'environment', gain=0.55, group='horse_neigh')
    S('sfx/animals/horse_snort_01.ogg', N(horse_snort()), 'environment', gain=0.5, group='horse_snort')
    for surf in ('grass', 'dirt', 'stone'):
        for v in range(2): S(f'sfx/animals/hooves_{surf}_{v+1:02d}.ogg', hooves(surf, 350 + v), 'sfx', gain=0.55, group=f'hooves_{surf}')
    S('ambient/bees_loop.ogg', normalize(bee_buzz_loop(), rms_db=-24), 'environment', True, 0.4)
    S('sfx/animals/egg_01.ogg', egg_pop(), 'sfx', gain=0.5, group='egg')
    S('sfx/animals/milk_01.ogg', milk_squirt(), 'sfx', gain=0.5, group='milk')
    S('sfx/animals/shear_01.ogg', shear_snip(), 'sfx', gain=0.5, group='shear')
    S('sfx/animals/feed_01.ogg', feed_pour(), 'sfx', gain=0.5, group='feed')
    # --- faune du grand monde
    S('sfx/wildlife/eagle_01.ogg', N(eagle_cry(), -2), 'environment', gain=0.45, group='eagle')
    for v in range(2): S(f'sfx/wildlife/swan_{v+1:02d}.ogg', N(swan_honk(360 + v)), 'environment', gain=0.45, group='swan')
    for v in range(2): S(f'sfx/wildlife/squirrel_{v+1:02d}.ogg', N(squirrel_chatter(370 + v)), 'environment', gain=0.4, group='squirrel')
    S('sfx/wildlife/marmot_01.ogg', N(marmot_whistle(), -2), 'environment', gain=0.45, group='marmot')
    S('sfx/wildlife/dolphin_01.ogg', N(dolphin()), 'environment', gain=0.45, group='dolphin')
    S('sfx/wildlife/hare_01.ogg', hare_thump(), 'environment', gain=0.45, group='hare')
    S('sfx/wildlife/ibex_01.ogg', N(ibex_rocks()), 'environment', gain=0.45, group='ibex')
    S('ambient/frogs_night_01.ogg', normalize(owl_or_frog_loop(), rms_db=-28), 'nature', True, 0.45)
    # --- gestes
    for v in range(3):
        y, hit = hoe(400 + v); S(f'sfx/tools/hoe_{v+1:02d}.ogg', y, 'sfx', gain=0.7, group='hoe', impactOffsetSec=round(hit, 3))
    for v in range(3): S(f'sfx/tools/scythe_{v+1:02d}.ogg', scythe(410 + v), 'sfx', gain=0.65, group='scythe')
    for v in range(2): S(f'sfx/tools/sow_{v+1:02d}.ogg', sow(420 + v), 'sfx', gain=0.55, group='sow')
    for kind in ('stone', 'wood', 'herb'):
        for v in range(3): S(f'sfx/pickup/{kind}_{v+1:02d}.ogg', pickup(kind, 430 + v + {'stone': 1, 'wood': 2, 'herb': 3}[kind]), 'sfx', gain=0.5, group=f'pickup_{kind}')
    S('sfx/pickup/ore_01.ogg', pickup('ore', 440), 'sfx', gain=0.55, group='pickup_ore')
    S('sfx/tools/water_fill_01.ogg', water_fill(), 'sfx', gain=0.55, group='water_fill')
    S('sfx/fishing/cast_01.ogg', fishing_cast(), 'sfx', gain=0.6, group='fish_cast')
    for v in range(2): S(f'sfx/fishing/plop_{v+1:02d}.ogg', plop(1.0, 450 + v), 'sfx', gain=0.55, group='fish_plop')
    S('sfx/fishing/bite_01.ogg', fish_bite(), 'sfx', gain=0.65, group='fish_bite')
    S('sfx/fishing/catch_01.ogg', fish_catch(), 'sfx', gain=0.65, group='fish_catch')
    S('sfx/fishing/miss_01.ogg', fish_miss(), 'sfx', gain=0.55, group='fish_miss')
    S('sfx/fishing/reel_loop.ogg', peak_to(reel_loop(), -4), 'sfx', True, 0.45, group='fish_reel')
    for mat in ('wood', 'stone', 'metal'):
        for v in range(2): S(f'sfx/build/place_{mat}_{v+1:02d}.ogg', block_place(mat, 460 + v), 'sfx', gain=0.6, group=f'place_{mat}')
    for v in range(2): S(f'sfx/build/remove_{v+1:02d}.ogg', block_remove(470 + v), 'sfx', gain=0.55, group='block_remove')
    S('sfx/world/ladder_01.ogg', ladder(480), 'sfx', gain=0.6, group='ladder')
    S('sfx/world/tricycle_bell_01.ogg', tricycle_bell(), 'sfx', gain=0.5, group='tricycle_bell')
    S('sfx/world/pedal_loop.ogg', peak_to(pedal_loop(), -6), 'sfx', True, 0.35, group='pedal')
    S('sfx/world/sleep_01.ogg', sleep_zzz(), 'ui', gain=0.5, group='sleep')
    for surf in ('sand', 'water', 'leaves'):
        r = np.random.default_rng(490 + len(surf))
        for v in range(4):
            if surf == 'sand':
                n = int(0.2 * SR); y = bandpass(noise(n) * ((r.random(n) < 0.15) + 0.3), 1500, 7000) * env_exp(n, 0.05) + lowpass(noise(n), 150) * env_exp(n, 0.03) * 0.6
            elif surf == 'water':
                y = plop(1.6, 500 + v) * 0.6
                n = len(y); y += bandpass(noise(n), 500, 5000) * env_exp(n, 0.08) * 0.8
            else:
                y = rustle(0.25, 510 + v, 900, 6000) + lowpass(noise(int(0.25 * SR)), 140) * env_exp(int(0.25 * SR), 0.03) * 0.8
            S(f'sfx/footsteps/{surf}_{v+1:02d}.ogg', peak_to(fade_edges(y, 0.001, 0.02), -6), 'sfx', gain=0.5, group=f'step_{surf}')
    # --- lieux
    S('ambient/sea_loop.ogg', normalize(sea_loop(), rms_db=-21), 'nature', True, 0.6)
    S('ambient/lake_loop.ogg', normalize(lake_loop(), rms_db=-27), 'nature', True, 0.5)
    S('ambient/forest_loop.ogg', normalize(forest_loop(), rms_db=-26), 'nature', True, 0.5)
    S('ambient/mountain_wind_loop.ogg', normalize(mountain_wind_loop(), rms_db=-24), 'nature', True, 0.5)
    S('ambient/village_loop.ogg', normalize(village_loop(), rms_db=-28), 'environment', True, 0.5)
    S('ambient/cave_loop.ogg', normalize(cave_loop(), rms_db=-24), 'nature', True, 0.6)
    S('environment/fire_loop.ogg', normalize(fire_loop(), rms_db=-24), 'environment', True, 0.45)
    S('environment/sprinkler_loop.ogg', normalize(sprinkler_loop(), rms_db=-24), 'environment', True, 0.4)
    S('environment/pump_loop.ogg', normalize(pump_loop(), rms_db=-24), 'environment', True, 0.35)
    S('environment/robot_loop.ogg', normalize(robot_loop(), rms_db=-26), 'environment', True, 0.4)
    S('sfx/machines/baler_01.ogg', baler_cycle(), 'sfx', gain=0.55, group='baler')
    S('sfx/machines/grain_01.ogg', grain_pour(), 'sfx', gain=0.5, group='grain')
    # --- interface et progression
    S('sfx/ui/open_01.ogg', ui_open(), 'ui', gain=0.5, group='ui_open')
    S('sfx/ui/close_01.ogg', ui_close(), 'ui', gain=0.5, group='ui_close')
    S('sfx/ui/tab_01.ogg', ui_tab(), 'ui', gain=0.5, group='ui_tab')
    S('sfx/ui/error_01.ogg', ui_error(), 'ui', gain=0.5, group='ui_error')
    for k in ('info', 'success', 'alert'): S(f'sfx/ui/toast_{k}_01.ogg', toast(k), 'ui', gain=0.5, group=f'toast_{k}')
    for v in range(2): S(f'sfx/ui/coins_{v+1:02d}.ogg', coins(520 + v, 3 + v), 'ui', gain=0.5, group='coins')
    S('sfx/ui/craft_done_01.ogg', craft_done(), 'ui', gain=0.55, group='craft_done')
    S('sfx/ui/cook_done_01.ogg', cook_done(), 'ui', gain=0.55, group='cook_done')
    S('sfx/ui/level_up_01.ogg', level_up(), 'ui', gain=0.6, group='level_up', duckMusic=True)
    S('sfx/ui/chapter_done_01.ogg', chapter_done(), 'ui', gain=0.6, group='chapter_done', duckMusic=True)
    S('sfx/ui/tech_unlock_01.ogg', tech_unlock(), 'ui', gain=0.55, group='tech_unlock', duckMusic=True)
    S('sfx/ui/discovery_01.ogg', discovery(), 'ui', gain=0.5, group='discovery')
    S('sfx/ui/dinner_bell_01.ogg', dinner_bell(), 'ui', gain=0.55, group='dinner_bell')
    S('sfx/ui/new_day_01.ogg', new_day(), 'ui', gain=0.5, group='new_day')
    S('sfx/ui/welcome_back_01.ogg', welcome_back(), 'ui', gain=0.5, group='welcome_back')
    print(len(M.MANIFEST), 'fichiers')
