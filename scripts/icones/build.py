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
     Les dessins plus grands (bâtiments, arbres, bêtes : jusqu'à 32×32, sans emoji) vont dans
       ART = {'b-serre': [rangées], ...}      (même PALETTE ; ART_SCALE = 2 les double)
     ou art() qui renvoie {nom: Image}. Ils forment assets/art.png, des cases de 32×32 où
     le dessin est centré et posé sur le bas (js/ui/animations.js, artSvg()).
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


def grid_image(name, emoji, rows, palette, size=16):
    w = size or max(len(r) for r in rows)
    h = size or len(rows)
    if len(rows) != h:
        sys.exit(f'{name} {emoji} : {len(rows)} rangées au lieu de {h}')
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        if len(row) != w:
            sys.exit(f'{name} {emoji} rangée {y} : {len(row)} lettres au lieu de {w} « {row} »')
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


ART_CELL = 32
ART_COLS = 8


def module_art(path):
    mod = load_module(path)
    name = os.path.basename(path)
    out = {}
    scale = getattr(mod, 'ART_SCALE', 1)
    raw = {}
    if hasattr(mod, 'art'):
        raw.update({k: im.convert('RGBA') for k, im in mod.art().items()})
    for k, rows in getattr(mod, 'ART', {}).items():
        raw[k] = grid_image(name, k, rows, getattr(mod, 'PALETTE', {}), size=None)
    for k, im in raw.items():
        if scale != 1 and k in getattr(mod, 'ART', {}):
            im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        if im.width > ART_CELL or im.height > ART_CELL:
            sys.exit(f'{name} {k} : {im.width}×{im.height}, au plus {ART_CELL}×{ART_CELL}')
        cell = Image.new('RGBA', (ART_CELL, ART_CELL), (0, 0, 0, 0))
        cell.alpha_composite(im, ((ART_CELL - im.width) // 2, ART_CELL - im.height))
        out[k] = cell
    return out


def collect_art():
    art = {}
    for path in sorted(glob.glob(os.path.join(HERE, 'art_*.py'))):
        for k, im in module_art(path).items():
            art.setdefault(k, im)
    return art


def save_versioned(im, file):
    path = os.path.join(ROOT, 'assets', file)
    im.save(path, optimize=True)
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


def collect_font():
    font = {}
    for path in sorted(glob.glob(os.path.join(HERE, 'art_*.py'))):
        for ch, rows in getattr(load_module(path), 'FONT', {}).items():
            font.setdefault(ch, rows)
    return font


FONT_COLORS = [(59, 47, 37, 255), (255, 255, 255, 255)]  # rangée 0 : texte sombre ; rangée 1 : blanc


def font_sheet(font):
    """Police pixel : les glyphes côte à côte, une rangée par couleur (FONT_COLORS).
    Une image plutôt qu'un masque CSS : les masques agrandis sont lissés, pas les images."""
    h = max(len(r) for r in font.values()) if font else 1
    w = sum(len(r[0]) for r in font.values()) if font else 1
    im = Image.new('RGBA', (max(1, w), h * len(FONT_COLORS)), (0, 0, 0, 0))
    table, x = {}, 0
    for ch, rows in font.items():
        for k, col in enumerate(FONT_COLORS):
            for y, row in enumerate(rows):
                for i, c in enumerate(row):
                    if c == '#':
                        im.putpixel((x + i, k * h + y), col)
        table[ch] = [x, len(rows[0])]
        x += len(rows[0])
    return im, table, h


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
    version = save_versioned(sheet, 'icones.png')
    table = {e: n for n, e in enumerate(order)}
    art = collect_art()
    names = sorted(art)
    arows = max(1, (len(names) + ART_COLS - 1) // ART_COLS)
    asheet = Image.new('RGBA', (ART_COLS * ART_CELL, arows * ART_CELL), (0, 0, 0, 0))
    for n, k in enumerate(names):
        asheet.alpha_composite(art[k], ((n % ART_COLS) * ART_CELL, (n // ART_COLS) * ART_CELL))
    aversion = save_versioned(asheet, 'art.png')
    fim, ftable, fh = font_sheet(collect_font())
    fversion = save_versioned(fim, 'police.png')
    js = (
        '// Fichier produit par scripts/icones/build.py : ne pas modifier à la main.\n'
        '// emoji (sans U+FE0F) → rang dans assets/icones.png (COLS cases par rangée).\n'
        '// VERSION : empreinte de la planche, ajoutée à son adresse (pas de vieille planche en cache).\n'
        f"export const VERSION = '{version}';\n"
        f'export const COLS = {COLS};\n'
        f'export const ROWS = {rows};\n'
        f'export const ICONES = {json.dumps(table, ensure_ascii=False, indent=0)};\n'
        '// Dessins de 32×32 (assets/art.png) : nom → rang, ART_COLS cases par rangée.\n'
        f"export const ART_VERSION = '{aversion}';\n"
        f'export const ART_COLS = {ART_COLS};\n'
        f'export const ART_ROWS = {arows};\n'
        f'export const ART = {json.dumps({k: n for n, k in enumerate(names)}, ensure_ascii=False, indent=0)};\n'
        '// Police pixel (assets/police.png) : caractère → [x, largeur], hauteur POLICE_H, une rangée par couleur.\n'
        f"export const POLICE_VERSION = '{fversion}';\n"
        f'export const POLICE_W = {fim.width};\n'
        f'export const POLICE_H = {fh};\n'
        f'export const POLICE = {json.dumps(ftable, ensure_ascii=False)};\n'
    )
    with open(os.path.join(ROOT, 'js', 'ui', 'icones.generated.js'), 'w', encoding='utf8') as f:
        f.write(js)
    print(f'{len(order)} icônes, planche {sheet.width}×{sheet.height} ; {len(names)} dessins, art.png {asheet.width}×{asheet.height}')


if __name__ == '__main__':
    main()
