# Moon Bloom Village — règles du projet

## Règle de dessin : la vue de haut à 45° (obligatoire pour tout nouveau dessin)

Tout ce qui se pose sur la carte (blocs, meubles, objets des hameaux, décorations de la boutique) est dessiné
**vu de haut à 45°**, comme la carte et ses bâtiments — jamais en vue de face (élévation) ni en vue de dessus
pure. Avant de livrer un dessin, vérifier chaque point :

1. **On voit le dessus ET la face avant.** Toute surface horizontale visible (dessus d'un meuble, d'un mur,
   d'une tablette, d'une marche, d'un rebord, d'une sole, d'un bassin, l'eau, le sol à l'intérieur d'une
   ouverture) est dessinée comme une bande raccourcie au-dessus de sa face avant. Un objet qui n'a qu'une face
   avant, sans dessus, est faux.
2. **La projection** (scripts/carte/blocs.py) : une hauteur de h px se voit sur h × HAUT (14/16) rangées, une
   profondeur de p px (de l'avant vers le fond) sur p × FOND (10/16) rangées. Un mur plein de 16 de haut et 16
   de fond : 14 px de face et 10 px de dessus. Ce qui avance (une tablette, une sole, un rebord) montre son
   dessus en proportion de son avancée.
3. **Les ouvertures se voient d'en haut** : un foyer, une niche, un bac, une fenêtre en tableau, l'intérieur
   d'un panier ou d'un bassin montrent leur fond (le sol intérieur, plus clair vers l'avant) et leurs parois
   intérieures (la gauche éclairée, la droite dans l'ombre), pas seulement un trou noir.
4. **Lumière en haut à gauche** : les dessus sont les plus clairs, le bord gauche éclairé, le bord droit et les
   dessous dans l'ombre ; contour sombre d'un pixel autour de l'objet.
5. **Nuances** : des rampes de tons interpolés (scripts/carte/nuances.py : `rampe`, `ton`, `bruit` fixe),
   pas 3 ou 4 couleurs plates ; viser des dizaines de nuances par objet (sauf les tissus qu'on repeint : leurs
   tons exacts de data/meubles.json PALETTES).
6. **Le bas de l'image est le bas de la case** (le pied de l'objet) ; un objet qui dépasse vers le haut empiète
   sur la case du dessus, jamais vers le bas. Les motifs qui se répètent d'une case à l'autre (murs, papiers,
   guirlandes, convoyeurs) ont une période qui divise 16 : pas de couture.
7. **Ombres** : les blocs de la ferme n'ont pas d'ombre portée (la scène peint celle du soleil,
   js/carte/ferme/soleil.js) ; les objets des hameaux en ont une, douce, au sol.
8. **Vérifier en jeu** : un aperçu agrandi, puis une capture dans le jeu (le jour, et le soir pour ce qui
   s'allume) avant de proposer le dessin.

## Habitudes du dépôt

- Langue : le code, les commentaires, les messages et les textes du jeu sont en français.
- Les données (data/*.json) se recompilent avec `node scripts/build-data.mjs` (js/data.generated.js) ; les
  atlas avec `python3 scripts/carte/atlas.py` quand une image de meuble change.
- Avant une PR : `node tests/all.mjs` doit finir sur « Tout est vert ».
