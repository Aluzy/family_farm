# Fiche I8a — La vocation « village »

## Objectif

Ouvrir la première des vocations de l'île : un petit village convivial. Des fêtes, des projets faits
ensemble, des repas partagés et un village joli font monter une **convivialité** qui débloque des
choses, sans rien retirer à qui préfère produire.

## Contexte

- `docs/ile.md` (« Le jeu visé », point 5) : les vocations ne sont pas un choix dans un menu ; elles
  sortent de ce que le joueur bâtit, et l'on peut suivre les deux.
- Les fêtes : `js/engine/fetes.js`, `data/amitie.json` (`FETES`), `js/ui/fetes.js`. Les projets :
  `js/engine/projets.js`, `data/projets.json` (aménager la place, le jardin partagé), `js/ui/plans.js`.
  La veillée de pleine lune (I7c l'a gardée comme une fête).
- Les repas partagés : `js/engine/invitations.js`. Les styles : `js/engine/styles.js`,
  `data/styles.json` (un coin « à son goût »). Le décor : bancs, lanternes, bacs, guirlandes,
  fontaines (`DATA.DEHORS`, `BACS`, `MASSIFS`).
- Les liens : I6b. Le bonheur : `js/engine/bonheur.js`.

## À faire

1. **Le socle des vocations** (`js/engine/vocations.js`, `data/village.json` : `VOCATIONS`) : une
   vocation = un score entier calculé de l'état de la partie, des paliers, ce que chaque palier
   débloque. Deux vocations peuvent monter ensemble. Prévoir la place d'une troisième sans toucher
   au moteur (une entrée de plus dans les données, un calcul de score enregistré).
2. **La convivialité** : elle monte avec le bonheur moyen des villageois, le nombre de liens « ami »
   et « proche », les fêtes tenues, les projets finis, les repas partagés, le décor de la place
   (bancs, lanternes, fleurs, dans un rayon du panneau du village).
3. **Les fêtes du village** : une par mois de lune au moins, la veillée de pleine lune, la fête d'un
   commerce à son ouverture ; le joueur choisit le jour au calendrier, fournit les plats ; les
   villageois viennent sur la place (assis, attablés : les sièges existants). Une fête monte
   l'affinité de tous ceux qui y sont (I6b).
4. **Les projets du village** : ceux d'aujourd'hui (la place, le jardin partagé), plus un lavoir,
   un kiosque, une fontaine, un four commun ; chacun demande des matériaux et des journées de
   villageois (ils y travaillent à la place de leur tâche : le tableau le montre).
5. **Les paliers** débloquent : de nouveaux décors et meubles (au menuisier), des plans, une
   seconde fête par mois, des candidats à l'arrivée qui ont déjà un lien avec un villageois (un
   ami, un parent), des couleurs d'enseigne. Rien qui produise plus.
6. **L'interface** : dans la fenêtre « L'île », un onglet « Vocations » : le score, le palier, ce
   qui le fait monter, ce que le suivant donne.
7. **La sauvegarde** : les fêtes tenues, les projets, les paliers atteints ; format + 1, migration.
8. **Les tests** (`village-vocations.test.mjs`) : le score et chacune de ses causes ; les paliers ;
   une fête ; un projet avec des journées de villageois ; `fetes.test.mjs` et `projets.test.mjs`
   verts avec `ACTIF: false`.

## Hors périmètre

- La vocation productive (I8b) ; la troisième vocation ; les mimiques pendant les fêtes.

## Critères d'acceptation

- Dans Chromium : on fixe une fête, les villageois viennent s'attabler sur la place ; un projet de
  kiosque se bâtit en trois jours de villageois ; la convivialité passe un palier et un décor se
  débloque.

## Vérifications et livraison

Celles du README du chantier. Captures : une fête sur la place (jour, soir), un projet en cours,
l'onglet « Vocations ».
