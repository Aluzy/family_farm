# Aperçu : la carte actuelle (assets/carte_printemps.json) repeinte avec le nouveau jeu de tuiles
# (assets/tileset_ferme.png) et les bâtiments redessinés (assets/batiments_remaster.png). Ne
# modifie pas la carte : écrit seulement des images.
#
#   python3 scripts/carte/apercu_conversion.py      écrit apercu_carte_avant.png et
#                                                   apercu_carte_apres.png (1 px = 1 px logique)
#
# Chaque case de la carte est reconnue d'après ses tuiles :
#   - le sol (couches ground, decor, contour_herbe, animation_eau rendues ensemble) : herbe sombre,
#     herbe moyenne, herbe claire, terre, pavés ou eau, d'après la couleur dominante de la case ;
#     chaque terrain devient une tache du nouveau jeu (chaque case donne le coin en haut à gauche
#     d'elle : les formes gardent leur taille, décalées d'une demi-case) ;
#   - les objets (plantes_pierres, decor) : fleurs, touffes, feuilles, roseaux, buissons,
#     rochers, cailloux, clôture, tonneau, caisses, bûche, d'après leur numéro de tuile ;
#   - les arbres (couches layer_tree_*) : le pied de chaque tronc ; un houppier sombre qui s'affine
#     donne un sapin, un petit arbre rond un buisson (le jeu n'a pas encore d'arbre jeune), les
#     autres un feuillu (quelques-uns en fruits ou en fleurs) ; les petits groupes sans tronc
#     des couches d'arbres sont des buissons ;
#   - les bâtiments : sur leurs rectangles de la carte, posés comme dans le jeu (bas-centre de
#     l'image sur le bas-centre du rectangle), tous construits.
import json
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
A = os.path.join(ROOT, 'assets')
T = 16

FLEURS_BLANCHES = {399, 400, 397, 322, 320, 323}
FLEURS_LAVANDE = {396, 398}
FLEURS_JAUNES = {394, 247}
TOUFFES = {177, 175, 474, 101, 100, 102, 249, 170}
FEUILLES = {1433}
ROSEAUX = {1132, 1133, 1435, 1508, 1509, 1510}
BUISSONS = {610, 611, 614, 615, 685, 686, 689, 690}
ROCHERS = {541, 542, 616, 617, 766, 767}
CAILLOUX = {466, 467, 691, 692, 764, 765}
CLOTURE = {915, 916, 917, 990, 992, 1065, 1066, 1067, 839}
TONNEAU = {1279, 1280, 1354, 1355}
CAISSES = {1126, 1127, 1201, 1202, 1207, 1208, 1353}
BUCHE = {539, 540}
OBJETS = FLEURS_BLANCHES | FLEURS_LAVANDE | FLEURS_JAUNES | TOUFFES | FEUILLES | ROSEAUX | BUISSONS | ROCHERS | \
    CAILLOUX | CLOTURE | TONNEAU | CAISSES | BUCHE


def load_map():
    m = json.load(open(os.path.join(A, 'carte_printemps.json')))
    sets = sorted([(ts['firstgid'], ts['columns'], Image.open(os.path.join(A, ts['image'])).convert('RGBA'))
                   for ts in m['tilesets'] if os.path.exists(os.path.join(A, ts['image']))], key=lambda s: s[0])
    return m, sets


def render(m, sets, names, skip=frozenset()):
    W, H = m['width'], m['height']
    out = Image.new('RGBA', (W * T, H * T), (0, 0, 0, 0))
    for l in m['layers']:
        if l['type'] != 'tilelayer' or l['name'] not in names:
            continue
        for i, g in enumerate(l['data']):
            g &= 0x0fffffff
            if not g or g in skip:
                continue
            fs = [s for s in sets if s[0] <= g]
            if not fs:
                continue
            first, cols, img = fs[-1]
            n = g - first
            out.alpha_composite(img.crop(((n % cols) * T, (n // cols) * T, (n % cols) * T + T, (n // cols) * T + T)),
                                ((i % W) * T, (i // W) * T))
    return out


def classify(rgb):
    r, g, b = rgb[:3]
    if b > r + 35 and b > g - 5:
        return 'eau'
    if r > 120 and g > 125 and b >= 112 and abs(r - g) < 30 and b < g and g - b < 45:
        return 'paves'                         # gris-beige, plus bleuté que l'herbe jaune
    if r > g and r > 125:
        return 'terre'
    if g > 140 and r > 90:
        return 'herbe_claire'
    if g > 112 and b < 100 and r > 50:
        return 'herbe_moyenne'
    return 'herbe_sombre'


def ground_labels(m, sets):
    """Classe dominante de chaque case, d'après le sol rendu (sans les objets)."""
    W, H = m['width'], m['height']
    im = render(m, sets, {'ground', 'decor', 'contour_herbe', 'animation_eau', 'water_shine', 'zone_culture_edge'}, OBJETS)
    px = im.load()
    labels = {}
    for cy in range(H):
        for cx in range(W):
            count = {}
            for y in range(cy * T + 2, cy * T + 14, 2):
                for x in range(cx * T + 2, cx * T + 14, 2):
                    k = classify(px[x, y])
                    count[k] = count.get(k, 0) + 1
            labels[(cx, cy)] = max(count, key=count.get)
    return labels


def layer_cells(m, name):
    W = m['width']
    for l in m['layers']:
        if l['type'] == 'tilelayer' and l['name'] == name:
            return {(i % W, i // W): g & 0x0fffffff for i, g in enumerate(l['data']) if g & 0x0fffffff}
    return {}


def components(cells):
    cells, out = set(cells), []
    while cells:
        stack = [cells.pop()]
        comp = set(stack)
        while stack:
            x, y = stack.pop()
            for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if q in cells:
                    cells.remove(q)
                    comp.add(q)
                    stack.append(q)
        out.append(comp)
    return out


def tree_bases(m, sets):
    """Pieds des troncs, couche d'arbres par couche (dans une forêt, les arbres de devant cachent
    les troncs de derrière) : cases dont le bas montre du brun d'écorce et dont la case du dessous
    n'en montre plus. Le houppier (quatre cases au-dessus du pied) dit l'espèce : sombre et peu
    bleu pour un sapin. Renvoie [(cx, cy, sapin)]."""
    W, H = m['width'], m['height']
    found = []
    for name in ('layer_tree_1', 'layer_tree_2', 'layer_tree_3', 'layer_tree_4'):
        im = render(m, sets, {name})
        px = im.load()

        def brown(cx, cy, rows):
            n = 0
            for y in rows:
                for x in range(cx * T, cx * T + T):
                    r, g, b, a = px[x, cy * T + y]
                    if a and r > g + 8 and 55 < r < 170 and b < r:
                        n += 1
            return n
        cells = layer_cells(m, name)
        bases = [(cx, cy) for (cx, cy) in cells
                 if brown(cx, cy, range(10, 16)) >= 6 and (cy + 1 >= H or brown(cx, cy + 1, range(0, 6)) < 3)]
        for comp in components(bases):
            xs = sorted(x for x, y in comp)
            y = max(y for x, y in comp)
            cx = xs[len(xs) // 2]
            rs = gs = bs = n = 0
            for yy in range(max(0, (y - 4) * T), (y - 1) * T):
                for xx in range(max(0, (cx - 3) * T), min(W * T, (cx + 4) * T)):
                    r, g, b, a = px[xx, yy]
                    if a:
                        rs, gs, bs, n = rs + r, gs + g, bs + b, n + 1
            # largeur du houppier une à cinq cases au-dessus du pied, et sa hauteur
            ws = []
            for k in (1, 2, 3, 4, 5):
                row = (y - k) * T + 8
                ws.append(sum(1 for xx in range(max(0, (cx - 3) * T), min(W * T, (cx + 4) * T)) if row >= 0 and px[xx, row][3]))
            top = y
            while top > 0 and any(px[xx, (top - 1) * T + 8][3] for xx in range(cx * T, cx * T + T)):
                top -= 1
            sombre = bool(n) and rs / n < 72 and bs / n <= 74
            if y - top <= 2 and y < H - 3:
                kind = 'jeune'                  # petit arbre rond (au bord du bas, l'arbre est coupé : adulte)
            elif sombre and ws[3] < 0.6 * ws[1]:
                kind = 'sapin'                  # houppier sombre qui s'affine vers le haut
            else:
                kind = 'feuillu'
            if not any(abs(cx - x) <= 1 and abs(y - yy) <= 1 for x, yy, _ in found):
                found.append((cx, y, kind))
    return found


def tree_layer_bushes(m, bases):
    """Buissons rangés dans les couches d'arbres : petits groupes de cases (2 × 2 au plus) loin de
    tout pied de tronc. Renvoie [(x du milieu en px, bas en px)]."""
    out = []
    for name in ('layer_tree_1', 'layer_tree_2', 'layer_tree_3', 'layer_tree_4'):
        for comp in components(layer_cells(m, name)):
            xs = [x for x, y in comp]
            ys = [y for x, y in comp]
            if max(xs) - min(xs) > 1 or max(ys) - min(ys) > 1:
                continue
            if any(min(xs) - 2 <= bx <= max(xs) + 2 and min(ys) - 4 <= by <= max(ys) + 1 for bx, by, _ in bases):
                continue
            out.append(((min(xs) + max(xs) + 1) * T // 2, (max(ys) + 1) * T))
    return out


def corner_grid(labels, sol, W, H):
    """Chaque case devient le coin en haut à gauche d'elle : les formes gardent leur taille (un
    chemin d'une case reste large d'une case), décalées d'une demi-case vers le haut et la gauche."""
    g = [[False] * (W + 1) for _ in range(H + 1)]
    for y in range(H + 1):
        for x in range(W + 1):
            g[y][x] = labels.get((min(x, W - 1), min(y, H - 1))) == sol
    return g


# ================================================================ ombres et occlusion (à la composition)

OMBRE_RGB = (44, 15, 40)          # la prune des ombres de contact du guide (S0 translucide)


def plus_sombre():
    """Couleur de la palette → le cran plus sombre de la même famille (V3 → V2, W4 → W3…)."""
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    from pastoral import PAL
    m = {}
    for k, v in PAL.items():
        fam, i = k[0], k[1:]
        if not i.isdigit() or fam in 'AS':
            continue
        d = f'{fam}{int(i) - 1}'
        if k == 'R1':
            d = 'N2'
        if d in PAL and k != 'R0':
            m[v] = PAL[d]
    return m


def ombres_et_occlusion(out, sprites):
    """Pose les sprites, triés par leur pied, avec :
    - sous chaque arbre, l'ombre de son houppier au sol : une ellipse en deux paliers (cœur plus
      dense, bord léger), poussée vers le bas-droite (lumière haut-gauche) ;
    - pour les bâtiments, les objets et les buissons, l'ombre portée de leur silhouette, décalée
      vers le bas-droite et limitée au bas du sprite : seul un liseré dépasse à droite et dessous ;
    - l'occlusion là où un sprite passe devant un autre : sur 2 px autour de sa silhouette, ce
      qui est derrière (un autre sprite, pas le sol) prend le cran plus sombre de sa couleur.
    Rien ne bouge et aucune silhouette ne change : on n'assombrit que des pixels déjà posés."""
    import numpy as np
    W, H = out.size
    ombre = np.zeros((H, W), np.uint8)

    def poser(mask, x, y, a):
        h, w = mask.shape
        x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
        if x0 >= x1 or y0 >= y1:
            return
        sub = mask[y0 - y:y1 - y, x0 - x:x1 - x]
        zone = ombre[y0:y1, x0:x1]
        np.maximum(zone, np.where(sub, a, 0).astype(np.uint8), out=zone)
    for by, im, x, y, kind in sprites:
        al = np.array(im)[..., 3]
        h, w = al.shape
        if kind == 'arbre':
            cols = np.nonzero((al[: int(h * 0.7)] == 255).any(axis=0))[0]
            if not len(cols):
                continue
            cx = x + (cols.min() + cols.max()) / 2 + 3
            rx = (cols.max() - cols.min()) * 0.42
            ry = max(3.0, rx * 0.3)
            yy, xx = np.mgrid[0:int(2 * ry) + 4, 0:int(2 * rx) + 4]
            q = ((xx + 0.5 - rx - 2) / rx) ** 2 + ((yy + 0.5 - ry - 2) / ry) ** 2
            ox, oy = int(cx - rx - 2), int(by - 1 - ry - 2)
            poser(q <= 1, ox, oy, 38)
            poser(q <= 0.45, ox, oy, 70)
        elif kind in ('batiment', 'objet', 'arbre_bas'):
            dx, dy, part = (4, 2, 0.45) if kind == 'batiment' else (2, 1, 0.5)
            mask = al == 255
            mask[: int(h * (1 - part))] = False
            poser(mask, x + dx, y + dy, 75)
    px = np.array(out).astype(np.int32)
    a = ombre[..., None].astype(np.int32)
    px[..., :3] = (px[..., :3] * (255 - a) + np.array(OMBRE_RGB) * a) // 255
    from PIL import Image
    out.paste(Image.fromarray(px.astype(np.uint8), 'RGBA'))
    sombre = plus_sombre()
    occ = np.zeros((H, W), bool)
    for by, im, x, y, kind in sprites:
        al = np.array(im)[..., 3]
        h, w = al.shape
        m = np.zeros((H, W), bool)
        x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
        m[y0:y1, x0:x1] = al[y0 - y:y1 - y, x0 - x:x1 - x] == 255
        if kind != 'cloture':
            ring = m.copy()
            for _ in range(2):
                g = ring.copy()
                g[1:] |= ring[:-1]; g[:-1] |= ring[1:]; g[:, 1:] |= ring[:, :-1]; g[:, :-1] |= ring[:, 1:]
                ring = g
            ring &= ~m & occ
            if ring.any():
                pxo = out.load()
                for yy, xx in zip(*np.nonzero(ring)):
                    c = pxo[int(xx), int(yy)]
                    d = sombre.get(c[:3])
                    if d:
                        pxo[int(xx), int(yy)] = d + (c[3],)
        out.alpha_composite(im, (x, y))
        occ |= m

def main():
    m, sets = load_map()
    W, H = m['width'], m['height']
    sheet = Image.open(os.path.join(A, 'tileset_ferme.png')).convert('RGBA')
    tj = json.load(open(os.path.join(A, 'tileset_ferme.json')))
    index, blocks = tj['tuiles'], tj['blocs']
    bat = Image.open(os.path.join(A, 'batiments_remaster.png')).convert('RGBA')
    at = json.load(open(os.path.join(A, 'batiments_remaster.json')))

    def tile(nm):
        i = index[nm]
        return sheet.crop(((i % 16) * T, (i // 16) * T, (i % 16) * T + T, (i // 16) * T + T))

    def block(nm):
        x, y, w, h = blocks[nm]
        return sheet.crop((x * T, y * T, (x + w) * T, (y + h) * T))

    def bframe(nm, i=0):
        v = at[nm]
        x = v['x'] + i * (v['w'] + 2)
        return bat.crop((x, v['y'], x + v['w'], v['y'] + v['h']))

    r = random.Random(3)
    labels = ground_labels(m, sets)
    # Les anciennes zones de culture (près de la ferme et du moulin) redeviennent de l'herbe,
    # comme dans le jeu (js/farm-stage.js, ZONE_TILES) : le joueur laboure les tuiles qu'il veut.
    for l in m['layers']:
        if l['type'] != 'objectgroup':
            continue
        for o in l['objects']:
            if not o['name'].startswith('zone_culture'):
                continue
            for cy in range(int(o['y'] // T) - 1, int((o['y'] + o['height']) // T) + 2):
                for cx in range(int(o['x'] // T) - 1, int((o['x'] + o['width']) // T) + 2):
                    if labels.get((cx, cy)) == 'terre':
                        labels[(cx, cy)] = 'herbe_sombre'
    out = Image.new('RGBA', (W * T, H * T))
    order = ['herbe_moyenne', 'herbe_claire', 'terre', 'eau', 'paves']
    grids = {sol: corner_grid(labels, sol, W, H) for sol in order}
    for y in range(H):
        for x in range(W):
            out.alpha_composite(tile(f'herbe_sombre_{r.choice([0, 0, 0, 0, 1, 2, 3])}'), (x * T, y * T))
            for sol in order:
                g = grids[sol]
                c = (g[y][x], g[y][x + 1], g[y + 1][x], g[y + 1][x + 1])
                if any(c):
                    out.alpha_composite(tile(f'{sol}_{"".join(str(int(b)) for b in c)}'), (x * T, y * T))
    sprites = []        # (bas en px, image, x, y) : triés par le bas, comme sur la carte
    plantes = layer_cells(m, 'plantes_pierres')
    decor = layer_cells(m, 'decor')
    objets = dict(decor)
    objets.update(plantes)
    for (cx, cy), g in objets.items():
        nm = None
        if g in FLEURS_BLANCHES:
            nm = r.choice(['fleurs_blanches', 'marguerites', 'marguerites', 'coquelicots', 'roses'])
        elif g in FLEURS_LAVANDE:
            nm = r.choice(['fleurs_lavande', 'lavande', 'bleuets', 'chardon'])
        elif g in FLEURS_JAUNES:
            nm = r.choice(['fleurs_jaunes', 'pissenlit'])
        elif g in TOUFFES:
            nm = r.choice(['touffes', 'touffes', 'herbes_hautes', 'fougere', 'trefle', 'touffes_claires'])
        elif g in FEUILLES:
            nm = 'feuilles'
        elif g in ROSEAUX:
            nm = 'roseaux'
        elif g in CAILLOUX:
            nm = 'caillou'
        if nm:
            out.alpha_composite(tile(nm), (cx * T, cy * T))
    # clôture : modules gauche / milieu / droite le long des rangées, poteaux ailleurs
    fence = {p for p, g in objets.items() if g in CLOTURE}
    for (cx, cy) in fence:
        lft, rgt = (cx - 1, cy) in fence, (cx + 1, cy) in fence
        up = (cx, cy - 1) in fence
        nm = ('cloture_milieu' if lft and rgt else 'cloture_droite' if lft else 'cloture_gauche' if rgt
              else 'cloture_verticale' if up else 'cloture_poteau')
        sprites.append(((cy + 1) * T, tile(nm), cx * T, cy * T, 'cloture'))
    for group, nm in ((BUISSONS, None), (ROCHERS, 'rocher'), (TONNEAU, 'tonneau'), (CAISSES, 'caisse'), (BUCHE, 'buche')):
        cells = [p for p, g in objets.items() if g in group]
        for comp in components(cells):
            bx = (min(x for x, y in comp) + max(x for x, y in comp) + 1) * T // 2
            by = (max(y for x, y in comp) + 1) * T
            name = nm or r.choice(['buisson_vert', 'buisson_vert', 'buisson_baies', 'buisson_fleuri', 'buisson_roses'])
            im = tile(name) if name == 'caisse' else block(name)
            sprites.append((by, im, bx - im.width // 2, by - im.height, 'arbre_bas' if nm is None else 'objet'))
    bases = tree_bases(m, sets)
    for bx, by in tree_layer_bushes(m, bases):
        if labels.get((bx // T, by // T - 1)) in ('terre', 'paves', 'eau'):
            continue                                        # pas de buisson dans un champ ni un chemin
        nm = r.choice(['buisson_vert', 'buisson_vert', 'buisson_baies', 'buisson_fleuri', 'buisson_roses', 'arbuste'])
        im = tile(nm) if nm == 'arbuste' else block(nm)
        sprites.append((by, im, bx - im.width // 2, by - im.height, 'arbre_bas'))
    def pres_de_l_eau(cx, cy):
        return any(labels.get((cx + dx, cy + dy)) == 'eau' for dx in range(-4, 5) for dy in range(-3, 4))
    for cx, cy, kind in bases:
        if kind == 'jeune':
            nm = r.choice(['chene_jeune', 'chene_jeune', 'chene_moyen', 'arbuste'])
        elif kind == 'sapin':
            nm = r.choice(['sapin', 'sapin', 'sapin_jeune'])
        elif pres_de_l_eau(cx, cy) and r.random() < 0.6:
            nm = 'saule'
        else:
            nm = r.choices(['arbre_feuillu', 'arbre_sombre', 'bouleau', 'arbre_fruits', 'arbre_fleurs'], [6, 3, 2, 2, 1])[0]
        im = tile(nm) if nm == 'arbuste' else block(nm)
        bx, by = cx * T + T // 2, (cy + 1) * T
        sprites.append((by, im, bx - im.width // 2, by - im.height, 'arbre_bas' if nm == 'arbuste' else 'arbre'))
    # bâtiments
    objs = {o['name']: o for l in m['layers'] if l['type'] == 'objectgroup' for o in l['objects']}
    objs['puits'] = {'x': 596, 'y': 390, 'width': 34, 'height': 38}
    objs['citerne'] = {'x': 629, 'y': 394, 'width': 24, 'height': 34}
    maison = bframe('maison')
    maison.alpha_composite(bframe('panneaux_toit', 3), (39, 2))
    puits = bframe('puits', 1)
    puits.alpha_composite(bframe('puits', 2))
    for obj, im in (('maison', maison), ('grange', bframe('etable')), ('moulin', bframe('moulin', 1)),
                    ('serre', bframe('serre')), ('poulailler', bframe('poulailler')), ('silo', bframe('silo')),
                    ('puits', puits), ('citerne', bframe('citerne', 3))):
        o = objs[obj]
        x = round(o['x'] + o['width'] / 2 - im.width / 2)
        y = round(o['y'] + o['height'])
        sprites.append((y, im, x, y - im.height, 'batiment'))
    ombres_et_occlusion(out, sorted(sprites, key=lambda s: s[0]))
    out.save(os.path.join(ROOT, 'apercu_carte_apres.png'))
    # l'original, pour comparer (bâtiments d'origine compris)
    avant = render(m, sets, {l['name'] for l in m['layers'] if l['type'] == 'tilelayer'} - {'falling_leaves'})
    orig = {'maison': Image.open(os.path.join(A, 'house_sp.png')).convert('RGBA'),
            'grange': Image.open(os.path.join(A, 'barn_sp.png')).convert('RGBA'),
            'moulin': Image.open(os.path.join(A, 'windmill_sp.png')).convert('RGBA').crop((0, 0, 96, 128)),
            'serre': Image.open(os.path.join(A, 'serre_sp.png')).convert('RGBA').crop((0, 0, 94, 83)),
            'poulailler': Image.open(os.path.join(A, 'poulailler.png')).convert('RGBA').crop((0, 0, 44, 55)),
            'silo': Image.open(os.path.join(A, 'silo.png')).convert('RGBA')}
    for obj, im in sorted(orig.items(), key=lambda kv: objs[kv[0]]['y'] + objs[kv[0]]['height']):
        o = objs[obj]
        avant.alpha_composite(im, (round(o['x'] + o['width'] / 2 - im.width / 2), round(o['y'] + o['height']) - im.height))
    avant.save(os.path.join(ROOT, 'apercu_carte_avant.png'))
    print('apercu_carte_avant.png, apercu_carte_apres.png')


if __name__ == '__main__':
    main()
