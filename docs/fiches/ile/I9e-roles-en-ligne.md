# Fiche I9e — Les tâches, les commerces et les rôles en ligne

## Objectif

Permettre de vivre le village à plusieurs sans se marcher dessus : c'est le joueur de l'île qui
attribue les tâches et décide des commerces ; ses invités bâtissent, récoltent, produisent et se
lient avec les villageois.

## Contexte

- `docs/ile.md` (D15 : le joueur attribue les tâches ; un commerce s'ouvre quand un villageois
  assez proche du joueur en manifeste l'envie et que le joueur le décide).
- I5a (l'envie d'ouvrir un commerce, l'affinité qu'il faut), I9c (le port et la caisse), I9d (le
  village dans l'horloge commune ; l'amitié est par joueur).
- Les rôles : `js/engine/roles.js` (visiteur, jardinier, bâtisseur, propriétaire ; chaque commande
  demande un rôle au moins), `docs/monde-partage.md` (E-11), la fenêtre 👥 (`js/ui/en-ligne.js`),
  le journal du monde.
- Les commandes posées par les lots : `villageois.attribuer`, `villageois.outil` (I3c), celles des
  commerces (I5a), des fêtes et des projets (I8a), des noms (I7g).

## À faire

1. **La grille des rôles** étendue :
   - visiteur : regarde, parle ;
   - jardinier : en plus, le potager, les bêtes, la cuisine, les outils, récolter sur l'île, vendre
     au port, offrir, répondre à une demande, fabriquer et **confier un outil** à un villageois ;
   - bâtisseur : en plus, Construire (sur l'île aussi), bâtir une maison libre et un local, acheter
     au port ;
   - propriétaire (le joueur de l'île) : en plus, **attribuer les tâches**, **décider qu'un
     villageois ouvre un commerce**, monter le port, nommer l'île, le village et les commerces,
     fixer une fête, retirer une maison habitée.
   Lecture retenue de D15, à confirmer : en ligne, « le joueur » est le propriétaire de l'île.
   Prévoir un réglage du monde, éteint par défaut, par lequel il délègue l'attribution des tâches
   aux bâtisseurs.
2. **L'envie d'un commerce en ligne** : l'affinité qui compte est celle du villageois avec le
   **propriétaire** ; l'envie se voit par tous (la bulle, la fiche), seul le propriétaire décide.
   Un invité très ami d'un villageois peut le lui **suggérer** (une notification au propriétaire).
3. **Les garde-fous** : un changement de tâche est daté et signé dans le journal du monde ; retirer
   la maison d'un villageois demande le propriétaire ; un villageois ne se renvoie pas.
4. **La vue « qui fait quoi »** est lisible par tous ; les boutons n'y paraissent que pour qui a le
   droit.
5. **La chronique** (I7g) est celle du monde ; les notes épinglées sont signées.
6. **Les tests** : chaque commande et son rôle minimal (un tableau de cas) ; la délégation ; la
   suggestion d'un invité ; les refus côté serveur même si le client est modifié.

## Revu par I9a2 (l'horloge commune)

- **Un visiteur compte pour la présence et pour les lits** : une connexion ouverte fait tourner le monde (D13, sans
  détection d'inactivité en v1), et un visiteur debout retient la nuit (elle garde son pas tant que tous les joueurs
  connectés ne sont pas couchés : `worker/src/monde.mjs`, `lits`). C'est ce que fait le code aujourd'hui ; à confirmer ici.
- **Le journal du monde** compte une commande de plus, celle du monde : `temps.sommeil` (« tous couchés, la nuit file,
  ou l'un s'est levé »), acteur « monde ».

## Revu par I9b (les changements de l'île)

- **Les nouvelles familles de commandes** ont leur rôle dans `js/engine/roles.js` : `monde` (`monde.recolter` : couper,
  casser, faucher, cueillir, ramasser dehors) et `sac` (`sac.poser`, `sac.remplir`…) demandent l'ami jardinier, comme
  les outils de la ferme ; les blocs du dehors (`bloc.*`), le bâtisseur. À revoir dans la grille complète : un visiteur
  devrait-il pouvoir ranger son propre sac, manger de ses provisions ?
- **Un bloc du dehors posé par un autre** (un chemin, un pont) se reprend avec `bloc.reprendre` : le propriétaire
  voudra peut-être protéger les chemins (comme une structure sensible).

## Revu par I9c (le port et la caisse)

- **Le port a déjà sa grille** (`js/engine/roles.js`, `PAR_TYPE`), celle de cette fiche : vendre, décharger, honorer
  une commande, livrer un contrat et porter (`portage.*`), l'ami jardinier ; acheter, importer, accepter un contrat,
  apporter au chantier du port, le bâtisseur ; agrandir le port, le propriétaire (« Seul le propriétaire de l'île
  agrandit le port. »). Le visiteur ne vend ni n'achète. À reprendre dans le tableau de cas.
- **Le journal du monde porte le bilan des gestes du commerce** (la colonne `bilan` : qui a vendu quoi, pour combien ;
  les achats ; le niveau du port) ; l'ordre d'une tâche pourrait y avoir le sien (le villageois, la tâche d'avant et
  d'après) par le même chemin (`bilanCommerce`, à généraliser).
- **La charrette et les brouettes** sont à la ferme, donc à tous : une brouette par joueur à la fois, la charrette à un
  seul ; vide, elle passe à qui la demande. Un réglage du propriétaire (« la charrette est à moi ») serait de cette
  fiche, s'il manque.

## Revu par I9d (les villageois en ligne)

- **Parler, offrir, accueillir** sont des commandes (`villageois.parler`, `villageois.offrir`, `villageois.accueillir`)
  qui demandent l'ami jardinier (`js/engine/roles.js`, `PAR_TYPE`). Le visiteur parle aux villageois sans rien changer :
  sa page tire la bulle sur une copie de sa partie et n'envoie rien (`js/ui/villageois.js`, `parlerEnLigne`). À revoir
  dans la grille complète.
- **Les gestes de la fiche d'un villageois** (confier une tâche, donner ou reprendre un outil, la navette, un foyer, un
  enfant) appellent encore le moteur sur la partie locale (`js/ui/villageois.js`, `js/ui/liens.js`) : en ligne, ce sont
  des prédictions que la partie refaite efface. Les commandes existent (`villageois.attribuer`, `villageois.outil`,
  `villageois.vendre`, `villageois.foyer`, `villageois.enfant`) : à brancher ici, avec leur rôle (la famille `villageois`
  demande aujourd'hui le bâtisseur, par défaut).
- **Ce que la carte révèle des traits** (un villageois vu, une réplique entendue : `observerTraits`, `noterIndice`) ne
  s'écrit pas en ligne (le serveur seul fait compter) ; ce qu'il dit de lui en parlant, si (dans `villageois.parler`) :
  ce qu'on sait de ses traits est du monde, commun à tous. À trancher : par joueur, comme l'amitié ?

## Hors périmètre

- De nouveaux rôles ; la modération entre joueurs (le propriétaire peut déjà retirer un membre).

## Critères d'acceptation

- Deux onglets, le propriétaire et un bâtisseur : le premier attribue une tâche, le second se voit
  refuser la même action avec un message clair, puis l'obtient une fois la délégation allumée ; un
  villageois manifeste son envie, l'invité la suggère, le propriétaire décide ; le journal porte
  chaque ordre et son auteur.
- La grille est dans `docs/monde-partage.md`.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation.
