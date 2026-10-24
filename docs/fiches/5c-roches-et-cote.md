# Fiche 5c — Les rochers, les falaises et la côte

## Objectif

Finir les décors du monde (étape 5) avec ce qui est minéral et ce qui borde la mer : rochers et
blocs, éboulis en relief, falaises et parois avec du volume (vue de haut à 45°), neige et glace
des sommets, et la côte (rochers dans l'eau, coquillages, bois flotté, épave, vagues qui
déferlent). Décor seulement : casser ou ramasser dans le monde viendra à l'étape 6.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 4, 5a et 5b faites), `docs/fiches/README.md`, puis :
  - le monde : `js/engine/monde-gen.js`, `data/monde.json` (biomes, plan, `VEGETATION`),
    `js/engine/monde-sol.js` (sols, raccords, falaise et sa paroi en sol, `caseMarchable`),
    `js/engine/monde-vegetation.js` (la pose par région dans le Worker : listes d'objets
    `[sorte, x, y, variante]`, grandes images et petites plantes peintes, espacements,
    déterminisme indépendant de l'ordre des régions), `js/monde-worker.js`, `js/ui/monde-sol.js` ;
  - la scène : `js/carte/ferme/vegetation.js` (images découpées d'une planche, rangées selon leur
    pied, créées par blocs près de la vue, transparence, ombres), `js/carte/ferme/eau-monde.js`
    (l'eau du monde, la mer : houle, écume, ressac), `js/carte/ferme/soleil.js`, `js/fermier.js`
    (la marche, les pieds fermés) ;
  - les dessins : `scripts/carte/rochers.py` (les rochers de la ferme, que la pioche casse : ne pas
    les changer), `scripts/carte/vegetation.py`, `scripts/carte/sols_monde.py`,
    `scripts/carte/blocs.py` (`boite()` : vue de haut à 45°, hauteur h → h × 14/16, profondeur
    p → p × 10/16), `scripts/pixel.py`, `scripts/carte/commun.py` ; les planches gardées comme
    kit : `assets/montagne_*.png` (rochers, roche), `assets/plage_*.png` (rochers, décor).
- Les rochers de la ferme sont dans les couches de tuiles de sa carte, avec des identifiants gardés
  dans la sauvegarde : ceux du monde sont des objets à part (comme la végétation de la 5b), jamais
  sur la ferme.
- Mesures connues (Chromium sans carte graphique) : une image en forêt dense ~80 ms, le long de la
  côte ~93 ms ; ne pas aggraver ces chiffres de façon notable.

## À faire

1. **Les dessins** (scripts Python dans `scripts/carte/`, une planche dans `assets/` avec son JSON
   de rectangles et de pieds, comme `vegetation.png`) :
   - rochers et blocs de plusieurs tailles (galets, pierres, gros blocs, rochers moussus en
     forêt, blocs de granit en montagne), cohérents avec les rochers de la ferme ;
   - éboulis en relief (amas de pierres) au pied des pentes ;
   - la falaise avec du volume : une paroi vue à 45° (strates, fissures, ombre) le long des bords de
     falaise du plan, et son sommet herbeux ou rocheux ; des aiguilles ou pitons en montagne ;
   - neige et glace : congères, rochers enneigés, sapins enneigés près des sommets (si la 5b ne les
     a pas), glaçons ou lac gelé si le plan a un lac en altitude ;
   - la côte : rochers dans l'eau (avec écume autour), coquillages, étoiles de mer, algues,
     bois flotté (déjà fait à la 5b : le réutiliser), une épave par monde au plus ;
   - les ombres comme celles de la ferme.
2. **La pose** (dans le Worker, déterministe, indépendante de l'ordre des régions, réglée dans
   `data/monde.json`) : d'après le biome, le sol, le relief et la pente du plan ; les falaises en
   relief suivent les cases de falaise du plan et forment des bandes continues (pas de trous ni de
   doublons d'une région à l'autre) ; rien sur la ferme (et sa marge), les chemins, les gués, les
   lieux du plan ; rien qui se superpose à la végétation de la 5b (même logique d'espacement).
3. **La scène** : grandes pièces (gros blocs, falaises, pitons, épave) en images rangées selon leur
   pied, avec la transparence quand le personnage passe derrière et leur ombre ; petites pièces
   (galets, coquillages, algues) peintes dans le canevas de la région ; les vagues qui déferlent
   sur les plages et l'écume autour des rochers dans l'eau, animées avec l'eau du monde (et
   immobiles avec « animations réduites »).
4. **La marche** : les gros blocs, pitons et l'épave ferment leur pied ; la falaise reste
   infranchissable (le plan le dit déjà) ; galets, coquillages et petites pierres se traversent ;
   aucun chemin du plan n'est jamais fermé.
5. **Les performances** : mesurer avant/après (durée par région dans le Worker, temps d'une image
   en montagne et le long de la côte) ; le nombre d'images près de la vue reste raisonnable.
6. **Les tests** : pose déterministe et identique Worker / calcul direct, quel que soit l'ordre des
   régions ; rien sur la ferme, un chemin, un lieu ou l'eau profonde (sauf les rochers dans l'eau,
   près du rivage) ; falaises continues ; chemins jamais fermés ; chaque variante a son dessin.

## Hors périmètre

- Casser, miner, ramasser dans le monde, les minerais, les grottes jouables (étape 6) ; les hameaux
  (étape 7).
- Les rochers de la ferme et leurs identifiants.

## Critères d'acceptation

- Dans Chromium, la montagne a du relief (falaises, pitons, éboulis, blocs, neige), la côte est
  vivante (rochers dans l'eau et écume, vagues sur la plage, coquillages), le tout dans le style de
  la ferme ; on bute sur les gros blocs, on longe les falaises, on suit les chemins ; la ferme est
  identique.
- La fluidité ne baisse pas de façon notable (mesures avant/après dans le compte rendu).
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 5c et l'étape 5
  faits ; `docs/fiches/README.md` : 5c fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les planches regardées en grand ; Chromium : captures d'une falaise le long de la mer, d'une
  falaise en montagne, des sommets enneigés, d'un éboulis, d'une plage avec ses vagues (deux
  images à quelques centaines de ms), de rochers dans l'eau, d'un rocher moussu en forêt ; les
  regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins absolus) dans le compte
  rendu, dont un avant/après d'un même endroit.

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les planches et scripts, la pose, la scène, la marche, les mesures avant/après,
les vérifications et leurs résultats exacts, les captures, ce qui reste.
