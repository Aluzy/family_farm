"""Ambiances, sources spatiales et effets d'interaction de Family Farm."""
import numpy as np
from synthlib import *
from scipy import signal

A = '_sortie/pack/public/assets/audio'
R = np.random.default_rng(2026)
MANIFEST = []


def rev_tail(y, ir, wet):
    st = np.stack([y, y]) if y.ndim == 1 else y
    out = np.zeros((2, st.shape[1] + ir.shape[1] - 1))
    for c in range(2):
        out[c] = signal.fftconvolve(st[c], ir[c])
    dry = np.zeros_like(out); dry[:, : st.shape[1]] = st
    return dry * (1 - wet) + out * wet * 0.35


def peak_to(x, db):
    return x * (10 ** (db / 20) / (np.max(np.abs(x)) + 1e-12))


def save(rel, x, category, loop=False, gain=1.0, **extra):
    path = f'{A}/{rel}'
    write_ogg(path, x, quality=4)
    MANIFEST.append(dict(id=rel.rsplit('/', 1)[-1].rsplit('.', 1)[0], asset=f'audio/{rel}',
                         category=category, loop=loop, baseGain=gain,
                         durationSec=round(x.shape[-1] / SR, 3), **extra))


def env_exp(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def glide_tone(f0, f1, dur, harm=0.15, curve=1.0):
    n = int(dur * SR)
    k = np.linspace(0, 1, n) ** curve
    f = f0 + (f1 - f0) * k
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) + harm * np.sin(2 * ph)


def hann_env(n, a=0.25):
    e = np.ones(n)
    k = max(int(n * a), 1)
    w = np.hanning(2 * k)
    e[:k] = w[:k]; e[-k:] = w[k:]
    return e


# ================= OISEAUX =================

def bird_warble(r):
    out = []
    base = r.uniform(2800, 4200)
    for _ in range(r.integers(4, 9)):
        d = r.uniform(0.035, 0.08)
        f0 = base * r.uniform(0.85, 1.2); f1 = f0 * r.uniform(0.8, 1.45)
        s = glide_tone(f0, f1, d, harm=0.08, curve=r.uniform(0.5, 2)) * hann_env(int(d * SR), 0.3)
        out += [s, np.zeros(int(r.uniform(0.015, 0.05) * SR))]
    return np.concatenate(out)


def bird_whistle(r):
    out = []
    for _ in range(r.integers(2, 4)):
        d = r.uniform(0.12, 0.32)
        f = r.uniform(1700, 2700)
        n = int(d * SR); t = np.arange(n) / SR
        fc = f * (1 + 0.05 * np.sin(2 * np.pi * r.uniform(6, 14) * t)) * np.linspace(1, r.uniform(0.9, 1.15), n)
        s = np.sin(2 * np.pi * np.cumsum(fc) / SR) * hann_env(n, 0.2)
        out += [s, np.zeros(int(r.uniform(0.06, 0.18) * SR))]
    return np.concatenate(out)


def bird_titu(r):
    hi, lo = r.uniform(4500, 5600), r.uniform(3300, 4100)
    out = []
    for _ in range(r.integers(2, 5)):
        for f, d in ((hi, 0.07), (lo, 0.1)):
            out += [glide_tone(f, f * 0.97, d, 0.05) * hann_env(int(d * SR), 0.2), np.zeros(int(0.04 * SR))]
        out.append(np.zeros(int(0.08 * SR)))
    return np.concatenate(out)


def bird_trill(r):
    d = r.uniform(0.5, 1.1); n = int(d * SR); t = np.arange(n) / SR
    f = r.uniform(4000, 6000) * np.linspace(1, r.uniform(0.85, 1.05), n)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(18, 30) * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * am ** 2 * hann_env(n, 0.15)


BIRDS = [bird_warble, bird_whistle, bird_titu, bird_trill]


def leaves_bed(n, level):
    x = bandpass(pink(n + SR), 900, 6000)[SR:]
    lfo = brown(n) ; lfo = lowpass(lfo, 0.3, 1); lfo = (lfo - lfo.min()) / (np.ptp(lfo) + 1e-9)
    return x * (0.3 + 0.7 * lfo) * level


def birds_loop(dur, density, seed):
    r = np.random.default_rng(seed)
    N = int(dur * SR); buf = np.zeros((2, N))
    t = 0.0
    while t < dur:
        sp = r.integers(0, len(BIRDS))
        call = BIRDS[sp](r)
        dist = r.uniform(0.2, 1.0)  # 1 = proche
        call = lowpass(call, 3000 + 6000 * dist) * (0.25 + 0.75 * dist) * r.uniform(0.6, 1.0)
        place_circular(buf, call, int(t * SR), p=r.uniform(-0.85, 0.85), gain=0.35)
        t += r.exponential(1 / density)
    bed = leaves_bed(N + int(2 * SR), 0.035)
    bed = loop_crossfade(np.stack([bed, np.roll(bed, 7919)]), 2.0)
    buf += bed[:, :N]
    ir = make_ir(1.4, 1.1, 7000, seed=9)
    return reverb_circular(buf, ir, wet=0.25)


# ================= GRILLONS =================

def cricket_voice(dur, seed):
    r = np.random.default_rng(seed)
    N = int(dur * SR); x = np.zeros(N)
    fc = r.uniform(4200, 5200)
    rate = r.uniform(1.6, 3.2)  # chirps / s
    pulses = r.integers(2, 5)
    period = int(SR / rate)
    # arrondir pour que la boucle reste régulière
    k = max(1, round(N / period)); period = N // k
    pl = int(0.012 * SR); gap = int(0.008 * SR)
    t = np.arange(pl) / SR
    pulse = np.sin(2 * np.pi * fc * t) * np.hanning(pl)
    off = r.integers(0, period)
    for c in range(k):
        jitter = int(r.normal(0, 0.004) * SR)
        st = (off + c * period + jitter) % N
        amp = r.uniform(0.75, 1.0)
        for p in range(pulses):
            idx = (np.arange(pl) + st + p * (pl + gap)) % N
            np.add.at(x, idx, pulse * amp)
    return x


def crickets_loop(dur, seed=11, n_voices=7, bed=0.03):
    r = np.random.default_rng(seed)
    N = int(dur * SR); buf = np.zeros((2, N))
    for v in range(n_voices):
        dist = r.uniform(0.15, 1.0)
        voice = lowpass(cricket_voice(dur, seed * 100 + v), 3500 + 6000 * dist) * (0.15 + 0.6 * dist)
        place_circular(buf, voice, 0, p=r.uniform(-0.9, 0.9), gain=0.25)
    ch = bandpass(pink(N + 2 * SR), 3800, 6000)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 24 * np.arange(len(ch)) / SR)
    ch = loop_crossfade(np.stack([ch * am, np.roll(ch * am, 3333)]) * bed, 2.0)[:, :N]
    buf += ch
    return reverb_circular(buf, make_ir(1.8, 1.4, 6000, seed=4), wet=0.3)


# ================= VENT / PLUIE =================

def slow_lfo(n, fc=0.15, seed=0):
    r = np.random.default_rng(seed)
    x = lowpass(r.standard_normal(n + 4 * SR), fc, 1)[4 * SR:]
    return (x - x.min()) / (np.ptp(x) + 1e-9)


def wind_loop(dur):
    n = int((dur + 4) * SR)
    chans = []
    for c in range(2):
        b = brown(n)
        low = lowpass(b, 350)
        mid = bandpass(b, 300, 1400)
        lfo = slow_lfo(n, 0.12, seed=40 + c)
        gust = slow_lfo(n, 0.05, seed=60 + c)
        chans.append((low * (0.6 + 0.4 * gust) + mid * lfo * 0.6) * (0.35 + 0.65 * gust))
    return loop_crossfade(np.stack(chans), 4.0)


def drop(f, tau, n):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * (1 + 0.3 * t / tau) * t) * np.exp(-t / tau)


def rain_loop(dur, density=900):
    n = int((dur + 3) * SR)
    chans = []
    for c in range(2):
        r = np.random.default_rng(70 + c)
        bed = highpass(pink(n), 400) * 0.35 + bandpass(noise(n), 2500, 9000) * 0.12
        bed *= 0.8 + 0.2 * slow_lfo(n, 0.2, seed=80 + c)
        drops = np.zeros(n)
        cnt = int(density * dur)
        pos = r.integers(0, n - 2000, cnt)
        for p in pos:
            f = r.uniform(1800, 7000); tau = r.uniform(0.002, 0.008)
            d = drop(f, tau, int(tau * 6 * SR)) * r.uniform(0.1, 0.6)
            drops[p:p + len(d)] += d
        for p in r.integers(0, n - 6000, int(dur * 6)):  # grosses gouttes
            d = drop(r.uniform(500, 1200), 0.015, 5000) * r.uniform(0.4, 0.9)
            drops[p:p + len(d)] += d
        chans.append(bed + drops * 0.5)
    return loop_crossfade(np.stack(chans), 3.0)


# ================= MOULIN / RUISSEAU =================

def creak(dur, f0=45, f1=70, res=(380, 850, 1650), seed=0, rough=0.35):
    """Grincement par friction : train d'impulsions irrégulier → résonateurs bois."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    f = np.linspace(f0, f1, n) * (1 + rough * 0.3 * lowpass(r.standard_normal(n), 30, 1) * 10)
    ph = np.cumsum(np.abs(f)) / SR
    imp = np.diff(np.floor(ph), prepend=0) * r.uniform(0.5, 1.0, n)
    y = sum(resonator(imp, fr, 18) * g for fr, g in zip(res, (1, 0.7, 0.4)))
    return y * hann_env(n, 0.25)


def mill_loop():
    rot = 4.8; N = int(rot * 4 * SR)  # 4 tours = 19,2 s
    buf = np.zeros((2, N))
    blade_pass = rot / 4
    for k in range(16):
        d = 0.9; n = int(d * SR)
        w = bandpass(noise(n), 180, 900) * np.hanning(n) ** 1.5 * R.uniform(0.85, 1.0)
        w2 = lowpass(noise(n), 220) * np.hanning(n) ** 2 * 0.8
        place_circular(buf, (w + w2) * 0.5, int(k * blade_pass * SR), p=-0.25 + 0.5 * (k % 2), gain=0.5)
    for k in range(4):
        c = creak(R.uniform(0.6, 0.9), R.uniform(35, 55), R.uniform(55, 80), seed=k + 3)
        place_circular(buf, c * 0.25, int((k * rot + 1.3) * SR), p=0.1)
        c2 = creak(0.3, 90, 70, res=(520, 1100, 2100), seed=k + 30)
        place_circular(buf, c2 * 0.12, int((k * rot + 3.4) * SR), p=-0.1)
    # engrenages : petits « toc » réguliers + grondement
    tooth = rot / 24
    for k in range(int(4 * rot / tooth)):
        n = int(0.04 * SR)
        knock = resonator(noise(n) * env_exp(n, 0.004), R.uniform(240, 280), 12) * 0.25
        place_circular(buf, knock, int(k * tooth * SR), p=0.0, gain=R.uniform(0.6, 1.0))
    rumble = lowpass(brown(N + 2 * SR), 140)
    rumble = loop_crossfade(np.stack([rumble, np.roll(rumble, 999)]), 2.0)[:, :N] * 0.25
    buf += rumble
    return reverb_circular(buf, make_ir(1.2, 0.9, 5000, seed=12), wet=0.2)


def stream_loop(dur=24.0):
    n = int((dur + 3) * SR); chans = []
    for c in range(2):
        r = np.random.default_rng(90 + c)
        bed = bandpass(pink(n), 250, 3500) * (0.6 + 0.4 * slow_lfo(n, 0.4, 100 + c)) * 0.3
        bub = np.zeros(n)
        for p in r.integers(0, n - 8000, int(dur * 40)):
            f0 = r.uniform(350, 1800); tau = r.uniform(0.006, 0.025)
            m = int(tau * 5 * SR); t = np.arange(m) / SR
            b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * t / (tau * 5))) / SR) * np.exp(-t / tau)
            bub[p:p + m] += b * r.uniform(0.1, 0.5)
        chans.append(bed + bub * 0.6)
    return loop_crossfade(np.stack(chans), 3.0)


# ================= PONCTUELS NATURE =================

def owl():
    parts = []
    for d, g in ((0.35, 0.8), (0.12, 0), (0.25, 0.6), (0.15, 0), (0.9, 1.0)):
        n = int(d * SR)
        if g == 0:
            parts.append(np.zeros(n)); continue
        s = glide_tone(390, 360, d, harm=0.25) + 0.08 * lowpass(noise(n), 900)
        parts.append(s * hann_env(n, 0.3) * g)
    y = np.concatenate(parts)
    return rev_tail(y, make_ir(2.5, 2.0, 3000, 5), 0.45) * 0.9


# ================= PAS =================

def step(surface, r):
    if surface == 'grass':
        n = int(0.22 * SR)
        crack = (r.random(n) < 0.02) * r.standard_normal(n)
        x = bandpass(noise(n) * 0.5 + crack * 3, 1800, 9000) * env_exp(n, 0.05)
        x[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        x += lowpass(noise(n), 120) * env_exp(n, 0.03) * 0.8
    elif surface == 'dirt':
        n = int(0.18 * SR)
        x = lowpass(noise(n), 200) * env_exp(n, 0.035) * 1.6
        x += bandpass(noise(n) * ((r.random(n) < 0.05) * 1.0 + 0.2), 600, 3500) * env_exp(n, 0.06) * 0.8
    elif surface == 'stone':
        n = int(0.16 * SR)
        exc = noise(n) * env_exp(n, 0.003)
        x = resonator(exc, r.uniform(1100, 1400), 9) * 0.6 + resonator(exc, r.uniform(2400, 2900), 12) * 0.4
        x += highpass(noise(n), 2500) * env_exp(n, 0.02) * 0.3 + lowpass(noise(n), 150) * env_exp(n, 0.02)
    elif surface == 'wood':
        n = int(0.2 * SR)
        exc = noise(n) * env_exp(n, 0.004)
        x = resonator(exc, r.uniform(170, 210), 8) * 1.4 + resonator(exc, r.uniform(400, 460), 10) * 0.7
        x += bandpass(noise(n), 1500, 5000) * env_exp(n, 0.01) * 0.15
    return fade_edges(peak_to(x, -1), 0.001, 0.02)


# ================= OUTILS =================

def whoosh(dur=0.22, lo=300, hi=2400, seed=0):
    n = int(dur * SR)
    x = noise(n)
    a = lowpass(x, lo * 2); b = bandpass(x, lo, hi)
    e = np.hanning(n) ** 2
    k = np.linspace(0, 1, n)
    return (a * (1 - k) + b * k) * e


def axe_impact(r):
    n = int(0.6 * SR)
    exc = noise(n) * env_exp(n, 0.002)
    modes = [(r.uniform(150, 175), 25, 1.0), (r.uniform(330, 370), 30, 0.7), (r.uniform(700, 780), 35, 0.45),
             (r.uniform(1350, 1500), 40, 0.25)]
    x = sum(resonator(exc, f, q) * g for f, q, g in modes) * 1.2
    x += bandpass(noise(n), 1500, 7000) * env_exp(n, 0.012) * 0.6
    x += lowpass(noise(n), 100) * env_exp(n, 0.03) * 1.0
    pre = whoosh(0.16, 250, 1800) * 0.12
    return fade_edges(peak_to(np.concatenate([pre, x]), -1), 0.002, 0.05), len(pre) / SR


def tree_fall():
    c = creak(1.6, 25, 70, res=(220, 480, 950), seed=77, rough=0.6) * 1.5
    n = int(2.6 * SR)
    crash = lowpass(noise(n), 2500) * env_exp(n, 0.5)
    crash *= (R.random(n) < 0.3) * 0.7 + 0.3
    crash = bandpass(crash, 200, 6000)
    leaves = bandpass(noise(n), 2000, 9000) * env_exp(n, 0.7) * 0.35
    thud = lowpass(noise(n), 90) * env_exp(n, 0.25) * 4
    tail = crash * 0.6 + leaves + thud
    y = np.concatenate([c, np.zeros(int(0.1 * SR))]) ; y = np.concatenate([y, tail])
    sn = lowpass(noise(int(0.35 * SR)), 1200) * 0.3; s0 = len(c) - int(0.25 * SR); y[s0:s0 + len(sn)] += sn
    return fade_edges(peak_to(y, -1), 0.01, 0.3)


def pick_impact(r, ore=False):
    n = int(0.9 * SR); t = np.arange(n) / SR
    k = r.uniform(0.95, 1.06)
    partials = [(2350, 0.25, 1), (3920, 0.18, 0.7), (5630, 0.12, 0.5), (7410, 0.08, 0.35)]
    ring = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t / tau) * g for f, tau, g in partials)
    ring *= 0.35 if not ore else 0.6
    crunch = bandpass(noise(n), 800, 6000) * env_exp(n, 0.025) * (1.2 if not ore else 0.8)
    crunch *= (r.random(n) < 0.15) * 1.0 + 0.4
    thud = lowpass(noise(n), 160) * env_exp(n, 0.02) * 1.2
    pre = whoosh(0.14, 300, 2200) * 0.1
    return fade_edges(peak_to(np.concatenate([pre, ring + crunch + thud]), -1), 0.002, 0.05)


def watering(dur=1.6, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    flow = bandpass(pink(n), 500, 5000) * (0.7 + 0.3 * slow_lfo(n, 6, seed))
    drops = np.zeros(n)
    for p in r.integers(0, n - 3000, int(dur * 220)):
        f = r.uniform(900, 4000); tau = r.uniform(0.003, 0.012)
        d = drop(f, tau, int(tau * 5 * SR)); drops[p:p + len(d)] += d * r.uniform(0.1, 0.5)
    y = flow * 0.4 + drops
    e = np.ones(n); a = int(0.12 * SR); b = int(0.35 * SR)
    e[:a] = np.linspace(0, 1, a); e[-b:] = np.linspace(1, 0, b) ** 2
    return fade_edges(peak_to(y * e, -1))


def rustle(dur, seed, lo=1500, hi=8000):
    r = np.random.default_rng(seed); n = int(dur * SR)
    g = ((r.random(n) < 0.04) * r.standard_normal(n) * 2 + noise(n) * 0.4)
    e = np.hanning(n) ** 0.7 * (0.6 + 0.4 * slow_lfo(n, 20, seed))
    return fade_edges(peak_to(bandpass(g, lo, hi) * e, -1))


def root_pull(seed):
    r = np.random.default_rng(seed); n = int(0.4 * SR)
    pop = glide_tone(r.uniform(160, 200), 420, 0.08, 0.3) * np.hanning(int(0.08 * SR))
    dirt = lowpass(noise(n) * ((r.random(n) < 0.06) + 0.15), 2500) * env_exp(n, 0.12)
    y = np.concatenate([rustle(0.12, seed, 800, 4000) * 0.5, pop * 0.9, np.zeros(0)])
    out = np.zeros(len(y) + n); out[: len(y)] += y; out[int(0.15 * SR):int(0.15 * SR) + n] += dirt * 0.8
    return fade_edges(peak_to(out, -1))


def chime(notes, step_s=0.07, decay=0.8, inst=None):
    inst = inst or (lambda f, d: bell(f, d, ratio=2.0, idx=0.8))
    n = int((step_s * len(notes) + decay) * SR); y = np.zeros(n)
    for i, m in enumerate(notes):
        s = inst(mtof(m), decay); st = int(i * step_s * SR); y[st:st + len(s)] += s * (0.85 ** i)
    return fade_edges(peak_to(y, -1), 0.001, 0.05)


def latch(seed):
    r = np.random.default_rng(seed); n = int(0.08 * SR)
    exc = noise(n) * env_exp(n, 0.002)
    return resonator(exc, r.uniform(2800, 3400), 25) * 0.6 + resonator(exc, r.uniform(1200, 1500), 15) * 0.5


def door_open():
    c = creak(0.75, 50, 110, res=(450, 980, 1900), seed=5) * 1.2
    l = latch(1)
    y = np.zeros(len(c) + len(l)); y[: len(l)] += l; y[int(0.05 * SR):int(0.05 * SR) + len(c)] += c
    return fade_edges(peak_to(y, -1), 0.001, 0.05)


def door_close():
    n = int(0.5 * SR); exc = noise(n) * env_exp(n, 0.004)
    thud = resonator(exc, 110, 6) * 1.5 + resonator(exc, 260, 10) * 0.6 + lowpass(noise(n), 90) * env_exp(n, 0.05)
    c = creak(0.25, 90, 60, res=(500, 1100, 2000), seed=8) * 0.6
    y = np.zeros(len(c) + n); y[: len(c)] += c; y[len(c) - int(0.02 * SR):][:n] += thud
    l = latch(2); st = len(c) + int(0.03 * SR); y[st:st + len(l)] += l * 0.8
    return fade_edges(peak_to(y, -1), 0.001, 0.05)


def chest(open_=True):
    c = creak(0.35, 70, 120, res=(600, 1300, 2500), seed=13 if open_ else 14) * 0.8
    n = int(0.3 * SR); exc = noise(n) * env_exp(n, 0.003)
    knock = resonator(exc, 210, 9) + resonator(exc, 520, 12) * 0.5
    y = np.concatenate([c, knock]) if not open_ else np.concatenate([latch(3), c])
    return fade_edges(peak_to(y, -1), 0.001, 0.05)


def hammer_wood(seed):
    r = np.random.default_rng(seed); out = []
    for i in range(3):
        n = int(0.22 * SR); exc = noise(n) * env_exp(n, 0.0015)
        hit = resonator(exc, r.uniform(1800, 2300), 20) * 0.4 + resonator(exc, r.uniform(240, 300), 9) + resonator(exc, r.uniform(520, 600), 12) * 0.5
        out += [hit * (0.8 + 0.2 * i), np.zeros(int(r.uniform(0.12, 0.2) * SR))]
    return fade_edges(peak_to(np.concatenate(out), -1))


def ui_click():
    n = int(0.05 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.006) + 0.4 * np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.01)
    return fade_edges(peak_to(y, -1), 0.0005, 0.005)


if __name__ == '__main__':
    # ---- ambiances (stéréo, boucles)
    save('ambient/birds_morning_01.ogg', normalize(birds_loop(40, 2.2, 1), rms_db=-24), 'nature', True, 0.55, when='morning')
    save('ambient/birds_day_01.ogg', normalize(birds_loop(40, 0.9, 2), rms_db=-27), 'nature', True, 0.5, when='day')
    save('ambient/crickets_night_01.ogg', normalize(crickets_loop(30, 11, 8), rms_db=-27), 'nature', True, 0.5, when='night')
    save('ambient/crickets_dusk_01.ogg', normalize(crickets_loop(30, 23, 3, 0.012), rms_db=-30), 'nature', True, 0.45, when='dusk')
    save('ambient/wind_light.ogg', normalize(wind_loop(30), rms_db=-26), 'nature', True, 0.4, when='always')
    save('ambient/rain_loop.ogg', normalize(rain_loop(24), rms_db=-21), 'nature', True, 0.6, when='rain')
    # ponctuels nature (émis aléatoirement par l'AmbientManager)
    for i, fn in enumerate(BIRDS * 2):
        r = np.random.default_rng(500 + i)
        y = fn(r); y = np.concatenate([np.zeros(200), y, np.zeros(int(0.3 * SR))])
        y = rev_tail(y, make_ir(1.0, 0.8, 7000, 7), 0.3)
        save(f'ambient/oneshots/bird_call_{i+1:02d}.ogg', fade_edges(peak_to(y, -4), 0.001, 0.2), 'nature', False, 0.4, when='day')
    save('ambient/oneshots/owl_01.ogg', fade_edges(peak_to(owl(), -4), 0.01, 0.3), 'nature', False, 0.45, when='night')

    # ---- environnement spatial
    save('environment/mill_loop.ogg', normalize(mill_loop(), rms_db=-20), 'environment', True, 0.45, maxDistanceTiles=20)
    save('environment/stream_loop.ogg', normalize(stream_loop(), rms_db=-22), 'environment', True, 0.5, maxDistanceTiles=12)

    # ---- pas (mono)
    for surf in ('grass', 'dirt', 'stone', 'wood'):
        r = np.random.default_rng({'grass':1,'dirt':2,'stone':3,'wood':4}[surf] * 37)
        for v in range(4):
            save(f'sfx/footsteps/{surf}_{v+1:02d}.ogg', peak_to(step(surf, r), -6), 'sfx', False, 0.5, group=f'step_{surf}')
    # ---- outils
    for v in range(3):
        y, hit = axe_impact(np.random.default_rng(10 + v))
        save(f'sfx/tools/axe_wood_{v+1:02d}.ogg', y, 'sfx', False, 0.8, group='axe_wood', impactOffsetSec=round(hit, 3))
    save('sfx/tools/tree_fall_01.ogg', tree_fall(), 'sfx', False, 0.85, group='tree_fall')
    for v in range(3):
        save(f'sfx/tools/pickaxe_stone_{v+1:02d}.ogg', pick_impact(np.random.default_rng(20 + v)), 'sfx', False, 0.75, group='pickaxe_stone', impactOffsetSec=0.14)
    for v in range(2):
        save(f'sfx/tools/pickaxe_ore_{v+1:02d}.ogg', pick_impact(np.random.default_rng(30 + v), ore=True), 'sfx', False, 0.75, group='pickaxe_ore', impactOffsetSec=0.14)
    save('sfx/tools/pickaxe_miss_01.ogg', fade_edges(peak_to(whoosh(0.28, 250, 2000), -6)), 'sfx', False, 0.6, group='pickaxe_miss')
    for v in range(2):
        save(f'sfx/tools/watering_{v+1:02d}.ogg', watering(1.6, 40 + v), 'sfx', False, 0.6, group='watering')
    # ---- récolte / construction / portes / UI
    for v in range(3):
        save(f'sfx/harvest/harvest_leaf_{v+1:02d}.ogg', rustle(0.35, 50 + v), 'sfx', False, 0.6, group='harvest_leaf')
    for v in range(2):
        save(f'sfx/harvest/harvest_root_{v+1:02d}.ogg', root_pull(60 + v), 'sfx', False, 0.7, group='harvest_root')
    save('sfx/harvest/collect_01.ogg', chime([79, 84], 0.06, 0.5), 'sfx', False, 0.5, group='collect')
    save('sfx/build/build_wood_01.ogg', hammer_wood(70), 'sfx', False, 0.75, group='build_wood')
    save('sfx/build/build_confirm_01.ogg', chime([72, 76, 79, 84], 0.08, 1.0, inst=lambda f, d: pluck(f, d, 2500)), 'sfx', False, 0.55, group='build_confirm')
    save('sfx/doors/door_open_01.ogg', door_open(), 'sfx', False, 0.7, group='door_open')
    save('sfx/doors/door_close_01.ogg', door_close(), 'sfx', False, 0.7, group='door_close')
    save('sfx/doors/chest_open_01.ogg', chest(True), 'sfx', False, 0.6, group='chest_open')
    save('sfx/doors/chest_close_01.ogg', chest(False), 'sfx', False, 0.6, group='chest_close')
    save('sfx/ui/ui_click_01.ogg', peak_to(ui_click(), -8), 'ui', False, 0.5, group='ui_click')

    import json
    print(len(MANIFEST), 'fichiers')
