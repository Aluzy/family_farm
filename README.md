# 🌾 Ferme Familiale

Un *idle game* de gestion agricole familiale : quatre personnes, une ferme, et un
objectif, nourrir la famille avec ce que la ferme produit. Panneaux solaires,
batteries, pompe, potager, champ, poulailler, moutons, verger, serre, cuisine et
réfrigérateur ; les journées ne passent que quand vous cliquez sur **Dormir**.

- **Version** : 0.11.0 (affichée dans ⚙️ Options › À propos)
- **Conception** : [`docs/conception.md`](docs/conception.md) (v15), qui fait foi
- **Technique** : un seul fichier `index.html`, sans bibliothèque, sans étape de
  build, sans serveur. Il fonctionne ouvert depuis le disque comme servi en HTTP.

## Jouer

### En local

Ouvrez `index.html` dans un navigateur récent (double-clic, ou glisser le fichier
dans une fenêtre). Rien à installer.

### En ligne (GitHub Pages)

1. Poussez le dépôt sur GitHub, avec `index.html` **à la racine** de la branche `main`.
2. Sur la page du dépôt : **Settings → Pages**.
3. Dans **Build and deployment**, choisissez **Source : Deploy from a branch**.
4. **Branch** : `main`, dossier **`/ (root)`**, puis **Save**.
5. Après une à deux minutes, le jeu est en ligne à l'adresse
   `https://<votre-compte>.github.io/<nom-du-depot>/` (elle s'affiche en haut de
   la page Settings → Pages). Chaque `git push` sur `main` met le site à jour.

Aucun fichier de configuration n'est nécessaire : la page n'utilise que des
chemins relatifs, aucun `fetch` et aucun module externe.

> **Sauvegardes et adresse** : la partie est enregistrée dans le navigateur
> (`localStorage`), séparément pour chaque adresse. Une partie commencée en
> ouvrant le fichier local n'apparaît donc pas sur le site GitHub Pages, et
> inversement. Pour la transférer : ⚙️ Options › **Exporter** (copier le texte),
> puis sur l'autre adresse ⚙️ Options › **Importer**.

## Règles en bref

- La famille (2 adultes, 2 enfants) a besoin de **320 énergie par jour** ; elle
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
