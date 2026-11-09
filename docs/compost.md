# Le bac à compost et l'engrais

Un bloc du dehors (`js/engine/compost.js`, la carte `js/carte/ferme/engrais.js`, la fenêtre `js/ui/compost.js`).

## Le bac

| | |
|---|---|
| Fabrication | l'Atelier : 4 planches, 2 fibres (`ATELIER.RECETTES.bac_compost`) ; catégorie Élevage du mode Construire |
| Pose | dehors, comme un bloc (`ATELIER.BLOCS.compost`, il arrête le passage) |
| Recette | chaque aliment jeté fait un engrais (`COMPOST.PAR_ENGRAIS` : 1) ; au plus `MAX_ENGRAIS` (20) engrais par bac |
| Remplissage | à la main : un appui sur le bac ouvre sa fenêtre, qui liste les aliments de l'inventaire (1 ou 10 d'un coup, `compost.jeter`) ; ce qui se mange ou périme, pas les graines |
| La nuit | ce qui a périmé (`state.nuit.perdus`) y va tout seul, le premier bac d'abord, après la péremption (`composter`, `night.js`) ; le rapport du matin le compte (`composte`). La péremption étant coupée (`PENALITES.PEREMPTION`, B-1), cela ne joue que si elle revient |
| Engrais prêt | une bulle au-dessus du bac, avec l'icône de l'engrais et leur nombre (un tas « `compost:<case>` », comme le miel d'une ruche) ; le personnage va les prendre, le reste attend dans le bac |
| Reprise | ses engrais reviennent dans l'inventaire |

Son image (maquette C3, `scripts/carte/compost.py`, `assets/blocs.png` 255 à 257) : un bac de planches debout, son
couvercle relevé contre le fond, vu de haut à 45°, en rampes de seize tons. Trois niveaux : vide, il se remplit
(moins de la moitié de ses engrais), à moitié plein au moins (le compost déborde, une pousse dessus).

## L'engrais

L'icône (maquette E4, `scripts/icones/engrais.py`) : un petit tas brun foncé presque pyramidal, quatre éclats violets.

Il vient du bac, ou **s'achète à la calèche**, avec les semences (« 🌱 Semences et engrais » ; `OBJETS.engrais.comptoir`,
`market.js isBuyable`) : 5 pièces de prix de vente, au cours du Marché comme elles (il monte à chaque unité achetée).

Avec de l'engrais dans l'inventaire et rien en main, **un glissement qui part d'une culture arrosée** marque en
violet les cultures arrosées qu'il traverse (comme les cases bleues de l'arrosage). Au relâchement, chacune
scintille (un éclair lilas, des éclats violets et blancs), puis reçoit son engrais (`engrais-many`,
`potager.engrais`) : **elle gagne un cycle tout de suite** (un stade) et la carte joue l'éclat vert de la pousse.
Le cycle d'eau en cours continue ; une culture ne prend qu'un engrais par arrosage (`p.engrais`, oublié à la fin
du cycle). Mûre d'un coup, l'eau du cycle n'a plus d'usage.

Tests : `tests/engine/compost.test.mjs`.
