# L'équipement de la famille sur son portrait (fiche 11) : assets/personnages/equipement.png, des
# calques posés sur la première case (idle_bas_0 : debout, de face) des planches de personnages
# (assets/personnages/perso_XX.png, enfant_XX.png ; 16 × 32). La fiche d'un membre (js/ui/
# fiche-membre.js) dessine le membre en pied, puis, par-dessus, un calque par pièce portée.
#
# Une rangée de 32 pixels par pièce, dans l'ordre de data/equipement.json (EQUIPEMENT.PIECES : la
# seule source de cet ordre) ; deux colonnes de 16 : le gabarit adulte, puis le gabarit enfant (les
# enfants sont plus petits : la tête, les mains et les pieds plus bas). Les personnages du catalogue
# ont tous la même silhouette (scripts/personnage/catalogue.py) : un calque leur va à tous. Lumière
# en haut à gauche, contour sombre comme celui des personnages.
#
# Sur la carte, les personnages gardent leur planche : il faudrait un calque par case de geste
# (marche, houe, arrosoir… dans les trois vues), ce que ce calque de face ne fait pas.
#
#   python3 scripts/personnage/equipement.py            écrit assets/personnages/equipement.png
#   python3 scripts/personnage/equipement.py --apercu   écrit aussi apercu_equipement.png (chaque
#                                                        pièce sur quelques personnages, agrandie)
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, apercu, rgb  # noqa: E402

W, H = 16, 32
CONTOUR = (34, 22, 16, 255)

# Les deux gabarits (rangées et colonnes de la case 16 × 32) : le haut de la tête, la ligne des yeux,
# les épaules, les mains (leur rangée du haut, la colonne de la main gauche et de la droite), la
# taille, le haut des pieds, le bas du dessin.
GABARITS = {
    'adulte': {'tete': 7, 'yeux': 12, 'epaules': 18, 'mains': 22, 'mainG': 3, 'mainD': 12, 'taille': 24, 'pieds': 29, 'bas': 30},
    'enfant': {'tete': 11, 'yeux': 16, 'epaules': 22, 'mains': 24, 'mainG': 2, 'mainD': 13, 'taille': 26, 'pieds': 28, 'bas': 29},
}

# matière : (ombre, moyen, reflet)
MATS = {
    'jaune': ('#c7862a', '#f2c040', '#fbe38a'),      # le casque
    'paille': ('#b88a3a', '#e3c06a', '#f6e2a0'),
    'ruban': ('#8a2a30', '#c8434a', '#f07a6a'),
    'cuir': ('#5a3418', '#8a5a34', '#b07a48'),
    'cuir_clair': ('#9a6a34', '#c89a58', '#e8c888'),
    'vert': ('#2f5a28', '#4f8a3d', '#7cb860'),
    'jean': ('#22305a', '#34508a', '#5a7cb8'),
    'laine': ('#5a1a24', '#8a2a3a', '#b8485a'),
    'fourrure': ('#c8bca8', '#ece4d4', '#ffffff'),
}
FIXE = {'lampe': (255, 250, 214, 255), 'halo': (255, 222, 120, 255), 'bouton': (242, 192, 64, 255)}


def calque(formes):
    """formes : [(matière, {(x, y)})], dans l'ordre (la suivante passe par-dessus) → une image 16 × 32
    ombrée (reflet en haut à gauche, ombre en bas à droite), avec son contour."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    tout = set()
    for mat, pts in formes:
        pts = {(x, y) for x, y in pts if 0 <= x < W and 0 <= y < H}
        tout |= pts
        if mat in FIXE:
            for p in pts:
                im.putpixel(p, FIXE[mat])
            continue
        o, m, l = (rgb(c) for c in MATS[mat])
        for x, y in pts:
            if (x, y - 1) not in pts or (x - 1, y) not in pts:
                c = l
            elif (x, y + 1) not in pts or (x + 1, y) not in pts:
                c = o
            else:
                c = m
            im.putpixel((x, y), c)
    for y in range(H):
        for x in range(W):
            if (x, y) in tout:
                continue
            if any(v in tout for v in ((x, y - 1), (x - 1, y), (x, y + 1), (x + 1, y))):
                im.putpixel((x, y), CONTOUR)
    return im


def rect(x0, y0, x1, y1):
    """Les cases de x0 à x1 et de y0 à y1, bornes comprises."""
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


# ---------------------------------------------------------------- les pièces

def casque_lampe(g):
    t = g['tete']
    dome = rect(5, t - 2, 10, t - 2) | rect(4, t - 1, 11, t + 1) | rect(3, t + 2, 12, t + 2)
    lampe = rect(7, t - 1, 8, t)
    return calque([('jaune', dome), ('lampe', lampe), ('halo', {(7, t + 1), (8, t + 1)})])


def chapeau_paille(g):
    t = g['tete']
    calotte = rect(5, t - 3, 10, t)
    bord = rect(1, t + 1, 14, t + 2)
    ruban = rect(5, t, 10, t)
    return calque([('paille', calotte | bord), ('ruban', ruban)])


def bottes(g):
    p, b = g['pieds'], g['bas']
    haut = p - 3
    # (deux bottes, un vide entre elles : le contour les sépare)
    gauche, droite = rect(4, haut, 6, b), rect(9, haut, 11, b)
    revers = rect(4, haut, 6, haut) | rect(9, haut, 11, haut)
    return calque([('cuir', gauche | droite), ('cuir_clair', revers)])


def gants_travail(g):
    m, x0, x1 = g['mains'], g['mainG'], g['mainD']
    gants = rect(x0, m, x0 + 1, m + 1) | rect(x1 - 1, m, x1, m + 1)
    poignets = rect(x0, m - 1, x0 + 1, m - 1) | rect(x1 - 1, m - 1, x1, m - 1)
    return calque([('cuir_clair', gants), ('cuir', poignets)])


def tablier(g):
    e, tl, p = g['epaules'], g['taille'], g['pieds']
    bavette = rect(6, e + 1, 9, tl - 1)
    jupe = rect(5, tl - 1, 10, p - 1)
    bretelles = {(5, e), (10, e), (5, e + 1), (10, e + 1)}
    poche = rect(6, tl + 1, 9, tl + 2)
    return calque([('vert', bavette | jupe | bretelles), ('cuir_clair', poche)])


def salopette(g):
    e, tl, p = g['epaules'], g['taille'], g['pieds']
    bavette = rect(5, e + 1, 10, tl)
    jambes = rect(4, tl, 11, p - 1) - rect(8, tl + 3, 8, p - 1)
    bretelles = {(4, e), (11, e), (4, e + 1), (11, e + 1)}
    boutons = {(5, e + 1), (10, e + 1)}
    poche = rect(6, e + 2, 9, e + 3)
    return calque([('jean', bavette | jambes | bretelles), ('cuir_clair', poche), ('bouton', boutons)])


def manteau_chaud(g):
    e, m, tl, x0, x1 = g['epaules'], g['mains'], g['taille'], g['mainG'], g['mainD']
    corps = rect(4, e, 11, tl + 2)
    manches = rect(x0, e + 1, x0 + 1, m - 1) | rect(x1 - 1, e + 1, x1, m - 1)
    col = rect(5, e - 1, 10, e)
    boutons = {(8, e + 2), (8, e + 4), (8, tl)}
    return calque([('laine', corps | manches), ('fourrure', col), ('bouton', boutons)])


PIECES = {
    'casque_lampe': casque_lampe, 'chapeau_paille': chapeau_paille, 'bottes': bottes, 'gants_travail': gants_travail,
    'tablier': tablier, 'salopette': salopette, 'manteau_chaud': manteau_chaud,
}


def ordre():
    with open(os.path.join(ROOT, 'data', 'equipement.json'), encoding='utf8') as f:
        return list(json.load(f)['EQUIPEMENT']['PIECES'])


def planche():
    ids = ordre()
    manque = [i for i in ids if i not in PIECES]
    if manque:
        sys.exit(f'pas de dessin pour : {", ".join(manque)}')
    im = Image.new('RGBA', (2 * W, len(ids) * H), (0, 0, 0, 0))
    for r, i in enumerate(ids):
        for c, g in enumerate(('adulte', 'enfant')):
            im.alpha_composite(PIECES[i](GABARITS[g]), (c * W, r * H))
    return im


def main():
    im = planche()
    out = os.path.join(ASSETS, 'personnages', 'equipement.png')
    im.save(out)
    print(f'{out} : {len(ordre())} pièces')
    if '--apercu' in sys.argv:
        persos = [('perso', 1), ('perso', 7), ('perso', 3), ('enfant', 1)]
        ap = Image.new('RGBA', ((len(persos) * 18) * (len(ordre()) + 1), H + 2), (90, 140, 90, 255))
        for k, i in enumerate([None] + ordre()):
            for j, (sorte, n) in enumerate(persos):
                base = Image.open(os.path.join(ASSETS, 'personnages', f'{sorte}_{n:02d}.png')).convert('RGBA').crop((0, 0, W, H))
                if i:
                    r = ordre().index(i)
                    c = 1 if sorte == 'enfant' else 0
                    base.alpha_composite(im.crop((c * W, r * H, c * W + W, r * H + H)))
                ap.alpha_composite(base, ((k * len(persos) + j) * 18 + 1, 1))
        apercu(ap, 'apercu_equipement.png', zoom=5, fond=(112, 164, 84))


if __name__ == '__main__':
    main()
