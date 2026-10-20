# Le vélo des habitants de la ville (assets/velo.png, js/carte/ville/velos.js) : un vélo de ville,
# cadre rouge, deux roues, une selle, un guidon. L'habitant s'y assoit (ses cases assis_<vue>,
# comme sur le triporteur : js/carte/triporteur.js, les mêmes cases).
#
# Cases de 40 × 32, le milieu du bas (20, 31) aux pieds du personnage, sur une rangée, dans cet
# ordre : pour chaque vue (bas : de face ; haut : de dos ; cote : de profil, tourné vers la
# droite), pour chaque coup de pédale (0, 1 : les rayons tournent), la couche « dessous »
# (derrière le personnage) puis « dessus » (devant lui). Lumière en haut à gauche, contour sombre.
#
#   python3 scripts/personnage/velo.py            écrit assets/velo.png
#   python3 scripts/personnage/velo.py --apercu   écrit aussi apercu_velo.png
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from triporteur import CONTOUR, H, JANTE, PNEU, ROOT, SELLE, VUES, W, contour, image, roue_face, roue_profil  # noqa: E402

CADRE, CADRE_C, CADRE_S = (176, 52, 48, 255), (222, 96, 84, 255), (120, 32, 32, 255)
GUIDON = (60, 60, 66, 255)


def vue_bas(p):
    """De face : la roue avant, la fourche et le guidon devant le personnage (dessus) ; la selle
    et le haut de la roue arrière derrière lui (dessous)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    roue_face(d, 20, 17, 22, p)
    d.rectangle((18, 18, 22, 19), fill=SELLE)
    e = ImageDraw.Draw(dessus)
    roue_face(e, 20, 24, 31, p)
    e.line((19, 18, 19, 25), fill=CADRE)            # la fourche
    e.line((21, 18, 21, 25), fill=CADRE_S)
    e.line((13, 17, 27, 17), fill=GUIDON)           # le guidon
    e.point((13, 16), fill=GUIDON)
    e.point((27, 16), fill=GUIDON)
    e.point((20, 20), fill=(250, 236, 150, 255))    # le phare
    return contour(dessous), contour(dessus)


def vue_haut(p):
    """De dos : la roue avant et le guidon au loin (dessous) ; la roue arrière, le garde-boue
    et son catadioptre devant lui (dessus)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    roue_face(d, 20, 14, 20, p)
    d.line((13, 14, 27, 14), fill=GUIDON)
    e = ImageDraw.Draw(dessus)
    roue_face(e, 20, 24, 31, p)
    e.rectangle((18, 22, 22, 23), fill=CADRE)       # le garde-boue
    e.line((18, 22, 22, 22), fill=CADRE_C)
    e.point((20, 24), fill=(230, 60, 50, 255))      # le catadioptre
    return contour(dessous), contour(dessus)


def vue_cote(p):
    """De profil (vers la droite) : les deux roues, le cadre en losange, la selle, le pédalier
    (dessous) ; la potence et le guidon devant le personnage (dessus)."""
    dessous, dessus = image(), image()
    d = ImageDraw.Draw(dessous)
    roue_profil(d, 9, 25, 6, p)
    roue_profil(d, 31, 25, 6, p)
    d.line((9, 25, 18, 25), fill=CADRE_S)          # la base arrière
    d.line((9, 25, 14, 18), fill=CADRE)            # le hauban
    d.line((14, 18, 18, 25), fill=CADRE)           # le tube de selle
    d.line((18, 25, 27, 17), fill=CADRE)           # le tube oblique
    d.line((14, 18, 27, 17), fill=CADRE_C)         # le tube du haut
    d.line((27, 17, 31, 25), fill=CADRE_S)         # la fourche
    d.rectangle((11, 16, 15, 17), fill=SELLE)
    d.line((13, 17, 14, 18), fill=CADRE_S)
    # le pédalier : la manivelle tourne avec le coup de pédale
    d.point((18, 25), fill=CONTOUR)
    if p == 0:
        d.line((17, 23, 19, 27), fill=GUIDON)
    else:
        d.line((16, 25, 20, 25), fill=GUIDON)
    e = ImageDraw.Draw(dessus)
    e.line((27, 17, 26, 13), fill=CADRE)           # la potence et le guidon
    e.line((24, 13, 27, 13), fill=GUIDON)
    return contour(dessous), contour(dessus)


def planche():
    cases = []
    for vue in VUES:
        for p in (0, 1):
            dessous, dessus = {'bas': vue_bas, 'haut': vue_haut, 'cote': vue_cote}[vue](p)
            cases += [dessous, dessus]
    return cases


def main():
    cases = planche()
    out = Image.new('RGBA', (W * len(cases), H), (0, 0, 0, 0))
    for i, c in enumerate(cases):
        out.alpha_composite(c, (i * W, 0))
    out.save(os.path.join(ROOT, 'assets', 'velo.png'), optimize=True)
    print(f'assets/velo.png : {len(cases)} cases de {W} × {H}')
    if '--apercu' in sys.argv:
        ap = Image.new('RGBA', (W * 6 * 4, H * 4), (110, 160, 96, 255))
        for i in range(6):
            v = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            v.alpha_composite(cases[2 * i])
            v.alpha_composite(cases[2 * i + 1])
            ap.alpha_composite(v.resize((W * 4, H * 4), Image.NEAREST), (i * W * 4, 0))
        ap.save(os.path.join(ROOT, 'apercu_velo.png'))


if __name__ == '__main__':
    main()
