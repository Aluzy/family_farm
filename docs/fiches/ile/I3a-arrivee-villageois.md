# Fiche I3a — L'arrivée d'un villageois

## Objectif

Faire arriver un villageois sur l'île et l'installer : le joueur bâtit une maison libre, un nouveau
venu débarque, s'y installe, y dort et y mange. Il ne travaille pas encore (I3c).

## Contexte

- `docs/ile.md` (D3, « Sans pénalité »).
- Le moteur des habitants, à reprendre : `js/engine/habitants.js` (un foyer : `membres`, `bourse`,
  `garde`, `bonheur`, `journal` ; le tirage à graine des prénoms et des personnages ; la journée
  d'un foyer la nuit), `data/monde.json` (`HABITANTS` : `PRENOMS`, `PERSOS`, `APPARENCE`, `ARGENT`),
  `js/engine/apparence.js`, `tests/engine/habitants.test.mjs`, `habitants-apparence.test.mjs`.
- Les pièces closes et les lits : `js/engine/blocs.js` (`couchages`, les pièces closes, le foyer),
  la fiche 17 (choisir son lit). Les repas : `js/engine/repas.js` (la boîte à nourriture,
  `FAMILLE.FAIM`), `js/engine/family.js`, `js/engine/bonheur.js`.
- Un visiteur qui vient à la ferme : `js/engine/bienvenue.js`, `js/carte/ferme/visite.js`.

## À faire

1. **Le modèle** (`js/engine/villageois.js`, qui reprend de `habitants.js` ce qui sert et laisse le
   reste) : `state.villageois = [{ id, prenom, genre, perso, maison, lit, bourse, bonheur, faim,
   arrive (le jour), journal: [] }]`. Un villageois est un adulte seul dans cette fiche (les couples
   et les enfants viennent avec I6b).
2. **Une maison libre** : une pièce close de la terre du joueur avec un lit que personne de la
   famille n'a choisi, marquée « à un villageois » par un bloc clé (une **boîte aux lettres**, à
   l'Atelier). Le moteur la reconnaît (`maisonsLibres(state)`).
3. **L'arrivée** (`VILLAGE.ARRIVEE`) : un candidat débarque un jour de bac (avant I1c : tous les
   `PERIODE` jours) s'il y a une maison libre, de quoi nourrir une bouche de plus (la boîte à
   nourriture couvre `RESERVE_JOURS` jours de plus) et, à partir du deuxième, si le port a le niveau
   qu'il faut (`PLAFOND[niveau du port]`). Le premier vient dès la première maison libre. Un seul
   par passage. Tiré à la graine : prénom, personnage, goûts (ceux d'`amitie.js`).
4. **L'accueil** : il marche du port à sa maison (comme la visite de bienvenue ; loin de la vue, il y
   est d'un coup), frappe, une bulle d'une ligne ; une notification ; la carte du joueur compte les
   villageois.
5. **Sa vie simple**, la nuit (`night.js`) : il mange à la boîte à nourriture commune (50 d'énergie,
   `FAMILLE.AJ.adulte`), dort dans son lit ; son bonheur suit les règles de `bonheur.js` (les plats,
   la variété, sa maison meublée). Mal nourri ou sans lit : il se repose le lendemain (un drapeau
   `repos`), il ne part pas.
6. **La fiche du villageois** (un appui sur lui) : prénom, maison, humeur, depuis quand il est là.
7. **Retirer la maison** : si son lit ou sa pièce disparaît, il dort à l'abri et attend une maison ;
   on le dit au joueur.
8. **La sauvegarde** : `state.villageois` ; format + 1, migration, test.
9. **Les tests** (`village-arrivee.test.mjs`) : la maison libre reconnue ; les conditions d'arrivée ;
   le tirage déterministe, deux villageois jamais identiques ; le repas pris à la boîte commune ; le
   repos sans départ ; la maison retirée.

## Hors périmètre

- Sa présence animée sur la ferme dans la journée (I3b), ses tâches (I3c), l'amitié (I6a).
- Les habitants des hameaux : inchangés jusqu'à I7e.

## Critères d'acceptation

- Dans Chromium, `?village=1` : on bâtit une pièce, un lit, une boîte aux lettres ; au passage
  suivant, un villageois arrive du port, s'installe ; la nuit, il dort dans son lit ; la boîte à
  nourriture baisse d'une part de plus.
- La famille du joueur et son bonheur sont inchangés.

## Vérifications et livraison

Celles du README du chantier. Captures : la maison libre, l'arrivée, la fiche, la nuit.
