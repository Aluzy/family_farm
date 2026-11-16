# Fiche I1b — Le commerce au port

## Objectif

Faire du port l'interface économique du jeu : sous la halle, on vend ce que la ferme produit et ce
qu'on trouve sur l'île, et on achète les semences. Avec `VILLAGE.ACTIF`, la calèche ne commerce plus.

## Contexte

- `docs/ile.md` (D1) ; la fiche I1a (le port, sa halle, son comptoir).
- Le commerce d'aujourd'hui : `js/engine/market.js` (`sellPrice`, `buyPrice`, les cours,
  `encaisserVente`, `isBuyable`, `payerSemences`), `js/engine/caleche.js` (la malle, les commandes de
  semences, `PORTEE`), `js/ui/caleche.js` (662 lignes : la fenêtre, ses onglets), `js/ui/commandes.js`,
  `js/engine/devices.js` (`marcheOuvert`, `marcheFerme`), `data/general.json` (`MARCHE`).
- Ce qui parle de la calèche : `js/engine/campaign.js` (l'objectif `caleche`), `objectifs.js`,
  `didacticiel.js`, `alerts.js`, `bot.js`, `data/niveaux.json` (l'élément `marche`),
  `js/ui/aide.js`.
- Les commandes du moteur : `js/engine/commandes.js` (chaque geste du joueur y est nommé).

## À faire

1. **Le moteur** (`js/engine/port.js`) : `portOuvert(state)` (le joueur est à `PORT.PORTEE` cases du
   comptoir, de `PORT.HEURES[0]` à `PORT.HEURES[1]` h), `vendreAuPort`, `acheterAuPort`, qui
   s'appuient sur `market.js` sans le dupliquer : mêmes prix de vente, mêmes cours des semences. Les
   écritures de `compta.js` disent « Port : … ». Les commandes `port.vendre` et `port.acheter` dans
   `commandes.js`.
2. **Ce qui se vend et s'achète** au niveau 1 du port : tout ce qui se vendait à la calèche ; à
   l'achat, les semences de départ et celles que le niveau du joueur a débloquées. Les produits des
   hameaux ne sont plus vendus (ils viendront des villageois).
3. **La fenêtre** (`js/ui/port.js`, d'après `js/ui/caleche.js`) : deux onglets, Vendre et Acheter ;
   loin du port, elle dit où il est et ses heures. Un appui sur le comptoir l'ouvre.
4. **Avec `ACTIF`** : la calèche ne vend ni n'achète plus (elle roule encore jusqu'à I7e ; sa fenêtre
   renvoie au port) ; `marcheOuvert` lit le port ; l'objectif de campagne `caleche` compte les ventes
   au port ; l'aide et les alertes parlent du port.
5. **Le joueur automatique** : il va au port quand son stock dépasse un seuil (une sortie par jour au
   plus, comptée en temps d'éveil d'après la distance), y vend et y achète ses graines.
6. **Les tests** (`tests/engine/village-commerce.test.mjs`) : vendre et acheter au port ; refus loin
   du comptoir ou hors des heures ; les prix égaux à ceux de `market.js` ; la calèche inerte avec
   `ACTIF` ; rien ne change avec `ACTIF: false` (`caleche.test.mjs`, `marche.test.mjs` verts).

## Hors périmètre

- Le bac, les commandes et le catalogue d'import (I1c) ; les prix (I4).
- La sauvegarde : aucune forme nouvelle ici (pas de migration).

## Critères d'acceptation

- Dans Chromium, `?village=1` : on porte une récolte au port, on la vend sous la halle, on achète des
  graines, les pièces et les comptes suivent ; loin du port, la fenêtre dit où aller.
- `node scripts/simulate.mjs --village` (une option qui allume le réglage) joue 80 nuits sans nuit
  sans repas.

## Vérifications et livraison

Celles du README du chantier. Captures : la fenêtre du port (présent, absent), une vente, les comptes.
