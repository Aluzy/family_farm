# Les bâtiments du décor version 2, dans le style de la nouvelle ferme.
#
#   python3 scripts/batiments/style_v2.py            écrit assets/house_sp.png et serre_sp.png
#   python3 scripts/batiments/style_v2.py --apercu   écrit aussi apercu_style_v2.png
#
# Puis python3 scripts/batiments/ruines.py : les versions à réparer partent de ces images.
#
# La ferme : scripts/batiments/originaux/ferme_modele.png (94 × 97), telle quelle sauf le toit
# (son orange adouci en brun rouge, TOIT) — murs de planches dorées, volets et vitres turquoise, terrasse de planches grises.
# Puis la maison prend les couleurs de la serre (PALETTE_SERRE, « bois naturel ») : chaque
# matière (un ensemble de pixels, une couleur d'origine éventuellement limitée à une zone) range
# ses couleurs par luminosité et prend, dans cet ordre, les tons de la rampe (recolorer).
# (Ces bâtiments ne servent qu'à l'ancienne carte dessinée ; sur la ferme générée, tout se bâtit
# en blocs.)
# La serre : scripts/batiments/originaux/serre_modele.png (96 × 81 : toit de lattes, vitres et
# double porte vitrée dans un cadre de bois), telle quelle.
import colorsys
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT  # noqa: E402
ORIG = os.path.join(ROOT, 'scripts', 'batiments', 'originaux')

# Les rampes de la ferme (du plus sombre au plus clair), relevées sur ferme_modele.png.
TOIT_MODELE = [(120, 60, 10), (142, 75, 12), (157, 85, 16), (225, 120, 22), (229, 136, 49), (238, 160, 82)]
# Le toit adouci, en brun rouge sombre : chaque ton du modèle (orange vif), sa teinte décalée
# de TOIT_REGLAGE[0] degrés (négatif : vers le rouge), sa saturation et sa luminosité
# multipliées par TOIT_REGLAGE[1] et TOIT_REGLAGE[2]. La ferme (le modèle) prend aussi ces tons.
TOIT_REGLAGE = (-12, 0.70, 0.72)


def ton_toit(c):
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c))
    h = (h + TOIT_REGLAGE[0] / 360) % 1
    return tuple(round(x * 255) for x in colorsys.hsv_to_rgb(h, s * TOIT_REGLAGE[1], v * TOIT_REGLAGE[2]))


TOIT = [ton_toit(c) for c in TOIT_MODELE]
BOIS = [(71, 48, 27), (110, 72, 26), (137, 87, 30), (156, 111, 25), (182, 156, 79)]
CADRE = [(62, 38, 32), (82, 48, 40), (96, 63, 49), (108, 78, 58), (119, 92, 69)]
TURQUOISE = [(14, 68, 62), (45, 146, 142), (36, 172, 166), (101, 202, 198), (188, 234, 232)]
PIERRE = [(114, 110, 106), (131, 107, 79), (158, 141, 109), (174, 156, 137), (183, 163, 125)]
TOILE = [(150, 128, 96), (182, 160, 120), (206, 190, 156), (228, 216, 188)]       # les ailes du moulin


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def recolorer(img, matieres):
    """matieres : liste de (test(x, y, couleur) -> bool, rampe). Un pixel prend la première
    matière dont le test passe ; ceux d'aucune matière ne changent pas."""
    px = img.load()
    w, h = img.size
    quelle = {}
    couleurs = [set() for _ in matieres]
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if not c[3]:
                continue
            for k, (test, _) in enumerate(matieres):
                if test(x, y, c[:3]):
                    quelle[(x, y)] = k
                    couleurs[k].add(c[:3])
                    break
    tables = []
    for k, (_, rampe) in enumerate(matieres):
        cs = sorted(couleurs[k], key=lum)
        n = len(cs)
        # n couleurs sur la rampe : réparties de bout en bout (une seule : le ton du milieu)
        if rampe is None:
            tables.append({c: c for c in cs})
            continue
        tables.append({c: rampe[round(i * (len(rampe) - 1) / (n - 1)) if n > 1 else len(rampe) // 2] for i, c in enumerate(cs)})
    out = img.copy()
    po = out.load()
    for (x, y), k in quelle.items():
        c = px[x, y]
        po[x, y] = tables[k][c[:3]] + (c[3],)
    return out


def creme(c):
    return min(c) > 150 and max(c) - min(c) < 60


def ferme():
    """house_sp.png : la ferme du modèle telle quelle, son toit dans les tons de TOIT."""
    img = Image.open(os.path.join(ORIG, 'ferme_modele.png')).convert('RGBA')
    table = dict(zip(TOIT_MODELE, TOIT))
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            c = px[x, y]
            if c[3] and c[:3] in table:
                px[x, y] = table[c[:3]] + (c[3],)
    return img


# ---------- les couleurs de la serre (« bois naturel ») ----------
# La maison, l'étable et le moulin prennent les couleurs de la serre : bois brun olive pour
# les toits, les murs et les cadres, crème et beige pour les accents (vitres, volets, baies)
# et la toile des ailes, pierre beige-gris. Chaque ton des rampes ci-dessus (TOIT, BOIS…) a son
# remplaçant de même rang dans PALETTE_SERRE ; une couleur proche d'un ton (à 40 près) prend
# son remplaçant plus leur écart (le relief du dessin est gardé). Les verts (lierre, buissons)
# ne changent pas.


def rampe(ancres, n):
    """n tons de l'ancre sombre à l'ancre claire (interpolation par morceaux)."""
    out = []
    for i in range(n):
        t = i / (n - 1) * (len(ancres) - 1)
        k = min(len(ancres) - 2, int(t))
        f = t - k
        out.append(tuple(round(a * (1 - f) + b * f) for a, b in zip(ancres[k], ancres[k + 1])))
    return out


SERRE = {'sombre': (56, 47, 29), 'bois': (77, 64, 39), 'bois2': (90, 76, 50), 'bois3': (112, 96, 65),
         'beige': (186, 172, 149), 'creme': (203, 189, 162), 'blanc': (225, 217, 202), 'tan': (188, 163, 122)}
PALETTE_SERRE = {
    'toit': rampe([(38, 30, 18), (70, 58, 36), (120, 104, 72)], 6),
    'bois': rampe([SERRE['sombre'], SERRE['bois2'], SERRE['bois3'], (150, 130, 92), SERRE['tan']], 5),
    'cadre': rampe([(30, 24, 14), SERRE['sombre'], SERRE['bois']], 5),
    'accent': rampe([(120, 108, 84), SERRE['beige'], SERRE['blanc']], 5),
    'pierre': rampe([(100, 92, 78), (150, 140, 120), (196, 186, 166)], 5),
    'toile': [(170, 156, 128), SERRE['beige'], SERRE['creme'], SERRE['blanc']],
}
TOIT_SERRE = PALETTE_SERRE['toit']
RAMPES = {'toit': TOIT, 'bois': BOIS, 'cadre': CADRE, 'accent': TURQUOISE, 'pierre': PIERRE, 'toile': TOILE}
# les baies de l'étable (sa propre rampe turquoise sombre) : des accents
RAMPES_EN_PLUS = [((24, 92, 88), 'accent', 1), ((32, 112, 108), 'accent', 1)]


def harmoniser(img, remplace=None, garde=None):
    """img aux couleurs de la serre. remplace : matière -> autre matière (le moulin : ses
    poutres de bois prennent les cadres) ; garde(x, y, couleur) : pixels à ne pas toucher."""
    tons = [(c, m, i) for m, r in RAMPES.items() for i, c in enumerate(r)] + RAMPES_EN_PLUS
    cache = {}

    def nouvelle(c):
        if c not in cache:
            e, m, i = min(tons, key=lambda t: sum((a - b) ** 2 for a, b in zip(c, t[0])))
            if sum((a - b) ** 2 for a, b in zip(c, e)) > 40 ** 2:
                cache[c] = c
            else:
                m = (remplace or {}).get(m, m)
                n = PALETTE_SERRE[m][min(i, len(PALETTE_SERRE[m]) - 1)]
                cache[c] = tuple(max(0, min(255, nv + cv - ev)) for nv, cv, ev in zip(n, c, e))
        return cache[c]
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if not p[3] or (p[1] > p[0] + 15 and p[1] > p[2] + 15) or (garde and garde(x, y, p[:3])):
                continue
            px[x, y] = nouvelle(p[:3]) + (p[3],)
    return out


def main():
    faits = {
        'house_sp.png': harmoniser(ferme()),
        'serre_sp.png': Image.open(os.path.join(ORIG, 'serre_modele.png')).convert('RGBA'),
    }
    for nom, img in faits.items():
        img.save(os.path.join(ASSETS, nom))
        print(f'assets/{nom} : {img.width} × {img.height}')
    if '--apercu' in sys.argv:
        k = 4
        larg = sum(i.width for i in faits.values()) + 10 * len(faits)
        out = Image.new('RGBA', (larg, 128), (105, 150, 84, 255))
        x = 0
        for img in faits.values():
            out.alpha_composite(img, (x, 128 - img.height))
            x += img.width + 10
        out.resize((out.width * k, out.height * k), Image.NEAREST).save(os.path.join(ROOT, 'apercu_style_v2.png'))
        print('apercu_style_v2.png')


if __name__ == '__main__':
    main()
