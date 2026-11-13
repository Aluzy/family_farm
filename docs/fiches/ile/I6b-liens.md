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

## Ce qui est déjà fait (I3b+, la vie sociale)

Posé après I3b, à la demande de l'utilisateur (des liens visibles entre villageois), sans rien sauver :

- **Qui se connaît** (`js/engine/villageois-liens.js`) : `connaissance(state, a, b)` → `{ degre (0 inconnu, 1
  connaissance, 2 ami), nom, score (0 à 100), jours }`, déduit chaque jour des jours passés ensemble sur l'île
  (depuis l'arrivée du second), des maisons voisines, de la table commune et d'une affinité tirée de la graine et
  des deux ids (`VILLAGE.SOCIAL.CONNAISSANCE`) ; la famille du joueur (`b = 'famille'`) : connue dès l'arrivée, amie
  après `FAMILLE_AMI` jours. `liensDuVillage` (toutes les paires, gardées par jour), `liensPourLaCarte` (le modèle de
  la carte). **I6b remplace le calcul** : seul le corps de `scoreDe` (le score de la paire) change, pour lire
  l'affinité sauvegardée ; les paliers « connaissance » et « ami » deviennent ceux de la fiche (connaissance,
  camarade, ami, proche : `degre` pourra monter à 3) ; ceux qui lisent (la journée, la scène, les répliques) ne
  changent pas.
- **Les habitudes** (le point 2, en partie) : les sorties ont un but tiré d'après qui se connaît
  (`villageois-journee.js`) : une visite chez un ami (il frappe, l'ami sort, ils causent devant la maison), un
  rendez-vous à deux ou trois sur la place ou au puits (en petit cercle), une promenade à deux entre amis.
- **La scène** (le point 4, en partie : `js/carte/ferme/villageois-social.js`) : deux villageois qui se connaissent
  et se croisent s'arrêtent, se saluent (une émotion, deux répliques) ; des amis font un bout de chemin ensemble ;
  debout, on tourne la tête vers un ami qui passe ; le personnage du joueur reçoit un salut.
- **Les répliques** : `VILLAGE.SOCIAL.REPLIQUES` (par degré, moment, météo, humeur, ce qu'ils font) et
  `echangeVillageois`.

## Ce qui reste (pour cette fiche)

- Le modèle sauvegardé (`js/engine/liens.js`, l'affinité qui monte selon ce qu'ils vivent, les paliers nommés, la
  demi-matrice dans la sauvegarde, format + 1, migration) : il remplace `scoreDe`.
- L'entraide, le bonheur, le travail à deux, les couples et les foyers, les enfants (points 2 et 3).
- S'asseoir côte à côte (aux repas, sur un banc), la visite du soir (après le souper, pas seulement le jour).
- L'interface (point 5), les sujets de `PROPOS` (point 6), les tests `village-liens.test.mjs` (point 8).

## Hors périmètre

- Les traits et leurs affinités (I6c) ; les fêtes (I8a) ; les liens en ligne (I9d).

## Critères d'acceptation

- Dans Chromium : deux villageois placés au même poste deviennent camarades en quelques jours, puis
  amis ; ils mangent ensemble ; l'un apporte un repas à l'autre en repos ; on leur bâtit une maison à
  deux lits, ils s'y installent.

## Vérifications et livraison

Celles du README du chantier. Captures : la fiche et ses liens, un repas entre amis, une visite du
soir, un foyer à deux.
