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
      "PERSO_DEFAUT_ENFANT": { "f": 2, "m": 1 },
      "APPARENCE": {
        "PEAU": {
          "tres_claire": "Très claire",
          "claire": "Claire",
          "rosee": "Rosée",
          "mate": "Mate",
          "olive": "Olive",
          "foncee": "Foncée",
          "tres_foncee": "Très foncée"
        },
        "YEUX": { "brun": "Bruns", "noisette": "Noisette", "vert": "Verts", "bleu": "Bleus", "violet": "Violets", "turquoise": "Turquoise" },
        "CHEVEUX": {
          "noirs": "Noirs",
          "chocolat": "Chocolat",
          "bruns": "Bruns",
          "chatains": "Châtains",
          "auburn": "Auburn",
          "roux": "Roux",
          "blonds": "Blonds",
          "platine": "Platine",
          "gris": "Gris",
          "blancs": "Blancs",
          "roses": "Roses",
          "violets": "Violets",
          "bleus": "Bleus",
          "verts": "Verts"
        },
        "COUPE": {
          "adulte": {
            "courts": "Courts",
            "frange": "Frange",
            "mi": "Mi-longs",
            "longs": "Longs",
            "carre": "Carré",
            "frange_carre": "Carré à frange",
            "couettes": "Couettes",
            "chignon": "Chignon",
            "chauve": "Dégarni"
          },
          "enfant": {
            "court": "Courts",
            "frange": "Frange",
            "long": "Longs",
            "queue": "Queue de cheval",
            "couettes": "Couettes",
            "chignon": "Chignon",
            "meche": "Mèche",
            "herisse": "Hérissés",
            "boucles": "Bouclés"
          }
        },
        "COUPE_PROPOSEE": { "enfant": ["court", "frange", "long", "queue", "couettes", "chignon"] },
        "PILOSITE": { "barbe": "Barbe", "moustache": "Moustache" },
        "SIGNES": { "rousseur": "Taches de rousseur", "joues": "Joues roses" },
        "TISSU": {
          "rouge": "Rouge",
          "orange": "Orange",
          "jaune": "Jaune",
          "vert": "Vert",
          "kaki": "Kaki",
          "turquoise": "Turquoise",
          "ciel": "Ciel",
          "jean": "Jean",
          "marine": "Marine",
          "lilas": "Lilas",
          "rose": "Rose",
          "bordeaux": "Bordeaux",
          "marron": "Marron",
          "beige": "Beige",
          "blanc": "Blanc",
          "noir": "Noir"
        },
        "MOTIF": { "rayures": "Rayures", "carreaux": "Carreaux", "pois": "Pois" },
        "BAS": { "bleu": "Bleu", "brun": "Brun", "gris": "Gris", "sombre": "Sombre", "vert": "Vert" },
        "COUVRE_CHEF": {
          "adulte": {
            "paille": "Chapeau de paille",
            "casquette": "Casquette",
            "bonnet": "Bonnet",
            "beret": "Béret",
            "bandeau": "Bandeau",
            "fleur": "Fleur"
          },
          "enfant": {
            "casquette": "Casquette",
            "bonnet": "Bonnet",
            "paille": "Chapeau de paille",
            "noeud": "Nœud",
            "serre_tete": "Serre-tête",
            "fleur": "Fleur"
          }
        },
        "ACCESSOIRE": {
          "rouge": "Rouge",
          "orange": "Orange",
          "jaune": "Jaune",
          "vert": "Vert",
          "bleu": "Bleu",
          "marine": "Marine",
          "violet": "Violet",
          "rose": "Rose",
          "brun": "Brun",
          "gris": "Gris",
          "noir": "Noir",
          "blanc": "Blanc"
        },
        "ACCESSOIRES": { "lunettes": "Lunettes", "boucles": "Boucles d'oreilles", "pansement": "Pansement" }
      }
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
    "RAMASSER": { "PAR_JOUR": 3, "ECART_H": 2, "FAIM": 2, "RAYON": 24, "SORTES": ["morceau_bois", "petite_pierre"] },
    "DEMANDE": {
      "FAIM": 2,
      "QUESTION": "Est-ce que tu veux de l'aide ?",
      "QUOI": "Dis-moi ce que je peux faire pour toi ?",
      "NON": "D'accord, je suis là si tu as besoin !",
      "CHOIX": {
        "legumes": "🥕 Ramasser les légumes",
        "arroser": "💧 Arroser",
        "recolter": "🍎 Récolter",
        "cuisiner": "🍳 Cuisiner",
        "nourrir": "🐔 Nourrir les animaux"
      },
      "OUI": {
        "legumes": "Je m'occupe de ramasser les légumes mûrs !",
        "arroser": "Je m'occupe d'arroser ce qui a soif !",
        "recolter": "Je vais cueillir les fruits des arbres !",
        "cuisiner": "Je vais préparer un bon plat à la cuisinière !",
        "nourrir": "Je vais donner du blé aux poules !"
      },
      "RIEN": {
        "legumes": "Aucun légume n'est mûr pour l'instant.",
        "arroser": "Rien n'a soif pour l'instant.",
        "recolter": "Aucun arbre n'a de fruits pour l'instant.",
        "cuisiner": "Il n'y a pas de quoi cuisiner : il manque des ingrédients.",
        "nourrir": "Il n'y a pas de poules à nourrir. Les moutons et les vaches mangent la paille de l'Étable d'eux-mêmes, la nuit."
      },
      "SANS_BLE": "Il n'y a plus de blé pour les poules.",
      "DEJA_NOURRIES": "Les poules ont déjà toutes mangé aujourd'hui.",
      "SANS_CUISINIERE": "Il n'y a pas de cuisinière : il faudrait en installer une.",
      "SANS_EAU": "Je n'ai pas d'eau pour arroser : il faudrait la citerne, ou une cruche et un puits.",
      "TARD": "Ma journée de travail est finie. Demain, si tu veux !",
      "FAIM_TEXTE": "J'ai trop faim pour travailler, il faut que je mange d'abord."
    }
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
      "broyer": 1,
      "presser": 1
    },
    "BONHEUR_REDUCTION": 50,
    "ENDURANCE": 5,
    "PLANCHER": 40,
    "REVEIL_BASE": 100,
    "REVEIL_REPAS": 0,
    "MANGER_DIVISEUR": 5,
    "MANGER_BONUS": 10,
    "SOMMEIL_HEURES": 8
  },
  "MARCHE": { "PLANCHER": { "defaut": 120, "graine": 200 }, "PAS": 10, "MULTIPLICATEUR_PRODUCTION": 2, "TRANSFORMATIONS_DOUBLEES": ["farine"] },
  "HORS_LIGNE": { "MAX_S": 28800, "PAS_S": 5, "USURE": false, "ECRAN_S": 60 },
  "PENALITES": {
    "PEREMPTION": false,
    "USURE": false,
    "BONHEUR_BAISSE": false,
    "NUIT_SANS_DORMIR": false,
    "SERIE_REMISE": false,
    "RATION_PERDUE": false
  },
  "AIDE": { "ETAPES": ["eau", "potager", "dormir"] },
  "DIDACTICIEL": {
    "GRAINES": { "graine_carotte": 6 },
    "LABOURS": 3,
    "SAC": { "objet": "sac_petit", "provisions": { "baies": 4 } },
    "ABRI": { "LARGEUR": 6, "PROFONDEUR": 3, "PORTE": 3, "MATIERE": "mur_bois", "SOL": "plancher" }
  },
  "OBJECTIFS": {
    "SEMAINE": [
      {
        "titre": "S'installer",
        "intro": "Ta famille a un toit. Au travail !",
        "offre": { "graine_carotte": 6 },
        "recompense": { "xp": 30, "pieces": 20 },
        "objectifs": [
          {
            "id": "atelier",
            "icone": "🔨",
            "libelle": "Poser l'Atelier",
            "sous": "3 pierres et 3 bois, ramassés autour de toi",
            "taches": [{ "type": "etat", "quoi": "atelier", "guide": "atelier" }]
          },
          {
            "id": "potager",
            "icone": "🌱",
            "libelle": "Préparer le potager",
            "sous": "La houe, 3 cases labourées, un semis",
            "taches": [
              { "type": "etat", "quoi": "houe", "guide": "houe" },
              { "type": "compte", "quoi": "labourer", "n": 3, "guide": "labour" },
              { "type": "compte", "quoi": "planter", "n": 1, "guide": "semis" }
            ]
          }
        ]
      },
      {
        "titre": "L'eau",
        "intro": "Tes semis ont soif.",
        "recompense": { "xp": 40, "pieces": 20 },
        "objectifs": [
          {
            "id": "eau",
            "icone": "💧",
            "libelle": "Arroser tes semis",
            "sous": "Le puits, la cruche, puis arroser",
            "taches": [
              { "type": "etat", "quoi": "puits", "guide": "puits" },
              { "type": "etat", "quoi": "cruche", "guide": "puits" },
              { "type": "compte", "quoi": "arroser", "n": 1, "guide": "arroser" }
            ]
          },
          {
            "id": "faux",
            "icone": "🌾",
            "libelle": "Faucher l'herbe haute",
            "sous": "La faux, puis 6 touffes fauchées",
            "taches": [{ "type": "etat", "quoi": "faux", "guide": "faux" }, { "type": "compte", "quoi": "faucher", "n": 6, "guide": "fibres" }]
          }
        ]
      },
      {
        "titre": "Les outils",
        "intro": "Du bois et de la pierre pour la suite.",
        "recompense": { "xp": 50, "pieces": 20, "objets": { "planche": 4 } },
        "objectifs": [
          {
            "id": "outils",
            "icone": "🪓",
            "libelle": "Fabriquer la hache et la pioche",
            "sous": "Bois, pierres et fibres",
            "taches": [{ "type": "etat", "quoi": "hache", "guide": "outils" }, { "type": "etat", "quoi": "pioche", "guide": "outils" }]
          },
          {
            "id": "arbre",
            "icone": "🌳",
            "libelle": "Abattre un arbre",
            "sous": "La hache en main, quelques coups",
            "taches": [{ "type": "compte", "quoi": "abattu", "n": 1, "guide": "couper" }]
          },
          {
            "id": "rocher",
            "icone": "🪨",
            "libelle": "Casser un rocher",
            "sous": "La pioche en main",
            "taches": [{ "type": "compte", "quoi": "casse", "n": 1, "guide": "casser" }]
          }
        ]
      },
      {
        "titre": "Le confort",
        "intro": "Une cuisine pour la famille, et des plantes bien soignées.",
        "recompense": { "xp": 50, "pieces": 30 },
        "objectifs": [
          {
            "id": "cuisiniere",
            "icone": "🍳",
            "libelle": "Poser la cuisinière dans l'abri",
            "sous": "6 pierres, 4 planches",
            "taches": [{ "type": "etat", "quoi": "cuisiniere", "guide": "cuisiniere" }]
          },
          {
            "id": "cueillir",
            "icone": "🫐",
            "libelle": "Cueillir des baies",
            "sous": "Touche un buisson qui en porte",
            "taches": [{ "type": "compte", "quoi": "cueillir", "n": 1, "guide": "cueillir" }]
          },
          {
            "id": "soigner",
            "icone": "💧",
            "libelle": "Arroser tes plantes",
            "sous": "Chaque jour, elles grandissent",
            "taches": [{ "type": "compte", "quoi": "arroser", "n": 1, "guide": "arroser" }]
          }
        ]
      },
      {
        "titre": "Le grand monde",
        "intro": "Ta ferme n'est qu'un coin du monde.",
        "offre": { "sac": 1 },
        "recompense": { "xp": 60, "pieces": 30 },
        "objectifs": [
          {
            "id": "carte",
            "icone": "🧭",
            "libelle": "Ouvrir la carte du monde",
            "taches": [{ "type": "compte", "quoi": "carte", "n": 1, "guide": "carte" }]
          },
          {
            "id": "sortie",
            "icone": "🛤",
            "libelle": "Sortir de la ferme",
            "sous": "Suis le chemin de terre vers l'est",
            "taches": [{ "type": "etat", "quoi": "sortie", "guide": "sortie" }]
          },
          {
            "id": "prise",
            "icone": "🍄",
            "libelle": "Récolter quelque chose dehors",
            "taches": [{ "type": "etat", "quoi": "prise_monde", "guide": "recolte_monde" }]
          }
        ]
      },
      {
        "titre": "La première récolte",
        "intro": "Tes carottes sont-elles mûres ?",
        "recompense": { "xp": 80, "pieces": 40 },
        "objectifs": [
          {
            "id": "recolte",
            "icone": "🥕",
            "libelle": "Récolter une culture",
            "sous": "Touche une plante mûre",
            "taches": [{ "type": "compte", "quoi": "recolter", "n": 1, "guide": "recolter" }]
          },
          {
            "id": "caleche",
            "icone": "🐴",
            "libelle": "Rencontrer la calèche",
            "sous": "Elle passe devant la ferme vers 10 h",
            "taches": [{ "type": "compte", "quoi": "caleche", "n": 1, "guide": "caleche" }]
          },
          { "id": "replanter", "icone": "🌱", "libelle": "Replanter", "taches": [{ "type": "compte", "quoi": "planter", "n": 1, "guide": "semis" }] }
        ]
      },
      {
        "titre": "Le hameau voisin",
        "intro": "Des voisins t'attendent.",
        "recompense": { "xp": 100, "pieces": 50 },
        "objectifs": [
          {
            "id": "boussole",
            "icone": "🧭",
            "libelle": "Mener la boussole au hameau",
            "sous": "Sur la carte du monde",
            "taches": [{ "type": "etat", "quoi": "boussole_hameau", "guide": "hameau_choisir" }]
          },
          { "id": "hameau", "icone": "🏘", "libelle": "Aller au hameau", "taches": [{ "type": "etat", "quoi": "hameau", "guide": "hameau_aller" }] },
          {
            "id": "parler",
            "icone": "💬",
            "libelle": "Parler à un habitant",
            "sous": "Touche-le",
            "taches": [{ "type": "compte", "quoi": "parler", "n": 1, "guide": "parler" }]
          }
        ]
      }
    ],
    "TIRES": {
      "NOMBRE": 3,
      "CHANGER": 1,
      "RECOMPENSE": { "xp": [20, 10], "pieces": [10, 5] },
      "LISTE": [
        { "id": "recolter", "icone": "🥕", "libelle": "Récolter {n} culture{s}", "quoi": "recolter", "n": [3, 1, 12], "guide": "recolter" },
        { "id": "planter", "icone": "🌱", "libelle": "Semer {n} parcelle{s}", "quoi": "planter", "n": [3, 1, 10], "si": "houe", "guide": "semis" },
        { "id": "arroser", "icone": "💧", "libelle": "Arroser {n} plante{s}", "quoi": "arroser", "n": [3, 1, 12], "si": "puits", "guide": "arroser" },
        { "id": "labourer", "icone": "🌾", "libelle": "Labourer {n} case{s}", "quoi": "labourer", "n": [3, 1, 8], "si": "houe", "guide": "labour" },
        {
          "id": "faucher",
          "icone": "🌾",
          "libelle": "Faucher {n} touffe{s} d'herbe haute",
          "quoi": "faucher",
          "n": [6, 2, 20],
          "si": "faux",
          "guide": "fibres"
        },
        { "id": "abattre", "icone": "🌳", "libelle": "Abattre {n} arbre{s}", "quoi": "abattu", "n": [1, 0.25, 4], "si": "hache", "guide": "couper" },
        { "id": "casser", "icone": "🪨", "libelle": "Casser {n} rocher{s}", "quoi": "casse", "n": [1, 0.25, 4], "si": "pioche", "guide": "casser" },
        { "id": "cueillir", "icone": "🫐", "libelle": "Cueillir {n} fois", "quoi": "cueillir", "n": [2, 0.5, 6], "guide": "cueillir" },
        {
          "id": "cuisiner",
          "icone": "🍳",
          "libelle": "Préparer {n} plat{s}",
          "quoi": "cuisiner",
          "n": [1, 0.25, 4],
          "si": "cuisiniere",
          "guide": "cuisiner"
        },
        {
          "id": "vendre",
          "icone": "💰",
          "libelle": "Gagner {n} pièce{s} à la calèche",
          "quoi": "vendre",
          "n": [20, 10, 300],
          "si": "marche",
          "guide": "caleche"
        },
        { "id": "pecher", "icone": "🐟", "libelle": "Pêcher {n} poisson{s}", "quoi": "pecher", "n": [1, 0.25, 5], "si": "canne", "guide": "pecher" },
        { "id": "oeufs", "icone": "🥚", "libelle": "Ramasser les œufs {n} fois", "quoi": "oeuf", "n": [1, 0, 1], "si": "poules", "guide": "oeufs" },
        { "id": "lait", "icone": "🥛", "libelle": "Traire les vaches {n} fois", "quoi": "lait", "n": [1, 0, 1], "si": "vaches", "guide": "lait" },
        {
          "id": "parler",
          "icone": "💬",
          "libelle": "Parler à {n} habitant{s}",
          "quoi": "parler",
          "n": [1, 0.25, 4],
          "si": "hameau",
          "guide": "parler"
        }
      ]
    }
  },
  "BONHEUR": {
    "DEPART": 60,
    "MAX": 100,
    "DECLIN": -5,
    "PLATS": { "cuisine": 3, "four": 5 },
    "HUILE_FRUIT": 2,
    "SPECIALES": { "objets": ["cacao", "cafe", "vanille"], "bonus": 4 },
    "PLATS_MAX": 3,
    "FAIM": -2,
    "BULLE": 5,
    "CIBLE": { "BASE": 40, "VITESSE": 25, "MEUBLES_MAX": 30, "FAIM": 0, "VARIETE": { "4": 4, "6": 8 } }
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
    "plant_vigne": { "nom": "Plant de vigne", "icone": "🌱‍🍇", "prix": 6, "mangeable": false, "categorie": "graine" },
    "graine_coquelicot": {
      "nom": "Graines de coquelicot",
      "icone": "🌱‍🌺",
      "prix": 1,
      "mangeable": false,
      "categorie": "graine",
      "rachetable": false
    },
    "graine_pavot": {
      "nom": "Graines de pavot de Californie",
      "icone": "🌱‍🏵",
      "prix": 1,
      "mangeable": false,
      "categorie": "graine",
      "rachetable": false
    },
    "graine_myosotis": { "nom": "Graines de myosotis", "icone": "🌱‍💠", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "graine_lavande": { "nom": "Graines de lavande", "icone": "🌱‍🪻", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "graine_lupin": { "nom": "Graines de lupin", "icone": "🌱‍💮", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
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
    "barriere": { "nom": "Barrière", "icone": "🚧‍🟫", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere_blanche": { "nom": "Barrière blanche", "icone": "🚧‍⬜", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere_rouge": { "nom": "Barrière rouge", "icone": "🚧‍🟥", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere_grise": { "nom": "Barrière grise", "icone": "🚧‍⬛", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere_chene": {
      "nom": "Barrière en chêne sombre",
      "icone": "🚧‍🟤",
      "prix": 3,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "barriere_verte": { "nom": "Barrière verte", "icone": "🚧‍🟩", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "barriere_lavande": { "nom": "Barrière lavande", "icone": "🚧‍🟪", "prix": 3, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "portail": { "nom": "Portail", "icone": "🚧‍🚪", "prix": 6, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "chemin": { "nom": "Chemin", "icone": "🟫‍🪨", "prix": 1, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "sol_pas_ardoise": {
      "nom": "Pas japonais en ardoise",
      "icone": "👣‍⬛",
      "prix": 2,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "sol_pas_pierre": {
      "nom": "Pas japonais en pierre",
      "icone": "👣‍🪨",
      "prix": 2,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
    },
    "sol_pas_bois": { "nom": "Pas japonais en bois", "icone": "👣‍🪵", "prix": 2, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "champignon_lumineux": {
      "nom": "Champignon lumineux",
      "icone": "🍄‍✨",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false
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
      "nom": "Bac à fleurs (ancien)",
      "icone": "🪴‍🌷",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "retire": true
    },
    "table_jardin": {
      "nom": "Table de jardin",
      "icone": "🍽️",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "chaise_jardin": {
      "nom": "Chaise de jardin",
      "icone": "🪑",
      "prix": 15,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "banc_jardin": {
      "nom": "Banc de jardin",
      "icone": "🛋️",
      "prix": 25,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "banc_rondins": {
      "nom": "Banc en rondins",
      "icone": "🪵",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "table_rondins": {
      "nom": "Table en rondins",
      "icone": "🪵",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "chaise_peinte": {
      "nom": "Chaise peinte",
      "icone": "🪑",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "jarre_coquillages": {
      "nom": "Jarre aux coquillages",
      "icone": "🏺",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "lanterne_papier": {
      "nom": "Lanterne de papier",
      "icone": "🏮",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "bassin_nenuphars": {
      "nom": "Bassin aux nénuphars (ancien)",
      "icone": "🪷",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "retire": true
    },
    "bassin": { "nom": "Bassin", "icone": "🪷‍🧱", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false, "invendable": true },
    "banc_pierre": {
      "nom": "Banc de pierre",
      "icone": "🪨",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "jardiniere_pierre": {
      "nom": "Jardinière de pierre",
      "icone": "🪴",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "rosier_multicolore": {
      "nom": "Rosier grimpant multicolore",
      "icone": "🌹",
      "prix": 25,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "rosier_rouge": {
      "nom": "Rosier grimpant rouge",
      "icone": "🌹",
      "prix": 25,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "rosier_blanc": {
      "nom": "Rosier grimpant blanc",
      "icone": "🌹",
      "prix": 25,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "rosier_jaune": {
      "nom": "Rosier grimpant jaune",
      "icone": "🌹",
      "prix": 25,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "papier_peint_fleurettes": {
      "nom": "Papier peint fleurettes",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "fleurettes"
    },
    "papier_peint_rayures": {
      "nom": "Papier peint rayures",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "rayures"
    },
    "papier_peint_vichy": {
      "nom": "Papier peint carreaux vichy",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "vichy"
    },
    "papier_peint_damas": {
      "nom": "Papier peint damas",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "damas"
    },
    "papier_peint_feuillages": {
      "nom": "Papier peint feuillages",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "feuillages"
    },
    "papier_peint_etoiles": {
      "nom": "Papier peint étoiles",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "etoiles"
    },
    "guirlande_blanche": {
      "nom": "Guirlande lumineuse blanche",
      "icone": "✨",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 8
    },
    "guirlande_multicolore": {
      "nom": "Guirlande lumineuse multicolore",
      "icone": "🎆",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 8
    },
    "guirlande_etoiles": {
      "nom": "Guirlande d'étoiles",
      "icone": "⭐",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 8
    },
    "guirlande_coeurs": {
      "nom": "Guirlande de cœurs",
      "icone": "💖",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 8
    },
    "cheminee_pierre": {
      "nom": "Cheminée en pierre",
      "icone": "🔥",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "cheminee_briques": {
      "nom": "Cheminée en briques",
      "icone": "🔥",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "cheminee_marbre": {
      "nom": "Cheminée en marbre",
      "icone": "🔥",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fontaine_pierre": {
      "nom": "Fontaine en pierre",
      "icone": "⛲",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fontaine_marbre": {
      "nom": "Fontaine en marbre",
      "icone": "⛲",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fontaine_grenouille": {
      "nom": "Fontaine à la grenouille",
      "icone": "⛲",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fontaine_angelot": {
      "nom": "Fontaine à l'angelot",
      "icone": "⛲",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "ornement_cerisier_japon": {
      "nom": "Cerisier du Japon",
      "icone": "🌳",
      "prix": 90,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "ornement_erable_rouge": {
      "nom": "Érable rouge",
      "icone": "🌳",
      "prix": 90,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "ornement_magnolia": {
      "nom": "Magnolia",
      "icone": "🌳",
      "prix": 90,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "ornement_saule_pleureur": {
      "nom": "Saule pleureur",
      "icone": "🌳",
      "prix": 90,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "enseigne_bois": {
      "nom": "Enseigne de ferme en bois gravé",
      "icone": "🪧",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "avec": "boite_lettres_bois"
    },
    "boite_lettres_bois": {
      "nom": "Boîte aux lettres en bois",
      "icone": "📮",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "enseigne_email": {
      "nom": "Enseigne de ferme émaillée",
      "icone": "🪧",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "avec": "boite_lettres_email"
    },
    "boite_lettres_email": {
      "nom": "Boîte aux lettres émaillée",
      "icone": "📮",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "enseigne_fer": {
      "nom": "Enseigne de ferme en fer forgé",
      "icone": "🪧",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "avec": "boite_lettres_fer"
    },
    "boite_lettres_fer": {
      "nom": "Boîte aux lettres en fer forgé",
      "icone": "📮",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "chalet_lit": {
      "nom": "Lit de chalet",
      "icone": "🛏️",
      "prix": 80,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "chalet_chevet": {
      "nom": "Chevet de chalet",
      "icone": "🛋️",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "chalet_tapis": {
      "nom": "Tapis alpin",
      "icone": "🧶",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "chalet_tableau": {
      "nom": "Tableau : le sommet enneigé",
      "icone": "🏔️",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "sol_meleze": {
      "nom": "Plancher de mélèze",
      "icone": "🪵",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 24
    },
    "papier_peint_lambris": {
      "nom": "Papier peint lambris de pin",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "lambris"
    },
    "ensemble_chalet": {
      "nom": "Ensemble chalet de montagne",
      "icone": "🏔️",
      "prix": 220,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "contenu": { "chalet_lit": 1, "chalet_chevet": 1, "chalet_tapis": 1, "chalet_tableau": 1, "sol_meleze": 24, "papier_peint_lambris": 1 }
    },
    "cottage_lit": {
      "nom": "Lit de cottage",
      "icone": "🛏️",
      "prix": 80,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "cottage_chevet": {
      "nom": "Chevet de cottage",
      "icone": "🛋️",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "cottage_tapis": {
      "nom": "Tapis aux roses",
      "icone": "🧶",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "cottage_tableau": {
      "nom": "Tableau : le jardin du cottage",
      "icone": "🖼️",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "sol_blanchi": {
      "nom": "Plancher blanchi",
      "icone": "🤍",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 24
    },
    "papier_peint_roses": {
      "nom": "Papier peint roses anglaises",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "roses"
    },
    "ensemble_cottage": {
      "nom": "Ensemble cottage anglais",
      "icone": "🌹",
      "prix": 220,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "contenu": { "cottage_lit": 1, "cottage_chevet": 1, "cottage_tapis": 1, "cottage_tableau": 1, "sol_blanchi": 24, "papier_peint_roses": 1 }
    },
    "mer_lit": {
      "nom": "Lit de bord de mer",
      "icone": "🛏️",
      "prix": 80,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "mer_chevet": {
      "nom": "Chevet de bord de mer",
      "icone": "🛋️",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "mer_tapis": {
      "nom": "Tapis de jute",
      "icone": "🧶",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "mer_tableau": {
      "nom": "Tableau : le phare",
      "icone": "🗼",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "sol_flotte": {
      "nom": "Plancher flotté",
      "icone": "🌊",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 24
    },
    "papier_peint_vagues": {
      "nom": "Papier peint vagues",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "vagues"
    },
    "ensemble_mer": {
      "nom": "Ensemble bord de mer",
      "icone": "🐚",
      "prix": 220,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "contenu": { "mer_lit": 1, "mer_chevet": 1, "mer_tapis": 1, "mer_tableau": 1, "sol_flotte": 24, "papier_peint_vagues": 1 }
    },
    "fee_lit": {
      "nom": "Lit féerique",
      "icone": "🛏️",
      "prix": 80,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fee_chevet": {
      "nom": "Chevet féerique",
      "icone": "🍄",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fee_tapis": {
      "nom": "Tapis arc-en-ciel",
      "icone": "🌈",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "fee_tableau": {
      "nom": "Tableau : la licorne",
      "icone": "🦄",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "sol_pastel": {
      "nom": "Parquet pastel",
      "icone": "🍬",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "lot": 24
    },
    "papier_peint_nuages": {
      "nom": "Papier peint nuages et étoiles",
      "icone": "🧻",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "papier": "nuages"
    },
    "ensemble_fee": {
      "nom": "Ensemble chambre d'enfant féerique",
      "icone": "🧚",
      "prix": 220,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true,
      "contenu": { "fee_lit": 1, "fee_chevet": 1, "fee_tapis": 1, "fee_tableau": 1, "sol_pastel": 24, "papier_peint_nuages": 1 }
    },
    "sapin_noel": {
      "nom": "Sapin de Noël",
      "icone": "🎄",
      "prix": 120,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "couronne_noel": {
      "nom": "Couronne de Noël",
      "icone": "🎀",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "bonhomme_neige": {
      "nom": "Bonhomme de neige",
      "icone": "⛄",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "citrouille_halloween": {
      "nom": "Citrouille sculptée",
      "icone": "🎃",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "tas_citrouilles": {
      "nom": "Tas de citrouilles",
      "icone": "🎃",
      "prix": 70,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "panier_oeufs": {
      "nom": "Panier d'œufs peints",
      "icone": "🧺",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "oeuf_geant": {
      "nom": "Œuf de Pâques géant",
      "icone": "🥚",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "boutique": true
    },
    "pergola": {
      "nom": "Pergola fleurie",
      "icone": "🌸",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "bac_lavande": {
      "nom": "Bac de lavande",
      "icone": "🪻",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "retire": true
    },
    "bac_carre": {
      "nom": "Bac carré",
      "icone": "🪴‍🟫",
      "prix": 60,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "bac_rond": {
      "nom": "Bac rond",
      "icone": "🪴‍⭕",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true
    },
    "bac_long": {
      "nom": "Bac long",
      "icone": "🪴‍➖",
      "prix": 90,
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
    "boite_aux_lettres": {
      "nom": "Boîte aux lettres",
      "icone": "📫",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "pont_planches": {
      "nom": "Pont de planches",
      "icone": "🌉",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "etal": { "nom": "Étal", "icone": "🛒", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "panneau_village": {
      "nom": "Panneau du village",
      "icone": "🪧",
      "prix": 4,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "quai_chargement": {
      "nom": "Quai de chargement",
      "icone": "🏗️",
      "prix": 30,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "enclume_foyer": {
      "nom": "Enclume et foyer",
      "icone": "⚒️",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "comptoir": { "nom": "Comptoir", "icone": "🏪", "prix": 24, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "enseigne_forge": {
      "nom": "Enseigne du forgeron",
      "icone": "🪧",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "scie_long": {
      "nom": "Scie de long et établi",
      "icone": "🪚",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "four_boulanger": {
      "nom": "Four à bois et étal à pains",
      "icone": "🥖",
      "prix": 40,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "cave_affinage": {
      "nom": "Cave d'affinage",
      "icone": "🧀",
      "prix": 50,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "enseigne_scierie": {
      "nom": "Enseigne du menuisier",
      "icone": "🪧",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "enseigne_boulangerie": {
      "nom": "Enseigne du boulanger",
      "icone": "🪧",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "enseigne_fromagerie": {
      "nom": "Enseigne du fromager",
      "icone": "🪧",
      "prix": 20,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "village": true
    },
    "faisselle": {
      "nom": "Faisselle",
      "icone": "🫙",
      "energie": 40,
      "prix": 22,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 3,
      "rachetable": false,
      "village": true
    },
    "tomme_cave": {
      "nom": "Tomme de cave",
      "icone": "🧀",
      "energie": 90,
      "prix": 66,
      "mangeable": true,
      "categorie": "produit",
      "bonheur": 5,
      "rachetable": false,
      "village": true
    },
    "clous": { "nom": "Clous", "icone": "📌", "prix": 5, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "charniere": { "nom": "Charnière", "icone": "🔗", "prix": 10, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "lame": { "nom": "Lame d'outil", "icone": "🔪", "prix": 22, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "brouette": { "nom": "Brouette", "icone": "🛒", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "charrette": { "nom": "Charrette", "icone": "🛞", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false, "village": true },
    "lavoir": {
      "nom": "Lavoir",
      "icone": "🧺",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "village": true
    },
    "kiosque": {
      "nom": "Kiosque",
      "icone": "🎶",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "village": true
    },
    "fontaine_village": {
      "nom": "Fontaine du village",
      "icone": "⛲",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "village": true
    },
    "four_commun": {
      "nom": "Four commun",
      "icone": "🔥",
      "prix": 0,
      "mangeable": false,
      "categorie": "matériau",
      "rachetable": false,
      "invendable": true,
      "village": true
    },
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
    "mortier": { "nom": "Mortier et pilon", "icone": "⚱", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
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
    "reservoir": { "nom": "Réservoir", "icone": "🛢️", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "pressoir": { "nom": "Presse", "icone": "🗜️", "prix": 18, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "centrifugeuse": { "nom": "Centrifugeuse", "icone": "🌀", "prix": 24, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "mixeur": { "nom": "Mixeur", "icone": "🥤", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "chaudron": { "nom": "Chaudron", "icone": "🍲", "prix": 22, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "tonneau": { "nom": "Tonneau", "icone": "🛢️‍🍺", "prix": 14, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "ensacheuse": { "nom": "Ensacheuse", "icone": "🫙‍⚙️", "prix": 16, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "tonnelet": { "nom": "Tonnelet", "icone": "🛢️‍🧀", "prix": 12, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "bac_compost": { "nom": "Bac à compost", "icone": "🪵‍🍂", "prix": 8, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "engrais": { "nom": "Engrais", "icone": "🟫‍✨", "prix": 5, "mangeable": false, "categorie": "matériau", "comptoir": true },
    "pomme_de_pin": { "nom": "Pomme de pin", "icone": "🌲‍🟤", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "gland": { "nom": "Gland", "icone": "🌳‍🟤", "prix": 1, "mangeable": false, "categorie": "graine", "rachetable": false },
    "jeune_pommier": { "nom": "Jeune pommier", "icone": "🌱‍🍎", "prix": 40, "mangeable": false, "categorie": "graine", "arbre": "pommier" },
    "jeune_poirier": { "nom": "Jeune poirier", "icone": "🌱‍🍐", "prix": 40, "mangeable": false, "categorie": "graine", "arbre": "poirier" },
    "jeune_cerisier": { "nom": "Jeune cerisier", "icone": "🌱‍🍒", "prix": 50, "mangeable": false, "categorie": "graine", "arbre": "cerisier" },
    "jeune_abricotier": { "nom": "Jeune abricotier", "icone": "🌱‍🟠", "prix": 45, "mangeable": false, "categorie": "graine", "arbre": "abricotier" },
    "jeune_pecher": { "nom": "Jeune pêcher", "icone": "🌱‍🍑", "prix": 45, "mangeable": false, "categorie": "graine", "arbre": "pecher" },
    "puits_pierre": { "nom": "Puits de pierre", "icone": "🪣‍🧱", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "pompe": { "nom": "Pompe", "icone": "⛲‍🔧", "prix": 30, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "panneau_solaire": { "nom": "Panneau solaire", "icone": "☀‍🟦", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "citerne": { "nom": "Citerne", "icone": "💧‍🛢", "prix": 25, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "batterie": { "nom": "Batterie", "icone": "🔋‍🔩", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "escalier": { "nom": "Escalier", "icone": "🪜", "prix": 20, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "station_robot": { "nom": "Station du robot", "icone": "🔌‍🤖", "prix": 40, "mangeable": false, "categorie": "matériau", "rachetable": false },
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
    "pomme_doree": {
      "nom": "Pomme dorée",
      "icone": "🍎‍✨",
      "prix": 200,
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
    "raisin": { "nom": "Raisin", "icone": "🍇", "energie": 6, "prix": 3, "mangeable": true, "categorie": "fruit" },
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
    "tomme_alpage": { "nom": "Tomme d'alpage", "icone": "🧀‍⚪", "prix": 36, "mangeable": false, "categorie": "produit", "rachetable": false },
    "mout_houblon": { "nom": "Moût de houblon", "icone": "🍺‍🟤", "prix": 13, "mangeable": false, "categorie": "produit", "rachetable": false },
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
    "fleur_coquelicot": { "nom": "Coquelicot", "icone": "🌺", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fleur_pavot": { "nom": "Pavot de Californie", "icone": "🏵", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fleur_tournesol": { "nom": "Tournesol", "icone": "🌻", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fleur_myosotis": { "nom": "Myosotis", "icone": "💠", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fleur_lavande": { "nom": "Lavande", "icone": "🪻", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "fleur_lupin": { "nom": "Lupin", "icone": "💮", "prix": 1, "mangeable": false, "categorie": "produit", "rachetable": false },
    "colorant_rouge": { "nom": "Colorant rouge", "icone": "🔴", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "colorant_orange": { "nom": "Colorant orange", "icone": "🟠", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "colorant_jaune": { "nom": "Colorant jaune", "icone": "🟡", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "colorant_vert": { "nom": "Colorant vert", "icone": "🟢", "prix": 7, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "colorant_bleu": { "nom": "Colorant bleu", "icone": "🔵", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
    "colorant_violet": { "nom": "Colorant violet", "icone": "🟣", "prix": 4, "mangeable": false, "categorie": "matériau", "rachetable": false },
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
      "planche": { "entrees": { "bois": 2 }, "sortie": { "planche": 1 }, "coefPrix": 145 },
      "mur_pierre": { "entrees": { "pierre": 4 }, "sortie": { "mur_pierre": 1 }, "coefPrix": 135 },
      "mur_fenetre": { "entrees": { "pierre": 3, "planche": 1 }, "sortie": { "mur_fenetre": 1 }, "coefPrix": 145 },
      "fenetre_ronde": { "entrees": { "pierre": 2, "planche": 1 }, "sortie": { "fenetre_ronde": 1 }, "coefPrix": 145 },
      "fenetre_cintree": { "entrees": { "pierre": 3, "planche": 2 }, "sortie": { "fenetre_cintree": 1 }, "coefPrix": 145 },
      "fenetre_volets": { "entrees": { "planche": 3, "pierre": 1, "colorant_vert": 1 }, "sortie": { "fenetre_volets": 1 }, "coefPrix": 150 },
      "fenetre_vitrail": {
        "entrees": { "pierre": 3, "lingot_cuivre": 1, "colorant_bleu": 1, "colorant_jaune": 1 },
        "sortie": { "fenetre_vitrail": 1 },
        "coefPrix": 150
      },
      "pierre_angle": { "entrees": { "pierre": 5 }, "sortie": { "pierre_angle": 1 }, "coefPrix": 135 },
      "mur_brique_rouge": { "entrees": { "pierre": 3, "colorant_rouge": 1 }, "sortie": { "mur_brique_rouge": 1 }, "coefPrix": 145 },
      "mur_brique_orange": { "entrees": { "pierre": 3, "colorant_orange": 1 }, "sortie": { "mur_brique_orange": 1 }, "coefPrix": 145 },
      "mur_brique_ocre": { "entrees": { "pierre": 3, "colorant_jaune": 1 }, "sortie": { "mur_brique_ocre": 1 }, "coefPrix": 145 },
      "mur_brique_bleue": { "entrees": { "pierre": 3, "colorant_bleu": 1 }, "sortie": { "mur_brique_bleue": 1 }, "coefPrix": 145 },
      "mur_pierre_taille": { "entrees": { "pierre": 5 }, "sortie": { "mur_pierre_taille": 1 }, "coefPrix": 135 },
      "mur_bois": { "entrees": { "bois": 2 }, "sortie": { "mur_bois": 1 }, "coefPrix": 145 },
      "cruche": { "entrees": { "bois": 3 }, "sortie": { "cruche": 1 }, "coefPrix": 135 },
      "paroi_vitree": { "entrees": { "pierre": 2, "lingot_fer": 1 }, "sortie": { "paroi_vitree": 1 }, "coefPrix": 145 },
      "porte": { "entrees": { "planche": 3 }, "sortie": { "porte": 1 }, "coefPrix": 135 },
      "plancher": { "entrees": { "bois": 2 }, "sortie": { "plancher": 1 }, "coefPrix": 145 },
      "porte_chene": { "entrees": { "planche": 4 }, "sortie": { "porte_chene": 1 }, "coefPrix": 135 },
      "porte_vitree": { "entrees": { "planche": 2, "lingot_fer": 1 }, "sortie": { "porte_vitree": 1 }, "coefPrix": 145 },
      "porte_grange": { "entrees": { "planche": 3, "bois": 1 }, "sortie": { "porte_grange": 1 }, "coefPrix": 145 },
      "porte_bleue": { "entrees": { "planche": 3, "colorant_bleu": 1 }, "sortie": { "porte_bleue": 1 }, "coefPrix": 145 },
      "porte_fer": { "entrees": { "lingot_fer": 2, "planche": 1 }, "sortie": { "porte_fer": 1 }, "coefPrix": 145 },
      "porte_ecurie": { "entrees": { "planche": 4, "fibre": 1 }, "sortie": { "porte_ecurie": 1 }, "coefPrix": 145 },
      "porte_blanche": { "entrees": { "planche": 3, "pierre": 1 }, "sortie": { "porte_blanche": 1 }, "coefPrix": 145 },
      "sol_dalles": { "entrees": { "pierre": 2 }, "sortie": { "sol_dalles": 1 }, "coefPrix": 135 },
      "sol_carrelage": { "entrees": { "pierre": 2, "bois": 1 }, "sortie": { "sol_carrelage": 2 }, "coefPrix": 145 },
      "sol_tomettes": { "entrees": { "pierre": 1, "bois": 1 }, "sortie": { "sol_tomettes": 1 }, "coefPrix": 145 },
      "sol_chevrons": { "entrees": { "bois": 3 }, "sortie": { "sol_chevrons": 1 }, "coefPrix": 135 },
      "sol_marbre": { "entrees": { "pierre": 4 }, "sortie": { "sol_marbre": 1 }, "coefPrix": 135 },
      "sol_paves": { "entrees": { "pierre": 2 }, "sortie": { "sol_paves": 2 }, "coefPrix": 135 },
      "sol_mosaique": { "entrees": { "pierre": 3, "lingot_cuivre": 1 }, "sortie": { "sol_mosaique": 2 }, "coefPrix": 145 },
      "barriere": { "entrees": { "planche": 1 }, "sortie": { "barriere": 2 }, "coefPrix": 135 },
      "barriere_blanche": { "entrees": { "planche": 1 }, "sortie": { "barriere_blanche": 2 }, "coefPrix": 135 },
      "barriere_rouge": { "entrees": { "planche": 1 }, "sortie": { "barriere_rouge": 2 }, "coefPrix": 135 },
      "barriere_grise": { "entrees": { "planche": 1 }, "sortie": { "barriere_grise": 2 }, "coefPrix": 135 },
      "barriere_chene": { "entrees": { "planche": 1 }, "sortie": { "barriere_chene": 2 }, "coefPrix": 135 },
      "barriere_verte": { "entrees": { "planche": 1 }, "sortie": { "barriere_verte": 2 }, "coefPrix": 135 },
      "barriere_lavande": { "entrees": { "planche": 1 }, "sortie": { "barriere_lavande": 2 }, "coefPrix": 135 },
      "portail": { "entrees": { "planche": 2 }, "sortie": { "portail": 1 }, "coefPrix": 135 },
      "chemin": { "entrees": { "pierre": 1 }, "sortie": { "chemin": 2 }, "coefPrix": 135 },
      "sol_pas_ardoise": { "entrees": { "pierre": 2 }, "sortie": { "sol_pas_ardoise": 2 }, "coefPrix": 135 },
      "sol_pas_pierre": { "entrees": { "pierre": 2 }, "sortie": { "sol_pas_pierre": 2 }, "coefPrix": 135 },
      "sol_pas_bois": { "entrees": { "bois": 2 }, "sortie": { "sol_pas_bois": 2 }, "coefPrix": 135 },
      "lanterne": { "entrees": { "champignon_lumineux": 1, "bois": 2 }, "sortie": { "lanterne": 1 }, "coefPrix": 145 },
      "candelabre": { "entrees": { "lingot_fer": 2, "pierre": 1, "huile": 1, "fibre": 1 }, "sortie": { "candelabre": 1 }, "coefPrix": 150 },
      "paillasse": { "entrees": { "fibre": 2 }, "sortie": { "paillasse": 1 }, "coefPrix": 135 },
      "boite_nourriture": { "entrees": { "planche": 3 }, "sortie": { "boite_nourriture": 1 }, "coefPrix": 135 },
      "boite_aux_lettres": { "entrees": { "planche": 2, "bois": 1 }, "sortie": { "boite_aux_lettres": 1 }, "village": true, "coefPrix": 145 },
      "pont_planches": { "entrees": { "planche": 3, "bois": 2 }, "sortie": { "pont_planches": 2 }, "village": true, "coefPrix": 145 },
      "etal": { "entrees": { "planche": 4, "fibre": 3 }, "sortie": { "etal": 1 }, "village": true, "coefPrix": 145 },
      "brouette": { "entrees": { "planche": 4, "lingot_fer": 1, "bois": 2 }, "sortie": { "brouette": 1 }, "village": true, "coefPrix": 150 },
      "charrette": {
        "entrees": { "planche": 10, "lingot_fer": 3, "bois": 6, "corde": 2 },
        "sortie": { "charrette": 1 },
        "village": true,
        "debloque": "ecurie",
        "coefPrix": 150
      },
      "four_pierre": { "entrees": { "pierre": 8, "planche": 2 }, "sortie": { "four_pierre": 1 }, "coefPrix": 145 },
      "cuisiniere": { "entrees": { "pierre": 6, "planche": 4 }, "sortie": { "cuisiniere": 1 }, "coefPrix": 145 },
      "mortier": { "entrees": { "pierre": 4, "planche": 1 }, "sortie": { "mortier": 1 }, "coefPrix": 145 },
      "puits_pierre": { "entrees": { "pierre": 8, "planche": 2 }, "sortie": { "puits_pierre": 1 }, "coefPrix": 145 },
      "nichoir": { "entrees": { "planche": 4, "fibre": 3 }, "sortie": { "nichoir": 1 }, "coefPrix": 145 },
      "mangeoire": { "entrees": { "planche": 6, "pierre": 4, "fibre": 2 }, "sortie": { "mangeoire": 1 }, "coefPrix": 150 },
      "ratelier": { "entrees": { "planche": 4, "fibre": 2 }, "sortie": { "ratelier": 1 }, "debloque": "ecurie", "coefPrix": 145 },
      "corde": { "entrees": { "fibre": 3 }, "sortie": { "corde": 1 }, "debloque": "ecurie", "coefPrix": 135 },
      "poteau_attache": { "entrees": { "bois": 2 }, "sortie": { "poteau_attache": 1 }, "debloque": "ecurie", "coefPrix": 145 },
      "bac_semis": { "entrees": { "planche": 8, "pierre": 4, "fibre": 4 }, "sortie": { "bac_semis": 1 }, "coefPrix": 150 },
      "bloc_silo": { "entrees": { "planche": 3, "pierre": 1 }, "sortie": { "bloc_silo": 1 }, "debloque": "silo", "coefPrix": 145 },
      "meule": { "entrees": { "pierre": 10, "planche": 4 }, "sortie": { "meule": 1 }, "coefPrix": 145 },
      "pompe": { "entrees": { "lingot_fer": 2, "planche": 1 }, "sortie": { "pompe": 1 }, "debloque": "energie", "coefPrix": 145 },
      "panneau_solaire": {
        "entrees": { "lingot_fer": 2, "lingot_cuivre": 1, "planche": 2 },
        "sortie": { "panneau_solaire": 1 },
        "debloque": "energie",
        "coefPrix": 150
      },
      "citerne": { "entrees": { "planche": 6, "lingot_fer": 1 }, "sortie": { "citerne": 1 }, "debloque": "energie", "coefPrix": 145 },
      "batterie": { "entrees": { "lingot_cuivre": 2, "lingot_fer": 1 }, "sortie": { "batterie": 1 }, "debloque": "energie", "coefPrix": 145 },
      "escalier": { "entrees": { "planche": 6, "bois": 2 }, "sortie": { "escalier": 1 }, "coefPrix": 145 },
      "station_robot": { "entrees": { "lingot_fer": 1, "lingot_cuivre": 1, "planche": 2 }, "sortie": { "station_robot": 1 }, "coefPrix": 150 },
      "entonnoir": { "entrees": { "planche": 2, "pierre": 1 }, "sortie": { "entonnoir": 1 }, "coefPrix": 145 },
      "botteleuse": { "entrees": { "planche": 4, "pierre": 6 }, "sortie": { "botteleuse": 1 }, "coefPrix": 145 },
      "convoyeur": { "entrees": { "planche": 2, "fibre": 2 }, "sortie": { "convoyeur": 2 }, "coefPrix": 145 },
      "reservoir": { "entrees": { "planche": 3, "lingot_fer": 2 }, "sortie": { "reservoir": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "pressoir": { "entrees": { "planche": 2, "lingot_fer": 2 }, "sortie": { "pressoir": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "centrifugeuse": {
        "entrees": { "lingot_fer": 3, "lingot_cuivre": 1 },
        "sortie": { "centrifugeuse": 1 },
        "debloque": "chaines",
        "coefPrix": 145
      },
      "mixeur": { "entrees": { "lingot_fer": 2, "pierre": 2 }, "sortie": { "mixeur": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "chaudron": { "entrees": { "lingot_fer": 2, "lingot_cuivre": 1 }, "sortie": { "chaudron": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "tonneau": { "entrees": { "planche": 4, "lingot_fer": 1 }, "sortie": { "tonneau": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "ensacheuse": { "entrees": { "lingot_fer": 2, "planche": 2 }, "sortie": { "ensacheuse": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "tonnelet": { "entrees": { "planche": 3, "lingot_fer": 1 }, "sortie": { "tonnelet": 1 }, "debloque": "chaines", "coefPrix": 145 },
      "bac_compost": { "entrees": { "planche": 4, "fibre": 2 }, "sortie": { "bac_compost": 1 }, "coefPrix": 145 },
      "distributeur": { "entrees": { "planche": 6, "lingot_fer": 1 }, "sortie": { "distributeur": 1 }, "debloque": "poulailler", "coefPrix": 145 },
      "mangeoire_grain": { "entrees": { "planche": 4, "pierre": 2 }, "sortie": { "mangeoire_grain": 1 }, "debloque": "poulailler", "coefPrix": 145 },
      "panneau_village": { "entrees": { "planche": 3, "bois": 2 }, "sortie": { "panneau_village": 1 }, "village": true },
      "quai_chargement": {
        "entrees": { "planche": 12, "pierre": 8, "lingot_fer": 2 },
        "sortie": { "quai_chargement": 1 },
        "village": true,
        "port": 2
      },
      "enclume_foyer": { "entrees": { "pierre": 8, "lingot_fer": 3, "bois": 4 }, "sortie": { "enclume_foyer": 1 }, "village": true, "coefPrix": 150 },
      "comptoir": { "entrees": { "planche": 4, "clous": 4 }, "sortie": { "comptoir": 1 }, "village": true, "coefPrix": 145 },
      "enseigne_forge": {
        "entrees": { "planche": 2, "charniere": 2, "clous": 2 },
        "sortie": { "enseigne_forge": 1 },
        "village": true,
        "coefPrix": 150
      },
      "scie_long": { "entrees": { "planche": 6, "lame": 1, "clous": 2 }, "sortie": { "scie_long": 1 }, "village": true, "coefPrix": 150 },
      "four_boulanger": { "entrees": { "pierre": 10, "planche": 2, "bois": 4 }, "sortie": { "four_boulanger": 1 }, "village": true, "coefPrix": 150 },
      "cave_affinage": { "entrees": { "planche": 6, "pierre": 6, "clous": 2 }, "sortie": { "cave_affinage": 1 }, "village": true, "coefPrix": 150 },
      "enseigne_scierie": {
        "entrees": { "planche": 2, "charniere": 2, "clous": 2 },
        "sortie": { "enseigne_scierie": 1 },
        "village": true,
        "coefPrix": 150
      },
      "enseigne_boulangerie": {
        "entrees": { "planche": 2, "charniere": 2, "clous": 2 },
        "sortie": { "enseigne_boulangerie": 1 },
        "village": true,
        "coefPrix": 150
      },
      "enseigne_fromagerie": {
        "entrees": { "planche": 2, "charniere": 2, "clous": 2 },
        "sortie": { "enseigne_fromagerie": 1 },
        "village": true,
        "coefPrix": 150
      },
      "clous": { "entrees": { "lingot_fer": 1 }, "sortie": { "clous": 4 }, "village": true, "commerce": "forge", "coefPrix": 135 },
      "charniere": { "entrees": { "lingot_fer": 1 }, "sortie": { "charniere": 2 }, "village": true, "commerce": "forge", "coefPrix": 135 },
      "lame": { "entrees": { "lingot_fer": 1, "bois": 1 }, "sortie": { "lame": 1 }, "village": true, "commerce": "forge", "coefPrix": 145 },
      "houe": { "entrees": { "bois": 2, "pierre": 1, "fibre": 1 }, "outil": "houe" },
      "hache": { "entrees": { "bois": 2, "pierre": 2, "fibre": 1 }, "outil": "hache" },
      "pioche": { "entrees": { "bois": 2, "pierre": 3, "fibre": 1 }, "outil": "pioche" },
      "pioche_cuivre": { "entrees": { "lingot_cuivre": 3, "planche": 2 }, "outil": "pioche", "niveau": 2 },
      "pioche_fer": { "entrees": { "lingot_fer": 3, "lingot_cuivre": 1, "planche": 2 }, "outil": "pioche", "niveau": 3 },
      "pioche_or": { "entrees": { "lingot_or": 3, "lingot_fer": 1, "planche": 2 }, "outil": "pioche", "niveau": 4 },
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
      "sacoche_cheval": { "nom": "La sacoche du cheval", "entrees": { "fibre": 6, "planche": 2 }, "sacoche": true, "debloque": "ecurie" },
      "sac_petit": { "entrees": { "fibre": 6 }, "sortie": { "sac_petit": 1 }, "coefPrix": 135 },
      "tente": { "entrees": { "fibre": 12, "planche": 2, "corde": 2 }, "sortie": { "tente": 1 }, "coefPrix": 150 },
      "lanterne_tempete": {
        "entrees": { "lingot_fer": 1, "planche": 1, "champignon_lumineux": 1 },
        "sortie": { "lanterne_tempete": 1 },
        "coefPrix": 150
      },
      "sac_grand": { "entrees": { "laine": 3, "fibre": 6 }, "sortie": { "sac_grand": 1 }, "debloque": "moutons", "coefPrix": 145 },
      "chapeau_paille": { "entrees": { "paille": 4, "fibre": 1 }, "sortie": { "chapeau_paille": 1 }, "coefPrix": 145 },
      "tablier": { "entrees": { "fibre": 8 }, "sortie": { "tablier": 1 }, "coefPrix": 135 },
      "bottes": { "entrees": { "planche": 1, "fibre": 6 }, "sortie": { "bottes": 1 }, "coefPrix": 145 },
      "casque_lampe": {
        "entrees": { "lingot_fer": 2, "lingot_cuivre": 1, "champignon_lumineux": 2 },
        "sortie": { "casque_lampe": 1 },
        "debloque": "four",
        "coefPrix": 150
      },
      "ruche": { "entrees": { "planche": 4, "fibre": 8, "pierre": 1 }, "sortie": { "ruche": 1 } },
      "bac_carre": { "entrees": { "planche": 3, "pierre": 2, "fibre": 1 }, "sortie": { "bac_carre": 1 } },
      "bac_rond": { "entrees": { "planche": 3, "fibre": 1 }, "sortie": { "bac_rond": 1 } },
      "bac_long": { "entrees": { "planche": 5, "pierre": 3, "fibre": 1 }, "sortie": { "bac_long": 1 } },
      "table_jardin": { "entrees": { "planche": 4, "fibre": 3 }, "sortie": { "table_jardin": 1 } },
      "chaise_jardin": { "entrees": { "planche": 2 }, "sortie": { "chaise_jardin": 1 } },
      "banc_jardin": { "entrees": { "planche": 3, "pierre": 1 }, "sortie": { "banc_jardin": 1 } },
      "banc_rondins": { "entrees": { "bois": 4 }, "sortie": { "banc_rondins": 1 }, "plan": true },
      "table_rondins": { "entrees": { "bois": 5 }, "sortie": { "table_rondins": 1 }, "plan": true },
      "chaise_peinte": { "entrees": { "planche": 2, "colorant_bleu": 1 }, "sortie": { "chaise_peinte": 1 }, "plan": true },
      "jarre_coquillages": { "entrees": { "pierre": 2, "coquille": 2, "etoile_mer": 1 }, "sortie": { "jarre_coquillages": 1 }, "plan": true },
      "lanterne_papier": { "entrees": { "planche": 1, "fibre": 3, "colorant_rouge": 1 }, "sortie": { "lanterne_papier": 1 }, "plan": true },
      "bassin": { "entrees": { "pierre": 3 }, "sortie": { "bassin": 1 }, "plan": true },
      "banc_pierre": { "entrees": { "pierre": 5 }, "sortie": { "banc_pierre": 1 }, "plan": true },
      "jardiniere_pierre": { "entrees": { "pierre": 3, "herbes_montagne": 2 }, "sortie": { "jardiniere_pierre": 1 }, "plan": true },
      "pergola": { "entrees": { "planche": 4, "fibre": 2 }, "sortie": { "pergola": 1 }, "plan": true }
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
      "boite_aux_lettres": {
        "nom": "Boîte aux lettres",
        "objet": "boite_aux_lettres",
        "dehors": true,
        "bloque": true,
        "dessin": "boite_aux_lettres",
        "villageois": true
      },
      "lavoir": {
        "nom": "Lavoir",
        "objet": "lavoir",
        "dehors": true,
        "bloque": true,
        "dessin": "lavoir",
        "largeur": 3,
        "hauteur": 2,
        "projetVillage": "lavoir",
        "village": true
      },
      "kiosque": {
        "nom": "Kiosque",
        "objet": "kiosque",
        "dehors": true,
        "bloque": true,
        "dessin": "kiosque",
        "largeur": 3,
        "hauteur": 3,
        "projetVillage": "kiosque",
        "village": true
      },
      "fontaine_village": {
        "nom": "Fontaine du village",
        "objet": "fontaine_village",
        "dehors": true,
        "bloque": true,
        "dessin": "fontaine_village",
        "largeur": 2,
        "hauteur": 2,
        "projetVillage": "fontaine",
        "village": true
      },
      "four_commun": {
        "nom": "Four commun",
        "objet": "four_commun",
        "dehors": true,
        "bloque": true,
        "dessin": "four_commun",
        "largeur": 2,
        "hauteur": 2,
        "projetVillage": "four",
        "village": true
      },
      "pont_planches": {
        "nom": "Pont de planches",
        "objet": "pont_planches",
        "dehors": true,
        "pont": true,
        "plat": true,
        "dessin": "pont_planches",
        "tourne": true,
        "village": true
      },
      "etal": {
        "nom": "Étal",
        "objet": "etal",
        "dehors": true,
        "bloque": true,
        "unique": true,
        "dessin": "etal_vide",
        "largeur": 2,
        "etal": true,
        "village": true
      },
      "panneau_village": {
        "nom": "Panneau du village",
        "objet": "panneau_village",
        "dehors": true,
        "bloque": true,
        "dessin": "panneau_village",
        "largeur": 2,
        "panneau": "village",
        "texte": "#3a2212",
        "village": true
      },
      "quai_chargement": {
        "nom": "Quai de chargement",
        "objet": "quai_chargement",
        "dehors": true,
        "bloque": true,
        "unique": true,
        "dessin": "quai_chargement",
        "largeur": 2,
        "village": true
      },
      "enclume_foyer": {
        "nom": "Enclume et foyer",
        "objet": "enclume_foyer",
        "dedans": true,
        "bloque": true,
        "dessin": "enclume_foyer",
        "largeur": 2,
        "commerce": "forge",
        "allume": "braise",
        "village": true
      },
      "scie_long": {
        "nom": "Scie de long et établi",
        "objet": "scie_long",
        "dedans": true,
        "bloque": true,
        "dessin": "scie_long",
        "largeur": 2,
        "commerce": "scierie",
        "village": true
      },
      "four_boulanger": {
        "nom": "Four à bois et étal à pains",
        "objet": "four_boulanger",
        "dedans": true,
        "bloque": true,
        "dessin": "four_boulanger",
        "largeur": 2,
        "commerce": "boulangerie",
        "allume": "feu",
        "village": true
      },
      "cave_affinage": {
        "nom": "Cave d'affinage",
        "objet": "cave_affinage",
        "dedans": true,
        "bloque": true,
        "dessin": "cave_affinage",
        "largeur": 2,
        "commerce": "fromagerie",
        "village": true
      },
      "comptoir": {
        "nom": "Comptoir",
        "objet": "comptoir",
        "dedans": true,
        "bloque": true,
        "dessin": "comptoir",
        "largeur": 2,
        "comptoir": true,
        "village": true
      },
      "enseigne_forge": {
        "nom": "Enseigne du forgeron",
        "objet": "enseigne_forge",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_forge",
        "largeur": 2,
        "enseigneCommerce": "forge",
        "texte": "#2b1a0e",
        "village": true
      },
      "enseigne_scierie": {
        "nom": "Enseigne du menuisier",
        "objet": "enseigne_scierie",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_scierie",
        "largeur": 2,
        "enseigneCommerce": "scierie",
        "texte": "#2b1a0e",
        "village": true
      },
      "enseigne_boulangerie": {
        "nom": "Enseigne du boulanger",
        "objet": "enseigne_boulangerie",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_boulangerie",
        "largeur": 2,
        "enseigneCommerce": "boulangerie",
        "texte": "#2b1a0e",
        "village": true
      },
      "enseigne_fromagerie": {
        "nom": "Enseigne du fromager",
        "objet": "enseigne_fromagerie",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_fromagerie",
        "largeur": 2,
        "enseigneCommerce": "fromagerie",
        "texte": "#2b1a0e",
        "village": true
      },
      "refrigerateur": {
        "nom": "Réfrigérateur",
        "objet": "refrigerateur",
        "meuble": "refrigerateur",
        "dedans": true,
        "bloque": true,
        "unique": true,
        "frigo": true,
        "debloque": "frigo",
        "tourne": true
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
      "sol_pas_ardoise": { "nom": "Pas japonais en ardoise", "objet": "sol_pas_ardoise", "sol": true, "dehors": true, "pasJaponais": true },
      "sol_pas_pierre": { "nom": "Pas japonais en pierre", "objet": "sol_pas_pierre", "sol": true, "dehors": true, "pasJaponais": true },
      "sol_pas_bois": { "nom": "Pas japonais en bois", "objet": "sol_pas_bois", "sol": true, "dehors": true, "pasJaponais": true },
      "barriere": { "nom": "Barrière", "objet": "barriere", "bloque": true, "cloture": true },
      "barriere_blanche": { "nom": "Barrière blanche", "objet": "barriere_blanche", "bloque": true, "cloture": true },
      "barriere_rouge": { "nom": "Barrière rouge", "objet": "barriere_rouge", "bloque": true, "cloture": true },
      "barriere_grise": { "nom": "Barrière grise", "objet": "barriere_grise", "bloque": true, "cloture": true },
      "barriere_chene": { "nom": "Barrière en chêne sombre", "objet": "barriere_chene", "bloque": true, "cloture": true },
      "barriere_verte": { "nom": "Barrière verte", "objet": "barriere_verte", "bloque": true, "cloture": true },
      "barriere_lavande": { "nom": "Barrière lavande", "objet": "barriere_lavande", "bloque": true, "cloture": true },
      "portail": { "nom": "Portail", "objet": "portail", "bloque": true, "cloture": true, "portail": true },
      "portail_ouvert": { "nom": "Portail ouvert", "objet": "portail", "cloture": true, "portail": true, "ouvert": true },
      "lanterne": { "nom": "Lanterne scintillante", "objet": "lanterne", "bloque": true, "lumiere": true },
      "candelabre": { "nom": "Réverbère", "objet": "candelabre", "bloque": true, "lumiere": true },
      "four": { "nom": "Four", "objet": "four_pierre", "dedans": true, "bloque": true, "station": "four", "dessin": "four", "largeur": 2 },
      "cuisiniere": { "nom": "Cuisinière", "objet": "cuisiniere", "dedans": true, "bloque": true, "station": "cuisine" },
      "mortier": { "nom": "Mortier et pilon", "objet": "mortier", "dedans": true, "bloque": true, "station": "mortier" },
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
      "massif_coquelicot": { "nom": "Coquelicots", "objet": "graine_coquelicot", "dehors": true, "massif": "coquelicot" },
      "massif_pavot": { "nom": "Pavots de Californie", "objet": "graine_pavot", "dehors": true, "massif": "pavot" },
      "massif_tournesol": { "nom": "Tournesols", "objet": "graine_tournesol", "dehors": true, "massif": "tournesol" },
      "massif_myosotis": { "nom": "Myosotis", "objet": "graine_myosotis", "dehors": true, "massif": "myosotis" },
      "massif_lavande": { "nom": "Lavande", "objet": "graine_lavande", "dehors": true, "massif": "lavande" },
      "massif_lupin": { "nom": "Lupins", "objet": "graine_lupin", "dehors": true, "massif": "lupin" },
      "ruche": { "nom": "Ruche", "objet": "ruche", "dehors": true, "bloque": true, "ruche": true, "marche": "Animaux" },
      "bac_fleurs": { "nom": "Bac à fleurs (ancien)", "objet": "bac_fleurs", "bloque": true, "fleurs": true },
      "bac_carre": {
        "nom": "Bac carré",
        "objet": "bac_carre",
        "dehors": true,
        "bloque": true,
        "bac": "carre",
        "dessin": "bac_carre",
        "peinture": "bandeau",
        "marche": "Meubles"
      },
      "bac_rond": {
        "nom": "Bac rond",
        "objet": "bac_rond",
        "dehors": true,
        "bloque": true,
        "bac": "rond",
        "dessin": "bac_rond",
        "peinture": "cerclage"
      },
      "bac_long": {
        "nom": "Bac long",
        "objet": "bac_long",
        "dehors": true,
        "bloque": true,
        "bac": "long",
        "dessin": "bac_long",
        "largeur": 2,
        "peinture": "bandeau"
      },
      "table_jardin": { "nom": "Table de jardin", "objet": "table_jardin", "bloque": true, "terrasse": "table", "tourne": "symetrique" },
      "chaise_jardin": { "nom": "Chaise de jardin", "objet": "chaise_jardin", "bloque": true, "terrasse": "siege", "tourne": true },
      "banc_jardin": { "nom": "Banc de jardin", "objet": "banc_jardin", "bloque": true, "terrasse": "siege", "tourne": true },
      "banc_rondins": { "nom": "Banc en rondins", "objet": "banc_rondins", "bloque": true, "terrasse": "siege", "tourne": true },
      "table_rondins": { "nom": "Table en rondins", "objet": "table_rondins", "bloque": true, "terrasse": "table", "tourne": "symetrique" },
      "chaise_peinte": { "nom": "Chaise peinte", "objet": "chaise_peinte", "bloque": true, "terrasse": "siege", "tourne": true },
      "jarre_coquillages": { "nom": "Jarre aux coquillages", "objet": "jarre_coquillages", "bloque": true, "tourne": "symetrique" },
      "lanterne_papier": { "nom": "Lanterne de papier", "objet": "lanterne_papier", "bloque": true, "tourne": "symetrique" },
      "bassin_nenuphars": { "nom": "Bassin aux nénuphars (ancien)", "objet": "bassin_nenuphars", "bloque": true, "tourne": "symetrique" },
      "bassin": { "nom": "Bassin", "objet": "bassin", "dehors": true, "bloque": true, "bassin": true },
      "banc_pierre": { "nom": "Banc de pierre", "objet": "banc_pierre", "bloque": true, "terrasse": "siege", "tourne": true },
      "jardiniere_pierre": { "nom": "Jardinière de pierre", "objet": "jardiniere_pierre", "bloque": true, "tourne": "symetrique" },
      "rosier_multicolore": { "nom": "Rosier grimpant multicolore", "objet": "rosier_multicolore", "sur": "mur", "grimpant": "multicolore" },
      "rosier_rouge": { "nom": "Rosier grimpant rouge", "objet": "rosier_rouge", "sur": "mur", "grimpant": "rouge" },
      "rosier_blanc": { "nom": "Rosier grimpant blanc", "objet": "rosier_blanc", "sur": "mur", "grimpant": "blanc" },
      "rosier_jaune": { "nom": "Rosier grimpant jaune", "objet": "rosier_jaune", "sur": "mur", "grimpant": "jaune" },
      "guirlande_blanche": { "nom": "Guirlande lumineuse blanche", "objet": "guirlande_blanche", "sur": "mur", "guirlande": "blanche" },
      "guirlande_multicolore": {
        "nom": "Guirlande lumineuse multicolore",
        "objet": "guirlande_multicolore",
        "sur": "mur",
        "guirlande": "multicolore"
      },
      "guirlande_etoiles": { "nom": "Guirlande d'étoiles", "objet": "guirlande_etoiles", "sur": "mur", "guirlande": "etoiles" },
      "guirlande_coeurs": { "nom": "Guirlande de cœurs", "objet": "guirlande_coeurs", "sur": "mur", "guirlande": "coeurs" },
      "cheminee_pierre": {
        "nom": "Cheminée en pierre",
        "objet": "cheminee_pierre",
        "meuble": "cheminee_pierre",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "cheminee": true,
        "piece": "salon",
        "tourne": "symetrique"
      },
      "cheminee_briques": {
        "nom": "Cheminée en briques",
        "objet": "cheminee_briques",
        "meuble": "cheminee_briques",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "cheminee": true,
        "piece": "salon",
        "tourne": "symetrique"
      },
      "cheminee_marbre": {
        "nom": "Cheminée en marbre",
        "objet": "cheminee_marbre",
        "meuble": "cheminee_marbre",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "cheminee": true,
        "piece": "salon",
        "tourne": "symetrique"
      },
      "fontaine_pierre": {
        "nom": "Fontaine en pierre",
        "objet": "fontaine_pierre",
        "dehors": true,
        "bloque": true,
        "dessin": "fontaine_pierre",
        "largeur": 2,
        "hauteur": 2,
        "fontaine": true
      },
      "fontaine_marbre": {
        "nom": "Fontaine en marbre",
        "objet": "fontaine_marbre",
        "dehors": true,
        "bloque": true,
        "dessin": "fontaine_marbre",
        "largeur": 2,
        "hauteur": 2,
        "fontaine": true
      },
      "fontaine_grenouille": {
        "nom": "Fontaine à la grenouille",
        "objet": "fontaine_grenouille",
        "dehors": true,
        "bloque": true,
        "dessin": "fontaine_grenouille",
        "largeur": 2,
        "hauteur": 2,
        "fontaine": true
      },
      "fontaine_angelot": {
        "nom": "Fontaine à l'angelot",
        "objet": "fontaine_angelot",
        "dehors": true,
        "bloque": true,
        "dessin": "fontaine_angelot",
        "largeur": 2,
        "hauteur": 2,
        "fontaine": true
      },
      "ornement_cerisier_japon": {
        "nom": "Cerisier du Japon",
        "objet": "ornement_cerisier_japon",
        "dehors": true,
        "bloque": true,
        "dessin": "ornement_cerisier_japon",
        "largeur": 2,
        "hauteur": 2,
        "ornement": true
      },
      "ornement_erable_rouge": {
        "nom": "Érable rouge",
        "objet": "ornement_erable_rouge",
        "dehors": true,
        "bloque": true,
        "dessin": "ornement_erable_rouge",
        "largeur": 2,
        "hauteur": 2,
        "ornement": true
      },
      "ornement_magnolia": {
        "nom": "Magnolia",
        "objet": "ornement_magnolia",
        "dehors": true,
        "bloque": true,
        "dessin": "ornement_magnolia",
        "largeur": 2,
        "hauteur": 2,
        "ornement": true
      },
      "ornement_saule_pleureur": {
        "nom": "Saule pleureur",
        "objet": "ornement_saule_pleureur",
        "dehors": true,
        "bloque": true,
        "dessin": "ornement_saule_pleureur",
        "largeur": 2,
        "hauteur": 2,
        "ornement": true
      },
      "enseigne_bois": {
        "nom": "Enseigne de ferme en bois gravé",
        "objet": "enseigne_bois",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_bois",
        "largeur": 2,
        "peinture": "enseigne_bois",
        "enseigne": "bois"
      },
      "boite_lettres_bois": {
        "nom": "Boîte aux lettres en bois",
        "objet": "boite_lettres_bois",
        "dehors": true,
        "bloque": true,
        "dessin": "boite_lettres_bois",
        "peinture": "enseigne_bois",
        "boite_lettres": true
      },
      "enseigne_email": {
        "nom": "Enseigne de ferme émaillée",
        "objet": "enseigne_email",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_email",
        "largeur": 2,
        "peinture": "enseigne_email",
        "enseigne": "email"
      },
      "boite_lettres_email": {
        "nom": "Boîte aux lettres émaillée",
        "objet": "boite_lettres_email",
        "dehors": true,
        "bloque": true,
        "dessin": "boite_lettres_email",
        "peinture": "enseigne_email",
        "boite_lettres": true
      },
      "enseigne_fer": {
        "nom": "Enseigne de ferme en fer forgé",
        "objet": "enseigne_fer",
        "dehors": true,
        "bloque": true,
        "dessin": "enseigne_fer",
        "largeur": 2,
        "peinture": "enseigne_fer",
        "enseigne": "fer"
      },
      "boite_lettres_fer": {
        "nom": "Boîte aux lettres en fer forgé",
        "objet": "boite_lettres_fer",
        "dehors": true,
        "bloque": true,
        "dessin": "boite_lettres_fer",
        "peinture": "enseigne_fer",
        "boite_lettres": true
      },
      "chalet_lit": {
        "nom": "Lit de chalet",
        "objet": "chalet_lit",
        "meuble": "chalet_lit",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "chalet_chevet": {
        "nom": "Chevet de chalet",
        "objet": "chalet_chevet",
        "meuble": "chalet_chevet",
        "dedans": true,
        "bloque": true,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "chalet_tapis": {
        "nom": "Tapis alpin",
        "objet": "chalet_tapis",
        "meuble": "chalet_tapis",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3],
        "piece": "chambre",
        "boutique": true
      },
      "chalet_tableau": {
        "nom": "Tableau : le sommet enneigé",
        "objet": "chalet_tableau",
        "meuble": "chalet_tableau",
        "sur": "mur",
        "piece": "chambre",
        "boutique": true
      },
      "sol_meleze": { "nom": "Plancher de mélèze", "objet": "sol_meleze", "sol": true, "boutique": true },
      "cottage_lit": {
        "nom": "Lit de cottage",
        "objet": "cottage_lit",
        "meuble": "cottage_lit",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "cottage_chevet": {
        "nom": "Chevet de cottage",
        "objet": "cottage_chevet",
        "meuble": "cottage_chevet",
        "dedans": true,
        "bloque": true,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "cottage_tapis": {
        "nom": "Tapis aux roses",
        "objet": "cottage_tapis",
        "meuble": "cottage_tapis",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3],
        "piece": "chambre",
        "boutique": true
      },
      "cottage_tableau": {
        "nom": "Tableau : le jardin du cottage",
        "objet": "cottage_tableau",
        "meuble": "cottage_tableau",
        "sur": "mur",
        "piece": "chambre",
        "boutique": true
      },
      "sol_blanchi": { "nom": "Plancher blanchi", "objet": "sol_blanchi", "sol": true, "boutique": true },
      "mer_lit": {
        "nom": "Lit de bord de mer",
        "objet": "mer_lit",
        "meuble": "mer_lit",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "mer_chevet": {
        "nom": "Chevet de bord de mer",
        "objet": "mer_chevet",
        "meuble": "mer_chevet",
        "dedans": true,
        "bloque": true,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "mer_tapis": {
        "nom": "Tapis de jute",
        "objet": "mer_tapis",
        "meuble": "mer_tapis",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3],
        "piece": "chambre",
        "boutique": true
      },
      "mer_tableau": {
        "nom": "Tableau : le phare",
        "objet": "mer_tableau",
        "meuble": "mer_tableau",
        "sur": "mur",
        "piece": "chambre",
        "boutique": true
      },
      "sol_flotte": { "nom": "Plancher flotté", "objet": "sol_flotte", "sol": true, "boutique": true },
      "fee_lit": {
        "nom": "Lit féerique",
        "objet": "fee_lit",
        "meuble": "fee_lit",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "fee_chevet": {
        "nom": "Chevet féerique",
        "objet": "fee_chevet",
        "meuble": "fee_chevet",
        "dedans": true,
        "bloque": true,
        "tourne": true,
        "piece": "chambre",
        "boutique": true
      },
      "fee_tapis": {
        "nom": "Tapis arc-en-ciel",
        "objet": "fee_tapis",
        "meuble": "fee_tapis",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3],
        "piece": "chambre",
        "boutique": true
      },
      "fee_tableau": {
        "nom": "Tableau : la licorne",
        "objet": "fee_tableau",
        "meuble": "fee_tableau",
        "sur": "mur",
        "piece": "chambre",
        "boutique": true
      },
      "sol_pastel": { "nom": "Parquet pastel", "objet": "sol_pastel", "sol": true, "boutique": true },
      "sapin_noel": {
        "nom": "Sapin de Noël",
        "objet": "sapin_noel",
        "meuble": "sapin_noel",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique",
        "piece": "salon",
        "boutique": true
      },
      "couronne_noel": {
        "nom": "Couronne de Noël",
        "objet": "couronne_noel",
        "meuble": "couronne_noel",
        "sur": "mur",
        "piece": "salon",
        "boutique": true
      },
      "bonhomme_neige": {
        "nom": "Bonhomme de neige",
        "objet": "bonhomme_neige",
        "dehors": true,
        "bloque": true,
        "dessin": "bonhomme_neige",
        "boutique": true
      },
      "citrouille_halloween": {
        "nom": "Citrouille sculptée",
        "objet": "citrouille_halloween",
        "dehors": true,
        "bloque": true,
        "dessin": "citrouille_halloween",
        "boutique": true
      },
      "tas_citrouilles": {
        "nom": "Tas de citrouilles",
        "objet": "tas_citrouilles",
        "dehors": true,
        "bloque": true,
        "dessin": "tas_citrouilles",
        "largeur": 2,
        "boutique": true
      },
      "panier_oeufs": {
        "nom": "Panier d'œufs peints",
        "objet": "panier_oeufs",
        "dehors": true,
        "bloque": true,
        "dessin": "panier_oeufs",
        "boutique": true
      },
      "oeuf_geant": { "nom": "Œuf de Pâques géant", "objet": "oeuf_geant", "dehors": true, "bloque": true, "dessin": "oeuf_geant", "boutique": true },
      "pergola": { "nom": "Pergola fleurie", "objet": "pergola", "bloque": false, "tourne": "symetrique" },
      "bac_lavande": { "nom": "Bac de lavande (ancien)", "objet": "bac_lavande", "bloque": true, "fleurs": true, "tourne": "symetrique" },
      "station_robot": { "nom": "Station du robot", "objet": "station_robot", "dehors": true, "bloque": true, "unique": true, "robot": true },
      "entonnoir": { "nom": "Entonnoir", "objet": "entonnoir", "bloque": true, "botteleuse": "entonnoir" },
      "botteleuse": { "nom": "Botteleuse", "objet": "botteleuse", "bloque": true, "botteleuse": "machine" },
      "convoyeur": { "nom": "Convoyeur", "objet": "convoyeur", "bloque": true, "botteleuse": "convoyeur" },
      "reservoir": { "nom": "Réservoir", "objet": "reservoir", "bloque": true, "chaine": "reservoir" },
      "pressoir": { "nom": "Presse", "objet": "pressoir", "bloque": true, "chaine": "outil" },
      "centrifugeuse": { "nom": "Centrifugeuse", "objet": "centrifugeuse", "bloque": true, "chaine": "outil" },
      "mixeur": { "nom": "Mixeur", "objet": "mixeur", "bloque": true, "chaine": "outil" },
      "chaudron": { "nom": "Chaudron", "objet": "chaudron", "bloque": true, "chaine": "outil" },
      "tonneau": { "nom": "Tonneau", "objet": "tonneau", "bloque": true, "chaine": "outil" },
      "ensacheuse": { "nom": "Ensacheuse", "objet": "ensacheuse", "bloque": true, "chaine": "outil" },
      "tonnelet": { "nom": "Tonnelet", "objet": "tonnelet", "dehors": true, "bloque": true, "tonnelet": true },
      "compost": { "nom": "Bac à compost", "objet": "bac_compost", "dehors": true, "bloque": true, "compost": true },
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
      "meuble_chaise": { "nom": "Chaise", "objet": "meuble_chaise", "meuble": "chaise", "dedans": true, "bloque": true, "tourne": true },
      "meuble_table": { "nom": "Table", "objet": "meuble_table", "meuble": "table", "dedans": true, "bloque": true, "largeur": 3, "tourne": true },
      "meuble_tapis_1": {
        "nom": "Tapis tressé",
        "objet": "meuble_tapis_1",
        "meuble": "tapis_1",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3]
      },
      "meuble_tapis_2": {
        "nom": "Tapis rouge",
        "objet": "meuble_tapis_2",
        "meuble": "tapis_2",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "hauteur": 2,
        "tourne": true
      },
      "meuble_tapis_3": {
        "nom": "Tapis bleu",
        "objet": "meuble_tapis_3",
        "meuble": "tapis_3",
        "dedans": true,
        "plat": true,
        "largeur": 3,
        "tourne": true,
        "profil": [2, 3]
      },
      "meuble_lit_adulte": {
        "nom": "Lit adulte",
        "objet": "meuble_lit_adulte",
        "meuble": "lit_adulte",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true
      },
      "meuble_lit_enfant": {
        "nom": "Lit enfant",
        "objet": "meuble_lit_enfant",
        "meuble": "lit_enfant",
        "dedans": true,
        "lit": true,
        "hauteur": 2,
        "tourne": true
      },
      "meuble_chevet": { "nom": "Table de chevet", "objet": "meuble_chevet", "meuble": "chevet", "dedans": true, "bloque": true, "tourne": true },
      "meuble_canape": { "nom": "Canapé", "objet": "meuble_canape", "meuble": "canape", "dedans": true, "bloque": true, "largeur": 3, "tourne": true },
      "meuble_table_basse": {
        "nom": "Table basse",
        "objet": "meuble_table_basse",
        "meuble": "table_basse",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_tableau_1": { "nom": "Tableau : la ferme", "objet": "meuble_tableau_1", "meuble": "tableau_1", "sur": "mur" },
      "meuble_tableau_2": { "nom": "Tableau : le bouquet", "objet": "meuble_tableau_2", "meuble": "tableau_2", "sur": "mur" },
      "meuble_tableau_3": { "nom": "Tableau : la mer", "objet": "meuble_tableau_3", "meuble": "tableau_3", "sur": "mur" },
      "meuble_buffet": {
        "nom": "Buffet vaisselier",
        "objet": "meuble_buffet",
        "meuble": "buffet",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_commode": {
        "nom": "Commode",
        "objet": "meuble_commode",
        "meuble": "commode",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_armoire_chene": {
        "nom": "Armoire de chêne",
        "objet": "meuble_armoire_chene",
        "meuble": "armoire_chene",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_armoire_peinte": {
        "nom": "Armoire peinte",
        "objet": "meuble_armoire_peinte",
        "meuble": "armoire_peinte",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_armoire_glace": {
        "nom": "Armoire à glace",
        "objet": "meuble_armoire_glace",
        "meuble": "armoire_glace",
        "dedans": true,
        "bloque": true,
        "tourne": true
      },
      "meuble_cuisine_porte": {
        "nom": "Bas de cuisine à porte",
        "objet": "meuble_cuisine_porte",
        "meuble": "cuisine_porte",
        "dedans": true,
        "bloque": true,
        "tourne": true
      },
      "meuble_cuisine_tiroirs": {
        "nom": "Bas de cuisine à tiroirs",
        "objet": "meuble_cuisine_tiroirs",
        "meuble": "cuisine_tiroirs",
        "dedans": true,
        "bloque": true,
        "tourne": true
      },
      "meuble_cuisine_sauge": {
        "nom": "Bas de cuisine vitré",
        "objet": "meuble_cuisine_sauge",
        "meuble": "cuisine_sauge",
        "dedans": true,
        "bloque": true,
        "tourne": true
      },
      "meuble_poubelle": {
        "nom": "Poubelle",
        "objet": "meuble_poubelle",
        "meuble": "poubelle",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_bibliotheque": {
        "nom": "Bibliothèque étroite",
        "objet": "meuble_bibliotheque",
        "meuble": "bibliotheque",
        "dedans": true,
        "bloque": true,
        "tourne": true
      },
      "meuble_bibliotheque_vitree": {
        "nom": "Bibliothèque vitrée",
        "objet": "meuble_bibliotheque_vitree",
        "meuble": "bibliotheque_vitree",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_lampadaire": {
        "nom": "Lampadaire",
        "objet": "meuble_lampadaire",
        "meuble": "lampadaire",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_coffre_jouets": {
        "nom": "Coffre à jouets",
        "objet": "meuble_coffre_jouets",
        "meuble": "coffre_jouets",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": true
      },
      "meuble_plante_ficus": {
        "nom": "Ficus",
        "objet": "meuble_plante_ficus",
        "meuble": "plante_ficus",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_monstera": {
        "nom": "Monstera",
        "objet": "meuble_plante_monstera",
        "meuble": "plante_monstera",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_sansevieria": {
        "nom": "Sansevière",
        "objet": "meuble_plante_sansevieria",
        "meuble": "plante_sansevieria",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_cactus": {
        "nom": "Cactus cierge",
        "objet": "meuble_plante_cactus",
        "meuble": "plante_cactus",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_fougere": {
        "nom": "Fougère",
        "objet": "meuble_plante_fougere",
        "meuble": "plante_fougere",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_palmier": {
        "nom": "Palmier kentia",
        "objet": "meuble_plante_palmier",
        "meuble": "plante_palmier",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_citronnier": {
        "nom": "Citronnier",
        "objet": "meuble_plante_citronnier",
        "meuble": "plante_citronnier",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_orchidee": {
        "nom": "Orchidée",
        "objet": "meuble_plante_orchidee",
        "meuble": "plante_orchidee",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_aloe": {
        "nom": "Aloe vera",
        "objet": "meuble_plante_aloe",
        "meuble": "plante_aloe",
        "dedans": true,
        "bloque": true,
        "tourne": "symetrique"
      },
      "meuble_plante_bonsai": {
        "nom": "Bonsaï",
        "objet": "meuble_plante_bonsai",
        "meuble": "plante_bonsai",
        "dedans": true,
        "bloque": true,
        "largeur": 2,
        "tourne": "symetrique"
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
          "sol_meleze",
          "sol_blanchi",
          "sol_flotte",
          "sol_pastel",
          "chemin",
          "pont_planches",
          "sol_pas_ardoise",
          "sol_pas_pierre",
          "sol_pas_bois",
          "barriere",
          "barriere_blanche",
          "barriere_rouge",
          "barriere_grise",
          "barriere_chene",
          "barriere_verte",
          "barriere_lavande",
          "portail",
          "escalier"
        ]
      },
      "maison": {
        "nom": "Maison",
        "icone": "🏠",
        "blocs": [
          "paillasse",
          "boite_nourriture",
          "boite_aux_lettres",
          "etal",
          "refrigerateur",
          "four",
          "cuisiniere",
          "mortier",
          "lanterne",
          "candelabre"
        ]
      },
      "meubles": { "nom": "Meubles", "icone": "🛏", "meubles": true },
      "elevage": {
        "nom": "Élevage",
        "icone": "🐔",
        "blocs": ["nichoir", "distributeur", "mangeoire_grain", "mangeoire", "ratelier", "bac_semis", "ruche", "compost", "bloc_silo", "meule"]
      },
      "jardin": {
        "nom": "Jardin",
        "icone": "🌷",
        "blocs": [
          "table_jardin",
          "chaise_jardin",
          "banc_jardin",
          "bac_carre",
          "bac_rond",
          "bac_long",
          "banc_rondins",
          "table_rondins",
          "chaise_peinte",
          "jarre_coquillages",
          "lanterne_papier",
          "bassin",
          "banc_pierre",
          "jardiniere_pierre",
          "pergola",
          "bac_fleurs",
          "bac_lavande",
          "bassin_nenuphars",
          "rosier_multicolore",
          "rosier_rouge",
          "rosier_blanc",
          "rosier_jaune",
          "guirlande_blanche",
          "guirlande_multicolore",
          "guirlande_etoiles",
          "guirlande_coeurs",
          "fontaine_pierre",
          "fontaine_marbre",
          "fontaine_grenouille",
          "fontaine_angelot",
          "ornement_cerisier_japon",
          "ornement_erable_rouge",
          "ornement_magnolia",
          "ornement_saule_pleureur",
          "panneau_village",
          "enseigne_bois",
          "boite_lettres_bois",
          "enseigne_email",
          "boite_lettres_email",
          "enseigne_fer",
          "boite_lettres_fer",
          "bonhomme_neige",
          "citrouille_halloween",
          "tas_citrouilles",
          "lavoir",
          "kiosque",
          "fontaine_village",
          "four_commun",
          "panier_oeufs",
          "oeuf_geant"
        ]
      },
      "energie": { "nom": "Énergie", "icone": "⚡", "blocs": ["puits", "pompe", "citerne", "panneau", "batterie", "station_robot"] },
      "machines": {
        "nom": "Machines",
        "icone": "⚙️",
        "blocs": [
          "atelier",
          "entonnoir",
          "botteleuse",
          "convoyeur",
          "reservoir",
          "pressoir",
          "centrifugeuse",
          "mixeur",
          "chaudron",
          "tonneau",
          "ensacheuse",
          "tonnelet",
          "quai_chargement"
        ]
      },
      "commerces": {
        "nom": "Commerces",
        "icone": "🏪",
        "blocs": [
          "enclume_foyer",
          "scie_long",
          "four_boulanger",
          "cave_affinage",
          "comptoir",
          "enseigne_forge",
          "enseigne_scierie",
          "enseigne_boulangerie",
          "enseigne_fromagerie"
        ]
      }
    },
    "SILO": { "LARGEUR": 2, "HAUTEUR": 3, "HAUTEUR_MAX": 6, "BLES_PAR_BLOC": 10 },
    "ARBRE_ECART": 3,
    "BONHEUR_SANS_COUCHAGE": 0,
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
  "CHAINES": {
    "NOM": "Chaîne de production",
    "ICONE": "🏭",
    "RESERVOIR": 30,
    "TAS": 12,
    "OUTILS": {
      "pressoir": { "whParS": 20, "secondes": 8 },
      "centrifugeuse": { "whParS": 25, "secondes": 10 },
      "mixeur": { "whParS": 15, "secondes": 6 },
      "chaudron": { "whParS": 30, "secondes": 12 },
      "tonneau": { "whParS": 5, "secondes": 40 },
      "ensacheuse": { "whParS": 10, "secondes": 6 }
    },
    "RECETTES": {
      "huile": ["pressoir"],
      "jus_fruits": ["mixeur", "pressoir"],
      "fromage_frais": ["centrifugeuse", "pressoir"],
      "fromage_alpage": ["centrifugeuse", "pressoir", "tonneau"],
      "compote": ["mixeur", "chaudron"],
      "confiture_fraises": ["mixeur", "chaudron", "ensacheuse"],
      "biere_artisanale": ["chaudron", "tonneau"],
      "bocal_legumes": ["chaudron", "ensacheuse"]
    }
  },
  "TONNELET": {
    "NOM": "Tonnelet",
    "ICONE": "🛢️‍🧀",
    "OBJET": "tonnelet",
    "NUITS": 2,
    "AFFINE": { "tomme_alpage": "fromage_alpage", "mout_houblon": "biere_artisanale" }
  },
  "COMPOST": { "NOM": "Bac à compost", "ICONE": "🪵‍🍂", "OBJET": "compost", "ENGRAIS": "engrais", "PAR_ENGRAIS": 1, "MAX_ENGRAIS": 20 },
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
    "mortier": { "nom": "Mortier", "article": "le", "icone": "⚱", "prixConstruction": 0, "electrique": false, "action": "broyer" }
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
    "compote": { "nom": "Compote", "icone": "🍮", "station": "chaine", "temps": 15, "ingredients": [{ "ou": ["pomme", "poire"], "qte": 3 }] },
    "jus_fruits": {
      "nom": "Jus de fruits",
      "icone": "🧃",
      "station": "chaine",
      "temps": 10,
      "ingredients": [{ "ou": ["pomme", "poire", "fraise"], "qte": 3 }]
    },
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
    "fromage_frais": { "nom": "Fromage frais", "icone": "🧀‍🥛", "station": "chaine", "temps": 60, "ingredients": [{ "item": "lait", "qte": 3 }] },
    "fromage_alpage": {
      "nom": "Fromage d'alpage",
      "icone": "🧀",
      "station": "chaine",
      "temps": 60,
      "ingredients": [{ "item": "lait_alpage", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "fromage_alpage",
      "cave": "tomme_alpage",
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
      "station": "chaine",
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
      "station": "chaine",
      "temps": 60,
      "ingredients": [{ "item": "houblon", "qte": 2 }],
      "eau": 1,
      "cave": "mout_houblon",
      "coefPrix": 300
    },
    "bocal_legumes": {
      "nom": "Bocal de légumes",
      "icone": "🫙",
      "station": "chaine",
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
      "coefPrix": 135,
      "sortie": "farine",
      "qteSortie": 1,
      "horsLivre": true
    },
    "huile": {
      "nom": "Huile de tournesol",
      "icone": "🌻",
      "station": "chaine",
      "temps": 10,
      "ingredients": [{ "item": "graine_tournesol", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
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
      "coefPrix": 145,
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
      "coefPrix": 145,
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
      "coefPrix": 145,
      "sortie": "lingot_or",
      "qteSortie": 1
    },
    "pomme_doree": {
      "nom": "Pomme dorée",
      "icone": "🍎‍✨",
      "station": "four",
      "temps": 60,
      "ingredients": [{ "item": "pomme", "qte": 1 }, { "item": "lingot_or", "qte": 5 }],
      "transformation": true,
      "coefPrix": 145,
      "sortie": "pomme_doree",
      "qteSortie": 1
    },
    "lingot_platine": {
      "nom": "Fondre du platine",
      "icone": "🧈‍⚪",
      "station": "four",
      "temps": 80,
      "ingredients": [{ "item": "minerai_platine", "qte": 4 }, { "item": "bois", "qte": 5 }],
      "transformation": true,
      "coefPrix": 145,
      "sortie": "lingot_platine",
      "qteSortie": 1
    },
    "colorant_rouge": {
      "nom": "Colorant rouge",
      "icone": "🔴",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "item": "fleur_coquelicot", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_rouge",
      "qteSortie": 1
    },
    "colorant_orange": {
      "nom": "Colorant orange",
      "icone": "🟠",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "item": "fleur_pavot", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_orange",
      "qteSortie": 1
    },
    "colorant_jaune": {
      "nom": "Colorant jaune",
      "icone": "🟡",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "item": "fleur_tournesol", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_jaune",
      "qteSortie": 1
    },
    "colorant_vert": {
      "nom": "Colorant vert",
      "icone": "🟢",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "item": "epinard", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_vert",
      "qteSortie": 1
    },
    "colorant_bleu": {
      "nom": "Colorant bleu",
      "icone": "🔵",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "item": "fleur_myosotis", "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_bleu",
      "qteSortie": 1
    },
    "colorant_violet": {
      "nom": "Colorant violet",
      "icone": "🟣",
      "station": "mortier",
      "temps": 10,
      "ingredients": [{ "ou": ["fleur_lavande", "fleur_lupin"], "qte": 3 }],
      "transformation": true,
      "coefPrix": 135,
      "sortie": "colorant_violet",
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
      "sprite": { "r": 0, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "patate": {
      "nom": "Patate",
      "icone": "🥔",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "patate", "mode": "plant" },
      "sprite": { "r": 1, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "tomate": {
      "nom": "Tomate",
      "icone": "🍅",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_tomate", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 2, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "courgette": {
      "nom": "Courgette",
      "icone": "🥒",
      "lieux": ["potager", "serre"],
      "stades": 5,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_courgette", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 3, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "aubergine": {
      "nom": "Aubergine",
      "icone": "🍆",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_aubergine", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 4, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "poivron": {
      "nom": "Poivron",
      "icone": "🫑",
      "lieux": ["potager", "serre"],
      "stades": 6,
      "litres": 4,
      "rendement": 6,
      "graines": { "item": "graine_poivron", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 5, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "oignon": {
      "nom": "Oignon",
      "icone": "🧅",
      "lieux": ["potager"],
      "stades": 5,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_oignon", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 6, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "ail": {
      "nom": "Ail",
      "icone": "🧄",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 2,
      "rendement": 6,
      "graines": { "item": "ail", "mode": "plant" },
      "sprite": { "r": 7, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "epinard": {
      "nom": "Épinard",
      "icone": "🥬",
      "lieux": ["potager"],
      "stades": 3,
      "litres": 3,
      "rendement": 8,
      "graines": { "item": "graine_epinard", "mode": "recolte", "min": 1, "max": 2 },
      "sprite": { "r": 8, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "fraise": {
      "nom": "Fraise",
      "icone": "🍓",
      "lieux": ["potager"],
      "stades": 4,
      "litres": 3,
      "rendement": 10,
      "graines": { "item": "graine_fraise", "mode": "recolte", "min": 2, "max": 3 },
      "sprite": { "r": 9, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
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
      "sprite": { "r": 10, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
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
      "sprite": { "r": 11, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
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
      "sprite": { "r": 12, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
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
      "sprite": { "r": 13, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
    },
    "cacao": {
      "nom": "Cacao",
      "icone": "🍫",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 5,
      "graines": { "item": "cacao", "mode": "plant" },
      "sprite": { "r": 14, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "vanille": {
      "nom": "Vanille",
      "icone": "🫘",
      "lieux": ["serre"],
      "stades": 10,
      "litres": 2,
      "rendement": 3,
      "graines": { "item": "vanille", "mode": "plant" },
      "sprite": { "r": 15, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "cafe": {
      "nom": "Café",
      "icone": "☕",
      "lieux": ["serre"],
      "stades": 8,
      "litres": 3,
      "rendement": 6,
      "graines": { "item": "cafe", "mode": "plant" },
      "sprite": { "r": 16, "c": [0, 1, 2, 3, 4], "l": 24, "h": 44 }
    },
    "vigne": {
      "nom": "Vigne",
      "icone": "🍇",
      "lieux": ["potager"],
      "stades": 6,
      "litres": 2,
      "rendement": 4,
      "produit": "raisin",
      "graines": { "item": "plant_vigne", "mode": "plant" },
      "vivace": { "stade": 4 },
      "sprite": { "r": 17, "c": [0, 1, 2, 3], "l": 24, "h": 44 }
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
  "PIOCHE": {
    "NOM": "Pioche",
    "ICONE": "⚒️",
    "PRIX": 60,
    "PIERRE": 1,
    "BRIS": 2,
    "COUPS": 3,
    "RETOUR": [1, 3],
    "MAIN": 1,
    "GISEMENTS": { "fer": 3, "cuivre": 2 },
    "NIVEAUX": [
      { "nom": "pierre", "icone": "⚒‍🪨", "minerai": 0 },
      { "nom": "cuivre", "icone": "⚒‍🟠", "minerai": 25 },
      { "nom": "fer", "icone": "⚒‍⚙", "minerai": 50 },
      { "nom": "or", "icone": "⚒‍🟡", "minerai": 75 }
    ],
    "MINERAIS": { "or": 3, "platine": 4 }
  },
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
  "SERRE": { "LIEU": "serre", "PRIX_CONSTRUCTION": 1000 },
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
    "VITESSE": 1.4,
    "VITESSE_FAIM": 1.4,
    "RATION": 2,
    "ATTACHE": ["poteau_attache", "corde"],
    "PROCHE": 40,
    "GALOP": { "PLACES": 5, "FRIANDISES": { "pomme": { "vitesse": 2, "secondes": 30 }, "pomme_doree": { "vitesse": 2.5, "secondes": 600 } } }
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
      "5": { "chapitre": 7, "nom": "Petit paradis" }
    },
    "POINTS": {
      "CHAPITRES": [2, 3, 3, 4, 4, 5, 5],
      "MAITRISE": [
        { "id": "eau_2000", "compteur": "litres", "cible": 2000, "libelle": "Pomper 2 000 L au total" },
        { "id": "plats_10", "compteur": "plats", "cible": 10, "libelle": "Préparer 10 plats différents" },
        { "id": "pains_50", "compteur": "pains", "cible": 50, "libelle": "Cuire 50 pains" },
        { "id": "laines_40", "compteur": "laines", "cible": 40, "libelle": "Tondre 40 laines" },
        { "id": "annee_1", "compteur": "nuits", "cible": 40, "libelle": "Traverser une année complète (40 nuits)" },
        { "id": "repas_5", "compteur": "repasInvites", "cible": 5, "libelle": "Partager 5 repas avec des invités" }
      ],
      "MODE_LIBRE_NUITS": 5
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
        "effet": { "delestage": { "seuil": 10, "reprise": 15 } },
        "description": "Sous 10 % de charge, le Moulin, la Presse et la Pompe se mettent en pause pour garder l'électricité du réfrigérateur. Ils repartent seuls quand la charge remonte au-dessus de 15 %."
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
        "description": "« Planter partout », « Arroser tout » et « Récolter tout », et semer ou arroser en glissant sur 3 cases ou plus, coûtent 25 % d'énergie en moins."
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
        "effet": { "fileAttente": 10 },
        "description": "Le Four et la Cuisine acceptent jusqu'à 10 préparations à la suite (3 sans elle) : elles s'enchaînent sans clic, ingrédients réservés au lancement. (Le Moulin, lui, moud déjà la quantité de blé que tu choisis.)"
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
        "description": "Arbres, rochers et gisements tombent en un coup de moins."
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
        "effet": { "grotte": { "minerai": 25 } },
        "description": "Chaque gisement brisé donne un quart de minerai en plus."
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
      "jus_fruits",
      "tarte_pommes",
      "soupe_legumes",
      "salade_tomates",
      "farine",
      "huile",
      "lingot_fer",
      "lingot_cuivre",
      "lingot_or",
      "pomme_doree",
      "lingot_platine",
      "colorant_rouge",
      "colorant_orange",
      "colorant_jaune",
      "colorant_vert",
      "colorant_bleu",
      "colorant_violet",
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
        "titre": "Notre nouveau chez-nous",
        "etape": "L'héritage",
        "icone": "🏚️",
        "recompense": { "objets": { "bac_carre": 2, "lanterne": 2 } },
        "intro": "« Ne te laisse pas impressionner par la terre », t'écrit ta mère. La ferme du grand-père est à ta famille, mais rien ne fonctionne. Répare la maison, installe le panneau solaire et la pompe, puis le réservoir ; fabrique une houe à l'Atelier, laboure, plante : la première récolte lancera la ferme. Les conserves nourrissent la famille en attendant.",
        "introSauvage": "« Ne te laisse pas impressionner par la terre », t'écrit ta mère. Celle de ton grand-père est à ta famille, sans maison ni bâtiment : juste un abri de bois, monté pour vous attendre. Ramasse des pierres et du bois, construis l'Atelier, fabrique une houe, laboure, plante et arrose à la cruche, remplie au puits : la première récolte lancera la ferme. Les conserves nourrissent la famille en attendant.",
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
        "titre": "Une maison à notre image",
        "etape": "Le grenier",
        "icone": "🌾",
        "recompense": { "plans": ["pergola"], "objets": { "banc_jardin": 1 } },
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
        "titre": "Les premiers animaux",
        "etape": "Le poulailler",
        "icone": "🐔",
        "recompense": { "plans": ["banc_rondins"] },
        "intro": "« On ne laisse pas une poule sans grain, ni une famille sans œufs », dit Odile. Une ponte régulière demande du blé. Et un voisin, ça se gagne : parle aux habitants, offre-leur ce qu'ils aiment. L'Arbre des technologies demande maintenant du fer : une pioche en main, cherche les rochers veinés de rouille, sur la ferme et autour : ce sont des gisements. Et il est temps de sortir de la ferme : suis le chemin de la calèche jusqu'au premier hameau.",
        "objectifs": [
          { "type": "pontes", "cible": 7, "libelle": "Pondre 7 nuits d'affilée", "unite": "nuits" },
          { "type": "amis", "palier": 2, "cible": 1, "libelle": "Devenir « cordial » avec un habitant d'un hameau", "unite": "" },
          { "type": "objet", "item": "minerai_fer", "cible": 4, "libelle": "Rapporter 4 minerais de fer d'un gisement", "unite": "" },
          { "type": "hameaux", "cible": 1, "libelle": "Découvrir un hameau du grand monde", "unite": "" }
        ]
      },
      {
        "titre": "Les plaisirs de la cuisine",
        "etape": "Le four et le livre de recette",
        "icone": "🍞",
        "recompense": { "plans": ["table_rondins"] },
        "intro": "« Ton pain se vend mieux que ton blé. Et le fer, ça se cuit aussi », dit Achille. Moudre, presser, cuire : le pain et les plats cuisinés valent plus que leurs ingrédients. Le Four fond aussi le minerai des gisements, avec du bois : les lingots paient les technologies. La montagne, au nord et à l'ouest du monde, cache de l'or, du platine et des cristaux qui luisent la nuit.",
        "objectifs": [
          { "type": "pains", "cible": 5, "recette": "pain", "libelle": "Cuire 5 pains", "unite": "" },
          { "type": "plats", "cible": 3, "exclut": ["pain"], "libelle": "Préparer 3 plats différents (hors pain)", "unite": "" },
          { "type": "objet", "item": "lingot_fer", "cible": 1, "libelle": "Fondre un lingot de fer au Four", "unite": "" },
          { "type": "objet", "item": "quartz", "cible": 1, "libelle": "Rapporter un quartz des cristaux de la montagne", "unite": "" },
          { "type": "monde", "cible": 10, "libelle": "Voir 10 % du grand monde", "unite": "%" }
        ]
      },
      {
        "titre": "Une ferme pleine de vie",
        "etape": "Le troupeau",
        "icone": "🐑",
        "recompense": { "plans": ["chaise_peinte"] },
        "intro": "« Papa disait qu'une ferme sans bêtes, c'est un jardin qui se donne des airs », t'écrit ta mère. Des moutons pour la laine, des vaches pour le lait. Et une ferme vit aussi de ceux qu'on y reçoit : invite tes amis à un repas, depuis le calendrier. Ils vivent à l'Étable et mangent chaque nuit de la paille : fauche l'herbe haute de la carte avec la faux, puis jette ses fibres dans la botteleuse (Atelier) pour en faire des bottes. Les hameaux ont leurs bergers et leurs pêcheurs : va voir comment ils vivent, et tente ta chance à la canne au bord de la mer.",
        "objectifs": [
          { "type": "laines", "cible": 10, "libelle": "Tondre 10 laines", "unite": "" },
          { "type": "repas", "cible": 1, "libelle": "Partager un repas avec des invités (le calendrier)", "unite": "" },
          { "type": "hameaux", "cible": 3, "libelle": "Découvrir 3 hameaux", "unite": "" },
          { "type": "pecheMer", "cible": 1, "libelle": "Pêcher un poisson dans la mer", "unite": "" }
        ]
      },
      {
        "titre": "Au rythme de la nature",
        "etape": "Toute l'année",
        "icone": "📅",
        "recompense": { "objets": { "bac_long": 1, "graine_lavande": 3 } },
        "intro": "« Une ferme, c'est comme une amitié : un peu de soin chaque jour », dit Odile. La Serre, le Verger et le Réfrigérateur pour tenir dans la durée. Les hameaux, eux, ont leurs projets : apporte-leur de quoi les achever. Ce qui manque à la ferme, les hameaux l'ont parfois : la calèche te vend ce qu'elle leur achète. Et le pays a ses bêtes, à regarder sans les chasser.",
        "objectifs": [
          { "type": "projets", "cible": 1, "libelle": "Aider un hameau à achever un projet", "unite": "" },
          { "type": "achatsHameaux", "cible": 5, "libelle": "Acheter 5 produits des hameaux à la calèche", "unite": "" },
          { "type": "faune", "cible": 6, "libelle": "Voir 6 bêtes sauvages différentes", "unite": "" }
        ]
      },
      {
        "titre": "Notre petit coin de paradis",
        "etape": "La ferme accomplie",
        "icone": "🏡",
        "recompense": { "plans": ["banc_pierre"], "objets": { "lanterne": 3 } },
        "intro": "« Maurice disait : le jour où ta table se remplit sans moi, je passe quand même. Pour causer », dit Achille. Fais de la ferme un lieu à votre image : mêle les styles qui vous plaisent, cherche les plans des meubles du pays. Et connais ton pays : les hameaux du bout des chemins, la montagne, la côte. Ce ne sera pas une fin : ensuite, la ferme est à toi, à ton rythme.",
        "objectifs": [
          { "type": "styles", "cible": 3, "libelle": "Mêler 3 styles à la ferme (ou un style complet)", "unite": "" },
          { "type": "plans", "cible": 7, "libelle": "Trouver 7 plans de meubles de collection", "unite": "" },
          { "type": "hameaux", "cible": 5, "libelle": "Découvrir 5 hameaux", "unite": "" },
          { "type": "monde", "cible": 15, "libelle": "Voir 15 % du grand monde", "unite": "%" }
        ]
      }
    ]
  },
  "COURRIER": {
    "maurice_enveloppe": {
      "quand": { "niveau": 9 },
      "cadeaux": { "enveloppe_maurice": 1 },
      "icone": "🏝️",
      "objet": "Une carte postale de Maurice",
      "expediteur": "Maurice et Philomène",
      "lieu": "Une île au soleil",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Ici, il fait chaud et les poissons sont jaunes. Philomène a appris à danser.",
        "J'ai oublié de te laisser ça avant de partir. Dans l'enveloppe, il y a de quoi faire un beau cadeau à l'île : les toits, une fête… Odile saura. Ou garde-la pour toi, si tu en as besoin. Tu sauras.",
        "Je t'embrasse. M.",
        "P.S. de Philomène : on pense à vous à chaque coucher de soleil."
      ],
      "signature": "Papi Maurice"
    },
    "maurice_terre": {
      "quand": { "depart": true },
      "icone": "⛵",
      "objet": "Une lettre de Maurice et Philomène",
      "expediteur": "Maurice et Philomène",
      "lieu": "À bord de la Luciole",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Philomène et moi, on a pris le large ! On a toujours rêvé de voir les autres îles, et l'âge ne nous a pas demandé la permission.",
        "Notre terre, on vous la confie. La maison a besoin d'un coup de main : le toit, la pompe, les champs retournés à l'herbe. Prenez votre temps, elle est patiente.",
        "Odile garde un œil sur tout, et Achille passe chaque matin. Vous ne serez jamais seuls.",
        "On vous écrira de chaque port. Je vous embrasse.",
        "P.S. de Philomène : arrosez le matin, et laissez un coin de fleurs pour les abeilles."
      ],
      "texteSauvage": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "Philomène et moi, on a pris le large ! On a toujours rêvé de voir les autres îles, et l'âge ne nous a pas demandé la permission.",
        "Notre terre, on vous la confie. Elle est restée sauvage, toute en herbe, en bois et en étangs : à vous d'y bâtir votre nid. Commencez par un abri ; le reste viendra.",
        "Odile garde un œil sur tout, et Achille passe chaque matin. Vous ne serez jamais seuls.",
        "On vous écrira de chaque port. Je vous embrasse.",
        "P.S. de Philomène : arrosez le matin, et laissez un coin de fleurs pour les abeilles."
      ],
      "signature": "Papi Maurice"
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
        "Tu verras, la terre de papa est bonne. Il disait qu'il suffisait de l'écouter. Moi, je l'entendais surtout chanter faux en binant.",
        "Au fait, si tu passes au Gué, dis bonjour à Odile. Elle va vouloir te nourrir : laisse-toi faire.",
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
        "Au fait, le grand arbre tordu au-dessus du Gué, il s'y arrêtait toujours en rentrant. Il disait que c'était le meilleur endroit pour voir la lune se lever.",
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
        "Ta première veillée ! Odile m'a écrit trois lignes pour me le raconter, c'est beaucoup pour elle.",
        "Des veillées, je me souviens des tartes, des histoires de lune, et de papa qui arrivait toujours au dessert, la cloche à la main.",
        "Au fait, dis bonjour à Frida, si tu la croises au bord de son étang. Elle me fabriquait des jouets qui marchaient tout seuls.",
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
        "Odile va vouloir le voir, tu verras : elle adore les machines de Frida, surtout celle qui touille la confiture.",
        "Au fait, papa disait que les machines, c'est comme les chevaux : il faut leur parler gentiment.",
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
        "Odile t'a donné la cloche ! Je l'ai su avant ta lettre : on en parle jusque sur le quai de Cadolon.",
        "Cette cloche, je l'entendais arriver de loin quand j'étais petite. Papa la sonnait deux fois devant chaque maison : une pour dire bonjour, une pour dire à bientôt.",
        "Je ne sais pas comment tu as fait. Si, je sais : tu as fait comme lui.",
        {
          "m": "Je suis fière de toi, mon grand. Je viendrai te voir à la prochaine fête, c'est promis.",
          "f": "Je suis fière de toi, ma grande. Je viendrai te voir à la prochaine fête, c'est promis."
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
        "Fernand t'emmène voir les dauphins ? Alors c'est fait : tu es d'ici.",
        "Tu as su prendre ton temps. C'est ce que les gens de Céron aiment le plus.",
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
        "Elle dit que tes machines ont rendu service à toute l'île, jusqu'à la confiture d'Odile.",
        "Papa aurait adoré. Il aurait voulu en conduire une.",
        "Je suis fière de toi, tu sais."
      ],
      "signature": "Maman"
    },
    "adele_fete_genereuse": {
      "quand": { "fait": "fin.genereuse" },
      "icone": "💌",
      "objet": "Une lettre de ta mère",
      "expediteur": "Adèle",
      "lieu": "Cadolon",
      "texte": [
        { "m": "Mon grand,", "f": "Ma grande," },
        "On m'a raconté la fête. Ta ferme nourrit toute l'île, paraît-il : on la voit dorée depuis le bac.",
        "Papa m'a écrit, tout fier : « Notre terre n'a jamais été aussi belle. »",
        { "m": "Tu es heureux, là-bas ? Moi, je le lis dans tes lettres.", "f": "Tu es heureuse, là-bas ? Moi, je le lis dans tes lettres." },
        "Au fait, Odile adore les visites. Passe-lui un panier.",
        "Je t'embrasse."
      ],
      "signature": "Maman"
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
      { "debloque": ["chaines", "verger", "ecurie", "vigne"] },
      { "debloque": ["cacao", "vanille", "cafe", "serre", "energie"] },
      { "debloque": ["frigo"] },
      { "debloque": [], "note": "une carte postale de Maurice : une enveloppe pour l'île" },
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
      "chaines": { "nom": "Chaînes de production", "icone": "🏭", "note": "huile, jus, fromages, compote, confiture, bière, bocaux" },
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
      "broyer": 10,
      "presser": 10,
      "vendre": 1
    },
    "AUTO": 50,
    "TUILES": [12, 24, 40, 60, 84, 112, 144, 180, 220, 264],
    "CHAPITRES_XP": [200, 500, 1000, 2500, 2000, 4000, 8000],
    "CHAPITRE_NIVEAU": [1, 2, 3, 6, 6, 8, 8, 8]
  },
  "PAPIERS_PEINTS": {
    "fleurettes": { "nom": "Fleurettes", "objet": "papier_peint_fleurettes" },
    "rayures": { "nom": "Rayures", "objet": "papier_peint_rayures" },
    "vichy": { "nom": "Carreaux vichy", "objet": "papier_peint_vichy" },
    "damas": { "nom": "Damas", "objet": "papier_peint_damas" },
    "feuillages": { "nom": "Feuillages", "objet": "papier_peint_feuillages" },
    "etoiles": { "nom": "Étoiles", "objet": "papier_peint_etoiles" },
    "lambris": { "nom": "Lambris de pin", "objet": "papier_peint_lambris" },
    "roses": { "nom": "Roses anglaises", "objet": "papier_peint_roses" },
    "vagues": { "nom": "Vagues", "objet": "papier_peint_vagues" },
    "nuages": { "nom": "Nuages et étoiles", "objet": "papier_peint_nuages" }
  },
  "PALETTES": {
    "bois_miel": ["#3c1e16", "#603620", "#86522e", "#aa7040", "#cc965c"],
    "bois_noyer": ["#2c1810", "#4a2a1a", "#66402a", "#845a3c", "#a27654"],
    "bois_blanchi": ["#6e5c4a", "#9a8670", "#bcaa90", "#d6c8b0", "#ece2d0"],
    "bois_bleu": ["#283a54", "#3e5878", "#5a7a9c", "#80a0bc", "#a8c4da"],
    "chene": ["#382f1d", "#5a4c32", "#706041", "#96825c", "#bca37a"],
    "chene_noyer": ["#2a1c12", "#46301e", "#5e4028", "#7e5a3a", "#a27c58"],
    "chene_sauge": ["#465846", "#60765c", "#7e9474", "#a0b494", "#c6d4b8"],
    "tissu_vert": ["#1b3826", "#285238", "#356744", "#427c50", "#59925f", "#70a86e", "#8fbb8e", "#accdab", "#c9dec8"],
    "tissu_rouge": ["#3f1418", "#5c1e24", "#75282d", "#8e3236", "#a74442", "#c0564e", "#ce7b75", "#da9d98", "#e7bfbc"],
    "tissu_bleu": ["#142341", "#1e3460", "#294577", "#34568e", "#4f72a9", "#6a8ec4", "#8ba7d1", "#a9bddd", "#c6d4e9"],
    "tissu_moutarde": ["#533910", "#7a5418", "#956c20", "#b08428", "#c69e3c", "#dcb850", "#e4c876", "#ebd69a", "#f2e4bc"],
    "bac_bandeau": ["#706042", "#96825d", "#bca37b"],
    "bac_cerclage": ["#3e4451", "#626a77", "#929aa5"],
    "bac_bandeau_rouge": ["#ba2424", "#e2483c", "#fa9682"],
    "bac_cerclage_rouge": ["#ba2424", "#e2483c", "#fa9682"],
    "bac_bandeau_orange": ["#dc6e18", "#f69a30", "#ffd28c"],
    "bac_cerclage_orange": ["#dc6e18", "#f69a30", "#ffd28c"],
    "bac_bandeau_jaune": ["#e2ba1e", "#fade46", "#fff6aa"],
    "bac_cerclage_jaune": ["#e2ba1e", "#fade46", "#fff6aa"],
    "bac_bandeau_vert": ["#34842c", "#62b442", "#b0e082"],
    "bac_cerclage_vert": ["#34842c", "#62b442", "#b0e082"],
    "bac_bandeau_bleu": ["#3468c4", "#64a0ec", "#b4dcff"],
    "bac_cerclage_bleu": ["#3468c4", "#64a0ec", "#b4dcff"],
    "bac_bandeau_violet": ["#703ea4", "#9c6ed6", "#d6baf4"],
    "bac_cerclage_violet": ["#703ea4", "#9c6ed6", "#d6baf4"],
    "enseigne_bois": ["#3a2214", "#5a3620", "#7a4e2c", "#9a6a3c", "#b88850", "#d2a868", "#e8c890"],
    "enseigne_bois_rouge": ["#4a1414", "#6e1e1c", "#962c24", "#b8402e", "#d45e40", "#e88460", "#f6b08c"],
    "enseigne_bois_vert": ["#14301e", "#1e4a2a", "#2c6438", "#3e7e48", "#58985c", "#7cb47a", "#a8d0a0"],
    "enseigne_bois_bleu": ["#142438", "#1e3654", "#2a4c70", "#3c648c", "#5480a8", "#78a0c4", "#a4c4dc"],
    "enseigne_bois_blanc": ["#6a6458", "#8a8476", "#a8a294", "#c4beb0", "#dad6c8", "#ece8dc", "#faf8f0"],
    "enseigne_email": ["#0e1c4a", "#16286a", "#1e3888", "#2a4aa4", "#3c62bc", "#5a80d0", "#86a6e4"],
    "enseigne_email_vert": ["#0c3424", "#124a32", "#186242", "#227a52", "#349466", "#52ae80", "#80caa2"],
    "enseigne_email_rouge": ["#4a0c12", "#6c121a", "#8e1a22", "#ae242c", "#c83a3c", "#de5c58", "#f08a82"],
    "enseigne_email_noir": ["#0c0c12", "#16161e", "#20202a", "#2c2c38", "#3c3c4a", "#52525e", "#6e6e7a"],
    "enseigne_email_creme": ["#8a7a5a", "#a69674", "#c0b08c", "#d6c8a4", "#e6dabc", "#f2ead0", "#fcf6e6"],
    "enseigne_fer": ["#0e0e12", "#18181e", "#22222a", "#2e2e38", "#3e3e4a", "#545462", "#70707e"],
    "enseigne_fer_vert": ["#0c2418", "#123422", "#1a462e", "#24583a", "#326c48", "#48845c", "#66a078"],
    "enseigne_fer_bleu": ["#0e1a30", "#142440", "#1c3052", "#263e66", "#344e7a", "#4a6692", "#6882ac"],
    "enseigne_fer_rouge": ["#2a0a10", "#3c0e16", "#50141e", "#661c28", "#7e2834", "#983c46", "#b25a60"],
    "enseigne_fer_blanc": ["#6e6c66", "#8c8a84", "#a8a6a0", "#c2c0ba", "#d8d6d0", "#eae8e2", "#f8f6f2"]
  },
  "PEINTURES": {
    "bandeau": [
      { "id": "naturel", "nom": "bois naturel" },
      { "id": "rouge", "nom": "peint en rouge", "remplace": { "bac_bandeau": "bac_bandeau_rouge" } },
      { "id": "orange", "nom": "peint en orange", "remplace": { "bac_bandeau": "bac_bandeau_orange" } },
      { "id": "jaune", "nom": "peint en jaune", "remplace": { "bac_bandeau": "bac_bandeau_jaune" } },
      { "id": "vert", "nom": "peint en vert", "remplace": { "bac_bandeau": "bac_bandeau_vert" } },
      { "id": "bleu", "nom": "peint en bleu", "remplace": { "bac_bandeau": "bac_bandeau_bleu" } },
      { "id": "violet", "nom": "peint en violet", "remplace": { "bac_bandeau": "bac_bandeau_violet" } }
    ],
    "cerclage": [
      { "id": "naturel", "nom": "bois naturel" },
      { "id": "rouge", "nom": "peint en rouge", "remplace": { "bac_cerclage": "bac_cerclage_rouge" } },
      { "id": "orange", "nom": "peint en orange", "remplace": { "bac_cerclage": "bac_cerclage_orange" } },
      { "id": "jaune", "nom": "peint en jaune", "remplace": { "bac_cerclage": "bac_cerclage_jaune" } },
      { "id": "vert", "nom": "peint en vert", "remplace": { "bac_cerclage": "bac_cerclage_vert" } },
      { "id": "bleu", "nom": "peint en bleu", "remplace": { "bac_cerclage": "bac_cerclage_bleu" } },
      { "id": "violet", "nom": "peint en violet", "remplace": { "bac_cerclage": "bac_cerclage_violet" } }
    ],
    "enseigne_bois": [
      { "id": "naturel", "nom": "bois naturel", "texte": "#2a170c" },
      { "id": "rouge", "nom": "peint en rouge", "remplace": { "enseigne_bois": "enseigne_bois_rouge" }, "texte": "#f2dcb0" },
      { "id": "vert", "nom": "peint en vert", "remplace": { "enseigne_bois": "enseigne_bois_vert" }, "texte": "#f2dcb0" },
      { "id": "bleu", "nom": "peint en bleu", "remplace": { "enseigne_bois": "enseigne_bois_bleu" }, "texte": "#f2dcb0" },
      { "id": "blanc", "nom": "peint en blanc", "remplace": { "enseigne_bois": "enseigne_bois_blanc" }, "texte": "#4a3826" }
    ],
    "enseigne_email": [
      { "id": "bleu", "nom": "émail bleu", "texte": "#f6f2e6" },
      { "id": "vert", "nom": "émail vert", "remplace": { "enseigne_email": "enseigne_email_vert" }, "texte": "#f6f2e6" },
      { "id": "rouge", "nom": "émail rouge", "remplace": { "enseigne_email": "enseigne_email_rouge" }, "texte": "#f6f2e6" },
      { "id": "noir", "nom": "émail noir", "remplace": { "enseigne_email": "enseigne_email_noir" }, "texte": "#f6f2e6" },
      { "id": "creme", "nom": "émail crème", "remplace": { "enseigne_email": "enseigne_email_creme" }, "texte": "#1e3888" }
    ],
    "enseigne_fer": [
      { "id": "noir", "nom": "fer noir", "texte": "#e6c068" },
      { "id": "vert", "nom": "vert anglais", "remplace": { "enseigne_fer": "enseigne_fer_vert" }, "texte": "#e6c068" },
      { "id": "bleu", "nom": "bleu nuit", "remplace": { "enseigne_fer": "enseigne_fer_bleu" }, "texte": "#e6c068" },
      { "id": "rouge", "nom": "bordeaux", "remplace": { "enseigne_fer": "enseigne_fer_rouge" }, "texte": "#e6c068" },
      { "id": "blanc", "nom": "fer blanc", "remplace": { "enseigne_fer": "enseigne_fer_blanc" }, "texte": "#3a3428" }
    ]
  },
  "BACS": {
    "NUITS": 3,
    "RECOLTE": [2, 3],
    "FLEURS": {
      "coquelicot": { "nom": "Coquelicots", "graine": "graine_coquelicot", "fleur": "fleur_coquelicot" },
      "pavot": { "nom": "Pavots de Californie", "graine": "graine_pavot", "fleur": "fleur_pavot" },
      "tournesol": { "nom": "Tournesols", "graine": "graine_tournesol", "fleur": "fleur_tournesol" },
      "myosotis": { "nom": "Myosotis", "graine": "graine_myosotis", "fleur": "fleur_myosotis" },
      "lavande": { "nom": "Lavande", "graine": "graine_lavande", "fleur": "fleur_lavande" },
      "lupin": { "nom": "Lupins", "graine": "graine_lupin", "fleur": "fleur_lupin" }
    }
  },
  "MASSIFS": {
    "NUITS": 3,
    "CUEILLETTE": [2, 3],
    "GRAINE": 25,
    "DESSIN": {
      "coquelicot": "coquelicot",
      "pavot": "pavot_californie",
      "tournesol": "tournesol_sauvage",
      "myosotis": "myosotis",
      "lavande": "lavande",
      "lupin": "lupin"
    }
  },
  "DEHORS": { "bac_carre": { "nom": "Bac carré", "prix": 60 } },
  "MEUBLES": {
    "chaise": {
      "nom": "Chaise",
      "piece": "cuisine",
      "prix": 30,
      "bonheur": 1,
      "max": "membres",
      "variantes": [
        { "id": "miel", "nom": "miel" },
        { "id": "noyer", "nom": "noyer", "remplace": { "bois_miel": "bois_noyer" } },
        { "id": "bleu", "nom": "peinte en bleu", "remplace": { "bois_miel": "bois_bleu" } }
      ]
    },
    "table": {
      "nom": "Table",
      "piece": "cuisine",
      "prix": 90,
      "bonheur": 3,
      "variantes": [
        { "id": "miel", "nom": "miel" },
        { "id": "noyer", "nom": "noyer", "remplace": { "bois_miel": "bois_noyer" } },
        { "id": "blanchi", "nom": "bois blanchi", "remplace": { "bois_miel": "bois_blanchi" } }
      ]
    },
    "tapis_1": { "vendeur": "genets", "nom": "Tapis tressé", "piece": "salon", "prix": 40, "bonheur": 2 },
    "tapis_2": { "vendeur": "genets", "nom": "Tapis rouge", "piece": "chambre", "prix": 50, "bonheur": 2 },
    "tapis_3": { "vendeur": "genets", "nom": "Tapis bleu", "piece": "cuisine", "prix": 60, "bonheur": 2 },
    "lit_adulte": {
      "nom": "Lit adulte",
      "piece": "chambre",
      "prix": 120,
      "bonheur": 4,
      "max": "adultes",
      "variantes": [
        { "id": "vert", "nom": "vert" },
        { "id": "rouge", "nom": "rouge", "remplace": { "tissu_vert": "tissu_rouge" } },
        { "id": "bleu", "nom": "bleu", "remplace": { "tissu_vert": "tissu_bleu" } }
      ]
    },
    "lit_enfant": { "nom": "Lit enfant", "piece": "chambre", "prix": 90, "bonheur": 4, "max": "enfants" },
    "chevet": { "nom": "Table de chevet", "piece": "chambre", "prix": 35, "bonheur": 1 },
    "canape": {
      "nom": "Canapé",
      "piece": "salon",
      "prix": 150,
      "bonheur": 4,
      "variantes": [
        { "id": "vert", "nom": "vert" },
        { "id": "rouge", "nom": "rouge", "remplace": { "tissu_vert": "tissu_rouge" } },
        { "id": "bleu", "nom": "bleu", "remplace": { "tissu_vert": "tissu_bleu" } },
        { "id": "moutarde", "nom": "moutarde", "remplace": { "tissu_vert": "tissu_moutarde" } }
      ]
    },
    "table_basse": { "nom": "Table basse", "piece": "salon", "prix": 60, "bonheur": 2 },
    "tableau_1": { "nom": "Tableau : la ferme", "piece": "salon", "prix": 45, "bonheur": 2 },
    "tableau_2": { "nom": "Tableau : le bouquet", "piece": "salon", "prix": 55, "bonheur": 2 },
    "tableau_3": { "nom": "Tableau : la mer", "piece": "chambre", "prix": 70, "bonheur": 3 },
    "buffet": { "nom": "Buffet vaisselier", "piece": "cuisine", "prix": 140, "bonheur": 4 },
    "commode": {
      "nom": "Commode",
      "piece": "chambre",
      "prix": 110,
      "bonheur": 3,
      "variantes": [
        { "id": "chene", "nom": "chêne" },
        { "id": "noyer", "nom": "noyer", "remplace": { "chene": "chene_noyer" } },
        { "id": "sauge", "nom": "peinte en sauge", "remplace": { "chene": "chene_sauge" } }
      ]
    },
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
      "casque_lampe": { "place": "tete", "enfant": false, "vueNuit": 150, "carte": "casque" },
      "chapeau_paille": {
        "place": "tete",
        "enfant": true,
        "carte": "paille",
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
    "BRUTS": [
      "bois",
      "pierre",
      "fibre",
      "minerai_fer",
      "minerai_cuivre",
      "minerai_or",
      "minerai_platine",
      "quartz",
      "lingot_fer",
      "lingot_cuivre",
      "lingot_or",
      "champignon_lumineux"
    ],
    "MATERIAUX_GARDES": 40,
    "VIVRES_GARDES": 10,
    "SEMENCES_GARDEES": 6,
    "PORT": { "SEUIL": 60, "VITESSE": 3.6, "NIVEAU_MAX": 5, "CHANTIER": 0.5 },
    "VILLAGEOIS": {
      "MAISON_PALIER": 3,
      "MAISON": { "paillasse": 1, "boite_aux_lettres": 1 },
      "TACHES": ["champs", "betes", "cuisine", "verger", "peche", "bois", "pierre", "fauchage", "cueillette"],
      "REATTRIBUER": {
        "JOURS": 7,
        "SEMAINES": 2,
        "SEUIL": 0,
        "MARGE": 0,
        "GARDER": ["champs"],
        "VERS": ["betes", "verger", "peche", "bois", "pierre", "fauchage", "cueillette"]
      },
      "ETAL": { "PAR_OBJET": 2 },
      "COMMERCE": { "PALIER": 4, "SORTE": "forge", "MATIERES": { "minerai_fer": 12, "bois": 8 } }
    },
    "VOCATIONS": {
      "village": { "nom": "Vocation village", "eveilS": 60 },
      "production": {
        "nom": "Vocation production",
        "eveilS": 60,
        "vocation": "production",
        "TACHES": {
          "champs": 1,
          "chaine": 1,
          "cuisine": 1,
          "navette": 1,
          "betes": 1,
          "verger": 1,
          "peche": 1,
          "bois": 1,
          "pierre": 1,
          "fauchage": 1,
          "cueillette": 1
        },
        "REATTRIBUER": false,
        "QUAI": true,
        "FARINE_MAX": 80,
        "VENDRE": ["pain"],
        "CONTRATS": ["pain", "laine", "oeuf", "lait"]
      }
    },
    "BATIR": {
      "foyer": { "paillasse": 4 },
      "puits": { "puits_pierre": 1 },
      "boite": { "boite_nourriture": 1 },
      "four": { "four_pierre": 1 },
      "cuisine": { "cuisiniere": 1 },
      "moulin": { "meule": 1 },
      "poulailler": { "nichoir": 1 },
      "etable": { "mangeoire": 1 },
      "serre": { "bac_semis": 1 },
      "silo": { "bloc_silo": 6 },
      "panneau": { "panneau_solaire": 1 },
      "batterie": { "batterie": 1 },
      "pompe": { "pompe": 1 },
      "reservoir": { "citerne": 1 }
    },
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
      "1": [{ "type": "maison" }, { "type": "houe" }],
      "2": [{ "type": "houe" }, { "type": "silo", "niveau": 2 }],
      "3": [{ "type": "poulailler", "niveau": 1 }, { "type": "silo", "niveau": 1 }, { "type": "poules", "n": 4 }],
      "4": [
        { "type": "station", "id": "four" },
        { "type": "station", "id": "moulin" },
        { "type": "station", "id": "cuisine" },
        { "type": "port", "niveau": 2 }
      ],
      "5": [{ "type": "station", "id": "moulin" }, { "type": "paturage" }, { "type": "moutons", "n": 3 }],
      "6": [{ "type": "serre" }, { "type": "verger" }, { "type": "arbres", "n": 2 }, { "type": "frigo" }, { "type": "port", "niveau": 3 }],
      "7": []
    },
    "PLAN": [
      { "type": "houe" },
      { "type": "achat", "id": "panneau" },
      { "type": "achat", "id": "pompe" },
      { "type": "achat", "id": "reservoir" },
      { "type": "achat", "id": "batterie" },
      { "type": "poulailler", "niveau": 1 },
      { "type": "silo", "niveau": 1 },
      { "type": "poules", "n": 4 },
      { "type": "poulailler", "niveau": 2 },
      { "type": "poules", "n": 8 },
      { "type": "silo", "niveau": 2 },
      { "type": "station", "id": "four" },
      { "type": "station", "id": "moulin" },
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
      { "type": "serre" },
      { "type": "frigo" },
      { "type": "frigo", "niveau": 2 },
      { "type": "tech", "id": "semis_auto" },
      { "type": "tech", "id": "cui_laiterie" },
      { "type": "tech", "id": "el_tonte" },
      { "type": "arbres", "n": 4 },
      { "type": "moutons", "n": 6 },
      { "type": "poules", "n": 16 },
      { "type": "vaches", "n": 4 },
      { "type": "arbres", "n": 8 },
      { "type": "vaches", "n": 8 },
      { "type": "moutons", "n": 10 },
      { "type": "arbres", "n": 12 },
      { "type": "port", "niveau": 3 },
      { "type": "port", "niveau": 4 },
      { "type": "port", "niveau": 5 }
    ],
    "VERIFS": { "CHAPITRE_7_AVANT": 60, "CAISSE_FOIS_DEPENSE": 2, "NUITS_DEPENSE": 20 },
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
      "CALE": { "RAYON": 40, "HAMEAU": 8, "PECHE": 8 },
      "GEODE": { "FERME": 12, "CHEMIN": 3, "HAMEAU": 12, "LIEU": 8 }
    },
    "SECRETS": {
      "SORTES": {
        "ruine": { "N": 3, "BIOMES": ["prairie", "lande", "foret"] },
        "cairn": { "N": 3, "BIOMES": ["montagne", "lande"] },
        "arbre_ancien": { "N": 3, "BIOMES": ["foret", "prairie"] },
        "belvedere": { "N": 2, "BIOMES": ["montagne"], "HAUT": true },
        "pierre_levee": { "N": 3, "BIOMES": ["lande", "prairie", "marais"] }
      },
      "PAS": 6,
      "AUTOUR": 2,
      "ECART": 40,
      "FERME": 30,
      "HAMEAU": 18,
      "LIEU": 12
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
      { "nom": "fougere", "genre": "basse", "variantes": 4, "penche": true },
      { "nom": "champignons", "genre": "basse", "variantes": 4 },
      { "nom": "touffe_foret", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "bruyere", "genre": "basse", "variantes": 6, "penche": true },
      { "nom": "herbe_seche", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "jonc", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "nenuphar", "genre": "basse", "variantes": 4 },
      { "nom": "oyat", "genre": "basse", "variantes": 4, "penche": true, "eau": [2, 99] },
      { "nom": "chardon", "genre": "basse", "variantes": 2, "penche": true, "eau": [2, 99] },
      { "nom": "bois_flotte", "genre": "basse", "variantes": 2, "eau": [0, 3] },
      { "nom": "touffe_mont", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "fleurs", "genre": "basse", "variantes": 16, "penche": true, "teinte": true },
      { "nom": "touffe_pre", "genre": "basse", "variantes": 16, "penche": true, "teinte": true },
      { "nom": "coquelicot", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "pavot_californie", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "tournesol_sauvage", "genre": "basse", "variantes": 2, "penche": true },
      { "nom": "myosotis", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "lavande", "genre": "basse", "variantes": 3, "penche": true },
      { "nom": "lupin", "genre": "basse", "variantes": 2, "penche": true },
      { "nom": "chataignier", "genre": "arbre", "variantes": 3, "bloque": [[0, 0]], "ecart": 1 },
      { "nom": "champignons_lumineux", "genre": "haute", "variantes": 3, "ecart": 1 },
      { "nom": "fleur_rouge", "genre": "basse", "variantes": 1, "penche": true },
      { "nom": "fleur_mauve", "genre": "basse", "variantes": 1, "penche": true },
      { "nom": "pierre", "genre": "basse", "variantes": 1 },
      { "nom": "champignon_blanc", "genre": "basse", "variantes": 1 },
      { "nom": "champignon_jaune", "genre": "basse", "variantes": 1 },
      { "nom": "champignon_bleu", "genre": "basse", "variantes": 1 }
    ],
    "REMPLACE": [{ "biome": "foret", "sols": ["feuilles", "mousse"], "de": "feuillu", "vers": "chataignier", "part": 0.0625 }],
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
          "touffe_foret": 0.04,
          "champignons_lumineux": 0.004,
          "champignon_blanc": 0.012,
          "champignon_jaune": 0.01,
          "champignon_bleu": 0.01
        },
        "aiguilles": {
          "sapin": 0.36,
          "feuillu": 0.03,
          "souche": 0.008,
          "tronc_couche": 0.003,
          "fougere": 0.03,
          "champignons": 0.03,
          "touffe_foret": 0.02,
          "champignons_lumineux": 0.005,
          "champignon_blanc": 0.012,
          "champignon_jaune": 0.01,
          "champignon_bleu": 0.01
        },
        "mousse": {
          "feuillu": 0.22,
          "bouleau": 0.08,
          "sapin": 0.04,
          "souche": 0.008,
          "tronc_couche": 0.006,
          "ronces": 0.008,
          "fougere": 0.16,
          "champignons": 0.04,
          "champignons_lumineux": 0.006,
          "champignon_blanc": 0.012,
          "champignon_jaune": 0.01,
          "champignon_bleu": 0.01
        },
        "clairiere": {
          "touffe_foret": 0.1,
          "fougere": 0.05,
          "ronces": 0.01,
          "bouleau": 0.01,
          "myosotis": 0.012,
          "lupin": 0.006,
          "champignon_blanc": 0.004,
          "fleur_rouge": 0.004,
          "fleur_mauve": 0.004
        }
      },
      "lande": {
        "lande": {
          "ajonc": 0.022,
          "genet": 0.012,
          "pin_tordu": 0.006,
          "bruyere": 0.18,
          "herbe_seche": 0.05,
          "lavande": 0.012,
          "pavot_californie": 0.004,
          "pierre": 0.006
        },
        "terre": { "herbe_seche": 0.05, "bruyere": 0.03, "ajonc": 0.004, "pavot_californie": 0.006 }
      },
      "marais": {
        "vase": { "saule": 0.012, "roseaux": 0.15, "massette": 0.03, "jonc": 0.14, "myosotis": 0.02 },
        "eau_basse": { "nenuphar": 0.12, "roseaux": 0.06, "massette": 0.05 }
      },
      "plage": { "sable": { "oyat": 0.12, "chardon": 0.025, "bois_flotte": 0.02 }, "galets": { "bois_flotte": 0.015, "oyat": 0.01 } },
      "montagne": {
        "eboulis": { "sapin_nain": 0.05, "rhododendron": 0.02, "touffe_mont": 0.1, "lupin": 0.008, "pierre": 0.06, "fleur_mauve": 0.002 }
      },
      "prairie": {
        "herbe": {
          "arbre_pre": 0.004,
          "buisson_pre": 0.004,
          "fleurs": 0.03,
          "touffe_pre": 0.05,
          "coquelicot": 0.006,
          "pavot_californie": 0.002,
          "tournesol_sauvage": 0.002,
          "lupin": 0.002,
          "myosotis": 0.002,
          "fleur_rouge": 0.012,
          "fleur_mauve": 0.012,
          "pierre": 0.002,
          "champignon_blanc": 0.001
        }
      }
    },
    "LISIERE": { "MIN": 0.3, "RAYON": 4 },
    "CLAIRIERES": { "PAS": 18, "SEUIL": 0.7, "FONDU": 0.06 },
    "TOUFFES": { "PAS": 5, "MIN": 0.2, "MAX": 1.8 },
    "FERME": 5,
    "LIEUX": { "hameaux": 6, "peche": 2, "recit": 4, "secrets": 3 },
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
      { "nom": "congere", "genre": "basse", "variantes": 4 },
      { "nom": "gisement_fer", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 3 },
      { "nom": "gisement_cuivre", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 3 },
      { "nom": "gisement_or", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 3 },
      { "nom": "gisement_platine", "genre": "bloc", "variantes": 3, "bloque": [[0, 0], [1, 0]], "ecart": 3 },
      { "nom": "cristaux_quartz", "genre": "bloc", "variantes": 3, "bloque": [[0, 0]], "ecart": 2 },
      { "nom": "cristaux_amethyste", "genre": "bloc", "variantes": 3, "bloque": [[0, 0]], "ecart": 2 }
    ],
    "DENSITES": {
      "prairie": { "herbe": { "rocher": 0.002, "pierres": 0.006, "gisement_fer": 0.0005 } },
      "foret": {
        "feuilles": { "rocher_moussu": 0.03, "pierres_moussues": 0.03, "gisement_fer": 0.0015, "gisement_cuivre": 0.001 },
        "aiguilles": { "rocher_moussu": 0.02, "rocher": 0.01, "pierres_moussues": 0.025, "gisement_fer": 0.0015, "gisement_cuivre": 0.001 },
        "mousse": { "rocher_moussu": 0.045, "pierres_moussues": 0.05 }
      },
      "lande": {
        "lande": { "rocher": 0.006, "bloc": 0.002, "pierres": 0.02, "gisement_fer": 0.002, "gisement_cuivre": 0.0015 },
        "terre": { "rocher": 0.01, "bloc": 0.004, "pierres": 0.06, "gisement_fer": 0.003, "gisement_cuivre": 0.002 }
      },
      "marais": { "vase": { "pierres_moussues": 0.006 } },
      "plage": {
        "sable": { "rocher": 0.002, "galets": 0.01, "coquillages": 0.05, "etoile_mer": 0.012, "algues": 0.04 },
        "galets": { "rocher": 0.012, "galets": 0.16, "coquillages": 0.02, "algues": 0.03 }
      },
      "montagne": {
        "eboulis": {
          "rocher": 0.012,
          "bloc": 0.01,
          "galets": 0.05,
          "pierres": 0.1,
          "gisement_fer": 0.003,
          "gisement_cuivre": 0.003,
          "gisement_or": 0.0015,
          "cristaux_quartz": 0.004
        },
        "roche": {
          "bloc": 0.014,
          "piton": 0.01,
          "rocher": 0.008,
          "pierres": 0.08,
          "gisement_cuivre": 0.002,
          "gisement_or": 0.002,
          "gisement_platine": 0.0025,
          "cristaux_quartz": 0.005,
          "cristaux_amethyste": 0.002
        },
        "haut": {
          "rocher_neige": 0.03,
          "sapin_neige": 0.03,
          "piton_neige": 0.006,
          "congere": 0.025,
          "pierres": 0.03,
          "gisement_or": 0.0015,
          "gisement_platine": 0.003,
          "cristaux_quartz": 0.004,
          "cristaux_amethyste": 0.004
        }
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
      "chataignier": {
        "geste": "couper",
        "coups": 3,
        "coup": { "bois": 1 },
        "fin": { "bois": [2, 3] },
        "retour": [5, 8],
        "aussi": { "geste": "cueillir", "variantes": [0, 1], "apres": 2, "fin": { "chataigne": [3, 5] }, "retour": [4, 7] }
      },
      "champignons": { "geste": "ramasser", "fin": { "champignon": [1, 2] }, "retour": [3, 6] },
      "champignon_blanc": { "geste": "ramasser", "fin": { "champignon": [1, 2] }, "retour": [3, 6] },
      "champignon_jaune": { "geste": "ramasser", "fin": { "champignon": [1, 2] }, "retour": [3, 6] },
      "champignon_bleu": { "geste": "ramasser", "fin": { "champignon": [1, 2] }, "retour": [3, 6] },
      "touffe_mont": { "geste": "ramasser", "fin": { "herbes_montagne": [1, 1] }, "retour": [4, 6] },
      "coquelicot": { "geste": "ramasser", "fin": { "fleur_coquelicot": [2, 3] }, "chance": { "graine_coquelicot": 25 }, "retour": [4, 7] },
      "pavot_californie": { "geste": "ramasser", "fin": { "fleur_pavot": [2, 3] }, "chance": { "graine_pavot": 25 }, "retour": [4, 7] },
      "tournesol_sauvage": { "geste": "ramasser", "fin": { "fleur_tournesol": [2, 3] }, "chance": { "graine_tournesol": 25 }, "retour": [4, 7] },
      "myosotis": { "geste": "ramasser", "fin": { "fleur_myosotis": [2, 3] }, "chance": { "graine_myosotis": 25 }, "retour": [4, 7] },
      "lavande": { "geste": "ramasser", "fin": { "fleur_lavande": [2, 3] }, "chance": { "graine_lavande": 25 }, "retour": [4, 7] },
      "lupin": { "geste": "ramasser", "fin": { "fleur_lupin": [2, 3] }, "chance": { "graine_lupin": 25 }, "retour": [4, 7] },
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
      "gisement_fer": {
        "geste": "casser",
        "minerai": "fer",
        "coups": 6,
        "coup": { "pierre": 1 },
        "fin": { "minerai_fer": [3, 5] },
        "retour": [8, 12]
      },
      "gisement_cuivre": {
        "geste": "casser",
        "minerai": "cuivre",
        "coups": 6,
        "coup": { "pierre": 1 },
        "fin": { "minerai_cuivre": [3, 5] },
        "retour": [8, 12]
      },
      "gisement_or": { "geste": "casser", "minerai": "or", "coups": 8, "coup": { "pierre": 1 }, "fin": { "minerai_or": [2, 4] }, "retour": [10, 15] },
      "champignons_lumineux": { "geste": "ramasser", "fin": { "champignon_lumineux": [1, 2] }, "retour": [2, 4] },
      "cristaux_quartz": { "geste": "casser", "coups": 2, "fin": { "quartz": [1, 2] }, "retour": [6, 10] },
      "cristaux_amethyste": { "geste": "casser", "coups": 3, "fin": { "amethyste": [1, 2] }, "retour": [8, 12] },
      "gisement_platine": {
        "geste": "casser",
        "minerai": "platine",
        "coups": 8,
        "coup": { "pierre": 1 },
        "fin": { "minerai_platine": [2, 3] },
        "retour": [12, 18]
      },
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
      { "nom": "cale", "genre": "ponton", "variantes": 4, "recit": true, "boite": [14, 28] },
      {
        "nom": "ruine",
        "genre": "secret",
        "variantes": 2,
        "bloque": [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [2, -1]],
        "boite": [36, 34]
      },
      { "nom": "cairn", "genre": "secret", "variantes": 1, "bloque": [[0, 0]], "boite": [12, 30] },
      { "nom": "arbre_ancien", "genre": "secret", "variantes": 1, "bloque": [[-1, 0], [0, 0], [1, 0]], "boite": [30, 70] },
      { "nom": "belvedere", "genre": "secret", "variantes": 1, "bloque": [[-1, 0], [1, 0]], "boite": [26, 30] },
      { "nom": "pierre_levee", "genre": "secret", "variantes": 1, "bloque": [[0, 0]], "boite": [12, 40] },
      { "nom": "geode", "genre": "recit", "variantes": 1, "bloque": [[-1, 0], [0, 0], [1, 0]], "boite": [22, 40] }
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
    "APPARENCE": {
      "PILOSITE": 35,
      "ROUSSEUR": 15,
      "JOUES": 10,
      "JOUES_ENFANT": 60,
      "MOTIF": 40,
      "COUVRE_CHEF": 30,
      "LUNETTES": 12,
      "BOUCLES": 10,
      "PANSEMENT_ENFANT": 8,
      "CHEVEUX_RARES": ["roses", "bleus", "verts", "violets"],
      "RARES": 6,
      "ESSAIS": 6
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
        "chemin": ["Je file au travail.", "Pardon, je passe !", "Bonne journée, à tout à l'heure !"],
        "joue": ["On joue à chat !", "Tu veux jouer avec nous ?", "Je cours plus vite que toi !", "On a vu un lapin près du puits !"],
        "repas": ["C'est l'heure de manger.", "Ça sent bon à la maison.", "À table !"],
        "rentre": ["Je rentre à la maison.", "La soupe nous attend.", "Encore une bonne journée."],
        "soir": ["On se repose un peu avant la nuit.", "Quelle journée !", "Bientôt l'heure d'aller au lit."],
        "fete": [
          "C'est la fête ce soir ! Viens danser avec nous !",
          "Tu as goûté le plat de fête ? Il en reste !",
          "Toute la place est là, ça fait plaisir.",
          "Une fête sans toi, ça n'aurait pas été pareil.",
          "Écoute, on chante ! Tu connais l'air ?"
        ]
      },
      "travail": {
        "bucheron": [
          "Le bois ne se coupe pas tout seul !",
          "Les arbres repousseront, ne t'en fais pas.",
          "Une bonne flambée pour les nuits fraîches."
        ],
        "pecheur": ["Ça mord, aujourd'hui.", "Chut… je crois que ça mord !", "La patience, c'est tout le métier."],
        "mineur": ["Il y a de jolis cristaux, par ici.", "Il y a du fer dans cette montagne.", "Un coup de pioche après l'autre."],
        "berger": ["Mes bêtes ont bon appétit.", "Le lait sera bon ce soir.", "La laine pousse avec le beau temps."],
        "cueilleur": ["Les buissons sont pleins de baies.", "Je connais les bons coins à champignons.", "Rien ne vaut les mûres du matin."],
        "jardinier": ["Le potager demande du soin.", "Les légumes poussent bien cette année.", "Encore un rang à désherber."]
      },
      "humeur": {
        "heureux": ["On vit bien, au hameau.", "La vie est douce, ici.", "On mange bien et on dort bien."],
        "content": ["Ça va, ça va.", "Tout va bien, merci !", "Encore une belle journée."],
        "triste": [
          "On a eu une petite semaine. Ça ira mieux demain !",
          "Une bonne sieste, et il n'y paraîtra plus.",
          "Un peu de soleil nous ferait du bien."
        ],
        "faim": ["Le garde-manger est un peu léger, ces jours-ci.", "On mangerait bien une bonne soupe."]
      }
    },
    "PROPOS": {
      "_": [
        "V-1 (docs/phase-4.md) : ce que disent les habitants de ce qu'ils voient. Chaque sujet a sa condition (js/engine/propos.js) ; {mots} entre accolades : remplacés par la partie. PART : la part des conversations où un sujet est dit (sinon les PHRASES) ; MEMOIRE : les derniers sujets d'un habitant, qu'il ne redit pas ; ENFANTS : les seuls sujets d'un enfant (un adulte dit tous les autres, sauf « …_enfant »)."
      ],
      "PART": 0.6,
      "MEMOIRE": 4,
      "ENFANTS": [
        "meteo_pluie",
        "meteo_brume",
        "lune_pleine",
        "lune_nouvelle",
        "lune_croissante",
        "lune_decroissante",
        "famille_enfant",
        "ferme_poules_enfant",
        "jours_enfant",
        "fete_place",
        "voisin_enfant",
        "fete_bientot",
        "fete_aujourdhui",
        "fete_souvenir"
      ],
      "ferme_cultures": [
        "On voit ton coin de {culture} depuis le chemin : il a fière allure !",
        "Paraît que tu fais pousser de la {culture}. Tu me garderas un conseil ?",
        "Ton potager, on en parle jusqu'ici. Surtout ta {culture} !",
        "De la {culture} à la ferme ? Ça me donne des idées pour mon jardin.",
        "Tu arroses ta {culture} le matin ou le soir ? Chez nous, on hésite toujours.",
        "J'ai goûté une {culture} comme la tienne, une fois. Quel souvenir !",
        "Avec toute cette {culture}, tu ne dois pas manquer de soupe.",
        "Le jour où tu as trop de {culture}, pense à nous !",
        "{n} parcelles cultivées ? Tu as la main verte.",
        "La {culture}, ça aime la patience. Et toi, tu en as, de la patience !"
      ],
      "ferme_vide": [
        "Ton potager se repose ? La terre aime bien ça, de temps en temps.",
        "Alors, qu'est-ce que tu vas planter ?",
        "Un potager vide, c'est un potager qui attend une idée.",
        "Si tu cherches quoi semer, la carotte ne déçoit jamais.",
        "Une houe, quelques graines, un peu d'eau : c'est tout ce qu'il faut pour commencer."
      ],
      "ferme_poules": [
        "Tes {n} poules, elles pondent bien ?",
        "On entend tes poules d'ici, le matin. Enfin… presque.",
        "Des poules à la ferme, c'est des œufs au petit-déjeuner !",
        "Une ferme avec des poules, c'est une ferme qui vit.",
        "Un peu de blé chaque jour, et tes poules te le rendront en œufs."
      ],
      "ferme_poules_enfant": [
        "C'est vrai que tu as des poules ? Je peux venir les voir ?",
        "Tes poules, elles ont des prénoms ?",
        "J'aimerais bien ramasser les œufs avec toi !",
        "Est-ce que tes poules courent aussi vite que moi ?"
      ],
      "ferme_moutons": [
        "Tes moutons, tu les tonds toi-même ? Ce n'est pas facile !",
        "Une laine de ta ferme, ça ferait de beaux pulls pour les soirées fraîches.",
        "Combien de moutons, maintenant ? {n} ? Bravo !",
        "Les moutons aiment la paille bien sèche. Les tiens doivent être gâtés."
      ],
      "ferme_vaches": [
        "Du lait frais tous les matins, quelle chance tu as !",
        "Tes vaches ont l'air bien soignées, ça se voit à leur lait.",
        "Une vache, c'est une amie qui donne du lait. Prends-en soin !",
        "On dit que les herbes de montagne donnent un lait d'alpage. Tu as essayé ?"
      ],
      "ferme_ruches": [
        "Des ruches à la ferme ? Le miel doit être doux, avec toutes ces fleurs.",
        "Les abeilles aiment les fleurs. Plantes-en autour de tes ruches !",
        "Ton miel, il paraît qu'il a un goût de prairie.",
        "Le bourdonnement des abeilles, c'est la plus belle musique de l'été."
      ],
      "ferme_verger": [
        "Un verger, c'est un cadeau pour dans dix ans. Et pour tout de suite aussi !",
        "Tes arbres fruitiers ont bien pris ?",
        "Rien ne vaut un fruit cueilli sur son propre arbre.",
        "{n} arbres au verger ? Il en faudra, des paniers !"
      ],
      "ferme_maison": [
        "On dit que ta maison a bien changé depuis ton arrivée.",
        "Ta ferme commence à te ressembler, à ce qu'on raconte.",
        "Il paraît que tu as encore construit quelque chose. Tu ne t'arrêtes jamais !",
        "Une maison qui grandit, c'est une famille heureuse.",
        "Le jour où tu nous invites, on viendra voir ta maison !"
      ],
      "ferme_moulin": [
        "Un moulin à la ferme ! Ta farine doit être fine.",
        "Avec ton moulin, tu fais ton pain toi-même ? Chapeau.",
        "Le moulin qui tourne, ça s'entend de loin, les jours de vent."
      ],
      "cadeau_merci": [
        "Merci encore pour ton cadeau. On en parle encore à la maison !",
        "Ton cadeau de l'autre jour m'a fait tellement plaisir.",
        "Tu sais, je repense encore à ton cadeau. C'était gentil.",
        "Ton cadeau a trouvé sa place chez nous. Merci !"
      ],
      "gout_connu": [
        "Tu te souviens de ce que j'aime ? {objet}, toujours !",
        "{objet}… rien que d'y penser, j'ai faim !",
        "{objet} : si un jour tu en as en trop, tu sais à qui penser !",
        "Tu as bonne mémoire : {objet}, c'est mon péché mignon."
      ],
      "voisin": [
        "Tu connais {voisin} ? Passe lui dire bonjour de ma part.",
        "{voisin} m'a parlé de toi hier. Que du bien !",
        "Avec {voisin}, on s'entraide quand il le faut. C'est ça, un hameau.",
        "{voisin} travaille dur ces temps-ci. On devrait tous lui dire merci.",
        "Si tu vois {voisin}, dis-lui que je lui garde une part de tarte.",
        "{voisin} a ri toute la soirée hier. Ça fait du bien à tout le monde."
      ],
      "voisin_metier": [
        "Sans {voisin} et son métier de {metier}, le hameau serait bien triste.",
        "{voisin} a promis de m'apprendre son métier de {metier}. On verra !",
        "Le métier de {metier}, c'est {voisin} qui le connaît le mieux, ici."
      ],
      "voisin_enfant": [
        "Je joue souvent avec {voisin} ! On fait la course jusqu'au puits.",
        "{voisin} sait grimper aux arbres. Moi aussi, presque !",
        "Avec {voisin}, on a trouvé une cachette secrète. Chut !"
      ],
      "famille_enfant": [
        "{parent} dit que je dois être sage aujourd'hui.",
        "Chez nous, c'est {parent} qui fait la meilleure soupe.",
        "{parent} rentre bientôt, je l'attends !",
        "{parent} m'a appris à reconnaître les oiseaux."
      ],
      "famille_parent": [
        "{enfant} ne tient pas en place, ces jours-ci !",
        "{enfant} a encore couru partout ce matin.",
        "Si tu vois {enfant} près du puits, dis-lui de rentrer !",
        "{enfant} grandit si vite…",
        "{enfant} veut faire le même métier que moi, plus tard."
      ],
      "lune_pleine": [
        "La lune est pleine, cette nuit. On dit qu'elle porte bonheur aux semis.",
        "Pleine lune ce soir : on verra le chemin jusqu'au puits !",
        "Une nuit de pleine lune, c'est une nuit de veillée."
      ],
      "lune_nouvelle": [
        "Nouvelle lune… cette nuit, les étoiles seront à nous.",
        "Il fera bien noir ce soir, c'est la nouvelle lune. Ne te perds pas !"
      ],
      "lune_croissante": ["La lune grandit, chaque soir un peu plus.", "Bientôt la pleine lune ! On prépare déjà la veillée."],
      "lune_decroissante": ["La lune décroît. Bientôt les nuits sans lune.", "La lune s'en va doucement. Elle reviendra."],
      "meteo_pluie": [
        "Il va pleuvoir aujourd'hui, je le sens dans mes genoux.",
        "Une averse, aujourd'hui ! Mes plantes vont être contentes.",
        "Avec la pluie, pas besoin d'arroser. Profites-en !",
        "On dirait que le ciel va se vider sur nous, tout à l'heure."
      ],
      "meteo_brume": [
        "Quelle brume ce matin ! On n'y voyait pas à trois pas.",
        "La brume du matin, ça annonce une belle journée.",
        "Avec cette brume, j'ai cru voir un fantôme… c'était un mouton !"
      ],
      "lien_ami": [
        "{ami} et moi, on se connaît depuis toujours.",
        "Si tu cherches {ami}, on est souvent ensemble le soir.",
        "Avec {ami}, on se raconte tout. Enfin, presque !",
        "{ami} m'a prêté ses outils la semaine dernière. Un vrai ami."
      ],
      "lien_cousin": [
        "{cousin_mot} {cousin} vit {a_hameau}. Si tu passes par là, salue-{le} de ma part !",
        "Tu connais {hameau} ? {cousin_mot} {cousin} y habite.",
        "On ne se voit pas assez souvent, avec {cousin_mot_min} {cousin}, {de_hameau}."
      ],
      "visite_recue": [
        "{qui} est venu{e_qui} {de_hameau} me voir. Ça m'a fait chaud au cœur !",
        "Tu as croisé {qui} ? {il_qui} est venu{e_qui} {de_hameau} juste pour nous.",
        "On a eu de la visite : {qui}, {de_hameau}. On a parlé jusqu'à la nuit !"
      ],
      "visite_faite": [
        "Je suis allé{e} voir {chez} {a_hameau}. Quelle route !",
        "J'ai rendu visite à {chez}, {a_hameau}. On a bien ri.",
        "{chez} m'a reçu{e} à bras ouverts, {a_hameau}."
      ],
      "entraide_recue": [
        "On manquait de tout l'autre jour… {qui} nous a apporté à manger. On n'oublie pas ça.",
        "Sans {qui}, on aurait eu le ventre vide. Quelle chance d'avoir des voisins pareils !"
      ],
      "entraide_donnee": [
        "Chez {aide}, on manquait de tout : je leur ai porté un peu de mon garde-manger. C'est normal, entre voisins.",
        "Quand quelqu'un manque de quelque chose, on partage. Hier, c'était pour {aide}."
      ],
      "mois": ["Déjà le mois de {mois} ! Le temps passe vite.", "{mois} commence… J'aime bien ce mois-là.", "On est en {mois}. Il faut fêter ça !"],
      "reserve_hier": [
        "Hier soir, la réserve s'est remplie. {objet} surtout ! Le hameau est content.",
        "La réserve sent bon, ce matin : {objet}, tout frais d'hier !",
        "On a bien travaillé hier. {objet} plein la réserve !",
        "Tu sais ce qu'on a rapporté hier ? {objet}, en quantité !"
      ],
      "caleche": [
        "La calèche est passée il y a {jours} jours. Elle nous a laissé {pieces} pièces !",
        "Quand la calèche passe, tout le hameau sort pour la voir.",
        "Le cocher de la calèche a toujours une histoire à raconter sur les autres hameaux.",
        "Grâce à la calèche, nos paniers voyagent plus loin que nous."
      ],
      "projet": [
        "Pour le projet du hameau ({projet}), il nous manque encore {n} × {objet}. Si tu en as, on te dira merci !",
        "Notre projet avance : {projet} ! Il ne manque plus que {n} × {objet}.",
        "Encore {n} × {objet}, et notre projet sera fait : {projet} !",
        "Chaque soir, on regarde où en est le projet du hameau. Bientôt !"
      ],
      "ami_proche": [
        "Toi, au moins, tu passes nous voir. Ça compte.",
        "Quand je te vois arriver, ma journée s'éclaire.",
        "Tu fais partie du hameau, maintenant. Tu le sais ?",
        "Il y a toujours une place pour toi à notre table.",
        "Je raconte tes histoires de ferme à tout le monde !",
        "Si tu as besoin de quoi que ce soit, tu sais où me trouver."
      ],
      "jours": [
        "Ça fait déjà {jours} jours que tu as repris la ferme. Le temps file !",
        "{jours} jours à la ferme… et tu as déjà changé tant de choses.",
        "Tu te souviens de ton premier jour ? C'était il y a {jours} jours !"
      ],
      "jours_enfant": [
        "Tu es là depuis {jours} jours, c'est ça ? J'ai compté !",
        "Moi, je sais compter jusqu'à {jours}. C'est le nombre de jours depuis que tu es là !"
      ],
      "fete_bientot": [
        "{Fete}, c'est {quand} ! Tu viendras ?",
        "On prépare {fete} : {quand}, sur la place, à partir de {debut} h.",
        "Tu sais quoi ? {Fete}, c'est {quand}. Il y aura à manger pour tout le monde !",
        "Plus que quelques jours avant {fete} ! Viens donc, {quand}, vers {debut} h."
      ],
      "fete_aujourdhui": [
        "Ce soir, c'est {fete} ! Rendez-vous sur la place à {debut} h.",
        "Tu restes pour {fete} ? Ça commence à {debut} h.",
        "On a tout préparé pour ce soir. {Fete}, à {debut} h, ne la manque pas !"
      ],
      "fete_souvenir": [
        "Merci pour ta venue à {fete} ! On en parle encore.",
        "Quelle belle fête c'était, avec toi sur la place !",
        "{Fete}, tu t'en souviens ? On a dansé jusqu'au soir !"
      ],
      "fete_place": [
        "La place est belle, maintenant ! On y joue tous les jours.",
        "Tu as vu la nouvelle place ? C'est grâce à toi aussi !",
        "On a fait une fête sur la place. Tu aurais dû venir !"
      ]
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
    "DERIVE": { "NUITS": 3, "POINTS": { "basse": 0, "moyenne": 0, "haute": 0 }, "PLANCHER": 20 },
    "FINS": {
      "GRANDE": "haute",
      "ENTRETIEN": 4,
      "NATURE": 10,
      "POIDS": { "promesse": 1, "toit": 1, "enveloppe": 3 },
      "LISTE": ["nouveau_maurice", "voisin_tranquille", "autrement", "genereuse"]
    },
    "ENVELOPPE": { "OBJET": "enveloppe_maurice", "PIECES": 15000, "CONFIANCE": 5 },
    "USURE": { "ACTE": 3, "NUITS": 4, "MAX": 2, "REPARER": { "planche": 6, "pierre": 4 }, "CONFIANCE": 5, "ENVELOPPE_CONFIANCE": 3 },
    "TOURNEE": ["genets", "bois_joli"],
    "FIL": {
      "FRAGMENTS": ["note_etoile", "journal_bord", "releves_frida", "ciel_pleine", "ciel_noire", "ciel_croissante"],
      "GALERIE": { "LUNE": "pleine", "HEURES": [22, 4] },
      "PIERRE": { "OBJET": "pierre_lune", "POUSSE": 0.75 },
      "LUEUR": [20, 6],
      "OBSERVATOIRE": {
        "NUITS": 2,
        "NUIT": [20, 6],
        "PAGES": { "pleine": "ciel_pleine", "nouvelle": "ciel_noire", "croissante": "ciel_croissante" },
        "JOUR": "L'observatoire de Maurice : une longue-vue tournée vers le ciel, un plaid. Un carnet attend sur la table.",
        "ACCUEIL": [
          "La longue-vue de Maurice attend, tournée vers la lune.",
          "Une tasse, un plaid, un carnet : tout est prêt pour regarder le ciel.",
          "Un mot de Philomène, sur la table : « N'oublie pas ton écharpe, il fait frais là-haut. »",
          "Le ciel est immense, ce soir."
        ],
        "PIERRE": "Une page qu'on n'avait pas vue : « Si tu lis ceci, tu l'as trouvée. Laisse-la briller chez toi. M. »"
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
      "maurice": { "nom": "Maurice", "role": "le grand-père, l'ancien cocher, parti en voyage avec Philomène", "lieu": "en voyage" },
      "achille": { "nom": "Achille", "role": "le cocher", "lieu": "Le Gué", "perso": 8 },
      "odile": { "nom": "Odile", "role": "la grand-mère du Gué", "lieu": "Le Gué", "perso": 16, "habite": { "hameau": "gue", "genre": "f" } },
      "fernand": {
        "nom": "Fernand",
        "role": "le pêcheur conteur",
        "lieu": "Les Mouettes",
        "perso": 12,
        "habite": { "hameau": "mouettes", "genre": "m", "metier": "pecheur" }
      },
      "garance": {
        "nom": "Garance",
        "role": "la tisserande",
        "lieu": "Les Genêts",
        "perso": 30,
        "habite": { "hameau": "genets", "genre": "f", "metier": "berger" }
      },
      "lise": {
        "nom": "Lise",
        "role": "la fille de Garance",
        "lieu": "Les Genêts",
        "perso": 32,
        "habite": { "hameau": "genets", "genre": "f", "enfant": true, "avec": "garance" }
      },
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
      "frida": {
        "nom": "Frida",
        "role": "l'inventrice",
        "lieu": "Le Gué (son atelier : au bord de l'étang)",
        "perso": 34,
        "habite": { "hameau": "gue", "genre": "f" }
      },
      "compagnon": { "nom": "le compagnon", "role": "le second adulte de la famille", "lieu": "la ferme" }
    },
    "FRAGMENTS": {
      "carnet_promesses": {
        "titre": "Un carnet de tournée de Maurice",
        "texte": "Genêts : le toit de l'atelier de Garance, plus de lumière pour ses couleurs. Bois-Joli : les lames de la scie. Mouettes : la pompe, avec Fernand. É. : passer dire bonsoir."
      },
      "note_etoile": {
        "titre": "La note « É. »",
        "texte": "É. : bonsoir. Toujours là, au chaud sous la terre du milieu. Elle brille plus fort à la pleine lune."
      },
      "journal_bord": {
        "titre": "Le journal de bord des premiers arrivants",
        "texte": "« Nous avons suivi l'étoile tombée jusqu'au milieu de l'île. C'est là que nous resterons. »"
      },
      "releves_frida": {
        "titre": "Les relevés de Frida",
        "texte": "Une carte de l'île : les récoltes de pleine lune gagnent le plus au centre, là où est la ferme."
      },
      "ciel_pleine": {
        "titre": "Le carnet du ciel, pleine lune",
        "texte": "« Pleine lune. Les lucioles sont revenues au-dessus des bois du milieu. Elles savent. »"
      },
      "ciel_noire": {
        "titre": "Le carnet du ciel, nuit noire",
        "texte": "« Nuit noire. Sans la lune, on voit mieux la petite lueur, en bas, dans les bois. »"
      },
      "ciel_croissante": {
        "titre": "Le carnet du ciel, lune montante",
        "texte": "« Lune montante. Philomène dit que tout pousse plus vite chez nous. Elle a raison, comme toujours. »"
      },
      "souvenir_lise": {
        "titre": "Ce que Lise a vu",
        "texte": "« Une nuit de pleine lune, j'ai vu des lucioles danser au-dessus des bois de chez toi. Des centaines ! Mais je dis pas. »"
      }
    },
    "SCENES": [
      {
        "id": "arrivee",
        "quand": { "installee": true, "jour_max": 1, "sans_fait": "arrivee" },
        "priorite": 100,
        "carte": true,
        "lignes": [
          { "qui": "fernand", "texte": "Vous voilà ! Bienvenue à Céron. Vous êtes la famille de Maurice et Philomène, ça se voit au sourire." },
          { "qui": "joueur", "texte": "Bonjour ! On est bien arrivés, alors ?" },
          { "qui": "fernand", "texte": "Pile au bon endroit. Voici votre terre : c'est ici que tout commence pour vous." },
          { "qui": "joueur", "texte": "Elle est… plus sauvage que dans mes souvenirs." },
          {
            "qui": "fernand",
            "quand": { "enfants": true },
            "texte": "Et vous, les petits ! Un matin, je vous montrerai où les dauphins viennent jouer."
          },
          { "qui": "fernand", "texte": "Elle vous attendait, voilà tout. La calèche passe demain, Achille vous dira tout. Bonne première journée !" }
        ],
        "effet": { "fait": ["arrivee", "arrivee_enfants"], "relation": { "fernand": 10 } }
      },
      {
        "id": "achille_cle",
        "quand": { "chapitre_min": 2, "lieu": "caleche_ferme", "sans_fait": "achille.cle" },
        "priorite": 100,
        "lignes": [
          { "qui": "achille", "nom": "Le cocher", "texte": "Ho, Biscotte. Regarde qui c'est." },
          { "qui": "achille", "nom": "Le cocher", "texte": "Toi, t'as le sourire de ta mère." },
          { "qui": "achille", "texte": "Achille. Je mène la calèche. C'est ton grand-père qui m'a tout appris." },
          { "qui": "achille", "texte": "Tiens, la clé de leur maison, au Gué. On ferme pas, ici. Mais Maurice voulait que ce soit toi qui l'aies." },
          { "qui": "achille", "texte": "Il a laissé des carnets un peu partout. J'en ai deux. Je te les prêterai." },
          { "qui": "achille", "texte": "Je passe tous les jours vers dix heures. T'as du surplus, je prends. Biscotte aussi, si c'est des carottes." }
        ],
        "effet": { "fait": "achille.cle", "relation": { "achille": 10 }, "montrer": "gue" }
      },
      {
        "id": "odile_maison",
        "quand": { "fait": "achille.cle", "lieu": "maison_maurice", "sans_fait": "odile.rencontre" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": { "m": "Te voilà ! Le petit d'Adèle.", "f": "Te voilà ! La petite d'Adèle." } },
          { "qui": "odile", "texte": "Elle t'a dit de passer me voir, j'imagine. Elle a bien fait." },
          { "qui": "odile", "texte": "J'arrose leurs géraniums en attendant qu'ils reviennent. Maintenant, on sera deux." },
          { "qui": "odile", "texte": "Tiens, un de ses carnets. Il les oubliait partout." }
        ],
        "effet": { "fait": ["odile.rencontre", "odile.tutoie"], "relation": { "odile": 10 }, "fragment": "carnet_promesses" }
      },
      {
        "id": "veillee_1",
        "quand": { "acte_min": 2, "lieu": "gue", "lune": "pleine", "heure": [19, 22], "fait": "odile.rencontre", "sans_fait": "veillee.1" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Assieds-toi près de moi. Les soirs de pleine lune, on la regarde ensemble." },
          { "qui": "garance", "quand": { "fait": "promesse.toit_garance.commencee" }, "texte": "C'est toi, pour mon toit ? Ça me touche, tu sais." },
          {
            "qui": "garance",
            "quand": { "sans_fait": "promesse.toit_garance.commencee", "machines": true },
            "texte": "Il paraît que t'as un robot ! Tu crois qu'il saurait carder la laine ?"
          },
          {
            "qui": "fernand",
            "quand": {
              "sans_fait": ["promesse.toit_garance.commencee", "promesse.scie_bois_joli.commencee", "promesse.pompe_mouettes.commencee"],
              "machines": false
            },
            "texte": "Ta première veillée ! Profites-en, les tartes d'Odile partent vite."
          },
          { "qui": "odile", "texte": "Voilà, tu as vu ta première pleine lune ici. Tu es de la maison." },
          { "qui": "achille", "texte": "Maurice arrivait toujours au dessert, la cloche à la main. Toi, t'es là dès l'entrée. Ça fait plaisir." }
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
              "m": "Alors c'est toi ! La dernière fois que je t'ai vu, tu tenais dans un panier.",
              "f": "Alors c'est toi ! La dernière fois que je t'ai vue, tu tenais dans un panier."
            }
          },
          { "qui": "frida", "texte": "Frida. J'invente des machines et j'observe les bêtes. Ta grand-mère est ma meilleure amie." },
          { "qui": "frida", "texte": "Un robot qui récolte, une station pour le recharger : trois heures gagnées par jour." },
          { "qui": "frida", "texte": "Trois heures pour faire ce que tu aimes. Ou pour venir boire le thé chez moi !" },
          { "qui": "frida", "quand": { "empreinte": "basse" }, "texte": "Ta ferme est petite et jolie. Une machine s'y plairait." },
          { "qui": "frida", "quand": { "empreinte": ["moyenne", "haute"] }, "texte": "Ta ferme grandit vite ! Mes machines adoreraient t'aider." },
          { "qui": "frida", "texte": "Passe me voir, mon atelier est au bord de l'étang. Il y a toujours du thé." }
        ],
        "effet": { "fait": ["frida.rencontre", "frida.ferme"], "relation": { "frida": 10 } }
      },
      {
        "id": "frida_ferme_amie",
        "quand": { "acte_min": 2, "chapitre_min": 4, "lieu": "ferme", "fait": "frida.rencontre", "sans_fait": "frida.ferme" },
        "priorite": 90,
        "lignes": [
          { "qui": "frida", "texte": "Me voilà chez toi ! Je voulais voir ta ferme de mes propres yeux." },
          { "qui": "frida", "texte": "Un robot qui récolte, une station pour le recharger : trois heures gagnées par jour." },
          { "qui": "frida", "texte": "Trois heures pour faire ce que tu aimes. Ou pour venir boire le thé chez moi !" },
          { "qui": "frida", "quand": { "empreinte": "basse" }, "texte": "Ta ferme est petite et jolie. Une machine s'y plairait." },
          { "qui": "frida", "quand": { "empreinte": ["moyenne", "haute"] }, "texte": "Ta ferme grandit vite ! Mes machines adoreraient t'aider." },
          { "qui": "frida", "texte": "Passe me voir, mon atelier est au bord de l'étang. Il y a toujours du thé." }
        ],
        "effet": { "fait": ["frida.rencontre", "frida.ferme"], "relation": { "frida": 10 } }
      },
      {
        "id": "maurice_tournee",
        "quand": { "acte_min": 2, "lieu": "caleche_ferme", "jour_min": 21, "palier_min": 2, "fait": "veillee.1", "sans_fait": "maurice.fortune" },
        "priorite": 80,
        "lignes": [
          { "qui": "achille", "texte": "Tu sais ce que faisait Maurice, pendant la tournée ?" },
          { "qui": "achille", "texte": "Il réparait un peu partout. Un toit ici, une scie là, la pompe des Mouettes." },
          { "qui": "achille", "texte": "Il disait que l'île, c'est comme un jardin : un peu de soin chaque jour." },
          { "qui": "achille", "texte": "Avant de partir, il a pas eu le temps de tout finir. C'est noté dans son carnet." },
          { "qui": "achille", "texte": "Si un jour ça te dit… Rien ne presse, hein." }
        ],
        "effet": { "fait": "maurice.fortune", "relation": { "achille": 5 } }
      },
      {
        "id": "veillee_ferme",
        "quand": { "debloque": "veillee", "lieu": "ferme", "lune": "pleine", "heure": [19, 22], "sans_fait": "veillee.ferme" },
        "priorite": 95,
        "lignes": [
          { "qui": "odile", "texte": "On a vu ta lumière depuis le chemin. Alors on est venus !" },
          { "qui": "fernand", "texte": "Chez toi, la lune se voit encore mieux. C'est la terre du milieu, ça." },
          { "qui": "achille", "texte": "Maurice et Philomène seraient contents de voir autant de monde chez eux." },
          { "qui": "odile", "texte": "On reviendra. Les soirs de pleine lune, laisse la porte ouverte." }
        ],
        "effet": { "fait": "veillee.ferme", "relation": { "odile": 5 }, "confiance_partout": 5 }
      },
      {
        "id": "note_etoile",
        "quand": { "lieu": "caleche_ferme", "palier_min": 3, "fait": "maurice.fortune", "sans_fragment": "note_etoile" },
        "priorite": 75,
        "lignes": [
          { "qui": "achille", "texte": "Tiens. Un des carnets de Maurice. Comme promis." },
          { "qui": "achille", "texte": "Il y a des « É. » partout dedans. J'ai jamais su ce que ça voulait dire." },
          { "qui": "achille", "texte": "Garde-le. Moi, je garde l'autre : il y a ses recettes de soupe." }
        ],
        "effet": { "fragment": "note_etoile", "relation": { "achille": 5 } }
      },
      {
        "id": "frida_releves",
        "quand": { "lieu": "atelier", "fait": ["frida.rencontre", "lieu.atelier"], "sans_fragment": "releves_frida" },
        "priorite": 90,
        "lignes": [
          { "qui": "frida", "texte": "Ah, te voilà ! Pousse les boulons, assieds-toi. Un thé ?" },
          { "qui": "frida", "texte": "Un chiffre ? 14 % de mieux aux récoltes de pleine lune. Et c'est au centre de l'île que ça pousse le mieux." },
          { "qui": "frida", "texte": "Là où est ta ferme. Odile dit que c'est la lune. Moi, je dis que c'est passionnant." },
          { "qui": "frida", "texte": "Tiens, garde la carte. J'en ai fait trois." }
        ],
        "effet": { "fragment": "releves_frida", "relation": { "frida": 10 } }
      },
      {
        "id": "frida_pierre",
        "quand": { "lieu": "atelier", "fait": ["frida.rencontre", "pierre.posee"], "sans_fait": "frida.pierre" },
        "priorite": 95,
        "lignes": [
          { "qui": "frida", "texte": "Ta ferme pousse plus vite. 25 % plus vite ! J'ai mesuré deux fois." },
          { "qui": "frida", "texte": "C'est peut-être le sol. Peut-être autre chose. J'adore ne pas savoir." }
        ],
        "effet": { "fait": "frida.pierre", "relation": { "frida": 5 } }
      },
      {
        "id": "enveloppe_odile",
        "quand": { "touche": "odile", "objet": "enveloppe_maurice", "fait": "odile.rencontre" },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Tiens, cette écriture, je la connais !" },
          { "qui": "odile", "quand": { "fait": "odile.tutoie" }, "texte": "Il fait toujours pareil : il laisse choisir, et il sait déjà." },
          { "qui": "odile", "quand": { "sans_fait": "odile.tutoie" }, "texte": "Il fait toujours pareil : il laisse choisir, et il sait déjà." },
          { "qui": "odile", "texte": "Les toits, on s'en occupera ensemble. Une maison par nuit, comme lui faisait." },
          { "qui": "odile", "texte": "Ici, on dit pas merci. On fait une tarte. Je t'en garde une part." }
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
          { "qui": "odile", "texte": "Ta deuxième veillée ! Ce soir, on parle de ta ferme. Tout le monde en dit du bien." },
          { "qui": "fernand", "quand": { "empreinte": "haute" }, "texte": "On voit ta ferme depuis la cale. Elle a l'air heureuse." },
          {
            "qui": "fernand",
            "quand": { "empreinte": ["basse", "moyenne"] },
            "texte": "Ta ferme est tranquille comme un matin de pêche. Ici, c'est un compliment."
          },
          {
            "qui": "garance",
            "quand": { "fait": "promesse.toit_garance" },
            "texte": "Mon toit a tenu sous l'averse ! Viens voir les couleurs à la lumière."
          },
          {
            "qui": "garance",
            "quand": { "sans_fait": "promesse.toit_garance", "machines": true },
            "texte": "Tes machines travaillent la nuit, il paraît. Tu me prêtes le robot pour carder ?"
          },
          {
            "qui": "basile",
            "quand": { "fait": "promesse.scie_bois_joli" },
            "texte": "Les lames neuves chantent juste. Le bois te dit merci. Moi aussi."
          },
          { "qui": "odile", "quand": { "fait": "enveloppe.donnee" }, "texte": "Les toits sont tout beaux. Tout le monde sait qui a aidé." },
          { "qui": "odile", "quand": { "fait": "enveloppe.ouverte" }, "texte": "L'enveloppe ? Maurice voulait que tu choisisses. Tu as bien choisi." },
          {
            "qui": "odile",
            "quand": { "fait": "toit.repare", "sans_fait": "enveloppe.donnee" },
            "texte": "Il paraît que tu montes sur les toits des autres. Lui aussi, tu sais."
          },
          { "qui": "achille", "texte": "Maurice parlait de toi au bout de la tournée. Maintenant, toute l'île parle de toi." }
        ],
        "effet": { "fait": "veillee.2", "relation": { "odile": 5, "achille": 5 }, "confiance_partout": 3 }
      },
      {
        "id": "theo_rencontre",
        "quand": { "touche": "theo", "sans_fait": "theo.rencontre" },
        "priorite": 90,
        "lignes": [
          { "qui": "theo", "texte": "C'est toi, celui de la ferme du milieu ? T'as vraiment vécu à Cadolon ?" },
          { "qui": "theo", "texte": "Moi c'est Théo. Je répare tout ! Les roues, les pompes, les inventions de Frida." },
          { "qui": "theo", "texte": "Papa dit que j'ai des doigts en or. Enfin, en chêne. Pour lui, c'est pareil." }
        ],
        "effet": { "fait": "theo.rencontre", "relation": { "theo": 10 } }
      },
      {
        "id": "theo_confie",
        "quand": { "touche": "theo", "acte_min": 3, "fait": "theo.rencontre", "palier_min": 1, "sans_fait": "theo.confie" },
        "priorite": 90,
        "lignes": [
          { "qui": "theo", "texte": "Tu sais ce que je veux faire, plus tard ? Des machines pour toute l'île !" },
          { "qui": "theo", "texte": "Partir ? Pourquoi faire ? Ici, il y a la mer, Frida, et tout à inventer." },
          { "qui": "theo", "texte": "Mais je sais pas par où commencer. La calèche, l'atelier de papa, ou chez Frida…" }
        ],
        "effet": { "fait": "theo.confie", "relation": { "theo": 5 } }
      },
      {
        "id": "basile_theo_apprenti",
        "quand": { "touche": "basile", "fait": ["theo.confie", "achille.tournee"], "sans_fait": "theo.choix" },
        "priorite": 95,
        "lignes": [
          { "qui": "basile", "texte": "Le petit hésite. Je l'entends réfléchir, les murs sont minces !" },
          { "qui": "basile", "texte": "Achille est passé. Il dit que t'as fait sa tournée. Il cherche quelqu'un pour la partager." },
          { "qui": "basile", "texte": "Le petit sur la calèche… Maurice a commencé comme ça." },
          { "qui": "basile", "texte": "Je lui dirai. Le chêne pousse où il veut, tant qu'il garde ses racines." }
        ],
        "effet": { "fait": ["theo.choix", "theo.apprenti"], "relation": { "basile": 10, "theo": 10, "achille": 5 } }
      },
      {
        "id": "basile_theo_atelier",
        "quand": { "touche": "basile", "fait": "theo.confie", "machines": true, "sans_fait": "theo.choix" },
        "priorite": 90,
        "lignes": [
          { "qui": "basile", "texte": "Le petit hésite. Je l'entends réfléchir, les murs sont minces !" },
          { "qui": "basile", "texte": "Chez toi, il paraît, des machines travaillent. Et ta terre est plus belle que jamais." },
          { "qui": "basile", "texte": "S'il veut mettre un moteur à ma scie… on l'essaiera ensemble." },
          { "qui": "basile", "texte": "Je lui dirai de commencer par la courroie. Et de m'apprendre." }
        ],
        "effet": { "fait": ["theo.choix", "theo.atelier"], "relation": { "basile": 10, "theo": 10, "frida": 5 } }
      },
      {
        "id": "basile_theo_frida",
        "quand": { "touche": "basile", "fait": "theo.confie", "sans_fait": "theo.choix" },
        "priorite": 80,
        "lignes": [
          { "qui": "basile", "texte": "Le petit hésite. Je l'entends réfléchir, les murs sont minces !" },
          { "qui": "basile", "texte": "Il passe ses journées chez Frida. Il revient avec des étoiles plein les yeux." },
          { "qui": "basile", "texte": "Le chêne, faut le laisser pousser vers la lumière." },
          { "qui": "basile", "texte": "Je lui dirai d'aller chez elle tous les matins. Le soir, il me racontera." }
        ],
        "effet": { "fait": ["theo.choix", "theo.frida"], "relation": { "basile": 5 } }
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
          { "qui": "achille", "texte": "Ho. Biscotte boite un peu. Rien de grave, mais il doit se reposer quelques jours." },
          { "qui": "achille", "texte": "Les Genêts et Bois-Joli attendent des nouvelles. Ils vont se demander." },
          { "qui": "achille", "texte": "Tu passes leur dire bonjour ? Maurice le faisait à pied, quand le cheval se reposait." }
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
          {
            "qui": "achille",
            "texte": {
              "m": "Garance t'a trouvé radieux. Basile t'a gardé une chaise.",
              "f": "Garance t'a trouvée radieuse. Basile t'a gardé une chaise."
            }
          },
          { "qui": "achille", "texte": "Biscotte va mieux. Faudrait que je trouve quelqu'un pour partager la tournée. À deux, c'est plus gai." }
        ],
        "effet": { "fait": "achille.tournee", "relation": { "achille": 15 } }
      },
      {
        "id": "achille_releve_theo",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": ["achille.tournee", "theo.apprenti"], "sans_fait": "achille.releve" },
        "priorite": 70,
        "lignes": [
          { "qui": "achille", "texte": "Le petit de Basile monte avec moi le jeudi. Il parle tout le temps. Biscotte adore." },
          { "qui": "achille", "texte": "Un jour, c'est lui qui mènera la calèche. Moi, je ferai les petites tournées." },
          { "qui": "achille", "texte": "C'est toi qui l'as envoyé. Je sais. Merci." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.theo"], "relation": { "achille": 10 } }
      },
      {
        "id": "achille_releve_jeune",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.tournee", "hameaux_min": 6, "sans_fait": "achille.releve" },
        "priorite": 65,
        "lignes": [
          { "qui": "achille", "texte": "Une petite d'un hameau du nord m'a arrêté sur la route. Elle veut apprendre la calèche." },
          { "qui": "achille", "texte": "Elle dit qu'elle t'a vu passer à pied chez tout le monde. Ça lui a donné l'idée." },
          { "qui": "achille", "texte": "Je l'emmène dès demain. Biscotte l'aime déjà." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.jeune"], "relation": { "achille": 5 } }
      },
      {
        "id": "achille_releve_personne",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.tournee", "sans_fait": "achille.releve" },
        "priorite": 60,
        "lignes": [
          { "qui": "achille", "texte": "Personne encore pour partager la calèche. C'est pas grave, j'aime ma tournée." },
          { "qui": "achille", "texte": "Et puis, je t'ai, toi, les jours où Biscotte se repose." }
        ],
        "effet": { "fait": ["achille.releve", "achille.releve.personne"] }
      },
      {
        "id": "fete_annonce",
        "quand": { "acte_min": 4, "lieu": "caleche_ferme", "fait": "achille.cle", "sans_fait": "fete.annonce" },
        "priorite": 95,
        "lignes": [
          { "qui": "achille", "texte": "Ho ! La fête des premiers arrivants, c'est à la pleine lune. À Brumeval, le soir." },
          { "qui": "achille", "texte": "Une fois l'an, on fête ceux qui sont arrivés les premiers. Et ceux qui viennent d'arriver : toi !" },
          { "qui": "achille", "texte": "Tout le monde y monte. Même Biscotte, avec un ruban." }
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
          { "qui": "odile", "texte": "Te voilà ! Assieds-toi près du feu : c'est la place d'honneur des nouveaux." },
          { "qui": "odile", "texte": "Toute l'île le dit : tu prends soin de chacun, comme Maurice." },
          { "qui": "odile", "texte": "Tiens. La cloche de sa calèche. Il me l'a confiée pour toi, avant de partir." },
          { "qui": "achille", "texte": "{prenom}. Ça sonne bien, avec la cloche." }
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
          { "qui": "odile", "texte": "Te voilà ! Assieds-toi près du feu : c'est la place d'honneur des nouveaux." },
          { "qui": "fernand", "texte": "Ta ferme est douce comme un matin calme. Ici, on appelle ça être d'ici." },
          { "qui": "odile", "texte": "On n'a jamais vu quelqu'un s'installer aussi joliment." },
          { "qui": "fernand", "texte": "Demain, cinq heures, à la cale ? Je t'emmène voir les dauphins." }
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
          { "qui": "odile", "texte": "Te voilà ! Assieds-toi près du feu : c'est la place d'honneur des nouveaux." },
          { "qui": "odile", "texte": "Tes machines ont aidé tout le monde. Même ma confiture a gagné une heure !" },
          { "qui": "frida", "texte": "Tu as montré à l'île tout ce qu'une machine peut faire de beau. Je suis si fière." },
          { "qui": "frida", "texte": "Mes plans, je te les confie. 212 pages, dont 30 sur les haies. Tu verras, c'est passionnant." },
          { "qui": "theo", "quand": { "fait": "theo.choix" }, "texte": "Et moi, je t'aiderai ! On va faire les plus belles machines du monde, ici !" }
        ],
        "effet": { "fait": ["fete", "fin.autrement"], "relation": { "frida": 10, "odile": 5 }, "confiance_partout": 5 }
      },
      {
        "id": "fete_genereuse",
        "quand": {
          "acte_min": 4,
          "lieu": "brumeval",
          "lune": "pleine",
          "heure": [19, 23],
          "fait": "fete.annonce",
          "sans_fait": "fete",
          "fin": "genereuse"
        },
        "priorite": 100,
        "lignes": [
          { "qui": "odile", "texte": "Te voilà ! Assieds-toi près du feu : c'est la place d'honneur des nouveaux." },
          { "qui": "fernand", "texte": "Ta ferme nourrit toute l'île, maintenant. On la voit depuis la mer, toute dorée." },
          { "qui": "odile", "texte": "Les paniers de la calèche n'ont jamais été aussi pleins. Merci pour tout." },
          { "qui": "achille", "texte": "Ho. Biscotte a pris deux kilos. C'est ta faute. À demain, dix heures." }
        ],
        "effet": { "fait": ["fete", "fin.genereuse"] }
      },
      {
        "id": "frida_gue",
        "quand": { "touche": "frida", "sans_fait": "frida.rencontre" },
        "priorite": 100,
        "lignes": [
          {
            "qui": "frida",
            "texte": {
              "m": "Alors c'est toi ! La dernière fois que je t'ai vu, tu tenais dans un panier.",
              "f": "Alors c'est toi ! La dernière fois que je t'ai vue, tu tenais dans un panier."
            }
          },
          { "qui": "frida", "texte": "Frida. J'invente des machines et j'observe les bêtes. Ta grand-mère est ma meilleure amie." },
          { "qui": "frida", "texte": "Je dors au Gué, mais je vis à mon atelier, au bord de l'étang. Il y a toujours du thé." }
        ],
        "effet": { "fait": "frida.rencontre", "relation": { "frida": 10 } }
      },
      {
        "id": "garance_rencontre",
        "quand": { "touche": "garance", "sans_fait": "garance.rencontre" },
        "priorite": 100,
        "lignes": [
          { "qui": "garance", "texte": "Bonjour ! Garance, des Genêts. C'est moi qui tisse la laine de l'île." },
          { "qui": "garance", "texte": "Tu viens de la ferme de Maurice ? Il m'avait promis un toit plus lumineux pour mon atelier." },
          { "qui": "garance", "texte": "Rien ne presse ! Viens voir mes couleurs, un jour. J'ai un jaune genêt qui fait sourire." }
        ],
        "effet": { "fait": "garance.rencontre", "relation": { "garance": 10 } }
      },
      {
        "id": "lise_rencontre",
        "quand": { "touche": "lise", "sans_fait": "lise.rencontre" },
        "priorite": 100,
        "lignes": [
          {
            "qui": "lise",
            "texte": {
              "m": "Toi, t'es celui de la ferme du milieu ! Moi c'est Lise.",
              "f": "Toi, t'es celle de la ferme du milieu ! Moi c'est Lise."
            }
          },
          { "qui": "lise", "texte": "Je connais tous les terriers des Genêts. Mais je dis pas." }
        ],
        "effet": { "fait": "lise.rencontre", "relation": { "lise": 10 } }
      },
      {
        "id": "lise_lucioles",
        "quand": { "touche": "lise", "fait": "lise.rencontre", "palier_min": 2, "sans_fragment": "souvenir_lise" },
        "priorite": 100,
        "lignes": [
          { "qui": "lise", "texte": "Je peux te dire un secret ? Un vrai ?" },
          { "qui": "lise", "texte": "Une nuit de pleine lune, des lucioles ont dansé au-dessus des bois de chez toi. Des centaines !" },
          { "qui": "lise", "texte": "Elles tournaient au même endroit, comme autour d'un feu. Mais je dis pas où." }
        ],
        "effet": { "fragment": "souvenir_lise", "relation": { "lise": 10 } }
      }
    ],
    "LIEUX": {
      "geode": [
        { "quand": { "fait": "pierre.trouvee" }, "texte": "L'améthyste refermée sur la cachette de Maurice enfant. La pierre est partie avec toi." },
        {
          "quand": {
            "lune": "pleine",
            "heure": [22, 4],
            "fragment": ["note_etoile", "journal_bord", "releves_frida", "ciel_pleine", "ciel_noire", "ciel_croissante"]
          },
          "texte": "Sous la pleine lune, l'améthyste s'ouvre : une cachette d'enfant, des lunes gravées, une pierre qui luit.",
          "effet": { "fait": "pierre.trouvee", "donner": { "pierre_lune": 1 } }
        },
        {
          "quand": { "lune": "pleine", "heure": [22, 4] },
          "texte": "Cette nuit, l'améthyste luit d'une lumière froide, comme si elle gardait quelque chose."
        },
        { "quand": { "heure": [20, 6] }, "texte": "Un grand amas d'améthyste, plus haut qu'un homme. Il luit doucement dans la nuit." },
        { "texte": "Un grand amas d'améthyste, plus haut qu'un homme, posé là depuis toujours. On dit qu'il luit, la nuit." }
      ],
      "cabane": [{ "texte": "L'observatoire de Maurice : une longue-vue tournée vers le ciel, un plaid. Un carnet attend sur la table." }],
      "atelier": [
        {
          "quand": { "fait": "frida.rencontre" },
          "texte": "L'atelier de Frida, qui sent le thé à la menthe. Un mot sur la porte : « Partie compter les hérons. »"
        },
        { "texte": "Un atelier plein d'outils, de ressorts et de pièces de métal. Ça sent l'huile. Frida n'est pas loin." }
      ],
      "epave": [
        {
          "quand": { "heure": [20, 6], "equipe": "lanterne_tempete", "sans_fragment": "journal_bord" },
          "texte": "À la lanterne, sous un banc de la barque, bien à l'abri : une page de leur journal de bord.",
          "effet": { "fragment": "journal_bord" }
        },
        { "texte": "La barque des premiers arrivants, couchée là depuis cinq siècles. Les enfants y jouent aux explorateurs." }
      ],
      "cale": [
        { "quand": { "jour_max": 3 }, "texte": "Le bac qui vous a amenés repart demain matin. Fernand dit qu'il revient toujours, lui." },
        { "quand": { "heure": [20, 6] }, "texte": "Le bac dort contre la cale. Une lanterne se balance à la poupe. Cadolon, c'est par là." },
        { "texte": "La cale du bac, aux Mouettes. C'est par là que vous êtes arrivés. Le bac repart pour Cadolon à l'aube." }
      ]
    },
    "PROMESSES": {
      "toit_garance": {
        "titre": "Le toit de l'atelier de Garance, aux Genêts",
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
        "texte": "La pleine lune arrive. On veille au Gué, le soir, de sept à dix. Odile fait des tartes.",
        "priorite": 30,
        "repos_jours": 2
      },
      {
        "id": "achille.promesses",
        "qui": "achille",
        "quand": { "fait": "odile.rencontre", "palier_max": 2 },
        "texte": "Les petits travaux de Maurice ? Donne-moi ce qu'il faut, je les porte. C'est sur ma route.",
        "priorite": 25,
        "repos_jours": 4
      },
      {
        "id": "achille.fortune",
        "qui": "achille",
        "quand": { "fait": "maurice.fortune" },
        "texte": "Maurice réparait avec ce qu'il avait. Toi aussi, fais à ton rythme. Personne n'est pressé, ici.",
        "priorite": 12,
        "une_fois": true
      },
      {
        "id": "achille.poli.surplus",
        "qui": "achille",
        "quand": { "fait": "achille.cle", "palier_max": 1 },
        "texte": "Ho. T'as quelque chose pour la calèche, aujourd'hui ?",
        "priorite": 10,
        "repos_jours": 2
      },
      {
        "id": "achille.poli.cheval",
        "qui": "achille",
        "quand": { "fait": "achille.cle", "palier_max": 1 },
        "texte": "Tu peux le caresser. Il s'appelle Biscotte. Il adore les carottes.",
        "priorite": 10,
        "repos_jours": 3
      },
      {
        "id": "achille.cordial.oeufs",
        "qui": "achille",
        "quand": { "palier_min": 2 },
        "texte": "Ho. Garde-moi tes œufs, les Genêts en raffolent.",
        "priorite": 10,
        "repos_jours": 4
      },
      {
        "id": "achille.cordial.gue",
        "qui": "achille",
        "quand": { "palier_min": 2 },
        "texte": "Odile demande de tes nouvelles. Elle demande des nouvelles de tout le monde, remarque.",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "achille.soir",
        "qui": "achille",
        "quand": { "heure": [18, 22] },
        "texte": "Biscotte dort debout. Moi, je préfère mon lit. Bonne soirée.",
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
        "texte": "Ce que tu m'as vendu est parti en une matinée. Les gens en redemandent !",
        "priorite": 40,
        "repos_jours": 7
      },
      {
        "id": "odile.veillee",
        "qui": "odile",
        "quand": { "acte_min": 2, "sans_fait": "veillee.1", "fait": "odile.rencontre" },
        "texte": "Les soirs de pleine lune, on veille sur la place, de sept à dix. Tu viendras ?",
        "priorite": 30,
        "repos_jours": 3
      },
      {
        "id": "odile.bonjour",
        "qui": "odile",
        "quand": { "fait": "odile.rencontre", "palier_max": 1 },
        "texte": "Bonjour, toi ! Tu t'installes bien, là-haut ?",
        "priorite": 10,
        "repos_jours": 2
      },
      {
        "id": "odile.nuits_noires",
        "qui": "odile",
        "quand": { "lune": "nouvelle", "fait": ["odile.rencontre", "odile.tutoie"] },
        "texte": "Aux nuits noires, on ne sème pas : la terre fait la sieste. Ta mère, elle, semait quand même.",
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
        "texte": "Tu manges bien, au moins ? Adèle m'a fait promettre de te nourrir.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "odile.enfants",
        "qui": "odile",
        "quand": { "fait": ["odile.rencontre", "odile.tutoie"], "enfants": true },
        "texte": "Et tes petits, ils savent ce que c'est, une nuit noire ? Je leur raconterai.",
        "priorite": 15,
        "une_fois": true
      },
      {
        "id": "odile.maison",
        "qui": "odile",
        "quand": { "fait": ["odile.rencontre", "odile.tutoie"], "palier_min": 2 },
        "texte": "La maison de Maurice sourit quand quelqu'un y passe.",
        "priorite": 10,
        "repos_jours": 7
      },
      {
        "id": "fernand.peche",
        "qui": "fernand",
        "quand": { "fait": "arrivee" },
        "texte": "Là-bas, on courait toute la journée. Ici, on pêche. C'est mieux.",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "fernand.calme",
        "qui": "fernand",
        "quand": { "fait": "arrivee", "heure": [5, 9] },
        "texte": "Doucement, les poissons dorment encore. Tu veux un café ?",
        "priorite": 15,
        "repos_jours": 6
      },
      {
        "id": "fernand.cadolon",
        "qui": "fernand",
        "quand": { "palier_min": 2 },
        "texte": "Cadolon ? J'y ai passé quarante ans. Mais c'est ici que j'ai mon cœur.",
        "priorite": 10,
        "une_fois": true
      },
      {
        "id": "achille.toits",
        "qui": "achille",
        "quand": { "fait": "toits.uses", "sans_fait": "enveloppe.donnee" },
        "texte": "Encore un toit qui aurait besoin d'un coup de main. Maurice montait avec ses planches. Moi, j'ai Biscotte.",
        "priorite": 30,
        "repos_jours": 12
      },
      {
        "id": "achille.enveloppe",
        "qui": "achille",
        "quand": { "fait": "enveloppe.donnee" },
        "texte": "Les toits sont tout beaux. Maurice serait content.",
        "priorite": 50,
        "une_fois": true
      },
      {
        "id": "achille.acte3",
        "qui": "achille",
        "quand": { "acte_min": 3, "empreinte": "haute" },
        "texte": "On parle de ta ferme jusqu'à Brumeval. Tout le monde veut goûter tes légumes !",
        "priorite": 25,
        "repos_jours": 10
      },
      {
        "id": "achille.tournee",
        "qui": "achille",
        "quand": { "fait": "achille.tournee.demandee", "sans_fait": "achille.tournee" },
        "texte": "Les Genêts et Bois-Joli. Biscotte compte sur toi. Moi aussi.",
        "priorite": 45,
        "repos_jours": 2
      },
      {
        "id": "achille.cloche",
        "qui": "achille",
        "quand": { "fait": "fin.nouveau_maurice" },
        "texte": "Ho. T'as la cloche ! Deux coups devant chaque maison : un pour bonjour, un pour à bientôt.",
        "priorite": 50,
        "une_fois": true
      },
      {
        "id": "achille.fete",
        "qui": "achille",
        "quand": { "fait": "fete.annonce", "sans_fait": "fete", "lune": ["croissante", "pleine"] },
        "texte": "La fête, c'est à Brumeval, à la pleine lune. Tu viens, hein ?",
        "priorite": 40,
        "repos_jours": 2
      },
      {
        "id": "odile.toit",
        "qui": "odile",
        "quand": { "fait": ["toit.repare", "odile.tutoie"] },
        "texte": "On ne monte pas sur le toit des autres sans les aimer un peu. Merci, va.",
        "priorite": 40,
        "une_fois": true
      },
      {
        "id": "odile.enveloppe",
        "qui": "odile",
        "quand": { "fait": ["enveloppe.ouverte", "odile.tutoie"] },
        "texte": "L'enveloppe ? Maurice voulait que tu choisisses. Tu as bien fait.",
        "priorite": 45,
        "une_fois": true
      },
      {
        "id": "odile.acte3",
        "qui": "odile",
        "quand": { "acte_min": 3, "empreinte": "haute", "fait": "odile.tutoie" },
        "texte": {
          "m": "Laisse un coin sauvage, petit. Les abeilles et les hérissons te diront merci.",
          "f": "Laisse un coin sauvage, petite. Les abeilles et les hérissons te diront merci."
        },
        "priorite": 25,
        "repos_jours": 10
      },
      {
        "id": "fernand.cale",
        "qui": "fernand",
        "quand": { "fait": "fin.voisin_tranquille" },
        "texte": "Demain, cinq heures, à la cale ? Les dauphins nous attendent.",
        "priorite": 30,
        "repos_jours": 7
      },
      {
        "id": "basile.bois",
        "qui": "basile",
        "quand": {},
        "texte": "Le chêne, faut lui laisser le temps. Comme aux enfants.",
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
        "texte": "Mon fils démonte tout ce qu'il touche. Et il remonte tout mieux qu'avant !",
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
        "texte": "La scie va deux fois plus vite. Le bois s'en fiche. Moi, ça me fait des siestes en plus.",
        "priorite": 20,
        "repos_jours": 6
      },
      {
        "id": "basile.theo_frida",
        "qui": "basile",
        "quand": { "fait": "theo.frida" },
        "texte": "Le petit revient de chez Frida avec des étoiles plein les yeux. Et des boulons plein les poches.",
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
        "texte": "À Cadolon, il paraît qu'il y a des machines pour tout ! Moi, je préfère inventer les nôtres.",
        "priorite": 10,
        "repos_jours": 5
      },
      {
        "id": "theo.caleche",
        "qui": "theo",
        "quand": { "fait": "theo.rencontre" },
        "texte": "La roue de la calèche chante faux. Je la règle en une heure, moi !",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "theo.pere",
        "qui": "theo",
        "quand": { "fait": "theo.confie", "sans_fait": "theo.choix" },
        "texte": "Je sais pas encore ce que je ferai. La calèche, l'atelier, ou les machines de Frida ? Tout me plaît !",
        "priorite": 40,
        "repos_jours": 3
      },
      {
        "id": "theo.apprenti",
        "qui": "theo",
        "quand": { "fait": "theo.apprenti" },
        "texte": "Le jeudi, je monte avec Achille ! Biscotte me laisse tenir les rênes.",
        "priorite": 30,
        "repos_jours": 5
      },
      {
        "id": "theo.atelier",
        "qui": "theo",
        "quand": { "fait": "theo.atelier" },
        "texte": "J'ai mis un moteur sur la scie ! Papa a ri. Puis il a voulu essayer.",
        "priorite": 50,
        "une_fois": true
      },
      {
        "id": "theo.frida",
        "qui": "theo",
        "quand": { "fait": "theo.frida" },
        "texte": "Frida m'apprend à faire des robots ! Le premier, je l'appelle Biscuit.",
        "priorite": 30,
        "repos_jours": 5
      },
      {
        "id": "fernand.dauphins",
        "qui": "fernand",
        "quand": { "fait": "arrivee", "enfants": true },
        "texte": "Tes petits ont vu les dauphins ? Ils passent au large le matin, quand la mer est lisse.",
        "priorite": 15,
        "repos_jours": 8
      },
      {
        "id": "fernand.histoire",
        "qui": "fernand",
        "quand": { "palier_min": 1 },
        "texte": "Là-bas, on m'appelait « le Phoque », parce que je nageais bien. Enfin, c'est ma version.",
        "priorite": 10,
        "repos_jours": 9
      },
      {
        "id": "fernand.soir",
        "qui": "fernand",
        "quand": { "heure": [18, 22] },
        "texte": "Le soir, la mer devient rose. À Cadolon, je n'avais jamais le temps de la regarder.",
        "priorite": 15,
        "repos_jours": 6
      },
      {
        "id": "fernand.pleine",
        "qui": "fernand",
        "quand": { "lune": "pleine" },
        "texte": "Pleine lune : les poissons montent voir. Moi aussi, je monte voir.",
        "priorite": 20,
        "repos_jours": 10
      },
      {
        "id": "fernand.barque",
        "qui": "fernand",
        "quand": { "fait": "lieu.epave" },
        "texte": "Tu as vu la barque des premiers arrivants ? Cinq siècles, et pas une planche qui bouge.",
        "priorite": 30,
        "une_fois": true
      },
      {
        "id": "fernand.pompe",
        "qui": "fernand",
        "quand": { "fait": "promesse.pompe_mouettes" },
        "texte": "La pompe ronronne comme un chat. Je l'ai à peine aidée. Enfin… un peu.",
        "priorite": 40,
        "une_fois": true
      },
      {
        "id": "garance.laine",
        "qui": "garance",
        "quand": { "fait": "garance.rencontre" },
        "texte": "Ta laine est belle ! Je la vois déjà en vert mousse.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "garance.couleurs",
        "qui": "garance",
        "quand": { "fait": "garance.rencontre" },
        "texte": "Ce matin, j'ai trouvé un nouveau bleu : bleu pervenche. Il fallait des fleurs et de la patience.",
        "priorite": 10,
        "repos_jours": 7
      },
      {
        "id": "garance.lise",
        "qui": "garance",
        "quand": { "fait": "garance.rencontre" },
        "texte": "Tu as croisé Lise ? Elle connaît chaque terrier. Mais elle ne te dira pas où.",
        "priorite": 10,
        "repos_jours": 8
      },
      {
        "id": "garance.lune",
        "qui": "garance",
        "quand": { "lune": "croissante", "fait": "garance.rencontre" },
        "texte": "Lune montante : on tond, la laine repousse plus vite. Odile le dit, et Odile a raison.",
        "priorite": 20,
        "repos_jours": 14
      },
      {
        "id": "garance.robot",
        "qui": "garance",
        "quand": { "machines": true, "fait": "garance.rencontre" },
        "texte": "Ton robot sait carder ? Non ? Dommage, il a pourtant l'air doué.",
        "priorite": 15,
        "repos_jours": 9
      },
      {
        "id": "garance.toit",
        "qui": "garance",
        "quand": { "fait": "promesse.toit_garance" },
        "texte": "Avec le nouveau toit, la lumière tombe pile sur le métier. Les couleurs chantent !",
        "priorite": 40,
        "une_fois": true
      },
      {
        "id": "lise.renard",
        "qui": "lise",
        "quand": { "fait": "lise.rencontre" },
        "texte": "Tu sais où dort le renard ? Moi oui. Mais je dis pas.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "lise.lapin",
        "qui": "lise",
        "quand": { "fait": "lise.rencontre" },
        "texte": "Il y a un lapin qui a une oreille tordue. Je l'appelle Monsieur Plume.",
        "priorite": 10,
        "repos_jours": 7
      },
      {
        "id": "lise.robe",
        "qui": "lise",
        "quand": { "fait": "lise.rencontre" },
        "texte": "Maman a teint ma robe en jaune genêt. C'est ma couleur préférée. Après le vert.",
        "priorite": 10,
        "repos_jours": 8
      },
      {
        "id": "lise.enfants",
        "qui": "lise",
        "quand": { "fait": "lise.rencontre", "enfants": true },
        "texte": "Tes enfants, ils savent garder un secret ? Je cherche des gens pour ma cabane.",
        "priorite": 15,
        "repos_jours": 9
      },
      {
        "id": "lise.lucioles",
        "qui": "lise",
        "quand": { "lune": "pleine", "fait": "lise.rencontre" },
        "texte": "Les soirs de pleine lune, il y a des lucioles partout. Tu les as vues ?",
        "priorite": 20,
        "repos_jours": 10
      },
      {
        "id": "frida.herons",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre" },
        "texte": "Ce matin, 37 hérons sur l'étang. Hier, 36. Je crois que le 37e est venu pour moi.",
        "priorite": 10,
        "repos_jours": 6
      },
      {
        "id": "frida.the",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre", "heure": [15, 19] },
        "texte": "C'est l'heure du thé ! À la menthe, quatre minutes d'infusion, pas une de plus.",
        "priorite": 15,
        "repos_jours": 5
      },
      {
        "id": "frida.robot",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre", "machines": true },
        "texte": "Ton robot marche bien ? Parle-lui gentiment : ça ne coûte rien et ça marche à 100 %.",
        "priorite": 15,
        "repos_jours": 8
      },
      {
        "id": "frida.philomene",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre", "palier_min": 1 },
        "texte": "Philomène m'a écrit : elle a vu une baleine. Une baleine ! Je suis verte de jalousie.",
        "priorite": 15,
        "repos_jours": 12
      },
      {
        "id": "frida.lune",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre", "lune": "pleine" },
        "texte": "Pleine lune : 14 % de mieux aux récoltes. Je mesure encore. J'adore ne pas savoir.",
        "priorite": 20,
        "repos_jours": 10
      },
      {
        "id": "frida.theo",
        "qui": "frida",
        "quand": { "fait": "theo.frida" },
        "texte": "Théo a déjà amélioré mon robot de 12 %. Ne le lui dis pas, il serait insupportable.",
        "priorite": 30,
        "repos_jours": 7
      },
      {
        "id": "frida.adele",
        "qui": "frida",
        "quand": { "fait": "frida.rencontre", "palier_min": 2 },
        "texte": "Ta mère dessinait des robots sur mes nappes. Tu as ses yeux quand tu réfléchis.",
        "priorite": 15,
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
  "AMITIE": {
    "ECHELLE": { "MAX": 100, "PALIERS": [0, 10, 25, 45, 70], "NOMS": ["inconnu", "poli", "cordial", "proche", "intime"] },
    "CADEAU": { "adore": 8, "aime": 4, "neutre": 1, "deteste": -4 },
    "PAROLE": 2,
    "VISITE": 1,
    "RETROUVAILLES": { "JOURS": 7, "BONUS": 3 },
    "OFFRABLES": ["légume", "fruit", "plat", "produit", "ingrédient", "conserve"],
    "GOUTS": { "adore": 2, "aime": 3, "deteste": 2 },
    "METIERS": {
      "bucheron": {
        "adore": ["gratin_patates", "omelette", "cafe_boisson"],
        "aime": ["pain", "patate", "chataigne", "biere_artisanale"],
        "deteste": ["algues", "anchois", "epinard"]
      },
      "pecheur": {
        "adore": ["poisson_grille", "quenelle_poisson", "pain_ail"],
        "aime": ["saumon", "pain", "oignon", "biere_artisanale"],
        "deteste": ["chocolat_chaud", "lait", "myrtille"]
      },
      "mineur": {
        "adore": ["raclette", "gratin_patates", "biere_artisanale"],
        "aime": ["pain", "fromage_frais", "viande_boeuf", "amethyste"],
        "deteste": ["salade_tomates", "fraise", "algues"]
      },
      "berger": {
        "adore": ["fromage_alpage", "pain_epices", "riz_au_lait"],
        "aime": ["lait_alpage", "pomme", "herbes_montagne", "miel"],
        "deteste": ["viande_mouton", "poivron", "anchois"]
      },
      "cueilleur": {
        "adore": ["tarte_myrtilles", "confiture_fraises", "creme_marrons"],
        "aime": ["miel", "mures", "champignon", "chataigne"],
        "deteste": ["burger", "frites", "sardine"]
      },
      "jardinier": {
        "adore": ["ratatouille", "quiche_epinards", "soupe_legumes"],
        "aime": ["tomate", "courgette", "oeuf", "compote"],
        "deteste": ["pizza", "goujon", "ail"]
      },
      "enfant": {
        "adore": ["chocolat_chaud", "tarte_fraises", "creme_vanille"],
        "aime": ["fraise", "pomme", "croissant", "miel"],
        "deteste": ["epinard", "oignon", "ail", "poisson"]
      }
    },
    "COMMUN": {
      "adore": ["tarte_pommes", "chocolat_chaud", "raclette", "omelette_champignons"],
      "aime": ["pomme", "poire", "cerise", "pain", "oeuf", "compote", "jus_fruits"],
      "deteste": ["algues", "corail", "conserve", "farine"]
    },
    "ECRITS": {
      "odile": { "adore": ["tarte_pommes", "confiture_fraises"], "aime": ["pomme", "miel", "soupe_legumes"], "deteste": ["burger", "frites"] },
      "basile": {
        "adore": ["gratin_patates", "cafe_boisson"],
        "aime": ["pain", "chataigne", "biere_artisanale"],
        "deteste": ["algues", "salade_tomates"]
      },
      "theo": { "adore": ["chocolat_chaud", "tarte_fraises"], "aime": ["fraise", "croissant", "miel"], "deteste": ["epinard", "poisson"] },
      "garance": { "adore": ["pain_epices", "tarte_myrtilles"], "aime": ["miel", "poire", "riz_au_lait"], "deteste": ["sardine", "oignon"] },
      "achille": { "adore": ["cafe_boisson", "omelette"], "aime": ["pain", "pomme", "fromage_frais"], "deteste": ["lait", "creme_vanille"] }
    },
    "CONFIANCE": { "BASE": 40, "PART": 60 },
    "RETOUR": {
      "PALIER": 3,
      "CHANCE": { "3": 15, "4": 25 },
      "PRESENTS": {
        "bucheron": { "bois": [3, 6], "planche": [1, 3], "pomme_de_pin": [1, 2] },
        "pecheur": { "truite": [1, 2], "sardine": [2, 3], "saumon": [1, 1] },
        "mineur": { "pierre": [3, 6], "minerai_fer": [1, 2], "quartz": [1, 1] },
        "berger": { "laine": [1, 3], "lait": [1, 2], "fromage_alpage": [1, 1] },
        "cueilleur": { "baies": [2, 4], "champignon": [1, 3], "myrtille": [2, 3] },
        "jardinier": { "carotte": [2, 4], "tomate": [2, 3], "oeuf": [1, 3] },
        "enfant": { "baies": [1, 3], "pomme": [1, 2], "fraise": [1, 2] }
      }
    },
    "REMISE": [0, 0, 5, 10, 20],
    "DELAI": [0, 0, 0, 1, 1],
    "HUMEUR": { "CONNU": 10, "JOIE": 3 },
    "INVITATION": {
      "MOMENTS": { "midi": { "nom": "le déjeuner", "heure": 12, "icone": "☀️" }, "soir": { "nom": "le dîner", "heure": 19, "icone": "🌙" } },
      "DELAI": [1, 28],
      "INVITES_MAX": 4,
      "ACCEPTE": [50, 70, 85, 95, 100],
      "VIENNENT": 1,
      "ATTENTE": 3,
      "REPAS": { "BASE": 4, "PLATS_MAX": 3, "GOUT": { "adore": 4, "aime": 2, "neutre": 0, "deteste": -2 }, "TERRASSE": 2, "BONHEUR": 6 },
      "SOUVENIR": { "RECENT": 7, "ANCIEN": 30, "MAX": 3 },
      "PAROLES": {
        "ARRIVE": ["Bonjour ! Merci pour l'invitation.", "Me voilà ! Ça sent bon, ici.", "Quelle bonne idée, ce repas !"],
        "TABLE": [
          "Tu as une belle ferme.",
          "Le temps est doux, aujourd'hui.",
          "Chez nous, on parle de ta famille.",
          "Ça fait du bien de s'asseoir un peu.",
          "Tu as vu la calèche, ce matin ?"
        ],
        "MERCI": ["Merci pour ce repas, c'était délicieux !", "Quel bon moment. À bientôt !", "Merci ! Je reviendrai avec plaisir."],
        "SEUL": ["Personne à table… Je reviendrai une autre fois.", "Tu étais occupé, on dirait. Ce n'est rien !"],
        "SOUVENIR_TERRASSE": "Le repas sur ta terrasse, quel bon moment ! Et ton « {plat} », je m'en souviens encore.",
        "SOUVENIR_MAISON": "Le repas chez toi, quel bon moment ! Et ton « {plat} », je m'en souviens encore.",
        "SOUVENIR_SIMPLE": "Ce repas chez toi, l'autre jour… quel bon moment !",
        "SOUVENIR_ANCIEN": "Je repense parfois à ce repas chez toi. On recommence quand tu veux !"
      }
    }
  },
  "DEMANDES": {
    "_": [
      "V-2 (docs/phase-4.md, js/engine/demandes.js) : les petites demandes des habitants. Chaque nuit, un habitant d'un hameau déjà visité peut en faire une (CHANCE), s'il y en a moins de MAX ouvertes ; elle attend DUREE jours, puis s'oublie sans rien coûter. BESOINS : par métier, [objet, au moins, au plus, motif]. La rendre : AMITIE points, et un présent de son métier (RETOUR.PRESENTS)."
    ],
    "MAX": 3,
    "DUREE": 7,
    "CHANCE": 0.6,
    "DEPUIS": 3,
    "AMITIE": 6,
    "BESOINS": {
      "bucheron": [
        ["pierre", 3, 6, "pour caler le bûcher"],
        ["fibre", 3, 5, "pour tresser une corde"],
        ["pain", 1, 2, "pour la pause de midi"],
        ["carotte", 3, 5, "pour la soupe du soir"]
      ],
      "pecheur": [
        ["fibre", 4, 6, "pour réparer mes filets"],
        ["bois", 3, 5, "pour retaper ma barque"],
        ["pain", 1, 2, "pour la pêche de l'aube"],
        ["oignon", 2, 3, "pour accompagner la friture"]
      ],
      "mineur": [
        ["bois", 4, 6, "pour étayer le tas de minerai"],
        ["pain", 1, 2, "pour la journée au gisement"],
        ["patate", 3, 5, "pour le gratin du soir"],
        ["fibre", 2, 4, "pour les mèches des lampes"]
      ],
      "berger": [
        ["ble", 4, 8, "pour la réserve des bêtes"],
        ["paille", 3, 6, "pour la litière"],
        ["carotte", 3, 5, "pour gâter mes bêtes"],
        ["bois", 2, 4, "pour réparer l'enclos"]
      ],
      "cueilleur": [
        ["fibre", 3, 5, "pour tresser des paniers"],
        ["pain", 1, 2, "pour la cueillette"],
        ["oeuf", 2, 4, "pour une omelette aux champignons"],
        ["bois", 2, 4, "pour le séchoir"]
      ],
      "jardinier": [
        ["oeuf", 2, 4, "pour la tarte du dimanche"],
        ["fibre", 2, 4, "pour attacher les tomates"],
        ["pierre", 2, 4, "pour une bordure de potager"],
        ["ble", 3, 5, "pour faire mon pain"]
      ]
    },
    "PHRASES": {
      "demande": [
        "J'aurais besoin de {n} × {objet}, {motif}. Tu pourrais m'en apporter ?",
        "Dis, tu n'aurais pas {n} × {objet} ? C'est {motif}.",
        "Si tu repasses avec {n} × {objet}, ça m'aiderait beaucoup : c'est {motif}."
      ],
      "merci": [
        "Merci mille fois ! Tiens, pour toi : {cadeau}.",
        "Tu es formidable ! Prends ça : {cadeau}.",
        "Je savais que je pouvais compter sur toi. Voilà {cadeau}, de bon cœur."
      ],
      "annonce": "📜 {prenom}, de {hameau}, a une demande pour toi : {n} × {objet}."
    }
  },
  "VOISINS": {
    "_": [
      "V-3 (docs/phase-4.md, js/engine/voisins.js) : entre voisins. Chaque adulte d'un hameau a un ami dans son hameau et un cousin dans un autre (tirés une fois, gardés). La nuit, un foyer qui a eu faim reçoit jusqu'à AIDE aliments du garde-manger d'un ami ou d'un cousin ; parfois (VISITE), un cousin rend visite à l'autre. EVENEMENTS : ce qu'on garde de ces nuits (pour les paroles, la fiche du hameau) ; RECENT : les jours où l'on en parle encore."
    ],
    "AIDE": 3,
    "VISITE": 0.35,
    "EVENEMENTS": 40,
    "RECENT": 3,
    "TEXTES": { "entraide": "{de} ({deHameau}) a apporté à manger à {a}, qui en manquait", "visite": "{qui}, {deHameau}, est venu{e} voir {chez}" }
  },
  "FETES": {
    "_": [
      "V-4 (docs/phase-4.md, js/engine/fetes.js) : la fête du hameau. Chaque mois (une lunaison), PAR_MOIS hameaux peuplés font leur fête, chacun un jour tiré de la graine (de JOUR_MIN au dernier jour du mois), de DEBUT à FIN h : les habitants se retrouvent sur la place. Y être pendant la fête rapporte une fois AMITIE points avec chaque adulte du hameau et un plat de fête (BIENVENUE.PLATS, selon le métier du hameau). NOMS : le nom de la fête selon le métier du hameau."
    ],
    "PAR_MOIS": 2,
    "JOUR_MIN": 3,
    "DEBUT": 17,
    "FIN": 21,
    "AMITIE": 4,
    "ANNONCE": 3,
    "NOMS": {
      "bucheron": ["🪵", "la fête du bois"],
      "pecheur": ["🐟", "la fête de la pêche"],
      "mineur": ["⛏️", "la fête de la roche"],
      "berger": ["🐑", "la fête des laines"],
      "cueilleur": ["🧺", "la fête des récoltes"],
      "*": ["🎉", "la fête du hameau"]
    }
  },
  "STYLES": {
    "LISTE": {
      "champetre": {
        "nom": "champêtre",
        "icone": "🌾",
        "adj": "champêtre",
        "blocs": [
          "mur_pierre",
          "mur_brique_ocre",
          "pierre_angle",
          "fenetre_volets",
          "porte",
          "porte_grange",
          "porte_ecurie",
          "sol_tomettes",
          "sol_dalles",
          "chemin",
          "meuble_table",
          "meuble_chaise",
          "meuble_buffet",
          "meuble_commode",
          "meuble_armoire_chene",
          "meuble_cuisine_porte",
          "meuble_cuisine_tiroirs",
          "meuble_tapis_1",
          "meuble_coffre_jouets",
          "table_jardin",
          "chaise_jardin",
          "lanterne",
          "banc_pierre",
          "jardiniere_pierre"
        ]
      },
      "forestier": {
        "nom": "forestier",
        "icone": "🌲",
        "adj": "forestier",
        "blocs": [
          "mur_bois",
          "porte_chene",
          "plancher",
          "sol_chevrons",
          "meuble_bibliotheque",
          "meuble_bibliotheque_vitree",
          "meuble_chevet",
          "meuble_armoire_glace",
          "meuble_plante_fougere",
          "meuble_plante_bonsai",
          "meuble_plante_sansevieria",
          "meuble_lampadaire",
          "banc_jardin",
          "candelabre",
          "banc_rondins",
          "table_rondins",
          "bassin"
        ]
      },
      "cotier": {
        "nom": "côtier",
        "icone": "🐚",
        "adj": "côtier",
        "blocs": [
          "mur_brique_bleue",
          "mur_pierre_taille",
          "fenetre_ronde",
          "porte_bleue",
          "porte_blanche",
          "porte_vitree",
          "sol_carrelage",
          "sol_mosaique",
          "sol_paves",
          "meuble_armoire_peinte",
          "meuble_tapis_3",
          "meuble_cuisine_sauge",
          "meuble_plante_palmier",
          "meuble_plante_aloe",
          "meuble_plante_cactus",
          "meuble_tableau_3",
          "chaise_peinte",
          "jarre_coquillages"
        ]
      },
      "fleuri": {
        "nom": "fleuri",
        "icone": "🌷",
        "adj": "fleuri",
        "blocs": [
          "bac_carre",
          "bac_rond",
          "fenetre_vitrail",
          "fenetre_cintree",
          "mur_brique_rouge",
          "mur_brique_orange",
          "sol_marbre",
          "meuble_tapis_2",
          "meuble_canape",
          "meuble_table_basse",
          "meuble_plante_orchidee",
          "meuble_plante_citronnier",
          "meuble_plante_ficus",
          "meuble_plante_monstera",
          "meuble_tableau_1",
          "meuble_tableau_2",
          "lanterne_papier",
          "pergola",
          "bac_long"
        ]
      }
    },
    "RAYON": 5,
    "ADMIRE": 3,
    "BONUS_REPAS": 3,
    "REVELE": 2,
    "MAISON": { "PIECES": 2, "VARIETE": 3, "COMPLET": 6, "BONUS": 5 },
    "BIOMES": {
      "prairie": ["fleuri", "champetre"],
      "lande": ["champetre", "fleuri"],
      "montagne": ["champetre", "forestier"],
      "foret": ["forestier"],
      "marais": ["forestier", "fleuri"],
      "cote": ["cotier"]
    },
    "ECRITS": {
      "odile": "champetre",
      "basile": "forestier",
      "theo": "cotier",
      "garance": "fleuri",
      "achille": "champetre",
      "lise": "fleuri",
      "fernand": "cotier"
    },
    "ADMIRE_PAROLES": [
      "Oh, quel joli coin {adj} ! J'adore.",
      "Ce coin {adj}, c'est tout à fait mon goût !",
      "Comme c'est {adj}, ici : on s'y sent bien."
    ]
  },
  "PLANS": {
    "AMI": 3,
    "COLLECTIONS": {
      "foret": { "nom": "la forêt", "icone": "🌲", "biomes": ["foret"], "hameaux": ["foret"], "plans": ["banc_rondins", "table_rondins"] },
      "cote": {
        "nom": "la côte",
        "icone": "🐚",
        "biomes": ["plage", "falaise"],
        "hameaux": ["cote"],
        "plans": ["chaise_peinte", "jarre_coquillages"]
      },
      "marais": { "nom": "le marais", "icone": "🪷", "biomes": ["marais"], "hameaux": ["marais"], "plans": ["lanterne_papier", "bassin"] },
      "montagne": {
        "nom": "la montagne",
        "icone": "⛰️",
        "biomes": ["montagne", "sommet"],
        "hameaux": ["montagne"],
        "plans": ["banc_pierre", "jardiniere_pierre"]
      },
      "prairie": { "nom": "la prairie", "icone": "🌼", "biomes": ["prairie", "lande"], "hameaux": ["prairie", "lande"], "plans": ["pergola"] }
    },
    "TROUVE": [
      "En chemin, tu ramasses un vieux carnet abîmé : le plan {de} ({pays}).",
      "Sous une pierre, une feuille pliée : le plan {de} ({pays}).",
      "Accroché à une branche, un dessin oublié : le plan {de} ({pays})."
    ]
  },
  "PROJETS": {
    "SORTES": {
      "place": {
        "nom": "Aménager la place",
        "icone": "🪑",
        "texte": "Des bancs, des bacs de fleurs et une lanterne, pour se retrouver le soir sur la place.",
        "besoin": { "bois": 20, "pierre": 15, "fibre": 10 },
        "decor": ["banc_jardin", "bac_fleurs", "lanterne", "bac_fleurs", "banc_jardin", "table_jardin"]
      },
      "jardin": {
        "nom": "Un jardin partagé",
        "icone": "🌷",
        "texte": "Une pergola, des bacs de lavande et des jardinières, que tout le hameau soigne ensemble.",
        "besoin": { "bois": 15, "pierre": 10, "fibre": 15 },
        "decor": ["pergola", "bac_lavande", "jardiniere_pierre", "bac_lavande", "bac_fleurs", "banc_rondins"]
      }
    },
    "ORDRE": {
      "prairie": ["jardin", "place"],
      "lande": ["jardin", "place"],
      "foret": ["jardin", "place"],
      "montagne": ["place", "jardin"],
      "cote": ["place", "jardin"],
      "marais": ["place", "jardin"]
    },
    "NUIT": 1,
    "DON": 1,
    "FIN": { "CONFIANCE": 10, "AMITIE": 5 },
    "SOUVENIR": 7,
    "MERCI": [
      "Grâce à toi, notre hameau est bien plus joli !",
      "Tu as vu notre {projet} ? On s'y retrouve tous les soirs.",
      "Merci pour ton aide : sans toi, on n'y serait jamais arrivés."
    ]
  },
  "NATURALISTE": {
    "COLLECTIONS": {
      "fossiles": {
        "nom": "Fossiles et cristaux",
        "icone": "🪨",
        "pages": ["ammonite", "trilobite", "quartz", "amethyste"],
        "recompense": "meuble_bibliotheque_vitree",
        "texte": "une bibliothèque vitrée, pour les exposer"
      },
      "plage": {
        "nom": "Trésors de la plage",
        "icone": "🐚",
        "pages": ["coquille", "bulot", "corail", "perle"],
        "recompense": "meuble_tapis_3",
        "texte": "un tapis bleu comme la mer"
      },
      "sous_bois": {
        "nom": "Cueillette des sous-bois",
        "icone": "🍄",
        "pages": ["champignon", "myrtille", "chataigne", "herbes_montagne"],
        "recompense": "meuble_plante_fougere",
        "texte": "une fougère en pot"
      },
      "poissons": {
        "nom": "Poissons d'ici",
        "icone": "🎣",
        "pages": ["truite", "brochet", "omble", "goujon", "dorade", "sardine", "anchois"],
        "recompense": "meuble_tableau_3",
        "texte": "un tableau de la mer"
      },
      "paysages": {
        "nom": "Les paysages du grand monde",
        "icone": "🧭",
        "pages": ["b_mer", "b_plage", "b_falaise", "b_prairie", "b_foret", "b_marais", "b_lande", "b_montagne", "b_sommet", "b_lac", "b_riviere"],
        "recompense": "meuble_plante_bonsai",
        "texte": "un bonsaï, le monde en miniature"
      }
    }
  },
  "METEO": {
    "DEPUIS": 3,
    "CHANCES": { "pluie": 0.2, "brume": 0.15 },
    "PAR_MOIS": { "Pluvia": 0.45, "Zephyria": 0.3, "Florea": 0.28, "Silentia": 0.25, "Messidia": 0.1, "Aurea": 0.08 },
    "PLUIE_HEURES": [8, 18],
    "PLUIE_DUREE": [2, 5],
    "BRUME_FIN": 10,
    "NOMS": { "clair": "☀️ Beau temps", "pluie": "🌧️ Averse", "brume": "🌫️ Brume du matin" }
  },
  "SECRETS": {
    "PART_PAGE": 0.5,
    "VUE": 40,
    "NOMS": {
      "ruine": ["🏚️", "une vieille ruine"],
      "cairn": ["🗿", "un cairn"],
      "arbre_ancien": ["🌳", "un arbre ancien"],
      "belvedere": ["🔭", "un belvédère"],
      "pierre_levee": ["🪨", "une pierre levée"]
    },
    "TEXTES": {
      "ruine": {
        "trouve": [
          "De vieux murs de pierre, mangés par la mousse. Entre deux pierres descellées, quelque chose brille.",
          "Une maison d'autrefois, dont il ne reste que les murs. Dans l'âtre écroulé, tu trouves un petit trésor."
        ],
        "deja": [
          "Les vieux murs sont toujours là, tranquilles. Tu as déjà fouillé chaque pierre.",
          "La ruine dort au soleil. Elle t'a déjà donné son secret."
        ]
      },
      "cairn": {
        "trouve": [
          "Un tas de pierres posées une à une, par des mains patientes. Sous la dernière, une cachette.",
          "Les bergers montaient ces pierres pour marquer le chemin. Celui-ci gardait quelque chose."
        ],
        "deja": [
          "Tu poses une pierre de plus sur le cairn, comme le veut la coutume.",
          "Le cairn montre toujours le chemin. Sa cachette est vide, maintenant."
        ]
      },
      "arbre_ancien": {
        "trouve": [
          "Un arbre immense, plus vieux que tous les hameaux. Dans le creux de ses racines, une cachette.",
          "Il faudrait cinq personnes pour faire le tour de son tronc. Entre ses racines, tu trouves quelque chose."
        ],
        "deja": [
          "Le vieil arbre bruisse doucement. Il t'a déjà confié son secret.",
          "Tu t'assieds un instant contre le vieil arbre. Il fait bon à son ombre."
        ]
      },
      "belvedere": {
        "trouve": [
          "Un rocher plat, tout en haut, et le pays entier à tes pieds : les rivières, les forêts, les toits des hameaux.",
          "D'ici, on voit jusqu'à la mer. Tu reconnais des chemins, des lacs, des coins que tu n'as jamais vus."
        ],
        "deja": ["Le pays s'étend toujours à tes pieds. Quelle vue !", "Le vent souffle fort, ici. Tout est calme, en bas."]
      },
      "pierre_levee": {
        "trouve": [
          "Une grande pierre dressée vers le ciel, couverte de lichen. À son pied, quelqu'un a laissé quelque chose.",
          "Personne ne sait qui l'a levée, ni quand. À son pied, dans l'herbe, une offrande oubliée."
        ],
        "deja": ["La pierre levée regarde le ciel, comme toujours.", "Tu poses la main sur la pierre. Elle est tiède de soleil."]
      }
    },
    "TRESORS": {
      "ruine": [["pieces", 60, 140], ["amethyste", 1, 1], ["graine_tournesol", 2, 4], ["miel", 1, 2]],
      "cairn": [["quartz", 1, 2], ["ammonite", 1, 1], ["trilobite", 1, 1], ["herbes_montagne", 2, 4]],
      "arbre_ancien": [["chataigne", 3, 6], ["champignon", 2, 4], ["miel", 1, 2], ["gland", 2, 4]],
      "pierre_levee": [["amethyste", 1, 1], ["perle", 1, 1], ["pieces", 50, 120], ["quartz", 1, 2]]
    },
    "PAGES": [
      "carnet_voyageur_1",
      "carnet_voyageur_2",
      "carnet_voyageur_3",
      "carnet_voyageur_4",
      "carnet_voyageur_5",
      "carnet_voyageur_6",
      "carnet_voyageur_7",
      "carnet_voyageur_8"
    ]
  },
  "VILLAGE": {
    "ACTIF": false,
    "ARRIVEE": {
      "RESERVE_JOURS": 2,
      "PLAFOND": { "1": 2, "2": 4, "3": 6, "4": 9, "5": 12 },
      "BOURSE": 20,
      "JOURNAL": 7,
      "TOC": "Toc, toc !",
      "PHRASES": [
        "Je suis {prenom}, j'arrive par le bac : c'est ma maison ?",
        "Moi, c'est {prenom}. Merci pour la maison, je m'installe !",
        "{prenom}, pour te servir : me voilà chez moi."
      ]
    },
    "HORAIRE": {
      "LEVER": 6.5,
      "SORTIE": 7.5,
      "MIDI": 12,
      "REPRISE": 13.25,
      "SOUPER": 18.5,
      "VEILLEE": 19.5,
      "COUCHER": 21.25,
      "DECALE": 0.5,
      "CRENEAU": 0.5,
      "FLANER": [0.2, 0.4],
      "PLACE": 3,
      "PROMENADE": 8,
      "VITESSE": 1,
      "CHEMIN": 1.5
    },
    "PHRASES": {
      "ACTIVITE": {
        "lever": ["Je me lève à peine.", "Encore un peu de café et je sors.", "Le jour se lève sur l'île."],
        "dehors": ["Je fais le tour de la ferme.", "Je me dégourdis les jambes.", "Il fait bon marcher par ici."],
        "repas": ["C'est l'heure de manger.", "À table !", "Ça sent bon, ce midi."],
        "flaner": ["Je prends le temps de souffler.", "On est bien, sur ce banc.", "Je regarde pousser tes cultures."],
        "rentrer": ["Je rentre à la maison.", "La journée s'achève, je rentre.", "Une veillée au chaud, et au lit."],
        "dormir": ["(ça dort à poings fermés)", "(un ronflement tranquille)"],
        "repos": ["Je me repose aujourd'hui.", "Une journée tranquille à la maison.", "Je reprends des forces."],
        "abri": ["Quelle averse ! Je reste à l'abri.", "J'attends que la pluie passe.", "Il pleut des cordes."],
        "recoit": ["J'attends une visite.", "Un ami doit passer me voir.", "Je guette la porte : on vient me voir !"],
        "travail": ["Je suis au travail.", "Le travail, ça ne se fait pas tout seul !"],
        "attend": ["J'attends de pouvoir me mettre au travail : {raison}", "Je ne peux pas encore travailler : {raison}"]
      },
      "HUMEUR": {
        "heureux": ["On vit bien, sur l'île.", "La vie est douce, ici.", "Je suis bien, dans ma maison."],
        "content": ["Ça va, ça va.", "Tout va bien, merci !", "Encore une belle journée."],
        "triste": ["J'ai eu une petite semaine. Ça ira mieux demain !", "Un peu de soleil me ferait du bien."],
        "faim": ["La boîte à nourriture est un peu légère, ces jours-ci.", "Je mangerais bien une bonne soupe."]
      }
    },
    "SOCIAL": {
      "CONNAISSANCE": { "PAR_JOUR": 2, "VOISIN": 2, "VOISINE": 14, "TABLE": 1, "AFFINITE": 30, "COLLEGUE": 2 },
      "BUTS": {
        "POIDS": { "visite": 2, "rdv": 1.5, "promenade": 2, "banc": 1.5, "eau": 1.5, "voir": 2.5, "port": 1 },
        "RECOIT": 0.1,
        "DUREE": 2,
        "PORT_MAX": 40,
        "OUVRAGES": [
          "ruche",
          "bassin",
          "fontaine_",
          "ornement_",
          "massif_",
          "bloc_silo",
          "citerne",
          "compost",
          "station_robot",
          "tonnelet",
          "tas_citrouilles",
          "citrouille_halloween",
          "bonhomme_neige",
          "bac_",
          "pommier",
          "poirier",
          "cerisier",
          "abricotier",
          "pecher",
          "mangeoire_grain",
          "distributeur",
          "lavoir",
          "kiosque",
          "fontaine_village",
          "four_commun"
        ],
        "EMOJI": {
          "eau": "💧",
          "jardin": "🌱",
          "betes": "🐑",
          "ouvrage": "👀",
          "port": "⚓",
          "promenade": "🌿",
          "banc": "☺️",
          "soir": "🌙",
          "apporte": "🍲",
          "jeu": "🪁",
          "fete": "🎉",
          "chantier": "🔨"
        }
      },
      "CROISE": {
        "RAYON": 24,
        "ATTENTE": 40,
        "DUREE": [1.6, 2.5],
        "SIGNE": 0.5,
        "ENSEMBLE": 0.35,
        "BOUT": 12,
        "REGARD": 48,
        "JOUEUR": 28,
        "JOUEUR_AMI": 56,
        "JOUEUR_ATTENTE": 60,
        "TOUR": 3.2
      },
      "EMOJI": {
        "connaissance": ["👋", "😊"],
        "ami": ["😄", "❤️", "😊", "👋"],
        "proche": ["😄", "❤️", "🥰"],
        "intime": ["❤️", "🥰", "😄"],
        "retrouvailles": ["😄", "🥰"],
        "present": ["🎁"],
        "triste": ["🙂"]
      },
      "REPLIQUES": {
        "connaissance": [
          ["Bonjour, {prenom} !", "Bonjour ! Ça va bien ?"],
          ["Salut {prenom} !", "Salut ! Bonne journée !"],
          ["Tiens, {prenom} !", "Tiens, bonjour !"],
          ["Ça va, {prenom} ?", "Très bien, et toi ?"],
          ["On se croise souvent !", "C'est que l'île n'est pas si grande !"],
          ["Bien installé{e}, {prenom} ?", "Oui, je commence à m'y faire."],
          ["Bonne journée, {prenom} !", "Merci, à toi aussi !"],
          ["Tu vas loin comme ça ?", "Juste un petit tour !"],
          ["Bonjour, voisin{e} !", "Bonjour ! Tout va bien chez toi ?"],
          ["Il fait bon vivre ici, non ?", "Ah ça, on ne regrette pas le bac !"],
          ["Toujours en vadrouille, {prenom} ?", "Il faut bien se dégourdir les jambes !"],
          ["Bien dormi, {prenom} ?", "Comme un loir !"]
        ],
        "ami": [
          ["{prenom} ! Justement je pensais à toi !", "Ha ! Me voilà !"],
          ["Coucou {prenom} !", "Coucou ! Quelle bonne surprise !"],
          ["Tu passes ce soir ?", "Avec plaisir, j'apporte des gâteaux !"],
          ["Ça me fait plaisir de te voir !", "Moi aussi, {prenom} !"],
          ["Alors, ces nouvelles ?", "Tout va bien ! Et toi ?"],
          ["Tu as une mine superbe !", "C'est l'air de l'île !"],
          ["Je te garde une place à table ?", "Oh oui, à côté de toi !"],
          ["On fait un bout de chemin ?", "Allez, je t'accompagne !"],
          ["Tu m'as manqué, toi !", "On s'est vus hier, voyons !"],
          ["Mon ami{e} {prenom} !", "Toujours là, toujours fidèle !"],
          ["Tu sais quoi ? J'ai bien dormi !", "Ha ! Une grande nouvelle !"],
          ["Tu viens voir mes fleurs, un de ces jours ?", "Avec joie !"],
          ["Quel plaisir, {prenom} !", "Le plaisir est pour moi !"],
          ["Je t'ai cherché{e} partout !", "J'étais au puits, voyons !"]
        ],
        "matin": [
          ["Déjà debout, {prenom} ?", "Le soleil se lève tôt, moi aussi !"],
          ["Bien le bonjour !", "Bonjour ! Belle matinée, hein ?"],
          ["Un petit café ce matin ?", "Déjà bu, mais j'en reprendrais bien !"],
          ["Tu as vu la rosée ?", "Tout brille, ce matin !"],
          ["On commence la journée ensemble ?", "Bonne idée !"]
        ],
        "jour": [
          ["Bon appétit pour tout à l'heure !", "Merci ! Ça sent bon de partout."],
          ["Quelle journée, hein ?", "Une belle journée d'île !"],
          ["Tu as vu les cultures ?", "Elles poussent à vue d'œil !"],
          ["Il fait bon, cet après-midi.", "On resterait dehors jusqu'au soir !"],
          ["Tu as fait quoi, ce matin ?", "Pas grand-chose, et c'était parfait !"]
        ],
        "proche": [
          ["Te voilà, toi ! Ma journée est complète.", "La mienne aussi, maintenant !"],
          ["Je savais que je te trouverais ici.", "Tu me connais trop bien !"],
          ["Tu viens t'asseoir avec moi ?", "Toujours, tu le sais bien."],
          ["Qu'est-ce que je ferais sans toi, {prenom} ?", "Tu t'ennuierais, voilà tout !"],
          ["On est bien, tous les deux.", "Comme toujours."],
          ["Tu as bien dormi, mon ami{e} ?", "Oui ! J'ai rêvé de l'île."]
        ],
        "soir": [
          ["Bonne soirée, {prenom} !", "Bonne soirée ! Dors bien !"],
          ["Déjà le soir...", "Les journées filent, ici."],
          ["On rentre ?", "Oui, la soupe m'attend !"],
          ["À demain, {prenom} !", "À demain !"],
          ["Quel beau coucher de soleil !", "On ne s'en lasse pas."]
        ],
        "pluie": [
          ["Quelle averse !", "Bon pour les cultures, au moins !"],
          ["Tu es trempé{e} !", "Toi aussi, regarde-toi !"],
          ["Ça va se lever, tu crois ?", "Un peu de patience !"],
          ["Il pleut des cordes, aujourd'hui.", "Une soupe bien chaude, ce soir !"]
        ],
        "clair": [
          ["Quel beau soleil !", "Une vraie journée d'été !"],
          ["Pas un nuage !", "Le temps idéal pour se promener !"],
          ["Il fait doux, hein ?", "On est bien, sur l'île."],
          ["Tu sens ce petit vent ?", "Ça sent la mer !"]
        ],
        "triste": [
          ["Ça n'a pas l'air d'aller ?", "Une petite fatigue. Ça passera !"],
          ["Tu veux un peu de compagnie ?", "Oh oui, merci, {prenom}."],
          ["Courage, {prenom} !", "Merci, ça fait du bien !"],
          ["Tu as bien mangé ?", "Pas assez... Ça ira mieux demain."]
        ],
        "visite": [
          ["Coucou, c'est moi !", "Oh, entre donc ! Enfin, sortons !"],
          ["Je passais te dire bonjour !", "Quelle bonne idée !"],
          ["Tu as un moment ?", "Pour toi, toujours !"],
          ["Je ne te dérange pas ?", "Jamais, voyons !"],
          ["Il fallait que je te raconte !", "Raconte, raconte !"],
          ["J'ai vu de la lumière !", "Viens, on prend l'air !"],
          ["On fait un brin de causette ?", "Avec plaisir !"],
          ["Je venais prendre de tes nouvelles.", "C'est gentil ! Tout va bien."]
        ],
        "groupe": [
          ["Vous avez vu le bac, ce matin ?", "Oui ! Il y avait du monde !"],
          ["Et si on faisait une fête ?", "Bonne idée ! On en parle à la famille ?"],
          ["L'eau du puits est fraîche !", "La meilleure de l'île !"],
          ["Qui a planté ces fleurs ?", "La famille, je crois. C'est beau !"],
          ["On est bien, tous ensemble.", "Ça, c'est vrai."],
          ["Vous savez la nouvelle ?", "Non ! Raconte !"],
          ["J'ai entendu un drôle d'oiseau.", "Moi aussi ! Il chantait faux !"],
          ["On devrait se voir plus souvent.", "On se voit tous les jours, voyons !"],
          ["Il paraît qu'un nouveau va arriver.", "Il faudra bien l'accueillir !"],
          ["Ça pousse bien, cette année.", "La famille s'y connaît !"],
          ["Qu'est-ce qu'on mange ce soir ?", "Une bonne soupe, j'espère !"],
          ["Vous avez bien dormi ?", "Comme des marmottes !"]
        ],
        "repas": [
          ["Tu me passes le pain ?", "Tiens, il est encore tiède !"],
          ["C'est bon, hein ?", "Un régal, comme toujours !"],
          ["Encore un peu de soupe ?", "Juste une louche, merci !"],
          ["À la vôtre !", "À la nôtre, et à l'île !"],
          ["Qui a cuisiné, ce soir ?", "La famille ! On a de la chance."],
          ["On mange bien, ici.", "Mieux que sur le bac, ça !"],
          ["Il reste de la tarte ?", "Je t'en ai gardé une part !"],
          ["Bon appétit, tout le monde !", "Bon appétit !"]
        ],
        "soiree": [
          ["Bonsoir ! Je ne te dérange pas ?", "Jamais ! Viens, on prend le frais."],
          ["J'ai vu ta lumière, alors je passe.", "Tu as bien fait, j'allais m'ennuyer !"],
          ["Une petite visite avant de dormir ?", "Avec plaisir, il fait si doux."],
          ["Regarde les étoiles, {prenom} !", "On en voit tellement, d'ici."],
          ["Tu me racontes ta journée ?", "Oh, il y a tant à dire !"],
          ["Je t'ai gardé une part de tarte.", "Tu es un amour !"],
          ["Bonne nuit, à demain !", "Dors bien, à demain !"]
        ],
        "apporte": [
          ["Je t'apporte de la soupe, toute chaude !", "Oh, merci… Ça me touche beaucoup."],
          ["Tiens, c'est pour toi. Repose-toi bien.", "Tu es trop gentil{e}, {prenom}."],
          ["Il faut manger pour reprendre des forces !", "Merci, ça va déjà mieux."],
          ["J'ai fait un peu trop de ragoût…", "Comme par hasard ! Merci, mon ami{e}."],
          ["Ne bouge pas, je m'occupe de tout.", "Qu'est-ce que je ferais sans toi ?"]
        ],
        "banc": [
          ["On est bien, sur ce banc.", "On y resterait des heures."],
          ["Tu te souviens de ton premier jour ?", "Comme si c'était hier !"],
          ["Regarde, le jardin a encore poussé.", "La famille travaille bien."],
          ["Assieds-toi, je te garde la place.", "Merci, mes jambes te remercient !"],
          ["Il fait bon, à l'ombre.", "Le meilleur banc de l'île."]
        ],
        "promenade": [
          ["On va jusqu'au bout du chemin ?", "Allons-y, à petits pas !"],
          ["Il fait bon marcher avec toi.", "On refait ça demain ?"],
          ["Regarde comme c'est beau, par là.", "On a de la chance de vivre ici."],
          ["Tu marches trop vite !", "Pardon, j'avais hâte de voir !"],
          ["Tu te souviens de ton arrivée ?", "Comme si c'était hier !"]
        ],
        "travail": [
          ["On s'y remet, {prenom} ?", "Allez, courage, on y est presque !"],
          ["Tu me passes un coup de main ?", "Bien sûr, à deux ça va plus vite !"],
          ["Ça avance bien, non ?", "On fait du bon travail, tous les deux."],
          ["Tu as vu tout ce qu'on a fait ce matin ?", "Le joueur va être content !"],
          ["Je commence à avoir faim.", "Tiens bon, c'est bientôt midi !"],
          ["Tu as l'œil, {prenom} !", "Je regarde comment tu fais, tiens !"],
          ["Une petite pause ?", "Juste le temps de souffler, alors."],
          ["Attention où tu mets les pieds !", "Merci, j'ai failli tomber !"],
          ["On forme une bonne équipe.", "La meilleure de l'île !"],
          ["Encore un peu et on a fini.", "Après, une bonne soupe !"]
        ],
        "fete": [
          ["Quelle belle fête !", "On devrait en faire plus souvent !"],
          ["Tu as goûté à tout ?", "Deux fois, même ! Chut !"],
          ["À la santé du village !", "Et à tous ceux qui y vivent !"],
          ["Regarde, tout le monde est là.", "On est une vraie famille, ici."],
          ["Tu danses, {prenom} ?", "Si tu me promets de ne pas rire !"],
          ["Les lampions sont magnifiques.", "On se croirait dans un conte."],
          ["Tu te souviens de la première fête ?", "On n'était que trois, à l'époque !"],
          ["Encore un peu de tarte ?", "Juste une petite part, alors."],
          ["Merci d'être venu, {prenom}.", "Je n'aurais manqué ça pour rien au monde !"],
          ["On chante quelque chose ?", "Toi d'abord, je te suis !"],
          ["Il fait bon, ce soir.", "Une soirée comme on les aime."],
          ["Quelle chance, cette île.", "Et ces voisins, surtout !"]
        ],
        "chantier": [
          ["Tu tiens la planche, {prenom} ?", "Vas-y, je la tiens bien droite !"],
          ["Ça prend forme, regarde !", "Le village va être fier !"],
          ["Encore une pierre et on fait une pause.", "Je t'attends à l'ombre, alors !"],
          ["On le bâtit pour tout le monde.", "C'est ça qui donne du cœur à l'ouvrage."],
          ["Tu crois qu'on aura fini pour la fête ?", "Si on s'y met tous, sûrement !"],
          ["Passe-moi le marteau, tu veux ?", "Tiens, et attention aux doigts !"]
        ]
      },
      "JOUEUR": {
        "connaissance": ["Bonjour, {joueur} !", "Salut, {joueur} !", "Belle journée, {joueur} !", "Oh, bonjour !", "Ça va, {joueur} ?"],
        "ami": [
          "{joueur} ! Ça fait plaisir !",
          "Coucou, {joueur} !",
          "Merci pour tout, {joueur} !",
          "Te voilà, {joueur} !",
          "Toujours au travail, {joueur} ?"
        ],
        "proche": [
          "{joueur} ! Je pensais justement à toi !",
          "Ah, {joueur} ! Ma journée est plus belle.",
          "Viens, {joueur}, que je te dise bonjour !",
          "{joueur} ! Tu as une minute pour moi ?",
          "Quel plaisir de te croiser, {joueur} !"
        ],
        "intime": [
          "{joueur} ! Toi, tu me fais toujours sourire.",
          "Mon ami {joueur} ! Viens là !",
          "{joueur} ! L'île ne serait pas pareille sans toi.",
          "Ah, te voilà enfin, {joueur} ! Je t'attendais.",
          "{joueur} ! Tu sais que tu comptes, ici ?"
        ],
        "retrouvailles": [
          "{joueur} ! Te revoilà ! Ça faisait longtemps !",
          "Oh, {joueur} ! Tu m'as manqué, tu sais.",
          "{joueur} ! Quelle joie de te revoir !"
        ],
        "present": [
          "{joueur} ! Attends, j'ai un petit quelque chose pour toi !",
          "Tiens, {joueur}, je t'ai gardé ça !",
          "{joueur} ! C'est pour toi, de bon cœur."
        ]
      },
      "ACTIVITE": {
        "visite": ["Je rends visite à un ami.", "On cause un peu, devant la porte.", "Je passais dire bonjour."],
        "etal": ["Je fais mes courses à ton étal.", "Je regarde ce que tu vends.", "Ton étal est bien garni !"],
        "commerce": ["Je fais un tour au comptoir.", "Je viens voir ce que l'artisan a fait aujourd'hui.", "Une petite emplette au commerce."],
        "rdv": ["On se retrouve entre amis.", "On bavarde un peu, ici.", "On refait le monde, sur la place."],
        "promenade": ["On se promène à deux.", "Un petit tour avec un ami.", "On marche un peu ensemble."],
        "eau": ["Je viens puiser de l'eau.", "L'eau du puits est bien fraîche."],
        "jardin": ["Je regarde pousser ton jardin.", "Tes cultures ont belle allure !"],
        "betes": ["Je viens voir les bêtes.", "Elles ont l'air bien, tes bêtes."],
        "ouvrage": ["J'admire ce que tu as bâti.", "C'est du beau travail, ça."],
        "port": ["Je descends voir le port.", "J'aime regarder les bateaux."],
        "banc": ["On se repose un peu, côte à côte.", "Un banc, un ami : que demander de plus ?"],
        "soir": ["Je passe la soirée chez un ami.", "Une petite visite avant d'aller dormir."],
        "apporte": ["J'apporte un repas à un ami qui se repose.", "Il faut bien s'entraider !"],
        "jeu": ["Je joue sur la place !", "On s'amuse bien, ici !"],
        "fete": ["C'est la fête du village !", "Quelle belle fête, tu ne trouves pas ?", "Tout le village est sur la place !"],
        "chantier": ["Je travaille au chantier du village.", "On bâtit quelque chose de beau, tous ensemble.", "Le chantier avance bien !"]
      }
    },
    "AMITIE": {
      "ACCUEIL": 10,
      "FAMILLE_AMI": 2,
      "CONFIE": { "PALIER": 2, "CHANCE": 0.35 },
      "TACHE_SANS_HUMEUR": 3,
      "PROPOS_PART": 0.4,
      "METIERS": {
        "bois": "bucheron",
        "pierre": "mineur",
        "peche": "pecheur",
        "betes": "berger",
        "cueillette": "cueilleur",
        "verger": "cueilleur",
        "champs": "jardinier",
        "fauchage": "jardinier",
        "cuisine": "jardinier",
        "navette": "jardinier",
        "forge": "mineur",
        "*": "jardinier"
      },
      "DEMANDES": { "CHANCE": 0.35, "MAX": 2, "DEPUIS": 2 },
      "PHRASES": {
        "cadeau": {
          "adore": ["Oh ! J'adore ça ! Merci !", "Mon préféré ! Tu as deviné ?", "Ça, c'est un vrai cadeau ! Merci !"],
          "aime": ["Oh, merci ! J'aime bien ça.", "C'est gentil, ça me fait plaisir !", "Merci ! Ça tombe bien."],
          "neutre": ["Merci, c'est gentil.", "Oh, merci beaucoup !"],
          "deteste": ["Oh… merci quand même.", "Hum… c'est l'intention qui compte !"]
        },
        "gout": {
          "adore": ["Tu sais ce que j'adore ? {objet} !", "Un secret : {objet}, j'en raffole.", "{Objet}… rien ne me fait plus plaisir !"],
          "aime": ["J'aime bien {objet}, tu sais.", "{Objet}, ça me fait toujours plaisir.", "Si tu as {objet} en trop, pense à moi !"],
          "deteste": ["Entre nous, {objet}… très peu pour moi !", "Je te le dis : {objet}, je n'aime pas du tout."]
        },
        "present": [
          "Tiens, c'est pour toi : {quoi}. De bon cœur !",
          "Je t'ai gardé ça : {quoi}. Pour toi !",
          "Un petit présent : {quoi}. Merci pour tout !"
        ],
        "retrouvailles": ["Te revoilà ! Ça faisait longtemps.", "Quelle joie de te revoir !", "Ah, te voilà enfin ! Tu m'as manqué."],
        "annonce": "📜 {prenom} a une demande pour toi : {n} × {objet}.",
        "table": [
          "Ça fait du bien de manger ensemble.",
          "Quel bon repas, entre voisins !",
          "On est bien, sur cette île.",
          "Le village, c'est aussi ça : une table à partager."
        ]
      }
    },
    "PROPOS": {
      "GARDES": [
        "ferme_vide",
        "ferme_moutons",
        "ferme_vaches",
        "ferme_ruches",
        "ferme_verger",
        "ferme_moulin",
        "gout_connu",
        "lune_pleine",
        "lune_nouvelle",
        "lune_croissante",
        "lune_decroissante",
        "meteo_pluie",
        "meteo_brume",
        "mois"
      ],
      "ferme_cultures": [
        "Ton coin de {culture} a fière allure, ce matin !",
        "Ta {culture} pousse bien. Tu me diras ton secret ?",
        "Je passe devant ta {culture} chaque jour : quel plaisir !",
        "{n} parcelles cultivées ? Tu as la main verte.",
        "La {culture}, ça aime la patience. Toi aussi, on dirait !",
        "Avec toute cette {culture}, l'île ne manquera pas de soupe."
      ],
      "ferme_poules": [
        "Tes {n} poules, elles pondent bien ?",
        "Je les entends, tes poules, le matin. Ça réveille !",
        "Des poules sur l'île, c'est des œufs au petit-déjeuner !",
        "Un peu de blé chaque jour, et tes poules te le rendront en œufs."
      ],
      "ferme_maison": [
        "Ta ferme a bien changé depuis que je suis là.",
        "Tu as encore construit quelque chose ? Tu ne t'arrêtes jamais !",
        "Le village prend forme, grâce à toi.",
        "Une maison qui grandit, c'est une famille heureuse."
      ],
      "cadeau_merci": [
        "Merci encore pour ton cadeau. J'y pense encore !",
        "Ton cadeau de l'autre jour m'a fait tellement plaisir.",
        "Ton cadeau a trouvé sa place chez moi. Merci !"
      ],
      "ami_proche": [
        "Quand je te vois arriver, ma journée s'éclaire.",
        "Je ne regrette pas d'avoir pris le bac jusqu'ici, tu sais.",
        "Si tu as besoin de quoi que ce soit, tu sais où me trouver.",
        "Il y a toujours une place pour toi à ma table.",
        "Sur cette île, je me sens chez moi. Grâce à toi."
      ],
      "jours": ["Déjà {jours} jours sur l'île ! Le temps file.", "{jours} jours sur l'île… et tant de choses déjà bâties."],
      "village_depuis": ["Ça fait {jours} jours que j'ai débarqué. Je me sens chez moi.", "Déjà {jours} jours ici ! Je ne regrette pas le voyage."],
      "village_ami": [
        "{ami} et moi, on s'entend vraiment bien.",
        "Si tu cherches {ami}, on est souvent ensemble.",
        "Avec {ami}, on se raconte tout. Enfin, presque !",
        "{ami} m'a bien aidé{e} ce matin. Un vrai ami."
      ],
      "village_voisin": [
        "Tu connais bien {voisin} ? Dis-lui bonjour de ma part.",
        "{voisin} m'a parlé de toi hier. Que du bien !",
        "J'apprends à connaître {voisin}. Quelqu'un de bien.",
        "{voisin} a ri toute la soirée hier. Ça fait du bien !"
      ],
      "village_collegue": [
        "Avec {collegue}, on fait une bonne équipe, au travail.",
        "{collegue} travaille avec moi : le temps passe plus vite.",
        "Le travail à deux, avec {collegue}, c'est plus gai."
      ],
      "village_nouveau": [
        "Tu as vu ? {qui} vient d'arriver par le bac !",
        "{qui} s'installe à peine. On l'aidera un peu.",
        "Bienvenue à {qui} ! Le village grandit."
      ],
      "voisin": [
        "{voisin} habite juste à côté. On se fait signe chaque matin !",
        "Entre voisins, avec {voisin}, on se rend service.",
        "Je vois la lumière de {voisin} le soir : ça rassure."
      ],
      "lien_ami": [
        "{ami} et moi, on ne se quitte plus.",
        "Tu cherches {ami} ? Demande-moi, je sais toujours où {il_ami} est !",
        "Avec {ami}, on partage tout : le pain, les nouvelles, les fous rires."
      ],
      "visite_recue": [
        "{qui} est passé{e_qui} me voir hier soir. On a bavardé jusqu'à la nuit !",
        "J'ai eu de la visite : {qui}. Ça m'a fait chaud au cœur."
      ],
      "visite_faite": ["Hier soir, je suis allé{e} chez {chez}. Quelle bonne soirée !", "J'ai rendu visite à {chez} après le souper. On a bien ri."],
      "entraide_recue": [
        "Quand je me reposais, {qui} m'a apporté à manger. On n'oublie pas ça.",
        "Sans {qui}, j'aurais eu le ventre vide. Quel ami !"
      ],
      "entraide_donnee": ["J'ai porté un repas à {aide} : entre amis, c'est normal.", "{aide} se reposait : je lui ai apporté de la soupe."],
      "foyer": [
        "Avec {conjoint}, on a notre maison à nous. Merci pour tout !",
        "Vivre avec {conjoint}, c'est le bonheur tout simple.",
        "Le soir, avec {conjoint}, on regarde la lune depuis la porte."
      ],
      "enfant": ["{enfant} a encore joué toute la journée sur la place !", "Tu as vu {enfant} ? {il_enfant} grandit si vite !"],
      "port_bac": [
        "Le bac passe demain. Qui sait qui il amènera ?",
        "Demain, c'est jour de bac. J'irai voir le port !",
        "Le bac arrive demain : l'île va avoir de la visite."
      ],
      "souvenir_villageois": [
        "Tu te souviens du jour où j'ai débarqué du bac ? Il y a déjà {jours} jours !",
        "Il y a {jours} jours, je posais ma valise ici. Je m'en souviens comme d'hier.",
        "Le jour {jour}, je découvrais {village}. Quel souvenir !"
      ],
      "souvenir_proche": [
        "Tu te souviens ? Il y a {jours} jours, {autre} et moi, on est devenus inséparables.",
        "{autre}, c'est devenu quelqu'un de cher. Depuis le jour {jour}, on ne se quitte plus."
      ],
      "souvenir_foyer": [
        "Le jour {jour}, {autre} et moi, on a emménagé ensemble. Je n'oublierai pas.",
        "Ça fait {jours} jours qu'on vit sous le même toit, {autre} et moi."
      ],
      "souvenir_commerce": ["Tu te souviens du jour où j'ai ouvert {commerce} ?", "{Commerce} a ouvert il y a {jours} jours. Le temps passe !"],
      "souvenir_dixieme": [
        "Quand je suis arrivé{e}, on est devenus dix au village. Tu te souviens ?",
        "Dixième villageois ! Ça m'a fait drôle, le jour {jour}."
      ],
      "souvenir_fete": ["Tu te souviens de {fete} ? Quelle journée !", "{Fete}, il y a {jours} jours… On en parle encore."],
      "souvenir_projet": ["Tu te souviens quand on a fini {projet} ? Il y a {jours} jours déjà.", "{Projet} : quelle fierté d'y avoir mis la main !"]
    },
    "LIENS": {
      "AFFINITE": 20,
      "PALIERS": { "connaissance": 10, "camarade": 25, "ami": 45, "proche": 75 },
      "GAINS": { "ILE": 1, "VOISIN": 1, "VOISINE": 14, "POSTE": 4, "TABLE": 1, "SORTIE": 1, "FETE": 4, "FOYER": 3, "ENTRAIDE": 5 },
      "LENT": 45,
      "BONHEUR": { "AMI": 4, "PROCHE": 6 },
      "TRAVAIL": { "PALIER": 3, "ACTIONS": 1 },
      "SOIR": { "CHANCE": 0.35, "DUREE": 1, "PAR": 3 },
      "ENTRAIDE": { "BONHEUR": 6 },
      "FOYER": { "PALIER": 4 },
      "ENFANT": { "PARENTS": 85 },
      "AVIS": [3, 4]
    },
    "NOMS": {
      "VILLAGE_A": 3,
      "ILE": [
        "Île aux Mouettes",
        "Île des Brumes",
        "Île du Grand Vent",
        "Île aux Saules",
        "Île des Lucioles",
        "Île Clairelune",
        "Île aux Coquelicots",
        "Île de la Marée",
        "Île Belle-Anse",
        "Île des Trois Pins",
        "Île aux Hérons",
        "Île du Phare",
        "Île Douce-Lune",
        "Île des Galets",
        "Île aux Abeilles",
        "Île Verte-Rive"
      ],
      "VILLAGE": {
        "DEBUTS": ["Pré", "Val", "Mont", "Bois", "Clair", "Beau", "Roche", "Fontaine", "Rive", "Haute", "Belle", "Font"],
        "FINS": [
          "-Fleuri",
          "-Doré",
          "-Joli",
          "-sur-Mer",
          "-la-Lune",
          "-aux-Pins",
          "-le-Vent",
          "-Tranquille",
          "-des-Prés",
          "-les-Bains",
          "-Soleil",
          "-les-Saules"
        ]
      },
      "COMMERCES": {
        "forge": ["la", "Forge"],
        "mercerie": ["la", "Mercerie"],
        "scierie": ["la", "Scierie"],
        "boulangerie": ["la", "Boulangerie"],
        "fromagerie": ["la", "Fromagerie"],
        "*": ["l'", "Échoppe"]
      },
      "COMPLEMENTS": [
        "du Vieux Chêne",
        "de la Lune",
        "du Coq",
        "de l'Ancre",
        "des Mouettes",
        "du Moulin",
        "du Port",
        "des Saules",
        "du Puits",
        "de l'Étoile",
        "des Galets",
        "du Pont"
      ],
      "MAISONS": [
        "des Saules",
        "du Puits",
        "des Roses",
        "du Vent",
        "des Galets",
        "de la Lune",
        "aux Volets Bleus",
        "du Verger",
        "des Lilas",
        "du Phare"
      ]
    },
    "CHRONIQUE": {
      "MAX": 120,
      "EPINGLES": 24,
      "NOTE_MAX": 140,
      "SOUVENIR": { "DEPUIS": 3, "JUSQUA": 120 },
      "TYPES": {
        "avant": { "icone": "📖", "texte": "{texte}", "cle": "avant:{id}" },
        "arrivee": { "icone": "🏝️", "texte": "La famille {famille} débarque sur {lIle} : tout est à bâtir.", "cle": "arrivee" },
        "recolte": { "icone": "🌱", "texte": "Première récolte de l'île : {culture}.", "cle": "recolte" },
        "vente": { "icone": "⚓", "texte": "Première vente au port : {objet}.", "cle": "vente" },
        "villageois": { "icone": "🧳", "texte": "{prenom} débarque du bac et s'installe sur l'île.", "cle": "villageois:{qui}" },
        "enfant": { "icone": "👶", "texte": "{prenom} arrive par le bac chez {pa} et {pb}.", "cle": "villageois:{qui}" },
        "village": { "icone": "🏘️", "texte": "Le village prend un nom : {village}.", "cle": "village" },
        "village_nom": { "icone": "🏘️", "texte": "Le village s'appelle désormais {village}.", "cle": "village_nom:{jour}" },
        "ile_nom": { "icone": "🏝️", "texte": "L'île s'appelle désormais {ile}.", "cle": "ile_nom:{jour}" },
        "dixieme": { "icone": "🎉", "texte": "Avec {prenom}, {village} compte dix villageois.", "cle": "dixieme" },
        "palier": { "icone": "🏅", "texte": "Palier {n} franchi : {titre}.", "cle": "palier:{n}" },
        "port": { "icone": "🏗️", "texte": "Le port passe au niveau {niveau}.", "cle": "port:{niveau}" },
        "commerce": { "icone": "🛠️", "texte": "{prenom} ouvre {commerce}.", "cle": "commerce:{id}" },
        "envie": { "icone": "💭", "texte": "{prenom} rêve d'ouvrir {quoi}.", "cle": "envie:{qui}:{sorte}" },
        "proche": { "icone": "💞", "texte": "{pa} et {pb} deviennent proches.", "cle": "proche:{a}|{b}" },
        "foyer": { "icone": "🏡", "texte": "{pa} et {pb} s'installent ensemble.", "cle": "foyer:{id}" },
        "fete": { "icone": "🎊", "texte": "{Nom} {lieu}.", "cle": "fete:{id}:{jour}" },
        "projet": { "icone": "🧱", "texte": "{Lieu} achève son projet : {nom}.", "cle": "projet:{id}" }
      },
      "RESUME": {
        "villageois": ["un villageois arrivé", "{n} villageois arrivés"],
        "enfant": ["un enfant arrivé", "{n} enfants arrivés"],
        "palier": ["un palier franchi", "{n} paliers franchis"],
        "port": ["le port agrandi", "le port agrandi {n} fois"],
        "commerce": ["un commerce ouvert", "{n} commerces ouverts"],
        "envie": ["une envie de commerce", "{n} envies de commerce"],
        "proche": ["deux villageois devenus proches", "{n} paires devenues proches"],
        "foyer": ["un foyer formé", "{n} foyers formés"],
        "fete": ["une fête", "{n} fêtes"],
        "projet": ["un projet achevé", "{n} projets achevés"],
        "*": ["un moment noté", "{n} moments notés"]
      }
    },
    "PALIERS": [
      {
        "titre": "S'installer",
        "icone": "🏕️",
        "recompense": { "objets": { "bac_carre": 2, "lanterne": 2 } },
        "objectifs": [
          { "type": "maison", "cible": 1, "libelle": "Bâtir le foyer (une pièce close, une paillasse)", "unite": "" },
          { "type": "houe", "cible": 1, "libelle": "Fabriquer une houe à l'Atelier", "unite": "" },
          { "type": "labours", "cible": 6, "libelle": "Labourer 6 tuiles", "unite": "" },
          { "type": "semis", "cible": 6, "libelle": "Planter 6 parcelles", "unite": "" },
          { "type": "arrosees", "cible": 6, "libelle": "Arroser 6 parcelles le même jour", "unite": "" },
          { "type": "recoltes", "cible": 1, "libelle": "Faire une première récolte", "unite": "" }
        ]
      },
      {
        "titre": "La première vente au port",
        "icone": "⚓",
        "recompense": { "plans": ["pergola"], "objets": { "banc_jardin": 1 } },
        "objectifs": [
          { "type": "niveau", "cible": 2, "libelle": "Atteindre le niveau 2", "unite": "" },
          { "type": "cultures", "cible": 4, "libelle": "Récolter 4 cultures différentes", "unite": "" },
          { "type": "silo", "cible": 1, "libelle": "Construire le Silo (niveau 3)", "unite": "" },
          { "type": "ventesPort", "cible": 50, "libelle": "Vendre pour 50 pièces au port", "unite": "💰" }
        ]
      },
      {
        "titre": "Le premier villageois",
        "icone": "🧑‍🌾",
        "recompense": { "plans": ["banc_rondins"] },
        "objectifs": [
          { "type": "villageois", "cible": 1, "libelle": "Installer un villageois dans sa maison", "unite": "" },
          { "type": "siloBle", "cible": 50, "libelle": "Stocker 50 blés au Silo", "unite": "" },
          { "type": "objet", "item": "minerai_fer", "cible": 4, "libelle": "Rapporter 4 minerais de fer d'un gisement", "unite": "" }
        ]
      },
      {
        "titre": "Les bêtes",
        "icone": "🐔",
        "recompense": { "plans": ["table_rondins"] },
        "objectifs": [
          { "type": "pontes", "cible": 7, "libelle": "Pondre 7 nuits d'affilée", "unite": "nuits" },
          { "type": "laines", "cible": 10, "libelle": "Tondre 10 laines", "unite": "" },
          { "type": "portNiveau", "cible": 2, "libelle": "Agrandir le port (niveau 2)", "unite": "" }
        ]
      },
      {
        "titre": "Trois villageois au travail",
        "icone": "🧺",
        "recompense": { "plans": ["chaise_peinte"] },
        "objectifs": [
          { "type": "villageois", "cible": 3, "libelle": "Installer 3 villageois", "unite": "" },
          { "type": "taches", "cible": 3, "libelle": "Confier une tâche à 3 villageois", "unite": "" },
          { "type": "pains", "cible": 5, "recette": "pain", "libelle": "Cuire 5 pains", "unite": "" },
          { "type": "plats", "cible": 3, "exclut": ["pain"], "libelle": "Préparer 3 plats différents (hors pain)", "unite": "" }
        ]
      },
      {
        "titre": "Le premier commerce",
        "icone": "🔨",
        "recompense": { "objets": { "bac_long": 1, "graine_lavande": 3, "cacao": 1, "vanille": 1, "cafe": 1 } },
        "objectifs": [
          { "type": "commerces", "cible": 1, "libelle": "Ouvrir un premier commerce", "unite": "" },
          { "type": "amitieVillageois", "palier": 2, "cible": 1, "libelle": "Devenir « cordial » avec un villageois", "unite": "" },
          { "type": "objet", "item": "lingot_fer", "cible": 1, "libelle": "Fondre un lingot de fer au Four", "unite": "" },
          { "type": "portNiveau", "cible": 3, "libelle": "Agrandir le port (niveau 3)", "unite": "" }
        ]
      },
      {
        "titre": "Un village de dix",
        "icone": "🏘️",
        "recompense": { "plans": ["banc_pierre"], "objets": { "lanterne": 3 } },
        "objectifs": [
          { "type": "villageois", "cible": 10, "libelle": "Installer 10 villageois", "unite": "" },
          { "type": "commerces", "cible": 2, "libelle": "Ouvrir 2 commerces", "unite": "" },
          { "type": "amitieVillageois", "palier": 3, "cible": 3, "libelle": "Devenir « proche » de 3 villageois", "unite": "" },
          { "type": "styles", "cible": 3, "libelle": "Mêler 3 styles à la ferme (ou un style complet)", "unite": "" }
        ]
      }
    ],
    "OBJECTIFS": {
      "SEMAINE": [
        {
          "titre": "S'installer",
          "offre": { "graine_carotte": 6 },
          "recompense": { "xp": 30, "pieces": 20 },
          "objectifs": [
            {
              "id": "atelier",
              "icone": "🔨",
              "libelle": "Poser l'Atelier",
              "sous": "3 pierres et 3 bois, ramassés autour de toi",
              "taches": [{ "type": "etat", "quoi": "atelier", "guide": "atelier" }]
            },
            {
              "id": "potager",
              "icone": "🌱",
              "libelle": "Préparer le potager",
              "sous": "La houe, 3 cases labourées, un semis",
              "taches": [
                { "type": "etat", "quoi": "houe", "guide": "houe" },
                { "type": "compte", "quoi": "labourer", "n": 3, "guide": "labour" },
                { "type": "compte", "quoi": "planter", "n": 1, "guide": "semis" }
              ]
            }
          ]
        },
        {
          "titre": "L'eau",
          "recompense": { "xp": 40, "pieces": 20 },
          "objectifs": [
            {
              "id": "eau",
              "icone": "💧",
              "libelle": "Arroser tes semis",
              "sous": "Le puits, la cruche, puis arroser",
              "taches": [
                { "type": "etat", "quoi": "puits", "guide": "puits" },
                { "type": "etat", "quoi": "cruche", "guide": "puits" },
                { "type": "compte", "quoi": "arroser", "n": 1, "guide": "arroser" }
              ]
            },
            {
              "id": "faux",
              "icone": "🌾",
              "libelle": "Faucher l'herbe haute",
              "sous": "La faux, puis 6 touffes fauchées",
              "taches": [{ "type": "etat", "quoi": "faux", "guide": "faux" }, { "type": "compte", "quoi": "faucher", "n": 6, "guide": "fibres" }]
            }
          ]
        },
        {
          "titre": "Les outils",
          "recompense": { "xp": 50, "pieces": 20, "objets": { "planche": 4 } },
          "objectifs": [
            {
              "id": "outils",
              "icone": "🪓",
              "libelle": "Fabriquer la hache et la pioche",
              "sous": "Bois, pierres et fibres",
              "taches": [{ "type": "etat", "quoi": "hache", "guide": "outils" }, { "type": "etat", "quoi": "pioche", "guide": "outils" }]
            },
            {
              "id": "arbre",
              "icone": "🌳",
              "libelle": "Abattre un arbre",
              "sous": "La hache en main, quelques coups",
              "taches": [{ "type": "compte", "quoi": "abattu", "n": 1, "guide": "couper" }]
            },
            {
              "id": "rocher",
              "icone": "🪨",
              "libelle": "Casser un rocher",
              "sous": "La pioche en main",
              "taches": [{ "type": "compte", "quoi": "casse", "n": 1, "guide": "casser" }]
            }
          ]
        },
        {
          "titre": "Le confort",
          "recompense": { "xp": 50, "pieces": 30 },
          "objectifs": [
            {
              "id": "cuisiniere",
              "icone": "🍳",
              "libelle": "Poser la cuisinière dans l'abri",
              "sous": "6 pierres, 4 planches",
              "taches": [{ "type": "etat", "quoi": "cuisiniere", "guide": "cuisiniere" }]
            },
            {
              "id": "cueillir",
              "icone": "🫐",
              "libelle": "Cueillir des baies",
              "sous": "Touche un buisson qui en porte",
              "taches": [{ "type": "compte", "quoi": "cueillir", "n": 1, "guide": "cueillir" }]
            },
            {
              "id": "soigner",
              "icone": "💧",
              "libelle": "Arroser tes plantes",
              "sous": "Chaque jour, elles grandissent",
              "taches": [{ "type": "compte", "quoi": "arroser", "n": 1, "guide": "arroser" }]
            }
          ]
        },
        {
          "titre": "L'île",
          "offre": { "sac": 1 },
          "recompense": { "xp": 60, "pieces": 30 },
          "objectifs": [
            {
              "id": "carte",
              "icone": "🧭",
              "libelle": "Ouvrir la carte de l'île",
              "taches": [{ "type": "compte", "quoi": "carte", "n": 1, "guide": "carte" }]
            },
            {
              "id": "sortie",
              "icone": "🛤",
              "libelle": "Sortir de la ferme",
              "sous": "Suis le chemin de terre",
              "taches": [{ "type": "etat", "quoi": "sortie", "guide": "sortie" }]
            },
            {
              "id": "prise",
              "icone": "🍄",
              "libelle": "Récolter quelque chose dehors",
              "taches": [{ "type": "etat", "quoi": "prise_monde", "guide": "recolte_monde" }]
            }
          ]
        },
        {
          "titre": "La première vente",
          "recompense": { "xp": 80, "pieces": 40 },
          "objectifs": [
            {
              "id": "recolte",
              "icone": "🥕",
              "libelle": "Récolter une culture",
              "sous": "Touche une plante mûre",
              "taches": [{ "type": "compte", "quoi": "recolter", "n": 1, "guide": "recolter" }]
            },
            {
              "id": "vente",
              "icone": "⚓",
              "libelle": "Vendre une récolte au port",
              "sous": "Sous la halle, au bout du chemin",
              "taches": [{ "type": "compte", "quoi": "vendre", "n": 1, "guide": "port" }]
            },
            {
              "id": "replanter",
              "icone": "🌱",
              "libelle": "Replanter",
              "taches": [{ "type": "compte", "quoi": "planter", "n": 1, "guide": "semis" }]
            }
          ]
        }
      ],
      "TIRES": {
        "LISTE": [
          {
            "id": "vendre",
            "icone": "⚓",
            "libelle": "Gagner {n} pièce{s} au port",
            "quoi": "vendre",
            "n": [20, 10, 300],
            "si": "marche",
            "guide": "port"
          },
          {
            "id": "parler",
            "icone": "💬",
            "libelle": "Parler à {n} villageois",
            "quoi": "parler",
            "n": [1, 0.25, 4],
            "si": "villageois",
            "guide": "parler"
          },
          {
            "id": "cadeau",
            "icone": "🎁",
            "libelle": "Offrir un cadeau à un villageois",
            "quoi": "cadeau_villageois",
            "n": [1, 0, 1],
            "si": "villageois",
            "guide": "parler"
          },
          {
            "id": "commande",
            "icone": "📦",
            "libelle": "Honorer {n} commande{s} du bac",
            "quoi": "commande_bac",
            "n": [1, 0.25, 3],
            "si": "bac",
            "guide": "port"
          }
        ]
      }
    },
    "DEHORS": [
      "chemin",
      "sol_pas_ardoise",
      "sol_pas_pierre",
      "sol_pas_bois",
      "lanterne",
      "candelabre",
      "pont_planches",
      "barriere",
      "barriere_blanche",
      "barriere_rouge",
      "barriere_grise",
      "barriere_chene",
      "barriere_verte",
      "barriere_lavande",
      "banc_jardin",
      "banc_rondins",
      "banc_pierre"
    ],
    "CHEMIN": { "VITESSE": 100, "PINCEAU": 2, "PRES_FERME": 8 },
    "PORTAGE": {
      "MAINS": 12,
      "BROUETTE": 40,
      "CHARRETTE": 160,
      "VOLUMES": {
        "bois": 2,
        "planche": 2,
        "pierre": 3,
        "minerai_fer": 3,
        "minerai_cuivre": 3,
        "minerai_or": 3,
        "minerai_platine": 3,
        "lingot_fer": 3,
        "lingot_cuivre": 3,
        "lingot_or": 3,
        "lingot_platine": 3,
        "bloc_silo": 4,
        "pierre_angle": 3
      }
    },
    "PRIX": {
      "FOURCHETTE": [130, 160],
      "ARTISANS": {
        "tissu": { "entrees": { "laine": 2 }, "sortie": { "tissu": 1 }, "coefPrix": 135 },
        "gants_travail": { "entrees": { "tissu": 1 }, "sortie": { "gants_travail": 1 }, "coefPrix": 140 },
        "manteau_chaud": { "entrees": { "tissu": 3 }, "sortie": { "manteau_chaud": 1 }, "coefPrix": 145 },
        "salopette": { "entrees": { "tissu": 2, "lingot_fer": 1 }, "sortie": { "salopette": 1 }, "coefPrix": 145 },
        "meuble_chaise": {
          "entrees": { "planche": 2 },
          "sortie": { "meuble_chaise": 1 },
          "coefPrix": 140,
          "commerce": "scierie",
          "palier": 2,
          "stock": 1
        },
        "meuble_chevet": {
          "entrees": { "planche": 2 },
          "sortie": { "meuble_chevet": 1 },
          "coefPrix": 140,
          "commerce": "scierie",
          "palier": 2,
          "stock": 1
        },
        "meuble_table_basse": {
          "entrees": { "planche": 3 },
          "sortie": { "meuble_table_basse": 1 },
          "coefPrix": 140,
          "commerce": "scierie",
          "palier": 2,
          "stock": 1
        },
        "meuble_table": {
          "entrees": { "planche": 4 },
          "sortie": { "meuble_table": 1 },
          "coefPrix": 140,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_commode": {
          "entrees": { "planche": 5 },
          "sortie": { "meuble_commode": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "stock": 1
        },
        "meuble_bibliotheque": {
          "entrees": { "planche": 6 },
          "sortie": { "meuble_bibliotheque": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "stock": 1
        },
        "meuble_armoire_chene": {
          "entrees": { "planche": 8 },
          "sortie": { "meuble_armoire_chene": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_buffet": {
          "entrees": { "planche": 6, "pierre": 2 },
          "sortie": { "meuble_buffet": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_lit_enfant": {
          "entrees": { "planche": 4, "tissu": 1 },
          "sortie": { "meuble_lit_enfant": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_lit_adulte": {
          "entrees": { "planche": 6, "tissu": 2 },
          "sortie": { "meuble_lit_adulte": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_canape": {
          "entrees": { "planche": 4, "tissu": 3 },
          "sortie": { "meuble_canape": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_tapis_1": {
          "entrees": { "fibre": 6 },
          "sortie": { "meuble_tapis_1": 1 },
          "coefPrix": 135,
          "commerce": "scierie",
          "palier": 2,
          "stock": 1
        },
        "meuble_tapis_2": {
          "entrees": { "tissu": 2, "colorant_rouge": 1 },
          "sortie": { "meuble_tapis_2": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "stock": 1
        },
        "meuble_tapis_3": {
          "entrees": { "tissu": 2, "colorant_bleu": 1 },
          "sortie": { "meuble_tapis_3": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "stock": 1
        },
        "meuble_tableau_1": {
          "entrees": { "planche": 1, "colorant_vert": 1 },
          "sortie": { "meuble_tableau_1": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_tableau_2": {
          "entrees": { "planche": 1, "colorant_rouge": 1 },
          "sortie": { "meuble_tableau_2": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_tableau_3": {
          "entrees": { "planche": 1, "colorant_bleu": 2 },
          "sortie": { "meuble_tableau_3": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_armoire_peinte": {
          "entrees": { "planche": 8, "colorant_bleu": 2 },
          "sortie": { "meuble_armoire_peinte": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_armoire_glace": {
          "entrees": { "planche": 6, "lingot_fer": 1 },
          "sortie": { "meuble_armoire_glace": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_cuisine_porte": {
          "entrees": { "planche": 3, "pierre": 1 },
          "sortie": { "meuble_cuisine_porte": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_cuisine_tiroirs": {
          "entrees": { "planche": 4 },
          "sortie": { "meuble_cuisine_tiroirs": 1 },
          "coefPrix": 140,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_cuisine_sauge": {
          "entrees": { "planche": 3, "colorant_vert": 1 },
          "sortie": { "meuble_cuisine_sauge": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_poubelle": {
          "entrees": { "planche": 1 },
          "sortie": { "meuble_poubelle": 1 },
          "coefPrix": 135,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_bibliotheque_vitree": {
          "entrees": { "planche": 6, "lingot_fer": 1 },
          "sortie": { "meuble_bibliotheque_vitree": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "meuble_lampadaire": {
          "entrees": { "planche": 1, "lingot_fer": 1, "fibre": 2 },
          "sortie": { "meuble_lampadaire": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_coffre_jouets": {
          "entrees": { "planche": 4, "colorant_rouge": 1 },
          "sortie": { "meuble_coffre_jouets": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_plante_ficus": {
          "entrees": { "planche": 1, "engrais": 1 },
          "sortie": { "meuble_plante_ficus": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_plante_monstera": {
          "entrees": { "planche": 1, "engrais": 2 },
          "sortie": { "meuble_plante_monstera": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_plante_sansevieria": {
          "entrees": { "planche": 1, "engrais": 1 },
          "sortie": { "meuble_plante_sansevieria": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_plante_cactus": {
          "entrees": { "pierre": 1, "engrais": 1 },
          "sortie": { "meuble_plante_cactus": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_plante_fougere": {
          "entrees": { "planche": 1, "engrais": 1, "fibre": 1 },
          "sortie": { "meuble_plante_fougere": 1 },
          "coefPrix": 150,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_plante_palmier": {
          "entrees": { "planche": 2, "engrais": 2 },
          "sortie": { "meuble_plante_palmier": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_plante_citronnier": {
          "entrees": { "planche": 2, "engrais": 3 },
          "sortie": { "meuble_plante_citronnier": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_plante_orchidee": {
          "entrees": { "pierre": 1, "engrais": 2 },
          "sortie": { "meuble_plante_orchidee": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 3,
          "commande": true
        },
        "meuble_plante_aloe": {
          "entrees": { "pierre": 1, "engrais": 1 },
          "sortie": { "meuble_plante_aloe": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 2,
          "commande": true
        },
        "meuble_plante_bonsai": {
          "entrees": { "pierre": 2, "engrais": 2 },
          "sortie": { "meuble_plante_bonsai": 1 },
          "coefPrix": 145,
          "commerce": "scierie",
          "palier": 4,
          "commande": true
        },
        "faisselle": { "entrees": { "lait": 2 }, "sortie": { "faisselle": 1 }, "coefPrix": 140, "commerce": "fromagerie", "palier": 2 },
        "tomme_cave": {
          "entrees": { "faisselle": 2 },
          "sortie": { "tomme_cave": 1 },
          "coefPrix": 150,
          "commerce": "fromagerie",
          "palier": 2,
          "cave": 4,
          "stock": 2
        }
      },
      "EXCEPTIONS": {
        "paille": "La botteleuse (une machine, pas une recette) rend une paille par fibre : à une pièce l'unité, un prix ne descend pas sous une pièce."
      }
    },
    "PART": 30,
    "BOURSE": {
      "ETAL": { "PLACES": 6, "QUANTITE": 20, "EMOJI": "🛒" },
      "ACHATS": 1,
      "ACHATS_GARDES": 6,
      "BONHEUR": { "adore": 6, "aime": 3, "besoin": 4 },
      "BESOINS": {
        "vetement": ["manteau_chaud", "gants_travail", "salopette", "chapeau_paille", "tablier", "bottes"],
        "meuble": [
          "meuble_chaise",
          "meuble_chevet",
          "meuble_table_basse",
          "meuble_tapis_1",
          "meuble_tapis_2",
          "meuble_tapis_3",
          "meuble_commode",
          "meuble_bibliotheque",
          "lanterne"
        ]
      },
      "IMPORT": { "SEUIL": 120, "MARGE": 150, "MIN": 30, "MAX": 4, "GARDE": 40, "BONHEUR": 5 },
      "PHRASES": [
        "Pour moi : {objet}, s'il te plaît.",
        "{objet} ! Juste ce qu'il me fallait.",
        "Je me fais plaisir : {objet}.",
        "Ça, je le prends : {objet}. Voilà les pièces."
      ]
    },
    "DEPART": {
      "PHRASE": "Une île, un abri, un port. Tout est à bâtir.",
      "PIECES": 450,
      "PLAT": "gratin_patates",
      "LARGEUR": 2,
      "SORTIE": 6,
      "HORS_COULOIR": 4,
      "PORT": 12,
      "ETAPES": [
        { "id": "ramasser", "icone": "🪨", "ligne": "Ramasse 3 pierres et 3 morceaux de bois." },
        { "id": "atelier", "icone": "🔨", "ligne": "Bâtis l'Atelier." },
        { "id": "houe", "icone": "🛠️", "ligne": "Fabrique la houe à l'Atelier." },
        { "id": "labour", "icone": "🟫", "ligne": "Laboure 3 cases d'herbe." },
        { "id": "semis", "icone": "🌱", "ligne": "Sème une graine." },
        { "id": "cruche", "icone": "💧", "ligne": "Fabrique le puits et la cruche, pose le puits." },
        { "id": "arroser", "icone": "💦", "ligne": "Remplis la cruche au puits, arrose." },
        { "id": "recolte", "icone": "🥕", "ligne": "Récolte ta première plante mûre." },
        { "id": "charger", "icone": "🧺", "ligne": "Charge ta récolte : la fenêtre du port, onglet Porter." },
        { "id": "port", "icone": "🧭", "ligne": "Suis le chemin jusqu'au port." },
        { "id": "vendre", "icone": "⚓", "ligne": "Vends une récolte au comptoir, sous la halle." },
        { "id": "graines", "icone": "🌾", "ligne": "Achète des graines au comptoir." },
        { "id": "maison", "icone": "🏠", "ligne": "Bâtis une maison libre : un lit, une boîte aux lettres." },
        { "id": "villageois", "icone": "🧑‍🌾", "ligne": "Accueille le premier villageois, au passage du bac." },
        { "id": "tache", "icone": "📋", "ligne": "Donne-lui une tâche, sur sa fiche." }
      ]
    },
    "SANS_RECIT": {
      "NOMS": [
        "Maurice",
        "Philomène",
        "Adèle",
        "Odile",
        "Achille",
        "Frida",
        "Basile",
        "Théo",
        "Garance",
        "Lise",
        "Fernand",
        "Céron",
        "Cadolon",
        "Le Gué",
        "Bois-Joli",
        "Les Genêts",
        "Les Mouettes",
        "Brumeval"
      ],
      "MOTS": ["calèche", "cocher", "hameau"],
      "NIVEAUX": {
        "ELEMENTS": { "veillee": null },
        "NOTES": {
          "9": "",
          "10": "Le plus haut niveau. Sur l'île, la veillée de pleine lune se tient d'elle-même, sans niveau : deux villageois et une place (le panneau du village, un puits ou une table de jardin) suffisent"
        }
      }
    }
  },
  "TACHES": {
    "TRAVAIL": [[8, 11.5], [13.5, 16.5]],
    "PAUSE": 1,
    "POSTE": 2,
    "CAUSE": 26,
    "ESSAI": 0.5,
    "RAYON": 28,
    "LISTE": {
      "champs": {
        "nom": "Les champs",
        "icone": "🌱",
        "ACTIONS": 12,
        "outil": null,
        "lieu": "champs",
        "geste": "arrose",
        "emoji": "🌱",
        "donne": "une parcelle récoltée, arrosée ou ressemée",
        "SANS": "Il n'y a pas de parcelle labourée sur la ferme.",
        "PHRASES": ["Je m'occupe des champs.", "Ça pousse bien, cette année !", "Encore une rangée et je fais une pause."]
      },
      "betes": {
        "nom": "Les bêtes",
        "icone": "🐔",
        "ACTIONS": 4,
        "outil": null,
        "lieu": "betes",
        "geste": "ramasse",
        "emoji": "🥚",
        "donne": "les poules nourries, les œufs pris, un mouton tondu, le lait et la laine pris",
        "SANS": "Il n'y a ni poulailler ni étable avec des bêtes.",
        "PHRASES": ["Je soigne les bêtes.", "Les poules ont bon appétit ce matin !", "Doucement, ma belle…"]
      },
      "verger": {
        "nom": "Le verger et les ruches",
        "icone": "🍎",
        "ACTIONS": 4,
        "outil": null,
        "lieu": "verger",
        "geste": "ramasse",
        "emoji": "🍎",
        "donne": "un arbre en fruits cueilli, une ruche pleine récoltée",
        "SANS": "Il n'y a ni arbre fruitier planté ni ruche.",
        "PHRASES": ["Je surveille le verger.", "Les abeilles sont de bonne humeur !", "Ces fruits sentent bon !"]
      },
      "bois": {
        "nom": "Le bois",
        "icone": "🪵",
        "ACTIONS": 6,
        "outil": "hache",
        "lieu": "arbre",
        "geste": "hache",
        "emoji": "🪵",
        "donne": "un coup de hache : HACHE.BOIS bois, HACHE.CHUTE de plus quand l'arbre tombe (et sa graine)",
        "SANS": "Il n'y a plus d'arbre debout près de sa maison.",
        "PHRASES": ["Je coupe du bois.", "Attention, ça va tomber !", "Du bon bois bien sec, pour l'hiver."]
      },
      "pierre": {
        "nom": "La pierre et le minerai",
        "icone": "🪨",
        "ACTIONS": 6,
        "outil": "pioche",
        "lieu": "rocher",
        "geste": "pioche",
        "emoji": "🪨",
        "donne": "un coup de pioche : PIOCHE.PIERRE pierre (le minerai d'un gisement)",
        "SANS": "Il n'y a plus de rocher près de sa maison.",
        "PHRASES": ["Je casse des cailloux.", "Il est coriace, celui-là !", "Encore quelques coups…"]
      },
      "peche": {
        "nom": "La pêche",
        "icone": "🎣",
        "ACTIONS": 6,
        "outil": "canne",
        "lieu": "rive",
        "geste": "peche",
        "emoji": "🐟",
        "donne": "un lancer dans l'étang ou la mare de la ferme (le quota du jour du joueur)",
        "SANS": "Il n'y a ni étang ni mare sur la ferme.",
        "PHRASES": ["Chut, ça mord !", "Le poisson se fait prier aujourd'hui.", "Rien de tel qu'une ligne à l'eau."]
      },
      "cueillette": {
        "nom": "La cueillette",
        "icone": "🫐",
        "ACTIONS": 4,
        "outil": null,
        "lieu": "cueillette",
        "geste": "ramasse",
        "emoji": "🫐",
        "donne": "ce que la ferme offre ce matin : une baie, une branche, un caillou",
        "SANS": "La ferme n'offre rien à cueillir ce matin.",
        "PHRASES": ["Je fais la cueillette.", "Les buissons sont pleins ce matin !", "Une pour le panier, une pour moi…"]
      },
      "fauchage": {
        "nom": "Le fauchage et la paille",
        "icone": "🌾",
        "ACTIONS": 8,
        "outil": "faux",
        "lieu": "herbe",
        "geste": "faux",
        "emoji": "🌾",
        "donne": "un coup de faux : FAUX.FIBRE fibre (une botteleuse posée en fait de la paille)",
        "SANS": "Il n'y a plus d'herbe haute près de sa maison.",
        "PHRASES": ["Je fauche l'herbe haute.", "Ça fera de la bonne paille.", "Quel parfum, l'herbe coupée !"]
      },
      "cuisine": {
        "nom": "La cuisine",
        "icone": "🍲",
        "ACTIONS": 2,
        "outil": null,
        "lieu": "cuisine",
        "geste": "cuisine",
        "emoji": "🍲",
        "donne": "une préparation lancée à la cuisinière ou au four",
        "RECETTES": ["soupe_legumes", "ratatouille", "omelette", "poisson_grille", "salade_tomates", "pain", "gratin_patates", "tarte_pommes"],
        "SANS": "Il faut une cuisinière ou un four dans le foyer.",
        "PHRASES": ["Je prépare à manger pour tout le monde.", "Ça mijote !", "Une pincée de sel, et voilà."]
      },
      "chaine": {
        "nom": "Conduire les machines",
        "icone": "🏭",
        "ACTIONS": 16,
        "outil": null,
        "lieu": "machine",
        "geste": "ramasse",
        "emoji": "⚙️",
        "donne": "un tour des machines : il vide les chaînes, les alimente, les relance ; il verse le blé au Moulin, relance la fournée",
        "MOULIN": 10,
        "GARDE": 10,
        "FOURNEE": "pain",
        "SANS": "Il n'y a ni chaîne de production prête, ni Moulin, ni four sur la ferme.",
        "PHRASES": ["Je surveille les machines.", "Tout tourne rond !", "Encore une fournée et je vide la chaîne."]
      },
      "navette": {
        "nom": "La tournée du port",
        "icone": "⚓",
        "ACTIONS": 2,
        "PORTEE": 10,
        "outil": null,
        "lieu": "port",
        "geste": "ramasse",
        "emoji": "💰",
        "donne": "un aller-retour au port : PORTEE objets marqués « à vendre », vendus au comptoir",
        "SANS": "Il n'y a pas de port sur l'île.",
        "PHRASES": ["Je descends au port.", "Le panier est lourd aujourd'hui !", "Je vends tout ça au comptoir."]
      }
    }
  },
  "ARTISANS": {
    "AMITIE": 2,
    "JOURS": 10,
    "LOTS": 3,
    "LOTS_MAX": 5,
    "ANCIENNETE": 20,
    "STOCK": 4,
    "GARDE": 2,
    "BAC": 1,
    "FACON": 25,
    "FACON_MIN": 2,
    "COMMANDES": 3,
    "JOURNAL": 7,
    "ENSEIGNE": 2,
    "ENTRETIEN": 7,
    "COMPTOIR": "comptoir",
    "CAVE": 6,
    "PLAFOND": { "VILLAGEOIS": [1, 4, 6, 8, 10, 12], "PORT": [1, 2, 3, 3, 4, 5] },
    "EMOJI": "🏪",
    "PHRASES_COMPTOIR": ["Pour moi : {objet}, s'il te plaît.", "{objet} ! Voilà les pièces.", "Pour mon outil : {objet}, s'il te plaît."],
    "COMMERCES": {
      "forge": {
        "nom": "La forge",
        "un": "une forge",
        "icone": "⚒️",
        "metier": "forgeron",
        "tache": "pierre",
        "etabli": "enclume_foyer",
        "enseigne": "enseigne_forge",
        "LOCAL": { "etabli": "l'enclume et son foyer", "enseigne": "l'enseigne du forgeron" },
        "geste": "forge",
        "emoji": "🔨",
        "ou": "à l'enclume",
        "donne": "un lot à l'enclume : il fond un lingot, ou forge des clous, des charnières, une lame",
        "SANS": "Le local de la forge n'est plus complet : l'enclume et le foyer, le comptoir dans la pièce, l'enseigne dehors.",
        "ENVIE": [
          "J'aimerais bien ouvrir une forge… le minerai, je le connais.",
          "Une forge à moi, avec une enclume : j'y pense souvent.",
          "Tout ce minerai… j'aimerais le fondre moi-même, dans une forge."
        ],
        "PHRASES": ["Je bats le fer tant qu'il est chaud !", "Encore un lingot, et je forge des clous.", "Le foyer ronfle bien aujourd'hui."],
        "RECETTES": {
          "lingot_fer": { "entrees": { "minerai_fer": 4, "bois": 3 }, "sortie": { "lingot_fer": 1 }, "palier": 2 },
          "clous": { "entrees": { "lingot_fer": 1 }, "sortie": { "clous": 4 }, "palier": 2 },
          "charniere": { "entrees": { "lingot_fer": 1 }, "sortie": { "charniere": 2 }, "palier": 3 },
          "lame": { "entrees": { "lingot_fer": 1, "bois": 1 }, "sortie": { "lame": 1 }, "palier": 2 },
          "lingot_cuivre": { "entrees": { "minerai_cuivre": 4, "bois": 3 }, "sortie": { "lingot_cuivre": 1 }, "palier": 3 },
          "lingot_or": { "entrees": { "minerai_or": 4, "bois": 4 }, "sortie": { "lingot_or": 1 }, "palier": 4 }
        },
        "CLIENTS": { "lame": "outil" }
      },
      "scierie": {
        "nom": "La scierie",
        "un": "une scierie",
        "icone": "🪚",
        "metier": "menuisier",
        "tache": "bois",
        "etabli": "scie_long",
        "enseigne": "enseigne_scierie",
        "LOCAL": { "etabli": "la scie de long et l'établi", "enseigne": "l'enseigne du menuisier" },
        "geste": "scie",
        "emoji": "🪚",
        "ou": "à l'établi",
        "donne": "un lot à l'établi : il scie des planches, ou fait un meuble (pour le comptoir, ou commandé)",
        "SANS": "Le local de la scierie n'est plus complet : la scie de long et l'établi, le comptoir dans la pièce, l'enseigne dehors.",
        "ENVIE": [
          "Tout ce bois… j'en ferais bien des planches, et des meubles, dans une scierie.",
          "Une scierie à moi, avec un établi : une chaise, une table, un lit…",
          "J'aimerais tant ouvrir une scierie : le bois, je le connais."
        ],
        "PHRASES": ["Une planche droite, une !", "Ce chêne fera une belle table.", "Ça sent bon la sciure, ici."],
        "RECETTES": { "planches": { "entrees": { "bois": 4 }, "sortie": { "planche": 2 }, "palier": 2 } },
        "CLIENTS": {
          "meuble_chaise": "maison",
          "meuble_chevet": "maison",
          "meuble_table_basse": "maison",
          "meuble_tapis_1": "maison",
          "meuble_tapis_2": "maison",
          "meuble_tapis_3": "maison",
          "meuble_commode": "maison",
          "meuble_bibliotheque": "maison"
        }
      },
      "boulangerie": {
        "nom": "La boulangerie",
        "un": "une boulangerie",
        "icone": "🥖",
        "metier": "boulanger",
        "tache": "champs",
        "etabli": "four_boulanger",
        "enseigne": "enseigne_boulangerie",
        "LOCAL": { "etabli": "le four à bois et l'étal à pains", "enseigne": "l'enseigne du boulanger" },
        "geste": "cuisine",
        "emoji": "🍞",
        "ou": "au four à bois",
        "donne": "une fournée au four à bois : deux pains, une tarte, un pain d'épices",
        "SANS": "Le local de la boulangerie n'est plus complet : le four à bois, le comptoir dans la pièce, l'enseigne dehors.",
        "ENVIE": [
          "Tout ce blé… j'en ferais bien du pain, dans un four à bois.",
          "Une boulangerie à moi : l'odeur du pain chaud dès le matin !",
          "J'aimerais ouvrir une boulangerie, pour nourrir tout le village."
        ],
        "PHRASES": ["Le four est chaud : la fournée arrive !", "Du bon pain pour tout le village.", "Encore une tarte, et je souffle un peu."],
        "RECETTES": {
          "pain": { "entrees": { "farine": 5 }, "sortie": { "pain": 2 }, "palier": 2, "stock": 6 },
          "tarte_pommes": { "entrees": { "farine": 2, "pomme": 3, "oeuf": 1 }, "sortie": { "tarte_pommes": 1 }, "palier": 2, "stock": 2 },
          "tarte_myrtilles": { "entrees": { "farine": 2, "myrtille": 4, "sucre": 1 }, "sortie": { "tarte_myrtilles": 1 }, "palier": 3, "stock": 2 },
          "tarte_fraises": { "entrees": { "farine": 2, "fraise": 3, "oeuf": 1 }, "sortie": { "tarte_fraises": 1 }, "palier": 3, "stock": 2 },
          "pain_epices": { "entrees": { "farine": 2, "miel": 1, "epices": 1 }, "sortie": { "pain_epices": 1 }, "palier": 4, "stock": 2 }
        },
        "CLIENTS": { "pain": "repas" }
      },
      "fromagerie": {
        "nom": "La fromagerie",
        "un": "une fromagerie",
        "icone": "🧀",
        "metier": "fromager",
        "tache": "betes",
        "etabli": "cave_affinage",
        "enseigne": "enseigne_fromagerie",
        "LOCAL": { "etabli": "la cave d'affinage", "enseigne": "l'enseigne du fromager" },
        "geste": "ramasse",
        "emoji": "🧀",
        "ou": "à la cave",
        "donne": "un lot au chaudron : il caille du lait en faisselles, ou met une tomme en cave",
        "SANS": "Le local de la fromagerie n'est plus complet : la cave d'affinage, le comptoir dans la pièce, l'enseigne dehors.",
        "ENVIE": [
          "Tout ce lait… j'en ferais bien des fromages, dans une cave à moi.",
          "Une fromagerie, avec ses meules qui s'affinent en cave : j'y pense souvent.",
          "J'aimerais ouvrir une fromagerie : le lait, je le connais."
        ],
        "PHRASES": ["Une tomme de plus en cave !", "Il faut les retourner chaque jour, mes meules.", "Le caillé prend bien ce matin."],
        "RECETTES": {},
        "CLIENTS": { "faisselle": "repas" }
      }
    }
  },
  "TRAITS": {
    "NOMBRE": [2, 3],
    "TROIS": 0.5,
    "DECOUVERTE": { "VU": 3, "DIT": 2 },
    "PAROLE": {
      "CHANCE": 0.3,
      "REPLIQUE": 0.3,
      "POSTE": {
        "aime": [
          "Ce travail-là, c'est tout à fait pour moi !",
          "Je suis bien, à ce poste. Merci de me l'avoir confié.",
          "Je ne vois pas le temps passer, ici."
        ],
        "boude": [
          "Ce n'est pas mon travail préféré… mais je m'y mets.",
          "Bon. Il faut bien que quelqu'un le fasse !",
          "J'aurais préféré autre chose, mais ça ira."
        ]
      }
    },
    "POSTES": { "AIME": 6, "BOUDE": 3 },
    "ACCORD": { "GAIN": 1, "MAX": 2 },
    "ACCORDS": [
      ["matinal", "matinal"],
      ["matinal", "travailleur"],
      ["couche_tard", "couche_tard"],
      ["couche_tard", "reveur"],
      ["bavard", "bavard"],
      ["bavard", "taquin"],
      ["bavard", "curieux"],
      ["reserve", "reveur"],
      ["reserve", "soigneux"],
      ["travailleur", "soigneux"],
      ["flaneur", "reveur"],
      ["flaneur", "gourmand"],
      ["casanier", "casanier"],
      ["casanier", "gourmand"],
      ["curieux", "curieux"],
      ["gourmand", "gourmand"],
      ["taquin", "taquin"]
    ],
    "LISTE": {
      "matinal": {
        "nom": ["matinale", "matinal"],
        "icone": "🌅",
        "oppose": "couche_tard",
        "dit": "dehors avant tout le monde, au petit matin",
        "HORAIRE": { "LEVER": -0.5, "SORTIE": -1, "SOUPER": -0.25, "VEILLEE": -0.5, "COUCHER": -0.75 },
        "POSTE": { "champs": "aime", "cuisine": "boude" },
        "SIGNE": { "etats": ["dehors", "flaner", "travail"], "heures": [[6, 7.5]] },
        "PROPOS": { "meteo_brume": 2 },
        "PHRASES": [
          "Je suis dehors avant le coq, moi. C'est le meilleur moment de la journée !",
          "À l'aube, l'île est toute à moi : la rosée, le silence…",
          "Tôt levé{e}, tôt couché{e} : c'est ma devise.",
          "Tu as vu le soleil se lever, ce matin ? Non ? Dommage !"
        ]
      },
      "couche_tard": {
        "nom": ["couche-tard", "couche-tard"],
        "icone": "🌙",
        "oppose": "matinal",
        "dit": "encore à table quand les autres sont rentrés",
        "HORAIRE": { "LEVER": 0.5, "SORTIE": 0.5, "SOUPER": 0.5, "VEILLEE": 0.75, "COUCHER": 0.5 },
        "SOIR": 2,
        "POSTE": { "peche": "aime", "champs": "boude" },
        "SIGNE": { "etats": ["repas"], "heures": [[20, 22]] },
        "PROPOS": { "lune_*": 2 },
        "PHRASES": [
          "Le matin, ne me parle pas avant mon café…",
          "Le soir, je suis bien plus réveillé{e} que le matin !",
          "Je regarde les étoiles bien après que tout le monde dort.",
          "Encore une petite veillée, et au lit. Enfin… peut-être."
        ]
      },
      "bavard": {
        "nom": ["bavarde", "bavard"],
        "icone": "💬",
        "oppose": "reserve",
        "dit": "toujours en train de causer avec quelqu'un",
        "BUTS": { "visite": 1.5, "rdv": 1.6 },
        "PAROLE": { "PART": 2 },
        "SCENE": { "CAUSE": 1.6, "EMOJI": "😄" },
        "POSTE": { "navette": "aime", "peche": "boude" },
        "SIGNE": { "buts": ["visite", "rdv", "promenade", "banc"] },
        "PROPOS": { "village_ami": 2, "village_voisin": 2, "voisin": 2, "lien_ami": 2, "visite_recue": 2, "visite_faite": 2 },
        "PHRASES": [
          "Tu sais la dernière ? Non ? Alors écoute bien…",
          "Je parlerais des heures, moi. D'ailleurs, je parle des heures !",
          "Ici, tout le monde se connaît. Un peu grâce à moi !",
          "J'ai croisé tout le village ce matin, et j'ai causé avec chacun."
        ],
        "REPLIQUES": [
          ["{prenom} ! Tu ne devineras jamais ce que j'ai vu ce matin…", "Raconte, raconte !"],
          ["Attends, je ne t'ai pas tout dit !", "Toujours une histoire, toi !"],
          ["Tu as cinq minutes ? Enfin… dix ?", "Pour toi, toujours."]
        ]
      },
      "reserve": {
        "nom": ["réservée", "réservé"],
        "icone": "🤫",
        "oppose": "bavard",
        "dit": "souvent seul{e}, un peu à l'écart",
        "BUTS": { "visite": 0.6, "rdv": 0.5, "voir": 1.5, "eau": 1.3 },
        "PAROLE": { "PART": 0.4, "BREF": true },
        "SCENE": { "CAUSE": 0.6 },
        "POSTE": { "peche": "aime", "navette": "boude" },
        "SIGNE": { "buts": ["eau", "jardin", "betes", "ouvrage"] },
        "PHRASES": [
          "Je parle peu. Mais j'écoute beaucoup.",
          "Le calme me va bien.",
          "… Bonjour. Belle journée, oui.",
          "Pas besoin de mots pour être bien ensemble."
        ],
        "REPLIQUES": [
          ["Bonjour, {prenom}.", "Toujours aussi discret{e} !"],
          ["…", "Toi, tu es dans tes pensées."],
          ["Hm. Belle journée.", "Oui, très belle !"]
        ]
      },
      "travailleur": {
        "nom": ["travailleuse", "travailleur"],
        "icone": "💪",
        "oppose": "flaneur",
        "dit": "à son poste avant et après les autres",
        "HORAIRE": { "SORTIE": -0.25 },
        "FLANER": [-0.1, -0.15],
        "TRAVAIL": { "DEBUT": -0.5, "FIN": 0.5, "PAUSE": -1 },
        "POSTE": { "bois": "aime", "cueillette": "boude" },
        "SIGNE": { "etats": ["travail"], "heures": [[7.5, 8], [16.5, 17]] },
        "PHRASES": [
          "Une journée sans ouvrage, c'est une journée perdue !",
          "J'aime quand le travail est bien fait. Et fini avant l'heure !",
          "Je me mets au travail avant les autres : j'aime prendre de l'avance."
        ]
      },
      "flaneur": {
        "nom": ["flâneuse", "flâneur"],
        "icone": "🍃",
        "oppose": "travailleur",
        "dit": "à flâner sur un banc ou sur la place",
        "HORAIRE": { "SORTIE": 0.25 },
        "FLANER": [0.2, 0.2],
        "TRAVAIL": { "PAUSE": 1 },
        "BUTS": { "banc": 1.6, "promenade": 1.5 },
        "POSTE": { "cueillette": "aime", "pierre": "boude" },
        "SIGNE": { "etats": ["flaner"] },
        "PHRASES": [
          "Rien ne presse : l'île ne va pas s'envoler.",
          "Un banc, un rayon de soleil… que demander de plus ?",
          "Je prends le temps de regarder. Le travail attendra un peu."
        ]
      },
      "casanier": {
        "nom": ["casanière", "casanier"],
        "icone": "🏠",
        "oppose": "curieux",
        "dit": "chez soi en pleine journée",
        "HORAIRE": { "VEILLEE": -0.25 },
        "CHEZ_LUI": 0.3,
        "BUTS": { "voir": 0.4, "port": 0, "promenade": 0.6 },
        "POSTE": { "cuisine": "aime", "navette": "boude" },
        "SIGNE": { "etats": ["rentrer"], "heures": [[8, 18]] },
        "PROPOS": { "foyer": 2, "voisin": 2, "ferme_maison": 1.5 },
        "PHRASES": [
          "On n'est jamais si bien que chez soi.",
          "Ma maison, c'est mon petit monde. J'y suis bien.",
          "Sortir ? Oui… mais pas trop loin de ma porte."
        ]
      },
      "curieux": {
        "nom": ["curieuse", "curieux"],
        "icone": "🔍",
        "oppose": "casanier",
        "dit": "à regarder partout : le jardin, les bêtes, ce qu'on bâtit",
        "BUTS": { "voir": 2.2, "port": 3 },
        "POSTE": { "navette": "aime", "cuisine": "boude" },
        "SIGNE": { "buts": ["jardin", "betes", "ouvrage", "port"] },
        "PROPOS": { "ferme_maison": 2, "port_bac": 3, "village_nouveau": 3 },
        "PHRASES": [
          "Qu'est-ce que tu bâtis, là ? Raconte-moi tout !",
          "Je suis allé{e} voir ce qu'il y a derrière les arbres.",
          "Le bac amène toujours des nouvelles. J'adore ça !",
          "Je veux tout voir de l'île : chaque coin, chaque bête."
        ],
        "REPLIQUES": [
          ["{prenom}, tu as vu ce qu'on bâtit près du puits ?", "Pas encore ! Montre-moi."],
          ["Qu'est-ce que tu fais de beau, {prenom} ?", "Rien de bien neuf, curieux{e} !"]
        ]
      },
      "gourmand": {
        "nom": ["gourmande", "gourmand"],
        "icone": "🍰",
        "dit": "à table avant les autres",
        "HORAIRE": { "MIDI": -0.5, "REPRISE": 0.25 },
        "POSTE": { "cuisine": "aime", "fauchage": "boude" },
        "SIGNE": { "etats": ["repas"], "heures": [[11.5, 12]] },
        "PROPOS": { "gout_connu": 3, "ferme_cultures": 2, "ferme_poules": 2, "cadeau_merci": 2 },
        "PHRASES": [
          "Je rêve d'un bon plat : {plat}, rien que d'y penser…",
          "Tu sens ? Quelqu'un cuisine quelque part. Miam !",
          "Le meilleur moment de la journée ? Le repas, bien sûr !",
          "Si tu fais {plat}, garde-m'en une part !"
        ],
        "REPLIQUES": [
          ["Ça sent bon chez toi, {prenom}. Tu cuisines quoi ?", "Viens goûter, si tu veux !"],
          ["Tu as déjà mangé ? Moi, j'ai encore faim.", "Toi, alors !"]
        ]
      },
      "reveur": {
        "nom": ["rêveuse", "rêveur"],
        "icone": "☁️",
        "dit": "le nez dans les nuages",
        "FLANER": [0.1, 0.15],
        "BUTS": { "voir": 1.4 },
        "POSTE": { "verger": "aime", "pierre": "boude" },
        "PROPOS": { "lune_*": 3, "meteo_*": 2, "mois": 2 },
        "PHRASES": [
          "Tu crois que les nuages ont des noms ?",
          "Parfois, je regarde la mer et j'oublie l'heure.",
          "La nuit, la lune a l'air de veiller sur l'île."
        ]
      },
      "soigneux": {
        "nom": ["soigneuse", "soigneux"],
        "icone": "🧹",
        "dit": "attentif à tout ce qui l'entoure",
        "POSTE": { "betes": "aime", "bois": "boude" },
        "PROPOS": { "ferme_cultures": 2, "ferme_maison": 2, "ferme_verger": 2 },
        "PHRASES": [
          "Chaque chose à sa place, et l'île est plus belle.",
          "J'ai rangé mes outils trois fois ce matin. Bien rangés !",
          "Un travail soigné, ça se voit de loin."
        ]
      },
      "taquin": {
        "nom": ["taquine", "taquin"],
        "icone": "😜",
        "dit": "toujours une blague en réserve",
        "SCENE": { "CAUSE": 1.2, "EMOJI": "😜" },
        "POSTE": { "fauchage": "aime", "verger": "boude" },
        "PROPOS": { "village_ami": 2, "village_collegue": 2 },
        "PHRASES": [
          "Attention, une abeille ! … Mais non, je te taquine.",
          "Les autres disent que je suis taquin{e}. Moi ? Jamais !",
          "Tu cours toujours partout ! Tu vas finir par t'envoler."
        ],
        "REPLIQUES": [
          ["Tiens, {prenom} ! Tu t'es coiffé{e} avec un râteau ?", "Très drôle…"],
          ["Je t'ai vu{e} bâiller au travail !", "Même pas vrai !"],
          ["{prenom}, tu as un brin d'herbe dans les cheveux. Ha, non !", "Toi alors !"]
        ]
      }
    }
  },
  "PORT": {
    "NOM": "Le port",
    "ICONE": "⚓",
    "NIVEAU_DEPART": 1,
    "PORTEE": 3,
    "HEURES": [6, 21],
    "ELEMENT": { "nom": "Le port", "icone": "⚓", "note": "au comptoir de la halle, au bout du chemin : vends tes récoltes, achète des graines" },
    "PLAN": {
      "QUAI": 12,
      "LARGEUR": 2,
      "EAU": 3,
      "HALLE": [6, 4],
      "FERME": 80,
      "LOIN": 100,
      "HAMEAU": 26,
      "LIEUX": 12,
      "PRIX_MAX": 2400,
      "PAS": 2,
      "ESSAIS": 8
    },
    "NIVEAUX": [
      { "quai": 8, "ajoute": ["halle", "comptoir", "balance", "cale", "panneau", "lanternes"], "commandes": 2 },
      { "quai": 9, "ajoute": ["caisses"], "commandes": 3, "prix": { "pieces": 1800, "planche": 24, "pierre": 16 } },
      { "quai": 10, "ajoute": ["tonneaux", "mat"], "commandes": 3, "prix": { "pieces": 5000, "planche": 40, "pierre": 30, "lingot_fer": 6 } },
      { "quai": 11, "ajoute": ["caisses_terre"], "commandes": 4, "prix": { "pieces": 11000, "planche": 60, "pierre": 40, "lingot_fer": 12 } },
      {
        "quai": 12,
        "ajoute": ["tonneaux_terre"],
        "commandes": 5,
        "prix": { "pieces": 24000, "planche": 80, "pierre": 60, "lingot_fer": 20, "lingot_cuivre": 10 }
      }
    ],
    "BAC": { "PERIODE": 3, "HEURES": [9, 17], "RATTRAPAGE": 3, "CAISSE": 12, "CAISSES_MAX": 4, "ARRIVEE_S": 7 },
    "COMMANDES": { "VALEUR": [50, 90, 150, 230, 340], "ECART": 30, "QUANTITE": [2, 40], "PRIME": [25, 60], "XP": 15 },
    "IMPORT": {
      "RANGS": [
        [
          { "objet": "jeune_pommier", "prix": 50 },
          { "objet": "jeune_poirier", "prix": 50 },
          { "objet": "jeune_cerisier", "prix": 60 },
          { "objet": "jeune_abricotier", "prix": 55 },
          { "objet": "jeune_pecher", "prix": 55 },
          { "objet": "plant_vigne", "prix": 30, "lot": 4 }
        ],
        [
          { "objet": "cacao", "prix": 40, "lot": 2 },
          { "objet": "vanille", "prix": 70, "lot": 2 },
          { "objet": "cafe", "prix": 30, "lot": 2 },
          { "objet": "sucre", "prix": 24, "lot": 10 },
          { "objet": "epices", "prix": 34, "lot": 10 }
        ],
        [{ "bete": "poule", "prix": 60 }, { "bete": "mouton", "prix": 160 }, { "bete": "vache", "prix": 260 }],
        [
          { "plan": "banc_rondins", "prix": 300 },
          { "plan": "table_rondins", "prix": 300 },
          { "plan": "chaise_peinte", "prix": 320 },
          { "plan": "jarre_coquillages", "prix": 360 },
          { "plan": "lanterne_papier", "prix": 380 },
          { "plan": "bassin", "prix": 520 },
          { "plan": "banc_pierre", "prix": 420 },
          { "plan": "jardiniere_pierre", "prix": 420 },
          { "plan": "pergola", "prix": 600 }
        ],
        [
          { "objet": "graine_lavande", "prix": 40, "lot": 5 },
          { "objet": "graine_coquelicot", "prix": 30, "lot": 5 },
          { "objet": "graine_pavot", "prix": 30, "lot": 5 },
          { "objet": "graine_myosotis", "prix": 30, "lot": 5 },
          { "objet": "graine_lupin", "prix": 35, "lot": 5 }
        ]
      ],
      "SAUVAGES": { "RANG": 5, "MARGE": 300, "LOT": 3 }
    },
    "SORTES": [
      { "nom": "quai", "genre": "ponton", "variantes": 8 },
      { "nom": "cale_port", "genre": "ponton", "variantes": 2 },
      { "nom": "poteau_halle", "genre": "objet", "variantes": 1 },
      { "nom": "comptoir", "genre": "meuble", "variantes": 1, "largeur": 3 },
      { "nom": "balance", "genre": "objet", "variantes": 1 },
      { "nom": "caisses", "genre": "objet", "variantes": 2 },
      { "nom": "tonneaux", "genre": "objet", "variantes": 2 },
      { "nom": "mat_fanion", "genre": "objet", "variantes": 1 },
      { "nom": "panneau_port", "genre": "objet", "variantes": 1 },
      { "nom": "lanterne_port", "genre": "objet", "variantes": 3 },
      { "nom": "bac_port", "genre": "objet", "variantes": 2 },
      { "nom": "passerelle_port", "genre": "ponton", "variantes": 2 },
      { "nom": "caisses_bac", "genre": "objet", "variantes": 3 }
    ],
    "BLOQUE": ["poteau_halle", "comptoir", "balance", "caisses", "tonneaux", "mat_fanion", "panneau_port", "lanterne_port"],
    "LANTERNE": {
      "sol": { "rayon": 46, "aplati": 0.7, "teinte": 16761968, "alpha": 0.9, "dx": 0, "dy": -4 },
      "vitre": { "rayon": 11, "teinte": 16769704, "alpha": 0.95, "dx": 0, "dy": -27 }
    }
  },
  "VOCATIONS": {
    "village": {
      "nom": "Un village convivial",
      "icone": "🎉",
      "texte": "Des fêtes, des projets faits ensemble, des repas partagés et une jolie place rendent le village convivial.",
      "PALIERS": [
        {
          "score": 20,
          "nom": "Des voisins qui se saluent",
          "icone": "👋",
          "debloque": ["plan:banc_pierre", "plan:lanterne_papier", "projet:kiosque"]
        },
        {
          "score": 50,
          "nom": "Un village en fête",
          "icone": "🎉",
          "debloque": ["fete:seconde", "plan:table_rondins", "plan:banc_rondins", "projet:fontaine"]
        },
        {
          "score": 90,
          "nom": "Un village accueillant",
          "icone": "🤝",
          "debloque": ["arrivee:lien", "plan:pergola", "plan:jardiniere_pierre", "projet:four"]
        },
        {
          "score": 140,
          "nom": "Un village où il fait bon vivre",
          "icone": "🌟",
          "debloque": ["enseigne:couleurs", "plan:chaise_peinte", "plan:bassin", "plan:jarre_coquillages"]
        }
      ],
      "CAUSES": {
        "bonheur": { "nom": "Le bonheur des villageois", "icone": "😊", "BASE": 40, "PAR": 2, "MAX": 25 },
        "ami": { "nom": "Des amis entre eux", "icone": "🤝", "POINTS": 2, "MAX": 30 },
        "proche": { "nom": "Des proches", "icone": "💞", "POINTS": 4, "MAX": 30 },
        "fete": { "nom": "Les fêtes tenues", "icone": "🎉", "POINTS": 6, "MAX": 60 },
        "projet": { "nom": "Les projets finis", "icone": "🏗️", "POINTS": 10, "MAX": 60 },
        "repas": { "nom": "Les repas partagés", "icone": "🍽️", "POINTS": 2, "MAX": 20 },
        "decor": { "nom": "Le décor de la place", "icone": "🌷", "POINTS": 1, "MAX": 25 }
      },
      "DECOR": {
        "RAYON": 7,
        "CENTRES": ["panneau_village", "puits"],
        "SORTES": {
          "banc_": 1,
          "chaise_": 1,
          "table_jardin": 1,
          "table_rondins": 1,
          "lanterne": 2,
          "lanterne_papier": 2,
          "candelabre": 2,
          "bac_": 1,
          "massif_": 1,
          "rosier_": 1,
          "guirlande_": 1,
          "pergola": 2,
          "jardiniere_pierre": 1,
          "jarre_coquillages": 1,
          "bassin": 2,
          "fontaine_": 3,
          "ornement_": 2,
          "lavoir": 4,
          "kiosque": 4,
          "four_commun": 4
        }
      },
      "ARRIVEE_LIEN": { "PARENT": 0.3, "AMI": 50, "PROCHE": 80 },
      "ENSEIGNES": [{ "id": "or", "nom": "lettres dorées", "texte": "#e2b04a" }, { "id": "lune", "nom": "lettres de lune", "texte": "#cfd8ff" }],
      "FETES": {
        "PAR_MOIS": 1,
        "JOURS_MAX": 40,
        "DEBUT": 17,
        "FIN": 21,
        "VEILLEE": [19.75, 21],
        "VEILLEE_MIN": 2,
        "PLATS": { "PAR": 2, "MIN": 2 },
        "BONHEUR": 6,
        "VARIETE": 3,
        "ANNONCE": 3,
        "NOMS": {
          "mois": ["🎉", "La fête du village"],
          "pleine_lune": ["🌕", "La veillée de pleine lune"],
          "ouverture": ["🎊", "La fête de l'ouverture"]
        },
        "LUMIERES": { "teinte": 16757350, "alpha": 1, "rayon": 60 }
      },
      "PROJETS": {
        "ORDRE": ["place", "jardin", "lavoir", "kiosque", "fontaine", "four"],
        "SORTES": {
          "place": {
            "nom": "Aménager la place",
            "icone": "🪑",
            "journees": 2,
            "texte": "Des bancs, des bacs de fleurs, une table et une lanterne, pour se retrouver le soir sur la place.",
            "besoin": { "bois": 20, "pierre": 15, "fibre": 10 },
            "donne": { "banc_jardin": 2, "bac_rond": 2, "table_jardin": 1, "chaise_jardin": 4, "lanterne": 1 }
          },
          "jardin": {
            "nom": "Un jardin partagé",
            "icone": "🌷",
            "journees": 2,
            "texte": "Une pergola, des jardinières et un banc de rondins, que tout le village soigne ensemble.",
            "besoin": { "bois": 15, "pierre": 10, "fibre": 15 },
            "donne": { "pergola": 1, "bac_long": 2, "jardiniere_pierre": 1, "banc_rondins": 1 }
          },
          "lavoir": {
            "nom": "Le lavoir",
            "icone": "🧺",
            "journees": 4,
            "bloc": "lavoir",
            "texte": "Un bassin de pierre sous un toit de bois, où l'on se retrouve pour laver et bavarder.",
            "besoin": { "pierre": 30, "planche": 12, "bois": 10 }
          },
          "kiosque": {
            "nom": "Le kiosque",
            "icone": "🎶",
            "journees": 3,
            "bloc": "kiosque",
            "palier": "projet:kiosque",
            "texte": "Un kiosque de bois sur une estrade de pierre, au cœur de la place : on y danse les soirs de fête.",
            "besoin": { "planche": 24, "pierre": 12, "lingot_fer": 2 }
          },
          "fontaine": {
            "nom": "La fontaine du village",
            "icone": "⛲",
            "journees": 4,
            "bloc": "fontaine_village",
            "palier": "projet:fontaine",
            "texte": "Une grande fontaine à quatre goulots, où l'on vient puiser et causer.",
            "besoin": { "pierre": 40, "lingot_cuivre": 2, "planche": 4 }
          },
          "four": {
            "nom": "Le four commun",
            "icone": "🔥",
            "journees": 5,
            "bloc": "four_commun",
            "palier": "projet:four",
            "texte": "Un four à pain de pierre sous son auvent, que le village allume pour les fêtes.",
            "besoin": { "pierre": 36, "bois": 20, "planche": 8 }
          }
        },
        "TRAVAIL": { "geste": "hache", "emoji": "🔨" }
      }
    },
    "production": {
      "nom": "La ferme productive",
      "icone": "🏭",
      "PALIERS": [
        { "score": 120, "debloque": ["contrats_gros"] },
        { "score": 300, "debloque": ["machines_grandes"] },
        { "score": 600, "debloque": ["import_plein_champ"] },
        { "score": 1000, "debloque": ["robot_second"] }
      ],
      "CAUSES": {
        "export": { "nom": "La valeur exportée ce mois de lune", "PIECES": 25 },
        "machines": { "nom": "Les machines en état de marche", "POINTS": 15 },
        "energie": { "nom": "L'énergie produite ce mois de lune", "WH": 4000 },
        "contrats": { "nom": "Les contrats d'export honorés", "POINTS": 40 }
      },
      "TEXTES": {
        "contrats_gros": "des contrats d'export plus gros",
        "machines_grandes": "des machines plus grandes : le réservoir des chaînes double",
        "import_plein_champ": "les cultures de plein champ en vrac, au catalogue d'import",
        "robot_second": "un second robot : la tournée du robot va deux fois plus vite"
      }
    }
  },
  "PRODUCTION": {
    "CONTRATS": {
      "NIVEAU": 2,
      "PASSAGES": 3,
      "PROPOSES": [0, 1, 2, 2, 3],
      "MAX": 2,
      "VALEUR": [0, 400, 800, 1400, 2200],
      "ECART": 20,
      "ARRONDI": 10,
      "QUANTITE": [20, 300],
      "PRIME": [30, 50],
      "GROS": 150,
      "XP": 60,
      "OBJETS": [
        "pain",
        "fromage_frais",
        "bocal_legumes",
        "confiture_fraises",
        "jus_fruits",
        "compote",
        "biere_artisanale",
        "huile",
        "farine",
        "lait",
        "oeuf",
        "laine"
      ]
    },
    "COURANT": { "WH_PAR_PIECE": 250 },
    "NAVETTE": { "BROUETTE": 25, "CHARRETTE": 60, "QUAI": 200 },
    "QUAI": { "NIVEAU": 2 },
    "MACHINES": { "RESERVOIR": 200 },
    "ROBOT": { "VITESSE": 200 },
    "IMPORT": { "RANG": 2, "LOT": 50, "MARGE": 150 }
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
    "faisselle": 4,
    "tomme_cave": 20,
    "herbes_montagne": 3,
    "oignon": 6,
    "ail": 7,
    "poivron": 5,
    "epinard": 4,
    "fraise": 4,
    "raisin": 4,
    "viande_boeuf": 5,
    "viande_volaille": 4,
    "lait": 4,
    "lait_alpage": 4,
    "poisson": 2,
    "croissant": 2,
    "pizza": 2,
    "burger": 2,
    "frites": 2,
    "tomme_alpage": 4,
    "mout_houblon": 4,
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
