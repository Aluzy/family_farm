# Les colorants (lot 1 des évolutions du crafting)

Le premier lot du cahier des charges des évolutions (crafting et progression) : des fleurs sauvages qu'on cueille
dans le grand monde, un mortier et son pilon posé dans la maison qui les broie en colorants, et les recettes de
l'Atelier qui prenaient du bois (les briques) ou des baies : un colorant à la place. Les lots suivants (les bacs à
fleurs, les bassins, les arbres, les pioches, l'affinage) viendront à part.

## Les six colorants

| Colorant | Au mortier (10 s) | D'où vient la plante |
|---|---|---|
| Rouge | 3 coquelicots | la prairie (autour de la ferme) |
| Orange | 3 pavots de Californie | la prairie, la lande |
| Jaune | 3 tournesols | la prairie |
| Vert | 3 épinards | une culture (niveau 4) |
| Bleu | 3 myosotis | le marais, les clairières, un peu la prairie |
| Violet | 3 lavandes ou 3 lupins | la lande (lavande) ; la montagne, les clairières, la prairie (lupin) |

Les objets : `fleur_coquelicot`, `fleur_pavot`, `fleur_tournesol`, `fleur_myosotis`, `fleur_lavande`, `fleur_lupin`
(des produits, 1 pièce) ; `colorant_rouge`, `_orange`, `_jaune`, `_vert`, `_bleu`, `_violet` (des matériaux, 4
pièces ; le vert 7). La nomenclature des couleurs est celle-ci ; les objets personnalisables qui viendront s'y
tiendront.

## Les fleurs sauvages

Six petites plantes du grand monde (`data/monde.json` : `VEGETATION.SORTES`, leurs densités dans `DENSITES`), dessinées
en massifs de deux à quatre fleurs (`scripts/carte/vegetation.py`). On les ramasse à la main (`RECOLTE.SORTES`, le
geste « ramasser ») : 2 ou 3 fleurs, la plante revient en 4 à 7 jours. Le coquelicot pousse dans la prairie qui
entoure la ferme : le mur de briques rouges, qui se bâtit dès le début, reste à portée.

Elles sont ajoutées **au bout des tables** de leurs sols : chaque case tire sa petite plante dans l'ordre de la table,
les fleurs ne prennent donc que des cases restées vides. Rien d'autre ne bouge dans un monde déjà commencé (vérifié
sur 15 régions de trois mondes, 5 961 petites plantes : aucune différence hors des fleurs). Le générateur passe tout de
même au numéro 3 (`GENERATEUR_VERSION`, `js/engine/base.js`), et la migration 77 → 78 y passe les parties du 2.

## Le mortier et son pilon

Une station de plus (`data/recipes.json` : `STATIONS.mortier`, l'action « broyer » : 1 d'énergie, 10 XP), comme le
four et la cuisinière (`js/engine/kitchen.js`) : un bloc posé dans une pièce de la maison (`ATELIER.BLOCS.mortier`,
`dedans`), fabriqué à l'Atelier (4 pierres + 1 planche, dès le début) ; un appui sur lui ouvre sa fenêtre
(`js/ui/stage-windows.js`, `renderStationFenetre('mortier')`), la même que celles du four et de la cuisine. Ses
recettes (`RECETTES`, station `mortier`, `libre`) : 3 fleurs (3 épinards pour le vert) → 1 colorant, en 10 s, sans
électricité ; la file d'attente, la nuit et le hors-ligne sont ceux des autres stations.

Son image (`assets/blocs.png`, image 253 : `scripts/carte/blocs.py` mortier) : un petit établi, le mortier de pierre et
sa poudre violette, deux pots de colorant, un petit bouquet. Les icônes des colorants (des pots de terre pleins de
poudre), des fleurs et du mortier : `scripts/icones/colorants.py`, puis `scripts/icones/build.py`.

## Les recettes de l'Atelier

| Recette | Avant | Maintenant |
|---|---|---|
| Mur de briques rouges | 3 pierres + 1 bois | 3 pierres + 1 colorant rouge |
| Mur de briques orange | 3 pierres + 1 bois | 3 pierres + 1 colorant orange |
| Mur de briques ocre | 3 pierres + 1 bois | 3 pierres + 1 colorant jaune |
| Mur de briques bleues | 3 pierres + 1 bois | 3 pierres + 1 colorant bleu |
| Porte bleue | 3 planches + 2 baies | 3 planches + 1 colorant bleu |
| Chaise peinte (bleue) | 2 planches + 1 baie | 2 planches + 1 colorant bleu |
| Lanterne de papier (rouge) | 1 planche + 3 fibres + 1 baie | 1 planche + 3 fibres + 1 colorant rouge |
| Fenêtre à volets (verts) | 3 planches + 1 pierre + 1 baie | 3 planches + 1 pierre + 1 colorant vert |
| Fenêtre à vitrail | 3 pierres + 1 lingot de cuivre + 2 baies | 3 pierres + 1 lingot de cuivre + 1 colorant bleu + 1 colorant jaune |

Les murs, les portes et les fenêtres déjà fabriqués ou posés restent ce qu'ils sont : seules les recettes changent.

## Les parties

La migration 77 → 78 (`js/engine/state.js`) : la station du mortier (à construire), le générateur 3. Les boucles des
stations (la cuisson, la nuit, le joueur automatique, l'arbre) passent une station qu'une très vieille partie n'a pas
encore. Tests : `tests/engine/colorants.test.mjs`.
