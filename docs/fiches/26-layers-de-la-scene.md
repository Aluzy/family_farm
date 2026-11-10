# Fiche 26 — La scène rangée en Layers : sol, monde trié, ciel, voiles

Chantier « Phaser 4 », piste 2 du rapport.

## Objectif

Que bouger un personnage ne relance plus le tri de profondeur de toute la scène : les images de la
carte rangées dans quatre `Layer` Phaser, dont un seul se trie, et seulement quand l'un de ses enfants
a changé de profondeur.

## Contexte

- Aujourd'hui toutes les images (≈ 4 700 sur une grosse partie, `docs/perf.md`) sont dans la liste
  d'affichage de la scène ; le code appelle `setDepth` à 186 endroits (`grep -rn setDepth js | wc -l`).
  Chaque acteur qui bouge relance le tri de toute la liste.
- Un `Layer` (Phaser 4, `GameObjects.Layer`) est une liste d'affichage à part entière : `setDepth` d'un
  enfant ne le range qu'à l'intérieur de son Layer, et le Layer ne se trie que si `sortChildrenFlag` est
  levé. La profondeur d'un Layer le range parmi les autres objets de la scène.
- Les profondeurs actuelles : les constantes de `js/carte/ferme/config.js` et des parties
  (`PROFONDEUR` de `meteo.js`, le voile de la nuit à 1e6, le brouillard au-dessus de tout,
  `docs/architecture-phaser.md` § 1 ter) ; le rangement selon le pied (`depth = y` du pied, fiches 5b,
  16).
- Ce qui ne se trie jamais : les morceaux de sol peints (`js/carte/ferme/sol.js`), l'eau
  (`js/carte/eau.js`), la terre labourée, les flaques, les traces.
- Ce qui vole ou couvre : l'aigle, les oiseaux en vol (`faune-monde.js`, `ambient-life.js`), la pluie
  (`meteo.js`), le voile de la nuit (`CarteKit.voile`), le brouillard (`brouillard.js`), la brume.
- Les intérieurs posés à droite de la carte restent hors du voile (§ 1 ter) : ils gardent ce rang.
- Le filtre de la caméra (`cameraFilter`, `brouillard.js`) et le culling de la scène doivent continuer à
  marcher sur les enfants d'un Layer (le vérifier : un objet dans un Layer n'est plus dans
  `scene.children.list`).

## À faire

1. Recenser toutes les profondeurs fixes (une table dans la PR : la partie, sa profondeur, son Layer).
2. Créer quatre Layers à la création de la scène : **Sol** (jamais trié), **Monde** (tout ce qui se range
   selon le pied : personnages, bêtes, arbres, rochers, bâtiments, blocs, meubles), **Ciel** (ce qui vole,
   la pluie), **Voiles** (nuit, brouillard, brume, lueurs dans le voile). Un petit utilitaire du kit
   (`CarteKit.range(objet, 'monde')`) pour que chaque partie dise où va son objet, plutôt que
   `this.add.existing` partout.
3. Dans le Layer Monde, le tri ne se fait que quand un enfant a changé de profondeur dans l'image (Phaser
   lève `sortChildrenFlag` à chaque `setDepth` : vérifier qu'un `setDepth` à la même valeur ne le lève
   pas, sinon ne l'appeler que si la valeur change).
4. Migrer partie par partie, en commençant par le sol (le plus gros nombre d'objets, aucun tri), puis le
   ciel et les voiles, enfin le monde. Chaque étape est jouable seule.
5. Vérifier le culling, le filtre du brouillard (`sousBrume`), les appuis (`hitAt`), les occulteurs (les
   arbres qui s'effacent devant le personnage) et les intérieurs.

## Hors périmètre

- Les objets GPU (`SpriteGPULayer`, `TilemapGPULayer` : fiche 34) ; ils s'appuieront sur ce rangement.
- Changer l'apparence de quoi que ce soit : l'image doit rester identique au pixel près.

## Critères d'acceptation

- Les captures avant et après sont identiques (ferme, grand monde, nuit, pluie, brouillard, intérieur,
  mode Construire) : comparer pixel à pixel dans Chromium (`deviceScaleFactor: 1`).
- Le temps de tri par image (profil Chromium ou 🧪 **Mesurer 30 s**) baisse nettement près des ruches et
  dans le grand monde ; chiffres avant et après dans la PR et dans `docs/perf.md`.
- Aucune régression des appuis : toucher un arbre, une bête, un habitant, un bloc, un meuble.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium sur la sauvegarde du jour 75
(`docs/perf.md`, « Près des automates ») et dans le grand monde ; captures comparées.

## Livraison

Un commit ; `docs/architecture-phaser.md` (une section « Les Layers » : lequel contient quoi) et
`docs/perf.md` mis à jour.
