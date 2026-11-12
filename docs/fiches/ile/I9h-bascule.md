# Fiche I9h — La bascule

## Objectif

Faire de l'île à bâtir le jeu par défaut : allumer le réglage pour tout le monde, migrer les parties
à leur ouverture, retirer le code et les données du jeu d'avant, mettre à jour le site et la
documentation.

## Contexte

- Toutes les fiches du chantier sont faites ; `docs/ile.md` les marque « fait ».
- `VILLAGE.ACTIF` et `villageActif` (I0a) ; la migration solo (I7f) et celle des mondes (I9f) ;
  les textes préparés pour la page d'accueil et le README (I7d).
- La mise en ligne : `.github/workflows/site.yml` (les tests, les fichiers générés vérifiés, la
  construction du site), `scripts/build-site.mjs`, `.github/workflows/worker.yml` (le serveur).
- La branche `archive/jeu-avant-ile` (I0a) garde le jeu d'avant.

## À faire

1. **Une répétition**, d'abord : sur une branche, allumer le réglage, construire le site, et faire
   passer les parties de `anciennes-parties.json` et trois parties réelles récentes (exportées par
   le mainteneur) de bout en bout. Rendre compte avant d'aller plus loin.
2. **Allumer** : `VILLAGE.ACTIF: true` ; la version du jeu monte (un changement majeur : 2.0.0).
3. **Retirer** ce qui ne sert plus, en plusieurs commits lisibles :
   - le récit : `js/engine/recit.js`, `fil-lune.js`, `secrets.js`, `ile.js`, `bienvenue.js`,
     `data/recit.json`, `data/secrets.json`, `data/ile.json`, `COURRIER`, `docs/recit/` ;
   - les hameaux et la calèche : `monde-hameaux.js`, `habitants.js` (ce qui n'a pas été repris),
     `caleche.js`, `caleche-tournee.js`, leurs scènes, leurs dessins et atlas, `voisins.js` ;
   - leurs tests (`recit*.test.mjs`, `textes-recit`, `secrets`, `fil-lune`, `ile`, `hameaux`,
     `habitants*`, `caleche`, `voisins`, `bienvenue`) ; garder ceux des migrations ;
   - le réglage lui-même, `villageActif` et toutes les branches « éteint » ; `?village=1`.
   Les migrations d'avant restent (une vieille partie doit toujours pouvoir se charger).
4. **Renommer** ce qui porte encore un nom d'avant dans le code vivant (habitant → villageois,
   hameau → village) là où c'est sans risque ; lister ce qui reste.
5. **La documentation** : `README.md` (le jeu, les règles en bref, la structure), `docs/ile.md`
   (devient la conception de référence), `docs/conception.md` et `docs/grand-monde.md` (une note en
   tête : ce qui est remplacé), `docs/monde-partage.md`, l'encyclopédie (une seule source),
   `CLAUDE.md` (les habitudes : `data/village.json`).
6. **Le site** : la page d'accueil et sa capture, `encyclopedie.html`, les CGV si elles citent le
   jeu.
7. **Le serveur** : déployer le Worker avant le site (un monde migré refuse les clients anciens,
   I9f) ; dire l'ordre exact dans le compte rendu.
8. **Après** : relire le rapport quotidien des sessions (`worker/src/report.mjs`) les jours
   suivants pour les erreurs de migration ; prévoir comment revenir en arrière (republier la
   version d'avant : les parties migrées gardent leur copie de sûreté, I7f).

## Hors périmètre

- Toute nouvelle règle ; la troisième vocation.

## Critères d'acceptation

- `npm run build && npm test` : « Tout est vert », sans aucun test du jeu d'avant hors migrations.
- `grep -rE "recit|caleche|hameau" js/` ne trouve plus que les migrations et les lignes listées.
- Le site construit pèse moins qu'avant (le donner) ; une partie d'avant s'ouvre, migre et se joue.
- La simulation sur 80 nuits : toutes les vérifications passent.

## Vérifications et livraison

Celles du README du chantier, plus `node tests/test-synchro.mjs`, `node tests/deux-joueurs.mjs` et
le test utilisateur (`docs/test-utilisateur.md`) sur une partie neuve et une partie migrée. La
livraison se fait en deux PR : la répétition et l'allumage, puis le retrait.
