# 🌾 Ferme Familiale

Un jeu de gestion agricole familiale en pixel art : une famille (quatre personnes au départ)
s'installe sur une **terre sauvage** et doit, à terme, se nourrir de ce que la ferme produit.
On y ramasse des pierres et du bois, on fauche l'herbe haute (des fibres, des bottes de paille par la botteleuse), on fabrique à l'Atelier, on **construit bloc
par bloc** (murs, portes, fenêtres, étage, toits), on cultive, on élève poules, moutons, vaches
et abeilles, on cuisine, et l'on descend à la mine, cachée dans les bois de la ferme. La ferme
est au centre du **grand monde**, une seule carte de biomes (prairie, forêt profonde, marais,
lande, montagne, côte, mer) cachée au départ et découverte en marchant ou à cheval : des
hameaux et leurs habitants, des grottes, de quoi ramasser, pêcher et chasser des yeux, et la
**calèche** de son cocher qui fait le tour des hameaux (voir
[`docs/grand-monde.md`](docs/grand-monde.md)). Un récit, celui de l'île de Céron, se découvre
au fil des rencontres ([`docs/recit/`](docs/recit/README.md)). Les anciennes autres cartes (la
ville, le chemin de transition, la montagne, la plage, le train, l'école, l'infra-monde) ont
été retirées pour faire place au grand monde ; le jeu d'avant est gardé tel quel sur la branche
`archive/jeu-avant-grand-monde`.

- **Version** : 1.22.0 (affichée dans ⚙️ Options › À propos ; format de sauvegarde 66)
- **Conception** : [`docs/conception.md`](docs/conception.md), qui fait foi, et
  [`docs/carte-generee.md`](docs/carte-generee.md) pour la ferme générée et la construction
  (autres documents : voir « Documentation » plus bas)
- **Chiffres entiers** : toutes les valeurs du jeu sont entières (pièces, Wh, L,
  %, kg) ; voir la note v25 de la conception
- **Technique** : des pages HTML sans bibliothèque à installer ni serveur :
  `index.html` (page d'accueil), `jeu.html` (le jeu, dont le style est dans
  `css/` et le code dans `js/`) et `encyclopedie.html` (glossaire du jeu, généré depuis
  `encyclopedie_ferme_familiale.json` par `node scripts/build-encyclopedie.mjs`), plus `cookies.html` (politique de cookies
  et traceurs). Les quatre pages ont le même design, celui du jeu (voir « Les pages du site »).
  Le jeu se sert en HTTP (voir Structure) ; les autres pages s'ouvrent aussi depuis le disque.
  Le jeu lui-même n'a besoin d'aucun serveur ; seul le suivi de session facultatif
  (voir plus bas) envoie des données, et uniquement si le joueur l'accepte.
- **Cartes** : le grand monde (avec la ferme) et les grottes sont des cartes en pixel art
  (Phaser 4, `vendor/phaser.min.js` ; scène du monde et de la ferme dans `js/farm-stage.js` et
  `js/carte/ferme/`, dessinée par régions ; scène des grottes dans `js/grotte.js` ; images dans
  `assets/`). Sur téléphone et tablette, deux doigts pincés dézooment la vue ; voir
  [`docs/architecture-phaser.md`](docs/architecture-phaser.md). Tous les graphismes sont
  originaux, dessinés par les générateurs Python de `scripts/` (la vue de la ferme des pages
  du site est une capture du jeu).

## Jouer

### En local

Dans le dossier du jeu : `python3 -m http.server`, puis <http://localhost:8000/> dans un
navigateur récent, et **Jouer**. Rien à installer (le jeu ne s'ouvre pas par double-clic :
ses modules ne se chargent qu'en HTTP).

### En ligne (GitHub Pages)

Le site est construit et publié par GitHub à chaque `git push` sur `main`
(`.github/workflows/site.yml`) : les fichiers générés commités (données, encyclopédie,
cartes) sont vérifiés à jour, les tests passent, les modules du jeu sont regroupés en un
seul fichier, puis le résultat est mis en ligne. Un fichier généré oublié fait échouer
l'action : relancer le script qui le fabrique (voir « Tests ») et commiter le résultat.
Si un test échoue, rien n'est publié : le site reste sur sa version précédente, et
GitHub prévient par e-mail.

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

- **Départ** : on compose la famille (nom, 1 à 6 membres dont au moins un adulte, jusqu'à
  3 chiens ou chats, personnage principal), puis on choisit une graine : elle tire la ferme,
  une terre sauvage de 144 × 114 cases, sans bâtiment, et le grand monde autour. 300 💰 pour
  commencer ; un didacticiel guide les premiers gestes.
- **Ramasser, fabriquer, construire** : petites pierres, morceaux de bois et herbes se
  ramassent à la main ; l'**Atelier** (3 bois et 3 pierres) fabrique planches, murs, portes,
  fenêtres, paillasses, outils… Le mode **Construire** (🔨) pose les blocs sur la carte : une
  enceinte de murs avec une porte (posée sur un mur) devient une **pièce close** ; avec une
  paillasse, c'est le **foyer**, où l'on dort. Un bloc clé fait d'une enceinte un bâtiment
  (nichoir : le Poulailler, mangeoire : l'Étable, bac à semis : la Serre, meule : le Moulin) ;
  le **Silo** se bâtit dehors en blocs de silo (2 colonnes de 3 blocs, 10 blés par bloc ; un
  appui long dessus pour l'agrandir). Murs rehaussés, étage par un escalier, toits, meubles, chemins,
  barrières, lanternes, réverbères, ruches et bacs à fleurs se posent de la même façon.
- **Outils** (à l'Atelier) : la **houe** laboure l'herbe (dans la Serre, chaque case labourée
  est un bac en planches) ; la **hache** coupe arbres et
  buissons (un sapin laisse une pomme de pin, un autre arbre un gland : un arbre abattu ne
  repousse pas, mais une graine se plante sur n'importe quelle case d'herbe libre) ; la
  **pioche** casse les rochers (et le minerai de la grotte) ; la **faux** fauche l'herbe haute
  (la paille des bêtes) ; la **canne à pêche** pêche dans l'étang, la mare, le lac et la mer.
- **Le grand monde** : le brouillard se lève autour du personnage ; la carte du monde et la
  boussole montrent ce qui a été vu. Le **cheval** (l'Écurie) va plus vite. Dans les **hameaux**
  vivent des familles qui ont leurs métiers ; certains ont un atelier qui travaille sur commande.
  La **calèche** passe par les chemins : on la hèle pour acheter graines et produits des
  habitants, vendre ceux de la ferme et passer commande au cocher. Loin de la ferme, le
  personnage ne mange que ce que contient son **sac à provisions**.
- **La famille** : chaque membre a son **équipement** (casque à lampe, chapeau, bottes, gants,
  tablier, salopette, manteau, fabriqués à l'Atelier) : des gestes moins fatigants, la lumière
  des grottes, une marche plus rapide dans le marais et la montagne ; le
  second adulte, le **compagnon**, aide aux tâches de la ferme (bêtes, ruches, arrosage).
- **Le temps** : la journée commence à 6 h, une heure dure 30 s ; la famille mange à 19 h et
  se couche à 22 h ; à minuit, la nuit passe (ponte, laine, lait, aliments qui vieillissent).
  La nuit, « Zzz » envoie le personnage au lit : endormi, une heure passe en 3 s et son
  énergie remonte. Il ne dort que quand on l'envoie se coucher. Les plantes poussent 24 h
  après leur arrosage.
- **Les repas** : la famille a besoin de 150 énergie par jour (50 par adulte, 25 par enfant) ;
  elle mange au repas du soir, d'abord ce qui périme le plus tôt.
- **Électricité et eau** circulent en temps réel : panneau (de 7 h à 19 h) → batterie →
  pompe, moulin, presse, réfrigérateur, station du robot. Les appareils s'usent.
- **Dix niveaux d'expérience** (⭐) débloquent cultures, bâtiments et ateliers ; un **arbre
  des technologies** (37 technologies, 7 branches) les automatisations (arrosage, robot de
  récolte et de semis, nourrissage…), payées en points, en pièces et en ressources.
- **Sept chapitres** racontent l'histoire jusqu'à une famille **100 % autonome** : L'héritage,
  Le grenier, Le poulailler, Le four et le livre de recette, Le troupeau, Toute l'année,
  Famille autonome.
- **Pas de saisons** : les cultures, l'eau, le soleil et les arbres donnent la même chose
  chaque nuit de l'année.

Le détail (valeurs, formules, tableau d'équilibrage) est dans la conception ; les
règles principales sont aussi rappelées dans le jeu (⚙️ Options › À propos), et
chaque bâtiment a son bouton **?** (rôle, consommation, production).

### Absence et onglet en arrière-plan

Quand vous revenez (page rouverte, ou onglet qui repasse au premier plan), le
temps écoulé est rattrapé, **plafonné à 8 heures**, par pas de 5 s :

- avancent : panneau et batterie, pompe, moulin, presse, préparations en cours,
  consommation du réfrigérateur ;
- n'avancent pas : les nuits (ni pousse, ni repas, ni ponte, ni péremption) et
  l'usure des appareils ;
- ce temps compte comme temps d'éveil.

Si l'absence dépasse une minute, la fenêtre **« Ravi de te revoir ! »** donne la date,
l'argent et les biens produits pendant l'absence.

## Développer

### Structure

`jeu.html` ne contient que la structure de la page. Elle charge `css/jeu.css`, des scripts
classiques (`js/telemetry.js`, le suivi de session ; `vendor/phaser.min.js` ; `js/carte/*.js`,
les outils communs des cartes ; `js/son.js`, le son ; `js/ambient-life.js`, la vie d'ambiance ; `js/fermier.js`, le
personnage ; `js/famille-ferme.js`, la famille ; `js/carte/ferme/*.js` et `js/farm-stage.js`,
la carte de la ferme ; `js/grotte.js`, la grotte de la mine), puis `js/main.js`, point
d'entrée de **modules ES** :

| Dossier | Contenu |
|---|---|
| `js/data.generated.js` | `RAW_DATA` : toutes les valeurs d'équilibrage, générées depuis `data/*.json` (voir Données) |
| `js/engine/` | le moteur (simulation pure : pas de DOM, pas d'horloge, aléatoire à graine), un module par domaine : `catalog.js` (`DATA`), `energy.js`, `inventory.js`, `crops.js`, `animals.js`, `kitchen.js`, `techtree.js`, `campaign.js`, `night.js`, `state.js` (partie neuve, migrations), `testmode.js`, `bot.js`… |
| `js/ui/` | l'interface, un module par écran (`ferme.js`, `elevage.js`, `cuisine.js`, `marche.js`, `famille.js`…), plus `store.js` (l'état de l'interface), `render.js`, `loop.js`, `storage.js`, `actions.js` |
| `js/main.js` | charge tous les modules, puis démarre la partie |
| `js/farm-stage.js`, `js/carte/ferme/` | la carte Phaser de la ferme, une partie par fichier (le sol, le décor, la hache, les blocs, l'étage, les toits, les abeilles, les arbres plantés…) |
| `js/grotte.js` | la scène Phaser de la grotte de la mine (`window.Grotte`), réglée par `data/grotte.json` |
| `js/ambient-life.js`, `js/fermier.js`, `js/famille-ferme.js` | la vie d'ambiance, le personnage et la famille sur la carte (scripts classiques, hors modules ; voir docs/personnage.md) |
| `js/son.js`, `js/ui/son.js`, `assets/son/` | le son (`window.FermeSon`) : musique, ambiances, bruits des gestes et de l'interface, la partie « Son » des Options ; voir [`docs/son.md`](docs/son.md) |
| `scripts/` | outils Node et Python : données, carte, site, vérifications, simulation, icônes (voir plus bas) |
| `tests/` | les tests (`npm test`) : moteur, données, suivi de session, rapport quotidien |
| `worker/`, `wrangler.toml`, `scripts/collect-server.mjs` | collecte des sessions et rapport quotidien (voir « Suivi de session ») |

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

`tests/engine/` (les tests du moteur) n'est jamais chargé par la page.

`node scripts/check-page.mjs` vérifie que chaque fichier cité par la page existe, que
chaque import mène à un fichier qui exporte bien le nom demandé, et qu'aucun module
n'est oublié.

**Le site mis en ligne** : `node scripts/build-site.mjs` (ou `npm run build`, après un
`npm ci`, qui installe les versions exactes de `package-lock.json`) fabrique `_site/`, ce
que GitHub publie :

- `js/jeu.bundle.js` : tous les modules regroupés en un fichier, minifié (esbuild, seule
  dépendance du projet, et seulement pour cette étape). Le joueur charge un fichier au
  lieu d'une cinquantaine, et reçoit toujours une version entière du jeu ;
- `jeu.html` : la même page, qui charge ce fichier ; chaque fichier local y est suivi de
  `?v=<empreinte de son contenu>`. Un fichier modifié change d'adresse et le navigateur le
  recharge ; il n'y a plus de numéro à changer à la main à chaque version ;
- les scripts classiques de la page (`js/farm-stage.js`, `js/grotte.js`…) minifiés
  un à un, sans changer de forme ;
- les autres pages, `css/`, `assets/`, `vendor/`, copiés tels quels, sauf les fichiers de
  travail de `assets/` que le jeu ne charge pas (cartes et jeux de tuiles Tiled `.tmj`/`.tsx`,
  images lues seulement par les générateurs Python : `ASSETS_HORS_SITE` dans le script).
  La carte des sources de `jeu.bundle.js` n'est pas publiée (`--sourcemap` pour l'avoir en local).

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

### Les pages du site

Les quatre pages partagent le design du jeu (`css/jeu.css`) : sa police en pixels
(`assets/police_dialogue.woff`), ses cadres de bois sur fond crème (bordure terre de 3 px, filet
clair intérieur), ses boutons vert ou papier, le médaillon, et les icônes en pixel art à la place
des emojis (`js/icones-page.js`). Thème sombre et téléphone compris.

- **`index.html`, l'accueil** : son style est dans la page. En tête, une vraie ferme du jeu vue de
  loin, `assets/accueil_ferme.webp` (3600 × 1000, WebP sans perte) : une capture au zoom 1 (un
  pixel du jeu par pixel), jamais redimensionnée sur ordinateur, à moitié taille sur téléphone,
  affichée sans lissage (`image-rendering: pixelated`). Pour la refaire : ouvrir une partie
  dans Chromium, zoom de la carte à 1 (`zoomK` de la scène, `js/carte/ferme/camera.js`),
  interface et brouillard masqués, et recadrer la capture autour de la ferme.
- **`jeu.html`, le jeu** : un écran de chargement le couvre dès la première image
  (`#chargement`, son style en fin de `css/jeu.css`) : quatre carottes du potager
  (`assets/crops.png`) poussent avec le chargement, puis l'écran s'efface en fondu.
  `window.Chargement.avance(p)` (p de 0 à 1) et `fini()`, définis par le petit script de la page :
  les images de la scène comptent pour 10 à 70 % (le chargeur de Phaser, `js/farm-stage.js`), la
  scène créée 75 %, puis la part de la vue dessinée (`vueDessinee`, `js/carte/ferme/sol.js` : les
  régions sous la caméra et, dans le grand monde, leur sol arrivé du Web Worker). L'écran est
  caché pendant la configuration d'une nouvelle partie, s'efface à la première image d'une
  grotte, aussitôt si la carte ne peut pas s'afficher, et au plus tard au bout de 30 s.
- **`encyclopedie.html`, l'encyclopédie** : son style est dans la page ; le générateur
  (`scripts/build-encyclopedie.mjs`) n'en réécrit que le compte des entrées (le ruban de
  l'en-tête), le menu des catégories et les sections, à partir de
  `encyclopedie_ferme_familiale.json`.
- **`cookies.html`, la politique de cookies** : le texte dans une lettre crème, comme le courrier
  du jeu. Changer sa mise en forme ne demande rien ; changer son texte, si ce qui est collecté
  change, demande de changer `POLICY_VERSION` (voir « Suivi de session »).

### Données

Toutes les valeurs du jeu sont dans `data/`, un fichier JSON par domaine :

| Fichier | Contenu |
|---|---|
| `items.json` | objets (aliments, graines, produits, matériaux), plats retirés, durées de conservation |
| `recipes.json` | ateliers et recettes, l'Atelier de la ferme générée et ses blocs |
| `crops.json` | cultures, zone de culture, serre, verger, outils (houe, hache, pioche, faux, canne) |
| `animals.json` | silo, poulailler, animaux, étable, ruches, cheval |
| `meubles.json` | meubles de la maison, objets du dehors (bac à fleurs) |
| `equipement.json` | l'équipement de la famille et le sac à provisions |
| `terrain.json` | le terrain de la carte de Tiled et la génération de la ferme |
| `grotte.json` | la grotte de la mine : niveaux, minerais, réglages de la scène |
| `monde.json` | le grand monde : les biomes (`BIOMES`), les réglages de son générateur (`PLAN_MONDE`), sa végétation, ses roches, ce qui s'y ramasse, sa faune, les hameaux, leurs habitants et la calèche |
| `recit.json` | le récit de Céron : personnages, répliques, scènes, carnet (voir `docs/recit/`) |
| `ile.json` | l'économie de l'île : les ateliers des hameaux, la veillée, le remboursement |
| `techtree.json` | arbre des technologies |
| `campaign.json` | chapitres et courrier |
| `niveaux.json` | niveaux d'expérience : seuils, déblocages, XP des actions et des chapitres |
| `energy.json` | panneau, batterie, pompe, réservoir, soleil, usure, réfrigérateur |
| `general.json` | départ, horloge, famille, compagnon, bonheur, prix de vente, absence, didacticiel |
| `simulation.json` | réglages du joueur automatique |
| `index.json` | la liste des fichiers, dans l'ordre où `build-data.mjs` les assemble (un nouveau fichier s'y ajoute) |

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
(objet, Livre de recette, prix à la calèche). Quelques tests du moteur comptent les recettes ou en
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
  `coefPrix` permettent de les fixer. Un plat peut servir d'ingrédient à un autre,
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

`tests/all.mjs` régénère les données et l'encyclopédie, vérifie que les cartes construites
sont à jour avec les cartes Tiled (`node scripts/build-map.mjs --check`) et s'arrête là si
l'une de ces étapes échoue ; puis il lance tout, même après un échec, et fait le bilan : les
suites de tests (`node tests/run-tests.mjs --tous`), les actions de l'interface
(`scripts/check-actions.mjs`), les modules et fichiers de la page (`scripts/check-page.mjs`).
Node 22 (celui de la CI) ; `npm ci` une fois (esbuild, pour `npm run build`).

Les tests tournent sur `node:test`, le lanceur intégré de Node, un processus par fichier : un
fichier qui plante est compté en échec sans arrêter les autres. Quatre suites :

- **moteur** : `tests/engine/*.test.mjs`, un fichier par thème (énergie, potager, cuisine,
  Étable, automatisation, chapitres, nuit, outils…), chacun n'important que les
  fonctions du moteur dont il se sert. L'aide commune est dans `tests/engine/aide.mjs` :
  `test`, `assert`, `assertEqual` (égalité par `JSON.stringify` : l'ordre des clés compte),
  la lune neutralisée (`avecLune` pour la rallumer) et les états de départ partagés
  (`farm()`, `garden()`, `ranch()`, `atelier()`…). Une aide propre à un fichier reste dans ce
  fichier ;
- **données** : `tests/test-data.mjs` ; **suivi de session** : `tests/test-telemetry.mjs` ;
  **rapport quotidien** : `tests/test-report.mjs`.

```sh
node tests/run-tests.mjs                 # le moteur seul (nombre de tests et durée par fichier)
node tests/run-tests.mjs --tous          # les quatre suites
node tests/run-tests.mjs cuisine nuit    # les fichiers dont le nom contient « cuisine » ou « nuit »
node tests/run-tests.mjs --grep Moulin   # les tests dont le nom correspond (expression régulière)
node tests/run-tests.mjs --lent          # et les tests de plus de 50 ms
node --test tests/engine/cuisine.test.mjs   # un fichier seul, sortie de node:test
```

Un nouveau test du moteur va dans le fichier de son thème (ou un nouveau
`tests/engine/<thème>.test.mjs`, pris tout seul par le lanceur), avec ses imports depuis
`../../js/engine/index.js` et `./aide.mjs`.

#### Test de fumée (navigateur, hors CI)

```sh
npm run smoke
```

`tests/smoke.mjs` sert le dépôt avec un petit serveur statique Node sur un port libre, ouvre
`jeu.html` dans Chromium (Playwright), lance une nouvelle partie, puis visite les cartes par
`window.FermeHote.go` : la mine de la ferme, puis un niveau plus profond, revient à la ferme,
puis visite une grotte de la montagne du grand monde (deux niveaux) et en ressort. Il échoue sur une erreur de la console, une exception de
la page, une réponse HTTP ≥ 400 ou une carte qui ne s'ouvre pas ; les requêtes vers un autre
hôte sont coupées. Playwright : celui du dépôt s'il est installé, sinon
`/opt/node-tools/node_modules/playwright` ; navigateurs : `PLAYWRIGHT_BROWSERS_PATH` (par
défaut `/opt/pw-browsers`). Sans Playwright ou sans Chromium, il le dit et sort sans erreur.
`node tests/smoke.mjs --voir` ouvre une fenêtre. Compter une trentaine de secondes.

GitHub relance ces vérifications à chaque push sur `main` et à chaque pull request
(`.github/workflows/site.yml`) et ne met le site en ligne que si elles passent toutes. Il
ne régénère rien : `scripts/build-data.mjs`, `scripts/build-encyclopedie.mjs` et
`scripts/build-map.mjs` y tournent avec `--check`, et un fichier généré pas à jour
(`js/data.generated.js`, `encyclopedie.html`, `assets/*.json` des cartes) fait échouer
l'action. Après une modification de `data/`, de `encyclopedie_ferme_familiale.json` ou d'une
carte Tiled : `npm run build:data`, `node scripts/build-encyclopedie.mjs` ou
`npm run build:map`, puis commiter le résultat.

### Carte et graphismes

Les générateurs d'images (`scripts/**/*.py`) demandent Python 3 et Pillow :
`pip install -r requirements.txt`. Leur option `--apercu` écrit des `apercu_*.png` à la
racine, ignorés par git. Ils écrivent des PNG en couleurs vraies (RGBA) ; les PNG commités
de `assets/` sont, eux, en palette indexée quand c'est possible sans perte (≤ 256 couleurs) :
plus légers, pixel pour pixel identiques.

- **Cartes Tiled** : `node scripts/build-map.mjs` (ou `npm run build:map`) fabrique les cartes
  que le jeu charge (`assets/carte_printemps.json`, dont la ferme générée reprend les jeux de
  tuiles) à partir de la carte de travail `.tmj` et de ses jeux de tuiles `.tsx`. À relancer
  après chaque modification dans Tiled ; `--check` vérifie sans écrire. Les tuiles de la grotte
  sont dessinées par `scripts/carte/grotte.py`. Les jeux de tuiles de la montagne et de la
  plage, `assets/trouvailles.png` et la faune (`assets/faune.json`, `faune_*.png` : `scripts/carte/faune.py`) restent dans
  `assets/` comme kit de textures pour les biomes du grand monde. Voir
  [`docs/architecture-phaser.md`](docs/architecture-phaser.md).
- **Le plan du grand monde** (ses biomes, rivières, chemins et lieux, `js/engine/monde-gen.js`) :
  `node scripts/monde/apercu.mjs <graine> [fichier.png]` en écrit une image pour le relire (sans
  fichier : `apercu_monde.png` à la racine, ignoré par git). Voir
  [`docs/grand-monde.md`](docs/grand-monde.md), étape 4.
- **Icônes en pixel art** (elles remplacent les emojis à l'affichage) : une image PNG par icône
  dans [`assets/icones/`](assets/icones) (avec une galerie), à retoucher telle quelle ;
  `python3 scripts/icones/build.py` les assemble en `assets/icones.png` et
  `js/ui/icones.generated.js` (Python 3 avec Pillow). Détails : [`docs/icones.md`](docs/icones.md).
- **Police des fenêtres de dialogue** (essai) : `python3 scripts/police/police_dialogue.py` fait
  `assets/police_dialogue.woff` (avec fontTools) d'après l'alphabet dessiné à la main de
  `scripts/police/originaux/` ; `css/jeu.css` la pose sur les fenêtres (`.modal`).
- **Puits et pompe** : `python3 scripts/batiments/puits.py` génère `assets/puits.png`, le puits
  posé en bloc ; la pompe s'y ajoute une fois posée dessus et vibre légèrement quand elle tourne.
- **Citerne** : `python3 scripts/batiments/citerne.py` génère `assets/citerne.png`, la citerne
  (le réservoir) posée en bloc ; son tube de niveau suit l'eau du réservoir.
- **Terre labourée** : `python3 scripts/carte/terre_bords.py` (la terre du dehors et ses
  bordures sur l'herbe), `scripts/carte/terre_arrosee.py` (la terre mouillée) et
  `scripts/carte/terre_serre.py` (les bacs en planches de la Serre).
- **Blocs de la carte** : `python3 scripts/carte/blocs.py` dessine les blocs posés en mode
  Construire (murs, portes, fenêtres, meubles du dehors, ruches, réverbères…).

### Son

Les sons (`assets/son/`, avec leur double `.m4a` pour Safari) sont synthétisés par `scripts/son/`
(Python 3, numpy, scipy et ffmpeg) : `python3 scripts/son/fabrique.py` les refait tous, les
encode et met à jour la table de `js/son.js`. Quelques-uns sont de vrais enregistrements libres
de droits : les bêtes de la ferme (`scripts/son/enregistrements/`), l'arrosoir, la hulotte, la
grenouille, le coq, le chat, le chien et le galop du cheval (coupés et égalisés par
`scripts/son/libres.py`, posés dans le jeu par `scripts/son/vers_jeu.py`) ; leurs auteurs et
licences sont dans [`assets/son/CREDITS.md`](assets/son/CREDITS.md). Voir
[`docs/son.md`](docs/son.md).

### Simulation d'équilibrage

```sh
node scripts/simulate.mjs
```

Un joueur automatique joue une partie complète avec les vraies actions du moteur
et compare la courbe d'autonomie aux jalons de la conception (section 8.10). Le
même joueur est disponible dans le mode test (bouton « Simuler 60 nuits »). Le
script écrit `simulation.csv` et `simulation-autonomie.svg` dans le dossier
courant (ignorés par git).

### Mesure des touches (fluidité)

```sh
node scripts/mesure-touches.mjs
```

Joue une nouvelle partie dans Chromium (Playwright, écran tactile de 390 × 844 px), comme un
joueur qui connaît le chemin, en touchant les éléments visibles : depuis « Partir pour la
ferme » jusqu'à 6 parcelles de carottes plantées et arrosées. Affiche chaque touche et leur
nombre (un glissement de la houe compte pour une ; attendre que la pompe remplisse le
réservoir ne compte pas). Pas dans `npm test`. Version 1.16 : 22 touches (52 en 1.14).

### Mode test

⚙️ Options › **Activer le panneau de mode test** (désactivé par défaut) : ajouter
des pièces, des appareils, des graines, construire les bâtiments, passer des
nuits, aller à un chapitre, et voir l'état complet de la partie.

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
| [`docs/conception-v2.md`](docs/conception-v2.md) | refonte v2 (niveaux d'XP, énergie du personnage, houe…) : saisons retirées et un seul panneau et une seule batterie (version 1.6), niveaux d'expérience (version 1.7) ; le reste n'est pas encore codé |
| [`docs/carte-generee.md`](docs/carte-generee.md) | la ferme générée : ramassage, Atelier, construction bloc par bloc, étage, bâtiments, mine, anciennes parties |
| [`docs/architecture-phaser.md`](docs/architecture-phaser.md) | les cartes Phaser : découpage, cartes Tiled, pièges à éviter |
| [`docs/personnage.md`](docs/personnage.md) | le personnage et ses gestes sur la carte |
| [`docs/grand-monde.md`](docs/grand-monde.md) | le grand monde : une seule carte de biomes, ses neuf étapes (terminées) et ce qui a suivi |
| [`docs/fiches/`](docs/fiches/README.md) | les fiches de tâches du grand monde et d'après (une fiche, une PR) |
| [`docs/recit/`](docs/recit/README.md) | le récit de Céron : la bible, les personnages, l'aventure, les dialogues et le plan (moteur : `js/engine/recit.js`, textes : `data/recit.json`) |
| [`docs/vie-ambiance.md`](docs/vie-ambiance.md) | la vie d'ambiance de la carte (vent, nuages, animaux, habitants) |
| [`docs/icones.md`](docs/icones.md) | les icônes en pixel art, la police et les jauges |
| [`docs/son.md`](docs/son.md) | le son : musique, ambiances, bruits, où chacun est joué, réglages, comment en ajouter |
| [`docs/test-utilisateur.md`](docs/test-utilisateur.md) | le protocole d'un test sans aide, avec des bêta-testeuses |
| [`docs/taches-fluidite.json`](docs/taches-fluidite.json) | les tâches de fluidité (audit d'ergonomie de la version 1.14), lues par `scripts/mesure-touches.mjs` |
| [`docs/arbre_technologique.md`](docs/arbre_technologique.md) | proposition d'arbre des technologies v2, historique (`docs/techtree_v2.js`) ; la source de vérité est `data/techtree.json` |
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
    `node scripts/collect-server.mjs` écrit les sessions dans `./sessions/` (essais).
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

- Graphismes, icônes et illustrations : originaux (dessinés par les générateurs de `scripts/`)
- Musique et sons : originaux (synthétisés par les générateurs de `scripts/son/`), sauf les bêtes de
  la ferme, l'arrosoir, la hulotte, la grenouille, le coq, le chat, le chien et le galop : de vrais
  enregistrements libres de droits, auteurs et licences dans
  [`assets/son/CREDITS.md`](assets/son/CREDITS.md)
- Moteur d'affichage : Phaser 4 (licence MIT)
