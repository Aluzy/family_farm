# Les teintes de peau de chaque planche de personnage (assets/personnages/*.png) → assets/personnages/peau.json.
#
# Sur la carte, une émotion colore la peau d'un habitant (js/carte/ferme/amis.js) : rouge la colère, violet la
# peur, vert le dégoût, bleu la tristesse, jaune la joie. La scène refait la planche avec ses teintes de peau
# remplacées ; ce fichier lui dit lesquelles, et où chacune se place entre le clair et l'ombre :
#   { "perso_01": { "rrggbb": t, … }, … }
# t : -1 le clair (PEAU.e), 0 la teinte moyenne (PEAU.f), 1 l'ombre (PEAU.j), entre les deux un mélange ;
# « k » les joues (PEAU.k).
#
# Les teintes de peau : celles de la palette (scripts/personnage/modeles.py, palette : le clair, la teinte,
# trois ombres mêlées, l'ombre, les joues, les lèvres), et les teintes de bord, là où la peau rencontre l'ombre
# des cheveux, le col ou le cou : une couleur hors de la palette du personnage, qui touche sa peau, de la même
# teinte (à TEINTE degrés près), ni plus sombre que son ombre (OMBRE_MAX), et qui n'est pas une couleur que
# beaucoup de planches partagent (outils, panier, contour : COMMUNE).
#
# Usage : python3 scripts/personnage/peau_emotions.py

import colorsys
import json
import os
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import catalogue  # noqa: E402
import portraits_enfants  # noqa: E402
from modeles import CONTOUR, mix, palette  # noqa: E402

RACINE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOSSIER = os.path.join(RACINE, 'assets', 'personnages')
SORTIE = os.path.join(DOSSIER, 'peau.json')
TEINTE = 10        # degrés
OMBRE_MAX = 1.2    # une teinte de bord plus sombre que ça (1 : l'ombre) n'est pas de la peau
COMMUNE = 0.3      # une couleur présente dans au moins tant de planches n'est jamais de la peau

DESC = {}
for i, (n, d) in enumerate(catalogue.personnages()):
    DESC[n] = (d, i)
for i, (n, d) in enumerate(portraits_enfants.enfants()):
    DESC[n] = (d, i)


def famille(p):
    """Les teintes de peau de la palette, et leur place (t ou « k »)."""
    f, j = p['f'], p['j']
    return {p['e']: -1, f: 0, mix(f, j, 0.25): 0.25, mix(f, j, 0.3): 0.3, mix(f, j, 0.45): 0.45, j: 1,
            mix(f, (180, 90, 50), 0.45): 0.6, p['k']: 'k'}


def teinte(c):
    return colorsys.rgb_to_hsv(*[v / 255 for v in c])[0] * 360


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def pixels(nom):
    im = Image.open(os.path.join(DOSSIER, nom + '.png')).convert('RGBA')
    return im, im.load()


def main():
    noms = sorted(n[:-4] for n in os.listdir(DOSSIER) if n.endswith('.png') and n[:-4] in DESC)
    compte = Counter()
    for n in noms:
        im, px = pixels(n)
        compte.update({px[x, y][:3] for y in range(im.height) for x in range(im.width) if px[x, y][3]})
    communes = {c for c, k in compte.items() if k >= COMMUNE * len(noms)}
    sortie = {}
    for n in noms:
        d, i = DESC[n]
        p = catalogue.PEAU[d['peau']]
        fam = famille(p)
        pal = set(palette(d, i).values()) | {CONTOUR}
        im, px = pixels(n)
        W, H = im.size
        presentes = {px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3]}
        table = {c: t for c, t in fam.items() if c in presentes}
        hf, Lf, Le, Lj = teinte(p['f']), lum(p['f']), lum(p['e']), lum(p['j'])
        for y in range(H):
            for x in range(W):
                c = px[x, y]
                if not c[3] or c[:3] in fam or c[:3] in pal or c[:3] in communes or c[:3] in table:
                    continue
                if abs(((teinte(c[:3]) - hf + 180) % 360) - 180) > TEINTE:
                    continue
                voisin = any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] and px[x + dx, y + dy][:3] in fam
                             for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                if not voisin:
                    continue
                L = lum(c[:3])
                t = -(L - Lf) / max(1, Le - Lf) if L >= Lf else (Lf - L) / max(1, Lf - Lj)
                if t > OMBRE_MAX:
                    continue
                table[c[:3]] = round(max(-1, min(OMBRE_MAX, t)), 3)
        sortie[n] = {'%02x%02x%02x' % c: t for c, t in sorted(table.items())}
    with open(SORTIE, 'w') as fh:
        json.dump(sortie, fh, separators=(',', ':'), sort_keys=True)
        fh.write('\n')
    print(f'{SORTIE} : {len(sortie)} planches, {sum(len(v) for v in sortie.values())} teintes de peau')


if __name__ == '__main__':
    main()
