# Fiche 5a — Les sols des biomes (définitifs), leurs bords et l'eau du monde

## Objectif

Remplacer les sols provisoires du monde (fiche 4b, `assets/sols_monde.png`) par des sols dessinés
dans le style du jeu — vue de haut à 45°, pixel art, comme la ferme — avec des bords naturels
entre biomes (fini l'escalier case par case) et l'eau du monde animée comme celle de la ferme.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 4 faites), `docs/fiches/README.md`, puis :
  - `js/engine/monde-sol.js` (le sol de chaque case d'après ses quatre coins, l'ordre des sols,
    l'eau, les chemins, le gué), `js/monde-worker.js`, `js/ui/monde-sol.js` (le Worker, le cache,
    le sol uni provisoire), `js/carte/ferme/sol.js` (`paintMonde`, `paintRegion`, les tuiles
    animées de la ferme : `makeTileAnims`, `stepTileAnims`) et `js/carte/ferme/eau.js` +
    `js/carte/eau.js` (l'eau vivante de la ferme : shader, rives) ;
  - `js/engine/monde-gen.js`, `data/monde.json` (les biomes, le plan) ;
  - `scripts/carte/sols_monde.py` (la planche provisoire), et pour le style : `scripts/carte/
    herbe_chemin.py`, `terres.py`, `bordure_eau.py`, `eau.py`, `rochers.py`, `blocs.py` (la vue
    de haut à 45° : `boite()`, une hauteur h devient h × 14/16, une profondeur p devient p ×
    10/16), `scripts/pixel.py`, `scripts/carte/commun.py` ; les planches gardées comme kit de
    textures : `assets/montagne_*.png`, `assets/plage_*.png` (à reprendre ou à s'en inspirer).
- Les décors posés sur le sol (arbres, buissons, roseaux, bruyère, rochers, falaises en relief)
  viendront aux fiches 5b et 5c : ici, seulement le sol, l'eau et leurs bords.

## À faire

1. **Les sols** : une nouvelle planche (ou la planche `sols_monde.png` refaite par son script)
   avec, pour chaque sol du monde — sable de plage, galets, roche, éboulis, neige, sol de forêt
   (feuilles, aiguilles, mousse), lande (herbe rase, terre), marais (vase, eau basse entre des
   touffes), herbe de prairie (celle de la ferme, inchangée) —, plusieurs variantes pleines qui
   se répètent sans motif visible, et tous les raccords avec les sols voisins. Une palette
   cohérente avec la ferme (comparer côte à côte la prairie de la ferme et ces sols).
2. **Des bords naturels** : les limites entre biomes et le bord des chemins ne suivent plus la
   grille case par case. Par exemple : décaler la frontière par un bruit au niveau des coins de
   cases (sous-case), ou des raccords à plusieurs variantes, ou des taches d'un sol dans l'autre
   près du bord. Le choix est libre, à expliquer. Le plan (`biome` par case) et la marchabilité
   ne changent pas : seul le dessin s'adoucit.
3. **L'eau du monde** : la mer, les lacs et les rivières s'animent comme les étangs de la ferme
   (mêmes tuiles animées et/ou même eau vivante), par région (seulement les régions dessinées,
   comme `stepTileAnims` le fait déjà dans la vue). La mer a de l'écume et des vagues le long des
   plages. Un gué reste lisible.
4. **Le Worker** : le calcul des tuiles reste dans le Worker ; vérifier que les nouveaux raccords
   ne le ralentissent pas (durée par région mesurée avant/après). Le sol uni provisoire prend la
   couleur moyenne de chaque nouveau sol.
5. **Les tests** : aucune case sans tuile, les mêmes biomes que le plan, la ferme inchangée, la
   prairie qui entoure la ferme peinte comme avant (le raccord avec la ferme ne bouge pas), le
   Worker et le calcul direct identiques.

## Hors périmètre

- Les arbres, buissons, roseaux, bruyère, champignons (fiche 5b) ; les rochers, éboulis en relief,
  falaises en relief, glaçons, coquillages, épaves (fiche 5c).
- La ferme, son herbe, son eau (ne pas y toucher).
- Le plan (biomes, rivières, chemins) et la marchabilité.

## Critères d'acceptation

- Dans Chromium, chaque biome est reconnaissable et joli, dans le même style que la ferme ; les
  bords entre biomes et des chemins ne montrent plus l'escalier de la grille ; aucune tuile
  manquante ni couture ; la ferme identique.
- L'eau du monde bouge (et reste immobile avec « animations réduites »), sans faire baisser la
  fluidité (mesurer le temps d'une image avant/après en marchant le long de la côte).
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 5a fait ;
  `docs/fiches/README.md` : 5a fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les planches : générées par leur script (le relancer redonne la même image), regardées en grand.
- Chromium : captures de chaque biome, de trois raccords entre biomes, d'une côte animée (deux
  images à quelques centaines de ms d'écart), d'un chemin dans la forêt et de la sortie de la
  ferme ; les regarder et corriger avant de livrer. Donner 5 à 7 captures (chemins absolus) dans
  le compte rendu, dont une comparaison avant/après d'un même endroit.

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les planches et scripts ajoutés ou changés, la méthode des bords naturels, l'eau,
les mesures avant/après, les vérifications et leurs résultats exacts, les captures, ce qui reste.
