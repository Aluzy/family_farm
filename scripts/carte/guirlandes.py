# Les guirlandes lumineuses (la boutique de gemmes : worker/src/boutique.mjs ARTICLES) : un segment par mur,
# accroché en haut de la face extérieure d'une façade (js/carte/ferme/chantier.js syncGuirlandes). Le fil
# part du coin haut gauche et arrive au coin haut droit de la case (rangée 1) : d'un mur à l'autre, les
# segments se raccordent ; entre deux, il pend un peu. Ses ampoules pendent sous le fil, une tous les 4 px
# (période 16 : la même d'un segment à l'autre).
#
# Pour chaque coloris (dans l'ordre de COLORIS), trois images de 16 × 12 : éteinte (le jour : le verre
# teinté, sans éclat), puis allumée A et allumée B (la nuit, elles alternent : les ampoules scintillent,
# une sur deux plus vive à chaque image). Lumière en haut à gauche, contour sombre d'un pixel.
#
#   python3 scripts/carte/guirlandes.py            écrit assets/guirlandes.png (une rangée par coloris)
#   python3 scripts/carte/guirlandes.py --apercu   écrit aussi apercu_guirlandes.png (agrandi, en façade)
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py
sys.path.insert(0, HERE)
from pixel import ASSETS, ROOT, contour  # noqa: E402
from nuances import rampe, ton  # noqa: E402

W, H = 16, 12
OUT = (36, 30, 20)
FIL = rampe([(28, 36, 24), (52, 66, 44), (84, 100, 70)])
BLANC = rampe([(150, 126, 80), (236, 206, 130), (255, 240, 190), (255, 252, 236)])
ROUGE = rampe([(120, 24, 30), (222, 64, 60), (255, 150, 130), (255, 224, 214)])
VERT = rampe([(28, 96, 44), (70, 196, 96), (170, 250, 170), (230, 255, 230)])
BLEU = rampe([(30, 54, 140), (70, 120, 236), (160, 200, 255), (226, 240, 255)])
JAUNE = rampe([(140, 100, 20), (246, 196, 60), (255, 234, 140), (255, 250, 220)])
ROSE = rampe([(130, 30, 70), (236, 90, 140), (255, 170, 200), (255, 230, 240)])
# un coloris : la forme des ampoules, et leur rampe, l'une après l'autre le long du fil
COLORIS = [
    ('blanche', 'rond', [BLANC]),
    ('multicolore', 'rond', [ROUGE, VERT, BLEU, JAUNE]),
    ('etoiles', 'etoile', [JAUNE]),
    ('coeurs', 'coeur', [ROSE]),
]
AMPOULES = [2, 6, 10, 14]                         # leur colonne (une tous les 4 px)
FORMES = {
    'rond': ['.#.', '###', '.#.'],
    'etoile': ['.#.', '###', '#.#'],
    'coeur': ['#.#', '###', '.#.'],
}


def fil_y(x):
    """La hauteur du fil à la colonne x : rangée 1 aux deux bords, il pend de 2 px au milieu."""
    return 1 + round(2 * math.sin(math.pi * (x + 0.5) / W))


def segment(forme, rampes, etat):
    """etat : 0 éteinte, 1 allumée (les ampoules paires vives), 2 allumée (les impaires vives)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    for x in range(W):
        y = fil_y(x)
        px[x, y] = ton(FIL, 0.7) + (255,)
        if 0 < x < W - 1 and abs(fil_y(x - 1) - y) > 0:
            px[x, y - 1 if fil_y(x - 1) < y else y + 1] = ton(FIL, 0.4) + (255,)
    for k, xa in enumerate(AMPOULES):
        R = rampes[k % len(rampes)]
        y0 = fil_y(xa) + 1
        px[xa, y0] = ton(FIL, 0.3) + (255,)                       # la douille
        vive = etat and (k % 2 == (etat - 1))
        for j, ligne in enumerate(FORMES[forme]):
            for i, ch in enumerate(ligne):
                if ch != '#':
                    continue
                x, y = xa - 1 + i, y0 + 1 + j
                if etat == 0:
                    t = 0.35 + 0.15 * (i == 0 and j == 0) - 0.1 * (i == 2)
                else:
                    t = (0.95 if vive else 0.72) - 0.12 * (i == 2) - 0.05 * j
                    if i == 1 and j == 1:
                        t = 1.0 if vive else 0.85                   # le cœur de l'ampoule
                px[x, y] = ton(R, t) + (255,)
    im = contour(im, OUT)
    if etat:                                                        # le halo des ampoules vives, sur le contour
        for k, xa in enumerate(AMPOULES):
            if k % 2 != (etat - 1):
                continue
            R = rampes[k % len(rampes)]
            y0 = fil_y(xa) + 3
            for dx, dy in ((-2, 0), (2, 0), (0, 2)):
                x, y = xa + dx, y0 + dy
                if 0 <= x < W and 0 <= y < H:
                    px2 = im.load()
                    px2[x, y] = ton(R, 0.8) + (170,)
    return im


def main():
    planche = Image.new('RGBA', (W * 3, H * len(COLORIS)), (0, 0, 0, 0))
    for r, (nom, forme, rampes) in enumerate(COLORIS):
        for etat in range(3):
            planche.alpha_composite(segment(forme, rampes, etat), (etat * W, r * H))
    planche.save(os.path.join(ASSETS, 'guirlandes.png'))
    print(f'assets/guirlandes.png : {len(COLORIS)} coloris × 3 images de {W} × {H}')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (W * 4 * 3 + 40, (H + 6) * len(COLORIS)), (120, 100, 80, 255))
        nuit = Image.new('RGBA', ap.size, (16, 20, 44, 255))
        for r, (nom, forme, rampes) in enumerate(COLORIS):
            for etat, fond in ((0, ap), (1, nuit), (2, nuit)):
                for j in range(4):
                    fond.alpha_composite(segment(forme, rampes, etat), (etat * (W * 4 + 20) + j * W, r * (H + 6) + 3))
        ap.alpha_composite(nuit.crop((W * 4 + 20, 0, nuit.width, nuit.height)), (W * 4 + 20, 0))
        ap.resize((ap.width * 6, ap.height * 6), Image.NEAREST).save(os.path.join(ROOT, 'apercu_guirlandes.png'))


if __name__ == '__main__':
    main()
