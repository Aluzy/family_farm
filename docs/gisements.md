# Les gisements de minerai

La mine disparaît (un chantier en quatre lots) : le minerai se trouve désormais en surface, dans des **gisements**,
des tas de blocs de pierre riches en veines et en pépites de métal (maquette G4, façon mines d'Age of Empires).

1. **Les gisements** (ce lot) : sur la ferme et dans le grand monde.
2. Les champignons lumineux en forêt, les cristaux (quartz, améthyste) en montagne, qui brillent la nuit.
3. La pierre de lune du récit, dans un rocher d'améthyste de la montagne, les nuits de pleine lune.
4. La mine de la ferme et les grottes de la montagne supprimées.

## Les gisements

| | Fer | Cuivre | Or | Platine |
|---|---|---|---|---|
| Coups de pioche | 6 | 6 | 8 | 8 |
| Minerai (à la fin) | 3 à 5 | 3 à 5 | 2 à 4 | 2 à 3 |
| Retour (jours) | 8 à 12 | 8 à 12 | 10 à 15 | 12 à 18 |
| Pioche | pierre | pierre | fer | or |

- Chaque coup lâche une pierre au sol ; le dernier, le minerai (`assets/ramassables.png` : un éclat de chaque métal).
- Le niveau de pioche : `PIOCHE.MINERAIS` (`data/crops.json`), vérifié dans le monde (`monde-recolte.js preparer`) et
  sur la ferme (`outils.js piocherGisement`). Le bonus de minerai de la pioche joue sur la ferme.
- Les Lames affûtées retirent des coups, comme partout.

**Le grand monde** (`data/monde.json` : `ROCHES.SORTES` gisement_fer, _cuivre, _or, _platine, genre « bloc », deux
cases de large ; leurs densités dans `ROCHES.DENSITES` ; leur règle dans `RECOLTE.SORTES`, avec `minerai`). Le fer et
le cuivre dans les prairies, les forêts et les landes ; l'or et le platine en montagne (éboulis, roche, près des
sommets). Ajoutés au bout des tables des rochers : le générateur passe au numéro 5 (la migration 81 → 82 garde les
parties). Leurs images : `scripts/carte/gisements.py`, rangées dans `assets/roches.png` par `scripts/carte/roches.py`.

**La ferme** (`PIOCHE.GISEMENTS` : 3 de fer, 2 de cuivre) : autant de ses gros rochers (deux cases sur deux), tirés
d'après la graine de la ferme (`outils.js gisementsFerme` : toujours les mêmes), prennent l'image d'un gisement
(`js/carte/ferme/pioche.js`, `syncGisements`, `cadreGisement`) et se cassent comme ceux du monde. Leurs coups se
comptent à part (`state.outils.gisements`) ; brisés, ils rejoignent les rochers cassés et reviennent comme eux.

Tests : `tests/engine/gisements.test.mjs`.
