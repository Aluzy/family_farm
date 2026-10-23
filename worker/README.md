# Worker de collecte et de rapport (Cloudflare)

## Ce qu'il fait

- `POST /session` : reçoit le JSON d'une session de jeu et l'écrit dans le bucket R2
  `ferme-familiale-sessions` sous `sessions/<sid>.json`. N'accepte que l'origine
  `https://aluzy.github.io`. Les commentaires des joueurs (`feedback`) sont nettoyés
  (3 au plus, 1 000 signes chacun). Une session de la version 2 porte aussi un numéro de
  joueur aléatoire (le même d'une visite à l'autre) : sa fiche `players/<id>.json`, la
  progression du joueur (une ligne par nuit et par niveau atteint, avec le temps de jeu
  cumulé, les jours où il a joué), est mise à jour à chaque envoi. Son résumé (premier et
  dernier jour joué, retour à J+1 et J+7, niveau, étape du didacticiel, temps de jeu) est
  gardé dans les métadonnées du fichier : la rétention et l'abandon se calculent sur tous
  les joueurs sans relire chaque fiche.
- **Rapport quotidien à 13 h (heure de Paris)** : lit les sessions démarrées dans les
  dernières 24 h et publie le rapport comme **issue d'un dépôt GitHub privé**
  avec :
  - les **sessions** (temps moyen et médian, sessions très courtes) ;
  - les **joueurs** : actifs et nouveaux, taille de la famille, part du repas du soir
    couverte, étape du didacticiel ;
  - les **jours de jeu** : temps réel moyen par jour de jeu, gestes et énergie par jour ;
  - les **gestes du personnage** par type (couper, piocher, arroser…) : nombre, par jour de
    jeu, énergie dépensée et énergie par geste ; les automatisations à part ;
  - les **ressources ramassées**, les **objets fabriqués** à l'Atelier et les **blocs posés**,
    en total et par jour de jeu ;
  - les **niveaux** : temps de jeu et jour de jeu médians pour atteindre chacun, et temps
    depuis le niveau précédent ;
  - la **progression par joueur** : un tableau (temps de jeu, jour, niveau, chapitre,
    famille) et un graphique du niveau selon le temps de jeu (Mermaid, affiché par GitHub) ;
  - la **rétention** : par jour de première visite, les joueurs revenus le lendemain (J+1)
    et 7 jours après ou plus (J+7) ;
  - l'**abandon** : les joueurs arrivés depuis 60 jours au plus et sans visite depuis 3 jours,
    leur temps de jeu, leur niveau, leur chapitre et leur étape du didacticiel ;
  - l'**économie** : pièces gagnées et dépensées par poste et par jour de jeu, et pièces
    du soir (médiane, min, max) pour chacun des 20 premiers jours de jeu ;
  - le temps par chapitre, le top 10 des boutons, les erreurs techniques et les
    commentaires.
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

- Le rapport lit au plus 700 fichiers de session et 200 fiches de joueur par jour (limite
  de sous-requêtes de Cloudflare) ; au-delà, il l'indique dans la section « À savoir ».
- Les jours de jeu sont comptés par joueur : un jour commencé avant la période, ou joué
  sur deux appareils (deux numéros de joueur), n'est vu qu'en partie.
- Effacer les données d'un joueur (demande d'effacement) : supprimer `players/<id>.json`
  et les fichiers `sessions/` dont `player.id` vaut ce numéro (ou le numéro de session
  donné par le joueur).
- Le temps par chapitre est une approximation : le jeu note le chapitre à chaque
  nuit, et le temps « onglet visible » est réparti au prorata du temps écoulé.
- Les données de suivi sont conservées 12 mois d'après `cookies.html` : prévoir une
  règle de cycle de vie sur le bucket R2 (Settings › Object lifecycle rules).
- Le jeton GitHub expire (voir l'étape 2).

## Tests

`node tests/test-report.mjs` (depuis la racine du dépôt) : calculs, passage été/hiver, publication
GitHub simulée (dépôt public refusé, jeton jamais journalisé), protections de la collecte.
