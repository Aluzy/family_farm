# Les planches de personnages en lettres (chantier « couches », étape E4 : docs/personnage-couches.md).
#
# chibi.py fabrique les 112 cases d'une planche à partir des couleurs d'un modèle : il les déplace (la
# respiration, la marche, l'accroupi), en retire (les bras quand les mains tiennent un outil), en dessine
# de nouvelles (les bras, les jambes de profil, avec la manche et la peau du modèle ; les outils) et en
# calcule trois (la manche lointaine, × 0,8 ; la chaussure assise, × 0,7 ; les cils du sommeil, × 0,85).
# Pour savoir d'où vient chaque pixel d'une planche, on le refait tourner sur un modèle « marqué » : chaque
# lettre du modèle (modeles.lettres) y a une couleur à elle, unique, tout près de sa vraie couleur (les
# tests de chibi.py sur les couleurs, plus ou moins claires que tant, donnent donc la même réponse). Chaque
# pixel de la planche obtenue se relit en lettre :
#   une lettre du modèle (k, B, p, s…, ou une nuance d'un modèle retouché) ;
#   « L×0.8 », « L×0.7 », « L×0.85 » : une couleur calculée par chibi.py d'après la lettre L ;
#   un nom de fermier.C (les outils : wd, mt, wc, dr, bk, eg, sd… ; K, un contour intérieur : un bras devant
#   la tête, une jambe devant l'autre) ;
#   « Ko » : le contour de la silhouette, refait par Canvas.outline (marqué à part : il se recalcule après
#   l'assemblage des couches).
# Recolorée (couleur()), la planche en lettres doit redonner exactement la planche du jeu
# (assets/personnages/<nom>.png) : c'est la preuve que la lecture est juste (verifier()).
#
#   python3 scripts/personnage/couches.py     vérifie les 100 planches
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chibi  # noqa: E402
import fermier as F  # noqa: E402
import modeles  # noqa: E402

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PERSONNAGES = os.path.join(RACINE, 'assets', 'personnages')
FACTEURS = (0.8, 0.7, 0.85)          # les couleurs que chibi.py calcule (chibi.mul)
ECARTS = [(dr, dg, db) for s in range(1, 4) for dr in range(-s, s + 1) for dg in range(-s, s + 1) for db in range(-s, s + 1)
          if max(abs(dr), abs(dg), abs(db)) == s]


def lum(c):
    return sum(c) / 3


def marquer(pal):
    """Une couleur unique par lettre, tout près de la vraie : {lettre: couleur marquée}. Elle reste du même
    côté des seuils de chibi.py (le plus petit canal sous 230 : de la peau, pas du blanc ; la moyenne sous
    90 : une pupille sombre), loin du contour, et ses couleurs calculées (FACTEURS) ne retombent sur aucune
    autre."""
    pris, out = {chibi.K}, {}
    for L, c in pal.items():
        if L == 'a':
            continue
        for d in [(0, 0, 0)] + ECARTS:
            s = tuple(min(255, max(0, v + e)) for v, e in zip(c, d))
            if (min(s) < 230) != (min(c) < 230) or (lum(s) < 90) != (lum(c) < 90):
                continue
            derives = {chibi.mul(s, k) for k in FACTEURS}
            if s in pris or derives & pris or s in derives:
                continue
            out[L] = s
            pris |= {s} | derives
            break
        else:
            raise RuntimeError(f'pas de couleur marquée pour {L} {c}')
    return out


def modele_marque(nom, d, marques):
    im = Image.new('RGBA', (12, 79), (0, 0, 0, 0))
    for v, g in modeles.lettres(nom, d).items():
        for (x, y), ch in g.items():
            im.putpixel((x, modeles.DEBUT[v] + y), (chibi.K if ch == 'a' else marques[ch]) + (255,))
    return im


def planche_lettres(nom, d, i):
    """Les 112 cases de la planche de `nom`, en lettres : {case: [[lettre ou None] * 16] * 32}."""
    enfant = nom.startswith('enfant_')
    pal = modeles.palette_de(nom, d, i)
    marques = marquer({L: c for L, c in pal.items() if L in {ch for g in modeles.lettres(nom, d).values() for ch in g.values()}})
    lire = {s: L for L, s in marques.items()}
    for L, s in marques.items():
        for k in FACTEURS:
            lire.setdefault(chibi.mul(s, k), f'{L}×{k}')
    F.dessiner({'couleurs': {}})
    chibi.MODELE['m'] = chibi.Modele(nom, modele_marque(nom, d, marques))
    chibi.MODELE['age'] = 'enfant' if enfant else 'adulte'
    # (le contour de la silhouette, à part : « Ko »)
    trace = F.Canvas.outline

    def outline(cv):
        avant = [r[:] for r in cv.px]
        trace(cv)
        for y in range(F.H):
            for x in range(F.W):
                if avant[y][x] is None and cv.px[y][x] == 'K':
                    cv.px[y][x] = 'Ko'
    F.Canvas.outline = outline
    try:
        cases = F.frames(chibi.figure)
    finally:
        F.Canvas.outline = trace
    out = {}
    for n, cv in cases.items():
        g = []
        for y in range(F.H):
            r = []
            for x in range(F.W):
                c = cv.px[y][x]
                if isinstance(c, str) and c not in ('K', 'Ko') and isinstance(F.C.get(c), tuple) and F.C[c] in lire:
                    c = lire[F.C[c]]          # (ov, ov2, bt, bt2 : des couleurs du modèle, rangées dans fermier.C)
                elif isinstance(c, tuple):
                    if c not in lire:
                        raise RuntimeError(f'{nom} {n} ({x}, {y}) : couleur {c} illisible')
                    c = lire[c]
                r.append(c)
            g.append(r)
        out[n] = raccourci(g, chibi.rangees_enfant(n)) if enfant else g
    return out


def raccourci(g, rangees):
    """chibi.raccourci, sur une case en lettres : les rangées `rangees` retirées, le haut tassé vers le bas."""
    rangs = [g[r] for r in range(F.H) if r not in rangees]
    return [[None] * F.W for _ in range(F.H - len(rangs))] + rangs


def couleur(nom, d, i, lettre):
    """La couleur d'une lettre de la planche de `nom`."""
    if lettre in ('K', 'Ko'):
        return F.BASE['K']
    if '×' in lettre:
        L, k = lettre.split('×')
        return chibi.mul(couleur(nom, d, i, L), float(k))
    pal = modeles.palette_de(nom, d, i)
    return pal[lettre] if lettre in pal else F.BASE[lettre]


def verifier(nom, d, i):
    """La planche en lettres, recolorée, contre la planche du jeu : la liste des écarts [(case, x, y)]."""
    lettres = planche_lettres(nom, d, i)
    planche = Image.open(os.path.join(PERSONNAGES, nom + '.png')).convert('RGBA').load()
    ecarts = []
    for k, (n, g) in enumerate(lettres.items()):
        x0, y0 = (k % F.COLS) * F.W, (k // F.COLS) * F.H
        for y in range(F.H):
            for x in range(F.W):
                L, p = g[y][x], planche[x0 + x, y0 + y]
                attendu = None if not p[3] else p[:3]
                if (None if L is None else couleur(nom, d, i, L)) != attendu:
                    ecarts.append((n, x, y))
    return ecarts


def main():
    total = 0
    for i, (nom, d) in enumerate(modeles.tous()):
        e = verifier(nom, d, i)
        total += len(e)
        if e:
            print(f'{nom} : {len(e)} écarts, {e[:4]}')
    print(f'{len(modeles.tous())} planches relues en lettres : ' + ('toutes identiques une fois recolorées' if not total else f'{total} pixels différents'))
    return total


if __name__ == '__main__':
    sys.exit(1 if main() else 0)


# ---------- les couches : à quel élément appartient chaque lettre ----------
FAMILLES = {
    'corps': 'kdtmleghij',          # la peau, les yeux, la bouche (et les mains, le cou)
    'joues': 'P', 'rousseur': 'X',
    'coiffure': 'BCEDfzN',          # les cheveux, la peau qu'elle laisse dans l'ombre, ses rubans
    'pilosite': 'bcJ',              # la barbe, la moustache
    'haut': ['p', 'q', 'o', 'v_'],
    'bas': 'srAZuv', 'chaussures': 'wxy',
    'couvre_chef': 'RQHVSTUF',
    'lunettes': 'G', 'boucles': 'Y', 'pansement': 'W',
}
_PAR_LETTRE = {L: f for f, Ls in FAMILLES.items() for L in Ls}


def couche(nom, lettre):
    """La couche d'une lettre de la planche de `nom` : une des FAMILLES, « outils » (un nom de fermier.C),
    « contour » (K, un contour intérieur) ou « silhouette » (Ko)."""
    if lettre == 'K':
        return 'contour'
    if lettre == 'Ko':
        return 'silhouette'
    L = lettre.split('×')[0]
    L = modeles.base(nom, L)
    return _PAR_LETTRE.get(L, 'outils')


def element(d, famille):
    """L'élément que porte le personnage `d` pour la couche `famille` (None : rien), son âge compris pour le corps."""
    age = 'enfant' if d.get('_enfant') else 'adulte'
    return {
        'corps': age, 'coiffure': d['coupe'], 'couvre_chef': d['chapeau'],
        'pilosite': next((x for x in d['details'] if x in ('barbe', 'moustache')), None),
    }.get(famille, famille if famille in ('haut', 'bas', 'chaussures', 'outils', 'contour') or famille in d['details'] else None)
