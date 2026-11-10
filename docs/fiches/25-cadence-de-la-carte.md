# Fiche 25 — La cadence de la carte : 60 images par seconde au plus, une seule boucle

Chantier « Phaser 4 » (fiches 25 à 34), d'après le rapport *Ferme Familiale — améliorations possibles
avec Phaser 4* (2026-11-09), piste 1 de ses priorités.

## Objectif

Que la carte ne travaille pas plus que nécessaire : la boucle Phaser plafonnée à 60 images par seconde
(30 en qualité économie quand rien ne bouge), le suivi de la vue identique à 30, 60 ou 120 Hz, et une
seule boucle d'animation pour la page et la carte au lieu de trois.

## Contexte

- Le jeu Phaser unique : `js/carte/jeu.js` (`CarteJeu`, `new Phaser.Game({ … })`, vers la ligne 59) ; sa
  configuration ne fixe ni `fps` ni `powerPreference`. Le `TimeStep` de Phaser met `fps.limit` à 0 par
  défaut : la boucle suit alors l'écran. Le téléphone de référence (Redmi Note 13 5G, `docs/perf.md`) a un
  écran à 120 Hz : toute la scène peut s'y mettre à jour deux fois plus souvent qu'utile.
- Les boucles de la page : `js/ui/loop.js` (`frame` : le tick du moteur et les veilleurs ; `renderLoop` :
  le rendu DOM à 5 Hz), lancées par `js/main.js` (`requestAnimationFrame(frame)`,
  `requestAnimationFrame(renderLoop)`). Avec celle de Phaser, trois rappels par image, que le navigateur
  peut décaler l'un de l'autre.
- Le suivi de la vue : `js/farm-stage.js` (vers la ligne 649) : `k = Math.min(1, dt / FOLLOW_MS)`
  (`FOLLOW_MS` = 250, `js/carte/ferme/config.js`) dépend du rythme d'affichage ; `stepInertia` utilise
  déjà la forme exponentielle.
- La qualité de l'affichage (`CarteKit.qualite()`, fiche 9a) : `auto`, `economie`, `normale`.
- La boucle Phaser dort quand la carte est cachée (`CarteJeu.cache`).
- Les mesures : 🧪 Test › **Mesurer 30 s** ; `docs/perf.md` (« Les budgets », « Mesurer, sur le téléphone »).
- La piste 5 de `docs/chantier-allegement.md` (les veilleurs au rythme du tick) est voisine : cette fiche
  ne change pas ce que font les veilleurs, seulement qui les appelle.

## À faire

1. **Le plafond.** Dans la configuration du jeu : `fps: { limit: 60 }` (vérifier le nom exact de l'option
   et son comportement sur la version embarquée, `vendor/phaser.min.js`, 4.2.1). En qualité économie, le
   plafond descend à 30 quand rien ne bouge (aucune marche, aucun glissement ni zoom de la vue, aucun
   geste en cours) et remonte à 60 dès que quelque chose bouge. Si le plafond ne peut pas changer à chaud,
   le dire dans la PR et garder 60 partout.
2. **`powerPreference: 'low-power'`** sur téléphone (le même critère que la qualité `auto`), mesuré :
   gardé seulement si les images par seconde ne baissent pas.
3. **Le suivi de la vue** : `k = 1 - Math.exp(-dt / FOLLOW_MS)` ; idem pour tout autre suivi en
   `dt / constante` trouvé dans la scène (le chercher : `grep -n "dt / " js/farm-stage.js js/carte`).
4. **Une seule boucle.** Quand la carte est affichée, `frame` et `renderLoop` sont appelés depuis
   l'événement `step` (ou `poststep`) du jeu Phaser, avec le temps de Phaser ; quand la boucle Phaser
   dort, un seul `requestAnimationFrame` de la page les appelle. `renderLoop` garde sa cadence de 5 Hz
   (son propre compteur). Aucune des deux ne doit tourner deux fois par image ni s'arrêter au passage
   d'un mode à l'autre (carte cachée, fenêtre plein écran, onglet en arrière-plan).
5. Documenter le pas de temps borné à 50 ms (`update`, `Math.min(delta, 50)` ; et le personnage) dans
   `docs/architecture-phaser.md` : sous 20 images par seconde, le monde ralentit au lieu de sauter, c'est
   voulu.

## Hors périmètre

- Ce que font les veilleurs et l'ordre des étapes de la scène (fiche 33, ordonnanceur ; piste 5 de
  `docs/chantier-allegement.md`).
- Les Layers (fiche 26).

## Critères d'acceptation

- Avec un affichage plus rapide que 60 Hz (Chromium lancé avec `--disable-gpu-vsync
  --disable-frame-rate-limit` : `requestAnimationFrame` n'y est plus plafonné), la scène fait au plus 60
  mises à jour par seconde (compter les appels à `update`).
- En qualité économie, immobile, 30 au plus ; le personnage qui marche remet 60 tout de suite.
- Le suivi de la vue donne la même trajectoire à 30, 60 et 120 Hz (un test de la formule en Node :
  la position après 1 s de suivi, à 1 % près, quel que soit le pas).
- Un seul `requestAnimationFrame` actif de la page quand la carte est affichée (compter les appels).
- Le tick du moteur avance comme avant : mêmes jours, mêmes nuits (tests du moteur inchangés).

## Vérifications

- `npm run build`, `npm test`, `node tests/smoke.mjs`.
- Chromium : compter les appels (un compteur temporaire sur `update`, `frame`, `renderLoop`) pendant 10 s,
  carte affichée puis cachée ; 🧪 **Mesurer 30 s** avant et après, dans la PR.
- Sur le téléphone de référence si possible (`docs/perf.md`) : images par seconde et chauffe.

## Livraison

Un commit, message en français ; `docs/perf.md` (les mesures avant et après) et
`docs/architecture-phaser.md` (§ 1 quater : la cadence, la boucle unique, le pas borné) mis à jour.
