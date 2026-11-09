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

## Lot 2 : la première semaine (à faire)

| Jour | Thème | Objectifs |
|---|---|---|
| 1 | S'installer | Poser l'Atelier (3 pierres, 3 bois) · Préparer le potager (la houe, labourer 3 cases, semer les carottes offertes) |
| 2 | L'eau | Le puits et la cruche, arroser · La faux, faucher 6 fibres (la visite de bienvenue) |
| 3 | Les outils | La hache et la pioche · Abattre un arbre et replanter sa graine · Casser un rocher |
| 4 | La cuisine | La cuisinière, posée dans l'abri · Un premier plat · Le repas du soir en famille |
| 5 | Le grand monde | La carte du monde, sortir de la ferme · Une prise dehors · Rencontrer la calèche |
| 6 | La première récolte | Récolter les carottes · En vendre à la calèche · Replanter |
| 7 | Le hameau voisin | La boussole vers le hameau, y aller · Parler à un habitant |

Chaque jour fini rapporte une récompense (XP, pièces, un objet). Les explications de l'interface viennent quand
elles servent (l'énergie quand elle baisse, l'argent à la calèche).
