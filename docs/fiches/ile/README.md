# Les fiches du chantier « l'île à bâtir »

Le plan, les décisions (D1 à D10) et l'ordre des fiches sont dans [`docs/ile.md`](../../ile.md) : le
lire avant toute fiche. Une fiche est confiée à un agent indépendant et donne une PR, comme celles du
grand monde ([`docs/fiches/README.md`](../README.md), dont les conventions s'appliquent toutes).

## Conventions propres à ce chantier

- **Le réglage** : tout se fait derrière `VILLAGE.ACTIF` (`data/village.json`). Le code neuf est lu
  quand il vaut `true` ; avec `false`, le jeu et ses tests sont ceux d'avant, au pixel près. Les tests
  d'une fiche forcent `true` (l'aide de test posée par I0a).
- **Les réglages** vont dans `data/village.json` (sections `VILLAGE`, `PORT`, `TACHES`, `ARTISANS`,
  `TRAITS`), avec leur commentaire `//SECTION` en phrases, comme les autres fichiers de `data/`.
- **Les noms** : on dit « villageois » (plus « habitant »), « port » (plus « calèche » ni « Marché »),
  « île » et « village » (plus « hameau »), dans le code neuf et dans les textes du jeu.
- **Pas de récit** : aucune fiche n'ajoute de personnage écrit, de scène ni de dialogue. Les phrases
  des villageois tiennent en une bulle et sortent de `HABITANTS.PHRASES` et `PROPOS` (et, depuis I3b+, des
  petits échanges entre villageois de `VILLAGE.SOCIAL.REPLIQUES` : deux répliques, une bulle chacune, sans
  personnage écrit).
- **Vérifications communes** : `npm run build && npm test` (« Tout est vert »), `node tests/smoke.mjs`,
  puis `node scripts/simulate.mjs` à partir de I0b (son code de sortie doit rester 0).
- **Livraison commune** : un commit sur la branche de travail, pas de push ; mettre à jour le tableau
  ci-dessous et `docs/ile.md` (la fiche : fait) ; rendre compte de ce qui est fait, des réglages
  choisis, des mesures, des captures, de ce qui reste.

## Les fiches

| Fiche | Lot | Dépend de | État |
|---|---|---|---|
| [I0a — le réglage de bascule et l'archive](I0a-reglage-et-archive.md) | 0 | — | fait |
| [I0b — le joueur automatique remis d'aplomb](I0b-joueur-automatique.md) | 0 | I0a | fait |
| [I1a — le port sur l'île](I1a-port-sur-l-ile.md) | 1 | I0a | fait |
| [I1b — le commerce au port](I1b-commerce-au-port.md) | 1 | I1a | fait |
| [I1c — le bac, les commandes et le catalogue d'import](I1c-bac-commandes-import.md) | 1 | I1b | fait (le port au niveau 2 à la nuit 31 de la simulation, le palier 6 à la nuit 45 ; voir docs/ile.md) |
| [I2 — le chemin du port, modifiable, et le portage](I2-chemin-et-portage.md) | 2 | I1b | fait (le port reste loin : 1,5 à 2,3 h de jeu à cheval sur le chemin, voir docs/ile.md) |
| [I3a — l'arrivée d'un villageois](I3a-arrivee-villageois.md) | 3 | I0a | fait |
| [I3b — la vie des villageois sur la ferme](I3b-vie-sur-la-ferme.md) | 3 | I3a | fait (réglage « animé » choisi) ; I3b+ (vie sociale : qui se connaît, sorties à but, saluts, causeries) : fait |
| [I3c — les tâches attribuées](I3c-taches.md) | 3 | I3b | fait |
| [I3d — le tableau des villageois](I3d-tableau.md) | 3 | I3c | fait (le coût compte aussi ce que le travail prend au coffre ; le joueur automatique réattribue après deux semaines pleines) |
| [I4 — les prix des filières, la part et la bourse](I4-prix-part-bourse.md) | 4 | I3d, I1b | fait (les prix nouveaux seulement le réglage allumé : le jeu éteint ne bouge pas ; la part de 30 % prise sur le produit ; l'étal, l'achat d'un villageois, l'import à lui ; voir docs/ile.md) |
| [I5a — l'atelier d'artisan, sa boutique, la forge](I5a-artisan-forge.md) | 5 | I4, I6a | à faire |
| [I5b — la mercerie](I5b-mercerie.md) | 5 | I5a | à faire |
| [I5c — la scierie, la boulangerie, la fromagerie](I5c-autres-commerces.md) | 5 | I5a | à faire |
| [I6a — l'amitié avec les villageois](I6a-amitie.md) | 6 | I3b | fait (goûts tirés, pas « par tâche préférée » ; le présent d'un ami donné en main propre) |
| [I6b — les liens entre villageois](I6b-liens.md) | 6 | I6a | fait (l'affinité gardée, les paliers, le bonheur, le travail à deux, l'entraide, le banc à deux, la visite du soir, les foyers et l'enfant ; un repas apporté ne nourrit pas ; voir docs/ile.md) |
| [I6c — les traits de personnalité](I6c-traits.md) | 6 | I6b, I3c | à faire |
| [I7a — les objectifs sans récit](I7a-objectifs.md) | 7 | I0a | fait, sauf le point 6 (le joueur automatique suit les paliers : après I0b) |
| [I7b — le nouveau départ](I7b-nouveau-depart.md) | 7 | I7a, I1b, I3a | à faire |
| [I7c — le récit retiré du moteur](I7c-recit-moteur.md) | 7 | I7a, I6a | à faire |
| [I7d — le récit retiré de l'interface, de l'aide et de l'encyclopédie](I7d-recit-interface.md) | 7 | I7c | à faire |
| [I7e — les hameaux, la calèche et les boucles de chemins retirés](I7e-hameaux-caleche.md) | 7 | I7d, I1c, I2 | à faire |
| [I7f — la migration des parties en cours](I7f-migration.md) | 7 | I7e, I7g, I3a | à faire |
| [I7g — la chronique et les noms](I7g-chronique-et-noms.md) | 7 | I7c | à faire |
| [I8a — la vocation « village »](I8a-vocation-village.md) | 8 | I6b | à faire |
| [I8b — la vocation « ferme productive »](I8b-vocation-productive.md) | 8 | I1c, I4 | à faire |
| [I9a — l'île partagée : la frontière et le poids](I9a-ile-partagee.md) | 9 | I7f | à faire |
| [I9a2 — l'horloge commune](I9a2-horloge-commune.md) | 9 | I9a | à faire |
| [I9b — les changements du monde, synchronisés par région](I9b-synchro-monde.md) | 9 | I9a2 | à faire |
| [I9c — le port et la caisse en ligne](I9c-port-en-ligne.md) | 9 | I9b | à faire |
| [I9d — les villageois en ligne](I9d-villageois-en-ligne.md) | 9 | I9b | à faire |
| [I9e — les tâches, les commerces et les rôles en ligne](I9e-roles-en-ligne.md) | 9 | I9c, I9d | à faire |
| [I9f — mettre son île en ligne et migrer les mondes existants](I9f-mise-en-ligne.md) | 9 | I9e | à faire |
| [I9g — les performances](I9g-performances.md) | 9 | I5c, I6c, I9f | à faire |
| [I9h — la bascule](I9h-bascule.md) | 9 | tout | à faire |
