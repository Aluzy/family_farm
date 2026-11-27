# Lot 4 — Le remplissage et la recoloration d'une couleur

## Objectif

Deux outils de Piskel : le **pot de peinture**, qui remplit la zone d'une couleur, et **recolorer tous les
pixels de la même couleur**, qui la remplace partout d'un coup, sans tenir compte de leur voisinage.

## Contexte

Le lot 1 est fait. Si le lot 3 est fait, les deux outils restent dans la sélection ; sinon, prévoir le
paramètre `sel` et le brancher plus tard.

## À faire

1. **Le noyau** :
   - `remplir(doc, x, y, rgba, { voisins: 4 | 8, tolerance: 0..255, sel })` : un remplissage par lignes
     (scanline, une pile explicite, aucune récursion), sur le calque courant. Il part des pixels qui ont
     exactement la couleur RVBA du point touché, ou à moins de `tolerance` par composante. La transparence
     (alpha 0) est une couleur comme une autre : tout pixel d'alpha 0 compte comme la même couleur, quel que
     soit son RVB ;
   - `recolorer(doc, rgbaAvant, rgbaApres, { portee: 'calque' | 'frame' | 'tout', tolerance, sel })` : chaque
     pixel égal à `rgbaAvant` (ou dans la tolérance) prend `rgbaApres`. `'tout'` couvre tous les calques de
     toutes les frames (le lot 6 les ajoute ; ici, une seule frame) ;
   - chacun ne fait qu'une entrée d'historique et renvoie le nombre de pixels changés.
2. **Le pot de peinture** (raccourci B) : le clic remplit avec la couleur primaire, le clic droit avec la
   secondaire. Options dans la barre : 4 ou 8 voisins, tolérance (0 par défaut, réglage de 0 à 64).
3. **La recoloration** (raccourci A) : toucher un pixel remplace sa couleur par la couleur active. Options :
   la portée (ce calque, cette frame, tout le document) et la tolérance. Le nombre de pixels changés s'affiche
   un instant.
4. **Depuis une palette** : dans « Couleurs du dessin » (lot 2, s'il est fait), un appui long ou un clic droit
   sur une pastille propose « Remplacer par la couleur active » : le même `recolorer`, sur tout le document.

## Hors périmètre

Le remplissage par motif ou par dégradé, le tramage (hors chantier).

## Critères d'acceptation

- Un remplissage de 512 × 512 (une zone pleine) prend moins de 50 ms dans Chromium et ne dépasse pas la pile.
- Tolérance 0 : seuls les pixels exactement égaux changent ; un anneau fermé arrête le remplissage en 4
  voisins, et le laisse passer par la diagonale en 8 voisins.
- La recoloration touche aussi les pixels séparés de même couleur, et rien d'autre.
- Avec une sélection, aucun pixel hors de la sélection ne change.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : 4 et 8 voisins sur un anneau, transparence, tolérance, limite de
  la sélection, remplir avec la couleur qui est déjà là (rien ne change, pas d'entrée d'historique),
  `recolorer` sur trois portées, 512 × 512 sans débordement de pile.
- Chromium : remplir l'intérieur d'un contour, recolorer un ton dans tout un dessin, annuler.

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `docs/editeur-pixels.md` et
`00-chantier.md`.
