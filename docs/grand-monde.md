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
5. **Les décors des biomes**, en vue de haut à 45° (3 PR) : sable, mer, roche, éboulis, neige,
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
6. **Les ressources et la vie de chaque biome** (2 PR) : ce qui se ramasse, les minerais et
   les grottes de la montagne, la pêche, les animaux à regarder.
7. **Les habitants et la calèche** (3 PR) : les hameaux bâtis en blocs, leurs familles et
   leurs métiers (bûcheron, pêcheur, mineur, berger, cueilleur) ; la calèche du Marché et sa
   tournée.
8. **S'orienter** (1 à 2 PR) : le brouillard, la carte du monde, une boussole.
9. **La finition** (1 à 2 PR) : les anciennes parties, les performances sur mobile, l'aide,
   l'encyclopédie, le didacticiel.
