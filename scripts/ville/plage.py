# La plage (56 × 40 tuiles), où mène le train de la ville (vers le sud) : un terminus dans les
# dunes. La voie arrive par le nord jusqu'à son heurtoir, la petite gare est à côté du quai ; une
# promenade de planches descend vers le sable (les cabines de bain, les parasols), la mer au sud
# (animée : le va-et-vient des vagues), des rochers à l'est.
#
# Les couches d'objets, pour js/ville-carte.js (comme la montagne, scripts/ville/montagne.py) :
#   gare, arrivees, batiments, trouvailles (« genre » : coquillage, corail, perle), animaux
#   (« espece » : mouette, crabe, dauphin)
#
#   python3 scripts/ville/plage.py [--apercu]     écrit assets/plage.tmj et ses planches
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

commun.W, commun.H = 56, 40
W, H, T = commun.W, commun.H, commun.T

import excursion as X  # noqa: E402
import equipements as E  # noqa: E402
import ferme as F  # noqa: E402
import objets as O  # noqa: E402
import sol as S  # noqa: E402
from commun import K, Planche, contour, hasard, image, mel, rgba, teinte  # noqa: E402

MER_IMAGES, MER_DUREE = 8, 260
PLANCHES = {p.nom.split('_', 1)[1]: p for p in (
    Planche('plage_sol', "Les dunes, le sable, le sable mouillé, le quai"),
    Planche('plage_decor', "La voie, le heurtoir, la promenade, les serviettes, les cabines, les rochers"),
    Planche('plage_mer', "La mer et ses vagues (8 images)", images=MER_IMAGES, duree=MER_DUREE),
    Planche('plage_batiment', "La gare de la plage"),
    Planche('plage_vegetation', "Pins, oyats, parasols"),
)}
COUCHES = [
    ('rails', 'decor', 1), ('marquage', 'decor', 1), ('fleurs', 'vegetation', 1), ('ombres', 'vegetation', 1),
    ('mer', 'mer', MER_IMAGES),
    ('murs', 'batiment', 1), ('pierre_de_taille', 'batiment', 1), ('vitrages', 'batiment', 1),
    ('charpente', 'batiment', 1), ('toits', 'batiment', 1), ('menuiserie', 'batiment', 1),
    ('mobilier', 'decor', 1), ('vegetation', 'vegetation', 1),
]
STYLES = {('herbe', 'sable'): 'naturel', ('sable', 'sable_mouille'): 'naturel', ('herbe', 'place'): 'place',
          ('sable', 'place'): 'joint'}

# ---------- le plan (en tuiles) ----------

VOIE = 8
HEURTOIR = 21
ARRET = 13.3
QUAI = (9, 12, 2, 21)
GARE = (12, 20, 13)
PARVIS = (9, 23, 13, 16)
PROMENADE = (15, 17, 16, 25)      # x0, x1, y0, y1 : les planches, du parvis au sable
RIVAGE = 31 * T                   # la ligne moyenne du bord de l'eau (px)
OBJ = X.Objets()


def rivage(x):
    """Le bord de l'eau (px) au repos, à la colonne de pixels x (il ondule tous les 64 px)."""
    return RIVAGE + 4 * math.sin(2 * math.pi * x / 64)


def dune(x):
    """La limite de l'herbe des dunes (en tuiles), à la colonne x (en tuiles)."""
    return 17 + 1.6 * math.sin(x / 4.5) + 0.8 * math.sin(x / 1.7)


def coins():
    g = [['herbe'] * (W + 1) for _ in range(H + 1)]
    for y in range(H + 1):
        for x in range(W + 1):
            if y >= 29:
                g[y][x] = 'sable_mouille'
            elif y >= dune(x):
                g[y][x] = 'sable'
    for x0, x1, y0, y1 in (QUAI, PARVIS):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                g[y][x] = 'place'
    return g


# ---------- la mer ----------

def mer(t):
    """La mer : le bord de l'eau va et vient (8 images), l'écume, l'eau claire du bord, plus
    loin le bleu profond, des reflets et des rides qui passent. Tout se répète tous les 64 px."""
    for k in range(MER_IMAGES):
        phase = 2 * math.pi * k / MER_IMAGES
        for x in range(W * T):
            base = rivage(x)
            bord = base + 4 * math.sin(phase + x / 64 * 0.0)
            for y in range(int(base) - 6, H * T):
                if y < bord:
                    # le sable que la vague vient de quitter : encore luisant
                    if y >= bord - 3 and math.sin(phase) > 0:
                        t.put(x, y, (176, 152, 108, 140), k)
                    continue
                q = y - bord
                if q < 2:
                    c = (246, 250, 252) if (x + k + int(q)) % 3 else (214, 236, 242)
                elif q < 4:
                    c = (184, 226, 232) if (x // 2 + k) % 2 else (138, 206, 218)
                elif y < base + 18:
                    c = mel((110, 196, 210), (66, 160, 200), min(1, (y - base) / 18))
                elif y < 35 * T:
                    c = (60, 148, 196)
                elif y < 37 * T:
                    c = (48, 126, 182)
                else:
                    c = (40, 108, 168)
                if q >= 4:
                    if hasard((x + 2 * k) % 64, y % 32, 7) > 0.985:
                        c = (206, 238, 246)
                    elif (y + k) % 16 == 0 and hasard(((x // 8) + k) % 8, (y // 16) % 2, 8) < 0.45:
                        c = teinte(c, 1.18)
                t.put(x, y, c, k)


# ---------- les décors ----------

def cabine(couleur):
    """2 × 3 tuiles : une cabine de bain de planches rayées, son toit en pointe, sa porte."""
    im = image(32, 48)
    d = commun.dessin(im)
    d.ellipse((1, 42, 31, 47), fill=(0, 0, 0, 60))
    for x in range(3, 29):
        c = couleur if (x // 3) % 2 else (240, 238, 230)
        d.line((x, 16, x, 44), fill=rgba(teinte(c, 0.9 if x > 24 else 1)))
    d.polygon(((1, 17), (16, 4), (31, 17)), fill=rgba(teinte(couleur, 0.78)))
    d.line((1, 17, 16, 4), fill=rgba(teinte(couleur, 1.2)))
    d.rectangle((11, 26, 20, 44), fill=rgba(teinte(couleur, 0.7)))
    d.rectangle((12, 27, 19, 44), fill=rgba((236, 232, 220)))
    d.rectangle((18, 35, 18, 36), fill=rgba(K))
    d.rectangle((3, 44, 28, 45), fill=rgba(O.BOIS_K))
    return contour(im, K)


def parasol(couleur, graine=0):
    """2 × 3 tuiles : un parasol rayé vu de 3/4 (sa toile ronde en haut, son mât)."""
    im = image(32, 48)
    d = commun.dessin(im)
    d.ellipse((4, 40, 28, 46), fill=(0, 0, 0, 50))
    d.rectangle((15, 10, 16, 44), fill=rgba((230, 226, 214)))
    d.rectangle((16, 10, 16, 44), fill=rgba((180, 176, 166)))
    for y in range(2, 18):
        for x in range(1, 31):
            u, v = (x + 0.5 - 16) / 15, (y + 0.5 - 11) / 8
            if u * u + v * v > 1 or y > 11 + 6 * math.sqrt(max(0, 1 - u * u)) - 1:
                continue
            a = math.atan2(v * 1.6, u)
            raie = int((a + math.pi) / (2 * math.pi) * 10 + graine) % 2
            c = couleur if raie else (244, 242, 236)
            if v > 0.25:
                c = teinte(c, 0.82)
            elif u < -0.3 and v < -0.2:
                c = teinte(c, 1.1)
            im.putpixel((x, y), rgba(c))
    im.putpixel((15, 1), rgba((230, 226, 214)))
    return contour(im, K)


def serviette(couleur):
    im = image(32, 16)
    d = commun.dessin(im)
    d.rectangle((3, 3, 28, 12), fill=rgba(teinte(couleur, 0.8)))
    d.rectangle((3, 3, 28, 11), fill=rgba(couleur))
    for x in range(5, 28, 6):
        d.rectangle((x, 3, x + 1, 11), fill=rgba((244, 242, 236)))
    return im


def promenade(t):
    x0, x1, y0, y1 = PROMENADE
    for y in range(y0 * T, y1 * T):
        for x in range(x0 * T, x1 * T):
            q = y % 6
            c = O.BOIS_K if q == 5 else O.BOIS_C if q == 0 else O.BOIS
            if x in (x0 * T, x1 * T - 1):
                c = O.BOIS_K
            if hasard(x // 7, y // 6, 91) < 0.15 and q not in (0, 5):
                c = teinte(c, 0.9)
            t.put(x, y, c)


def dessine(c):
    E.voie(c['rails'], VOIE * T, 0, HEURTOIR * T + 8)
    c['mobilier'].colle(X.heurtoir(), VOIE * T - 16, HEURTOIR * T - 14)
    E.bord_de_quai(c['marquage'], QUAI[0] * T + 1, QUAI[2] * T, QUAI[3] * T)
    OBJ.batiment(X.gare(c, 'gare', GARE[0], GARE[1], GARE[2], 'ocre', 'tuile_rouge'))
    promenade(c['marquage'])
    mer(c['mer'])
    mob = c['mobilier']
    rev = O.reverbere()
    for x in (10, 22):
        mob.colle(rev, x * T, 10 * T)
    mob.colle(O.banc(), 19 * T, 15 * T)
    for i, coul in enumerate(((70, 112, 186), (196, 58, 52), (70, 146, 72), (232, 182, 58), (70, 112, 186), (196, 58, 52))):
        mob.colle(cabine(coul), (25 + 2.5 * i) * T, 18.5 * T)
    for x, y, coul, g in ((21, 26.5, (196, 58, 52), 0), (31, 25.8, (70, 112, 186), 1), (40, 27, (232, 182, 58), 0)):
        c['marquage'].colle(serviette(coul), round((x + 0.6) * T), round(y * T - 6))
        c['vegetation'].colle(parasol(coul, g), round(x * T - 16), round(y * T - 46))
    for x, y, w, h, gr in ((47, 30.5, 56, 40, 1), (50.5, 28.5, 64, 46, 2), (54, 31.5, 44, 32, 3), (44.5, 32.4, 32, 24, 4),
                           (52.5, 33.5, 52, 36, 5), (49, 26, 32, 24, 6)):
        mob.colle(X.rocher(w, h, gr, mousse=False), round(x * T - w / 2), round(y * T - h))
    # les oyats sur les dunes, des pins maritimes au nord-est
    g = coins()
    fl = c['fleurs']
    for y in range(H):
        for x in range(W):
            cs = [g[y + j][x + i] for i in (0, 1) for j in (0, 1)]
            r = hasard(x, y, 51)
            if all(v == 'herbe' for v in cs) and r > 0.8:
                fl.colle(F.herbe_haute(int(hasard(x, y, 52) * 16)), x * T, y * T)
            elif all(v == 'herbe' for v in cs) and r > 0.76:
                fl.colle(F.fleurs(int(hasard(x, y, 53) * 40)), x * T, y * T)
    liste = []
    for j, y in enumerate(range(4, 17, 3)):
        for i, x in enumerate(range(24, W, 3)):
            px = x + (hasard(i, j, 81) - 0.5) * 2
            py = y + (hasard(i, j, 82) - 0.5) * 1.4
            if hasard(i, j, 83) < 0.4 or py > dune(px) - 1:
                continue
            r = hasard(i, j, 84)
            liste.append((px, py, F.pin() if r < 0.75 else F.buisson(r < 0.88)))
    liste += [(2, 5, F.pin()), (4, 14, F.pin()), (1.5, 20, F.buisson(True)), (3, 9, F.buisson())]
    X.plantes(c['vegetation'], c['ombres'], liste)


def main():
    obj = OBJ
    obj.point('depart', 'depart', 16 * T, 14.3 * T)
    obj.point('arrivees', 'gare', 16 * T, 14.3 * T)
    obj.point('gare', 'arret', VOIE * T, ARRET * T)
    obj.point('gare', 'quai', 9.7 * T, ARRET * T)
    bord = lambda x: (rivage(x * T) - 10) / T          # (en tuiles) le sable mouillé, au bord de l'eau
    for i, x in enumerate((13, 19, 24.5, 29, 34, 38.5, 43)):
        obj.point('trouvailles', f'coquillage_{i}', round(x * T), round(bord(x) * T), genre='coquillage')
    for i, (x, y) in enumerate(((44.8, None), (42.5, None), (55, None))):
        obj.point('trouvailles', f'corail_{i}', round(x * T), round((y or bord(x)) * T), genre='corail')
    for i, (x, y) in enumerate(((46.6, 26.8), (53.6, 26.2))):
        obj.point('trouvailles', f'perle_{i}', round(x * T), round(y * T), genre='perle')
    for nom, (x, y, w, h) in (('mouette', (11, 22, 34, 6)), ('mouette', (24, 27, 16, 2)), ('crabe', (12, 28.4, 30, 1.4)),
                              ('crabe', (41, 27, 4, 2)), ('dauphin', (16, 35.5, 36, 3.5))):
        obj.rect('animaux', nom, x * T, y * T, w * T, h * T, espece=nom)
    X.ecrit('plage', PLANCHES, COUCHES, coins(), STYLES, dessine, obj)


if __name__ == '__main__':
    main()
