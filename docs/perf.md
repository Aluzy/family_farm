# Performances : téléphone de référence, budgets, mesures (F0-6)

La nouvelle vision du jeu est « mobile d'abord ». Ce document fixe le téléphone de référence, les
budgets à tenir sur lui, la façon de mesurer, et garde les résultats d'une version à l'autre.

## Le téléphone de référence

**Xiaomi Redmi Note 13 5G** (choix du créateur, novembre 2026) : puce MediaTek Dimensity 6080 (8 cœurs),
8 Go de mémoire, écran de 1080 × 2400 jusqu'à 120 Hz (Chrome y voit 393 × 873, densité 2,53). Le jeu choisit lui-même la qualité
« économie » sur un téléphone (⚙️ Options › Qualité de l'affichage, `CarteKit.qualite`) ; c'est dans ce
réglage qu'on mesure, sauf mention contraire.

## Les budgets (« cosy standard »)

| Mesure | Budget | Pourquoi |
|---|---|---|
| Images par seconde sur la carte | au moins **30** en moyenne, au plus **5 %** d'images de plus de 34 ms (60 visées) | un jeu calme : la fluidité compte plus que la vitesse |
| Jeu affiché (l'écran de chargement retiré) après l'ouverture de la page | moins de **5 s** | une courte session doit commencer vite |
| Une sauvegarde (sérialiser puis écrire) | moins de **16 ms** | elle a lieu après chaque geste (F0-5) : elle ne doit pas coûter une image |

Les budgets sont écrits dans `js/ui/mesures.js` (`BUDGETS`) ; le rapport les marque ✅ ou ❌.

## Le scénario mesuré : la ferme construite

Le cœur de la nouvelle vision est de construire et d'aménager : c'est le cas qu'on mesure. Le mode test
le bâtit d'un coup (`testFermeConstruite`, `js/engine/testmode.js`) :
- les bâtiments du jeu : foyer et ses stations, poulailler, étable, serre, moulin, silo, puits, panneau
  solaire, batterie ;
- deux maisons de 16 × 12 cases (une seule si la ferme manque de place) : plancher partout, un exemplaire
  de chaque meuble à l'intérieur, et un étage (escalier, paillasses, sols) ;
- un jardin d'agrément devant chaque maison : lanternes, bacs à fleurs, bancs, tables, pergola.

Sur une ferme neuve, cela fait environ 280 à 380 blocs, dont 35 à 70 meubles, pour une sauvegarde de
20 à 25 Ko.

## Mesurer, sur le téléphone

1. Ouvrir le jeu sur le site, puis ⚙️ Options › **Activer le panneau de mode test**, et ouvrir 🧪 **Test**
   dans le menu.
2. ⚠️ La ferme d'essai s'ajoute à la partie en cours et la modifie (niveau maximal, bâtiments, maisons).
   Pour garder sa vraie partie : ⚙️ Options › **Exporter** d'abord (copier le texte), puis commencer une
   **nouvelle partie** pour la mesure ; après, ⚙️ Options › **Importer** le texte gardé.
3. Dans 📏 **Mesures**, en haut du mode test, toucher **Bâtir la ferme d'essai**. La page se recharge.
4. Rouvrir 🧪 Test › **Mesurer 30 s**, fermer le panneau, puis jouer normalement pendant 30 s : marcher
   dans la ferme, entrer dans une maison, ouvrir 🔨 Construire, poser et déplacer un meuble, faire glisser
   la vue.
5. Rouvrir 🧪 Test : le rapport est affiché. Toucher **Copier le rapport** et le coller dans un message
   (ou ci-dessous).
6. Pour la durée de chargement, recharger la page une fois la ferme bâtie, puis refaire une mesure : la
   ligne « Jeu affiché » vaut pour ce chargement-là.

Le rapport donne aussi la médiane et les 95 / 99 % des durées d'image, la plus longue, la mémoire du jeu
(Chrome seulement), le temps de chargement de la page, l'appareil et la taille de la partie. Rien ne part
de l'appareil.

## Résultats

| Date | Appareil (version, mémoire) | Version du jeu | Scénario | Images/s · lentes | Carte prête, puis jeu affiché | Sauvegarde max | Mémoire |
|---|---|---|---|---|---|---|---|
| 2026-11-03 | Chromium sans carte graphique, émulation 393 × 873 (pas un téléphone) | 1.22.0 | ferme construite (275 blocs, 34 meubles) | 33,8 · 2,9 % | 2,0 s | 0,7 ms | 169 Mo |
| 2026-11-03 | **Redmi Note 13 5G** (Dimensity 6080, 8 Go), Chrome 156 | 1.22.0 | ferme construite (382 blocs, 67 meubles) | **55,5** ✅ · 2,3 % ✅ (médiane 16,6 ms) | **8,1 s** ❌ (page chargée en 1,1 s) | **1,7 ms** ✅ | 117 Mo |
| 2026-11-04 | **Redmi Note 13 5G**, Chrome 156 | 1.22.0, après les étapes 1 à 2c du lot « chargement » | ferme construite (382 blocs, 67 meubles) | **53,9** ✅ · 0,8 % ✅ (médiane 16,6 ms, la plus longue 482 ms) | **6,8 s** ❌ « jeu affiché » (page chargée en 1,0 s) | **3,5 ms** ✅ | 82 Mo |

### Le chargement : où passent les 8 s (analyse du 2026-11-03)

Sur le téléphone, la page est chargée en 1,1 s ; il faut ensuite 7 s pour que la carte soit prête. Le même
chargement reproduit en local (Chromium, processeur ralenti 4 fois pour approcher le téléphone, profil
du processeur) donne 8,8 s, sans un seul coupable :

| Poste | Temps (ralenti ×4) | Piste |
|---|---|---|
| Images préparées et envoyées à la carte graphique (`texImage2D`, `drawImage`, `getImageData`, `createObjectURL`) | ≈ 2,4 s | ne préparer d'abord que ce qui est à l'écran, le reste après la première image ; moins de textures, plus grandes (atlas) |
| Lecture et compilation des scripts (1,1 Mo de jeu, plus Phaser) | ≈ 1,7 s | charger plus tard ce qui ne sert pas au premier écran (grottes, encyclopédie, récit, mode test) |
| La ferme et son terrain tirés de la graine (`ferme-generee`, `terrain-carte`, `decouverte`, `readMap`) | ≈ 0,7 s | les garder sur l'appareil (IndexedDB), rangés par graine et numéro de générateur (F0-2) |
| L'eau dessinée (rives, berges : `carte/eau.js`) | ≈ 0,5 s | seulement les régions visibles d'abord |
| Phaser lui-même | ≈ 0,5 s | — |
| Les pièces, l'étage et les toits de la ferme construite (`blocs`, `etage`, `toit`) | ≈ 0,6 s | calculs en double à mettre en commun |

La fluidité et la sauvegarde tiennent largement leurs budgets ; seul le chargement est à reprendre.

### Le lot « chargement »

Chaque étape est mesurée de la même façon : la ferme d'essai bâtie, puis 4 rechargements de la page dans
Chromium avec le processeur ralenti 4 fois (au plus près du téléphone), la médiane du temps jusqu'à la
carte prête.

| Étape | Carte prête (médiane, ralenti ×4) |
|---|---|
| Avant (main du 2026-11-03) | 7,09 s |
| 1a. Les toits gardés tant que les blocs, l'étage, les sols et les hauteurs ne changent pas (`toits`, `js/engine/etage.js` : ils étaient recalculés à chaque appel, 1,6 ms par appel sur ordinateur, 0,16 ms après) | 6,80 s |
| 1b. La teinte de l'herbe haute lue juste après que la carte a paru, les touffes montrées une fois teintées (`js/carte/ferme/decor.js`) | **5,99 s** |
| *Pistes suivantes* : voir l'étape 2 | |

**Étape 2 : la bonne mesure.** « Carte prête » (la scène Phaser créée) arrivait avant que le joueur ne
voie la carte : l'écran de chargement attend en plus que la vue soit entièrement dessinée. L'écran de
mesure relève maintenant le moment où il est retiré (`Chargement.fini`, jeu.html) : **« Jeu affiché »**,
le temps que voit le joueur (le budget de 5 s s'y applique). Les jalons d'un chargement de la ferme
d'essai, ralenti ×4 (main après l'étape 1) :

| Jalon | Moment | Ce qui s'y passe |
|---|---|---|
| Page lue (DOM) | 1,4 s | |
| Scène prête | 4,1 s | les images chargées et traitées par Phaser (2,5 s), la scène créée |
| Vue dessinée | 6,4 s | les deux régions sous la vue peintes (1 056 × 1 056 px chacune : 1,4 s, dont 0,5 s d'arbres, de barrières et de rochers posés), le temps hors ligne rattrapé, la ferme tirée de la graine (0,6 s), et la teinte de l'herbe haute (1 s), qui tombait là depuis l'étape 1 |
| Écran retiré | 7,5 s | 0,35 s d'attente voulue avant le fondu, et le fil principal encore occupé |

| Étape | Jeu affiché (médiane, ralenti ×4) |
|---|---|
| main après l'étape 1 | 7,70 s |
| 2a. La teinte de l'herbe haute attend que l'écran de chargement soit retiré (au plus 10 s) ; l'attente avant le fondu de l'écran passe de 350 à 100 ms | **7,29 s** (l'écran retiré 0,45 s après la vue dessinée, contre 1,1 s) |
| 2b. Le sol peint par morceaux de 256 px (`js/carte/ferme/sol.js`) : ceux sous la vue d'un coup, ceux de la marge deux par image ; chacun avec un anneau de 2 cases autour (ce qui en déborde) | **6,51 s** (main le même jour : 7,79 s, soit −1,3 s) ; la vue dessinée 1,6 s après la scène prête (2,5 s avant) |
| 2c. Les images des meubles (leurs vues de dos et de profil, les draps des lits : 96 fichiers) et des bêtes du grand monde (14) chargées juste après que l'écran de chargement est retiré (`chargerTard`, `js/farm-stage.js` ; au plus tard 10 s après la scène) ; meubles et bêtes paraissent à leur arrivée (sur la ferme d'essai, les 67 meubles en moins de 4 s) | **5,39 s** (main le même jour : 6,16 s, soit −0,8 s) |
| 3a. La ferme tirée de la graine gardée sur l'appareil (IndexedDB, `js/ui/ferme-gardee.js`) : relue avant la partie (au plus 0,8 s d'attente) au lieu d'être tirée à nouveau (0,85 s ralenti ×4) | **−0,3 s** en moyenne (4 comparaisons avec main le même jour, 4 puis 8 chargements chacune : −0,54, −0,09, −0,38, −0,15 s ; main entre 6,5 et 7,2 s ce jour-là, la machine variait). Le profil du chargement : `genererFerme` 0,85 s → 0 (la relecture : 3 ms) ; le gain affiché est moindre, car une partie de ce calcul se faisait pendant que les images arrivaient |
| *Pistes suivantes* : l'eau dessinée seulement à l'écran d'abord (≈ 0,4 s : `syncEau`) ; l'encyclopédie relue au chargement (0,33 s : `majEncyclopedie`, `decouverte.js`) ; la teinte de l'herbe haute (1,2 s d'un bloc juste après l'affichage : à étaler) | |

La première mesure du téléphone (8,1 s) s'arrêtait avant la vue dessinée :
la mesure du 2026-11-04 (6,8 s) compte jusqu'à l'écran retiré, elle n'y est pas comparable. Sur le
téléphone, le jeu va environ 1,25 fois moins vite que Chromium ralenti 4 fois (6,8 s contre 5,4 s).

**Étape 3 : la ferme gardée.** La ferme d'une graine ne change pas tant que le générateur ne change pas
(F0-2) : une fois tirée, elle est rangée dans la base IndexedDB de l'appareil sous « version du
générateur : graine », quelques secondes après que le jeu est affiché (une seule ferme gardée). À
l'ouverture suivante, `js/main.js` la relit avant de charger la partie et la donne au moteur
(`fermeRecue`, `js/engine/ferme-generee.js`, qui vérifie sa forme). Base absente, lente, vide ou
refusée : la ferme est tirée comme avant, la partie est la même. Relue dans la page, la ferme a la même
empreinte que tirée ; le rapport de mesure dit d'où elle vient (« Ferme générée : relue de l'appareil »).

Le sol par morceaux est identique au pixel près au sol d'un seul canevas : vérifié dans la page sur
les régions de la ferme et du grand monde (petites plantes comprises) et après une repeinture partielle
(des cases labourées sur les bords des morceaux). La lecture du sol pour les touffes au pied des murs
(`herbes.js`) passe par `lireSol`, qui recompose les morceaux.

## Le mode Construire, un mur en main (version 1.22.0, une partie au jour 54)

Ouvrir Construire, un mur en main, figeait le jeu : 2,4 s par image. Pour montrer en blanc les cases où le
bloc se pose (`syncConstructible`, js/farm-stage.js), chaque case visible passe par `poseStatus` ; pour un
mur, il vérifiait qu'il ne couperait pas la pièce de l'escalier (`etageEnPeril`), en recalculant toutes
les pièces closes de la ferme, deux fois, à chaque case (≈ 26 ms la case avec 665 blocs posés). Seul un
bloc posé dans la pièce de l'escalier peut la couper : la vérification n'a lieu que là. Une case coûte
maintenant ≈ 0,3 ms, et une image de Construire ≈ 60 à 80 ms à 4 × de ralentissement (tests/engine/perf-ferme.test.mjs).
