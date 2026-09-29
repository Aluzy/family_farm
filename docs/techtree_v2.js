// Arbre des technologies v2 — proposition de données pour DATA.techtree
// (remplace le bloc actuel de jeu.html, Lot 7). Voir arbre_technologique.md.
//
// Décisions retenues :
//  1. Les chapitres donnent des points de technologie (PT) et ouvrent les
//     paliers ; ils continuent d'ouvrir les bâtiments principaux. L'arbre
//     débloque les recettes secondaires, les nouveaux petits équipements et
//     tous les effets (temps, consommation, confort).
//  2. Les automatisations passent dans l'arbre : le niveau 5 du Potager, du
//     Champ et du Poulailler ne donne plus que des parcelles ou de la place.
//  3. Pas de système de qualité ni de produits « premium ».
//  4. Les 6 branches actuelles sont conservées telles quelles.
//
// Tous les effets sont en entiers (% ou quantités), comme le reste du jeu (v25).
// Chaque nœud coûte des PT ET des pièces. Les identifiants existants
// (semis_auto, prepa_1, prepa_2, reveil_1, reveil_2) sont conservés pour la
// compatibilité des sauvegardes.
//
// Types de prérequis :
//   { noeud: 'id' }                    technologie déjà acquise
//   { batiment: 'id', niveau: n }      niveau d'un bâtiment (buildingLevel)
//   { construit: 'id' }                bâtiment ou atelier construit
//   { appareil: 'batterie', nombre: n } nombre d'appareils du parc
// Le palier ajoute un prérequis implicite : chapitre en cours ≥ PALIERS[p].

export const TECHTREE_V2 = {
  // Palier → chapitre en cours minimal pour que le nœud soit achetable.
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

  // L'onglet s'ouvre toujours à 100 pièces (DATA.TECHNO inchangé).

  batiments: {
    potager:    { nom: 'Potager',    icone: '🌱' },
    champ:      { nom: 'Champ',      icone: '🌾' },
    serre:      { nom: 'Serre',      icone: '🏡' },
    poulailler: { nom: 'Poulailler', icone: '🐔' },
    silo:       { nom: 'Silo',       icone: '🛖' },
    pompe:      { nom: 'Pompe',      icone: '⛲' },
    paturage:   { nom: 'Pâturage',   icone: '🐑' },
    four:       { nom: 'Four',       icone: '🔥' },
    frigo:      { nom: 'Réfrigérateur', icone: '🧊' },
    batterie:   { nom: 'Batteries',  icone: '🔋' },
  },

  branches: [
    { id: 'energie', nom: 'Énergie', icone: '⚡', suivi: ['panneau', 'batterie'] },
    { id: 'eau', nom: 'Eau', icone: '💧', suivi: ['pompe'] },
    { id: 'culture', nom: 'Culture', icone: '🌱', suivi: ['potager', 'champ'] },
    { id: 'elevage', nom: 'Élevage', icone: '🐔', suivi: ['poulailler', 'silo'] },
    { id: 'cuisine', nom: 'Cuisine', icone: '🍳', suivi: ['stations'] },
    { id: 'famille', nom: 'Famille', icone: '👨‍👩‍👧‍👦', suivi: [] },
  ],

  // Recettes toujours disponibles dès que leur atelier est construit.
  RECETTES_LIBRES: [
    'pain', 'gratin_patates', 'tarte_pommes',
    'omelette', 'ratatouille', 'ragout', 'compote', 'soupe_legumes', 'salade_tomates',
    'farine', 'huile',
  ],

  // Nouvelle recette introduite par la Conserverie.
  NOUVELLES_RECETTES: {
    bocal_legumes: {
      nom: 'Bocal de légumes', icone: '🫙', station: 'cuisine', temps: 30,
      ingredients: [{ ou: ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'oignon', 'poivron', 'epinard'], qte: 4 }],
      eau: 1, energieForcee: 40, imperissable: true, // 🟡 valeurs à caler
    },
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
      effet: { auto: { arrosage: ['potager', 'champ'] } },
      description: 'Chaque nuit, toutes les parcelles plantées du Potager et du Champ sont arrosées automatiquement.',
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
      description: 'Ajoute « Arroser tout » et « Récolter tout » au Potager, au Champ et à la Serre.',
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
      effet: { auto: { recolte: ['potager', 'champ'] } },
      description: 'Chaque nuit, les parcelles mûres du Potager et du Champ sont récoltées automatiquement (sauf celles qui montent en graine).',
    },
    semis_auto: {
      branche: 'culture', palier: 4, nom: 'Semis automatique', icone: '🌾', fonction: 'automatisation',
      pt: 2, cout: 1200, requiert: [{ noeud: 'cu_recolte_auto' }, { noeud: 'ea_irrigation' }],
      effet: { auto: { semis: ['potager', 'champ'] } },
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
      description: 'Chaque nuit, les moutons dont la laine est prête sont tondus automatiquement.',
    },
    el_paturage: {
      branche: 'elevage', palier: 4, nom: 'Pâturage tournant', icone: '🐑', fonction: 'productivite',
      pt: 1, cout: 400, requiert: [{ construit: 'paturage' }],
      effet: { croissanceSurface: 110 },
      description: 'Le prix de chaque parcelle de pâturage supplémentaire augmente de 10 % au lieu de 20 %.',
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
      description: 'Chaque atelier accepte jusqu\'à 3 préparations à la suite : elles s\'enchaînent sans clic, ingrédients réservés au lancement.',
    },
    cui_laiterie: {
      branche: 'cuisine', palier: 3, nom: 'Laiterie', icone: '🧀', fonction: 'deblocage',
      pt: 1, cout: 300, requiert: [{ construit: 'paturage' }],
      effet: { recettes: ['fromage_frais', 'riz_au_lait'] },
      description: 'Nouvelles recettes en Cuisine : fromage frais, riz au lait.',
    },
    cui_rotisserie: {
      branche: 'cuisine', palier: 3, nom: 'Rôtisserie', icone: '🍗', fonction: 'deblocage',
      pt: 1, cout: 300, requiert: [{ noeud: 'cui_boulangerie' }, { construit: 'paturage' }],
      effet: { recettes: ['roti_boeuf', 'poulet_roti_ail', 'poivrons_farcis'] },
      description: 'Nouvelles recettes au Four : rôti de bœuf, poulet rôti à l\'ail, poivrons farcis.',
    },
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
};
