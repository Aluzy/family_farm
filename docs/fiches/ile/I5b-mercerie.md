# Fiche I5b — La mercerie

## Objectif

Ouvrir la filière de la laine : un villageois qui s'occupe des moutons peut tenir une mercerie, où il
file et tisse la laine, teint le tissu et coud des vêtements, quelques pièces par jour.

## Contexte

- I5a (le socle des commerces : `artisans.js`, l'établi, la boutique), I4 (la fourchette de valeur).
- La filière d'aujourd'hui : `data/ile.json` (le tissage : 2 laines → 1 tissu ; la couture : gants,
  manteau, salopette, avec leur façon), `data/equipement.json` et `js/engine/equipement.js`
  (l'équipement de la famille et ses effets), la fiche 11.
- Les teintures : `docs/colorants.md`, `tests/engine/colorants.test.mjs`, `data/meubles.json`
  (`PALETTES`) ; les tapis (`ILE.ATELIERS.tapis`).
- La laine : `data/animals.json` (mouton : `joursLaine`, `laineParTonte`), `js/engine/animals.js`.

## À faire

1. **La mercerie** dans `ARTISANS` : l'établi « rouet et métier à tisser » ; recettes en trois temps,
   chacune dans la fourchette d'I4 : laine → fil, fil → tissu, tissu (+ colorant) → vêtement ou
   tapis. `LOTS` : 3 par jour, toutes étapes confondues.
2. **Les vêtements** : ceux de l'équipement (gants, manteau, salopette, tablier, chapeau de laine) ;
   ils se cousent à la mercerie quand il y en a une, sinon comme avant I7c (le joueur n'est jamais
   bloqué). Les villageois en achètent pour eux (I4) : un villageois habillé chaud ne se repose pas
   sous la pluie.
3. **La teinture** : un vêtement ou un tapis prend la couleur d'un colorant existant ; pas de
   nouvelle matière. Les tons exacts de `PALETTES` sont gardés (l'exception de `CLAUDE.md`).
4. **Deux artisans possibles** quand le village grandit : la mercerie peut être tenue à deux (un qui
   file et tisse, un qui coud), ce qui double `LOTS` sans machine. Le socle d'I5a le permet-il ?
   Sinon l'ajouter là, proprement.
5. **Les dessins** (45°) : le rouet, le métier à tisser, les écheveaux teints, l'enseigne ; le geste
   « filer » (assis au rouet, d'après les sièges).
6. **Les tests** : la filière de bout en bout et sa valeur croissante ; la teinture ; l'achat d'un
   vêtement par un villageois et son effet ; `equipement.test.mjs` et `colorants.test.mjs` verts.

## Hors périmètre

- De nouveaux vêtements cosmétiques pour la famille ; retirer `ile.js` (I7c).

## Critères d'acceptation

- Dans Chromium : la laine de la tonte devient fil, tissu, puis un manteau teint, en trois jours
  d'artisan ; chaque étape vaut plus que la précédente ; un villageois achète un manteau.

## Vérifications et livraison

Celles du README du chantier. Captures : la mercerie, les trois étapes, un vêtement teint.
