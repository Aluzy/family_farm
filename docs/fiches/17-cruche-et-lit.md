# Fiche 17 — La cruche (jauge, aller au puits) et choisir son lit

À faire après la fiche 16 (mêmes trajets).

## Objectif

1. **Une jauge pour la cruche** : l'eau qui reste dans la cruche se voit d'un coup d'œil, dans le
   style du HUD.
   - Une petite jauge près de l'outil en main, ou sur l'icône de la cruche dans la barre
     d'outils, au choix motivé.
   - Elle baisse à chaque arrosage et se remplit au puits.
   - Voir `js/engine/outils.js` (la cruche, sa contenance) et la barre d'outils.
2. **Remplir la cruche, c'est aller au puits** : toucher le puits (ou « Remplir ») fait marcher le
   personnage jusqu'au puits par un vrai trajet, sans traverser les murs (fiche 16). Le geste de
   remplir se joue, puis la cruche est pleine.
   - Si le puits est trop loin ou inaccessible, un message clair.
3. **Choisir son lit** : toucher un lit ouvre une petite fenêtre « Tu veux choisir ce lit ? »
   (Oui / Non).
   - Oui : ce lit devient celui du personnage principal (`sleepTarget` dans
     `js/engine/night.js` et les lits des membres). Il y va pour dormir, et le membre qui
     l'avait reçoit un autre lit libre.
   - Le choix est sauvegardé. Si le format de sauvegarde change, format + 1 avec migration et
     test.

## Critères d'acceptation

- Dans Chromium :
  - la jauge baisse en arrosant ;
  - toucher le puits fait marcher le personnage jusqu'à lui, puis remplit la cruche ;
  - toucher un lit pose la question, et Oui en fait le lit du personnage ;
  - la nuit, il y dort.
- Tests : la jauge, le remplissage seulement au puits, le choix du lit et sa sauvegarde.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- ce qui a été fait ;
- les vérifications ;
- 4 à 6 captures.
