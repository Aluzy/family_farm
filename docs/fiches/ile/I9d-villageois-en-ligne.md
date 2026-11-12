# Fiche I9d — Les villageois en ligne

## Objectif

Faire vivre le village dans un monde partagé, au rythme de l'horloge commune : les villageois se
lèvent, travaillent, mangent, se lient et tiennent leurs commerces dans la journée, sous les yeux de
tous les joueurs, qui les voient aux mêmes endroits faire les mêmes choses.

## Contexte

- I9a2 (l'horloge commune : le serveur avance le monde par pas, diffusés et rejoués), I9b (les
  écarts du monde par région).
- Le moteur des villageois : `villageois.js` (I3a), `taches.js` (I3c), `artisans.js` (I5a),
  `liens.js` (I6b), les traits (I6c), `vocations.js` (I8a). Tous déterministes, à graine.
- La position déduite de l'heure (I3b, point 4) : pensée pour cette fiche.
- Aujourd'hui, la nuit d'un monde partagé ne fait que la ferme et n'a « ni hameaux à faire vivre »
  (`docs/monde-partage.md`) ; `voisinsNuit` ne tourne pas dans un monde partagé (`voisins.js`).
- Le serveur : `worker/src/monde.mjs`, les limites de temps de calcul d'un Durable Object.

## À faire

1. **La journée du village dans les pas du serveur** : chaque pas de temps (I9a2) joue ce que les
   villageois font à cette heure-là (une action de tâche, un lot d'artisan, un repas), par les mêmes
   fonctions qu'en solo. Ce qu'ils produisent arrive au coffre commun au fil de la journée. Les
   repas du soir, les liens et les arrivées se jouent à leur heure. Mesurer le temps d'un pas avec
   5, 10 et 15 villageois ; s'il pèse trop, étaler les villageois sur plusieurs pas sans changer le
   résultat.
2. **Ce que chacun voit** : chaque client place les villageois d'après l'heure commune et leur
   horaire (mêmes postes, mêmes trajets, à la graine) ; aucune position n'est envoyée. Le geste
   affiché et l'action jouée par le serveur tombent à la même heure. La règle du solo, « ce qui se
   passe sous les yeux compte une fois », devient en ligne « le serveur seul fait compter » :
   l'écrire dans `docs/monde-partage.md`.
3. **Parler et offrir** : l'amitié est **par joueur** (chacun a la sienne avec chaque villageois) ;
   les liens entre villageois sont du monde. Les commandes `villageois.parler`, `villageois.offrir`.
4. **Le tableau** (I3d) est celui du monde, le même pour tous.
5. **Sans joueur connecté**, le village dort avec le monde (I9a2) : aucune production pendant
   l'absence. Le dire dans la fenêtre de retour.
6. **Les invités de passage** : un visiteur voit le village vivre et peut parler ; il ne change rien.
7. **Les tests** : une journée du village donne le même état sur le serveur et chez deux clients ;
   deux clients calculent la même position pour chaque villageois à dix heures tirées au hasard ;
   l'amitié par joueur ; le temps d'un pas sous la limite.

## Hors périmètre

- Attribuer des tâches et décider d'un commerce à plusieurs (I9e).

## Critères d'acceptation

- Deux onglets : les deux joueurs voient le même villageois au même poste ; le bois qu'il coupe
  arrive au coffre commun dans la matinée ; le tableau est le même des deux côtés ; chacun a sa
  propre amitié.
- Le temps d'un pas avec 15 villageois, mesuré, sous la limite.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation. Joindre les mesures.
