# Les gisements de minerai

La mine disparaît (un chantier en quatre lots) : le minerai se trouve désormais en surface, dans des **gisements**,
des tas de blocs de pierre riches en veines et en pépites de métal (maquette G4, façon mines d'Age of Empires).

1. **Les gisements** : sur la ferme et dans le grand monde.
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

## Lot 2 : ce qui brille la nuit

| | Où | Comment | Donne | Retour (jours) |
|---|---|---|---|---|
| Champignons lumineux | les forêts (feuilles, aiguilles, mousse) | à la main (ramasser) | 1 à 2 champignons lumineux | 2 à 4 |
| Cristaux de quartz | la montagne (éboulis, roche, près des sommets) | 2 coups de pioche | 1 à 2 quartz | 6 à 10 |
| Cristaux d'améthyste | la montagne (roche, près des sommets) | 3 coups de pioche | 1 à 2 améthystes | 8 à 12 |

- Données : `VEGETATION.SORTES` champignons_lumineux (genre « haute » : on le traverse), `ROCHES.SORTES`
  cristaux_quartz, cristaux_amethyste (genre « bloc »), leurs densités, leurs règles `RECOLTE.SORTES` ; au bout des
  tables : le générateur passe au numéro 6 (la migration 82 → 83 garde les parties).
- Dessins : `scripts/carte/lumineux.py` (rangés par `vegetation.py` et `roches.py`) ; les éclats de quartz et
  d'améthyste au sol, `assets/ramassables.png`.
- La nuit (`js/carte/ferme/lumineux.js`, appelé par `chantier.js stepLanterns`) : quand la nuit tombe (au seuil des
  lanternes), chacun pose dans le voile une lueur de sa couleur (cyan, bleu pâle, violet), une large au sol et une
  vive sur lui, qui respire lentement. Le jour, rien. Ceux qui sont pris ne brillent pas.

## Lot 3 : la pierre de lune, dans l'amas d'améthyste

La galerie secrète de la mine (le récit, lot 10) a désormais sa place dehors : un **grand amas d'améthyste**, unique,
dans la montagne la plus proche de la ferme.

- Le plan (`monde-gen.js`, lieux.recit `{ id: 'geode_lune', sorte: 'geode' }`) : une case de montagne entourée de
  montagne, loin des chemins, des hameaux, des entrées de grotte et des coins de pêche (`PLAN_MONDE.RECIT.GEODE`) ; la
  plus proche de la ferme, sans tirage (les autres lieux ne bougent pas). Le générateur passe au numéro 7 (la
  migration 83 → 84 garde les parties).
- Son dessin : `scripts/carte/lumineux.py geode` (dans `assets/lieux_monde.png` ; `LIEUX.SORTES` geode, genre
  « recit », trois cases fermées). Il luit en violet chaque nuit (`js/carte/ferme/lumineux.js`) ; les nuits de pleine
  lune, tant que la pierre y dort, sa lueur grandit et pâlit (`fil-lune.js geodeLuit`, modèle `geodeLuit`).
- Le toucher (`RECIT.LIEUX.geode`, `recit.js toucherLieu`) : une nuit de pleine lune, de 22 h à 4 h, les six pages du
  fil au carnet, il s'ouvre sur la cachette de Maurice enfant et donne la pierre de lune (une fois : le fait
  « pierre.trouvee ») ; sinon, un texte : sa lumière froide (pleine lune), sa lueur (la nuit), un grand amas (le jour),
  refermé (la pierre prise). La pierre se pose sur la ferme comme avant (`poserPierre`).

Tests : `tests/engine/fil-lune.test.mjs` (l'amas d'améthyste).

## Lot 4 : la fin de la mine et des grottes

La mine de la ferme et les grottes de la montagne sont retirées : le minerai, le quartz, l'améthyste et les
champignons lumineux se trouvent tous dehors (lots 1 à 3).

- **Retirés** : la scène de la grotte (`js/grotte.js`), son ouverture (`js/ui/excursion.js`), son moteur
  (`js/engine/grotte.js`), ses réglages (`data/grotte.json`), ses images (`assets/grotte_tuiles.png`,
  `grotte_objets.png`, `grotte.json`, `galerie.png`) et leurs scripts (`scripts/carte/grotte.py`, `galerie.py`), son
  ambiance et sa musique (`assets/son/ambiance/grotte`, `musique/musique_mine`) ; le geste `mineOre` et le vieux carnet
  de minerai (`depositOreNotebook`), la lumière du casque dans la grotte (`lumiereGrotte`), la galerie du récit
  (`galerieOuverte`, `niveauGalerie`, `prendrePierre` : la pierre est dans l'amas d'améthyste, lot 3).
- **La ferme** : plus de tas de terre ni de porte (`objets.mine`, les tuiles `MINE`) ; sa place reste une clairière
  d'herbe, pour que rien d'autre ne bouge (`ferme-generee.js` garde `mineCase`, `devantMine`).
- **Le monde** : les entrées de grotte ne sont plus dessinées ni bloquées ; `lieux.grottes` reste dans le plan, sans
  dessin, parce que leur place écarte encore les autres lieux et les maisons des hameaux et donne le métier de mineur
  (`monde-hameaux.js`). `LIEUX.SORTES` garde `entree_grotte` (la table ne fait que s'allonger).
- **Le générateur 8** (`GENERATEUR_VERSION`), la sauvegarde 85 (`STATE_VERSION`) : la migration 84 → 85 refait la
  ferme et le plan, comme les lots d'avant ; le reste de la partie ne change pas.
- **La campagne** : le chapitre 4 demande un quartz des cristaux de la montagne au lieu d'entrer dans une grotte
  (l'objectif `grotteMonde` et l'événement `carte:grotte_monde` ne sont plus) ; le joueur automatique traite le quartz
  comme un minerai.
- **La Lampe de mineur** (`out_lampe`) : +25 % de minerai aux gisements brisés (son effet `grotte.minerai`, lu par
  `outils.js bonusMinerai`, avec le niveau de la pioche) ; le casque à lampe voit plus loin la nuit.
- **La page** : `js/ui/hote.js` garde `window.FermeHote` (l'heure, le personnage, les messages), le menu du god mode
  (ses actions de test) et oublie une ancienne adresse de la mine (`jeu.html?carte=grotte&…` : la ferme).
- **L'aide et l'encyclopédie** : la fiche « Gisements, minerais et lingots » remplace celle de la grotte ; les pages
  `gisements` et `cristaux_lumineux` remplacent `grotte` et `grotte_montagne`.

Tests : `tests/engine/gisements.test.mjs` (la migration 84 → 85), `peche-faune.test.mjs` (renommé : sans les
grottes), `chapitres.test.mjs` (le quartz du chapitre 4), `pioche.test.mjs` (`refusMinerai`, `bonusMinerai`),
`tests/smoke.mjs` (une ancienne adresse de la mine).
