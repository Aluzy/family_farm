#!/usr/bin/env python3
"""Range les icônes du jeu une par une dans icones/ (à la racine du dépôt), pour les
télécharger depuis GitHub et les retoucher.

Usage (depuis la racine du dépôt) : python3 scripts/icones/export.py
(build.py le lance aussi à la fin : le dossier suit toujours la planche.)

  icones/16px/      chaque icône d'emoji à sa taille réelle (16×16), à retoucher
  icones/x8/        les mêmes agrandies 8 fois (128×128), pour les voir
  icones/dessins/agrandis/  ces dessins agrandis 4 fois (128×128)
  icones/dessins/   les dessins de 32×32 (bâtiments, arbres, bêtes…) d'assets/art.png
  icones/README.md  la galerie : chaque icône, son emoji, son fichier et le dessin d'origine

Le nom d'un fichier est le nom Unicode de l'emoji (💰 → money_bag.png ; une suite 🌾‍⚙ →
sheaf_of_rice+gear.png). Ces fichiers sont produits : le jeu lit toujours les dessins
de scripts/icones/art_*.py (voir docs/icones.md).
"""
import glob
import os
import shutil
import sys
import unicodedata

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build  # noqa: E402  (met aussi scripts/ dans le chemin)

OUT = os.path.join(build.ROOT, 'icones')
ZOOM = 8
ZWJ = '‍'


def sources():
    """emoji → d'où vient l'icône (même ordre de priorité que build.collect())."""
    src = {}
    for path in sorted(glob.glob(os.path.join(build.HERE, 'art_*.py'))):
        for e in build.module_icons(path):
            src.setdefault(e, f'scripts/icones/{os.path.basename(path)}')
    for e, (sheet, c, r) in build.FROM_SHEET.items():
        src.setdefault(e, f'assets/{sheet} (case {c}, {r})')
    return src


def slug(emoji):
    parts = []
    for seq in emoji.split(ZWJ):
        words = []
        for ch in seq:
            name = unicodedata.name(ch, f'u{ord(ch):04x}').lower()
            name = name.replace('emoji modifier fitzpatrick ', 'skin_')
            words.append(''.join(c if c.isalnum() else '_' for c in name))
        parts.append('_'.join(words))
    return '+'.join(parts)


def fresh(path):
    shutil.rmtree(path, ignore_errors=True)
    os.makedirs(path)


def save(im, path):
    im.save(path, optimize=True)


def main():
    icons = build.collect()
    src = sources()
    art = build.collect_art()
    for d in ('16px', 'x8', 'dessins', os.path.join('dessins', 'agrandis')):
        fresh(os.path.join(OUT, d))

    names, rows = {}, []
    for e in sorted(icons):
        base = slug(e)
        n = names.get(base, 0)
        names[base] = n + 1
        file = f'{base}_{n + 1}.png' if n else f'{base}.png'
        im = icons[e]
        save(im, os.path.join(OUT, '16px', file))
        save(im.resize((16 * ZOOM, 16 * ZOOM), Image.NEAREST), os.path.join(OUT, 'x8', file))
        rows.append((e, file, src.get(e, 'dérivée (derived() d\'un art_*.py)')))

    arows = []
    for k in sorted(art):
        im = art[k]
        file = f'{k}.png'
        save(im, os.path.join(OUT, 'dessins', file))
        save(im.resize((im.width * 4, im.height * 4), Image.NEAREST), os.path.join(OUT, 'dessins', 'agrandis', file))
        arows.append(file)

    md = [
        '# Les icônes du jeu',
        '',
        '> Dossier produit par `python3 scripts/icones/export.py` (lancé aussi par `scripts/icones/build.py`) :',
        '> ne pas le modifier à la main, il est refait à chaque construction des planches.',
        '',
        '| Dossier | Contenu |',
        '|---|---|',
        f'| [`16px/`](16px) | les {len(rows)} icônes d\'emoji à leur taille réelle (16×16, fond transparent) : **à retoucher** |',
        f'| [`x8/`](x8) | les mêmes agrandies 8 fois (128×128), pour les regarder |',
        f'| [`dessins/`](dessins) | les {len(arows)} dessins de 32×32 (bâtiments, arbres, bêtes, boutons), et agrandis 4 fois dans `dessins/agrandis/` |',
        '',
        '## Télécharger',
        '',
        '- Une icône : ouvrir le fichier sur GitHub, puis le bouton « Download raw file ».',
        '- Tout le dossier : sur la page du dépôt, « Code » → « Download ZIP », puis garder `icones/`.',
        '',
        '## Retoucher',
        '',
        'Retoucher **le fichier de `16px/`** (pas l\'agrandi) dans un logiciel de pixel art',
        '(Aseprite, Piskel, LibreSprite…), sans anticrénelage ni flou. Le style : contour de 1 px',
        'dans une teinte très sombre de la couleur de l\'objet, lumière en haut à gauche, 3 à 4',
        'teintes par matière, l\'objet occupe 12 à 15 px.',
        '',
        'Le jeu ne lit pas ce dossier : il dessine ses icônes depuis le fichier indiqué dans la',
        'colonne « Source » ci-dessous. Pour qu\'une retouche entre dans le jeu, la reporter dans ce',
        'fichier puis lancer `python3 scripts/icones/build.py` (voir [`docs/icones.md`](../docs/icones.md)).',
        '',
        f'## Icônes d\'emoji ({len(rows)})',
        '',
        '| Icône | Emoji | Fichier | Source |',
        '|:---:|:---:|---|---|',
    ]
    for e, file, s in rows:
        md.append(f'| <img src="x8/{file}" width="48" height="48" alt=""> | {e} | [`{file}`](16px/{file}) | `{s}` |')
    md += ['', f'## Dessins de 32×32 ({len(arows)})', '', '| Dessin | Fichier |', '|:---:|---|']
    for file in arows:
        md.append(f'| <img src="dessins/agrandis/{file}" width="64" height="64" alt=""> | [`{file}`](dessins/{file}) |')
    with open(os.path.join(OUT, 'README.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(md) + '\n')
    print(f'icones/ : {len(rows)} icônes, {len(arows)} dessins')


if __name__ == '__main__':
    main()
