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
- **Parties en cours** : une ancienne partie déménage sur une ferme générée à son chargement
  (voir « Les anciennes parties ») ; une nouvelle partie a toujours la carte générée.
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
- Un meuble du Marché en main (pas un tableau) : la carte se quadrille ; un appui sur une case y
  pose son aperçu calé sur la grille (vert : il tient là, rouge : non), sans le poser ; un glissement
  du doigt parti de l'aperçu le déplace case par case (la carte ne défile pas). ✔️ le pose,
  ❌ sort de ce mode (js/ui/chantier.js `meubleModele`, js/carte/ferme/chantier.js `syncPoseMeuble`).
- Version 1.26 : une case où se trouve une ressource de la carte (herbe haute, rocher, arbre) ne
  se bâtit qu'une fois la ressource récoltée (fauchée, cassée, abattue ; terrain `HERBES`, `ROCHERS`,
  `ARBRES`). Rien ne repousse sur une case bâtie ni dans une pièce close (`casesBaties`) ; une
  partie d'avant voit l'herbe restée sous ses blocs fauchée, sans paille (migration v42 → v43).
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
    bord de l'un d'eux (`scripts/carte/tronc_creux.py` : une bûche moussue, ses lueurs au fond du
    creux ; le bloc « tronc_creux » de la planche, `TRONC_CREUX`) ;
  - des bois (arbres clairs, pins, buissons), plus denses vers les bords ;
  - la terre labourée et celle des parcelles, sèche ou arrosée (`scripts/carte/terre_bords.py`,
    puis `terre_arrosee.py`) : des sillons qui ondulent, des mottes, un caillou ;
  - 64 rochers, des fleurs, des touffes d'herbe haute (200 zones de 3 à 6 tuiles de rayon,
    jusqu'à quatre touffes par case : environ 20 000 ; leurs images ne sont créées que près de la
    vue, par morceaux de 256 px, `syncTallGrass`) : les trois herbes du modèle en quatre
    teintes (vert, vert roussi, brun léger, mauve foncé ; chaque zone a la sienne, que la
    plupart de ses touffes prennent) et, pour une touffe sur cinq, fleuries (une tige d'un
    pixel, une petite fleur au bout, posée sans la teinte du sol : `scripts/carte/herbe_haute.py`,
    `assets/herbe_haute_fleurs.png`). La faux en main (version 1.23 : `DATA.FAUX`, Marché ou
    Atelier), un appui sur une touffe la fauche (`grassAt`, `scythe` dans
    `js/carte/ferme/decor.js` ; geste `faux_cote_0..3`) : elle se couche et disparaît, sa paille
    tombe à son pied (`assets/ramassables.png`, 5ᵉ image) ; elle repousse 2 à 4 jours plus tard
    (`state.outils.herbes`, modèle `fauchees`). C'est la seule source de paille : le Moulin ne
    fait plus que de la farine. Le coup fort (version 1.24, `js/carte/ferme/coupfort.js`) : un
    appui maintenu sur le personnage qui tient un outil le fait trembler ; relâché, la hache ou
    la pioche comptent `COUP_FORT.COUPS` coups, la faux tournoie et fauche les touffes à 16 px
    autour de lui (`scytheAround`), la houe laboure les 3 × 3 tuiles autour de lui. Les rochers (`scripts/carte/rochers.py`,
    `assets/rochers.png`, le bloc « rochers » de la planche) sont dessinés dans le style des
    blocs : la pierre des bâtiments taillée en pans, un contour sombre, de la mousse sur les
    gros. Trois tailles : 2 × 2 cases, 1 × 2 (debout ou couché) et 1 × 1 (`DESSINS_ROCHERS` :
    l'emprise de chaque forme, et ses dessins).
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
  - **La fenêtre** (3 pierres, 1 planche) et **la pierre d'angle** (5 pierres) stylisent les
    bâtiments : ce sont des murs (ils ferment une pièce, arrêtent le passage, se raccordent au
    mur en pierre et entre eux, se posent aussi à l'étage). Sur leur face, la fenêtre a un cadre
    de bois, quatre carreaux et un appui de pierre ; la pierre d'angle, de grosses pierres
    claires en alternance aux bords libres (entre deux murs : aux deux bords, un pilier).
    Images : `murs_hauts.png`, 17 + masque et 33 + masque (`BLOCS_CARTE.hauts.variantes`).
    Un mur se change sans être enlevé : avec une fenêtre (ou une pierre d'angle, un mur en
    pierre) en main, un appui sur un autre de ces murs le remplace, l'ancien revient dans
    l'inventaire et la pièce reste close (`BLOCS[].mur`, `changeMur` ; au sol et à l'étage).
  - Deux fenêtres côte à côte (sur une même rangée, leurs faces visibles) forment une grande
    fenêtre : le verre, l'appui et le linteau passent de l'une à l'autre, un montant de bois
    entre elles (`BLOCS_CARTE.hauts.joints` ; images 49, 65, 81 + masque).
  - **La paroi vitrée** (2 pierres, 1 lingot de fer) est un mur de verre : elle se pose comme un
    mur (elle ferme une pièce) ou à la place d'un mur, comme une fenêtre. Le dessus est en
    métal ; la face est en verre teinté, avec des montants, une traverse tous les 13 px et des
    reflets en biais. Des parois voisines forment une façade continue (images 97 à 160). Elle
    servira plus tard à construire des immeubles en verre en ville.
  - **Les murs aux matières de la ville** reprennent les façades des immeubles de la grande ville
    (les motifs de `scripts/ville/batiments.py`) : briques rouges, orange, ocre ou bleues
    (3 pierres et 1 bois), pierre de taille (5 pierres). Le dessus est de la même matière, un
    peu plus clair ; la face a une corniche en haut et un soubassement gris en bas. Ce sont des
    murs (`mur: true`) : ils ferment une pièce, se raccordent à tous les autres murs, en changent
    un sans qu'on l'enlève et se posent à l'étage. Images de `murs_hauts.png` : 161, 177, 193,
    209, 225 + masque (`MATIERES_VILLE`, `scripts/carte/blocs.py`).
  - Les murs et la porte d'un mur horizontal sont une case plus hauts que les autres blocs
    (`assets/murs_hauts.png`, 16 × 40 px, comme les maisons de la transition). Un mur qui cache
    le personnage ou un membre de la famille s'efface à moitié, et tous s'effacent en mode
    Construire (`stepMurs`, `BLOCS_CARTE.hauts`).
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
  - un menu s'ouvre sur le côté droit de l'écran, dans le bois de la barre d'outils (même
    cadre, mêmes cases) : en haut le nombre de paillasses où l'on peut dormir et ✕, puis une
    case par bloc (son icône, ce qui en reste en main ; le bloc choisi encadré, un bloc épuisé
    pâli) sur deux colonnes qui défilent (`.build-bar`) ;
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

- **L'escalier et l'étage (un essai)** (`js/engine/etage.js`, `js/carte/ferme/etage.js`) :
  - l'escalier (🪜, 6 planches et 2 bois à l'Atelier) se pose dans une pièce close et se
    traverse ; il ouvre un étage au-dessus de cette pièce et de ses murs (l'emprise,
    `etageEmprise`) ;
  - un appui sur l'escalier y monte, un appui sur son haut (la trémie) en redescend
    (`etage-toggle`) ;
  - l'étage est dessiné au sommet des murs du bas (remonté de `ETAGE.dy`, 30 px : la hauteur de la face des murs hauts) : son plancher
    couvre toute l'emprise ; à l'étage, le personnage est dessiné remonté et n'en sort pas
    (`etageCells` : seule l'emprise, sans ses murs) ;
  - ce qu'on voit dépend d'où est le personnage (`stepEtage`) : dehors, tous les niveaux l'un
    sur l'autre ; dans le bâtiment en bas, l'étage en transparence ; à l'étage, un voile sombre
    couvre la ferme et, devant lui, les blocs du bas sous l'emprise en transparence (on voit les murs juste en dessous), et un mur de l'étage
    devant lui s'efface ;
  - en mode Construire, un petit carré au-dessus du menu montre le niveau où l'on construit
    (0 au départ : le niveau où est le personnage). Un appui long l'ouvre : la liste des
    niveaux, le plus haut en haut ; on glisse jusqu'à l'un et on lâche pour le choisir (un
    appui simple ouvre ou ferme la liste ; `build-level-menu`, `build-level`). La vue de la
    carte suit le niveau choisi, où que soit le personnage ;
  - en mode Construire, à l'étage (niveau 1), le menu ne propose que les blocs de l'étage (murs, portes,
    paillasse, lanterne, barrière : `ETAGE_BLOCS`) ; ils n'ont pas d'autre effet que d'être là
    et d'arrêter le passage (`state.etage`) ;
  - l'escalier repris, ou la pièce ouverte, l'étage s'en va : ses blocs reviennent dans
    l'inventaire (`rangerEtage`) ; au coucher, on redescend.
- **Les toits** (`toits` dans `js/engine/etage.js`, `js/carte/ferme/toits.js`) : chaque
  bâtiment (une pièce close aménagée : un bloc qui en fait une maison ou un bâtiment, un
  plancher ou un escalier) reçoit tout seul un toit de tuiles, posé sur son dernier niveau ; une
  pièce close sans rien de tout ça (une cour, un passage enfermé entre les murs de bâtiments
  voisins) reste à ciel ouvert :
  - sur ses murs, s'il n'a pas d'escalier ; sur les murs de son étage, au-dessus de ce qu'ils
    ferment, s'il en a un (un étage sans murs tout autour reste une terrasse, sans toit) ;
  - il couvre le bâtiment, murs compris : un toit à croupes vu de 3/4, dessiné comme ceux des
    immeubles de la ville (`CarteKit.toit`, `js/carte/toit.js`, couleurs dans `CarteKit.TOIT`).
    Le pan de devant est grand (les trois quarts de la profondeur), celui de derrière est vu en
    raccourci et plus clair. Les croupes forment des triangles aux deux bouts (la gauche dans la
    lumière, la droite à l'ombre). Les rangs de tuiles font 8 px, avec un faîtage de tuiles
    rondes. Le toit déborde un peu sur les côtés ; sous le pan de devant, il a un égout, une
    planche de rive et une ombre portée sur le haut de la façade ;
  - il s'efface quand le personnage entre dans le bâtiment (en bas ou à l'étage) et en mode
    Construire, et à moitié quand le personnage passe derrière (`stepToits`).

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
  - 3 à 5 maisons de voisins, réparties sur toute la largeur, tour à tour au nord et au sud du
    chemin (chaque côté partagé en bandes de colonnes, une maison par bande) et plus ou moins
    loin de lui (`ECARTS`). Chacune réserve toute son emprise (11 × 9 cases), où elle
    s'agrandira. La porte est face
    au chemin (en bas au nord, en haut au sud), une allée l'y relie. Elles sont bâties
    avec les blocs de la ferme générée (`assets/blocs.png`) : murs raccordés, porte, plancher,
    meubles (four ou cuisinière, un lit par membre de la famille, coffre à grain, atelier…).
    Leurs murs et leur porte sont une case plus hauts, comme ceux de la ferme
    (`assets/murs_hauts.png`, 16 × 40 px, `murs_hauts()` de `scripts/carte/blocs.py`) ; un mur
    qui cache quelqu'un derrière lui (le joueur, un voisin, le livreur) s'efface à moitié
    (`stepMurs`, `BLOCS.hauts`) ;
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
  - Les enfants flânent autour de la maison ; rentrés, tous restent visibles et circulent dans
    la maison avant de ressortir. Le soir, tout le monde reste chez soi.
  - **La maison grandit avec la famille** (`maisonPlan`, `js/engine/transition.js` ; les étapes :
    `VOISINS.MAISON` de `data/ville.json`). Elle n'a d'abord qu'une petite pièce ; chaque nuit, un
    foyer qui garde sa réserve (`RESERVE`) après l'achat s'offre l'étape suivante, qui lui rend
    un peu de bonheur : agrandir la pièce principale, construire une chambre (les lits y
    déménagent), une table et des chaises, la chambre des enfants, un salon, un canapé, une table
    basse (et une plante), un tapis. La carte dessine la maison à son étape (les grands meubles :
    ceux de la maison de la ferme, `assets/meuble_*.png`) ; un voisin dit ce que sa famille
    vient de s'offrir, ou ce pour quoi elle met de côté. Il faut environ deux mois de jeu pour
    tout bâtir.
  - **Un lit chacun** : chaque maison a de 3 à 5 lits (paillasse et couverture, `TRANSITION.LITS`,
    `m.lits`), et sa famille deux adultes et autant d'enfants qu'il reste de lits. De 22 h à 6 h
    (`TRANSITION_VIE.sommeil`), chacun va à son lit et y dort, sous sa couverture ; au lever, il
    reprend sa journée. Arrivé sur la carte en pleine nuit, on les trouve déjà couchés.
  - Les enfants vont à l'école comme ceux de la ferme : le lundi, le mardi, le jeudi et le
    vendredi, de 8 h 45 à 16 h 45. Le matin, ils vont à pied jusqu'à l'abri, où le bus de l'école
    les attend ; le soir, ils en descendent et rentrent chez eux. Si le bus est déjà passé (ou
    sans animations), ils sont déjà partis, ou déjà rentrés.
- **Les métiers des voisins** : chaque maison est bûcheron ou agriculteur (le plan, tour à tour :
  il y a toujours les deux) ; l'agriculteur a un champ de 4 × 2 parcelles à côté de sa maison,
  et chaque maison a un four ou une cuisinière.
  - **L'économie** (`js/engine/voisins.js`, réglages `VOISINS` de `data/ville.json`) : chaque
    foyer (`state.voisins.foyers`) a son argent, son garde-manger, son champ et son bonheur. Il
    naît à la première visite et vit une journée à chaque nuit du jeu (`voisinsNuit`, dans
    `runNight`), avec les règles de la famille du joueur : le besoin journalier (`FAMILLE.AJ`),
    le bonheur des repas (`mealHappinessDelta` : les plats cuisinés en rendent, la faim en coûte).
  - **Le bûcheron** abat 4 arbres de la carte par adulte et par jour (5 bois chacun ; les arbres
    repoussent comme ceux du joueur), vend le bois au marché et y achète tout ce qu'il mange.
  - **L'agriculteur** achète ses graines (ou replante ses patates), récolte son champ, garde de
    quoi cuisiner et vend le reste ; il n'achète que ce qu'il ne produit pas (œufs, huile, farine).
  - **La cuisine** : chacun cuisine les plats de son métier (`VOISINS.RECETTES`) tant que le besoin
    n'est pas couvert, puis complète avec des aliments crus. Des plats différents (3 au plus) ;
    au-delà du besoin, il en cuisine pour le plaisir avec une petite part de son épargne.
  - **Sur la carte** (`js/carte/ville/metiers.js`) : le bûcheron va abattre l'arbre debout le plus
    proche en trois coups de hache (`FermeHote.voisinAbat` : l'arbre compte dans sa journée) et
    rapporte le bois chez lui ; l'agriculteur travaille son champ (houe, arrosoir), dont on voit
    la terre et les plantes à leur stade ; entre 11 h et 14 h, le second parent part au marché de
    la ville par la route et en revient son panier plein ; à partir de 17 h 30, un parent cuisine
    devant le four ou la cuisinière.
  - Un toucher sur un voisin : il raconte son métier et sa journée d'hier (arbres abattus ou
    récolte, ventes, plats du dîner), son argent de côté et son bonheur.
- **Le livreur** (`js/carte/ville/livreur.js` ; le plan : `LIVREUR`, `js/engine/transition.js`) :
  au-dessus de l'arrêt de bus, son habitation (il vit seul), l'entrepôt et, entre les deux, le
  parking de son triporteur électrique (la carte de Tiled leur laisse la place : `RESERVE`,
  `PARKING`, `scripts/ville/transition.py`). Devant chaque maison, dans l'herbe au bord du
  chemin (une case d'herbe entre elle et l'allée), une caisse de collecte : chaque soir, la
  famille y met ce qu'elle vend (le bois, les légumes en trop).
  - Le triporteur ne roule qu'au milieu du chemin, puis de la route (`roule` : un point par
    colonne, d'après `plan.milieu`) ; il s'arrête au milieu du chemin, devant chaque caisse.
  - À 6 h, il se lève, va au parking, monte sur son triporteur et part vers la ferme en
    s'arrêtant à chaque caisse pleine (de l'est à l'ouest), dont il prend les marchandises ; puis
    il fait demi-tour jusqu'au marché de la ville, au bout de la route.
  - En y arrivant, la caisse de chaque famille est vendue et son prix lui est aussitôt crédité
    (`livraison`, `js/engine/voisins.js` ; un « +12 💰 » monte au-dessus de chaque caisse).
  - Il reste en ville jusqu'à 11 h, revient garer son triporteur, rentre chez lui et se couche
    à 22 h. Sans le joueur, la tournée se fait quand même : la caisse est vendue au début de la
    journée suivante, ou à l'arrivée du joueur après 9 h.
  - Un toucher sur lui : il raconte sa tournée ; sur une caisse : ce qu'elle contient et ce
    qu'elle vaut au marché.
- **Les ressources du jour sont pour le joueur** (`ramasserTransition`, `js/engine/transition.js`) :
  des petites pierres, des morceaux de bois et des herbes, 36 par jour (`ressourcesDuJour`). Un
  toucher sur l'une d'elles y envoie le personnage, qui la prend en arrivant. Comme sur la ferme
  générée : une petite pierre donne une pierre, un morceau de bois du bois, une herbe une fibre,
  contre l'énergie et l'XP du geste « ramasser » ; pas la nuit, ni épuisé. Ce qu'il a pris est
  gardé dans la partie (`state.transitionPris`, `{ jour, ids }`) et ne revient pas avant le
  lendemain.

## Les immeubles d'habitation en blocs de la ville

`js/carte/ville/immeuble.js`, réglages dans `IMMEUBLE` (`js/carte/ville/config.js`).

- **Ils remplacent les immeubles d'habitation** de la ville (`IMMEUBLE.batiments`) : l'immeuble
  ocre (à l'est, contre le bord), la résidence de verre et la résidence ocre (à l'ouest, le long
  de la voie ferrée). Au chargement de la carte, `V.immeubleCarte` ôte leurs tuiles et leur
  emprise ; `makeImmeuble` pose à leur place des immeubles bâtis avec les blocs de la ferme :
  l'immeuble ocre (22 × 14 cases, 3 niveaux, plan « double »), la résidence de verre (10 × 14
  cases, 4 niveaux) et la résidence ocre (10 × 14 cases, 5 niveaux), au plan « simple » ; la
  tour de la gare (12 × 14 cases, 8 niveaux, en pierre de taille), au même plan, en studios :
  pour un couple, sans le lit de l'enfant (`enfants: 0`).
- **Les maisons de ville (plan « maison »)** : les rangées de maisons du centre (`maisons_a*`,
  `maisons_b*`, `IMMEUBLE.retire`) deviennent 17 maisons (`RANGEES` dans la config : 4 + 4 + 3 à
  l'ouest de la rue, 2 + 2 + 2 à l'est), de 8 à 12 cases de large sur 10 de profondeur, deux
  niveaux, en briques rouges, orange, ocre ou bleues (`immeuble_ville_<brique>.png`). Au
  rez-de-chaussée, derrière, la pièce de vie (la cuisine, le four, la table) ; devant, le salon
  et l'entrée (la porte sur la rue, l'escalier). À l'étage, la chambre des parents, celle des
  enfants (un lit chacun : 2 dans un T3, 3 dans un T4) et le palier. Chacune loge une famille :
  deux adultes et ses `enfants` (docs/plan-ville.md).
- **Les lieux** (`js/carte/ville/lieux.js`, `V.plansLieux`) : les commerces remplacent des
  bâtiments sans rôle (docs/plan-ville.md) : la boulangerie (la maison bleue), la pizzeria et le
  fast-food de burgers (les bureaux de l'est), la poissonnerie (les bureaux du marché), le
  magasin d'informatique (la verrière de l'est). Deux niveaux : la boutique au rez-de-chaussée
  (la salle des clients, le comptoir, l'atelier ou la cuisine derrière), la réserve et le
  bureau à l'étage. Leur enseigne surmonte la porte (`enseigne_<lieu>.png`) ; leurs meubles
  (le four de boulanger, le pétrin, la vitrine, le four à pizza, la friteuse, le grill, l'étal
  de poissons, le bac à homards, les présentoirs, les étagères, le bureau et son écran) sont
  dessinés par `scripts/ville/commerces.py`. On achète au comptoir d'une boutique (ou à sa
  vitrine, son étal, son présentoir) quand un employé y travaille : une fenêtre d'achat
  (`tapBoutique`, `js/carte/ville/marche.js` ; `VILLE.BOUTIQUES`) ; sinon, la boutique dit ses
  horaires. Le premier employé d'un lieu se tient derrière son comptoir ou devant le tableau
  noir (`IMMEUBLE.vie.postes`). Les services et les loisirs prennent la place de
  la maison à deux ailes (la mairie : l'accueil, la salle des mariages, les bureaux ; à l'étage,
  la salle du conseil), de la tour (le musée : le squelette de dinosaure, les vitrines, les
  tableaux, les bustes), des bureaux du centre-est (le cinéma : l'écran et ses fauteuils, la
  billetterie, la cabine de projection ; les écoles 2 et 3 : une classe par niveau) et des
  bureaux de la gare (le bureau de négoce : la salle des marchés, la salle de réunion) ; leurs
  meubles : `scripts/ville/services.py`. Les fabriques prennent la place des usines, des
  entrepôts et des bureaux de l'ouest (l'usine électronique, la fabrique de matériaux, la
  fabrique textile, la minoterie, la fabrique de mayonnaise, l'usine informatique) et de la
  longue maison (la menuiserie, tout en longueur) : l'atelier et ses machines au
  rez-de-chaussée, les bureaux et la réserve à l'étage ; leurs machines :
  `scripts/ville/fabriques.py`.
- **L'immeuble ocre (plan « double »)** : au rez-de-chaussée, le hall occupe le milieu de la moitié de devant (4 × 7 cases) : une
  porte double sur la rue, une porte de chaque côté vers un logement, et au fond l'escalier qui
  monte. **À chaque étage**, le palier, de la même taille : le haut de l'escalier d'où l'on
  vient, l'escalier qui monte au suivant (sauf au dernier) et les deux mêmes logements.
- **Chaque logement** (`V.planImmeuble`, celui de droite en miroir) a trois pièces :
  - un petit salon : un canapé, une table basse, un tapis, une plante ;
  - la pièce de vie : la cuisine, le four, une table et deux chaises ;
  - derrière, une chambre sur toute la largeur du logement (au-dessus du hall aussi ; un mur
    mitoyen sépare les deux chambres) : deux lits, deux tables de chevet, une plante.
- **Les résidences (plan « simple »)**, plus étroites : un logement par niveau, sur toute la
  largeur. La chambre au fond (deux lits, deux tables de chevet, une plante), la pièce de vie
  (la cuisine, le four, une table et sa chaise, une plante), le salon devant à gauche (le
  canapé, la table basse, le tapis) ; le hall (le palier aux étages) devant à droite, avec la
  porte double sur la rue et l'escalier.
- **La façade**, comme celle des immeubles de la ville (`immeuble_ville.png`,
  `immeuble_ville` dans `scripts/carte/blocs.py`) : des étages de 40 px (`IMMEUBLE.dy`) en briques
  de l'immeuble remplacé (ocre ; bleues pour la résidence de verre, `immeuble_ville_bleu.png`) ; un soubassement gris au rez-de-chaussée, un
  bandeau de pierre au plancher de chaque étage, une corniche sous le toit ; des pierres d'angle
  à refends aux angles ; les fenêtres de la ville (linteau, cadre de bois, quatre carreaux,
  appui), avec de l'espace au-dessus et au-dessous ; la porte double vitrée de l'entrée dans son
  encadrement de pierre. Les cloisons sont des murs bas, pour qu'on voie le fond des pièces. Un
  toit de tuiles (`CarteKit.toit`, le même qu'à la ferme) couvre le dernier niveau.
- **Monter, descendre** : marcher sur une marche de l'escalier fait changer de niveau. Le
  personnage arrive sur le même escalier, au niveau d'à côté, dessiné remonté de 40 px par
  niveau, et ne marche que sur ce niveau (`marcheEtage`).
- **Ce qu'on voit** (`stepImmeuble`) :
  - dehors : tous les niveaux l'un sur l'autre, et le toit ;
  - dans un immeuble : son toit s'efface, sa façade de devant s'efface à moitié, le niveau du
    dessous est en transparence et ceux du dessus sont cachés ; les autres restent vus de dehors ;
  - à un étage : un voile sombre couvre la ville, l'immeuble et le personnage passent devant ;
  - un mur juste devant le personnage s'efface un peu.

### Les familles des immeubles

Chaque logement des immeubles (deux par niveau dans l'immeuble ocre, un par niveau dans les
résidences : 15 familles ; un studio par niveau dans la tour de la gare : 8 couples) et chaque
maison (17 familles) a sa famille : deux adultes et un enfant (dans un studio, aucun ; dans une
maison, deux ou trois), tirés comme les voisins de la transition (`V.voisins`, gardés en
`localStorage`, un lit chacun). Le moteur (`js/engine/voisins.js` : `immeubleFoyer`,
`immeubleNuit`, `immeubleVue` ; `state.immeuble.foyers`, par logement : `logement_1`… pour
l'immeuble ocre, `residence_verre_1`…, `residence_ocre_1`… : `VOISINS.IMMEUBLE.LOGEMENTS`) en
fait des citadins : chaque adulte a son poste (`VOISINS.EMPLOIS`, `data/ville.json` : 80 postes
pour les 80 adultes, docs/plan-ville.md ; `assigneEmplois` les donne dans l'ordre des
logements, et chacun garde le sien), et chaque nuit, il touche le salaire de son poste ; la
famille achète au marché les ingrédients de ses repas (`VOISINS.RECETTES.citadin`), avec les
mêmes règles que les voisins (besoin, plats, bonheur). Le journal garde ce qu'elle a acheté
(`achats`).

Sur la carte (`js/carte/ville/habitants.js`), chaque adulte part à pied avant chacun de ses
services (un ou deux par jour : les horaires de son métier), le temps du trajet avant le début :
il descend l'escalier, sort, et va à son lieu. Dans un lieu bâti en blocs, il entre et se tient
à sa place (au rez-de-chaussée, réparties dans la pièce) ; ailleurs (la fromagerie, la
conserverie, la confiturerie, l'école de la carte, l'amphithéâtre ; la gare pour les chauffeurs,
les scieurs et les chaudronniers, qui travaillent hors de la ville), il entre et n'est plus sur
la carte. Entre deux services, il rentre chez lui ; après le dernier, avant 20 h, il passe par
un étal du marché, rentre le panier plein, et le premier arrivé cuisine devant le four. Ceux qui
commencent tôt se lèvent plus tôt, ceux qui finissent tard se couchent plus tard. Les enfants
vont à l'école comme ceux de la ferme (les jours `HorlogeSortie.JOURS_ECOLE`, de
`CarteKit.ECOLE.debut` h, 8 h 45, à `fin` h, 16 h 45), chacun à l'une des trois écoles (la plus
proche qui a de la place : `repartitEcoles`) : ils y vont à pied ; à l'école de la carte, ils
entrent par sa porte (le bout du chemin des enfants qui descendent du bus) ; aux écoles 2 et 3,
ils prennent place derrière un pupitre. Ils rentrent à pied ; le reste du temps, ils sont au
logement.

### L'horaire de l'école

L'école commence à 8 h 45 pour tous les enfants : ceux de la ferme, des voisins de la transition et
des immeubles (`CarteKit.ECOLE`, `js/carte/kit.js`). Chacun part de chez lui le temps qu'il lui
faut pour y être à l'heure : la longueur de son chemin divisée par sa vitesse (une heure du jeu :
30 s), avec un peu d'avance. Le bus de l'école suit un horaire compté à rebours depuis 8 h 45
(`CarteKit.horaireEcole`) : son arrêt en ville le temps que les enfants marchent jusqu'à l'école,
son arrêt de la transition `ECOLE.bus` h plus tôt ; les enfants de la ferme passent le bord de la
ferme le temps de marcher jusqu'à cet arrêt. Les enfants de la ferme partent donc de la maison
selon leur chemin jusqu'au bord de la ferme ; ceux des voisins, selon leur chemin jusqu'à l'abri ;
ceux des immeubles, selon leur chemin (escaliers compris) jusqu'à la porte de l'école. Le soir,
l'école finit à 16 h 45, et le bus repart de la ville quand les enfants y sont montés. Tous dorment de 22 h à 6 h. Un habitant marche sur son niveau et
change de niveau par l'escalier ; on le voit dehors, ou dans son immeuble quand on y est, à son
niveau. Le toucher : il raconte son travail, ses achats et son dîner d'hier.

## Les anciennes parties

Une partie de la carte de Tiled peut déménager sur une ferme générée, sans rien perdre
(`convertirPartie(state, graine)`, `js/engine/demenagement.js`). Étape 1, le moteur :

- **Ce qui reste** : l'argent, l'inventaire, le niveau, les technologies, la famille, les bêtes, les
  niveaux des bâtiments et ce qui pousse.
- **Les parcelles** gardent leur place : la cour de la carte de Tiled est posée sur la ferme
  générée (`DECALAGE`). Une parcelle qui tombe hors de la terre labourable va sur la plus proche.
- **Les bâtiments déjà là sont rebâtis en blocs**, chacun près de sa place d'avant
  (`ANCIENNE_COUR`, `ferme-generee.js`), avec une case libre tout autour :

  | Bâtiment | Blocs posés |
  |---|---|
  | la maison réparée | un foyer : une paillasse par membre, le four et la cuisinière s'ils sont construits |
  | le Poulailler | une enceinte avec le nichoir, une porte sur le dehors, un enclos de barrières ; une case libre par poule de son niveau |
  | l'Étable | la même chose avec la mangeoire, une case libre par place achetée |
  | la Serre | une enceinte avec le bac à semis, une case par parcelle |
  | le Silo, le Moulin | une petite enceinte avec le coffre à grain ou la meule |
  | le puits, les appareils | le puits (la pompe dessus si elle est achetée), le panneau, la citerne, la batterie, en ligne |
  | le robot | sa station, à côté du foyer |

  Chaque bâtiment est ensuite vérifié par les règles du jeu (`couchages`, `etatPoulailler`,
  `etatEtable`, `serrePlaces`, `pieceDe`). Un bâtiment qui ne trouve pas sa place ou n'est pas
  reconnu rend ses blocs dans l'inventaire. Une maison pas encore réparée rend les blocs d'un
  foyer (murs, porte, paillasses) : le foyer reste à bâtir.
- **Les arbres du Verger** sont plantés dans le sol, près de leur emplacement d'avant, à
  `ARBRE_ECART` cases l'un de l'autre.
- **Le reste** : l'Atelier est construit (à poser). Les arbres abattus, les rochers cassés, la
  cueillette du jour et la tournée du robot repartent de zéro. Les tas à ramasser entrent dans
  l'inventaire.
- **Étape 2, le déménagement au chargement** (`js/ui/demenagement.js`) : une ancienne partie
  (écran de départ passé) déménage, sans choix de rester : tant qu'elle est sur la carte de
  Tiled, une fenêtre qu'on ne ferme pas l'explique. Elle montre l'aperçu de la nouvelle terre
  autour de la cour (`apercuDemenagement` : la conversion faite sur une copie), la liste de ce qui
  est rebâti et de ce qui revient dans l'inventaire, et la graine (tirée de la partie,
  `graineDemenagement`) : si la terre ne plaît pas, on change de graine ou on en tire une au hasard
  (« Une autre terre »).
  - **Déménager sur cette terre** : la sauvegarde d'avant reste sur l'appareil
    (`ferme-save-avant-demenagement`), la partie est convertie et la page se recharge.
  - **Une nouvelle partie** est toujours sur une ferme générée : l'écran de départ explique la
    terre sauvage et demande la graine (vide : au hasard), sans proposer la ferme du grand-père.
- À venir (étape 3) : retirer la carte de Tiled quand plus aucune partie ne l'utilise.

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
       - pas d'intérieur de maison (les repas n'ont pas de scène), et le tutoriel n'arrête pas
         l'horloge : le foyer se bâtit en plusieurs jours ;
       - **les meubles** du Marché (rayon Meubles, `data/meubles.json`) : une fois le foyer bâti,
         un meuble acheté arrive dans l'inventaire (l'objet `meuble_<id>`, le bonheur est donné à
         l'achat, comme avant) et se pose avec le mode Construire, comme un bloc
         (`DATA.ATELIER.BLOCS.meuble_<id>`), dans une pièce close de la maison :
         - la table, le canapé et la table basse prennent 3 ou 2 cases vers la droite, les lits
           2 cases vers le haut, le tapis rouge 3 × 2 (`largeur`, `hauteur` ; rien d'autre ne se
           pose sur ces cases, `casesCouvertes`) ; un appui sur l'une d'elles reprend le meuble ;
         - les tapis sont à plat, on marche dessus ; le reste arrête le passage, sauf les lits ;
         - un lit est un couchage, comme une paillasse : le personnage s'y couche, sous sa
           couverture (`bedSpot`) ;
         - un tableau s'accroche à la face d'un mur (sans mur ni porte juste en dessous :
           `state.blocsDessus`, comme la pompe sur le puits) ; il s'efface avec son mur ;
         - la carte pose leur dessin (`assets/meuble_<id>.png`) en bas au milieu de leurs cases
           (`syncMeuble`, `syncTableaux` dans `js/carte/ferme/chantier.js`) ; le menu Construire
           ne montre que les meubles qu'on a en main ;
         - une ancienne partie qui déménage retrouve ses meubles achetés dans l'inventaire.
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
       - **La station du robot** (1 lingot de fer, 1 de cuivre, 2 planches) se fabrique aussi à
         l'Atelier et se pose dehors, une seule, quand le robot est là (récolte ou semis
         automatiques). Le robot part d'elle et y revient se recharger (`robotStation`) ; tant
         qu'elle n'est pas posée, il attend près de la maison et ne se recharge pas (ni le jour,
         ni la nuit). Elle garde son image animée (`station_robot.png`, `machines.js`) ; un
         appui ouvre la fenêtre du robot. Une ancienne partie qui a déjà le robot en reçoit une
         dans l'inventaire (migration v40 → v41).
       - **Le robot contourne** les bâtiments, les murs, l'eau et les arbres, comme le
         personnage (`Fermier.path`) : il ne passe plus au travers.
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
       - **Sur la carte** : ses parcelles se posent sur les cases libres de sa pièce, une par
         case (`serrePlaces` : ni le bac, ni les cases juste derrière ses portes, le passage),
         dans des bacs de planches ; ce qui y pousse se voit, et un appui y plante, arrose ou
         récolte comme au potager. Des parcelles de plus que de cases restent dans la fenêtre.
         La pièce a un **toit de verre** (`toits` : `verre`, `CarteKit.toit(…, true)`) : des
         vitres entre des montants de bois, on voit les cultures au travers.
       - **Ses murs sont en verre** : quels que soient les blocs posés, les murs et la porte de
         son enceinte (`serreMurs`) se dessinent en vitres claires dans des arêtes de bois
         (`murs_hauts.png` 306 à 369, `verre_serre` ; la porte vitrée : 370, `porte_serre`).
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
       - Version 1.25 : le Moulin est une **tour** (`etatMoulin`). Une pièce close dont tous les
         murs (pas les portes) ont `ATELIER.MOULIN.HAUTEUR` (3) blocs de haut, avec la meule au
         centre (la case du milieu, ou l'une des deux du milieu si le côté est pair). Un mur se
         rehausse (`state.hauteurs`, jusqu'à `HAUTEUR_MAX`) en mode Construire au niveau n ≥ 1
         (le sélecteur de niveau, sans escalier) : un appui sur un mur haut de n blocs lui en
         ajoute un, sur un mur haut de n + 1 blocs reprend celui du dessus. Au niveau 0, un appui
         sur un mur le reprend comme tout bloc (le bloc du dessus d'abord). Aux niveaux 1 et 2, la carte
         montre le niveau seul (`syncRang`) : un voile sombre sur la ferme, devant lui le rang
         de mur du niveau (celui du dessous à peine visible, les autres presque invisibles), les
         places du bloc suivant surlignées ; un appui vise cette hauteur. Vu de 3/4, les blocs empilés
         d'un mur cachent la case de derrière : un mur resté plus bas que ses voisins y est marqué
         en rouge, et la fenêtre du Moulin dit de quel côté sont ceux à rehausser. La station suit (`majMoulin`) ;
         une partie d'avant garde sa meule, mais doit rehausser ses murs (migration v41 → v42).
         Sur la carte, les murs s'empilent de `etage.dy` px par bloc, un linteau ferme le dessus
         des portes, le toit se pose en haut de la tour ; dehors, une voilure de quatre ailes
         (`js/carte/ferme/moulin.js`) paraît sur la façade et tourne quand la meule moud.
     - ✅ **5b-8, les arbres fruitiers** : pas de Verger sur la ferme générée.
       - Le **jeune pommier** et le **jeune poirier** (40 pièces), le **jeune cerisier** (50), le
         **jeune abricotier** et le **jeune pêcher** (45) s'achètent au Marché, rayon Graines, sur
         la ferme générée seulement, une fois le Verger débloqué (niveau 6). Ils donnent des
         pommes, des poires, des cerises, des abricots et des pêches.
       - **Les dessins** (`assets/verger.png`, `scripts/verger/arbres.py`) : l'arbre adulte est le
         feuillu de la carte (`arbre_feuillu.png`), son feuillage un peu teinté selon l'espèce ;
         l'arbuste, un petit feuillu. Le jour avant ses fruits, l'arbre est **en fleur**
         (`VERGER.FLORAISON`, `treeInBloom`) : fleurs blanc rosé (pommier), blanches (poirier),
         blanc crème (abricotier), roses vives (pêcher) ; le cerisier en fleur est tout rose, sauf
         le tronc. En fruits, de petits fruits sur le feuillage.
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
