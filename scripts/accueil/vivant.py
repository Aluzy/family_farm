#!/usr/bin/env python3
"""L'écran d'accueil vivant (js/ui/ecran-titre.js) : la capture de la grande ferme
(assets/accueil_ferme.webp, une capture du jeu au zoom 1, sans perte), préparée pour être animée.

On efface de la capture ce qui va bouger, en reconstituant ce qu'il y a dessous, et on garde à part
ce qui sera redessiné :
  - la voilure du Moulin : les ailes ôtées, le toit et la façade refaits en recopiant leurs rangées
    (leurs motifs se répètent tous les 8 px) ; la page redessine la voilure du jeu
    (js/carte/ferme/moulin.js), qui tourne, sur le moyeu (MOULIN) ;
  - le chat devant la clôture : ôté (la clôture se répète tous les 16 px) ; la page le fait marcher,
    s'asseoir, faire sa toilette (assets/chat.png, les images du jeu) ;
  - les têtes des tournesols : chacune découpée (assets/accueil/tetes.png), ôtée (la tige et les
    feuilles prolongées dessous) ; la page les balance au vent.

Écrit assets/accueil/fond.webp (sans perte), assets/accueil/tetes.png et
js/ui/accueil-vivant.generated.js (les positions). Usage : python3 scripts/accueil/vivant.py
"""
import json
import math
import os

from PIL import Image

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CAPTURE = os.path.join(RACINE, 'assets', 'accueil_ferme.webp')
SORTIE = os.path.join(RACINE, 'assets', 'accueil')
JS = os.path.join(RACINE, 'js', 'ui', 'accueil-vivant.generated.js')

MOULIN = (1720, 496)                 # le moyeu de la voilure
TOUR = (1681, 1759)                  # les colonnes de la tour du Moulin (le toit, la façade)
CHAT_ZONE = (1770, 455, 1830, 485)   # où chercher le chat de la capture
PARTERRES = [(1460, 440, 1534, 552), (1588, 440, 1664, 552)]   # les tournesols


def charger():
    return Image.open(CAPTURE).convert('RGB')


def recopier(px, o, masque, periode, x0, x1, seuil=110):
    """Chaque pixel du masque reprend celui de sa rangée, `periode` px plus loin (ou 2, 3… fois), hors
    du masque, entre les colonnes x0 et x1 ; d'abord pas trop sombre (un contour), sinon n'importe lequel."""
    def source(x, y, s):
        for k in range(1, 40):
            for d in (periode * k, -periode * k):
                xs = x + d
                if x0 <= xs <= x1 and (xs, y) not in masque and sum(px[xs, y]) >= s:
                    return px[xs, y]
        return None
    for (x, y) in masque:
        c = source(x, y, seuil) or source(x, y, 0)
        if c:
            o[x, y] = c


def masque_voilure():
    hx, hy = MOULIN
    m = set()
    for y in range(hy - 38, hy + 39):
        for x in range(hx - 38, hx + 39):
            dx, dy = x - hx, y - hy
            d = math.hypot(dx, dy)
            if d <= 7:
                m.add((x, y))
            elif d <= 37 and any(abs(-dx * math.sin(a) + dy * math.cos(a)) <= 11.5 for a in (math.pi / 4, -math.pi / 4)):
                m.add((x, y))
    return m


def trouver_chat(im):
    """La case du chat (assets/chat.png, l'image 0 : debout) dans CHAT_ZONE : (x, y) de son coin."""
    chat = Image.open(os.path.join(RACINE, 'assets', 'chat.png')).convert('RGBA').crop((0, 0, 16, 16))
    cp = chat.load()
    opaques = [(x, y, cp[x, y][:3]) for y in range(16) for x in range(16) if cp[x, y][3] > 0]
    px = im.load()
    x0, y0, x1, y1 = CHAT_ZONE
    # (le plus ressemblant : un pixel peut différer, là où il touche la clôture)
    score, x, y = max((sum(px[x + a, y + b] == c for a, b, c in opaques), x, y)
                      for y in range(y0, y1 - 15) for x in range(x0, x1 - 15))
    if score < 0.95 * len(opaques):
        raise SystemExit('le chat de la capture est introuvable')
    return (x, y), {(x + a, y + b) for a, b, _ in opaques}


# Le tournesol mûr de assets/crops.png (rangée, colonne d'une case de 16 × 32) et sa tête : les rangées 0 à 12 du
# dessin, et la 13 jusqu'à la tige (colonnes 4 à 8 ; plus loin, une feuille)
TOURNESOL = (13, 3)
TETE = lambda a, b: b <= 12 or (b == 13 and 4 <= a <= 8)


def tetes(im):
    """Les têtes des tournesols mûrs (le dessin du jeu reconnu dans la capture, sur la grille de 16 px) :
    [(x, y, l, h, pixels {(x, y): couleur})], les seuls pixels de la tête que la capture montre."""
    # (la source des cultures, dans la disposition d'origine : assets/crops.png est rangée autrement, planche_cultures.py)
    cr = Image.open(os.path.join(RACINE, 'scripts', 'carte', 'sources', 'cultures.png')).convert('RGBA')
    r, c = TOURNESOL
    fp = cr.crop((c * 16, r * 32, c * 16 + 16, r * 32 + 32)).load()
    op = [(a, b, fp[a, b][:3]) for b in range(32) for a in range(16) if fp[a, b][3] > 0]
    px = im.load()
    out = []
    for (x0, y0, x1, y1) in PARTERRES:
        for y in range(y0, y1 - 31):
            for x in range(x0, x1 - 15):
                if sum(px[x + a, y + b] == col for a, b, col in op) < 0.9 * len(op):
                    continue
                pts = {(x + a, y + b): col for a, b, col in op if TETE(a, b) and px[x + a, y + b] == col}
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                out.append((min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1, pts))
    return out


def boucher_dessous(px, o, masque):
    """Chaque pixel du masque reprend le premier pixel hors du masque en dessous (la tige, les feuilles)."""
    for (x, y) in masque:
        yy = y + 1
        while (x, yy) in masque:
            yy += 1
        o[x, y] = px[x, yy]


def main():
    im = charger()
    px = im.load()
    fond = im.copy()
    o = fond.load()
    # la voilure du Moulin
    recopier(px, o, masque_voilure(), 8, *TOUR)
    # le chat
    (cx, cy), chat = trouver_chat(im)
    recopier(px, o, chat, 16, CHAT_ZONE[0] - 40, CHAT_ZONE[2] + 40)
    # les têtes des tournesols
    T = tetes(im)
    toutes = set()
    for *_, pts in T:
        toutes |= set(pts)
    boucher_dessous(px, o, toutes)
    os.makedirs(SORTIE, exist_ok=True)
    fond.save(os.path.join(SORTIE, 'fond.webp'), lossless=True, quality=100, method=6)
    # la planche des têtes, côte à côte
    larg = sum(t[2] for t in T)
    haut = max(t[3] for t in T)
    planche = Image.new('RGBA', (larg, haut), (0, 0, 0, 0))
    pp = planche.load()
    sx = 0
    infos = []
    for (x, y, l, h, pts) in T:
        for (a, b), c in pts.items():
            pp[sx + a - x, b - y] = c + (255,)
        infos.append({'x': x, 'y': y, 'l': l, 'h': h, 'sx': sx})
        sx += l
    planche.save(os.path.join(SORTIE, 'tetes.png'))
    doc = {
        'taille': list(im.size),
        'moulin': list(MOULIN),
        'chat': {'x': cx, 'y': cy},
        'tetes': infos,
    }
    with open(JS, 'w', encoding='utf-8') as f:
        f.write('// Écrit par scripts/accueil/vivant.py : ne pas modifier à la main.\n')
        f.write(f'export const VIVANT = {json.dumps(doc, ensure_ascii=False)};\n')
    print(f'assets/accueil/fond.webp, tetes.png ({len(T)} têtes), chat en {cx},{cy} ; {os.path.relpath(JS, RACINE)}')


if __name__ == '__main__':
    main()
