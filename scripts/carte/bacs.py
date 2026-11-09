#!/usr/bin/env python3
"""Les bacs à fleurs (le lot 2 des évolutions du crafting ; js/engine/bacs.js) : assets/bacs.png, et leurs icônes
(celles des trois bacs et des graines de fleurs, dans assets/icones/ ; icones.json reçoit leur emoji). Puis :
python3 scripts/icones/build.py (la planche des icônes).

  - trois formes, en bois naturel (les outils des blocs, scripts/carte/blocs.py) : le bac rond (un demi-tonneau,
    ses douelles, deux cerclages), le bac carré (des planches, un bandeau), le bac long (une jardinière sur deux
    cases) ;
  - leur peinture (le style B : le bois reste naturel, le bandeau et le rebord, ou les cerclages, prennent la
    couleur) : dessinés ici dans deux rampes à eux (BANDEAU, CERCLAGE ; data/meubles.json PALETTES bac_bandeau,
    bac_cerclage), que la carte recolore (js/carte/ferme/chantier.js, imageTeinte) des couleurs des colorants ;
  - ce qui y pousse : vide, semé (des graines dans la terre), puis chaque fleur en pousses (1), en boutons (2), en
    fleurs.

La planche : une image de 32 × 24 par état, dans l'ordre de NOMS (le bac rond et le carré à gauche de la leur,
sur 16 px) ; la carte la découpe en images « meuble_bac_<forme>_<état> » (js/farm-stage.js, BACS de
js/carte/ferme/config.js : la même liste).

Usage (depuis la racine du dépôt) : python3 scripts/carte/bacs.py
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import blocs as B  # noqa: E402
from pixel import ASSETS, contour  # noqa: E402

P = B.POUDRES
# les rampes de la peinture (sombre → clair), de presque le ton du bois et du fer : la carte les remplace
BANDEAU = [(112, 96, 66), (150, 130, 93), (188, 163, 123)]
CERCLAGE = [(62, 68, 81), (98, 106, 119), (146, 154, 165)]
FORMES = ['rond', 'carre', 'long']
FLEURS = ['coquelicot', 'pavot', 'tournesol', 'myosotis', 'lavande', 'lupin']
COULEUR = {'coquelicot': 'rouge', 'pavot': 'orange', 'tournesol': 'jaune', 'myosotis': 'bleu', 'lavande': 'violet', 'lupin': 'violet'}
ETATS = ['vide', 'semis'] + [e for f in FLEURS for e in (f + '_1', f + '_2', f)]
NOMS = [f'bac_{forme}_{e}' for forme in FORMES for e in ETATS]
CW, CH = 32, B.H


class T2(B.Toile):
    """Une toile de w × 24 (le bac long : deux cases)."""
    def __init__(self, w):
        self.im = Image.new('RGBA', (w, B.H), (0, 0, 0, 0))
        self.px = self.im.load()
        self.w = w

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < B.H and c is not None:
            self.px[int(x), int(y)] = tuple(c[:3]) + (255,)


# ---------- les fleurs en bac : leur pied (cx, cy), leur étape (0 semé, 1 pousses, 2 boutons, 3 fleurs) ----------

def fleur(t, nom, cx, cy, etape):
    V = B.VERT
    if etape == 0:
        t.put(cx, cy, (70, 50, 30))
        t.put(cx + 2, cy - 1, (70, 50, 30))
        return
    haut = {1: 2, 2: 4, 3: 5}[etape] + (3 if nom == 'tournesol' and etape == 3 else 0) + (2 if nom in ('lupin', 'lavande') and etape == 3 else 0)
    for y in range(cy - haut, cy + 1):
        t.put(cx, y, V[1] if y > cy - 2 else V[2])
    t.put(cx - 1, cy - 1, V[2])
    t.put(cx + 1, cy - 2, V[3])
    if etape == 1:
        return
    top = cy - haut
    if etape == 2:
        t.put(cx, top - 1, V[2])
        t.put(cx, top - 2, P[COULEUR[nom]][1])               # un bouton qui pointe
        return
    if nom == 'coquelicot':
        c = P['rouge']
        for dx, dy, cc in ((-1, 0, c[1]), (0, 0, c[2]), (1, 0, c[1]), (0, -1, c[3]), (0, 1, (30, 16, 16))):
            t.put(cx + dx, top + dy, cc)
    elif nom == 'pavot':
        c = P['orange']
        for dx, dy, cc in ((-1, 0, c[1]), (1, 0, c[1]), (0, 0, c[2]), (-1, -1, c[2]), (1, -1, c[3]), (0, 1, c[0])):
            t.put(cx + dx, top + dy, cc)
    elif nom == 'tournesol':
        c = P['jaune']
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                if abs(dx) + abs(dy) <= 3:
                    t.put(cx + dx, top + dy, c[2] if (dx + dy) % 2 else c[1])
        for dx, dy in ((0, 0), (-1, 0), (0, -1), (-1, -1)):
            t.put(cx + dx, top + dy, (96, 56, 24))
    elif nom == 'myosotis':
        c = P['bleu']
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-2, 1), (2, 1)):
            t.put(cx + dx, top + dy, c[3] if dy < 0 else c[2])
        t.put(cx, top, (250, 226, 80))
    else:                                                    # la lavande, le lupin : en épis
        c = P['violet']
        for d in range(4 if nom == 'lavande' else 5):
            t.put(cx, top + d, c[3] if d == 0 else c[2] if d % 2 else c[1])
            if nom == 'lupin' and d >= 2:
                t.put(cx + 1, top + d, c[1])


def plantes(t, etat, places):
    """Ce qui pousse : rien (vide), des graines (semis), une fleur à son étape."""
    if etat == 'vide':
        return
    if etat == 'semis':
        nom, etape = 'coquelicot', 0
    else:
        nom, _, k = etat.partition('_')
        etape = int(k) if k else 3
    for x, y in sorted(places, key=lambda p: p[1]):
        fleur(t, nom, x, y, etape)


def terre(t, x0, x1, yd, yf):
    for y in range(yd + 1, yf - 1):
        for x in range(x0, x1):
            t.put(x, y, B.TERRE[2] if (x + 2 * y) % 5 else B.TERRE[3])
    for x in range(x0, x1):
        t.put(x, yd + 1, B.TERRE[0])


def bandeau(t, x0, x1, yd, yf):
    """Le bandeau peint, au milieu de la face, et le rebord du dessus (BANDEAU : la carte le repeint)."""
    for x in range(x0, x1):
        t.put(x, yf + 2, BANDEAU[1] if x > x0 else BANDEAU[2])
        t.put(x, yf + 3, BANDEAU[0])
        t.put(x, yd, BANDEAU[2])


# ---------- les trois bacs ----------

def bac_carre(etat):
    t = B.Toile()
    face = B.planches(B.BOIS, 'h', pas=3, y0=2)
    yd, yf = B.boite(t, 1, 14, B.BAS - 1, 7, 9, B.BOIS, face)
    bandeau(t, 1, 15, yd, yf)
    terre(t, 2, 14, yd, yf)
    plantes(t, etat, [(4, yf - 2), (8, yf - 3), (11, yf - 2), (6, yf - 1)])
    for x in range(2, 14):
        t.put(x, B.BAS - 1, B.BOIS[0])
    return t.fini()


def bac_rond(etat):
    """Un demi-tonneau : des douelles verticales, deux cerclages (CERCLAGE : la carte les repeint), la terre en
    ovale vue de haut."""
    t = B.Toile()
    bois = B.BOIS
    for y in range(13, B.BAS):
        for x in range(2, 14):
            dx = (x + 0.5 - 8) / 6
            k = 3 if dx < -0.5 else 2 if dx < 0.4 else 1
            if x % 3 == 0:
                k = max(0, k - 1)
            t.put(x, y, bois[k])
    for y in (15, 20):
        for x in range(2, 14):
            t.put(x, y, CERCLAGE[2] if x < 4 else CERCLAGE[1] if x < 7 else CERCLAGE[0])
    B.ovale(t, 8, 13, 6.2, 3.4, lambda dx, dy, d: bois[4] if d > 0.62 else B.TERRE[0] if dy < -0.3 else B.TERRE[2])
    plantes(t, etat, [(6, 13), (9, 12), (8, 14), (11, 14), (5, 14)])
    return t.fini()


def bac_long(etat):
    """Le bac long (deux cases) : une jardinière de planches de 30 px."""
    t = T2(32)
    r = B.BOIS
    yd, yf = 11, 17
    for y in range(yd, yf):
        for x in range(1, 31):
            t.put(x, y, r[4] if x == 1 or y == yd else r[3])
    for y in range(yf, B.BAS):
        for x in range(1, 31):
            u = y - yf
            t.put(x, y, r[0] if u % 3 == 2 else r[3] if x == 1 else r[1] if x == 30 else r[2])
    bandeau(t, 1, 31, yd, yf)
    terre(t, 2, 30, yd, yf)
    plantes(t, etat, [(4, yf - 2), (8, yf - 3), (12, yf - 2), (16, yf - 3), (20, yf - 2), (24, yf - 3), (27, yf - 2)])
    return contour(t.im, B.OUT)


DESSIN = {'rond': bac_rond, 'carre': bac_carre, 'long': bac_long}


def planche():
    im = Image.new('RGBA', (CW * len(NOMS), CH), (0, 0, 0, 0))
    k = 0
    for forme in FORMES:
        for e in ETATS:
            im.alpha_composite(DESSIN[forme](e), (k * CW, 0))
            k += 1
    # (la peinture ne touche que le bandeau et les cerclages : ses rampes ne servent nulle part ailleurs)
    ailleurs = set(map(tuple, B.BOIS + B.TERRE + B.VERT + B.FER + [B.OUT] + [c for r in P.values() for c in r]))
    assert not ailleurs & (set(BANDEAU) | set(CERCLAGE))
    return im


# ---------- les icônes ----------

ICONES = os.path.join(ASSETS, 'icones')
EMOJIS_BACS = {'🪴‍⭕': ('bac_rond', 'rond', 'lavande'), '🪴‍🟫': ('bac_carre', 'carre', 'coquelicot'), '🪴‍➖': ('bac_long', 'long', 'myosotis')}
EMOJIS_GRAINES = {'🌱‍🌺': 'coquelicot', '🌱‍🏵': 'pavot', '🌱‍💠': 'myosotis', '🌱‍🪻': 'lavande', '🌱‍💮': 'lupin'}


def icone_bac(forme, fleur_):
    im = DESSIN[forme](fleur_)
    if forme == 'long':
        im = im.crop((0, 4, 32, 24)).resize((16, 10), Image.NEAREST)
        out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        out.alpha_composite(im, (0, 5))
        return out
    return im.crop((0, 8, 16, 24))


def icone_graine(nom):
    """Le sachet des graines de tournesol (seedling+sunflower.png), sa fleur dans la couleur de `nom`."""
    im = Image.open(os.path.join(ICONES, 'seedling+sunflower.png')).convert('RGBA')
    c = P[COULEUR[nom]]
    table = {(251, 227, 138): c[3], (242, 192, 64): c[2], (199, 134, 42): c[1]}
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            q = px[x, y]
            if q[3] and q[:3] in table:
                px[x, y] = tuple(table[q[:3]]) + (255,)
    return im


def main():
    planche().save(os.path.join(ASSETS, 'bacs.png'))
    chemin = os.path.join(ICONES, 'icones.json')
    with open(chemin, encoding='utf8') as f:
        table = json.load(f)
    for emoji, (fichier, forme, fl) in EMOJIS_BACS.items():
        icone_bac(forme, fl).save(os.path.join(ICONES, fichier + '.png'))
        table[emoji] = fichier + '.png'
    for emoji, nom in EMOJIS_GRAINES.items():
        icone_graine(nom).save(os.path.join(ICONES, f'graine_{nom}.png'))
        table[emoji] = f'graine_{nom}.png'
    with open(chemin, 'w', encoding='utf8') as f:
        json.dump(table, f, ensure_ascii=False, indent=1)
    print(f'assets/bacs.png ({len(NOMS)} images) ; {len(EMOJIS_BACS) + len(EMOJIS_GRAINES)} icônes ; puis : python3 scripts/icones/build.py')


if __name__ == '__main__':
    main()
