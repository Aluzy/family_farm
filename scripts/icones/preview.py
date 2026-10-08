#!/usr/bin/env python3
"""Aperçu d'un ou plusieurs fichiers art_*.py : chaque icône agrandie ×6 sur fond clair et
sur fond sombre, avec son nom, puis à taille réelle (×1 et ×2) dans une ligne de texte.

Usage : python3 scripts/icones/preview.py scripts/icones/art_xxx.py [...] -o apercu.png
"""
import os
import sys
import unicodedata

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import module_art, module_icons  # noqa: E402


def name(e):
    if e.isascii():
        return e
    return ' + '.join(unicodedata.name(c, '?').lower() for c in e if c not in '‍️')[:28]


def main(argv):
    out = 'apercu.png'
    if '-o' in argv:
        i = argv.index('-o')
        out = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    icons = {}
    for p in argv:
        icons.update(module_icons(p))
        for k, im in module_art(p).items():
            icons[k] = im
    items = list(icons.items())
    per = 6
    cw, ch = 16 * 6 * 2 + 30, 16 * 6 + 60
    rows = (len(items) + per - 1) // per
    sheet = Image.new('RGBA', (per * cw + 10, rows * ch + 10), (255, 255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for n, (e, im) in enumerate(items):
        x, y = 10 + (n % per) * cw, 10 + (n // per) * ch
        for k, bg in enumerate([(245, 239, 226, 255), (40, 52, 44, 255)]):
            box = Image.new('RGBA', (96, 96), bg)
            k3 = 96 // im.width
            box.alpha_composite(im.resize((im.width * k3, im.height * k3), Image.NEAREST))
            sheet.alpha_composite(box, (x + k * 100, y))
        sheet.alpha_composite(Image.new('RGBA', (60, 22), (245, 239, 226, 255)), (x, y + 100))
        small = im if im.width == 16 else im.resize((16, 16), Image.NEAREST)
        sheet.alpha_composite(small, (x + 3, y + 103))
        sheet.alpha_composite(im.resize((32, 32), Image.NEAREST), (x + 24, y + 100))
        d.text((x + 64, y + 104), name(e), fill=(0, 0, 0, 255))
    sheet.save(out)
    print(out, len(items), 'icônes')


if __name__ == '__main__':
    main(sys.argv[1:])
