# Le monde partagé : la ferme, et seulement la ferme

Ce document affine l'axe E de la stratégie (« Multijoueur coopératif et mondes persistants ») après les
lots E-0 à E-7. Il fixe **ce qu'est un monde partagé** : la zone de la ferme. Le reste du grand monde
reste à la partie solo de son propriétaire.

État au 5 novembre 2026. Sont déjà en ligne : le compte, la mise en ligne de sa ferme, les invitations et
le retrait d'un membre, l'avatar des autres joueurs, Construire, le potager, les bêtes, la cuisine et la
nuit partagée. **E-8 a posé la frontière** : M.1, M.2 et M.3 ci-dessous sont faits (§ 7). Le code est dans `worker/src/monde.mjs`, `js/ui/en-ligne.js` et `js/engine/commandes.js`.

## 1. Le principe

> **Un monde partagé, c'est ta ferme.** Tes amis viennent chez toi : ils construisent, cultivent,
> s'occupent des bêtes, cuisinent et dorment sous ton toit. Les routes, les hameaux, la mine et le
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
| L'énergie de la ferme | `panneaux`, `batteries`, `pompe`, `reservoir`, `robot` | ⏳ (avec E-9) |
| La famille du propriétaire | `famille` : elle vit sur la ferme, mange et dort la nuit | ✅ présente, sans corvées seule (E-6) |

### Pas partagé : le grand monde (reste à la partie solo du propriétaire)

| Domaine | Dans la partie | En ligne |
|---|---|---|
| Les régions, leur sol, ce qu'on y prend | `monde.vues`, `monde.vu`, `monde.pris`, `monde.ici` | hors du monde partagé |
| Les hameaux et leurs habitants | `monde.hameaux`, `monde.habitants`, `projets` | hors du monde partagé |
| Les amitiés, les invitations à un repas, les plans | `amitie`, `invitations`, `plans`, `bienvenue` | hors du monde partagé |
| Le récit, le didacticiel, le courrier | `recit`, `didacticiel`, `courrier`, `campagne` | figés (ni lus ni changés en ligne) |
| La calèche, le cheval, les excursions (mine, grottes) | `caleche`, `cheval`, `bivouac`, `jeu.html?carte=…` | hors du monde partagé |

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
