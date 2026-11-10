# Fiche 27 — Trois petites corrections : la pluie en particules, les shaders prêts, moins d'allocations

> **Fait (2026-11-10), d'après les mesures** : seuls les shaders préparés d'avance gagnaient vraiment ;
> la pluie et les allocations, mesurées, ne coûtaient presque rien et n'ont pas été touchées. Voir
> « Ce qui a été fait » en fin de fiche.

Chantier « Phaser 4 », pistes 3 et 4 du rapport et ses « petites corrections ».

## Objectif

Retirer trois coûts par image sans rien changer à ce qu'on voit : la pluie redessinée par le processeur,
les à-coups à la première eau vue, et les petits tableaux créés à chaque image.

## Contexte

- **La pluie** : `js/carte/ferme/meteo.js` (`PLUIE.N` = 140 traits dans une seule `Graphics`, redessinée à
  chaque image, `this.add.graphics()` vers la ligne 64). Une `Graphics` refaite par image, c'est une
  géométrie refaite par le processeur.
- **Les shaders** : l'eau vivante (`js/carte/eau.js`, `EAU_FRAG`, `EAU_MER`) compile ses shaders la
  première fois qu'une étendue paraît ; l'option de jeu `skipUnreadyShaders` (Phaser 4.2.1) compile en
  parallèle et ne dessine pas un objet tant que son shader n'est pas prêt (risque : l'eau qui apparaît une
  image plus tard). La retouche des shaders à la compilation (`shadersArrondis`, `js/carte/jeu.js`) doit
  continuer à s'appliquer.
- **Les allocations** : `['repos', 'marche', 'plonge'].includes(b.etat)` dans `faune-monde.js` (ligne 234,
  un tableau par bête et par image) ; `cellOf` dans `js/fermier.js` (ligne 146) renvoie un tableau à chaque
  test de case. D'autres du même genre sont à trouver dans les étapes appelées à chaque image.
- L'écran de chargement (`jeu.html`, `vueDessinee`) : le bon moment pour préparer les shaders.

## À faire

1. **La pluie** en `ParticleEmitter` (une petite texture de trait de 1 × `PLUIE.LONG` px générée une fois,
   la pente et la vitesse de `PLUIE`, l'émission sur la largeur de la vue, la durée de vie réglée pour
   sortir de la vue, l'abri sous un toit comme aujourd'hui) — ou, si l'émetteur rend mal le biais, un
   shader plein écran. Même nombre de traits à l'écran, même couleur, même alpha, même fondu d'entrée et de
   sortie (`FONDU_MS`), même voile.
2. **Les shaders** : essayer `skipUnreadyShaders: true` ; créer pendant l'écran de chargement une étendue
   d'eau hors vue (douce et de mer) pour forcer la compilation, puis la retirer. Garder l'option seulement
   si aucune eau n'apparaît en retard (captures image par image au premier lac vu).
3. **Les allocations** : des constantes (`const FUIT = new Set([...])`), `cellOf` qui écrit dans un
   objet réutilisé ou renvoie un indice de case ; chercher les autres dans les fonctions `step*` (les
   littéraux de tableau ou d'objet, `map`/`filter` sur des listes à chaque image) et ne corriger que celles
   qui tournent à chaque image.

## Hors périmètre

- L'eau elle-même (fiche 24, étapes 5 et 6).
- Les brins et les gravillons (triés selon le pied qui les lève : ils restent des images).

## Critères d'acceptation

- La pluie se voit comme avant (captures côte à côte dans la PR, de jour et de nuit, dehors et sous un
  toit) ; son coût par image (profil Chromium) baisse.
- Aucune image saccadée au premier lac ou à la première mer vus (mesure des longues images, ou rien de
  pire qu'avant).
- Moins de passages du ramasse-miettes en marchant 30 s dans le grand monde (profil mémoire).

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium : une sauvegarde à un jour et une heure où
`pleut(state)` est vrai (`js/engine/meteo.js`), marcher ; 🧪 **Mesurer 30 s** avant et après.

## Livraison

Un commit ; `docs/perf.md` (mesures) mis à jour.

## Ce qui a été fait (les mesures : Chromium, la sauvegarde du jour 75)

- **Les shaders, préparés d'avance** (`CarteJeu.prechauffe`, `tachesLots`, `js/carte/jeu.js` ;
  `eauPrechauffe`, `js/carte/eau.js`) : au premier passage à la mer, Phaser compilait et liait 5 à 6
  programmes d'un coup (le shader de la mer et des variantes du lot d'images standard, une par nombre de
  textures du lot : 9, 10, 12, 13), 30 à 90 ms d'appels WebGL au milieu d'une image. Ils se préparent
  maintenant un par un, 4 s après la création de la scène, pendant les temps morts de la page
  (`requestIdleCallback`, 250 ms au plus entre deux) : chaque tâche coûte au plus ≈ 5,5 ms. Au premier
  passage à la mer : plus aucun programme compilé (0 ms d'appels WebGL). `skipUnreadyShaders` n'est pas
  posé : il ne dessine pas ce dont le shader n'est pas prêt, et un lot entier d'images (le décor) pouvait
  disparaître quelques images.
- **La pluie, gardée telle quelle** : mesurée sous une averse (alternée 4 fois, avec et sans les
  gouttes), elle coûte ≈ 0,065 ms au rendu et ≈ 0,05 ms à `syncMeteo` par image, ≈ 0,1 ms en tout. Un
  émetteur de particules ou un shader ne gagnerait presque rien et changerait son allure.
- **Les allocations, laissées** : un profil d'allocations (échantillonnage du tas, 10 s de marche dans le
  grand monde) donne ≈ 4,4 Ko par image en tout, Phaser compris ; les deux cas cités (`includes` de
  faune-monde.js, `cellOf` de fermier.js) n'y paraissent même pas (V8 les élimine).
