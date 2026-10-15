# L'intérieur de la Serre : un dessin fait à la main, et la petite carte qui le décrit.
#
#   python3 scripts/batiments/serre_interieur.py
#
# Modèle : scripts/batiments/originaux/serre_interieur.png (176 × 192) — la verrière en haut,
# le plancher, deux bacs de terre de 4 × 7 cases (16 px), l'entrée au milieu du bas.
# Écrit :
#   assets/serre_interieur.png  le dessin, tel quel (le jeu le pose en fond de l'intérieur) ;
#   assets/serre_interieur.tmj  la carte (11 × 12 cases, sans tuile) : les couches d'objets
#     serre_zone_1 et serre_zone_2 (les bacs : les emplacements des parcelles, rangée par
#     rangée, voir bakeRooms dans js/farm-stage.js) et « passages » : « sol » (où le
#     personnage marche, hors des bacs) et « entree » (où il entre et sort).
# Puis : node scripts/build-map.mjs (assets/serre_interieur.json).
import json
import os
import shutil

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MODELE = os.path.join(ROOT, 'scripts', 'batiments', 'originaux', 'serre_interieur.png')
T = 16
BACS = [(16, 64, 64, 112), (96, 64, 64, 112)]       # x, y, largeur, hauteur (px) : la terre des bacs
SOL = (4, 40, 168, 150)                             # le plancher, sous la verrière
ENTREE = (88, 190)                                   # le milieu du bas


def rect(oid, nom, x, y, w, h, point=False):
    o = {'id': oid, 'name': nom, 'type': '', 'x': x, 'y': y, 'width': w, 'height': h,
         'rotation': 0, 'visible': True}
    if point:
        o['point'] = True
    return o


def main():
    im = Image.open(MODELE)
    W, H = im.width // T, im.height // T
    assert (W * T, H * T) == im.size, 'le dessin doit tomber sur la grille de 16 px'
    shutil.copyfile(MODELE, os.path.join(ROOT, 'assets', 'serre_interieur.png'))
    couches = [{'id': 1, 'name': 'serre_main_scene', 'type': 'tilelayer', 'width': W, 'height': H,
                'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'data': [0] * (W * H)}]
    oid = 1
    for k, (x, y, w, h) in enumerate(BACS):
        couches.append({'id': len(couches) + 1, 'name': f'serre_zone_{k + 1}', 'type': 'objectgroup',
                        'draworder': 'topdown', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True,
                        'objects': [rect(oid, '', x, y, w, h)]})
        oid += 1
    couches.append({'id': len(couches) + 1, 'name': 'passages', 'type': 'objectgroup', 'draworder': 'topdown',
                    'x': 0, 'y': 0, 'opacity': 1, 'visible': True,
                    'objects': [rect(oid, 'sol', *SOL), rect(oid + 1, 'entree', *ENTREE, 0, 0, point=True)]})
    oid += 2
    carte = {
        'compressionlevel': -1, 'height': H, 'infinite': False, 'layers': couches,
        'nextlayerid': len(couches) + 1, 'nextobjectid': oid, 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'tiledversion': '1.12.2', 'tileheight': T,
        'tilesets': [{'firstgid': 1, 'source': 'farm_spring_summer.tsx'}],
        'tilewidth': T, 'type': 'map', 'version': '1.10', 'width': W,
    }
    with open(os.path.join(ROOT, 'assets', 'serre_interieur.tmj'), 'w', encoding='utf-8') as f:
        json.dump(carte, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'assets/serre_interieur.png, assets/serre_interieur.tmj : {W} × {H} cases, '
          f'{sum(w // T * (h // T) for _, _, w, h in BACS)} emplacements')


if __name__ == '__main__':
    main()
