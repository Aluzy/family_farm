// FICHIER GÉNÉRÉ par scripts/build-data.mjs à partir de data/*.json.
// Ne pas le modifier : changer les fichiers JSON, puis lancer
//   node scripts/build-data.mjs
// (GitHub le régénère aussi à chaque mise en ligne.)
// Les valeurs sont celles des fichiers, avant les calculs du chargement (prix
// de production doublés, temps de cuisson, plats) : voir buildCatalog() dans
// js/engine/catalog.js, qui en fait DATA.
export const RAW_DATA = {
  "START": { "PIECES": 350, "DEVICE_PRICE": 0, "INVENTAIRE": { "conserve": 160, "graine_carotte": 10, "patate": 6, "graine_tomate": 4 } },
  "TIME": { "DAY_START_HOUR": 6, "SECONDS_PER_HOUR": 30, "CLOCK_SECONDS_PER_HOUR": 18, "MIN_AWAKE_S": 30, "MEAL_HOUR": 19, "NIGHT_HOUR": 22 },
  "FAMILY": {
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
      "PORTRAITS": { "adulte": { "f": "👩", "m": "👨" }, "enfant": { "f": "👧", "m": "👦" } }
    },
    "AJ": { "adulte": 50, "enfant": 25 },
    "COMPOSITION": { "MEMBRES_MIN": 1, "MEMBRES_MAX": 6, "ADULTES_MIN": 1 },
    "COMPAGNIE": { "MAX": 3, "ESPECES": { "chien": { "nom": "Chien", "icone": "🐶" }, "chat": { "nom": "Chat", "icone": "🐱" } } },
    "RESERVE_DEPART": {}
  },
  "PERSONNAGE": {
    "MAX": 100,
    "COUTS": { "labourer": 5, "planter": 3, "arroser": 2, "recolter": 4, "tondre": 8, "cuisiner": 3, "cuireFour": 3, "moudre": 1, "presser": 1 },
    "BONHEUR_REDUCTION": 50,
    "ENDURANCE": 3,
    "REVEIL_BASE": 60,
    "REVEIL_REPAS": 40,
    "MANGER_DIVISEUR": 5
  },
  "MARCHE": { "PLANCHER": { "defaut": 120, "graine": 200 }, "PAS": 10, "MULTIPLICATEUR_PRODUCTION": 2, "TRANSFORMATIONS_DOUBLEES": ["farine"] },
  "AUTONOMIE": { "HISTORIQUE_MAX": 1000, "GRAPHIQUE_NUITS": 20 },
  "HORS_LIGNE": { "MAX_S": 28800, "PAS_S": 5, "USURE": false, "ECRAN_S": 60 },
  "REVEIL": { "RECOLTE_MAX": 5 },
  "AIDE": { "ETAPES": ["eau", "potager", "dormir"] },
  "LEVEL_MAX": 5,
  "GRID": {
    "panneau": { "whParS": [40, 90, 160, 260, 400] },
    "batterie": { "wh": [6000, 15000, 30000, 60000, 100000], "pleine": 98 },
    "pompe": { "litresPerS": [1, 2, 4, 6, 10] },
    "reservoir": { "litres": [40, 80, 160, 300, 500] }
  },
  "SOLEIL": { "DEBUT": 7, "FIN": 19 },
  "UPGRADE_COST": {
    "panneau": [0, 150, 400, 900, 2000],
    "batterie": [0, 180, 450, 1000, 2200],
    "pompe": [0, 100, 250, 600, 1300],
    "reservoir": [0, 120, 300, 700, 1500]
  },
  "PUMP": { "WH_PAR_L": 10 },
  "WEAR": { "HEURES_PAR_POINT": 2, "EFFICIENCY_DIVISOR": 200, "SERVICE_THRESHOLD": 70, "BREAKDOWN": 100, "MAINTAIN_RATE": 20, "REPAIR_RATE": 50 },
  "FRIGO": { "CONSTRUCTION": 600, "BASE_WH_S": 5, "PAR_UNITE_MWH_S": 50, "BLOC_NUIT_S": 30, "SEUIL_ALIMENTE": 50, "PERTE_NUITS": 1 },
  "NUTRITION": { "AUGMENTATION": 125 },
  "items": {
    "carotte": { "nom": "Carotte", "icone": "🥕", "energie": 8, "prix": 1, "edible": true, "category": "légume" },
    "patate": { "nom": "Patate", "icone": "🥔", "energie": 19, "prix": 2, "edible": true, "category": "légume" },
    "tomate": { "nom": "Tomate", "icone": "🍅", "energie": 8, "prix": 1, "edible": true, "category": "légume" },
    "courgette": { "nom": "Courgette", "icone": "🥒", "energie": 10, "prix": 2, "edible": true, "category": "légume" },
    "aubergine": { "nom": "Aubergine", "icone": "🍆", "energie": 10, "prix": 2, "edible": true, "category": "légume" },
    "conserve": { "nom": "Conserve", "icone": "🥫", "energie": 25, "prix": 3, "edible": true, "category": "conserve", "rachetable": false },
    "graine_carotte": { "nom": "Graines de carotte", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "graine_tomate": { "nom": "Graines de tomate", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "graine_courgette": { "nom": "Graines de courgette", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "graine_aubergine": { "nom": "Graines d'aubergine", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "ble": { "nom": "Blé", "icone": "🌾", "prix": 1, "edible": false, "category": "ingrédient" },
    "graine_tournesol": { "nom": "Graines de tournesol", "icone": "🌻", "prix": 1, "edible": false, "category": "graine" },
    "oeuf": { "nom": "Œuf", "icone": "🥚", "energie": 13, "prix": 2, "edible": true, "category": "produit" },
    "viande_mouton": {
      "nom": "Viande de mouton",
      "icone": "🥩",
      "energie": 38,
      "prix": 10,
      "edible": true,
      "category": "produit",
      "rachetable": false
    },
    "pomme": { "nom": "Pomme", "icone": "🍎", "energie": 10, "prix": 2, "edible": true, "category": "fruit" },
    "poire": { "nom": "Poire", "icone": "🍐", "energie": 10, "prix": 2, "edible": true, "category": "fruit" },
    "farine": { "nom": "Farine", "icone": "🥣", "energie": 13, "prix": 1, "edible": false, "category": "ingrédient" },
    "huile": { "nom": "Huile de tournesol", "icone": "🛢️", "energie": 13, "prix": 4, "edible": false, "category": "ingrédient" },
    "laine": { "nom": "Laine", "icone": "🧶", "prix": 6, "edible": false, "category": "produit", "rachetable": false },
    "oignon": { "nom": "Oignon", "icone": "🧅", "energie": 6, "prix": 1, "edible": true, "category": "légume" },
    "graine_oignon": { "nom": "Graines d'oignon", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "ail": { "nom": "Ail", "icone": "🧄", "energie": 6, "prix": 2, "edible": true, "category": "légume" },
    "poivron": { "nom": "Poivron", "icone": "🫑", "energie": 7, "prix": 2, "edible": true, "category": "légume" },
    "graine_poivron": { "nom": "Graines de poivron", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "epinard": { "nom": "Épinard", "icone": "🥬", "energie": 5, "prix": 1, "edible": true, "category": "légume" },
    "graine_epinard": { "nom": "Graines d'épinard", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "fraise": { "nom": "Fraise", "icone": "🍓", "energie": 5, "prix": 2, "edible": true, "category": "fruit" },
    "graine_fraise": { "nom": "Graines de fraise", "icone": "🌱", "prix": 1, "edible": false, "category": "graine" },
    "riz": { "nom": "Riz", "icone": "🍚", "energie": 10, "prix": 1, "edible": true, "category": "légume" },
    "houblon": { "nom": "Houblon", "icone": "🌿", "prix": 3, "edible": false, "category": "ingrédient" },
    "cacao": { "nom": "Cacao", "icone": "🍫", "prix": 8, "edible": false, "category": "ingrédient" },
    "vanille": { "nom": "Vanille", "icone": "🫘", "prix": 15, "edible": false, "category": "ingrédient" },
    "cafe": { "nom": "Café", "icone": "☕", "prix": 6, "edible": false, "category": "ingrédient" },
    "viande_boeuf": { "nom": "Viande de bœuf", "icone": "🍖", "energie": 38, "prix": 10, "edible": true, "category": "produit", "rachetable": false },
    "viande_volaille": {
      "nom": "Viande de volaille",
      "icone": "🍗",
      "energie": 14,
      "prix": 6,
      "edible": true,
      "category": "produit",
      "rachetable": false
    },
    "lait": { "nom": "Lait", "icone": "🥛", "energie": 16, "prix": 4, "edible": true, "category": "produit" },
    "paille": { "nom": "Paille", "icone": "🪹", "prix": 1, "edible": false, "category": "produit", "rachetable": false },
    "poisson": { "nom": "Poisson", "icone": "🐟", "energie": 25, "prix": 4, "edible": true, "category": "produit", "ville": true },
    "miel": { "nom": "Miel", "icone": "🍯", "energie": 15, "prix": 4, "edible": true, "category": "produit", "ville": true },
    "fromage_alpage": { "nom": "Fromage d'alpage", "icone": "🧀", "energie": 25, "prix": 5, "edible": true, "category": "produit", "ville": true },
    "sucre": { "nom": "Sucre", "icone": "🍬", "energie": 10, "prix": 2, "edible": false, "category": "ingrédient", "ville": true },
    "epices": { "nom": "Épices", "icone": "🌶", "energie": 0, "prix": 3, "edible": false, "category": "ingrédient", "ville": true },
    "champignon": { "nom": "Champignon", "icone": "🍄", "energie": 6, "prix": 2, "edible": true, "category": "légume", "rachetable": false },
    "myrtille": { "nom": "Myrtille", "icone": "🫐", "energie": 5, "prix": 2, "edible": true, "category": "fruit", "rachetable": false },
    "chataigne": { "nom": "Châtaigne", "icone": "🌰", "energie": 13, "prix": 2, "edible": true, "category": "fruit", "rachetable": false }
  },
  "PLATS_RETIRES": {
    "ragout": { "nom": "Ragoût", "icone": "🍖", "energie": 144, "prix": 36 },
    "poivrons_farcis": { "nom": "Poivrons farcis", "icone": "🫑", "energie": 81, "prix": 26 },
    "roti_boeuf": { "nom": "Rôti de bœuf", "icone": "🥩", "energie": 144, "prix": 36 },
    "poulet_roti_ail": { "nom": "Poulet rôti à l'ail", "icone": "🍗", "energie": 75, "prix": 23 }
  },
  "CONSERVATION_CATEGORIE": { "plat": 6 },
  "ORIGINE": { "PRODUIT": "produit", "ACHETE": "acheté", "PAR_CATEGORIE": { "conserve": "acheté" } },
  "STATIONS": {
    "four": { "nom": "Four", "article": "le", "icone": "🔥", "cout": 100, "electrique": false, "debloque": ["recettes"] },
    "cuisine": { "nom": "Cuisine", "article": "la", "icone": "🍳", "cout": 150, "electrique": false, "debloque": ["recettes"] },
    "moulin": { "nom": "Moulin", "article": "le", "icone": "⚙️", "cout": 120, "electrique": true, "whParS": 20 },
    "presse": { "nom": "Presse", "article": "la", "icone": "🌻", "cout": 150, "electrique": true, "whParS": 30 }
  },
  "RECETTES": { "COEF_PLAT": 130, "ENERGIE_EAU": 0, "PRIX_EAU": 1, "DIVISEUR_TEMPS": 2, "STATIONS_TEMPS_DIVISE": ["four", "cuisine"] },
  "recipes": {
    "pain": {
      "nom": "Pain",
      "icone": "🍞",
      "station": "four",
      "temps": 20,
      "ingredients": [{ "item": "farine", "qte": 2 }],
      "eau": 1,
      "priceMultiplier": 160
    },
    "omelette": {
      "nom": "Omelette",
      "icone": "🍳",
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
      "icone": "🍲",
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
      "icone": "🥧",
      "station": "four",
      "temps": 40,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "oeuf", "qte": 2 }, { "item": "lait", "qte": 1 }, { "item": "epinard", "qte": 1 }]
    },
    "fromage_frais": { "nom": "Fromage frais", "icone": "🧀", "station": "cuisine", "temps": 60, "ingredients": [{ "item": "lait", "qte": 3 }] },
    "riz_au_lait": {
      "nom": "Riz au lait",
      "icone": "🍚",
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
      "icone": "🍓",
      "station": "cuisine",
      "temps": 30,
      "ingredients": [{ "item": "fraise", "qte": 4 }]
    },
    "chocolat_chaud": {
      "nom": "Chocolat chaud",
      "icone": "🍫",
      "station": "cuisine",
      "temps": 20,
      "ingredients": [{ "item": "cacao", "qte": 1 }, { "item": "lait", "qte": 1 }],
      "priceMultiplier": 300
    },
    "cafe_boisson": {
      "nom": "Café",
      "icone": "☕",
      "station": "cuisine",
      "temps": 10,
      "ingredients": [{ "item": "cafe", "qte": 1 }],
      "eau": 1,
      "priceMultiplier": 300
    },
    "creme_vanille": {
      "nom": "Crème à la vanille",
      "icone": "🍨",
      "station": "cuisine",
      "temps": 45,
      "ingredients": [{ "item": "vanille", "qte": 1 }, { "item": "lait", "qte": 2 }, { "item": "oeuf", "qte": 2 }],
      "priceMultiplier": 300
    },
    "biere_artisanale": {
      "nom": "Bière artisanale",
      "icone": "🍺",
      "station": "cuisine",
      "temps": 60,
      "ingredients": [{ "item": "houblon", "qte": 2 }],
      "eau": 1,
      "priceMultiplier": 300
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
      "sousProduit": { "item": "paille", "qte": 1 },
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
    "omelette_champignons": {
      "nom": "Omelette aux champignons",
      "icone": "🍄",
      "station": "cuisine",
      "temps": 15,
      "ingredients": [{ "item": "oeuf", "qte": 2 }, { "item": "champignon", "qte": 2 }]
    },
    "poisson_grille": {
      "nom": "Poisson grillé à l'ail",
      "icone": "🐟",
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
      "icone": "🌰",
      "station": "cuisine",
      "temps": 25,
      "ingredients": [{ "item": "chataigne", "qte": 4 }, { "item": "sucre", "qte": 1 }]
    },
    "tarte_myrtilles": {
      "nom": "Tarte aux myrtilles",
      "icone": "🥧",
      "station": "four",
      "temps": 30,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "myrtille", "qte": 4 }, { "item": "sucre", "qte": 1 }]
    },
    "pain_epices": {
      "nom": "Pain d'épices",
      "icone": "🍞",
      "station": "four",
      "temps": 30,
      "ingredients": [{ "item": "farine", "qte": 2 }, { "item": "miel", "qte": 1 }, { "item": "epices", "qte": 1 }]
    }
  },
  "crops": {
    "carotte": {
      "nom": "Carotte",
      "icone": "🥕",
      "lieux": ["potager"],
      "stades": 4,
      "litres": 2,
      "rendement": 10,
      "graines": { "item": "graine_carotte", "mode": "montee", "stadesSupp": 2, "quantite": 6 },
      "sprite": { "r": 1, "h": 32, "c": [0, 1, 2, 3] }
    },
    "patate": {
      "nom": "Patate",
      "icone": "🥔",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "patate", "mode": "plant" },
      "sprite": { "r": 3, "h": 32, "c": [0, 1, 2, 3] }
    },
    "tomate": {
      "nom": "Tomate",
      "icone": "🍅",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_tomate", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 9, "h": 32, "c": [9, 10, 12, 13] }
    },
    "courgette": {
      "nom": "Courgette",
      "icone": "🥒",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_courgette", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 11, "h": 16, "c": [0, 1, 3, 4] }
    },
    "aubergine": {
      "nom": "Aubergine",
      "icone": "🍆",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_aubergine", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 15, "h": 32, "c": [0, 1, 2, 3] }
    },
    "poivron": {
      "nom": "Poivron",
      "icone": "🫑",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_poivron", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 17, "h": 32, "c": [0, 1, 2, 3] }
    },
    "oignon": {
      "nom": "Oignon",
      "icone": "🧅",
      "lieux": ["potager"],
      "stades": 5,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_oignon", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 3, "h": 32, "c": [9, 10, 11, 12] }
    },
    "ail": {
      "nom": "Ail",
      "icone": "🧄",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 2,
      "rendement": 6,
      "graines": { "item": "ail", "mode": "plant" },
      "sprite": { "r": 17, "h": 32, "c": [4, 5, 6, 7] }
    },
    "epinard": {
      "nom": "Épinard",
      "icone": "🥬",
      "lieux": ["potager"],
      "stades": 3,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_epinard", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 6, "h": 16, "c": [0, 1, 2, 4] }
    },
    "fraise": {
      "nom": "Fraise",
      "icone": "🍓",
      "lieux": ["potager"],
      "stades": 4,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_fraise", "mode": "recolte", "min": 2, "max": 3 },
      "sprite": { "r": 4, "h": 16, "c": [9, 10, 12, 13] }
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
      "sprite": { "r": 6, "h": 32, "c": [9, 10, 11, 12] }
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
      "sprite": { "r": 13, "h": 32, "c": [0, 1, 2, 3] }
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
      "sprite": { "r": 6, "h": 32, "c": [9, 10, 11, 12] }
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
      "sprite": { "r": 1, "h": 32, "c": [9, 10, 11, 13] }
    },
    "cacao": {
      "nom": "Cacao",
      "icone": "🍫",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 5,
      "graines": { "item": "cacao", "mode": "plant" },
      "sprite": { "r": 15, "h": 32, "c": [4, 5, 6, 7] }
    },
    "vanille": {
      "nom": "Vanille",
      "icone": "🫘",
      "lieux": ["serre"],
      "stades": 10,
      "litres": 2,
      "rendement": 3,
      "graines": { "item": "vanille", "mode": "plant" },
      "sprite": { "r": 15, "h": 32, "c": [12, 13, 14, 15] }
    },
    "cafe": {
      "nom": "Café",
      "icone": "☕",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 6,
      "graines": { "item": "cafe", "mode": "plant" },
      "sprite": { "r": 15, "h": 32, "c": [8, 9, 10, 11] }
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
  "SERRE": { "LIEU": "serre", "CONSTRUCTION": 400, "PARCELLES": [6, 9, 12, 15, 18], "COUT": [0, 300, 600, 1000, 1800] },
  "VERGER": {
    "CONSTRUCTION": 0,
    "EMPLACEMENTS_DEPART": 2,
    "EMPLACEMENTS_MAX": 12,
    "EMPLACEMENT": { "base": 50, "croissance": 125 },
    "MATURITE": 15,
    "FRUITS": 6,
    "PERIODE": 3,
    "ARBRES": {
      "pommier": { "nom": "Pommier", "icone": "🌳", "fruit": "pomme", "prix": 40 },
      "poirier": { "nom": "Poirier", "icone": "🌳", "fruit": "poire", "prix": 40 }
    }
  },
  "SILO": { "ITEM": "ble", "CONSTRUCTION": 0, "CAPACITE": [20, 50, 100, 200, 400], "COUT": [0, 30, 80, 180, 400] },
  "POULAILLER": { "CONSTRUCTION": 40, "CAPACITE": [4, 8, 12, 16, 24], "COUT": [0, 100, 220, 450, 900] },
  "ANIMAUX": {
    "poule": { "nom": "Poule", "icone": "🐔", "prix": 15, "poulesParBle": 2, "oeufsParNuit": 1, "produit": "oeuf" },
    "mouton": { "nom": "Mouton", "icone": "🐑", "prix": 60, "pailleParNuit": 1, "joursLaine": 2, "laineParTonte": 1, "laine": "laine" },
    "vache": { "nom": "Vache", "icone": "🐄", "prix": 200, "pailleParNuit": 2, "laitParNuit": 1, "lait": "lait" }
  },
  "PATURAGE": {
    "deblocage": 150,
    "placesDepart": 10,
    "placesParMouton": 1,
    "placesParVache": 3,
    "prixPlace": 40,
    "croissance": 120,
    "nourriture": "paille"
  },
  "TECHNO": { "ONGLET": "techno", "SEUIL_PIECES": 100 },
  "techtree": {
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
      { "id": "famille", "nom": "Famille", "icone": "👨‍👩‍👧‍👦", "suivi": [] }
    ],
    "NOEUDS_RETIRES": { "cui_rotisserie": { "pt": 1, "cout": 300 }, "fa_remedes": { "pt": 1, "cout": 100 }, "fa_menus": { "pt": 1, "cout": 300 } },
    "noeuds": {
      "en_entretien": {
        "branche": "energie",
        "palier": 1,
        "nom": "Entretien préventif",
        "icone": "🔧",
        "fonction": "productivite",
        "pt": 1,
        "cout": 100,
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
        "cout": 400,
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
        "cout": 500,
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
        "cout": 600,
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
        "cout": 800,
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
        "cout": 150,
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
        "cout": 250,
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
        "cout": 900,
        "requiert": [{ "noeud": "ea_econome" }, { "batiment": "pompe", "niveau": 3 }, { "tuiles": 18 }],
        "effet": { "auto": { "arrosage": ["potager"] } },
        "description": "Chaque nuit, toutes les parcelles plantées de la Zone de culture sont arrosées automatiquement."
      },
      "ea_pompe_eco": {
        "branche": "eau",
        "palier": 3,
        "nom": "Pompe à haut rendement",
        "icone": "⛲",
        "fonction": "productivite",
        "pt": 1,
        "cout": 500,
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
        "cout": 600,
        "requiert": [{ "noeud": "ea_irrigation" }, { "construit": "serre" }],
        "effet": { "auto": { "arrosage": ["serre"] } },
        "description": "Chaque nuit, les parcelles plantées de la Serre sont arrosées automatiquement."
      },
      "ea_gestion": {
        "branche": "eau",
        "palier": 5,
        "nom": "Gestion intelligente de l'eau",
        "icone": "📟",
        "fonction": "automatisation",
        "pt": 3,
        "cout": 1500,
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
        "cout": 100,
        "requiert": [],
        "effet": { "actionsGroupees": ["arroser", "recolter"] },
        "description": "Ajoute « Arroser tout » et « Récolter tout » à la Zone de culture et à la Serre."
      },
      "cu_semences": {
        "branche": "culture",
        "palier": 2,
        "nom": "Sélection des semences",
        "icone": "🌰",
        "fonction": "productivite",
        "pt": 1,
        "cout": 200,
        "requiert": [],
        "effet": { "grainesBonus": 1 },
        "description": "Les cultures qui rendent des graines en donnent une de plus, et une carotte montée en graine en donne 8 au lieu de 6."
      },
      "cu_recolte_auto": {
        "branche": "culture",
        "palier": 3,
        "nom": "Récolte automatique",
        "icone": "🧺",
        "fonction": "automatisation",
        "pt": 2,
        "cout": 900,
        "requiert": [{ "noeud": "cu_outils" }, { "tuiles": 24 }],
        "effet": { "auto": { "recolte": ["potager"] } },
        "description": "Chaque nuit, les parcelles mûres de la Zone de culture sont récoltées automatiquement (celles montées en graine comprises, graines à la clé)."
      },
      "semis_auto": {
        "branche": "culture",
        "palier": 4,
        "nom": "Semis automatique",
        "icone": "🌾",
        "fonction": "automatisation",
        "pt": 2,
        "cout": 1200,
        "requiert": [{ "noeud": "cu_recolte_auto" }, { "noeud": "ea_irrigation" }],
        "effet": { "auto": { "semis": ["potager"] } },
        "description": "Après une récolte automatique, la parcelle est replantée avec la même culture si une graine est disponible au-delà de la réserve de semences. Réglable parcelle par parcelle. Pour que les carottes, qui ne rendent pas de graines, ne manquent jamais de semences, le jeu laisse monter en graine le nombre de carottes mûres nécessaire pour couvrir toutes les parcelles à replanter ; une parcelle qui n'a pas sa graine attend, mûre."
      },
      "cu_serre_auto": {
        "branche": "culture",
        "palier": 5,
        "nom": "Serre autonome",
        "icone": "🌿",
        "fonction": "automatisation",
        "pt": 3,
        "cout": 1500,
        "requiert": [{ "noeud": "semis_auto" }, { "noeud": "ea_serre" }],
        "effet": { "auto": { "recolte": ["serre"], "semis": ["serre"] } },
        "description": "La Serre est récoltée et replantée automatiquement chaque nuit, avec les mêmes réglages que le semis automatique."
      },
      "el_ration": {
        "branche": "elevage",
        "palier": 2,
        "nom": "Ration équilibrée",
        "icone": "🌾",
        "fonction": "productivite",
        "pt": 1,
        "cout": 200,
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
        "cout": 600,
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
        "cout": 500,
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
        "cout": 400,
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
        "cout": 300,
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
        "cout": 200,
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
        "cout": 500,
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
        "cout": 300,
        "requiert": [{ "construit": "paturage" }],
        "effet": { "recettes": ["fromage_frais", "riz_au_lait"] },
        "description": "Nouvelles recettes en Cuisine : fromage frais, riz au lait."
      },
      "prepa_2": {
        "branche": "cuisine",
        "palier": 4,
        "nom": "Préparation rapide II",
        "icone": "⏱️",
        "fonction": "temps",
        "pt": 1,
        "cout": 700,
        "requiert": [{ "noeud": "cui_serie" }],
        "effet": { "tempsPrepa": 80 },
        "description": "Encore −20 % sur les temps de préparation (64 % du temps de départ en tout)."
      },
      "cui_conserverie": {
        "branche": "cuisine",
        "palier": 4,
        "nom": "Conserverie",
        "icone": "🫙",
        "fonction": "deblocage",
        "pt": 2,
        "cout": 600,
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
        "cout": 800,
        "requiert": [{ "noeud": "cui_laiterie" }, { "construit": "serre" }],
        "effet": { "recettes": ["chocolat_chaud", "cafe_boisson", "creme_vanille", "biere_artisanale"] },
        "description": "Recettes de luxe en Cuisine : chocolat chaud, café, crème à la vanille, bière artisanale."
      },
      "reveil_1": {
        "branche": "famille",
        "palier": 1,
        "nom": "Réveil matinal I",
        "icone": "🌅",
        "fonction": "temps",
        "pt": 1,
        "cout": 200,
        "requiert": [],
        "effet": { "eveilMin": 20 },
        "description": "L'éveil minimal avant de pouvoir dormir passe de 30 s à 20 s."
      },
      "fa_sommeil": {
        "branche": "famille",
        "palier": 1,
        "nom": "Bon sommeil",
        "icone": "🛏️",
        "fonction": "productivite",
        "pt": 1,
        "cout": 100,
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
        "cout": 250,
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
        "cout": 300,
        "requiert": [{ "noeud": "fa_cellier" }],
        "effet": { "gouter": 150 },
        "description": "Ce que tu manges dans la journée rend 50 % d'énergie en plus."
      },
      "reveil_2": {
        "branche": "famille",
        "palier": 3,
        "nom": "Réveil matinal II",
        "icone": "🌅",
        "fonction": "temps",
        "pt": 1,
        "cout": 500,
        "requiert": [{ "noeud": "reveil_1" }],
        "effet": { "eveilMin": 10 },
        "description": "L'éveil minimal passe à 10 s."
      },
      "fa_routine": {
        "branche": "famille",
        "palier": 5,
        "nom": "Routine familiale",
        "icone": "🏡",
        "fonction": "automatisation",
        "pt": 3,
        "cout": 2500,
        "requiert": [{ "noeud": "reveil_2" }, { "noeud": "semis_auto" }, { "noeud": "el_mangeoire" }, { "noeud": "en_entretien_auto" }],
        "effet": { "routine": true },
        "description": "Option « Dormir tout seul » : jeu ouvert, la famille va se coucher d'elle-même dès que l'éveil minimal est écoulé."
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
      "omelette_champignons",
      "poisson_grille",
      "raclette",
      "creme_marrons",
      "tarte_myrtilles",
      "pain_epices"
    ]
  },
  "CHAPITRES": {
    "liste": [
      {
        "titre": "L'eau et le soleil",
        "icone": "💧",
        "intro": "Pompe de l'eau et range de l'énergie dans ta batterie : ce sont les deux ressources de la ferme. Tes conserves nourrissent la famille pour l'instant.",
        "objectifs": [
          { "type": "litres", "cible": 50, "libelle": "Pomper 50 L au total", "unite": "L" },
          { "type": "wh", "cible": 3000, "libelle": "Stocker 3 000 Wh dans la batterie", "unite": "Wh" }
        ]
      },
      {
        "titre": "Le premier potager",
        "icone": "🥕",
        "intro": "Plante, arrose, récolte : ta première production doit commencer à nourrir la famille.",
        "objectifs": [
          { "type": "carottes", "cible": 20, "libelle": "Récolter 20 carottes", "unite": "" },
          { "type": "autonomie", "cible": 25, "libelle": "Atteindre 25 % d'autonomie", "unite": "%" }
        ]
      },
      {
        "titre": "Le poulailler",
        "icone": "🐔",
        "intro": "Du blé pour les poules, des œufs chaque nuit. Une ponte régulière demande du blé, et la ferme doit nourrir la moitié de la famille.",
        "objectifs": [
          { "type": "pontes", "cible": 7, "libelle": "Pondre 7 nuits d'affilée", "unite": "nuits" },
          { "type": "autonomie", "cible": 50, "libelle": "Atteindre 50 % d'autonomie", "unite": "%" }
        ]
      },
      {
        "titre": "Le four et le livre de recette",
        "icone": "🍞",
        "intro": "Moudre, presser, cuire : le pain et les plats cuisinés valent plus que leurs ingrédients.",
        "objectifs": [
          { "type": "pains", "cible": 5, "recette": "pain", "libelle": "Cuire 5 pains", "unite": "" },
          { "type": "plats", "cible": 3, "exclut": ["pain"], "libelle": "Préparer 3 plats différents (hors pain)", "unite": "" }
        ]
      },
      {
        "titre": "Le troupeau",
        "icone": "🐑",
        "intro": "Des moutons pour la laine, des vaches pour le lait. Ils vivent à l'Étable et mangent chaque nuit la paille que donne le Moulin.",
        "objectifs": [
          { "type": "laines", "cible": 10, "libelle": "Tondre 10 laines", "unite": "" },
          { "type": "autonomie", "cible": 60, "libelle": "Atteindre 60 % d'autonomie", "unite": "%" }
        ]
      },
      {
        "titre": "Toute l'année",
        "icone": "📅",
        "intro": "La Serre, le Verger et le Réfrigérateur pour tenir dans la durée : dix nuits d'affilée bien nourris.",
        "objectifs": [
          {
            "type": "tenue",
            "cible": 1,
            "nuits": 10,
            "moyenne": 80,
            "libelle": "Tenir 10 nuits d'affilée à 80 % d'autonomie en moyenne",
            "unite": ""
          }
        ]
      },
      {
        "titre": "Famille autonome",
        "icone": "🏡",
        "intro": "Le dernier défi : nourrir la famille avec ce que produit la ferme, et rien d'autre.",
        "objectifs": [{ "type": "serie100", "cible": 7, "libelle": "Atteindre 100 % d'autonomie 7 nuits d'affilée", "unite": "nuits" }]
      }
    ]
  },
  "COURRIER": {
    "cousin_venezuela": {
      "quand": { "debloque": "serre" },
      "cadeaux": { "cacao": 1, "vanille": 1, "cafe": 1 },
      "icone": "✉️",
      "objet": "Une lettre du Venezuela",
      "expediteur": "Cousin Mateo",
      "lieu": "Mérida, Venezuela",
      "texte": [
        "Chère famille,",
        "La nouvelle a traversé l'océan : il paraît que vous allez avoir une serre ! Ici, dans les montagnes de Mérida, on en a parlé toute la soirée sous la véranda.",
        "Alors j'ai glissé dans l'enveloppe trois petits trésors de chez nous : une fève de cacao, une gousse de vanille et un grain de café. Dehors, chez vous, ils auraient trop froid. Mais bien à l'abri dans la serre, avec de l'eau et de la patience, ils pousseront comme ici.",
        "Un conseil de planteur : à chaque récolte, gardez toujours de quoi replanter. La vanille est la plus lente, ne vous découragez pas.",
        "Écrivez-moi le jour où vous boirez votre premier chocolat chaud. Je vous embrasse tous, et une caresse aux bêtes."
      ],
      "signature": "Votre cousin Mateo"
    }
  },
  "NIVEAUX": {
    "SEUILS": [0, 500, 1200, 3000, 7500, 20000, 40000, 80000, 180000, 400000],
    "liste": [
      { "debloque": ["carotte", "patate", "tomate"] },
      { "debloque": ["courgette", "aubergine", "oignon", "cuisine"] },
      { "debloque": ["poivron", "ail", "fraise", "ble", "silo", "poulailler"] },
      { "debloque": ["epinard", "tournesol", "riz", "moulin"] },
      { "debloque": ["houblon", "four", "paturage", "moutons"] },
      { "debloque": ["presse", "verger"] },
      { "debloque": ["cacao", "vanille", "cafe", "serre"] },
      { "debloque": ["frigo"] },
      { "debloque": [], "note": "à venir : le courrier du notaire" },
      { "debloque": [], "note": "à venir : le choix d'un commerce" }
    ],
    "ELEMENTS": {
      "silo": { "nom": "Silo", "icone": "🛖", "note": "stock de blé ; le blé ne se plante qu'une fois le Silo construit" },
      "poulailler": { "nom": "Poulailler", "icone": "🐔", "note": "poules et œufs (les poules s'achètent au Marché)" },
      "four": { "nom": "Four", "icone": "🔥", "note": "pain, gratin, tartes" },
      "cuisine": { "nom": "Cuisine", "icone": "🍳", "note": "omelette, ratatouille, compote, soupe, et le Livre de recette" },
      "moulin": {
        "nom": "Moulin",
        "icone": "⚙️",
        "note": "farine, et paille pour les moutons et les vaches ; le Champ s'ouvre avec lui : 64 cases d'herbe de plus à labourer, pour le blé"
      },
      "presse": { "nom": "Presse", "icone": "🌻", "note": "huile de tournesol" },
      "paturage": { "nom": "Étable", "icone": "🐑", "note": "des places pour les moutons et les vaches" },
      "moutons": { "nom": "Moutons et vaches", "icone": "🧶", "note": "la laine des moutons, le lait des vaches ; ils mangent la paille du Moulin" },
      "serre": { "nom": "Serre", "icone": "🏡", "note": "cacao, vanille et café, et des légumes à l'abri" },
      "verger": { "nom": "Verger", "icone": "🌳", "note": "pommiers et poiriers" },
      "frigo": { "nom": "Réfrigérateur", "icone": "🧊", "note": "conservation sans péremption" }
    },
    "XP": {
      "labourer": 10,
      "planter": 10,
      "arroser": 10,
      "recolter": 20,
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
    "TUILES": [6, 12, 20, 32, 48, 64, 64, 64, 64, 64],
    "CHAPITRES_XP": [200, 500, 1000, 2500, 2000, 4000, 8000],
    "CHAPITRE_NIVEAU": [1, 2, 3, 6, 6, 8, 8, 8]
  },
  "VILLE": {
    "BONHEUR": { "DEPART": 60, "MAX": 100, "REPAS_CRU": -3, "REPAS_PLATS": 8, "FAIM": -2 },
    "ENFANT_PRIX": 50,
    "SORTIES": {
      "parc": {
        "nom": "Parc",
        "icone": "🛝",
        "lieu": "ville",
        "heures": 2,
        "prix": 0,
        "bonheur": { "enfant": 12, "adulte": 4 },
        "enfants": true,
        "texte": "Emmener les enfants jouer au parc."
      },
      "bibliotheque": {
        "nom": "Bibliothèque",
        "icone": "📚",
        "lieu": "ville",
        "heures": 2,
        "prix": 0,
        "bonheur": { "enfant": 6, "adulte": 8 },
        "texte": "Lire, emprunter des livres."
      },
      "arcade": {
        "nom": "Salle d'arcade",
        "icone": "🕹",
        "lieu": "ville",
        "heures": 2,
        "prix": 4,
        "bonheur": { "enfant": 14, "adulte": 6 },
        "texte": "Jeux vidéo et flippers."
      },
      "cinema": {
        "nom": "Cinéma",
        "icone": "🎬",
        "lieu": "ville",
        "heures": 3,
        "prix": 8,
        "bonheur": { "enfant": 12, "adulte": 12 },
        "texte": "Un film en famille."
      },
      "amphitheatre": {
        "nom": "Amphithéâtre",
        "icone": "🎭",
        "lieu": "ville",
        "heures": 3,
        "prix": 6,
        "bonheur": { "enfant": 8, "adulte": 12 },
        "texte": "Un spectacle en plein air."
      },
      "montagne": {
        "nom": "Montagne",
        "icone": "🚆",
        "lieu": "voyage",
        "transport": "train",
        "heures": 8,
        "prix": 20,
        "bonheur": { "enfant": 20, "adulte": 20 },
        "butin": { "miel": 2, "fromage_alpage": 2 },
        "texte": "Le train jusqu'aux alpages : randonnée, miel et fromage d'alpage."
      },
      "foret": {
        "nom": "Forêt",
        "icone": "🚌",
        "lieu": "voyage",
        "transport": "bus",
        "heures": 5,
        "prix": 5,
        "bonheur": { "enfant": 15, "adulte": 15 },
        "cueillettes": [{ "champignon": 3 }, { "myrtille": 5 }, { "champignon": 2, "chataigne": 4 }],
        "texte": "Le bus jusqu'à la forêt : promenade et cueillette du jour."
      }
    },
    "MARCHE": { "HEURES": 2, "PRIX": 3 }
  },
  "SIMULATION": {
    "NUITS": 80,
    "GRAINE": 1,
    "PAS_S": 5,
    "LISSAGE": 7,
    "STRATEGIES": { "applique": { "nom": "Joueur appliqué", "eveilS": 60 }, "minimal": { "nom": "Joueur minimal", "eveilS": 30 } },
    "CAISSE": 20,
    "CONSERVES_GARDEES": 96,
    "PRIX_GRAINE_MAX": 4,
    "ETALEMENT_JOURS": 1,
    "GRAINES_CAROTTE": 6,
    "PART_PLEIN_CHAMP": 40,
    "PARCELLES_TOURNESOL": 1,
    "BLE_JOURS_GARDES": 3,
    "BLE_MAX": 40,
    "STOCK_FARINE": 4,
    "STOCK_HUILE": 2,
    "PAILLE_NUITS": 3,
    "PAILLE_MAX_NUITS": 6,
    "FARINE_MAX": 12,
    "LITRES_PARCELLE": 3,
    "LITRES_CUISINE": 6,
    "MARCHE_STATIONS": 50,
    "MARGE_EAU": 90,
    "MARGE_ENERGIE": 150,
    "MARGE_BATTERIE": 70,
    "PRIORITE": {
      "1": [],
      "2": [{ "type": "houe" }],
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
      { "type": "tech", "id": "semis_auto" },
      { "type": "tech", "id": "cui_laiterie" },
      { "type": "tech", "id": "el_tonte" },
      { "type": "arbres", "n": 4 },
      { "type": "moutons", "n": 6 },
      { "type": "poules", "n": 16 },
      { "type": "serre", "niveau": 2 },
      { "type": "serre", "niveau": 3 }
    ],
    "JALONS": [{ "nuit": 8, "pct": 35 }, { "nuit": 15, "pct": 50 }, { "nuit": 25, "pct": 75 }, { "nuit": 40, "pct": 90 }, { "nuit": 60, "pct": 100 }],
    "TOLERANCE_NUITS": 10,
    "DEPANNAGE": { "item": "carotte", "nuit": 30 }
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
    "oignon": 6,
    "ail": 7,
    "poivron": 5,
    "epinard": 4,
    "fraise": 4,
    "viande_boeuf": 5,
    "viande_volaille": 4,
    "lait": 4,
    "poisson": 2,
    "fromage_alpage": 10,
    "champignon": 3,
    "myrtille": 3,
    "chataigne": 12,
    "pain": 7,
    "fromage_frais": 8,
    "confiture_fraises": null,
    "biere_artisanale": null,
    "bocal_legumes": null
  }
};
