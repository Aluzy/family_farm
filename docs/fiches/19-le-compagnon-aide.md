# Fiche 19 — Le compagnon aide à la ferme

À faire après les fiches 16 et 17.

## Objectif

Le compagnon du personnage principal (l'autre adulte) prend des initiatives à la ferme, de
lui-même, selon l'heure, ses jauges et ce qui manque.

- **Arroser** quelques légumes qui ont soif (pas tout le champ). Il va au puits remplir sa cruche
  si elle est vide, comme le personnage depuis la fiche 17.
- **Faire à manger** : préparer un repas à la cuisinière quand la famille a faim et qu'il y a de
  quoi cuisiner.
- **Ramasser** un peu de bois ou de cailloux autour de la ferme.

Chaque action se voit sur la carte (trajet, geste existant de `js/carte/gestes.js`) et compte
dans le jeu : la plante arrosée, le repas dans la boîte ou le frigo, le bois dans l'inventaire.

Les actions sont réglées dans `data/` : fréquence, limites par jour, énergie ou faim qu'elles
coûtent. Elles restent modestes : le compagnon aide, il ne joue pas à la place du joueur.

Une option permet de le laisser faire ou non. Une petite bulle ou notification dit ce qu'il a
fait.

## Contexte

- `js/famille-ferme.js`, `js/engine/family.js`, `js/engine/repas.js`, les cultures
  (`js/engine/crops*`), `js/engine/ramassage.js`.
- `js/engine/robot.js` : le robot fait déjà des tâches à la ferme, s'en inspirer.
- La nuit ou en absence du joueur, les actions sont calculées par le moteur, sans dessin.

## Critères d'acceptation

- Dans Chromium, sur une journée : le compagnon arrose quelques plantes, cuisine un repas et
  ramasse du bois, chaque fois visible et compté.
- Le joueur automatique atteint les chapitres comme avant.
- Tests : chaque action et ses limites, l'option.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- les actions et leurs règles ;
- les vérifications ;
- 4 à 6 captures.
