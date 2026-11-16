# Fiche I7a — Les objectifs sans récit

## Objectif

Garder un fil pour le joueur sans une ligne de récit : les sept chapitres deviennent des **paliers de
l'île**, faits d'objectifs courts et de récompenses, sans introduction ni personnage.

## Contexte

- `docs/ile.md` (D2). Le joueur qui ne lit rien doit quand même savoir quoi faire ensuite.
- La campagne : `data/campaign.json` (`CHAPITRES` : `titre`, `etape`, `intro`, `introSauvage`,
  `objectifs`, `recompense` ; `COURRIER`), `js/engine/campaign.js` (499 lignes), `js/ui/chapitres.js`,
  `tests/engine/chapitres.test.mjs`, `chapitres-recompenses.test.mjs`.
- Les objectifs du jour : `js/engine/objectifs.js`, `objectifs-compte.js`, `js/ui/objectifs.js`,
  `data/general.json` (`OBJECTIFS.SEMAINE`, `TIRES`), `docs/didacticiel.md`.
- Ce que les chapitres débloquent : `data/techtree.json` (`ARBRE.PALIERS`, les points par chapitre),
  `data/plans.json`, `js/engine/plans.js`.

## À faire

1. **Les paliers** (`data/village.json`, `VILLAGE.PALIERS`, lus quand `ACTIF`) : sept, comme les
   chapitres, pour ne rien casser de ce qui s'y accroche (points de technologie, plans, paliers de
   l'arbre). Proposition de fil : s'installer ; la première vente au port ; le premier villageois ;
   les bêtes ; trois villageois et une tâche chacun ; le premier commerce ; un village de dix. Chaque
   palier : un titre de quelques mots, une icône, des objectifs, une récompense. **Aucun texte
   d'introduction.**
2. **Les objectifs** : reprendre les types de `campaign.js` et ajouter ceux du chantier (vendre au
   port, niveau du port, villageois installés, tâches attribuées, commerces ouverts, amitié). Les
   types qui ne servent plus (calèche, hameaux, confiance) ne sont pas repris.
3. **Le courrier** : avec `ACTIF`, il n'y en a plus (ni lettres, ni cartes postales) ; ce que le
   courrier offrait (objets, plans) passe dans les récompenses des paliers.
4. **Les objectifs du jour** : `SEMAINE` (la première semaine) est réécrite pour le nouveau départ,
   sans phrase d'ambiance ; `TIRES` gagne des objectifs du port et du village.
5. **L'interface** : la fenêtre des chapitres devient « L'île » : le palier en cours, ses objectifs
   cochés, la récompense, les paliers passés. Pas d'écran plein à lire au changement de palier : une
   notification et la récompense.
6. **Le joueur automatique** suit les paliers.
7. **La sauvegarde** : une partie neuve `ACTIF` porte `state.palier` (la forme de `state.chapitre`,
   si possible la même) ; pas de migration des parties d'avant ici (I7f).
8. **Les tests** (`village-paliers.test.mjs`) : chaque objectif se compte ; chaque palier s'atteint
   dans une partie simulée ; les points de technologie et les plans tombent comme avant ; aucun
   texte de `CHAPITRES.intro` n'est lu avec `ACTIF`.

## Hors périmètre

- Le didacticiel des premiers gestes (I7b) ; retirer le code du récit (I7c) ; les vocations (lot 8).

## Critères d'acceptation

- Dans Chromium, `?village=1` : la fenêtre « L'île » montre le palier 1 sans texte à lire ; un
  objectif se coche quand on le fait ; au palier suivant, une notification et la récompense.
- La simulation atteint le palier 7.

## Vérifications et livraison

Celles du README du chantier. Captures : la fenêtre « L'île », un palier franchi.
