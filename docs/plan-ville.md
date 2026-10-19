# Le plan de la ville (201 habitants)

Le plan validé pour peupler la ville et y placer ses lieux. Les chiffres viennent du modèle
d'équilibre de l'économie (l'artefact « Équilibre de la ville », fonction `resoudre()`) : chaque
adulte travaille, chaque enfant va à l'école, chaque foyer mange à sa faim.

## La population

- **201 habitants en tout** (60 foyers, tous des couples) : 120 adultes, 81 enfants. Selon le
  nombre d'enfants : 12 couples sans enfant, 23 avec 1, 17 avec 2, 8 avec 3.
- **Les 39 producteurs** (agriculteurs, arboriculteurs, céréaliers, bûcherons, éleveurs,
  carriers, pêcheurs, mineurs) vivent hors de la ville avec leur famille : dans la carte de
  transition, à la montagne et à la plage (environ 20 foyers, 66 personnes).
- **La ville loge tous les autres** : 40 foyers, 135 habitants (80 adultes, 55 enfants). Ceux
  qui travaillent hors de la ville y vont chaque jour : la logistique (14 chauffeurs) et la
  scierie (3) dans la transition, la chaudronnerie (2) à la montagne.

## Les logements de la ville

| Logement | Famille | Nombre | Où |
| --- | --- | --- | --- |
| Studio | couple sans enfant | 8 | immeubles |
| T2 | couple + 1 enfant | 15 | immeubles |
| T3 | couple + 2 enfants | 11 | maisons |
| T4 | couple + 3 enfants | 6 | maisons |

- **Immeubles (23 logements)** : l'immeuble ocre (6), la résidence de verre (4), la résidence
  ocre (5), et la tour de la gare, qui devient un immeuble de 8 logements.
- **Maisons (17)** : les rangées de maisons de ville du centre deviennent 17 maisons
  visitables, plus larges : 4 + 4 + 3 à l'ouest de la rue (rangées `maisons_a`), 2 + 2 + 2 à
  l'est (`maisons_b`).

## Les lieux

Tous sont visitables (bâtis en blocs, avec un décor par métier). Ils prennent la place de
bâtiments qui n'avaient pas de rôle. La carte n'est pas agrandie.

| Lieu | Remplace | Employés |
| --- | --- | --- |
| Usine électronique | `usine` | 3 |
| Fabrique de matériaux | `hangar` | 3 |
| Fabrique textile | `entrepot_sud` | 3 |
| Minoterie | `entrepot_du_quai` | 3 |
| Fabrique de mayonnaise | `usine_sud` | 3 |
| Usine informatique | `bureaux_du_sud` | 3 |
| Menuiserie | `longue_maison` | 2 |
| Bureau de négoce | `bureaux_de_la_gare` | 8 |
| Mairie | `maison_corps` (et ses ailes) | 3 |
| Musée | `tour` | 1 |
| École 2 | `bureaux_bruns` | 3 |
| École 3 | `bureaux_clairs` | 3 |
| Cinéma | `bureaux_bleus` | 1 |
| Boulangerie | `maison_bleue` | 2 |
| Pizzeria et fast-food de burgers | `bureaux_est` | 2 + 2 |
| Poissonnerie | `bureaux_du_marche` | 1 |
| Magasin d'informatique | `verriere_est` | 1 |

Gardés tels quels : la conserverie, la fromagerie et la confiturerie (3 employés chacune),
l'école (3), la bibliothèque, la gare, le grand magasin, le marché, les parcs et l'amphithéâtre
(2).

## Les étapes

1. Le plan (ce document).
2. Les 17 maisons visitables et leurs familles (fait : plan « maison », `js/carte/ville/
   immeuble.js`). En attendant l'étape 5, leurs adultes travaillent à la fromagerie, comme
   ceux des immeubles.
3. Les immeubles (fait) : la tour de la gare devient un immeuble de 8 studios (des couples sans
   enfant, `enfants: 0`) ; les 15 logements des trois autres immeubles sont les T2 (un
   enfant). La ville a ainsi ses 40 foyers et ses 135 habitants.
4. Les lieux, par lots de 3 à 5, avec leurs décors (`js/carte/ville/lieux.js`, les meubles et
   les enseignes : `scripts/ville/commerces.py`) :
   - lot 1, les commerces (fait) : boulangerie, pizzeria, fast-food de burgers, poissonnerie,
     magasin d'informatique ;
   - lot 2, les services et loisirs : mairie, musée, cinéma, écoles 2 et 3, bureau de négoce ;
   - lot 3, les fabriques : minoterie, fabriques textile, de mayonnaise et de matériaux, usines
     électronique et informatique, menuiserie.
5. Les emplois et l'économie (`data/economie.json`, `js/engine/economie.js`) : recettes,
   stocks, flux, camions, salaires, sorties et bonheur.
