# Fiche 3b — Les régions visitées, les trajets bornés, la carte lue par régions

## Objectif

Que le jeu tienne dans le grand monde (644 × 510 tuiles) sans parcourir tout le monde : le
moteur ne passe en revue que la ferme et les régions que le joueur a visitées, la marche ne
cherche ses chemins que dans un voisinage borné, et la scène de la ferme ne lit au chargement
que ce dont elle a besoin.

## Contexte

- Lire d'abord `docs/grand-monde.md` (décisions, étapes 1 à 3 faites), puis `js/engine/monde.js`
  (le monde, `FERME_DANS_MONDE`, `MONDE`), `js/engine/terrain.js` (`farmTerrain`,
  `casesDuTerrain`), `js/carte/kit.js` (`REGION` : régions de 64 × 64 tuiles),
  `js/carte/ferme/sol.js` (`makeRegions`, `syncRegions`) et `js/carte/ferme/decor.js`
  (`placeInRegion`, `showObj`).
- Depuis l'étape 3a, les cases sont numérotées sur la largeur du monde ; la ferme générée est au
  centre, entourée d'une prairie qui n'a encore « rien » (« . » dans `terrain.LIGNES`) ; le moteur
  ne parcourt que la ferme (`casesDuTerrain`). L'étape 4 donnera au monde ses biomes : il faudra
  alors que le moteur et la scène sachent ne regarder qu'une partie du monde.
- Aujourd'hui, la scène parcourt encore tout le monde au chargement : `findOccluders`
  (`decor.js`), `mapTrees` (`hache.js`), `findRocks` (`pioche.js`), `makeTileAnims` (`sol.js`),
  le relevé des lieux de `js/ambient-life.js` (boucles `W * H`), `silo.js:157` ; la marche
  (`js/fermier.js`, `K.chemin` de `js/carte/chemins.js`) cherche jusqu'à `cols * rows * 1.5`
  cases ; la famille (`js/famille-ferme.js`) passe par `fermier.path`.

## À faire

1. **Les régions visitées (moteur)** : `state.monde = { vues: [clés « rx,ry »] }` (régions de
   `REGION.tuiles` tuiles, la même grille que la scène ; mettre la taille de région côté moteur,
   p. ex. `MONDE.REGION = 64` dans `monde.js`, et la faire lire par `CarteKit.REGION` ou
   l'inverse, une seule source). Les régions de la ferme sont vues d'office. Une action du pont
   (ou le modèle de la scène) note la région où se trouve le personnage quand il y entre.
   Migration (format 53) : une partie existante a vu les régions de sa ferme.
2. **`casesDuTerrain(T, state)`** : les cases de la ferme et des régions vues (dans l'ordre des
   cases). Les boucles du moteur qui passent tout en revue (labourables, cueillette, bot,
   repousses de la nuit…) le prennent ; vérifier qu'il n'en reste aucune sur `W * H` ou
   `tileCount` dans `js/engine` (sauf les bornes de validité d'une case).
3. **La nuit** : ce qui repousse ou évolue la nuit sur la carte (arbres, rochers, buissons,
   touffes, cueillette) ne concerne que la ferme et les régions vues ; le dire dans les
   commentaires, et un test qui le montre (une région non vue ne bouge pas).
4. **Trajets bornés (scène)** : `K.chemin` reçoit une boîte de recherche (le départ et l'arrivée,
   plus une marge, p. ex. 48 tuiles, bornée au monde) au lieu de tout le monde ; un appui trop
   loin (au-delà d'une distance maximale) ne lance pas de recherche géante : le personnage va
   au plus près en ligne droite ou rien. Pareil pour la famille et le robot s'ils cherchent des
   chemins.
5. **La carte lue par régions (scène)** : les relevés du chargement (arbres, rochers, barrières,
   tuiles animées, lieux de la vie d'ambiance, silo) ne parcourent plus `W * H` du monde : ils
   lisent les régions qui ont quelque chose (pour l'instant, celles de la ferme : la prairie n'a
   que du sol), région par région, de façon que l'étape 4 n'ait qu'à leur donner les régions
   des biomes. Le temps de chargement de la carte ne doit pas augmenter (mesurer avant/après).

## Hors périmètre

- Le générateur du monde et les biomes (étape 4), le brouillard et la carte du monde (étape 8 :
  `state.monde.vues` leur servira, mais ne rien afficher ici).
- Changer l'aspect de la ferme ou ce qu'on y fait.

## Critères d'acceptation

- Une partie d'avant (format 52) se charge sans perte (migration testée).
- Aucune boucle du moteur sur tout le monde ; les tests montrent qu'une région non vue est ignorée
  et qu'une région vue est prise en compte.
- Un appui très loin sur la carte ne gèle pas la page (mesurer la durée de la recherche de chemin
  dans Chromium : quelques millisecondes).
- Le chargement de la carte n'est pas plus lent qu'avant (le mesurer, le dire dans le commit).
- `npm test` vert (et pas plus lent qu'avant de plus de quelques secondes), test de fumée sans
  erreur, docs à jour (`docs/grand-monde.md` : 3b fait ; la fiche passe à « fait » dans
  `docs/fiches/README.md`).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : nouvelle partie, marcher jusque dans la prairie (la région devient vue : le dire
  d'après `state.monde`), appui très loin, mesurer le chargement de la carte et la recherche de
  chemin ; capture d'écran de la ferme inchangée.

## Livraison

Un commit sur la branche de travail (voir les conventions de `docs/fiches/README.md`), pas de
push. Rendre compte : ce qui a été fait, les mesures (avant/après), ce qui reste ou ce qui a été
laissé de côté et pourquoi.
