# Fiche I7b — Le nouveau départ

## Objectif

Refaire le début d'une partie pour l'île à bâtir : on arrive seul ou en famille, sur une terre vierge
où il n'y a qu'un abri, et le didacticiel mène du premier ramassage à la première vente au port, sans
discours.

## Contexte

- `docs/ile.md` (« Le jeu visé »). I1b (le port), I3a (le premier villageois), I7a (les paliers).
- Le départ : `js/engine/depart.js`, `js/ui/depart.js` (composer la famille : 1 à 6 membres, au
  moins un adulte, jusqu'à 3 chiens ou chats ; la graine), `js/engine/abri-depart.js`
  (`DIDACTICIEL.ABRI`), `data/general.json` (`DEPART.PIECES_SAUVAGE` : 300, `DIDACTICIEL`),
  la fiche 18.
- Le didacticiel : `js/engine/didacticiel.js` (380 lignes), `js/ui/didacticiel.js`,
  `js/carte/ferme/didacticiel.js`, `docs/didacticiel.md`, `js/ui/ecran-titre.js`.
- La visite de bienvenue d'un habitant : `js/engine/bienvenue.js` (elle disparaît : il n'y a
  personne sur l'île au début).
- La ferme générée : `js/engine/ferme-generee.js` (les chemins tracés sur la ferme).

## À faire

1. **L'écran de départ** : « seul » en un appui (un adulte, sans compagnon), ou composer sa famille
   comme aujourd'hui. On nomme son île (un nom proposé, modifiable ; I7g le gardera). Aucun texte
   d'histoire : une phrase, « Une île, un abri, un port. Tout est à bâtir. »
2. **La terre vierge** : avec `ACTIF`, la ferme générée n'a pas de chemin intérieur ; le seul chemin
   est le tronçon de l'abri à la sortie puis au port (D8). L'abri reste tel quel.
3. **Seul** : vérifier que tout marche avec un seul membre (les repas, la boîte à nourriture, le
   compagnon absent, le bonheur) ; corriger ce qui suppose un second adulte.
4. **Le didacticiel**, par gestes et flèches, une ligne par étape : ramasser bois et pierres ; bâtir
   l'Atelier ; la houe, labourer, semer, arroser à la cruche ; première récolte ; **suivre le chemin
   jusqu'au port** (la boussole le montre) ; **vendre** sous la halle et acheter des graines ; bâtir
   une maison libre (un lit, une boîte aux lettres) ; **accueillir le premier villageois** et lui
   donner une tâche. Chaque étape peut être passée ; rien ne bloque.
5. **Le premier jour sans visite** : pas de visite de bienvenue avec `ACTIF` ; le plat qu'elle
   offrait est dans l'abri.
6. **Les pièces de départ** : revoir `PIECES_SAUVAGE` avec la simulation (le port est loin : la
   première vente arrive plus tard qu'avec la calèche qui passait à 10 h).
7. **Les tests** (`village-depart.test.mjs`) : une partie seule et une partie à six démarrent et
   passent le didacticiel jusqu'au premier villageois (le joueur automatique) ; pas de chemin
   intérieur sur la ferme ; `abri-depart.test.mjs` vert.

## Hors périmètre

- Retirer `bienvenue.js` et l'ancien didacticiel (I7c, I7d) ; l'aide et l'encyclopédie (I7d).

## Critères d'acceptation

- Dans Chromium, `?village=1` : une partie « seul » commence en trois appuis ; on va du premier
  ramassage au premier villageois en suivant les flèches, sans rien avoir à lire de plus d'une
  ligne ; on peut tout passer.
- Faire jouer le début à quelqu'un qui ne connaît pas le jeu (`docs/test-utilisateur.md`) et noter
  où il hésite.

## Vérifications et livraison

Celles du README du chantier. Captures : l'écran de départ, la terre vierge, cinq étapes du
didacticiel, l'arrivée au port.
