# Le châtaignier (lot 4 des évolutions du crafting)

Un grand arbre des forêts du grand monde, où l'on cueille les châtaignes de la crème de marrons (la recette ne change
pas : 4 châtaignes et du sucre ou du miel).

## Où il pousse

Dans le biome de la forêt, sur les sols de feuilles et de mousse : **un feuillu sur seize** y devient un châtaignier
(`data/monde.json`, `VEGETATION.REMPLACE` ; `js/engine/monde-vegetation.js`). Le tirage se fait d'après la case, après
celui de la sorte : le châtaignier prend la place d'un feuillu, avec les mêmes cases fermées et le même écart. **Aucun
arbre ne bouge** : sur 108 régions de trois mondes, 306 feuillus sont devenus des châtaigniers, sans autre différence.
Le générateur passe au numéro 4 (`GENERATEUR_VERSION`), et la migration 80 → 81 y fait passer les parties du 3.

## Ses deux gestes

`RECOLTE.SORTES.chataignier` : le geste de la sorte est **couper** (la hache, trois coups, du bois : comme un feuillu ;
les bûcherons des hameaux l'abattent aussi), et son second geste, **`aussi`**, est **cueillir** : à la main, **3 à 5
châtaignes**, puis l'arbre reste là sans ses bogues (son dessin `apres`) et en porte de nouveau **4 à 7 jours** plus
tard. Un tiers des châtaigniers n'ont pas encore de bogues (la variante 2) : rien à cueillir.

La carte choisit le geste (`js/carte/ferme/recolte-monde.js`) : la hache en main, couper ; sinon, cueillir. Le moteur
(`js/engine/monde-recolte.js`, `regleGeste`) lit la règle du geste demandé ; un arbre cueilli s'abat encore, et garde
ses coups reçus avec son état cueilli.

## Le dessin

Le style **F3** : l'arbre de la ferme (`scripts/carte/originaux/arbre_feuillu.png`), son feuillage foncé (luminosité ×
0,66, saturation × 0,9, un vert un peu bleuté), le tronc un peu plus sombre ; ses bogues brunes, ouvertes, la
châtaigne au milieu (deux dessins), et cueilli, sans ses bogues (`scripts/carte/vegetation.py`, `chataignier`).

Tests : `tests/engine/chataignier.test.mjs`.
