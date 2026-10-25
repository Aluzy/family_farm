# Fiche 6b — Les grottes de la montagne, la pêche dans le monde et les animaux

## Objectif

Finir l'étape 6 : les entrées de grotte du plan mènent à des grottes de la montagne où l'on
pioche des minerais ; on pêche dans les lacs, les rivières et la mer du monde avec la canne de
la ferme ; des animaux vivent dans chaque biome et se laissent regarder.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 5 et 6a faites), `docs/fiches/README.md`, puis :
  - le plan : `js/engine/monde-gen.js` (`lieux.grottes` : `{ id, case }`, l'entrée au pied de la
    montagne ; `lieux.peche` : `{ id, case, eau }`, `eau` = `lac`, `riviere` ou `mer`),
    `data/monde.json` (`PLAN_MONDE.GROTTES`, `PLAN_MONDE.PECHE`), `js/engine/monde-sol.js`
    (`caseMarchable`), `js/engine/monde-roches.js` (ce qui est posé dans la montagne et sur la côte),
    `js/engine/monde-recolte.js` (la 6a : les identifiants stables `sorte:x,y`, `state.monde.pris`,
    la repousse dans les régions vues) ;
  - la mine de la ferme : `js/grotte.js` (`GrotteScene` : niveaux tirés par automate cellulaire,
    minerai dans les murs, champignons lumineux, la lumière), `data/grotte.json` (`GROTTE`),
    `js/ui/excursion.js` (`jeu.html?carte=grotte&niveau=N…`, le pont `FermeHote`),
    `js/carte/ferme/passages.js` (la porte de la mine sur la ferme, la flèche des passages),
    `scripts/carte/grotte.py`, `tests/smoke.mjs` (il visite déjà deux niveaux de la mine) ;
  - la pêche de la ferme : `js/engine/outils.js` (`peche`, `fishLeft`, le lancer : `CANNE.JOUR`,
    `CANNE.PRISES` par eau ; `lac` et `mer` y sont déjà), `js/carte/ferme/peche.js` (la rive, le
    lancer, le bouchon, la touche, le poisson qui saute), `js/carte/ferme/eau-monde.js` (l'eau du
    monde) ;
  - les animaux : `scripts/carte/faune.py`, `assets/faune.json` et `assets/faune_*.png` (marmotte,
    bouquetin, aigle, mouette, crabe, dauphin, cygne, canard : déjà dessinés, gardés pour les
    biomes), `js/ambient-life.js` (la vie d'ambiance de la ferme : oiseaux, papillons…),
    `js/carte/ferme/vegetation.js` (images rangées selon leur pied, créées par blocs près de la vue).

## À faire

1. **Les grottes de la montagne** : chaque entrée du plan a son dessin dans la montagne (une
   bouche de roche dans la paroi ou au pied de la pente, dans le style des falaises de la 5c, avec
   la flèche des passages quand on s'approche) ; elle ouvre la scène de la grotte (réutiliser
   `GrotteScene`, pas une copie) avec une graine propre à l'entrée, plusieurs niveaux, et des
   minerais plus riches que la mine de la ferme (réglé dans `data/grotte.json` ou
   `data/monde.json` : par exemple une table de poids par grotte, de l'or et du platine plus tôt,
   des pierres comme le quartz et l'améthyste si les objets existent) ; en remontant, on ressort
   devant l'entrée, dans le monde, au même jour et à la même heure. La mine de la ferme ne change
   pas. Le god mode (mode test) propose aussi une grotte du monde.
2. **La pêche dans le monde** : la canne de la ferme s'utilise au bord de toute eau du monde
   (lac, rivière, mer : les poissons de chaque eau dans `CANNE.PRISES`, ajouter la rivière si elle
   manque, avec ses poissons — ne créer que les objets qui manquent, avec icône et entrée dans
   l'encyclopédie) ; les coins de pêche du plan sont de meilleurs coins (plus de prises par jour,
   un poisson plus rare : réglé), signalés par un petit décor (un ponton, des piquets, des
   remous) ; même geste, même bouchon, même touche que sur la ferme ; le nombre de prises par jour
   se compte par eau du monde (ou par coin), dans la sauvegarde.
3. **Les animaux** : chaque biome a ses bêtes, posées de façon déterministe par région (dans le
   Worker ou à côté, d'après le plan) et animées dans la scène : marmottes et bouquetins en
   montagne, aigles au-dessus des sommets (leur ombre au sol), mouettes et crabes sur la côte,
   dauphins au large, canards et cygnes sur les lacs et le marais ; dessiner ce qui manque pour la
   forêt (cerf ou chevreuil, renard, lapin, écureuil) et la lande (lièvre, perdrix…) dans le style
   de `faune.py`. Elles vivent seulement près de la vue (créées et retirées avec leurs régions),
   bougent un peu, fuient quand le personnage approche, dorment ou se cachent la nuit, restent
   immobiles avec « animations réduites ». On ne les chasse pas ; les toucher affiche leur nom et
   leur page de l'encyclopédie (découverte la première fois qu'on en voit une). Rien sur la ferme.
4. **La sauvegarde** : ce qui doit l'être (prises du jour dans le monde, animaux découverts) ;
   format + 1, avec sa migration et son test, si la forme change.
5. **Les performances** : le nombre d'animaux près de la vue reste petit (quelques dizaines au
   plus) ; mesurer le temps d'une image en montagne et sur la côte avant/après.
6. **Les tests** : chaque entrée de grotte mène à une grotte jouable et en ressort à sa place ;
   les grottes sont déterministes (même entrée, même jour : même grotte) ; la pêche dans chaque
   eau du monde, les coins meilleurs, la limite par jour ; les animaux posés de façon déterministe,
   jamais sur la ferme ni dans une case interdite à leur espèce ; chaque espèce a son dessin et sa
   page ; la migration ; le test de fumée visite aussi une grotte du monde.

## Hors périmètre

- Les hameaux, les habitants (le mineur, le pêcheur, le berger…) et la calèche (étape 7) ; le
  brouillard et la carte du monde (étape 8).
- Élever ou chasser les animaux du monde ; la mine de la ferme et ses réglages.

## Critères d'acceptation

- Dans Chromium, on entre dans une grotte de la montagne, on y pioche un minerai, on ressort devant
  son entrée ; on pêche un poisson dans une rivière, un lac et la mer, et un coin de pêche donne
  mieux ; on voit des marmottes, des mouettes, des canards, une bête de la forêt, qui fuient quand
  on approche ; leur page s'ouvre dans l'encyclopédie.
- La ferme, sa mine et sa pêche se comportent comme avant ; la fluidité ne baisse pas de façon
  notable (mesures avant/après dans le compte rendu).
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 6b et l'étape 6
  faits ; `docs/fiches/README.md` : 6b fait ; l'aide et l'encyclopédie).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les nouveaux dessins regardés en grand ; Chromium : captures d'une entrée de grotte dans la
  montagne, de l'intérieur avec un minerai, de la sortie, d'une pêche en rivière et en mer (la
  touche), d'un coin de pêche, des animaux de trois biomes (dont une fuite), de leur page dans
  l'encyclopédie. Les regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins
  absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les grottes (entrées, graines, minerais, retour), la pêche (eaux, coins, prises),
les animaux (espèces, dessins, pose, comportement), la sauvegarde, les mesures avant/après, les
vérifications et leurs résultats exacts, les captures, ce qui reste.
