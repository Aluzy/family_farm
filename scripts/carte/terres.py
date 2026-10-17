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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT  # noqa: E402
CARTE = os.path.join(ASSETS, 'carte_printemps.json')

# Sol d'herbe foncée (et la terre des anciennes zones de culture).
HERBE = {2415, 101, 579, 563, 102, 100, 259, 260, 261, 334, 335, 336, 409, 410, 411, 1167}
# La planche agrandie (version 2 du décor, scripts/carte/planche_v2.py) : l'herbe de herbe_chemin
# (rangées 0 à 3, pleine ; 13 à 15, raccords entre deux teintes d'herbe).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planche_v2 as PV  # noqa: E402
HERBE |= {PV.gid('herbe_chemin', r * 16 + k) for r in (0, 1, 2, 3, 13, 14, 15) for k in range(16)}
# Bordures de terre des anciennes zones de culture (couches « zone_culture_edge » et
# « contour_herbe ») : le jeu ne les dessine plus, elles ne couvrent rien.
BORDURES = {1612, 1613, 1614, 1687, 1688, 1689, 1762, 1763, 1764}
# Couches dont la moindre tuile rend la case non labourable.
COUVRANTES = ['decor', 'barrieres', 'barrieres_portail', 'contour_herbe', 'animation_eau', 'water_shine', 'layer_tree_4', 'layer_tree_3',
              'layer_tree_2', 'layer_tree_1', 'layer_tree_top', 'falling_leaves']
# Couche « plantes_pierres » : ce qui reste labourable (fleurs, touffes d'herbe, brindilles).
PLANTES_OK = {399, 177, 175, 394, 400, 396, 397, 398, 322, 1509, 1508, 1433, 247, 100, 101, 102, 320}
# … et les herbes hautes, fleurs et mauvaises herbes de herbe_deco.
PLANTES_OK |= {PV.gid('herbe_deco', k) for k in range(16 * 10)}
# Les rochers que la pioche casse (les mêmes que ROCKS.gids dans js/farm-stage.js) : un rocher
# est un groupe de cases voisines (côtés) de ces tuiles, d'identifiant « colonne,rangée » de sa
# case en bas à gauche. Une case qu'un rocher est seul à empêcher de labourer est notée « o » :
# labourable tant que le rocher est cassé.
ROCHERS = {466, 467, 541, 542, 616, 617, 691, 692, 764, 765, 766, 767}
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
ENCLOS = [
    (37, 24, 40, 26),   # le puits et la citerne, en haut à gauche du Moulin (DEFAULT_OBJECTS.puits et .citerne dans js/farm-stage.js)
]


def main():
    d = json.load(open(CARTE, encoding='utf8'))
    W, H, T = d['width'], d['height'], d['tilewidth']
    layers = {l['name']: l for l in d['layers'] if l['type'] == 'tilelayer'}
    objets = {o['name']: o for l in d['layers'] if l['type'] == 'objectgroup' for o in l['objects']}
    # Une tuile entièrement transparente du jeu de tuiles (il y en a dans les couches d'arbres)
    # ne couvre rien.
    from PIL import Image
    sheet = Image.open(os.path.join(ASSETS, 'farm_spring_summer.png')).convert('RGBA')
    cols = sheet.width // T
    vides = {}

    def vide(g):
        if g not in vides:
            n = g - 1
            vides[g] = g <= cols * (sheet.height // T) and sheet.crop(((n % cols) * T, (n // cols) * T, (n % cols) * T + T, (n // cols) * T + T)).getbbox() is None
        return vides[g]

    def gid(name, i):
        g = layers[name]['data'][i] & 0x0fffffff if name in layers else 0
        return 0 if g and (vide(g) or (name != 'ground' and g in BORDURES)) else g

    def dist_rect(c, r, o):
        # distance (en tuiles) du centre de la case au rectangle de l'objet
        cx, cy = (c + .5) * T, (r + .5) * T
        dx = max(o['x'] - cx, 0, cx - (o['x'] + o['width']))
        dy = max(o['y'] - cy, 0, cy - (o['y'] + o['height']))
        return math.hypot(dx, dy) / T

    # Les arbres que la hache abat (comme mapTrees dans js/farm-stage.js) : dans chaque couche
    # d'arbres (sauf layer_tree_top), un groupe de cases voisines (côtés) de 2 à 6 cases de
    # large et 3 à 7 de haut ; identifiant « colonne,rangée » du milieu de son pied. Les
    # autres groupes (buissons, forêts soudées) ne tombent pas. arbre_de[couche][case] : son
    # identifiant, ou None.
    arbre_de = {}
    for nom, l in layers.items():
        if not nom.startswith('layer_tree') or 'top' in nom:
            continue
        data = l['data']
        de = {}
        vus_a = set()
        for i0 in range(W * H):
            if i0 in vus_a or not (data[i0] & 0x0fffffff):
                continue
            cases, pile = [], [i0]
            vus_a.add(i0)
            while pile:
                i = pile.pop()
                cases.append(i)
                c, r = i % W, i // W
                for j in (i - 1 if c > 0 else -1, i + 1 if c < W - 1 else -1, i - W, i + W):
                    if 0 <= j < W * H and j not in vus_a and data[j] & 0x0fffffff:
                        vus_a.add(j)
                        pile.append(j)
            cs = [i % W for i in cases]
            rs = [i // W for i in cases]
            w, h = max(cs) - min(cs) + 1, max(rs) - min(rs) + 1
            ident = None
            if 2 <= w <= 6 and 3 <= h <= 7:
                pied = [i % W for i in cases if i // W == max(rs)]
                ident = f'{(min(pied) + max(pied) + 1) // 2},{max(rs)}'
            for i in cases:
                de[i] = ident
        arbre_de[nom] = de

    # Arbres du Verger : leurs rectangles et une tuile autour.
    verger = [o for n, o in objets.items() if n.startswith('arbre_verger_')]
    # les couches d'arbres ajoutées par scripts/carte/carte_v2.py (layer_tree_0, layer_tree_0b…)
    couvrantes = COUVRANTES + [n for n in layers if n.startswith('layer_tree') and n not in COUVRANTES]
    ok = []
    raison = []
    arbres = {}                                   # identifiant -> cases qu'il est seul (avec d'autres arbres abattables) à couvrir
    sous_arbres = {}                              # case -> arbres abattables qui la couvrent
    for i in range(W * H):
        c, r = i % W, i // W
        why = None
        # les arbres abattables qui couvrent la case ; un autre décor (buisson, forêt…) la bloque
        ab = {arbre_de[n].get(i) for n in arbre_de if gid(n, i)}
        if gid('ground', i) not in HERBE:
            why = 'sol'
        elif any(gid(n, i) for n in couvrantes if n not in arbre_de) or None in ab:
            why = 'decor'
        elif gid('plantes_pierres', i) and gid('plantes_pierres', i) not in PLANTES_OK and gid('plantes_pierres', i) not in ROCHERS:
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
        if why is None and gid('plantes_pierres', i) in ROCHERS:
            why = 'rocher'
        if why in (None, 'rocher') and ab:
            why = 'rocher'                        # « o » : sous un objet qui s'enlève (rocher, arbre)
            sous_arbres[i] = ab
            for a in ab:
                arbres.setdefault(a, []).append(i)
        ok.append(why is None)
        raison.append(why)
    # Les rochers : leurs cases.
    rochers = {}
    vus = set()
    for i0 in range(W * H):
        if i0 in vus or gid('plantes_pierres', i0) not in ROCHERS:
            continue
        cases, pile = [], [i0]
        vus.add(i0)
        while pile:
            i = pile.pop()
            cases.append(i)
            c, r = i % W, i // W
            for j in (i - 1 if c > 0 else -1, i + 1 if c < W - 1 else -1, i - W, i + W):
                if 0 <= j < W * H and j not in vus and gid('plantes_pierres', j) in ROCHERS:
                    vus.add(j)
                    pile.append(j)
        c0, r1 = min(i % W for i in cases), max(i // W for i in cases)
        rochers[f'{c0},{r1}'] = sorted(cases)
    # Anciennes zones de culture (avant la version 1.15) : leur coin haut-gauche en tuiles et
    # leur nombre de colonnes, pour retrouver la tuile d'une ancienne case (sauvegardes, départ).
    zones = {}
    for z, (nom, cols) in {'1': ('zone_culture_1', 5), '2': ('zone_culture_2', 8)}.items():
        o = objets[nom]
        zones[z] = {'X': round(o['x'] / T), 'Y': round(o['y'] / T), 'COLONNES': cols}
    # « + » : herbe foncée qui ne se laboure pas (abords d'un bâtiment, Verger), mais qui peut
    # porter la bordure mi-herbe mi-terre d'une tuile labourée voisine.
    car = lambda i: '#' if ok[i] else 'o' if raison[i] == 'rocher' else '+' if raison[i] in ('batiment', 'verger', 'enclos') else '.'
    rows = [''.join(car(r * W + c) for c in range(W)) for r in range(H)]
    out = {
        '//TERRAIN': [
            'Version 1.15 : tuiles labourables de la carte de la ferme, écrit par',
            'scripts/carte/terres.py (ne pas modifier à la main). LIGNES : une chaîne par',
            'rangée de tuiles, « # » labourable, « + » herbe qui ne se laboure pas mais peut porter',
            'une bordure mi-herbe mi-terre, « o » sous un rocher (labourable une fois le rocher cassé),',
            '« . » ni l\'un ni l\'autre. « o » : sous un rocher ou un arbre (labourable une fois tombé).',
            'Numéro de tuile = rangée × LARGEUR + colonne.',
            'ZONES : coin (X, Y, en tuiles) et colonnes des anciennes zones de culture (1 : la Zone de',
            'culture, 2 : le Champ), pour convertir une ancienne case en tuile.',
            'ROCHERS : les tuiles de chaque rocher que la pioche casse (identifiant « colonne,rangée »',
            'de sa case en bas à gauche, comme sur la carte).',
            'ARBRES : les tuiles « o » de chaque arbre que la hache abat (identifiant « colonne,rangée »',
            'du milieu de son pied, comme sur la carte) ; une tuile sous plusieurs arbres ou sous un',
            'arbre et un rocher se laboure quand tous sont tombés.'
        ],
        'TERRAIN': {'LARGEUR': W, 'HAUTEUR': H, 'ZONES': zones, 'LIGNES': rows, 'ROCHERS': rochers, 'ARBRES': {k: sorted(v) for k, v in sorted(arbres.items())}},
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
    sheet = Image.open(os.path.join(ASSETS, 'farm_spring_summer.png')).convert('RGBA')
    cols = sheet.width // T
    im = Image.new('RGBA', (W * T, H * T), (105, 150, 84, 255))
    for l in d['layers']:
        if l['type'] != 'tilelayer':
            continue
        for i, g in enumerate(l['data']):
            g &= 0x0fffffff
            if not g or g > cols * (sheet.height // T):
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
