# 🌾 Ferme Familiale

Un *idle game* de gestion agricole familiale : quatre personnes, une ferme, et un
objectif, nourrir la famille avec ce que la ferme produit. Panneaux solaires,
batteries, pompe, potager, champ, poulailler, moutons, verger, serre, cuisine et
réfrigérateur ; les journées ne passent que quand vous cliquez sur **Dormir**.

- **Version** : 0.18.0 (affichée dans ⚙️ Options › À propos)
- **Conception** : [`docs/conception.md`](docs/conception.md), qui fait foi
- **Chiffres entiers** : toutes les valeurs du jeu sont entières (pièces, Wh, L,
  %, kg) ; voir la note v25 de la conception
- **Technique** : trois pages HTML autonomes, sans bibliothèque et sans étape de
  build : `index.html` (page d'accueil), `jeu.html` (le jeu) et
  `encyclopedie.html` (glossaire du jeu, généré depuis
  `encyclopedie_ferme_familiale.json`), plus `cookies.html` (politique de cookies
  et traceurs). Elles fonctionnent ouvertes depuis le disque comme servies en HTTP.
  Le jeu lui-même n'a besoin d'aucun serveur ; seul le suivi de session facultatif
  (voir plus bas) envoie des données, et uniquement si le joueur l'accepte.

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

- La famille (2 adultes, 2 enfants) a besoin de **150 énergie par jour** ; elle
  mange à chaque nuit, d'abord ce qui périme le plus tôt.
- La journée commence à 6 h (1 heure de jeu = 30 s). Elle ne se termine que par
  **Dormir**, après 30 s d'éveil au moins.
- La nuit : repas et santé, puis les plantes arrosées gagnent un stade, les
  poules nourries pondent, les moutons grossissent, les aliments vieillissent.
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

### Structure de `index.html`

Le fichier contient quatre blocs, toujours dans cet ordre :

1. `<style>` : variables de thème (clair et sombre), puis composants ;
2. `<script id="core">` : `DATA` (toutes les valeurs d'équilibrage), puis
   `ENGINE` (simulation pure : pas de DOM, pas d'horloge, aléatoire à graine) ;
3. `<script id="tests" type="text/plain">` : les tests du moteur (jamais
   exécutés par le navigateur) ;
4. `<script id="app">` : sauvegarde, interface et boucle.

L'état du jeu est un seul objet JSON, versionné (migrations dans `MIGRATIONS`) ;
l'interface ne le modifie qu'à travers les actions nommées du moteur.

### Tests

```sh
node run-tests.mjs
```

Le script extrait les blocs `core` et `tests` de `index.html` et les exécute avec
Node (18 ou plus récent). Tous les tests doivent passer avant un commit.

### Simulation d'équilibrage

```sh
node scripts/simulate.mjs
```

Un joueur automatique joue une partie complète avec les vraies actions du moteur
et compare la courbe d'autonomie aux jalons de la conception (section 8.10). Le
même joueur est disponible dans le mode test (bouton « Simuler 60 nuits »).

### Mode test

⚙️ Options › **Activer le panneau de mode test** (désactivé par défaut) : ajouter
des pièces, des appareils, des graines, construire les bâtiments, passer des
nuits ou des saisons, aller à un chapitre, et voir l'état complet de la partie.

### Vérifier avant de publier

1. `node run-tests.mjs` : tous les tests passent.
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
`cookies.html` ; le code est le bloc `<script id="telemetry">` de `jeu.html`
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
  `POLICY_VERSION` dans le bloc `telemetry` : le consentement est alors redemandé.

## Tests

```
node run-tests.mjs        # moteur du jeu
node test-telemetry.mjs   # suivi de session (rien sans consentement, retrait, limites)
```
