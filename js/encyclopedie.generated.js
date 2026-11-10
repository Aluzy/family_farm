// FICHIER GÉNÉRÉ par scripts/build-encyclopedie.mjs à partir de encyclopedie_ferme_familiale.json.
// Ne pas le modifier : changer le fichier JSON, puis lancer
//   node scripts/build-encyclopedie.mjs
// (sans les textes des pages : js/encyclopedie-textes.generated.js, chargé à l'ouverture du livre)
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
     "liens": [
      "abeilles",
      "ruche",
      "faux",
      "comptoir"
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
     "liens": [
      "plans_collection",
      "mode_construire"
     ],
     "decouverte": [
      "objet:bassin"
     ]
    },
    {
     "id": "terrasse",
     "terme": "Terrasse",
     "liens": [
      "invitation_repas",
      "bac_a_fleurs"
     ],
     "decouverte": [
      "objet:table_jardin"
     ]
    },
    {
     "id": "graines_d_arbre",
     "terme": "Pomme de pin et gland",
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
   "nom": "Minerais & pêche",
   "entrees": [
    {
     "id": "gisements",
     "terme": "Gisements",
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
   "id": "secrets",
   "icone": "🗝️",
   "nom": "Les secrets du monde",
   "entrees": [
    {
     "id": "s_ruine",
     "terme": "Les vieilles ruines",
     "liens": [
      "s_cairn",
      "s_pierre_levee",
      "carnet_voyageur_1"
     ],
     "decouverte": [
      "secret:ruine"
     ]
    },
    {
     "id": "s_cairn",
     "terme": "Les cairns",
     "liens": [
      "s_belvedere",
      "s_ruine"
     ],
     "decouverte": [
      "secret:cairn"
     ]
    },
    {
     "id": "s_arbre_ancien",
     "terme": "Les arbres anciens",
     "liens": [
      "s_ruine",
      "b_foret"
     ],
     "decouverte": [
      "secret:arbre_ancien"
     ]
    },
    {
     "id": "s_belvedere",
     "terme": "Les belvédères",
     "liens": [
      "s_cairn",
      "b_montagne"
     ],
     "decouverte": [
      "secret:belvedere"
     ]
    },
    {
     "id": "s_pierre_levee",
     "terme": "Les pierres levées",
     "liens": [
      "s_ruine",
      "carnet_voyageur_4"
     ],
     "decouverte": [
      "secret:pierre_levee"
     ]
    },
    {
     "id": "carnet_voyageur_1",
     "terme": "Carnet du voyageur, page 1",
     "liens": [
      "carnet_voyageur_2",
      "s_ruine"
     ],
     "decouverte": [
      "secret:carnet_voyageur_1"
     ]
    },
    {
     "id": "carnet_voyageur_2",
     "terme": "Carnet du voyageur, page 2",
     "liens": [
      "carnet_voyageur_3",
      "s_cairn"
     ],
     "decouverte": [
      "secret:carnet_voyageur_2"
     ]
    },
    {
     "id": "carnet_voyageur_3",
     "terme": "Carnet du voyageur, page 3",
     "liens": [
      "carnet_voyageur_4",
      "s_arbre_ancien"
     ],
     "decouverte": [
      "secret:carnet_voyageur_3"
     ]
    },
    {
     "id": "carnet_voyageur_4",
     "terme": "Carnet du voyageur, page 4",
     "liens": [
      "carnet_voyageur_5",
      "s_pierre_levee"
     ],
     "decouverte": [
      "secret:carnet_voyageur_4"
     ]
    },
    {
     "id": "carnet_voyageur_5",
     "terme": "Carnet du voyageur, page 5",
     "liens": [
      "carnet_voyageur_6",
      "s_belvedere"
     ],
     "decouverte": [
      "secret:carnet_voyageur_5"
     ]
    },
    {
     "id": "carnet_voyageur_6",
     "terme": "Carnet du voyageur, page 6",
     "liens": [
      "carnet_voyageur_7"
     ],
     "decouverte": [
      "secret:carnet_voyageur_6"
     ]
    },
    {
     "id": "carnet_voyageur_7",
     "terme": "Carnet du voyageur, page 7",
     "liens": [
      "carnet_voyageur_8"
     ],
     "decouverte": [
      "secret:carnet_voyageur_7"
     ]
    },
    {
     "id": "carnet_voyageur_8",
     "terme": "Carnet du voyageur, page 8",
     "liens": [
      "carnet_voyageur_1"
     ],
     "decouverte": [
      "secret:carnet_voyageur_8"
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
     "liens": [
      "hameaux",
      "bonheur",
      "metiers",
      "comptoir",
      "amitie"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "amitie",
     "terme": "L'amitié",
     "liens": [
      "habitants",
      "hameaux"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "invitation_repas",
     "terme": "Inviter à un repas",
     "liens": [
      "amitie",
      "calendrier_lune",
      "terrasse"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "styles",
     "terme": "Styles d'aménagement",
     "liens": [
      "invitation_repas",
      "meubles",
      "mode_construire"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "plans_collection",
     "terme": "Plans de collection",
     "liens": [
      "styles",
      "invitation_repas",
      "terrasse"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "projets_hameaux",
     "terme": "Projets des hameaux",
     "liens": [
      "hameaux",
      "habitants",
      "amitie"
     ],
     "decouverte": [
      "hameau"
     ]
    },
    {
     "id": "metiers",
     "terme": "Les métiers des hameaux",
     "liens": [
      "habitants",
      "hameaux",
      "comptoir",
      "gisements",
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
     "id": "philomene",
     "terme": "Philomène",
     "liens": [
      "maurice",
      "frida",
      "adele"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "adele",
     "terme": "Adèle",
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
     "liens": [
      "les_genets",
      "promesses",
      "commerce",
      "lise"
     ],
     "decouverte": [
      "fait:visite.genets",
      "fait:promesse.toit_garance.commencee",
      "fait:garance.rencontre"
     ]
    },
    {
     "id": "lise",
     "terme": "Lise",
     "liens": [
      "garance",
      "les_genets"
     ],
     "decouverte": [
      "fait:lise.rencontre"
     ]
    },
    {
     "id": "le_gue",
     "terme": "Le Gué",
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
     "liens": [
      "fete_premiers",
      "gisements"
     ],
     "decouverte": [
      "fait:visite.brumeval",
      "fait:fete.annonce"
     ]
    },
    {
     "id": "bois_joli",
     "terme": "Bois-Joli",
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
     "terme": "La barque des premiers arrivants",
     "liens": [
      "les_mouettes"
     ],
     "decouverte": [
      "fait:lieu.epave"
     ]
    },
    {
     "id": "cabane_johnny",
     "terme": "L'observatoire de Maurice",
     "liens": [],
     "decouverte": [
      "fait:lieu.cabane"
     ]
    },
    {
     "id": "atelier_frida",
     "terme": "L'atelier de Frida",
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
     "terme": "Les petits travaux de Maurice",
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
     "liens": [
      "calendrier_lune",
      "frida"
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
     "liens": [
      "chemins_et_gues",
      "brouillard",
      "carte_du_monde",
      "recolte_du_monde",
      "hameaux",
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
     "liens": [
      "points_technologie",
      "niveaux",
      "gisements",
      "lingot",
      "hameaux",
      "cristaux_lumineux",
      "comptoir",
      "grand_monde",
      "plans_collection"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "niveaux",
     "terme": "Niveaux",
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
     "liens": [
      "adulte",
      "enfant",
      "animal_de_compagnie",
      "apport_journalier",
      "bonheur",
      "maison"
     ],
     "decouverte": [
      "depart"
     ]
    },
    {
     "id": "personnage_principal",
     "terme": "Personnage principal",
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
