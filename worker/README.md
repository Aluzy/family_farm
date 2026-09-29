# Worker de collecte (Cloudflare)

Reçoit le JSON d'une session de jeu (`POST /session`) et l'écrit dans le bucket R2
`ferme-familiale-sessions` sous `sessions/<sid>.json`. N'accepte que l'origine
`https://aluzy.github.io`. Ce dossier n'est pas servi par GitHub Pages au jeu :
il est déployé par Cloudflare (Workers Builds, dossier racine `/` (réglage par défaut),
commande de déploiement `npx wrangler deploy`).
