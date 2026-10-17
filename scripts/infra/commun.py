# Outils communs aux images de l'infra-monde (scripts/infra/*.py) : les modèles fournis
# (scripts/infra/originaux/), l'écriture des jeux de tuiles Tiled (.tsx). Le contour, le hasard
# fixe, les mélanges et l'aperçu viennent de scripts/pixel.py.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, T, apercu, contour, hasard, mel as melange, wangid  # noqa: E402,F401

ORIGINAUX = os.path.join(ROOT, 'scripts', 'infra', 'originaux')

# Les couleurs des modèles
SOL = (134, 167, 106)             # l'herbe pâle
SOL_CLAIR = (174, 197, 156)       # le halo des fleurs, le liseré du bord
FLEUR = (165, 242, 105)           # le cœur lumineux des fleurs
EAU = (31, 41, 67)                # l'eau nocturne
PIERRE = [(104, 91, 114), (77, 66, 86), (62, 54, 69), (48, 41, 54)]   # du clair au sombre (l'écorce)
LUEUR = [(165, 117, 204), (117, 90, 139)]                            # les éclats violets de l'arbre


def modele(nom):
    return Image.open(os.path.join(ORIGINAUX, nom + '.png')).convert('RGBA')


def tsx(nom, image, colonnes, tuiles, animations=None, wang=None, probabilites=None, duree=180):
    """Écrit assets/<nom>.tsx. animations : {tuile: [tuile de chaque image]} ; wang : (nom,
    couleur 1, couleur 2) pour un jeu de coins sur 16 tuiles (n & 8 haut-gauche … n & 1 bas-droit
    de la couleur 2)."""
    w, h = image.size
    lignes = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<tileset version="1.10" tiledversion="1.12.2" name="{nom}" tilewidth="{T}" tileheight="{T}" tilecount="{tuiles}" columns="{colonnes}">',
        f' <image source="{nom}.png" width="{w}" height="{h}"/>',
    ]
    for t in sorted(set((animations or {}).keys()) | set((probabilites or {}).keys())):
        p = (probabilites or {}).get(t)
        attr = f' probability="{p}"' if p is not None else ''
        frames = (animations or {}).get(t)
        if frames and len(frames) > 1:
            corps = ''.join(f'<frame tileid="{f}" duration="{duree}"/>' for f in frames)
            lignes.append(f'  <tile id="{t}"{attr}><animation>{corps}</animation></tile>')
        else:
            lignes.append(f'  <tile id="{t}"{attr}/>')
    if wang:
        n, c1, c2 = wang
        lignes += [' <wangsets>', f'  <wangset name="{n}" type="corner" tile="-1">',
                   f'   <wangcolor name="{c1[0]}" color="{c1[1]}" tile="0" probability="1"/>',
                   f'   <wangcolor name="{c2[0]}" color="{c2[1]}" tile="15" probability="1"/>']
        for t in range(16):
            lignes.append(f'   <wangtile tileid="{t}" wangid="{wangid(t)}"/>')
        lignes += ['  </wangset>', ' </wangsets>']
    lignes.append('</tileset>')
    with open(os.path.join(ASSETS, nom + '.tsx'), 'w') as f:
        f.write('\n'.join(lignes) + '\n')
