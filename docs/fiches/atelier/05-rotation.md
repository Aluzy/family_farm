# Lot 5 — La rotation et le retournement

## Objectif

Tourner et retourner la sélection, ou tout le calque s'il n'y a pas de sélection : par quarts de tour, sans
perte, comme Piskel ; et d'un angle libre, avec un aperçu avant de valider.

## Contexte

Le lot 3 est fait : la sélection et son calque flottant (`lever`, `poser`). La rotation agit sur ce flottant.

## À faire

1. **Le noyau** :
   - `quartDeTour(flottant, sens)` (90° horaire ou antihoraire) et `demiTour(flottant)`. Ils sont exacts : la
     largeur et la hauteur s'échangent, et quatre quarts de tour rendent l'original ;
   - `miroir(flottant, 'horizontal' | 'vertical')` ;
   - `tourner(flottant, degres)` pour un angle libre : chaque pixel d'arrivée prend le pixel de départ le plus
     proche (pas de lissage, pas de nouvelle couleur). La boîte grandit pour tout contenir et le centre reste
     en place. L'arrondi est fixé et documenté, pour qu'un même angle donne toujours la même image ;
   - **le recentrage** : un rectangle qui n'est pas carré tourne autour de son centre ; si le centre tombe
     entre deux pixels, on arrondit vers le haut et la gauche. La même règle vaut partout, documentée.
2. **L'interface** (une barre « Transformer », active avec ou sans sélection) : ⟳ 90°, ⟲ 90°, 180°, ⇋ miroir
   horizontal, ⇅ miroir vertical, et « Angle… ». L'angle se règle avec un curseur de −180° à 180° par pas
   de 1°, ou se saisit. L'aperçu se met à jour en direct ; Valider ou Annuler. Sans sélection, la
   transformation porte sur tout le calque courant, à sa taille (ce qui sort du cadre est perdu, avec un
   avertissement avant de valider).
3. **Les raccourcis** : Maj+R quart de tour horaire, Maj+Alt+R antihoraire, Maj+H miroir horizontal, Maj+V
   miroir vertical.
4. **Toutes les frames** (si le lot 6 est fait) : une case « appliquer à toutes les frames », pour la même
   sélection sur chaque frame.

## Hors périmètre

Une rotation lissée (RotSprite ou autre), le redimensionnement de la sélection (hors chantier).

## Critères d'acceptation

- Quatre quarts de tour, ou deux miroirs du même sens, rendent l'image identique au pixel près.
- Un angle libre n'ajoute aucune couleur absente du départ, et l'alpha reste 0 ou celui d'un pixel de départ.
- Toute transformation validée ne fait qu'une entrée d'historique.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : quarts de tour d'un rectangle 3 × 5 (taille, centre, aller-retour),
  miroirs, angle libre (0° et 360° rendent l'original, aucune couleur nouvelle, même résultat sur deux appels).
- Chromium : tourner une sélection de 90° puis de 30°, annuler et rétablir, retourner tout un calque.

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `docs/editeur-pixels.md` et
`00-chantier.md`.
