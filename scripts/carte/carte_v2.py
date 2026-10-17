# La carte de la ferme, version 2 du décor : réécrite avec les nouvelles tuiles.
#
#   python3 scripts/carte/carte_v2.py            écrit assets/carte_printemps_elargie.tmj
#                                                et assets/ombres_arbres.png
#   python3 scripts/carte/carte_v2.py --apercu   écrit aussi apercu_carte_v2.png (la carte)
#
# Puis : python3 scripts/carte/planche_v2.py (elle reçoit assets/barrieres.png, écrit ici),
# node scripts/build-map.mjs (la carte du jeu) et python3 scripts/carte/terres.py (la terre
# labourable).
#
# Part de la carte d'origine, conservée dans scripts/carte/originaux/carte_printemps_elargie_v1.tmj
# (on peut relancer le script : il repart toujours d'elle). Chaque case est lue sur le sol
# d'origine : herbe, chemin (les pavés), terre (la terre du décor), eau. Les sommets des cases
# (leurs coins) prennent ce qui domine autour, et chaque case reçoit :
#   - « ground »        l'herbe (trois teintes qui ondulent), le chemin (jaune pour les pavés,
#                       ocre pour la terre) avec leurs raccords, ou l'eau animée (peu profonde
#                       au bord, profonde au milieu) ;
#   - « contour_herbe » les rives des cases d'eau (bordées d'herbe, ou de sable près d'un chemin) ;
#   - « plantes_pierres » ce qu'elle avait (fleurs, pierres), plus des herbes hautes et des fleurs
#                       semées sur l'herbe, des mauvaises herbes sur la terre ;
#   - « decor »         les objets d'origine (tonneau…) sur l'herbe ;
#   - « barrieres »     les barrières, refaites avec les pièces des nouveaux modèles
#                       (scripts/carte/barrieres.py), et « barrieres_portail » : les cases de
#                       l'ouverture d'un portail (le personnage y passe, pas les bêtes) ; deux
#                       couches juste après « decor ». Le jeu les range comme les arbres (le
#                       personnage passe derrière) et personne ne marche dessus ;
#   - couches d'arbres  chaque feuillu devient l'arbre clair, chaque sapin le pin, chaque buisson
#                       un buisson clair, posés en tuiles, pied au même endroit (à la case près) ;
#                       deux dessins qui se touchent vont dans deux couches (des couches
#                       layer_tree_0, layer_tree_0b… s'ajoutent devant au besoin).
# Les anciennes zones de culture (tuile 1167 du sol) sont de l'herbe : le jeu les montre ainsi
# depuis la version 1.9. Les ombres des arbres et des buissons sont écrites dans
# assets/ombres_arbres.png (hors des pixels des arbres). Les numéros des planches qui suivent la
# planche agrandie (feuilles, vent) sont décalés d'autant.
import json
import math
import os
import random
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arbres_3d as A3  # noqa: E402  (les pieds des arbres)
import barrieres as BA  # noqa: E402  (les barrières)
import herbe_haute as HH  # noqa: E402  (l'herbe haute)
import planche_v2 as PV  # noqa: E402  (où sont les nouvelles tuiles)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, T  # noqa: E402
ORIG = os.path.join(ROOT, 'scripts', 'carte', 'originaux')
SOURCE = os.path.join(ORIG, 'carte_printemps_elargie_v1.tmj')
CIBLE = os.path.join(ASSETS, 'carte_printemps_elargie.tmj')
OMBRES = os.path.join(ASSETS, 'ombres_arbres.png')
ANCIEN = 3375                 # tuiles de la planche d'origine
TERRE_ZONE = 1167             # le sol des anciennes zones de culture (montrées en herbe)
# les bordures de terre des anciennes zones de culture : le jeu ne les dessine plus (herbe)
BORDURES = {1612, 1613, 1614, 1687, 1688, 1689, 1762, 1763, 1764}
# les barrières de la planche d'origine (et leur portail) : remplacées par celles de barrieres.py
BARRIERES_V1 = {915, 916, 917, 990, 992, 1065, 1066, 1067, 839}
SAPIN = (9, 4, 3, 4)          # le sapin dans la planche d'origine (colonne, rangée, l, h)
SOL = ['ground', 'decor', 'contour_herbe', 'animation_eau', 'water_shine']
BARRIERES = ['barrieres', 'barrieres_portail']          # les couches des barrières (après « decor »)
ARBRES = ['layer_tree_4', 'layer_tree_3', 'layer_tree_2', 'layer_tree_1']     # du fond vers l'avant


def charger():
    m = json.load(open(SOURCE, encoding='utf-8'))
    P0 = Image.open(os.path.join(ORIG, 'farm_spring_summer.png')).convert('RGBA')
    P = Image.open(PV.PLANCHE).convert('RGBA')
    return m, P0, P


def main():
    m, P0, P = charger()
    W, H = m['width'], m['height']
    couches = {l['name']: l for l in m['layers'] if l['type'] == 'tilelayer'}
    cache = {}

    def tuile(g, planche=P0):
        key = (g, id(planche))
        if key not in cache:
            n = g - 1
            cache[key] = planche.crop(((n % 75) * T, (n // 75) * T, (n % 75) * T + T, (n // 75) * T + T))
        return cache[key]

    # ---- 1. ce qu'est chaque case, d'après le sol d'origine
    sol0 = Image.new('RGBA', (W * T, H * T), (105, 150, 84, 255))
    for nom in SOL:
        for i, v in enumerate(couches[nom]['data']):
            g = v & 0x0FFFFFFF
            if g == TERRE_ZONE and nom == 'ground':
                g = 2415                                       # ancienne zone de culture : herbe
            if g and g <= ANCIEN and g not in BORDURES:
                sol0.alpha_composite(tuile(g), ((i % W) * T, (i // W) * T))
    classe = {}
    for ty in range(H):
        for tx in range(W):
            px = list(sol0.crop((tx * T, ty * T, tx * T + T, ty * T + T)).get_flattened_data())
            eau = sum(1 for p in px if p[2] > p[0] + 30 and p[2] > 110)
            pave = sum(1 for p in px if p[0] > 170 and p[1] > 150 and p[0] - p[2] < 60 and p[1] - p[2] <= 36)
            terre = sum(1 for p in px if p[0] > 140 and p[0] - p[2] > 60 and p[0] > p[1])
            classe[(tx, ty)] = 'eau' if eau > 128 else 'chemin' if pave > 60 else 'terre' if terre > 128 else 'herbe'
    print('cases :', dict(Counter(classe.values())))

    # ---- 2. les sommets, la teinte de l'herbe, la profondeur de l'eau
    def sommet(x, y):
        c = Counter(classe[(min(W - 1, max(0, x + dx)), min(H - 1, max(0, y + dy)))] for dx in (-1, 0) for dy in (-1, 0))
        for k in ('eau', 'chemin', 'terre'):
            if c[k] >= 2:
                return k
        return 'herbe'

    S = {(x, y): sommet(x, y) for y in range(H + 1) for x in range(W + 1)}
    # la terre (ocre) ne touche pas l'eau : la rive y est d'herbe
    for (x, y), k in list(S.items()):
        if k == 'terre' and any(classe.get((x + dx, y + dy)) == 'eau' for dx in (-1, 0) for dy in (-1, 0)):
            S[(x, y)] = 'herbe'

    def bruit(x, y):
        return (math.sin(x * 0.21 + 1.3) + math.sin(y * 0.17 + 0.4) + math.sin((x + y) * 0.11 + 2.1)) / 3

    TEINTE = {(x, y): (0 if bruit(x, y) < 0.15 else 1 if bruit(x, y) < 0.55 else 2) for y in range(H + 1) for x in range(W + 1)}
    # autour de l'eau, une seule teinte : la rive d'herbe est d'une teinte, ses coins aussi
    for (x, y) in TEINTE:
        if any(classe.get((x + dx, y + dy)) == 'eau' for dx in (-1, 0) for dy in (-1, 0)):
            TEINTE[(x, y)] = 0
    PROF = {(x, y): S[(x, y)] == 'eau' and all(S.get((x + dx, y + dy), 'eau') == 'eau' for dx in range(-2, 3) for dy in range(-2, 3))
            for y in range(H + 1) for x in range(W + 1)}

    def masque(f, x, y):
        c = [f((x, y)), f((x + 1, y)), f((x, y + 1)), f((x + 1, y + 1))]
        return sum(1 << (3 - k) for k, v in enumerate(c) if v)

    # ---- 3. le sol, les rives, les décors semés
    vide = lambda: [0] * (W * H)
    ground, rives, semis = vide(), vide(), vide()
    rng = random.Random(3)
    herbe_pleine, terre_pleine = set(), set()
    for ty in range(H):
        for tx in range(W):
            i = ty * W + tx
            coins = [(tx, ty), (tx + 1, ty), (tx, ty + 1), (tx + 1, ty + 1)]
            types = [S[c] for c in coins]
            teintes = [TEINTE[c] for c in coins]
            h = min(teintes)
            r = rng.random()
            if 'eau' in types:
                n = masque(lambda c: PROF[c], tx, ty)
                f = (0 if r < 0.7 else rng.randrange(1, 8)) if n == 0 else 8 + (rng.choice((0, 2)) if r < 0.7 else rng.randrange(8)) if n == 15 else 16 + n
                ground[i] = PV.gid('eau', f)
                terre = masque(lambda c: S[c] != 'eau', tx, ty)
                if terre:
                    # le sable seulement si toute la terre ferme de la case est chemin (jaune comme lui)
                    sable = all(S[c] == 'chemin' for c in coins if S[c] != 'eau')
                    rives[i] = PV.gid('rive_sable', terre) if sable else PV.gid('rive_herbe', h * 16 + terre)
            elif 'chemin' in types or 'terre' in types:
                p = 0 if types.count('chemin') >= types.count('terre') else 1
                n = masque(lambda c: S[c] in ('chemin', 'terre'), tx, ty)
                t = 4 * 16 + p * 8 + rng.randrange(8) if n == 15 else (5 + h * 2 + p) * 16 + n
                ground[i] = PV.gid('herbe_chemin', t)
                if n == 15 and p == 1:
                    terre_pleine.add(i)
            elif max(teintes) > h:
                ground[i] = PV.gid('herbe_chemin', (13 + h) * 16 + masque(lambda c: TEINTE[c] > h, tx, ty))
            else:
                ground[i] = PV.gid('herbe_chemin', h * 16 + rng.randrange(16))
                herbe_pleine.add((i, h))
    rng = random.Random(9)
    for i, h in sorted(herbe_pleine):
        r = rng.random()
        if r < 0.06:
            rng.randrange(16)          # l'ancienne herbe haute (brins carrés) : retirée ; le tirage reste (les fleurs gardent leur place)
        elif r < 0.11:
            semis[i] = PV.gid('herbe_deco', (4 + h) * 16 + rng.randrange(16))       # fleurs
    for i in sorted(terre_pleine):
        if rng.random() < 0.18:
            semis[i] = PV.gid('herbe_deco', (8 + (1 if rng.random() < 0.4 else 0)) * 16 + rng.randrange(16))

    # ---- 4. ce qu'on garde des couches d'origine
    def plaque(g):
        px = [p for p in tuile(g).get_flattened_data() if p[3] > 200]
        return len(px) >= 200 and len(set(p[:3] for p in px)) <= 4

    def sur_herbe(i):
        tx, ty = i % W, i // W
        return classe[(tx, ty)] == 'herbe' and all(S[c] == 'herbe' for c in ((tx, ty), (tx + 1, ty), (tx, ty + 1), (tx + 1, ty + 1)))

    def est_sapin(g):
        n = g - 1
        return SAPIN[0] <= n % 75 < SAPIN[0] + SAPIN[2] and SAPIN[1] <= n // 75 < SAPIN[1] + SAPIN[3]

    def buisson_pack(g):
        n = g - 1
        return 9 <= n % 75 <= 15 and 8 <= n // 75 <= 9

    poses = []        # (pied y, pied x, bloc, l, h) : arbres, pins, buissons à poser
    retires = {}      # couche -> cases d'origine retirées
    for nom in ARBRES:
        data = couches[nom]['data']
        vus = set()
        for i0, v0 in enumerate(data):
            if i0 in vus or not (v0 & 0x0FFFFFFF):
                continue
            pile, groupe = [i0], []
            vus.add(i0)
            while pile:
                i = pile.pop()
                groupe.append(i)
                x = i % W
                for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
                    if 0 <= j < W * H and j not in vus and (data[j] & 0x0FFFFFFF):
                        vus.add(j)
                        pile.append(j)
            gs = [data[i] & 0x0FFFFFFF for i in groupe]
            xs, ys = [i % W for i in groupe], [i // W for i in groupe]
            w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            bas = [i % W for i in groupe if i // W == max(ys)]
            fx, fy = (min(bas) + max(bas) + 1) / 2 * T, (max(ys) + 1) * T
            if any(est_sapin(g) for g in gs if g <= ANCIEN):
                retires.setdefault(nom, set()).update(groupe)
                poses.append((fy, fx, 'pin', 4, 4))
                continue
            x0, y0 = min(xs), min(ys)
            vue = Image.new('RGBA', (w * T, h * T + 16))
            for i in groupe:
                g = data[i] & 0x0FFFFFFF
                if g <= ANCIEN:
                    vue.alpha_composite(tuile(g), ((i % W - x0) * T, (i // W - y0) * T))
            pieds = A3.pieds(vue)
            if pieds:
                retires.setdefault(nom, set()).update(groupe)
                for (px_, py_, hw) in pieds:
                    poses.append((y0 * T + py_, x0 * T + px_, 'arbre', 3, 4))
    for nom in ['plantes_pierres', 'decor'] + ARBRES:
        data = couches[nom]['data']
        vus = set(retires.get(nom, ()))
        for i0, v0 in enumerate(data):
            g0 = v0 & 0x0FFFFFFF
            if i0 in vus or not g0 or g0 > ANCIEN or not buisson_pack(g0):
                continue
            pile, groupe = [i0], []
            vus.add(i0)
            while pile:
                i = pile.pop()
                groupe.append(i)
                x = i % W
                for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
                    gj = data[j] & 0x0FFFFFFF if 0 <= j < W * H else 0
                    if j not in vus and gj and gj <= ANCIEN and buisson_pack(gj):
                        vus.add(j)
                        pile.append(j)
            if not all(classe[(i % W, i // W)] == 'herbe' for i in groupe):
                continue
            ys = [i // W for i in groupe]
            bas = [i % W for i in groupe if i // W == max(ys)]
            retires.setdefault(nom, set()).update(groupe)
            poses.append(((max(ys) + 1) * T, (min(bas) + max(bas) + 1) / 2 * T, 'buisson_rond' if i0 % 2 else 'buisson_large', 3, 2))

    nouvelles = {}
    for nom, l in couches.items():
        data = list(l['data'])
        for i, v in enumerate(data):
            g = v & 0x0FFFFFFF
            if not g:
                continue
            if g > ANCIEN:                                     # feuilles, vent : planches qui suivent
                data[i] = v + (PV.COLS * PV.RANGEES - ANCIEN)
                continue
            if nom in SOL and nom != 'decor':
                data[i] = 0                                    # sol, bordures, ancienne eau : refaits
            elif g in BARRIERES_V1:
                data[i] = 0                                    # les barrières : refaites (plus bas)
            elif i in retires.get(nom, ()):
                data[i] = 0
            elif nom in ('decor', 'plantes_pierres') + tuple(ARBRES) and plaque(g):
                data[i] = 0                                    # un morceau de sol de l'ancienne planche
            elif nom == 'decor' and not (sur_herbe(i) and len([p for p in tuile(g).get_flattened_data() if p[3] > 200]) < 200):
                data[i] = 0                                    # pavés, abords des mares
        nouvelles[nom] = data
    nouvelles['ground'] = ground
    nouvelles['contour_herbe'] = rives
    # les barrières : dessinées avec les nouvelles pièces, découpées en tuiles, sur leurs couches
    HERBES = {PV.gid('herbe_deco', k) for k in range(16 * 10)} | {399, 177, 175, 394, 400, 396, 397, 398, 322, 100, 101, 102, 320}
    cases, uniques = BA.tuiles(BA.dessiner(W, H), W, H)
    _, _, _, bw, bh, _ = PV.BLOCS['barrieres']
    BA.planche(uniques, bw, bh)
    portails = BA.portails(W)
    for nom in BARRIERES:
        nouvelles[nom] = [0] * (W * H)
    for i, k in cases.items():
        assert not nouvelles['decor'][i], f'case {i % W},{i // W} : déjà un décor sous la barrière'
        nouvelles[BARRIERES[1] if i in portails else BARRIERES[0]][i] = PV.gid('barrieres', k)
        if nouvelles['plantes_pierres'][i] in HERBES:
            nouvelles['plantes_pierres'][i] = 0                # ni herbe haute ni fleur sur la barrière
    print(f'barrières : {len(cases)} cases, {len(uniques)} tuiles (assets/barrieres.png)')
    for i, g in enumerate(semis):
        if g and not nouvelles['plantes_pierres'][i] and not nouvelles['decor'][i] and i not in cases:
            nouvelles['plantes_pierres'][i] = g
    # le devant des troncs des arbres retirés (touffes d'herbe de layer_tree_top)
    tous_retires = set().union(*[v for k, v in retires.items() if k.startswith('layer_tree')]) if retires else set()
    nouvelles['layer_tree_top'] = [0 if (i in tous_retires or i - W in tous_retires) else v for i, v in enumerate(nouvelles['layer_tree_top'])]

    # ---- 5. les nouveaux arbres, en tuiles : chaque dessin va dans la couche la plus en
    # arrière où il ne chevauche rien de déjà posé devant lui (du fond vers l'avant)
    def transparente(g):
        return not any(p[3] for p in tuile(g, P).get_flattened_data())

    ordre = list(ARBRES)                                     # du fond vers l'avant
    occupe = {nom: {i for i, v in enumerate(nouvelles[nom]) if v} for nom in ordre}
    places = []                                              # (couche, cases) des dessins posés
    ombres = []
    for fy, fx, bloc, w, h in sorted(poses):
        x0 = int(round(fx / T - w / 2))
        y1 = int(round(fy / T)) - 1
        cases = []
        for k in range(w * h):
            tx, ty = x0 + k % w, y1 - h + 1 + k // w
            g = PV.gid(bloc, k)
            if 0 <= tx < W and 0 <= ty < H and not transparente(g):
                cases.append((ty * W + tx, g))
        if not cases:
            continue
        idx = {i for i, _ in cases}
        # ni chevauchement ni contact dans une couche : le jeu reconnaît un arbre (la hache) à
        # son groupe de cases voisines d'une même couche
        autour = idx | {j for i in idx for j in (i - 1 if i % W else -1, i + 1 if i % W < W - 1 else -1, i - W, i + W) if 0 <= j < W * H}
        # plus en avant que tout dessin déjà posé qu'il chevauche
        niveau = 0
        for (nom, autres) in places:
            if idx & autres:
                niveau = max(niveau, ordre.index(nom) + 1)
        while True:
            if niveau >= len(ordre):
                nom = f'layer_tree_0{"b" * (niveau - len(ARBRES))}'   # layer_tree_0, layer_tree_0b… devant
                ordre.append(nom)
                nouvelles[nom] = [0] * (W * H)
                occupe[nom] = set()
            nom = ordre[niveau]
            if not (autour & occupe[nom]):
                break
            niveau += 1
        for i, g in cases:
            nouvelles[nom][i] = g
        occupe[nom] |= idx
        places.append((nom, idx))
        hw = {'arbre': 20, 'pin': 17}.get(bloc, 12)
        ombres.append(((x0 + w / 2) * T, (y1 + 1) * T - (3 if bloc in ('arbre', 'pin') else 2), hw))
    print('arbres, pins, buissons posés :', Counter(p[2] for p in poses), '; couches d\'arbres :', ordre)

    # ---- 6. la carte : couches dans l'ordre d'origine, les nouvelles couches d'arbres devant
    # layer_tree_1 ; les planches qui suivent la planche agrandie, décalées
    sortie = dict(m)
    sortie['layers'] = []
    prochain = max(l.get('id', 0) for l in m['layers']) + 1
    for l in m['layers']:
        if l['type'] == 'tilelayer':
            l = dict(l, data=nouvelles[l['name']])
        sortie['layers'].append(l)
        if l.get('name') == 'decor':
            for nom in BARRIERES:
                sortie['layers'].append(dict(l, name=nom, id=prochain, data=nouvelles[nom]))
                prochain += 1
        if l.get('name') == 'layer_tree_1':
            for nom in ordre[len(ARBRES):]:
                sortie['layers'].append(dict(l, name=nom, id=prochain, data=nouvelles[nom]))
                prochain += 1
    # l'herbe haute (scripts/carte/herbe_haute.py) : un point par touffe, sur l'herbe libre
    rects = [o for l in m['layers'] if l['type'] == 'objectgroup' for o in l.get('objects', []) if o.get('width')]
    dessus = [n for n in nouvelles if n not in ('ground', 'plantes_pierres')]     # une fleur, une touffe : sous l'herbe haute

    def libre(tx, ty):
        if not (0 <= tx < W and 0 <= ty < H) or not sur_herbe(ty * W + tx):
            return False
        i = ty * W + tx
        if nouvelles['plantes_pierres'][i] not in HERBES | {0}:
            return False                                       # une pierre, une souche : pas d'herbe haute dessus
        if any(nouvelles[n][i] for n in dessus) or any(nouvelles[n][i + W] for n in dessus if n.startswith('layer_tree') and i + W < W * H):
            return False
        return not any(o['x'] - T < tx * T + 8 < o['x'] + o['width'] + T and o['y'] - T < ty * T + 8 < o['y'] + o['height'] + T for o in rects)

    herbes = HH.touffes(libre)
    sortie['layers'].append({'id': prochain, 'name': 'herbe_haute', 'type': 'objectgroup', 'draworder': 'topdown',
                             'x': 0, 'y': 0, 'opacity': 1, 'visible': True,
                             'objects': [{'id': 9000 + k, 'name': '', 'type': str(v), 'x': x, 'y': y, 'width': 0, 'height': 0,
                                          'rotation': 0, 'visible': True, 'point': True} for k, (x, y, v) in enumerate(herbes)]})
    prochain += 1
    print(f'herbe haute : {len(herbes)} touffes')
    sortie['nextlayerid'] = prochain
    sortie['tilesets'] = []
    for t in m['tilesets']:
        t = dict(t)
        if t['firstgid'] > 1:
            t['firstgid'] += PV.COLS * PV.RANGEES - ANCIEN
        sortie['tilesets'].append(t)
    # comme Tiled : les données d'une couche, une rangée de la carte par ligne
    datas = []
    for l in sortie['layers']:
        if l['type'] == 'tilelayer':
            datas.append(l['data'])
            l['data'] = f'@DATA{len(datas) - 1}@'
    texte = json.dumps(sortie, ensure_ascii=False, indent=1)
    for k, d in enumerate(datas):
        rangs = [', '.join(map(str, d[y * W:(y + 1) * W])) for y in range(H)]
        texte = texte.replace(f'"@DATA{k}@"', '[' + ',\n            '.join(rangs) + ']')
    for l, d in zip([l for l in sortie['layers'] if l['type'] == 'tilelayer'], datas):
        l['data'] = d
    with open(CIBLE, 'w', encoding='utf-8') as f:
        f.write(texte)
    print('assets/carte_printemps_elargie.tmj : carte version 2')

    # ---- 7. les ombres : un ovale par arbre et buisson, hors des pixels des arbres
    arbres = Image.new('RGBA', (W * T, H * T))
    for nom in ordre + ['layer_tree_top']:
        for i, v in enumerate(nouvelles[nom]):
            g = v & 0x0FFFFFFF
            if g and g <= PV.COLS * PV.RANGEES:
                arbres.alpha_composite(tuile(g, P), ((i % W) * T, (i // W) * T))
    alpha = {}
    for cx, cy, hw in ombres:
        A3.ovale(alpha, *A3.ombre_de((cx, cy + 1, hw / 0.95)))
    out = Image.new('RGBA', arbres.size)
    ap, op = arbres.load(), out.load()
    for (x, y), a in alpha.items():
        if 0 <= x < out.width and 0 <= y < out.height and ap[x, y][3] == 0:
            op[x, y] = A3.OMBRE + (a,)
    out.save(OMBRES)
    print(f'assets/ombres_arbres.png : {len(ombres)} ombres')

    if '--apercu' in sys.argv:
        img = Image.new('RGBA', (W * T, H * T), (105, 150, 84, 255))
        for l in sortie['layers']:
            if l['type'] != 'tilelayer':
                continue
            if l['name'] == 'layer_tree_4':
                img.alpha_composite(out)
            for i, v in enumerate(l['data']):
                g = v & 0x0FFFFFFF
                if g and g <= PV.COLS * PV.RANGEES:
                    img.alpha_composite(tuile(g, P), ((i % W) * T, (i // W) * T))
        img.save(os.path.join(ROOT, 'apercu_carte_v2.png'))
        print('apercu_carte_v2.png')


if __name__ == '__main__':
    main()
