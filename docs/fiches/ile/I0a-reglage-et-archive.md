# Fiche I0a — Le réglage de bascule et l'archive

## Objectif

Poser ce qui permet au chantier d'avancer sans toucher au jeu publié : une branche d'archive du jeu
d'aujourd'hui, le réglage `VILLAGE.ACTIF`, la façon de l'allumer pour un essai et pour les tests.

## Contexte

- Lire `docs/ile.md` (D7, « Le réglage de bascule ») et `docs/fiches/ile/README.md`.
- Le précédent : la branche `archive/jeu-avant-grand-monde` (README, premier paragraphe).
- Les données : `data/index.json` (la liste des fichiers compilés), `scripts/build-data.mjs`,
  `js/engine/catalog.js` (`DATA`), `data/general.json` (`PENALITES` : un réglage du même genre).
- Les essais : `js/engine/testmode.js`, `js/ui/testmode.js`, `js/ui/store.js`.
- Les tests : `tests/all.mjs`, `tests/run-tests.mjs`, `tests/engine/base.test.mjs`.

## À faire

1. **L'archive** : dire dans le compte rendu la commande qui crée `archive/jeu-avant-ile` depuis
   `main` (la branche est créée par le mainteneur, pas par l'agent) ; l'annoncer dans le README, à
   côté de l'autre archive.
2. **Le fichier** `data/village.json`, ajouté à `data/index.json` : `VILLAGE: { ACTIF: false }` et son
   commentaire `//VILLAGE` (ce qu'est le chantier, où est le plan, ce que fait `ACTIF`). Les sections
   `PORT`, `TACHES`, `ARTISANS`, `TRAITS` viendront avec leurs fiches.
3. **La lecture** : une seule fonction, `villageActif(state)` (un nouveau module
   `js/engine/village.js`), que tout le chantier appellera. Elle rend `DATA.VILLAGE.ACTIF`, ou `true`
   si la partie le force (`state.essais.village`, hors sauvegarde publiée).
4. **L'essai** : `jeu.html?village=1` allume le réglage pour la session (une nouvelle partie
   seulement ; une partie d'avant n'est pas touchée) ; un bandeau discret le dit.
5. **Les tests** : une aide `avecVillage(fn)` pour les tests du moteur ; `tests/all.mjs` joue toute la
   suite avec `false` (comme aujourd'hui), puis les fichiers `tests/engine/village-*.test.mjs` avec
   `true`. Un test vérifie qu'avec `false` une nouvelle partie est identique à celle d'avant (même
   état initial, à la graine près).
6. **La doc** : `docs/ile.md` et le README (une ligne « Chantier en cours »).

## Hors périmètre

- Tout changement de règle : cette fiche ne change rien au jeu, allumé ou éteint.

## Critères d'acceptation

- Avec `ACTIF: false`, le site construit est identique à celui d'avant, hors `data.generated.js`.
- `?village=1` affiche le bandeau ; `villageActif` rend `true` dans cette session seulement.
- `npm test` vert ; le test « identique à avant » passe.

## Vérifications et livraison

Celles de `docs/fiches/ile/README.md`. Capture : le bandeau de l'essai.
