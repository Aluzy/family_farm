// FICHIER GÉNÉRÉ par scripts/build-data.mjs à partir de data/*.json.
// Ne pas le modifier : changer les fichiers JSON, puis lancer
//   node scripts/build-data.mjs
// (GitHub le régénère aussi à chaque mise en ligne.)
// Les valeurs sont celles des fichiers, avant les calculs du chargement (prix
// de production doublés, temps de cuisson, plats) : voir buildCatalog() dans
// js/engine/catalog.js, qui en fait DATA.
export const RAW_DATA = {
  "DEPART": {
    "PIECES": 1500,
    "PIECES_SAUVAGE": 300,
    "INVENTAIRE": { "conserve": 40 },
    "MAISON": 650,
    "ACHATS": { "panneau": 150, "batterie": 180, "pompe": 90, "reservoir": 50 },
    "NOM": "Martin",
    "NOM_MIN": 2,
    "NOM_MAX": 20,
    "ETAT_INITIAL": { "PIECES": 350, "INVENTAIRE": { "conserve": 160, "graine_carotte": 10, "patate": 6, "graine_tomate": 4 } },
    "PRIX_APPAREIL": 0
  },
  "TEMPS": {
    "HEURE_REVEIL": 6,
    "SECONDES_HEURE_MARCHE": 30,
    "SECONDES_PAR_HEURE": 30,
    "EVEIL_MIN_S": 30,
    "HEURE_NUIT": 22,
    "SECONDES_PAR_HEURE_SOMMEIL": 3,
    "POUSSE_HEURES": 24,
    "ARROSAGE_HEURE": 7,
    "ARROSAGE_S": 9
  },
  "FAMILLE": {
    "MEMBRES": [
      { "id": "adulte-1", "nom": "Adulte 1", "enfant": false, "genre": "f" },
      { "id": "adulte-2", "nom": "Adulte 2", "enfant": false, "genre": "m" },
      { "id": "enfant-1", "nom": "Enfant 1", "enfant": true, "genre": "m" },
      { "id": "enfant-2", "nom": "Enfant 2", "enfant": true, "genre": "f" }
    ],
    "PROFIL": {
      "PRENOM_MAX": 12,
      "GENRES": ["f", "m"],
      "TEINTS": ["", "🏻", "🏼", "🏽", "🏾", "🏿"],
      "PORTRAITS": { "adulte": { "f": "👩", "m": "👨" }, "enfant": { "f": "👧", "m": "👦" } },
      "STYLES": { "adulte": ["", "🦰", "🦱", "🦳", "👱"], "enfant": ["", "🦰", "🦱", "🧢", "👱"] },
      "STYLE_NOMS": {
        "adulte": ["Classique", "Roux", "Frisé", "Cheveux gris", "Blond"],
        "enfant": ["Classique", "Roux", "Frisé", "Casquette", "Blond"]
      },
      "PERSOS": 50,
      "PERSO_DEFAUT": { "f": 1, "m": 7 },
      "PERSOS_ENFANT": 50,
      "PERSO_DEFAUT_ENFANT": { "f": 2, "m": 1 }
    },
    "AJ": { "adulte": 50, "enfant": 25 },
    "COMPOSITION": { "MEMBRES_MIN": 1, "MEMBRES_MAX": 6, "ADULTES_MIN": 1 },
    "COMPAGNIE": { "MAX": 3, "ESPECES": { "chien": { "nom": "Chien", "icone": "🐶" }, "chat": { "nom": "Chat", "icone": "🐱" } } },
    "FAIM": { "MAX": 100, "SEUIL": 20, "PX_PAR_POINT": 100, "AIDE": 5 },
    "HORAIRE": { "COUCHER_ENFANTS": 20, "LEVER_ENFANTS": 8, "FIN_TRAVAIL_ADULTES": 19, "COUCHER_ADULTES": 22 },
    "RESERVE_DEPART": {}
  },
  "COMPAGNON": {
    "HEURES": [8, 18],
    "ABSENCE_S": 60,
    "FAIM_MIN": 30,
    "ARROSER": { "PAR_FOIS": 3, "PAR_JOUR": 6, "ECART_H": 3, "FAIM": 2 },
    "CUISINER": {
      "PAR_JOUR": 1,
      "ECART_H": 4,
      "FAIM": 4,
      "FAIM_FAMILLE": 70,
      "RECETTES": [
        "soupe_legumes",
        "ratatouille",
        "omelette",
        "omelette_champignons",
        "poisson_grille",
        "raclette",
        "salade_tomates",
        "riz_au_lait",
        "compote"
      ]
    },
    "RAMASSER": { "PAR_JOUR": 3, "ECART_H": 2, "FAIM": 2, "RAYON": 24, "SORTES": ["morceau_bois", "petite_pierre"] }
  },
  "ROBOT": {
    "HEURE": 6,
    "MINUTES": 4,
    "VITESSE": 0.5,
    "BASE": [32.9, 16.1],
    "SERRE": [48.9, 17.6],
    "BATTERIE": { "TACHES": 35, "WH_TACHE": 60, "CHARGE_WH_S": 25, "REPRISE": 100, "PALIER_PCT": 5, "PALIER_PRIX": 1500, "PALIERS_MAX": 20 }
  },
  "PERSONNAGE": {
    "MAX": 100,
    "COUTS": {
      "ramasser": 1,
      "fabriquer": 1,
      "couper": 3,
      "piocher": 3,
      "faucher": 3,
      "pecher": 4,
      "labourer": 5,
      "planter": 3,
      "arroser": 2,
      "recolter": 4,
      "cueillir": 4,
      "tondre": 8,
      "cuisiner": 3,
      "cuireFour": 3,
      "moudre": 1,
      "presser": 1
    },
    "BONHEUR_REDUCTION": 50,
    "ENDURANCE": 3,
    "REVEIL_BASE": 60,
    "REVEIL_REPAS": 40,
    "MANGER_DIVISEUR": 5,
    "MANGER_BONUS": 10,
    "SOMMEIL_HEURES": 8
  },
  "MARCHE": { "PLANCHER": { "defaut": 120, "graine": 200 }, "PAS": 10, "MULTIPLICATEUR_PRODUCTION": 2, "TRANSFORMATIONS_DOUBLEES": ["farine"] },
  "AUTONOMIE": { "HISTORIQUE_MAX": 1000, "GRAPHIQUE_NUITS": 20 },
  "HORS_LIGNE": { "MAX_S": 28800, "PAS_S": 5, "USURE": false, "ECRAN_S": 60 },
  "AIDE": { "ETAPES": ["eau", "potager", "dormir"] },
  "DIDACTICIEL": { "GRAINES": { "graine_carotte": 6 }, "LABOURS": 3, "SAC": { "objet": "sac_petit", "provisions": { "baies": 4 } } },
  "BONHEUR": {
    "DEPART": 60,
    "MAX": 100,
    "DECLIN": -5,
    "PLATS": { "cuisine": 3, "four": 5 },
    "HUILE_FRUIT": 2,
    "SPECIALES": { "objets": ["cacao", "cafe", "vanille"], "bonus": 4 },
    "PLATS_MAX": 3,
    "FAIM": -2,
    "BULLE": 5
  },
  "NIVEAU_MAX": 5,
  "RESEAU": {
    "panneau": { "whParS": [40, 90, 160, 260, 400], "prixNiveaux": [0, 150, 400, 900, 2000] },
    "batterie": { "wh": [6000, 15000, 30000, 60000, 100000], "pleine": 98, "prixNiveaux": [0, 180, 450, 1000, 2200] },
    "pompe": { "litresParS": [1, 2, 4, 6, 10], "prixNiveaux": [0, 100, 250, 600, 1300] },
    "reservoir": { "litres": [40, 80, 160, 300, 500], "prixNiveaux": [0, 120, 300, 700, 1500] }
  },
  "SOLEIL": { "DEBUT": 7, "FIN": 19 },
  "POMPE": { "WH_PAR_L": 10 },
  "USURE": { "HEURES_PAR_POINT": 2, "DIVISEUR_RENDEMENT": 200, "SEUIL_ENTRETIEN": 70, "PANNE": 100, "TAUX_ENTRETIEN": 20, "TAUX_REPARATION": 50 },
  "FRIGO": {
    "PRIX_CONSTRUCTION": 600,
    "BASE_WH_S": 0,
    "PAR_UNITE_MWH_S": 100,
    "CAPACITE": [25, 40, 60, 90, 120],
    "PRIX_NIVEAUX": [0, 300, 700, 1500, 3000],
    "BLOC_NUIT_S": 30,
    "SEUIL_ALIMENTE": 50,
    "PERTE_NUITS": 1
  },
  "NUTRITION": { "AUGMENTATION": 125 },
  "OBJETS": {
    "carotte": { "nom": "Carotte", "icone": "🥕", "energie": 8, "prix": 1, "mangeable": true, "categorie": "légume" },
    "patate": { "nom": "Patate", "icone": "🥔", "energie": 19, "prix": 2, "mangeable": true, "categorie": "légume" },
    "tomate": { "nom": "Tomate", "icone": "🍅", "energie": 8, "prix": 1, "mangeable": true, "categorie": "légume" },
    "courgette": { "nom": "Courgette", "icone": "🥒", "energie": 10, "prix": 2, "mangeable": true, "categorie": "légume" },
    "aubergine": { "nom": "Aubergine", "icone": "🍆", "energie": 10, "prix": 2, "mangeable": true, "categorie": "légume" },
    "conserve": {
      "nom": "Boîte de conserve",
      "icone": "🥫",
      "energie": 25,
      "prix": 3,
      "mangeable": true,
      "categorie": "conserve",
      "rachetable": false
    },
    "graine_carotte": { "nom": "Graines de carotte", "icone": "🌱‍🥕", "prix": 1, "mangeable": false, "categorie": "graine" },
    "graine_tomate": { "nom": "Graines de tomate", "icone": "🌱‍🍅", "prix": 1, "mangeable": false, "categorie": "graine" },
    "graine_courgette": { "nom": "Graines de courgette", "icone": "🌱‍🥒", "prix": 1, "mangeable": false, "categorie": "graine" },
    "graine_aubergine": { "nom": "Graines d'aubergine", "icone": "🌱‍🍆", "prix": 1, "mangeable": false, "categorie": "graine" },
    "ble": { "nom": "Blé", "icone": "🌾", "prix": 1, "mangeable": false, "categorie": "ingrédient" },
    "graine_tournesol": { "nom": "Graines de tournesol", "icone": "🌱‍🌻", "prix": 1, "mangeable": false, "categorie": "graine" },
    "oeuf": { "nom": "Œuf", "icone": "🥚", "energie": 13, "prix": 2, "mangeable": true, "categorie": "produit" },
    "viande_mouton": {
      "nom": "Viande de mouton",
      "icone": "🥩",
      "energie": 38,
      "prix": 10,
      "mangeable": true,
      "categorie": "produit",
      "rachetable": false,
      "retire": true
    },
    "pomme": { "nom": "Pomme", "icone": "🍎", "energie": 10, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "poire": { "nom": "Poire", "icone": "🍐", "energie": 10, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "cerise": { "nom": "Cerises", "icone": "🍒‍🌸", "energie": 7, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "abricot": { "nom": "Abricot", "icone": "🍑‍🟠", "energie": 9, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "peche": { "nom": "Pêche", "icone": "🍑", "energie": 10, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "farine": { "nom": "Farine", "icone": "🥣", "energie": 13, "prix": 1, "mangeable": false, "categorie": "ingrédient" },
    "huile": { "nom": "Huile de tournesol", "icone": "🛢️", "energie": 13, "prix": 4, "mangeable": false, "categorie": "ingrédient" },
    "laine": { "nom": "Laine", "icone": "🧶", "prix": 6, "mangeable": false, "categorie": "produit", "rachetable": false },
    "bois": { "nom": "Bois", "icone": "🪵", "prix": 2, "mangeable": false, "categorie": "produit", "rachetable": false },
    "truite": { "nom": "Truite", "icone": "🐟‍🌈", "energie": 25, "prix": 4, "mangeable": true, "categorie": "produit", "rachetable": false },
    "brochet": { "nom": "Brochet", "icone": "🐟‍🦷", "energie": 38, "prix": 7, "mangeable": true, "categorie": "produit", "rachetable": false },
    "omble": { "nom": "Omble chevalier", "icone": "🐟‍❄", "energie": 34, "prix": 9, "mangeable": true, "categorie": "produit", "rachetable": false },
    "dorade": { "nom": "Dorade", "icone": "🐟‍⭐", "energie": 36, "prix": 10, "mangeable": true, "categorie": "produit", "rachetable": false },
    "anchois": { "nom": "Anchois", "icone": "🐟‍💧", "energie": 14, "prix": 3, "mangeable": true, "categorie": "produit", "rachetable": false },
    "sardine": { "nom": "Sardine", "icone": "🐟‍🌊", "energie": 20, "prix": 4, "mangeable": true, "categorie": "produit", "rachetable": false },
    "goujon": { "nom": "Goujon", "icone": "🐟‍🪨", "energie": 12, "prix": 2, "mangeable": true, "categorie": "produit", "rachetable": false },
    "saumon": { "nom": "Saumon", "icone": "🐟‍🔶", "energie": 42, "prix": 13, "mangeable": true, "categorie": "produit", "rachetable": false },
    "bar": { "nom": "Bar", "icone": "🐟‍🌀", "energie": 38, "prix": 12, "mangeable": true, "categorie": "produit", "rachetable": false },
    "pierre": { "nom": "Pierre", "icone": "🪨", "prix": 3, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fibre": { "nom": "Fibre", "icone": "🪢", "prix": 1, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "planche": { "nom": "Planche", "icone": "🪚", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mur_pierre": { "nom": "Mur en pierre", "icone": "🧱‍🪨", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mur_fenetre": { "nom": "Fenêtre", "icone": "🪟", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "fenetre_ronde": { "nom": "Œil-de-bœuf", "icone": "🪟‍⭕", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "fenetre_cintree": { "nom": "Fenêtre cintrée", "icone": "🪟‍🌙", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "fenetre_volets": { "nom": "Fenêtre à volets", "icone": "🪟‍🟩", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "fenetre_vitrail": { "nom": "Vitrail", "icone": "🪟‍🌈", "prix": 24, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "pierre_angle": { "nom": "Pierre d'angle", "icone": "🧱‍📐", "prix": 15, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mur_brique_rouge": {
      "nom": "Mur de briques rouges",
      "icone": "🧱‍🟥",
      "prix": 14,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "mur_brique_orange": {
      "nom": "Mur de briques orange",
      "icone": "🧱‍🟧",
      "prix": 14,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "mur_brique_ocre": {
      "nom": "Mur de briques ocre",
      "icone": "🧱‍🟨",
      "prix": 14,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "mur_brique_bleue": {
      "nom": "Mur de briques bleues",
      "icone": "🧱‍🟦",
      "prix": 14,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "mur_pierre_taille": {
      "nom": "Mur en pierre de taille",
      "icone": "🧱‍⬜",
      "prix": 16,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "cruche": { "nom": "Cruche à eau", "icone": "🏺", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mur_bois": { "nom": "Mur en bois", "icone": "🧱‍🟫", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "paroi_vitree": { "nom": "Paroi vitrée", "icone": "🧱‍🪟", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "plancher": { "nom": "Plancher", "icone": "🟫‍🪚", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_dalles": { "nom": "Dalles de pierre", "icone": "🟫‍🔲", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_carrelage": { "nom": "Carrelage en damier", "icone": "🟫‍🏁", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_tomettes": { "nom": "Tomettes", "icone": "🟫‍🟧", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_chevrons": { "nom": "Parquet à chevrons", "icone": "🟫‍🪵", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_marbre": { "nom": "Marbre", "icone": "🟫‍⬜", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_paves": { "nom": "Pavés", "icone": "🟫‍⚫", "prix": 2, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_mosaique": { "nom": "Mosaïque", "icone": "🟫‍🟦", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere": { "nom": "Barrière", "icone": "🚧", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "chemin": { "nom": "Chemin", "icone": "🟫‍🪨", "prix": 1, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "champignon_lumineux": {
      "nom": "Champignon lumineux",
      "icone": "🍄‍✨",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "cueillette": "grotte"
    },
    "bois_infra": {
      "nom": "Morceau d'arbre de l'infra-monde",
      "icone": "🪵‍🌈",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "retire": true
    },
    "bac_fleurs": {
      "nom": "Bac à fleurs",
      "icone": "🪴‍🌷",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "ruche": { "nom": "Ruche", "icone": "🐝", "prix": 200, "mangeable": false, "categorie": "matériau", "rachetable": false, "invendable": true },
    "lanterne": { "nom": "Lanterne scintillante", "icone": "🏮", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "candelabre": { "nom": "Réverbère", "icone": "🏮‍🔩", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte": { "nom": "Porte", "icone": "🚪", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_chene": { "nom": "Porte en chêne", "icone": "🚪‍🟤", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_vitree": { "nom": "Porte vitrée", "icone": "🚪‍🪟", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_grange": { "nom": "Porte de grange", "icone": "🚪‍🟥", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_bleue": { "nom": "Porte bleue", "icone": "🚪‍🟦", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_fer": { "nom": "Porte en fer", "icone": "🚪‍⬛", "prix": 22, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_ecurie": { "nom": "Porte d'écurie", "icone": "🚪‍🟩", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "porte_blanche": { "nom": "Porte blanche", "icone": "🚪‍⬜", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "paillasse": { "nom": "Paillasse", "icone": "🛏️", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "boite_nourriture": { "nom": "Boîte à nourriture", "icone": "🧺", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "casque_lampe": { "nom": "Casque à lampe", "icone": "⛑‍💡", "prix": 30, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "chapeau_paille": { "nom": "Chapeau de paille", "icone": "👒‍🌾", "prix": 6, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "bottes": { "nom": "Bottes de marche", "icone": "👢‍🟫", "prix": 10, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "gants_travail": { "nom": "Gants de travail", "icone": "🧤‍🟫", "prix": 14, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "tablier": { "nom": "Tablier de jardinier", "icone": "🥼‍🌱", "prix": 8, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "salopette": { "nom": "Salopette solide", "icone": "👖‍🔧", "prix": 34, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "manteau_chaud": { "nom": "Manteau chaud", "icone": "🧥‍❄", "prix": 36, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "tente": { "nom": "Tente", "icone": "⛺", "prix": 12, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "lanterne_tempete": { "nom": "Lanterne-tempête", "icone": "🪔", "prix": 14, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "enveloppe_maurice": {
      "nom": "Enveloppe de Maurice",
      "icone": "✉️",
      "prix": 0,
      "mangeable": false,
      "categorie": "souvenir",
      "rachetable": false,
      "invendable": true
    },
    "cloche_maurice": {
      "nom": "Cloche de Maurice",
      "icone": "🔔",
      "prix": 0,
      "mangeable": false,
      "categorie": "souvenir",
      "rachetable": false,
      "invendable": true
    },
    "pierre_lune": {
      "nom": "Pierre de lune",
      "icone": "🪨‍🌙",
      "prix": 0,
      "mangeable": false,
      "categorie": "souvenir",
      "rachetable": false,
      "invendable": true
    },
    "sac_petit": { "nom": "Petit sac à provisions", "icone": "🎒‍🌿", "prix": 5, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "sac_grand": { "nom": "Grand sac à provisions", "icone": "🎒‍🧶", "prix": 20, "mangeable": false, "categorie": "équipement", "rachetable": false },
    "refrigerateur": { "nom": "Réfrigérateur", "icone": "🧊", "prix": 120, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_chaise": { "nom": "Chaise", "icone": "🪑", "prix": 7, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_table": { "nom": "Table", "icone": "🍽️", "prix": 22, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tapis_1": { "nom": "Tapis tressé", "icone": "🧺", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tapis_2": { "nom": "Tapis rouge", "icone": "🟥", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tapis_3": { "nom": "Tapis bleu", "icone": "🟦", "prix": 15, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_lit_adulte": { "nom": "Lit adulte", "icone": "🛏️", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_lit_enfant": { "nom": "Lit enfant", "icone": "🛏️", "prix": 22, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_chevet": { "nom": "Table de chevet", "icone": "🗄️", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_canape": { "nom": "Canapé", "icone": "🛋️", "prix": 37, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_table_basse": { "nom": "Table basse", "icone": "☕", "prix": 15, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tableau_1": { "nom": "Tableau : la ferme", "icone": "🖼️", "prix": 11, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tableau_2": { "nom": "Tableau : le bouquet", "icone": "💐", "prix": 13, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_tableau_3": { "nom": "Tableau : la mer", "icone": "🌊", "prix": 17, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_buffet": { "nom": "Buffet vaisselier", "icone": "🍽️", "prix": 35, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_commode": { "nom": "Commode", "icone": "🗄️", "prix": 28, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_armoire_chene": { "nom": "Armoire de chêne", "icone": "🚪", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_armoire_peinte": { "nom": "Armoire peinte", "icone": "🚪", "prix": 45, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_armoire_glace": { "nom": "Armoire à glace", "icone": "🪞", "prix": 32, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_cuisine_porte": {
      "nom": "Bas de cuisine à porte",
      "icone": "🍞",
      "prix": 12,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "meuble_cuisine_tiroirs": {
      "nom": "Bas de cuisine à tiroirs",
      "icone": "🥄",
      "prix": 14,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "meuble_cuisine_sauge": {
      "nom": "Bas de cuisine vitré",
      "icone": "🍵",
      "prix": 18,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "meuble_poubelle": { "nom": "Poubelle", "icone": "🗑️", "prix": 5, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_bibliotheque": {
      "nom": "Bibliothèque étroite",
      "icone": "📚",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "meuble_bibliotheque_vitree": {
      "nom": "Bibliothèque vitrée",
      "icone": "📚",
      "prix": 42,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "meuble_lampadaire": { "nom": "Lampadaire", "icone": "💡", "prix": 11, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_coffre_jouets": { "nom": "Coffre à jouets", "icone": "🧸", "prix": 15, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_ficus": { "nom": "Ficus", "icone": "🌳", "prix": 9, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_monstera": { "nom": "Monstera", "icone": "🪴", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_sansevieria": { "nom": "Sansevière", "icone": "🌿", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_cactus": { "nom": "Cactus cierge", "icone": "🌵", "prix": 5, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_fougere": { "nom": "Fougère", "icone": "🌿", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_palmier": { "nom": "Palmier kentia", "icone": "🌴", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_citronnier": { "nom": "Citronnier", "icone": "🍋", "prix": 15, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_orchidee": { "nom": "Orchidée", "icone": "🌸", "prix": 9, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_aloe": { "nom": "Aloe vera", "icone": "🪴", "prix": 5, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meuble_plante_bonsai": { "nom": "Bonsaï", "icone": "🌲", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "four_pierre": { "nom": "Four de pierre", "icone": "🔥", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "nichoir": { "nom": "Nichoir", "icone": "🪺", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mangeoire": { "nom": "Mangeoire", "icone": "🛶", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "ratelier": { "nom": "Râtelier", "icone": "🌾‍🪜", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "tissu": { "nom": "Tissu de laine", "icone": "🧵", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "corde": { "nom": "Corde", "icone": "➰", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "poteau_attache": { "nom": "Poteau d'attache", "icone": "🪵‍🔗", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "bac_semis": { "nom": "Bac à semis", "icone": "🎍", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "bloc_silo": { "nom": "Bloc de silo", "icone": "🗃", "prix": 7, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "meule": { "nom": "Meule", "icone": "🪨‍⚙️", "prix": 24, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "entonnoir": { "nom": "Entonnoir", "icone": "🔻", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "botteleuse": { "nom": "Botteleuse", "icone": "⚙️‍🌾", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "distributeur": { "nom": "Distributeur de grain", "icone": "🌾‍⚙️", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mangeoire_grain": { "nom": "Mangeoire à grain", "icone": "🌾‍🛶", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "convoyeur": { "nom": "Convoyeur", "icone": "🛤️", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "pomme_de_pin": { "nom": "Pomme de pin", "icone": "🌲‍🟤", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "gland": { "nom": "Gland", "icone": "🌳‍🟤", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "jeune_pommier": { "nom": "Jeune pommier", "icone": "🌱‍🍎", "prix": 40, "mangeable": false, "categorie": "graine", "arbre": "pommier" },
    "jeune_poirier": { "nom": "Jeune poirier", "icone": "🌱‍🍐", "prix": 40, "mangeable": false, "categorie": "graine", "arbre": "poirier" },
    "jeune_cerisier": { "nom": "Jeune cerisier", "icone": "🌱‍🍒", "prix": 50, "mangeable": false, "categorie": "graine", "arbre": "cerisier" },
    "jeune_abricotier": { "nom": "Jeune abricotier", "icone": "🌱‍🟠", "prix": 45, "mangeable": false, "categorie": "graine", "arbre": "abricotier" },
    "jeune_pecher": { "nom": "Jeune pêcher", "icone": "🌱‍🍑", "prix": 45, "mangeable": false, "categorie": "graine", "arbre": "pecher" },
    "puits_pierre": { "nom": "Puits de pierre", "icone": "🪣", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "pompe": { "nom": "Pompe", "icone": "⛲", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "panneau_solaire": { "nom": "Panneau solaire", "icone": "☀️", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "citerne": { "nom": "Citerne", "icone": "💧", "prix": 25, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "batterie": { "nom": "Batterie", "icone": "🔋", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "escalier": { "nom": "Escalier", "icone": "🪜", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "station_robot": { "nom": "Station du robot", "icone": "🔌", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "cuisiniere": { "nom": "Cuisinière", "icone": "🍳", "prix": 24, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "ammonite": {
      "nom": "Ammonite fossile",
      "icone": "🪨‍🐚",
      "prix": 6,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "montagne"
    },
    "trilobite": {
      "nom": "Trilobite fossile",
      "icone": "🪨‍🪲",
      "prix": 6,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "montagne"
    },
    "quartz": {
      "nom": "Cristal de quartz",
      "icone": "💎",
      "prix": 4,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "montagne"
    },
    "amethyste": {
      "nom": "Améthyste",
      "icone": "💎‍🟣",
      "prix": 7,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "montagne"
    },
    "coquille": {
      "nom": "Coquille Saint-Jacques",
      "icone": "🐚",
      "prix": 3,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "plage"
    },
    "bulot": { "nom": "Bulot", "icone": "🐌", "prix": 2, "mangeable": false, "categorie": "produit", "rachetable": false, "trouvaille": "plage" },
    "corail": {
      "nom": "Branche de corail",
      "icone": "🪸",
      "prix": 5,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "plage"
    },
    "perle": { "nom": "Perle", "icone": "🦪", "prix": 12, "mangeable": false, "categorie": "produit", "rachetable": false, "trouvaille": "plage" },
    "herbes_montagne": {
      "nom": "Herbes de montagne",
      "icone": "🌿‍🏔️",
      "prix": 2,
      "mangeable": false,
      "categorie": "produit",
      "rachetable": false,
      "trouvaille": "montagne"
    },
    "minerai_fer": {
      "nom": "Minerai de fer",
      "icone": "🪨‍🔩",
      "prix": 2,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "minerai_cuivre": {
      "nom": "Minerai de cuivre",
      "icone": "🪨‍🟠",
      "prix": 3,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "minerai_or": {
      "nom": "Minerai d'or",
      "icone": "🪨‍🟡",
      "prix": 6,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "minerai_platine": {
      "nom": "Minerai de platine",
      "icone": "🪨‍⚪",
      "prix": 10,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "lingot_fer": {
      "nom": "Lingot de fer",
      "icone": "🧈‍🔩",
      "prix": 15,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "lingot_cuivre": {
      "nom": "Lingot de cuivre",
      "icone": "🧈‍🟠",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "lingot_or": {
      "nom": "Lingot d'or",
      "icone": "🧈‍🟡",
      "prix": 35,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "lingot_platine": {
      "nom": "Lingot de platine",
      "icone": "🧈‍⚪",
      "prix": 55,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "oignon": { "nom": "Oignon", "icone": "🧅", "energie": 6, "prix": 1, "mangeable": true, "categorie": "légume" },
    "graine_oignon": { "nom": "Graines d'oignon", "icone": "🌱‍🧅", "prix": 1, "mangeable": false, "categorie": "graine" },
    "ail": { "nom": "Ail", "icone": "🧄", "energie": 6, "prix": 2, "mangeable": true, "categorie": "légume" },
    "poivron": { "nom": "Poivron", "icone": "🫑", "energie": 7, "prix": 2, "mangeable": true, "categorie": "légume" },
    "graine_poivron": { "nom": "Graines de poivron", "icone": "🌱‍🫑", "prix": 1, "mangeable": false, "categorie": "graine" },
    "epinard": { "nom": "Épinard", "icone": "🥬", "energie": 5, "prix": 1, "mangeable": true, "categorie": "légume" },
    "graine_epinard": { "nom": "Graines d'épinard", "icone": "🌱‍🥬", "prix": 1, "mangeable": false, "categorie": "graine" },
    "fraise": { "nom": "Fraise", "icone": "🍓", "energie": 5, "prix": 2, "mangeable": true, "categorie": "fruit" },
    "graine_fraise": { "nom": "Graines de fraise", "icone": "🌱‍🍓", "prix": 1, "mangeable": false, "categorie": "graine" },
    "riz": { "nom": "Riz", "icone": "🍚", "energie": 10, "prix": 1, "mangeable": true, "categorie": "légume" },
    "houblon": { "nom": "Houblon", "icone": "🌿", "prix": 3, "mangeable": false, "categorie": "ingrédient" },
    "cacao": { "nom": "Cacao", "icone": "🍫", "prix": 8, "mangeable": false, "categorie": "ingrédient" },
    "vanille": { "nom": "Vanille", "icone": "🫘", "prix": 15, "mangeable": false, "categorie": "ingrédient" },
    "cafe": { "nom": "Café", "icone": "☕", "prix": 6, "mangeable": false, "categorie": "ingrédient" },
    "viande_boeuf": {
      "nom": "Viande de bœuf",
      "icone": "🍖",
      "energie": 38,
      "prix": 10,
      "mangeable": true,
      "categorie": "produit",
      "rachetable": false,
      "retire": true
    },
    "viande_volaille": {
      "nom": "Viande de volaille",
      "icone": "🍗",
      "energie": 14,
      "prix": 6,
      "mangeable": true,
      "categorie": "produit",
      "rachetable": false,
      "retire": true
    },
    "lait": { "nom": "Lait", "icone": "🥛", "energie": 16, "prix": 4, "mangeable": true, "categorie": "produit" },
    "lait_alpage": {
      "nom": "Lait d'alpage",
      "icone": "🥛‍🏔️",
      "energie": 18,
      "prix": 12,
      "mangeable": true,
      "categorie": "produit",
      "rachetable": false
    },
    "paille": { "nom": "Paille", "icone": "🪹", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "poisson": { "nom": "Poisson", "icone": "🐟", "energie": 25, "prix": 4, "mangeable": true, "categorie": "produit" },
    "miel": { "nom": "Miel", "icone": "🍯", "energie": 15, "prix": 4, "mangeable": true, "categorie": "produit" },
    "croissant": {
      "nom": "Croissant",
      "icone": "🥐",
      "energie": 22,
      "prix": 5,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 3,
      "rachetable": false,
      "retire": true
    },
    "pizza": {
      "nom": "Pizza",
      "icone": "🍕",
      "energie": 80,
      "prix": 18,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 5,
      "rachetable": false,
      "retire": true
    },
    "burger": {
      "nom": "Burger",
      "icone": "🍔",
      "energie": 90,
      "prix": 16,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 5,
      "rachetable": false,
      "retire": true
    },
    "frites": {
      "nom": "Frites",
      "icone": "🍟",
      "energie": 30,
      "prix": 5,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 3,
      "rachetable": false,
      "retire": true
    },
    "ordinateur": { "nom": "Ordinateur", "icone": "💻", "prix": 240, "mangeable": false, "categorie": "produit", "rachetable": false, "retire": true },
    "fromage_alpage": { "nom": "Fromage d'alpage", "icone": "🧀", "energie": 70, "prix": 47, "mangeable": true, "categorie": "produit" },
    "sucre": { "nom": "Sucre", "icone": "🍬", "energie": 10, "prix": 2, "mangeable": false, "categorie": "ingrédient" },
    "epices": { "nom": "Épices", "icone": "🌶", "energie": 0, "prix": 3, "mangeable": false, "categorie": "ingrédient" },
    "champignon": {
      "nom": "Champignon",
      "icone": "🍄",
      "energie": 6,
      "prix": 2,
      "mangeable": true,
      "categorie": "légume",
      "rachetable": false,
      "trouvaille": "foret"
    },
    "myrtille": {
      "nom": "Myrtille",
      "icone": "🫐",
      "energie": 5,
      "prix": 2,
      "mangeable": true,
      "categorie": "fruit",
      "rachetable": false,
      "trouvaille": "foret"
    },
    "baies": { "nom": "Baies sauvages", "icone": "🍒", "energie": 5, "prix": 1, "mangeable": true, "categorie": "fruit", "rachetable": false },
    "chataigne": {
      "nom": "Châtaigne",
      "icone": "🌰",
      "energie": 13,
      "prix": 2,
      "mangeable": true,
      "categorie": "fruit",
      "rachetable": false,
      "trouvaille": "foret"
    },
    "mures": { "nom": "Mûres", "icone": "🫐‍⚫", "energie": 5, "prix": 2, "mangeable": true, "categorie": "fruit", "rachetable": false },
    "etoile_mer": { "nom": "Étoile de mer", "icone": "⭐‍🌊", "prix": 4, "mangeable": false, "categorie": "produit", "rachetable": false },
    "algues": { "nom": "Algues", "icone": "🌿‍🌊", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false }
  },
  "PLATS_RETIRES": {
    "ragout": { "nom": "Ragoût", "icone": "🍖", "energie": 144, "prix": 36 },
    "poivrons_farcis": { "nom": "Poivrons farcis", "icone": "🫑", "energie": 81, "prix": 26 },
    "roti_boeuf": { "nom": "Rôti de bœuf", "icone": "🥩", "energie": 144, "prix": 36 },
    "poulet_roti_ail": { "nom": "Poulet rôti à l'ail", "icone": "🍗", "energie": 75, "prix": 23 }
  },
  "CONSERVATION_CATEGORIE": { "plat": 6 },
  "ORIGINE": { "PRODUIT": "produit", "ACHETE": "acheté", "PAR_CATEGORIE": { "conserve": "acheté" } },
  "ATELIER": {
    "NOM": "Atelier",
    "ICONE": "🔨",
    "NIVEAU": 1,
    "CONSTRUCTION": { "bois": 3, "pierre": 3 },
    "RECETTES": {
      "planche": { "entrees": { "bois": 2 }, "sortie": { "planche": 1 } },
      "mur_pierre": { "entrees": { "pierre": 4 }, "sortie": { "mur_pierre": 1 } },
      "mur_fenetre": { "entrees": { "pierre": 3, "planche": 1 }, "sortie": { "mur_fenetre": 1 } },
      "fenetre_ronde": { "entrees": { "pierre": 2, "planche": 1 }, "sortie": { "fenetre_ronde": 1 } },
      "fenetre_cintree": { "entrees": { "pierre": 3, "planche": 2 }, "sortie": { "fenetre_cintree": 1 } },
      "fenetre_volets": { "entrees": { "planche": 3, "pierre": 1, "baies": 1 }, "sortie": { "fenetre_volets": 1 } },
      "fenetre_vitrail": { "entrees": { "pierre": 3, "lingot_cuivre": 1, "baies": 2 }, "sortie": { "fenetre_vitrail": 1 } },
      "pierre_angle": { "entrees": { "pierre": 5 }, "sortie": { "pierre_angle": 1 } },
      "mur_brique_rouge": { "entrees": { "pierre": 3, "bois": 1 }, "sortie": { "mur_brique_rouge": 1 } },
      "mur_brique_orange": { "entrees": { "pierre": 3, "bois": 1 }, "sortie": { "mur_brique_orange": 1 } },
      "mur_brique_ocre": { "entrees": { "pierre": 3, "bois": 1 }, "sortie": { "mur_brique_ocre": 1 } },
      "mur_brique_bleue": { "entrees": { "pierre": 3, "bois": 1 }, "sortie": { "mur_brique_bleue": 1 } },
      "mur_pierre_taille": { "entrees": { "pierre": 5 }, "sortie": { "mur_pierre_taille": 1 } },
      "mur_bois": { "entrees": { "bois": 2 }, "sortie": { "mur_bois": 1 } },
      "cruche": { "entrees": { "bois": 3 }, "sortie": { "cruche": 1 } },
      "paroi_vitree": { "entrees": { "pierre": 2, "lingot_fer": 1 }, "sortie": { "paroi_vitree": 1 } },
      "porte": { "entrees": { "planche": 3 }, "sortie": { "porte": 1 } },
      "plancher": { "entrees": { "bois": 2 }, "sortie": { "plancher": 1 } },
      "porte_chene": { "entrees": { "planche": 4 }, "sortie": { "porte_chene": 1 } },
      "porte_vitree": { "entrees": { "planche": 2, "lingot_fer": 1 }, "sortie": { "porte_vitree": 1 } },
      "porte_grange": { "entrees": { "planche": 3, "bois": 1 }, "sortie": { "porte_grange": 1 } },
      "porte_bleue": { "entrees": { "planche": 3, "baies": 2 }, "sortie": { "porte_bleue": 1 } },
      "porte_fer": { "entrees": { "lingot_fer": 2, "planche": 1 }, "sortie": { "porte_fer": 1 } },
      "porte_ecurie": { "entrees": { "planche": 4, "fibre": 1 }, "sortie": { "porte_ecurie": 1 } },
      "porte_blanche": { "entrees": { "planche": 3, "pierre": 1 }, "sortie": { "porte_blanche": 1 } },
      "sol_dalles": { "entrees": { "pierre": 2 }, "sortie": { "sol_dalles": 1 } },
      "sol_carrelage": { "entrees": { "pierre": 2, "bois": 1 }, "sortie": { "sol_carrelage": 2 } },
      "sol_tomettes": { "entrees": { "pierre": 1, "bois": 1 }, "sortie": { "sol_tomettes": 1 } },
      "sol_chevrons": { "entrees": { "bois": 3 }, "sortie": { "sol_chevrons": 1 } },
      "sol_marbre": { "entrees": { "pierre": 4 }, "sortie": { "sol_marbre": 1 } },
      "sol_paves": { "entrees": { "pierre": 2 }, "sortie": { "sol_paves": 2 } },
      "sol_mosaique": { "entrees": { "pierre": 3, "lingot_cuivre": 1 }, "sortie": { "sol_mosaique": 2 } },
      "barriere": { "entrees": { "planche": 1 }, "sortie": { "barriere": 2 } },
      "chemin": { "entrees": { "pierre": 1 }, "sortie": { "chemin": 2 } },
      "lanterne": { "entrees": { "champignon_lumineux": 1, "bois": 2 }, "sortie": { "lanterne": 1 } },
      "candelabre": { "entrees": { "lingot_fer": 2, "pierre": 1, "huile": 1, "fibre": 1 }, "sortie": { "candelabre": 1 } },
      "paillasse": { "entrees": { "fibre": 2 }, "sortie": { "paillasse": 1 } },
      "boite_nourriture": { "entrees": { "planche": 3 }, "sortie": { "boite_nourriture": 1 } },
      "four_pierre": { "entrees": { "pierre": 8, "planche": 2 }, "sortie": { "four_pierre": 1 } },
      "cuisiniere": { "entrees": { "pierre": 6, "planche": 4 }, "sortie": { "cuisiniere": 1 } },
      "puits_pierre": { "entrees": { "pierre": 8, "planche": 2 }, "sortie": { "puits_pierre": 1 } },
      "nichoir": { "entrees": { "planche": 4, "fibre": 3 }, "sortie": { "nichoir": 1 } },
      "mangeoire": { "entrees": { "planche": 6, "pierre": 4, "fibre": 2 }, "sortie": { "mangeoire": 1 } },
      "ratelier": { "entrees": { "planche": 4, "fibre": 2 }, "sortie": { "ratelier": 1 }, "debloque": "ecurie" },
      "corde": { "entrees": { "fibre": 3 }, "sortie": { "corde": 1 }, "debloque": "ecurie" },
      "poteau_attache": { "entrees": { "bois": 2 }, "sortie": { "poteau_attache": 1 }, "debloque": "ecurie" },
      "bac_semis": { "entrees": { "planche": 8, "pierre": 4, "fibre": 4 }, "sortie": { "bac_semis": 1 } },
      "bloc_silo": { "entrees": { "planche": 3, "pierre": 1 }, "sortie": { "bloc_silo": 1 }, "debloque": "silo" },
      "meule": { "entrees": { "pierre": 10, "planche": 4 }, "sortie": { "meule": 1 } },
      "pompe": { "entrees": { "lingot_fer": 2, "planche": 1 }, "sortie": { "pompe": 1 }, "debloque": "energie" },
      "panneau_solaire": {
        "entrees": { "lingot_fer": 2, "lingot_cuivre": 1, "planche": 2 },
        "sortie": { "panneau_solaire": 1 },
        "debloque": "energie"
      },
      "citerne": { "entrees": { "planche": 6, "lingot_fer": 1 }, "sortie": { "citerne": 1 }, "debloque": "energie" },
      "batterie": { "entrees": { "lingot_cuivre": 2, "lingot_fer": 1 }, "sortie": { "batterie": 1 }, "debloque": "energie" },
      "escalier": { "entrees": { "planche": 6, "bois": 2 }, "sortie": { "escalier": 1 } },
      "station_robot": { "entrees": { "lingot_fer": 1, "lingot_cuivre": 1, "planche": 2 }, "sortie": { "station_robot": 1 } },
      "entonnoir": { "entrees": { "planche": 2, "pierre": 1 }, "sortie": { "entonnoir": 1 } },
      "botteleuse": { "entrees": { "planche": 4, "pierre": 6 }, "sortie": { "botteleuse": 1 } },
      "convoyeur": { "entrees": { "planche": 2, "fibre": 2 }, "sortie": { "convoyeur": 2 } },
      "distributeur": { "entrees": { "planche": 6, "lingot_fer": 1 }, "sortie": { "distributeur": 1 }, "debloque": "poulailler" },
      "mangeoire_grain": { "entrees": { "planche": 4, "pierre": 2 }, "sortie": { "mangeoire_grain": 1 }, "debloque": "poulailler" },
      "houe": { "entrees": { "bois": 2, "pierre": 1, "fibre": 1 }, "outil": "houe" },
      "hache": { "entrees": { "bois": 2, "pierre": 2, "fibre": 1 }, "outil": "hache" },
      "pioche": { "entrees": { "bois": 2, "pierre": 3, "fibre": 1 }, "outil": "pioche" },
      "faux": { "entrees": { "bois": 3, "pierre": 2 }, "outil": "faux" },
      "canne": { "entrees": { "bois": 3, "fibre": 4, "pierre": 1 }, "outil": "canne" },
      "nid_poule": { "nom": "Nid garni : une poule", "entrees": { "fibre": 4, "ble": 3 }, "animal": "poule", "debloque": "poulailler" },
      "sel_mouton": {
        "nom": "Pierre à sel et foin : un mouton",
        "entrees": { "pierre": 4, "paille": 6, "fibre": 4 },
        "animal": "mouton",
        "debloque": "moutons"
      },
      "sel_vache": {
        "nom": "Pierre à sel et foin : une vache",
        "entrees": { "pierre": 6, "paille": 12, "planche": 2 },
        "animal": "vache",
        "debloque": "moutons"
      },
      "licol_cheval": {
        "nom": "Licol et friandises : un cheval",
        "entrees": { "corde": 2, "carotte": 6, "pomme": 4 },
        "cheval": true,
        "debloque": "ecurie"
      },
      "sac_petit": { "entrees": { "fibre": 6 }, "sortie": { "sac_petit": 1 } },
      "tente": { "entrees": { "fibre": 12, "planche": 2, "corde": 2 }, "sortie": { "tente": 1 } },
      "lanterne_tempete": { "entrees": { "lingot_fer": 1, "planche": 1, "champignon_lumineux": 1 }, "sortie": { "lanterne_tempete": 1 } },
      "sac_grand": { "entrees": { "laine": 3, "fibre": 6 }, "sortie": { "sac_grand": 1 }, "debloque": "moutons" },
      "chapeau_paille": { "entrees": { "paille": 4, "fibre": 1 }, "sortie": { "chapeau_paille": 1 } },
      "tablier": { "entrees": { "fibre": 8 }, "sortie": { "tablier": 1 } },
      "bottes": { "entrees": { "planche": 1, "fibre": 6 }, "sortie": { "bottes": 1 } },
      "casque_lampe": {
        "entrees": { "lingot_fer": 2, "lingot_cuivre": 1, "champignon_lumineux": 2 },
        "sortie": { "casque_lampe": 1 },
        "debloque": "four"
      },
      "ruche": { "entrees": { "planche": 4, "fibre": 8, "pierre": 1 }, "sortie": { "ruche": 1 } },
      "bac_fleurs": { "entrees": { "planche": 3, "pierre": 2, "fibre": 1 }, "sortie": { "bac_fleurs": 1 } }
    },
    "BLOCS": {
      "mur_pierre": { "nom": "Mur en pierre", "objet": "mur_pierre", "bloque": true, "ferme": true, "mur": true },
      "mur_fenetre": { "nom": "Fenêtre", "objet": "mur_fenetre", "bloque": true, "ferme": true, "mur": true, "fenetre": true },
      "fenetre_ronde": { "nom": "Œil-de-bœuf", "objet": "fenetre_ronde", "bloque": true, "ferme": true, "mur": true, "fenetre": true },
      "fenetre_cintree": { "nom": "Fenêtre cintrée", "objet": "fenetre_cintree", "bloque": true, "ferme": true, "mur": true, "fenetre": true },
      "fenetre_volets": { "nom": "Fenêtre à volets", "objet": "fenetre_volets", "bloque": true, "ferme": true, "mur": true, "fenetre": true },
      "fenetre_vitrail": { "nom": "Vitrail", "objet": "fenetre_vitrail", "bloque": true, "ferme": true, "mur": true, "fenetre": true },
      "pierre_angle": { "nom": "Pierre d'angle", "objet": "pierre_angle", "bloque": true, "ferme": true, "mur": true },
      "mur_brique_rouge": { "nom": "Mur de briques rouges", "objet": "mur_brique_rouge", "bloque": true, "ferme": true, "mur": true },
      "mur_brique_orange": { "nom": "Mur de briques orange", "objet": "mur_brique_orange", "bloque": true, "ferme": true, "mur": true },
      "mur_brique_ocre": { "nom": "Mur de briques ocre", "objet": "mur_brique_ocre", "bloque": true, "ferme": true, "mur": true },
      "mur_brique_bleue": { "nom": "Mur de briques bleues", "objet": "mur_brique_bleue", "bloque": true, "ferme": true, "mur": true },
      "mur_pierre_taille": { "nom": "Mur en pierre de taille", "objet": "mur_pierre_taille", "bloque": true, "ferme": true, "mur": true },
      "mur_bois": { "nom": "Mur en bois", "objet": "mur_bois", "bloque": true, "ferme": true, "mur": true },
      "paroi_vitree": { "nom": "Paroi vitrée", "objet": "paroi_vitree", "bloque": true, "ferme": true, "mur": true },
      "porte": { "nom": "Porte", "objet": "porte", "porte": true, "ferme": true },
      "porte_chene": { "nom": "Porte en chêne", "objet": "porte_chene", "porte": true, "ferme": true },
      "porte_vitree": { "nom": "Porte vitrée", "objet": "porte_vitree", "porte": true, "ferme": true },
      "porte_grange": { "nom": "Porte de grange", "objet": "porte_grange", "porte": true, "ferme": true },
      "porte_bleue": { "nom": "Porte bleue", "objet": "porte_bleue", "porte": true, "ferme": true },
      "porte_fer": { "nom": "Porte en fer", "objet": "porte_fer", "porte": true, "ferme": true },
      "porte_ecurie": { "nom": "Porte d'écurie", "objet": "porte_ecurie", "porte": true, "ferme": true },
      "porte_blanche": { "nom": "Porte blanche", "objet": "porte_blanche", "porte": true, "ferme": true },
      "paillasse": { "nom": "Paillasse", "objet": "paillasse", "dedans": true },
      "boite_nourriture": { "nom": "Boîte à nourriture", "objet": "boite_nourriture", "dedans": true, "bloque": true, "unique": true, "boite": true },
      "refrigerateur": {
        "nom": "Réfrigérateur",
        "objet": "refrigerateur",
        "meuble": "refrigerateur",
        "dedans": true,
        "bloque": true,
        "unique": true,
        "frigo": true,
        "debloque": "frigo"
      },
      "plancher": { "nom": "Plancher", "objet": "plancher", "sol": true },
      "sol_dalles": { "nom": "Dalles de pierre", "objet": "sol_dalles", "sol": true },
      "sol_carrelage": { "nom": "Carrelage en damier", "objet": "sol_carrelage", "sol": true },
      "sol_tomettes": { "nom": "Tomettes", "objet": "sol_tomettes", "sol": true },
      "sol_chevrons": { "nom": "Parquet à chevrons", "objet": "sol_chevrons", "sol": true },
      "sol_marbre": { "nom": "Marbre", "objet": "sol_marbre", "sol": true },
      "sol_paves": { "nom": "Pavés", "objet": "sol_paves", "sol": true },
      "sol_mosaique": { "nom": "Mosaïque", "objet": "sol_mosaique", "sol": true },
      "chemin": { "nom": "Chemin", "objet": "chemin", "sol": true, "dehors": true },
      "barriere": { "nom": "Barrière", "objet": "barriere", "bloque": true },
      "lanterne": { "nom": "Lanterne scintillante", "objet": "lanterne", "bloque": true, "lumiere": true },
      "candelabre": { "nom": "Réverbère", "objet": "candelabre", "bloque": true, "lumiere": true },
      "four": { "nom": "Four", "objet": "four_pierre", "dedans": true, "bloque": true, "station": "four" },
      "cuisiniere": { "nom": "Cuisinière", "objet": "cuisiniere", "dedans": true, "bloque": true, "station": "cuisine" },
      "meule": { "nom": "Meule", "objet": "meule", "dedans": true, "bloque": true, "unique": true, "station": "moulin", "debloque": "moulin" },
      "pommier": { "nom": "Pommier", "objet": "jeune_pommier", "dehors": true, "arbre": "pommier", "debloque": "verger" },
      "poirier": { "nom": "Poirier", "objet": "jeune_poirier", "dehors": true, "arbre": "poirier", "debloque": "verger" },
      "cerisier": { "nom": "Cerisier", "objet": "jeune_cerisier", "dehors": true, "arbre": "cerisier", "debloque": "verger" },
      "abricotier": { "nom": "Abricotier", "objet": "jeune_abricotier", "dehors": true, "arbre": "abricotier", "debloque": "verger" },
      "pecher": { "nom": "Pêcher", "objet": "jeune_pecher", "dehors": true, "arbre": "pecher", "debloque": "verger" },
      "nichoir": { "nom": "Nichoir", "objet": "nichoir", "dedans": true, "bloque": true, "unique": true, "batiment": "poulailler" },
      "mangeoire": { "nom": "Mangeoire", "objet": "mangeoire", "dedans": true, "bloque": true, "unique": true, "batiment": "paturage" },
      "ratelier": {
        "nom": "Râtelier",
        "objet": "ratelier",
        "dedans": true,
        "bloque": true,
        "unique": true,
        "ecurie": true,
        "dessin": "ratelier",
        "debloque": "ecurie"
      },
      "bac_semis": { "nom": "Bac à semis", "objet": "bac_semis", "dedans": true, "bloque": true, "unique": true, "batiment": "serre" },
      "bloc_silo": { "nom": "Bloc de silo", "objet": "bloc_silo", "dehors": true, "bloque": true, "silo": true, "debloque": "silo" },
      "puits": { "nom": "Puits", "objet": "puits_pierre", "dehors": true, "bloque": true, "unique": true },
      "pompe": { "nom": "Pompe", "objet": "pompe", "sur": "puits", "appareil": "pompe", "debloque": "energie" },
      "panneau": {
        "nom": "Panneau solaire",
        "objet": "panneau_solaire",
        "dehors": true,
        "bloque": true,
        "unique": true,
        "appareil": "panneau",
        "debloque": "energie"
      },
      "citerne": {
        "nom": "Citerne",
        "objet": "citerne",
        "dehors": true,
        "bloque": true,
        "unique": true,
        "appareil": "reservoir",
        "debloque": "energie"
      },
      "batterie": { "nom": "Batterie", "objet": "batterie", "bloque": true, "unique": true, "appareil": "batterie", "debloque": "energie" },
      "escalier": { "nom": "Escalier", "objet": "escalier", "dedans": true, "escalier": true },
      "pomme_de_pin": { "nom": "Pomme de pin", "objet": "pomme_de_pin", "dehors": true, "semis": "pin" },
      "gland": { "nom": "Gland", "objet": "gland", "dehors": true, "semis": "arbre" },
      "ruche": { "nom": "Ruche", "objet": "ruche", "dehors": true, "bloque": true, "ruche": true, "marche": "Animaux" },
      "bac_fleurs": { "nom": "Bac à fleurs", "objet": "bac_fleurs", "bloque": true, "fleurs": true, "marche": "Meubles" },
      "station_robot": { "nom": "Station du robot", "objet": "station_robot", "dehors": true, "bloque": true, "unique": true, "robot": true },
      "entonnoir": { "nom": "Entonnoir", "objet": "entonnoir", "bloque": true, "botteleuse": "entonnoir" },
      "botteleuse": { "nom": "Botteleuse", "objet": "botteleuse", "bloque": true, "botteleuse": "machine" },
      "convoyeur": { "nom": "Convoyeur", "objet": "convoyeur", "bloque": true, "botteleuse": "convoyeur" },
      "distributeur": {
        "nom": "Distributeur de grain",
        "objet": "distributeur",
        "dehors": true,
        "bloque": true,
        "distributeur": "machine",
        "dessin": "distributeur"
      },
      "mangeoire_grain": {
        "nom": "Mangeoire à grain",
        "objet": "mangeoire_grain",
        "dehors": true,
        "bloque": true,
        "distributeur": "mangeoire",
        "dessin": "mangeoire_grain",
        "largeur": 2
      },
      "meuble_chaise": { "nom": "Chaise", "objet": "meuble_chaise", "meuble": "chaise", "dedans": true, "bloque": true },
      "meuble_table": { "nom": "Table", "objet": "meuble_table", "meuble": "table", "dedans": true, "bloque": true, "largeur": 3 },
      "meuble_tapis_1": { "nom": "Tapis tressé", "objet": "meuble_tapis_1", "meuble": "tapis_1", "dedans": true, "plat": true, "largeur": 3 },
      "meuble_tapis_2": {
        "nom": "Tapis rouge",
        "objet": "meuble_tapis_2",
        "meuble": "tapis_2",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "hauteur": 2
      },
      "meuble_tapis_3": { "nom": "Tapis bleu", "objet": "meuble_tapis_3", "meuble": "tapis_3", "dedans": true, "plat": true, "largeur": 3 },
      "meuble_lit_adulte": { "nom": "Lit adulte", "objet": "meuble_lit_adulte", "meuble": "lit_adulte", "dedans": true, "lit": true, "hauteur": 2 },
      "meuble_lit_enfant": { "nom": "Lit enfant", "objet": "meuble_lit_enfant", "meuble": "lit_enfant", "dedans": true, "lit": true, "hauteur": 2 },
      "meuble_chevet": { "nom": "Table de chevet", "objet": "meuble_chevet", "meuble": "chevet", "dedans": true, "bloque": true },
      "meuble_canape": { "nom": "Canapé", "objet": "meuble_canape", "meuble": "canape", "dedans": true, "bloque": true, "largeur": 3 },
      "meuble_table_basse": {
        "nom": "Table basse",
        "objet": "meuble_table_basse",
        "meuble": "table_basse",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "meuble_tableau_1": { "nom": "Tableau : la ferme", "objet": "meuble_tableau_1", "meuble": "tableau_1", "sur": "mur" },
      "meuble_tableau_2": { "nom": "Tableau : le bouquet", "objet": "meuble_tableau_2", "meuble": "tableau_2", "sur": "mur" },
      "meuble_tableau_3": { "nom": "Tableau : la mer", "objet": "meuble_tableau_3", "meuble": "tableau_3", "sur": "mur" },
      "meuble_buffet": { "nom": "Buffet vaisselier", "objet": "meuble_buffet", "meuble": "buffet", "dedans": true, "bloque": true, "largeur": 2 },
      "meuble_commode": { "nom": "Commode", "objet": "meuble_commode", "meuble": "commode", "dedans": true, "bloque": true, "largeur": 2 },
      "meuble_armoire_chene": {
        "nom": "Armoire de chêne",
        "objet": "meuble_armoire_chene",
        "meuble": "armoire_chene",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "meuble_armoire_peinte": {
        "nom": "Armoire peinte",
        "objet": "meuble_armoire_peinte",
        "meuble": "armoire_peinte",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "meuble_armoire_glace": { "nom": "Armoire à glace", "objet": "meuble_armoire_glace", "meuble": "armoire_glace", "dedans": true, "bloque": true },
      "meuble_cuisine_porte": {
        "nom": "Bas de cuisine à porte",
        "objet": "meuble_cuisine_porte",
        "meuble": "cuisine_porte",
        "dedans": true,
        "bloque": true
      },
      "meuble_cuisine_tiroirs": {
        "nom": "Bas de cuisine à tiroirs",
        "objet": "meuble_cuisine_tiroirs",
        "meuble": "cuisine_tiroirs",
        "dedans": true,
        "bloque": true
      },
      "meuble_cuisine_sauge": {
        "nom": "Bas de cuisine vitré",
        "objet": "meuble_cuisine_sauge",
        "meuble": "cuisine_sauge",
        "dedans": true,
        "bloque": true
      },
      "meuble_poubelle": { "nom": "Poubelle", "objet": "meuble_poubelle", "meuble": "poubelle", "dedans": true, "bloque": true },
      "meuble_bibliotheque": {
        "nom": "Bibliothèque étroite",
        "objet": "meuble_bibliotheque",
        "meuble": "bibliotheque",
        "dedans": true,
        "bloque": true
      },
      "meuble_bibliotheque_vitree": {
        "nom": "Bibliothèque vitrée",
        "objet": "meuble_bibliotheque_vitree",
        "meuble": "bibliotheque_vitree",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "meuble_lampadaire": { "nom": "Lampadaire", "objet": "meuble_lampadaire", "meuble": "lampadaire", "dedans": true, "bloque": true },
      "meuble_coffre_jouets": {
        "nom": "Coffre à jouets",
        "objet": "meuble_coffre_jouets",
        "meuble": "coffre_jouets",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "meuble_plante_ficus": { "nom": "Ficus", "objet": "meuble_plante_ficus", "meuble": "plante_ficus", "dedans": true, "bloque": true },
      "meuble_plante_monstera": { "nom": "Monstera", "objet": "meuble_plante_monstera", "meuble": "plante_monstera", "dedans": true, "bloque": true },
      "meuble_plante_sansevieria": {
        "nom": "Sansevière",
        "objet": "meuble_plante_sansevieria",
        "meuble": "plante_sansevieria",
        "dedans": true,
        "bloque": true
      },
      "meuble_plante_cactus": { "nom": "Cactus cierge", "objet": "meuble_plante_cactus", "meuble": "plante_cactus", "dedans": true, "bloque": true },
      "meuble_plante_fougere": { "nom": "Fougère", "objet": "meuble_plante_fougere", "meuble": "plante_fougere", "dedans": true, "bloque": true },
      "meuble_plante_palmier": {
        "nom": "Palmier kentia",
        "objet": "meuble_plante_palmier",
        "meuble": "plante_palmier",
        "dedans": true,
        "bloque": true
      },
      "meuble_plante_citronnier": {
        "nom": "Citronnier",
        "objet": "meuble_plante_citronnier",
        "meuble": "plante_citronnier",
        "dedans": true,
        "bloque": true
      },
      "meuble_plante_orchidee": { "nom": "Orchidée", "objet": "meuble_plante_orchidee", "meuble": "plante_orchidee", "dedans": true, "bloque": true },
      "meuble_plante_aloe": { "nom": "Aloe vera", "objet": "meuble_plante_aloe", "meuble": "plante_aloe", "dedans": true, "bloque": true },
      "meuble_plante_bonsai": {
        "nom": "Bonsaï",
        "objet": "meuble_plante_bonsai",
        "meuble": "plante_bonsai",
        "dedans": true,
        "bloque": true,
        "largeur": 2
      },
      "atelier": { "nom": "Atelier", "bloque": true, "ferme": true }
    },
    "PIECE_MAX": 400,
    "ENCLOS_MAX": 1200,
    "BOITE": { "PLATS": 6, "QUANTITE": 10 },
    "HAUTEUR_MAX": 3,
    "MOULIN": { "HAUTEUR": 3 },
    "CATEGORIES": {
      "batir": {
        "nom": "Bâtir",
        "icone": "🧱",
        "murs": true,
        "blocs": [
          "porte",
          "porte_chene",
          "porte_vitree",
          "porte_grange",
          "porte_bleue",
          "porte_fer",
          "porte_ecurie",
          "porte_blanche",
          "plancher",
          "sol_dalles",
          "sol_carrelage",
          "sol_tomettes",
          "sol_chevrons",
          "sol_marbre",
          "sol_paves",
          "sol_mosaique",
          "chemin",
          "barriere",
          "escalier"
        ]
      },
      "maison": {
        "nom": "Maison",
        "icone": "🏠",
        "blocs": ["paillasse", "boite_nourriture", "refrigerateur", "four", "cuisiniere", "lanterne", "candelabre"]
      },
      "meubles": { "nom": "Meubles", "icone": "🛏", "meubles": true },
      "elevage": {
        "nom": "Élevage",
        "icone": "🐔",
        "blocs": ["nichoir", "distributeur", "mangeoire_grain", "mangeoire", "ratelier", "bac_semis", "ruche", "bac_fleurs", "bloc_silo", "meule"]
      },
      "energie": { "nom": "Énergie", "icone": "⚡", "blocs": ["puits", "pompe", "citerne", "panneau", "batterie", "station_robot"] },
      "machines": { "nom": "Machines", "icone": "⚙️", "blocs": ["atelier", "entonnoir", "botteleuse", "convoyeur"] }
    },
    "SILO": { "LARGEUR": 2, "HAUTEUR": 3, "HAUTEUR_MAX": 6, "BLES_PAR_BLOC": 10 },
    "ARBRE_ECART": 3,
    "BONHEUR_SANS_COUCHAGE": -8,
    "RAMASSAGE": {
      "petite_pierre": { "nom": "Petite pierre", "objet": "pierre", "nombre": 14 },
      "morceau_bois": { "nom": "Morceau de bois", "objet": "bois", "nombre": 14 },
      "baies": {
        "nom": "Baies",
        "objet": "baies",
        "nombre": 32,
        "quantite": 3,
        "parTaille": { "petit": 3, "grand": 5 },
        "buissons": true,
        "gratuit": true
      }
    },
    "RAMASSAGE_DEPART": { "RAYON": [2, 7], "petite_pierre": 6, "morceau_bois": 9 }
  },
  "DISTRIBUTEUR": { "NOM": "Distributeur de grain", "ICONE": "🌾‍⚙️", "CAPACITE": 40, "HEURE": 7 },
  "BOTTELEUSE": { "NOM": "Botteleuse", "ICONE": "⚙️‍🌾", "FIBRES": 10, "VIBRE_S": 3, "PAILLE": 10, "CONVOYEUR": 2 },
  "STATIONS": {
    "four": {
      "nom": "Four",
      "article": "le",
      "icone": "🔥",
      "prixConstruction": 100,
      "electrique": false,
      "debloque": ["recettes"],
      "action": "cuireFour"
    },
    "cuisine": {
      "nom": "Cuisine",
      "article": "la",
      "icone": "🍳",
      "prixConstruction": 150,
      "electrique": false,
      "debloque": ["recettes"],
      "action": "cuisiner"
    },
    "moulin": { "nom": "Moulin", "article": "le", "icone": "⚙️", "prixConstruction": 120, "electrique": true, "whParS": 20, "action": "moudre" },
    "presse": { "nom": "Presse", "article": "la", "icone": "🌻", "prixConstruction": 150, "electrique": true, "whParS": 30, "action": "presser" }
  },
  "CUISINE": { "COEF_PLAT": 130, "ENERGIE_EAU": 0, "PRIX_EAU": 1, "DIVISEUR_TEMPS": 2, "STATIONS_TEMPS_DIVISE": ["four", "cuisine"] },
  "RECETTES": {
    "pain": {
      "nom": "Pain",
      "icone": "🍞",
      "station": "four",
      "temps": 20,
      "ingredients": [{ "item": "farine", "qte": 2 }],
      "eau": 1,
      "coefPrix": 160
    },
    "omelette": {
      "nom": "Omelette",
      "icone": "🍳‍🥚",
      "station": "cuisine",
      "temps": 15,
      "ingredients": [{ "item": "oeuf", "qte": 3 }, { "item": "huile", "qte": 1 }]
    },
    "ratatouille": {
      "nom": "Ratatouille",
      "icone": "🍲",
      "station": "cuisine",
      "temps": 30,
      "ingredients": [
        { "item": "tomate", "qte": 1 },
        { "item": "courgette", "qte": 1 },
        { "item": "aubergine", "qte": 1 },
        { "item": "huile", "qte": 1 }
      ]
    },
    "gratin_patates": {
      "nom": "Gratin de patates",
      "icone": "🥘",
      "station": "four",
      "temps": 30,
      "ingredients": [{ "item": "patate", "qte": 3 }, { "item": "oeuf", "qte": 1 }],
      "energieForcee": 150
    },
    "compote": { "nom": "Compote", "icone": "🍮", "station": "cuisine", "temps": 15, "ingredients": [{ "ou": ["pomme", "poire"], "qte": 3 }] },
    "tarte_pommes": {
      "nom": "Tarte aux pommes",
      "icone": "🥧",
      "station": "four",
      "temps": 45,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "pomme", "qte": 3 }, { "item": "oeuf", "qte": 1 }]
    },
    "soupe_legumes": {
      "nom": "Soupe de légumes",
      "icone": "🍲‍🥕",
      "station": "cuisine",
      "temps": 30,
      "ingredients": [{ "item": "carotte", "qte": 1 }, { "item": "oignon", "qte": 1 }, { "item": "patate", "qte": 1 }],
      "eau": 1
    },
    "salade_tomates": {
      "nom": "Salade de tomates",
      "icone": "🥗",
      "station": "cuisine",
      "temps": 10,
      "ingredients": [{ "item": "tomate", "qte": 2 }, { "item": "huile", "qte": 1 }]
    },
    "quiche_epinards": {
      "nom": "Quiche aux épinards",
      "icone": "🥧‍🥬",
      "station": "four",
      "temps": 40,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "oeuf", "qte": 2 }, { "item": "lait", "qte": 1 }, { "item": "epinard", "qte": 1 }]
    },
    "fromage_frais": { "nom": "Fromage frais", "icone": "🧀‍🥛", "station": "cuisine", "temps": 60, "ingredients": [{ "item": "lait", "qte": 3 }] },
    "fromage_alpage": {
      "nom": "Fromage d'alpage",
      "icone": "🧀",
      "station": "cuisine",
      "temps": 60,
      "ingredients": [{ "item": "lait_alpage", "qte": 3 }],
      "transformation": true,
      "sortie": "fromage_alpage",
      "qteSortie": 1
    },
    "riz_au_lait": {
      "nom": "Riz au lait",
      "icone": "🍚‍🥛",
      "station": "cuisine",
      "temps": 30,
      "ingredients": [{ "item": "riz", "qte": 2 }, { "item": "lait", "qte": 1 }]
    },
    "pain_ail": {
      "nom": "Pain à l'ail",
      "icone": "🥖",
      "station": "four",
      "temps": 15,
      "ingredients": [{ "item": "pain", "qte": 1 }, { "item": "ail", "qte": 1 }, { "item": "huile", "qte": 1 }]
    },
    "tarte_fraises": {
      "nom": "Tarte aux fraises",
      "icone": "🍰",
      "station": "four",
      "temps": 40,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "fraise", "qte": 3 }, { "item": "oeuf", "qte": 1 }]
    },
    "confiture_fraises": {
      "nom": "Confiture de fraises",
      "icone": "🫙‍🍓",
      "station": "cuisine",
      "temps": 30,
      "ingredients": [{ "item": "fraise", "qte": 4 }]
    },
    "chocolat_chaud": {
      "nom": "Chocolat chaud",
      "icone": "☕‍🍫",
      "station": "cuisine",
      "temps": 20,
      "ingredients": [{ "item": "cacao", "qte": 1 }, { "item": "lait", "qte": 1 }],
      "coefPrix": 300
    },
    "cafe_boisson": {
      "nom": "Café chaud",
      "icone": "☕‍🔥",
      "station": "cuisine",
      "temps": 10,
      "ingredients": [{ "item": "cafe", "qte": 1 }],
      "eau": 1,
      "coefPrix": 300
    },
    "creme_vanille": {
      "nom": "Crème à la vanille",
      "icone": "🍨",
      "station": "cuisine",
      "temps": 45,
      "ingredients": [{ "item": "vanille", "qte": 1 }, { "item": "lait", "qte": 2 }, { "item": "oeuf", "qte": 2 }],
      "coefPrix": 300
    },
    "biere_artisanale": {
      "nom": "Bière artisanale",
      "icone": "🍺",
      "station": "cuisine",
      "temps": 60,
      "ingredients": [{ "item": "houblon", "qte": 2 }],
      "eau": 1,
      "coefPrix": 300
    },
    "bocal_legumes": {
      "nom": "Bocal de légumes",
      "icone": "🫙",
      "station": "cuisine",
      "temps": 60,
      "ingredients": [{ "ou": ["carotte", "patate", "tomate", "courgette", "aubergine", "oignon", "poivron", "epinard"], "qte": 4 }],
      "eau": 1,
      "energieForcee": 40
    },
    "farine": {
      "nom": "Moudre du blé",
      "icone": "⚙️",
      "station": "moulin",
      "temps": 5,
      "ingredients": [{ "item": "ble", "qte": 1 }],
      "transformation": true,
      "sortie": "farine",
      "qteSortie": 1,
      "horsLivre": true
    },
    "huile": {
      "nom": "Presser du tournesol",
      "icone": "🌻",
      "station": "presse",
      "temps": 10,
      "ingredients": [{ "item": "graine_tournesol", "qte": 3 }],
      "transformation": true,
      "sortie": "huile",
      "qteSortie": 1
    },
    "lingot_fer": {
      "nom": "Fondre du fer",
      "icone": "🧈‍🔩",
      "station": "four",
      "temps": 40,
      "ingredients": [{ "item": "minerai_fer", "qte": 4 }, { "item": "bois", "qte": 3 }],
      "transformation": true,
      "sortie": "lingot_fer",
      "qteSortie": 1
    },
    "lingot_cuivre": {
      "nom": "Fondre du cuivre",
      "icone": "🧈‍🟠",
      "station": "four",
      "temps": 50,
      "ingredients": [{ "item": "minerai_cuivre", "qte": 4 }, { "item": "bois", "qte": 3 }],
      "transformation": true,
      "sortie": "lingot_cuivre",
      "qteSortie": 1
    },
    "lingot_or": {
      "nom": "Fondre de l'or",
      "icone": "🧈‍🟡",
      "station": "four",
      "temps": 60,
      "ingredients": [{ "item": "minerai_or", "qte": 4 }, { "item": "bois", "qte": 4 }],
      "transformation": true,
      "sortie": "lingot_or",
      "qteSortie": 1
    },
    "lingot_platine": {
      "nom": "Fondre du platine",
      "icone": "🧈‍⚪",
      "station": "four",
      "temps": 80,
      "ingredients": [{ "item": "minerai_platine", "qte": 4 }, { "item": "bois", "qte": 5 }],
      "transformation": true,
      "sortie": "lingot_platine",
      "qteSortie": 1
    },
    "omelette_champignons": {
      "nom": "Omelette aux champignons",
      "icone": "🍳‍🍄",
      "station": "cuisine",
      "temps": 15,
      "ingredients": [{ "item": "oeuf", "qte": 2 }, { "item": "champignon", "qte": 2 }]
    },
    "poisson_grille": {
      "nom": "Poisson grillé à l'ail",
      "icone": "🐟‍🔥",
      "station": "cuisine",
      "temps": 15,
      "ingredients": [{ "item": "poisson", "qte": 1 }, { "item": "ail", "qte": 1 }]
    },
    "raclette": {
      "nom": "Raclette",
      "icone": "🫕",
      "station": "cuisine",
      "temps": 20,
      "ingredients": [{ "item": "fromage_alpage", "qte": 1 }, { "item": "patate", "qte": 3 }]
    },
    "creme_marrons": {
      "nom": "Crème de marrons",
      "icone": "🫙‍🌰",
      "station": "cuisine",
      "temps": 25,
      "ingredients": [{ "item": "chataigne", "qte": 4 }, { "ou": ["sucre", "miel"], "qte": 1 }]
    },
    "tarte_myrtilles": {
      "nom": "Tarte aux myrtilles",
      "icone": "🥧‍🫐",
      "station": "four",
      "temps": 30,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "myrtille", "qte": 4 }, { "ou": ["sucre", "miel"], "qte": 1 }]
    },
    "pain_epices": {
      "nom": "Pain d'épices",
      "icone": "🍞‍🍯",
      "station": "four",
      "temps": 30,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "miel", "qte": 1 }, { "ou": ["epices", "herbes_montagne"], "qte": 1 }]
    },
    "mayonnaise": { "nom": "Mayonnaise", "icone": "🫙‍🥚", "station": "cuisine", "temps": 10, "ingredients": [{ "item": "oeuf", "qte": 3 }] },
    "quenelle_poisson": {
      "nom": "Quenelle de poisson",
      "icone": "🐟‍🥟",
      "station": "cuisine",
      "temps": 20,
      "ingredients": [{ "item": "farine", "qte": 1 }, { "ou": ["truite", "brochet", "omble", "dorade", "sardine", "anchois", "poisson"], "qte": 1 }]
    }
  },
  "CULTURES": {
    "carotte": {
      "nom": "Carotte",
      "icone": "🥕",
      "lieux": ["potager"],
      "stades": 4,
      "litres": 2,
      "rendement": 6,
      "graines": { "item": "graine_carotte", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 23, "h": 32, "c": [0, 1, 2, 3] }
    },
    "patate": {
      "nom": "Patate",
      "icone": "🥔",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "patate", "mode": "plant" },
      "sprite": { "r": 23, "h": 32, "c": [5, 6, 7, 8] }
    },
    "tomate": {
      "nom": "Tomate",
      "icone": "🍅",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_tomate", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 27, "h": 32, "c": [10, 11, 12, 13] }
    },
    "courgette": {
      "nom": "Courgette",
      "icone": "🥒",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_courgette", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 11, "h": 16, "c": [0, 1, 2, 3] }
    },
    "aubergine": {
      "nom": "Aubergine",
      "icone": "🍆",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_aubergine", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 19, "h": 32, "c": [0, 1, 2, 3, 4] }
    },
    "poivron": {
      "nom": "Poivron",
      "icone": "🫑",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_poivron", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 19, "h": 32, "c": [5, 6, 7, 8, 9] }
    },
    "oignon": {
      "nom": "Oignon",
      "icone": "🧅",
      "lieux": ["potager"],
      "stades": 5,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_oignon", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 29, "h": 32, "c": [0, 1, 2, 3] }
    },
    "ail": {
      "nom": "Ail",
      "icone": "🧄",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 2,
      "rendement": 6,
      "graines": { "item": "ail", "mode": "plant" },
      "sprite": { "r": 19, "h": 32, "c": [10, 11, 12, 13, 14] }
    },
    "epinard": {
      "nom": "Épinard",
      "icone": "🥬",
      "lieux": ["potager"],
      "stades": 3,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_epinard", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 23, "h": 32, "c": [10, 11, 12, 13] }
    },
    "fraise": {
      "nom": "Fraise",
      "icone": "🍓",
      "lieux": ["potager"],
      "stades": 4,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_fraise", "mode": "recolte", "min": 2, "max": 3 },
      "sprite": { "r": 25, "h": 32, "c": [0, 1, 2, 3] }
    },
    "ble": {
      "nom": "Blé",
      "icone": "🌾",
      "lieux": ["potager"],
      "pleinChamp": true,
      "requiert": "silo",
      "stades": 7,
      "litres": 2,
      "rendement": 8,
      "graines": { "item": "ble", "mode": "plant" },
      "sprite": { "r": 25, "h": 32, "c": [5, 6, 7, 8] }
    },
    "tournesol": {
      "nom": "Tournesol",
      "icone": "🌻",
      "lieux": ["potager"],
      "pleinChamp": true,
      "stades": 7,
      "litres": 2,
      "rendement": 9,
      "produit": "graine_tournesol",
      "graines": { "item": "graine_tournesol", "mode": "plant" },
      "sprite": { "r": 27, "h": 32, "c": [0, 1, 2, 3] }
    },
    "riz": {
      "nom": "Riz",
      "icone": "🍚",
      "lieux": ["potager"],
      "pleinChamp": true,
      "stades": 8,
      "litres": 4,
      "rendement": 10,
      "graines": { "item": "riz", "mode": "plant" },
      "sprite": { "r": 25, "h": 32, "c": [10, 11, 12, 13] }
    },
    "houblon": {
      "nom": "Houblon",
      "icone": "🌿",
      "lieux": ["potager"],
      "pleinChamp": true,
      "stades": 6,
      "litres": 2,
      "rendement": 6,
      "graines": { "item": "houblon", "mode": "plant" },
      "sprite": { "r": 27, "h": 32, "c": [5, 6, 7, 8] }
    },
    "cacao": {
      "nom": "Cacao",
      "icone": "🍫",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 5,
      "graines": { "item": "cacao", "mode": "plant" },
      "sprite": { "r": 21, "h": 32, "c": [0, 1, 2, 3, 4] }
    },
    "vanille": {
      "nom": "Vanille",
      "icone": "🫘",
      "lieux": ["serre"],
      "stades": 10,
      "litres": 2,
      "rendement": 3,
      "graines": { "item": "vanille", "mode": "plant" },
      "sprite": { "r": 21, "h": 32, "c": [10, 11, 12, 13, 14] }
    },
    "cafe": {
      "nom": "Café",
      "icone": "☕",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 6,
      "graines": { "item": "cafe", "mode": "plant" },
      "sprite": { "r": 21, "h": 32, "c": [5, 6, 7, 8, 9] }
    }
  },
  "POTAGER": {
    "LIEU": "potager",
    "NOM": "Zone de culture",
    "ICONE": "🌱",
    "COLONNES": 5,
    "CASES": 30,
    "DEPART": [0, 1, 2, 5, 6, 7],
    "PARCELLES_V1": [6, 12, 18, 24, 30],
    "ZONE2": { "ID": "zone2", "NOM": "Champ", "ICONE": "🌾", "CASES": 64, "COLONNES": 8, "DEBLOCAGE": "moulin" }
  },
  "HOUE": { "NOM": "Houe", "ICONE": "⛏️", "PRIX": 40 },
  "HACHE": {
    "NOM": "Hache",
    "ICONE": "🪓",
    "PRIX": 60,
    "BOIS": 1,
    "CHUTE": 3,
    "COUPES": 3,
    "RETOUR": [1, 3],
    "BUISSONS": { "grand": 2, "petit": 1, "RETOUR": [2, 4] },
    "GRAINES": { "pin": "pomme_de_pin", "arbre": "gland" },
    "POUSSE": [2, 4]
  },
  "CRUCHE": { "LITRES": 10 },
  "PIOCHE": { "NOM": "Pioche", "ICONE": "⚒️", "PRIX": 60, "PIERRE": 1, "BRIS": 2, "COUPS": 3, "RETOUR": [1, 3], "MAIN": 1 },
  "COUP_FORT": { "COUPS": 2, "ENERGIE": 2 },
  "FAUX": { "NOM": "Faux", "ICONE": "🌾‍🔪", "PRIX": 50, "FIBRE": 1, "RETOUR": [2, 4], "BOT_TOUFFES": 40 },
  "CANNE": {
    "NOM": "Canne à pêche",
    "ICONE": "🎣",
    "PRIX": 60,
    "PRISES": {
      "etang": { "truite": 50, "brochet": 25 },
      "mare": { "truite": 55, "brochet": 5 },
      "lac": { "omble": 40, "truite": 25 },
      "mer": { "dorade": 15, "sardine": 30, "anchois": 30 },
      "riviere": { "truite": 40, "goujon": 30 }
    },
    "JOUR": { "etang": 6, "mare": 3, "lac": 4, "mer": 8, "riviere": 5 },
    "COINS": {
      "RAYON": 3,
      "PRISES": {
        "lac": { "omble": 45, "truite": 20, "brochet": 15 },
        "riviere": { "truite": 35, "goujon": 20, "saumon": 20 },
        "mer": { "dorade": 20, "sardine": 25, "anchois": 20, "bar": 15 }
      },
      "JOUR": { "lac": 8, "riviere": 8, "mer": 12 }
    }
  },
  "SERRE": { "LIEU": "serre", "PRIX_CONSTRUCTION": 1000, "PARCELLES": [16, 26, 36, 46, 56], "PRIX_NIVEAUX": [0, 900, 1800, 3000, 5400] },
  "VERGER": {
    "PRIX_CONSTRUCTION": 0,
    "EMPLACEMENTS_DEPART": 2,
    "EMPLACEMENTS_MAX": 12,
    "EMPLACEMENT": { "base": 50, "croissance": 125 },
    "MATURITE": 15,
    "FRUITS": 6,
    "PERIODE": 3,
    "NUITS_STADE": 5,
    "STADES": ["Jeune arbre", "Arbuste", "Arbre", "Arbre en fruits"],
    "FLORAISON": 1,
    "FLEUR": "Arbre en fleur",
    "ARBRES": {
      "pommier": { "nom": "Pommier", "icone": "🌳", "fruit": "pomme", "prix": 40, "dessin": 0 },
      "poirier": { "nom": "Poirier", "icone": "🌳", "fruit": "poire", "prix": 40, "dessin": 1 },
      "cerisier": { "nom": "Cerisier", "icone": "🌳", "fruit": "cerise", "prix": 50, "dessin": 2 },
      "abricotier": { "nom": "Abricotier", "icone": "🌳", "fruit": "abricot", "prix": 45, "dessin": 3 },
      "pecher": { "nom": "Pêcher", "icone": "🌳", "fruit": "peche", "prix": 45, "dessin": 4 }
    }
  },
  "LUNE": {
    "JOURS_MOIS": 14,
    "MOIS": ["Solaria", "Florea", "Halima", "Verdia", "Pluvia", "Zephyria", "Frutera", "Granaria", "Messidia", "Aurea", "Solena", "Silentia"],
    "PHASES": [
      { "id": "croissante", "nom": "Lune croissante", "icone": "🌒", "jours": 5 },
      { "id": "pleine", "nom": "Pleine lune", "icone": "🌕", "jours": 2 },
      { "id": "decroissante", "nom": "Lune décroissante", "icone": "🌘", "jours": 5 },
      { "id": "nouvelle", "nom": "Nouvelle lune", "icone": "🌑", "jours": 2 }
    ],
    "POUSSE_CHANCE": 25,
    "POUSSE_NOUVELLE": 0,
    "RECOLTE_PLEINE": 150,
    "EAU_DECROISSANTE": 75
  },
  "SILO": { "ITEM": "ble", "PRIX_CONSTRUCTION": 0, "CAPACITE": [20, 50, 100, 200, 400], "PRIX_NIVEAUX": [0, 30, 80, 180, 400] },
  "RUCHE": { "NOM": "Ruche", "ICONE": "🐝", "OBJET": "ruche", "PRIX": 200, "NUITS": 2, "PRODUIT": "miel", "MIEL": 3 },
  "CHEVAL": {
    "NOM": "Cheval",
    "ICONE": "🐴",
    "PRIX": 600,
    "PLACES": 2,
    "VITESSE": 1.8,
    "VITESSE_FAIM": 1.3,
    "RATION": 2,
    "ATTACHE": ["poteau_attache", "corde"],
    "PROCHE": 40
  },
  "POULAILLER": { "PRIX_CONSTRUCTION": 40, "CAPACITE": [4, 8, 12, 16, 24], "PRIX_NIVEAUX": [0, 100, 220, 450, 900] },
  "ANIMAUX": {
    "poule": { "nom": "Poule", "icone": "🐔", "prix": 15, "poulesParBle": 2, "oeufsParNuit": 1, "produit": "oeuf" },
    "mouton": { "nom": "Mouton", "icone": "🐑", "prix": 60, "pailleParNuit": 1, "joursLaine": 2, "laineParTonte": 1, "laine": "laine" },
    "vache": {
      "nom": "Vache",
      "icone": "🐄",
      "prix": 200,
      "pailleParNuit": 2,
      "laitParNuit": 1,
      "lait": "lait",
      "herbesParNuit": 1,
      "laitAlpage": "lait_alpage"
    }
  },
  "PATURAGE": {
    "PRIX_CONSTRUCTION": 150,
    "PLACES_DEPART": 10,
    "PLACES_PAR_MOUTON": 1,
    "PLACES_PAR_VACHE": 3,
    "PRIX_PLACE": 40,
    "CROISSANCE": 120,
    "NOURRITURE": "paille",
    "HERBES": "herbes_montagne"
  },
  "TECHNO": { "ONGLET": "techno", "SEUIL_PIECES": 100 },
  "ARBRE": {
    "PALIERS": {
      "1": { "chapitre": 1, "nom": "Premiers pas" },
      "2": { "chapitre": 3, "nom": "Organisation" },
      "3": { "chapitre": 4, "nom": "Automatisation" },
      "4": { "chapitre": 5, "nom": "Maîtrise" },
      "5": { "chapitre": 7, "nom": "Autonomie" }
    },
    "POINTS": {
      "CHAPITRES": [2, 3, 3, 4, 4, 5, 5],
      "MAITRISE": [
        { "id": "eau_2000", "compteur": "litres", "cible": 2000, "libelle": "Pomper 2 000 L au total" },
        { "id": "plats_10", "compteur": "plats", "cible": 10, "libelle": "Préparer 10 plats différents" },
        { "id": "pains_50", "compteur": "pains", "cible": 50, "libelle": "Cuire 50 pains" },
        { "id": "laines_40", "compteur": "laines", "cible": 40, "libelle": "Tondre 40 laines" },
        { "id": "annee_1", "compteur": "nuits", "cible": 40, "libelle": "Traverser une année complète (40 nuits)" },
        { "id": "pleine_20", "compteur": "nuits100", "cible": 20, "libelle": "Cumuler 20 nuits à 100 % d'autonomie" }
      ],
      "MODE_LIBRE_NUITS_100": 5
    },
    "batiments": {
      "potager": { "nom": "Zone de culture", "icone": "🌱" },
      "serre": { "nom": "Serre", "icone": "🏡" },
      "poulailler": { "nom": "Poulailler", "icone": "🐔" },
      "silo": { "nom": "Silo", "icone": "🛖" },
      "pompe": { "nom": "Pompe", "icone": "⛲" },
      "paturage": { "nom": "Étable (moutons et vaches)", "icone": "🐑" },
      "four": { "nom": "Four", "icone": "🔥" },
      "frigo": { "nom": "Réfrigérateur", "icone": "🧊" },
      "verger": { "nom": "Verger", "icone": "🌳" },
      "batterie": { "nom": "Batterie", "icone": "🔋" },
      "panneau": { "nom": "Panneau solaire", "icone": "☀️" },
      "reservoir": { "nom": "Réservoir", "icone": "💧" }
    },
    "suivi": {
      "panneau": { "type": "niveau", "nom": "Panneau solaire", "icone": "☀️" },
      "batterie": { "type": "niveau", "nom": "Batterie", "icone": "🔋" },
      "pompe": { "type": "niveau", "nom": "Pompe", "icone": "⛲" },
      "reservoir": { "type": "niveau", "nom": "Réservoir", "icone": "💧" },
      "potager": { "type": "tuiles", "nom": "Zone de culture", "icone": "🌱", "note": "arrosage et récolte automatiques" },
      "poulailler": { "type": "niveau", "nom": "Poulailler", "icone": "🐔", "note": "nourrissage automatique" },
      "silo": { "type": "niveau", "nom": "Silo", "icone": "🛖" },
      "stations": { "type": "stations", "nom": "Ateliers", "icone": "🍞" }
    },
    "branches": [
      { "id": "energie", "nom": "Énergie", "icone": "⚡", "suivi": ["panneau", "batterie"] },
      { "id": "eau", "nom": "Eau", "icone": "💧", "suivi": ["pompe", "reservoir"] },
      { "id": "culture", "nom": "Culture", "icone": "🌱", "suivi": ["potager"] },
      { "id": "elevage", "nom": "Élevage", "icone": "🐔", "suivi": ["poulailler", "silo"] },
      { "id": "cuisine", "nom": "Cuisine", "icone": "🍳", "suivi": ["stations"] },
      { "id": "famille", "nom": "Famille", "icone": "👨‍👩‍👧‍👦", "suivi": [] },
      { "id": "outils", "nom": "Outils", "icone": "🛠️", "suivi": [] }
    ],
    "NOEUDS_RETIRES": {
      "cui_rotisserie": { "pt": 1, "prix": 300 },
      "fa_remedes": { "pt": 1, "prix": 100 },
      "fa_menus": { "pt": 1, "prix": 300 },
      "reveil_1": { "pt": 1, "prix": 200 },
      "reveil_2": { "pt": 1, "prix": 500 },
      "fa_routine": { "pt": 3, "prix": 2500 }
    },
    "noeuds": {
      "en_entretien": {
        "branche": "energie",
        "palier": 1,
        "nom": "Entretien préventif",
        "icone": "🔧",
        "fonction": "productivite",
        "pt": 1,
        "prix": 100,
        "ressources": { "bois": 6, "pierre": 4 },
        "requiert": [],
        "effet": { "usure": 75 },
        "description": "Le panneau, la batterie et les autres appareils s'usent 25 % moins vite."
      },
      "en_delestage": {
        "branche": "energie",
        "palier": 3,
        "nom": "Délestage intelligent",
        "icone": "🎛️",
        "fonction": "automatisation",
        "pt": 1,
        "prix": 400,
        "ressources": { "lingot_fer": 3, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "en_entretien" }, { "batiment": "batterie", "niveau": 2 }],
        "effet": { "delestage": { "seuil": 10 } },
        "description": "Sous 10 % de charge, le Moulin, la Presse et la Pompe se mettent en pause pour garder l'électricité du réfrigérateur. Ils repartent seuls quand la charge remonte."
      },
      "en_entretien_auto": {
        "branche": "energie",
        "palier": 3,
        "nom": "Entretien automatique",
        "icone": "🛠️",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 500,
        "ressources": { "lingot_fer": 4, "lingot_cuivre": 1 },
        "requiert": [{ "noeud": "en_entretien" }],
        "effet": { "entretienAuto": true },
        "description": "Chaque nuit, les appareils à 70 % d'usure ou plus sont entretenus automatiquement, au prix normal, si les pièces suffisent."
      },
      "en_frigo_eco": {
        "branche": "energie",
        "palier": 4,
        "nom": "Réfrigérateur basse consommation",
        "icone": "🧊",
        "fonction": "productivite",
        "pt": 1,
        "prix": 600,
        "ressources": { "lingot_cuivre": 3, "lingot_or": 1 },
        "requiert": [{ "noeud": "en_delestage" }, { "construit": "frigo" }],
        "effet": { "frigoConso": 70 },
        "description": "Le réfrigérateur consomme 30 % d'électricité en moins."
      },
      "en_hiver": {
        "branche": "energie",
        "palier": 4,
        "nom": "Panneaux orientables",
        "icone": "☀️",
        "fonction": "productivite",
        "pt": 2,
        "prix": 800,
        "ressources": { "lingot_fer": 4, "lingot_cuivre": 3, "lingot_or": 1 },
        "requiert": [{ "noeud": "en_entretien_auto" }],
        "effet": { "solaireBonus": 110 },
        "description": "Le panneau produit 10 % de plus."
      },
      "ea_econome": {
        "branche": "eau",
        "palier": 1,
        "nom": "Arrosage économe",
        "icone": "💧",
        "fonction": "productivite",
        "pt": 1,
        "prix": 150,
        "ressources": { "bois": 6, "pierre": 6 },
        "requiert": [{ "batiment": "pompe", "niveau": 2 }],
        "effet": { "eauArrosage": 85 },
        "description": "Chaque arrosage consomme 15 % d'eau en moins."
      },
      "ea_pluie": {
        "branche": "eau",
        "palier": 2,
        "nom": "Récupérateur d'eau de pluie",
        "icone": "🌧️",
        "fonction": "deblocage",
        "pt": 1,
        "prix": 250,
        "ressources": { "bois": 10, "lingot_fer": 2 },
        "requiert": [{ "noeud": "ea_econome" }],
        "effet": { "pluie": 15 },
        "description": "Chaque nuit, 15 L d'eau de pluie s'ajoutent au réservoir sans électricité."
      },
      "ea_irrigation": {
        "branche": "eau",
        "palier": 3,
        "nom": "Réseau d'irrigation",
        "icone": "🚿",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 900,
        "ressources": { "lingot_fer": 3, "lingot_cuivre": 4 },
        "requiert": [{ "noeud": "ea_econome" }, { "batiment": "pompe", "niveau": 3 }, { "tuiles": 18 }],
        "effet": { "auto": { "arrosage": ["potager"] } },
        "description": "Chaque matin à 7 h, des asperseurs arrosent toutes les parcelles plantées de la Zone de culture qui ont soif."
      },
      "ea_pompe_eco": {
        "branche": "eau",
        "palier": 3,
        "nom": "Pompe à haut rendement",
        "icone": "⛲",
        "fonction": "productivite",
        "pt": 1,
        "prix": 500,
        "ressources": { "lingot_fer": 2, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "ea_econome" }, { "noeud": "en_entretien" }],
        "effet": { "whParLitre": 75 },
        "description": "La pompe consomme 25 % d'électricité en moins par litre."
      },
      "ea_serre": {
        "branche": "eau",
        "palier": 4,
        "nom": "Irrigation de la Serre",
        "icone": "🏡",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 600,
        "ressources": { "lingot_cuivre": 4, "lingot_or": 1 },
        "requiert": [{ "noeud": "ea_irrigation" }, { "construit": "serre" }],
        "effet": { "auto": { "arrosage": ["serre"] } },
        "description": "Chaque matin à 7 h, les parcelles plantées de la Serre qui ont soif sont arrosées automatiquement."
      },
      "ea_gestion": {
        "branche": "eau",
        "palier": 5,
        "nom": "Gestion intelligente de l'eau",
        "icone": "📟",
        "fonction": "automatisation",
        "pt": 3,
        "prix": 1500,
        "ressources": { "lingot_cuivre": 3, "lingot_or": 2, "lingot_platine": 1 },
        "requiert": [{ "noeud": "ea_serre" }, { "noeud": "en_delestage" }],
        "effet": { "arrosagePrioritaire": true, "eauArrosage": 90 },
        "description": "Quand l'eau manque, l'arrosage automatique sert d'abord les plantes les plus proches de la récolte. Chaque arrosage consomme encore 10 % d'eau en moins."
      },
      "cu_outils": {
        "branche": "culture",
        "palier": 1,
        "nom": "Outils de jardin",
        "icone": "🧰",
        "fonction": "temps",
        "pt": 1,
        "prix": 100,
        "ressources": { "bois": 8, "pierre": 5 },
        "requiert": [],
        "effet": { "groupeEconome": 25 },
        "description": "« Planter partout », « Arroser tout » et « Récolter tout » coûtent 25 % d'énergie en moins."
      },
      "cu_semences": {
        "branche": "culture",
        "palier": 2,
        "nom": "Sélection des semences",
        "icone": "🌰",
        "fonction": "productivite",
        "pt": 1,
        "prix": 200,
        "ressources": { "bois": 6, "pierre": 4 },
        "requiert": [],
        "effet": { "grainesBonus": 1 },
        "description": "Les cultures qui rendent des graines en donnent une de plus."
      },
      "cu_recolte_auto": {
        "branche": "culture",
        "palier": 3,
        "nom": "Récolte automatique",
        "icone": "🧺",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 900,
        "ressources": { "lingot_fer": 5, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "cu_outils" }, { "tuiles": 24 }],
        "effet": { "auto": { "recolte": ["potager"] } },
        "description": "Un robot récolte les parcelles mûres de la Zone de culture : chaque matin à 6 h, il dresse sa liste de tâches et les fait une à une."
      },
      "semis_auto": {
        "branche": "culture",
        "palier": 4,
        "nom": "Semis automatique",
        "icone": "🌾",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 1200,
        "ressources": { "lingot_fer": 4, "lingot_cuivre": 3, "lingot_or": 1 },
        "requiert": [{ "noeud": "cu_recolte_auto" }, { "noeud": "ea_irrigation" }],
        "effet": { "auto": { "semis": ["potager"] } },
        "description": "Après chaque récolte, le robot replante la parcelle avec la même culture si une graine est disponible au-delà de la réserve de semences. Réglable parcelle par parcelle."
      },
      "cu_serre_auto": {
        "branche": "culture",
        "palier": 5,
        "nom": "Serre autonome",
        "icone": "🌿",
        "fonction": "automatisation",
        "pt": 3,
        "prix": 1500,
        "ressources": { "lingot_fer": 4, "lingot_or": 2, "lingot_platine": 2 },
        "requiert": [{ "noeud": "semis_auto" }, { "noeud": "ea_serre" }],
        "effet": { "auto": { "recolte": ["serre"], "semis": ["serre"] } },
        "description": "Le robot récolte et replante aussi la Serre chaque matin, avec les mêmes réglages que le semis automatique."
      },
      "cu_verger_auto": {
        "branche": "culture",
        "palier": 4,
        "nom": "Récolte du verger",
        "icone": "🍎",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 800,
        "ressources": { "bois": 10, "lingot_fer": 3, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "cu_recolte_auto" }, { "construit": "verger" }],
        "effet": { "auto": { "recolte": ["verger"] } },
        "description": "Chaque nuit, les arbres du Verger en fruits sont cueillis automatiquement (moitié de l'XP)."
      },
      "el_ration": {
        "branche": "elevage",
        "palier": 2,
        "nom": "Ration équilibrée",
        "icone": "🌾",
        "fonction": "productivite",
        "pt": 1,
        "prix": 200,
        "ressources": { "bois": 8, "lingot_fer": 1 },
        "requiert": [{ "construit": "poulailler" }],
        "effet": { "poulesParBle": 5, "parBle": 2 },
        "description": "2 blé nourrissent 5 poules au lieu de 4."
      },
      "el_mangeoire": {
        "branche": "elevage",
        "palier": 3,
        "nom": "Mangeoire à trémie",
        "icone": "🪣",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 600,
        "ressources": { "bois": 6, "lingot_fer": 3 },
        "requiert": [{ "batiment": "poulailler", "niveau": 3 }, { "batiment": "silo", "niveau": 2 }],
        "effet": { "auto": { "nourrissage": ["poulailler"] } },
        "description": "Chaque nuit, les poules sont nourries automatiquement avec le blé du Silo."
      },
      "el_tonte": {
        "branche": "elevage",
        "palier": 4,
        "nom": "Tonte planifiée",
        "icone": "✂️",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 500,
        "ressources": { "lingot_fer": 3, "lingot_or": 1 },
        "requiert": [{ "noeud": "el_mangeoire" }, { "construit": "paturage" }],
        "effet": { "auto": { "tonte": ["paturage"] } },
        "description": "Chaque nuit, les moutons dont la laine est prête sont tondus automatiquement, avant de manger leur paille."
      },
      "el_paturage": {
        "branche": "elevage",
        "palier": 4,
        "nom": "Étable agrandie",
        "icone": "🐑",
        "fonction": "productivite",
        "pt": 1,
        "prix": 400,
        "ressources": { "bois": 20, "pierre": 10 },
        "requiert": [{ "construit": "paturage" }],
        "effet": { "croissanceSurface": 110 },
        "description": "Le prix de chaque place supplémentaire pour les moutons et les vaches augmente de 10 % au lieu de 20 %."
      },
      "prepa_1": {
        "branche": "cuisine",
        "palier": 2,
        "nom": "Préparation rapide I",
        "icone": "⏱️",
        "fonction": "temps",
        "pt": 1,
        "prix": 300,
        "ressources": { "pierre": 4, "lingot_fer": 2 },
        "requiert": [],
        "effet": { "tempsPrepa": 80 },
        "description": "Les temps de préparation (Four, Cuisine, Moulin, Presse) baissent de 20 %."
      },
      "cui_boulangerie": {
        "branche": "cuisine",
        "palier": 2,
        "nom": "Boulangerie",
        "icone": "🥖",
        "fonction": "deblocage",
        "pt": 1,
        "prix": 200,
        "ressources": { "pierre": 12, "lingot_fer": 1 },
        "requiert": [{ "construit": "four" }],
        "effet": { "recettes": ["pain_ail", "tarte_fraises", "quiche_epinards"] },
        "description": "Nouvelles recettes au Four : pain à l'ail, tarte aux fraises, quiche aux épinards."
      },
      "cui_serie": {
        "branche": "cuisine",
        "palier": 3,
        "nom": "Préparations en série",
        "icone": "📋",
        "fonction": "automatisation",
        "pt": 2,
        "prix": 500,
        "ressources": { "lingot_fer": 3, "lingot_cuivre": 1 },
        "requiert": [{ "noeud": "prepa_1" }],
        "effet": { "fileAttente": 3 },
        "description": "Le Four, la Cuisine et la Presse acceptent jusqu'à 3 préparations à la suite : elles s'enchaînent sans clic, ingrédients réservés au lancement. (Le Moulin, lui, moud déjà la quantité de blé que tu choisis.)"
      },
      "cui_laiterie": {
        "branche": "cuisine",
        "palier": 3,
        "nom": "Laiterie",
        "icone": "🧀",
        "fonction": "deblocage",
        "pt": 1,
        "prix": 300,
        "ressources": { "bois": 6, "lingot_fer": 2 },
        "requiert": [{ "construit": "paturage" }],
        "effet": { "recettes": ["fromage_frais", "riz_au_lait", "fromage_alpage"] },
        "description": "Nouvelles recettes en Cuisine : fromage frais, riz au lait, fromage d'alpage (avec le lait des vaches nourries aux herbes de montagne)."
      },
      "prepa_2": {
        "branche": "cuisine",
        "palier": 4,
        "nom": "Préparation rapide II",
        "icone": "⏱️",
        "fonction": "temps",
        "pt": 1,
        "prix": 700,
        "ressources": { "lingot_cuivre": 3, "lingot_or": 1 },
        "requiert": [{ "noeud": "cui_serie" }],
        "effet": { "tempsPrepa": 80 },
        "description": "Encore −20 % sur les temps de préparation (64 % du temps de départ en tout)."
      },
      "cui_conserverie": {
        "branche": "cuisine",
        "palier": 4,
        "nom": "Mise en bocaux",
        "icone": "🫙",
        "fonction": "deblocage",
        "pt": 2,
        "prix": 600,
        "ressources": { "lingot_fer": 3, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "cui_serie" }, { "noeud": "fa_cellier" }],
        "effet": { "recettes": ["bocal_legumes", "confiture_fraises"] },
        "description": "Nouvelles recettes en Cuisine : bocal de légumes (4 légumes d'une même sorte, ne périme pas) et confiture de fraises."
      },
      "cui_epicerie": {
        "branche": "cuisine",
        "palier": 4,
        "nom": "Épicerie fine",
        "icone": "☕",
        "fonction": "deblocage",
        "pt": 2,
        "prix": 800,
        "ressources": { "lingot_cuivre": 2, "lingot_or": 2 },
        "requiert": [{ "noeud": "cui_laiterie" }, { "construit": "serre" }],
        "effet": { "recettes": ["chocolat_chaud", "cafe_boisson", "creme_vanille", "biere_artisanale"] },
        "description": "Recettes de luxe en Cuisine : chocolat chaud, café, crème à la vanille, bière artisanale."
      },
      "fa_sommeil": {
        "branche": "famille",
        "palier": 1,
        "nom": "Bon sommeil",
        "icone": "🛏️",
        "fonction": "productivite",
        "pt": 1,
        "prix": 100,
        "ressources": { "bois": 10 },
        "requiert": [],
        "effet": { "reveilEnergie": 10 },
        "description": "Au réveil, l'énergie remonte de 10 points de plus."
      },
      "fa_cellier": {
        "branche": "famille",
        "palier": 2,
        "nom": "Cellier",
        "icone": "🏚️",
        "fonction": "productivite",
        "pt": 1,
        "prix": 250,
        "ressources": { "pierre": 12, "bois": 6 },
        "requiert": [],
        "effet": { "conservation": 1 },
        "description": "Hors réfrigérateur, tout ce qui périme se garde une nuit de plus."
      },
      "fa_gouter": {
        "branche": "famille",
        "palier": 3,
        "nom": "Goûter",
        "icone": "🥪",
        "fonction": "productivite",
        "pt": 1,
        "prix": 300,
        "ressources": { "bois": 8, "lingot_fer": 1 },
        "requiert": [{ "noeud": "fa_cellier" }],
        "effet": { "gouter": 150 },
        "description": "Ce que tu manges dans la journée rend 50 % d'énergie en plus."
      },
      "out_hotte": {
        "branche": "outils",
        "palier": 1,
        "nom": "Hotte de bûcheron",
        "icone": "🧺",
        "fonction": "productivite",
        "pt": 1,
        "prix": 80,
        "ressources": { "bois": 12, "pierre": 2 },
        "requiert": [],
        "effet": { "recolteBonus": 33 },
        "description": "Chaque coup de hache ou de pioche sur un arbre ou un rocher a 1 chance sur 3 de rapporter 1 bois ou 1 pierre de plus."
      },
      "out_lames": {
        "branche": "outils",
        "palier": 2,
        "nom": "Lames affûtées",
        "icone": "🪓",
        "fonction": "productivite",
        "pt": 1,
        "prix": 200,
        "ressources": { "bois": 4, "lingot_fer": 2 },
        "requiert": [{ "noeud": "out_hotte" }],
        "effet": { "coupsMoins": 1 },
        "description": "Arbres, rochers et minerais de la grotte tombent en 2 coups au lieu de 3."
      },
      "out_socs": {
        "branche": "outils",
        "palier": 2,
        "nom": "Socs en fer",
        "icone": "⛏️",
        "fonction": "productivite",
        "pt": 1,
        "prix": 200,
        "ressources": { "bois": 4, "lingot_fer": 2 },
        "requiert": [],
        "effet": { "economie": { "labourer": 50 } },
        "description": "La houe coûte 50 % d'énergie en moins."
      },
      "out_lampe": {
        "branche": "outils",
        "palier": 3,
        "nom": "Lampe de mineur",
        "icone": "🔦",
        "fonction": "productivite",
        "pt": 1,
        "prix": 300,
        "ressources": { "lingot_fer": 1, "lingot_cuivre": 2 },
        "requiert": [{ "noeud": "out_lames" }],
        "effet": { "grotte": { "lumiere": 150, "minerai": 25 } },
        "description": "Dans la grotte, la lumière porte 50 % plus loin et chaque minerai a 1 chance sur 4 d'en donner un de plus."
      },
      "out_moulinet": {
        "branche": "outils",
        "palier": 3,
        "nom": "Moulinet en laiton",
        "icone": "🎣",
        "fonction": "productivite",
        "pt": 1,
        "prix": 300,
        "ressources": { "lingot_fer": 1, "lingot_cuivre": 2 },
        "requiert": [],
        "effet": { "pecheJour": 2, "pecheTouche": 20 },
        "description": "Chaque eau donne 2 prises de plus par jour, et quand rien ne mord, un poisson a encore 1 chance sur 5 de mordre."
      },
      "out_platine": {
        "branche": "outils",
        "palier": 5,
        "nom": "Outils en platine",
        "icone": "🛠️",
        "fonction": "productivite",
        "pt": 2,
        "prix": 1200,
        "ressources": { "lingot_or": 2, "lingot_platine": 2 },
        "requiert": [{ "noeud": "out_lames" }, { "noeud": "out_socs" }],
        "effet": { "economie": { "couper": 50, "piocher": 50, "labourer": 50, "pecher": 50 } },
        "description": "Couper, piocher, labourer et pêcher coûtent 50 % d'énergie en moins."
      }
    },
    "RECETTES_LIBRES": [
      "pain",
      "omelette",
      "ratatouille",
      "gratin_patates",
      "compote",
      "tarte_pommes",
      "soupe_legumes",
      "salade_tomates",
      "farine",
      "huile",
      "lingot_fer",
      "lingot_cuivre",
      "lingot_or",
      "lingot_platine",
      "omelette_champignons",
      "poisson_grille",
      "raclette",
      "creme_marrons",
      "tarte_myrtilles",
      "pain_epices",
      "mayonnaise",
      "quenelle_poisson"
    ]
  },
  "CHAPITRES": {
    "liste": [
      {
        "titre": "L'héritage",
        "icone": "🏚️",
        "intro": "« Ne te laisse pas impressionner par la terre », t'écrit ta mère. La ferme du grand-père est à ta famille, mais rien ne fonctionne. Répare la maison, installe le panneau solaire et la pompe, puis le réservoir ; fabrique une houe à l'Atelier, laboure, plante : la première récolte lancera la ferme. Les conserves nourrissent la famille en attendant.",
        "introSauvage": "« Ne te laisse pas impressionner par la terre », t'écrit ta mère. Celle de ton grand-père est à ta famille, sans maison ni bâtiment. Ramasse des pierres et du bois, construis l'Atelier, fabriques-y une faux pour faucher l'herbe haute (ses fibres), puis bâtis ton foyer : une pièce close et une paillasse. Fabrique une houe, laboure, plante et arrose à la cruche, remplie au puits : la première récolte lancera la ferme. Les conserves nourrissent la famille en attendant.",
        "objectifs": [
          {
            "type": "maison",
            "cible": 1,
            "libelle": "Réparer la maison",
            "libelleSauvage": "Bâtir le foyer (une pièce close, une paillasse)",
            "unite": ""
          },
          {
            "type": "panneau",
            "sauvage": false,
            "cible": 1,
            "libelle": "Acheter le panneau solaire",
            "libelleSauvage": "Poser le panneau solaire",
            "unite": ""
          },
          {
            "type": "pompe",
            "sauvage": false,
            "cible": 1,
            "libelle": "Acheter la pompe",
            "libelleSauvage": "Poser la pompe sur le puits",
            "unite": ""
          },
          { "type": "reservoir", "sauvage": false, "cible": 1, "libelle": "Acheter le réservoir", "libelleSauvage": "Poser la citerne", "unite": "" },
          { "type": "houe", "cible": 1, "libelle": "Fabriquer une houe à l'Atelier", "libelleSauvage": "Fabriquer une houe à l'Atelier", "unite": "" },
          { "type": "labours", "cible": 6, "libelle": "Labourer 6 tuiles", "unite": "" },
          { "type": "semis", "cible": 6, "libelle": "Planter 6 parcelles", "unite": "" },
          { "type": "arrosees", "cible": 6, "libelle": "Arroser tes parcelles", "unite": "" },
          { "type": "recoltes", "cible": 1, "libelle": "Faire une première récolte", "unite": "" }
        ]
      },
      {
        "titre": "Le grenier",
        "icone": "🌾",
        "intro": "« Un grenier, ça se remplit pas en un jour », dit le cocher. De nouvelles cultures, un Silo à construire et du blé à rentrer. Chaque jour vers 10 h, la calèche s'arrête devant l'entrée de la ferme : son cocher a quelque chose pour toi, et il te prendra ce que tu as en trop.",
        "objectifs": [
          { "type": "niveau", "cible": 2, "libelle": "Atteindre le niveau 2", "unite": "" },
          { "type": "cultures", "cible": 4, "libelle": "Récolter 4 cultures différentes", "unite": "" },
          { "type": "silo", "cible": 1, "libelle": "Construire le Silo (niveau 3)", "unite": "" },
          { "type": "semisBle", "cible": 1, "libelle": "Planter du blé", "unite": "" },
          { "type": "siloBle", "cible": 50, "libelle": "Stocker 50 blés au Silo", "unite": "" },
          { "type": "caleche", "cible": 50, "libelle": "Vendre pour 50 pièces à la calèche", "unite": "💰" }
        ]
      },
      {
        "titre": "Le poulailler",
        "icone": "🐔",
        "intro": "« On ne laisse pas une poule sans grain, ni une famille sans œufs », dit Odile. Une ponte régulière demande du blé, et la ferme doit nourrir la moitié de la famille. L'Arbre des technologies demande maintenant du fer : une pioche en main, cherche la mine de la ferme, cachée dans les bois, et descends-y. Et il est temps de sortir de la ferme : suis le chemin de la calèche jusqu'au premier hameau.",
        "objectifs": [
          { "type": "pontes", "cible": 7, "libelle": "Pondre 7 nuits d'affilée", "unite": "nuits" },
          { "type": "autonomie", "cible": 50, "libelle": "Atteindre 50 % d'autonomie", "unite": "%" },
          { "type": "objet", "item": "minerai_fer", "cible": 4, "libelle": "Rapporter 4 minerais de fer de la mine", "unite": "" },
          { "type": "hameaux", "cible": 1, "libelle": "Découvrir un hameau du grand monde", "unite": "" }
        ]
      },
      {
        "titre": "Le four et le livre de recette",
        "icone": "🍞",
        "intro": "« Ton pain se vend mieux que ton blé. Et le fer, ça se cuit aussi », dit Achille. Moudre, presser, cuire : le pain et les plats cuisinés valent plus que leurs ingrédients. Le Four fond aussi le minerai de la grotte, avec du bois : les lingots paient les technologies. Les grottes de la montagne, au nord et à l'ouest du monde, en ont bien plus que la mine.",
        "objectifs": [
          { "type": "pains", "cible": 5, "recette": "pain", "libelle": "Cuire 5 pains", "unite": "" },
          { "type": "plats", "cible": 3, "exclut": ["pain"], "libelle": "Préparer 3 plats différents (hors pain)", "unite": "" },
          { "type": "objet", "item": "lingot_fer", "cible": 1, "libelle": "Fondre un lingot de fer au Four", "unite": "" },
          { "type": "grotteMonde", "cible": 1, "libelle": "Entrer dans une grotte de la montagne", "unite": "" },
          { "type": "monde", "cible": 10, "libelle": "Voir 10 % du grand monde", "unite": "%" }
        ]
      },
      {
        "titre": "Le troupeau",
        "icone": "🐑",
        "intro": "« Papa disait qu'une ferme sans bêtes, c'est un jardin qui se donne des airs », t'écrit ta mère. Des moutons pour la laine, des vaches pour le lait. Ils vivent à l'Étable et mangent chaque nuit de la paille : fauche l'herbe haute de la carte avec la faux, puis jette ses fibres dans la botteleuse (Atelier) pour en faire des bottes. Les hameaux ont leurs bergers et leurs pêcheurs : va voir comment ils vivent, et tente ta chance à la canne au bord de la mer.",
        "objectifs": [
          { "type": "laines", "cible": 10, "libelle": "Tondre 10 laines", "unite": "" },
          { "type": "autonomie", "cible": 60, "libelle": "Atteindre 60 % d'autonomie", "unite": "%" },
          { "type": "hameaux", "cible": 3, "libelle": "Découvrir 3 hameaux", "unite": "" },
          { "type": "pecheMer", "cible": 1, "libelle": "Pêcher un poisson dans la mer", "unite": "" }
        ]
      },
      {
        "titre": "Toute l'année",
        "icone": "📅",
        "intro": "« On ne juge pas une ferme aux bons jours, mais aux mauvais », dit Odile. La Serre, le Verger et le Réfrigérateur pour tenir dans la durée : dix nuits d'affilée bien nourris. Ce qui manque à la ferme, les hameaux l'ont parfois : la calèche te vend ce qu'elle leur achète. Et le pays a ses bêtes, à regarder sans les chasser.",
        "objectifs": [
          {
            "type": "tenue",
            "cible": 1,
            "nuits": 10,
            "moyenne": 80,
            "libelle": "Tenir 10 nuits d'affilée à 80 % d'autonomie en moyenne",
            "unite": ""
          },
          { "type": "achatsHameaux", "cible": 5, "libelle": "Acheter 5 produits des hameaux à la calèche", "unite": "" },
          { "type": "faune", "cible": 6, "libelle": "Voir 6 bêtes sauvages différentes", "unite": "" }
        ]
      },
      {
        "titre": "Famille autonome",
        "icone": "🏡",
        "intro": "« Maurice disait : le jour où ta table se remplit sans moi, je passe quand même. Pour causer », dit Achille. Le dernier défi : nourrir la famille avec ce que produit la ferme, et rien d'autre. Et connaître son pays : les hameaux du bout des chemins, la montagne, la côte.",
        "objectifs": [
          { "type": "serie100", "cible": 7, "libelle": "Atteindre 100 % d'autonomie 7 nuits d'affilée", "unite": "nuits" },
          { "type": "hameaux", "cible": 5, "libelle": "Découvrir 5 hameaux", "unite": "" },
          { "type": "monde", "cible": 15, "libelle": "Voir 15 % du grand monde", "unite": "%" }
        ]
      }
    ]
  },
  "COURRIER": {
    "notaire_legs": {
      "quand": { "niveau": 9 },
      "cadeaux": { "enveloppe_maurice": 1 },
      "icone": "📜",
      "objet": "Une seconde lettre du notaire",
      "expediteur": "Maître Durand, notaire",
      "lieu": "Étude de Saint-Aubin",
      "texte": [
        "Madame, Monsieur {nom},",
        "En rangeant les papiers de votre grand-père, j'ai retrouvé une enveloppe à votre nom, cachetée de sa main. Je vous la fais suivre telle quelle.",
        "Il a écrit sur le dessus : « Pour les toits de Céron : Odile saura. Ou pour toi, si tu en as plus besoin qu'eux. Tu sauras. M. »",
        "Je ne l'ai pas ouverte. Elle est épaisse.",
        "Je vous prie d'agréer mes salutations distinguées."
      ],
      "signature": "Maître Durand"
    },
    "notaire_heritage": {
      "quand": { "depart": true },
      "icone": "📜",
      "objet": "Une lettre du notaire",
      "expediteur": "Maître Durand, notaire",
      "lieu": "Étude de Saint-Aubin",
      "texte": [
        "Madame, Monsieur {nom},",
        "J'ai l'honneur de vous confirmer que la ferme de votre grand-père vous revient désormais : la maison, les terres, le moulin et les dépendances.",
        "Je dois cependant vous prévenir : rien n'y fonctionne plus. Le toit de la maison fuit, le panneau solaire et la pompe ont été vendus, et les champs sont retournés à l'herbe.",
        "Votre grand-père vous a laissé de quoi commencer. Réparez d'abord la maison ; le reste viendra.",
        "Je vous prie d'agréer mes salutations distinguées, et mes vœux de réussite."
      ],
      "texteSauvage": [
        "Madame, Monsieur {nom},",
        "La terre de votre grand-père, Maurice, au bout du chemin, vous revient : de l'herbe, du bois et des étangs, sans maison.",
        "Tout y est à bâtir. Commencez par un abri ; le reste viendra.",
        "Je vous prie d'agréer mes salutations distinguées."
      ],
      "signature": "Maître Durand"
    },
    "adele_arrivee": {
      "quand": { "depart": true },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Le bac a dû te paraître long. Pour moi aussi, à ton âge, et pourtant je le prenais dans l'autre sens.",
        "Ne te laisse pas impressionner par la terre. Elle n'a l'air de rien, mais elle est bonne. Papa disait qu'il suffisait de l'écouter. Je n'ai jamais su ce qu'il entendait.",
        "Au fait, si tu passes au Gué, dis bonjour à Odile. Elle va te trouver maigre.",
        "Écris-moi. Embrasse tout le monde."
      ],
      "signature": "Maman"
    },
    "adele_recolte": {
      "quand": { "chapitre": 2 },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Les nouvelles vont vite : Odile m'a écrit avant toi. Il paraît que tu as fait ta première récolte !",
        "Papa faisait toujours la même chose, le jour de la première récolte : il en portait un panier à quelqu'un. Jamais le même.",
        "Au fait, le grand arbre tordu au-dessus du Gué, il s'y arrêtait toujours en rentrant. Je n'ai jamais su pourquoi.",
        "Mange un peu de ce que tu as fait pousser. Pour moi.",
        "Je t'embrasse."
      ],
      "signature": "Maman"
    },
    "adele_veillee": {
      "quand": { "fait": "veillee.1" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        {
          "m": "Odile t'a tutoyé ! Elle m'a écrit trois lignes pour me le dire, c'est beaucoup pour elle.",
          "f": "Odile t'a tutoyée ! Elle m'a écrit trois lignes pour me le dire, c'est beaucoup pour elle."
        },
        "Moi, elle m'a tutoyée à six ans et vouvoyée à seize, le jour où j'ai pris le bac. Elle n'est jamais revenue au tu.",
        "Des veillées, je me souviens surtout du froid sur les jambes, et de papa qui n'y venait jamais : il était sur la route.",
        "Au fait, dis bonjour à Frida, si tu la croises au bord de son étang. Elle me faisait un peu peur, et je l'adorais.",
        "Je t'embrasse."
      ],
      "signature": "Maman"
    },
    "adele_robot": {
      "quand": { "fait": "machine.station_robot" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Un robot ! Frida doit être aux anges. Elle en dessinait déjà sur les nappes de la cuisine quand j'avais ton âge.",
        "Fais attention aux anciens. Pas pour toi : pour eux. Odile a mis dix ans à accepter le panneau solaire de papa.",
        "Au fait, papa disait que les machines, c'est comme les chevaux : tout dépend de qui tient les rênes.",
        "Je t'embrasse fort."
      ],
      "signature": "Maman"
    },
    "adele_fete_maurice": {
      "quand": { "fait": "fin.nouveau_maurice" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Odile t'a donné la cloche. Je l'ai su avant ta lettre : on en parle jusque sur le quai de Cadolon.",
        "Cette cloche, je l'entendais arriver de loin quand j'étais petite. Papa la sonnait deux fois devant chaque maison : une pour dire bonjour, une pour dire qu'il repartait.",
        "Je ne sais pas comment tu as fait. Si, je sais : tu as fait comme lui.",
        {
          "m": "Je suis fière de toi, mon grand. Je viendrai peut-être, un jour. Pas tout de suite.",
          "f": "Je suis fière de toi, ma grande. Je viendrai peut-être, un jour. Pas tout de suite."
        }
      ],
      "signature": "Maman"
    },
    "adele_fete_voisin": {
      "quand": { "fait": "fin.voisin_tranquille" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Fernand t'emmène pêcher ? Alors c'est fait : tu es d'ici. Il n'a jamais emmené personne, pas même papa.",
        "Tu n'as pas fait de bruit. C'est ce que les gens de Céron préfèrent, même s'ils ne le disent pas.",
        "Au fait, à la cale des Mouettes, il y a une pierre plate où papa s'asseyait pour attendre le bac. Assieds-toi dessus, pour moi.",
        "Je t'embrasse."
      ],
      "signature": "Maman"
    },
    "adele_fete_autrement": {
      "quand": { "fait": "fin.autrement" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Frida m'a écrit. Frida, qui n'écrit jamais ! Quatre pages, dont trois de chiffres. La quatrième parlait de toi.",
        "Elle dit que tu as fait ce qu'elle n'a jamais réussi : montrer à l'île qu'une machine peut la servir.",
        "Papa aurait râlé. Puis il serait venu voir. Puis il aurait râlé un peu moins.",
        "Je suis fière de toi, tu sais."
      ],
      "signature": "Maman"
    },
    "adele_fete_riche": {
      "quand": { "fait": "fin.riche" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "On m'a raconté la fête. Ta ferme est la plus grande de l'île, paraît-il : on la voit depuis le bac.",
        "Je ne te fais pas de reproche. Je n'ai jamais su ce qu'il fallait faire, là-bas, moi non plus.",
        {
          "m": "Tu es heureux, là-bas ? C'est la seule chose que je veux savoir.",
          "f": "Tu es heureuse, là-bas ? C'est la seule chose que je veux savoir."
        },
        "Au fait, Odile aime les visites. Même quand elle dit le contraire.",
        "Je t'embrasse."
      ],
      "signature": "Maman"
    },
    "theo_cadolon": {
      "quand": { "fait": "theo.part", "apres": 5 },
      "icone": "✉️",
      "objet": "Une lettre de Théo",
      "expediteur": "Théo",
      "lieu": "Cadolon",
      "texte": [
        "Salut,",
        "Cadolon, c'est grand. Il y a des machines partout, même pour ouvrir les portes. Au début, j'ai trouvé ça génial.",
        "Je travaille dans un atelier du port. On répare des moteurs de bateaux. Le chef dit que j'ai des mains. Frida disait pareil, en mieux.",
        "Le soir, je pense à la scie. Elle grinçait à la troisième planche, toujours. Ici, rien ne grince. C'est bizarre.",
        "Tu peux dire à papa que je mange bien ? Toi, il te croira.",
        "Et dis à Achille que sa roue arrière gauche, faut la graisser."
      ],
      "signature": "Théo"
    },
    "adele_serre": {
      "quand": { "debloque": "serre" },
      "cadeaux": { "cacao": 1, "vanille": 1, "cafe": 1 },
      "icone": "💌",
      "objet": "Une lettre de ta mère, rapportée de voyage",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Me voilà rentrée de mon grand voyage sur le continent américain. Trois semaines dans les montagnes, chez des planteurs qui m'ont tout montré, et un mal de dos que je garde en souvenir.",
        "Odile m'a écrit que tu bâtissais une serre. Alors j'ai glissé dans l'enveloppe trois petits trésors de là-bas : une fève de cacao, une gousse de vanille, un grain de café. Dehors, chez vous, ils auraient trop froid ; à l'abri, avec de l'eau et de la patience, ils pousseront.",
        "Les planteurs disent : à chaque récolte, garde de quoi replanter. La vanille est la plus lente, ne te décourage pas.",
        "Au fait, papa rapportait toujours une graine de ses tournées et la plantait au bord du chemin. Il disait que c'était pour ceux d'après.",
        "Écris-moi le jour où tu boiras ton premier chocolat. Je t'embrasse."
      ],
      "signature": "Maman"
    }
  },
  "NIVEAUX": {
    "SEUILS": [0, 500, 1200, 3000, 7500, 20000, 40000, 80000, 180000, 400000],
    "liste": [
      { "debloque": ["carotte", "patate", "tomate"] },
      { "debloque": ["courgette", "aubergine", "oignon", "cuisine"] },
      { "debloque": ["poivron", "ail", "fraise", "ble", "silo", "poulailler", "marche"] },
      { "debloque": ["epinard", "tournesol", "riz", "moulin"] },
      { "debloque": ["houblon", "four", "paturage", "moutons"] },
      { "debloque": ["presse", "verger", "ecurie"] },
      { "debloque": ["cacao", "vanille", "cafe", "serre", "energie"] },
      { "debloque": ["frigo"] },
      { "debloque": [], "note": "un courrier du notaire : un héritage caché" },
      { "debloque": ["veillee"] }
    ],
    "ELEMENTS": {
      "marche": {
        "sauvage": true,
        "nom": "La calèche",
        "icone": "🐴",
        "note": "elle passe à la ferme chaque jour : vends-lui tes récoltes, achète-lui des graines et les produits des hameaux"
      },
      "energie": {
        "sauvage": true,
        "nom": "Énergie et eau",
        "icone": "☀️",
        "note": "panneau solaire, pompe, citerne et batterie : l'automatisation commence"
      },
      "silo": { "nom": "Silo", "icone": "🛖", "note": "stock de blé ; le blé ne se plante qu'une fois le Silo construit" },
      "poulailler": { "nom": "Poulailler", "icone": "🐔", "note": "poules et œufs (une poule s'attire à l'Atelier : un nid garni)" },
      "four": { "nom": "Four", "icone": "🔥", "note": "pain, gratin, tartes" },
      "cuisine": { "nom": "Cuisine", "icone": "🍳", "note": "omelette, ratatouille, compote, soupe, et le Livre de recette" },
      "moulin": { "nom": "Moulin", "icone": "⚙️", "note": "la farine" },
      "presse": { "nom": "Presse", "icone": "🌻", "note": "huile de tournesol" },
      "paturage": { "nom": "Étable", "icone": "🐑", "note": "des places pour les moutons et les vaches" },
      "moutons": { "nom": "Moutons et vaches", "icone": "🧶", "note": "la laine des moutons, le lait des vaches ; ils mangent la paille fauchée" },
      "serre": { "nom": "Serre", "icone": "🏡", "note": "cacao, vanille et café, et des légumes à l'abri" },
      "verger": { "nom": "Verger", "icone": "🌳", "note": "pommiers et poiriers" },
      "ecurie": {
        "sauvage": true,
        "nom": "Écurie",
        "icone": "🐴",
        "note": "un cheval à monter sur toutes les cartes, la corde et le poteau pour l'attacher"
      },
      "veillee": { "nom": "Veillée à la ferme", "icone": "🌕", "note": "les soirs de pleine lune, les voisins des hameaux viennent veiller chez toi" },
      "frigo": { "nom": "Réfrigérateur", "icone": "🧊", "note": "conservation sans péremption" }
    },
    "XP": {
      "labourer": 10,
      "ramasser": 2,
      "fabriquer": 10,
      "couper": 10,
      "piocher": 10,
      "faucher": 4,
      "pecher": 15,
      "planter": 10,
      "arroser": 10,
      "recolter": 20,
      "cueillir": 20,
      "oeuf": 10,
      "lait": 30,
      "tondre": 30,
      "cuisiner": 40,
      "cuireFour": 50,
      "moudre": 10,
      "presser": 10,
      "vendre": 1
    },
    "AUTO": 50,
    "TUILES": [12, 24, 40, 60, 84, 112, 144, 180, 220, 264],
    "CHAPITRES_XP": [200, 500, 1000, 2500, 2000, 4000, 8000],
    "CHAPITRE_NIVEAU": [1, 2, 3, 6, 6, 8, 8, 8]
  },
  "GROTTE": {
    "LARGEUR": 46,
    "HAUTEUR": 34,
    "NIVEAUX": 8,
    "MURS": 0.46,
    "PASSES": 5,
    "MINERAI": 0.07,
    "MINERAI_NIVEAU": 0.06,
    "POIDS": {
      "fer": { "FIXE": 1 },
      "cuivre": { "DEPUIS": 1, "PENTE": 0.35 },
      "or": { "DEPUIS": 2.5, "PENTE": 0.18 },
      "platine": { "DEPUIS": 4, "PENTE": 0.1 }
    },
    "COUPS": 3,
    "COUP": 0.5,
    "MONDE": {
      "NOM": "La grotte de la montagne",
      "NIVEAUX": 5,
      "MINERAI": 0.1,
      "MINERAI_NIVEAU": 0.1,
      "POIDS": {
        "fer": { "FIXE": 1 },
        "cuivre": { "DEPUIS": 0, "PENTE": 0.4 },
        "or": { "DEPUIS": 0.5, "PENTE": 0.25 },
        "platine": { "DEPUIS": 1.5, "PENTE": 0.14 },
        "quartz": { "FIXE": 0.3 },
        "amethyste": { "DEPUIS": 1, "PENTE": 0.1 }
      },
      "FILONS": { "cuivre": 2, "or": 2, "platine": 2, "quartz": 2.5, "amethyste": 2.5 }
    }
  },
  "DEHORS": { "bac_fleurs": { "nom": "Bac à fleurs", "prix": 60 } },
  "MEUBLES": {
    "chaise": { "nom": "Chaise", "piece": "cuisine", "prix": 30, "bonheur": 1, "max": "membres" },
    "table": { "nom": "Table", "piece": "cuisine", "prix": 90, "bonheur": 3 },
    "tapis_1": { "vendeur": "genets", "nom": "Tapis tressé", "piece": "salon", "prix": 40, "bonheur": 2 },
    "tapis_2": { "vendeur": "genets", "nom": "Tapis rouge", "piece": "chambre", "prix": 50, "bonheur": 2 },
    "tapis_3": { "vendeur": "genets", "nom": "Tapis bleu", "piece": "cuisine", "prix": 60, "bonheur": 2 },
    "lit_adulte": { "nom": "Lit adulte", "piece": "chambre", "prix": 120, "bonheur": 4, "max": "adultes" },
    "lit_enfant": { "nom": "Lit enfant", "piece": "chambre", "prix": 90, "bonheur": 4, "max": "enfants" },
    "chevet": { "nom": "Table de chevet", "piece": "chambre", "prix": 35, "bonheur": 1 },
    "canape": { "nom": "Canapé", "piece": "salon", "prix": 150, "bonheur": 4 },
    "table_basse": { "nom": "Table basse", "piece": "salon", "prix": 60, "bonheur": 2 },
    "tableau_1": { "nom": "Tableau : la ferme", "piece": "salon", "prix": 45, "bonheur": 2 },
    "tableau_2": { "nom": "Tableau : le bouquet", "piece": "salon", "prix": 55, "bonheur": 2 },
    "tableau_3": { "nom": "Tableau : la mer", "piece": "chambre", "prix": 70, "bonheur": 3 },
    "buffet": { "nom": "Buffet vaisselier", "piece": "cuisine", "prix": 140, "bonheur": 4 },
    "commode": { "nom": "Commode", "piece": "chambre", "prix": 110, "bonheur": 3 },
    "armoire_chene": { "nom": "Armoire de chêne", "piece": "chambre", "prix": 160, "bonheur": 4 },
    "armoire_peinte": { "nom": "Armoire peinte", "piece": "chambre", "prix": 180, "bonheur": 4 },
    "armoire_glace": { "nom": "Armoire à glace", "piece": "chambre", "prix": 130, "bonheur": 3 },
    "cuisine_porte": { "nom": "Bas de cuisine à porte", "piece": "cuisine", "prix": 50, "bonheur": 1, "max": 4 },
    "cuisine_tiroirs": { "nom": "Bas de cuisine à tiroirs", "piece": "cuisine", "prix": 55, "bonheur": 1, "max": 4 },
    "cuisine_sauge": { "nom": "Bas de cuisine vitré", "piece": "cuisine", "prix": 70, "bonheur": 2, "max": 4 },
    "poubelle": { "nom": "Poubelle", "piece": "cuisine", "prix": 20, "bonheur": 1 },
    "bibliotheque": { "nom": "Bibliothèque étroite", "piece": "salon", "prix": 80, "bonheur": 2 },
    "bibliotheque_vitree": { "nom": "Bibliothèque vitrée", "piece": "salon", "prix": 170, "bonheur": 4 },
    "lampadaire": { "nom": "Lampadaire", "piece": "salon", "prix": 45, "bonheur": 2 },
    "coffre_jouets": { "nom": "Coffre à jouets", "piece": "chambre", "prix": 60, "bonheur": 3 },
    "plante_ficus": { "nom": "Ficus", "piece": "salon", "prix": 35, "bonheur": 2 },
    "plante_monstera": { "nom": "Monstera", "piece": "salon", "prix": 40, "bonheur": 2 },
    "plante_sansevieria": { "nom": "Sansevière", "piece": "chambre", "prix": 25, "bonheur": 1 },
    "plante_cactus": { "nom": "Cactus cierge", "piece": "salon", "prix": 20, "bonheur": 1 },
    "plante_fougere": { "nom": "Fougère", "piece": "salon", "prix": 30, "bonheur": 2 },
    "plante_palmier": { "nom": "Palmier kentia", "piece": "salon", "prix": 50, "bonheur": 2 },
    "plante_citronnier": { "nom": "Citronnier", "piece": "cuisine", "prix": 60, "bonheur": 3 },
    "plante_orchidee": { "nom": "Orchidée", "piece": "chambre", "prix": 35, "bonheur": 2 },
    "plante_aloe": { "nom": "Aloe vera", "piece": "cuisine", "prix": 20, "bonheur": 1 },
    "plante_bonsai": { "nom": "Bonsaï", "piece": "salon", "prix": 70, "bonheur": 3 }
  },
  "EQUIPEMENT": {
    "CASES": 3,
    "PLACES": { "tete": "Tête", "corps": "Corps", "mains": "Mains", "pieds": "Pieds" },
    "PIECES": {
      "casque_lampe": { "place": "tete", "enfant": false, "grotte": 140, "vueNuit": 150 },
      "chapeau_paille": {
        "place": "tete",
        "enfant": true,
        "economie": { "labourer": 10, "planter": 10, "arroser": 10, "recolter": 10, "cueillir": 10, "faucher": 10 },
        "soleil": [11, 17]
      },
      "bottes": { "place": "pieds", "enfant": true, "pied": { "marais": 130, "montagne": 120, "sommet": 120 }, "faimMarche": 25 },
      "gants_travail": { "place": "mains", "enfant": false, "economie": { "couper": 20, "piocher": 20 } },
      "tablier": {
        "place": "corps",
        "enfant": true,
        "economie": { "labourer": 15, "planter": 15, "arroser": 15, "recolter": 15, "cueillir": 15 },
        "faimAide": 25
      },
      "salopette": { "place": "corps", "enfant": false, "toutes": 8 },
      "manteau_chaud": { "place": "corps", "enfant": true, "toutes": 15, "horsFerme": true },
      "lanterne_tempete": { "place": "mains", "enfant": false, "vueNuit": 130 }
    },
    "SACS": { "sac_petit": { "portions": 6 }, "sac_grand": { "portions": 12 } },
    "TENTE": "tente",
    "ALERTE": { "PRESQUE_VIDE": 2, "ENERGIE": 30 }
  },
  "SIMULATION": {
    "NUITS": 80,
    "GRAINE": 1,
    "PAS_S": 5,
    "FAIM_JOUR": 10,
    "LISSAGE": 7,
    "STRATEGIES": { "applique": { "nom": "Joueur appliqué", "eveilS": 60 }, "minimal": { "nom": "Joueur minimal", "eveilS": 30 } },
    "CAISSE": 20,
    "CONSERVES_GARDEES": 96,
    "PRIX_GRAINE_MAX": 4,
    "ETALEMENT_JOURS": 1,
    "PART_PLEIN_CHAMP": 40,
    "PARCELLES_TOURNESOL": 2,
    "DIVERSITE_STOCK": 2,
    "BONHEUR_CIBLE": 80,
    "PRIORITE_BONHEUR": 1000,
    "BLE_JOURS_GARDES": 3,
    "BLE_MAX": 40,
    "STOCK_FARINE": 4,
    "STOCK_HUILE": 6,
    "PAILLE_NUITS": 3,
    "PAILLE_MAX_NUITS": 6,
    "FARINE_MAX": 12,
    "LANCERS_MER": 8,
    "LITRES_PARCELLE": 3,
    "LITRES_CUISINE": 6,
    "MARCHE_STATIONS": 50,
    "MARGE_EAU": 90,
    "MARGE_ENERGIE": 150,
    "MARGE_BATTERIE": 70,
    "PRIORITE": {
      "1": [
        { "type": "maison" },
        { "type": "achat", "id": "panneau" },
        { "type": "achat", "id": "pompe" },
        { "type": "achat", "id": "reservoir" },
        { "type": "houe" }
      ],
      "2": [{ "type": "houe" }, { "type": "silo", "niveau": 2 }],
      "3": [{ "type": "poulailler", "niveau": 1 }, { "type": "silo", "niveau": 1 }, { "type": "poules", "n": 4 }],
      "4": [
        { "type": "station", "id": "four" },
        { "type": "station", "id": "moulin" },
        { "type": "station", "id": "presse" },
        { "type": "station", "id": "cuisine" }
      ],
      "5": [{ "type": "station", "id": "moulin" }, { "type": "paturage" }, { "type": "moutons", "n": 3 }],
      "6": [{ "type": "serre", "niveau": 1 }, { "type": "verger" }, { "type": "arbres", "n": 2 }, { "type": "frigo" }],
      "7": []
    },
    "PLAN": [
      { "type": "houe" },
      { "type": "achat", "id": "batterie" },
      { "type": "poulailler", "niveau": 1 },
      { "type": "silo", "niveau": 1 },
      { "type": "poules", "n": 4 },
      { "type": "poulailler", "niveau": 2 },
      { "type": "poules", "n": 8 },
      { "type": "silo", "niveau": 2 },
      { "type": "station", "id": "four" },
      { "type": "station", "id": "moulin" },
      { "type": "station", "id": "presse" },
      { "type": "station", "id": "cuisine" },
      { "type": "tech", "id": "cu_outils" },
      { "type": "pompe", "niveau": 2 },
      { "type": "tech", "id": "ea_econome" },
      { "type": "pompe", "niveau": 3 },
      { "type": "tech", "id": "ea_irrigation" },
      { "type": "poulailler", "niveau": 3 },
      { "type": "tech", "id": "el_mangeoire" },
      { "type": "tech", "id": "cu_recolte_auto" },
      { "type": "tech", "id": "cui_boulangerie" },
      { "type": "tech", "id": "prepa_1" },
      { "type": "paturage" },
      { "type": "moutons", "n": 3 },
      { "type": "poules", "n": 12 },
      { "type": "verger" },
      { "type": "arbres", "n": 2 },
      { "type": "serre", "niveau": 1 },
      { "type": "frigo" },
      { "type": "frigo", "niveau": 2 },
      { "type": "tech", "id": "semis_auto" },
      { "type": "tech", "id": "cui_laiterie" },
      { "type": "tech", "id": "el_tonte" },
      { "type": "arbres", "n": 4 },
      { "type": "moutons", "n": 6 },
      { "type": "poules", "n": 16 },
      { "type": "serre", "niveau": 2 },
      { "type": "serre", "niveau": 3 },
      { "type": "vaches", "n": 4 },
      { "type": "arbres", "n": 8 },
      { "type": "vaches", "n": 8 },
      { "type": "moutons", "n": 10 },
      { "type": "arbres", "n": 12 }
    ],
    "JALONS": [{ "nuit": 8, "pct": 35 }, { "nuit": 15, "pct": 50 }, { "nuit": 25, "pct": 75 }, { "nuit": 40, "pct": 90 }, { "nuit": 60, "pct": 100 }],
    "TOLERANCE_NUITS": 10,
    "DEPANNAGE": { "item": "carotte", "nuit": 30 }
  },
  "TERRAIN": {
    "LARGEUR": 72,
    "HAUTEUR": 57,
    "ZONES": { "1": { "X": 29, "Y": 24, "COLONNES": 5 }, "2": { "X": 39, "Y": 38, "COLONNES": 8 } },
    "LIGNES": [
      "...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o",
      "...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o...o",
      "oooooooo...ooooo...ooooooooooooooooo...ooooooooo...ooooooooo...ooooo...o",
      "oooooooo...ooooo...ooooooooooooooooo...ooooooooo...ooooooooo...ooooo...o",
      "ooo#ooo#...#ooo#...#ooo#ooooooo#ooo#...#ooo#ooo#...oooo#ooo#...#ooo#...#",
      "ooo#ooo#...#ooo#...#ooo#ooooooo#ooo#...#ooo#ooo#...oooo#ooo#...#ooo#...#",
      "##########################oooo####################oooo##################",
      "###################...o###oooo######...###########oooo###########oo#####",
      "#####+++++++...####...o#############...###...o##############...ooooo####",
      "ooo+++...+++...++##...o#...###############...o##############...ooooo####",
      "oo++++...+++++++++#...o#...############oo#...o##############...ooooo#...",
      "o+++++...++++++++++###########...#####oooo...o##############...o#####...",
      "o+++++...++++++++++######oo###...#####oooo######################...##...",
      "+++++++++++++++++++++++++++++#########oooo...##########...o#####...##...",
      "++++++++++++++++++++++++++++++#++++++++#++...++++++++##...o#############",
      "++++++++++...+++++++++++++++++#++++++++#++++++++++++++#...o#############",
      "++++++++++...+++++...+++++++++o++++++++#++++++++++++......o##########...",
      "++++...+++++++...+...+++++++++..++++++++++++++++++++...#########...##...",
      "++++...+++++++...+++++++++++++..+++++++++++++++++++++++#########...##...",
      "+++++++++++++++++..++++++++..+o++++++++++++++++++++++++##############...",
      "+++++++++++++++++....++++....+#+++++++++++#++++++++++++#...o########...#",
      "+++++++++++++++++++.+++++++.++#++....+...##+++...+..+++#...o########...#",
      "+++++++++++++...+++.+++++++.+..............................o############",
      "+++...+++++++...+++.+++++++.+#####.........................o#####...o###",
      "o++...++...++...+++.#####o#.#######.......................#######...o###",
      "oo+...++...++...++#.........#######...+++++++++.....##.....#...##...o###",
      "oo+...++++++++++++#################...++++++++.......#.....#...##...o###",
      "ooo#++++++++++++##o################...++++++++.......#oo................",
      "ooo###++++++++###########oo########...+++++++++.....##oo................",
      "##ooooo#################oooo#######....+++++++++#..######...............",
      "##oooooooo#oooooooo#####oooo#######....+++++...+#################...o###",
      "##ooooooooooooooooo#ooo#oooo########.....+++...+##########...+++#...o###",
      ".#ooooooooooooooooo#ooo#############.....+++++...#########...++++...+...",
      "#######oooooooooooo#ooo#############........++...####++++++++++++...+...",
      "oooooo###ooo####ooo#ooooo#######...#.........+++#####++++++++++++++++...",
      "oooooo###ooo#.##ooo###oooooo####...#........++++###++++++++++++++++++...",
      "oooooo###ooo####ooo###oooo..##.#######++++++++##...+++++++++++++++++++##",
      "ooooo...#ooo####oooooooooooo####################...+++++++++++++++++++##",
      "ooo##...#ooo#######oooo##ooo####...################+++++++++++++++++++##",
      "ooo############ooo#oooo#########...################+++++++++++++++++++##",
      "ooo############ooo#oooo#####ooo####################++++++++++++++++++...",
      "ooo####.........oo##########o.o####################+++++...++++++++++...",
      "ooo#.............o######ooo#ooo##ooo################++++...++++++++##...",
      "...#.............###...#ooo#ooo##ooo################+++++++++++++++##...",
      "...###............##...#ooo######ooo################+++++++++++++++#####",
      "ooo##..............##oo#ooo###oooooo###################+++.+++++###...o#",
      "..o#...............###########ooo#########################++++++###...o#",
      "..##...............#ooo#######oooooo######################++++++###...o#",
      "ooo#..............##ooo###ooo#oooooo###ooo#######oo###...###...o###...o#",
      "ooo##............#o#ooo###ooo###oooo###ooo######oooo##...###...o#####...",
      "ooo#####..........##ooo###ooo###oooo###ooo######oooo########...o##......",
      "ooo#..............########ooo###ooo####ooo...###oooo########...o##......",
      "ooo#..............##############ooo#######...########################...",
      "ooo#oo............o#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#ooo#",
      "o....o............o#o....oo#o....oo#o....oo#o...........................",
      "o.......................................................................",
      "o......................................................................."
    ],
    "ROCHERS": {
      "25,13": [889, 890, 961, 962],
      "44,16": [1196],
      "40,17": [1264],
      "66,18": [1362],
      "43,20": [1411, 1412, 1483, 1484],
      "25,24": [1753],
      "18,27": [1962],
      "37,28": [2053],
      "34,35": [2554],
      "7,38": [2743],
      "62,41": [2942, 2943, 3014, 3015],
      "1,45": [3170, 3241, 3242],
      "21,45": [3190, 3261, 3262],
      "16,46": [3328],
      "18,49": [3546]
    },
    "ARBRES": {
      "1,12": [648, 649, 650, 720, 721, 792, 864],
      "1,25": [1728, 1800, 1801],
      "1,28": [1800, 1801, 1872, 1873, 1944, 1945, 1946, 2016, 2017, 2018],
      "1,3": [144, 145, 216, 217],
      "1,37": [2448, 2449, 2450, 2520, 2521, 2522, 2592, 2593, 2594, 2664, 2665, 2666],
      "1,40": [2664, 2665, 2666, 2736, 2737, 2738, 2808, 2809, 2810, 2880, 2881, 2882],
      "1,43": [2880, 2881, 2882, 2952, 2953, 2954, 3024, 3025, 3026],
      "1,46": [3240, 3241, 3242, 3314],
      "1,5": [144, 145, 146, 216, 217, 218, 288, 289, 290, 360, 361, 362],
      "1,51": [3456, 3457, 3458, 3528, 3529, 3530, 3600, 3601, 3602, 3672, 3673, 3674],
      "1,54": [3672, 3673, 3674, 3744, 3745, 3746, 3816, 3817, 3818, 3888],
      "1,56": [3816, 3817, 3818, 3888, 3960, 4032],
      "10,34": [2241, 2242, 2243, 2313, 2314, 2315, 2385, 2386, 2387, 2457, 2458, 2459],
      "10,38": [2529, 2530, 2531, 2601, 2602, 2603, 2673, 2674, 2675, 2745, 2746, 2747],
      "11,3": [11, 83, 155, 156, 227, 228],
      "12,33": [2171, 2172, 2173, 2243, 2244, 2245, 2315, 2316, 2317, 2387, 2388, 2389],
      "13,5": [156, 157, 158, 228, 229, 230, 300, 301, 302, 372, 373, 374],
      "14,33": [2173, 2174, 2175, 2245, 2246, 2247, 2317, 2318, 2319, 2389, 2390, 2391],
      "15,3": [15, 87, 158, 159, 230, 231],
      "16,42": [2823, 2824, 2825, 2895, 2896, 2897, 2968, 2969, 3041],
      "17,33": [2176, 2177, 2178, 2248, 2249, 2250, 2320, 2321, 2322, 2392, 2393, 2394],
      "17,37": [2464, 2465, 2466, 2536, 2537, 2538, 2608, 2609, 2610, 2680, 2681, 2682],
      "17,56": [3834, 3906],
      "19,3": [19, 91, 163, 164, 235, 236],
      "20,40": [2683, 2684, 2685, 2755, 2756, 2757, 2827, 2828, 2829, 2899, 2900, 2901],
      "21,10": [526, 598, 670, 742],
      "21,34": [2252, 2253, 2254, 2324, 2325, 2326, 2396, 2397, 2398, 2468, 2469, 2470],
      "21,40": [2684, 2685, 2686, 2756, 2757, 2758, 2828, 2829, 2830, 2900, 2901, 2902],
      "21,5": [164, 165, 166, 236, 237, 238, 308, 309, 310, 380, 381, 382],
      "21,50": [3404, 3405, 3406, 3476, 3477, 3478, 3548, 3549, 3550, 3620, 3621, 3622],
      "21,56": [3836, 3837, 3838, 3908],
      "23,3": [23, 95, 166, 167, 168, 238, 239, 240],
      "23,37": [2470, 2471, 2472, 2542, 2543, 2544, 2614, 2615, 2616, 2686, 2687, 2688],
      "25,45": [3048, 3049, 3050, 3120, 3121, 3122, 3192, 3193, 3194, 3264, 3265, 3266],
      "25,5": [168, 169, 170, 240, 241, 242, 312, 313, 314, 384, 385, 386],
      "25,56": [3840, 3841, 3842, 3913, 3914],
      "26,31": [2041, 2042, 2112, 2113, 2114, 2115, 2184, 2185, 2186, 2187, 2256, 2257, 2258, 2259],
      "26,38": [2545, 2546, 2547, 2617, 2689, 2690, 2691, 2761, 2762, 2763],
      "27,3": [27, 99, 170, 171, 172, 242, 243, 244],
      "27,51": [3482, 3483, 3484, 3554, 3555, 3556, 3626, 3627, 3628, 3698, 3699, 3700],
      "28,7": [315, 316, 386, 387, 388, 389, 458, 459, 460, 461, 530, 531, 532, 533],
      "29,19": [1182, 1398],
      "29,43": [2908, 2909, 2910, 2980, 2982, 3052, 3053, 3054, 3124, 3125, 3126],
      "29,5": [172, 173, 174, 244, 245, 246, 316, 317, 318, 388, 389, 390],
      "29,56": [3844, 3845, 3846, 3916],
      "3,3": [3, 75, 146, 147, 148, 218, 219, 220],
      "3,32": [2090, 2091, 2092, 2162, 2163, 2164, 2234, 2235, 2236, 2306, 2307, 2308],
      "31,3": [31, 103, 174, 175, 176, 246, 247, 248],
      "31,48": [3270, 3271, 3272, 3342, 3343, 3344, 3414, 3415, 3416, 3486, 3487, 3488],
      "33,5": [176, 177, 178, 248, 249, 250, 320, 321, 322, 392, 393, 394],
      "33,52": [3560, 3561, 3562, 3632, 3633, 3634, 3704, 3705, 3706, 3776, 3777, 3778],
      "33,56": [3848, 3849, 3850, 3921, 3922],
      "34,45": [3057, 3058, 3059, 3129, 3130, 3131, 3201, 3202, 3203, 3273, 3274, 3275],
      "34,50": [3417, 3418, 3419, 3489, 3490, 3491, 3561, 3562, 3563, 3633, 3634, 3635],
      "35,3": [35, 107, 178, 179, 250, 251],
      "37,56": [3852, 3853, 3854, 3924],
      "39,3": [39, 111, 183, 184, 255, 256],
      "4,37": [2451, 2452, 2453, 2523, 2524, 2525, 2595, 2596, 2597, 2667, 2668],
      "40,13": [759, 760, 830, 831, 832, 833, 902, 903, 904, 905, 974, 975, 976, 977],
      "40,51": [3495, 3496, 3497, 3567, 3568, 3569, 3639, 3640, 3641, 3711, 3712, 3713],
      "41,5": [184, 185, 186, 256, 257, 258, 328, 329, 330, 400, 401, 402],
      "41,56": [3856, 3857, 3858, 3929, 3930],
      "43,3": [43, 115, 186, 187, 188, 258, 259, 260],
      "44,11": [621, 693, 765, 837],
      "45,5": [188, 189, 190, 260, 261, 262, 332, 333, 334, 404, 405, 406],
      "45,56": [3860, 3861, 3862, 3932],
      "47,3": [47, 119, 190, 191, 262, 263],
      "49,56": [3864, 3865, 3866],
      "5,32": [2092, 2093, 2094, 2164, 2165, 2166, 2236, 2237, 2238, 2308, 2309, 2310],
      "5,5": [148, 149, 150, 220, 221, 222, 292, 293, 294, 364, 365, 366],
      "5,56": [3820, 3821, 3893],
      "50,51": [3505, 3506, 3576, 3577, 3578, 3579, 3648, 3649, 3650, 3651, 3720, 3721, 3722, 3723],
      "51,3": [51, 123, 195, 196, 267, 268],
      "52,7": [339, 340, 411, 412, 413, 482, 483, 484, 485, 554, 555, 556, 557],
      "53,5": [196, 197, 198, 268, 269, 270, 340, 341, 342, 412, 413, 414],
      "53,56": [3868, 3869, 3870],
      "55,3": [55, 127, 198, 199, 200, 270, 271, 272],
      "56,28": [1998, 1999, 2070, 2071],
      "57,16": [994, 1066, 1138, 1210],
      "57,5": [200, 201, 202, 272, 273, 274, 344, 345, 346, 416, 417, 418],
      "57,56": [3872, 3873, 3874],
      "58,23": [1499, 1571, 1643, 1715],
      "59,3": [59, 131, 202, 203, 274, 275],
      "61,56": [3876, 3877, 3878],
      "62,11": [639, 711, 783, 855],
      "62,51": [3519, 3591, 3663, 3735],
      "63,3": [63, 135, 207, 208, 279, 280],
      "65,5": [208, 209, 210, 280, 281, 282, 352, 353, 354, 424, 425, 426],
      "65,56": [3880, 3881, 3882],
      "66,10": [569, 570, 640, 641, 642, 643, 712, 713, 714, 715, 784, 785, 786, 787],
      "67,26": [1724, 1796, 1868, 1940],
      "67,3": [67, 139, 210, 211, 282, 283],
      "67,33": [2228, 2300],
      "69,48": [3310, 3382, 3454, 3526],
      "69,56": [3884, 3885, 3886],
      "7,3": [7, 79, 150, 151, 222, 223],
      "71,3": [71, 143, 215, 287],
      "8,33": [2167, 2168, 2169, 2239, 2240, 2241, 2311, 2312, 2313, 2383, 2384, 2385]
    }
  },
  "BIOMES": ["mer", "plage", "falaise", "prairie", "foret", "marais", "lande", "montagne", "sommet", "lac", "riviere"],
  "PLAN_MONDE": {
    "LENT": 4,
    "GRILLE": 6,
    "SAUT": 3,
    "DECALAGE": 0.3,
    "ONDULE": { "PAS": 12, "AMPLITUDE": 0.35 },
    "RELIEF": {
      "HAUT": 0.56,
      "BAS": 0.3,
      "MONTAGNE": 0.5,
      "FORME": 2,
      "MER": 0.42,
      "BRUIT": 0.16,
      "PAS": 48,
      "CRETES": 0.3,
      "PAS_CRETES": 26,
      "DECOUPE": 0.24,
      "PAS_DECOUPE": 22
    },
    "BORDS": { "MONTAGNE": 160, "MER": 100, "ONDULATION": 44, "PAS_ONDULATION": 80, "FERMETURE": 10, "COIN": 7 },
    "SEUILS": {
      "MER": 0.2,
      "COTE": 0.03,
      "FALAISE": 0.62,
      "PAS_FALAISE": 36,
      "MONTAGNE": 0.62,
      "SOMMET": 0.92,
      "MARAIS": 0.64,
      "MARAIS_RELIEF": 0.42,
      "FORET": 0.53,
      "LANDE": 0.36,
      "LANDE_HAUTE": 0.57
    },
    "HUMIDITE": { "PAS": 60, "CONTRASTE": 2.4, "MER": 0.14 },
    "FERME": { "MARGE": 12, "TRANSITION": 40, "RELIEF": 0.47, "HUMIDITE": 0.45 },
    "RIVIERES": {
      "NOMBRE": [5, 8],
      "ECART": 60,
      "VALLEE": 3,
      "MONTEE": 150,
      "MEANDRE": 2,
      "PAS_MEANDRE": 30,
      "LONGUEUR_MIN": 40,
      "LAC_SEUIL": 0.004,
      "LAC_PROFONDEUR": 0.006,
      "LAC_ROND": 0.001,
      "LAC_PLEIN": 0.3,
      "LAC_MIN": 14,
      "LAC_MAX": 180,
      "LACS_PAR_RIVIERE": 2,
      "LARGEUR": [0.3, 0.7],
      "LONGUE": 120
    },
    "LACS": { "NOMBRE": [2, 4], "TAILLE": [40, 180], "ECART": 50 },
    "HAMEAUX": {
      "NOMBRE": [6, 10],
      "GUE": "Le Gué",
      "ECART": 75,
      "FERME": 45,
      "PLACE": 3,
      "LISIERE": 4,
      "OUVERT": 0.3,
      "LOIN": 150,
      "LOIN_BONUS": 0.6,
      "NOMS": [
        "Les Saules",
        "Brumeval",
        "Roche-Claire",
        "Le Moulinet",
        "Fontfroide",
        "Les Genêts",
        "Hautepierre",
        "Le Gué",
        "Bois-Joli",
        "Les Mouettes",
        "Combelongue",
        "Pré-Fleuri",
        "La Bruyère",
        "L'Étang-Vieux",
        "Les Ajoncs",
        "Sablons",
        "Val-Doré",
        "Le Hameau des Pins",
        "Chantelune",
        "Les Roseaux"
      ],
      "GARANTIS": [
        { "id": "mouettes", "nom": "Les Mouettes", "pays": "cote", "metier": "pecheur" },
        { "id": "brumeval", "nom": "Brumeval", "pays": "montagne", "metier": "mineur" },
        { "id": "bois_joli", "nom": "Bois-Joli", "pays": "foret", "metier": "bucheron" },
        { "id": "genets", "nom": "Les Genêts", "pays": "lande", "metier": "berger" }
      ]
    },
    "CHEMINS": {
      "COUTS": { "prairie": 2, "lande": 3, "plage": 4, "foret": 5, "marais": 14, "montagne": 22, "riviere": 24, "chemin": 2.5 },
      "MEANDRE": 1.5,
      "PAS_MEANDRE": 40,
      "POIDS": 2,
      "PRES_FERME": 14,
      "PRES_FERME_COUT": 3,
      "REPRISE_MAX": 20000,
      "ESSAIS": 4,
      "LISSE": 10,
      "RAPPROCHE": 5,
      "LONGE": 8,
      "LONGE_COUT": 1
    },
    "GROTTES": { "NOMBRE": [3, 6], "ECART": 60, "PIED": 4, "FERME": 40 },
    "PECHE": { "MER": 4, "ECART": 60 },
    "RECIT": {
      "CABANE": { "CHEMIN": 14, "HAMEAU": 45, "FERME": 60 },
      "ATELIER": { "HAMEAU": 40 },
      "EPAVE": { "HAMEAU": 30 },
      "CALE": { "RAYON": 40, "HAMEAU": 8, "PECHE": 8 }
    }
  },
  "VEGETATION": {
    "SORTES": [
      { "nom": "feuillu", "genre": "arbre", "variantes": 6, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "bouleau", "genre": "arbre", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "sapin", "genre": "arbre", "variantes": 4, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "saule", "genre": "arbre", "variantes": 2, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "pin_tordu", "genre": "arbre", "variantes": 2, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "sapin_nain", "genre": "arbre", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "arbre_pre", "genre": "arbre", "variantes": 3, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "buisson_pre", "genre": "buisson", "variantes": 2, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "ronces", "genre": "buisson", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "souche", "genre": "buisson", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "tronc_couche", "genre": "buisson", "variantes": 2, "bloque": [[0, 0], [1, 0]], "ecart": 1 },
      { "nom": "ajonc", "genre": "buisson", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "genet", "genre": "buisson", "variantes": 2, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "rhododendron", "genre": "buisson", "variantes": 2, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "roseaux", "genre": "haute", "variantes": 3, "penche": true, "ecart": 0 },
      { "nom": "massette", "genre": "haute", "variantes": 2, "penche": true, "ecart": 0 },
      { "nom": "fougere", "genre": "basse", "variantes": 4 },
      { "nom": "champignons", "genre": "basse", "variantes": 4 },
      { "nom": "touffe_foret", "genre": "basse", "variantes": 3 },
      { "nom": "bruyere", "genre": "basse", "variantes": 6 },
      { "nom": "herbe_seche", "genre": "basse", "variantes": 3 },
      { "nom": "jonc", "genre": "basse", "variantes": 3 },
      { "nom": "nenuphar", "genre": "basse", "variantes": 4 },
      { "nom": "oyat", "genre": "basse", "variantes": 4, "eau": [2, 99] },
      { "nom": "chardon", "genre": "basse", "variantes": 2, "eau": [2, 99] },
      { "nom": "bois_flotte", "genre": "basse", "variantes": 2, "eau": [0, 3] },
      { "nom": "touffe_mont", "genre": "basse", "variantes": 3 },
      { "nom": "fleurs", "genre": "basse", "variantes": 16, "teinte": true },
      { "nom": "touffe_pre", "genre": "basse", "variantes": 16, "teinte": true }
    ],
    "DENSITES": {
      "foret": {
        "feuilles": {
          "feuillu": 0.34,
          "bouleau": 0.03,
          "sapin": 0.03,
          "ronces": 0.012,
          "souche": 0.006,
          "tronc_couche": 0.004,
          "fougere": 0.07,
          "champignons": 0.015,
          "touffe_foret": 0.04
        },
        "aiguilles": {
          "sapin": 0.36,
          "feuillu": 0.03,
          "souche": 0.008,
          "tronc_couche": 0.003,
          "fougere": 0.03,
          "champignons": 0.03,
          "touffe_foret": 0.02
        },
        "mousse": {
          "feuillu": 0.22,
          "bouleau": 0.08,
          "sapin": 0.04,
          "souche": 0.008,
          "tronc_couche": 0.006,
          "ronces": 0.008,
          "fougere": 0.16,
          "champignons": 0.04
        },
        "clairiere": { "touffe_foret": 0.1, "fougere": 0.05, "ronces": 0.01, "bouleau": 0.01 }
      },
      "lande": {
        "lande": { "ajonc": 0.022, "genet": 0.012, "pin_tordu": 0.006, "bruyere": 0.18, "herbe_seche": 0.05 },
        "terre": { "herbe_seche": 0.05, "bruyere": 0.03, "ajonc": 0.004 }
      },
      "marais": {
        "vase": { "saule": 0.012, "roseaux": 0.15, "massette": 0.03, "jonc": 0.14 },
        "eau_basse": { "nenuphar": 0.12, "roseaux": 0.06, "massette": 0.05 }
      },
      "plage": { "sable": { "oyat": 0.12, "chardon": 0.025, "bois_flotte": 0.02 }, "galets": { "bois_flotte": 0.015, "oyat": 0.01 } },
      "montagne": { "eboulis": { "sapin_nain": 0.05, "rhododendron": 0.02, "touffe_mont": 0.1 } },
      "prairie": { "herbe": { "arbre_pre": 0.004, "buisson_pre": 0.004, "fleurs": 0.03, "touffe_pre": 0.05 } }
    },
    "LISIERE": { "MIN": 0.3, "RAYON": 4 },
    "CLAIRIERES": { "PAS": 18, "SEUIL": 0.7, "FONDU": 0.06 },
    "TOUFFES": { "PAS": 5, "MIN": 0.2, "MAX": 1.8 },
    "FERME": 5,
    "LIEUX": { "hameaux": 6, "grottes": 3, "peche": 2, "recit": 4 },
    "BORNES": {
      "foret": { "images": [0.05, 0.16], "basses": [0.03, 0.2] },
      "lande": { "images": [0.01, 0.05], "basses": [0.05, 0.3] },
      "marais": { "images": [0.03, 0.14], "basses": [0.03, 0.2] },
      "plage": { "images": [0, 0], "basses": [0.02, 0.2] },
      "montagne": { "images": [0.01, 0.08], "basses": [0.02, 0.2] },
      "prairie": { "images": [0.001, 0.02], "basses": [0.03, 0.15] }
    }
  },
  "ROCHES": {
    "SORTES": [
      { "nom": "rocher", "genre": "bloc", "variantes": 4, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "bloc", "genre": "bloc", "variantes": 4, "bloque": [[0, 0], [1, 0]], "ecart": 2 },
      { "nom": "rocher_moussu", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 2 },
      { "nom": "eboulis", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 2 },
      { "nom": "piton", "genre": "bloc", "variantes": 3, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "piton_neige", "genre": "bloc", "variantes": 2, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "rocher_neige", "genre": "bloc", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "sapin_neige", "genre": "bloc", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "rocher_mer", "genre": "mer", "variantes": 4, "ecart": 2 },
      { "nom": "epave", "genre": "epave", "variantes": 2, "bloque": [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]] },
      { "nom": "paroi", "genre": "paroi", "variantes": 81 },
      { "nom": "paroi_herbe", "genre": "paroi", "variantes": 81 },
      { "nom": "paroi_neige", "genre": "paroi", "variantes": 81 },
      { "nom": "galets", "genre": "basse", "variantes": 6 },
      { "nom": "pierres", "genre": "basse", "variantes": 6 },
      { "nom": "pierres_moussues", "genre": "basse", "variantes": 3 },
      { "nom": "coquillages", "genre": "basse", "variantes": 6, "eau": [0, 2] },
      { "nom": "etoile_mer", "genre": "basse", "variantes": 3, "eau": [0, 1] },
      { "nom": "algues", "genre": "basse", "variantes": 4, "eau": [0, 1] },
      { "nom": "congere", "genre": "basse", "variantes": 4 }
    ],
    "DENSITES": {
      "prairie": { "herbe": { "rocher": 0.002, "pierres": 0.006 } },
      "foret": {
        "feuilles": { "rocher_moussu": 0.03, "pierres_moussues": 0.03 },
        "aiguilles": { "rocher_moussu": 0.02, "rocher": 0.01, "pierres_moussues": 0.025 },
        "mousse": { "rocher_moussu": 0.045, "pierres_moussues": 0.05 }
      },
      "lande": { "lande": { "rocher": 0.006, "bloc": 0.002, "pierres": 0.02 }, "terre": { "rocher": 0.01, "bloc": 0.004, "pierres": 0.06 } },
      "marais": { "vase": { "pierres_moussues": 0.006 } },
      "plage": {
        "sable": { "rocher": 0.002, "galets": 0.01, "coquillages": 0.05, "etoile_mer": 0.012, "algues": 0.04 },
        "galets": { "rocher": 0.012, "galets": 0.16, "coquillages": 0.02, "algues": 0.03 }
      },
      "montagne": {
        "eboulis": { "rocher": 0.012, "bloc": 0.01, "galets": 0.05, "pierres": 0.1 },
        "roche": { "bloc": 0.014, "piton": 0.01, "rocher": 0.008, "pierres": 0.08 },
        "haut": { "rocher_neige": 0.03, "sapin_neige": 0.03, "piton_neige": 0.006, "congere": 0.025, "pierres": 0.03 }
      },
      "sommet": { "neige": { "rocher_neige": 0.012, "piton_neige": 0.006, "congere": 0.012 } }
    },
    "HAUT": 0.87,
    "SOMMET": 4,
    "EBOULIS": { "PART": 0.05, "PENTE": [0.03, 0.08], "PIED": 0.14 },
    "MER": { "PART": 0.03, "DISTANCE": [1, 4], "FALAISE": 3, "TACHES": [0.1, 2.2] },
    "EPAVE": { "CHEMIN": 8 },
    "PAROIS": { "EAU": 10, "TERRE": 14 },
    "BORNES": {
      "prairie": { "images": [0.0005, 0.006], "basses": [0.002, 0.02] },
      "foret": { "images": [0.001, 0.02], "basses": [0.002, 0.04] },
      "lande": { "images": [0.003, 0.03], "basses": [0.01, 0.08] },
      "plage": { "images": [0.001, 0.03], "basses": [0.03, 0.3] },
      "montagne": { "images": [0.01, 0.08], "basses": [0.04, 0.25] },
      "sommet": { "images": [0.005, 0.04], "basses": [0.004, 0.04] },
      "mer": { "images": [0.001, 0.01], "basses": [0, 0] }
    }
  },
  "RECOLTE": {
    "PORTEE": 40,
    "SORTES": {
      "feuillu": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 3] }, "chance": { "gland": 25 }, "retour": [5, 8] },
      "bouleau": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 3] }, "retour": [5, 8] },
      "sapin": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 3] }, "chance": { "pomme_de_pin": 30 }, "retour": [5, 8] },
      "saule": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 3] }, "retour": [5, 8] },
      "pin_tordu": {
        "geste": "couper",
        "coups": 2,
        "coup": { "bois": 1 },
        "fin": { "bois": [1, 2] },
        "chance": { "pomme_de_pin": 30 },
        "retour": [6, 10]
      },
      "sapin_nain": {
        "geste": "couper",
        "coups": 2,
        "coup": { "bois": 1 },
        "fin": { "bois": [1, 2] },
        "chance": { "pomme_de_pin": 20 },
        "retour": [6, 10]
      },
      "sapin_neige": {
        "geste": "couper",
        "coups": 3,
        "coup": { "bois": 1 },
        "fin": { "bois": [2, 3] },
        "chance": { "pomme_de_pin": 20 },
        "retour": [6, 10]
      },
      "arbre_pre": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 3] }, "chance": { "gland": 25 }, "retour": [5, 8] },
      "buisson_pre": { "geste": "couper", "coups": 1, "fin": { "bois": [1, 2] }, "retour": [3, 5] },
      "ajonc": { "geste": "couper", "coups": 1, "fin": { "bois": [1, 1] }, "retour": [3, 5] },
      "genet": { "geste": "couper", "coups": 1, "fin": { "bois": [1, 1] }, "retour": [3, 5] },
      "souche": { "geste": "couper", "coups": 2, "coup": { "bois": 1 }, "fin": { "bois": [1, 2] }, "retour": [12, 20] },
      "tronc_couche": { "geste": "couper", "coups": 3, "coup": { "bois": 1 }, "fin": { "bois": [2, 4] }, "retour": [12, 20] },
      "ronces": { "geste": "cueillir", "variantes": [0, 1], "apres": 2, "fin": { "mures": [2, 4] }, "retour": [3, 5] },
      "champignons": { "geste": "ramasser", "fin": { "champignon": [1, 2] }, "retour": [3, 6] },
      "touffe_mont": { "geste": "ramasser", "fin": { "herbes_montagne": [1, 1] }, "retour": [4, 6] },
      "bois_flotte": { "geste": "ramasser", "fin": { "bois": [1, 2] }, "retour": [5, 8] },
      "fougere": { "geste": "faucher", "fin": { "fibre": [1, 1] }, "retour": [3, 5] },
      "bruyere": { "geste": "faucher", "fin": { "fibre": [1, 1] }, "retour": [3, 5] },
      "jonc": { "geste": "faucher", "fin": { "fibre": [1, 1] }, "retour": [3, 5] },
      "oyat": { "geste": "faucher", "fin": { "fibre": [1, 1] }, "retour": [3, 5] },
      "roseaux": { "geste": "faucher", "fin": { "fibre": [1, 2] }, "retour": [3, 5] },
      "massette": { "geste": "faucher", "fin": { "fibre": [1, 2] }, "retour": [3, 5] },
      "rocher": { "geste": "casser", "coups": 3, "coup": { "pierre": 1 }, "fin": { "pierre": [2, 2] }, "retour": [5, 8] },
      "rocher_moussu": { "geste": "casser", "coups": 4, "coup": { "pierre": 1 }, "fin": { "pierre": [2, 3] }, "retour": [6, 10] },
      "bloc": { "geste": "casser", "coups": 5, "coup": { "pierre": 1 }, "fin": { "pierre": [3, 4] }, "retour": [8, 12] },
      "eboulis": { "geste": "casser", "coups": 2, "coup": { "pierre": 1 }, "fin": { "pierre": [2, 3] }, "retour": [5, 8] },
      "rocher_neige": { "geste": "casser", "coups": 3, "coup": { "pierre": 1 }, "fin": { "pierre": [2, 2] }, "retour": [6, 10] },
      "galets": { "geste": "ramasser", "fin": { "pierre": [1, 1] }, "retour": [4, 6] },
      "pierres": { "geste": "ramasser", "fin": { "pierre": [1, 1] }, "retour": [4, 6] },
      "pierres_moussues": { "geste": "ramasser", "fin": { "pierre": [1, 1] }, "retour": [4, 6] },
      "coquillages": { "geste": "ramasser", "fin": { "coquille": [1, 1] }, "chance": { "bulot": 30 }, "retour": [2, 4] },
      "etoile_mer": { "geste": "ramasser", "fin": { "etoile_mer": [1, 1] }, "retour": [3, 5] },
      "algues": { "geste": "ramasser", "fin": { "algues": [1, 2] }, "retour": [2, 4] }
    }
  },
  "LIEUX": {
    "SORTES": [
      { "nom": "entree_grotte", "genre": "entree", "variantes": 2 },
      { "nom": "ponton", "genre": "ponton", "variantes": 4 },
      { "nom": "piquets", "genre": "coin", "variantes": 2 },
      {
        "nom": "epave",
        "genre": "recit",
        "variantes": 1,
        "bloque": [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1]],
        "boite": [34, 36]
      },
      { "nom": "cale", "genre": "ponton", "variantes": 4, "recit": true, "boite": [14, 28] }
    ],
    "NEIGE": 0.86,
    "BLOQUE": [[-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-1, -2], [0, -2], [1, -2]],
    "PONTON": 3,
    "CALE": 5
  },
  "FAUNE": {
    "FERME": 8,
    "PAR_REGION": 22,
    "RAYON": 3,
    "PRES": 160,
    "LOIN": 320,
    "ESPECES": {
      "marmotte": {
        "nom": "Une marmotte",
        "lieu": "terre",
        "biomes": ["montagne"],
        "densite": 1.1,
        "groupe": [2, 3],
        "vitesse": 22,
        "fuite": 72,
        "fuit": "terrier",
        "nuit": "cache",
        "images": { "repos": ["assise_0", "assise_1"], "marche": ["marche_0", "marche_1"], "fuite": ["marche_0", "marche_1"] }
      },
      "bouquetin": {
        "nom": "Un bouquetin",
        "lieu": "terre",
        "biomes": ["montagne"],
        "relief": 0.7,
        "densite": 0.5,
        "groupe": [1, 3],
        "vitesse": 16,
        "fuite": 64,
        "fuit": "court",
        "nuit": "dort",
        "images": {
          "repos": ["debout_0", "debout_1"],
          "marche": ["marche_0", "marche_1", "marche_2", "marche_3"],
          "fuite": ["marche_0", "marche_1", "marche_2", "marche_3"]
        }
      },
      "aigle": {
        "nom": "Un aigle royal",
        "lieu": "air",
        "biomes": ["montagne", "sommet"],
        "relief": 0.75,
        "densite": 0.25,
        "groupe": [1, 1],
        "vitesse": 26,
        "fuite": 0,
        "fuit": "envol",
        "nuit": "cache",
        "images": { "repos": ["vol_0"], "vol": ["vol_0", "vol_1"] }
      },
      "mouette": {
        "nom": "Une mouette",
        "lieu": "terre",
        "biomes": ["plage"],
        "eau": [1, 4],
        "densite": 9,
        "groupe": [2, 4],
        "vitesse": 14,
        "fuite": 60,
        "fuit": "envol",
        "nuit": "dort",
        "images": { "repos": ["debout_0", "debout_1"], "marche": ["debout_0", "debout_1"], "vol": ["vol_0", "vol_1"] }
      },
      "crabe": {
        "nom": "Un crabe",
        "lieu": "terre",
        "biomes": ["plage"],
        "eau": [1, 3],
        "densite": 10,
        "groupe": [1, 2],
        "vitesse": 12,
        "fuite": 40,
        "fuit": "terrier",
        "nuit": "cache",
        "images": { "repos": ["marche_0"], "marche": ["marche_0", "marche_1"], "fuite": ["marche_0", "marche_1"] }
      },
      "dauphin": {
        "nom": "Un dauphin",
        "lieu": "eau",
        "biomes": ["mer"],
        "rive": [6, 0],
        "densite": 0.35,
        "groupe": [1, 3],
        "vitesse": 20,
        "fuite": 0,
        "fuit": "nage",
        "nuit": "cache",
        "images": { "saut": ["saut_0", "saut_1", "saut_2", "saut_3", "gerbe"] }
      },
      "canard": {
        "nom": "Un canard colvert",
        "lieu": "eau",
        "biomes": ["lac", "marais"],
        "sols": ["eau", "eau_basse"],
        "rive": [1, 5],
        "densite": 1.6,
        "groupe": [2, 4],
        "vitesse": 10,
        "fuite": 56,
        "fuit": "nage",
        "nuit": "dort",
        "images": {
          "repos": ["m_nage_0", "m_nage_1"],
          "marche": ["m_nage_0", "m_nage_1"],
          "plonge": ["m_plonge_0", "m_plonge_1"],
          "terre_repos": ["m_debout_0", "m_debout_1"],
          "terre_marche": ["m_marche_0", "m_marche_1"]
        },
        "variantes": [
          {},
          {
            "repos": ["f_nage_0", "f_nage_1"],
            "marche": ["f_nage_0", "f_nage_1"],
            "plonge": ["f_plonge_0", "f_plonge_1"],
            "terre_repos": ["f_debout_0", "f_debout_1"],
            "terre_marche": ["f_marche_0", "f_marche_1"]
          }
        ]
      },
      "cygne": {
        "nom": "Un cygne",
        "lieu": "eau",
        "biomes": ["lac"],
        "rive": [1, 6],
        "densite": 5,
        "groupe": [1, 2],
        "vitesse": 8,
        "fuite": 48,
        "fuit": "nage",
        "nuit": "dort",
        "images": { "repos": ["nage_0", "nage_1"], "marche": ["nage_0", "nage_1"], "plonge": ["plonge_0", "plonge_1"] }
      },
      "chevreuil": {
        "nom": "Un chevreuil",
        "lieu": "terre",
        "biomes": ["foret"],
        "densite": 0.55,
        "groupe": [1, 3],
        "vitesse": 18,
        "fuite": 88,
        "fuit": "court",
        "nuit": "dort",
        "images": {
          "repos": ["debout_0", "debout_1"],
          "marche": ["marche_0", "marche_1", "marche_2", "marche_3"],
          "fuite": ["marche_0", "marche_1", "marche_2", "marche_3"]
        }
      },
      "renard": {
        "nom": "Un renard roux",
        "lieu": "terre",
        "biomes": ["foret", "lande"],
        "densite": 0.22,
        "groupe": [1, 1],
        "vitesse": 20,
        "fuite": 72,
        "fuit": "court",
        "nuit": "dort",
        "images": {
          "repos": ["assis_0", "debout_0"],
          "marche": ["marche_0", "marche_1", "marche_2", "marche_3"],
          "fuite": ["marche_0", "marche_1", "marche_2", "marche_3"]
        }
      },
      "lapin": {
        "nom": "Un lapin de garenne",
        "lieu": "terre",
        "biomes": ["foret", "prairie"],
        "densite": 0.6,
        "groupe": [1, 3],
        "vitesse": 16,
        "fuite": 64,
        "fuit": "terrier",
        "nuit": "cache",
        "images": { "repos": ["assis_0", "assis_1"], "marche": ["saut_0", "saut_1"], "fuite": ["saut_0", "saut_1"] }
      },
      "ecureuil": {
        "nom": "Un écureuil roux",
        "lieu": "terre",
        "biomes": ["foret"],
        "densite": 0.9,
        "groupe": [1, 1],
        "vitesse": 22,
        "fuite": 56,
        "fuit": "terrier",
        "nuit": "cache",
        "images": { "repos": ["assis_0", "assis_1"], "marche": ["course_0", "course_1"], "fuite": ["course_0", "course_1"] }
      },
      "lievre": {
        "nom": "Un lièvre",
        "lieu": "terre",
        "biomes": ["lande"],
        "densite": 0.7,
        "groupe": [1, 2],
        "vitesse": 18,
        "fuite": 80,
        "fuit": "court",
        "nuit": "dort",
        "images": { "repos": ["assis_0", "assis_1"], "marche": ["course_0", "course_1"], "fuite": ["course_0", "course_1"] }
      },
      "perdrix": {
        "nom": "Une perdrix grise",
        "lieu": "terre",
        "biomes": ["lande"],
        "densite": 0.6,
        "groupe": [2, 4],
        "vitesse": 10,
        "fuite": 56,
        "fuit": "envol",
        "nuit": "dort",
        "images": { "repos": ["debout_0", "debout_1"], "marche": ["marche_0", "marche_1"], "vol": ["vol_0", "vol_1"] }
      }
    }
  },
  "HAMEAUX": {
    "RAYON": 18,
    "PLACE": 3,
    "MAISONS": [3, 7],
    "LARGEUR": [6, 11],
    "HAUTEUR": [5, 7],
    "ESSAIS": 70,
    "RUELLE": 9,
    "CHAMBRE": 8,
    "DEUX_CHAMBRES": 11,
    "JARDINS": [1, 3],
    "JARDIN": [[4, 6], [4, 5]],
    "VERGER": 3,
    "TAS": 2,
    "RESERVE": 2,
    "LIEUX": 4,
    "ENCLOS": [5, 4],
    "AGRANDI": 8,
    "PETITE": [5, 5],
    "CARACTERE": {
      "RAYON": 30,
      "PAS": 2,
      "ORDRE": ["montagne", "cote", "marais", "foret", "lande"],
      "SEUILS": { "montagne": 0.25, "cote": 0.2, "marais": 0.2, "foret": 0.3, "lande": 0.4 }
    },
    "BATISSES": {
      "cabane": {
        "style": "foret",
        "l": 5,
        "h": 4,
        "porte": 2,
        "fenetres": [3],
        "meubles": [["four", 1, 1], ["lit_adulte", 3, 2], ["chaise", 1, 2]],
        "dehors": [["tas_bois", 3, -1], ["billot", -2, 0]]
      },
      "atelier": {
        "style": "montagne",
        "l": 7,
        "h": 5,
        "porte": 4,
        "fenetres": [1, 2],
        "meubles": [["table", 1, 1], ["armoire", 4, 1], ["cuisiniere", 5, 3], ["coffre", 1, 3], ["chaise", 2, 2]],
        "dehors": [["tas_minerai", 3, -1], ["wagonnet", -3, 0]]
      }
    },
    "STYLES": {
      "montagne": { "nom": "de la montagne", "mur": "pierre", "toit": "ardoise", "sol": "sol_dalles", "place": "paves", "foyer": "four" },
      "cote": { "nom": "de la côte", "mur": "taille", "toit": "tuiles", "sol": "sol_tomettes", "place": "paves", "foyer": "cuisiniere" },
      "marais": { "nom": "du marais", "mur": "bois", "toit": "roseaux", "sol": "sol_plancher", "place": "terre", "foyer": "four", "platelage": true },
      "foret": { "nom": "de la forêt", "mur": "bois", "toit": "chaume", "sol": "sol_plancher", "place": "terre", "foyer": "four" },
      "lande": { "nom": "de la lande", "mur": "bois", "toit": "chaume", "sol": "sol_tomettes", "place": "terre", "foyer": "four" },
      "prairie": { "nom": "des prés", "mur": "pierre", "toit": "tuiles", "sol": "sol_plancher", "place": "terre", "foyer": "cuisiniere" }
    },
    "METIERS": {
      "ORDRE": ["mineur", "pecheur", "bucheron", "berger", "cueilleur"],
      "GROTTE": 70,
      "EAU": 0.03,
      "PECHE": 40,
      "FORET": 0.15,
      "LANDE": 0.2,
      "NOMS": { "mineur": "mineurs", "pecheur": "pêcheurs", "bucheron": "bûcherons", "berger": "bergers", "cueilleur": "cueilleurs" }
    },
    "TRAVAIL": {
      "bucheron": { "lieu": "atelier", "pieces": ["billot", "tas_bois", "tas_bois"] },
      "pecheur": { "lieu": "ponton", "pieces": ["barque", "sechoir"] },
      "mineur": { "lieu": "atelier", "pieces": ["wagonnet", "tas_minerai"] },
      "berger": { "lieu": "enclos", "pieces": ["auge"] },
      "cueilleur": { "lieu": "atelier", "pieces": ["claie", "paniers"] }
    },
    "SORTES": [
      { "nom": "mur_pierre", "genre": "mur", "variantes": 16 },
      { "nom": "mur_taille", "genre": "mur", "variantes": 16 },
      { "nom": "mur_bois", "genre": "mur", "variantes": 16 },
      { "nom": "fenetre_pierre", "genre": "mur", "variantes": 16 },
      { "nom": "fenetre_taille", "genre": "mur", "variantes": 16 },
      { "nom": "fenetre_bois", "genre": "mur", "variantes": 16 },
      { "nom": "porte_pierre", "genre": "porte", "variantes": 1 },
      { "nom": "porte_taille", "genre": "porte", "variantes": 1 },
      { "nom": "porte_bois", "genre": "porte", "variantes": 1 },
      { "nom": "porte_cote", "genre": "porte", "variantes": 1 },
      { "nom": "lit_adulte", "genre": "meuble", "variantes": 1, "largeur": 1, "hauteur": 2, "pied": 8 },
      { "nom": "lit_enfant", "genre": "meuble", "variantes": 1, "largeur": 1, "hauteur": 2, "pied": 8 },
      { "nom": "table", "genre": "meuble", "variantes": 1, "largeur": 3 },
      { "nom": "table_basse", "genre": "meuble", "variantes": 1, "largeur": 2 },
      { "nom": "chaise", "genre": "meuble", "variantes": 1 },
      { "nom": "coffre", "genre": "meuble", "variantes": 1, "largeur": 2 },
      { "nom": "buffet", "genre": "meuble", "variantes": 1, "largeur": 2 },
      { "nom": "armoire", "genre": "meuble", "variantes": 1, "largeur": 2 },
      { "nom": "chevet", "genre": "meuble", "variantes": 1 },
      { "nom": "four", "genre": "meuble", "variantes": 1 },
      { "nom": "cuisiniere", "genre": "meuble", "variantes": 1 },
      { "nom": "barriere", "genre": "barriere", "variantes": 16 },
      { "nom": "puits", "genre": "objet", "variantes": 1 },
      { "nom": "banc", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "panneau", "genre": "objet", "variantes": 1 },
      { "nom": "tas_bois", "genre": "objet", "variantes": 2 },
      { "nom": "billot", "genre": "objet", "variantes": 1 },
      { "nom": "barque", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "sechoir", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "wagonnet", "genre": "objet", "variantes": 1 },
      { "nom": "tas_minerai", "genre": "objet", "variantes": 1 },
      { "nom": "auge", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "claie", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "paniers", "genre": "objet", "variantes": 1 },
      { "nom": "poulailler", "genre": "objet", "variantes": 1, "largeur": 2 },
      { "nom": "fruitier", "genre": "arbre", "variantes": 5 },
      { "nom": "sol_plancher", "genre": "basse", "variantes": 16 },
      { "nom": "sol_dalles", "genre": "basse", "variantes": 16 },
      { "nom": "sol_tomettes", "genre": "basse", "variantes": 16 },
      { "nom": "paves", "genre": "basse", "variantes": 16 },
      { "nom": "terre", "genre": "basse", "variantes": 1 },
      { "nom": "potager", "genre": "basse", "variantes": 6 },
      { "nom": "tapis", "genre": "basse", "variantes": 3, "largeur": 3 }
    ],
    "BLOQUE": [
      "mur_pierre",
      "mur_taille",
      "mur_bois",
      "fenetre_pierre",
      "fenetre_taille",
      "fenetre_bois",
      "table",
      "table_basse",
      "chaise",
      "coffre",
      "buffet",
      "armoire",
      "chevet",
      "four",
      "cuisiniere",
      "barriere",
      "puits",
      "banc",
      "panneau",
      "tas_bois",
      "billot",
      "barque",
      "sechoir",
      "wagonnet",
      "tas_minerai",
      "auge",
      "claie",
      "paniers",
      "poulailler",
      "fruitier"
    ]
  },
  "HABITANTS": {
    "ADULTES": [1, 2],
    "SEUL": 4,
    "ENFANTS": [0, 3],
    "SECOND": { "MEME": 45, "AUTRE": 30, "METIERS": ["cueilleur", "berger", "pecheur", "bucheron"] },
    "ARGENT": 120,
    "JOURNAL": 7,
    "RATTRAPAGE": 7,
    "GARDE": 6,
    "RESERVE_MAX": 600,
    "TRISTE": 30,
    "HEUREUX": 70,
    "PRENOMS": {
      "f": [
        "Agathe",
        "Albane",
        "Alice",
        "Anaïs",
        "Anne",
        "Apolline",
        "Bérénice",
        "Blanche",
        "Camille",
        "Capucine",
        "Céleste",
        "Clémence",
        "Colette",
        "Douce",
        "Élise",
        "Émeline",
        "Faustine",
        "Flavie",
        "Gabrielle",
        "Garance",
        "Hélène",
        "Iris",
        "Jeanne",
        "Joséphine",
        "Léonie",
        "Lise",
        "Lucie",
        "Madeleine",
        "Margot",
        "Marthe",
        "Maud",
        "Mélanie",
        "Ninon",
        "Odile",
        "Pauline",
        "Rose",
        "Salomé",
        "Solène",
        "Suzanne",
        "Violette"
      ],
      "m": [
        "Achille",
        "Adrien",
        "Aimé",
        "Albin",
        "Ambroise",
        "Anatole",
        "Armand",
        "Arthur",
        "Augustin",
        "Baptiste",
        "Basile",
        "Benoît",
        "Célestin",
        "Clément",
        "Côme",
        "Damien",
        "Émile",
        "Étienne",
        "Eugène",
        "Félix",
        "Fernand",
        "Gaspard",
        "Gustave",
        "Henri",
        "Honoré",
        "Jules",
        "Léon",
        "Louis",
        "Lucien",
        "Marius",
        "Mathurin",
        "Noé",
        "Octave",
        "Paul",
        "Quentin",
        "Raphaël",
        "Simon",
        "Théo",
        "Victor",
        "Yves"
      ]
    },
    "PERSOS": {
      "adulte": {
        "f": [1, 2, 4, 5, 6, 11, 13, 15, 16, 17, 19, 20, 21, 22, 24, 26, 27, 28, 30, 31, 32, 34, 35, 37, 38, 40, 41, 42, 46, 47, 49],
        "m": [3, 7, 8, 9, 10, 12, 14, 18, 23, 25, 29, 33, 36, 39, 43, 44, 45, 48, 50]
      },
      "enfant": {
        "f": [2, 6, 8, 11, 13, 15, 17, 19, 21, 22, 24, 26, 27, 30, 32, 34, 37, 38, 40, 41, 42, 44, 45, 46, 49, 50],
        "m": [1, 3, 4, 5, 7, 9, 10, 12, 14, 16, 18, 20, 23, 25, 28, 29, 31, 33, 35, 36, 39, 43, 47, 48]
      }
    },
    "METIERS": {
      "bucheron": {
        "nom": { "m": "bûcheron", "f": "bûcheronne" },
        "geste": "couper",
        "ACTIONS": 4,
        "donne": { "bois": [3, 5] },
        "chance": { "pomme_de_pin": 15 },
        "RECETTES": ["gratin_patates", "soupe_legumes", "compote", "bocal_legumes"]
      },
      "pecheur": {
        "nom": { "m": "pêcheur", "f": "pêcheuse" },
        "geste": "pecher",
        "ACTIONS": 6,
        "une_de": {
          "mer": { "sardine": 4, "anchois": 3, "dorade": 2, "bar": 1, "poisson": 3 },
          "lac": { "truite": 4, "omble": 3, "brochet": 1, "poisson": 3 },
          "riviere": { "truite": 4, "goujon": 4, "saumon": 1, "poisson": 3 }
        },
        "nombre": [1, 1],
        "RECETTES": ["poisson_grille", "gratin_patates", "soupe_legumes", "compote"]
      },
      "mineur": {
        "nom": { "m": "mineur", "f": "mineuse" },
        "geste": "piocher",
        "ACTIONS": 5,
        "donne": { "pierre": [1, 3] },
        "chance": { "minerai_fer": 30, "minerai_cuivre": 18, "quartz": 6 },
        "RECETTES": ["gratin_patates", "soupe_legumes", "bocal_legumes", "compote"]
      },
      "berger": {
        "nom": { "m": "berger", "f": "bergère" },
        "geste": "traire",
        "ACTIONS": 3,
        "donne": { "lait": [1, 2] },
        "chance": { "laine": 35 },
        "RECETTES": ["fromage_frais", "gratin_patates", "soupe_legumes", "compote"]
      },
      "cueilleur": {
        "nom": { "m": "cueilleur", "f": "cueilleuse" },
        "geste": "cueillir",
        "ACTIONS": 6,
        "une_de": { "*": { "baies": 4, "champignon": 3, "mures": 3, "myrtille": 2, "chataigne": 2 } },
        "nombre": [1, 2],
        "RECETTES": ["omelette_champignons", "compote", "gratin_patates", "soupe_legumes"]
      }
    },
    "JARDINIER": { "nom": { "m": "jardinier", "f": "jardinière" }, "RECETTES": ["gratin_patates", "soupe_legumes", "bocal_legumes", "compote"] },
    "JARDIN": {
      "FOYER": [2, 3],
      "JARDINIER": [2, 4],
      "LEGUMES": { "patate": 4, "carotte": 2, "oignon": 2, "tomate": 1, "courgette": 1, "ail": 1, "epinard": 1 },
      "POTAGER": [1, 2],
      "VERGER": [1, 2],
      "FRUITS": { "pomme": 3, "poire": 2, "cerise": 1, "abricot": 1, "peche": 1 },
      "OEUFS": [0, 2]
    },
    "HORAIRE": { "LEVER": 6.5, "TRAVAIL": 7.5, "MIDI": 12, "REPRISE": 13.5, "RENTREE": 18, "COUCHER": 21.5 },
    "PHRASES": {
      "salut": {
        "matin": ["Bonjour !", "Belle matinée, n'est-ce pas ?", "Le jour se lève à peine."],
        "jour": ["Belle journée !", "Salut à toi !", "Tiens, de la visite !"],
        "soir": ["Bonsoir !", "La journée s'achève.", "Le soleil se couche."],
        "nuit": ["Il est tard. Chez nous, tout le monde dort déjà.", "Il est bien tard."]
      },
      "activite": {
        "dort": ["(ça dort à poings fermés)", "(un ronflement tranquille)"],
        "maison": ["On se prépare pour la journée.", "Je range un peu la maison."],
        "chemin": ["Je file au travail.", "Pardon, je passe !", "Je suis en retard, à tout à l'heure !"],
        "joue": ["On joue à chat !", "Tu veux jouer avec nous ?", "Je cours plus vite que toi !", "On a vu un lapin près du puits !"],
        "repas": ["C'est l'heure de manger.", "Ça sent bon à la maison.", "À table !"],
        "rentre": ["Je rentre à la maison.", "La soupe nous attend.", "Encore une bonne journée."],
        "soir": ["On se repose un peu avant la nuit.", "Quelle journée !", "Bientôt l'heure d'aller au lit."]
      },
      "travail": {
        "bucheron": [
          "Le bois ne se coupe pas tout seul !",
          "Les arbres repousseront, ne t'en fais pas.",
          "Une bonne flambée pour les nuits fraîches."
        ],
        "pecheur": ["Ça mord, aujourd'hui.", "Chut, tu vas faire fuir les poissons.", "La patience, c'est tout le métier."],
        "mineur": ["La roche est dure par ici.", "Il y a du fer dans cette montagne.", "Un coup de pioche après l'autre."],
        "berger": ["Mes bêtes ont bon appétit.", "Le lait sera bon ce soir.", "La laine pousse avec le beau temps."],
        "cueilleur": ["Les buissons sont pleins de baies.", "Je connais les bons coins à champignons.", "Rien ne vaut les mûres du matin."],
        "jardinier": ["Le potager demande du soin.", "Les légumes poussent bien cette année.", "Encore un rang à désherber."]
      },
      "humeur": {
        "heureux": ["On vit bien, au hameau.", "La vie est douce, ici.", "On mange bien et on dort bien."],
        "content": ["Ça va, ça va.", "On ne se plaint pas.", "Les jours se suivent."],
        "triste": ["On n'a pas le moral, ces temps-ci…", "La fatigue se fait sentir.", "La vie est dure, au hameau."],
        "faim": ["On n'a pas eu assez à manger hier.", "Le garde-manger est presque vide…"]
      }
    }
  },
  "CALECHE": {
    "NOM": "La calèche",
    "ICONE": "🐴",
    "FERME": 10,
    "ARRET_FERME": 1,
    "ARRET": 0.5,
    "DEPART": 6.5,
    "JOURNEE": 15,
    "VITESSE": 150,
    "PORTEE": 4,
    "HELER": 9,
    "PROCHE": 70,
    "RETENUE": 0.5,
    "RETENUE_MAX": 3,
    "ACHAT_HAMEAU": 60,
    "VENTE": 150,
    "PRIS": 20,
    "COFFRE_MAX": 40,
    "GARDE": 50,
    "RATTRAPAGE": 3
  },
  "DECOUVERTE": {
    "CELLULE": 8,
    "MARGE_FERME": 12,
    "RAYON": 12,
    "RAYONS": { "prairie": 12, "lande": 15, "plage": 15, "falaise": 15, "montagne": 18, "sommet": 22, "foret": 7, "marais": 9 },
    "NUIT": 0.5,
    "RAYON_MIN": 5,
    "ARRIVEE": 4
  },
  "BIENVENUE": {
    "JOUR": 2,
    "HEURE": 11,
    "FIN": 17,
    "ATTENTE": 45,
    "PROCHE": 64,
    "PLATS": {
      "bucheron": "gratin_patates",
      "pecheur": "tarte_pommes",
      "mineur": "gratin_patates",
      "berger": "raclette",
      "cueilleur": "tarte_myrtilles",
      "*": "gratin_patates"
    },
    "DITS": {
      "gratin_patates": "un gratin de patates tout chaud",
      "tarte_pommes": "une tarte aux pommes",
      "raclette": "une raclette",
      "tarte_myrtilles": "une tarte aux myrtilles"
    },
    "TOC": "Toc, toc ! Il y a quelqu'un ?",
    "PHRASES": [
      "Bienvenue ! Je suis {prenom}, {hameau}. Je vous ai apporté un bon plat : {plat}. Bonne installation !",
      "Bonjour, et bienvenue parmi nous ! Moi, c'est {prenom}, {hameau}. Tenez, un bon plat pour vous : {plat}.",
      "Bienvenue chez vous ! {prenom}, {hameau}. Une ferme, ça creuse : je vous ai apporté {plat}."
    ],
    "VOISIN": { "m": "votre voisin", "f": "votre voisine" },
    "ABSENT": "Personne… Je laisse le plat devant la porte."
  },
  "RECIT": {
    "RELATION_MAX": 100,
    "PALIERS": [0, 10, 25, 45, 70],
    "PALIER_NOMS": ["inconnu", "poli", "cordial", "proche", "intime"],
    "CONFIANCE": { "DEPART": 50, "MAX": 100, "NIVEAUX": { "reservee": 0, "cordiale": 40, "chaleureuse": 70 } },
    "AGES": { "RECENT": 3, "SOUVENIR": 14 },
    "EMPREINTE": {
      "TUILE": 1,
      "ARBRE_ABATTU": 2,
      "ARBRE_PLANTE": -2,
      "BETES": { "poule": 1, "mouton": 2, "vache": 3 },
      "MACHINES": { "station_robot": 40, "botteleuse": 15, "distributeur": 15, "convoyeur": 5, "entonnoir": 5, "panneau": 5, "batterie": 5 },
      "NIVEAUX": { "basse": 0, "moyenne": 120, "haute": 220 }
    },
    "DERIVE": { "NUITS": 3, "POINTS": { "basse": 0, "moyenne": 0, "haute": -1 }, "PLANCHER": 20 },
    "FINS": {
      "GRANDE": "haute",
      "ENTRETIEN": 4,
      "NATURE": 10,
      "POIDS": { "promesse": 1, "toit": 1, "enveloppe": 3 },
      "LISTE": ["nouveau_maurice", "voisin_tranquille", "autrement", "riche"]
    },
    "ENVELOPPE": { "OBJET": "enveloppe_maurice", "PIECES": 15000, "CONFIANCE": 5 },
    "USURE": { "ACTE": 3, "NUITS": 4, "MAX": 2, "REPARER": { "planche": 6, "pierre": 4 }, "CONFIANCE": 5, "ENVELOPPE_CONFIANCE": 3 },
    "TOURNEE": ["genets", "bois_joli"],
    "FIL": {
      "FRAGMENTS": ["note_j", "page_bord", "releves_frida", "johnny_pleine", "johnny_noire", "johnny_croissante"],
      "GALERIE": { "NIVEAU": 4, "LUNE": "pleine", "HEURES": [22, 4], "CHAMBRE": { "LARGEUR": 16, "HAUTEUR": 14, "SALLE": [5, 5, 10, 9] } },
      "PIERRE": { "OBJET": "pierre_lune", "POUSSE": 0.75 },
      "LUEUR": [20, 6],
      "JOHNNY": {
        "REPAS": 3,
        "NUIT": [20, 6],
        "DEHORS": [23, 5],
        "BRIBES": { "pleine": "johnny_pleine", "nouvelle": "johnny_noire", "croissante": "johnny_croissante" },
        "ACCUEIL": [
          "Tu es nouveau ? Tu es déjà venu ? Ça ne fait rien. Assieds-toi.",
          "Les crabes marchent de côté par politesse. Je crois.",
          "Regarde la mousse sur ce rondin. Elle n'était pas là hier. Ou si.",
          "Ah, quelqu'un. Il y a de la place. Il y a toujours de la place."
        ],
        "REPAS_TEXTES": [
          "Oh, à manger. Quelqu'un m'en apportait, avant. De la soupe, souvent. Il parlait peu.",
          "Tu reviens avec à manger. C'est gentil. Je l'ai déjà dit, peut-être.",
          "Ça sent bon. Assieds-toi, on va regarder par la fenêtre en mangeant."
        ],
        "DEJA": "J'ai encore ce que tu m'as apporté tout à l'heure. Garde le tien.",
        "PIERRE": "Ah. Elle est rentrée.",
        "VIDE": "La cabane est vide, le lit froid. Dans les bois, quelqu'un marche sous la lune."
      }
    },
    "ACTES": [
      { "numero": 1, "titre": "L'arrivée", "chapitre": 1, "nuits": 0 },
      { "numero": 2, "titre": "Le petit de Maurice", "chapitre": 3, "nuits": 10 },
      { "numero": 3, "titre": "Ce que devient la ferme", "chapitre": 5, "nuits": 25 },
      { "numero": 4, "titre": "D'ici", "chapitre": 7, "nuits": 45 }
    ],
    "BULLE_MAX": 110,
    "VARIABLE_MAX": 16,
    "HUMEURS": ["heureux", "content", "triste", "faim"],
    "VARIABLES": ["hameau", "objet", "quand"],
    "SALUTS": {
      "reservee": ["Bonjour.", "Ah. Bonjour."],
      "cordiale": [{ "m": "Tiens, le petit de Maurice.", "f": "Tiens, la petite de Maurice." }, "Ah, te revoilà."],
      "chaleureuse": ["{prenom} ! Tu restes manger ?", "Ah, {prenom} ! Entre donc."]
    },
    "PERSONNAGES": {
      "adele": { "nom": "Adèle", "role": "la mère du personnage principal", "lieu": "Cadolon" },
      "maurice": { "nom": "Maurice", "role": "le grand-père, l'ancien cocher (mort il y a un an)", "lieu": "Le Gué" },
      "achille": { "nom": "Achille", "role": "le cocher", "lieu": "Le Gué", "perso": 8 },
      "odile": { "nom": "Odile", "role": "l'ancienne restée", "lieu": "Le Gué", "perso": 16, "habite": { "hameau": "gue", "genre": "f" } },
      "fernand": { "nom": "Fernand", "role": "l'ancien revenu de Cadolon", "lieu": "Les Mouettes" },
      "garance": { "nom": "Garance", "role": "la tisserande", "lieu": "Les Genêts" },
      "lise": { "nom": "Lise", "role": "la fille de Garance", "lieu": "Les Genêts" },
      "basile": {
        "nom": "Basile",
        "role": "le scieur et ébéniste",
        "lieu": "Bois-Joli",
        "perso": 18,
        "habite": { "hameau": "bois_joli", "genre": "m", "metier": "bucheron" }
      },
      "theo": {
        "nom": "Théo",
        "role": "le fils de Basile",
        "lieu": "Bois-Joli",
        "perso": 18,
        "habite": { "hameau": "bois_joli", "genre": "m", "enfant": true, "avec": "basile" }
      },
      "frida": { "nom": "Frida", "role": "la scientifique", "lieu": "son atelier de l'étang" },
      "johnny": { "nom": "Johnny", "role": "l'ermite", "lieu": "sa cabane de la forêt" },
      "compagnon": { "nom": "le compagnon", "role": "le second adulte de la famille", "lieu": "la ferme" }
    },
    "FRAGMENTS": {
      "carnet_promesses": {
        "titre": "Un carnet de tournée de Maurice",
        "texte": "Genêts : toit de Garance, avant les pluies. Bois-Joli : lames de la scie. Mouettes : la pompe, encore. J. : soupe, pain."
      },
      "note_j": {
        "titre": "La note « J. »",
        "texte": "J. : soupe, pain. Il a encore parlé de la lune. Il dit qu'il l'a « rentrée sous la terre du milieu »."
      },
      "page_bord": { "titre": "Une page de bord délavée", "texte": "Le croquis d'une pierre, le mot « fragment », une date qu'on ne lit plus." },
      "releves_frida": {
        "titre": "Les relevés de Frida",
        "texte": "Une carte de l'île : les récoltes de pleine lune gagnent le plus au centre, là où est la ferme."
      },
      "johnny_pleine": {
        "titre": "Johnny, une nuit de pleine lune",
        "texte": "« Regarde comme la lune brille aujourd'hui, c'est fascinant. On dirait qu'elle cherche quelque chose. »"
      },
      "johnny_noire": { "titre": "Johnny, une nuit noire", "texte": "« Quand il fait tout noir, je l'entends sous les arbres. »" },
      "johnny_croissante": {
        "titre": "Johnny, sous la lune croissante",
        "texte": "« J'avais un caillou qui brillait. Je l'ai mis au chaud, dans le noir, pour qu'il dorme. »"
      },
      "souvenir_lise": {
        "titre": "Ce que Lise a vu",
        "texte": "« Une nuit de pleine lune, j'ai vu le vieux de la forêt marcher vers les bois de chez toi. »"
      }
    },
    "SCENES": [
      {
        "id": "arrivee",
        "quand": { "installee": true, "jour_max": 1, "sans_fait": "arrivee" },
        "priorite": 100,
        "lignes": [
          { "qui": "fernand", "texte": "Les héritiers de Maurice. Ça se voit, vous avez l'air perdus." },
          { "qui": "fernand", "texte": "La terre, c'est par là. Suivez le chemin. La calèche passe demain." }
        ],
        "effet": { "fait": "arrivee", "relation": { "fernand": 10 } }
      },
      {
        "id": "arrivee_enfants",
        "quand": { "installee": true, "jour_max": 1, "fait": "arrivee", "sans_fait": "arrivee_enfants", "enfants": true },
        "priorite": 90,
        "lignes": [{ "qui": "fernand", "texte": "Et ces petits-là, ils tiendront pas une semaine sans écran. On parie ?" }],
        "effet": { "fait": "arrivee_enfants" }
      },
      {
        "id": "achille_cle",
        "quand": { "chapitre_min": 2, "lieu": "caleche_ferme", "sans_fait": "achille.cle" },
        "priorite": 100,
        "lignes": [
          { "qui": "achille", "nom": "Le cocher", "texte": "Ho." },
          { "qui": "achille", "nom": "Le cocher", "texte": "Toi, t'as les yeux de ta mère." },
          { "qui": "achille", "texte": "Achille. Je mène la calèche depuis que ton grand-père a arrêté." },
          { "qui": "achille", "texte": "Tiens, la clé de chez Maurice, au Gué. On ferme pas, ici. C'est pour dire que c'est à toi." },
          { "qui": "achille", "texte": "Il a laissé des carnets partout. Moi, j'en ai deux. Je les garde." },
          { "qui": "achille", "texte": "Je passe tous les jours vers dix heures. T'as du surplus, je prends." }
        ],
        "effet": { "fait": "achille.cle", "relation": { "achille": 10 }, "montrer": "gue" }
      },
      {
        "id": "odile_maison",
        "quand": { "fait": "achille.cle", "lieu": "maison_maurice", "sans_fait": "odile.rencontre" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": { "m": "Vous êtes le petit d'Adèle.", "f": "Vous êtes la petite d'Adèle." } },
          { "qui": "odile", "texte": "Elle vous a dit de passer me voir, j'imagine. Elle dit toujours ça." },
          { "qui": "odile", "texte": "Il n'y a rien à prendre là-dedans. Il donnait tout." },
          { "qui": "odile", "texte": "On se tutoiera quand vous aurez passé une pleine lune ici." }
        ],
        "effet": { "fait": "odile.rencontre", "relation": { "odile": 10 }, "fragment": "carnet_promesses" }
      },
      {
        "id": "veillee_1",
        "quand": { "acte_min": 2, "lieu": "gue", "lune": "pleine", "heure": [19, 22], "fait": "odile.rencontre", "sans_fait": "veillee.1" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Asseyez-vous. Les soirs de pleine lune, on la regarde ensemble." },
          {
            "qui": "garance",
            "quand": { "fait": "promesse.toit_garance.commencee" },
            "texte": "Il paraît que t'as commencé mon toit. On verra s'il tient."
          },
          {
            "qui": "garance",
            "quand": { "sans_fait": "promesse.toit_garance.commencee", "machines": true },
            "texte": "Il paraît que t'as une machine qui travaille pour toi. Ici, on travaille pour nous."
          },
          {
            "qui": "fernand",
            "quand": {
              "sans_fait": ["promesse.toit_garance.commencee", "promesse.scie_bois_joli.commencee", "promesse.pompe_mouettes.commencee"],
              "machines": false
            },
            "texte": "Personne a encore d'avis sur toi. Profites-en, ça dure pas."
          },
          { "qui": "odile", "texte": "Bon. Tu as vu une pleine lune ici. On peut se tutoyer." },
          { "qui": "achille", "texte": "Maurice venait jamais aux veillées. Toujours sur la route. Toi, t'es là. C'est déjà ça." }
        ],
        "effet": { "fait": ["veillee.1", "odile.tutoie"], "relation": { "odile": 10, "achille": 15 }, "confiance_partout": 5 }
      },
      {
        "id": "frida_ferme",
        "quand": { "acte_min": 2, "chapitre_min": 4, "lieu": "ferme", "sans_fait": "frida.rencontre" },
        "priorite": 90,
        "lignes": [
          {
            "qui": "frida",
            "nom": "Une inconnue",
            "texte": {
              "m": "Alors c'est toi. La dernière fois que je t'ai vu, tu tenais dans un panier.",
              "f": "Alors c'est toi. La dernière fois que je t'ai vue, tu tenais dans un panier."
            }
          },
          { "qui": "frida", "texte": "Frida. Je fabrique des machines. Ici, on dit que ce n'est pas bien." },
          { "qui": "frida", "texte": "Moi je dis que ça dépend de ce qu'on en fait." },
          { "qui": "frida", "texte": "Un robot qui récolte, une station pour le recharger. Trois heures gagnées par jour. Pour l'île, ou pour toi." },
          { "qui": "frida", "quand": { "empreinte": "basse" }, "texte": "Ta ferme est petite. Tant mieux : une machine y ferait moins de bruit." },
          {
            "qui": "frida",
            "quand": { "empreinte": ["moyenne", "haute"] },
            "texte": "Ta ferme grandit vite. Tu vas avoir besoin de moi, ou de beaucoup de bras."
          },
          { "qui": "frida", "texte": "Réfléchis. Mon atelier est au bord de l'étang." }
        ],
        "effet": { "fait": "frida.rencontre", "relation": { "frida": 10 } }
      },
      {
        "id": "maurice_fortune",
        "quand": { "acte_min": 2, "lieu": "caleche_ferme", "jour_min": 21, "palier_min": 2, "fait": "veillee.1", "sans_fait": "maurice.fortune" },
        "priorite": 80,
        "lignes": [
          { "qui": "achille", "texte": "Tu crois qu'il t'a laissé quoi, Maurice ?" },
          { "qui": "achille", "texte": "Il gagnait bien. Il gardait rien." },
          { "qui": "achille", "texte": "Le toit des Genêts, la scie de Bois-Joli, la pompe des Mouettes : c'est lui." },
          { "qui": "achille", "texte": "Quand il a arrêté, plus personne a payé. Ça se voit, maintenant." },
          { "qui": "achille", "texte": "Ton héritage, c'est cette terre. Et ce que les gens pensent de toi à cause de lui." },
          { "qui": "achille", "texte": "Ça aussi, ça se dépense." }
        ],
        "effet": { "fait": "maurice.fortune", "relation": { "achille": 5 } }
      },
      {
        "id": "veillee_ferme",
        "quand": { "debloque": "veillee", "lieu": "ferme", "lune": "pleine", "heure": [19, 22], "sans_fait": "veillee.ferme" },
        "priorite": 95,
        "lignes": [
          { "qui": "odile", "texte": "On a vu ta lumière depuis le chemin. Alors on est venus." },
          { "qui": "fernand", "texte": "Chez toi, la lune se voit mieux. C'est la terre du milieu, ça." },
          { "qui": "achille", "texte": "Ton grand-père aurait aimé voir ça. Du monde, chez lui." },
          { "qui": "odile", "texte": "On reviendra. Les soirs de pleine lune, laisse la porte ouverte." }
        ],
        "effet": { "fait": "veillee.ferme", "relation": { "odile": 5 }, "confiance_partout": 5 }
      },
      {
        "id": "note_j",
        "quand": { "lieu": "caleche_ferme", "palier_min": 3, "fait": "maurice.fortune", "sans_fragment": "note_j" },
        "priorite": 75,
        "lignes": [
          { "qui": "achille", "texte": "Tiens. Un des deux carnets de Maurice. Je l'ai assez lu." },
          { "qui": "achille", "texte": "Des « J. » partout. Un vieux fou qu'il aimait bien. Il lui portait la soupe." },
          { "qui": "achille", "texte": "Fais-en ce que tu veux. Moi, je garde l'autre." }
        ],
        "effet": { "fragment": "note_j", "relation": { "achille": 5 } }
      },
      {
        "id": "frida_releves",
        "quand": { "lieu": "atelier", "fait": ["frida.rencontre", "lieu.atelier"], "sans_fragment": "releves_frida" },
        "priorite": 90,
        "lignes": [
          { "qui": "frida", "texte": "Ah, toi. Pousse les boulons, assieds-toi." },
          { "qui": "frida", "texte": "Tu veux un chiffre ? 14 % de mieux aux récoltes de pleine lune. Pas partout : au centre de l'île." },
          { "qui": "frida", "texte": "Là où est ta ferme. Les anciens disent que c'est la lune. Moi, je dis que c'est intéressant." },
          { "qui": "frida", "texte": "Tiens, garde la carte. J'en ai fait trois. Je ne sais pas ce qu'elle cherche, cette lune." }
        ],
        "effet": { "fragment": "releves_frida", "relation": { "frida": 10 } }
      },
      {
        "id": "frida_pierre",
        "quand": { "lieu": "atelier", "fait": ["frida.rencontre", "pierre.posee"], "sans_fait": "frida.pierre" },
        "priorite": 95,
        "lignes": [
          { "qui": "frida", "texte": "Ta ferme pousse plus vite. 25 % plus vite. J'ai mesuré, ne fais pas cette tête." },
          { "qui": "frida", "texte": "C'est peut-être le sol. Peut-être pas." }
        ],
        "effet": { "fait": "frida.pierre", "relation": { "frida": 5 } }
      },
      {
        "id": "enveloppe_odile",
        "quand": { "touche": "odile", "objet": "enveloppe_maurice", "fait": "odile.rencontre" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Tiens. Cette écriture-là, je la connais." },
          { "qui": "odile", "quand": { "fait": "odile.tutoie" }, "texte": "Il t'a fait le même coup qu'à moi : il laisse choisir, et il sait déjà." },
          {
            "qui": "odile",
            "quand": { "sans_fait": "odile.tutoie" },
            "texte": "Il vous a fait le même coup qu'à moi : il laisse choisir, et il sait déjà."
          },
          { "qui": "odile", "texte": "Les toits, on s'en occupe. Une maison par nuit, comme lui faisait." },
          { "qui": "odile", "texte": "On ne remercie pas, ici. On s'en souvient." }
        ],
        "effet": {
          "fait": "enveloppe.donnee",
          "prendre": { "enveloppe_maurice": 1 },
          "relation": { "odile": 15, "achille": 5 },
          "confiance_partout": 5
        }
      },
      {
        "id": "veillee_2",
        "quand": { "acte_min": 3, "lieu": "gue", "lune": "pleine", "heure": [19, 22], "fait": "veillee.1", "sans_fait": "veillee.2" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Ta deuxième veillée. Ce soir, on parle de ta ferme. Ne fais pas cette tête." },
          { "qui": "fernand", "quand": { "empreinte": "haute" }, "texte": "On voit ta fumée depuis la cale. Là-bas, on appelait ça une usine." },
          { "qui": "fernand", "quand": { "empreinte": ["basse", "moyenne"] }, "texte": "Ta ferme fait pas de bruit. Ici, c'est un compliment." },
          { "qui": "garance", "quand": { "fait": "promesse.toit_garance" }, "texte": "Mon toit a tenu sous la pluie. Bon." },
          {
            "qui": "garance",
            "quand": { "sans_fait": "promesse.toit_garance", "machines": true },
            "texte": "Tes machines travaillent la nuit, il paraît. Ma laine, elle, attend le jour."
          },
          {
            "qui": "basile",
            "quand": { "fait": "promesse.scie_bois_joli" },
            "texte": "Les lames neuves chantent juste. Le bois te dit merci. Moi aussi."
          },
          {
            "qui": "odile",
            "quand": { "fait": "enveloppe.donnee" },
            "texte": "Les toits sont refaits. Tout le monde sait d'où vient l'argent. Personne ne le dira."
          },
          { "qui": "odile", "quand": { "fait": "enveloppe.ouverte" }, "texte": "L'enveloppe, tu l'as gardée. Elle était à toi. On n'en parle plus." },
          {
            "qui": "odile",
            "quand": { "fait": "toit.repare", "sans_fait": "enveloppe.donnee" },
            "texte": "Il paraît que tu montes sur les toits des autres. Lui aussi."
          },
          { "qui": "achille", "texte": "Maurice parlait de toi au bout de la tournée. Maintenant, c'est l'île qui parle de toi." }
        ],
        "effet": { "fait": "veillee.2", "relation": { "odile": 5, "achille": 5 }, "confiance_partout": 3 }
      },
      {
        "id": "theo_rencontre",
        "quand": { "touche": "theo", "sans_fait": "theo.rencontre" },
        "priorite": 90,
        "lignes": [
          { "qui": "theo", "texte": "C'est toi, celui de la ferme du milieu ? T'as vraiment vécu à Cadolon ?" },
          { "qui": "theo", "texte": "Moi c'est Théo. Je répare tout. Les roues, les pompes, les trucs de Frida." },
          { "qui": "theo", "texte": "Chut. Papa sait pas que je vais chez elle. Il veut que je fasse des chaises." }
        ],
        "effet": { "fait": "theo.rencontre", "relation": { "theo": 10 } }
      },
      {
        "id": "theo_confie",
        "quand": { "touche": "theo", "acte_min": 3, "fait": "theo.rencontre", "palier_min": 1, "sans_fait": "theo.confie" },
        "priorite": 90,
        "lignes": [
          { "qui": "theo", "texte": "Je vais partir. À Cadolon. Frida dit que j'ai des mains pour les machines." },
          { "qui": "theo", "texte": "Ici, c'est des chaises, des chaises, des chaises. Les chaises, elles ont pas besoin de moi." },
          { "qui": "theo", "texte": "Papa, je lui ai rien dit. Toi, tu lui parles bien. Moi, je crie." }
        ],
        "effet": { "fait": "theo.confie", "relation": { "theo": 5 } }
      },
      {
        "id": "basile_theo_apprenti",
        "quand": { "touche": "basile", "fait": ["theo.confie", "achille.tournee"], "sans_fait": "theo.choix" },
        "priorite": 95,
        "lignes": [
          { "qui": "basile", "texte": "Le petit veut partir. Je sais. Les murs sont minces." },
          { "qui": "basile", "texte": "Achille est passé. Il dit que t'as fait sa tournée. Il cherche quelqu'un pour la suite." },
          { "qui": "basile", "texte": "Le petit sur la calèche… Maurice a commencé comme ça. Pas loin, et partout." },
          { "qui": "basile", "texte": "Bon. Je lui dirai. Le chêne pousse où il veut, tant qu'il garde ses racines." }
        ],
        "effet": { "fait": ["theo.choix", "theo.apprenti"], "relation": { "basile": 10, "theo": 10, "achille": 5 } }
      },
      {
        "id": "basile_theo_atelier",
        "quand": { "touche": "basile", "fait": "theo.confie", "machines": true, "sans_fait": "theo.choix" },
        "priorite": 90,
        "lignes": [
          { "qui": "basile", "texte": "Le petit veut partir. Je sais. Les murs sont minces." },
          { "qui": "basile", "texte": "Chez toi, il paraît, des machines travaillent. Et ta terre tient toujours debout." },
          { "qui": "basile", "texte": "S'il veut mettre un moteur à ma scie… Le bois s'en fichera. Moi, je m'y ferai." },
          { "qui": "basile", "texte": "Bon. Je lui dirai de rester. Et de commencer par la courroie." }
        ],
        "effet": { "fait": ["theo.choix", "theo.atelier"], "relation": { "basile": 10, "theo": 10, "frida": 5 } }
      },
      {
        "id": "basile_theo_part",
        "quand": { "touche": "basile", "fait": "theo.confie", "sans_fait": "theo.choix" },
        "priorite": 80,
        "lignes": [
          { "qui": "basile", "texte": "Le petit veut partir. Je sais. Les murs sont minces." },
          { "qui": "basile", "texte": "J'ai rien à lui offrir, ici. Des chaises. Il l'a dit lui-même." },
          { "qui": "basile", "texte": "Le chêne, faut le laisser pousser où il veut. Même loin." },
          { "qui": "basile", "texte": "Il prend le bac demain. Il t'aimait bien, tu sais." }
        ],
        "effet": { "fait": ["theo.choix", "theo.part"], "relation": { "basile": 5 } }
      },
      {
        "id": "achille_cheval",
        "quand": {
          "acte_min": 3,
          "lieu": "caleche_ferme",
          "palier_min": 2,
          "jour_min": 30,
          "fait": "achille.cle",
          "sans_fait": "achille.tournee.demandee"
        },
        "priorite": 85,
        "lignes": [
          { "qui": "achille", "texte": "Ho. Mon cheval boite. Celui-là, c'est celui d'Odile : il ira pas plus loin que chez toi." },
          { "qui": "achille", "texte": "Les Genêts et Bois-Joli attendent la calèche. Ils vont s'inquiéter." },
          { "qui": "achille", "texte": "Tu passes leur dire ? Maurice le faisait, quand le cheval boitait. À pied." }
        ],
        "effet": { "fait": "achille.tournee.demandee", "relation": { "achille": 5 }, "montrer": ["genets", "bois_joli"] }
      },
      {
        "id": "achille_merci",
        "quand": {
          "lieu": "caleche_ferme",
          "fait": ["achille.tournee.demandee", "tournee.genets", "tournee.bois_joli"],
          "sans_fait": "achille.tournee"
        },
        "priorite": 90,
        "lignes": [
          { "qui": "achille", "texte": "Ho. Ils m'ont dit que t'étais passé. Les deux." },
          { "qui": "achille", "texte": "Garance t'a trouvé maigre. Basile t'a trouvé bien. Moi, je dis rien." },
          { "qui": "achille", "texte": "Faudra bien que quelqu'un reprenne, un jour. Moi, je ferai pas trente-cinq ans comme lui." }
        ],
        "effet": { "fait": "achille.tournee", "relation": { "achille": 15 } }
      },
      {
        "id": "achille_releve_theo",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": ["achille.tournee", "theo.apprenti"], "sans_fait": "achille.releve" },
        "priorite": 70,
        "lignes": [
          { "qui": "achille", "texte": "Le petit de Basile monte avec moi, le jeudi. Il parle trop. Le cheval l'aime bien." },
          { "qui": "achille", "texte": "Dans quelques années, la calèche, ce sera lui. Moi, je garderai l'écurie." },
          { "qui": "achille", "texte": "C'est toi qui m'as envoyé chez Basile. Je sais. Ça se dit pas, mais je sais." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.theo"], "relation": { "achille": 10 } }
      },
      {
        "id": "achille_releve_jeune",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.tournee", "hameaux_min": 6, "sans_fait": "achille.releve" },
        "priorite": 65,
        "lignes": [
          { "qui": "achille", "texte": "Un gamin d'un hameau du nord m'a arrêté sur la route. Il veut apprendre la calèche." },
          { "qui": "achille", "texte": "Il dit qu'il t'a vu passer à pied chez tout le monde. Ça lui a donné l'idée." },
          { "qui": "achille", "texte": "Bon. Je l'essaie. S'il tient la tournée d'un mois, je le garde." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.jeune"], "relation": { "achille": 5 } }
      },
      {
        "id": "achille_releve_personne",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.tournee", "sans_fait": "achille.releve" },
        "priorite": 60,
        "lignes": [
          { "qui": "achille", "texte": "Personne pour la calèche. Bon. Je tiendrai encore un peu. Le cheval aussi." },
          { "qui": "achille", "texte": "Maurice, lui, m'avait trouvé. Moi, je cherche encore." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.personne"] }
      },
      {
        "id": "fete_annonce",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.cle", "sans_fait": "fete.annonce" },
        "priorite": 95,
        "lignes": [
          { "qui": "achille", "texte": "Ho. La fête des premiers arrivants, c'est à la pleine lune. À Brumeval, le soir." },
          { "qui": "achille", "texte": "Une fois l'an, on fête ceux qui sont arrivés les premiers. Et ceux qui viennent d'arriver." },
          { "qui": "achille", "texte": "Tout le monde y monte. Même moi. Même le cheval." }
        ],
        "effet": { "fait": "fete.annonce", "relation": { "achille": 5 }, "montrer": "brumeval" }
      },
      {
        "id": "fete_nouveau_maurice",
        "quand": {
          "acte_min": 4,
          "lieu": "brumeval",
          "lune": "pleine",
          "heure": [19, 23],
          "fait": "fete.annonce",
          "sans_fait": "fete",
          "fin": "nouveau_maurice"
        },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Te voilà. Assieds-toi près du feu : c'est la place des nouveaux." },
          { "qui": "odile", "texte": "Les anciens ont parlé. L'entretien de l'île, on te le confie. Les toits, les routes, les promesses." },
          { "qui": "odile", "texte": "Tiens. La cloche de sa calèche. Elle sonne mieux quand on passe chez les autres." },
          { "qui": "achille", "texte": "{prenom}. Ça sonne bien, finalement." }
        ],
        "effet": {
          "fait": ["fete", "fin.nouveau_maurice"],
          "donner": { "cloche_maurice": 1 },
          "relation": { "odile": 10, "achille": 10 },
          "confiance_partout": 5
        }
      },
      {
        "id": "fete_voisin_tranquille",
        "quand": {
          "acte_min": 4,
          "lieu": "brumeval",
          "lune": "pleine",
          "heure": [19, 23],
          "fait": "fete.annonce",
          "sans_fait": "fete",
          "fin": "voisin_tranquille"
        },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Te voilà. Assieds-toi près du feu : c'est la place des nouveaux." },
          { "qui": "fernand", "texte": "T'as pas fait de bruit. T'as pas fait de vagues. Ici, ça s'appelle être d'ici." },
          { "qui": "odile", "texte": "On ne fête pas tout le monde aussi tranquillement. C'est bon signe." },
          { "qui": "fernand", "texte": "Demain, cinq heures, à la cale. Si t'es en retard, je pars sans toi." }
        ],
        "effet": { "fait": ["fete", "fin.voisin_tranquille"], "relation": { "fernand": 10, "odile": 5 }, "confiance_partout": 3 }
      },
      {
        "id": "fete_autrement",
        "quand": {
          "acte_min": 4,
          "lieu": "brumeval",
          "lune": "pleine",
          "heure": [19, 23],
          "fait": "fete.annonce",
          "sans_fait": "fete",
          "fin": "autrement"
        },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Te voilà. Assieds-toi près du feu : c'est la place des nouveaux." },
          { "qui": "odile", "texte": "On ne pensait pas qu'une grande ferme pouvait rendre autant. On s'est trompés. Ça arrive." },
          { "qui": "frida", "texte": "Tu leur as montré que ça pouvait servir. Moi, en cinquante ans, j'y suis pas arrivée." },
          { "qui": "frida", "texte": "Mes plans, je te les confie. 212 pages, dont 30 sur les haies. Tu verras." },
          {
            "qui": "theo",
            "quand": { "fait": "theo.choix", "sans_fait": "theo.part" },
            "texte": "Je reste ! Papa dit que l'île aura besoin de mécaniciens. Il a dit ça, lui !"
          }
        ],
        "effet": { "fait": ["fete", "fin.autrement"], "relation": { "frida": 10, "odile": 5 }, "confiance_partout": 5 }
      },
      {
        "id": "fete_riche",
        "quand": {
          "acte_min": 4,
          "lieu": "brumeval",
          "lune": "pleine",
          "heure": [19, 23],
          "fait": "fete.annonce",
          "sans_fait": "fete",
          "fin": "riche"
        },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Te voilà. Assieds-toi près du feu : c'est la place des nouveaux." },
          { "qui": "fernand", "texte": "Belle ferme. On la voit de partout." },
          { "qui": "odile", "texte": "Bonne fête." },
          { "qui": "achille", "texte": "Ho. Bon. À demain, dix heures." }
        ],
        "effet": { "fait": ["fete", "fin.riche"] }
      }
    ],
    "COMPAGNON": {
      "debut": "Te voilà ! Viens là, que je te voie.",
      "arroser": "J'ai arrosé le potager tous les jours, tout pousse bien, tu verras.",
      "cuisiner": "Je t'ai gardé une assiette au chaud, elle t'attend sur la table.",
      "ramasser": "J'ai rentré du bois et des pierres, pour qu'on ne manque de rien.",
      "betes": "Les bêtes ont bien mangé ; elles guettaient le chemin, elles aussi.",
      "fin": "La maison était trop calme sans toi. Assieds-toi et raconte-moi tout."
    },
    "LIEUX": {
      "cabane": [
        {
          "quand": { "lune": "pleine", "heure": [20, 5] },
          "texte": "La cabane est vide, le lit froid. Dans les bois, quelqu'un marche sous la lune."
        },
        { "texte": "Une cabane de rondins, sans lampe. Une tasse sèche sur la table. Personne." }
      ],
      "atelier": [
        { "quand": { "fait": "frida.rencontre" }, "texte": "L'atelier de Frida. Ça sent l'huile et le métal chaud. Elle n'est pas là." },
        { "texte": "Un atelier plein d'outils et de pièces de métal. Ça sent l'huile. Personne." }
      ],
      "epave": [
        {
          "quand": { "heure": [20, 6], "equipe": "lanterne_tempete", "sans_fragment": "page_bord" },
          "texte": "À la lanterne, sous une membrure, une page de bord délavée. On ne lit presque plus rien.",
          "effet": { "fragment": "page_bord" }
        },
        { "texte": "Une vieille coque couchée sur le sable, le mât cassé. Ici, personne n'y touche." }
      ],
      "cale": [
        { "quand": { "jour_max": 3 }, "texte": "Le bac qui vous a amenés repart demain matin. Fernand dit qu'il revient toujours, lui." },
        { "quand": { "heure": [20, 6] }, "texte": "Le bac dort contre la cale. Une lanterne se balance à la poupe. Cadolon, c'est par là." },
        { "texte": "La cale du bac, aux Mouettes. C'est par là que vous êtes arrivés. Le bac repart pour Cadolon à l'aube." }
      ]
    },
    "PROMESSES": {
      "toit_garance": {
        "titre": "Le toit de Garance, aux Genêts",
        "qui": "garance",
        "besoin": { "planche": 20, "pierre": 10, "laine": 5 },
        "effet": { "relation": { "garance": 15, "achille": 5 }, "confiance_partout": 3 }
      },
      "scie_bois_joli": {
        "titre": "Les lames de la scie, à Bois-Joli",
        "qui": "basile",
        "besoin": { "lingot_fer": 6, "planche": 10 },
        "effet": { "relation": { "basile": 15, "achille": 5 }, "confiance_partout": 3 }
      },
      "pompe_mouettes": {
        "titre": "La pompe des Mouettes",
        "qui": "fernand",
        "besoin": { "lingot_cuivre": 4, "lingot_fer": 4, "corde": 2 },
        "effet": { "relation": { "fernand": 15, "achille": 5 }, "confiance_partout": 3 }
      }
    },
    "REPLIQUES": [
      {
        "id": "achille.veillee",
        "qui": "achille",
        "quand": { "acte_min": 2, "fait": "odile.rencontre", "sans_fait": "veillee.1", "lune": ["croissante", "pleine"] },
        "texte": "La pleine lune arrive. On veille au Gué, le soir, de sept à dix. Viens donc.",
        "priorite": 30,
        "repos_jours": 2
      },
      {
        "id": "achille.promesses",
        "qui": "achille",
        "quand": { "fait": "odile.rencontre", "palier_max": 2 },
        "texte": "Les promesses de Maurice ? Donne-moi ce qu'il faut, je les porte. C'est sur ma route.",
        "priorite": 25,
        "repos_jours": 4
      },
      {
        "id": "achille.fortune",
        "qui": "achille",
        "quand": { "fait": "maurice.fortune" },
        "texte": "Maurice payait les toits. Toi, fais comme tu peux. Personne t'en demande autant.",
        "priorite": 12,
        "une_fois": true
      },
      {
        "id": "achille.poli.surplus",
        "qui": "achille",
        "quand": { "fait": "achille.cle", "palier_max": 1 },
        "texte": "Ho. Tu vends ou pas ?",
        "priorite": 10,
        "repos_jours": 2
      },
      {
        "id": "achille.poli.cheval",
        "qui": "achille",
        "quand": { "fait": "achille.cle", "palier_max": 1 },
        "texte": "Touche pas le cheval. Il mord les gens qu'il connaît pas.",
        "priorite": 10,
        "repos_jours": 3
      },
      {
        "id": "achille.cordial.oeufs",
        "qui": "achille",
        "quand": { "palier_min": 2 },
        "texte": "Ho. Garde-moi tes œufs, les Genêts en réclament.",
        "priorite": 10,
        "repos_jours": 4
      },
      {
        "id": "achille.cordial.gue",
        "qui": "achille",
        "quand": { "palier_min": 2 },
        "texte": "Odile demande après toi. Elle demande après tout le monde, remarque.",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "achille.soir",
        "qui": "achille",
        "quand": { "heure": [18, 22] },
        "texte": "Il dort debout, lui. Pas moi.",
        "priorite": 15,
        "repos_jours": 4
      },
      {
        "id": "achille.pleine",
        "qui": "achille",
        "quand": { "lune": "pleine" },
        "texte": "Pleine lune. Ce soir, tout le monde est dehors. Même moi.",
        "priorite": 20,
        "repos_jours": 10
      },
      {
        "id": "achille.vente_recente",
        "qui": "achille",
        "quand": { "fait_recent": "vente.caleche" },
        "texte": "Ce que tu m'as vendu est parti en une matinée. Continue.",
        "priorite": 40,
        "repos_jours": 7
      },
      {
        "id": "odile.veillee",
        "qui": "odile",
        "quand": { "acte_min": 2, "sans_fait": ["veillee.1", "odile.tutoie"], "fait": "odile.rencontre" },
        "texte": "Les soirs de pleine lune, on veille sur la place, de sept à dix. Vous viendrez ?",
        "priorite": 30,
        "repos_jours": 3
      },
      {
        "id": "odile.vous",
        "qui": "odile",
        "quand": { "fait": "odile.rencontre", "sans_fait": "odile.tutoie" },
        "texte": "Bonjour. Vous tenez le coup, là-haut ?",
        "priorite": 10,
        "repos_jours": 2
      },
      {
        "id": "odile.nuits_noires",
        "qui": "odile",
        "quand": { "lune": "nouvelle", "fait": ["odile.rencontre", "odile.tutoie"] },
        "texte": "On ne sème pas aux nuits noires. Ta mère non plus ne m'écoutait pas.",
        "priorite": 60,
        "repos_jours": 14
      },
      {
        "id": "odile.croissante",
        "qui": "odile",
        "quand": { "lune": "croissante", "fait": "odile.tutoie" },
        "texte": "On sème quand elle monte. Ce qui monte avec la lune pousse avec elle.",
        "priorite": 20,
        "repos_jours": 14
      },
      {
        "id": "odile.maigre",
        "qui": "odile",
        "quand": { "fait": ["odile.rencontre", "odile.tutoie"], "palier_min": 1 },
        "texte": "Tu manges, au moins ? Adèle avait dit que je te trouverais maigre.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "odile.enfants",
        "qui": "odile",
        "quand": { "fait": ["odile.rencontre", "odile.tutoie"], "enfants": true },
        "texte": "Et tes petits, ils savent ce que c'est, une nuit noire ?",
        "priorite": 15,
        "une_fois": true
      },
      {
        "id": "odile.maison",
        "qui": "odile",
        "quand": { "fait": ["odile.rencontre", "odile.tutoie"], "palier_min": 2 },
        "texte": "La maison de Maurice respire mieux quand quelqu'un y passe.",
        "priorite": 10,
        "repos_jours": 7
      },
      {
        "id": "fernand.peche",
        "qui": "fernand",
        "quand": { "fait": "arrivee" },
        "texte": "Là-bas, on aurait fait une réunion pour ça. Ici, on pêche.",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "fernand.calme",
        "qui": "fernand",
        "quand": { "fait": "arrivee", "heure": [5, 9] },
        "texte": "Tu fais du bruit. Les poissons aussi ont des oreilles.",
        "priorite": 15,
        "repos_jours": 6
      },
      {
        "id": "fernand.cadolon",
        "qui": "fernand",
        "quand": { "palier_min": 2 },
        "texte": "Tu regrettes Cadolon ? Moi, quarante ans. Puis plus du tout.",
        "priorite": 10,
        "une_fois": true
      },
      {
        "id": "achille.toits",
        "qui": "achille",
        "quand": { "fait": "toits.uses", "sans_fait": "enveloppe.donnee" },
        "texte": "Encore un toit qui prend l'eau. Maurice montait avec ses planches. Moi, j'ai le cheval.",
        "priorite": 30,
        "repos_jours": 12
      },
      {
        "id": "achille.enveloppe",
        "qui": "achille",
        "quand": { "fait": "enveloppe.donnee" },
        "texte": "Les toits, c'est bien. Il aurait fait pareil.",
        "priorite": 50,
        "une_fois": true
      },
      {
        "id": "achille.acte3",
        "qui": "achille",
        "quand": { "acte_min": 3, "empreinte": "haute" },
        "texte": "On parle de ta ferme jusqu'à Brumeval. Pas toujours en bien.",
        "priorite": 25,
        "repos_jours": 10
      },
      {
        "id": "achille.tournee",
        "qui": "achille",
        "quand": { "fait": "achille.tournee.demandee", "sans_fait": "achille.tournee" },
        "texte": "Les Genêts et Bois-Joli. T'oublies pas, hein. Le cheval compte sur toi.",
        "priorite": 45,
        "repos_jours": 2
      },
      {
        "id": "achille.cloche",
        "qui": "achille",
        "quand": { "fait": "fin.nouveau_maurice" },
        "texte": "Ho. T'as la cloche. Deux coups devant chaque maison : un pour bonjour, un pour au revoir.",
        "priorite": 50,
        "une_fois": true
      },
      {
        "id": "achille.fete",
        "qui": "achille",
        "quand": { "fait": "fete.annonce", "sans_fait": "fete", "lune": ["croissante", "pleine"] },
        "texte": "La fête, c'est à Brumeval, à la pleine lune. Tu montes, hein.",
        "priorite": 40,
        "repos_jours": 2
      },
      {
        "id": "odile.toit",
        "qui": "odile",
        "quand": { "fait": ["toit.repare", "odile.tutoie"] },
        "texte": "On ne monte pas sur le toit des autres sans les aimer un peu.",
        "priorite": 40,
        "une_fois": true
      },
      {
        "id": "odile.enveloppe",
        "qui": "odile",
        "quand": { "fait": ["enveloppe.ouverte", "odile.tutoie"] },
        "texte": "L'enveloppe ? Elle était à toi. On n'en parle plus.",
        "priorite": 45,
        "une_fois": true
      },
      {
        "id": "odile.acte3",
        "qui": "odile",
        "quand": { "acte_min": 3, "empreinte": "haute", "fait": "odile.tutoie" },
        "texte": {
          "m": "On ne défriche pas tout, petit. La terre aussi a besoin de dormir.",
          "f": "On ne défriche pas tout, petite. La terre aussi a besoin de dormir."
        },
        "priorite": 25,
        "repos_jours": 10
      },
      {
        "id": "fernand.cale",
        "qui": "fernand",
        "quand": { "fait": "fin.voisin_tranquille" },
        "texte": "Cinq heures. Pas cinq heures cinq.",
        "priorite": 30,
        "repos_jours": 7
      },
      {
        "id": "basile.bois",
        "qui": "basile",
        "quand": {},
        "texte": "Le chêne, faut lui laisser le temps. Comme aux gamins.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "basile.replante",
        "qui": "basile",
        "quand": {},
        "texte": "On coupe un arbre, on en plante deux. Le bois, ça se rend.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "basile.fils",
        "qui": "basile",
        "quand": { "sans_fait": "theo.choix" },
        "texte": "Mon fils démonte tout ce qu'il touche. Les outils, la porte, moi.",
        "priorite": 15,
        "repos_jours": 7
      },
      {
        "id": "basile.scie",
        "qui": "basile",
        "quand": { "fait": "promesse.scie_bois_joli" },
        "texte": "Les lames neuves coupent comme au premier jour. C'est toi qui les as rendues.",
        "priorite": 40,
        "une_fois": true
      },
      {
        "id": "basile.toit",
        "qui": "basile",
        "quand": { "fait": "toit.repare" },
        "texte": "Des planches sur un toit d'ici, du bon bois, bien posé. C'est les tiennes, j'imagine.",
        "priorite": 35,
        "une_fois": true
      },
      {
        "id": "basile.atelier",
        "qui": "basile",
        "quand": { "fait": "theo.atelier" },
        "texte": "La scie va deux fois plus vite. Le bois s'en fiche. Moi, je m'y fais.",
        "priorite": 20,
        "repos_jours": 6
      },
      {
        "id": "basile.theo_parti",
        "qui": "basile",
        "quand": { "fait": "theo.parti" },
        "texte": "Il écrit pas souvent. Le bois non plus, il écrit pas. Il pousse.",
        "priorite": 30,
        "repos_jours": 7
      },
      {
        "id": "theo.robot",
        "qui": "theo",
        "quand": { "fait": "theo.rencontre" },
        "texte": "T'as vu le robot de Frida ? Il fait le travail de trois personnes !",
        "priorite": 15,
        "repos_jours": 4
      },
      {
        "id": "theo.cadolon",
        "qui": "theo",
        "quand": { "fait": "theo.rencontre" },
        "texte": "À Cadolon, y a des machines partout, c'est vrai ? Même pour laver ?",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "theo.caleche",
        "qui": "theo",
        "quand": { "fait": "theo.rencontre" },
        "texte": "La roue arrière gauche de la calèche, elle grince. Je la refais en une heure, moi.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "theo.pere",
        "qui": "theo",
        "quand": { "fait": "theo.confie", "sans_fait": "theo.choix" },
        "texte": "Papa sait toujours pas. Tu lui dis pas, hein ? Enfin… tu fais comme tu veux.",
        "priorite": 40,
        "repos_jours": 3
      },
      {
        "id": "theo.apprenti",
        "qui": "theo",
        "quand": { "fait": "theo.apprenti" },
        "texte": "Le jeudi, je monte avec Achille ! Le cheval m'a pas mordu. Pas encore.",
        "priorite": 30,
        "repos_jours": 5
      },
      {
        "id": "theo.atelier",
        "qui": "theo",
        "quand": { "fait": "theo.atelier" },
        "texte": "J'ai mis un moteur sur la scie ! Papa a crié. Puis il a regardé. Longtemps.",
        "priorite": 50,
        "une_fois": true
      }
    ]
  },
  "ILE": {
    "ATELIERS": {
      "scierie": {
        "nom": "La scierie",
        "icone": "🪚",
        "hameau": "bois_joli",
        "qui": "basile",
        "sorte": "commande",
        "jours": 1,
        "max": 20,
        "recettes": { "planches": { "nom": "Scier du bois", "entrees": { "bois": 2 }, "sortie": { "planche": 3 }, "pieces": 0 } }
      },
      "ebeniste": { "nom": "L'ébéniste", "icone": "🪑", "hameau": "bois_joli", "qui": "basile", "sorte": "meubles" },
      "tissage": {
        "nom": "Le métier à tisser",
        "icone": "🧵",
        "hameau": "genets",
        "qui": "garance",
        "sorte": "commande",
        "jours": 1,
        "max": 20,
        "recettes": { "tissu": { "nom": "Tisser la laine", "entrees": { "laine": 2 }, "sortie": { "tissu": 1 }, "pieces": 0 } }
      },
      "couture": {
        "nom": "La couture",
        "icone": "🪡",
        "hameau": "genets",
        "qui": "garance",
        "sorte": "commande",
        "jours": 1,
        "max": 3,
        "recettes": {
          "gants_travail": { "nom": "Des gants de travail", "entrees": { "tissu": 1 }, "sortie": { "gants_travail": 1 }, "pieces": 8 },
          "manteau_chaud": { "nom": "Un manteau chaud", "entrees": { "tissu": 3 }, "sortie": { "manteau_chaud": 1 }, "pieces": 20 },
          "salopette": { "nom": "Une salopette", "entrees": { "tissu": 2, "lingot_fer": 1 }, "sortie": { "salopette": 1 }, "pieces": 15 }
        }
      },
      "tapis": { "nom": "Les tapis", "icone": "🧶", "hameau": "genets", "qui": "garance", "sorte": "meubles" }
    },
    "VEILLEE": { "HEURES": [19, 22], "CONFIANCE": 2 },
    "REMBOURSEMENT": { "PRIX_NIVEAUX": [0, 3000, 8000, 20000] }
  },
  "CONSERVATION": {
    "carotte": 6,
    "patate": 7,
    "tomate": 5,
    "courgette": 5,
    "aubergine": 5,
    "ble": 10,
    "oeuf": 6,
    "viande_mouton": 5,
    "pomme": 7,
    "poire": 7,
    "cerise": 3,
    "abricot": 5,
    "peche": 5,
    "truite": 2,
    "brochet": 2,
    "omble": 2,
    "dorade": 2,
    "anchois": 2,
    "sardine": 2,
    "goujon": 2,
    "saumon": 2,
    "bar": 2,
    "herbes_montagne": 3,
    "oignon": 6,
    "ail": 7,
    "poivron": 5,
    "epinard": 4,
    "fraise": 4,
    "viande_boeuf": 5,
    "viande_volaille": 4,
    "lait": 4,
    "lait_alpage": 4,
    "poisson": 2,
    "croissant": 2,
    "pizza": 2,
    "burger": 2,
    "frites": 2,
    "fromage_alpage": 10,
    "champignon": 3,
    "myrtille": 3,
    "baies": 2,
    "chataigne": 12,
    "mures": 2,
    "pain": 7,
    "fromage_frais": 8,
    "confiture_fraises": null,
    "biere_artisanale": null,
    "bocal_legumes": null
  }
};
