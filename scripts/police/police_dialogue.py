# La police des fenêtres de dialogue (essai) : l'alphabet dessiné à la main de
# scripts/police/originaux/ (minuscules.png : les minuscules fines, les chiffres et quelques
# signes ; majuscules.png : les majuscules, fines, aussi hautes que les chiffres), tel quel, en
# police web.
#
#   python3 scripts/police/police_dialogue.py            écrit assets/police_dialogue.woff
#   python3 scripts/police/police_dialogue.py --apercu   écrit aussi apercu_police_dialogue.png
#
# Demande fontTools (pip install fonttools). Chaque pixel du dessin est un carré de PX unités
# (UPM / PX = 8 pixels par em : à 16 px, un pixel du dessin fait 2 px de l'écran ; à 24 px, 3).
# Les lettres sont découpées dans les originaux (DECOUPE : la case, sa ligne de base) ; les
# signes qui manquent (. , ; ( ) / % …) et les accents du français sont dessinés ici, dans le
# même trait (MAINS, ACCENTS). L'avance d'un caractère : sa largeur plus une colonne vide. Les
# emojis et les caractères absents passent à la police suivante (css/jeu.css).
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, apercu  # noqa: E402

ORIGINAUX = os.path.join(ROOT, 'scripts', 'police', 'originaux')
SORTIE = os.path.join(ASSETS, 'police_dialogue.woff')
NOM = 'Ferme Dialogue'
UPM, PX = 1024, 128
MONTEE, DESCENTE = 10, 3         # pixels au-dessus et au-dessous de la ligne de base
ESPACE = 3                       # l'avance de l'espace (px)

# La découpe : caractère -> (image, x0, x1, y0, y1, ligne de base), x1 et y1 compris ; la
# ligne de base est la rangée du bas des lettres posées dessus.
MIN, MAJ = 'minuscules.png', 'majuscules.png'
DECOUPE = {}
for c, x0, x1 in zip('abcdefghijklm', (0, 6, 12, 18, 25, 31, 36, 42, 49, 51, 56, 62, 64),
                     (4, 10, 16, 22, 29, 35, 40, 46, 49, 54, 59, 62, 70)):
    DECOUPE[c] = (MIN, x0, x1, 0, 10, 7)
for c, x0, x1 in zip('nopqrstuvwx', (0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 62), (4, 10, 16, 22, 28, 34, 40, 46, 52, 60, 66)):
    DECOUPE[c] = (MIN, x0, x1, 12, 22, 19)
DECOUPE['y'] = (MIN, 0, 4, 24, 31, 28)
DECOUPE['z'] = (MIN, 6, 10, 24, 28, 28)
for c, x0, x1 in zip('1234567890', (12, 17, 23, 29, 36, 42, 48, 54, 60, 66), (15, 21, 27, 34, 40, 46, 52, 58, 64, 70)):
    DECOUPE[c] = (MIN, x0, x1, 24, 31, 31)
for c, x0, x1 in (('!', 1, 1), ('?', 3, 7), (':', 10, 10), ('’', 13, 14), ('“', 18, 21), ('”', 24, 27),
                  ('+', 29, 33), ('-', 35, 39), ('÷', 41, 45)):
    DECOUPE[c] = (MIN, x0, x1, 36, 43, 43)
for lettres, xs, y0, y1 in (
        ('ABCDEFGHIJ', ((1, 6), (8, 13), (15, 20), (22, 27), (29, 34), (36, 41), (43, 48), (50, 55), (57, 61), (64, 69)), 1, 8),
        ('KLMNOPQRST', ((1, 6), (8, 13), (15, 20), (22, 27), (29, 34), (36, 41), (43, 48), (50, 55), (57, 62), (64, 68)), 12, 19),
        ('UVWXYZ', ((1, 6), (8, 14), (16, 22), (24, 28), (30, 34), (36, 41)), 24, 31)):
    for c, (x0, x1) in zip(lettres, xs):
        DECOUPE[c] = (MAJ, x0, x1, y0, y1 + (1 if c == 'Q' else 0), y1)

# Les signes dessinés ici : rangées du haut vers le bas, la dernière posée sur la ligne de base
# (sauf `bas` : rangées sous la ligne de base, comme la virgule).
MAINS = {
    '.': (['#'], 0),
    ',': (['.#', '.#', '#.'], 2),
    ';': (['.#', '..', '..', '.#', '.#', '#.'], 2),
    "'": (['#', '#', '.', '.', '.', '.', '.', '.'], 0),
    '"': (['#.#', '#.#', '...', '...', '...', '...', '...', '...'], 0),
    '«': (['..#..#', '.#..#.', '#..#..', '.#..#.', '..#..#'], 0),
    '»': (['#..#..', '.#..#.', '..#..#', '.#..#.', '#..#..'], 0),
    '(': (['.#', '#.', '#.', '#.', '#.', '#.', '#.', '.#'], 1),
    ')': (['#.', '.#', '.#', '.#', '.#', '.#', '.#', '#.'], 1),
    '[': (['##', '#.', '#.', '#.', '#.', '#.', '#.', '##'], 1),
    ']': (['##', '.#', '.#', '.#', '.#', '.#', '.#', '##'], 1),
    '/': (['....#', '...#.', '...#.', '..#..', '..#..', '.#...', '.#...', '#....'], 0),
    '%': (['##..#', '##.#.', '...#.', '..#..', '..#..', '.#...', '.#.##', '#..##'], 0),
    '=': (['#####', '.....', '#####'], -1),
    '×': (['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], 0),
    '*': (['..#..', '#.#.#', '.###.', '#.#.#', '..#..'], -3),
    '#': (['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.'], 0),
    '&': (['.##..', '#..#.', '#..#.', '.##..', '#.#.#', '#..#.', '#..#.', '.##.#'], 0),
    '<': (['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'], 0),
    '>': (['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'], 0),
    '_': (['#####'], 2),
    '…': (['#.#.#'], 0),
    '·': (['#'], -2),
    '–': (['#####'], -2),
    '—': (['#######'], -2),
    '°': (['.#.', '#.#', '.#.', '...', '...', '...', '...', '...'], 0),
    '€': (['..###', '.#...', '####.', '.#...', '####.', '.#...', '..###'], 0),
    '$': (['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'], 0),
    '@': (['.####.', '#....#', '#.##.#', '#.#.##', '#..#.#', '#.....', '.####.'], 0),
}
MAINS['‘'] = (['#.', '#.', '.#'] + ['..'] * 5, 0)
MAINS['−'] = None                                         # (le moins : le tiret de l'original)

# Les accents : en pixels (rangée, colonne depuis le milieu), au-dessus de la lettre : une
# rangée vide entre les deux sur une minuscule, aucune sur une majuscule (la place manque).
ACCENTS = {
    'aigu': [(-1, 1), (-2, 2)], 'grave': [(-1, 0), (-2, -1)],
    'circ': [(-1, -1), (-2, 0), (-1, 1)], 'trema': [(-1, -1), (-1, 1)],
}
COMPOSES = {
    'à': ('a', 'grave'), 'â': ('a', 'circ'), 'ä': ('a', 'trema'), 'é': ('e', 'aigu'), 'è': ('e', 'grave'),
    'ê': ('e', 'circ'), 'ë': ('e', 'trema'), 'î': ('ı', 'circ'), 'ï': ('ı', 'trema'), 'ô': ('o', 'circ'),
    'ö': ('o', 'trema'), 'ù': ('u', 'grave'), 'û': ('u', 'circ'), 'ü': ('u', 'trema'), 'ÿ': ('y', 'trema'),
    'À': ('A', 'grave'), 'Â': ('A', 'circ'), 'É': ('E', 'aigu'), 'È': ('E', 'grave'), 'Ê': ('E', 'circ'),
    'Ë': ('E', 'trema'), 'Î': ('I', 'circ'), 'Ï': ('I', 'trema'), 'Ô': ('O', 'circ'), 'Ù': ('U', 'grave'),
    'Û': ('U', 'circ'), 'Ü': ('U', 'trema'),
}


def decoupe(c):
    """Le dessin d'un caractère des originaux : (pixels {(x, y)}, largeur), y vers le haut depuis
    la ligne de base (0 : la rangée posée dessus ; -1 : la première sous la ligne)."""
    f, x0, x1, y0, y1, base = DECOUPE[c]
    im = Image.open(os.path.join(ORIGINAUX, f)).convert('RGBA')
    px = im.load()
    pts = {(x - x0, base - y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if px[x, y][3] > 0}
    return pts, x1 - x0 + 1


def dessin(lignes, decal):
    """Un signe de MAINS : les rangées, la dernière à `decal` rangées sous la ligne de base."""
    h = len(lignes)
    pts = {(x, h - 1 - r - decal) for r, ligne in enumerate(lignes) for x, ch in enumerate(ligne) if ch == '#'}
    return pts, max(len(ligne) for ligne in lignes)


def glyphes():
    g = {c: decoupe(c) for c in DECOUPE}
    for c, d in MAINS.items():
        if d:
            g[c] = dessin(*d)
    g['−'] = g['-']
    g['ı'] = ({p for p in g['i'][0] if p[1] <= 3}, g['i'][1])                 # i sans point
    # ç, Ç : une cédille sous la lettre ; œ : o et e qui partagent une colonne
    pts, w = g['c']
    g['ç'] = (pts | {(2, -1), (2, -2), (1, -3)}, w)
    pts, w = g['C']
    g['Ç'] = (pts | {(3, -1), (3, -2), (2, -3)}, w)
    (po, wo), (pe, we) = g['o'], g['e']
    g['œ'] = (po | {(x + wo - 1, y) for x, y in pe}, wo + we - 1)
    for c, (base, accent) in COMPOSES.items():
        pts, w = g[base]
        haut = max(y for _, y in pts) + (1 if base.isupper() else 2)
        milieu = (w - 1) // 2
        g[c] = (pts | {(milieu + dc, haut - r - 1) for r, dc in ACCENTS[accent]}, w)
    return g


def police(g):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen

    ordre = ['.notdef', 'space'] + [f'uni{ord(c):04X}' for c in sorted(g)]
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(ordre)
    fb.setupCharacterMap({32: 'space', 160: 'space', **{ord(c): f'uni{ord(c):04X}' for c in g}})
    contours, avances = {}, {'.notdef': (ESPACE * PX, 0), 'space': (ESPACE * PX, 0)}
    vide = TTGlyphPen(None).glyph()
    contours['.notdef'] = contours['space'] = vide
    for c, (pts, w) in g.items():
        pen = TTGlyphPen(None)
        # une rangée de pixels voisins : un rectangle
        for y in sorted({y for _, y in pts}):
            xs = sorted(x for x, yy in pts if yy == y)
            debut = xs[0]
            for i, x in enumerate(xs):
                if i + 1 == len(xs) or xs[i + 1] != x + 1:
                    a, b, h0, h1 = debut * PX, (x + 1) * PX, y * PX, (y + 1) * PX
                    pen.moveTo((a, h0)); pen.lineTo((a, h1)); pen.lineTo((b, h1)); pen.lineTo((b, h0)); pen.closePath()
                    if i + 1 < len(xs):
                        debut = xs[i + 1]
        nom = f'uni{ord(c):04X}'
        contours[nom] = pen.glyph()
        avances[nom] = ((w + 1) * PX, 0)
    fb.setupGlyf(contours)
    fb.setupHorizontalMetrics(avances)
    fb.setupHorizontalHeader(ascent=MONTEE * PX, descent=-DESCENTE * PX)
    fb.setupNameTable({'familyName': NOM, 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=MONTEE * PX, sTypoDescender=-DESCENTE * PX, sTypoLineGap=0,
                usWinAscent=MONTEE * PX, usWinDescent=DESCENTE * PX, sxHeight=5 * PX, sCapHeight=5 * PX)
    fb.setupPost()
    fb.font.flavor = 'woff'
    fb.save(SORTIE)


def apercu_texte(g, texte, couleur=(81, 49, 24, 255)):
    lignes = texte.split('\n')
    larg = max(sum((g[c][1] + 1) if c in g else ESPACE for c in ligne) for ligne in lignes) + 4
    im = Image.new('RGBA', (larg, len(lignes) * (MONTEE + DESCENTE + 3) + 4), (250, 232, 196, 255))
    px = im.load()
    for n, ligne in enumerate(lignes):
        x, base = 2, 2 + n * (MONTEE + DESCENTE + 3) + MONTEE
        for c in ligne:
            if c not in g:
                x += ESPACE
                continue
            pts, w = g[c]
            for dx, dy in pts:
                px[x + dx, base - dy] = couleur
            x += w + 1
    return im


def main():
    g = glyphes()
    police(g)
    if '--apercu' in sys.argv:
        apercu(apercu_texte(g, "Ravi de te revoir ! Lundi 1 Solaria, 4 280 pièces.\n"
                               "Biens produits : Cacao +1, Vanille +1, Café +1.\n"
                               "« Où est l'Étable ? » Ça coûte 12 € (soit 3/4 du prix).\n"
                               "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789\n"
                               "àâäéèêëîïôöùûüç œ ÀÉÈÊÎÔÙÇ !?.,;:'’“”()[]/%=+-×÷*#&<>_…°€$@"),
               'apercu_police_dialogue.png', zoom=4)
    print(os.path.relpath(SORTIE, ROOT))


if __name__ == '__main__':
    main()
