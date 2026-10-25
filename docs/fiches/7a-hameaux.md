# Fiche 7a — Les hameaux bâtis

## Objectif

Bâtir les hameaux du plan : chaque lieu `hameau` du monde devient un petit village de 3 à 7
maisons faites des mêmes blocs que la maison du joueur (murs, portes, fenêtres, sols, toits),
avec sa place, son puits, ses jardins, ses clôtures et un panneau à son nom ; on s'y promène et
on entre dans les maisons. Les habitants viendront à la fiche 7b, la calèche à la 7c : ici, les
hameaux sont bâtis et vides (portes fermées ou maisons ouvertes sans personne, au choix motivé).

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 6 faites ; les décisions : la calèche, les
  habitants), `docs/fiches/README.md`, puis :
  - le plan : `js/engine/monde-gen.js` (`lieux.hameaux` : `{ id, case, nom }`, la place du
    hameau ; les chemins qui les relient), `data/monde.json` (`PLAN_MONDE.HAMEAUX` : `PLACE`,
    `LISIERE`, `OUVERT`…), `js/engine/monde-sol.js` (sols, chemins, `caseMarchable`),
    `js/engine/monde-lieux.js` (la 6b : les entrées de grotte et les coins de pêche posés dans le
    Worker, leurs cases fermées), `js/engine/monde-vegetation.js` et `monde-roches.js` (ce qui
    s'écarte déjà des lieux), `js/engine/monde-faune.js` ;
  - les blocs du joueur : `js/engine/blocs.js` (`DATA.ATELIER.BLOCS`, pièces closes, portes),
    `js/engine/etage.js`, `data/meubles.json`, `js/engine/meubles.js`, la scène :
    `js/carte/ferme/toits.js` et `js/carte/toit.js` (les toits qui s'effacent quand on entre),
    `js/carte/ferme/fenetres.js`, `js/carte/ferme/etage.js`, `js/carte/ferme/decor.js` ;
  - l'ancien jeu, pour s'en inspirer (rien à reprendre tel quel) : sur la branche
    `archive/jeu-avant-grand-monde`, `js/engine/transition.js` (`maisonPlan`, `transitionPlan` :
    maisons par étapes, intérieurs) et `js/carte/ville/transition.js`, `voisins.js`
    (`git show origin/archive/jeu-avant-grand-monde:<fichier>`).

## À faire

1. **Le plan d'un hameau** (déterministe, d'après la graine du monde et l'id du hameau, calculé
   dans le Worker ou à côté, réglé dans `data/monde.json`) : autour de la case du hameau, une
   place (terre battue ou pavés, un puits ou une fontaine, un banc, un panneau au nom du
   hameau), 3 à 7 maisons de tailles variées le long des chemins du plan et de ruelles courtes,
   des jardins et potagers clôturés, quelques dépendances (appentis, tas de bois, poulailler
   vide…) selon le biome (bois et chaume en forêt et en lande, pierre et ardoise en montagne,
   pierre blanche et tuiles près de la côte, pilotis ou bois au bord du marais). Chaque maison
   a ses pièces (une salle commune avec foyer, une ou deux chambres) et ses meubles (lits,
   table, coffre, cuisinière ou four) pris dans les blocs et meubles existants ; ce qui manque
   (une matière de mur, un toit de chaume…) se dessine dans le style des blocs de la ferme.
   Garder dans le plan ce dont la 7b aura besoin : les maisons (`id`, emprise, porte, lits), le
   métier que le lieu suggère (bûcheron près de la forêt, pêcheur près de l'eau, mineur près
   d'une grotte, berger sur la lande, cueilleur) et des lieux de travail (atelier, ponton,
   enclos).
2. **La pose dans le monde** : le sol du hameau (place, ruelles, jardins) peint dans les régions ;
   la végétation, les rochers, les animaux et les autres lieux s'écartent du hameau ; les
   chemins du plan y arrivent et restent ouverts ; rien sur la ferme. Ni la ferme ni le monde
   hors des hameaux ne changent.
3. **La scène** : les maisons dessinées avec les blocs et les toits du jeu (le toit s'efface
   quand le personnage entre, comme chez lui), les fenêtres éclairées la nuit, la fumée des
   cheminées, les clôtures, le puits ; les images créées et retirées avec leurs régions ;
   un panneau qu'on touche affiche le nom du hameau.
4. **La marche** : on entre par les portes, on bute sur les murs, les clôtures et les meubles ;
   on ne peut ni casser ni bâtir dans un hameau, ni y couper les arbres des jardins (les outils
   le disent) ; aucun chemin n'est fermé.
5. **La découverte** : arriver dans un hameau pour la première fois l'annonce (une bulle ou une
   bannière à son nom) et le retient dans la sauvegarde (format + 1 si sa forme change, avec
   migration et test) ; une page « Les hameaux » dans l'encyclopédie, avec ceux qu'on a vus.
6. **Les performances** : mesurer la durée d'une région avec un hameau dans le Worker et le
   temps d'une image dans un hameau (avant/après).
7. **Les tests** : plans déterministes et identiques Worker / calcul direct ; toutes les maisons
   sur la terre ferme, hors de l'eau, des falaises et de la ferme ; chaque maison a une porte qui
   donne sur une case marchable reliée au chemin du hameau ; chaque pièce close a ses lits ; pas
   de chevauchement entre maisons, jardins et autres lieux ; chaque matière ou meuble a son
   dessin ; la découverte et sa migration.

## Hors périmètre

- Les habitants, leurs familles, leurs métiers et leur économie (fiche 7b) ; la calèche, le
  Marché et l'Atelier (fiche 7c) ; le brouillard et la carte du monde (étape 8).
- La maison du joueur et ses blocs.

## Critères d'acceptation

- Dans Chromium, on suit un chemin jusqu'à un hameau, on voit son nom, on traverse la place,
  on entre dans une maison (le toit s'efface), on en ressort ; trois hameaux de biomes différents
  ont chacun leur caractère ; la nuit, leurs fenêtres s'éclairent.
- La ferme est identique ; la fluidité ne baisse pas de façon notable.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 7a fait ;
  `docs/fiches/README.md` : 7a fait ; aide et encyclopédie).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les nouveaux dessins regardés en grand ; Chromium : captures de trois hameaux (forêt ou
  lande, montagne, côte ou marais), de l'intérieur d'une maison, de la place avec son panneau,
  d'un hameau la nuit, de l'arrivée (l'annonce). Les regarder et corriger avant de livrer.
  Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : le plan des hameaux (règles, réglages, ce qui est prévu pour la 7b), les
dessins, la pose, la scène, la marche, la découverte et la sauvegarde, les mesures avant/après,
les vérifications et leurs résultats exacts, les captures, ce qui reste.
