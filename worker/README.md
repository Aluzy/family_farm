# Worker de collecte et de rapport (Cloudflare)

## Ce qu'il fait

- `POST /session` : reçoit le JSON d'une session de jeu et l'écrit dans le bucket R2
  `ferme-familiale-sessions` sous `sessions/<sid>.json`. N'accepte que l'origine
  `https://aluzy.github.io`. Les commentaires des joueurs (`feedback`) sont nettoyés
  (3 au plus, 1 000 signes chacun).
- **Rapport quotidien à 13 h (heure de Paris)** : lit les sessions démarrées dans les
  dernières 24 h et envoie un e-mail (sessions, temps moyen, temps par chapitre, top 10
  des actions, commentaires). Deux déclencheurs UTC (11 h et 12 h) couvrent l'heure
  d'été et l'heure d'hiver ; le Worker ignore celui qui ne tombe pas à 13 h.
- `GET /report?token=…` (facultatif) : affiche le rapport sans attendre 13 h ;
  ajouter `&send=1` pour l'envoyer aussi par e-mail. Cette route n'existe que si le
  secret `REPORT_TOKEN` est défini.

Ce dossier n'est pas servi par GitHub Pages au jeu : il est déployé par Cloudflare
(Workers Builds, dossier racine `/` (réglage par défaut), commande de déploiement
`npx wrangler deploy`). Les déclencheurs sont déclarés dans `wrangler.toml` et
installés par ce même déploiement.

## Mise en route du rapport (une seule fois)

1. Créer un compte sur [resend.com](https://resend.com) et une clé d'API.
   Sans domaine à vous, l'expéditeur de test `onboarding@resend.dev` (utilisé par défaut)
   ne permet en principe d'écrire qu'à l'adresse du compte Resend : à vérifier dans
   la documentation Resend. Avec un domaine vérifié, définir `REPORT_FROM`.
2. Dans Cloudflare : Workers › `family-farm` › Settings › Variables and Secrets, ajouter
   en **secrets** :
   - `RESEND_API_KEY` : la clé d'API ;
   - `REPORT_TO` : l'adresse qui reçoit le rapport ;
   - `REPORT_TOKEN` (facultatif) : une longue chaîne aléatoire, pour tester ;
   - `REPORT_FROM` (facultatif) : par exemple `Ferme Familiale <rapport@votre-domaine>`.
3. Déployer (fusionner la pull request : Workers Builds redéploie).
4. Tester sans attendre : ouvrir
   `https://family-farm.contact-voidr.workers.dev/report?token=VOTRE_JETON&send=1`.
   La page affiche le rapport et dit si l'e-mail est parti.
5. Vérifier ensuite le lendemain à 13 h, dans Workers › `family-farm` › Observability
   (message « rapport envoyé » ou « rapport en échec »).

## Limites connues

- Le rapport lit au plus 800 fichiers de session par jour (limite de sous-requêtes
  de Cloudflare) ; au-delà, il l'indique dans la section « À savoir ».
- Le temps par chapitre est une approximation : le jeu note le chapitre à chaque
  nuit, et le temps « onglet visible » est réparti au prorata du temps écoulé.
- Les données de suivi sont conservées 12 mois d'après `cookies.html` : prévoir une
  règle de cycle de vie sur le bucket R2 (Settings › Object lifecycle rules).

## Tests

`node test-report.mjs` (à la racine du dépôt) : calculs, passage été/hiver, envoi
simulé, protections de la collecte.
