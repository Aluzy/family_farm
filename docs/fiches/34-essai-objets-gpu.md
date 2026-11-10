# Fiche 34 — L'essai des objets GPU de Phaser 4 : TilemapGPULayer pour le sol, SpriteGPULayer pour le menu décor

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
