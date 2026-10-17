# La ferme générée (projet)

Une ferme quatre fois plus grande que la carte dessinée dans Tiled, générée d'après une graine,
sans bâtiment au départ : on ramasse, on fabrique et on construit bloc par bloc.

## Décisions

- **Taille** : 4 fois la surface de la carte actuelle, soit 144 × 114 tuiles de 16 px
  (2304 × 1824 px).
- **Graine** : la même graine donne toujours la même carte. La sauvegarde ne garde que la
  graine et ce que le joueur a changé (blocs posés, ressources prises).
- **Accès à la transition** : un chemin garanti mène au bord est. Il se termine sur le
  rectangle `vers_la_transition`, que la carte générée fournit comme celle de Tiled.
- **Parties en cours** : elles gardent la carte de Tiled. Seules les nouvelles parties ont la
  carte générée.
- **Paiement** : les bâtiments se paient en matériaux seulement. Les pièces ne servent qu'à
  acheter des matériaux au Marché.

### Ramassage à la main

Des petites pierres, des morceaux de bois et des herbes se ramassent sans outil, avec un petit
coût d'énergie :

| Ressource ramassée | Objet obtenu |
|---|---|
| petite pierre | 1 pierre |
| morceau de bois | 1 bois |
| herbe | 1 fibre |

Chaque nuit, quelques-unes repoussent à des endroits tirés d'après la graine et le jour.

### L'atelier niveau 1

L'atelier coûte 3 bois et 3 pierres. Il permet de fabriquer :

| Recette | Résultat |
|---|---|
| 2 bois | 1 planche |
| 4 pierres | 1 mur en pierre |
| 3 planches | 1 porte |
| 3 fibres | 1 paillasse |
| 2 bois + 1 pierre + 1 fibre | houe de pierre |
| 2 bois + 2 pierres + 1 fibre | hache de pierre |
| 2 bois + 3 pierres + 1 fibre | pioche de pierre |

Le Marché vend toujours les outils.

### Construction bloc par bloc

- On pose chaque mur et chaque porte sur une case de la carte.
- Un espace entièrement entouré de murs, avec au moins une porte, devient une **pièce close**.
- Les autres bâtiments suivent la même logique.
- Il n'y a **pas de toit** : on voit les murs et l'intérieur d'en haut.

### Dormir

- Une paillasse ne se pose que dans une pièce close.
- Il faut **une paillasse par personne**. Un membre de la famille sans paillasse ne dort pas et
  ne regagne pas l'énergie de la nuit.

## La ferme générée (étape 2)

- **La carte** : `genererFerme(graine)` rend une carte au format de Tiled (144 × 114 tuiles),
  dessinée avec les tuiles du décor version 2, comme `scripts/carte/carte_v2.py` dessine la carte
  de Tiled :
  - l'herbe en trois teintes, qui ondulent selon un bruit ;
  - 2 à 4 étangs avec leurs rives (le premier assez grand pour le brochet), et le tronc creux au
    bord de l'un d'eux ;
  - des bois (arbres clairs, pins, buissons), plus denses vers les bords ;
  - 64 rochers, des fleurs, des touffes d'herbe haute.
- **Le chemin** est tracé par un A* (`js/engine/chemin.js`), de la porte de la maison au bord
  est. Le rectangle `vers_la_transition` y est posé.
- **Le terrain** (`js/engine/terrain-carte.js`) est calculé d'après la carte, avec les règles de
  `scripts/carte/terres.py`. Un test vérifie qu'il redonne exactement `data/terrain.json` pour la
  carte de Tiled.
- **La cour, provisoire** : en attendant la construction bloc par bloc (étape 4), les bâtiments
  de la carte de Tiled gardent leur disposition dans une cour dégagée (`DECALAGE` : son
  emplacement, en tuiles). Le sommeil, les bêtes, le robot, les parcelles de départ et le Verger
  marchent comme avant.
- **La partie** garde sa graine dans `state.carte.graine` (sauvegardée). `farmTerrain(state)`,
  `farmMap(state)` et `farmPoint(state, p)` (un point de la carte de Tiled, décalé avec la cour)
  la lisent. La page passe la carte à la scène au montage (`ctx.carte`).
- **Performances**, sur une ferme quatre fois plus grande :
  - les ombres du soleil sont peintes dans un canevas de la taille de la vue ;
  - les arbres, rochers et touffes hors de la vue ne sont pas dessinés ;
  - l'eau animée n'est repeinte que dans la vue.

  Le calcul par image reste celui de la carte de Tiled (environ 1 ms dans Chromium). Le sol
  reste une seule image (2304 × 1824 px, sous la limite de 4096 px des téléphones) : le passer en
  calques de tuiles ne s'est pas révélé nécessaire.

## Ramasser et fabriquer (étape 3)

- **Ramasser** (`js/engine/atelier.js`, `ramassables`, `ramasser`) :
  - chaque matin, 14 petites pierres, 14 morceaux de bois et 18 herbes sont posés sur l'herbe
    labourable, à des places tirées d'après la graine et le jour (`DATA.ATELIER.RAMASSAGE`) ;
  - sur la carte, chacun a son image (`assets/ramassables.png`,
    `scripts/carte/ramassables.py`). Un appui dessus : le personnage va à côté, se baisse et le
    prend (`js/carte/ferme/cueillette.js`) ;
  - le geste « ramasser » coûte 1 d'énergie et rapporte 2 XP ;
  - `state.cueillette` garde ce qui a déjà été pris aujourd'hui.
- **L'Atelier** est une fenêtre du menu latéral, sur la ferme générée seulement
  (`js/ui/atelier.js`) :
  - il se construit avec 3 bois et 3 pierres (`state.atelier`) ;
  - ses recettes (`DATA.ATELIER.RECETTES`) sont fabriquées tout de suite : c'est le geste
    « fabriquer », qui coûte 2 d'énergie et rapporte 10 XP ;
  - les outils de pierre sont les mêmes que ceux du Marché, qui les vend toujours.
- **Les nouveaux objets** (« matériau ») : fibre 🪢, planche 🪚, mur en pierre 🧱, porte 🚪,
  paillasse 🛏 ; leurs icônes sont dans `scripts/icones/art_atelier.py`.
- **Sur la carte, pour l'instant**, l'Atelier n'est qu'une fenêtre. La pose bloc par bloc
  (étape 4) lui donnera sa place.

## Construire et dormir (étape 4)

- **Les blocs** (`js/engine/blocs.js`, `DATA.ATELIER.BLOCS`) : mur en pierre, porte, paillasse
  et l'Atelier une fois construit. Ils se posent sur l'herbe, pas sur une terre labourée.
  - Un bloc posé quitte l'inventaire ; repris, il y revient (`state.blocs` : case → sorte).
  - Les murs et l'Atelier arrêtent le personnage ; on traverse les portes et les paillasses.
  - Ils portent une ombre, comme le reste du décor.
- **Une pièce close** : des cases entourées de murs, de portes ou de l'Atelier, avec au moins une
  porte. Elle fait au plus 120 cases et ne touche pas le bord de la carte. Les coins ne comptent
  pas : on ne passe pas en diagonale.
- **Construire** se fait sur la carte (`js/ui/chantier.js`, `js/carte/ferme/chantier.js`) :
  - une case 🔨 apparaît dans la barre d'outils dès que l'Atelier est construit ;
  - une puce montre chaque bloc et ce qui en reste en main, ainsi que le nombre de paillasses
    où l'on peut dormir ;
  - un appui sur une case y pose le bloc choisi, un appui sur un bloc le reprend ;
  - les pièces closes sont teintées de vert.
- **Dormir** :
  - « Dormir » envoie le personnage à la première paillasse d'une pièce close. Il s'y couche
    sous sa couverture (`assets/blocs.png`, `scripts/carte/blocs.py`) et la nuit défile.
  - Sans paillasse dans une pièce close, un message le dit : la famille ne dort pas, la nuit
    passe sans rendre d'énergie (`nuitCouchee`).
  - Pour l'instant, l'énergie est celle du personnage principal : la première paillasse lui
    revient.
- **La maison de la cour** est encore là, provisoirement. On n'y dort plus sur la ferme générée.

## Étapes

1. ✅ Le terrain ne dépend plus de la carte. Le moteur passe par `farmTerrain(state)`
   (`js/engine/terrain.js`). La scène lit la taille de la carte et la sortie
   `vers_la_transition`.
2. ✅ Le générateur à partir de la graine (`js/engine/ferme-generee.js`), à essayer dans le
   mode test (« Essayer la ferme générée », une graine au choix ou au hasard ; « Revenir à la
   ferme dessinée »). Voir « La ferme générée » plus haut.
3. ✅ Les ressources à ramasser, l'atelier, les objets et les recettes de matériaux. Voir
   « Ramasser et fabriquer (étape 3) » plus haut.
4. ✅ La pose bloc par bloc, la détection des pièces closes, les paillasses et le sommeil. Voir
   « Construire et dormir (étape 4) » plus haut.
5. La nouvelle partie sur la carte générée, l'ajustement de la progression, et les tests.
   - ✅ 5a :
     - l'écran de départ propose « Une terre sauvage, quatre fois plus grande », avec une graine
       au choix ou tirée au hasard (`setFarmSeed`) ;
     - chaque nuit, chaque membre sans paillasse dans une pièce close perd 8 de bonheur
       (`ATELIER.BONHEUR_SANS_COUCHAGE`, `nuitSansCouchage`) ; un message le dit au réveil.
   - 5b : retirer les bâtiments provisoires de la cour. Leurs fonctions doivent passer à des
     constructions bloc par bloc.
