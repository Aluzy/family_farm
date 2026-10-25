# Les hameaux bâtis du grand monde (docs/grand-monde.md, étape 7 : fiche 7a) : la planche de tout ce
# qu'on y voit, posée comme la végétation (js/carte/ferme/vegetation.js, la planche « hameaux »).
#
#   python3 scripts/carte/hameaux.py            écrit assets/hameaux.png et assets/hameaux.json
#   python3 scripts/carte/hameaux.py --apercu   écrit aussi apercu_hameaux.png (la planche agrandie,
#                                               sur l'herbe)
#
# Relancer le script redonne la même image (aucun hasard qui ne soit tiré de clés fixes).
#
# Les maisons des hameaux sont faites des mêmes blocs que la maison du joueur : leurs murs, leurs
# fenêtres et leurs portes sont repris de assets/murs_hauts.png et assets/blocs.png (scripts/carte/
# blocs.py : les murs hauts en pierre, en pierre de taille — la pierre blanche de la côte — et en
# bois, raccordés à leurs voisins par leur masque, comme à la ferme), leurs meubles des dessins des
# meubles (assets/meuble_*.png), leurs sols des modèles de sols, les arbres des jardins de
# assets/verger.png (en fruits), les légumes des potagers de assets/crops.png, le puits de
# assets/puits.png. Le relancer après avoir retouché ces dessins les reprend.
#
# Ce qui manquait est dessiné ici, dans le style des blocs (vue de haut à 45°, lumière en haut à
# gauche, contour brun sombre d'un pixel, le bois et la pierre de blocs.py) : le banc de la place, le
# panneau au nom du hameau, les tas de bois, le billot du bûcheron, la barque et le séchoir à filets
# du pêcheur, le wagonnet et le tas de minerai du mineur, l'auge de l'enclos du berger, la claie et
# les paniers du cueilleur, le poulailler, le coffre de la salle commune. Les toits (tuiles, ardoise,
# chaume, roseaux) sont dessinés par la scène (CarteKit.toit, js/carte/toit.js).
#
# Les sortes, leur ordre et leurs variantes sont ceux de data/monde.json (HAMEAUX.SORTES) ; la table
# (assets/hameaux.json : { "sorte": [[x, y, l, h, px, py]…] }, une entrée par variante : le rectangle
# dans la planche et le pied, le point posé au sol) a la forme de celle des rochers. Le pied d'une
# pièce d'une case : le milieu du bas de sa case ; de deux ou trois cases : le milieu du bas de ses
# cases ; un lit : 8 px plus haut (rangé derrière qui passe devant lui, comme à la ferme : PIED).
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, os.path.join(HERE, '..', 'batiments'))  # style_v2.py (blocs.py)
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour, hasard  # noqa: E402
import blocs as B  # noqa: E402

SORTIE = os.path.join(ASSETS, 'hameaux.png')
SORTIE_JSON = os.path.join(ASSETS, 'hameaux.json')
DONNEES = os.path.join(ROOT, 'data', 'monde.json')
LARGEUR_PLANCHE = 512

OUT = B.OUT
BOIS, PIERRE, PAILLE, FER, TERRE, VERT = B.BOIS, B.PIERRE, B.PAILLE, B.FER, B.TERRE, B.VERT
FILET = [(92, 96, 88), (150, 152, 138), (204, 204, 186)]
EAU = [(40, 84, 120), (66, 128, 168)]
CUIVRE = [(120, 62, 30), (184, 104, 52), (226, 160, 96)]
BAIES = [(110, 30, 60), (176, 52, 84)]
CHAMPI = [(150, 70, 40), (214, 120, 70), (240, 226, 200)]
HERBES = [(70, 96, 40), (112, 140, 60), (168, 182, 90)]
PIED = 8   # (un lit : son pied est remonté d'autant)

# Les cadres des planches reprises (config.js, BLOCS_CARTE : leurs numéros)
MURS_HAUTS = {'pierre': 0, 'taille': 225, 'bois': 371}
FENETRES = 441                     # BLOCS_CARTE.hauts.fenetres.modeles.mur_fenetre
MATIERE = {'pierre': 0, 'taille': 5, 'bois': 6}   # rang dans matieresPortes
PORTES = {'pierre': 16, 'taille': 390, 'bois': 391}
PORTE_VERTICALE, FOUR, CUISINIERE, BARRIERES = 30, 5, 6, 50
SOLS = {'sol_plancher': 31, 'sol_dalles': 90, 'sol_tomettes': 122, 'paves': 170}
MEUBLES = {'lit_adulte': 'lit_adulte', 'lit_enfant': 'lit_enfant', 'table': 'table', 'table_basse': 'table_basse',
           'chaise': 'chaise', 'buffet': 'buffet', 'armoire': 'armoire_chene', 'chevet': 'chevet'}
LEGUMES = ['carotte', 'patate', 'tomate', 'oignon', 'epinard', 'fraise']


# ---------- un petit pinceau ----------

class Toile:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, f):
        """Remplit une ellipse ; f(u, v) → la couleur (u, v de -1 à 1 : la place dans l'ellipse)."""
        for y in range(self.h):
            for x in range(self.w):
                u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                if u * u + v * v <= 1:
                    self.put(x, y, f(u, v))

    def fini(self):
        return contour(self.im, OUT)


def boite(t, x0, x1, base, face, dessus, tons, joints=None):
    """Une boîte de bois vue à 45° : son dessus (dessus px, éclairé), sa face (face px) au-dessus de
    `base` ; tons : 5 tons du sombre au clair ; joints : tous les combien de px une planche."""
    for y in range(base - face - dessus + 1, base + 1):
        for x in range(x0, x1 + 1):
            if y <= base - face:
                c = tons[4] if y == base - face - dessus + 1 else tons[3]
            else:
                c = tons[2] if (y - (base - face)) % (joints or 99) else tons[1]
                if x == x0:
                    c = tons[3]
                elif x == x1:
                    c = tons[1]
            t.put(x, y, c)


# ---------- les objets du hameau ----------

def banc():
    """Le banc de la place : deux cases de large, une planche d'assise sur quatre pieds, un dossier."""
    t = Toile(32, 22)
    for x in (4, 27):
        t.rect(x, 4, x + 1, 13, BOIS[1])          # les montants du dossier
    t.rect(3, 5, 28, 6, BOIS[3]); t.rect(3, 7, 28, 7, BOIS[2])     # le dossier
    t.rect(3, 9, 28, 9, BOIS[1])
    for x in (5, 26):
        t.rect(x, 15, x + 1, 20, BOIS[0])         # les pieds
    t.rect(2, 12, 29, 13, BOIS[4]); t.rect(2, 14, 29, 15, BOIS[2])     # l'assise
    for x in range(6, 28, 7):
        t.put(x, 12, BOIS[3])
    return t.fini(), (16, 22)


def panneau():
    """Le panneau au nom du hameau : un poteau, une planche clouée où le nom se devine."""
    t = Toile(22, 30)
    t.rect(10, 10, 11, 29, BOIS[1]); t.put(10, 10, BOIS[3])
    t.rect(1, 3, 20, 12, BOIS[3])
    t.rect(1, 3, 20, 3, BOIS[4]); t.rect(1, 12, 20, 12, BOIS[1])
    for y in (6, 9):
        for x in range(4, 18):
            if hasard(x, y, 7) < 0.75:
                t.put(x, y, BOIS[0])                 # les lettres peintes
    for x, y in ((2, 4), (19, 4), (2, 11), (19, 11)):
        t.put(x, y, FER[2])
    return t.fini(), (11, 30)


def tas_bois(v):
    """Un tas de bûches empilées : leurs bouts ronds (cernes clairs), l'écorce sombre."""
    t = Toile(16, 22)
    rangs = [(13, [3, 8, 13]), (9, [5, 10]), (5, [8])] if v == 0 else [(13, [3, 8, 13]), (9, [3, 8, 13]), (5, [5, 10])]
    for y, xs in rangs:
        for x in xs:
            t.ellipse(x, y + 4, 2.6, 2.6, lambda u, w: PAILLE[3] if u * u + w * w < 0.3 else PAILLE[2] if u * u + w * w < 0.62 else BOIS[1])
    t.rect(0, 20, 15, 21, BOIS[0])
    return t.fini(), (8, 22)


def billot():
    """Le billot du bûcheron : une souche coupée net, une hache plantée dedans."""
    t = Toile(16, 22)
    t.ellipse(8, 11, 6, 3, lambda u, v: PAILLE[3] if u * u + v * v < 0.35 else PAILLE[2])
    t.rect(2, 12, 13, 19, BOIS[2]); t.rect(2, 12, 2, 19, BOIS[3]); t.rect(13, 12, 13, 19, BOIS[1])
    for x in (5, 9):
        t.rect(x, 13, x, 18, BOIS[1])
    t.rect(1, 20, 14, 21, BOIS[0])
    t.rect(9, 1, 10, 10, BOIS[3])                 # le manche
    t.rect(6, 8, 12, 10, FER[3]); t.rect(6, 10, 12, 10, FER[1])     # le fer
    return t.fini(), (8, 22)


def barque():
    """La barque tirée au sec, vue de haut : sa coque de planches, deux bancs, une rame."""
    t = Toile(34, 18)
    t.ellipse(17, 9, 15.5, 7, lambda u, v: BOIS[2] if abs(v) > 0.7 else BOIS[3] if v < 0 else BOIS[2])
    t.ellipse(17, 9, 13, 4.6, lambda u, v: BOIS[1] if v < -0.5 else BOIS[2])
    for x in (11, 22):
        t.rect(x, 5, x + 1, 13, BOIS[4])
    for x in range(5, 30):
        t.put(x, 9, BOIS[1] if x % 4 else BOIS[0])
    t.rect(6, 15, 28, 15, BOIS[4]); t.rect(26, 14, 29, 16, BOIS[3])   # la rame
    return t.fini(), (17, 18)


def sechoir():
    """Le séchoir à filets : deux perches, une traverse, le filet qui pend en losanges, des flotteurs."""
    t = Toile(34, 30)
    for x in (3, 30):
        t.rect(x, 2, x + 1, 29, BOIS[1]); t.put(x, 2, BOIS[3])
    t.rect(2, 3, 31, 4, BOIS[3])
    for y in range(5, 25):
        for x in range(5, 30):
            if ((x + y) % 6 == 0 or (x - y) % 6 == 0) and y < 24 - abs(x - 17) // 4:
                t.put(x, y, FILET[2] if (x + y) % 6 == 0 else FILET[1])
    for x in range(6, 30, 5):
        t.put(x, 6, (210, 90, 50)); t.put(x + 1, 6, (230, 130, 70))
    return t.fini(), (17, 30)


def wagonnet():
    """Le wagonnet du mineur : une caisse de bois cerclée de fer sur ses roues, pleine de minerai."""
    t = Toile(16, 22)
    boite(t, 1, 14, 18, 8, 5, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]])
    for x in range(2, 14):
        t.put(x, 8 + (1 if hasard(x, 3) < 0.4 else 0), PIERRE[2])
    for x in (3, 6, 9, 12):
        t.put(x, 7, CUIVRE[2] if x % 2 else PIERRE[4])
    t.rect(1, 12, 14, 12, FER[2]); t.rect(1, 16, 14, 16, FER[2])
    for x in (4, 11):
        t.ellipse(x + 0.5, 19.5, 2.2, 2.2, lambda u, v: FER[1] if u * u + v * v > 0.3 else FER[3])
    return t.fini(), (8, 22)


def tas_minerai():
    """Un tas de minerai : des pierres grises, des éclats de cuivre."""
    t = Toile(16, 16)
    for k, (x, y, r) in enumerate([(5, 11, 3.6), (11, 11, 3.6), (8, 7.5, 3.4), (8, 12, 3)]):
        t.ellipse(x, y, r, r * 0.85, lambda u, v, k=k: PIERRE[4] if v < -0.3 and u < 0.2 else PIERRE[2] if v > 0.4 else PIERRE[3])
    for x, y in ((6, 9), (10, 12), (9, 6), (4, 12)):
        t.put(x, y, CUIVRE[1]); t.put(x + 1, y, CUIVRE[2])
    return t.fini(), (8, 16)


def auge():
    """L'auge de l'enclos du berger : un bac de planches, de l'eau dedans."""
    t = Toile(32, 16)
    boite(t, 2, 29, 14, 6, 5, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]], joints=3)
    t.rect(4, 5, 27, 7, EAU[0]); t.rect(4, 5, 27, 5, EAU[1])
    return t.fini(), (16, 16)


def claie():
    """La claie du cueilleur : un châssis de branches, des bouquets d'herbes qui sèchent la tête en bas."""
    t = Toile(34, 26)
    for x in (3, 30):
        t.rect(x, 3, x + 1, 25, BOIS[1])
    t.rect(2, 4, 31, 5, BOIS[3])
    for k, x in enumerate(range(6, 30, 4)):
        c = HERBES[k % 3]
        for y in range(6, 14):
            for dx in range(-1, 2):
                if hasard(x, y, dx) < 0.8 - (y - 6) * 0.04:
                    t.put(x + dx, y, c if dx else HERBES[2])
        t.put(x, 6, PAILLE[1])
    t.rect(4, 22, 29, 23, BOIS[2])                  # le plateau du bas, des champignons qui sèchent
    for x in range(6, 28, 3):
        t.put(x, 21, CHAMPI[1]); t.put(x + 1, 21, CHAMPI[0])
    return t.fini(), (17, 26)


def paniers():
    """Des paniers d'osier : l'un de champignons, l'autre de baies."""
    t = Toile(16, 18)
    for (x0, x1, y, fruit) in ((1, 8, 16, CHAMPI), (8, 14, 13, BAIES)):
        for y2 in range(y - 5, y + 1):
            for x in range(x0, x1 + 1):
                t.put(x, y2, PAILLE[1] if (x + y2) % 2 else PAILLE[2])
        for x in range(x0 + 1, x1):
            t.put(x, y - 6, fruit[1] if x % 2 else fruit[0])
            t.put(x, y - 7, fruit[1] if (x % 3) else fruit[-1])
    return t.fini(), (8, 18)


def coffre():
    """Le coffre de la salle commune : deux cases de large, des planches de chêne, son couvercle
    bombé, deux bandes de fer et la serrure."""
    t = Toile(30, 22)
    boite(t, 1, 28, 20, 10, 7, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]], joints=4)
    t.rect(1, 9, 28, 9, BOIS[1])                     # le bord du couvercle
    for x in (6, 23):
        t.rect(x, 4, x + 1, 20, FER[1]); t.put(x, 4, FER[3]); t.put(x, 10, FER[3])
    t.rect(13, 11, 16, 14, FER[2]); t.put(14, 13, OUT)
    t.rect(1, 21, 28, 21, BOIS[0])
    return t.fini(), (15, 23)


def poulailler():
    """Le poulailler (vide : les poules viendront avec les habitants) : une cabane de planches sur
    pieds, son toit de bardeaux, la trappe et sa rampe."""
    t = Toile(32, 34)
    boite(t, 3, 28, 28, 12, 2, [BOIS[0], BOIS[1], BOIS[2], BOIS[3], BOIS[4]], joints=3)
    for y in range(4, 16):                          # le toit à deux pans, vu de face
        for x in range(1, 31):
            if abs(x - 15.5) <= (y - 2) * 1.5:
                t.put(x, y, B.TOIT[4] if (y + (x // 4) % 2) % 3 else B.TOIT[2])
    t.rect(1, 15, 30, 15, B.TOIT[1])
    t.rect(13, 20, 18, 26, BOIS[0])                 # la trappe
    for k in range(6):
        t.rect(18 + k, 27 + k // 2, 19 + k, 27 + k // 2, BOIS[3])     # la rampe
    for x in (5, 26):
        t.rect(x, 29, x + 1, 33, BOIS[0])
    return t.fini(), (16, 34)


# ---------- les images reprises ----------

def cadre(planche, n, w, h, colonnes):
    return planche.crop(((n % colonnes) * w, (n // colonnes) * h, (n % colonnes + 1) * w, (n // colonnes + 1) * h))


def main():
    donnees = json.load(open(DONNEES, encoding='utf-8'))['HAMEAUX']
    hauts = Image.open(os.path.join(ASSETS, 'murs_hauts.png')).convert('RGBA')
    blocs = Image.open(os.path.join(ASSETS, 'blocs.png')).convert('RGBA')
    puits = Image.open(os.path.join(ASSETS, 'puits.png')).convert('RGBA')
    verger = Image.open(os.path.join(ASSETS, 'verger.png')).convert('RGBA')
    crops = Image.open(os.path.join(ASSETS, 'crops.png')).convert('RGBA')
    terre = Image.open(os.path.join(ASSETS, 'soil_dry.png')).convert('RGBA')
    cultures = json.load(open(os.path.join(ROOT, 'data', 'crops.json'), encoding='utf-8'))
    cultures = cultures.get('CULTURES', cultures)
    ch = hauts.width // 16
    haut = lambda n: cadre(hauts, n, 16, 40, ch)  # noqa: E731
    bloc = lambda n: cadre(blocs, n, 16, 24, blocs.width // 16)  # noqa: E731
    sol = lambda n: bloc(n).crop((0, 8, 16, 24))  # noqa: E731   (le sol : les 16 px du bas)
    meuble = lambda nom: Image.open(os.path.join(ASSETS, f'meuble_{nom}.png')).convert('RGBA')  # noqa: E731

    def legume(nom):
        sp = cultures[nom]['sprite']
        c = sp['c'][-1]
        return crops.crop((c * 16, (sp['r'] + 1) * 16 - sp['h'], c * 16 + 16, (sp['r'] + 1) * 16))

    # chaque sorte : ses images, une par variante, et leur pied ; par défaut le milieu du bas
    images = {}
    for m in ('pierre', 'taille', 'bois'):
        images['mur_' + m] = [(haut(MURS_HAUTS[m] + k), None) for k in range(16)]
        images['fenetre_' + m] = [(haut(FENETRES + MATIERE[m] * 4 * 16 + k), None) for k in range(16)]
        images['porte_' + m] = [(haut(PORTES[m]), None)]
    images['porte_cote'] = [(bloc(PORTE_VERTICALE), None)]
    for s, nom in MEUBLES.items():
        im = meuble(nom)
        # (le pied : le milieu du bas, 1 px sous l'image comme à la ferme ; un lit, PIED px plus haut)
        images[s] = [(im, (im.width // 2, im.height + 1 - (PIED if s.startswith('lit') else 0)))]
    images['four'] = [(bloc(FOUR), None)]
    images['cuisiniere'] = [(bloc(CUISINIERE), None)]
    images['barriere'] = [(bloc(BARRIERES + k), None) for k in range(16)]
    images['puits'] = [(puits.crop((0, 0, 50, 50)), (25, 49))]
    for nom, f in (('coffre', coffre), ('banc', banc), ('panneau', panneau), ('billot', billot), ('barque', barque), ('sechoir', sechoir),
                   ('wagonnet', wagonnet), ('tas_minerai', tas_minerai), ('auge', auge), ('claie', claie),
                   ('paniers', paniers), ('poulailler', poulailler)):
        images[nom] = [f()]
    images['tas_bois'] = [tas_bois(0), tas_bois(1)]
    images['fruitier'] = [(verger.crop(((5 + 4 * k) * 80, 0, (6 + 4 * k) * 80, 80)), (40, 80)) for k in range(5)]
    for s, n in SOLS.items():
        images[s] = [(sol(n + k), None) for k in range(16)]
    images['terre'] = [(terre, None)]
    images['potager'] = [(legume(n), None) for n in LEGUMES]
    images['tapis'] = [(meuble(f'tapis_{k}'), None) for k in (1, 2, 3)]

    # la planche : les images rangées de gauche à droite, une rangée après l'autre
    table, places, x, y, hl = {}, [], 0, 0, 0
    for s in donnees['SORTES']:
        liste = images[s['nom']]
        if len(liste) != s['variantes']:
            raise SystemExit(f"{s['nom']} : {len(liste)} images pour {s['variantes']} variantes (data/monde.json)")
        table[s['nom']] = []
        for im, pied in liste:
            w, h = im.size
            if x + w > LARGEUR_PLANCHE:
                x, y, hl = 0, y + hl + 1, 0
            px, py = pied if pied else (w // 2, h)
            table[s['nom']].append([x, y, w, h, px, py])
            places.append((im, x, y))
            x += w + 1
            hl = max(hl, h)
    planche = Image.new('RGBA', (LARGEUR_PLANCHE, y + hl), (0, 0, 0, 0))
    for im, x0, y0 in places:
        planche.alpha_composite(im, (x0, y0))
    planche.save(SORTIE)
    with open(SORTIE_JSON, 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in table.items()) + '\n}\n')
    print(f'assets/hameaux.png : {planche.width} × {planche.height}, {len(places)} images de {len(table)} sortes')
    if '--apercu' in sys.argv:
        fond = Image.new('RGBA', planche.size, (106, 150, 72, 255))
        fond.alpha_composite(planche)
        fond.resize((planche.width * 3, planche.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'apercu_hameaux.png'))


if __name__ == '__main__':
    main()
