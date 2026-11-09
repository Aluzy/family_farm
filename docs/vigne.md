# La vigne (lot 4 des évolutions du crafting)

Une culture pérenne de la zone de culture : le pied de vigne reste dans sa parcelle après la vendange et refait ses
grappes, sans être replanté.

## Les données (`data/crops.json`, `CULTURES.vigne`)

| | |
|---|---|
| Plant | `plant_vigne` (une graine), à la calèche dès le **niveau 6** (`NIVEAUX.liste` : la vigne débloquée) ; vendu 6, acheté 12 comme toute semence |
| Pousse | **6 stades**, un arrosage chacun (2 L), comme les autres cultures |
| Vendange | **4 raisins** (`raisin` : un fruit, 3 pièces avant le doublement des productions, 6 d'énergie) ; pas de plant en retour |
| Vivace | `vivace.stade` : 4 : après la vendange, le pied revient à son feuillage et refait ses grappes en **2 stades** |

Le plant coûte plus qu'une graine (6 pièces) : il produit pendant toute la partie. Le moteur donne un rendement fixe :
4 raisins par vendange (le choix proposait « 3 à 5 »).

## Le moteur (`js/engine/crops.js`)

- `harvestPlot` : une culture `vivace` garde sa parcelle, revenue à `vivace.stade`, sans arrosage.
- La **houe arrache** une vigne qui n'est pas mûre (`hoeStatus` : l'action `arracher` ; une vigne mûre, on la
  vendange d'abord) : la parcelle reste, en terre nue ; un second coup de houe la rebouche. En glissant sur plusieurs
  cases (`hoe-many`, `js/ui/houe.js`), la houe passe sur les vignes sans les arracher : un appui sur chacune.
- La vérification des données : `vivace.stade` de 1 à `stades` − 1.

## Le dessin

Le style **V1** : le cep tordu qui grimpe le long de son tuteur, de grandes feuilles à trois lobes, des grappes de
raisin noir ; quatre phases (la bouture, le jeune pied, le feuillage, les grappes). Il est dessiné par
`scripts/carte/vigne.py` dans la source des cultures (`scripts/carte/sources/cultures.png`, rangée 14, colonnes 0, 2, 4,
6), puis rangé dans `assets/crops.png` par `scripts/carte/planche_cultures.py`, comme les autres cultures (le milieu de
sa masse du bas au centre de la tache d'arrosage). Les icônes du raisin et du plant : `scripts/icones/vigne.py`.

Tests : `tests/engine/vigne.test.mjs`.
