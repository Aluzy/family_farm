#!/usr/bin/env python3
"""Assemble les atlas de la carte (piste 4 du chantier « allègement », docs/chantier-allegement.md).

Usage (depuis la racine du dépôt) : python3 scripts/carte/atlas.py

Rien n'est dessiné ici : chaque petite image de assets/ reste la source (ses scripts la refont comme avant),
et ce script la recopie, telle quelle, dans une planche :
  assets/atlas_ferme.png    les petites planches chargées avec la carte (les compagnons, les bêtes, le
                            cheval, le puits, la citerne, le robot, les arbres du verger…)
  assets/atlas_meubles.png  ce qui est chargé après que la carte a paru (chargerTard) : les meubles (leurs
                            vues de face, de dos, de profil, les draps), les bêtes du grand monde, les bacs
  js/carte/atlas.generated.js  la table : fichier → [atlas, x, y, largeur, hauteur], et l'empreinte de
                            chaque source (tests/engine/atlas.test.mjs vérifie que les atlas sont à jour)

Chaque image garde son bord : une bordure de 1 px qui répète ses pixels du bord (comme le « clamp » de la
carte graphique sur une image seule : au zoom non entier, rien de la voisine ne déborde). Les atlas font au
plus 2 048 px de côté (les téléphones d'entrée de gamme). Une planche découpée (spritesheet) entre entière :
ses cases restent collées comme dans son fichier, la scène la redécoupe (js/carte/kit.js, K.atlas).
Relancer après avoir refait une des images (le test le rappelle).
"""
import glob
import hashlib
import json
import os

from PIL import Image

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ASSETS = os.path.join(RACINE, 'assets')
TABLE = os.path.join(RACINE, 'js', 'carte', 'atlas.generated.js')
COTE = 2048
BORD = 1

# (pas dans un atlas : les planches lues pixel par pixel à leurs coordonnées propres (les tuiles, les sols,
# crops, terre_bords, terre_serre), les grandes (blocs, murs, clôtures) et les personnages, chargés à part)
FERME = [
    'chat.png', 'chat_2.png', 'chat_3.png', 'chien.png', 'chien_2.png', 'chien_3.png',
    'cheval.png', 'cheval_monte.png', 'poteau_attache.png', 'caleche.png', 'malle.png',
    'vache.png', 'mouton.png', 'poule.png', 'herbe_haute.png', 'herbe_haute_fleurs.png',
    'puits.png', 'citerne.png', 'asperseur.png', 'robot.png', 'station_robot.png',
    'verger.png', 'arbre_clair_sp.png', 'pin_clair_sp.png', 'ramassables.png', 'pas_japonais.png',
    'portails.png', 'soil_dry.png', 'soil_wet.png', 'soil_wet_serre.png', 'tente.png', 'brouette.png', 'charrette.png',
]


def meubles():
    noms = sorted(os.path.basename(f) for f in glob.glob(os.path.join(ASSETS, 'meuble_*.png')))
    noms += sorted(os.path.basename(f) for f in glob.glob(os.path.join(ASSETS, 'faune_*.png')))
    return noms + ['bacs.png']


def empreinte(nom):
    with open(os.path.join(ASSETS, nom), 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:12]


def ligne_d_horizon(images, larg):
    """Le rangement « ligne d'horizon » : chaque image (les plus hautes, puis les plus larges d'abord) va là où
    son haut est le plus bas, sur `larg` px de large ; une image plus basse se glisse à côté d'une haute."""
    ordre = sorted(images, key=lambda n: (-images[n].height, -images[n].width, n))
    horizon = [(0, larg, 0)]   # [(x, largeur, hauteur déjà prise)]
    places, H = {}, 0
    for n in ordre:
        w, h = images[n].width + 2 * BORD, images[n].height + 2 * BORD
        meilleur = None
        for i, (x, _, _) in enumerate(horizon):
            if x + w > larg:
                break
            # (la hauteur sous l'image : la plus haute des marches qu'elle couvre)
            y, reste, k = 0, w, i
            while reste > 0:
                y = max(y, horizon[k][2])
                reste -= horizon[k][1]
                k += 1
            if meilleur is None or (y + h, x) < (meilleur[0] + h, meilleur[1]):
                meilleur = (y, x)
        y, x = meilleur
        places[n] = (x + BORD, y + BORD)
        H = max(H, y + h)
        # (la ligne refaite : la marche de l'image, puis ce qui dépasse à droite)
        nouveau, fin = [], x + w
        for (mx, mw, mh) in horizon:
            if mx + mw <= x or mx >= fin:
                nouveau.append((mx, mw, mh))
                continue
            if mx < x:
                nouveau.append((mx, x - mx, mh))
            if mx + mw > fin:
                nouveau.append((fin, mx + mw - fin, mh))
        nouveau.append((x, w, y + h))
        nouveau.sort()
        horizon = []
        for m in nouveau:
            if horizon and horizon[-1][2] == m[2] and horizon[-1][0] + horizon[-1][1] == m[0]:
                horizon[-1] = (horizon[-1][0], horizon[-1][1] + m[1], m[2])
            else:
                horizon.append(m)
    return places, H


def ranger(images):
    """Des côtés en puissances de deux (les coordonnées des cases y sont exactes pour la carte graphique) :
    l'atlas de plus petite surface, au plus 2 048 × 2 048."""
    plus_large = max(im.width for im in images.values()) + 2 * BORD
    choix = None
    for larg in (256, 512, 1024, 2048):
        if larg < plus_large:
            continue
        places, H = ligne_d_horizon(images, larg)
        H = 1 << max(0, (H - 1).bit_length())
        if H <= COTE and (choix is None or larg * H < choix[1] * choix[2]):
            choix = (places, larg, H)
    if choix is None:
        raise SystemExit('atlas trop grand pour 2 048 × 2 048')
    return choix


def assembler(nom, fichiers):
    images = {f: Image.open(os.path.join(ASSETS, f)).convert('RGBA') for f in fichiers}
    places, W, H = ranger(images)
    planche = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for f, (x, y) in places.items():
        im = images[f]
        w, h = im.size
        # (le bord : la première et la dernière colonne, la première et la dernière rangée, recopiées)
        planche.paste(im, (x, y))
        planche.paste(im.crop((0, 0, w, 1)), (x, y - 1))
        planche.paste(im.crop((0, h - 1, w, h)), (x, y + h))
        bande = planche.crop((x, y - 1, x + 1, y + h + 1))
        planche.paste(bande, (x - 1, y - 1))
        bande = planche.crop((x + w - 1, y - 1, x + w, y + h + 1))
        planche.paste(bande, (x + w, y - 1))
    planche.save(os.path.join(ASSETS, nom), optimize=True)
    print(f'assets/{nom} : {len(fichiers)} images, {W} × {H} px, {os.path.getsize(os.path.join(ASSETS, nom))} octets')
    return {f: [x, y, images[f].width, images[f].height] for f, (x, y) in sorted(places.items())}, W, H


def main():
    atlas, cases, sources = {}, {}, {}
    for cle, fichier, liste in [('atlas_ferme', 'atlas_ferme.png', FERME), ('atlas_meubles', 'atlas_meubles.png', meubles())]:
        places, W, H = assembler(fichier, liste)
        atlas[cle] = {'fichier': fichier, 'w': W, 'h': H}
        for f, r in places.items():
            cases[f] = [cle] + r
            sources[f] = empreinte(f)
    texte = ('/* carte/atlas.generated.js — généré par scripts/carte/atlas.py : ne pas modifier à la main.\n'
             ' * Les atlas de la carte (piste 4 du chantier « allègement ») : fichier de assets/ → [atlas, x, y, w, h],\n'
             ' * et l\'empreinte de chaque source (tests/engine/atlas.test.mjs). Lu par K.atlas (js/carte/kit.js). */\n'
             '(function (global) {\n'
             "  'use strict';\n"
             f'  global.CarteAtlas = {{\n    atlas: {json.dumps(atlas, ensure_ascii=False)},\n'
             f'    cases: {json.dumps(cases, ensure_ascii=False, separators=(",", ":"))},\n'
             f'    sources: {json.dumps(sources, separators=(",", ":"))},\n  }};\n'
             '})(typeof window !== \'undefined\' ? window : globalThis);\n')
    with open(TABLE, 'w', encoding='utf-8') as f:
        f.write(texte)
    print(f'js/carte/atlas.generated.js : {len(cases)} images')


if __name__ == '__main__':
    main()
