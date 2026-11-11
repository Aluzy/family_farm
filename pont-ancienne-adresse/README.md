# La page pont : retrouver une partie jouée à l'ancienne adresse du jeu

Le jeu était publié à `https://aluzy.github.io/family_farm/` ; il l'est désormais à `https://moonbloom-village.com`.
Le navigateur range ce qu'un site enregistre (`localStorage`) **par adresse** : la partie jouée à l'ancienne adresse est
toujours dans le navigateur, sous `https://aluzy.github.io`, mais le jeu ne peut pas la lire depuis le nouveau domaine,
et l'ancienne adresse du jeu renvoie tout de suite vers la nouvelle (GitHub Pages, le domaine personnalisé).

`index.html` est une page autonome à publier **à la racine de `https://aluzy.github.io/`** (le dépôt
`Aluzy/aluzy.github.io`, GitHub Pages activé, sans domaine personnalisé) : à la même adresse que l'ancien jeu pour le
navigateur, elle lit la partie et la porte au jeu.

- Le jeu (`js/ui/transfert.js`, l'écran d'accueil : « 🔎 Retrouver ma partie d'avant ») ouvre
  `https://aluzy.github.io/?retour=<l'adresse du jeu>` ; la page revient aussitôt au jeu avec la partie dans la fin de
  l'adresse (`#transfert=…`, jamais envoyée à un serveur) ; le jeu la reprend, ou demande laquelle garder si une partie
  est déjà commencée sur le nouveau domaine (l'autre reste sur l'appareil, `ferme-save-avant-transfert`).
- Ouverte directement, la page dit ce qu'elle a trouvé et propose de l'emporter, ou de la télécharger (un fichier
  que « Charger une partie » du jeu sait ouvrir).
- Elle ne renvoie que vers `moonbloom-village.com` (et `localhost` quand elle est elle-même ouverte en local, pour les
  essais).

## La publier

1. Créer le dépôt public `Aluzy/aluzy.github.io`.
2. Y copier `index.html` (à la racine).
3. Settings › Pages : Deploy from a branch, `main`, `/ (root)`. La page est à `https://aluzy.github.io/` en une minute.

Chaque joueuse doit passer par le bouton **dans le navigateur et sur l'appareil où elle jouait** (une partie n'est
enregistrée que là). Safari (iPhone, iPad, Mac) peut effacer ce qu'un site a enregistré quand on ne l'a pas ouvert
depuis 7 jours : le plus tôt est le mieux.
