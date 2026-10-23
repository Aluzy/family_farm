# La carte du joueur en haut à gauche (js/ui/stage-windows.js renderIndicators, css/jeu.css
# .player-card), en pixel art : assets/hud/<nom>.png.
#   cadre.png    le cadre bois de la carte (16 × 16, découpé en 9 : 6 px de bord, le milieu crème) ;
#   fenetre.png  le fond du portrait (8 × 8, 2 px de bord, en creux) ;
#   plaque.png   la plaque du nom (10 × 10, 3 px de bord) ;
#   tube.png     le tube des jauges, vertical ou horizontal (9 × 9, 2 px de bord, l'intérieur sombre) ;
#   pastille.png la pastille de l'argent (10 × 10, 3 px de bord) ;
#   coeur.png, eclair.png, smiley.png : les jauges d'énergie, d'endurance et de bonheur ;
#   etoile.png   l'étoile de l'XP (le didacticiel, les fenêtres) ;
#   portrait.png le médaillon rond du portrait : 21 cases de 42 × 42 (0 %, 5 %… 100 % de l'XP vers
#                le niveau suivant, l'anneau doré rempli dans le sens des aiguilles d'une
#                montre depuis le haut, sur un anneau de bois clair) ; le portrait se pose dans
#                son disque crème (rayon PORTRAIT_R) ;
#   niveau.png   la grande étoile du niveau (19 × 18), posée en bas à gauche du médaillon : le
#                numéro du niveau s'écrit dans son cœur, en police pixel ;
#   pousse.png   l'autonomie, posée en haut à gauche de son anneau ;
#   anneau.png   l'anneau de l'autonomie : 21 cases de 15 × 15 (0 %, 5 %… 100 %, rempli dans le
#                sens des aiguilles d'une montre depuis le haut) ;
#   piece.png    l'argent, posé sur le bout gauche de sa pastille.
# La carte de droite (renderHud) :
#   hublot.png   le hublot rond (40 × 40) : un anneau de bois, un ciel de nuit étoilé dedans ;
#   lunes.png    la lune du hublot, 14 cases de 21 × 21 : une par jour de la lunaison
#                (data/crops.json LUNE : croissante du jour 1 au 5, pleine les 6 et 7,
#                décroissante du 8 au 12, nouvelle les 13 et 14) ;
#   ruban.png    le bandeau beige du jour et du mois (28 × 12 : ses bouts entaillés en V,
#                découpés à 5 px de chaque côté, le milieu s'étire en largeur seulement) ;
#   heure.png    la plaque de l'heure, sous le bandeau (6 × 6, découpée en 9 : un trait fin, un relief).
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


def heure():
    return neuf(6, ['o', ('#fff6dc', 'C')], 1, '#ffe6b2')


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


PORTRAIT, PORTRAIT_R = 42, 16


def portrait(pct):
    """Le médaillon du portrait (PORTRAIT px de côté) : un trait de bois, l'anneau de l'XP (doré
    sur `pct` %, depuis le haut, dans le sens des aiguilles d'une montre ; le reste en bois
    clair, reflet en haut à gauche), un trait de bois, puis le disque crème du portrait."""
    S = PORTRAIT
    c = (S - 1) / 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > 21:
                continue
            haut = (x - c) + (y - c) < -8
            bas = (x - c) + (y - c) > 8
            if d > 20:
                col = PAL['w']
            elif d > PORTRAIT_R + 1:
                a = (math.degrees(math.atan2(x - c, -(y - c))) + 360) % 360
                if a < pct * 3.6 or pct >= 100:
                    col = PAL['J'] if haut else (PAL['y'] if bas else PAL['Y'])
                else:
                    col = PAL['h'] if haut else (PAL['m'] if bas else PAL['l'])
            elif d > PORTRAIT_R:
                col = PAL['m']
            else:
                col = PAL['c']
            im.putpixel((x, y), rgb(col))
    return im


def etoile_niveau():
    """La grande étoile du niveau (19 × 18) : cinq branches, un cœur assez large pour deux
    chiffres de la police pixel (3 × 5) ; contour, reflet en haut à gauche, ombre en bas à droite."""
    W, H = 19, 18
    cx, cy = 9, 9.6
    R, r = 9.6, 5.6
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5
        rr = R if k % 2 == 0 else r
        pts.append((cx + rr * math.cos(a), cy - rr * math.sin(a)))

    def dedans(x, y):
        n, ok = len(pts), False
        for i in range(n):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                ok = not ok
        return ok
    plein = {(x, y) for y in range(H) for x in range(W) if dedans(x + 0.5, y + 0.5)}
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y) in plein:
        bord = any((x + dx, y + dy) not in plein for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if bord:
            col = PAL['o']
        elif (x - cx) + (y - cy) < -6:
            col = PAL['J']
        elif (x - cx) + (y - cy) > 5:
            col = PAL['y']
        else:
            col = PAL['Y']
        im.putpixel((x, y), rgb(col))
    return im


LUNE = 17                                          # (la taille de référence des cratères)


def lune(p, S=LUNE, r=8.4):
    """La lune (S × S, rayon r) à l'âge p de la lunaison (0 : nouvelle, 0,5 : pleine) : éclairée à
    droite quand elle croît, à gauche quand elle décroît ; la part sombre reste visible."""
    c = (S - 1) / 2
    k = S / LUNE                                       # (les cratères, à l'échelle)
    crateres = {(round(x * k), round(y * k)) for x, y in ((5, 9), (6, 9), (9, 5), (10, 11), (11, 11), (11, 10))}
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
                col = '#fff6c8' if (x - c) + (y - c) < -5 else ('#d8c47a' if (x - c) + (y - c) > 5 else '#f2e29a')
                if (x, y) in crateres:
                    col = '#d8c47a'                     # des cratères
            else:
                col = '#3a3658'
            im.putpixel((x, y), rgb(col))
    return im


HUBLOT, GRANDE = 40, 21
# les étoiles du ciel du hublot : (x, y, vive)
ETOILES = [(9, 12, 1), (13, 7, 0), (27, 8, 1), (31, 14, 0), (8, 25, 0), (11, 30, 1), (29, 29, 1), (25, 33, 0), (20, 5, 0), (33, 22, 0), (6, 18, 0)]


def hublot():
    """Le hublot : un anneau de bois (contour, reflet en haut à gauche, bois, ombre en bas à
    droite, un trait dedans), le ciel de nuit dedans, plus clair vers le bas, et ses étoiles."""
    S = HUBLOT
    c = (S - 1) / 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > 19.6:
                continue
            haut = (x - c) + (y - c) < -6
            bas = (x - c) + (y - c) > 6
            if d > 18.6:
                col = PAL['o']
            elif d > 16.4:
                col = PAL['h'] if haut else (PAL['w'] if bas else PAL['m'])
            elif d > 15.4:
                col = PAL['w']
            else:
                col = '#1c2246' if y < 13 else ('#232b55' if y < 26 else '#2c3664')
            im.putpixel((x, y), rgb(col))
    for x, y, vive in ETOILES:
        im.putpixel((x, y), rgb('#fff6c8' if vive else '#8e98c8'))
        if vive:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                im.putpixel((x + dx, y + dy), rgb('#6a74a8'))
    return im


def ruban():
    """Le bandeau du jour et du mois (28 × 12) : une bande beige, ses deux bouts entaillés en V,
    un contour, un reflet en haut, une ombre en bas."""
    W, H = 28, 12
    forme = set()
    for y in range(H):
        e = 3.2 - abs(y - 5.5) * 0.75             # (l'entaille : 3 px au milieu, rien en haut et en bas)
        for x in range(W):
            if x >= e and W - 1 - x >= e:
                forme.add((x, y))
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y) in forme:
        dehors = any((x + dx, y + dy) not in forme for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if dehors:
            col = PAL['o']
        elif y == 1:
            col = '#fff6dc'
        elif y == H - 2:
            col = PAL['C']
        else:
            col = '#f6deb0'
        im.putpixel((x, y), rgb(col))
    return im


def images():
    out = {
        'cadre': cadre(), 'fenetre': fenetre(), 'plaque': plaque(), 'tube': tube(), 'pastille': pastille(),
        'coeur': grille(COEUR), 'eclair': grille(ECLAIR), 'smiley': grille(SMILEY), 'etoile': grille(ETOILE),
        'pousse': grille(POUSSE), 'piece': grille(PIECE), 'heure': heure(),
    }
    bande = Image.new('RGBA', (15 * 21, 15), (0, 0, 0, 0))
    for k in range(21):
        bande.paste(anneau(k * 5), (15 * k, 0))
    out['anneau'] = bande
    bande = Image.new('RGBA', (PORTRAIT * 21, PORTRAIT), (0, 0, 0, 0))
    for k in range(21):
        bande.paste(portrait(k * 5), (PORTRAIT * k, 0))
    out['portrait'] = bande
    out['niveau'] = etoile_niveau()
    out['hublot'] = hublot()
    out['ruban'] = ruban()
    grandes = Image.new('RGBA', (GRANDE * 14, GRANDE), (0, 0, 0, 0))
    for k in range(14):
        grandes.paste(lune(((k + 1.5) / 14) % 1, GRANDE, 10.2), (GRANDE * k, 0))
    out['lunes'] = grandes
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
