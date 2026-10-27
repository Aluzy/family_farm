# Fiche 20 — La marche des personnages

À faire après les fiches 16 à 19.

## Objectif

Rendre la marche de tous les personnages plus vivante et plus juste : le personnage principal, la
famille, les habitants et le cocher.

- Les cycles de pas (de face, de dos, de profil) avec un balancement des bras, un léger
  rebond du corps, des pieds qui se posent bien.
- Un rythme d'images accordé à la vitesse de marche (pas de glissade).
- Une transition propre entre l'arrêt et la marche, et entre les directions.
- Les diagonales lisibles.

## Contexte

- Les planches de personnages (`assets/personnages/`, `cases.json`) et leurs scripts
  (`scripts/personnage/`).
- L'animation sur la carte : `js/fermier.js`, `js/famille-ferme.js`,
  `js/carte/ferme/habitants.js`.
- La vitesse (cheval, bottes de la fiche 11).

## À faire

- Comparer avant et après en grand, puis en mouvement (des captures image par image, ou un GIF).
- Garder les tailles et les clés des cases si possible, pour ne pas toucher au reste.

## Critères d'acceptation

- Dans Chromium, la marche est fluide dans les 4 directions, pour un adulte et un enfant, à pied
  et à des vitesses différentes, sans glissade.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- ce qui a changé dans les dessins et l'animation ;
- les vérifications ;
- les planches avant/après et des captures.
