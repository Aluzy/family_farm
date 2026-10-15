# La station de charge du robot (assets/station_robot.png), à côté de la maison : le robot y
# recharge sa batterie sur l'électricité de la ferme (voir runRobotCharge dans
# js/engine/automation.js). Une borne bleu-gris comme la caisse du robot, sur un socle de
# pierre : un éclair peint, une jauge à trois traits, une lumière, et le câble enroulé sur le
# côté droit, branché vers le robot garé à sa droite. 5 images de 12 × 22 px, le bas du socle
# au milieu (x = 6, y = 21) :
#   0       au repos (rien à charger : la lumière verte fixe, la jauge pleine)
#   1..4    en charge (la jauge se remplit trait par trait, de vide à pleine ; la lumière orange
#           clignote)
#
#   python3 scripts/batiments/station_robot.py            écrit l'image
#   python3 scripts/batiments/station_robot.py --apercu   écrit aussi apercu_station_robot.png (agrandi)
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
W, H = 12, 22
K = (30, 26, 30)
CAISSE = [(176, 206, 218), (120, 160, 182), (78, 112, 136)]
SOCLE = [(170, 164, 150), (128, 122, 112), (92, 88, 82)]
ECRAN = (24, 36, 44)
JAUGE = [(120, 230, 120), (44, 84, 56)]
ECLAIR = (255, 214, 72)
VERT = [(120, 240, 120), (50, 110, 60)]
ORANGE = [(255, 170, 60), (120, 70, 30)]
CABLE = [(58, 58, 66), (36, 36, 42)]


def image(n):
    px = {}
    put = lambda x, y, c: px.__setitem__((x, y), c)
    # le socle de pierre
    for x in range(1, 10):
        put(x, 18, SOCLE[0])
        for y in (19, 20):
            put(x, y, SOCLE[1] if x < 9 else SOCLE[2])
        put(x, 21, SOCLE[2])
    # la borne : le dessus clair, la face, l'ombre à droite
    for x in range(2, 9):
        put(x, 3, CAISSE[0])
        for y in range(4, 18):
            put(x, y, CAISSE[1] if x < 8 else CAISSE[2])
    put(3, 2, CAISSE[0]); put(4, 2, CAISSE[0]); put(5, 2, CAISSE[0]); put(6, 2, CAISSE[0]); put(7, 2, CAISSE[1])
    # la lumière, sur le dessus
    if n == 0:
        put(5, 1, VERT[0])
    else:
        put(5, 1, ORANGE[0] if n % 2 else ORANGE[1])
    # l'écran et sa jauge (3 traits, de bas en haut)
    for x in range(3, 8):
        for y in range(4, 11):
            put(x, y, ECRAN)
    pleins = 3 if n == 0 else n - 1
    for k in range(3):
        c = JAUGE[0] if k < pleins else JAUGE[1]
        for x in range(4, 7):
            put(x, 9 - 2 * k, c)
    # l'éclair peint sous l'écran
    for x, y in ((6, 12), (5, 13), (4, 14), (5, 14), (6, 14), (5, 15), (4, 16)):
        put(x, y, ECLAIR)
    # le câble enroulé sur le flanc droit, puis vers le sol (et le robot, à droite)
    for y in (8, 9, 10):
        put(9, y, CABLE[0])
    put(10, 9, CABLE[1]); put(10, 10, CABLE[0]); put(10, 11, CABLE[0])
    for y in range(12, 18):
        put(10, y, CABLE[0] if y % 2 else CABLE[1])
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
    N = 5
    sheet = Image.new('RGBA', (W * N, H), (0, 0, 0, 0))
    for n in range(N):
        sheet.paste(image(n), (n * W, 0))
    sheet.save(os.path.join(ROOT, 'assets', 'station_robot.png'), optimize=True)
    print(f'assets/station_robot.png : {N} images de {W} × {H} px')
    if '--apercu' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (150, 112, 74, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(ROOT, 'apercu_station_robot.png'))


if __name__ == '__main__':
    main()
