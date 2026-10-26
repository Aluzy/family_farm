"""Compose les trois thèmes de Family Farm (matin, crépuscule, nuit) + stems synchronisés."""
import numpy as np
from synthlib import *

OUT = '_sortie/pack/public/assets/audio/music'
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def n2m(name):
    m = re.match(r'([A-G])([#b]?)(-?\d)', name)
    l, acc, o = m.groups()
    return 12 * (int(o) + 1) + NOTE[l] + (1 if acc == '#' else -1 if acc == 'b' else 0)


import re

CHORDS = {
    'C': ['C3', 'C4', 'E4', 'G4'], 'Am': ['A2', 'A3', 'C4', 'E4'], 'F': ['F2', 'F3', 'A3', 'C4'],
    'G': ['G2', 'G3', 'B3', 'D4'], 'Em': ['E2', 'E3', 'G3', 'B3'], 'Dm': ['D3', 'D3', 'F3', 'A3'],
    'Bb': ['Bb2', 'Bb3', 'D4', 'F4'], 'Gm': ['G2', 'G3', 'Bb3', 'D4'], 'Fmaj7': ['F2', 'A3', 'C4', 'E4'],
    'Gsus': ['G2', 'G3', 'C4', 'D4'], 'A': ['A2', 'A3', 'C#4', 'E4'], 'Asus': ['A2', 'A3', 'D4', 'E4'], 'Csus2': ['C3', 'C4', 'D4', 'G4'],
}


def parse_mel(bars_txt):
    """'E5 0 1, G5 1 1 | ...' → liste (beat_abs, dur, midi) ; '-' = mesure vide."""
    ev = []
    for bi, bar in enumerate(bars_txt.split('|')):
        bar = bar.strip()
        if bar in ('', '-'):
            continue
        for tok in bar.split(','):
            nm, b, d = tok.split()
            ev.append((bi * 4 + float(b), float(d), n2m(nm)))
    return ev


def render(theme):
    bpm, bars = theme['bpm'], len(theme['chords'])
    spb = 60 / bpm
    N = int(round(bars * 4 * spb * SR))
    stems = {k: np.zeros((2, N)) for k in ('melody', 'harmony', 'texture')}
    at = lambda beat: int(round(beat * spb * SR)) % N

    # --- harmonie : nappe + basse
    for i, ch in enumerate(theme['chords']):
        notes = [n2m(x) for x in CHORDS[ch]]
        for j, m in enumerate(notes[1:]):
            sig = soft_pad(mtof(m + theme.get('pad_oct', 0)), 4 * spb + 0.8, bright=theme['pad_bright'])
            place_circular(stems['harmony'], sig, at(i * 4) - int(0.15 * SR), p=(-0.4, 0.05, 0.4)[j], gain=0.16)
        for b, d, g in theme['bass_pat']:
            m = notes[0] + (7 if g == 5 else 0)
            place_circular(stems['harmony'], bass(mtof(m), d * spb), at(i * 4 + b), p=0, gain=0.42)

    # --- texture : arpège + cloches
    arp = theme.get('arp')
    if arp:
        step, pat, gain, inst = arp
        for i, ch in enumerate(theme['chords']):
            notes = [n2m(x) for x in CHORDS[ch]][1:]
            for k, deg in enumerate(pat):
                if deg is None:
                    continue
                m = notes[deg % 3] + 12 * (deg // 3) + 12
                sig = inst(mtof(m), step * spb * 1.6)
                pp = 0.5 * np.sin(k * 0.9 + i)
                place_circular(stems['texture'], sig, at(i * 4 + k * step), p=pp,
                               gain=gain * (1.0 if k % 2 == 0 else 0.75))
    for beat, d, m in parse_mel(theme.get('bells', '')):
        place_circular(stems['texture'], bell(mtof(m), 3.5), at(beat), p=RNG.uniform(-0.6, 0.6), gain=theme.get('bell_gain', 0.12))

    # --- mélodie
    lead = theme['lead']
    for beat, d, m in parse_mel(theme['melody']):
        place_circular(stems['melody'], lead(mtof(m), d * spb), at(beat), p=0.08, gain=theme['lead_gain'])

    ir = make_ir(decay=theme['rev'], damp=theme['rev_damp'])
    for k in stems:
        stems[k] = reverb_circular(stems[k], ir, wet=theme['wet'][k])
    mix = sum(stems.values())
    # gain commun pour que la somme des stems == le mix
    g = 10 ** (theme['rms_db'] / 20) / (np.sqrt(np.mean(mix ** 2)) + 1e-12)
    pk = np.max(np.abs(mix * g))
    if pk > 0.89:
        g *= 0.89 / pk
    return mix * g, {k: v * g for k, v in stems.items()}, N / SR


THEMES = {
    'morning_theme': dict(
        bpm=84, pad_bright=1600, rev=2.4, rev_damp=6000, rms_db=-19,
        wet={'melody': 0.3, 'harmony': 0.35, 'texture': 0.4},
        chords=['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G', 'Am', 'Gsus'],
        bass_pat=[(0, 2.5, 1), (2.5, 1.5, 5)],
        arp=(0.5, [0, 1, 2, 1, 3, 1, 2, 1], 0.2, lambda f, d: pluck(f, d, bright=2600)),
        lead=flute_lead, lead_gain=0.3, bell_gain=0.25,
        melody='E5 0 1, G5 1 1, A5 2 1.5, G5 3.5 0.5 | E5 0 2, C5 2 1, D5 3 1 | C5 0 1, A4 1 1, C5 2 1.5, D5 3.5 0.5 | D5 0 3 |'
               'E5 0 1, G5 1 1, A5 2 1, C6 3 1 | G5 0 2, E5 2 2 | A5 0 1.5, G5 1.5 0.5, E5 2 1, D5 3 1 | D5 0 1, E5 1 1, D5 2 2 |'
               'A5 0 2, C6 2 1, A5 3 1 | G5 0 3, E5 3 1 | F5 0 1, A5 1 1, C6 2 2 | G5 0 4 |'
               '- | D5 0 1, E5 1 1, G5 2 2 | E5 0 2, D5 2 1, C5 3 1 | D5 0 3',
        bells='C6 0 1 | - | - | - | - | - | - | - | A5 0 1 | - | - | - | F5 0 1, C6 2 1',
    ),
    'evening_theme': dict(
        bpm=72, pad_bright=1200, rev=3.0, rev_damp=4500, rms_db=-20,
        wet={'melody': 0.38, 'harmony': 0.4, 'texture': 0.45},
        chords=['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'Bb', 'F', 'Gm', 'Dm', 'Bb', 'C', 'Dm', 'Dm'],
        bass_pat=[(0, 3.5, 1)],
        arp=(1.0, [0, 2, 1, 2], 0.3, kalimba),
        lead=lambda f, d: pluck(f, d, bright=1800, pulse=0.42), lead_gain=0.55, bell_gain=0.3,
        melody='A4 0 1, D5 1 1, F5 2 2 | F5 0 1, E5 1 0.5, D5 1.5 0.5, D5 2 2 | C5 0 1, A4 1 1, C5 2 1, F5 3 1 | E5 0 3 |'
               'A4 0 1, D5 1 1, F5 2 1, A5 3 1 | G5 0 2, F5 2 2 | D5 0 1, F5 1 1, G5 2 1, Bb5 3 1 | G5 0 3 |'
               'F5 0 2, D5 2 2 | C5 0 1, F5 1 1, A5 2 2 | G5 0 1.5, F5 1.5 0.5, D5 2 2 | D5 0 4 |'
               '- | E5 0 1, F5 1 1, G5 2 2 | A5 0 2, F5 2 1, E5 3 1 | D5 0 3',
        bells='D6 0 1 | - | - | - | - | - | - | - | F5 0 1 | - | - | - | - | - | A5 0 1',
    ),
    'night_theme': dict(
        bpm=60, pad_bright=800, pad_oct=0, rev=4.2, rev_damp=3500, rms_db=-22,
        wet={'melody': 0.5, 'harmony': 0.45, 'texture': 0.5},
        chords=['Am', 'Fmaj7', 'C', 'G', 'Am', 'Fmaj7', 'Em', 'Em', 'F', 'C', 'Dm', 'Em'],
        bass_pat=[(0, 4, 1)],
        arp=None,
        lead=lambda f, d: bell(f, max(d, 2.5), ratio=2.0, idx=1.2), lead_gain=0.5, bell_gain=0.6,
        melody='E5 0 2, A5 2 2 | G5 0 1, E5 1 3 | - | D5 0 2, B4 2 2 |'
               'C5 0 1, E5 1 1, A5 2 2 | C6 0 2, A5 2 2 | B5 0 2, G5 2 2 | E5 0 4 |'
               'F5 0 2, A5 2 2 | G5 0 4 | F5 0 1, E5 1 1, D5 2 2 | B4 0 4',
        bells='A3 0 1 | - | - | - | - | - | - | - | - | E4 0 1',
    ),
}

THEMES['mine_theme'] = dict(
    bpm=56, pad_bright=650, rev=4.8, rev_damp=3000, rms_db=-23,
    wet={'melody': 0.55, 'harmony': 0.5, 'texture': 0.55},
    chords=['Dm', 'Bb', 'Gm', 'Asus', 'Dm', 'Bb', 'Gm', 'A'],
    bass_pat=[(0, 4, 1)],
    arp=(2.0, [0, 2], 0.18, kalimba),
    lead=lambda f, d: bell(f, max(d, 3.0), ratio=1.41, idx=0.9), lead_gain=0.4, bell_gain=0.3,
    melody='D5 0 3 | - | Bb4 0 1, D5 1 1, F5 2 2 | E5 0 4 | A4 0 2, D5 2 2 | F5 0 3 | G5 0 1, F5 1 1, D5 2 2 | C#5 0 4',
    bells='D3 0 1 | - | - | - | A2 0 1',
)

if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    info = {}
    for name, th in THEMES.items():
        if only and name not in only:
            continue
        mix, stems, dur = render(th)
        write_ogg(f'{OUT}/{name}.ogg', mix)
        for k, v in stems.items():
            write_ogg(f'{OUT}/stems/{name}_{k}.ogg', v)
        info[name] = (th['bpm'], len(th['chords']), round(dur, 3))
        print(name, info[name], 'peak', round(float(np.max(np.abs(mix))), 3))
