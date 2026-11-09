# Les bacs à fleurs (lot 2 des évolutions du crafting)

Après les colorants (lot 1, `docs/colorants.md`) : des bacs où l'on fait pousser les fleurs des colorants à la ferme,
et que l'on repeint de leurs couleurs.

## Les trois bacs

| Bac | Cases | Recette (Atelier) |
|---|---|---|
| Bac rond (un demi-tonneau) | 1 | 3 planches + 1 fibre |
| Bac carré | 1 | 3 planches + 2 pierres + 1 fibre |
| Bac long (une jardinière) | 2 (vers la droite) | 5 planches + 3 pierres + 1 fibre |

Fabriqués dès le début, posés **dehors** comme des blocs (`data/recipes.json`, `ATELIER.BLOCS.<id>.bac` : leur forme ;
l'onglet Jardin du mode Construire). Le bac carré reprend la recette et le prix de l'ancien bac à fleurs.

## Ce qui y pousse

`js/engine/bacs.js` ; les réglages : `data/meubles.json`, `BACS`.

- **Une espèce par bac** : un appui sur un bac vide ouvre « Semer » (`js/ui/bacs.js`), une graine prise
  (`graine_coquelicot`, `_pavot`, `_tournesol`, `_myosotis`, `_lavande`, `_lupin`).
- **Vivaces, 3 nuits** : semée, elle fleurit en `NUITS` (3) nuits, sans arrosage (la nuit : `pousserBacs`). Les
  étapes : semé, pousses, boutons, en fleurs ; un appui sur un bac qui pousse dit dans combien de nuits.
- **La faux** : en fleurs, un appui y envoie le personnage, qui les coupe (un geste de la file, comme l'herbe haute :
  `js/carte/ferme/bacs.js`) : 2 à 3 fleurs (`RECOLTE`), de l'énergie et de l'XP (faucher). Le bac repart de ses
  pousses et refleurit en 3 nuits, sans resemer.
- **Les graines** : une chance sur quatre d'en trouver une en cueillant une fleur sauvage du grand monde
  (`data/monde.json`, `RECOLTE.SORTES.<fleur>.chance`). Les graines de tournesol sont celles de la culture.
- **Les abeilles** butinent les bacs en fleurs (`bacsFleuris`, `js/engine/ruches.js` fleursPourAbeilles).
- Repris, un bac perd ce qui y poussait ; déplacé (le mode Construire), il le garde.

L'état : `state.bacs = { [case]: { fleur, nuits, coupe? } }` (un bac vide n'y est pas). Les commandes `bac.semer` et
`bac.recolter` (`js/engine/commandes.js`) servent aussi en ligne.

## La peinture

Le style B : le bois reste naturel, **le bandeau et le rebord** (bacs carré et long) ou **les cerclages** (bac rond)
prennent la couleur. Sept couleurs : le bois naturel, puis rouge, orange, jaune, vert, bleu, violet (celles des
colorants). Repeindre est **gratuit et libre** : le pinceau du mode Construire, comme les meubles.

Les couleurs d'un bloc qui n'est pas un meuble : `ATELIER.BLOCS.<id>.peinture` nomme une liste de `PEINTURES`
(`data/meubles.json`), lue par `variantesBloc` (`js/engine/blocs.js`) comme les variantes des meubles. Les images sont
dessinées avec deux rampes à elles (`PALETTES.bac_bandeau`, `bac_cerclage`, presque le ton du bois et du fer) que la
carte recolore (`js/carte/ferme/chantier.js`, imageTeinte).

## Les images

`scripts/carte/bacs.py` dessine `assets/bacs.png` : une image de 32 × 24 par état (vide, semé, puis chaque fleur en
pousses, en boutons, en fleurs), pour chaque forme, 60 en tout ; la carte la découpe en images `meuble_bac_<forme>_<état>`
(`js/farm-stage.js` decouperBacs, la liste `BACS` de `js/carte/ferme/config.js`), dessinées comme un meuble
(`js/ui/stage.js` dessinBloc). Le script fait aussi les icônes des trois bacs et des graines, puis
`python3 scripts/icones/build.py`.

## Les anciens bacs

La migration 78 → 79 (`js/engine/state.js`) : le bac à fleurs et le bac de lavande posés deviennent des bacs carrés en
bois naturel, déjà en fleurs (des coquelicots, de la lavande) ; ceux de l'inventaire, des bacs carrés ; le plan du bac
de lavande s'en va (la collection de la prairie garde la pergola). Ils restent le décor des hameaux (leurs projets) et
de l'étage. Les récompenses de la campagne : deux bacs carrés (au lieu de deux bacs à fleurs), un bac long et trois
graines de lavande (au lieu du plan du bac de lavande).

Tests : `tests/engine/bacs.test.mjs`.
