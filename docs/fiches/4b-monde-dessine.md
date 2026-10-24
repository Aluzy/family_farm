# Fiche 4b — Le monde dessiné et marchable (sol par biome, Web Worker, cache)

## Objectif

Que le plan du monde (fiche 4a) apparaisse dans le jeu : autour de la ferme, le sol de chaque
biome (prairie, forêt, lande, marais, plage, falaise, montagne, sommets, mer, lacs, rivières) et
les chemins, et que le personnage puisse y marcher là où c'est possible (pas dans l'eau profonde,
la mer, les falaises ni les sommets). Les régions du monde se calculent dans un Web Worker, une à
une, avec un cache, sans bloquer la page.

## Contexte

- Lire d'abord `docs/grand-monde.md` (décisions ; étapes 1 à 3 et 4a faites), `docs/fiches/
  README.md` (conventions), puis :
  - `js/engine/monde-gen.js` et `data/monde.json` (le plan : `champsDuMonde`, `elementsDuMonde`,
    `biomesDeRegion`, `BIOMES`, `PLAN_MONDE`) et `js/engine/monde.js` (`genererMonde` : la ferme
    au centre, `plan` paresseux, la carte paresseuse avec `regionsPleines`, `MONDE.REGION`) ;
  - `js/engine/planche.js` (les blocs de tuiles de la planche de la carte : `herbe_chemin`, `eau`,
    `rive_herbe`, `rive_sable`… et `blocGid`) et la façon dont `ferme-generee.js` dessine l'herbe,
    les chemins, l'eau et ses rives (coins de cases : `SOMMETS`, `TEINTES`, masques de 4 bits) ;
  - la scène : `js/carte/ferme/sol.js` (`makeRegions`, `syncRegions`, `paintRegion`, `drawLayer`),
    `js/carte/kit.js` (`REGION`, `regionsPleines`), `js/fermier.js` (la grille de marche,
    `freeAt`, `buildGrid`, la recherche bornée de la 3b), `js/farm-stage.js` ;
  - `scripts/build-site.mjs` (comment les scripts et modules sont empaquetés : le Worker doit y
    trouver sa place) et `scripts/carte/` (les générateurs de tuiles en Python, `pixel.py`,
    `commun.py`, vue de haut à 45°) ;
  - les planches gardées comme kit de textures : `assets/montagne_*.png`, `assets/plage_*.png`.
- Aujourd'hui : le plan existe mais rien ne le lit ; autour de la ferme, la carte est une
  prairie d'herbe (`monde.js`, couche `ground`) et le terrain y est « rien » (« . »).
- Le personnage, la famille et le robot cherchent leurs chemins dans une boîte bornée (3b) ;
  les régions vues sont notées dans `state.monde.vues`.

## À faire

1. **Le sol par biome** : pour chaque case hors de la ferme, une tuile de sol tirée de son biome,
   avec des raccords propres entre biomes (même principe que l'herbe et l'eau de la ferme : par
   coins de cases et masques). Utiliser les tuiles qui existent (herbe en trois teintes, chemins,
   eau, rives d'herbe et de sable) et, pour ce qui manque (sable, galets, roche, éboulis, neige,
   sol de marais, sol sombre de forêt, lande), des tuiles provisoires mais propres, faites en
   Python dans `scripts/carte/` dans le style du jeu (vue de haut, pixel art, ombrage léger) ou
   reprises des planches `montagne_*`/`plage_*`. Les décors (arbres, roseaux, rochers, bruyère…)
   viendront à l'étape 5 : ici, seulement le sol. La mer et les lacs avec leur eau profonde et
   leurs rives ; les rivières avec leurs berges ; la falaise comme un bord de roche ; les chemins
   tracés avec les tuiles de chemin de la ferme, qui rejoignent celui de la ferme à sa sortie
   est.
2. **La ferme ne change pas** : ses cases, sa carte et son terrain restent identiques (le vérifier
   par un test : la couche `ground` de la ferme dans le monde est celle de `genererFerme`) ; la
   prairie qui l'entoure se raccorde comme aujourd'hui.
3. **Marcher dans le monde** : la grille de marche du personnage (et de la famille, du robot) ne
   laisse pas entrer dans la mer, l'eau profonde des lacs et des rivières (une rivière se passe à
   gué là où un chemin la croise, ou par un pont : au choix, en le disant), les falaises et les
   sommets. Le terrain du moteur (`LIGNES`) hors de la ferme reste « . » (on n'y laboure ni n'y
   bâtit pas encore : ce sera décidé plus tard) ; la marchabilité vient du plan (une fonction du
   moteur, p. ex. `caseMarchable(T, t)`, lue par la scène).
4. **Le Web Worker et le cache** : le calcul du sol d'une région (biomes → tuiles) se fait dans
   un Web Worker (un module du site, empaqueté par `scripts/build-site.mjs`), demandé quand la
   région approche de la vue (`syncRegions`), et gardé dans un cache (en mémoire ; IndexedDB si
   c'est simple et utile, en le justifiant). Pendant qu'une région n'est pas prête, elle se peint
   d'un sol provisoire uni de son biome, sans erreur ni blocage. Sans Worker (Node, tests, vieux
   navigateur), le même code tourne en direct. Les éléments globaux du plan (rivières, chemins,
   lieux) se tirent une fois. Le plan complet ne doit plus être calculé sur le fil principal au
   démarrage si ce n'est pas nécessaire (mesurer le chargement avant/après).
5. **Les défauts du plan vus à la 4a**, si c'est faisable sans tout reprendre : tronçons de
   rivière ou de chemin à angle droit (surtout au nord), chemins qui courent côte à côte,
   chapelets de lacs. Sinon, le dire dans le compte rendu.

## Hors périmètre

- Les décors des biomes (arbres, rochers, roseaux, neige qui tombe…, étape 5), leurs ressources,
  animaux, grottes et pêche jouables (étape 6), les hameaux et leurs habitants, la calèche
  (étape 7), le brouillard et la carte du monde (étape 8).
- Labourer ou bâtir hors de la ferme.

## Critères d'acceptation

- Dans Chromium, en marchant depuis la ferme (ou en déplaçant la vue), on voit les biomes du plan
  à leur place (comparer avec `node scripts/monde/apercu.mjs <graine>` de la même partie), avec
  des raccords sans trou ni tuile manquante, et la ferme identique à avant.
- Le personnage ne peut pas entrer dans la mer, un lac, une falaise ou les sommets ; il suit les
  chemins et passe les rivières là où c'est prévu.
- Le chargement de la carte n'est pas plus lent qu'avant (mesuré) ; faire défiler la vue dans le
  monde reste fluide (pas de gel quand une région se calcule : mesurer la durée par région dans
  le Worker et sur le fil principal).
- Une partie existante se charge sans changement de sauvegarde (ou avec une migration testée si
  le format change).
- `npm test` vert (pas plus lent de plus de quelques secondes), test de fumée sans erreur, docs à
  jour (`docs/grand-monde.md` : 4b fait, l'étape 4 faite ; `docs/fiches/README.md` : 4b fait ;
  `docs/architecture-phaser.md` pour le Worker).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : nouvelle partie ; captures (dans le dossier de travail) de chaque biome, d'un
  raccord entre biomes, d'une côte, d'une rivière et du chemin qui sort de la ferme ; essayer de
  marcher dans la mer et sur une falaise ; mesurer chargement et défilement. Regarder les
  captures et corriger ce qui ne va pas avant de livrer. Donner 4 à 6 captures dans le compte
  rendu (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : ce qui a été fait (fichiers), les tuiles ajoutées, le Worker et son cache, les
mesures avant/après, les vérifications et leurs résultats exacts, les captures, ce qui reste.
