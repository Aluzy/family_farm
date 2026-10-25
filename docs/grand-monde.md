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
  aliments) se fabriquera à l'Atelier (décidé).

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
     réglée par `data/grotte.json` (`GROTTE`) ; ses tuiles par `scripts/carte/grotte.py`, la
     flèche des passages par `scripts/carte/fleche.py`. `js/ui/excursion.js` ne mène plus
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
7. **Les habitants et la calèche** (3 PR) : les hameaux bâtis en blocs, leurs familles et
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
8. **S'orienter** (1 à 2 PR) : le brouillard, la carte du monde, une boussole.
9. **La finition** (1 à 2 PR) : les anciennes parties, les performances sur mobile, l'aide,
   l'encyclopédie, le didacticiel.
