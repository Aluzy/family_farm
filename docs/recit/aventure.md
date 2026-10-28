# L'architecture de l'aventure

Comment l'histoire se déroule en jeu : une trame qui suit la progression de la ferme, des arcs de
personnages libres, un fil secret pour les curieux, et des événements nés des états du monde.

## Trois niveaux, trois types d'événements

| Niveau | Ce qu'il raconte | Ce qui le fait avancer | Obligatoire ? |
|---|---|---|---|
| 1. La trame, « Une place sur Céron » | L'installation de la famille et la façon dont l'île finit par la reconnaître | Les chapitres de la campagne, un plancher de nuits, la taille de la ferme | Oui, sans mission imposée |
| 2. Les arcs secondaires | Les vies de Théo, Garance, Odile, Achille, Frida, Fernand, Lise, Adèle | La relation avec chacun, les visites, les dons | Non |
| Le fil de la lune | Johnny, l'épave, ce que cachait Maurice, la pierre | La curiosité | Non, jamais signalé |
| 3. La narration émergente | Les manques, les surplus, l'humeur des hameaux, l'empreinte de la ferme | Les états simulés par le moteur | Non |

- **Scénarisé (S)** : arrive toujours, à un moment fixe. Peu nombreux.
- **Conditionnel (C)** : écrit à la main, se déclenche si des conditions sont réunies.
- **Émergent (É)** : produit par une règle générale à partir d'un état du monde.

## 1. La trame en quatre actes

Un acte s'ouvre quand le chapitre de la campagne est atteint ET qu'un plancher de nuits est passé
(`RECIT.ACTES`, `acteEnCours`). Les chapitres se terminent vite (l'autonomie complète arrive vers la
nuit 11) : sans ce plancher, l'histoire serait compressée en quelques soirées. Les objectifs de la
campagne ne changent pas ; les intros des chapitres sont réécrites dans la voix d'Adèle, d'Achille
ou d'Odile, les consignes restant dans les objectifs.

| Acte | Chapitres | Nuits minimum | Question | Enjeu |
|---|---|---|---|---|
| I. L'arrivée | 1 et 2 | 0 | Peut-on vivre ici ? | Un toit, de quoi manger, un premier lien |
| II. Le petit de Maurice | 3 et 4 | 10 | Est-il à la hauteur de son grand-père ? | Confirmer le bon a priori des hameaux |
| III. Ce que devient la ferme | 5 et 6 | 25 | Quelle place prend sa ferme ? | Petite exploitation ou grande ferme, et ce qu'il fait de ses gains |
| IV. D'ici | 7, puis mode libre | 45 | Est-il devenu quelqu'un d'ici ? | La reconnaissance, différente selon sa voie |

### Acte I — L'arrivée

- **L'arrivée aux Mouettes (S)** : le bac accoste ; Fernand, sur la cale. Remplace le texte
  d'ouverture « Printemps 2021 » (`DEPART.HISTOIRE`), qui n'est plus affiché.
- **La première lettre d'Adèle (S)**, le premier soir, avec la lettre du notaire raccourcie.
- **L'événement déclencheur (S)** : au premier arrêt de la calèche à la ferme (chapitre 2), Achille
  remet la clé de la maison de Maurice au Gué. Remplace la réplique actuelle du cocher et la phrase
  du didacticiel « Le cocher t'a parlé d'un hameau ».
- **Le Gué (C)**, hameau garanti près de la ferme ; la maison de Maurice, vide et jamais fermée (on ne ferme pas, au Gué).
- **Odile devant la maison (C)** et le premier carnet de Maurice, rangé dans le carnet du joueur.

### Acte II — Le petit de Maurice

- **Le premier carnet (C)** : les promesses que Maurice n'a pas pu tenir (le toit de Garance, la
  scie de Bois-Joli, la pompe des Mouettes). Chacune ouvre un arc ; aucune n'est imposée.
- **La première veillée de pleine lune (S)** : l'île rencontre la famille ; l'accueil varie selon ce
  que le joueur a fait (C). Odile le tutoie désormais.
- **Frida vient à la ferme (S)** quand le palier « Automatisation » de l'arbre s'ouvre : elle
  propose ses machines.
- **Le retournement (S)** : Achille apprend au joueur que Maurice n'a laissé aucune fortune ; il a
  tout dépensé pour les maisons et le matériel des autres.

### Acte III — Ce que devient la ferme

- **L'empreinte de la ferme devient visible (É)** : les hameaux commentent sa taille, le bois
  coupé, les machines.
- **La seconde veillée (C)** porte sur la ferme du joueur.
- **L'enveloppe de Maurice (S)**, au niveau 9 : la lettre existante (15 000 pièces) devient une
  décision.
- **Les arcs arrivent à leur point de bascule (C)** : Théo, la laine de Garance, la relève
  d'Achille.

### Acte IV — D'ici

- **La fête des premiers arrivants (S)**, à Brumeval, à la première pleine lune après le chapitre 7
  et la nuit 45.
- **La résolution (C)**, selon la voie et ce que le joueur a rendu.
- **Après (É)** : le mode libre continue ; arcs, émergence et fil de la lune restent ouverts.

## 2. Les décisions et les fins

Le joueur ne choisit jamais dans un menu : il décide par ses actes. Deux mesures cachées : l'**empreinte
de la ferme** (calculée : tuiles labourées, arbres abattus et replantés, bêtes, machines posées ;
`RECIT.EMPREINTE`, seuils provisoires 120 et 220 points) et la **confiance de chaque hameau**
(qui dérive lentement la nuit quand l'empreinte est haute : `RECIT.DERIVE`).

| Décision | Quand | Options | Conséquences |
|---|---|---|---|
| Automatiser avec Frida | Dès l'acte II | Ses machines, certaines, aucune | Du temps pour explorer ; Frida et Théo se rapprochent ; Garance et Odile se méfient. Une machine se démonte. |
| La taille de la ferme | En continu | Rester petit, grandir | L'empreinte ; les remarques des hameaux ; le paysage. |
| Tenir les promesses de Maurice | Après le premier carnet | Toutes, certaines, aucune | Chaque promesse tenue ouvre la confiance d'un hameau et un carnet. |
| L'enveloppe de Maurice | Niveau 9 | L'ouvrir à la ferme (la garder), la porter à Odile (les toits de Céron) | Garder : 15 000 pièces. Donner : les maisons usées réparées dans les nuits suivantes, la confiance de tous en hausse. |
| La maison de Maurice | Dès l'acte II | La laisser fermée, la rouvrir comme halte, la donner à une jeune famille | Odile s'en attriste, un lit pour les nuits loin de la ferme, ou une famille au Gué. |
| Ce que deviennent les gains | Acte III et après | Entretien des hameaux, réparation de la nature (haies, arbres replantés, coins laissés sauvages), rien | La confiance monte, l'empreinte baisse, la carte le montre. |
| Nourrir Johnny | À tout moment | Reprendre les visites de Maurice, ou non | Ouvre le fil de la lune. |

Personne ne quitte l'île : un foyer malheureux parle de partir, sans partir.

### Les quatre fins (la fête a toujours lieu)

| Voie | Ce qu'il a rendu | Ce que fait l'île |
|---|---|---|
| Petite exploitation | L'entretien des hameaux | **« Le nouveau Maurice »** : les anciens lui confient l'entretien de l'île ; Odile lui donne la cloche de la calèche de Maurice ; on l'appelle par son prénom. |
| Petite exploitation | Peu de chose | **« Le voisin tranquille »** : accepté sans bruit ; Fernand l'invite à pêcher. |
| Grande ferme | La réparation de la nature et l'entretien | **« Celui qui a fait autrement »** : l'île admet que le changement peut la servir ; Frida lui confie ses plans ; Théo reste. |
| Grande ferme | Peu de chose | **« Le riche d'à côté »** : salué poliment, sans chaleur ; Adèle lui demande s'il est heureux. Le mode libre permet de réchauffer cette fin. |

## 3. Les arcs secondaires (tous conditionnels)

| Arc | Ouverture | Étapes | Issues | Mécanique |
|---|---|---|---|---|
| Le toit de Garance | Le premier carnet | Réunir planches, pierre, laine ; livrer ; plus tard, l'atelier manque de laine (É) | Toit réparé, confiance des Genêts ; laine fournie par la ferme ou cardeuse de Frida acceptée à contrecœur | Construction, moutons, tissage |
| Théo et Basile | Rencontrer Théo | Le robot ; l'inquiétude de Basile ; parler à son père | Il part (une lettre de lui), reprend l'atelier en le modernisant, ou devient l'apprenti d'Achille | Automatisations, scierie |
| La relève d'Achille | Confiance d'Achille | L'aider sur la tournée un jour où il est malade ; trouver qui reprendra | Théo, un jeune d'un hameau généré, ou personne | Calèche, cheval |
| Odile et la maison de Maurice | Ouvrir la maison | Respecter les coutumes de lune ; revenir ; porter une lettre entre elle et Adèle | Coutumes et cloche transmises, ou réserve | Calendrier de lune, courrier |
| Les machines de Frida | Le palier « Automatisation » | Ses commandes ; une machine utile à tout un hameau | Les anciens l'acceptent, ou Frida se retire | Arbre technologique, robot |
| La pompe des Mouettes | Le carnet de Maurice | Aider Fernand à la réparer en cachette | Fernand devient le pont entre Frida et les anciens | Eau, pompe |
| Lise et les enfants | Des enfants, Les Genêts découvert | Terriers et cachettes | Amitié ; les enfants disent vouloir rester | Faune observable |
| Les lettres d'Adèle | Dès l'arrivée | Une lettre à chaque étape marquante (première récolte, veillée, Serre, robot, fête) | De l'inquiétude à la fierté ; indices de lieux | Courrier existant |

## 4. Le fil de la lune

Quatre fragments à recueillir, puis une nuit de pleine lune dans la mine : la galerie secrète
n'apparaît qu'à ces deux conditions, et rien dans le jeu ne dit qu'elle existe. Les fragments
entrent dans le carnet du joueur, sans objectif ni marqueur (`RECIT.FRAGMENTS`).

| Fragment | Où et comment | Ce qu'il dit |
|---|---|---|
| 1. La note « J. » (`note_j`) | Un carnet de Maurice qu'Achille donne quand sa confiance est suffisante | « Il dit qu'il l'a "rentrée sous la terre du milieu". » |
| 2. La page de bord (`page_bord`) | Dans l'épave, la nuit, avec une lanterne (elle occupe une case d'équipement) | Le croquis d'une pierre, le mot « fragment » |
| 3. Les relevés de Frida (`releves_frida`) | Chez Frida, interrogée sur la lune avec une confiance suffisante | Les récoltes de pleine lune gagnent le plus au centre de l'île, là où est la ferme |
| 4. Les bribes de Johnny (`johnny_pleine`, `johnny_noire`, `johnny_croissante`) | Chez lui, la nuit, après plusieurs repas, à trois phases de lune | La lune « cherche quelque chose » ; on l'« entend sous les arbres » ; un caillou « mis au chaud, dans le noir » |
| Facultatif : Lise (`souvenir_lise`) | Quand elle fait confiance | Johnny marchant vers les bois de la ferme une nuit de pleine lune |

- **L'ouverture** : les fragments 1 à 4 au carnet ; entrer dans la mine de la ferme entre 22 h et
  4 h une nuit de pleine lune. Au niveau 4 (sur 8), une fissure éclairée d'une lumière froide ;
  derrière, une petite chambre fixe, hors de la génération quotidienne des niveaux : une
  couverture, une tasse, des phases de lune gravées, et la pierre.
- **La pierre posée sur la ferme** : tout y pousse plus vite, tout le temps (proposé : un stade
  toutes les 18 heures au lieu de 24, à calibrer avec le joueur automatique). La ferme luit
  faiblement les nuits de pleine lune. Frida doute : « C'est peut-être le sol. Peut-être pas. »
  Johnny, à la visite suivante : « Ah. Elle est rentrée. »

## 5. La narration émergente

Des règles générales transforment des états simulés en événements qui laissent une trace. Aucun
dialogue tiré au hasard.

| État observable | Dans le moteur | Événement | Conséquence |
|---|---|---|---|
| Un foyer a mal mangé hier | Existe (journal des foyers) | Achille le signale ; le foyer en parle | Vendre ou donner à manger : confiance du hameau, souvenir du foyer |
| La réserve d'un hameau déborde | Existe (réserves, calèche) | Le hameau propose un échange | Un lien commercial |
| Un foyer reste malheureux | Existe (bonheur) | Il parle de partir | Personne ne part ; l'aider le fait renoncer et monte la confiance |
| Les maisons s'usent depuis la retraite de Maurice | Nouveau | Toits abîmés visibles | Réparer fait monter la confiance |
| L'empreinte de la ferme monte | En partie | Rumeurs, remarques, sujet de veillée | Confiance des anciens en baisse, intérêt des jeunes en hausse |
| Couper sans replanter | Existe | Basile le remarque | Empreinte en hausse ; replanter la fait baisser |
| Les bêtes s'éloignent des terres défrichées | Nouveau | Lise ou Frida le font remarquer | Haies et coins sauvages les ramènent |
| Le quota de pêche souvent épuisé | Existe | Les pêcheurs des Mouettes en parlent | Confiance des Mouettes un peu en baisse |
| Une récolte de pleine lune | Existe | Invitation à la veillée | Présence : confiance générale |
| Un semis aux nuits noires | Existe | Odile le relève | Aucune : une coutume, pas une règle |
| Johnny sans visite depuis longtemps | Nouveau | Sa cabane plus froide, il a maigri | Une visite suffit |
