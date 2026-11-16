# Fiche I9f — Mettre son île en ligne et migrer les mondes existants

## Objectif

Boucler le jeu en ligne de l'île à bâtir : mettre son île entière en ligne, y inviter, la sauvegarder
et la restaurer ; et porter les mondes partagés d'aujourd'hui (des fermes seules) dans le nouveau
jeu, comme I7f l'a fait pour les parties solo.

## Contexte

- I9a à I9e (dont I9a2 : l'horloge commune). I7f (la migration des parties solo : inventaire écrit, amis candidats,
  remboursements, fenêtre de retour, copie de sûreté).
- Mettre en ligne aujourd'hui : c'est une **copie** de la partie solo, sans le grand monde ; on y
  entre par `jeu.html?monde=…` (`js/ui/en-ligne.js`, README « Jeu en ligne »).
- Les sauvegardes d'un monde : une après chaque nuit, d'autres à la demande, la restauration
  (`worker/src/monde.mjs`). Les invitations (un lien de 7 jours, à usage unique).
- Le plafond de poids fixé par I9a.

## À faire

1. **Mettre son île en ligne** : la copie emporte l'île (les écarts du monde, les chemins posés, le
   port, les villageois, les commerces, les liens, la chronique), dans le plafond de poids ; ce qui
   se recalcule de la graine n'est pas copié. La partie solo reste intacte sur l'appareil.
2. **Solo et en ligne** : dire clairement, dans la fenêtre « Jeu en ligne », que ce sont deux îles
   qui vivent chacune leur vie après la copie (comme aujourd'hui), et proposer de **remettre à jour
   la copie** depuis le solo (avec confirmation : elle remplace l'île en ligne, une sauvegarde du
   monde est faite d'abord).
3. **Les sauvegardes du monde** : elles portent l'île entière ; vérifier leur poids et le temps de
   restauration ; en garder le même nombre qu'aujourd'hui si le plafond le permet, sinon dire
   combien.
4. **Les mondes existants** : à la bascule, un monde d'avant (une ferme seule, horloge figée) est
   migré par le serveur à sa première ouverture : la ferme et le coffre intacts ; l'horloge, figée jusque-là, devient vivante (I9a2) ; l'île autour créée
   de la graine de la ferme ; le port et le tronçon de chemin posés ; aucun villageois (ils
   arriveront). Une sauvegarde du monde est gardée avant. Les membres voient la fenêtre de retour.
5. **Les versions** : un joueur dont le jeu n'est pas à jour ne peut pas entrer dans un monde migré
   (un message : recharger la page) ; le serveur refuse une commande d'un moteur plus ancien.
6. **Les tests** : la copie d'une île avancée tient le plafond ; un monde d'avant migre et se joue à
   deux ; la restauration d'une sauvegarde ; le refus d'un client ancien (`test-monde.mjs`,
   `test-synchro.mjs`, `deux-joueurs.mjs`).

## Revu par I9a (les mesures)

- **L'élagage est à refaire pour une île** : `elaguer` retire aujourd'hui `monde.pris`, les régions vues et `voisins`
  (les liens du village). Une île garde ce qui a été pris dehors, les chemins posés (`dehors`), `voisins` ; le
  brouillard du propriétaire part dans son navigateur (comme celui des invités, I9a : `ferme-brouillard-<monde>`).
- **Le plafond** (`VILLAGE.EN_LIGNE`) : 256 Ko pour la partie du monde, 64 Ko pour l'île hors de la ferme. La route
  `POST /mondes` accepte aujourd'hui 2 Mo : la vérifier au plafond, avec un message clair. Une île avancée du joueur
  automatique pèse 75 Ko ; 14 sauvegardes au plafond font 3,5 Mo par monde : on peut en garder 14.
- **La mesure** : `node scripts/poids-ile.mjs` (trois moments d'une partie, ce qui se recalcule de la graine).

## Revu par I9a2 (l'horloge commune)

- **La partie mise en ligne reçoit son horloge et les énergies** : `state.horloge` (`{ pas: 0, sommeil, reveils }`) et
  `state.energies` (celle du propriétaire : l'énergie de sa partie) ; le format 104 les ajoute à la partie d'un monde
  (`mondePartage`) qui ne les a pas. Une île mise en ligne garde sa nuit en cours (une ferme d'avant naît de jour).
- **Un monde d'avant migré passe de F.2 à l'horloge vivante** : son jour et son heure gardés, son pas à 0, ses
  joueurs à l'énergie pleine (la partie n'a qu'une énergie, celle du coffre : on pourrait la donner au propriétaire).
  Un journal d'avant n'a pas de pas : il se rejoue sans pas (au pas 0), c'est-à-dire tel quel.
- **Les instantanés et les sauvegardes** : un instantané tous les 120 pas ou 200 gestes, et au départ du dernier ; une
  sauvegarde par heure de jeu en ligne et au départ du dernier (14 gardées) ; plus de sauvegarde « après la nuit »
  pour une île (cinq nuits par heure).

## Revu par I9b (les changements de l'île)

- **À garder à la mise en ligne d'une île** (`elaguer` les retire encore) : `monde.pris` (ce qui est pris dehors et
  quand cela revient : il repousse maintenant dans les pas), `monde.vues` (les régions vues du monde : là où l'on
  repousse), `dehors` (les chemins posés). Le brouillard du propriétaire (`monde.vu`) part dans son navigateur.
- **Le sac du propriétaire** devient le sien dans `state.sacs` (c'est fait à la création : `MondeRegistre.creer`) ; une
  île mise en ligne avant I9b garde le sac de sa partie à personne (la migration 104 → 105 n'en sait pas le
  propriétaire) : le lui rendre à la migration d'un monde.
- **Le plafond** : une île très exploitée pèse 17 à 38 Ko d'écarts (`node scripts/cout-ile.mjs`) ; l'île hors de la
  ferme reste sous ses 64 Ko.

## Revu par I9c (le port et la caisse)

- **La mise en ligne d'une île écrit le lieu du port dans la partie** (`state.port.lieu`, d'après le plan de sa graine :
  ≈ 0,7 s, une fois ; `MondeRegistre.creer` et `restaurer`) et fait du portage de la partie la charge du propriétaire
  (`state.charges`). Une île mise en ligne avant I9c n'a pas de lieu : son comptoir reste fermé en ligne (« la carte
  du monde se prépare »). La migration des mondes existants doit le poser (une commande du monde, ou une reprise de
  l'instantané diffusée à tous).
- **Le format 106** (`charges`) : la migration d'un monde le répare.

## Revu par I9d (les villageois en ligne)

- **`elaguer` garde `voisins` pour une île** (les liens et les événements entre villageois : liens.js) ; une ferme d'avant
  les retire toujours (les hameaux).
- **L'amitié du propriétaire** devient la sienne dans `state.amities` (fait à la création : `MondeRegistre.creer` ; à une restauration dont la sauvegarde n'en a aucune : `restaurer`) ;
  `state.amitie` reste l'amitié du village (la meilleure des joueurs). Une île mise en ligne avant I9d n'a pas
  d'amitiés par joueur (la migration 106 → 107 n'en sait pas le propriétaire) : chacun y commence à l'accueil ; la lui
  rendre à la migration d'un monde.
- **Le poids** : `voisins` gardé ajoute ≈ 3 Ko à une île de cinq villageois, ≈ 6 Ko à dix (`node scripts/cout-villageois.mjs`,
  la colonne « partie Ko ») ; l'amitié de chacun, la taille de `state.amitie` par joueur qui a parlé aux villageois.

## Revu par I9e (les rôles en ligne)

- **Les réglages du monde** (`meta.reglages = { taches }`, la délégation des tâches) sont au Durable Object, pas dans la
  partie : une migration de monde les laisse ; une restauration aussi (ils ne sont pas dans la sauvegarde).
- **La grille d'une île** ne vaut que pour une île (`ilePartagee`) : un monde d'avant migré en île change de grille
  (fabriquer passe à l'ami jardinier ; les gestes du village, au propriétaire). Le dire au propriétaire à la migration.
- **Le format 108** (`par` sur une ligne de la chronique d'un monde) : la migration d'un monde la relit.
- **Les noms** : un monde d'avant garde ses noms de membres jusqu'à la première connexion de chacun (`hello.prenom`).
- **Ce qui s'écrit encore dans la partie locale en ligne** (la fiche d'un membre de la famille, ses habits, un animal,
  le choix d'un lit) : à revoir avec la mise en ligne d'une île, où la famille de la partie est celle du propriétaire.

## Hors périmètre

- Fusionner une île solo et son île en ligne ; un monde à plus de joueurs qu'aujourd'hui.

## Critères d'acceptation

- On met une île avancée en ligne, un ami y entre par invitation, marche jusqu'au port, coupe un
  arbre, parle à un villageois ; on restaure la sauvegarde de la veille.
- Un monde d'avant, ouvert après migration, garde sa ferme et gagne son île.

## Vérifications et livraison

Celles du README du chantier, plus les tests du serveur. Mettre à jour `worker/README.md`.

## Fait (I9f)

Le détail et les mesures : `docs/ile.md`, « Mettre son île en ligne et migrer les mondes d'avant (I9f, fait) » ;
`docs/monde-partage.md` § 13, « Ce que fait I9f » ; `worker/README.md`.

1. **Mettre son île en ligne** (`MondeRegistre.copie`, la même pour la création et la copie remise à jour) : l'élagage
   d'une île (`elaguer`, `GRAND_MONDE_ILE`) garde `monde.pris`, `monde.vues`, `dehors` (les chemins et les rails),
   `voisins` ; la charrette, le port et son lieu, les villageois et leurs traits connus, les commerces, la chronique, les
   noms passent tels quels ; le brouillard du propriétaire part dans son navigateur (`ferme-brouillard-<monde>`, posé par
   ⚙️ Options › Jeu en ligne) et le monde garde le vu des régions de sa ferme. Le plafond (`VILLAGE.EN_LIGNE`) est vérifié
   à la copie d'une île, avec son poids dans le message (`poidsDuMonde`, `js/engine/frontiere.js`) ; la route garde 2 Mo
   à l'envoi (le brouillard et ce que le monde ne garde pas n'y comptent pas) ; une ferme d'avant garde la limite d'avant.
   La fenêtre du retour d'une partie solo migrée reste au solo.
2. **Solo et en ligne** : ⚙️ Options › Jeu en ligne dit « 🌐 Mettre mon île en ligne », ce que la copie emporte (et son
   poids), et que ce sont deux îles qui vivent chacune leur vie ; « 🔄 Remettre à jour » (le propriétaire, avec une
   confirmation) remplace l'île en ligne par la partie solo du jour (`POST /mondes/<id>/remplacer`, `remplacer`), après
   une sauvegarde du monde (« avant la copie remise à jour ») ; les membres restent, chacun repart de zéro (énergie, sac,
   charge, amitiés) ; les autres joueurs sont prévenus.
3. **Les sauvegardes** portent l'île entière ; mesurées (`node scripts/cout-mise-en-ligne.mjs`) : 54 Ko au jour 41,
   83 Ko au jour 81, 121 Ko au jour 161 (8 villageois) ; 14 gardées : 0,7 à 1,7 Mo (3,5 Mo au plafond) ; restaurées en
   2 à 4 ms. On en garde 14, comme avant. Une île restaurée garde sa nuit en cours.
4. **Les mondes d'avant** sont mis à jour par le serveur à leur première ouverture (`mettreAJour`, depuis `charger`) :
   le format du serveur (le journal d'après l'instantané rejoué), puis, pour une ferme d'avant le chantier allumé
   (`ileDue` ; pendant le chantier, un Durable Object d'essai : `env.ILE_ESSAI`), le passage sur l'île par la migration
   d'I7f (`migrerVersLIle`) : la ferme et le coffre intacts, l'horloge vivante (jour et heure gardés, pas 0), l'énergie,
   le sac, la charge et l'amitié du propriétaire celles de la partie, le port et son lieu, le tronçon posé, aucun
   villageois, le cadeau au coffre commun une fois par monde. La partie d'avant est gardée (la table `avant_migration`,
   et la sauvegarde « avant le passage sur l'île ») ; une marque `monde.migrer` au journal. Une île d'avant I9b, I9c, I9d
   reçoit ce qui lui manque (le lieu du port, le sac, la charge, l'amitié du propriétaire). Chaque membre voit la
   fenêtre du retour, une fois (le propriétaire : la grille des rôles d'une île, la ferme d'avant dans 💾).
5. **Les versions** : le monde prend la version et le format du serveur ; `hello.format` (nouveau) : un jeu plus ancien
   (ou d'avant I9f, sans format, dans un monde mis à jour) est refusé, « recharge la page » ; un plus récent, « réessaie
   dans quelques minutes » (le serveur se met à jour) ; une commande d'une connexion dont le jeu ne joue plus la version
   du monde est refusée.
6. **Les tests** : `tests/test-monde.mjs` (7 tests I9f), `tests/test-synchro.mjs` (un monde d'avant migré joué à deux,
   une heure de pas), `tests/deux-joueurs.mjs` (14a à 14e, 15a à 15c).

Ce qui s'écrivait encore dans la partie locale en ligne : la fiche d'un membre de la famille, ses habits, sa tente, un
animal, l'aide du compagnon sont refusés en ligne (« on les change dans sa partie solo » : la famille de la partie d'un
monde est celle de son propriétaire, et ces gestes ne s'écrivaient que dans la partie locale, effacés au geste suivant
d'un autre) ; le choix d'un lit l'était déjà (E-10). Le journal dit « Qui a fait quoi dans ton île » sur une île. Les
noms (« Voisin ») se corrigent à la première connexion de chacun (`hello.prenom`, I9e) : rien de plus à migrer. Les
réglages du monde sont au Durable Object : la migration et la copie remise à jour les laissent.

Pas de nouveau format de sauvegarde (109) : `retourIle.monde` et `retourIle.donne` sont dans un champ qui existe ; la
version et le format du monde sont au Durable Object (`meta`).

**À confirmer par le joueur** : la copie remise à jour remet à zéro ce qui était à chaque invité dans l'île en ligne (son
sac, sa charge, ses amitiés avec les villageois) plutôt que de le garder (les villageois de la partie solo ne sont plus
forcément les mêmes) ; le cadeau de bienvenue d'un monde migré va au coffre commun, une fois, pour tous ; pendant le
chantier, aucun monde publié n'est migré (seul un Durable Object d'essai le fait) ; la famille, ses habits et ses
animaux ne changent pas en ligne.
