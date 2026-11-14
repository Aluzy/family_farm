// FICHIER GÉNÉRÉ par scripts/build-encyclopedie.mjs à partir de encyclopedie_ferme_familiale.json et de
// encyclopedie_ile.json (le livre d'une partie de l'île à bâtir, fiche I7d). Ne pas le modifier : changer les
// fichiers JSON, puis lancer
//   node scripts/build-encyclopedie.mjs
export const ENCYCLOPEDIE_ILE = {
 "categories": [
  {
   "id": "port",
   "icone": "⚓",
   "nom": "Le port",
   "entrees": [
    {
     "id": "port",
     "terme": "Le port",
     "description": "Au bout du chemin qui sort de la ferme, sur la côte : le quai, la cale et la halle. C'est le seul commerce de l'île. Au comptoir, sous la halle (dès le niveau 3, de 6 h à 21 h, à 3 cases au plus), on vend tout ce qui se vend, au prix de vente et sans limite : le bac emporte tout, il n'y a pas d'entrepôt. On y achète les semences que ton niveau a débloquées. Ce qu'on vend, on l'apporte : ce qui est chargé se vend d'un coup sous la halle. Le prix d'achat d'une semence monte un peu à chaque achat et redescend à chaque vente, sans passer sous un plancher. La carte du monde le montre, la boussole y mène.",
     "liens": [
      "bac",
      "commandes_bac",
      "import",
      "niveaux_port",
      "chemin_port",
      "portage"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "bac",
     "terme": "Le bac",
     "description": "Le bateau du port. Il accoste tous les 3 jours, de 9 h à 17 h, le long du quai : la cloche sonne, le calendrier marque ses jours (⛴️). Il emporte les caisses de ce qui a été vendu depuis son dernier passage, apporte ses commandes, livre ce qu'on a importé, et c'est lui qui amène les villageois.",
     "liens": [
      "port",
      "commandes_bac",
      "import",
      "villageois"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "commandes_bac",
     "terme": "Les commandes du bac",
     "description": "À chaque passage, le bac demande quelques objets parmi ce que tu sais produire (une culture récoltée, un plat préparé, les œufs, la laine, le lait de tes bêtes) : un objet, une quantité, une prime. Elles valent jusqu'au passage suivant. On les honore au comptoir avec ce qu'on a porté : le prix de vente, plus la prime, plus 15 XP. Plus le port grandit, plus il y en a. Une commande manquée s'efface sans rien coûter.",
     "liens": [
      "bac",
      "port",
      "portage"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "import",
     "terme": "Le catalogue d'import",
     "description": "Ce que l'île ne donne pas se commande au port, un rang par niveau du port : les jeunes arbres fruitiers et les plants de vigne ; le cacao, la vanille, le café, le sucre et les épices ; une poule, un mouton, une vache ; les plans des meubles de collection ; des graines de fleurs rares. Ce que ton niveau débloquait le reste (un jeune arbre demande le Verger, une bête son bâtiment et sa place). Une commande se paie d'avance et arrive au passage suivant du bac : à l'inventaire, une bête à son bâtiment (son prix rendu s'il n'y a plus de place), un plan appris.",
     "liens": [
      "port",
      "bac",
      "niveaux_port",
      "verger"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "niveaux_port",
     "terme": "Les niveaux du port",
     "description": "Le port grandit en cinq niveaux. Chacun se paie en pièces et en matériaux apportés au chantier du port (des planches, des pierres, puis des lingots de fer et de cuivre ; le niveau 2 : 1 800 pièces, 24 planches, 16 pierres), en une ou plusieurs fois. Chaque niveau allonge le quai, ouvre un rang du catalogue d'import, apporte plus de commandes par passage et accueille plus de villageois.",
     "liens": [
      "port",
      "import",
      "commandes_bac",
      "villageois",
      "lingot"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "chemin_port",
     "terme": "Le chemin du port",
     "description": "De la porte de l'abri à la sortie de la ferme, puis de la sortie au port : des blocs de chemin qui t'appartiennent. Tu les poses, les reprends et les déplaces en mode Construire, sur la ferme comme dehors ; dehors se posent aussi les pas japonais, les lanternes, les réverbères, les barrières, les bancs et le pont de planches, qui passe une rivière. Sur un chemin, on va 100 % plus vite, à pied comme à cheval. Le port est loin : le cheval et le chemin raccourcissent l'aller.",
     "liens": [
      "chemins_et_gues",
      "port",
      "portage",
      "cheval"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "portage",
     "terme": "Porter au port",
     "description": "Ce qu'on vend au port, on l'y porte. Chaque objet a un volume (un ; le bois et les planches 2, la pierre, les minerais et les lingots 3). À la main, 12 volumes ; avec la brouette (Atelier), 40 ; avec la charrette attelée au cheval, 160. On charge sur la ferme (la fenêtre du port, onglet Porter : de l'inventaire puis du réfrigérateur), on reprend sur la ferme, on décharge sous la halle : tout ce qui est chargé se vend. Les semences achetées vont droit à la ferme.",
     "liens": [
      "port",
      "chemin_port",
      "cheval"
     ],
     "decouverte": [
      "depart"
     ]
    }
   ]
  },
  {
   "id": "village",
   "icone": "🏝️",
   "nom": "L'île et son village",
   "entrees": [
    {
     "id": "village",
     "terme": "Le village",
     "description": "On arrive sur une île vierge : un abri sur la terre de la ferme, un port au bout du chemin, et tout le reste à bâtir. Des villageois débarquent du bac, s'installent dans les maisons que tu leur bâtis, travaillent pour la ferme, se lient entre eux. Au troisième, le village reçoit un nom. Il n'y a pas d'histoire écrite : c'est toi qui fais celle de ton île, et la chronique la note.",
     "liens": [
      "villageois",
      "maison_libre",
      "chronique",
      "noms",
      "vocations"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "maison_libre",
     "terme": "La maison d'un villageois",
     "description": "Un villageois s'installe dans une maison libre : une pièce close du genre maison, avec un lit que la famille ne prend pas, et une boîte aux lettres (Atelier) posée dehors contre sa porte. Un villageois par maison. Le premier vient dès la première maison libre ; les suivants s'il y a de quoi manger pour tous (la boîte à nourriture, le réfrigérateur) et si le port est assez grand. Sur sa fiche, ✏️ donne un nom à sa maison.",
     "liens": [
      "villageois",
      "piece_close",
      "niveaux_port",
      "noms"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "villageois",
     "terme": "Les villageois",
     "description": "Ils débarquent du bac, un par passage, marchent jusqu'à leur maison et frappent. Chacun a son prénom, son visage, ses goûts et ses traits. Ils se lèvent, travaillent à leur tâche, mangent à midi et le soir, sortent, se saluent, causent entre eux, rentrent dormir. La nuit, chacun mange à la boîte commune et dort dans son lit ; mal nourri ou sans lit, il se repose le lendemain. Personne ne part. La carte du joueur compte les villageois : un appui, leur liste, puis la fiche de chacun.",
     "liens": [
      "maison_libre",
      "taches",
      "tableau_villageois",
      "amitie_villageois",
      "liens_villageois",
      "traits"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "taches",
     "terme": "Les tâches",
     "description": "C'est toi qui donnes une tâche à chaque villageois, sur sa fiche : les champs (récolter, arroser, ressemer), les bêtes, le verger et les ruches, le bois (une hache), la pierre et le minerai (une pioche), la pêche (une canne), la cueillette, le fauchage et la paille (une faux), la cuisine, les machines, la tournée du port (il y vend ce que tu marques « à vendre »). Il la fait chaque jour à son poste, à ses heures de travail ; ce qu'il produit va au coffre de la ferme. L'outil de sa tâche, tu le fabriques et tu le lui donnes : sans lui, ou sans rien à faire, la tâche attend et il le dit.",
     "liens": [
      "villageois",
      "tableau_villageois",
      "part",
      "outils"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "tableau_villageois",
     "terme": "Le tableau des villageois",
     "description": "Le bouton 📊, sur la carte du joueur : une ligne par villageois, sa tâche et ce qu'elle a donné, ce qu'il a coûté (ce qu'il a mangé, sa part, ce que son travail a pris au coffre), ce qu'il a produit, le solde et son humeur, hier ou sur sept jours, triable par colonne ; et ce qui lui manque aujourd'hui. Un appui sur un prénom : ses sept jours et son rendement. C'est un repère pour décider qui fait quoi, pas une note.",
     "liens": [
      "taches",
      "part",
      "villageois"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "part",
     "terme": "La part du villageois",
     "description": "Chaque nuit, un villageois garde 30 % de la valeur de ce que son travail a produit ce jour-là : des objets de sa récolte quittent le coffre pour son panier, jamais des pièces de ta caisse. S'il a encore faim, il mange de son panier ; le reste se vend pour lui au passage du bac et va dans sa bourse. Le tableau la compte dans son coût.",
     "liens": [
      "taches",
      "tableau_villageois",
      "etal",
      "bac"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "etal",
     "terme": "L'étal et la bourse",
     "description": "La bourse d'un villageois sert à ses plaisirs. L'étal (Atelier : des planches et des fibres), posé dehors, est ta boutique : tu y mets jusqu'à 6 sortes d'objets de l'inventaire. En fin d'après-midi, un villageois vient y acheter ce qu'il adore, ce dont il a besoin (un vêtement, un meuble pour sa maison), puis ce qu'il aime, s'il peut le payer : ses pièces sont pour toi, et il est plus heureux cette nuit-là. Avec assez de pièces, il commande aussi au bac un objet qu'il adore.",
     "liens": [
      "part",
      "villageois",
      "meubles",
      "bac"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "amitie_villageois",
     "terme": "L'amitié",
     "description": "Chaque villageois a sa jauge d'amitié avec toi, de 0 à 100, en cinq paliers : inconnu, poli, cordial, proche, intime. Elle monte quand tu lui parles (+2, une fois par jour) et avec un cadeau, un par jour : chacun a ses goûts, qui se découvrent en offrant (ce qu'il adore vaut +8, ce qu'il aime +4, ce qu'il déteste -4). L'absence ne la fait jamais baisser. Un ami te confie parfois ce qu'il aimerait recevoir, et t'offre de temps en temps un présent de sa main.",
     "liens": [
      "villageois",
      "liens_villageois",
      "traits"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "liens_villageois",
     "terme": "Les liens entre villageois",
     "description": "Les villageois se lient entre eux à force de se croiser : voisins, au même poste, à table, en sortie, à la fête. Une affinité, des paliers (connaissance, camarade, ami, proche) : deux amis sont plus heureux, travaillent mieux ensemble, s'entraident, s'assoient sur le même banc, se rendent visite le soir. Deux villageois proches peuvent former un foyer si tu leur bâtis une maison ; un enfant peut y naître.",
     "liens": [
      "villageois",
      "amitie_villageois",
      "traits",
      "maison_libre"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "traits",
     "terme": "Les traits",
     "description": "Chaque villageois a deux ou trois traits de personnalité, parmi douze : matinal, couche-tard, bavard, réservé, travailleur, flâneur, casanier, curieux, gourmand, rêveur, soigneux, taquin. Ils pèsent sur ses horaires, ses phrases, les postes qu'il préfère et ceux avec qui il s'entend. On les découvre en le voyant vivre, ou en l'écoutant ; sa fiche dit ceux qu'on connaît.",
     "liens": [
      "villageois",
      "liens_villageois",
      "taches"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "commerces",
     "terme": "Les commerces",
     "description": "Un villageois assez proche de toi peut avoir envie d'ouvrir un commerce d'artisan ; c'est toi qui le décides. Il faut qu'il ait pratiqué 10 jours la tâche de sa filière, son amitié, et un local que tu bâtis : une pièce close avec l'établi et le comptoir, l'enseigne près de la porte. Un commerce reste artisanal : 3 lots par jour, un de plus avec l'ancienneté. L'artisan achète sa matière à ton coffre avec sa bourse, et vend au comptoir : à toi, aux villageois, le surplus au bac ; tu peux lui commander une pièce, ou la faire à façon. La forge fond le minerai en lingots et fait des clous, des charnières et des lames. La scierie scie des planches et fait les meubles de la maison : sur ta commande (ils entrent dans ta maison) ou pour les maisons des villageois. La boulangerie cuit le pain et les tartes au four à bois : un villageois qui n'a plus de provisions vient y chercher son pain, qu'il mange à son repas. La fromagerie caille le lait en faisselles et met des tommes à s'affiner en cave, quelques nuits. Un commerce ne te retire rien : tu peux toujours scier, cuire et cailler toi-même ; il fait mieux ou autre chose, en petite quantité. Le village tient d'autant plus de commerces qu'il a de villageois et que son port est grand. Le premier commerce ouvert franchit un palier de l'île, a son nom, et sa fête d'ouverture.",
     "liens": [
      "villageois",
      "amitie_villageois",
      "noms",
      "fetes_village",
      "meubles"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "vocations",
     "terme": "Les vocations",
     "description": "L'île prend une vocation de ce que tu y bâtis, sans menu à choisir : un village convivial (les fêtes, les projets faits ensemble, les repas partagés, l'amitié entre villageois, une jolie place) ou une ferme productive. Chacune a son score et ses paliers, qui débloquent des plans, des projets, une seconde fête par mois ; un palier atteint n'est jamais perdu. La fenêtre « L'île », onglet Vocations, les montre.",
     "liens": [
      "fetes_village",
      "projets_village",
      "village"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "fetes_village",
     "terme": "Les fêtes du village",
     "description": "Une fête se fixe un jour à venir (la fenêtre « L'île », le calendrier), une par mois de lune : il lui faut une place (le panneau du village, un puits ou une table de jardin) et des plats cuisinés. De 17 h à 21 h, tous viennent sur la place, attablés ou en cercle, et causent. La veillée de pleine lune se tient d'elle-même, le premier soir de pleine lune du mois, dès deux villageois. Une fête rapproche ceux qui y sont et les rend plus heureux.",
     "liens": [
      "vocations",
      "projets_village",
      "liens_villageois"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "projets_village",
     "terme": "Les projets du village",
     "description": "Des ouvrages qu'on bâtit ensemble, un à la fois : la place, le jardin partagé, le lavoir, le kiosque, la fontaine du village, le four commun. Tu lances le projet, tu apportes les matériaux, tu poses son chantier ; les villageois que tu y envoies y travaillent à la place de leur tâche, une journée après l'autre. Fini, il prend son dessin achevé, et les villageois reprennent leur tâche.",
     "liens": [
      "vocations",
      "fetes_village",
      "taches"
     ],
     "decouverte": [
      "villageois"
     ]
    },
    {
     "id": "chronique",
     "terme": "La chronique",
     "description": "Le menu « Chronique » 📜 : ce qui compte sur l'île, noté de lui-même, une ligne datée par moment — l'arrivée, la première récolte, la première vente, chaque villageois, le nom du village, les paliers, le port agrandi, deux villageois devenus proches, un foyer, une fête, un projet fini. Les mois anciens se résument. 📌 épingle une ligne ; ✏️ y écrit ta note.",
     "liens": [
      "noms",
      "village"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "noms",
     "terme": "Les noms",
     "description": "Tu nommes ton île au départ, ton village quand le troisième villageois s'installe, les commerces et les maisons : un nom est proposé, « 🎲 Un autre nom » en tire un autre, ou tu écris le tien (2 à 20 signes). « ✏️ Renommer », dans la chronique, les change à tout moment. Le panneau du village (Atelier) écrit son nom sur sa planche.",
     "liens": [
      "chronique",
      "village",
      "maison_libre",
      "commerces"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "styles_ile",
     "terme": "Styles d'aménagement",
     "description": "Chaque bloc, sol ou meuble décoratif a un style : champêtre 🌾 (la pierre, le bois brut, le chêne), forestier 🌲 (les planches, les bibliothèques, les fougères), côtier 🐚 (le bleu, le blanc, le carrelage, les palmiers) ou fleuri 🌷 (les fleurs, les briques rouges, le vitrail, les tapis et les plantes). Une petite icône le montre dans le mode Construire. Aucun n'est plus beau qu'un autre : ce sont des goûts. La famille est plus heureuse (+5 à sa cible de bonheur) quand la ferme réunit 3 styles d'au moins 2 sortes de blocs, ou 6 sortes d'un même style : on compte les sortes différentes, pas les blocs.",
     "liens": [
      "meubles",
      "mode_construire"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "plans_ile",
     "terme": "Plans de collection",
     "description": "Chaque pays de l'île a sa collection de meubles de jardin, dans son style : la forêt (le banc et la table en rondins), la côte (la chaise peinte, la jarre aux coquillages), le marais (la lanterne de papier, le bassin de pierre), la montagne (le banc et la jardinière de pierre), la prairie (la pergola fleurie). Leur recette ne se fait à l'Atelier qu'une fois leur plan trouvé : en explorant le pays, hors de la ferme ; les plans se commandent aussi au port (le catalogue d'import), et les paliers de l'île en offrent. Le carnet de plans, sous l'Atelier, montre ce que tu as trouvé.",
     "liens": [
      "styles_ile",
      "import",
      "terrasse"
     ],
     "decouverte": [
      "depart"
     ]
    }
   ]
  },
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
     "description": "Onglet de la Maison qui regroupe ce qui se gère sans aller sur place : les ateliers (Four, Cuisine), la production et le stockage d'énergie, la pompe, le réservoir, le réfrigérateur et le silo.",
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
     "description": "Avant la pompe et la citerne, on arrose avec elle. Elle se fabrique à l'Atelier (3 bois) ; elle se remplit au puits posé sur la ferme (10 litres) : un appui sur le puits, ou sur la cruche de la barre d'outils, et le personnage y marche, puise, et la cruche est pleine. Une plante qu'on touche pour l'arroser y puise son eau quand la citerne n'en a pas assez ; la jauge bleue de la cruche, dans la barre d'outils, dit ce qui reste. Pour arroser plusieurs cultures à la suite, sans outil en main, on glisse le doigt de l'une à l'autre : elles s'allument en bleu, puis le personnage les arrose dans l'ordre ; la cruche vide en chemin, il va la remplir au puits et reprend où il s'était arrêté.",
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
     "description": "Toute l'herbe de la carte où poussent les cultures de plein air : les légumes (carotte, patate, tomate, courgette, aubergine, oignon, poivron, ail, épinard, fraise), le blé (une fois le Silo construit), le tournesol, le riz et le houblon. Chaque culture arrive à son niveau et suit les mêmes règles : une plante arrosée gagne un stade 24 heures plus tard, puis redemande de l'eau. La houe y change une tuile d'herbe en terre, n'importe où sur la carte, sauf sur les chemins, l'eau, les pierres, les arbres et les arbustes, et aux abords des bâtiments. Le nombre de tuiles de terre est plafonné par le niveau. Un appui sur une terre y sème, l'arrose ou la récolte ; s'il n'y a rien à faire, une petite bulle dit où elle en est (arrosée, mûre dans quelques heures). Sans outil en main, un glissement du doigt d'une terre vide à l'autre les allume en vert : au relâchement, on choisit la graine une seule fois : une graine irisée se pose sur chacune, et le personnage va les semer dans l'ordre (la graine et l'énergie partent à chaque geste). Un appui long sur une terre ouvre la fenêtre de la zone : toutes les parcelles, « Planter partout », « Arroser tout », « Récolter tout » et le semis automatique. L'arrosage (asperseurs), la récolte et le semis (robot) s'automatisent dans l'Arbre des technologies.",
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
     "description": "Un bâtiment qu'on bâtit : une pièce close où l'on pose le bac à semis (fabriqué à l'Atelier). Ses cases se labourent à la houe : chaque case libre de sa pièce, labourée, devient une parcelle de culture protégée (pour une plus grande Serre, on agrandit sa pièce) ; ses murs, quels qu'ils soient, deviennent du verre. C'est le seul endroit où peuvent être cultivés le cacao, la vanille et le café, les cultures de rente ; quelques légumes y poussent aussi.",
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
     "description": "Les arbres fruitiers de la ferme : pommier, poirier, cerisier, abricotier et pêcher. Un jeune arbre se commande au port (le catalogue d'import, dès son premier rang : il arrive au passage suivant du bac) et se plante depuis sa fiche de l'Inventaire (« Planter », puis une case en surbrillance sur la carte), dehors, à au moins 3 cases d'un autre arbre planté. L'arbre passe par 4 dessins : jeune arbre, arbuste, arbre (5 nuits chacun), puis arbre en fruits, 15 nuits après sa plantation. Les fruits attendent sur l'arbre : un appui le cueille (6 fruits, 4 énergie, 20 XP), et l'arbre redonne ses fruits 3 nuits plus tard, toute l'année. La Récolte du verger, dans l'Arbre des technologies, les cueille la nuit ; un villageois au verger aussi. Il ne s'arrose pas.",
     "liens": [
      "pommier",
      "poirier",
      "import",
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
     "description": "Outil des chaînes de production, fabriqué à l'Atelier : posée seule après un entonnoir, elle presse les graines de tournesol en huile ; après un mixeur, les fruits en jus ; après une centrifugeuse, le lait en fromage. Elle tire du courant pendant qu'elle tourne.",
     "liens": [
      "chaine_production",
      "tournesol",
      "huile",
      "batterie"
     ],
     "decouverte": [
      "objet:huile"
     ]
    },
    {
     "id": "chaine_production",
     "terme": "Chaîne de production",
     "description": "Des blocs de l'Atelier posés côte à côte sur une rangée, de gauche à droite : un entonnoir, un réservoir (facultatif), des outils (presse, centrifugeuse, mixeur, chaudron, tonneau, ensacheuse), puis au moins un convoyeur ; la case au bout reste libre. La suite des outils fait la recette : huile (presse), jus de fruits (mixeur, presse), fromage frais (centrifugeuse, presse), fromage d'alpage (centrifugeuse, presse, tonneau), compote (mixeur, chaudron), confiture (mixeur, chaudron, ensacheuse), bière (chaudron, tonneau), bocal de légumes (chaudron, ensacheuse). Un appui sur la chaîne : ton personnage jette dans l'entonnoir les ingrédients qu'il a ; avec un réservoir, jusqu'à 30. Elle travaille seule, avec le courant de la ferme, tant qu'il lui reste de quoi faire ; les produits tombent en tas au bout du convoyeur, à ramasser en marchant dessus. Ces produits ne se font plus en cuisine.",
     "liens": [
      "presse",
      "electricite",
      "atelier",
      "botteleuse"
     ],
     "decouverte": [
      "objet:entonnoir"
     ]
    },
    {
     "id": "four",
     "terme": "Four",
     "description": "Station qui débloque le livre de recette dès qu'elle est là : le four de pierre se fabrique à l'Atelier (8 pierres, 2 planches) et se pose dans la maison. Sert à cuire le pain et d'autres plats comme le gratin de patates, les tartes ou le pain d'épices. Il fond aussi le minerai des gisements en lingots : 4 minerais et quelques bûches de bois donnent 1 lingot.",
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
     "description": "Acheté, il arrive dans l'Inventaire : il se pose dans la maison avec 🔨 Construire. Posé, la famille y mange et va s'y servir (la boîte à nourriture revient dans l'Inventaire). Il contient 25 unités au niveau 1, puis 40, 60, 90 et 120 en l'agrandissant (300, 700, 1 500 et 3 000 pièces) ; plein, on ne peut plus rien y ranger. Il consomme 100 mWh/s par unité stockée (rien s'il est vide), jour et nuit, prélevés sur la batterie. Rien ne s'y gâte, même sans courant.",
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
     "description": "Onglet de la Maison : 37 technologies réparties en 7 branches (Énergie, Eau, Culture, Élevage, Cuisine, Famille, Outils) et 5 paliers. Chaque technologie se paie en points de technologie (PT), en pièces et en ressources : du bois et de la pierre (hache, pioche), puis des lingots fondus au Four avec le minerai des gisements. Elle débloque une automatisation, des recettes ou un effet (moins d'eau, d'usure ou d'électricité, temps de préparation réduit, outils plus efficaces…). Un palier s'ouvre avec le chapitre en cours.",
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
     "description": "Le cheval vient à la ferme une fois l'Écurie construite, attiré par un licol et des friandises fabriqués à l'Atelier (deux cordes, des carottes et des pommes) : une enceinte de murs avec une porte sur le dehors, son râtelier (Atelier) et 2 cases libres. Sa case de la barre d'outils te met en selle : tu vas 1,4 fois plus vite, sur la ferme comme dans tout le grand monde. Quand tu en descends, il rentre à l'Écurie. Chaque nuit il mange 2 paille s'il y en a. Le poteau d'attache et la corde de fibre (Atelier) ne servent pas encore : le cheval rentre toujours à l'Écurie.",
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
     "description": "Le premier bâtiment : il se construit avec 3 bois et 3 pierres, puis se pose sur la carte. On y fabrique les planches, les murs, les fenêtres, les portes, la paillasse, le plancher, le chemin, la barrière, l'escalier, les blocs clés des bâtiments, le four et la cuisinière, le puits, les appareils (panneau, pompe, citerne, batterie, avec des lingots), et tout ce qui ne s'achète pas : les outils (houe, hache, pioche, faux, canne à pêche), de quoi attirer les bêtes (le nid garni d'une poule, la pierre à sel et le foin d'un mouton ou d'une vache, le licol et les friandises du cheval), la ruche, le bac à fleurs, la boîte aux lettres d'une maison de villageois, la brouette, l'étal et le panneau du village. Ce qu'un artisan sait mieux faire viendra des commerces de l'île.",
     "liens": [
      "bois_et_pierre",
      "fibre",
      "mode_construire",
      "lingot",
      "outils",
      "meubles",
      "ruche",
      "cheval",
      "port"
     ],
     "decouverte": [
      "didacticiel:atelier"
     ]
    },
    {
     "id": "mode_construire",
     "terme": "Mode Construire",
     "description": "La case 🔨 de la barre d'outils : un menu sur le côté propose les blocs qu'on a en main ; un appui sur une case de la carte pose le bloc choisi, un appui sur un bloc posé le reprend (il revient dans l'inventaire). Un glissement du doigt pose toute une rangée de murs, de barrières ou de sol ; l'outil pièce (le carré au bout de la barre, un mur en main) pose d'un glissement, d'un coin à l'autre, tous les murs d'une pièce. S'il en manque, une fenêtre propose de les fabriquer sur place, avec les matériaux de l'inventaire, et de les poser. Le bouton ↶ annule la dernière opération ; la gomme reprend d'un glissement les blocs d'une même sorte. Un appui maintenu sur un bloc posé le prend en main (la pipette). Un meuble ou un bloc seul (lanterne, four, ruche…) se déplace d'un glissement. En construisant, la carte montre le mur qui manque à une enceinte, une enceinte sans porte, et ce qu'est chaque pièce (maison, bâtiment, ou ce qui la ferait devenir quelque chose). On ne bâtit que sur l'herbe libre : l'herbe haute se fauche d'abord, un rocher ou un arbre se casse ou s'abat. Un niveau au-dessus du sol sert à rehausser les murs ou à bâtir à l'étage.",
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
     "description": "La pièce close où l'on dort, avec une paillasse ou un lit. Tant qu'il n'existe pas, rien d'autre ne s'installe (panneau, pompe…). Il faut un couchage par membre de la famille, dans une pièce close : c'est là que chacun dort et que ton personnage reprend son énergie la nuit. Le personnage rentre au foyer le soir et en ressort le matin. Le premier couchage est le sien ; un appui sur un autre lit lui demande s'il le choisit : il y dormira, et le membre qui y dormait prend son ancien lit.",
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
     "id": "pas_japonais",
     "terme": "Pas japonais",
     "description": "Des pas d'ardoise, de pierre ou de bois, enfoncés dans l'herbe, pour dessiner les allées de la ferme. Ils se fabriquent à l'Atelier (deux pierres, ou deux bois, pour deux pas) et se posent dehors, sur l'herbe, comme le chemin : posés à la suite, ils suivent l'allée, un pas à droite, un pas à gauche, et se tournent quand elle tourne.",
     "liens": [
      "plancher_chemin",
      "mode_construire"
     ],
     "decouverte": [
      "objet:sol_pas_ardoise",
      "objet:sol_pas_pierre",
      "objet:sol_pas_bois"
     ]
    },
    {
     "id": "lanterne",
     "terme": "Lanterne scintillante",
     "description": "Un bloc qui éclaire autour de lui la nuit. Elle se fabrique à l'Atelier avec un champignon lumineux (il pousse dans les forêts du grand monde et luit la nuit) et deux bois, et se pose sur la ferme, dehors comme dans la maison.",
     "liens": [
      "atelier",
      "cristaux_lumineux",
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
     "description": "Chaises, tables, tapis, lits (adulte, enfant ; deux lits côte à côte font un lit deux places), tables de chevet, canapés, tables basses, tableaux, mais aussi buffet, commode, armoires, bas de cuisine, poubelle, bibliothèques, lampadaire, coffre à jouets et dix plantes vertes : sur l'île, le menuisier les fait (la scierie, un commerce) : commandés, ils entrent dans ta maison ; ils se posent dans la maison, et un villageois peut en acheter un pour la sienne, à l'étal ou au comptoir du menuisier. Chacun élève pour de bon le bonheur que vise la famille (voir « Bonheur »). Une grille aide à les placer ; les tableaux s'accrochent à un mur. Presque tous se tournent (en mode Construire, le bouton ↻) : de face, de dos ou de profil ; de profil, un meuble long (la table, le canapé, l'armoire) prend sa longueur vers le haut. Les lits, les tableaux et le réfrigérateur restent de face.",
     "liens": [
      "maison",
      "etal",
      "commerces"
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
     "terme": "Bacs à fleurs",
     "description": "Le bac rond, le bac carré et le bac long (sur deux cases) se fabriquent à l'Atelier (des planches, de la fibre, de la pierre) et se posent dehors comme un bloc. Un appui sur un bac vide y sème une graine de fleur (une seule espèce par bac) : on trouve ces graines, parfois, en cueillant les fleurs sauvages du grand monde. Elle fleurit en 3 nuits, sans arrosage ; la faux y coupe alors 2 à 3 fleurs, et le bac refleurit en 3 nuits, sans resemer. En fleurs, il attire les abeilles des ruches. Le pinceau du mode Construire le repeint, gratuitement : le bois naturel ou l'une des six couleurs des colorants.",
     "liens": [
      "abeilles",
      "ruche",
      "faux",
      "port"
     ],
     "decouverte": [
      "objet:bac_carre",
      "objet:bac_rond",
      "objet:bac_long"
     ]
    },
    {
     "id": "bassin",
     "terme": "Bassin",
     "description": "Son plan se trouve au marais (une collection de plans) ; une case de bassin se fabrique ensuite à l'Atelier (3 pierres) et se pose dehors comme un bloc. Les cases posées côte à côte se raccordent en un seul bassin, cerclé d'une margelle de pierre taillée : on en fait un carré, une longue allée d'eau, un L… Son eau bouge comme celle des étangs, des nénuphars y poussent tout seuls, et l'on ne marche pas dedans.",
     "liens": [
      "plans_ile",
      "mode_construire"
     ],
     "decouverte": [
      "objet:bassin"
     ]
    },
    {
     "id": "terrasse",
     "terme": "Terrasse",
     "description": "La table de jardin (des planches et de la fibre pour sa nappe), la chaise de jardin et le banc de jardin se fabriquent à l'Atelier et se posent dehors (l'onglet « Jardin » du mode Construire). Une chaise ou un banc qui touche la table est une place : c'est là que s'assoient tes invités quand tu les invites à un repas depuis le calendrier.",
     "liens": [
      "bac_a_fleurs"
     ],
     "decouverte": [
      "objet:table_jardin"
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
     "description": "Sur les plages du grand monde, au bord de l'eau, la mer laisse des coquillages (une coquille Saint-Jacques, parfois un bulot avec), des étoiles de mer et des algues : un appui dessus, le personnage va les ramasser à la main. La mer en rapporte d'autres quelques jours plus tard. Ils ne se mangent pas : ils se vendent au port.",
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
     "id": "vigne",
     "terme": "Vigne",
     "description": "Une culture pérenne de la Zone de culture : le plant de vigne se commande au port (le catalogue d'import, par 4, dès le niveau 6). Le pied grimpe le long de son tuteur et donne ses grappes de raisin noir au bout de 6 stades de croissance (un arrosage chacun) ; après la vendange (4 raisins), le pied reste dans sa parcelle, en feuillage, et refait ses grappes sans replanter : il repart de son stade 4 sur 6. Pour libérer la parcelle, la houe arrache une vigne qui n'est pas mûre.",
     "liens": [
      "potager"
     ],
     "decouverte": [
      "culture:vigne"
     ]
    },
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
     "description": "Arbre fruitier permanent du verger, planté dans le sol (un jeune arbre commandé au port). Porte 6 pommes 15 nuits après sa plantation, puis 3 nuits après chaque cueillette, toute l'année.",
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
     "description": "Arbre fruitier permanent du verger, planté dans le sol (un jeune arbre commandé au port). Porte 6 poires 15 nuits après sa plantation, puis 3 nuits après chaque cueillette, toute l'année.",
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
     "description": "Arbres fruitiers permanents du verger, comme le pommier et le poirier : un jeune arbre se commande au port et se plante dans le sol. Ils donnent cerises, abricots et pêches, et fleurissent avant de porter leurs fruits.",
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
      "port",
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
      "port",
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
      "port",
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
     "description": "Produit obtenu en tondant un mouton dont la laine est prête ; il se vend au port, et sert aux tapis, aux lits et au canapé (Atelier). Ne se consomme pas et ne périme jamais.",
     "liens": [
      "mouton",
      "port"
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
     "description": "Produit des ruches : une ruche pleine donne 3 pots de miel. Il se vend au port.",
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
     "description": "Ressource produite par le panneau solaire (de 7 h à 19 h), stockée dans la batterie, et consommée par la pompe, le moulin, les chaînes de production, le réfrigérateur et la station de charge du robot.",
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
     "description": "Monnaie du jeu, obtenue en vendant les surplus de la ferme au port (et en honorant les commandes du bac, à l'étal quand un villageois y achète), et dépensée au port : les semences, le catalogue d'import, les niveaux du port ; et pour les améliorations et les technologies.",
     "liens": [
      "port",
      "import",
      "etal"
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
     "description": "Ingrédient obtenu en pressant les graines de tournesol sur une chaîne de production (un entonnoir, la presse, un convoyeur), utilisé dans des recettes comme l'omelette ou la ratatouille.",
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
     "description": "Obtenues normalement en récoltant les cultures, elles permettent de replanter. Peuvent aussi être achetées au comptoir du port, en dépannage, mais à un prix plus élevé que la production ; elles vont droit à la ferme. Les arbres abattus laissent aussi leurs graines : la pomme de pin et le gland.",
     "liens": [
      "graines_d_arbre",
      "port"
     ],
     "decouverte": [
      "objet:graine_carotte",
      "didacticiel:graines"
     ]
    },
    {
     "id": "conserve",
     "terme": "Boîte de conserve",
     "description": "Aliment non périssable présent dès le début de la partie (40 boîtes), qui laisse le temps de lancer les premières cultures avant que la boîte à nourriture ne soit vide. Ne peut pas être racheté une fois épuisé. À ne pas confondre avec le bocal de légumes.",
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
     "description": "Stock illimité de tous les objets possédés par la ferme, rangés par lots selon leur récolte.",
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
     "description": "Les aliments et les plats ne se gâtent pas : ce que tu récoltes, cuisines ou ranges se garde, que tu reviennes le lendemain ou dans un mois. Chaque aliment a pourtant une durée de conservation (de 2 nuits pour le poisson frais à 12 nuits, 6 pour la plupart des plats), gardée pour une variante de jeu plus exigeante.",
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
     "description": "Plat préparé à la cuisine à partir de 4 légumes d'une même sorte et de 1 L d'eau ; ne périme pas. Débloqué par la technologie Mise en bocaux.",
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
     "description": "Plat préparé à la cuisine à partir d'œufs et de champignons ramassés à la main dans les forêts du grand monde.",
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
     "description": "Plat préparé à la cuisine à partir de châtaignes et de miel (ou de sucre, qu'on commande au port). Les châtaignes se cueillent sur les châtaigniers des forêts du grand monde.",
     "liens": [
      "cuisine",
      "miel",
      "import"
     ],
     "decouverte": [
      "objet:creme_marrons",
      "recette:creme_marrons"
     ]
    },
    {
     "id": "tarte_aux_myrtilles",
     "terme": "Tarte aux myrtilles",
     "description": "Plat cuit au four à partir de farine, de myrtilles et de miel (ou de sucre, qu'on commande au port). Les myrtilles se cueillent dans le grand monde.",
     "liens": [
      "four",
      "farine",
      "miel",
      "import"
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
     "description": "Les outils se fabriquent une fois chacun à l'Atelier (onglet Outils) : la houe, la hache, la pioche et la faux avec du bois, de la pierre et de la fibre, et la canne à pêche avec du bois, de la fibre et une pierre. On choisit celui qu'on tient dans la barre d'outils de la carte, puis on touche l'herbe, un arbre, un rocher, une touffe d'herbe haute, un minerai ou l'eau. Un appui maintenu sur le personnage qui tient un outil donne un coup fort : il tremble puis frappe quand on relâche ; la hache ou la pioche comptent 2 coups, la faux tournoie et fauche toute l'herbe haute autour de lui, la houe laboure les tuiles autour de lui. Chaque geste coûte de l'énergie et rapporte de l'XP. La branche Outils de l'Arbre des technologies les rend plus efficaces : moins de coups, plus de bois, de pierre, de minerai et de poisson, moins d'énergie.",
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
     "description": "Outil fabriqué une fois à l'Atelier. Pioche en main, un appui sur un rocher donne un coup : 3 énergie et 1 pierre. Le rocher se casse au 3e coup et revient 1 à 3 jours plus tard. Dans le grand monde, elle casse aussi les rochers, les gros blocs et les éboulis de la montagne. Un caillou (un rocher d'une seule case) se ramasse aussi à la main, sans pioche : un appui dessus, et 1 pierre va dans l'inventaire. Elle brise aussi les gisements (leur minerai) et les cristaux de la montagne.",
     "liens": [
      "outils",
      "bois_et_pierre",
      "gisements",
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
     "description": "Ressources de la carte : le bois tombe des arbres coupés à la hache, la pierre des rochers cassés à la pioche ; sur la ferme, on ramasse aussi à la main des petites pierres et des morceaux de bois. Ils ne périment pas et se vendent au port, mais servent surtout à l'Atelier (planches, murs, outils…), au chantier du port et à payer les technologies de l'Arbre des technologies ; le bois sert aussi au Four pour fondre les lingots. Un villageois au bois ou à la pierre en rapporte chaque jour.",
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
     "description": "Fer, cuivre, or et platine, que donnent les gisements brisés à la pioche : le fer et le cuivre sur la ferme et dans les prés, les forêts et les landes, l'or et le platine en montagne (il leur faut une pioche en fer, puis en or). Le minerai va dans l'inventaire ; c'est un matériau, qui ne se mange pas et ne se vend pas. Au Four, 4 minerais et du bois font un lingot.",
     "liens": [
      "gisements",
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
   "id": "mine",
   "icone": "🏙️",
   "nom": "Minerais & pêche",
   "entrees": [
    {
     "id": "gisements",
     "terme": "Gisements",
     "description": "Des tas de blocs de pierre veinés de métal, posés sur la ferme (des gisements de fer et de cuivre parmi ses gros rochers) et dans le grand monde : le fer et le cuivre dans les prés, les forêts et les landes, l'or et le platine en montagne. La pioche les brise en plus de coups qu'un rocher : chaque coup lâche une pierre, le dernier le minerai ; l'or demande une pioche en fer, le platine une pioche en or. Ils reviennent quelques jours plus tard. (La mine de la ferme et les grottes de la montagne d'autrefois ne sont plus.)",
     "liens": [
      "minerai",
      "pioche",
      "lingot",
      "cristaux_lumineux"
     ],
     "decouverte": [
      "objet:minerai_fer",
      "objet:minerai_cuivre"
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
     "id": "cristaux_lumineux",
     "terme": "Ce qui luit la nuit",
     "description": "Dans les forêts, des touffes de champignons lumineux, qu'on ramasse à la main (pour les lanternes et le casque à lampe) ; dans la montagne, des amas de cristaux de quartz et, plus haut, d'améthyste, que la pioche brise. Le jour, on les voit à peine ; la nuit, chacun luit de sa couleur : cyan, bleu pâle, violet. Ils repoussent quelques jours plus tard. On raconte qu'un grand amas d'améthyste, dans la montagne la plus proche, luit plus fort les nuits de pleine lune.",
     "liens": [
      "gisements",
      "quartz",
      "amethyste",
      "lanterne"
     ],
     "decouverte": [
      "objet:champignon_lumineux",
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
   "id": "trouvailles",
   "icone": "🔍",
   "nom": "Les trouvailles du naturaliste",
   "entrees": [
    {
     "id": "ammonite",
     "terme": "Ammonite fossile",
     "description": "Une coquille en spirale changée en pierre, il y a très, très longtemps : la montagne était alors le fond d'une mer. On la trouve en ramassant les cailloux des pentes et des éboulis de la montagne. Elle fait partie de la collection « Fossiles et cristaux ».",
     "liens": [
      "trilobite",
      "quartz",
      "b_montagne"
     ],
     "decouverte": [
      "objet:ammonite"
     ]
    },
    {
     "id": "trilobite",
     "terme": "Trilobite fossile",
     "description": "Une petite bête de la mer d'autrefois, couchée dans la roche avec ses trois bandes bien nettes. Les pentes de la montagne en cachent quelques-unes. Elle fait partie de la collection « Fossiles et cristaux ».",
     "liens": [
      "ammonite",
      "b_montagne"
     ],
     "decouverte": [
      "objet:trilobite"
     ]
    },
    {
     "id": "quartz",
     "terme": "Cristal de quartz",
     "description": "Un cristal clair comme de l'eau gelée, qui pousse dans les fentes de la roche. Dans la montagne, il pousse en amas qui luisent la nuit : la pioche les brise. Il fait partie de la collection « Fossiles et cristaux ».",
     "liens": [
      "amethyste",
      "b_montagne"
     ],
     "decouverte": [
      "objet:quartz"
     ]
    },
    {
     "id": "amethyste",
     "terme": "Améthyste",
     "description": "Le cousin violet du quartz, plus rare, plus haut dans la montagne : ses amas luisent en violet la nuit. Les vieux de la montagne disent qu'elle garde des mauvais rêves. Il fait partie de la collection « Fossiles et cristaux ».",
     "liens": [
      "quartz",
      "b_montagne"
     ],
     "decouverte": [
      "objet:amethyste"
     ]
    },
    {
     "id": "coquille",
     "terme": "Coquille Saint-Jacques",
     "description": "Une grande coquille en éventail, que la marée laisse sur le sable. On la ramasse en marchant sur la plage. Elle fait partie de la collection « Trésors de la plage ».",
     "liens": [
      "bulot",
      "perle",
      "b_plage"
     ],
     "decouverte": [
      "objet:coquille"
     ]
    },
    {
     "id": "bulot",
     "terme": "Bulot",
     "description": "Un coquillage en spirale, que la mer roule jusqu'au rivage. Sur la plage, il suffit de regarder ses pieds. Il fait partie de la collection « Trésors de la plage ».",
     "liens": [
      "coquille",
      "b_plage"
     ],
     "decouverte": [
      "objet:bulot"
     ]
    },
    {
     "id": "corail",
     "terme": "Branche de corail",
     "description": "Une petite branche rose, venue de loin sur les vagues. Rare sur la plage : le jour où on en trouve une, on s'en souvient. Elle fait partie de la collection « Trésors de la plage ».",
     "liens": [
      "perle",
      "b_plage"
     ],
     "decouverte": [
      "objet:corail"
     ]
    },
    {
     "id": "perle",
     "terme": "Perle",
     "description": "La plus rare des trouvailles de la plage : une perle ronde et douce, cachée dans le sable mouillé. Elle fait partie de la collection « Trésors de la plage ».",
     "liens": [
      "coquille",
      "corail",
      "b_plage"
     ],
     "decouverte": [
      "objet:perle"
     ]
    },
    {
     "id": "champignon",
     "terme": "Champignon",
     "description": "Le chapeau brun des sous-bois, après la pluie. On le cueille dans la forêt. Il se mange, et fait partie de la collection « Cueillette des sous-bois ».",
     "liens": [
      "myrtille",
      "chataigne",
      "b_foret"
     ],
     "decouverte": [
      "objet:champignon"
     ]
    },
    {
     "id": "myrtille",
     "terme": "Myrtille",
     "description": "De petites baies bleues, sucrées, qui tachent les doigts. Les buissons de la forêt en sont couverts. Elle fait partie de la collection « Cueillette des sous-bois ».",
     "liens": [
      "champignon",
      "b_foret"
     ],
     "decouverte": [
      "objet:myrtille"
     ]
    },
    {
     "id": "chataigne",
     "terme": "Châtaigne",
     "description": "Bien à l'abri dans sa bogue piquante, elle pousse sur les châtaigniers des forêts du grand monde (un grand arbre au feuillage sombre, piqué de bogues brunes ouvertes) : à la main, on en cueille 3 à 5, et l'arbre en porte de nouveau 4 à 7 jours plus tard ; la hache l'abat, comme un autre arbre. Grillée, c'est un régal. Elle fait partie de la collection « Cueillette des sous-bois ».",
     "liens": [
      "champignon",
      "b_foret"
     ],
     "decouverte": [
      "objet:chataigne"
     ]
    },
    {
     "id": "herbes_montagne",
     "terme": "Herbes de montagne",
     "description": "Des herbes parfumées qui poussent entre les pierres de la montagne. Les vaches qui en mangent donnent un lait d'alpage. Elles font partie de la collection « Cueillette des sous-bois ».",
     "liens": [
      "b_montagne"
     ],
     "decouverte": [
      "objet:herbes_montagne"
     ]
    }
   ]
  },
  {
   "id": "poissons",
   "icone": "🐟",
   "nom": "Les poissons",
   "entrees": [
    {
     "id": "truite",
     "terme": "Truite",
     "description": "Le poisson le plus commun des eaux douces : l'étang et la mare de la ferme, les rivières et les lacs. Tachetée, vive, elle mord volontiers. Elle fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "brochet",
      "omble"
     ],
     "decouverte": [
      "objet:truite"
     ]
    },
    {
     "id": "brochet",
     "terme": "Brochet",
     "description": "Le grand chasseur de l'étang, au long museau. Il est rare dans la mare, plus courant dans l'étang de la ferme. Il fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "truite"
     ],
     "decouverte": [
      "objet:brochet"
     ]
    },
    {
     "id": "omble",
     "terme": "Omble chevalier",
     "description": "Un poisson des lacs froids, au ventre rouge. Pour le pêcher, il faut aller jusqu'aux lacs du grand monde. Il fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "b_lac"
     ],
     "decouverte": [
      "objet:omble"
     ]
    },
    {
     "id": "goujon",
     "terme": "Goujon",
     "description": "Un petit poisson de rivière, qui file au ras des cailloux. On en pêche dans les rivières du grand monde. Il fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "b_riviere"
     ],
     "decouverte": [
      "objet:goujon"
     ]
    },
    {
     "id": "dorade",
     "terme": "Dorade",
     "description": "Un poisson de mer au reflet doré sur la tête. On le pêche depuis la côte, en lançant vers le large. Il fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "b_mer"
     ],
     "decouverte": [
      "objet:dorade"
     ]
    },
    {
     "id": "sardine",
     "terme": "Sardine",
     "description": "Elle nage en bancs serrés le long de la côte : quand la mer en est pleine, ça mord sans arrêt. Elle fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "anchois",
      "b_mer"
     ],
     "decouverte": [
      "objet:sardine"
     ]
    },
    {
     "id": "anchois",
     "terme": "Anchois",
     "description": "Un tout petit poisson de mer, cousin de la sardine. Salé, il relève les plats. Il fait partie de la collection « Poissons d'ici ».",
     "liens": [
      "peche",
      "sardine",
      "b_mer"
     ],
     "decouverte": [
      "objet:anchois"
     ]
    }
   ]
  },
  {
   "id": "biomes",
   "icone": "🗺️",
   "nom": "Les paysages du grand monde",
   "entrees": [
    {
     "id": "b_mer",
     "terme": "La mer",
     "description": "Au bord du monde, la mer : on ne la traverse pas, mais on pêche depuis la côte la dorade, la sardine et l'anchois. Les mouettes tournent au-dessus, et les dauphins passent parfois au large.",
     "liens": [
      "b_plage",
      "dorade"
     ],
     "decouverte": [
      "biome:mer"
     ]
    },
    {
     "id": "b_plage",
     "terme": "La plage",
     "description": "Une bande de sable entre la prairie et la mer. La marée y laisse des trésors : coquilles, bulots, corail et, rarement, une perle. Les crabes y courent de travers.",
     "liens": [
      "coquille",
      "perle",
      "b_mer"
     ],
     "decouverte": [
      "biome:plage"
     ]
    },
    {
     "id": "b_falaise",
     "terme": "La falaise",
     "description": "Là où la terre tombe à pic dans la mer. On n'y descend pas, mais la vue y est la plus belle du monde.",
     "liens": [
      "b_mer",
      "b_montagne"
     ],
     "decouverte": [
      "biome:falaise"
     ]
    },
    {
     "id": "b_prairie",
     "terme": "La prairie",
     "description": "Le pays de la ferme : de l'herbe à perte de vue, des fleurs, des chemins.",
     "liens": [
      "b_foret",
      "b_lande"
     ],
     "decouverte": [
      "biome:prairie"
     ]
    },
    {
     "id": "b_foret",
     "terme": "La forêt",
     "description": "De grands arbres, des sous-bois frais, des buissons couverts de baies. On y cueille champignons, myrtilles et châtaignes ; chevreuils, renards et écureuils y vivent.",
     "liens": [
      "champignon",
      "myrtille",
      "chataigne"
     ],
     "decouverte": [
      "biome:foret"
     ]
    },
    {
     "id": "b_marais",
     "terme": "Le marais",
     "description": "Une terre mouillée, pleine de roseaux et de chants de grenouilles. Les canards et les cygnes l'aiment beaucoup.",
     "liens": [
      "b_lac",
      "b_riviere"
     ],
     "decouverte": [
      "biome:marais"
     ]
    },
    {
     "id": "b_lande",
     "terme": "La lande",
     "description": "Une terre rase, balayée par le vent, couverte de bruyère. Les lièvres et les perdrix y vivent cachés.",
     "liens": [
      "b_prairie",
      "b_montagne"
     ],
     "decouverte": [
      "biome:lande"
     ]
    },
    {
     "id": "b_montagne",
     "terme": "La montagne",
     "description": "Des pentes, des rochers, des éboulis : c'est là qu'on trouve les fossiles, les cristaux et les herbes de montagne. Marmottes, bouquetins et aigles y vivent.",
     "liens": [
      "ammonite",
      "quartz",
      "herbes_montagne",
      "b_sommet"
     ],
     "decouverte": [
      "biome:montagne"
     ]
    },
    {
     "id": "b_sommet",
     "terme": "Le sommet",
     "description": "Le plus haut du monde, au-dessus de la montagne. On n'y monte pas, mais on le voit de partout.",
     "liens": [
      "b_montagne"
     ],
     "decouverte": [
      "biome:sommet"
     ]
    },
    {
     "id": "b_lac",
     "terme": "Le lac",
     "description": "Une grande eau calme, au milieu des terres. L'omble chevalier y vit, et la truite aussi.",
     "liens": [
      "omble",
      "b_riviere"
     ],
     "decouverte": [
      "biome:lac"
     ]
    },
    {
     "id": "b_riviere",
     "terme": "La rivière",
     "description": "L'eau qui court de la montagne à la mer. On la passe aux gués ; on y pêche la truite et le goujon.",
     "liens": [
      "goujon",
      "truite",
      "b_lac"
     ],
     "decouverte": [
      "biome:riviere"
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
     "description": "Une seule carte, vingt fois la ferme : la ferme est posée au milieu, dans une prairie, et le pays s'étend tout autour, fermé par la montagne au nord et à l'ouest, par la mer au sud et à l'est. Les prés entourent la ferme ; plus loin, les forêts profondes (feuillus, bouleaux, sapins, ronciers), les marais (saules, roseaux, eau basse), la lande (bruyère, ajoncs, pins tordus), la montagne et ses éboulis, les sommets enneigés et leurs falaises, la côte et ses plages de sable ou de galets. Des rivières descendent de la montagne à la mer, parfois par un lac. Chaque biome a ses plantes à récolter, ses bêtes, et ses lieux : le port au bout du chemin, des gisements et des cristaux qui luisent la nuit dans la montagne, des coins de pêche sur l'eau. Tout est caché sous le brouillard au départ.",
     "liens": [
      "chemins_et_gues",
      "brouillard",
      "carte_du_monde",
      "recolte_du_monde",
      "port",
      "gisements",
      "cristaux_lumineux",
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
     "description": "Le chemin de la ferme part de la porte de l'abri et sort à l'est ; de là, un chemin mène au port. Ces chemins sont à toi : en mode Construire, tu en poses, tu en reprends, tu les déplaces, sur la ferme comme dehors (pas dans l'eau profonde, ni sur une falaise ou un sommet, ni autour du port). Sur un chemin, on va 100 % plus vite, à pied comme à cheval. On marche partout sur la terre ferme, mais ni sur la mer, ni sur un lac, ni sur une falaise ou un sommet ; une rivière se passe à gué, là où un chemin la croise, ou sur un pont de planches que tu poses. Les arbres, les rochers et les murs ferment leurs cases ; jamais un chemin.",
     "liens": [
      "grand_monde",
      "chemin_port",
      "port",
      "boussole"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "brouillard",
     "terme": "Le brouillard",
     "description": "Tout est caché au départ, ta ferme comprise : seuls les alentours de ton personnage sont dégagés. Partout ailleurs, un brouillard blanc couvre le pays, et rien de ce qu'il cache ne se devine — ni les arbres, ni les bêtes, ni le port au loin. Il se lève autour de toi à mesure que tu marches, et ce que tu as vu le reste. Tu vois plus loin en hauteur, dans la montagne et sur les sommets (18 à 22 cases), et à découvert, sur la lande et la côte (15 cases), qu'au milieu des prés (12 cases) ; bien moins dans la forêt dense (7 cases) et le marais (9 cases), et deux fois moins la nuit. Ce que tu as vu s'inscrit sur la carte du monde.",
     "liens": [
      "carte_du_monde",
      "boussole",
      "port",
      "grand_monde"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "carte_du_monde",
     "terme": "La carte du monde",
     "description": "Elle s'ouvre par le menu (« Carte du monde »), la touche M au clavier ou un appui sur la boussole. Elle montre, en petit, tout ce que tu as vu du grand monde — les prés, les forêts, les marais, la lande, la montagne, la côte, les rivières et les lacs, tes chemins, ta ferme, le port — et laisse le reste dans le brouillard. Les lieux que tu as découverts y ont leur icône, comme les coins de pêche ; tu y vois aussi ta position et ta direction. Fais-la glisser du doigt ou à la souris, zoome à deux doigts, à la molette ou avec les boutons ; touche un lieu pour lire son nom et sa distance, et choisis-le pour que la boussole t'y mène.",
     "liens": [
      "brouillard",
      "boussole",
      "port"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "boussole",
     "terme": "La boussole",
     "description": "Une petite boussole de laiton, en haut à droite de l'écran, sous l'horloge : son aiguille rouge montre la ferme, ou le lieu que tu as choisi sur la carte du monde, et dessous s'affichent son nom et sa distance en cases. Sur la ferme, quand aucun lieu n'est choisi, elle se cache ; en début de partie, tant que le foyer n'est pas bâti, elle y montre l'Atelier (ou, avant lui, le point de départ) dès qu'on s'en éloigne pour ramasser. Arrivé au lieu choisi, elle montre de nouveau la ferme. Un appui sur elle ouvre la carte du monde ; les Options la retirent de l'écran.",
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
     "description": "Jauge de 0 à 100, plus l'endurance (⚡ dans le bandeau), que dépense chaque action faite au clic : couper 3, piocher 3, pêcher 4, labourer 5, planter 3, arroser 2, récolter 4, cueillir 4, tondre 8, cuisiner 3, cuire au four 3, moudre 1 par blé, presser 1. À 0, plus d'action au clic jusqu'à un en-cas ou une nuit de sommeil. Au réveil, elle remonte à 100 % de la jauge, s'il a un lit dans une pièce close, même si la nuit est venue sans qu'il soit allé se coucher. Le bonheur de la famille, les technologies et l'équipement réduisent ses coûts, jamais sous 40 % du coût de base ; les automatisations n'en dépensent pas.",
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
     "description": "Énergie gagnée avec les niveaux : la jauge du personnage grandit de 5 par niveau au-delà du premier (100 au niveau 1, 145 au niveau 10).",
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
     "description": "Valeur de 0 à 100 pour chaque membre de la famille (60 au départ). Chaque nuit, il fait 25 % du chemin vers sa cible : 40, plus les meubles de la maison (le bonheur de chacun, jusqu'à 30 en tout), plus les plats mangés dans la journée : chacun des 3 meilleurs plats différents ajoute 3 (Cuisine) ou 5 (Four), +2 avec de l'huile ou un fruit, +4 avec du cacao, du café ou de la vanille ; les aliments crus ne donnent rien. Une table variée ajoute encore +4 à partir de 4 plats différents dans la journée, +8 à partir de 6. La nuit, il ne fait que monter : ni la faim, ni une nuit sans paillasse, ni ton absence ne le font baisser. De bons repas et une maison meublée le portent plus haut. Le bonheur moyen réduit les coûts d'énergie du personnage : jusqu'à moitié prix à 100 de bonheur.",
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
     "terme": "Les paliers de l'île",
     "description": "7 paliers, sans histoire à lire : S'installer, La première vente au port, Le premier villageois, Les bêtes, Trois villageois au travail, Le premier commerce, puis Un village de dix. Chacun a ses objectifs (la fenêtre « L'île », dans le menu, les coche) ; tous remplis, le palier est franchi : une notification, de l'expérience, des points de technologie, un palier de l'Arbre des technologies et sa récompense (des plans de meubles de collection, du décor) tombent aussitôt. Le dernier ouvre le jeu libre : agrandir le port, accueillir, bâtir le village.",
     "liens": [
      "points_technologie",
      "niveaux",
      "port",
      "villageois",
      "commerces",
      "vocations"
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
     "id": "usure",
     "terme": "Usure",
     "description": "Les appareils électriques (panneau, batterie, pompe, moulin, réfrigérateur) ne s'usent pas et ne tombent pas en panne : ils tournent tant qu'ils ont du courant. L'usure, avec son entretien et ses réparations, est gardée pour une variante de jeu plus exigeante.",
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
     "description": "Bouton marche/arrêt présent sur chaque appareil électrique, qui permet de le couper pour qu'il ne consomme pas d'énergie inutilement.",
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
     "description": "Monnaie de l'Arbre des technologies (PT), en plus des pièces et des ressources. On en gagne à chaque chapitre terminé (2, 3, 3, 4, 4, 5 puis 5), à six jalons de maîtrise (2 000 L pompés, 10 plats différents, 50 pains, 40 laines, 40 nuits jouées, 5 repas partagés avec des invités) et, en jeu libre, 1 point toutes les 5 nuits.",
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
     "description": "Technologie Délestage intelligent : sous 10 % de charge de la batterie, le Moulin, les chaînes de production et la Pompe sont suspendus pour garder l'électricité du réfrigérateur ; ils repartent seuls quand la charge remonte.",
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
     "description": "Technologie de l'Arbre des technologies : chaque nuit, tout appareil usé à 70 % ou plus est entretenu au prix normal si les pièces suffisent. Les appareils ne s'usant plus, elle ne sert que dans une variante de jeu plus exigeante.",
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
     "description": "Quand le jeu est fermé, la ferme continue de tourner pendant 8 heures au plus : le panneau charge la batterie (si l'horloge s'est arrêtée entre 7 h et 19 h), la pompe remplit le réservoir, les ateliers finissent leurs préparations. Aucune nuit ne passe (une nuit déjà commencée se termine) et l'horloge s'arrête. Rien ne se perd pendant ton absence : les aliments ne se gâtent pas, les plantes attendent d'être arrosées ou récoltées, les bêtes pas nourries ne produisent rien mais restent, le bonheur de la famille ne baisse pas. Au retour, la fenêtre « Ravi de te revoir ! » donne la date, l'argent et les biens produits pendant l'absence.",
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
      "usure",
      "peremption",
      "paille"
     ],
     "decouverte": [
      "depart"
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
     "description": "On arrive seul, ou en famille : « Seul », un adulte et rien d'autre ; « En famille », de 1 à 6 membres, dont au moins un adulte, un compagnon si tu veux, des enfants et jusqu'à trois chiens ou chats. Tout se compose avant la première journée (nom de famille, membres, personnage principal), puis à tout moment dans la fenêtre Famille (carte du joueur, en haut à gauche). Chacun a un prénom, un sexe, une coiffure (cinq par âge, dont blond) et une couleur de peau au choix. Un nouveau membre arrive avec le bonheur moyen de la famille. La famille se nourrit de la ferme ; les villageois, eux, viennent par le bac et vivent dans leur maison.",
     "liens": [
      "adulte",
      "enfant",
      "animal_de_compagnie",
      "apport_journalier",
      "bonheur",
      "maison",
      "villageois"
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
     "description": "Un casque jaune, une lampe au front, fabriqué à l'Atelier avec deux lingots de fer, un lingot de cuivre et deux champignons lumineux (dès le niveau du Four). Sur la tête du personnage principal, la nuit, dans le grand monde, il voit plus loin (150 % du rayon). Pour les adultes seulement.",
     "liens": [
      "equipement",
      "cristaux_lumineux",
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
     "description": "Des gants de tissu de laine. Le personnage principal dépense 20 % d'énergie de moins pour couper (la hache) et piocher (la pioche). Pour les adultes seulement. Ils viendront d'un commerce de l'île.",
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
     "description": "Une salopette de laine épaisse aux boucles de fer. Le personnage principal dépense 8 % d'énergie de moins pour tous ses gestes. Pour les adultes seulement. Elle viendra d'un commerce de l'île.",
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
     "description": "Un manteau de laine rouge au col fourré. Loin de la ferme, dans le vent et le froid du grand monde, le personnage principal dépense 15 % d'énergie de moins pour tous ses gestes. Il existe en taille enfant. Il viendra d'un commerce de l'île.",
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
    }
   ]
  }
 ]
};
