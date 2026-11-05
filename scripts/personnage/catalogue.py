# Le catalogue des personnages : assets/personnages/catalogue.json (la seule source, lue aussi par le jeu à
# l'étape E5 du chantier « couches », docs/personnage-couches.md). Ce module le lit et le présente aux
# générateurs comme avant : les palettes (PEAU, CHEVEUX, HABITS, ACCESSOIRES, BAS, YEUX) et, pour chaque
# personnage, sa description à plat (personnages(), enfants() : celle qu'attendent modeles.py,
# peau_emotions.py…).
#
# Le fichier :
#   palettes     : peau (clair, teinte, ombre, joues), yeux (pupille, reflet), cheveux (teinte, ombre,
#                  sombre), tissus (sombre, teinte, clair), bas (teinte, ombre), accessoires (une couleur)
#   personnages  : { nom: { age, identite, tenue } }, les 100 modèles prêts (perso_01 à perso_50,
#                  enfant_01 à enfant_50)
#     identite   : peau, yeux, cheveux (des noms de palettes), coupe, pilosite (null, barbe, moustache),
#                  signes (rousseur, joues)
#     tenue      : haut { tissu, motif (null, rayures, carreaux, pois) }, bas { tissu }, couvre_chef (null,
#                  paille, casquette, bonnet, beret, bandeau, fleur ; enfants : noeud, serre_tete),
#                  accessoire (la couleur du couvre-chef, des rubans et de la fleur), accessoires (lunettes,
#                  boucles, pansement)
#   Coupes : adultes longs, mi, carre, courts, frange, frange_carre, couettes, chignon, chauve ; enfants
#   court, frange, meche, herisse, boucles, long, queue, couettes, chignon (la carte les ramène aux coupes
#   qu'elle sait dessiner : fermier.COUPES_ENFANT).
#
#   python3 scripts/personnage/catalogue.py    réécrit catalogue.json dans sa mise en forme (après une
#                                              retouche à la main, ou pour vérifier qu'il se relit)
import json
import os

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FICHIER = os.path.join(RACINE, 'assets', 'personnages', 'catalogue.json')

# L'ordre dans lequel les détails du visage sont posés (le dernier l'emporte là où ils se touchent)
ORDRE_DETAILS = ('barbe', 'moustache', 'rousseur', 'lunettes', 'boucles', 'pansement', 'joues')


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def lire():
    with open(FICHIER, encoding='utf-8') as f:
        return json.load(f)


DOC = lire()
_P = DOC['palettes']
PEAU = {n: {'e': rgb(p['clair']), 'f': rgb(p['teinte']), 'j': rgb(p['ombre']), 'k': rgb(p['joues'])} for n, p in _P['peau'].items()}
YEUX = {n: (rgb(p['pupille']), rgb(p['reflet'])) for n, p in _P['yeux'].items()}
CHEVEUX = {n: {'b': rgb(p['teinte']), 'c': rgb(p['ombre']), 'd': rgb(p['sombre'])} for n, p in _P['cheveux'].items()}
HABITS = {n: {'l': rgb(p['sombre']), 'm': rgb(p['teinte']), 'n': rgb(p['clair'])} for n, p in _P['tissus'].items()}
BAS_NOMS = list(_P['bas'])
BAS = [(rgb(p['teinte']), rgb(p['ombre'])) for p in _P['bas'].values()]
ACCESSOIRES = {n: rgb(c) for n, c in _P['accessoires'].items()}


def fonce(c, k=0.72):
    return tuple(int(v * k) for v in c)


def description(p):
    """La description à plat d'un personnage du catalogue (identité + tenue), comme l'attendent les
    générateurs : peau, cheveux, coupe, chapeau, accessoire (rgb), details, habit, motif, bas (rgb, rgb), yeux."""
    ident, tenue = p['identite'], p['tenue']
    details = ([ident['pilosite']] if ident['pilosite'] else []) + ident['signes'] + tenue['accessoires']
    return {
        'peau': ident['peau'], 'cheveux': ident['cheveux'], 'coupe': ident['coupe'], 'yeux': ident['yeux'],
        'chapeau': tenue['couvre_chef'], 'accessoire': ACCESSOIRES[tenue['accessoire']],
        'details': sorted(details, key=ORDRE_DETAILS.index),
        'habit': tenue['haut']['tissu'], 'motif': tenue['haut']['motif'], 'bas': BAS[BAS_NOMS.index(tenue['bas']['tissu'])],
    }


def _age(age):
    return [(nom, description(p)) for nom, p in DOC['personnages'].items() if p['age'] == age]


def personnages():
    """Les 50 adultes : [(nom, description)]."""
    return _age('adulte')


def enfants():
    """Les 50 enfants : [(nom, description)] (leurs coupes et couvre-chefs d'enfants)."""
    return _age('enfant')


def ecrire(doc, chemin=FICHIER):
    """Le catalogue mis en forme : les palettes une couleur par ligne, un personnage par ligne."""
    d = lambda x: json.dumps(x, ensure_ascii=False)
    L = ['{', f'"version": {doc["version"]},', '"palettes": {']
    pals = list(doc['palettes'].items())
    for k, (nom, pal) in enumerate(pals):
        L.append(f'  {d(nom)}: {{')
        items = list(pal.items())
        L += [f'    {d(n)}: {d(v)}' + (',' if j < len(items) - 1 else '') for j, (n, v) in enumerate(items)]
        L.append('  }' + (',' if k < len(pals) - 1 else ''))
    L += ['},', '"personnages": {']
    ps = list(doc['personnages'].items())
    L += [f'  {d(n)}: {d(p)}' + (',' if j < len(ps) - 1 else '') for j, (n, p) in enumerate(ps)]
    L += ['}', '}']
    with open(chemin, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    ecrire(lire())
    print(f'{FICHIER} : {len(DOC["personnages"])} personnages')
