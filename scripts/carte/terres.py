# data/terrain.json : les tuiles de la carte de la ferme que la houe peut labourer
# (version 1.15). Lu par le moteur (DATA.TERRAIN) et la carte.
#
#   python3 scripts/carte/terres.py            écrit data/terrain.json
#   python3 scripts/carte/terres.py --apercu   écrit aussi apercu_terres.png (la carte, les
#                                              tuiles labourables en vert, les zones interdites en rouge)
#
# Une tuile est labourable si :
#   - son sol (couche « ground ») est de l'herbe foncée (HERBE) ;
#   - aucune couche de décor ne la couvre : chemins, eau, clôtures (« decor »), bordures
#     d'herbe claire (« contour_herbe »), eau animée, arbres (« layer_tree_* », feuilles) ;
#   - la couche « plantes_pierres » n'y pose ni pierre ni arbuste (les fleurs et les touffes
#     d'herbe n'empêchent rien : elles disparaissent sous la terre) ;
#   - elle n'est ni sous un bâtiment, ni dans une zone interdite (INTERDITS) autour de
#     certains bâtiments.
import json
import math
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CARTE = os.path.join(ROOT, 'assets', 'carte_printemps.json')

# Sol d'herbe foncée (et la terre des anciennes zones de culture).
HERBE = {2415, 101, 579, 563, 102, 100, 259, 260, 261, 334, 335, 336, 409, 410, 411, 1167}
# Couches dont la moindre tuile rend la case non labourable.
COUVRANTES = ['decor', 'contour_herbe', 'animation_eau', 'water_shine', 'layer_tree_4', 'layer_tree_3',
              'layer_tree_2', 'layer_tree_1', 'layer_tree_top', 'falling_leaves']
# Couche « plantes_pierres » : ce qui reste labourable (fleurs, touffes d'herbe, brindilles).
PLANTES_OK = {399, 177, 175, 394, 400, 396, 397, 398, 322, 1509, 1508, 1433, 247, 100, 101, 102, 320}
# Bâtiments : leur rectangle est interdit, plus `marge` tuiles autour (rayon, distance au rectangle).
BATIMENTS = {
    'poulailler': 8,    # « dans un rayon de 8 tuiles du poulailler »
    'grange': 3,        # l'Étable (et son enclos, voir ENCLOS)
    'moulin': 3,
    'serre': 3,
    'maison': 1,
    'silo': 1,
    'verger': 2,        # le panneau du Verger
}
# Rectangles de tuiles interdits en plus (x0, y0, x1, y1 inclus), en tuiles de 16 px.
ENCLOS = []


def main():
    d = json.load(open(CARTE, encoding='utf8'))
    W, H, T = d['width'], d['height'], d['tilewidth']
    layers = {l['name']: l for l in d['layers'] if l['type'] == 'tilelayer'}
    objets = {o['name']: o for l in d['layers'] if l['type'] == 'objectgroup' for o in l['objects']}
    # Une tuile entièrement transparente du jeu de tuiles (il y en a dans les couches d'arbres)
    # ne couvre rien.
    from PIL import Image
    sheet = Image.open(os.path.join(ROOT, 'assets', 'farm_spring_summer.png')).convert('RGBA')
    cols = sheet.width // T
    vides = {}

    def vide(g):
        if g not in vides:
            n = g - 1
            vides[g] = g <= cols * (sheet.height // T) and sheet.crop(((n % cols) * T, (n // cols) * T, (n % cols) * T + T, (n // cols) * T + T)).getbbox() is None
        return vides[g]

    def gid(name, i):
        g = layers[name]['data'][i] & 0x0fffffff if name in layers else 0
        return 0 if g and vide(g) else g

    def dist_rect(c, r, o):
        # distance (en tuiles) du centre de la case au rectangle de l'objet
        cx, cy = (c + .5) * T, (r + .5) * T
        dx = max(o['x'] - cx, 0, cx - (o['x'] + o['width']))
        dy = max(o['y'] - cy, 0, cy - (o['y'] + o['height']))
        return math.hypot(dx, dy) / T

    # Arbres du Verger : leurs rectangles et une tuile autour.
    verger = [o for n, o in objets.items() if n.startswith('arbre_verger_')]
    ok = []
    raison = []
    for i in range(W * H):
        c, r = i % W, i // W
        why = None
        if gid('ground', i) not in HERBE:
            why = 'sol'
        elif any(gid(n, i) for n in COUVRANTES):
            why = 'decor'
        elif gid('plantes_pierres', i) and gid('plantes_pierres', i) not in PLANTES_OK:
            why = 'pierre'
        else:
            for n, m in BATIMENTS.items():
                if n in objets and dist_rect(c, r, objets[n]) <= m:
                    why = 'batiment'
                    break
            if not why and any(dist_rect(c, r, o) <= 1 for o in verger):
                why = 'verger'
            if not why and any(x0 <= c <= x1 and y0 <= r <= y1 for x0, y0, x1, y1 in ENCLOS):
                why = 'enclos'
        ok.append(why is None)
        raison.append(why)
    # Anciennes zones de culture (avant la version 1.15) : leur coin haut-gauche en tuiles et
    # leur nombre de colonnes, pour retrouver la tuile d'une ancienne case (sauvegardes, départ).
    zones = {}
    for z, (nom, cols) in {'1': ('zone_culture_1', 5), '2': ('zone_culture_2', 8)}.items():
        o = objets[nom]
        zones[z] = {'X': round(o['x'] / T), 'Y': round(o['y'] / T), 'COLONNES': cols}
    rows = [''.join('#' if ok[r * W + c] else '.' for c in range(W)) for r in range(H)]
    out = {
        '//TERRAIN': [
            'Version 1.15 : tuiles labourables de la carte de la ferme, écrit par',
            'scripts/carte/terres.py (ne pas modifier à la main). LIGNES : une chaîne par',
            'rangée de tuiles, « # » labourable, « . » non. Numéro de tuile = rangée × LARGEUR + colonne.',
            'ZONES : coin (X, Y, en tuiles) et colonnes des anciennes zones de culture (1 : la Zone de',
            'culture, 2 : le Champ), pour convertir une ancienne case en tuile.'
        ],
        'TERRAIN': {'LARGEUR': W, 'HAUTEUR': H, 'ZONES': zones, 'LIGNES': rows},
    }
    with open(os.path.join(ROOT, 'data', 'terrain.json'), 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{sum(ok)} tuiles labourables sur {W * H}')
    if '--apercu' in sys.argv:
        apercu(d, ok, raison)


def apercu(d, ok, raison):
    from PIL import Image
    W, H, T = d['width'], d['height'], d['tilewidth']
    sheet = Image.open(os.path.join(ROOT, 'assets', 'farm_spring_summer.png')).convert('RGBA')
    cols = sheet.width // T
    im = Image.new('RGBA', (W * T, H * T), (105, 150, 84, 255))
    for l in d['layers']:
        if l['type'] != 'tilelayer':
            continue
        for i, g in enumerate(l['data']):
            g &= 0x0fffffff
            if not g or g > 3375:
                continue
            n = g - 1
            im.alpha_composite(sheet.crop(((n % cols) * T, (n // cols) * T, (n % cols) * T + T, (n // cols) * T + T)), ((i % W) * T, (i // W) * T))
    over = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for i, k in enumerate(ok):
        x, y = (i % W) * T, (i // W) * T
        if k:
            over.paste((0, 255, 80, 90), (x + 2, y + 2, x + T - 2, y + T - 2))
        elif raison[i] in ('batiment', 'verger', 'enclos'):
            over.paste((255, 0, 0, 60), (x, y, x + T, y + T))
    im.alpha_composite(over)
    im.resize((W * T * 2 // 2, H * T * 2 // 2)).save(os.path.join(ROOT, 'apercu_terres.png'))


if __name__ == '__main__':
    main()
