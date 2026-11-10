# Fiche 29 — Le sol peint dans un Worker (OffscreenCanvas) et la teinte de l'herbe qui en sort

> **Fait (2026-11-10), sans Worker, d'après les mesures** : la peinture des morceaux de sol ne coûtait que
> ≈ 0,27 s au chargement (ralenti ×4) ; la teinte de l'herbe haute, ≈ 0,93 s, peignait toute la région
> pour lire quelques pixels sous chaque touffe. Elle est 3 fois plus rapide, mêmes teintes. Voir « Ce qui
> a été fait » en fin de fiche.

Chantier « Phaser 4 », piste 5 du rapport (seconde moitié). Dépend de la fiche 28 (le Worker « carte » et
le repli sans Worker).

## Objectif

Que la peinture des régions (≈ 1,4 s pour deux régions, ralenti ×4) et la teinte de l'herbe haute
(≈ 1,2 s d'un bloc juste après l'affichage) ne bloquent plus le fil principal : les morceaux de sol peints
dans un Worker sur un `OffscreenCanvas`, rendus en `ImageBitmap`, et la teinte lue au même endroit.

## Contexte

- La peinture : `js/carte/ferme/sol.js` (`paintRegion`, des morceaux de 256 px peints tuile par tuile avec
  `drawImage` dans des canvas, puis envoyés au GPU) ; le filet de sécurité `repairGround` (`docs/perf.md`,
  « Le filet de sécurité du sol »).
- La teinte de l'herbe haute : `js/carte/ferme/decor.js` (vers les lignes 250 à 300) : la couleur moyenne
  du fond autour du pied de chaque touffe, lue avec `getImageData` dans le sol peint de toutes les régions
  qui ont des touffes ; les touffes attendent leur teinte pour se montrer. Elle dépend donc de la
  peinture : la sortir du fil principal, c'est la calculer là où le sol est peint.
- Les planches du sol (`farm_spring_summer`, `sols_monde`) et le sol du monde déjà calculé par
  `js/monde-worker.js`.
- Point à vérifier sur Phaser 4.2.1 : que le gestionnaire de textures accepte un `ImageBitmap` comme
  source (`textures.addImage` ou une `CanvasTexture` dans laquelle on le dessine : un seul `drawImage`,
  bien plus court que la peinture tuile par tuile).
- `OffscreenCanvas` et le transfert d'`ImageBitmap` existent dans les navigateurs visés (vérifier Safari
  iOS ; sinon, le repli : la peinture sur le fil principal comme aujourd'hui).

## À faire

1. Un essai court, à joindre à la PR : un morceau de 256 px peint dans un Worker, rendu en `ImageBitmap`,
   posé comme texture ; le temps de bout en bout comparé à la peinture actuelle.
2. Si l'essai est concluant : le Worker reçoit les planches une fois (`ImageBitmap` transférés), puis, par
   morceau, la liste des tuiles (les couches de chaque case, déjà dans les tableaux du monde) ; il peint et
   renvoie le morceau. `sol.js` pose la texture à l'arrivée ; les morceaux sous la vue d'abord.
3. La teinte des touffes calculée dans le Worker, sur le morceau qu'il vient de peindre, et renvoyée avec
   lui (un tableau de couleurs par touffe) ; `decor.js` ne lit plus de pixels.
4. Le repli (sans Worker ou sans `OffscreenCanvas`) garde le chemin actuel.
5. Revoir le filet de sécurité `repairGround` : s'il ne sert plus, le dire dans la PR, ne pas le retirer
   dans cette fiche.

## Hors périmètre

- Remplacer le sol peint par un `TilemapGPULayer` (fiche 34 : l'essai décidera ; si le sol GPU l'emporte,
  cette fiche perd son objet pour le sol, pas pour la teinte).
- Changer la teinte elle-même (même calcul, même résultat).

## Critères d'acceptation

- Le sol et l'herbe haute identiques au pixel près (captures avant et après, ferme et grand monde).
- Plus aucune tâche du fil principal de plus de 100 ms due à la peinture ou à la teinte (profil, ralenti
  ×4) ; le temps jusqu'à la vue dessinée ne monte pas.
- Le repli marche (Worker désactivé à la main).

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium ralenti ×4, la sauvegarde du jour 75 et
une partie neuve ; marcher vers une région pas encore peinte.

## Livraison

Un commit ; `docs/perf.md` et `docs/architecture-phaser.md` mis à jour.

## Ce qui a été fait (les mesures : Chromium, processeur ralenti 4 fois, la sauvegarde du jour 75)

- **Mesuré au chargement** : la peinture des morceaux de sol (`paintMorceau`) ≈ 0,27 s, la teinte de l'herbe
  haute (`tintTallGrass`) ≈ 0,93 s. Le reste du chargement est ailleurs : la création de la scène et le
  modèle (≈ 2,5 s), les objets du décor des régions (`showRegionObjs`, ≈ 0,7 s), la génération de la ferme
  (≈ 1 s), l'eau (≈ 0,5 s). Peindre le sol dans un Worker ne vaut pas le transfert des planches et des
  images.
- **La teinte de l'herbe haute** (`decor.js`, `tintTallGrass`) : elle peignait chaque région entière (1 056 ×
  1 056 px, toutes les couches) dans un canevas de travail, puis en relisait tous les pixels (4,4 Mo),
  pour une fenêtre de 16 × 6 px sous chaque touffe. Elle ne peint plus que les cases de ces fenêtres (les
  tuiles se dessinent case par case : les mêmes pixels là où on lit) et ne relit que chaque fenêtre.
  ≈ 930 ms → ≈ 310 à 350 ms ; les 4 267 touffes de la partie ont exactement la même teinte (comparé dans
  Chromium, ancienne et nouvelle méthode sur la même partie, sur la ferme et dans le grand monde). La plus
  longue tâche après l'affichage : ≈ 1,0 s → 0,5 à 0,7 s.
