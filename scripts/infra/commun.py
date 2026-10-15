# Outils communs aux images de l'infra-monde (scripts/infra/*.py) : les modèles fournis
# (scripts/infra/originaux/), le contour, l'écriture des jeux de tuiles Tiled (.tsx).
import os

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ORIGINAUX = os.path.join(ROOT, 'scripts', 'infra', 'originaux')
ASSETS = os.path.join(ROOT, 'assets')
T = 16

# Les couleurs des modèles
SOL = (134, 167, 106)             # l'herbe pâle
SOL_CLAIR = (174, 197, 156)       # le halo des fleurs, le liseré du bord
FLEUR = (165, 242, 105)           # le cœur lumineux des fleurs
EAU = (31, 41, 67)                # l'eau nocturne
PIERRE = [(104, 91, 114), (77, 66, 86), (62, 54, 69), (48, 41, 54)]   # du clair au sombre (l'écorce)
LUEUR = [(165, 117, 204), (117, 90, 139)]                            # les éclats violets de l'arbre


def modele(nom):
    return Image.open(os.path.join(ORIGINAUX, nom + '.png')).convert('RGBA')


def melange(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def hasard(*k):
    # nombre pseudo-aléatoire fixe dans [0, 1[ (les images sont les mêmes à chaque lancement)
    import math
    x = math.sin(sum(v * c for v, c in zip(k, (12.9898, 78.233, 37.719, 4.581))) + 0.5) * 43758.5453
    return x - math.floor(x)


def contour(im, couleur):
    """Un contour d'un pixel (voisins haut, bas, gauche, droite) autour du dessin."""
    w, h = im.size
    out = im.copy()
    for y in range(h):
        for x in range(w):
            if im.getpixel((x, y))[3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and im.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), couleur + (255,))
    return out


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
            v = lambda bit: 2 if t & bit else 1
            lignes.append(f'   <wangtile tileid="{t}" wangid="0,{v(4)},0,{v(1)},0,{v(2)},0,{v(8)}"/>')
        lignes += ['  </wangset>', ' </wangsets>']
    lignes.append('</tileset>')
    with open(os.path.join(ASSETS, nom + '.tsx'), 'w') as f:
        f.write('\n'.join(lignes) + '\n')


def apercu(im, nom, zoom=6, fond=(20, 18, 28)):
    bg = Image.new('RGBA', im.size, fond + (255,))
    bg.alpha_composite(im)
    bg.resize((im.width * zoom, im.height * zoom), Image.NEAREST).save(os.path.join(ROOT, nom))
