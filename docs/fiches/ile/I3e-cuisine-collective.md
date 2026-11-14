# Fiche I3e — La cuisine collective et le garde-manger commun

## Objectif

À la demande de l'utilisateur, mot pour mot : « un ou plusieurs villageois peuvent être assignés à une cuisine
collective ou une boîte à nourriture ou un frigo collectif permet aux habitants de se nourrir ». Un garde-manger commun,
une cuisine du village où travaillent un ou plusieurs villageois, la tablée du soir ; et l'équilibrage alimentaire du
village qui va avec : dans `node scripts/simulate.mjs --village`, le village restait bloqué à trois villageois (la
réserve commune vide vers la nuit 50, des villageois mal nourris au repos, pas de quatrième, pas de second commerce, le
palier 7 jamais franchi).

## Contexte

- La boîte à nourriture et la faim de la famille (`js/engine/repas.js`) ; les repas des villageois (`mangerAuRangement`,
  `reserveRangement`, `VILLAGE.ARRIVEE.RESERVE_JOURS`) ; le réfrigérateur (`js/engine/fridge.js`).
- La tâche `cuisine` (I3c, `TACHES.LISTE.cuisine`) ; le tableau (I3d) ; le boulanger (I5c) ; les provisions et le panier
  (I4, `bourse.js`) ; la table commune et les repas assis (I3b, `villageois-journee.js`) ; le repas apporté (I6b).
- Le joueur automatique (`bot.js`), la simulation (`scripts/simulate.mjs --village`).

## À faire

1. **Le garde-manger commun** : le joueur rend la boîte à nourriture ou le réfrigérateur posés « commun » au village
   (un appui sur le bloc, un bouton de sa fenêtre). Les villageois y mangent ; le joueur y dépose ; le travail des
   villageois (champs, verger, pêche, bêtes…) y dépose ce qu'il produit qui se mange. Ce qui périt garde sa fraîcheur
   au réfrigérateur, pas dans la boîte. Dire comment se règle ce que le travail y dépose.
2. **La cuisine du village** : une cuisinière ou un four désignés « du village » ; un ou plusieurs villageois y sont
   affectés (la tâche `cuisine`, gardée ou devenue celle du village : motiver le choix) ; ils y font, avec ce que
   contient le garde-manger, des plats qui nourrissent mieux et comptent dans le bonheur ; les plats retournent au
   garde-manger ; plusieurs cuisiniers font plus de plats. On mange ensemble à la table commune aux heures des repas.
   Visible : les cuisiniers au travail, la vapeur, la tablée.
3. **Les blocs existants** (cuisinière, four, frigo, boîte, table) ; pas de nouveau dessin sans nécessité.
4. **L'interface** : désigner d'un appui ; voir le garde-manger et ce qui y manque ; voir qui cuisine ; une ligne dans
   le tableau des villageois ; l'aide et le livre de l'île.
5. **Le joueur automatique** : un garde-manger commun, un ou deux cuisiniers, des dépôts ; le village grandit au-delà
   de trois villageois, ouvre un second commerce, vise le palier 7. Les chiffres avant et après ; si le plafond des
   commerces ou l'arrivée des villageois reste le verrou, un réglage chiffré proposé, pas changé en douce.
6. **La sauvegarde** : format + 1, sa migration et son test.
7. **Les tests** : le garde-manger, les dépôts, la fraîcheur, la cuisine du village, la tablée, le tableau, la
   journée, la sauvegarde, les commandes, le joueur automatique, éteint.

## Hors périmètre

- Un nouveau dessin (une marque « commun ») : aucun n'a été nécessaire.
- Changer le plafond des commerces ou des villageois, les objectifs du palier 7 : proposés, pas changés.

## Critères d'acceptation

- Dans Chromium (`jeu.html?village=1`) : désigner le garde-manger et la cuisine ; les cuisiniers au travail (la
  vapeur) ; le repas pris ensemble à la table commune ; le garde-manger qui se remplit puis se vide ; la ligne du
  tableau.
- `node scripts/simulate.mjs --village` : plus de trois villageois, un second commerce.

## Vérifications et livraison

Celles du README du chantier. Éteint, le CSV de la simulation est le même octet pour octet.

## Ce qui est fait

Voir `docs/ile.md`, « Le garde-manger commun et la cuisine du village (I3e, fait) » : les choix (la tâche `cuisine`
devient la cuisine du village ; les dépôts automatiques jusqu'à une réserve réglable ; la boîte commune qui reste au
village le réfrigérateur acheté), les réglages (`VILLAGE.GARDE_MANGER`, `SIMULATION.VILLAGEOIS.GARDE_MANGER`), les
chiffres de la simulation avant et après, le réglage proposé pour le palier 7, ce qui reste.
