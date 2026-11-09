# Le tonnelet d'affinage et de fermentation (lot 6 des évolutions du crafting)

Un même bloc pour les deux : la **tomme d'alpage** s'y affine en fromage d'alpage, le **moût de houblon** y fermente
en bière artisanale. Les chaînes de production qui donnaient le fromage d'alpage et la bière donnent maintenant leur
tomme et leur moût.

## Les données

| | |
|---|---|
| Tonnelet | `ATELIER.RECETTES.tonnelet` : 3 planches et 1 lingot de fer, avec les chaînes ; un bloc du dehors (`ATELIER.BLOCS.tonnelet`, catégorie Machines) |
| Réglage | `TONNELET` (`data/recipes.json`) : `NUITS` 2 ; `AFFINE` : `tomme_alpage` → `fromage_alpage`, `mout_houblon` → `biere_artisanale` |
| Tomme d'alpage | `tomme_alpage` : 36 pièces (3 laits d'alpage), se garde 4 nuits |
| Moût de houblon | `mout_houblon` : 13 pièces (2 houblons et 1 L d'eau), se garde 4 nuits |
| Chaînes | `RECETTES.fromage_alpage.cave` : `tomme_alpage` (centrifugeuse, presse, tonneau) ; `RECETTES.biere_artisanale.cave` : `mout_houblon` (chaudron, tonneau). Les recettes ne changent pas : mêmes ingrédients (la bière : 2 houblons), même déblocage, même prix du produit fini |

Un tonnelet tient **un produit à la fois** ; il le garde **2 nuits**.

## Le moteur (`js/engine/tonnelets.js`)

- `state.tonnelets = { [case]: { produit, nuits } }` : un tonnelet vide n'y est pas.
- `remplirTonnelet(state, case, objet)` (la commande `tonnelet.remplir`) : une tomme ou un moût de l'inventaire.
- `affinerTonnelets` : l'étape de nuit (`night.js`, après les ruches) ; prêt, il attend.
- `tonneletsARecolter` : les tonnelets prêts, en tas à ramasser `tonnelet:<case>`, comme une ruche pleine ;
  `pickUp` (`ramassage.js`) le vide dans l'inventaire ; le second adulte du foyer le vide aussi.
- Reprendre le tonnelet rend ce qu'il contient : le produit fini s'il était prêt, sinon la tomme ou le moût.
- `chaines.js produitDe` : la clé `cave` d'une recette remplace son produit au bout de la chaîne (et pour le joueur
  automatique, `chainesSansCarte`).

## La carte et la fenêtre

- L'image (`assets/blocs.png`, image 254) : le style **P1**, un tonnelet trapu de chêne miel, deux cercles de fer, vu
  de haut à 45°, rendu en volume par `scripts/carte/tonnelet.py` (des rampes de douze tons, la lumière en haut à
  gauche, le reflet du fer, un contour teinté).
- **En action**, il s'écrase et se relève par à-coups, lentement (un toutes les 2 à 3 s) : le ressort des bêtes
  (`js/carte/ressort.js`), dans `js/carte/ferme/tonnelets.js`. Rien avec « animations réduites ».
- **Prêt**, il ne bouge plus : la bulle de la ruche, avec l'icône du produit (🧀 1, 🍺 1) ; un appui l'envoie le prendre.
- Un appui sur un tonnelet ouvre la fenêtre **Tonnelets** (`js/ui/tonnelet.js`) : chacun, ce qui s'y affine et
  dans combien de nuits, ou les boutons pour y mettre une tomme ou un moût.
- Les icônes (`scripts/icones/tonnelet.py`) : le tonnelet, la tomme (une pâte fraîche, crème), le moût (une chope
  ambrée, sans mousse).

Tests : `tests/engine/tonnelet.test.mjs`.
