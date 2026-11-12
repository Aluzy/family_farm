# Fiche I8b — La vocation « ferme productive »

## Objectif

Ouvrir la seconde vocation : une grosse économie, une ferme presque industrielle et automatisée. Des
contrats d'export au port, des volumes, des machines, des villageois qui les servent.

## Contexte

- I8a (le socle des vocations : `vocations.js`), I1c (le bac, les commandes, les niveaux du port), I4
  (les prix et la part), I3c (les tâches).
- L'automatisation qui existe : `data/techtree.json` (37 technologies, 7 branches),
  `js/engine/techtree.js`, `automation.js` (arrosage, robot de récolte et de semis, nourrissage),
  `chaines.js` et `data/` (`CHAINES` : pressoir, centrifugeuse, mixeur, chaudron, tonneau,
  ensacheuse), `distributeur.js`, `botteleuse.js`, `energy.js` (panneau, batterie, pompe, citerne).
- Le robot : `ROBOT` (`data/general.json`), ses paliers de batterie (jusqu'à 30 000 pièces).
- D5 (`docs/ile.md`) : les commerces restent artisanaux ; le volume est ici.

## À faire

1. **La production** : un score qui monte avec la valeur exportée par mois de lune, le nombre de
   machines en marche, l'énergie produite, les contrats honorés. Enregistré dans `VOCATIONS`.
2. **Les contrats d'export** (au port, à partir d'un niveau) : de grosses commandes sur plusieurs
   passages du bac (300 pains en un mois, 200 fromages), avec une prime ; le niveau du port fixe la
   taille des contrats qu'on vous propose (une raison de le monter). Manqué, un contrat s'efface sans
   pénalité.
3. **Les villageois et les machines** : une tâche « conduire une chaîne » (alimenter, vider,
   relancer) ; un villageois qui sert une machine en tire plus qu'un joueur seul n'en a le temps.
   Le tableau (I3d) compte l'énergie consommée dans le coût.
4. **La navette en volume** : plusieurs villageois à la navette, la charrette, puis un **quai de
   chargement** sur la ferme qui regroupe les envois (un bloc, un niveau du port).
5. **Les paliers** débloquent : des machines plus grandes, un second robot, des cultures de plein
   champ en import, des contrats plus gros. Rien qui touche à la convivialité.
6. **L'équilibre entre les deux vocations** : à vérifier par la simulation avec deux stratégies du
   joueur automatique (« village », « production ») : la production gagne plus de pièces, le village
   plus de bonheur et de liens ; aucune des deux n'est sans intérêt. Donner les chiffres.
7. **Le ton** : une ferme productive reste propre et jolie (pas de pollution, pas de malus de
   bonheur) : c'est un autre goût de jeu, pas une faute.
8. **Les tests** : le score ; un contrat sur trois passages ; la tâche « conduire une chaîne » ;
   `chaines.test.mjs`, `automatisation.test.mjs` verts.

## Hors périmètre

- De nouvelles machines dessinées (au plus une : le quai de chargement) ; la troisième vocation.

## Critères d'acceptation

- Dans Chromium : un contrat de 100 pains est honoré en trois passages du bac avec un boulanger, une
  chaîne et deux navettes ; l'onglet « Vocations » montre les deux scores.
- La simulation à deux stratégies : les chiffres, et la conclusion sur l'équilibre.

## Vérifications et livraison

Celles du README du chantier. Captures : l'onglet des contrats, une chaîne servie par un villageois,
le quai de chargement, les deux scores.
