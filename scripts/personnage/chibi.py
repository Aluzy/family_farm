# Le dessin des personnages de la carte : une grosse tête, de grands yeux,
# un contour brun. Chaque personnage redessiné a son modèle, scripts/personnage/modeles/<nom>.png
# (12 × 79 px) : les trois vues debout, empilées, de 25 rangées chacune (contour du bas compris),
# séparées de deux rangées vides :
#   rangées  0..24   de face (« bas »)
#   rangées 27..51   de dos (« haut »)
#   rangées 54..78   de profil, tourné vers la droite (« cote » ; la carte le retourne)
# Dans chaque vue : la tête et le torse sur les rangées 0..17, les jambes et les chaussures sur
# 18..23 ; de face et de dos, les bras sur les colonnes 0..2 et 9..11 (les mains en 15..16) ; de
# profil, le bras proche sur les colonnes 7..11, la main du bras lointain sur 0..2.
#
# La planche (assets/personnages/<nom>.png) garde les cases, la taille (16 × 32, le modèle posé
# en x 2, y 7, les pieds en bas) et les positions des mains et des outils de
# scripts/personnage/fermier.py (ses frames() avec la figure d'ici) : rien ne change pour la
# carte. Les poses reprennent les pixels du modèle : debout, le modèle tel quel ; la respiration,
# le pas et l'accroupi déplacent le haut du corps ; la marche (fiche 20, plus bas) lève et plie
# les jambes (de face, de dos), les refait en biais de la hanche au pied (de profil) et balance les
# bras ; quand les mains tiennent un outil, les
# bras du modèle sont retirés et redessinés vers les mains (manche et peau du modèle). Le
# contour est refait à la fin.
#
#   python3 scripts/personnage/modeles.py          écrit les modèles tirés du catalogue
#   python3 scripts/personnage/chibi.py            écrit les planches de tous les modèles :
#                                                  assets/personnages/perso_XX.png et enfant_XX.png
#                                                  (un enfant raccourci : ENFANT_RANGEES), et les
#                                                  planches par défaut assets/fermiere.png, fermier.png
#   python3 scripts/personnage/chibi.py --apercu   écrit aussi apercu_chibi.png (agrandi)
import json
import os
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fermier as F  # noqa: E402
from fermier import Canvas, arm, legs_assis  # noqa: E402

MODELES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles')
VUES = {'bas': 0, 'haut': 27, 'cote': 54}
TX, TY = 2, 7          # où le modèle est posé dans la case
K = (43, 29, 20)       # le contour
TETE, TORSE, JAMBES = 11, 18, 24      # fin (exclue) de la tête, du haut du corps, des jambes
# Les yeux de face (le blanc et la pupille de chacun, sur deux rangées), les mêmes pour tous les modèles
YEUX = [(x, y) for y in (5, 6) for x in (3, 4, 7, 8)]
# Les zones des bras, par vue : (colonnes, rangées)
BRAS = {
    'bas': [(range(0, 3), range(11, 18)), (range(9, 12), range(11, 18))],
    'haut': [(range(0, 3), range(11, 18)), (range(9, 12), range(11, 18))],
    'cote': [(range(7, 12), range(12, 18)), (range(0, 3), range(13, 18))],
}


def mul(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c)


class Modele:
    def __init__(self, nom):
        im = Image.open(os.path.join(MODELES, nom + '.png')).convert('RGBA')
        px = im.load()
        self.vues = {}
        for vue, y0 in VUES.items():
            self.vues[vue] = {(x, y): px[x, y0 + y][:3] for y in range(25) for x in range(12)
                              if px[x, y0 + y][3] and px[x, y0 + y][:3] != K}
        face = self.vues['bas']

        def commune(pts):
            n = Counter(face[p] for p in pts if p in face)
            return n.most_common(1)[0][0]
        # les couleurs des bras : celles des colonnes du bord, de face
        self.couleurs_bras = {face[(x, y)] for x in (0, 1, 10, 11) for y in range(12, 17) if (x, y) in face}
        self.manche = commune([(x, y) for x in (0, 1, 2) for y in (12, 13, 14)])
        self.manche2 = mul(self.manche, 0.8)
        self.peau = commune([(x, y) for x in (1, 2, 9, 10) for y in (15, 16)])
        # les couleurs des mains (de face, leurs ombres comprises : la marche les retire toutes)
        self.mains = {face[(x, y)] for x in (1, 2, 9, 10) for y in (15, 16) if (x, y) in face}
        # les jambes et les chaussures (pour assis)
        F.C['ov'] = commune([(x, y) for x in (3, 4) for y in range(18, 22)])
        F.C['ov2'] = commune([(x, y) for x in (7, 8) for y in range(18, 22)])
        F.C['bt'] = commune([(x, y) for x in (3, 4) for y in (22, 23)])
        F.C['bt2'] = mul(F.C['bt'], 0.7)
        self.yeux = self.yeux_fermes(face)

    @staticmethod
    def yeux_fermes(face):
        """Les yeux fermés, de face. Tous les modèles ont les yeux aux mêmes cases (YEUX : le
        blanc et la pupille, sur deux rangées) : la rangée du haut prend la couleur de la peau
        (la plus fréquente juste entre et sous les yeux), celle du bas devient un trait de cils
        (la pupille si elle est sombre, sinon un brun sombre). Renvoie { case: couleur }."""
        lum = lambda c: sum(c) / 3
        peaux = Counter(face[p] for p in ((5, 6), (6, 6), (5, 7), (6, 7)) if p in face and min(face[p]) < 230)
        if not peaux:
            return {}
        peau = peaux.most_common(1)[0][0]
        pupilles = [face[p] for p in YEUX if p in face and min(face[p]) < 230]
        sombre = min(pupilles, key=lum) if pupilles else None
        cil = mul(sombre, 0.85) if sombre and lum(sombre) < 90 else (54, 36, 24)
        haut = min(y for _, y in YEUX)
        return {(x, y): peau if y == haut else cil for (x, y) in YEUX}

    def haut(self, vue, sans_bras):
        """La tête et le torse (rangées 0..17), avec ou sans les bras."""
        out = {p: c for p, c in self.vues[vue].items() if p[1] < TORSE}
        if sans_bras:
            for cols, rangs in BRAS[vue]:
                for x in cols:
                    for y in rangs:
                        if out.get((x, y)) in self.couleurs_bras:
                            del out[(x, y)]
        return out

    def jambes(self, vue):
        return {p: c for p, c in self.vues[vue].items() if TORSE <= p[1] < JAMBES}


def poser(cv, pts, dx=0, dy=0):
    cases = set()
    for (x, y), c in pts.items():
        cv.put(TX + x + dx, TY + y + dy, c)
        cases.add((TX + x + dx, TY + y + dy))
    return cases


def jambes(cv, m, vue, walk):
    """De face et de dos : la jambe qui avance se lève d'un pixel. De profil : la jambe lointaine
    (à droite dans le modèle) et la proche passent l'une devant l'autre."""
    pts = m.jambes(vue)
    gauche = {p: c for p, c in pts.items() if p[0] < 6}
    droite = {p: c for p, c in pts.items() if p[0] >= 6}
    if vue == 'cote':
        gauche = {p: c for p, c in pts.items() if p[0] < 5}
        droite = {p: c for p, c in pts.items() if p[0] >= 5}
        # (décalage de la proche, de la lointaine, levée de la proche, de la lointaine)
        dp, dl, lp, ll = {None: (0, 0, 0, 0), 0: (0, 0, 0, 0), 1: (2, -2, 1, 0),
                          2: (4, -4, 0, 0), 3: (2, -2, 0, 1)}[walk]
        poser(cv, droite, dl, -ll)
        poser(cv, gauche, dp, -lp)
        return
    lg, ld = {None: (0, 0), 0: (0, 1), 1: (0, 0), 2: (1, 0), 3: (0, 0)}[walk]
    poser(cv, gauche, 0, -lg)
    poser(cv, droite, 0, -ld)


def bras(cv, sx, sy, hx, hy, manche, peau, tete_cases):
    """Un bras par-dessus le reste ; sur la tête, un contour le détache des cheveux."""
    couche = Canvas()
    arm(couche, sx, sy, hx, hy, manche)
    couche.rect(hx, hy, hx + 1, hy + 1, peau)
    pts = [(x, y) for y in range(F.H) for x in range(F.W) if couche.px[y][x] is not None]
    for (x, y) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in tete_cases and couche.px[ny][nx] is None:
                cv.put(nx, ny, 'K')
    for (x, y) in pts:
        cv.put(x, y, couche.px[y][x])


# ---------- la marche (fiche 20) ----------
# Un cycle de quatre images, dans les cases d'avant (marche_<vue>_0..3, panier_<vue>_0..3) :
#   0  contact : la jambe proche (de profil), la gauche (de face, de dos) devant, l'autre derrière ;
#   1  passage : la jambe d'appui sous le corps, l'autre passe à côté (de profil : droite, le pied
#      décollé d'un pixel ; de face et de dos : levée) ; le corps au plus haut ;
#   2  contact de l'autre pied ;
#   3  passage de l'autre jambe.
# La carte avance d'une image tous les CarteKit.PAS px parcourus (3 px pour un adulte, 2 pour un
# enfant : PIED ici) et commence par un passage (l'image 1, la plus proche de la pose debout). De
# profil, le pied posé recule de PIED px par image (de +PIED à -PIED en deux images), autant que le
# corps avance : il ne glisse pas sur le sol. Les jambes de profil sont refaites d'après les
# couleurs du modèle (la cuisse part de la hanche et descend en biais jusqu'au pied) ; de face et
# de dos, celles du modèle sont raccourcies quand elles se lèvent. Les bras se balancent (MAINS, plus bas).
PIED = {'adulte': 3, 'enfant': 2}       # px : le pied devant, puis derrière, de profil
LEVE = {'adulte': 2, 'enfant': 1}       # px : de face et de dos, le pied qui passe se lève d'autant
# Les bras, refaits comme ceux des gestes (bras() : la manche du modèle, la main de sa peau), d'une
# épaule fixe à une main qui se balance, à l'opposé des jambes. La main (le coin en haut à gauche de
# ses 2 × 2 px, dans la case, avant le rebond) selon que le bras est devant, le long du corps ou
# derrière ; un enfant (raccourci : les rangées 20, 21 et 26, 27 de la case retirées) les balance
# un peu moins.
#   de profil, le bras proche (épaule en 8, 19), dessiné sur le corps : devant, la main au-delà du
#   ventre ; derrière, la main derrière le dos ; le bras lointain (épaule en 7, 19), plus sombre,
#   dessiné sous le corps, à l'opposé (devant : sa main dépasse du ventre ; derrière : du dos) ;
#   de face et de dos (épaules en 4, 19 et 11, 19) : le bras qui va vers nous descend et s'écarte du
#   corps ; celui qui s'éloigne remonte et passe derrière la hanche (dessiné sous le corps).
MAINS = {
    'adulte': {'proche': {1: (12, 22), 0: (10, 22), -1: (4, 23)},
               'loin': {1: (11, 22), 0: (4, 22), -1: (3, 23)},
               'gauche': {1: (2, 24), 0: (3, 23), -1: (4, 21)},
               'droite': {1: (12, 24), 0: (11, 23), -1: (10, 21)}},
    'enfant': {'proche': {1: (12, 22), 0: (10, 22), -1: (5, 23)},
               'loin': {1: (11, 22), 0: (4, 22), -1: (4, 23)},
               'gauche': {1: (2, 24), 0: (3, 23), -1: (4, 20)},
               'droite': {1: (12, 24), 0: (11, 23), -1: (10, 20)}},
}
# de profil, le bras proche : derrière au contact du pied proche devant (image 0), devant au contact
# de l'autre (image 2), le long du corps au passage
SENS_BRAS = {0: -1, 1: 0, 2: 1, 3: 0}


# De profil, au passage (images 1 et 3), les deux jambes restent droites, comme debout : la jambe
# d'appui sous le corps (là où son pied posé est rendu), l'autre juste à côté, à PASSE px devant
# (une rangée de contour entre elles), droite elle aussi, son pied décollé d'un pixel (sans genou
# plié : la jambe entière monte).
PASSE = 3


def pas_profil(walk, age):
    """Les deux jambes de profil, la proche puis la lointaine : (hanche, décalage du pied, levée
    qui la raccourcit, montée de la jambe entière). Aux contacts, en biais de la hanche (proche en
    3, lointaine en 4) au pied ; aux passages, droites."""
    p = PIED[age]
    return {0: ((3, p, 0, 0), (4, -p, 0, 0)),
            1: ((3, 0, 0, 0), (3 + PASSE, 0, 0, 1)),
            2: ((3, -p, 0, 0), (4, p, 0, 0)),
            3: ((4 + PASSE, 0, 0, 1), (4, 0, 0, 0))}[walk]


def pas_face(walk, age):
    """(levée de la jambe gauche, de la droite), de face et de dos : au contact, le talon de
    derrière se décolle ; au passage, la jambe qui passe se plie."""
    l = LEVE[age]
    return {0: (0, 1), 1: (0, l), 2: (1, 0), 3: (l, 0)}[walk]


def rangs_jambe(pts, cols):
    """Les couleurs d'une jambe du modèle de profil, rangée par rangée (de gauche à droite) : les
    rangées de la jambe, puis les deux de la chaussure."""
    out = []
    for y in range(TORSE, JAMBES):
        r = [pts[(x, y)] for x in sorted(cols) if (x, y) in pts]
        if r:
            out.append(r)
    return out


def jambe_profil(cv, rangs, hx, off, leve, dy, contre, monte=0):
    """Une jambe de profil : la cuisse part de la hanche (colonne hx du modèle) et descend en biais
    jusqu'au pied (hx + off) ; levée de `leve` px, elle se raccourcit (le genou plié). `dy` : le
    corps levé (la cuisse monte avec lui, sans trou sous le torse). `contre` : les cases d'une jambe
    déjà posée, dont un contour la détache. `monte` : la jambe entière monte d'autant (le pied
    décollé, la jambe droite). Renvoie ses cases."""
    jambe, chaussure = rangs[:-2], rangs[-2:]
    pts = {}
    fin = TORSE + len(jambe) - 1 - leve          # la dernière rangée de la jambe
    n = max(1, fin - TORSE + 1)
    for y in range(TORSE + min(0, dy), fin + 1):
        t = max(0, y - TORSE + 1) / n
        x = hx + round(off * t)
        for i, c in enumerate(jambe[min(len(jambe) - 1, max(0, y - TORSE))]):
            pts[(x + i, y)] = c
    for j, couleurs in enumerate(chaussure):
        y = fin + 1 + j
        for i, c in enumerate(couleurs):
            pts[(hx + off + i, y)] = c
    if monte:
        pts = {(x, y - monte): c for (x, y), c in pts.items()}
    cases = set()
    for (x, y), c in pts.items():
        X, Y = TX + x, TY + y
        for ddx in (-1, 1):
            if (X + ddx, Y) in contre and (x + ddx, y) not in pts:
                cv.put(X + ddx, Y, 'K')
        cv.put(X, Y, c)
        cases.add((X, Y))
    return cases


def jambes_marche(cv, m, vue, walk, dy, age):
    pts = m.jambes(vue)
    if vue == 'cote':
        # le modèle : la jambe proche (claire) à gauche, la lointaine (sombre) à droite ; dans la
        # marche, les deux hanches sous le milieu du corps, la lointaine un pixel plus avant
        proche = rangs_jambe(pts, range(0, 5))
        loin = rangs_jambe(pts, range(5, 12))
        (hp, op, lp, mp), (hl, ol, ll, ml) = pas_profil(walk, age)
        deja = jambe_profil(cv, loin, hl, ol, ll, dy, set(), ml)
        jambe_profil(cv, proche, hp, op, lp, dy, deja, mp)
        return
    lg, ld = pas_face(walk, age)
    for gauche, leve in ((True, lg), (False, ld)):
        part = {p: c for p, c in pts.items() if (p[0] < 6) == gauche}
        # levée : la jambe se raccourcit par le haut (le genou plié vers nous), le pied monte
        out = {(x, y - leve): c for (x, y), c in part.items() if y - leve >= TORSE}
        # le corps levé : la cuisse monte avec lui
        for (x, y), c in part.items():
            if y == TORSE:
                for k in range(1, -dy + 1):
                    out.setdefault((x, y - k), c)
        poser(cv, out)


def bras_marche(vue, walk, age):
    """Les bras de la marche : [(épaule, main, sous le corps ?, proche ?)], dans la case, avant le
    rebond. De face, le bras du côté de la jambe qui avance recule (image 0 : la gauche avance, le
    bras gauche recule et le droit vient vers nous) ; de dos, on voit l'inverse : le bras qui recule
    vient vers nous."""
    M = MAINS[age]
    if vue == 'cote':
        s = SENS_BRAS[walk]
        # (proche : le bras proche qui passe sur le corps, derrière ; un contour l'en détache)
        return [((7, 19), M['loin'][-s], True, False), ((8, 19), M['proche'][s], False, s < 0)]
    # (+1 : la main vers nous, en bas, écartée ; -1 : remontée, derrière la hanche)
    g = {0: -1, 1: 0, 2: 1, 3: 0}[walk]
    if vue == 'haut':
        g = -g
    out = []
    for epaule, cote_, k in (((4, 19), 'gauche', g), ((11, 19), 'droite', -g)):
        out.append((epaule, M[cote_][k], k < 0, False))
    return out


MODELE = {}           # le modèle du personnage en cours de dessin (m), et son âge (age)


def figure(vue, walk=None, b=0, squat=0, hands=None, before=None, after=None, sit=False, fermes=False):
    """Comme fermier.figure (mêmes paramètres, mêmes mains), d'après le modèle."""
    m = MODELE['m']
    cv = Canvas()
    if before:
        before(cv)
    dy = b + squat
    if hands and vue == 'cote':
        bras(cv, 7, 19 + dy, hands[1][0], hands[1][1], m.manche2, m.peau, set())
    if sit:
        legs_assis(cv, vue)
    elif walk is not None:
        jambes_marche(cv, m, vue, walk, dy, MODELE.get('age', 'adulte'))
    else:
        jambes(cv, m, vue, walk)
    haut = m.haut(vue, sans_bras=bool(hands))
    if fermes and vue == 'bas':                       # il dort : les yeux fermés
        haut = {**haut, **{p: c for p, c in m.yeux.items() if p in haut}}
    if walk is not None and not hands:
        # la marche, les mains libres : les bras se balancent (refaits, sous ou sur le corps)
        haut = m.haut(vue, sans_bras=True)
        # (et ce qui restait des mains du modèle, leurs ombres)
        zones = {(x, y) for cols, rangs in BRAS[vue] for x in cols for y in rangs}
        haut = {p: c for p, c in haut.items() if not (p in zones and c in m.mains)}
        tous = bras_marche(vue, walk, MODELE.get('age', 'adulte'))
        for (sx, sy), (hx, hy), sous, proche in tous:
            if sous:
                bras(cv, sx, sy + dy, hx, hy + dy, m.manche2 if vue == 'cote' else m.manche, m.peau, set())
        torse = poser(cv, haut, 0, dy)
        tete = {(TX + x, TY + y + dy) for (x, y) in haut if y < TETE}
        for (sx, sy), (hx, hy), sous, proche in tous:
            if not sous:
                # (de profil, le bras proche sur le corps : un contour l'en détache)
                bras(cv, sx, sy + dy, hx, hy + dy, m.manche, m.peau, torse if proche else tete)
    else:
        poser(cv, haut, 0, dy)
    tete = {(TX + x, TY + y + dy) for (x, y) in haut if y < TETE}
    if hands:
        if vue == 'cote':
            bras(cv, 8, 19 + dy, hands[0][0], hands[0][1], m.manche, m.peau, tete)
        else:
            bras(cv, 4, 19 + dy, hands[0][0], hands[0][1], m.manche, m.peau, tete)
            bras(cv, 11, 19 + dy, hands[1][0], hands[1][1], m.manche, m.peau, tete)
    if after:
        after(cv)
    cv.outline()
    return cv


def render(cv):
    im = Image.new('RGBA', (F.W, F.H), (0, 0, 0, 0))
    for y in range(F.H):
        for x in range(F.W):
            c = cv.px[y][x]
            if c is not None:
                im.putpixel((x, y), (F.C[c] if isinstance(c, str) else c) + (255,))
    return im


# Un enfant : dessiné comme un adulte, puis raccourci (ces rangées de la case retirées, le
# haut tassé vers le bas : le ventre et les cuisses ; la tête garde sa taille).
ENFANT_RANGEES = (20, 21, 26, 27)


def raccourci(im):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    y = F.H - 1
    for r in range(F.H - 1, -1, -1):
        if r in ENFANT_RANGEES:
            continue
        out.paste(im.crop((0, r, F.W, r + 1)), (0, y))
        y -= 1
    return out


def ecrire(nom, enfant=False):
    F.dessiner({'couleurs': {}})
    MODELE['m'] = Modele(nom)
    MODELE['age'] = 'enfant' if enfant else 'adulte'
    cases = F.frames(figure)
    noms = list(cases)
    rangs = (len(noms) + F.COLS - 1) // F.COLS
    sheet = Image.new('RGBA', (F.COLS * F.W, rangs * F.H), (0, 0, 0, 0))
    for i, n in enumerate(noms):
        im = render(cases[n])
        sheet.paste(raccourci(im) if enfant else im, ((i % F.COLS) * F.W, (i // F.COLS) * F.H))
    sheet.save(os.path.join(F.ASSETS, 'personnages', f'{nom}.png'))
    return sheet


# Les planches par défaut de la carte (avant que celle du personnage soit chargée) : la
# fermière (perso_01) et le fermier (perso_07, le personnage par défaut d'un homme).
DEFAUTS = {'fermiere': 'perso_01', 'fermier': 'perso_07'}


def main():
    noms = sorted(n[:-4] for n in os.listdir(MODELES) if n.endswith('.png') and n.startswith(('perso_', 'enfant_')))
    planches = {}
    for nom in noms:
        planches[nom] = ecrire(nom, enfant=nom.startswith('enfant_'))
    for nom, src in DEFAUTS.items():
        planches[src].save(os.path.join(F.ASSETS, f'{nom}.png'))
    # les noms des cases (les mêmes pour toutes les planches)
    cases = {'frameWidth': F.W, 'frameHeight': F.H, 'frames': list(F.frames(figure))}
    for chemin in [os.path.join(F.ASSETS, 'personnages', 'cases.json')] + [os.path.join(F.ASSETS, f'{nom}.json') for nom in DEFAUTS]:
        with open(chemin, 'w', encoding='utf-8') as f:
            json.dump(cases, f, ensure_ascii=False, indent=0)
            f.write('\n')
    print(f'{len(noms)} planches écrites dans assets/personnages/, et ' + ', '.join(f'assets/{n}.png' for n in DEFAUTS))
    if '--apercu' in sys.argv:
        choix = [planches[n] for n in noms[:3]]
        out = Image.new('RGBA', (choix[0].width * 3 + 16, choix[0].height), (0, 0, 0, 0))
        for i, sh in enumerate(choix):
            out.alpha_composite(sh, (i * (sh.width + 8), 0))
        F.apercu(out, 'apercu_chibi.png', 5, (126, 170, 92))


if __name__ == '__main__':
    main()
