# Les teintes de la carte, retouchées sur les planches générées :
#   - l'herbe : ses trois teintes (claire, moyenne, foncée), chacune avec ses reflets et ses
#     brins, un peu plus sombres ; la claire, trop criarde, un peu désaturée aussi ; les trois
#     restent distinctes ;
#   - le chemin : du jaune à la terre battue (marron orangé), ses deux tons (clair et foncé),
#     ses tons du sol et sa bordure.
#
#   python3 scripts/carte/teintes_carte.py
#
# À lancer en dernier, après scripts/carte/arbres_3d.py, les scripts des planches d'herbe
# (herbe_chemin, herbe_deco, bordure_eau) et scripts/carte/planche_v2.py : ils repartent des
# couleurs d'origine. Le script remplace des couleurs exactes ; une couleur déjà retouchée
# n'est plus dans les listes : le relancer ne change rien. Le chemin n'est retouché que dans
# sa planche (herbe_chemin.png, et son bloc dans la planche de la carte) : ses jaunes servent
# ailleurs (fleurs, sable).
import colorsys
import os

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FICHIERS = ['farm_spring_summer.png', 'herbe_chemin.png', 'herbe_deco.png', 'bordure_eau_herbe.png']
# Où est le chemin : fichier -> (x, y, largeur, hauteur) en px ; le bloc herbe_chemin de la
# planche de la carte (scripts/carte/planche_v2.py, BLOCS) : colonnes 0 à 15, rangées 45 à 60.
ZONES_CHEMIN = {'herbe_chemin.png': None, 'farm_spring_summer.png': (0, 45 * 16, 16 * 16, 16 * 16)}

# Les couleurs de chaque teinte d'herbe (fond, reflets, brins sombres), relevées sur les
# tuiles d'herbe de la planche d'origine.
COULEURS = {
    'claire': ['#76c504', '#7fd404', '#87fb4f', '#6db604', '#0a6300', '#7dfb40', '#91fb5e', '#88e304',
               '#64a704', '#0c7200', '#6db605', '#9ffb19', '#69fb22', '#99fb0a', '#9bfb6d', '#66aa04'],
    'moyenne': ['#56a503', '#5cb203', '#65d342', '#4f9903', '#015300', '#5cd336', '#6fd34f', '#026000',
                '#63bf03', '#498c03', '#4f9904', '#76d315', '#49d31d', '#70d308', '#78d35c', '#4a8f03'],
    'foncee': ['#3b8a00', '#3f9400', '#48b035', '#367f00', '#004505', '#3fb02a', '#51b040', '#005005',
               '#449f00', '#327501', '#367f01', '#2eb015', '#53b00e', '#5ab04a', '#4db004', '#337700'],
}
# (luminosité, saturation) en facteurs, par teinte
REGLAGE = {'claire': (0.88, 0.92), 'moyenne': (0.90, 0.96), 'foncee': (0.92, 1.0)}


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def assombrie(h, lum, sat):
    r, g, b = (c / 255 for c in rgb(h))
    hh, s, v = colorsys.rgb_to_hsv(r, g, b)
    return tuple(round(c * 255) for c in colorsys.hsv_to_rgb(hh, s * sat, v * lum))


# Le chemin (scripts/carte/herbe_chemin.py) : les deux tons (le clair, le foncé), chacun du
# fond aux tons du sol puis à la bordure. Teinte, saturation et luminosité visées
# (« terre battue ») ; le ton foncé garde son décalage vers l'orange.
CHEMIN = {
    'clair': ['#fbd60a', '#f2cd04', '#e3c004', '#d4b004', '#b69904', '#987f04', '#7a6604', '#5c4e03'],
    'fonce': ['#c99808', '#c29103', '#b68803', '#aa7c03', '#926c03', '#7a5a03', '#624803', '#4a3702'],
}
CHEMIN_TEINTE = 25            # degrés
CHEMIN_DECALAGE = {'clair': 0, 'fonce': -5}
CHEMIN_REGLAGE = (0.70, 0.58)  # (luminosité, saturation) en facteurs


def terre_battue(h, ton):
    r, g, b = (c / 255 for c in rgb(h))
    _, s, v = colorsys.rgb_to_hsv(r, g, b)
    lum, sat = CHEMIN_REGLAGE
    hh = ((CHEMIN_TEINTE + CHEMIN_DECALAGE[ton]) % 360) / 360
    return tuple(round(c * 255) for c in colorsys.hsv_to_rgb(hh, min(1, s * sat), v * lum))


TABLE_CHEMIN = {rgb(c): terre_battue(c, ton) for ton, cols in CHEMIN.items() for c in cols}
assert not set(TABLE_CHEMIN.values()) & set(TABLE_CHEMIN)

# Couleur d'origine -> couleur assombrie. Une couleur assombrie qui retomberait sur une couleur
# d'origine (ou sur une autre déjà prise) est décalée d'un cran de vert : le script reste sans
# effet quand on le relance.
TABLE = {}
for _t, _cols in COULEURS.items():
    for _c in _cols:
        _n = assombrie(_c, *REGLAGE[_t])
        _origine = {rgb(c) for cols in COULEURS.values() for c in cols}
        while _n in _origine or _n in TABLE.values():
            _n = (_n[0], _n[1] - 1, _n[2])
        TABLE[rgb(_c)] = _n


def retouche(px, table, x0, y0, w, h):
    n = 0
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            p = px[x, y]
            if p[3] and p[:3] in table:
                px[x, y] = table[p[:3]] + (p[3],)
                n += 1
    return n


def main():
    for nom in FICHIERS:
        path = os.path.join(ROOT, 'assets', nom)
        im = Image.open(path).convert('RGBA')
        px = im.load()
        n = retouche(px, TABLE, 0, 0, im.width, im.height)
        c = 0
        if nom in ZONES_CHEMIN:
            x0, y0, w, h = ZONES_CHEMIN[nom] or (0, 0, im.width, im.height)
            c = retouche(px, TABLE_CHEMIN, x0, y0, min(w, im.width - x0), min(h, im.height - y0))
        if n or c:
            im.save(path, optimize=True)
        print(f'assets/{nom} : {n} pixels d\'herbe, {c} pixels de chemin retouchés')


if __name__ == '__main__':
    main()
