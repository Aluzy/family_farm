# Fiche 34 — L'essai des objets GPU de Phaser 4 : TilemapGPULayer pour le sol, SpriteGPULayer pour le menu décor

> **Fait (2026-11-10)** : l'essai derrière son réglage (éteint), la planche réunie, la décision : **adopter en
> partie** le TilemapGPULayer pour le sol du grand monde (fiche 35), **écarter** le SpriteGPULayer pour le
> menu décor. Voir « Ce qui a été fait ».

Chantier « Phaser 4 », piste 8 du rapport. Un essai qui décide, pas une migration : à faire après les
fiches 26 (les Layers) et 28. Risque élevé : tout derrière un réglage, éteint par défaut.

## Objectif

Savoir, mesures à l'appui, si les objets GPU de Phaser 4 peuvent remplacer le sol peint en canvas
(l'essentiel des ≈ 2,4 s d'envoi de textures au chargement, la mémoire des morceaux et le filet de sécurité
`repairGround`) et le menu décor (petites plantes, pierres, herbe basse), et rendre une décision écrite.

## Contexte

- **`TilemapGPULayer`** (présent dans `vendor/phaser.min.js`, 4.2.1) : toute une couche dessinée en un seul
  quad par un shader, coût proportionnel aux pixels de l'écran et non au nombre de tuiles ; un seul jeu de
  tuiles ; 4 096 × 4 096 cases au plus ; animations de tuiles gérées ; modification possible puis
  `generateLayerDataTexture()`.
- **`SpriteGPULayer`** : un seul appel de dessin pour un très grand nombre de quads (jusqu'à 100 fois plus
  rapide que les mêmes objets un par un selon la doc), si le contenu change rarement ; une seule texture,
  pas de tri par membre.
- Le sol aujourd'hui : `js/carte/ferme/sol.js` (morceaux de 256 px peints, jusqu'à 8 tuiles superposées
  par case), les planches `farm_spring_summer` et `sols_monde` (deux jeux de tuiles), le monde de 644 × 510
  cases (`MONDE`, `js/engine/monde.js`). Le projet avait écarté `TilemapLayer` à cause des liserés entre
  tuiles à zoom non entier (la ferme garde un zoom non entier : `docs/architecture-phaser.md` § 1 quater) ;
  la doc de `TilemapGPULayer` n'en dit rien.
- Le menu décor : `js/carte/ferme/vegetation.js` (les planches de la végétation et des roches du monde),
  `herbes.js` (les touffes au pied des murs), ce qui ne se trie pas avec les personnages.
- Les mesures : `docs/perf.md` (« Le chargement : où passent les 8 s ») ; 🧪 **Mesurer 30 s**.

## À faire

1. **Le sol, sur une seule région** : réunir les deux planches dans une seule (un script dans
   `scripts/carte/`, sans changer les planches existantes), construire une couche `TilemapGPULayer` par
   niveau de superposition pour une région de 64 × 64 cases, la poser à la place des morceaux peints de
   cette région derrière un réglage (`CarteKit.reglages().solGPU`, éteint par défaut).
2. Regarder, à zoom non entier et en mouvement : liserés, scintillement, alignement avec l'eau vivante, les
   flaques, les traces, la terre labourée, le brouillard. Mesurer : temps jusqu'à la vue dessinée, mémoire
   GPU, images par seconde.
3. **Le menu décor** : un `SpriteGPULayer` pour les petites plantes et pierres d'une région ; mêmes
   regards, mêmes mesures. Vérifier ce qui se perd (la teinte de l'herbe haute, les appuis sur une plante,
   les plantes prises qui disparaissent).
4. **Une décision écrite** dans `docs/architecture-phaser.md` : adopter (et une fiche de migration à
   écrire), adopter en partie, ou écarter, avec les captures et les chiffres. Si le sol GPU est adopté, la
   fiche 29 ne garde que la teinte de l'herbe.

## Hors périmètre

- La migration complète du sol ou du décor (une fiche à part, si l'essai la justifie).
- Les intérieurs et les blocs construits.

## Critères d'acceptation

- Le réglage éteint : rien ne change (tests, smoke, captures identiques).
- Le réglage allumé : la région d'essai se voit et se joue ; les écarts visuels, s'il y en a, sont
  montrés dans la PR.
- Les chiffres avant et après (chargement, mémoire, images par seconde) sont dans `docs/perf.md`, et la
  décision dans `docs/architecture-phaser.md`.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium, zoom non entier, ralenti ×4 pour le
chargement ; sur le téléphone de référence si possible.

## Livraison

Un commit (l'essai derrière son réglage, le script de planche, la décision écrite).

## Ce qui a été fait

- **La planche réunie** : `scripts/carte/planche_sol_gpu.py` → `assets/sol_gpu.png` (la planche de la ferme
  en haut, `sols_monde.png` dessous, extrudée : marge 1, espacement 2 ; 1 350 × 2 592 px). Les planches
  existantes ne changent pas.
- **L'essai** (`js/carte/ferme/sol-gpu.js`, éteint par défaut ; `localStorage['ferme-essai-sol-gpu']` = '1' : le
  sol, '2' : le sol et le menu décor) : une région du grand monde entièrement hors de la ferme a un
  `TilemapGPULayer` par niveau de superposition de ses tuiles (3 ou 4 par région en pratique) au lieu de ses
  morceaux peints ; avec '2', un `SpriteGPULayer` par planche pour ses petites plantes et petites pierres.
  Les régions qui touchent la ferme gardent leurs morceaux (ses couches de Tiled, la terre labourée…).
- **Un défaut trouvé et corrigé** : le shader « arrondi » de `js/carte/jeu.js` (`shadersArrondis`, la texture
  choisie par un entier) ajoutait une ligne qui lit `outTexDatum` à tous les shaders, même à une seule texture
  où elle n'existe pas : le shader du SpriteGPULayer ne se compilait plus, et le rendu de tout ce qui suivait
  dans l'image (le personnage, les arbres) se perdait. La ligne est maintenant sous `#if TEXTURE_COUNT != 1`.
- **Ce qu'on voit** (`34-sol-gpu.png`, `34-sol-gpu-zoom.png`) : le même sol, au pixel près (10 pixels
  différents sur 275 000 avec le sol et le décor, ce qui bouge) ; à zoom non entier (1,37 et 2,08), aucun
  liseré entre les tuiles (la planche extrudée) ; le personnage, l'eau, les traces, le brouillard par-dessus
  comme avant. Ce qui se perd : le décor des chemins (`gravier.js`, peint dans le sol), la lecture du sol par
  les touffes d'herbe (`lireSol`), et une petite pièce prise refait toute la région.
- **Mesuré** (Chromium, la partie du jour 75, 20 s de marche dans le grand monde ; voir `docs/perf.md`) :
  - la construction d'une région : 8 à 20 ms (ses couches) au lieu de ≈ 12 ms par morceau de 256 px peint ;
    la peinture du sol pendant la marche, 177–200 → 41–51 ms au ralenti ×4 ; moins de tâches longues ;
  - la mémoire du sol : 0,2 Mo de textures de données pour quatre régions au lieu de 3,2 à 5,3 Mo de canevas,
    mais la planche réunie, 13,3 Mo, toujours là ;
  - le chargement : 0,7 à 1,7 s de plus au ralenti ×4 (la planche réunie, chargée et envoyée au GPU) ;
  - les images : près de la ferme, les mêmes ; en forêt (quatre régions en GPU), le sol seul est plus fluide
    que le canevas (437 images en 20 s, médiane 33 ms, contre 263–320 et 50–67 ms) ; avec le SpriteGPULayer
    des petites plantes, plus lent (176–247 images, médiane 67–100 ms).
  - Réserve : Chromium sans écran dessine en logiciel (SwiftShader) : le coût d'un shader par pixel y pèse
    plus que sur le GPU d'un téléphone. Pas mesuré sur le téléphone de référence.
- **La décision** (`docs/architecture-phaser.md`, « Les objets GPU de Phaser 4 ») : adopter en partie. Le
  TilemapGPULayer pour le sol du grand monde hors de la ferme, à migrer par la fiche 35 (après une mesure sur
  le téléphone) ; le SpriteGPULayer écarté pour le menu décor (les petites plantes restent peintes, la fiche
  35 dit où). La fiche 29 (la teinte de l'herbe) reste entière : la ferme garde son sol peint.
