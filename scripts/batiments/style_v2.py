# Les bâtiments du décor version 2, dans le style de la nouvelle ferme.
#
#   python3 scripts/batiments/style_v2.py            écrit assets/house_sp.png, barn_sp.png,
#                                                    windmill_sp.png, poulailler.png
#   python3 scripts/batiments/style_v2.py --apercu   écrit aussi apercu_style_v2.png
#
# Puis python3 scripts/batiments/ruines.py : les versions à réparer partent de ces images.
#
# La ferme : scripts/batiments/originaux/ferme_modele.png (94 × 97), telle quelle sauf le toit
# (son orange adouci en brun rouge, TOIT) — murs de planches dorées, volets et vitres turquoise, terrasse de planches grises.
# L'étable, le moulin et le poulailler en dérivent : on part des images d'origine (pack
# « Farm – 4 Seasons », gardées dans originaux/*_v1.png ; même taille, mêmes cases, donc mêmes
# animations dans le jeu), et chaque matière prend la palette de la ferme. Une matière est un
# ensemble de pixels (une couleur d'origine, éventuellement limitée à une zone) ; ses couleurs
# se rangent par luminosité et prennent, dans cet ordre, les tons de la rampe de la ferme.
# Le relief du dessin (ses ombres, ses lumières) est donc gardé.
import colorsys
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ORIG = os.path.join(ROOT, 'scripts', 'batiments', 'originaux')
ASSETS = os.path.join(ROOT, 'assets')

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


def prune(c):
    r, g, b = c
    return 40 <= r <= 130 and g < 80 and b >= g and r > g


def creme(c):
    return min(c) > 150 and max(c) - min(c) < 60


def brun(c):
    r, g, b = c
    return r > g >= b - 6 and r < 160


def etable():
    """barn_sp.png (104 × 93) : toit de bardeaux (orange), pignon crème à colombages (planches
    dorées claires, colombages bruns), murs de planches (dorés), baies sombres (turquoise
    sombre, comme les volets de la ferme), portes (bois)."""
    img = Image.open(os.path.join(ORIG, 'barn_sp_v1.png')).convert('RGBA')
    # le pignon : le triangle sous les deux pentes, de la pointe (52, 33) à la poutre (y 57)
    pignon = lambda x, y: 33 + 0.45 * abs(x - 52) <= y < 57
    toit = lambda x, y: (y < 57 and not pignon(x, y)) or (y < 65 and (x < 4 or x > 99))
    baie = lambda x, y: y >= 58 and (21 <= x <= 35 or 68 <= x <= 82)
    return recolorer(img, [
        (lambda x, y, c: prune(c) and baie(x, y), [(14, 68, 62), (24, 92, 88), (32, 112, 108)]),
        (lambda x, y, c: brun(c) and toit(x, y), TOIT),
        (lambda x, y, c: creme(c) or c == (174, 156, 137), BOIS[3:]),
        (lambda x, y, c: pignon(x, y), CADRE[:3]),
        (lambda x, y, c: 36 <= x <= 67 and y >= 58, CADRE),
        (lambda x, y, c: brun(c) or prune(c), BOIS),
    ])


def poulailler():
    """poulailler.png (3 cases de 44 × 55) : toit prune (orange), murs crème (planches dorées),
    bois (cadre brun)."""
    img = Image.open(os.path.join(ORIG, 'poulailler_v1.png')).convert('RGBA')
    return recolorer(img, [
        (lambda x, y, c: prune(c) and y < 30, TOIT),
        (lambda x, y, c: prune(c), CADRE),
        (lambda x, y, c: creme(c), [(200, 178, 104)]),                     # l'enduit : planches claires
        (lambda x, y, c: c in ((222, 176, 74), (176, 128, 52)), TURQUOISE[1:4]),
        (lambda x, y, c: brun(c) and lum(c) < 75, CADRE[:2]),
        (lambda x, y, c: brun(c), BOIS[1:4]),
    ])


def moulin():
    """windmill_sp.png (4 cases de 96 × 128, les ailes tournent) : toile des ailes (crème
    chaud), tour de pierre crème (pierre de la terrasse), charpente (cadre brun), toit (orange),
    vitres sombres (turquoise)."""
    img = Image.open(os.path.join(ORIG, 'windmill_sp_v1.png')).convert('RGBA')
    vitre = lambda c: c in ((14, 68, 62), (46, 77, 79), (24, 57, 64))
    feuillage = lambda c: c in ((45, 107, 71), (86, 139, 69), (158, 171, 110))
    return recolorer(img, [
        (lambda x, y, c: feuillage(c) or (vitre(c) and y >= 92), None),       # le lierre ne change pas
        (lambda x, y, c: vitre(c), TURQUOISE[:3]),
        (lambda x, y, c: creme(c) and y < 95, TOILE),
        (lambda x, y, c: creme(c), PIERRE[1:]),
        (lambda x, y, c: brun(c) and y < 40, TOIT[:5]),
        (lambda x, y, c: brun(c), BOIS[:4]),
    ])


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


def main():
    faits = {
        'house_sp.png': ferme(),
        'barn_sp.png': etable(),
        'windmill_sp.png': moulin(),
        'poulailler.png': poulailler(),
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
