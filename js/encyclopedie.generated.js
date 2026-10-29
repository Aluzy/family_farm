// FICHIER GÉNÉRÉ par scripts/build-encyclopedie.mjs à partir de encyclopedie_ferme_familiale.json.
// Ne pas le modifier : changer le fichier JSON, puis lancer
//   node scripts/build-encyclopedie.mjs
export const ENCYCLOPEDIE = {
 "categories": [
  {
   "id": "batiments",
   "icone": "🏗️",
   "nom": "Bâtiments & infrastructures",
   "entrees": [
    {
     "id": "maison",
     "terme": "Maison",
     "description": "La maison de la famille, c'est le foyer qu'on bâtit soi-même : une pièce close (des murs tout autour et une porte) où l'on pose une paillasse ou un lit. On peut l'agrandir de plusieurs pièces, y poser le four, la cuisinière et les meubles fabriqués à l'Atelier, et lui ajouter un étage. Le soir, la famille y rentre dormir, et chaque matin le personnage en ressort. Sa fenêtre regroupe la Famille, le Livre de recette, l'Arbre des technologies et les Installations.",
     "liens": [
      "foyer",
      "piece_close",
      "famille",
      "livre_de_recette",
      "arbre_technologique",
      "installations",
      "meubles"
     ],
     "decouverte": [
      "piece_close"
     ]
    },
    {
     "id": "installations",
     "terme": "Installations",
     "description": "Onglet de la Maison qui regroupe ce qui se gère sans aller sur place : les ateliers (Four, Cuisine, Presse), la production et le stockage d'énergie, la pompe, le réservoir, le réfrigérateur et le silo.",
     "liens": [
      "maison",
      "four",
      "cuisine",
      "presse",
      "panneau_solaire",
      "batterie",
      "pompe",
      "reservoir",
      "refrigerateur",
      "silo"
     ],
     "decouverte": [
      "objet:four_pierre",
      "objet:cuisiniere",
      "objet:meule"
     ]
    },
    {
     "id": "panneau_solaire",
     "terme": "Panneau solaire",
     "description": "Produit de l'électricité à partir du soleil, de 7 h à 19 h seulement, stockée dans la batterie ; sans batterie (ou batterie pleine), il alimente directement la pompe et les ateliers. Il se fabrique à l'Atelier (2 lingots de fer, 1 de cuivre, 2 planches) et se pose dehors, en mode Construire, une fois le foyer bâti. La ferme n'en a qu'un : il s'améliore en niveau, s'use durant son fonctionnement et peut être coupé par un interrupteur pour éviter cette usure.",
     "liens": [
      "atelier",
      "mode_construire",
      "batterie",
      "lingot",
      "foyer"
     ],
     "decouverte": [
      "objet:panneau_solaire"
     ]
    },
    {
     "id": "batterie",
     "terme": "Batterie",
     "description": "Stocke l'électricité produite par le panneau solaire, pour le soir et la nuit. Facultative ; elle se fabrique à l'Atelier (2 lingots de cuivre, 1 de fer) et se pose en mode Construire. Alimente la pompe (dont l'eau sert aussi aux asperseurs), le moulin, la presse, le réfrigérateur et la station de charge du robot. La ferme n'en a qu'une : elle s'améliore en niveau.",
     "liens": [
      "panneau_solaire",
      "atelier",
      "mode_construire",
      "lingot"
     ],
     "decouverte": [
      "objet:batterie"
     ]
    },
    {
     "id": "puit",
     "terme": "Puits",
     "description": "Source d'eau illimitée, à laquelle la pompe puise pour remplir le réservoir. Il se fabrique à l'Atelier (8 pierres, 2 planches) et se pose dehors ; la pompe se pose dessus.",
     "liens": [
      "pompe",
      "atelier",
      "mode_construire"
     ],
     "decouverte": [
      "objet:puits_pierre",
      "didacticiel:puits"
     ]
    },
    {
     "id": "cruche",
     "terme": "Cruche à eau",
     "description": "Avant la pompe et la citerne, on arrose avec elle. Elle se fabrique à l'Atelier (3 bois) ; elle se remplit au puits posé sur la ferme (10 litres) : un appui sur le puits, ou sur la cruche de la barre d'outils, et le personnage y marche, puise, et la cruche est pleine. Une plante qu'on touche pour l'arroser y puise son eau quand la citerne n'en a pas assez ; la jauge bleue de la cruche, dans la barre d'outils, dit ce qui reste.",
     "liens": [
      "puit",
      "reservoir"
     ],
     "decouverte": [
      "objet:cruche",
      "didacticiel:puits"
     ]
    },
    {
     "id": "pompe",
     "terme": "Pompe",
     "description": "Extrait l'eau du puits et la fait circuler vers le réservoir. Consomme de l'électricité fournie par le panneau solaire ou la batterie. Elle se fabrique à l'Atelier (2 lingots de fer, 1 planche) et se pose sur le puits, une fois le panneau posé.",
     "liens": [
      "puit",
      "reservoir",
      "panneau_solaire",
      "atelier"
     ],
     "decouverte": [
      "objet:pompe"
     ]
    },
    {
     "id": "reservoir",
     "terme": "Réservoir",
     "description": "Stock d'eau rempli par la pompe : la citerne, qui se fabrique à l'Atelier (6 planches, 1 lingot de fer) et se pose dehors une fois le panneau et la pompe posés. Elle a ses propres niveaux ; les arrosages, à la main ou par les asperseurs, y puisent.",
     "liens": [
      "pompe",
      "atelier",
      "eau"
     ],
     "decouverte": [
      "objet:citerne"
     ]
    },
    {
     "id": "potager",
     "terme": "Zone de culture",
     "description": "Toute l'herbe de la carte où poussent les cultures de plein air : les légumes (carotte, patate, tomate, courgette, aubergine, oignon, poivron, ail, épinard, fraise), le blé (une fois le Silo construit), le tournesol, le riz et le houblon. Chaque culture arrive à son niveau et suit les mêmes règles : une plante arrosée gagne un stade 24 heures plus tard, puis redemande de l'eau. La houe y change une tuile d'herbe en terre, n'importe où sur la carte, sauf sur les chemins, l'eau, les pierres, les arbres et les arbustes, et aux abords des bâtiments. Le nombre de tuiles de terre est plafonné par le niveau. Un appui sur une terre y sème, l'arrose ou la récolte ; s'il n'y a rien à faire, une petite bulle dit où elle en est (arrosée, mûre dans quelques heures). Un appui long sur une terre ouvre la fenêtre de la zone : toutes les parcelles, « Planter partout », « Arroser tout », « Récolter tout » et le semis automatique. L'arrosage (asperseurs), la récolte et le semis (robot) s'automatisent dans l'Arbre des technologies.",
     "liens": [
      "reservoir",
      "carotte",
      "patate",
      "tomate",
      "courgette",
      "aubergine",
      "oignon",
      "ail",
      "poivron",
      "epinard",
      "fraise",
      "ble",
      "tournesol",
      "riz",
      "houblon",
      "houe",
      "tuiles_de_terre",
      "asperseurs",
      "robot"
     ],
     "decouverte": [
      "outil:houe",
      "didacticiel:houe"
     ]
    },
    {
     "id": "tuiles_de_terre",
     "terme": "Tuiles de terre",
     "description": "Nombre de tuiles labourées sur toute la carte, plafonné par le niveau, qui le relève à chaque fois : 12 au niveau 1, puis 24, 40, 60, 84, 112, 144, 180, 220 et 264 au niveau 10. Au plafond, la houe ne laboure plus, mais on peut reboucher une terre vide pour labourer ailleurs.",
     "liens": [
      "houe",
      "niveaux",
      "potager"
     ],
     "decouverte": [
      "didacticiel:labour",
      "outil:houe"
     ]
    },
    {
     "id": "serre",
     "terme": "Serre",
     "description": "Un bâtiment qu'on bâtit : une pièce close où l'on pose le bac à semis (fabriqué à l'Atelier). Ses cases se labourent à la houe : chaque case labourée devient une parcelle de culture protégée, jusqu'à 16 au niveau 1 (agrandir la Serre en permet plus) ; ses murs, quels qu'ils soient, deviennent du verre. C'est le seul endroit où peuvent être cultivés le cacao, la vanille et le café, les cultures de rente ; quelques légumes y poussent aussi.",
     "liens": [
      "piece_close",
      "bloc_cle",
      "cacao",
      "vanille",
      "cafe"
     ],
     "decouverte": [
      "objet:bac_semis",
      "construit:serre"
     ]
    },
    {
     "id": "verger",
     "terme": "Verger",
     "description": "Les arbres fruitiers de la ferme : pommier, poirier, cerisier, abricotier et pêcher. Un jeune arbre s'achète à la calèche et se plante depuis sa fiche de l'Inventaire (« Planter », puis une case en surbrillance sur la carte), dehors, à au moins 3 cases d'un autre arbre planté. L'arbre passe par 4 dessins : jeune arbre, arbuste, arbre (5 nuits chacun), puis arbre en fruits, 15 nuits après sa plantation. Les fruits attendent sur l'arbre : un appui le cueille (6 fruits, 4 énergie, 20 XP), et l'arbre redonne ses fruits 3 nuits plus tard, toute l'année. La Récolte du verger, dans l'Arbre des technologies, les cueille la nuit. Il ne s'arrose pas.",
     "liens": [
      "pommier",
      "poirier",
      "comptoir",
      "mode_construire"
     ],
     "decouverte": [
      "objet:jeune_pommier",
      "objet:jeune_poirier",
      "objet:jeune_cerisier",
      "objet:jeune_abricotier",
      "objet:jeune_pecher",
      "construit:verger"
     ]
    },
    {
     "id": "poulailler",
     "terme": "Poulailler",
     "description": "Un bâtiment qu'on bâtit : une pièce close avec le nichoir (fabriqué à l'Atelier), une porte sur le dehors et un enclos de barrières relié à la pièce par une autre porte. Il loge une poule par case libre, dans la pièce comme dans l'enclos, et au plus selon son niveau (4, 8, 12, 16 puis 24 poules). Les poules doivent y être nourries avec du blé pour pondre : 1 blé nourrit 2 poules pour la nuit ; le jour, elles sortent dans l'enclos.",
     "liens": [
      "piece_close",
      "bloc_cle",
      "barriere_enclos",
      "poule"
     ],
     "decouverte": [
      "objet:nichoir",
      "construit:poulailler",
      "animal:poule"
     ]
    },
    {
     "id": "etable",
     "terme": "Étable",
     "description": "Un bâtiment qu'on bâtit, comme le Poulailler : une pièce close avec la mangeoire (fabriquée à l'Atelier), une porte sur le dehors et un enclos de barrières relié par une autre porte. Un mouton occupe 1 place, une vache 3 ; il faut une case libre par place, dans la pièce et dans l'enclos. Chaque nuit, les moutons et les vaches y mangent de la paille. Les animaux ne s'achètent pas : une pierre à sel et du foin, fabriqués à l'Atelier, en font venir un.",
     "liens": [
      "piece_close",
      "bloc_cle",
      "barriere_enclos",
      "mouton",
      "vache",
      "paille"
     ],
     "decouverte": [
      "objet:mangeoire",
      "construit:paturage",
      "animal:mouton",
      "animal:vache"
     ]
    },
    {
     "id": "silo",
     "terme": "Silo",
     "description": "Stock de blé récolté, en bois : des blocs de silo (fabriqués à l'Atelier) posés dehors, en colonnes côte à côte. Deux colonnes de trois blocs, et les blocs deviennent un silo. Chaque bloc garde 10 blés : on l'agrandit en y posant d'autres blocs, en largeur ou en hauteur (un appui long sur le silo). Il nourrit les poules du poulailler et alimente le moulin, qui prend d'abord le blé de l'inventaire.",
     "liens": [
      "ble",
      "moulin",
      "poulailler"
     ],
     "decouverte": [
      "objet:bloc_silo",
      "construit:silo"
     ]
    },
    {
     "id": "moulin",
     "terme": "Moulin",
     "description": "Bâtiment de la carte qui transforme le blé : 1 blé donne 1 farine, en 5 secondes. La mouture se lance dans sa fenêtre, en choisissant le nombre de blés, et non depuis le livre de recette. Sur une ferme générée, il se bâtit en tour : une pièce close dont les murs ont 3 blocs de haut (le même mur posé sur un mur le rehausse), la meule au centre ; sa voilure tourne dehors quand il moud. La farine sert au pain, aux tartes, à la quiche, à la quenelle de poisson et au pain d'épices. Fonctionne à l'électricité fournie par la batterie.",
     "liens": [
      "ble",
      "farine",
      "batterie",
      "pain",
      "quenelle_de_poisson",
      "pain_d_epices"
     ],
     "decouverte": [
      "objet:meule",
      "objet:farine"
     ]
    },
    {
     "id": "presse",
     "terme": "Presse",
     "description": "Transforme les graines de tournesol en huile. Fonctionne à l'électricité fournie par la batterie.",
     "liens": [
      "tournesol",
      "huile",
      "batterie"
     ],
     "decouverte": [
      "objet:huile"
     ]
    },
    {
     "id": "four",
     "terme": "Four",
     "description": "Station qui débloque le livre de recette dès qu'elle est là : le four de pierre se fabrique à l'Atelier (8 pierres, 2 planches) et se pose dans la maison. Sert à cuire le pain et d'autres plats comme le gratin de patates, les tartes ou le pain d'épices. Il fond aussi le minerai de la grotte en lingots : 4 minerais et quelques bûches de bois donnent 1 lingot.",
     "liens": [
      "livre_de_recette",
      "atelier",
      "maison",
      "lingot"
     ],
     "decouverte": [
      "objet:four_pierre"
     ]
    },
    {
     "id": "cuisine",
     "terme": "Cuisine",
     "description": "Station où l'on prépare des plats comme l'omelette, la ratatouille, la soupe de légumes ou la compote : la cuisinière se fabrique à l'Atelier (6 pierres, 4 planches) et se pose dans la maison.",
     "liens": [
      "atelier",
      "maison",
      "livre_de_recette"
     ],
     "decouverte": [
      "objet:cuisiniere"
     ]
    },
    {
     "id": "refrigerateur",
     "terme": "Réfrigérateur",
     "description": "Acheté, il arrive dans l'Inventaire : il se pose dans la maison avec 🔨 Construire. Posé, la famille y mange et va s'y servir (la boîte à nourriture revient dans l'Inventaire) ; il empêche les aliments et plats qui y sont rangés de périmer. Il contient 25 unités au niveau 1, puis 40, 60, 90 et 120 en l'agrandissant (300, 700, 1 500 et 3 000 pièces) ; plein, on ne peut plus rien y ranger. Il consomme 100 mWh/s par unité stockée (rien s'il est vide), jour et nuit, prélevés sur la batterie ; si celle-ci se vide, le froid manque et le contenu peut recommencer à périmer.",
     "liens": [
      "batterie",
      "peremption"
     ],
     "decouverte": [
      "construit:frigo"
     ]
    },
    {
     "id": "livre_de_recette",
     "terme": "Livre de recette",
     "description": "Onglet de la Maison (et non un objet possédé) débloqué par la construction du four, qui permet de lancer la préparation des plats à partir des ingrédients disponibles dans l'inventaire. Les recettes non encore débloquées restent visibles, grisées, avec le nom de la technologie qui les ouvre. La farine, elle, se fait directement au moulin.",
     "liens": [
      "maison",
      "four",
      "cuisine",
      "moulin",
      "inventaire",
      "arbre_technologique"
     ],
     "decouverte": [
      "objet:four_pierre",
      "objet:cuisiniere"
     ]
    },
    {
     "id": "arbre_technologique",
     "terme": "Arbre des technologies",
     "description": "Onglet de la Maison : 37 technologies réparties en 7 branches (Énergie, Eau, Culture, Élevage, Cuisine, Famille, Outils) et 5 paliers. Chaque technologie se paie en points de technologie (PT), en pièces et en ressources : du bois et de la pierre (hache, pioche), puis des lingots fondus au Four avec le minerai de la grotte. Elle débloque une automatisation, des recettes ou un effet (moins d'eau, d'usure ou d'électricité, temps de préparation réduit, outils plus efficaces…). Un palier s'ouvre avec le chapitre en cours.",
     "liens": [
      "maison",
      "points_technologie",
      "automatisation",
      "semis_automatique",
      "chapitres",
      "bois_et_pierre",
      "lingot",
      "outils"
     ],
     "decouverte": [
      "technologies"
     ]
    }
   ]
  },
  {
   "id": "construction",
   "icone": "🔨",
   "nom": "Ramassage & construction",
   "entrees": [
    {
     "id": "terre_sauvage",
     "terme": "Terre sauvage",
     "description": "La ferme de chaque partie : une terre de 144 × 114 cases tirée d'une graine (la même graine donne toujours la même ferme), sans aucun bâtiment. Des bois, des étangs, des rochers, des buissons et de l'herbe haute . Tout s'y ramasse, se fabrique et se bâtit bloc par bloc. Elle est posée au milieu du grand monde, dans une prairie ; son chemin de terre sort à l'est, vers les chemins du pays.",
     "liens": [
      "ramassage",
      "atelier",
      "mode_construire",
      "carte",
      "grand_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "ramassage",
     "terme": "Ramassage",
     "description": "Chaque matin, des petites pierres et des morceaux de bois apparaissent sur l'herbe de la ferme, et des baies sur les buissons : un appui les ramasse (pierre, bois, baies), pour un peu d'énergie. Les baies se cueillent sans énergie : de quoi manger quand il n'y a plus rien.",
     "liens": [
      "bois_et_pierre",
      "buissons",
      "atelier"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "fibre",
     "terme": "Fibre",
     "description": "Matériau tiré de l'herbe haute fauchée (la faux). Elle sert à l'Atelier (paillasses, outils de pierre, nichoir, mangeoire, convoyeur…) et, dans la botteleuse, devient de la paille.",
     "liens": [
      "faux",
      "botteleuse",
      "atelier"
     ],
     "decouverte": [
      "objet:fibre"
     ]
    },
    {
     "id": "botteleuse",
     "terme": "Botteleuse",
     "description": "Machine de l'Atelier qui fait des bottes de paille. Trois sortes de blocs, posés côte à côte sur une rangée, de gauche à droite : l'entonnoir, la botteleuse, puis 2 segments de convoyeur ; la case au bout du convoyeur reste libre. Un appui sur l'entonnoir : ton personnage y jette ses fibres, au-dessus de sa tête. Quand la machine en a reçu 10, elle vibre 3 secondes, puis une botte de paille (10 paille) sort sur le convoyeur et tombe au bout : marche dessus pour la ramasser.",
     "liens": [
      "fibre",
      "paille",
      "atelier",
      "faux"
     ],
     "decouverte": [
      "objet:entonnoir",
      "objet:botteleuse",
      "objet:convoyeur"
     ]
    },
    {
     "id": "distributeur",
     "terme": "Distributeur de grain",
     "description": "Machine de l'Atelier qui nourrit les poules toute seule. Trois blocs, posés côte à côte sur une rangée dans l'enclos du Poulailler, de gauche à droite : un entonnoir (celui de la botteleuse), le distributeur, puis la mangeoire à grain, deux cases de large. Un appui sur l'une de ses pièces : ton personnage jette son blé dans l'entonnoir ; le distributeur en garde jusqu'à 40. Chaque jour à 7 h, il nourrit les poules qui ne le sont pas encore, avec les mêmes rations qu'à la main.",
     "liens": [
      "poulailler",
      "botteleuse",
      "atelier",
      "ble"
     ],
     "decouverte": [
      "objet:distributeur",
      "objet:mangeoire_grain"
     ]
    },
    {
     "id": "cheval",
     "terme": "Cheval et Écurie",
     "description": "Le cheval vient à la ferme une fois l'Écurie construite, attiré par un licol et des friandises fabriqués à l'Atelier (deux cordes, des carottes et des pommes) : une enceinte de murs avec une porte sur le dehors, son râtelier (Atelier) et 2 cases libres. Sa case de la barre d'outils te met en selle : tu vas 1,8 fois plus vite, sur la ferme comme dans tout le grand monde (pas dans la mine ni dans les grottes). Quand tu en descends, il rentre à l'Écurie. Chaque nuit il mange 2 paille ; sans elle, il ne va que 1,3 fois plus vite le lendemain. Le poteau d'attache et la corde de fibre (Atelier) ne servent pas encore : le cheval rentre toujours à l'Écurie.",
     "liens": [
      "atelier",
      "murs",
      "paille",
      "fibre",
      "grand_monde"
     ],
     "decouverte": [
      "objet:ratelier",
      "objet:corde",
      "objet:poteau_attache"
     ],
     "visuels": [
      {
       "image": "cheval.png",
       "w": 48,
       "h": 40,
       "x": 0,
       "l": 672,
       "hh": 40
      }
     ]
    },
    {
     "id": "buissons",
     "terme": "Buissons et baies",
     "description": "Chaque matin, des buissons de la ferme portent des baies (3 sur un petit buisson, 5 sur un grand), qui se cueillent sans énergie. La hache les coupe d'un coup (2 bois pour un grand, 1 pour un petit) ; ils repoussent quelques jours plus tard, sauf si l'on a bâti sur leur place.",
     "liens": [
      "hache",
      "ramassage"
     ],
     "decouverte": [
      "objet:baies"
     ]
    },
    {
     "id": "atelier",
     "terme": "Atelier",
     "description": "Le premier bâtiment : il se construit avec 3 bois et 3 pierres, puis se pose sur la carte. On y fabrique les planches, les murs, les fenêtres, les portes, la paillasse, le plancher, le chemin, la barrière, l'escalier, les blocs clés des bâtiments, le four et la cuisinière, le puits, les appareils (panneau, pompe, citerne, batterie, avec des lingots), et tout ce qui ne s'achète pas : les outils (houe, hache, pioche, faux, canne à pêche, triporteur), de quoi attirer les bêtes (le nid garni d'une poule, la pierre à sel et le foin d'un mouton ou d'une vache, le licol et les friandises du cheval), la ruche et le bac à fleurs. Les meubles s'achètent dans les hameaux (Bois-Joli, Les Genêts) ; la scierie de Bois-Joli fait plus de planches que l'Atelier, contre un jour d'attente.",
     "liens": [
      "bois_et_pierre",
      "fibre",
      "mode_construire",
      "lingot",
      "outils",
      "meubles",
      "ruche",
      "cheval",
      "comptoir"
     ],
     "decouverte": [
      "didacticiel:atelier"
     ]
    },
    {
     "id": "mode_construire",
     "terme": "Mode Construire",
     "description": "La case 🔨 de la barre d'outils : un menu sur le côté propose les blocs qu'on a en main ; un appui sur une case de la carte pose le bloc choisi, un appui sur un bloc posé le reprend (il revient dans l'inventaire). On ne bâtit que sur l'herbe libre : l'herbe haute se fauche d'abord, un rocher ou un arbre se casse ou s'abat. Un niveau au-dessus du sol sert à rehausser les murs ou à bâtir à l'étage.",
     "liens": [
      "atelier",
      "murs",
      "piece_close",
      "etage"
     ],
     "decouverte": [
      "didacticiel:atelier"
     ]
    },
    {
     "id": "murs",
     "terme": "Murs, fenêtres et portes",
     "description": "Les murs ferment les pièces : en pierre, en briques (rouges, orange, ocre, bleues), en pierre de taille, la pierre d'angle et la paroi vitrée. Une fenêtre se pose sur un mur, à sa place (le mur revient dans l'inventaire) ; une porte aussi, ou directement sur une case libre. Le même mur posé sur un mur le rehausse, jusqu'à 3 blocs. Un mur qui porte l'étage ne se reprend pas tant qu'il y a quelque chose au-dessus.",
     "liens": [
      "piece_close",
      "mode_construire",
      "etage"
     ],
     "decouverte": [
      "objet:mur_bois",
      "objet:mur_pierre",
      "objet:porte",
      "didacticiel:abri_construire"
     ]
    },
    {
     "id": "piece_close",
     "terme": "Pièce close",
     "description": "Des cases entourées de murs (et de portes), sans toucher le bord de la carte, d'au plus 400 cases, avec au moins une porte. Une pièce close a un toit. Le premier bloc posé dedans décide de ce qu'elle est : la maison (une paillasse, un lit, le four, la cuisinière, un meuble) ou un bâtiment (son bloc clé) ; une pièce vide reste une simple enceinte.",
     "liens": [
      "murs",
      "foyer",
      "bloc_cle",
      "maison"
     ],
     "decouverte": [
      "piece_close"
     ]
    },
    {
     "id": "foyer",
     "terme": "Foyer",
     "description": "La pièce close où l'on dort, avec une paillasse ou un lit. Tant qu'il n'existe pas, rien d'autre ne s'installe (panneau, pompe…). Chaque nuit, il faut un couchage par membre de la famille, dans une pièce close : sans lui, un membre perd -8 de bonheur. Le personnage rentre au foyer le soir et en ressort le matin. Le premier couchage est le sien ; un appui sur un autre lit lui demande s'il le choisit : il y dormira, et le membre qui y dormait prend son ancien lit.",
     "liens": [
      "maison",
      "piece_close",
      "bonheur"
     ],
     "decouverte": [
      "piece_close"
     ]
    },
    {
     "id": "bloc_cle",
     "terme": "Bloc clé d'un bâtiment",
     "description": "Posé dans une pièce close vide (un plancher peut y être), il en fait un bâtiment : le nichoir fait le Poulailler, la mangeoire l'Étable, le bac à semis la Serre, la meule le Moulin (dans une tour de murs rehaussés). Repris, le bâtiment n'est plus là ; ses bêtes restent.",
     "liens": [
      "poulailler",
      "etable",
      "serre",
      "moulin",
      "piece_close"
     ],
     "decouverte": [
      "objet:nichoir",
      "objet:mangeoire",
      "objet:bac_semis"
     ]
    },
    {
     "id": "etage",
     "terme": "Étage",
     "description": "Un escalier posé dans une pièce close ouvre un étage au-dessus d'elle et de ses murs : on y monte par l'escalier, et l'on y pose des murs, des fenêtres, des portes, des paillasses, des lits, des lanternes, des réverbères et des meubles. Le toit de la maison se pose alors sur les murs de l'étage.",
     "liens": [
      "piece_close",
      "murs",
      "maison"
     ],
     "decouverte": [
      "objet:escalier"
     ]
    },
    {
     "id": "barriere_enclos",
     "terme": "Barrière et enclos",
     "description": "La barrière arrête le passage et se raccorde à ses voisines, sans fermer de pièce. Une étendue close de barrières, reliée à un bâtiment par une porte, fait l'enclos du Poulailler ou de l'Étable.",
     "liens": [
      "poulailler",
      "etable"
     ],
     "decouverte": [
      "objet:barriere"
     ]
    },
    {
     "id": "plancher_chemin",
     "terme": "Plancher et chemin",
     "description": "Des sols qui se posent à plat sous les autres blocs : le plancher dans les pièces, le chemin de terre dehors, qui se raccorde aux chemins de la carte.",
     "liens": [
      "mode_construire"
     ],
     "decouverte": [
      "objet:plancher",
      "objet:chemin"
     ]
    },
    {
     "id": "lanterne",
     "terme": "Lanterne scintillante",
     "description": "Un bloc qui éclaire autour de lui la nuit. Elle se fabrique à l'Atelier avec un champignon lumineux (il pousse au sol de la mine, et repousse le lendemain) et deux bois, et se pose sur la ferme, dehors comme dans la maison.",
     "liens": [
      "atelier",
      "grotte",
      "candelabre"
     ],
     "decouverte": [
      "objet:lanterne",
      "objet:champignon_lumineux"
     ]
    },
    {
     "id": "candelabre",
     "terme": "Réverbère",
     "description": "Une lanterne à huile sous son chapeau, sur un fût de fonte haut de deux blocs et un socle de pierre : la nuit, elle s'allume et éclaire autour d'elle d'une lumière chaude, comme la lanterne. Il se fabrique à l'Atelier avec 2 lingots de fer, 1 pierre (le socle), 1 huile de tournesol (pour la lampe) et 1 fibre (la mèche), et se pose comme un bloc avec 🔨 Construire (onglet Maison), dehors comme dans la maison ou à l'étage. C'est un décor : il ne fait d'une pièce ni la maison ni un bâtiment. Il a remplacé le candélabre et ses bougies.",
     "liens": [
      "lanterne",
      "atelier",
      "huile",
      "lingot",
      "mode_construire"
     ],
     "decouverte": [
      "objet:candelabre"
     ]
    },
    {
     "id": "meubles",
     "terme": "Meubles",
     "description": "Chaises, tables, tapis, lits (adulte, enfant ; deux lits côte à côte font un lit deux places), tables de chevet, canapés, tables basses, tableaux, mais aussi buffet, commode, armoires, bas de cuisine, poubelle, bibliothèques, lampadaire, coffre à jouets et dix plantes vertes : ils se commandent au cocher, à la calèche : l'ébéniste de Bois-Joli et les tapis des Genêts, une fois ces hameaux connus ; puis ils se posent dans la maison. Une grille aide à les placer ; les tableaux s'accrochent à un mur.",
     "liens": [
      "maison",
      "comptoir"
     ],
     "decouverte": [
      "objet:meuble_chaise",
      "objet:meuble_table",
      "objet:meuble_tapis_1",
      "objet:meuble_tapis_2",
      "objet:meuble_tapis_3",
      "objet:meuble_lit_adulte",
      "objet:meuble_lit_enfant",
      "objet:meuble_chevet",
      "objet:meuble_canape",
      "objet:meuble_table_basse",
      "objet:meuble_tableau_1",
      "objet:meuble_tableau_2",
      "objet:meuble_tableau_3",
      "objet:meuble_buffet",
      "objet:meuble_commode",
      "objet:meuble_armoire_chene",
      "objet:meuble_armoire_peinte",
      "objet:meuble_armoire_glace",
      "objet:meuble_cuisine_porte",
      "objet:meuble_cuisine_tiroirs",
      "objet:meuble_cuisine_sauge",
      "objet:meuble_poubelle",
      "objet:meuble_bibliotheque",
      "objet:meuble_bibliotheque_vitree",
      "objet:meuble_lampadaire",
      "objet:meuble_coffre_jouets",
      "objet:meuble_plante_ficus",
      "objet:meuble_plante_monstera",
      "objet:meuble_plante_sansevieria",
      "objet:meuble_plante_cactus",
      "objet:meuble_plante_fougere",
      "objet:meuble_plante_palmier",
      "objet:meuble_plante_citronnier",
      "objet:meuble_plante_orchidee",
      "objet:meuble_plante_aloe",
      "objet:meuble_plante_bonsai"
     ]
    },
    {
     "id": "ruche",
     "terme": "Ruche",
     "description": "Se fabrique à l'Atelier (des planches, de la fibre tressée, une pierre) et se pose dehors comme un bloc : un essaim vient l'habiter. Au bout de 2 nuits, elle est pleine : une bulle avec un pot de miel s'affiche au-dessus d'elle, et un appui la récolte (3 pots). Ses abeilles volent vers les fleurs.",
     "liens": [
      "miel",
      "abeilles",
      "bac_a_fleurs"
     ],
     "decouverte": [
      "objet:ruche",
      "objet:miel"
     ]
    },
    {
     "id": "abeilles",
     "terme": "Abeilles",
     "description": "Chaque ruche a ses abeilles : le jour, elles sortent, butinent les fleurs de l'herbe et des bacs à fleurs, puis rentrent à la ruche. La nuit, elles restent dedans.",
     "liens": [
      "ruche",
      "bac_a_fleurs"
     ],
     "decouverte": [
      "objet:ruche",
      "objet:miel"
     ]
    },
    {
     "id": "bac_a_fleurs",
     "terme": "Bac à fleurs",
     "description": "Se fabrique à l'Atelier (des planches et de la pierre) et se pose comme un bloc : les abeilles des ruches viennent y butiner.",
     "liens": [
      "abeilles",
      "ruche",
      "comptoir"
     ],
     "decouverte": [
      "objet:bac_fleurs"
     ]
    },
    {
     "id": "graines_d_arbre",
     "terme": "Pomme de pin et gland",
     "description": "Sur la ferme, un arbre abattu ne repousse pas : il laisse sa graine, une pomme de pin pour un sapin, un gland pour un autre arbre. Plantée depuis sa fiche de l'Inventaire (« Planter », puis une case en surbrillance sur la carte) sur n'importe quelle case d'herbe libre, dehors, c'est d'abord une jeune pousse pendant 2 à 4 jours, puis un arbre qui se coupe comme les autres.",
     "liens": [
      "hache",
      "mode_construire",
      "graines"
     ],
     "decouverte": [
      "objet:pomme_de_pin",
      "objet:gland"
     ]
    },
    {
     "id": "recolte_du_monde",
     "terme": "Couper et ramasser dans le grand monde",
     "description": "Hors de la ferme, ce qui pousse et ce qui traîne se prend avec les gestes de la ferme. La hache abat les arbres des forêts, de la lande et du marais en 3 coups (un sapin lâche parfois une pomme de pin, un feuillu un gland), les buissons, les souches et les troncs couchés ; la pioche casse les rochers, les gros blocs et les éboulis de la montagne ; la faux fauche les fougères, la bruyère, les joncs, les roseaux et les oyats (de la fibre). À la main, on cueille les mûres des ronciers, on ramasse les champignons, les herbes de montagne, le bois flotté, les galets et les pierres, les coquillages, les étoiles de mer et les algues de la plage. Ce qui est pris revient quelques jours plus tard, si l'on est passé par là. Les falaises, les pitons, les rochers dans la mer et l'épave restent comme ils sont.",
     "liens": [
      "hache",
      "pioche",
      "faux",
      "mures",
      "laisse_de_mer",
      "bois_et_pierre"
     ],
     "decouverte": [
      "objet:mures",
      "objet:etoile_mer",
      "objet:algues"
     ]
    },
    {
     "id": "mures",
     "terme": "Mûres",
     "description": "Dans les forêts du grand monde, les ronciers qui portent des mûres (noires ou rouges ; un roncier en fleur n'en a pas encore) se cueillent à la main : 2 à 4 mûres, pour un peu d'énergie. Le roncier reste là, sans fruits, et en porte de nouveau 3 à 5 jours plus tard. Elles se mangent fraîches (elles se gardent peu) ou se vendent.",
     "liens": [
      "recolte_du_monde",
      "buissons"
     ],
     "decouverte": [
      "objet:mures"
     ]
    },
    {
     "id": "laisse_de_mer",
     "terme": "Étoiles de mer, algues et coquillages",
     "description": "Sur les plages du grand monde, au bord de l'eau, la mer laisse des coquillages (une coquille Saint-Jacques, parfois un bulot avec), des étoiles de mer et des algues : un appui dessus, le personnage va les ramasser à la main. La mer en rapporte d'autres quelques jours plus tard. Ils ne se mangent pas : ils se vendent (la calèche les achète).",
     "liens": [
      "recolte_du_monde"
     ],
     "decouverte": [
      "objet:etoile_mer",
      "objet:algues",
      "objet:coquille"
     ]
    }
   ]
  },
  {
   "id": "cultures",
   "icone": "🌾",
   "nom": "Cultures & plantes",
   "entrees": [
    {
     "id": "carotte",
     "terme": "Carotte",
     "description": "Légume de plein air (Zone de culture) qui atteint sa maturité en 4 stades de croissance (un stade 24 heures après chaque arrosage). Sa récolte rend aussi 1 à 2 graines de carotte.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:carotte"
     ]
    },
    {
     "id": "patate",
     "terme": "Patate",
     "description": "Légume de plein air (Zone de culture) qui atteint sa maturité en 6 stades. Une patate récoltée peut directement être replantée comme un plant.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:patate"
     ]
    },
    {
     "id": "tomate",
     "terme": "Tomate",
     "description": "Légume qui peut être cultivé aussi bien dans la Zone de culture qu'en serre, en 5 stades.",
     "liens": [
      "potager",
      "serre"
     ],
     "decouverte": [
      "culture:tomate"
     ]
    },
    {
     "id": "courgette",
     "terme": "Courgette",
     "description": "Légume qui peut être cultivé aussi bien dans la Zone de culture qu'en serre, en 5 stades.",
     "liens": [
      "potager",
      "serre"
     ],
     "decouverte": [
      "culture:courgette"
     ]
    },
    {
     "id": "aubergine",
     "terme": "Aubergine",
     "description": "Légume qui peut être cultivé aussi bien dans la Zone de culture qu'en serre, en 6 stades.",
     "liens": [
      "potager",
      "serre"
     ],
     "decouverte": [
      "culture:aubergine"
     ]
    },
    {
     "id": "oignon",
     "terme": "Oignon",
     "description": "Légume de plein air (Zone de culture), en 5 stades de croissance.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:oignon"
     ]
    },
    {
     "id": "ail",
     "terme": "Ail",
     "description": "Légume de plein air (Zone de culture), en 6 stades. Une fois récolté, il peut directement être replanté comme un plant.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:ail"
     ]
    },
    {
     "id": "poivron",
     "terme": "Poivron",
     "description": "Légume qui peut être cultivé aussi bien dans la Zone de culture qu'en serre, en 6 stades.",
     "liens": [
      "potager",
      "serre"
     ],
     "decouverte": [
      "culture:poivron"
     ]
    },
    {
     "id": "epinard",
     "terme": "Épinard",
     "description": "Légume de plein air (Zone de culture) qui pousse le plus rapidement, en seulement 3 stades.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:epinard"
     ]
    },
    {
     "id": "fraise",
     "terme": "Fraise",
     "description": "Légume de plein air (Zone de culture), en 4 stades, qui rend le plus de graines par récolte.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:fraise"
     ]
    },
    {
     "id": "ble",
     "terme": "Blé",
     "description": "Culture de la Zone de culture, qui ne se plante qu'une fois le Silo construit. Sert à la fois d'ingrédient (moulu au moulin, qui en tire de la farine, ou donné aux poules du poulailler) et de semence pour replanter.",
     "liens": [
      "potager",
      "silo",
      "moulin",
      "farine",
      "poulailler",
      "poule"
     ],
     "decouverte": [
      "culture:ble"
     ]
    },
    {
     "id": "tournesol",
     "terme": "Tournesol",
     "description": "Culture de la Zone de culture, dont les graines sont soit replantées, soit transformées en huile par la presse.",
     "liens": [
      "potager",
      "presse",
      "huile"
     ],
     "decouverte": [
      "culture:tournesol"
     ]
    },
    {
     "id": "riz",
     "terme": "Riz",
     "description": "Culture de la Zone de culture, qui demande deux fois plus d'eau à l'arrosage que le blé.",
     "liens": [
      "potager",
      "reservoir",
      "riz_au_lait"
     ],
     "decouverte": [
      "culture:riz"
     ]
    },
    {
     "id": "houblon",
     "terme": "Houblon",
     "description": "Culture de la Zone de culture, non comestible, utilisée uniquement pour la vente et pour préparer la bière artisanale.",
     "liens": [
      "potager",
      "biere_artisanale"
     ],
     "decouverte": [
      "culture:houblon"
     ]
    },
    {
     "id": "cacao",
     "terme": "Cacao",
     "description": "Culture de rente cultivée exclusivement en serre, jamais comestible. Utilisée pour la vente et pour préparer le chocolat chaud.",
     "liens": [
      "serre",
      "chocolat_chaud"
     ],
     "decouverte": [
      "culture:cacao"
     ]
    },
    {
     "id": "vanille",
     "terme": "Vanille",
     "description": "Culture de rente cultivée exclusivement en serre, jamais comestible et la plus chère à la vente. Utilisée pour préparer la crème à la vanille.",
     "liens": [
      "serre",
      "creme_a_la_vanille"
     ],
     "decouverte": [
      "culture:vanille"
     ]
    },
    {
     "id": "cafe",
     "terme": "Café",
     "description": "Culture de rente cultivée exclusivement en serre, jamais comestible. Utilisée pour préparer la boisson du même nom.",
     "liens": [
      "serre"
     ],
     "decouverte": [
      "culture:cafe"
     ]
    },
    {
     "id": "pommier",
     "terme": "Pommier",
     "description": "Arbre fruitier permanent du verger, planté dans le sol (un jeune arbre acheté à la calèche). Porte 6 pommes 15 nuits après sa plantation, puis 3 nuits après chaque cueillette, toute l'année.",
     "liens": [
      "verger"
     ],
     "decouverte": [
      "objet:jeune_pommier",
      "objet:pomme"
     ]
    },
    {
     "id": "poirier",
     "terme": "Poirier",
     "description": "Arbre fruitier permanent du verger, planté dans le sol (un jeune arbre acheté à la calèche). Porte 6 poires 15 nuits après sa plantation, puis 3 nuits après chaque cueillette, toute l'année.",
     "liens": [
      "verger"
     ],
     "decouverte": [
      "objet:jeune_poirier",
      "objet:poire"
     ]
    },
    {
     "id": "autres_fruitiers",
     "terme": "Cerisier, abricotier, pêcher",
     "description": "Arbres fruitiers permanents du verger, comme le pommier et le poirier : un jeune arbre s'achète à la calèche et se plante dans le sol. Ils donnent cerises, abricots et pêches, et fleurissent avant de porter leurs fruits.",
     "liens": [
      "verger",
      "pommier",
      "poirier"
     ],
     "decouverte": [
      "objet:jeune_cerisier",
      "objet:jeune_abricotier",
      "objet:jeune_pecher",
      "objet:cerise",
      "objet:abricot",
      "objet:peche"
     ]
    }
   ]
  },
  {
   "id": "animaux",
   "icone": "🐄",
   "nom": "Animaux & produits animaux",
   "entrees": [
    {
     "id": "poule",
     "terme": "Poule",
     "description": "Animal du Poulailler, attiré par un nid garni (de la fibre et du blé, fabriqué à l'Atelier). Pond un œuf chaque nuit où elle a été nourrie avec du blé (1 blé pour 2 poules), et cela toute sa vie. Le jour, elle sort dans l'enclos.",
     "liens": [
      "poulailler",
      "etable",
      "comptoir",
      "silo",
      "ble",
      "oeuf"
     ],
     "decouverte": [
      "animal:poule"
     ],
     "visuels": [
      {
       "image": "poule.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 272,
       "hh": 16
      }
     ]
    },
    {
     "id": "mouton",
     "terme": "Mouton",
     "description": "Animal de l'Étable, venu pour une pierre à sel et du foin (Atelier), qui occupe 1 place. Il mange 1 paille par nuit ; sa laine est prête à tondre après 2 nuits où il a été nourri. Sans paille, sa laine n'avance pas cette nuit-là, et rien d'autre ne lui arrive. Le second adulte de la famille peut s'occuper des bêtes.",
     "liens": [
      "etable",
      "comptoir",
      "paille",
      "laine"
     ],
     "decouverte": [
      "animal:mouton"
     ],
     "visuels": [
      {
       "image": "mouton.png",
       "w": 32,
       "h": 24,
       "x": 0,
       "l": 256,
       "hh": 24
      }
     ]
    },
    {
     "id": "vache",
     "terme": "Vache",
     "description": "Animal de l'Étable, venue pour une pierre à sel et du foin (Atelier), qui occupe 3 places. Elle mange 2 pailles par nuit et donne 1 lait chaque nuit où elle a mangé. Sans paille, elle ne donne pas de lait cette nuit-là, et rien d'autre ne lui arrive. Nourrie aux herbes de montagne (bouton « Nourrir les vaches aux herbes » de l'Étable), elle mange 1 herbe à la place de sa paille et donne du lait d'alpage.",
     "liens": [
      "etable",
      "comptoir",
      "paille",
      "lait",
      "fromage_d_alpage"
     ],
     "decouverte": [
      "animal:vache"
     ],
     "visuels": [
      {
       "image": "vache.png",
       "w": 32,
       "h": 24,
       "x": 0,
       "l": 480,
       "hh": 24
      }
     ]
    },
    {
     "id": "paille",
     "terme": "Paille",
     "description": "Nourriture des moutons et des vaches, que fait la botteleuse : on y jette 10 fibres et une botte de paille (10 paille) sort sur son convoyeur, à ramasser en marchant dessus. Chaque nuit, un mouton en mange 1 et une vache 2, dans l'ordre de leur liste. Elle ne se mange pas et ne s'achète pas ; elle ne périme pas.",
     "liens": [
      "botteleuse",
      "fibre",
      "mouton",
      "vache",
      "etable"
     ],
     "decouverte": [
      "objet:paille"
     ]
    },
    {
     "id": "oeuf",
     "terme": "Œuf",
     "description": "Aliment produit par les poules du poulailler, consommé par la famille ou utilisé dans des recettes comme l'omelette.",
     "liens": [
      "poule",
      "omelette"
     ],
     "decouverte": [
      "objet:oeuf"
     ]
    },
    {
     "id": "laine",
     "terme": "Laine",
     "description": "Produit obtenu en tondant un mouton dont la laine est prête ; il se vend à la calèche, et sert aux tapis, aux lits et au canapé (Atelier). Ne se consomme pas et ne périme jamais.",
     "liens": [
      "mouton",
      "comptoir"
     ],
     "decouverte": [
      "objet:laine"
     ]
    },
    {
     "id": "lait",
     "terme": "Lait",
     "description": "Produit donné chaque nuit par les vaches qui ont mangé leur paille, consommé par la famille ou utilisé dans des recettes comme le fromage frais ou le chocolat chaud.",
     "liens": [
      "vache",
      "paille",
      "fromage_frais",
      "chocolat_chaud"
     ],
     "decouverte": [
      "objet:lait"
     ]
    },
    {
     "id": "fromage_d_alpage",
     "terme": "Herbes, lait et fromage d'alpage",
     "description": "Les herbes de montagne se cueillent à la main dans la montagne du grand monde (les touffes fleuries des pentes) ; elles se gardent 3 nuits. Dans l'Étable, le bouton « Nourrir les vaches aux herbes » les donne aux vaches : chaque nuit, une vache mange 1 herbe à la place de ses 2 pailles et donne du lait d'alpage au lieu du lait ; quand les herbes manquent, elle reprend sa paille. En Cuisine, une fois la Laiterie débloquée, 3 laits d'alpage font un fromage d'alpage, plus cher que le fromage frais. Le fromage d'alpage sert à la raclette.",
     "liens": [
      "vache",
      "etable",
      "lait",
      "cuisine",
      "raclette",
      "recolte_du_monde"
     ],
     "decouverte": [
      "objet:herbes_montagne",
      "objet:lait_alpage",
      "objet:fromage_alpage"
     ]
    },
    {
     "id": "viandes",
     "terme": "Viandes et plats à la viande",
     "description": "Depuis la version 1.1, les animaux ne sont plus abattus : la ferme ne produit plus de viande, et le ragoût, les poivrons farcis, le rôti de bœuf et le poulet rôti à l'ail ne se préparent plus. Les viandes et les plats à la viande qui restent dans une ancienne partie se mangent et se vendent toujours.",
     "liens": [
      "poule",
      "mouton",
      "vache"
     ],
     "decouverte": [
      "objet:viande_mouton",
      "objet:viande_boeuf",
      "objet:viande_volaille",
      "animal:mouton",
      "animal:vache"
     ]
    },
    {
     "id": "miel",
     "terme": "Miel",
     "description": "Produit des ruches : une ruche pleine donne 3 pots de miel. Il se vend à la calèche.",
     "liens": [
      "ruche",
      "abeilles"
     ],
     "decouverte": [
      "objet:miel"
     ]
    }
   ]
  },
  {
   "id": "ressources",
   "icone": "📦",
   "nom": "Ressources, ingrédients & stockage",
   "entrees": [
    {
     "id": "electricite",
     "terme": "Électricité",
     "description": "Ressource produite par le panneau solaire (de 7 h à 19 h), stockée dans la batterie, et consommée par la pompe, le moulin, la presse, le réfrigérateur et la station de charge du robot.",
     "liens": [
      "panneau_solaire",
      "batterie",
      "robot"
     ],
     "decouverte": [
      "objet:panneau_solaire",
      "objet:batterie"
     ]
    },
    {
     "id": "eau",
     "terme": "Eau",
     "description": "Ressource puisée dans le puits par la pompe, stockée dans la citerne (le réservoir), et utilisée pour arroser la Zone de culture et la Serre, à la main ou par les asperseurs, et dans quelques recettes.",
     "liens": [
      "puit",
      "pompe",
      "reservoir",
      "asperseurs"
     ],
     "decouverte": [
      "objet:puits_pierre",
      "objet:cruche",
      "didacticiel:puits"
     ]
    },
    {
     "id": "pieces",
     "terme": "Pièces",
     "description": "Monnaie du jeu, obtenue en vendant les surplus de la ferme à la calèche, et dépensée pour les achats (des semences, les produits des hameaux), les améliorations et l'agrandissement des surfaces.",
     "liens": [
      "comptoir"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "farine",
     "terme": "Farine",
     "description": "Ingrédient obtenu en moulant le blé au moulin, utilisé dans des recettes comme le pain, les tartes, la quiche, la quenelle de poisson ou le pain d'épices.",
     "liens": [
      "ble",
      "moulin",
      "pain"
     ],
     "decouverte": [
      "objet:farine"
     ]
    },
    {
     "id": "huile",
     "terme": "Huile",
     "description": "Ingrédient obtenu en transformant les graines de tournesol à la presse, utilisé dans des recettes comme l'omelette ou la ratatouille.",
     "liens": [
      "tournesol",
      "presse",
      "omelette",
      "ratatouille"
     ],
     "decouverte": [
      "objet:huile"
     ]
    },
    {
     "id": "graines",
     "terme": "Graines",
     "description": "Obtenues normalement en récoltant les cultures, elles permettent de replanter. Peuvent aussi être achetées à la calèche (les seules choses qu'elle vend, avec les produits des hameaux) en dépannage, mais à un prix plus élevé que la production. Les arbres abattus laissent aussi leurs graines : la pomme de pin et le gland.",
     "liens": [
      "graines_d_arbre",
      "comptoir"
     ],
     "decouverte": [
      "objet:graine_carotte",
      "didacticiel:graines"
     ]
    },
    {
     "id": "conserve",
     "terme": "Boîte de conserve",
     "description": "Aliment non périssable présent dès le début de la partie (40 boîtes), qui laisse le temps de lancer les premières cultures avant que la boîte à nourriture ne soit vide. Ne peut pas être racheté une fois épuisé, et ne compte pas pour l'autonomie. À ne pas confondre avec le bocal de légumes.",
     "liens": [
      "apport_journalier",
      "potager",
      "bocal_de_legumes"
     ],
     "decouverte": [
      "objet:conserve"
     ]
    },
    {
     "id": "inventaire",
     "terme": "Inventaire",
     "description": "Stock illimité de tous les objets possédés par la ferme, organisé en lots datés selon leur date de récolte, pour suivre leur péremption.",
     "liens": [
      "peremption"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "apport_journalier",
     "terme": "Faim de la famille",
     "description": "Chaque membre de la famille, sauf le personnage principal, a une jauge de faim de 0 à 100 (dans la fenêtre Famille). Elle baisse quand il marche sur la carte (1 point tous les 100 pixels) et quand il aide aux bêtes (5 points par tâche). À 20, il va manger jusqu'à 100 dans la boîte à nourriture (ou au réfrigérateur) ; s'il n'y trouve rien, il a faim et perd du bonheur la nuit. Les animaux de compagnie n'y comptent pas.",
     "liens": [
      "famille",
      "adulte",
      "enfant",
      "animal_de_compagnie",
      "repas",
      "energie_personnage"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "peremption",
     "terme": "Péremption",
     "description": "Durée pendant laquelle un aliment ou un plat reste consommable hors du réfrigérateur : de 2 nuits (le poisson frais) à 12 nuits selon l'aliment, 6 nuits pour la plupart des plats. Le réfrigérateur permet de conserver sans limite de temps.",
     "liens": [
      "refrigerateur"
     ],
     "decouverte": [
      "jour:2"
     ]
    }
   ]
  },
  {
   "id": "recettes",
   "icone": "🍲",
   "nom": "Recettes & plats",
   "entrees": [
    {
     "id": "pain",
     "terme": "Pain",
     "description": "Plat cuit au four à partir de farine et d'eau.",
     "liens": [
      "four",
      "farine"
     ],
     "decouverte": [
      "objet:pain",
      "recette:pain"
     ]
    },
    {
     "id": "omelette",
     "terme": "Omelette",
     "description": "Plat préparé à la cuisine à partir d'œufs et d'huile.",
     "liens": [
      "cuisine",
      "oeuf",
      "huile"
     ],
     "decouverte": [
      "objet:omelette",
      "recette:omelette"
     ]
    },
    {
     "id": "ratatouille",
     "terme": "Ratatouille",
     "description": "Plat préparé à la cuisine à partir de tomate, courgette, aubergine et huile.",
     "liens": [
      "cuisine",
      "tomate",
      "courgette",
      "aubergine",
      "huile"
     ],
     "decouverte": [
      "objet:ratatouille",
      "recette:ratatouille"
     ]
    },
    {
     "id": "gratin_de_patates",
     "terme": "Gratin de patates",
     "description": "Plat cuit au four à partir de patates et d'œuf, dont la valeur nutritionnelle est élevée : il rassasie à lui seul un membre affamé.",
     "liens": [
      "four",
      "patate",
      "oeuf",
      "apport_journalier"
     ],
     "decouverte": [
      "objet:gratin_patates",
      "recette:gratin_patates"
     ]
    },
    {
     "id": "compote",
     "terme": "Compote",
     "description": "Plat préparé à la cuisine à partir de pommes ou de poires.",
     "liens": [
      "cuisine",
      "pommier",
      "poirier"
     ],
     "decouverte": [
      "objet:compote",
      "recette:compote"
     ]
    },
    {
     "id": "tarte_aux_pommes",
     "terme": "Tarte aux pommes",
     "description": "Plat cuit au four à partir de farine, pommes et œuf.",
     "liens": [
      "four",
      "farine",
      "pommier",
      "oeuf"
     ],
     "decouverte": [
      "objet:tarte_pommes",
      "recette:tarte_pommes"
     ]
    },
    {
     "id": "soupe_de_legumes",
     "terme": "Soupe de légumes",
     "description": "Plat préparé à la cuisine à partir de carotte, oignon, patate et eau.",
     "liens": [
      "cuisine",
      "carotte",
      "oignon",
      "patate"
     ],
     "decouverte": [
      "objet:soupe_legumes",
      "recette:soupe_legumes"
     ]
    },
    {
     "id": "salade_de_tomates",
     "terme": "Salade de tomates",
     "description": "Plat préparé à la cuisine à partir de tomates et d'huile.",
     "liens": [
      "cuisine",
      "tomate",
      "huile"
     ],
     "decouverte": [
      "objet:salade_tomates",
      "recette:salade_tomates"
     ]
    },
    {
     "id": "quiche_aux_epinards",
     "terme": "Quiche aux épinards",
     "description": "Plat cuit au four à partir de farine, œufs, lait et épinard.",
     "liens": [
      "four",
      "farine",
      "oeuf",
      "lait",
      "epinard"
     ],
     "decouverte": [
      "objet:quiche_epinards",
      "recette:quiche_epinards"
     ]
    },
    {
     "id": "fromage_frais",
     "terme": "Fromage frais",
     "description": "Plat préparé à la cuisine à partir de lait, se conservant mieux que le lait cru.",
     "liens": [
      "cuisine",
      "lait",
      "fromage_d_alpage"
     ],
     "decouverte": [
      "objet:fromage_frais",
      "recette:fromage_frais"
     ]
    },
    {
     "id": "riz_au_lait",
     "terme": "Riz au lait",
     "description": "Plat préparé à la cuisine à partir de riz et de lait.",
     "liens": [
      "cuisine",
      "riz",
      "lait"
     ],
     "decouverte": [
      "objet:riz_au_lait",
      "recette:riz_au_lait"
     ]
    },
    {
     "id": "pain_a_lail",
     "terme": "Pain à l'ail",
     "description": "Plat cuit au four à partir de pain, d'ail et d'huile.",
     "liens": [
      "four",
      "pain",
      "ail",
      "huile"
     ],
     "decouverte": [
      "objet:pain_ail",
      "recette:pain_ail"
     ]
    },
    {
     "id": "tarte_aux_fraises",
     "terme": "Tarte aux fraises",
     "description": "Plat cuit au four à partir de farine, fraises et œuf.",
     "liens": [
      "four",
      "farine",
      "fraise",
      "oeuf"
     ],
     "decouverte": [
      "objet:tarte_fraises",
      "recette:tarte_fraises"
     ]
    },
    {
     "id": "confiture_de_fraises",
     "terme": "Confiture de fraises",
     "description": "Plat préparé à la cuisine à partir de fraises, ne périmant pas. Débloqué par la technologie Mise en bocaux.",
     "liens": [
      "cuisine",
      "fraise",
      "bocal_de_legumes",
      "arbre_technologique"
     ],
     "decouverte": [
      "objet:confiture_fraises",
      "recette:confiture_fraises"
     ]
    },
    {
     "id": "bocal_de_legumes",
     "terme": "Bocal de légumes",
     "description": "Plat préparé à la cuisine à partir de 4 légumes d'une même sorte et de 1 L d'eau ; ne périme pas. Débloqué par la technologie Mise en bocaux. Contrairement à la boîte de conserve de départ, il compte comme produit de la ferme pour l'autonomie.",
     "liens": [
      "cuisine",
      "conserve",
      "arbre_technologique"
     ],
     "decouverte": [
      "objet:bocal_legumes",
      "recette:bocal_legumes"
     ]
    },
    {
     "id": "chocolat_chaud",
     "terme": "Chocolat chaud",
     "description": "Recette de luxe préparée à la cuisine à partir de cacao et de lait, vendue trois fois le prix de ses ingrédients.",
     "liens": [
      "cuisine",
      "cacao",
      "lait"
     ],
     "decouverte": [
      "objet:chocolat_chaud",
      "recette:chocolat_chaud"
     ]
    },
    {
     "id": "cafe_boisson",
     "terme": "Café chaud",
     "description": "Boisson de luxe préparée à la cuisine à partir de café et d'eau, vendue trois fois le prix de ses ingrédients.",
     "liens": [
      "cuisine",
      "cafe"
     ],
     "decouverte": [
      "objet:cafe_boisson",
      "recette:cafe_boisson"
     ]
    },
    {
     "id": "creme_a_la_vanille",
     "terme": "Crème à la vanille",
     "description": "Recette de luxe préparée à la cuisine à partir de vanille, lait et œufs, vendue trois fois le prix de ses ingrédients.",
     "liens": [
      "cuisine",
      "vanille",
      "lait",
      "oeuf"
     ],
     "decouverte": [
      "objet:creme_vanille",
      "recette:creme_vanille"
     ]
    },
    {
     "id": "biere_artisanale",
     "terme": "Bière artisanale",
     "description": "Recette de luxe préparée à la cuisine à partir de houblon et d'eau, vendue trois fois le prix de ses ingrédients et ne périmant pas.",
     "liens": [
      "cuisine",
      "houblon"
     ],
     "decouverte": [
      "objet:biere_artisanale",
      "recette:biere_artisanale"
     ]
    },
    {
     "id": "omelette_aux_champignons",
     "terme": "Omelette aux champignons",
     "description": "Plat préparé à la cuisine à partir d'œufs et de champignons ramassés à la main dans les forêts du grand monde (ou venus des cueilleurs des hameaux, par la calèche).",
     "liens": [
      "cuisine",
      "oeuf",
      "recolte_du_monde"
     ],
     "decouverte": [
      "objet:omelette_champignons",
      "recette:omelette_champignons"
     ]
    },
    {
     "id": "poisson_grille",
     "terme": "Poisson grillé à l'ail",
     "description": "Plat préparé à la cuisine à partir d'un poisson (de l'étang, d'un lac, d'une rivière ou de la mer) et d'ail.",
     "liens": [
      "cuisine",
      "peche",
      "ail"
     ],
     "decouverte": [
      "objet:poisson_grille",
      "recette:poisson_grille"
     ]
    },
    {
     "id": "raclette",
     "terme": "Raclette",
     "description": "Plat préparé à la cuisine à partir de fromage d'alpage et de patates ; l'un des plats les plus nourrissants.",
     "liens": [
      "cuisine",
      "patate",
      "fromage_d_alpage"
     ],
     "decouverte": [
      "objet:raclette",
      "recette:raclette"
     ]
    },
    {
     "id": "creme_de_marrons",
     "terme": "Crème de marrons",
     "description": "Plat préparé à la cuisine à partir de châtaignes et de miel (ou de sucre, qu'une ancienne partie aurait encore). Les châtaignes viennent des cueilleurs des hameaux, par la calèche.",
     "liens": [
      "cuisine",
      "miel",
      "comptoir",
      "habitants"
     ],
     "decouverte": [
      "objet:creme_marrons",
      "recette:creme_marrons"
     ]
    },
    {
     "id": "tarte_aux_myrtilles",
     "terme": "Tarte aux myrtilles",
     "description": "Plat cuit au four à partir de farine, de myrtilles et de miel (ou de sucre, qu'une ancienne partie aurait encore). Les myrtilles viennent des cueilleurs des hameaux, par la calèche.",
     "liens": [
      "four",
      "farine",
      "miel",
      "comptoir",
      "habitants"
     ],
     "decouverte": [
      "objet:tarte_myrtilles",
      "recette:tarte_myrtilles"
     ]
    },
    {
     "id": "pain_d_epices",
     "terme": "Pain d'épices",
     "description": "Plat cuit au four à partir de farine, de miel et d'herbes de montagne (ou d'épices, qu'une ancienne partie aurait encore).",
     "liens": [
      "four",
      "farine",
      "miel",
      "fromage_d_alpage"
     ],
     "decouverte": [
      "objet:pain_epices",
      "recette:pain_epices"
     ]
    },
    {
     "id": "mayonnaise",
     "terme": "Mayonnaise",
     "description": "Préparation de la cuisine à partir d'œufs de la ferme, qui compte comme un plat.",
     "liens": [
      "cuisine",
      "oeuf"
     ],
     "decouverte": [
      "objet:mayonnaise",
      "recette:mayonnaise"
     ]
    },
    {
     "id": "quenelle_de_poisson",
     "terme": "Quenelle de poisson",
     "description": "Plat préparé à la cuisine à partir de farine et d'un poisson pêché à la canne.",
     "liens": [
      "cuisine",
      "farine",
      "peche"
     ],
     "decouverte": [
      "objet:quenelle_poisson",
      "recette:quenelle_poisson"
     ]
    }
   ]
  },
  {
   "id": "outils",
   "icone": "🛠️",
   "nom": "Outils & matériaux",
   "entrees": [
    {
     "id": "outils",
     "terme": "Outils",
     "description": "Les outils se fabriquent une fois chacun à l'Atelier (onglet Outils) : la houe, la hache, la pioche et la faux avec du bois, de la pierre et de la fibre, la canne à pêche avec du bois, de la fibre et une pierre, et le triporteur avec des lingots, des planches et de la fibre. On choisit celui qu'on tient dans la barre d'outils de la carte, puis on touche l'herbe, un arbre, un rocher, une touffe d'herbe haute, un minerai ou l'eau. Un appui maintenu sur le personnage qui tient un outil donne un coup fort : il tremble puis frappe quand on relâche ; la hache ou la pioche comptent 2 coups, la faux tournoie et fauche toute l'herbe haute autour de lui, la houe laboure les tuiles autour de lui. Chaque geste coûte de l'énergie et rapporte de l'XP. La branche Outils de l'Arbre des technologies les rend plus efficaces : moins de coups, plus de bois, de pierre, de minerai et de poisson, moins d'énergie.",
     "liens": [
      "houe",
      "hache",
      "pioche",
      "faux",
      "canne_a_peche",
      "atelier"
     ],
     "decouverte": [
      "outil:houe",
      "outil:hache",
      "outil:faux",
      "outil:pioche",
      "outil:canne",
      "didacticiel:faux"
     ]
    },
    {
     "id": "houe",
     "terme": "Houe",
     "description": "Outil fabriqué une seule fois à l'Atelier, avec du bois, une pierre et de la fibre. Houe en main (barre d'outils de la carte), un appui sur une tuile d'herbe de la carte la laboure (5 énergie, 10 XP) et un appui sur une terre vide la rebouche, gratuitement. La terre déborde en bordure mi-herbe mi-terre sur les 8 tuiles autour : si l'une d'elles ne peut pas la porter (chemin, eau, pierre, arbre, ou une seule tuile d'herbe prise entre deux terres), la houe refuse et dit pourquoi, comme sur un chemin ou aux abords d'un bâtiment.",
     "liens": [
      "outils",
      "potager",
      "tuiles_de_terre",
      "energie_personnage"
     ],
     "decouverte": [
      "outil:houe"
     ]
    },
    {
     "id": "hache",
     "terme": "Hache",
     "description": "Outil fabriqué une fois à l'Atelier. Hache en main, un appui sur un arbre de la ferme donne un coup : 3 énergie et 1 bois. L'arbre tombe au 3e coup. Sur la ferme, il laisse sa graine (une pomme de pin pour un sapin, un gland pour un autre arbre) et ne repousse pas : on replante sa graine où l'on veut. Dans le grand monde, il repousse de lui-même 5 à 8 jours plus tard, si l'on est passé par là. Les buissons de la ferme tombent d'un coup, avec leurs baies.",
     "liens": [
      "graines_d_arbre",
      "bois_et_pierre",
      "buissons",
      "recolte_du_monde"
     ],
     "decouverte": [
      "outil:hache"
     ]
    },
    {
     "id": "faux",
     "terme": "Faux",
     "description": "Outil fabriqué une fois à l'Atelier. Faux en main, un appui sur une touffe d'herbe haute de la carte la fauche : 3 énergie et 1 fibre qui tombe au sol. La touffe repousse 2 à 4 jours plus tard. C'est la seule façon d'avoir de la fibre, et donc de la paille (la botteleuse).",
     "liens": [
      "outils",
      "fibre",
      "botteleuse",
      "paille"
     ],
     "decouverte": [
      "outil:faux"
     ]
    },
    {
     "id": "pioche",
     "terme": "Pioche",
     "description": "Outil fabriqué une fois à l'Atelier. Pioche en main, un appui sur un rocher donne un coup : 3 énergie et 1 pierre. Le rocher se casse au 3e coup et revient 1 à 3 jours plus tard. Dans le grand monde, elle casse aussi les rochers, les gros blocs et les éboulis de la montagne. Un caillou (un rocher d'une seule case) se ramasse aussi à la main, sans pioche : un appui dessus, et 1 pierre va dans l'inventaire. Dans la grotte, elle prend aussi le minerai dans les murs.",
     "liens": [
      "outils",
      "bois_et_pierre",
      "grotte",
      "minerai",
      "recolte_du_monde"
     ],
     "decouverte": [
      "outil:pioche"
     ]
    },
    {
     "id": "canne_a_peche",
     "terme": "Canne à pêche",
     "description": "Outil fabriqué une fois à l'Atelier (du bois, des fibres pour la ligne, une pierre). Canne en main, un appui sur l'eau lance la ligne (4 énergie) : dans l'étang ou la mare de la ferme, dans un lac, une rivière ou la mer du grand monde. Il arrive que rien ne morde.",
     "liens": [
      "outils",
      "peche"
     ],
     "decouverte": [
      "outil:canne"
     ]
    },
    {
     "id": "bois_et_pierre",
     "terme": "Bois et pierre",
     "description": "Ressources de la carte : le bois tombe des arbres coupés à la hache, la pierre des rochers cassés à la pioche ; sur la ferme, on ramasse aussi à la main des petites pierres et des morceaux de bois. Ils ne périment pas et se vendent à la calèche, mais servent surtout à l'Atelier (planches, murs, outils…) et à payer les technologies de l'Arbre des technologies ; le bois sert aussi au Four pour fondre les lingots.",
     "liens": [
      "ramassage",
      "atelier",
      "arbre_technologique"
     ],
     "decouverte": [
      "objet:bois",
      "objet:pierre"
     ]
    },
    {
     "id": "minerai",
     "terme": "Minerai",
     "description": "Fer, cuivre, or et platine, pris à la pioche dans les murs de la mine (la grotte) : le fer est partout, les autres de plus en plus rares et profonds. Les grottes de la montagne en ont davantage, l'or et le platine dès les premiers niveaux, et des pierres (quartz, améthyste). Le minerai va dans l'inventaire ; c'est un matériau, qui ne se mange pas et ne se vend pas. Au Four, 4 minerais et du bois font un lingot.",
     "liens": [
      "grotte",
      "grotte_montagne",
      "pioche",
      "lingot",
      "four"
     ],
     "decouverte": [
      "objet:minerai_fer",
      "objet:minerai_cuivre",
      "objet:minerai_or",
      "objet:minerai_platine"
     ]
    },
    {
     "id": "lingot",
     "terme": "Lingot",
     "description": "Lingot de fer, de cuivre, d'or ou de platine, fondu au Four à partir de 4 minerais et de bois (le fer en premier : 20 secondes). Matériau invendable, il paie, avec le bois et la pierre, la plupart des technologies à partir du palier 2 de l'Arbre des technologies.",
     "liens": [
      "minerai",
      "four",
      "arbre_technologique",
      "bois_et_pierre"
     ],
     "decouverte": [
      "objet:lingot_fer",
      "objet:lingot_cuivre",
      "objet:lingot_or",
      "objet:lingot_platine"
     ]
    }
   ]
  },
  {
   "id": "commerce",
   "icone": "🏪",
   "nom": "Commerce",
   "entrees": [
    {
     "id": "comptoir",
     "terme": "La calèche",
     "description": "Le commerce de la ferme et du pays : un cheval attelé à une voiture couverte, son cocher, et une lanterne la nuit. Chaque jour, elle fait le tour du monde par les chemins, de hameau en hameau, et passe à la ferme vers 10 h, où elle se gare une heure devant l'entrée, au bout du chemin de la ferme ; sur la place de chaque hameau, elle s'arrête une demi-heure, et le soir elle dort dans l'un d'eux. Quand elle approche, une icône au bord de l'écran montre où elle est ; sur un chemin, quand elle passe tout près, on la hèle (un appui sur elle, ou le bouton « Héler ») et elle s'arrête un moment. Elle commerce avec toi à partir du niveau 3. Arrêtée à côté de toi, elle achète tout ce qui se vend, au prix de vente, et vend les semences (en dépannage : leur prix monte à chaque achat) et ce qu'elle a acheté en chemin à la réserve des hameaux — bois, poisson, pierre, minerai, lait, laine, baies, champignons, châtaignes, myrtilles… —, en quantité limitée, à 150 % de leur prix de vente ; l'argent de ces achats va aux familles des hameaux. Rien d'autre : les outils, les animaux, le cheval, les ruches et les meubles se fabriquent à l'Atelier. Les minerais et les lingots ne se vendent pas. Sa fenêtre, dans le menu, dit où elle est et quand elle passe à la ferme.",
     "liens": [
      "coefficient_dachat",
      "hameaux",
      "habitants",
      "graines",
      "meubles",
      "verger",
      "chemins_et_gues",
      "atelier"
     ],
     "decouverte": [
      "onglet:comptoir"
     ]
    },
    {
     "id": "coefficient_dachat",
     "terme": "Coefficient d'achat",
     "description": "Multiplicateur appliqué au prix de vente d'un objet pour déterminer son prix d'achat à la calèche (les semences). Il augmente à chaque achat et diminue à chaque vente, sans jamais descendre sous un plancher minimal.",
     "liens": [
      "comptoir"
     ],
     "decouverte": [
      "onglet:comptoir"
     ]
    },
    {
     "id": "commerce",
     "terme": "Les ateliers des hameaux",
     "description": "Les ateliers des hameaux : à Bois-Joli, la scierie (2 bois → 3 planches, prêtes le lendemain) et l'ébéniste, qui vend les meubles ; aux Genêts, le métier à tisser (2 laines → 1 tissu) et la couture (gants, manteau chaud, salopette, dans ce tissu), et les tapis. On leur passe commande par le cocher, à la calèche (l'onglet Commandes), une fois le hameau connu : il porte ce qu'il faut, et rapporte la commande à son passage suivant ; l'argent va aux familles du hameau. Au niveau 10, la ferme accueille la veillée de pleine lune : les voisins viennent, de 19 h à 22 h, et chaque hameau t'en sait gré.",
     "liens": [
      "mouton",
      "comptoir",
      "meubles"
     ],
     "decouverte": [
      "hameau"
     ]
    }
   ]
  },
  {
   "id": "mine",
   "icone": "🏙️",
   "nom": "Mine & pêche",
   "entrees": [
    {
     "id": "grotte",
     "terme": "Grotte",
     "description": "Sous la ferme, par l'entrée de la mine (un tas de terre et sa porte sombre, caché dans les bois : on ressort par elle) : des niveaux tirés au hasard chaque jour, de plus en plus profonds. On descend par le puits, on remonte par l'échelle ; il fait noir, on n'y voit qu'autour de soi. La pioche en main, on y prend le minerai des murs : du fer partout, du cuivre, de l'or et du platine plus bas. La montagne du grand monde a ses propres grottes, plus riches.",
     "liens": [
      "minerai",
      "pioche",
      "lingot",
      "grotte_montagne"
     ],
     "decouverte": [
      "carte:grotte",
      "objet:minerai_fer"
     ]
    },
    {
     "id": "peche",
     "terme": "Pêche et poissons",
     "description": "À la canne : truite et brochet dans l'étang (6 prises par jour au plus) et la mare (3) de la ferme. Dans le grand monde, on pêche au bord de toute eau, avec le même geste : l'omble chevalier et la truite dans les lacs (4 prises par jour, tous les lacs ensemble), la truite et le goujon dans les rivières (5), la dorade, la sardine et l'anchois en mer (8). Les coins de pêche (un ponton, ou des piquets et une nasse ; des remous sur l'eau) sont de meilleurs coins : plus de touches, un poisson plus rare (le brochet au lac, le saumon en rivière, le bar en mer) et leurs propres prises du jour (8 au lac, 8 en rivière, 12 en mer, pour chaque coin). Chaque lancer coûte 4 énergie. Le poisson frais se garde 2 nuits : il se mange, se vend ou se cuisine (poisson grillé à l'ail, quenelle de poisson).",
     "liens": [
      "canne_a_peche",
      "poisson_grille",
      "quenelle_de_poisson"
     ],
     "decouverte": [
      "outil:canne",
      "objet:truite",
      "objet:brochet",
      "objet:omble",
      "objet:goujon",
      "objet:dorade"
     ],
     "icones": [
      "🐟‍🌈",
      "🐟‍🦷",
      "🐟‍❄",
      "🐟‍⭐",
      "🐟‍🌊",
      "🐟‍💧",
      "🐟‍🪨",
      "🐟‍🔶",
      "🐟‍🌀"
     ]
    },
    {
     "id": "grotte_montagne",
     "terme": "Grottes de la montagne",
     "description": "Au pied de la montagne du grand monde, des bouches de roche s'ouvrent dans la pente : chacune mène à sa grotte (on y entre en touchant sa bouche, ou en s'y poussant juste devant). Ce sont des niveaux de grotte comme ceux de la mine (le même jour, la même grotte ; un autre jour, une autre), 5 niveaux de profondeur, mais plus riches : plus de minerai dans les murs, l'or et le platine dès les premiers niveaux, des cristaux de quartz et des améthystes à piocher, et dans chacune un filon (du cuivre, de l'or, du platine, du quartz ou de l'améthyste en abondance). En remontant l'échelle du premier niveau, on ressort devant l'entrée, dans le monde, au même jour et à la même heure.",
     "liens": [
      "grotte",
      "minerai",
      "pioche"
     ],
     "decouverte": [
      "carte:grotte_monde",
      "objet:quartz",
      "objet:amethyste"
     ]
    }
   ]
  },
  {
   "id": "faune",
   "icone": "🦌",
   "nom": "La faune du grand monde",
   "entrees": [
    {
     "id": "faune_du_monde",
     "terme": "La faune du grand monde",
     "description": "Chaque biome du grand monde a ses bêtes : marmottes, bouquetins et aigles dans la montagne, mouettes, crabes et dauphins sur la côte et au large, canards et cygnes sur les lacs et le marais, chevreuils, renards, lapins et écureuils dans la forêt, lièvres et perdrix sur la lande. Elles vivent leur vie autour de leur coin, fuient quand on s'approche (chacune à sa façon : elle court, s'envole, nage plus loin ou se cache dans son terrier), dorment ou se cachent la nuit. On ne les chasse pas : on les regarde. La page de chaque bête se découvre la première fois qu'on en voit une ; un appui sur une bête dit son nom et ouvre sa page. Rien de tout cela sur la ferme.",
     "liens": [
      "faune_marmotte",
      "faune_bouquetin",
      "faune_aigle",
      "faune_mouette",
      "faune_crabe",
      "faune_dauphin",
      "faune_canard",
      "faune_cygne",
      "faune_chevreuil",
      "faune_renard",
      "faune_lapin",
      "faune_ecureuil",
      "faune_lievre",
      "faune_perdrix"
     ],
     "decouverte": [
      "faune:marmotte",
      "faune:bouquetin",
      "faune:aigle",
      "faune:mouette",
      "faune:crabe",
      "faune:dauphin",
      "faune:canard",
      "faune:cygne",
      "faune:chevreuil",
      "faune:renard",
      "faune:lapin",
      "faune:ecureuil",
      "faune:lievre",
      "faune:perdrix"
     ]
    },
    {
     "id": "faune_marmotte",
     "terme": "Marmotte",
     "description": "Elle vit en colonie sur les pentes de la montagne, entre les éboulis : assise sur ses pattes arrière, elle guette. Le personnage approche, elle détale et plonge dans son terrier ; elle en ressort un moment plus tard, quand tout est calme. La nuit, elle dort sous terre. On ne la chasse pas : on la regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:marmotte"
     ],
     "visuels": [
      {
       "image": "faune_marmotte.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 64,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_bouquetin",
     "terme": "Bouquetin",
     "description": "Le bouquetin des Alpes, ses grandes cornes annelées : il broute haut dans la montagne, près des sommets, seul ou en petite harde. Il s'écarte d'un pas sûr quand on s'approche, sans se presser. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:bouquetin"
     ],
     "visuels": [
      {
       "image": "faune_bouquetin.png",
       "w": 32,
       "h": 32,
       "x": 0,
       "l": 192,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_aigle",
     "terme": "Aigle royal",
     "description": "Il tourne en grands cercles au-dessus des sommets, porté par l'air chaud ; son ombre court sur les rochers. On le regarde, on ne l'approche pas. La nuit, il a regagné son aire. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:aigle"
     ],
     "visuels": [
      {
       "image": "faune_aigle.png",
       "w": 32,
       "h": 32,
       "x": 0,
       "l": 64,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_mouette",
     "terme": "Mouette",
     "description": "Sur la plage, au bord de l'eau, elles se tiennent à plusieurs, le bec au vent. Quand on arrive, elles s'envolent toutes et vont se poser plus loin, puis reviennent. On ne la chasse pas : on la regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:mouette"
     ],
     "visuels": [
      {
       "image": "faune_mouette.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 64,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_crabe",
     "terme": "Crabe",
     "description": "Il trotte de côté sur le sable mouillé, près des vagues. Une ombre, un pas : il file et s'enfouit dans le sable, d'où il ressort plus tard. La nuit, on ne le voit pas. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:crabe"
     ],
     "visuels": [
      {
       "image": "faune_crabe.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 32,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_dauphin",
     "terme": "Dauphin",
     "description": "Au large, loin du rivage, un dauphin saute hors de l'eau de temps en temps, et retombe dans une gerbe d'écume. Il faut savoir regarder la mer un moment. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:dauphin"
     ],
     "visuels": [
      {
       "image": "faune_dauphin.png",
       "w": 32,
       "h": 32,
       "x": 32,
       "l": 160,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_canard",
     "terme": "Canard colvert",
     "description": "Le mâle à la tête verte, la cane toute brune : ils nagent par petits groupes sur les lacs et l'eau basse du marais, et plongent la tête sous l'eau pour manger. On approche, ils s'éloignent en nageant. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:canard"
     ],
     "visuels": [
      {
       "image": "faune_canard.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 256,
       "hh": 16
      },
      {
       "image": "faune_canard.png",
       "w": 16,
       "h": 16,
       "x": 128,
       "l": 256,
       "hh": 16
      },
      {
       "image": "faune_canard.png",
       "w": 16,
       "h": 16,
       "x": 64,
       "l": 256,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_cygne",
     "terme": "Cygne",
     "description": "Grand et blanc, le cou en S : il glisse lentement sur les lacs, plonge le cou dans l'eau, et s'écarte sans hâte quand on vient au bord. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:cygne"
     ],
     "visuels": [
      {
       "image": "faune_cygne.png",
       "w": 32,
       "h": 32,
       "x": 0,
       "l": 128,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_chevreuil",
     "terme": "Chevreuil",
     "description": "Le chevreuil de nos forêts, sa robe fauve et son miroir blanc : il broute dans les clairières et les sous-bois. Au moindre bruit, il bondit et s'enfuit entre les arbres. La nuit, il se couche dans les fourrés. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:chevreuil"
     ],
     "visuels": [
      {
       "image": "faune_chevreuil.png",
       "w": 32,
       "h": 32,
       "x": 0,
       "l": 192,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_renard",
     "terme": "Renard roux",
     "description": "Roux, la gorge blanche et la queue en panache, il rôde seul à la lisière des bois et sur la lande, assis à guetter ou trottant le nez au sol. Il garde ses distances : on approche, il file. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:renard"
     ],
     "visuels": [
      {
       "image": "faune_renard.png",
       "w": 32,
       "h": 32,
       "x": 0,
       "l": 192,
       "hh": 32
      }
     ]
    },
    {
     "id": "faune_lapin",
     "terme": "Lapin de garenne",
     "description": "Dans les prés au bord des bois et en forêt, il grignote, assis, les oreilles dressées. Le personnage approche : quelques bonds, et il disparaît dans son terrier, pour en ressortir quand tout est calme. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:lapin"
     ],
     "visuels": [
      {
       "image": "faune_lapin.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 64,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_ecureuil",
     "terme": "Écureuil roux",
     "description": "Il descend au pied des arbres de la forêt chercher des noisettes, la queue en panache relevée. Surpris, il file et grimpe se cacher dans les branches. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:ecureuil"
     ],
     "visuels": [
      {
       "image": "faune_ecureuil.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 64,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_lievre",
     "terme": "Lièvre",
     "description": "Plus grand que le lapin, fauve, de très longues oreilles au bout noir : il vit à découvert sur la lande. Il compte sur sa vitesse : on approche, il détale en zigzag. On ne le chasse pas : on le regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:lievre"
     ],
     "visuels": [
      {
       "image": "faune_lievre.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 64,
       "hh": 16
      }
     ]
    },
    {
     "id": "faune_perdrix",
     "terme": "Perdrix grise",
     "description": "Ronde, la face orangée : elles picorent en petite compagnie dans la bruyère de la lande, et s'envolent toutes ensemble dans un bruit d'ailes quand on arrive trop près. On ne la chasse pas : on la regarde, et un appui dessus dit son nom.",
     "liens": [
      "faune_du_monde"
     ],
     "decouverte": [
      "faune:perdrix"
     ],
     "visuels": [
      {
       "image": "faune_perdrix.png",
       "w": 16,
       "h": 16,
       "x": 0,
       "l": 96,
       "hh": 16
      }
     ]
    }
   ]
  },
  {
   "id": "hameaux",
   "icone": "🏘️",
   "nom": "Les hameaux du grand monde",
   "entrees": [
    {
     "id": "hameaux",
     "terme": "Les hameaux",
     "description": "Les chemins du grand monde relient les hameaux, de petits villages de trois à sept maisons bâties des mêmes blocs que la maison de la ferme : des murs, des portes, des fenêtres, des planchers, un toit. Chacun a sa place de terre battue ou de pavés, son puits, son banc et un panneau à son nom ; des ruelles mènent aux portes ; des potagers et des vergers clôturés, des tas de bois, un poulailler et le lieu de travail de son métier : le billot du bûcheron, la barque et les filets du pêcheur, le wagonnet du mineur, l'enclos du berger, la claie du cueilleur. Le pays les façonne : de la pierre et de l'ardoise dans la montagne, de la pierre blanche et des tuiles sur la côte, du bois et du chaume en forêt et sur la lande, du bois et des roseaux au bord du marais. On s'y promène, on entre dans les maisons (le toit s'efface), on touche le panneau pour lire son nom ; la nuit, les fenêtres s'éclairent, et la fumée monte des cheminées. On n'y bâtit pas, on n'y laboure pas, on n'y casse rien et on n'y coupe pas les arbres des jardins : tout est aux habitants, qui y vivent leurs journées. Le premier passage dans un hameau l'annonce et l'inscrit sur cette page.",
     "liens": [
      "habitants",
      "faune_du_monde",
      "metiers",
      "chemins_et_gues"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "habitants",
     "terme": "Les habitants",
     "description": "Chaque maison d'un hameau abrite une famille : un ou deux adultes et quelques enfants, jamais plus que de lits. Le premier adulte fait le métier du hameau — bûcheron, pêcheur, mineur, berger ou cueilleur —, le second le même, un autre, ou il tient le jardin. Ils vivent leurs journées comme la tienne : levés à six heures et demie, les adultes partent au travail (le bûcheron fend au billot et abat les arbres alentour, qui repoussent comme les autres ; le pêcheur pêche depuis la rive ; le mineur pioche devant l'entrée d'une grotte ou au tas de minerai ; le berger soigne ses moutons dans l'enclos ; le cueilleur fait le tour des jardins), les enfants jouent sur la place ; à midi et le soir, tout le monde rentre manger, et la nuit chacun dort dans son lit. Touche un habitant : il s'arrête et te dit son prénom, son métier et un mot selon l'heure et son humeur. Chaque nuit, même loin de toi, chaque famille vit sa journée : son métier produit, son jardin et le poulailler donnent, elle cuisine les plats qu'elle connaît et mange à sa faim (ou non : son bonheur suit les mêmes règles que celui de ta famille) ; ce qui reste va à la réserve du hameau. Le panneau de la place ouvre la fiche du hameau : ses familles, leur bonheur et leur bourse, et sa réserve, qui grandit nuit après nuit. La calèche l'achète à chacun de ses passages (ce qu'elle a pris la dernière fois est dans la fiche), et l'argent va aux bourses des familles.",
     "liens": [
      "hameaux",
      "bonheur",
      "metiers",
      "comptoir"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "metiers",
     "terme": "Les métiers des hameaux",
     "description": "Chaque hameau a son métier, que le pays lui donne : mineur près d'une grotte de la montagne, pêcheur au bord de l'eau, bûcheron à la lisière d'une forêt, berger sur la lande, cueilleur ailleurs. Le bûcheron fend au billot et abat des arbres alentour (du bois, parfois une pomme de pin) ; le pêcheur pêche depuis la rive le poisson de son eau (sardines, anchois, dorades et bars en mer, truites, ombles et brochets au lac, truites, goujons et saumons en rivière) ; le mineur pioche devant l'entrée d'une grotte ou à son tas de minerai (de la pierre, parfois du fer, du cuivre, du quartz) ; le berger soigne ses moutons (du lait, parfois de la laine) ; le cueilleur rapporte des baies, des champignons, des mûres, des myrtilles et des châtaignes. Le jardinier, lui, tient le potager du foyer. Ce que les familles ne mangent pas va à la réserve du hameau, que la calèche achète et revend : c'est par elle que la ferme a les produits qu'elle ne fait pas.",
     "liens": [
      "habitants",
      "hameaux",
      "comptoir",
      "grotte_montagne",
      "peche"
     ],
     "decouverte": [
      "hameau"
     ]
    }
   ]
  },
  {
   "id": "ile",
   "icone": "🌙",
   "nom": "L'île de Céron",
   "entrees": [
    {
     "id": "ceron",
     "terme": "Céron",
     "description": "La petite île de l'archipel des Terres Lointaines, où ta famille s'installe : un massif volcanique au nord et à l'ouest, la mer au sud et à l'est, la terre de ton grand-père au milieu. Les premiers arrivants l'ont peuplée il y a cinq siècles ; leurs descendants y vivent près de la nature, sans rien faire venir d'ailleurs, et avec des usages : on ne ferme pas sa porte, on ne coupe pas un arbre sans en replanter un, personne ne chasse, on veille les soirs de pleine lune.",
     "liens": [
      "cadolon",
      "calendrier_lune",
      "hameaux",
      "maurice"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "cadolon",
     "terme": "Cadolon",
     "description": "La grande île, d'où vient ta famille : une escale entre deux continents, ses quais, ses machines, son bruit. Un bac la relie à Céron, depuis la cale des Mouettes, pour les passagers, le courrier et les petits colis. Ici, on dit « ceux d'en face » pour ses habitants ; beaucoup d'enfants de Céron y sont partis, quelques anciens en sont revenus.",
     "liens": [
      "ceron",
      "cale_bac",
      "adele"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "calendrier_lune",
     "terme": "Le calendrier de lune",
     "description": "Céron suit le calendrier des premiers arrivants : douze mois de quatorze jours, de Solaria à Silentia, et les phases de la lune. Chacune a sa coutume : quand la lune monte, on sème (« ce qui monte avec la lune pousse avec elle ») ; à la pleine lune, on récolte et l'on veille ; quand elle descend, on économise l'eau et l'on répare ; aux nuits noires, la terre se repose, on raconte et l'on ne sème rien.",
     "liens": [
      "ceron",
      "veillee_lune"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "maurice",
     "terme": "Maurice",
     "description": "Ton grand-père, mort il y a un an. Né à Céron, parti enfant, revenu veuf avec ta mère, il a mené la calèche de l'île pendant trente-cinq ans. Il gagnait bien et ne gardait rien : les toits, les scies, les pompes des hameaux, c'est lui qui les payait. On parle encore de lui partout, et de toi comme de son petit. Il a laissé des carnets de tournée un peu partout.",
     "liens": [
      "achille",
      "maison_maurice",
      "carnet",
      "promesses"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "adele",
     "terme": "Adèle",
     "description": "Ta mère. Élevée à Céron par Maurice, partie à Cadolon adolescente, elle y vit toujours. Elle ne viendra pas sur l'île : elle écrit. Ses lettres arrivent par le bac, aux moments qui comptent, et parlent des petites choses de l'île ; ses « au fait » ramènent toujours un souvenir.",
     "liens": [
      "courrier",
      "maurice",
      "cadolon"
     ],
     "decouverte": [
      "courrier"
     ]
    },
    {
     "id": "achille",
     "terme": "Achille",
     "description": "Le cocher de l'île depuis que Maurice a arrêté. Né aux Mouettes, il vit au Gué, à l'écurie de la calèche. Bourru, ponctuel, il parle à son cheval plus qu'aux gens et sait tout ce qui se dit d'un hameau à l'autre. Il passe à la ferme chaque jour vers dix heures, achète ce que tu as en trop, porte ce que tu confies. Il garde deux carnets de Maurice.",
     "liens": [
      "comptoir",
      "le_gue",
      "maurice",
      "promesses"
     ],
     "decouverte": [
      "fait:achille.cle"
     ]
    },
    {
     "id": "odile",
     "terme": "Odile",
     "description": "L'ancienne du Gué, voisine de Maurice depuis toujours ; elle a vu grandir ta mère. Elle tient aux coutumes et à la lune, commence volontiers ses phrases par « On ne… », et vouvoie les nouveaux jusqu'à leur première veillée de pleine lune. Elle voudrait voir la maison de Maurice revivre.",
     "liens": [
      "le_gue",
      "maison_maurice",
      "veillee_lune",
      "calendrier_lune"
     ],
     "decouverte": [
      "fait:odile.rencontre"
     ]
    },
    {
     "id": "fernand",
     "terme": "Fernand",
     "description": "L'ancien des Mouettes, revenu sur l'île après quarante ans de mécanique au port de Cadolon. Il veut pêcher en paix et compare tout à « là-bas ». Il a accueilli ta famille sur la cale, le jour du bac.",
     "liens": [
      "les_mouettes",
      "cale_bac",
      "cadolon"
     ],
     "decouverte": [
      "fait:arrivee"
     ]
    },
    {
     "id": "frida",
     "terme": "Frida",
     "description": "La scientifique de l'île, venue il y a cinquante ans observer les bêtes et les plantes, et restée. Elle s'est occupée de ta mère toute petite. Elle fabrique le robot, sa station et les automatisations, dans son atelier au bord de l'eau ; les anciens l'ont adoptée, ses machines beaucoup moins. Elle a toujours un chiffre à donner.",
     "liens": [
      "atelier_frida",
      "robot",
      "automatisation"
     ],
     "decouverte": [
      "fait:frida.rencontre"
     ]
    },
    {
     "id": "basile",
     "terme": "Basile",
     "description": "Le scieur et ébéniste de Bois-Joli : la scierie, les meubles de l'île. Il parle du bois comme d'une personne et tient au bois juste : on replante ce qu'on coupe. Il voudrait que son fils Théo reprenne l'atelier.",
     "liens": [
      "bois_joli",
      "theo",
      "commerce"
     ],
     "decouverte": [
      "fait:visite.bois_joli"
     ]
    },
    {
     "id": "theo",
     "terme": "Théo",
     "description": "Le fils de Basile, quinze ans, le meilleur de l'île pour réparer une roue ou une pompe. Il rêve de Cadolon et de machines, et passe ses journées chez Frida en cachette. Ce qu'il deviendra dépend un peu de ce que l'île lui offre.",
     "liens": [
      "basile",
      "bois_joli",
      "frida"
     ],
     "decouverte": [
      "fait:theo.rencontre"
     ]
    },
    {
     "id": "garance",
     "terme": "Garance",
     "description": "La tisserande et bergère des Genêts. Franche, juste, attachée au fait main, elle juge d'un mot. Maurice lui avait promis un toit avant les pluies ; son métier à tisser fait le tissu de l'île.",
     "liens": [
      "les_genets",
      "promesses",
      "commerce"
     ],
     "decouverte": [
      "fait:visite.genets",
      "fait:promesse.toit_garance.commencee"
     ]
    },
    {
     "id": "johnny",
     "terme": "Johnny",
     "description": "Un vieil homme qui vit seul dans une cabane, au fond de la forêt, sans lampe. Il accueille tout le monde comme la première fois, et parle de la lune, de la roche, des marées. Quelqu'un lui apportait à manger, avant.",
     "liens": [
      "cabane_johnny"
     ],
     "decouverte": [
      "fait:johnny.visite"
     ]
    },
    {
     "id": "le_gue",
     "terme": "Le Gué",
     "description": "Le hameau le plus proche de la ferme, au croisement des chemins : celui de Maurice, d'Odile et d'Achille, qui y a l'écurie de la calèche. On y veille les soirs de pleine lune. Au Gué, on ne ferme pas sa porte.",
     "liens": [
      "odile",
      "achille",
      "maison_maurice",
      "veillee_lune"
     ],
     "decouverte": [
      "fait:visite.gue",
      "fait:achille.cle"
     ]
    },
    {
     "id": "maison_maurice",
     "terme": "La maison de Maurice",
     "description": "Sa maison d'enfance, au Gué : la première du hameau, vide depuis sa mort, jamais fermée. Il n'y a rien à prendre : il donnait tout. Odile y passe quand elle peut.",
     "liens": [
      "maurice",
      "le_gue",
      "odile",
      "carnet"
     ],
     "decouverte": [
      "fait:odile.rencontre"
     ]
    },
    {
     "id": "les_mouettes",
     "terme": "Les Mouettes",
     "description": "Le hameau des pêcheurs, sur la côte : les barques, les filets, et la cale du bac. C'est la seule porte de Céron vers l'extérieur : on y arrive, on y reçoit le courrier. Fernand y pêche.",
     "liens": [
      "fernand",
      "cale_bac",
      "peche"
     ],
     "decouverte": [
      "fait:visite.mouettes",
      "fait:lieu.cale"
     ]
    },
    {
     "id": "brumeval",
     "terme": "Brumeval",
     "description": "Le hameau de la montagne volcanique : des mineurs, des sources chaudes, l'île ancienne. C'est là qu'a lieu, une fois l'an, la fête des premiers arrivants.",
     "liens": [
      "fete_premiers",
      "grotte_montagne"
     ],
     "decouverte": [
      "fait:visite.brumeval",
      "fait:fete.annonce"
     ]
    },
    {
     "id": "bois_joli",
     "terme": "Bois-Joli",
     "description": "Le hameau de la forêt : des bûcherons, la scierie et l'atelier d'ébéniste de Basile, qui vend les meubles de l'île. On y parle beaucoup de rester ou de partir.",
     "liens": [
      "basile",
      "theo",
      "commerce"
     ],
     "decouverte": [
      "fait:visite.bois_joli"
     ]
    },
    {
     "id": "les_genets",
     "terme": "Les Genêts",
     "description": "Le hameau de la lande : des bergers, la bergerie, le métier à tisser et la couture de Garance. Le plus attaché aux façons anciennes.",
     "liens": [
      "garance",
      "commerce"
     ],
     "decouverte": [
      "fait:visite.genets"
     ]
    },
    {
     "id": "cale_bac",
     "terme": "La cale du bac",
     "description": "Une jetée de pierre, aux Mouettes, où le bac de Cadolon accoste : c'est par là que ta famille est arrivée. On peut marcher jusqu'au bout et regarder le bac amarré.",
     "liens": [
      "les_mouettes",
      "cadolon",
      "fernand"
     ],
     "decouverte": [
      "fait:lieu.cale"
     ]
    },
    {
     "id": "epave",
     "terme": "L'épave",
     "description": "Une vieille coque couchée sur une plage, le mât cassé, loin des hameaux. Personne n'y touche. Fernand dit qu'elle ne sort d'aucun chantier qu'il connaisse.",
     "liens": [
      "les_mouettes"
     ],
     "decouverte": [
      "fait:lieu.epave"
     ]
    },
    {
     "id": "cabane_johnny",
     "terme": "La cabane de la forêt",
     "description": "Une cabane de rondins au fond de la forêt, loin des chemins, sans électricité : celle de Johnny.",
     "liens": [
      "johnny"
     ],
     "decouverte": [
      "fait:lieu.cabane"
     ]
    },
    {
     "id": "atelier_frida",
     "terme": "L'atelier de Frida",
     "description": "Une bâtisse au bord de l'eau, entre deux hameaux, pleine d'outils et de pièces de métal : on y sent l'huile. Frida y fabrique ses machines.",
     "liens": [
      "frida",
      "robot"
     ],
     "decouverte": [
      "fait:lieu.atelier"
     ]
    },
    {
     "id": "carnet",
     "terme": "Le carnet",
     "description": "Ton carnet, dans le menu : les pages que tu as trouvées, dans l'ordre où elles sont venues. Des carnets de tournée de Maurice, des notes, des bribes ; rien n'y dit ce qu'il faut en faire.",
     "liens": [
      "maurice",
      "promesses"
     ],
     "decouverte": [
      "fait:odile.rencontre"
     ]
    },
    {
     "id": "promesses",
     "terme": "Les promesses de Maurice",
     "description": "Son carnet de tournée en garde trois qu'il n'a pas pu tenir : le toit de Garance, les lames de la scie de Bois-Joli, la pompe des Mouettes. Personne ne te les demande. Si tu veux les tenir, confie à Achille, à la calèche, ce qu'il faut, en une ou plusieurs fois : il les porte, comme Maurice faisait. Une promesse tenue, l'île s'en souvient.",
     "liens": [
      "achille",
      "comptoir",
      "garance",
      "basile",
      "fernand"
     ],
     "decouverte": [
      "fait:odile.rencontre"
     ]
    },
    {
     "id": "veillee_lune",
     "terme": "La veillée de pleine lune",
     "description": "Les soirs de pleine lune, de 19 h à 22 h, l'île veille ensemble : au Gué d'abord, puis, une fois que tu as ta place, chez toi. On mange, on regarde la lune, on parle de ce qui s'est passé ; on parle aussi de toi. Y être compte.",
     "liens": [
      "le_gue",
      "odile",
      "calendrier_lune"
     ],
     "decouverte": [
      "fait:veillee.1"
     ]
    },
    {
     "id": "fete_premiers",
     "terme": "La fête des premiers arrivants",
     "description": "Une fois l'an, à la pleine lune, à Brumeval : un repas cuit dans la terre chaude, et l'île fête ceux qui sont arrivés les premiers, et ceux qui viennent d'arriver. Achille l'annonce à la calèche. Ce qu'on y dit de toi dépend de ce que tu as fait de ta ferme.",
     "liens": [
      "brumeval",
      "achille"
     ],
     "decouverte": [
      "fait:fete.annonce"
     ]
    },
    {
     "id": "toits",
     "terme": "Les toits des hameaux",
     "description": "Depuis que Maurice ne les paie plus, les maisons s'usent : un toit troué se voit de loin. Sur place, la fiche du hameau dit lesquels prennent l'eau ; avec des planches et des pierres, tu peux les réparer, et le hameau s'en souvient.",
     "liens": [
      "hameaux",
      "maurice"
     ],
     "decouverte": [
      "fait:toits.uses"
     ]
    },
    {
     "id": "enveloppe_maurice",
     "terme": "L'enveloppe de Maurice",
     "description": "Une enveloppe cachetée, retrouvée par le notaire, à ton nom. Maurice a écrit dessus : « Pour les toits de Céron : Odile saura. Ou pour toi, si tu en as plus besoin qu'eux. Tu sauras. » L'ouvrir (sa fiche, dans l'inventaire), c'est la garder ; on peut aussi la porter à Odile.",
     "liens": [
      "maurice",
      "odile",
      "toits"
     ],
     "decouverte": [
      "objet:enveloppe_maurice",
      "fait:enveloppe.ouverte",
      "fait:enveloppe.donnee"
     ]
    },
    {
     "id": "cloche_maurice",
     "terme": "La cloche de Maurice",
     "description": "La cloche de sa calèche. Il la sonnait deux fois devant chaque maison : une pour dire bonjour, une pour dire qu'il repartait.",
     "liens": [
      "maurice",
      "fete_premiers"
     ],
     "decouverte": [
      "objet:cloche_maurice"
     ]
    },
    {
     "id": "tente",
     "terme": "Tente et bivouac",
     "description": "La tente se fabrique à l'Atelier et se porte depuis la fiche du personnage, à côté du sac. Loin de la ferme, la nuit, « Dormir » la plante là où il est : il y dort, son énergie remonte comme dans un lit, et il se réveille au même endroit. Sans tente, il rentre dormir à la ferme. Pendant ce temps, ton compagnon garde la ferme.",
     "liens": [
      "sac_a_provisions",
      "adulte",
      "bouton_dormir"
     ],
     "decouverte": [
      "objet:tente"
     ]
    },
    {
     "id": "lanterne_tempete",
     "terme": "Lanterne-tempête",
     "description": "Une petite lanterne de fer à porter à la main (une case d'équipement), fabriquée à l'Atelier. La nuit, dans le grand monde, on voit un peu plus loin. Et à sa lumière, on remarque ce que le jour cache.",
     "liens": [
      "equipement"
     ],
     "decouverte": [
      "objet:lanterne_tempete"
     ]
    },
    {
     "id": "pierre_lune",
     "terme": "La pierre",
     "description": "Un galet clair, tiède, qui luit faiblement dans le noir. Posé sur la ferme, il y reste. Depuis, tout y pousse plus vite ; les nuits de pleine lune, la ferme luit un peu. Frida dit que c'est peut-être le sol.",
     "liens": [
      "calendrier_lune",
      "frida",
      "johnny"
     ],
     "decouverte": [
      "objet:pierre_lune",
      "fait:pierre.posee"
     ]
    }
   ]
  },
  {
   "id": "mecaniques",
   "icone": "⚙️",
   "nom": "Mécaniques de jeu",
   "entrees": [
    {
     "id": "carte",
     "terme": "Carte de la ferme",
     "description": "Vue principale du jeu : la ferme, une terre sauvage tirée d'une graine au début de la partie, au milieu du grand monde, où l'on marche sans changer de carte. La vue suit ton personnage : le doigt posé puis glissé le fait marcher dans cette direction tant qu'il reste posé (il tourne avec le doigt), et un double appui sur l'herbe ou un chemin l'y envoie. Un appui sur ce qu'on a bâti ouvre sa fenêtre ; un appui sur une parcelle la plante, l'arrose ou la récolte (rien à faire : une bulle dit où elle en est), un appui long ouvre la fenêtre de sa zone ; la houe en main laboure l'herbe touchée, la hache coupe un arbre, la pioche casse un rocher et la canne pêche dans l'eau. Un appui sur une pierre, un morceau de bois, une herbe ou des baies les ramasse. Une pastille rouge signale ce qu'il y a à faire. La carte garde la même apparence toute l'année ; seule sa lumière change avec l'heure.",
     "liens": [
      "terre_sauvage",
      "ramassage",
      "mode_construire",
      "grand_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "grand_monde",
     "terme": "Le grand monde",
     "description": "Une seule carte, vingt fois la ferme : la ferme est posée au milieu, dans une prairie, et le pays s'étend tout autour, fermé par la montagne au nord et à l'ouest, par la mer au sud et à l'est. Les prés entourent la ferme ; plus loin, les forêts profondes (feuillus, bouleaux, sapins, ronciers), les marais (saules, roseaux, eau basse), la lande (bruyère, ajoncs, pins tordus), la montagne et ses éboulis, les sommets enneigés et leurs falaises, la côte et ses plages de sable ou de galets. Des rivières descendent de la montagne à la mer, parfois par un lac. Chaque biome a ses plantes à récolter, ses bêtes, et ses lieux : des hameaux au bout des chemins, des grottes au pied de la montagne, des coins de pêche sur l'eau. Tout est caché sous le brouillard au départ.",
     "liens": [
      "chemins_et_gues",
      "brouillard",
      "carte_du_monde",
      "recolte_du_monde",
      "hameaux",
      "grotte_montagne",
      "peche",
      "faune_du_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "chemins_et_gues",
     "terme": "Chemins et gués",
     "description": "Le chemin de terre de la ferme sort à l'est, et de là partent les chemins du pays : ils relient les hameaux les uns aux autres, en une grande boucle qui fait le tour de la ferme, et la calèche les suit chaque jour. On marche partout sur la terre ferme, mais ni sur la mer, ni sur un lac, ni sur une falaise ou un sommet ; une rivière ne se passe qu'à gué, là où un chemin la croise : trois cases de pierres plates posées sur l'eau. Les arbres, les rochers et les murs ferment leurs cases ; jamais un chemin.",
     "liens": [
      "grand_monde",
      "comptoir",
      "hameaux",
      "boussole"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "brouillard",
     "terme": "Le brouillard",
     "description": "Tout est caché au départ, ta ferme comprise : seuls les alentours de ton personnage sont dégagés. Partout ailleurs, un brouillard blanc couvre le pays, et rien de ce qu'il cache ne se devine — ni les arbres, ni les bêtes, ni les maisons, ni la calèche qui passe derrière. Il se lève autour de toi à mesure que tu marches, et ce que tu as vu le reste. Tu vois plus loin en hauteur, dans la montagne et sur les sommets (18 à 22 cases), et à découvert, sur la lande et la côte (15 cases), qu'au milieu des prés (12 cases) ; bien moins dans la forêt dense (7 cases) et le marais (9 cases), et deux fois moins la nuit. Ce que tu as vu s'inscrit sur la carte du monde.",
     "liens": [
      "carte_du_monde",
      "boussole",
      "hameaux",
      "grand_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "carte_du_monde",
     "terme": "La carte du monde",
     "description": "Elle s'ouvre par le menu (« Carte du monde »), la touche M au clavier ou un appui sur la boussole. Elle montre, en petit, tout ce que tu as vu du grand monde — les prés, les forêts, les marais, la lande, la montagne, la côte, les rivières et les lacs, les chemins, ta ferme — et laisse le reste dans le brouillard. Les lieux que tu as découverts y ont leur icône : les hameaux (avec leur nom une fois que tu y es allé), les entrées de grotte, les coins de pêche ; tu y vois aussi ta position et ta direction, et la calèche quand elle passe dans une partie que tu connais. Fais-la glisser du doigt ou à la souris, zoome à deux doigts, à la molette ou avec les boutons ; touche un lieu pour lire son nom et sa distance, et choisis-le pour que la boussole t'y mène.",
     "liens": [
      "brouillard",
      "boussole",
      "hameaux",
      "comptoir"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "boussole",
     "terme": "La boussole",
     "description": "Une petite boussole de laiton, en haut à droite de l'écran, sous l'horloge : son aiguille rouge montre la ferme, ou le lieu que tu as choisi sur la carte du monde, et dessous s'affichent son nom et sa distance en cases. Sur la ferme, quand aucun lieu n'est choisi, elle se cache. Arrivé au lieu choisi, elle montre de nouveau la ferme. Un appui sur elle ouvre la carte du monde ; les Options la retirent de l'écran.",
     "liens": [
      "carte_du_monde",
      "brouillard"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "horloge",
     "terme": "Horloge",
     "description": "La journée va de 6 h à 22 h, la nuit de 22 h à 6 h ; une heure dure 30 secondes. À 22 h, la famille va se coucher et reste à la maison, et la nuit défile à la même vitesse. La nuit n'empêche pas d'agir : seul le sommeil du personnage bloque les actions. À minuit, la nuit passe (ponte, lait, récolte automatique…) et le jour change ; à 6 h, c'est le réveil. L'horloge s'arrête quand le jeu est fermé.",
     "liens": [
      "repas",
      "bouton_dormir",
      "absence"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "repas",
     "terme": "Boîte à nourriture",
     "description": "Bloc fabriqué à l'Atelier (3 planches) et posé dans une pièce close du foyer. Le joueur la remplit depuis l'Inventaire (un appui sur la boîte) : 6 aliments différents au plus, 10 de chacun. Les membres qui ont faim y mangent, d'abord ce qui périme le plus tôt ; ce qu'elle contient périme comme dans l'Inventaire. Chaque aliment rend sa valeur : son énergie ÷ 5, + 10 %, arrondie au-dessus. Une fois le réfrigérateur posé dans la maison, la boîte revient dans l'Inventaire avec son contenu et la famille mange au frigo.",
     "liens": [
      "apport_journalier",
      "energie_personnage",
      "bonheur",
      "peremption",
      "horloge"
     ],
     "decouverte": [
      "jour:2"
     ]
    },
    {
     "id": "bouton_dormir",
     "terme": "Bouton « Zzz » (Dormir)",
     "description": "Bouton « Zzz », en bas à droite, qui n'apparaît que la nuit (de 22 h à 6 h) : il envoie le personnage dans son lit. Tant qu'il dort, ses actions sont bloquées, la nuit défile en accéléré (une heure toutes les 3 secondes) et son énergie remonte peu à peu (8 heures de sommeil pour celle du réveil). À minuit, la nuit passe : les automatisations récoltent, les poules nourries pondent, les moutons et les vaches mangent leur paille (laine, lait) et les aliments vieillissent.",
     "liens": [
      "horloge",
      "repas",
      "energie_personnage",
      "peremption"
     ],
     "decouverte": [
      "jour:2"
     ]
    },
    {
     "id": "energie_personnage",
     "terme": "Énergie du personnage",
     "description": "Jauge de 0 à 100 (⚡ dans le bandeau) que dépense chaque action faite au clic : couper 3, piocher 3, pêcher 4, labourer 5, planter 3, arroser 2, récolter 4, cueillir 4, tondre 8, cuisiner 3, cuire au four 3, moudre 1 par blé, presser 1. À 0, plus d'action au clic jusqu'à un en-cas ou une nuit de sommeil. Au réveil, elle remonte à 60 + 40 × la jauge de faim moyenne du reste de la famille au coucher : une famille rassasiée, un meilleur réveil. Le bonheur de la famille et l'endurance réduisent ses coûts ; les automatisations n'en dépensent pas.",
     "liens": [
      "repas",
      "en_cas",
      "bonheur",
      "endurance",
      "automatisation",
      "outils"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "endurance",
     "terme": "Endurance",
     "description": "Réduction des coûts d'énergie gagnée avec les niveaux : 3 % par niveau au-delà du premier (27 % au niveau 10).",
     "liens": [
      "energie_personnage",
      "niveaux"
     ],
     "decouverte": [
      "niveau:2"
     ]
    },
    {
     "id": "en_cas",
     "terme": "En-cas",
     "description": "Aliment mangé dans la journée depuis l'Inventaire (bouton « Manger ») : il rend sa valeur au personnage (son énergie ÷ 5, + 10 %, arrondie au-dessus : la même qu'à la boîte à nourriture), sans dépasser le maximum. La technologie Goûter de l'Arbre des technologies augmente ce gain de 50 %.",
     "liens": [
      "energie_personnage",
      "arbre_technologique"
     ],
     "decouverte": [
      "jour:2"
     ]
    },
    {
     "id": "bonheur",
     "terme": "Bonheur",
     "description": "Valeur de 0 à 100 pour chaque membre de la famille (60 au départ). Chaque nuit, il baisse de 5, et de 2 de plus pour qui a eu faim sans rien trouver dans la boîte à nourriture ; les plats mangés dans la journée le remontent : chacun des 3 meilleurs plats différents rend 3 (Cuisine) ou 5 (Four), +2 avec de l'huile ou un fruit, +4 avec du cacao, du café ou de la vanille ; les aliments crus ne donnent rien. Le bonheur moyen réduit les coûts d'énergie du personnage : jusqu'à moitié prix à 100 de bonheur.",
     "liens": [
      "repas",
      "energie_personnage",
      "famille"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "chapitres",
     "terme": "Chapitres",
     "description": "7 étapes de l'histoire de la famille, avec leurs objectifs : l'héritage (bâtir le foyer, première récolte), le grenier (cultures, Silo, blé, et les premières ventes à la calèche), le poulailler (le premier minerai de fer de la mine, et un premier hameau du grand monde), le four (le premier lingot de fer, une grotte de la montagne, et une part du monde vue), le troupeau (et d'autres hameaux, un poisson de mer), toute l'année (acheter aux hameaux par la calèche, regarder les bêtes sauvages), puis l'autonomie (et connaître son pays). Ils ne débloquent plus rien depuis la version 1.7 : chaque chapitre terminé rapporte de l'expérience, des points de technologie, et ouvre un palier de l'Arbre des technologies.",
     "liens": [
      "autonomie",
      "points_technologie",
      "niveaux",
      "grotte",
      "lingot",
      "hameaux",
      "grotte_montagne",
      "comptoir",
      "grand_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "niveaux",
     "terme": "Niveaux",
     "description": "Dix niveaux d'expérience (XP) qui débloquent les cultures, les bâtiments et les ateliers : par exemple la Cuisine au niveau 2, le Silo et le Poulailler au niveau 3, le Four au niveau 5, la Serre au niveau 7. Chaque niveau relève aussi le plafond de tuiles de terre. L'XP vient des actions (labourer 10, couper 10, piocher 10, pêcher 15, planter 10, arroser 10, récolter 20, cuisiner 40, cuire au four 50…), des œufs et du lait, des ventes (1 XP par pièce) et des chapitres terminés ; une automatisation rapporte la moitié. Le niveau s'affiche dans le bandeau (⭐).",
     "liens": [
      "chapitres",
      "experience",
      "tuiles_de_terre"
     ],
     "decouverte": [
      "niveau:2"
     ]
    },
    {
     "id": "experience",
     "terme": "Expérience (XP)",
     "description": "Points gagnés en jouant, qui font monter de niveau : 500 XP pour le niveau 2, 1 200 pour le 3, puis 3 000, 7 500, 20 000, 40 000, 80 000, 180 000 et 400 000.",
     "liens": [
      "niveaux"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "autonomie",
     "terme": "Autonomie",
     "description": "Pourcentage de ce que la famille a mangé dans la journée (à la boîte à nourriture ou au réfrigérateur) qui vient de la ferme elle-même. La nourriture achetée à la calèche et les conserves de départ ne comptent pas. Un jour où personne n'a mangé garde l'autonomie de la veille.",
     "liens": [
      "apport_journalier",
      "comptoir",
      "conserve"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "usure",
     "terme": "Usure",
     "description": "Valeur de 0 à 100 % pour chaque appareil électrique (panneau, batterie, pompe, moulin, presse), qui augmente avec son temps de fonctionnement et réduit son rendement. À 100 %, l'appareil tombe en panne et doit être réparé.",
     "liens": [
      "panneau_solaire",
      "batterie",
      "pompe",
      "moulin",
      "presse"
     ],
     "decouverte": [
      "objet:pompe",
      "objet:panneau_solaire",
      "objet:batterie"
     ]
    },
    {
     "id": "interrupteur",
     "terme": "Interrupteur",
     "description": "Bouton marche/arrêt présent sur chaque appareil électrique, qui permet de le couper pour éviter qu'il ne s'use ou ne consomme de l'énergie inutilement.",
     "liens": [],
     "decouverte": [
      "objet:pompe",
      "objet:panneau_solaire",
      "objet:batterie"
     ]
    },
    {
     "id": "automatisation",
     "terme": "Automatisation",
     "description": "Tâche effectuée sans intervention : arrosage (les asperseurs, chaque matin), récolte et semis (le robot, chaque matin), nourrissage des poules, tonte et cueillette du verger (la nuit). Chacune s'obtient par une technologie de l'Arbre des technologies (et non plus par le niveau d'un bâtiment) et ne coûte jamais d'énergie au personnage.",
     "liens": [
      "arbre_technologique",
      "energie_personnage",
      "robot",
      "asperseurs"
     ],
     "decouverte": [
      "techno:ea_irrigation",
      "techno:cu_recolte_auto",
      "techno:semis_auto"
     ]
    },
    {
     "id": "robot",
     "terme": "Robot",
     "description": "Avec la Récolte automatique (puis le Semis automatique), un robot travaille dans la Zone de culture : chaque matin à 6 h, il dresse sa liste de tâches (récolter les parcelles mûres, puis les replanter) et les fait une à une, en roulant jusqu'à chaque parcelle (4 minutes de travail par tâche). Sa batterie tient 35 tâches ; vide, il rentre à sa station de charge (fabriquée à l'Atelier et posée dehors), qui prend l'électricité de la ferme (60 Wh par tâche). Un appui sur le robot ou sa station montre sa batterie et propose plus d'autonomie, contre des pièces.",
     "liens": [
      "automatisation",
      "semis_automatique",
      "batterie",
      "electricite",
      "potager"
     ],
     "decouverte": [
      "techno:cu_recolte_auto",
      "objet:station_robot"
     ]
    },
    {
     "id": "asperseurs",
     "terme": "Asperseurs",
     "description": "Avec le Réseau d'irrigation (et l'Irrigation de la Serre), des asperseurs tournent au milieu des cultures : chaque matin à 7 h, ils arrosent les parcelles plantées qui ont soif, avec l'eau du réservoir. Ils repassent dans la journée pour les plantes qui ont soif plus tard (semées après 7 h, par le robot ou à la main). Sans eau au réservoir, ils attendent.",
     "liens": [
      "automatisation",
      "reservoir",
      "pompe",
      "potager",
      "serre"
     ],
     "decouverte": [
      "techno:ea_irrigation",
      "techno:ea_serre"
     ]
    },
    {
     "id": "semis_automatique",
     "terme": "Semis automatique",
     "description": "Technologie qui fait replanter par le robot une parcelle qu'il vient de récolter, avec la même culture, si une graine est disponible au-delà de la réserve de semences. Réglable parcelle par parcelle.",
     "liens": [
      "arbre_technologique",
      "robot"
     ],
     "decouverte": [
      "techno:semis_auto"
     ]
    },
    {
     "id": "points_technologie",
     "terme": "Points de technologie",
     "description": "Monnaie de l'Arbre des technologies (PT), en plus des pièces et des ressources. On en gagne à chaque chapitre terminé (2, 3, 3, 4, 4, 5 puis 5), à six jalons de maîtrise (2 000 L pompés, 10 plats différents, 50 pains, 40 laines, 40 nuits jouées, 20 nuits à 100 %) et, une fois la campagne finie, 1 point toutes les 5 nuits à 100 %.",
     "liens": [
      "arbre_technologique",
      "chapitres"
     ],
     "decouverte": [
      "technologies"
     ]
    },
    {
     "id": "eau_de_pluie",
     "terme": "Eau de pluie",
     "description": "Technologie Récupérateur d'eau de pluie : chaque nuit, 15 L d'eau s'ajoutent au réservoir sans électricité, dans la limite de sa capacité.",
     "liens": [
      "arbre_technologique",
      "reservoir"
     ],
     "decouverte": [
      "techno:ea_pluie"
     ]
    },
    {
     "id": "actions_groupees",
     "terme": "Actions groupées",
     "description": "Boutons « Arroser tout » et « Récolter tout » de la Zone de culture et de la Serre (technologie Outils de jardin) : une tentative par parcelle, chacune payée en énergie comme un clic.",
     "liens": [
      "arbre_technologique",
      "energie_personnage"
     ],
     "decouverte": [
      "techno:cu_outils"
     ]
    },
    {
     "id": "file_de_preparations",
     "terme": "File de préparations",
     "description": "Technologie Préparations en série : chaque atelier garde jusqu'à 3 préparations en attente. Les ingrédients sont retirés à la mise en file et rendus si l'on annule.",
     "liens": [
      "arbre_technologique",
      "livre_de_recette"
     ],
     "decouverte": [
      "techno:cui_serie"
     ]
    },
    {
     "id": "delestage",
     "terme": "Délestage",
     "description": "Technologie Délestage intelligent : sous 10 % de charge de la batterie, le Moulin, la Presse et la Pompe sont suspendus pour garder l'électricité du réfrigérateur ; ils repartent seuls quand la charge remonte.",
     "liens": [
      "arbre_technologique",
      "batterie",
      "refrigerateur"
     ],
     "decouverte": [
      "techno:en_delestage"
     ]
    },
    {
     "id": "entretien_automatique",
     "terme": "Entretien automatique",
     "description": "Technologie de l'Arbre des technologies : chaque nuit, tout appareil dont l'usure atteint 70 % ou plus est entretenu au prix normal si les pièces suffisent. Le résumé apparaît dans le rapport du réveil.",
     "liens": [
      "arbre_technologique",
      "usure"
     ],
     "decouverte": [
      "techno:en_entretien_auto"
     ]
    },
    {
     "id": "absence",
     "terme": "Absence",
     "description": "Quand le jeu est fermé, la ferme continue de tourner pendant 8 heures au plus : le panneau charge la batterie (si l'horloge s'est arrêtée entre 7 h et 19 h), la pompe remplit le réservoir, les ateliers finissent leurs préparations. Aucune nuit ne passe (une nuit déjà commencée se termine) et l'horloge s'arrête. Au retour, la fenêtre « Ravi de te revoir ! » donne la date, l'argent et les biens produits pendant l'absence.",
     "liens": [
      "horloge",
      "bouton_dormir",
      "batterie",
      "reservoir"
     ],
     "decouverte": [
      "jour:2"
     ]
    },
    {
     "id": "notifications",
     "terme": "Notifications",
     "description": "Entrée du menu qui liste ce qui demande l'attention : appareils en panne, aliments qui vont périr, parcelles à arroser, poules à nourrir, paille qui manque, récoltes et tontes prêtes. Un appui sur une ligne mène directement à l'endroit concerné. C'est aussi là qu'arrive le courrier.",
     "liens": [
      "carte",
      "courrier",
      "usure",
      "peremption",
      "paille"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "courrier",
     "terme": "Courrier",
     "description": "Lettres que la famille reçoit au fil de la partie, à lire dans l'onglet Notifications ; une lettre lue y reste, pour être relue. Le notaire écrit au début, et au niveau 9 (l'enveloppe de Maurice) ; ta mère, Adèle, écrit à l'arrivée, puis aux moments qui comptent : la première récolte, la première veillée, le robot, la fête. Quand la Serre se débloque, elle rapporte de voyage une fève de cacao, une gousse de vanille et un grain de café, à planter dans la Serre.",
     "liens": [
      "notifications",
      "adele",
      "enveloppe_maurice",
      "serre",
      "cacao",
      "vanille",
      "cafe"
     ],
     "decouverte": [
      "courrier"
     ]
    }
   ]
  },
  {
   "id": "famille",
   "icone": "👨‍👩‍👧‍👦",
   "nom": "Famille",
   "entrees": [
    {
     "id": "adulte",
     "terme": "Adulte",
     "description": "Membre de la famille. La famille en compte deux au départ : le personnage principal et son compagnon, qui vient toujours. Le second adulte s'occupe des bêtes et, le jour, aide à la ferme de lui-même (il arrose quelques légumes, prépare un repas quand la famille a faim, ramasse du bois ou des pierres), ce qui lui donne faim ; la Famille permet de le laisser faire ou non. Quand tu pars explorer, il garde la ferme et, à ton retour, il te dit ce qu'il a fait.",
     "liens": [
      "apport_journalier",
      "famille"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "enfant",
     "terme": "Enfant",
     "description": "Membre de la famille. La famille en compte deux au départ.",
     "liens": [
      "apport_journalier",
      "famille"
     ],
     "decouverte": [
      "famille:enfant"
     ]
    },
    {
     "id": "famille",
     "terme": "Famille",
     "description": "Deux adultes au départ (le personnage principal et son compagnon), et, si tu veux, des enfants et un animal, composés avant la première journée sur l'écran « Ta famille » (nom de famille, membres, personnage principal), puis à tout moment dans la fenêtre Famille (carte du joueur, en haut à gauche) : de 1 à 6 membres, dont au moins un adulte. Chacun a un prénom, un sexe, une coiffure (cinq par âge, dont blond) et une couleur de peau au choix. Un nouveau membre arrive avec le bonheur moyen de la famille. Le but du jeu est de nourrir la famille avec la production de la ferme, sans dépendre de la calèche.",
     "liens": [
      "adulte",
      "enfant",
      "animal_de_compagnie",
      "apport_journalier",
      "bonheur",
      "autonomie",
      "maison"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "personnage_principal",
     "terme": "Personnage principal",
     "description": "L'adulte de la famille qui tient la ferme au quotidien : c'est son énergie qui baisse à chaque action. Il se choisit sur l'écran « Ta famille », puis dans la Famille (⭐) ; il ne peut pas quitter la famille.",
     "liens": [
      "famille",
      "energie_personnage"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "animal_de_compagnie",
     "terme": "Animal de compagnie",
     "description": "Chien ou chat adopté dans la fenêtre Famille (carte du joueur, en haut à gauche) : trois au plus. Il porte un nom, ne coûte rien et ne mange pas les réserves : il n'a pas de jauge de faim et ne compte pas dans le bonheur.",
     "liens": [
      "famille",
      "apport_journalier"
     ],
     "decouverte": [
      "famille:animal"
     ]
    },
    {
     "id": "equipement",
     "terme": "Équipement de la famille",
     "description": "Dans la fenêtre Famille, un onglet par membre ouvre sa fiche : 3 cases d'équipement, son portrait en pied (on y voit ce qu'il porte) et ses jauges. Une case vide se remplit d'une pièce de l'inventaire, une case pleine la rend à l'inventaire ; une pièce portée ne se vend pas. Une pièce par place (tête, corps, mains, pieds) ; un enfant porte seulement ce qui existe à sa taille. Les pièces se fabriquent à l'Atelier (onglet Équipement). Leurs effets, modestes, valent pour le personnage principal ; pour un autre membre, seulement dans ce qu'il fait de lui-même sur la ferme (marcher, aider).",
     "liens": [
      "casque_a_lampe",
      "chapeau_de_paille",
      "bottes_de_marche",
      "gants_de_travail",
      "tablier_de_jardinier",
      "salopette_solide",
      "manteau_chaud",
      "lanterne_tempete",
      "sac_a_provisions",
      "tente",
      "atelier"
     ],
     "decouverte": [
      "objet:casque_lampe",
      "objet:chapeau_paille",
      "objet:bottes",
      "objet:gants_travail",
      "objet:tablier",
      "objet:salopette",
      "objet:manteau_chaud",
      "objet:lanterne_tempete",
      "objet:sac_petit",
      "objet:sac_grand",
      "objet:tente"
     ]
    },
    {
     "id": "casque_a_lampe",
     "terme": "Casque à lampe",
     "description": "Un casque jaune, une lampe au front, fabriqué à l'Atelier avec deux lingots de fer, un lingot de cuivre et deux champignons lumineux (dès le niveau du Four). Sur la tête du personnage principal, il éclaire 140 % autour de lui dans la mine et les grottes (la Lampe de mineur de l'Arbre s'y cumule), et la nuit, dans le grand monde, il voit plus loin (150 % du rayon). Pour les adultes seulement.",
     "liens": [
      "equipement",
      "grotte",
      "grotte_montagne",
      "carte_du_monde"
     ],
     "decouverte": [
      "objet:casque_lampe"
     ]
    },
    {
     "id": "chapeau_de_paille",
     "terme": "Chapeau de paille",
     "description": "Tressé à l'Atelier avec de la paille et une fibre. Au soleil, de 11 h à 17 h, le personnage principal se fatigue moins pour labourer, planter, arroser, récolter, cueillir et faucher (10 % d'énergie en moins). Il existe en taille enfant.",
     "liens": [
      "equipement",
      "energie_personnage"
     ],
     "decouverte": [
      "objet:chapeau_paille"
     ]
    },
    {
     "id": "bottes_de_marche",
     "terme": "Bottes de marche",
     "description": "Des bottes à semelle de bois, fabriquées à l'Atelier avec une planche et des fibres. À pied, le personnage principal va plus vite dans le marais (130 %) et en montagne (120 %). Un autre membre qui les porte a moins faim en marchant sur la ferme (25 % de moins). Elles existent en taille enfant.",
     "liens": [
      "equipement",
      "grand_monde"
     ],
     "decouverte": [
      "objet:bottes"
     ]
    },
    {
     "id": "gants_de_travail",
     "terme": "Gants de travail",
     "description": "Des gants de tissu de laine, cousus aux Genêts. Le personnage principal dépense 20 % d'énergie de moins pour couper (la hache) et piocher (la pioche). Pour les adultes seulement.",
     "liens": [
      "equipement",
      "hache",
      "pioche"
     ],
     "decouverte": [
      "objet:gants_travail"
     ]
    },
    {
     "id": "tablier_de_jardinier",
     "terme": "Tablier de jardinier",
     "description": "Un tablier vert de fibres tressées, fabriqué à l'Atelier. Le personnage principal dépense 15 % d'énergie de moins pour labourer, planter, arroser, récolter et cueillir. Un autre membre qui le porte a moins faim quand il aide (25 % de moins). Il se porte sur le corps, comme la salopette et le manteau : un des trois. Il existe en taille enfant.",
     "liens": [
      "equipement",
      "potager"
     ],
     "decouverte": [
      "objet:tablier"
     ]
    },
    {
     "id": "salopette_solide",
     "terme": "Salopette solide",
     "description": "Une salopette de laine épaisse aux boucles de fer, cousue aux Genêts. Le personnage principal dépense 8 % d'énergie de moins pour tous ses gestes. Pour les adultes seulement.",
     "liens": [
      "equipement",
      "energie_personnage"
     ],
     "decouverte": [
      "objet:salopette"
     ]
    },
    {
     "id": "manteau_chaud",
     "terme": "Manteau chaud",
     "description": "Un manteau de laine rouge au col fourré, cousu aux Genêts. Loin de la ferme, dans le vent et le froid du grand monde, le personnage principal dépense 15 % d'énergie de moins pour tous ses gestes. Il existe en taille enfant.",
     "liens": [
      "equipement",
      "grand_monde"
     ],
     "decouverte": [
      "objet:manteau_chaud"
     ]
    },
    {
     "id": "sac_a_provisions",
     "terme": "Sac à provisions",
     "description": "La quatrième case de la fiche du personnage principal. Le petit sac (fibres) tient 6 portions, le grand (laine et fibres, dès le niveau des moutons) 12 ; un premier sac est offert au didacticiel, avant de sortir de la ferme. Il se remplit à la ferme, d'aliments de l'inventaire ou du réfrigérateur, et ce qu'il contient périme comme dans l'inventaire. Loin de la ferme, le personnage ne mange que ce qu'il y a dans son sac : « Manger » y puise et dit quand il est vide ; une alerte prévient quand on sort avec un sac vide ou presque, et quand l'énergie baisse loin de la ferme, le sac vide. Sur la ferme, rien ne change.",
     "liens": [
      "equipement",
      "energie_personnage",
      "grand_monde",
      "personnage_principal"
     ],
     "decouverte": [
      "objet:sac_petit",
      "objet:sac_grand",
      "didacticiel:sortie"
     ]
    }
   ]
  }
 ]
};
