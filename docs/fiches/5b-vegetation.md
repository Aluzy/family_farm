# Fiche 5b — La végétation des biomes

## Objectif

Peupler le monde autour de la ferme de sa végétation, biome par biome, dans le style de la ferme
(vue de haut à 45°, pixel art) : des forêts denses où l'on passe derrière les arbres, des
sous-bois, de la bruyère et des ajoncs sur la lande, des roseaux et des joncs dans le marais, des
oyats sur la dune, des sapins épars en montagne, des arbres isolés et des fleurs dans la prairie.
Décor seulement : couper, cueillir et ramasser dans le monde viendront à l'étape 6.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 4 et 5a faites), `docs/fiches/README.md`, puis :
  - le monde : `js/engine/monde-gen.js`, `data/monde.json` (biomes, plan), `js/engine/monde-sol.js`
    (les sols et leurs taches, `caseMarchable`), `js/monde-worker.js`, `js/ui/monde-sol.js` (le
    Worker, le cache par région) ;
  - la scène : `js/carte/ferme/sol.js` (`paintMonde`, `syncRegions`), `js/carte/ferme/decor.js`
    (arbres de la ferme : une image par arbre rangée selon son pied, transparence quand le
    personnage passe derrière : `stepOccluders`, `couvre`, masques ; création par région :
    `placeInRegion`, `showObj`, `dropObj` ; `cullDecor`), `js/carte/ferme/soleil.js` (ombres
    portées), `js/carte/nature.js` (`NATURE`, l'herbe haute qui penche : `CarteKit.herbe`),
    `js/fermier.js` (grille de marche, `freeAt`) et `js/ambient-life.js` (feuilles qui tombent) ;
  - les dessins : `scripts/carte/arbre_clair.py`, `scripts/verger/arbres.py`,
    `scripts/carte/herbe_haute.py`, `scripts/carte/herbe_deco.py`, `scripts/carte/rochers.py`,
    `scripts/pixel.py`, `scripts/carte/commun.py`, `scripts/carte/blocs.py` (`boite()`, la vue de
    haut à 45° : hauteur h → h × 14/16, profondeur p → p × 10/16) ; les arbres et buissons de la
    ferme sont dans la planche de la carte (`js/engine/planche.js` : `pin`, `arbre`,
    `buisson_rond`, `buisson_large`).
- Point d'attention noté à l'étape 3 : les arbres de la ferme sont des groupes de tuiles dans des
  couches de la carte, avec un identifiant tiré de leurs cases (`terrain-carte.js`, ids
  « colonne,rangée » gardés dans la sauvegarde). La végétation du monde ne doit **pas** se fondre
  avec eux : la poser comme des objets à part (une liste par région, avec position et sorte),
  pas dans les couches de tuiles de la ferme, et rien sur la ferme.

## À faire

1. **Les dessins** (scripts Python dans `scripts/carte/`, planches dans `assets/`, relancer un
   script redonne la même image) : pour chaque biome, une petite famille de plantes avec leurs
   variantes, cohérente avec les arbres de la ferme (comparer côte à côte) :
   - forêt profonde : grands feuillus (plusieurs silhouettes et teintes), sapins, bouleaux ou
     chênes, fougères, ronces, souches, troncs couchés, champignons ;
   - lande : bruyère (en fleur ou non), ajoncs, genêts, petits pins tordus, herbes sèches ;
   - marais : roseaux, joncs, massettes, saules, nénuphars sur l'eau basse ;
   - plage et dune : oyats, chardons bleus, bois flotté ;
   - montagne : sapins épars et rabougris, rhododendrons, touffes d'herbe ; rien sur la neige
     ni sur la roche nue ;
   - prairie autour de la ferme : quelques arbres isolés, des fleurs, des touffes (sans toucher à
     la ferme) ;
   - leurs ombres comme celles des arbres de la ferme.
2. **La pose** : dans le Worker, avec la région (déterministe par graine), une liste d'objets par
   région `[sorte, x, y, variante…]` d'après le biome et le sol de chaque case (les taches de la
   5a), une densité réglée dans `data/monde.json`, des espacements (pas deux grands arbres sur la
   même case), des lisières plus claires, des clairières, rien sur les chemins, les gués, l'eau
   profonde ni la ferme.
3. **La scène** : les grands végétaux (arbres, saules, grands buissons) sont des images rangées
   selon leur pied, qui deviennent transparentes quand le personnage passe derrière (comme les
   arbres de la ferme : réutiliser `decor.js`), avec leur ombre ; créées et retirées avec leur
   région. Les petites plantes (fleurs, herbes, bruyère, fougères basses) peuvent être peintes
   dans le canevas de la région ou dans un calque par région (au plus simple et au plus rapide,
   à mesurer). Les roseaux ou herbes hautes qui penchent quand on les traverse (comme l'herbe
   haute de la ferme) : en bonus, si c'est simple.
4. **La marche** : le pied d'un arbre, d'un saule ou d'un gros buisson ne se traverse pas (la
   grille de marche le lit, comme pour les arbres de la ferme) ; les petites plantes se
   traversent. Un chemin du plan reste toujours praticable.
5. **Le bon ordre et les performances** : rien ne doit gêner les régions déjà mesurées (durée par
   région dans le Worker, temps d'une image en marchant dans une forêt dense : avant/après),
   viser au plus quelques centaines d'images à la fois près de la vue (le reste culé par
   `cullDecor` ou peint dans le sol).
6. **Les tests** : la pose est déterministe et identique Worker / calcul direct ; aucun objet sur la
   ferme, sur un chemin ou dans l'eau profonde ; les cases bloquées par un pied d'arbre ne coupent
   aucun chemin du plan ; les densités par biome dans les bornes réglées.

## Hors périmètre

- Couper, cueillir, ramasser dans le monde, les ressources (étape 6) ; les rochers, éboulis en
  relief, falaises en relief, glaçons, coquillages (fiche 5c) ; les hameaux (étape 7).
- La ferme (ses arbres, son herbe haute, ses ids) : ne pas y toucher.

## Critères d'acceptation

- Dans Chromium, chaque biome a une végétation reconnaissable et jolie, dense en forêt, claire sur
  la lande, dans le style de la ferme ; on passe derrière les arbres (transparence), on bute sur
  leurs pieds, on suit les chemins sans être bloqué ; la ferme est identique.
- La fluidité ne baisse pas de façon notable (mesures avant/après dans le compte rendu) ; une
  région reste rapide à préparer dans le Worker.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 5b fait ;
  `docs/fiches/README.md` : 5b fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les planches regardées en grand ; Chromium : captures d'une forêt dense (le personnage derrière
  un arbre), d'une lisière, de la lande, du marais, de la dune, de la montagne, de la prairie qui
  entoure la ferme ; les regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins
  absolus) dans le compte rendu, dont un avant/après d'un même endroit.

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les planches et scripts, la pose (règles, densités), la scène (images, peinture
dans le sol), la marche, les mesures avant/après, les vérifications et leurs résultats exacts,
les captures, ce qui reste.
