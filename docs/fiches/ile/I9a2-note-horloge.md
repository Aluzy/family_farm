# I9a2 — Note de conception : l'horloge commune

> Statut : **validée par l'utilisateur le 14 novembre 2026** : les dix réponses proposées au § 9, telles quelles.
> Les chiffres viennent de prototypes jetables, sur le moteur réel et le Durable Object simulé (`node:sqlite`, comme `tests/test-monde.mjs`). Base : `chantier/ile` avec I9a (e47e900).

## La recommandation, en bref

- **Les pas se déduisent de l'heure du serveur ; ils ne sont pas des révisions du journal** (la voie b).
  Le monde a un compteur de pas dans sa partie (`horloge.pas`) ; chaque pas vaut **5 s d'horloge**
  (10 minutes de jeu), comme le rattrapage du solo. Avant de jouer une commande, le serveur rejoue les pas
  dus (`temps.pas { jusqua }`), **toujours pas à pas, jamais d'un bloc** ; la commande porte son numéro de
  pas ; chaque client fait de même chez lui. Rien n'est diffusé pour le temps qui passe.
- **Le déterminisme tient, à une condition** : le moteur ne donne *pas* le même état pour un pas de 60 s
  et pour 12 pas de 5 s (13 valeurs diffèrent au bout d'une minute) ; mais deux machines qui font les mêmes
  pas de 5 s, dans le même ordre, ont la même partie (vérifié : serveur, deux clients, un client arrivé au
  milieu et un serveur réveillé à froid ont la même empreinte). Le pas de 5 s est donc une **constante du
  protocole**, et une commande se joue toujours *entre* deux pas.
- **Le coût est petit** : par heure en ligne, 720 pas, ≈ 3 s de calcul pour le serveur (0,1 %), 0,4 Mo
  écrits pour l'île avancée (1,3 Mo au plafond de 256 Ko), 6 réveils d'alarme, et presque rien de diffusé.
  La voie a (un pas = une révision) écrit 7 fois plus, réveille le serveur 720 fois par heure, et réduit le
  journal de rattrapage à 42 minutes, ou 18 minutes à quatre joueurs actifs.
- **La nuit** vient seule à 22 h, dans un pas ; quand tous les joueurs connectés sont couchés, les pas de
  nuit défilent dix fois plus vite (la cadence du sommeil) ; l'énergie devient **celle de chaque joueur**,
  rangée par compte dans la partie du monde.
- **Sans joueur, le monde dort** : le dernier qui part arrête l'horloge (un instantané) ; le premier qui
  revient la relance là où elle s'était arrêtée ; la fenêtre « Jeu en ligne » le dit.

Le reste de la note donne les mesures, les raisons et les questions à trancher (en fin de note).

---

## 1. Comment le serveur fait avancer le temps

### Les unités

- Une heure de jeu dure 30 s réelles (`TEMPS.SECONDES_PAR_HEURE`) ; la journée (6 h → 22 h) 8 minutes, la
  nuit (22 h → 6 h) 4 minutes, ou 24 s si l'on dort (`SECONDES_PAR_HEURE_SOMMEIL` = 3).
- Un **pas** = 5 s d'horloge (`HORS_LIGNE.PAS_S`, le pas du rattrapage du solo) = 10 minutes de jeu.
  Une journée entière = 144 pas = 12 minutes réelles.
- **Une heure passée en ligne** (3 600 s réelles) = 720 pas = 5 journées de jeu ; 1 021 pas (≈ 7 journées)
  si tous les joueurs se couchent chaque nuit.

Dans toute la note, « par heure » veut dire **par heure réelle passée en ligne**.

### Les voies comparées

- **(a) un pas par commande.** Une alarme du Durable Object toutes les 5 s joue `temps.pas` au nom du monde :
  une révision du journal, diffusée à tous, rejouée par chacun (comme `nuit.partagee` aujourd'hui).
  L'instantané reste aux 20 révisions (`MONDE.INSTANTANE_TOUS`), le journal aux 500 (`JOURNAL_GARDE`).
- **(a2) la même, réglée** : un pas reste une révision, mais l'instantané se fait toutes les 120 pas (10 min)
  ou tous les 20 gestes de joueur, et le journal garde 1 500 révisions (2 h de pas).
- **(b) des pas déduits de l'heure.** Les pas ne sont pas des révisions. Le serveur garde une ancre
  (`{ pas, reel }` : le dernier pas joué et son heure réelle) ; quand une commande arrive, il rejoue les pas
  dus jusqu'à l'heure réelle, puis joue la commande, qui prend la révision suivante **et le numéro de pas**
  (`evt.cmd.pas`). Chaque client, à chaque événement, avance sa partie confirmée jusqu'à ce pas, puis joue la
  commande. Entre deux événements, chaque client avance sa partie locale lui-même, d'après l'heure du
  serveur. Un instantané au temps (toutes les 120 pas), posé par une alarme toutes les 10 minutes, et au
  départ du dernier joueur ; il garde le pas.

### Les mesures

Prototype `cout.mjs` (scratchpad) : l'île avancée d'I9a refaite (graine 1, joueur automatique « applique »,
80 nuits, **jour 81, sept villageois, 78,8 Ko** pour la copie du monde ; le moteur a un peu bougé depuis les
74,7 Ko d'I9a), et la même partie lestée à 256 Ko (le plafond, `VILLAGE.EN_LIGNE`). Une heure simulée, l'heure
réelle du serveur fournie au registre (`MondeRegistre`, base `node:sqlite`). Octets écrits : ce qui part dans
les `INSERT` et `UPDATE` (journal, instantanés, méta). Octets diffusés : chaque message × le nombre de joueurs.
Calcul : le temps mesuré sur cette machine (Node, V8), stockage compris.

**Le temps seul (aucun geste de joueur), par heure :**

| Voie | Pas | Révisions | Diffusé (1 / 4 joueurs) | Écrit, île 79 Ko | Écrit, plafond 256 Ko | Instantanés | Réveils d'alarme | Calcul serveur | Le journal couvre |
|---|---|---|---|---|---|---|---|---|---|
| a | 720 | 720 | 67 Ko / 269 Ko | **2,9 Mo** | **9,3 Mo** | 36 | **720** | 2,7 à 4,0 s | **42 min** |
| a2 | 720 | 720 | 67 Ko / 269 Ko | 0,53 Mo | 1,6 Mo | 6 | 720 | 2,8 à 3,4 s | 2 h |
| **b** | 720 | **0** | 3 Ko / 12 Ko | **0,39 Mo** | **1,3 Mo** | 6 | **6** | 2,4 à 3,0 s | inchangé (500 gestes) |

(b : un battement d'heure de 48 octets diffusé toutes les 60 s, pour le recalage ; on peut s'en passer.)

**Avec des joueurs actifs** (4 gestes par minute chacun, hors Construire), par heure :

| Voie | Écrit, 1 joueur (79 Ko / 256 Ko) | Écrit, 4 joueurs (79 Ko / 256 Ko) | Diffusé (1 / 4) | Le journal couvre (1 / 4) |
|---|---|---|---|---|
| a | 3,8 / 12,4 Mo | 6,7 / 21,5 Mo | 95 Ko / 719 Ko | 31 min / **18 min** |
| a2 | 1,0 / 3,2 Mo | 3,8 / 12,2 Mo | 95 Ko / 722 Ko | > 60 min / 55 min |
| b | 1,4 / 4,4 Mo | 4,2 / 13,5 Mo | 33 Ko / 498 Ko | > 60 min / 32 min |
| **b, instantané aux 200 gestes** | **0,50 / 1,6 Mo** | **0,82 / 2,4 Mo** | 33 Ko / 498 Ko | > 60 min / 41 min |

Ce que disent ces chiffres :

- **L'horloge seule coûte peu en voie b** : 6 instantanés par heure, aucun journal. En voie a, ce sont les
  instantanés aux 20 révisions qui pèsent (36 par heure), et le journal qui fond.
- **Le gros des écritures, avec des joueurs, vient de leurs gestes, pas de l'horloge** : un instantané tous
  les 20 gestes, c'est 48 instantanés par heure à quatre joueurs actifs, quelle que soit la voie (c'est déjà
  le cas aujourd'hui). Le réglage qui compte est donc **l'instantané au temps (10 min) ou aux 200 gestes**,
  pas aux 20 : il divise les écritures par 3 à 5,5 (dernière ligne). Le journal garde ses 500 gestes.
- **Le calcul est le même dans toutes les voies** (les mêmes pas sont joués) : ≈ 3 s par heure. La voie b le
  fait par paquets (avant un geste, ou à l'alarme) : le plus gros mesuré est de 45 ms, hors la toute première nuit à froid (≈ 150 ms) ; le pire cas est
  un réveil à froid, ≤ 120 pas (≈ 0,75 s), bien sous la limite de calcul d'une requête.
- **Les réveils** : 720 alarmes par heure en voie a, autant de requêtes, et le Durable Object ne s'endort
  jamais. En voie b, 6 alarmes par heure : entre deux gestes, l'objet peut hiberner (ses WebSockets restent
  ouvertes ; tant que quelqu'un marche, les positions relayées le tiennent éveillé de toute façon).
- **Les nuits accélérées** (tous couchés) : 1 021 pas par heure au lieu de 720, mais un pas de nuit ne coûte
  que 0,4 ms : le calcul ne bouge presque pas (b : 1,6 Mo écrits au lieu de 1,4 pour un joueur actif).

### Le prix d'un pas (`client.mjs`, `profil.mjs`)

| Pas | Moyenne | p99 | Max |
|---|---|---|---|
| de jour (6 h → 22 h) | 6,3 ms | 16 ms | 20 ms |
| de nuit | 0,4 ms | 1,0 ms | 1,3 ms |
| de minuit (la nuit se calcule : `runNight`) | 17 à 21 ms | 35 ms | 35 ms (la toute première, à froid : 124 à 148 ms) |

Dans un pas de jour, **`avancerTaches` (les tâches des villageois, I3c) prend 6,4 ms** sur sept villageois ;
les flux d'énergie 0,1 ms, les achats à l'étal 0,9 ms, les commerces 0,3 ms, le reste presque rien. C'est le
point à surveiller avec quinze villageois (I9d).

### Pourquoi la voie b

1. **Le journal reste un journal de gestes.** Le rattrapage (500 révisions), le journal du propriétaire (📜),
   les sauvegardes et la restauration gardent leur sens ; en voie a, 720 lignes « le monde a avancé » par heure
   noient le journal et font fondre le rattrapage.
2. **Écrire 7 fois moins, réveiller 120 fois moins** pour la même partie.
3. **Un affichage fluide** : chaque client avance sa partie au rythme de l'heure du serveur, sans attendre un
   message toutes les 5 s (un retard du réseau ne fige pas l'horloge à l'écran) ; en voie a, chaque pas est un
   événement d'un « autre », qui refait la partie locale (clone, 1 à 2 ms) et la page entière toutes les 5 s.
4. **Le même travail pour tous** : le serveur et chaque client jouent les mêmes pas avec le même moteur ; le
   coût de calcul ne change pas d'une voie à l'autre.

Ce qu'elle coûte : un peu plus de code (le pas sur chaque événement, l'avance paresseuse au serveur, au
réveil du Durable Object et chez le client). La voie a2 serait le repli si la b se révélait trop fine à tenir :
même partie, mêmes tests, mais 720 réveils par heure et un journal de pas.

### Le pas plus long ?

Non : 3 s de calcul par heure, rien de diffusé, c'est déjà peu. Un pas plus long (30 s) diviserait le calcul
par 6 mais grossirait le grain du jeu (les lots du Moulin, l'énergie en blocs, une plante qui pousse à la
demi-heure près). Le pas de 5 s est aussi celui du rattrapage du solo : en ligne et hors ligne, le temps passe
de la même façon.

---

## 2. Le déterminisme

Prototypes `determinisme.mjs` et `synchro-b.mjs`. Résultats :

| Essai | Résultat |
|---|---|
| `farmStep` : 1 pas de 60 s contre 12 pas de 5 s, depuis 6 h | **différent** : 13 valeurs |
| le même depuis 18 h 50 (le soleil se couche à 19 h) | **différent** : 19 valeurs |
| une journée entière : 144 pas de 5 s contre 12 pas de 60 s | **différent** : plus de 25 valeurs (d'autres parcelles semées, d'autres graines, l'ordre des ventes à l'étal) |
| `tick` : 25 pas de 200 ms (le jeu ouvert) contre 1 pas de 5 s | identique sur cet essai (pas garanti) |
| 720 pas de 5 s, deux fois (serveur et client) | **identique** |
| 300 pas, la partie passée par JSON, puis 420 pas (un client qui arrive) | **identique** |
| voie b de bout en bout : serveur, deux clients, un troisième arrivé au milieu, le serveur évincé puis réveillé à froid ; 160 gestes de deux joueurs (pompe, arrosage, récolte) sur 527 pas | **même empreinte partout** |
| voie a de bout en bout, avec la vraie `Synchro` (`js/ui/synchro.js`) | **même empreinte partout** (confirmées et locales) |

**Où un gros pas diverge** :

- **les flux d'énergie** (`flowStep`) : dans un pas, la production remplit la batterie, puis les appareils
  tirent ; en un bloc de 60 s, l'énergie perdue (batterie pleine), la pompe, le frigo alimenté ou non, le
  délestage tombent autrement ; le prorata du soleil à 19 h aussi ;
- **le Moulin** (`runElectricStation`) : les lots enchaînés dans un même pas, et le temps qui reste au lot suivant ;
- **les compteurs** qui suivent (l'XP, `objectifs.faits.moudre`, l'heure d'irrigation) ;
- **les villageois** (`avancerTaches`) : ils font, à chaque appel, ce que l'heure leur doit ; un pas plus gros
  change l'ordre de leurs actions (quelle parcelle, quelle vente).

**Ce que ça impose** :

1. **Le pas est une constante du protocole** (5 000 ms d'horloge, dans les données : par exemple
   `VILLAGE.EN_LIGNE.PAS_MS`), la même pour le serveur et chaque client (la version du jeu est déjà vérifiée à
   l'entrée).
2. **Un intervalle se rejoue toujours pas à pas** : `temps.pas { jusqua }` veut dire « jusqu'au pas n° jusqua »,
   jamais « un bloc de N secondes ».
3. **Une commande se joue entre deux pas**, jamais au milieu : elle ne coupe pas un pas (un essai 12 × 5 s + 3 s
   + 2 s a donné le même état que 13 × 5 s, mais rien ne le garantit).
4. **Le pas ne lit que la partie** : ni horloge, ni hasard, ni réglage de la page. Tout ce que les veilleurs de
   la page font aujourd'hui dans la partie (la nuit à 22 h, le réveil, le bac, l'arrivée d'un villageois…) passe
   dans le pas (§ 6), et ces veilleurs se taisent en ligne : sinon la partie locale s'écarte de la confirmée.
5. **Un garde-fou** : le serveur joint l'empreinte de contrôle (`empreintePartie`, 9 à 10 ms) à son instantané
   des 10 minutes ; un client qui ne la retrouve pas redemande la partie entière. (Le moteur n'utilise qu'une
   fonction mathématique dont l'arrondi peut varier d'un navigateur à l'autre dans le chemin du pas :
   `Math.hypot`, la tournée du robot, `automation.js` ; à remplacer par un calcul exact, ou à vérifier.)

---

## 3. L'affichage : l'heure entre deux pas, et le recalage

- **À l'entrée**, `bienvenue` donne `horloge: { pas, reel, cadence }` et l'heure du serveur ; le client en tire
  son décalage (heure du serveur − la sienne, corrigé de la moitié de l'aller-retour).
- **Chaque client avance sa partie locale lui-même** : quand l'heure du serveur estimée passe la fin du pas
  courant, il joue le pas suivant (6 ms). Sa partie confirmée n'avance qu'aux événements (jusqu'à leur pas).
- **Entre deux pas**, l'horloge et la lumière s'interpolent : l'heure affichée = celle du pas + la fraction du pas
  écoulée (au plus 10 minutes de jeu), comme le solo dessine `clockHours` sans à-coups. Les villageois se placent
  d'après cette heure interpolée (I9d).
- **Le recalage** : chaque événement porte son pas et l'heure du serveur ; un battement léger (48 octets) peut
  suivre toutes les minutes. Si le client est en avance (il a joué un pas que le serveur n'avait pas encore
  joué quand une commande est arrivée), il refait sa partie locale depuis la confirmée (clone 1 à 2 ms) et
  rejoue les pas ; s'il a plus d'un pas de retard, il les rattrape d'un coup. L'état fait foi, l'affichage suit.
- **Un client en retard** (onglet caché, reconnexion) : rattraper une heure, c'est 720 pas (2,7 s mesurées ici,
  plus sur un téléphone). Règle : au-delà de **60 pas de retard** (5 minutes), le serveur envoie la partie entière
  (0,5 à 0,9 ms à lire) plutôt que le journal.

---

## 4. La nuit

- **Elle vient seule.** Le pas qui atteint 22 h lance la nuit (`startNight`, ce que fait aujourd'hui le
  veilleur `watchDay` de la page) ; à minuit, `runNight` (17 à 21 ms) ; à 6 h, le réveil. Vérifié par le
  prototype (`heures.mjs`) : la nuit au pas 96 (22 h), le jour suivant au pas 108 (minuit), le réveil au pas 144.
  Plus de `nuit.partagee` pour une île : la nuit d'un monde de l'île est celle du solo.
- **La cadence du sommeil.** « 🛏 Se coucher » reste dans le bandeau, avec « 1/2 couchés ». Quand **tous les
  joueurs connectés** sont couchés, le serveur joue `temps.sommeil { oui: true }` (au nom du monde : une révision,
  avec son pas) ; dès lors, **pendant la nuit**, un pas dure 0,5 s réelle au lieu de 5 s (×10, la cadence du solo
  endormi) : 8 heures de nuit en 24 s. Un joueur qui se lève, part ou arrive debout : `temps.sommeil { oui: false }`.
  Au réveil, la cadence revient seule (le drapeau tombe dans le pas du réveil). La cadence ne change que *quand*
  les pas viennent, jamais *ce qu'ils font* : elle ne touche pas au déterminisme.
- **Se coucher à 22 h** : comme en solo (on ne dort que la nuit) ; un joueur couché plus tôt attend la nuit, et
  l'accélération commence à 22 h si tous le sont.
- **Ce qui disparaît de la nuit partagée d'aujourd'hui** : `nuitPartagee` faisait d'un coup la journée des
  machines (`distribuerGrain(state, false)`, `chainesDeLaJournee`) parce que l'horloge était figée (E-13). Une
  île n'en a plus besoin (elles tournent dans les pas) : les garder doublerait leur production. De même, la
  botteleuse n'a plus à sortir sa botte au versement (E-13 : `js/ui/atelier.js`). Ces règles restent pour les
  mondes d'avant, jusqu'à leur migration (I9f).
- **L'énergie de chacun** (§ 13 de `docs/monde-partage.md`) :
  - elle sort du coffre commun (F.1) et devient **`energies: { <compte>: mWh }`** dans la partie du monde : le
    serveur la vérifie (un geste coûte de l'énergie : `spendEnergy`), elle ne peut donc pas vivre dans le seul
    navigateur ;
  - le moteur lit `state.energie` à une centaine d'endroits : plutôt que de les changer, `executerCommande`
    reçoit l'acteur (le serveur le connaît : `evt.acteur`) et **pose son énergie dans `state.energie` le temps
    de la commande**, puis la range ; chaque client fait de même, et montre la sienne ;
  - **la nuit la rend à tous les membres**, couchés ou non, présents ou non : c'est la règle d'aujourd'hui
    (`PENALITES.NUIT_SANS_DORMIR` coupée, B-1 : le prototype passe de 20 000 à 135 000 sans « Dormir ») ;
    `recoverInSleep` tourne pour chaque compte ;
  - un nouveau membre commence avec l'énergie pleine ; à la mise en ligne, celle du propriétaire est celle de sa
    partie (I9f).

---

## 5. Les arrivées et les départs

- **Le premier qui arrive réveille le monde** : l'ancre devient `{ pas, reel: maintenant }`, le monde se remet à
  avancer à partir de son pas ; **aucun rattrapage** du temps passé sans personne.
- **Le dernier qui part l'endort** (`webSocketClose` sans autre connexion) : le serveur joue les pas dus, fait un
  instantané (avec son pas), marque `horloge.actif = false`, et n'a plus d'alarme. Rien ne tourne, rien ne coûte.
- **Une connexion compte comme une présence** (pas de détection d'inactivité en v1) : un onglet ouvert fait
  tourner le monde. Sur un téléphone, la connexion se ferme d'elle-même quand le jeu passe en arrière-plan.
- **La fenêtre « Jeu en ligne »** (et le bandeau à l'entrée) le dit :
  - en permanence : « 🕰️ Le temps de ce monde passe quand au moins un joueur y est. Sans personne, il dort. » ;
  - au retour, si le monde dormait : « 🌙 Le monde dormait depuis <durée> : il reprend où il s'était arrêté
    (jour <n>, <heure>). » (`bienvenue` donne la date du dernier départ).
- Un joueur qui arrive pendant une nuit accélérée arrive debout : la cadence repasse à ×1 jusqu'à ce qu'il se
  couche.

---

## 6. Ce qui tourne à l'heure (vérifié dans le moteur)

| Ce qui tourne | Aujourd'hui, en solo | Dans le pas du monde |
|---|---|---|
| Le panneau, la batterie, la pompe, le frigo | `flowStep` (par la durée) | ✓ déjà (`farmStep`) |
| Le Moulin (les ateliers électriques) | `runElectricStation` (par la durée, avec l'énergie) | ✓ déjà |
| Les chaînes | `runChaines` (consommateur) | ✓ déjà ; **retirer** `chainesDeLaJournee` de la nuit d'une île |
| Le Four, la Cuisine (les préparations) | `runCooking` (par la durée) | ✓ déjà : une soupe lancée à 6 h est prête à 6 h 30 (prototype) ; ce qui cuit encore à minuit finit à minuit (`finishPreparations`), comme en solo |
| La pousse des plantes | `growDue` (l'horloge absolue, jour et nuit) | ✓ déjà |
| Le robot, les asperseurs, le distributeur, l'averse, les repas de la famille | `farmStep` (horloge) | ✓ déjà ; **retirer** `distribuerGrain(state, false)` de la nuit d'une île |
| Les tâches des villageois, l'étal, les commerces | `farmStep` (I3c, I4, I5a) | ✓ déjà (6,4 ms : I9d) |
| La nuit à 22 h, le réveil | **la page** (`watchDay`, `wakeUp`) | **à ajouter** (`startNight`, `state.reveil`) |
| Le passage du bac, les contrats | **la page** (`watchBac` : `avancerBac`, `avancerContrats`), la nuit | **à ajouter** : le bac du prototype accoste à 9 h |
| Les heures du port | lues de l'heure (`portOuvert`) | ✓ (le serveur est au pas de la commande) |
| L'arrivée d'un villageois, d'un enfant ; les maisons | **la page** (`watchVillageois` : `arriverVillageois`, `arriverEnfant`, `verifierMaisons`) | **à ajouter** |
| L'arrivée notée dans la chronique | **la page** (`assurerArrivee`) | **à ajouter** |
| Le lieu du port posé | **la page** (`watchPort` : `poserPort`) | une fois, à la mise en ligne (I9f) |

Ce que la page fait encore au fil de l'eau et qui n'écrit que des annonces (les toasts, les fenêtres du matin)
reste à la page ; elle les tire de la partie locale.

---

## 7. Les risques

| Risque | Ce qu'on fait |
|---|---|
| Un écart de déterminisme (un veilleur de la page qui écrit dans la partie en ligne ; une fonction mathématique d'un autre navigateur) | Tout ce qui écrit au fil du temps passe dans le pas ; les veilleurs se taisent en ligne ; l'empreinte jointe à l'instantané des 10 minutes, et la partie entière redemandée si elle diffère |
| Le coût d'un pas grossit avec le village (6,4 ms pour sept villageois, dans les tâches) | Mesuré par I9d avec quinze ; s'il le faut, étaler les villageois sur les pas (le même résultat pour tous) |
| Un client lent (téléphone) qui rattrape beaucoup de pas | La partie entière au-delà de 60 pas de retard |
| Le réveil à froid du Durable Object (après hibernation) : rejouer les pas depuis l'instantané | Instantané toutes les 10 minutes : ≤ 120 pas (≈ 0,75 s ; 178 ms mesurées) |
| Les sauvegardes E-12 « après chaque nuit » : 5 nuits par heure, 14 sauvegardes = moins de 3 heures d'histoire | Une sauvegarde par heure réelle de jeu, et au départ du dernier joueur (question 8) |
| Construire fige l'horloge en solo ; en ligne, les autres jouent | En ligne, Construire ne fige pas l'heure (question 6) |
| Les horloges des appareils qui dérivent | L'heure du serveur fait foi ; le décalage est recalculé à chaque événement |
| Un monde d'avant (une ferme, horloge figée) | Rien ne change pour lui (`ilePartagee` faux) jusqu'à sa migration (I9f) |
| Les tests longs (une heure = 720 pas ≈ 4,5 s) | Les tests jouent une journée (144 pas ≈ 1 s) ; l'heure entière dans un seul test |

---

## 8. Le plan d'implémentation (après validation)

1. **Le moteur** (`js/engine/temps-monde.js`, nouveau) :
   - `pasDuMonde(state)` : `farmStep` (comme `tick`), `refreshUnlocks`, `chapitresAuPas`, puis ce que font les
     veilleurs (la nuit à 22 h, le réveil, `avancerBac` et `avancerContrats`, les arrivées, `assurerArrivee`) ;
     `avancerJusqua(state, pas)` ; `state.horloge = { pas, sommeil }` ;
   - les énergies par compte (`state.energies`), `executerCommande(state, cmd, { acteur })`, la nuit qui les rend
     toutes ; la nuit d'une île sans `chainesDeLaJournee` ni `distribuerGrain(state, false)` ;
   - le format de sauvegarde 104 (la migration : `horloge`, `energies` d'après `energie`) ;
   - tests : le même état après N pas joués deux fois, avec un passage par JSON au milieu ; un pas de 60 s ≠ 12 de
     5 s (pour garder la raison écrite) ; la nuit qui vient à 22 h ; une soupe prête à son heure ; le bac à 9 h ;
     l'énergie de deux joueurs, chacun la sienne, rendue la nuit.
2. **Le serveur** (`worker/src/monde.mjs`) :
   - l'ancre `horloge` (méta), `avancer(t)` avant chaque commande, le pas sur chaque événement et dans le journal ;
   - `charger()` rejoue les pas entre les lignes du journal, puis jusqu'à l'ancre ;
   - l'instantané au temps (120 pas, une alarme) ou aux 200 gestes, et au départ du dernier ; l'empreinte jointe ;
   - `temps.sommeil` (au lieu de `nuit.partagee`) depuis `lits()` ; l'arrivée et le départ (l'ancre, `actif`) ;
   - `accueil` : l'horloge et la date du dernier départ ; la partie entière au-delà de 60 pas de retard ;
   - les sauvegardes : une par heure de jeu, et au départ du dernier ;
   - tests (`tests/test-monde.mjs`) : l'horloge s'arrête sans joueur et reprend sans rattrapage ; la nuit accélérée
     quand tous dorment, à son pas quand un seul dort ; une préparation finie à son heure ; un serveur réveillé à
     froid retrouve la même empreinte ; les mondes d'avant gardent F.2.
3. **Le client** (`js/ui/synchro.js`, `js/ui/en-ligne.js`, `js/ui/loop.js`) :
   - la confirmée avance jusqu'au pas de chaque événement ; la locale avance à l'heure du serveur ; la locale refaite
     quand un événement tombe sur un pas qu'elle a dépassé ;
   - la boucle en ligne : plus de gel de l'horloge pour une île (`accumulatorMs = 0`), l'interpolation de l'heure ;
     les veilleurs qui écrivent dans la partie se taisent ;
   - le bandeau et la fenêtre « Jeu en ligne » : l'heure du monde, « 1/2 couchés », le monde qui dormait ;
   - tests : `tests/test-synchro.mjs` (deux clients et le serveur au même état après une journée de pas ; un client
     en retard rattrape sans écart ; un client en avance se refait), `tests/deux-joueurs.mjs` (deux onglets : la même
     heure, le soir en même temps, une soupe lancée par l'un prête pour l'autre, les deux couchés → la nuit file,
     un seul couché → elle garde son pas).
4. **Les mesures refaites** sur le code (le script du coût, gardé dans `scripts/`), et les documents :
   `docs/monde-partage.md` (§ 13 : D13 au lieu de F.2, l'énergie de chacun), `worker/README.md`, `docs/ile.md`.

### Ce qui change dans les fiches suivantes

- **I9b (les écarts du monde)** : un geste dehors porte son pas comme les autres ; les repousses et les quotas du
  jour suivent la nuit qui vient dans les pas ; le serveur valide un geste au pas où il l'a reçu.
- **I9c (le port)** : le bac et les contrats sont dans le pas (chacun voit le bac accoster au même pas, calculé chez
  lui) ; les heures du port sont celles du pas de la commande ; plus besoin de diffuser l'arrivée du bac.
- **I9d (les villageois)** : leurs tâches sont l'essentiel du coût d'un pas (6,4 ms à sept) : mesurer à quinze ; leur
  position se calcule de l'heure interpolée (§ 3) ; les arrivées sont dans le pas ; sans joueur, le village dort.
- **I9e (les rôles)** : un visiteur compte pour la présence et pour les lits (il fait tourner le monde, il peut
  retenir la nuit) ; à confirmer.
- **I9f (la mise en ligne)** : la partie mise en ligne reçoit `horloge` et `energies` ; un monde d'avant migré passe de
  F.2 à l'horloge vivante (son jour et son heure gardés) ; la règle des instantanés et des sauvegardes ci-dessus.
- **I9g (les performances)** : le pas sur un téléphone de référence (et le rattrapage de 60 pas).

---

## 9. Les questions à valider

Pour chacune, la réponse que je propose.

1. **La voie** : les pas déduits de l'heure du serveur, hors du journal (b) ? → **Oui.** Repli : a2.
2. **Le pas** : 5 s d'horloge (10 minutes de jeu), constante du protocole, rejoué pas à pas ? → **Oui**, pas plus long.
3. **Les instantanés** : toutes les 10 minutes de jeu en ligne, ou tous les 200 gestes (au lieu de 20), et au
   départ du dernier joueur ; le journal garde 500 gestes ? → **Oui** (÷ 3 à 5 les écritures).
4. **Le sommeil** : la nuit défile ×10 quand tous les joueurs connectés sont couchés, à partir de 22 h ; un seul
   debout, elle garde son pas ? → **Oui**, comme la fiche.
5. **L'énergie** : celle de chaque joueur, rangée par compte dans la partie du monde, rendue la nuit à tous les
   membres (présents ou non, comme la règle sans pénalité d'aujourd'hui) ? → **Oui.**
6. **Construire en ligne** ne fige plus l'heure (les autres jouent) ? → **Oui.**
7. **Une préparation** finit à son heure ; celle qui cuit encore à minuit finit à minuit, comme en solo ? → **Oui.**
8. **Les sauvegardes du monde** (E-12) : une par heure réelle de jeu et au départ du dernier, 14 gardées (au lieu
   d'une par nuit, qui ne garderait que trois heures d'histoire) ? → **Oui.**
9. **La présence** : une connexion ouverte fait tourner le monde, sans détection d'inactivité en v1 ? → **Oui.**
10. **Les mondes d'avant** gardent F.2 (horloge figée, nuit partagée d'un coup) jusqu'à leur migration (I9f) ? → **Oui.**

---

## Annexe : les prototypes

Jetables, hors du dépôt (le scratchpad de la session, dossier `i9a2/`) : `commun.mjs` (le moteur, le Durable Object
sur `node:sqlite`, l'île avancée, le lest), `pas.mjs` (le pas proposé), `determinisme.mjs`, `synchro-b.mjs`,
`cout.mjs` (`--cmd`, `--dorment`, `--tous`), `client.mjs`, `profil.mjs`, `heures.mjs`, et leurs sorties
(`*.txt`). Les chiffres de calcul sont ceux d'une machine de bureau (Node, V8) ; un téléphone sera plus lent.
