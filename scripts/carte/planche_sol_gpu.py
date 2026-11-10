# Fiche 34 (l'essai des objets GPU de Phaser 4) : une seule planche pour le sol du grand monde.
#
# Un TilemapGPULayer ne lit qu'un jeu de tuiles ; le sol du monde en mélange deux : la planche de la ferme
# (assets/farm_spring_summer.png, 75 colonnes) et assets/sols_monde.png (16 colonnes). Cette planche les
# réunit sans les changer : celle de la ferme en haut, celle des sols dessous, à gauche. Une tuile n de la
# ferme (n = gid - firstgid) garde sa place ; la tuile n des sols est à la rangée (rangées de la ferme +
# n // 16), colonne n % 16 (js/carte/ferme/sol-gpu.js fait le même calcul). La planche est extrudée (comme
# CarteKit.extrude : chaque tuile recopiée avec un bord d'un pixel qui répète le sien ; marge 1, espacement 2)
# pour qu'aucun liseré n'apparaisse entre les tuiles à zoom non entier, sans le faire au chargement.
#
#   python3 scripts/carte/planche_sol_gpu.py   → assets/sol_gpu.png
import os

from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', '..', 'assets')
T = 16

ferme = Image.open(os.path.join(ASSETS, 'farm_spring_summer.png')).convert('RGBA')
sols = Image.open(os.path.join(ASSETS, 'sols_monde.png')).convert('RGBA')
rf = ferme.height // T
out = Image.new('RGBA', (max(ferme.width, sols.width), rf * T + sols.height), (0, 0, 0, 0))
out.paste(ferme.crop((0, 0, ferme.width, rf * T)), (0, 0))
out.paste(sols, (0, rf * T))
cols, rows = out.width // T, out.height // T
ext = Image.new('RGBA', (cols * (T + 2), rows * (T + 2)), (0, 0, 0, 0))
for r in range(rows):
    for c in range(cols):
        tuile = out.crop((c * T, r * T, (c + 1) * T, (r + 1) * T))
        dx, dy = c * (T + 2) + 1, r * (T + 2) + 1
        # le bord : les pixels du bord de la tuile, répétés d'un pixel tout autour
        grand = tuile.resize((T + 2, T + 2), Image.NEAREST)
        grand.paste(tuile, (1, 1))
        for i in range(T):
            grand.putpixel((0, i + 1), tuile.getpixel((0, i))); grand.putpixel((T + 1, i + 1), tuile.getpixel((T - 1, i)))
            grand.putpixel((i + 1, 0), tuile.getpixel((i, 0))); grand.putpixel((i + 1, T + 1), tuile.getpixel((i, T - 1)))
        for (x, y), (sx, sy) in (((0, 0), (0, 0)), ((T + 1, 0), (T - 1, 0)), ((0, T + 1), (0, T - 1)), ((T + 1, T + 1), (T - 1, T - 1))):
            grand.putpixel((x, y), tuile.getpixel((sx, sy)))
        ext.paste(grand, (dx - 1, dy - 1))
ext.save(os.path.join(ASSETS, 'sol_gpu.png'), optimize=True)
print('assets/sol_gpu.png', ext.size, 'colonnes :', cols, 'rangées de la ferme :', rf)
