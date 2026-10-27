# Fiche 11 — L'équipement de la famille et le sac à provisions

## Objectif

Chaque membre de la famille a sa fiche, avec trois cases d'équipement. Le personnage principal a
une quatrième case pour un sac à provisions, qu'il remplit avant de partir en expédition dans le
monde. Le croquis du joueur (`docs/fiches/11-croquis.jpg`) donne la mise en page :

- en bas, un onglet par membre de la famille : le personnage principal (son prénom) d'abord, puis
  les adultes, puis les enfants ;
- à gauche, une colonne de cases d'équipement : trois, plus la case du sac pour le personnage
  principal ;
- au centre, le personnage en pied, dans un cadre, qui porte son équipement (par exemple le casque
  à lampe et la salopette du croquis) ;
- à droite, des barres : ses jauges (énergie, bonheur, faim…) ;
- sous le personnage, une barre : son prénom et son rôle, ou ce qu'il fait ;
- la colonne hachurée du croquis est le menu latéral des fenêtres du jeu (`js/ui/stage-windows.js`),
  à garder s'il existe pour cette fenêtre.

## Contexte

- Lire d'abord `docs/fiches/README.md` et `docs/grand-monde.md`, puis :
  - la famille : `js/engine/family.js` (membres, `mainCharacter` dans `js/engine/depart.js`,
    `memberPerso`), `js/ui/famille.js` (la fenêtre Famille d'aujourd'hui, ses portraits, ses
    jauges), `js/ui/stage-windows.js` (la fenêtre `famille` dans le cadre bois) ;
  - l'énergie et les repas : `js/engine/stamina.js`, `js/engine/repas.js`, `eatSnack` dans
    `family.js`, `eatButton` dans `js/ui/energie.js` (le bouton « Manger ») ;
  - les personnages dessinés : `assets/personnages/` (`cases.json`), `js/carte/gestes.js`, les
    scripts qui les génèrent (`scripts/`) ;
  - l'Atelier (`js/engine/atelier.js`, `data/recipes.json`), l'inventaire
    (`js/engine/inventory.js`, `data/items.json`), la sauvegarde (`STATE_VERSION` dans
    `js/engine/base.js`, `MIGRATIONS` dans `js/engine/state.js`, les témoins de
    `tests/engine/temoins.*`) ;
  - le monde : la sortie de la ferme, `js/engine/monde-vu.js`, `monde-recolte.js`, la grotte
    (`js/engine/grotte.js`), la pêche, et ce qui dit si le personnage est sur la ferme ou dans le
    monde.

## À faire

1. **Les équipements**
   - Il n'en existe pas encore. Créer une petite famille d'objets d'équipement, de 6 à 8 au choix
     motivé, chacun avec un effet simple, réglé dans `data/`. Par exemple :
     - un casque à lampe : voir plus loin dans la grotte et la nuit ;
     - des bottes : marcher plus vite dans le marais et la neige ;
     - des gants de travail : moins d'énergie pour couper et casser ;
     - un tablier de jardinier : moins d'énergie pour planter, arroser et récolter ;
     - un chapeau de paille : moins de fatigue au soleil ;
     - une salopette solide ;
     - un manteau chaud : moins de fatigue en montagne.
   - Les recettes sont à l'Atelier, avec des ingrédients du monde (cuir, laine, fibres, lingots…),
     et les déblocages suivent l'arbre des techniques ou les niveaux de l'Atelier.
   - Les effets sont modestes et ne cassent pas l'équilibre : le joueur automatique doit atteindre
     les chapitres comme avant.
2. **Les cases**
   - Chaque membre a trois cases d'équipement, une pièce d'un type par membre (pas deux casques).
   - On équipe en touchant une case vide : un choix parmi les équipements de l'inventaire qui
     vont à ce membre. Un enfant n'a que des tailles enfant, ou ce que le jeu permet, au choix
     motivé.
   - On retire en touchant une case pleine, et la pièce retourne à l'inventaire.
   - Un équipement porté n'est plus dans l'inventaire et ne se vend pas.
   - L'effet vaut pour le personnage principal. Pour un adulte ou un enfant, il vaut pour ce qu'il
     fait de lui-même (ses trajets, ses tâches sur la ferme), si cela a un sens, sinon la pièce est
     surtout visible. Le dire dans l'aide.
3. **Le sac à provisions** (personnage principal seulement)
   - Une quatrième case reçoit un sac (une recette à l'Atelier ; deux tailles au choix motivé,
     par exemple 6 et 12 portions).
   - On le remplit depuis la fiche : des aliments de l'inventaire ou du frigo, avec le cumul des
     notifications de la fiche 10.
   - **En expédition** (hors de la ferme), le personnage ne mange que ce qui est dans son sac. Le
     bouton « Manger » puise dans le sac et dit quand il est vide. Sur la ferme, rien ne change.
   - Une alerte avertit quand on sort avec un sac vide ou presque, et quand l'énergie baisse loin
     de la ferme avec un sac vide.
   - Le didacticiel et la campagne ne doivent pas se bloquer : à l'étape de la sortie de la ferme,
     un premier sac est offert ou se fabrique tôt, au choix motivé.
4. **Le dessin**
   - Le personnage en pied de la fiche montre ses pièces. Au minimum, le casque à lampe et un ou
     deux autres se voient sur le portrait de la fiche. Sur la carte, si c'est simple à faire dans
     les planches de personnages, sinon le noter.
   - Une icône pixel par équipement et pour le sac, dans le style du jeu.
5. **La sauvegarde**
   - L'équipement de chaque membre et le contenu du sac sont sauvegardés.
   - Format + 1, avec une migration (personne n'est équipé, pas de sac), un test, et le passage des
     témoins.
6. **L'aide et l'encyclopédie**
   - Une entrée d'aide pour l'équipement et le sac.
   - Une page d'encyclopédie par équipement.
   - Le test anti-restes de la 9b reste vert.
7. **Les tests**
   - Équiper et retirer : l'inventaire est juste, pas de doublon ni de type en double.
   - Chaque effet s'applique, et seulement quand la pièce est portée.
   - Le sac : le remplir, manger hors de la ferme seulement depuis le sac, sac vide, sur la ferme
     rien ne change.
   - La migration.
   - Une nouvelle partie va au bout du didacticiel.
   - Le joueur automatique tient la route.

## Hors périmètre

- Le scandium, un métal des niveaux 10 à 12 de la grotte visible seulement avec un équipement :
  noté sur le croquis, ce sera une fiche à part si le joueur la demande. On peut seulement prévoir
  que le casque à lampe puisse servir de condition plus tard.
- De nouveaux métiers, le combat.

## Critères d'acceptation

- Dans Chromium : la fiche de chaque membre s'ouvre par son onglet, avec trois cases, et le
  personnage principal en a quatre.
- On fabrique un casque à lampe à l'Atelier, on l'équipe, il se voit sur le portrait et son effet
  joue ; on le retire.
- On fabrique et remplit un sac, on sort de la ferme, on mange depuis le sac jusqu'à ce qu'il soit
  vide, puis « Manger » refuse avec un message clair.
- Sur téléphone, la fiche tient à l'écran sans défilement horizontal.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md`, section « Après
  le projet » ; `docs/fiches/README.md` : 11 fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les nouveaux dessins regardés en grand.
- Chromium, captures sur ordinateur et sur le profil mobile :
  - la fiche du personnage principal (4 cases, équipé) ;
  - la fiche d'un adulte et d'un enfant ;
  - le choix d'un équipement ;
  - le sac en train d'être rempli ;
  - « Manger » depuis le sac dans le monde ;
  - le sac vide.

  Les regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.

Rendre compte :
- les équipements, leurs effets, leurs recettes ;
- les cases et les règles ;
- le sac et l'expédition ;
- le dessin ;
- la sauvegarde ;
- ce qui change dans le didacticiel et le joueur automatique ;
- les vérifications et leurs résultats exacts ;
- les captures ;
- ce qui reste.
