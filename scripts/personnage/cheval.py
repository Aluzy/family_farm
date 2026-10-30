# Le cheval (js/engine/cheval.js) et son matériel, dessinés ici en entier :
#   - assets/cheval.png (cases de 48 × 40, les sabots sur la rangée 38) : le cheval seul, un bai
#     à crinière noire, une liste blanche sur le chanfrein, une balzane. 0 : de profil (tourné vers
#     la droite) au repos ; 1..4 : de profil, les quatre temps du pas ; 5 : de profil, il broute ;
#     6..9 : de face (il vient vers nous), quatre temps ; 10..13 : de dos (il s'en va), de même.
#     Il vit dans l'Écurie (js/carte/ferme/chantier.js, syncBeasts) et attend, attaché au poteau,
#     sur les cartes d'excursion (js/carte/cheval.js).
#   - assets/cheval_monte.png (mêmes cases) : le cheval sellé sous le personnage : pour chaque
#     vue (bas : de face ; haut : de
#     dos ; cote : de profil), pour chaque temps du pas (0..3, puis 4 : à l'arrêt), la couche
#     « dessous » (derrière le cavalier) puis « dessus » (devant lui). C'est le même cheval que
#     seul : de face, sa tête et les bottes passent devant le cavalier ; de dos, sa croupe et sa
#     queue. Le personnage y est assis (ses cases assis_<vue>), CHEVAL.monte px au-dessus de ses
#     pieds (js/carte/cheval.js).
#   - assets/poteau_attache.png (16 × 32) : le poteau d'attache, un pieu équarri et son anneau de
#     fer, vu de haut à 45° comme les blocs (scripts/carte/blocs.py) ; la corde va de l'anneau
#     (ANNEAU) au licol du cheval.
#   - assets/meuble_ratelier.png (16 × 32) : le râtelier de l'Écurie (son bloc clé), une grille de
#     bois pleine de foin au-dessus d'une auge, à 45° comme les blocs.
# Lumière en haut à gauche, contour sombre.
#
# Les retouches du joueur (fiche 12, docs/fiches/12-cheval-retouche.png) : il a redessiné à la main
# les cases 0 (au repos) et 5 (il broute). Ce script les redonne au pixel près (main() le vérifie
# quand la planche retouchée est là) : leurs têtes sont des motifs recopiés lettre pour lettre
# (TETE_HAUTE, ENCOLURE_BASSE, TETE_BASSE), le reste suit les règles qu'on en a tirées, appliquées
# aussi aux cases qu'il n'a pas touchées (les quatre temps du pas, de face, de dos), au cheval sellé
# et à l'attelage de la calèche (scripts/carte/caleche.py) :
#   - la tête haute : le chanfrein droit, d'un pixel plus étroit (le contour suit la pente du front
#     au nez, sans marche) ; l'oreille de 2 px, pointue (sa pointe d'un pixel, ombrée 's'), détachée
#     du front par le contour ; le toupet noir sur le front, le reflet 'c' au-dessus de l'œil ;
#   - le bout du nez : un bloc carré 'n' de 3 à 4 px, plus large que le chanfrein (il dépasse d'un
#     pixel vers l'avant), le naseau 'e' au milieu du bloc (et non plus dans son coin) ; le menton
#     plat, la ganache et le dessous de la mâchoire fermés par une ligne droite de contour ;
#   - la crinière : deux pixels de crins 'm' (un reflet 'M' tous les trois) le long de l'encolure, le
#     contour posé directement sur eux ; elle s'arrête au garrot en s'amincissant (plus de crins sur le
#     dos) ; tête baissée, elle devient une bande épaisse (3 à 4 px) qui fait tout le dessus de
#     l'encolure, une mèche dressée au garrot, et le toupet tombe sur le front ;
#   - la tête baissée (il broute) : verticale, le chanfrein droit sur l'avant, la liste blanche le
#     long de ce bord jusqu'au nez carré ; pas d'oreille visible ;
#   - le poitrail : il rentre en biais (POITRAIL) jusqu'à l'avant-bras, sans bosse devant les
#     antérieurs ; le dos : la croupe ronde, sans le pixel qui dépassait au-dessus ;
#   - les sabots : deux pixels 'h', juste sous le canon (plus de pince ni de talon qui dépasse) ; dans
#     chaque paire, la jambe de droite finit une rangée plus haut (37) que celle de gauche (38), et
#     entre les deux sabots posés le contour s'ouvre d'un pixel ; au repos, d'aplomb, un coin de
#     contour arrondit le dessous des sabots ;
#   - la queue, les couleurs de la robe, la balzane, la liste : inchangées.
# De face et de dos (pas de retouche à reprendre telle quelle) : les mêmes règles, à leur échelle —
# les oreilles pointues (leur pointe 's'), le bout du nez carré, plus large que le chanfrein, les
# naseaux dedans, la liste arrêtée au-dessus ; la crinière arrêtée au garrot, ses reflets 'M'.
#
#   python3 scripts/personnage/cheval.py            écrit les images
#   python3 scripts/personnage/cheval.py --apercu   écrit aussi apercu_cheval.png (agrandi)
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'carte'))  # blocs.py
from blocs import BOIS, OUT as OUT_BLOCS, boite, planches  # noqa: E402
from pixel import ASSETS, apercu, contour  # noqa: E402

W, H = 48, 40
OUT = (40, 24, 20)
ROBE = {
    'c': (186, 120, 66), 'b': (152, 92, 48), 's': (114, 64, 34), 'S': (84, 46, 26),   # la robe baie
    'm': (52, 34, 28), 'M': (82, 56, 44),                                             # crins noirs
    'h': (44, 36, 34), 'w': (236, 228, 214), 'e': (24, 16, 14), 'n': (126, 84, 62),   # sabots, blanc, œil, nez
    'L': (70, 40, 30), 'l': (110, 64, 40), 'B': (52, 92, 150), 'f': (160, 160, 168),  # selle, tapis bleu, étrier
}
FER = [(30, 40, 51), (100, 112, 126), (154, 168, 184), (223, 231, 239)]
FOIN = [(150, 128, 52), (176, 150, 60), (210, 184, 86), (232, 212, 120)]
ANNEAU = (11, 17)                # l'anneau du poteau (px de son image) : là où la corde s'attache


class Toile:
    """Le dessin d'une case : des lettres de ROBE par pixel, puis le contour (image()) ; les
    motifs dessinés à la main (MOTIFS) se posent par-dessus, après le contour, tels quels."""

    def __init__(self):
        self.px = {}
        self.motifs = []          # [(x0, y0, rangées)] : posés après le contour
        self.apres = {}           # des lettres posées après le contour et les motifs (la bride)
        self.trous = set()        # des pixels de contour ôtés (entre deux sabots)
        self.coins = set()        # des pixels de contour ajoutés (les coins sous les sabots)

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[(x, y)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def ovale(self, x0, y0, x1, y1, c, k=1):
        """Un rectangle aux coins rognés de k px (en escalier)."""
        for y in range(y0, y1 + 1):
            d = max(0, k - min(y - y0, y1 - y))
            self.rect(x0 + d, y, x1 - d, y, c)

    def poly(self, pts, c):
        m = Image.new('1', (W, H), 0)
        ImageDraw.Draw(m).polygon(pts, fill=1)
        for y in range(H):
            for x in range(W):
                if m.getpixel((x, y)):
                    self.put(x, y, c)

    def motif(self, x0, y0, rangees):
        """Un motif de MOTIFS, son coin haut-gauche en (x0, y0) : il remplace tout ce qu'il
        couvre, son contour compris ('o' : le contour, '.' : transparent)."""
        self.motifs.append((x0, y0, rangees))

    def image(self):
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), ROBE[c] + (255,))
        im = contour(im, OUT)
        for x0, y0, rangees in self.motifs:
            for j, r in enumerate(rangees):
                for i, c in enumerate(r):
                    x, y = x0 + i, y0 + j
                    if 0 <= x < W and 0 <= y < H:
                        im.putpixel((x, y), (0, 0, 0, 0) if c == '.' else (OUT if c == 'o' else ROBE[c]) + (255,))
        for (x, y), c in self.apres.items():
            if 0 <= x < W and 0 <= y < H:
                im.putpixel((x, y), ROBE[c] + (255,))
        for x, y in self.trous:
            if 0 <= x < W and 0 <= y < H and im.getpixel((x, y))[:3] == OUT:
                im.putpixel((x, y), (0, 0, 0, 0))
        for x, y in self.coins:
            if 0 <= x < W and 0 <= y < H and not im.getpixel((x, y))[3]:
                im.putpixel((x, y), OUT + (255,))
        return im


# ---------- les motifs dessinés à la main (fiche 12) ----------
# Repris lettre pour lettre des cases retouchées par le joueur (0 : au repos ; 5 : il broute),
# contour compris : la tête haute, son encolure et sa crinière (coin haut-gauche en (28, 0)) ;
# la tête baissée vers l'herbe, en deux morceaux (en (28, 12), puis en (34, 24)).
TETE_HAUTE = [
    '.....oso............',
    '.....obbo...........',
    '.....obbo...........',
    '....ommbboo.........',
    '....omcccbbo........',
    '...ommmbbbbbo.......',
    '...ommbbebwbbo......',
    '...omMbbbbbwwbo.....',
    '..ommbbbbbbbbwbo....',
    '..ommbbsssbbbbbbo...',
    '..omMbbsssbbbbnnno..',
    '.ommbbbsssbbbbneno..',
    '.ommbbbbbbbbbnnnno..',
    'oomMbbbbbbbooonnno..',
    'ommbbbbbbbo...ooo...',
    'bmbbbbbbbbo.........',
    'bbbbbbbbbbo.........',
]
ENCOLURE_BASSE = [
    '....................',
    '..oo.o..............',
    'oommomo.............',
    'bbmmmmmo............',
    'bbbmmmmo............',
    'bbbbmmmmo...........',
    'bbbbbmmmmo..........',
    'bbbbbbmmmo..........',
    'bbbbbbbmmmo.........',
    'bbbbbbbbmmooooo.....',
    'bbbbbbbbbbbbbbbo....',
    'bbbbbbbbbbbbbmo.....',
]
TETE_BASSE = [
    'bbbbbbbo......',
    'bbbbbbbmm.....',
    'obbbbebmo.....',
    '.obbbbbwo.....',
    '..obbbbwo.....',
    '..obbbbwo.....',
    '..obbbbwwo....',
    '...obbbbwo....',
    '...obbnnno....',
    '....onneno....',
    '....onnnno....',
    '.....oooo.....',
]
# le poitrail (tête haute) : la dernière colonne du corps, par rangée (19..26) ; il rentre en
# biais jusqu'à l'avant-bras
POITRAIL = {20: 35, 21: 35, 22: 34, 23: 34, 24: 33, 25: 33, 26: 32}


# ---------- de profil ----------

def jambe(t, x, y0, lev, fonce, arriere=False, courte=False):
    """Une jambe (x : son bord gauche) du corps (y0) au sol : l'avant-bras ou la cuisse de 3 px,
    le canon de 2, le sabot de 2 sous le canon (rangée 38 ; courte : 37, la jambe de droite de
    la paire) ; lev : le sabot levé de lev px, replié vers l'arrière."""
    c1, c2 = ('s', 'S') if fonce else ('b', 's')
    genou = 30 if arriere else 31
    for y in range(y0, genou):
        t.put(x, y, c1); t.put(x + 1, y, c1); t.put(x + 2, y, c2)
    if arriere:                                   # le jarret, en arrière
        t.put(x - 1, y0 + 1, c1); t.put(x - 1, y0 + 2, c1)
    bas = 37 - lev - (1 if courte and not lev else 0)
    dx = -1 if lev else 0
    for y in range(genou, bas + 1):
        d = dx if y > genou + 1 else 0
        t.put(x + 1 + d, y, c1); t.put(x + 2 + d, y, c2)
    t.rect(x + 1 + dx, bas + 1, x + 2 + dx, bas + 1, 'h')


# les quatre temps du pas : le sabot levé (px) de l'antérieur proche, l'antérieur loin, le
# postérieur proche, le postérieur loin ; aux temps 1 et 3, le corps monte d'un px
PAS = [(0, 3, 3, 0), (0, 0, 0, 0), (3, 0, 0, 3), (0, 0, 0, 0)]


def profil(pose='idle', k=0, selle=False, harnais=False):
    """De profil, tourné vers la droite : 'idle', 'marche' (temps k) ou 'broute' ; sellé et bridé
    (selle) sous le cavalier ; harnais : bridé, le collier et la sellette de l'attelage (la
    calèche, scripts/carte/caleche.py, qui tire les rênes jusqu'aux mains du cocher)."""
    t = Toile()
    lev = PAS[k] if pose == 'marche' else (0, 0, 0, 0)
    u = 1 if pose == 'marche' and k % 2 == 1 else 0
    # côté loin : l'antérieur est la jambe de droite de sa paire (courte), le postérieur celle de gauche
    jambe(t, 30, 24 - u, lev[1], True, courte=True); jambe(t, 13, 24 - u, lev[3], True, True)
    # la queue, tombante, épaisse en haut
    for i, (x, y) in enumerate([(10, 15), (8, 16), (7, 17), (6, 18), (6, 19), (5, 20), (5, 21), (5, 22),
                                (5, 23), (5, 24), (6, 25), (6, 26), (7, 27)]):
        for j in range(3 if i < 6 else 2):
            t.put(x + j, y - u, 'M' if (j == 0 and i % 3 == 1) else 'm')
    # le corps : le dos creusé, la croupe ronde (sans bosse), le ventre
    t.poly([(11, 16 - u), (14, 13 - u), (20, 14 - u), (27, 14 - u), (33, 15 - u), (36, 19 - u), (35, 25 - u),
            (31, 27 - u), (17, 27 - u), (12, 25 - u), (10, 20 - u)], 'b')
    t.px.pop((14, 13 - u), None)
    t.rect(14, 14 - u, 19, 14 - u, 'c'); t.rect(12, 15 - u, 22, 15 - u, 'c'); t.rect(11, 16 - u, 14, 19 - u, 'c')
    t.rect(17, 26 - u, 30, 27 - u, 's'); t.rect(12, 23 - u, 16, 25 - u, 's')
    t.rect(13, 18 - u, 14, 21 - u, 'b')
    if pose == 'broute':
        t.poly([(29, 15), (33, 14), (40, 25), (37, 28), (31, 21)], 'b')            # l'encolure baissée
        t.motif(28, 12, ENCOLURE_BASSE); t.motif(34, 24, TETE_BASSE)
    else:
        t.poly([(29, 16 - u), (33, 6 - u), (37, 6 - u), (37, 12 - u), (36, 21 - u), (31, 22 - u)], 'b')   # l'encolure
        t.rect(34, 13 - u, 36, 21 - u, 'b')
        for y, x in POITRAIL.items():                                 # le poitrail rentré
            for xx in range(x + 1, W):
                t.px.pop((xx, y - u), None)
        t.motif(28, -u, TETE_HAUTE)
        if selle or harnais:                                          # la bride : la têtière, la muserolle
            for y in range(4, 11):
                t.apres[(37, y - u)] = 'L'
            for x in range(38, 42):
                t.apres[(x, 10 - u)] = 'L'
        if selle:                                                     # les rênes, jusqu'au garrot
            for i in range(9):
                t.apres[(41 - i * 12 // 9, 12 + i * 3 // 9 - u)] = 'L'
        if harnais:                                                   # le collier, à la base de l'encolure
            for i in range(9):
                t.apres[(31 + i * 5 // 9, 14 + i - u)] = 'L'
                t.apres[(32 + i * 5 // 9, 14 + i - u)] = 'l'
    # côté proche : l'antérieur est la jambe de gauche de sa paire, le postérieur celle de droite (courte)
    jambe(t, 27, 24 - u, lev[0], False); jambe(t, 16, 24 - u, lev[2], False, True, courte=True)
    t.rect(28, 35 - lev[0], 29, 36 - lev[0], 'w')                     # la balzane
    # (entre les deux sabots posés d'une paire, le contour s'ouvre d'un pixel)
    if not lev[0] and not lev[1]:
        t.trous.add((30, 38))
    if not lev[2] and not lev[3]:
        t.trous.add((16, 38))
    if pose == 'idle':                       # au repos, d'aplomb : les sabots arrondis d'un coin de contour
        t.coins.update({(13, 39), (19, 38), (27, 39), (33, 38)})
    if selle:                                                         # la selle sur son tapis
        t.rect(17, 15 - u, 27, 19 - u, 'B'); t.rect(17, 19 - u, 27, 19 - u, 'L')
        t.rect(18, 13 - u, 26, 15 - u, 'L'); t.rect(18, 13 - u, 19, 12 - u, 'l'); t.rect(25, 12 - u, 26, 13 - u, 'L')
        t.rect(20, 13 - u, 24, 13 - u, 'l')
        t.rect(21, 20 - u, 21, 25 - u, 'h'); t.rect(20, 26 - u, 22, 26 - u, 'f')   # l'étrivière, l'étrier
    if harnais:                                                       # la sellette et sa sangle
        t.rect(20, 13 - u, 24, 15 - u, 'L'); t.rect(21, 13 - u, 23, 13 - u, 'l')
        t.rect(22, 16 - u, 22, 26 - u, 'L')
        t.rect(25, 18 - u, 30, 18 - u, 'L')                           # le trait, du collier vers la voiture
    return t


# ---------- de face, de dos ----------

# les temps du pas de face et de dos : (antérieur gauche levé, droit levé, le corps levé) ; 4 : à l'arrêt
TEMPS = [(1, 0, 0), (0, 0, 1), (0, 1, 0), (0, 0, 1), (0, 0, 0)]


def face(k=0, couche='tout', selle=False):
    """De face (il vient vers nous). couche : 'tout', 'corps' (le poitrail, les jambes : derrière
    le cavalier) ou 'tete' (la tête, la crinière : devant lui)."""
    t = Toile()
    g, d, up = TEMPS[k]
    if couche != 'tete':
        for x, lv in ((19, d), (27, g)):                              # les postérieurs, derrière
            t.rect(x, 26 - up, x + 1, 35 - lv, 's'); t.rect(x, 36 - lv, x + 1, 36 - lv, 'h')
        t.ovale(17, 15 - up, 30, 28 - up, 'b', 3)                     # le poitrail, le corps derrière
        t.rect(19, 15 - up, 28, 16 - up, 'c')
        t.rect(17, 26 - up, 30, 28 - up, 's')
        for x, lv in ((20, g), (26, d)):                              # les antérieurs
            t.rect(x, 26 - up, x + 1, 37 - lv, 'b'); t.put(x + 1, 30 - up, 's')
            t.rect(x, 38 - lv, x + 1, 38 - lv, 'h')
        t.rect(20, 35 - g, 21, 37 - g, 'w')
        if selle:                                                     # la selle, de part et d'autre
            t.rect(15, 16 - up, 16, 21 - up, 'B'); t.rect(31, 16 - up, 32, 21 - up, 'B')
    if couche != 'corps':
        t.ovale(20, 4 - up, 27, 18 - up, 'b', 2)                      # la tête, longue
        t.rect(20, 4 - up, 21, 13 - up, 'c')
        t.rect(21, 15 - up, 26, 18 - up, 'n')                         # le bout du nez, carré, plus large
        t.put(22, 16 - up, 'e'); t.put(25, 16 - up, 'e')              # les naseaux, dedans
        t.rect(23, 6 - up, 24, 13 - up, 'w')                          # la liste, jusqu'au-dessus du nez
        t.put(20, 8 - up, 'e'); t.put(27, 8 - up, 'e')                # les yeux
        t.rect(19, 2 - up, 20, 4 - up, 'b'); t.rect(27, 2 - up, 28, 4 - up, 'b')   # les oreilles, pointues
        t.put(19, 1 - up, 's'); t.put(28, 1 - up, 's')
        t.rect(22, 3 - up, 25, 6 - up, 'm')                           # le toupet
        for x in (16, 30):                                            # la crinière, des deux côtés, jusqu'au garrot
            t.rect(x, 13 - up, x + 1, 19 - up, 'm')
            t.put(x if x < 20 else x + 1, 14 - up, 'M'); t.put(x if x < 20 else x + 1, 17 - up, 'M')
        if selle:                                                     # la bride ; les bottes du cavalier
            t.rect(20, 14 - up, 20, 16 - up, 'L'); t.rect(27, 14 - up, 27, 16 - up, 'L')
            t.rect(14, 18 - up, 14, 22 - up, 'L'); t.rect(33, 18 - up, 33, 22 - up, 'L')
            t.put(14, 23 - up, 'f'); t.put(33, 23 - up, 'f')
    return t


def dos(k=0, couche='tout', selle=False):
    """De dos (il s'en va). couche : 'tout', 'nuque' (les oreilles, la crinière : derrière le
    cavalier) ou 'croupe' (la croupe, la queue, les postérieurs : devant lui)."""
    t = Toile()
    g, d, up = TEMPS[k]
    if couche != 'croupe':
        t.rect(21, 3 - up, 22, 5 - up, 'b'); t.rect(25, 3 - up, 26, 5 - up, 'b')   # les oreilles, pointues, au loin
        t.put(21, 2 - up, 's'); t.put(26, 2 - up, 's')
        t.ovale(20, 4 - up, 27, 13 - up, 'm', 2)                      # la nuque, la crinière
        t.rect(23, 5 - up, 24, 15 - up, 'M')
        if selle:                                                     # la selle, sous le cavalier
            t.rect(15, 12 - up, 32, 16 - up, 'B'); t.rect(17, 11 - up, 30, 13 - up, 'L')
    if couche != 'nuque':
        for x, lv in ((19, g), (27, d)):                              # les postérieurs, devant
            t.rect(x, 27 - up, x + 1, 37 - lv, 'b'); t.rect(x, 38 - lv, x + 1, 38 - lv, 'h')
        t.ovale(16, 13 - up, 31, 29 - up, 'b', 4)                     # la croupe
        t.rect(19, 13 - up, 28, 15 - up, 'c'); t.rect(16, 18 - up, 17, 25 - up, 'c')
        t.rect(17, 27 - up, 30, 29 - up, 's')
        t.rect(23, 15 - up, 24, 31 - up, 'm'); t.rect(22, 18 - up, 25, 30 - up, 'm')   # la queue
        t.rect(23, 19 - up, 23, 29 - up, 'M')
    return t


# ---------- les planches ----------

def planche_seul():
    poses = [profil('idle')] + [profil('marche', k) for k in range(4)] + [profil('broute')] \
        + [face(k) for k in range(4)] + [dos(k) for k in range(4)]
    return rangee([p.image() for p in poses])


VUES = ['bas', 'haut', 'cote']


def monte(vue, k):
    """[dessous, dessus] : le cheval sellé, temps k du pas (4 : à l'arrêt)."""
    vide = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if vue == 'cote':
        return [(profil('idle', selle=True) if k == 4 else profil('marche', k, selle=True)).image(), vide]
    if vue == 'bas':
        return [face(k, 'corps', True).image(), face(k, 'tete', True).image()]
    return [dos(k, 'nuque', True).image(), dos(k, 'croupe', True).image()]


def planche_monte():
    return rangee([im for v in VUES for k in range(5) for im in monte(v, k)])


def rangee(ims):
    out = Image.new('RGBA', (W * len(ims), H), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        out.alpha_composite(im, (i * W, 0))
    return out


class Petite:
    """Une image w × h et son pinceau (pour les blocs de blocs.py)."""

    def __init__(self, w, h):
        self.W, self.H = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        if 0 <= x < self.W and 0 <= y < self.H and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)

    def fini(self):
        return contour(self.im, OUT_BLOCS)


def poteau():
    """Le poteau d'attache, vu à 45° : un pieu équarri, planté, l'anneau de fer à droite."""
    t = Petite(16, 32)
    base = 30
    yd, yf = boite(t, 6, 9, base, 20, 4, BOIS, planches(BOIS, 'v', pas=5, x0=6))
    for y in (yd - 1, yd):                                            # le haut, taillé en biseau
        t.put(6, y, BOIS[3]); t.put(9, y, BOIS[2])
    for x in range(5, 11):                                            # la terre tassée au pied
        t.put(x, base, BOIS[0])
    ax, ay = ANNEAU
    for x, y in ((ax - 2, ay - 1), (ax - 1, ay - 2), (ax, ay - 2), (ax + 1, ay - 1), (ax + 1, ay), (ax, ay + 1),
                 (ax - 1, ay + 1), (ax - 2, ay)):
        t.put(x, y, FER[2] if y < ay else FER[1])
    return t.fini()


def ratelier():
    """Le râtelier de l'Écurie : une grille de bois pleine de foin, une auge de planches dessous."""
    t = Petite(16, 32)
    base = 30
    yd, yf = boite(t, 1, 14, base, 9, 6, BOIS, planches(BOIS, 'h', pas=3, y0=1))   # l'auge
    for x in range(3, 13):
        for y in range(yd + 1, yd + 4):
            t.put(x, y, FOIN[1 + (x + y) % 3])
    haut = yd - 15
    for x in (1, 14):                                                 # les montants
        for y in range(haut, yd):
            t.put(x, y, BOIS[2] if x == 1 else BOIS[1])
    for y in range(haut + 1, yd - 1):                                 # le foin derrière les barreaux
        for x in range(2, 14):
            t.put(x, y, FOIN[(x * 3 + y * 5) % 4])
    for x in range(1, 15):                                            # la traverse du haut
        t.put(x, haut, BOIS[3]); t.put(x, haut + 1, BOIS[2])
    for x in (4, 7, 10):                                              # les barreaux
        for y in range(haut + 2, yd):
            t.put(x, y, BOIS[1])
    return t.fini()


RETOUCHE = os.path.join(os.path.dirname(ASSETS), 'docs', 'fiches', '12-cheval-retouche.png')
RETOUCHEES = (0, 5)             # les cases retouchées par le joueur


def verifie(planche):
    """Les cases retouchées sont-elles, au pixel près, celles de la planche du joueur ?"""
    if not os.path.exists(RETOUCHE):
        return
    ref = Image.open(RETOUCHE).convert('RGBA')
    for c in RETOUCHEES:
        boite = (c * W, 0, c * W + W, H)
        a, b = planche.crop(boite).load(), ref.crop(boite).load()
        ecarts = [(x, y) for y in range(H) for x in range(W)
                  if (a[x, y] if a[x, y][3] else 0) != (b[x, y] if b[x, y][3] else 0)]
        if ecarts:
            sys.exit(f'cheval.png, case {c} : {len(ecarts)} pixels diffèrent de la retouche ({ecarts[:5]}…)')


def main():
    verifie(planche_seul())
    images = {'cheval.png': planche_seul(), 'cheval_monte.png': planche_monte(),
              'poteau_attache.png': poteau(), 'meuble_ratelier.png': ratelier()}
    for nom, im in images.items():
        im.save(os.path.join(ASSETS, nom))
    if '--apercu' in sys.argv:
        hauteur = sum(im.height + 4 for im in images.values())
        tout = Image.new('RGBA', (max(im.width for im in images.values()), hauteur), (0, 0, 0, 0))
        y = 0
        for im in images.values():
            tout.alpha_composite(im, (0, y))
            y += im.height + 4
        apercu(tout, 'apercu_cheval.png', zoom=3, fond=(112, 164, 84))


if __name__ == '__main__':
    main()
