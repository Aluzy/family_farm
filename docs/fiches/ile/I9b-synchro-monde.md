# Fiche I9b — Les changements du monde, synchronisés par région

## Objectif

Faire que ce qu'un joueur change sur l'île hors de la ferme (un arbre coupé, un rocher cassé, une
cueillette, un chemin posé) soit vu par les autres, en n'envoyant que le strict nécessaire.

## Contexte

- I9a (la frontière, le plafond de poids), I9a2 (l'horloge commune : les repousses suivent le jour
  commun).
- Le monde et ses changements : `js/engine/monde-recolte.js` (ce qui est pris et quand ça repousse),
  `monde-vegetation.js`, `monde-roches.js`, `monde-lieux.js` (grottes, coins de pêche, les quotas du
  jour), `outils.js`, `js/engine/blocs.js` (les blocs hors de la ferme : I2).
- Les régions : `js/monde-worker.js`, `js/carte/ferme/sol.js`, la fiche 25 (la cadence de la carte).
- Le brouillard : `js/engine/monde-vu.js`, `decouverte.js` (personnel : il ne se synchronise pas).
- La synchronisation : `js/ui/synchro.js`, `worker/src/monde.mjs` (les commandes numérotées, le
  journal, la diffusion), `js/engine/commandes.js`.

## À faire

1. **Le principe** : l'île se recrée chez chacun de la graine ; on ne transmet que les **écarts** :
   ce qui a été pris (avec son jour, pour que la repousse se **calcule** partout pareil), ce qui a
   été posé ou retiré. Aucun envoi pour ce qui se déduit du jour et de la graine.
2. **Les commandes du monde** dans `commandes.js` : couper, casser, cueillir, ramasser, pêcher,
   poser et retirer un bloc hors de la ferme : chacune rejouable par le serveur avec le moteur. Ce
   qu'un geste lâche va au coffre commun (la règle des mondes en ligne), ou au sol si l'on préfère :
   choisir et le dire.
3. **L'intérêt par région** : un joueur ne reçoit que les écarts des régions proches de lui (un
   abonnement par région, mis à jour quand il marche) ; en entrant dans une région, il reçoit ses
   écarts en un lot. Le serveur garde les écarts par région.
4. **Le brouillard** reste à chacun : un invité découvre l'île pour lui-même ; sa carte du monde est
   gardée dans son navigateur, par monde.
5. **Les conflits** : deux joueurs sur le même arbre : le serveur tranche (le premier), l'autre voit
   l'arbre tomber et son coup est annulé proprement (pas d'objet en double).
6. **Les quotas** (pêche du jour, grottes) sont communs au monde.
7. **Les mesures** : octets envoyés par minute à deux et à quatre joueurs qui récoltent ; taille des
   écarts d'une île très exploitée ; temps d'entrée dans une région chargée. Tenir le plafond d'I9a.
8. **Les tests** : chaque commande rejouée donne le même état chez l'hôte, l'invité et le serveur ;
   la repousse calculée est la même partout ; l'abonnement par région ; le conflit ; le brouillard
   non partagé (`test-synchro.mjs`, `deux-joueurs.mjs`, un test moteur du rejeu).

## Revu par I9a (les mesures)

- **Le brouillard de chacun est fait** (point 4) : gardé dans le navigateur, par monde, posé sur la partie locale
  (`js/ui/en-ligne.js`, `unirVu`). Reste à cette fiche : rien.
- **La frontière** : I9a a passé le contrôle au moteur (`js/engine/frontiere.js`, `refusFrontiere`) ; cette fiche
  l'ouvre, commande par commande, pour une île (`ilePartagee`), et retire le bandeau « rien d'autre n'est encore
  synchronisé » quand tout l'est.
- **Le poids des écarts** est petit : 1 Ko pour le joueur automatique (il ne récolte pas dehors), 39 Ko pour une île
  très exploitée (1 100 pièces prises en même temps) ; le plafond est de 64 Ko (`VILLAGE.EN_LIGNE.DEHORS_KO`).
- **Ce qui coûte, c'est le contrôle du serveur** : vérifier qu'une pièce existe dehors (un arbre, un rocher) demande le
  sol de sa région, tiré de la graine : 0,4 à 0,5 s pour le contexte au réveil du monde, puis ≈ 12 ms par région
  (88 régions sur l'île). À trancher ici : le serveur tire les régions où l'on joue (et garde les dernières), ou il
  vérifie l'identifiant sans le sol (la pièce, son jour de retour) et laisse le moteur refuser un doublon.
- **Le sac de chacun** (ses provisions de sortie : `docs/monde-partage.md` § 13) : il devient celui de chaque joueur
  ici, puisque c'est la fiche qui fait sortir pour de bon.

## Hors périmètre

- Le port (I9c), les villageois (I9d), les rôles étendus (I9e).

## Critères d'acceptation

- Deux onglets : l'un coupe un arbre dans la forêt, l'autre le voit tomber en moins d'une seconde ;
  l'arbre repousse le même jour chez les deux ; un chemin posé par l'invité paraît chez l'hôte ;
  chacun garde son brouillard.
- Les mesures tiennent le plafond.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation. Joindre les mesures.
