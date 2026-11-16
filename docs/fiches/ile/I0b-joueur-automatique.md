# Fiche I0b — Le joueur automatique remis d'aplomb

## Objectif

Refaire du joueur automatique un instrument de mesure fiable : il joue une partie d'aujourd'hui
jusqu'au bout, et `scripts/simulate.mjs` sort les chiffres dont le chantier a besoin (pièces gagnées et
dépensées par jour, par poste).

## Contexte

- Le constat (`docs/ile.md`, « Les constats ») : en 80 nuits, le joueur appliqué reste au chapitre 3,
  la famille ne mange pas 71 nuits, une vérification sur trois échoue.
- `js/engine/bot.js` (837 lignes), `data/simulation.json` (`PRIORITE`, `PLAN`, stratégies),
  `scripts/simulate.mjs`, `tests/engine/bot.test.mjs`.
- Ce qui a changé depuis son écriture : le départ sur une terre sauvage (`abri-depart.js`,
  `didacticiel.js`), l'Atelier qui fabrique ce qui s'achetait (`atelier.js`), la calèche
  (`caleche.js`), la boîte à nourriture (`repas.js`), les objectifs (`objectifs.js`).
- Les comptes : `js/engine/compta.js` (`state.compta`, 40 lignes au plus), `js/engine/journal.js`.

## À faire

1. **Le diagnostic** d'abord, écrit dans le compte rendu : pourquoi il ne mange pas, pourquoi il
   s'arrête au chapitre 3 (ce qu'il n'achète ou ne fabrique plus).
2. **Le joueur** : il part de la partie neuve réelle (300 pièces, l'abri), fabrique à l'Atelier ce
   dont il a besoin, remplit la boîte à nourriture, vend à la calèche à son passage, suit les
   chapitres. Garder les deux stratégies (appliqué, minimal).
3. **Les comptes de la simulation** : par nuit, les pièces gagnées et dépensées par poste (vente de
   cultures, de plats, de produits ; graines, appareils, technologies, bâtiments), sans la borne de 40
   lignes de `state.compta` (un compteur à part, hors sauvegarde). Le CSV les porte.
4. **Les vérifications** de `simulate.mjs` : garder les trois ; ajouter « le chapitre 7 est atteint
   avant la nuit N » (N réglé dans `data/simulation.json`) et « les pièces en caisse à la nuit 80
   restent sous M fois la dépense des 20 dernières nuits » (le signal de l'argent qui s'empile : il
   peut être en échec aujourd'hui, le dire).
5. **Un résumé** en fin de sortie : revenu moyen par jour par tranche de 20 nuits, les trois premiers
   postes de gain et de dépense.

## Hors périmètre

- Les règles du jeu et les prix (I4). Le port et les villageois : chaque fiche qui les ajoute apprend
  au joueur automatique à s'en servir.

## Critères d'acceptation

- `node scripts/simulate.mjs` : aucune nuit sans repas pour le joueur appliqué, le chapitre 7 atteint,
  code de sortie 0 (hors la vérification « l'argent s'empile » si elle est notée comme un constat).
- `tests/engine/bot.test.mjs` vert ; la suite complète aussi.

## Vérifications et livraison

Celles du README du chantier. Joindre au compte rendu le résumé de la simulation et le CSV (hors
dépôt). Ne pas commiter `simulation.csv` ni `simulation-bonheur.svg`.
