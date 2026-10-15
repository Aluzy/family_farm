# Le robot de la ferme (assets/robot.png) : il fait la récolte et le semis automatiques (voir
# robotStep dans js/engine/automation.js). Vu de face, de 3/4 comme la carte : des chenilles,
# une caisse bleu-gris avec un écran (deux yeux), une antenne à lumière, un bras à pince sur
# le côté droit. 6 images de 14 × 16 px, le bas des chenilles au milieu (x = 7, y = 15) :
#   0, 1  roule (les chenilles avancent, la lumière clignote)
#   2..4  le bras descend jusqu'au sol et la pince se ferme (récolter, planter)
#   5     au repos (les yeux mi-clos)
#
#   python3 scripts/batiments/robot.py            écrit l'image
#   python3 scripts/batiments/robot.py --apercu   écrit aussi apercu_robot.png (agrandi)
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
W, H = 14, 16
K = (30, 26, 30)
CAISSE = [(176, 206, 218), (120, 160, 182), (78, 112, 136)]
CHENILLE = [(96, 96, 104), (58, 58, 66), (36, 36, 42)]
ECRAN = (24, 36, 44)
OEIL = [(140, 246, 255), (70, 150, 170)]
LUMIERE = [(255, 92, 72), (130, 40, 36)]
METAL = [(206, 210, 214), (140, 146, 152)]


def image(n):
    px = {}
    put = lambda x, y, c: px.__setitem__((x, y), c)
    # chenilles : le dessus, la face (des patins qui avancent d'une image à l'autre)
    for x in range(2, 12):
        put(x, 12, CHENILLE[0])
        for y in (13, 14):
            put(x, y, CHENILLE[1] if (x + (n % 2)) % 3 else CHENILLE[2])
        put(x, 15, CHENILLE[2])
    for y in (13, 14):                           # les roues des bouts
        put(2, y, CHENILLE[0]); put(11, y, CHENILLE[2])
    # la caisse : le dessus clair, la face, l'ombre à droite
    for x in range(3, 11):
        put(x, 5, CAISSE[0])
        for y in range(6, 12):
            put(x, y, CAISSE[1] if x < 10 else CAISSE[2])
    put(3, 11, CAISSE[2]); put(10, 5, CAISSE[1])
    # l'écran et les yeux
    for x in range(4, 9):
        for y in range(6, 9):
            put(x, y, ECRAN)
    if n == 5:
        put(5, 8, OEIL[1]); put(7, 8, OEIL[1])  # au repos : les yeux mi-clos
    else:
        put(5, 7, OEIL[0]); put(7, 7, OEIL[0])
    put(6, 10, CAISSE[0]); put(7, 10, CAISSE[0])   # une grille d'aération
    # l'antenne et sa lumière (elle clignote en roulant)
    put(6, 4, METAL[1]); put(6, 3, METAL[1])
    put(6, 2, LUMIERE[0] if n in (1, 2, 3, 4) else LUMIERE[1])
    # le bras droit : l'épaule, puis la pince
    put(11, 7, METAL[1])
    if n in (0, 1, 5):
        put(12, 8, METAL[0]); put(12, 9, METAL[1]); put(12, 10, METAL[0])
    else:
        bout = {2: (12, 11), 3: (13, 13), 4: (13, 14)}[n]
        x0, y0 = 12, 8
        steps = max(bout[1] - y0, 1)
        for k in range(steps + 1):
            put(round(x0 + (bout[0] - x0) * k / steps), y0 + k, METAL[0] if k % 2 == 0 else METAL[1])
        if n == 4:                                # la pince fermée au sol
            put(12, 14, METAL[1])
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < W and 0 <= y < H:
            im.putpixel((x, y), c + (255,))
    out = im.copy()
    for y in range(H):
        for x in range(W):
            if im.getpixel((x, y))[3]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and im.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), K + (255,))
    return out


def main():
    N = 6
    sheet = Image.new('RGBA', (W * N, H), (0, 0, 0, 0))
    for n in range(N):
        sheet.paste(image(n), (n * W, 0))
    sheet.save(os.path.join(ROOT, 'assets', 'robot.png'), optimize=True)
    print(f'assets/robot.png : {N} images de {W} × {H} px')
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (150, 112, 74, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_robot.png'))


if __name__ == '__main__':
    main()
