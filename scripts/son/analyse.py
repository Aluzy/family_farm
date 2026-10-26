"""Analyse de vrais cris (poule, coq, mouton, vache) pour régler la synthèse des bêtes.

Pour chaque enregistrement : les cris (segments au-dessus du bruit de fond), et pour chaque cri
sa durée, sa hauteur (f0 par YIN, image par image), la part voisée, ses formants (LPC), son
centre de gravité spectral, la modulation d'amplitude (le chevrotement du mouton) et le rythme
des cris. Les meilleurs cris (voisés, nets, pas saturés) deviennent des « gabarits » : leurs
contours (f0, volume, formants) normalisés, que animaux.py rejoue avec sa propre voix.

Les enregistrements ne sont ni copiés dans le jeu ni rejoués : seules des mesures en sortent.
Usage : python3 analyse.py <dossier ESC-50> → _sortie/gabarits.json et _sortie/analyse.txt
"""
import csv, json, os, sys, wave
import numpy as np
from scipy import signal
from scipy.linalg import solve_toeplitz

SR = 44100
BETES = {   # plage de f0 cherchée (Hz)
    'hen': (180, 1400), 'rooster': (250, 1500), 'cow': (60, 450), 'sheep': (120, 900),
}


def lit(p):
    w = wave.open(p)
    n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
    x = np.frombuffer(w.readframes(n), '<i2' if sw == 2 else '<i4').astype(float)
    x = x.reshape(-1, ch).mean(axis=1) / (2 ** (8 * sw - 1))
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


def segments(x, hop=441, seuil_db=-22, min_s=0.05, trou_s=0.04):
    """Les cris : trames (10 ms) plus fortes que le fond de plus de 12 dB et à -22 dB du max."""
    n = len(x) // hop
    rms = np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(n)]) + 1e-12)
    db = 20 * np.log10(rms)
    fond = np.percentile(db, 15)
    actif = (db > db.max() + seuil_db) & (db > fond + 12)
    segs, i = [], 0
    while i < n:
        if actif[i]:
            j = i
            while j < n and actif[j]:
                j += 1
            segs.append([i, j]); i = j
        else:
            i += 1
    fus = []
    for s in segs:   # fusionner les trous courts
        if fus and (s[0] - fus[-1][1]) * hop / SR < trou_s:
            fus[-1][1] = s[1]
        else:
            fus.append(s)
    return [(a * hop, b * hop) for a, b in fus if (b - a) * hop / SR >= min_s], db.max() - fond


def yin(x, fmin, fmax, trame=2048, hop=441, seuil=0.15):
    """f0 par YIN (de Cheveigné & Kawahara 2002) ; 0 si non voisé. Renvoie (f0, clarté)."""
    tmin, tmax = int(SR / fmax), min(int(SR / fmin), trame // 2 - 2)
    f0s, clar = [], []
    for i in range(0, len(x) - trame, hop):
        fr = x[i:i + trame]
        w = trame // 2
        # fonction de différence par FFT : d(t) = E(0..w) + E(t..t+w) - 2·r(t)
        F = np.fft.rfft(fr, 2 * trame); G = np.fft.rfft(fr[:w][::-1], 2 * trame)
        r = np.fft.irfft(F * G)[w - 1:w - 1 + tmax + 2]
        e = np.cumsum(np.concatenate([[0], fr ** 2]))
        t_ = np.arange(tmax + 2)
        d = np.maximum(e[w] + (e[t_ + w] - e[t_]) - 2 * r, 0)
        cmnd = np.ones_like(d); cum = np.cumsum(d[1:]); cmnd[1:] = d[1:] * np.arange(1, len(d)) / (cum + 1e-12)
        zone = cmnd[tmin:tmax]
        idx = np.where(zone < seuil)[0]
        if len(idx):
            t = idx[0] + tmin
            while t + 1 < tmax and cmnd[t + 1] < cmnd[t]:
                t += 1
        else:
            t = int(np.argmin(zone)) + tmin
        # interpolation parabolique
        if 1 <= t < len(cmnd) - 1:
            a, b, c = cmnd[t - 1], cmnd[t], cmnd[t + 1]
            dt = 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
        else:
            dt = 0
        c0 = cmnd[t]
        f0s.append(SR / (t + dt) if c0 < 0.35 else 0.0)
        clar.append(1 - min(1, c0))
    return np.array(f0s), np.array(clar)


def formants_lpc(x, sr_cible=11025, ordre=12, n_max=3):
    """Formants d'un extrait voisé : racines du polynôme LPC (bande passante < 500 Hz)."""
    y = signal.resample_poly(x, sr_cible, SR)
    y = signal.lfilter([1, -0.63], [1], y) * np.hamming(len(y))
    r = np.correlate(y, y, 'full')[len(y) - 1:len(y) + ordre]
    if r[0] <= 0:
        return []
    a = solve_toeplitz(r[:ordre], -r[1:ordre + 1])
    racines = np.roots(np.concatenate([[1], a]))
    racines = racines[np.imag(racines) > 0]
    f = np.angle(racines) * sr_cible / (2 * np.pi)
    bw = -np.log(np.abs(racines)) * sr_cible / np.pi
    ok = sorted(fi for fi, b in zip(f, bw) if 150 < fi < sr_cible / 2 - 300 and b < 500)
    return ok[:n_max]


def mod_am(env_db, hop_s=0.01):
    """La modulation d'amplitude dominante (4 à 20 Hz) d'une enveloppe : (fréquence, profondeur)."""
    e = 10 ** (env_db / 20)
    if len(e) < 30:
        return 0.0, 0.0
    e = e - e.mean()
    spec = np.abs(np.fft.rfft(e * np.hanning(len(e)), 1024))
    fr = np.fft.rfftfreq(1024, hop_s)
    z = (fr > 4) & (fr < 20)
    k = np.argmax(spec[z])
    prof = spec[z][k] / (np.abs(np.fft.rfft(10 ** (env_db / 20) * np.hanning(len(e)), 1024))[0] + 1e-9)
    return float(fr[z][k]), float(prof)


def resume(v, n=12):
    """Un contour ramené à n points (les zéros, non voisés, interpolés)."""
    v = np.asarray(v, float)
    if not len(v):
        return [0.0] * n
    ok = v > 0
    if ok.sum() >= 2:
        idx = np.arange(len(v))
        v = np.interp(idx, idx[ok], v[ok])
    return [round(float(t), 1) for t in np.interp(np.linspace(0, len(v) - 1, n), np.arange(len(v)), v)]


def analyse_fichier(p, bete):
    x = lit(p)
    if np.max(np.abs(x)) < 1e-4:
        return None
    sat = float(np.mean(np.abs(x) > 0.98))
    x = x / np.max(np.abs(x))
    x_hp = signal.sosfilt(signal.butter(4, 60 / (SR / 2), 'high', output='sos'), x)
    segs, snr = segments(x_hp)
    fmin, fmax = BETES[bete]
    cris = []
    for a, b in segs[:12]:
        seg = x_hp[a:b]
        if len(seg) < 2600:
            continue
        f0, cl = yin(seg, fmin, fmax)
        hop = 441
        env = np.array([np.sqrt(np.mean(seg[i:i + hop] ** 2) + 1e-12) for i in range(0, len(seg) - hop, hop)])
        env_db = 20 * np.log10(env)
        voise = f0 > 0
        # formants : sur les trames voisées les plus fortes
        forts = np.argsort(env)[-max(3, len(env) // 3):]
        fm = []
        for k in forts[:6]:
            s0 = k * hop
            ext = seg[s0:s0 + 2048]
            if len(ext) == 2048:
                f = formants_lpc(ext, 11025 if bete in ('cow', 'sheep') else 22050, 12 if bete in ('cow', 'sheep') else 18)
                if len(f) >= 2:
                    fm.append(f[:3] + [0] * (3 - len(f[:3])))
        fm = np.median(np.array(fm), axis=0).tolist() if fm else []
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        centre = float(np.sum(fr * spec) / (np.sum(spec) + 1e-9))
        am_f, am_p = mod_am(env_db)
        # irrégularité de f0 (jitter grossier, trame à trame)
        fv = f0[voise]
        jit = float(np.median(np.abs(np.diff(fv)) / fv[1:])) if len(fv) > 3 else 0.0
        cris.append(dict(debut=round(a / SR, 3), duree=round((b - a) / SR, 3), voise=round(float(voise.mean()), 2),
                         clarte=round(float(cl.mean()), 2), f0_med=round(float(np.median(fv)), 1) if len(fv) else 0,
                         f0_min=round(float(np.min(fv)), 1) if len(fv) else 0, f0_max=round(float(np.max(fv)), 1) if len(fv) else 0,
                         jitter=round(jit, 4), formants=[round(f) for f in fm], centre=round(centre),
                         am=[round(am_f, 1), round(am_p, 3)],
                         f0=resume(f0), env=resume(env_db - env_db.max()), ))
    if not cris:
        return None
    ecarts = [round(cris[i + 1]['debut'] - cris[i]['debut'] - cris[i]['duree'], 3) for i in range(len(cris) - 1)]
    return dict(fichier=os.path.basename(p), bete=bete, snr=round(float(snr), 1), saturation=round(sat, 4), cris=cris, ecarts=ecarts)


def qualite(cri):
    return cri['voise'] * cri['clarte'] * min(1.0, cri['duree'] / 0.3)


if __name__ == '__main__':
    base = sys.argv[1]
    lignes = list(csv.DictReader(open(os.path.join(base, 'meta', 'esc50.csv'))))
    res = []
    for l in lignes:
        if l['category'] in BETES:
            r = analyse_fichier(os.path.join(base, 'audio', l['filename']), l['category'])
            if r:
                res.append(r)
    os.makedirs('_sortie', exist_ok=True)
    json.dump(res, open('_sortie/analyse_brute.json', 'w'), indent=1)
    out, gab = [], {}
    for bete in BETES:
        rs = [r for r in res if r['bete'] == bete and r['saturation'] < 0.002 and r['snr'] > 20]
        cris = [(c, r) for r in rs for c in r['cris'] if c['voise'] > 0.4 and c['f0_med'] > 0]
        A = lambda k: np.array([c[k] for c, _ in cris])
        fm = np.array([c['formants'] for c, _ in cris if len(c['formants']) == 3])
        ec = [e for r in rs for e in r['ecarts'] if e > 0]
        ncri = [len(r['cris']) for r in rs]
        out.append(f"== {bete} : {len(rs)} enregistrements nets, {len(cris)} cris voisés")
        q = lambda v: f"{np.percentile(v, 10):.0f} / {np.median(v):.0f} / {np.percentile(v, 90):.0f}"
        out.append(f"   durée d'un cri (ms, p10/méd/p90) : {q(A('duree') * 1000)}")
        out.append(f"   f0 médiane (Hz)                  : {q(A('f0_med'))}")
        out.append(f"   f0 étendue max/min (rapport)     : {np.median(A('f0_max') / np.maximum(A('f0_min'), 1)):.2f}")
        out.append(f"   part voisée                      : {np.median(A('voise')):.2f}   jitter : {np.median(A('jitter')) * 100:.1f} %")
        if len(fm):
            out.append(f"   formants F1/F2/F3 (Hz, méd)      : {np.median(fm[:, 0]):.0f} / {np.median(fm[:, 1]):.0f} / {np.median(fm[:, 2]):.0f}")
        out.append(f"   centre spectral (Hz)             : {q(A('centre'))}")
        am = np.array([c['am'] for c, _ in cris])
        out.append(f"   modulation d'amplitude (Hz, méd) : {np.median(am[:, 0]):.1f}  profondeur {np.median(am[:, 1]):.2f}")
        out.append(f"   cris par 5 s : {np.median(ncri):.0f}   silence entre deux (ms) : {q(np.array(ec) * 1000) if ec else '-'}")
        # les gabarits : les cris les plus nets, en couvrant les hauteurs (5 quantiles)
        bons = sorted(cris, key=lambda cr: -qualite(cr[0]))[:max(15, len(cris) // 3)]
        bons.sort(key=lambda cr: cr[0]['f0_med'])
        choisis = [bons[int(i)] for i in np.linspace(0, len(bons) - 1, 5)] if len(bons) >= 5 else bons
        out.append('   gabarits : ' + ', '.join(f"{r['fichier']}@{c['debut']}s ({c['duree']*1000:.0f} ms, {c['f0_med']:.0f} Hz)" for c, r in choisis))
        gab[bete] = [dict(fichier=r['fichier'], **c, suite=[dict(duree=cc['duree'], f0_med=cc['f0_med'], f0=cc['f0'], env=cc['env'],
                          formants=cc['formants'], debut=cc['debut'], voise=cc['voise'], am=cc['am']) for cc in r['cris']]) for c, r in choisis]
    json.dump(gab, open('_sortie/gabarits.json', 'w'), indent=1)
    open('_sortie/analyse.txt', 'w').write('\n'.join(out) + '\n')
    print('\n'.join(out))
