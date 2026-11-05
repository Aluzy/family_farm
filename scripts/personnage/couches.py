# Les personnages en couches (chantier « couches », étape E4 : docs/personnage-couches.md).
#
# Une planche (112 cases de 16 × 32) s'assemble à partir de ses éléments et de couches communes :
#   - les éléments du haut du corps (le corps, le haut, le bas, la coupe, le couvre-chef, la barbe, les lunettes…) :
#     chacun sa grille de 12 × 25 par vue, sans ce qui le recouvre (modeles.elements) ; dans une case, la grille
#     est seulement posée plus ou moins haut (son décalage, dy) ; quand les bras sont redessinés, le corps et le
#     haut perdent les zones des bras (chibi.ZONES) ; endormi, le corps ferme les yeux ;
#   - les couches posées une fois pour toutes, les mêmes pour tous les personnages d'un âge : les outils derrière
#     et devant, les bras (le lointain, ceux qui passent sous le corps, ceux posés dessus), les jambes (celles d'un
#     modèle retouché lui sont propres) ;
#   - les règles : l'ordre des couches (ORDRE), le masque d'un couvre-chef (modeles.MASQUE_TETE), le contour d'un
#     bras posé sur la tête ou le torse, le contour de la silhouette (Canvas.outline), le raccourci d'un enfant.
# Tout est en lettres ; la palette du personnage leur donne leurs couleurs (modeles.palette_de).
#
# chibi.py dessine chaque case en entier, et retient pour chaque pixel l'étape qui l'a posé (Canvas.ph) et la pose
# de la case (cv.trace). On en tire les couches communes (communes()), et on vérifie que l'assemblage (assembler())
# redonne exactement, lettre pour lettre, les cases de chibi.py pour les 100 personnages (verifier()).
#
#   python3 scripts/personnage/couches.py                  assemble et vérifie les 100 planches
#   python3 scripts/personnage/couches.py --combinaisons   et 60 personnages tirés au hasard, hors du catalogue
#   python3 scripts/personnage/couches.py --exporter       écrit assets/personnages/couches.json (pour le jeu)
#   python3 scripts/personnage/couches.py --fixture        écrit tests/engine/combinaison.png et .json (son test)
#   python3 scripts/personnage/couches.py --apparences     écrit tests/engine/apparences.png et .json (le test d'E6)
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chibi  # noqa: E402
import expressions  # noqa: E402
import fermier  # noqa: E402
import fermier as F  # noqa: E402
import modeles  # noqa: E402

# Les étapes de la pose, dans l'ordre où chibi.figure les dessine ; « modele » : les éléments du haut du corps.
ORDRE = ['derriere', 'bras_loin', 'jambes', 'bras_sous', 'modele', 'bras_dessus', 'devant']
COMMUNES = ['derriere', 'bras_loin', 'bras_sous', 'devant']      # (les jambes : par jeu de jambes ; bras_dessus : par bras)


def dessiner(nom, d=None):
    """Les cases de chibi.py pour `nom` (ou la description `d`, une combinaison hors du catalogue) : {case: Canvas}
    (px : les lettres, ph : les étapes, trace : la pose), avant le raccourci d'un enfant."""
    F.dessiner({'couleurs': {}})
    chibi.MODELE['m'] = chibi.Modele(nom, d)
    chibi.MODELE['age'] = 'enfant' if nom.startswith('enfant_') else 'adulte'
    return F.frames(chibi.figure)


def jeu_de_jambes(nom):
    """La clé des jambes de `nom` : celles d'un modèle retouché lui sont propres."""
    return nom if nom in modeles.RETOUCHES else 'standard'


def couches_de(cases):
    """Les couches posées d'une planche de chibi.py, chacune en entier (même ce que la suite recouvre) :
    {case: {étape: {(x, y): lettre}}} ; les bras posés sur le corps, un par un (bras_dessus:0, :1…), sans leur
    contour (assembler() le refait)."""
    out = {}
    for n, cv in cases.items():
        out[n] = {e: {p: L for p, L in px.items() if not (e.startswith('bras_dessus') and L == 'K')}
                  for e, px in cv.calques.items() if e != 'modele'}
    return out


def communes(age, references):
    """Les couches communes d'un âge, tirées d'un personnage de référence et des jambes de chacun :
    {'cases': {case: {étape: pixels}}, 'trace': {case: pose}, 'jambes': {clé: {case: pixels}}}."""
    nom = references[age]
    cases = dessiner(nom)
    C = couches_de(cases)
    return {
        'cases': {n: {e: px for e, px in par.items() if e != 'jambes'} for n, par in C.items()},
        'trace': {n: cv.trace for n, cv in cases.items()},
        'jambes': {jeu_de_jambes(nom): {n: par.get('jambes', {}) for n, par in C.items()}},
    }


def assembler(elts, chapeau, age, communs, jambes, zones):
    """Les 112 cases d'un personnage, en lettres : {case: [[lettre ou None] * 16] * 32}, après le raccourci d'un
    enfant. elts : ses éléments (modeles.elements) ; chapeau : son couvre-chef ; communs : communes(age) ;
    jambes : son jeu de jambes ; zones : {vue: (cases des bras, cases des mains)} (chibi.ZONES, les mêmes pour tous)."""
    out = {}
    for n, couches in communs['cases'].items():
        t = communs['trace'][n]
        v, dy = t['vue'], t['dy']
        px = {}
        for e in ('derriere', 'bras_loin'):
            px.update(couches.get(e, {}))
        px.update(jambes[n])
        px.update(couches.get('bras_sous', {}))
        # le haut du corps : chaque élément posé (dy), moins les bras quand ils sont redessinés, le masque d'un
        # couvre-chef, les yeux fermés
        retire = set()
        if t['masque']:
            retire = zones[v][0] | (zones[v][1] if t['masque'] == 'marche' else set())
        haut = {}
        for c, _, grilles in elts:
            if c == 'couvre_chef' and chapeau in modeles.COUVRE_TETE:
                for p in [p for p in haut if p[1] < modeles.MASQUE_TETE and modeles.famille(None, haut[p][0]) in ('corps', 'coiffure')]:
                    del haut[p]
            for (x, y), L in grilles.get(v, {}).items():
                if y >= chibi.TORSE or (c in ('corps', 'haut') and (x, y) in retire):
                    continue
                haut[(x, y)] = (L, c)
        if t['fermes']:
            for p, L in chibi.Modele.YEUX_FERMES.items():
                if p in haut:
                    haut[p] = (L, 'corps')
        poses = {}
        for (x, y), (L, _) in haut.items():
            poses[(chibi.TX + x, chibi.TY + y + dy)] = L
        px.update(poses)
        torse = set(poses)
        tete = {(chibi.TX + x, chibi.TY + y + dy) for (x, y) in haut if y < chibi.TETE}
        # les bras posés dessus, un par un : un contour les détache de la tête (ou du torse)
        for k, ref in enumerate(t['bras']):
            bras = couches.get(f'bras_dessus:{k}', {})
            contre = tete if ref == 'tete' else torse
            for (x, y) in bras:
                for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + ddx, y + ddy)
                    if q in contre and q not in bras and 0 <= q[0] < F.W and 0 <= q[1] < F.H:
                        px[q] = 'K'
            px.update(bras)
        px.update(couches.get('devant', {}))
        # le contour de la silhouette
        g = [[px.get((x, y)) for x in range(F.W)] for y in range(F.H)]
        cv = F.Canvas()
        cv.px = g
        cv.outline()
        g = cv.px
        if age == 'enfant':
            g = raccourci(g, chibi.rangees_enfant(n))
        out[n] = g
    return out


def raccourci(g, rangees):
    """chibi.raccourci, sur une case en lettres : les rangées `rangees` retirées, le haut tassé vers le bas."""
    rangs = [g[r] for r in range(F.H) if r not in rangees]
    return [[None] * F.W for _ in range(F.H - len(rangs))] + rangs


REFERENCES = {'adulte': 'perso_07', 'enfant': 'enfant_01'}


def verifier():
    """Assemble les 100 personnages et compare, lettre pour lettre, aux cases de chibi.py. → les écarts."""
    communs = {age: communes(age, REFERENCES) for age in REFERENCES}
    ecarts = []
    for nom, d in modeles.tous():
        age = 'enfant' if nom.startswith('enfant_') else 'adulte'
        cases = dessiner(nom)
        # (les couches communes de ce personnage : les mêmes que celles de la référence de son âge ?)
        C = couches_de(cases)
        for n, par in C.items():
            for e in set(par) | set(communs[age]['cases'][n]):
                if e == 'jambes':
                    continue
                if par.get(e, {}) != communs[age]['cases'][n].get(e, {}):
                    ecarts.append((nom, n, f'couche commune {e}'))
            if cases[n].trace != communs[age]['trace'][n]:
                ecarts.append((nom, n, 'pose'))
        jambes = {n: par.get('jambes', {}) for n, par in C.items()}
        cle = jeu_de_jambes(nom)
        connues = communs[age]['jambes'].setdefault(cle, jambes)
        if connues != jambes:
            ecarts.append((nom, '*', f'jambes {cle}'))
        zones = chibi.ZONES
        chapeau = None if nom in modeles.RETOUCHES else d['chapeau']
        g = assembler(modeles.elements(nom, d), chapeau, age, communs[age], jambes, zones)
        for n, cv in cases.items():
            attendu = raccourci(cv.px, chibi.rangees_enfant(n)) if age == 'enfant' else cv.px
            if g[n] != attendu:
                k = [(x, y) for y in range(F.H) for x in range(F.W) if g[n][y][x] != attendu[y][x]]
                ecarts.append((nom, n, f'{len(k)} pixels, {k[:3]}'))
    return ecarts


def combinaisons(n=60, graine=7):
    """Des personnages qui ne sont pas au catalogue : n tirages au hasard (une graine fixe) de chaque élément
    (peau, yeux, cheveux, coupe, couvre-chef, détails, haut, motif, bas), dessinés par chibi.py et assemblés depuis
    leurs couches : les écarts."""
    import random
    import catalogue
    r = random.Random(graine)
    communs = {age: communes(age, REFERENCES) for age in REFERENCES}
    ecarts = []
    for k in range(n):
        age = ('adulte', 'enfant')[k % 2]
        nom = ('perso_' if age == 'adulte' else 'enfant_') + f'x{k}'
        details = [x for x in modeles.ORDRE_DETAILS_CARTE if r.random() < 0.2]
        if 'barbe' in details and 'moustache' in details:
            details.remove('moustache')
        d = {'peau': r.choice(list(catalogue.PEAU)), 'cheveux': r.choice(list(catalogue.CHEVEUX)),
             'coupe': r.choice(modeles.COUPES), 'chapeau': r.choice([None] + list(modeles.CHAPEAUX)),
             'accessoire': r.choice(list(catalogue.ACCESSOIRES.values())), 'details': details,
             'habit': r.choice(list(catalogue.HABITS)), 'motif': r.choice([None, 'rayures', 'carreaux', 'pois']),
             'bas': r.choice(catalogue.BAS), 'yeux': r.choice(list(catalogue.YEUX))}
        cases = dessiner(nom, d)
        zones = chibi.ZONES
        jambes = {n2: par.get('jambes', {}) for n2, par in couches_de(cases).items()}
        if jambes != communs[age]['jambes']['standard']:
            ecarts.append((nom, '*', 'jambes'))
        g = assembler(modeles.elements(nom, d), d['chapeau'], age, communs[age], jambes, zones)
        for n2, cv in cases.items():
            attendu = raccourci(cv.px, chibi.rangees_enfant(n2)) if age == 'enfant' else cv.px
            if g[n2] != attendu:
                ecarts.append((nom, n2, d['coupe'], d['chapeau'], d['details'], d['motif']))
    return ecarts


def _px(d):
    """Des pixels {(x, y): lettre} en texte compact : « x,y,lettre;… », triés ; les noms de fermier.C qui sont des
    rôles de la palette (chibi.ROLES : les jambes assises) écrits en rôles."""
    return ';'.join(f'{x},{y},{chibi.ROLES.get(L, L)}' for (x, y), L in sorted(d.items(), key=lambda t: (t[0][1], t[0][0])))


# Les noms de fermier.C employés tels quels (les outils, le contour K), hors des rôles de la palette.
OUTILS = {k for k in F.BASE if k not in chibi.ROLES}
RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def exporter(chemin=os.path.join(RACINE, 'assets', 'personnages', 'couches.json')):
    """assets/personnages/couches.json : de quoi assembler les planches dans le jeu (étape E5)."""
    import json
    communs = {age: communes(age, REFERENCES) for age in REFERENCES}
    elements, personnages, palettes = {}, {}, {}
    for nom, d in modeles.tous():
        age = 'enfant' if nom.startswith('enfant_') else 'adulte'
        cases = dessiner(nom)
        cle = jeu_de_jambes(nom)
        communs[age]['jambes'].setdefault(cle, {n: par.get('jambes', {}) for n, par in couches_de(cases).items()})
        elts = modeles.elements(nom, d)
        for c, k, grilles in elts:
            elements.setdefault(f'{c}:{k}', {v: _px(g) for v, g in grilles.items()})
        personnages[nom] = {'age': age, 'elements': [f'{c}:{k}' for c, k, _ in elts],
                            'chapeau': None if nom in modeles.RETOUCHES else d['chapeau'], 'jambes': cle}
        # la palette : chaque lettre de ses éléments, de ses jambes et des couches communes de son âge (pas les noms
        # des outils), couleur résolue (les couleurs calculées comprises)
        textes = [_px(g) for _, _, grilles in elts for g in grilles.values()]
        textes += [_px(px) for px in communs[age]['jambes'][cle].values()]
        textes += [_px(px) for par in communs[age]['cases'].values() for px in par.values()]
        textes.append(_px(chibi.Modele.YEUX_FERMES))
        lettres = {t.split(',', 2)[2] for texte in textes if texte for t in texte.split(';')}
        palettes[nom] = {L: '#%02x%02x%02x' % chibi.couleur(L) for L in sorted(lettres) if L not in OUTILS}
    zones = {v: {'bras': ';'.join(f'{x},{y}' for x, y in sorted(b, key=lambda t: (t[1], t[0]))),
                 'mains': ';'.join(f'{x},{y}' for x, y in sorted(mn, key=lambda t: (t[1], t[0])))} for v, (b, mn) in chibi.ZONES.items()}
    doc = {
        'version': 1,
        '_': 'Les personnages en couches : voir docs/personnage-couches.md (étape E4) et scripts/personnage/couches.py.',
        'case': {'w': F.W, 'h': F.H},
        'modele': {'x': chibi.TX, 'y': chibi.TY, 'torse': chibi.TORSE, 'tete': chibi.TETE,
                   'masqueTete': modeles.MASQUE_TETE, 'couvreTete': list(modeles.COUVRE_TETE),
                   'masque': ['corps', 'coiffure'], 'retire': ['corps', 'haut']},
        'ordre': ORDRE, 'ordreModele': modeles.ORDRE_COUCHES,
        'familles': modeles.FAMILLES,
        'contourIgnore': ['K', 'dr', 'sd'],
        'enfant': {'rangees': list(chibi.ENFANT_RANGEES), 'rangeesAssis': list(chibi.ENFANT_RANGEES_ASSIS), 'assis': 'assis_'},
        'yeuxFermes': _px(chibi.Modele.YEUX_FERMES),
        'zones': zones,
        'cases': list(communs['adulte']['trace']),
        'poses': {age: C['trace'] for age, C in communs.items()},
        'communes': {age: {n: {e: _px(px) for e, px in par.items()} for n, par in C['cases'].items()} for age, C in communs.items()},
        'jambes': {age: {k: {n: _px(px) for n, px in J.items()} for k, J in C['jambes'].items()} for age, C in communs.items()},
        'outils': {k: '#%02x%02x%02x' % F.BASE[k] for k in sorted(OUTILS)},
        # (pour une apparence libre, étape E6 : les coupes et couvre-chefs des enfants ramenés à ceux que la carte
        # dessine, l'ordre des détails, et les expressions du visage, scripts/personnage/expressions.py)
        'enfantCoupes': fermier.COUPES_ENFANT,
        'enfantChapeaux': {k: v for k, v in fermier.CHAPEAUX_ENFANT.items() if k},
        'ordreDetails': list(modeles.ORDRE_DETAILS_CARTE),
        'expressions': {
            'liste': list(expressions.EXPRESSIONS), 'vues': list(expressions.VUES), 'y0': expressions.Y0,
            'zone': list(expressions.ZONE), 'coin': {'adulte': list(expressions.coin(False)), 'enfant': list(expressions.coin(True))},
            'grilles': expressions.EXPRESSIONS, 'releves': {k: list(v) for k, v in expressions.RELEVES.items()},
            'peauEntreYeux': [list(p) for p in expressions.PEAU_ENTRE_YEUX], 'protege': expressions.PROTEGE,
            'contour': '#%02x%02x%02x' % modeles.CONTOUR,
        },
        'elements': elements,
        'personnages': personnages,
        'palettes': palettes,
    }
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    return chemin


def fixture(identite='perso_12', tenue='perso_40'):
    """tests/engine/combinaison.png et .json : un personnage hors du catalogue (l'identité de l'un, la tenue de
    l'autre), sa planche dessinée par chibi.py, ses éléments et sa palette ; le test de l'assembleur du jeu
    (tests/engine/personnages-planches.test.mjs) doit la redonner au pixel près."""
    import json
    import catalogue
    P = catalogue.DOC['personnages']
    p = {'age': 'adulte', 'identite': P[identite]['identite'], 'tenue': P[tenue]['tenue']}
    d = catalogue.description(p)
    nom = 'perso_x'
    cases = dessiner(nom, d)
    elts = modeles.elements(nom, d)
    planche = None
    from PIL import Image
    planche = Image.new('RGBA', (F.COLS * F.W, ((len(cases) + F.COLS - 1) // F.COLS) * F.H), (0, 0, 0, 0))
    lettres = set()
    for k, (n, cv) in enumerate(cases.items()):
        planche.paste(chibi.render(cv), ((k % F.COLS) * F.W, (k // F.COLS) * F.H))
        lettres |= {chibi.ROLES.get(L, L) for r in cv.px for L in r if L is not None}
    for _, _, grilles in elts:
        lettres |= {L for g in grilles.values() for L in g.values()}
    lettres |= set(chibi.Modele.YEUX_FERMES.values())
    palette = {L: '#%02x%02x%02x' % chibi.couleur(L) for L in sorted(lettres) if L not in OUTILS}
    dossier = os.path.join(RACINE, 'tests', 'engine')
    planche.save(os.path.join(dossier, 'combinaison.png'))
    doc = {'_': f"L'identité de {identite}, la tenue de {tenue} (scripts/personnage/couches.py --fixture).",
           'def': {'age': 'adulte', 'elements': [f'{c}:{k}' for c, k, _ in elts], 'chapeau': d['chapeau'], 'jambes': 'standard'},
           'palette': palette}
    with open(os.path.join(dossier, 'combinaison.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return doc


def apparences(n=12, graine=11):
    """tests/engine/apparences.json et .png : n apparences tirées au hasard parmi les choix du catalogue (des
    identités et des tenues, comme les choisira le joueur ; adultes et enfants) : leurs éléments, leur palette et
    leurs 18 tuiles de visage (une rangée chacune dans le .png, comme visages.png) ; le jeu doit les retrouver
    (js/carte/planches.js : CartePlanches.apparence, CartePlanches.visages)."""
    import json
    import random
    import catalogue
    from PIL import Image
    r = random.Random(graine)
    Pal = catalogue.DOC['palettes']
    coupes = {'adulte': modeles.COUPES, 'enfant': list(fermier.COUPES_ENFANT)}
    chapeaux = {'adulte': [None] + list(modeles.CHAPEAUX), 'enfant': [None] + [k for k in fermier.CHAPEAUX_ENFANT if k]}
    out, rangs = [], []
    for k in range(n):
        age = ('adulte', 'enfant')[k % 2]
        ident = {'peau': r.choice(list(Pal['peau'])), 'yeux': r.choice(list(Pal['yeux'])), 'cheveux': r.choice(list(Pal['cheveux'])),
                 'coupe': r.choice(coupes[age]), 'pilosite': r.choice([None, None, 'barbe', 'moustache']) if age == 'adulte' else None,
                 'signes': [x for x in ('rousseur', 'joues') if r.random() < 0.35 or (x == 'joues' and age == 'enfant')]}
        tenue = {'haut': {'tissu': r.choice(list(Pal['tissus'])), 'motif': r.choice([None, 'rayures', 'carreaux', 'pois'])},
                 'bas': {'tissu': r.choice(list(Pal['bas']))}, 'couvre_chef': r.choice(chapeaux[age]),
                 'accessoire': r.choice(list(Pal['accessoires'])), 'accessoires': [x for x in ('lunettes', 'boucles', 'pansement') if r.random() < 0.25]}
        d = catalogue.description({'age': age, 'identite': ident, 'tenue': tenue})
        if age == 'enfant':
            d = dict(d, coupe=fermier.COUPES_ENFANT.get(d['coupe'], 'courts'), chapeau=fermier.CHAPEAUX_ENFANT.get(d['chapeau']))
        nom = ('perso_' if age == 'adulte' else 'enfant_') + f'a{k}'
        cases = dessiner(nom, d)
        elts = modeles.elements(nom, d)
        lettres = {chibi.ROLES.get(L, L) for cv in cases.values() for rr in cv.px for L in rr if L is not None}
        for _, _, grilles in elts:
            lettres |= {L for g in grilles.values() for L in g.values()}
        lettres |= set(chibi.Modele.YEUX_FERMES.values())
        palette = {L: '#%02x%02x%02x' % chibi.couleur(L) for L in sorted(lettres) if L not in OUTILS}
        # la planche, puis ses tuiles de visage (expressions.py)
        planche = Image.new('RGBA', (F.COLS * F.W, ((len(cases) + F.COLS - 1) // F.COLS) * F.H), (0, 0, 0, 0))
        for j, (cn, cv) in enumerate(cases.items()):
            im = chibi.render(cv)
            planche.paste(chibi.raccourci(im, chibi.rangees_enfant(cn)) if age == 'enfant' else im, ((j % F.COLS) * F.W, (j // F.COLS) * F.H))
        px = planche.load()
        modele_px = chibi.MODELE['m']
        face = {p: modele_px.couleur(L) for p, L in modele_px.vues['bas'].items()}
        c, prot = expressions.couleurs(face, d, 0), expressions.protegees(d, 0)
        x0, y0 = expressions.coin(age == 'enfant')
        noms_cases = list(cases)
        rang = []
        for e in expressions.EXPRESSIONS:
            for v in expressions.VUES:
                neutre = expressions.tuile(px, noms_cases.index(f'idle_{v}_0'), x0, y0)
                rang.append(expressions.exprimer(neutre, e, v, c, prot))
        rangs.append(rang)
        out.append({'age': age, 'identite': ident, 'tenue': tenue,
                    'def': {'age': age, 'elements': [f'{cc}:{kk}' for cc, kk, _ in elts], 'chapeau': d['chapeau'], 'jambes': 'standard'},
                    'palette': palette})
    w, h = expressions.ZONE[2], expressions.ZONE[3]
    im = Image.new('RGBA', (18 * w, n * h), (0, 0, 0, 0))
    for rr, rang in enumerate(rangs):
        for k, t in enumerate(rang):
            tt = Image.new('RGBA', (w, h))
            tt.putdata(list(t))
            im.paste(tt, (k * w, rr * h))
    dossier = os.path.join(RACINE, 'tests', 'engine')
    im.save(os.path.join(dossier, 'apparences.png'))
    with open(os.path.join(dossier, 'apparences.json'), 'w', encoding='utf-8') as f:
        json.dump({'_': 'Des apparences tirées au hasard (scripts/personnage/couches.py --apparences) : voir tests/engine/personnages-apparence.test.mjs.',
                   'apparences': out}, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    return out


def main():
    if '--apparences' in sys.argv:
        print(len(apparences()), 'apparences écrites dans tests/engine/apparences.json et .png')
        return 0
    if '--fixture' in sys.argv:
        print(fixture()['def'])
        return 0
    if '--exporter' in sys.argv:
        print(f'{exporter()} écrit')
        return 0
    if '--combinaisons' in sys.argv:
        e = combinaisons()
        for x in e[:20]:
            print('  ', x)
        print(f'60 personnages hors du catalogue : ' + ('assemblés exactement comme chibi.py les dessine' if not e else f'{len(e)} écarts'))
        return len(e)
    ecarts = verifier()
    for e in ecarts[:30]:
        print('  ', e)
    print(f'{len(modeles.tous())} personnages assemblés depuis leurs couches : '
          + ('identiques, lettre pour lettre, aux planches de chibi.py' if not ecarts else f'{len(ecarts)} écarts'))
    return len(ecarts)


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
