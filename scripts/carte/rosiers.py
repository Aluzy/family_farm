# Les rosiers grimpants (la boutique : worker/src/boutique.mjs ARTICLES) : un treillis de bois où grimpe un
# rosier en fleurs, posé sur la face d'un mur extérieur et aussi haut que lui (js/carte/ferme/chantier.js
# syncGrimpants : une image par bloc de la hauteur du mur, 30 px plus haut à chaque bloc, comme le mur).
#
# Le dessin d'origine (scripts/carte/originaux/rosier_grimpant.png, 20 × 38 px, 37 rangées dessinées) est
# allongé à 40 px, la hauteur de l'image d'un mur (assets/murs_hauts.png : 10 px de dessus et 30 px de face) :
# 3 rangées du milieu du treillis reprises, sans rien étirer. Puis un coloris par rosier : les fleurs (les
# pixels vifs : saturation ≥ FLEUR_SAT, hors des verts ; et les roses pâles) prennent la teinte du coloris, gardant leur lumière ;
# le treillis et les feuilles ne changent pas. « multicolore » : le dessin tel quel.
#
#   python3 scripts/carte/rosiers.py      écrit assets/rosiers.png (4 images de 20 × 40 px, côte à côte,
#                                         dans l'ordre de COLORIS)
#
# Relancer le script redonne la même image.
import colorsys
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS  # noqa: E402

ORIGINAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'originaux', 'rosier_grimpant.png')
SORTIE = os.path.join(ASSETS, 'rosiers.png')
L, H = 20, 40
FLEUR_SAT = 0.68
# (teinte en degrés, saturation × , lumière ×) ; None : le dessin tel quel
COLORIS = [
    ('multicolore', None),
    ('rouge', (352, 1.0, 0.92)),
    ('blanc', (40, 0.10, 1.12)),
    ('jaune', (47, 0.95, 1.05)),
]


def allonge(src):
    """Le dessin (rangées 1 à 37) à 40 rangées : les rangées 17 à 19 reprises après la 19e."""
    d = src.crop((0, 1, L, 38))
    out = Image.new('RGBA', (L, H), (0, 0, 0, 0))
    out.paste(d.crop((0, 0, L, 19)), (0, 0))
    out.paste(d.crop((0, 16, L, 19)), (0, 19))
    out.paste(d.crop((0, 19, L, 37)), (0, 22))
    return out


def fleur(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # (les fleurs vives ; et les roses pâles, d'une teinte que le treillis n'a jamais : 290° à 350°)
    return (s >= FLEUR_SAT and v >= 0.55 and not (60 / 360 < h < 180 / 360)) or (290 / 360 <= h <= 350 / 360 and s >= 0.25)


def colorie(im, reglage):
    if reglage is None:
        return im.copy()
    teinte, ks, kv = reglage
    out = im.copy()
    px = out.load()
    for y in range(H):
        for x in range(L):
            r, g, b, a = px[x, y]
            if a == 0 or not fleur(r, g, b):
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hsv_to_rgb(teinte / 360, min(1, s * ks), min(1, v * kv))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def main():
    base = allonge(Image.open(ORIGINAL).convert('RGBA'))
    planche = Image.new('RGBA', (L * len(COLORIS), H), (0, 0, 0, 0))
    for k, (_, reglage) in enumerate(COLORIS):
        planche.alpha_composite(colorie(base, reglage), (k * L, 0))
    planche.save(SORTIE)
    print(f'assets/rosiers.png : {planche.width} × {planche.height} ({", ".join(n for n, _ in COLORIS)})')


if __name__ == '__main__':
    main()
