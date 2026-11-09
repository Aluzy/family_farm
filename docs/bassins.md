# Les bassins (lot 3 des évolutions du crafting)

Après les colorants (`docs/colorants.md`) et les bacs à fleurs (`docs/bacs-a-fleurs.md`) : des bassins que l'on
construit case par case, qui se raccordent, avec l'eau vivante des étangs et des nénuphars.

## Le bloc

- **Une case de bassin** : `bassin` (`data/recipes.json`), **3 pierres** à l'Atelier, posée **dehors** comme un bloc
  (l'onglet Jardin). Sa recette demande **son plan**, celui de la collection du **marais** (`data/plans.json`), comme
  l'ancien bassin aux nénuphars.
- On ne marche pas dedans (`bloque` ; la carte : `BLOCS_CARTE.bloquent`).
- Les cases posées **côte à côte** (par un côté) forment **un seul bassin** : un carré, une allée d'eau, un L… La carte
  refait l'image d'un bassin quand ses cases changent. Chaque case se reprend seule.

## Le dessin (`js/carte/ferme/bassins.js`)

Le style **P1** : une **margelle de pierre taillée** de 4 px tout autour, **à angles vifs** (la distance de
Tchebychev : aucun angle n'est arrondi, ni dehors ni dedans) ; des dalles aux joints nets, biseautées (une arête claire,
une arête sombre), une dalle entière à chaque coin ; sa face au sud, le contour sombre des blocs ; sous la margelle du
nord, une paroi de pierre qui descend dans l'eau (la vue de trois quarts).

L'eau est **celle de la carte** : peinte de ses couleurs (`assets/eau.png` : claire au bord, plus sombre au large), elle
reçoit **l'eau vivante** des étangs (`js/carte/eau.js`, par `js/carte/ferme/eau.js` eauEtendues) : le même shader, la
même vitesse, les mêmes vaguelettes, le liseré d'écume, les scintillements du jour, les reflets et les ombres. La
margelle et les nénuphars y sont la rive, qui ne bouge pas ; un bassin n'a pas de berge de terre (`bassin` : sa paroi
est de pierre). Sans WebGL, ou avec moins d'animations, l'image seule.

Les **nénuphars poussent tout seuls** : une chance sur deux par case (un tirage d'après sa place : ils ne changent pas
d'une visite à l'autre), un grand avec sa fleur rose s'il tient dans l'eau, sinon un petit.

## Les parties

La migration 79 → 80 (`js/engine/state.js`) : l'ancien bassin aux nénuphars, posé ou dans l'inventaire, devient une case
de bassin ; son plan connu devient celui du bassin. L'étage garde les siens (un décor), comme les anciens bacs.

L'icône : `scripts/icones/bassin.py`, puis `python3 scripts/icones/build.py`. Tests : `tests/engine/bassins.test.mjs`.
