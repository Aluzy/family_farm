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
| [16 — la famille reste visible et ne traverse pas les murs](16-famille-visible.md) | — | à faire |
| [17 — la cruche (jauge, aller au puits) et choisir son lit](17-cruche-et-lit.md) | — | à faire (après 16) |
| [18 — choisir ses enfants au démarrage et la visite de bienvenue](18-demarrage-et-accueil.md) | — | à faire (après 16) |
| [19 — le compagnon aide à la ferme](19-le-compagnon-aide.md) | — | à faire (après 16 et 17) |
| [20 — la marche des personnages](20-la-marche.md) | — | à faire (après 16 à 19) |
| [21 — toucher le champ n'ouvre plus de fenêtre](21-champ-sans-fenetre.md) | — | fait |
| [14b — le brouillard couvre aussi la ferme](14b-brouillard-sur-la-ferme.md) | — | fait |
