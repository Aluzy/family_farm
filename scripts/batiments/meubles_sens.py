# Les meubles tournés (le mode Construire : ↻ Tourner) : pour chaque meuble qui tourne, sa vue de dos
# (assets/meuble_<id>_dos.png : on voit son dos, sa face regarde le mur du fond) et sa vue de profil
# (assets/meuble_<id>_cote.png : sa face regarde à droite ; tourné vers la gauche, la carte la retourne en
# miroir). Même vue de haut à 45° que les meubles de face (scripts/batiments/meubles.py, meubles45.py) : le
# dessus, puis la face qu'on voit ; le bas de l'image est le bas de sa case.
#
# De profil, un meuble de plusieurs cases de large tient autant de cases de haut (data/recipes.json,
# ATELIER.BLOCS[].tourne : l'emprise tourne avec lui, js/engine/blocs.js empriseMeuble) : son dessus
# s'allonge vers le haut (la première case raccourcie comme celle d'un bloc, les suivantes entières,
# comme une rangée de murs, scripts/carte/blocs.py) ; ce qu'on voit devant, c'est son flanc.
#
# Les plantes, la poubelle et le lampadaire sont ronds : ils tournent en miroir (ATELIER.BLOCS[].tourne :
# « symetrique »), sans image en plus. Les lits et le réfrigérateur tournent aussi (A-1) : leurs vues sont
# dessinées ici, et pour les lits, la couverture seule de chaque vue (meuble_<lit>_dos_drap.png,
# _cote_drap.png), posée sur le dormeur comme celle de face. Les tableaux, accrochés au mur, ne tournent pas.
#
#   python3 scripts/batiments/meubles_sens.py            écrit les images
#   python3 scripts/batiments/meubles_sens.py --apercu   écrit aussi apercu_meubles_sens.png (face, profil,
#                                                        dos, côte à côte)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meubles as M  # noqa: E402
import meubles45 as M45  # noqa: E402
from meubles45 import (T, BOIS, BLEU, SAUGE, BLANC, LAITON, ROUGE, JAUNE, VERT, PAILLE, FER, CREME, MIROIR,  # noqa: E402
                       ell, livres, poignee, tiroir)
from blocs import HAUT, FOND  # noqa: E402
from pixel import ASSETS, ROOT  # noqa: E402

# les tons des meubles du Marché (meubles.py), en rampes du plus sombre au plus clair
C = M.C
BOIS_M = [C['w0'], C['w1'], C['w2'], C['w3'], C['w4']]
VERT_M = [C['V0'], C['V0'], C['V1'], C['V2'], C['V2']]
NAPPE = [C['c0'], C['c0'], C['c1'], C['c2'], C['c2']]


def long_dessus(L):
    """La hauteur à l'écran du dessus d'un meuble long de L px (d'avant en arrière) : sa première case
    raccourcie comme le dessus d'un bloc (FOND), les suivantes entières."""
    return round(min(L, 16) * FOND) + max(0, L - 16)


def caisson(t, x0, x1, base, hf, ht, dessus, face, arete=True):
    """Un pavé vu de haut : sa face (hf px de haut à l'écran) posée sur la rangée `base`, de x0 à x1, son
    dessus (ht px) au-dessus. dessus, face : une rampe (le dessus clair, la face au ton moyen, bord gauche
    éclairé, bord droit dans l'ombre) ou une fonction (x, y) → couleur. → (haut du dessus, haut de la face)."""
    yf, yd = base - hf + 1, base - hf - ht + 1
    fd = dessus if callable(dessus) else (lambda x, y, r=dessus: r[4] if x == x0 else r[3])
    ff = face if callable(face) else (lambda x, y, r=face: r[3] if x == x0 else r[1] if x == x1 else r[2])
    for y in range(yd, yf):
        for x in range(x0, x1 + 1):
            t.put(x, y, fd(x, y))
    for y in range(yf, base + 1):
        for x in range(x0, x1 + 1):
            t.put(x, y, ff(x, y))
    if arete and hf and not callable(dessus):
        t.rect(x0, yf - 1, x1, yf - 1, dessus[4])
    return yd, yf


def planches(r, pas=4, x0=0):
    """Un dos de planches debout : joints sombres tous les `pas` px."""
    return lambda x, y: r[1] if (x - x0) % pas == pas - 1 else r[2]


def flanc(t, r, x0, x1, y0, y1):
    """Un flanc de meuble : le panneau, son cadre (clair en haut et à gauche, sombre en bas et à droite)."""
    t.rect(x0, y0, x1, y1, r[2])
    t.rect(x0, y0, x1, y0, r[3]); t.rect(x0, y0, x0, y1, r[3])
    t.rect(x0, y1, x1, y1, r[1]); t.rect(x1, y0, x1, y1, r[1])
    if x1 - x0 >= 6 and y1 - y0 >= 6:
        t.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, r[2])
        t.rect(x0 + 2, y0 + 2, x1 - 2, y0 + 2, r[1]); t.rect(x0 + 2, y0 + 2, x0 + 2, y1 - 2, r[1])


def pieds(t, xs, y0, y1, r=BOIS):
    for x in xs:
        t.rect(x, y0, x, y1, r[2]); t.rect(x + 1, y0, x + 1, y1, r[1])


def bord_avant(t, r, x, y0, y1):
    """De profil, le chant de la face avant (à droite) : une ligne claire, et ses poignées."""
    t.rect(x, y0, x, y1, r[3])


# ---------------------------------------------------------------- les meubles du Marché (meubles.py)

def chaise_dos():
    """De dos : le dossier à barreaux devant, l'assise derrière lui, les quatre pieds."""
    W, H = 14, 22
    t = T(W, H)
    caisson(t, 0, W - 1, 13, 2, 6, BOIS_M, BOIS_M)                       # l'assise, derrière
    t.rect(1, 18, 2, 21, BOIS_M[1]); t.rect(11, 18, 12, 21, BOIS_M[1])   # les pieds du fond
    t.rect(1, 0, 12, 1, BOIS_M[3])                                       # le haut du dossier
    for x in (1, 4, 7, 10, 12):
        t.rect(x, 2, x, 15, BOIS_M[2] if x < 12 else BOIS_M[1])
    t.rect(1, 14, 12, 15, BOIS_M[2]); t.rect(1, 14, 12, 14, BOIS_M[3])   # la traverse
    t.rect(1, 16, 2, 21, BOIS_M[2]); t.rect(11, 16, 12, 21, BOIS_M[2])   # les pieds de devant (le dos)
    return t.fini()


def chaise_cote():
    """De profil, tournée à droite : le dossier à gauche, de chant ; l'assise, son flanc ; les pieds."""
    W, H = 16, 22
    t = T(W, H)
    yd, yf = caisson(t, 2, 13, 17, 2, 6, BOIS_M, BOIS_M)                 # l'assise
    t.rect(2, 0, 4, yf - 1, BOIS_M[2]); t.rect(2, 0, 4, 0, BOIS_M[4])   # le dossier, de chant
    t.rect(3, 1, 3, yf - 2, BOIS_M[3])
    t.rect(2, 18, 3, 21, BOIS_M[1]); t.rect(12, 18, 13, 21, BOIS_M[1])
    t.rect(5, 19, 11, 19, BOIS_M[1])                                     # la traverse du bas
    return t.fini()


def table_dos():
    """La table, de l'autre côté : le plateau (la nappe, le bol, le pichet vus de l'autre côté)."""
    im = M.table().transpose(Image.FLIP_LEFT_RIGHT)
    return im


def table_cote():
    """La table de profil (3 cases de haut) : le long plateau, la nappe, le bol de fruits, le pichet ;
    le chant du bout, deux pieds."""
    L = 40
    ht = long_dessus(L)
    W, H = 16, ht + 3 + 6
    t = T(W, H)
    yd, yf = caisson(t, 1, 14, H - 7, 3, ht, BOIS_M, BOIS_M)
    pieds(t, (2, 11), H - 6, H - 1, BOIS_M)
    t.rect(4, yd + 8, 11, yf - 8, NAPPE[3]); t.rect(4, yf - 8, 11, yf - 8, NAPPE[2])   # la nappe
    for y in range(yd + 12, yd + 22):                                    # le bol de fruits
        for x in range(4, 12):
            if ((x - 7.5) / 3.6) ** 2 + ((y - yd - 17) / 4.8) ** 2 <= 1:
                t.put(x, y, C['t1'] if x > 8 else C['t2'])
    for x, y, k in ((6, 14, 'R1'), (8, 15, 'J1'), (6, 17, 'g2'), (8, 18, 'R2'), (7, 19, 'J2')):
        t.put(x, yd + y, C[k])
    t.rect(6, yd + 26, 9, yd + 29, C['b2']); t.rect(6, yd + 26, 9, yd + 26, C['b3'])   # le pichet
    return t.fini()


def tapis_tourne(n):
    """Un tapis tourné d'un quart de tour, aux mesures des cases qu'il couvre de profil (3 de haut ; le
    rouge : 2 de large) : le même motif que de face (meubles.py tapis), les franges en haut et en bas,
    les rayures du bleu dans l'autre sens."""
    W, H = (14, 44) if n != 2 else (30, 44)
    im = M.canvas(W, H)
    put, _ = M.painter(im)
    cx, cy = (W - 1) / 2, (H - 1) / 2
    for y in range(H):
        for x in range(W):
            if n == 1:
                d = ((x - cx) / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2
                if d > 1:
                    continue
                put(x, y, ('c2', 'c1', 'c0', 'c1', 'c0')[int(d * 5) % 5])
            elif n == 2:
                if y in (0, H - 1):
                    if x % 2 == 0:
                        put(x, y, 'c1')
                    continue
                if 3 <= x <= W - 4 and 3 <= y <= H - 4:
                    k = 'R2' if (abs(x - cx) + abs(y - cy)) % 6 < 2 else 'R1'
                else:
                    k = 'J1' if (x + y) % 4 == 0 else 'R0'
                put(x, y, k)
            else:
                k = 'B1' if (x // 3) % 2 else 'B2'
                if x in (1, W - 2):
                    k = 'c2'
                put(x, y, k)
    M.outline(im)
    return im


def chevet_dos():
    """La table de chevet de dos : son dos de planches, la lampe sur le dessus."""
    W, H = 14, 22
    t = T(W, H)
    caisson(t, 0, W - 1, 20, 8, 5, BOIS_M, planches(BOIS_M, 4))
    t.rect(1, 21, 2, 21, BOIS_M[0]); t.rect(11, 21, 12, 21, BOIS_M[0])
    t.rect(5, 9, 8, 11, C['i2'])
    for y in range(2, 8):
        for x in range(3, 11):
            if abs(x - 6.5) <= 2 + (y - 2) * 0.5:
                t.put(x, y, C['J2'] if x > 6 else C['J1'])
    return t.fini()


def chevet_cote():
    """La table de chevet de profil : son flanc, le chant du tiroir à droite, la lampe."""
    W, H = 16, 22
    t = T(W, H)
    yd, yf = caisson(t, 3, 12, 20, 8, 7, BOIS_M, BOIS_M)
    flanc(t, BOIS_M, 3, 12, yf, 20)
    bord_avant(t, BOIS_M, 12, yf, 20); t.put(12, yf + 3, C['i3'])
    t.rect(3, 21, 4, 21, BOIS_M[0]); t.rect(11, 21, 12, 21, BOIS_M[0])
    t.rect(6, yd + 1, 9, yd + 3, C['i2'])
    for y in range(yd - 7, yd + 1):
        for x in range(3, 13):
            if abs(x - 7.5) <= 2 + (y - yd + 7) * 0.5:
                t.put(x, y, C['J2'] if x < 8 else C['J1'])
    return t.fini()


def canape_dos():
    """Le canapé de dos : le dos rembourré devant, le haut des coussins derrière, les accoudoirs."""
    W, H = 46, 28
    t = T(W, H)
    for x0 in (6, 18, 30):                                               # les coussins du dossier, derrière
        t.rect(x0, 2, x0 + 9, 6, VERT_M[2]); t.rect(x0, 2, x0 + 9, 2, VERT_M[3])
    caisson(t, 0, 4, 21, 12, 5, VERT_M, VERT_M)                          # les accoudoirs
    caisson(t, W - 5, W - 1, 21, 12, 5, VERT_M, VERT_M)
    caisson(t, 3, W - 4, 23, 15, 3, VERT_M, lambda x, y: VERT_M[1] if (x - 3) % 14 == 13 else VERT_M[2])  # le dos
    t.rect(3, 23, W - 4, 23, VERT_M[0])
    t.rect(2, 24, 3, 27, C['w1']); t.rect(W - 4, 24, W - 3, 27, C['w1'])
    return t.fini()


def canape_cote():
    """Le canapé de profil (3 cases de haut), tourné à droite : le dossier à gauche, les trois coussins
    de l'assise l'un derrière l'autre, l'accoudoir du fond et celui de devant (sa face)."""
    L = 44
    ht = long_dessus(L)
    W, H = 16, ht + 12 + 4
    t = T(W, H)
    base = H - 5
    yd, yf = caisson(t, 1, 14, base, 9, ht, VERT_M, VERT_M)              # l'assise, son flanc
    t.rect(1, yd - 5, 5, yf - 1, VERT_M[2]); t.rect(1, yd - 5, 5, yd - 5, VERT_M[3])   # le dossier, à gauche
    t.rect(5, yd - 4, 5, yf - 1, VERT_M[1])
    for k in range(3):                                                   # les coussins de l'assise
        y0 = yd + 4 + k * (ht - 8) // 3
        y1 = yd + 4 + (k + 1) * (ht - 8) // 3 - 1
        t.rect(6, y0, 13, y1, VERT_M[3]); t.rect(6, y1, 13, y1, VERT_M[1])
    caisson(t, 1, 14, yd + 6, 6, 4, VERT_M, VERT_M)                      # l'accoudoir du fond
    caisson(t, 1, 14, base, 12, 4, VERT_M, lambda x, y: VERT_M[0] if x in (1, 14) else VERT_M[1])  # celui de devant
    t.rect(2, base + 1, 3, H - 1, C['w1']); t.rect(12, base + 1, 13, H - 1, C['w1'])
    return t.fini()


def table_basse_dos():
    return M.table_basse().transpose(Image.FLIP_LEFT_RIGHT)


def table_basse_cote():
    """La table basse de profil (2 cases de haut) : le plateau, la tasse, le livre ; des pieds courts."""
    L = 28
    ht = long_dessus(L)
    W, H = 16, ht + 3 + 4
    t = T(W, H)
    yd, yf = caisson(t, 2, 13, H - 5, 3, ht, BOIS_M, BOIS_M)
    pieds(t, (3, 11), H - 4, H - 1, BOIS_M)
    t.rect(5, yd + 3, 10, yd + 11, C['R1']); t.rect(5, yd + 3, 10, yd + 3, C['R2']); t.rect(5, yd + 10, 10, yd + 11, C['c2'])
    t.rect(6, yf - 7, 9, yf - 4, C['c2']); t.rect(7, yf - 6, 8, yf - 5, C['w0'])
    return t.fini()


# ---------------------------------------------------------------- les rangements (meubles45.py)

def dos_caisson(W, H, base, hf, ht, r, pieds_x=None, corniche=False):
    """Un rangement de dos : son dos de planches, son dessus."""
    t = T(W, H)
    if pieds_x:
        pieds(t, pieds_x, base + 1, H - 1, r)
    yd, yf = caisson(t, 1, W - 2, base, hf, ht, r, planches(r, 4, 1))
    if corniche:
        t.rect(0, yd, W - 1, yf + 1, r[3]); t.rect(0, yd, W - 1, yd, r[4]); t.rect(0, yf + 1, W - 1, yf + 1, r[1])
    return t, yd, yf


def cote_caisson(L, hf, r, pieds_bas=2, corniche=False, x0=2, x1=13):
    """Un rangement de profil, tourné à droite, long de L px (son ancienne largeur) : son dessus qui
    s'allonge vers le haut, son flanc (un panneau), le chant de sa face à droite."""
    ht = long_dessus(L)
    H = ht + hf + pieds_bas
    t = T(16, H)
    base = H - 1 - pieds_bas
    if pieds_bas:
        pieds(t, (x0 + 1, x1 - 2), base + 1, H - 1, r)
    yd, yf = caisson(t, x0, x1, base, hf, ht, r, r)
    flanc(t, r, x0 + 1, x1 - 1, yf + 1, base - 1)
    bord_avant(t, r, x1, yf, base)
    if corniche:
        t.rect(x0 - 1, yd, x1 + 1, yd + 1, r[4]); t.rect(x0 - 1, yf - 1, x1 + 1, yf + 1, r[3]); t.rect(x0 - 1, yf + 1, x1 + 1, yf + 1, r[1])
    return t, yd, yf, base


def buffet_dos():
    t, yd, yf = dos_caisson(32, 42, 39, round(14 * HAUT), round(11 * FOND), BOIS, (2, 28))
    caisson(t, 2, 29, yf + 3, round(18 * HAUT), round(5 * FOND), BOIS, planches(BOIS, 4, 2))   # le haut, de dos
    t.rect(1, yf + 3 - round(18 * HAUT) - 3, 30, yf + 3 - round(18 * HAUT) - 2, BOIS[3])
    return t.fini()


def buffet_cote():
    t, yd, yf, base = cote_caisson(30, round(14 * HAUT), BOIS, x0=1, x1=11)
    # le haut, contre le mur (à gauche) : 5 px de fond, sa corniche ; ses étagères, de chant
    hh = round(18 * HAUT)
    t2 = T(16, t.H + hh)
    t2.im.alpha_composite(t.im, (0, hh))
    t2.rect(1, yd + hh - hh, 5, yf + hh - 1, BOIS[2]); t2.rect(1, yd, 5, yd, BOIS[4])
    t2.rect(5, yd + 1, 5, yf + hh - 1, BOIS[1])
    for y in range(yd + 4, yf + hh, 6):
        t2.rect(1, y, 5, y, BOIS[3])
    t2.rect(7, yf + hh + 6, 10, yf + hh + 10, BLANC[3]); t2.rect(7, yf + hh + 6, 10, yf + hh + 6, BLANC[4])   # la cruche
    return t2.fini()


def commode_dos():
    t, yd, yf = dos_caisson(32, 30, 27, round(14 * HAUT), round(10 * FOND), BOIS, (2, 28))
    t.rect(5, yd - 5, 10, yd + 2, LAITON[1]); t.rect(6, yd - 4, 9, yd + 1, BOIS[1])          # le dos du cadre
    t.rect(21, yd - 2, 26, yd + 3, BLEU[2]); ell(t, 23.5, yd - 2, 2.5, 1.2, BLEU[0])
    for x, y, c in ((21, yd - 6, ROUGE[3]), (24, yd - 8, JAUNE[2]), (26, yd - 5, ROUGE[2])):
        t.rect(x, y, x + 1, y + 1, c)
    return t.fini()


def commode_cote():
    t, yd, yf, base = cote_caisson(30, round(14 * HAUT), BOIS, x0=1, x1=11)
    for k in range(3):                                                   # les chants des tiroirs
        t.put(11, yf + 2 + k * 4, LAITON[3])
    t.rect(4, yd + 3, 8, yd + 9, LAITON[2]); t.rect(5, yd + 4, 7, yd + 8, (168, 210, 236))   # le cadre
    t.rect(4, yf - 9, 8, yf - 4, BLEU[2]); ell(t, 6, yf - 9, 2.2, 1, BLEU[0])               # le vase
    t.rect(4, yf - 12, 5, yf - 11, ROUGE[3]); t.rect(7, yf - 13, 8, yf - 12, JAUNE[2])
    return t.fini()


def armoire_dos(r=BOIS, bande=None):
    t, yd, yf = dos_caisson(32, 46, 43, round(38 * HAUT), round(11 * FOND), r, (2, 28), corniche=True)
    if bande:
        t.rect(0, yf - 1, 31, yf + 1, bande[3]); t.rect(0, yf + 1, 31, yf + 1, bande[1])
    return t.fini()


def armoire_cote(r=BOIS, bande=None):
    t, yd, yf, base = cote_caisson(30, round(38 * HAUT), r, x0=1, x1=11, corniche=True)
    if bande:
        t.rect(0, yf - 1, 12, yf + 1, bande[3]); t.rect(0, yf + 1, 12, yf + 1, bande[1])
    t.put(11, (yf + base) // 2, LAITON[3])
    return t.fini()


def armoire_glace_dos():
    t, yd, yf = dos_caisson(16, 46, 43, round(38 * HAUT), round(10 * FOND), BOIS, (2, 12))
    for x in range(1, 15):                                               # le fronton, de dos
        hx = round(3 * __import__('math').sin(__import__('math').pi * (x - .5) / 14))
        t.rect(x, yf - hx, x, yf + 1, BOIS[2]); t.put(x, yf - hx, BOIS[3])
    return t.fini()


def armoire_glace_cote():
    t, yd, yf, base = cote_caisson(14, round(38 * HAUT), BOIS, x0=3, x1=12)
    t.rect(12, yf + 4, 12, base - 8, MIROIR[2])                          # le chant du miroir
    t.put(12, (yf + base) // 2, LAITON[3])
    return t.fini()


def cuisine_dos(dessus, face):
    t = T(16, 24)
    caisson(t, 1, 14, 22, round(11 * HAUT), round(13 * FOND), dessus, planches(face, 4, 1))
    t.rect(1, 23, 14, 23, face[0])
    return t


def cuisine_cote(dessus, face):
    t = T(16, 24)
    yd, yf = caisson(t, 2, 14, 22, round(11 * HAUT), long_dessus(14), dessus, face)
    flanc(t, face, 3, 13, yf + 1, 21)
    bord_avant(t, face, 14, yf, 22)
    t.rect(2, 23, 14, 23, face[0])
    return t, yd, yf


def cuisine_porte_dos():
    t = cuisine_dos(BOIS, BOIS)
    ell(t, 8.5, 6.5, 4.5, 2.4, PAILLE[2]); ell(t, 9, 6, 3.2, 1.5, PAILLE[3])     # la miche, de l'autre côté
    return t.fini()


def cuisine_porte_cote():
    t, yd, yf = cuisine_cote(BOIS, BOIS)
    t.put(14, yf + 4, LAITON[3])
    ell(t, 8, yd + 5, 2.6, 3.6, PAILLE[2]); ell(t, 7.6, yd + 4.4, 1.6, 2.6, PAILLE[3])
    return t.fini()


def cuisine_tiroirs_dos():
    t = cuisine_dos(BOIS, BOIS)
    t.rect(4, 3, 7, 7, BLANC[3]); t.rect(4, 3, 4, 7, BLANC[1])           # le pot à ustensiles
    t.rect(5, 0, 5, 2, BOIS[3]); t.rect(9, 6, 13, 8, ROUGE[1])
    return t.fini()


def cuisine_tiroirs_cote():
    t, yd, yf = cuisine_cote(BOIS, BOIS)
    for k in range(3):
        t.put(14, yf + 2 + k * 3, LAITON[3])
    t.rect(6, yd + 1, 9, yd + 4, BLANC[3]); t.rect(7, yd - 2, 7, yd, BOIS[3])
    t.rect(5, yd + 6, 9, yd + 8, ROUGE[1])
    return t.fini()


MARBRE = [BLANC[0], BLANC[1], BLANC[2], BLANC[3], BLANC[4]]


def cuisine_sauge_dos():
    t = cuisine_dos(MARBRE, SAUGE)
    t.rect(2, 2, 5, 5, M45.TC[2]); ell(t, 3.5, 1, 2.8, 2, M45.FEUILLE[2])   # le basilic
    return t.fini()


def cuisine_sauge_cote():
    t, yd, yf = cuisine_cote(MARBRE, SAUGE)
    t.rect(14, yf + 2, 14, 20, (176, 212, 226))                          # le chant de la vitre
    t.rect(6, yf - 5, 9, yf - 2, M45.TC[2]); ell(t, 7.5, yf - 6, 2.6, 2, M45.FEUILLE[2])
    return t.fini()


def bibli_dos(W, corniche=False):
    t, yd, yf = dos_caisson(W, 46, 44 if W == 16 else 44, round(40 * HAUT), round((8 if W == 16 else 10) * FOND), BOIS, None, corniche)
    t.rect(1, 45, W - 2, 45, BOIS[1])
    return t.fini()


def bibli_cote(L, hf=round(40 * HAUT), vitree=False):
    """De profil : le flanc ; à droite, de chant, les rayons et le dos des livres (vitrée : les portes)."""
    t, yd, yf, base = cote_caisson(L, hf, BOIS, pieds_bas=1, x0=3, x1=12, corniche=vitree)
    for y in range(yf + 6, base - 2, 7 if vitree else 9):
        t.rect(12, y, 12, y, BOIS[3])
    if vitree:
        t.rect(12, yf + 2, 12, base - 10, (200, 228, 240))
    return t.fini()


def coffre_dos():
    """Le coffre à jouets de dos : le dos rouge, le couvercle relevé (vu par-dessus), les jouets."""
    W, H = 32, 30
    t = T(W, H)
    R = ROUGE + [ROUGE[3]]
    yd, yf = caisson(t, 2, 29, H - 2, round(10 * HAUT), round(11 * FOND), R, R)
    t.rect(3, yd + 1, 28, yf - 2, ROUGE[0])
    ell(t, 21, yd + 4, 3.5, 3, PAILLE[2]); ell(t, 13, yd + 4, 3, 2.8, BLEU[2])
    t.rect(2, yf - 6, 29, yf - 2, JAUNE[1]); t.rect(2, yf - 6, 29, yf - 6, JAUNE[2])   # le couvercle, à plat derrière nous
    t.rect(2, H - 1, 4, H - 1, ROUGE[0]); t.rect(27, H - 1, 29, H - 1, ROUGE[0])
    return t.fini()


def coffre_cote():
    R = ROUGE + [ROUGE[3]]
    L = 28
    ht = long_dessus(L)
    hf = round(10 * HAUT)
    W, H = 16, ht + hf + 1 + 10
    t = T(W, H)
    base = H - 2
    yd, yf = caisson(t, 2, 13, base, hf, ht, R, R)
    t.rect(2, yd - 9, 4, yf - 1, JAUNE[2]); t.rect(2, yd - 9, 4, yd - 9, JAUNE[3])   # le couvercle relevé, à gauche
    t.rect(5, yd + 1, 12, yf - 2, ROUGE[0])
    ell(t, 9, yd + 6, 3, 3.5, PAILLE[2]); ell(t, 9, yd + 15, 2.8, 3, BLEU[2])
    t.rect(7, yd + 20, 11, yd + 23, VERT[2])
    t.rect(13, yf + 2, 13, base - 1, JAUNE[1])                           # le chant d'un cube peint
    t.rect(2, H - 1, 4, H - 1, ROUGE[0]); t.rect(11, H - 1, 13, H - 1, ROUGE[0])
    return t.fini()


# ---------------------------------------------------------------- les lits et le réfrigérateur (A-1)

def _lit_tons(enfant):
    return (('J1', 'J2', 'J0') if enfant else ('V1', 'V2', 'V0')), ((16, 28) if enfant else (20, 34))


def lit_dos(enfant):
    """Le lit de dos (sa tête vers nous) : le pied de lit en haut, de chant ; la couverture, rabattue près
    de l'oreiller, en bas ; la tête de lit devant, sa face pleine (plus haute que le pied de lit de face).
    Le dormeur y est couché la tête en bas, sur l'oreiller (js/carte/ferme/config.js, BLOCS_CARTE.litSens)."""
    cover, (W, H) = _lit_tons(enfant)
    im = M.canvas(W, H)
    put, _ = M.painter(im)
    M.rect(put, 0, 0, W - 1, 1, 'w2'); M.rect(put, 0, 0, W - 1, 0, 'w3')        # le pied de lit, de chant
    M.rect(put, 1, 2, W - 2, H - 7, 'c2')                                         # le matelas
    M.rect(put, 1, 2, W - 2, H - 15, cover[0])                                    # la couverture
    M.rect(put, 1, H - 17, W - 2, H - 15, cover[1])                               # son haut rabattu
    M.rect(put, 1, 2, 2, H - 18, cover[2])                                        # le pli, à gauche (de dos)
    for y in range(5, H - 18, 4):
        for x in range(4, W - 3, 4):
            put(x, y, cover[1] if enfant else cover[2])
    M.rect(put, 3, H - 13, W - 4, H - 9, 'b3')                                    # l'oreiller
    M.rect(put, 3, H - 9, W - 4, H - 9, 'b1')
    M.box(put, 0, H - 7, W, 1, 6, 'w3', 'w2')                                     # la tête de lit : dessus, face
    M.rect(put, 0, H - 6, W - 1, H - 6, 'w1')
    for x in range(3, W - 2, 4):
        M.rect(put, x, H - 5, x, H - 2, 'w1')                                     # ses planches
    M.outline(im)
    return im


def lit_cote(enfant):
    """Le lit de profil (2 cases de long ; tourné vers la droite : la tête de lit à gauche, le pied à
    droite) : le dessus du matelas, l'oreiller à gauche, la couverture rabattue ; la tête de lit de chant,
    haute ; le flanc du cadre devant ; le pied de lit, bas. Vers la gauche : en miroir."""
    cover, (Wf, Hf) = _lit_tons(enfant)
    W = Hf + 2                                     # (sa longueur, de face, devient sa largeur)
    ht = round(min(Wf, 16) * FOND) + max(0, Wf - 16)   # (la largeur du lit, vue de haut : le dessus)
    hc = 3                                         # le flanc du cadre
    hb = 8                                         # la tête de lit dépasse d'autant au-dessus du matelas
    H = hb + ht + hc + 1
    im = M.canvas(W, H)
    put, _ = M.painter(im)
    y0, y1 = hb, hb + ht - 1                       # le dessus du matelas
    M.rect(put, 4, y0, W - 2, y1, 'c2')
    M.rect(put, 5, y0 + 1, 9, y1 - 1, 'b3'); M.rect(put, 9, y0 + 1, 9, y1 - 1, 'b1')   # l'oreiller
    M.rect(put, 12, y0, W - 2, y1, cover[0])                                      # la couverture
    M.rect(put, 12, y0, 14, y1, cover[1])                                         # son haut rabattu
    M.rect(put, 15, y1 - 1, W - 2, y1, cover[2])                                  # le pli, devant
    for y in range(y0 + 2, y1 - 2, 4):
        for x in range(17, W - 3, 4):
            put(x, y, cover[1] if enfant else cover[2])
    M.rect(put, 4, y1 + 1, W - 2, y1 + hc, 'w1'); M.rect(put, 4, y1 + 1, W - 2, y1 + 1, 'w2')   # le flanc
    M.rect(put, 15, y1 + 1, W - 2, y1 + 1, cover[2])                              # la couverture qui retombe
    M.rect(put, 0, 0, 3, H - 1, 'w2'); M.rect(put, 0, 0, 3, 0, 'w3'); M.rect(put, 3, 1, 3, H - 1, 'w1')   # la tête de lit
    M.rect(put, W - 2, y0 - 2, W - 1, H - 1, 'w2'); M.rect(put, W - 2, y0 - 2, W - 1, y0 - 2, 'w3')     # le pied de lit
    M.outline(im)
    return im


def drap_dos(im):
    """La couverture seule du lit de dos : tout ce qui est au-dessus de son haut rabattu (le dormeur, la
    tête en bas, passe dessous jusqu'aux épaules)."""
    H = im.height
    return _garde(im, lambda x, y: y <= H - 15)


def drap_cote(im):
    """La couverture seule du lit de profil : de son haut rabattu jusqu'au pied de lit."""
    return _garde(im, lambda x, y: x >= 12)


def _garde(im, dedans):
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if not dedans(x, y):
                px[x, y] = (0, 0, 0, 0)
    return out


def _frigo(devant):
    """Le réfrigérateur (scripts/batiments/meubles.py refrigerateur) vu d'un autre côté : le même pavé,
    `devant`(x, z) → couleur de la face qu'on voit (None : le blanc du flanc)."""
    x0, x1, d0, d1, hz = -6.6, 6.6, -6, 6, 25
    t = M.Toile(16, 34, 8, 33)

    def couleur(face, u, v, s):
        if face == 'dessus':
            return M.ton(M.FRIGO_BLANC, 0.95)
        if face in ('gauche', 'droite'):
            return M.ton(M.FRIGO_BLANC, s * 0.75)
        c = devant(u, v)
        return c if c is not None else M.ton(M.FRIGO_BLANC, 0.55 if u > 5.3 else 0.95 if u < -5.6 else 0.8)
    M.boite(t, x0, x1, d0, d1, 0, hz, couleur, 'frigo')
    return t.image(traits=False)


def frigo_dos():
    """De dos : le panneau arrière, la grille du condenseur (ses tubes sombres), le socle."""
    def devant(x, z):
        if z < 1.2:
            return M.FRIGO_JOINT
        if -4.6 < x < 4.6 and 3 < z < 21 and (round(z * 2) % 3 == 0 or abs(x) > 4.1):
            return M.ton(M.FRIGO_POIGNEE, 0.35)
        return None
    return _frigo(devant)


def frigo_cote():
    """De profil (tourné vers la droite) : son flanc blanc ; à droite, le chant des deux portes, leur
    jointure, les poignées qui dépassent."""
    porte = 17
    def devant(x, z):
        if z < 1.2:
            return M.FRIGO_JOINT
        if x > 4.8 and abs(z - porte) < 0.45:
            return M.FRIGO_JOINT
        if x > 5.6 and (porte + 1.5 < z < 25 - 1.5 or 7 < z < porte - 2):
            return M.ton(M.FRIGO_POIGNEE, 0.5)
        if 4.8 < x <= 5.6:
            return M.ton(M.FRIGO_BLANC, 0.6)
        return M.ton(M.FRIGO_BLANC, 0.75)
    return _frigo(devant)


# ---------------------------------------------------------------- la liste
DESSINS = {
    'chaise': (chaise_dos, chaise_cote),
    'table': (table_dos, table_cote),
    'tapis_1': (lambda: M.tapis(1).transpose(Image.FLIP_LEFT_RIGHT), lambda: tapis_tourne(1)),
    'tapis_2': (lambda: M.tapis(2).transpose(Image.FLIP_LEFT_RIGHT), lambda: tapis_tourne(2)),
    'tapis_3': (lambda: M.tapis(3).transpose(Image.FLIP_LEFT_RIGHT), lambda: tapis_tourne(3)),
    'chevet': (chevet_dos, chevet_cote),
    'canape': (canape_dos, canape_cote),
    'table_basse': (table_basse_dos, table_basse_cote),
    'buffet': (buffet_dos, buffet_cote),
    'commode': (commode_dos, commode_cote),
    'armoire_chene': (armoire_dos, armoire_cote),
    'armoire_peinte': (lambda: armoire_dos(BLEU, BLANC), lambda: armoire_cote(BLEU, BLANC)),
    'armoire_glace': (armoire_glace_dos, armoire_glace_cote),
    'cuisine_porte': (cuisine_porte_dos, cuisine_porte_cote),
    'cuisine_tiroirs': (cuisine_tiroirs_dos, cuisine_tiroirs_cote),
    'cuisine_sauge': (cuisine_sauge_dos, cuisine_sauge_cote),
    'bibliotheque': (lambda: bibli_dos(16), lambda: bibli_cote(14)),
    'bibliotheque_vitree': (lambda: bibli_dos(32, True), lambda: bibli_cote(30, vitree=True)),
    'coffre_jouets': (coffre_dos, coffre_cote),
    'lit_adulte': (lambda: lit_dos(False), lambda: lit_cote(False)),
    'lit_enfant': (lambda: lit_dos(True), lambda: lit_cote(True)),
    'refrigerateur': (frigo_dos, frigo_cote),
}
# les couvertures seules des lits tournés (posées sur le dormeur)
DRAPS = {'lit_adulte': (drap_dos, drap_cote), 'lit_enfant': (drap_dos, drap_cote)}


def main():
    out = {}
    for k, (dos, cote) in DESSINS.items():
        out[k] = (dos(), cote())
        out[k][0].save(os.path.join(ASSETS, f'meuble_{k}_dos.png'), optimize=True)
        out[k][1].save(os.path.join(ASSETS, f'meuble_{k}_cote.png'), optimize=True)
        if k in DRAPS:
            DRAPS[k][0](out[k][0]).save(os.path.join(ASSETS, f'meuble_{k}_dos_drap.png'), optimize=True)
            DRAPS[k][1](out[k][1]).save(os.path.join(ASSETS, f'meuble_{k}_cote_drap.png'), optimize=True)
    if '--apercu' in sys.argv:
        k, gap = 3, 10
        lignes = []
        for nom, (dos, cote) in out.items():
            face = Image.open(os.path.join(ASSETS, f'meuble_{nom}.png')).convert('RGBA')
            lignes.append([face, cote, cote.transpose(Image.FLIP_LEFT_RIGHT), dos])
        per = 3
        rangs = [lignes[i:i + per] for i in range(0, len(lignes), per)]
        RW = max(sum(im.width * k + gap for im in l) + 30 for l in lignes)
        RH = max(im.height for l in lignes for im in l) * k + gap
        ap = Image.new('RGBA', (RW * per, RH * len(rangs)), (152, 124, 88, 255))
        for j, rang in enumerate(rangs):
            for i, l in enumerate(rang):
                x = i * RW
                for im in l:
                    big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                    ap.alpha_composite(big, (x, (j + 1) * RH - gap // 2 - big.height))
                    x += big.width + gap
        ap.save(os.path.join(ROOT, 'apercu_meubles_sens.png'))
    print(f'meubles tournés : {len(out)} meubles, {2 * len(out)} images (dos, profil)')


if __name__ == '__main__':
    main()
