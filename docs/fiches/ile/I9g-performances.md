# Fiche I9g — Les performances

## Objectif

Vérifier, mesures à l'appui, que l'île à bâtir tourne aussi bien que le jeu d'aujourd'hui sur un
téléphone, avec un village complet toujours à l'écran, et corriger ce qui ne tient pas.

## Contexte

- Les lots 3, 5, 6 et 8 ont mis sur la ferme ce qui était loin : jusqu'à une quinzaine de
  villageois, des commerces, des fêtes ; le lot 2, des chemins sur toute l'île.
- Les mesures et leurs méthodes : `docs/perf.md`, `docs/chantier-allegement.md`,
  `docs/taches-fluidite.json`, `js/ui/mesures.js`, `scripts/mesure-touches.mjs`,
  `tests/engine/perf-ferme.test.mjs`, `cadence.test.mjs`, `ordonnanceur.test.mjs`.
- Le socle : l'ordonnanceur de la scène (fiche 33), les layers (fiche 26), le sol peint dans un
  Worker (fiche 29), les objets et le sol au GPU (fiches 34 et 35).
- Ce que I7e a retiré (hameaux, habitants, calèche : calculs et atlas en moins).

## À faire

1. **Le protocole** : trois parties de référence (début, village de 8, village de 15 avec commerces
   et fête), trois appareils (bureau, téléphone de milieu de gamme, téléphone modeste, émulés ou
   réels), les mêmes parcours filmés. Les garder dans le dépôt des tests pour les refaire.
2. **Les mesures**, comparées au jeu d'avant (la branche d'archive) : temps d'une image (médiane et
   pire centième), mémoire, temps de chargement, poids téléchargé, durée d'une nuit, taille de la
   sauvegarde, durée de la migration d'une grosse partie.
3. **Les bornes** : pas plus lent que le jeu d'avant sur les deux premières parties ; sur la
   troisième, 30 images par seconde tenues sur le téléphone modeste. Sinon, corriger.
4. **Les pistes** si ça ne tient pas : les villageois loin du centre de la vue animés une image sur
   deux ; les trajets calculés hors du fil d'affichage ; les bulles et enseignes regroupées en un
   layer ; les commerces fermés la nuit sans calcul ; les chemins de l'île dessinés avec le sol.
5. **La sauvegarde** : si elle a trop grossi, compacter (les journaux de 7 jours, les affinités,
   les chemins).
6. **Un test de garde** : une borne de temps sur la nuit d'un village de 15 et sur la taille de la
   sauvegarde, dans `perf-ferme.test.mjs`.

## Revu par I9a2 (l'horloge commune)

- **Le pas du monde sur un téléphone de référence** : chaque joueur d'une île en ligne joue un pas toutes les 5 s (deux,
  avec la partie confirmée qui suit de deux pas en arrière), ≈ 6 ms de jour sur un ordinateur pour l'île avancée, 15 à
  20 ms à minuit. À mesurer sur les trois appareils, avec un village de 15.
- **Le rattrapage** : au-delà de 60 pas de retard (5 minutes : un onglet resté caché), le joueur redemande la partie
  entière (`VILLAGE.EN_LIGNE.RETARD_PAS`) ; en deçà, il rejoue les pas d'un coup (≈ 0,4 s pour 60 pas sur un
  ordinateur). Mesurer ce gel sur un téléphone ; s'il se voit, abaisser le seuil ou étaler le rattrapage sur
  quelques images.
- **Le serveur** : une alarme toutes les 10 minutes joue d'un coup les pas dus sans geste (jusqu'à 120 : ≈ 1 s de
  calcul sur l'île avancée) ; à suivre dans les journaux de Cloudflare (le temps de calcul par requête).

## Revu par I9b (les changements de l'île)

- **Ce qui pèse sur le réseau, ce sont les positions** (E-4), pas les gestes : à quatre joueurs dans la même région,
  362 Ko/min diffusés (90 Ko/min par joueur), dont 346 de positions ; un geste dehors pèse ≈ 155 octets (14 Ko/min à
  quatre qui récoltent). L'intérêt par région (I9b) ramène quatre joueurs dispersés à 50 Ko/min ; ensemble, il ne
  change rien : réduire la cadence (5 par seconde) ou la taille d'une position serait le levier suivant.
- **Le sol tiré en direct** : au serveur, pour un bloc posé dehors, 0,43 s la première fois (le contexte), puis 14 à
  33 ms par région (12 gardées) ; chez un joueur, la même chose sur le fil principal quand un autre pose un bloc dans
  une région que sa page n'a pas encore (≈ 0,5 s, une fois) : à mesurer dans un vrai navigateur, et à passer au
  Worker du sol si cela se voit.
- **La mesure** : `node scripts/cout-ile.mjs` (les octets par minute à 2 et 4 joueurs, le contrôle d'un geste, une
  île très exploitée).

## Revu par I9c (le port et la caisse)

- **Un geste du port pèse ≈ 210 octets diffusés** (dont ≈ 44 pour son bilan) et coûte au serveur 0,1 à 0,3 ms : le
  commerce ne pèse rien à côté des positions.
- **La mise en ligne d'une île** calcule le plan de sa graine pour le lieu du port (≈ 0,7 s, une fois) : à ajouter au
  coût de la création (I9f).
- **Le contrôle de la case** d'un geste du port lit la dernière position relayée (`dernieresPos`) : si l'intérêt par
  région change la façon dont les positions sont gardées, le garder.

## Hors périmètre

- Toute règle de jeu ; de nouveaux dessins.

## Critères d'acceptation

- Le tableau des mesures avant/après est dans `docs/perf.md` ; les bornes sont tenues, ou chaque
  écart restant est expliqué avec ce qu'il faudrait pour le lever.

## Vérifications et livraison

Celles du README du chantier. Joindre le tableau des mesures et les parcours filmés.
