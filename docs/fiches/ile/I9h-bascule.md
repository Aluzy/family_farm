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

> Décision D16 (docs/ile.md) : la pierre de lune n'a plus d'effet magique. En retirant le récit, retirer aussi
> l'objet `pierre_lune`, `facteurPousse` (crops.js) et la lueur de la ferme qui l'accompagne (stage.js) ; garder
> les effets de la lune sur les cultures (`LUNE`, lune.js).

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

## Revu par I9e (les rôles en ligne)

- **Deux grilles de rôles vivent ensemble** (`js/engine/roles.js`) : celle d'E-11 pour une ferme d'avant, `GRILLE_ILE`
  par-dessus pour une île (`ilePartagee`). À la bascule, toutes les parties sont des îles : `GRILLE_ILE` devient la
  grille, et la branche « ferme d'avant » de `roleDemande` s'en va avec `villageActif`.
- **`ROLES_TEXTE`** (`js/ui/en-ligne.js`, la fenêtre 👥) a deux versions, la ferme et l'île : garder celle de l'île.
- **Le but du jeu en ligne** (aider l'île d'un ami) est dans `docs/monde-partage.md` § 10 et `docs/ile.md` : le reprendre
  dans le README et la page d'accueil.

## Revu par I9f (la mise en ligne, la migration des mondes)

- **Déployer le Worker avant le site** (le point 7) : un monde se met à jour à sa première ouverture par le Worker de la
  nouvelle version (`MondeRegistre.mettreAJour` : son format, sa ferme passée sur l'île, la partie d'avant gardée dans ses
  sauvegardes, « avant le passage sur l'île ») et refuse ensuite les jeux d'avant (« recharge la page ») ; un jeu plus
  récent que le Worker attend (« réessaie dans quelques minutes »). La version du jeu (2.0.0) change la version des
  mondes : tous se mettent à jour à leur premier réveil.
- **Ce que la bascule retire** : `env.ILE_ESSAI` et `MondeRegistre.essaiIle` (les tests en font des mondes d'essai : le
  réglage allumé suffit) ; la branche « ferme d'avant » des mondes (`ilePartagee` faux : l'élagage d'E-8, `GRAND_MONDE`,
  F.2 et la nuit partagée d'un coup, la grille d'E-11, `HORS_FERME`, la limite de 2 Mo sans plafond) : toute partie d'un
  monde est une île. **À garder** : `mettreAJour`, `versLIle` et `migrerVersLIle` (une base d'avant peut se réveiller des
  mois plus tard, une sauvegarde d'avant se restaurer), les marques du journal, `refusDuJeu` et `hello.format`.
- **Les textes** : `VILLAGE.MIGRATION.MONDE` (la fenêtre d'un monde passé sur l'île) reste tant que des mondes d'avant
  peuvent se réveiller ; la fenêtre « Jeu en ligne » ne dit plus que « Mettre mon île en ligne ».
- **Après** : relire, les jours suivants, les journaux des mondes (`monde.migrer` et son bilan : `perdus`, les gestes d'avant
  qui n'ont pas pu se rejouer) en plus du rapport des sessions ; revenir en arrière demande de republier le Worker d'avant
  **et** de restaurer, monde par monde, la sauvegarde « avant le passage sur l'île » (un Worker d'avant ne lit pas une partie
  de l'île).

## Revu par I9g (les performances)

- **Le lot** (`js/engine/blocs.js` `enLot`) couvre le `tick`, le pas de la ferme, la nuit et le pas du monde : en retirant
  les branches « éteint » et le récit, garder la règle qu'aucun bloc ne se pose ni ne se reprend pendant un pas ; une
  machine qui bâtirait seule, ou un pas qui poserait un bloc, devrait sortir du lot. `tests/engine/village-lots.test.mjs`
  (avec et sans, `reglerLots`) le dirait.
- **Le protocole des mesures** est dans le dépôt : `node scripts/cout-performances.mjs --racine <la version d'avant>` et
  `node scripts/mesure-scene-ile.mjs` ; les refaire avant d'allumer le réglage pour tous, et mesurer la scène d'une île de
  15 sur le téléphone de référence (« Mesurer 30 s ») : la borne de 30 images par seconde n'a pas pu être vérifiée sans
  appareil (13 dans le rendu logiciel de Chromium ralenti six fois, avant comme après I9g).
- **Au premier déploiement** : le temps de calcul d'une alarme (≈ 0,4 s pour 120 pas à 15 villageois, ≈ 0,8 s pour 240)
  et celui d'un monde d'avant mis à jour (≈ 0,5 s) dans les journaux de Cloudflare.

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
