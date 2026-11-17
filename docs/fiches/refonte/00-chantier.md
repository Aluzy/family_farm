# Refonte du code — fiche de chantier

## But

Un code propre pour « l'île à bâtir » seule : sans héritage du jeu d'avant, des noms cohérents, des
commentaires utiles seulement, une architecture ECS. Aucun joueur ni ancienne sauvegarde à garder.

## Garde-fous (à chaque PR)

- `node tests/all.mjs` finit sur « Tout est vert ».
- `scripts/simulate.mjs` : sortie identique octet pour octet à la référence (`cmp`), sauf volet 1 et
  changement de règle annoncé (nouvelle référence alors).
- `tests/test-monde.mjs`, `tests/test-synchro.mjs`, `tests/deux-joueurs.mjs` verts dès qu'un volet touche
  au moteur ou au réseau.
- Carte : captures avant/après (jour et soir), identiques à l'œil.
- Mesures (volets 4a, 4b) : images par seconde sur la ferme chargée, durée d'un pas moteur, poids du paquet.
- Une PR par lot cohérent, revue courte ; on ne mêle pas renommage et changement de comportement.

## Volets

### 0. Conventions et mesures de départ (1 PR)
- ESLint et Prettier, règles minimales ; formatage appliqué seul dans un commit à part.
- Guide de nommage court (`docs/conventions.md`) : vocabulaire de l'île, préfixes, langue.
- Référence : sortie de simulation, captures, mesures de performance.

### 1. Plus de migrations (1–2 PR)
- Supprimer `migration-avant.js`, `migration-ile.js` et les branches de migration de `state.js`.
- Format de sauvegarde remis à 1 ; une sauvegarde d'un autre format est refusée proprement.
- Supprimer les tests de migration et `scripts/repetition-bascule.mjs`.

### 2. Noms et données (4–6 PR)
- Retirer tout reste du jeu d'avant (récit, calèche, hameau, habitant, voisin, Maurice…) : ~1 250 lignes,
  145 fichiers. Renommer ce qui sert encore, supprimer ce qui ne sert plus (code mort repéré par la
  couverture des tests et la recherche d'usages).
- Nettoyer `data/*.json` (clés orphelines, commentaires), puis `node scripts/build-data.mjs`.
- Par zone : moteur, interface, carte, données et tests.

### 3. Commentaires (3–4 PR)
- De ~18 % à ~6–8 % des lignes : garder le pourquoi, les invariants, les pièges de déterminisme ;
  retirer l'historique, les numéros de fiches, la paraphrase du code.
- En-tête de fichier : une à trois lignes sur son rôle.

### 4a. Carte en ECS (6–8 PR)
- Passer `js/carte/ferme` en modules ES, empaquetés par esbuild ; fin des globales et des mélanges dans le
  prototype de `FarmScene`.
- Entités (pièces, bêtes, villageois, charrette…), composants (position, sprite, animation, sélection…),
  systèmes (synchro modèle→vue par différence, rendu, animation, gestes, soleil, son) sous l'ordonnanceur
  actuel.
- Le pointage (`hitAt`) par une grille spatiale au lieu de la chaîne de conditions.
- Découper `farm-stage.js` (1 600 lignes) en montage, gestes, pointage, synchro.

### 4b. Moteur en ECS léger (5–7 PR)
- Composants en données simples dans l'état (sérialisables, déterministes), systèmes purs appelés à chaque
  pas dans un ordre fixe et déclaré.
- Découper les gros fichiers par système ; une seule façon d'interroger les entités.
- Simulation identique à l'octet à chaque PR.

### 5. Documentation (1–2 PR)
- `docs/architecture.md` : modules, entités, composants, systèmes, flux moteur→vue→réseau.
- Mettre `CLAUDE.md` et `docs/ile.md` à jour ; archiver les fiches anciennes.

## Ordre et ampleur

0 → 1 → 2 → 3 → 4a et 4b (indépendants) → 5. Environ 20 à 30 PR.

## Hors chantier

Équilibrage, nouvelles fonctions, dessins : après la refonte. Les tests en ligne retirés lors du retrait
(test-monde, 63 → 56) sont réécrits au volet 2.
