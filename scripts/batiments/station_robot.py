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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, apercu, contour, points, rangee  # noqa: E402
from robot import CAISSE, ECRAN, K  # noqa: E402,F401  (la borne a les couleurs du robot)

W, H = 12, 22
SOCLE = [(170, 164, 150), (128, 122, 112), (92, 88, 82)]
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
    return contour(points(px, W, H), K)


def main():
    N = 5
    sheet = rangee([image(n) for n in range(N)], W, H)
    sheet.save(os.path.join(ASSETS, 'station_robot.png'), optimize=True)
    print(f'assets/station_robot.png : {N} images de {W} × {H} px')
    if '--apercu' in sys.argv:
        apercu(sheet, 'apercu_station_robot.png', 8, (150, 112, 74))


if __name__ == '__main__':
    main()
