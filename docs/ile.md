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
| L'argent s'empile-t-il encore, la vente n'étant pas bornée ? | I1c, I4 | À mesurer par la simulation ; régler les prix des niveaux du port et la part. |
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
| 1. Le port | I1a (fait), I1b (fait), I1c | Le bâtiment, le commerce, le bac, les commandes et le catalogue d'import |
| 2. Le chemin | I2 | Le chemin de la ferme au port, modifiable ; porter la marchandise |
| 3. Les villageois | I3a (fait), I3b (fait), I3b+ (fait), I3c, I3d | L'arrivée, la vie sur la ferme, la vie sociale, les tâches, le tableau |
| 4. Les prix | I4 | Des filières qui paient, la part du villageois, la bourse dépensée |
| 5. Les artisans | I5a, I5b, I5c | L'atelier et la boutique, la forge, la mercerie, les autres commerces |
| 6. Les liens | I6a, I6b, I6c | L'amitié avec le joueur, les liens entre villageois, les traits |
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
- Reste : le chemin du port est long (I2 : le portage) ; le bac, les commandes et l'import (I1c) ; les prix (I4).

## Les villageois : l'arrivée (I3a, fait)

- **Le modèle** (`js/engine/villageois.js`) : `state.villageois`, une liste d'adultes seuls (`id`, `prenom`, `genre`,
  `perso`, `apparence`, `gouts`, `maison`, `lit`, `bourse`, `bonheur`, `faim`, `arrive`, `repos`, `accueil`,
  `sansMaison`, `avis`, `journal`). Le champ ne naît qu'avec le premier villageois : éteint, une partie neuve est
  celle d'avant (format 87 ; la migration 86 → 87 ne fait que réparer une liste abîmée).
- **La maison libre** : une pièce close du genre maison, marquée par une **boîte aux lettres** (un bloc fabriqué à
  l'Atelier, posé dehors contre sa porte : `blocs.js`, `maisonsMarquees`), avec un lit que la famille ne prend pas ;
  la famille dort d'abord dans les autres lits (`couchages`). Un villageois par maison.
- **L'arrivée** (`VILLAGE.ARRIVEE`) : un jour de bac (avant I1c, tous les `PERIODE` jours ; `jourDeBac` lira le bac
  du port), de `HEURE` à `FIN` h ; le premier dès la première maison libre ; les suivants s'il y a de quoi manger
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
  matin et 0,4 l'après-midi, `CHEMIN` 1,5. Les tâches (I3c) prendront des créneaux à la place des sorties.

## Les villageois : la vie sociale (I3b+, fait)

À la demande de l'utilisateur, après I3b : « que les villageois paraissent plus liés les uns aux autres », qu'on sente
une communauté. Rien n'est sauvé (pas de nouveau format) : tout se déduit de la graine, du jour, des maisons et de
l'heure, comme la journée de I3b ; loin de la vue, rien ne s'anime.

- **Qui se connaît** (`js/engine/villageois-liens.js`) : `connaissance(state, a, b)` → `{ degre, nom, score, jours }`
  (0 inconnu, 1 connaissance, 2 ami). Le score (0 à 100) : `PAR_JOUR` par jour passé ensemble sur l'île (depuis
  l'arrivée du second), plus `VOISIN` si leurs boîtes aux lettres sont à `VOISINE` cases au plus, plus `TABLE` s'ils
  mangent à la même table, plus une affinité tirée de la graine et des deux ids (0 à `AFFINITE`) ; connaissance dès
  `PALIERS.connaissance` (10), ami dès `PALIERS.ami` (40). La famille du joueur (`b = 'famille'`) : connue dès
  l'arrivée, amie après `FAMILLE_AMI` jours (4). `liensDuVillage` (toutes les paires, gardées pour le jour),
  `liensPourLaCarte` (le modèle de la carte). **I6b le remplacera** par l'affinité sauvegardée : seul le corps de
  `scoreDe` change (le commentaire du module et la fiche I6b le disent).
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
- Reste : l'affinité sauvegardée et ce qu'elle change (I6b) ; la visite du soir et s'asseoir côte à côte (I6b) ;
  le port quand son chemin sera court (I2) ; les tâches prendront des créneaux (I3c).

## Les règles qui ne changent pas

- **Sans pénalité** (B-1) : un villageois mal nourri se repose, il ne part pas ; une commande du bac
  manquée ne coûte rien ; rien ne se perd par absence.
- **Chiffres entiers** partout (pièces, énergie, parts en %).
- **Le hasard à graine** : villageois, traits, liens et commandes du bac se tirent de la graine de la
  partie ; la même partie rejoue la même chose.
- **La vue à 45°** pour tout nouveau dessin (`CLAUDE.md`).
- **Le français** dans le code, les commentaires et les textes.
