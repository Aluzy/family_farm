# La ferme générée (projet)

Une ferme quatre fois plus grande que la carte dessinée dans Tiled, générée d'après une graine,
sans bâtiment au départ : on ramasse, on fabrique et on construit bloc par bloc.

## Décisions

- **Taille** : 4 fois la surface de la carte actuelle, soit 144 × 114 tuiles de 16 px
  (2304 × 1824 px).
- **Graine** : la même graine donne toujours la même carte. La sauvegarde ne garde que la
  graine et ce que le joueur a changé (blocs posés, ressources prises).
- **Le chemin vers l'est** : un chemin garanti mène au bord est. Il se termine sur le
  rectangle `vers_la_transition`, que la carte générée fournit comme celle de Tiled ; il menait
  à la carte de transition, retirée du jeu (docs/grand-monde.md) : il ne sert plus, la graine de
  la carte n'a pas changé.
- **Parties en cours** : une ancienne partie déménage sur une ferme générée à son chargement
  (voir « Les anciennes parties ») ; une nouvelle partie a toujours la carte générée.
- **Paiement** : les bâtiments se paient en matériaux seulement. Les pièces ne servent qu'à
  acheter des matériaux au Marché.

### Ramassage à la main

Des petites pierres et des morceaux de bois se ramassent sans outil, avec un petit coût
d'énergie :

| Ressource ramassée | Objet obtenu |
|---|---|
| petite pierre | 1 pierre |
| morceau de bois | 1 bois |

Chaque nuit, quelques-unes repoussent à des endroits tirés d'après la graine et le jour. Le
premier jour d'une nouvelle partie, il y en a en plus autour de l'endroit où le personnage apparaît
(`ATELIER.RAMASSAGE_DEPART` : 6 pierres et 9 bois, à 2 à 7 tuiles de lui, posés ce jour-là seulement) : de quoi bâtir l'Atelier, puis la hache et la pioche,
sans s'éloigner. Il n'y
a plus d'herbes à ramasser : la fibre vient de l'herbe haute fauchée (la faux, `FAUX.FIBRE` : une
fibre au sol par touffe, à ramasser en marchant dessus). La faux se fabrique à l'Atelier sans
fibre (3 bois, 2 pierres) : c'est le premier outil à faire.

### La botteleuse : des fibres, des bottes de paille

Trois sortes de blocs de l'Atelier (`ATELIER.BLOCS` : `botteleuse` « entonnoir », « machine »,
« convoyeur » ; `js/engine/botteleuse.js`), posés côte à côte sur une rangée, de gauche à
droite : l'entonnoir, la machine, puis `BOTTELEUSE.CONVOYEUR` (2) segments de convoyeur ; la case
au bout du convoyeur reste libre. Un appui sur une de ses pièces : le personnage va devant
l'entonnoir et y jette ses fibres, la brassée au-dessus de sa tête (geste `jette_<vue>_0..2`,
`scripts/personnage/fermier.py`). Quand la machine en a reçu `BOTTELEUSE.FIBRES` (10), elle vibre
`BOTTELEUSE.VIBRE_S` (3) secondes, son voyant allumé, la bande tourne ; une botte de paille sort à
droite, avance sur le convoyeur et tombe au sol au bout : un morceau de `BOTTELEUSE.PAILLE` (10)
paille (`state.morceaux`, image `botte`), ramassé en marchant dessus (`js/carte/ferme/botteleuse.js`).
`state.botteleuses = { [case de la machine]: { fibres } }` ; reprise, la machine rend ses fibres.
Les dessins : `scripts/carte/blocs.py` (entonnoir, machine, convoyeur), `scripts/carte/ramassables.py`
(la fibre au sol, la botte). Le joueur automatique, sans carte, bottelle ses fibres directement
(`bottelerSansCarte`).

### Le distributeur de grain : le blé des poules

Trois blocs posés côte à côte sur une rangée, dans l'enclos du Poulailler (`js/engine/distributeur.js`),
de gauche à droite : un entonnoir (celui de la botteleuse), le distributeur (`ATELIER.BLOCS.distributeur`,
`distributeur: "machine"`), puis la mangeoire à grain (`mangeoire_grain`, deux cases de large :
`largeur: 2`, `casesCouvertes`). Tous deux se fabriquent à l'Atelier une fois le Poulailler débloqué.
Un appui sur une de ses pièces : le personnage va devant l'entonnoir et y jette son blé
(l'inventaire, puis le Silo ; `verserGrain`), comme les fibres dans la botteleuse ; le distributeur en
garde au plus `DISTRIBUTEUR.CAPACITE` (40). Chaque jour, de `DISTRIBUTEUR.HEURE` (7 h) jusqu'au soir,
il nourrit les poules qui ne le sont pas encore, avec les mêmes rations qu'à la main
(`distribuerGrain`, `feedHensFrom`). `state.distributeurs = { [case du distributeur]: { grain } }` ;
repris, il rend son blé. La carte les dessine comme des meubles (`dessin` : une image qui suit le
blé, `scripts/batiments/distributeur.py` : le hublot de vide à plein, la mangeoire vide ou pleine) ;
la fenêtre du Poulailler dit son blé, ou ce qui manque pour qu'il marche.

### Le cheval et l'Écurie

Le cheval (`js/engine/cheval.js`, `DATA.CHEVAL`) s'achète au Marché (rayon Animaux) une fois
l'Écurie construite : une enceinte de murs où est posé le râtelier (`ATELIER.BLOCS.ratelier`,
`ecurie: true`, fabriqué à l'Atelier), une porte sur le dehors, et `CHEVAL.PLACES` cases libres
(`etatEcurie`, une variante sans enclos d'`etatEnclos`). Il s'y promène tant que le joueur est à
la ferme (`syncBeasts`, l'entrée `ecurie` de `betesDesEnclos`). Sa case de la barre d'outils met
le personnage en selle (`toggleCheval`) : il va `VITESSE` fois plus vite, assis sur le cheval
sellé (`js/carte/cheval.js`, comme le triporteur ; `scripts/personnage/cheval.py`). Pour l'instant
il ne se monte qu'à la ferme : il n'entre pas dans la mine. L'attacher à un poteau sur une autre
carte (`CHEVAL.ATTACHE`, l'ancien `js/carte/ville/monture.js`, retiré avec la ville) reviendra avec
le grand monde (docs/grand-monde.md) ; une partie dont le cheval était attaché ailleurs le
retrouve à l'Écurie (migration 50 → 51, `rentrerCheval`). La nuit, après l'Étable, il mange
`RATION` paille (`chevalNuit`) ; sinon il ne va que `VITESSE_FAIM` fois plus vite.

### L'atelier niveau 1

L'atelier coûte 3 bois et 3 pierres. Il permet de fabriquer :

| Recette | Résultat |
|---|---|
| 2 bois | 1 planche |
| 4 pierres | 1 mur en pierre |
| 3 planches | 1 porte |
| 2 fibres | 1 paillasse |
| 2 bois + 1 pierre + 1 fibre | houe de pierre |
| 2 bois + 2 pierres + 1 fibre | hache de pierre |
| 2 bois + 3 pierres + 1 fibre | pioche de pierre |

Le Marché vend toujours les outils.

### Construction bloc par bloc

- On pose chaque mur sur une case de la carte ; la porte aussi, directement sur une case libre,
  ou sur un mur, à sa place (comme une fenêtre : le mur revient dans l'inventaire).
- Un espace entièrement entouré de murs, avec au moins une porte, devient une **pièce close**.
- Les autres bâtiments suivent la même logique.
- Un meuble du Marché en main (pas un tableau) : la carte se quadrille ; un appui sur une case y
  pose son aperçu calé sur la grille (vert : il tient là, rouge : non), sans le poser ; un glissement
  du doigt parti de l'aperçu le déplace case par case (la carte ne défile pas). ✔️ le pose,
  ❌ sort de ce mode (js/ui/chantier.js `meubleModele`, js/carte/ferme/chantier.js `syncPoseMeuble`).
- Deux lits adulte posés côte à côte (la même rangée) deviennent sur la carte un lit deux places
  (`assets/meuble_lit_double.png`, `syncLitsDoubles`) ; ils restent deux lits, deux couchages.
- La nuit (22 h → 6 h), chaque membre de la famille dort dans un lit : le k-ième a le (k + 2)-ième
  couchage (le premier est au personnage du joueur, comme dans le moteur, `nuitSansCouchage`) ; il
  y va, s'y couche sous la couverture et se lève au réveil (js/famille-ferme.js, `bedSpots`). Sans
  lit pour lui, il reste dans la maison, comme avant.
- Version 1.26 : une case où se trouve une ressource de la carte (herbe haute, rocher, arbre) ne
  se bâtit qu'une fois la ressource récoltée (fauchée, cassée, abattue ; terrain `HERBES`, `ROCHERS`,
  `ARBRES`). Rien ne repousse sur une case bâtie ni dans une pièce close (`casesBaties`) ; une
  partie d'avant voit l'herbe restée sous ses blocs fauchée, sans paille (migration v42 → v43).
- Il n'y a **pas de toit** : on voit les murs et l'intérieur d'en haut.

### Dormir

- Une paillasse ne se pose que dans une pièce close.
- Il faut **une paillasse par personne**. Un membre de la famille sans paillasse ne dort pas et
  ne regagne pas l'énergie de la nuit.

### Manger : la boîte à nourriture

- Il n'y a **plus de repas à 19 h**. Chaque membre de la famille, sauf le personnage principal, a
  une **jauge de faim** de 0 à 100 (`FAMILLE.FAIM`, `js/engine/repas.js`). Elle baisse d'un point
  tous les 100 pixels marchés sur la carte (`js/famille-ferme.js` → `marcherMembre`) et de
  `FAIM.AIDE` points par tâche du second adulte aux bêtes (`aideBetes`).
- Arrivé à **20**, le membre mange jusqu'à 100 (`repasStep`, à chaque pas de la journée) : dans la
  **boîte à nourriture** (un bloc de l'Atelier, 3 planches, posé dans une pièce close), d'abord ce
  qui périme le plus tôt ; sur la carte, il va à la boîte et s'y baisse (`allerManger`). Sans rien
  à manger, il a faim : une alerte, et `BONHEUR.FAIM` de bonheur en moins la nuit
  (`js/engine/bonheur.js`, `data/general.json`).
- Le joueur remplit la boîte (un appui dessus : `js/ui/boite.js`) : **6 aliments différents, 10 de
  chacun** (`ATELIER.BOITE`). Ce qu'elle contient périme comme l'inventaire ; reprise, elle rend
  tout.
- **Le réfrigérateur** s'achète (sa fenêtre, `buildFridge`) et arrive dans l'inventaire : c'est un
  bloc qu'on pose dans la maison comme un meuble (`ATELIER.BLOCS.refrigerateur`, pas à l'étage ;
  dessin `assets/meuble_refrigerateur.png`). **Posé**, il est construit : la boîte et son contenu
  reviennent dans l'inventaire (`rangerBoite`), la famille mange au frigo et va s'y servir sur la
  carte. **Repris**, ce qu'il gardait revient dans l'inventaire (`closeFridge`). Une partie
  d'avant la version 48 voit son frigo posé sur une case libre du foyer (sinon, il attend dans
  l'inventaire).
- Un aliment rend sa **valeur** : énergie ÷ 5, + 10 %, arrondie au-dessus (`valeurAliment` :
  carotte 2, baie 2, patate 5, conserve 6), à la famille comme au personnage (l'en-cas).
- La nuit recopie ce qui a été mangé dans la journée (`feedFamily`) : l'**autonomie** est la part
  des points mangés qui vient de la ferme (un jour sans repas garde celle de la veille) ; l'énergie
  du réveil vaut 60 + 40 × la jauge moyenne de la famille au coucher.

## La ferme générée (étape 2)

- **La carte** : `genererFerme(graine)` rend une carte au format de Tiled (144 × 114 tuiles),
  dessinée avec les tuiles du décor version 2, comme l'ancien `scripts/carte/carte_v2.py` dessinait la carte
  de Tiled :
  - l'herbe en trois teintes, qui ondulent selon un bruit ;
  - 2 à 4 étangs avec leurs rives (le premier assez grand pour le brochet), et le tronc creux au
    bord de l'un d'eux (`scripts/carte/tronc_creux.py` : une bûche moussue, ses lueurs au fond du
    creux ; le bloc « tronc_creux » de la planche, `TRONC_CREUX`) ;
  - des bois (arbres clairs, pins, buissons), plus denses vers les bords ;
  - la terre labourée et celle des parcelles, sèche ou arrosée (`scripts/carte/terre_bords.py`,
    puis `terre_arrosee.py`) : des sillons qui ondulent, des mottes, un caillou ;
  - 64 rochers, des fleurs, des touffes d'herbe haute (140 zones de 2,5 à 5 tuiles de rayon ;
    les touffes en quinconce, deux places par case décalées d'une demi-case, prises 9 fois sur
    10 au cœur d'une zone et 3 fois sur 10 au bord, jamais deux fois là où des zones se
    recouvrent : au plus 2 touffes par case, environ 4 500 ; leurs images ne sont créées que près de la
    vue, par morceaux de 256 px, `syncTallGrass`) : les trois herbes du modèle en quatre
    teintes (vert, vert roussi, brun léger, mauve foncé ; chaque zone a la sienne, que la
    plupart de ses touffes prennent) et, pour une touffe sur cinq, fleuries (une tige d'un
    pixel, une petite fleur au bout, posée sans la teinte du sol : `scripts/carte/herbe_haute.py`,
    `assets/herbe_haute_fleurs.png`). La faux en main (version 1.23 : `DATA.FAUX`, Marché ou
    Atelier), un appui sur une touffe la fauche (`grassAt`, `scythe` dans
    `js/carte/ferme/decor.js` ; geste `faux_cote_0..3`) : elle se couche et disparaît, sa fibre
    tombe à son pied (`assets/ramassables.png`, 3ᵉ image) ; elle repousse 2 à 4 jours plus tard
    (`state.outils.herbes`, modèle `fauchees`). Les fibres font la paille dans la botteleuse (voir
    plus haut) ; le Moulin ne fait que de la farine. Le coup fort (version 1.24, `js/carte/ferme/coupfort.js`) : un
    appui maintenu sur le personnage qui tient un outil le fait trembler ; relâché, la hache ou
    la pioche comptent `COUP_FORT.COUPS` coups, la faux tournoie et fauche les touffes à 16 px
    autour de lui (`scytheAround`), la houe laboure les 3 × 3 tuiles autour de lui. Les rochers (`scripts/carte/rochers.py`,
    `assets/rochers.png`, le bloc « rochers » de la planche) sont dessinés dans le style des
    blocs : la pierre des bâtiments taillée en pans, un contour sombre, de la mousse sur les
    gros. Trois tailles : 2 × 2 cases, 1 × 2 (debout ou couché) et 1 × 1 (`DESSINS_ROCHERS` :
    l'emprise de chaque forme, et ses dessins).
- **La mine** : un tas de terre de 3 × 3 tuiles, sa porte sombre étayée de poutres au milieu du
  bas (`scripts/carte/mine.py`, le bloc « mine » de la planche, `MINE`). Il est posé à 16 à 34
  tuiles de la maison (`MINE_DISTANCE`), là où le bois est le plus dense, sur de l'herbe franche
  loin du chemin et de l'eau ; pas de rocher à une tuile autour. Des arbres poussent tout contre
  et le cachent un peu (leur feuillage sur ses colonnes de gauche et de droite, un derrière),
  jamais sur la porte ni sur les deux rangées d'herbe devant elle. Ses cases ne se bâtissent
  pas ; le rectangle `mine` (couche « batiment ») arrête le personnage. Un double appui sur le
  tas, ou le personnage poussé au doigt vers la porte quand il est juste devant, et il y entre
  (`MINE` dans `js/carte/ferme/config.js`, `js/carte/ferme/passages.js`, `entre` dans
  `js/fermier.js`) : il va devant, monte dans la porte en s'effaçant, puis le premier niveau de
  la grotte s'ouvre (`js/grotte.js`, l'entrée « ferme »). Au premier niveau, l'échelle
  ramène à la ferme (`jeu.html?arrivee=mine`) : il sort de la porte en apparaissant et descend
  devant.
- **Les arbres devant le personnage** s'effacent un peu quand il passe derrière, mais seulement
  derrière leur dessin : chaque image d'arbre a son masque (des carrés de 4 px, opaques à plus de
  moitié : `probeOf`, `couvre` dans `js/carte/ferme/decor.js`), que le corps du personnage doit
  toucher ; les coins vides de l'image ne comptent pas. Ils n'arrêtent le personnage qu'à leur
  tronc (la case de son pied, `buildGrid` dans `js/fermier.js`) : on passe à côté et derrière,
  sous le feuillage.
- **Le chemin** est tracé par un A* (`js/engine/chemin.js`), de la porte de la maison au bord
  est. Le rectangle `vers_la_transition` y est posé (il ne mène plus nulle part).
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

  Le calcul par image reste celui de la carte de Tiled (environ 1 ms dans Chromium). Le sol est
  dessiné par régions de 64 × 64 tuiles autour de la vue (`syncRegions`, docs/grand-monde.md,
  étape 2), et non plus en une seule image de la taille de la carte.

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
- **L'Atelier** est une fenêtre de la carte, sur la ferme générée seulement
  (`js/ui/atelier.js`) : un appui sur l'Atelier posé l'ouvre (`BLOCS_CARTE.fenetres`) :
  - il se construit avec 3 bois et 3 pierres (`state.atelier`), en le posant sur la carte :
    l'entrée 🔨 Construire du menu latéral ouvre le menu Construire, dès le départ ;
  - ses recettes (`DATA.ATELIER.RECETTES`) sont fabriquées tout de suite : c'est le geste
    « fabriquer », qui coûte 2 d'énergie et rapporte 10 XP ;
  - les outils de pierre sont les mêmes que ceux du Marché, qui les vend toujours.
- **Les nouveaux objets** (« matériau ») : fibre 🪢, planche 🪚, mur en pierre 🧱, porte 🚪,
  paillasse 🛏 ; leurs icônes sont dans `scripts/icones/art_atelier.py`.
- **Le didacticiel** d'une nouvelle partie (`js/engine/didacticiel.js`, `js/ui/didacticiel.js`,
  `DATA.DIDACTICIEL`) : une bulle de texte dit quoi faire et ce qu'il faut toucher porte un
  anneau doré (dans la page) ou un cercle doré qui pulse (sur la carte,
  `js/carte/ferme/didacticiel.js`, modèle `surbrillance`) ; les compteurs, sous le cadran, disent
  ce qu'il reste à réunir. Ses étapes : les jauges (santé, endurance, bonheur, XP, autonomie,
  argent), le déplacement, le ramassage (3 pierres, puis 3 bois), l'Atelier (menu latéral, 🔨
  Construire, la case de l'Atelier, une case de la carte), l'Atelier touché sur la carte, la faux,
  les fibres, la hache et la pioche, l'abri (bois et fibres, puis les murs en bois, la porte et une
  paillasse par membre de la famille, puis la pièce close et ses paillasses), la houe, les graines
  offertes (l'Inventaire), le labour, le semis, le puits et la cruche, l'arrosage. Pendant le
  didacticiel, l'Atelier ne montre que les recettes qu'il a débloquées, le menu Construire que les
  blocs utiles ; « Passer le didacticiel » débloque tout (les graines sont offertes quand même).
- **La cruche à eau** (`js/engine/cruche.js`, `DATA.CRUCHE`) : un objet de l'Atelier (3 bois).
  Un appui sur le puits posé la remplit (10 L) ; une plante arrosée y puise son eau quand la
  citerne n'en a pas assez.
- **L'Encyclopédie dans le jeu** (`js/engine/encyclopedie.js`, `js/engine/decouverte.js`,
  `js/ui/encyclopedie.js`) : 📖 dans le menu latéral ouvre un livre, comme le Livre de recette
  (`livre()` de `js/ui/livre.js`) : le sommaire (pages découvertes par catégorie, nouvelles
  pages), une page par catégorie (« ? ? ? » pour ce qui reste à découvrir), une page par entrée
  découverte avec ses liens « Voir aussi ». Les entrées sont celles de
  `encyclopedie_ferme_familiale.json` (`scripts/build-encyclopedie.mjs` en écrit
  `js/encyclopedie.generated.js`) ; chacune dit quand elle se découvre (`decouverte` : un objet
  obtenu, un outil, une culture, une recette lisible, une étape du didacticiel, une carte
  visitée…). Une découverte s'annonce par un message et reste « Nouveau » jusqu'à sa lecture
  (`state.encyclopedie`) ; ce qu'une partie connaît déjà à son premier passage n'est pas nouveau.

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
    La porte se pose sur un mur (à sa place) ou directement sur une case libre : reprise, elle
    laisse la case vide.
  - Un buisson coupé rend ses cases (le terrain, `BUISSONS_CASES`) : on y bâtit comme sur
    l'herbe (`casesBuissonsCoupes`), et il ne repousse pas tant qu'une de ses cases est bâtie.
  - Un arbre abattu laisse sa graine (`HACHE.GRAINES`) : un sapin, une pomme de pin, un autre
    arbre, un gland (au sol avec le bois de sa chute ; `assets/ramassables.png`, 6ᵉ et 7ᵉ images ;
    son espèce, lue dans ses tuiles : `especeArbre`). Il ne repousse plus de lui-même
    (`state.outils.arbres[id] = { espece }`). Une graine se plante sur n'importe quelle case
    d'herbe libre, dehors, loin des autres arbres plantés (mode Construire, les blocs
    `pomme_de_pin` et `gland`, `semis` ; `planterGraine`, `state.foret.arbres`) : jeune pousse
    pendant `HACHE.POUSSE` jours (modèle `pousses`, 8ᵉ et 9ᵉ images), puis un arbre de la
    planche (le sapin, l'arbre clair : modèle `foret`, `js/carte/ferme/foret.js`) qui ferme sa
    case, s'efface quand on passe derrière, porte une ombre et se coupe comme les autres.
  - Le foyer (où le personnage rentre le soir et réapparaît le matin) : la pièce où l'on dort,
    sinon une pièce du genre maison ; jamais une enceinte vide ni un bâtiment.
  - Deux fenêtres côte à côte (sur une même rangée, leurs faces visibles) forment une grande
    fenêtre : le verre, l'appui et le linteau passent de l'une à l'autre, un montant de bois
    entre elles (`BLOCS_CARTE.hauts.joints` ; images 49, 65, 81 + masque).
  - **La paroi vitrée** (2 pierres, 1 lingot de fer) est un mur de verre : elle se pose comme un
    mur (elle ferme une pièce) ou à la place d'un mur, comme une fenêtre. Le dessus est en
    métal ; la face est en verre teinté, avec des montants, une traverse tous les 13 px et des
    reflets en biais. Des parois voisines forment une façade continue (images 97 à 160).
  - **Les murs aux matières de la ville** reprennent les façades des immeubles de l'ancienne
    ville (leurs matières, reprises dans `scripts/carte/briques.py`) : briques rouges, orange, ocre ou bleues
    (3 pierres et 1 bois), pierre de taille (5 pierres). Le dessus est de la même matière, un
    peu plus clair ; la face a une corniche en haut et un soubassement gris en bas. Ce sont des
    murs (`mur: true`) : ils ferment une pièce, se raccordent à tous les autres murs, en changent
    un sans qu'on l'enlève et se posent à l'étage. Images de `murs_hauts.png` : 161, 177, 193,
    209, 225 + masque (`MATIERES_VILLE`, `scripts/carte/blocs.py`).
  - **Le mur en bois** (2 bois) : des planches couchées sur la face, une lisse claire en haut,
    une sablière sombre au pied, des planches au soleil sur le dessus. C'est un mur comme les
    autres (`mur: true`) ; images de `murs_hauts.png` : 371 + masque (`mur_bois`,
    `scripts/carte/blocs.py`).
  - Les murs et la porte d'un mur horizontal sont une case plus hauts que les autres blocs
    (`assets/murs_hauts.png`, 16 × 40 px). Un mur qui cache
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
- **Les modèles de portes et de sols** : en plus de la porte de planches et du plancher,
  l'Atelier fabrique 7 portes (chêne, vitrée, de grange, bleue, en fer, d'écurie, blanche) et 7
  sols (dalles de pierre, carrelage en damier, tomettes, parquet à chevrons, marbre, pavés,
  mosaïque). Chacun est un bloc, un objet et une recette à lui (`porte_*`, `sol_*`).
  - Une porte se pose comme la porte de planches et ferme la pièce de même ; posée sur une autre
    porte, elle prend sa place (`changeMur`), l'ancienne revient dans l'inventaire.
  - Un sol se pose comme le plancher ; posé sur un autre sol (pas le chemin), il prend sa place
    (`changeSol`). Chaque sol ne se raccorde qu'aux voisins de même sorte.
  - Leurs images : `scripts/carte/blocs.py` (`MODELES_PORTES`, `MODELES_SOLS`). Chaque porte a
    son battant dans les 7 matières de mur (`murs_hauts.png`, `BLOCS_CARTE.hauts.modelesPortes`
    et `matieresPortes` : le mur voisin continue au-dessus d'elle) et son image ouverte dans un
    mur vertical (`blocs.png`, `portesVerticales`) ; chaque sol, ses 16 images raccordées
    (`blocs.png`, `modelesSols`). Leurs icônes : `scripts/icones/art_blocs.py`.
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
- **La lanterne scintillante** (à l'Atelier : 1 champignon lumineux et 2 bois) éclaire la nuit.
  - **Le champignon se cueille à la main** (champ `cueillette` de `data/items.json`,
    `FermeHote.ramasser`) : il luit au sol de la grotte de la mine (`tapChampignon`,
    `js/grotte.js`) ; un champignon cueilli s'éteint et ne repousse que le lendemain. (Le
    morceau d'arbre de l'infra-monde, `bois_infra`, est retiré avec l'infra-monde.)
  - **Où la poser** : dehors, dans la maison ou dans une enceinte vide, mais pas dans un
    bâtiment (comme la batterie). Elle arrête le passage.
  - **Le jour**, elle est éteinte.
  - **Quand la nuit tombe**, ses deux images alternent au hasard pour la faire scintiller.
    Elle pose aussi sa lumière dans le voile de l'heure : une flaque cyan sur l'herbe et sa vitre,
    qui vacillent un peu, plus un petit halo (`stepLanterns`, `BLOCS_CARTE.lanterne`).
- **La ruche** (au Marché, rayon Animaux : 200 pièces ; `DATA.RUCHE`, `js/engine/ruches.js`)
  arrive dans l'inventaire et se pose dehors, sur l'herbe, comme un bloc. Elle arrête le passage.
  - **Elle se remplit la nuit** (`remplirRuches`) : au bout de `RUCHE.NUITS` nuits (2), elle est
    pleine. Son image change (`BLOCS_CARTE.frames.ruche_pleine`) : le miel luit entre ses deux
    hausses et perle au trou de vol.
  - **Pleine, elle attend qu'on la récolte** : une bulle « 🍯 3 » au-dessus d'elle, comme un tas
    à ramasser (`ruchesARecolter`, l'identifiant `ruche:<case>`). Un appui sur la bulle envoie
    le personnage ; il prend `RUCHE.MIEL` pots de miel (3), et elle repart à vide. Le miel ne
    rentre pas tout seul la nuit (`pickUpAll` ne la vide pas). Reprise pleine, son miel vient
    avec elle.
  - **Ses abeilles** (`js/carte/ferme/abeilles.js`, `ABEILLES`) : quatre par ruche, de quelques
    pixels. Le jour, elles volent vers les fleurs à portée (9 cases), y butinent, rentrent. Les
    fleurs : celles de l'herbe (`terrain.FLEURS`, posées par le générateur), sauf sous un bloc,
    un sol ou un labour ; l'herbe haute fleurie encore debout ; et tout bloc `fleurs` de
    `DATA.ATELIER.BLOCS` (le bac à fleurs : `fleursPourAbeilles` ; ses fleurs dépassent au-dessus
    de la jardinière, les abeilles y butinent `ABEILLES.bac` px au-dessus du pied de sa case).
- **Le bac à fleurs** (au Marché, rayon Meubles : 60 pièces ; `DATA.DEHORS`, `buyDehors` dans
  `js/engine/meubles.js`) arrive dans l'inventaire et se pose sur l'herbe, dehors ou dans la
  maison, comme un bloc (`ATELIER.BLOCS.bac_fleurs`, `fleurs: true`). Il arrête le passage. Une
  jardinière de planches, des fleurs de cinq couleurs (`BLOCS_CARTE.frames.bac_fleurs`).
- **Une pièce close** : des cases entourées de murs, de portes ou de l'Atelier, avec au moins une
  porte. Elle fait au plus 400 cases (`PIECE_MAX`, 20 × 20 dedans) et ne touche pas le bord de la carte. Les coins ne comptent
  pas : on ne passe pas en diagonale.
- **Une maison ou un bâtiment, pas les deux** (`genreBloc`, `genrePiece`, `js/engine/blocs.js`) :
  le premier lit ou bloc clé posé dans une enceinte décide de ce qu'elle est.
  - **La maison** : la paillasse, le four, la cuisinière (et la batterie, sans genre). On n'y
    pose aucun bloc clé de bâtiment.
  - **Un bâtiment** : le nichoir (le Poulailler), la mangeoire (l'Étable), le bac à semis (la
    Serre), la meule (le Moulin). Il ne prend que son bloc clé, et un plancher au sol ; il se
    bâtit dans une enceinte vide. (Le Silo, lui, se bâtit dehors en blocs de silo : 5b-6.)
  - Un mur ou une porte entre deux enceintes de genres différents ne se reprend pas : les deux
    n'en feraient plus qu'une.
  - Une partie d'avant cette règle (migration v38, `rangerPieces`) : dans une enceinte qui mêle
    deux genres, le premier trouvé (dans l'ordre des cases) reste ; les autres blocs retournent
    dans l'inventaire.
- **Construire** se fait sur la carte (`js/ui/chantier.js`, `js/carte/ferme/chantier.js`) :
  - une case 🔨 apparaît dans la barre d'outils dès que l'Atelier est construit ;
  - un menu s'ouvre en haut de l'écran, dans le bois de la barre d'outils (même cadre, mêmes
    cases) ; le HUD du haut (personnage, jauges, heure) s'efface tant qu'il est ouvert
    (`body.construction`). Seuls les blocs **débloqués** s'y montrent (`blocDebloque` : en main,
    posés, ou que l'Atelier sait fabriquer à ce niveau), rangés en **onglets** intercalaires
    (`ATELIER.CATEGORIES` : Bâtir, Maison, Meubles, Élevage, Énergie, Machines ; l'onglet ouvert
    avec son nom, les autres avec leur icône seule ; un onglet vide ne se montre pas). Sous eux,
    une ligne de cases qui défile (l'icône du bloc, ce qui en reste ; le bloc choisi encadré, un
    bloc épuisé pâli), et au bout le niveau de construction, ✕ et les paillasses où l'on peut
    dormir. Tous les murs tiennent dans **une case** (le dernier mur choisi, « ⋯ ») qui ouvre la
    **bulle des murs** : chacun avec son icône (`scripts/icones/art_blocs.py`, un carré de sa
    face) et ce qui en reste, sans texte. De même, les portes et les sols ont chacun leur case
    et leur bulle (`GROUPES` de `js/ui/chantier.js` ; la flèche de la bulle montre sa case) ;
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
  - l'escalier repris, l'étage s'en va : ses blocs reviennent dans l'inventaire
    (`rangerEtage`) ; au coucher, on redescend ;
  - un mur ou une porte du bas qui porte l'étage (retiré, la pièce de l'escalier s'ouvrirait et
    des blocs de l'étage tomberaient) ne se reprend pas, et un mur qui couperait cette pièce ne
    se pose pas (`etageEnPeril`, `etageHorsEmprise`) : on reprend d'abord ces blocs de l'étage.
    Une fenêtre ou une porte change un mur sans l'enlever : l'étage n'y perd rien.
- **L'eau vivante** (`js/carte/eau.js`, CarteKit.eauVive, réglages CarteKit.EAU ; à la ferme,
  `js/carte/ferme/eau.js` ; au grand monde, la mer, les lacs et les rivières par blocs : `js/carte/ferme/eau-monde.js`, fiche 5a) : l'eau de chaque étendue est peinte par un shader, inspiré du
  « 2D Pixel Art Water » de niwho (godotshaders.com, CC0) : de légers traits ondulés au large
  (là où deux bruits qui glissent en sens contraires se croisent), plus sombre au large, de fins
  reflets de lumière au fond près des rives, le ciel de l'heure, une ligne d'écume qui avance et
  recule le long de la rive, arrondie dans les angles (une distance à la terre euclidienne,
  lissée) et coupée par endroits ; elle
  ondule (deux vaguelettes qui glissent, dans une texture que lit le shader ; la terre des rives, reposée telle
  quelle par-dessus, ne bouge pas : seuls l'eau et son liseré blanc ondulent) ; le jour, des
  scintillements naissent et s'éteignent sur l'eau, loin des rives, plus nombreux et dorés quand le soleil
  est bas ; la nuit, la lune s'y reflète (une colonne de traits brisés qui tremblent) et les
  lumières posées au bord aussi. Ce qui se tient au bord (arbres, bâtiments, personnages,
  bêtes) se reflète dans l'eau, retourné sous son pied, teinté, et ondule avec elle ; des ronds
  s'élargissent sur l'eau au bouchon de la pêche, quand un poisson saute (de temps en temps),
  quand quelqu'un longe la rive, et au hasard (des insectes). Seulement en WebGL, et pas avec
  « moins d'animations ». La mer a son propre shader (EAU_MER) : la houle, des crêtes
  parallèles au rivage qui roulent vers lui, des vagues qui se brisent au bord, et le ressac,
  qui monte sur le sable et redescend en laissant le sable mouillé ; elle ne renvoie pas de
  reflet net (seulement les ronds et les scintillements).
- **La lumière des maisons, la nuit** (`js/carte/ferme/fenetres.js`) : les pièces de la
  maison (les toits marqués `maison`) s'allument quand la nuit tombe : une lueur chaude sur leur
  plancher (ce qu'on en voit : pas sur le dessus ni la face des murs devant) et sur la face du
  mur du fond, unie, (vues quand le toit s'efface), leurs vitres
  éclairées (un peu transparentes : on voit l'intérieur au travers), et des rayons qui partent
  du bas des vitres de la façade, passent sur le bas du mur et tombent sur le sol devant elle
  (pas sur ce qui est devant : un mur, un toit les arrête). Elles s'éteignent quand tout le
  foyer dort (le personnage, couché, et chacun de sa famille).
- **Les toits** (`toits` dans `js/engine/etage.js`, `js/carte/ferme/toits.js`) : chaque
  bâtiment (une pièce close aménagée : un bloc qui en fait une maison ou un bâtiment, un
  plancher ou un escalier) reçoit tout seul un toit de tuiles, posé sur son dernier niveau ; une
  pièce close sans rien de tout ça (une cour, un passage enfermé entre les murs de bâtiments
  voisins) reste à ciel ouvert :
  - sur ses murs, s'il n'a pas d'escalier ; sur les murs de son étage, au-dessus de ce qu'ils
    ferment, s'il en a un (un étage sans murs tout autour reste une terrasse, sans toit) ;
  - il couvre le bâtiment, murs compris : un toit à croupes vu de 3/4, dessiné comme ceux des
    immeubles de l'ancienne ville (`CarteKit.toit`, `js/carte/toit.js`, couleurs dans `CarteKit.TOIT`).
    Le pan de devant est grand (les trois quarts de la profondeur), celui de derrière est vu en
    raccourci et plus clair. Les croupes forment des triangles aux deux bouts (la gauche dans la
    lumière, la droite à l'ombre). Les rangs de tuiles font 8 px, avec un faîtage de tuiles
    rondes. Le toit déborde un peu sur les côtés ; sous le pan de devant, il a un égout, une
    planche de rive et une ombre portée sur le haut de la façade ;
  - il s'efface quand le personnage entre dans le bâtiment (en bas ou à l'étage) et en mode
    Construire, et à moitié quand le personnage passe derrière (`stepToits`).

## Les autres cartes, retirées

La carte de transition tirée pour chaque partie (les maisons des voisins, leurs familles, leurs
métiers et leur économie, le livreur et ses caisses de collecte, les ressources du jour), les
immeubles et les maisons en blocs de la ville, ses lieux (boutiques, services, fabriques), ses
habitants et l'horaire de l'école (le bus, `CarteKit.ECOLE`, `horaireEcole`) ont été retirés du
jeu avec la ville (étape 1 de docs/grand-monde.md). Leur code et la description qu'en donnait ce
document sont sur la branche `archive/jeu-avant-grand-monde` (commit `11a471e`) ; le modèle des
familles autonomes des voisins (foyers, métiers, argent, repas, bonheur, maisons par étapes) en
sera repris pour les habitants des hameaux du grand monde (étape 7). Une partie enregistrée
perd ces données à la migration 50 → 51 (`ville`, `voisins`, `immeuble`, `economie`,
`transitionPris`) ; les enfants de la ferme ne vont plus à l'école.

## Les anciennes parties

Une partie de la carte de Tiled peut déménager sur une ferme générée, sans rien perdre
(`convertirPartie(state, graine)`, `js/engine/demenagement.js`). Ce qui change :

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
  | le Silo | des colonnes de blocs de silo, dehors, de quoi garder le blé de son niveau |
  | le Moulin | une petite enceinte avec la meule, ses murs hauts de 3 blocs |
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
- **Le déménagement au chargement** : la ferme du grand-père n'existe plus. Une ancienne
  sauvegarde encore sur la carte de Tiled (écran de départ passé) déménage en migrant (version 46
  → 47, `js/engine/state.js`), sur la terre de sa graine (`graineDemenagement`, tirée de la
  partie), sans fenêtre ni choix ; elle le dit (`state.demenagee`) : la page garde la sauvegarde
  d'avant sur l'appareil (`ferme-save-avant-demenagement`) et l'annonce une fois
  (`js/ui/storage.js`, `demenagementAnnonce`). Une partie pas encore commencée reçoit simplement
  sa graine.
- **Une nouvelle partie** a sa graine dès sa création (`createInitialState` : `graineDemenagement`) ;
  le moteur ne joue plus que sur la ferme générée. La carte de Tiled (`DATA.TERRAIN`) ne sert plus
  qu'aux anciennes sauvegardes, avant leur déménagement.
- **Ce qui ne servait qu'à la ferme dessinée est retiré** : du jeu, la maison à réparer et les
  appareils à acheter, les bâtiments à réparer (Poulailler, Étable, Serre, Silo, Verger à
  emplacements), les intérieurs de la maison et de la Serre, le repas à table, les images des
  bâtiments dessinés ; du moteur, `repairHouse`, `buyStarter`, `buildPoulailler`, `buildPaturage`,
  `buildSilo` et `upgradeSilo`, `buildSerre`, `buildVerger`, `plantTree` et les emplacements du
  Verger, le repas pris dans l'inventaire.
- **Les tests du moteur** jouent sur la ferme générée (la graine '1' de `createInitialState(1)`).
  Leurs bâtiments se bâtissent en vrais blocs, d'un coup (`testBatir`, js/engine/testmode.js :
  le foyer, la boîte à nourriture, le four, la cuisinière, le Poulailler, l'Étable, la Serre, le
  Moulin, le Silo, les appareils, les jeunes arbres), et la famille mange à la boîte
  (`boite`, `versBoite`, tests/engine/aide.mjs). Les tests des anciennes migrations s'arrêtent à
  la version 46 (`migreAvant`) ; le déménagement a les siens, sur de vraies sauvegardes d'avant
  (tests/engine/anciennes-parties.json).
- **Le joueur automatique** (js/engine/bot.js) bâtit lui aussi d'un coup (`testBatir`) et paie le
  prix qu'avait chaque bâtiment à la place des matériaux ; avant la pompe, il arrose à la cruche
  (le puits posé d'un coup) ; la famille mange à la boîte à nourriture, qu'il remplit le soir.

## Étapes

1. ✅ Le terrain ne dépend plus de la carte. Le moteur passe par `farmTerrain(state)`
   (`js/engine/terrain.js`). La scène lit la taille de la carte et la sortie
   `vers_la_transition`.
2. ✅ Le générateur à partir de la graine (`js/engine/ferme-generee.js`). Le mode test change
   de ferme (« Changer de ferme », une graine au choix ou au hasard). Voir « La ferme générée »
   plus haut.
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
         - une ancienne partie qui déménage retrouve ses meubles achetés dans l'inventaire ;
         - 23 meubles de plus, dessinés en vue de haut à 45° comme les blocs
           (`scripts/batiments/meubles45.py`) : un buffet vaisselier, une commode, trois armoires
           (de chêne, peinte, à glace), trois bas de cuisine au gabarit de la cuisinière (jusqu'à 4
           de chaque), une poubelle, deux bibliothèques, un lampadaire, un coffre à jouets et dix
           plantes vertes ; le buffet, la commode, les armoires de chêne et peinte, la
           bibliothèque vitrée, le coffre à jouets et le bonsaï prennent 2 cases.
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
       - **Le rythme** : le début de partie est manuel (cultiver, construire, arroser à la
         cruche). Le Marché ouvre au niveau 3 (`marche`, `marcheOuvert`) et une nouvelle partie
         commence avec 300 pièces (`DEPART.PIECES_SAUVAGE`). Le panneau, la pompe, la citerne
         et la batterie (recettes et blocs) arrivent au niveau 7 (`energie`) : ils ouvrent
         l'automatisation. Le chapitre 1 ne les demande plus (`sauvage: false`).
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
           l'enceinte ; au plus `ENCLOS_MAX` cases, 1 200 ; avant, la limite des pièces, 120),
           reliée à l'enceinte par une autre porte, devant laquelle une case reste libre ;
         - une case libre par poule, dans l'enceinte (hors nichoir) et dans l'enclos (un plancher
           laisse la case libre ; un bloc ou un arbre la prend).
       - Il manque quelque chose : le Poulailler n'est plus là (pas d'achat de poules, pas de
         ponte), mais il garde son niveau et ses poules. Sa fenêtre liste ce qui manque ; sans
         enclos, elle dit pourquoi (`pourquoi` : une porte qui donne sur une barrière, pas de
         deuxième porte, un enclos ouvert sur le dehors ou trop grand).
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
         une pièce close, il ouvre la Serre au niveau 1, sans parcelle (`openSerre`) ;
         repris, la Serre n'est plus construite, et ce qui y pousse attend qu'il revienne. On
         ne la répare plus en pièces sur la ferme générée (`buildSerre` refuse).
       - Pas d'intérieur : un appui sur le bac ouvre la fenêtre de la Serre, où ses parcelles
         se travaillent.
       - **Sur la carte** : le joueur laboure lui-même les cases libres de sa pièce avec la
         houe (`serrePlaces` : ni le bac, ni les cases juste derrière ses portes, le passage ;
         `hoe`, `serreHoeStatus` dans `js/engine/crops.js`), une parcelle par case (`case`),
         jusqu'à `SERRE.PARCELLES[niveau - 1]` (`serreCap` ; agrandir la Serre en permet plus) ;
         une terre vide se rebouche. Comme au-dehors : la même terre et les mêmes bordures
         mi-herbe mi-terre (`syncZoneGround`, `soilLayoutOk`), le glissement de la houe ; ce qui y
         pousse se voit, et un appui y plante, arrose ou récolte comme au potager. Version 50 :
         les parcelles d'avant prennent les cases où la carte les montrait.
         La pièce a un **toit de verre** (`toits` : `verre`, `CarteKit.toit(…, true)`) : des
         vitres entre des montants de bois, on voit les cultures au travers.
       - **Ses murs sont en verre** : quels que soient les blocs posés, les murs et la porte de
         son enceinte (`serreMurs`) se dessinent en vitres claires dans des arêtes de bois
         (`murs_hauts.png` 306 à 369, `verre_serre` ; la porte vitrée : 370, `porte_serre`).
       - Comme partout, un bloc clé ne se pose qu'à partir du niveau où son bâtiment se débloque
         (`isUnlocked` : la Serre au niveau 7).
     - ✅ **5b-6, le silo** : le Silo quitte la cour ; il se bâtit dehors, en **blocs de silo**
       (`etatSilo`, `js/engine/blocs.js` ; `ATELIER.SILO` dans `data/recipes.json`).
       - Le **bloc de silo** (3 planches, 1 pierre) se fabrique à l'Atelier (onglet Matériaux)
         une fois le Silo débloqué (sa recette a `debloque: "silo"`, `recetteDebloquee`). Il se
         pose dehors, sur l'herbe ; un bloc posé sur une colonne la rehausse (jusqu'à
         `HAUTEUR_MAX` = 6, `state.hauteurs`, comme les murs). Un seul silo : un nouveau bloc au
         sol va juste à côté des colonnes déjà posées, sur la même rangée ; la colonne du milieu
         ne se reprend pas (le silo serait coupé en deux).
       - Au moins **2 colonnes hautes de 3 blocs** : leurs blocs « deviennent » un silo en bois
         (`js/carte/ferme/silo.js` : des douelles cerclées de fer, un toit en dôme, une trappe ;
         l'image est dessinée par la scène, pas de planche). Une colonne plus basse, à côté, reste
         une pile de caisses : elle est en construction et ne compte pas encore.
       - **10 blés par bloc** des colonnes pleines (`siloCapacity`) ; plus de niveaux payants
         (`upgradeSilo` refuse). Le Silo formé range le blé de l'inventaire (`fillSilo`, `majSilo`) ;
         plus petit, le blé qui ne tient plus revient dans l'inventaire ; défait, il n'est plus
         construit (son blé reste compté). On ne le répare plus sur la ferme générée (`buildSilo`
         refuse).
       - Un appui sur le silo (ou ses caisses) ouvre sa fenêtre (ce qu'il faut pour le bâtir, ou
         ce qu'il garde) ; un **appui long**, le mode Construire avec un bloc de silo en main
         (`silo-agrandir`) : toucher une colonne la rehausse, une case à côté l'élargit.
       - Le coffre à grain d'avant (une pièce close et ce bloc) n'existe plus : migration v45,
         remboursé (6 planches, 2 fibres) qu'il soit posé ou dans l'inventaire.
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
