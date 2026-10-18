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
  - les **baies** : chaque matin, 16 buissons de la carte en portent (`RAMASSAGE.baies.buissons`,
    `terrain.BUISSONS`), des grappes rouges de 4 × 4 pixels posées dessus. Un appui : le
    personnage en cueille 3, **sans énergie** (`gratuit`) : même épuisé et sans réserves, il
    trouve de quoi manger et ne reste pas bloqué ;
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
   - 5b : retirer les bâtiments provisoires de la cour, un bâtiment par PR. Chacun ne quitte
     la cour que quand son remplaçant existe, pour que le jeu reste jouable :
     - **les bâtiments spéciaux** : une pièce close et un **bloc clé** fabriqué à l'Atelier et
       posé dedans, qui lui donne sa fonction (nichoir → poulailler, mangeoire → étable, murs de
       vitres → serre, etc.) ;
     - **la maison** : ses fonctions passent dans des blocs. Une cuisinière posée dans une pièce
       close ouvre la cuisine et les recettes ; le panneau solaire et la pompe deviennent des
       blocs à poser dehors (la pompe sur un puits) ;
     - **l'ordre** : la maison (cuisine, installations), puis le poulailler, l'étable, la serre,
       le silo, le moulin et le verger.
     - ✅ **5b-1, la maison** :
       - la cour n'a plus de maison : sa place reste dégagée et le chemin part de devant elle ;
       - le **foyer** est une pièce close avec une paillasse. `houseRepaired` le reconnaît, ce
         qui ouvre les installations et l'objectif du chapitre 1 ; il n'y a rien à réparer ;
       - le personnage, la famille et le robot rentrent et sortent par sa porte (`homeDoor`).
         Avant qu'il existe, c'est la place de l'ancienne maison ;
       - le **four de pierre** (8 pierres, 2 planches) et la **cuisinière** (6 pierres,
         4 planches) se fabriquent à l'Atelier. Posés dans une pièce close, ils tiennent lieu
         des stations du même nom (`DATA.ATELIER.BLOCS[…].station`) ; repris, la station n'est
         plus là. Un appui dessus ouvre leur fenêtre ;
       - pas d'intérieur de maison (les repas n'ont pas de scène), pas de meubles, et le
         tutoriel n'arrête pas l'horloge : le foyer se bâtit en plusieurs jours.
     - ✅ **5b-2, l'énergie et l'eau** : le puits et la citerne quittent la cour.
       - Le puits, la pompe, le panneau solaire, la citerne et la batterie se fabriquent à
         l'Atelier (il faut des lingots : le minerai de la grotte, fondu au four) :

         | Bloc | Coût |
         |---|---|
         | puits | 8 pierres, 2 planches |
         | pompe | 2 lingots de fer, 1 planche |
         | panneau solaire | 2 lingots de fer, 1 de cuivre, 2 planches |
         | citerne | 6 planches, 1 lingot de fer |
         | batterie | 2 lingots de cuivre, 1 de fer |

       - Posé, chacun installe l'appareil de départ du même nom au lieu de l'acheter ; repris,
         l'appareil n'est plus là (`ATELIER.BLOCS[…].appareil`, `installStarter`,
         `removeStarter`).
       - Le puits, le panneau et la citerne se posent dehors, la pompe sur le puits
         (`state.blocsDessus`). Il y en a un de chaque, et il faut d'abord le foyer. La citerne
         attend le panneau et la pompe.
       - Le puits et la citerne gardent leurs images (la pompe qui vibre, le niveau de l'eau),
         posées sur leurs blocs. Un appui ouvre l'énergie ou l'eau.
     - ✅ **5b-3, le poulailler** : le Poulailler quitte la cour.
       - Le **nichoir** (4 planches, 3 fibres) se fabrique à l'Atelier. Posé dans une pièce
         close, il construit le Poulailler au niveau 1 (`ATELIER.BLOCS.nichoir.batiment`) ; repris,
         le Poulailler n'est plus construit et retrouve son niveau quand on le repose. On ne
         l'achète plus sur la ferme générée (`buildPoulailler` refuse).
       - Un appui sur le nichoir ouvre la fenêtre du Poulailler ; un double appui y envoie le
         personnage prendre les œufs, devant le nichoir. La bulle des œufs se pose au-dessus
         (`keyBlockOf`).
       - Les poules ne se montrent pas encore sur la carte : la vie de la cour les dessine
         autour du bâtiment du Poulailler, que la ferme générée n'a pas.
     - ✅ **5b-4, l'étable** : l'Étable (la grange) quitte la cour.
       - La **mangeoire** (6 planches, 4 pierres, 2 fibres) se fabrique à l'Atelier. Posée dans
         une pièce close, elle ouvre l'Étable avec ses 10 places de départ (`PATURAGE.PLACES_DEPART`) ;
         reprise, l'Étable n'est plus construite et retrouve ses places achetées quand on la
         repose. On ne la prépare plus en pièces sur la ferme générée (`buildPaturage` refuse).
       - Un appui sur la mangeoire ouvre la fenêtre de l'Étable ; un double appui y envoie le
         personnage prendre le lait et la laine (il tond les moutons prêts), devant la mangeoire.
       - Comme les poules, les moutons et les vaches ne se montrent pas encore sur la carte.
     - ✅ **5b-5, la serre** : la Serre quitte la cour.
       - Le **bac à semis** (8 planches, 4 pierres, 4 fibres) se fabrique à l'Atelier. Posé dans
         une pièce close, il ouvre la Serre au niveau 1 avec ses parcelles (`openSerre`) ;
         repris, la Serre n'est plus construite, et ce qui y pousse attend qu'il revienne. On
         ne la répare plus en pièces sur la ferme générée (`buildSerre` refuse).
       - Pas d'intérieur : un appui sur le bac ouvre la fenêtre de la Serre, où ses parcelles
         se travaillent.
       - Comme partout, un bloc clé ne se pose qu'à partir du niveau où son bâtiment se débloque
         (`isUnlocked` : la Serre au niveau 7).
     - ✅ **5b-6, le silo** : le Silo quitte la cour.
       - Le **coffre à grain** (6 planches, 2 fibres) se fabrique à l'Atelier. Posé dans une pièce
         close, il construit le Silo au niveau 1 et y range le blé de l'inventaire (`fillSilo`) ;
         repris, le Silo n'est plus construit (son blé reste compté). On ne le répare plus sur
         la ferme générée (`buildSilo` refuse).
       - Un appui sur le coffre ouvre la fenêtre du Silo.
     - ✅ **5b-7, le moulin** : le Moulin quitte la cour.
       - La **meule** (10 pierres, 4 planches) se fabrique à l'Atelier. Posée dans une pièce
         close, elle tient lieu de la station du Moulin (`station: 'moulin'`, comme le four et la
         cuisinière) ; reprise, le Moulin n'est plus là. `buildStation` refuse sur la ferme
         générée. Il moud comme avant, à l'électricité.
       - Elle ne se pose qu'à partir du niveau du Moulin (`debloque: 'moulin'`, niveau 4).
       - Un appui sur la meule ouvre la fenêtre du Moulin. La vue de la carte, qui allait au
         moulin et à la serre, va à la deuxième zone de culture.
     - ✅ **5b-8, les arbres fruitiers** : pas de Verger sur la ferme générée.
       - Le **jeune pommier** et le **jeune poirier** (40 pièces) s'achètent au Marché, rayon
         Graines, sur la ferme générée seulement, une fois le Verger débloqué (niveau 6).
       - Avec la case 🔨, ils se **plantent dans le sol**, sur l'herbe, dehors, à au moins
         3 cases d'un autre arbre (`ATELIER.BLOCS.pommier.arbre`, `ARBRE_ECART`). Ils ne sont pas
         des blocs : chacun devient un arbre du Verger dont la case est sa case de la carte
         (`planterArbre`, `arbreSurCase`). Il pousse et donne ses fruits comme avant (maturité,
         stades, récolte tous les 3 jours, automatisation « Récolte du verger »).
       - Sur la carte, l'arbre est dessiné sur sa case (`treeRect`), ferme son tronc au passage,
         empêche d'y labourer ou d'y poser un bloc. Un appui sur un arbre en fruits le cueille.
       - La fenêtre du Verger liste les arbres plantés. On n'aménage plus de Verger et on n'achète
         plus d'emplacements (`buildVerger`, `buyOrchardSlot`, `plantTree` refusent) ; la cour
         n'a plus ses douze emplacements ni le panneau.
