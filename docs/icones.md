# Les icônes en pixel art (à la place des emojis)

Les textes du jeu (données, messages, aide, encyclopédie) gardent leurs emojis. À l'affichage,
chaque emoji qui a son icône est remplacé par une case de `assets/icones.png`, dans le
jeu comme sur l'accueil, l'encyclopédie et la page des cookies.

## Fichiers

| Fichier | Rôle |
|---|---|
| [`assets/icones/*.png`](../assets/icones) | **la source** : une image de 16×16 par icône (ou de 32×32 pour un dessin plus fin), retouchée telle quelle ; [galerie](../assets/icones/README.md) |
| `assets/icones/icones.json` | emoji (sans U+FE0F) → fichier ; le fichier porte le nom Unicode anglais de l'emoji (💰 → `money_bag.png`, une suite : `seedling+cucumber.png`) |
| `scripts/icones/build.py` | assemble la planche et la table, refait les galeries et leurs aperçus agrandis (`apercu/`) |
| `assets/icones.png` | la planche (produite, 16 cases de 32×32 par rangée : une icône de 16×16 y est doublée, sans rien changer à l'écran) |
| `js/ui/icones.generated.js` | emoji → rang dans la planche, et l'empreinte de la planche (produit) |
| `js/ui/pixel-emoji.js` | le remplacement à l'affichage |
| `js/icones-page.js` | branche le remplacement sur les pages hors du jeu |

Les icônes étaient autrefois dessinées en texte (`scripts/icones/art_*.py`, une lettre par
pixel) ; leurs PNG en ont été tirés une fois pour toutes. Celles qui étaient calculées à partir
d'autres (sachets de graines, couleurs de peau, cases de `crops.png` ou `trouvailles.png`) sont
désormais indépendantes : retoucher la tomate ne change pas son sachet.

## Dessins, police et jauges (sans emoji)

Les illustrations qui étaient en SVG (bâtiments des Installations et des fiches d'aide, arbres
du Verger, bêtes de l'Étable et du Poulailler) et les boutons ronds « Dormir » et « Prendre la houe »
sont aussi en pixel art :

| Fichier | Rôle |
|---|---|
| [`assets/dessins/*.png`](../assets/dessins) | **la source** : un dessin par fichier, jusqu'à 32×32, nommé comme dans le jeu ; [galerie](../assets/dessins/README.md) |
| `assets/art.png` | leur planche, cases de 32×32 où le dessin est centré et posé sur le bas (produite) |
| `assets/police.png` | la police pixel (la source) : chiffres, `#`, `s`, `h`, `x`, `/`, une rangée sombre et une blanche |
| `assets/police.json` | sa hauteur, et pour chaque caractère `[x, largeur]` dans `police.png` |
| `js/ui/pixel-art.js` | `artHtml(nom)`, `pxText('#12')`, `pxGauge(valeur, max, libellé)` |

- Les fiches de parcelle (Zone de culture, Champ, Serre) : « #n » en police pixel, le nom et
  l'icône de la culture, une jauge d'une case par stade (sans texte), puis des boutons d'icônes :
  arroser 💧 (ou récolter 🧺 quand c'est mûr), automatisation 🤖 (grisé tant que le semis
  automatique n'est pas débloqué).
  Le détail (stade, litres, rendement) est dans le libellé des boutons et de la jauge.
- Le Frigo reprend cette fiche sans jauge : icône, nom, nombre au frais, boutons pour sortir. Au
  frais la conservation est figée ; ce qui va périmer est encadré en rouge dans l'onglet Frais.
- Une adresse dans une variable CSS se résout par rapport à la feuille de style : `pixel-art.js`
  pose donc des adresses absolues (`--art-sheet`, `--font-sheet`).

## Ajouter ou retoucher une icône

1. Retoucher le PNG de `assets/icones/` (16×16 ou 32×32, fond transparent) dans un logiciel de pixel art,
   sans anticrénelage. Une nouvelle icône : déposer son PNG, puis l'ajouter à
   `assets/icones/icones.json` (emoji sans U+FE0F → fichier). Un dessin : `assets/dessins/`, son
   nom de fichier est son nom dans le jeu.
2. `python3 scripts/icones/build.py` : refait `assets/icones.png`, `assets/art.png`,
   `js/ui/icones.generated.js` et les galeries.

Style commun : contour de 1 px dans une teinte très sombre de la couleur de l'objet (jamais du
noir pur), lumière en haut à gauche, 3 à 4 teintes par matière, pas d'anticrénelage, l'objet
occupe 12 à 15 px.

Le sens dans le jeu l'emporte sur le sens Unicode : 🫘 est la vanille (deux gousses), 🪹 la
paille (une botte), 🥒 la courgette (celle de la carte), 🥣 la farine.

Une icône de 32×32 garde ses traits d'un pixel : nette dans la barre d'outils (affichée à 32 px),
elle est plus fine que les autres dans le texte (vers 20 px), où certains de ses pixels sautent.
La houe ⛏, la pioche ⚒ et la hache 🪓 sont dessinées ainsi.

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
