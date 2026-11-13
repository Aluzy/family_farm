# La page d'accueil de l'île à bâtir (textes préparés, fiche I7d)

Les textes de `index.html` pour le jeu de l'île à bâtir, prêts pour la bascule : **la fiche I9h les met en place**
(le site publié ne change pas avant). Chaque section reprend celle de la page d'aujourd'hui (son `id`, sa forme,
ses icônes) ; seul le texte change. Aucun ne cite un nom du récit (Maurice, Philomène, Adèle, Odile, Achille, Frida,
Basile, Théo, Garance, Lise, Fernand, Céron, Cadolon, le Gué, Bois-Joli, les Genêts, les Mouettes, Brumeval), ni la
calèche, son cocher ou les hameaux (`VILLAGE.SANS_RECIT`, `data/village.json`). `js/ui/accueil-vivant.js` (la scène
animée de l'en-tête) n'a pas de texte du récit : rien à y changer.

## L'en-tête (`<header>`, la section du titre)

- **Titre (h1)** : Une île vierge, une grande lune, *et tout un village à bâtir.*
- **Chapeau (`.lead`)** : Tu débarques sur une île avec un abri et un port au bout du chemin. Cultive, bâtis,
  vends au port, accueille des villageois et fais de ton île un village où il fait bon vivre.
- **Boutons** : 🌙 Jouer gratuitement · 📖 Découvrir l'île
- **Micro** : Sans installation · Dans ton navigateur, sur ordinateur ou téléphone · À ton rythme

## `#ile` — l'île

- **Surtitre (kicker)** : L'île à bâtir
- **Titre** : Ici, tout est à bâtir.
- **Texte** : Pas d'urgence, pas de perte, pas de reproche. Une terre à faire fleurir, un port pour vendre ce
  qu'elle donne, et des villageois qui viennent s'y installer.
- **Les six cartes** :
  1. 🌷 **Fais fleurir ta terre** — Potager, verger, serre et fleurs : on sème quand la lune monte, on récolte à la
     pleine lune.
  2. 🏡 **Construis ton nid** — Bâtis ta maison bloc par bloc, peins-la, meuble-la ; puis les maisons de ceux qui
     viendront.
  3. ⚓ **Vends au port** — Porte tes récoltes au comptoir, honore les commandes du bac, fais venir graines, bêtes et
     plans d'ailleurs, et agrandis ton port.
  4. 🧑‍🌾 **Accueille des villageois** — Ils débarquent du bac, s'installent, travaillent à la tâche que tu leur
     donnes et se lient d'amitié, entre eux et avec toi.
  5. 🎉 **Fais vivre ton village** — Des fêtes sur la place, des veillées de pleine lune, des projets bâtis tous
     ensemble, et des commerces d'artisans.
  6. 💌 **Joue avec tes proches** — Ouvre ta ferme en ligne à ta famille ou à tes amis : chacun son rôle, une ferme
     en commun.

## `#lune` — le calendrier de lune

- **Surtitre** : Le calendrier de lune
- **Titre** : L'île vit au rythme de la lune.
- **Texte** : Douze mois de quatorze jours, et chaque phase a sa coutume, toujours douce.
- **Les quatre phases** :
  - 🌒 **Lune croissante** — On sème : « ce qui monte avec la lune pousse avec elle ».
  - 🌕 **Pleine lune** — La grande récolte, et la veillée du village sur la place.
  - 🌘 **Lune décroissante** — On économise l'eau, on bricole.
  - 🌑 **Nuits noires** — La terre fait la sieste ; on se raconte la journée.

## `#habitants` — les villageois (la section des personnages devient celle des villageois)

- **Surtitre** : Les villageois
- **Titre** : Des voisins qui deviennent des amis.
- **Texte** : Chacun arrive avec ses goûts et ses traits : matinal ou couche-tard, bavard ou réservé, gourmand,
  rêveur, taquin… À toi de leur trouver la tâche qui leur va.
- **Les quatre cartes** (des traits, pas des personnages ; la phrase sort de `VILLAGE.PROPOS` ou des répliques des
  villageois, sans prénom) :
  - 🌅 **Le matinal** — Debout avant le soleil — « Le bac est passé ? J'ai tout vu, j'étais déjà dehors. »
  - 💬 **La bavarde** — Elle connaît tout le monde — « Tu savais qu'ils sont devenus inséparables, ces deux-là ? »
  - 💪 **Le travailleur** — Aux champs avant l'heure — « Encore un rang et j'ai fini. Enfin… encore deux. »
  - ☁️ **La rêveuse** — Les yeux dans les nuages — « Tu as vu la lune, hier soir ? On aurait dit une lanterne. »

## La section du courrier (`.courrier`) devient celle de la chronique

- **Surtitre** : La chronique
- **Titre** : L'histoire, c'est toi qui l'écris.
- **Texte** : Nomme ton île et ton village ; la chronique note d'elle-même les jours qui comptent : la première
  récolte, chaque villageois qui débarque, les fêtes, le port agrandi.
- **La carte (`.postale`)**, avec le timbre 📜 :
  « Jour 33 — Le village a un nom : Clair-la-Lune. »
  *— La chronique de l'île*

## La dernière section (`.cta`)

- **Titre** : Ton île t'attend sous la lune.
- **Texte** : Commence aujourd'hui, à ton rythme. Ton île garde tout, même quand tu n'es pas là.
- **Boutons** : 🌙 Commencer ma partie · 📖 Consulter l'encyclopédie

## La description de la page (`<meta name="description">`, Open Graph)

Moon Bloom Village : une île vierge à bâtir sous la lune. Cultive, construis, vends au port, accueille des
villageois et fais grandir ton village. Gratuit, dans ton navigateur.
