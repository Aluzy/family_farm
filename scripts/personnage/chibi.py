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
# le pas et l'accroupi déplacent le haut du corps ; la marche lève une jambe (de face, de dos)
# ou les fait passer l'une devant l'autre (de profil) ; quand les mains tiennent un outil, les
# bras du modèle sont retirés et redessinés vers les mains (manche et peau du modèle). Le
# contour est refait à la fin.
#
#   python3 scripts/personnage/modeles.py          écrit les modèles tirés du catalogue
#   python3 scripts/personnage/chibi.py            écrit les planches de tous les modèles :
#                                                  assets/personnages/perso_XX.png et enfant_XX.png
#                                                  (un enfant raccourci : ENFANT_RANGEES), et les
#                                                  planches par défaut assets/fermiere.png, fermier.png
#   python3 scripts/personnage/chibi.py --apercu   écrit aussi apercu_chibi.png (agrandi)
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
        # les jambes et les chaussures (pour assis)
        F.C['ov'] = commune([(x, y) for x in (3, 4) for y in range(18, 22)])
        F.C['ov2'] = commune([(x, y) for x in (7, 8) for y in range(18, 22)])
        F.C['bt'] = commune([(x, y) for x in (3, 4) for y in (22, 23)])
        F.C['bt2'] = mul(F.C['bt'], 0.7)

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


MODELE = {}           # le modèle du personnage en cours de dessin


def figure(vue, walk=None, b=0, squat=0, hands=None, before=None, after=None, sit=False):
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
    else:
        jambes(cv, m, vue, walk)
    haut = m.haut(vue, sans_bras=bool(hands))
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
    noms = sorted(n[:-4] for n in os.listdir(MODELES) if n.endswith('.png'))
    planches = {}
    for nom in noms:
        planches[nom] = ecrire(nom, enfant=nom.startswith('enfant_'))
    for nom, src in DEFAUTS.items():
        planches[src].save(os.path.join(F.ASSETS, f'{nom}.png'))
    print(f'{len(noms)} planches écrites dans assets/personnages/, et ' + ', '.join(f'assets/{n}.png' for n in DEFAUTS))
    if '--apercu' in sys.argv:
        choix = [planches[n] for n in noms[:3]]
        out = Image.new('RGBA', (choix[0].width * 3 + 16, choix[0].height), (0, 0, 0, 0))
        for i, sh in enumerate(choix):
            out.alpha_composite(sh, (i * (sh.width + 8), 0))
        F.apercu(out, 'apercu_chibi.png', 5, (126, 170, 92))


if __name__ == '__main__':
    main()
