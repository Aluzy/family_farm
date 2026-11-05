# Les expressions du visage des personnages (chantier « couches » : docs/personnage-couches.md, étape E0).
#
# Un visage tient dans une petite zone, la même pour tous les modèles (scripts/personnage/modeles/<nom>.png,
# 12 × 79 px, voir chibi.py) : de face, les yeux sur les colonnes 3-4 et 7-8 des rangées 5-6 (le blanc dehors,
# la pupille vers le nez), la bouche de 3 px en rangée 8 (colonnes 5 à 7) ; de profil (tourné vers la droite),
# l'œil en colonnes 6-7 des rangées 5-6, la bouche en colonne 7 de la rangée 8. La rangée 4 est toujours
# couverte (frange, visière, bord du chapeau) : pas de sourcils, tout se joue dans les rangées 5 à 9.
#
# Une expression : pour chaque vue (« bas » de face, « cote » de profil ; de dos, rien), des rangées de lettres
# posées à partir de la rangée 5 (Y0), « . » laisse le pixel du modèle. Une lettre ne remplace jamais ce qui
# couvre le visage (cheveux, barbe, lunettes, couvre-chef, rousseur, contour : PROTEGE) : une mèche ou une
# barbe reste devant l'expression.
#
# Les lettres : celles de la palette des modèles (modeles.palette : k la peau, d et m ses ombres, l les lèvres,
# P les joues, g et i le blanc des yeux, h et j la pupille) et quatre de plus : L un trait sombre (cils,
# paupière), M la bouche marquée (les lèvres, plus sombres : une bouche qui bouge doit se voir), O la bouche
# ouverte, N une larme. Le blanc, la pupille, la peau et les lèvres sont relevés sur le
# modèle lui-même (les modèles retouchés à la main ont leurs propres teintes).
#
#   python3 scripts/personnage/expressions.py   écrit apercu_expressions.png (les têtes, agrandies) et
#                                               apercu_expressions_jeu.png (les personnages en pied, à
#                                               l'échelle d'un téléphone) à la racine du dépôt
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import modeles  # noqa: E402
from modeles import CONTOUR, DEBUT, DOSSIER, mul, palette  # noqa: E402

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
Y0 = 5

# L'ordre est celui des maquettes ; « fermes » est le clignement et le sommeil (les mêmes pixels que les
# yeux fermés de chibi.py, Modele.yeux_fermes).
EXPRESSIONS = {
    'neutre': {
        'bas': [],
        'cote': [],
    },
    'fermes': {
        'bas': ['...kk..kk...',
                '...LL..LL...'],
        'cote': ['......kk....',
                 '......LL....'],
    },
    'joie': {
        'bas': ['............',
                '............',
                '....M...M...',
                '.....MMM....'],
        'cote': ['............',
                 '............',
                 '......M.....',
                 '.......M....'],
    },
    'rire': {
        'bas': ['...LL..LL...',
                '...kk..kk...',
                '..P......P..',
                '....lOOOl...',
                '.....ll.....'],
        'cote': ['......LL....',
                 '......kk....',
                 '.....P......',
                 '.......OO...'],
    },
    'colere': {
        'bas': ['...gL..Lg...',
                '............',
                '............',
                '.....LLL....'],
        'cote': ['.......L....',
                 '............',
                 '............',
                 '.......L....'],
    },
    'tristesse': {
        'bas': ['...Lh..hL...',
                '............',
                '...N........',
                '.....MMM....',
                '....M...M...'],
        'cote': ['......Lh....',
                 '............',
                 '......N.....',
                 '......MM....'],
    },
    'peur': {
        'bas': ['...gg..gg...',
                '............',
                '............',
                '.....kOk....',
                '......O.....'],
        'cote': ['......gg....',
                 '............',
                 '............',
                 '.......O....'],
    },
    'fatigue': {
        'bas': ['...mm..mm...',
                '............',
                '...dd..dd...'],
        'cote': ['......mm....',
                 '............',
                 '......d.....'],
    },
    'concentre': {
        'bas': ['...LL..LL...',
                '............',
                '............',
                '.....kMMM...'],
        'cote': ['......LL....',
                 '............',
                 '............',
                 '.......kM...'],
    },
}

# Ce qui couvre le visage et que l'expression ne remplace jamais (lettres de modeles.palette)
PROTEGE = 'BCDERQHVSTUGXYW'

# Où relever les teintes de chaque modèle, de face : (x, y)
RELEVES = {'g': (3, 5), 'i': (3, 6), 'h': (4, 5), 'j': (4, 6), 'k': (5, 7), 'l': (6, 8)}


def vue(px, v):
    """Les pixels d'une vue du modèle : {(x, y): (r, g, b)} (rangées 0..24, transparents exclus)."""
    y0 = DEBUT[v]
    return {(x, y): px[x, y0 + y][:3] for y in range(25) for x in range(12) if px[x, y0 + y][3]}


def couleurs(face, d, i):
    """Les couleurs des lettres d'une expression pour ce modèle : la palette du catalogue, le blanc, la
    pupille, la peau et les lèvres relevés sur le modèle, et les trois lettres propres aux expressions."""
    c = dict(palette(d, i))
    for lettre, p in RELEVES.items():
        if p in face:
            c[lettre] = face[p]
    lum = lambda t: sum(t) / 3
    pupille = min((c['h'], c['j']), key=lum)
    c['L'] = mul(pupille, 0.85) if lum(pupille) < 90 else (54, 36, 24)    # comme Modele.yeux_fermes (chibi.py)
    c['M'] = mul(c['l'], 0.78)
    c['O'] = (92, 30, 34)
    c['N'] = (140, 200, 245)
    return c


def protegees(d, i):
    pal = palette(d, i)
    return {pal[k] for k in PROTEGE if k in pal} | {CONTOUR}


def appliquer(pixels, nom_expr, v, c, prot):
    """La vue `pixels` avec l'expression posée (une copie)."""
    out = dict(pixels)
    for r, rang in enumerate(EXPRESSIONS[nom_expr].get(v, [])):
        for x, ch in enumerate(rang):
            p = (x, Y0 + r)
            if ch == '.' or p not in out or out[p] in prot:
                continue
            out[p] = c[ch]
    return out


def image(pixels, w=12, h=25):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for (x, y), col in pixels.items():
        if 0 <= x < w and 0 <= y < h:
            im.putpixel((x, y), col + (255,))
    return im


# ---------- les maquettes ----------
# Des personnages choisis pour couvrir les cas difficiles : un modèle retouché à la main (perso_01, la
# fermière), frange, couettes et rousseur, moustache, lunettes, barbe sous un chapeau de paille, peaux
# foncées, boucles d'oreilles, enfants.
TEMOINS = ['perso_01', 'perso_02', 'perso_07', 'perso_05', 'perso_12', 'perso_20', 'perso_29', 'enfant_01', 'enfant_04']
FOND = (126, 170, 92)
TITRES = {'neutre': 'neutre', 'fermes': 'yeux fermés', 'joie': 'joie', 'rire': 'rire', 'colere': 'colère',
          'tristesse': 'tristesse', 'peur': 'peur', 'fatigue': 'fatigue', 'concentre': 'concentré'}


def police(taille):
    for chemin in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(chemin, taille)
        except OSError:
            pass
    return ImageFont.load_default()        # (sans police à accents : les titres en perdent)


def charger():
    desc = {n: (d, i) for i, (n, d) in enumerate(modeles.tous())}
    out = []
    for nom in TEMOINS:
        d, i = desc[nom]
        px = Image.open(os.path.join(DOSSIER, nom + '.png')).convert('RGBA').load()
        face, profil = vue(px, 'bas'), vue(px, 'cote')
        out.append((nom, face, profil, couleurs(face, d, i), protegees(d, i)))
    return out


def apercu_tetes(persos, zoom=8):
    """Les têtes (rangées 0..11), de face et de profil, une rangée par personnage, une colonne par expression."""
    noms = list(EXPRESSIONS)
    cw, ch, marge, gauche, haut = 12 + 1 + 12, 12, 4, 10, 4
    W = gauche + len(noms) * (cw + marge)
    H = haut + len(persos) * (ch + marge)
    im = Image.new('RGBA', (W, H), FOND + (255,))
    for r, (nom, face, profil, c, prot) in enumerate(persos):
        for k, e in enumerate(noms):
            x0, y0 = gauche + k * (cw + marge), haut + r * (ch + marge)
            im.alpha_composite(image(appliquer(face, e, 'bas', c, prot), 12, 12), (x0, y0))
            im.alpha_composite(image(appliquer(profil, e, 'cote', c, prot), 12, 12), (x0 + 13, y0))
    big = im.resize((W * zoom, H * zoom), Image.NEAREST)
    # les titres : le nom de l'expression au-dessus de sa colonne, le personnage à gauche de sa rangée
    titre = Image.new('RGBA', (W * zoom, 40), FOND + (255,))
    g = ImageDraw.Draw(titre)
    f = police(22)
    for k, e in enumerate(noms):
        g.text(((gauche + k * (cw + marge)) * zoom, 8), TITRES[e], fill=(20, 30, 14), font=f)
    out = Image.new('RGBA', (W * zoom, H * zoom + 40), FOND + (255,))
    out.alpha_composite(titre, (0, 0))
    out.alpha_composite(big, (0, 40))
    g = ImageDraw.Draw(out)
    f2 = police(14)
    for r, (nom, *_rest) in enumerate(persos):
        g.text((4, 40 + (haut + r * (ch + marge)) * zoom + 2), nom.replace('_', ' '), fill=(20, 30, 14), font=f2)
    return out


def apercu_jeu(persos, zoom=3):
    """Les personnages en pied, de face, dans leur case de 16 × 32 (posés comme sur la carte), à l'échelle
    d'un téléphone (× 3) : l'expression se lit-elle à cette taille ?"""
    noms = list(EXPRESSIONS)
    W, H = 16 * len(noms) + 4, 32 * 2 * len(persos[:4]) + 4
    im = Image.new('RGBA', (W, H), FOND + (255,))
    for r, (nom, face, profil, c, prot) in enumerate(persos[:4]):
        for k, e in enumerate(noms):
            im.alpha_composite(image(appliquer(face, e, 'bas', c, prot)), (2 + k * 16 + 2, 2 + r * 64 + 7))
            im.alpha_composite(image(appliquer(profil, e, 'cote', c, prot)), (2 + k * 16 + 2, 2 + r * 64 + 32 + 7))
    return im.resize((W * zoom, H * zoom), Image.NEAREST)


def main():
    persos = charger()
    apercu_tetes(persos).save(os.path.join(RACINE, 'apercu_expressions.png'))
    apercu_jeu(persos).save(os.path.join(RACINE, 'apercu_expressions_jeu.png'))
    print('apercu_expressions.png, apercu_expressions_jeu.png écrits à la racine du dépôt')


if __name__ == '__main__':
    main()
