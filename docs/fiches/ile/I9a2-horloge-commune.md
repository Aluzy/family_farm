# Fiche I9a2 — L'horloge commune

## Objectif

Faire vivre le temps dans un monde partagé : une seule horloge, tenue par le serveur, qui tourne
pour tous les joueurs connectés. Le jour se lève et tombe pour tout le monde en même temps ; les
plantes poussent, les appareils tournent, les préparations cuisent, comme en solo.

## Contexte

- `docs/ile.md` (D13). I9a (la frontière : l'heure est commune).
- Aujourd'hui (F.2, `worker/src/monde.mjs`) : le temps du monde est figé, les commandes ne font pas
  avancer l'horloge, la nuit entière passe d'un coup quand tous les joueurs connectés sont couchés
  (`nuit.partagee`, l'acteur « monde ») ; une préparation ne finit qu'à la nuit partagée.
- L'horloge du solo : `js/engine/clock.js` (une heure dure 30 s ; endormi, 3 s), `js/ui/loop.js`
  (la boucle), `js/engine/offline.js` (le rattrapage par pas de 5 s, plafonné), `js/engine/night.js`
  (à minuit, la nuit passe), `js/engine/energy.js`, `kitchen.js`, `crops.js` (la pousse 24 h après
  l'arrosage : `tests/engine/pousse-horodatage.test.mjs`).
- Le déterminisme : `tests/engine/rejeu.test.mjs` ; le moteur n'a ni horloge ni hasard à lui
  (`commandes.js`).
- Les limites d'un Durable Object : calcul par requête, alarmes, coût quand il reste éveillé.

## À faire

1. **Une note de conception**, d'abord, à faire valider avant de coder : comment le serveur fait
   avancer le temps. Proposition :
   - l'horloge tourne **tant qu'un joueur au moins est connecté** ; sans personne, le monde dort
     (rien ne tourne sans joueur : pas de coût, pas de surprise au retour) ;
   - le serveur avance le monde par **pas** (5 s de jeu, comme le rattrapage du solo), sur une
     alarme ; un pas est une commande du monde (`temps.pas`), numérotée et diffusée comme les
     autres : les clients la rejouent, donc tout le monde a le même état ;
   - entre deux pas, chaque client anime l'heure localement d'après l'heure du serveur (donnée à la
     connexion, puis recalée) : l'affichage est fluide, l'état fait foi.
2. **La nuit** : comme en solo, la nuit vient seule à l'heure dite. Quand **tous** les joueurs
   connectés sont couchés, le temps s'accélère (la cadence du sommeil) jusqu'au réveil ; sinon il
   garde son pas. Le bandeau « 1/2 couchés » reste. L'énergie de chaque personnage est à lui.
3. **Ce qui tourne à l'heure** : le panneau et la batterie, la pompe, le moulin, la presse, les
   chaînes, les préparations de la cuisine, la pousse des plantes, le passage du bac (I1c), les
   heures du port (I1b). Une préparation finit à son heure, plus à la nuit.
4. **Les arrivées et les départs** : un joueur qui se connecte reçoit l'état et l'heure ; le dernier
   qui part endort le monde ; au retour, pas de rattrapage (le monde reprend où il s'était arrêté).
   Le dire au joueur dans la fenêtre « Jeu en ligne ».
5. **Le coût** : mesurer le nombre de pas, d'octets et de réveils du serveur par heure de jeu, à un
   et à quatre joueurs ; proposer un pas plus long si c'est trop (les animations sont locales).
6. **Les tests** : deux clients et le serveur ont le même état après une heure de pas ; l'horloge
   s'arrête sans joueur et reprend ; la nuit accélérée quand tous dorment ; une préparation finit à
   son heure ; un client en retard rattrape sans écart (`test-synchro.mjs`, `deux-joueurs.mjs`,
   `test-monde.mjs`).

## Hors périmètre

- Les villageois dans le temps commun (I9d) ; le monde hors de la ferme (I9b).
- Un monde qui vit sans aucun joueur connecté.

## Critères d'acceptation

- Deux onglets : la même heure s'affiche des deux côtés, le soir tombe en même temps ; une soupe
  lancée par l'un est prête pour l'autre à l'heure dite ; les deux se couchent, la nuit file ; un
  seul se couche, elle garde son pas.
- Les mesures de coût sont données, avec le pas retenu.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation. Joindre la note de conception
validée et les mesures.
