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

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fermier as F  # noqa: E402
from fermier import Canvas, arm, legs_assis  # noqa: E402

MODELES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modeles')
VUES = {'bas': 0, 'haut': 27, 'cote': 54}
TX, TY = 2, 7          # où le modèle est posé dans la case
K = (43, 29, 20)       # le contour
TETE, TORSE, JAMBES = 11, 18, 24      # fin (exclue) de la tête, du haut du corps, des jambes
# Les mèches qui bougent en marchant (meches) : les cheveux à partir de la rangée MECHES du modèle ; MILIEU, la colonne
# qui sépare la gauche de la droite ; rien n'est posé dans la zone du visage (VISAGE : x, y, l, h dans le modèle, celle
# de expressions.ZONE) dans les vues où le jeu lui pose une expression (VISAGE_VUES) : sa tuile s'y retrouve telle quelle
MECHES, MILIEU = 5, 6
VISAGE, VISAGE_VUES = (2, 5, 8, 5), ('bas', 'cote')
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


_PERSONNAGES = {}


def personnage(nom):
    """La description du catalogue de `nom` et son rang (modeles.tous)."""
    if not _PERSONNAGES:
        import modeles
        _PERSONNAGES.update({n: (d, i) for i, (n, d) in enumerate(modeles.tous())})
    return _PERSONNAGES[nom]


class Modele:
    """Le modèle d'un personnage, en lettres (modeles.lettres : chaque lettre, une couleur de sa palette,
    modeles.palette_de). Les cases sont dessinées en lettres ; render() leur donne leurs couleurs.

    Chantier « couches » (docs/personnage-couches.md, E4) : rien de ce qui pose le personnage ne dépend de
    ses couleurs ni de ses habits, pour que chaque élément (une coupe, un haut, un couvre-chef) ait la même
    forme chez tous ceux qui le portent :
      - les bras retirés quand les mains tiennent un outil, ou quand ils se balancent en marchant : les cases
        des zones des bras (ZONES : là où le corps de modeles.CORPS a une manche ou une main, BRAS_LETTRES,
        MAINS_LETTRES), si le modèle y a de la peau ou le haut (pas une mèche de cheveux) ;
      - les bras redessinés, les jambes assises, les yeux fermés du sommeil : des rôles de la palette (Mp la
        manche, le bras lointain Mp × 0,8 ; Mk la main ; Ms, Mr les jambes, Mw les chaussures, Mw × 0,7 ; Mv la
        peau, L les cils : modeles.palette_de), dont chaque personnage garde ses couleurs."""

    def __init__(self, nom, d=None):
        # (d : la description d'un personnage hors du catalogue, une combinaison nouvelle ; couches.py)
        import modeles
        d, i = (d, 0) if d is not None else personnage(nom)
        self.nom, self.d = nom, d
        self._cheveux = {}
        self.pal = modeles.palette_de(nom, d, i)
        self.vues = {v: {p: L for p, L in g.items() if L != 'a'} for v, g in modeles.lettres(nom, d).items()}
        # (un modèle retouché dont un bras est ailleurs : ses vues quand les bras sont redessinés, modeles.RETOUCHES_BRAS)
        self.vues_bras = {v: {p: L for p, L in g.items() if L != 'a'} for v, g in modeles.lettres_bras(nom, d).items()}

        self.manche, self.manche2, self.peau = 'Mp', 'Mp×0.8', 'Mk'
        F.C.update(ROLES)
        self.yeux = dict(Modele.YEUX_FERMES)

    # les yeux fermés du sommeil, de face : la peau (Mv) en haut, les cils (L) en bas
    YEUX_FERMES = {(x, y): 'Mv' if y == min(y for _, y in YEUX) else 'L' for (x, y) in YEUX}

    def couleur(self, lettre):
        if '×' in lettre:
            L, k = lettre.split('×')
            return mul(self.couleur(L), float(k))
        return self.pal[lettre]

    def haut(self, vue, sans_bras, sans_mains=False):
        """La tête et le torse (rangées 0..17), avec ou sans les bras (et les mains : la marche) : ce que le
        corps et le haut ont dans les zones des bras (ZONES ; une mèche de cheveux y reste)."""
        import modeles
        vues = self.vues_bras if sans_bras and vue in self.vues_bras else self.vues
        out = {p: c for p, c in vues[vue].items() if p[1] < TORSE}
        retire = (ZONES[vue][0] if sans_bras else set()) | (ZONES[vue][1] if sans_mains else set())
        otes = set()
        for p in retire:
            if p in out and modeles.famille(self.nom, out[p]) in ('corps', 'haut'):
                del out[p]
                otes.add(p)
        if sans_bras:
            remplir(out, otes, vue)
        return out

    def jambes(self, vue):
        return {p: c for p, c in self.vues[vue].items() if TORSE <= p[1] < JAMBES}

    def cheveux(self, vue, masque):
        """Les cases du haut du corps qui montrent la coiffure (vue `vue`, les bras redessinés selon `masque` :
        None, 'bras' ou 'marche') : ses éléments posés l'un sur l'autre, comme couches.assembler (le corps et le haut
        ne se posent pas dans les zones des bras retirés)."""
        cle = (vue, masque)
        if cle not in self._cheveux:
            import modeles
            retire = set()
            if masque:
                retire = ZONES[vue][0] | (ZONES[vue][1] if masque == 'marche' else set())
            proprio = {}
            for c, _, grilles in modeles.elements(self.nom, self.d):
                grille = grilles[f'{vue}:bras'] if masque and f'{vue}:bras' in grilles else grilles.get(vue, {})
                for p in grille:
                    if p[1] >= TORSE or (c in ('corps', 'haut') and p in retire):
                        continue
                    proprio[p] = c
            self._cheveux[cle] = {p for p, c in proprio.items() if c == 'coiffure'}
        return self._cheveux[cle]


def meches(haut, cheveux, vue, walk):
    """Les cheveux qui bougent en marchant (« au vent ») : aux images du passage (walk 1 et 3, la tête plus haute d'un
    pixel), les mèches (les cases de `cheveux` à partir de la rangée MECHES) s'étirent d'un pixel vers le bas (les
    pointes restent en bas) ; de profil, elles traînent en arrière d'un pixel (de deux pour les deux dernières
    rangées) ; de face et de dos, les pointes (les quatre dernières rangées) s'écartent d'un pixel du côté du pied
    qui passe (walk 1 : à droite, 3 : à gauche). Chaque mèche reste en place et sa copie, décalée, se pose
    par-dessus (dans l'ordre : le décalage, puis la rangée et la colonne de la mèche), sauf dans la zone du visage.
    haut : {(x, y): valeur} (le modèle) ; → un nouveau dict (le même haut aux autres images)."""
    if walk not in (1, 3):
        return haut
    pas = 1 if walk == 1 else -1
    brins = sorted((p for p in haut if p in cheveux and p[1] >= MECHES), key=lambda p: (p[1], p[0]))
    if not brins:
        return haut
    bas = max(y for _, y in brins)
    copies = []
    for x, y in brins:
        if vue == 'cote':
            if y >= bas - 1:
                copies += [(1, y, x, (x - 1, y)), (2, y, x, (x - 2, y + 1))]
            else:
                copies.append((1, y, x, (x - 1, y + 1)))
        else:
            cote = -1 if x < MILIEU else 1
            copies.append((1, y, x, (x + cote, y + 1) if cote == pas and y >= bas - 3 else (x, y + 1)))
    out = dict(haut)
    vx, vy, vl, vh = VISAGE
    for _, y, x, q in sorted(copies, key=lambda c: c[:3]):
        if vue in VISAGE_VUES and vx <= q[0] < vx + vl and vy <= q[1] < vy + vh:
            continue
        out[q] = haut[(x, y)]
    return out


# De profil, le bras redessiné part du dos (la marche, MAINS) : là où la manche du modèle bordait la poitrine, le
# torse retiré reprend la lettre de sa voisine (x, y, dx : la case, et où prendre sa lettre ; dans l'ordre).
REMPLIR = {'cote': [(7, 12, -1), (7, 13, -1), (7, 14, -1)]}


def remplir(haut, otes, vue):
    """Bouche dans `haut` ({(x, y): lettre}) les cases de REMPLIR que les bras redessinés ont ôtées (`otes`)."""
    for x, y, dx in REMPLIR.get(vue, ()):
        if (x, y) in otes and (x, y) not in haut and (x + dx, y) in haut:
            haut[(x, y)] = haut[(x + dx, y)]


# Les manches et les mains du corps (modeles.CORPS) dans les zones des bras : ce que retire un bras redessiné,
# et, en marchant les mains libres, les mains et leur ombre. ZONES : {vue: (cases des bras, cases des mains)},
# les mêmes pour tous les modèles.
# Les noms de fermier.C que les jambes assises emploient (fermier.legs_assis) : des rôles de la palette du modèle.
ROLES = {'ov': 'Ms', 'ov2': 'Mr', 'bt': 'Mw', 'bt2': 'Mw×0.7'}
BRAS_LETTRES = 'pqkt'
MAINS_LETTRES = 'kmt'


def _zones():
    import modeles

    def zone(vue, lettres_corps):
        return {(x, y) for cols, rangs in BRAS[vue] for x in cols for y in rangs if modeles.CORPS[vue][y - 11][x] in lettres_corps}
    return {v: (zone(v, BRAS_LETTRES), zone(v, MAINS_LETTRES)) for v in VUES}


ZONES = _zones()


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


def bras(cv, sx, sy, hx, hy, manche, peau, tete_cases, coude=None):
    """Un bras par-dessus le reste ; sur la tête, un contour le détache des cheveux. `coude` : le bras plié (le
    coude, dans la case), de l'épaule au coude puis du coude à la main."""
    couche = Canvas()
    if coude:
        couche.line(sx, sy, coude[0], coude[1], manche, 2)
        couche.line(coude[0], coude[1], hx, hy, manche, 2)
    else:
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
#   de profil (choisi avec le joueur), le corps est de trois quarts : on voit son bras droit, l'épaule
#   au dos (EPAULE_COTE), dessiné sur le corps (un contour l'en détache) ; il balance, une image par case du pas
#   (MAINS_COTE : la main, et le coude du bras plié) : derrière et pas trop haut au contact du pied proche devant
#   (image 0), en retard d'un pixel sur le corps aux passages (il revient, il repart : images 1 et 3), plié devant
#   au contact de l'autre pied (image 2). Le bras gauche est caché : seule sa main dépasse devant le ventre quand
#   le bras droit est derrière (MAIN_CACHEE : 2 pixels de peau, sous le corps) ;
#   de face et de dos (épaules en 4, 19 et 11, 19) : le bras qui va vers nous descend et s'écarte du
#   corps ; celui qui s'éloigne remonte et passe derrière la hanche (dessiné sous le corps).
MAINS = {
    'adulte': {'gauche': {1: (2, 24), 0: (3, 23), -1: (4, 21)},
               'droite': {1: (12, 24), 0: (11, 23), -1: (10, 21)}},
    'enfant': {'gauche': {1: (2, 24), 0: (3, 23), -1: (4, 20)},
               'droite': {1: (12, 24), 0: (11, 23), -1: (10, 20)}},
}
EPAULE_COTE = (3, 19)
# {image du pas: (main, coude ou None)}, les mêmes pour un enfant (raccourci ensuite)
MAINS_COTE = {0: ((1, 23), None), 1: ((2, 24), None), 2: ((7, 21), (4, 22)), 3: ((4, 24), None)}
MAIN_CACHEE = {0: (11, 22)}


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
    """Les bras de la marche : [(épaule, main, sous le corps ?, proche ?[, coude])], dans la case, avant le
    rebond. De face, le bras du côté de la jambe qui avance recule (image 0 : la gauche avance, le
    bras gauche recule et le droit vient vers nous) ; de dos, on voit l'inverse : le bras qui recule
    vient vers nous."""
    M = MAINS[age]
    if vue == 'cote':
        # (la main cachée : sans épaule ; le bras droit, sur le corps, avec son coude)
        main, coude = MAINS_COTE[walk]
        out = [(None, MAIN_CACHEE[walk], True, False)] if walk in MAIN_CACHEE else []
        return out + [(EPAULE_COTE, main, False, True, coude)]
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
    """Comme fermier.figure (mêmes paramètres, mêmes mains), d'après le modèle.

    (Chantier « couches » : chaque pixel retient l'étape qui l'a dessiné, Canvas.ph : derriere, bras_loin,
    jambes, bras_sous, modele, bras_dessus:<n>, devant ; et la case, sa pose, cv.trace : la vue, le décalage
    du haut du corps, les bras retirés, les yeux fermés, le contour de chaque bras posé dessus.)"""
    m = MODELE['m']
    etape = lambda nom: setattr(Canvas, 'phase', nom)
    cv = Canvas()
    dy = b + squat
    marche = walk is not None and not hands
    cv.trace = {'vue': vue, 'dy': dy, 'masque': 'marche' if marche else 'bras' if hands else None,
                'fermes': bool(fermes and vue == 'bas'), 'bras': [], 'meches': walk if walk is not None and not sit else None}
    dessus = lambda ref: (etape(f'bras_dessus:{len(cv.trace["bras"])}'), cv.trace['bras'].append(ref))
    etape('derriere')
    if before:
        before(cv)
    etape('bras_loin')
    if hands and vue == 'cote':
        bras(cv, 7, 19 + dy, hands[1][0], hands[1][1], m.manche2, m.peau, set())
    etape('jambes')
    if sit:
        legs_assis(cv, vue)
    elif walk is not None:
        jambes_marche(cv, m, vue, walk, dy, MODELE.get('age', 'adulte'))
    else:
        jambes(cv, m, vue, walk)
    haut = m.haut(vue, sans_bras=bool(hands))
    if fermes and vue == 'bas':                       # il dort : les yeux fermés
        haut = {**haut, **{p: c for p, c in m.yeux.items() if p in haut}}
    if marche:
        # la marche, les mains libres : les bras se balancent (refaits, sous ou sur le corps)
        # (et ce qui restait des mains du modèle, leurs ombres)
        haut = m.haut(vue, sans_bras=True, sans_mains=True)
        haut = meches(haut, m.cheveux(vue, 'marche'), vue, walk)   # (les cheveux bougent en marchant)
        tous = bras_marche(vue, walk, MODELE.get('age', 'adulte'))
        etape('bras_sous')
        for epaule, (hx, hy), sous, proche, *coude in tous:
            if sous and epaule is None:
                # (une main cachée : 2 pixels de peau qui dépassent du corps)
                cv.put(hx, hy + dy, m.peau)
                cv.put(hx, hy + 1 + dy, m.peau)
            elif sous:
                bras(cv, epaule[0], epaule[1] + dy, hx, hy + dy, m.manche, m.peau, set())
        etape('modele')
        torse = poser(cv, haut, 0, dy)
        tete = {(TX + x, TY + y + dy) for (x, y) in haut if y < TETE}
        for epaule, (hx, hy), sous, proche, *coude in tous:
            if not sous:
                # (de profil, le bras sur le corps : un contour l'en détache)
                c = coude[0] if coude and coude[0] else None
                dessus('torse' if proche else 'tete')
                bras(cv, epaule[0], epaule[1] + dy, hx, hy + dy, m.manche, m.peau, torse if proche else tete,
                     (c[0], c[1] + dy) if c else None)
    else:
        if walk is not None and not sit:
            haut = meches(haut, m.cheveux(vue, cv.trace['masque']), vue, walk)
        etape('modele')
        poser(cv, haut, 0, dy)
    tete = {(TX + x, TY + y + dy) for (x, y) in haut if y < TETE}
    if hands:
        if vue == 'cote':
            dessus('tete')
            bras(cv, 8, 19 + dy, hands[0][0], hands[0][1], m.manche, m.peau, tete)
        else:
            dessus('tete')
            bras(cv, 4, 19 + dy, hands[0][0], hands[0][1], m.manche, m.peau, tete)
            dessus('tete')
            bras(cv, 11, 19 + dy, hands[1][0], hands[1][1], m.manche, m.peau, tete)
    etape('devant')
    if after:
        after(cv)
    etape(None)
    cv.outline()
    return cv


def couleur(c):
    """La couleur d'un pixel d'une case : un nom de fermier.C (les outils, le contour K ; ov, bt… : des lettres
    du modèle), ou une lettre du modèle en cours."""
    if isinstance(c, tuple):
        return c
    if c in F.C:
        return couleur(F.C[c])
    return MODELE['m'].couleur(c)


def render(cv):
    im = Image.new('RGBA', (F.W, F.H), (0, 0, 0, 0))
    for y in range(F.H):
        for x in range(F.W):
            c = cv.px[y][x]
            if c is not None:
                im.putpixel((x, y), couleur(c) + (255,))
    return im


# Un enfant : dessiné comme un adulte, puis raccourci (ces rangées de la case retirées, le
# haut tassé vers le bas : le ventre et les cuisses ; la tête garde sa taille).
ENFANT_RANGEES = (20, 21, 26, 27)
# Assis (la tête descendue de 4), ces rangées-là tomberaient dans le menton et le cou : on retire une rangée
# du ventre au-dessus des mains posées sur la table, celle sous les mains et deux des cuisses (autant : la tête et
# les pieds restent où ils étaient ; la chemise et les mains restent visibles).
ENFANT_RANGEES_ASSIS = (24, 27, 28, 29)


def rangees_enfant(case):
    """Les rangées retirées de la case `case` d'un enfant."""
    return ENFANT_RANGEES_ASSIS if case.startswith('assis_') else ENFANT_RANGEES


def raccourci(im, rangees=ENFANT_RANGEES):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    y = F.H - 1
    for r in range(F.H - 1, -1, -1):
        if r in rangees:
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
        sheet.paste(raccourci(im, rangees_enfant(n)) if enfant else im, ((i % F.COLS) * F.W, (i // F.COLS) * F.H))
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
