# Fiche 33 — L'ordonnanceur de la scène : chaque étape à sa cadence, des événements plutôt que des sondages

Chantier « Phaser 4 », pistes 9 et 10 du rapport et sa partie « Logique ». Après la fiche 25 (une seule
boucle).

## Objectif

Que la scène ne fasse à chaque image que ce qui se voit : les ≈ 65 étapes de `update()` rangées dans une
table, chacune à sa cadence (chaque image, 10 Hz, 2 Hz), mesurée par son nom ; les étapes qui guettent un
changement remplacées par des événements ; un hasard à graine pour la couche visuelle.

## Contexte

- `js/farm-stage.js`, `update(time, delta)` : le pas borné à 50 ms, puis une longue suite d'appels
  `this.stepXxx(dt)` (≈ 65, dont `stepVisite`, `stepRencontre`, `stepInvites` lignes 637 à 640), toutes à
  chaque image.
- Les mesures intégrées : `js/ui/chrono.js`, `js/ui/mesures.js` (🧪 **Mesurer 30 s**).
- Les sondages : `stepSilo`, `stepPresents`, `syncTankTip` vérifient à chaque image si le modèle a changé.
  La scène hérite de l'`EventEmitter` de Phaser ; le modèle arrive par `sync(modèle)`
  (`js/carte/ferme/modele.js`, `stageModel()` dans `js/ui/stage.js`).
- Le hasard de la couche visuelle : `Math.random` dans la faune, la vie d'ambiance, les compagnons, les
  habitants et une quinzaine de fichiers de `js/carte/` (`grep -rln Math.random js/carte js/*.js`). Le
  moteur, lui, est déjà à graine (un seul `Math.random`, dans `js/engine/bot.js`).
- Les veilleurs de la page au rythme du tick : piste 5 de `docs/chantier-allegement.md` (côté page ; cette
  fiche fait la même chose côté scène).
- `docs/architecture-phaser.md` décrit encore le pont d'actions comme un bouton masqué qu'on clique
  (vers la ligne 55) ; `stageAct` (`js/ui/stage.js`, ligne 1215) appelle désormais `runAction` directement.

## À faire

1. **La table des systèmes** : `{ nom, pas(dt), cadence: 'image' | 10 | 2, actif() }`, remplie à la création
   de la scène dans l'ordre actuel des étapes. À chaque image ce qui se voit (personnage, vue, eau, traces,
   ressorts) ; à 10 Hz ce qui décide (faune, habitants, portes, rouges-gorges) ; à 2 Hz ce qui relève
   (soleil, silo, étiquettes, abeilles hors de la vue). Une étape lente reçoit le `dt` cumulé depuis son
   dernier pas. Le chrono mesure chaque système par son nom.
2. Ranger chaque étape dans sa cadence une par une, en vérifiant à l'œil qu'aucune animation ne saccade ;
   dans le doute, laisser à chaque image.
3. **Des événements** : `sync()` émet `modele:silo`, `modele:presents`, `modele:citerne`… quand la partie
   correspondante du modèle change ; `stepSilo`, `stepPresents`, `syncTankTip` s'y abonnent et ne tournent
   plus à chaque image.
4. **Le hasard à graine** : un petit générateur dans le kit (`CarteKit.hasard(graine)`), une graine par
   acteur (graine du monde + identifiant) ; remplacer `Math.random` dans la couche visuelle, en commençant
   par ce que la fiche 31 n'a pas déjà fait. Les captures d'essai (`scripts/check-page.mjs`, les scripts de
   test) deviennent reproductibles.
5. **La doc** : corriger la description du pont d'actions dans `docs/architecture-phaser.md` (`stageAct` →
   `runAction`).

## Hors périmètre

- La boucle et le plafond d'images (fiche 25).
- Le comportement des acteurs (fiches 31 et 32).

## Critères d'acceptation

- Le temps de `update` par image baisse (🧪 **Mesurer 30 s** près des ruches et dans un hameau : chiffres
  avant et après, système par système).
- Aucune animation ne saccade (captures image par image du personnage, de la vue, de l'eau, des bêtes).
- Deux chargements de la même sauvegarde à la même heure donnent les mêmes positions de bêtes et
  d'oiseaux après 5 s (une fois le hasard à graine en place).
- `npm test` vert ; la doc du pont d'actions juste.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium sur la sauvegarde du jour 75 et dans le
grand monde.

## Livraison

Un commit ; `docs/architecture-phaser.md` (l'ordonnanceur, les événements du modèle, le pont d'actions)
et `docs/perf.md` mis à jour.
