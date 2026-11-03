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
| Carte prête (jouable) après l'ouverture de la page | moins de **5 s** | une courte session doit commencer vite |
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
   ligne « Carte prête » vaut pour ce chargement-là.

Le rapport donne aussi la médiane et les 95 / 99 % des durées d'image, la plus longue, la mémoire du jeu
(Chrome seulement), le temps de chargement de la page, l'appareil et la taille de la partie. Rien ne part
de l'appareil.

## Résultats

| Date | Appareil (version, mémoire) | Version du jeu | Scénario | Images/s · lentes | Carte prête | Sauvegarde max | Mémoire |
|---|---|---|---|---|---|---|---|
| 2026-11-03 | Chromium sans carte graphique, émulation 393 × 873 (pas un téléphone) | 1.22.0 | ferme construite (275 blocs, 34 meubles) | 33,8 · 2,9 % | 2,0 s | 0,7 ms | 169 Mo |
| 2026-11-03 | **Redmi Note 13 5G** (Dimensity 6080, 8 Go), Chrome 156 | 1.22.0 | ferme construite (382 blocs, 67 meubles) | **55,5** ✅ · 2,3 % ✅ (médiane 16,6 ms) | **8,1 s** ❌ (page chargée en 1,1 s) | **1,7 ms** ✅ | 117 Mo |

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

La fluidité et la sauvegarde tiennent largement leurs budgets ; seul le chargement est à reprendre (lot
« chargement » à ouvrir).
