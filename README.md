# 🌾 Ferme Familiale

Un *idle game* de gestion agricole familiale : une famille (quatre personnes au départ), une ferme, et un
objectif, nourrir la famille avec ce que la ferme produit. Panneaux solaires,
batteries, pompe, zone de culture, poulailler, moutons, verger, serre, cuisine et
réfrigérateur. La journée suit une horloge : réveil à 6 h, repas de la famille à
19 h, et la nuit passe quand vous cliquez sur **Zzz** (Dormir) ou, à défaut, à 22 h.

- **Version** : 1.3.0 (affichée dans ⚙️ Options › À propos)
- **Conception** : [`docs/conception.md`](docs/conception.md), qui fait foi
- **Chiffres entiers** : toutes les valeurs du jeu sont entières (pièces, Wh, L,
  %, kg) ; voir la note v25 de la conception
- **Technique** : des pages HTML sans bibliothèque à installer et sans étape de build :
  `index.html` (page d'accueil), `jeu.html` (le jeu, dont le style est dans
  `css/` et le code dans `js/`) et `encyclopedie.html` (glossaire du jeu, généré depuis
  `encyclopedie_ferme_familiale.json` par `node build-encyclopedie.mjs`), plus `cookies.html` (politique de cookies
  et traceurs). Elles fonctionnent ouvertes depuis le disque comme servies en HTTP.
  Le jeu lui-même n'a besoin d'aucun serveur ; seul le suivi de session facultatif
  (voir plus bas) envoie des données, et uniquement si le joueur l'accepte.
- **Carte de la ferme** : l'onglet Ferme affiche une carte en pixel art (Phaser 3,
  `vendor/phaser.min.js`, scène dans `js/farm-stage.js`, images et carte Tiled dans
  `assets/`) ; voir [`docs/architecture-phaser.md`](docs/architecture-phaser.md). La
  carte demande d'ouvrir le jeu en HTTP (`python3 -m http.server`) ; sans Phaser ou
  depuis le disque, la Ferme garde sa liste classique et le jeu reste jouable.

## Jouer

### En local

Ouvrez `index.html` dans un navigateur récent (double-clic, ou glisser le fichier
dans une fenêtre), puis cliquez sur **Jouer**. Vous pouvez aussi ouvrir
`jeu.html` directement. Rien à installer.

### En ligne (GitHub Pages)

1. Poussez le dépôt sur GitHub, avec `index.html` **à la racine** de la branche `main`.
2. Sur la page du dépôt : **Settings → Pages**.
3. Dans **Build and deployment**, choisissez **Source : Deploy from a branch**.
4. **Branch** : `main`, dossier **`/ (root)`**, puis **Save**.
5. Après une à deux minutes, le site est en ligne à l'adresse
   `https://<votre-compte>.github.io/<nom-du-depot>/` (elle s'affiche en haut de
   la page Settings → Pages) — c'est la page d'accueil ; le jeu est à
   `.../jeu.html` et l'encyclopédie à `.../encyclopedie.html`. Chaque
   `git push` sur `main` met le site à jour.

Aucun fichier de configuration n'est nécessaire pour le site : les pages n'utilisent
que des chemins relatifs et aucun module externe. Le seul appel réseau du jeu est
l'envoi du suivi de session, décrit ci-dessous.

> **Sauvegardes et adresse** : la partie est enregistrée dans le navigateur
> (`localStorage`), séparément pour chaque adresse. Une partie commencée en
> ouvrant le fichier local n'apparaît donc pas sur le site GitHub Pages, et
> inversement. Pour la transférer : ⚙️ Options › **Exporter** (copier le texte),
> puis sur l'autre adresse ⚙️ Options › **Importer**.

## Règles en bref

- La famille commence à 2 adultes et 2 enfants : **150 énergie par jour** (50 par
  adulte, 25 par enfant). Le joueur peut la composer : 1 à 6 membres, dont au moins
  un adulte, et jusqu'à 3 chiens ou chats, qui ne comptent pas dans le besoin. Elle
  mange à 19 h (ou au coucher, si elle dort avant), d'abord ce qui périme le plus tôt.
- La journée va de 6 h à 22 h et une heure dure 18 s (288 s en tout). On peut **Dormir**
  après 30 s d'éveil ; à 22 h, la nuit se déroule d'elle-même. L'horloge
  s'arrête pendant le résumé du réveil et quand le jeu est fermé.
- La nuit : les plantes arrosées gagnent un stade, les poules nourries pondent,
  les moutons et les vaches mangent leur paille (laine, lait), les aliments vieillissent.
- L'électricité et l'eau circulent en temps réel : panneaux → batteries →
  pompe, moulin, presse, réfrigérateur. Les appareils s'usent quand ils tournent.
- Sept chapitres mènent à une famille **100 % autonome**.

Le détail (valeurs, formules, tableau d'équilibrage) est dans la conception ; les
règles principales sont aussi rappelées dans le jeu (⚙️ Options › À propos), et
chaque bâtiment a son bouton **?** (rôle, consommation, production).

### Absence et onglet en arrière-plan

Quand vous revenez (page rouverte, ou onglet qui repasse au premier plan), le
temps écoulé est rattrapé, **plafonné à 8 heures**, par pas de 5 s :

- avancent : panneaux et batteries, pompe, moulin, presse, préparations en cours,
  consommation du réfrigérateur ;
- n'avancent pas : les nuits (ni pousse, ni repas, ni ponte, ni péremption) et
  l'usure des appareils ;
- ce temps compte comme temps d'éveil : on peut dormir dès le retour.

Un écran **« Pendant votre absence… »** résume ce qui s'est passé si l'absence
dépasse une minute.

## Développer

### Structure

`jeu.html` ne contient que la structure de la page. Elle charge, dans cet ordre :

| Fichier | Contenu |
|---|---|
| `css/jeu.css` | variables de thème (clair et sombre), puis composants |
| `js/engine.js` | `DATA` (toutes les valeurs d'équilibrage), puis `ENGINE` (simulation pure : pas de DOM, pas d'horloge, aléatoire à graine) |
| `js/telemetry.js` | suivi de session (`Telemetry.*`) |
| `vendor/phaser.min.js`, `js/farm-stage.js` | la carte de la ferme |
| `js/app.js` | sauvegarde, interface et boucle |

Ce sont des scripts classiques qui partagent la portée de la page, comme quand ils
étaient dans le même fichier : l'interface appelle les fonctions du moteur par leur nom.
`tests/engine.test.js` (les tests du moteur) n'est jamais chargé par la page.

Chaque fichier est chargé avec `?v=<version du jeu>` : en changeant `GAME_VERSION`
(dans `js/engine.js`), changez aussi ce suffixe dans `jeu.html`, sinon un joueur peut
recevoir la nouvelle page avec un ancien script resté en cache.
`node scripts/check-page.mjs` vérifie que les deux concordent.

L'état du jeu est un seul objet JSON, versionné (migrations dans `MIGRATIONS`) ;
l'interface ne le modifie qu'à travers les actions nommées du moteur.

### Tests

```sh
node run-tests.mjs                  # moteur du jeu
node test-telemetry.mjs             # suivi de session (rien sans consentement, retrait, limites, commentaires)
node test-report.mjs                # rapport quotidien (calculs, Markdown, protections du Worker)
node build-encyclopedie.mjs --check # encyclopedie.html est à jour avec son JSON
node scripts/check-page.mjs         # jeu.html charge des fichiers qui existent, à la bonne version
```

Node 18 ou plus récent. Tout doit passer avant un commit ; l'action GitHub
`.github/workflows/tests.yml` les relance à chaque push et à chaque pull request.

### Simulation d'équilibrage

```sh
node scripts/simulate.mjs
```

Un joueur automatique joue une partie complète avec les vraies actions du moteur
et compare la courbe d'autonomie aux jalons de la conception (section 8.10). Le
même joueur est disponible dans le mode test (bouton « Simuler 60 nuits »). Le
script écrit `simulation.csv` et `simulation-autonomie.svg` dans le dossier
courant (ignorés par git).

### Mode test

⚙️ Options › **Activer le panneau de mode test** (désactivé par défaut) : ajouter
des pièces, des appareils, des graines, construire les bâtiments, passer des
nuits ou des saisons, aller à un chapitre, et voir l'état complet de la partie.

### Vérifier avant de publier

1. Les commandes de la section Tests passent.
2. Ouvrir `index.html` depuis le disque, puis servi en HTTP
   (par exemple `python3 -m http.server` et <http://localhost:8000/>) : aucune
   erreur dans la console, à 390 px et à 1 280 px de large, en thème clair et
   sombre.

## Suivi de session et politique de cookies

Avec l'accord du joueur (bandeau au premier chargement, réglable dans ⚙️ Options ›
Confidentialité), le jeu enregistre de façon anonyme, pour l'améliorer : les boutons
utilisés, les écrans consultés, le défilement et un instantané de progression à
chaque nuit. Rien n'est stocké ni envoyé sans accord, et un signal Global Privacy
Control ou Do Not Track du navigateur désactive tout. La politique publique est
`cookies.html` ; le code est `js/telemetry.js`
(l'app l'appelle via `Telemetry.*`, jamais l'ENGINE).

- **Stockage** : `sessionStorage` (`ff_sid`, `ff_t0`, `ff_data`) pour la visite,
  `localStorage` (`ferme-consent`) pour le choix, valable 6 mois.
- **Envoi** : un fichier JSON par session, toutes les 60 s si quelque chose a changé
  et à la fermeture de l'onglet (`sendBeacon`).
  - Sur `https://aluzy.github.io` : vers le Worker Cloudflare de `worker/`, qui écrit
    `sessions/<sid>.json` dans un bucket R2 (juridiction UE). Le fichier
    `wrangler.toml` (racine) décrit ce Worker.
  - Ouvert en local (`file://`, `localhost`) : vers `http://127.0.0.1:8787/session`, où
    `node collect-server.mjs` écrit les sessions dans `./sessions/` (essais).
  - Sur tout autre domaine : rien n'est envoyé.
- **Si vous modifiez ce qui est collecté**, mettez à jour `cookies.html` et
  `POLICY_VERSION` dans `js/telemetry.js` : le consentement est alors redemandé.
- **Commentaires** : ⚙️ Options › « Aidez-nous à améliorer le jeu ! » ouvre un champ
  texte (1 000 signes, 3 par visite). Le commentaire est ajouté au fichier de session
  (`feedback`), donc envoyé seulement si le suivi est autorisé.

## Rapport quotidien

Chaque jour à 13 h (heure de Paris), le Worker lit les sessions des dernières 24 h
dans R2 et publie le rapport comme issue d'un **dépôt GitHub privé** ; GitHub prévient
par e-mail. Le rapport donne : nombre de sessions ouvertes, temps actif moyen par
session, temps passé par chapitre, top 10 des actions des joueurs et commentaires.
Le calcul est dans `worker/src/report.mjs` ; les libellés des actions (`GAME_ACTIONS`)
sont à compléter quand une action est ajoutée au jeu, faute de quoi elle apparaît sous
son nom brut suivi de « (non répertorié) ». Installation : `worker/README.md`.

> **Le dépôt du jeu reste public** (GitHub Pages ne fonctionne pas sur un dépôt privé
> avec un compte gratuit : rendre ce dépôt privé mettrait le jeu hors ligne). Les
> rapports, eux, vont dans un autre dépôt, privé ; le Worker refuse de publier dans un
> dépôt public, car le rapport contient les commentaires des joueurs.

## Crédits

- Graphismes : pack "Farm – 4 Seasons 16x16 Tileset" par antarcticbees — <https://antarcticbees.itch.io/>
- Moteur d'affichage : Phaser 3 (licence MIT)
