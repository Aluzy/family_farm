# assets/panneaux_toit.png : les panneaux solaires posés sur le versant droit du toit de la maison
# (house_sp.png, 93×97). Planche de 6 images de 32×47, la n-ième porte n panneaux ; chacune se pose
# au point (OX, OY) de l'image de la maison (voir ROOF_PANELS dans js/farm-stage.js).
# Le versant droit est un parallélogramme : bord haut de (37, 2) à (68, 17), bord bas 30 px plus
# bas, pente d'un pixel vers le bas tous les deux pixels. Les panneaux suivent cette pente : côtés
# verticaux, bords haut et bas en escalier comme les rangs de bardeaux. Lumière à gauche.
from PIL import Image
import os

OX, OY = 37, 2          # coin haut-gauche de la découpe dans house_sp.png
FW, FH = 32, 47         # taille d'une image de la planche
N = 6                   # places sur le versant
PW, PH = 9, 10          # un panneau : 9 px de large, 10 de haut (cadre compris)
COLS = [39, 49, 59]     # x (dans la maison) du bord gauche de chaque colonne de panneaux
ROWS = [5, 18]          # décalage sous le bord haut du toit de chaque rangée
# ordre de pose : la rangée du bas (près de l'égout) d'abord, de gauche à droite
PLACES = [(1, 0), (1, 1), (1, 2), (0, 0), (0, 1), (0, 2)]

C = {
    'ombre': (60, 17, 35),       # l'ombre portée sur les bardeaux (le contour sombre du toit)
    'cadre': (52, 56, 66),
    'cadre_l': (96, 104, 118),   # cadre éclairé (côté gauche et haut)
    'cell': (38, 64, 112),
    'cell_d': (30, 50, 92),      # cellules du bas, un peu plus sombres
    'joint': (70, 104, 158),
    'reflet': (150, 190, 232),
}


def shear(x):
    return (x - OX) // 2


def draw_panel(px, x0, row):
    for dx in range(PW):
        x = x0 + dx
        top = OY + shear(x) + ROWS[row]
        for dy in range(PH + 1):
            y = top + dy
            if dy == PH:
                c = 'ombre'
            elif dx == 0 or dy == 0:
                c = 'cadre_l'
            elif dx == PW - 1 or dy == PH - 1:
                c = 'cadre'
            elif dx == 4 or dy in (3, 6):
                c = 'joint'
            elif dy >= 7:
                c = 'cell_d'
            else:
                c = 'cell'
            fx, fy = x - OX, y - OY
            if 0 <= fx < FW and 0 <= fy < FH:
                px[fx, fy] = C[c] + (255,)
    # reflet : la case du haut à gauche attrape la lumière
    for (dx, dy) in ((1, 1), (2, 1), (1, 2)):
        x = x0 + dx
        y = OY + shear(x) + ROWS[row] + dy
        px[x - OX, y - OY] = C['reflet'] + (255,)


sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
for n in range(1, N + 1):
    frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    px = frame.load()
    for row, col in PLACES[:n]:
        draw_panel(px, COLS[col], row)
    sheet.paste(frame, ((n - 1) * FW, 0))

out = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'panneaux_toit.png')
sheet.save(os.path.normpath(out))
print('assets/panneaux_toit.png :', N, 'images de', FW, '×', FH)
