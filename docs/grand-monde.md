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
  voit passer ; on peut la héler quand elle est près de soi. (À décider : vend-elle aussi ce
  que vend le Marché aujourd'hui — graines, outils, animaux, meubles ?)

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
2. **Le rendu par régions**, sur la ferme d'aujourd'hui (2 PR) : le sol, les arbres, les
   rochers, les fleurs et l'herbe haute chargés par régions de 64 × 64 tuiles autour de la
   caméra, au lieu d'une seule image de la taille de la carte.
3. **Le moteur en coordonnées du monde** (2 à 3 PR) : les cases numérotées sur la largeur du
   monde (migration de tout ce qui est rangé par case), le terrain lu case par case, la nuit
   limitée aux régions visitées, des trajets bornés.
4. **Le générateur du monde** (2 PR) : relief, humidité, biomes, rivières, côte, chemins ; la
   ferme au centre ; les hameaux, les entrées de grotte, les coins de pêche ; dans un Web
   Worker, région par région, avec un cache.
5. **Les décors des biomes**, en vue de haut à 45° (3 PR) : sable, mer, roche, éboulis, neige,
   sapins, sous-bois, roseaux, eau basse, bruyère, et leurs raccords.
6. **Les ressources et la vie de chaque biome** (2 PR) : ce qui se ramasse, les minerais et
   les grottes de la montagne, la pêche, les animaux à regarder.
7. **Les habitants et la calèche** (3 PR) : les hameaux bâtis en blocs, leurs familles et
   leurs métiers (bûcheron, pêcheur, mineur, berger, cueilleur) ; la calèche du Marché et sa
   tournée.
8. **S'orienter** (1 à 2 PR) : le brouillard, la carte du monde, une boussole.
9. **La finition** (1 à 2 PR) : les anciennes parties, les performances sur mobile, l'aide,
   l'encyclopédie, le didacticiel.
