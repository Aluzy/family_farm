#!/usr/bin/env python3
"""La planche des cultures de la carte (assets/crops.png), faite des dessins à la main de
scripts/carte/sources/cultures.png.

La source garde la disposition où les cultures ont été dessinées (SOURCE : la rangée du bas de chaque culture, la hauteur
de ses cases, ses colonnes ; des cases de 16 px). Les dessins n'y tiennent pas dans leurs cases : la butte de terre de
chacun descend de quelques px sous la sienne, les grandes plantes (le blé, le houblon, la tomate, le tournesol) montent
au-dessus, une feuille déborde parfois sur le côté. Ce script prend chaque dessin en entier (dessin()) et le range dans
une planche régulière :

  - une rangée par culture (dans l'ordre de data/crops.json), une case de L × H px par phase (la graine d'abord, la
    plante mûre en dernier) ;
  - chaque dessin posé le bas de sa butte au bas de sa case, sa tige (le milieu de ses trois rangées du bas) au milieu :
    sur la carte, toutes les cultures ont le pied à la même place (js/carte/ferme/config.js CULTURE_MONTE) ;
  - data/crops.json : le sprite de chaque culture réécrit ({ r: sa rangée, c: ses colonnes, l: L, h: H }).

Retoucher un dessin : dans la source, puis relancer ce script.

    python3 scripts/carte/planche_cultures.py            réécrit assets/crops.png et les sprites de data/crops.json
    python3 scripts/carte/planche_cultures.py --apercu   écrit aussi apercu_cultures.png (agrandie, sur la terre)
"""
import json
import os
import re
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from pixel import ASSETS, ROOT, apercu  # noqa: E402

SRC = os.path.join(HERE, 'sources', 'cultures.png')
SHEET = os.path.join(ASSETS, 'crops.png')
DONNEES = os.path.join(ROOT, 'data', 'crops.json')
T = 16
L, H = 24, 40                  # une case de la planche

# la disposition de la source : culture → (rangée du bas, hauteur de ses cases, colonnes de ses phases)
SOURCE = {
    'carotte': (23, 32, [0, 1, 2, 3]),
    'patate': (23, 32, [5, 6, 7, 8]),
    'tomate': (27, 32, [10, 11, 12, 13]),
    'courgette': (11, 16, [0, 1, 2, 3]),
    'aubergine': (19, 32, [0, 1, 2, 3, 4]),
    'poivron': (19, 32, [5, 6, 7, 8, 9]),
    'oignon': (29, 32, [0, 1, 2, 3]),
    'ail': (19, 32, [10, 11, 12, 13, 14]),
    'epinard': (23, 32, [10, 11, 12, 13]),
    'fraise': (25, 32, [0, 1, 2, 3]),
    'ble': (25, 32, [5, 6, 7, 8]),
    'tournesol': (27, 32, [0, 1, 2, 3]),
    'riz': (25, 32, [10, 11, 12, 13]),
    'houblon': (27, 32, [5, 6, 7, 8]),
    'cacao': (21, 32, [0, 1, 2, 3, 4]),
    'vanille': (21, 32, [10, 11, 12, 13, 14]),
    'cafe': (21, 32, [5, 6, 7, 8, 9]),
}
HAUT = 5        # les rangées du haut d'une case, où tombent les buttes des dessins du dessus
BUTTE = 5       # ce que la butte d'un dessin descend au plus sous sa case
DESSUS = 20     # ce qu'une grande plante monte au plus au-dessus de sa case
COTE = 3        # ce qu'une feuille déborde au plus sur le côté


def dessins(src):
    """{ (culture, phase): {(x, y)} } : les pixels de chaque dessin de la source."""
    px = src.load()
    W, Hs = src.size
    cases = [(k, ph, col, r, h) for k, (r, h, cols) in SOURCE.items() for ph, col in enumerate(cols)]
    rect = {(k, ph): (col * T, (r + 1) * T - h, col * T + T, (r + 1) * T) for k, ph, col, r, h in cases}
    bas = {key: rc[3] for key, rc in rect.items()}

    def flood(depart, permis):
        vu = set(depart)
        pile = list(depart)
        while pile:
            x, y = pile.pop()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q not in vu and 0 <= q[0] < W and 0 <= q[1] < Hs and px[q][3] and permis(*q):
                        vu.add(q)
                        pile.append(q)
        return vu

    # 1. chaque case : ce qui est relié à son cœur (sa case sans ses HAUT rangées du haut), dans sa colonne, jusqu'à
    #    BUTTE px sous elle (sa butte)
    A = {}
    for key, (x0, y0, x1, y1) in rect.items():
        haut = HAUT if y1 - y0 > T else 2
        coeur = [(x, y) for y in range(y0 + haut, y1) for x in range(x0, x1) if px[x, y][3]]
        A[key] = flood(coeur, lambda x, y, x0=x0, x1=x1, y0=y0, y1=y1: x0 <= x < x1 and y0 <= y < y1 + BUTTE)
    pris = {}
    for key, s in A.items():
        for p in s:
            pris.setdefault(p, set()).add(key)
    # 2. ce qui déborde (DESSUS px au-dessus, COTE px sur les côtés), relié à lui et qu'aucune autre case n'a pris
    D = {}
    for key, (x0, y0, x1, y1) in rect.items():
        def permis(x, y, key=key, x0=x0, x1=x1, y0=y0, y1=y1):
            return x0 - COTE <= x < x1 + COTE and y0 - DESSUS <= y < y1 + BUTTE and not any(o != key for o in pris.get((x, y), ()))
        D[key] = flood(A[key], permis)
    qui = {}
    for key, s in D.items():
        for p in s:
            qui.setdefault(p, []).append(key)
    # 3. un pixel de sa case que personne n'a pris (des grains détachés : les épis du blé) : au dessin qu'il touche,
    #    sinon à sa case
    for key, (x0, y0, x1, y1) in rect.items():
        for y in range(y0, y1):
            for x in range(x0, x1):
                if px[x, y][3] and (x, y) not in qui:
                    voisin = next((k for dx in (-1, 0, 1) for dy in (-1, 0, 1) for k in qui.get((x + dx, y + dy), ())), None)
                    cle = voisin or key
                    D[cle].add((x, y))
                    qui[(x, y)] = [cle]
    # 4. un pixel pris par deux dessins : au dessin du dessus s'il est dans ses BUTTE rangées sous sa case, sinon à
    #    celui du dessous
    for p, v in qui.items():
        if len(v) < 2:
            continue
        v = sorted(v, key=lambda k: bas[k])
        gagnant = v[0] if 0 <= p[1] - bas[v[0]] < BUTTE else v[-1]
        for k in v:
            if k != gagnant:
                D[k].discard(p)

    def case_de(p, sauf):
        return next((k for k, (x0, y0, x1, y1) in rect.items() if k != sauf and x0 <= p[0] < x1 and y0 <= p[1] < y1), None)

    # 5. sous un dessin, un morceau qui descend sans interruption dans la case du dessous (le haut d'un tuteur, d'une
    #    tige, et ce qui ne touche qu'elle) est au dessin du dessous ; une butte de terre reste au dessin du dessus
    for U in list(D):
        b = bas[U]
        sous = {p for p in D[U] if p[1] >= b}
        vus = set()
        for p0 in sous:
            if p0 in vus:
                continue
            comp = flood([p0], lambda x, y, sous=sous: (x, y) in sous) & sous
            vus |= comp

            def descend(p, b=b):
                x, y = p
                while y < b + BUTTE:
                    if not px[x, y][3]:
                        return False
                    y += 1
                return True
            tige = {p for p in comp if descend(p)}
            Lc = case_de(p0, U) if tige else None
            if not Lc:
                continue
            reste = comp - tige
            colle = {p for p in reste if any((p[0] + dx, p[1] + dy) in tige for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                     and not any((p[0] + dx, p[1] + dy) in reste for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
            D[U] -= tige | colle
            D[Lc] |= tige | colle
    # 6. au bord d'une case : un pixel séparé de son dessin par du vide (vers l'intérieur) mais collé au dessin d'à
    #    côté est à ce dernier (une feuille qui déborde d'un pixel)
    qui = {p: k for k, s in D.items() for p in s}
    for key, (x0, y0, x1, y1) in rect.items():
        for p in sorted(D[key]):
            x, y = p
            for bord, dedans, dehors in ((x1 - 1, -1, 1), (x0, 1, -1)):
                v = qui.get((x + dehors, y)) if x == bord else None
                if v and v != key and not px[x + dedans, y][3]:
                    D[key].discard(p)
                    D[v].add(p)
                    qui[p] = v
    return D


def case(src, pts):
    """Le dessin (ses pixels `pts` de la source) dans une case de L × H : le bas de sa butte au bas, sa tige au milieu."""
    px = src.load()
    x0, y0 = min(p[0] for p in pts), min(p[1] for p in pts)
    x1, y1 = max(p[0] for p in pts), max(p[1] for p in pts)
    if x1 - x0 + 1 > L or y1 - y0 + 1 > H:
        raise SystemExit(f'un dessin de {x1 - x0 + 1} × {y1 - y0 + 1} px ne tient pas dans une case de {L} × {H}')
    pied = [p[0] for p in pts if p[1] >= y1 - 2]
    cx = (min(pied) + max(pied) + 1) / 2
    dx = round(L / 2 - cx)
    dx = max(-x0, min(L - 1 - x1, dx))          # (sans sortir de la case : elle est assez large, L)
    out = Image.new('RGBA', (L, H), (0, 0, 0, 0))
    for (x, y) in pts:
        out.putpixel((x + dx, H - 1 - (y1 - y)), px[x, y])
    return out


def ordre():
    with open(DONNEES, encoding='utf8') as f:
        C = json.load(f)['CULTURES']
    return [k for k, v in C.items() if isinstance(v, dict) and v.get('sprite')]


def ecrire_sprites(rangs):
    """Les sprites de data/crops.json réécrits, ligne à ligne (le fichier garde sa forme)."""
    with open(DONNEES, encoding='utf8') as f:
        lignes = f.read().split('\n')
    culture = None
    for i, ligne in enumerate(lignes):
        m = re.match(r'^    "([a-z_]+)": \{$', ligne)
        if m:
            culture = m.group(1)
        if culture in rangs and re.match(r'^      "sprite": \{', ligne):
            r, n = rangs[culture]
            fin = ',' if ligne.rstrip().endswith(',') else ''
            lignes[i] = f'      "sprite": {{ "r": {r}, "c": {list(range(n))}, "l": {L}, "h": {H} }}{fin}'
    with open(DONNEES, 'w', encoding='utf8') as f:
        f.write('\n'.join(lignes))


def main():
    src = Image.open(SRC).convert('RGBA')
    D = dessins(src)
    noms = ordre()
    manque = [k for k in noms if k not in SOURCE]
    if manque:
        raise SystemExit(f'pas de dessin dans la source pour : {", ".join(manque)} (SOURCE)')
    n = max(len(SOURCE[k][2]) for k in noms)
    out = Image.new('RGBA', (n * L, len(noms) * H), (0, 0, 0, 0))
    rangs = {}
    for r, k in enumerate(noms):
        for ph in range(len(SOURCE[k][2])):
            out.alpha_composite(case(src, D[(k, ph)]), (ph * L, r * H))
        rangs[k] = (r, len(SOURCE[k][2]))
    out.save(SHEET, optimize=True)
    ecrire_sprites(rangs)
    print(f'assets/crops.png : {len(noms)} cultures, des cases de {L} × {H} ({out.width} × {out.height}) ; '
          f'data/crops.json : leurs sprites ; puis : node scripts/build-data.mjs')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', out.size, (120, 84, 50, 255))
        fond.alpha_composite(out)
        apercu(fond, 'apercu_cultures.png', 4)


if __name__ == '__main__':
    main()
