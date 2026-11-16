# Fiche I1a — Le port sur l'île

## Objectif

Poser le port : le seul bâtiment de l'île avec l'abri au début d'une partie. Un quai, une cale et
une petite halle au bord de la mer, au bout de l'île, reliés à la ferme par un chemin. On y
va, on le voit, on entre sous la halle ; le commerce viendra à la fiche I1b.

## Contexte

- `docs/ile.md` (D1, D8, D10) ; `docs/grand-monde.md` (les étapes 4 à 7 : le plan, les lieux, les
  hameaux bâtis) ; `CLAUDE.md` (la vue à 45°, obligatoire).
- Le plan du monde : `js/engine/monde-gen.js` (`fairePlan` : biomes, côte, `lieux`, les chemins et
  leurs prix, `PLAN_MONDE.CHEMINS`), `js/engine/monde.js` (la ferme au centre), `data/monde.json`.
- Les lieux posés : `js/engine/monde-lieux.js` (`LIEUX.CALE`, `PONTON` : la cale et le ponton existent
  déjà pour la pêche), `js/carte/ferme/lieux-monde.js`, `scripts/carte/lieux.py`.
- Les bâtiments faits de blocs : `js/engine/monde-hameaux.js` (une maison : emprise, porte, pièces),
  `js/carte/ferme/hameaux.js`, `js/carte/ferme/toits.js`, `scripts/carte/hameaux.py`.
- Ce qui s'écarte d'un lieu : `monde-vegetation.js`, `monde-roches.js`, `monde-faune.js`.
- Le Worker : `js/monde-worker.js` (le plan et les éléments y sont calculés).

## À faire

1. **L'emplacement** (déterministe, dans `fairePlan`, réglé dans `PORT.PLAN` de `data/village.json`) :
   une case de côte marchable, la plus éloignée de la ferme parmi celles qu'un chemin à pied peut
   joindre (pas de traversée de montagne obligatoire : borner le prix du chemin), avec assez de plage
   et d'eau libre devant pour le quai. `plan.lieux.port = { case, sens, quai, halle }`.
   Avec `VILLAGE.ACTIF: false`, rien n'est posé.
2. **Le chemin** de la sortie de la ferme au port, tracé comme les autres (`PLAN_MONDE.CHEMINS`). Les
   boucles vers les hameaux restent pour l'instant (I7e les retire).
3. **Le plan du port** : un quai de planches sur l'eau (8 à 12 cases), une cale, une halle ouverte
   (un toit sur poteaux, un comptoir, une balance), des caisses et des tonneaux sur le quai, un mât
   à fanion, deux lanternes, un panneau. Le prévoir en **niveaux** (1 à 5 : I1c les fera payer) :
   au niveau 1, le quai court, la halle et le panneau seulement.
4. **Les dessins**, vus de haut à 45°, dans le style des blocs : le quai et ses pieux, le comptoir, la
   balance, les caisses et les tonneaux, le fanion, le panneau. Réutiliser murs, toits, portes et
   lanternes existants. Compter les couleurs (règle 5 de `CLAUDE.md`).
5. **La pose et la scène** : le sol du port peint dans les régions ; végétation, rochers et faune
   s'en écartent ; le toit de la halle s'efface quand on entre ; les lanternes
   s'allument le soir ; on marche sur le quai, on bute sur le comptoir et les caisses ; on ne peut ni
   casser ni bâtir dans l'emprise du port.
6. **La découverte** : le port est connu dès le départ (il paraît sur la carte du monde et la
   boussole, `monde-vu.js`, `monde-carte.js`, `js/carte/ferme/boussole.js`), le chemin aussi.
7. **Les tests** (`tests/engine/village-port.test.mjs`) : un port pour chaque graine d'un lot de 50 ;
   sur la côte, hors de la ferme, joignable à pied depuis la sortie de la ferme ; identique dans le
   Worker et en calcul direct ; rien ne le chevauche ; avec `ACTIF: false`, le plan d'avant, inchangé.

## Hors périmètre

- Le commerce (I1b), le bac et les niveaux payés (I1c), le chemin modifiable (I2).
- Les hameaux et la calèche : ils restent en place jusqu'à I7e.

## Critères d'acceptation

- Dans Chromium, avec `?village=1` : depuis l'abri, on suit le chemin jusqu'au port, on marche sur le
  quai, on entre sous la halle (le toit s'efface) ; le soir, les lanternes s'allument ; la carte du
  monde montre le port dès le premier jour.
- Trois graines donnent trois ports plausibles ; la fluidité ne baisse pas de façon notable.

## Vérifications et livraison

Celles du README du chantier. Mesurer la durée d'une région avec le port dans le Worker
(avant/après). Captures : le port de jour et de nuit, la halle, le quai, la carte du monde, trois
graines.
