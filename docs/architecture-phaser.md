# La carte de la ferme (Phaser 3) : architecture

Périmètre : la zone entre le bandeau « Ferme Familiale » (titre + indicateurs) et le menu
du bas, sur l'onglet **Ferme**. Tout le reste du jeu (onglets, fenêtres, moteur) reste en DOM.

> **Piège à ne pas refaire :** aucune variable globale de la page ne doit s'appeler `screen`
> (ni `name`, `status`, `top`, `event`…). `screen` masque `window.screen`, dont Phaser a besoin
> au démarrage (erreur « reading 'orientation' »). Le jeu utilise `ecranFerme`.

## 1. Découpage

```
jeu.html                  la page : structure seule, charge les fichiers ci-dessous dans cet ordre
 ├─ js/telemetry.js       suivi de session (script classique)
 ├─ vendor/phaser.min.js  Phaser 3.90 (≈ 1 Mo)
 ├─ js/ambient-life.js    la vie d'ambiance, facultative : vent, bêtes de passage, le chat, les bêtes de l'Étable et du Poulailler (voir docs/vie-ambiance.md)
 ├─ js/farm-stage.js      la scène : ne connaît ni `state` ni le moteur (script classique)
 └─ js/main.js            point d'entrée des modules ES
     ├─ js/engine/        moteur pur (aucun DOM, aucun Phaser)      ← node run-tests.mjs
     └─ js/ui/            interface ; la carte : stage.js (« Carte Phaser ») et stage-windows.js (« Fenêtres de la carte »)
tests/engine.test.js      tests du moteur (jamais chargés par la page)
assets/                   cartes Tiled (carte_printemps.json et serre_interieur.json, et leurs sources .tmj) + images du pack
```

Flux de données, à sens unique dans chaque direction :

```
state ──stageModel()──▶ modèle de vue ──FarmStage.update()──▶ scène.sync()      (affichage)
state ◀── clic DOM ◀── stageAct(action, données) ◀── scène : appui sur la carte  (actions)
```

- **Modèle de vue** (`stageModel()`), le seul objet que la scène reçoit :
  `{ heure, cols, plots: [{ id, culture, icone, phase (-1, 0…3), mature, arrosee }],
  cols2, plots2 (le Champ, même forme que plots), arbres: [{ id, jeune }],
  serre (parcelles de la Serre, même forme), interieur (null ou 'serre'),
  batiments: { etable, poulailler, moulin, serre, verger, zone, zone2, silo },
  animaux: { vache, mouton, poule } (nombre de bêtes de l'Étable et du Poulailler) }`.
- **`sync(modèle)` est idempotent** : `render()` appelle `renderStage()` environ 5 fois par
  seconde ; un modèle identique est écarté avant la scène (comparaison de la clé JSON), un modèle
  différent crée, met à jour ou détruit exactement ce qui a changé.
- **Pont d'actions** `stageAct(action, données)` : crée un bouton masqué portant
  `data-action` et `data-*`, le clique, le retire. L'unique écouteur de clics de la page fait le
  reste : une seule logique d'action, mêmes fenêtres, même suivi de session (aucune donnée
  nouvelle : seulement de nouveaux noms d'action, `stage-open`, `stage-close`, `maison-tab`).

Pour ajouter un élément à la carte : un champ dans `stageModel()`, un bloc dans `sync()`,
une action existante dans `tap()`. Jamais d'appel au moteur depuis `farm-stage.js`.

## 2. La carte : 72×57 tuiles, trois repères

`assets/carte_printemps.json` est la carte Tiled du propriétaire : 72×57 tuiles de 16 px
(1152×912 px), treize couches de tuiles et une couche d'objets `batiment`. Elle est fabriquée
depuis la carte de travail `assets/carte_printemps_elargie.tmj` (voir « Mettre la carte à
jour »). Depuis la version 1.6, le jeu n'a plus de saisons : la carte et les images des
bâtiments sont celles du printemps (suffixe `_sp` des fichiers du pack, constante `SFX`).

- **Sol cuit en une image.** Au démarrage, `bakeGround()` lit le JSON brut
  (`cache.tilemap.get(clé).data`) et dessine toutes les couches de tuiles dans un seul canvas
  (texture `ground`, profondeur 0). Pas de `TilemapLayer` : avec un zoom non entier, des tuiles
  rendues une à une laissent de fins liserés. Case 0 = vide ; les bits de retournement de Tiled
  sont gérés.
- **Tuiles animées** (l'eau des étangs). Les animations sont celles de Tiled : elles sont
  dans le jeu de tuiles (`farm_spring_summer.tsx`, 4 images de 400 ms par tuile) et
  `build-map.mjs` les recopie dans le JSON. Le fond reste une image fixe, où une tuile animée
  est dessinée avec sa première image. Par-dessus, `makeTileAnims()` pose une petite image
  par case animée, et repose au-dessus les tuiles des couches plus hautes de la même case
  (un roseau reste devant l'eau) : 85 images pour 64 cases animées. `stepTileAnims()` change
  leur tuile quand la durée est écoulée ; toutes les tuiles d'un même numéro changent
  ensemble, comme dans Tiled. Avec « réduire les animations », ces images sont masquées.
- **Tuiles d'une autre planche.** La carte peut citer d'autres jeux de tuiles
  (`leaves_wind`). Tant que leur image n'est pas dans `assets/`, leurs tuiles ne sont pas
  dessinées, et `build-map.mjs` le signale.
- **Objets lus dans la carte** (rectangles nommés de la couche d'objets). Le bas-centre de
  l'image se pose sur le bas-centre du rectangle, sans sortir de la carte ; profondeur = y du
  pied. Déplacer un rectangle dans Tiled suffit, sans toucher au code.

  | Objet | Image | Affiché si | Fenêtre |
  |---|---|---|---|
  | `maison` | `house_*` | toujours | Maison |
  | `grange` | `barn_*` (l'étable) | Pâturage débloqué, ou des moutons ou des vaches | Étable |
  | `poulailler` | `poulailler.png` (3 images de 44×55 : porte fermée, entrouverte, ouverte) | Poulailler débloqué | Poulailler |
  | `moulin` | `windmill_*` (4 images de 96×128, animé) | un atelier débloqué | Moulin et ateliers |
  | `serre` | `serre_*`, découpe « batiment » (verrière seule, 94×83) | Serre débloquée | Serre |
  | `verger` | `sign.png` (pancarte) | Verger débloqué | Verger |
  | `silo` | `silo.png` (28×62, dessiné par `scripts/batiments/silo.py`) | Silo débloqué ou construit | Silo |
  | `zone_culture_1` (ou `zone_culture`) | parcelles | toujours | Zone de culture |
  | `zone_culture_2` | parcelles (8 colonnes) | Moulin débloqué | Champ |
  | `arbre_verger_1` à `arbre_verger_12` | `basic_*` (première des 8 images de 80×80, fixe) | un arbre par arbre du Verger, dans l'ordre d'achat | Verger |

  Un arbre pas encore adulte est dessiné à 60 % de sa taille. La carte porte aussi `silo` : ce
  rectangle est lu mais le jeu ne s'en sert pas encore.

  Un bâtiment verrouillé n'est pas dessiné (l'herbe reste). `SERRE_FRAME = 'cour'` dans
  `farm-stage.js` affiche à la place la verrière avec sa cour pavée (177×144), nettement plus
  grande que le rectangle de la carte.
- **Parcelles.** Le coin haut-gauche de `zone_culture_1` est calé sur la grille de 16 px
  (464,384) ; les parcelles sont des tuiles jointives, 5 colonnes au plus :
  6/12/18/24/30 parcelles = 2×3, 3×4, 3×6, 4×6, 5×6 (`stageCols()`). Terre sèche ou arrosée,
  plante à 4 phases découpées dans `crops.png` (champ `sprite` de chaque culture dans `data/crops.json`, que la page
  passe à `FarmStage.mount()` : `crops`), balancement quand elle est mûre.
- **Images manquantes** : formes de secours (`makePlaceholders()`), la carte reste utilisable.
  Sans le JSON de la carte : fond uni et rectangles par défaut (`DEFAULT_OBJECTS`).

### Mettre la carte à jour

1. Dans Tiled, enregistrer la carte sous `assets/carte_printemps_elargie.tmj` : planche
   principale `farm_spring_summer` (image `farm_spring_summer.png`, 16×16, sans marge) ;
   couches de tuiles au format CSV (pas de compression) ; carte non infinie. Copier aussi dans
   `assets/` les jeux de tuiles que la carte cite (`.tsx`) : c'est là que sont les animations
   de tuiles, pas dans la carte. Seul le nom de fichier de leur image compte, l'image elle-même
   est cherchée dans `assets/`.
2. Les noms des couches de tuiles sont libres, elles sont empilées dans l'ordre. Les
   rectangles doivent garder leurs noms : `maison`, `grange`, `zone_culture_1`, `moulin`,
   `serre`, `verger`.
3. `node scripts/build-map.mjs` écrit `assets/carte_printemps.json` (et, de la même façon,
   `assets/serre_interieur.json` depuis `assets/serre_interieur.tmj`) : les jeux de tuiles y sont
   intégrés avec leurs animations (`bakeGround()` ne lit pas les `.tsx`). Le script refuse
   d'écrire, en disant pourquoi, si un rectangle manque, si un `.tsx` manque, si une tuile
   n'appartient à aucune planche ou si une couche est compressée ; il prévient si l'image
   d'une planche secondaire manque.

La taille de la carte est libre : le jeu la lit dans le fichier. Si elle change, reporter ses
dimensions et ses rectangles dans `DEFAULT_W`, `DEFAULT_H` et `DEFAULT_OBJECTS`
(`farm-stage.js`), qui servent quand le fichier ne se charge pas.

## 3. Caméra, glissement, appuis

- **Zoom** = `max(hauteur zone / (VIEW_ROWS × 16 px), largeur zone / largeur carte)` : `VIEW_ROWS`
  rangées sont visibles en hauteur, quelle que soit la taille de la carte, et la zone est
  entièrement couverte, sans bande. `VIEW_ROWS` vaut 21 depuis la version 1.4 (19 auparavant,
  la hauteur de la première carte) : le bandeau est deux fois moins haut, et la place gagnée
  montre deux rangées de plus, à la même échelle. Sur un téléphone de 390 px de large, on voit
  environ 11 tuiles de large ; sur un ordinateur, une quarantaine. La carte étant plus grande
  que la vue dans les deux sens, elle glisse aussi de haut en bas.
- **Trois repères** (`makeScreens()`), calculés depuis les rectangles de la carte : l'étable
  (`grange`), la maison avec la zone de culture, le moulin avec la serre. Ce sont les trois
  points du bas de la carte : un appui y fait glisser la vue, en largeur et en hauteur ; le
  point actif est le repère le plus proche. Départ centré sur le repère du milieu ; au
  redimensionnement, le centre courant est conservé. La vue ne sort jamais de la carte
  (`setCentre()` borne le centre). `panTo()` accepte un lieu (`'moulin'`, `'zone'`…) et y
  centre la vue dans les deux sens.
- **Densité de l'écran** : le canvas est rendu à `devicePixelRatio` (plafonné à 3) en mode
  `Scale.NONE` ; `resize()` (ResizeObserver sur la zone) tient la taille à jour. Le zoom n'étant
  pas entier, c'est ce qui garde des pixels réguliers. `roundPixels` est désactivé (des sommets
  arrondis un à un ouvriraient des fentes entre parcelles voisines).
- **Glissement libre** au doigt ou à la souris (deux axes, borné ; molette sur ordinateur), avec
  un élan léger au relâchement (coupé si « réduire les animations » est actif).
  `touch-action: none` sur la zone et toucher capturé par Phaser : la page ne défile pas, et
  aucun clic fantôme ne suit un appui.
- **Appui** = relâchement à moins de 8 px CSS du point de départ. La scène n'a aucun objet
  interactif Phaser : `hitAt()` teste d'abord les parcelles (exactement la tuile), puis le
  bâtiment le plus en avant (zone d'au moins 44 px CSS, pour la pancarte du verger).
  - parcelle vide → `plant-open` ; mûre → `harvest` ; en croissance et sèche → `water` ;
    déjà arrosée → fenêtre « Zone de culture » ;
  - bâtiment → `stage-open` avec sa fenêtre.

## 4. La zone et ses boutons (DOM)

`#farm-stage` est en `position: fixed`, de `--header-h` (hauteur du bandeau, mesurée à chaque
rendu) à `--dock` (menu du bas). Visible seulement sur la Ferme hors écran de détail
(`stageActive()`) ; ailleurs elle est masquée et la boucle Phaser dort (`loop.sleep()`).
Quand elle est visible, `<main>` est masqué (`body.has-stage`).

- **Boutons ronds** posés sur la carte, en haut à droite (DOM, 48 px) : 🌱 ouvre la fenêtre
  « Zone de culture », 📜 la fenêtre « Chapitres ».
- **Bouton « Zzz »** (`#sleep-fab`, `renderSleepBar()`) : rond, flottant en bas à droite de
  l'écran au-dessus du menu, sur **tous** les onglets ; il remplace la barre « Dormir ».
  Désactivé, il affiche les secondes restantes (« Zzz 27 s »). L'aperçu du repas est dans son
  `title` / `aria-label` ; une pastille rouge « 🍽️ x / y ⚠️ » n'apparaît à côté que si le repas
  prévu est insuffisant. La bulle d'aide « Dormir » pointe vers lui.

## 5. Fenêtres de la carte

Une variable, `stageWindow` (`null`, `'maison'`, `'etable'`, `'serre'`, `'moulin'`, `'verger'`,
`'zone'`, `'chapitres'`), et une table, `STAGE_WINDOWS` (titre, condition `ok`, contenu).
`renderStageWindow()` est appelé à chaque `render()` et fait un `morph()` dans `#window-root` :
le contenu est vivant et les boutons gardent le même élément d'un rendu à l'autre. Le contenu
est celui des fonctions de rendu existantes, sans réécriture :

| Fenêtre | Contenu |
|---|---|
| Maison | onglets (`maisonTab`) : Famille `renderFamille()`, Livre de recette `renderRecettes()`, Arbre des technologies `renderTechno()`, Installations (`batiments`) = `renderAteliers()` + `renderEnergieEau()` + `renderSilo()` + `renderCalendar()` |
| Étable | `renderPoulailler()` + `renderPaturage()` (ceux qui sont débloqués) |
| Serre / Moulin / Verger | `renderSerre()` / `renderAteliers()` / `renderVerger()` |
| Zone de culture | `renderPotager()` |
| Chapitres | `renderChapterBanner()` |

- Fermeture : bouton ✕, appui sur le fond, Échap, ou changement d'onglet.
- `#window-root` (z-index 90) est sous `#modal-root` (100) : une fenêtre classique ouverte depuis
  une fenêtre de la carte (choix de la graine, aide, réveil) passe au-dessus ; Échap ferme
  d'abord celle-là.
- Les cartes « Production / Stockage d'énergie » ouvrent leur écran de détail (`ecranFerme`) :
  la fenêtre se ferme le temps de l'écran et se rouvre au retour (`stageReturn`).

## 5 bis. L'intérieur de la Serre

Un appui sur la Serre, une fois construite, n'ouvre plus sa fenêtre : la vue entre dans la
serre. Ses parcelles s'y travaillent d'un appui, avec les mêmes gestes que dans les zones de
culture (vide → `plant-open` ; mûre → `harvest` ; sèche → `water` ; déjà arrosée → fenêtre).

- **Carte** : `assets/serre_interieur.tmj` (12×19 tuiles, même planche que la carte). Les
  rectangles des couches d'objets `serre_zone_1`, `serre_zone_2`… sont les bacs : calés sur la
  grille de 16 px, ils donnent 5×7 et 4×7 emplacements, soit 63. Ajouter un bac = une couche
  `serre_zone_3` avec un rectangle, puis `node scripts/build-map.mjs`.
- **Ordre des emplacements** : rangée par rangée à travers tous les bacs (la première rangée
  de chacun, puis la deuxième…). Avec la progression actuelle (6, 9, 12, 15, 18 parcelles),
  9 parcelles font une rangée complète et 18 en font deux. Les emplacements que le joueur n'a
  pas encore sont assombris : sans cela, rien ne distingue une parcelle vide de la terre du bac.
- **Scène** (`farm-stage.js`, `ROOMS`) : l'intérieur est cuit dans sa propre image, posée à
  droite de la carte, hors de portée de la vue. `setRoom()` y fait sauter la caméra (court
  fondu) ; `fit()` cadre l'intérieur sans sa marge unie, entre l'objectif du chapitre et les
  boutons. Dedans : pas de glissement, pas d'étiquettes, pas de vie d'ambiance. À la sortie,
  la vue revient devant la Serre.
- **Page** (`stage-windows.js`) : `stageInterior` (`null` ou `'serre'`), un état d'affichage,
  jamais enregistré. `stage-open` sur la Serre y fait entrer ; une fois dedans, la même action
  ouvre la fenêtre (bouton « Gérer » : agrandir, tout arroser, tout récolter). Sortie : bouton
  « Sortir » (`stage-exit`), Échap, changement d'onglet, ou une notification qui mène ailleurs.
  Une notification d'arrosage ou de récolte en Serre y fait entrer.
- **Sans l'intérieur** (carte de la serre absente, Serre pas encore construite) : la fenêtre de
  la Serre s'ouvre comme avant (`FarmStage.hasRoom('serre')`, `interiorAvailable()`).
- Moteur et sauvegardes inchangés : mêmes parcelles (`state.serre.parcelles`), mêmes prix.

## 6. Sans Phaser

`TAB_RENDERERS.ferme` affiche la liste classique (`renderFerme()`) seulement quand la carte
n'est pas utilisable (`stageUsable()`) : `vendor/phaser.min.js` ou `js/farm-stage.js` absent, jeu
ouvert depuis le disque (`file://` : le navigateur refuse de charger la carte), plantage au
montage, ou scène toujours pas prête 12 s après le montage (la carte revient d'elle-même si elle
finit par démarrer). Le jeu reste entièrement jouable dans ce cas.

## 7. Vérifier

```
node run-tests.mjs                      # moteur
python3 -m http.server 8771             # puis http://localhost:8771/jeu.html
```

Depuis la console : `FarmStage.scene()` (caméra : `.cameras.main`, centre : `.cx`, `.cy`),
`FF.stageModel()`, `FF.stageWindow`, `FF.state` (les modules n'ont plus de variables globales : `FF`
est la poignée de débogage posée par `js/main.js`).

## 8. Limites connues

- Saisons : retirées en version 1.6 ; les images d'automne et d'hiver du pack ne sont plus dans `assets/`.
- Sur un ordinateur, au repère du milieu, le pied du moulin dépasse d'une douzaine de pixels
  sous la vue. Il se voit en entier en glissant ou depuis le troisième point.
- L'étiquette « Verger » reste sur la pancarte, près de la maison : survoler un arbre l'affiche
  là-bas, pas au-dessus des arbres.
- Les bulles d'aide « eau » et « potager » ne désignent plus rien sur la carte (leurs cibles
  sont dans la fenêtre Maison › Installations et dans la fenêtre Zone de culture).

## Crédits

- Graphismes : pack "Farm – 4 Seasons 16x16 Tileset" par antarcticbees — <https://antarcticbees.itch.io/>
- Moteur d'affichage : Phaser 3 (licence MIT)

## Version 1.1 : ce qui a changé

- **Repères sur la carte** : trois points (gauche, milieu, droite) et des flèches de bord, en DOM par-dessus le canvas ; un appui sur un point déplace la caméra.
- **Étiquettes des bâtiments** : nom et pastille « à faire » au-dessus de chaque bâtiment et de la zone de culture. Le modèle de vue porte le libellé et le nombre ; la scène ne calcule rien.
- **Fenêtres** : deux tailles seulement (demi-écran, plein écran), ✕ toujours au même endroit, titre unique.
- **Règle de rangement** : ce qui est un lieu s'ouvre sur la carte ; ce qui est un stock ou un échange est dans la barre du bas. Les animaux s'achètent à l'Étable, les arbres au Verger ; le Marché garde Vendre, Acheter, Graines. Famille, Livre de recette et Arbre des technologies ne s'ouvrent plus que dans la Maison (les pages restent pour le repli sans Phaser).
- **Bandeau** : nuit et heure à côté du titre ; saison, eau et autonomie ouvrent leur fenêtre ; l'objectif du chapitre est affiché sous le bandeau.
- **Horloge** : 6 h au réveil, 1 h toutes les 5 s d'éveil (`DATA.TIME.CLOCK_SECONDS_PER_HOUR`, distinct de `SECONDS_PER_HOUR` qui règle l'usure). La carte reçoit l'heure dans le modèle de vue et pose un voile coloré : aube, plein jour, soir doré, crépuscule, nuit.
- **Moulin** : sa fenêtre moud le blé directement (`renderMoulin()`), 1 blé = 1 farine + 1 paille ; la mouture n'est plus dans le Livre de recette.
- **Élevage** : plus d'abattage ni de poids. Chaque nuit un mouton mange 1 paille, une vache 2 ; nourrie, la vache donne du lait, le mouton de la laine toutes les 2 nuits nourries. Le mot « pâturage » a disparu des textes (la clé interne `state.paturage` reste).
- **Famille** : prénom, femme ou homme, couleur de peau par membre (`setMemberProfile`). Le prénom reste dans la sauvegarde locale et n'est jamais envoyé au suivi.
- **Sauvegardes** : format 16.

## Version 1.1.1 : corrections

- **Animaux au Marché** : l'onglet Animaux revient dans le Marché (`COMPTOIR_TABS`) ; l'Étable n'a plus de lignes d'achat mais un raccourci vers cet onglet. Les arbres restent au Verger.
- **Achats par quantité** : chaque ligne d'achat (produits, graines, animaux) a « − », « + » et « Max ». Le total affiché est le vrai prix : `buyQuote(state, item, qty)` suit la hausse du prix unité par unité ; `buyAnimals()` et `animalBuyMax()` pour les animaux (prix fixe, limité par les places).
- **Repas de 19 h** : `mealDue(state)` puis `takeMeal(state)` ; le compte du repas attend dans `state.repas` jusqu'à la nuit, qui le recopie dans son compte rendu (`feedFamily`). Si la famille dort avant 19 h, le repas est pris au coucher, comme avant. L'annonce est dans `playMealScene()` : c'est là que se branchera la cinématique.
- **Nuit automatique** (à minuit en 1.1.1, à 22 h depuis la 1.1.3) : `bedtimeDue(state)` ; c'est l'interface qui lance `sleep()` (`watchDay()`, appelée à chaque image, comme `watchRoutine()`). Elle attend qu'une fenêtre de `#modal-root` soit refermée et ne se lance pas tant que l'aide de la première partie est affichée.
- **Horloge arrêtée** : pendant le résumé du réveil (`tick(state, dt, true)`), la journée commence quand le joueur le ferme ; pendant une absence, `simulateOffline()` n'avance l'horloge que jusqu'à l'éveil minimal (midi), donc ni repas ni nuit ne se déclenchent jeu fermé.
- **Notifications** : une « cible » (`cibleAlerte(type, id)`) dit où mène chaque alerte : fenêtre de la carte, écran de détail ou onglet du bas, avec l'`id` de la ligne concernée (`animal-…`, `plot-…`, `dev-…`, `moulin-moudre`…). La liste des Notifications et les notifications qui s'affichent en bas de l'écran sont des boutons (`data-action="aller"`, `allerA()`).
- **Animaux cachés** : l'Étable et ses sections existent dès qu'elles abritent quelque chose (`coopShown()`, `herdShown()`), même si le chapitre ne les a pas encore ouvertes (mode test « +3 moutons »). Sans cela, l'alerte « il manque de la paille » parlait d'animaux qu'on ne voyait nulle part.
- **Étiquettes au survol** : le nom d'un lieu ne s'affiche que souris dessus, doigt posé (il reste 1,2 s après le relâchement) ou focus clavier (`setHover()` dans `farm-stage.js`, classe `show`). La pastille « à faire » reste visible en permanence.
- **Maison** : l'onglet « Bâtiments » s'appelle « Installations » (identifiant interne `batiments` inchangé).
- **Sauvegardes** : format 17 (`state.repas`).

## Version 1.1.3 : journée de 6 h à 22 h

- `DATA.TIME.CLOCK_SECONDS_PER_HOUR` passe de 5 à 18 s et `DATA.TIME.NIGHT_HOUR` de 24 à 22 : la journée dure 16 heures de 18 s, soit 288 s. Le repas reste à 19 h (234 s après le réveil).
- À 22 h, la nuit se lance d'elle-même (`bedtimeDue()`, ex-`midnightDue()`), avec les mêmes attentes qu'avant : fenêtre ouverte, aide de la première partie.
- Le joueur peut toujours dormir plus tôt : l'éveil minimal reste de 30 s (`MIN_AWAKE_S`), soit 7 h 40 à l'horloge.
- Pas de changement de format de sauvegarde : l'heure se déduit de `state.awakeMs`. Une partie enregistrée en cours de journée reprend à l'heure qui correspond au même temps d'éveil avec la nouvelle durée.

## Version 1.1.4 : le fond de la carte au retour d'une absence

- **Symptôme** : sur téléphone, au retour d'une absence, la carte n'affichait plus qu'un vert uni sous les bâtiments et les parcelles.
- **Cause** : le fond (texture `ground`) est un canvas composé au démarrage à partir des couches Tiled. Quand le navigateur reprend la mémoire graphique d'une page en arrière-plan, il vide ce canvas et le contexte WebGL ; au retour, Phaser recrée ses textures à partir de leurs sources : les images reviennent, le canvas revient vide.
- **Correction** (`farm-stage.js`) : `paintGround()` redessine le fond dans la texture existante ; `repairGround()` l'appelle quand le contexte WebGL est rendu (`RESTORE_WEBGL`), quand le canvas du fond est rendu (`contextrestored`), au retour sur la page (`visibilitychange`, `pageshow`, `focus`, `FarmStage.show()`), et toutes les 3 s si un point du fond est devenu transparent (`groundWiped()`).
- **Vérification** : perte simulée avec l'extension `WEBGL_lose_context` et canvas vidé à la main ; pas d'essai sur un vrai téléphone.

## Version 1.2 : composer sa famille

- **Membres** : de 1 à 6 (`DATA.FAMILY.COMPOSITION`), dont au moins un adulte. `addMember(state, enfant)` et `removeMember(state, id)` ; le besoin journalier est la somme des apports des membres présents (`familyNeed()`), donc il suit tout seul : 50 par adulte, 25 par enfant.
- **Garde-fous** : un nouveau membre arrive avec la santé moyenne de la famille (agrandir la famille ne soigne personne) ; un malade ne peut pas partir (`memberRemovalBlock()` dit pourquoi) ; un identifiant n'est jamais réutilisé (`state.famille.numeros`).
- **Animaux de compagnie** : jusqu'à 3 chiens ou chats (`DATA.FAMILY.COMPAGNIE`, `state.famille.animaux`, `addPet()`, `setPetProfile()`, `removePet()`). Gratuits, sans effet sur le besoin, la santé ou la productivité. Leur nom suit les règles d'un prénom et, comme lui, reste dans la sauvegarde locale.
- **Interface** : Maison › Famille. Deux boutons « ➕ Un adulte / Un enfant » (la fiche s'ouvre aussitôt pour le prénom), la section « Animaux de compagnie », et « Retirer de la famille » dans la fiche « Modifier » (deux appuis).
- **Sauvegardes** : format 18. La migration ajoute une liste d'animaux vide et les compteurs ; les membres ne changent pas.
- **Encyclopédie** : remise à jour avec le jeu (famille composable, animaux de compagnie, Étable et paille, Moulin, horloge et repas de 19 h, carte, Marché, fin des viandes). Le JSON fait foi ; `node build-encyclopedie.mjs` régénère la page, `--check` vérifie qu'elle est à jour.
- **Non fait** : les animaux de compagnie n'apparaissent pas sur la carte.

## Version 1.3 : le courrier

- **Données** : `DATA.COURRIER` décrit chaque lettre : sa condition (`quand.debloque` : un élément ouvert par la campagne), ses cadeaux, son texte. Pour l'instant une seule : `cousin_venezuela`, à l'ouverture de la Serre (chapitre 6), avec 1 cacao, 1 vanille et 1 café.
- **Moteur** : `deliverMail(state)`, appelée par `updateChapters()` (donc à chaque pas de jeu et à chaque nuit), fait arriver une lettre une seule fois : cadeaux dans l'inventaire, lettre dans `state.courrier` (`{ id, nuit, lu }`). `readMail()` la marque lue ; `notificationCount()` compte les lettres non lues.
- **Parties existantes** : une partie où la Serre est déjà ouverte reçoit la lettre et ses graines au premier pas de jeu après la mise à jour.
- **Interface** : la lettre non lue est en tête de l'onglet Notifications (« Courrier »), puis rangée en bas (« Courrier lu ») ; `openMailModal()` l'affiche comme une feuille de papier, avec un raccourci vers la Serre. À l'arrivée, une annonce cliquable s'affiche (`watchMail()`).
- **Ajouter une lettre** : une entrée de plus dans `COURRIER` (`data/campaign.json`) suffit ; pour une autre condition qu'un déblocage, compléter `mailDue()`.
- **Sauvegardes** : format 19.

## Version 1.4 : le Champ, les arbres du Verger, le bandeau sur une ligne

- **Le Champ** : la deuxième zone de culture (rectangle `zone_culture_2`, 8 × 8 = 64 parcelles) s'ouvre en entier, sans rien payer, quand le Moulin se débloque. Moteur : `openZone2(state)`, appelée par `updateChapters()` ; les parcelles sont dans `state.potager.zone2`, portent le lieu `potager` (mêmes cultures et automatisations que la Zone de culture), `zone: 2` et les identifiants `zone2-n` ; `zone2Plots()`, `plotZone()`. `waterAll()` et `harvestAll()` prennent une zone en troisième argument. Valeurs dans `DATA.POTAGER.ZONE2` (`data/crops.json`).
- **Sur la carte** : la scène a deux grilles (`grid`, `grid2`) et une seule table de parcelles ; `zones()` les parcourt pour l'affichage et pour les appuis. Lieu `zone2`, fenêtre `zone2` (`renderZone2()`), étiquette et pastille « à faire » propres. Les notifications d'arrosage et de récolte mènent à la Zone de culture d'abord, puis au Champ, puis à la Serre.
- **Arbres du Verger** : `modèle.arbres` (12 au plus) ; `syncTrees()` pose le n-ième arbre sur `arbre_verger_n`. Un appui sur un arbre ouvre la fenêtre du Verger. Le Verger est limité à 12 emplacements (`DATA.VERGER.EMPLACEMENTS_MAX`) ; une partie qui en avait davantage garde ses arbres, dont 12 sont dessinés.
- **Options** : le bouton ⚙️ quitte le bandeau pour le bout du menu du bas (`renderTabbar()`, même action `open-options`).
- **Bandeau** : une ligne, 53 px (117 auparavant). Plus de titre, plus de légendes : 📅 Jour n, heure, eau, pièces, autonomie (`renderIndicators()` ; la saison en est retirée en version 1.6). `fitIndicators()` réduit le texte si la ligne déborde. Le titre reste dans la page pour les lecteurs d'écran (`h1` masqué).
- **Sauvegardes** : format 20 (`state.potager.zone2`).
- **Équilibrage** : `node scripts/simulate.mjs` passe de 273 à 5 045 pièces à la nuit 80, le joueur automatique plantant des légumes dans le Champ. À revoir si le Champ doit rester un champ de blé (restreindre ses cultures, ou régler le joueur automatique).
