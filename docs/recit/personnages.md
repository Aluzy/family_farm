# Les personnages de Céron

Douze personnages écrits : un visage par groupe de la société de l'île, plus la famille, Adèle, le
cocher et Maurice en creux. Les autres habitants restent générés (`js/engine/habitants.js`). Les
identifiants sont ceux de `data/recit.json` (`RECIT.PERSONNAGES`).

Chaque personnage existe même quand le joueur n'est pas là ; aucun ne sert seulement à donner une
information.

## La famille du joueur

- **Le personnage principal** : enfant d'Adèle, petit-enfant de Maurice, environ 30 ans, grandi à
  Cadolon. Sexe, prénom et famille sont choisis par le joueur. Il est « de la famille » pour l'île
  et pourtant étranger à ses usages. Il garde quelques souvenirs d'enfance de Céron et ignore
  presque tout de Maurice. Son arc : de « petit de Maurice » à quelqu'un d'ici.
- **Le compagnon** (`compagnon`) : le second adulte, obligatoire. Il garde la ferme quand le joueur
  explore (fiche 19 : il arrose, cuisine, ramasse). Il parle sobrement de ce qu'il a fait.
- **Les enfants** : chacun penche, au fil du jeu, vers « rester » ou « Cadolon » selon ce qu'il vit
  sur l'île. C'est un sentiment exprimé, sans conséquence de jeu. Lise les attire vers « rester ».

## Adèle, la mère (`adele`)

- 55 ans, née à Cadolon, élevée à Céron après la mort de sa mère, partie adolescente en internat,
  installée à Cadolon. Elle a élevé seule le joueur. Elle ne vient pas sur l'île pendant la
  partie : c'est une voix par lettres. Elle remplace le cousin Mateo (les graines exotiques, au
  retour d'un voyage).
- Valeurs : liberté, lien, humour pour tenir debout. Besoins : savoir son enfant heureux, garder un
  pied sur Céron sans y revenir vivre.
- Chaleureuse, pratique, drôle ; un peu envahissante par lettres, nostalgique malgré elle.
- Sait : les routes de la tournée, les noms des anciens, les habitudes de son père. Ignore : la
  pierre, ce qui liait Maurice à Johnny. Voit Frida, qui s'est occupée d'elle toute petite, comme
  une deuxième maman un peu distante.
- Arc : ses lettres passent de l'inquiétude à la fierté et livrent sans le vouloir des indices sur
  les lieux de Maurice.

## Maurice, en creux (`maurice`)

- Né à Céron, parti enfant, revenu veuf avec Adèle, cocher de l'île pendant 35 ans, mort il y a un
  an. Il passait peu de temps chez lui : il travaillait, pêchait, observait l'île.
- Valeurs : rendre ce qu'il gagnait, ne pas faire de bruit. Aimé de tous, presque jamais chez lui ;
  généreux, mais secret.
- Ses traces : des **carnets de tournée** (ce que chaque hameau avait en trop ou en manque, les
  réparations faites ou promises, des notes brèves sur ses visites à « J. »), dispersés dans sa
  maison du Gué, à l'écurie d'Achille, chez Frida.

## Frida, la scientifique (`frida`)

- Environ 77 ans. Venue il y a une cinquantaine d'années en expédition d'observation de la faune
  et de la flore, restée. S'est occupée d'Adèle toute petite ; a eu plus tard une relation avec
  Maurice. Fabrique le robot, sa station et les automatisations.
- Valeurs : la connaissance, l'île, l'idée que la technique peut protéger au lieu d'abîmer.
- Besoins : que les hameaux, qui l'ont adoptée depuis longtemps, acceptent aussi ses machines ;
  transmettre ce qu'elle sait.
- Brillante, enthousiaste, directe ; impatiente, peu sensible aux usages. Elle aime l'île pour ce
  qu'elle est, et ses inventions peuvent la changer.
- Sait que Maurice voyait souvent Johnny ; a des données sur la lune et les récoltes qu'elle ne
  s'explique pas. Ignore l'existence de la pierre.
- Arc : alliée, rivale des traditions, ou celle qui réconcilie l'île et la technique, selon ce que
  le joueur lui commande.

## Johnny, l'ermite (`johnny`)

- Environ 75 ans. Explorateur scientifique arrivé en bateau il y a environ 35 ans, déjà amnésique ;
  vit sans électricité dans une cabane de la forêt. A caché une pierre de lune et l'a oubliée. Sa
  spécialité n'a pas d'importance : il est là, sans vraiment de souvenirs.
- Valeurs : l'émerveillement, le présent. Besoins : un peu de compagnie, des repas (depuis la mort
  de Maurice, plus personne ne vient).
- Doux, curieux, drôle sans le vouloir ; il répète, oublie, se contredit. Des savoirs lui
  remontent sans qu'il sache d'où (la lune, la roche, les marées).
- Arc : le joueur peut reprendre les visites de Maurice. Johnny ne retrouve pas la mémoire mais
  retrouve un lien, et lâche ses indices sans s'en rendre compte. Son amnésie se traite avec
  tendresse, jamais comme un gag.

## Achille, le cocher (`achille`)

- 55 ans, né aux Mouettes, formé par Maurice, cocher depuis 17 ans ; vit au Gué, à l'écurie.
- Valeurs : la parole donnée, la régularité. Besoins : un successeur ; ne plus être « celui d'après
  Maurice ».
- Fiable, bourru, fin connaisseur de chacun ; fatigué, un peu jaloux de la légende de son maître.
- Sait toutes les routes et les rumeurs, garde deux carnets de Maurice. Croit que Johnny est « un
  vieux fou que Maurice aimait bien ».
- Arc : il apprend à faire confiance au joueur et peut trouver un successeur (Théo ?).

## Les habitants écrits

### Odile, l'ancienne restée, Le Gué (`odile`)

82 ans, n'a jamais quitté l'île ; voisine de Maurice, elle a vu grandir Adèle. Tient à la
tradition, à la constance, à la lune ; veut voir la maison de Maurice rouverte. Réfractaire à tout
changement, elle adorait pourtant Maurice, revenu de Cadolon. Elle vouvoie le joueur jusqu'à sa
première pleine lune sur l'île. Arc : du jugement à la transmission (un savoir, la cloche de la
calèche de Maurice).

### Fernand, l'ancien revenu, Les Mouettes (`fernand`)

70 ans, mécanicien du port de Cadolon pendant 40 ans, revenu à la retraite. Veut pêcher en paix.
Il connaît les machines mieux que personne et refuse d'y toucher, mais répare en cachette la
vieille pompe des Mouettes. A examiné l'épave à son retour : ce bateau ne sort d'aucun chantier
qu'il connaisse. Arc : complice naturel du joueur (deux revenus de Cadolon), pont possible entre
Frida et les anciens.

### Garance, l'adulte restée, Les Genêts (`garance`)

45 ans, tisserande et bergère, deux enfants dont Lise. Tient à l'autonomie de l'île et au fait
main ; droite, généreuse, prompte à juger. Elle voit la technologie comme une dérive, mais son
métier à tisser est une machine. Maurice lui avait promis un toit avant les pluies. Arc : accepter
un changement qui sauve son métier, ou préserver sa façon de faire avec l'aide du joueur.

### Basile, le scieur et ébéniste, Bois-Joli (`basile`)

50 ans, tient la scierie et l'atelier d'ébéniste ; c'est chez lui que l'on achète les meubles.
Tient au bois juste (on replante ce qu'on coupe). Veut que son fils reprenne l'atelier, et lui
interdit tout ce qui l'intéresse. Arc : laisser Théo choisir.

### Théo, l'enfant qui veut partir, Bois-Joli (`theo`)

15 ans, fils de Basile. Rêve de Cadolon, mais c'est le meilleur de l'île pour réparer une calèche.
Passe ses journées chez Frida en cachette. Arc : partir, reprendre l'atelier en le modernisant, ou
devenir le prochain cocher, selon ce que l'île lui offre.

### Lise, l'enfant qui veut rester, Les Genêts (`lise`)

10 ans, fille de Garance. Les bêtes, les cachettes, les histoires ; curieuse, désobéissante, ne
ment jamais. Connaît chaque terrier ; a déjà vu Johnny parler à la lune. Arc : l'amie et le guide
des enfants du joueur.

## Les voix

| Personnage | Rythme | Sujet favori | Tic | Jamais | Exemple |
|---|---|---|---|---|---|
| Adèle (lettres) | Phrases courtes, tutoiement tendre | Les petites choses de l'île | Un « au fait » qui amène un souvenir | Donner des ordres, s'apitoyer | « Au fait, l'arbre tordu au-dessus du Gué, papa s'y arrêtait toujours. Je ne sais plus pourquoi. » |
| Achille | Très court, phrases sans sujet | Le cheval, la route, l'heure | Parle à son cheval | Les longues phrases, les compliments directs | « Ho. Toi, encore. Bon. Monte pas, j'suis en retard. » |
| Odile | Dictons, phrases posées | La lune, les coutumes, les familles | Commence par « On ne… » | Le vocabulaire moderne | « On ne sème pas aux nuits noires. Ta mère non plus ne m'écoutait pas. » |
| Fernand | Ironique, pince-sans-rire | Cadolon, « là-bas » | Compare tout à Cadolon | L'enthousiasme | « Là-bas, on aurait fait une réunion pour ça. Ici, on pêche. » |
| Garance | Franc, concret | Le métier, la laine | Juge d'un mot (« Bon. », « Non. ») | La politesse vide | « Ta laine est bonne. Ton robot, je veux pas le voir ici. » |
| Basile | Lent, imagé | Le bois, le temps | Parle du bois comme d'une personne | La colère | « Le chêne, faut lui laisser le temps. Comme aux gamins. » |
| Théo | Rapide, exclamatif | Machines, Cadolon | Des mots de Cadolon | Le respect des anciens dans le ton | « T'as vu son robot ? Il fait le travail de trois personnes ! » |
| Lise | Questions et secrets | Bêtes, cachettes | « Mais je dis pas. » | Mentir | « Tu sais où dort le renard ? Moi oui. Mais je dis pas. » |
| Frida | Précise, enjouée, chiffrée | Mesures, bêtes, machines | Un nombre dans la phrase | Le mysticisme | « 14 % de mieux à la pleine lune. Les anciens disent que c'est la lune. Moi je dis que c'est intéressant. » |
| Johnny | Au présent, émerveillé, par fragments | La lune, la roche, la mer | Se coupe, reprend autre chose | Le passé sur lui-même, la tristesse | « Regarde comme la lune brille aujourd'hui, c'est fascinant. On dirait qu'elle cherche… Tu as faim ? » |
| Le compagnon | Sobre, affectueux | Ce qu'il a fait à la ferme | Un détail concret | Les reproches | « Les poules ont pondu. J'ai gardé un œuf pour toi, il est sur la table. » |
| Maurice (carnets) | Notes sèches | Ce que chacun a en trop ou en manque | « J. » pour Johnny | Les sentiments écrits | « Genêts : toit de Garance, avant les pluies. J. : soupe, pain. » |

## Les relations

Elles se mesurent par personnage (points entiers, cinq paliers : inconnu, poli, cordial, proche,
intime) et par hameau pour les habitants générés (la confiance). Elles s'expriment dans les
répliques et ouvrent des choses concrètes ; jamais de jauge affichée.

### Avec le joueur

| Personnage | Départ | Ce qui la fait monter | Ce qui la fait baisser | Ce qu'elle ouvre |
|---|---|---|---|---|
| Odile | Bienveillance méfiante | Suivre les coutumes de lune, rouvrir la maison de Maurice, lui rendre visite | Automatiser, défricher beaucoup | Coutumes, souvenirs d'Adèle, un objet de Maurice |
| Fernand | Curiosité ironique | Le laisser tranquille, partager la pêche, parler de Cadolon | L'envahir, mentir | Ce qu'il a compris de l'épave, aide mécanique discrète |
| Garance | Respect conditionnel | Fournir de la laine, tenir la promesse du toit | Le robot visible, la grande ferme | Tissus, vêtements, confiance des Genêts |
| Basile | Cordialité | Acheter ses meubles, replanter ce qu'on coupe | Couper sans replanter | Meubles, planches, sa parole sur Théo |
| Théo | Admiration | L'emmener chez Frida, lui confier des machines | Le traiter en enfant | Ses réparations, son choix d'avenir |
| Lise | Curiosité | Jouer, écouter, garder ses secrets | Trahir un secret | Cachettes, terriers, ce qu'elle a vu de Johnny |
| Frida | Affection immédiate (l'enfant d'Adèle) | Lui commander des automatisations, partager ses observations | Refuser toute technique, la mépriser | Robot, automatisations, ses données sur la lune |
| Johnny | Accueil doux, sans souvenir | Repas, visites régulières, de préférence la nuit | Rien : il oublie | Ses bribes et ses indices |
| Achille | Distance | Vendre et acheter régulièrement, l'aider sur la tournée | Le comparer à Maurice | Rumeurs, carnets de Maurice, routes |
| Adèle | Amour, inquiétude | Lui écrire, s'installer pour de bon | Rien | Graines, souvenirs, indices sur les lieux |

### Entre les personnages

| Relation | Au départ | Ce qui peut la faire évoluer |
|---|---|---|
| Basile et Théo | Amour et incompréhension | Ce que l'île offre à Théo, le rôle de Frida |
| Frida et les anciens | Elle est adoptée, ses machines non | Une automatisation qui rend service à tous ; Fernand comme pont |
| Frida et Adèle | Lien ancien, une deuxième maman un peu distante | Les lettres ; le joueur qui transmet des nouvelles |
| Frida et Théo | Complicité cachée | Que Basile l'apprenne |
| Achille et la mémoire de Maurice | Respect et jalousie | Un successeur ; le joueur qui le reconnaît pour lui-même |
| Odile et Adèle | Affection ancienne, rancune douce (elle est partie) | Une lettre transmise par le joueur |
| Lise et les enfants du joueur | Amitié naissante | Le temps passé ensemble |
| Johnny et l'île | Tolérance distante | Que quelqu'un reprenne les visites de Maurice |
