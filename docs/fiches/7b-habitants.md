# Fiche 7b — Les habitants des hameaux

## Objectif

Peupler les hameaux bâtis à la 7a : chaque maison a sa famille (adultes, enfants), le hameau a
son métier (bûcheron, pêcheur, mineur, berger, cueilleur), et les familles vivent leurs journées
comme celle du joueur — travailler, produire, manger, dormir, être plus ou moins heureuses —,
d'après le modèle des familles autonomes de l'ancien jeu. On les voit vivre quand on est là ; ce
qu'elles produisent s'entasse dans la réserve du hameau, que la calèche (fiche 7c) viendra
acheter.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 6 et 7a faites ; les décisions : la calèche, les
  habitants), `docs/fiches/README.md`, puis :
  - les hameaux : `js/engine/monde-hameaux.js` (le plan : maisons avec `id`, emprise, porte et
    case devant, pièces, lits, foyer ; le métier du hameau ; les lieux de travail ; la place, les
    jardins, les ruelles), `data/monde.json` (`HAMEAUX`), `js/carte/ferme/hameaux.js` (la scène),
    `state.monde.hameaux` (les hameaux découverts) ;
  - la famille du joueur : `js/engine/family.js`, `js/engine/repas.js`, `js/engine/bonheur.js`,
    `js/engine/night.js` (la nuit), `js/famille-ferme.js` (la famille qui vit sur la carte :
    trajets, repas, sommeil), `js/fermier.js` (la marche, les trajets bornés), les personnages
    `assets/personnages/` (`cases.json`, adultes et enfants) et `js/carte/gestes.js` (hache,
    pioche, canne, faux…) ;
  - les gestes du monde : `js/engine/monde-recolte.js` (6a), `js/engine/outils.js` (pêche, coins de
    pêche), `js/grotte.js` et `js/engine/grotte.js` (les grottes de la montagne, 6b) ;
  - l'ancien modèle, à reprendre et adapter (pas à recopier tel quel) : sur la branche
    `archive/jeu-avant-grand-monde`, `js/engine/voisins.js` (foyers, métiers, bourse, garde-manger,
    repas, bonheur, journal ; `voisinsNuit`), `js/carte/ville/voisins.js`,
    `js/carte/ville/habitants.js`, `js/carte/ville/metiers.js`, `tests/engine/voisins.test.mjs`,
    la section `VOISINS` de `data/general.json` (`git show
    origin/archive/jeu-avant-grand-monde:<fichier>`).

## À faire

1. **Les familles** : chaque maison d'un hameau a un foyer tiré de façon déterministe (graine du
   monde, hameau, maison) : un ou deux adultes, zéro à trois enfants, autant que de lits ; des
   prénoms et des apparences prises dans les personnages existants (pas deux voisins identiques
   dans un hameau) ; le métier de l'adulte qui travaille, d'après le hameau (et parfois un second
   métier). Les foyers naissent à la découverte du hameau (pas avant : la sauvegarde ne porte
   que les hameaux vus).
2. **Le moteur** (`js/engine/habitants.js` ou un nom mieux choisi, réglé dans `data/` : une section
   `HABITANTS`) : chaque nuit, chaque foyer vit sa journée, que le joueur soit là ou non —
   le métier produit (bois, poisson, minerai, laine ou lait, baies et champignons…, des objets qui
   existent ; ne créer que ceux qui manquent), la famille mange (son garde-manger, son jardin, la
   cuisine de son métier), le reste va à la **réserve du hameau** (que la 7c vendra à la calèche)
   ; une bourse, le bonheur (les règles de `bonheur.js` et de `repas.js`), un petit journal des
   derniers jours. Le coût reste faible (des dizaines de foyers, une nuit : mesurer). Format de
   sauvegarde + 1, avec migration et test.
3. **La scène** (seulement près de la vue, créée et retirée avec les régions du hameau) : les
   habitants suivent un horaire — le matin ils sortent, les adultes vont à leur lieu de travail
   (billot, ponton ou barque, entrée de grotte voisine, enclos, jardins et lisière) et y font le
   geste de leur métier (les gestes existants), les enfants jouent sur la place, à midi et le soir
   ils rentrent manger, la nuit ils dorment dans leurs lits (le toit effacé montre la maison) ;
   ils marchent par les ruelles et les chemins, contournent le joueur, ne passent pas à travers
   les murs. Ce qui se passe sous les yeux du joueur (un bûcheron qui abat un arbre du monde, un
   pêcheur qui pêche) compte dans leur journée et suit les règles de la 6a (un arbre abattu par un
   habitant est pris et repousse comme les autres).
4. **Parler** : toucher un habitant ouvre une bulle — son prénom, son métier, une phrase qui dépend
   de l'heure, de son bonheur et de ce qu'il fait ; une petite fiche du hameau (familles, métier,
   réserve) depuis le panneau de la place. Pas de commerce ici (fiche 7c).
5. **Les performances** : quelques dizaines d'habitants dessinés au plus ; mesurer le temps d'une
   image dans un hameau et la nuit (avant/après).
6. **Les tests** : familles déterministes et pas plus nombreuses que les lits ; un foyer par maison,
   créés à la découverte ; la journée d'un foyer (production, repas, bonheur, réserve) ; un hameau
   loin du joueur vit quand même ; ce que fait un habitant sous les yeux du joueur compte une fois ;
   la migration ; la ferme et la famille du joueur inchangées.

## Hors périmètre

- La calèche, la vente et l'achat, le Marché qui devient la calèche, l'Atelier (fiche 7c).
- Les maisons qui grandissent par étapes (plus tard, si besoin) ; le brouillard et la carte du
  monde (étape 8) ; la famille du joueur.

## Critères d'acceptation

- Dans Chromium, dans un hameau, on voit le matin les adultes partir travailler et faire leur
  geste, les enfants jouer, tout le monde rentrer le soir et dormir la nuit ; on parle à un
  habitant ; la fiche du hameau montre ses familles et sa réserve, qui grandit d'un jour à
  l'autre ; un hameau d'un autre métier vit autrement.
- La ferme et sa famille sont identiques ; la fluidité ne baisse pas de façon notable ; la nuit
  reste rapide.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 7b fait ;
  `docs/fiches/README.md` : 7b fait ; aide et encyclopédie).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures d'un hameau le matin (départ au travail), d'un habitant au travail (deux
  métiers différents), des enfants sur la place, d'une bulle de parole, de la fiche du hameau,
  d'un hameau la nuit (les lits occupés). Les regarder et corriger avant de livrer. Donner 6 à 8
  captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les familles (tirage, métiers), le moteur (journée, production, repas, bonheur,
réserve, sauvegarde), ce qui est repris de l'ancien modèle et ce qui change, la scène (horaires,
gestes, trajets), la parole, les mesures avant/après, les vérifications et leurs résultats exacts,
les captures, ce qui reste (et ce que la 7c trouvera prêt).
