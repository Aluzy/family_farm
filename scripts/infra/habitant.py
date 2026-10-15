# L'habitant de l'infra-monde (assets/infra_habitant.png), dérivé du modèle
# scripts/infra/originaux/habitant.png (15 × 38, de face : une tête ronde à un seul œil, un
# cœur sur la poitrine, deux longues jambes qui se plient aux genoux, des pieds à griffes).
#
# Images de 15 × 40 px côte à côte (2 px de plus en haut pour le pas), le bas des pieds en bas
# au milieu (x = 7, y = 39) :
#    0..3   marche, de face  (une jambe se lève, le corps monte d'un pixel, puis l'autre)
#    4..7   marche, de dos   (le dos de la tête, sans l'œil ni le cœur)
#    8..11  marche, de profil, vers la droite (les jambes en ciseaux ; à gauche : retournée)
#   12, 13  debout de face, l'œil ouvert puis fermé (clignement)
#   14      debout de dos
#   15, 16  debout de profil, l'œil ouvert puis fermé
#
#   python3 scripts/infra/habitant.py            écrit l'image
#   python3 scripts/infra/habitant.py --apercu   écrit aussi apercu_infra_habitant.png (agrandi)
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import ASSETS, apercu, modele  # noqa: E402

W, H = 15, 40
HAUT = 2                 # la marge du haut (le corps qui monte, la jambe levée)
CORPS = 17               # les rangées 0..16 du modèle : la tête et le corps ; dessous, les jambes
GAUCHE, DROITE = range(0, 7), range(8, 15)   # les colonnes de chaque jambe (la 7 est vide)
FONCE, MOYEN, CLAIR = (31, 41, 67), (36, 48, 77), (41, 54, 87)
OEIL = {(159, 172, 204), (32, 33, 37)}
COEUR = {(104, 91, 114), (77, 66, 86)}


def pixels(m):
    return {(x, y): m.getpixel((x, y)) for y in range(m.height) for x in range(m.width) if m.getpixel((x, y))[3]}


def dos(px):
    """Le dos : l'œil et le cœur recouverts de la couleur du corps (clair à gauche, foncé à droite)."""
    out = dict(px)
    for (x, y), c in px.items():
        if c[:3] in OEIL or (y < CORPS and c[:3] in COEUR):
            out[(x, y)] = (CLAIR if x < 5 else FONCE if x > 9 else MOYEN) + (255,)
    return out


def profil(px):
    """De profil vers la droite : l'œil et le cœur glissent de deux pixels vers l'avant."""
    out = dict(px)
    special = {k: c for k, c in px.items() if k[1] < CORPS and (c[:3] in OEIL or c[:3] in COEUR)}
    for (x, y) in special:
        out[(x, y)] = MOYEN + (255,)
    for (x, y), c in special.items():
        if (x + 2, y) in px:
            out[(x + 2, y)] = c
    return out


def cligne(px):
    """L'œil fermé : le blanc devient corps, une paupière d'un trait au milieu."""
    out = dict(px)
    oeil = [k for k, c in px.items() if c[:3] in OEIL]
    if not oeil:
        return out
    ym = round(sum(y for _, y in oeil) / len(oeil))
    for (x, y) in oeil:
        out[(x, y)] = ((32, 33, 37) if y == ym else MOYEN) + (255,)
    return out


def pose(px, leve=None, bob=0, ciseaux=0):
    """Pose les jambes puis le corps. leve : 'g' ou 'd' (cette jambe monte de 2 px) ;
    bob : le corps monte de bob px ; ciseaux : les pieds s'écartent d'avant en arrière (profil)."""
    im = Image.new('RGBA', (W, H))
    jambes = {k: c for k, c in px.items() if k[1] >= CORPS}
    corps = {k: c for k, c in px.items() if k[1] < CORPS}
    for (x, y), c in sorted(jambes.items(), key=lambda kv: 0 if kv[0][0] in DROITE else 1):
        dy = 0
        if (leve == 'g' and x in GAUCHE) or (leve == 'd' and x in DROITE):
            dy = -2
        dx = 0
        if ciseaux:
            t = (y - CORPS) / (38 - CORPS)
            dx = round(ciseaux * t * (1 if x in GAUCHE else -1))
        X, Y = x + dx, y + HAUT + dy
        if 0 <= X < W and 0 <= Y < H:
            im.putpixel((X, Y), c)
    for (x, y), c in corps.items():
        im.putpixel((x, y + HAUT - bob), c)
    return im


def profil_jambes(px):
    """De profil, les deux jambes se resserrent sous le corps : la jambe droite (derrière)
    est assombrie, la gauche devant."""
    out = {}
    for (x, y), c in px.items():
        if y < CORPS:
            out[(x, y)] = c
        elif x in DROITE:
            out[(x - 3, y)] = (tuple(max(0, v - 10) for v in c[:3]) + (255,))
    for (x, y), c in px.items():
        if y >= CORPS and x in GAUCHE:
            out[(x + 3, y)] = c
    return out


def main():
    m = modele('habitant')
    face = pixels(m)
    arriere = dos(face)
    cote = profil_jambes(profil(face))
    images = []
    for px in (face, arriere):
        images += [pose(px), pose(px, 'g', 1), pose(px), pose(px, 'd', 1)]
    images += [pose(cote, ciseaux=c, bob=b) for c, b in ((2, 0), (0, 1), (-2, 0), (0, 1))]
    images += [pose(face), pose(cligne(face)), pose(arriere), pose(cote), pose(cligne(cote))]
    sheet = Image.new('RGBA', (W * len(images), H))
    for i, im in enumerate(images):
        sheet.paste(im, (i * W, 0))
    sheet.save(os.path.join(ASSETS, 'infra_habitant.png'), optimize=True)
    print(f'assets/infra_habitant.png : {len(images)} images de {W} × {H} px')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_infra_habitant.png', 6, (134, 167, 106))


if __name__ == '__main__':
    main()
