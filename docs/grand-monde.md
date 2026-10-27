# Le grand monde (projet)

Une seule carte, 20 fois la ferme générée, faite de biomes, cachée au départ et découverte en
marchant. Elle remplace toutes les autres cartes du jeu.

## La copie du jeu d'avant

Le jeu tel qu'il était avant ce projet (la ferme, la ville, la transition, la montagne, la
plage, le train, l'infra-monde, l'école, le cheval) est gardé tel quel sur la branche
`archive/jeu-avant-grand-monde` (commit `11a471e`). Elle sert de base à un travail ultérieur
(un autre jeu, centré sur la vie en ville) et ne reçoit plus de changements.

## Décisions

- **Taille** : 20 fois la surface de la ferme générée, soit environ 644 × 510 tuiles de 16 px
  (10 304 × 8 160 px), découpées en régions de 64 × 64 tuiles.
- **Monde fermé** : la mer au sud et à l'est, la montagne au nord et à l'ouest ; pas de bord
  visible ni de monde sans fin.
- **Découverte** : le monde est caché au départ. Le brouillard se lève autour du personnage à
  mesure qu'il marche (la carte du monde ne montre que ce qui a été vu).
- **La ferme** : celle d'aujourd'hui (le générateur de `js/engine/ferme-generee.js`), posée
  telle quelle au centre, dans une prairie. Les parties en cours gardent leur ferme.
- **Biomes** : prairie (la ferme), forêt profonde, marais, lande, montagne, sommets enneigés,
  côte, mer ; des rivières descendent de la montagne à la mer.
- **Ce qui disparaît** : la ville (elle donnera un autre jeu, centré sur la vie en ville), la
  carte de transition, la montagne et la plage (leurs textures restent, pour les biomes), le
  train, la navette, le bus et l'école, le livreur, les entreprises, la vente en ville,
  l'économie de la ville, l'infra-monde et son tronc creux.
- **Ce qui reste** : le modèle des familles autonomes (l'ancien `js/engine/voisins.js` :
  foyers, métiers, argent, repas, bonheur, maisons par étapes), pour les habitants du grand
  monde, à reprendre de la branche d'archive à l'étape 7 ; le bonheur de la famille
  (`js/engine/bonheur.js`) ; la mine de la ferme et ses niveaux de grotte (`js/grotte.js`) ; le
  cheval.
- **Le Marché devient une calèche** : elle fait le tour du monde par les chemins, de hameau en
  hameau et jusqu'à la ferme, et achète ce que les habitants et le joueur produisent. On la
  voit passer ; on peut la héler quand elle est près de soi. Elle ne vend que les produits des
  habitants et les graines ; ce que vend le Marché aujourd'hui (outils, animaux, meubles,
  aliments) se fabrique à l'Atelier (fait : fiche 7c).

## Les étapes

1. ✅ **Le grand ménage** (fait). Retirer la ville, la transition, la montagne, la plage, le
   train, la navette, le bus et l'école, le livreur, les entreprises, la vente en ville,
   l'économie de la ville, l'infra-monde, la fenêtre « Se promener en ville », leurs scripts,
   leurs cartes Tiled et leurs tests. Sortir le bonheur de `ville.js` (`bonheur.js`), les
   familles autonomes de la transition (`habitants.js`), la grotte de la mine de
   `ville-carte.js` (sa propre scène). Garder les textures de la montagne et de la plage dans
   un kit de tuiles du monde. Migrer les sauvegardes.
   - **Fait** : la ville (`js/ville-carte.js`, `js/carte/ville/`, `ville-carte.html`, l'onglet
     et la fenêtre Ville, le marché, les boutiques, les entreprises et l'économie de la ville :
     `js/engine/economie.js`, `entreprises.js`, `ville.js`, `data/ville.json`,
     `data/economie.json`), la transition (`js/engine/transition.js`), les voisins
     (`voisins.js`), leurs immeubles, le livreur, le bus et la navette, l'école (les enfants
     de la ferme n'y vont plus : `FAMILLE.FAIM.ECOLE`, `CarteKit.ECOLE`, `horaireEcole`
     retirés), la montagne, la plage, le train et la gare, les cartes des trouvailles (les
     objets restent dans les données, avec leur biome `trouvaille`), l'infra-monde
     (`js/infra-monde.js`, `infra-monde.html`, le passage du tronc creux, `bois_infra`
     retiré) et l'horloge des sorties (`HorlogeSortie`) sont retirés, avec leurs scripts
     (`scripts/ville/`, `scripts/infra/`) et leurs tests.
   - La grotte est une scène à elle : `js/grotte.js` (`GrotteScene`, `window.Grotte`),
     réglée par `data/grotte.json` (`GROTTE`) ; ses tuiles par `scripts/carte/grotte.py` (la
     flèche bleue des passages, `scripts/carte/fleche.py`, est retirée par la fiche 14). `js/ui/excursion.js` ne mène plus
     qu'à la mine (`jeu.html?carte=grotte&niveau=N…`, le pont `FermeHote`) ; le menu du god
     mode : la ferme, les niveaux 1, 4 et 8 de la mine.
   - Le bonheur est dans `js/engine/bonheur.js` (`memberHappiness`, `setHappiness`,
     `averageHappiness`, `mealHappinessDelta`, `dishHappiness` ; `DATA.BONHEUR`,
     `data/general.json`).
   - Les aliments qu'on n'avait qu'en ville (poisson, miel, fromage d'alpage, sucre, épices)
     se vendent au Marché de la ferme ; les objets des boutiques (croissant, pizza, burger,
     frites, ordinateur) sont retirés (`"retire": true`).
   - Le cheval ne se monte qu'à la ferme ; l'attacher à un poteau sur une autre carte
     reviendra avec le grand monde. Pas de cheval dans la mine.
   - Sauvegardes : format 51 ; la migration 50 → 51 ôte `ville`, `voisins`, `immeuble`,
     `economie` et `transitionPris`, et ramène à l'Écurie un cheval attaché sur une autre
     carte.
   - Les jeux de tuiles de la montagne et de la plage, `assets/trouvailles.png`,
     `assets/faune.json` et `faune_*.png` restent dans `assets/`, kit de textures des biomes.
2. ✅ **Le rendu par régions**, sur la ferme d'aujourd'hui (2 PR, fait) : le sol, les arbres, les
   rochers, les fleurs et l'herbe haute chargés par régions de 64 × 64 tuiles autour de la
   caméra, au lieu d'une seule image de la taille de la carte.
   - **Fait (2a)** : le sol. `CarteKit.REGION` (`js/carte/kit.js`) : des régions de 64 × 64
     tuiles, chacune son canevas (`sol_<rx>_<ry>`), qui déborde d'une tuile sur ses voisines
     (pas de filet au zoom non entier) ; créées à moins de `pres` px de la vue, retirées
     au-delà de `loin` px (`syncRegions`, `js/carte/ferme/sol.js`, à chaque image). Les
     cases qui changent (terre labourée, chemins) sont repeintes dans les régions dessinées ;
     les autres le seront à jour en reparaissant. La teinte de l'herbe haute se lit région
     par région. Vérifié : chaque région est identique au pixel près à l'ancien sol entier.
   - **Fait (2b)** : les arbres, les buissons, les barrières et les rochers (un canevas et une
     image chacun) appartiennent à la région où est le milieu de leur image
     (`placeInRegion`, `js/carte/ferme/decor.js`) : leur image se fait quand la région est
     dessinée (`showObj`) et s'en va avec elle (`dropObj` ; pas pendant qu'ils tremblent ou
     repoussent). Un arbre abattu (`o.vu`) ou un rocher cassé reste caché quand son image se
     refait ; la boîte d'un rocher (`rockBox`) se mesure à sa première image. Les arbres
     plantés par le joueur gardent leur image.
3. ✅ **Le moteur en coordonnées du monde** (2 PR, fait) : les cases numérotées sur la largeur du
   monde (migration de tout ce qui est rangé par case), le terrain lu case par case, la nuit
   limitée aux régions visitées, des trajets bornés.
   - **Fait (3a)** : le monde (`js/engine/monde.js`, `genererMonde`) : la ferme générée posée
     telle quelle en `FERME_DANS_MONDE` (250, 198), au centre d'un monde de 644 × 510 tuiles ;
     autour, une prairie qui continue l'herbe de la ferme (même bruit de teinte, raccords, le
     chemin qui s'arrondit au bord). Le terrain du monde est celui de la ferme porté dans ses
     cases (sans relire la carte case par case) ; la carte et les coins des cases ne se font qu'à
     la première demande. Pour l'instant, la prairie n'est « rien » (« . ») : on y marche, on n'y
     laboure ni n'y bâtit, et le moteur ne parcourt que les cases de la ferme
     (`casesDuTerrain`). `farmTerrain`, `farmMap` : le monde ; une partie d'avant (version < 52,
     pendant ses migrations) lit encore sa ferme seule.
   - Sauvegardes : format 52 ; la migration 51 → 52 (`decalerPartie`, `js/engine/state.js`)
     porte tout ce qui est rangé par case : les clés des blocs, sols, étages, fenêtres, hauteurs,
     ruches, distributeurs et botteleuses ; les cases des parcelles, des arbres du Verger et de
     ceux plantés, de l'arrosage ; les tas à ramasser ; les arbres, buissons et rochers touchés
     (« colonne,rangée », pas les arbres plantés « f<n> ») ; les touffes fauchées et les morceaux
     au sol (en px) ; l'abri du didacticiel. La cueillette du jour est tirée de nouveau. Vérifié
     dans Chromium : une partie du jeu d'avant se rouvre à l'identique.
   - **Fait (3b)** : les régions vues, les trajets bornés, la carte lue par régions.
     - Le moteur : `MONDE.REGION` (64, `js/engine/monde.js`), la seule taille des régions (la scène
       la reçoit au montage, `CarteKit.REGION`). `state.monde.vues` : les régions vues (« rx,ry ») ;
       celles de la ferme d'office ; le personnage qui entre dans une autre la note (la scène le
       dit au pont, `stepRegionPerso` → `voirRegion`, `js/engine/terrain.js`).
       `casesDuTerrain(T, state)` : la ferme et les régions vues, dans l'ordre des cases ; les
       revues de cases du moteur (labourables, le joueur automatique, la cueillette) s'y bornent,
       aucune ne parcourt tout le monde.
     - La nuit : les rochers, arbres et buissons qui reviennent, les touffes qui repoussent, la
       cueillette du jour ne concernent que la ferme et les régions vues (`regionVue`,
       `js/engine/outils.js`, `atelier.js` : chaque région vue hors de la ferme a sa propre suite
       de places, une région découverte dans la journée ne change pas celles de la ferme). Une
       région pas vue ne bouge pas (tests : `tests/engine/monde.test.mjs`).
     - Les trajets : `CarteKit.chemin` cherche dans une boîte (le départ et le but, plus 48 cases,
       bornée au monde ; au plus 8 000 cases examinées) ; un appui à plus de 150 cases ne lance
       pas de recherche : le personnage va tout droit, aussi loin que rien ne le gêne (il ne saute
       plus à l'autre bout). La famille et le robot passent par le même chemin (`fermier.path`).
       Mesuré dans Chromium : un but enfermé (le pire cas) prenait 300 à 380 ms sur tout le
       monde, 9 à 15 ms dans sa boîte ; 400 trajets dans la ferme : les mêmes chemins, 0,4 ms en
       moyenne et 3 à 7 ms au plus (avant : 1,8 à 2,3 ms, et 12 à 19 ms au plus) ; un appui à
       l'autre bout du monde : moins d'une ms.
     - La carte lue par régions : `carte.regionsPleines` (le moteur : pour l'instant les 8 régions
       de la ferme) ; les relevés du chargement (arbres, barrières, rochers, tuiles animées, terre
       des anciennes zones, lieux de la vie d'ambiance) ne lisent que leurs cases
       (`CarteKit.casesPleines`, 32 768 cases au lieu de 328 440), dans l'ordre de la carte : les
       mêmes résultats (vérifié dans Chromium). Le `create()` de la scène : 530 à 680 ms avant,
       340 à 510 ms après.
     - Sauvegardes : format 53 ; la migration 52 → 53 donne à une partie existante les régions de
       sa ferme.
     - Laissé pour plus tard : un arbre ou un rocher à cheval sur une région pleine et une région
       qui ne l'est pas serait trouvé depuis sa première case dans la région pleine (pas de
       souci tant que tout est sur la ferme) ; un trajet de plus de 70 cases à la ferme fait
       toujours apparaître le personnage au bout (comme avant) ; la mine garde sa recherche sur
       toute sa grille (petite). Attention pour l'étape 4 : un arbre ou un rocher du monde collé
       au bord de la ferme ne doit pas se fondre avec un arbre de la ferme (leurs identifiants
       changeraient).
4. ✅ **Le générateur du monde** (2 PR, fait) : relief, humidité, biomes, rivières, côte, chemins ; la
   ferme au centre ; les hameaux, les entrées de grotte, les coins de pêche ; dans un Web
   Worker, région par région, avec un cache.
   - **Fait (4a)** : le plan du monde, des données seulement (le jeu ne change pas encore
     d'aspect ; la fiche 4b le dessinera et le rendra marchable). `js/engine/monde-gen.js`, réglé
     par `data/monde.json` (`BIOMES`, `PLAN_MONDE`) ; `genererMonde(graine).plan` ou
     `planDuMonde(graine)` (`js/engine/monde.js`), fait à la première demande seulement (ni le
     terrain ni la carte ne le lisent : le moteur et les tests n'en paient pas le prix).
     - **Le format du plan** : `{ LARGEUR, HAUTEUR, BIOMES, FERME, SORTIE, biome, relief,
       humidite, rivieres, finRivieres, lacs, chemins, lieux }`. `biome` : un `Uint8Array`, une
       valeur par case du monde (rangée × LARGEUR + colonne), l'indice du biome dans `BIOMES`
       (`mer`, `plage`, `falaise`, `prairie`, `foret`, `marais`, `lande`, `montagne`, `sommet`,
       `lac`, `riviere` : la liste de `data/monde.json`, à n'allonger qu'à la fin) ; `relief`,
       `humidite` : des `Uint8Array` de 0 à 255. `rivieres` : le fil de chaque rivière (des cases
       voisines, de la source à l'embouchure ; ses cases de large en plus, 1 à 3, sont dans
       `biome`), `finRivieres` : où chacune se jette (`mer`, `lac`, `riviere`) ; `lacs` : les cases
       de chaque lac ; `chemins` : des listes de cases voisines (un chemin par tronçon du
       réseau). `lieux` : `hameaux` (`{ id, case, nom }`), `grottes` (`{ id, case }`, l'entrée,
       en montagne), `peche` (`{ id, case, eau }`, la case de la rive ; `eau` : `lac`, `riviere`
       ou `mer`). `SORTIE` : la case juste à l'est de la sortie du chemin de la ferme.
     - **Le relief** : une pente douce des bords nord et ouest vers les bords sud et est ; la
       montagne s'y ajoute près des premiers (des crêtes), la mer se creuse près des seconds (une
       découpe de la côte) ; les bords sont décalés par un bruit (rien de droit) ; tout contre
       le bord, les sommets ou la mer sont forcés (aucun passage hors du monde) ; dans les coins
       nord-est et sud-ouest, le bord le plus proche l'emporte et des falaises font le partage.
       Les biomes viennent du relief et de l'humidité (des seuils) : des bandes (sommets,
       montagne, lande des hauteurs, prairie, marais des bas-fonds, côte) et des taches (forêts,
       marais, clairières). La ferme et une marge de 12 cases sont forcées en prairie (un
       plateau), avec une transition douce sur 40 cases.
     - **Les rivières** : de sources en montagne, un A* à plusieurs buts (la mer, une autre
       rivière, un lac) où descendre ne coûte presque rien et monter beaucoup ; là où le fil doit
       remonter (une cuvette), la rivière creuse son lit et la cuvette devient un lac. **Les
       chemins** : les hameaux (6 à 10, dans la prairie, la lande, sur la côte ou à la lisière
       d'une forêt, un par secteur autour de la ferme, loin les uns des autres) et la sortie de la
       ferme, dans l'ordre de leur angle autour d'elle, chacun relié au suivant : une boucle qui
       fait le tour de la ferme (la calèche la suivra). Un pas coûte selon le biome (cher en
       montagne et dans les marais, un pont sur une rivière ; ni la mer, ni un lac, ni un sommet,
       ni une falaise). Les rivières et les chemins sont cherchés sur une grille grossière (des
       cases de 6 × 6), puis tracés en courbe lissée par les points trouvés (un A* case par case
       ferait des traits droits et des angles droits), les cases où l'on ne passe pas refaites au
       plus juste ; un chemin qui en longe un autre le rejoint. Les entrées de grotte (3 à 6) sont
       au pied de la montagne ; les coins de pêche, un par lac et par rivière, et quatre sur le
       rivage.
     - **Par régions** (pour la fiche 4b et son Web Worker) : `champsDuMonde(graine, cadre)`
       donne le relief, l'humidité et le biome d'une case par les seuls bruits (n'importe quelle
       région se calcule seule) ; `elementsDuMonde(graine, cadre)` tire une fois pour tout le
       monde les rivières, lacs, chemins et lieux (des listes de cases, et `eaux` : une valeur par
       case, le lac ou la rivière posés par-dessus) ; `biomesDeRegion(champs, elements, cadre, rx,
       ry, taille)` donne les biomes d'une région, les mêmes que le plan entier (testé).
     - Mesuré (Node, la ferme déjà faite) : le plan entier en 180 ms (médiane sur 60 graines, au
       plus 290 ms) une fois le code compilé, 230 à 470 ms pour un premier plan à froid ; dans
       Chromium, 230 à 440 ms à froid. `npm test` : 30 s (34 s avant). L'aperçu :
       `node scripts/monde/apercu.mjs <graine> [fichier.png]` (une couleur par biome, ombrée par
       le relief ; les rivières, les chemins, les hameaux, les grottes, les coins de pêche, le
       rectangle de la ferme).
     - Tests : `tests/engine/monde-plan.test.mjs` (déterministe ; la ferme et sa marge en
       prairie ; le monde fermé sur ses quatre bords, aucun passage depuis la ferme ; les
       rivières de la montagne à la mer ou à un lac, en cases voisines, sans boucle ; les chemins
       qui font le tour de la ferme et relient chaque hameau à sa sortie ; les lieux dans leurs
       biomes ; une région faite seule identique au plan ; la durée), et `tests/test-data.mjs`
       (les réglages de `data/monde.json`, vérifiés par `scripts/lib/data.mjs`).
   - **Fait (4b)** : le monde dessiné et marchable.
     - **Le sol** (`js/engine/monde-sol.js`, `solDeRegion`) : chaque case hors de la ferme prend le
       sol de son biome (prairie : l'herbe de la ferme et ses trois teintes ; forêt : un sous-bois
       sombre ; lande ; marais ; plage : sable ou galets ; falaise ; montagne : éboulis, roche nue
       au-dessus d'un relief de 0,8 ; sommets : neige ; mer, lacs, rivières : l'eau de la ferme,
       profonde loin des rives). Par coins de cases, comme la ferme : un coin prend l'eau si deux
       des quatre cases qui le touchent en sont, sinon le sol le plus présent ; une case où se
       touchent plusieurs sols peint le plus bas en entier, puis chaque sol plus haut posé sur ses
       coins (`SOLS_MONDE`, dans l'ordre : herbe, sable, galets, marais, lande, forêt, éboulis,
       roche, falaise, neige) ; près de l'eau, une rive (`rive_herbe`, `rive_sable`, ou celle du
       sol). Les chemins du plan sont élargis à trois cases, comme celui de la ferme, et tracés avec
       ses tuiles (sur un autre sol que l'herbe, posés par-dessus) ; ils rejoignent le chemin de la
       ferme à sa sortie est. Une case toute d'herbe se peint exactement comme la prairie d'avant
       (vérifié : les mêmes tuiles autour de la ferme). Les tuiles nouvelles, provisoires (les
       décors viendront à l'étape 5) : `assets/sols_monde.png`, faite par
       `scripts/carte/sols_monde.py` (9 sols : 16 variantes pleines, 15 bords sur un autre sol,
       15 rives sur l'eau ; le chemin sur un autre sol ; le gué).
     - **La ferme ne change pas** : la carte du monde n'a plus que ses couches (vides autour, la
       prairie n'y est plus calculée au démarrage) ; le sol autour vient des régions, peint sous
       elles par la scène (`paintMonde`, `js/carte/ferme/sol.js`). Tests :
       `tests/engine/monde-sol.test.mjs`.
     - **Marcher** : `caseMarchable(T, t)` (le moteur) : la ferme oui (ses propres obstacles,
       comme avant) ; ailleurs ni la mer, ni un lac, ni une rivière, ni une falaise, ni un sommet.
       Une rivière se passe **à gué** là où un chemin la croise (ses trois cases de large : des
       pierres plates sur l'eau). La scène le lit pour le personnage, la famille et le robot
       (`Fermier.attach({ marchable })`) ; une région pas encore faite est fermée. Le terrain du
       moteur (`LIGNES`) reste « . » hors de la ferme ; pas de changement de sauvegarde.
     - **Le Web Worker** (`js/monde-worker.js`, `js/ui/monde-sol.js` ;
       docs/architecture-phaser.md) : la page lui donne la graine, le cadre du plan et les coins de
       la ferme ; il envoie un aperçu des biomes (le sol provisoire, uni par blocs de 8 × 8 cases),
       tire les éléments une fois, puis fait les régions demandées par `syncRegions` (une à la
       fois). Elles restent en mémoire (88 régions en tout, ~4 Mo ; pas d'IndexedDB). Sans Worker,
       le même code tourne sur la page (une région par tâche) ou dans Node (`solDirect`). Le plan
       entier n'est plus jamais calculé dans le jeu.
     - **Mesuré** (Chromium sans carte graphique, 3 parties chacune) : la scène prête 2 120 à
       2 210 ms après le chargement de la page (avant : 2 285 à 2 850 ms), la plus longue tâche du
       démarrage 677 à 767 ms (avant : 755 à 965 ms) ; `genererMonde().carte` : plus de calcul de
       la prairie (70 à 110 ms de moins). Dans le Worker : les éléments 220 à 300 ms, une région
       2 à 24 ms (médiane 5 ms) ; sur la page, peindre une région : 30 ms en médiane, 60 ms au plus
       (avant : 40 et 67 ms). `npm test` : 34 s (33 s avant).
     - **Les défauts du plan vus à la 4a** : un long trait droit entre deux points d'une rivière
       ou d'un chemin ondule maintenant (`ONDULE`) ; un lac se remplit en rond autour de son fond
       (`LAC_ROND`) et un lac trop maigre (le fond d'une vallée en V, qui donnait des traits d'eau
       à angle droit, surtout au nord) n'est plus posé (`LAC_PLEIN`) : moins de lacs le long des
       rivières (3 à 5 par monde). Reste : deux chemins peuvent encore courir côte à côte sur
       quelques cases, surtout près de la sortie de la ferme ; les biomes et les chemins gardent
       des bords en escalier (un biome par case) ; l'eau du monde ne s'anime pas (sa première
       image) ; les tuiles des sols sont provisoires.
5. ✅ **Les décors des biomes**, en vue de haut à 45° (3 PR, fait) : sable, mer, roche, éboulis, neige,
   sapins, sous-bois, roseaux, eau basse, bruyère, et leurs raccords.
   - **Fait (5a)** : les sols des biomes, leurs bords et l'eau du monde.
     - **Les sols** (`assets/sols_monde.png`, refaite par `scripts/carte/sols_monde.py`, 16 × 83
       tuiles ; le relancer redonne la même image) : 13 sols, dans les tons de la ferme — le sable
       et les galets de la plage, l'eau basse et la vase du marais, la terre nue et l'herbe rase
       (bruyère, ajoncs) de la lande, les feuilles, les aiguilles et la mousse de la forêt, les
       éboulis et la roche de la montagne, la falaise (sa paroi sous son bord), la neige. Les herbes
       (lande, vase, feuilles, mousse) reprennent le dessin de l'herbe de la ferme, reteint. Chacun :
       16 variantes pleines sans dégradé ni forme qui passe un bord (12 courantes, 4 avec un détail :
       coquillage, nénuphar, pomme de pin, ajonc…), 3 variantes de bords sur un sol plus bas, 2 de
       rives sur l'eau ; puis le chemin de la ferme posé sur un autre sol (3 variantes), le gué,
       l'eau profonde posée sur l'eau peu profonde. Un biome a plusieurs sols, par taches
       (`solDe`, `SOLS_MONDE.PAS_TACHES`…) : les aiguilles en hauteur, la mousse où c'est humide.
       La prairie reste l'herbe de la ferme, inchangée. Le sol uni provisoire (`COULEURS_BIOMES`)
       prend la couleur moyenne des nouveaux sols.
     - **Les bords naturels** (`js/engine/monde-sol.js`, `solDeRegion`) : le plan et la marche ne
       changent pas, seul le dessin. (1) Chaque case prend le sol d'une case un peu plus loin
       (jusqu'à 4 cases, deux bruits lents : `DERIVE`) : les frontières se déforment à l'échelle de
       quelques cases. (2) Le sol d'un coin n'est plus le plus présent de ses quatre cases mais celui
       qui pèse le plus parmi les seize autour, chaque poids poussé par un bruit propre à ce sol
       (`POIDS`, `BRUIT_BORDS`) : une frontière en biais reste en biais. (3) Les tuiles de bord sont
       des « carrés qui marchent » : la frontière coupe chaque côté en son milieu et va droit,
       ondulée par un bruit (commun près des côtés : pas de couture ; propre à la variante au
       milieu) ; une suite de coins en escalier donne une ligne à 45°, plus de marches. Les sols
       doux ont un bord tramé, les sols durs un liseré et une ombre. (4) Le chemin : une bande ronde
       autour du fil lissé du plan (± un bruit), posée sur l'herbe comme sur les autres sols ; aux
       abords de la ferme (6 cases), la règle d'avant : le raccord avec sa sortie ne bouge pas
       (testé : les tuiles des 5 cases autour de la ferme, les mêmes qu'avant). (5) La limite de
       l'eau profonde : un rond (± un bruit) au lieu d'un carré, tracée comme les bords. L'eau garde
       sa règle (un coin d'eau dès que deux de ses cases en sont) : la rive suit les cases où l'on
       ne marche pas.
     - **L'eau du monde** (`js/carte/ferme/eau-monde.js`) : chaque région dessinée se découpe en
       blocs de 16 × 16 cases ; un bloc qui a de l'eau est une étendue animée comme un étang de la
       ferme (les mêmes tuiles animées), son image faite près de la vue seulement ; dans la vue,
       l'eau vivante de la ferme (`CarteKit.eauVive`, `js/carte/eau.js`) : le shader des lacs et des
       rivières, celui de la mer (la houle qui roule vers la plage, l'écume, le ressac sur le sable
       mouillé). Sans couture d'un bloc à l'autre : bruits pris en px de la carte (`uOrigine`), une
       seule carte des vaguelettes (`eauCommune`), la distance à la terre qui voit les voisins
       (`eauMarge`), la lecture de l'image bornée (une texture de 256 px se répétait). Les étendues
       se font et se défont une à une (`syncEau`). La mer : ni reflets ni ronds d'insectes, sa
       houle s'efface au large. La lune ne se reflète pas dans un bloc. Avec « animations réduites »,
       l'eau reste immobile (vérifié : deux images identiques). Un gué : ses pierres restent posées
       sur l'eau qui bouge. La ferme et ses étangs : rien ne change.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader : tout le rendu se fait sur le
       processeur). Le calcul d'une région (Node, 3 mondes) : médiane 2,3 à 4,1 ms avant, 4,5 à
       7,4 ms après (90 % : 3,3 à 14,7 ms avant, 5,3 à 17,5 après) ; les éléments 150 à 190 ms
       avant, 160 à 250 après ; dans le Worker en jeu, médiane 5 à 9 ms, au plus 26 à 44 ms. Le
       temps d'une image en longeant la côte (964 images) : 60 à 62 ms avant (la mer immobile),
       91 à 95 ms après (une couche de plus sur l'eau : le shader, les scintillements) ; avec
       « animations réduites », 50 ms avant comme après ; le JavaScript de l'eau ~3 ms par image
       (faire l'eau vivante d'un bloc : ~40 ms, un bloc par image au plus). `npm test` : 32 s avant
       comme après.
     - Reste : sur une vraie carte graphique, le coût du shader de la mer est à revoir sur
       téléphone (étape 9) ; les teintes de la prairie (héritées de la ferme) gardent leurs bords
       en marches ; les rives d'herbe (celles de la ferme) aussi ; un coin isolé d'un sol peut
       faire un petit losange.
   - **Fait (5b)** : la végétation des biomes (décor seulement : couper, cueillir viendront à
     l'étape 6).
     - **Les dessins** (`scripts/carte/vegetation.py` → `assets/vegetation.png` et
       `assets/vegetation.json`, la place et le pied de chaque image ; le relancer redonne la même
       image) : 29 sortes, 135 images, dans le style des arbres de la ferme (feuillage en petites
       touffes claires sur fond sombre, lumière en haut à gauche, contour sombre). Forêt : feuillus
       (trois silhouettes, rond, large comme un chêne, haut ; deux teintes), bouleaux, sapins
       (étages de branches qui retombent), ronces, souches, troncs couchés, fougères, champignons,
       touffes ; lande : bruyère (en fleur ou non), ajoncs, genêts, pins tordus, herbes sèches ;
       marais : saules pleureurs, roseaux et massettes (cinq images chacun : ils penchent), joncs,
       nénuphars sur l'eau basse ; plage : oyats, chardons bleus, bois flotté ; montagne : sapins
       rabougris (des trous, une branche morte), rhododendrons, touffes fleuries ; prairie : l'arbre
       de la ferme et deux autres de sa teinte, ses deux buissons, ses fleurs et ses touffes (celles
       de `herbe_deco.png`, à la teinte de l'herbe de la case).
     - **La pose** (`js/engine/monde-vegetation.js`, `vegetationDeRegion`, appelée par
       `solDeRegion` : dans le Worker, déterministe ; réglée par `data/monde.json`,
       `VEGETATION`). Une liste par région : `images` et `basses`, `[sorte, x, y, variante]` (le pied,
       en px). Chaque case tire d'après la table de son biome et de son sol (les taches de la 5a : les
       sapins sur les aiguilles, les bouleaux et les fougères sur la mousse, les nénuphars sur l'eau
       basse…), si ses quatre coins ont le même sol et qu'aucun n'est du chemin ; rien sur la ferme
       et 5 cases autour, autour des lieux (hameaux, grottes, coins de pêche), dans l'eau, sur une
       falaise, un sommet, la roche nue ou la neige. Les images : moins denses en lisière (de 0,3 à
       1 selon la part du biome dans 9 × 9 cases), des clairières en forêt (un bruit : des touffes,
       des fougères, quelques bouleaux), l'écart (de deux tirages trop proches, le plus fort reste :
       ne dépend que des cases voisines, donc pas de l'ordre des régions) ; les petites plantes et
       les plantes hautes par taches (un bruit) ; les oyats loin de l'eau, le bois flotté près.
       Densités mesurées (images, puis petites plantes, par case) : forêt 0,12 et 0,08, marais 0,09
       et 0,09, lande 0,02 et 0,16, montagne 0,03 et 0,05, prairie 0,003 et 0,04, plage 0 et 0,04 ;
       bornes testées (`VEGETATION.BORNES`).
     - **La scène** (`js/carte/ferme/vegetation.js`) : les petites plantes sont peintes dans le
       canevas de leur région (2,5 ms de plus pour peindre une région, ~31 ms) ; les arbres, buissons
       et plantes hautes sont des images découpées d'une seule planche (pas de canevas), rangées selon
       leur pied, créées par blocs de 16 × 16 cases près de la vue seulement (quelques centaines à la
       fois : ~400 dans une forêt dense), culées hors de la vue ; transparentes quand le personnage
       passe derrière (le masque de chaque image, comme `decor.js`), avec leur ombre au soleil ; les
       roseaux et les massettes penchent quand on les traverse (`CarteKit.herbe`).
     - **La marche** : le pied d'un arbre ou d'un buisson (deux cases pour un tronc couché) est fermé
       dans la marche de la région (`caseMarchable`) ; les petites plantes et les plantes hautes se
       traversent ; jamais sur une case de chemin (testé : toutes restent marchables).
     - **Mesuré** (Chromium sans carte graphique : SwiftShader). Une région dans Node : médiane 4,4
       à 6,0 ms avant, 5,6 à 8,8 ms après (au plus 20 à 59 avant, 12 à 22 après) ; dans le Worker en
       jeu, médiane 9 ms avant, 15 à 19 ms après. Le temps d'une image en glissant au-dessus d'une
       forêt dense (723 images) : 58 ms avant, 62 ms après sans les images des arbres, 78 à 81 ms avec
       (le JavaScript de la végétation : ~0,05 ms par image ; le reste est le dessin de ~400 images
       qui se recouvrent, fait par le processeur sous SwiftShader). `npm test` : 31 s avant, 34 s
       après (les tests de la végétation : 3,6 s).
     - Reste : sur une vraie carte graphique, mesurer le dessin des arbres sur téléphone (étape 9) ;
       couper les arbres, cueillir (étape 6) ; les rochers et éboulis en relief (fiche 5c).
   - **Fait (5c)** : les rochers, les falaises et la côte (décor seulement : casser, ramasser dans le
     monde viendront à l'étape 6 ; les rochers de la ferme et leurs identifiants ne changent pas).
     - **Les dessins** (`scripts/carte/roches.py` → `assets/roches.png` et `assets/roches.json` ; le
       relancer redonne la même image) : 20 sortes, 310 images, dans le style des rochers de la
       ferme (`rochers.py` : leur pierre, leur contour, leurs pans plats éclairés en haut à gauche) :
       rochers d'une case, gros blocs de granit et rochers moussus de deux cases, éboulis (des amas
       de pierres), aiguilles de roche (nues ou enneigées), rochers et sapins enneigés (le sapin de
       la 5b, la neige sur ses branches), rochers dans l'eau (pierre mouillée, liseré d'écume) et
       quatre images de l'écume qui bat autour, une barque échouée ; galets, pierres (moussues en
       forêt), coquillages, étoiles de mer, algues, congères, peints dans le sol. Les falaises : des
       colonnes de 16 px (une texture de 48 px de large qui se répète, la colonne en prend la
       tranche de sa case modulo 3 : pas de couture), une face vue à 45° (14 px par case) en pans de
       roche et en strates (corniches claires, leur ombre), son rebord de roche, d'herbe qui pend ou
       de neige et de glaçons ; 3 hauteurs × 9 bouts (la bande continue, fait une marche ou
       s'arrête, de chaque côté) × 3 tranches.
     - **La pose** (`js/engine/monde-roches.js`, réglée par `data/monde.json`, `ROCHES`) : dans le
       même calcul que la végétation (`solDeRegion`, dans le Worker), entre ses tirages et sa pose
       (`apresTirages`). Les falaises : une colonne au bas de chaque bande de cases « hautes » du
       plan (falaise, sommet), haute de la bande (3 cases au plus), son pied au ras de l'eau ou au
       bas de sa case : du plan seul, sans hasard, donc continues, une fois chacune, dans la région
       de leur case (testé sur des mondes entiers). Le sol de la falaise et de la neige ne dérive
       plus et ne prend un coin que si toutes ses cases de terre en sont : il reste sous les
       colonnes. Les autres pièces : la table de chaque biome et de chaque sol (`DENSITES` ; la
       montagne au-dessus du relief 0,87, ses rochers et sapins enneigés, ses congères), les éboulis
       au pied des pentes (la pente du relief) et des falaises, les rochers dans la mer à 1 à 4
       cases du rivage, par groupes (plus nombreux au pied des falaises), l'épave (une par monde au
       plus : un coin de plage au bord de la mer tiré parmi tous, puis la meilleure place de sa
       fenêtre, loin des chemins) ; l'écart comme la végétation (de deux tirages proches le plus fort
       reste) et jamais près d'un arbre gardé (le cadre des tirages de la végétation passe de 5 à 9
       cases autour de la région) ; les petites plantes ne poussent pas sous une pièce, les petites
       pièces pas sur une plante. Rien sur la ferme et sa marge, un chemin, un gué, un lieu, ni dans
       l'eau (sauf les rochers dans la mer), ni au bas des sommets.
     - **La scène** (`js/carte/ferme/vegetation.js`, qui découpe maintenant deux planches) : les
       petites pièces peintes dans le canevas de la région après les petites plantes ; les grandes en
       images rangées selon leur pied, par blocs près de la vue, transparentes quand le personnage
       passe derrière, avec leur ombre au soleil (pas les falaises, dont la face regarde le soleil) ;
       l'écume sous chaque rocher dans l'eau tourne (240 ms par image), culée avec lui, immobile avec
       « animations réduites » (vérifié : deux captures identiques). La mer (`js/carte/eau.js`,
       `EAU_MER`) : près de la plage, chaque crête de la houle déferle en une lame d'écume blanche,
       un creux sombre devant elle, de l'écume derrière.
     - **La marche** : les rochers, gros blocs, éboulis, aiguilles, sapins enneigés et l'épave ferment
       leurs cases (`bloque`) dans la marche de la région ; galets, pierres, coquillages se
       traversent ; la falaise et les sommets restaient fermés. Vérifié dans Chromium : le personnage
       contourne un gros bloc, longe une falaise sans la traverser, une aiguille devient
       transparente quand il passe derrière ; testé : aucune case de chemin fermée.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader, la même graine, 2 parties de chaque).
       Une région dans Node (3 mondes) : médiane 5,7 à 7,2 ms avant, 7,3 à 9,5 ms après (90 % : 7,2 à
       19 avant, 8,6 à 24 après) ; dans le Worker en jeu, médiane 12 à 16 ms avant, 20 à 24 ms
       après. Le temps d'une image en glissant le long du mur des sommets (900 images) : 47,6 à
       49,7 ms avant, 48,9 à 52,3 ms après (~150 images près de la vue) ; le long de la côte sud :
       89,2 à 92,3 ms avant, 91,3 à 96,9 ms après. `npm test` : 34,5 s avant, 35,7 s après.
     - Reste : pas de lac gelé (aucun lac n'est assez haut dans les plans essayés : les glaçons
       pendent des falaises des sommets) ; une bande de falaise en biais fait des marches d'une case
       (des colonnes décalées) ; le côté d'une bande nord-sud n'a pas de face (vue de haut, il ne se
       voit pas) ; casser, miner, ramasser (étape 6).
6. ✅ **Les ressources et la vie de chaque biome** (2 PR, fait) : ce qui se ramasse, les minerais et
   les grottes de la montagne, la pêche, les animaux à regarder.
   - **Fait (6a)** : couper, casser, cueillir et ramasser dans le monde (`js/engine/monde-recolte.js`,
     `js/carte/ferme/recolte-monde.js` ; les arbres, rochers et herbes de la ferme et leurs
     identifiants ne changent pas).
     - **Ce que donne chaque sorte** (`data/monde.json`, `RECOLTE.SORTES` ; vérifié par
       `scripts/lib/data.mjs`) : le geste (`couper` à la hache, `casser` à la pioche, `faucher` à la
       faux, `cueillir` ou `ramasser` à la main), les coups, ce qui tombe à chaque coup et à la fin
       (`{ objet: [au moins, au plus] }`, plus des chances : la graine d'un arbre), le délai de
       retour en jours. Les arbres (feuillus, bouleaux, sapins, saules, pins tordus, sapins nains et
       enneigés, arbres des prés) : 2 ou 3 coups, du bois à chaque coup et 1 à 3 de plus à la chute,
       parfois une pomme de pin ou un gland ; les buissons (des prés, ajoncs, genêts) : un coup ; les
       souches et troncs couchés : du bois, de retour en 12 à 20 jours. Les rochers, rochers moussus,
       gros blocs (5 coups), éboulis et rochers enneigés : de la pierre. La faux : les fougères, la
       bruyère, les joncs, les roseaux, les massettes et les oyats (de la fibre). À la main : les
       mûres des ronciers (ceux qui en portent : un roncier en fleur n'en a pas ; cueilli, il reste
       là, en fleur, jusqu'à son retour), les champignons, les herbes de montagne (les touffes
       fleuries), le bois flotté, les galets et les pierres (de la pierre), les coquillages (une
       coquille, parfois un bulot), les étoiles de mer, les algues. Restent du décor : les falaises,
       les pitons, les rochers dans la mer, l'épave, les fleurs et les touffes des prés et de la
       forêt, les herbes sèches, les chardons, les nénuphars, les rhododendrons, les congères.
     - **Trois objets nouveaux** (`data/items.json`, leur icône dans `scripts/icones/art_nature.py`,
       l'encyclopédie et l'aide) : les mûres (un fruit, mangeable, 2 nuits), l'étoile de mer et les
       algues (des produits, vendables : la calèche les achètera). Le reste existait.
     - **Le moteur** : `state.monde.pris[id]`, par l'identifiant de la pièce, « sorte:x,y » (le nom de
       sa sorte, son pied en px : `idObjetMonde`, le même dans le Worker, la scène et le moteur ;
       jamais un rang dans une liste) : un nombre (les coups reçus), `{ retour }` (prise : ni dessinée
       ni fermée à la marche) ou `{ retour, cueilli }`. Une action par geste (`couperMonde`,
       `casserMonde`, `faucherMonde`, `cueillirMonde`, `ramasserMonde` ; `recolterMonde` choisit) :
       l'outil, la distance (`RECOLTE.PORTEE` cases du personnage), l'énergie, l'XP et le coup fort
       de la ferme ; ce qui tombe d'un coup va au sol (`state.morceaux`, à ramasser en marchant
       dessus), ce qui se prend à la main dans l'inventaire ; le journal (`ramasse`, les actions).
       Les tirages (quantités, jour du retour) viennent de la pièce et du jour. La région de la pièce
       devient vue. Au réveil (`repousseMonde`, `night.js`) : les coups reçus s'oublient, ce dont le
       jour est venu revient, dans une région vue seulement, pas sous le personnage (sa case,
       `state.monde.ici`, que la carte donne à chaque pas) ; l'entrée s'efface (la sauvegarde ne
       garde que ce qui manque).
     - **Sauvegardes** : format 54 ; la migration 53 → 54 donne `state.monde.pris = {}`.
     - **Le Worker et la scène** : le Worker ne change pas (la pièce donne son identifiant :
       `idDansRegion`, `objetsDeRegion`). La scène lit `modèle.monde` (`pris`, `cueillis`) : une image
       prise est cachée (`vegBlocOn` la fait cachée quand sa région revient), une petite pièce prise
       n'est plus peinte (ses cases et leurs voisines repeintes, le dessin borné à elles : celles des
       voisines qui y débordent restent justes), un roncier cueilli prend son dessin en fleur. Un
       appui sur une pièce (avec l'outil qu'il faut, ou à la main) : le personnage y va et fait le
       geste de la ferme ; l'arbre tremble à chaque coup, bascule au dernier, rebondit en lâchant ses
       feuilles et s'efface (il ne laisse rien) ; le rocher lâche ses éclats et se brise ; ce qui est
       pris à la main monte et s'efface, la bulle « +2 » au-dessus de lui. Le coup fort de la hache
       et de la pioche vise aussi la pièce du monde la plus proche.
     - **La marche** : `caseMarchable(T, t, sol, ouvertes)` : les cases fermées d'une pièce prise
       s'ouvrent (`casesOuvertesMonde`, refait seulement quand ce qui est pris change : lu à chaque
       case d'un trajet). Une repousse ne se fait pas sous le personnage ; une pièce n'est jamais sur
       un chemin (5b, 5c).
     - **Mesuré** (Chromium sans carte graphique, SwiftShader) : un coup ou une prise (le moteur, la
       sauvegarde, la vue rafraîchie) 0,3 à 4,8 ms ; une petite pièce prise, ses 9 cases repeintes :
       0,1 à 0,4 ms de dessin, 5 à 10 ms avec l'envoi du canevas de la région à la carte graphique
       (40 à 70 ms en jeu, pendant le geste) ; repeindre une région entière : 26 ms en médiane (rien
       de tel à un coup). `npm test` : 35,7 s avant (fiche 5c), 37,4 s après (les tests de la récolte : 2,9 s).
     - Reste : sous SwiftShader, Phaser 4 trace mal une image tournée (l'arbre qui bascule, à la
       ferme comme dans le monde : une partie de son feuillage manque pendant la chute ; à revoir sur
       une vraie carte graphique) ; le coup fort de la faux ne fauche pas encore les plantes
       du monde ; les fleurs des prés restent du décor (rien à cueillir pour l'instant).
   - **Fait (6b)** : les grottes de la montagne, la pêche dans le monde et les animaux.
     - **Les grottes** : chaque entrée du plan (`lieux.grottes`, 3 à 6) a sa bouche de roche dans la
       montagne (`scripts/carte/lieux.py` → `assets/lieux_monde.png`, `lieux_monde.json` : un éperon de
       granit, sa face en strates comme les falaises de la 5c, l'arche noire, des éboulis au pied ;
       enneigé au-dessus du relief `LIEUX.NEIGE`), posée par `js/engine/monde-lieux.js` dans le calcul
       de la région (le Worker) ; ses cases (`LIEUX.BLOQUE`) ferment la marche, la case devant reste
       ouverte. Près d'elle, la flèche des passages ; un appui sur la bouche ou la flèche, ou le
       personnage poussé vers elle, et il y entre (`js/carte/ferme/lieux-monde.js`). C'est la scène de
       la mine (`GrotteScene`, pas une copie) : le tirage des niveaux est passé dans le moteur
       (`js/engine/grotte.js`, `genererNiveau`, à l'identique pour la mine : vérifié sur 312 niveaux,
       une empreinte dans les tests), la page le donne à la scène (`FermeHote.reglages`, `niveau`). Une
       grotte du monde (`grotte?grotte=grotte_<n>`) a sa graine (« <monde>:<entrée>:<niveau>:<jour> » :
       la même grotte toute la journée), `GROTTE.MONDE` (`data/grotte.json`) : 5 niveaux, plus de
       minerai (0,1 au lieu de 0,07, qui grandit plus vite), l'or dès le niveau 1 et le platine dès le
       2, du quartz et des améthystes dans les murs (l'objet lui-même : `mineOre` ; leurs cases dans
       `assets/grotte_tuiles.png`, à la fin de la planche), et un filon par entrée (cuivre, or,
       platine, quartz ou améthyste, son poids doublé ou × 2,5, tiré de la graine du monde et de
       l'entrée ; dit au premier niveau). En remontant l'échelle du premier niveau
       (`jeu.html?arrivee=grotte_<n>`), le personnage ressort de l'arche, devant l'entrée, au même
       jour et à la même heure (le temps a passé comme à la ferme) ; la page rechargée dans la
       grotte : il attend que la région de l'entrée soit faite. La mine de la ferme ne change pas. Le
       god mode mène aussi à une grotte de la montagne (niveaux 1 et 4).
     - **La pêche** : la canne s'utilise au bord de toute eau du monde (`peche.js` : l'eau sous le
       doigt lue dans sa région, la rive cherchée comme sur la ferme ; même geste, même bouchon, même
       touche). `CANNE.PRISES` : les lacs (omble, truite), les rivières (nouvelles : truite, goujon),
       la mer (dorade, sardine, anchois) ; les prises se comptent par eau du monde (tous les lacs
       ensemble, toutes les rivières, la mer). Les coins de pêche du plan (`lieux.peche`) sont
       meilleurs (`CANNE.COINS` : à 3 cases au plus ; plus de touches, un poisson rare : le brochet au
       lac, le saumon en rivière, le bar en mer ; 8 à 12 prises par jour, comptées pour chaque coin,
       à part de son eau). Leur décor : un ponton de trois cases qui avance sur un lac ou la mer (on
       marche dessus, on pêche au bout : ses cases s'ouvrent), sinon des piquets, une nasse et un
       filet sur la rive (les rivières) ; des remous montent de l'eau tout près. Trois objets
       nouveaux (`data/items.json`, icônes dans `scripts/icones/art_ville.py`, l'encyclopédie, l'aide)
       : le goujon, le saumon, le bar ; leurs poissons qui sautent (`FISHING.monde`).
     - **Les animaux** (`js/engine/monde-faune.js`, `data/monde.json` : `FAUNE`) : 14 espèces, posées
       de façon déterministe par région, dans le Worker (des groupes tirés selon la part de leurs
       biomes dans la région, sur des cases permises : la terre où l'on marche, l'eau, l'air ; ni la
       ferme et 8 cases autour, ni un chemin, ni un lieu ; 22 au plus par région) : marmottes et
       bouquetins en montagne, aigles au-dessus des sommets (leur ombre au sol, leur silhouette), mouettes
       et crabes sur la plage, dauphins au large, canards (sur les lacs et l'eau basse du marais) et
       cygnes ; nouvelles (`scripts/carte/faune.py`, dans son style) : chevreuil, renard, lapin,
       écureuil (forêt ; le renard aussi sur la lande, le lapin dans les prés), lièvre et perdrix
       (lande). La scène (`js/carte/ferme/faune-monde.js`) : leurs images près de la vue seulement (10
       à 14 à la fois dans les essais, ~80 dans les régions dessinées), retirées avec leur région ;
       elles respirent, vont et viennent à 3 cases de leur place, fuient le personnage chacune à sa
       façon (elles courent, rentrent au terrier, s'envolent, nagent plus loin), le dauphin saute de
       temps en temps, l'aigle tourne ; la nuit elles dorment ou se cachent ; immobiles avec «
       animations réduites ». On ne les chasse pas : un appui dit leur nom et ouvre leur page de
       l'encyclopédie (une catégorie « La faune du grand monde », 15 pages), découverte la première
       fois qu'on en voit une (`faune:<espèce>`). Rien sur la ferme.
     - **Sauvegardes** : la forme ne change pas (format 54) : les prises du jour vont dans
       `state.outils.peche.prises` (par eau, par coin : `peche_<n>`), les bêtes vues dans
       `state.encyclopedie.evenements` ; pas de migration. Le minerai pris dans une grotte du monde,
       comme celui de la mine : `localStorage` (« ferme-grottes »), le jour même.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader, la même graine, 2 parties de chaque,
       450 images en glissant) : en montagne, 63,7 à 66,4 ms par image avant (médiane 61,5 à 62,9),
       59,7 à 63,1 ms après (médiane 57,7 à 60,6) ; sur la côte, 69,7 à 76,2 ms avant (médiane 67,4 à
       72,8), 66,8 à 72,2 ms après (médiane 65 à 68,5) : pas de différence au-delà du bruit. Le
       JavaScript des bêtes : 0,07 à 0,08 ms par image (au plus 2 ms), celui des lieux 0,01 ms. Une
       région dans Node (3 mondes) : médiane 6,5 à 9,3 ms avant, 7,0 à 10,5 ms après (90 % : 7,8 à
       22,1 avant, 11,1 à 23,8 après). `npm test` : 36,4 s avant, 35,9 à 37,1 s après (les tests de la fiche : 3,7 s).
     - Reste : les grottes de la montagne n'ont pas de dessin à elles (les tuiles de la mine) ; un
       canard du marais va et vient sur l'eau basse comme sur la vase voisine ; les bêtes ne se
       voient pas entre elles (deux d'un groupe peuvent se croiser) ; l'aigle tourné est dessiné par
       le processeur sous SwiftShader (à revoir sur une vraie carte graphique, comme l'arbre qui
       bascule de la 6a).
7. ✅ **Les habitants et la calèche** (3 PR, fait) : les hameaux bâtis en blocs, leurs familles et
   leurs métiers (bûcheron, pêcheur, mineur, berger, cueilleur) ; la calèche du Marché et sa
   tournée.
   - **Fait (7a)** : les hameaux bâtis (vides : les habitants viendront à la fiche 7b, la calèche à la
     7c ; les maisons sont ouvertes, sans personne, pour qu'on les visite).
     - **Le plan d'un hameau** (`js/engine/monde-hameaux.js`, `planHameau`, réglé par `data/monde.json` :
       `HAMEAUX`, vérifié par `scripts/lib/data.mjs`) : tiré de la graine du monde et de l'id du hameau,
       une fois pour tout le monde avec les éléments (`elementsSol` → `plansDesHameaux`, dans le Worker),
       dans un carré de `RAYON` (18) cases autour de sa case. Le style vient du pays autour (`caractere` :
       la part de la montagne, de la côte, du marais, de la forêt, de la lande dans 30 cases, rapportée à
       son seuil ; sinon la prairie) : pierre et ardoise en montagne, pierre de taille blanche et tuiles
       sur la côte, bois et chaume en forêt et sur la lande, bois et roseaux au bord du marais (et un
       platelage de planches devant les maisons), pierre et tuiles dans les prés. Une place de terre
       battue (3 cases de rayon, pavée en montagne et sur la côte) que traversent les chemins du plan,
       son puits, son banc et un panneau au nom du hameau là où un chemin arrive ; 3 à 7 maisons de 6 × 5
       à 11 × 7 cases, la porte au sud, des fenêtres sur la façade, une cloison (une chambre) dès 8 cases
       de large, deux dès 11 ; chaque pièce a ses meubles (la salle commune : son foyer — four ou
       cuisinière —, sa table et ses chaises, un buffet ou une armoire, un coffre, un lit clos ; les
       chambres : des lits d'adulte et d'enfant, un chevet, une armoire), placés contre les murs, et
       chaque case des pièces se rejoint depuis la porte ; une ruelle de terre (9 cases au plus) relie
       chaque porte à la place, à un chemin ou à une autre ruelle ; les maisons ne se touchent pas. Puis
       1 à 3 jardins clôturés (un potager : des rangs de légumes sur la terre ; un verger une fois sur
       trois : des arbres fruitiers), leur portillon relié par une ruelle ; des tas de bois contre les
       maisons, un poulailler vide, le lieu de travail du métier (`TRAVAIL` : le billot et les tas de bois
       du bûcheron, la barque et le séchoir à filets du pêcheur, le wagonnet et le tas de minerai du
       mineur, l'enclos clôturé et son auge du berger, la claie et les paniers du cueilleur), posés sans
       couper aucun passage. S'il manque de la place pour 3 maisons : des maisons plus petites (5 × 5),
       puis un carré plus grand, enfin une place réduite (un hameau coincé entre des falaises).
     - **Pour la fiche 7b** : le plan garde les maisons (`id`, emprise, porte et case devant, pièces et
       leurs cases, lits et leur sorte, foyer, fenêtres), le métier que le lieu suggère (`metierDuLieu` :
       mineur près d'une grotte, pêcheur près de l'eau, bûcheron près de la forêt, berger sur la lande,
       sinon cueilleur), les lieux de travail (`travail`, le premier porte son `lieu` : atelier, ponton,
       enclos), les jardins, la place, les ruelles.
     - **Les dessins** (`scripts/carte/hameaux.py` → `assets/hameaux.png`, `hameaux.json` ; le relancer
       redonne la même image) : les murs, fenêtres et portes des trois matières repris de
       `murs_hauts.png` et `blocs.png` (les mêmes blocs que la maison du joueur, leurs 16 raccords), les
       meubles de `meuble_*.png`, le four et la cuisinière, la barrière, le puits, les sols (plancher,
       dalles, tomettes, pavés), les arbres en fruits du Verger, les légumes de `crops.png` ; dessinés
       pour les hameaux, dans le style des blocs : le banc, le panneau, les tas de bois, le billot, la
       barque, le séchoir à filets, le wagonnet, le tas de minerai, l'auge, la claie, les paniers, le
       poulailler, le coffre. Les toits : `CarteKit.toit` (js/carte/toit.js) prend une couverture
       (ardoise, chaume, roseaux ; sans elle, la tuile de la ferme, inchangée).
     - **La pose** (`hameauxDeRegion`, dans `solDeRegion`) : les murs, fenêtres, meubles qui ferment,
       clôtures, puits, banc, panneau, dépendances et arbres ferment leurs cases dans la marche de la
       région ; les portes, les lits, les tapis, les planchers s'ouvrent. La place et les ruelles sont
       de la terre battue, peinte comme le chemin (ses coins, `monde-sol.js`) ; les planchers, les pavés,
       la terre et les légumes des potagers sont peints dans le sol de la région. Ce qui est bâti, et 2
       cases autour, est réservé (`ctx.reserves`) : ni végétation, ni rochers, ni bêtes. Le hameau
       s'écarte des entrées de grotte et des coins de pêche (4 cases), qui ne bougent pas. Aucun chemin
       n'est fermé. Vérifié (tests) : le sol, la marche, les arbres et les rochers à plus de 8 cases d'un
       hameau sont les mêmes qu'un monde sans hameaux bâtis ; rien sur la ferme.
     - **La scène** (`js/carte/ferme/hameaux.js` ; les pièces : une quatrième planche de `vegetation.js`,
       des images rangées selon leur pied, par blocs près de la vue, transparentes quand le personnage
       passe derrière, avec leur ombre) : un toit par maison, posé sur ses murs comme chez lui, fait quand
       la région du hameau est dessinée et retiré avec elle (une clé de texture neuve à chaque fois : une
       texture retirée puis refaite sous la même clé plantait le rendu, de temps en temps), qui s'efface
       quand le personnage est dans la maison et à moitié quand il passe derrière, et porte son ombre au
       soleil (`sunPrisms`) ; sa cheminée au-dessus
       du foyer, d'où monte la fumée (pas avec « animations réduites ») ; la nuit, la vitre des fenêtres
       et le sol devant elles s'éclairent, le dedans aussi quand le toit s'efface (dans le voile, avec les
       lanternes : `stepFenetresHameaux`). Un appui sur le panneau dit le nom du hameau.
     - **La marche et les outils** : on entre par les portes, on bute sur les murs, les clôtures, les
       meubles ; dans un hameau (`hameauOutil`, en premier dans `hitAt`), la houe, le mode Construire et
       planter un arbre partout, la hache sur un arbre ou dans un jardin, la faux dans un jardin, la
       pioche sur ce qui est bâti disent qu'on n'y fait pas cela (« On ne casse rien au Gué… ») ; marcher,
       pêcher restent permis.
     - **La découverte** : le personnage qui entre dans un hameau le dit à la page (pont `hameau`) ; la
       première fois, une bannière à son nom (« Un hameau de la forêt — Les Saules ») et la sauvegarde le
       retient (`state.monde.hameaux`, par id : `{ nom, style, jour }`, `voirHameau`). L'encyclopédie a
       une catégorie « Les hameaux du grand monde » et sa page « Les hameaux » (condition `hameau`), qui
       liste ceux qu'on a vus ; l'aide en parle (les outils).
     - **Sauvegardes** : format 55 ; la migration 54 → 55 donne `state.monde.hameaux = {}`.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader). Une région avec un hameau dans Node (3
       mondes, 27 régions, médiane de 7 calculs chacune) : médiane 7,6 à 20,6 ms avant, 7,4 à 15,8 ms
       après (au plus 13 à 33 avant, 26 à 36 après) ; les éléments (une fois, dans le Worker) : 160 à 205
       ms avant, 245 à 340 ms après (les plans des hameaux : 80 à 120 ms). Le temps d'une image en
       traversant cinq hameaux (2 parties de chaque, ~400 images) : moyenne 56,3 et 63,9 ms avant (médiane
       50 et 66,6), 62,4 et 63,1 ms après (médiane 66,6) : pas de différence au-delà du bruit. `npm test` :
       39,6 s avant, 44,0 à 44,2 s après (les tests de la fiche : 4,5 à 7 s).
     - **Corrigé en passant** (fiche 5a) : un bloc d'eau du monde qui s'en allait (`eauBlocOff`,
       `js/carte/ferme/eau-monde.js`) retirait sa texture alors que le shader de son eau vivante la
       lisait encore, jusqu'au prochain `syncEau` : le rendu de l'image plantait (« Cannot read
       properties of undefined (reading 'source') ») quand la vue sautait loin de l'eau (vu aussi sur le
       jeu d'avant la fiche). Son eau vivante est maintenant défaite d'abord.
     - Reste : les maisons n'ont pas d'étage, leur porte est toujours au sud ; pas de pilotis au marais
       (du bois et un platelage) ; le dedans n'a qu'une lueur unie la nuit (pas les rayons des
       fenêtres de la maison du joueur) ; un hameau sans chemin (coincé entre des falaises, le plan du
       monde n'a pas pu l'y relier) reste sans chemin.
   - **Fait (7b)** : les habitants des hameaux (la calèche, la vente et l'Atelier viendront à la fiche 7c).
     - **Les familles** (`js/engine/habitants.js`, `peuplerHameau` ; réglées par `data/monde.json` :
       `HABITANTS`, vérifié par `scripts/lib/data.mjs`) : chaque maison du plan a son foyer, tiré de la
       graine du monde, du hameau et de la maison (jamais de `state.rngSeed` : la ferme ne bouge pas) :
       un ou deux adultes (`ADULTES`, un seul une fois sur 25 : `SEUL`), zéro à trois enfants
       (`ENFANTS`), jamais plus que de lits (les adultes dans les lits d'adulte d'abord, les enfants
       dans ceux d'enfant ; chacun a le sien) ; un prénom (`PRENOMS`, 40 par genre) et un personnage
       des planches existantes (`PERSOS` : ceux d'un adulte ou d'un enfant, rangés par genre d'après
       leur dessin), sans répétition dans un hameau. Le premier adulte fait le métier du hameau
       (`metierDuLieu` de la 7a), le second le même (45 %), un autre (30 % : cueilleur, berger,
       pêcheur ou bûcheron) ou il tient le jardin (le jardinier). Les foyers naissent à la découverte
       du hameau : la page donne au moteur le plan que le Web Worker a tiré (`js/ui/habitants.js`,
       `peuplerDepuisCarte`, appelé par le pont `hameau`), avec l'eau où pêchera le pêcheur (le coin de
       pêche le plus proche du plan du monde, sinon la mer sur la côte, la rivière ailleurs) ; le
       moteur n'en garde que ce qu'il lui faut (les membres et leur lit, le nombre de potagers et de
       vergers, le poulailler) : la nuit ne refait jamais le plan. Une partie d'avant, qui a déjà vu des
       hameaux, les peuple dès que les plans sont là (`peuplerLesVus`).
     - **La journée** (`habitantsNuit`, appelé par `runNight` avant le jour suivant ; chaque foyer, que
       le joueur soit là ou non, rattrape au plus `RATTRAPAGE` jours) : chaque adulte fait `ACTIONS`
       actions de son métier (une de moins quand le foyer est triste, sous `TRISTE`), moins celles
       faites sous les yeux du joueur : le bûcheron du bois (et parfois une pomme de pin), le pêcheur
       un poisson de son eau (mer : sardine, anchois, dorade, bar ; lac : truite, omble, brochet ;
       rivière : truite, goujon, saumon ; ou le poisson du Marché), le mineur de la pierre et parfois du
       fer, du cuivre, du quartz, le berger du lait et parfois de la laine, le cueilleur des baies, des
       champignons, des mûres, des myrtilles, des châtaignes (des objets qui existaient tous : aucun
       nouveau). Le jardin du foyer donne 2 à 3 légumes par membre (plus avec un jardinier), chaque
       potager du hameau 1 à 2 de plus, chaque verger 1 à 2 fruits, le poulailler 0 à 2 œufs. Le repas,
       avec les règles de la famille du joueur : le besoin de `FAMILLE.AJ` (50 par adulte, 25 par
       enfant), les plats de la cuisine du métier (`RECETTES` : gratin, soupe, compote, bocal de
       légumes ; le poisson grillé du pêcheur, le fromage frais du berger, l'omelette aux champignons
       du cueilleur), différents d'abord (`BONHEUR.PLATS_MAX`, même le besoin couvert : pour le plaisir),
       puis d'autres plats, puis des aliments crus ; le bonheur suit `mealHappinessDelta`
       (`js/engine/bonheur.js` : le déclin, les plats, la faim), de 0 à `BONHEUR.MAX`. Le garde-manger
       garde `GARDE` (6) aliments de chaque sorte ; le reste, et tout ce qui ne se mange pas (bois,
       pierre, minerai, laine), va à la **réserve du hameau** (`RESERVE_MAX`, 600 par objet ; ce qui
       dépasse se perd). La bourse (`ARGENT`, 120) attend la calèche. Le journal garde les `JOURNAL` (7)
       derniers jours (ce qui a été produit, cueilli au jardin, mangé, la part du repas, le bonheur, ce
       qui est allé à la réserve, les gestes vus). Simulé sur 20 nuits (3 mondes) : la plupart des
       foyers mangent à leur faim ; ceux qui vivent de la pierre ou du bois, sans jardinier, ont un
       repas plus maigre et un bonheur plus bas (de 0 à 60), les pêcheurs et les bergers vivent mieux.
     - **Ancien modèle** (l'archive : `js/engine/voisins.js`) : repris, la journée vécue chaque nuit
       que le joueur soit là ou non, le rattrapage, le quota du jour où compte ce que le joueur a vu
       (`voisinAbat` → `habitantAgit`), le besoin journalier, les plats différents d'abord puis les
       aliments crus, le bonheur des repas, le journal. Changé : pas de marché ni d'achats (ils mangent
       ce qu'ils produisent et ce que donnent les jardins, la calèche de la 7c achètera la réserve et
       remplira la bourse), pas de caisse ni de livreur, pas de maisons par étapes (plus tard), cinq
       métiers au lieu de deux, une famille tirée par le moteur (plus par la page), une réserve par
       hameau, et rien ne lit `state.rngSeed`.
     - **Sous les yeux du joueur** : `habitantAgit(state, hameau, membre, geste, arbre)` : un geste
       fini compte une fois dans la journée de son foyer (le quota du jour : au-delà, « sa journée est
       faite » ; la nuit ne refait que ce qui reste) ; un arbre du monde abattu par un bûcheron est pris
       comme si le joueur l'avait coupé (`prendreParHabitant`, `js/engine/monde-recolte.js` : son jour
       de retour, sa région vue, il repousse avec les autres ; le même arbre ne compte pas deux fois).
     - **Sauvegardes** : format 56 ; la migration 55 → 56 donne `state.monde.habitants = {}` (les
       hameaux déjà vus se peuplent à la visite suivante).
     - **La scène** (`js/carte/ferme/habitants.js`, des méthodes de la scène de la ferme ; le modèle de
       la carte : `habitants`, leur personnage, leur métier, leur lit, l'horaire `HABITANTS.HORAIRE`) :
       les habitants d'un hameau sont faits avec ses toits (la région du hameau dessinée) et s'en vont
       avec eux ; la planche de chacun se charge à la demande. À la première image, chacun est déjà où
       l'heure le veut. L'horaire (chacun avec un petit retard à lui) : au lit avant 6 h 30 et après
       21 h 30 (et toute la nuit), sous la couverture des lits des maisons (`meuble_lit_*_drap`) ; dans
       la maison jusqu'à 7 h 30 ; au travail jusqu'à midi et de 13 h 30 à 18 h ; le repas à midi et à
       18 h (le premier adulte cuisine devant le foyer, les autres dans la salle) ; le soir, dedans ou
       devant la porte. Au travail, le geste de chaque métier (les planches des personnages : hache,
       pioche, canne, faux, ramasser) : le bûcheron fend au billot ou près des tas de bois et, de temps
       en temps (un arbre à la fois par hameau, 30 à 60 s pour chacun), abat un arbre du monde à moins
       de 20 cases (il tremble à chaque coup, bascule et s'efface : `mondeAbat` de la 6a, sans faire
       trembler la vue) ; le pêcheur pêche depuis la rive la plus proche de sa barque (des places à
       deux cases l'une de l'autre, cherchées une fois), tourné vers l'eau ; le mineur pioche devant
       l'entrée de grotte voisine (45 cases au plus ; les premiers) ou au wagonnet et au tas de
       minerai ; le berger soigne ses moutons dans l'enclos (deux bergers et deux moutons, de la
       planche de l'Étable ; ils dorment la nuit) ou fauche l'herbe autour ; le cueilleur cueille dans
       les jardins et près des claies ; le jardinier plante et arrose. Chacun sa place (son rang parmi
       ceux de son métier). Chaque geste fini compte (le pont `habitantAgit`) et la bulle « +x » monte
       au-dessus de lui. Les enfants jouent sur la place (ils marchent, courent, s'arrêtent). Ils
       marchent par les ruelles et les chemins (`fermier.path` : les cases libres du monde, les murs
       fermés ; trois recherches par image au plus, ou 6 ms) ; loin de la vue, ils sautent à leur but
       sans chercher ; sans chemin, ils s'effacent et reparaissent ; ils contournent le personnage
       (un pas de côté ; s'il bouche le passage plus d'une seconde et demie, ils passent). Avec
       « animations réduites », ils vont d'un point à l'autre sans marcher.
     - **Parler** : un appui sur un habitant (en premier dans `hitAt`) : il s'arrête, se tourne vers le
       personnage, et sa bulle dit son prénom, son métier (« bûcheronne », « jardinier », « fils
       d'Adrien ») et une phrase (`paroleHabitant`, `HABITANTS.PHRASES`) : le salut de l'heure, ce qu'il
       fait (il dort, se prépare, part au travail, travaille — une phrase par métier —, joue, mange,
       rentre, se repose), son humeur (heureux, content, triste, ou il a eu faim). Le panneau de la
       place ouvre la fiche du hameau (`js/ui/habitants.js`, `ficheHameau`) : son métier, ses familles
       (leurs portraits, leurs prénoms et métiers, leur bonheur, la part du dernier repas) et sa
       réserve (ce qui y est entré la nuit dernière). Pas de commerce (fiche 7c). L'aide et
       l'Encyclopédie (la page « Les habitants », découverte avec le premier hameau) en parlent.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader ; Node pour la nuit). La nuit (3 mondes,
       tous leurs hameaux peuplés : 30 à 54 foyers, 51 à 81 habitants) : `runNight` d'une partie
       d'essai 0,10 à 0,15 ms sans habitants, 1,3 à 1,7 ms avec (médianes ; `habitantsNuit` seul :
       1,1 à 1,5 ms, au plus 2,3 à 4,7 ms). Le temps d'une image dans un hameau de sept maisons à 9 h
       (la même partie, 2 parties de chaque, ~100 images debout sur la place puis ~90 en marchant) :
       debout, moyenne 113,8 et 118,1 ms avant, 111,0 et 127,0 ms après (médiane 116,6 à 116,8 dans
       les quatre) ; en marchant, 111,4 et 110,8 ms avant, 119,6 et 116,7 ms après : pas de différence
       au-delà du bruit (la machine d'essai, chargée, rendait deux fois moins vite qu'aux fiches
       précédentes). Le JavaScript des habitants (11 dans la vue) : 0,13 à 0,2 ms par image (au plus 2
       ms) ; au départ du matin, quand chacun cherche son chemin, 0,5 ms en moyenne, une image à 25 ms
       au plus (une recherche de chemin vers la rive). `npm test` : 45,0 s avant, 43,9 et 51,4 s après (les
       tests de la fiche : `tests/engine/habitants.test.mjs`, 9 tests, ~2,5 s).
     - **Pour la fiche 7c** : la réserve de chaque hameau (`state.monde.habitants[id].reserve`, des
       objets du jeu et leur nombre), la bourse de chaque foyer (à remplir quand la calèche achète),
       `ficheHameau` (la fiche, où montrer les ventes), les métiers et ce qu'ils produisent par jour.
     - Reste : les habitants ne se voient pas entre eux (deux peuvent se croiser ; ils ne se
       contournent pas) ; l'enclos du berger est petit (5 × 4 cases) ; les poules du poulailler et les
       animaux du berger hors de l'enclos ne sont pas dessinés ; la nuit, un habitant ne se lève pas
       pour le joueur qui entre ; un arbre abattu hors de la vue ne l'est que dans les comptes (le
       moteur ne connaît pas les arbres, que le Worker tire) ; les aliments de la réserve ne périment
       pas.
   - **Fait (7c)** : la calèche, le Marché qui fait le tour du monde.
     - **La tournée** (`js/engine/caleche-tournee.js`, réglée par `data/monde.json` : `CALECHE`, vérifié par
       `scripts/lib/data.mjs`) : la boucle des chemins du plan (`monde-gen.js` : la sortie de la ferme et les
       hameaux dans l'ordre de leur angle, chacun relié au suivant ; un lien que le plan n'a pas pu tracer :
       tout droit), lissée comme le chemin dessiné (une moyenne sur sept cases), la ferme en tête. Ses arrêts :
       la ferme (la case au bout de sa sortie, devant l'entrée) et la place de chaque hameau, découvert ou non.
       L'horaire est le même chaque jour : à la ferme à `FERME` (10 h) pendant `ARRET_FERME` (1 h), une
       demi-heure (`ARRET`) sur chaque place ; la vitesse fait tenir le tour (sans l'arrêt du gîte) en
       `JOURNEE` (15 h), au moins `VITESSE` (150 tuiles par heure de jeu) : 150 à 216 tuiles par heure sur
       cinq mondes essayés (un tour de 1 540 à 2 480 tuiles), soit 5 à 7 tuiles par seconde réelle, un peu
       plus vite que le personnage à pied, à peu près comme lui à cheval. Elle dort dans le gîte : le hameau d'où elle part au plus près de
       `DEPART` (6 h 30) pour être à la ferme à l'heure ; elle y revient le soir (20 h à 22 h selon le
       monde), après le tour complet. Sa position (`etatCaleche(tour, heure, retenues)`) se calcule d'après le
       jour et l'heure, par une recherche dans les distances cumulées du tour (aucune simulation pas à pas :
       on la retrouve où l'heure la veut après une absence) ; seules les retenues du jour la décalent :
       hélée en chemin (`heler`, à `HELER` cases au plus) ou retenue par le commerce (`retenir`, tant que sa
       fenêtre est ouverte à côté d'elle), elle attend `RETENUE` (une demi-heure de plus à chaque fois) et
       reprend sa route d'autant plus tard, au plus `RETENUE_MAX` (3 h) par jour. La tournée ne dépend que du
       plan : le Web Worker du sol la tire avec les éléments (`js/monde-worker.js`, message `pret`), la page
       la pose dans le moteur (`poserTournee`, `js/ui/caleche.js`) ; dans Node, `tourneeDuMonde(graine)`
       (les éléments du plan, ~200 ms ; vérifié : la même que celle du Worker).
     - **Le commerce** (`js/engine/caleche.js`) : quand elle est arrêtée à `PORTEE` (4) cases du personnage —
       à un arrêt, ou hélée — (`calecheIci` ; pas la nuit au gîte, ni en roulant sans la héler, ni avant le
       niveau du Marché, 3), elle lui achète tout ce qui se vend, au prix de vente et au cours du Marché
       (`sellItem`, gardés : la ferme et ses récoltes se vendent au même prix), et ne vend que les semences
       (`isBuyable` : les graines, les jeunes arbres, ce qui se plante soi-même — blé, patate… —, au cours du
       Marché qui monte à chaque achat) et ce que son coffre porte, à `VENTE` (150 %) du prix de vente, autant
       qu'elle en a. À chaque hameau où elle s'arrête (`majCaleche`, d'après l'heure, au plus `RATTRAPAGE`
       jours après une absence), elle achète sa réserve (`habitants.js`) : `PRIS` (20) au plus de chaque objet
       par arrêt, `COFFRE_MAX` (40) de chacun dans son coffre, à `ACHAT_HAMEAU` (60 %) du prix de vente ; la
       somme va aux bourses des foyers, en parts égales ; chaque matin, elle a vendu en route tout sauf `GARDE`
       (50 %) de son coffre (elle continue d'acheter). Le dernier passage reste dans le hameau
       (`habitants[id].caleche`), que la fiche du hameau montre avec la bourse de chaque famille. La fenêtre
       (`js/ui/caleche.js`, l'ancienne fenêtre du Marché, renommée) : Vendre et Acheter (les semences, puis
       « Des hameaux » : le coffre, son stock), et un bandeau : là (« Le cocher t'attend »), à portée de voix
       (le bouton Héler), ou loin (où elle est — un hameau qu'on n'a pas vu n'est pas nommé — et quand elle
       passe à la ferme). Hors de sa présence, les cases restent visibles, pâlies.
     - **L'Atelier** reprend ce que vendait le Marché (`data/recipes.json`, `ATELIER.RECETTES`, de nouvelles
       sortes de recettes : `animal`, `cheval`, `meuble`, et `outil` pour la canne et le triporteur) : la canne
       à pêche (3 bois, 4 fibres, 1 pierre), le triporteur (4 lingots de fer, 1 de cuivre, 4 planches, 2
       fibres) ; les bêtes qu'on attire, s'il y a la place (un choix : comme on n'élève pas de rien, un appât
       où une bête du pays vient s'installer) : le nid garni d'une poule (4 fibres, 3 blés ; dès le
       Poulailler), la pierre à sel et le foin d'un mouton (4 pierres, 6 pailles, 4 fibres) ou d'une vache (6
       pierres, 12 pailles, 2 planches ; dès les moutons), le licol et les friandises du cheval (2 cordes, 6
       carottes, 4 pommes ; dès l'Écurie) ; la ruche (4 planches, 8 fibres, 1 pierre), le bac à fleurs (3
       planches, 2 pierres, 1 fibre) ; les 36 meubles (des planches, du bois, de la fibre, de la laine pour
       les tapis, les lits et le canapé, de la pierre, du fer, du quartz pour la glace et les vitres, du cuivre,
       un champignon lumineux pour le lampadaire, des baies, des mûres et des myrtilles pour la couleur, un
       coquillage pour le tableau de la mer, une pomme de pin pour le bonsaï). Elles se rangent dans les
       onglets (Outils, Meubles, Élevage : les bêtes et le cheval). Un meuble fabriqué compte comme un achat
       d'autrefois (`ajouterMeuble` : le bonheur de chacun, une fois, l'objet à poser) ; les fonctions d'achat
       du moteur (`buyAnimal`, `buyFurniture`, `buyTool`…) restent pour les tests, aucune fenêtre ne les
       appelle. Les aliments ne se fabriquent pas : ils se cultivent, se cuisinent, ou viennent des hameaux
       par la calèche. Le sucre et les épices, qu'on ne trouvait qu'au Marché : la crème de marrons et la
       tarte aux myrtilles prennent aussi du miel, le pain d'épices des herbes de montagne (des recettes « l'un
       ou l'autre »).
     - **Ce qui change ailleurs** : la campagne (« Fabriquer une houe à l'Atelier » partout), le didacticiel
       (l'argent « pour commercer avec la calèche » ; au moment des graines, elle t'en vendra d'autres ; la
       houe et les graines du début ne changent pas), l'aide (une ligne « La calèche » dans les outils, la
       houe, les poules, l'Étable, les règles), l'encyclopédie (la page « La calèche » à la place du Marché ;
       les outils, les bêtes, le cheval, la ruche, les meubles fabriqués à l'Atelier), le niveau 3 (« La
       calèche »), l'Étable et le Poulailler (où fabriquer leurs bêtes), le menu (« Calèche » 🐴). Le joueur
       automatique (`js/engine/bot.js`) vend comme avant (la calèche passe à la ferme chaque jour), achète ses
       graines, mais fabrique sa houe, sa faux et fait venir ses bêtes sans pièces (ses matériaux, il les a,
       comme pour l'arbre) ; il n'achète plus d'huile ni de farine (`SIMULATION.ACHATS_CUISINE` retiré) ; sa
       partie de 60 nuits atteint les mêmes chapitres aux mêmes nuits (2 à la nuit 5, 3 à la nuit 26) et
       garde plus de pièces (1 169 au lieu de 1 020 à la nuit 60).
     - **La scène** (`js/carte/ferme/caleche.js` ; le dessin : `scripts/carte/caleche.py` → `assets/caleche.png`) :
       le cheval bai de `scripts/personnage/cheval.py` (de profil, de face, de dos, ses quatre temps du pas)
       attelé par deux brancards à une voiture couverte (une caisse peinte, une bâche sur des arceaux, des
       roues cerclées de fer dont les rayons tournent), le cocher sur son banc (depuis la fiche 12, un vrai
       personnage du jeu, `perso_08`, assis dans ses cases `assis_<vue>_0`, les rênes en main), une lanterne ; trois vues
       (retournée pour la gauche), cinq cases chacune (quatre temps, l'arrêt), une rangée de nuit (la
       lanterne allumée). La page lui donne sa position à chaque image (le pont `caleche` ; elle n'entre pas
       dans le modèle, qui changerait à chaque pas) ; la scène la suit en douceur (le moteur avance par pas
       de 0,2 s), ne fait l'attelage que près de la vue (200 px autour) et le défait au-delà. La nuit, la
       lueur de sa lanterne entre dans le voile de l'heure (avec les lanternes de la ferme). À son arrivée à
       la ferme, une bulle (« Ding, ding ! ») et un toast. Quand elle est à 70 cases du personnage et hors de
       la vue, une icône au bord de l'écran montre sa direction ; à 9 cases sur un chemin, un bouton « Héler »
       au-dessus d'elle (ou sur l'icône) ; un appui sur elle ouvre sa fenêtre, ou la hèle.
     - **Sauvegardes** : format 57 ; la migration 56 → 57 donne `state.caleche` (son coffre, les retenues du
       jour, l'heure de ses derniers arrêts, les ventes du jour) ; l'argent, l'inventaire (ce qui avait été
       acheté au Marché reste au joueur), les outils, les bêtes, les meubles et les cours du Marché restent.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader). Le temps d'une image debout devant la ferme
       (150 images, deux fois chaque) : la calèche loin, moyenne 46,8 et 45,7 ms ; garée à côté, 51,3 et 49,2
       ms ; médiane 50,0 ms dans les quatre (le bruit de la machine d'essai). Le JavaScript de la calèche
       (`stepCaleche`) : 0,05 à 0,14 ms par image en moyenne (au plus 12 ms, une fois, quand l'attelage est
       défait). La tournée : 180 à 500 ms dans Node avec les éléments (dans le Worker, elle ne compte presque
       rien : les éléments sont déjà là). `npm test` : 46,6 s avant, 47,7 à 53,6 s après (les tests de la fiche :
       `tests/engine/caleche.test.mjs`, 12 tests, 3 à 4 s).
     - Reste : la calèche ne voit pas le personnage ni les habitants (elle passe à travers) ; elle roule à la
       même vitesse partout (la montagne, le marais) ; les habitants ne lui achètent rien (plus tard, si
       besoin) ; une tournée très longue la fait rouler vite ; au-delà de l'arrêt, sur la place, elle se gare
       là où passe le chemin (parfois devant le puits).
8. ✅ **S'orienter** (1 PR, fait) : le brouillard, la carte du monde, une boussole.
   - **Fait (8)** : le brouillard, la carte du monde et la boussole.
     - **Le vu** (`js/engine/monde-vu.js`, réglé par `data/monde.json` : `DECOUVERTE`, vérifié par
       `scripts/lib/data.mjs`) : le monde se découpe en cellules de 8 × 8 cases (81 × 64), vues ou non ;
       la sauvegarde les garde dans `state.monde.vu`, un bit par cellule en base64 (864 caractères, quel que
       soit le voyage). Rien n'est vu d'office, la ferme non plus (fiche 14b) : une nouvelle partie ne voit
       que le cercle de vue autour de la case où le personnage apparaît. À chaque case où passe le personnage (le pont `ici`), la
       page appelle `voirAutour` avec le biome de sa case (l'aperçu des biomes du Worker, un par bloc de 8 × 8
       cases) et la nuit : chaque cellule qui touche le cercle de vue devient vue. Le rayon (`RAYONS`, en
       cases) : 12 dans les prés, 15 à découvert (lande, plage, falaises), 18 en montagne, 22 sur les
       sommets (on voit de haut), 9 dans le marais, 7 dans la forêt dense ; la nuit, moitié moins
       (`NUIT`), 5 au moins. Le moteur lit toujours les régions (`state.monde.vues`, ses revues de cases et
       ses nuits) : tenues à côté, une cellule qui devient vue rend vue sa région ; celles de la ferme
       restent vues d'office pour le moteur (sous le brouillard, la ferme vit comme avant). Le mode test (le panneau, et le menu du
       god mode) : « Brouillard : tout voir » (sans toucher aux régions du moteur) et « tout cacher ».
     - **Sauvegardes** : format 58 ; la migration 57 → 58 donne `vu` (la ferme et sa prairie, et chaque
       région déjà vue en entier ; les régions de la ferme, vues d'office, seulement si le joueur est allé
       au-delà : il les a traversées), `but: null` (la boussole montre la ferme) et `boussole: true`.
     - **Le brouillard** (`js/carte/ferme/brouillard.js`) : une seule texture de la taille de la vue (et
       d'une marge), en gros pixels (2 px de carte), au-dessus de tout, du voile de la nuit compris (il
       prend lui-même la couleur de l'heure : bleu sombre la nuit, doré le soir). Un champ par case (la
       cellule de chaque case, étendu de 3 cases sur le vu, flouté de 2) : opaque sur toute cellule pas
       vue, il s'éclaircit sur le vu en 4 à 5 cases ; son bord ondule (le champ lu jusqu'à 12 px à côté,
       deux bruits) et s'effiloche, en nappes de deux tons qui dérivent au vent (immobiles avec
       « animations réduites ») : pas de cases dures. Une cellule qui devient vue se dégage en fondu
       (1,4 s). Ce qui se dresse (arbres, rochers, falaises, murs, toits, bêtes, habitants, la calèche…)
       et dont le pied est sur une cellule pas vue n'est pas dessiné du tout (le filtre de la caméra,
       `cameraFilter` : rien ne dépasse du brouillard), ne porte pas d'ombre et ne se touche pas (un appui
       sur le brouillard y fait marcher) ; la calèche n'y a ni icône au bord de l'écran ni bouton Héler,
       une bête n'y découvre pas sa page de l'encyclopédie. La texture n'est refaite que quand la vue a
       glissé de deux cases, pendant un fondu (une image sur deux) et quatre fois moins souvent pour la
       dérive ; seul le rectangle qui n'est pas transparent est dessiné ; rien sur la ferme.
     - **La carte du monde** (`js/ui/carte-monde.js` ; l'image : `js/engine/monde-carte.js`) : une fenêtre
       (le menu « 🧭 Carte du monde », la touche M, un appui sur la boussole). L'image du monde, un pixel
       par case dans le style du jeu (les biomes en deux tons semés case par case, le relief ombré, la mer
       plus sombre au large et son écume, les lacs et les rivières, les falaises, les chemins et leurs gués,
       les toits et la terre battue des hameaux), est faite par le Web Worker à la première ouverture
       (message `carte` ; sans Worker, par morceaux de 48 rangées sur la page), puis gardée ; la page y
       peint la ferme de la partie (son eau, ses chemins, ses arbres, ses rochers, ce qui y est bâti, ses
       parcelles). Par-dessus, le brouillard (une case sur deux, adouci : opaque sur le pas vu). Les
       repères : la ferme, les lieux vus (`lieuxDeLaCarte` : hameaux — leur nom une fois visités —,
       entrées de grotte, coins de pêche ; rien de ce qui n'est pas vu), la calèche dans une partie vue, le
       personnage et sa direction (`FarmStage.perso`). On la fait glisser, on zoome (deux doigts, molette,
       + et −), ⌖ revient au personnage ; un appui sur un lieu dit son nom, ce qu'il est, sa distance, et
       « Y mener la boussole » (`choisirBut`). Elle reste juste ouverte : les repères quatre fois par
       seconde (chacun garde son élément : un appui n'est jamais perdu), le brouillard et les lieux dès que
       le vu change. Trois icônes nouvelles (`scripts/icones/art_monde.py`) : 🏘️ le hameau, 🕳️ l'entrée
       d'une grotte, 🧭 la boussole.
     - **La boussole** (`js/carte/ferme/boussole.js`) : sous l'horloge, un cadran de laiton en gros pixels
       (un canevas de 30 px agrandi, redessiné quand l'aiguille tourne d'un cran sur 48), l'aiguille rouge
       vers le but, dessous son nom et sa distance en cases. Le but : le lieu choisi sur la carte (s'il est
       vu), sinon la ferme (le bout de sa sortie). Choix : sans lieu choisi, elle se cache sur la ferme (elle
       y montrerait l'endroit où l'on est) ; un lieu choisi, elle se montre partout ; à `ARRIVEE` (4) cases
       de lui, un message (« Te voilà ») et elle revient à la ferme. Un appui ouvre la carte du monde ; les
       Options la retirent (`state.monde.boussole`).
     - **L'aide et l'encyclopédie** : une ligne « S'orienter » dans l'aide (les outils) ; trois pages
       (« Le brouillard », « La carte du monde », « La boussole », connues dès le départ).
     - **Mesuré** (Chromium sans carte graphique, SwiftShader : tout le rendu se fait sur le processeur ;
       la même graine). Le temps d'une image en marchant le long du chemin de la calèche, de la ferme vers
       le premier hameau (2 parties de chaque, 2 × 20 s) : moyenne 77,0 et 87,5 ms puis 76,5 et 86,5 ms
       avant ; 84,5 et 97,7 ms puis 87,8 et 95,3 ms après (médianes 72 à 84 avant, 83 à 95 après) : environ
       10 % de plus quand le brouillard est dans la vue. Debout au bord du brouillard, en l'ôtant et en le
       remettant tour à tour (4 × 5 s chacun) : 58 à 67 ms sans, 72 à 79 ms avec ; le JavaScript du
       brouillard n'en prend que 2,8 ms par image en moyenne (10 ms au plus, à une texture refaite) et la
       revue de ce qui se dresse 0,3 ms : le reste est le dessin d'une texture translucide sur une bonne part
       de l'écran par le processeur (comme le voile de la nuit), à revoir sur une vraie carte graphique
       (étape 9). Sur la ferme, rien (pas de brouillard dans la vue). La mise à jour du vu : 0,03 ms par case
       en moyenne (sauvegarde comprise, quand une cellule s'ajoute). La carte du monde : l'image dans le
       Worker, 177 ms (les éléments déjà tirés), hors de la page ; la première ouverture dessinée en 340 ms,
       les suivantes en 70 à 110 ms. La sauvegarde : 4,2 Ko au départ avant, 5,0 Ko après ; après le tour du
       monde par les chemins (un quart du monde vu, quatre hameaux visités et leurs habitants), 11,9 Ko,
       dont 864 caractères pour le vu, toujours les mêmes. `npm test` : 48,9 s avant, 49,2 à 49,7 s
       après (les tests de la fiche : `tests/engine/monde-vu.test.mjs`, 11 tests, ~2 s).
     - Reste : le coût du brouillard sur une vraie carte graphique, et sur téléphone (étape 9) ; la carte du
       monde ne montre pas encore les bêtes vues ni les arbres abattus ; un lieu choisi qui n'est plus vu
       (le mode test a tout caché) rend la boussole à la ferme ; la ferme de la carte du monde n'a pas ses
       bâtiments dessinés (ses blocs, d'une seule couleur).
9. ✅ **La finition** (2 PR, fait) : les anciennes parties, les performances sur mobile (9a), l'aide,
   l'encyclopédie, le didacticiel et la campagne (9b).
   - **Fait (9a)** : les anciennes parties et les performances.
     - **Les sauvegardes témoins** (`tests/engine/temoins.json`) : une partie par grande époque du
       format, écrite par le moteur de la version d'alors (le code de chaque version extrait du
       dépôt, ses fonctions et les aides de ses tests : `createInitialState`, `testBatir`,
       `poserBloc`, `buyAnimal`, `plant`, `chopTree`, `couperMonde`, `peuplerHameau`, `majCaleche`…),
       puis deux à quatre nuits jouées : format 50 (le dernier d'avant le grand monde, le cheval
       attaché en ville), 51 (le grand ménage fait, la ferme seule), 52 (la ferme posée dans le monde),
       54 (un arbre du monde abattu), 57 (un hameau vu et ses habitants, la calèche). Chacune est
       avancée : la maison et son foyer, le Silo, le Poulailler et ses poules, l'Étable (deux moutons,
       une vache), le four, la cuisinière, l'Atelier, l'Écurie et le cheval, six cultures, un arbre
       abattu et un autre entamé, un rocher cassé, une touffe fauchée, le didacticiel à sa 4ᵉ étape.
       Celles d'avant la ferme générée (format 46, la ferme du grand-père) restent celles de
       `anciennes-parties.json`. Le test (`tests/engine/temoins.test.mjs`) les migre jusqu'à
       aujourd'hui et vérifie que rien ne se perd ni ne se double : l'argent, le jour, l'inventaire (le
       cheval laissé en ville rend son poteau et sa corde), chaque bloc à sa case du monde, les sols et
       les hauteurs, les bâtiments, les bêtes, le cheval à l'Écurie, les parcelles et leurs cases (une
       par case, sous aucun bloc), la famille, le didacticiel, la campagne, le niveau, les arbres,
       rochers et touffes touchés (aux identifiants du monde), la ferme en `FERME_DANS_MONDE`, vue avec
       sa prairie, ce qui a été pris dans le monde, les hameaux et leurs habitants, la calèche ; une
       deuxième migration ne change rien ; puis quatre nuits. Ce qu'elle a révélé : rien de perdu dans
       le moteur. Dans Chromium (chaque témoin posé dans `localStorage`) : la page s'ouvre sans erreur,
       les blocs et les parcelles sont exactement ceux de la migration du moteur, le personnage est
       sur sa ferme, les régions du monde autour sont dessinées.
     - **Une sauvegarde abîmée** (`reparerPartie`, `js/engine/state.js`, appelée par `migrate` à la
       version courante, et à la place d'une migration qui échoue) : chaque champ d'une partie neuve,
       et ceux de ses objets, qui manque ou n'a pas le bon type (un nombre qui n'en est pas un, une
       liste à la place d'un objet…) reprend sa valeur de départ ; le reste est gardé ; une partie saine
       n'y change pas d'un octet (testé sur tous les témoins) et ne coûte rien (aucune ferme n'est
       faite : `createInitialState(graine, { sansFerme: true })`, le modèle des champs). Testé : dix-neuf
       façons d'abîmer une partie (sans inventaire, l'argent en texte, sans famille, sans monde, le vu
       en nombre, les blocs en liste…) : la migration et quatre nuits passent. Une sauvegarde
       illisible (pas du JSON, coupée) ne bloque plus la page sans rien dire : une nouvelle partie
       commence, l'ancienne reste gardée sur l'appareil (« ferme-save-abimee ») et un message le dit.
     - **La qualité de l'affichage** (`CarteKit.qualite`, `js/carte/kit.js` ; docs/architecture-phaser.md) :
       un réglage de l'appareil (les Options, Affichage : « Auto », « Économie », « Normale » ;
       `localStorage`), jamais lu par le moteur (testé : aucun fichier du moteur ne le lit, la même
       partie donne le même résultat). En « Auto », un téléphone prend l'économie, un ordinateur la
       normale (rien n'y change). L'économie : le canvas à la moitié de la densité de l'écran (chaque
       pixel sur 2 × 2 pixels de l'écran, net ; quatre fois moins de pixels à dessiner : le gros du
       gain, le dessin étant l'essentiel du temps d'une image), le brouillard en points de 4 px de carte
       refaits deux fois moins souvent, la carte de lumière de la nuit en points de 2 px, la mer sans
       son eau vivante (ses tuiles animées : le shader de la houle était le plus cher), les arbres,
       rochers et hameaux du monde faits à 32 px de la vue au lieu de 96 (défaits à 192 au lieu de 384).
       L'aide en a une ligne (les outils). Tests : `tests/engine/qualite.test.mjs`.
     - **Mesuré** (Chromium sans carte graphique, SwiftShader ; la partie du témoin v57, la même graine ;
       temps moyen d'une image en ms, et son 90ᵉ centile, sur 7 s debout à chaque endroit). Le profil
       mobile : 390 × 844, densité 3, processeur ralenti × 4 (DevTools, `Emulation.setCPUThrottlingRate`).

       | Endroit (mobile) | Avant | Après, « Auto » (économie) | Après, « Normale » |
       |---|---|---|---|
       | La ferme | 236,7 (250) | 75,2 (100) | 255,3 (317) |
       | Forêt dense | 261,7 (300) | 79,2 (100) | 247,7 (300) |
       | Côte | 276,3 (317) | 72,5 (83) | 331,0 (400) |
       | Hameau habité | 227,4 (267) | 87,9 (117) | 271,8 (333) |
       | Bord du brouillard | 250,6 (300) | 73,0 (83) | 220,8 (250) |
       | La nuit, à la ferme | 199,5 (250) | 68,3 (83) | 216,1 (250) |
       | La nuit, en forêt | 297,2 (333) | 89,7 (117) | 288,0 (333) |
       | Carte du monde, 1ʳᵉ ouverture | 1 247 ms | 756 ms | 1 280 ms |
       | Démarrage, nouvelle partie | 12,98 s | 9,01 s | 12,61 s |
       | Démarrage, partie avancée | 13,51 s | 9,83 s | 13,15 s |

       Sur le profil mobile, chaque endroit passe de 4 à 12-14 images par seconde (trois fois moins de
       temps par image) ; la qualité normale y reste celle d'avant. Sur ordinateur (1280 × 800, la
       qualité normale, la même que la page d'avant, les deux versions servies côte à côte et mesurées
       en alternance, trois fois chacune) : la ferme 56,9 → 54,9 ms, la forêt 86,7 → 86,3, la côte
       74,4 → 77,5, le hameau 98,6 → 97,6 ; démarrage d'une nouvelle partie 2,64 → 2,61 s, d'une partie
       avancée 2,95 → 2,85 s : rien au-delà du bruit de la machine d'essai (± 10 à 15 % d'une série à
       l'autre). Le JavaScript ne compte presque pas (un profil de 6 s en forêt, sur mobile : 83 % du
       temps hors du JavaScript, dans le dessin) : c'est le nombre de pixels qui coûte.
     - **La mémoire** : après les endroits durs, le tas JavaScript est à 32 Mo, avant comme après, 210
       textures de Phaser. Allers-retours lointains répétés (la côte, un hameau, la forêt, le bord du
       brouillard, puis la ferme ; 12 tours sur ordinateur, 4 sur mobile) : les textures de Phaser (562
       à 564) et les objets de la scène (3 211 à 3 212) reviennent au même niveau à chaque tour ; le tas
       monte de 1 à 2 Mo sur les premiers tours puis à peine (une comparaison de deux images du tas : du
       code compilé, pas des objets du jeu). Deux fuites de la carte graphique, trouvées en comptant les
       textures et les tampons WebGL vivants (4 à 5 de plus de chaque à chaque aller-retour le long de
       l'eau) et corrigées dans `js/carte/eau.js` : une DynamicTexture de Phaser 4 naît avec une texture
       aussitôt remplacée et jamais rendue (`dynamique` l'efface), un Shader ne rend pas son tampon de
       sommets à sa destruction (`shaderDefait`). Après : 13 tampons et 571 textures WebGL vivants à
       chaque retour à la ferme.
     - **Les défauts corrigés** :
       - l'image tournée mal tracée sous SwiftShader (l'arbre qui bascule, l'aigle, le poisson qui
         saute, l'écureuil qui grimpe) : la cause est dans le shader des lots de Phaser 4, qui choisit
         la texture d'un point par une égalité exacte sur un nombre interpolé (`outTexDatum ==
         float(i)`), que le rendu logiciel ne retombe pas exactement sur l'entier dans un triangle
         tourné : le point devenait transparent (reproduit dans une page seule : trois textures dans le
         lot suffisent). `CarteJeu` retouche ces shaders à leur compilation (l'entier le plus proche,
         calculé une fois par point) : plus de trou, sans image pré-tournée ni autre changement ;
         mesuré : pas de coût (une texture par lot, l'autre contournement essayé, coûtait 10 à 15 % sur
         la côte) ;
       - la scène plantait à chaque image (« Cannot read properties of null (reading 'x') »,
         `calecheSignes`, depuis la fiche 7c) tant que le personnage était dans la maison ou couché,
         avec la calèche dans le monde : plus rien ne se dessinait (le soir, une partie rouverte dans la
         maison) ;
       - le grand saut d'un coup : non reproduit (99 sauts au hasard dans le monde, la vue posée d'un
         coup toutes les trois images, et plus de 40 allers-retours lointains : aucune erreur) ; par prudence,
         le sol d'une région et les blocs d'eau prennent une clé de texture neuve à chaque fois, comme
         les toits des hameaux (une texture retirée puis refaite sous la même clé plantait le rendu) ;
       - le fondu du brouillard suit l'horloge réelle (Phaser plafonne `delta` quand la fenêtre n'a
         pas le focus ou sous 5 images par seconde : une cellule y mettait 20 s à se dégager).
     - `npm test` : 49,6 s avant, 51,4 s après (les tests de la fiche : `temoins.test.mjs`, 9 tests, ~3 s ;
       `qualite.test.mjs`, 4 tests).
     - Reste, et ce qui ne se vérifie que sur un vrai téléphone : toutes les mesures sont faites sous
       SwiftShader (le dessin par le processeur) ; sur une vraie carte graphique de téléphone, le coût
       du shader de la mer, du brouillard et du voile de la nuit est à mesurer (le réglage « Auto » y
       prend déjà l'économie), comme la chaleur et la batterie, le toucher et la place des boutons au
       pouce, et le choix de « Auto » sur une tablette avec un stylet ou un clavier (elle peut prendre la
       normale) ; la mémoire de la carte graphique d'un vrai téléphone (les régions dessinées, 4 Mo
       chacune, autour de la vue) ; le grand saut qui plantait le rendu n'a pas été revu ici.
   - **Fait (9b)** : l'aide, l'encyclopédie, le didacticiel et la campagne.
     - **Le didacticiel** (`js/engine/didacticiel.js`, `js/ui/didacticiel.js`) : après l'arrosage, six étapes
       du grand monde (`ETAPES_MONDE`), avant « fin » : `carte` (ouvrir la carte du monde : l'anneau sur
       l'entrée 🧭 du menu ; l'étape passe quand elle s'ouvre), `sortie` (suivre le chemin jusqu'à la sortie
       de la ferme : ses trois cases allumées sur la carte ; validée par la case du personnage,
       `state.monde.ici`, hors de la ferme, `horsDeLaFerme`), `recolte_monde` (une prise dans le monde :
       l'anneau sur la hache ; validée par `state.monde.pris`), `caleche` (l'attendre à 10 h devant la
       ferme ou la héler : un grand cercle autour d'elle, `{ caleche: true }` dans la surbrillance de la
       scène, le bouton Héler, où elle est et l'heure dans la bulle ; avant le niveau du Marché, la
       toucher arrêtée à côté de soi suffit, `rencontreCaleche` : « Le cocher te salue » ; ensuite, il faut
       lui vendre quelque chose), `hameau_choisir` (le hameau le plus proche de la sortie est montré sur
       la carte du monde, `montrerLieu`, 6 cases autour de lui ; la carte s'ouvre sur lui et le
       personnage ; l'anneau sur son repère, puis sur « Y mener la boussole » ; validée par
       `state.monde.but`), `hameau_aller` (l'anneau sur la boussole ; validée par le hameau découvert).
       Chacune a son compteur (🛤️, 🪓, 🐴, 🏘️ ; sous la boussole quand elle est là) et son bouton
       « Passer cette étape » (`passerEtapeDidacticiel`) : aucune ne bloque, la bulle attend sans
       empêcher de jouer. La forme ne change pas (les étapes sont avant « fin ») : une partie sur
       l'ancienne bulle de fin reprend à `carte`, une partie plus tôt ou finie ne bouge pas (testé).
     - **La campagne** (`data/campaign.json`, `js/engine/campaign.js`) : relue, rien n'y demande la ville,
       le Marché, le train. Sept objectifs nouveaux, comptés dès le début de la partie : `caleche`
       (pièces gagnées à la calèche), `hameaux` (hameaux découverts), `monde` (% du monde vu),
       `grotteMonde` (une grotte de la montagne, l'événement `carte:grotte_monde` de l'encyclopédie),
       `pecheMer` (poissons de mer, `castLine`), `achatsHameaux` (produits du coffre de la calèche),
       `faune` (espèces vues). Avant / après :
       - ch. 1 L'héritage : inchangé ;
       - ch. 2 Le grenier : + vendre pour 50 pièces à la calèche ;
       - ch. 3 Le poulailler : + découvrir un hameau ;
       - ch. 4 Le four : + entrer dans une grotte de la montagne, voir 10 % du monde (une partie neuve
         en voit 7 %) ;
       - ch. 5 Le troupeau : + découvrir 3 hameaux, pêcher un poisson dans la mer ;
       - ch. 6 Toute l'année : + acheter 5 produits des hameaux à la calèche, voir 6 bêtes sauvages ;
       - ch. 7 Famille autonome : + découvrir 5 hameaux, voir 15 % du monde.
       Les intros des chapitres 2 à 7 en parlent. Sauvegardes : format 59 ; la migration 58 → 59 ajoute
       les trois compteurs (`calecheVentes`, `achatsHameaux`, `pecheMer`) à zéro.
     - **Atteignables** : `tests/engine/finition.test.mjs` les joue tous avec les actions du moteur (une
       vente, le tour par les chemins, les plans des hameaux, une prise de la canne en mer, les arrêts de
       la calèche puis un achat au coffre, les bêtes notées) ; le tour du monde par les chemins voit 16 à
       20 % du monde sur six graines. Le joueur automatique (`js/engine/bot.js`) vend à la calèche
       (`vendreCaleche`, son bois au chapitre 2) et fait une sortie par soir quand le chapitre le demande
       (`botMonde` : le chemin de la calèche jusqu'au prochain hameau, l'entrée de grotte la plus proche,
       la canne au coin de mer le plus proche ; `SIMULATION.LANCERS_MER`). Sur 60 nuits (graine 1) :
       chapitre 2 à la nuit 5, chapitre 3 à la nuit 26 (25 juste avant la fiche ; graines 2, 3, 5, 7 :
       26, 24, 26, 25 au lieu de 26, 25, 25, 25 : à une nuit près), 1 246 pièces à la nuit 60 (1 169
       avant) ; le test du chapitre du troupeau le termine toujours.
     - **L'aide** (`js/ui/aide.js`) : une fiche « Le grand monde » (🧭, depuis À propos) : le pays et ses
       biomes, chemins et gués, le brouillard, la carte du monde, la boussole, récolter dans le monde, les
       grottes, la pêche, les bêtes, les hameaux, les habitants, la calèche (sans « le Marché est
       devenu »), l'Atelier (ce qui ne s'achète plus), le cheval, la qualité de l'affichage ; la fiche des
       outils n'en garde qu'une ligne ; la hache n'y « repousse » plus sur la ferme.
     - **L'encyclopédie** : relue en entier. Revues : la calèche, le cheval (il porte partout et rentre à
       l'Écurie ; le poteau ne sert pas encore), la hache et la pioche (la repousse dans le monde), la
       lanterne et le fromage d'alpage (plus « bientôt disponible » : le champignon lumineux de la mine,
       les herbes de montagne du monde), la crème de marrons, la tarte aux myrtilles et le pain d'épices
       (le miel et les herbes à la place du sucre et des épices ; les châtaignes et les myrtilles des
       hameaux), les chapitres, la carte, la terre sauvage, l'Atelier (tout ce qu'il fabrique), les
       graines, le poisson grillé, l'omelette aux champignons, les notifications. Nouvelles : « Le grand
       monde », « Chemins et gués », « Les métiers des hameaux » (184 pages).
     - **Les restes trouvés et corrigés** : « la houe / la canne… s'achète au Marché » (deux messages du
       moteur), « Le Marché est devenu une calèche » (l'aide, l'encyclopédie), une phrase d'ambiance « je
       ne retournerai vivre en ville », la page d'accueil (`index.html` : le champ, la viande, « Vends
       tes surplus au Marché » ; deux cartes nouvelles : le grand monde, la calèche).
     - **Le test anti-restes** (`tests/engine/finition.test.mjs`) : les valeurs des données (hors
       commentaires), l'encyclopédie, les chaînes de `js/` (hors commentaires et identifiants) et le texte
       des pages ne contiennent ni « Marché », « ville », « train », « gare », « navette », « bus »,
       « école », « livreur », « entreprise », « infra-monde », « tronc creux », « boutique »,
       « immeuble », « citadin » ; exceptions écrites : « en train de », « se gare », le nom de l'objet
       retiré `bois_infra`. Et aucune page de l'encyclopédie ne se découvre seulement par un objet retiré
       ni n'en parle (sauf la page des viandes, un historique voulu).
     - **De bout en bout** (Chromium, `npm run build`, `_site` servi) : une partie neuve, de la première
       bulle à la fin du didacticiel (les étapes de la ferme faites par le moteur, celles du monde par
       l'interface : le menu, la marche jusqu'à la sortie, la hache sur un buisson du monde, la calèche à
       10 h touchée, le hameau choisi sur la carte, la marche par les chemins jusqu'à lui), puis trois
       nuits : aucune erreur de console, sur ordinateur (1280 × 800) et sur le profil mobile de la 9a
       (390 × 844, densité 3). `node tests/smoke.mjs` : sans erreur. `npm test` : 867 tests, 52 s.

## Le projet est terminé

Les neuf étapes sont faites. Ce qui reste à vérifier sur un vrai appareil (tout a été mesuré sous
SwiftShader, sans carte graphique) :

- le coût du shader de la mer, du brouillard et du voile de la nuit sur une vraie carte graphique de
  téléphone, la chaleur et la batterie ; la mémoire de la carte graphique (les régions dessinées) ;
- le choix « Auto » de la qualité sur une tablette avec un stylet ou un clavier ;
- le toucher : la place des boutons au pouce, la bulle du didacticiel et les compteurs sous la
  boussole, le bouton Héler, le glisser et le pincer de la carte du monde ;
- l'image tournée (l'arbre qui bascule, l'aigle) et le grand saut d'un coup de la vue, corrigés ou non
  reproduits sous SwiftShader ;
- une partie longue jouée à la main, de la terre sauvage aux chapitres du monde (les objectifs sont
  testés par le moteur et le joueur automatique, pas encore par un joueur).

## Après le projet

- **Fiche 10 — les notifications qui se cumulent** (fait) : un geste répété vite ne fait plus une
  pile de notifications identiques ; une seule reste affichée et sa quantité monte (« +1 🧱 », « +2 »,
  … « +5 »), puis disparaît comme les autres une durée complète après le dernier appui. `notify`
  (`js/ui/toasts.js`) prend l'option `cumul: { cle, quantites, texte }` : une notification de même clé
  encore affichée additionne `quantites` (chaque objet à part, les dépenses en négatif, l'argent
  compris), prend le texte `texte(totaux)` et repart pour une durée complète ; sinon une nouvelle
  naît de l'appui seul ; sans l'option, rien ne change. Le compte, sans le DOM, est dans
  `js/ui/notif-cumul.js` (`additionner`, `cumulSuivant`), testé par `tests/engine/notif-cumul.test.mjs`.
  Pour les lecteurs d'écran, `#toast-root` n'est plus atomique (seule la notification qui arrive ou
  change est lue), une notification cumulée se relit en entier (`aria-atomic`) et reste `aria-busy`
  pendant la rafale (700 ms sans appui) : la quantité est lue une fois, pas « +1, +2, +3 ». Les gestes
  cumulés : « Fabriquer » à l'Atelier (clé : la recette ; une autre recette en commence une autre),
  acheter et vendre à la calèche (par objet : la quantité et les pièces), « Manger » (l'énergie),
  verser du blé au Moulin, cueillir aux arbres du Verger (par fruit), récolter les parcelles, nourrir
  une poule, ranger au frigo et en sortir (par objet). Les alertes, les repas et les lettres ne changent
  pas.
- **Fiche 11 — l'équipement de la famille et le sac à provisions** (fait) : dans la fenêtre Famille,
  un onglet par membre (le personnage principal, puis les adultes, puis les enfants) ouvre sa fiche
  (`js/ui/fiche-membre.js`, d'après le croquis `docs/fiches/11-croquis.jpg`) : à gauche trois cases
  d'équipement, au milieu le membre en pied dans un cadre avec ses pièces (les calques de
  `assets/personnages/equipement.png`, `scripts/personnage/equipement.py`), à droite ses jauges, sous
  lui son prénom et son rôle (« en expédition », « a faim », « dort »). Sept pièces, fabriquées à
  l'Atelier (onglet Équipement) et réglées dans `data/equipement.json` : casque à lampe (lumière des
  grottes, vue la nuit), chapeau de paille (gestes des champs au soleil), bottes de marche (vitesse
  à pied dans le marais et la montagne), gants de travail (couper, piocher), tablier de jardinier
  (labourer, planter, arroser, récolter, cueillir), salopette solide (tous les gestes) et manteau
  chaud (tous les gestes loin de la ferme). Une pièce par place (tête, corps, mains, pieds) ; le
  casque, les gants et la salopette n'ont pas de taille enfant. Les effets valent pour le personnage
  principal ; pour un autre membre, la faim en marchant (bottes) et en aidant (tablier). Le
  personnage principal a une quatrième case, son sac à provisions (6 ou 12 portions), rempli à la
  ferme depuis l'inventaire ou le frigo : loin de la ferme, il ne mange que ce qu'il contient (alertes
  à la sortie et quand l'énergie baisse le sac vide) ; le didacticiel en offre un, garni, à l'étape
  de la carte du monde. Le moteur : `js/engine/equipement.js` ; la sauvegarde passe au format 60
  (`state.equipement`, migration : personne n'est équipé, pas de sac). Sur la carte, les planches
  des personnages ne montrent pas l'équipement (il faudrait un calque par case de geste).
- **Fiche 12 — le cheval retouché, généralisé, et la calèche avec un vrai cocher** (fait) : le joueur a
  retouché deux cases du cheval de profil (au repos, il broute : `docs/fiches/12-cheval-retouche.png`) ;
  `scripts/personnage/cheval.py` les redonne au pixel près (ses motifs `TETE_HAUTE`, `ENCOLURE_BASSE`,
  `TETE_BASSE`, et les règles écrites en tête du fichier : le bout du nez carré, le poitrail rentré, la
  crinière arrêtée au garrot, le dos sans bosse, les sabots de deux pixels, décalés d'une rangée dans
  chaque paire) et applique ces règles aux autres cases (les quatre temps du pas, de face, de dos), au
  cheval sellé (`assets/cheval_monte.png`), à l'icône 🐴 et à l'attelage de la calèche
  (`scripts/carte/caleche.py`, harnaché : la bride, le collier, la sellette). Le cocher de la calèche est
  un personnage du jeu, `perso_08` (casquette et veste bleu marine, moustache), assis sur le banc comme
  le cavalier (ses cases `assis_cote_0`, `assis_bas_0`, `assis_haut_0`), les rênes de ses mains au mors.
  Les images gardent leur taille et leurs cases : le JS ne change pas.
- **Fiche 13 — trois sons : l'arrosage à la cruche, le hibou la nuit, plus de bruit d'eau** (fait) :
  l'arrosage (`arrosage`, trois variantes d'1,4 s) est un vrai arrosoir versé sur la terre
  (Bricklover, Freesound, CC0) ; la nuit, une vraie hulotte (`hibou`, quatre variantes : deux chants
  entiers « hou… hou-hou-houuu », deux « hou » seuls ; BigSoundBank, CC0) remplace la chouette
  synthétisée : une à deux minutes entre deux chants, 20 à 45 s en forêt ou à sa lisière, d'où elle
  chante. Les boucles d'eau (`mer`, `lac`, `riviere`, la mare de la ferme) sont retirées : plus rien ne
  monte en approchant d'une rive ; restent les pas dans l'eau et les grenouilles la nuit (une vraie
  grenouille, « One frog » de Joseph Sardin, BigSoundBank, CC0, en boucle de 11,4 s). Les
  enregistrements sont coupés et égalisés par `scripts/son/libres.py` (voir `docs/son.md`).
- **Fiche 21 — toucher le champ n'ouvre plus de fenêtre** (fait) : un appui sur une parcelle (Zone de
  culture ou Serre) y fait le geste possible, comme avant (semer : le choix de la graine ; arroser ;
  récolter). S'il n'y a rien à faire (déjà arrosée, en train de pousser, une terre sans aucune graine
  à semer), plus de fenêtre : une petite bulle, au-dessus de la case, deux secondes et demie
  (« 🥕 Carotte · arrosée · mûre dans 3 h », « … · un stade dans 2 h », « Terre labourée · aucune
  graine à semer »). Il n'y en a qu'une : un nouvel appui la reprend, elles ne s'empilent pas (le
  texte vient de la page, `stageParcelle` dans `js/ui/stage.js` ; la bulle, `showCaseTip` dans
  `js/carte/ferme/etiquettes.js`). La fenêtre de la zone (toutes les parcelles, « Planter partout »,
  « Arroser tout », « Récolter tout », le semis automatique) s'ouvre d'un appui long sur une parcelle,
  à la ligne de celle-ci, et toujours depuis les notifications d'arrosage et de récolte et la puce
  d'objectif (« Y aller ») : rien ne disparaît. L'aide, l'encyclopédie et la fin du didacticiel le disent.
- **Fiche 15 — le décor : les bords des chemins et les candélabres** (fait) : les bords des chemins,
  sur la ferme (les raccords de `assets/herbe_chemin.png`) comme dans le grand monde (le chemin posé
  sur les autres sols, `assets/sols_monde.png`), ont une forme commune (`scripts/carte/bord_chemin.py`) :
  des coins arrondis, un bord qui ondule d'un bruit périodique sur 16 px (sans couture d'une tuile à
  l'autre) et des brins d'herbe qui débordent sur le chemin. Ce ne sont que des tuiles redessinées,
  aux mêmes places : le dessin des régions ne change pas (mesuré dans Chromium, `paintRegion` sur les
  régions affichées, la même graine, trois essais avant et après : au mieux 29 à 31 ms par région
  sur la ferme et 31 à 32 ms dans le monde avant, 29 à 31 et 31 à 34 ms après, autant aux bruits de
  mesure près). Le candélabre est un nouveau bloc `lumiere`
  (à l'Atelier : 2 lingots de fer, 2 miels, 1 fibre ; onglet Maison de Construire), deux blocs de
  haut et un demi-bloc de large : un pied de fer forgé et trois bougies (son image dans
  `assets/murs_hauts.png`, `BLOCS_CARTE.hauts.candelabre`), qui s'allument la nuit avec les
  lanternes (`stepLanterns`, `BLOCS_CARTE.candelabre` : une lumière chaude). Un décor, dehors comme
  dans la maison ou à l'étage ; son icône 🕯, sa page d'encyclopédie et sa ligne d'aide (« Éclairer
  la nuit », fiche « Le grand monde »).
- **Fiche 14 — petites corrections : le brouillard sur la ferme, la mine, les canards, l'encyclopédie**
  (fait) :
  - le brouillard sur la ferme : le moteur la tenait déjà pour vue d'office (`monde-vu.js` : ses cellules
    relues comme posées, quel que soit le vu), mais la scène (`js/carte/ferme/brouillard.js`) ne
    dépendait que de la chaîne base64 qu'on lui donnait ; elle reçoit désormais aussi le rectangle des
    cellules de la ferme et de sa prairie (`brouillardDe(state)` → `modèle.brouillard.ferme`, `rectFerme`)
    et les tient pour vues quoi que dise la chaîne. Un test (`tests/engine/monde-vu.test.mjs`) lit le
    brouillard comme la scène, sur une nouvelle partie, chaque témoin des anciennes parties migré et un
    vu vide, abîmé ou tronqué : la ferme et sa prairie ne sont jamais dessous. (Dans Chromium, ni une
    nouvelle partie ni les témoins, ni le profil mobile, ni le rendu sans WebGL n'ont montré de brouillard
    sur la ferme avec le code d'avant : la cause d'origine n'a pas été reproduite.)
  - (corrigé par la fiche 14b, plus bas : la ferme n'est plus vue d'office, la protection de la scène est
    retirée.)
  - la mine : la flèche bleue des passages est retirée (`CarteKit.FLECHE`, `assets/fleche_passage.png`,
    `scripts/carte/fleche.py`), dans les niveaux comme devant les bouches des grottes du monde ; le dessin
    montre déjà l'échelle (et le jour qui en tombe) et le trou du puits. Un appui sur l'échelle ou le puits
    y mène (de loin, le personnage y marche d'abord), et le personnage poussé vers lui, tout près, y passe
    (`js/grotte.js`, `passageAt`, `versPassage`, `stepPassages`).
  - les canards : hors de l'eau et du marais (une rive, de l'herbe), un canard se tient sur ses pattes
    (`fauneSurEau` dans `js/carte/ferme/faune-monde.js` : une case d'eau dessinée ou du marais) ; ses
    cases `debout` et `marche` (le colvert, la cane) sont dessinées par `scripts/carte/faune.py` et
    nommées dans `data/monde.json` (`terre_repos`, `terre_marche`). Dans l'eau ou le marais, il nage.
  - l'encyclopédie : les pages des bêtes montrent leur dessin d'aujourd'hui, une case des planches du jeu
    (la poule, le mouton, la vache, le cheval, chaque bête de la faune ; le canard, la cane et le canard
    debout), et la page de la pêche les icônes de tous les poissons que la canne prend.
    `scripts/build-encyclopedie.mjs` les lit dans `assets/` (`visuels`, `icones` de
    `js/encyclopedie.generated.js`), dans le jeu comme sur `encyclopedie.html`.
- **Fiche 14b — le brouillard couvre aussi la ferme** (fait) : la fiche 14 avait compris l'inverse de la
  demande ; le joueur veut que tout soit à découvrir, la ferme comprise.
  - Retiré : la ferme et sa prairie vues d'office dans le moteur (`monde-vu.js` : leurs bits ne sont plus
    posés à la création ni relus comme posés), dans la scène (`js/carte/ferme/brouillard.js` : plus de
    rectangle `ferme`) et la protection de la fiche 14 (`brouillardDe`, `rectFerme`,
    `modèle.brouillard.ferme` ; `js/ui/stage.js` donne `{ vu, C, L, H }`).
  - Une nouvelle partie ne voit que le cercle de vue (12 cases, `RAYON`) autour de la case où le
    personnage apparaît (`vuInitial(T, caseDepart(T))`) ; le reste de la ferme se découvre en marchant.
    Le mode test « tout cacher » recouvre aussi la ferme (sauf autour du personnage).
  - Le moteur n'en dépend pas : ses régions vues (`state.monde.vues`) gardent celles de la ferme
    d'office ; cultures, bêtes, famille et bâtiments vivent sous le brouillard. À l'écran, ce qui se dresse
    sous le brouillard ne se dessine pas, sur la ferme comme ailleurs (les bêtes, la famille, la calèche).
  - Ce qui est construit : ce qui a été vu une fois le reste ; le joueur bâtit et plante sous ses yeux,
    donc rien de ce qu'il a fait n'est voilé. Le repère de la ferme reste sur la carte du monde et la
    boussole y mène toujours (le personnage sait où est sa ferme) ; la ferme dessinée y apparaît une fois vue.
  - Le didacticiel : les pierres et le bois du premier jour sont à 7 cases au plus du départ, dans le
    cercle de vue ; l'Atelier et le puits, le joueur les pose lui-même ; les cases qui brillent plus loin
    (l'abri, la sortie de la ferme où se gare la calèche) se dégagent quand la bulle les montre
    (`montrerLieu`, 4 cases autour, `js/ui/didacticiel.js`). Le texte de la carte du monde ne dit plus
    « ta ferme » vue en entier. La scène n'entoure plus rien sous le brouillard (les cercles dorés autour
    des pierres ou du bois cachés, `js/carte/ferme/didacticiel.js`).
  - Les anciennes parties gardent ce qu'elles ont vu, sans changement de format : leur chaîne porte déjà
    les bits de la ferme et de sa prairie (posés par l'ancien `vuInitial`), et la migration 57 → 58 comme
    la réparation d'un vu perdu (`vuDesRegions`) les posent encore. Les objectifs « voir 10 % / 15 % du
    grand monde » ne comptent plus la ferme d'office pour une nouvelle partie (environ 7 % de moins au
    départ) : elle se découvre vite en y travaillant.
- **Fiche 16 — la famille reste visible et ne traverse pas les murs** (fait). Les causes trouvées
  (reproduites dans Chromium sur une journée de 6 h à 23 h, une maison de deux pièces : la salle,
  et la chambre qu'on ne rejoint que par elle) :
  - la famille s'effaçait à la porte à 18 h 45 et ne reparaissait qu'à 7 h (le matin, de 6 h à 7 h,
    et toute la nuit pour qui n'avait pas de lit, elle n'était nulle part) ; un enfant « disparaissait »
    ainsi chaque soir et chaque matin. Maintenant elle rentre dans la maison et y reste (ses places,
    ses chaises à table de 18 h 45 à 20 h 30, ses lits la nuit) : `js/famille-ferme.js`
    (`FamilleFerme.voulu`, `aTable`), `homeInside` (`js/carte/ferme/chantier.js`) ;
  - le foyer (la porte de la pièce où l'on dort, `foyerPorte`) peut être la porte d'une chambre
    intérieure : on se tenait sous elle, dans le mur de la salle ; la famille y apparaissait et en
    sortait au travers du mur. `homeDoor` donne maintenant le devant d'une porte d'entrée (`frontDoor`) ;
  - un trajet sans chemin se faisait en ligne droite, au travers de tout (la famille), ou d'un saut
    (le personnage, un habitant) jusque dans une pièce sans porte ; le pas de côté d'un membre (pour ne
    pas marcher l'un dans l'autre) ou d'un habitant (pour contourner le personnage) pouvait couper un
    mur. Un but hors d'atteinte est maintenant reconnu (`CarteKit.chemin(…, { info })` :
    `info.epuise`, et `fermier.path(…, info)` : `info.impossible`, par une recherche à rebours) : on
    reste où l'on est ; les pas de côté ne se font que là où la ligne est libre ;
  - la ligne droite des chemins tendus (`lineFree`) regardait un point tous les 4 px et coupait des
    coins de mur (17 traversées dans un hameau en une journée, avant) : elle suit maintenant toutes
    les cases qu'elle touche, au milieu et à 3 px de chaque épaule.
  Les tests : `tests/engine/famille-visible.test.mjs` (8 tests, les scripts de la carte chargés sans
  navigateur : les chemins par les portes, sans coin coupé ; un but enfermé ; la porte du foyer ;
  l'intérieur de la maison ; les heures ; une journée simulée de 6 h à 23 h ; un habitant enfermé).
- **Fiche 16b — la soirée de la famille : dehors jusqu'au coucher, manger quand on a faim** (fait).
  Le repas à table de 18 h 45 à 20 h 30 de la fiche 16 n'était pas ce que voulait le joueur ; le reste
  de la fiche 16 (toujours visible, aucun mur traversé, la porte du foyer dehors) demeure.
  - L'horaire (`FAMILLE.HORAIRE`, `data/general.json`, passé à la carte par le modèle :
    `horaire`) : le jour et le soir, la famille est dehors autour de la maison (les enfants jouent,
    les adultes flânent) ; plus de rentrée générale ni de repas à table. Les enfants vont au lit à
    20 h (`COUCHER_ENFANTS`) et se lèvent à 8 h (`LEVER_ENFANTS`) ; le compagnon va au lit à 22 h
    (`COUCHER_ADULTES`) et se lève avec le personnage (à la fin de la nuit) ; tous les adultes
    suivent l'horaire du compagnon. Chacun rejoint la maison à pied, entre par la porte et se couche
    dans son lit ; le matin, il sort par la porte (`FamilleFerme.voulu`, `couche`). Le second adulte
    s'occupe des bêtes jusqu'à 19 h (`FIN_TRAVAIL_ADULTES`), puis ne travaille plus et flâne près de
    la maison jusqu'à 22 h ; sans la carte à l'écran aussi (`aideSansCarte`, `js/ui/stage.js`).
  - Les jeux des enfants (`js/famille-ferme.js`, `commencerJeu`, `jouer`) : dehors, à deux, ils se
    poursuivent (l'un court après l'autre par les chemins ; attrapé, c'est l'autre qui court) ou font
    la ronde (un cercle libre entre eux, chacun d'un côté) ; seuls, ils sautent sur place ou tournent
    sur eux-mêmes. En jouant, ils vont 1,7 fois plus vite et font de petits bonds (l'image monte de
    quelques px, les pieds restent sur leur case) ; les cases de la ronde et de la fuite sont libres et
    dégagées, les côtés sans mur : rien ne traverse un mur. Avec « animations réduites », ils ne jouent
    pas.
  - La faim : un membre dont la jauge tombe à `FAMILLE.FAIM.SEUIL` mange, à n'importe quelle heure
    (`repasStep`, inchangé) ; sur la carte, il va au réfrigérateur ou à la boîte à nourriture, s'y
    baisse, puis reprend le trajet qu'il faisait (`allerManger` ; avant, seulement à la boîte, et pas
    s'il était occupé : il y va maintenant ensuite). Rien à manger : le moteur ne le fait pas manger,
    une seule alerte « a faim », et il ne va pas à la boîte.
  - Le dernier repas des enfants : à 20 h, avant le lit (`repasStep` appelle `repasCoucher` quand
    l'horloge passe `COUCHER_ENFANTS`), ils mangent jusqu'à `FAIM.MAX`, une fois par jour ; sur la
    carte, ils vont à la boîte ou au frigo, s'y servent, puis vont au lit. Le repas de 22 h pendant
    leur sommeil (`startNight`) est supprimé ; rien à manger : ils se couchent quand même. La nuit
    (`feedFamily`) ne le fait que pour une journée finie avant 20 h (le joueur automatique, les
    essais : `sleep`), jamais deux fois.
  - Le calcul de la nuit : le repas à table n'existait que sur la carte, le moteur ne l'a jamais
    compté. La nuit recopie ce que la famille a mangé dans la journée (`state.repasJour`), sans rien
    y ajouter pour qui est rassasié. Pas de double repas, et pas de famille affamée faute de table.
  - Les tests : `tests/engine/famille-visible.test.mjs` (les heures de chacun ; une journée de 6 h à
    23 h et le matin d'après : les enfants jouent, à deux et seuls, sans traverser de mur ; l'adulte
    travaille au Poulailler l'après-midi et plus après 19 h ; dehors à 19 h, l'adulte affamé va à la
    boîte, s'y sert et repart ; à 20 h les enfants vont à la boîte puis au lit ; le compagnon au lit à
    22 h ; lui dehors à 6 h, eux à 8 h) et `tests/engine/repas.test.mjs` (manger à toute heure, pas
    de boucle sans rien à manger, le dernier repas des enfants à 20 h une seule fois, rien pendant
    leur sommeil, pas de double compte la nuit).
- **Fiche 17 — la cruche (jauge, aller au puits) et choisir son lit** (fait). La cruche a sa case
  dans la barre d'outils (`crucheSlotHtml`, `js/ui/cruche.js`) : son icône, une jauge d'eau bleue (de
  bas en haut) et les litres qui restent ; elle baisse à chaque arrosage et remonte au puits. La
  cruche n'est pas un outil qu'on prend en main : sa jauge reste donc toujours en vue, à côté des
  outils. Un appui sur le puits, ou sur cette case, envoie le personnage au puits
  (`js/carte/ferme/puits.js`, `fermier.puiser`) : un vrai chemin (par les portes, autour des murs,
  jamais sauté), à côté du puits, tourné vers lui ; il plonge la cruche et la remonte, et alors
  seulement le jeu la remplit (`remplirCruche(state, casePuits)` ne remplit que sur la case d'un
  puits posé). Un puits enfermé, une maison sans porte : « aucun chemin n'y mène » ; plus de 90 cases
  de chemin (ou hors de portée, loin dans le grand monde) : « trop loin ». Un appui sur un lit ou une
  paillasse (toit levé, ou à l'étage) demande « Tu veux choisir ce lit ? » (`lit-choisir`) ; Oui
  (`choisirLit`, `js/engine/blocs.js`) en fait le premier couchage, celui du personnage : il y va
  dormir ; le membre qui y dormait prend l'ancien lit du personnage, les autres gardent le leur. Le
  choix est gardé (`state.litPrincipal`, sauvegarde v61) ; un lit repris ne compte plus. Les tests :
  `tests/engine/cruche-lit.test.mjs` (la jauge, le remplissage au puits seulement, le choix du lit,
  sa sauvegarde, et sur la carte sans navigateur : la marche jusqu'au puits par la porte, les puits
  enfermés ou trop loin, le lit sous le doigt).
- **Fiche 18 — choisir ses enfants au démarrage et la visite de bienvenue** (fait) :
  - à l'accueil d'une nouvelle partie (`js/ui/depart.js`), chaque enfant se choisit comme les
    adultes : son personnage parmi les personnages d'enfants (la grille, `PERSOS_ENFANT`), puis son
    prénom sous son portrait ; la dernière question montre la famille choisie (portraits, prénoms,
    animaux). `composeFamily` reçoit le personnage de chaque enfant (il n'est plus tiré au hasard).
    Une partie déjà commencée ne change pas ;
  - le jour 2, de 11 h à 17 h, un adulte du hameau le plus proche de la ferme (ses habitants naissent
    alors s'ils n'étaient pas nés : on le retrouvera chez lui) vient à pied jusqu'à la porte du foyer
    (`js/engine/bienvenue.js`, `js/carte/ferme/visite.js`, `js/ui/bienvenue.js` ; les réglages :
    `BIENVENUE` dans `data/monde.json`). Il paraît juste hors de la vue, du côté de son hameau, et
    suit les cases libres (`fermier.path` ; un départ d'où l'on n'atteint pas la porte est écarté), frappe
    (« Toc, toc ! ») et attend 45 s ; le personnage s'approche : sa phrase d'accueil, un plat de la
    cuisine de son hameau (gratin de patates, tarte, raclette…, +1 à l'inventaire, une notification),
    puis il repart d'où il est venu et s'efface au loin. Une seule fois par partie (`state.bienvenue`,
    format 62). Le personnage absent (loin, dans la mine, la page fermée, la nuit tombée) : le plat
    est posé devant la porte (son icône s'y voit) et donné quand le personnage y revient — choix
    motivé : rien ne se perd au sol ni ne se ramasse par erreur, et la visite ne bloque jamais rien
    (la nuit pose le plat d'une visite qui n'a pas eu lieu). Sauvegarde : `STATE_VERSION` 62 (la
    place 60 → 61 est laissée à une autre fiche ; ici, elle ne change rien) ; une partie plus loin
    que le jour 2 ne reçoit pas de visite. Les tests : `tests/engine/bienvenue.test.mjs`.
- **Fiche 19 — le compagnon aide à la ferme** (fait). L'autre adulte du foyer (`aidant`) prend, en plus
  des bêtes, trois initiatives (`js/engine/compagnon.js`, réglées dans `DATA.COMPAGNON`,
  `data/general.json`) : **arroser** quelques légumes de la Zone de culture qui ont soif (3 par sortie,
  6 par jour, 3 h entre deux sorties ; l'eau du réservoir, sinon sa cruche à lui, qu'il remplit au
  puits posé : la tâche « puits ») ; **faire à manger** quand la jauge moyenne de la famille passe sous
  70 (la première recette de la liste débloquée dont il a les ingrédients, à la cuisinière bâtie ; le
  plat va au réfrigérateur, sinon dans la boîte à nourriture, sinon dans l'inventaire ; une fois par
  jour) ; **ramasser** un morceau de bois (puis une petite pierre) posé ce matin à moins de 24 cases de
  l'entrée de la ferme (3 par jour, 2 h d'écart). De 8 h à 18 h (jamais après la fin du travail des
  adultes, `FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES`, 19 h : `finAide`), pas la nuit, pas sous 30 de faim, pas
  pendant le didacticiel de la ferme ; chaque action lui coûte de la faim (2 à 4 points, moins avec
  son tablier), rien au personnage (ni énergie, ni expérience, ni objectif de chapitre). Sur la carte
  (`js/famille-ferme.js` ; où se tenir : `js/carte/ferme/compagnon.js`, `lieuCompagnon`), il y va par
  le chemin du personnage, fait son geste (la cruche penchée, penché sur le puits, à la cuisinière,
  baissé), puis le jeu fait le travail et la bulle « +1 💧 », « +1 🍳 », « +1 🪵 » monte ; une tâche
  sans chemin est laissée 20 s. Sans la carte et pendant une absence (`simulateOffline`), le moteur le
  fait d'un coup (`journeeCompagnon`). Une notification dit ce qu'il a fait (cumulée pour l'arrosage et
  le ramassage). Dans la Famille, une carte « L'aide de … » : l'option (`state.compagnon.aide`) et ce
  qu'il a fait aujourd'hui. Le format de sauvegarde ne change pas : `state.compagnon` manque dans une
  partie d'avant, `reparerPartie` le remet. Le joueur automatique n'en dépend pas (il passe par `tick`).
  Les tests : `tests/engine/compagnon.test.mjs`.
- **Fiche 20 — la marche des personnages** (fait). Les cases de marche des 100 planches
  (`assets/personnages/`, `scripts/personnage/chibi.py` : `jambes_marche`, `bras_marche`) sont
  redessinées, avec les mêmes noms, la même taille et la même place (`cases.json` ne change pas ;
  les autres cases restent au pixel près) : un vrai cycle de quatre images (contact, passage, contact
  de l'autre pied, passage). De profil, les jambes sont refaites d'après les couleurs du modèle, en
  biais de la hanche au pied, et se croisent (avant, elles s'écartaient puis revenaient sans jamais
  passer l'une devant l'autre, et au contact les deux pieds se confondaient) ; au passage (marche et panier),
  les deux jambes droites côte à côte, comme debout : la jambe d'appui sous le corps, l'autre juste
  devant, son pied décollé d'un pixel, sans genou plié. De face et de dos, le talon de derrière se décolle au contact et
  la jambe qui passe se lève de 2 px (1 pour un enfant). Le corps monte d'un pixel au passage. Les bras
  sont refaits comme ceux des gestes (la manche du modèle, la main de sa peau : `MAINS`, `bras_marche`)
  et se balancent à l'opposé des jambes : de profil, le bras proche nettement devant au contact d'un
  pied, le long du corps au passage, derrière le dos au contact de l'autre (passé sur le corps, un
  contour l'en détache ; la main du bras lointain, plus sombre, dépasse alors du ventre) ; de face et
  de dos, les deux bras en opposition, le bras qui vient vers nous descend et s'écarte du corps, celui
  qui s'éloigne remonte derrière la hanche (3 px d'écart entre les deux mains), et au passage ils
  reviennent le long du corps. Un enfant a de plus petits pas et balance un peu moins les bras. Le panier d'œufs garde ses
  mains et prend les nouvelles jambes. Sur la carte (`CarteKit.imageMarche`, `CarteKit.PAS`) : une
  image tous les 3 px parcourus (2 pour un enfant) au lieu de 4 ; de profil, le pied posé recule
  d'autant dans la case que le corps avance sur la carte : il ne glisse plus, à toutes les vitesses
  (à pied, avec les bottes, pressé : les images défilent plus vite). Le départ commence par un passage,
  la pose la plus proche de la pose debout (avant : par les jambes écartées, ou au milieu du cycle). Le
  regard est lissé le long du chemin (`CarteKit.allure`) et retenu près de la diagonale
  (`CarteKit.regard(dx, dy, avant)`) : sur une diagonale ou un chemin en escalier, le personnage ne bat
  plus du profil à la face à chaque case. Le personnage (`js/fermier.js`), la famille
  (`js/famille-ferme.js` : ses trajets, les jeux des enfants, le compagnon), les habitants
  (`js/carte/ferme/habitants.js`), le visiteur de bienvenue (`js/carte/ferme/visite.js`) et la mine (`js/grotte.js`)
  s'en servent. Le cocher reste assis sur son banc (ses cases `assis_*` ne changent pas). Les tests :
  `tests/engine/marche.test.mjs` (l'image du pas, et sur les 100 planches : le pied posé recule de 3 px,
  ou 2, par image, au passage un pied au sol et l'autre côte à côte, décollé d'un pixel, le rebond, les bras en opposition de face et de dos
  et une main devant au contact de profil ; le regard retenu et lissé).
  Puis, la marche paraissant frénétique (près de 20 images par seconde pour le personnage, 16 pour
  un enfant) : une image tous les `CarteKit.FOULEE[qui]` px (`qui` : 'fermier', 'grotte', 'adulte',
  'enfant'), soit `CarteKit.CADENCE` = 8 images par seconde, deux pas, à la vitesse de marche de
  chacun ; les pieds glissent un peu sur le sol, comme dans la plupart des jeux en pixel art.
