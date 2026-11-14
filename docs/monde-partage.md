# Le monde partagé : la ferme, et seulement la ferme

Ce document affine l'axe E de la stratégie (« Multijoueur coopératif et mondes persistants ») après les
lots E-0 à E-7. Il fixe **ce qu'est un monde partagé** : la zone de la ferme. Le reste du grand monde
reste à la partie solo de son propriétaire.

État au 5 novembre 2026. Sont déjà en ligne : le compte, la mise en ligne de sa ferme, les invitations et
le retrait d'un membre, l'avatar des autres joueurs, Construire, le potager, les bêtes, la cuisine et la
nuit partagée. **E-8 a posé la frontière** : M.1, M.2 et M.3 ci-dessous sont faits (§ 7). Le code est dans `worker/src/monde.mjs`, `js/ui/en-ligne.js` et `js/engine/commandes.js`.

> **Le chantier « l'île à bâtir » change cette frontière** (décision D9 de `docs/ile.md`). Sa nouvelle
> frontière est au § 13, **« L'île partagée »** (fiche I9a, 14 novembre 2026) : elle remplace E-8 (§ 1 à § 7)
> et F.2 (l'horloge figée, `worker/README.md`) pour les mondes du chantier : I9a2 y pose l'horloge vivante (§ 13,
> « Ce que fait I9a2 »). Tant que le réglage
> `VILLAGE.ACTIF` est éteint, le jeu publié et les mondes d'avant gardent E-8, tels quels, jusqu'à la bascule
> (I9h) et la migration des mondes (I9f).

## 1. Le principe

> **Un monde partagé, c'est ta ferme.** Tes amis viennent chez toi : ils construisent, cultivent,
> s'occupent des bêtes, cuisinent et dorment sous ton toit. Les routes, les hameaux et le
> reste du grand monde restent ton aventure, dans ta partie solo.

La zone de la ferme est le rectangle `FERME` du terrain généré (`farmTerrain(state).FERME`). Sur la carte
de 644 × 510 cases, il est à `X 250, Y 198` et mesure **144 × 114 cases**, soit 16 416 cases et 5 % de la
carte. `horsDeLaFerme(state)` (`js/engine/didacticiel.js`) et `enExpedition(state)`
(`js/engine/equipement.js`) savent déjà dire si l'on en est sorti.

## 2. Pourquoi la ferme seulement

1. **La promesse.** La stratégie promet « chaque joueur possède un monde ; il invite des amis qui
   peuvent y jouer, construire et jardiner ». Le cœur partagé, c'est le lieu qu'on bâtit ensemble.
   L'exploration, le récit et les amitiés des hameaux sont une histoire personnelle : la partager
   demanderait de trancher qui vit le récit, qui est l'ami de qui, qui a trouvé quoi.
2. **Le poids.** Mesures sur une vraie partie (jour 54) :

   | Ce qui est envoyé | Taille |
   |---|---|
   | La partie entière | 240 Ko |
   | dont les habitants des 9 hameaux (`monde.habitants`) | 121 Ko |
   | La partie sans le grand monde (habitants, hameaux, régions vues, récit, amitiés, calèche, courrier…) | **114 Ko** |

   C'est la moitié de moins à l'entrée dans un monde, à chaque instantané (toutes les 20 révisions) et
   à chaque rattrapage complet. L'empreinte de contrôle se calcule aussi deux fois plus vite.
3. **La simulation.** La stratégie demande que les lieux lointains restent « résumés » et qu'un monde
   vide ne simule rien (règle 7 et règle 8 de l'axe E, § 4.5). Dans un monde réduit à la ferme, la
   nuit partagée n'a ni hameaux à faire vivre ni repousses du grand monde à calculer. Mesure sur la même
   partie : une nuit coûte aujourd'hui 43 ms à froid, puis environ 8 ms.
4. **Les conflits.** Moins de surface partagée, c'est moins de cas : pas de « deux joueurs prennent le
   même champignon à l'autre bout de la carte », pas de calèche à deux passagers.
5. **Le téléphone.** La carte en ligne peut se limiter à la ferme et à ses abords : moins de décor à
   charger et à dessiner.

## 3. Ce qui est partagé, ce qui ne l'est pas

### Partagé : la ferme (le monde la tient, tout le monde la voit et la change)

| Domaine | Dans la partie | En ligne aujourd'hui |
|---|---|---|
| Le bâti | `blocs`, `blocsDessus`, `sols`, `solsEtage`, `etage`, `hauteurs`, `rehausses`, `sens`, meubles, teintes | ✅ Construire (E-2) |
| Le potager, la Serre | `potager`, `serre`, `irrigation`, `cruche` | ✅ (E-5) |
| Les bêtes | `poulailler`, `paturage`, `silo`, `ruches` | ✅ (E-6) |
| La cuisine | `stations`, `frigo`, `boite`, le Moulin | ✅ (E-7) |
| Le temps | `day`, la nuit (`nuit.partagee` : tous couchés) | ✅ (E-5) |
| Le coffre commun (F.1) | `inventaire`, `eauMl`, l'énergie du personnage | ✅ |
| Le verger, les arbres, rochers et herbes **dans** le rectangle, la pêche à l'étang et à la mare | `verger`, `outils`, `foret`, `morceaux` | ✅ (E-9) |
| L'énergie de la ferme | `panneaux`, `batteries`, `pompe`, `reservoir`, `robot` | ✅ (E-10 : allumer, améliorer, entretenir, réparer) |
| La progression | `technologies`, `pointsTech`, `atelier`, l'XP des gestes | ✅ commune (E-10) |
| La famille du propriétaire | `famille` : elle vit sur la ferme, mange et dort la nuit | ✅ présente, sans corvées seule (E-6) |

### Pas partagé : le grand monde (reste à la partie solo du propriétaire)

| Domaine | Dans la partie | En ligne |
|---|---|---|
| Les régions, leur sol, ce qu'on y prend | `monde.vues`, `monde.vu`, `monde.pris`, `monde.ici` | hors du monde partagé |
| Les hameaux et leurs habitants | `monde.hameaux`, `monde.habitants`, `projets` | hors du monde partagé |
| Les amitiés, les invitations à un repas, les plans | `amitie`, `invitations`, `plans`, `bienvenue` | hors du monde partagé |
| Le récit, le didacticiel, le courrier | `recit`, `didacticiel`, `courrier`, `campagne` | figés (ni lus ni changés en ligne) |
| La calèche, le cheval, les excursions (autrefois la mine et les grottes) | `caleche`, `cheval`, `bivouac`, `jeu.html?carte=…` | hors du monde partagé |

La partie solo n'est jamais touchée par le jeu en ligne (F.4 : le monde est une copie). Ce qui a été
fait dans le grand monde avant la mise en ligne reste dans la partie solo, intact.

## 4. Décisions proposées (réversibles), à valider

Chaque décision a une valeur par défaut, comme le demande la stratégie (§ 9 : ne rien bloquer).

- **M.1 : la frontière.** *Recommandé* : en ligne, le personnage ne sort pas du rectangle de la ferme. Au
  bord, il s'arrête, et une bulle dit : « Le reste du monde t'attend dans ta ferme solo ». La caméra
  reste aussi sur la ferme et ses abords (une marge de quelques cases, pour voir la clôture et la
  forêt). *Autre choix* : laisser passer, mais sans aucun geste dehors. Je le déconseille : on
  verrait des hameaux vides et une carte qu'on ne peut pas toucher.
- **M.2 : le grand monde de la copie.** *Recommandé* : **élagué à la mise en ligne**. Le monde ne garde
  que la ferme : les habitants, les hameaux, les régions vues, les amitiés, le récit, la calèche et le
  courrier sont retirés de sa copie, et la partie solo les garde. *Autre choix* : les garder figés
  dans la copie. C'est plus simple, mais deux fois plus lourd, sans aucun usage.
- **M.3 : la nuit d'un monde partagé.** *Recommandé* : elle ne fait que la ferme. Les repas de la
  famille, les plantes, les bêtes, les préparations, le frigo, les ruches, et les arbres, rochers et
  herbes qui repoussent sur la ferme. Ni hameaux (`habitantsNuit`), ni repousses du grand monde
  (`repousseMonde`), ni amitiés, projets, invitations, plans, récit ou visite de bienvenue. Le moteur
  le sait par un drapeau de la partie (`state.mondePartage = true`), posé à la mise en ligne. Il fait
  partie de la partie, donc le monde et chaque joueur font exactement la même nuit (F0-4).
- **M.4 : le Marché.** On y va par la calèche, hors de la ferme. *Recommandé pour la v1* : **pas de
  Marché en ligne**. Les pièces (`pieces`) sont celles du coffre commun ; elles servent aux
  achats de la ferme (une place à l'Étable, agrandir le Poulailler, le frigo). *Plus tard*, si l'on
  veut vendre ensemble : un « comptoir de la ferme » (un bloc à poser), où l'on vend et achète sans
  quitter la ferme. C'est une décision de jeu : à toi de dire si tu le veux.
  **Décidé (5 novembre 2026) : pas de commerce en ligne pour l'instant.** On vend et on achète seulement
  dans sa partie solo ; le comptoir de la ferme reste une idée.
- **M.5 : la progression.** *Recommandé* : le niveau de la ferme, l'XP des gestes et les technologies
  sont **ceux du monde** et se gagnent à plusieurs. L'arbre des technologies se joue donc en ligne,
  dans un lot à venir. Les chapitres du récit et le didacticiel restent à la partie solo, figés en
  ligne.
- **M.6 : la famille.** Elle est celle du propriétaire et vit sur la ferme. *Recommandé* : présente et
  nourrie la nuit, mais elle ne fait pas les corvées seule (E-6), et ses amitiés restent au solo.

## 5. Ce que cela demande, techniquement

1. **La frontière (M.1)**
   - Côté jeu : borner le déplacement du personnage et la caméra au rectangle `FERME`, plus une marge,
     en ligne (`js/farm-stage.js`, la marche et la caméra).
   - En ligne, ignorer les gestes de la carte qui touchent le grand monde. Ce sont les fonctions de
     `js/ui/outils.js` appelées hors de la ferme : `mondeFromStage`, et `chopFromStage`,
     `mineFromStage`, `caillouFromStage`, `scytheFromStage` et `fishFromStage` hors du rectangle.
     Ignorer aussi les hameaux (`stageHameau…`), la calèche et les excursions (`jeu.html?carte=`).
   - Côté serveur : une commande qui vise une case hors de la ferme est refusée. Ce contrôle simple
     s'ajoute à ceux du moteur.
2. **L'élagage (M.2)**, à la mise en ligne (`MondeRegistre.creer`) : retirer de la copie
   `monde.habitants`, `monde.hameaux`, `monde.vues`, `monde.vu` et `monde.pris`, ainsi que `amitie`,
   `invitations`, `plans`, `projets`, `recit`, `caleche`, `courrier` et `bienvenue`. Poser
   `mondePartage = true`. Il faut que le moteur tolère ces absences (il le fait déjà pour une partie
   neuve) : à vérifier par un test qui joue 30 nuits partagées sur une partie élaguée.
3. **La nuit de la ferme (M.3)** : dans `runNight` (`js/engine/night.js`), sauter les étapes du grand
   monde quand `state.mondePartage`. Un test : la même nuit, rejouée par le journal, donne la même
   empreinte.
4. **Le décor** : en ligne, la carte peut ne charger que les régions qui touchent la ferme. Gain à
   mesurer sur le téléphone de référence, avec « Mesurer Construire ».

## 6. La suite, lot par lot

| Lot | Contenu | Dépend de |
|---|---|---|
| **E-8 · La ferme, frontière du monde** | M.1, M.2 et M.3 : la frontière (personnage, caméra, gestes hors ferme ignorés, refus côté serveur), l'élagage à la mise en ligne, la nuit de la ferme seule. Tests : partie élaguée sur 30 nuits, refus d'une commande hors ferme, test à deux (le personnage s'arrête au bord). | — |
| **E-9 · Les outils de la ferme** | Hache, pioche et faux sur les arbres, rochers et herbes du rectangle, la pêche si la ferme a de l'eau, le verger, les morceaux à ramasser, les panneaux et les batteries. Chaque geste devient une commande. | E-8 |
| **E-10 · La progression commune** | M.5 : l'arbre des technologies, les points et les niveaux de la ferme en ligne. | E-8 |
| **E-11 · Les rôles** | Les permissions détaillées de la stratégie (§ 4.4 : visiteur, ami jardinier, bâtisseur, propriétaire), vérifiées à chaque commande, et un journal d'audit lisible par le propriétaire. | — |
| **E-12 · Sauvegardes du monde** | Instantanés vers R2, restauration par le propriétaire. | — |
| *(à décider)* | M.4 : un comptoir de la ferme pour vendre et acheter ensemble. | ta décision |

Ce qu'il ne faut **pas** faire maintenant : partager le grand monde, les hameaux ou le récit ; un monde
à plus de 4 joueurs ; faire revenir les changements du monde en ligne dans la partie solo.

## 7. E-8 : ce qui est fait

- **M.1, la frontière.**
  - Côté jeu : en ligne, la scène reçoit le rectangle de la ferme (`borne`). Le personnage n'en sort pas : `dansLaBorne` passe par `marchable`, la même règle pour les trajets et pour la manette. Un appui dehors le mène au bord, avec le mot « Le reste du monde t'attend dans ta ferme solo ». La vue reste sur la ferme et 6 cases autour (`camera.js`, `BORNE_MARGE`).
  - Les rappels de la carte qui touchent le grand monde, ou que le monde ne connaît pas encore (les outils de la ferme : E-9), ne font rien en ligne (`js/ui/stage.js`, `enLigneSurLaFerme`).
  - Côté serveur : une commande dont `case`, `de` ou `vers` sort de la ferme est refusée (`horsDeLaFerme`).
- **M.2, l'élagage.** `elaguer` retire de la copie `monde.habitants`, `monde.hameaux`, `monde.vues`, `monde.vu`, `monde.pris` et le but de la boussole. La migration redonne des valeurs neuves, et `mondePartage = true` est posé. Les petites données du grand monde (le récit, les amitiés, la calèche, le courrier) restent dans la copie, figées : les remettre à zéro relancerait des événements de début de partie.
- **M.3, la nuit de la ferme.** Avec `state.mondePartage`, `runNight` saute les habitants, l'amitié, les invitations, les plans, les projets, la visite de bienvenue, le récit et les repousses du grand monde.
- **Mesures** sur la partie du jour 54 :
  - la copie mise en ligne passe de 212 Ko à **106 Ko** ;
  - 30 nuits partagées de suite : 71 ms pour la première, puis **9,5 ms** en moyenne ;
  - le journal se rejoue en 63 ms, avec la même empreinte.
  - Le premier calcul du terrain (≈ 0,5 s) est celui que la pose d'un bloc faisait déjà ; il est gardé en mémoire ensuite.

## 8. E-9 : les outils de la ferme

- **Nouvelles commandes** :
  - `outil.couper` (un arbre ou un buisson) ;
  - `outil.casser` (un rocher) et `outil.caillou` (un caillou à la main) ;
  - `outil.faucher` et `outil.faucherAutour` (le coup fort, 60 touffes au plus) ;
  - `outil.pecher` ;
  - `verger.cueillir`.
- **Rien ne tombe au sol en ligne.** Les commandes ne prennent pas de positions de chute : ce qu'un coup lâche va droit au coffre commun, dans la logique d'un monde qui ne ramasse pas (E-6). Le jeu le dit dans une seule notification qui monte coup après coup. À la mise en ligne, les morceaux qui traînaient au sol entrent au coffre.
- **L'outil en main** est celui de chaque joueur : il n'est pas écrit dans la partie du monde.
- **La frontière** : le monde refuse un arbre ou un rocher (« col,rang ») et une touffe (« x,y » en px) hors de la ferme, ainsi que la pêche dans les eaux du grand monde (lac, rivière, mer).
- **Pas encore en ligne** : les machines de l'Atelier (la botteleuse, les chaînes, les entonnoirs) et les objets posés au sol de l'Atelier.

## 9. E-10 : la progression commune (M.5)

- **Nouvelles commandes** :
  - `tech.acheter` (un nœud de l'arbre des technologies) ;
  - `atelier.fabriquer` (une recette de l'Atelier : bloc, outil, meuble, animal attiré) et `atelier.construire` (la Presse) ;
  - `appareil.basculer`, `appareil.ameliorer`, `appareil.entretenir`, `appareil.reparer` ;
  - `reservoir.agrandir`, `robot.batterie` (`serre.agrandir` a disparu : la Serre n'a plus de niveaux) ;
  - `arbre.planter` (soumis à la frontière, par sa case) et `potager.semis`.
- **Une progression commune.** Les points de technologie, les nœuds acquis, les outils et les meubles fabriqués sont ceux du monde. Un ami qui achète une technologie la donne à toute la ferme, et dépense les points et les pièces du coffre commun. Le niveau et l'XP montent avec les gestes de chacun.
- **Encore fermé en ligne, comme le veut la vision :**
  - tout ce qui relève du grand monde : le Marché (acheter, vendre), la calèche, le cheval, les hameaux (projets, toits, amitiés, commandes aux îles), le récit (l'enveloppe, la pierre de lune, la promesse), les invitations à un repas, le sac des expéditions ;
  - « choisir son lit », qui est un choix de chaque joueur.

## 10. E-11 : les rôles et le journal

Les rôles de la stratégie (§ 4.4), dans `js/engine/roles.js`. Le monde les vérifie à chaque commande ; le jeu aussi, avant de jouer, pour le dire tout de suite.

| Rôle | Ce qu'il fait |
|---|---|
| 👀 Visiteur | Il regarde, se promène et dort avec les autres. Il ne change rien à la ferme. |
| 🌱 Ami jardinier | Le potager, les bêtes, la cuisine, le frigo, les outils, le verger. Il ne construit pas. |
| 🔨 Bâtisseur | En plus : Construire, l'Atelier, la progression, les appareils, les agrandissements. |
| 🏡 Propriétaire | Tout. Lui seul retire une structure sensible : un atelier, un bâtiment, un appareil, un bloc unique, le silo, l'écurie, le frigo. Lui seul invite, change les rôles et retire un membre. |

- **L'invitation porte un rôle**, choisi par le propriétaire dans 👥 (bâtisseur par défaut).
- **Il change un rôle** dans 👥 : 👀 🌱 🔨 à côté de chaque membre. Le changement prend effet tout de suite sur les connexions ouvertes : la liste des membres est diffusée à tous, et le bandeau montre son rôle à chacun.
- **Le journal du monde** (📜, propriétaire seulement) : les 50 dernières commandes, puis « Plus ancien ». Il dit qui, quoi en mots et quand. Il garde ce que garde le journal du monde (500 révisions avant le dernier instantané).
- **Routes** : `POST /mondes/<id>/invitations { role }`, `POST /mondes/<id>/role { compte, role }` et `GET /mondes/<id>/journal?avant=`.
- **Une base d'avant** prend la colonne `role` des invitations à son réveil.

## 11. E-12 : les sauvegardes du monde

- **Où.** Dans le bucket R2 que le Worker a déjà (`SESSIONS`), sous `mondes/<id du Durable Object>/`. Rien de plus à configurer. Le rapport quotidien ne lit que `sessions/` et `players/`.
- **Quand.** Une sauvegarde après chaque nuit partagée, une autre quand le propriétaire le demande, et une juste avant chaque restauration : une restauration se défait donc. Les 14 dernières sont gardées.
- **Combien.** Environ 100 Ko par sauvegarde pour une vraie ferme (§ 2), soit environ 1,5 Mo par monde. Le quota gratuit de R2 est de 10 Go.
- **Restaurer** (le propriétaire, dans 👥 › 💾, avec confirmation) :
  - la partie de la sauvegarde devient celle du monde, à une révision de plus ;
  - un instantané est écrit, et le journal porte une marque `monde.restaurer`, jamais rejouée, qui garde l'histoire d'avant ;
  - chaque joueur connecté reçoit la partie entière et un mot ; un joueur en retard d'une restauration la reçoit entière à son retour.
- **Routes** : `GET` et `POST /mondes/<id>/sauvegardes`, `POST /mondes/<id>/restaurer { cle }`, réservées au propriétaire. Une clé d'un autre monde est refusée.

## 12. E-13 : les machines de l'Atelier

- **Nouvelles commandes** :
  - `botteleuse.verser` et `botteleuse.sortir` ;
  - `chaine.verser`, `distributeur.verser` ;
  - `morceau.ramasser` (un morceau au sol : un produit de chaîne, du bois, de la pierre) ;
  - `cueillette.ramasser` (à la main : une branche, une baie… ; « sorte:case », soumise à la frontière).

  Elles demandent le rôle d'ami jardinier.
- **L'horloge figée** (F.2) ne fait pas tourner les machines le jour. Chacune a donc sa règle :
  - **la botteleuse** : le dernier versement de fibres sort la botte tout de suite, et sa paille va au coffre ;
  - **le distributeur de grain** nourrit les poules au début de la nuit partagée (`distribuerGrain(state, false)`) ;
  - **les chaînes** font leur journée au début de la nuit partagée (`chainesDeLaJournee`) : leur production en cours, puis ce que leur stock et une journée (de 6 h à 22 h) permettent, jusqu'à ce que leur tas soit plein. Le courant n'est pas compté.

  Les produits restent sur le tas, et chacun les ramasse par `morceau.ramasser`.

  I9a2 : un monde de l'île a une horloge vivante (§ 13) : ses machines tournent dans les pas, et sa nuit ne refait pas
  leur journée (la production doublerait). La botteleuse y sort encore sa botte au versement (sa sortie suit la carte,
  pas l'horloge).
- **Fermés en ligne, comme le veut la vision :** le grand monde (sa cueillette, ses hameaux, la calèche, le récit) et le commerce (M.4).

## 13. L'île partagée (I9a) : la nouvelle frontière

Décision D9 du chantier « l'île à bâtir » (`docs/ile.md`) : **un monde partagé, c'est l'île entière du
joueur.** Ses invités y marchent, y bâtissent et y produisent. Cette section remplace E-8 (§ 1 à § 7) et
F.2 (l'horloge figée) pour les mondes du chantier ; le jeu publié les garde tant que `VILLAGE.ACTIF` est
éteint.

### Ce qui est commun, ce qui reste à chacun

| Commun : le monde le tient, tous le voient et le changent | À chacun : il ne se synchronise pas |
|---|---|
| L'île : son relief, sa nature, ses lieux (tirés de la graine chez chacun) | Son personnage (son allure, sa place) |
| Les changements de l'île : ce qu'on y a pris et quand cela revient, les chemins et les blocs posés dehors, les quotas du jour | Son énergie |
| La ferme, comme aujourd'hui (le bâti, le potager, les bêtes, la cuisine, les appareils) | Son brouillard : ce que SON personnage a vu de l'île |
| Le coffre commun (F.1) et **la caisse** (D14, I9c) | Son sac (les provisions d'une sortie) et ce qu'il porte (I9c : sa charge) |
| Le port, le bac, les commandes, le catalogue d'import | **Son amitié** avec chaque villageois (I9d) |
| Les villageois, leurs tâches, leurs liens, les commerces, les vocations, les fêtes et les projets | Ses réglages (affichage, son, aide) |
| La chronique et les noms | L'outil qu'il a en main (E-9) |
| **L'heure** (D13 : l'horloge commune et vivante, I9a2) | |

Deux règles en découlent :

1. **Ce qui se tire de la graine ne s'envoie jamais.** Le relief, les biomes, les arbres, les rochers, les
   plantes, les lieux et la carte se refont chez chacun (`genererMonde`, `elementsDuMonde`, le Worker du sol) :
   le monde n'envoie que les **écarts** (ce qui a été pris, posé, retiré, avec leur jour).
2. **Le brouillard n'est jamais dans la partie du monde.** Chaque joueur découvre l'île pour lui ; le moteur, lui,
   ne lit que les régions vues **du monde** (`state.monde.vues`), les mêmes chez tous.

### Ce que fait I9a (le chantier allumé pour la partie du monde : `ilePartagee`, `js/engine/frontiere.js`)

- **La barrière est levée.** En ligne, sur une île, la scène n'a plus de borne : le personnage sort de la
  ferme et la vue le suit (`js/ui/stage.js`, `enLigneSurLaFerme`). Les autres joueurs le voient où qu'il soit
  (les positions relayées, E-4).
- **Le relief de l'île** se dessine chez l'invité comme chez l'hôte : il le tire de la graine de la partie
  du monde (le même niveau de port, la même ferme vierge, les mêmes chemins posés). Un test le vérifie dans un
  autre processus, qui n'a rien en mémoire (`tests/test-monde.mjs`, `tests/engine/monde-de-la-graine.mjs`).
- **Le brouillard de chacun** : ce que son personnage voit lève SON brouillard. Il est gardé dans son
  navigateur, par monde (`localStorage` `ferme-brouillard-<monde>`), et posé sur sa partie locale chaque fois
  qu'elle est refaite (`unirVu`, `js/engine/monde-vu.js` ; `js/ui/en-ligne.js`). Les régions vues du moteur ne
  bougent pas, la partie confirmée reste celle du monde (`tests/test-synchro.mjs`). La carte du monde et la
  boussole le lisent comme en solo.
- **Rien d'autre n'est encore synchronisé hors de la ferme** (I9b l'a fait : ci-dessous). Hors d'elle, un bandeau le dit sous le bandeau
  du monde (« 🏝️ Hors de la ferme : rien d'autre n'est encore synchronisé. »). Un geste qui vise une case
  dehors (couper, casser, cueillir, poser un bloc ou un chemin) est refusé par le jeu avant d'être envoyé, et
  par le monde s'il arrivait : le même contrôle, passé au moteur (`refusFrontiere`), le même pour le jeu et le
  serveur (`worker/src/monde.mjs` en garde les noms `dansLaFerme` et `horsDeLaFerme`).
- **Les mondes d'avant ne changent pas** : sans le chantier, la borne, le mot « Le reste du monde t'attend
  dans ta ferme solo » et le refus du serveur sont ceux d'E-8 (`tests/deux-joueurs.mjs`, 4a ; `test-monde.mjs`).
- Rien n'est ajouté à la sauvegarde (le format reste 103) : le brouillard de chacun vit dans son navigateur.

### Ce que fait I9a2 (l'horloge commune : D13 remplace F.2 pour les îles)

La note de conception : `docs/fiches/ile/I9a2-note-horloge.md` (validée telle quelle). Pour un monde de l'île
(`horlogeVivante`, `js/engine/temps-monde.js`), F.2 (l'horloge figée) et E-5 (la nuit partagée d'un coup) ne valent
plus ; les mondes d'avant les gardent jusqu'à leur migration (I9f).

- **Le temps passe tant qu'un joueur au moins est connecté.** Une connexion ouverte compte (sans détection
  d'inactivité). Le dernier qui part endort le monde (un instantané, une sauvegarde) ; le premier qui revient le
  réveille là où il s'était arrêté, sans rattraper le temps passé sans personne, et le dit (« 🌙 Le monde dormait
  depuis… »).
- **Par pas de 5 s d'horloge** (10 minutes de jeu), toujours un après l'autre, déduits de l'heure du serveur : ils ne
  sont pas des révisions du journal. Avant chaque geste, le monde rejoue les pas dus ; le geste porte son pas
  (`cmd.pas`) ; chaque joueur avance sa partie confirmée jusqu'à ce pas, puis joue le geste. Entre deux gestes, chaque
  joueur avance sa partie lui-même, à l'heure du serveur (mesurée à l'accueil), et l'heure affichée glisse entre deux
  pas. Rien n'est diffusé pour le temps qui passe, sauf, à chaque instantané au temps (toutes les 10 minutes),
  l'empreinte de la partie : un joueur qui ne la retrouve pas redemande tout.
- **Le pas ne lit que la partie.** Ce que les veilleurs de la page font en solo (la nuit à 22 h, le réveil, le bac, les
  contrats, les arrivées, les maisons, la chronique) est dans le pas ; en ligne, ces veilleurs se taisent.
  `Math.hypot` (dont l'arrondi peut varier d'un navigateur à l'autre) est sorti du chemin du pas.
- **La nuit vient seule à 22 h.** Quand tous les joueurs connectés sont couchés (« 🛏 Se coucher », « 1/2 »), le monde
  joue `temps.sommeil` et la nuit file dix fois plus vite (8 h en 48 s) ; un seul debout, elle garde son pas ; au
  réveil, chacun se lève (un lit ne vaut que pour sa nuit). Se coucher avant 22 h attend la nuit.
- **L'énergie est celle de chacun** : `state.energies`, par compte, dans la partie du monde (le monde la vérifie à chaque
  geste) ; la nuit la rend à tous les membres ; un nouveau membre commence avec l'énergie pleine, le propriétaire avec
  celle de sa partie. Chaque joueur voit la sienne.
- **Une préparation finit à son heure** (dans les pas) ; celle qui cuit encore à minuit finit à minuit, comme en solo.
  Construire ne fige plus l'heure en ligne.
- **Les instantanés** : tous les 120 pas ou 200 gestes, et au départ du dernier ; le journal garde ses 500 gestes ; au-
  delà de 60 pas de retard, un joueur reçoit la partie entière. **Les sauvegardes** (E-12) : une par heure de jeu en
  ligne et au départ du dernier (14 gardées).
- **La sauvegarde du jeu** passe au format 104 (`horloge`, `energies` dans la partie d'un monde).

Le coût, mesuré (`node scripts/cout-horloge.mjs` ; le détail : `docs/ile.md`, « L'horloge commune ») : par heure en
ligne, 720 pas (1 021 si tous dorment chaque nuit), ≈ 3,5 s de calcul pour le serveur, 0,47 Mo écrits pour l'île
avancée (1,5 Mo au plafond), 6 alarmes, presque rien de diffusé sans geste ; à quatre joueurs qui font chacun 4 gestes
par minute, 0,58 Mo écrits et 0,6 Mo diffusés, et le journal couvre 31 minutes.

### Ce que fait I9b (les changements de l'île)

Le détail et les mesures : `docs/ile.md`, « Les changements de l'île ». Le bandeau « rien d'autre n'est encore
synchronisé » d'I9a est retiré : hors de la ferme, ce qu'un joueur change est vu des autres.

- **Les gestes du dehors passent par le monde**, comme ceux de la ferme : `monde.recolter` (couper, casser, faucher,
  cueillir, ramasser une pièce de l'île, « sorte:x,y »), la pêche dans un lac, une rivière, la mer, et les blocs du
  dehors (un chemin, un pont, une barrière, un banc, une lumière). La frontière s'ouvre commande par commande
  (`COMMANDES_DEHORS`, `js/engine/frontiere.js`) ; un geste qui n'a pas de sens dehors reste refusé, avant d'être
  envoyé.
- **Ce qu'un geste lâche va au coffre commun** (F.1), comme les outils de la ferme en ligne (E-9) : ni au sol, ni
  dans le sac.
- **Le monde contrôle une pièce par son identifiant**, sans tirer le sol de sa région (`refusPieceMonde`) ; le geste
  refuse une pièce déjà prise. Deux joueurs sur le même arbre : le premier arrivé l'a, le coup de l'autre est annulé
  proprement, rien en double. Un bloc posé dehors, lui, lit le sol de sa case (le monde le tire de la graine).
- **Ce qui est pris revient au jour dit**, au même pas chez tous : la repousse vient avec la nuit dans les pas (une
  île l'a ; une ferme d'avant, toujours pas). Les quotas (la pêche du jour) sont dans la partie du monde : communs.
- **Rien n'est envoyé pour ce qui se déduit de la graine et du jour** : un geste du dehors pèse ≈ 155 octets ; une île
  très exploitée, ≈ 17 à 38 Ko d'écarts dans la partie (plafond 64 Ko).
- **L'intérêt par région** porte sur les positions (E-4), dix fois plus lourdes que les gestes : celles des joueurs
  proches (la même région ou l'une des huit autour) arrivent à leur pas, celles des autres une fois toutes les 2 s ;
  en entrant dans une région, on reçoit d'un coup où sont ceux qui y jouent. Les gestes vont à tous : la partie de
  chacun doit rester celle du monde.
- **Le sac de chacun** : `state.sacs`, par compte, dans la partie d'un monde de l'île (le propriétaire reçoit celui de
  sa partie ; un invité arrive sans) ; chacun le remplit, le vide, en mange dehors. La sauvegarde passe au format 105.
- **Le brouillard reste à chacun** (I9a).

### Ce que fait I9c (le port et la caisse)

Le détail et les mesures : `docs/ile.md`, « Le port et la caisse en ligne ».

- **La caisse est commune** (D14), comme le coffre (F.1) : les pièces de la partie du monde sont à tous ses membres.
  Une vente de n'importe quel joueur l'alimente, un achat y puise ; chacun la voit monter quand l'autre vend.
- **Les commandes du port passent** : `port.vendre`, `port.acheter`, `port.decharger`, `port.honorer`,
  `port.importer`, `port.contrat`, `port.livrer`, `port.apporter`, `port.agrandir`, et le portage (`portage.*`), dans
  `COMMANDES_DU_PORT` (`js/engine/frontiere.js`). Jouées par le monde, payées tout de suite.
- **Le comptoir est le même pour tous** : le lieu du port est écrit dans la partie à la mise en ligne
  (`state.port.lieu`, d'après le plan de la graine) ; le monde et chaque joueur le lisent sans rien demander à la page.
- **La charge de chacun** (`state.charges`, par compte, comme le sac) : ce qu'il a chargé sur la ferme (sorti du
  coffre commun), à la main, à la brouette ou à la charrette. Une brouette sert un joueur à la fois (autant que de
  brouettes au coffre) ; la charrette est attelée par un seul ; chargée, elle est à lui ; vide, elle passe au premier
  qui la demande. Le propriétaire reçoit le portage de sa partie.
- **Une commande du bac s'honore à plusieurs** : chacun livre ce qu'il a porté, payé au prix de vente ; la prime et
  l'expérience viennent avec la dernière livraison. Deux joueurs sur le même lot : le premier arrivé l'a.
- **Le bac** est dans le pas du monde (I9a2) : chacun le voit accoster au même pas, avec les mêmes commandes.
- **Les rôles** : vendre et porter, l'ami jardinier ; acheter, le bâtisseur ; agrandir le port, le propriétaire ; le
  visiteur ne vend ni n'achète (la grille complète : I9e).
- **Le journal du monde** garde le bilan de chaque geste du commerce (qui a vendu quoi, pour combien ; les achats ; le
  niveau du port) ; l'événement le porte aussi, et chaque joueur lit ce que les autres font au port.
- **La case d'un geste du port vient de la page** : le monde la compare à la dernière position relayée du joueur (12
  cases au plus). Un jeu trafiqué pourrait encore mentir sur sa position : c'est un garde-fou, pas une preuve.
- **La sauvegarde** passe au format 106 (`charges` dans la partie d'un monde ; une partie solo n'y gagne rien).

### Ce que fait I9d (les villageois en ligne)

Le détail et les mesures : `docs/ile.md`, « Les villageois en ligne ».

**La règle : le serveur seul fait compter.** En solo, ce qui se passe sous les yeux du joueur compte une fois (la règle
de la fiche 7b : le moteur fait le travail à l'heure, la scène ne fait que le montrer). En ligne, sur une île, c'est le
pas du monde qui fait compter : le travail des villageois, leurs repas, leurs liens, leurs achats à l'étal et aux
commerces, les arrivées se jouent dans les pas (`pasDuMonde`), au serveur et à l'identique chez chaque joueur, qui les
rejoue ; ce que la carte d'un joueur montre (un villageois qui frappe à sa porte, un geste vu, une réplique entendue)
n'écrit rien dans la partie, ou passe par une commande que le monde joue (`villageois.accueillir`). Aucune position
n'est envoyée : chacun place les villageois d'après l'heure commune (celle du pas, plus la part du pas écoulée : la même
que la lumière) et leur horaire, tiré de la graine ; le geste qu'il voit et l'action que joue le pas tombent à la même
heure.

- **La journée du village** est dans les pas, par les mêmes fonctions qu'en solo (`avancerTaches`, les repas, les liens
  de la nuit, les commerces) ; ce qu'ils produisent arrive au coffre commun au fil de la journée. Le pas de jour se joue
  « en lot » (`enLot`, `js/engine/blocs.js`) : ce qui parcourt les blocs posés n'est calculé qu'une fois par pas (le même
  résultat, trois à cinq fois plus vite).
- **L'amitié est à chacun** : `state.amities` (par compte, dans la partie du monde) ; une commande pose celle de son
  acteur dans `state.amitie` le temps de se jouer (`avecActeur`, comme l'énergie, le sac et la charge) ; un villageois que l'on ne
  connaît pas encore est à l'accueil (`VILLAGE.AMITIE.ACCUEIL`) ; le propriétaire reçoit celle de sa partie. Chacun voit
  la sienne. Ce que le pas lit de l'amitié (un ami proche accepte une tâche qu'il n'aime pas, un artisan ami apprend des
  pièces, les paliers de l'île) est **l'amitié du village**, la meilleure des joueurs (elle ne baisse jamais). Les
  liens entre villageois (`voisins`) sont du monde ; la copie d'une île les garde.
- **Parler, offrir** : les commandes `villageois.parler { id, n?, activite?, but? }` et `villageois.offrir { id, objet }`
  (l'ami jardinier au moins), jouées d'abord chez soi (la bulle tout de suite), puis par le monde.
- **Le tableau** (I3d) se lit de la partie du monde : le même pour tous.
- **Sans joueur, le village dort avec le monde** : rien n'est produit pendant l'absence ; la fenêtre du retour le dit
  (« Le village dormait avec lui… »).
- **Le visiteur** voit le village vivre et lui parle : sa page tire la bulle sur une copie de sa partie, sans rien
  envoyer ; il ne change rien.
- **La sauvegarde** passe au format 107, après les charges d'I9c (`amities` dans la partie d'un monde ; une partie
  solo n'y gagne rien).

### Le poids, et le plafond

Mesuré par `node scripts/poids-ile.mjs` : une partie neuve du chantier jouée par le joueur automatique
(graine 1, « applique »), pesée à trois moments.

| Moment | Jour | Villageois | La partie | La copie du monde | L'île hors de la ferme | Le village et le port |
|---|---|---|---|---|---|---|
| Début | 11 | 0 | 26,1 Ko (gzip 5,3) | 26,2 Ko | 1,0 Ko | 0,9 Ko |
| Milieu | 41 | 4 | 58,2 Ko (gzip 10,8) | 57,3 Ko | 1,0 Ko | 17,2 Ko |
| Avancée | 81 | 6 | 80,3 Ko (gzip 13,2) | 74,7 Ko | 1,0 Ko | 35,6 Ko |

- **Une île pèse moins qu'une ferme d'avant** : 75 Ko pour la copie avancée, contre 106 Ko pour la ferme
  élaguée d'E-8 (§ 7) et 212 Ko pour la partie entière d'alors. Les habitants des hameaux sont partis (I7e).
- **Le village grossit avec ses villageois** : ≈ 2,7 Ko chacun (dont 1,2 Ko de journal de 7 jours et 0,45 Ko
  de tirage : prénom, allure, goûts, traits), plus leurs liens (`voisins`), les commerces et la chronique.
- **L'île hors de la ferme ne pèse presque rien** pour le joueur automatique (1 Ko : le vu et les régions vues ;
  il ne récolte pas dehors). Une île très exploitée (1 100 pièces prises en même temps : 150 par jour, revenues en
  5 à 10 jours) pèse 39 Ko (6,5 Ko en gzip) dans `monde.pris`.
- **Ce qui se recalcule de la graine, et ne s'envoie pas** : 46 210 arbres, plantes et rochers (≈ 1 Mo s'il
  fallait les nommer), la carte (5,7 Mo), le terrain (322 Ko). Le refaire coûte : le terrain 0,3 s à froid, le
  contexte du sol 0,4 à 0,5 s, puis ≈ 12 ms par région (88 régions).
- **Ce qui se tire de la graine mais se garde** : le tirage des villageois (2,7 Ko pour six). On le garde : la
  teinture (I5b) et la migration (I7f) le changent.
- **Le serveur** : la mise en ligne d'une île avancée prend 5 ms ; sa nuit partagée 149 ms la première fois,
  puis 16 à 34 ms ; l'empreinte de contrôle 2,5 ms.

**Le plafond** (`data/village.json`, `VILLAGE.EN_LIGNE`) :

- **256 Ko** pour la partie d'un monde (ce que reçoit un joueur qui entre, chaque instantané, chaque
  sauvegarde du monde : 14 sauvegardes, 3,5 Mo au plus par monde). Projection d'une grande île : 80 Ko
  (l'avancée) + 25 Ko (douze à quinze villageois) + 40 Ko (une île très exploitée) + une ferme d'avant migrée
  (I7f) ≈ 200 Ko. Le plafond garde une marge.
- **64 Ko** pour l'île hors de la ferme, dans cette partie (ce qui a été pris et quand cela revient, les chemins
  et les blocs posés dehors).
- Ce qui se tire de la graine n'est jamais envoyé, quelle que soit la taille de l'île.

### Ce que les mesures disent des fiches suivantes

- **I9a2 (l'horloge commune, faite : ci-dessus)** : un pas toutes les 5 s (réelles) joué comme une commande ferait une révision toutes
  les 5 s, donc un instantané (`INSTANTANE_TOUS` = 20) toutes les 100 s : ≈ 2,7 Mo écrits par heure passée en
  ligne pour une île de 75 Ko, 9 Mo à 256 Ko ; et le journal de rattrapage (`JOURNAL_GARDE` = 500 révisions) ne
  couvrirait plus que 40 minutes. Il faut un instantané au temps (ou des pas qui ne comptent pas comme des révisions).
- **I9b (les écarts du monde, faite : ci-dessus ; le contrôle par l'identifiant, sans le sol)** : les écarts sont petits (≤ 40 Ko pour une île très exploitée) ; ce qui coûte,
  c'est leur contrôle par le serveur : vérifier qu'un arbre existe hors de la ferme demande le sol de sa région,
  donc 0,4 à 0,5 s de contexte au réveil du monde, puis 12 ms par région. À trancher dans la fiche.
- **I9d (les villageois)** : la copie élaguée d'aujourd'hui (`elaguer`) retire `voisins`, qui porte maintenant les
  événements entre villageois (les visites du soir, les repas apportés : 5,7 Ko sur l'île avancée, `liens.js`) : un
  monde de l'île doit le garder. Les fêtes du village sont dans `vocations` (gardé).
- **I9f (mettre son île en ligne)** : `elaguer` est à refaire pour une île (garder `monde.pris`, les chemins posés,
  `voisins` ; le brouillard du propriétaire part dans son navigateur) ; le plafond se vérifie à la mise en
  ligne (aujourd'hui, la route accepte 2 Mo).
