# Fiche I6b — Les liens entre villageois

## Objectif

Donner aux villageois une vie sociale entre eux : des liens qui naissent et changent selon ce qu'ils
vivent (voisins, compagnons de travail, amis, couples), et qu'on voit dans le village.

## Contexte

- `docs/ile.md` (D3). I3b (la scène), I6a (l'amitié avec le joueur).
- Les liens d'aujourd'hui : `js/engine/voisins.js` (un ami et un cousin par adulte, tirés une fois et
  figés ; l'entraide ; les visites), `data/amitie.json` (`VOISINS`), `tests/engine/voisins.test.mjs`.
- Les foyers : `js/engine/habitants.js` (adultes, enfants, lits), `data/monde.json`
  (`HABITANTS.ADULTES`, `ENFANTS`).
- La perception des voisins : `js/carte/comportement.js` ; les sièges : `js/carte/ferme/sieges.js`.

## À faire

1. **Le modèle** (`js/engine/liens.js`) : entre deux villageois, une **affinité** entière de 0 à
   100, qui monte un peu chaque jour où ils sont voisins (maisons proches), travaillent au même
   poste ou dans le même commerce, mangent à la même table, fêtent ensemble ; elle ne baisse pas
   (B-1 : pas de brouille). Des paliers nommés : connaissance, camarade, ami, proche.
2. **Ce que les liens changent** :
   - **l'entraide** (reprise de `voisins.js`) : un villageois en repos reçoit un repas d'un ami ;
   - **les habitudes** : des amis mangent ensemble, se rendent visite le soir, flânent ensemble ;
   - **le bonheur** : avoir un ami au village monte la cible de bonheur (un réglage) ;
   - **le travail à deux** : deux amis au même poste gagnent une action par jour à eux deux.
3. **Les couples et les familles** : deux proches peuvent former un foyer si le joueur leur bâtit
   une maison à deux lits (il le propose, rien n'est automatique) ; un foyer peut accueillir un
   enfant venu par le bac si la maison a un lit d'enfant. Les enfants ne travaillent pas ; ils
   jouent sur la place (la fiche 7b). Tout reste doux et sans drame : personne ne se sépare.
4. **La scène** : deux villageois liés qui se croisent se saluent d'une bulle courte ; ils
   s'assoient côte à côte ; une visite se voit (il va chez l'autre le soir).
5. **L'interface** : la fiche d'un villageois montre ses liens (portraits, paliers) ; la vue
   d'ensemble du village dessine qui est lié à qui (une liste suffit, pas de graphe).
6. **Ce que disent les villageois** : les sujets `voisin`, `lien_ami`, `visite_*`, `entraide_*` de
   `PROPOS` s'appuient sur les nouveaux liens.
7. **La sauvegarde** : les affinités (une demi-matrice compacte), les foyers ; format + 1,
   migration, test.
8. **Les tests** (`village-liens.test.mjs`) : l'affinité monte selon les causes et ne baisse pas ;
   l'entraide ; le foyer à deux ; l'enfant ; le déterminisme ; `voisins.test.mjs` vert avec
   `ACTIF: false`.

## Hors périmètre

- Les traits et leurs affinités (I6c) ; les fêtes (I8a) ; les liens en ligne (I9d).

## Critères d'acceptation

- Dans Chromium : deux villageois placés au même poste deviennent camarades en quelques jours, puis
  amis ; ils mangent ensemble ; l'un apporte un repas à l'autre en repos ; on leur bâtit une maison à
  deux lits, ils s'y installent.

## Vérifications et livraison

Celles du README du chantier. Captures : la fiche et ses liens, un repas entre amis, une visite du
soir, un foyer à deux.
