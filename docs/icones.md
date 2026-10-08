# Les icônes en pixel art (à la place des emojis)

Les textes du jeu (données, messages, aide, encyclopédie) gardent leurs emojis. À l'affichage,
chaque emoji qui a son icône est remplacé par une case de 16×16 de `assets/icones.png`, dans le
jeu comme sur l'accueil, l'encyclopédie et la page des cookies.

## Fichiers

| Fichier | Rôle |
|---|---|
| `scripts/icones/art_*.py` | les dessins, une lettre par pixel, regroupés par thème (symboles, cuisine, nature, lieux, outils, gens et horloges, essai) |
| `scripts/icones/build.py` | assemble la planche et la table ; reprend aussi des cases des planches du jeu (`FROM_SHEET` : les récoltes de `crops.png`) |
| `scripts/icones/preview.py` | aperçu d'un fichier de dessins : chaque icône agrandie, sur fond clair et sombre, et à taille réelle |
| `assets/icones.png` | la planche (produite, 16 cases par rangée) |
| `js/ui/icones.generated.js` | emoji → rang dans la planche, et l'empreinte de la planche (produit) |
| `js/ui/pixel-emoji.js` | le remplacement à l'affichage |
| `js/icones-page.js` | branche le remplacement sur les pages hors du jeu |

## Dessins, police et jauges (sans emoji)

Les illustrations qui étaient en SVG (bâtiments des Installations et des fiches d'aide, arbres
du Verger, bêtes de l'Étable et du Poulailler) et le bouton « Dormir » sont aussi en pixel art :

| Fichier | Rôle |
|---|---|
| `scripts/icones/art_batiments.py`, `art_verger.py`, `art_jeu.py` | dessins nommés (`ART` ou `art()`), jusqu'à 32×32 |
| `assets/art.png` | leur planche, cases de 32×32 (produite) |
| `assets/police.png` | la police pixel : chiffres, `#`, `s`, `h`, `x`, `/` (produite depuis `FONT` de `art_jeu.py`), une rangée sombre et une blanche |
| `js/ui/pixel-art.js` | `artHtml(nom)`, `pxText('#12')`, `pxGauge(valeur, max, libellé)` |

- Les fiches de parcelle (Zone de culture, Champ, Serre) : « #n » en police pixel, le nom et
  l'icône de la culture, une jauge d'une case par stade (sans texte), puis des boutons d'icônes :
  arroser 💧 (ou récolter 🧺 quand c'est mûr), automatisation 🤖 (grisé tant que le semis
  automatique n'est pas débloqué), et 🌱 pour laisser monter en graine quand c'est possible.
  Le détail (stade, litres, rendement) est dans le libellé des boutons et de la jauge.
- Le Frigo reprend cette fiche : icône, nom, nombre au frais, jauge de fraîcheur du lot le plus
  ancien, boutons pour sortir. Le détail des lots n'est plus affiché.
- Une adresse dans une variable CSS se résout par rapport à la feuille de style : `pixel-art.js`
  pose donc des adresses absolues (`--art-sheet`, `--font-sheet`).

## Ajouter ou retoucher une icône

1. Dessiner dans le fichier `art_*.py` du thème : 16 chaînes de 16 lettres, chaque lettre
   définie dans `PALETTE`, `.` pour le transparent. La clé est l'emoji sans U+FE0F.
2. `python3 scripts/icones/preview.py scripts/icones/art_xxx.py -o apercu.png` et regarder.
3. `python3 scripts/icones/build.py` : refait `assets/icones.png` et `js/ui/icones.generated.js`.

Style commun : contour de 1 px dans une teinte très sombre de la couleur de l'objet (jamais du
noir pur), lumière en haut à gauche, 3 à 4 teintes par matière, pas d'anticrénelage, l'objet
occupe 12 à 15 px.

Le sens dans le jeu l'emporte sur le sens Unicode : 🫘 est la vanille (deux gousses), 🪹 la
paille (une botte), 🥒 la courgette (celle de la carte), 🥣 la farine.

## Comment le remplacement marche

- `morph()` (`js/ui/render.js`) passe chaque gabarit dans `pixelize()` **avant** de le comparer
  au DOM : l'ancien et le nouveau contenu ont les mêmes balises, rien n'est recréé à chaque rendu.
- Un `MutationObserver` (`watch()`) rattrape le reste : `innerHTML` directs, toasts, pages statiques.
- Une suite (`👩🏽`, portrait + teint ; `👨‍👩‍👧‍👦`) est une seule icône ; la plus longue suite
  connue l'emporte.
- Restent en emoji : les attributs (`title`, `aria-label`), `<option>`, `<select>`, `<textarea>`,
  `<input>`, `<title>`, et tout emoji sans icône.
- L'icône est un `<i class="px" role="img" aria-label="💰">` : les lecteurs d'écran lisent l'emoji.
- La feuille de style est posée par le module lui-même ; l'adresse de la planche porte son
  empreinte (`?v=`), une planche refaite n'est donc jamais servie depuis un vieux cache.
- Sur le site construit, `scripts/build-site.mjs` regroupe `js/icones-page.js` en
  `js/icones.bundle.js` pour les pages hors du jeu.

## Limites

- Les icônes sont affichées à 1,25 em : selon la taille du texte, l'agrandissement n'est pas un
  multiple entier et certains pixels sont un peu plus larges que d'autres.
- Pas d'icône pour les signes de mise en page ou des tests (⌈ ⌉ ⌊ ⌋ ✗ ✕ 🟡 😀 🍈) : ils restent
  tels quels.
