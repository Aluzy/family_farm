# Les fiches de tâches du grand monde

Chaque tâche du projet du grand monde (`docs/grand-monde.md`) a sa fiche, confiée à un agent
indépendant, et donne une PR. Une fiche dit :

- **Objectif** : ce que la PR apporte, en une phrase ;
- **Contexte** : où en est le projet, ce qui est déjà fait, les fichiers à lire d'abord ;
- **À faire** : le travail, point par point ;
- **Hors périmètre** : ce qu'il ne faut pas toucher (une autre fiche s'en chargera) ;
- **Critères d'acceptation** : ce qui doit être vrai quand c'est fini ;
- **Vérifications** : les commandes et les essais dans Chromium ;
- **Livraison** : le commit (la PR est ouverte ensuite).

Conventions communes à toutes les fiches :

- tout est écrit en français, dans le style du dépôt (commentaires denses, en phrases) ;
- `npm run build` puis `npm test` doivent finir par « Tout est vert » ; `node tests/smoke.mjs`
  sans erreur ; `node tests/run-tests.mjs <nom>` lance un seul fichier de tests du moteur ;
- vérifier dans Chromium (Playwright est installé : `require('playwright')`, `chromium.launch()`
  sans option ; servir `_site` avec `python3 -m http.server <port> --directory _site` après
  `npm run build`) ; les scripts et captures d'essai vont dans le dossier de travail de l'agent,
  pas dans le dépôt ;
- une sauvegarde qui change de forme : `STATE_VERSION` (`js/engine/base.js`) et une migration
  dans `MIGRATIONS` (`js/engine/state.js`), avec un test ;
- avant le commit : supprimer les `apercu*.png` à la racine, remettre `assets/art.png` s'il a
  changé (`git checkout assets/art.png`) ; ne rien laisser hors du commit ;
- mettre à jour `docs/grand-monde.md` (l'étape : fait / à faire) et la doc touchée ;
- un commit sur la branche de travail, message en français, terminé par les lignes d'attribution
  que la session donne à l'agent ; pas de push, pas de PR (elle est ouverte après relecture) ;
  aucun nom de modèle dans les fichiers du dépôt.

| Fiche | Étape | État |
|---|---|---|
| [3b — nuit et trajets bornés](3b-nuit-et-trajets.md) | 3 | fait |
| [4a — le générateur du monde (les données)](4a-generateur-du-monde.md) | 4 | fait |
| [4b — le monde dessiné et marchable](4b-monde-dessine.md) | 4 | fait |
| [5a — les sols des biomes, leurs bords et l'eau](5a-sols-des-biomes.md) | 5 | fait |
| [5b — la végétation des biomes](5b-vegetation.md) | 5 | fait |
| [5c — les rochers, les falaises et la côte](5c-roches-et-cote.md) | 5 | fait |
| [6a — couper, casser, cueillir et ramasser dans le monde](6a-ramasser-dans-le-monde.md) | 6 | fait |
| [6b — les grottes de la montagne, la pêche dans le monde et les animaux](6b-grottes-peche-animaux.md) | 6 | fait |
| [7a — les hameaux bâtis](7a-hameaux.md) | 7 | fait |
| [7b — les habitants des hameaux](7b-habitants.md) | 7 | fait |
| [7c — la calèche](7c-caleche.md) | 7 | fait |
| [8 — s'orienter : le brouillard, la carte du monde et la boussole](8-s-orienter.md) | 8 | fait |
| [9a — les anciennes parties et les performances](9a-anciennes-parties-et-performances.md) | 9 | fait |
| [9b — l'aide, l'encyclopédie, le didacticiel et la campagne](9b-aide-encyclopedie-didacticiel.md) | 9 | fait |
| [10 — les notifications qui se cumulent](10-notifications-cumulees.md) | — | fait |
| [11 — l'équipement de la famille et le sac à provisions](11-equipement-de-la-famille.md) | — | fait |
| [12 — le cheval retouché et la calèche avec un vrai cocher](12-cheval-retouche-et-caleche.md) | — | fait |
| [13 — trois sons : la cruche, le hibou, plus de bruit d'eau](13-sons.md) | — | fait |
| [14 — petites corrections : brouillard, mine, canards, encyclopédie](14-petites-corrections.md) | — | fait |
| [15 — le décor : bords des chemins et candélabres](15-decor.md) | — | fait |
| [16 — la famille reste visible et ne traverse pas les murs](16-famille-visible.md) | — | fait |
| [17 — la cruche (jauge, aller au puits) et choisir son lit](17-cruche-et-lit.md) | — | fait |
| [18 — choisir ses enfants au démarrage et la visite de bienvenue](18-demarrage-et-accueil.md) | — | fait |
| [19 — le compagnon aide à la ferme](19-le-compagnon-aide.md) | — | fait |
| [20 — la marche des personnages](20-la-marche.md) | — | fait |
| [21 — toucher le champ n'ouvre plus de fenêtre](21-champ-sans-fenetre.md) | — | fait |
| [22 — le chevreuil et le bouquetin redessinés](22-chevreuil-bouquetin.md) | — | fait |
| [23 — un vrai chat et un vrai chien](23-chat-et-chien.md) | — | fait |
| [24 — l'eau vivante refondue](24-eau-refonte.md) | — | étapes 1 à 4 faites ; 5 et 6 à faire |
| [14b — le brouillard couvre aussi la ferme](14b-brouillard-sur-la-ferme.md) | — | fait |
| [16b — la soirée de la famille : dehors jusqu'au coucher, manger quand on a faim](16b-soiree-de-la-famille.md) | — | fait |

## Le chantier « Phaser 4 » (fiches 25 à 34)

D'après le rapport *Ferme Familiale — améliorations possibles avec Phaser 4* (2026-11-09) : quatre leviers
(les objets GPU, le fil principal, les boucles et les cadences, un socle commun pour les comportements et
la collision). Toutes les API citées existent dans la version embarquée (`vendor/phaser.min.js`, 4.2.1) ;
chaque fiche mesure son gain avec 🧪 **Mesurer 30 s** et `docs/perf.md`. Ordre conseillé : 25, 27 et 26
(sans risque), 28 puis 29 (le chargement), 30 puis 31 puis 32 (la vie sur la carte), 33, et l'essai 34
après 26 et 28. Les pistes de `docs/chantier-allegement.md` restent valables à côté.

| Fiche | Dépend de | Risque | État |
|---|---|---|---|
| [25 — la cadence de la carte : 60 images par seconde au plus, une seule boucle](25-cadence-de-la-carte.md) | — | faible | fait (`low-power` à mesurer sur le téléphone) |
| [26 — la scène rangée en Layers : sol, monde trié, ciel, voiles](26-layers-de-la-scene.md) | — | faible | à faire |
| [27 — la pluie en particules, les shaders prêts, moins d'allocations](27-pluie-shaders-allocations.md) | — | faible | à faire |
| [28 — les calculs hors du fil principal : rives, encyclopédie, rattrapage](28-calculs-hors-du-fil.md) | — | moyen | à faire |
| [29 — le sol peint dans un Worker et la teinte de l'herbe](29-sol-peint-dans-un-worker.md) | 28 | moyen | à faire |
| [30 — le corps du personnage : collision, coins, accélération](30-corps-du-personnage.md) | — | moyen | à faire |
| [31 — le socle des comportements : états, perception, séparation](31-socle-des-comportements.md) | 30 | moyen | à faire |
| [32 — une vie plus crédible : faune, bêtes de la ferme, habitants](32-vie-plus-credible.md) | 31 | moyen | à faire |
| [33 — l'ordonnanceur de la scène, les événements, le hasard à graine](33-ordonnanceur-de-la-scene.md) | 25 | faible | à faire |
| [34 — l'essai des objets GPU (TilemapGPULayer, SpriteGPULayer)](34-essai-objets-gpu.md) | 26, 28 | élevé | à faire |
