# La carte du joueur en haut à gauche (js/ui/stage-windows.js renderIndicators, css/jeu.css
# .player-card), en pixel art : assets/hud/<nom>.png.
#   cadre.png    le cadre bois de la carte (16 × 16, découpé en 9 : 6 px de bord, le milieu crème) ;
#   fenetre.png  le fond du portrait (8 × 8, 2 px de bord, en creux) ;
#   plaque.png   la plaque du nom (10 × 10, 3 px de bord) ;
#   tube.png     le tube des jauges, vertical ou horizontal (9 × 9, 2 px de bord, l'intérieur sombre) ;
#   pastille.png la pastille de l'argent (10 × 10, 3 px de bord) ;
#   coeur.png, eclair.png, smiley.png : les jauges d'énergie, d'endurance et de bonheur ;
#   etoile.png   le niveau, posé sur le bout gauche de sa barre ;
#   pousse.png   l'autonomie, posée en haut à gauche de son anneau ;
#   anneau.png   l'anneau de l'autonomie : 21 cases de 15 × 15 (0 %, 5 %… 100 %, rempli dans le
#                sens des aiguilles d'une montre depuis le haut) ;
#   piece.png    l'argent, posé sur le bout gauche de sa pastille.
# La carte de droite (renderHud) :
#   cadran.png   le cadran rond (56 × 56) : un anneau de bois, la rainure où tourne la lune
#                (rayon RAINURE), le fond crème ;
#   medaillon.png le médaillon ovale du jour et du mois (38 × 22), au milieu du cadran ;
#   lunes.png    la lune, 14 cases de 11 × 11 : une par jour de la lunaison (data/crops.json
#                LUNE : croissante du jour 1 au 5, pleine les 6 et 7, décroissante du 8 au 12,
#                nouvelle les 13 et 14).
#
#   python3 scripts/icones/hud.py            écrit assets/hud/
#   python3 scripts/icones/hud.py --apercu   écrit aussi apercu_hud.png (agrandi)
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT, rgb  # noqa: E402
DIR = os.path.join(ASSETS, 'hud')

PAL = {
    'o': '#3a2414',     # contour
    'w': '#6e4426',     # bois sombre
    'm': '#8a5a34',     # bois
    'l': '#a8744a',     # bois clair
    'h': '#d9a066',     # reflet du bois
    'c': '#ffe6b2',     # crème
    'C': '#f0cc8c',     # crème ombrée
    't': '#5e3e22',     # fond des tubes
    'R': '#e04838', 'r': '#a82a24', 'P': '#ff9c8c',          # cœur
    'Y': '#f8d040', 'y': '#c89418', 'J': '#fff2a0',          # éclair, smiley, étoile, pièce
    'G': '#5ab43c', 'g': '#2e7a2a', 'L': '#9ce070',          # pousse
    'k': '#3a2414',                                          # traits du visage
}


def grille(rows):
    im = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), rgb(PAL[ch]))
    return im


def couleur(c):
    """Une lettre de PAL, ou '#rrggbb' / '#rrggbbaa'."""
    if len(c) == 1:
        return rgb(PAL[c])
    a = int(c[7:9], 16) if len(c) > 7 else 255
    return rgb(c[:7])[:3] + (a,)


def neuf(n, couches, coins=1, fond=None):
    """Un carré de n × n à découper en 9 : `couches[d]` est la couleur à la distance d du bord
    (un couple (haut-gauche, bas-droite) pour un relief), `fond` le milieu ; les `coins`
    premières cases de chaque angle restent vides (bord arrondi)."""
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            ax, ay = min(x, n - 1 - x), min(y, n - 1 - y)
            if ax + ay < coins:
                continue
            if ax + ay == coins:          # l'arrondi : le contour
                im.putpixel((x, y), rgb(PAL['o']))
                continue
            c = couches[d] if d < len(couches) else fond
            if c is None:
                continue
            if isinstance(c, tuple):        # relief : clair en haut et à gauche, sombre en bas et à droite
                c = c[0] if (y == d and x < n - 1 - d) or (x == d and y < n - 1 - d) else c[1]
            im.putpixel((x, y), couleur(c))
    return im


def cadre():
    return neuf(16, ['o', ('h', 'w'), 'm', 'm', ('w', 'h'), 'o'], 2, '#ffe6b2ee')


def fenetre():
    return neuf(8, [('w', 'h'), ('C', 'c')], 0, '#f6dca8')


def plaque():
    return neuf(10, ['o', ('h', 'w'), 'm'], 1, '#ffe6b2')


def tube():
    return neuf(9, ['o', ('h', 'w')], 1, '#5e3e22')


def pastille():
    return neuf(10, ['o', ('h', 'w'), 'C'], 1, '#ffe6b2')


COEUR = [
    '.oo...oo.',
    'oRPo.oRRo',
    'oRRRoRRRo',
    'oRRRRRRro',
    '.oRRRRRo.',
    '..oRRro..',
    '...oro...',
    '....o....',
]
ECLAIR = [
    '....oooo',
    '...oJYYo',
    '...oYYo.',
    '..oJYo..',
    '..oYYooo',
    '.oYYYYYo',
    '.ooooYyo',
    '....oYo.',
    '...oyo..',
    '...oo...',
]
SMILEY = [
    '..ooooo..',
    '.oJYYYYo.',
    'oJYYYYYYo',
    'oYYkYkYYo',
    'oYYYYYYyo',
    'oYkYYYkyo',
    'oYYkkkYyo',
    '.oYYyyyo.',
    '..ooooo..',
]
ETOILE = [
    '.....o.....',
    '....oJo....',
    '....oYo....',
    'ooooJYYoooo',
    'oJYYYYYYYyo',
    '.oYYYYYYyo.',
    '..oYYYYyo..',
    '..oYYoYyo..',
    '.oYyo.oyyo.',
    '.ooo...ooo.',
]
POUSSE = [
    'oo...oo',
    'oLo.oGo',
    'oLGoGgo',
    '.oGGGo.',
    '..oGo..',
    '..oGo..',
    '..ooo..',
]
PIECE = [
    '..oooooo..',
    '.oJYYYYyo.',
    'oJYYYYYYyo',
    'oYYYyyYYyo',
    'oYYyYYYYyo',
    'oYYyYYYYyo',
    'oYYYyyYYyo',
    'oYYYYYYYyo',
    '.oYYyyyyo.',
    '..oooooo..',
]


def anneau(pct):
    """L'anneau de l'autonomie (15 × 15) rempli à `pct` %, depuis le haut, dans le sens des
    aiguilles d'une montre : vert (reflet en haut à gauche), le reste sombre ; contour dedans et dehors."""
    S = 15
    c = (S - 1) / 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > 7.4 or d < 3.3:
                continue
            if d > 6.5 or d < 4.2:
                im.putpixel((x, y), rgb(PAL['o']))
                continue
            a = (math.degrees(math.atan2(x - c, -(y - c))) + 360) % 360
            plein = a < pct * 3.6 or pct >= 100
            if plein:
                col = PAL['L'] if (x - c) + (y - c) < -3 else (PAL['g'] if (x - c) + (y - c) > 3 else PAL['G'])
            else:
                col = PAL['t']
            im.putpixel((x, y), rgb(col))
    return im


CADRAN, RAINURE = 56, 22


def cadran():
    """Le cadran : contour, anneau de bois (reflet en haut à gauche), la rainure sombre de la
    lune, un filet clair, le fond crème."""
    S = CADRAN
    c = (S - 1) / 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > 27.6:
                continue
            haut = (x - c) + (y - c) < 0
            if d > 26.6:
                col = PAL['o']
            elif d > 25.6:
                col = PAL['h'] if haut else PAL['w']
            elif d > 23.6:
                col = PAL['m']
            elif d > 22.6 + 1.0:
                col = PAL['o']
            elif d > RAINURE - 1.4:
                col = '#2c2440'
            elif d > RAINURE - 2.4:
                col = PAL['o']
            elif d > RAINURE - 3.4:
                col = PAL['w'] if haut else PAL['h']
            else:
                col = '#ffe6b2'
            im.putpixel((x, y), rgb(col))
    return im


def medaillon():
    """L'ovale du jour et du mois : contour, relief, fond crème."""
    W, H = 38, 22
    cx, cy = (W - 1) / 2, (H - 1) / 2
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            e = ((x - cx) / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2
            if e > 1:
                continue
            bord = ((x - cx) / (W / 2 - 1)) ** 2 + ((y - cy) / (H / 2 - 1)) ** 2 > 1
            relief = ((x - cx) / (W / 2 - 2)) ** 2 + ((y - cy) / (H / 2 - 2)) ** 2 > 1
            if bord:
                col = PAL['o']
            elif relief:
                col = PAL['h'] if y < cy else PAL['l']
            else:
                col = '#fff1d2'
            im.putpixel((x, y), rgb(col))
    return im


def lune(p):
    """La lune (11 × 11) à l'âge p de la lunaison (0 : nouvelle, 0,5 : pleine) : éclairée à
    droite quand elle croît, à gauche quand elle décroît ; la part sombre reste visible."""
    S = 11
    c = (S - 1) / 2
    r = 5.4
    cosp = math.cos(2 * math.pi * p)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > r:
                continue
            if d > r - 1:
                im.putpixel((x, y), rgb('#1c1830'))
                continue
            demi = math.sqrt(max(0.01, (r - 1) ** 2 - (y - c) ** 2))
            u = (x - c) / demi
            eclaire = u > cosp if p <= 0.5 else u < -math.cos(2 * math.pi * p)
            if eclaire:
                col = '#fff6c8' if (x - c) + (y - c) < -3 else ('#d8c47a' if (x - c) + (y - c) > 3 else '#f2e29a')
                if (x, y) in ((3, 6), (6, 3), (7, 7)):
                    col = '#d8c47a'                     # des cratères
            else:
                col = '#3a3658'
            im.putpixel((x, y), rgb(col))
    return im


def images():
    out = {
        'cadre': cadre(), 'fenetre': fenetre(), 'plaque': plaque(), 'tube': tube(), 'pastille': pastille(),
        'coeur': grille(COEUR), 'eclair': grille(ECLAIR), 'smiley': grille(SMILEY), 'etoile': grille(ETOILE),
        'pousse': grille(POUSSE), 'piece': grille(PIECE),
    }
    bande = Image.new('RGBA', (15 * 21, 15), (0, 0, 0, 0))
    for k in range(21):
        bande.paste(anneau(k * 5), (15 * k, 0))
    out['anneau'] = bande
    out['cadran'] = cadran()
    out['medaillon'] = medaillon()
    lunes = Image.new('RGBA', (11 * 14, 11), (0, 0, 0, 0))
    for k in range(14):
        lunes.paste(lune(((k + 1.5) / 14) % 1), (11 * k, 0))
    out['lunes'] = lunes
    return out


def main():
    os.makedirs(DIR, exist_ok=True)
    ims = images()
    for nom, im in ims.items():
        im.save(os.path.join(DIR, nom + '.png'))
    print(f'assets/hud : {len(ims)} images')
    if '--apercu' in sys.argv:
        S = 8
        W = sum(im.width + 2 for im in ims.values())
        sheet = Image.new('RGBA', (W * S, 40 * S), (126, 170, 92, 255))
        x = 0
        for im in ims.values():
            sheet.alpha_composite(im.resize((im.width * S, im.height * S), Image.NEAREST), (x * S, 0))
            x += im.width + 2
        sheet.save(os.path.join(ROOT, 'apercu_hud.png'))


if __name__ == '__main__':
    main()
