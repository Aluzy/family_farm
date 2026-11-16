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

## Revu par I9a (les mesures)

- **La copie élaguée perd les liens du village** : `elaguer` (`worker/src/monde.mjs`) retire `voisins`, qui porte
  aujourd'hui les événements entre villageois (les visites du soir, les repas apportés : 5,7 Ko sur l'île avancée du
  joueur automatique ; `liens.js`). Un monde de l'île doit le garder (avec I9f, qui refait l'élagage).
- **Le poids** : ≈ 2,7 Ko par villageois (dont 1,2 Ko de journal de 7 jours) ; quinze villageois tiennent dans le
  plafond (256 Ko).
- **La nuit d'une île à six villageois** coûte 149 ms au serveur la première fois, puis 16 à 34 ms : à mesurer avec
  quinze, et par pas (point 1).

## Revu par I9a2 (l'horloge commune)

- **Les tâches des villageois sont l'essentiel du coût d'un pas** : un pas de jour coûte en moyenne ≈ 6 ms sur l'île
  avancée (sept villageois ; `node scripts/cout-horloge.mjs`, la fin de sa sortie), presque tout dans `farmStep`
  (`avancerTaches`). À mesurer à quinze ; s'il le faut, étaler les villageois sur les pas (le même résultat pour tous).
- **Les arrivées sont dans le pas** (`pasDuMonde` : `arriverVillageois`, `arriverEnfant`, l'accueil à la fin de
  l'heure d'arrivée, `assurerArrivee`) ; **les maisons** (`verifierMaisons`) une fois toutes les six pas (une heure de
  jeu), au pas rond : elles coûtaient 5 ms à chaque pas. En ligne, le veilleur de la page (`js/ui/villageois.js`) ne les
  fait plus ; le geste « accueilli » de la carte écrit encore dans la partie locale (une prédiction, que la partie
  refaite efface) : à passer en commande ici.
- **Leur position se calcule de l'heure interpolée** : la scène lit `heureDuJour` (`js/ui/stage.js`), qui ajoute la
  part du pas écoulée (`fractionDuPas`, `js/ui/en-ligne.js`) ; `villageoisHorloge` (`js/ui/villageois.js`) lit encore
  `clockHours` : à brancher sur la même heure.
- **Sans joueur, le village dort** : rien ne tourne, et au retour il reprend où il s'était arrêté.
- **Les avis des villageois** (`direAvis`) ne se redisent plus après une partie refaite ; ceux de l'étal et des
  commerces, si (à faire ici).

## Revu par I9b (les changements de l'île)

- **Ce qui est pris dehors est commun** (`state.monde.pris`, dans la partie du monde) et revient au jour dit dans les
  pas (`repousseMonde` dans la nuit d'une île) : un villageois qui coupe ou ramasse dehors (les tâches, I3c) le fait
  dans le pas, sur ces mêmes écarts : rien à diffuser de plus, mais un conflit possible avec un joueur (le même
  arbre) se tranche par l'ordre du pas et du geste (le premier joué l'a) ; le refus doit rester propre (pas d'objet
  en double, la tâche passe à la pièce suivante).
- **Les régions vues du monde** (`state.monde.vues`) grandissent avec les gestes des joueurs (un arbre coupé y rend sa
  région vue) : c'est là que les pièces repoussent et que les tâches des villageois regardent (`casesDuTerrain`).
- **Le prix d'un pas** compte double chez chaque joueur (sa partie et la confirmée) : un geste dehors n'y ajoute
  presque rien (0,3 à 0,5 ms au serveur).

## Revu par I9c (le port et la caisse)

- **Le lieu du port est dans la partie d'un monde de l'île** (`state.port.lieu`, posé à la mise en ligne :
  `poserLieuDuPort`) ; `lieuPort` le lit d'abord. Le pas du monde le lit donc aussi, chez le serveur et chez chacun : la
  tournée d'un villageois vers le port (`villageois-journee.js`, `taches.js`), éteinte en ligne jusqu'ici faute de lieu,
  peut s'y jouer, la même partout. À vérifier avec la journée du village dans les pas.
- **La caisse est commune** : ce que la navette (`villageois.vendre`) ou la tournée vend va à la même caisse que les
  ventes des joueurs ; `bilanCommerce` (`worker/src/monde.mjs`) ne couvre que les gestes des joueurs (les ventes d'un
  villageois se jouent dans le pas, sans événement).
- **`avecActeur` (`js/engine/temps-monde.js`) pose trois choses à chacun** le temps d'une commande : son énergie, son
  sac, sa charge (`state.charges`). Un compte qui n'a encore rien dépensé n'est plus noté par un geste refusé (le monde
  gagnait l'énergie pleine du compte dans sa partie, pas les joueurs : une divergence). L'amitié par joueur, si elle
  passe par le même chemin, y trouvera sa place. (Fait à l'intégration : `avecActeur` pose aussi l'amitié de chacun,
  `state.amities`.)
- **Le format** : I9c passe à 106 (`charges`) ; à renuméroter à l'intégration si I9d ajoute aussi des données. (Fait :
  l'amitié de chacun est la migration 106 → 107.)

## Hors périmètre

- Attribuer des tâches et décider d'un commerce à plusieurs (I9e).

## Critères d'acceptation

- Deux onglets : les deux joueurs voient le même villageois au même poste ; le bois qu'il coupe
  arrive au coffre commun dans la matinée ; le tableau est le même des deux côtés ; chacun a sa
  propre amitié.
- Le temps d'un pas avec 15 villageois, mesuré, sous la limite.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation. Joindre les mesures.
