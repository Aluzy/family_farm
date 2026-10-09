# 🌾 Ferme Familiale

Un *idle game* de gestion agricole familiale : une famille (quatre personnes au départ), une ferme, et un
objectif, nourrir la famille avec ce que la ferme produit. Panneaux solaires,
batteries, pompe, zone de culture et champ, silo, moulin et presse, poulailler,
troupeau (poules, moutons, vaches), verger, serre, cuisine, four et réfrigérateur.
La journée suit une horloge : réveil à 6 h, repas de la famille à
19 h, et la nuit passe quand vous cliquez sur **Zzz** (Dormir) ou, à défaut, à 22 h.

- **Version** : 1.4.0 (affichée dans ⚙️ Options › À propos ; les Options sont au bout du menu du bas)
- **Conception** : [`docs/conception.md`](docs/conception.md), qui fait foi (autres
  documents : voir « Documentation » plus bas)
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

Le site est construit et publié par GitHub à chaque `git push` sur `main`
(`.github/workflows/site.yml`) : les données sont régénérées, les tests passent, les
modules du jeu sont regroupés en un seul fichier, puis le résultat est mis en ligne.
Si un test échoue, rien n'est publié : le site reste sur sa version précédente, et
GitHub prévient par e-mail. Il n'y a aucune commande à lancer.

Réglage du dépôt, une seule fois : **Settings → Pages → Build and deployment →
Source : GitHub Actions**. Le site est à l'adresse
`https://<votre-compte>.github.io/<nom-du-depot>/` (page d'accueil) ; le jeu est à
`.../jeu.html` et l'encyclopédie à `.../encyclopedie.html`. L'avancement de chaque mise
en ligne se suit dans l'onglet **Actions** du dépôt.

Ce qui est publié n'est pas le dépôt tel quel mais le dossier `_site/` que fabrique
`scripts/build-site.mjs` : voir « Le site mis en ligne » plus bas.

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
- La **Zone de culture** s'agrandit de 6 à 30 parcelles (5 niveaux). Le **Champ**, une
  deuxième zone de 64 parcelles, s'ouvre avec le Moulin (chapitre 4) ; les arbres du
  Verger (12 au plus) apparaissent sur la carte.
- Le **Silo** (chapitre 3) stocke le blé de la ferme : de 20 à 400 selon son niveau.
- Sept chapitres mènent à une famille **100 % autonome** : L'eau et le soleil, Le
  premier potager, Le poulailler, Le four et le livre de recette, Le troupeau, Toute
  l'année, Famille autonome.

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

`jeu.html` ne contient que la structure de la page. Elle charge `css/jeu.css`, quatre scripts
classiques (`js/telemetry.js`, le suivi de session ; `vendor/phaser.min.js` ; `js/ambient-life.js`,
la vie d'ambiance de la carte, facultative ; `js/farm-stage.js`, la carte), puis `js/main.js`,
point d'entrée de **modules ES** :

| Dossier | Contenu |
|---|---|
| `js/data.generated.js` | `RAW_DATA` : toutes les valeurs d'équilibrage, générées depuis `data/*.json` (voir Données) |
| `js/engine/` | le moteur (simulation pure : pas de DOM, pas d'horloge, aléatoire à graine), un module par domaine : `catalog.js` (`DATA`), `energy.js`, `inventory.js`, `crops.js`, `animals.js`, `kitchen.js`, `techtree.js`, `campaign.js`, `night.js`, `state.js` (partie neuve, migrations), `testmode.js`, `bot.js`… |
| `js/ui/` | l'interface, un module par écran (`ferme.js`, `elevage.js`, `cuisine.js`, `marche.js`, `famille.js`…), plus `store.js` (l'état de l'interface), `render.js`, `loop.js`, `storage.js`, `actions.js` |
| `js/main.js` | charge tous les modules, puis démarre la partie |
| `js/farm-stage.js`, `js/ambient-life.js` | la carte Phaser de l'onglet Ferme et sa vie d'ambiance (scripts classiques, hors modules) |
| `scripts/` | outils Node et Python : données, carte, site, vérifications, simulation, icônes (voir plus bas) |
| `worker/`, `wrangler.toml`, `collect-server.mjs` | collecte des sessions et rapport quotidien (voir « Suivi de session ») |

Chaque module importe ce qu'il utilise et exporte ce qu'il offre : plus aucune fonction du
jeu n'est une variable globale. Conséquences :

- **tel qu'il est dans le dépôt, le jeu ne s'ouvre pas depuis le disque** (`file://`) : un
  navigateur ne charge des modules qu'en HTTP. En local : `python3 -m http.server`, puis <http://localhost:8000/jeu.html>.
  La page d'accueil, l'encyclopédie et la politique de cookies s'ouvrent toujours depuis le disque ;
- **dans la console**, l'état et le moteur passent par `FF` : `FF.state`,
  `FF.engine.countItem(FF.state, 'carotte')`, `FF.render()` ;
- **une variable de l'interface écrite depuis un autre module passe par son setter**
  (`setActiveTab('ferme')`, `setState(…)`) : un import est en lecture seule ;
- **Node** lit les mêmes fichiers que le navigateur (`package.json` : `"type": "module"`) ;
  `npm test` lance toutes les vérifications.

`tests/engine.test.js` (les tests du moteur) n'est jamais chargé par la page.

`node scripts/check-page.mjs` vérifie que chaque fichier cité par la page existe, que
chaque import mène à un fichier qui exporte bien le nom demandé, et qu'aucun module
n'est oublié.

**Le site mis en ligne** : `node scripts/build-site.mjs` (ou `npm run build`, après un
`npm install`) fabrique `_site/`, ce que GitHub publie :

- `js/jeu.bundle.js` : tous les modules regroupés en un fichier, minifié (esbuild, seule
  dépendance du projet, et seulement pour cette étape). Le joueur charge un fichier au
  lieu d'une cinquantaine, et reçoit toujours une version entière du jeu ;
- `jeu.html` : la même page, qui charge ce fichier ; chaque fichier local y est suivi de
  `?v=<empreinte de son contenu>`. Un fichier modifié change d'adresse et le navigateur le
  recharge ; il n'y a plus de numéro à changer à la main à chaque version ;
- les autres pages, `css/`, `assets/`, `vendor/`, copiés tels quels.

Le site construit s'ouvre aussi depuis le disque (double-clic sur `_site/jeu.html`).
Pour le voir en local comme en ligne : `python3 -m http.server -d _site`.

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

Après chaque modification, en local :

```sh
node scripts/build-data.mjs
```

Le script vérifie les fichiers puis réécrit `js/data.generated.js`, que le jeu charge.
GitHub le relance à chaque mise en ligne : une donnée modifiée directement sur GitHub
(depuis un téléphone, par exemple) est prise en compte sans rien lancer, et une donnée
invalide bloque la mise en ligne au lieu de casser le jeu.
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
chargement, `buildCatalog()` (`js/engine/catalog.js`) en fait `DATA` : prix des productions de la
ferme × 2, temps des plats ÷ 2, plats ajoutés aux objets. `pain.temps` vaut 20 dans le
fichier et 10 en jeu.

### Tests

```sh
npm test
```

Régénère les données et l'encyclopédie, puis lance tout : données valides
(`test-data.mjs`), moteur (`run-tests.mjs`), suivi de session (`test-telemetry.mjs`),
rapport quotidien (`test-report.mjs`), actions de l'interface
(`scripts/check-actions.mjs`), modules et fichiers de la page (`scripts/check-page.mjs`).
Chaque script se lance aussi seul avec `node`. Node 18 ou plus récent.

GitHub relance ces vérifications à chaque push (`.github/workflows/site.yml`) et ne met
le site en ligne que si elles passent toutes.

### Carte et graphismes

- **Cartes Tiled** : `node scripts/build-map.mjs` fabrique `assets/carte_printemps.json` (la
  ferme) et `assets/serre_interieur.json` (l'intérieur de la Serre) à partir des cartes de
  travail `.tmj` et de leurs jeux de tuiles `.tsx`. À relancer après chaque modification dans
  Tiled ; voir [`docs/architecture-phaser.md`](docs/architecture-phaser.md).
- **Icônes en pixel art** (elles remplacent les emojis à l'affichage) : les dessins sont dans
  `scripts/icones/art_*.py`, et `python3 scripts/icones/build.py` produit `assets/icones.png`
  et `js/ui/icones.generated.js` (Python 3 avec Pillow). `scripts/icones/preview.py` montre un
  aperçu d'un fichier de dessins. Détails : [`docs/icones.md`](docs/icones.md).
- **Bâtiments dessinés en code** : `scripts/batiments/silo.py` génère `assets/silo.png`.
- **Bâtiments délabrés** (début de partie, avant réparation) : `python3 scripts/batiments/ruines.py`
  écrit `assets/<image>_ruine.png` pour la maison, l'étable, le moulin, la serre, le poulailler et
  le silo, à partir des images d'origine (même taille, mêmes cases : chacune remplace l'originale
  telle quelle). Le moulin délabré a ses 4 cases identiques : il ne tourne pas. Pour la serre,
  seule la verrière (découpe `batiment`) est abîmée. `--apercu` écrit une planche avant / après.

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

1. `npm test` passe (GitHub le vérifie de toute façon avant de publier).
2. Ouvrir le jeu servi en HTTP
   (par exemple `python3 -m http.server` et <http://localhost:8000/>) : aucune
   erreur dans la console, à 390 px et à 1 280 px de large, en thème clair et
   sombre.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/conception.md`](docs/conception.md) | la conception du jeu : règles, valeurs, équilibrage (fait foi) |
| [`docs/conception-v2.md`](docs/conception-v2.md) | proposition v2 (niveaux d'XP, énergie du personnage, houe, saisons retirées) : à valider, pas encore codée |
| [`docs/architecture-phaser.md`](docs/architecture-phaser.md) | la carte de la ferme : découpage, cartes Tiled, pièges à éviter |
| [`docs/vie-ambiance.md`](docs/vie-ambiance.md) | la vie d'ambiance de la carte (vent, nuages, animaux, habitants) |
| [`docs/icones.md`](docs/icones.md) | les icônes en pixel art, la police et les jauges |
| [`docs/arbre_technologique.md`](docs/arbre_technologique.md) | proposition d'arbre des technologies v2 (`docs/techtree_v2.js`) |
| [`worker/README.md`](worker/README.md) | installation du Worker Cloudflare et du rapport quotidien |

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
