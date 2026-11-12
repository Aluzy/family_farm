# Les papiers peints (data/meubles.json PAPIERS_PEINTS, js/engine/papiers.js) : une image de 16 × 30 par
# motif, posée par la carte sur la face d'un mur du fond d'une pièce (les 30 px du bas de l'image du mur,
# assets/murs_hauts.png ; js/carte/ferme/chantier.js syncPapiers). Vue de haut à 45° : la face du mur est
# droite, éclairée d'en haut à gauche ; sous la corniche, une ombre ; en bas, la plinthe de bois. Les motifs
# ont une période qui divise 16 : posés côte à côte, les murs s'enchaînent sans couture.
#
#   python3 scripts/carte/papiers_peints.py            écrit assets/papiers_peints.png (6 images côte à côte)
#   python3 scripts/carte/papiers_peints.py --apercu   écrit aussi apercu_papiers_peints.png (agrandi, en mur)
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT  # noqa: E402
from nuances import bruit, rampe, ton  # noqa: E402

W, H = 16, 30
PLINTHE = 3                                       # les rangées de la plinthe, en bas
BOIS = rampe([(54, 26, 18), (96, 54, 32), (134, 82, 46), (170, 112, 64), (204, 150, 92), (232, 196, 140)])


def toile():
    return Image.new('RGBA', (W, H), (0, 0, 0, 255))


def finir(im):
    """L'ombre sous la corniche (les deux rangées du haut), la plinthe de bois en bas (son chant clair,
    sa face, son ombre sur le sol), un grain léger qui ne dépend que de (x mod 16, y)."""
    px = im.load()
    for y in range(H - PLINTHE):
        for x in range(W):
            r, g, b, a = px[x, y]
            k = 0.72 if y == 0 else 0.86 if y == 1 else 1.0
            k *= 1 + 0.025 * bruit(x, y, 301)
            px[x, y] = (min(255, round(r * k)), min(255, round(g * k)), min(255, round(b * k)), 255)
    for x in range(W):
        px[x, H - PLINTHE] = ton(BOIS, 0.92) + (255,)
        px[x, H - PLINTHE + 1] = ton(BOIS, 0.55 + 0.04 * bruit(x // 4, 1, 302)) + (255,)
        px[x, H - 1] = ton(BOIS, 0.30) + (255,)
    return im


def fond(im, R, t):
    px = im.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = ton(R, t) + (255,)


def fleurettes():
    """Des fleurettes roses et leur feuille sur un fond crème, en quinconce (période 8)."""
    im = toile()
    CREME = rampe([(214, 196, 164), (238, 226, 200), (250, 244, 228)])
    ROSE = rampe([(150, 50, 80), (210, 96, 120), (244, 160, 176), (255, 214, 220)])
    FEUILLE = rampe([(70, 110, 60), (118, 160, 92)])
    fond(im, CREME, 0.62)
    px = im.load()
    for y0 in range(-4, H, 8):
        for x0 in range(0, 16, 8):
            for (cx, cy) in ((x0 + 3, y0 + 3), (x0 + 7, y0 + 7)):
                for dx, dy, t in ((0, -1, 0.85), (-1, 0, 0.75), (1, 0, 0.55), (0, 1, 0.45), (0, 0, 0.98)):
                    x, y = (cx + dx) % 16, cy + dy
                    if 0 <= y < H:
                        px[x, y] = ton(ROSE, t) + (255,)
                x, y = (cx + 1) % 16, cy + 1
                if 0 <= y < H:
                    px[x, y] = ton(FEUILLE, 0.8) + (255,)
    return finir(im)


def rayures():
    """Des rayures vert sauge et crème, un filet doré entre elles (période 8)."""
    im = toile()
    SAUGE = rampe([(96, 124, 98), (132, 160, 128), (168, 192, 158)])
    CREME = rampe([(214, 204, 176), (238, 230, 206)])
    OR = rampe([(170, 130, 60), (226, 190, 110)])
    px = im.load()
    for y in range(H):
        for x in range(W):
            u = x % 8
            if u < 4:
                c = ton(SAUGE, 0.62 - 0.12 * (u == 3) + 0.12 * (u == 0))
            elif u == 4:
                c = ton(OR, 0.7)
            else:
                c = ton(CREME, 0.7 - 0.2 * (u == 7))
            px[x, y] = c + (255,)
    return finir(im)


def vichy():
    """Des carreaux vichy rouges et blancs (période 8) : les bandes croisées plus foncées."""
    im = toile()
    ROUGE = rampe([(150, 40, 44), (196, 70, 66), (230, 140, 132), (250, 236, 230)])
    px = im.load()
    for y in range(H):
        for x in range(W):
            a, b = (x % 8) < 4, (y % 8) < 4
            t = 0.08 if a and b else 0.45 if a or b else 0.98
            px[x, y] = ton(ROUGE, t + 0.02 * ((x + y) % 2)) + (255,)
    return finir(im)


def damas():
    """Un damas : des fleurons dorés sur un bleu nuit profond, en quinconce (période 8 × 10)."""
    im = toile()
    BLEU = rampe([(22, 34, 62), (36, 54, 92), (52, 74, 120)])
    OR = rampe([(120, 86, 34), (182, 140, 64), (226, 190, 110), (250, 228, 168)])
    fond(im, BLEU, 0.55)
    px = im.load()
    fleuron = ['..#..', '.###.', '##.##', '.###.', '..#..', '..#..']
    for y0 in range(-6, H, 10):
        for x0, dy in ((0, 0), (8, 5)):
            for j, ligne in enumerate(fleuron):
                for i, ch in enumerate(ligne):
                    if ch != '#':
                        continue
                    x, y = (x0 + 1 + i) % 16, y0 + dy + j
                    if 0 <= y < H:
                        px[x, y] = ton(OR, 0.85 - 0.12 * i / 4 - 0.08 * j / 5) + (255,)
    return finir(im)


def feuillages():
    """Des brins de feuillage vert sur un fond vert d'eau pâle, en biais (période 8)."""
    im = toile()
    PALE = rampe([(196, 214, 196), (222, 234, 218)])
    VERT = rampe([(46, 92, 60), (76, 132, 82), (120, 170, 110), (170, 204, 150)])
    fond(im, PALE, 0.6)
    px = im.load()
    for y0 in range(-8, H, 8):
        for x0 in (0, 8):
            for k in range(6):                         # la tige, en biais
                x, y = (x0 + k) % 16, y0 + 6 - k
                if 0 <= y < H:
                    px[x, y] = ton(VERT, 0.25) + (255,)
            for (dx, dy) in ((1, 3), (3, 1), (2, 5), (4, 3)):   # les feuilles
                for (ex, ey, t) in ((0, 0, 0.75), (1, 0, 0.55), (0, 1, 0.45)):
                    x, y = (x0 + dx + ex) % 16, y0 + dy + ey
                    if 0 <= y < H:
                        px[x, y] = ton(VERT, t) + (255,)
    return finir(im)


def etoiles():
    """Des étoiles jaunes et des points sur un bleu de nuit (période 8 × 10)."""
    im = toile()
    NUIT = rampe([(20, 26, 58), (34, 44, 92), (52, 64, 124)])
    JAUNE = rampe([(200, 160, 60), (246, 214, 110), (255, 246, 200)])
    fond(im, NUIT, 0.5)
    px = im.load()
    for y0 in range(-6, H, 10):
        for x0, dy in ((0, 0), (8, 5)):
            cx, cy = x0 + 3, y0 + dy + 3
            for dx, dyy, t in ((0, 0, 1.0), (-1, 0, 0.6), (1, 0, 0.6), (0, -1, 0.7), (0, 1, 0.45)):
                x, y = (cx + dx) % 16, cy + dyy
                if 0 <= y < H:
                    px[x, y] = ton(JAUNE, t) + (255,)
            x, y = (x0 + 6) % 16, y0 + dy + 7
            if 0 <= y < H:
                px[x, y] = ton(JAUNE, 0.35) + (255,)
    return finir(im)


def lambris():
    """Le lambris de pin du chalet (l'ensemble de la boutique) : des lames debout de 4 px, chacune sa rampe et son
    ton, son bord gauche éclairé, la rainure sombre à droite, le fil du bois qui ondule, des nœuds ; une cimaise
    (une baguette moulurée) au tiers du bas (période 4 × 30)."""
    im = toile()
    PINS = [rampe([(92, 56, 34), (140, 92, 54), (182, 132, 80), (214, 170, 110), (238, 204, 148)]),
            rampe([(88, 52, 36), (134, 88, 58), (176, 126, 84), (210, 164, 114), (236, 200, 152)]),
            rampe([(98, 60, 32), (148, 98, 50), (190, 140, 74), (222, 178, 104), (244, 212, 142)]),
            rampe([(84, 50, 32), (130, 84, 52), (172, 122, 76), (206, 160, 104), (232, 196, 140)])]
    px = im.load()
    for y in range(H):
        for x in range(W):
            lame, i = x // 4, x % 4
            R = PINS[lame % 4]
            lum = 0.58 + 0.10 * (i == 0) - 0.30 * (i == 3) + 0.05 * bruit(lame, y // 3 + int(2 * bruit(lame, y // 6, 311)), 312)
            if (y * 3 + lame * 11) % 29 == 0 and i in (1, 2):
                lum -= 0.22                                # un nœud
            if y in (19, 20, 21):                          # la cimaise
                lum = (0.86, 0.60, 0.30)[y - 19]
                R = PINS[2]
            px[x, y] = ton(R, lum) + (255,)
    return finir(im)


def roses():
    """Les roses anglaises du cottage (l'ensemble de la boutique) : de grosses roses épanouies (un cœur sombre, des
    pétales en spirale plus clairs vers la lumière) et leurs feuilles, sur un fond crème rayé de vert pâle, en
    quinconce (période 8 × 10)."""
    im = toile()
    CREME = rampe([(212, 200, 172), (236, 228, 206), (250, 246, 232)])
    VERT_PALE = rampe([(176, 196, 160), (204, 218, 188)])
    ROSE = rampe([(110, 26, 52), (168, 52, 80), (214, 96, 120), (240, 156, 170), (255, 214, 220)])
    FEUILLE = rampe([(46, 84, 50), (82, 124, 72), (130, 168, 104)])
    px = im.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = (ton(VERT_PALE, 0.5) if x % 8 == 7 else ton(CREME, 0.62 + 0.04 * bruit(x, y, 321))) + (255,)
    for y0 in range(-6, H, 10):
        for x0, dy in ((0, 0), (8, 5)):
            cx, cy = x0 + 3, y0 + dy + 4
            for (fx, fy, t) in ((-3, 2, 0.6), (-2, 2, 0.4), (2, -2, 0.7), (3, -1, 0.45)):   # les feuilles
                x, y = (cx + fx) % 16, cy + fy
                if 0 <= y < H:
                    px[x, y] = ton(FEUILLE, t) + (255,)
            for dyy in range(-2, 3):                       # la rose : un disque, la spirale de ses pétales
                for dx in range(-2, 3):
                    d = dx * dx + dyy * dyy
                    if d > 5:
                        continue
                    t = 0.82 - 0.12 * (dx + dyy) / 2 - 0.25 * (d < 2) + (0.12 if (dx * 2 + dyy) % 3 == 0 else 0)
                    x, y = (cx + dx) % 16, cy + dyy
                    if 0 <= y < H:
                        px[x, y] = ton(ROSE, t) + (255,)
            x, y = cx % 16, cy
            if 0 <= y < H:
                px[x, y] = ton(ROSE, 0.15) + (255,)
    return finir(im)


def vagues():
    """Les vagues du bord de mer (l'ensemble de la boutique) : des rangées de vagues marines qui s'enroulent (leur
    crête plus claire, l'écume blanche), sur un fond blanc cassé, décalées d'une rangée à l'autre (période 8 × 6)."""
    im = toile()
    FOND = rampe([(214, 220, 222), (236, 240, 240), (248, 250, 248)])
    MARINE = rampe([(24, 46, 96), (44, 80, 140), (90, 130, 186), (170, 200, 230)])
    px = im.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = ton(FOND, 0.62 + 0.03 * bruit(x, y, 331)) + (255,)
    vague = ['..##....', '.#..#...', '#....###']
    for y0 in range(0, H, 6):
        dx = 4 if (y0 // 6) % 2 else 0
        for j, ligne in enumerate(vague):
            for i, ch in enumerate(ligne):
                if ch == '#':
                    for rep in (0, 8):
                        x, y = (i + dx + rep) % 16, y0 + j
                        if y < H:
                            px[x, y] = ton(MARINE, 0.75 - 0.25 * j + (0.2 if j == 0 else 0)) + (255,)
        x, y = (2 + dx) % 16, y0
        if y < H:
            px[x, y] = ton(FOND, 1.0) + (255,)            # l'écume
    return finir(im)


DESSINS = {'fleurettes': fleurettes, 'rayures': rayures, 'vichy': vichy, 'damas': damas, 'feuillages': feuillages, 'etoiles': etoiles, 'lambris': lambris, 'roses': roses, 'vagues': vagues}


def main():
    motifs = list(json.load(open(os.path.join(ROOT, 'data', 'meubles.json'), encoding='utf-8'))['PAPIERS_PEINTS'])
    manque = [m for m in motifs if m not in DESSINS]
    if manque:
        raise SystemExit(f'pas de dessin pour : {", ".join(manque)} (data/meubles.json PAPIERS_PEINTS)')
    planche = Image.new('RGBA', (W * len(motifs), H), (0, 0, 0, 0))
    for k, m in enumerate(motifs):
        planche.alpha_composite(DESSINS[m](), (k * W, 0))
    planche.save(os.path.join(ASSETS, 'papiers_peints.png'))
    print(f'assets/papiers_peints.png : {len(motifs)} motifs de {W} × {H}')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (len(motifs) * (W * 3 + 4), H), (40, 30, 20, 255))
        for k, m in enumerate(motifs):
            im = DESSINS[m]()
            for j in range(3):
                ap.alpha_composite(im, (k * (W * 3 + 4) + j * W, 0))
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_papiers_peints.png'))


if __name__ == '__main__':
    main()
