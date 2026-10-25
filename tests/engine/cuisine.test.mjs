/* ==========================================================================
   Tests du moteur : Lot 5 : stations, recettes, Livre de recette ; nouvelles recettes ; le Moulin (version 1.1).
   Lancer seul : node --test tests/engine/cuisine.test.mjs (ou node tests/run-tests.mjs cuisine).
   ========================================================================== */

import {
  actionCost, addItem, allDevices, boiteCounts, buildStation, buyItem, buyPasture,
  buyPrice, buySheep, cancelMilling, cancelQueued, countItem, createInitialState, DATA,
  depenserMembre, deposerBoite, deviceStatus, dishEnergy, dishPrice, feedAllHens, findDevice,
  findPlot, fridgeCount, fridgeRate, fridgeUnits, grantTech, harvest, harvestAll, hasTech,
  houseRepaired, ingredientOptions, inventoryCounts, isBroken, isBuyable, isPerishable,
  loadShedding, lotsOf, maintainCost, maintainDevice, mangerMembre, mangeurs, marketCoef, migrate,
  millPending, millTimeLeft, moveToFridge, panelOutput, pastureCost, plant, productionItemKeys,
  queueCapacity, recipeNode, recipeStatus, recipeUnlocked, repairCost, repairDevice, scaleEnergie,
  sellableCount, sellItem, sellPrice, shelfLife, simulateOffline, sleep, snackEnergy, startFarm,
  startHousehold, startLot4, startMilling, startRecipe, storeWheat, taskTimeLeft, techEffects,
  techPct, testAddEggs, testAddFlour, testAddHens, testAddOil, testAddSeeds, testAddWheat,
  testBatir, testBuildStations, testSetLevel, testSetWear, testWearMill, testWoolReady, tick,
  toggleDevice, unlockLevel, upgradeCost, upgradeDevice, valeurAliment, wakeEnergy, waterAll,
  waterCostFor, wheatForHens, wheatTotal,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, construireFrigo, atelier, AVANT_DEMENAGEMENT, boite, coldRoom, farm, fillSheep,
  garden, kwh, matin, migreAvant, ml, pature, plantRipe, ranch, reach, runFor, setInv, sleepOnce,
  test,
} from './aide.mjs';

/* ---------- Lot 5 : stations, recettes, Livre de recette ---------- */

test('DATA Lot 5 : stations, recettes, farine et huile', () => {
  const S = DATA.STATIONS;
  assertEqual([S.four.prixConstruction, S.cuisine.prixConstruction, S.moulin.prixConstruction, S.presse.prixConstruction], [100, 150, 120, 150]);
  assertEqual([S.four.electrique, S.cuisine.electrique, S.moulin.electrique, S.presse.electrique], [false, false, true, true]);
  assertEqual([S.moulin.whParS, S.presse.whParS], [20, 30]);
  assertEqual(S.cuisine.requiert, undefined, 'version 1.7 : la Cuisine (niveau 2) arrive avant le Four (niveau 5)');
  assertEqual([S.four.debloque, S.cuisine.debloque], [['recettes'], ['recettes']]);
  const R = DATA.RECETTES;
  // Lot 14 : temps des plats Four/Cuisine divisés par 2, arrondis au supérieur.
  assertEqual([R.pain.station, R.pain.temps, R.pain.ingredients, R.pain.eau], ['four', 10, [{ item: 'farine', qte: 2 }], 1]);
  assertEqual([R.omelette.station, R.omelette.temps], ['cuisine', 8]); // 15 / 2 = 7,5 → 8
  assertEqual([R.ratatouille.station, R.ratatouille.temps], ['cuisine', 15]);
  assertEqual([R.gratin_patates.station, R.gratin_patates.temps], ['four', 15]);
  assertEqual([R.compote.station, R.compote.temps, R.compote.ingredients], ['cuisine', 8, [{ ou: ['pomme', 'poire'], qte: 3 }]]);
  assertEqual([R.tarte_pommes.station, R.tarte_pommes.temps], ['four', 23]);
  assertEqual([R.farine.station, R.farine.temps, R.farine.sortie], ['moulin', 5, 'farine']);
  // Version 1.1 : la mouture se lance au Moulin ; version 1.23 : 1 blé ne rend plus que de la
  // farine (la paille se fauche).
  assertEqual([R.farine.ingredients, R.farine.qteSortie, R.farine.sousProduit, R.farine.horsLivre], [[{ item: 'ble', qte: 1 }], 1, undefined, true]);
  assertEqual([R.huile.sousProduit, R.huile.horsLivre], [undefined, undefined], 'la Presse ne change pas');
  assertEqual([R.huile.station, R.huile.temps, R.huile.ingredients], ['presse', 10, [{ item: 'graine_tournesol', qte: 3 }]]);
  assertEqual([DATA.OBJETS.farine.energie, DATA.OBJETS.huile.energie], [scaleEnergie(10), scaleEnergie(10)]);
  // Lot 13 : farine 1 → 2 (doublée) ; huile inchangée.
  assertEqual([DATA.OBJETS.farine.prix, DATA.OBJETS.huile.prix], [2, 4]);
  assertEqual([DATA.OBJETS.farine.mangeable, DATA.OBJETS.huile.mangeable], [false, false]);
});

test('énergie des plats : somme des ingrédients × 1,3, arrondie (pain 34, omelette 68, tarte aux pommes 90)', () => {
  // Lot 11 (nutrition) : énergies des ingrédients × 1,25 (voir DATA.OBJETS),
  // sauf gratin_patates qui porte un override explicite (energieForcee: 150).
  assertEqual(DATA.OBJETS.pain.energie, 34);
  assertEqual(DATA.OBJETS.omelette.energie, 68);
  assertEqual(DATA.OBJETS.ratatouille.energie, 53);
  assertEqual(DATA.OBJETS.gratin_patates.energie, 150);
  assertEqual(DATA.OBJETS.compote.energie, 39);
  assertEqual(DATA.OBJETS.tarte_pommes.energie, 90);
  assertEqual(dishEnergy('tarte_pommes'), 90);
  assertEqual(dishEnergy('gratin_patates'), 150, 'override explicite, pas un calcul ingrédients × coefficient');
});

test('Lot 11 (nutrition) : +25 % sur les aliments existants, arrondi centralisé', () => {
  // scaleEnergie() est LA règle d'arrondi (Math.round) utilisée pour dériver
  // chaque valeur ci-dessous à partir de l'ancienne (avant/après) ; on vérifie
  // qu'elle est bien cohérente avec elle-même sur des cas ronds et des cas
  // à arrondir (,5).
  assertEqual([scaleEnergie(6), scaleEnergie(8), scaleEnergie(20)], [8, 10, 25], 'cas ronds');
  assertEqual([scaleEnergie(10), scaleEnergie(15), scaleEnergie(30)], [13, 19, 38], 'cas à ,5 : arrondi au supérieur');
  // Avant / après (valeurs d'origine → valeurs actuelles) pour quelques aliments.
  const avantApres = [
    ['carotte', 6, 8], ['patate', 15, 19], ['tomate', 6, 8], ['courgette', 8, 10],
    ['aubergine', 8, 10], ['conserve', 20, 25], ['oeuf', 10, 13], ['viande_mouton', 30, 38],
    ['pomme', 8, 10], ['poire', 8, 10], ['farine', 10, 13], ['huile', 10, 13],
  ];
  for (const [item, avant, apres] of avantApres) {
    assertEqual(DATA.OBJETS[item].energie, apres, `${item} : ${avant} → ${apres}`);
    assertEqual(scaleEnergie(avant), apres, `${item} : cohérent avec la règle d'arrondi`);
  }
});

test('le Gratin de patates rassasie à lui seul un membre affamé', () => {
  const s = boite(garden(), { gratin_patates: 3 });
  assertEqual(valeurAliment('gratin_patates'), 33);
  const m = mangeurs(s)[0];
  depenserMembre(s, m.id, 30);
  assertEqual(mangerMembre(s, m).mange, { gratin_patates: 1 }, 'de 70 à 100 : un seul gratin');
  assertEqual(boiteCounts(s), { gratin_patates: 2 }, 'les 2 gratins restants ne sont pas touchés');
});

test('prix de vente des plats : somme des prix × 1,3, arrondi', () => {
  // Lot 12 : les productions de la ferme sont doublées à la source ; les
  // plats gardent la même formule (somme des prix d'ingrédients × 1,3) et
  // ne sont donc doublés qu'indirectement, une seule fois. Le pain, fait de
  // farine et d'eau, est doublé explicitement au Lot 13 (4 → 8, voir
  // recipes.pain.coefPrix).
  assertEqual(DATA.OBJETS.pain.prix, 8, 'pain : 4 × 2 (Lot 13)');
  assertEqual(DATA.OBJETS.omelette.prix, 21); // (3 œufs à 4 + huile 4) × 1,3 = 20,8
  assertEqual(DATA.OBJETS.ratatouille.prix, 18); // (2 + 4 + 4 + huile 4) × 1,3 = 18,2
  assertEqual(DATA.OBJETS.gratin_patates.prix, 21); // (3 patates à 4 + 1 œuf à 4) × 1,3 = 20,8
  assertEqual(DATA.OBJETS.ragout.prix, 36); // plat retiré (version 1.1) : son ancien prix, gardé tel quel
  assertEqual(DATA.OBJETS.compote.prix, 16); // 3 pommes à 4 × 1,3 = 15,6
  assertEqual(DATA.OBJETS.tarte_pommes.prix, 26); // farine à 2 depuis le Lot 13 (23 avant)
  // Productions de la ferme : ancienne valeur × 2.
  assertEqual([DATA.OBJETS.viande_mouton.prix, DATA.OBJETS.pomme.prix, DATA.OBJETS.poire.prix], [10, 4, 4]);
  // Anciennes viandes : le bœuf vaut le mouton ; la volaille vaut moins.
  assertEqual([DATA.OBJETS.viande_boeuf.prix, DATA.OBJETS.viande_volaille.prix, DATA.OBJETS.lait.prix], [10, 6, 8]);
});

test('Lot 12 : le gratin est doublé une seule fois (formule sur ingrédients déjà doublés, pas de ×2 en plus)', () => {
  const it = DATA.OBJETS;
  const R = DATA.CUISINE;
  const prixIngredients = 3 * it.patate.prix + 1 * it.oeuf.prix; // 12 + 4 = 16
  assertEqual(prixIngredients, 16);
  // Une seule application de la formule sur les prix d'ingrédients courants…
  assertEqual(it.gratin_patates.prix, Math.round((prixIngredients * R.COEF_PLAT) / 100));
  assertEqual(it.gratin_patates.prix, dishPrice('gratin_patates'));
  // …et surtout pas un second ×2 par-dessus (42) : 21 seulement, contre 10 avant le Lot 12.
  assert(it.gratin_patates.prix !== 2 * dishPrice('gratin_patates'), 'pas de double doublement');
  assertEqual(it.gratin_patates.prix, 21);
  // Aucun objet « plat » ne figure dans l'ensemble des productions doublées.
  const doubles = productionItemKeys();
  for (const [id, def] of Object.entries(it)) {
    if (def.plat) assertEqual(doubles.has(id), false, `${id} : un plat n'est pas une production doublée`);
  }
});

// Lot 12 : valeurs d'origine (avant doublement) des productions de la ferme.
const PRIX_PRODUCTIONS_AVANT_LOT_12 = {
  carotte: 1, patate: 2, tomate: 1, courgette: 2, aubergine: 2, ble: 1,
  oeuf: 2, pomme: 2, poire: 2, cerise: 2, abricot: 2, peche: 2, laine: 6,
  oignon: 1, ail: 2, poivron: 2, epinard: 1, fraise: 2, riz: 1,
  houblon: 3, cacao: 8, vanille: 15, cafe: 6,
  lait: 4,
};

// Version 1.1 : les viandes ne sont plus des productions de la ferme. Leur prix
// (déjà doublé au Lot 12) est écrit tel quel dans DATA.OBJETS.
const PRIX_ANCIENNES_VIANDES = { viande_mouton: 10, viande_boeuf: 10, viande_volaille: 6 };

test('Lot 12 : chaque production de la ferme se vend deux fois son ancien prix', () => {
  for (const [id, avant] of Object.entries(PRIX_PRODUCTIONS_AVANT_LOT_12)) {
    assertEqual(DATA.OBJETS[id].prix, avant * DATA.MARCHE.MULTIPLICATEUR_PRODUCTION, `${id} : ${avant} × 2`);
    assertEqual(DATA.OBJETS[id].prix, avant * 2, `${id} : ancienne valeur × 2`);
    assertEqual(sellPrice(id), avant * 2, `${id} : sellPrice()`);
  }
  // La liste déduite de DATA.CULTURES / VERGER / ANIMAUX correspond exactement
  // à la liste attendue : ni oubli, ni objet en trop.
  assertEqual([...productionItemKeys()].sort(), Object.keys(PRIX_PRODUCTIONS_AVANT_LOT_12).sort());
  // Les anciennes viandes gardent leur prix sans passer par le doublement ; la
  // paille (fauchée) n'est pas doublée non plus.
  for (const [id, prix] of Object.entries(PRIX_ANCIENNES_VIANDES)) {
    assertEqual([productionItemKeys().has(id), DATA.OBJETS[id].prix, sellPrice(id)], [false, prix, prix], id);
  }
  assertEqual([productionItemKeys().has('paille'), DATA.OBJETS.paille.prix], [false, 1]);
});

test('Lot 12 : graines, conserve, huile inchangées ; aucun bâtiment, animal ni arbre doublé', () => {
  const it = DATA.OBJETS;
  for (const [id, def] of Object.entries(it)) {
    // (les jeunes arbres de la ferme générée ont le prix des arbres du Verger)
    if (def.categorie === 'graine' && !def.arbre) assertEqual(def.prix, 1, `${id} : graine inchangée`);
  }
  assertEqual(it.graine_tournesol.prix, 1, 'le tournesol récolte des graines : non doublées');
  assertEqual([it.conserve.prix, it.huile.prix], [3, 4]); // la farine, elle, double au Lot 13
  // Prix d'achat des graines au Marché : prix inchangé × plancher 2,0.
  assertEqual(buyPrice(garden(), 'graine_carotte'), 2);
  // Constructions, améliorations, animaux, arbres, soins : hors périmètre.
  assertEqual([DATA.POULAILLER.PRIX_CONSTRUCTION, DATA.SERRE.PRIX_CONSTRUCTION, DATA.FRIGO.PRIX_CONSTRUCTION], [40, 1000, 600]); // Serre : toute sa terre, prix relevé
  assertEqual(DATA.STATIONS.four.prixConstruction, 100);
  assertEqual(DATA.RESEAU.panneau.prixNiveaux, [0, 150, 400, 900, 2000]);
  assertEqual([DATA.ANIMAUX.poule.prix, DATA.ANIMAUX.mouton.prix, DATA.ANIMAUX.vache.prix], [15, 60, 200]);
  assertEqual([DATA.VERGER.ARBRES.pommier.prix, DATA.VERGER.ARBRES.poirier.prix], [40, 40]);
  assertEqual(DATA.FAMILLE.SOIN, undefined, 'version 1.8 : plus de soins');
});

test('Lot 12 : la vente crédite le nouveau montant et le Marché affiche le prix réellement payé', () => {
  const s = garden();
  setInv(s, { patate: 3, lait: 2, cacao: 1 });
  const avant = s.pieces;
  const r = sellItem(s, 'patate', 3);
  assertEqual([r.ok, r.gain], [true, 12], '3 patates à 4');
  assertEqual(s.pieces, avant + 12);
  assertEqual(sellItem(s, 'lait', 2).gain, 16, '2 laits à 8');
  assertEqual(sellItem(s, 'cacao', 1).gain, 16, '1 cacao à 16');
  // Achat : le prix affiché (buyPrice) est exactement ce qui est débité, et
  // la formule d'achat s'applique au nouveau prix de vente (× 120 % au départ,
  // arrondi à l'entier supérieur).
  const t = garden();
  t.pieces = 100;
  const affiche = buyPrice(t, 'patate');
  assertEqual(affiche, Math.ceil(DATA.OBJETS.patate.prix * 1.2));
  const avantAchat = t.pieces;
  const b = buyItem(t, 'patate');
  assertEqual([b.ok, b.cost], [true, affiche]);
  assertEqual(t.pieces, avantAchat - affiche);
  // Revendre ce qu'on vient d'acheter reste perdant (achat > vente).
  assert(buyPrice(garden(), 'tomate') > sellPrice('tomate'), 'acheter coûte plus cher que revendre');
});

test('Marché : les articles rangés au frigo se vendent aussi (l\'inventaire part d\'abord)', () => {
  const s = garden();
  s.pieces = 1000;
  construireFrigo(reach(s, 'frigo'));
  setInv(s, { carotte: 5 });
  assert(moveToFridge(s, 'carotte', 3).ok, 'ranger 3 carottes');
  assertEqual([countItem(s, 'carotte'), fridgeCount(s, 'carotte'), sellableCount(s, 'carotte')], [2, 3, 5]);
  const avant = s.pieces;
  // 4 carottes : les 2 de l'inventaire d'abord, puis 2 du frigo.
  const r = sellItem(s, 'carotte', 4);
  assertEqual([r.ok, r.sold, r.gain], [true, 4, 8], '4 carottes à 2');
  assertEqual(s.pieces, avant + 8);
  assertEqual([countItem(s, 'carotte'), fridgeCount(s, 'carotte')], [0, 1]);
  // Article uniquement au frigo : vendable, et le stock plafonne la vente.
  const r2 = sellItem(s, 'carotte', 99);
  assertEqual([r2.ok, r2.sold, r2.gain], [true, 1, 2]);
  assertEqual([fridgeCount(s, 'carotte'), fridgeUnits(s)], [0, 0]);
  assert(!s.frigo.items.carotte, 'le lot vide est retiré du frigo');
  assertEqual(sellItem(s, 'carotte', 1).ok, false, 'plus rien à vendre');
  // Le coefficient d'achat baisse comme pour une vente ordinaire.
  const t = garden();
  t.pieces = 1000;
  construireFrigo(reach(t, 'frigo'));
  buyItem(t, 'patate', 3);
  moveToFridge(t, 'patate', 3);
  assertEqual(marketCoef(t, 'patate'), 150);
  sellItem(t, 'patate', 3);
  assertEqual(marketCoef(t, 'patate'), 120);
});

test('Marché : sans frigo, rien ne change pour la vente', () => {
  const s = garden();
  setInv(s, { patate: 2 });
  assertEqual([sellableCount(s, 'patate'), fridgeCount(s, 'patate')], [2, 0]);
  assertEqual(sellItem(s, 'patate', 5).sold, 2);
});

// Lot 14 : temps de préparation d'origine (secondes) des plats du Four et de la Cuisine.
const TEMPS_PLATS_AVANT_LOT_14 = {
  pain: 20, omelette: 15, ratatouille: 30, gratin_patates: 30, compote: 15, tarte_pommes: 45,
  soupe_legumes: 30, salade_tomates: 10, quiche_epinards: 40, fromage_frais: 60, riz_au_lait: 30,
  pain_ail: 15, tarte_fraises: 40, confiture_fraises: 30,
  chocolat_chaud: 20, cafe_boisson: 10, creme_vanille: 45, biere_artisanale: 60,
  bocal_legumes: 60,
  // version 1.5 (ville.json) : recettes des denrées de la ville
  omelette_champignons: 15, poisson_grille: 15, raclette: 20, creme_marrons: 25, tarte_myrtilles: 30, pain_epices: 30,
  // recettes des œufs et des poissons de la ferme
  mayonnaise: 10, quenelle_poisson: 20,
};

test('Lot 14 : temps de préparation des plats Four/Cuisine divisés par 2 (arrondi au supérieur), transformations intactes', () => {
  const ids = Object.keys(DATA.RECETTES).filter((id) => !DATA.RECETTES[id].transformation);
  assertEqual([...ids].sort(), Object.keys(TEMPS_PLATS_AVANT_LOT_14).sort(), 'aucun plat oublié ni en trop');
  for (const [id, avant] of Object.entries(TEMPS_PLATS_AVANT_LOT_14)) {
    const r = DATA.RECETTES[id];
    assert(['four', 'cuisine'].includes(r.station), `${id} : plat du Four ou de la Cuisine`);
    assertEqual(r.temps, Math.ceil(avant / 2), `${id} : ${avant} s / 2 arrondi au supérieur`);
    assert(Number.isInteger(r.temps), `${id} : temps entier`);
  }
  // Cas à demi-seconde : arrondi vers le haut, jamais vers le bas.
  assertEqual([DATA.RECETTES.omelette.temps, DATA.RECETTES.tarte_pommes.temps, DATA.RECETTES.pain_ail.temps], [8, 23, 8]);
  // Moulin et Presse : inchangés.
  assertEqual([DATA.RECETTES.farine.temps, DATA.RECETTES.huile.temps], [5, 10]);
  // La durée d'une préparation lancée est bien le nouveau temps.
  const s = atelier();
  setInv(s, { oeuf: 3, huile: 1 });
  assert(startRecipe(s, 'omelette').ok);
  assertEqual(s.stations.cuisine.tache.dureeMs, 8000);
});

test('Lot 13 : farine et pain se vendent deux fois leur ancien prix', () => {
  assertEqual([DATA.OBJETS.farine.prix, sellPrice('farine')], [2, 2], 'farine : 1 × 2');
  assertEqual([DATA.OBJETS.pain.prix, sellPrice('pain')], [8, 8], 'pain : 4 × 2');
  assertEqual(DATA.OBJETS.huile.prix, 4, 'l\'huile n\'est pas concernée');
  // Le pain garde la formule des plats sur ses ingrédients (farine doublée) avec
  // son coefficient dédié : (2 farines à 2 + 1 L d'eau) × 1,6 = 8, et non 7 (×1,3).
  assertEqual(DATA.RECETTES.pain.coefPrix, 160);
  assertEqual(dishPrice('pain'), 8);
  assertEqual(DATA.OBJETS.pain.prix, dishPrice('pain'));
  const s = atelier();
  setInv(s, { farine: 3, pain: 2 });
  const avant = s.pieces;
  assertEqual([sellItem(s, 'farine', 3).gain, sellItem(s, 'pain', 2).gain], [6, 16]);
  assertEqual(s.pieces, avant + 22);
  assertEqual(buyPrice(garden(), 'farine'), 3, 'prix d\'achat = nouveau prix de vente × coefficient (2 × 120 % = 2,4 → 3)');
});

test('les plats se gardent 6 nuits (le pain 7) ; la farine et l\'huile ne périment pas', () => {
  for (const id of ['omelette', 'ratatouille', 'gratin_patates', 'ragout', 'compote', 'tarte_pommes']) {
    assertEqual(shelfLife(id), 6, id);
  }
  assertEqual(shelfLife('pain'), 7);
  assertEqual([shelfLife('farine'), shelfLife('huile')], [null, null]);
});

/* ---------- nouvelles recettes ---------- */

const NOUVELLES_RECETTES = [
  'soupe_legumes', 'salade_tomates', 'quiche_epinards', 'fromage_frais', 'riz_au_lait',
  'pain_ail', 'tarte_fraises', 'confiture_fraises',
  'chocolat_chaud', 'cafe_boisson', 'creme_vanille', 'biere_artisanale',
];

// Version 1.1 : les plats à la viande ont quitté le livre de recette.
const PLATS_RETIRES = ['ragout', 'poivrons_farcis', 'roti_boeuf', 'poulet_roti_ail'];

const RECETTES_LUXE = ['chocolat_chaud', 'cafe_boisson', 'creme_vanille', 'biere_artisanale'];

test('nouvelles recettes : chacune existe, ses ingrédients et sa station existent, les quantités sont valides', () => {
  assertEqual(NOUVELLES_RECETTES.length, 12);
  for (const id of NOUVELLES_RECETTES) {
    const r = DATA.RECETTES[id];
    assert(!!r, `recette ${id} absente de DATA.RECETTES`);
    assert(!!DATA.STATIONS[r.station], `${id} : station ${r.station} inconnue`);
    assert(Array.isArray(r.ingredients) && r.ingredients.length > 0, `${id} : ingrédients manquants`);
    for (const ing of r.ingredients) {
      for (const item of ingredientOptions(ing)) {
        assert(!!DATA.OBJETS[item], `${id} : ingrédient ${item} absent de DATA.OBJETS`);
      }
      assert(typeof ing.qte === 'number' && ing.qte > 0, `${id} : quantité invalide pour ${ing.item || ing.ou}`);
    }
    assert(typeof r.temps === 'number' && r.temps > 0, `${id} : temps invalide`);
    if (r.eau != null) assert(typeof r.eau === 'number' && r.eau > 0, `${id} : eau invalide`);
  }
});

test('nouvelles recettes : aucune n\'est une transformation, toutes deviennent des items « plat »', () => {
  for (const id of NOUVELLES_RECETTES) {
    const r = DATA.RECETTES[id];
    assert(!r.transformation, `${id} ne doit pas être classée comme une transformation`);
    const it = DATA.OBJETS[id];
    assert(!!it, `${id} doit être enregistrée comme item par registerDishItems()`);
    assertEqual([it.categorie, it.plat, it.mangeable], ['plat', true, true], id);
  }
});

test('nouvelles recettes : énergie et prix, calculés par le système existant (recipeSum × COEF_PLAT)', () => {
  const attendu = {
    // Lot 12 : énergies inchangées ; prix recalculés sur des ingrédients
    // dont les prix de vente ont doublé (avant : 7, 8, 14, 16, 8, 13, 13,
    // 13, 10, 18, 12).
    soupe_legumes: [43, 12], salade_tomates: [38, 10], quiche_epinards: [95, 29],
    fromage_frais: [62, 31], riz_au_lait: [47, 16], pain_ail: [69, 21],
    tarte_fraises: [70, 26], confiture_fraises: [26, 21],
  };
  for (const [id, [energie, prix]] of Object.entries(attendu)) {
    assertEqual([dishEnergy(id), DATA.OBJETS[id].energie], [energie, energie], id);
    assertEqual([dishPrice(id), DATA.OBJETS[id].prix], [prix, prix], id);
  }
});

test('4 recettes de luxe : prix ×3 sur les ingrédients (pas le coefficient ×1,3 normal), énergie inchangée', () => {
  for (const id of RECETTES_LUXE) {
    assertEqual(DATA.RECETTES[id].coefPrix, 300, id);
  }
  const R = DATA.CUISINE;
  const casLuxe = {
    // Lot 12 : prixIngredients suit les prix de vente doublés (cacao 16,
    // lait 8, café 12, vanille 30, œuf 4, houblon 6, eau 1 L à 1). Avant :
    // 12, 7, 27, 7.
    chocolat_chaud: { energie: 21, prixIngredients: 24 },
    cafe_boisson: { energie: 0, prixIngredients: 13 },
    creme_vanille: { energie: 75, prixIngredients: 54 },
    biere_artisanale: { energie: 0, prixIngredients: 13 },
  };
  for (const [id, { energie, prixIngredients }] of Object.entries(casLuxe)) {
    // Énergie : calcul normal (×COEF_PLAT), coefPrix ne la concerne pas.
    assertEqual(dishEnergy(id), energie, `${id} : énergie normale (×${R.COEF_PLAT})`);
    // Prix : ×3, et surtout pas le ×1,3 qu'aurait donné le coefficient normal.
    assertEqual(dishPrice(id), prixIngredients * 3, `${id} : prix ×3`);
    assert(dishPrice(id) !== Math.round((prixIngredients * R.COEF_PLAT) / 100), `${id} : ne doit pas retomber sur le coefficient de ${R.COEF_PLAT} %`);
  }
});

test('bière artisanale : ne périme pas (comme le blé/la farine/la laine), contrairement aux autres plats', () => {
  assertEqual(shelfLife('biere_artisanale'), null);
  assertEqual(isPerishable('biere_artisanale'), false);
  const s = atelier();
  setInv(s, { biere_artisanale: 5 });
  assertEqual(lotsOf(s, 'biere_artisanale')[0].nightsLeft, null);
});

test('confiture de fraises : se conserve bien, imperissable comme une conserve', () => {
  assertEqual(shelfLife('confiture_fraises'), null);
  assertEqual(isPerishable('confiture_fraises'), false);
});

test('fromage frais : se conserve mieux que le lait cru (8 nuits contre 4)', () => {
  assertEqual(shelfLife('fromage_frais'), 8);
  assert(shelfLife('fromage_frais') > shelfLife('lait'), 'plus long que le lait cru');
});

test('nouvelles recettes : chacune se prépare quand ses conditions sont remplies', () => {
  const s = atelier();
  unlockRecipes(s); // arbre v2 : la plupart sont débloquées par un nœud
  const stocks = {
    soupe_legumes: { carotte: 1, oignon: 1, patate: 1 },
    salade_tomates: { tomate: 2, huile: 1 },
    quiche_epinards: { farine: 2, oeuf: 2, lait: 1, epinard: 1 },
    fromage_frais: { lait: 3 },
    riz_au_lait: { riz: 2, lait: 1 },
    pain_ail: { pain: 1, ail: 1, huile: 1 },
    tarte_fraises: { farine: 2, fraise: 3, oeuf: 1 },
    confiture_fraises: { fraise: 4 },
    chocolat_chaud: { cacao: 1, lait: 1 },
    cafe_boisson: { cafe: 1 },
    creme_vanille: { vanille: 1, lait: 2, oeuf: 2 },
    biere_artisanale: { houblon: 2 },
  };
  for (const id of NOUVELLES_RECETTES) {
    // Chaque recette, sans ses ingrédients : grisée (« manque »), refusée.
    setInv(s, {});
    s.stations[DATA.RECETTES[id].station].tache = null; // station libre entre deux essais
    assertEqual(recipeStatus(s, id).code, 'manque', `${id} sans ingrédients`);
    assertEqual(startRecipe(s, id).ok, false, `${id} refusée sans ingrédients`);
    // Avec les ingrédients (et l'eau, si nécessaire) : prête, et se lance.
    setInv(s, stocks[id]);
    s.eauMl = ml(40);
    assertEqual(recipeStatus(s, id).code, 'pret', `${id} avec ses ingrédients`);
    assertEqual(startRecipe(s, id).ok, true, `${id} se lance`);
    assertEqual(s.stations[DATA.RECETTES[id].station].tache.recette, id);
  }
});

test('mayonnaise (3 œufs) et quenelle de poisson (farine + truite, brochet ou poisson de la ville), à la Cuisine, dès sa construction', () => {
  const s = atelier();
  for (const id of ['mayonnaise', 'quenelle_poisson']) {
    assertEqual([DATA.RECETTES[id].station, recipeUnlocked(s, id), DATA.OBJETS[id].mangeable], ['cuisine', true, true], id);
  }
  setInv(s, { oeuf: 2 });
  assertEqual(recipeStatus(s, 'mayonnaise').code, 'manque', 'deux œufs ne suffisent pas');
  setInv(s, { oeuf: 3 });
  assertEqual(startRecipe(s, 'mayonnaise').ok, true);
  assertEqual(countItem(s, 'oeuf'), 0, 'les trois œufs');
  for (const poisson of ['truite', 'brochet', 'poisson']) {
    s.stations.cuisine.tache = null;
    setInv(s, { farine: 1, [poisson]: 1 });
    assertEqual(recipeStatus(s, 'quenelle_poisson').code, 'pret', `avec ${poisson}`);
    assertEqual(startRecipe(s, 'quenelle_poisson').ok, true, `avec ${poisson}`);
    assertEqual([countItem(s, 'farine'), countItem(s, poisson)], [0, 0], `farine et ${poisson} pris`);
  }
  s.stations.cuisine.tache = null;
  setInv(s, { truite: 1 });
  assertEqual(recipeStatus(s, 'quenelle_poisson').code, 'manque', 'sans farine');
});

test('arbre v2 : 22 recettes libres (dont 6 de la ville, la mayonnaise, la quenelle de poisson et les 4 lingots), 12 débloquées par un nœud', () => {
  const s = atelier();
  const libres = Object.keys(DATA.RECETTES).filter((id) => recipeUnlocked(s, id));
  assertEqual(libres.sort(), [...DATA.ARBRE.RECETTES_LIBRES].sort());
  assertEqual(libres.length, 22);
  assertEqual(Object.keys(DATA.RECETTES).length - libres.length, 12, 'dont le fromage d\'alpage (Laiterie)');
  for (const id of Object.keys(DATA.RECETTES)) assert(recipeUnlocked(s, id) || recipeNode(id), `${id} : libre ou débloquée par un nœud`);
  setInv(s, { pain: 1, ail: 1, huile: 1 });
  assertEqual(recipeStatus(s, 'pain_ail').code, 'verrouillee');
  assertEqual(startRecipe(s, 'pain_ail').error, 'Recette à débloquer dans l\'Arbre des technologies (Boulangerie).');
  assertEqual(countItem(s, 'pain'), 1, 'rien retiré');
  grantTech(s, 'cui_boulangerie');
  assertEqual(startRecipe(s, 'pain_ail').ok, true);
  // bocal de légumes : 4 légumes d'une même sorte, ne périme pas
  grantTech(s, 'cui_conserverie', false);
  setInv(s, { carotte: 4 });
  s.eauMl = ml(40);
  assertEqual(startRecipe(s, 'bocal_legumes').ok, true);
  runFor(s, 31);
  assertEqual(countItem(s, 'bocal_legumes'), 1);
  assertEqual([shelfLife('bocal_legumes'), DATA.OBJETS.bocal_legumes.energie], [null, 40]);
});

test('arbre v2 : préparations en série (file de 3 par atelier)', () => {
  const s = atelier();
  setInv(s, { farine: 10 });
  assert(startRecipe(s, 'pain').ok);
  assertEqual(startRecipe(s, 'pain').ok, false, 'sans le nœud : une préparation à la fois');
  grantTech(s, 'cui_serie');
  assertEqual(queueCapacity(s), 3);
  assertEqual(startRecipe(s, 'pain').enFile, true);
  assertEqual(startRecipe(s, 'pain').enFile, true);
  assertEqual(startRecipe(s, 'pain').ok, false, 'file pleine : 1 en cours + 2 en attente');
  assertEqual(recipeStatus(s, 'pain').code, 'occupee');
  assertEqual([countItem(s, 'farine'), s.eauMl], [4, ml(37)], 'ingrédients et eau réservés au lancement');
  // annuler rend les ingrédients
  assert(cancelQueued(s, 'four', 1).ok);
  assertEqual([countItem(s, 'farine'), s.eauMl, s.stations.four.file.length], [6, ml(38), 1]);
  // la suivante démarre toute seule
  runFor(s, 10.2);
  assertEqual([countItem(s, 'pain'), s.stations.four.tache.recette, s.stations.four.file.length], [1, 'pain', 0]);
  // la nuit termine tout ce qui est en cours
  assert(startRecipe(s, 'pain').ok);
  setInv(s, { farine: countItem(s, 'farine'), pain: countItem(s, 'pain'), conserve: 200 });
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.termine.pain, 2);
  assertEqual([s.stations.four.tache, s.stations.four.file], [null, []]);
});

test('arbre v2 : les effets suivent la liste des technologies, même modifiée sur place ou remplacée', () => {
  const s = farm();
  assertEqual([techPct(s, 'usure'), hasTech(s, 'en_entretien')], [100, false]);
  grantTech(s, 'en_entretien');
  assertEqual([techPct(s, 'usure'), hasTech(s, 'en_entretien')], [75, true]);
  s.technologies.push('inconnu', 'ea_econome'); // poussé directement : un identifiant inconnu est ignoré
  assertEqual([techEffects(s, 'eauArrosage'), hasTech(s, 'inconnu')], [[85], false]);
  techEffects(s, 'eauArrosage').push(1); // la liste rendue est une copie
  assertEqual(techEffects(s, 'eauArrosage'), [85]);
  s.technologies.splice(0, 1, 'ea_econome'); // même longueur, autre contenu
  assertEqual([techPct(s, 'usure'), techEffects(s, 'eauArrosage')], [100, [85, 85]]);
  s.technologies = ['en_entretien']; // remplacée (migration)
  assertEqual([techPct(s, 'usure'), techPct(s, 'eauArrosage'), hasTech(s, 'ea_econome')], [75, 100, false]);
  s.technologies = null;
  assertEqual([techPct(s, 'usure'), hasTech(s, 'en_entretien')], [100, false]);
});

test('arbre v2 : effets sur l\'énergie (usure, délestage, frigo, panneaux orientables, pompe)', () => {
  // Entretien préventif : 1 point d'usure toutes les 80 s de marche au lieu de 60 s
  const s = farm();
  grantTech(s, 'en_entretien');
  runFor(s, 60);
  assertEqual(s.panneaux[0].usure, 0);
  runFor(s, 20);
  assertEqual(s.panneaux[0].usure, 1);
  // Panneaux orientables : +10 % toute l'année (version 1.6 : plus d'hiver)
  const h = farm();
  assertEqual(panelOutput(h.panneaux[0], h), kwh(0.04));
  grantTech(h, 'en_hiver');
  assertEqual(panelOutput(h.panneaux[0], h), kwh(0.044));
  h.day = 31;
  assertEqual(panelOutput(h.panneaux[0], h), kwh(0.044), 'le même chaque nuit');
  // Réfrigérateur basse consommation : 70 %
  const f = coldRoom();
  const avant = fridgeRate(f);
  grantTech(f, 'en_frigo_eco');
  assertEqual(fridgeRate(f), Math.floor((avant * 70) / 100));
  // Pompe à haut rendement : 7,5 mWh par mL au lieu de 10
  const p = farm({ pump: true });
  toggleDevice(p, 'panneau-1');
  p.batteries[0].chargeMwh = kwh(1);
  grantTech(p, 'ea_pompe_eco');
  tick(p, 10);
  assertEqual([p.eauMl, p.batteries[0].chargeMwh], [ml(10), kwh(1) - 75000]);
  // Délestage : sous 10 % de charge, la pompe s'arrête (le frigo, lui, continue)
  const d = farm({ pump: true });
  toggleDevice(d, 'panneau-1');
  grantTech(d, 'en_delestage');
  d.batteries[0].chargeMwh = kwh(0.5); // 8 % de 6 000 Wh
  tick(d, 1);
  assertEqual([d.eauMl, loadShedding(d)], [0, true]);
  d.batteries[0].chargeMwh = kwh(1);
  tick(d, 1);
  assertEqual(d.eauMl, ml(1));
});

test('arbre v2 : entretien automatique et eau de pluie la nuit', () => {
  const s = farm();
  s.pieces = 1000;
  setInv(s, { conserve: 200 });
  s.pompe.prix = 72; // une pompe payée 72
  s.pompe.usure = 75;
  s.panneaux[0].usure = 75; // appareil de départ : entretien gratuit
  s.awakeMs = 30000;
  let r = sleep(s);
  assertEqual(r.entretiens, [], 'sans le nœud : rien');
  grantTech(s, 'en_entretien_auto');
  const pieces = s.pieces;
  s.awakeMs = 30000;
  r = sleep(s);
  assertEqual(r.entretiens.map((e) => [e.id, e.cost]), [['panneau-1', 0], ['pompe', 15]]);
  assertEqual([s.panneaux[0].usure, s.pompe.usure, pieces - s.pieces], [0, 0, 15]);
  // pluie : 15 L chaque nuit, dans la limite du réservoir
  grantTech(s, 'ea_pluie');
  s.eauMl = ml(30);
  s.awakeMs = 30000;
  r = sleep(s);
  assertEqual([r.pluie, s.eauMl], [10, ml(40)], 'plafonné à la place libre');
  s.eauMl = 0;
  s.day = 11;
  s.awakeMs = 30000;
  assertEqual(sleep(s).pluie, 15);
});

test('arbre v2 : effets sur les cultures et l\'élevage', () => {
  // Arrosage économe puis Gestion intelligente : 85 % puis 76 %
  const s = garden();
  plant(s, 'potager-1', 'courgette'); // 4 L
  grantTech(s, 'ea_econome');
  assertEqual(waterCostFor(s, 'courgette', 'potager'), 3, '4 × 85 % = 3,4 → 3');
  grantTech(s, 'ea_gestion');
  assertEqual(waterCostFor(s, 'courgette', 'potager'), 3, '4 × 76 % = 3,04 → 3');
  assertEqual(waterCostFor(s, 'carotte', 'potager'), 2, '2 × 76 % = 1,52 → 2');
  // Fluidité (FLU-10) : Arroser tout, Récolter tout dès le départ ; Outils de jardin :
  // 25 % d'énergie en moins sur ces actions groupées
  const g = garden();
  testAddSeeds(g);
  plant(g, 'potager-1', 'carotte');
  plant(g, 'potager-2', 'carotte');
  plantRipe(g, 'potager-3', 'patate');
  const e0 = g.energie;
  assertEqual(waterAll(g, 'potager'), { ok: true, arrosees: 2, sansEau: 0, raison: '' }, 'sans le nœud');
  assertEqual(e0 - g.energie, 2 * actionCost(g, 'arroser'), 'même énergie qu\'à la main');
  assertEqual(harvestAll(g, 'potager').recoltees, 1);
  assertEqual(harvestAll(g, 'potager').ok, false, 'plus rien de mûr');
  const o = garden();
  testAddSeeds(o);
  grantTech(o, 'cu_outils');
  plant(o, 'potager-1', 'carotte');
  plant(o, 'potager-2', 'carotte');
  const e1 = o.energie;
  assert(waterAll(o, 'potager').ok);
  assertEqual(e1 - o.energie, 2 * actionCost(o, 'arroser') - Math.floor((2 * actionCost(o, 'arroser') * 25) / 100), 'Outils de jardin : −25 %');
  // Sélection des semences : +1 graine (carotte : 2 à 3 au lieu de 1 à 2)
  const m = garden();
  grantTech(m, 'cu_semences');
  plantRipe(m, 'potager-1', 'carotte');
  const avant = countItem(m, 'graine_carotte');
  const gagnees = harvest(m, 'potager-1').items.graine_carotte;
  assert(gagnees === 2 || gagnees === 3, `2 ou 3 graines, obtenu ${gagnees}`);
  assertEqual(countItem(m, 'graine_carotte') - avant, gagnees);
  // Ration équilibrée : 2 blé pour 5 poules
  const r = ranch();
  grantTech(r, 'el_ration');
  r.poulailler.niveau = 2; // 8 places
  testAddHens(r, 5);
  testAddWheat(r, 10);
  feedAllHens(r);
  assertEqual([r.poulailler.nourries, r.jour.ble], [5, 2]);
  assertEqual(wheatForHens(r, 10), 4);
  // Étable agrandie : +10 % par achat au lieu de +20 %
  const t = pature();
  fillSheep(t, 10);
  buyPasture(t);
  buySheep(t);
  assertEqual(pastureCost(t), 48);
  grantTech(t, 'el_paturage');
  assertEqual(pastureCost(t), 44);
  // Tonte planifiée
  const u = pature();
  fillSheep(u, 2);
  testWoolReady(u);
  grantTech(u, 'el_tonte');
  setInv(u, { conserve: 200 });
  const rep = sleepOnce(u);
  assertEqual([rep.auto.tondus, countItem(u, 'laine')], [2, 2]);
});

test('arbre v2 : effets sur la famille (Bon sommeil, Goûter, Cellier)', () => {
  const s = garden();
  // Bon sommeil : +10 au réveil (repas manqué : 60 → 70 ; repas complet : 100, le maximum)
  assertEqual(wakeEnergy(s, 0), 60000);
  grantTech(s, 'fa_sommeil');
  assertEqual([wakeEnergy(s, 0), wakeEnergy(s, 50), wakeEnergy(s, 100)], [70000, 90000, 100000]);
  // Goûter : un en-cas rend 50 % de plus (gratin : valeur 33, puis 49,5)
  assertEqual(snackEnergy(s, 'gratin_patates'), 33000);
  grantTech(s, 'fa_gouter');
  assertEqual(snackEnergy(s, 'gratin_patates'), 49500);
  // Cellier : +1 nuit hors frigo pour ce qui périme, rien pour le reste
  grantTech(s, 'fa_cellier');
  setInv(s, {});
  addItem(s, 'carotte', 1);
  addItem(s, 'ble', 1);
  assertEqual([lotsOf(s, 'carotte')[0].nightsLeft, lotsOf(s, 'ble')[0].nightsLeft], [7, 11]);
  addItem(s, 'conserve', 1);
  assertEqual(lotsOf(s, 'conserve')[0].nightsLeft, null);
  assertEqual([DATA.ARBRE.noeuds.fa_remedes, DATA.ARBRE.noeuds.fa_menus], [undefined, undefined], 'nœuds de santé retirés');
});

test('arbre v2 : arrosage prioritaire quand l\'eau manque', () => {
  const s = garden();
  testAddSeeds(s);
  grantTech(s, 'ea_irrigation');
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  findPlot(s, 'potager-2').stade = 3; // à un stade de la récolte
  s.eauMl = ml(2); // de quoi arroser une seule carotte
  setInv(s, { conserve: 200, graine_carotte: 5 });
  sleepOnce(s);
  matin(s);
  assertEqual([findPlot(s, 'potager-1').arrose, findPlot(s, 'potager-2').arrose], [true, false], 'dans l\'ordre des parcelles sans le nœud');
  const t = garden();
  testAddSeeds(t);
  grantTech(t, 'ea_gestion');
  plant(t, 'potager-1', 'carotte');
  plant(t, 'potager-2', 'carotte');
  findPlot(t, 'potager-2').stade = 3;
  t.eauMl = ml(2);
  setInv(t, { conserve: 200, graine_carotte: 5 });
  sleepOnce(t);
  matin(t);
  assertEqual([findPlot(t, 'potager-1').arrose, findPlot(t, 'potager-2').arrose], [false, true], 'la plus proche de la récolte d\'abord');
  sleepOnce(t);
  matin(t);
  assertEqual(findPlot(t, 'potager-2').stade, 4, '24 h après l\'arrosage de 7 h, elle a poussé');
});

test('version 1.19 : Réveil matinal I et II et Routine familiale sont retirés, remboursés, avec le réglage « Dormir tout seul »', () => {
  const vieille = { ...createInitialState(1), version: 35, technologies: ['reveil_1', 'reveil_2', 'fa_routine', 'fa_sommeil'], routine: true, pieces: 10 };
  vieille.pointsTech = { ...vieille.pointsTech, solde: 0 };
  const m = migreAvant({ v: 35, t: 0, s: vieille });
  assertEqual([m.version, m.technologies, m.routine, m.pieces, m.pointsTech.solde], [AVANT_DEMENAGEMENT, ['fa_sommeil'], undefined, 10 + 200 + 500 + 2500, 1 + 1 + 3]);
  for (const id of ['reveil_1', 'reveil_2', 'fa_routine']) assertEqual(DATA.ARBRE.noeuds[id], undefined, id);
  assertEqual(createInitialState(1).routine, undefined);
});

test('Pain à l\'ail : retire bien 1 pain du stock, comme n\'importe quel autre ingrédient', () => {
  const s = atelier();
  unlockRecipes(s);
  setInv(s, { pain: 3, ail: 1, huile: 1 });
  assertEqual(startRecipe(s, 'pain_ail').ok, true);
  assertEqual(countItem(s, 'pain'), 2, 'un seul pain consommé');
  assertEqual(countItem(s, 'ail'), 0);
  assertEqual(countItem(s, 'huile'), 0);
  // Sans pain, la recette est refusée et rien n'est retiré.
  const t = unlockRecipes(atelier());
  setInv(t, { ail: 1, huile: 1 });
  assertEqual(recipeStatus(t, 'pain_ail').code, 'manque');
  assertEqual(startRecipe(t, 'pain_ail').ok, false);
  assertEqual([countItem(t, 'ail'), countItem(t, 'huile')], [1, 1], 'rien retiré si la recette échoue');
});

test('Café (cafe_boisson) : id distinct de l\'item cafe, ne remplace pas l\'ingrédient de la Serre', () => {
  assertEqual(DATA.OBJETS.cafe.categorie, 'ingrédient', 'l\'ingrédient de la Serre reste inchangé');
  assertEqual(DATA.OBJETS.cafe.mangeable, false);
  assertEqual(DATA.OBJETS.cafe_boisson.categorie, 'plat');
  assertEqual(DATA.OBJETS.cafe_boisson.mangeable, true);
});

test('la farine et l\'huile ne se mangent pas seules ; les plats se mangent', () => {
  const s = boite(atelier(), { farine: 50, huile: 50 });
  affamer(s);
  assertEqual(s.repasJour.mange, {});
  const t = boite(atelier(), { pain: 3, omelette: 1, conserve: 200 });
  affamer(t);
  assertEqual([t.repasJour.mange.pain, t.repasJour.mange.omelette], [3, 1]);
});

test('état initial Lot 5 : quatre stations à construire, libres, sans appareil', () => {
  const s = createInitialState(1);
  for (const id of ['four', 'cuisine', 'moulin', 'presse']) {
    assertEqual(s.stations[id], { construit: false, tache: null, appareil: null }, id);
  }
  assertEqual(allDevices(s).length, 3, 'panneau, batterie, pompe seulement');
  assertEqual(s.unlockedTabs.includes('recettes'), false);
});

test('poser le Four (un bloc, dans le foyer) ouvre l\'onglet Livre de recette ; il ne s\'achète pas', () => {
  const s = ranch();
  s.pieces = 100;
  assertEqual(buildStation(reach(s, 'four'), 'four').ok, false, 'il se fabrique à l\'Atelier');
  assertEqual(s.pieces, 100);
  assert(testBatir(s, 'four').ok);
  assertEqual(s.stations.four.construit, true);
  assertEqual(s.unlockedTabs.includes('recettes'), true, 'onglet ouvert par le Four');
  assert(testBatir(s, 'four').ok, 'un second four');
  assertEqual(s.unlockedTabs.filter((t) => t === 'recettes').length, 1);
  assertEqual(allDevices(s).length, 3, 'le Four n\'est pas un appareil électrique');
});

test('la Cuisinière se pose sans le Four, et ouvre le Livre de recette', () => {
  const s = ranch();
  assertEqual(s.unlockedTabs.includes('recettes'), false);
  assertEqual(buildStation(reach(s, 'cuisine'), 'cuisine').ok, false, 'elle se fabrique à l\'Atelier');
  assert(testBatir(s, 'cuisine').ok);
  assertEqual([s.stations.cuisine.construit, s.stations.four.construit], [true, false]);
  assertEqual(s.unlockedTabs.includes('recettes'), true, 'version 1.7 : la Cuisine ouvre le Livre de recette');
});

test('le Moulin (sa tour) et la Presse (150) se construisent sans le Four et rejoignent le parc', () => {
  const s = ranch();
  s.pieces = 150;
  assertEqual(testBatir(reach(s, 'moulin'), 'moulin').ok, true);
  assertEqual(buildStation(reach(s, 'presse'), 'presse').ok, true);
  assertEqual(s.pieces, 0);
  assertEqual(s.unlockedTabs.includes('recettes'), false, 'seul le Four ouvre l\'onglet');
  assertEqual(allDevices(s).map((d) => d.id), ['panneau-1', 'batterie-1', 'pompe', 'moulin', 'presse']);
  const m = s.stations.moulin.appareil;
  assertEqual([m.type, m.prix, m.allume, m.usure], ['moulin', 120, true, 0]);
  assertEqual(findDevice(s, 'presse').prix, 150);
  assertEqual(s.stations.four.appareil, null);
});

test('le Moulin et la Presse n\'ont pas de niveaux, mais s\'entretiennent et se réparent', () => {
  const s = atelier();
  assertEqual(upgradeCost(s.stations.moulin.appareil), null);
  const r = upgradeDevice(s, 'moulin');
  assertEqual([r.ok, r.error], [false, 'Cet appareil n\'a pas de niveaux.']);
  s.stations.moulin.appareil.usure = 40;
  assertEqual(maintainCost(s.stations.moulin.appareil), 24, 'entretien : 20 % de 120');
  assertEqual(repairCost(s.stations.presse.appareil), 75, 'réparation : 50 % de 150');
  const before = s.pieces;
  assertEqual(maintainDevice(s, 'moulin').ok, true);
  assertEqual([s.stations.moulin.appareil.usure, s.pieces], [0, before - 24]);
});

test('startRecipe : refusée sans station construite, sans rien retirer', () => {
  const s = atelier({ stations: [] });
  setInv(s, { farine: 2 });
  const r = startRecipe(s, 'pain');
  assertEqual([r.ok, r.error], [false, 'Construis d\'abord le Four.']);
  assertEqual([countItem(s, 'farine'), s.eauMl], [2, ml(40)]);
  assertEqual(startRecipe(s, 'inconnue').ok, false);
});

test('une seule préparation par station, sans file d\'attente', () => {
  const s = atelier();
  setInv(s, { farine: 6, patate: 3, oeuf: 1 });
  assertEqual(startRecipe(s, 'pain').ok, true);
  const r = startRecipe(s, 'gratin_patates'); // même station : le Four
  assertEqual([r.ok, r.error], [false, 'Four : une préparation est déjà en cours.']);
  assertEqual([countItem(s, 'patate'), countItem(s, 'oeuf')], [3, 1], 'rien n\'est retiré pour une recette refusée');
  assertEqual(startRecipe(s, 'pain').ok, false, 'pas de file : la même recette non plus');
  assertEqual(countItem(s, 'farine'), 4);
});

test('les stations travaillent en parallèle : Four, Cuisine, Moulin et Presse', () => {
  const s = atelier();
  setInv(s, { farine: 2, oeuf: 3, huile: 1, ble: 1, graine_tournesol: 3 });
  for (const id of ['pain', 'omelette', 'huile']) assertEqual(startRecipe(s, id).ok, true, id);
  assertEqual(startMilling(s, 1).ok, true, 'le blé se moud au Moulin');
  assertEqual(['four', 'cuisine', 'moulin', 'presse'].map((k) => s.stations[k].tache.recette), ['pain', 'omelette', 'farine', 'huile']);
});

test('les ingrédients sont retirés au lancement (eau comprise)', () => {
  const s = atelier();
  setInv(s, { farine: 5 });
  assertEqual(startRecipe(s, 'pain').ok, true);
  assertEqual([countItem(s, 'farine'), s.eauMl], [3, ml(39)]);
  assertEqual(s.stations.four.tache, { recette: 'pain', resteMs: 10000, dureeMs: 10000 });
  assertEqual(countItem(s, 'pain'), 0, 'le pain n\'existe pas avant la fin');
});

test('ingrédients ou eau manquants : refus net, rien n\'est retiré', () => {
  const s = atelier();
  setInv(s, { oeuf: 3 }); // il manque l'huile
  const r = startRecipe(s, 'omelette');
  assertEqual([r.ok, r.error], [false, 'Il manque des ingrédients.']);
  assertEqual(countItem(s, 'oeuf'), 3);
  assertEqual(s.stations.cuisine.tache, null);
  setInv(s, { farine: 2 });
  s.eauMl = ml(0.5);
  const w = startRecipe(s, 'pain');
  assertEqual([w.ok, w.error], [false, 'Pas assez d\'eau dans le réservoir.']);
  assertEqual([countItem(s, 'farine'), s.eauMl], [2, ml(0.5)]);
});

test('la préparation avance dans tick ; à la fin le plat entre dans l\'inventaire et la station se libère', () => {
  const s = atelier();
  setInv(s, { farine: 2 });
  startRecipe(s, 'pain');
  runFor(s, 9.8);
  assertEqual(countItem(s, 'pain'), 0);
  assert(s.stations.four.tache !== null, 'encore en cours à 9,8 s');
  runFor(s, 0.2);
  assertEqual(countItem(s, 'pain'), 1);
  assertEqual(s.stations.four.tache, null, 'station libérée');
  assertEqual(startRecipe(s, 'pain').ok, false, 'plus de farine, mais la station est bien libre');
  setInv(s, { farine: 2 });
  assertEqual(startRecipe(s, 'pain').ok, true, 'on relance soi-même');
});

test('le Four et la Cuisine ne consomment pas d\'électricité et ne s\'usent pas', () => {
  const s = atelier();
  setInv(s, { farine: 2, oeuf: 3, huile: 1 });
  startRecipe(s, 'pain');
  startRecipe(s, 'omelette');
  const before = s.batteries[0].chargeMwh;
  runFor(s, 10);
  assertEqual([countItem(s, 'pain'), countItem(s, 'omelette')], [1, 1]);
  assertEqual(s.batteries[0].chargeMwh, before);
  assertEqual([s.stations.four.appareil, s.stations.cuisine.appareil], [null, null]);
});

test('compote : 3 pommes ou 3 poires, sans les mélanger', () => {
  const s = atelier();
  setInv(s, { pomme: 2, poire: 2 });
  assertEqual(startRecipe(s, 'compote').ok, false, '2 pommes + 2 poires ne font pas une compote');
  setInv(s, { poire: 3 });
  assertEqual(startRecipe(s, 'compote').ok, true);
  assertEqual(countItem(s, 'poire'), 0);
  s.stations.cuisine.tache = null;
  setInv(s, { pomme: 3, poire: 3 });
  assertEqual(startRecipe(s, 'compote').ok, true);
  assertEqual([countItem(s, 'pomme'), countItem(s, 'poire')], [0, 3], 'les pommes d\'abord');
});

test('les recettes à fruits restent impossibles sans leurs fruits', () => {
  const s = atelier();
  setInv(s, { farine: 2, oeuf: 1 });
  assertEqual(recipeStatus(s, 'tarte_pommes').code, 'manque');
  assertEqual(startRecipe(s, 'tarte_pommes').ok, false);
  setInv(s, { farine: 2, oeuf: 1, pomme: 3 });
  assertEqual(recipeStatus(s, 'tarte_pommes').code, 'pret');
});

test('version 1.1 : plus aucune recette ne demande de viande, les anciens plats et les viandes restent mangeables et vendables', () => {
  const viandes = ['viande_mouton', 'viande_boeuf', 'viande_volaille'];
  for (const [id, r] of Object.entries(DATA.RECETTES)) {
    for (const ing of r.ingredients) {
      for (const item of ingredientOptions(ing)) assert(!viandes.includes(item), `${id} ne demande pas de viande`);
    }
  }
  for (const id of PLATS_RETIRES) {
    assertEqual(DATA.RECETTES[id], undefined, `${id} n'est plus une recette`);
    assertEqual(DATA.ARBRE.RECETTES_LIBRES.includes(id), false, id);
    for (const n of Object.values(DATA.ARBRE.noeuds)) assertEqual((n.effet.recettes || []).includes(id), false, `${id} dans ${n.nom}`);
    const it = DATA.OBJETS[id];
    assertEqual([it.categorie, it.plat, it.mangeable, it.retire], ['plat', true, true, true], id);
    assertEqual([isBuyable(id), shelfLife(id)], [false, 6], `${id} : ne s'achète pas, se garde comme un plat`);
  }
  assertEqual(PLATS_RETIRES.map((id) => [DATA.OBJETS[id].energie, DATA.OBJETS[id].prix]), [[144, 36], [81, 26], [144, 36], [75, 23]], 'énergie et prix d\'avant');
  assertEqual(Object.keys(DATA.PLATS_RETIRES), PLATS_RETIRES);
  assertEqual(DATA.ARBRE.noeuds.cui_rotisserie, undefined, 'le nœud Rôtisserie a disparu');
  assertEqual(DATA.ARBRE.NOEUDS_RETIRES, { cui_rotisserie: { pt: 1, prix: 300 }, fa_remedes: { pt: 1, prix: 100 }, fa_menus: { pt: 1, prix: 300 }, reveil_1: { pt: 1, prix: 200 }, reveil_2: { pt: 1, prix: 500 }, fa_routine: { pt: 3, prix: 2500 } });
  // Les viandes : ni produites, ni achetables, mais toujours des aliments qui se vendent.
  for (const id of viandes) {
    assertEqual([DATA.OBJETS[id].mangeable, isBuyable(id), buyItem(garden(), id).ok], [true, false, false], id);
  }
  const s = atelier();
  setInv(s, { viande_mouton: 2, carotte: 2, patate: 1, ragout: 1, roti_boeuf: 1 });
  assertEqual(startRecipe(s, 'ragout'), { ok: false, error: 'Recette inconnue.' });
  assertEqual(countItem(s, 'viande_mouton'), 2, 'rien n\'est retiré');
  // La famille mange encore un ancien plat et de l'ancienne viande ; les plats comptent pour le bonus.
  const t = boite(atelier(), { viande_mouton: 2, carotte: 2, patate: 1, ragout: 1, roti_boeuf: 1 });
  const m = mangeurs(t)[0];
  depenserMembre(t, m.id, 80);
  const mange = mangerMembre(t, m).mange;
  assert(mange.ragout === 1 || mange.roti_boeuf === 1 || mange.viande_mouton > 0, 'ils sont au menu');
  const before = s.pieces;
  assertEqual(sellItem(s, 'viande_mouton', 2).gain, 20);
  assertEqual(sellItem(s, 'ragout', 1).gain, 36);
  assertEqual(s.pieces, before + 56);
});

test('recipeStatus : absente, occupée, manque ou prête, avec le détail des ingrédients', () => {
  const s = atelier({ stations: ['four'] });
  setInv(s, { patate: 3, oeuf: 1, farine: 1 });
  assertEqual(recipeStatus(s, 'omelette').code, 'absente', 'Cuisine non construite');
  assertEqual(recipeStatus(s, 'gratin_patates').code, 'pret');
  const pain = recipeStatus(s, 'pain');
  assertEqual(pain.code, 'manque');
  assertEqual(pain.lignes.map((l) => [l.qte, l.have, l.ok]), [[2, 1, false], [1, 40, true]]);
  assertEqual(pain.lignes[1].eau, true);
  startRecipe(s, 'gratin_patates');
  assertEqual(recipeStatus(s, 'pain').code, 'occupee', 'le Four est pris');
});

test('Moulin : 1 blé → 1 farine (sans paille) en 5 s, 0,02 kWh/s pris sur les batteries', () => {
  const s = atelier();
  setInv(s, { ble: 1 });
  assertEqual(startMilling(s, 1), { ok: true, quantite: 1, enAttente: 0 });
  assertEqual(countItem(s, 'ble'), 0);
  runFor(s, 4.8);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [0, 0]);
  assertEqual(s.stations.moulin.appareil.conso, kwh(0.02), 'consommation 0,02 kWh/s');
  // (l'usure, qui monte pendant la marche, allonge la préparation de quelques millisecondes)
  runFor(s, 0.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [1, 0], '1 blé donne 1 farine, pas de paille');
  assertEqual(s.stations.moulin.tache, null);
  assertEqual(s.batteries[0].chargeMwh, kwh(6 - 0.1), `5 s × 0,02 = 0,1 kWh : ${s.batteries[0].chargeMwh}`);
  tick(s, 0.2);
  assertEqual(s.stations.moulin.appareil.conso, 0, 'libre : il ne consomme plus');
});

test('Moulin : le blé se prend d\'abord dans l\'inventaire, puis dans le Silo', () => {
  const s = atelier();
  setInv(s, { ble: 1 });
  s.silo.ble = 4;
  startMilling(s, 1);
  assertEqual([countItem(s, 'ble'), s.silo.ble], [0, 4]);
  s.stations.moulin.tache = null;
  startMilling(s, 1);
  assertEqual(s.silo.ble, 3, 'puis le Silo');
  s.silo.ble = 0;
  s.stations.moulin.tache = null;
  assertEqual(startMilling(s, 1).ok, false, 'plus de blé du tout');
});

test('Moulin en pause quand l\'énergie manque, et il reprend quand elle revient', () => {
  const s = atelier();
  s.batteries[0].chargeMwh = kwh(0);
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  runFor(s, 10);
  const m = s.stations.moulin;
  assertEqual(countItem(s, 'farine'), 0, 'rien ne sort sans énergie');
  assertEqual(m.tache.resteMs, 5000, 'le minuteur n\'a pas bougé');
  assertEqual(m.appareil.conso, 0);
  assertEqual(m.appareil.usure, 0, 'en pause, il ne s\'use pas');
  assertEqual(deviceStatus(s, m.appareil).code, 'attente');
  s.batteries[0].chargeMwh = kwh(1);
  runFor(s, 5.4);
  assertEqual(countItem(s, 'farine'), 1, 'il reprend seul');
  assertEqual(deviceStatus(s, m.appareil).code, 'repos');
});

test('Moulin : avec un peu d\'énergie seulement, il avance au prorata', () => {
  const s = atelier();
  s.batteries[0].chargeMwh = kwh(0.05); // 2,5 s de marche à 0,02 kWh/s
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  runFor(s, 10);
  assertEqual(s.stations.moulin.tache.resteMs, 2500, `reste ${s.stations.moulin.tache.resteMs}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(0), 'toute l\'énergie est passée dans le travail');
  assertEqual(countItem(s, 'farine'), 0);
});

test('Moulin éteint : il ne progresse pas, ne consomme pas et ne s\'use pas', () => {
  const s = atelier();
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  assertEqual(toggleDevice(s, 'moulin').ok, true);
  assertEqual(s.stations.moulin.appareil.allume, false);
  runFor(s, 30);
  const m = s.stations.moulin;
  assertEqual([m.appareil.usure, m.tache.resteMs, s.batteries[0].chargeMwh], [0, 5000, kwh(6)]);
  assertEqual(deviceStatus(s, m.appareil).code, 'arret');
  toggleDevice(s, 'moulin');
  runFor(s, 5.4);
  assertEqual(countItem(s, 'farine'), 1, 'rallumé, il termine');
});

test('Moulin allumé : il s\'use en tournant (1 point par 2 heures de marche), pas au repos', () => {
  const s = atelier();
  runFor(s, 30); // au repos
  assertEqual([s.stations.moulin.appareil.usure, s.stations.moulin.appareil.usureMs], [0, 0]);
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  runFor(s, 5.4);
  assertEqual(countItem(s, 'farine'), 1);
  const d = s.stations.moulin.appareil;
  // 5 s de marche, au pas de tick près : le temps de marche s'accumule (1 point = 60 s)
  assert(d.usure === 0 && d.usureMs >= 5000 && d.usureMs <= 5400, `usure ${d.usure} + ${d.usureMs} ms`);
  const marche = d.usureMs;
  runFor(s, 30);
  assertEqual(d.usureMs, marche, 'plus d\'usure une fois libre');
});

test('l\'usure ralentit le Moulin (rendement = 1 − usure ÷ 200)', () => {
  const s = atelier();
  s.stations.moulin.appareil.usure = 50; // rendement 75 %
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  assertEqual(taskTimeLeft(s, 'moulin'), 7, '5 s ÷ 75 % = 6,7 s, arrondi à 7');
  runFor(s, 6.4);
  assertEqual(countItem(s, 'farine'), 0, 'pas fini à 6,4 s');
  runFor(s, 0.4);
  assertEqual(countItem(s, 'farine'), 1);
});

test('Moulin : panne à 100 % d\'usure, la préparation attend la réparation', () => {
  const s = atelier();
  setInv(s, { ble: 2 });
  startMilling(s, 1);
  s.stations.moulin.appareil.usure = 99;
  s.stations.moulin.appareil.usureMs = 59500; // à 0,5 s de marche de la panne
  runFor(s, 1);
  const d = s.stations.moulin.appareil;
  assertEqual([d.usure, d.allume, isBroken(d)], [100, false, true]);
  assertEqual(deviceStatus(s, d).code, 'panne');
  const left = s.stations.moulin.tache.resteMs;
  runFor(s, 10);
  assertEqual(s.stations.moulin.tache.resteMs, left, 'la panne fige la préparation');
  assertEqual(toggleDevice(s, 'moulin').ok, false, 'on ne rallume pas un appareil en panne');
  assertEqual(repairDevice(s, 'moulin').ok, true);
  assertEqual(s.pieces, 1000 - 60, 'réparation : 50 % de 120');
  assertEqual([d.usure, d.allume], [0, false], 'réparé mais encore éteint');
  toggleDevice(s, 'moulin');
  runFor(s, 6);
  assertEqual(countItem(s, 'farine'), 1);
});

test('Presse : 3 graines de tournesol → 1 huile en 10 s, 0,03 kWh/s', () => {
  const s = atelier();
  setInv(s, { graine_tournesol: 4 });
  assertEqual(startRecipe(s, 'huile').ok, true);
  assertEqual(countItem(s, 'graine_tournesol'), 1);
  runFor(s, 9.8);
  assertEqual(countItem(s, 'huile'), 0);
  assertEqual(s.stations.presse.appareil.conso, kwh(0.03));
  runFor(s, 0.4);
  assertEqual(countItem(s, 'huile'), 1);
  assertEqual(s.batteries[0].chargeMwh, kwh(6 - 0.3), `10 s × 0,03 = 0,3 kWh : ${s.batteries[0].chargeMwh}`);
  setInv(s, { graine_tournesol: 2 });
  assertEqual(startRecipe(s, 'huile').ok, false, 'il en faut 3');
});

test('Moulin et Presse partagent les batteries : chacun tire sa part', () => {
  const s = atelier();
  setInv(s, { ble: 1, graine_tournesol: 3 });
  startMilling(s, 1);
  startRecipe(s, 'huile');
  runFor(s, 10.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'huile')], [1, 1]);
  assertEqual(s.batteries[0].chargeMwh, kwh(6 - 0.1 - 0.3), `${s.batteries[0].chargeMwh}`);
});

/* ---------- version 1.1 : le Moulin moud par quantité (la paille : version 1.23, la faux) ---------- */

test('Moulin : la mouture ne se lance plus depuis le Livre de recette', () => {
  const s = atelier();
  setInv(s, { ble: 3 });
  assertEqual(startRecipe(s, 'farine'), { ok: false, error: 'Le blé se moud directement au Moulin.' });
  assertEqual([countItem(s, 'ble'), s.stations.moulin.tache], [3, null], 'rien n\'est retiré, rien ne démarre');
  assertEqual(DATA.RECETTES.farine.horsLivre, true);
  // seule la mouture est hors du livre
  assertEqual(Object.keys(DATA.RECETTES).filter((id) => DATA.RECETTES[id].horsLivre), ['farine']);
});

test('Moulin : moudre 3 blés donne 3 farines, un blé après l\'autre', () => {
  const s = atelier();
  setInv(s, { ble: 5 });
  assertEqual(startMilling(s, 3), { ok: true, quantite: 3, enAttente: 2 });
  assertEqual(countItem(s, 'ble'), 2, 'les 3 blés sortent du stock tout de suite');
  assertEqual([millPending(s), millTimeLeft(s)], [3, 15]);
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [1, 0, 2], 'le premier blé est moulu, les autres suivent');
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [2, 0, 1]);
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [3, 0, 0]);
  assertEqual([s.stations.moulin.tache, millTimeLeft(s), countItem(s, 'ble')], [null, 0, 2]);
  // 3 blés × 5 s × 0,02 kWh/s = 0,3 kWh : la même énergie que trois moutures séparées
  assertEqual(s.batteries[0].chargeMwh, kwh(6 - 0.3));
  assertEqual(s.campagne.compteurs.plats, [], 'moudre n\'est pas préparer un plat');
});

test('Moulin : la quantité doit être un entier d\'au moins 1, et le blé doit suffire', () => {
  const s = atelier();
  setInv(s, { ble: 2 });
  for (const bad of [0, -1, 0.5, NaN, 'abc', null]) {
    assertEqual(startMilling(s, bad), { ok: false, error: 'Choisis une quantité de blé.' }, String(bad));
  }
  assertEqual(startMilling(s, 3), { ok: false, error: 'Pas assez de blé.' });
  assertEqual([countItem(s, 'ble'), s.stations.moulin.tache], [2, null], 'aucun blé retiré après un refus');
  assertEqual(startMilling(s, 2.9).quantite, 2, 'une quantité à virgule est arrondie vers le bas');
  assertEqual(startMilling(s).ok, false, 'plus de blé');
  const t = atelier({ stations: ['four'] });
  setInv(t, { ble: 2 });
  assertEqual(startMilling(t, 1), { ok: false, error: 'Construis d\'abord le Moulin.' });
});

test('Moulin : le blé du Silo compte, pris après celui de l\'inventaire', () => {
  const s = atelier();
  setInv(s, { ble: 2 });
  s.silo.construit = true;
  s.silo.ble = 10;
  assertEqual(wheatTotal(s), 12);
  assertEqual(startMilling(s, 5).ok, true);
  assertEqual([countItem(s, 'ble'), s.silo.ble], [0, 7], 'l\'inventaire d\'abord, puis le Silo');
  assertEqual(startMilling(s, 8).ok, false, 'il ne reste que 7 blés');
  assertEqual(startMilling(s, 7).ok, true);
  assertEqual([s.silo.ble, millPending(s)], [0, 12]);
});

test('Moulin : du blé ajouté pendant qu\'il tourne se met à la suite', () => {
  const s = atelier();
  setInv(s, { ble: 6 });
  startMilling(s, 2);
  runFor(s, 2);
  const reste = s.stations.moulin.tache.resteMs;
  assertEqual(startMilling(s, 3), { ok: true, quantite: 3, enAttente: 4 });
  assertEqual(s.stations.moulin.tache.resteMs, reste, 'le blé en cours n\'est pas dérangé');
  assertEqual([millPending(s), countItem(s, 'ble')], [5, 1]);
  runFor(s, 30);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), s.stations.moulin.tache], [5, 0, null]);
});

test('Moulin : annuler rend le blé en attente, pas celui qui est en train d\'être moulu', () => {
  const s = atelier();
  s.silo.construit = true;
  setInv(s, { ble: 4 });
  assertEqual(cancelMilling(s).ok, false, 'rien en attente');
  startMilling(s, 4);
  assertEqual(cancelMilling(s), { ok: true, rendu: 3 });
  assertEqual([millPending(s), s.silo.ble + countItem(s, 'ble')], [1, 3], 'le blé revient au stock (Silo d\'abord)');
  assertEqual(s.silo.ble, 3);
  assertEqual(cancelMilling(s).ok, false, 'un seul blé, en cours : rien à reprendre');
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), s.stations.moulin.tache], [1, 0, null]);
});

test('Moulin : la nuit termine seulement le blé en cours, le reste reprend au réveil', () => {
  const s = atelier();
  setInv(s, { ble: 10, conserve: 200 });
  startMilling(s, 10);
  runFor(s, 2);
  const charge = s.batteries[0].chargeMwh;
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.termine, { farine: 1 }, 'un seul blé fini pendant la nuit');
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [1, 0, 9]);
  assertEqual(s.stations.moulin.tache.resteMs, 5000, 'le blé suivant attend le matin, entier');
  assertEqual(s.batteries[0].chargeMwh, charge, 'pas d\'électricité prise pendant la nuit');
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), millPending(s)], [2, 8], 'il reprend au réveil');
  // la Presse, elle, garde sa règle : la file se termine dans la nuit
  const t = atelier();
  t.technologies.push('cui_serie');
  setInv(t, { graine_tournesol: 9, conserve: 200 });
  for (let i = 0; i < 3; i++) assert(startRecipe(t, 'huile').ok);
  t.awakeMs = 30000;
  assertEqual(sleep(t).termine, { huile: 3 });
});

test('Moulin : un long pas de temps moud plusieurs blés à la suite (hors-ligne)', () => {
  const s = atelier({ stations: ['four', 'cuisine', 'moulin'] });
  storeWheat(s, 6);
  assert(startMilling(s, 6).ok);
  const r = simulateOffline(s, 17);
  assertEqual(r.terminees, { farine: 3 }, '17 s : 3 blés moulus');
  assertEqual(r.enCours.map((e) => [e.station, e.recette, e.quantite]), [['moulin', 'farine', 3]]);
  assertEqual(r.enCours[0].reste, 13, '3 s sur le blé en cours + 2 blés de 5 s');
  const fin = simulateOffline(s, 600);
  assertEqual([fin.terminees, fin.enCours, s.stations.moulin.tache], [{ farine: 3 }, [], null]);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [6, 0]);
});

test('Moulin : la Préparation rapide raccourcit chaque blé du lot', () => {
  const s = atelier();
  s.technologies.push('prepa_1');
  setInv(s, { ble: 3 });
  startMilling(s, 3);
  assertEqual([s.stations.moulin.tache.dureeMs, millTimeLeft(s)], [4000, 12]);
  runFor(s, 12.6);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [3, 0]);
});

test('Dormir : une préparation en cours se termine immédiatement', () => {
  const s = atelier();
  setInv(s, { farine: 2, ble: 1, conserve: 200 });
  startRecipe(s, 'pain');
  startMilling(s, 1);
  runFor(s, 2);
  assert(s.stations.four.tache.resteMs > 7000, 'le pain est loin d\'être fini');
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual([countItem(s, 'pain'), countItem(s, 'farine'), countItem(s, 'paille')], [1, 1, 0]);
  assertEqual([s.stations.four.tache, s.stations.moulin.tache], [null, null], 'stations libérées');
  assertEqual(r.termine, { pain: 1, farine: 1 });
  s.awakeMs = 30000;
  assertEqual(sleep(s).termine, {}, 'rien la nuit suivante');
});

test('Dormir : le plat fini pendant la nuit se mange à partir du repas suivant', () => {
  const s = boite(atelier(), { conserve: 200 });
  setInv(s, { farine: 2 });
  startRecipe(s, 'pain');
  affamer(s);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.mange.pain, undefined, 'pas mangé ce jour-là : il cuit');
  assertEqual(countItem(s, 'pain'), 1);
  assertEqual(lotsOf(s, 'pain')[0].nightsLeft, 6, 'le pain vieillit d\'une nuit comme les œufs pondus');
  assert(deposerBoite(s, 'pain').ok, 'mis dans la boîte');
  affamer(s);
  s.awakeMs = 30000;
  assertEqual(sleep(s).mange.pain, 1, 'mangé le lendemain');
});

test('Dormir avec une station libre ou non construite ne change rien', () => {
  const s = createInitialState(1);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.termine, {});
  assertEqual(s.stations.four, { construit: false, tache: null, appareil: null });
});

test('rapport de réveil : le Moulin en panne ou à entretenir est signalé comme les autres appareils', () => {
  const s = atelier();
  s.stations.moulin.appareil.usure = 75;
  s.stations.presse.appareil.usure = 100;
  s.stations.presse.appareil.allume = false;
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.aEntretenir.map((d) => d.id), ['moulin']);
  assertEqual(r.enPanne.map((d) => d.id), ['presse']);
});

test('onglet Livre de recette : ouvert par le Four, jamais avant', () => {
  const s = createInitialState(1);
  assertEqual(s.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir']);
  s.pieces = 500;
  testBatir(reach(s, 'moulin'), 'moulin');
  buildStation(reach(s, 'presse'), 'presse');
  assertEqual(s.unlockedTabs.includes('recettes'), false);
  testBatir(reach(s, 'four'), 'four');
  assertEqual(s.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir', 'recettes']);
});

test('plats et ingrédients se vendent au Marché au prix fixe', () => {
  const s = atelier();
  setInv(s, { ragout: 2, farine: 3, huile: 1 });
  const before = s.pieces;
  // Lot 12 : ragoût à 36 (ingrédients doublés). Lot 13 : farine à 2 (doublée) ;
  // l'huile garde son prix (4).
  assertEqual(sellItem(s, 'ragout', 2).gain, 72);
  assertEqual(sellItem(s, 'farine', 3).gain, 6);
  assertEqual(sellItem(s, 'huile', 1).gain, 4);
  assertEqual(s.pieces, before + 82);
});

test('mode test Lot 5 : stations gratuites, +10 farines, +10 huiles, +20 œufs, moulin usé', () => {
  const s = createInitialState(1);
  testSetLevel(s, unlockLevel('four'));
  s.pieces = 0;
  assertEqual(testWearMill(s).ok, false, 'pas de Moulin, pas d\'usure');
  assertEqual(testBuildStations(s).ok, true);
  assertEqual(s.pieces, 0, 'gratuit');
  for (const id of ['four', 'cuisine', 'moulin', 'presse']) assertEqual(s.stations[id].construit, true, id);
  assertEqual(s.unlockedTabs.includes('recettes'), true);
  assertEqual(s.stations.moulin.appareil.type, 'moulin');
  testBuildStations(s);
  assertEqual(allDevices(s).length, 5, 'rien n\'est construit deux fois');
  testAddFlour(s);
  testAddOil(s);
  testAddEggs(s);
  assertEqual([countItem(s, 'farine'), countItem(s, 'huile'), countItem(s, 'oeuf')], [10, 10, 20]);
  assertEqual(testWearMill(s).ok, true);
  const m = s.stations.moulin.appareil;
  assertEqual([m.usure, m.allume, isBroken(m)], [100, false, true]);
  assertEqual(s.stations.presse.appareil.usure, 0, 'la Presse n\'est pas touchée');
});

test('mode test : l\'usure d\'un appareil choisi marche aussi pour le Moulin', () => {
  const s = atelier();
  assertEqual(testSetWear(s, 'moulin', 100).ok, true);
  assertEqual(isBroken(s.stations.moulin.appareil), true);
});

test('sérialisation JSON : préparations en cours, appareils et plats font l\'aller-retour', () => {
  const s = atelier();
  setInv(s, { farine: 2, ble: 1, oeuf: 3, huile: 1, omelette: 2 });
  startRecipe(s, 'pain');
  startMilling(s, 1);
  startRecipe(s, 'omelette');
  runFor(s, 1);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  runFor(s, 30);
  runFor(copy, 30);
  assertEqual(copy, s, 'la copie continue exactement comme l\'original');
  assertEqual([countItem(copy, 'pain'), countItem(copy, 'farine')], [1, 1]);
});

test('migration v5 (Lot 4) → v6 (puis v7) : les stations apparaissent, la partie est gardée', () => {
  const v5 = {
    version: 5, day: 20, awakeSeconds: 8, pieces: 432, rngSeed: 4, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir'], marche: {},
    ...startFarm(), ...startHousehold(), ...startLot4(),
  };
  delete v5.nuit.bonusPlats;
  const m = migreAvant({ v: 5, t: 0, s: v5 });
  assertEqual(m.version, AVANT_DEMENAGEMENT);
  assertEqual([m.day, m.pieces], [20, 432]);
  for (const id of ['four', 'cuisine', 'moulin', 'presse']) {
    assertEqual(m.stations[id], { construit: false, tache: null, appareil: null }, id);
  }
  assertEqual(['bonusPlats' in m.nuit, m.nuit.termine], [false, {}], 'version 1.8 : plus de bonus de santé');
  assertEqual(inventoryCounts(m).conserve, 160);
  // une sauvegarde déjà en v6 n'est pas modifiée par la migration
  const again = migreAvant({ v: 6, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.stations, m.stations);
  // l'état migré (puis déménagé sur sa terre sauvage) construit, cuisine et dort
  const d = migrate({ v: AVANT_DEMENAGEMENT, t: 0, s: m });
  assertEqual(houseRepaired(d), true, 'le foyer rebâti');
  assertEqual(testBatir(reach(d, 'four'), 'four').ok, true);
  assertEqual(d.unlockedTabs.includes('recettes'), true);
  addItem(d, 'farine', 2);
  assertEqual(startRecipe(d, 'pain').ok, false, 'le réservoir de cette sauvegarde est vide');
  d.eauMl = ml(5);
  assertEqual(startRecipe(d, 'pain').ok, true);
  d.awakeMs = 30000;
  assertEqual(sleep(d).termine, { pain: 1 });
});

test('migration v0 → version courante : les chaînes mènent au Lot 5', () => {
  const m = migreAvant({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, AVANT_DEMENAGEMENT);
  assertEqual(m.stations.moulin.construit, false);
  assertEqual(allDevices(m).length, 3);
});

// Arbre v2 : offre tous les nœuds de recettes (sans leurs prérequis).
function unlockRecipes(s) {
  for (const [id, n] of Object.entries(DATA.ARBRE.noeuds)) if (n.effet.recettes) grantTech(s, id, false);
  return s;
}
