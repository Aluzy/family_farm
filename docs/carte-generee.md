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
  - Leurs images (`assets/blocs.png`, générées par `scripts/carte/blocs.py`) sont vues de haut
    à 45°, comme la carte : le dessus raccourci, puis la face avant. Elles reprennent la pierre
    et le bois des bâtiments.
  - Un mur prend l'image qui le raccorde à ses voisins : 16 variantes, choisies par la scène
    (`wallFrame`). Le long d'un côté de la pièce, le dessus des murs forme une bande continue,
    et seul le dernier mur montre sa face.
  - Une porte percée dans un mur vertical montre son seuil, vu de haut, et son battant
    ouvert.
- **Le plancher** (2 planches à l'Atelier) se pose à plat sur l'herbe, dans une pièce ou
  dehors en terrasse.
  - Il ne prend pas la place d'un bloc : les meubles, le four ou la paillasse se posent
    dessus (`state.sols`, `solAt`).
  - On n'y pose ni mur, ni porte, ni l'Atelier, et on ne peut pas y labourer.
  - Un appui avec le plancher en main le reprend, une fois ce qui est posé dessus repris.
  - Comme les murs, il se raccorde à ses voisins (`syncFloors`).
- **Le chemin** (1 pierre à l'Atelier : 2 chemins) est un sol comme le plancher (`state.sols`),
  dehors seulement : on ne laboure pas dessus, rien n'y pousse.
  - Il se dessine avec les tuiles du chemin de la carte (`herbe_chemin`), raccordées à
    l'herbe par les mêmes règles que le générateur : un coin de case touché par un chemin
    posé devient du chemin, la teinte de l'herbe autour est gardée, l'eau reste de l'eau
    (`tuileChemin`, `tuilesChemins` dans `js/engine/ferme-generee.js`, qui garde les coins et
    les teintes de la carte : `terrain.SOMMETS`, `terrain.TEINTES`).
  - La scène remplace ces tuiles du sol et efface les fleurs des cases de chemin
    (`syncPaths`, `drawLayer`) ; seules les cases qui changent sont repeintes.
- **La barrière** (1 planche à l'Atelier : 2 barrières) arrête le passage et se raccorde à
  ses voisines, comme les murs (`BLOCS_CARTE.barrieres` + masque, `wallFrame`). Elle ne
  ferme pas de pièce : un enclos de barrières n'est ni une maison ni un bâtiment.
- **La lanterne scintillante** (à l'Atelier : 1 champignon lumineux et 1 morceau d'arbre de
  l'infra-monde) éclaire la nuit.
  - **Ses matières se cueillent à la main** (champ `cueillette` de `data/items.json`, `FermeHote.ramasser`) :
    - les champignons qui luisent au sol de la grotte (`tapChampignon`, `js/ville-carte.js`) :
      un champignon cueilli s'éteint et ne repousse que le lendemain ;
    - les morceaux des arbres tordus de l'infra-monde, la hache en main (`tapTree`, `stepTree`,
      `fellTree`, `stepPieces` dans `js/infra-monde.js`) :
      - au troisième coup de hache (un coup par appui), l'arbre tombe ;
      - il lâche deux morceaux là où sa cime touche le sol ;
      - on les ramasse en marchant dessus ;
      - l'arbre repousse le lendemain, et les morceaux laissés au sol y restent jusque-là.
  - **Où la poser** : dehors, dans la maison ou dans une enceinte vide, mais pas dans un
    bâtiment (comme la batterie). Elle arrête le passage.
  - **Le jour**, elle est éteinte.
  - **Quand la nuit tombe**, ses deux images alternent au hasard pour la faire scintiller.
    Elle pose aussi sa lumière dans le voile de l'heure : une flaque cyan sur l'herbe et sa vitre,
    qui vacillent un peu, plus un petit halo (`stepLanterns`, `BLOCS_CARTE.lanterne`).
- **Une pièce close** : des cases entourées de murs, de portes ou de l'Atelier, avec au moins une
  porte. Elle fait au plus 120 cases et ne touche pas le bord de la carte. Les coins ne comptent
  pas : on ne passe pas en diagonale.
- **Une maison ou un bâtiment, pas les deux** (`genreBloc`, `genrePiece`, `js/engine/blocs.js`) :
  le premier lit ou bloc clé posé dans une enceinte décide de ce qu'elle est.
  - **La maison** : la paillasse, le four, la cuisinière (et la batterie, sans genre). On n'y
    pose aucun bloc clé de bâtiment.
  - **Un bâtiment** : le nichoir (le Poulailler), la mangeoire (l'Étable), le bac à semis (la
    Serre), le coffre à grain (le Silo), la meule (le Moulin). Il ne prend que son bloc clé, et
    un plancher au sol ; il se bâtit dans une enceinte vide.
  - Un mur ou une porte entre deux enceintes de genres différents ne se reprend pas : les deux
    n'en feraient plus qu'une.
  - Une partie d'avant cette règle (migration v38, `rangerPieces`) : dans une enceinte qui mêle
    deux genres, le premier trouvé (dans l'ordre des cases) reste ; les autres blocs retournent
    dans l'inventaire.
- **Construire** se fait sur la carte (`js/ui/chantier.js`, `js/carte/ferme/chantier.js`) :
  - une case 🔨 apparaît dans la barre d'outils dès que l'Atelier est construit ;
  - une puce montre chaque bloc et ce qui en reste en main, ainsi que le nombre de paillasses
    où l'on peut dormir ; trop de blocs pour une ligne, elle passe à la ligne (aucun caché) ;
  - à l'ouverture, un rappel bref (2 s) : « touche une case pour poser, un bloc pour le reprendre » ;
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

## La carte de transition, tirée pour chaque partie

La carte entre la ferme et la ville (`ville-carte.html?carte=transition`, 96 × 72 tuiles) a deux
parties.

- **L'est est fixe**, dessiné par `scripts/ville/transition.py` à partir de la colonne `OUEST`
  (48) : le bout du chemin, la route, les trottoirs, les réverbères, l'arrêt de bus.
- **L'ouest est tiré d'après la graine de la partie** (`js/engine/transition.js`,
  `transitionPlan`). La graine est celle de la ferme générée, sinon celle des voisins
  (`state.graineVoisins`, tirée à la création de la partie, ou à la première visite d'une
  ancienne partie). L'ouest contient :
  - le chemin de terre de la ferme à la route, qui ondule doucement ;
  - 3 à 5 maisons de voisins, réparties sur toute la largeur (une par bande de colonnes), tour à
    tour au nord et au sud du chemin et plus ou moins loin de lui (`ECARTS`). La porte est face
    au chemin (en bas au nord, en haut au sud), une allée l'y relie. Elles sont bâties
    avec les blocs de la ferme générée (`assets/blocs.png`) : murs raccordés, porte, plancher,
    meubles (four, cuisinière, paillasses, coffre à grain, atelier…) ;
  - la mare et son banc, le puits et le tonneau près des maisons, des barrières le long du
    chemin, des buissons ;
  - les arbres et les rochers, que l'on coupe et que l'on casse comme avant, l'herbe haute et
    les fleurs.
- **Le kit de dessin** : la carte de Tiled n'a que de l'herbe à l'ouest, et porte dans sa
  propriété `kit` de quoi y dessiner :
  - les tuiles d'herbe et de chemin pour chaque jeu de coins ;
  - les fleurs ;
  - des tampons (des blocs de tuiles, une grille par couche) : la mare, le puits, le tonneau, le
    banc, les buissons, et les barrières de 2 à 8 tuiles.

  `js/carte/ville/transition.js` (`V.transitionCarte`) en fait la carte de la partie avant que
  la scène ne la crée : le sol, les tampons, les arbres, les rochers, l'herbe, et le trajet des
  enfants vers le bus.
- **Les maisons sont ouvertes** : sans toit ni carte d'intérieur, on voit dedans et on y entre à
  pied par la porte. Les murs et les meubles arrêtent la marche, le plancher et la porte non
  (`poseMaison`).
- **Les familles** : chaque maison a sa famille (`V.voisins`), qu'on voit aller et venir chez
  elle. De 7 h à 19 h, ses membres sortent par la porte.
  - Les parents vont chercher la ressource libre la plus proche, la ramassent, et en rapportent
    trois à la fois à la maison avant de ressortir.
  - Les ressources sont des petites pierres, des morceaux de bois et des herbes : 36 par jour
    (`ressourcesDuJour`).
  - Les enfants, et les parents quand il n'y a plus rien, flânent autour de la maison.
  - Rentrés, ils restent visibles et circulent dans la maison avant de ressortir.
  - La nuit, tout le monde reste chez soi.
  - Un toucher sur un voisin : il dit ce que sa famille a ramassé aujourd'hui.
  - Ce qui a été ramassé le reste jusqu'au lendemain (`localStorage`).
- **Le joueur ramasse aussi** (`ramasserTransition`, `js/engine/transition.js`) : un toucher sur
  une ressource y envoie le personnage, qui la prend en arrivant. Comme sur la ferme générée :
  une petite pierre donne une pierre, un morceau de bois du bois, une herbe une fibre, contre
  l'énergie et l'XP du geste « ramasser » ; pas la nuit, ni épuisé. Les voisins laissent la
  ressource qu'il vise. Ce qu'il a pris est gardé dans la partie (`state.transitionPris`,
  `{ jour, ids }`) et ne revient pas avant le lendemain.

## Étapes

1. ✅ Le terrain ne dépend plus de la carte. Le moteur passe par `farmTerrain(state)`
   (`js/engine/terrain.js`). La scène lit la taille de la carte et la sortie
   `vers_la_transition`.
2. ✅ Le générateur à partir de la graine (`js/engine/ferme-generee.js`), à essayer dans le
   mode test (« Essayer la ferme générée », une graine au choix ou au hasard ; « Revenir à la
   ferme dessinée »). Voir « La ferme générée » plus haut.
   Pour aller vite, la section « Ressources » du mode test (Options, puis « 🧪 Test » dans le
   menu latéral) donne en un appui : 20 bois, pierres, fibres et planches ; 10 de chaque minerai et
   lingot ; 5 de chaque bloc ; tous les outils ; l'Atelier construit ; ou n'importe quel objet,
   en la quantité choisie.
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
       - la fenêtre du four a deux onglets :
         - **Aliments** : les pains et les tartes ;
         - **Objets** : la fonte des lingots (les recettes `transformation`).
       - Pendant qu'une préparation cuit, les flammes du four bougent (`BLOCS_CARTE.feu`,
         `stepFires`) ;
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
       - Le **nichoir** (4 planches, 3 fibres) se fabrique à l'Atelier et se pose dans une pièce
         close. On n'achète plus le Poulailler sur la ferme générée (`buildPoulailler` refuse).
       - **Le Poulailler est là quand tout y est** (`etatPoulailler`, `majPoulailler` après chaque
         bloc posé ou repris, `js/engine/blocs.js`) :
         - une enceinte de murs (une pièce close) avec le nichoir ;
         - une porte de l'enceinte qui donne sur l'extérieur ;
         - un enclos : une étendue close de barrières (elle peut s'appuyer sur les murs de
           l'enceinte), reliée à l'enceinte par une autre porte ;
         - une case libre par poule, dans l'enceinte (hors nichoir) et dans l'enclos (un plancher
           laisse la case libre ; un bloc ou un arbre la prend).
       - Il manque quelque chose : le Poulailler n'est plus là (pas d'achat de poules, pas de
         ponte), mais il garde son niveau et ses poules. Sa fenêtre liste ce qui manque.
       - **Capacité** (`coopCapacity`) : le plus petit de la capacité du niveau
         (`POULAILLER.CAPACITE`) et des cases libres de l'enceinte et de l'enclos. Les poules en
         trop (des cases reprises) restent mais ne pondent pas (`layEggs`).
       - **Monter de niveau** : le prix, comme avant, et la place des poules du niveau suivant
         dans l'enceinte et dans l'enclos (`coopUpgradeRefus`).
       - Une partie d'avant (migration v39) : le Poulailler est revu d'après ces règles.
       - Un appui sur le nichoir ouvre la fenêtre du Poulailler ; un double appui y envoie le
         personnage prendre les œufs, devant le nichoir. La bulle des œufs se pose au-dessus
         (`keyBlockOf`).
       - **Les poules sur la carte** (`syncBeasts`, `stepBeasts`, `js/carte/ferme/chantier.js`) : une
         image par poule qui a sa place. De 6 h à 19 h, elles vont et viennent dans l'enclos,
         picorent et grattent ; la nuit, elles couvent dans le poulailler, où elles veulent (à
         plusieurs sur une case s'il le faut).
     - ✅ **5b-4, l'étable** : l'Étable (la grange) quitte la cour.
       - La **mangeoire** (6 planches, 4 pierres, 2 fibres) se fabrique à l'Atelier et se pose
         dans une pièce close. On ne prépare plus l'Étable en pièces sur la ferme générée
         (`buildPaturage` refuse).
       - **Les mêmes conditions que le Poulailler** (`etatEtable`, `etatEnclos`) : l'enceinte avec
         la mangeoire, une porte sur le dehors, un enclos de barrières relié par une autre porte,
         et une case libre par place dans l'enceinte (hors mangeoire) et dans l'enclos. Il manque
         quelque chose : plus d'Étable (places achetées et bêtes gardées) ; sa fenêtre liste ce
         qui manque.
       - **Places** (`stablePlaces`) : celles achetées (10 au départ, `PATURAGE.PLACES_DEPART`),
         bornées par les cases libres. Un mouton prend une place, une vache trois. Les bêtes en
         trop (les moutons d'abord, puis les vaches, `stableHoused`) restent mais ne mangent ni
         ne donnent rien (`feedLivestock`).
       - **Acheter une place** : le prix, comme avant, et une case libre de plus dans l'enceinte
         et dans l'enclos (`pastureRefus`). Migration v40.
       - Un appui sur la mangeoire ouvre la fenêtre de l'Étable ; un double appui y envoie le
         personnage prendre le lait et la laine (il tond les moutons prêts), devant la mangeoire.
       - **Les moutons et les vaches sur la carte**, comme les poules (`syncBeasts`, `stepBeasts`) :
         de 6 h à 19 h, ils broutent dans l'enclos ; la nuit, ils dorment couchés dans l'étable.
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
