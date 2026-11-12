# Fiche I3b — La vie des villageois sur la ferme

## Objectif

Faire vivre les villageois sous les yeux du joueur : ils se lèvent, sortent, vont et viennent sur la
terre du joueur, mangent, rentrent, dorment, sans traverser les murs ni se marcher dessus. Ils sont
toujours à l'écran : la fluidité est un critère de la fiche.

## Contexte

- I3a (`state.villageois`, la maison, le lit).
- La scène des habitants, à reprendre : `js/carte/ferme/habitants.js` (951 lignes : horaires, trajets,
  gestes, bulles, `EVITE`), `data/monde.json` (`HABITANTS.HORAIRE`, `PHRASES`).
- La famille sur la carte : `js/famille-ferme.js` (trajets, repas, sommeil, les sièges :
  `js/carte/ferme/sieges.js`), les fiches 16, 16b, 32b ; `js/fermier.js` (la marche, `path`).
- Le socle : `js/carte/comportement.js` (machine à états, perception, séparation, hasard à graine),
  les fiches 31 et 32 ; `js/carte/ordonnanceur.js` (la fiche 33 : le budget par image).
- Les mesures : `docs/perf.md`, `js/ui/mesures.js`, `tests/engine/perf-ferme.test.mjs`.

## À faire

1. **La scène** (`js/carte/ferme/villageois.js`), bâtie sur le socle des comportements (pas une
   nouvelle machine à la main) : les états lever, dehors, repas, flâner, rentrer, dormir, repos. Les
   horaires viennent de `VILLAGE.HORAIRE` (d'après `HABITANTS.HORAIRE`).
2. **Les lieux de la journée** : sa maison, la table où il mange (celle de sa maison, sinon la table
   commune dehors), un banc ou la place quand il flâne, l'abri sous la pluie (`meteo.js`). Il
   s'assoit sur les sièges libres, comme la famille.
3. **La marche** : par les cases libres et de préférence par les chemins posés ; il contourne le
   joueur, la famille, les bêtes ; il ouvre les portes ; il ne reste jamais coincé (un trajet
   impossible : il y est d'un coup hors de la vue, sinon il renonce et flâne).
4. **Loin de la vue** : aucun calcul de trajet ni d'image ; sa position se déduit de l'heure et de
   son horaire (le même principe que la tournée de la calèche, `caleche-tournee.js`), pour que deux
   joueurs voient la même chose plus tard (I9d).
5. **Parler** : un appui ouvre sa bulle (salut selon l'heure, ce qu'il fait, son humeur), tirée de
   `PHRASES` ; pas de fenêtre de dialogue.
6. **La nuit** : le toit effacé montre le villageois dans son lit ; les fenêtres de sa maison
   s'éclairent le soir.
7. **Les mesures**, avant et après, sur une ferme bâtie : le temps d'une image avec 0, 5, 10 et 15
   villageois à l'écran, sur un téléphone de milieu de gamme émulé. Borne proposée : pas plus de
   1 ms par image pour 15 villageois ; sinon dire ce qui coûte.
8. **Les tests** : la position déduite de l'heure est déterministe ; un villageois ne finit jamais
   dans un mur (un lot de fermes générées) ; `comportement.test.mjs` et `famille-visible.test.mjs`
   restent verts.

## Hors périmètre

- Les gestes de travail et les postes (I3c) ; les mimiques (écartées, `docs/ile.md` D6) ; les liens
  entre villageois (I6b).

## Critères d'acceptation

- Dans Chromium : le matin, les villageois sortent ; à midi et le soir, ils mangent assis ; sous la
  pluie, ils s'abritent ; la nuit, ils dorment ; on leur parle ; aucun ne traverse un mur en dix
  minutes d'observation.
- Les mesures tiennent la borne, ou l'écart est expliqué.

## Vérifications et livraison

Celles du README du chantier. Avant de figer les horaires et les vitesses, proposer deux ou trois
réglages filmés (GIF) et faire choisir, comme la fiche 32. Captures : matin, repas, pluie, nuit.
