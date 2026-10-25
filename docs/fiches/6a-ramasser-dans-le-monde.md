# Fiche 6a — Couper, casser, cueillir et ramasser dans le monde

## Objectif

Rendre les décors du monde (végétation de la 5b, rochers et côte de la 5c) utiles : on y coupe le
bois à la hache, on casse la pierre à la pioche, on cueille et on ramasse ce que chaque biome
donne, avec les mêmes gestes et les mêmes règles que sur la ferme ; ce qui est pris est retenu
dans la sauvegarde et repousse avec le temps.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 5 faites), `docs/fiches/README.md`, puis :
  - les décors du monde : `js/engine/monde-vegetation.js`, `js/engine/monde-roches.js`,
    `data/monde.json` (`VEGETATION`, `ROCHES`), `js/monde-worker.js`, `js/ui/monde-sol.js` (le
    Worker, le cache par région), `js/carte/ferme/vegetation.js` (les images du monde, les petites
    pièces peintes dans le canevas de la région), `js/carte/ferme/sol.js` (`paintRegion`,
    `syncRegions`), `js/fermier.js` (la grille de marche, les pieds fermés) ;
  - ce qui existe sur la ferme, à réutiliser : `js/engine/outils.js` (hache : coups, chute,
    repousse ; buissons ; pioche ; faux ; `respawn…`, ce qui ne repousse que dans les régions
    vues), `js/engine/ramassage.js` (les tas à ramasser), `js/engine/stamina.js` et
    `js/engine/energy.js` (le coût des gestes), `js/engine/inventory.js`, `data/items.json`,
    `js/engine/night.js` (ce qui repousse au réveil) ; la scène : `js/carte/ferme/hache.js`,
    `pioche.js`, `cueillette.js`, `coupfort.js`, `decor.js` (`couvre`, tremblement, `dropObj`),
    `js/carte/gestes.js` ; l'interface : `js/ui/outils.js` (outil en main) ;
  - la sauvegarde : `js/engine/base.js` (`STATE_VERSION`), `js/engine/state.js` (`MIGRATIONS`),
    `js/engine/terrain.js` (`regionVue`, `casesDuTerrain`).
- Les objets du monde ne sont pas dans la sauvegarde : ils sont tirés du plan dans le Worker, de
  façon déterministe. Ce qui est pris doit donc se retenir par un identifiant stable, tiré de
  l'objet lui-même (sa sorte et la position de son pied, en px ou en case), jamais d'un rang dans
  une liste qui pourrait changer.

## À faire

1. **Ce que donne chaque pièce** (réglé dans `data/monde.json`, par sorte du monde) : l'outil
   qu'il faut (hache, pioche, la main), le nombre de coups, ce qui tombe (quantités, tirage
   déterministe), le délai de repousse (en jours, ou jamais). Par exemple : feuillus, sapins,
   bouleaux, saules, pins tordus → bois (et parfois une graine ou une pomme de pin s'il en existe
   l'objet) ; souches et troncs couchés → bois ; bois flotté → bois ; ronces → mûres en saison ;
   champignons ; fougères, roseaux, joncs, oyats → fibres ; bruyère ou fleurs → ce qui existe déjà
   dans `data/items.json` (ne créer un objet que s'il manque vraiment, avec son icône pixel dans
   le style des autres et son entrée dans l'encyclopédie) ; rochers, blocs, éboulis → pierre ;
   coquillages, étoiles de mer, algues → à ramasser (objets à créer s'ils manquent, vendables
   plus tard à la calèche). Les falaises, pitons, rochers dans l'eau et l'épave restent du
   décor. Rester sobre : une poignée de nouveaux objets au plus, expliqués dans le compte rendu.
2. **Le moteur** : `state.monde.pris` (ou un nom mieux choisi) — les objets du monde touchés
   (coups reçus, pris, jour de retour) par identifiant stable ; une action par geste (couper,
   casser, cueillir, ramasser) qui vérifie l'outil, la distance, l'énergie (comme sur la ferme)
   et met le butin dans l'inventaire ou en tas à ramasser (`ramassage.js`) ; la repousse au
   réveil, seulement dans les régions vues, qui efface l'entrée (la sauvegarde ne grossit pas
   sans fin) ; le journal des actions (`journal.js`) comme pour la ferme. Format de sauvegarde
   + 1, avec sa migration et son test. La ferme et ses identifiants ne changent pas.
3. **Le Worker et la scène** : les objets pris ne sont pas dessinés (images retirées, petites
   pièces non peintes ou repeintes dans le canevas de la région) ; les objets touchés se
   reconnaissent dans les deux sens (Worker → scène : l'identifiant de chaque objet ; scène →
   moteur : l'identifiant de l'objet visé). Toucher un objet du monde : le personnage y va, prend
   l'outil, fait le geste (tremblement, éclats, chute, comme sur la ferme), le butin tombe ; un
   arbre abattu laisse sa souche ou rien, au choix. Quand une région sort du cache puis revient,
   ce qui est pris reste pris.
4. **La marche** : un arbre ou un bloc abattu ouvre sa case dans la grille de marche ; une
   repousse ne se fait pas sous le personnage ni ne ferme un chemin (déjà libre par construction).
5. **Les performances** : pas de recalcul d'une région entière à chaque coup ; mesurer la durée
   d'un coup et d'une région repeinte.
6. **Les tests** : identifiants stables (mêmes objets quel que soit l’ordre des régions,
   Worker et calcul direct identiques) ; chaque sorte récoltable a sa règle et son butin existe
   dans `data/items.json` ; couper, casser, cueillir, ramasser (outil manquant, énergie, butin) ;
   ce qui est pris ne réapparaît pas avant son jour et repousse ensuite ; repousse seulement
   dans les régions vues ; la migration ; la ferme identique.

## Hors périmètre

- Les minerais, les grottes de la montagne, la pêche dans le monde, les animaux (fiche 6b) ; les
  hameaux, les habitants et la calèche (étape 7).
- Labourer ou bâtir hors de la ferme (le monde reste « . ») ; le joueur automatique et les
  automatisations hors de la ferme.

## Critères d'acceptation

- Dans Chromium, on abat un arbre de la forêt, on casse un rocher en montagne, on cueille des
  mûres sur une ronce, on ramasse un coquillage sur la plage : les gestes, les éclats et la chute
  sont ceux de la ferme, le butin entre dans l'inventaire ; on passe ensuite là où était l'arbre ;
  en partant loin puis en revenant, ce qui a été pris l'est toujours ; après le délai, ça repousse.
- La ferme et ses arbres, rochers, herbes se comportent comme avant.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 6a fait ;
  `docs/fiches/README.md` : 6a fait ; l'aide et l'encyclopédie pour les nouveaux objets).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures d'un arbre de la forêt qu'on abat (pendant le geste, puis après), d'un
  rocher cassé en montagne, d'une ronce cueillie, de la plage avant/après le ramassage, de
  l'inventaire avec le butin ; la même place après un aller-retour lointain et après la repousse.
  Les regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les règles par sorte et les objets ajoutés, le moteur (état, actions, repousse,
migration), le Worker et la scène, la marche, les mesures, les vérifications et leurs résultats
exacts, les captures, ce qui reste.
