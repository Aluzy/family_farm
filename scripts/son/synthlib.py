"""Petite bibliothèque de synthèse pour la bande-son Family Farm (numpy/scipy)."""
import numpy as np
from scipy import signal
import subprocess, os, wave

SR = 44100
RNG = np.random.default_rng(1977)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def adsr(n, a, d, s, r, sr=SR):
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    s_n = max(n - a_n - d_n - r_n, 0)
    env = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False) if a_n else np.zeros(0),
        np.linspace(1, s, d_n, endpoint=False) if d_n else np.zeros(0),
        np.full(s_n, s),
        np.linspace(s, 0, r_n) if r_n else np.zeros(0),
    ])
    if len(env) < n:
        env = np.pad(env, (0, n - len(env)))
    return env[:n]


def lowpass(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=-1)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=-1)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=-1)


def resonator(x, f, q):
    """Filtre résonant 2 pôles (mode modal)."""
    b, a = signal.iirpeak(f / (SR / 2), q)
    return signal.lfilter(b, a, x)


def noise(n):
    return RNG.standard_normal(n)


def pink(n):
    w = RNG.standard_normal(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    y = signal.lfilter(b, a, w)
    return y / (np.std(y) + 1e-9)


def brown(n):
    y = np.cumsum(RNG.standard_normal(n))
    y = highpass(y, 20)
    return y / (np.std(y) + 1e-9)


# ---------- instruments ----------

def soft_pad(freq, dur, detune=0.07, bright=1400):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for d in (-detune, 0, detune):
        f = freq * 2 ** (d / 12)
        ph = RNG.random()
        # triangle douce
        out += 2 * np.abs(2 * ((f * t + ph) % 1) - 1) - 1
    out /= 3
    out = lowpass(out, bright)
    return out * adsr(len(t), min(1.2, dur * 0.35), 0.5, 0.8, min(1.5, dur * 0.35))


def pluck(freq, dur, bright=3000, pulse=0.3):
    t = t_axis(dur)
    sq = np.where((freq * t) % 1 < pulse, 1.0, -1.0)
    s = 0.55 * sq + 0.45 * np.sin(2 * np.pi * freq * t)
    # filtre qui se referme
    env = np.exp(-t * 5)
    s = lowpass(s, bright) * 0.6 + lowpass(s, 900) * 0.4
    s = s * (0.25 + 0.75 * env)
    return s * adsr(len(t), 0.008, 0.25, 0.35, min(0.25, dur * 0.4))


def flute_lead(freq, dur):
    t = t_axis(dur)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.4, 0, 1)
    ph = np.cumsum(freq * vib) / SR
    s = np.sin(2 * np.pi * ph) + 0.18 * np.sin(4 * np.pi * ph) + 0.06 * np.sin(6 * np.pi * ph)
    s += 0.03 * lowpass(noise(len(t)), 3000)
    return s * adsr(len(t), 0.06, 0.2, 0.75, min(0.3, dur * 0.4))


def bell(freq, dur, ratio=3.5, idx=2.2):
    t = t_axis(dur)
    mod = idx * np.exp(-t * 3) * np.sin(2 * np.pi * freq * ratio * t)
    s = np.sin(2 * np.pi * freq * t + mod)
    return s * np.exp(-t * 2.2) * adsr(len(t), 0.003, 0, 1, 0.05)


def bass(freq, dur):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    s = lowpass(s, 400)
    return s * adsr(len(t), 0.02, 0.3, 0.6, min(0.3, dur * 0.3))


def kalimba(freq, dur):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 18)
    return s * np.exp(-t * 3.5) * adsr(len(t), 0.002, 0, 1, 0.04)


# ---------- espace ----------

def make_ir(dur=2.6, decay=2.2, damp=5000, seed=3):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t * (6.9 / decay))
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)]) * env
    ir = lowpass(ir, damp)
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb_circular(stereo, ir, wet=0.25):
    """Réverb circulaire : la queue retombe au début → boucle sans couture."""
    n = stereo.shape[1]
    out = np.zeros_like(stereo)
    for c in range(2):
        y = signal.fftconvolve(stereo[c], ir[c])
        y_full = y[:n].copy()
        tail = y[n:]
        # replier la queue sur le début (plusieurs tours si besoin)
        for k in range(0, len(tail), n):
            seg = tail[k:k + n]
            y_full[: len(seg)] += seg
        out[c] = y_full
    return stereo * (1 - wet) + out * wet * 0.35


def pan(mono, p):
    """p dans [-1, 1], loi à puissance constante."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)])


def place_circular(buf, sig, start, p=0.0, gain=1.0):
    """Ajoute un signal stéréo dans un tampon bouclé (enroulement)."""
    st = pan(sig, p) * gain if sig.ndim == 1 else sig * gain
    n = buf.shape[1]
    idx = (np.arange(st.shape[1]) + start) % n
    for c in range(2):
        np.add.at(buf[c], idx, st[c])


def place(buf, sig, start, p=0.0, gain=1.0):
    st = pan(sig, p) * gain if sig.ndim == 1 else sig * gain
    end = min(buf.shape[1], start + st.shape[1])
    buf[:, start:end] += st[:, : end - start]


def loop_crossfade(stereo, xfade):
    """Rend un enregistrement bouclable : fond la fin sur le début."""
    xn = int(xfade * SR)
    body = stereo[:, : -xn].copy()
    tail = stereo[:, -xn:]
    w = np.sqrt(np.linspace(0, 1, xn))
    body[:, :xn] = body[:, :xn] * w + tail * w[::-1]
    return body


# ---------- sortie ----------

def normalize(x, peak_db=-1.0, rms_db=None):
    x = np.asarray(x, dtype=np.float64)
    if rms_db is not None:
        rms = np.sqrt(np.mean(x ** 2)) + 1e-12
        x = x * (10 ** (rms_db / 20) / rms)
    pk = np.max(np.abs(x)) + 1e-12
    lim = 10 ** (peak_db / 20)
    if pk > lim:
        x = soft_limit(x, lim)
    return x


def soft_limit(x, lim):
    return np.tanh(x / lim) * lim


def fade_edges(x, fin=0.002, fout=0.01):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[..., :a] *= np.linspace(0, 1, a)
    if b:
        x[..., -b:] *= np.linspace(1, 0, b)
    return x


def write_ogg(path, x, quality=5):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if x.ndim == 1:
        x = x[None, :]
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').T.copy()
    wav = path.rsplit('.', 1)[0] + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(pcm.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis',
                    '-q:a', str(quality), path], check=True)
    master = path.replace('/public/assets/audio/', '/masters_wav/').rsplit('.', 1)[0] + '.wav'
    os.makedirs(os.path.dirname(master), exist_ok=True)
    os.replace(wav, master)
    return path
