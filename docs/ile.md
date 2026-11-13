# L'île à bâtir — le plan du chantier

Ce document fait foi pour le chantier « l'île à bâtir » (novembre 2026). Il remplace, quand il sera
fini, ce que `docs/grand-monde.md` dit des hameaux, des habitants et de la calèche, et tout
`docs/recit/`. Les fiches sont dans [`docs/fiches/ile/`](fiches/ile/README.md).

## Le jeu visé

On arrive sur une île vierge, seul ou en famille. Il n'y a qu'un **abri** sur la terre de la ferme et
un **port** au bout de l'île, reliés par un chemin. Tout le reste est à bâtir.

1. On ramasse, on fabrique, on bâtit, on cultive.
2. On porte ce qu'on a en trop au **port**, la seule interface économique : on y vend sans limite (le
   bac emporte tout), on y achète des graines et de nouvelles espèces, on y honore les commandes du bac.
3. Un **villageois** débarque. On lui bâtit une maison, on lui attribue des tâches, on se lie d'amitié.
4. La ferme grossit, d'autres villageois arrivent, se lient entre eux, ouvrent des **commerces
   d'artisans** (forge, mercerie, scierie…).
5. L'île prend une **vocation** : un village convivial (fêtes, projets, repas), ou une ferme
   productive et automatisée. Une troisième vocation viendra.

Il n'y a pas de récit écrit : pas de personnages, de courrier, de scènes ni de fins. Le joueur nomme
son île et son village ; une chronique note ce qui s'y passe.

## Les décisions validées

| # | Décision | Conséquence |
|---|---|---|
| D1 | Le port remplace la calèche et les hameaux. | `caleche.js`, `caleche-tournee.js`, `monde-hameaux.js`, `ile.js` sortent du jeu ; `market.js` reste. |
| D2 | Le récit est retiré. | `recit.js`, `data/recit.json`, le courrier, les secrets du récit, `docs/recit/` ; 37 fichiers du jeu et 29 de tests y font référence. |
| D3 | Les villageois vivent sur la terre du joueur, travaillent pour lui, ont une vie simple (repas, lit, bourse) et une vie sociale entre eux. | `habitants.js` devient le moteur des villageois ; `voisins.js` celui de leurs liens. |
| D4 | Un tableau suit ce que chaque villageois coûte et produit par jour. | Journal de 7 jours par villageois, lu par une nouvelle fenêtre. |
| D5 | Les commerces restent artisanaux : un établi, un artisan, peu de pièces par jour, pas d'électricité. | Le volume est réservé à la vocation productive (chaînes, robot). |
| D6 | Des traits de personnalité, sans mimiques. | Les traits pèsent sur les horaires, les phrases, les postes préférés et les affinités. |
| D7 | C'est le jeu par défaut, avec migration des parties en cours. | Pas de mode à côté. Le chantier avance derrière un réglage (`VILLAGE.ACTIF`), basculé à la fin. |
| D8 | Le tronçon de chemin qui sort de la ferme reste ; les boucles vers les anciens hameaux sont retirées ; le joueur modifie le chemin. | Le chemin généré devient des blocs de chemin que le joueur possède, posés et retirés hors de la ferme aussi. |
| D9 | En ligne, le monde partagé est l'île entière du joueur : les invités y co-construisent et y produisent. | La frontière E-8 de `docs/monde-partage.md` est levée ; la synchronisation est à optimiser. |
| D10 | Le grand monde reste (biomes, grottes, pêche, faune, brouillard) : on y récolte. | Rien ne change dans `monde-sol.js`, `monde-vegetation.js`, `monde-roches.js`, `monde-recolte.js`, `monde-faune.js`. |
| D11 | La vente au port n'est pas bornée : le bac emporte tout ce qu'on lui donne, il n'y a pas d'entrepôt. | La dépense longue repose sur les niveaux du port, les imports et la part des villageois (I1c). |
| D12 | Le villageois garde une part de ce qu'il produit ; une tâche demande son outil, que le joueur fabrique et lui donne ; deux villageois assez proches peuvent former un foyer si on leur bâtit une maison ; chaque biome a ses plants sauvages. | I4, I3c, I6b, I7e. |
| D13 | En ligne, l'horloge est commune et vivante. | Le serveur fait avancer le temps tant qu'un joueur est connecté (I9a2) ; F.2 est levée. |
| D14 | En ligne, la caisse est commune. | I9c. |
| D15 | C'est le joueur qui attribue les tâches. Un villageois ouvre un commerce quand il a une affinité suffisante avec le joueur, qu'il en manifeste l'envie et que le joueur le décide. | I5a ; en ligne, « le joueur » est lu comme le propriétaire de l'île (I9e, à confirmer). |

## Ce qui reste à trancher (dans les fiches qui le portent)

| Question | Fiche | Proposition par défaut |
|---|---|---|
| Comment le serveur fait avancer l'horloge commune, et à quel coût ? | I9a2 | Par pas de 5 s de jeu, tant qu'un joueur est connecté ; le monde dort sans joueur. |
| En ligne, qui est « le joueur » qui attribue les tâches et décide des commerces ? | I9e | Le propriétaire de l'île, qui peut déléguer les tâches aux bâtisseurs. |
| L'argent s'empile-t-il encore, la vente n'étant pas bornée ? | I1c, I4 | I1c : non, sur 80 nuits de simulation (le port en prend 6 800 pièces, 814 en caisse à la nuit 80) ; à revoir avec la part (I4) et quand le joueur simulé ira plus loin que le palier 6. |
| La part du villageois : fixe, ou selon l'amitié et le poste ? | I4 | Fixe au départ (un réglage), revue après simulation. |
| La raison d'explorer sans hameaux à découvrir. | I1c, I8b | Des espèces sauvages à rapporter et à cultiver ; des sites à exploiter. |

## Les constats d'où l'on part

Relevés dans le dépôt le 12 novembre 2026 (format de sauvegarde 86).

- **L'argent n'a pas de dépense récurrente.** Tout se vend sans limite à prix fixe ; les dépenses sont
  ponctuelles (arbre des technologies ≈ 19 000, énergie et eau ≈ 12 000, frigo ≈ 6 100, robot jusqu'à
  30 000) ; les pénalités sont coupées (`PENALITES`).
- **Les bourses des habitants ne servent à rien** : `caleche.js` et `ile.js` les remplissent, aucun
  code ne les dépense.
- **La transformation détruit de la valeur** hors cuisine : 2 laines (24) → 1 tissu (18) ; 3 tissus
  (54) + 20 de façon → un manteau (36) ; 2 bois (4) → 1 planche (4). Seul le lingot paie (minerai 2,
  lingot 15).
- **Un villageois rapporterait 2 à 7 fois ce qu'il mange** aux prix actuels (bétail ≈ 48 pièces par
  jour, mine ≈ 36, bois ≈ 32, pêche ≈ 32, cueillette ≈ 15, contre 7 à 11 de nourriture).
- **Le joueur automatique est périmé** : `node scripts/simulate.mjs` reste au chapitre 3, 71 nuits
  sans repas sur 80, une vérification en échec. *Remis d'aplomb par I0b* : la famille mange toutes les
  nuits, le chapitre 7 est atteint vers la nuit 42 (graine 1) ; et la simulation mesure maintenant
  **l'argent qui s'empile** : vers 22 000 pièces en caisse à la nuit 80, aucune dépense sur les 20
  dernières nuits, plus de 90 % des gains venant de la vente des cultures à la calèche (le constat de
  `simulate.mjs`, ses comptes par poste dans `simulation.csv`).

## Les lots

| Lot | Fiches | Ce qu'il apporte |
|---|---|---|
| 0. Le socle | I0a (fait), I0b (fait) | Le réglage de bascule, l'archive, un joueur automatique qui tient la route |
| 1. Le port | I1a (fait), I1b (fait), I1c (fait) | Le bâtiment, le commerce, le bac, les commandes et le catalogue d'import |
| 2. Le chemin | I2 (fait) | Le chemin de la ferme au port, modifiable ; porter la marchandise |
| 3. Les villageois | I3a (fait), I3b (fait), I3b+ (fait), I3c (fait), I3d (fait) | L'arrivée, la vie sur la ferme, la vie sociale, les tâches, le tableau |
| 4. Les prix | I4 | Des filières qui paient, la part du villageois, la bourse dépensée |
| 5. Les artisans | I5a, I5b, I5c | L'atelier et la boutique, la forge, la mercerie, les autres commerces |
| 6. Les liens | I6a (fait), I6b (fait), I6c | L'amitié avec le joueur, les liens entre villageois, les traits |
| 7. La page blanche | I7a (fait, sauf le joueur automatique), I7b à I7g | Les objectifs sans récit, le nouveau départ, le retrait du récit et des hameaux, la migration, la chronique |
| 8. Les vocations | I8a, I8b | Le village convivial, la ferme productive |
| 9. L'île en ligne et la bascule | I9a à I9h, I9a2 | L'île partagée, l'horloge commune, la synchronisation, les performances, la bascule |

## L'ordre et les dépendances

```
I0a ─┬─ I0b
     ├─ I1a ── I1b ── I1c
     │           └──── I2
     ├─ I3a ── I3b ── I3c ── I3d ── I4 ─┬─ I6a ── I6b ── I6c
     │                                  ├─ I5a (après I6a) ── I5b ── I5c
     │                                  └─ I8a, I8b
     └─ I7a ── I7b
I1b + I3a ──── I7c ─┬─ I7d ── I7e ─┬─ I7f
                    └─ I7g ────────┘
I7f ────────── I9a ── I9a2 ── I9b ── I9c ── I9d ── I9e ── I9f
tout ───────── I9g ── I9h (la bascule)
```

**Première version jouable** (derrière le réglage) : I0a, I0b, I1a, I1b, I1c, I3a, I3b, I3c, I3d, I4,
I7a, I7b. On arrive sur la terre vierge, on vend au port, un villageois s'installe et travaille, le
tableau donne ses coûts.

## Le réglage de bascule

`VILLAGE.ACTIF` (`data/village.json`, posé par I0a) vaut `false` tant que le chantier dure : le jeu
publié ne change pas. Chaque fiche écrit son code pour `ACTIF: true` et le teste ainsi ; les tests
d'avant restent verts avec `false`. I9h le passe à `true`, retire les branches mortes et le réglage
lui-même. Entre-temps, `?village=1` dans l'adresse du jeu l'allume pour un essai (I0a).

Ce qui est posé (I0a) :

- `villageActif(state)` (`js/engine/village.js`) : la seule question que pose le code du chantier ;
  elle rend `DATA.VILLAGE.ACTIF`, ou `true` pour une partie d'essai (`state.essais.village`).
- L'essai (`js/ui/village.js`) : avec `jeu.html?village=1`, l'écran d'accueil s'affiche et une nouvelle
  partie faite dans la page (l'accueil, « Recommencer à zéro », la première partie de l'appareil) devient
  une partie d'essai, qui le reste en se rechargeant ; une partie déjà enregistrée n'est pas touchée. Un
  bandeau discret, en bas à gauche, le dit (« 🏝️ Essai : l'île à bâtir »).
- Les tests : `tests/engine/village-*.test.mjs` forment leur propre suite, jouée en dernier, réglage
  forcé à `true` ; ailleurs, `avecVillage(fn)` (`tests/engine/aide.mjs`) l'allume le temps d'un test.
  `tests/engine/reglage-village.test.mjs` vérifie qu'éteint, une nouvelle partie est identique à celle
  d'avant le chantier.
- L'archive : le mainteneur la crée depuis `main`, avant la première fiche qui change le jeu publié
  (`git fetch origin main && git push origin origin/main:refs/heads/archive/jeu-avant-ile`).

## Les paliers de l'île (I7a)

Ce qui est posé (I7a) :

- Les sept chapitres deviennent sept **paliers de l'île** (`VILLAGE.PALIERS`, `data/village.json` ;
  `js/engine/paliers.js`) : un titre, une icône, des objectifs, une récompense, aucun texte à lire.
  S'installer ; la première vente au port ; le premier villageois ; les bêtes ; trois villageois au
  travail ; le premier commerce ; un village de dix. La mécanique reste celle de `campaign.js` : le palier
  n tient la place du chapitre n (mêmes points de technologie, même XP, mêmes paliers de l'arbre ; les
  plans et le décor du chapitre, et les graines de la serre que le courrier offrait).
- La partie : `state.palier` (1 à 7, la forme de `state.campagne.chapitre`, que `poserChapitre` tient
  égal) n'existe que dans une partie neuve faite le réglage allumé (ou rendue d'essai) : pas de nouveau
  format. Une partie d'avant garde ses chapitres même le réglage allumé, jusqu'à I7f. Les compteurs
  restent dans `state.campagne.compteurs`.
- Le réglage allumé : plus de courrier (ni lettres ni cartes postales) ; la semaine des objectifs du
  jour est celle de `VILLAGE.OBJECTIFS.SEMAINE` (sans phrase d'ambiance, ni hameau ni calèche) et les
  objectifs tirés gagnent ceux du port et du village (`VILLAGE.OBJECTIFS.TIRES`).
- L'interface : la fenêtre des chapitres devient « L'île » (le palier en cours, ses objectifs cochés, la
  récompense, les paliers passés) ; un palier franchi donne une notification et sa récompense, pas
  d'écran à lire.
- **Ce que les fiches suivantes remplissent** (lu de façon défensive : un champ absent compte 0) :

| Objectif | Ce qu'il lit | Fiche |
|---|---|---|
| `ventesPort` | `state.campagne.compteurs.ventesPort` : les pièces gagnées au port (`bumpCounter(state, 'ventesPort', gain)`) | I1b |
| `portNiveau` | `state.port.niveau` | I1c |
| `villageois` | `state.villageois` : ceux qui ont une maison (`v.maison` non nul) | I3a |
| `taches` | `state.villageois` : ceux qui ont une tâche (`v.tache` non nul) | I3c |
| `commerces` | `state.commerces` (tableau ou objet) : ceux qui ne sont pas `ouvert: false` | I5a |
| `amitieVillageois` | `palierAmitie(state, v.id)` d'`amitie.js` (`state.amitie.pnj[v.id]`), au palier `palier` ou plus | I6a |

  Les objectifs du jour du chantier comptent `vendre` (une vente, I1b), `parler` (I3b, I6a),
  `cadeau_villageois` (I6a) et `commande_bac` (I1c) par `noterObjectif` ; ils paraissent quand
  `state.villageois` compte un villageois ou `state.port.commandes` une commande.
- Reste à faire : le joueur automatique suit les paliers (point 6, après I0b).

## Le commerce au port (I1b, fait)

Ce qui est posé (I1b) :

- **Le moteur** (`js/engine/port.js`) : `portOuvert(state, ou)` (le personnage à `PORT.PORTEE` = 3 cases au plus
  d'une case du comptoir, de `PORT.HEURES` = 6 h à 21 h, au niveau de l'élément `marche` comme la calèche avant) ;
  `vendreAuPort` et `acheterAuPort` passent par `market.js` (`sellItem`, `buyItem`, qui prennent maintenant le début
  de leur libellé) : mêmes prix, mêmes cours ; les Comptes disent « Port : … ». À l'achat, les semences (`isBuyable`)
  que le niveau a débloquées (`enVenteAuPort`) ; les produits des hameaux ne s'y vendent pas. Chaque vente fait
  `bumpCounter(state, 'ventesPort', gain)` ; l'objectif du jour `vendre` se note par l'XP de la vente. Les
  commandes `port.vendre` et `port.acheter` (`{ objet, quantite, case }`, `commandes.js`).
- **Le comptoir** : le lieu du port (sa case, le sens du quai) est posé dans le moteur par la page dès que le
  Worker a tiré les éléments (`poserPort`, `js/ui/port.js` `watchPort`), ou calculé d'après le plan dans Node
  (`portDuMonde`) ; ses cases viennent de `dispositionPort`. Le plan du port porte `comptoir` (ses cases) : un
  appui dessus (`js/carte/ferme/hameaux.js`) mène le personnage devant lui et ouvre la fenêtre.
- **La fenêtre** (`js/ui/port.js`) : la fenêtre du commerce (menu « Port » ⚓) devient celle du port le chantier
  allumé : Vendre et Acheter ; loin du port, elle dit où il est et ses heures, et propose d'y mener la boussole.
- **Avec `ACTIF`** : la calèche roule mais ne commerce plus (`CALECHE_AU_PORT` : vente, achat, malle et commandes
  refusés) ; un appui sur elle ou sur sa malle ouvre la fenêtre du port ; `marcheFerme` parle du port ; l'objectif
  de campagne `caleche` compte aussi `ventesPort` ; l'aide, l'écran des niveaux (`PORT.ELEMENT`) et le guide
  « Montre-moi » (`guide: "port"` dans `VILLAGE.OBJECTIFS`) parlent du port.
- **Le joueur automatique** (`bot.js`, `botSortiePort`) : une sortie par jour au plus, quand ce qu'il a à vendre
  vaut `SIMULATION.PORT.SEUIL` (60) pièces ou qu'il lui manque des graines ; la marche (le chemin du port, environ
  660 cases pour la graine 1, et la moitié de la ferme, à 3,6 cases par seconde) se compte en temps d'éveil, à
  l'aller et au retour. `node scripts/simulate.mjs --village` allume le réglage (le chapitre 7 et le dépannage n'y
  sont que des constats : les paliers demandent des villageois).
- **Les tests** : `tests/engine/village-commerce.test.mjs` (dont 25 nuits du joueur automatique, le réglage allumé).
- Reste : les prix (I4). (Le chemin du port et le portage : I2, plus bas ; le bac, les commandes et l'import : I1c, plus bas.)

## Le bac, les commandes et le catalogue d'import (I1c, fait)

Ce qui est posé (I1c ; les réglages : `PORT.BAC`, `PORT.COMMANDES`, `PORT.IMPORT`, `PORT.NIVEAUX[].prix` et
`.commandes`, data/village.json ; le moteur : `js/engine/bac.js`) :

- **La vente reste libre** (D11) : sous la halle, tout se vend, sans quota ni attente (I1b, I2). Ce qui a été vendu
  depuis le dernier départ du bac attend sur le quai (`state.port.vendu`, noté par `vendreCharge` et la tournée d'un
  villageois) : la scène le montre en caisses (une par `BAC.CAISSE` = 12 volumes, `CAISSES_MAX` = 4 au plus), qui
  partent avec lui. Ni entrepôt, ni place à gérer.
- **Le bac** : il accoste tous les `BAC.PERIODE` = 3 jours (les jours multiples de 3), de 9 h à 17 h
  (`BAC.HEURES`), le long des quatre dernières cases du quai, du côté opposé à la cale. Sa venue se déduit du jour :
  `avancerBac` (la page à chaque veille, la nuit, et chaque lecture du port) traite les passages qui ont eu lieu
  depuis le dernier traité (`state.port.passe`), `RATTRAPAGE` = 3 au plus (les plus récents : les imports attendus
  arrivent au premier), puis son départ (`state.port.parti`). C'est le seul bac du jeu : `villageois.js` lit
  `jourDeBac` et ses heures (`VILLAGE.ARRIVEE.PERIODE`, `HEURE` et `FIN` sont retirés). La scène
  (`js/carte/ferme/bac.js`, `model.bac` : `js/ui/port.js` `bacModele`) : il arrive du large en glissant
  (`BAC.ARRIVEE_S` = 7 s), se balance à quai, sa passerelle posée ; il repart vers le large, les caisses s'effacent
  avec lui ; la carte ouverte pendant qu'il est à quai, il y est d'un coup. La page sonne la cloche et dit son
  arrivée (ses commandes, ce qui est livré). Le calendrier marque ses jours (⛴️) et dit ses heures.
- **Les commandes** : à chaque passage, `NIVEAUX[niveau − 1].commandes` (2, 3, 3, 4, 5) demandes tirées de la graine
  et du jour du passage (`tirerCommandes`, sans toucher au hasard de la partie) parmi ce que le joueur sait produire
  (`savoirProduire` : les cultures récoltées, les plats préparés, les œufs, la laine et le lait de ses bêtes) : un
  objet, une quantité (de quoi valoir `COMMANDES.VALEUR` = 50, 90, 150, 230, 340 pièces selon le niveau, ± 30 %,
  entre 2 et 40), une prime (25 à 60 %, par pas de 5). Valables jusqu'au passage suivant ; on les honore au comptoir
  avec ce qu'on a porté (le portage, comme la vente) : le prix de vente (`encaisserVente` : son XP, le cours), plus
  la prime (« Prime du bac »), plus `COMMANDES.XP` = 15 XP ; l'objectif du jour `commande_bac` se note. Manquée,
  elle s'efface sans rien coûter (B-1).
- **Le catalogue d'import** (`IMPORT.RANGS`, un rang par niveau du port) : 1, les jeunes arbres (50 à 60 pièces) et
  les plants de vigne (30 les 4) ; 2, le cacao, la vanille, le café (par 2), le sucre et les épices (par 10) ; 3, une
  poule (60), un mouton (160), une vache (260) ; 4, les plans des meubles de collection (300 à 600) ; 5, les graines
  de fleurs rares (par 5). Ce que le niveau du joueur débloquait le reste (un jeune arbre : le Verger ; une culture :
  son déblocage ; une bête : son bâtiment et sa place) : le catalogue ajoute la condition du port, et ces objets ne
  s'achètent plus tout de suite au comptoir (`enVenteAuPort`). Une commande se paie d'avance (« Import : … ») et
  arrive à la ferme au passage suivant (`livrerImport` : à l'inventaire ; une bête à son bâtiment, son prix rendu
  s'il n'y a plus de place ; un plan appris). Les plants sauvages de l'île (I7e) s'y inscrivent par
  `inscrireSauvage(state, objet)`, au rang `SAUVAGES.RANG`, au prix de vente × `SAUVAGES.MARGE` %.
- **Les niveaux du port** (`NIVEAUX[k].prix`) : niveau 2, 1 800 pièces, 24 planches, 16 pierres ; 3, 5 000 pièces,
  40 planches, 30 pierres, 6 lingots de fer ; 4, 11 000 pièces, 60 planches, 40 pierres, 12 lingots de fer ; 5,
  24 000 pièces, 80 planches, 60 pierres, 20 lingots de fer, 10 lingots de cuivre (41 800 pièces en tout). Les
  matériaux s'apportent au chantier du port (`apporterAuChantier`, `state.port.chantier`), depuis ce qu'on a porté,
  en une ou plusieurs fois (les lingots, qui ne se vendent pas, se chargent pour le chantier :
  `materiauDuChantier`) ; puis on paie (`agrandirPort`, « Port agrandi »). Chaque niveau allonge le quai (8, 9, 10,
  11, 12 cases), ouvre un rang du catalogue, apporte plus de commandes par passage et accueille plus de villageois
  (`VILLAGE.ARRIVEE.PLAFOND`). Le monde de la partie est celui du niveau du port (`cadre.PORT`) : la page se
  recharge.
- **La fenêtre** (`js/ui/port.js`) : trois onglets de plus, Commandes du bac 📦 (le bac, son prochain passage, ses
  caisses ; les commandes, ce qui en est porté, la prime, « Honorer »), Import 🚢 (ce qui est attendu ; le catalogue
  par rang, chaque article avec son prix et, fermé, pourquoi) et Le port 🏗️ (son niveau ; le chantier du suivant : ce
  qui est apporté, ce qui manque, les pièces ; ce qu'il ouvre ; « Apporter au chantier », « Agrandir »). Les
  commandes du moteur : `port.honorer`, `port.importer`, `port.apporter`, `port.agrandir` (`commandes.js`).
- **Les dessins** (`scripts/carte/port_bac.py`, posés par `scripts/carte/port.py` dans la planche des hameaux, à la
  suite des sortes du port : `bac_port`, `passerelle_port`, `caisses_bac`) : le bac (vers le sud, 38 × 60 : 660
  couleurs ; vers l'est, 72 × 44 : 737), la passerelle (80 et 97), les caisses chargées (107, 167, 227).
- **La sauvegarde** : format 90, `state.port` (`niveau`, `passe`, `parti`, `commandes`, `honorees`, `imports`,
  `vendu`, `chantier`, `sauvages`, `avis`) ; il naît avec une partie neuve du chantier (ou une partie d'essai, ou au
  premier besoin, sans rattraper les bacs d'avant elle) ; la migration 89 → 90 répare un port abîmé et laisse une
  partie sans port telle quelle.
- **Le joueur automatique** (`bot.js`) : il honore les commandes (il charge d'abord ce qu'elles demandent, puis, au
  port, les honore avant de décharger), agrandit le port (l'étape `port` : au palier 4 le niveau 2, au palier 6 le
  niveau 3, à la fin du plan les niveaux 3 à 5 ; il économise pour lui, en charge les matériaux dès que ses pièces
  font `SIMULATION.PORT.CHANTIER` = la moitié du prix ; les planches qu'il n'a plus la force de fabriquer lui sont
  fournies, comptées) et achète ses jeunes arbres par l'import (commandés, plantés à leur livraison).
- **La simulation** (`node scripts/simulate.mjs --village`, 80 nuits, graine 1) : avant I1c, le palier 4 restait
  bloqué (« Agrandir le port ») de la nuit 22 à la fin. Après : le port au niveau 2 à la nuit 31, le palier 5 à la
  nuit 33 (35 pour le joueur minimal), le palier 6 à la nuit 45 (44) ; le niveau 3 à la nuit 75 ; le palier 6 attend
  un commerce ouvert (I5a) et l'amitié des villageois (I6a). Les pièces en caisse à la nuit 80 : 814 (joueur
  appliqué), 21 (minimal) ; avant I1c, 62 et 435 (le joueur dépensait tout en appareils). Les primes du bac :
  ≈ 1 050 pièces sur la partie (9 % des gains) ; le port : 6 800 pièces (64 % des dépenses du joueur appliqué). Sur
  les nuits 41 à 60, il économise pour le niveau 3 (net + 118 par jour, 2 747 en caisse à la nuit 60), puis le paie.
  Éteint, le CSV de la simulation est le même octet pour octet.
- **Les tests** : `tests/engine/village-bac.test.mjs` (les jours du bac ; la vente sans limite et les caisses ; les
  commandes tirées, honorées, manquées ; le catalogue, l'import payé d'avance et livré au passage suivant, la bête
  sans place, le plan ; le rattrapage après une absence, la nuit ; les niveaux ; la sauvegarde ; éteint, rien).
- Reste : la part des villageois et les prix (I4) ; les plants sauvages à cultiver (I7e, qui appellera
  `inscrireSauvage`) ; les contrats d'export en volume (I8b) ; le port en ligne (I9c) ; montrer le chantier du port
  sur la carte (des matériaux empilés) ; que la tournée d'un villageois honore les commandes.

## Le chemin du port, modifiable, et le portage (I2, fait)

Ce qui est posé (I2 ; les réglages : `VILLAGE.DEHORS`, `VILLAGE.CHEMIN`, `VILLAGE.PORTAGE`, data/village.json) :

- **Le chemin possédé** (`js/engine/dehors.js`) : dans une partie neuve du chantier, `state.dehors = { troncon, chemins }`.
  Le tronçon généré de la sortie de la ferme au port (`lieux.port.chemin`) devient des blocs de chemin du joueur :
  chaque case du tracé et un pinceau de `CHEMIN.PINCEAU` × `PINCEAU` cases (2 : la case, sa droite, le dessous ; à
  `PRES_FERME` cases de la ferme, trois de large, le raccord avec sa sortie ne bouge pas) ; une case de rivière reste un
  gué. La conversion se fait dans le Web Worker du sol (`monde-sol.js`, `tronconDuPort`), qui renvoie les cases avec
  « pret » ; la page les pose (`poserTroncon`) ; dans Node, `assurerTroncon` fait le même calcul. La forme gardée est
  compacte : des segments `[écart, longueur]` à plat (`encoderSegments`, une rangée de chemin = un segment). Mesures :
  le tronçon de la graine 1 fait 599 cases, 100 segments, 618 octets ; celui de la partie d'essai (graine 200364) 865
  cases, 210 segments, 1 234 octets. 600 cases de plus : en allée de deux de large, quelques octets ; posées une à une,
  chacune isolée (le pire : 687 segments), `state.dehors` fait 2 966 octets et la partie 7 809 (contre 5 461). Le seul
  tronçon de la graine 1 gardé une case par entrée, comme `state.sols`, ferait 10 783 octets. `troncon` : `a_poser` (partie neuve), `pose` (converti : le sol ne peint plus le tracé),
  `genere` (une partie d'avant : son tronçon généré reste peint tel quel jusqu'à I7f ; ce qu'on pose dehors s'y ajoute).
- **Le sol** : le contexte du sol reçoit les chemins possédés (`poserCheminsSol` à l'« init » du Worker,
  `majCheminsSol` puis le message « chemins » à chaque changement : les régions déjà faites qui les touchent sont
  refaites et repeintes, la carte du monde est redemandée). Ce qui se peint et se marche (`ctx.chemins`,
  `ctx.cheminCoins`) suit les chemins possédés ; la nature (arbres, rochers, bêtes, hameaux) lit toujours les chemins
  du plan (`ctx.cheminsNature`) : retirer un chemin ne fait rien pousser. Éteint ou sans chemin possédé, rien ne change.
- **Bâtir hors de la ferme** (`poseDehorsStatus`, demandé par `blocs.js poseStatus` hors de la ferme, le chantier
  allumé) : les blocs de `VILLAGE.DEHORS` (chemin, pas japonais, lanterne, réverbère, pont de planches, barrières,
  bancs) ; refusés : la mer et les lacs (« l'eau profonde »), la falaise et les sommets, la rivière (sauf le pont), le
  pied d'un arbre, d'un buisson ou d'un rocher (pris, sa case se libère), l'emprise du port (son cadre et
  `HAMEAUX.RESERVE` cases autour) et des hameaux, une région pas encore dessinée. Un chemin possédé se lit comme un sol
  « chemin » (`solAt`) : le mode Construire le pose, le reprend, le déplace comme sur la ferme ; les autres blocs vont
  dans `state.blocs` et `state.sols` (cases du monde). Le **pont de planches** (`pont_planches`, l'Atelier : 3 planches
  et 2 bois pour deux) se pose sur une rivière, tourné en travers (son sens) ; ses cases s'ouvrent à la marche (la
  page les ajoute aux cases ouvertes, `casesPonts`).
- **L'effet du chemin** : sur un chemin (un chemin possédé, un chemin posé sur la ferme, le chemin de la ferme :
  `surChemin`), on va `CHEMIN.VITESSE` % plus vite (50), à pied comme à cheval (`js/ui/stage.js` : la vitesse de la case
  du personnage, `modèle.pied`, `modèle.chevalVitesse`). La carte du monde dessine les chemins possédés.
- **Le portage** (`js/engine/portage.js`) : `state.portage = { vehicule, charge }`. Chaque objet a un volume (un ;
  `PORTAGE.VOLUMES` : bois et planches 2, pierre, minerais et lingots 3, bloc de silo 4). À la main `MAINS` (12) volumes,
  la brouette `BROUETTE` (40), la charrette attelée au cheval `CHARRETTE` (160 ; il faut un cheval). On charge sur la
  ferme (de l'inventaire puis du réfrigérateur, avec la fraîcheur des lots ; ce qui ne tient pas reste à la ferme),
  on reprend sur la ferme, on décharge sous la halle : tout ce qui est chargé se vend d'un coup (`dechargerAuPort`) ;
  `vendreAuPort` ne vend plus que ce qui est chargé ; les semences achetées vont droit à la ferme. Les commandes
  `port.decharger`, `portage.charger`, `portage.reprendre`, `portage.vehicule`. La fenêtre du port gagne l'onglet
  « Porter » (le véhicule, la place, « Charger les récoltes », ce qu'on charge) ; « Vendre » montre le chargement et,
  sous la halle, « Tout décharger ». La brouette et la charrette se fabriquent à l'Atelier (recettes `village`).
- **Les dessins** (`scripts/carte/portage.py`, vus de haut à 45°) : le pont (8 images : du nord au sud et d'ouest en
  est, selon ses voisins ; 597 couleurs pour les 8, 174 à 177 chacune), la brouette (`assets/brouette.png`, 3 vues × 4
  temps de la roue, 425 couleurs, 207 pour une case), la charrette attelée (`assets/charrette.png`, d'après la calèche :
  3 vues × 5 temps × 2 couches, 1 205 couleurs, 579 pour une case). La scène (`js/carte/portage.js`) : la brouette
  devant le personnage à pied, la charrette à la place du cheval sellé (il s'assied sur son banc), quand quelque chose
  est chargé (`modèle.portage`).
- **Le joueur automatique** : avant sa sortie, il fabrique une brouette s'il le peut, note ce qu'il vendrait et en charge
  le plus cher au volume d'abord ; sa marche va deux fois plus vite (le chemin, +100 %), `CHEVAL.VITESSE` fois avec un cheval ; au
  port, il décharge. Avec `--village`, ses gains de fin de partie tombent d'environ 430 à 185 pièces par jour (la
  brouette porte 40 volumes) : l'argent ne s'empile plus (la vérification passe).
- **La sauvegarde** : format 88 ; la migration v87 → v88 répare `dehors` et `portage` s'ils sont là et n'ajoute rien à
  une partie d'avant.
- **Les durées d'un aller** (la ferme, de son milieu, au port ; 58 px/s à pied, 30 s par heure de jeu ; graines 1 à 8,
  aller de 350 à 517 cases) : à pied hors chemin 3,2 à 4,8 h (moyenne 4,1) ; à cheval 2,3 à 3,4 h (2,95) ; à pied
  sur le chemin 2,2 à 3,2 h (2,75) ; à cheval sur le chemin 1,5 à 2,3 h (1,97) ; au galop (la pomme dorée) sur le
  chemin 0,9 à 1,3 h. **La vitesse seule ne suffit pas** à faire l'aller en une heure de jeu à cheval : le port est
  placé « le plus loin de la ferme » (`PORT.PLAN`, 200 à 265 cases à vol d'oiseau ; le tracé fait 1,4 à 1,6 fois
  cette distance, et la demi-ferme ajoute 72 cases, 0,3 h à cheval sur le chemin). Proposition (non faite ici) : choisir
  la côte la plus proche qui convient à partir de `PORT.PLAN.FERME` (70) plutôt que la plus loin, à 80 à 100 cases à vol
  d'oiseau : l'aller à cheval sur le chemin tomberait vers 0,9 à 1 h (à pied sur le chemin, 1,3 à 1,4 h) ; ou un
  raccourci (un bac côtier, un second quai près de la ferme) dans une fiche à part. Dans Chromium (sans écran, où la
  scène tourne au ralenti : 32 px/s à pied au lieu de 58), le rapport mesuré chemin/herbe est de 1,3 à pied et 1,5 à
  cheval ; l'aller à cheval avec la charrette, sur 426 cases, y a pris 143 s.
- **Les tests** : `tests/engine/village-chemin.test.mjs` ; `village-commerce` charge avant de vendre.
- Reste : retirer les boucles vers les hameaux (I7e) ; convertir le tronçon des parties d'avant (I7f) ; le chargement
  ne vieillit pas la nuit (il garde sa fraîcheur) ; un chemin repris du tronçon rend un bloc (1 pièce au port).

## Les villageois : l'arrivée (I3a, fait)

- **Le modèle** (`js/engine/villageois.js`) : `state.villageois`, une liste d'adultes seuls (`id`, `prenom`, `genre`,
  `perso`, `apparence`, `gouts`, `maison`, `lit`, `bourse`, `bonheur`, `faim`, `arrive`, `repos`, `accueil`,
  `sansMaison`, `avis`, `journal`). Le champ ne naît qu'avec le premier villageois : éteint, une partie neuve est
  celle d'avant (format 87 ; la migration 86 → 87 ne fait que réparer une liste abîmée).
- **La maison libre** : une pièce close du genre maison, marquée par une **boîte aux lettres** (un bloc fabriqué à
  l'Atelier, posé dehors contre sa porte : `blocs.js`, `maisonsMarquees`), avec un lit que la famille ne prend pas ;
  la famille dort d'abord dans les autres lits (`couchages`). Un villageois par maison.
- **L'arrivée** (`VILLAGE.ARRIVEE`) : un jour de bac (depuis I1c, celui du bac du port : `js/engine/bac.js`
  `jourDeBac`, `PORT.BAC.PERIODE`), pendant que le bac est à quai (`PORT.BAC.HEURES`) ; le premier dès la première maison libre ; les suivants s'il y a de quoi manger
  (`RESERVE_JOURS`) et si le port le permet (`PLAFOND[niveau]`, un port sans niveau compte pour 1). Il part de la
  case du port (`caseArrivee` : `plan.lieux.port` quand I1a l'aura posé, sinon le bout du chemin de la ferme),
  marche à sa porte, frappe, dit une ligne ; une notification ; la carte du joueur compte les villageois (un appui :
  leur liste, puis la fiche de chacun).
- **La nuit** (`villageoisNuit`, dans `runNight`) : il mange à la boîte commune (le besoin d'un adulte), dort dans
  son lit ; son bonheur suit la règle de la famille ; mal nourri ou sans lit, il se repose le lendemain (`repos`),
  il ne part jamais. Sa maison retirée, il dort à l'abri et prend la prochaine maison libre.

## Les villageois : la vie sur la ferme (I3b, fait)

Ce qui est posé (I3b) :

- **La journée déduite de l'heure** (`js/engine/villageois-journee.js`) : `journeeDuVillage(state, jour)` donne à
  chaque villageois ses segments de 0 à 24 h (`{ de, a, etat, lieu: { genre, case } }`), tirés de la graine, du jour
  et de son id, sans rien garder dans la partie ; `positionVillageois(state, id, heure)` dit où il est et ce qu'il
  fait. Les états de la fiche : `dormir` (son lit), `lever` (chez lui), `dehors` (un point des chemins posés, de la
  place, sinon des abords de sa porte), `flaner` (un banc libre, sinon la place), `repas` (assis : la table de sa
  maison, sinon la table commune dehors ; un siège chacun ; sans place, chez lui), `rentrer` (la veillée chez lui),
  `repos` (mal nourri ou sans lit la nuit d'avant : chez lui entre les repas), et `abri` (sous la pluie de
  `meteo.js`, chez lui, repas du dehors compris ; sans maison, l'abri de départ). Les lieux (`lieuxDuVillage`) sont
  gardés tant que les blocs ne changent pas ; jamais une case de mur (le test d'un lot de fermes générées).
- **L'horaire** (`VILLAGE.HORAIRE`, d'après `HABITANTS.HORAIRE`) : lever 6 h 30, sortie 7 h 30, repas de 12 h à
  13 h 15 et de 18 h 30 à 19 h 30, veillée chez lui jusqu'au coucher (21 h 15), chacun son retard (`DECALE`, 0,5 h
  au plus) ; entre les repas, des créneaux de 0,75 h (communs à tous) où il flâne une fois sur `FLANER` (0,35 le
  matin, 0,6 l'après-midi), sinon va et vient. `VITESSE` 0,9 (fois un adulte de la famille), `CHEMIN` 2 (le prix
  d'un pas hors des chemins posés). Ces réglages étaient ceux proposés ; le réglage « animé » a été choisi depuis (plus
  bas : CRENEAU 0,5, FLANER 0,2 et 0,4, VITESSE 1, CHEMIN 1,5).
- **La scène** (`js/carte/ferme/villageois.js`), sur le socle des comportements : `CarteKit.machine` (un état par
  état de la fiche, une transition revue quatre fois par seconde qui le fait passer au segment de l'heure), la
  grille de l'image (`CarteKit.perception` : villageois, famille, bêtes de la ferme) et le pas des habitants
  (`habAvancer` : il contourne le personnage et les autres). Il marche par `fermier.path`, qui prend maintenant un
  prix par case (`info.cout`, `CarteKit.chemin` : `g.cout`) : il préfère les chemins posés ; les portes s'ouvrent à
  son passage. Un trajet impossible : hors de la vue il y est d'un coup, dans la vue il renonce et flâne où il est.
  Loin de la vue (320 px), ni trajet ni image : il est posé où l'heure le veut. L'heure lui vient du modèle
  (`villageoisHeure`, avancée entre deux modèles).
- **Parler** : un appui ouvre sa bulle (`paroleVillageois` : le salut de l'heure, ce qu'il fait, son humeur, tirés
  de `VILLAGE.PHRASES` et `HABITANTS.PHRASES.salut`), avec un bouton pour sa fiche ; l'objectif du jour `parler`
  compte. Plus de fenêtre au toucher.
- **La nuit** : il dort dans son lit, sous la couverture (le toit effacé le montre) ; les fenêtres de sa maison
  s'éclairent le soir tant qu'il y est éveillé, et s'éteignent quand il dort (`fenetres.js` : chaque maison de
  villageois a sa lumière, `villageoisLumiere` ; les autres maisons comme avant).
- **Les mesures** (Chromium, téléphone émulé : 412 × 915, DPR 2, processeur ralenti × 4 ; la place d'essai, 15 h,
  vue dézoomée ; trois répétitions, médianes ; la machine chargée, charge 2,7 à 4,2 sur 4 cœurs) : le temps d'une
  image (de « prestep » à « postrender », le dessin compris), avant → après : 0 villageois 6,1 → 7,2 ms ; 5 : 8,1 →
  9,3 ms ; 10 : 11,2 → 8,6 ms ; 15 : 15,0 → 8,1 ms (moyennes 37,9 → 13,1 ms). Le système « villageois » coûte 0,41
  ms par passage pour 15 villageois à l'écran (0,7 à 0,8 ms rapporté aux images dessinées), sous la borne de 1 ms ;
  ses pointes (5 à 8 ms, rares) sont les recherches de chemin (deux par image au plus) et le chargement des
  planches. Avant, sans eux à l'écran, l'image s'alourdissait déjà avec le nombre de villageois : le modèle de la
  carte (`villageoisPourLaCarte`, refait à chaque rendu de la page) relevait les maisons et les lits de la famille
  pour chacun (≈ 15 ms pour 15) ; il est maintenant gardé tant que rien ne change (0,04 ms).
- Les réglages choisis sur film (parmi calme, normal, animé) : « animé » : `VITESSE` 1, `CRENEAU` 0,5, `FLANER` 0,2 le
  matin et 0,4 l'après-midi, `CHEMIN` 1,5. Les tâches (I3c, fait) prennent des créneaux à la place des sorties.

## Les villageois : la vie sociale (I3b+, fait)

À la demande de l'utilisateur, après I3b : « que les villageois paraissent plus liés les uns aux autres », qu'on sente
une communauté. Rien n'est sauvé (pas de nouveau format) : tout se déduit de la graine, du jour, des maisons et de
l'heure, comme la journée de I3b ; loin de la vue, rien ne s'anime.

- **Qui se connaît** (`js/engine/villageois-liens.js`) : `connaissance(state, a, b)` → `{ degre, nom, score, jours }`
  (0 inconnu, 1 connaissance, 2 ami). Le score (0 à 100) : `PAR_JOUR` par jour passé ensemble sur l'île (depuis
  l'arrivée du second), plus `VOISIN` si leurs boîtes aux lettres sont à `VOISINE` cases au plus, plus `TABLE` s'ils
  mangent à la même table, plus une affinité tirée de la graine et des deux ids (0 à `AFFINITE`) ; connaissance dès
  `PALIERS.connaissance` (10), ami dès `PALIERS.ami` (40). La famille du joueur (`b = 'famille'`) : connue dès
  l'arrivée, amie dès le palier « cordial » de l'amitié du joueur (I6a ; avant : après 4 jours). `liensDuVillage` (toutes les paires, gardées pour le jour),
  `liensPourLaCarte` (le modèle de la carte). **I6b l'a remplacé** par l'affinité sauvegardée (`liens.js`) : seul le
  corps de `scoreDe` a changé ; ce calcul reste l'estimation d'une paire qui n'a pas encore passé de nuit ensemble.
- **Des sorties qui ont un but** (`villageois-journee.js`, `VILLAGE.SOCIAL.BUTS`) : la grille des créneaux de I3b
  reste le socle ; chaque créneau dehors est maintenant choisi pour tout le village à la fois, créneau par créneau
  (déterministe), et tire au poids un but qui a un lieu libre : **visite** (il va devant la porte d'un ami, tourné
  vers elle ; l'ami, chez lui `RECOIT` h, « recoit », sort à côté de sa porte), **rendez-vous** (à deux ou trois, en
  petit cercle devant le puits ou sur la place : lieu « groupe », tourné vers le centre), **promenade** à deux entre
  amis (un meneur, un ami à son côté, jusqu'à un point des chemins ou de la place), **eau** (devant le puits),
  **jardin**, **bêtes** (par-dessus la barrière de l'enclos), **ouvrage** (`OUVRAGES` : une ruche, un bassin, un
  arbre fruitier…), **port** (si son chemin fait `PORT_MAX` cases au plus : pas encore, le chemin du port est long) ;
  à défaut, il va et vient comme en I3b. Une sortie à plusieurs dure `DUREE` créneaux (2 : le temps d'y aller et
  d'y rester), si tous y sont libres ; l'ami chez qui l'on va est plutôt un voisin (le poids : le score divisé par
  la distance des maisons). Jamais avec un inconnu ni avec un villageois au repos. Le segment porte `but` : `{ sorte, cle (la même pour ceux
  qui le font ensemble), avec, role ('visiteur', 'hote', 'meneur', 'suit'), emoji }` ; les lieux nouveaux :
  « devant » (une case, tournée vers `vers`) et « groupe » ; les lieux des sorties (`lieuxDesSorties`, gardés avec
  ceux de I3b) : le devant de chaque porte, la case d'où l'on puise, les cercles, les cases d'où regarder.
- **La scène** (`js/carte/ferme/villageois-social.js`, posée sur `villageois.js`) :
  - au but, il fait quelque chose de visible : tourné vers ce qu'il est venu voir, un emoji (💧 🌱 🐑 👀) ; au puits,
    il puise (le geste « ramasse ») ; à la porte d'un ami, il frappe (« Toc, toc ! ») ; l'hôte attend qu'on ait
    frappé (9 s au plus), puis sort ;
  - la promenade : le meneur attend son ami, puis ils marchent côte à côte (l'ami à son côté, `villageoisSuivre`) ;
  - les causeries : ceux qui ont la même clé, arrivés, se font face (à trois, ils regardent qui parle) et échangent
    des répliques à tour de rôle (une toutes les `TOUR` s, la bulle de l'autre s'efface quand il répond), une
    émotion au début ; à table, ceux du même repas causent aussi ;
  - se croiser : deux villageois qui se connaissent, à `RAYON` px, s'arrêtent, se tournent l'un vers l'autre, une
    émotion (😊 👋 😄 ❤️ selon le degré et l'humeur), deux répliques l'une après l'autre (`DUREE` : 1,6 s entre
    connaissances, 2,5 s entre amis) ; des amis font parfois un bout de chemin ensemble (`ENSEMBLE`, `BOUT` s) ;
    deux inconnus, un signe de tête une fois sur deux ; pas deux fois la même paire en `ATTENTE` s, et chacun
    reprend sa route 7 s avant d'en saluer un autre ;
  - debout, il tourne la tête vers un ami qui passe (`REGARD` px) ; le personnage du joueur qui passe à `JOUEUR` px
    d'un villageois qui connaît la famille reçoit un salut (un emoji, une bulle, une fois en `JOUEUR_ATTENTE` s) ;
  - le visage sourit le temps d'un salut ou d'une émotion (`CarteVisages`, la réaction « joie ») ; l'emoji est celui
    des habitants (`amis.js`, `emojiHabitant`), les bulles celles des villageois.
- **Les répliques** (`VILLAGE.SOCIAL.REPLIQUES`, 86 paires ; `echangeVillageois`) : par degré (connaissance, ami),
  moment (matin, jour, soir), météo (pluie, clair), humeur (triste), et ce qu'ils font (visite, groupe, promenade,
  repas) ; tirées de la graine, de la paire et du jour, le rang de l'échange avance dans la liste (une causerie ne se
  répète pas avant d'en avoir fait le tour). `SOCIAL.JOUEUR` : ce qu'on dit au personnage du joueur (`{joueur}`).
  Une bulle tient une réplique : pas de fenêtre, pas de personnage écrit. Un appui sur un villageois à son but dit ce
  qu'il y fait (`SOCIAL.ACTIVITE`).
- **Les mesures** (comme I3b : Chromium, téléphone émulé 412 × 915, DPR 2, processeur ralenti × 4 ; 15 villageois à
  l'écran, installés depuis plusieurs jours, la place à 15 h ; trois fenêtres de 6 s, médianes ; la machine chargée,
  charge 1,8 à 3,2 sur 4 cœurs, plus lente que lors des mesures de I3b) : le système « villageois », à réglage égal
  (« animé »), coûte 0,7 à 0,9 ms par passage avec I3b et 1,5 à 1,85 ms avec I3b+ (quatre mesures de chaque) ; à 5
  et 10 villageois, 0,55 et 1,1 ms. Le surcoût (≈ 0,8 ms ici, soit ≈ 0,4 ms dans les conditions de I3b, où I3b
  mesurait 0,41 ms) vient surtout de ce qu'ils marchent davantage (plus d'images de marche, plus de recherches de
  chemin), des bulles (leur place n'est plus écrite que si elle change, le cadre de l'écran et la largeur du calque
  sont relevés une fois par image), puis de la vie sociale elle-même (≈ 0,2 ms : les causeries et les croisements
  revus dix fois par seconde, les emojis jamais mesurés). Les pointes (7 à 15 ms, rares) sont des recherches de
  chemin et l'écriture d'une bulle. Le temps d'une image (médiane) reste du même ordre : 17 à 19 ms avec I3b, 19 à
  23 ms avec I3b+.
- **Les tests** : `tests/engine/village-social.test.mjs` (la connaissance, les sorties et leurs compagnons, jamais
  avec un inconnu, le déterminisme, jamais dans un mur sur un lot de fermes, les répliques) ;
  `village-journee.test.mjs` suit les sorties à but. Éteint, rien ne change (le CSV de la simulation est le même).
- Reste : l'affinité sauvegardée et ce qu'elle change (I6b, fait) ; la visite du soir et s'asseoir côte à côte (I6b, fait) ;
  le port quand son chemin sera court (I2) ; les tâches prennent des créneaux (I3c, fait).

## Les villageois : les tâches (I3c, fait)

Le cœur de la nouvelle boucle : le joueur confie une tâche à chaque villageois, qui la fait chaque jour à son poste ;
ce qu'il produit va au coffre de la ferme (l'inventaire, le blé au Silo).

- **Les tâches** (`TACHES`, `data/village.json`) : les champs (récolter ce qui est mûr, arroser ce qui a soif avec
  l'eau du réservoir, ressemer de sa dernière culture), les bêtes (nourrir les poules, prendre les œufs, tondre,
  prendre le lait et la laine), le verger et les ruches, le bois (hache), la pierre et le minerai (pioche), la pêche
  (canne : l'étang ou la mare de la ferme), la cueillette (ce que la ferme offre ce matin), le fauchage et la paille
  (faux ; une botteleuse posée en fait de la paille), la cuisine (une préparation lancée à la cuisinière ou au four,
  `RECETTES`), la **navette** (« la tournée du port » dans le jeu : « navette » est un mot que les textes du jeu n'emploient plus ;
  un aller-retour au port, `PORTEE` objets marqués « à vendre » sur sa fiche, vendus au
  comptoir ; la brouette et la charrette viendront avec I2). Chacune : `ACTIONS` par jour (2 à 12), ce que donne une
  action (`donne`), son outil, son lieu, son geste, son emoji, ce que dit la fiche sans poste (`SANS`), ses phrases.
- **Le moteur** (`js/engine/taches.js`) : `attribuer(state, id, tache)` ; le travail se fait **à l'heure** (`avancerTaches`,
  à chaque pas de la ferme, `energy.js`) : `ACTIONS` à parts égales sur ses créneaux de travail du jour
  (`actionsDues`) ; la nuit (`tachesNuit`, avant `villageoisNuit`) fait ce qui reste (la page fermée, l'averse). Chaque
  action passe par **les fonctions du joueur** (`harvestPlot`, `waterPlot`, `plantPlot`, `feedAllHens`, `pickUp`,
  `shear`, `harvestTree`, `recolterRuche`, `chopTree`, `mineRock`, `castLine`, `ramasser`, `scytheGrass`,
  `verserFibres`, `startRecipe`, `vendreAuPort`) : une carotte récoltée par lui est une carotte récoltée (les
  compteurs de la campagne et des paliers comptent), un arbre coupé repousse comme les autres, le quota de pêche du
  jour est celui du joueur, la pioche améliorée lui profite. Mais ni l'énergie, ni l'XP, ni les objectifs du jour du
  joueur (`commeLeJoueur` les remet comme avant). Un arbre, un rocher entamé est fini d'abord. Une action sans rien à
  faire se retente `ESSAI` h plus tard. En repos (I3a), il ne fait rien ; sans son outil ou sans poste, la tâche
  **attend** et le dit (sa fiche, sa bulle : « il me faut une hache. »), et il vit sa journée comme avant.
- **Les automatisations, la règle** : tout se lit dans la partie au moment de l'action, le premier passé prend. Une
  parcelle arrosée (l'asperseur, l'averse, le robot, le joueur) n'a plus soif : il ne l'arrose pas une seconde fois ;
  une récolte prise par le robot n'est plus mûre : il ne la prend pas, et le robot ne reprend pas ce qu'il a récolté.
- **Les outils** : le joueur fabrique l'outil à l'Atelier et le donne (`donnerOutil` : il quitte sa barre d'outils, le
  villageois le garde, `v.outil`) ; il le reprend (`reprendreOutil`) s'il n'en a pas déjà un. Celui que le villageois
  tenait revient au joueur quand il en reçoit un autre.
- **La journée** (`villageois-journee.js`, `planDuTravail`, avant les sorties de I3b+) : les créneaux dont le milieu tombe
  dans `TRAVAIL` (8 h à 11 h 30, 13 h 30 à 16 h 30) sont du travail (l'état « travail », à son poste : un lieu
  « devant », tourné vers ce qu'il travaille), sauf `PAUSE` créneau tiré par plage (jamais le premier), qui reste une
  sortie de la vie sociale (le puits, un ami, la place). Le lever, le début de matinée, **les repas avec les autres**
  (la table commune), la fin d'après-midi (après 16 h 30 : les visites, les rendez-vous, les promenades) et la veillée ne
  changent pas. Un poste tient `POSTE` créneaux (une heure de jeu), puis il passe au suivant. Les postes (`postesDe`) :
  à côté des parcelles, des enclos, des arbres fruitiers et des ruches ; de part et d'autre du pied d'un arbre ou d'un
  rocher, à côté d'une touffe d'herbe haute (de profil, la hache, la pioche, la faux) ; sur la rive au-dessus de l'eau ;
  devant la cuisinière ; le coffre (devant la maison de la famille) puis le comptoir du port, pour la navette ; à
  `RAYON` cases de sa maison s'il y en a, sinon les plus proches de la ferme. **Deux villageois à la même tâche** ont des
  postes voisins (le poste de l'équipe, puis les plus proches de lui : l'autre côté du même arbre) et la même clé : ils
  causent un peu (`SOCIAL.REPLIQUES.travail`, une réplique toutes les `CAUSE` s, la première quelques secondes après
  s'y être mis). Ils se lient en travaillant ensemble : `CONNAISSANCE.COLLEGUE` de plus par jour (I6b l'a repris : `LIENS.GAINS.POSTE`).
  Sous la pluie, le travail du dehors devient l'abri (la cuisine continue) ; la nuit fait les actions qui restent.
- **La scène** (`js/carte/ferme/villageois-travail.js`) : arrivé à son poste, il fait le geste de sa tâche en boucle
  (les gestes des habitants des hameaux, `CarteKit.GESTES_HABITANTS` : la hache, la pioche, la faux, la canne,
  l'arrosoir, se baisser, remuer la marmite ; les mêmes cases des planches, pas de dessin nouveau), une courte pause
  entre deux ; chaque action que le moteur compte pendant qu'on le regarde fait monter l'emoji de ce qu'elle donne
  (🪵 🪨 🐟 🌱…) ; rien n'est compté par la scène (la règle de la fiche 7b). Quand il cause, il pose son outil et se
  tourne vers l'autre. Un passant qu'il connaît le salue comme ailleurs (I3b+).
- **L'interface** (`js/ui/villageois.js`) : sa fiche dit sa tâche (où il en est aujourd'hui, ce qu'il a produit, ce
  qui lui manque), son outil (« Donner ma hache », « Reprendre ») ; le bouton « Tâche » ouvre la liste (celles qu'il
  peut faire, ce qui manque aux autres, qui l'a déjà) ; la navette, ce qu'elle porte (« à vendre ») ; la liste des
  villageois dit **qui fait quoi** ; un appui long sur un poste de la carte (un arbre, un rocher, l'étang, le
  poulailler, la cuisinière, un buisson ; `tachesDuPoste`) propose « Confier à… ».
- **Le journal** : chaque nuit, l'entrée du journal du villageois (7 jours) gagne `tache`, `actions` et `produit`
  (`{ objet: n }`), à côté de `mange` (le tableau, I3d, le lit). `quiFaitQuoi` donne la vue d'ensemble du jour.
- **La sauvegarde** : format 89 (`v.tache`, `v.outil`, `v.vendre`, `v.semis` (ce qu'il ressèmera), `v.travail` (sa
  journée de travail)) ; la migration 88 → 89 (`reparerTaches`) remet à vide une valeur abîmée. Les commandes
  `villageois.attribuer`, `villageois.outil` et `villageois.vendre` (`commandes.js`).
- **Le joueur automatique** (`bot.js`, `botVillageois`, `SIMULATION.VILLAGEOIS`) : dès le palier 3, il bâtit une maison
  de villageois quand aucune n'est libre et que le port en laisse venir un de plus (la paillasse et la boîte aux
  lettres fabriquées à l'Atelier), puis confie à chacun la première tâche libre de `TACHES` (d'abord ce qui nourrit,
  puis ce qui se vend), son outil fabriqué et donné. `node scripts/simulate.mjs --village` passe ainsi du palier 3 au
  palier 4 (nuit 22 pour le joueur appliqué, 23 pour le minimal ; avant : bloqué au palier 3) ; le palier 4 attend
  l'agrandissement du port (I1c, depuis fait : voir plus haut). Deux villageois (le plafond d'un port de niveau 1), sur 80 nuits : l'un aux champs
  (≈ 7 actions par jour sur 12 : ≈ 15 blés, 9 fraises, 6,5 épinards, 4,7 oignons, 4,4 carottes, 2,8 tomates… et leurs
  graines), l'autre aux bêtes (≈ 2 actions par jour sur 4 : la laine, ≈ 1,3 par jour ; les poules et les œufs, le
  joueur simulé s'en occupe avant lui).
- **Les tests** : `tests/engine/village-taches.test.mjs` (chaque tâche par les fonctions du joueur, dans les bornes du
  monde ; sans outil, rien ; en repos, rien ; pas de double récolte ni de double arrosage ; la journée, la pause, les
  camarades côte à côte ; à l'heure puis la nuit ; le journal ; la sauvegarde ; les commandes ; le joueur automatique ;
  éteint, rien) ; `compagnon.test.mjs` reste vert. Éteint, le CSV de la simulation est le même octet pour octet.
- **Les mesures** (comme I3b+ : Chromium, téléphone émulé 412 × 915, DPR 2, processeur ralenti × 4 ; 15 villageois ;
  trois fenêtres de 6 s ; la machine très chargée, charge 5 à 11 sur 4 cœurs : les chiffres sont bruités) : le système
  « villageois » à 15 h (sans tâche), avant → après : 2,0 et 2,9 ms → 2,5 et 2,7 ms (deux paires de mesures : pas d'écart
  au-delà du bruit) ; 15 villageois au travail (bois, pierre, fauchage, cueillette), 9 h 30 à 10 h 30, la vue sur les
  postes : 1,5 à 2,3 ms (5 à 9 à l'écran, beaucoup encore en marche vers leur poste). Dans le moteur (Node), à 15
  villageois au travail : la journée gardée 0,06 ms (0,05 avant), le pas de la ferme 3,4 ms en moyenne sur une heure de
  jeu, actions comprises (une action relit les pièces quand un arbre tombe) ; sans tâche, rien ne change (0,17 ms).
  Les postes et l'attente sont gardés tant que rien ne bouge (`signatureTaches`) : sans cela, la journée coûtait
  10 ms.
- Reste : la part du villageois et la valeur de ce qu'il produit (I4) ; la brouette, la charrette et un chemin du
  port plus court pour la navette (I2) ; les postes préférés (I6c) ; montrer ce qu'il porte (un panier, une botte).

## Les villageois : le tableau (I3d, fait)

Ce que chaque villageois a coûté et produit, hier et sur les sept derniers jours, pour décider qui fait quoi.

- **Le calcul** (`js/engine/tableau.js`, pur) : tout se lit dans le journal de chaque villageois (ses 7 derniers jours,
  `ARRIVEE.JOURNAL` : la sauvegarde n'a pas eu à garder plus, elle reste au format 91). Le **coût** d'un jour : ce
  qu'il a mangé à la boîte, au prix de vente de chaque aliment (`sellPrice`, le prix fixe du port) ; sa part versée
  (`J.part`, 0 avant I4) ; et **ce que son travail a pris au coffre** (`J.utilise`, nouveau : les ingrédients d'un plat,
  la graine ressemée, le blé des poules, ce que la tournée du port vend), au même prix. Sans ce dernier poste, la
  cuisine comptait son plat sans ses légumes (un plat vaut à peu près ses ingrédients) et la tournée les pièces
  d'objets que d'autres avaient produits. Le **produit** : chaque objet, sa quantité, sa valeur au port (0 pour ce qui
  ne se vend pas). Le **solde** : produit moins coût. Le **rendement** : ce que sa tâche a produit (moins ce qu'elle a
  pris) par jour de travail, en % de la moyenne des tâches faites dans le village sur la période. Des entiers
  partout. Un jour de repos (`J.repos`, nouveau : noté par la nuit) compte son repas et aucun produit. Les périodes :
  « hier », « semaine » (les sept jours glissants qui finissent hier). `tableauVillage`, `bilanVillageois`,
  `trierTableau`, `manqueCourt` (« sans outil : une hache », « en repos : pas assez à manger », « sans poste : … »,
  « rien à porter au port », « sans tâche »).
- **La fenêtre** (`js/ui/tableau.js`) : le bouton 📊 sur la carte du joueur, à côté des pièces, dès qu'il y a un
  villageois ; une ligne par villageois (portrait, prénom, tâche et ce qu'elle a donné, coût, produit, solde,
  humeur), triable par colonne (un second appui inverse le sens) ; « Hier » et « 7 jours » ; le total du village ;
  sous la ligne, ce qui lui manque aujourd'hui. Un appui sur un prénom : ses sept jours (chaque jour : sa tâche, ses
  actions, ce qu'il a mangé, ce qu'il a pris au coffre, ce qu'il a produit, le solde), son rendement, « Sa fiche ».
  Sur un téléphone, la tâche et l'humeur se replient en icônes sous le prénom et les en-têtes s'abrègent : à 380 px
  de large, rien ne déborde. Aucune couleur d'alarme (B-1) : un solde négatif s'écrit comme un autre ; la fenêtre dit
  que c'est un repère. La fiche du villageois n'est pas touchée.
- **Le joueur automatique** (`bot.js`, `botReattribuer`, `SIMULATION.VILLAGEOIS.REATTRIBUER`) : une fois par jour, il
  regarde le villageois au solde de la semaine le plus bas ; après une semaine pleine sur sa tâche (7 jours, sans
  repos : le solde juge la tâche, pas la faim), il relève ce solde ; deux relevés (`SEMAINES`, une semaine juge mal les
  champs : une récolte tombe ou non dedans) sous `SEUIL` (0), il essaie la première tâche libre qu'il n'a pas faite ;
  une tâche déjà faite qui a donné mieux, il y retourne et s'y tient. Une première version (une semaine, toute tâche
  essayée tour à tour) enlevait les champs au villageois qui nourrissait le village : les jours de repos doublaient.
  Mesure (`node scripts/simulate.mjs --village`, 80 nuits, et la même partie sans la réattribution) : le joueur appliqué déplace un
  villageois deux fois (les bêtes → la cuisine à la nuit 30, la cuisine → la cueillette à la nuit 49), le minimal quatre
  fois (les champs → la cuisine → le bois → la pierre, les bêtes → la cuisine). Les pièces à la nuit 80 : 3 346 → 3 456
  (appliqué, + 3 %) et 1 744 → 3 372 (minimal, ≈ × 2) ; le solde du village sur la partie : 2 821 → 2 860 et −1 308 →
  −720 ; le palier 6 : nuit 54 → 59 (appliqué) et 70 → 65 (minimal). Mais les jours de repos montent (59 → 77 sur
  180 → 219 jours-villageois chez l'appliqué, qui loge un quatrième villageois ; 45 → 67 sur 222 chez le minimal) : la
  cuisine, où il va volontiers (son solde est voisin de zéro, mieux que les bêtes que le joueur simulé soigne déjà),
  prend à la boîte ce que les autres auraient mangé. Le gain est réel mais petit et bruité ; une semaine de solde ne
  voit pas qui nourrit le village.
- **Les tests** : `tests/engine/village-tableau.test.mjs` (une semaine écrite à la main : coût, produit, solde, le jour
  de repos, ce qui est pris au coffre, la part ; sept jours glissants et hier ; le total, trois soldes différents, le
  rendement, le tri ; ce qui manque ; le journal de la nuit ; le joueur automatique ; éteint). Éteint, le CSV de la
  simulation est le même octet pour octet.
- Reste : les prix et la part (I4 : `J.part` attend d'être versée) ; les ventes des commerces (lot 5) ; ce que les
  champs d'un villageois récoltent est compté à lui seul, même quand le joueur l'aurait récolté (le premier passé
  prend) ; l'eau d'arrosage et l'énergie ne sont pas comptées ; le tableau ne garde que sept jours.

## Les villageois : l'amitié (I6a, fait)

Ce qui liait le joueur aux habitants des hameaux, rebranché sur les villageois, sans rien recopier : l'amitié d'un
villageois est celle d'`amitie.js` (les mêmes paliers, `RECIT.PALIERS` ; les mêmes gains, `data/amitie.json`), sous le
« hameau » `HAMEAU_VILLAGE` (`'village'` ; la clé : l'id du villageois, `state.amitie.pnj['vg-1']`). `trouverPnj` le
trouve ; `parlerAmitie`, `offrir`, `amitieAvec`, `rendreDemande`, `inviter`, `servirRepas`, `souvenirParole` servent tels
quels. Ce qui est propre à l'île est dans `js/engine/villageois-amitie.js` et `VILLAGE.AMITIE` (`data/village.json`).

- **Les gains** : l'accueil (`ACCUEIL`, 10 points : « poli », la famille l'a accueilli), la première conversation du
  jour (`AMITIE.PAROLE`, 2), les retrouvailles (`RETROUVAILLES` : revu après 7 jours sans échange, 3 de plus ; il le
  dit, et le salut de la scène aussi), un cadeau par jour (`AMITIE.CADEAU` : adoré 8, aimé 4, neutre 1, détesté −4),
  une demande honorée (`DEMANDES.AMITIE`, 6), un repas partagé (`AMITIE.INVITATION.REPAS`). Jamais de perte par
  l'absence.
- **Les goûts : tirés, pas « par tâche préférée ».** Ils sont tirés à son arrivée (`goutsTires` : parmi les listes de
  tous les métiers adultes des hameaux et la liste commune, `AMITIE.GOUTS` de chaque sorte) et gardés avec lui
  (`v.gouts`). Pourquoi : la tâche est choisie par le joueur et change d'un clic ; des goûts qui la suivraient
  changeraient avec elle (un cadeau adoré hier, neutre demain) et feraient de la tâche un levier d'amitié ; il n'y a
  pas encore de « tâche préférée » (elle viendra avec les traits, I6c) ; les goûts tirés ont le grand tas de tous les
  métiers, deux villageois ne se ressemblent pas. Avant I6a, les villageois tiraient ceux du « jardinier ».
- **Ce que l'amitié change**, sans cadence d'usine et sans bonus de production (un test : la même journée de travail,
  ami intime ou simple connaissance) :
  - **le salut au personnage** (`villageois-liens.js` `echangeVillageois(…, 'joueur')`) suit le palier :
    `SOCIAL.JOUEUR.proche` et `intime`, plus chaleureux, avec ❤️ 🥰 ; `retrouvailles` ; un ami proche (ou qui garde un
    présent) salue de plus loin (`CROISE.JOUEUR_AMI`, 56 px au lieu de 28) et plus longtemps ;
  - **la famille est son amie** dans la vie sociale (`connaissance(state, id, 'famille')`) dès le palier
    `FAMILLE_AMI` (« cordial ») ; avant, une connaissance (I3b+ disait : après 4 jours ; la scène suit maintenant ce
    que le joueur a vécu avec lui) ;
  - **il dit ses goûts** : dès `CONFIE.PALIER` (« cordial »), une fois sur `CONFIE.CHANCE` (0,35) à la première
    conversation du jour, et chaque fois qu'un cadeau lui fait passer un palier (`confierGout` ; « Tu sais ce que
    j'adore ? la tarte aux pommes ! ») ;
  - **le présent d'un ami** (`AMITIE.RETOUR`) : la nuit, un ami « proche » ou plus en prépare un (15 %, 25 % intime),
    un objet de son métier (`VILLAGE.AMITIE.METIERS` : la tâche donne le métier des hameaux dont il prend les
    présents et les besoins ; sans tâche, le jardinier) ; il ne le pose pas devant la porte : il te le donne en main
    propre, en te saluant (🎁) ou quand tu lui parles (`donnerPresent`) ; s'il attend, rien ne se perd ;
  - **la tâche acceptée sans perdre d'humeur** dès `TACHE_SANS_HUMEUR` (« proche ») : `tacheSansHumeur` ; il n'y a
    pas encore de tâche qu'il n'aime pas (les traits, I6c, la liront) ;
  - **un artisan ami apprend de nouvelles pièces** : I5a lira `palierVillageois`.
- **Parler** (la bulle de la carte, `parlerVillageois` après `paroleVillageois`) : son palier, sa jauge, le gain
  (+2), « 🎁 Offrir » et « 📋 Sa fiche » ; le texte dit, dans l'ordre : le présent qu'il te donne, le souvenir d'un
  repas partagé, sa demande (la première fois du jour, puis un appui sur deux), un goût confié, un sujet du moment
  (`PROPOS_PART`, 0,4 ; pas au travail ni s'il attend son outil), sinon ce qu'il fait. Sa joie se voit (😊, son
  visage sourit : `villageoisEmotion`) ; un palier passé, une notification.
- **Offrir** (la fenêtre « Offrir » des habitants, `data-hameau="village"` : `offrirVillageois`) : l'objectif du jour
  `cadeau_villageois` ; dans la scène, sa réaction (`PHRASES.cadeau`, 😊 ou 🤢), puis le goût qu'il confie
  (`FarmStage.villageoisDit`).
- **Les demandes** (`demandes.js` `demandesVillageoisNuit`, après `demandesNuit`) : chaque nuit, avec
  `DEMANDES.CHANCE` (0,35), un villageois là depuis `DEPUIS` jours (2), sans demande ouverte, en fait une, selon sa
  tâche (les `DEMANDES.BESOINS` du métier de `METIERS`) ; `MAX` (2) ouvertes pour le village, à part du compte des
  hameaux ; annoncée au matin (`PHRASES.annonce`, le carnet 📜 dit « du village ») ; elle dure `DEMANDES.DUREE`
  (7 jours) puis s'oublie sans rien coûter (B-1) ; honorée depuis « Offrir » ou sa fiche : l'amitié et un présent.
- **Les invitations** (`invitations.js`) : `relationsInvitables` liste les villageois (tous connus ; leur « métier » :
  leur tâche) ; le message passe « de porte en porte » (plus d'Achille quand on n'invite que des villageois) ; le jour
  dit, le villageois vient lui-même (`invites.js` : il quitte sa journée, `m.invite`, part de là où il est, sinon de sa
  porte, s'assoit, mange, remercie, puis reprend sa journée de là où il s'est levé) ; à table, ni calèche ni « chez
  nous » (`PHRASES.table`). Il s'en souvient ensuite, comme un habitant.
- **Les propos** (`proposVillageois`, `VILLAGE.PROPOS`) : `GARDES`, les sujets des habitants dits tels quels (la
  ferme, la lune, la météo, le mois, ses goûts) ; réécrits pour le village : `ferme_cultures`, `ferme_poules`,
  `ferme_maison`, `cadeau_merci`, `ami_proche`, `jours` ; nouveaux : `village_ami`, `village_voisin`,
  `village_collegue`, `village_nouveau`, `village_depuis`, `port_bac`. Retirés (jamais dits par un villageois) : le
  hameau, la calèche, les cousins, les visites et l'entraide des hameaux, la réserve, les projets, les fêtes, les
  sujets d'enfant. Chaque phrase tient en une bulle (96 caractères au plus, un test).
- **L'interface** : la fiche du villageois gagne son palier (la jauge, ce qu'il reste), ses goûts connus, le présent
  qu'il garde, sa demande en cours (de quoi la rendre), « 🎁 Offrir » et « 🍽️ L'inviter à un repas » (la fenêtre
  des évènements, lui coché) ; la liste des villageois dit le palier de chacun (🎁, 📜) ; la fenêtre des amis (💌)
  commence par « 🏝️ Sur l'île » : les villageois, leur palier, un appui ouvre leur fiche (même sans compte en ligne).
- **La sauvegarde** : format 91 ; la migration 90 → 91 (`reparerAmitieVillageois`) : chaque villageois a ses goûts
  (tirés s'ils manquent) et sa fiche d'amitié (`ACCUEIL` s'il n'en avait pas) ; un présent illisible s'en va ; la
  demande d'un villageois parti s'oublie. Les amitiés des hameaux ne sont pas touchées (I7f). Sans villageois, rien.
- **Les tests** : `tests/engine/village-amitie.test.mjs` (l'arrivée et les goûts, parler et les retrouvailles, les
  cadeaux et le goût confié, le présent en main propre, le salut et la famille, pas de bonus de production, les
  demandes, les invitations et le souvenir, les propos et la bulle, la sauvegarde, éteint) ; `amitie`, `demandes`,
  `invitations`, `propos` restent verts réglage éteint ; `village-social` suit la famille amie par l'amitié. Éteint,
  le CSV de la simulation est le même octet pour octet.
- Reste : le joueur automatique ne parle pas aux villageois et n'offre rien (il les invite quand il invite) ; les
  tâches qu'il aime et les humeurs (I6c) ; les pièces de l'artisan ami (I5a) ; le retrait du récit (`RECIT.PALIERS`
  reste la table des paliers, I7c) ; le bot ne rend pas les demandes des villageois.

## Les villageois : les liens entre eux (I6b, fait)

Ce qu'I3b+ déduisait chaque jour (qui se connaît) est maintenant une affinité gardée, qui monte de ce que les
villageois vivent ensemble ; elle change leurs habitudes, leur bonheur, leur travail, et deux proches peuvent fonder un
foyer. Le moteur : `js/engine/liens.js` ; les réglages : `VILLAGE.LIENS` (`data/village.json`) ; la page :
`js/ui/liens.js`. Tout reste doux (B-1) : les liens ne baissent jamais, personne ne se sépare.

- **L'affinité** (`state.liens`) : entre deux villageois, un entier de 0 à 100, gardé dans une demi-matrice compacte
  (`aff` : deux chiffres en base 36 par paire, dans l'ordre `ordre` des villageois ; 15 villageois : 210 caractères).
  Chaque nuit (`liensNuit`, dans `runNight` après les tâches et avant la nuit des villageois : la journée lue est celle
  qu'ils ont vécue), elle monte de `GAINS` : `ILE` 1 (ils vivent sur la même île), `VOISIN` 1 (boîtes aux lettres à
  `VOISINE` 14 cases au plus), `POSTE` 4 (la même tâche, le même jour ; le même commerce s'y ajoutera avec I5a),
  `TABLE` 1 (la même table au même repas), `SORTIE` 1 (une visite, un rendez-vous, une promenade, un banc à deux),
  `FETE` 4 (le même repas du joueur, l'invitation d'I6a ; les fêtes d'I8a s'y brancheront), `FOYER` 3 (le même toit),
  `ENTRAIDE` 5 (un repas apporté). Au-delà de `LENT` (45), un gain compte pour moitié : on devient proche plus lentement
  qu'ami. Elle ne baisse jamais. Une paire qui n'a pas encore passé de nuit ensemble (un nouveau venu, une partie
  d'avant I6b) vaut l'estimation d'I3b+ (`SOCIAL.CONNAISSANCE` : les jours ensemble et l'affinité tirée), la même que la
  partie montrait : la migration ne change rien à l'écran ; un nouveau venu part de l'affinité tirée seule (0 à
  `AFFINITE` 20).
- **Les paliers** (`PALIERS`) : connaissance (10), camarade (25), ami (45), proche (75). `connaissance(state, a, b)`
  rend toujours `{ degre, nom, score, jours }` (et `palier`, 0 à 4) : seul le corps de `scoreDe` a changé
  (`scorePaire`) ; le degré lu par la journée, la scène et les répliques : 1 connaissance ou camarade, 2 ami, 3
  proche (`degre >= 2` : des amis). Les répliques gagnent `proche`, `soiree`, `apporte`, `banc`.
  Au même poste (le fauchage), deux villageois partis de 12 sont camarades après 2 nuits et amis après 5 (Chromium ;
  en Node, partis de 16 : 2 et 5) ; les autres, sans poste commun, restent camarades sur le même temps. Au bois, quand
  les arbres autour de leur maison sont abattus, le travail attend (I3c) et ils se lient moins vite.
- **Ce que les liens changent** :
  - **le bonheur** (`bonheurDesLiens`, lu par la nuit du villageois) : un ami au village monte sa cible de
    `BONHEUR.AMI` (4), un proche de `BONHEUR.PROCHE` (6, le plus grand des deux) ; un repas apporté, de
    `ENTRAIDE.BONHEUR` (6) cette nuit-là ;
  - **le travail à deux** (`taches.js` `actionsDuJour`) : deux amis (`TRAVAIL.PALIER` 3, « ami ») à la même tâche, qui
    y travaillent tous deux aujourd'hui, gagnent `TRAVAIL.ACTIONS` (1) action par jour à eux deux (celui des deux qui a
    le plus petit id) ; dans une équipe plus grande, les paires d'amis se forment dans l'ordre des id ; la fiche et
    « qui fait quoi » le disent (9 / 9 au lieu de 8) ;
  - **l'entraide** (reprise de `voisins.js` : un foyer qui a eu faim reçoit à manger d'un ami) : qui se repose demain
    (mal nourri ou sans lit) reçoit au repas de midi la visite de son meilleur ami (ami ou proche, ni au repos, ni
    sous le même toit), qui lui apporte un repas (`planifierEntraide`, `liensFinDeNuit` ; `entraidesDuJour`) : il va
    à sa porte avec 🍲, frappe, l'autre sort, ils causent (`REPLIQUES.apporte`). Ni la boîte ni le coffre ne paient ce
    repas (il le partage de bon cœur) : du bonheur et de l'affinité, pas de nourriture en plus ;
  - **les habitudes** (`villageois-journee.js`) : deux amis s'assoient côte à côte sur deux bancs voisins (le but
    « banc », `SOCIAL.BUTS.POIDS.banc` 1,5, l'état « flaner », ils causent comme à table) ; à table, chacun prend le
    siège le plus près d'un ami déjà assis ; la **visite du soir** (`visitesDuSoir`, `SOIR`) : après le souper, chacun,
    avec `CHANCE` 0,35, va voir un ami (plutôt un voisin, plutôt le plus lié) ; il frappe, l'ami sort, ils causent
    (`REPLIQUES.soiree`, 🌙), une heure au plus (`DUREE`), une visite par `PAR` (3) villageois au plus chaque soir ;
    la promenade à deux d'I3b+ continue.
- **Les foyers** : deux proches (`FOYER.PALIER`) peuvent vivre ensemble si le joueur le leur propose (le bouton
  « 🏡 Leur proposer un foyer » de la fiche, `formerFoyer`, la commande `villageois.foyer`) dans une maison à deux lits
  (une maison de villageois avec deux lits d'adulte que la famille ne prend pas, où n'habite personne d'autre
  qu'eux : `maisonsPourFoyer`) : ils s'y installent, chacun son lit, mangent à sa table s'il y en a une ; l'autre
  maison se libère (un nouveau venu pourra la prendre). `verifierMaisons` laisse à chacun son lit sous un toit
  partagé ; rien ne les sépare. **L'enfant** : un foyer dont la maison a un lit d'enfant libre peut en accueillir un
  si le joueur le propose (« 👶 Accueillir un enfant », `accueillirEnfant`, `villageois.enfant`) : il vient par le
  prochain bac (le seul nouveau venu de ce passage ; la nuit l'installe d'un coup s'il n'est pas venu), dort dans le
  lit d'enfant, mange (le besoin d'un enfant), ne travaille pas (`attribuer` refuse) et joue sur la place (le but
  « jeu », 🪁) ; ses parents et lui sont proches dès son arrivée (`ENFANT.PARENTS` 85). Il ne compte pas dans le
  plafond du port. La scène lui donne la planche d'un enfant.
- **La scène** (`villageois-social.js`, `villageois.js`) : le banc à deux (assis, ils causent), la visite du soir et
  le repas apporté se jouent comme une visite (il frappe, l'ami sort, ils se font face et causent), avec leur emoji
  (🍲 🌙) gardé pendant la causerie ; le salut des amis et des proches (degré 3) comme avant. **Les bulles ne se
  recouvrent plus** : celles de ceux qui parlent ensemble (un salut à trois, une table, une causerie) sont placées
  l'une après l'autre dans l'image ; celle qui en chevauche une monte au-dessus (sinon passe dessous).
- **L'interface** (`js/ui/liens.js`) : la fiche d'un villageois montre son foyer et ses liens (un portrait, le palier,
  une jauge, du plus fort au plus faible ; un appui ouvre la fiche de l'autre), « 🏡 Leur proposer un foyer » pour un
  proche (la liste des maisons qui conviennent, sinon ce qu'il faut bâtir), « 👶 Accueillir un enfant » ; la liste
  des villageois mène à **la vue d'ensemble** (« 🤝 Les liens du village » : les foyers, puis les proches, les amis,
  les camarades, deux portraits et une jauge par paire). Les avis de la nuit deviennent des notifications (« 😊 X et Y
  sont devenus amis », « 💞 … proches », « 🏡 … s'installent ensemble », « 👶 … est arrivé par le bac », « 🍲 X a
  apporté un repas à Y »).
- **Les propos** (`VILLAGE.PROPOS`, `villageois-amitie.js`) : les sujets des habitants, rebranchés sur les liens de
  l'île : `voisin` (son plus proche voisin qu'il connaît), `lien_ami` (son meilleur ami), `visite_recue`,
  `visite_faite` (une visite du soir), `entraide_recue`, `entraide_donnee` (un repas apporté), et `foyer`, `enfant`.
  Ce qui se passe rejoint les événements entre voisins (`voisins.js` `noterEvenement`, hameau « village », `RECENT`
  jours, `EVENEMENTS` gardés) : rien n'est recopié.
- **La sauvegarde** : format 92 ; la migration 91 → 92 (`reparerLiens`) pose des liens vides (les paires partent de
  leur estimation à la première nuit) et répare ce qui est abîmé (un id ou un chiffre illisible, un foyer dont un
  membre n'est plus là, une entraide vers personne). Sans villageois, rien.
- **Les tests** : `tests/engine/village-liens.test.mjs` (l'affinité gardée et ses causes, une à une, jamais de baisse,
  la moitié au-delà de LENT ; les paliers et le degré ; camarades puis amis au même poste ; le bonheur ; le travail à
  deux ; l'entraide de bout en bout ; le banc à deux, à table près d'un ami, la visite du soir ; le foyer ; l'enfant ;
  le déterminisme ; la sauvegarde et les commandes ; éteint). `village-social` suit les nouveaux paliers ;
  `village-amitie` laisse dire aux villageois `voisin`, `lien_ami`, `visite_*`, `entraide_*` (ceux de l'île) ;
  `voisins.test.mjs` est vert réglage éteint. Éteint, le CSV de la simulation est le même octet pour octet.
- **Les mesures** (comme I3b+ : Chromium, téléphone émulé 412 × 915, DPR 2, processeur ralenti × 4 ; 15 villageois
  installés, la place à 15 h ; trois fenêtres de 6 s ; deux paires de mesures avant → après, chaque fois une partie
  neuve, donc une autre ferme ; la machine chargée, charge 2,3 à 2,9 sur 4 cœurs) : le système « villageois » coûte 1,64
  et 2,05 ms par passage avant, 1,67 et 1,69 ms après (10 à 15 villageois à l'écran) : pas d'écart au-delà du bruit. Le
  temps d'une image (médiane, 19 à 32 ms) varie surtout avec le soleil et le brouillard de la ferme tirée. Dans le
  moteur (Node), la nuit des liens à 15 villageois (105 paires) relit la journée gardée ; la journée se recalcule une
  fois par jour, comme avant (sa clé compte maintenant la signature des liens).
- **Vérifié dans Chromium** (`jeu.html?village=1`, quatre villageois, la place avec deux bancs côte à côte, une maison
  à deux lits) : deux villageois au fauchage, partis de 12, sont camarades après 2 nuits et amis après 5 (« 😊 Achille
  et Garance sont devenus amis »), le travail à deux leur donne 9 actions au lieu de 8 ; ils mangent ensemble à la table
  commune et causent ; l'une au repos, l'autre lui apporte un repas à midi (🍲, « Toc, toc ! », « Tiens, c'est pour
  toi. Repose-toi bien. » — « Tu es trop gentil, Achille. ») ; deux amis assis côte à côte sur deux bancs ; une visite
  du soir (« J'ai vu ta lumière, alors je passe. ») ; proches, la fiche propose un foyer, ils s'installent dans la
  maison à deux lits et y dorment côte à côte ; la vue d'ensemble des liens ; quatre bulles à table ne se recouvrent
  plus (avant : empilées l'une sur l'autre). Aucune erreur dans la console.
- Reste : le même commerce (I5a) et les fêtes (I8a) comme causes de lien ; les traits et leurs affinités (I6c) ; un
  repas apporté ne nourrit pas (choix B-1 : pas de nourriture tirée de rien) ; l'enfant ne grandit pas ; à table, une
  table de jardin d'une case ne laisse pas de « côte à côte » (ses quatre sièges se touchent tous) ; le joueur
  automatique ne propose ni foyer ni enfant ; les liens en ligne (I9d).

## Les règles qui ne changent pas

- **Sans pénalité** (B-1) : un villageois mal nourri se repose, il ne part pas ; une commande du bac
  manquée ne coûte rien ; rien ne se perd par absence.
- **Chiffres entiers** partout (pièces, énergie, parts en %).
- **Le hasard à graine** : villageois, traits, liens et commandes du bac se tirent de la graine de la
  partie ; la même partie rejoue la même chose.
- **La vue à 45°** pour tout nouveau dessin (`CLAUDE.md`).
- **Le français** dans le code, les commentaires et les textes.
