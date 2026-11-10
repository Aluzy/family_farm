# Fiche 28 — Les calculs hors du fil principal : rives, encyclopédie, rattrapage, longues tâches découpées

Chantier « Phaser 4 », piste 5 du rapport (première moitié : les calculs ; la peinture du sol et la teinte
de l'herbe sont la fiche 29).

## Objectif

Rendre l'écran réactif pendant le chargement : sortir du fil principal les calculs sur des grilles et le
moteur ponctuel, et découper ce qui doit y rester en tâches courtes.

## Contexte

- Ce qui reste sur le fil principal, mesuré (`docs/perf.md`, « Le chargement : où passent les 8 s »,
  processeur ralenti ×4) :

  | Travail | Coût | Où |
  |---|---|---|
  | Rives et berges de l'eau | ≈ 0,5 s | `js/carte/eau.js` (le champ des distances à la terre, `eauRive`), appelé par `sol.js paintAnimArea` et `js/carte/ferme/eau.js syncEau` |
  | Encyclopédie relue au chargement | 0,33 s | `majEncyclopedie` (`js/engine/encyclopedie.js`), `decouverte.js` |
  | Rattrapage hors ligne (8 h) | 17 ms sur ordinateur, ≈ 80 ms sur téléphone | `simulateOffline` (`js/engine/offline.js`), appelé par `js/ui/loop.js` (`catchUp`) |

- Le Worker du monde : `js/monde-worker.js` (le sol, la végétation, les roches, les lieux, les hameaux, la
  tournée de la calèche, l'image de la carte du monde ; tableaux transférés ; repli sans Worker,
  `js/ui/monde-sol.js`). Le moteur est pur (aucun DOM) : il se charge dans un Worker module.
- Phaser ne peut pas aller dans un Worker (il lui faut le DOM et son canvas) : on lui livre des résultats
  prêts.
- Faire tourner tout le moteur dans un Worker n'est pas visé : l'interface lit `state` de façon synchrone
  dans des dizaines de modules.

## À faire

1. **Les rives dans le Worker.** Isoler dans un module pur (`js/carte/eau-champ.js` ou dans
   `js/engine/`) le calcul du champ de l'eau (distance à la terre, rive, berge) : une fonction de grilles
   d'entiers vers des `Uint8Array`. Le Worker du monde (ou un second Worker « carte ») le calcule et
   transfère le résultat ; `eau.js` ne fait plus que le poser dans sa texture. Repli sans Worker : le même
   module, appelé sur le fil principal.
2. **L'encyclopédie différée** : `majEncyclopedie` au chargement passe dans `requestIdleCallback` (repli :
   `setTimeout` de 2 s), sans changer ce qui est découvert (une page nouvelle s'annonce un peu plus tard,
   jamais perdue).
3. **Le rattrapage hors ligne dans un Worker** quand l'absence dépasse 1 h : l'état envoyé (copie
   structurée), `simulateOffline` dans le Worker, l'état et le rapport renvoyés et remplacés d'un coup ;
   l'écran de chargement attend la réponse (au plus 3 s, sinon le calcul sur le fil principal comme
   aujourd'hui). Les tests du moteur prouvent que le résultat est le même octet pour octet.
4. **Les longues tâches découpées** : dans ce qui reste au chargement (les pièces, l'étage et les toits,
   `syncEau` des étendues hors vue), rendre la main entre deux morceaux avec `scheduler.yield()` (repli :
   `setTimeout(0)`) ; viser des tâches de moins de 50 ms sur le téléphone.

## Hors périmètre

- La peinture des régions et la teinte de l'herbe (fiche 29).
- Le découpage du bundle et le chargement à la demande (piste 3 de `docs/chantier-allegement.md`).

## Critères d'acceptation

- Le chargement reproduit (Chromium, ralenti ×4, la sauvegarde du jour 75) : le temps jusqu'à la vue
  dessinée ne monte pas ; la plus longue tâche du fil principal après l'affichage baisse ; chiffres dans
  la PR et dans `docs/perf.md`.
- Mêmes rives au pixel près (captures d'un étang et de la côte avant et après).
- Un test du moteur : `simulateOffline` dans un Worker (ou sa fonction d'aller-retour, sans Worker en
  Node) donne le même état que sur le fil principal.
- Sans Worker (le repli forcé), le jeu marche comme avant.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium : profil du chargement, ralenti ×4 ; une
sauvegarde vieille de 8 h (`t` reculé) pour le rattrapage.

## Livraison

Un commit ; `docs/perf.md` (le chargement) et `docs/architecture-phaser.md` (ce que font les Workers) mis
à jour.
