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
| [5a — les sols des biomes, leurs bords et l'eau](5a-sols-des-biomes.md) | 5 | à faire |
