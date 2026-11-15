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

## Fait : la première PR (la répétition et l'allumage)

Les points 1 et 2 ; rien n'est retiré du jeu d'avant (la seconde PR, plus bas). Le détail : `docs/ile.md`, « La bascule
(I9h) ».

0. **`main` fusionné** (un commit de fusion : `main` 01f8e5c, le niveau 2 de la maison, les objets accrochés aux murs, les
   murs qui reviennent à leur place, est ancêtre du chantier). Tout ce que `main` apportait avait déjà été reporté dans le
   chantier (#627 et les fiches suivantes) : les onze fichiers en conflit gardent la version de l'île, qui contient chaque
   ligne ajoutée par `main` ; l'arbre fusionné est celui de fd9656c. Pas de nouveau format (`main` restait au 86 : ses
   niveaux du dessus, `niveauxHauts`, `papiersNiveau2`, n'avaient pas de migration). Après la fusion, le réglage éteint :
   `npm test` vert ; `simulate.mjs` et `--village` identiques (cmp) à ceux de fd9656c. Celui de `main` (1.22.0, son
   joueur automatique d'avant I0b : 3 vérifications, une en échec, 71 nuits sans repas) diffère depuis I0b, pas par la
   fusion : le même script de `main` joué sur le moteur de fd9656c et sur celui de la fusion donne le même CSV, et son
   `DATA.SIMULATION` est celui d'I0b.
1. **La répétition** : `node scripts/repetition-bascule.mjs [fichiers…]` (sans fichier : les quatre parties de
   `anciennes-parties.json`, les cinq époques de `temoins.json`, les deux parties de `main` de `parties-main.json`, faites
   par le moteur de `main` : une partie jouée 30 nuits puis une maison aux murs montés au niveau 2, meublée à l'étage et
   au niveau 2) : **les 11 passent** (le format, le passage sur l'île une fois, la ferme identique à celle de la même
   partie lue éteinte, l'étage et le niveau 2 compris, les pièces jamais en baisse, la fenêtre du retour et ses cinq
   lignes, cinq nuits du joueur automatique, la partie enregistrée et relue à l'identique). **Les trois parties réelles
   exportées par le mainteneur** ne sont pas dans le dépôt : `node scripts/repetition-bascule.mjs a.json b.json c.txt`
   les fera passer (une sauvegarde exportée depuis ⚙️ Options, en fichier ou en texte copié). En ligne :
   `node scripts/repetition-monde.mjs <une copie de main>` (un monde fait et joué à deux par le serveur de `main`, puis
   ouvert par celui de la bascule sur la même base : mis à jour et passé sur l'île en ≈ 2 s, sans `ILE_ESSAI`, sa ferme et
   son niveau 2 intacts, le jeu 1.22.0 refusé, joué à deux, réveillé à froid à l'identique) ; et dans Chromium,
   `node scripts/repetition-monde-navigateur.mjs <une copie de main>` (le même monde servi par le Worker d'aujourd'hui,
   comme dans `deux-joueurs.mjs` : le jeu 1.22.0 refusé, le propriétaire et son ami entrent avec le jeu 2.0.0, chacun
   sa fenêtre du retour, un mur posé chez l'un vu chez l'autre en ≈ 0,3 s, le temps qui passe, les parties confirmées
   celle du monde : tout passe, aucune erreur de la page). Dans Chromium, sur le site
   construit, sans `?village=1` : une partie neuve (le départ de l'île), une partie d'avant (`recente_avancee`) et la
   partie de `main` au niveau 2, chacune ouverte depuis l'écran d'accueil (« Charger une partie »), passée sur l'île (la
   fenêtre du retour, la copie de sûreté gardée, le cadeau), trois jours joués, rechargée : aucune erreur.
   **Ce que la répétition a trouvé** (corrigé) : `reparerPartie` (fiche 9a) remettait à chaque ouverture les objets du
   départ qu'on n'avait plus (160 conserves, les graines, les patates ; le jeu publié aussi) : l'inventaire n'est plus
   réparé que pour ses lots illisibles ; `scripts/build-site.mjs` ne connaissait pas `charrette-village.js` (I2b) : le
   site ne se construisait plus.
2. **L'allumage** : `VILLAGE.ACTIF: true` ; la version 2.0.0 (`GAME_VERSION`, js/engine/base.js : À propos, le suivi des
   sessions, l'export, et le Worker, qui embarque le moteur ; le README). `jeu.html?village=1` ne change plus rien (plus
   de partie d'essai). **Le Worker** : rien d'autre à changer — `ileDue` lit le réglage embarqué avec le moteur, tous les
   mondes d'avant passent sur l'île à leur premier réveil par le Worker 2.0.0 ; `env.ILE_ESSAI` reste (sans effet, les
   tests et deux scripts de mesure s'en servent) et s'en va avec le réglage. **Les tests du jeu d'avant** forcent le
   réglage à false (`tests/engine/aide.mjs` : tout fichier hors `village-*`, comme `test-monde`, `test-synchro` ;
   `deux-joueurs.mjs` sert aussi la page le réglage éteint, comme son moteur et son Worker, ses îles restant des essais) ;
   `tests/smoke.mjs`, lui, joue la page telle qu'elle est publiée : il passe par le départ de l'île.
   `simulate.mjs` joue l'île par défaut (`--eteint` : le jeu d'avant, `--village` reste accepté) : son CSV est celui de
   `--village` à fd9656c, octet pour octet. `tests/engine/village-bascule.test.mjs` : le réglage et la version, la partie
   de `main` au niveau 2, la répétition.

**L'ordre du déploiement (point 7), à faire par le mainteneur, rien n'a été déployé** : le Worker avant le site.
Fusionner dans `main` lance les deux (Workers Builds pour le Worker, l'action « Tests et mise en ligne » pour le site,
qui met plusieurs minutes à tester) : pour être sûr de l'ordre,
1. avant de fusionner : `node scripts/repetition-bascule.mjs <les trois parties exportées>` (toutes passent), et les
   mesures d'I9g (`node scripts/cout-performances.mjs --racine <copie d'avant>`, la scène sur le téléphone) ;
2. GitHub › Settings › Environments › `github-pages` › « Required reviewers » : soi-même (la mise en ligne du site
   attendra un accord) ;
3. fusionner la PR dans `main` ;
4. attendre le Worker : Cloudflare › Workers & Pages › `family-farm` › Deployments, la version du commit fusionné active
   (le contrôle « Workers Builds: family-farm » vert sur le commit). Sans Workers Builds : `npx wrangler@4.150.0 deploy`
   depuis le commit fusionné ;
5. approuver la mise en ligne du site (Actions › « Tests et mise en ligne » › Review deployments › Approve) ;
6. retirer la règle de l'environnement (ou la garder pour la seconde PR) ;
7. les jours suivants : le rapport quotidien (`worker/src/report.mjs`), les journaux des mondes (`monde.migrer`, son
   bilan, `perdus`), le temps des alarmes et des mondes mis à jour (I9g).
Entre 3 et 5, un joueur au jeu 1.22.0 est refusé d'un monde en ligne (« recharge la page ») et en solo joue encore le
jeu d'avant ; dans l'autre ordre, le Worker d'avant refuserait aussi le jeu 2.0.0 (il veut la même version) : rien ne se
perd, mais la fenêtre serait plus longue. **Revenir en arrière** : republier le site et le Worker d'avant (annuler la
fusion) ; une partie solo migrée garde sa copie d'avant (⚙️ Options › Sauvegarde) et le jeu d'avant ouvre aussi une
partie de l'île (vérifié : il l'ouvre et la joue, en ignorant ce qu'il ne connaît pas) ; un monde migré doit être
restauré, monde par monde, depuis sa sauvegarde « avant le passage sur l'île » (le Worker d'avant ne lit pas une île).

**Les tailles** (`node scripts/build-site.mjs`) : le site publié aujourd'hui (`main`, 1.22.0) 28 236 018 octets (26,9 Mo,
le bundle 1 482 Ko) ; le chantier à fd9656c 29 861 774 ; après l'allumage 29 861 930 (28,5 Mo, le bundle 2 192 Ko). La
seconde PR doit le faire baisser sous celui d'avant (le critère de la fiche).

**Les vérifications** (le réglage allumé) : `node tests/all.mjs` « Tout est vert » (1 831 tests, dont les 36 fichiers
`village-*`) ; `node tests/smoke.mjs` ; `node scripts/simulate.mjs` (80 nuits, l'île) : 4 OK, 0 échec, un constat (le
palier 7 en cours dès la nuit 67, pas avant la nuit 60 : un constat depuis I1b) ; `node tests/test-monde.mjs` (63) et
`node tests/test-synchro.mjs` (15) ; `node tests/deux-joueurs.mjs` deux fois de suite, 57 sur 57 (un premier essai, la
machine chargée par d'autres tests, avait manqué 3c, le compte des images de marche en 2,4 s : il passe seul, comme à
fd9656c).

**À confirmer par le joueur** : la correction de l'inventaire (un objet du départ ne revient plus à l'ouverture : c'était
un défaut du jeu publié, un joueur qui en profitait ne le peut plus) ; `ILE_ESSAI` gardé jusqu'au retrait ; la page
publique de l'encyclopédie (`encyclopedie.html`) et la page d'accueil décrivent encore le jeu d'avant entre les deux PR
(le livre du jeu, lui, est celui de l'île) : publier les deux PR ensemble l'éviterait.

**La seconde PR (le retrait)** aura à faire, en plus des points 3 à 6 : retirer `ILE_ESSAI`/`essaiIle` (et le paramètre
des tests et de `cout-mise-en-ligne.mjs`, `cout-performances.mjs`, `deux-joueurs.mjs`), `JEU_D_AVANT` et les tests du jeu
d'avant qui le forcent (garder ceux des migrations : `migrations`, `temoins`, `village-migration`, `village-bascule`),
`--eteint` et `--village` de `simulate.mjs`, `essaiDemande`, `allumerEssaiVillage`, le bandeau, `reglage-village.test.mjs`,
la branche « ferme d'avant » des mondes (Revu par I9f) ; refaire les tailles du site.
