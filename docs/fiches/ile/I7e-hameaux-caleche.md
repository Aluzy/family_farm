# Fiche I7e — Les hameaux, la calèche et les boucles de chemins retirés

## Objectif

Faire qu'une partie `ACTIF` naisse sur une île sans hameau, sans habitant, sans calèche, avec pour
seul chemin le tronçon de la ferme au port. Le reste du grand monde ne change pas.

## Contexte

- `docs/ile.md` (D1, D8, D10). I1c (le port fait tout le commerce), I2 (le chemin possédé),
  I7c et I7d (le récit est coupé).
- Le plan : `js/engine/monde-gen.js` (1 012 lignes : `lieux.hameaux`, `PLAN_MONDE.HAMEAUX`,
  `GARANTIS`, les chemins en boucle), `js/engine/monde-hameaux.js` (783 lignes),
  `js/engine/habitants.js`, `js/engine/caleche.js`, `caleche-tournee.js`, `js/monde-worker.js`.
- La scène : `js/carte/ferme/hameaux.js`, `habitants.js`, `caleche.js`, `rencontre.js`,
  `presence.js`, `marcheurs.js` ; les dessins `scripts/carte/hameaux.py`, `caleche.py`.
- Ce qui s'appuie sur les hameaux : `projets.js`, `fetes.js`, `demandes.js`, `voisins.js`,
  `decouverte.js` (l'annonce d'un hameau), `monde-vu.js`, `monde-carte.js`, `js/ui/carte-monde.js`,
  `js/carte/ferme/boussole.js`, `naturaliste.js`, `objectifs.js`.
- Ce qui s'écartait des hameaux : `monde-vegetation.js`, `monde-roches.js`, `monde-faune.js`,
  `monde-lieux.js`.

## À faire

1. **Le plan `ACTIF`** : `fairePlan` ne tire ni hameau ni boucle ; il garde la ferme, le port et le
   tronçon qui les relie. **Le relief, les biomes, les rivières, les lacs, les grottes et les coins
   de pêche doivent rester identiques, à la graine près**, à ceux du plan d'avant : vérifier que
   retirer les hameaux ne décale pas les tirages suivants (sinon, consommer les mêmes tirages à
   vide). C'est la condition d'une migration douce (I7f).
2. **La place des hameaux** : là où un hameau se tenait, la nature du biome reprend (végétation,
   rochers, faune), sans trou ni clairière carrée.
3. **La scène et le Worker** : avec `ACTIF`, rien des hameaux, des habitants ni de la calèche n'est
   calculé, chargé ni dessiné (les atlas concernés ne sont pas chargés : mesurer le gain).
4. **Ce qui s'y appuyait** : projets, fêtes, demandes et liens ne lisent plus que le village
   (I6a, I6b, I8a) ; la carte du monde et la boussole n'ont plus de hameaux ; les objectifs tirés
   « aller dans un hameau » sortent de la liste `ACTIF`.
5. **Une raison d'explorer** (la question ouverte de `docs/ile.md`) : proposer, sans la coder ici si
   elle dépasse la fiche, ce qui remplace la découverte des hameaux : des **plants sauvages** propres
   à chaque biome, à rapporter et à cultiver (ils s'ajoutent au catalogue : I1c) ; les lieux muets
   gardés par I7c. Coder au moins les plants sauvages de deux biomes pour valider l'idée.
6. **Les tests** (`village-monde.test.mjs`) : sur 50 graines, le plan `ACTIF` n'a ni hameau ni
   boucle, la ferme et le port sont reliés, et biomes, rivières, grottes et coins de pêche sont ceux
   du plan d'avant ; Worker et calcul direct identiques ; `monde-plan.test.mjs`,
   `hameaux.test.mjs`, `caleche.test.mjs` verts avec `ACTIF: false`.

## Hors périmètre

- Les parties en cours (I7f) ; supprimer les fichiers (I9h).

## Critères d'acceptation

- Dans Chromium, `?village=1`, trois graines : on fait le tour de l'île sans trouver ni hameau ni
  calèche ; les anciens emplacements ne se devinent pas ; le chemin va de la ferme au port.
- Le temps de création du monde et le poids chargé, avant et après.

## Vérifications et livraison

Celles du README du chantier. Captures : la carte du monde de trois graines (avant, après), un
ancien emplacement de hameau, un plant sauvage.
