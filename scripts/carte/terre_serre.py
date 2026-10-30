# La terre labourée de la Serre, dessinée pour le jeu : des bacs de culture en planches.
#   assets/terre_serre.png : la terre d'une case labourée de la Serre, dans son cadre de bois ;
#   assets/soil_wet_serre.png : la tache humide d'une parcelle arrosée de la Serre, seule (le
#     reste transparent), posée sur son bac.
#
#   python3 scripts/carte/terre_serre.py            écrit les deux images
#   python3 scripts/carte/terre_serre.py --apercu   écrit aussi apercu_terre_serre.png
#
# Au-dehors, la terre labourée déborde en bordure arrondie sur l'herbe des 8 tuiles autour
# (scripts/carte/terre_bords.py). Dans la Serre, chaque case labourée est un bac : la même terre
# (terre_bords.ton), tenue par des planches, exactement sur sa case. Des cases labourées voisines
# (côtés) forment un seul bac : pas de planche entre elles.
# terre_serre.png : 20 cases de 16×16. Les 16 premières, une par masque de voisines (bits :
# 8 en haut, 4 à droite, 2 en bas, 1 à gauche = case labourée de ce côté, sans planche) ; puis
# les quatre coins rentrants (16 haut-droite, 17 haut-gauche, 18 bas-droite, 19 bas-gauche), à
# poser par-dessus quand les deux voisines d'un coin sont labourées et pas la diagonale. La
# lumière vient du haut à gauche : la planche du haut et celle de gauche sont éclairées, celle du
# bas montre son chant, dans l'ombre.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))                     # terre_bords.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, BAYER, apercu, hasard  # noqa: E402
from terre_bords import TERRE, caillou, ton  # noqa: E402
T = 16

TRAIT = (54, 34, 20)                                  # le contour du bac
BOIS = {'clair': (222, 186, 132), 'moyen': (190, 150, 100), 'sombre': (150, 112, 72), 'chant': (118, 86, 54)}
FONCE = 1                                             # la terre du bac, un ton plus sombre qu'au-dehors (du terreau)
VEINE = 0.8                                           # une veine : la planche, un ton plus sombre
HUMIDE = (8.0, 10.6, 4.4, 2.5)                        # la tache humide : centre, rayons (dans le bac)


def planche(px, x, y, c, cle):
    """Un pixel de planche, avec ses veines (fixes)."""
    if hasard(x // 3, y, cle, 17) < 0.18:
        c = tuple(round(v * VEINE) for v in c)
    px[x, y] = c + (255,)


def bac(masque):
    """Le bac d'une case : la terre, puis les planches des côtés sans voisine labourée."""
    haut, droite, bas, gauche = (masque >> 3) & 1, (masque >> 2) & 1, (masque >> 1) & 1, masque & 1
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    px = im.load()
    for y in range(T):
        for x in range(T):
            px[x, y] = (caillou(x, y) or TERRE[max(0, ton(x, y) - FONCE)]) + (255,)
    # l'ombre des planches sur la terre (en haut et à gauche, la lumière venant de là)
    for i in range(T):
        if not haut:
            px[i, 3] = TERRE[max(0, ton(i, 3) - FONCE - 2)] + (255,)
        if not gauche:
            px[3, i] = TERRE[max(0, ton(3, i) - FONCE - 2)] + (255,)
    for i in range(T):
        if not haut:
            planche(px, i, 1, BOIS['clair'], 1)
            planche(px, i, 2, BOIS['moyen'], 1)
        if not bas:
            planche(px, i, 13, BOIS['moyen'], 2)
            planche(px, i, 14, BOIS['chant'], 2)
        if not gauche:
            planche(px, 1, i, BOIS['clair'], 3)
            planche(px, 2, i, BOIS['moyen'], 3)
        if not droite:
            planche(px, 13, i, BOIS['moyen'], 4)
            planche(px, 14, i, BOIS['sombre'], 4)
    for i in range(T):
        if not haut:
            px[i, 0] = TRAIT + (255,)
        if not bas:
            px[i, 15] = TRAIT + (255,)
        if not gauche:
            px[0, i] = TRAIT + (255,)
        if not droite:
            px[15, i] = TRAIT + (255,)
    return im


def coin(n):
    """Un coin rentrant : la planche qui tourne au coin (0 haut-droite, 1 haut-gauche,
    2 bas-droite, 3 bas-gauche), le reste transparent."""
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    px = im.load()
    droite, bas = n in (0, 2), n in (2, 3)
    xs = range(13, 16) if droite else range(0, 3)
    ys = range(13, 16) if bas else range(0, 3)
    for y in ys:
        for x in xs:
            px[x, y] = (BOIS['chant'] if bas and y == 14 else BOIS['sombre'] if droite else BOIS['moyen']) + (255,)
    px[15 if droite else 0, 15 if bas else 0] = TRAIT + (255,)
    return im


def humide():
    """La tache humide au pied de la plante, seule : les teintes mouillées de soil_wet.png, dans
    une ellipse plus petite que la sienne (elle reste dans le bac, entre ses planches), au bord
    tramé."""
    mouille = Image.open(os.path.join(ASSETS, 'soil_wet.png')).convert('RGBA').load()
    cx, cy, rx, ry = HUMIDE
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    px = im.load()
    for y in range(T):
        for x in range(T):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1 or (d > 0.7 and BAYER[y % 4][x % 4] / 16 < (d - 0.7) / 0.3):
                continue
            px[x, y] = mouille[x, y]
    return im


def main():
    planche_ = Image.new('RGBA', (20 * T, T), (0, 0, 0, 0))
    for m in range(16):
        planche_.alpha_composite(bac(m), (m * T, 0))
    for n in range(4):
        planche_.alpha_composite(coin(n), ((16 + n) * T, 0))
    planche_.save(os.path.join(ASSETS, 'terre_serre.png'))
    humide().save(os.path.join(ASSETS, 'soil_wet_serre.png'))
    print('assets/terre_serre.png et assets/soil_wet_serre.png écrits')
    if '--apercu' in sys.argv:
        # un bac en L de cinq cases, arrosé au milieu, sur l'herbe
        fond = Image.new('RGBA', (5 * T, 4 * T), (96, 140, 70, 255))
        cases = {(1, 1), (2, 1), (3, 1), (1, 2), (3, 2)}
        for (c, r) in cases:
            m = (8 if (c, r - 1) in cases else 0) | (4 if (c + 1, r) in cases else 0) \
                | (2 if (c, r + 1) in cases else 0) | (1 if (c - 1, r) in cases else 0)
            fond.alpha_composite(bac(m), (c * T, r * T))
            for n, (dc, dr) in enumerate(((1, -1), (-1, -1), (1, 1), (-1, 1))):
                if (c + dc, r) in cases and (c, r + dr) in cases and (c + dc, r + dr) not in cases:
                    fond.alpha_composite(coin(n), (c * T, r * T))
        fond.alpha_composite(humide(), (2 * T, 1 * T))
        apercu(fond, 'apercu_terre_serre.png', 8)


if __name__ == '__main__':
    main()
