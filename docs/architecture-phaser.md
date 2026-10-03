# La carte de la ferme (Phaser 3) : architecture

Périmètre : la zone entre le bandeau « Ferme Familiale » (titre + indicateurs) et le menu
du bas, sur l'onglet **Ferme**. Tout le reste du jeu (onglets, fenêtres, moteur) reste en DOM.

> **Piège à ne pas refaire :** aucune variable globale de la page ne doit s'appeler `screen`
> (ni `name`, `status`, `top`, `event`…). `screen` masque `window.screen`, dont Phaser a besoin
> au démarrage (erreur « reading 'orientation' »). Le jeu utilise `ecranFerme`.

## 1. Découpage

```
jeu.html
 ├─ <script id="core">    moteur pur (aucun DOM, aucun Phaser)      ← node run-tests.mjs
 ├─ <script id="tests">   tests du moteur
 ├─ vendor/phaser.min.js  Phaser 3.90 (fichier à part, ≈ 1 Mo)
 ├─ farm-stage.js         la scène : ne connaît ni `state` ni le moteur
 └─ <script id="app">     blocs « Carte Phaser » et « Fenêtres de la carte »
assets/                   carte Tiled (carte_printemps.json) + images du pack
```

Flux de données, à sens unique dans chaque direction :

```
state ──stageModel()──▶ modèle de vue ──FarmStage.update()──▶ scène.sync()      (affichage)
state ◀── clic DOM ◀── stageAct(action, données) ◀── scène : appui sur la carte  (actions)
```

- **Modèle de vue** (`stageModel()`), le seul objet que la scène reçoit :
  `{ season, cols, plots: [{ id, culture, icone, phase (-1, 0…3), mature, arrosee }],
  batiments: { etable, moulin, serre, verger } }`.
- **`sync(modèle)` est idempotent** : `render()` appelle `renderStage()` environ 5 fois par
  seconde ; un modèle identique est écarté avant la scène (comparaison de la clé JSON), un modèle
  différent crée, met à jour ou détruit exactement ce qui a changé.
- **Pont d'actions** `stageAct(action, données)` : crée un bouton masqué portant
  `data-action` et `data-*`, le clique, le retire. L'unique écouteur de clics de la page fait le
  reste : une seule logique d'action, mêmes fenêtres, même suivi de session (aucune donnée
  nouvelle : seulement de nouveaux noms d'action, `stage-open`, `stage-close`, `maison-tab`).

Pour ajouter un élément à la carte : un champ dans `stageModel()`, un bloc dans `sync()`,
une action existante dans `tap()`. Jamais d'appel au moteur depuis `farm-stage.js`.

## 2. La carte : 36×19 tuiles, trois écrans

`assets/carte_printemps.json` est la carte Tiled du propriétaire : 36×19 tuiles de 16 px
(576×304 px), quatre couches de tuiles et une couche d'objets `batiment`. Elle sert aux quatre
saisons (il n'existe qu'une carte de printemps). Depuis la version 1.1.2 les bâtiments gardent
eux aussi leur image de printemps (`_sp`) toute l'année : voir `SEASONS_ON_MAP`.

- **Sol cuit en une image.** Au démarrage, `bakeGround()` lit le JSON brut
  (`cache.tilemap.get(clé).data`) et dessine toutes les couches de tuiles dans un seul canvas
  (texture `ground`, profondeur 0). Pas de `TilemapLayer` : avec un zoom non entier, des tuiles
  rendues une à une laissent de fins liserés. Case 0 = vide ; les bits de retournement de Tiled
  sont gérés.
- **Objets lus dans la carte** (rectangles nommés de la couche d'objets). Le bas-centre de
  l'image se pose sur le bas-centre du rectangle, sans sortir de la carte ; profondeur = y du
  pied. Déplacer un rectangle dans Tiled suffit, sans toucher au code.

  | Objet | Image | Affiché si | Fenêtre |
  |---|---|---|---|
  | `maison` | `house_*` | toujours | Maison |
  | `grange` | `barn_*` (l'étable) | Poulailler ou Pâturage débloqué | Étable |
  | `moulin` | `windmill_*` (4 images de 96×128, animé) | un atelier débloqué | Moulin et ateliers |
  | `serre` | `serre_*`, découpe « batiment » (verrière seule, 94×83) | Serre débloquée | Serre |
  | `verger` | `sign.png` (pancarte) | Verger débloqué | Verger |
  | `zone_culture` | parcelles | toujours | Zone de culture |

  Un bâtiment verrouillé n'est pas dessiné (l'herbe reste). `SERRE_FRAME = 'cour'` dans
  `farm-stage.js` affiche à la place la verrière avec sa cour pavée (177×144), nettement plus
  grande que le rectangle de la carte.
- **Parcelles.** Le coin haut-gauche de `zone_culture` est calé sur la grille de 16 px
  (192,176) ; les parcelles sont des tuiles jointives, 5 colonnes au plus :
  6/12/18/24/30 parcelles = 2×3, 3×4, 3×6, 4×6, 5×6 (`stageCols()`). Terre sèche ou arrosée,
  plante à 4 phases découpées dans `crops.png` (table `CROP_SP`), balancement quand elle est mûre.
- **Images manquantes** : formes de secours (`makePlaceholders()`), la carte reste utilisable.
  Sans le JSON de la carte : fond uni et rectangles par défaut (`DEFAULT_OBJECTS`).

### Réexporter la carte depuis Tiled

1. Ouvrir la carte, garder le jeu de tuiles `farm_spring_summer` (image
   `farm_spring_summer.png`, 16×16, sans marge).
2. Panneau « Jeux de tuiles » → bouton **« Intégrer le jeu de tuiles »** : Phaser et
   `bakeGround()` ne lisent pas les `.tsx` externes.
3. Couches de tuiles au format CSV (pas de compression). Les noms des couches de tuiles sont
   libres, elles sont empilées dans l'ordre ; les objets doivent garder leurs noms
   (`maison`, `grange`, `zone_culture`, `moulin`, `serre`, `verger`).
4. Fichier → Exporter sous… → JSON, vers `assets/carte_printemps.json`.

## 3. Caméra, glissement, appuis

- **Zoom** = `max(hauteur zone / hauteur carte, largeur zone / largeur carte)` : les 19 rangées
  sont visibles et la zone est entièrement couverte, sans bande. Sur un téléphone de 390 px de
  large, on voit environ 12 tuiles : la carte fait trois écrans (étable, maison et zone de
  culture, moulin et serre). Départ centré sur l'écran du milieu ; au redimensionnement, le
  centre courant est conservé. La vue ne sort jamais de la carte (`setCentre()` borne le centre).
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

## 6. Sans Phaser

`TAB_RENDERERS.ferme` affiche la liste classique (`renderFerme()`) seulement quand la carte
n'est pas utilisable (`stageUsable()`) : `vendor/phaser.min.js` ou `farm-stage.js` absent, jeu
ouvert depuis le disque (`file://` : le navigateur refuse de charger la carte), plantage au
montage, ou scène toujours pas prête 12 s après le montage (la carte revient d'elle-même si elle
finit par démarrer). Le jeu reste entièrement jouable dans ce cas.

## 7. Vérifier

```
node run-tests.mjs                      # moteur
python3 -m http.server 8771             # puis http://localhost:8771/jeu.html
```

Depuis la console : `FarmStage.scene()` (caméra : `.cameras.main`, centre : `.cx`, `.cy`),
`stageModel()`, `stageWindow`.

## 8. Limites connues

- Automne et hiver : la carte garde son apparence de printemps toute l'année (`SEASONS_ON_MAP = false` dans `farm-stage.js`) ; les images d'automne et d'hiver des bâtiments restent dans `assets/` pour le jour où les cartes de ces saisons existeront.
- La grille 5×6 (80 px) dépasse la barrière dessinée sur la carte (64 px) et touche le chemin.
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
- **Nuit de minuit** : `midnightDue(state)` ; c'est l'interface qui lance `sleep()` (`watchDay()`, appelée à chaque image, comme `watchRoutine()`). Elle attend qu'une fenêtre de `#modal-root` soit refermée et ne se lance pas tant que l'aide de la première partie est affichée.
- **Horloge arrêtée** : pendant le résumé du réveil (`tick(state, dt, true)`), la journée commence quand le joueur le ferme ; pendant une absence, `simulateOffline()` n'avance l'horloge que jusqu'à l'éveil minimal (midi), donc ni repas ni nuit ne se déclenchent jeu fermé.
- **Notifications** : une « cible » (`cibleAlerte(type, id)`) dit où mène chaque alerte : fenêtre de la carte, écran de détail ou onglet du bas, avec l'`id` de la ligne concernée (`animal-…`, `plot-…`, `dev-…`, `moulin-moudre`…). La liste des Notifications et les notifications qui s'affichent en bas de l'écran sont des boutons (`data-action="aller"`, `allerA()`).
- **Animaux cachés** : l'Étable et ses sections existent dès qu'elles abritent quelque chose (`coopShown()`, `herdShown()`), même si le chapitre ne les a pas encore ouvertes (mode test « +3 moutons »). Sans cela, l'alerte « il manque de la paille » parlait d'animaux qu'on ne voyait nulle part.
- **Étiquettes au survol** : le nom d'un lieu ne s'affiche que souris dessus, doigt posé (il reste 1,2 s après le relâchement) ou focus clavier (`setHover()` dans `farm-stage.js`, classe `show`). La pastille « à faire » reste visible en permanence.
- **Maison** : l'onglet « Bâtiments » s'appelle « Installations » (identifiant interne `batiments` inchangé).
- **Sauvegardes** : format 17 (`state.repas`).
