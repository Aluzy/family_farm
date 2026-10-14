# Bordures de l'eau (toutes les rives), à partir d'une seule tuile modèle (16 × 16).
#
#   python3 scripts/carte/bordure_eau.py            écrit assets/bordure_eau.png et .tsx
#   python3 scripts/carte/bordure_eau.py --apercu   écrit aussi apercu_bordure_eau.png
#
# Modèle : scripts/carte/originaux/bordure_eau.png — une rive vue en 3/4, la terre au-dessus et
# l'eau en dessous : le dessus de la terre (sable), la berge qui descend (liseré clair en haut,
# texture ocre), une ligne d'écume blanche festonnée aux deux bouts, puis l'eau (transparente).
#
# assets/bordure_eau_herbe.png : les mêmes rives bordées d'herbe (une rangée de 16 tuiles par
# teinte d'herbe de herbe_chemin, la tuile n au rang n de sa rangée). La berge haute y est une
# courte berge de terre (FACE), qui s'arrondit à ses bouts ; les flancs sont d'herbe sombre.
# La planche : 16 tuiles (4 × 4), une par combinaison de coins terre / eau (« coins de Wang ») :
# la tuile n a de la terre au coin haut-gauche si n & 8, haut-droit si n & 4, bas-gauche si
# n & 2, bas-droit si n & 1. La tuile 15 est la terre pleine, la tuile 0 l'eau (vide). Elles se
# posent sur un calque d'eau : l'eau est transparente.
#
# La perspective est celle du modèle (vue de 3/4, lumière en haut à gauche) :
#   - rive sud (la terre au-dessus de l'eau) : la berge haute du modèle, puis l'écume et une
#     bande d'eau claire (peu profonde) à son pied ;
#   - rive nord (l'eau au-dessus de la terre) : on ne voit que le bord du dessus, un liseré clair ;
#   - rives est et ouest : un flanc étroit, clair à l'ouest (vers la lumière), sombre à l'est ;
#   - partout : le sable mouillé au bord, quelques cailloux, l'écume, puis une seconde ligne
#     d'écume en pointillé un peu plus loin dans l'eau.
# Autour d'un coin isolé (une avancée de terre, une anse), la rive est une courbe (quart
# d'ellipse) : le contour de l'eau est arrondi, pas en escalier.
# Raccords : la rive croise chaque côté d'une tuile toujours au même endroit (selon que la terre
# est en haut ou en bas, à gauche ou à droite), et la texture de la berge dépend de la colonne :
# deux tuiles qui partagent un côté se rejoignent.
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MODELE = os.path.join(ROOT, 'scripts', 'carte', 'originaux', 'bordure_eau.png')
SORTIE = os.path.join(ROOT, 'assets', 'bordure_eau')
T = 16

SABLE = (232, 186, 15)        # le dessus de la terre
LISERE = (245, 214, 92)       # le bord du dessus, éclairé
ECUME = (255, 255, 255)
FLANC_CLAIR = [(232, 186, 15), (218, 173, 14)]     # flanc ouest (vers la lumière)
FLANC_SOMBRE = [(162, 129, 10), (134, 106, 8)]     # flanc est (dans l'ombre)
BORD_NORD = (204, 162, 13)    # rive nord : l'arête du dessus, sous le liseré
# Rive sud : l'eau commence à la rangée EAU_SUD - FESTON[x] (le feston du modèle aux deux bouts).
EAU_SUD = 12                  # deux rangées plus haut que le modèle : l'eau claire tient dessous
FESTON = [2, 1, 1] + [0] * 11 + [1, 2]
# Rive nord : l'eau occupe les rangées < EAU_NORD. Rives est et ouest : les colonnes >= EAU_EST
# et < EAU_OUEST.
# Au milieu des côtés : une rive en diagonale ondule doucement au lieu de faire des marches.
# Seule la rive sud passe plus bas : la berge haute du modèle doit tenir au-dessus de l'eau.
EAU_NORD = 8
EAU_EST = 8
EAU_OUEST = 8
BERGE = 12                    # hauteur de la berge du modèle (rangées 2 à 13)
# Rive d'herbe : une berge de terre de FACE pixels (du ras de l'eau vers le haut : du plus
# sombre au plus clair), plus basse vers ses bouts (ARRONDI : à 1, 2, 3 colonnes du bout).
TERRE = [(66, 44, 26), (92, 62, 34), (114, 80, 42), (132, 96, 50), (146, 110, 56)]
FACE = 5
ARRONDI = [1, 3, 4]
MOUILLE = (214, 168, 14)      # le sable mouillé, au bord de l'eau
CAILLOU, CAILLOU_OMBRE = (214, 200, 168), (150, 120, 40)
CLAIRE = (196, 226, 236, 150)  # l'eau peu profonde au pied de la berge (posée sur l'eau)
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def berge(modele):
    """La texture de la berge : les rangées 2 à 13 du modèle. Aux deux bouts, le feston y met de
    l'écume ou du vide : ces cases prennent la couleur de la berge juste au-dessus."""
    tex = []
    for k in range(BERGE):
        ligne = []
        for x in range(T):
            p = modele.getpixel((x, 2 + k))
            ligne.append(tex[k - 1][x] if (p[3] == 0 or p[:3] == ECUME) else p[:3])
        tex.append(ligne)
    return tex


def passages(n):
    """Où la rive croise chaque côté de la tuile n. Le long d'un côté horizontal, elle dépend
    de ce qui est à gauche et à droite ; le long d'un côté vertical, de ce qui est en haut et
    en bas : deux tuiles qui partagent un côté le voient de la même façon."""
    tl, tr, bl, br = [(n >> k) & 1 for k in (3, 2, 1, 0)]           # 1 = terre
    hx = lambda g, d: EAU_EST if g and not d else EAU_OUEST           # terre à gauche : l'eau dès EAU_EST
    vy = lambda h, b, x: EAU_SUD - FESTON[x] if h and not b else EAU_NORD
    return {
        'haut': hx(tl, tr) if tl != tr else None, 'bas': hx(bl, br) if bl != br else None,
        'gauche': vy(tl, bl, 0) if tl != bl else None, 'droite': vy(tr, br, T - 1) if tr != br else None,
    }


def eau(n):
    """Masque de l'eau de la tuile n. Une rive droite quand deux coins voisins sont de l'eau
    (ou de la terre) ; autour d'un coin isolé (le seul de sa sorte, ou deux en diagonale), une
    rive courbe en quart d'ellipse, du passage sur un côté au passage sur l'autre."""
    tl, tr, bl, br = coins = [(n >> k) & 1 for k in (3, 2, 1, 0)]
    P = passages(n)
    terre = sum(coins)
    m = [[not coins[(y >= 8) * 2 + (x >= 8)] for x in range(T)] for y in range(T)]
    if terre in (0, 4):
        return m
    # les coins isolés : la sorte la moins nombreuse (l'eau, à égalité : la terre reste d'un tenant)
    isole = 1 if terre == 1 else 0 if terre == 3 else (0 if tl == br else None)
    if isole is None:
        # deux coins voisins de chaque sorte : une rive droite
        for y in range(T):
            for x in range(T):
                if P['gauche'] is not None:               # rive horizontale (terre en haut ou en bas)
                    lim = EAU_SUD - FESTON[x] if tl else EAU_NORD
                    m[y][x] = (y >= lim) if tl else (y < lim)
                else:                                     # rive verticale
                    m[y][x] = (x >= EAU_EST) if tl else (x < EAU_OUEST)
        return m
    p = 2.3
    for y in range(T):
        for x in range(T):
            dedans = False
            for k, (cx, cy) in enumerate(((0, 0), (T, 0), (0, T), (T, T))):
                if coins[k] != isole:
                    continue
                ex = P['haut'] if cy == 0 else P['bas']
                ey = P['gauche'] if cx == 0 else P['droite']
                rx, ry = abs(ex - cx), abs(ey - cy)
                d = (abs(x + 0.5 - cx) / rx) ** p + (abs(y + 0.5 - cy) / ry) ** p
                if d <= 1:
                    dedans = True
            m[y][x] = dedans if isole == 0 else not dedans
    return m


def tuile(n, tex, sol=None):
    """La tuile n : le masque de l'eau, puis la terre (sable, berge, flancs, bord mouillé,
    cailloux) et l'eau (écume, seconde ligne d'écume, eau claire au pied de la berge).
    sol : None (le sable du modèle) ou une herbe {'herbe': image 16 × 16, 'mouille', 'lisere',
    'bord'} : le dessus de la terre est alors cette herbe, son bord plus sombre au contact."""
    m = eau(n)
    dessus = (lambda x, y: sol['herbe'].getpixel((x, y))[:3]) if sol else (lambda x, y: SABLE)
    mouille = sol['mouille'] if sol else MOUILLE
    lisere = sol['lisere'] if sol else LISERE
    bord_nord = sol['bord'] if sol else BORD_NORD
    flanc_clair = sol['flanc'] if sol else FLANC_CLAIR
    flanc_sombre = sol['flanc_sombre'] if sol else FLANC_SOMBRE

    def face(x, yeau):
        """Hauteur de la berge de la rive d'herbe à la colonne x (l'eau commence à la rangée
        yeau) : FACE au milieu, plus basse vers ses bouts (là où la colonne voisine n'a plus
        d'eau dessous), pour que l'herbe s'arrondisse sur la berge au lieu d'un angle droit.
        Hors de la tuile, on prolonge sa colonne du bord."""
        eau_dessous = lambda cx: any(W(min(T - 1, max(0, cx)), yeau - 1 + j) for j in range(1, 3))
        for d in range(1, len(ARRONDI) + 1):
            if not eau_dessous(x - d) or not eau_dessous(x + d):
                return ARRONDI[d - 1]
        return FACE
    out = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    W = lambda x, y: m[y][x] if 0 <= x < T and 0 <= y < T else None
    pres = lambda x, y, r: any(W(x + dx, y + dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1))
    berge_px = set()
    for y in range(T):
        for x in range(T):
            if m[y][x]:
                continue
            c = dessus(x, y)
            # berge : de l'eau juste en dessous, à moins de BERGE pixels (la rangée de texture
            # suit la rangée du modèle : le feston relève l'eau, pas la berge)
            k = next((k for k in range(1, BERGE + 1) if W(x, y + k)), None)
            if sol and k is not None and k <= face(x, y + k) and (k > 2 or not (W(x - 1, y) or W(x + 1, y))):
                # rive d'herbe : une courte berge de terre, plus sombre au ras de l'eau
                i = min(len(TERRE) - 1, (k - 1) * len(TERRE) // FACE)
                if (x * 3 + k * 5 + n) % 7 == 0 and i:
                    i -= 1
                c = TERRE[i]
                berge_px.add((x, y))
            elif not sol and k is not None and BERGE - k - FESTON[x] >= 0 and (k > 2 or not (W(x - 1, y) or W(x + 1, y))):
                c = tex[BERGE - k - FESTON[x]][x]
                berge_px.add((x, y))
            elif W(x + 1, y) or W(x + 2, y):
                c = flanc_sombre[0 if W(x + 2, y) and not W(x + 1, y) else 1]      # flanc est
            elif W(x - 1, y) or W(x - 2, y):
                c = flanc_clair[1 if W(x - 1, y) else 0]                          # flanc ouest
            elif W(x, y - 1):
                c = lisere                                                         # rive nord
            elif W(x, y - 2):
                c = bord_nord
            elif pres(x, y, 1):
                c = mouille                                                        # bord mouillé
            elif pres(x, y, 4) and (x * 7 + y * 13 + n * 5) % 23 == 0 and 1 <= x < T - 2 and 1 <= y < T - 2:
                out.putpixel((x + 1, y + 1), CAILLOU_OMBRE + (255,))               # un caillou
                c = CAILLOU
            if out.getpixel((x, y))[3] == 0 or c != dessus(x, y):
                out.putpixel((x, y), c + (255,))
    # l'eau : écume au contact, puis un anneau d'eau peu profonde (plus claire, tramée), puis
    # une seconde ligne d'écume en pointillé ; sous la berge, l'eau claire est plus large
    terre_px = [(x, y) for y in range(T) for x in range(T) if not m[y][x]]
    for y in range(T):
        for x in range(T):
            if not m[y][x]:
                continue
            if any(W(x + dx, y + dy) is False for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), ECUME + (255,))
                continue
            d = min((max(abs(x - a), abs(y - b)) for a, b in terre_px), default=99)
            sous_berge = any((x, y - k) in berge_px for k in range(1, 5))
            if d == 2 or (sous_berge and d <= 3):
                if BAYER[y % 4][x % 4] < 12:
                    out.putpixel((x, y), CLAIRE)
            elif d == 3 or (sous_berge and d == 4):
                if BAYER[y % 4][x % 4] < 5:
                    out.putpixel((x, y), CLAIRE)
            elif d == 4 and (x + y) % 3 == 0:
                out.putpixel((x, y), ECUME[:3] + (190,))
    return out


def planche(modele):
    tex = berge(modele)
    out = Image.new('RGBA', (4 * T, 4 * T), (0, 0, 0, 0))
    for n in range(16):
        out.paste(tuile(n, tex), ((n % 4) * T, (n // 4) * T))
    return out


def planche_herbe(modele):
    """Les mêmes rives, bordées d'herbe : une rangée de 16 tuiles par teinte d'herbe de
    herbe_chemin (le dessus de la terre est une tuile d'herbe de cette teinte, le bord plus
    sombre au contact de l'eau, le liseré nord plus clair)."""
    import herbe_chemin as HC
    hc = Image.open(HC.SORTIE + '.png').convert('RGBA')
    tex = berge(modele)
    nh = len(HC.TEINTES_HERBE)
    out = Image.new('RGBA', (16 * T, nh * T), (0, 0, 0, 0))
    for h, t in enumerate(HC.TEINTES_HERBE):
        bord = HC.teinte((64, 120, 6), t)
        sombre = tuple(round(v * 0.72) for v in bord)
        sol = {'flanc': [HC.teinte((82, 137, 4), t), bord], 'flanc_sombre': [bord, sombre],
               'mouille': HC.teinte((82, 137, 4), t), 'lisere': HC.teinte((150, 238, 52), t), 'bord': bord}
        for n in range(16):
            sol['herbe'] = hc.crop((n * T, h * T, (n + 1) * T, (h + 1) * T))
            out.paste(tuile(n, tex, sol), (n * T, h * T))
    return out


def tsx(img):
    lignes = []
    for n in range(16):
        tl, tr, bl, br = [2 if (n >> k) & 1 else 1 for k in (3, 2, 1, 0)]
        lignes.append(f'   <wangtile tileid="{n}" wangid="0,{tr},0,{br},0,{bl},0,{tl}"/>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="bordure_eau" tilewidth="{T}" tileheight="{T}" tilecount="16" columns="4">
 <image source="bordure_eau.png" width="{img.width}" height="{img.height}"/>
 <wangsets>
  <wangset name="eau et terre" type="corner" tile="-1">
   <wangcolor name="eau" color="#3c96d2" tile="0" probability="1"/>
   <wangcolor name="terre" color="#e8ba0f" tile="15" probability="1"/>
{chr(10).join(lignes)}
  </wangset>
 </wangsets>
</tileset>
'''


def apercu(img):
    """Une petite carte : une mare ronde et irrégulière avec une île, sur une eau bleue,
    agrandie × 4, à côté de la planche."""
    import math
    W, H = 22, 16
    def terre(x, y):
        a = math.atan2(y - 7.5, x - 10.5)
        r = math.hypot((x - 10.5) / 1.25, y - 7.5)
        bord = 5.4 + 0.8 * math.sin(3 * a) + 0.5 * math.cos(5 * a + 1)
        ile = math.hypot(x - 12, (y - 8) * 1.2) < 2.3
        return r > bord or ile
    out = Image.new('RGBA', (W * T, H * T))
    for y in range(out.height):
        for x in range(out.width):
            v = (x * 3 + y * 7) % 23 == 0 or (x * 5 + y * 2) % 31 == 0
            out.putpixel((x, y), (120, 190, 235, 255) if v else (60, 150, 210, 255))
    for ty in range(H):
        for tx in range(W):
            n = (terre(tx, ty) << 3) | (terre(tx + 1, ty) << 2) | (terre(tx, ty + 1) << 1) | terre(tx + 1, ty + 1)
            out.alpha_composite(img.crop(((n % 4) * T, (n // 4) * T, (n % 4 + 1) * T, (n // 4 + 1) * T)), (tx * T, ty * T))
    z = 3
    a = out.resize((out.width * z, out.height * z), Image.NEAREST)
    fond = Image.new('RGBA', img.size, (60, 150, 210, 255))
    fond.alpha_composite(img)
    b = fond.resize((img.width * z * 2, img.height * z * 2), Image.NEAREST)
    res = Image.new('RGBA', (a.width + b.width + 24, max(a.height, b.height)), (40, 40, 40, 255))
    res.paste(b, (0, 0))
    res.paste(a, (b.width + 24, 0))
    return res


def main():
    modele = Image.open(MODELE).convert('RGBA')
    img = planche(modele)
    img.save(SORTIE + '.png')
    with open(SORTIE + '.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx(img))
    print('assets/bordure_eau.png : 4 × 4 tuiles ; assets/bordure_eau.tsx')
    planche_herbe(modele).save(SORTIE + '_herbe.png')
    print('assets/bordure_eau_herbe.png : les rives bordées d\'herbe, 16 tuiles par teinte d\'herbe')
    if '--apercu' in sys.argv:
        apercu(img).save(os.path.join(ROOT, 'apercu_bordure_eau.png'))
        print('apercu_bordure_eau.png')


if __name__ == '__main__':
    main()
