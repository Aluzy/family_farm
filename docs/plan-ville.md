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
   immeuble.js`).
3. Les immeubles (fait) : la tour de la gare devient un immeuble de 8 studios (des couples sans
   enfant, `enfants: 0`) ; les 15 logements des trois autres immeubles sont les T2 (un
   enfant). La ville a ainsi ses 40 foyers et ses 135 habitants.
4. Les lieux, par lots de 3 à 5, avec leurs décors (`js/carte/ville/lieux.js`, les meubles et
   les enseignes : `scripts/ville/commerces.py`) :
   - lot 1, les commerces (fait) : boulangerie, pizzeria, fast-food de burgers, poissonnerie,
     magasin d'informatique ;
   - lot 2, les services et loisirs (fait ; leurs meubles : `scripts/ville/services.py`) :
     mairie, musée, cinéma, écoles 2 et 3, bureau de négoce ;
   - lot 3, les fabriques (fait ; leurs machines : `scripts/ville/fabriques.py`) : minoterie,
     fabriques textile, de mayonnaise et de matériaux, usines électronique et informatique,
     menuiserie.
5. Les emplois et l'économie, en trois parties :
   - 5a, les emplois (fait) : la grille des postes (`VOISINS.EMPLOIS`, `data/ville.json` : le
     métier, le lieu, les horaires en un ou deux services, le salaire), un poste pour chacun des
     80 adultes (`assigneEmplois`, `js/engine/voisins.js`), leur journée sur la carte
     (`js/carte/ville/habitants.js`), les enfants répartis dans les trois écoles ;
   - 5b, les achats du joueur dans les commerces (fait) : au comptoir d'une boutique (sa
     vitrine, son étal, son présentoir), quand un employé y travaille, une fenêtre d'achat
     (`VILLE.BOUTIQUES`, `data/ville.json` ; `buyInShop`, `js/engine/ville.js`) : le pain, les
     croissants et les tartes, la pizza, le burger et les frites, les poissons, l'ordinateur.
     Ils vont dans l'inventaire ; une pizza ou un burger rend son bonheur au repas ;
   - 5c, l'économie complète du modèle (`ECONOMIE`, `data/economie.json` ; `js/engine/economie.js`),
     en trois parties :
     - 5c-1, le moteur (fait) : chaque nuit, les producteurs hors de la ville livrent ce qui
       manque, les fabriques transforment (au plus leur capacité, ce que les camions portent),
       les boutiques et l'export écoulent ; les prix suivent les stocks ; les citadins achètent
       leurs repas aux boutiques et sortent au cinéma, au musée ou à l'amphithéâtre quand leur
       bonheur baisse ; la caisse de la ville ; le bureau de négoce rachète au joueur les
       matières en pénurie (`sellToNegoce`) ; le joueur propriétaire d'une entreprise touche la
       moitié de son bénéfice ;
     - 5c-2, les fenêtres (fait ; `js/carte/ville/marche.js`) : au guichet de la mairie, le
       tableau de bord (la caisse, les habitants, les pénuries, les stocks et les prix du jour,
       les comptes d'hier) ; au guichet du bureau de négoce, la vente des matières qui manquent ;
       aux comptoirs des boutiques, leur stock et leur cours ; dans la fenêtre d'une
       entreprise du joueur, ses comptes dans l'économie de la ville et sa part ;
     - 5c-3, sur la carte (fait) : le soir de sortie, la famille va à pied au cinéma (on la
       voit dans la salle, devant les fauteuils), au musée ou à l'amphithéâtre, et rentre à
       21 h 30 (`js/carte/ville/habitants.js`) ; le jour, les camions de la logistique
       (`scripts/ville/camion.py`) roulent dans les rues, autant que l'économie en a fait rouler
       la veille (au plus 4 à la fois : `js/carte/ville/circulation.js`).
6. Les déplacements dans la ville : les trajets à pied sont longs (jusqu'à 4 h de jeu d'un bout à
   l'autre). D'abord prévues, les lignes de bus (#197) ont été retirées : trop peu d'habitants y
   gagnaient (leurs arrêts étaient loin de la plupart des maisons et des lieux de travail). À la
   place :
   - la circulation va plus vite : les voitures et les camions à 100 px/s, le bus de l'école à
     120 ;
   - 20 % des adultes (les 16 qui ont le plus long chemin jusqu'à leur travail) ont une voiture
     (`VOITURES`, `js/carte/ville/voitures.js`) : elle les attend au bord de la rue la plus
     proche, roule par les rues dans la circulation et les dépose au plus près ;
   - les autres adultes vont à vélo (`VELO`, `js/carte/ville/velos.js` ; le vélo :
     `scripts/personnage/velo.py`), 2,2 fois plus vite qu'à pied : en bas de chez eux, ils
     montent dessus, roulent sur le trottoir jusqu'à la rue la plus proche, suivent les rues au
     bord de la chaussée jusqu'à leur travail, descendent à la porte et entrent à pied ;
   - chacun prend sa voiture ou son vélo quand c'est au moins un dixième plus court qu'à pied
     (`planTrajet`, `js/carte/ville/habitants.js`) : pour le travail (l'heure de départ en
     tient compte), le marché, les sorties et le retour à la maison. Les enfants vont à pied.
