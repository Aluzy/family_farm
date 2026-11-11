"""Les pommes du galop (js/ui/galop.js) et les icônes de la pomme dorée et de la sacoche.

Tirées de l'icône de la pomme (assets/icones/red_apple.png) : la même pomme, sa chair (blanche : la jauge, quand le
cheval la mange, blanchit de gauche à droite), la pomme dorée et sa chair. Écrit :
  assets/galop_pommes.png             4 cases de 16 × 16 : pomme, chair de la pomme, pomme dorée, chair de la dorée ;
  assets/icones/red_apple+sparkles.png  l'icône de la pomme dorée (🍎‍✨) ;
  assets/icones/handbag.png             l'icône de la sacoche du cheval (👜).
Lancer : python3 scripts/galop/pommes.py, puis python3 scripts/icones/build.py (la planche des icônes).
"""
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
POMME = Image.open(RACINE / 'assets/icones/red_apple.png').convert('RGBA')
# les teintes de la pomme (le rouge, son ombre, le plus sombre, le reflet, le point de lumière)
ROUGE = {(236, 70, 70): 'H', (190, 28, 40): 'G', (110, 14, 26): 'E', (255, 160, 150): 'J', (244, 240, 224): 'I'}
CHAIR = {'H': (246, 236, 208), 'G': (222, 206, 170), 'E': (176, 152, 112), 'J': (255, 250, 236), 'I': (255, 255, 244)}
OR = {'H': (240, 190, 50), 'G': (204, 142, 26), 'E': (140, 88, 12), 'J': (255, 234, 150), 'I': (255, 252, 222)}


def teinte(pal):
    im = POMME.copy()
    for y in range(16):
        for x in range(16):
            r, g, b, a = im.getpixel((x, y))
            k = ROUGE.get((r, g, b))
            if a and k: im.putpixel((x, y), pal[k] + (255,))
    return im


def main():
    rouge, chair, dore = POMME, teinte(CHAIR), teinte(OR)
    planche = Image.new('RGBA', (64, 16), (0, 0, 0, 0))
    for i, im in enumerate((rouge, chair, dore, chair)):
        planche.alpha_composite(im, (16 * i, 0))
    planche.save(RACINE / 'assets/galop_pommes.png')
    dore.save(RACINE / 'assets/icones/red_apple+sparkles.png')
    # la sacoche : du cuir, un rabat, une boucle dorée, des coutures
    ART = [
        "................",
        "................",
        ".....OOOOOO.....",
        "....O......O....",
        "...OOOOOOOOOO...",
        "..OFFFFFFFFFFO..",
        "..OFHHHHHHHFFO..",
        "..OFFFFYYFFFFO..",
        "..OOOOOYYOOOOO..",
        "..OBBBBYYBBBBO..",
        "..OBCBBBBBBCBO..",
        "..OBBBBBBBBBBO..",
        "..OBCBBBBBBCBO..",
        "..OBBBBBBBBBdO..",
        "...OOOOOOOOOO...",
        "................",
    ]
    P = {'O': (58, 32, 18), 'F': (176, 112, 58), 'H': (214, 152, 92), 'Y': (240, 200, 70), 'B': (150, 92, 46), 'C': (226, 196, 140), 'd': (110, 64, 30)}
    sac = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(ART):
        for x, c in enumerate(row):
            if c != '.': sac.putpixel((x, y), P[c] + (255,))
    sac.save(RACINE / 'assets/icones/handbag.png')


if __name__ == '__main__':
    main()
