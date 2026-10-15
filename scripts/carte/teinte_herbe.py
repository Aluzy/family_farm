# Assombrit l'herbe de la carte : les trois teintes d'herbe de la planche d'origine (claire,
# moyenne, foncée), chacune avec ses reflets et ses brins, un peu plus sombres ; la claire,
# trop criarde, un peu désaturée aussi. Les trois restent distinctes.
#
#   python3 scripts/carte/teinte_herbe.py
#
# À lancer en dernier, après scripts/carte/arbres_3d.py, les scripts des planches d'herbe
# (herbe_chemin, herbe_deco, bordure_eau) et scripts/carte/planche_v2.py : ils repartent des
# couleurs d'origine. Le script remplace des couleurs exactes (COULEURS) dans FICHIERS ; une
# couleur déjà assombrie n'est plus dans la liste : le relancer ne change rien.
import colorsys
import os

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FICHIERS = ['farm_spring_summer.png', 'herbe_chemin.png', 'herbe_deco.png', 'bordure_eau_herbe.png']

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


def main():
    for nom in FICHIERS:
        path = os.path.join(ROOT, 'assets', nom)
        im = Image.open(path).convert('RGBA')
        px = im.load()
        n = 0
        for y in range(im.height):
            for x in range(im.width):
                p = px[x, y]
                if p[3] and p[:3] in TABLE:
                    px[x, y] = TABLE[p[:3]] + (p[3],)
                    n += 1
        if n:
            im.save(path, optimize=True)
        print(f'assets/{nom} : {n} pixels assombris')


if __name__ == '__main__':
    main()
