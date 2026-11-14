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

## Hors périmètre

- Fusionner une île solo et son île en ligne ; un monde à plus de joueurs qu'aujourd'hui.

## Critères d'acceptation

- On met une île avancée en ligne, un ami y entre par invitation, marche jusqu'au port, coupe un
  arbre, parle à un villageois ; on restaure la sauvegarde de la veille.
- Un monde d'avant, ouvert après migration, garde sa ferme et gagne son île.

## Vérifications et livraison

Celles du README du chantier, plus les tests du serveur. Mettre à jour `worker/README.md`.
