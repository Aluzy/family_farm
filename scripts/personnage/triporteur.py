# Le triporteur du personnage (assets/triporteur.png) : un tricycle à caisse de bois à l'avant
# (deux roues devant sous la caisse, une derrière sous la selle), cadre vert. Le personnage s'y
# assoit (ses cases assis_<vue>, js/carte/triporteur.js) ; la carte le pose sur la selle.
#
# Cases de 40 × 32, le milieu du bas (20, 31) aux pieds du personnage, sur une rangée, dans cet
# ordre : pour chaque vue (bas : de face ; haut : de dos ; cote : de profil, tourné vers la
# droite), pour chaque coup de pédale (0, 1 : les rayons tournent), la couche « dessous »
# (derrière le personnage) puis « dessus » (devant lui : la caisse vue de face, la roue arrière
# vue de dos). Lumière en haut à gauche, contour sombre.
#
#   python3 scripts/personnage/triporteur.py            écrit assets/triporteur.png
#   python3 scripts/personnage/triporteur.py --apercu   écrit aussi apercu_triporteur.png
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
W, H = 40, 32
VUES = ['bas', 'haut', 'cote']

CONTOUR = (34, 26, 24, 255)
CADRE, CADRE_C, CADRE_S = (62, 120, 74, 255), (104, 168, 104, 255), (40, 82, 52, 255)
PNEU, JANTE, RAYON = (40, 38, 40, 255), (150, 150, 158, 255), (196, 196, 204, 255)
BOIS, BOIS_C, BOIS_S, BOIS_K = (164, 112, 64, 255), (198, 146, 88, 255), (120, 78, 44, 255), (92, 58, 34, 255)
SELLE = (60, 44, 36, 255)
CAISSE = [(214, 86, 64, 255), (238, 192, 74, 255), (126, 170, 82, 255)]   # ce qui dépasse de la caisse


def image():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def contour(im):
    """Un contour sombre autour de ce qui est dessiné (les 4 voisins)."""
    out = im.copy()
    px = im.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), CONTOUR)
    return out


def roue_profil(d, cx, cy, r, p):
    """Une roue vue de côté : le pneu, la jante, les rayons (en + ou en x selon le coup de pédale)."""
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=PNEU)
    d.ellipse((cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1), fill=JANTE)
    d.ellipse((cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2), fill=(0, 0, 0, 0))
    k = r - 2
    if p == 0:
        d.line((cx - k, cy, cx + k, cy), fill=RAYON)
        d.line((cx, cy - k, cx, cy + k), fill=RAYON)
    else:
        q = max(1, k - 1)
        d.line((cx - q, cy - q, cx + q, cy + q), fill=RAYON)
        d.line((cx - q, cy + q, cx + q, cy - q), fill=RAYON)
    d.point((cx, cy), fill=CADRE_S)


def roue_face(d, cx, y0, y1, p):
    """Une roue vue de face ou de dos : une bande de pneu, la jante qui brille par endroits."""
    d.rectangle((cx - 1, y0, cx + 1, y1), fill=PNEU)
    for y in range(y0 + 1, y1, 2):
        d.point((cx, y if p == 0 else min(y1 - 1, y + 1)), fill=JANTE)


def caisse_face(d, x0, x1, y0, y1):
    """La caisse de bois vue de face : des planches, un rebord clair, ce qu'elle porte qui dépasse."""
    for i, c in enumerate(CAISSE):
        d.rectangle((x0 + 2 + i * 5, y0 - 2, x0 + 5 + i * 5, y0), fill=c)
    d.rectangle((x0, y0, x1, y1), fill=BOIS)
    d.line((x0, y0, x1, y0), fill=BOIS_C)
    for y in range(y0 + 3, y1, 3):
        d.line((x0, y, x1, y), fill=BOIS_S)
    d.line((x0, y0, x0, y1), fill=BOIS_K)
    d.line((x1, y0, x1, y1), fill=BOIS_K)


def vue_bas(p):
    """De face : la caisse devant le personnage (dessus), ses deux roues de part et d'autre, le
    guidon au-dessus ; derrière, le haut de la roue arrière et la selle (dessous)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    d.rectangle((18, 18, 22, 20), fill=SELLE)
    d.line((20, 21, 20, 24), fill=CADRE_S)
    e = ImageDraw.Draw(dessus)
    roue_face(e, 9, 23, 30, p)
    roue_face(e, 31, 23, 30, p)
    caisse_face(e, 11, 29, 20, 28)
    e.line((12, 16, 28, 16), fill=CADRE)           # le guidon
    e.point((12, 15), fill=CADRE_S)
    e.point((28, 15), fill=CADRE_S)
    e.line((20, 17, 20, 19), fill=CADRE_S)
    return contour(dessous), contour(dessus)


def vue_haut(p):
    """De dos : la caisse au loin derrière le personnage, ses deux roues (dessous) ; la roue
    arrière et le garde-boue devant lui (dessus)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    roue_face(d, 9, 16, 23, p)
    roue_face(d, 31, 16, 23, p)
    caisse_face(d, 11, 29, 11, 19)
    d.line((12, 14, 28, 14), fill=CADRE)
    e = ImageDraw.Draw(dessus)
    roue_face(e, 20, 24, 31, p)
    e.rectangle((18, 22, 22, 23), fill=CADRE)       # le garde-boue
    e.line((18, 22, 22, 22), fill=CADRE_C)
    return contour(dessous), contour(dessus)


def vue_cote(p):
    """De profil (vers la droite) : la roue arrière sous la selle, le cadre, le pédalier, la
    caisse sur la roue avant ; le guidon devant le personnage (dessus)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    roue_profil(d, 9, 26, 5, p)
    roue_profil(d, 31, 26, 5, p)
    d.line((9, 26, 14, 20), fill=CADRE)            # la base arrière
    d.line((14, 20, 18, 26), fill=CADRE)           # le tube de selle jusqu'au pédalier
    d.line((9, 26, 18, 26), fill=CADRE_S)
    d.line((18, 26, 26, 21), fill=CADRE)           # le tube jusqu'à la caisse
    d.line((14, 20, 24, 18), fill=CADRE_C)         # le tube du haut
    d.rectangle((11, 18, 15, 19), fill=SELLE)
    # le pédalier : la manivelle tourne avec le coup de pédale
    d.point((18, 26), fill=CONTOUR)
    if p == 0:
        d.line((17, 24, 19, 28), fill=CADRE_S)
    else:
        d.line((16, 26, 20, 26), fill=CADRE_S)
    # la caisse, de profil, sur la roue avant
    for i, c in enumerate(CAISSE[:2]):
        d.rectangle((27 + i * 5, 12, 30 + i * 5, 14), fill=c)
    d.rectangle((25, 14, 38, 22), fill=BOIS)
    d.line((25, 14, 38, 14), fill=BOIS_C)
    for y in (17, 20):
        d.line((25, y, 38, y), fill=BOIS_S)
    d.line((25, 14, 25, 22), fill=BOIS_K)
    d.line((38, 14, 38, 22), fill=BOIS_K)
    e = ImageDraw.Draw(dessus)
    e.line((23, 18, 23, 13), fill=CADRE)           # la potence et le guidon
    e.line((21, 13, 24, 13), fill=CADRE_C)
    return contour(dessous), contour(dessus)


def main():
    cases = []
    for vue in VUES:
        for p in (0, 1):
            dessous, dessus = {'bas': vue_bas, 'haut': vue_haut, 'cote': vue_cote}[vue](p)
            cases += [dessous, dessus]
    planche = Image.new('RGBA', (W * len(cases), H), (0, 0, 0, 0))
    for i, c in enumerate(cases):
        planche.alpha_composite(c, (i * W, 0))
    planche.save(os.path.join(ROOT, 'assets', 'triporteur.png'), optimize=True)
    print(f'assets/triporteur.png : {len(cases)} cases de {W} × {H}')
    if '--apercu' in sys.argv:
        # chaque vue, ses deux couches l'une sur l'autre, en grand
        out = Image.new('RGBA', (W * 6 * 4, H * 4), (110, 160, 96, 255))
        for i in range(6):
            v = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            v.alpha_composite(cases[2 * i])
            v.alpha_composite(cases[2 * i + 1])
            out.alpha_composite(v.resize((W * 4, H * 4), Image.NEAREST), (i * W * 4, 0))
        out.save(os.path.join(ROOT, 'apercu_triporteur.png'))


if __name__ == '__main__':
    main()
