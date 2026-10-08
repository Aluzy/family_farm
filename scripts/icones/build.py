#!/usr/bin/env python3
"""Construit assets/icones.png et js/ui/icones.generated.js.

Les icônes de 16×16 qui remplacent les emojis à l'affichage (js/ui/pixel-emoji.js).

Usage (depuis la racine du dépôt) : python3 scripts/icones/build.py

Sources, dans cet ordre (une icône déjà vue n'est pas reprise) :
  1. scripts/icones/art_*.py : chaque fichier définit
       PALETTE = {'a': '#rrggbb', ...}       une lettre par couleur, '.' = transparent
       ICONS   = {'💰': [16 chaînes de 16 lettres], ...}
     ou, pour les icônes calculées, une fonction icons() qui renvoie
       {'emoji': Image RGBA 16×16, ...}
  2. FROM_SHEET ci-dessous : cases reprises des planches du jeu (récoltes de crops.png…),
     pour que l'icône d'un légume soit celle qu'on voit sur la carte.

L'emoji est écrit sans U+FE0F (le sélecteur est ignoré à l'affichage). Une suite d'emojis
(👨‍👩‍👧‍👦, 👩🏽) est une seule icône.
"""
import glob
import hashlib
import importlib.util
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.join(ROOT, 'scripts', 'icones')
COLS = 16

# emoji : (planche, colonne, rangée) — cases de 16×16
FROM_SHEET = {
    '🌾': ('crops.png', 13, 6),
    '🥕': ('crops.png', 4, 1),
    '🥔': ('crops.png', 4, 3),
    '🧅': ('crops.png', 13, 3),
    '🍓': ('crops.png', 14, 4),
    '🥬': ('crops.png', 4, 6),
    '🍅': ('crops.png', 14, 9),
    '🫑': ('crops.png', 14, 11),
    '🥒': ('crops.png', 4, 11),
    '🍎': ('crops.png', 9, 12),
}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def grid_image(name, emoji, rows, palette):
    if len(rows) != 16:
        sys.exit(f'{name} {emoji} : {len(rows)} rangées au lieu de 16')
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        if len(row) != 16:
            sys.exit(f'{name} {emoji} rangée {y} : {len(row)} lettres au lieu de 16 « {row} »')
        for x, ch in enumerate(row):
            if ch == '.' or ch == ' ':
                continue
            if ch not in palette:
                sys.exit(f'{name} {emoji} rangée {y} : lettre « {ch} » absente de PALETTE')
            im.putpixel((x, y), rgb(palette[ch]))
    return im


def load_module(path):
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def module_icons(path):
    mod = load_module(path)
    name = os.path.basename(path)
    out = {}
    if hasattr(mod, 'icons'):
        for e, im in mod.icons().items():
            out[e.replace('️', '')] = im.convert('RGBA')
    for e, rows in getattr(mod, 'ICONS', {}).items():
        pal = getattr(mod, 'PALETTE', {})
        out[e.replace('️', '')] = grid_image(name, e, rows, pal)
    return out


def collect():
    icons = {}
    for path in sorted(glob.glob(os.path.join(HERE, 'art_*.py'))):
        for e, im in module_icons(path).items():
            icons.setdefault(e, im)
    sheets = {}
    for e, (sheet, c, r) in FROM_SHEET.items():
        if e in icons:
            continue
        if sheet not in sheets:
            sheets[sheet] = Image.open(os.path.join(ROOT, 'assets', sheet)).convert('RGBA')
        icons[e] = sheets[sheet].crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
    return icons


def main():
    icons = collect()
    order = sorted(icons)  # la planche et la table sont refaites ensemble : l'ordre peut changer
    rows = (len(order) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * 16, rows * 16), (0, 0, 0, 0))
    for n, e in enumerate(order):
        sheet.alpha_composite(icons[e], ((n % COLS) * 16, (n // COLS) * 16))
    sheet.save(os.path.join(ROOT, 'assets', 'icones.png'), optimize=True)
    table = {e: n for n, e in enumerate(order)}
    with open(os.path.join(ROOT, 'assets', 'icones.png'), 'rb') as f:
        version = hashlib.sha256(f.read()).hexdigest()[:10]
    js = (
        '// Fichier produit par scripts/icones/build.py : ne pas modifier à la main.\n'
        '// emoji (sans U+FE0F) → rang dans assets/icones.png (COLS cases par rangée).\n'
        '// VERSION : empreinte de la planche, ajoutée à son adresse (pas de vieille planche en cache).\n'
        f"export const VERSION = '{version}';\n"
        f'export const COLS = {COLS};\n'
        f'export const ROWS = {rows};\n'
        f'export const ICONES = {json.dumps(table, ensure_ascii=False, indent=0)};\n'
    )
    with open(os.path.join(ROOT, 'js', 'ui', 'icones.generated.js'), 'w', encoding='utf8') as f:
        f.write(js)
    print(f'{len(order)} icônes, planche {sheet.width}×{sheet.height}')


if __name__ == '__main__':
    main()
