# Fiche I9a2 — L'horloge commune

> **La note de conception** : `I9a2-note-horloge.md`, **validée par l'utilisateur le 14 novembre 2026** (les dix
> réponses proposées au § 9, telles quelles). En résumé :
> - les pas (5 s d'horloge, 10 minutes de jeu) **se déduisent de l'heure du serveur et ne sont pas des révisions** :
>   avant chaque geste, le serveur rejoue les pas dus, pas à pas ; le geste porte son numéro de pas ; chaque client
>   fait de même. Par heure en ligne : 720 pas, ≈ 3 s de calcul, 0,4 Mo écrits (1,3 Mo au plafond), 6 alarmes,
>   presque rien de diffusé ; un pas joué comme une révision écrirait 2,9 Mo (9,3 Mo), réveillerait le serveur
>   720 fois et ramènerait le rattrapage à 42 minutes ;
> - un pas de 60 s ne donne pas le même état que 12 pas de 5 s (énergie, Moulin, villageois) ; les mêmes pas de 5 s,
>   eux, donnent la même partie au serveur et à chaque client : le pas est une constante du protocole ;
> - la nuit vient seule à 22 h ; tous couchés, elle défile ×10 ; l'énergie devient celle de chaque joueur (par
>   compte, dans la partie du monde) ; sans joueur, le monde dort, sans rattrapage au retour ;
> - dix questions à trancher, avec une réponse proposée pour chacune (§ 9 de la note).

> **Fait** (voie b) : `js/engine/temps-monde.js`, `worker/src/monde.mjs`, `js/ui/synchro.js`, `js/ui/en-ligne.js` ; les
> mesures sur le code (`node scripts/cout-horloge.mjs`) et ce qui reste : `docs/ile.md`, « L'horloge commune ».

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

## Revu par I9a (les mesures)

- **Les pas et le stockage du monde.** Joué comme une commande (une révision chacun), un pas toutes les 5 s fait un
  instantané toutes les 100 s (`MONDE.INSTANTANE_TOUS` = 20) : ≈ 2,7 Mo écrits par heure passée en ligne pour une
  île de 75 Ko (l'île avancée du joueur automatique), 9 Mo au plafond (256 Ko) ; et le journal de rattrapage
  (`JOURNAL_GARDE` = 500 révisions) ne couvrirait plus que 40 minutes. La note de conception doit le régler : un
  instantané au temps (et non au nombre de révisions), ou des pas qui ne sont pas des révisions du journal (le pas se
  déduit de l'heure du serveur : `temps.pas { jusqua }` rejoue tout l'intervalle), à mesurer avec le reste du coût.
- **La nuit d'une île** coûte 149 ms au serveur la première fois, puis 16 à 34 ms (six villageois) : la nuit qui vient
  seule à l'heure dite tient dans un pas.
- **L'énergie de chacun** (la frontière, `docs/monde-partage.md` § 13) : aujourd'hui, celle du personnage est dans la
  partie du monde (F.1) ; elle devient celle de chaque joueur dans cette fiche (point 2).

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
