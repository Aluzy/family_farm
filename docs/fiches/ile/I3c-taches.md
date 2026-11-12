# Fiche I3c — Les tâches attribuées

## Objectif

Permettre au joueur d'attribuer une tâche à chaque villageois, qui la fait chaque jour : il travaille
à son poste, ce qu'il produit va au coffre de la ferme. C'est le cœur de la nouvelle boucle.

## Contexte

- I3a (le modèle), I3b (la scène, les horaires).
- Le précédent le plus proche : `js/engine/compagnon.js` (484 lignes : arroser, récolter, nourrir,
  cuisiner, ramasser ; ses bornes par jour, sa faim), `data/general.json` (`COMPAGNON`),
  `js/ui/compagnon.js`, `js/carte/ferme/compagnon.js`, la fiche 19.
- Les métiers des hameaux, pour les rendements : `data/monde.json` (`HABITANTS.METIERS` : `ACTIONS`
  par jour, `donne`, `une_de`, `chance`).
- Les gestes du joueur, que la tâche rejoue : `crops.js` (arroser, semer, récolter), `animals.js`
  (nourrir, traire, tondre, les œufs), `orchard.js`, `outils.js` (hache, pioche, faux, canne),
  `monde-recolte.js` (cueillir, ramasser dans le monde), `kitchen.js`, `ruches.js`,
  `botteleuse.js` ; les gestes dessinés : `js/carte/gestes.js`.
- Les automatisations, à ne pas doubler : `js/engine/automation.js`, `techtree.js` (arrosage, robot
  de récolte et de semis, nourrissage).

## À faire

1. **Les tâches** (`data/village.json`, `TACHES`) : champs (arroser, récolter, ressemer), bêtes
   (nourrir, œufs, traire, tondre), verger et ruches, bois, pierre et minerai, pêche, cueillette,
   fauchage et paille, cuisine (les plats de la boîte à nourriture), **navette** (porter au port ce
   que le joueur marque « à vendre », par les chemins, avec la brouette ou la charrette d'I2).
   Chacune : `ACTIONS` par jour, ce que donne une action, l'outil qu'il faut, le lieu.
2. **Le moteur** (`js/engine/taches.js`) : `attribuer(state, villageois, tache)` ; chaque nuit (et
   au fil de la journée pour ce qui se voit), le villageois fait ses actions par les **mêmes
   fonctions** que le joueur (pas de règle parallèle : une carotte récoltée par lui est une carotte
   récoltée), sans coût d'énergie pour le joueur, avec les bornes du monde (un arbre coupé repousse
   comme les autres, le quota de pêche du jour vaut pour lui). En repos (I3a), il ne fait rien.
3. **Les outils** : une tâche demande son outil ; le joueur le fabrique à l'Atelier et le donne au
   villageois (un appui sur lui, « donner un outil »), qui le garde ; on peut le reprendre. Sans
   outil, la tâche attend et le dit. Un outil amélioré (la pioche en cuivre, en fer) lui profite
   comme au joueur.
4. **Les automatisations** : une parcelle arrosée par l'asperseur n'est pas arrosée deux fois ; le
   robot et le villageois ne se disputent pas une récolte (le premier passé la prend). Écrire la
   règle dans `docs/ile.md`.
5. **La scène** : il va à son poste aux heures de travail et y fait le geste (`gestes.js`) ; ce qui
   se passe sous les yeux du joueur compte une fois (la règle de la fiche 7b).
6. **L'interface** : la fiche du villageois a un bouton « Tâche » (la liste, celles qu'il peut faire,
   ce qui manque) ; une vue d'ensemble « qui fait quoi » ; un appui long sur un poste (le
   poulailler, un arbre, la mare) propose « confier à… ».
7. **Le journal** : chaque jour, `{ jour, tache, actions, produit: { objet: n }, mange }` dans le
   journal du villageois (7 jours) ; I3d le lira.
8. **Le joueur automatique** : il attribue les tâches (d'abord ce qui nourrit, puis ce qui se vend).
9. **La sauvegarde** : la tâche et l'outil confié ; format + 1, migration, test. Les commandes
   `villageois.attribuer` et `villageois.outil` dans `commandes.js`.
10. **Les tests** (`village-taches.test.mjs`) : chaque tâche produit ce que dit `TACHES`, dans les
    bornes du monde ; sans outil, rien ; en repos, rien ; pas de double récolte avec le robot ; le
    journal ; `compagnon.test.mjs` reste vert.

## Hors périmètre

- La part du villageois et la valeur de ce qu'il produit (I4) ; la transformation et les commerces
  (lot 5) ; les postes préférés (I6c).

## Critères d'acceptation

- Dans Chromium : on confie une hache et la tâche « bois » ; le villageois part couper, le bois
  arrive au coffre ; on le passe aux bêtes, il trait et tond ; la navette vide le coffre « à vendre »
  au port.
- La simulation avec deux villageois : la production par jour de chacun, donnée dans le compte rendu.

## Vérifications et livraison

Celles du README du chantier. Captures : la liste des tâches, « qui fait quoi », trois gestes de
travail, la navette au port.
