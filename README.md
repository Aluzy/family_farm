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
- **Technique** : des pages HTML sans bibliothèque à installer ni serveur :
  `index.html` (page d'accueil), `jeu.html` (le jeu, dont le style est dans
  `css/` et le code dans `js/`) et `encyclopedie.html` (glossaire du jeu, généré depuis
  `encyclopedie_ferme_familiale.json` par `node build-encyclopedie.mjs`), plus `cookies.html` (politique de cookies
  et traceurs). Le jeu se sert en HTTP (voir Structure) ; les autres pages s'ouvrent aussi depuis le disque.
  Le jeu lui-même n'a besoin d'aucun serveur ; seul le suivi de session facultatif
  (voir plus bas) envoie des données, et uniquement si le joueur l'accepte.
- **Carte de la ferme** : l'onglet Ferme affiche une carte en pixel art (Phaser 3,
  `vendor/phaser.min.js`, scène dans `js/farm-stage.js`, images et carte Tiled dans
  `assets/`) ; voir [`docs/architecture-phaser.md`](docs/architecture-phaser.md). Sans
  Phaser, la Ferme garde sa liste classique et le jeu reste jouable.

## Jouer

### En local

Dans le dossier du jeu : `python3 -m http.server`, puis <http://localhost:8000/> dans un
navigateur récent, et **Jouer**. Rien à installer (le jeu ne s'ouvre pas par double-clic :
ses modules ne se chargent qu'en HTTP).

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

`jeu.html` ne contient que la structure de la page. Elle charge `css/jeu.css`, deux scripts
classiques (`js/telemetry.js`, le suivi de session, et `vendor/phaser.min.js` +
`js/farm-stage.js`, la carte), puis `js/main.js`, point d'entrée de **modules ES** :

| Dossier | Contenu |
|---|---|
| `js/data.generated.js` | `RAW_DATA` : toutes les valeurs d'équilibrage, générées depuis `data/*.json` (voir Données) |
| `js/engine/` | le moteur (simulation pure : pas de DOM, pas d'horloge, aléatoire à graine), un module par domaine : `catalog.js` (`DATA`), `energy.js`, `inventory.js`, `crops.js`, `animals.js`, `kitchen.js`, `techtree.js`, `campaign.js`, `night.js`, `state.js` (partie neuve, migrations), `testmode.js`, `bot.js`… |
| `js/ui/` | l'interface, un module par écran (`ferme.js`, `elevage.js`, `cuisine.js`, `marche.js`, `famille.js`…), plus `store.js` (l'état de l'interface), `render.js`, `loop.js`, `storage.js`, `actions.js` |
| `js/main.js` | charge tous les modules, puis démarre la partie |

Chaque module importe ce qu'il utilise et exporte ce qu'il offre : plus aucune fonction du
jeu n'est une variable globale. Conséquences :

- **le jeu ne s'ouvre plus depuis le disque** (`file://`) : un navigateur ne charge des
  modules qu'en HTTP. En local : `python3 -m http.server`, puis <http://localhost:8000/jeu.html>.
  La page d'accueil, l'encyclopédie et la politique de cookies s'ouvrent toujours depuis le disque ;
- **dans la console**, l'état et le moteur passent par `FF` : `FF.state`,
  `FF.engine.countItem(FF.state, 'carotte')`, `FF.render()` ;
- **une variable de l'interface écrite depuis un autre module passe par son setter**
  (`setActiveTab('ferme')`, `setState(…)`) : un import est en lecture seule ;
- **Node** lit les mêmes fichiers que le navigateur (`package.json` : `"type": "module"`) ;
  `npm test` lance toutes les vérifications.

`tests/engine.test.js` (les tests du moteur) n'est jamais chargé par la page.

`js/main.js` est chargé avec `?v=<version du jeu>` : en changeant `GAME_VERSION`
(dans `js/engine/base.js`), changez aussi ce suffixe dans `jeu.html`.
`node scripts/check-page.mjs` vérifie qu'ils concordent, que chaque import mène à un
fichier qui exporte bien le nom demandé, et qu'aucun module n'est oublié. Les modules
importés par `main.js`, eux, n'ont pas de suffixe : après une mise à jour, le navigateur
peut garder un ancien module en cache une dizaine de minutes (durée fixée par GitHub Pages).

L'état du jeu est un seul objet JSON, versionné (migrations dans `MIGRATIONS`) ;
l'interface ne le modifie qu'à travers les actions nommées du moteur.

**Boutons et actions** : un bouton porte `data-action="nom"` ; la page n'a qu'un écouteur
de clics (`js/ui/events.js`), qui appelle la fonction déclarée sous ce nom. Chaque écran
déclare les siennes à la fin de son module, à côté du gabarit qui affiche le bouton :

```js
// js/ui/cuisine.js
registerActions({
  'mill-start': () => { /* … */ },
  'mill-cancel': () => { /* … */ },
});
```

`target` (premier argument) est l'élément cliqué (ses `data-*` portent les paramètres). Une
action déclarée deux fois est refusée au chargement. Pour ajouter un bouton : son
`data-action` dans le gabarit, sa fonction dans le `registerActions` du même module, et son
classement dans `worker/src/report.mjs` (action de jeu ou clic d'interface) ;
`node scripts/check-actions.mjs` signale ce qui manque.

### Données

Toutes les valeurs du jeu sont dans `data/`, un fichier JSON par domaine :

| Fichier | Contenu |
|---|---|
| `items.json` | objets (aliments, graines, produits), plats retirés, durées de conservation |
| `recipes.json` | ateliers et recettes |
| `crops.json` | cultures, zone de culture, serre, verger, saisons |
| `animals.json` | silo, poulailler, animaux, étable |
| `techtree.json` | arbre des technologies |
| `campaign.json` | chapitres et courrier |
| `energy.json` | panneaux, batteries, pompe, usure, réfrigérateur |
| `general.json` | départ, horloge, famille, marché, absence |
| `simulation.json` | réglages du joueur automatique |

Après chaque modification :

```sh
node scripts/build-data.mjs
```

Le script vérifie les fichiers puis réécrit `js/data.generated.js`, que la page charge.
Il refuse d'écrire si une recette cite un ingrédient ou un atelier inconnu, si une culture
n'a pas son objet ou sa graine, si un plat porte le nom d'un objet existant, si deux
recettes s'utilisent l'une l'autre, si une recette n'est ni libre ni débloquée par l'arbre…
Le message dit où (`recipes.pain.ingredients[0] : « farinee » n'est ni un objet…`).

**Ajouter une recette** : une entrée dans `recipes.json` suffit pour qu'elle existe en jeu
(objet, Livre de recette, Marché). Quelques tests du moteur comptent les recettes ou en
fixent la liste : ils échouent tant qu'on ne les a pas mis à jour, c'est voulu.
L'encyclopédie se complète à part.

```json
"tarte_poires": {
  "nom": "Tarte aux poires", "icone": "🥧",
  "station": "four", "temps": 40,
  "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "poire", "qte": 3 }],
  "libre": true
}
```

- `libre: true` : disponible dès que l'atelier est construit. Sans ce champ, un nœud de
  l'arbre doit la débloquer (`effet.recettes` dans `techtree.json`).
- `conservation` (facultatif) : nuits avant péremption ; `null` = ne périme jamais ; sans ce
  champ, 6 nuits comme tous les plats.
- L'énergie et le prix du plat sont calculés depuis les ingrédients ; `energieForcee` et
  `priceMultiplier` permettent de les fixer. Un plat peut servir d'ingrédient à un autre,
  quel que soit l'ordre dans le fichier.

**Ajouter une culture** : l'objet récolté (et sa graine) dans `items.json`, la culture dans
`crops.json` avec son champ `sprite` (sa découpe dans `assets/crops.png`).

**Notes** : JSON n'a pas de commentaires. Une clé qui commence par `//` est une note pour
le lecteur, placée avant la clé qu'elle commente (`"//pain": "…"`) ; le script les retire.

**Valeurs écrites et valeurs en jeu** : les fichiers donnent les valeurs de base. Au
chargement, `buildCatalog()` (`js/engine.js`) en fait `DATA` : prix des productions de la
ferme × 2, temps des plats ÷ 2, plats ajoutés aux objets. `pain.temps` vaut 20 dans le
fichier et 10 en jeu.

### Tests

```sh
node run-tests.mjs                  # moteur du jeu
node test-data.mjs                  # données : valides, et les erreurs possibles sont bien signalées
node scripts/build-data.mjs --check # js/data.generated.js est à jour avec data/*.json
node test-telemetry.mjs             # suivi de session (rien sans consentement, retrait, limites, commentaires)
node test-report.mjs                # rapport quotidien (calculs, Markdown, protections du Worker)
node build-encyclopedie.mjs --check # encyclopedie.html est à jour avec son JSON
node scripts/check-page.mjs         # jeu.html charge des fichiers qui existent, à la bonne version
node scripts/check-actions.mjs      # chaque data-action a sa fonction, et le rapport quotidien la connaît
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
2. Ouvrir le jeu servi en HTTP
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
son nom brut suivi de « (non répertorié) ». `node scripts/check-actions.mjs` signale une action non classée avant qu'elle n'arrive dans un rapport. Installation : `worker/README.md`.

> **Le dépôt du jeu reste public** (GitHub Pages ne fonctionne pas sur un dépôt privé
> avec un compte gratuit : rendre ce dépôt privé mettrait le jeu hors ligne). Les
> rapports, eux, vont dans un autre dépôt, privé ; le Worker refuse de publier dans un
> dépôt public, car le rapport contient les commentaires des joueurs.

## Crédits

- Graphismes : pack "Farm – 4 Seasons 16x16 Tileset" par antarcticbees — <https://antarcticbees.itch.io/>
- Moteur d'affichage : Phaser 3 (licence MIT)
