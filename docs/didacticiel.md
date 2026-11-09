# La refonte du didacticiel

Le didacticiel d'une nouvelle partie (31 étapes en une seule file : `js/engine/didacticiel.js`,
`js/ui/didacticiel.js`) est refondu en trois lots :

1. **L'abri de départ** (ce lot) : la partie commence avec un abri déjà bâti.
2. **Les objectifs du jour** : un carnet (une pastille « Jour 1 · 1/3 » sous l'horloge, qui s'ouvre en carnet,
   avec « Montre-moi ») remplace la file d'étapes ; la première semaine est écrite à la main. Un objectif pas
   fini reste : le jour suivant commence quand le précédent est fini.
3. **Les objectifs tirés chaque jour** après la première semaine, selon le niveau et ce qui est débloqué ; les
   chapitres restent les grands buts.

Les parties déjà commencées gardent leur didacticiel.

## Lot 1 : l'abri de départ (`js/engine/abri-depart.js`)

Une nouvelle partie sur la ferme générée (`commencerDidacticiel`) commence avec un abri en bois, près de
l'endroit où le personnage apparaît :

| | |
|---|---|
| Taille | `DIDACTICIEL.ABRI` (`data/general.json`) : 6 × 3 cases dedans (8 × 5 avec les murs) |
| Murs | en bois (`MATIERE` : `mur_bois`) ; la porte dans le mur du bas, devant la 4ᵉ case du dedans (`PORTE` : 3) |
| Sol | un plancher (`SOL` : `plancher`) sur les 18 cases du dedans |
| Paillasses | une par membre de la famille (1 à 6), sur la rangée du haut |
| Place libre | la rangée du bas : le four (2 cases) et la cuisinière (1) s'y posent sans agrandir ; la case derrière la porte reste le passage |

L'emplacement : de l'herbe libre (sans herbe haute, ni arbre, ni rocher, ni terre labourée), hors de la Zone de
culture, où rien n'est à ramasser le premier jour, à au moins deux cases de la case de départ, avec une case
libre devant la porte ; le plus près possible, en spirale (`placeAbriDepart`). Les blocs sont posés comme le
joueur les poserait (`poserBloc`) : les murs, la porte, le plancher, puis les paillasses. Le brouillard du départ
se lève autour de lui. `state.abriDepart` garde son plan.

Le didacticiel actuel s'y adapte sans migration : ses étapes de l'abri (les ressources, les arbres, la
fabrication, la construction, les paillasses) passent d'elles-mêmes, et l'étape des fibres ne compte plus que
celles de la hache et de la pioche. Le chapitre 1 (« Bâtir le foyer ») est fait dès le départ.

Tests : `tests/engine/abri-depart.test.mjs`.

## Lot 2 : les objectifs du jour (`js/engine/objectifs.js`, `js/ui/objectifs.js`)

Une nouvelle partie (`commencerObjectifs`, depuis l'accueil) commence dans son abri avec la première semaine
d'objectifs (`OBJECTIFS.SEMAINE`, `data/general.json`) ; elle n'a plus l'ancien didacticiel (les parties
commencées le gardent).

**Le moteur.** Chaque jour a 2 ou 3 objectifs, chacun ses tâches :
- **etat** : ce qui doit être vrai (l'Atelier posé, la houe, le puits, la cruche, la cuisinière posée, sortie de
  la ferme, une prise dans le monde, la boussole vers un hameau, un hameau découvert…) ; une fois atteint, il
  le reste (`atteints`) ;
- **compte** : ce qui est fait depuis le début du jour, noté par les gestes (`objectifs-compte.js`,
  `noterObjectif`) : chaque action qui rapporte de l'XP (`levels.js gainActionXp` : labourer, planter,
  arroser, faucher, cueillir, récolter, vendre…), les baies d'un buisson de la ferme (`atelier.js ramasser` : c'est
  cueillir), un arbre abattu, un rocher cassé (`outils.js`,
  `monde-recolte.js`), la carte du monde ouverte, la calèche rencontrée (ou une vente), un habitant à qui l'on
  parle (`recit.js paroleHameau`).

Le jour fini (`majObjectifs`, à chaque rendu), sa récompense (XP, pièces, objets) ; le jour suivant commence le
lendemain matin, ses compteurs à zéro. Un jour pas fini reste. Ce qu'un jour offre en arrivant : les graines
du premier potager (jour 1), le sac à provisions (jour 5, avant de sortir de la ferme). La semaine faite, les
objectifs s'arrêtent (le lot 3 les tirera chaque jour).

**Le carnet.** Une pastille « 📜 Jour 1 · 0/2 » sous l'horloge (sous la boussole quand elle est là) ; touchée,
le carnet s'ouvre : le titre du jour, ses objectifs (cochés, leur compte), la récompense et **Montre-moi**.
Montre-moi guide la première tâche à faire : la bulle du didacticiel en bas de l'écran, l'anneau sur ce qu'il
faut toucher, le cercle sur la carte ; il passe de lui-même à la tâche suivante, « Arrêter » le range. Ses
bulles sont celles des étapes du didacticiel (`ETAPES_UI`), et quelques autres (`GUIDES`).

| Jour | Thème | Objectifs |
|---|---|---|
| 1 | S'installer | Poser l'Atelier · Préparer le potager (la houe, labourer 3 cases, semer) — 6 graines de carotte offertes |
| 2 | L'eau | Arroser (le puits, la cruche, un arrosage) · Faucher (la faux, 6 touffes) |
| 3 | Les outils | La hache et la pioche · Abattre un arbre · Casser un rocher |
| 4 | Le confort | Poser la cuisinière dans l'abri · Cueillir des baies · Arroser |
| 5 | Le grand monde | Ouvrir la carte du monde · Sortir de la ferme · Récolter dehors — le sac à provisions offert |
| 6 | La première récolte | Récolter une culture · Rencontrer la calèche · Replanter |
| 7 | Le hameau voisin | Mener la boussole au hameau · Y aller · Parler à un habitant |

(Le jour 4 ne demande pas encore de cuisiner : les premières recettes demandent des ingrédients qu'on n'a pas si
tôt ; les objectifs tirés chaque jour, ensuite, y viendront.)

Tests : `tests/engine/objectifs.test.mjs`.

## Lot 3 : les objectifs tirés chaque jour (`OBJECTIFS.TIRES`)

Après la première semaine, chaque nouveau jour tire ses objectifs (`entrer` : `state.objectifs.tire`) :
- **NOMBRE** (3) objectifs différents, tirés dans **LISTE** parmi ceux que la partie peut faire (`si` : la houe,
  le puits, la faux, la hache, la pioche, la canne, la cuisinière posée, la calèche qui commerce, des poules, des
  vaches, un hameau découvert ; sans `si`, toujours) ; le tirage suit la graine de la partie et le jour ;
- chacun est un compte (récolter, semer, arroser, labourer, faucher, abattre, casser, cueillir, cuisiner,
  gagner des pièces à la calèche, pêcher, les œufs, le lait, parler aux habitants) ; son nombre suit le niveau :
  `base + parNiveau × (niveau − 1)`, au plus `max` ;
- la récompense du jour (XP et pièces) grandit avec le niveau (`RECOMPENSE`) ;
- **un objectif se change par jour** (`CHANGER` ; le bouton ↻ du carnet, `changerObjectif`) : un autre est
  tiré à sa place, jamais un de ceux du jour ;
- comme la semaine : le jour fini, sa récompense ; le suivant le lendemain matin ; un jour pas fini reste.

Le carnet titre ces jours « Jour 8 — Les objectifs du jour ». Montre-moi a une bulle pour chacun (cuisiner,
pêcher, les œufs, le lait s'ajoutent à celles de la semaine).
