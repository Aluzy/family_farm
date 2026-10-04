'use strict';

/* ==========================================================================
   DATA — toutes les valeurs d'équilibrage du jeu.
   Chaque lot y a ajouté ses valeurs, par section. Aucune valeur d'équilibrage
   ne doit exister ailleurs que dans DATA.
   Références : conception v15, sections 1.2, 1.4 et 8.2.
   ========================================================================== */
const DATA = {
  // Départ de partie.
  START: {
    PIECES: 350,
    // Les appareils de départ sont offerts : prix d'achat 0, donc entretien
    // et réparation gratuits pour eux (l'entretien vaut 20 % du prix d'achat).
    DEVICE_PRICE: 0,
    // Inventaire de départ (section 8.1) : 160 conserves = 10 nuits, plus le kit de graines.
    INVENTAIRE: { conserve: 160, graine_carotte: 10, patate: 6, graine_tomate: 4 },
  },

  // Temps : la journée commence à 6 h au réveil.
  // SECONDS_PER_HOUR : durée d'une « heure de marche » des appareils (usure,
  // voir WEAR.HEURES_PAR_POINT). Ne pas la changer pour régler l'horloge.
  // CLOCK_SECONDS_PER_HOUR : l'horloge affichée au joueur avance d'une heure
  // toutes les 18 s d'éveil (version 1.1.3 ; 5 s auparavant). Voir hourOfDay()
  // et clockHours().
  // MEAL_HOUR (version 1.1.1) : à 19 h, la famille prend son repas (takeMeal()).
  // NIGHT_HOUR : à 22 h (version 1.1.3 ; minuit auparavant), la journée est
  // finie : la nuit se déroule d'elle-même si le joueur n'a pas cliqué sur
  // Dormir (bedtimeDue() ; c'est l'interface qui déclenche). La journée dure
  // donc de 6 h à 22 h : 16 heures de 18 s, soit 288 s.
  TIME: {
    DAY_START_HOUR: 6,
    SECONDS_PER_HOUR: 30,
    CLOCK_SECONDS_PER_HOUR: 18,
    MIN_AWAKE_S: 30,
    MEAL_HOUR: 19,
    NIGHT_HOUR: 22,
  },

  LEVEL_MAX: 5,

  // Grilles par niveau (index 0 = niveau 1), identiques pour chaque appareil
  // d'un même type.
  GRID: {
    // Énergie en entiers : Wh côté données, mWh dans l'état (1 Wh = 1 000 mWh).
    panneau: { whParS: [30, 50, 80, 120, 180] },
    // pleine : part de la capacité utile au-delà de laquelle une batterie qui ne
    // charge plus s'affiche « Pleine » (Lot 11 : sortie du moteur vers DATA).
    batterie: { wh: [5000, 10000, 20000, 40000, 80000], pleine: 98 }, // pleine en %
    pompe: {
      litresPerS: [1, 2, 4, 6, 10],
      reservoirL: [40, 80, 160, 300, 500], // le réservoir suit le niveau de la pompe
    },
  },

  // Coût pour atteindre un niveau (index 0 = niveau 1, non utilisé).
  UPGRADE_COST: [0, 40, 100, 250, 600],

  PUMP: { WH_PAR_L: 10 }, // 10 Wh par litre, soit 10 mWh par mL

  // Achat d'un appareil supplémentaire : base × growth^n, n = nombre déjà possédé.
  PURCHASE: {
    panneau: { base: 60, growth: 120 },
    batterie: { base: 80, growth: 120 },
  },

  // Usure : en points entiers (0 à 100), +1 point toutes les HEURES_PAR_POINT
  // heures de marche. Rendement (%) = 100 − ⌊usure × 100 ÷ EFFICIENCY_DIVISOR⌋.
  WEAR: {
    HEURES_PAR_POINT: 2,
    EFFICIENCY_DIVISOR: 200,
    SERVICE_THRESHOLD: 70,
    BREAKDOWN: 100,
    MAINTAIN_RATE: 20, // % du prix d'achat
    REPAIR_RATE: 50, // %
  },

  /* ---------- Lot 2 : objets, cultures, potager, famille ---------- */

  // Lot 11 (nutrition) : au chapitre §4, la valeur nutritionnelle de tous les
  // aliments de base existants a été augmentée de 25 % par rapport aux
  // valeurs d'origine (celles en commentaire, à droite de chaque objet), pour
  // rapprocher les plats des besoins réels de la famille (voir gratin_patates
  // ci-dessous). AUGMENTATION est la seule source de ce coefficient : toute
  // future revalorisation doit s'y référer plutôt que d'inventer un nouveau
  // pourcentage ailleurs. scaleEnergie() (fonctions utilitaires) applique la
  // règle d'arrondi centralisée (Math.round, arrondi standard au demi
  // supérieur) : les valeurs ci-dessous sont scaleEnergie(valeur d'origine),
  // vérifié par les tests DATA Lot 2 / Lot 11.
  NUTRITION: { AUGMENTATION: 125 }, // %

  // Objets (sections 1.1, 8.1 et 8.9). energie : énergie par unité (aliments
  // seulement) ; prix : prix de vente fixe en pièces ; edible : la famille peut
  // le manger ; category : légume, fruit, plat, graine, ingrédient, produit,
  // conserve. nom et icone servent uniquement à l'affichage.
  items: {
    carotte:        { nom: 'Carotte',              icone: '🥕', energie: 8,  prix: 1, edible: true,  category: 'légume' }, // 6 × 1,25
    patate:         { nom: 'Patate',               icone: '🥔', energie: 19, prix: 2, edible: true,  category: 'légume' }, // 15 × 1,25
    tomate:         { nom: 'Tomate',               icone: '🍅', energie: 8,  prix: 1, edible: true,  category: 'légume' }, // 6 × 1,25
    courgette:      { nom: 'Courgette',            icone: '🥒', energie: 10, prix: 2, edible: true,  category: 'légume' }, // 8 × 1,25
    aubergine:      { nom: 'Aubergine',            icone: '🍆', energie: 10, prix: 2, edible: true,  category: 'légume' }, // 8 × 1,25
    // Non périssable, non rachetable au Marché (Lot 3).
    conserve:       { nom: 'Conserve',             icone: '🥫', energie: 25, prix: 3, edible: true,  category: 'conserve', rachetable: false }, // 20 × 1,25
    graine_carotte:   { nom: 'Graines de carotte',   icone: '🌱', prix: 1, edible: false, category: 'graine' },
    graine_tomate:    { nom: 'Graines de tomate',    icone: '🌱', prix: 1, edible: false, category: 'graine' },
    graine_courgette: { nom: 'Graines de courgette', icone: '🌱', prix: 1, edible: false, category: 'graine' },
    graine_aubergine: { nom: 'Graines d\'aubergine', icone: '🌱', prix: 1, edible: false, category: 'graine' },
    // Lot 4 : blé (stock du Silo ; un blé sert de graine), graines de tournesol
    // (à replanter), œuf (12,5 → 13 énergie, 6 nuits : voir CONSERVATION).
    // category reste « ingrédient » (Silo, Moulin, alimentation des poules,
    // plancher de marché ×1,2) même si le blé sert aussi de semence : voir
    // isGraineComptoir(), qui l'ajoute en plus à l'onglet Graines du Marché.
    ble:              { nom: 'Blé',                  icone: '🌾', prix: 1, edible: false, category: 'ingrédient' },
    graine_tournesol: { nom: 'Graines de tournesol', icone: '🌻', prix: 1, edible: false, category: 'graine' },
    oeuf:             { nom: 'Œuf',                  icone: '🥚', energie: 13, prix: 2, edible: true, category: 'produit' }, // 10 × 1,25 = 12,5 → 13
    // Lot 5 : fruits, farine et huile (sections 1.1 et 8.9). Les fruits viennent
    // du Verger (Lot 8). La farine et l'huile valent 13 d'énergie dans les plats
    // mais ne se mangent pas seules. Les plats cuisinés (pain compris) sont
    // ajoutés à cette table au chargement, à partir de `recipes` : voir
    // registerDishItems().
    // Viandes (version 1.1) : plus aucun animal ne donne de viande, et elle ne
    // s'achète plus au Marché (rachetable: false). Les trois objets restent
    // définis pour les anciennes sauvegardes qui en contiennent : la famille
    // peut encore les manger ou les vendre jusqu'au dernier. Leur prix est écrit
    // ici tel qu'il était (déjà doublé : il ne passe plus par
    // applyProductionPriceMultiplier(), qui ne connaît que ce que la ferme produit).
    viande_mouton:    { nom: 'Viande de mouton',     icone: '🥩', energie: 38, prix: 10, edible: true,  category: 'produit', rachetable: false },
    pomme:            { nom: 'Pomme',                icone: '🍎', energie: 10, prix: 2, edible: true,  category: 'fruit' }, // 8 × 1,25
    poire:            { nom: 'Poire',                icone: '🍐', energie: 10, prix: 2, edible: true,  category: 'fruit' }, // 8 × 1,25
    farine:           { nom: 'Farine',               icone: '🥣', energie: 13, prix: 1, edible: false, category: 'ingrédient' }, // 10 × 1,25 = 12,5 → 13
    huile:            { nom: 'Huile de tournesol',   icone: '🛢️', energie: 13, prix: 4, edible: false, category: 'ingrédient' }, // 10 × 1,25 = 12,5 → 13
    // Lot 6 : laine (section 8.6). Ni périssable ni comestible : elle sert
    // uniquement à la vente. Elle ne se rachète pas au Marché.
    laine:            { nom: 'Laine',                icone: '🧶', prix: 6, edible: false, category: 'produit', rachetable: false },
    // 10 nouvelles cultures : Zone de culture (oignon, ail, poivron, épinard,
    // fraise, riz, houblon), Serre exclusivement (cacao, vanille, café). Poivron
    // reprend le mode « récolte » (comme tomate/courgette/aubergine) ; ail, riz,
    // houblon, cacao, vanille et café reprennent le mode « plant » (comme la
    // patate ou le blé : la récolte elle-même sert de graine, pas d'item séparé).
    // Cacao, vanille et café sont des cultures de rente : edible: false, donc
    // ignorées par planMeal()/mealOrder() (filtre déjà générique sur ce champ) —
    // elles ne nourrissent jamais la famille, même affamée. category:
    // 'ingrédient' pour ces trois-là et pour le houblon, comme farine/huile
    // (ingrédients de recette, jamais mangés seuls ; aucun plancher de marché
    // spécifique n'est attaché à cette catégorie, voir DATA.MARCHE.PLANCHER).
    oignon:           { nom: 'Oignon',                icone: '🧅', energie: 6,  prix: 1,  edible: true,  category: 'légume' },
    graine_oignon:    { nom: 'Graines d\'oignon',     icone: '🌱', prix: 1,  edible: false, category: 'graine' },
    ail:              { nom: 'Ail',                   icone: '🧄', energie: 6,  prix: 2,  edible: true,  category: 'légume' },
    poivron:          { nom: 'Poivron',               icone: '🫑', energie: 7,  prix: 2,  edible: true,  category: 'légume' },
    graine_poivron:   { nom: 'Graines de poivron',    icone: '🌱', prix: 1,  edible: false, category: 'graine' },
    epinard:          { nom: 'Épinard',               icone: '🥬', energie: 5,  prix: 1,  edible: true,  category: 'légume' },
    graine_epinard:   { nom: 'Graines d\'épinard',    icone: '🌱', prix: 1,  edible: false, category: 'graine' },
    fraise:           { nom: 'Fraise',                icone: '🍓', energie: 5,  prix: 2,  edible: true,  category: 'fruit' },
    graine_fraise:    { nom: 'Graines de fraise',     icone: '🌱', prix: 1,  edible: false, category: 'graine' },
    riz:              { nom: 'Riz',                   icone: '🍚', energie: 10, prix: 1,  edible: true,  category: 'légume' },
    houblon:          { nom: 'Houblon',               icone: '🌿', prix: 3,  edible: false, category: 'ingrédient' },
    cacao:            { nom: 'Cacao',                 icone: '🍫', prix: 8,  edible: false, category: 'ingrédient' },
    vanille:          { nom: 'Vanille',                icone: '🫘', prix: 15, edible: false, category: 'ingrédient' },
    cafe:             { nom: 'Café',                   icone: '☕', prix: 6,  edible: false, category: 'ingrédient' },
    // Anciennes viandes de bœuf et de volaille : voir la note sur viande_mouton
    // (restes des anciennes sauvegardes, ni produites ni rachetables).
    // lait : comestible et périssable comme l'œuf, un peu plus rare et cher.
    viande_boeuf:     { nom: 'Viande de bœuf',        icone: '🍖', energie: 38, prix: 10, edible: true,  category: 'produit', rachetable: false },
    viande_volaille:  { nom: 'Viande de volaille',    icone: '🍗', energie: 14, prix: 6,  edible: true,  category: 'produit', rachetable: false },
    lait:             { nom: 'Lait',                   icone: '🥛', energie: 16, prix: 4,  edible: true,  category: 'produit' },
    // Version 1.1 : la paille. Le Moulin en rend 1 par blé moulu (voir
    // `recipes.farine.sousProduit`) ; les moutons et les vaches la mangent
    // chaque nuit (voir DATA.ANIMAUX et feedLivestock()). Elle ne périme pas, ne
    // se mange pas, se vend 1 pièce et ne s'achète pas au Marché : elle vient
    // seulement du Moulin.
    paille:           { nom: 'Paille',                 icone: '🪹', prix: 1,  edible: false, category: 'produit', rachetable: false },
  },

  // Plats dont la recette a été retirée en version 1.1 (ils demandaient de la
  // viande, qui ne se produit plus). Une ancienne sauvegarde peut encore en
  // avoir : ils restent des plats (mangeables, vendables, bonus de santé), avec
  // l'énergie et le prix qu'ils avaient, mais ne se préparent plus et ne
  // s'achètent pas. Ajoutés à `items` par registerDishItems().
  PLATS_RETIRES: {
    ragout:          { nom: 'Ragoût',              icone: '🍖', energie: 144, prix: 36 },
    poivrons_farcis: { nom: 'Poivrons farcis',     icone: '🫑', energie: 81,  prix: 26 },
    roti_boeuf:      { nom: 'Rôti de bœuf',        icone: '🥩', energie: 144, prix: 36 },
    poulet_roti_ail: { nom: "Poulet rôti à l'ail", icone: '🍗', energie: 75,  prix: 23 },
  },

  /* ---------- Lot 5 : stations, recettes, Livre de recette ---------- */

  // Stations (sections 1.4 et 8.7) : une seule de chaque, une préparation à la
  // fois, sans file d'attente. cout : prix de construction ; electrique : la
  // station est un appareil du parc (interrupteur, usure, panne) qui prend
  // whParS Wh par seconde de fonctionnement ; requiert : station à bâtir
  // avant ; debloque : onglets ouverts par la construction.
  STATIONS: {
    four:    { nom: 'Four',    article: 'le', icone: '🔥', cout: 100, electrique: false, debloque: ['recettes'] },
    cuisine: { nom: 'Cuisine', article: 'la', icone: '🍳', cout: 150, electrique: false, requiert: 'four' },
    moulin:  { nom: 'Moulin',  article: 'le', icone: '⚙️', cout: 120, electrique: true, whParS: 20 },
    presse:  { nom: 'Presse',  article: 'la', icone: '🌻', cout: 150, electrique: true, whParS: 30 },
  },

  // Plats (sections 1.3, 1.4 et 6.8) : énergie = somme des énergies des
  // ingrédients × COEF_PLAT, arrondie ; prix de vente = somme des prix × COEF_PLAT,
  // arrondi. L'eau compte pour ENERGIE_EAU d'énergie et PRIX_EAU pièces par litre.
  // PRIX_EAU (1) est ma lecture pour retrouver le prix du pain de la section 8.9
  // (2 farines + 1 L d'eau = 3, × 1,3 = 4) : à confirmer.
  RECETTES: {
    COEF_PLAT: 130, ENERGIE_EAU: 0, PRIX_EAU: 1, // COEF_PLAT en %
    // Lot 14 : le temps de préparation des plats du Four et de la Cuisine est
    // divisé par DIVISEUR_TEMPS, puis arrondi à l'entier supérieur (Math.ceil),
    // une seule fois au chargement, par applyDishTimeDivisor() (juste après
    // DATA). Le Moulin et la Presse (transformations) ne sont pas concernés.
    // Les multiplicateurs de l'arbre techno (×0,8, ×0,64) s'appliquent ensuite
    // sur ce nouveau temps de base, via recipeTime().
    DIVISEUR_TEMPS: 2,
    STATIONS_TEMPS_DIVISE: ['four', 'cuisine'],
  },

  // Recettes (section 1.3). ingredients : { item, qte } ou { ou: [items], qte }
  // (l'un OU l'autre, sans mélange) ; eau : litres pris dans le réservoir ;
  // temps : secondes à vitesse 1. Les transformations (transformation: true)
  // rendent qteSortie unités de `sortie` ; les plats rendent 1 plat du nom de la
  // recette et sont des aliments (bonus de santé). energieForcee (optionnel) :
  // override explicite de l'énergie du plat, utilisé par dishEnergy() à la
  // place du calcul ingrédients × COEF_PLAT — pour une recette dont l'énergie
  // cible ne découle pas mathématiquement de cette formule (voir gratin_patates).
  // Le prix de vente n'est jamais concerné : dishPrice() reste toujours calculé
  // depuis les ingrédients.
  recipes: {
    pain:            { nom: 'Pain',              icone: '🍞', station: 'four',    temps: 20, ingredients: [{ item: 'farine', qte: 2 }], eau: 1,
                     // Lot 13 : le pain se vend 2 × son ancien prix (4 → 8). La farine
                     // ayant doublé, la somme des ingrédients vaut 5 (2 × 2 + 1 L d'eau) ;
                     // le coefficient ×1,3 donnerait 7, donc coefficient dédié 1,6 (5 × 1,6 = 8).
                     priceMultiplier: 160 },
    omelette:        { nom: 'Omelette',          icone: '🍳', station: 'cuisine', temps: 15, ingredients: [{ item: 'oeuf', qte: 3 }, { item: 'huile', qte: 1 }] },
    ratatouille:     { nom: 'Ratatouille',       icone: '🍲', station: 'cuisine', temps: 30, ingredients: [{ item: 'tomate', qte: 1 }, { item: 'courgette', qte: 1 }, { item: 'aubergine', qte: 1 }, { item: 'huile', qte: 1 }] },
    // Lot 11 (nutrition) : override à 150 (energieForcee) pour qu'une unité de
    // gratin couvre exactement le besoin d'une journée de la famille de départ
    // (2 adultes + 2 enfants = familyNeed() = 150, voir DATA.FAMILY.AJ). Le
    // calcul ingrédients × COEF_PLAT donnerait 91 (3 patates à 19 + 1 œuf à 13,
    // soit 70 × 1,3), donc l'objectif est atteint via ce champ dédié plutôt
    // qu'en gonflant les quantités d'ingrédients (ce qui aurait changé le coût
    // en pièces et en temps de préparation de la recette).
    gratin_patates:  { nom: 'Gratin de patates', icone: '🥘', station: 'four',    temps: 30, ingredients: [{ item: 'patate', qte: 3 }, { item: 'oeuf', qte: 1 }], energieForcee: 150 },
    // (Version 1.1 : le ragoût, les poivrons farcis, le rôti de bœuf et le poulet
    // rôti à l'ail ont quitté le livre : voir DATA.PLATS_RETIRES.)
    compote:         { nom: 'Compote',           icone: '🍮', station: 'cuisine', temps: 15, ingredients: [{ ou: ['pomme', 'poire'], qte: 3 }] },
    tarte_pommes:    { nom: 'Tarte aux pommes',  icone: '🥧', station: 'four',    temps: 45, ingredients: [{ item: 'farine', qte: 2 }, { item: 'pomme', qte: 3 }, { item: 'oeuf', qte: 1 }] },

    // Nouvelles recettes. Aucun nouvel item de base : tous les
    // ingrédients existent déjà (légumes/fruits du Lot « 10 nouvelles
    // cultures », lait, et les
    // cultures de rente cacao/vanille/café/houblon de la Serre/de la Zone de culture).
    // Énergie et prix suivent tous deux le calcul générique (recipeSum ×
    // COEF_PLAT, voir dishEnergy()/dishPrice()), sauf les 4 recettes « luxe »
    // ci-dessous qui portent priceMultiplier (voir plus bas).
    soupe_legumes:   { nom: 'Soupe de légumes',   icone: '🍲', station: 'cuisine', temps: 30, ingredients: [{ item: 'carotte', qte: 1 }, { item: 'oignon', qte: 1 }, { item: 'patate', qte: 1 }], eau: 1 },
    salade_tomates:  { nom: 'Salade de tomates',  icone: '🥗', station: 'cuisine', temps: 10, ingredients: [{ item: 'tomate', qte: 2 }, { item: 'huile', qte: 1 }] },
    quiche_epinards: { nom: 'Quiche aux épinards', icone: '🥧', station: 'four',    temps: 40, ingredients: [{ item: 'farine', qte: 2 }, { item: 'oeuf', qte: 2 }, { item: 'lait', qte: 1 }, { item: 'epinard', qte: 1 }] },
    // Se conserve mieux que le lait cru (4 nuits, voir DATA.CONSERVATION) :
    // 8 nuits, entre la conservation du lait et celle, indéfinie, du frigo.
    // 🟡 Décision de game design ouverte : valeur choisie faute d'un chiffre
    // fourni par la demande, à ajuster si besoin.
    fromage_frais:   { nom: 'Fromage frais',      icone: '🧀', station: 'cuisine', temps: 60, ingredients: [{ item: 'lait', qte: 3 }] },
    riz_au_lait:     { nom: 'Riz au lait',        icone: '🍚', station: 'cuisine', temps: 30, ingredients: [{ item: 'riz', qte: 2 }, { item: 'lait', qte: 1 }] },
    // Utilise le pain (déjà un item via registerDishItems()) comme un
    // ingrédient ordinaire : startRecipe()/takeIngredient() le retirent de
    // l'inventaire exactement comme n'importe quel autre item (voir test
    // dédié). Il doit rester déclaré après `pain` dans cet objet pour que
    // DATA.items.pain existe déjà quand dishEnergy()/dishPrice() le lisent au
    // chargement (registerDishItems() boucle dans l'ordre de déclaration) —
    // c'est déjà le cas ici, pain étant la toute première recette.
    pain_ail:        { nom: "Pain à l'ail",       icone: '🥖', station: 'four',    temps: 15, ingredients: [{ item: 'pain', qte: 1 }, { item: 'ail', qte: 1 }, { item: 'huile', qte: 1 }] },
    tarte_fraises:   { nom: 'Tarte aux fraises',  icone: '🍰', station: 'four',    temps: 40, ingredients: [{ item: 'farine', qte: 2 }, { item: 'fraise', qte: 3 }, { item: 'oeuf', qte: 1 }] },
    // Se conserve bien (demande) : traitée comme une conserve, imperissable
    // (voir l'entrée `confiture_fraises: null` dans DATA.CONSERVATION, qui
    // écarte explicitement la durée par défaut de 6 nuits des plats). 🟡
    // Décision de game design ouverte : la demande ne chiffre pas de durée,
    // « imperissable » est l'interprétation la plus proche d'une confiture.
    confiture_fraises: { nom: 'Confiture de fraises', icone: '🍓', station: 'cuisine', temps: 30, ingredients: [{ item: 'fraise', qte: 4 }] },
    // --- Recettes de luxe (×3 sur le prix des ingrédients, énergie normale) ---
    // priceMultiplier (optionnel) : lu par dishPrice() à la place de
    // DATA.RECETTES.COEF_PLAT, sans dupliquer la formule (recipeSum() reste
    // le seul calcul de somme). dishEnergy() n'est pas concerné : l'énergie
    // continue de suivre COEF_PLAT normalement (aucune recette de luxe ne
    // porte energieForcee).
    chocolat_chaud:  { nom: 'Chocolat chaud',     icone: '🍫', station: 'cuisine', temps: 20, ingredients: [{ item: 'cacao', qte: 1 }, { item: 'lait', qte: 1 }], priceMultiplier: 300 },
    // id « cafe_boisson » (et non « cafe ») : la recette ne doit pas
    // remplacer DATA.items.cafe (l'ingrédient de la Serre) dans
    // registerDishItems(), qui indexe chaque plat par l'id de sa recette.
    cafe_boisson:    { nom: 'Café',               icone: '☕', station: 'cuisine', temps: 10, ingredients: [{ item: 'cafe', qte: 1 }], eau: 1, priceMultiplier: 300 },
    creme_vanille:   { nom: 'Crème à la vanille', icone: '🍨', station: 'cuisine', temps: 45, ingredients: [{ item: 'vanille', qte: 1 }, { item: 'lait', qte: 2 }, { item: 'oeuf', qte: 2 }], priceMultiplier: 300 },
    // Ne périme pas (demande) : même règle que le blé/la farine/la laine,
    // voir l'entrée `biere_artisanale: null` dans DATA.CONSERVATION (absent
    // des deux tables de péremption = imperissable ; ici on l'y met
    // explicitement à `null` pour écarter la durée par défaut de 6 nuits des
    // plats, exactement comme confiture_fraises ci-dessus).
    biere_artisanale: { nom: 'Bière artisanale',  icone: '🍺', station: 'cuisine', temps: 60, ingredients: [{ item: 'houblon', qte: 2 }], eau: 1, priceMultiplier: 300 },
    // --- Arbre v2 : Conserverie. 4 légumes d'une même sorte + 1 L d'eau → 1 bocal
    // qui ne périme pas ; énergie forfaitaire (🟡 à caler).
    bocal_legumes:   { nom: 'Bocal de légumes',   icone: '🫙', station: 'cuisine', temps: 60, ingredients: [{ ou: ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'oignon', 'poivron', 'epinard'], qte: 4 }], eau: 1, energieForcee: 40 },

    // Transformations (section 8.2) : le Moulin et la Presse, appareils électriques.
    // Version 1.1 : moudre 1 blé rend 1 farine ET 1 paille (`sousProduit`). La
    // mouture ne se lance plus depuis le Livre de recette (`horsLivre`) mais
    // dans le Moulin lui-même, par quantité : voir startMilling(). Le temps,
    // l'énergie et l'usure restent ceux d'une préparation du Moulin.
    farine:          { nom: 'Moudre du blé',     icone: '⚙️', station: 'moulin',  temps: 5,  ingredients: [{ item: 'ble', qte: 1 }], transformation: true, sortie: 'farine', qteSortie: 1,
                     sousProduit: { item: 'paille', qte: 1 }, horsLivre: true },
    huile:           { nom: 'Presser du tournesol', icone: '🌻', station: 'presse', temps: 10, ingredients: [{ item: 'graine_tournesol', qte: 3 }], transformation: true, sortie: 'huile', qteSortie: 1 },
  },

  // Cultures (sections 6.3 et 8.3). stades : nuits arrosées pour mûrir ;
  // litres : eau par arrosage ; rendement : unités par récolte.
  // graines.mode :
  //   'recolte' : la récolte rend aussi min à max graines ;
  //   'plant'   : l'item récolté sert lui-même de plant (1 patate = 1 plant) ;
  //   'montee'  : option « monter en graine » : stadesSupp stades de plus, puis
  //               quantite graines à la place de la récolte.
  // lieux : où la culture se plante. 'potager' est l'identifiant interne de la
  // Zone de culture (version 1.0 : l'ancien Potager et l'ancien Champ réunis).
  // deblocage : élément de chapitre (DATA.CHAPITRES) à obtenir avant de pouvoir
  // planter la culture — voir cropUnlocked(). Les cultures de plein champ
  // attendent 'champ' (chapitre 3), comme à l'époque où il fallait un Champ.
  crops: {
    carotte:   { nom: 'Carotte',   icone: '🥕', lieux: ['potager'], stades: 4, litres: 2, rendement: 10,
                 graines: { item: 'graine_carotte', mode: 'montee', stadesSupp: 2, quantite: 6 } },
    patate:    { nom: 'Patate',    icone: '🥔', lieux: ['potager'], stades: 6, litres: 3, rendement: 8,
                 graines: { item: 'patate', mode: 'plant' } },
    tomate:    { nom: 'Tomate',    icone: '🍅', lieux: ['potager', 'serre'], stades: 5, litres: 3, rendement: 10,
                 graines: { item: 'graine_tomate', mode: 'recolte', min: 1, max: 2 } },
    courgette: { nom: 'Courgette', icone: '🥒', lieux: ['potager', 'serre'], stades: 5, litres: 4, rendement: 6,
                 graines: { item: 'graine_courgette', mode: 'recolte', min: 1, max: 2 } },
    aubergine: { nom: 'Aubergine', icone: '🍆', lieux: ['potager', 'serre'], stades: 6, litres: 4, rendement: 6,
                 graines: { item: 'graine_aubergine', mode: 'recolte', min: 1, max: 2 } },
    // 10 nouvelles cultures. Le poivron pousse au Potager ET en Serre, exactement
    // comme la tomate/courgette/aubergine ci-dessus (même mécanisme, mêmes
    // fonctions : plant(), harvest(), yieldSeasonFactor()/waterSeasonFactor()
    // n'appliquent déjà le facteur de saison que si le *lieu* de la parcelle
    // (pas la culture) figure dans DATA.SAISONS.RENDEMENT_LIEU / EAU_LIEUX — la
    // Serre n'y figure pas, donc un poivron planté en Serre ignore déjà les
    // saisons sans code supplémentaire).
    poivron:   { nom: 'Poivron',   icone: '🫑', lieux: ['potager', 'serre'], stades: 6, litres: 4, rendement: 6,
                 graines: { item: 'graine_poivron', mode: 'recolte', min: 1, max: 2 } },
    oignon:    { nom: 'Oignon',    icone: '🧅', lieux: ['potager'], stades: 5, litres: 3, rendement: 8,
                 graines: { item: 'graine_oignon', mode: 'recolte', min: 1, max: 2 } },
    // 1 ail = 1 plant (mode 'plant', comme la patate) : pas d'item graine séparé.
    ail:       { nom: 'Ail',       icone: '🧄', lieux: ['potager'], stades: 6, litres: 2, rendement: 6,
                 graines: { item: 'ail', mode: 'plant' } },
    epinard:   { nom: 'Épinard',   icone: '🥬', lieux: ['potager'], stades: 3, litres: 3, rendement: 8,
                 graines: { item: 'graine_epinard', mode: 'recolte', min: 1, max: 2 } },
    fraise:    { nom: 'Fraise',    icone: '🍓', lieux: ['potager'], stades: 4, litres: 3, rendement: 10,
                 graines: { item: 'graine_fraise', mode: 'recolte', min: 2, max: 3 } },
    // Lot 4 (cultures de plein champ). produit : l'objet récolté quand il n'a pas
    // le nom de la culture. Blé : 1 blé = 1 graine. Tournesol : la récolte donne
    // des graines, à replanter ou à presser (même ressource). Le tournesol
    // attend en plus son propre déblocage (chapitre 4).
    ble:       { nom: 'Blé',       icone: '🌾', lieux: ['potager'], deblocage: 'champ', stades: 7, litres: 2, rendement: 8,
                 graines: { item: 'ble', mode: 'plant' } },
    tournesol: { nom: 'Tournesol', icone: '🌻', lieux: ['potager'], deblocage: 'champ', stades: 7, litres: 2, rendement: 9, produit: 'graine_tournesol',
                 graines: { item: 'graine_tournesol', mode: 'plant' } },
    // Riz : comestible directement (contrairement au blé), mais demande plus
    // d'eau par arrosage (4 L contre 2 L pour le blé) — voir DATA.GRID.pompe et
    // le point de vigilance signalé en fin de réponse au sujet du débit d'eau.
    riz:       { nom: 'Riz',       icone: '🍚', lieux: ['potager'], deblocage: 'champ', stades: 8, litres: 4, rendement: 10,
                 graines: { item: 'riz', mode: 'plant' } },
    houblon:   { nom: 'Houblon',   icone: '🌿', lieux: ['potager'], deblocage: 'champ', stades: 6, litres: 2, rendement: 6,
                 graines: { item: 'houblon', mode: 'plant' } },
    // Cultures de rente : lieux: ['serre'] *seul* (pas 'potager') —
    // plant() (voir plus haut) refuse déjà toute parcelle dont le lieu n'est pas
    // dans cette liste, donc aucune règle spéciale supplémentaire n'est requise
    // pour leur interdire la Zone de culture.
    cacao:     { nom: 'Cacao',     icone: '🍫', lieux: ['serre'], stades: 8, litres: 3, rendement: 5,
                 graines: { item: 'cacao', mode: 'plant' } },
    vanille:   { nom: 'Vanille',   icone: '🫘', lieux: ['serre'], stades: 10, litres: 2, rendement: 3,
                 graines: { item: 'vanille', mode: 'plant' } },
    cafe:      { nom: 'Café',      icone: '☕', lieux: ['serre'], stades: 8, litres: 3, rendement: 6,
                 graines: { item: 'cafe', mode: 'plant' } },
  },

  // Zone de culture (section 8.3 ; version 1.0 : l'ancien Potager et l'ancien
  // Champ réunis en une seule zone, sans restriction de lieu). L'identifiant
  // interne reste 'potager' (state.potager, parcelles « potager-n ») ; le joueur
  // lit NOM. Parcelles par niveau (index 0 = niveau 1) et coût pour atteindre
  // chaque niveau (index 0 = niveau 1, non utilisé) : les anciens coûts du
  // Potager et du Champ additionnés.
  POTAGER: {
    LIEU: 'potager',
    NOM: 'Zone de culture',
    ICONE: '🌱',
    PARCELLES: [6, 12, 18, 24, 30],
    COUT: [0, 200, 480, 1050, 2300],
  },

  // Famille et santé (sections 1.1, 1.4, 6.9 et 8.8).
  FAMILY: {
    // nom : le rôle (« Adulte 1 »), qui sert de prénom tant que le joueur n'en
    // a pas choisi un ; genre : le sexe de départ ('f' ou 'm').
    MEMBRES: [
      { id: 'adulte-1', nom: 'Adulte 1', enfant: false, genre: 'f' },
      { id: 'adulte-2', nom: 'Adulte 2', enfant: false, genre: 'm' },
      { id: 'enfant-1', nom: 'Enfant 1', enfant: true, genre: 'm' },
      { id: 'enfant-2', nom: 'Enfant 2', enfant: true, genre: 'f' },
    ],
    // Version 1.1 : chaque membre a un prénom (1 à PRENOM_MAX caractères), un
    // sexe et une couleur de peau, choisis par le joueur (voir setMemberProfile()).
    // TEINTS : indice 0 = le jaune par défaut, 1 à 5 = les cinq teintes des emojis.
    // PORTRAITS : l'emoji selon l'âge et le sexe ; la teinte s'y ajoute.
    // Le prénom est une donnée personnelle : il reste dans la sauvegarde, sur
    // l'appareil, et ne doit jamais partir dans le suivi de session.
    PROFIL: {
      PRENOM_MAX: 12,
      GENRES: ['f', 'm'],
      TEINTS: ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'],
      PORTRAITS: { adulte: { f: '👩', m: '👨' }, enfant: { f: '👧', m: '👦' } },
    },
    AJ: { adulte: 50, enfant: 25 }, // énergie par jour et par membre
    // Version 1.2 : le joueur compose sa famille. De MEMBRES_MIN à MEMBRES_MAX
    // membres (adultes ou enfants), dont au moins ADULTES_MIN adulte ; la partie
    // commence avec les quatre membres de MEMBRES. Le besoin journalier suit :
    // c'est la somme des AJ des membres présents (familyNeed()).
    COMPOSITION: { MEMBRES_MIN: 1, MEMBRES_MAX: 6, ADULTES_MIN: 1 },
    // Animaux de compagnie : jusqu'à MAX chiens ou chats. Ils ne mangent pas les
    // réserves de la famille et ne comptent ni dans le besoin journalier, ni dans
    // la santé, ni dans la productivité. Leur nom suit les règles d'un prénom.
    COMPAGNIE: {
      MAX: 3,
      ESPECES: {
        chien: { nom: 'Chien', icone: '🐶' },
        chat: { nom: 'Chat', icone: '🐱' },
      },
    },
    SANTE_DEPART: 100,
    SANTE_MAX: 100,
    // Couverture minimale du besoin (en %) → variation de santé, du palier le
    // plus haut au plus bas.
    VARIATION: [
      { min: 100, delta: 5 },
      { min: 75, delta: -5 },
      { min: 50, delta: -10 },
      { min: 0, delta: -20 },
    ],
    // Santé moyenne minimale → productivité en % (actions au clic).
    PRODUCTIVITE: [
      { min: 80, pct: 100 },
      { min: 50, pct: 80 },
      { min: 20, pct: 50 },
      { min: 0, pct: 25 },
    ],
    // Soin : base × croissance^(soins déjà payés) ; il remet la santé à SANTE.
    SOIN: { base: 20, croissance: 150, SANTE: 50 },
    // Lot 5 : bonus de santé de la nuit, +PAR_PLAT par plat différent mangé, jusqu'à MAX.
    BONUS_PLATS: { PAR_PLAT: 1, MAX: 3 },
    // Sans soin, un malade regagne ce nombre de points par nuit où le besoin est
    // couvert à 100 %. Il guérit en atteignant la santé remise par un soin.
    RECUPERATION_MALADE: 2,
    // Réserve de semences de départ : quantité par item que la famille ne mange jamais.
    RESERVE_DEPART: { patate: 6 },
  },

  /* ---------- Lot 3 : péremption et Marché ---------- */

  // Conservation en nuits hors réfrigérateur (sections 1.4 et 6.9 quinquies).
  // Un item absent de ces deux tables ne périme jamais (blé, farine, huile,
  // graines, laine, conserves). CATEGORIE sert aux catégories entières (les
  // plats cuisinés).
  CONSERVATION: {
    viande_mouton: 5, viande_boeuf: 5,
    tomate: 5, courgette: 5, aubergine: 5, poivron: 5,
    oeuf: 6, carotte: 6, oignon: 6,
    pomme: 7, poire: 7, pain: 7, patate: 7, ail: 7,
    // Épinard et fraise sont plus fragiles que les autres légumes/fruits frais.
    // Le riz (comme le blé) et le houblon/cacao/vanille/café (comme
    // farine/huile/laine, non comestibles) ne figurent pas ici : denrées sèches,
    // ils ne périment pas (voir shelfLife() : absent de la table = imperissable).
    // Le lait est fragile (même durée que l'épinard et la fraise), comme
    // l'ancienne viande de volaille.
    epinard: 4, fraise: 4, viande_volaille: 4, lait: 4,
    // 15 nouvelles recettes : le fromage frais se conserve mieux que le lait
    // cru (4 nuits ci-dessus), sans aller jusqu'à l'imperissable (🟡 valeur
    // choisie, décision de game design ouverte — voir commentaire sur la
    // recette DATA.recipes.fromage_frais).
    fromage_frais: 8,
    // La bière artisanale et la confiture de fraises sont des plats (donc
    // normalement CONSERVATION_CATEGORIE.plat = 6 nuits), mais la demande les
    // veut imperissables (« ne périme pas », « se conserve bien ») : une
    // valeur explicite à `null` ici prend le pas sur la durée par catégorie
    // (voir shelfLife(), qui teste `!== undefined`, pas la véracité de la
    // valeur), exactement comme blé/farine/huile/laine ci-dessus mais listée
    // explicitement puisque ces deux plats appartiendraient sinon à la
    // catégorie « plat » par défaut.
    biere_artisanale: null,
    confiture_fraises: null,
    // Arbre v2 (Conserverie) : le bocal de légumes ne périme pas.
    bocal_legumes: null,
  },
  CONSERVATION_CATEGORIE: { plat: 6 },

  // Origine d'un lot (sert au % d'autonomie du Lot 9) : « produit » par défaut,
  // sauf pour les catégories listées ici (les conserves comptent comme achetées).
  ORIGINE: { PRODUIT: 'produit', ACHETE: 'acheté', PAR_CATEGORIE: { conserve: 'acheté' } },

  // Marché (sections 1.3, 6.7 et 8.9). Prix d'achat = prix de vente × coefficient.
  // Le coefficient démarre à son plancher (1,2 ; 2,0 pour les graines), monte de
  // PAS par unité achetée, baisse de PAS par unité vendue sans passer sous le
  // plancher, et ne redescend jamais avec le temps.
  MARCHE: {
    PLANCHER: { defaut: 120, graine: 200 }, // en %, par catégorie d'objet
    PAS: 10, // points de %
    // Lot 12 (doublement des prix de vente des productions de la ferme) :
    // multiplicateur appliqué une seule fois, au chargement, au prix de
    // vente (DATA.items[x].prix) de chaque récolte de culture, fruit du
    // Verger et produit animal (œuf, lait, laine) — jamais aux
    // graines, aux achats du Marché qui ne sont pas des productions, aux
    // bâtiments/appareils/soins/services, ni aux ingrédients transformés
    // (farine, huile) ou aux plats cuisinés, dont le prix se calcule déjà à
    // partir des prix des ingrédients (voir dishPrice()) et serait donc
    // doublé deux fois si ce multiplicateur s'y appliquait aussi. Voir
    // applyProductionPriceMultiplier(), juste après DATA, qui détermine la
    // liste des objets concernés à partir de DATA.crops, DATA.VERGER.ARBRES
    // et DATA.ANIMAUX plutôt que d'une liste codée en dur ici.
    MULTIPLICATEUR_PRODUCTION: 2,
    // Lot 13 : la farine (transformation du blé, pas une production directe de
    // la ferme) reçoit elle aussi le multiplicateur ci-dessus, par choix
    // explicite. L'huile, autre transformation, n'y figure pas. Le pain (plat)
    // est réglé sur sa propre recette : voir `recipes.pain.priceMultiplier`.
    TRANSFORMATIONS_DOUBLEES: ['farine'],
  },

  /* ---------- Lot 4 : Silo, Poulailler ---------- */

  // (Le Champ du Lot 4 a disparu en version 1.0 : ses cultures poussent dans la
  // Zone de culture, voir DATA.POTAGER et MIGRATIONS[14].)

  // Silo (section 8.5) : stock de blé. Construction offerte (validée) ; COUT[n]
  // est le prix pour atteindre le niveau n + 1. Le blé récolté y va d'abord ;
  // les poules y mangent d'abord. ITEM : l'objet stocké.
  SILO: {
    ITEM: 'ble',
    CONSTRUCTION: 0,
    CAPACITE: [20, 50, 100, 200, 400],
    COUT: [0, 30, 80, 180, 400],
  },

  // Poulailler (sections 1.3 et 8.5).
  POULAILLER: {
    CONSTRUCTION: 40,
    CAPACITE: [4, 8, 12, 16, 24],
    COUT: [0, 100, 220, 450, 900],
  },

  // Animaux achetés au Marché (section 1.4) : prix fixes, sans revente.
  // Poule : 1 blé nourrit poulesParBle poules (une fois par nuit) ; une poule
  // nourrie pond oeufsParNuit œuf. Une ration entamée (poule impaire) est
  // perdue à la fin de la nuit : n poules coûtent ⌈n ÷ poulesParBle⌉ blé.
  //
  // Version 1.1 : les animaux ne sont plus jamais tués et n'ont plus de poids.
  // Les moutons et les vaches vivent à l'Étable et mangent de la paille :
  // chaque nuit, un mouton en mange pailleParNuit (1) et une vache
  // pailleParNuit (2), dans l'ordre de la liste (les moutons, puis les vaches),
  // tant qu'il en reste. Voir feedLivestock().
  // - Un mouton nourri voit sa laine avancer d'une nuit ; au bout de joursLaine
  //   nuits nourries (2), il se tond (laineParTonte laine).
  // - Une vache nourrie donne laitParNuit lait cette nuit-là.
  // - Un animal qui n'a pas mangé ne produit rien cette nuit ; il ne lui arrive
  //   rien d'autre.
  // Ces quantités sont des réglages : elles se changent ici, sans toucher au code.
  ANIMAUX: {
    poule: {
      nom: 'Poule', icone: '🐔', prix: 15, poulesParBle: 2, oeufsParNuit: 1, produit: 'oeuf',
    },
    mouton: {
      nom: 'Mouton', icone: '🐑', prix: 60,
      pailleParNuit: 1,
      joursLaine: 2, laineParTonte: 1, laine: 'laine',
    },
    vache: {
      nom: 'Vache', icone: '🐄', prix: 200,
      pailleParNuit: 2,
      laitParNuit: 1, lait: 'lait',
    },
  },

  /* ---------- Lot 6 : Étable des moutons et des vaches ---------- */

  // Les moutons et les vaches vivent à l'Étable (version 1.1 ; l'identifiant
  // interne reste « paturage » : state.paturage, déblocage 'paturage'). La
  // place se compte en places entières : `placesDepart` places à l'ouverture
  // (pour `deblocage` pièces) ; un mouton prend `placesParMouton` place, une
  // vache `placesParVache`. Les places sont communes aux deux espèces. Une
  // place de plus coûte prixPlace × croissance^(n − 1), n étant le rang de
  // l'achat au-delà des places de départ (voir pastureCost()). Une place
  // achetée reste acquise. C'est le même équilibrage qu'avant la version 1.1,
  // où 1 place valait 5 ares (50 a au départ, 5 a par mouton, 15 a par vache).
  // nourriture : l'objet que mangent les moutons et les vaches.
  PATURAGE: {
    deblocage: 150,
    placesDepart: 10,
    placesParMouton: 1,
    placesParVache: 3,
    prixPlace: 40,
    croissance: 120,
    nourriture: 'paille',
  },

  /* ---------- Lot 7 : automatisations et arbre des technologies ---------- */

  // L'onglet « Arbre des technologies » apparaît la première fois que le joueur
  // possède au moins SEUIL_PIECES pièces (il reste ensuite).
  TECHNO: { ONGLET: 'techno', SEUIL_PIECES: 100 },

  // Arbre des technologies v2 (docs/arbre_technologique.md). Chaque nœud coûte
  // des points de technologie (PT) ET des pièces ; son palier demande un
  // chapitre en cours minimal. Les automatisations (arrosage, récolte, semis,
  // nourrissage, tonte) viennent toutes de l'arbre, plus du niveau 5.
  // Prérequis : { noeud }, { batiment, niveau }, { construit }, { appareil, nombre }.
  // Effets (tous entiers) : voir techEffect() et le catalogue de la spécification.
  techtree: {
    PALIERS: {
      1: { chapitre: 1, nom: 'Premiers pas' },
      2: { chapitre: 3, nom: 'Organisation' },
      3: { chapitre: 4, nom: 'Automatisation' },
      4: { chapitre: 5, nom: 'Maîtrise' },
      5: { chapitre: 7, nom: 'Autonomie' },
    },

    // Points de technologie (PT).
    POINTS: {
      // PT gagnés en terminant chaque chapitre (index 0 = chapitre 1). Total 26.
      CHAPITRES: [2, 3, 3, 4, 4, 5, 5],
      // Jalons de maîtrise : 1 PT chacun, une seule fois, à tout moment. Total 6.
      MAITRISE: [
        { id: 'eau_2000',   compteur: 'litres',    cible: 2000, libelle: 'Pomper 2 000 L au total' },
        { id: 'plats_10',   compteur: 'plats',     cible: 10,   libelle: 'Préparer 10 plats différents' },
        { id: 'pains_50',   compteur: 'pains',     cible: 50,   libelle: 'Cuire 50 pains' },
        { id: 'laines_40',  compteur: 'laines',    cible: 40,   libelle: 'Tondre 40 laines' },
        { id: 'annee_1',    compteur: 'nuits',     cible: 40,   libelle: 'Traverser une année complète (40 nuits)' },
        { id: 'pleine_20',  compteur: 'nuits100',  cible: 20,   libelle: 'Cumuler 20 nuits à 100 % d\'autonomie' },
      ],
      // Mode libre (campagne terminée) : +1 PT toutes les N nuits à 100 %.
      MODE_LIBRE_NUITS_100: 5,
    },

    batiments: {
      potager:    { nom: 'Zone de culture', icone: '🌱' },
      serre:      { nom: 'Serre',      icone: '🏡' },
      poulailler: { nom: 'Poulailler', icone: '🐔' },
      silo:       { nom: 'Silo',       icone: '🛖' },
      pompe:      { nom: 'Pompe',      icone: '⛲' },
      paturage:   { nom: 'Étable (moutons et vaches)', icone: '🐑' },
      four:       { nom: 'Four',       icone: '🔥' },
      frigo:      { nom: 'Réfrigérateur', icone: '🧊' },
      batterie:   { nom: 'Batteries',  icone: '🔋' },
    },

    suivi: {
      panneau:    { type: 'appareils', nom: 'Panneaux solaires', icone: '☀️' },
      batterie:   { type: 'appareils', nom: 'Batteries', icone: '🔋' },
      pompe:      { type: 'niveau', nom: 'Pompe et réservoir', icone: '⛲' },
      potager:    { type: 'niveau', nom: 'Zone de culture', icone: '🌱', note: 'arrosage et récolte automatiques' },
      poulailler: { type: 'niveau', nom: 'Poulailler', icone: '🐔', note: 'nourrissage automatique' },
      silo:       { type: 'niveau', nom: 'Silo', icone: '🛖' },
      stations:   { type: 'stations', nom: 'Ateliers', icone: '🍞' },
    },
    branches: [
      { id: 'energie', nom: 'Énergie', icone: '⚡', suivi: ['panneau', 'batterie'] },
      { id: 'eau', nom: 'Eau', icone: '💧', suivi: ['pompe'] },
      { id: 'culture', nom: 'Culture', icone: '🌱', suivi: ['potager'] },
      { id: 'elevage', nom: 'Élevage', icone: '🐔', suivi: ['poulailler', 'silo'] },
      { id: 'cuisine', nom: 'Cuisine', icone: '🍳', suivi: ['stations'] },
      { id: 'famille', nom: 'Famille', icone: '👨‍👩‍👧‍👦', suivi: [] },
    ],

    // Recettes toujours disponibles dès que leur atelier est construit.
    RECETTES_LIBRES: [
      'pain', 'gratin_patates', 'tarte_pommes',
      'omelette', 'ratatouille', 'compote', 'soupe_legumes', 'salade_tomates',
      'farine', 'huile',
    ],

    // Nœuds retirés de l'arbre, avec ce qu'ils coûtaient : une sauvegarde qui en
    // possède un le perd à la migration et récupère ses points et ses pièces.
    NOEUDS_RETIRES: {
      cui_rotisserie: { pt: 1, cout: 300 },
    },

    noeuds: {
      /* ---------------- ⚡ Énergie ---------------- */
      en_entretien: {
        branche: 'energie', palier: 1, nom: 'Entretien préventif', icone: '🔧', fonction: 'productivite',
        pt: 1, cout: 100, requiert: [],
        effet: { usure: 75 },
        description: 'Panneaux, batteries et appareils s\'usent 25 % moins vite.',
      },
      en_delestage: {
        branche: 'energie', palier: 3, nom: 'Délestage intelligent', icone: '🎛️', fonction: 'automatisation',
        pt: 1, cout: 400, requiert: [{ noeud: 'en_entretien' }, { appareil: 'batterie', nombre: 2 }],
        effet: { delestage: { seuil: 10 } },
        description: 'Sous 10 % de charge, le Moulin, la Presse et la Pompe se mettent en pause pour garder l\'électricité du réfrigérateur. Ils repartent seuls quand la charge remonte.',
      },
      en_entretien_auto: {
        branche: 'energie', palier: 3, nom: 'Entretien automatique', icone: '🛠️', fonction: 'automatisation',
        pt: 2, cout: 500, requiert: [{ noeud: 'en_entretien' }],
        effet: { entretienAuto: true },
        description: 'Chaque nuit, les appareils à 70 % d\'usure ou plus sont entretenus automatiquement, au prix normal, si les pièces suffisent.',
      },
      en_frigo_eco: {
        branche: 'energie', palier: 4, nom: 'Réfrigérateur basse consommation', icone: '🧊', fonction: 'productivite',
        pt: 1, cout: 600, requiert: [{ noeud: 'en_delestage' }, { construit: 'frigo' }],
        effet: { frigoConso: 70 },
        description: 'Le réfrigérateur consomme 30 % d\'électricité en moins.',
      },
      en_hiver: {
        branche: 'energie', palier: 4, nom: 'Panneaux orientables', icone: '☀️', fonction: 'productivite',
        pt: 2, cout: 800, requiert: [{ noeud: 'en_entretien_auto' }],
        effet: { solaireHiver: 85 },
        description: 'En hiver, les panneaux produisent 85 % de leur puissance au lieu de 70 %.',
      },

      /* ---------------- 💧 Eau ---------------- */
      ea_econome: {
        branche: 'eau', palier: 1, nom: 'Arrosage économe', icone: '💧', fonction: 'productivite',
        pt: 1, cout: 150, requiert: [{ batiment: 'pompe', niveau: 2 }],
        effet: { eauArrosage: 85 },
        description: 'Chaque arrosage consomme 15 % d\'eau en moins.',
      },
      ea_pluie: {
        branche: 'eau', palier: 2, nom: 'Récupérateur d\'eau de pluie', icone: '🌧️', fonction: 'deblocage',
        pt: 1, cout: 250, requiert: [{ noeud: 'ea_econome' }],
        effet: { pluie: { printemps: 20, ete: 5, automne: 20, hiver: 10 } },
        description: 'Chaque nuit, de l\'eau de pluie s\'ajoute au réservoir sans électricité : 20 L au printemps et en automne, 10 L en hiver, 5 L en été.',
      },
      ea_irrigation: {
        branche: 'eau', palier: 3, nom: 'Réseau d\'irrigation', icone: '🚿', fonction: 'automatisation',
        pt: 2, cout: 900, requiert: [{ noeud: 'ea_econome' }, { batiment: 'pompe', niveau: 3 }, { batiment: 'potager', niveau: 3 }],
        effet: { auto: { arrosage: ['potager'] } },
        description: 'Chaque nuit, toutes les parcelles plantées de la Zone de culture sont arrosées automatiquement.',
      },
      ea_pompe_eco: {
        branche: 'eau', palier: 3, nom: 'Pompe à haut rendement', icone: '⛲', fonction: 'productivite',
        pt: 1, cout: 500, requiert: [{ noeud: 'ea_econome' }, { noeud: 'en_entretien' }],
        effet: { whParLitre: 75 },
        description: 'La pompe consomme 25 % d\'électricité en moins par litre.',
      },
      ea_serre: {
        branche: 'eau', palier: 4, nom: 'Irrigation de la Serre', icone: '🏡', fonction: 'automatisation',
        pt: 2, cout: 600, requiert: [{ noeud: 'ea_irrigation' }, { construit: 'serre' }],
        effet: { auto: { arrosage: ['serre'] } },
        description: 'Chaque nuit, les parcelles plantées de la Serre sont arrosées automatiquement.',
      },
      ea_gestion: {
        branche: 'eau', palier: 5, nom: 'Gestion intelligente de l\'eau', icone: '📟', fonction: 'automatisation',
        pt: 3, cout: 1500, requiert: [{ noeud: 'ea_serre' }, { noeud: 'en_delestage' }],
        effet: { arrosagePrioritaire: true, eauArrosage: 90 },
        description: 'Quand l\'eau manque, l\'arrosage automatique sert d\'abord les plantes les plus proches de la récolte. Chaque arrosage consomme encore 10 % d\'eau en moins.',
      },

      /* ---------------- 🌱 Culture ---------------- */
      cu_outils: {
        branche: 'culture', palier: 1, nom: 'Outils de jardin', icone: '🧰', fonction: 'temps',
        pt: 1, cout: 100, requiert: [],
        effet: { actionsGroupees: ['arroser', 'recolter'] },
        description: 'Ajoute « Arroser tout » et « Récolter tout » à la Zone de culture et à la Serre.',
      },
      cu_semences: {
        branche: 'culture', palier: 2, nom: 'Sélection des semences', icone: '🌰', fonction: 'productivite',
        pt: 1, cout: 200, requiert: [],
        effet: { grainesBonus: 1 },
        description: 'Les cultures qui rendent des graines en donnent une de plus, et une carotte montée en graine en donne 8 au lieu de 6.',
      },
      cu_recolte_auto: {
        branche: 'culture', palier: 3, nom: 'Récolte automatique', icone: '🧺', fonction: 'automatisation',
        pt: 2, cout: 900, requiert: [{ noeud: 'cu_outils' }, { batiment: 'potager', niveau: 4 }],
        effet: { auto: { recolte: ['potager'] } },
        description: 'Chaque nuit, les parcelles mûres de la Zone de culture sont récoltées automatiquement (sauf celles qui montent en graine).',
      },
      semis_auto: {
        branche: 'culture', palier: 4, nom: 'Semis automatique', icone: '🌾', fonction: 'automatisation',
        pt: 2, cout: 1200, requiert: [{ noeud: 'cu_recolte_auto' }, { noeud: 'ea_irrigation' }],
        effet: { auto: { semis: ['potager'] } },
        description: 'Après une récolte automatique, la parcelle est replantée avec la même culture si une graine est disponible au-delà de la réserve de semences. Réglable parcelle par parcelle.',
      },
      cu_serre_auto: {
        branche: 'culture', palier: 5, nom: 'Serre autonome', icone: '🌿', fonction: 'automatisation',
        pt: 3, cout: 1500, requiert: [{ noeud: 'semis_auto' }, { noeud: 'ea_serre' }],
        effet: { auto: { recolte: ['serre'], semis: ['serre'] } },
        description: 'La Serre est récoltée et replantée automatiquement chaque nuit, avec les mêmes réglages que le semis automatique.',
      },

      /* ---------------- 🐔 Élevage ---------------- */
      el_ration: {
        branche: 'elevage', palier: 2, nom: 'Ration équilibrée', icone: '🌾', fonction: 'productivite',
        pt: 1, cout: 200, requiert: [{ construit: 'poulailler' }],
        effet: { poulesParBle: 5, parBle: 2 },
        description: '2 blé nourrissent 5 poules au lieu de 4.',
      },
      el_mangeoire: {
        branche: 'elevage', palier: 3, nom: 'Mangeoire à trémie', icone: '🪣', fonction: 'automatisation',
        pt: 2, cout: 600, requiert: [{ batiment: 'poulailler', niveau: 3 }, { batiment: 'silo', niveau: 2 }],
        effet: { auto: { nourrissage: ['poulailler'] } },
        description: 'Chaque nuit, les poules sont nourries automatiquement avec le blé du Silo.',
      },
      el_tonte: {
        branche: 'elevage', palier: 4, nom: 'Tonte planifiée', icone: '✂️', fonction: 'automatisation',
        pt: 2, cout: 500, requiert: [{ noeud: 'el_mangeoire' }, { construit: 'paturage' }],
        effet: { auto: { tonte: ['paturage'] } },
        description: 'Chaque nuit, les moutons dont la laine est prête sont tondus automatiquement, avant de manger leur paille.',
      },
      // Identifiant historique (l'ancien « Pâturage tournant ») : il reste pour
      // les sauvegardes qui possèdent déjà ce nœud.
      el_paturage: {
        branche: 'elevage', palier: 4, nom: 'Étable agrandie', icone: '🐑', fonction: 'productivite',
        pt: 1, cout: 400, requiert: [{ construit: 'paturage' }],
        effet: { croissanceSurface: 110 },
        description: 'Le prix de chaque place supplémentaire pour les moutons et les vaches augmente de 10 % au lieu de 20 %.',
      },

      /* ---------------- 🍳 Cuisine ---------------- */
      prepa_1: {
        branche: 'cuisine', palier: 2, nom: 'Préparation rapide I', icone: '⏱️', fonction: 'temps',
        pt: 1, cout: 300, requiert: [],
        effet: { tempsPrepa: 80 },
        description: 'Les temps de préparation (Four, Cuisine, Moulin, Presse) baissent de 20 %.',
      },
      cui_boulangerie: {
        branche: 'cuisine', palier: 2, nom: 'Boulangerie', icone: '🥖', fonction: 'deblocage',
        pt: 1, cout: 200, requiert: [{ construit: 'four' }],
        effet: { recettes: ['pain_ail', 'tarte_fraises', 'quiche_epinards'] },
        description: 'Nouvelles recettes au Four : pain à l\'ail, tarte aux fraises, quiche aux épinards.',
      },
      cui_serie: {
        branche: 'cuisine', palier: 3, nom: 'Préparations en série', icone: '📋', fonction: 'automatisation',
        pt: 2, cout: 500, requiert: [{ noeud: 'prepa_1' }],
        effet: { fileAttente: 3 },
        description: 'Le Four, la Cuisine et la Presse acceptent jusqu\'à 3 préparations à la suite : elles s\'enchaînent sans clic, ingrédients réservés au lancement. (Le Moulin, lui, moud déjà la quantité de blé que tu choisis.)',
      },
      cui_laiterie: {
        branche: 'cuisine', palier: 3, nom: 'Laiterie', icone: '🧀', fonction: 'deblocage',
        pt: 1, cout: 300, requiert: [{ construit: 'paturage' }],
        effet: { recettes: ['fromage_frais', 'riz_au_lait'] },
        description: 'Nouvelles recettes en Cuisine : fromage frais, riz au lait.',
      },
      // (Version 1.1 : le nœud « Rôtisserie », cui_rotisserie, a disparu avec les
      // recettes à la viande. MIGRATIONS[15] le retire des sauvegardes et rend
      // ce qu'il coûtait : voir NOEUDS_RETIRES.)
      prepa_2: {
        branche: 'cuisine', palier: 4, nom: 'Préparation rapide II', icone: '⏱️', fonction: 'temps',
        pt: 1, cout: 700, requiert: [{ noeud: 'cui_serie' }],
        effet: { tempsPrepa: 80 },
        description: 'Encore −20 % sur les temps de préparation (64 % du temps de départ en tout).',
      },
      cui_conserverie: {
        branche: 'cuisine', palier: 4, nom: 'Conserverie', icone: '🫙', fonction: 'deblocage',
        pt: 2, cout: 600, requiert: [{ noeud: 'cui_serie' }, { noeud: 'fa_cellier' }],
        effet: { recettes: ['bocal_legumes', 'confiture_fraises'] },
        description: 'Nouvelles recettes en Cuisine : bocal de légumes (4 légumes d\'une même sorte, ne périme pas) et confiture de fraises.',
      },
      cui_epicerie: {
        branche: 'cuisine', palier: 4, nom: 'Épicerie fine', icone: '☕', fonction: 'deblocage',
        pt: 2, cout: 800, requiert: [{ noeud: 'cui_laiterie' }, { construit: 'serre' }],
        effet: { recettes: ['chocolat_chaud', 'cafe_boisson', 'creme_vanille', 'biere_artisanale'] },
        description: 'Recettes de luxe en Cuisine : chocolat chaud, café, crème à la vanille, bière artisanale.',
      },

      /* ---------------- 👨‍👩‍👧‍👦 Famille ---------------- */
      reveil_1: {
        branche: 'famille', palier: 1, nom: 'Réveil matinal I', icone: '🌅', fonction: 'temps',
        pt: 1, cout: 200, requiert: [],
        effet: { eveilMin: 20 },
        description: 'L\'éveil minimal avant de pouvoir dormir passe de 30 s à 20 s.',
      },
      fa_remedes: {
        branche: 'famille', palier: 1, nom: 'Remèdes maison', icone: '🌿', fonction: 'productivite',
        pt: 1, cout: 100, requiert: [],
        effet: { soinCout: 70, recuperation: 1 },
        description: 'Les soins coûtent 30 % de moins, et un malade regagne 3 points de santé par nuit bien nourrie au lieu de 2.',
      },
      fa_cellier: {
        branche: 'famille', palier: 2, nom: 'Cellier', icone: '🏚️', fonction: 'productivite',
        pt: 1, cout: 250, requiert: [],
        effet: { conservation: 1 },
        description: 'Hors réfrigérateur, tout ce qui périme se garde une nuit de plus.',
      },
      fa_menus: {
        branche: 'famille', palier: 3, nom: 'Menus variés', icone: '🍽️', fonction: 'productivite',
        pt: 1, cout: 300, requiert: [{ noeud: 'fa_cellier' }],
        effet: { bonusPlatsMax: 5 },
        description: 'Le bonus de santé des plats différents mangés monte jusqu\'à +5 par nuit au lieu de +3.',
      },
      reveil_2: {
        branche: 'famille', palier: 3, nom: 'Réveil matinal II', icone: '🌅', fonction: 'temps',
        pt: 1, cout: 500, requiert: [{ noeud: 'reveil_1' }],
        effet: { eveilMin: 10 },
        description: 'L\'éveil minimal passe à 10 s.',
      },
      fa_routine: {
        branche: 'famille', palier: 5, nom: 'Routine familiale', icone: '🏡', fonction: 'automatisation',
        pt: 3, cout: 2500,
        requiert: [{ noeud: 'reveil_2' }, { noeud: 'semis_auto' }, { noeud: 'el_mangeoire' }, { noeud: 'en_entretien_auto' }],
        effet: { routine: true },
        description: 'Option « Dormir tout seul » : jeu ouvert, la famille va se coucher d\'elle-même dès que l\'éveil minimal est écoulé.',
      },
    },
  },

  /* ---------- Lot 8 : saisons, Serre, Verger, Réfrigérateur ---------- */

  // Saisons légères (sections 1.4 et 6.9 ter) : 4 saisons de LONGUEUR nuits, la
  // saison se déduit de la nuit courante (nuit 1 = premier jour du printemps).
  // MODS : facteur par saison et par type de calcul (solaire : production des
  // panneaux ; potager : rendement d'une récolte de la Zone de culture, quelle
  // que soit la culture ; eau : litres par arrosage). La Serre les ignore tous.
  // Les animaux ne dépendent pas des saisons (version 1.1 : l'ancien facteur
  // « moutons » ne jouait que sur leur prise de poids, qui n'existe plus) : ni
  // la ponte, ni le lait, ni la laine ne changent d'une saison à l'autre.
  SAISONS: {
    LONGUEUR: 10,
    ORDRE: ['printemps', 'ete', 'automne', 'hiver'],
    INFOS: {
      printemps: { nom: 'Printemps', icone: '🌱' },
      ete:       { nom: 'Été',       icone: '☀️' },
      automne:   { nom: 'Automne',   icone: '🍂' },
      hiver:     { nom: 'Hiver',     icone: '❄️' },
    },
    MODS: {
      // en % : 110 = +10 %, 70 = −30 %
      printemps: { solaire: 100, potager: 110, eau: 100 },
      ete:       { solaire: 130, potager: 100, eau: 130 },
      automne:   { solaire: 90,  potager: 100, eau: 90 },
      hiver:     { solaire: 70,  potager: 70,  eau: 80 },
    },
    // Types de facteurs, avec leur libellé pour le calendrier.
    FACTEURS: {
      solaire: { nom: 'Solaire', icone: '☀️' },
      potager: { nom: 'Zone de culture', icone: '🌱' },
      eau:     { nom: 'Eau', icone: '💧' },
    },
    // Lieu de culture → facteur de rendement qui s'y applique. Un lieu absent
    // (la Serre) n'a aucun modificateur, ni de rendement ni d'eau.
    RENDEMENT_LIEU: { potager: 'potager' },
    EAU_LIEUX: ['potager'],
  },

  // Serre (sections 1.4 et 8.3) : mêmes parcelles que la Zone de culture, sans modificateur
  // de saison. CONSTRUCTION est le prix du niveau 1 ; COUT[n] est le prix pour
  // atteindre le niveau n + 1 (index 0 non utilisé). Tomate, courgette, aubergine.
  SERRE: {
    LIEU: 'serre',
    CONSTRUCTION: 400,
    PARCELLES: [6, 9, 12, 15, 18],
    COUT: [0, 300, 600, 1000, 1800],
  },

  // Verger (sections 1.3, 1.4 et 8.4). Les arbres s'achètent au Marché à prix
  // fixe et se plantent sur un emplacement libre. Un arbre est adulte MATURITE
  // nuits après sa plantation ; adulte, il donne FRUITS fruits toutes les PERIODE
  // nuits, seulement dans la fenêtre : les `dernieresNuits` dernières nuits de
  // l'été et toute la saison suivante (automne). Pas d'arrosage.
  // CONSTRUCTION : 0 (« aménager » le Verger est gratuit : il est débloqué par le
  // chapitre 6, voir CHAPITRES) ; l'emplacement
  // supplémentaire coûte EMPLACEMENT.base × croissance^n, n étant le nombre
  // d'emplacements déjà achetés (ceux de départ ne comptent pas), arrondi à
  // l'entier supérieur. EMPLACEMENTS_MAX plafonne le nombre total d'emplacements
  // (départ compris) : au-delà, aucun nouvel emplacement ne peut être acheté.
  VERGER: {
    CONSTRUCTION: 0,
    EMPLACEMENTS_DEPART: 2,
    EMPLACEMENTS_MAX: 20,
    EMPLACEMENT: { base: 50, croissance: 125 },
    MATURITE: 15,
    FRUITS: 6,
    PERIODE: 3,
    FENETRE: { debut: { saison: 'ete', dernieresNuits: 5 }, fin: { saison: 'automne' } },
    ARBRES: {
      pommier: { nom: 'Pommier', icone: '🌳', fruit: 'pomme', prix: 40 },
      poirier: { nom: 'Poirier', icone: '🌳', fruit: 'poire', prix: 40 },
    },
  },

  // Réfrigérateur (sections 1.3, 1.4, 6.9 quater et 8.2) : appareil électrique du
  // parc (interrupteur, usure, panne à 100 %), capacité illimitée. Consommation :
  // BASE (Wh/s) + PAR_UNITE (mWh/s) × unités stockées. Au Dormir, BLOC_NUIT_S secondes
  // de consommation sont prélevées d'un bloc. Si le frigo a été alimenté moins de
  // SEUIL_ALIMENTE du temps d'éveil (ou en cas de panne nocturne), chaque lot du
  // frigo perd PERTE_NUITS nuit de conservation.
  FRIGO: {
    CONSTRUCTION: 600,
    BASE_WH_S: 5, // Wh par seconde
    PAR_UNITE_MWH_S: 50, // mWh par seconde et par unité stockée
    BLOC_NUIT_S: 30,
    SEUIL_ALIMENTE: 50, // %
    PERTE_NUITS: 1,
  },

  /* ---------- Lot 9 : autonomie et chapitres ---------- */

  // Autonomie d'une nuit (sections 4 et 8.10) = énergie mangée qui vient de lots
  // d'origine « produit » ÷ besoin de la famille (150), plafonnée à 100 %. Les
  // conserves et les achats du Marché (origine « acheté ») n'y comptent pas.
  // HISTORIQUE_MAX : nombre de nuits gardées dans l'historique ; GRAPHIQUE_NUITS :
  // nuits tracées dans le petit graphique.
  AUTONOMIE: { HISTORIQUE_MAX: 1000, GRAPHIQUE_NUITS: 20 },

  // Campagne en 7 chapitres (sections 4 et 8.10). Un chapitre atteint rend
  // disponibles les éléments de `debloque` ; son objectif rempli, on passe au
  // suivant. Le chapitre 7 rempli termine la campagne : mode libre, tout est
  // débloqué. Un élément absent de tous les chapitres est disponible dès le départ
  // (Potager niveau 1, pompe, panneaux, batteries, Marché).
  //
  // Objectifs (`type`) :
  //   litres    : litres pompés au total ;
  //   wh        : record d'énergie stockée dans les batteries, en Wh ;
  //   carottes  : carottes récoltées au total ;
  //   autonomie : autonomie de la dernière nuit, en % ;
  //   pontes    : nuits de ponte d'affilée (au moins un œuf pondu) ;
  //   sante     : santé moyenne de la famille (un malade compte pour 0) ;
  //   pains     : pains cuits au total (`recette` : la recette qui compte) ;
  //   plats     : plats différents préparés (`exclut` : recettes qui n'en font
  //               pas partie, ici le pain ; les transformations du Moulin et de
  //               la Presse n'en sont jamais) ;
  //   laines    : laines tondues au total ;
  //   hiver     : la `saison` entière (LONGUEUR nuits) traversée avec au moins
  //               `moyenne` % d'autonomie en moyenne, sans payer de soin ;
  //   serie100  : nuits d'affilée à 100 % d'autonomie.
  // Version 1.3 : le courrier. Une lettre arrive une seule fois, quand sa
  // condition est remplie (`quand.debloque` : un élément que la campagne vient
  // d'ouvrir, voir isUnlocked()). Ses cadeaux vont tout de suite dans
  // l'inventaire ; la lettre se lit dans l'onglet Notifications.
  // Le texte ne cite aucun prénom : il vaut pour toutes les familles.
  COURRIER: {
    cousin_venezuela: {
      quand: { debloque: 'serre' },
      cadeaux: { cacao: 1, vanille: 1, cafe: 1 },
      icone: '✉️',
      objet: 'Une lettre du Venezuela',
      expediteur: 'Cousin Mateo',
      lieu: 'Mérida, Venezuela',
      texte: [
        'Chère famille,',
        'La nouvelle a traversé l\'océan : il paraît que vous allez avoir une serre ! Ici, dans les montagnes de Mérida, on en a parlé toute la soirée sous la véranda.',
        'Alors j\'ai glissé dans l\'enveloppe trois petits trésors de chez nous : une fève de cacao, une gousse de vanille et un grain de café. Dehors, chez vous, ils auraient trop froid. Mais bien à l\'abri dans la serre, avec de l\'eau et de la patience, ils pousseront comme ici.',
        'Un conseil de planteur : à chaque récolte, gardez toujours de quoi replanter. La vanille est la plus lente, ne vous découragez pas.',
        'Écrivez-moi le jour où vous boirez votre premier chocolat chaud. Je vous embrasse tous, et une caresse aux bêtes.',
      ],
      signature: 'Votre cousin Mateo',
    },
  },

  CHAPITRES: {
    // Les séries d'affilée (« pontes », « serie100 ») et le suivi de l'hiver ne se
    // comptent qu'à partir du chapitre qui porte l'objectif : les nuits d'avant
    // ne comptent pas.
    // Libellé des éléments débloqués (écran de fin de chapitre et Ferme).
    ELEMENTS: {
      // 'champ' : identifiant historique (l'ancien bâtiment Champ). Il ouvre
      // désormais les cultures de plein champ dans la Zone de culture.
      champ:      { nom: 'Cultures de plein champ', icone: '🌾', note: 'blé pour les poules et la farine' },
      silo:       { nom: 'Silo', icone: '🛖', note: 'stock de blé' },
      poulailler: { nom: 'Poulailler', icone: '🐔', note: 'poules et œufs (les poules s\'achètent au Marché)' },
      four:       { nom: 'Four', icone: '🔥', note: 'pain, gratin, tarte, et l\'onglet Livre de recette' },
      cuisine:    { nom: 'Cuisine', icone: '🍳', note: 'omelette, ratatouille, compote, soupe' },
      moulin:     { nom: 'Moulin', icone: '⚙️', note: 'farine, et paille pour les moutons et les vaches' },
      presse:     { nom: 'Presse', icone: '🌻', note: 'huile de tournesol' },
      tournesol:  { nom: 'Tournesol', icone: '🌻', note: 'nouvelle culture de plein champ' },
      // 'paturage' et 'moutons' : identifiants historiques (l'ancien Pâturage).
      paturage:   { nom: 'Étable', icone: '🐑', note: 'des places pour les moutons et les vaches' },
      moutons:    { nom: 'Moutons et vaches', icone: '🧶', note: 'la laine des moutons, le lait des vaches ; ils mangent la paille du Moulin' },
      serre:      { nom: 'Serre', icone: '🏡', note: 'des légumes toute l\'année' },
      verger:     { nom: 'Verger', icone: '🌳', note: 'pommiers et poiriers' },
      frigo:      { nom: 'Réfrigérateur', icone: '🧊', note: 'conservation sans péremption' },
    },
    liste: [
      {
        titre: 'L\'eau et le soleil', icone: '💧',
        intro: 'Pompe de l\'eau et range de l\'énergie dans tes batteries : ce sont les deux ressources de la ferme. Tes conserves nourrissent la famille pour l\'instant.',
        debloque: [],
        objectifs: [
          { type: 'litres', cible: 50, libelle: 'Pomper 50 L au total', unite: 'L' },
          { type: 'wh', cible: 3000, libelle: 'Stocker 3 000 Wh dans les batteries', unite: 'Wh' },
        ],
      },
      {
        titre: 'Le premier potager', icone: '🥕',
        intro: 'Plante, arrose, récolte : ta première production doit commencer à nourrir la famille.',
        debloque: [],
        objectifs: [
          { type: 'carottes', cible: 20, libelle: 'Récolter 20 carottes', unite: '' },
          { type: 'autonomie', cible: 25, libelle: 'Atteindre 25 % d\'autonomie', unite: '%' },
        ],
      },
      {
        titre: 'Le poulailler', icone: '🐔',
        intro: 'Du blé pour les poules, des œufs chaque nuit. Une ponte régulière demande du blé et une famille en bonne santé.',
        debloque: ['champ', 'silo', 'poulailler'],
        objectifs: [
          { type: 'pontes', cible: 7, libelle: 'Pondre 7 nuits d\'affilée', unite: 'nuits' },
          { type: 'sante', cible: 80, libelle: 'Santé moyenne d\'au moins 80', unite: '' },
        ],
      },
      {
        titre: 'Le four et le livre de recette', icone: '🍞',
        intro: 'Moudre, presser, cuire : le pain et les plats cuisinés valent plus que leurs ingrédients.',
        debloque: ['four', 'cuisine', 'moulin', 'presse', 'tournesol'],
        objectifs: [
          { type: 'pains', cible: 5, recette: 'pain', libelle: 'Cuire 5 pains', unite: '' },
          { type: 'plats', cible: 3, exclut: ['pain'], libelle: 'Préparer 3 plats différents (hors pain)', unite: '' },
        ],
      },
      {
        titre: 'Le troupeau', icone: '🐑',
        intro: 'Des moutons pour la laine, des vaches pour le lait. Ils vivent à l\'Étable et mangent chaque nuit la paille que donne le Moulin.',
        debloque: ['paturage', 'moutons'],
        objectifs: [
          { type: 'laines', cible: 10, libelle: 'Tondre 10 laines', unite: '' },
          { type: 'autonomie', cible: 60, libelle: 'Atteindre 60 % d\'autonomie', unite: '%' },
        ],
      },
      {
        titre: 'Toute l\'année', icone: '❄️',
        intro: 'La Serre, le Verger et le Réfrigérateur pour tenir un hiver entier sans acheter de soins. Il faut être là dès la première nuit de l\'hiver.',
        debloque: ['serre', 'verger', 'frigo'],
        objectifs: [
          { type: 'hiver', cible: 1, saison: 'hiver', moyenne: 80, libelle: 'Traverser un hiver complet à 80 % d\'autonomie en moyenne, sans payer de soin', unite: '' },
        ],
      },
      {
        titre: 'Famille autonome', icone: '🏡',
        intro: 'Le dernier défi : nourrir la famille avec ce que produit la ferme, et rien d\'autre.',
        debloque: [],
        objectifs: [
          { type: 'serie100', cible: 7, libelle: 'Atteindre 100 % d\'autonomie 7 nuits d\'affilée', unite: 'nuits' },
        ],
      },
    ],
  },

  /* ---------- Lot 10 : simulation d'un joueur automatique ---------- */

  // Réglages du joueur automatique (scripts/simulate.mjs et bouton du mode test) :
  // ce ne sont pas des règles du jeu, mais ce que le joueur simulé vise ou garde.
  // Les jalons et les seuils des vérifications (sections 8.10 et 8.11) sont ici aussi.
  SIMULATION: {
    NUITS: 80,
    GRAINE: 1,
    PAS_S: 5, // secondes simulées entre deux séries d'actions du joueur
    LISSAGE: 7, // nuits de la moyenne mobile qui sert à dater un jalon d'autonomie
    STRATEGIES: {
      applique: { nom: 'Joueur appliqué', eveilS: 60 },
      minimal: { nom: 'Joueur minimal', eveilS: 30 },
    },
    // Ce que le joueur garde ou vise.
    CAISSE: 20, // pièces gardées en réserve (graines, blé, soins) : les achats du plan ne les touchent pas
    CONSERVES_GARDEES: 96, // il ne vend des conserves que pour payer un achat, jamais sous ce stock
    PRIX_GRAINE_MAX: 4, // prix maximal d'une graine (ou d'un blé) achetée au Marché
    ETALEMENT_JOURS: 1, // les semis d'un lieu s'étalent sur ce nombre de jours (1 : on replante dès la récolte)
    GRAINES_CAROTTE: 6, // sous ce stock, une carotte mûre monte en graine
    // Part (en %) des parcelles de la Zone de culture que le joueur réserve aux
    // cultures de plein champ (blé, tournesol) dès qu'elles sont débloquées : à
    // peu près ce que le Champ représentait (4 parcelles sur 13 au début, 16 sur
    // 36 à la fin). Zone de 12 / 18 / 24 / 30 parcelles : 4 / 7 / 9 / 12.
    PART_PLEIN_CHAMP: 40,
    PARCELLES_TOURNESOL: 1, // parcelles de plein champ en tournesol quand la Presse existe
    BLE_JOURS_GARDES: 3, // nuits de blé des poules qu'on ne moud pas
    BLE_MAX: 40, // blé en stock au-delà duquel on vend
    STOCK_FARINE: 4, // farine en réserve qu'on cherche à avoir
    STOCK_HUILE: 2,
    PAILLE_NUITS: 3, // nuits de paille d'avance que le joueur moud pour ses moutons et ses vaches
    PAILLE_MAX_NUITS: 6, // au-delà de ce nombre de nuits d'avance, il vend la paille en trop
    FARINE_MAX: 12, // farine en stock au-delà de laquelle il vend (moudre pour la paille en donne beaucoup)
    // Estimations pour dimensionner l'eau et l'énergie.
    LITRES_PARCELLE: 3,
    LITRES_CUISINE: 6,
    MARCHE_STATIONS: 50, // % du temps d'éveil où le Moulin et la Presse tournent
    MARGE_EAU: 90, // %
    MARGE_ENERGIE: 150, // %
    MARGE_BATTERIE: 70, // %
    // Achats : d'abord ce qui fait avancer le chapitre en cours, puis le plan général.
    // Un élément pas encore débloqué par un chapitre est sauté.
    PRIORITE: {
      1: [],
      2: [{ type: 'potager', niveau: 2 }],
      3: [{ type: 'poulailler', niveau: 1 }, { type: 'silo', niveau: 1 }, { type: 'poules', n: 4 }],
      4: [{ type: 'station', id: 'four' }, { type: 'station', id: 'moulin' }, { type: 'station', id: 'presse' }, { type: 'station', id: 'cuisine' }],
      // le Moulin d'abord : sans lui pas de paille, donc ni laine ni lait
      5: [{ type: 'station', id: 'moulin' }, { type: 'paturage' }, { type: 'moutons', n: 3 }],
      6: [{ type: 'serre', niveau: 1 }, { type: 'verger' }, { type: 'arbres', n: 2 }, { type: 'frigo' }],
      7: [],
    },
    PLAN: [
      { type: 'potager', niveau: 2 },
      { type: 'poulailler', niveau: 1 }, { type: 'silo', niveau: 1 }, { type: 'poules', n: 4 },
      { type: 'potager', niveau: 3 },
      { type: 'poulailler', niveau: 2 }, { type: 'poules', n: 8 }, { type: 'silo', niveau: 2 },
      { type: 'station', id: 'four' }, { type: 'station', id: 'moulin' }, { type: 'station', id: 'presse' }, { type: 'station', id: 'cuisine' },
      // arbre v2 : premiers pas (palier 1), puis l'automatisation (palier 3)
      { type: 'tech', id: 'cu_outils' }, { type: 'pompe', niveau: 2 }, { type: 'tech', id: 'ea_econome' },
      { type: 'pompe', niveau: 3 }, { type: 'tech', id: 'ea_irrigation' },
      { type: 'poulailler', niveau: 3 }, { type: 'tech', id: 'el_mangeoire' },
      { type: 'potager', niveau: 4 }, { type: 'tech', id: 'cu_recolte_auto' },
      { type: 'tech', id: 'cui_boulangerie' }, { type: 'tech', id: 'prepa_1' },
      { type: 'paturage' }, { type: 'moutons', n: 3 },
      { type: 'poules', n: 12 },
      { type: 'verger' }, { type: 'arbres', n: 2 }, { type: 'serre', niveau: 1 }, { type: 'frigo' },
      { type: 'tech', id: 'semis_auto' }, { type: 'tech', id: 'cui_laiterie' }, { type: 'tech', id: 'el_tonte' },
      { type: 'potager', niveau: 5 },
      { type: 'arbres', n: 4 }, { type: 'moutons', n: 6 },
      { type: 'poules', n: 16 }, { type: 'serre', niveau: 2 }, { type: 'serre', niveau: 3 },
    ],
    // Vérifications de la section 8.10 : jalons d'autonomie (nuit visée, % visé) et tolérance en nuits.
    JALONS: [
      { nuit: 8, pct: 35 },
      { nuit: 15, pct: 50 },
      { nuit: 25, pct: 75 },
      { nuit: 40, pct: 90 },
      { nuit: 60, pct: 100 },
    ],
    TOLERANCE_NUITS: 10,
    // Vérification de la section 8.11 : une unité de cet aliment achetée chaque nuit, encore payable à la nuit donnée.
    DEPANNAGE: { item: 'carotte', nuit: 30 },
  },

  /* ---------- Lot 11 : hors-ligne et première partie ---------- */

  // Progression hors-ligne (section 6.10). Le temps passé loin du jeu (page
  // fermée, ou onglet resté en arrière-plan) est simulé au retour, plafonné à
  // MAX_S secondes, par pas de PAS_S secondes. Seuls avancent les flux (panneaux
  // et batteries, pompe, moulin, presse, consommation du réfrigérateur) et les
  // préparations en cours ; aucune nuit ne passe. Ce temps compte comme temps
  // d'éveil. USURE : les appareils s'usent-ils hors-ligne ? Non (décision du
  // Lot 11 : 8 h réelles valent 960 heures de jeu, soit +480 points d'usure).
  // ECRAN_S : absence minimale, en secondes, pour afficher « Pendant votre absence… ».
  HORS_LIGNE: { MAX_S: 8 * 3600, PAS_S: 5, USURE: false, ECRAN_S: 60 },
  // Résumé de réveil allégé : nombre maximal de produits listés dans « Récolte » (le reste va dans « Voir plus »).
  REVEIL: { RECOLTE_MAX: 5 },

  // Première partie : bulles d'aide, dans cet ordre. La dernière (« dormir »)
  // se ferme aussi d'elle-même à la première nuit.
  AIDE: { ETAPES: ['eau', 'potager', 'dormir'] },
};

// Lot 12 (doublement des prix de vente des productions de la ferme) : les
// objets concernés (récolte d'une culture, fruit du Verger, produit animal)
// se déduisent des tables existantes plutôt que d'une liste écrite en dur,
// pour qu'une nouvelle culture, un nouvel arbre ou un nouvel animal ajouté
// plus tard à DATA.crops / DATA.VERGER.ARBRES / DATA.ANIMAUX soit couvert
// automatiquement, sans exception dispersée dans le code :
// - DATA.crops : l'objet réellement récolté par chaque culture (`produit`
//   s'il diffère du nom de la culture, sinon la clé de la culture elle-même),
//   en excluant tout objet de catégorie « graine » — le tournesol récolte
//   ainsi `graine_tournesol`, une graine, qui n'est jamais concernée ;
// - DATA.VERGER.ARBRES : le fruit (`fruit`) de chaque arbre ;
// - DATA.ANIMAUX : ce que chaque animal produit régulièrement (`produit` :
//   l'œuf de la poule), tond (`laine`) ou donne au trait (`lait`).
// Un même objet peut apparaître via plusieurs entrées (le blé, à la fois
// récolté et semé) : l'ensemble `keys` déduplique, donc chaque prix n'est
// doublé qu'une seule fois. Les graines dédiées (graine_carotte, etc.), les
// transformations (farine, huile) et les plats cuisinés ne figurent dans
// aucune de ces trois tables : ils restent donc intacts.
function productionItemKeys() {
  const keys = new Set();
  for (const [cropKey, crop] of Object.entries(DATA.crops)) {
    const item = crop.produit || cropKey;
    if (DATA.items[item] && DATA.items[item].category !== 'graine') keys.add(item);
  }
  for (const arbre of Object.values(DATA.VERGER.ARBRES)) {
    if (DATA.items[arbre.fruit]) keys.add(arbre.fruit);
  }
  for (const animal of Object.values(DATA.ANIMAUX)) {
    for (const champ of ['produit', 'laine', 'lait']) {
      if (animal[champ] && DATA.items[animal[champ]]) keys.add(animal[champ]);
    }
  }
  return keys;
}

function applyProductionPriceMultiplier() {
  const mult = DATA.MARCHE.MULTIPLICATEUR_PRODUCTION;
  const keys = productionItemKeys();
  for (const key of DATA.MARCHE.TRANSFORMATIONS_DOUBLEES) keys.add(key);
  for (const key of keys) {
    DATA.items[key].prix *= mult;
  }
}
// Appliqué immédiatement, avant registerDishItems() (plus bas) : les plats
// dont le prix se calcule à partir des prix des ingrédients (omelette, gratin,
// fromage frais, etc.) doivent lire des prix d'ingrédients déjà doublés, une
// seule fois, jamais l'inverse.
applyProductionPriceMultiplier();

// Lot 14 : temps de préparation des plats (voir DATA.RECETTES.DIVISEUR_TEMPS).
// Chaque recette est traitée une seule fois, ce qui rend le résultat stable
// (20 s → 10 s, 15 s → 8 s, 45 s → 23 s, etc.).
function applyDishTimeDivisor() {
  const R = DATA.RECETTES;
  for (const r of Object.values(DATA.recipes)) {
    if (R.STATIONS_TEMPS_DIVISE.includes(r.station)) r.temps = Math.ceil(r.temps / R.DIVISEUR_TEMPS);
  }
}
applyDishTimeDivisor();

/* ==========================================================================
   ENGINE — simulation pure. Aucun accès au DOM, à window, au stockage ou à
   l'horloge : le temps arrive en paramètre (dt, en secondes) et l'aléatoire
   vient exclusivement du générateur à graine stocké dans l'état.
   ========================================================================== */

// Générateur pseudo-aléatoire à graine (mulberry32).
// Renvoie une fonction () => nombre dans [0, 1).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATE_VERSION = 19;
// Version du jeu, affichée dans les Options (À propos).
const GAME_VERSION = '1.3.0';
const EPS = 1e-9; // tolérance de calcul flottant (pas une valeur d'équilibrage)

// Liste des étapes exécutées au clic sur "Dormir", dans l'ordre. Lot 2 :
// repas et santé, puis pousse. Lot 4 : la ponte. Lot 5 : les préparations en
// cours se terminent (après le repas du soir : un plat fini pendant la nuit se
// mange dès le repas suivant). Lot 6, revu en version 1.1 : les moutons et les
// vaches mangent leur paille juste après la ponte (feedLivestock) ; ceux qui ont
// mangé font avancer leur laine ou donnent leur lait. Lot 3 : la péremption, toujours en dernier. Les
// lots suivants insèrent leurs fonctions avant `spoil`. Lot 7 : les
// automatisations du niveau 5 passent juste après le repas, avant la pousse (une
// parcelle arrosée pousse cette nuit) et avant la ponte (une poule nourrie pond).
// Lot 8 : le verger donne ses fruits juste après les moutons ; puis le bloc
// nocturne du réfrigérateur (nightPower), sa panne éventuelle (fridgeNight) et
// enfin la péremption. Les préparations en cours se terminent avant le frigo :
// la paille du blé qui finit de se moudre pendant la nuit sert donc à partir
// de la nuit suivante.
// Chaque étape reçoit l'état et le modifie.
const NIGHT_STEPS = [feedFamily, rainNight, autoTasks, growAll, layEggs, feedLivestock, growOrchard, finishPreparations, autoMaintain, nightPower, fridgeNight, spoil];

/* ---------- Lot 8 : saisons ---------- */

// Indice de saison (0 à 3) d'une nuit : nuits 1 à 10 printemps, 11 à 20 été,
// 21 à 30 automne, 31 à 40 hiver, puis retour au printemps à la nuit 41.
function seasonIndex(day) {
  const S = DATA.SAISONS;
  return Math.floor((Math.max(1, day) - 1) / S.LONGUEUR) % S.ORDRE.length;
}

// Identifiant de la saison de la nuit courante ('printemps', 'ete', ...).
function currentSeason(state) {
  return DATA.SAISONS.ORDRE[seasonIndex(state.day)];
}

// Numéro de la nuit dans la saison (1 à LONGUEUR).
function seasonNight(state) {
  return ((Math.max(1, state.day) - 1) % DATA.SAISONS.LONGUEUR) + 1;
}

// Numéro de la nuit dans l'année (1 à 40).
function yearNight(day) {
  const S = DATA.SAISONS;
  return ((Math.max(1, day) - 1) % (S.LONGUEUR * S.ORDRE.length)) + 1;
}

// Facteur saisonnier d'un type de calcul : 'solaire', 'potager' ou 'eau'.
// Les calculs existants le multiplient à leur valeur de base.
// Arrondi entier de x × pct ÷ 100 (au plus proche, demi vers le haut).
function roundPct(x, pct) {
  return Math.floor((x * pct + 50) / 100);
}

// Facteur de saison en % (100 = sans effet).
function seasonFactor(state, kind) {
  return DATA.SAISONS.MODS[currentSeason(state)][kind];
}

// Facteur de rendement d'une récolte selon le lieu (1 pour la Serre).
function yieldSeasonFactor(state, lieu) {
  const kind = DATA.SAISONS.RENDEMENT_LIEU[lieu];
  return kind ? seasonFactor(state, kind) : 100;
}

// Facteur d'eau d'un arrosage selon le lieu (1 pour la Serre).
function waterSeasonFactor(state, lieu) {
  return DATA.SAISONS.EAU_LIEUX.includes(lieu) ? seasonFactor(state, 'eau') : 100;
}

/* ---------- Lot 5 : plats cuisinés (objets calculés depuis DATA.recipes) ---------- */

// Les ingrédients d'une recette : un seul objet, ou l'un des objets de `ou`.
function ingredientOptions(ing) {
  return ing.ou || [ing.item];
}

// Somme d'un champ (energie ou prix) des ingrédients d'une recette, eau comprise.
// Pour un ingrédient « l'un ou l'autre », on prend le premier (les valeurs sont égales).
function recipeSum(recipe, field, waterValue) {
  const sum = recipe.ingredients.reduce((t, ing) => t + (DATA.items[ingredientOptions(ing)[0]][field] || 0) * ing.qte, 0);
  return sum + (recipe.eau || 0) * waterValue;
}

// Lot 11 (nutrition) : applique la règle d'arrondi centralisée d'une
// revalorisation nutritionnelle des aliments de base (Math.round, arrondi
// standard au demi supérieur). Utilisée pour dériver DATA.items[*].energie
// (voir commentaires « × 1,25 » sur chaque objet) ; centralisée ici pour que
// toute future revalorisation applique la même règle, plutôt que des arrondis
// ad hoc dispersés dans DATA.
function scaleEnergie(valeurBase, augmentation = DATA.NUTRITION.AUGMENTATION) {
  return roundPct(valeurBase, augmentation);
}

// Énergie d'un plat : somme des ingrédients × 1,3, arrondie (pain 34, omelette 68, ragoût 144),
// sauf si la recette porte un champ energieForcee (override explicite, voir gratin_patates).
function dishEnergy(id) {
  const recipe = DATA.recipes[id];
  if (recipe.energieForcee != null) return recipe.energieForcee;
  const R = DATA.RECETTES;
  return roundPct(recipeSum(recipe, 'energie', R.ENERGIE_EAU), R.COEF_PLAT);
}

// Prix de vente d'un plat : somme des prix × 1,3, arrondi, sauf si la recette
// porte un champ priceMultiplier (override explicite du coefficient, pas de
// la formule elle-même — voir les 4 recettes « luxe » : chocolat chaud, café,
// crème à la vanille, bière artisanale, toutes à ×3 au lieu de ×1,3).
function dishPrice(id) {
  const recipe = DATA.recipes[id];
  const R = DATA.RECETTES;
  const coef = recipe.priceMultiplier != null ? recipe.priceMultiplier : R.COEF_PLAT;
  return roundPct(recipeSum(recipe, 'prix', R.PRIX_EAU), coef);
}

// Ajoute chaque plat à DATA.items (énergie et prix calculés). Ils se gardent
// 6 nuits (catégorie « plat »), sauf le pain (7 nuits, voir CONSERVATION).
// Les plats retirés du livre (DATA.PLATS_RETIRES) restent des plats, à valeurs
// fixes, pour les sauvegardes qui en ont encore : ils ne s'achètent pas.
function registerDishItems() {
  for (const [id, r] of Object.entries(DATA.recipes)) {
    if (r.transformation) continue;
    DATA.items[id] = { nom: r.nom, icone: r.icone, energie: dishEnergy(id), prix: dishPrice(id), edible: true, category: 'plat', plat: true };
  }
  for (const [id, p] of Object.entries(DATA.PLATS_RETIRES)) {
    DATA.items[id] = { nom: p.nom, icone: p.icone, energie: p.energie, prix: p.prix, edible: true, category: 'plat', plat: true, rachetable: false, retire: true };
  }
}
registerDishItems();

// Objet rendu par une recette et quantité rendue.
function recipeOutput(id) {
  return DATA.recipes[id].sortie || id;
}

function recipeOutputQty(id) {
  return DATA.recipes[id].qteSortie || 1;
}

/* ---------- appareils : fabrication et sélecteurs ---------- */

function newDayStats() {
  // produite, perdue : mWh ; eau : mL pompés ; ble : blé mangé par les poules
  // pendant la journée (Lot 4) ; soins : soins payés pendant la journée (Lot 9).
  return { produite: 0, perdue: 0, eau: 0, ble: 0, soins: 0 };
}

// Unités entières du moteur : le temps en ms, l'énergie en mWh, l'eau en mL.
// Une quantité par seconde (mWh/s, mL/s) × une durée en ms → ⌊taux × ms ÷ 1 000⌋.
function perTick(rate, dtMs) {
  return Math.floor((rate * dtMs) / 1000);
}

// Taux par seconde (arrondi vers le bas) d'une quantité écoulée en `dtMs` ms.
function perSecond(amount, dtMs) {
  return dtMs > 0 ? Math.floor((amount * 1000) / dtMs) : 0;
}

function makeDevice(type, id, prix) {
  // usure : points entiers ; usureMs : temps de marche (ms) depuis le dernier point.
  const d = { id, type, niveau: 1, allume: true, usure: 0, usureMs: 0, prix };
  if (type === 'batterie') {
    d.chargeMwh = 0;
    d.entree = 0; // mWh/s reçus au dernier tick
    d.sortie = 0; // mWh/s soutirés au dernier tick
  } else if (type === 'panneau') {
    d.prod = 0; // mWh/s produits au dernier tick
  } else if (type === 'pompe') {
    d.debit = 0; // mL/s réellement pompés au dernier tick
    d.conso = 0; // mWh/s consommés au dernier tick
  } else if (type === 'moulin' || type === 'presse' || type === 'frigo') {
    d.conso = 0; // mWh/s consommés au dernier tick (0 en pause ou au repos)
  }
  return d;
}

// Appareils des stations électriques déjà construites (Moulin, Presse).
function stationDevices(state) {
  if (!state.stations) return [];
  return Object.keys(DATA.STATIONS)
    .filter((id) => DATA.STATIONS[id].electrique && state.stations[id] && state.stations[id].appareil)
    .map((id) => state.stations[id].appareil);
}

// Parc et réserves de départ : 1 panneau, 1 batterie, la pompe et le réservoir.
// Les appareils sont des listes d'objets ; la pompe est un appareil unique ;
// le réservoir n'est pas un appareil (`eauMl` = son contenu en mL).
function startFarm() {
  const prix = DATA.START.DEVICE_PRICE;
  return {
    compteurs: { panneau: 1, batterie: 1 },
    panneaux: [makeDevice('panneau', 'panneau-1', prix)],
    batteries: [makeDevice('batterie', 'batterie-1', prix)],
    pompe: makeDevice('pompe', 'pompe', prix),
    eauMl: 0,
    flux: { perdue: 0, eau: 0 }, // mWh/s perdus, mL/s reçus par le réservoir au dernier tick
    jour: newDayStats(),
    report: null,
  };
}

// Lot 8 : le réfrigérateur est un appareil du parc une fois construit.
function fridgeDevices(state) {
  return state.frigo && state.frigo.construit && state.frigo.appareil ? [state.frigo.appareil] : [];
}

function allDevices(state) {
  return [...state.panneaux, ...state.batteries, state.pompe, ...stationDevices(state), ...fridgeDevices(state)];
}

function findDevice(state, id) {
  return allDevices(state).find((d) => d.id === id) || null;
}

// Rendement d'un appareil en % entier : 100 − ⌊usure ÷ 2⌋.
function efficiency(d) {
  return 100 - Math.floor((d.usure * 100) / DATA.WEAR.EFFICIENCY_DIVISOR);
}

function isBroken(d) {
  return d.usure >= DATA.WEAR.BREAKDOWN;
}

function needsService(d) {
  return !isBroken(d) && d.usure >= DATA.WEAR.SERVICE_THRESHOLD;
}

// Production d'un panneau à son niveau et son usure actuels (mWh/s entiers).
// Lot 8 : avec `state`, le facteur solaire de la saison s'y applique.
function panelOutput(d, state) {
  const base = Math.floor((DATA.GRID.panneau.whParS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
  return state ? Math.floor((base * solarFactor(state)) / 100) : base;
}

// Facteur solaire de la saison (%) ; les Panneaux orientables relèvent l'hiver.
function solarFactor(state) {
  const f = seasonFactor(state, 'solaire');
  const hiver = currentSeason(state) === 'hiver' ? techFlag(state, 'solaireHiver') : null;
  return hiver ? Math.max(f, hiver) : f;
}

// Capacité utile d'une batterie (mWh) : capacité(niveau) × rendement.
function batteryCapacity(d) {
  return Math.floor((DATA.GRID.batterie.wh[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Débit de la pompe (mL/s) selon son niveau et son rendement.
function pumpFlow(d) {
  return Math.floor((DATA.GRID.pompe.litresPerS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Capacité du réservoir (mL).
function tankCapacity(state) {
  return DATA.GRID.pompe.reservoirL[state.pompe.niveau - 1] * 1000;
}

// Prix du n-ième appareil d'un type, n étant le nombre déjà possédé.
function purchasePrice(type, owned) {
  const p = DATA.PURCHASE[type];
  return growthPrice(p.base, p.growth, owned);
}

function nextPurchasePrice(state, type) {
  const owned = type === 'panneau' ? state.panneaux.length : state.batteries.length;
  return purchasePrice(type, owned);
}

function maintainCost(d) {
  return percentCeil(d.prix, DATA.WEAR.MAINTAIN_RATE);
}

function repairCost(d) {
  return percentCeil(d.prix, DATA.WEAR.REPAIR_RATE);
}

// Le Moulin et la Presse n'ont pas de niveaux : pas d'amélioration (null).
function upgradeCost(d) {
  if (!DATA.GRID[d.type]) return null;
  return d.niveau >= DATA.LEVEL_MAX ? null : DATA.UPGRADE_COST[d.niveau];
}

// Pièces entières : tout prix calculé est arrondi à l'entier supérieur.
// percentCeil(x, p) = ⌈x × p ÷ 100⌉, en arithmétique entière.
function percentCeil(x, pct) {
  const num = BigInt(Math.round(x)) * BigInt(Math.round(pct));
  return Number((num + 99n) / 100n);
}

// Prix croissant : ⌈base × (pct ÷ 100)^n⌉, calculé exactement en entiers
// (BigInt) pour éviter toute dérive des puissances décimales.
function growthPrice(base, pct, n) {
  const k = Math.max(0, Math.floor(n));
  const num = BigInt(Math.round(base)) * BigInt(Math.round(pct)) ** BigInt(k);
  const den = 100n ** BigInt(k);
  return Number((num + den - 1n) / den);
}

/* ---------- l'heure ---------- */

// Éveil minimal avant de dormir : celui de départ, ou le plus bas des paliers
// « Réveil matinal » acquis (Lot 7).
function awakeRequired(state) {
  let required = DATA.TIME.MIN_AWAKE_S;
  for (const id of ownedTechs(state)) {
    const e = DATA.techtree.noeuds[id].effet;
    if (e && e.eveilMin !== undefined) required = Math.min(required, e.eveilMin);
  }
  return required;
}

// Heure de la journée (0 à 23) : 6 h au réveil, +1 heure toutes les
// CLOCK_SECONDS_PER_HOUR secondes d'éveil (18 s). À 19 h la famille prend son
// repas (mealDue / takeMeal) ; à 22 h la nuit se déroule d'elle-même
// (bedtimeDue : c'est l'interface qui lance sleep(), jeu ouvert). Si rien ne
// la lance, l'horloge repasse à 0 h et continue. (L'usure des appareils a sa
// propre « heure de marche », SECONDS_PER_HOUR : voir wearStep().)
function hourOfDay(state) {
  const hours = Math.floor(state.awakeMs / (DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000));
  return (DATA.TIME.DAY_START_HOUR + hours) % 24;
}

// La même heure avec sa partie décimale, dans [0, 24) : 6,5 pour 6 h 30. Sert à
// dessiner l'horloge et la lumière du jour sans à-coups.
function clockHours(state) {
  const ms = Math.max(0, Number(state.awakeMs) || 0);
  const perDay = 24 * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  const h = DATA.TIME.DAY_START_HOUR + (ms % perDay) / (DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000);
  return h >= 24 ? h - 24 : h;
}

// Temps d'éveil (ms) auquel l'horloge marque `hour` heures (19 h → 65 000 ms).
function awakeMsAtHour(hour) {
  return (hour - DATA.TIME.DAY_START_HOUR) * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
}

// Version 1.1.1 : le repas de 19 h est-il à prendre maintenant ? (pas encore
// pris aujourd'hui, et l'horloge a atteint MEAL_HOUR)
function mealDue(state) {
  return !state.repas && state.awakeMs >= awakeMsAtHour(DATA.TIME.MEAL_HOUR);
}

// L'heure du coucher (NIGHT_HOUR, 22 h) est-elle passée sans que personne n'ait
// dormi ? L'interface lance alors
// la nuit (sleep()) : repas s'il n'a pas été pris, puis les étapes habituelles.
function bedtimeDue(state) {
  return state.awakeMs >= awakeMsAtHour(DATA.TIME.NIGHT_HOUR);
}

/* ---------- énergie : stockage et prélèvement ---------- */

// Range `energy` mWh dans les batteries allumées et non en panne, l'une après
// l'autre dans l'ordre de la liste. Renvoie ce qui n'a rentré nulle part.
function storeEnergy(state, energy) {
  let rest = energy;
  for (const b of state.batteries) {
    if (rest <= 0) break;
    if (!b.allume || isBroken(b)) continue;
    const room = Math.max(0, batteryCapacity(b) - b.chargeMwh);
    const added = Math.min(room, rest);
    if (added > 0) {
      b.chargeMwh += added;
      b.entree += added;
      rest -= added;
    }
  }
  return Math.max(0, rest);
}

// Prélève jusqu'à `energy` mWh dans les batteries, en sens inverse de la liste :
// la dernière remplie se vide la première. Renvoie l'énergie réellement fournie.
// Tous les consommateurs (pompe, puis moulin, presse, réfrigérateur) passent ici.
function drawEnergy(state, energy) {
  let rest = energy;
  for (let i = state.batteries.length - 1; i >= 0; i--) {
    if (rest <= 0) break;
    const b = state.batteries[i];
    if (!b.allume || isBroken(b)) continue;
    const taken = Math.min(b.chargeMwh, rest);
    if (taken > 0) {
      b.chargeMwh -= taken;
      b.sortie += taken;
      rest -= taken;
    }
  }
  return energy - Math.max(0, rest);
}

// Consommateurs d'énergie, exécutés dans l'ordre à chaque tick. Les lots
// suivants y ajouteront le moulin, la presse et le réfrigérateur.
// `run(state, dtMs)` prélève son énergie avec drawEnergy().
const CONSUMERS = [
  // Lot 8 : le frigo est une charge permanente, servie avant les autres pour que
  // la nourriture passe avant l'eau et les transformations.
  { id: 'frigo', run: runFridge },
  { id: 'pompe', run: runPump },
  { id: 'moulin', run: (state, dtMs) => runElectricStation(state, 'moulin', dtMs) },
  { id: 'presse', run: (state, dtMs) => runElectricStation(state, 'presse', dtMs) },
];

// Arbre v2 (Délestage intelligent) : sous le seuil de charge totale, la pompe,
// le Moulin et la Presse se mettent en pause pour garder le froid du frigo.
function loadShedding(state) {
  const d = techFlag(state, 'delestage');
  if (!d) return false;
  const cap = state.batteries.reduce((t, b) => (b.allume && !isBroken(b) ? t + batteryCapacity(b) : t), 0);
  return cap > 0 && availableEnergy(state) * 100 < cap * d.seuil;
}

// La pompe remplit le réservoir si elle est allumée, en état, et que le
// réservoir n'est pas plein. Si l'énergie manque, elle tourne au prorata
// (au mL près : chaque mL coûte WH_PAR_L mWh).
function runPump(state, dtMs) {
  const p = state.pompe;
  p.debit = 0;
  p.conso = 0;
  if (!p.allume || isBroken(p)) return;
  const room = tankCapacity(state) - state.eauMl;
  if (room <= 0) return;
  if (loadShedding(state)) return; // arbre v2 : délestage
  // mWh par mL × % (Pompe à haut rendement) : le coût d'un lot de mL est arrondi vers le haut.
  const kPct = DATA.PUMP.WH_PAR_L * techPct(state, 'whParLitre');
  const wanted = Math.min(perTick(pumpFlow(p), dtMs), room);
  const ml = Math.min(wanted, Math.floor((availableEnergy(state) * 100) / kPct));
  if (ml <= 0) return;
  const got = drawEnergy(state, Math.ceil((ml * kPct) / 100));
  state.eauMl += ml;
  state.jour.eau += ml;
  bumpCounter(state, 'eauMl', ml); // Lot 9
  p.debit = perSecond(ml, dtMs);
  p.conso = perSecond(got, dtMs);
  state.flux.eau = p.debit;
}

/* ---------- la boucle de simulation ---------- */

// Avance la simulation de dt secondes (converties en ms entières) : flux
// (production, stockage, consommation, préparations), usure, puis le temps d'éveil.
// Lot 11 : les trois phases sont séparées pour que la progression hors-ligne
// réutilise exactement les mêmes flux, sans l'usure (voir simulateOffline).
// Version 1.1.1 : `horlogeArretee` (le joueur lit le résumé du réveil) : tout
// continue de tourner, mais l'heure n'avance pas ; la journée commence quand il
// ferme le résumé.
function tick(state, dt, horlogeArretee = false) {
  const dtMs = Math.round((Number(dt) || 0) * 1000);
  if (!(dtMs > 0)) return state;
  flowStep(state, dtMs);
  wearStep(state, dtMs);

  // e. temps d'éveil (l'heure s'en déduit)
  if (!horlogeArretee) state.awakeMs += dtMs;
  refreshUnlocks(state); // Lot 7 : l'arbre des technologies s'ouvre à 100 pièces
  noteEnergyRecord(state); // Lot 9 : record d'énergie stockée, puis objectifs du chapitre
  updateChapters(state);
  return state;
}

// Phases a à c de tick : production, stockage, consommateurs, Four et Cuisine.
// Les quantités du pas (mWh) deviennent des puissances (mWh/s) pour l'affichage.
function flowStep(state, dtMs) {
  for (const b of state.batteries) {
    b.entree = 0;
    b.sortie = 0;
  }
  state.flux.eau = 0;

  // a. production : chaque panneau allumé et non en panne
  let produced = 0;
  for (const p of state.panneaux) {
    p.prod = 0;
    if (p.allume && !isBroken(p)) {
      const e = perTick(panelOutput(p, state), dtMs);
      produced += e;
      p.prod = perSecond(e, dtMs);
    }
  }

  // b. stockage : batteries remplies l'une après l'autre ; le reste est perdu
  const lost = storeEnergy(state, produced);
  state.jour.produite += produced;
  state.jour.perdue += lost;
  state.flux.perdue = perSecond(lost, dtMs);

  // c. consommation : chaque consommateur tire sur les batteries (sens inverse)
  for (const c of CONSUMERS) c.run(state, dtMs);

  // c bis. Lot 5 : le Four et la Cuisine n'ont pas besoin d'électricité
  runCooking(state, dtMs);

  // les quantités du tick deviennent des puissances (mWh/s)
  for (const b of state.batteries) {
    b.entree = perSecond(b.entree, dtMs);
    b.sortie = perSecond(b.sortie, dtMs);
  }
}

// Phase d de tick : l'usure, seulement pour un appareil qui a réellement
// fonctionné pendant le pas (d'après les puissances laissées par flowStep).
function wearStep(state, dtMs) {
  // Arbre v2 (Entretien préventif) : usure à 75 % → un point demande plus de marche.
  const msParPoint = Math.floor((DATA.WEAR.HEURES_PAR_POINT * DATA.TIME.SECONDS_PER_HOUR * 1000 * 100) / techPct(state, 'usure'));
  for (const d of allDevices(state)) {
    let worked = false;
    if (d.type === 'panneau') worked = d.prod > 0;
    else if (d.type === 'batterie') worked = d.entree > 0 || d.sortie > 0;
    else if (d.type === 'pompe') worked = d.debit > 0;
    else if (d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo') worked = d.conso > 0; // Lots 5 et 8 : il tourne vraiment
    if (!worked) continue;
    d.usureMs = (d.usureMs || 0) + dtMs;
    const points = Math.floor(d.usureMs / msParPoint);
    d.usureMs -= points * msParPoint;
    d.usure = Math.min(DATA.WEAR.BREAKDOWN, d.usure + points);
    if (isBroken(d)) {
      d.usure = DATA.WEAR.BREAKDOWN;
      d.allume = false;
    }
  }
}

/* ---------- synthèses pour l'interface (fonctions pures) ---------- */

function energyStats(state) {
  const producing = state.panneaux.filter((p) => p.allume && !isBroken(p));
  const s = {
    production: state.panneaux.reduce((t, p) => t + p.prod, 0),
    panneauxEnMarche: producing.length,
    panneauxTotal: state.panneaux.length,
    panneauxAEntretenir: state.panneaux.filter(needsService).length,
    panneauxEnPanne: state.panneaux.filter(isBroken).length,
    charge: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
    entree: state.batteries.reduce((t, b) => t + b.entree, 0),
    sortie: state.batteries.reduce((t, b) => t + b.sortie, 0),
    batteriesAEntretenir: state.batteries.filter(needsService).length,
    batteriesEnPanne: state.batteries.filter(isBroken).length,
  };
  s.net = s.entree - s.sortie;
  return s;
}

// État affichable d'un appareil : { code, label, badge }.
function deviceStatus(state, d) {
  let code;
  let label;
  if (isBroken(d)) {
    code = 'panne';
    label = 'En panne';
  } else if (!d.allume) {
    code = 'arret';
    label = 'À l\'arrêt';
  } else if (d.type === 'panneau') {
    code = 'marche';
    label = 'En marche';
  } else if (d.type === 'batterie') {
    const net = d.entree - d.sortie;
    if (net < 0) { code = 'decharge'; label = 'En décharge'; }
    else if (net > 0) { code = 'charge'; label = 'En charge'; }
    else if (d.chargeMwh * 100 >= batteryCapacity(d) * DATA.GRID.batterie.pleine) { code = 'pleine'; label = 'Pleine'; }
    else if (d.chargeMwh <= 0) { code = 'vide'; label = 'Vide'; }
    else { code = 'attente'; label = 'En attente'; }
  } else if (d.type === 'frigo') {
    if (state.frigo.alimente) { code = 'marche'; label = 'Alimenté'; }
    else { code = 'attente'; label = 'Hors tension'; }
  } else if (d.type === 'moulin' || d.type === 'presse') {
    const job = state.stations[d.type].tache;
    if (!job) { code = 'repos'; label = 'Au repos'; }
    else if (d.conso > 0) { code = 'marche'; label = 'En marche'; }
    else { code = 'attente'; label = 'En pause : énergie manquante'; }
  } else {
    if (state.eauMl >= tankCapacity(state)) { code = 'plein'; label = 'Réservoir plein'; }
    else if (d.debit > 0) { code = 'marche'; label = 'En marche'; }
    else { code = 'attente'; label = 'En attente d\'énergie'; }
  }
  return { code, label, badge: needsService(d) ? 'À entretenir' : '' };
}

/* ---------- actions du moteur ---------- */

function fail(error) {
  return { ok: false, error };
}

function spend(state, cost) {
  state.pieces = Math.round(state.pieces - cost);
}

function toggleDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  d.allume = !d.allume;
  if (!d.allume && (d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo')) d.conso = 0;
  return { ok: true };
}

function buyDevice(state, type) {
  if (type !== 'panneau' && type !== 'batterie') return fail('Type d\'appareil inconnu.');
  const price = nextPurchasePrice(state, type);
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  state.compteurs[type] += 1;
  const d = makeDevice(type, `${type}-${state.compteurs[type]}`, price);
  (type === 'panneau' ? state.panneaux : state.batteries).push(d);
  return { ok: true, device: d, price };
}

function upgradeDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!DATA.GRID[d.type]) return fail('Cet appareil n\'a pas de niveaux.');
  const cost = upgradeCost(d);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.niveau += 1;
  return { ok: true, cost };
}

function maintainDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  if (d.usure <= 0 && !(d.usureMs > 0)) return fail('Cet appareil n\'est pas usé.');
  const cost = maintainCost(d);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.usure = 0;
  d.usureMs = 0;
  return { ok: true, cost };
}

// Une réparation remet l'usure à 0 ; l'appareil reste éteint : c'est au
// joueur de le rallumer.
function repairDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isBroken(d)) return fail('Cet appareil n\'est pas en panne.');
  const cost = repairCost(d);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.usure = 0;
  d.usureMs = 0;
  d.allume = false;
  return { ok: true, cost };
}

/* ---------- Lots 2 et 3 : inventaire par lots ---------- */

// state.inventaire = { item: [ { qty, nightsLeft, origin } ] }, les lots étant
// rangés du plus ancien au plus récent. nightsLeft vaut null pour un item qui
// ne périme pas. origin vaut « produit » ou « acheté ». Tout le reste du code
// passe uniquement par countItem, addItem et takeItem (et par buyItem au
// Marché, qui pose l'origine « acheté »).

// Conservation d'un item en nuits, ou null s'il ne périme jamais.
function shelfLife(item) {
  if (DATA.CONSERVATION[item] !== undefined) return DATA.CONSERVATION[item];
  const def = DATA.items[item];
  if (def && DATA.CONSERVATION_CATEGORIE[def.category] !== undefined) return DATA.CONSERVATION_CATEGORIE[def.category];
  return null;
}

function isPerishable(item) {
  return shelfLife(item) !== null;
}

// Origine d'un lot ajouté sans précision : « produit », sauf les conserves.
function defaultOrigin(item) {
  const def = DATA.items[item];
  const byCategory = def ? DATA.ORIGINE.PAR_CATEGORIE[def.category] : undefined;
  return byCategory || DATA.ORIGINE.PRODUIT;
}

function lotsOf(state, item) {
  const lots = state.inventaire[item];
  return Array.isArray(lots) ? lots : [];
}

// Rang d'un lot pour l'ordre de retrait : moins il lui reste de nuits, plus
// il est « ancien ». Un lot qui ne périme pas passe en dernier.
function lotRank(lot) {
  return lot.nightsLeft === null ? Infinity : lot.nightsLeft;
}

function countItem(state, item) {
  return lotsOf(state, item).reduce((t, lot) => t + lot.qty, 0);
}

// Quantités totales par item : { item: quantité }, sans les items à zéro.
function inventoryCounts(state) {
  const out = {};
  for (const item of Object.keys(state.inventaire)) {
    const n = countItem(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Ajoute un lot à conservation pleine ; il rejoint le lot existant de même
// origine et de même fraîcheur.
function addLot(state, item, qty, origin) {
  // arbre v2 (Cellier) : ce qui périme se garde plus longtemps
  const base = shelfLife(item);
  const nightsLeft = base === null ? null : base + techSum(state, 'conservation');
  const lots = lotsOf(state, item);
  const same = lots.find((l) => l.nightsLeft === nightsLeft && l.origin === origin);
  if (same) {
    same.qty += qty;
  } else {
    lots.push({ qty, nightsLeft, origin });
    lots.sort((a, b) => (lotRank(a) === lotRank(b) ? 0 : lotRank(a) < lotRank(b) ? -1 : 1));
  }
  state.inventaire[item] = lots;
}

function addItem(state, item, qty) {
  if (!DATA.items[item] || !(qty > 0)) return 0;
  addLot(state, item, qty, defaultOrigin(item));
  return qty;
}

// Retire jusqu'à `qty` unités, toujours dans le lot le plus ancien, et renvoie
// le nombre réellement retiré. Lot 9 : si `out` est un tableau, il reçoit les
// morceaux retirés { qty, origin } (l'autonomie compte l'origine des repas).
function takeItem(state, item, qty, out = null) {
  const n = Math.min(countItem(state, item), qty);
  if (!(n > 0)) return 0;
  let rest = n;
  const lots = lotsOf(state, item);
  for (const lot of lots) {
    const taken = Math.min(lot.qty, rest);
    lot.qty -= taken;
    rest -= taken;
    if (out && taken > 0) out.push({ qty: taken, origin: lot.origin });
    if (rest <= 0) break;
  }
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.inventaire[item] = kept;
  else delete state.inventaire[item];
  return n;
}

// Nuits restantes du lot le plus ancien d'un item (Infinity s'il n'y en a pas
// ou s'il ne périme pas).
function nextExpiry(state, item) {
  const lots = lotsOf(state, item);
  return lots.length ? lotRank(lots[0]) : Infinity;
}

// Quantités qui périmeront à la prochaine nuit (il leur reste 1 nuit).
function expiringSoon(state) {
  const out = {};
  for (const item of Object.keys(state.inventaire)) {
    const n = lotsOf(state, item)
      .filter((l) => l.nightsLeft === 1)
      .reduce((t, l) => t + l.qty, 0);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Étape nocturne de péremption, toujours la dernière : retire une nuit à chaque
// lot qui périme, supprime ceux qui arrivent à 0 et note les pertes dans le
// rapport de la nuit. Renvoie les pertes : { item: quantité }.
function spoil(state) {
  const perdus = {};
  for (const item of Object.keys(state.inventaire)) {
    const kept = [];
    for (const lot of lotsOf(state, item)) {
      if (lot.nightsLeft === null) {
        kept.push(lot);
        continue;
      }
      lot.nightsLeft -= 1;
      if (lot.nightsLeft <= 0) perdus[item] = (perdus[item] || 0) + lot.qty;
      else kept.push(lot);
    }
    if (kept.length) state.inventaire[item] = kept;
    else delete state.inventaire[item];
  }
  if (!state.nuit.perdus) state.nuit.perdus = {};
  for (const [item, n] of Object.entries(perdus)) {
    state.nuit.perdus[item] = (state.nuit.perdus[item] || 0) + n;
  }
  return perdus;
}

/* ---------- Lot 8 : réfrigérateur ---------- */

// state.frigo = { construit, appareil, items, alimenteMs, eveilMs, panneNuit, alimente }.
// items : { item: [ { qty, nightsLeft, origin } ] }, mêmes lots que l'inventaire
// mais au frais : leur nightsLeft est figé tant que le frigo est alimenté.
// alimenteMs et eveilMs : ms alimentées et ms d'éveil depuis le réveil ;
// panneNuit : le bloc nocturne n'a pas pu être payé ; alimente : le frigo a
// reçu son énergie au dernier tick (❄️ ou ⚠️ à l'écran).

function fridgeLots(state, item) {
  const lots = state.frigo && state.frigo.items ? state.frigo.items[item] : null;
  return Array.isArray(lots) ? lots : [];
}

function fridgeCount(state, item) {
  return fridgeLots(state, item).reduce((t, lot) => t + lot.qty, 0);
}

// Quantités stockées au frigo : { item: quantité }.
function fridgeCounts(state) {
  const out = {};
  if (!state.frigo || !state.frigo.items) return out;
  for (const item of Object.keys(state.frigo.items)) {
    const n = fridgeCount(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

function fridgeUnits(state) {
  return Object.values(fridgeCounts(state)).reduce((t, n) => t + n, 0);
}

// Consommation du frigo en marche (mWh/s) : base + une part par unité stockée.
function fridgeRate(state) {
  const F = DATA.FRIGO;
  const base = F.BASE_WH_S * 1000 + F.PAR_UNITE_MWH_S * fridgeUnits(state);
  return Math.floor((base * techPct(state, 'frigoConso')) / 100); // arbre v2 : basse consommation
}

// Énergie que les batteries en service peuvent fournir (mWh).
function availableEnergy(state) {
  return state.batteries.reduce((t, b) => (b.allume && !isBroken(b) ? t + b.chargeMwh : t), 0);
}

// Besoin du bloc nocturne (mWh) et batterie suffisante pour la nuit ?
function fridgeNightNeed(state) {
  return fridgeRate(state) * DATA.FRIGO.BLOC_NUIT_S;
}

function fridgeCoversNight(state) {
  return availableEnergy(state) >= fridgeNightNeed(state);
}

// Consommateur du parc, à chaque tick. Le frigo tourne si l'énergie de ce tick
// est disponible en entier ; sinon il s'arrête (les batteries sont vides).
function runFridge(state, dtMs) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const d = f.appareil;
  d.conso = 0;
  f.eveilMs += dtMs;
  f.alimente = false;
  if (!d.allume || isBroken(d)) return;
  const need = perTick(fridgeRate(state), dtMs);
  if (availableEnergy(state) < need) return;
  const got = drawEnergy(state, need);
  d.conso = perSecond(got, dtMs);
  f.alimente = true;
  f.alimenteMs += dtMs;
}

// Retire jusqu'à `qty` unités d'une liste de lots (le plus ancien d'abord) et
// renvoie les morceaux retirés, avec leur conservation et leur origine.
function pullLots(lots, qty) {
  const out = [];
  let rest = qty;
  for (const lot of lots) {
    if (rest <= 0) break;
    const n = Math.min(lot.qty, rest);
    if (n > 0) {
      out.push({ qty: n, nightsLeft: lot.nightsLeft, origin: lot.origin });
      lot.qty -= n;
      rest -= n;
    }
  }
  return out;
}

// Range des morceaux dans une liste de lots, en les fusionnant s'ils ont la même
// conservation et la même origine ; le plus ancien reste en tête.
function pushLots(lots, pulled) {
  for (const p of pulled) {
    const same = lots.find((l) => l.nightsLeft === p.nightsLeft && l.origin === p.origin);
    if (same) same.qty += p.qty;
    else lots.push({ ...p });
  }
  lots.sort((a, b) => (lotRank(a) === lotRank(b) ? 0 : lotRank(a) < lotRank(b) ? -1 : 1));
}

// Déplace `qty` unités d'un aliment périssable de l'inventaire vers le frigo.
// Les lots gardent leur compteur de conservation, qui se fige au frais.
function moveToFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  if (!DATA.items[item]) return fail('Objet inconnu.');
  if (!isPerishable(item)) return fail(`${DATA.items[item].nom} ne périme pas : inutile de le ranger au frais.`);
  const n = Math.min(Math.floor(Number(qty)) || 0, Math.floor(countItem(state, item) + EPS));
  if (n <= 0) return fail('Rien à ranger.');
  const inv = lotsOf(state, item);
  const pulled = pullLots(inv, n);
  const kept = inv.filter((l) => l.qty > 0);
  if (kept.length) state.inventaire[item] = kept;
  else delete state.inventaire[item];
  const lots = fridgeLots(state, item);
  pushLots(lots, pulled);
  state.frigo.items[item] = lots;
  return { ok: true, moved: n };
}

// Sort `qty` unités du frigo vers l'inventaire. Leur compteur reprend.
function moveFromFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  const n = Math.min(Math.floor(Number(qty)) || 0, fridgeCount(state, item));
  if (n <= 0) return fail('Rien à sortir.');
  const lots = fridgeLots(state, item);
  const pulled = pullLots(lots, n);
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.frigo.items[item] = kept;
  else delete state.frigo.items[item];
  const inv = lotsOf(state, item);
  pushLots(inv, pulled);
  state.inventaire[item] = inv;
  return { ok: true, moved: n };
}

// Retire jusqu'à `qty` unités d'un aliment du frigo (le lot le plus ancien
// d'abord) pour un repas. Renvoie le nombre retiré.
function takeFromFridge(state, item, qty, out = null) {
  const lots = fridgeLots(state, item);
  const pulled = pullLots(lots, qty);
  if (out) out.push(...pulled.map((p) => ({ qty: p.qty, origin: p.origin })));
  const taken = pulled.reduce((t, p) => t + p.qty, 0);
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.frigo.items[item] = kept;
  else if (state.frigo.items) delete state.frigo.items[item];
  return taken;
}

function nightFridgeStats(state) {
  if (!state.nuit) state.nuit = newNightStats();
  if (!state.nuit.frigo) state.nuit.frigo = { mwh: 0, panne: false, vieillis: false };
  return state.nuit.frigo;
}

// Étape nocturne « nightPower » : prélève d'un coup BLOC_NUIT_S secondes de
// consommation. Si les batteries ne suffisent pas (ou si le frigo est éteint ou
// en panne), la nuit compte comme une panne de froid.
function nightPower(state) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const stats = nightFridgeStats(state);
  const d = f.appareil;
  if (!d.allume || isBroken(d)) {
    f.panneNuit = true;
    stats.panne = true;
    return;
  }
  const need = fridgeNightNeed(state);
  const avail = availableEnergy(state);
  const wanted = Math.min(need, avail);
  // Un prélèvement de la nuit n'est pas une puissance : on ne touche pas aux
  // compteurs d'affichage (mWh/s) des batteries.
  const saved = state.batteries.map((b) => b.sortie);
  drawEnergy(state, wanted);
  state.batteries.forEach((b, i) => { b.sortie = saved[i]; });
  stats.mwh = wanted;
  if (avail < need) {
    f.panneNuit = true;
    stats.panne = true;
  }
}

// Étape nocturne « fridgeNight » : si le frigo a été alimenté moins de
// SEUIL_ALIMENTE du temps d'éveil, ou en cas de panne nocturne, chaque lot du
// frigo perd PERTE_NUITS nuit de conservation (ceux qui arrivent à 0 sont
// perdus). Les compteurs de la journée repartent à zéro.
function fridgeNight(state) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const F = DATA.FRIGO;
  const stats = nightFridgeStats(state);
  // Sans temps d'éveil observé (test, Dormir immédiat), rien n'a manqué de froid.
  const warm = f.panneNuit || (f.eveilMs > 0 && f.alimenteMs * 100 < f.eveilMs * F.SEUIL_ALIMENTE);
  if (warm) {
    stats.vieillis = true;
    if (!state.nuit.perdus) state.nuit.perdus = {};
    for (const item of Object.keys(f.items)) {
      const kept = [];
      for (const lot of fridgeLots(state, item)) {
        if (lot.nightsLeft === null) {
          kept.push(lot);
          continue;
        }
        lot.nightsLeft -= F.PERTE_NUITS;
        if (lot.nightsLeft <= 0) state.nuit.perdus[item] = (state.nuit.perdus[item] || 0) + lot.qty;
        else kept.push(lot);
      }
      if (kept.length) f.items[item] = kept;
      else delete f.items[item];
    }
  }
  f.alimenteMs = 0;
  f.eveilMs = 0;
  f.panneNuit = false;
}

function buildFridge(state) {
  const f = state.frigo;
  if (f.construit) return fail('Le Réfrigérateur est déjà construit.');
  const cost = DATA.FRIGO.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openFridge(state);
  return { ok: true, cost };
}

// Pose le frigo dans l'état (sans payer).
function openFridge(state) {
  const f = state.frigo;
  f.construit = true;
  if (!f.appareil) f.appareil = makeDevice('frigo', 'frigo', DATA.FRIGO.CONSTRUCTION);
  f.alimente = true;
}

/* ---------- Lot 3 : Marché ---------- */

// Plancher du coefficient d'achat d'un item (1,2 ; 2,0 pour les graines).
function marketFloor(item) {
  const P = DATA.MARCHE.PLANCHER;
  const p = P[DATA.items[item].category];
  return p === undefined ? P.defaut : p;
}

// Les coefficients ne sont notés dans state.marche qu'une fois sortis de leur
// plancher : { item: coefficient }.
function marketCoef(state, item) {
  const c = state.marche ? state.marche[item] : undefined;
  return typeof c === 'number' ? c : marketFloor(item);
}

function setMarketCoef(state, item, coef) {
  if (!state.marche) state.marche = {};
  const c = Math.max(marketFloor(item), Math.round(coef));
  if (c <= marketFloor(item)) delete state.marche[item];
  else state.marche[item] = c;
}

function isBuyable(item) {
  const def = DATA.items[item];
  return !!def && def.rachetable !== false;
}

function sellPrice(item) {
  return DATA.items[item].prix;
}

// Prix de la prochaine unité achetée.
function buyPrice(state, item) {
  return percentCeil(sellPrice(item), marketCoef(state, item));
}

// Devis d'un achat de `qty` unités, sans rien modifier : le prix monte d'un
// pas entre deux unités, et l'on s'arrête quand les pièces manquent.
// Renvoie { quantite, cout } : ce que buyItem(state, item, qty) achèterait.
function buyQuote(state, item, qty = 1) {
  if (!DATA.items[item] || !isBuyable(item)) return { quantite: 0, cout: 0 };
  const floor = marketFloor(item);
  let coef = marketCoef(state, item);
  let pieces = state.pieces;
  let quantite = 0;
  let cout = 0;
  for (let i = 0; i < Math.max(0, Math.floor(Number(qty)) || 0); i++) {
    const price = percentCeil(sellPrice(item), coef);
    if (pieces + EPS < price) break;
    pieces -= price;
    cout += price;
    quantite += 1;
    coef = Math.max(floor, Math.round(coef + DATA.MARCHE.PAS));
  }
  return { quantite, cout };
}

// Achète jusqu'à `qty` unités, une par une : le prix monte entre deux unités.
// S'arrête quand les pièces manquent. Un item acheté arrive avec sa
// conservation pleine et l'origine « acheté ».
function buyItem(state, item, qty = 1) {
  const def = DATA.items[item];
  if (!def) return fail('Objet inconnu.');
  if (!isBuyable(item)) return fail(`${def.nom} ne s'achète pas.`);
  let bought = 0;
  let cost = 0;
  for (let i = 0; i < qty; i++) {
    const price = buyPrice(state, item);
    if (state.pieces + EPS < price) break;
    spend(state, price);
    addLot(state, item, 1, DATA.ORIGINE.ACHETE);
    setMarketCoef(state, item, marketCoef(state, item) + DATA.MARCHE.PAS);
    bought += 1;
    cost += price;
  }
  if (bought === 0) return fail('Pas assez de pièces.');
  return { ok: true, bought, cost };
}

// Quantité vendable d'un item : l'inventaire plus ce qui est rangé au frigo.
function sellableCount(state, item) {
  return countItem(state, item) + fridgeCount(state, item);
}

// Vend jusqu'à `qty` unités (les lots les plus anciens d'abord) au prix fixe ;
// chaque unité vendue retire un pas au coefficient, sans passer sous le plancher.
// Les articles rangés au frigo se vendent aussi : on vend d'abord ce qui est
// dans l'inventaire (il périt), puis ce qui est au frais.
function sellItem(state, item, qty) {
  const def = DATA.items[item];
  if (!def) return fail('Objet inconnu.');
  const wanted = Math.min(Math.floor(Number(qty)) || 0, Math.floor(sellableCount(state, item) + EPS));
  const fromInventory = takeItem(state, item, wanted);
  const fromFridge = wanted - fromInventory > 0 ? takeFromFridge(state, item, wanted - fromInventory) : 0;
  const n = fromInventory + fromFridge;
  if (n <= 0) return fail('Rien à vendre.');
  const gain = n * sellPrice(item);
  state.pieces += gain;
  setMarketCoef(state, item, marketCoef(state, item) - DATA.MARCHE.PAS * n);
  refreshUnlocks(state);
  return { ok: true, sold: n, gain };
}

/* ---------- Lot 2 : aléatoire à graine (état dans state.rngSeed) ---------- */

// Même suite que mulberry32(graine), mais l'état du générateur vit dans
// state.rngSeed : il est sauvegardé avec la partie et reste reproductible.
function nextRandom(state) {
  const a = ((state.rngSeed >>> 0) + 0x6d2b79f5) | 0;
  state.rngSeed = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Entier tiré dans [min, max], bornes comprises.
function randomInt(state, min, max) {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}

/* ---------- Lot 2 : famille et santé ---------- */

// nom : le rôle fixe (« Adulte 1 ») ; prenom, genre, teint : le profil choisi
// par le joueur (version 1.1), au départ le rôle, le sexe de DATA et le jaune.
function makeMember(def) {
  return { id: def.id, nom: def.nom, enfant: def.enfant, sante: DATA.FAMILY.SANTE_DEPART, malade: false, ...defaultMemberProfile(def) };
}

/* ---------- version 1.1 : profil des membres de la famille ---------- */

// Profil de départ d'un membre (défini dans DATA.FAMILY.MEMBRES, ou un membre
// inconnu d'une sauvegarde importée) : prénom = son rôle, teinte 0.
function defaultMemberProfile(def) {
  const P = DATA.FAMILY.PROFIL;
  const base = DATA.FAMILY.MEMBRES.find((m) => m.id === (def && def.id));
  const genre = base ? base.genre : P.GENRES[0];
  const nom = (base && base.nom) || (def && typeof def.nom === 'string' && def.nom) || 'Membre';
  return { prenom: nom, genre, teint: 0 };
}

// Prénom nettoyé : les espaces et retours à la ligne deviennent une seule
// espace, sans espace au début ni à la fin. Renvoie '' si ce n'est pas un texte.
function cleanFirstName(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim();
}

// Un prénom est valide s'il compte 1 à PRENOM_MAX caractères une fois nettoyé
// (un caractère accentué ou un emoji compte pour un).
function validFirstName(text) {
  const n = Array.from(cleanFirstName(text)).length;
  return n >= 1 && n <= DATA.FAMILY.PROFIL.PRENOM_MAX;
}

// Emoji d'un portrait : 👩 / 👨 pour un adulte, 👧 / 👦 pour un enfant, suivi de
// la teinte choisie (rien pour le jaune par défaut). Des valeurs inconnues
// retombent sur le premier sexe et le jaune.
function portraitEmoji(enfant, genre, teint) {
  const P = DATA.FAMILY.PROFIL;
  const set = P.PORTRAITS[enfant ? 'enfant' : 'adulte'];
  const base = set[genre] || set[P.GENRES[0]];
  return base + (P.TEINTS[teint] || '');
}

// Prénom affiché d'un membre : celui choisi, sinon son rôle. Texte brut : à
// passer par escapeHtml() avant de l'écrire dans une page.
function memberName(state, id) {
  const m = findMember(state, id);
  if (!m) return '';
  return validFirstName(m.prenom) ? cleanFirstName(m.prenom) : String(m.nom || '');
}

// Portrait (emoji) d'un membre, selon son âge, son sexe et sa teinte.
function memberPortrait(state, id) {
  const m = findMember(state, id);
  if (!m) return '';
  return portraitEmoji(m.enfant, m.genre, m.teint);
}

// Change le profil d'un membre : { prenom, genre, teint }. Un champ absent
// garde sa valeur. Tout est vérifié avant de rien modifier : prénom de 1 à
// PRENOM_MAX caractères (nettoyé), genre 'f' ou 'm', teinte entière de 0 à 5.
function setMemberProfile(state, id, profil) {
  const P = DATA.FAMILY.PROFIL;
  const m = findMember(state, id);
  if (!m) return fail('Membre introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  const next = { prenom: m.prenom, genre: m.genre, teint: m.teint };
  if (profil.prenom !== undefined) {
    if (typeof profil.prenom !== 'string' || cleanFirstName(profil.prenom) === '') return fail('Écris un prénom.');
    if (!validFirstName(profil.prenom)) return fail(`Le prénom doit faire ${P.PRENOM_MAX} caractères au plus.`);
    next.prenom = cleanFirstName(profil.prenom);
  }
  if (profil.genre !== undefined) {
    if (!P.GENRES.includes(profil.genre)) return fail('Choix inconnu.');
    next.genre = profil.genre;
  }
  if (profil.teint !== undefined) {
    if (!Number.isInteger(profil.teint) || profil.teint < 0 || profil.teint >= P.TEINTS.length) return fail('Couleur inconnue.');
    next.teint = profil.teint;
  }
  m.prenom = next.prenom;
  m.genre = next.genre;
  m.teint = next.teint;
  return { ok: true, id: m.id };
}

/* ---------- version 1.2 : composition de la famille et animaux de compagnie ---------- */

// Dernier numéro utilisé par type d'identifiant (« adulte-3 » → 3), d'après les
// membres et les animaux présents : { adulte, enfant, compagnon }.
function familyNumbers(membres, animaux) {
  const n = { adulte: 0, enfant: 0, compagnon: 0 };
  for (const x of [...(Array.isArray(membres) ? membres : []), ...(Array.isArray(animaux) ? animaux : [])]) {
    const m = x && typeof x.id === 'string' ? x.id.match(/^(adulte|enfant|compagnon)-(\d+)$/) : null;
    if (m) n[m[1]] = Math.max(n[m[1]], Number(m[2]));
  }
  return n;
}

function adultCount(state) {
  return state.famille.membres.filter((m) => !m.enfant).length;
}

function childCount(state) {
  return state.famille.membres.filter((m) => m.enfant).length;
}

// Places encore libres dans la famille (0 à MEMBRES_MAX).
function memberRoom(state) {
  return Math.max(0, DATA.FAMILY.COMPOSITION.MEMBRES_MAX - state.famille.membres.length);
}

// Prochain numéro d'un type d'identifiant ; le compteur de l'état avance.
function nextFamilyNumber(state, type) {
  const f = state.famille;
  const vus = familyNumbers(f.membres, f.animaux);
  if (!f.numeros || typeof f.numeros !== 'object') f.numeros = vus;
  const n = Math.max(Number(f.numeros[type]) || 0, vus[type]) + 1;
  f.numeros[type] = n;
  return n;
}

// Ajoute un membre à la famille : un adulte, ou un enfant si `enfant` est vrai.
// Refusé au-delà de MEMBRES_MAX. Le nouveau venu arrive avec la santé moyenne
// de la famille (au moins 1) : agrandir la famille ne soigne personne et ne
// change pas la productivité. Son besoin s'ajoute dès le prochain repas.
function addMember(state, enfant = false) {
  const C = DATA.FAMILY.COMPOSITION;
  const f = state.famille;
  if (f.membres.length >= C.MEMBRES_MAX) return fail(`La famille est au complet : ${C.MEMBRES_MAX} membres au plus.`);
  const type = enfant ? 'enfant' : 'adulte';
  const n = nextFamilyNumber(state, type);
  const m = makeMember({ id: `${type}-${n}`, nom: `${enfant ? 'Enfant' : 'Adulte'} ${n}`, enfant: !!enfant });
  m.sante = Math.max(1, Math.min(DATA.FAMILY.SANTE_MAX, Math.floor(rawAverageHealth(state))));
  f.membres.push(m);
  return { ok: true, id: m.id, besoin: familyNeed(state) };
}

// Pourquoi un membre ne peut pas quitter la famille (texte), ou '' s'il le peut :
// il reste toujours MEMBRES_MIN membre dont ADULTES_MIN adulte, et un malade
// ne part pas (ce serait un soin gratuit pour la moyenne de la famille).
function memberRemovalBlock(state, id) {
  const C = DATA.FAMILY.COMPOSITION;
  const m = findMember(state, id);
  if (!m) return 'Membre introuvable.';
  if (state.famille.membres.length <= C.MEMBRES_MIN) return 'Il faut au moins un membre dans la famille.';
  if (!m.enfant && adultCount(state) <= C.ADULTES_MIN) return 'Il faut au moins un adulte dans la famille.';
  if (m.malade) return `${memberName(state, m.id)} est malade : soigne-le avant qu'il parte.`;
  return '';
}

// Retire un membre de la famille (voir memberRemovalBlock). Son besoin disparaît
// dès le prochain repas ; un repas déjà pris aujourd'hui n'est pas refait.
function removeMember(state, id) {
  const raison = memberRemovalBlock(state, id);
  if (raison) return fail(raison);
  const f = state.famille;
  f.membres = f.membres.filter((m) => m.id !== id);
  return { ok: true, id, besoin: familyNeed(state) };
}

/* -- animaux de compagnie -- */

function pets(state) {
  return Array.isArray(state.famille.animaux) ? state.famille.animaux : [];
}

function findPet(state, id) {
  return pets(state).find((a) => a.id === id) || null;
}

function petRoom(state) {
  return Math.max(0, DATA.FAMILY.COMPAGNIE.MAX - pets(state).length);
}

// Nom affiché d'un animal de compagnie (texte brut : à passer par escapeHtml()).
function petName(state, id) {
  const a = findPet(state, id);
  if (!a) return '';
  const E = DATA.FAMILY.COMPAGNIE.ESPECES;
  return validFirstName(a.nom) ? cleanFirstName(a.nom) : (E[a.espece] ? E[a.espece].nom : 'Animal');
}

function petIcon(espece) {
  const e = DATA.FAMILY.COMPAGNIE.ESPECES[espece];
  return e ? e.icone : '🐾';
}

// Adopte un chien ou un chat : refusé au-delà de COMPAGNIE.MAX. Gratuit, et sans
// effet sur le besoin journalier, la santé ou la productivité.
function addPet(state, espece) {
  const K = DATA.FAMILY.COMPAGNIE;
  if (!K.ESPECES[espece]) return fail('Cet animal ne s\'adopte pas.');
  if (!Array.isArray(state.famille.animaux)) state.famille.animaux = [];
  if (state.famille.animaux.length >= K.MAX) return fail(`${K.MAX} animaux de compagnie au plus.`);
  const n = nextFamilyNumber(state, 'compagnon');
  const a = { id: `compagnon-${n}`, espece, nom: `${K.ESPECES[espece].nom} ${n}` };
  state.famille.animaux.push(a);
  return { ok: true, id: a.id };
}

// Change le nom ou l'espèce d'un animal de compagnie : { nom, espece }. Un champ
// absent garde sa valeur ; tout est vérifié avant de rien modifier.
function setPetProfile(state, id, profil) {
  const K = DATA.FAMILY.COMPAGNIE;
  const a = findPet(state, id);
  if (!a) return fail('Animal introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  let nom = a.nom;
  let espece = a.espece;
  if (profil.nom !== undefined) {
    if (typeof profil.nom !== 'string' || cleanFirstName(profil.nom) === '') return fail('Écris un nom.');
    if (!validFirstName(profil.nom)) return fail(`Le nom doit faire ${DATA.FAMILY.PROFIL.PRENOM_MAX} caractères au plus.`);
    nom = cleanFirstName(profil.nom);
  }
  if (profil.espece !== undefined) {
    if (!K.ESPECES[profil.espece]) return fail('Choix inconnu.');
    espece = profil.espece;
  }
  a.nom = nom;
  a.espece = espece;
  return { ok: true, id: a.id };
}

function removePet(state, id) {
  if (!findPet(state, id)) return fail('Animal introuvable.');
  state.famille.animaux = pets(state).filter((a) => a.id !== id);
  return { ok: true, id };
}

// Texte sûr à écrire dans une page : les caractères spéciaux du HTML sont
// remplacés. À utiliser pour tout texte saisi par le joueur (les prénoms).
function escapeHtml(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function familyNeed(state) {
  return state.famille.membres.reduce((t, m) => t + DATA.FAMILY.AJ[m.enfant ? 'enfant' : 'adulte'], 0);
}

// Moyenne brute des santés (sert aux comptes rendus).
function rawAverageHealth(state) {
  const m = state.famille.membres;
  return m.length ? m.reduce((t, x) => t + x.sante, 0) / m.length : 0;
}

// Santé moyenne pour la productivité : un membre malade compte pour 0.
function averageHealth(state) {
  const m = state.famille.membres;
  return m.length ? Math.floor(m.reduce((t, x) => t + (x.malade ? 0 : x.sante), 0) / m.length) : 0;
}

// Productivité en % (100 = pleine). Elle ne s'applique qu'aux actions au clic
// (récolte manuelle) : jamais aux automatisations des lots suivants.
function productivity(state) {
  const h = averageHealth(state);
  for (const tier of DATA.FAMILY.PRODUCTIVITE) {
    if (h >= tier.min) return tier.pct;
  }
  return DATA.FAMILY.PRODUCTIVITE[DATA.FAMILY.PRODUCTIVITE.length - 1].pct;
}

// Variation de santé d'une nuit selon la couverture du besoin (en %, 0 à 100).
function healthDelta(coverage) {
  for (const tier of DATA.FAMILY.VARIATION) {
    if (coverage >= tier.min) return tier.delta;
  }
  return DATA.FAMILY.VARIATION[DATA.FAMILY.VARIATION.length - 1].delta;
}

// Aliments dans l'ordre où la famille les mange : d'abord ce qui périme le plus
// tôt (lot le plus ancien de chaque item ; ce qui ne périme pas passe en
// dernier, donc les conserves), puis par énergie décroissante.
function mealOrder(state) {
  const keys = Object.keys(DATA.items).filter((k) => DATA.items[k].edible);
  return keys.sort((a, b) => {
    const ea = nextExpiry(state, a);
    const eb = nextExpiry(state, b);
    if (ea !== eb) return ea < eb ? -1 : 1;
    return DATA.items[b].energie - DATA.items[a].energie;
  });
}

// Lot 8 : les stocks que la famille peut manger, dans l'ordre du repas. Une
// entrée par aliment de l'inventaire (rang = nuits avant péremption) et une par
// aliment du frigo (rang infini : au frais, il ne périme pas). Les entrées de
// même rang passent par énergie décroissante, l'inventaire avant le frigo.
// La réserve de semences protège d'abord l'inventaire (c'est là qu'on prend les
// plants), puis le frigo.
function mealEntries(state) {
  const entries = [];
  for (const item of mealOrder(state)) {
    const reserve = state.famille.reserve[item] || 0;
    const inv = countItem(state, item);
    const cold = fridgeCount(state, item);
    const invSpare = Math.max(0, inv - reserve);
    const coldSpare = Math.max(0, cold - Math.max(0, reserve - inv));
    if (invSpare > 0) entries.push({ item, froid: false, spare: invSpare, rank: nextExpiry(state, item) });
    if (coldSpare > 0) entries.push({ item, froid: true, spare: coldSpare, rank: Infinity });
  }
  return entries.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1;
    return DATA.items[b.item].energie - DATA.items[a.item].energie;
  });
}

// Repas de la nuit, calculé sans rien modifier (sert aussi à l'aperçu de
// Dormir). Les quantités de la réserve de semences ne sont jamais mangées.
// `mange` : total par aliment ; `froid` : la part prise dans le frigo (Lot 8).
function planMeal(state) {
  const need = familyNeed(state);
  let covered = 0;
  const mange = {};
  const froid = {};
  for (const entry of mealEntries(state)) {
    if (covered >= need - EPS) break;
    const energy = DATA.items[entry.item].energie;
    const n = Math.min(entry.spare, Math.ceil((need - covered) / energy - EPS));
    if (n <= 0) continue;
    mange[entry.item] = (mange[entry.item] || 0) + n;
    if (entry.froid) froid[entry.item] = (froid[entry.item] || 0) + n;
    covered += n * energy;
  }
  return {
    besoin: need,
    energie: covered,
    mange,
    froid,
    couverture: need > 0 ? Math.min(100, Math.floor((covered * 100) / need)) : 100, // %
  };
}

// Applique la variation de santé. Un membre qui tombe à 0 devient malade ; un
// malade regagne RECUPERATION_MALADE points par nuit couverte à 100 % (sinon il
// subit la variation normale) et guérit en atteignant la santé d'un soin.
// Renvoie les identifiants des membres devenus malades cette nuit (version 1.1 :
// l'identifiant, pas le prénom, pour que le compte rendu suive un changement
// de prénom et ne recopie jamais une donnée personnelle).
// Lot 5 : `bonus` s'ajoute à la variation d'une nuit (plats différents mangés).
function updateHealth(state, coverage, bonus = 0) {
  const F = DATA.FAMILY;
  const delta = healthDelta(coverage) + bonus;
  const fed = coverage >= 100;
  const nouveaux = [];
  for (const m of state.famille.membres) {
    const gain = m.malade && fed ? F.RECUPERATION_MALADE + techSum(state, 'recuperation') : delta;
    m.sante = Math.max(0, Math.min(F.SANTE_MAX, m.sante + gain));
    if (m.malade && m.sante >= F.SOIN.SANTE) {
      m.malade = false;
    } else if (!m.malade && m.sante <= 0) {
      m.malade = true;
      nouveaux.push(m.id);
    }
  }
  return nouveaux;
}

function newNightStats() {
  return { besoin: 0, energie: 0, couverture: 100, mange: {}, santeAvant: 0, santeApres: 0, nouveauxMalades: [], perdus: {}, oeufs: 0, lait: 0, etable: newStableReport(), bonusPlats: 0, termine: {}, auto: newAutoReport(), fruits: {}, frigo: { mwh: 0, panne: false, vieillis: false }, energieProduit: 0, autonomie: 0, pluie: 0, entretiens: [] };
}

// Bonus de santé d'une nuit : +1 par plat différent mangé, jusqu'à +3.
function dishBonus(mange, state = null) {
  const B = DATA.FAMILY.BONUS_PLATS;
  const plats = Object.keys(mange).filter((item) => mange[item] > 0 && DATA.items[item].plat).length;
  const max = state ? Math.max(B.MAX, techFlag(state, 'bonusPlatsMax') || 0) : B.MAX; // arbre v2 : Menus variés
  return Math.min(max, plats * B.PAR_PLAT);
}

// Le repas de la famille, puis la santé. Version 1.1.1 : il se prend à 19 h
// (mealDue) ; si la famille se couche avant, il est pris au coucher (feedFamily).
// Le compte du repas est gardé dans state.repas jusqu'à la nuit, qui le recopie
// dans son compte rendu : un seul repas par jour, quoi qu'il arrive.
function takeMeal(state) {
  if (state.repas) return fail('La famille a déjà pris son repas aujourd\'hui.');
  const plan = planMeal(state);
  // Lot 9 : énergie mangée qui vient de lots d'origine « produit » (autonomie).
  let produit = 0;
  for (const [item, n] of Object.entries(plan.mange)) {
    const cold = plan.froid[item] || 0;
    const pieces = [];
    takeItem(state, item, n - cold, pieces);
    if (cold > 0) takeFromFridge(state, item, cold, pieces);
    for (const p of pieces) {
      if (p.origin === DATA.ORIGINE.PRODUIT) produit += p.qty * DATA.items[item].energie;
    }
  }
  const avant = rawAverageHealth(state);
  const bonus = dishBonus(plan.mange, state);
  const nouveaux = updateHealth(state, plan.couverture, bonus);
  state.repas = {
    heure: hourOfDay(state),
    bonusPlats: bonus,
    besoin: plan.besoin,
    energie: plan.energie,
    couverture: plan.couverture,
    mange: plan.mange,
    santeAvant: avant,
    santeApres: rawAverageHealth(state),
    nouveauxMalades: nouveaux,
    energieProduit: produit,
    autonomie: autonomyPercent(produit, plan.besoin),
  };
  return { ok: true, repas: state.repas };
}

// Première étape nocturne : le repas s'il n'a pas été pris à 19 h, puis son
// compte recopié dans celui de la nuit. La santé « après » est celle du
// coucher : un soin payé entre le repas et la nuit y figure.
function feedFamily(state) {
  if (!state.repas) takeMeal(state);
  const { heure, ...repas } = state.repas;
  state.repas = null;
  state.nuit = {
    ...repas,
    santeApres: rawAverageHealth(state),
    termine: {},
    perdus: {},
    oeufs: 0,
    auto: newAutoReport(),
    fruits: {},
    frigo: { mwh: 0, panne: false, vieillis: false },
  };
  return state.nuit;
}

function careCost(state) {
  const c = DATA.FAMILY.SOIN;
  // arbre v2 (Remèdes maison) : soins moins chers
  return percentCeil(growthPrice(c.base, c.croissance, state.famille.soinsPayes), techPct(state, 'soinCout'));
}

function findMember(state, id) {
  return state.famille.membres.find((m) => m.id === id) || null;
}

// Soigne un malade : coût croissant, santé remise à SOIN.SANTE.
function heal(state, memberId) {
  const m = findMember(state, memberId);
  if (!m) return fail('Membre introuvable.');
  if (!m.malade) return fail(`${memberName(state, m.id)} n'est pas malade.`);
  const cost = careCost(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.famille.soinsPayes += 1;
  state.jour.soins = (state.jour.soins || 0) + 1; // Lot 9 : soin payé aujourd'hui (suivi de l'hiver)
  m.sante = DATA.FAMILY.SOIN.SANTE;
  m.malade = false;
  return { ok: true, cost };
}

// Items que la famille pourrait manger mais qui servent aussi de plants
// (aujourd'hui la patate) : ce sont ceux dont la réserve se règle.
function reservableItems() {
  return Object.keys(DATA.crops)
    .map((c) => DATA.crops[c].graines.item)
    .filter((item, i, all) => DATA.items[item].edible && all.indexOf(item) === i);
}

function setSeedReserve(state, item, qty) {
  if (!DATA.items[item]) return fail('Objet inconnu.');
  const n = Math.max(0, Math.floor(Number(qty)));
  if (!Number.isFinite(n)) return fail('Quantité invalide.');
  state.famille.reserve[item] = n;
  return { ok: true, reserve: n };
}

/* ---------- Lot 2 : Zone de culture (identifiant interne : potager) ---------- */

function makePlot(n, lieu = DATA.POTAGER.LIEU) {
  // Lot 7 : semis = réglage du semis automatique de la parcelle ('meme' : même
  // culture que la récolte, 'verrou' : toujours `verrou`, 'off' : désactivé).
  return { id: `${lieu}-${n}`, lieu, culture: null, stade: 0, arrose: false, montee: false, semis: 'meme', verrou: null };
}

function makePlots(count, lieu = DATA.POTAGER.LIEU) {
  const plots = [];
  for (let i = 1; i <= count; i++) plots.push(makePlot(i, lieu));
  return plots;
}

// Toutes les parcelles de la ferme : la Zone de culture d'abord, puis la Serre.
function allPlots(state) {
  return [...state.potager.parcelles, ...(state.serre ? state.serre.parcelles : [])];
}

function findPlot(state, id) {
  return allPlots(state).find((p) => p.id === id) || null;
}

function seedItem(culture) {
  return DATA.crops[culture].graines.item;
}

// Objet que rend la récolte : le nom de la culture, sauf `produit` (tournesol).
function cropProduct(culture) {
  return DATA.crops[culture].produit || culture;
}

// Un item apparaît dans l'onglet Graines du Marché (et donc dans la liste
// filtrée par seedForSale) s'il est de catégorie « graine », ou si c'est le
// blé. Le blé garde sa catégorie « ingrédient » (prix, plancher de marché,
// conservation et origine inchangés : voir DATA.items.ble et DATA.MARCHE) car
// il reste avant tout la ressource du Silo, de l'alimentation des poules et
// du Moulin ; ce test l'ajoute simplement à l'onglet Graines en plus, sans
// rien retirer à sa présence dans l'onglet Acheter. On ne généralise pas ce
// cas à toute culture en mode « plant » (ex. la patate) : seul le blé est
// concerné par cette règle.
function isGraineComptoir(item) {
  return DATA.items[item].category === 'graine' || item === DATA.SILO.ITEM;
}

// Graines disponibles pour semer une culture. Le blé sert de graine : celui de
// l'inventaire et celui du Silo comptent tous les deux.
function seedStock(state, culture) {
  const item = seedItem(culture);
  return item === DATA.SILO.ITEM ? wheatTotal(state) : countItem(state, item);
}

// Retire une graine. Le blé se prend d'abord dans l'inventaire (le Silo reste
// pour les poules), puis dans le Silo.
function takeSeed(state, culture) {
  const item = seedItem(culture);
  if (item === DATA.SILO.ITEM) return takeWheat(state, 1, 'inventaire') ? 1 : 0;
  return takeItem(state, item, 1);
}

function plantableCrops(lieu) {
  return Object.keys(DATA.crops).filter((c) => DATA.crops[c].lieux.includes(lieu));
}

// Dernier stade d'une plante : la montée en graine de la carotte en ajoute.
function maxStage(plot) {
  const def = DATA.crops[plot.culture];
  return def.stades + (plot.montee ? def.graines.stadesSupp : 0);
}

function isMature(plot) {
  return !!plot.culture && plot.stade >= maxStage(plot);
}

// Rendement d'une récolte au clic (× productivité) ou automatique (× 1).
// Lot 8 : avec `lieu`, le facteur de saison du lieu s'y applique (Zone de culture,
// quelle que soit la culture ; jamais la Serre).
function harvestYield(state, culture, auto = false, lieu = null) {
  const saison = lieu ? yieldSeasonFactor(state, lieu) : 100;
  const prod = auto ? 100 : productivity(state);
  return Math.floor((DATA.crops[culture].rendement * prod * saison + 5000) / 10000);
}

// Eau d'un arrosage (L entiers) : celle de la culture × le facteur d'eau de la
// saison (sauf en Serre), arrondie au litre le plus proche, 1 L au minimum.
function waterCostFor(state, culture, lieu) {
  // arbre v2 : Arrosage économe et Gestion intelligente de l'eau (en %)
  const pct = (waterSeasonFactor(state, lieu) * techPct(state, 'eauArrosage')) / 100;
  return Math.max(1, roundPct(DATA.crops[culture].litres, pct));
}

function waterCost(state, plot) {
  return waterCostFor(state, plot.culture, plot.lieu);
}

// Parcelles mûres regroupées par culture et par mode : [{ culture, nombre, montee }].
function readyCrops(state) {
  const out = [];
  for (const p of allPlots(state)) {
    if (!isMature(p)) continue;
    let e = out.find((x) => x.culture === p.culture && x.montee === p.montee);
    if (!e) {
      e = { culture: p.culture, nombre: 0, montee: p.montee };
      out.push(e);
    }
    e.nombre += 1;
  }
  return out;
}

function plant(state, plotId, culture) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  const def = DATA.crops[culture];
  if (!def) return fail('Culture inconnue.');
  if (plot.culture) return fail('Cette parcelle est déjà plantée.');
  if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
  if (takeSeed(state, culture) < 1) return fail(`Pas de graines : ${def.nom}.`);
  plot.culture = culture;
  plot.stade = 0;
  plot.arrose = false;
  plot.montee = false;
  return { ok: true };
}

// Une fois par nuit et par parcelle ; consomme l'eau du réservoir.
function water(state, plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  if (plot.arrose) return fail('Déjà arrosée : une fois par nuit.');
  if (isMature(plot)) return fail('Déjà mûre, inutile d\'arroser.');
  const litres = waterCost(state, plot);
  if (state.eauMl < litres * 1000) return fail('Pas assez d\'eau dans le réservoir.');
  state.eauMl -= litres * 1000;
  plot.arrose = true;
  return { ok: true, litres };
}

// Carotte seulement, et seulement une fois mûre : elle reste alors 2 stades de
// plus et rend des graines au lieu de carottes. Rebasculer annule.
function toggleBolting(state, plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  const def = DATA.crops[plot.culture];
  if (def.graines.mode !== 'montee') return fail(`${def.nom} ne monte pas en graine.`);
  if (plot.stade < def.stades) return fail('Pas encore mûre.');
  plot.montee = !plot.montee;
  return { ok: true, montee: plot.montee };
}

// Récolte : la parcelle est libérée. `auto` = true pour une automatisation
// (non pénalisée par la santé) ; le clic du joueur applique la productivité.
function harvest(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien à récolter ici.');
  if (!isMature(plot)) return fail('Pas encore mûre.');
  const culture = plot.culture;
  const def = DATA.crops[culture];
  const items = {};
  const gain = (item, qty) => {
    if (qty > 0) {
      // Le blé récolté va d'abord au Silo, le surplus dans l'inventaire.
      if (item === DATA.SILO.ITEM) storeWheat(state, qty);
      else addItem(state, item, qty);
      items[item] = (items[item] || 0) + qty;
    }
  };
  if (plot.montee) {
    gain(def.graines.item, def.graines.quantite + 2 * techSum(state, 'grainesBonus'));
  } else {
    gain(cropProduct(culture), harvestYield(state, culture, auto, plot.lieu));
    if (def.graines.mode === 'recolte') {
      const bonus = techSum(state, 'grainesBonus'); // arbre v2 : Sélection des semences
      gain(def.graines.item, randomInt(state, def.graines.min + bonus, def.graines.max + bonus));
    }
  }
  plot.culture = null;
  plot.stade = 0;
  plot.arrose = false;
  plot.montee = false;
  if (items.carotte) bumpCounter(state, 'carottes', items.carotte); // Lot 9 (une carotte montée en graine ne compte pas)
  return { ok: true, culture, items };
}

// Deuxième étape nocturne : +1 stade si la parcelle a été arrosée (jusqu'au
// dernier stade), puis remise à zéro de l'arrosage.
function growAll(state) {
  for (const p of allPlots(state)) {
    if (!p.culture) {
      p.arrose = false;
      continue;
    }
    if (p.arrose && p.stade < maxStage(p)) p.stade += 1;
    p.arrose = false;
  }
}

function potagerUpgradeCost(state) {
  return state.potager.niveau >= DATA.LEVEL_MAX ? null : DATA.POTAGER.COUT[state.potager.niveau];
}

function upgradePotager(state) {
  const cost = potagerUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.potager.niveau += 1;
  const target = DATA.POTAGER.PARCELLES[state.potager.niveau - 1];
  for (let n = state.potager.parcelles.length + 1; n <= target; n++) state.potager.parcelles.push(makePlot(n));
  return { ok: true, cost };
}

/* ---------- Lot 8 : Serre ---------- */

// state.serre = { construit, niveau, parcelles }. Mêmes règles que le Potager
// (arrosage, pousse, récolte), sans aucun modificateur de saison.

function serreUpgradeCost(state) {
  return state.serre.niveau >= DATA.LEVEL_MAX ? null : DATA.SERRE.COUT[state.serre.niveau];
}

function buildSerre(state) {
  const g = state.serre;
  if (g.construit) return fail('La Serre est déjà construite.');
  const cost = DATA.SERRE.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openSerre(state);
  return { ok: true, cost };
}

// Pose la Serre au niveau 1 (sans payer) et crée ses parcelles.
function openSerre(state) {
  const g = state.serre;
  g.construit = true;
  g.niveau = 1;
  g.parcelles = makePlots(DATA.SERRE.PARCELLES[0], DATA.SERRE.LIEU);
}

function upgradeSerre(state) {
  const g = state.serre;
  if (!g.construit) return fail('Construis d\'abord la Serre.');
  const cost = serreUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  g.niveau += 1;
  const target = DATA.SERRE.PARCELLES[g.niveau - 1];
  for (let n = g.parcelles.length + 1; n <= target; n++) g.parcelles.push(makePlot(n, DATA.SERRE.LIEU));
  return { ok: true, cost };
}

/* ---------- Lot 4 : Silo et blé ---------- */

// Le blé du Silo est un nombre à part (state.silo.ble) ; le surplus vit dans
// l'inventaire (non périssable). Les quantités sont entières : 1 blé nourrit
// 2 poules (voir feedHen).

function siloCapacity(state) {
  return state.silo.construit ? DATA.SILO.CAPACITE[state.silo.niveau - 1] : 0;
}

function siloUpgradeCost(state) {
  return state.silo.niveau >= DATA.LEVEL_MAX ? null : DATA.SILO.COUT[state.silo.niveau];
}

function wheatTotal(state) {
  return state.silo.ble + countItem(state, DATA.SILO.ITEM);
}

// Range du blé récolté : d'abord dans le Silo jusqu'à sa capacité, le surplus
// dans l'inventaire. Renvoie { silo, inventaire }.
function storeWheat(state, qty) {
  if (!(qty > 0)) return { silo: 0, inventaire: 0 };
  const room = Math.max(0, siloCapacity(state) - state.silo.ble);
  const silo = Math.min(room, qty);
  state.silo.ble += silo;
  const inventaire = qty - silo;
  if (inventaire > 0) addItem(state, DATA.SILO.ITEM, inventaire);
  return { silo, inventaire };
}

// Retire exactement `qty` blé (tout ou rien), en commençant par le Silo
// (`first` = 'silo') ou par l'inventaire (`first` = 'inventaire').
// Renvoie true si le retrait a eu lieu.
function takeWheat(state, qty, first = 'silo') {
  if (wheatTotal(state) + EPS < qty) return false;
  let rest = qty;
  const fromSilo = () => {
    const n = Math.min(state.silo.ble, rest);
    state.silo.ble -= n;
    rest -= n;
  };
  const fromStock = () => {
    if (rest > EPS) rest -= takeItem(state, DATA.SILO.ITEM, rest);
  };
  if (first === 'silo') {
    fromSilo();
    fromStock();
  } else {
    fromStock();
    fromSilo();
  }
  return true;
}

// Le Silo est offert (construction à 0 dans DATA) mais reste à construire.
function buildSilo(state) {
  const s = state.silo;
  if (s.construit) return fail('Le Silo est déjà construit.');
  const cost = DATA.SILO.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  s.construit = true;
  s.niveau = 1;
  return { ok: true, cost };
}

function upgradeSilo(state) {
  if (!state.silo.construit) return fail('Construis d\'abord le Silo.');
  const cost = siloUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.silo.niveau += 1;
  return { ok: true, cost };
}

/* ---------- Lot 4 : Poulailler et poules ---------- */

function coopCapacity(state) {
  return state.poulailler.construit ? DATA.POULAILLER.CAPACITE[state.poulailler.niveau - 1] : 0;
}

function coopUpgradeCost(state) {
  return state.poulailler.niveau >= DATA.LEVEL_MAX ? null : DATA.POULAILLER.COUT[state.poulailler.niveau];
}

function buildPoulailler(state) {
  const p = state.poulailler;
  if (p.construit) return fail('Le Poulailler est déjà construit.');
  const cost = DATA.POULAILLER.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.construit = true;
  p.niveau = 1;
  return { ok: true, cost };
}

function upgradePoulailler(state) {
  if (!state.poulailler.construit) return fail('Construis d\'abord le Poulailler.');
  const cost = coopUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.poulailler.niveau += 1;
  return { ok: true, cost };
}

// Prix fixe d'un animal : il ne dépend ni du nombre d'animaux ni du Marché.
function animalPrice(kind) {
  return DATA.ANIMAUX[kind].prix;
}

// Achat d'une poule au Marché : refusé si le Poulailler n'existe pas, s'il
// est plein ou si les pièces manquent. Pas de revente.
function buyAnimal(state, kind) {
  if (kind === 'mouton') return buySheep(state);
  if (kind === 'vache') return buyCow(state);
  if (kind !== 'poule') return fail('Cet animal n\'est pas en vente.');
  const p = state.poulailler;
  if (!p.construit) return fail('Construis d\'abord le Poulailler.');
  if (p.poules >= coopCapacity(state)) return fail('Le Poulailler est plein.');
  const price = animalPrice(kind);
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  p.poules += 1;
  return { ok: true, cost: price };
}

// Combien d'animaux d'une espèce on peut encore acheter : les places libres,
// et ce que les pièces permettent (prix fixe).
function animalRoom(state, kind) {
  if (kind === 'poule') return state.poulailler.construit ? Math.max(0, coopCapacity(state) - state.poulailler.poules) : 0;
  if (kind === 'mouton') return state.paturage.construit ? freeSheepPlaces(state) : 0;
  if (kind === 'vache') return state.paturage.construit ? freeCowPlaces(state) : 0;
  return 0;
}

function animalBuyMax(state, kind) {
  if (!DATA.ANIMAUX[kind]) return 0;
  const price = animalPrice(kind);
  const payes = price > 0 ? Math.floor((state.pieces + EPS) / price) : Infinity;
  return Math.max(0, Math.min(animalRoom(state, kind), payes));
}

// Achète jusqu'à `qty` animaux, un par un (buyAnimal) : s'arrête quand la place
// ou les pièces manquent. Renvoie { ok, bought, cost }.
function buyAnimals(state, kind, qty = 1) {
  let bought = 0;
  let cost = 0;
  let last = null;
  for (let i = 0; i < Math.max(1, Math.floor(Number(qty)) || 1); i++) {
    last = buyAnimal(state, kind);
    if (!last.ok) break;
    bought += 1;
    cost += last.cost;
  }
  if (bought === 0) return last;
  return { ok: true, bought, cost };
}

// Poules restant à nourrir cette nuit.
function hensToFeed(state) {
  return state.poulailler.poules - state.poulailler.nourries;
}

// Nourrit une poule (au clic). Sous productivité 1, le geste ne compte qu'avec
// une probabilité égale à la productivité (tirage du générateur de l'état) : s'il
// rate, rien n'est retiré du blé et la poule reste à nourrir. Le blé est pris
// d'abord dans le Silo, puis dans l'inventaire.
// Lot 7 : `auto` = true pour le nourrissage automatique du niveau 5, jamais
// réduit par la productivité.
function feedHen(state, auto = false) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
  const prod = auto ? 100 : productivity(state);
  if (prod < 100 && Math.floor(nextRandom(state) * 100) >= prod) return { ok: true, compte: false };
  if (!(p.restes > 0)) {
    // Un blé entamé : il nourrit cette poule et laisse des rations pour les
    // suivantes. Ration équilibrée (arbre v2) : 2 blé pour 5 poules si possible.
    const r = henRation(state);
    const ble = wheatTotal(state) >= r.ble ? r.ble : 1;
    takeWheat(state, ble, 'silo');
    state.jour.ble += ble;
    p.restes = ble === r.ble ? r.poules : DATA.ANIMAUX.poule.poulesParBle;
  }
  p.restes -= 1;
  p.nourries += 1;
  return { ok: true, compte: true };
}

// Ration des poules : { ble, poules } (1 blé → 2 poules, ou 2 blé → 5 poules).
function henRation(state) {
  const poules = techFlag(state, 'poulesParBle');
  const ble = techFlag(state, 'parBle');
  return poules && ble ? { ble, poules } : { ble: 1, poules: DATA.ANIMAUX.poule.poulesParBle };
}

// Peut-on nourrir une poule de plus ? Oui s'il reste une ration entamée ou un blé.
function canFeedHen(state) {
  return state.poulailler.restes > 0 || wheatTotal(state) >= 1;
}

// Blé nécessaire pour nourrir `n` poules de plus (rations entamées déduites).
function wheatForHens(state, n) {
  const left = Math.max(0, n - (state.poulailler.restes || 0));
  const r = henRation(state);
  return Math.ceil((left * r.ble) / r.poules);
}

// « Nourrir tout » : une tentative par poule restante, tant qu'il reste du blé.
// Renvoie { ok, nourries, ratees } ; refusé si rien n'était possible.
function feedAllHens(state, auto = false) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
  let nourries = 0;
  let ratees = 0;
  const attempts = hensToFeed(state);
  for (let i = 0; i < attempts; i++) {
    const r = feedHen(state, auto);
    if (!r.ok) break; // plus de blé
    if (r.compte) nourries += 1;
    else ratees += 1;
  }
  return { ok: true, nourries, ratees };
}

// Étape nocturne : chaque poule nourrie pond ses œufs, puis les compteurs
// repartent à zéro. Les œufs pondus sont notés pour l'écran de réveil.
function layEggs(state) {
  const p = state.poulailler;
  const def = DATA.ANIMAUX.poule;
  const eggs = p.nourries * def.oeufsParNuit;
  if (eggs > 0) addItem(state, def.produit, eggs);
  state.nuit.oeufs = eggs;
  p.nourries = 0;
  p.restes = 0; // une ration entamée ne se garde pas
  return eggs;
}

/* ---------- Lot 6 : Étable — moutons et vaches (paille, laine, lait) ---------- */

// state.paturage = { construit, places, compteur, compteurVache, moutons: [ { id,
// laine } ], vaches: [ { id } ] }. (« paturage » : identifiant historique ; le
// joueur lit « Étable ».)
// places : places acquises (0 avant l'ouverture) ; compteur / compteurVache :
// numéro du dernier mouton / de la dernière vache achetés (les identifiants ne
// sont jamais réutilisés) ; laine : nuits nourries depuis la dernière tonte (le
// mouton seulement : la vache donne son lait la nuit même où elle mange).

// Nombre de moutons que `places` places accueillent (1 place chacun).
function maxSheep(places) {
  return Math.floor(places / DATA.PATURAGE.placesParMouton);
}

// Nombre de vaches que `places` places accueillent (3 places chacune).
function maxCows(places) {
  return Math.floor(places / DATA.PATURAGE.placesParVache);
}

function sheepCount(state) {
  return state.paturage.moutons.length;
}

function cowCount(state) {
  return state.paturage.vaches.length;
}

// Places prises par les moutons seuls / par les vaches seules.
function sheepPlaces(state) {
  return sheepCount(state) * DATA.PATURAGE.placesParMouton;
}

function cowPlaces(state) {
  return cowCount(state) * DATA.PATURAGE.placesParVache;
}

// Places prises par tous les animaux (les places sont communes aux deux espèces).
function stableOccupied(state) {
  return sheepPlaces(state) + cowPlaces(state);
}

// Places encore libres.
function stableFree(state) {
  return state.paturage.construit ? Math.max(0, state.paturage.places - stableOccupied(state)) : 0;
}

// Combien de moutons les places actuelles peuvent accueillir, compte tenu de
// celles que prennent les vaches.
function pastureCapacity(state) {
  return state.paturage.construit ? maxSheep(Math.max(0, state.paturage.places - cowPlaces(state))) : 0;
}

// Combien de vaches les places actuelles peuvent accueillir, compte tenu de
// celles que prennent les moutons.
function cowCapacity(state) {
  return state.paturage.construit ? maxCows(Math.max(0, state.paturage.places - sheepPlaces(state))) : 0;
}

// Moutons qu'on peut encore acheter.
function freeSheepPlaces(state) {
  return Math.max(0, pastureCapacity(state) - sheepCount(state));
}

// Vaches qu'on peut encore acheter. Une vache demande 3 places ; comme les
// places s'achètent une par une (voir buyPasture()), il faut parfois en acheter
// plusieurs avant qu'une vache tienne.
function freeCowPlaces(state) {
  return Math.max(0, cowCapacity(state) - cowCount(state));
}

// Prix de la place suivante : 40 × 1,2^(n − 1) arrondi à l'entier supérieur, n
// étant le rang de l'achat au-delà des places de départ (11ᵉ place : 40,
// 12ᵉ : 48, 13ᵉ : 58). Le rang suit les places déjà achetées en plus, pas le
// nombre d'animaux.
function pastureCost(state) {
  const P = DATA.PATURAGE;
  const rank = Math.max(0, state.paturage.places - P.placesDepart) + 1;
  // arbre v2 (Étable agrandie) : croissance du prix réduite
  const croissance = techFlag(state, 'croissanceSurface') || P.croissance;
  return growthPrice(P.prixPlace, croissance, rank - 1);
}

// Ouvre l'Étable aux moutons et aux vaches : les places de départ sont acquises.
function buildPaturage(state) {
  const p = state.paturage;
  if (p.construit) return fail('L\'Étable accueille déjà les moutons et les vaches.');
  const cost = DATA.PATURAGE.deblocage;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.construit = true;
  p.places = DATA.PATURAGE.placesDepart;
  return { ok: true, cost, places: p.places };
}

// Achète une place. Refusé s'il reste une place libre : une place n'est utile
// que pour l'animal suivant, et son prix suit les places déjà achetées. Une
// vache demande 3 places : tant qu'il en reste au moins une de libre (assez
// pour un mouton), l'achat reste refusé de la même façon.
function buyPasture(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (freeSheepPlaces(state) > 0) return fail('Il reste de la place : achète un mouton d\'abord.');
  const cost = pastureCost(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.places += 1;
  return { ok: true, cost, places: p.places };
}

function makeSheep(state) {
  const p = state.paturage;
  p.compteur += 1;
  return { id: `mouton-${p.compteur}`, laine: 0 };
}

// Achat d'un mouton au Marché : prix fixe, refusé si l'Étable n'est pas prête,
// sans place libre ou sans assez de pièces. Pas de revente.
function buySheep(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (freeSheepPlaces(state) <= 0) return fail('L\'Étable est pleine : achète une place de plus.');
  const price = animalPrice('mouton');
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  const sheep = makeSheep(state);
  p.moutons.push(sheep);
  return { ok: true, cost: price, id: sheep.id };
}

function findSheep(state, id) {
  return state.paturage.moutons.find((m) => m.id === id) || null;
}

// La vache, sur le modèle du mouton (makeCow/buyCow/findCow).
function makeCow(state) {
  const p = state.paturage;
  p.compteurVache += 1;
  return { id: `vache-${p.compteurVache}` };
}

// Achat d'une vache au Marché : prix fixe, refusé si l'Étable n'est pas prête,
// sans 3 places libres (voir freeCowPlaces()) ou sans assez de pièces. Pas de revente.
function buyCow(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (freeCowPlaces(state) <= 0) {
    return fail(`Pas assez de place pour une vache : il lui faut ${DATA.PATURAGE.placesParVache} places libres.`);
  }
  const price = animalPrice('vache');
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  const cow = makeCow(state);
  p.vaches.push(cow);
  return { ok: true, cost: price, id: cow.id };
}

function findCow(state, id) {
  return state.paturage.vaches.find((v) => v.id === id) || null;
}

// Un mouton se tond quand il a été nourri le nombre de nuits voulu (2).
function woolReady(m) {
  return m.laine >= DATA.ANIMAUX.mouton.joursLaine;
}

function sheepToShear(state) {
  return state.paturage.moutons.filter(woolReady).length;
}

/* -- la paille -- */

// Paille en stock.
function strawStock(state) {
  return countItem(state, DATA.PATURAGE.nourriture);
}

// Paille que tous les moutons et toutes les vaches mangent en une nuit.
function strawNeed(state) {
  const A = DATA.ANIMAUX;
  return sheepCount(state) * A.mouton.pailleParNuit + cowCount(state) * A.vache.pailleParNuit;
}

// Paille qui manque pour nourrir tout le monde cette nuit (0 si le stock suffit).
function strawMissing(state) {
  return Math.max(0, strawNeed(state) - strawStock(state));
}

// Compte rendu de la nuit à l'Étable : animaux présents, animaux nourris,
// paille mangée, paille qui a manqué, laine avancée et lait donné.
function newStableReport() {
  return { moutons: 0, vaches: 0, moutonsNourris: 0, vachesNourries: 0, paille: 0, manque: 0 };
}

// Étape nocturne, juste après la ponte : les moutons puis les vaches mangent
// leur paille, dans l'ordre de leur liste, tant qu'il en reste assez pour
// l'animal suivant. Un mouton nourri voit sa laine avancer d'une nuit (jusqu'à
// la tonte) ; une vache nourrie donne son lait. Un animal qui n'a pas mangé ne
// produit rien cette nuit, et rien d'autre ne lui arrive : ni perte, ni maladie.
// La paille ne se partage pas : une vache qui n'a pas ses 2 pailles n'en mange aucune.
function feedLivestock(state) {
  const A = DATA.ANIMAUX;
  const item = DATA.PATURAGE.nourriture;
  const p = state.paturage;
  const rap = newStableReport();
  rap.moutons = p.moutons.length;
  rap.vaches = p.vaches.length;
  const eat = (qty) => {
    if (countItem(state, item) < qty) {
      rap.manque += qty;
      return false;
    }
    takeItem(state, item, qty);
    rap.paille += qty;
    return true;
  };
  for (const m of p.moutons) {
    if (!eat(A.mouton.pailleParNuit)) continue;
    rap.moutonsNourris += 1;
    m.laine = Math.min(A.mouton.joursLaine, (m.laine || 0) + 1);
  }
  let lait = 0;
  for (const v of p.vaches) {
    if (!eat(A.vache.pailleParNuit)) continue;
    rap.vachesNourries += 1;
    lait += A.vache.laitParNuit;
  }
  if (lait > 0) addItem(state, A.vache.lait, lait);
  if (!state.nuit) state.nuit = newNightStats();
  state.nuit.lait = lait;
  state.nuit.etable = rap;
  return rap;
}

// Tonte au clic : 1 laine, le compteur repart de zéro, le mouton reste.
function shear(state, id) {
  const m = findSheep(state, id);
  if (!m) return fail('Mouton introuvable.');
  const M = DATA.ANIMAUX.mouton;
  if (!woolReady(m)) return fail(`La laine n'est pas encore prête (${m.laine} / ${M.joursLaine} nuits nourri).`);
  addItem(state, M.laine, M.laineParTonte);
  m.laine = 0;
  bumpCounter(state, 'laines', M.laineParTonte); // Lot 9
  return { ok: true, laine: M.laineParTonte };
}

/* ---------- Lot 8 : Verger ---------- */

// state.verger = { construit, places, achetes, compteur, arbres }.
// places : emplacements au total (départ compris) ; achetes : emplacements
// achetés en plus (ils fixent le prix du suivant) ; arbres : { id, espece,
// plantee } où plantee est la nuit de plantation.

function orchardFree(state) {
  return Math.max(0, state.verger.places - state.verger.arbres.length);
}

// Prix du prochain emplacement : 50 × 1,25^n (arrondi à l'entier supérieur),
// n = emplacements déjà achetés.
function orchardSlotPrice(state) {
  const E = DATA.VERGER.EMPLACEMENT;
  return growthPrice(E.base, E.croissance, state.verger.achetes);
}

// Aménage le Verger (gratuit tant que DATA.VERGER.CONSTRUCTION vaut 0).
function buildVerger(state) {
  const v = state.verger;
  if (v.construit) return fail('Le Verger est déjà aménagé.');
  const cost = DATA.VERGER.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openVerger(state);
  return { ok: true, cost };
}

function openVerger(state) {
  const v = state.verger;
  v.construit = true;
  if (v.places < DATA.VERGER.EMPLACEMENTS_DEPART) v.places = DATA.VERGER.EMPLACEMENTS_DEPART;
}

function buyOrchardSlot(state) {
  const v = state.verger;
  if (!v.construit) return fail('Aménage d\'abord le Verger (onglet Ferme).');
  if (v.places >= DATA.VERGER.EMPLACEMENTS_MAX) return fail('Le Verger a atteint sa taille maximale (' + DATA.VERGER.EMPLACEMENTS_MAX + ' emplacements).');
  const cost = orchardSlotPrice(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  v.places += 1;
  v.achetes += 1;
  return { ok: true, cost, places: v.places };
}

// Achat d'un arbre au Marché : prix fixe, refusé sans Verger, sans
// emplacement libre ou sans assez de pièces. L'arbre est planté aussitôt.
function buyTree(state, espece) {
  const def = DATA.VERGER.ARBRES[espece];
  if (!def) return fail('Cet arbre n\'est pas en vente.');
  const v = state.verger;
  if (!v.construit) return fail('Aménage d\'abord le Verger (onglet Ferme).');
  if (orchardFree(state) <= 0) return fail('Le Verger est plein : achète un emplacement.');
  if (state.pieces + EPS < def.prix) return fail('Pas assez de pièces.');
  spend(state, def.prix);
  v.compteur += 1;
  const tree = { id: `arbre-${v.compteur}`, espece, plantee: state.day };
  v.arbres.push(tree);
  return { ok: true, cost: def.prix, id: tree.id };
}

// Nuits écoulées depuis la plantation, au réveil (0 le jour de la plantation).
function treeAge(state, tree) {
  return Math.max(0, state.day - tree.plantee);
}

function isTreeAdult(state, tree) {
  return treeAge(state, tree) >= DATA.VERGER.MATURITE;
}

// Fenêtre de production, en numéros de nuit de l'année (1 à 40) : les dernières
// nuits de l'été, puis toute la saison de fin (l'automne).
function orchardWindow() {
  const S = DATA.SAISONS;
  const W = DATA.VERGER.FENETRE;
  const debut = S.ORDRE.indexOf(W.debut.saison) * S.LONGUEUR + (S.LONGUEUR - W.debut.dernieresNuits) + 1;
  const fin = (S.ORDRE.indexOf(W.fin.saison) + 1) * S.LONGUEUR;
  return { debut, fin };
}

// Un arbre adulte donne ses fruits la PERIODE-ième nuit de la fenêtre, puis
// toutes les PERIODE nuits : nuits 18, 21, 24, 27 et 30 de l'année.
function orchardProducesOn(day) {
  const w = orchardWindow();
  const y = yearNight(day);
  if (y < w.debut || y > w.fin) return false;
  return (y - w.debut + 1) % DATA.VERGER.PERIODE === 0;
}

// Nuit (numéro absolu) de la prochaine récolte d'un arbre, à partir de la nuit
// courante comprise : la première nuit de production où il aura MATURITÉ nuits.
function treeNextHarvest(state, tree) {
  for (let d = state.day; d < state.day + 3 * DATA.SAISONS.LONGUEUR * DATA.SAISONS.ORDRE.length; d++) {
    if (orchardProducesOn(d) && d - tree.plantee + 1 >= DATA.VERGER.MATURITE) return d;
  }
  return null;
}

// Étape nocturne (après les moutons) : les arbres adultes donnent leurs fruits
// dans la fenêtre de production. Ils sont adultes à la nuit qui complète leur
// MATURITÉ-ième nuit depuis la plantation.
function growOrchard(state) {
  const v = state.verger;
  if (!v || !v.construit) return;
  if (!state.nuit.fruits) state.nuit.fruits = {};
  if (!orchardProducesOn(state.day)) return;
  for (const tree of v.arbres) {
    if (state.day - tree.plantee + 1 < DATA.VERGER.MATURITE) continue;
    const fruit = DATA.VERGER.ARBRES[tree.espece].fruit;
    addItem(state, fruit, DATA.VERGER.FRUITS);
    state.nuit.fruits[fruit] = (state.nuit.fruits[fruit] || 0) + DATA.VERGER.FRUITS;
  }
}

/* ---------- Lot 5 : stations, recettes, Livre de recette ---------- */

// state.stations = { four|cuisine|moulin|presse: { construit, tache, appareil } }.
// tache : null (libre) ou { recette, resteMs, dureeMs }, en ms à vitesse 1. Au
// Moulin (version 1.1), la tâche porte aussi `enAttente` : le nombre de blés
// déjà sortis du stock qui seront moulus à la suite (voir startMilling()).
// appareil : l'appareil du parc (Moulin, Presse) une fois construit, sinon null.

function isElectricStation(id) {
  return !!DATA.STATIONS[id].electrique;
}

// Vitesse d'une préparation en % : productivité de la famille (préparations
// lancées à la main) ; pour le Moulin et la Presse, aussi le rendement de l'usure.
function stationSpeed(state, id) {
  const st = state.stations[id];
  let v = productivity(state);
  if (isElectricStation(id) && st.appareil) v = Math.floor((v * efficiency(st.appareil)) / 100);
  return v;
}

// Secondes réelles restantes d'une préparation, arrondies à la seconde
// supérieure (0 si la station est libre).
function taskTimeLeft(state, id) {
  const job = state.stations[id].tache;
  if (!job) return 0;
  const v = stationSpeed(state, id);
  return v > 0 ? Math.ceil((job.resteMs * 100) / v / 1000) : Infinity;
}

// Quantité disponible d'un ingrédient : le blé compte celui du Silo.
function ingredientStock(state, item) {
  return item === DATA.SILO.ITEM ? wheatTotal(state) : countItem(state, item);
}

// Objet choisi pour un ingrédient : le premier de ses options en quantité
// suffisante, ou null.
function pickIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => ingredientStock(state, item) + EPS >= ing.qte) || null;
}

// Une ligne par ingrédient (puis une pour l'eau) : { options, qte, have, ok, item }.
// `have` est le meilleur stock parmi les options ; `item` l'option retenue.
function recipeLines(state, id) {
  const r = DATA.recipes[id];
  const lines = r.ingredients.map((ing) => {
    const item = pickIngredient(state, ing);
    const have = Math.max(...ingredientOptions(ing).map((it) => ingredientStock(state, it)));
    return { options: ingredientOptions(ing), qte: ing.qte, have, ok: item !== null, item };
  });
  if (r.eau) lines.push({ eau: true, qte: r.eau, have: Math.floor(state.eauMl / 1000), ok: state.eauMl >= r.eau * 1000, item: null });
  return lines;
}

// État d'une recette pour l'interface : 'absente' (station non construite),
// 'occupee', 'manque' (ingrédients) ou 'pret'.
function recipeStatus(state, id) {
  const r = DATA.recipes[id];
  const st = state.stations[r.station];
  const lines = recipeLines(state, id);
  let code = 'pret';
  if (!recipeUnlocked(state, id)) code = 'verrouillee';
  else if (!st.construit) code = 'absente';
  else if (st.tache && !queueRoom(state, r.station)) code = 'occupee';
  else if (lines.some((l) => !l.ok)) code = 'manque';
  return { code, lignes: lines, ok: code === 'pret', noeud: recipeNode(id) };
}

// Arbre v2 : une recette est libre (RECETTES_LIBRES) ou débloquée par un nœud.
function recipeUnlocked(state, id) {
  return DATA.techtree.RECETTES_LIBRES.includes(id) || techEffects(state, 'recettes').some((l) => l.includes(id));
}

// Nœud qui débloque une recette (null si elle est libre).
function recipeNode(id) {
  if (DATA.techtree.RECETTES_LIBRES.includes(id)) return null;
  return Object.keys(DATA.techtree.noeuds).find((n) => (DATA.techtree.noeuds[n].effet.recettes || []).includes(id)) || null;
}

// Préparations en série : places totales d'un atelier (1 sans le nœud).
function queueCapacity(state) {
  return Math.max(1, techFlag(state, 'fileAttente') || 1);
}

// Reste-t-il une place dans la file d'un atelier occupé ?
function queueRoom(state, stationId) {
  const st = state.stations[stationId];
  const used = (st.tache ? 1 : 0) + (Array.isArray(st.file) ? st.file.length : 0);
  return used < queueCapacity(state);
}

// Démarre la préparation `recette` sur un atelier libre.
function beginTask(state, stationId, recette) {
  const temps = recipeTime(state, recette) * 1000;
  state.stations[stationId].tache = { recette, resteMs: temps, dureeMs: temps };
}

// Annule une préparation en file (pas celle en cours) : ses ingrédients et son
// eau reviennent au stock.
function cancelQueued(state, stationId, index) {
  const st = state.stations[stationId];
  if (!st || !Array.isArray(st.file) || !st.file[index]) return fail('Rien à annuler.');
  const [entry] = st.file.splice(index, 1);
  for (const p of entry.pris || []) {
    if (p.item === DATA.SILO.ITEM) storeWheat(state, p.qte);
    else addItem(state, p.item, p.qte);
  }
  if (entry.eau) state.eauMl = Math.min(tankCapacity(state), state.eauMl + entry.eau * 1000);
  return { ok: true, recette: entry.recette };
}

function takeIngredient(state, item, qty) {
  if (item === DATA.SILO.ITEM) takeWheat(state, qty, 'inventaire');
  else takeItem(state, item, qty);
}

// Lance une préparation : la station doit exister et être libre, les
// ingrédients (et l'eau) présents. Tout est vérifié avant de retirer quoi que
// ce soit ; ensuite les ingrédients partent et le minuteur démarre.
function startRecipe(state, id) {
  const r = DATA.recipes[id];
  if (!r) return fail('Recette inconnue.');
  // Version 1.1 : le blé se moud dans le Moulin lui-même (startMilling()).
  if (r.horsLivre) return fail('Le blé se moud directement au Moulin.');
  const def = DATA.STATIONS[r.station];
  const st = state.stations[r.station];
  if (!recipeUnlocked(state, id)) {
    const n = DATA.techtree.noeuds[recipeNode(id)];
    return fail(`Recette à débloquer dans l'Arbre des technologies${n ? ` (${n.nom})` : ''}.`);
  }
  if (!st.construit) return fail(`Construis d'abord ${def.article} ${def.nom}.`);
  if (st.tache && !queueRoom(state, r.station)) return fail(`${def.nom} : une préparation est déjà en cours.`);
  const lines = recipeLines(state, id);
  const missing = lines.find((l) => !l.ok);
  if (missing) return fail(missing.eau ? 'Pas assez d\'eau dans le réservoir.' : 'Il manque des ingrédients.');
  const pris = [];
  for (const l of lines) {
    if (l.eau) state.eauMl = Math.max(0, state.eauMl - l.qte * 1000);
    else {
      takeIngredient(state, l.item, l.qte);
      pris.push({ item: l.item, qte: l.qte });
    }
  }
  // Arbre v2 : atelier occupé mais file disponible, la préparation attend son
  // tour (ingrédients déjà réservés).
  if (st.tache) {
    if (!Array.isArray(st.file)) st.file = [];
    st.file.push({ recette: id, pris, eau: r.eau || 0 });
    return { ok: true, recette: id, enFile: true };
  }
  // Lot 7 : les paliers « Préparation rapide » raccourcissent la préparation à
  // son lancement (une préparation déjà en cours garde son temps).
  beginTask(state, r.station, id);
  return { ok: true, recette: id };
}

// Termine la préparation d'une station : le produit entre dans l'inventaire
// (et son sous-produit : la paille du blé moulu) et la station se libère.
// Renvoie { item, qty, sousProduit, suite } (ou null si la station était
// libre) ; `suite` : la même préparation repart aussitôt, parce qu'il restait
// du blé en attente au Moulin.
function completeTask(state, id) {
  const st = state.stations[id];
  if (!st.tache) return null;
  const recette = st.tache.recette;
  const enAttente = Math.max(0, Math.floor(Number(st.tache.enAttente) || 0));
  const item = recipeOutput(recette);
  const qty = recipeOutputQty(recette);
  addItem(state, item, qty);
  const extra = DATA.recipes[recette].sousProduit || null;
  if (extra) addItem(state, extra.item, extra.qte);
  st.tache = null;
  noteRecipeDone(state, recette, qty); // Lot 9
  if (enAttente > 0) {
    // Moulin : le blé suivant du lot se moud à la suite.
    beginTask(state, id, recette);
    st.tache.enAttente = enAttente - 1;
  } else if (Array.isArray(st.file) && st.file.length) {
    // Arbre v2 : la préparation suivante de la file démarre toute seule.
    beginTask(state, id, st.file.shift().recette);
  }
  return { item, qty, sousProduit: extra ? { item: extra.item, qty: extra.qte } : null, suite: enAttente > 0 };
}

/* -- version 1.1 : le Moulin moud le blé par quantité -- */

// Blés confiés au Moulin et pas encore moulus : celui en cours et ceux en attente.
function millPending(state) {
  const job = state.stations && state.stations.moulin ? state.stations.moulin.tache : null;
  return job ? 1 + Math.max(0, Math.floor(Number(job.enAttente) || 0)) : 0;
}

// Secondes réelles pour finir tout le blé confié au Moulin, à sa vitesse
// actuelle et s'il ne manque pas d'énergie (0 s'il est libre).
function millTimeLeft(state) {
  const job = state.stations.moulin.tache;
  if (!job) return 0;
  const v = stationSpeed(state, 'moulin');
  if (!(v > 0)) return Infinity;
  const ms = job.resteMs + (millPending(state) - 1) * recipeTime(state, job.recette) * 1000;
  return Math.ceil((ms * 100) / v / 1000);
}

// Moud `qty` blés au Moulin : 1 blé donne 1 farine et 1 paille, en 5 s chacun
// (mêmes temps, énergie et usure qu'une préparation du Moulin). Tout le blé
// demandé sort du stock tout de suite (l'inventaire d'abord, puis le Silo) ; il
// se moud un par un, et la farine et la paille arrivent au fur et à mesure. Si
// le Moulin tourne déjà, le blé s'ajoute à la suite. Refusé si le Moulin n'est
// pas construit, si la quantité n'est pas un entier d'au moins 1, ou s'il n'y a
// pas assez de blé.
function startMilling(state, qty = 1) {
  const st = state.stations.moulin;
  const def = DATA.STATIONS.moulin;
  if (!st.construit) return fail(`Construis d'abord ${def.article} ${def.nom}.`);
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n < 1) return fail('Choisis une quantité de blé.');
  const recette = 'farine';
  const parBle = DATA.recipes[recette].ingredients[0].qte;
  if (wheatTotal(state) + EPS < n * parBle) return fail('Pas assez de blé.');
  takeWheat(state, n * parBle, 'inventaire');
  if (st.tache) {
    st.tache.enAttente = Math.max(0, Math.floor(Number(st.tache.enAttente) || 0)) + n;
  } else {
    beginTask(state, 'moulin', recette);
    st.tache.enAttente = n - 1;
  }
  return { ok: true, quantite: n, enAttente: st.tache.enAttente };
}

// Reprend le blé en attente au Moulin (pas celui qui est en train d'être
// moulu) : il retourne au stock, Silo d'abord.
function cancelMilling(state) {
  const job = state.stations.moulin.tache;
  const n = job ? Math.max(0, Math.floor(Number(job.enAttente) || 0)) : 0;
  if (n <= 0) return fail('Aucun blé en attente au Moulin.');
  job.enAttente = 0;
  storeWheat(state, n * DATA.recipes[job.recette].ingredients[0].qte);
  return { ok: true, rendu: n };
}

// Four et Cuisine : le minuteur avance à la vitesse de la famille, sans énergie.
function runCooking(state, dtMs) {
  if (!state.stations) return;
  for (const id of Object.keys(DATA.STATIONS)) {
    if (isElectricStation(id)) continue;
    const st = state.stations[id];
    if (!st.construit || !st.tache) continue;
    st.tache.resteMs -= Math.floor((dtMs * stationSpeed(state, id)) / 100);
    if (st.tache.resteMs <= 0) completeTask(state, id);
  }
}

// Moulin et Presse : appareils électriques au sens du Lot 1. Ils tirent leur
// énergie par drawEnergy (batteries en sens inverse). Éteints ou en panne, ils
// ne font rien ; sans énergie, ils sont en pause ; avec peu d'énergie, ils
// avancent au prorata. Ils s'usent seulement quand ils tournent (voir tick).
function runElectricStation(state, id, dtMs) {
  const st = state.stations && state.stations[id];
  if (!st || !st.appareil) return;
  const d = st.appareil;
  d.conso = 0;
  if (!st.tache || !d.allume || isBroken(d)) return;
  const speed = stationSpeed(state, id);
  if (!(speed > 0)) return;
  if (loadShedding(state)) return; // arbre v2 : délestage
  // ms de marche nécessaires pour finir, puis ms que l'énergie disponible
  // permet (whParS Wh/s = whParS mWh par ms).
  const whParS = DATA.STATIONS[id].whParS;
  let left = dtMs;
  let got = 0;
  while (left > 0 && st.tache) {
    const job = st.tache;
    const needMs = Math.ceil((job.resteMs * 100) / speed);
    const runMs = Math.min(left, needMs, Math.floor(availableEnergy(state) / whParS));
    if (runMs <= 0) break;
    got += drawEnergy(state, runMs * whParS);
    job.resteMs = runMs >= needMs ? 0 : job.resteMs - Math.floor((runMs * speed) / 100);
    left -= runMs;
    if (job.resteMs > 0) break;
    // Un lot de blé au Moulin : le blé suivant profite du temps qui reste dans ce pas.
    const out = completeTask(state, id);
    if (!out || !out.suite) break;
  }
  d.conso = perSecond(got, dtMs);
}

// Étape nocturne : toute préparation en cours se termine immédiatement, puis
// celles de la file (arbre v2). Au Moulin, seul le blé en train d'être moulu se
// termine : le blé en attente reste au Moulin et reprend au réveil (sinon un
// gros lot lancé juste avant de dormir serait moulu sans électricité ni usure).
function finishPreparations(state) {
  const done = {};
  const add = (item, qty) => { done[item] = (done[item] || 0) + qty; };
  if (state.stations) {
    for (const id of Object.keys(DATA.STATIONS)) {
      for (let out = completeTask(state, id); out; out = completeTask(state, id)) {
        add(out.item, out.qty);
        if (out.sousProduit) add(out.sousProduit.item, out.sousProduit.qty);
        if (out.suite) break;
      }
    }
  }
  state.nuit.termine = done;
  return done;
}

// Construit une station. Le Four ouvre l'onglet Livre de recette ; la Cuisine
// demande le Four ; le Moulin et la Presse deviennent des appareils du parc.
function buildStation(state, id) {
  const def = DATA.STATIONS[id];
  if (!def) return fail('Atelier inconnu.');
  const st = state.stations[id];
  if (st.construit) return fail('Cet atelier est déjà construit.');
  if (def.requiert && !state.stations[def.requiert].construit) {
    const need = DATA.STATIONS[def.requiert];
    return fail(`Construis d'abord ${need.article} ${need.nom}.`);
  }
  if (state.pieces + EPS < def.cout) return fail('Pas assez de pièces.');
  spend(state, def.cout);
  openStation(state, id);
  return { ok: true, cost: def.cout };
}

// Pose la station dans l'état (sans payer) : appareil pour les stations
// électriques, onglets débloqués.
function openStation(state, id) {
  const def = DATA.STATIONS[id];
  const st = state.stations[id];
  st.construit = true;
  if (def.electrique && !st.appareil) st.appareil = makeDevice(id, id, def.cout);
  for (const tab of def.debloque || []) {
    if (!state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
  }
}

/* ---------- Lot 7 : arbre des technologies (v2) ---------- */

// state.technologies = liste des identifiants de nœuds acquis. On ignore les
// identifiants inconnus (sauvegarde importée d'une autre version).
function ownedTechs(state) {
  return Array.isArray(state.technologies) ? state.technologies.filter((id) => DATA.techtree.noeuds[id]) : [];
}

function hasTech(state, id) {
  return ownedTechs(state).includes(id);
}

// Effets acquis portant la clé `key` (dans l'ordre des nœuds acquis).
function techEffects(state, key) {
  const out = [];
  for (const id of ownedTechs(state)) {
    const e = DATA.techtree.noeuds[id].effet;
    if (e && e[key] !== undefined) out.push(e[key]);
  }
  return out;
}

// Effet en % : produit des % acquis, arrondi à chaque étape (100 = sans effet).
function techPct(state, key) {
  return techEffects(state, key).reduce((m, pct) => roundPct(m, pct), 100);
}

// Effet additif (+1 nuit, +1 graine…) : somme des valeurs acquises.
function techSum(state, key) {
  return techEffects(state, key).reduce((t, v) => t + v, 0);
}

// Effet présent (booléen ou objet de réglage) : la dernière valeur acquise, ou null.
function techFlag(state, key) {
  const list = techEffects(state, key);
  return list.length ? list[list.length - 1] : null;
}

// Automatisation d'une tâche ('arrosage', 'recolte', 'semis', 'nourrissage',
// 'tonte') sur un lieu ('potager', 'serre', 'poulailler', 'paturage').
function techAuto(state, tache, lieu) {
  return techEffects(state, 'auto').some((a) => Array.isArray(a[tache]) && a[tache].includes(lieu));
}

// Temps de préparation en % : produit des paliers acquis (80 % puis 64 %).
function prepTimeMult(state) {
  return techPct(state, 'tempsPrepa');
}

// Temps de préparation d'une recette avec les technologies actuelles, en
// secondes entières à vitesse 1 (arrondi à la seconde supérieure).
function recipeTime(state, id) {
  return Math.ceil((DATA.recipes[id].temps * prepTimeMult(state)) / 100);
}

// Niveau d'un bâtiment (0 s'il n'est pas construit).
function buildingLevel(state, id) {
  if (id === 'potager') return state.potager.niveau;
  if (id === 'pompe') return state.pompe.niveau;
  const b = state[id];
  return b && b.construit ? b.niveau : 0;
}

// Un bâtiment, un atelier ou un appareil est-il construit ?
function isBuilt(state, id) {
  if (state.stations && state.stations[id]) return !!state.stations[id].construit;
  if (id === 'potager' || id === 'pompe') return true;
  const b = state[id];
  return !!(b && b.construit);
}

// Chapitre en cours pour les paliers (au-delà du dernier une fois la campagne finie).
function techChapter(state) {
  const c = state.campagne;
  if (!c) return 1;
  return c.fini ? chapterCount() + 1 : c.chapitre;
}

// Prérequis d'un nœud, palier compris : [{ ok, texte }].
function techPrereqs(state, id) {
  const n = DATA.techtree.noeuds[id];
  const B = DATA.techtree.batiments;
  const palier = DATA.techtree.PALIERS[n.palier];
  const list = [{ ok: techChapter(state) >= palier.chapitre, texte: `📖 Palier ${n.palier} (${palier.nom}) : chapitre ${palier.chapitre}` }];
  for (const r of n.requiert) {
    if (r.batiment) {
      const b = B[r.batiment];
      list.push({ ok: buildingLevel(state, r.batiment) >= r.niveau, texte: `${b.icone} ${b.nom} niveau ${r.niveau}` });
    } else if (r.construit) {
      const b = B[r.construit];
      list.push({ ok: isBuilt(state, r.construit), texte: `${b.icone} ${b.nom} construit` });
    } else if (r.appareil) {
      const b = B[r.appareil];
      const have = r.appareil === 'panneau' ? state.panneaux.length : state.batteries.length;
      list.push({ ok: have >= r.nombre, texte: `${b.icone} ${r.nombre} ${b.nom.toLowerCase()}` });
    } else {
      const m = DATA.techtree.noeuds[r.noeud];
      list.push({ ok: hasTech(state, r.noeud), texte: `${m.icone} ${m.nom}` });
    }
  }
  return list;
}

// 'acquis', 'disponible' (prérequis remplis) ou 'verrouille'.
function techStatus(state, id) {
  if (hasTech(state, id)) return 'acquis';
  return techPrereqs(state, id).every((p) => p.ok) ? 'disponible' : 'verrouille';
}

// Points de technologie : { solde, gagnes, maitrise: [ids], libre, annonces }.
function techPoints(state) {
  if (!state.pointsTech || typeof state.pointsTech !== 'object') state.pointsTech = newTechPoints();
  return state.pointsTech;
}

function newTechPoints() {
  return { solde: 0, gagnes: 0, maitrise: [], libre: 0, annonces: [] };
}

// Crédite `n` PT ; `raison` est gardée pour l'annonce à l'interface.
function grantTechPoints(state, n, raison) {
  if (!(n > 0)) return;
  const pt = techPoints(state);
  pt.solde += n;
  pt.gagnes += n;
  pt.annonces.push({ pt: n, raison });
}

function buyTech(state, id) {
  const n = DATA.techtree.noeuds[id];
  if (!n) return fail('Technologie inconnue.');
  if (hasTech(state, id)) return fail('Déjà acquise.');
  if (techStatus(state, id) !== 'disponible') return fail('Prérequis manquants.');
  const pt = techPoints(state);
  if (pt.solde < n.pt) return fail('Pas assez de points de technologie.');
  if (state.pieces + EPS < n.cout) return fail('Pas assez de pièces.');
  spend(state, n.cout);
  pt.solde -= n.pt;
  if (!Array.isArray(state.technologies)) state.technologies = [];
  state.technologies.push(id);
  return { ok: true, cost: n.cout, pt: n.pt };
}

// Valeur d'un jalon de maîtrise.
function masteryValue(state, m) {
  const k = state.campagne ? state.campagne.compteurs : {};
  switch (m.compteur) {
    case 'litres': return Math.floor((k.eauMl || 0) / 1000);
    case 'plats': return Array.isArray(k.plats) ? k.plats.length : 0;
    case 'nuits': return Math.max(0, state.day - 1);
    default: return k[m.compteur] || 0;
  }
}

// Jalons de maîtrise atteints : 1 PT chacun, une seule fois.
function checkMastery(state) {
  if (!state.campagne) return 0;
  const pt = techPoints(state);
  let n = 0;
  for (const m of DATA.techtree.POINTS.MAITRISE) {
    if (pt.maitrise.includes(m.id) || masteryValue(state, m) < m.cible) continue;
    pt.maitrise.push(m.id);
    grantTechPoints(state, 1, `Maîtrise : ${m.libelle}`);
    n++;
  }
  return n;
}

// Progression affichée dans une branche (les améliorations se font sur les
// cartes des bâtiments) : [{ cle, nom, icone, type, ... }].
function techProgress(state, brancheId) {
  const branche = DATA.techtree.branches.find((b) => b.id === brancheId);
  return branche.suivi.map((cle) => {
    const def = DATA.techtree.suivi[cle];
    const e = { cle, nom: def.nom, icone: def.icone, type: def.type, note: def.note || null, max: DATA.LEVEL_MAX };
    if (def.type === 'appareils') {
      e.niveaux = (cle === 'panneau' ? state.panneaux : state.batteries).map((d) => d.niveau);
    } else if (def.type === 'niveau') {
      e.niveau = buildingLevel(state, cle);
      e.automatise = isAutomated(state, cle);
    } else {
      e.ateliers = Object.keys(DATA.STATIONS).map((id) => ({
        id, nom: DATA.STATIONS[id].nom, icone: DATA.STATIONS[id].icone, construit: !!(state.stations && state.stations[id].construit),
      }));
    }
    return e;
  });
}

// Première fois à SEUIL_PIECES pièces : l'onglet s'ajoute et ne disparaît plus.
function refreshUnlocks(state) {
  const tab = DATA.TECHNO.ONGLET;
  if (state.pieces + EPS >= DATA.TECHNO.SEUIL_PIECES && !state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
}

/* ---------- Lot 7 : automatisations de la nuit ---------- */

function newAutoReport() {
  return { potager: false, serre: false, poulailler: false, arrosees: 0, sansEau: 0, recoltes: {}, semees: 0, sansGraine: 0, nourries: 0, sansBle: 0, tondus: 0 };
}

// Tâches automatisables par lieu (arbre v2) : un lieu est « automatisé » dès
// qu'une de ses tâches l'est.
const AUTO_TACHES = {
  potager: ['arrosage', 'recolte', 'semis'],
  serre: ['arrosage', 'recolte', 'semis'],
  poulailler: ['nourrissage'],
  paturage: ['tonte'],
};

function isAutomated(state, id) {
  return (AUTO_TACHES[id] || []).some((t) => techAuto(state, t, id));
}

// Semis automatique d'une parcelle qui vient d'être récoltée. Renvoie null si
// le semis ne s'applique pas (nœud absent ou parcelle désactivée), true si la
// parcelle est replantée, false s'il n'y a pas de graine au-delà de la réserve
// de semences.
function autoReplant(state, plot, harvested) {
  if (!techAuto(state, 'semis', plot.lieu)) return null;
  const mode = plot.semis || 'meme';
  if (mode === 'off') return null;
  const culture = mode === 'verrou' && plot.verrou && DATA.crops[plot.verrou] ? plot.verrou : harvested;
  if (!DATA.crops[culture].lieux.includes(plot.lieu)) return false;
  const reserve = state.famille.reserve[seedItem(culture)] || 0;
  if (seedStock(state, culture) - reserve < 1 - EPS) return false;
  return plant(state, plot.id, culture).ok === true;
}

// Réglage du semis automatique d'une parcelle : 'meme', 'off' ou 'verrou' (avec
// la culture à verrouiller, plantable dans ce lieu).
function setSemis(state, plotId, mode, culture) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!['meme', 'off', 'verrou'].includes(mode)) return fail('Réglage inconnu.');
  if (mode === 'verrou') {
    const def = DATA.crops[culture];
    if (!def) return fail('Culture inconnue.');
    if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
    plot.verrou = culture;
  } else {
    plot.verrou = null;
  }
  plot.semis = mode;
  return { ok: true };
}

// Étape nocturne (juste après le repas) : automatisations du niveau 5.
// Zone de culture et Serre : récolte des parcelles mûres (sauf celles montées en
// graine), semis automatique, puis arrosage de toutes les parcelles plantées.
// Poulailler : nourrissage. Rien n'est réduit par la productivité ; si l'eau ou
// le blé manquent, on sert ce qu'on peut et le rapport le signale au réveil.
function autoTasks(state) {
  const rap = newAutoReport();
  const zones = [
    { id: 'potager', plots: state.potager.parcelles },
    { id: 'serre', plots: state.serre && state.serre.construit ? state.serre.parcelles : [] },
  ];
  const prioritaire = !!techFlag(state, 'arrosagePrioritaire');
  for (const zone of zones) {
    const recolte = techAuto(state, 'recolte', zone.id);
    const arrosage = techAuto(state, 'arrosage', zone.id);
    if (!recolte && !arrosage) continue;
    rap[zone.id] = true;
    if (recolte) {
      for (const p of zone.plots) {
        if (!p.culture || !isMature(p) || p.montee) continue;
        const culture = p.culture;
        const r = harvest(state, p.id, true);
        if (!r.ok) continue;
        for (const [item, qty] of Object.entries(r.items)) rap.recoltes[item] = (rap.recoltes[item] || 0) + qty;
        const replanted = autoReplant(state, p, culture);
        if (replanted === true) rap.semees += 1;
        else if (replanted === false) rap.sansGraine += 1;
      }
    }
    if (arrosage) {
      let aArroser = zone.plots.filter((p) => p.culture && !p.arrose && !isMature(p));
      // Gestion intelligente de l'eau : les plantes les plus proches de la récolte d'abord.
      if (prioritaire) aArroser = aArroser.slice().sort((x, y) => (DATA.crops[x.culture].stades - x.stade) - (DATA.crops[y.culture].stades - y.stade));
      for (const p of aArroser) {
        if (water(state, p.id).ok) rap.arrosees += 1;
        else rap.sansEau += 1;
      }
    }
  }
  if (techAuto(state, 'nourrissage', 'poulailler')) {
    rap.poulailler = true;
    if (state.poulailler.poules > 0) {
      const before = state.poulailler.nourries;
      feedAllHens(state, true);
      rap.nourries = state.poulailler.nourries - before;
      rap.sansBle = hensToFeed(state);
    }
  }
  // Tonte planifiée : les moutons dont la laine est prête (avant qu'ils
  // mangent : la laine repart ainsi dès cette nuit).
  if (techAuto(state, 'tonte', 'paturage') && state.paturage && state.paturage.construit) {
    for (const m of state.paturage.moutons) if (woolReady(m) && shear(state, m.id).ok) rap.tondus += 1;
  }
  state.nuit.auto = rap;
  return rap;
}

// Arbre v2 (Récupérateur d'eau de pluie) : chaque nuit, des litres selon la
// saison entrent dans le réservoir, sans électricité, dans la limite de sa place.
function rainNight(state) {
  const pluie = techFlag(state, 'pluie');
  if (!state.nuit) state.nuit = newNightStats();
  if (!pluie) return 0;
  const ml = Math.min((pluie[currentSeason(state)] || 0) * 1000, Math.max(0, tankCapacity(state) - state.eauMl));
  state.eauMl += ml;
  state.nuit.pluie = Math.floor(ml / 1000);
  return ml;
}

// Arbre v2 (Entretien automatique) : chaque nuit, les appareils à entretenir
// (sans être en panne) le sont, au prix normal, tant que les pièces suffisent.
function autoMaintain(state) {
  if (!state.nuit) state.nuit = newNightStats();
  state.nuit.entretiens = [];
  if (!techFlag(state, 'entretienAuto')) return [];
  for (const d of allDevices(state)) {
    if (!needsService(d)) continue;
    const r = maintainDevice(state, d.id);
    if (r.ok) state.nuit.entretiens.push({ id: d.id, cost: r.cost });
  }
  return state.nuit.entretiens;
}

// Arbre v2 (Outils de jardin) : « Arroser tout » d'un lieu (au clic : chaque
// parcelle compte comme un arrosage manuel). Renvoie { ok, arrosees, sansEau }.
// Arbre v2 (Routine familiale) : réglage « Dormir tout seul ».
function setRoutine(state, on) {
  if (on && !techFlag(state, 'routine')) return fail('Débloque la Routine familiale dans l\'Arbre des technologies.');
  state.routine = !!on;
  return { ok: true, routine: state.routine };
}

// La famille va-t-elle se coucher toute seule maintenant ? (jeu ouvert seulement :
// l'interface l'appelle à chaque image ; le hors-ligne ne fait passer aucune nuit)
function routineDue(state) {
  return !!(state.routine && techFlag(state, 'routine') && canSleep(state));
}

function waterAll(state, lieu) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('arroser')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  let arrosees = 0;
  let sansEau = 0;
  for (const p of allPlots(state).filter((x) => x.lieu === lieu && x.culture && !x.arrose && !isMature(x))) {
    if (water(state, p.id).ok) arrosees += 1;
    else sansEau += 1;
  }
  if (arrosees === 0 && sansEau === 0) return fail('Rien à arroser.');
  return { ok: true, arrosees, sansEau };
}

// Arbre v2 (Outils de jardin) : « Récolter tout » d'un lieu (au clic, avec la
// productivité). Renvoie { ok, recoltees, items }.
function harvestAll(state, lieu) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('recolter')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  const items = {};
  let recoltees = 0;
  for (const p of allPlots(state).filter((x) => x.lieu === lieu && x.culture && isMature(x))) {
    const r = harvest(state, p.id);
    if (!r.ok) continue;
    recoltees += 1;
    for (const [item, qty] of Object.entries(r.items)) items[item] = (items[item] || 0) + qty;
  }
  if (recoltees === 0) return fail('Rien à récolter.');
  return { ok: true, recoltees, items };
}

/* ---------- Lot 9 : autonomie et chapitres ---------- */

// state.campagne = { chapitre, fini, annonces, historique, compteurs }.
// chapitre : chapitre en cours (1 à 7) ; fini : la campagne est terminée (mode
// libre, tout est débloqué) ; annonces : chapitres terminés dont l'écran de fin
// n'a pas encore été vu [{ chapitre, nuit }] ; historique : autonomie de chaque
// nuit [{ nuit, pct, energie }] ; compteurs : eau pompée (mL), record d'énergie
// stockée (mWh), carottes récoltées, nuits de ponte d'affilée, pains cuits, plats
// différents préparés, laines tondues, nuits à 100 % d'affilée, suivi de l'hiver.
function newCampaign() {
  return {
    chapitre: 1,
    fini: false,
    annonces: [],
    historique: [],
    compteurs: newCampaignCounters(),
  };
}

function newCampaignCounters() {
  return {
    eauMl: 0, // eau pompée au total (mL)
    mwhMax: 0, // record d'énergie stockée (mWh)
    carottes: 0,
    serieOeufs: 0,
    pains: 0,
    plats: [],
    laines: 0,
    serie100: 0,
    nuits100: 0, // nuits à 100 % d'autonomie au total (jalon de maîtrise)
    hiver: null, // hiver en cours de suivi : { debut, nuits, somme, soins }
    hiverDernier: null, // dernier hiver terminé : { moyenne, sansSoin, reussi }
    hiverReussi: false,
  };
}

/* -- autonomie -- */

// Autonomie d'une nuit en % : énergie « produit » mangée ÷ besoin, plafonnée à 100.
function autonomyPercent(energieProduit, besoin) {
  if (!(besoin > 0)) return 0;
  return Math.min(100, Math.floor((energieProduit * 100) / besoin)); // % entier, vers le bas
}

// Part de `qty` unités qui vient de lots « produit », en parcourant les lots dans
// l'ordre où on les retire (sans rien modifier).
function producedShare(lots, qty) {
  let rest = qty;
  let produit = 0;
  for (const lot of lots) {
    if (rest <= 0) break;
    const n = Math.min(lot.qty, rest);
    if (lot.origin === DATA.ORIGINE.PRODUIT) produit += n;
    rest -= n;
  }
  return produit;
}

// Autonomie prévue pour la nuit qui vient (repas prévu, origines comprises).
function plannedAutonomy(state) {
  if (state.repas) return state.repas.autonomie; // le repas de 19 h est déjà pris
  const plan = planMeal(state);
  let produit = 0;
  for (const [item, n] of Object.entries(plan.mange)) {
    const cold = plan.froid[item] || 0;
    const energie = DATA.items[item].energie;
    produit += producedShare(lotsOf(state, item), n - cold) * energie;
    if (cold > 0) produit += producedShare(fridgeLots(state, item), cold) * energie;
  }
  return autonomyPercent(produit, plan.besoin);
}

function autonomyHistory(state, count = DATA.AUTONOMIE.GRAPHIQUE_NUITS) {
  const h = state.campagne && Array.isArray(state.campagne.historique) ? state.campagne.historique : [];
  return h.slice(-count);
}

// Autonomie de la dernière nuit (0 avant la première nuit).
function lastAutonomy(state) {
  const h = autonomyHistory(state, 1);
  return h.length ? h[0].pct : 0;
}

/* -- chapitres et déblocages -- */

function chapterCount() {
  return DATA.CHAPITRES.liste.length;
}

// Chapitre atteint : 1 à 7 pendant la campagne, 8 en mode libre (tout est débloqué).
function chapterReached(state) {
  const c = state.campagne;
  if (!c) return chapterCount() + 1;
  return c.fini ? chapterCount() + 1 : c.chapitre;
}

// Numéro (1 à 7) du chapitre qui débloque cet élément ; 0 s'il est disponible dès
// le départ.
function unlockChapter(id) {
  const i = DATA.CHAPITRES.liste.findIndex((ch) => ch.debloque.includes(id));
  return i < 0 ? 0 : i + 1;
}

function isUnlocked(state, id) {
  return chapterReached(state) >= unlockChapter(id);
}

// Numéro du premier chapitre qui porte un objectif de ce type.
function objectiveChapter(type) {
  return DATA.CHAPITRES.liste.findIndex((ch) => ch.objectifs.some((o) => o.type === type)) + 1;
}

function objectiveDef(type) {
  for (const ch of DATA.CHAPITRES.liste) {
    const o = ch.objectifs.find((x) => x.type === type);
    if (o) return o;
  }
  return null;
}

// Une culture est-elle débloquée ? Il faut son propre déblocage de chapitre
// (le tournesol n'arrive qu'au chapitre 4) et, si elle en demande un autre
// (`deblocage` : les cultures de plein champ attendent 'champ', au chapitre 3),
// celui-là aussi.
function cropUnlocked(state, culture) {
  const requis = DATA.crops[culture].deblocage;
  return isUnlocked(state, culture) && (!requis || isUnlocked(state, requis));
}

// Cultures qu'on peut planter dans ce lieu avec les chapitres atteints. Comme
// pour les bâtiments, c'est un masquage : plant() lui-même reste libre.
function plantableCropsFor(state, lieu) {
  return plantableCrops(lieu).filter((c) => cropUnlocked(state, c));
}

function bumpCounter(state, key, amount) {
  const c = state.campagne;
  if (c && amount > 0) c.compteurs[key] = (c.compteurs[key] || 0) + amount;
}

// Record d'énergie stockée : somme de la charge des batteries.
function noteEnergyRecord(state) {
  const c = state.campagne;
  if (!c) return;
  const total = state.batteries.reduce((t, b) => t + b.chargeMwh, 0);
  if (!(total <= c.compteurs.mwhMax)) c.compteurs.mwhMax = total;
}

// Une recette vient de se terminer : pain cuit, ou plat différent préparé. Les
// transformations (Moulin, Presse) ne comptent ni comme pain ni comme plat.
function noteRecipeDone(state, recette, qty) {
  const c = state.campagne;
  const r = DATA.recipes[recette];
  if (!c || !r || r.transformation) return;
  const pain = objectiveDef('pains');
  if (pain && recette === pain.recette) {
    c.compteurs.pains += qty;
    return;
  }
  const exclus = (objectiveDef('plats') || {}).exclut || [];
  if (!exclus.includes(recette) && !c.compteurs.plats.includes(recette)) c.compteurs.plats.push(recette);
}

// Valeur actuelle d'un objectif.
function objectiveValue(state, obj) {
  const k = state.campagne.compteurs;
  switch (obj.type) {
    case 'litres': return Math.floor((k.eauMl || 0) / 1000);
    case 'wh': return Math.floor((k.mwhMax || 0) / 1000);
    case 'carottes': return k.carottes;
    case 'autonomie': return lastAutonomy(state);
    case 'pontes': return k.serieOeufs;
    case 'sante': return averageHealth(state);
    case 'pains': return k.pains;
    case 'plats': return k.plats.length;
    case 'laines': return k.laines;
    case 'hiver': return k.hiverReussi ? 1 : 0;
    case 'serie100': return k.serie100;
    default: return 0;
  }
}

// Progression d'un chapitre : { chapitre, titre, icone, intro, objectifs: [{ ...objectif,
// valeur, ok, ratio }], fait }.
function chapterProgress(state, chapitre = state.campagne.chapitre) {
  const def = DATA.CHAPITRES.liste[chapitre - 1];
  const objectifs = def.objectifs.map((o) => {
    const valeur = objectiveValue(state, o);
    return { ...o, valeur, ok: valeur + EPS >= o.cible, ratio: Math.max(0, Math.min(1, valeur / o.cible)) };
  });
  return { chapitre, titre: def.titre, icone: def.icone, intro: def.intro, objectifs, fait: objectifs.every((o) => o.ok) };
}

// Terminer le chapitre en cours : on l'annonce, puis le suivant s'ouvre (ou la
// campagne s'achève, mode libre).
function completeChapter(state) {
  const c = state.campagne;
  if (!c || c.fini) return fail('La campagne est terminée.');
  c.annonces.push({ chapitre: c.chapitre, nuit: state.day });
  // Arbre v2 : chaque chapitre terminé rapporte des points de technologie.
  grantTechPoints(state, DATA.techtree.POINTS.CHAPITRES[c.chapitre - 1] || 0, `Chapitre ${c.chapitre} terminé`);
  if (c.chapitre >= chapterCount()) c.fini = true;
  else c.chapitre += 1;
  return { ok: true, chapitre: c.chapitre, fini: c.fini };
}

// Passe au chapitre suivant tant que l'objectif du chapitre en cours est rempli.
// Renvoie le nombre de chapitres terminés. Appelée à chaque tick et à chaque réveil.
function updateChapters(state) {
  const c = state.campagne;
  if (!c) return 0;
  let done = 0;
  while (!c.fini && done < chapterCount() && chapterProgress(state).fait) {
    completeChapter(state);
    done++;
  }
  checkMastery(state); // Arbre v2 : jalons de maîtrise
  deliverMail(state); // version 1.3 : le courrier que ce stade de la partie fait arriver
  return done;
}

/* ---------- version 1.3 : le courrier ---------- */

function mailbox(state) {
  return Array.isArray(state.courrier) ? state.courrier : [];
}

function mailReceived(state, id) {
  return mailbox(state).some((l) => l.id === id);
}

// Lettres pas encore lues, dans l'ordre d'arrivée.
function unreadMail(state) {
  return mailbox(state).filter((l) => !l.lu);
}

// La condition d'une lettre est-elle remplie ?
function mailDue(state, def) {
  const q = def.quand || {};
  if (q.debloque) return !!state.campagne && isUnlocked(state, q.debloque);
  return false;
}

// Fait arriver les lettres dont la condition vient d'être remplie : les cadeaux
// vont dans l'inventaire, la lettre dans state.courrier (non lue). Une lettre
// n'arrive qu'une fois ; une partie qui remplissait déjà la condition avant la
// version 1.3 la reçoit au premier passage. Renvoie les identifiants arrivés.
function deliverMail(state) {
  const arrivees = [];
  for (const [id, def] of Object.entries(DATA.COURRIER)) {
    if (mailReceived(state, id) || !mailDue(state, def)) continue;
    if (!Array.isArray(state.courrier)) state.courrier = [];
    for (const [item, qty] of Object.entries(def.cadeaux || {})) addItem(state, item, qty);
    state.courrier.push({ id, nuit: state.day, lu: false });
    arrivees.push(id);
  }
  return arrivees;
}

// Le joueur a ouvert la lettre : elle reste dans le courrier, marquée lue.
function readMail(state, id) {
  const l = mailbox(state).find((x) => x.id === id);
  if (!l || !DATA.COURRIER[id]) return fail('Lettre introuvable.');
  l.lu = true;
  return { ok: true, id };
}

// Le joueur a vu l'écran de fin du chapitre : on l'enlève de la file.
function acknowledgeChapter(state) {
  const c = state.campagne;
  if (!c || !c.annonces.length) return fail('Rien à annoncer.');
  c.annonces.shift();
  return { ok: true, restantes: c.annonces.length };
}

/* -- compteurs de nuit -- */

// Suivi de l'hiver du chapitre 6 : il commence à la première nuit de la saison
// (si le chapitre est déjà atteint), doit être suivi nuit après nuit, et n'est
// réussi que s'il compte toutes les nuits de la saison, à `moyenne` % d'autonomie
// en moyenne, sans soin payé entre la première et la dernière nuit.
function trackWinter(state, pct) {
  const k = state.campagne.compteurs;
  const obj = objectiveDef('hiver');
  if (!obj || k.hiverReussi || chapterReached(state) < objectiveChapter('hiver')) return;
  const S = DATA.SAISONS;
  const day = state.day;
  if (S.ORDRE[seasonIndex(day)] !== obj.saison) {
    k.hiver = null;
    return;
  }
  const night = ((Math.max(1, day) - 1) % S.LONGUEUR) + 1;
  // Soins déjà payés au matin de la première nuit : ceux d'aujourd'hui comptent dans l'hiver.
  if (night === 1) k.hiver = { debut: day, nuits: 0, somme: 0, soins: state.famille.soinsPayes - (state.jour.soins || 0) };
  const w = k.hiver;
  if (!w || w.debut + w.nuits !== day) {
    k.hiver = null; // hiver commencé en cours de route : il ne compte pas
    return;
  }
  w.nuits += 1;
  w.somme += pct;
  if (night < S.LONGUEUR) return;
  const moyenne = Math.floor(w.somme / w.nuits);
  const sansSoin = state.famille.soinsPayes <= w.soins;
  const reussi = w.nuits === S.LONGUEUR && moyenne + EPS >= obj.moyenne && sansSoin;
  k.hiverDernier = { moyenne, sansSoin, reussi };
  if (reussi) k.hiverReussi = true;
  k.hiver = null;
}

// Première nuit (≥ `day`) de la saison donnée.
function nextSeasonStart(day, saison) {
  const S = DATA.SAISONS;
  const base = day - yearNight(day);
  let start = base + S.ORDRE.indexOf(saison) * S.LONGUEUR + 1;
  if (start < day) start += S.LONGUEUR * S.ORDRE.length;
  return start;
}

// Où en est l'objectif de l'hiver (pour l'interface) : 'reussi', 'suivi' (hiver
// en cours de suivi depuis sa première nuit), 'manque' (la saison est commencée
// sans avoir été suivie : elle ne compte pas) ou 'attente' (la saison viendra).
function winterStatus(state) {
  const k = state.campagne.compteurs;
  const obj = objectiveDef('hiver');
  const prochaine = nextSeasonStart(state.day, obj.saison);
  const dernier = k.hiverDernier;
  if (k.hiverReussi) return { etat: 'reussi', prochaine, dernier };
  if (k.hiver) {
    return {
      etat: 'suivi', prochaine, dernier, nuits: k.hiver.nuits,
      moyenne: k.hiver.nuits ? k.hiver.somme / k.hiver.nuits : 0,
      soinPaye: state.famille.soinsPayes > k.hiver.soins,
    };
  }
  const enCours = DATA.SAISONS.ORDRE[seasonIndex(state.day)] === obj.saison;
  return { etat: enCours && prochaine !== state.day ? 'manque' : 'attente', prochaine, dernier };
}

// Fin de la nuit (avant le passage au jour suivant) : autonomie de la nuit dans
// l'historique, séries d'affilée (remises à zéro dès qu'une nuit les interrompt),
// suivi de l'hiver.
function recordNight(state) {
  const c = state.campagne;
  if (!c) return null;
  const n = state.nuit;
  const energie = n.energieProduit || 0;
  const pct = autonomyPercent(energie, n.besoin);
  n.autonomie = pct;
  c.historique.push({ nuit: state.day, pct, energie });
  const max = DATA.AUTONOMIE.HISTORIQUE_MAX;
  if (c.historique.length > max) c.historique.splice(0, c.historique.length - max);
  const k = c.compteurs;
  const reached = chapterReached(state);
    if (reached >= objectiveChapter('pontes')) k.serieOeufs = (n.oeufs || 0) > 0 ? k.serieOeufs + 1 : 0;
  if (reached >= objectiveChapter('serie100')) k.serie100 = pct >= 100 ? k.serie100 + 1 : 0;
  // Arbre v2 : nuits à 100 % au total, et en mode libre 1 PT toutes les N nuits à 100 %.
  if (pct >= 100) {
    k.nuits100 = (k.nuits100 || 0) + 1;
    if (c.fini) {
      const pt = techPoints(state);
      pt.libre += 1;
      if (pt.libre % DATA.techtree.POINTS.MODE_LIBRE_NUITS_100 === 0) grantTechPoints(state, 1, 'Mode libre : nuits à 100 %');
    }
  }
  trackWinter(state, pct);
  return pct;
}

/* -- ce que possède une partie (migration) -- */

// L'ancien Champ d'une sauvegarde d'avant la version 15 (MIGRATIONS[14]), ou
// null : une partie à jour n'a plus ce bâtiment. Ne sert qu'aux migrations.
function legacyChamp(state) {
  return state.champ && typeof state.champ === 'object' ? state.champ : null;
}

// Parcelles de la Zone de culture d'une sauvegarde, ancienne (Potager + Champ) ou à jour.
function ownedPlots(state) {
  const list = (b) => (b && Array.isArray(b.parcelles) ? b.parcelles : []);
  return [...list(state.potager), ...list(legacyChamp(state))];
}

// Une partie possède-t-elle déjà cet élément débloqué par un chapitre ?
function ownsElement(state, id) {
  const built = (b) => !!(b && b.construit);
  switch (id) {
    // 'champ' : l'ancien Champ construit (sauvegarde d'avant la version 15), ou
    // une culture de plein champ en terre.
    case 'champ': return built(legacyChamp(state)) || ownedPlots(state).some((p) => p && p.culture && DATA.crops[p.culture] && DATA.crops[p.culture].deblocage === 'champ');
    case 'silo': return built(state.silo);
    case 'poulailler': return built(state.poulailler) || (state.poulailler && state.poulailler.poules > 0);
    case 'four': case 'cuisine': case 'moulin': case 'presse':
      return built(state.stations && state.stations[id]);
    case 'tournesol':
      return ownedPlots(state).some((p) => p && p.culture === 'tournesol');
    case 'paturage': return built(state.paturage);
    case 'moutons': return !!(state.paturage && Array.isArray(state.paturage.moutons) && state.paturage.moutons.length > 0);
    case 'serre': return built(state.serre);
    case 'verger': return built(state.verger) || !!(state.verger && Array.isArray(state.verger.arbres) && state.verger.arbres.length > 0);
    case 'frigo': return built(state.frigo);
    default: return false;
  }
}

// Chapitre d'une ancienne partie : le plus avancé de ceux dont elle possède déjà
// un élément. Sans aucun élément débloqué : chapitre 2 si elle a déjà passé une
// nuit ou agrandi le Potager, sinon chapitre 1.
function inferChapter(state) {
  let chapitre = 0;
  for (const ch of DATA.CHAPITRES.liste) {
    for (const id of ch.debloque) {
      if (ownsElement(state, id)) chapitre = Math.max(chapitre, unlockChapter(id));
    }
  }
  if (chapitre > 0) return chapitre;
  const niveau = state.potager && typeof state.potager.niveau === 'number' ? state.potager.niveau : 1;
  return (typeof state.day === 'number' && state.day > 1) || niveau > 1 ? 2 : 1;
}

/* ---------- la nuit ---------- */

function canSleep(state) {
  return state.awakeMs >= awakeRequired(state) * 1000;
}

function buildMorningReport(state) {
  const aSurveiller = (d) => ({ id: d.id, type: d.type, usure: d.usure });
  return {
    nuit: state.day,
    energie: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
    energiePerdue: state.jour.perdue,
    eau: state.eauMl,
    capaciteEau: tankCapacity(state),
    aEntretenir: allDevices(state).filter(needsService).map(aSurveiller),
    enPanne: allDevices(state).filter(isBroken).map(aSurveiller),
    // Lot 2 : repas, santé et récoltes prêtes.
    besoin: state.nuit.besoin,
    energieMangee: state.nuit.energie,
    couverture: state.nuit.couverture,
    mange: { ...state.nuit.mange },
    santeAvant: state.nuit.santeAvant,
    santeApres: state.nuit.santeApres,
    nouveauxMalades: [...state.nuit.nouveauxMalades],
    pretes: readyCrops(state),
    // Lot 3 : ce qui a péri cette nuit, et ce qui périra à la prochaine.
    perimes: { ...(state.nuit.perdus || {}) },
    aPerimer: expiringSoon(state),
    // Lot 4 : œufs pondus cette nuit, blé mangé par les poules pendant la journée.
    oeufs: state.nuit.oeufs || 0,
    bleConsomme: state.jour.ble || 0,
    poules: state.poulailler.poules,
    // Lot 5 : bonus de santé des plats mangés, préparations terminées pendant la nuit.
    bonusPlats: state.nuit.bonusPlats || 0,
    termine: { ...(state.nuit.termine || {}) },
    // Lot 6 : moutons présents et moutons dont la laine est prête à tondre.
    moutons: state.paturage.moutons.length,
    lainePrete: sheepToShear(state),
    // Vaches présentes et lait donné cette nuit.
    vaches: state.paturage.vaches.length,
    lait: state.nuit.lait || 0,
    // Version 1.1 : la nuit à l'Étable (animaux nourris, paille mangée, paille
    // qui a manqué), la paille en stock au réveil et celle qu'il faudra ce soir.
    etable: { ...newStableReport(), ...(state.nuit.etable || {}) },
    paille: strawStock(state),
    pailleBesoin: strawNeed(state),
    // Lot 7 : ce que les automatisations ont fait (ou n'ont pas pu faire) cette nuit.
    auto: { ...newAutoReport(), ...(state.nuit.auto || {}), recoltes: { ...((state.nuit.auto || {}).recoltes || {}) } },
    // Lot 8 : saison du réveil, fruits du verger, nuit du frigo (mWh prélevés,
    // panne de froid, lots qui ont perdu une nuit) et contenu du frigo.
    saison: currentSeason(state),
    nuitDeSaison: seasonNight(state),
    fruits: { ...(state.nuit.fruits || {}) },
    frigo: {
      construit: !!state.frigo.construit,
      mwh: (state.nuit.frigo || {}).mwh || 0,
      panne: !!(state.nuit.frigo || {}).panne,
      vieillis: !!(state.nuit.frigo || {}).vieillis,
      unites: fridgeUnits(state),
      couvreLaNuit: fridgeCoversNight(state),
    },
    // Arbre v2 : eau de pluie reçue et appareils entretenus automatiquement.
    pluie: state.nuit.pluie || 0,
    entretiens: [...(state.nuit.entretiens || [])],
    // Lot 9 : autonomie de la nuit, chapitre en cours et chapitres terminés au réveil.
    autonomie: state.nuit.autonomie || 0,
    energieProduit: state.nuit.energieProduit || 0,
    chapitre: state.campagne ? state.campagne.chapitre : 0,
    chapitresTermines: state.campagne ? state.campagne.annonces.map((a) => a.chapitre) : [],
  };
}

// Résumé de réveil allégé : ce que la ferme a produit pendant la nuit, regroupé par
// produit { item: quantité } = œufs pondus + lait + fruits du verger + récoltes
// des automatisations. (Les « récoltes prêtes » à cueillir ne comptent pas : ce n'est
// pas encore récolté.) Pure : ne lit que le rapport.
function nightHarvest(report) {
  const total = {};
  const add = (item, qty) => {
    const n = Math.floor((Number(qty) || 0) + EPS);
    if (n > 0 && DATA.items[item]) total[item] = (total[item] || 0) + n;
  };
  add('oeuf', report.oeufs);
  add('lait', report.lait);
  for (const [item, qty] of Object.entries(report.fruits || {})) add(item, qty);
  for (const [item, qty] of Object.entries((report.auto || {}).recoltes || {})) add(item, qty);
  return total;
}

// Tri stable : quantité décroissante, puis nom (ordre alphabétique français).
// Renvoie { affiches: [{ item, qte }], reste: [{ item, qte }] } avec au plus `limite` produits affichés.
function wakeHarvestList(report, limite = DATA.REVEIL.RECOLTE_MAX) {
  const rows = Object.entries(nightHarvest(report))
    .map(([item, qte]) => ({ item, qte }))
    .sort((x, y) => y.qte - x.qte || DATA.items[x.item].nom.localeCompare(DATA.items[y.item].nom, 'fr'));
  return { affiches: rows.slice(0, limite), reste: rows.slice(limite) };
}

// Les deux indicateurs du résumé de réveil, en entiers (arrondi à l'unité inférieure,
// comme formatPercent) : autonomie de la nuit et santé moyenne de la famille, en %.
function wakeSummary(report) {
  const floor = (x) => Math.floor((Number(x) || 0) + EPS);
  return { autonomie: floor(report.autonomie), sante: floor(report.santeApres), recolte: wakeHarvestList(report) };
}

// Ne fait rien tant que l'éveil minimal n'est pas atteint (renvoie null).
// Sinon : étapes nocturnes dans l'ordre, jour suivant, éveil remis à 0
// (l'heure repart à 6 h), rapport de réveil.
function sleep(state) {
  if (!canSleep(state)) return null;
  state.nuit = newNightStats();
  for (const step of NIGHT_STEPS) step(state);
  recordNight(state); // Lot 9 : autonomie de la nuit, séries et hiver (nuit encore = state.day)
  state.day += 1;
  state.awakeMs = 0;
  refreshUnlocks(state);
  updateChapters(state); // Lot 9 : un chapitre peut se terminer avec le réveil
  noteTutorialSleep(state); // Lot 11 : la bulle « Dormir » se ferme à la première nuit
  state.report = buildMorningReport(state);
  state.jour = newDayStats();
  return state.report;
}

/* ---------- Lot 11 : progression hors-ligne ---------- */

// Ce qu'il faut relever avant la simulation pour en faire le bilan ensuite.
function offlineSnapshot(state) {
  const taches = {};
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    taches[id] = st && st.tache ? st.tache.recette : null;
  }
  const f = state.frigo;
  return {
    // Stocks au départ : ce qui s'y ajoute pendant l'absence vient des ateliers
    // (aucune nuit ne passe : ni récolte, ni repas, ni ponte).
    stocks: inventoryCounts(state),
    produite: state.jour.produite,
    perdue: state.jour.perdue,
    eauPompee: state.jour.eau,
    energie: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    eau: state.eauMl,
    taches,
    frigoEveil: f && f.construit ? f.eveilMs : 0,
    frigoAlimente: f && f.construit ? f.alimenteMs : 0,
  };
}

// Bilan d'une période hors-ligne : durée demandée et simulée, énergie, eau,
// préparations terminées ou encore en cours, temps sans froid du réfrigérateur.
function offlineReport(state, before, demande, simule) {
  // Terminé pendant l'absence : tout ce que les ateliers ont ajouté aux stocks
  // (plats, farine et paille du Moulin, huile), file d'attente et lots compris.
  const terminees = {};
  const avant = before.stocks || {};
  for (const [item, n] of Object.entries(inventoryCounts(state))) {
    if (n > (avant[item] || 0)) terminees[item] = n - (avant[item] || 0);
  }
  const enCours = [];
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (!st || !st.tache) continue;
    // Au Moulin : le temps de tout le blé confié, et le nombre de blés restants.
    const lot = id === 'moulin' ? millPending(state) : 1;
    enCours.push({ station: id, recette: st.tache.recette, reste: id === 'moulin' ? millTimeLeft(state) : taskTimeLeft(state, id), quantite: lot });
  }
  const f = state.frigo;
  const frigoConstruit = !!(f && f.construit);
  const eveil = frigoConstruit ? f.eveilMs - before.frigoEveil : 0;
  const alimente = frigoConstruit ? f.alimenteMs - before.frigoAlimente : 0;
  return {
    demande,
    simule,
    plafonne: demande > simule + EPS,
    nuit: state.day,
    energieProduite: state.jour.produite - before.produite,
    energiePerdue: state.jour.perdue - before.perdue,
    energieDebut: before.energie,
    energieFin: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
    eauPompee: state.jour.eau - before.eauPompee,
    eauDebut: before.eau,
    eauFin: state.eauMl,
    capaciteEau: tankCapacity(state),
    terminees,
    enCours,
    frigo: {
      construit: frigoConstruit,
      horsTensionS: Math.floor(Math.max(0, eveil - alimente) / 1000),
      alimente: frigoConstruit ? !!f.alimente : false,
    },
  };
}

// Simule `seconds` secondes d'absence (plafonnées à HORS_LIGNE.MAX_S) par pas de
// HORS_LIGNE.PAS_S : mêmes flux que tick (panneaux, batteries, pompe, moulin,
// presse, réfrigérateur, Four et Cuisine), sans usure, et jamais de nuit : ni
// pousse, ni repas, ni ponte, ni péremption. Le temps simulé s'ajoute au temps
// d'éveil, mais seulement jusqu'à l'éveil minimal (version 1.1.1) : au retour
// le joueur peut dormir tout de suite, et l'horloge n'a pas dépassé midi (ou
// l'heure où il est parti) ; ni le repas de 19 h ni la nuit de 22 h ne se
// déclenchent pendant une absence. Renvoie le bilan (voir offlineReport). Une
// durée nulle, négative ou invalide ne change rien.
function simulateOffline(state, seconds) {
  const H = DATA.HORS_LIGNE;
  const demande = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const simule = Math.min(demande, H.MAX_S);
  const before = offlineSnapshot(state);
  const eveilMax = Math.max(state.awakeMs, awakeRequired(state) * 1000);
  let left = Math.round(simule * 1000);
  while (left > 0) {
    const dtMs = Math.min(H.PAS_S * 1000, left);
    flowStep(state, dtMs);
    if (H.USURE) wearStep(state, dtMs);
    state.awakeMs = Math.min(eveilMax, state.awakeMs + dtMs);
    noteEnergyRecord(state);
    left -= dtMs;
  }
  if (simule > 0) {
    refreshUnlocks(state);
    updateChapters(state);
  }
  return offlineReport(state, before, demande, simule);
}

// Additionne deux bilans hors-ligne successifs (le second suit le premier) :
// sert quand une nouvelle absence arrive avant que le joueur ait lu la première.
function mergeOfflineReports(a, b) {
  if (!a) return b;
  if (!b) return a;
  const terminees = { ...a.terminees };
  for (const [item, n] of Object.entries(b.terminees)) terminees[item] = (terminees[item] || 0) + n;
  return {
    ...b,
    demande: a.demande + b.demande,
    simule: a.simule + b.simule,
    plafonne: a.plafonne || b.plafonne,
    energieProduite: a.energieProduite + b.energieProduite,
    energiePerdue: a.energiePerdue + b.energiePerdue,
    energieDebut: a.energieDebut,
    eauPompee: a.eauPompee + b.eauPompee,
    eauDebut: a.eauDebut,
    terminees,
    frigo: { ...b.frigo, horsTensionS: a.frigo.horsTensionS + b.frigo.horsTensionS },
  };
}

/* ---------- Lot 11 : alertes (notifications de l'interface) ---------- */

// Photo des situations qui méritent une notification : appareils en panne ou à
// entretenir, batteries vides, réfrigérateur allumé mais sans courant, paille
// insuffisante pour nourrir les moutons et les vaches cette nuit (version 1.1).
function alertSnapshot(state) {
  const f = state.frigo;
  const d = f && f.construit ? f.appareil : null;
  return {
    panne: allDevices(state).filter(isBroken).map((x) => x.id),
    entretien: allDevices(state).filter(needsService).map((x) => x.id),
    batteriesVides: state.batteries.some((b) => b.allume && !isBroken(b)) && availableEnergy(state) <= EPS,
    frigoCoupe: !!(d && d.allume && !isBroken(d) && !f.alimente),
    pailleManque: strawMissing(state) > 0,
  };
}

// Ce qui vient d'arriver entre deux photos : [{ type, id? }], type parmi
// 'panne', 'entretien', 'batteriesVides', 'frigoCoupe', 'pailleManque'.
function alertEvents(before, after) {
  const events = [];
  for (const id of after.panne) if (!before.panne.includes(id)) events.push({ type: 'panne', id });
  for (const id of after.entretien) if (!before.entretien.includes(id)) events.push({ type: 'entretien', id });
  if (after.batteriesVides && !before.batteriesVides) events.push({ type: 'batteriesVides' });
  if (after.frigoCoupe && !before.frigoCoupe) events.push({ type: 'frigoCoupe' });
  if (after.pailleManque && !before.pailleManque) events.push({ type: 'pailleManque' });
  return events;
}

/* ---------- Centre de notifications : les alertes du jour ---------- */

// Ce qui demande l'attention du joueur maintenant. Fonction pure, recalculée à
// chaque appel depuis l'état : rien n'est stocké (pas de migration) et une
// alerte disparaît dès que sa cause est réglée. Une entrée par catégorie (pas
// de doublon), triée par priorité (1 = urgent, 2 = utile, 3 = à faire) puis
// par ordre de définition. Les tâches déjà automatisées par l'arbre des
// technologies n'y figurent pas : la nuit s'en charge.
// Renvoie [{ id, type, texte, priorite, icone, nombre }].
function getNotifications(state) {
  const out = [];
  const add = (type, priorite, icone, nombre, un, plusieurs) => {
    if (nombre > 0) out.push({ id: type, type, texte: nombre === 1 ? un : plusieurs.replace('{n}', nombre), priorite, icone, nombre });
  };
  const snap = alertSnapshot(state);
  const auto = (tache, lieu) => techAuto(state, tache, lieu);

  // 1 : la ferme s'arrête ou la famille risque de manquer.
  add('panne', 1, '🔧', snap.panne.length, '1 appareil en panne', '{n} appareils en panne');
  add('batteriesVides', 1, '🔋', snap.batteriesVides ? 1 : 0, 'Batteries vides', 'Batteries vides');
  add('frigoCoupe', 1, '❄️', snap.frigoCoupe ? 1 : 0, 'Réfrigérateur sans courant', 'Réfrigérateur sans courant');
  const perissent = Object.values(expiringSoon(state)).reduce((t, n) => t + n, 0);
  add('peremption', 1, '⏳', perissent, '1 aliment périra cette nuit', '{n} aliments périront cette nuit');

  // 2 : à faire aujourd'hui pour que la nuit se passe bien.
  const plots = allPlots(state).filter((p) => p.culture);
  const nonArrosees = plots.filter((p) => !p.arrose && !isMature(p) && !auto('arrosage', p.lieu)).length;
  add('arrosage', 2, '💧', nonArrosees, '1 parcelle non arrosée', '{n} parcelles non arrosées');
  const hens = state.poulailler && state.poulailler.construit && !auto('nourrissage', 'poulailler') ? Math.max(0, hensToFeed(state)) : 0;
  add('poules', 2, '🐔', hens, '1 poule à nourrir', '{n} poules à nourrir');
  // Version 1.1 : les moutons et les vaches mangent de la paille chaque nuit.
  const paille = strawMissing(state);
  add('paille', 2, DATA.items[DATA.PATURAGE.nourriture].icone, paille, 'Il manque de la paille : 1 de plus pour nourrir les animaux cette nuit', 'Il manque de la paille : {n} de plus pour nourrir les animaux cette nuit');
  add('entretien', 2, '🛠️', snap.entretien.length, '1 appareil à entretenir', '{n} appareils à entretenir');

  // 3 : récoltes et tontes prêtes.
  const mures = plots.filter((p) => isMature(p) && !auto('recolte', p.lieu)).length;
  add('recolte', 3, '🧺', mures, '1 récolte prête', '{n} récoltes prêtes');
  const laine = auto('tonte', 'paturage') ? 0 : sheepToShear(state);
  add('tonte', 3, '🐑', laine, '1 mouton à tondre', '{n} moutons à tondre');

  return out.map((n, i) => ({ n, i })).sort((a, b) => a.n.priorite - b.n.priorite || a.i - b.i).map((x) => x.n);
}

// Pastille du menu du bas : nombre d'alertes en cours, plus les lettres à lire.
function notificationCount(state) {
  return getNotifications(state).length + unreadMail(state).length;
}

/* ---------- Lot 11 : bulles d'aide de la première partie ---------- */

function newTutorial() {
  return { etape: 0, fini: false };
}

// Bulle à afficher : 'eau', 'potager', 'dormir', ou null (aide terminée).
function tutorialStep(state) {
  const a = state.aide;
  if (!a || a.fini) return null;
  return DATA.AIDE.ETAPES[a.etape] || null;
}

// « Compris » : passe à la bulle suivante (la dernière termine l'aide).
function advanceTutorial(state) {
  const a = state.aide;
  if (!a || a.fini) return fail('L\'aide est déjà terminée.');
  a.etape += 1;
  if (a.etape >= DATA.AIDE.ETAPES.length) a.fini = true;
  return { ok: true, etape: tutorialStep(state) };
}

// « Passer l'aide » : ferme toutes les bulles.
function skipTutorial(state) {
  const a = state.aide;
  if (!a || a.fini) return fail('L\'aide est déjà terminée.');
  a.fini = true;
  return { ok: true };
}

// Appelée par sleep() : dormir pendant la bulle « dormir » la valide.
function noteTutorialSleep(state) {
  if (tutorialStep(state) === 'dormir') advanceTutorial(state);
}

// Nouvelle partie depuis les Options : état de départ, mais un joueur qui a déjà
// vu les bulles d'aide ne les revoit pas (elles sont pour la première partie).
function newGameFrom(previous, seed) {
  const s = createInitialState(seed);
  if (previous && previous.aide && previous.aide.fini) s.aide = { ...previous.aide };
  return s;
}

/* ---------- actions du mode test ---------- */

function testAddPieces(state, amount) {
  state.pieces = Math.round(state.pieces + amount);
  refreshUnlocks(state);
  return { ok: true };
}

// Lot 7 : met un bâtiment au niveau 5 (potager, poulailler, silo), sans
// payer : le bâtiment est construit s'il ne l'était pas et ses parcelles ou sa
// capacité suivent le niveau.
function testSetBuildingLevel5(state, id) {
  const niveau = DATA.LEVEL_MAX;
  if (id === 'potager') {
    state.potager.niveau = niveau;
    for (let n = state.potager.parcelles.length + 1; n <= DATA.POTAGER.PARCELLES[niveau - 1]; n++) state.potager.parcelles.push(makePlot(n));
  } else if (id === 'poulailler' || id === 'silo') {
    state[id].construit = true;
    state[id].niveau = niveau;
  } else {
    return fail('Bâtiment inconnu.');
  }
  return { ok: true };
}

// Lot 7 : débloque tous les nœuds de l'arbre, sans payer ni vérifier les
// prérequis, et ouvre l'onglet.
// Arbre v2 : +n points de technologie (mode test).
function testAddTechPoints(state, n = 10) {
  grantTechPoints(state, n, 'Mode test');
  return { ok: true };
}

function testUnlockAllTechs(state) {
  state.technologies = Object.keys(DATA.techtree.noeuds);
  const tab = DATA.TECHNO.ONGLET;
  if (!state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
  return { ok: true };
}

function testAddDevice(state, type) {
  const n = ++state.compteurs[type];
  const d = makeDevice(type, `${type}-${n}`, 0);
  (type === 'panneau' ? state.panneaux : state.batteries).push(d);
  return { ok: true, device: d };
}

function testFillBatteries(state) {
  for (const b of state.batteries) b.chargeMwh = batteryCapacity(b);
  return { ok: true };
}

function testFillTank(state) {
  state.eauMl = tankCapacity(state);
  return { ok: true };
}

function testSetWear(state, id, usure) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  d.usure = Math.max(0, Math.min(DATA.WEAR.BREAKDOWN, Math.round(usure)));
  d.usureMs = 0;
  if (isBroken(d)) d.allume = false;
  return { ok: true };
}

function testSkipAwake(state) {
  state.awakeMs = Math.max(state.awakeMs, awakeRequired(state) * 1000);
  return { ok: true };
}

// Lot 2 : 10 de chaque graine (et de chaque plant).
function testAddSeeds(state) {
  for (const culture of Object.keys(DATA.crops)) addItem(state, seedItem(culture), 10);
  return { ok: true };
}

// Lot 4 : +50 blés, rangés comme une récolte (Silo d'abord, surplus dans
// l'inventaire).
function testAddWheat(state, qty = 50) {
  storeWheat(state, qty);
  return { ok: true };
}

// Lot 4 : +4 poules, dans la limite de la capacité. Le Poulailler est construit
// gratuitement s'il ne l'était pas.
function testAddHens(state, count = 4) {
  const p = state.poulailler;
  if (!p.construit) {
    p.construit = true;
    p.niveau = 1;
  }
  p.poules = Math.min(coopCapacity(state), p.poules + count);
  return { ok: true };
}

// Lot 6 : +3 moutons, dans la limite des places libres. L'Étable est ouverte
// gratuitement si elle ne l'était pas.
function testAddSheep(state, count = 3) {
  const p = state.paturage;
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.placesDepart;
  }
  const n = Math.min(count, freeSheepPlaces(state));
  for (let i = 0; i < n; i++) p.moutons.push(makeSheep(state));
  return { ok: true, added: n };
}

// Lot 6 : la laine de tous les moutons est prête à tondre.
function testWoolReady(state) {
  for (const m of state.paturage.moutons) m.laine = DATA.ANIMAUX.mouton.joursLaine;
  return { ok: true };
}

// +2 vaches, dans la limite des places libres, sur le modèle de testAddSheep().
function testAddCows(state, count = 2) {
  const p = state.paturage;
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.placesDepart;
  }
  const n = Math.min(count, freeCowPlaces(state));
  for (let i = 0; i < n; i++) p.vaches.push(makeCow(state));
  return { ok: true, added: n };
}

// Version 1.1 : +20 pailles.
function testAddStraw(state, qty = 20) {
  addItem(state, DATA.PATURAGE.nourriture, qty);
  return { ok: true };
}

// Lot 5 : construit toutes les stations gratuitement (Four, Cuisine, Moulin,
// Presse) : l'onglet Livre de recette s'ouvre.
function testBuildStations(state) {
  for (const id of Object.keys(DATA.STATIONS)) openStation(state, id);
  return { ok: true };
}

function testAddFlour(state, qty = 10) {
  addItem(state, 'farine', qty);
  return { ok: true };
}

function testAddOil(state, qty = 10) {
  addItem(state, 'huile', qty);
  return { ok: true };
}

function testAddEggs(state, qty = 20) {
  addItem(state, 'oeuf', qty);
  return { ok: true };
}

// Lot 5 : le Moulin passe à 100 % d'usure (panne).
function testWearMill(state) {
  const d = state.stations.moulin.appareil;
  if (!d) return fail('Construis d\'abord le Moulin.');
  return testSetWear(state, d.id, DATA.WEAR.BREAKDOWN);
}

// Lot 9 : valide le chapitre en cours sans remplir son objectif (le suivant
// s'ouvre, son écran de fin apparaît). Après le chapitre 7, la campagne est finie.
function testCompleteChapter(state) {
  return completeChapter(state);
}

// Lot 9 : va au chapitre `n` (1 à 7) ; n = 8 termine la campagne (mode libre, tout
// débloqué). Les compteurs du chapitre repartent à zéro (sinon un objectif déjà
// rempli le validerait aussitôt) et les écrans de fin en attente sont oubliés ;
// l'historique d'autonomie est conservé.
function testGoToChapter(state, n) {
  const c = state.campagne;
  const target = Math.floor(Number(n));
  if (!c || !(target >= 1 && target <= chapterCount() + 1)) return fail('Chapitre inconnu.');
  c.compteurs = newCampaignCounters();
  c.annonces = [];
  c.fini = target > chapterCount();
  c.chapitre = c.fini ? chapterCount() : target;
  return { ok: true, chapitre: c.chapitre, fini: c.fini };
}

// Lot 8 : saute à la première nuit de la saison suivante (sans passer la nuit :
// rien ne pousse, rien ne se mange).
function testNextSeason(state) {
  const L = DATA.SAISONS.LONGUEUR;
  state.day = (Math.floor((state.day - 1) / L) + 1) * L + 1;
  return { ok: true, saison: currentSeason(state) };
}

// Lot 8 : construit gratuitement la Serre (niveau 1), le Verger et le Réfrigérateur.
function testBuildSerre(state) {
  if (!state.serre.construit) openSerre(state);
  return { ok: true };
}

function testBuildVerger(state) {
  openVerger(state);
  return { ok: true };
}

function testBuildFridge(state) {
  openFridge(state);
  return { ok: true };
}

// Lot 8 : toutes les batteries à 0 Wh.
function testEmptyBatteries(state) {
  for (const b of state.batteries) b.chargeMwh = 0;
  return { ok: true };
}

// Lot 2 : toutes les parcelles plantées deviennent mûres.
function testRipenAll(state) {
  for (const p of allPlots(state)) {
    if (p.culture) p.stade = maxStage(p);
  }
  return { ok: true };
}

// Lot 2 : santé de toute la famille à 0 (tous malades).
function testSetHealthZero(state) {
  for (const m of state.famille.membres) {
    m.sante = 0;
    m.malade = true;
  }
  return { ok: true };
}

// Lot 3 : 20 unités de chaque aliment (à conservation pleine).
function testAddFood(state) {
  for (const item of Object.keys(DATA.items)) {
    if (DATA.items[item].edible) addItem(state, item, 20);
  }
  return { ok: true };
}

// Lot 3 : vieillit tout l'inventaire d'une nuit (sans passer la nuit) ; les
// lots arrivés à 0 disparaissent. Renvoie les pertes.
function testAgeInventory(state) {
  return { ok: true, perdus: spoil(state) };
}

function testSleepNights(state, count) {
  let report = null;
  for (let i = 0; i < count; i++) {
    testSkipAwake(state);
    report = sleep(state);
  }
  return { ok: true, report };
}

// Lot 2 : inventaire de départ, potager, famille et compte rendu de la nuit.
// Lot 3 : l'inventaire de départ, en lots à conservation pleine.
function startInventory() {
  const inv = {};
  for (const [item, qty] of Object.entries(DATA.START.INVENTAIRE)) {
    inv[item] = [{ qty, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
  }
  return inv;
}

function startHousehold() {
  return {
    inventaire: startInventory(),
    potager: { niveau: 1, parcelles: makePlots(DATA.POTAGER.PARCELLES[0]) },
    famille: {
      membres: DATA.FAMILY.MEMBRES.map(makeMember),
      // version 1.2 : animaux de compagnie, et dernier numéro donné à un adulte, à un
      // enfant et à un animal (les identifiants ne sont jamais réutilisés)
      animaux: [],
      numeros: familyNumbers(DATA.FAMILY.MEMBRES, []),
      soinsPayes: 0,
      reserve: { ...DATA.FAMILY.RESERVE_DEPART },
    },
    nuit: newNightStats(),
  };
}

// État initial du jeu. `seed` doit être fourni par l'appelant (l'app),
// jamais lu depuis l'horloge ici : l'ENGINE reste pur et testable.
// Lot 4 : Silo et Poulailler, tous deux à construire (l'ancien Champ a rejoint
// la Zone de culture en version 15).
function startLot4() {
  return {
    silo: { construit: false, niveau: 1, ble: 0 },
    poulailler: { construit: false, niveau: 1, poules: 0, nourries: 0, restes: 0 },
  };
}

// Lot 5 : les quatre stations, toutes à construire, libres.
function startLot5() {
  const stations = {};
  for (const id of Object.keys(DATA.STATIONS)) stations[id] = { construit: false, tache: null, appareil: null };
  return { stations };
}

// Lot 6 : l'Étable des moutons et des vaches, à ouvrir (aucune place, aucun animal).
function startLot6() {
  return {
    paturage: { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] },
  };
}

// Lot 7 : aucune technologie acquise au départ.
function startLot7() {
  // routine : réglage « Dormir tout seul » (Routine familiale, arbre v2).
  return { technologies: [], pointsTech: newTechPoints(), routine: false };
}

// Lot 8 : Serre, Verger et Réfrigérateur, tous à construire. La saison se
// déduit de la nuit courante : elle n'est pas stockée.
function startLot8() {
  return {
    serre: { construit: false, niveau: 1, parcelles: [] },
    verger: { construit: false, places: DATA.VERGER.EMPLACEMENTS_DEPART, achetes: 0, compteur: 0, arbres: [] },
    frigo: { construit: false, appareil: null, items: {}, alimenteMs: 0, eveilMs: 0, panneNuit: false, alimente: true },
  };
}

// Lot 9 : la campagne commence au chapitre 1, sans historique.
function startLot9() {
  return { campagne: newCampaign() };
}

// Lot 11 : les bulles d'aide commencent à la première (« eau »).
function startLot11() {
  return { aide: newTutorial() };
}

function createInitialState(seed = 1) {
  return {
    version: STATE_VERSION,
    day: 1,
    awakeMs: 0,
    repas: null, // version 1.1.1 : compte du repas de 19 h, jusqu'à la nuit (voir takeMeal)
    courrier: [], // version 1.3 : lettres reçues [{ id, nuit, lu }] (voir deliverMail)
    pieces: DATA.START.PIECES,
    rngSeed: seed >>> 0,
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir'],
    stats: {},
    marche: {}, // Lot 3 : coefficients d'achat au-dessus de leur plancher
    ...startFarm(),
    ...startHousehold(),
    ...startLot4(),
    ...startLot5(),
    ...startLot6(),
    ...startLot7(),
    ...startLot8(),
    ...startLot9(),
    ...startLot11(),
  };
}

// Table de migrations successives : MIGRATIONS[n] transforme un état de
// version n vers n+1. L'entrée 0 sert de filet pour toute sauvegarde
// antérieure au champ `version` (et de cas de test).
const MIGRATIONS = {
  0: (state) => ({ ...state, version: 1 }),
  // v1 (Lot 0) → v2 (Lot 1) : ajout du parc d'appareils, de l'eau et du rapport.
  1: (state) => ({ ...startFarm(), ...state, version: 2 }),
  // v2 (Lot 1) → v3 (Lot 2) : inventaire de départ, potager, famille, onglet Famille.
  2: (state) => {
    const tabs = Array.isArray(state.unlockedTabs) ? [...state.unlockedTabs] : ['ferme', 'inventaire', 'comptoir'];
    if (!tabs.includes('famille')) tabs.splice(Math.min(1, tabs.length), 0, 'famille');
    return { ...startHousehold(), ...state, unlockedTabs: tabs, version: 3 };
  },
  // v3 (Lot 2) → v4 (Lot 3) : l'inventaire { item: quantité } devient des lots
  // d'origine « produit » (« acheté » pour les conserves) à conservation pleine ;
  // le Marché et le rapport de péremption apparaissent.
  3: (state) => {
    const inventaire = {};
    const old = state.inventaire && typeof state.inventaire === 'object' ? state.inventaire : {};
    for (const [item, v] of Object.entries(old)) {
      if (Array.isArray(v)) {
        inventaire[item] = v;
        continue;
      }
      const qty = Number(v);
      if (qty > 0) inventaire[item] = [{ qty, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
    }
    const nuit = state.nuit && typeof state.nuit === 'object'
      ? { ...state.nuit, perdus: state.nuit.perdus || {} }
      : newNightStats();
    return { ...state, inventaire, nuit, marche: state.marche || {}, version: 4 };
  },
  // v4 (Lot 3) → v5 (Lot 4) : Silo et Poulailler (à construire), blé mangé du
  // jour et œufs de la nuit. (Le Champ, apparu ici à l'époque, n'est plus créé :
  // MIGRATIONS[14] le fond dans la Zone de culture quand il existe.)
  4: (state) => ({
    ...startLot4(),
    ...state,
    jour: { ...newDayStats(), ...(state.jour && typeof state.jour === 'object' ? state.jour : {}) },
    nuit: { oeufs: 0, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 5,
  }),
  // v5 (Lot 4) → v6 (Lot 5) : les quatre stations (à construire) et les
  // compteurs de nuit des plats.
  5: (state) => ({
    ...startLot5(),
    ...state,
    nuit: { bonusPlats: 0, termine: {}, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 6,
  }),
  // v6 (Lot 5) → v7 (Lot 6) : le Pâturage (à débloquer), sans moutons.
  6: (state) => ({
    ...startLot6(),
    ...state,
    version: 7,
  }),
  // v7 (Lot 6) → v8 (Lot 7) : les technologies (aucune acquise), le réglage du
  // semis automatique de chaque parcelle et le compte rendu des automatisations.
  7: (state) => {
    const withSemis = (plots) => (Array.isArray(plots) ? plots.map((p) => ({ semis: 'meme', verrou: null, ...p })) : plots);
    const out = { ...startLot7(), ...state, version: 8 };
    if (state.potager && typeof state.potager === 'object') out.potager = { ...state.potager, parcelles: withSemis(state.potager.parcelles) };
    if (state.champ && typeof state.champ === 'object') out.champ = { ...state.champ, parcelles: withSemis(state.champ.parcelles) };
    out.nuit = { auto: newAutoReport(), ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) };
    return out;
  },
  // v8 (Lot 7) → v9 (Lot 8) : Serre, Verger et Réfrigérateur (à construire) ; la
  // saison se déduit de la nuit courante, il n'y a rien d'autre à convertir.
  8: (state) => ({
    ...startLot8(),
    ...state,
    nuit: { fruits: {}, frigo: { kwh: 0, panne: false, vieillis: false }, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 9,
  }),
  // v9 (Lot 8) → v10 (Lot 9) : la campagne. Une ancienne partie est placée au
  // chapitre qui correspond à ce qu'elle possède déjà ; les compteurs et
  // l'historique d'autonomie repartent de zéro.
  9: (state) => {
    const campagne = newCampaign();
    campagne.chapitre = inferChapter(state);
    return {
      ...state,
      campagne,
      jour: { ...newDayStats(), ...(state.jour && typeof state.jour === 'object' ? state.jour : {}) },
      nuit: { energieProduit: 0, autonomie: 0, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
      version: 10,
    };
  },
  // v10 (Lot 10) → v11 (Lot 11) : les bulles d'aide. Une partie déjà commencée
  // (au moins une nuit passée) ne les affiche pas : elles sont pour la première
  // journée. La progression hors-ligne n'ajoute rien à l'état (l'heure de la
  // sauvegarde est dans l'enveloppe { v, t, s }).
  10: (state) => {
    const commencee = typeof state.day === 'number' && state.day > 1;
    const aide = state.aide && typeof state.aide === 'object' ? state.aide : { ...newTutorial(), fini: commencee };
    return { ...state, aide, version: 11 };
  },
  // v11 → v12 (arrivée de la vache) : le Pâturage gagne compteurVache
  // et vaches (aucune vache dans une ancienne partie) ; l'ancien item générique
  // « viande » (mouton) est renommé « viande_mouton » dans l'inventaire et au
  // Marché (coefficient de marché), pour laisser la place à « viande_boeuf »
  // et « viande_volaille ». Le Poulailler n'a besoin d'aucune migration : les
  // poules restent un simple compteur.
  11: (state) => {
    const oldP = state.paturage && typeof state.paturage === 'object' ? state.paturage : {};
    const paturage = {
      construit: !!oldP.construit,
      ha: typeof oldP.ha === 'number' ? oldP.ha : 0,
      compteur: typeof oldP.compteur === 'number' ? oldP.compteur : 0,
      compteurVache: typeof oldP.compteurVache === 'number' ? oldP.compteurVache : 0,
      moutons: Array.isArray(oldP.moutons) ? oldP.moutons : [],
      vaches: Array.isArray(oldP.vaches) ? oldP.vaches : [],
    };
    const inventaire = state.inventaire && typeof state.inventaire === 'object' ? { ...state.inventaire } : {};
    if (Object.prototype.hasOwnProperty.call(inventaire, 'viande')) {
      const old = inventaire.viande;
      delete inventaire.viande;
      if (Array.isArray(old) && old.length) {
        inventaire.viande_mouton = Array.isArray(inventaire.viande_mouton) ? [...inventaire.viande_mouton, ...old] : old;
      }
    }
    const marche = state.marche && typeof state.marche === 'object' ? { ...state.marche } : {};
    if (Object.prototype.hasOwnProperty.call(marche, 'viande')) {
      if (marche.viande_mouton === undefined) marche.viande_mouton = marche.viande;
      delete marche.viande;
    }
    return { ...state, paturage, inventaire, marche, version: 12 };
  },
  // v12 → v13 : chiffres entiers partout. Pièces et prix entiers, coefficients
  // du Marché en %, énergie en mWh, eau en mL, temps en ms, usure en points
  // entiers (+ temps de marche), pâturage en ares, poids en hg, blé entier
  // (1 blé nourrit 2 poules), autonomie en % entiers. Le rapport de réveil en
  // attente est retiré (il était en anciennes unités).
  12: (state) => migrateToIntegers(state),
  // v13 → v14 : arbre des technologies v2. Points de technologie des chapitres
  // déjà terminés ; les automatisations du niveau 5 et les recettes déjà
  // accessibles sont offertes sous forme de nœuds (rien n'est perdu).
  13: (state) => migrateTechTreeV2(state),
  // v14 → v15 (version 1.0) : le Potager et le Champ deviennent une seule Zone
  // de culture (state.potager). Toutes les parcelles sont regroupées, rien
  // n'est perdu ; state.champ disparaît.
  14: (state) => migrateCropZone(state),
  // v15 → v16 (version 1.1) : profil de la famille, animaux sans poids,
  // places à l'Étable, paille, Moulin par quantité, fin des recettes à la viande.
  15: (state) => migrateRules11(state),
  // v16 → v17 (version 1.1.1) : le repas de 19 h. Le repas du jour n'est pas
  // encore pris (state.repas = null) : il le sera à 19 h ou au coucher.
  16: (state) => ({ ...state, version: 17, repas: null }),
  // v17 → v18 (version 1.2) : la famille se compose. Les membres ne changent
  // pas ; la famille reçoit sa liste d'animaux de compagnie (vide) et ses
  // compteurs d'identifiants.
  17: (state) => migrateFamily12(state),
  // v18 → v19 (version 1.3) : le courrier. La boîte commence vide ; une partie
  // où la Serre est déjà ouverte reçoit la lettre du cousin (et ses trois
  // graines) au premier passage de deliverMail().
  18: (state) => ({ ...state, version: 19, courrier: Array.isArray(state.courrier) ? state.courrier : [] }),
};

function migrateFamily12(old) {
  const state = { ...old, version: 18 };
  const f = state.famille;
  if (f && typeof f === 'object' && !Array.isArray(f)) {
    const animaux = Array.isArray(f.animaux) ? f.animaux : [];
    state.famille = { ...f, animaux, numeros: familyNumbers(f.membres, animaux) };
  }
  return state;
}

// Règles de la version 1.1 (v15 → v16). Rien n'est perdu :
// - famille : chaque membre reçoit son profil de départ (prénom = son rôle,
//   sexe de DATA, teinte jaune) ; un profil déjà présent et valide est gardé ;
// - comptes rendus (nuit en cours et réveil en attente) : la liste des
//   nouveaux malades passe des noms aux identifiants ;
// - Étable : les ares deviennent des places (5 a = 1 place, arrondi vers le
//   bas, jamais moins que ce que les animaux occupent) ; les animaux perdent
//   leur poids ; la laine passe de l'ancien rythme (7 nuits) au nouveau (2
//   nuits nourries), à la même proportion et arrondie vers le bas : une laine
//   prête reste prête, 4 à 6 nuits sur 7 deviennent 1 sur 2, 0 à 3 deviennent 0 ;
// - paille : NUITS_PAILLE nuits de paille par mouton et par vache possédés sont
//   offertes, pour que personne ne soit privé de laine ou de lait le premier soir ;
// - ateliers : une préparation d'une recette retirée (en cours ou en file) est
//   terminée tout de suite et son plat va dans l'inventaire ; au Moulin, les
//   moutures en file deviennent du blé en attente du lot en cours ;
// - arbre : un nœud retiré est rendu (points de technologie et pièces).
// Les viandes et les anciens plats de l'inventaire et du frigo ne bougent pas :
// ils restent mangeables et vendables.
const MIGRATION_11 = { ARES_PAR_PLACE: 5, ANCIENS_JOURS_LAINE: 7, NUITS_PAILLE: 2 };

function migrateRules11(old) {
  const K = MIGRATION_11;
  const A = DATA.ANIMAUX;
  const P = DATA.PATURAGE;
  const state = JSON.parse(JSON.stringify(old));
  const num = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

  // Famille : profil de chaque membre.
  const membres = state.famille && Array.isArray(state.famille.membres) ? state.famille.membres : [];
  for (const m of membres) {
    if (!m || typeof m !== 'object') continue;
    const d = defaultMemberProfile(m);
    m.prenom = validFirstName(m.prenom) ? cleanFirstName(m.prenom) : d.prenom;
    m.genre = DATA.FAMILY.PROFIL.GENRES.includes(m.genre) ? m.genre : d.genre;
    m.teint = Number.isInteger(m.teint) && m.teint >= 0 && m.teint < DATA.FAMILY.PROFIL.TEINTS.length ? m.teint : d.teint;
  }
  // Nouveaux malades : des noms aux identifiants.
  const versId = (x) => {
    const m = membres.find((y) => y && (y.id === x || y.nom === x));
    return m ? m.id : null;
  };
  for (const r of [state.nuit, state.report]) {
    if (r && typeof r === 'object' && Array.isArray(r.nouveauxMalades)) r.nouveauxMalades = r.nouveauxMalades.map(versId).filter(Boolean);
  }

  // Étable : places, animaux sans poids, laine au nouveau rythme.
  const oldP = state.paturage && typeof state.paturage === 'object' ? state.paturage : {};
  const moutons = (Array.isArray(oldP.moutons) ? oldP.moutons : []).filter((m) => m && typeof m === 'object').map((m) => {
    const laine = Math.max(0, num(m.laine));
    const neuve = laine >= K.ANCIENS_JOURS_LAINE ? A.mouton.joursLaine : Math.floor((laine * A.mouton.joursLaine) / K.ANCIENS_JOURS_LAINE);
    return { id: m.id, laine: Math.min(A.mouton.joursLaine, neuve) };
  });
  const vaches = (Array.isArray(oldP.vaches) ? oldP.vaches : []).filter((v) => v && typeof v === 'object').map((v) => ({ id: v.id }));
  const occupees = moutons.length * P.placesParMouton + vaches.length * P.placesParVache;
  const construit = !!oldP.construit;
  const places = 'places' in oldP ? Math.max(0, Math.floor(num(oldP.places))) : Math.floor(Math.max(0, num(oldP.ares)) / K.ARES_PAR_PLACE);
  state.paturage = {
    construit,
    places: construit ? Math.max(places, occupees, P.placesDepart) : Math.max(places, occupees),
    compteur: num(oldP.compteur),
    compteurVache: num(oldP.compteurVache),
    moutons,
    vaches,
  };

  // Paille offerte : quelques nuits d'avance pour les animaux déjà là.
  if (!state.inventaire || typeof state.inventaire !== 'object') state.inventaire = {};
  const cadeau = K.NUITS_PAILLE * (moutons.length * A.mouton.pailleParNuit + vaches.length * A.vache.pailleParNuit);
  if (cadeau > 0) addItem(state, P.nourriture, cadeau);

  // Ateliers : recettes retirées terminées, moutures en file regroupées.
  const stations = state.stations && typeof state.stations === 'object' ? state.stations : {};
  for (const [id, st] of Object.entries(stations)) {
    if (!st || typeof st !== 'object') continue;
    const file = Array.isArray(st.file) ? st.file : [];
    const gardees = [];
    let moutures = 0;
    for (const e of file) {
      const r = e && e.recette;
      if (DATA.PLATS_RETIRES[r]) addItem(state, r, 1);
      else if (id === 'moulin' && DATA.recipes[r] && DATA.recipes[r].horsLivre) moutures += 1;
      else if (DATA.recipes[r]) gardees.push(e);
    }
    if (st.tache && DATA.PLATS_RETIRES[st.tache.recette]) {
      addItem(state, st.tache.recette, 1);
      st.tache = null;
    } else if (st.tache && !DATA.recipes[st.tache.recette]) {
      st.tache = null;
    }
    if (id === 'moulin') {
      if (st.tache) {
        st.tache.enAttente = Math.max(0, Math.floor(num(st.tache.enAttente))) + moutures;
      } else if (moutures > 0) {
        const temps = DATA.recipes.farine.temps * 1000;
        st.tache = { recette: 'farine', resteMs: temps, dureeMs: temps, enAttente: moutures - 1 };
      }
    } else if (!st.tache && gardees.length) {
      const temps = DATA.recipes[gardees[0].recette].temps * 1000;
      st.tache = { recette: gardees.shift().recette, resteMs: temps, dureeMs: temps };
    }
    if (Array.isArray(st.file)) st.file = gardees;
  }

  // Arbre : nœuds retirés rendus.
  if (Array.isArray(state.technologies)) {
    for (const [id, n] of Object.entries(DATA.techtree.NOEUDS_RETIRES)) {
      if (!state.technologies.includes(id)) continue;
      state.technologies = state.technologies.filter((x) => x !== id);
      state.pieces = Math.round(num(state.pieces) + n.cout);
      if (!state.pointsTech || typeof state.pointsTech !== 'object') state.pointsTech = newTechPoints();
      state.pointsTech.solde = num(state.pointsTech.solde) + n.pt;
    }
  }

  // Comptes rendus : la nuit à l'Étable (vide pour une nuit d'avant la 1.1).
  if (state.nuit && typeof state.nuit === 'object' && !state.nuit.etable) state.nuit.etable = newStableReport();
  state.version = 16;
  return state;
}

// Fusion du Potager et du Champ (v14 → v15). Les parcelles du Champ rejoignent
// celles du Potager, à la suite, avec tout ce qu'elles portent (culture, stade,
// arrosage, montée en graine, réglage du semis automatique) ; elles prennent le
// lieu et les identifiants de la zone (« potager-n », comme makePlot()). Le
// niveau de la zone est le plus petit dont la capacité contient toutes les
// parcelles possédées ; des parcelles vides complètent jusqu'à cette capacité.
// Au-delà de la capacité maximale (l'ancien maximum était 20 + 16 = 36, pour
// 30) : les parcelles vides partent d'abord, puis les plantes les moins
// avancées, et chaque plante retirée est rendue sous forme d'une graine (ou
// d'un plant) dans l'inventaire.
function migrateCropZone(old) {
  const state = JSON.parse(JSON.stringify(old));
  const P = DATA.POTAGER;
  const max = P.PARCELLES[P.PARCELLES.length - 1];
  const plotsOf = (b) => (b && Array.isArray(b.parcelles) ? b.parcelles.filter((p) => p && typeof p === 'object') : []);
  const potager = state.potager && typeof state.potager === 'object' ? state.potager : {};
  let plots = [...plotsOf(potager), ...plotsOf(legacyChamp(state))];
  if (plots.length > max) {
    const planted = (p) => (p.culture ? 1 : 0);
    const stade = (p) => (typeof p.stade === 'number' ? p.stade : 0);
    const rang = plots.map((p, i) => ({ p, i }))
      .sort((a, b) => (planted(b.p) - planted(a.p)) || (stade(b.p) - stade(a.p)) || (a.i - b.i));
    const gardees = new Set(rang.slice(0, max).map((x) => x.i));
    if (!state.inventaire || typeof state.inventaire !== 'object') state.inventaire = {};
    for (const x of rang.slice(max)) {
      if (x.p.culture && DATA.crops[x.p.culture]) addItem(state, seedItem(x.p.culture), 1);
    }
    plots = plots.filter((p, i) => gardees.has(i));
  }
  const niveau = Math.max(1, P.PARCELLES.findIndex((n) => n >= plots.length) + 1);
  const parcelles = [];
  for (let n = 1; n <= P.PARCELLES[niveau - 1]; n++) {
    const neuve = makePlot(n);
    parcelles.push(n <= plots.length ? { ...neuve, ...plots[n - 1], id: neuve.id, lieu: neuve.lieu } : neuve);
  }
  state.potager = { ...potager, niveau, parcelles };
  delete state.champ;
  // Comptes rendus des automatisations (nuit en cours et réveil en attente) :
  // l'ancienne ligne du Champ rejoint celle de la zone.
  for (const auto of [state.nuit && state.nuit.auto, state.report && state.report.auto]) {
    if (auto && typeof auto === 'object' && 'champ' in auto) {
      auto.potager = !!(auto.potager || auto.champ);
      delete auto.champ;
    }
  }
  state.version = 15;
  return state;
}

// Offre un nœud (et, si `avecPrerequis`, ses prérequis de type nœud) sans rien payer.
function grantTech(state, id, avecPrerequis = true) {
  const n = DATA.techtree.noeuds[id];
  if (!n) return;
  if (!Array.isArray(state.technologies)) state.technologies = [];
  if (avecPrerequis) for (const r of n.requiert) if (r.noeud) grantTech(state, r.noeud, true);
  if (!state.technologies.includes(id)) state.technologies.push(id);
}

function migrateTechTreeV2(old) {
  const state = JSON.parse(JSON.stringify(old));
  if (!Array.isArray(state.technologies)) state.technologies = [];
  const pt = newTechPoints();
  const c = state.campagne;
  if (c) {
    const faits = c.fini ? chapterCount() : Math.max(0, (c.chapitre || 1) - 1);
    for (let i = 0; i < faits; i++) pt.solde += DATA.techtree.POINTS.CHAPITRES[i] || 0;
    pt.gagnes = pt.solde;
    if (c.compteurs) c.compteurs.nuits100 = (c.historique || []).filter((h) => h.pct >= 100).length;
  }
  state.pointsTech = pt;
  const niveau = (id) => {
    if (id === 'potager') return state.potager ? state.potager.niveau : 0;
    const b = state[id];
    return b && b.construit ? b.niveau : 0;
  };
  const built = (id) => !!((state.stations && state.stations[id] && state.stations[id].construit) || (state[id] && state[id].construit));
  // Automatisations de l'ancien niveau 5 (avec leurs prérequis de type nœud).
  if (niveau('potager') >= 5 || niveau('champ') >= 5) {
    grantTech(state, 'ea_irrigation');
    grantTech(state, 'cu_recolte_auto');
  }
  if (niveau('poulailler') >= 5) grantTech(state, 'el_mangeoire');
  // Recettes déjà accessibles : nœuds de recettes offerts seuls.
  if (built('four')) grantTech(state, 'cui_boulangerie', false);
  if (built('paturage')) grantTech(state, 'cui_laiterie', false);
  if (built('cuisine')) grantTech(state, 'cui_conserverie', false);
  if (built('serre')) grantTech(state, 'cui_epicerie', false);
  state.version = 14;
  return state;
}

// Conversion d'une sauvegarde v12 (décimales) vers les unités entières de la v13.
function migrateToIntegers(old) {
  const num = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const state = JSON.parse(JSON.stringify(old));
  const msParPoint = DATA.WEAR.HEURES_PAR_POINT * DATA.TIME.SECONDS_PER_HOUR * 1000;
  state.pieces = Math.round(num(state.pieces));
  // Marché : coefficients 1,3 → 130 %.
  const marche = {};
  for (const [item, c] of Object.entries(state.marche || {})) marche[item] = Math.round(num(c) * 100);
  state.marche = marche;
  // Temps d'éveil en ms.
  // (un champ déjà au nouveau format est gardé tel quel)
  state.awakeMs = 'awakeSeconds' in state ? Math.round(num(state.awakeSeconds) * 1000) : Math.round(num(state.awakeMs));
  delete state.awakeSeconds;
  // Appareils : usure entière (+ reste en temps de marche), prix entier, charge en mWh.
  const device = (d) => {
    if (!d || typeof d !== 'object') return d;
    const u = Math.max(0, num(d.usure));
    d.usure = Math.floor(u);
    d.usureMs = Math.round((u - d.usure) * msParPoint);
    if (typeof d.prix === 'number') d.prix = Math.ceil(d.prix - 1e-9);
    if ('charge' in d) {
      d.chargeMwh = Math.floor(num(d.charge) * 1e6);
      delete d.charge;
    }
    for (const k of ['entree', 'sortie', 'prod', 'debit', 'conso']) if (k in d) d[k] = 0;
    return d;
  };
  for (const d of state.panneaux || []) device(d);
  for (const d of state.batteries || []) device(d);
  device(state.pompe);
  for (const st of Object.values(state.stations || {})) {
    if (st && st.appareil) device(st.appareil);
    if (st && st.tache && 'reste' in st.tache) {
      st.tache.resteMs = Math.ceil(num(st.tache.reste) * 1000);
      st.tache.dureeMs = Math.ceil(num(st.tache.duree, num(st.tache.reste)) * 1000);
      delete st.tache.reste;
      delete st.tache.duree;
    }
  }
  if (state.frigo && typeof state.frigo === 'object') {
    device(state.frigo.appareil);
    if ('alimenteS' in state.frigo) state.frigo.alimenteMs = Math.round(num(state.frigo.alimenteS) * 1000);
    if ('eveilS' in state.frigo) state.frigo.eveilMs = Math.round(num(state.frigo.eveilS) * 1000);
    state.frigo.alimenteMs = num(state.frigo.alimenteMs);
    state.frigo.eveilMs = num(state.frigo.eveilMs);
    delete state.frigo.alimenteS;
    delete state.frigo.eveilS;
  }
  // Eau du réservoir en mL.
  state.eauMl = 'eau' in state ? Math.floor(num(state.eau) * 1000) : num(state.eauMl);
  delete state.eau;
  state.flux = { perdue: 0, eau: 0 };
  if (state.jour) {
    state.jour.produite = Math.floor(num(state.jour.produite) * 1e6);
    state.jour.perdue = Math.floor(num(state.jour.perdue) * 1e6);
    state.jour.eau = Math.floor(num(state.jour.eau) * 1000);
    state.jour.ble = Math.ceil(num(state.jour.ble) - 1e-9);
  }
  // Blé et stocks entiers (le blé pouvait compter des demis).
  if (state.silo) state.silo.ble = Math.floor(num(state.silo.ble));
  for (const [item, lots] of Object.entries(state.inventaire || {})) {
    if (!Array.isArray(lots)) continue;
    state.inventaire[item] = lots.map((l) => ({ ...l, qty: Math.floor(num(l.qty)) })).filter((l) => l.qty > 0);
    if (!state.inventaire[item].length) delete state.inventaire[item];
  }
  if (state.poulailler) state.poulailler.restes = 0;
  // Pâturage en ares, poids en hg (ces deux unités disparaissent en version 16 :
  // voir migrateRules11()).
  if (state.paturage) {
    const { ha, ares, construit, ...autres } = state.paturage;
    state.paturage = { construit, ares: ha !== undefined ? Math.round(num(ha) * 100) : num(ares), ...autres };
    for (const a of [...(state.paturage.moutons || []), ...(state.paturage.vaches || [])]) a.poids = Math.round(num(a.poids) * 10);
  }
  // Campagne : compteurs et historique d'autonomie entiers.
  const c = state.campagne;
  if (c && c.compteurs) {
    const k = c.compteurs;
    k.eauMl = 'litres' in k ? Math.floor(num(k.litres) * 1000) : num(k.eauMl);
    k.mwhMax = 'kwhMax' in k ? Math.floor(num(k.kwhMax) * 1e6) : num(k.mwhMax);
    delete k.litres;
    delete k.kwhMax;
    if (k.hiver && typeof k.hiver === 'object') k.hiver.somme = Math.floor(num(k.hiver.somme));
    if (k.hiverDernier) k.hiverDernier.moyenne = Math.floor(num(k.hiverDernier.moyenne));
  }
  if (c && Array.isArray(c.historique)) c.historique = c.historique.map((h) => ({ ...h, pct: Math.floor(num(h.pct)) }));
  state.report = null;
  state.version = 13;
  return state;
}

// Applique les migrations successives à une sauvegarde { v, t, s } (ou à un
// état brut) jusqu'à atteindre la version courante. Ne lance jamais
// d'exception : une entrée invalide retombe sur un état migré au mieux.
function migrate(save) {
  let state = save && typeof save === 'object' && save.s && typeof save.s === 'object'
    ? { ...save.s }
    : (save && typeof save === 'object' ? { ...save } : {});
  let version = typeof state.version === 'number' ? state.version : 0;
  let guard = 0;
  while (MIGRATIONS[version] && guard < 1000) {
    state = MIGRATIONS[version](state);
    version = typeof state.version === 'number' ? state.version : version + 1;
    guard++;
  }
  if (typeof state.version !== 'number') state.version = version;
  return state;
}

// Formatage des nombres à la française : toujours un entier, avec une espace
// tous les 3 chiffres (« 80 000 », « 1 234 567 »), jamais de décimale.
// Fonction pure : elle vit dans ENGINE pour rester testable par Node, même
// si c'est l'app qui l'utilise pour l'affichage.
function formatNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  const r = Math.round(n);
  const sign = r < 0 ? '-' : '';
  return sign + groupThousands(Math.abs(r));
}

// Groupe un entier positif par milliers avec des espaces : 1234 -> "1 234".
function groupThousands(intValue) {
  const s = String(Math.trunc(intValue));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const posFromEnd = s.length - i;
    out += s[i];
    if (posFromEnd > 1 && posFromEnd % 3 === 1) out += ' ';
  }
  return out;
}

// Nombre signé avec le vrai signe moins : « +5 », « −20 », « 0 ».
function formatSigned(n) {
  const r = Math.round(Number(n) || 0);
  if (r === 0) return '0';
  return (r < 0 ? '−' : '+') + groupThousands(Math.abs(r));
}

// Énergie stockée (mWh) en Wh entiers, arrondis vers le bas : « 2 340 Wh ».
function formatWh(mwh) {
  return `${formatNumber(Math.floor((Number(mwh) || 0) / 1000))} Wh`;
}

// Puissance (mWh/s) en Wh/s entiers : « 30 Wh/s » ; signée avec `signed`.
function formatWhRate(mwhPerS, signed = false) {
  const v = Math.trunc((Number(mwhPerS) || 0) / 1000);
  return `${signed ? formatSigned(v) : formatNumber(v)} Wh/s`;
}

// Eau (mL) en litres entiers, arrondis vers le bas : « 38 L ».
function formatLitres(ml) {
  return `${formatNumber(Math.floor((Number(ml) || 0) / 1000))} L`;
}

// Débit (mL/s) en litres par seconde, entiers : « 2 L/s ».
function formatLitresRate(mlPerS) {
  return `${formatNumber(Math.floor((Number(mlPerS) || 0) / 1000))} L/s`;
}

// Pièces : toujours un entier (tous les prix sont arrondis à l'entier supérieur).
function formatCoins(n) {
  return formatNumber(Math.round(Number(n) || 0));
}


// Quantité d'un stock : toujours un entier.
function formatQty(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return formatNumber(n);
}

function formatHour(h) {
  return `${h} h`;
}

// Lot 11 : durée d'une absence, arrondie vers le bas : « 45 s », « 12 min »,
// « 2 h 05 min », « 8 h ».
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor((Number(seconds) || 0) + EPS));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

// Pourcentage entier arrondi vers le bas (99,6 s'affiche « 99 % » : 100 % veut
// dire 100), avec une espace insécable avant le signe.
function formatPercent(p) {
  return `${formatNumber(Math.floor((Number(p) || 0) + EPS))}\u00a0%`;
}


/* ==========================================================================
   Lot 10 : simulation d'un joueur automatique (conception, sections 8.10 et
   8.11). Le joueur automatique joue avec les vraies actions du moteur, sans
   interface : il sert au script scripts/simulate.mjs et au bouton du mode test.
   Il ne lit ni l'horloge ni Math.random : une partie simulée est entièrement
   déterminée par sa graine. Tout ce qu'il vise ou garde vit dans
   DATA.SIMULATION.
   ========================================================================== */

/* ---------- entretien, soins, infrastructure ---------- */

// Répare ce qui est en panne (et le rallume), entretient ce qui est usé.
function botMaintenance(state) {
  for (const d of allDevices(state)) {
    if (isBroken(d)) {
      if (repairDevice(state, d.id).ok) toggleDevice(state, d.id);
    } else if (needsService(d)) {
      maintainDevice(state, d.id);
    }
  }
}

// Un malade est soigné dès que les pièces le permettent.
function botHeal(state) {
  for (const m of state.famille.membres) {
    if (m.malade && state.pieces + EPS >= careCost(state)) heal(state, m.id);
  }
}

// Eau demandée par une journée : toutes les parcelles arrosées, plus la cuisine.
function botWaterPerDay(state) {
  const S = DATA.SIMULATION;
  let litres = S.LITRES_CUISINE;
  for (const p of allPlots(state)) litres += p.culture ? waterCost(state, p) : S.LITRES_PARCELLE;
  return litres;
}

// Énergie demandée par une journée (mWh) : pompe, réfrigérateur, Moulin et Presse.
function botEnergyPerDay(state, eveilS) {
  let mwh = botWaterPerDay(state) * 1000 * DATA.PUMP.WH_PAR_L;
  if (state.frigo && state.frigo.construit) mwh += fridgeRate(state) * (eveilS + DATA.FRIGO.BLOC_NUIT_S);
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (DATA.STATIONS[id].electrique && st.construit) mwh += Math.floor((DATA.STATIONS[id].whParS * 1000 * eveilS * DATA.SIMULATION.MARCHE_STATIONS) / 100);
  }
  return mwh;
}

// Pompe, panneaux et batteries : le joueur ne laisse pas la ferme manquer d'eau
// ni d'énergie (au pire de l'année : l'hiver). Renvoie la prochaine amélioration
// nécessaire { cost, buy }, ou { done: true }. Pour l'énergie, il choisit le moyen
// le moins cher d'ajouter de la puissance : améliorer un appareil ou en acheter un.
function botInfraInfo(state, eveilS) {
  const S = DATA.SIMULATION;
  const litres = botWaterPerDay(state);
  const pump = state.pompe;
  const needsFlow = litres * 1000 * 100 > pumpFlow(pump) * eveilS * S.MARGE_EAU;
  const needsTank = isAutomated(state, 'potager') && litres * 1000 * 100 > tankCapacity(state) * S.MARGE_EAU;
  if (pump.niveau < DATA.LEVEL_MAX && (needsFlow || needsTank)) return { cost: upgradeCost(pump), buy: () => upgradeDevice(state, pump.id) };

  const worst = Math.min(...Object.values(DATA.SAISONS.MODS).map((m) => m.solaire));
  const produced = Math.floor((state.panneaux.reduce((t, p) => t + panelOutput(p), 0) * worst) / 100) * eveilS;
  const need = botEnergyPerDay(state, eveilS);
  const cheapest = (type, list, grid) => {
    let best = { ratio: nextPurchasePrice(state, type) / grid[0], buy: () => buyDevice(state, type), cost: nextPurchasePrice(state, type) };
    for (const d of list) {
      if (d.niveau >= DATA.LEVEL_MAX) continue;
      const cost = upgradeCost(d);
      const ratio = cost / (grid[d.niveau] - grid[d.niveau - 1]);
      if (ratio < best.ratio) best = { ratio, buy: () => upgradeDevice(state, d.id), cost };
    }
    return best;
  };
  if (produced * 100 < need * S.MARGE_ENERGIE) return cheapest('panneau', state.panneaux, DATA.GRID.panneau.whParS);
  const capacity = state.batteries.reduce((t, b) => t + batteryCapacity(b), 0);
  if (capacity * 100 < need * S.MARGE_BATTERIE) return cheapest('batterie', state.batteries, DATA.GRID.batterie.wh);
  return { done: true };
}

/* ---------- cultures ---------- */

// Énergie rendue par une parcelle et par nuit (critère de choix des légumes).
function botCropScore(culture) {
  const c = DATA.crops[culture];
  const item = DATA.items[cropProduct(culture)];
  return ((item.energie || 0) * c.rendement) / c.stades;
}

// Achète une unité de graine si le prix reste raisonnable ; renvoie true si elle est là.
function botBuySeed(state, item) {
  if (!isBuyable(item)) return false;
  const price = buyPrice(state, item);
  if (price > DATA.SIMULATION.PRIX_GRAINE_MAX + EPS || state.pieces + EPS < price) return false;
  return buyItem(state, item, 1).ok === true;
}

function botHasSeed(state, culture) {
  return seedStock(state, culture) >= 1 - EPS || botBuySeed(state, seedItem(culture));
}

// Vrai tant que l'objectif « carottes récoltées » du chapitre en cours n'est pas
// couvert par les récoltes faites et les carottes déjà en terre.
function botWantsCarrots(state) {
  const obj = objectiveDef('carottes');
  if (!obj || chapterReached(state) > objectiveChapter('carottes')) return false;
  const inGround = allPlots(state).filter((p) => p.culture === 'carotte' && !p.montee).length * DATA.crops.carotte.rendement;
  return state.campagne.compteurs.carottes + inGround < obj.cible;
}

// Une culture de plein champ (blé, tournesol, riz, houblon) : celles que le
// déblocage 'champ' ouvre.
function botIsFieldCrop(culture) {
  return DATA.crops[culture].deblocage === 'champ';
}

// Parcelles de la Zone de culture que le joueur réserve au plein champ (blé et
// tournesol) : PART_PLEIN_CHAMP % de la zone une fois ces cultures débloquées,
// 0 avant.
function botFieldTarget(state) {
  if (!isUnlocked(state, 'champ')) return 0;
  return Math.floor((state.potager.parcelles.length * DATA.SIMULATION.PART_PLEIN_CHAMP) / 100);
}

// Culture à planter sur une parcelle vide, ou null.
function botPickCrop(state, plot) {
  const S = DATA.SIMULATION;
  const options = plantableCropsFor(state, plot.lieu);
  if (plot.lieu === DATA.POTAGER.LIEU) {
    // Tant que la part de plein champ n'est pas atteinte : du blé (pour les poules
    // et la farine), et un peu de tournesol quand la Presse existe.
    const zone = state.potager.parcelles;
    const field = zone.filter((p) => p.culture && botIsFieldCrop(p.culture)).length;
    if (field < botFieldTarget(state)) {
      const sun = zone.filter((p) => p.culture === 'tournesol').length;
      const wanted = state.stations.presse.construit && sun < S.PARCELLES_TOURNESOL ? ['tournesol', 'ble'] : ['ble'];
      const culture = wanted.find((c) => options.includes(c) && botHasSeed(state, c));
      if (culture) return culture;
    }
  }
  // Le reste de la zone (et la Serre) nourrit la famille : les légumes, pas le plein champ.
  const foods = options.filter((c) => !botIsFieldCrop(c) && DATA.items[cropProduct(c)].edible).sort((a, b) => botCropScore(b) - botCropScore(a));
  // l'objectif du chapitre 2 demande des carottes : elles passent devant
  if (botWantsCarrots(state)) foods.sort((a, b) => (b === 'carotte') - (a === 'carotte'));
  return foods.find((c) => botHasSeed(state, c)) || null;
}

// Récolte, replante, arrose. Une carotte mûre monte en graine quand la réserve
// de graines de carotte descend sous la cible.
function botFarm(state) {
  const S = DATA.SIMULATION;
  for (const p of allPlots(state)) {
    if (p.culture === 'carotte' && !p.montee && p.stade >= DATA.crops.carotte.stades) {
      const bolting = allPlots(state).filter((x) => x.culture === 'carotte' && x.montee).length;
      const seeds = seedStock(state, 'carotte') + bolting * DATA.crops.carotte.graines.quantite;
      if (seeds < S.GRAINES_CAROTTE) toggleBolting(state, p.id);
    }
    if (isMature(p)) harvest(state, p.id);
    if (!p.culture) {
      // On étale les semis sur plusieurs jours : une ferme plantée d'un coup est
      // récoltée d'un coup, et la famille jeûne entre deux récoltes.
      const lieu = allPlots(state).filter((x) => x.lieu === p.lieu);
      const fresh = lieu.filter((x) => x.culture && x.stade === 0).length;
      if (fresh >= Math.max(1, Math.ceil(lieu.length / S.ETALEMENT_JOURS))) continue;
      const culture = botPickCrop(state, p);
      if (culture) plant(state, p.id, culture);
    }
  }
  const thirsty = allPlots(state).filter((p) => p.culture && !p.arrose && !isMature(p));
  thirsty.sort((a, b) => b.stade - a.stade);
  for (const p of thirsty) water(state, p.id);
}

/* ---------- animaux ---------- */

function botHens(state) {
  const p = state.poulailler;
  if (!p.construit || p.poules <= 0) return;
  // pas de blé pour les poules : un dépannage au Marché, comme pour les graines
  while (hensToFeed(state) > 0 && !canFeedHen(state) && botBuySeed(state, DATA.SILO.ITEM)) {
    if (canFeedHen(state)) break;
  }
  for (let i = 0; i < p.poules + 3 && hensToFeed(state) > 0; i++) {
    if (!feedAllHens(state).ok) break;
  }
}

// Tond les moutons dont la laine est prête.
function botSheep(state) {
  const p = state.paturage;
  if (!p.construit) return;
  for (const m of p.moutons) {
    if (woolReady(m)) shear(state, m.id);
  }
}

// Le Moulin : il moud de quoi garder un peu de farine et, surtout, de la
// paille d'avance pour les moutons et les vaches (PAILLE_NUITS nuits). Le blé
// des poules et des semis reste de côté, sauf pour la paille de ce soir : des
// animaux sans paille ne donnent ni laine ni lait. S'il manque encore du blé
// pour cette paille-là, un dépannage au Marché (comme pour les poules).
function botMill(state) {
  const S = DATA.SIMULATION;
  const st = state.stations.moulin;
  if (!st.construit) return;
  const d = st.appareil;
  if (d && (!d.allume || isBroken(d))) return;
  const enCours = millPending(state);
  const besoin = strawNeed(state);
  const farine = S.STOCK_FARINE - countItem(state, 'farine') - enCours;
  const paille = besoin * S.PAILLE_NUITS - strawStock(state) - enCours;
  const ceSoir = besoin - strawStock(state) - enCours;
  const voulu = Math.max(farine, paille, 0);
  if (voulu < 1) return;
  let libre = Math.max(0, wheatTotal(state) - botWheatKept(state));
  if (ceSoir > libre) {
    // la paille de ce soir passe avant la réserve de blé
    while (wheatTotal(state) < ceSoir && botBuySeed(state, DATA.SILO.ITEM)) { /* un blé de plus */ }
    libre = Math.max(libre, Math.min(ceSoir, wheatTotal(state)));
  }
  const n = Math.min(voulu, libre);
  if (n >= 1) startMilling(state, n);
}

/* ---------- cuisine ---------- */

// Unités disponibles d'un ingrédient (inventaire et frigo), sans la réserve de semences.
function botSpare(state, item) {
  if (item === DATA.SILO.ITEM) return wheatTotal(state);
  const reserve = state.famille.reserve[item] || 0;
  return countItem(state, item) + fridgeCount(state, item) - reserve;
}

// Option retenue pour un ingrédient (celle dont il reste assez), ou null.
function botIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => botSpare(state, item) + EPS >= ing.qte) || null;
}

// Intérêt d'une recette : gain en pièces par seconde de préparation, ou 0 si elle ne vaut pas le coup.
function botRecipeValue(state, id) {
  const S = DATA.SIMULATION;
  const r = DATA.recipes[id];
  if (r.horsLivre) return 0; // le blé se moud au Moulin : voir botMill()
  if (!recipeUnlocked(state, id)) return 0; // arbre v2 : recette encore verrouillée
  if (r.eau && state.eauMl < r.eau * 1000) return 0;
  const items = r.ingredients.map((ing) => botIngredient(state, ing));
  if (items.some((i) => i === null)) return 0;
  if (r.transformation) {
    if (r.sortie === 'huile') {
      const spare = countItem(state, 'graine_tournesol') - S.PARCELLES_TOURNESOL;
      return countItem(state, 'huile') < S.STOCK_HUILE && spare >= r.ingredients[0].qte ? 1 / r.temps : 0;
    }
    return 0;
  }
  let cost = (r.eau || 0) * DATA.RECETTES.PRIX_EAU;
  r.ingredients.forEach((ing, i) => { cost += DATA.items[items[i]].prix * ing.qte; });
  const gain = dishPrice(id) - cost;
  return gain > 0 ? gain / r.temps : 0;
}

// Blé à ne pas moudre : les semis de plein champ et trois nuits de poules.
function botWheatKept(state) {
  const S = DATA.SIMULATION;
  const hens = Math.ceil(state.poulailler.poules / DATA.ANIMAUX.poule.poulesParBle) * S.BLE_JOURS_GARDES;
  return hens + botFieldTarget(state);
}

// Sort du frigo ce qu'il faut pour une recette, puis la lance.
function botStartRecipe(state, id) {
  const r = DATA.recipes[id];
  r.ingredients.forEach((ing) => {
    const item = botIngredient(state, ing);
    const missing = ing.qte - countItem(state, item);
    if (item !== DATA.SILO.ITEM && missing > 0) moveFromFridge(state, item, missing);
  });
  return startRecipe(state, id).ok === true;
}

function botCook(state) {
  if (!state.stations) return;
  for (const station of Object.keys(DATA.STATIONS)) {
    const st = state.stations[station];
    if (!st.construit || st.tache) continue;
    let best = null;
    for (const id of Object.keys(DATA.recipes)) {
      if (DATA.recipes[id].station !== station) continue;
      const v = botRecipeValue(state, id);
      if (v > 0 && (!best || v > best.v)) best = { id, v };
    }
    if (best) botStartRecipe(state, best.id);
  }
}

/* ---------- achats ---------- */

// Ce qu'il reste à faire pour une étape du plan : { done }, { locked } ou { cost, buy }.
function botStepInfo(state, step, eveilS) {
  const built = (b) => b.construit && b.niveau >= step.niveau;
  switch (step.type) {
    case 'infra':
      return botInfraInfo(state, eveilS);
    case 'potager':
      return state.potager.niveau >= step.niveau ? { done: true } : { cost: potagerUpgradeCost(state), buy: () => upgradePotager(state) };
    case 'silo':
      if (!isUnlocked(state, 'silo')) return { locked: true };
      if (built(state.silo)) return { done: true };
      return state.silo.construit ? { cost: siloUpgradeCost(state), buy: () => upgradeSilo(state) } : { cost: DATA.SILO.CONSTRUCTION, buy: () => buildSilo(state) };
    case 'poulailler':
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      if (built(state.poulailler)) return { done: true };
      return state.poulailler.construit ? { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) } : { cost: DATA.POULAILLER.CONSTRUCTION, buy: () => buildPoulailler(state) };
    case 'poules': {
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      const p = state.poulailler;
      if (p.poules >= step.n) return { done: true };
      if (!p.construit) return { cost: DATA.POULAILLER.CONSTRUCTION, buy: () => buildPoulailler(state) };
      if (p.poules >= coopCapacity(state)) return { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) };
      return { cost: animalPrice('poule'), buy: () => buyAnimal(state, 'poule') };
    }
    case 'station': {
      const def = DATA.STATIONS[step.id];
      if (!isUnlocked(state, step.id)) return { locked: true };
      if (state.stations[step.id].construit) return { done: true };
      if (def.requiert && !state.stations[def.requiert].construit) return { locked: true };
      return { cost: def.cout, buy: () => buildStation(state, step.id) };
    }
    case 'paturage':
      if (!isUnlocked(state, 'paturage')) return { locked: true };
      return state.paturage.construit ? { done: true } : { cost: DATA.PATURAGE.deblocage, buy: () => buildPaturage(state) };
    case 'moutons': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return { cost: DATA.PATURAGE.deblocage, buy: () => buildPaturage(state) };
      if (sheepCount(state) >= step.n) return { done: true };
      if (freeSheepPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      return { cost: animalPrice('mouton'), buy: () => buySheep(state) };
    }
    case 'serre':
      if (!isUnlocked(state, 'serre')) return { locked: true };
      if (built(state.serre)) return { done: true };
      return state.serre.construit ? { cost: serreUpgradeCost(state), buy: () => upgradeSerre(state) } : { cost: DATA.SERRE.CONSTRUCTION, buy: () => buildSerre(state) };
    case 'verger':
      if (!isUnlocked(state, 'verger')) return { locked: true };
      return state.verger.construit ? { done: true } : { cost: DATA.VERGER.CONSTRUCTION, buy: () => buildVerger(state) };
    case 'arbres': {
      if (!isUnlocked(state, 'verger')) return { locked: true };
      const v = state.verger;
      if (!v.construit) return { cost: DATA.VERGER.CONSTRUCTION, buy: () => buildVerger(state) };
      if (v.arbres.length >= step.n) return { done: true };
      if (orchardFree(state) <= 0) return { cost: orchardSlotPrice(state), buy: () => buyOrchardSlot(state) };
      const espece = Object.keys(DATA.VERGER.ARBRES)[v.arbres.length % Object.keys(DATA.VERGER.ARBRES).length];
      return { cost: DATA.VERGER.ARBRES[espece].prix, buy: () => buyTree(state, espece) };
    }
    case 'frigo':
      if (!isUnlocked(state, 'frigo')) return { locked: true };
      return state.frigo.construit ? { done: true } : { cost: DATA.FRIGO.CONSTRUCTION, buy: () => buildFridge(state) };
    case 'pompe':
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (state.pompe.niveau < step.niveau && !hasTech(state, step.niveau === 2 ? 'cu_outils' : 'ea_econome')) return { locked: true }; // après le nœud précédent
      return state.pompe.niveau >= step.niveau ? { done: true } : { cost: upgradeCost(state.pompe), buy: () => upgradeDevice(state, state.pompe.id) };
    case 'tech': {
      if (hasTech(state, step.id)) return { done: true };
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (techStatus(state, step.id) !== 'disponible') return { locked: true };
      if (techPoints(state).solde < DATA.techtree.noeuds[step.id].pt) return { locked: true }; // arbre v2 : PT
      return { cost: DATA.techtree.noeuds[step.id].cout, buy: () => buyTech(state, step.id) };
    }
    default:
      return { done: true };
  }
}

// Vend juste assez de conserves pour payer un achat, sans descendre sous le stock gardé.
function botRaiseFunds(state, cost) {
  const price = DATA.items.conserve.prix;
  const spare = countItem(state, 'conserve') - DATA.SIMULATION.CONSERVES_GARDEES;
  const needed = Math.ceil((cost - state.pieces - EPS) / price);
  if (needed > 0 && needed <= spare) sellItem(state, 'conserve', needed);
}

// Achète, dans l'ordre, ce qui fait le plus avancer le chapitre en cours puis le
// plan général ; s'arrête sur la première étape trop chère (il économise pour elle).
function botBuy(state, eveilS) {
  const S = DATA.SIMULATION;
  const chapitre = Math.min(chapterReached(state), chapterCount());
  const steps = [{ type: 'infra' }, ...(S.PRIORITE[chapitre] || []), ...S.PLAN];
  for (let guard = 0; guard < 40; guard++) {
    let bought = false;
    for (const step of steps) {
      const info = botStepInfo(state, step, eveilS);
      if (info.done || info.locked) continue;
      // une caisse reste en réserve pour les graines, le blé et les soins (sauf pour l'eau et l'énergie)
      const target = info.cost + (step.type === 'infra' ? 0 : S.CAISSE);
      if (state.pieces + EPS < target) botRaiseFunds(state, target);
      if (state.pieces + EPS < target) return;
      if (!info.buy().ok) return;
      bought = true;
      break; // l'état a changé : on relit le plan depuis le début
    }
    if (!bought) return;
  }
}

/* ---------- ventes et rangement du soir ---------- */

// Vend ce qui périrait demain et que le repas de ce soir ne mangera pas, la laine,
// le blé en trop et la paille en trop. Avec un réfrigérateur en marche, on range au lieu de vendre.
function botSell(state) {
  const S = DATA.SIMULATION;
  const cold = state.frigo.construit && state.frigo.appareil.allume && !isBroken(state.frigo.appareil);
  if (!cold) {
    const plan = planMeal(state);
    const expiring = expiringSoon(state);
    for (const item of Object.keys(expiring)) {
      const eaten = Math.max(0, (plan.mange[item] || 0) - (plan.froid[item] || 0));
      const spare = Math.min(expiring[item] - eaten, countItem(state, item) - (state.famille.reserve[item] || 0));
      if (spare >= 1) sellItem(state, item, Math.floor(spare));
    }
  }
  const laine = countItem(state, 'laine');
  if (laine >= 1) sellItem(state, 'laine', laine);
  const ble = countItem(state, DATA.SILO.ITEM) - S.BLE_MAX;
  if (ble >= 1) sellItem(state, DATA.SILO.ITEM, ble);
  // la paille que la farine a donnée en trop (sans animaux, toute la paille),
  // et la farine que la paille a donnée en trop
  const paille = strawStock(state) - strawNeed(state) * S.PAILLE_MAX_NUITS;
  if (paille >= 1) sellItem(state, DATA.PATURAGE.nourriture, paille);
  const farine = countItem(state, 'farine') - S.FARINE_MAX;
  if (farine >= 1) sellItem(state, 'farine', farine);
}

// Range au frais tout ce qui périme (sauf la réserve de semences).
function botStore(state) {
  const f = state.frigo;
  if (!f.construit || !f.appareil.allume || isBroken(f.appareil)) return;
  for (const item of Object.keys(inventoryCounts(state))) {
    if (!isPerishable(item)) continue;
    const qty = Math.floor(countItem(state, item) - (state.famille.reserve[item] || 0) + EPS);
    if (qty >= 1) moveToFridge(state, item, qty);
  }
}

/* ---------- une journée, une partie ---------- */

// Série d'actions du joueur. `soir` : dernière série avant de dormir.
function botActions(state, strat, options, soir) {
  botMaintenance(state);
  botHeal(state);
  setSeedReserve(state, 'patate', state.potager.parcelles.length - botFieldTarget(state));
  botBuy(state, strat.eveilS);
  botFarm(state);
  botHens(state);
  botSheep(state);
  botMill(state);
  botCook(state);
  if (!soir) return;
  botSell(state);
  botBuy(state, strat.eveilS);
  if (options.depannage) {
    const item = options.depannage.item;
    const price = buyPrice(state, item);
    options.depannage.dernier = { prix: price, possible: state.pieces + EPS >= price };
    if (options.depannage.dernier.possible) buyItem(state, item, 1);
  }
  botStore(state);
}

// Une journée complète : des séries d'actions tous les PAS_S secondes pendant
// `eveilS` secondes, puis Dormir. Renvoie le compte rendu du réveil.
function botDay(state, strat, options) {
  const S = DATA.SIMULATION;
  const eveil = Math.max(strat.eveilS, awakeRequired(state));
  botActions(state, strat, options, false);
  let t = 0;
  while (t + EPS < eveil) {
    const dt = Math.min(S.PAS_S, eveil - t);
    tick(state, dt);
    t += dt;
    botActions(state, strat, options, t + EPS >= eveil);
  }
  return sleep(state);
}

// Joue `nuits` nuits à partir de `state` (l'appelant passe une copie : elle est
// modifiée). Renvoie une ligne par nuit : chapitre au début de la journée,
// autonomie et santé à la fin de la nuit, pièces et conserves au réveil.
// options.depannage = { item } : chaque soir, le joueur achète aussi une unité de
// cet aliment au Marché (vérification de la section 8.11).
function simulatePlay(state, strategyId, nights = DATA.SIMULATION.NUITS, options = {}) {
  const strat = DATA.SIMULATION.STRATEGIES[strategyId];
  if (!strat) throw new Error(`Stratégie inconnue : ${strategyId}`);
  const rows = [];
  for (let i = 0; i < nights; i++) {
    const nuit = state.day;
    const chapitre = chapterReached(state);
    if (options.depannage) options.depannage.dernier = null;
    botDay(state, strat, options);
    const sante = state.famille.membres.map((m) => m.sante);
    rows.push({
      nuit,
      chapitre,
      autonomie: state.nuit.autonomie,
      couverture: state.nuit.couverture,
      santeMoyenne: rawAverageHealth(state),
      santeMin: Math.min(...sante),
      malades: state.famille.membres.filter((m) => m.malade).length,
      pieces: state.pieces,
      conserves: countItem(state, 'conserve'),
      soinsPayes: state.famille.soinsPayes,
      potager: state.potager.niveau,
      depannage: options.depannage ? options.depannage.dernier : null,
    });
  }
  return rows;
}

// Partie neuve de `nights` nuits, jouée par la stratégie donnée.
function simulateGame(strategyId, nights = DATA.SIMULATION.NUITS, seed = DATA.SIMULATION.GRAINE, options = {}) {
  return simulatePlay(createInitialState(seed), strategyId, nights, options);
}

// Première nuit où l'autonomie lissée (moyenne des LISSAGE dernières nuits) atteint `pct`, ou null.
function simulationReach(rows, pct) {
  const k = DATA.SIMULATION.LISSAGE;
  for (let i = k - 1; i < rows.length; i++) {
    const window = rows.slice(i - k + 1, i + 1);
    const mean = window.reduce((t, r) => t + r.autonomie, 0) / k;
    if (mean + EPS >= pct) return rows[i].nuit;
  }
  return null;
}

// Joue `nights` nuits sur une COPIE de la partie (la partie en cours n'est pas
// touchée) : sert au bouton du mode test.
function simulateFromCopy(state, strategyId = 'applique', nights = 60) {
  return simulatePlay(JSON.parse(JSON.stringify(state)), strategyId, nights);
}
