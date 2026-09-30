# Worker de collecte et de rapport (Cloudflare)

## Ce qu'il fait

- `POST /session` : reçoit le JSON d'une session de jeu et l'écrit dans le bucket R2
  `ferme-familiale-sessions` sous `sessions/<sid>.json`. N'accepte que l'origine
  `https://aluzy.github.io`. Les commentaires des joueurs (`feedback`) sont nettoyés
  (3 au plus, 1 000 signes chacun).
- **Rapport quotidien à 13 h (heure de Paris)** : lit les sessions démarrées dans les
  dernières 24 h et publie le rapport comme **issue d'un dépôt GitHub privé**
  (sessions, temps moyen, temps par chapitre, top 10 des actions, commentaires).
  GitHub t'écrit ensuite par e-mail via ses notifications. Deux déclencheurs UTC (11 h
  et 12 h) couvrent l'heure d'été et l'heure d'hiver ; le Worker ignore celui qui ne
  tombe pas à 13 h.
- **Garde-fou** : avant de publier, le Worker vérifie que le dépôt cible est privé et
  refuse dans le cas contraire, car le rapport contient les commentaires des joueurs.
- `GET /report?token=…` (facultatif) : affiche le rapport en Markdown sans attendre
  13 h ; ajouter `&publish=1` pour créer aussi l'issue (pour tester). Cette route n'existe
  que si le secret `REPORT_TOKEN` est défini.

Le dépôt du **jeu** doit rester public : GitHub Pages ne fonctionne pas sur un dépôt
privé avec un compte gratuit, et le site serait dépublié.

Ce dossier n'est pas servi par GitHub Pages au jeu : il est déployé par Cloudflare
(Workers Builds, dossier racine `/` (réglage par défaut), commande de déploiement
`npx wrangler deploy`). Les déclencheurs sont déclarés dans `wrangler.toml` et
installés par ce même déploiement.

## Mise en route du rapport (une seule fois)

1. **Créer un dépôt privé** pour les rapports, par exemple `family_farm_rapports`
   (GitHub › New repository › Private). Les issues y sont activées par défaut.
2. **Créer un jeton GitHub limité à ce dépôt** : Settings › Developer settings ›
   Personal access tokens › Fine-grained tokens › Generate new token.
   - Repository access : *Only select repositories*, puis le dépôt de rapports ;
   - Permissions › Repository › **Issues : Read and write** (Metadata : Read est ajouté
     automatiquement) ;
   - Expiration : ces jetons expirent. **Note la date** : après elle, les rapports
     s'arrêtent (erreur 401 visible dans Observability) et il faut en créer un nouveau.
3. Dans Cloudflare : Workers › `family-farm` › Settings › Variables and Secrets, ajouter
   en **secrets** :
   - `REPORT_GITHUB_TOKEN` : le jeton de l'étape 2 ;
   - `REPORT_GITHUB_REPO` : `ton-compte/family_farm_rapports` ;
   - `REPORT_TOKEN` (facultatif) : une longue chaîne aléatoire, pour tester.
4. Déployer (fusionner la pull request : Workers Builds redéploie).
5. Tester sans attendre : ouvrir
   `https://family-farm.contact-voidr.workers.dev/report?token=VOTRE_JETON&publish=1`.
   La page affiche le rapport et l'adresse de l'issue créée (ou la raison de l'échec).
6. **Recevoir l'e-mail** : sur GitHub, Settings › Notifications, vérifier que les
   notifications par e-mail sont actives, et surveiller le dépôt de rapports
   (Watch › All activity). L'issue est créée à ton nom : si aucun e-mail n'arrive,
   cocher « Include your own updates » dans la partie e-mail des mêmes réglages.
   Ce point n'a pas pu être vérifié à l'avance.
7. Le lendemain à 13 h, vérifier dans Workers › `family-farm` › Observability le
   message « rapport publié » (ou « rapport en échec »).

## Limites connues

- Le rapport lit au plus 800 fichiers de session par jour (limite de sous-requêtes
  de Cloudflare) ; au-delà, il l'indique dans la section « À savoir ».
- Le temps par chapitre est une approximation : le jeu note le chapitre à chaque
  nuit, et le temps « onglet visible » est réparti au prorata du temps écoulé.
- Les données de suivi sont conservées 12 mois d'après `cookies.html` : prévoir une
  règle de cycle de vie sur le bucket R2 (Settings › Object lifecycle rules).
- Le jeton GitHub expire (voir l'étape 2).

## Tests

`node test-report.mjs` (à la racine du dépôt) : calculs, passage été/hiver, publication
GitHub simulée (dépôt public refusé, jeton jamais journalisé), protections de la collecte.
