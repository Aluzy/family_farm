#!/usr/bin/env python3
"""Contrôle qualité des sprites — style pastoral 16x16, seuils calés sur les planches sources.
Usage : python qa_sprites.py palette_pastorale.hex sprite1.png [sprite2.png ...]
Nom de fichier attendu : <classe>_<famille>_<nom>_<L>x<H>[_vN].png
  classe  : tuile | relief | micro | culture | icone | animal | objet | arbre | batiment
  famille : construit | organique | feuillage | terrain | transition | verre
Code de sortie : 0 si tous les sprites passent, 1 sinon."""
import re, sys
import numpy as np
from PIL import Image

BUDGET = {"tuile": 10, "relief": 18, "micro": 12, "culture": 14, "icone": 16, "animal": 16, "objet": 10, "arbre": 18, "batiment": 32}
OMBRES = {(44, 15, 40, 105), (90, 43, 30, 131)}        # S0 prune à 41 %, S2 brun à 51 % : seuls pixels semi-transparents admis
VOLUME = ("objet", "arbre", "batiment")                # classes soumises aux tests de lumière, de contour et de pixels isolés
NOM = re.compile(r"^(tuile|relief|micro|culture|icone|animal|objet|arbre|batiment)_(construit|organique|feuillage|terrain|transition|verre)_[a-z0-9-]+_(\d+)x(\d+)(_v\d+)?\.png$")

def lire_palette(chemin):
    return {tuple(int(l[i:i + 2], 16) for i in (0, 2, 4)) for l in open(chemin).read().split() if l}

def controler(chemin, palette):
    erreurs, nom = [], chemin.replace("\\", "/").split("/")[-1]
    m = NOM.match(nom)
    if not m:
        return ["nom de fichier non conforme"]
    classe, famille, L, H = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
    px = np.asarray(Image.open(chemin).convert("RGBA")).astype(int)
    h, w = px.shape[:2]
    rgb, alpha = px[..., :3], px[..., 3]
    opaque = alpha == 255
    # 1. Gabarit
    if (w, h) != (L, H): erreurs.append(f"taille {w}x{h} différente du nom {L}x{H}")
    if w % 16 or h % 16: erreurs.append("gabarit non multiple de 16")
    # 2. Alpha binaire, sauf les deux ombres de contact
    semi = (alpha > 0) & (alpha < 255)
    if any(tuple(p) not in OMBRES for p in np.unique(px[semi], axis=0)): erreurs.append("pixels semi-transparents hors ombres S0 et S2")
    # 3. Palette fermée
    couleurs = {tuple(c) for c in np.unique(rgb[opaque], axis=0)}
    hors = couleurs - palette
    if hors: erreurs.append("hors palette : " + ", ".join("#%02X%02X%02X" % c for c in sorted(hors)[:5]))
    # 4. Budget de couleurs
    if len(couleurs) > BUDGET[classe]: erreurs.append(f"{len(couleurs)} couleurs, budget {BUDGET[classe]} pour la classe {classe}")
    # 5. Damier : toléré jusqu'à 3x3, interdit à partir de 4x4
    idx = np.where(opaque, rgb[..., 0] * 65536 + rgb[..., 1] * 256 + rgb[..., 2], -1)
    a, b, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, :-1], idx[1:, 1:]
    dam = (a == d) & (b == c) & (a != b) & (a >= 0) & (b >= 0)
    if h >= 4 and w >= 4 and np.logical_and.reduce([dam[i:h - 3 + i, j:w - 3 + j] for i in range(3) for j in range(3)]).any(): erreurs.append("damier de 4x4 ou plus")
    # 6. Raccord des tuiles de remplissage : la couture ne tranche pas plus que l'intérieur
    if famille == "terrain" and opaque.all():
        dx = np.abs(np.diff(rgb, axis=1)).sum(axis=2).mean(); dy = np.abs(np.diff(rgb, axis=0)).sum(axis=2).mean()
        cx = np.abs(rgb[:, 0] - rgb[:, -1]).sum(axis=1).mean(); cy = np.abs(rgb[0] - rgb[-1]).sum(axis=1).mean()
        if cx > 1.5 * dx + 8 or cy > 1.5 * dy + 8: erreurs.append("couture visible au raccord")
    if classe in ("tuile", "relief") or not opaque.any():
        return erreurs
    ys, xs = np.nonzero(opaque)
    # 7. Ancrage
    vide = h - 1 - np.nonzero(alpha > 0)[0].max()
    if classe == "culture":
        if not 3 <= h - 1 - ys.max() <= 7: erreurs.append("pied de culture hors des rangées 9 à 12 de la case")
    elif classe != "icone":
        if vide > 1: erreurs.append("plus d'une rangée vide sous le sprite")
        if classe in VOLUME and abs((xs.min() + xs.max()) / 2 - (w - 1) / 2) > 3: erreurs.append("sprite décentré de plus de 3 px")
    if classe not in VOLUME:
        return erreurs
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    # 8. Lumière en haut à gauche, sur les volumes compacts d'une seule matière
    compacite = opaque.sum() / ((xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))
    if famille in ("organique", "feuillage") and compacite >= 0.4:
        poids = lum[opaque] - lum[opaque].min()
        if poids.sum() > 0:
            dxy = (xs * poids).sum() / poids.sum() - xs.mean() + (ys * poids).sum() / poids.sum() - ys.mean()
            if dxy > 0: erreurs.append(f"lumière mal orientée (décalage {dxy:+.2f} px sur l'axe haut-gauche)")
    # 9. Contour : part du pourtour prise dans les 30 % les plus sombres du sprite
    p = np.pad(opaque, 1); bord = opaque & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    sombre = lum <= np.percentile(lum[opaque], 30)
    yy, xx = np.nonzero(bord); eclaire = (xx - xs.mean()) + (yy - ys.mean()) < 0
    tout, cote_lum, cote_ombre = sombre[bord].mean(), sombre[bord][eclaire].mean(), sombre[bord][~eclaire].mean()
    if famille == "construit" and tout < 0.45: erreurs.append(f"contour trop clair ({tout:.0%} du pourtour)")
    if famille in ("organique", "feuillage"):
        seuil = 0.60 if famille == "organique" else 0.40
        if cote_ombre < seuil: erreurs.append(f"bord d'ombre insuffisant ({cote_ombre:.0%})")
        if cote_lum >= cote_ombre: erreurs.append("bord éclairé aussi cerné que le bord d'ombre")
    # 10. Pixels isolés
    pad = np.pad(idx, 1, constant_values=-2)
    seul = (pad[1:-1, 1:-1] != pad[:-2, 1:-1]) & (pad[1:-1, 1:-1] != pad[2:, 1:-1]) & (pad[1:-1, 1:-1] != pad[1:-1, :-2]) & (pad[1:-1, 1:-1] != pad[1:-1, 2:])
    part, plafond = seul[opaque].mean(), 0.15 if famille in ("construit", "verre") else 0.30
    if part > plafond: erreurs.append(f"{part:.0%} de pixels isolés (plafond {plafond:.0%})")
    return erreurs

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    palette, echecs = lire_palette(sys.argv[1]), 0
    for chemin in sys.argv[2:]:
        erreurs = controler(chemin, palette)
        echecs += bool(erreurs)
        print(("REJET  " if erreurs else "OK     ") + chemin + "".join("\n         - " + e for e in erreurs))
    sys.exit(1 if echecs else 0)
