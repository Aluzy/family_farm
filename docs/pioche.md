# Les niveaux de la pioche (lot 5 des évolutions du crafting)

La pioche s'améliore à l'Atelier : **pierre → cuivre → fer → or**. Chaque niveau extrait plus de minerai, et les
minerais précieux demandent une pioche assez solide.

## Les données

`data/crops.json`, `PIOCHE` :

| Niveau | Nom | Minerai en plus | Ouvre |
|---|---|---|---|
| 1 | pierre (la pioche de départ) | — | fer, cuivre, quartz, améthyste |
| 2 | cuivre | +25 % | |
| 3 | fer | +50 % | l'or (`MINERAIS.or` : 3) |
| 4 | or | +75 % | le platine (`MINERAIS.platine` : 4) |

`data/recipes.json` (`outil: "pioche"`, `niveau`) : chaque amélioration se fabrique sur la pioche du niveau d'avant,
avec ce que celle-ci extrait :

- `pioche_cuivre` : 3 lingots de cuivre, 2 planches ;
- `pioche_fer` : 3 lingots de fer, 1 de cuivre, 2 planches ;
- `pioche_or` : 3 lingots d'or, 1 de fer, 2 planches.

## Le moteur

- `state.outils.niveauPioche` (absent : 1, la pierre). Une partie d'avant garde sa pioche, en pierre : pas de migration.
- `js/engine/outils.js` : `niveauPioche`, `piocheDef`, `refusMinerai` (« L'or : il faut une pioche en fer au moins
  (Atelier). ») ; `mineOre` refuse un minerai trop dur et ajoute le bonus du niveau à celui de la lampe.
- `js/engine/atelier.js` : `craftStatus` refuse une amélioration hors de l'ordre (« Il te faut d'abord la pioche en
  cuivre. », « Tu as déjà la pioche en fer. ») ; `craft` monte le niveau.
- La grotte (`js/grotte.js`, `tapOre`) : un minerai trop dur, le héros le dit sans marcher jusqu'à lui.

## L'affichage

L'icône **N1** : la tête de la pioche prend la couleur de son métal (`scripts/icones/pioches.py`, quatre icônes
`pioche_pierre`, `_cuivre`, `_fer`, `_or`), dans la barre d'outils (« Pioche en fer ») et à l'Atelier. Le sprite tenu en
main ne change pas.

Tests : `tests/engine/pioche.test.mjs`.
