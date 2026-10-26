"""Family Farm — les bêtes, version « d'après nature » : cinq propositions réalistes par bête.

1. extraire (si on lui donne le dossier ESC-50) : pour 5 cris de référence par bête (choisis par
   analyse.py), les contours fins mesurés toutes les 10 ms — hauteur (YIN), volume, part voisée,
   formants (LPC) — dans gabarits_betes.json (des mesures, aucun son n'est recopié) ;
2. synthétiser : notre voix (source glottique + formants) suit ces contours, puis son timbre
   est calibré pour retrouver le centre de gravité spectral mesuré sur le vrai cri ;
3. le cheval, absent du corpus : d'après les mesures publiées de 267 hennissements
   (Briefer et al. 2015, Scientific Reports 5:9989) — deux fondamentales indépendantes, F0 ≈ 400 Hz
   et G0 ≈ 1 540 Hz (≈ 4,4 × F0), en trois parties : introduction tonale aiguë (G0 seule),
   apogée modulée (F0 et G0 ensemble, ~80 % du cri), fin en train d'impulsions graves ;
4. les sabots : cinq chevaux (ferré sur pavés, pieds nus sur terre, prairie, cheval de trait,
   poney), au pas (4 temps) et au trot (2 temps).

Usage : python3 betes_reelles.py [--extraire <dossier ESC-50>] [sortie]  (défaut _sortie/reelles)
"""
import json, os, sys, wave
import numpy as np
from scipy import signal
from synthlib import SR, lowpass, highpass, bandpass, resonator, make_ir, fade_edges
from animaux import source_glottique, formants, plein_air, pic, bruit_lent, courbe

ICI = os.path.dirname(os.path.abspath(__file__))
GAB = os.path.join(ICI, '_sortie', 'gabarits_betes.json')   # mesures tirées d'ESC-50 (CC BY-NC) : jamais commitées
HOP = 441   # 10 ms

# ce que analyse.py a mesuré sur les 160 enregistrements (médianes), pour les valeurs manquantes
MESURES = {
    'hen': dict(F=(955, 2291, 3806), bw=(220, 300, 420), centre=2450),
    'rooster': dict(F=(880, 1679, 2966), bw=(200, 260, 380), centre=2330),
    'cow': dict(F=(496, 1368, 2230), bw=(110, 160, 260), centre=1267),
    'sheep': dict(F=(676, 1804, 2446), bw=(120, 180, 260), centre=2379),
}
NOMS = {'hen': 'poule', 'rooster': 'coq', 'cow': 'vache', 'sheep': 'mouton'}


# ===================================================================== 1. extraction

def extraire(base):
    from analyse import lit, yin, formants_lpc, BETES
    gab = json.load(open(os.path.join(ICI, '_sortie', 'gabarits.json')))
    out = {}
    for bete, refs in gab.items():
        fmin, fmax = BETES[bete]
        out[bete] = []
        for ref in refs:
            x = lit(os.path.join(base, 'audio', ref['fichier']))
            x = x / (np.max(np.abs(x)) + 1e-12)
            x = signal.sosfilt(signal.butter(4, 60 / (SR / 2), 'high', output='sos'), x)
            cris = []
            for c in ref['suite'][:12]:
                a = int(c['debut'] * SR); b = a + int(c['duree'] * SR)
                seg = x[max(0, a - 1024):b + 1024]
                f0, cl = yin(seg, fmin, fmax)
                n = len(f0)
                amp = np.array([np.sqrt(np.mean(seg[i:i + 2048] ** 2) + 1e-12) for i in range(0, n * HOP, HOP)])[:n]
                # octave : on ramène les sauts brusques vers la médiane voisée
                v = f0 > 0
                if v.sum() > 3:
                    med = np.median(f0[v])
                    for k in np.where(v)[0]:
                        while f0[k] > med * 1.8: f0[k] /= 2
                        while f0[k] < med / 1.8: f0[k] *= 2
                    f0[v] = signal.medfilt(f0[v], 5) if v.sum() >= 5 else f0[v]
                # formants toutes les 40 ms, lissés
                F = []
                for k in range(0, n, 4):
                    ext = seg[k * HOP:k * HOP + 2048]
                    f = formants_lpc(ext, 11025 if bete in ('cow', 'sheep') else 22050, 12 if bete in ('cow', 'sheep') else 18) if len(ext) == 2048 and f0[k] > 0 else []
                    F.append(f[:3] if len(f) >= 3 else [0, 0, 0])
                env = enveloppes(seg, f0, n)
                cris.append(dict(debut=round(c['debut'] - ref['suite'][0]['debut'], 3), env=env,
                                 f0=[round(float(t), 1) for t in f0], amp=amp,
                                 clarte=[round(float(t), 2) for t in cl], formants=F))
            # le volume, relatif au cri le plus fort de l'enregistrement (un bruit du fond reste faible)
            haut = max(float(np.max(c['amp'])) for c in cris) + 1e-12
            for c in cris:
                c['amp'] = [round(float(t) / haut, 4) for t in c['amp']]
            cris = [c for c in cris if max(c['amp']) > 0.12]
            spec = np.abs(np.fft.rfft(x[int(ref['debut'] * SR):int((ref['debut'] + ref['duree']) * SR)]))
            fr = np.fft.rfftfreq(int(ref['duree'] * SR), 1 / SR)[:len(spec)]
            out[bete].append(dict(source=ref['fichier'], f0_med=ref['f0_med'], duree=ref['duree'],
                                  centre=round(float(np.sum(fr * spec) / (np.sum(spec) + 1e-9))), cris=cris))
    json.dump(out, open(GAB, 'w'), separators=(',', ':'))
    print('gabarits :', {k: len(v) for k, v in out.items()})


GRILLE = np.geomspace(120, 10000, 32)   # les fréquences où l'enveloppe est notée


def enveloppes(seg, f0, n_tr, pas=2):
    """L'enveloppe spectrale toutes les 20 ms, en dB (entiers, -60..0), sur GRILLE.

    Trame voisée : l'amplitude de chaque harmonique k·f0 (le pic le plus proche), interpolée
    sur une échelle logarithmique ; trame non voisée : l'énergie lissée par bandes."""
    out = []
    fr = np.fft.rfftfreq(4096, 1 / SR)
    for k in range(0, n_tr, pas):
        ext = seg[k * HOP:k * HOP + 2048]
        if len(ext) < 2048:
            ext = np.pad(ext, (0, 2048 - len(ext)))
        X = np.abs(np.fft.rfft(ext * np.hanning(2048), 4096)) + 1e-9
        if f0[k] > 0:
            pts_f, pts_a = [], []
            h = 1
            while h * f0[k] < 11000:
                c = h * f0[k]; z = (fr > c - 0.3 * f0[k]) & (fr < c + 0.3 * f0[k])
                if z.any():
                    j = np.argmax(X[z]); pts_f.append(fr[z][j]); pts_a.append(20 * np.log10(X[z][j]))
                h += 1
            if len(pts_f) >= 2:
                e = np.interp(np.log(GRILLE), np.log(pts_f), pts_a, left=pts_a[0] - 12, right=pts_a[-1] - 12)
            else:
                e = np.full(len(GRILLE), -120.0)
        else:
            lis = np.convolve(20 * np.log10(X), np.ones(25) / 25, 'same')
            e = np.interp(GRILLE, fr, lis)
        out.append(e)
    E = np.array(out)
    E = E - E.max()                                   # relatif : le volume est noté à part (amp)
    return np.clip(np.round(E), -60, 0).astype(int).tolist()


# ===================================================================== 2. synthèse d'un cri mesuré

def harmoniques_bruit(cri, rng, regl):
    """Modèle harmoniques + bruit : la hauteur, le volume, la part voisée et l'enveloppe mesurés."""
    f0 = np.array(cri['f0'], float); amp = np.array(cri['amp'], float); cl = np.array(cri['clarte'], float)
    E = np.array(cri['env'], float)                    # trames de 20 ms × GRILLE
    n_tr = len(f0); v = f0 > 0
    if v.sum() < 2 or not len(E):
        return None
    idx = np.arange(n_tr)
    f0i = lisse(np.interp(idx, idx[v], f0[v]), 3) * regl.get('transpose', 1.0)
    vp = lisse(np.clip((cl - 0.45) / 0.4, 0, 1) * v, 5)
    n = n_tr * HOP
    t_tr = np.arange(n_tr) * HOP + HOP / 2
    ts = np.arange(n)
    up = lambda a: np.interp(ts, t_tr, a)
    f = up(f0i)
    f = f * (1 + regl.get('jitter', 0.008) * bruit_lent(n, 40, rng))       # la voix n'est jamais parfaitement stable
    # l'enveloppe par trame de 10 ms (de 20 ms, interpolée), adoucie dans le temps
    Et = np.array([np.interp(i / 2, np.arange(len(E)), E[:, j]) for i in range(n_tr) for j in range(len(GRILLE))]).reshape(n_tr, len(GRILLE))
    Et = np.apply_along_axis(lambda c: lisse(c, 3), 0, Et)
    phase = 2 * np.pi * np.cumsum(f) / SR
    y = np.zeros(n)
    K = int(min(11000 / max(40, f0i.min()), 120))
    lg = np.log(GRILLE)
    for k in range(1, K + 1):
        fk = f0i * k
        if fk.min() > 11500:
            break
        a_db = np.array([np.interp(np.log(max(fk[i], 1)), lg, Et[i]) for i in range(n_tr)])
        a_db[fk > 11000] = -120
        a = up(10 ** (a_db / 20))
        y += a * np.sin(k * phase + rng.uniform(0, 2 * np.pi))
        if regl.get('rugosite', 0) and k < K:   # sous-harmoniques : la voix éraillée
            y += a * regl['rugosite'] * 0.25 * np.sin((k + 0.5) * phase) * (0.5 + 0.5 * bruit_lent(n, 6, rng))
    y *= (0.2 + 0.8 * up(vp)) * (1 + regl.get('shimmer', 0.06) * bruit_lent(n, 25, rng))
    # le souffle : du bruit mis en forme par la même enveloppe (plus fort quand c'est peu voisé)
    nb = rng.standard_normal(n + 4096)
    fS, tS, Z = signal.stft(nb, SR, nperseg=1024, noverlap=768)
    tz = np.clip((tS * SR).astype(int), 0, n - 1)
    tr = np.clip((tz / HOP).astype(int), 0, n_tr - 1)
    lf = np.log(np.maximum(fS, 1))
    M = np.array([10 ** (np.interp(lf, lg, Et[i], left=Et[i][0], right=-60) / 20) for i in tr]).T
    M *= (regl.get('souffle', 0.2) * (0.25 + 0.75 * (1 - vp[tr])))[None, :]
    _, nz = signal.istft(Z * M, SR, nperseg=1024, noverlap=768)
    y += nz[:n] * 0.5
    return y * up(lisse(amp, 3))




def lisse(v, k=5):
    v = np.asarray(v, float)
    if len(v) < k:
        return v
    return np.convolve(np.pad(v, k // 2, mode='edge'), np.ones(k) / k, 'valid')


def piste_formants(F, n_trames, defaut):
    """Formants (une mesure toutes les 4 trames) → 3 pistes par trame, trous comblés, lissées."""
    F = np.array(F, float) if len(F) else np.zeros((1, 3))
    pistes = []
    for j in range(3):
        col = F[:, j]
        ok = (col > 100) & (np.abs(col - defaut[j]) < defaut[j] * 0.75)
        if ok.sum() >= 2:
            idx = np.arange(len(col))
            bons = signal.medfilt(col[ok], 5) if ok.sum() >= 5 else col[ok]   # les mesures aberrantes s'effacent
            col = np.interp(idx, idx[ok], bons)
        else:
            col = np.full(len(col), defaut[j])
        col = 0.85 * col + 0.15 * defaut[j]        # mesure LPC un peu bruitée : légèrement tirée vers la médiane
        col = np.repeat(col, 4)[:n_trames]
        if len(col) < n_trames:
            col = np.pad(col, (0, n_trames - len(col)), mode='edge')
        pistes.append(lisse(col, 15))
    return pistes


def voix_mesuree(cri, bete, rng, regl):
    f0 = np.array(cri['f0'], float); amp = np.array(cri['amp'], float); cl = np.array(cri['clarte'], float)
    n_tr = len(f0)
    v = f0 > 0
    if v.sum() < 2:
        return None
    idx = np.arange(n_tr)
    f0i = np.interp(idx, idx[v], f0[v])                       # hauteur continue
    voix_part = lisse(np.clip((cl - 0.45) / 0.4, 0, 1) * v, 5)  # 0 : souffle seul, 1 : voisé
    m = MESURES[bete]
    Fp = piste_formants(cri['formants'], n_tr, m['F'])
    # trames → échantillons
    n = n_tr * HOP
    t_tr = np.arange(n_tr) * HOP + HOP / 2
    t_s = np.arange(n)
    up = lambda a: np.interp(t_s, t_tr, a)
    f = up(lisse(f0i, 3)) * regl.get('transpose', 1.0)
    src = source_glottique(f, rng, ouvert=regl.get('ouvert', 0.55), ferme=regl.get('ferme', 0.18),
                           jitter=regl.get('jitter', 0.008), shimmer=regl.get('shimmer', 0.06),
                           souffle=0.0, rugosite=regl.get('rugosite', 0.0))
    vp = up(voix_part)
    bruit = rng.standard_normal(n) * regl.get('souffle', 0.25)
    exc = src * (0.15 + 0.85 * vp) + bruit * (1.0 - 0.7 * vp)
    poids = regl.get('poids', (1.0, 0.65, 0.35))
    pistes = [(up(Fp[j]) * regl.get('formants', 1.0), np.full(n, m['bw'][j] * regl.get('bw', 1.0)), poids[j]) for j in range(3)]
    y = formants(exc, pistes)
    y += exc * regl.get('direct', 0.05)               # un peu de source brute (les aigus du coq)
    e = up(lisse(amp, 3)) ** regl.get('expo', 1.0)
    return y * e


def calibre(y, centre_vise):
    """Penche le spectre (passe-haut ou passe-bas doux) pour retrouver le centre spectral mesuré."""
    def centre(z):
        s = np.abs(np.fft.rfft(z)); f = np.fft.rfftfreq(len(z), 1 / SR)
        return np.sum(f * s) / (np.sum(s) + 1e-9)
    c = centre(y)
    for _ in range(4):
        if abs(c - centre_vise) / centre_vise < 0.08:
            break
        if c < centre_vise:
            y = y + (highpass(y, min(6000, centre_vise)) * min(2.0, centre_vise / c - 1) * 1.5)
        else:
            y = lowpass(y, max(800, centre_vise * 1.6))
        c = centre(y)
    return y, round(c)


REGLAGES = {   # le caractère de chaque espèce (au-delà de ce que les contours disent)
    'hen': dict(ouvert=0.5, ferme=0.12, jitter=0.012, shimmer=0.12, rugosite=0.05, souffle=0.3, bw=1.0, direct=0.04, poids=(1.0, 0.8, 0.5)),
    'rooster': dict(ouvert=0.42, ferme=0.08, jitter=0.01, shimmer=0.1, rugosite=0.2, souffle=0.25, bw=1.2, direct=0.12),
    'cow': dict(ouvert=0.62, ferme=0.25, jitter=0.008, shimmer=0.06, rugosite=0.12, souffle=0.12, bw=1.0, direct=0.02, poids=(1.0, 0.9, 0.45)),
    'sheep': dict(ouvert=0.5, ferme=0.14, jitter=0.012, shimmer=0.18, rugosite=0.25, souffle=0.22, bw=1.0, direct=0.04, poids=(1.0, 1.1, 0.9)),
}


def cri_complet(g, bete, seed):
    rng = np.random.default_rng(seed)
    regl = REGLAGES[bete]
    morceaux = []
    for c in g['cris']:
        if np.mean(np.array(c['f0']) > 0) < 0.3:
            continue   # un bruit du fond, pas un cri
        y = harmoniques_bruit(c, rng, regl) if 'env' in c else voix_mesuree(c, bete, rng, regl)
        if y is not None:
            morceaux.append((c['debut'], y))
    if not morceaux:
        return None, 0
    t0 = min(d for d, _ in morceaux)
    morceaux = [(d - t0, y) for d, y in morceaux]
    fin = max(int(d * SR) + len(y) for d, y in morceaux)
    out = np.zeros(fin + int(0.05 * SR))
    for d, y in morceaux:
        s = int(d * SR); out[s:s + len(y)] += y
    out = highpass(out, 70 if bete == 'cow' else 120)
    out, c = calibre(out, g['centre'])
    return out, c


# ===================================================================== 3. le cheval (mesures publiées)

CHEVAUX = [   # F0 et G0 au cœur de l'apogée (Hz), durée (s), part de l'introduction, caractère
    dict(nom='Appel au loin', F0=430, G0=1750, duree=1.6, intro=0.18, fm=0.12, am=0.5, fin=0.22, note="séparation : long, G0 haute, très modulé"),
    dict(nom='Content, au pré', F0=360, G0=1350, duree=0.9, intro=0.12, fm=0.07, am=0.8, fin=0.25, note='valence positive : plus court, G0 plus basse, plus de variation d\'amplitude'),
    dict(nom='Excité', F0=520, G0=1950, duree=1.3, intro=0.15, fm=0.15, am=0.4, fin=0.15, note='forte excitation : F0 de départ et aigus plus hauts'),
    dict(nom='Cheval de trait', F0=300, G0=1200, duree=1.4, intro=0.14, fm=0.1, am=0.6, fin=0.3, note='grand corps : tout plus grave, formants plus bas'),
    dict(nom='Poulain', F0=560, G0=2300, duree=1.0, intro=0.2, fm=0.13, am=0.6, fin=0.12, note='jeune : plus aigu, fin courte'),
]


def hennissement(h, seed):
    rng = np.random.default_rng(seed); n = int(h['duree'] * SR); t = np.arange(n) / SR
    k = np.linspace(0, 1, n)
    i0 = h['intro']; fin0 = 1 - h['fin']
    # G0 : dès le début, tonal et aigu, qui retombe pendant l'apogée (corrélée à F0)
    g0 = h['G0'] * courbe([(0, 1.12), (i0, 1.05), (0.5, 1.0), (fin0, 0.8), (1, 0.7)], n)
    # F0 : commence à l'apogée, modulée en fréquence (~10 Hz) puis s'éteint dans la fin
    vib = np.sin(2 * np.pi * np.cumsum(courbe([(0, 9), (1, 12)], n)) / SR)
    f0 = h['F0'] * courbe([(0, 1.1), (i0, 1.1), (0.5, 1.0), (fin0, 0.75), (1, 0.45)], n) * (1 + h['fm'] * vib)
    gs = g0 * (1 + 0.6 * h['fm'] * vib)
    sG = np.sin(2 * np.pi * np.cumsum(gs) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(gs) / SR)   # sifflement presque pur
    sF = source_glottique(f0, rng, ouvert=0.5, ferme=0.14, jitter=0.02, shimmer=0.15, souffle=0.0, rugosite=0.4)
    eG = courbe([(0, 0), (0.03, 1), (i0, 1), (fin0, 0.6), (min(1, fin0 + 0.08), 0), (1, 0)], n)
    eF = courbe([(0, 0), (i0 * 0.9, 0), (i0 + 0.05, 1), (fin0, 0.9), (1, 0.3)], n)
    am = 1 - h['am'] * 0.5 * (1 + np.sin(2 * np.pi * np.cumsum(courbe([(0, 7), (1, 11)], n)) / SR)) * (k > i0)
    corps = 1.0 if h['F0'] > 320 else 0.8   # un grand cheval : formants plus bas
    F = [(np.full(n, 900 * corps), np.full(n, 220), 1.0), (np.full(n, 1700 * corps), np.full(n, 300), 0.7), (np.full(n, 2900 * corps), np.full(n, 450), 0.4)]
    yF = formants(sF + 0.15 * rng.standard_normal(n), F)
    yG = formants(sG, F) * 0.6 + sG * 0.12
    y = (yF * eF + yG * eG) * am * courbe([(0, 0), (0.04, 1), (0.9, 1), (1, 0)], n)
    # la fin : un train d'impulsions graves (le « hu-hu-hu » qui retombe)
    nf = int(h['fin'] * 1.4 * SR) ; tf = np.arange(nf) / SR
    pf = courbe([(0, 14), (1, 8)], nf)
    puls = np.clip(np.sin(2 * np.pi * np.cumsum(pf) / SR), 0, 1) ** 3
    sf = source_glottique(np.full(nf, h['F0'] * 0.35), rng, jitter=0.03, shimmer=0.2, rugosite=0.5)
    yf = formants(sf + 0.3 * rng.standard_normal(nf), [(np.full(nf, 450 * corps), np.full(nf, 180), 1), (np.full(nf, 1100 * corps), np.full(nf, 260), 0.5)]) * puls * np.linspace(1, 0, nf) ** 1.2
    deb = int(n * fin0)
    out = np.zeros(max(n, deb + nf)); out[:n] += y; out[deb:deb + nf] += yf * 0.6
    return plein_air(highpass(out, 150), 0.16, seed, 1.1)


# ===================================================================== 4. les sabots

SABOTS = [
    dict(nom='Ferré sur pavés', sol='pierre', fer=True, masse=1.0, note='le fer qui claque et sonne sur la pierre'),
    dict(nom='Pieds nus sur terre battue', sol='terre', fer=False, masse=1.0, note='un « clop » sourd et creux'),
    dict(nom='Dans la prairie', sol='herbe', fer=False, masse=0.9, note='étouffé, l\'herbe qui froisse'),
    dict(nom='Cheval de trait', sol='terre', fer=True, masse=1.6, note='lourd, plus grave, plus lent'),
    dict(nom='Poney', sol='terre', fer=False, masse=0.6, note='léger, vif, plus aigu'),
]


def impact(s, rng, fort=1.0):
    n = int(0.22 * SR); t = np.arange(n) / SR; M = s['masse']
    exc = rng.standard_normal(n) * np.exp(-t / (0.0012 * M ** 0.5))
    corne = resonator(exc, rng.uniform(480, 600) / M ** 0.4, 6) * 0.9 + resonator(exc, rng.uniform(1100, 1300) / M ** 0.3, 9) * 0.45
    sol = s['sol']
    if sol == 'pierre':
        y = corne * 0.6 + highpass(rng.standard_normal(n), 2500) * np.exp(-t / 0.004) * 0.5
    elif sol == 'herbe':
        y = lowpass(corne, 1200) * 0.5 + bandpass(rng.standard_normal(n) * (rng.random(n) < 0.06), 2000, 7000) * np.exp(-t / 0.05) * 1.2
    else:
        y = corne * 0.85 + bandpass(rng.standard_normal(n) * (rng.random(n) < 0.08), 700, 3500) * np.exp(-t / 0.035) * 0.6
    y += lowpass(rng.standard_normal(n), 180 / M ** 0.3) * np.exp(-t / (0.02 * M)) * 1.3 * M   # le poids dans le sol
    if s['fer']:   # le fer : des partiels inharmoniques qui sonnent un instant
        f = rng.uniform(2900, 3300) / M ** 0.2
        y += sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t / (0.04 / r)) * g for r, g in ((1, 1), (1.62, 0.6), (2.41, 0.35))) * (0.3 if sol == 'pierre' else 0.12)
    return y * fort


def sabots(s, allure, seed, cycles=3):
    rng = np.random.default_rng(seed)
    if allure == 'pas':   # 4 temps égaux ; une foulée de ~1,15 s (plus lente si lourd)
        cyc = 1.1 * s['masse'] ** 0.25; temps = [0, 0.25, 0.5, 0.75]
    else:                 # trot : 2 temps, diagonales presque ensemble ; ~0,7 s
        cyc = 0.68 * s['masse'] ** 0.2; temps = [0, 0.03, 0.5, 0.53]
    n = int((cyc * cycles + 0.3) * SR); y = np.zeros(n)
    for c in range(cycles):
        for k, tk in enumerate(temps):
            h = impact(s, rng, rng.uniform(0.75, 1.0) * (1 if k % 2 == 0 else 0.8))
            st = max(0, int((c * cyc + tk * cyc + rng.uniform(-0.01, 0.01)) * SR))
            y[st:st + len(h)] += h[: n - st]
    y += lowpass(rng.standard_normal(n), 250) * 0.006   # le souffle, le harnais
    return plein_air(y, 0.07, seed)


# ===================================================================== sortie

def sauve(dossier, nom, y, info, infos):
    y = np.asarray(y)
    if y.ndim == 1:
        y = np.stack([y, y])
    y = fade_edges(pic(y, -1.0), 0.003, 0.03)
    os.makedirs(dossier, exist_ok=True)
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(f'{dossier}/{nom}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    infos[nom] = info


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--extraire']:
        extraire(args[1]); args = args[2:]
    OUT = args[0] if args else os.path.join(ICI, '_sortie', 'reelles')
    gab = json.load(open(GAB))
    infos = {}
    for bete, refs in gab.items():
        for i, g in enumerate(refs):
            y, c = cri_complet(g, bete, 900 + i)
            if y is None:
                continue
            if bete != 'cow':
                y = plein_air(y, 0.12 if bete != 'rooster' else 0.22, 40 + i, 1.0 if bete != 'rooster' else 1.5)
            else:
                y = plein_air(y, 0.12, 40 + i)
            sauve(OUT, f'{NOMS[bete]}_{i+1}', y, dict(bete=NOMS[bete], f0=g['f0_med'], duree=g['duree'], centre_vrai=g['centre'], centre=c, source=g['source']), infos)
    for i, h in enumerate(CHEVAUX):
        sauve(OUT, f'cheval_{i+1}', hennissement(h, 950 + i), dict(bete='cheval', nom=h['nom'], note=h['note'], F0=h['F0'], G0=h['G0'], duree=h['duree']), infos)
    for i, s in enumerate(SABOTS):
        for allure in ('pas', 'trot'):
            sauve(OUT, f'sabots_{i+1}_{allure}', sabots(s, allure, 970 + i), dict(bete='sabots', nom=s['nom'], note=s['note'], allure=allure), infos)
    # les fonds des enclos, sans cris : paille et roucoulements, souffle et mastication, pas et sonnailles
    import animaux as A
    po = A.fond_poulailler()
    sauve(OUT, 'fond_poulailler', A.boucle(po), dict(bete='fond'), infos)
    sauve(OUT, 'fond_etable_cloche', A.boucle(A.fond_etable()), dict(bete='fond'), infos)
    sauve(OUT, 'fond_etable', A.boucle(A.fond_etable(cloche=False)), dict(bete='fond'), infos)
    sauve(OUT, 'fond_bergerie_sonnailles', A.boucle(A.fond_bergerie()), dict(bete='fond'), infos)
    sauve(OUT, 'fond_bergerie', A.boucle(A.fond_bergerie(sonnailles=False)), dict(bete='fond'), infos)
    json.dump(infos, open(f'{OUT}/info.json', 'w'), ensure_ascii=False, indent=1)
    print(len(infos), 'sons')
