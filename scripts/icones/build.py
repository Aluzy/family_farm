#!/usr/bin/env python3
"""Assemble les icônes du jeu : assets/icones.png, assets/art.png et js/ui/icones.generated.js.

Usage (depuis la racine du dépôt) : python3 scripts/icones/build.py

Rien n'est dessiné ici : les PNG sont la source, retouchés tels quels.
  assets/icones/*.png         les icônes d'emoji, 16×16, ou 32×32 pour un dessin plus fin (CELL)
  assets/icones/icones.json   emoji (sans U+FE0F) → fichier ; une suite (👨‍👩‍👧‍👦, 👩🏽) est un seul emoji
  assets/dessins/*.png        les dessins sans emoji (bâtiments, arbres, bêtes, boutons), au plus
                              32×32 ; le nom du fichier est leur nom dans le jeu (js/ui/pixel-art.js)
  assets/police.png + .json   la police pixel : rangée 0 sombre, rangée 1 blanche ; le .json donne
                              la hauteur et, par caractère, [x, largeur]

Le script refait aussi les galeries (assets/icones/README.md, assets/dessins/README.md) et
leurs aperçus agrandis (apercu/), pour voir les icônes sur GitHub.
"""
import hashlib
import json
import os
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, ROOT  # noqa: E402

ICONES_DIR = os.path.join(ASSETS, 'icones')
DESSINS_DIR = os.path.join(ASSETS, 'dessins')
COLS = 16
# Une case de la planche : 32×32. Une icône de 16×16 y est doublée (rien ne change à l'écran :
# la page étire la case à la taille de l'icône) ; une de 32×32 y garde ses traits d'un pixel.
CELL = 32
ART_CELL = 32
ART_COLS = 8


def png(path):
    return Image.open(path).convert('RGBA')


def pngs(folder):
    return sorted(f for f in os.listdir(folder) if f.endswith('.png'))


def load_icons():
    with open(os.path.join(ICONES_DIR, 'icones.json'), encoding='utf8') as f:
        table = json.load(f)
    icons = {}
    for e, file in table.items():
        path = os.path.join(ICONES_DIR, file)
        if not os.path.exists(path):
            sys.exit(f'icones.json : {e} → {file}, fichier absent de assets/icones/')
        im = png(path)
        if im.size not in ((16, 16), (CELL, CELL)):
            sys.exit(f'assets/icones/{file} : {im.width}×{im.height} au lieu de 16×16 ou {CELL}×{CELL}')
        if im.size != (CELL, CELL):
            im = im.resize((CELL, CELL), Image.NEAREST)
        icons[e.replace('️', '')] = im
    orphans = sorted(set(pngs(ICONES_DIR)) - set(table.values()))
    for file in orphans:
        print(f'⚠ assets/icones/{file} : sans emoji dans icones.json, laissé de côté')
    return table, icons


def load_art():
    art = {}
    for file in pngs(DESSINS_DIR):
        im = png(os.path.join(DESSINS_DIR, file))
        if im.width > ART_CELL or im.height > ART_CELL:
            sys.exit(f'assets/dessins/{file} : {im.width}×{im.height}, au plus {ART_CELL}×{ART_CELL}')
        cell = Image.new('RGBA', (ART_CELL, ART_CELL), (0, 0, 0, 0))
        cell.alpha_composite(im, ((ART_CELL - im.width) // 2, ART_CELL - im.height))  # centré, posé sur le bas
        art[file[:-4]] = cell
    return art


def save_versioned(im, file):
    path = os.path.join(ASSETS, file)
    im.save(path, optimize=True)
    return version_of(path)


def version_of(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


def apercus(folder, files, zoom=None, taille=None):
    """Les aperçus agrandis : `zoom` fois, ou à `taille` px de large (une icône de 16 ou de 32 px)."""
    out = os.path.join(folder, 'apercu')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    for file in files:
        im = png(os.path.join(folder, file))
        if taille:
            zoom = max(1, taille // im.width)
        im.resize((im.width * zoom, im.height * zoom), Image.NEAREST).save(os.path.join(out, file), optimize=True)


AIDE = [
    '## Télécharger',
    '',
    '- Une image : l\'ouvrir sur GitHub, puis le bouton « Download raw file ».',
    '- Tout le dossier : sur la page du dépôt, « Code » → « Download ZIP ».',
    '',
    '## Retoucher',
    '',
    'Ces PNG sont les images du jeu, tels quels. Retoucher le fichier du dossier (pas son aperçu',
    'agrandi de `apercu/`) dans un logiciel de pixel art (Aseprite, Piskel, LibreSprite…), sans',
    'anticrénelage ni flou, le remettre à sa place sous le même nom, puis lancer',
    '`python3 scripts/icones/build.py` : il refait la planche lue par le jeu (voir',
    '[`docs/icones.md`](../../docs/icones.md)).',
    '',
    'Le style : contour de 1 px dans une teinte très sombre de la couleur de l\'objet (jamais du',
    'noir pur), lumière en haut à gauche, 3 à 4 teintes par matière, pas d\'anticrénelage.',
    '',
]


def galerie_icones(table):
    md = [
        '# Les icônes d\'emoji',
        '',
        f'Les {len(table)} icônes (16×16, ou {CELL}×{CELL} pour les plus fines) qui remplacent les emojis à l\'affichage. Une nouvelle icône :',
        'déposer son PNG ici, l\'ajouter à `icones.json` (emoji → fichier), puis lancer le script.',
        '',
        *AIDE,
        '> Galerie et `apercu/` refaits par `scripts/icones/build.py` : ne pas les modifier à la main.',
        '',
        '| Icône | Emoji | Fichier |',
        '|:---:|:---:|---|',
    ]
    for e, file in sorted(table.items()):
        md.append(f'| <img src="apercu/{file}" width="48" height="48" alt=""> | {e} | [`{file}`]({file}) |')
    return md


def galerie_dessins(files):
    md = [
        '# Les dessins',
        '',
        f'Les {len(files)} dessins sans emoji (bâtiments, arbres, bêtes, boutons), au plus 32×32 : le nom',
        'du fichier est le nom du dessin dans le jeu (`js/ui/pixel-art.js`, `artHtml(nom)`).',
        '',
        *AIDE,
        '> Galerie et `apercu/` refaits par `scripts/icones/build.py` : ne pas les modifier à la main.',
        '',
        '| Dessin | Fichier |',
        '|:---:|---|',
    ]
    for file in files:
        md.append(f'| <img src="apercu/{file}" width="96" height="96" alt=""> | [`{file}`]({file}) |')
    return md


def write(path, lines):
    with open(path, 'w', encoding='utf8') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    table, icons = load_icons()
    order = sorted(icons)  # la planche et la table sont refaites ensemble : l'ordre peut changer
    rows = (len(order) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for n, e in enumerate(order):
        sheet.alpha_composite(icons[e], ((n % COLS) * CELL, (n // COLS) * CELL))
    version = save_versioned(sheet, 'icones.png')

    art = load_art()
    names = sorted(art)
    arows = max(1, (len(names) + ART_COLS - 1) // ART_COLS)
    asheet = Image.new('RGBA', (ART_COLS * ART_CELL, arows * ART_CELL), (0, 0, 0, 0))
    for n, k in enumerate(names):
        asheet.alpha_composite(art[k], ((n % ART_COLS) * ART_CELL, (n // ART_COLS) * ART_CELL))
    aversion = save_versioned(asheet, 'art.png')

    with open(os.path.join(ASSETS, 'police.json'), encoding='utf8') as f:
        police = json.load(f)
    fversion = version_of(os.path.join(ASSETS, 'police.png'))
    fwidth = png(os.path.join(ASSETS, 'police.png')).width

    js = (
        '// Fichier produit par scripts/icones/build.py : ne pas modifier à la main.\n'
        '// emoji (sans U+FE0F) → rang dans assets/icones.png (COLS cases par rangée).\n'
        '// VERSION : empreinte de la planche, ajoutée à son adresse (pas de vieille planche en cache).\n'
        f"export const VERSION = '{version}';\n"
        f'export const COLS = {COLS};\n'
        f'export const ROWS = {rows};\n'
        f'export const ICONES = {json.dumps({e: n for n, e in enumerate(order)}, ensure_ascii=False, indent=0)};\n'
        '// Dessins de 32×32 (assets/art.png) : nom → rang, ART_COLS cases par rangée.\n'
        f"export const ART_VERSION = '{aversion}';\n"
        f'export const ART_COLS = {ART_COLS};\n'
        f'export const ART_ROWS = {arows};\n'
        f'export const ART = {json.dumps({k: n for n, k in enumerate(names)}, ensure_ascii=False, indent=0)};\n'
        '// Police pixel (assets/police.png) : caractère → [x, largeur], hauteur POLICE_H, une rangée par couleur.\n'
        f"export const POLICE_VERSION = '{fversion}';\n"
        f'export const POLICE_W = {fwidth};\n'
        f"export const POLICE_H = {police['hauteur']};\n"
        f"export const POLICE = {json.dumps(police['glyphes'], ensure_ascii=False)};\n"
    )
    with open(os.path.join(ROOT, 'js', 'ui', 'icones.generated.js'), 'w', encoding='utf8') as f:
        f.write(js)

    apercus(ICONES_DIR, sorted(table.values()), taille=128)
    write(os.path.join(ICONES_DIR, 'README.md'), galerie_icones(table))
    dessins = pngs(DESSINS_DIR)
    apercus(DESSINS_DIR, dessins, 4)
    write(os.path.join(DESSINS_DIR, 'README.md'), galerie_dessins(dessins))
    print(f'{len(order)} icônes, planche {sheet.width}×{sheet.height} ; {len(names)} dessins, art.png {asheet.width}×{asheet.height}')


if __name__ == '__main__':
    main()
