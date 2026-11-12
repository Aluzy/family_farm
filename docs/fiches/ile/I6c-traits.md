# Fiche I6c — Les traits de personnalité

## Objectif

Rendre chaque villageois reconnaissable par son caractère : deux ou trois traits tirés à son arrivée,
qui changent ses horaires, ce qu'il dit, les postes où il est bien et ceux avec qui il s'entend. Sans
mimique ni animation nouvelle (`docs/ile.md`, D6).

## Contexte

- I3b (les horaires, la bulle), I3c (les tâches), I6a (les goûts, les propos), I6b (l'affinité).
- Le tirage à graine : `js/engine/villageois.js`, `js/carte/comportement.js` (`hasard`, `graine`).
- Les phrases : `data/monde.json` (`HABITANTS.PHRASES`, `PROPOS` : environ 180 phrases, une
  quarantaine de sujets), `js/engine/propos.js` (la mémoire des derniers sujets).

## À faire

1. **Les traits** (`data/village.json`, `TRAITS`), une dizaine, par paires opposées quand c'est
   naturel : matinal / couche-tard, bavard / réservé, travailleur / flâneur, casanier / curieux,
   gourmand, rêveur, soigneux, taquin. Deux ou trois par villageois, jamais deux opposés, tirés à
   la graine à l'arrivée ; deux villageois n'ont pas le même trio.
2. **Ce qu'un trait change** (chaque effet est un réglage du trait, pas du code par trait) :
   - **l'horaire** : un décalage du lever, de la rentrée, du coucher ; la durée du repas ;
   - **la parole** : un poids sur les sujets de `PROPOS` (le bavard en dit plus souvent, le gourmand
     parle de plats) et trois à cinq phrases propres au trait ;
   - **les postes** : une tâche préférée et une tâche boudée ; à un poste préféré, sa cible de
     bonheur monte (un réglage) ; à un poste boudé, elle baisse un peu. Le rendement ne change pas ;
   - **les affinités** : des paires de traits qui s'accordent font monter l'affinité (I6b) plus
     vite ; aucune ne la fait baisser.
3. **La découverte** : les traits ne s'affichent pas d'emblée. Chacun se révèle par ce qu'on voit
   (trois matins levé tôt → « matinal ») ou ce qu'il dit, puis se note dans sa fiche. La fiche dit
   « ? » pour ceux qui restent à découvrir.
4. **Le tableau** (I3d) : une marque discrète « à son goût » / « pas son goût » sur la tâche, une
   fois le trait connu.
5. **Les parties en cours du chantier** : un villageois arrivé avant cette fiche reçoit ses traits à
   la migration (tirés de sa graine).
6. **La sauvegarde** : les traits et ceux qui sont connus ; format + 1, migration, test.
7. **Les tests** (`village-traits.test.mjs`) : le tirage (pas d'opposés, pas de trio en double,
   déterministe) ; chaque effet lu dans les réglages ; la découverte ; la migration.

## Hors périmètre

- Toute animation nouvelle ; un effet des traits sur la production.

## Critères d'acceptation

- Dans Chromium : trois villageois se lèvent à trois heures différentes ; un bavard et un réservé ne
  disent pas la même chose au même moment ; un trait se révèle et paraît dans la fiche ; le tableau
  marque une tâche « à son goût ».

## Vérifications et livraison

Celles du README du chantier. Avant de figer les décalages d'horaire et les poids des phrases,
proposer deux réglages filmés et faire choisir. Captures : trois fiches, une révélation, le tableau.
