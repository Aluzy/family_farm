# Chantier « allègement » : six pistes pour alléger le jeu sans rien lui retirer

Ce document prépare un chantier à venir. Il part d'une lecture du code de la version 1.22.0 et de
mesures du moteur en Node sur la ferme d'essai de `docs/perf.md` (`testFermeConstruite`, 382 blocs,
67 meubles). Il complète `docs/perf.md`, qui garde les budgets, le téléphone de référence et les
résultats ; les pistes ci-dessous visent ce qui reste après les lots « chargement » et « Construire ».

Règle du chantier : **rien ne change pour le joueur**. Mêmes règles, mêmes images au pixel près, même
son, mêmes sauvegardes. Chaque piste dit ce qu'elle allège (temps, mémoire, octets téléchargés), comment
le vérifier, et ce qu'elle ne doit pas toucher. Une piste, une PR, comme les fiches de `docs/fiches/`.

| Piste | Ce qu'elle allège | Risque | État |
|---|---|---|---|
| [1 — une révision des blocs à la place des clés JSON](#1-une-révision-des-blocs-à-la-place-des-clés-json) | processeur, à chaque modèle de la carte et à chaque geste de Construire | faible (couvert par les tests Node) | à faire |
| [2 — le son : ne plus garder en mémoire le PCM des boucles longues](#2-le-son--ne-plus-garder-en-mémoire-le-pcm-des-boucles-longues) | mémoire (jusqu'à plusieurs centaines de Mo sur une longue session) | moyen (comportement du navigateur) | à faire |
| [3 — découper le regroupement et charger à la demande](#3-découper-le-regroupement-et-charger-à-la-demande) | chargement : lecture et compilation du JS | moyen (ordre de chargement) | à faire |
| [4 — des atlas pour les ~170 petites images](#4-des-atlas-pour-les-170-petites-images) | chargement : requêtes et envois à la carte graphique | faible (pipeline déjà en place pour les icônes) | à faire |
| [5 — les cadences : veilleurs et objectifs au rythme du tick](#5-les-cadences--veilleurs-et-objectifs-au-rythme-du-tick) | processeur, à chaque image | faible | à faire |
| [6 — le modèle de la carte mémorisé par sections](#6-le-modèle-de-la-carte-mémorisé-par-sections) | processeur, 5 fois par seconde | moyen (dépend de la piste 1) | à faire |
| [Bonus](#bonus) : style et pages minifiés, Service Worker | octets, rechargements | faible | à faire |

## Comment mesurer (le moteur, en Node)

Les chiffres de ce document viennent d'un petit banc en Node 22 (ordinateur de développement ; un
téléphone va 4 à 5 fois moins vite, voir `docs/perf.md`). Il se réécrit en une minute :

```js
// mesure.mjs, à côté du dépôt (pas dedans) : node mesure.mjs
import * as E from './family_farm/js/engine/index.js';
import { garden } from './family_farm/tests/engine/aide.mjs';
const s = garden(); E.testFarmMap(s, '42'); E.testFermeConstruite(s);
function banc(nom, f, n = 2000) {
  f();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) f();
  console.log(nom.padEnd(32), ((performance.now() - t0) / n * 1000).toFixed(1).padStart(8), 'µs');
}
banc('tick(0,2 s)', () => E.tick(s, 0.2));
banc('chapterProgress', () => E.chapterProgress(s));
banc('piecesCloses (cache chaud)', () => E.piecesCloses(s));
banc('toits (cache chaud)', () => E.toits(s));
banc('etage2Emprise (cache chaud)', () => E.etage2Emprise(s));
banc('conseilsPieces (cache chaud)', () => E.conseilsPieces(s));
banc('JSON.stringify(partie)', () => JSON.stringify({ v: s.version, t: 0, s }), 300);
```

Résultats du 2026-11-06 (version 1.22.0) :

| Mesure | Coût | Remarque |
|---|---|---|
| `tick(0,2 s)` | 186 µs | dont `chapterProgress` 160 µs (86 %) |
| `piecesCloses`, cache chaud | 45 µs | la clé du cache est `JSON.stringify` des blocs (8,9 Ko) |
| `conseilsPieces`, cache chaud | 46 µs | même clé |
| `etage2Emprise`, cache chaud | 61 µs | clé : blocs de l'étage + hauteurs |
| `toits`, cache chaud | 98 µs | clé : blocs + étage + sols + hauteurs + rehausses (≈ 18 Ko) |
| `JSON.stringify` de la partie | 137 µs, 26 237 caractères | la sauvegarde tient son budget (16 ms) |
| `simulateOffline`, 8 h | 17 ms | une fois, à l'ouverture |

Dans la page, les mêmes mesures passent par 🧪 Test › 📏 Mesures (`js/ui/chrono.js`, « Mesurer 30 s »,
« Mesurer Construire ») : chaque piste doit y montrer son gain, avant et après, sur la ferme d'essai.

## 1. Une révision des blocs à la place des clés JSON

### Constat

Les caches des calculs sur les blocs posés vérifient qu'ils sont encore bons en **sérialisant** ce dont
ils dépendent, à chaque appel :

- `piecesCloses` et `conseilsPieces` (`js/engine/blocs.js`) : `W + ':' + JSON.stringify(B)` ;
- `etatEnclos` (`blocs.js`) : la graine, les blocs et les cases des arbres ;
- `etage2Emprise` (`js/engine/etage.js`) : les blocs de l'étage et les hauteurs ;
- `toits` (`etage.js`) : les blocs, ceux de l'étage, les sols posés, les hauteurs et les rehausses.

Un succès de cache coûte donc 45 à 98 µs sur ordinateur (0,2 à 0,5 ms sur le téléphone de référence),
là où une comparaison d'entiers coûterait moins de 0,1 µs. Or ces fonctions sont appelées souvent :
`piecesCloses` a 25 sites d'appel, `etageEmprise` 15, `toits` et `etage2Emprise` 3 chacune ; le modèle de
la carte (`stageModel`, 5 fois par seconde) et chaque case testée par Construire y passent. C'est le résidu
de « 0,16 ms par appel » noté dans `docs/perf.md` pour les toits après leur mise en cache : ce qui reste,
c'est la clé.

`enLot` / `memoLot` (`blocs.js`) évite déjà les recalculs **pendant** un lot de Construire ; la révision
rend le même service **entre** les lots et entre les images.

### Proposition

Un numéro de révision, hors de la sauvegarde (il ne change pas le format : pas de migration), porté par
l'identité de l'objet `state.blocs` dans une `WeakMap` :

```js
// js/engine/revision.js
const revs = new WeakMap();           // objet (state.blocs, state.hauteurs…) → compteur
export function revision(objet) { return (objet && revs.get(objet)) || 0; }
export function toucher(objet) { if (objet) revs.set(objet, revision(objet) + 1); }
// la clé d'un cache : des entiers, plus de JSON
export const cleBlocs = (s) => `${revision(s.blocs)}:${revision(s.hauteurs)}:${revision(s.sols)}:${revision(s.solsEtage)}:${revision(s.rehausses)}`;
```

- **Où appeler `toucher`** : aux points qui écrivent dans `state.blocs`, `state.hauteurs`, `state.sols`,
  `state.solsEtage`, `state.rehausses` (29 écritures relevées : `blocs.js` 13, `etage.js` 5,
  `demenagement.js` 4, `testmode.js` 4, `styles.js` 2, `repas.js` 1). Mieux : les faire passer par deux
  aides, `poserBloc(state, tuile, sorte)` et `retirerBloc(state, tuile)`, qui touchent la révision ; un
  test interdit alors toute écriture directe (`grep` dans `tests/engine/`).
- **Pourquoi l'identité de l'objet** : une copie d'essai (`{ ...state }`, `poseStatus`) partage l'objet
  `blocs` et donc sa révision ; une partie relue (`JSON.parse`), importée ou migrée a un objet neuf, donc
  une révision à 0 et un cache invalidé d'office. Aucun cas où un ancien résultat survit à un objet
  différent.
- **Les caches** : `piecesCloses`, `conseilsPieces`, `etatEnclos`, `etage2Emprise`, `toits` (et
  `piecesNiveau`, `etage.js:509`) remplacent leur clé JSON par `cleBlocs(s)` (plus la graine ou les arbres là
  où ils comptent).

### Fichiers

`js/engine/blocs.js`, `js/engine/etage.js`, `js/engine/demenagement.js`, `js/engine/styles.js`,
`js/engine/repas.js`, `js/engine/testmode.js`, nouveau `js/engine/revision.js`, `tests/engine/caches.test.mjs`.

### Critères d'acceptation

- Les cinq fonctions donnent, sur toutes les parties de `tests/engine/ferme-generee.cas.mjs` et
  `anciennes-parties.json`, le même résultat qu'avec l'ancienne clé JSON (un test garde l'ancienne clé le
  temps de la transition et compare).
- Un succès de cache coûte moins de 1 µs en Node (`banc`).
- Dans la page, « Mesurer Construire » : le poste « modèle de la carte » baisse ; aucune pièce close, toit
  ou conseil ne reste affiché après une pose ou un retrait (essai manuel : poser, retirer, importer une
  partie, « Recommencer à zéro »).

### Hors périmètre

Le format de sauvegarde ; `enLot` (il reste utile pendant un lot) ; les caches des régions du monde
(`terrain.js`, `monde-vu.js`), déjà portés par des `WeakMap`.

## 2. Le son : ne plus garder en mémoire le PCM des boucles longues

### Constat

`js/son.js` charge chaque fichier par `fetch` puis `decodeAudioData`, et garde l'`AudioBuffer` dans
`tampons` (une `Map` fichier → promesse) **sans jamais le libérer**. Un `AudioBuffer` est du PCM en
nombres flottants : 4 octets par échantillon et par canal, à la fréquence du contexte.

- `musique_matin.ogg` : 45,7 s, stéréo, 44,1 kHz → 45,7 × 44 100 × 2 × 4 ≈ **16 Mo** une fois décodée
  (davantage sur un Android dont le contexte est à 48 kHz : le navigateur rééchantillonne) ; 9 musiques.
- Les ambiances (36 fichiers de 30 à 40 s) : 10 à 14 Mo chacune.
- Le fichier compressé pèse 20 à 30 fois moins (0,5 Mo).

Une session qui traverse les biomes (côte, forêt, montagne, hameau, mine, fête) et les moments de la
journée peut ainsi retenir plusieurs centaines de Mo d'audio, alors que la mesure du téléphone donne 82 à
117 Mo pour tout le jeu après l'ouverture. C'est de la mémoire que le navigateur peut reprendre en tuant
l'onglet en arrière-plan (d'où, peut-être, des parties qui repartent du dernier enregistrement).

### Proposition

Deux mécanismes, du plus simple au plus profitable :

1. **Libérer les boucles éteintes.** Quand `boucle()` a fini le fondu vers 0 et arrêté sa source, retirer
   le tampon de `tampons` (le fichier reste dans le cache HTTP du navigateur : le rejouer coûte un
   `decodeAudioData`, quelques dizaines de ms, hors fil principal). Garder au plus N tampons de boucles
   (N = 4 : la musique du moment, deux ambiances, une machine) en LRU.
2. **Lire la musique en flux.** Pour le bus `musique` (et, si l'essai est bon, `nature`) : un élément
   `new Audio(url)` (`loop = true`, `crossOrigin` inutile : même origine) branché dans le graphe par
   `ctx.createMediaElementSource(el)` → le `GainNode` de la boucle → `duck` → `maitre`. Le décodage est
   fait par le codec de la plateforme, au fil de la lecture, sans PCM côté JS ; les fondus, le ducking, les
   volumes et le mode « intermittente » restent les mêmes puisqu'ils agissent sur les gains. Un
   `MediaElementAudioSourceNode` ne peut être créé qu'une fois par élément : garder l'élément avec la boucle.

Le son est identique : même fichier, même chaîne de gains, même compresseur.

### Fichiers

`js/son.js` (`tampon`, `boucle`, `musique`), `docs/son.md` (le paragraphe « comment c'est joué »).

### Critères d'acceptation

- Dans Chromium, onglet Mémoire (ou `performance.measureUserAgentSpecificMemory()` dans le rapport de
  📏 Mesures) : après avoir visité la côte, la forêt, la montagne, un hameau et la mine (mode test : se
  téléporter), la mémoire du jeu reste dans la fourchette d'avant les visites (± 30 Mo), au lieu de croître
  de 10 à 16 Mo par lieu.
- Aucun clic, aucun trou dans les fondus de musique (écouter un changement de lieu et une tombée de la
  nuit) ; Safari iOS : la musique démarre au premier geste, comme avant (`demarre()`).
- `tests/test-telemetry.mjs` et `node tests/smoke.mjs` sans erreur.

### Hors périmètre

Les effets courts (gestes, interface) restent des `AudioBuffer` : leur latence compte. Les fichiers eux-mêmes
ne changent pas (pas de passage en mono : le rendu doit rester le même).

## 3. Découper le regroupement et charger à la demande

### Constat

À chaque ouverture, la page lit et compile tout le JavaScript du jeu : les modules regroupés
(`js/engine/` + `js/ui/` + données générées : 2,76 Mo de source), les scripts classiques des cartes (1,26 Mo)
et Phaser (1,38 Mo). `docs/perf.md` chiffre ce poste à ≈ 1,7 s à 4 × de ralentissement. Or une part de ce
code ne sert pas au premier écran :

| Ce qui pourrait attendre | Taille (source) | Quand il sert |
|---|---|---|
| `js/grotte.js` (scène de la mine) | 778 lignes | à l'entrée de la mine ou d'une grotte |
| `js/engine/testmode.js`, `js/ui/testmode.js`, `js/ui/mesures.js`, `js/ui/chrono.js` | ≈ 1 300 lignes | panneau de mode test activé |
| `js/encyclopedie.generated.js` + `js/ui/encyclopedie.js` | 161 Ko + UI | à l'ouverture de l'Encyclopédie (`majEncyclopedie` au chargement : 0,33 s, perf.md) |
| `DATA.RECIT` et `DATA.COURRIER` dans `js/data.generated.js` | 42 Ko + 8 Ko | au premier dialogue, à la première lettre |
| `js/ui/en-ligne.js`, `synchro.js`, `compte.js` | ≈ 1 000 lignes | un monde en ligne ou un lien d'invitation |
| `js/ui/excursion.js` et la carte du monde (`carte-monde.js`) | ≈ 800 lignes | une excursion, la carte ouverte |

### Proposition

- **Découper le regroupement** : dans `scripts/build-site.mjs`, `esbuild.build({ entryPoints: [ENTRY],
  splitting: true, format: 'esm', chunkNames: 'js/[name]-[hash]', … })`. esbuild met dans des morceaux
  séparés ce qui n'est atteint que par `import()` ; `jeu.html` continue de charger `js/main.js` en module.
- **Un registre paresseux d'écrans.** Aujourd'hui « chaque écran s'inscrit en se chargeant »
  (`registerActions` dans chaque module, importés à effet de bord par `main.js`). Pour les écrans rares,
  un module léger `js/ui/paresseux.js` inscrit l'action et charge le module au premier appui :

  ```js
  registerLazy({
    'open-encyclopedie': () => import('./encyclopedie.js'),
    'test-panel': () => import('./testmode.js').then(() => import('./mesures.js')),
    'open-carte-monde': () => import('./carte-monde.js'),
  });
  // registerLazy : registerActions({ [action]: async (...a) => { await charger(); return rejouer(action, ...a); } })
  ```

  Le rendu (`render.js`) appelle `renderEncyclopedie()` etc. seulement si le module est chargé (une
  fonction `siCharge('encyclopedie', (m) => m.renderEncyclopedie())`).
- **La mine** : `js/grotte.js` reste un script classique, injecté par `<script src>` (adresse versionnée,
  `js/assets-versions.js`) depuis `js/ui/excursion.js` au premier passage, avant de créer la scène ; une
  promesse attend son `load`.
- **Les textes** : `scripts/build-data.mjs` écrit `RECIT` et `COURRIER` dans `data/textes.generated.json`
  (versionné comme les images) ; `js/engine/catalog.js` les expose par une promesse `DATA.textes()` que
  `recit.js`, `campaign.js` (`mailText`) et `aide.js` attendent. Le moteur en Node (tests) les charge
  d'emblée.
- **L'encyclopédie au chargement** : `majEncyclopedie` (les découvertes) n'a besoin que des identifiants
  d'entrées, pas des textes : séparer `encyclopedie.generated.js` en un index (ids, catégories) et des
  textes chargés à l'ouverture.

### Critères d'acceptation

- `npm run build` produit un `js/jeu.bundle.js` plus petit d'au moins 20 % et des morceaux ; la page
  vérifiée par `tests/smoke.mjs` ne montre aucune erreur, hors ligne compris (les morceaux sont servis par
  le même dossier).
- « Jeu affiché » (📏 Mesures, ferme d'essai, Chromium ralenti ×4) baisse ; noter le chiffre dans
  `docs/perf.md`.
- Ouvrir l'Encyclopédie, le mode test, la mine, la carte du monde et un dialogue du récit : tout
  fonctionne au premier essai, avec un éventuel délai inférieur à 300 ms sur ordinateur.

### Hors périmètre

Les scripts classiques des cartes (`js/carte/`, `farm-stage.js`) restent chargés d'emblée : la carte est
le premier écran. Phaser n'est pas touché ici.

## 4. Des atlas pour les ~170 petites images

### Constat

`preload()` (`js/farm-stage.js`) charge ≈ 55 fichiers d'images, puis `chargerTard()` 114 `meuble_*.png`
(vues de face, de dos, de profil, draps) et les planches de faune. Chaque fichier = une requête HTTP, un
décodage, un `texImage2D` (le poste « images préparées et envoyées à la carte graphique », ≈ 2,4 s dans
l'analyse du 2026-11-03), une texture de plus à changer au dessin. `assets/` compte 1 277 PNG pour 2,9 Mo :
le poids n'est pas le problème, le nombre l'est.

Le dépôt a déjà la mécanique : `scripts/icones/build.py` assemble `assets/icones.png` et sa table
(`js/ui/icones.generated.js`), et `kit.js` a `extrude()` pour les bords répétés.

### Proposition

- Un générateur `scripts/carte/atlas.py` qui assemble, au format d'atlas de Phaser (JSON « hash » :
  `{ frames: { nom: { frame: { x, y, w, h } } } }`), trois planches : `meubles.png` (toutes les vues et
  draps), `ferme.png` (puits, citerne, asperseur, robot, station, herbe haute, verger, arbres…) et
  `monde.png` (lieux, tente, faune). Un pixel de marge entre les cases (pas d'effet de bord au zoom non
  entier) ; taille au plus 2 048 × 2 048 (les téléphones d'entrée de gamme).
- Dans la scène : `L.atlas('meubles', v('meubles.png'), v('meubles.json'))` ; les
  `this.add.image(x, y, 'meuble_' + nom)` deviennent `this.add.image(x, y, 'meubles', nom)`. Une fonction
  `imageDe(cle)` → `{ texture, frame }` centralise la correspondance pour ne pas toucher cinquante
  appels à la main ; `makePlaceholders` et `missing` (les dessins de secours) suivent.
- Les planches animées (`spritesheet`) peuvent entrer dans l'atlas avec des cases nommées `nom_0`, `nom_1`…
  ou rester telles quelles dans un premier temps.
- `scripts/build-site.mjs` : vérifier qu'aucune carte ni aucun script ne demande encore une image mise
  dans un atlas (comme la vérification des planches des cartes Tiled).

### Critères d'acceptation

- Une capture de la ferme d'essai (Playwright, zoom 1 et zoom 2,5) est identique au pixel près avant et
  après (comparer les PNG).
- Le nombre de requêtes d'images à l'ouverture passe d'environ 170 à moins de 20 (onglet Réseau).
- « Jeu affiché » et le temps jusqu'à l'apparition des meubles (`chargerTard`) baissent ; chiffres dans
  `docs/perf.md`.

### Hors périmètre

Les planches de personnages (`assets/personnages/`, chargées à la demande par `habitants.js`) et
`icones.png` (déjà une planche).

## 5. Les cadences : veilleurs et objectifs au rythme du tick

### Constat

`frame()` (`js/ui/loop.js`) tourne à chaque image (60 Hz, 120 Hz sur le téléphone de référence) et y
appelle, après la boucle à pas fixe, une vingtaine de veilleurs : `watchSetup`, `watchRecit`,
`watchTechPoints`, `watchDay`, `watchMail`, `watchCaleche`, `watchBienvenue`, `watchRobot`,
`watchPresents`, `watchDemandes`, `watchMeteo`, `watchFetes`, `watchInvitations`, `watchPlans`,
`watchPreparations`, `watchUnlocks`, `watchAbsence`, `watchChapters`, `watchLevels`. Chacun est peu
coûteux, mais ils font des requêtes DOM (`getElementById('modal-root')`, `querySelector('#toast-root
.toast.lettre')`, `document.body.classList`) et des calculs du moteur (`scenesPossibles` 14,5 µs,
`uiCalm`, `mailbox`, `tabAvailable` → `marcheOuvert`). Or tout ce qu'ils observent ne change qu'au tick
(toutes les 200 ms) ou sur un geste du joueur. À 120 Hz, c'est 24 fois trop souvent.

Dans le moteur, `tick()` appelle `updateChapters` à chaque pas : `chapterProgress` (160 µs sur
ordinateur, soit 86 % du tick) évalue tous les objectifs du chapitre 5 fois par seconde, puis
`deliverMail` et `checkMastery`. Des objectifs dépendent de quantités qui bougent au tick (l'énergie
stockée), on ne peut pas ne les évaluer que sur un geste ; mais à 1 Hz, nul ne verrait la différence.

Enfin, la page a deux boucles `requestAnimationFrame` (`frame` et `renderLoop`) pour un seul travail.

### Proposition

- Dans `frame()`, les veilleurs passent sous `if (ticked)` ; `refresh()` (`render.js`, appelé après chaque
  action) lance aussi un passage de veilleurs, pour qu'une action soit suivie dans l'image : la latence
  reste ≤ 200 ms, celle du rendu déjà lissé à `RENDER_THROTTLE_MS`. `watchSetup` reste à chaque image
  s'il gère la saisie de la configuration.
- `renderLoop` fusionné dans `frame()` (le rendu après les veilleurs, même garde `renderScheduled` /
  `RENDER_THROTTLE_MS`).
- Dans `tick()` (`js/engine/energy.js`), `updateChapters` et `refreshUnlocks` toutes les
  `CHAPITRES.PAS_TICKS` = 5 itérations (un compteur dans `state.jour`, hors sauvegarde si possible, sinon
  sans migration : `reparerPartie` le remet à 0), et toujours à la fin de `simulateOffline`, de la nuit et
  de chaque action qui peut finir un objectif (`completeChapter` est déjà appelé par les actions qui
  comptent : vérifier).

### Critères d'acceptation

- `tests/engine/chapitres.test.mjs` passe sans changer les attentes de délai supérieur à 1 s ; un test
  vérifie qu'un objectif atteint par un geste est reconnu dans le même appel.
- Le compteur d'appels de veilleurs (un `mesurer()` par veilleur dans `chrono.js`) montre ≈ 5 appels par
  seconde au repos au lieu de 60 à 120 ; le poste « moteur : tick » baisse d'au moins 60 %.
- Les annonces (lettre, chapitre, « prêt ! », nuit) arrivent comme avant lors d'une partie d'essai de
  trois journées en mode test.

## 6. Le modèle de la carte mémorisé par sections

### Constat

`stageModel()` (`js/ui/stage.js`) reconstruit le modèle complet 5 fois par seconde : parcelles, Serre,
arbres, bâtiments, hauteurs, fenêtres, rehausses, `etatMoulin` (72 µs), `aFaireParLieu`, habitants,
faune, brouillard, boussole… Puis `FarmStage.update()` le compare en profondeur (`pareil()`) au
précédent. Dès qu'un champ change (l'heure au quart d'heure, un badge, une bête qui bouge), le modèle
entier est redonné à `sync()`, qui refait ses comparaisons objet par objet.

### Proposition

Avec la révision de la piste 1 et une révision générale `revPartie` (touchée par `tick` quand l'état
visible change, par chaque action, par la nuit), chaque section du modèle est mémorisée :

```js
const sections = new Map(); // nom → { cle, valeur }
function section(nom, cle, calcul) {
  const m = sections.get(nom);
  if (m && m.cle === cle) return m.valeur;
  const valeur = calcul();
  sections.set(nom, { cle, valeur });
  return valeur;
}
// dans stageModel :
const blocs = section('blocs', cleBlocs(state), () => blocsVue(state));
const habitants = section('habitants', `${state.day}:${heure}`, () => habitantsVue(state));
```

Une section inchangée est **le même objet** d'un appel à l'autre : `pareil()` la reconnaît par `===`
sans la parcourir, et `sync()` peut, s'il reçoit l'ancienne référence, sauter le bloc correspondant.
Le modèle reçu par la scène garde exactement sa forme (docs/architecture-phaser.md § 1).

### Critères d'acceptation

- Le poste « interface : modèle de la carte » (📏 Mesures) baisse d'au moins moitié au repos.
- Tout ce qui bouge bouge encore : une pousse, un arrosage, la nuit, un habitant, une ruche pleine, un
  bloc posé (essai manuel sur la ferme d'essai, et `tests/engine/caches.test.mjs` pour les clés).

### Hors périmètre

La scène (`sync`) ne change pas de contrat ; la piste 1 doit être livrée d'abord.

## Bonus

- **Style et pages minifiés** : `scripts/build-site.mjs` copie `css/jeu.css` (156 Ko, 37 Ko compressé) et les
  pages telles quelles. `esbuild.transform(css, { loader: 'css', minify: true })` est gratuit avec la
  dépendance existante ; `encyclopedie.html` (299 Ko) gagnerait aussi à être généré compact.
- **Un Service Worker « cache d'abord »** sur `assets/`, Phaser et les fichiers versionnés (`?v=…`) : les
  rechargements deviennent instantanés et le jeu reste jouable sans réseau (il n'a besoin d'aucun
  serveur ; seul le suivi de session, facultatif, envoie des données). L'adresse versionnée garantit la
  fraîcheur ; le Worker ne touche pas au suivi ni aux pages en ligne (`jeu.html?monde=…`).

## Livraison d'une piste

Comme une fiche de `docs/fiches/` : une branche, un commit en français, `npm run build` puis `npm test`
« Tout est vert », `node tests/smoke.mjs` sans erreur, la mesure avant/après dans `docs/perf.md`, et
l'état de la piste mis à jour dans le tableau ci-dessus.
