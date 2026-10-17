/* ==========================================================================
   Tests du moteur : Lot 8 : Serre, Verger, Réfrigérateur ; Champ et Verger à 12 emplacements (1.4) ; frigo à capacité (1.10) ; Verger au clic (1.13).
   Lancer seul : node --test tests/engine/serre-verger-frigo.test.mjs (ou node tests/run-tests.mjs serre-verger-frigo).
   ========================================================================== */

import {
  addItem, addLot, allDevices, allPlots, availableEnergy, buildFridge, buildSerre, buildVerger,
  buyOrchardSlot, CONSUMERS, countItem, createInitialState, DATA, deviceStatus, feedFamily,
  findDevice, findPlot, freeOrchardCases, fridgeCapacity, fridgeCount, fridgeCounts,
  fridgeCoversNight, fridgeLots, fridgeNight, fridgeNightNeed, fridgeRate, fridgeRoom, fridgeUnits,
  fridgeUpgradeCost, grantTech, growOrchard, harvest, harvestTree, harvestYield, isBroken, lotsOf,
  maintainCost, maxStage, migrate, migrateFridgeCapacity, migrateOrchard, MIGRATIONS,
  moveAllToFridge, moveFromFridge, moveToFridge, newNightStats, newTree, nightPower, orchardFree,
  orchardSlotPrice, planMeal, plant, plantableCrops, plantTree, readyCrops, repairCost,
  repairDevice, ripeTrees, scaleEnergie, serreUpgradeCost, shelfLife, STATE_VERSION, testAddSeeds,
  testBuildFridge, testBuildSerre, testBuildVerger, testEmptyBatteries, testFillBatteries,
  testSetWear, tick, toggleDevice, treeAt, treeNextHarvest, treeStage, upgradeCost, upgradeFridge,
  upgradeSerre, water, waterCostFor,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, coldRoom, farm, fillCows, fillSheep, garden, kwh, ml, pature, plantRipe,
  ranch, reach, runFor, setInv, setStraw, sleepOnce, test,
} from './aide.mjs';

/* ---------- Lot 8 : Serre, Verger, Réfrigérateur (les saisons sont retirées en version 1.6) ---------- */

// Aliments protégés du repas : la famille ne touche pas à ce qui est en réserve.
function protect(s, ...items) {
  for (const item of items) s.famille.reserve[item] = 99999;
}

function orchard() {
  const s = garden();
  s.pieces = 5000;
  assert(buildVerger(reach(s, 'verger')).ok, 'aménager le Verger');
  return s;
}

test('DATA Lot 8 : Serre, Verger et Réfrigérateur (plus de saisons)', () => {
  assertEqual(DATA.SAISONS, undefined, 'version 1.6 : plus de saisons');
  assertEqual(DATA.VERGER.FENETRE, undefined, 'les fruits viennent toute l\'année');
  assertEqual(DATA.SERRE, { LIEU: 'serre', PRIX_CONSTRUCTION: 1000, PARCELLES: [16, 26, 36, 46, 56], PRIX_NIVEAUX: [0, 900, 1800, 3000, 5400] });
  const V = DATA.VERGER;
  assertEqual([V.EMPLACEMENTS_DEPART, V.EMPLACEMENTS_MAX, V.EMPLACEMENT.base, V.EMPLACEMENT.croissance], [2, 12, 50, 125]);
  assertEqual([V.MATURITE, V.FRUITS, V.PERIODE], [15, 6, 3]);
  assertEqual([V.ARBRES.pommier.prix, V.ARBRES.poirier.prix], [40, 40]);
  assertEqual([V.ARBRES.pommier.fruit, V.ARBRES.poirier.fruit], ['pomme', 'poire']);
  for (const fruit of ['pomme', 'poire']) {
    // Lot 12 : prix de vente du fruit doublé (2 → 4).
    assertEqual([DATA.OBJETS[fruit].energie, DATA.OBJETS[fruit].prix, shelfLife(fruit)], [scaleEnergie(8), 4, 7]);
  }
  const F = DATA.FRIGO;
  assertEqual([F.PRIX_CONSTRUCTION, F.BASE_WH_S, F.PAR_UNITE_MWH_S, F.BLOC_NUIT_S, F.SEUIL_ALIMENTE], [600, 0, 100, 30, 50], 'version 1.10 : rien à vide, 100 mWh/s par unité');
  assertEqual([F.CAPACITE, F.PRIX_NIVEAUX], [[25, 40, 60, 90, 120], [0, 300, 700, 1500, 3000]]);
});

test('état initial Lot 8 : Serre, Verger et Réfrigérateur à construire', () => {
  const s = createInitialState(1);
  assertEqual(s.serre, { construit: false, niveau: 1, parcelles: [] });
  assertEqual(s.verger, { construit: false, places: 2, achetes: 0, compteur: 0, arbres: [] });
  assertEqual(s.frigo.construit, false);
  assertEqual(s.frigo.appareil, null);
  assertEqual(allDevices(s).some((d) => d.type === 'frigo'), false);
});

/* --- version 1.6 : plus de saisons --- */

test('version 1.6 : plus de saisons, la même production toute l\'année', () => {
  const nightAt = (day) => {
    const f = farm(); // neuve à chaque fois : pas d'usure d'un test à l'autre
    f.day = day;
    tick(f, 1);
    const g = garden();
    g.day = day;
    plantRipe(g, 'potager-1', 'carotte');
    const carottes = harvest(g, 'potager-1').items.carotte;
    plant(g, 'potager-2', 'carotte');
    const eau = g.eauMl;
    assert(water(g, 'potager-2').ok);
    const p = pature();
    p.day = day;
    fillSheep(p, 2);
    fillCows(p, 1);
    setStraw(p, 4);
    const rep = sleepOnce(p);
    return [f.panneaux[0].prod, carottes, (eau - g.eauMl) / 1000, harvestYield(g, 'carotte', true), p.paturage.moutons.map((m) => m.laine), rep.lait];
  };
  for (const day of [1, 11, 21, 31, 41]) assertEqual(nightAt(day), [kwh(0.04), 6, 2, 6, [1, 1], 1], `nuit ${day}`);
  assertEqual([waterCostFor(ranch(), 'ble'), waterCostFor(ranch(), 'riz')], [2, 4], 'l\'eau de la culture, sans facteur');
  const s = garden();
  sleepOnce(s);
  assertEqual(['saison' in s.report, 'nuitDeSaison' in s.report], [false, false], 'le réveil ne parle plus de saison');
});

/* --- Serre --- */

test('Serre : 1 000 pièces, 15 parcelles, refus sans pièces ou si déjà construite', () => {
  const s = garden();
  s.pieces = 999;
  assertEqual(buildSerre(reach(s, 'serre')).ok, false);
  s.pieces = 1000;
  const r = buildSerre(reach(s, 'serre'));
  assertEqual([r.ok, r.cost, s.pieces], [true, 1000, 0]);
  assertEqual([s.serre.construit, s.serre.niveau, s.serre.parcelles.length], [true, 1, 16]);
  assertEqual(s.serre.parcelles.every((p) => p.lieu === 'serre'), true);
  assertEqual(buildSerre(reach(s, 'serre')).ok, false);
  assertEqual(allPlots(s).length, 22, '6 du Potager et 16 de la Serre');
  assertEqual(findPlot(s, 'serre-3').lieu, 'serre');
});

test('Serre : +10 parcelles par niveau jusqu\'à toute sa terre (56), 900 / 1 800 / 3 000 / 5 400 pièces', () => {
  const s = garden();
  s.pieces = 100000;
  buildSerre(reach(s, 'serre'));
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const cost = serreUpgradeCost(s);
    const before = s.pieces;
    assert(upgradeSerre(s).ok);
    seen.push([s.serre.niveau, s.serre.parcelles.length, before - s.pieces, cost]);
  }
  assertEqual(seen, [[2, 26, 900, 900], [3, 36, 1800, 1800], [4, 46, 3000, 3000], [5, 56, 5400, 5400]]);
  assertEqual(serreUpgradeCost(s), null);
  assertEqual(upgradeSerre(s).ok, false, 'niveau maximum');
  assertEqual(upgradeSerre(garden()).ok, false, 'pas construite');
});

test('Serre : tomate, courgette, aubergine, poivron, cacao, vanille, café', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(reach(s, 'serre'));
  upgradeSerre(s); // niveau 2 : 9 parcelles, assez pour tout planter en même temps
  testAddSeeds(s);
  const toPlant = ['tomate', 'courgette', 'aubergine', 'poivron', 'cacao', 'vanille', 'cafe'];
  toPlant.forEach((culture, i) => {
    assertEqual(plant(s, `serre-${i + 1}`, culture).ok, true, culture);
  });
  for (const culture of ['carotte', 'patate', 'ble', 'tournesol', 'riz', 'houblon']) {
    assertEqual(plant(s, 'serre-8', culture).ok, false, `${culture} ne se plante pas en Serre`);
  }
  assertEqual(plantableCrops('serre'), ['tomate', 'courgette', 'aubergine', 'poivron', 'cacao', 'vanille', 'cafe']);
  assertEqual(plantableCrops('potager').includes('tomate'), true);
});

test('cultures de rente : cacao, vanille et café exclusivement en Serre', () => {
  const rente = ['cacao', 'vanille', 'cafe'];
  // Sur DATA.CULTURES directement, sans passer par l'interface : seul le lieu
  // 'serre' est déclaré.
  for (const c of rente) assertEqual(DATA.CULTURES[c].lieux, ['serre']);
  // plant() lui-même refuse la Zone de culture, pas seulement l'écran de
  // plantation (qui se contente de ne pas les proposer) : c'est bien la
  // fonction de plantation qui porte la règle.
  const s = garden();
  s.pieces = 5000;
  buildSerre(reach(s, 'serre'));
  addItem(s, 'cacao', 5);
  addItem(s, 'vanille', 5);
  addItem(s, 'cafe', 5);
  for (const c of rente) {
    assertEqual(plant(s, 'potager-1', c).ok, false, `${c} ne se plante pas dans la Zone de culture`);
    assertEqual(findPlot(s, 'potager-1').culture, null);
  }
  // à l'inverse, les cultures de plein champ ne vont pas en Serre
  addItem(s, 'ble', 1);
  addItem(s, 'riz', 1);
  for (const c of ['ble', 'riz']) assertEqual(plant(s, 'serre-6', c).ok, false, `${c} ne se plante pas en Serre`);
  // Elles se plantent en revanche bien en Serre.
  rente.forEach((c, i) => {
    assertEqual(plant(s, `serre-${i + 1}`, c).ok, true, `${c} se plante en Serre`);
  });
});

test('cultures de rente : jamais mangées par la famille, même affamée', () => {
  const s = garden();
  // La famille ne possède que cacao, vanille et café : le repas doit rester vide.
  setInv(s, { cacao: 50, vanille: 50, cafe: 50 });
  const plan = planMeal(s);
  assertEqual(plan.mange, {}, 'aucune de ces 3 cultures ne nourrit jamais la famille');
  assertEqual(plan.couverture, 0);
  feedFamily(s);
  assertEqual([countItem(s, 'cacao'), countItem(s, 'vanille'), countItem(s, 'cafe')], [50, 50, 50], 'rien n\'est consommé');
});

test('Serre : 3 L par arrosage et 10 tomates, chaque nuit de l\'année', () => {
  for (const day of [1, 11, 21, 31]) {
    const s = garden();
    s.pieces = 5000;
    buildSerre(reach(s, 'serre'));
    s.day = day;
    plant(s, 'serre-1', 'tomate');
    const before = s.eauMl;
    assert(water(s, 'serre-1').ok);
    assertEqual(before - s.eauMl, ml(3), `3 L exactement à la nuit ${day}`);
    findPlot(s, 'serre-1').stade = maxStage(findPlot(s, 'serre-1'));
    assertEqual(harvest(s, 'serre-1').items.tomate, 10, `10 tomates à la nuit ${day}`);
  }
});

test('Serre : pousse une nuit arrosée, et les récoltes prêtes la comptent', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(reach(s, 'serre'));
  plant(s, 'serre-1', 'tomate');
  water(s, 'serre-1');
  sleepOnce(s);
  assertEqual(findPlot(s, 'serre-1').stade, 1);
  findPlot(s, 'serre-1').stade = 5;
  assertEqual(readyCrops(s), [{ culture: 'tomate', nombre: 1 }]);
});

/* --- Verger --- */

test('Verger : 2 emplacements au départ, aucun arbre', () => {
  const s = orchard();
  assertEqual([s.verger.construit, s.verger.places, s.verger.arbres.length, orchardFree(s)], [true, 2, 0, 2]);
  assertEqual(buildVerger(reach(s, 'verger')).ok, false, 'déjà aménagé');
  assertEqual(plantTree(garden(), 'pommier').ok, false, 'sans Verger');
});

test('Verger : prix des emplacements supplémentaires 50 × 1,25^n arrondi à l\'entier supérieur', () => {
  const s = orchard();
  s.pieces = 100000;
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const before = s.pieces;
    const price = orchardSlotPrice(s);
    assert(buyOrchardSlot(s).ok);
    seen.push([price, before - s.pieces, s.verger.places]);
  }
  assertEqual(seen.map((x) => x[0]), [50, 63, 79, 98, 123, 153]);
  assertEqual(seen.map((x) => x[1]), [50, 63, 79, 98, 123, 153]);
  assertEqual(seen.map((x) => x[2]), [3, 4, 5, 6, 7, 8]);
  assertEqual(s.verger.achetes, 6, 'les 2 emplacements de départ ne comptent pas');
  const poor = orchard();
  poor.pieces = 49;
  assertEqual(buyOrchardSlot(poor).ok, false);
  assertEqual(buyOrchardSlot(garden()).ok, false, 'sans Verger');
});

// Version 1.4 : 12 emplacements, autant que de rectangles arbre_verger_n sur la carte.
test('Verger : le nombre d\'emplacements est plafonné à 12', () => {
  const s = orchard();
  s.pieces = 10000000;
  assertEqual(DATA.VERGER.EMPLACEMENTS_MAX, 12);
  // 2 emplacements de départ + 10 achats = 12.
  for (let i = 0; i < 10; i++) {
    assert(buyOrchardSlot(s).ok, `achat ${i + 1}/10 devrait réussir`);
  }
  assertEqual(s.verger.places, 12);
  assertEqual(s.verger.achetes, 10);
  const blocked = buyOrchardSlot(s);
  assertEqual(blocked.ok, false, 'refusé au-delà de 12 emplacements');
  assertEqual(s.verger.places, 12, 'le plafond ne bouge pas même avec assez de pièces');
});

test('Verger : arbre à 40 pièces sur un emplacement libre, pommier ou poirier', () => {
  const s = orchard();
  s.pieces = 100;
  const a = plantTree(s, 'pommier');
  assertEqual([a.ok, a.cost, s.pieces], [true, 40, 60]);
  assertEqual(plantTree(s, 'poirier').ok, true);
  assertEqual(s.pieces, 20);
  assertEqual(s.verger.arbres.map((t) => [t.id, t.espece, t.plantee]), [['arbre-1', 'pommier', 1], ['arbre-2', 'poirier', 1]]);
  s.pieces = 500;
  assertEqual(plantTree(s, 'pommier').ok, false, 'verger plein');
  assertEqual(s.pieces, 500);
  buyOrchardSlot(s);
  assertEqual(plantTree(s, 'pommier').ok, true, 'un emplacement acheté');
  assertEqual(plantTree(s, 'cerisier').ok, false, 'arbre inconnu');
  const poor = orchard();
  poor.pieces = 39;
  assertEqual(plantTree(poor, 'pommier').ok, false);
});

test('Verger : première récolte 15 nuits après la plantation', () => {
  const s = orchard();
  grantTech(s, 'cu_verger_auto'); // version 1.13 : cueillis la nuit
  protect(s, 'pomme');
  s.day = 10;
  plantTree(s, 'pommier');
  const fruits = {};
  while (s.day <= 30) {
    const day = s.day;
    const r = sleepOnce(s);
    if (r.fruits.pomme) fruits[day] = r.fruits.pomme;
  }
  // production les nuits 18, 21, 24, 27, 30 : les nuits 18 et 21 sont trop tôt
  // (9 et 12 nuits), la première récolte tombe à la 15ᵉ nuit, la nuit 24
  assertEqual(fruits, { 24: 6, 27: 6, 30: 6 });
  assertEqual(countItem(s, 'pomme'), 12, 'les pommes de la nuit 24 ont déjà péri (7 nuits)');
});

test('Verger : arbre planté à la nuit 1, première récolte à la nuit 15, puis toutes les 3 nuits', () => {
  const s = orchard();
  grantTech(s, 'cu_verger_auto');
  protect(s, 'poire');
  plantTree(s, 'poirier');
  const fruits = {};
  while (s.day <= 30) {
    const day = s.day;
    const r = sleepOnce(s);
    if (r.fruits.poire) fruits[day] = r.fruits.poire;
  }
  assertEqual(fruits, { 15: 6, 18: 6, 21: 6, 24: 6, 27: 6, 30: 6 });
});

test('Verger : version 1.6, des fruits toute l\'année, chaque arbre à son rythme', () => {
  const tree = newTree('arbre-9', 'pommier', 1, 0);
  assertEqual(treeNextHarvest({ day: 2 }, tree), 15);
  assertEqual(treeNextHarvest({ day: 2 }, newTree('arbre-9', 'pommier', 2, 0)), 16, 'planté nuit 2 : nuit 16');
  const s = orchard();
  grantTech(s, 'cu_verger_auto');
  protect(s, 'pomme');
  s.verger.arbres.push({ id: 'arbre-9', espece: 'pommier', plantee: -100 });
  let total = 0;
  for (let i = 0; i < 40; i++) total += sleepOnce(s).fruits.pomme || 0;
  assertEqual(total, 14 * 6, '40 nuits : 14 récoltes de 6 fruits (une toutes les 3 nuits)');
});

test('Verger : chaque arbre donne 6 fruits de son espèce, pas d\'arrosage', () => {
  const s = orchard();
  grantTech(s, 'cu_verger_auto');
  protect(s, 'pomme', 'poire');
  s.verger.arbres.push({ id: 'arbre-1', espece: 'pommier', plantee: -50 }, { id: 'arbre-2', espece: 'poirier', plantee: -50 });
  s.day = 18;
  s.eauMl = ml(0);
  const r = sleepOnce(s);
  assertEqual(r.fruits, { pomme: 6, poire: 6 });
  assertEqual([countItem(s, 'pomme'), countItem(s, 'poire')], [6, 6]);
  assertEqual(lotsOf(s, 'pomme')[0].nightsLeft, 6, 'fruits de 7 nuits, dont une déjà passée');
  const noVerger = garden();
  noVerger.verger.arbres.push({ id: 'arbre-1', espece: 'pommier', plantee: -50 });
  noVerger.day = 18;
  assertEqual(sleepOnce(noVerger).fruits, {}, 'rien sans Verger aménagé');
});

/* --- Réfrigérateur --- */

test('Réfrigérateur : 600 pièces, appareil du parc avec interrupteur, usure et panne', () => {
  const s = farm();
  s.pieces = 599;
  assertEqual(buildFridge(reach(s, 'frigo')).ok, false);
  s.pieces = 700;
  const r = buildFridge(reach(s, 'frigo'));
  assertEqual([r.ok, r.cost, s.pieces], [true, 600, 100]);
  assertEqual(buildFridge(reach(s, 'frigo')).ok, false, 'déjà construit');
  const d = findDevice(s, 'frigo');
  assertEqual([d.type, d.allume, d.usure, d.prix], ['frigo', true, 0, 600]);
  assertEqual(allDevices(s).includes(d), true);
  assertEqual(upgradeCost(d), null, 'pas de niveaux');
  assertEqual(maintainCost(d), 120);
  assertEqual(repairCost(d), 300);
});

test('Réfrigérateur : consommation 100 mWh/s par unité (rien à vide), prise dans les batteries', () => {
  assertEqual(fridgeRate(coldRoom({ lest: 0 })), 0, 'version 1.10 : un frigo vide ne consomme rien');
  const s = coldRoom({ lest: 0 });
  setInv(s, { carotte: 100 });
  moveToFridge(s, 'carotte', 100);
  assertEqual(fridgeRate(s), kwh(0.01), '100 unités × 100 mWh/s');
  const before = s.batteries[0].chargeMwh;
  runFor(s, 10);
  assertEqual(before - s.batteries[0].chargeMwh, kwh(0.1), 'soit 100 Wh en 10 s');
  const d = findDevice(s, 'frigo');
  assertEqual(d.conso, kwh(0.01), 'consommation affichée (mWh/s)');
  assertEqual(s.frigo.alimente, true);
  assertEqual(deviceStatus(s, d).code, 'marche');
});

test('Réfrigérateur : il tire sur la batterie, et il passe avant la pompe', () => {
  assertEqual(CONSUMERS[0].id, 'frigo');
  const s = coldRoom();
  s.batteries[0].chargeMwh = kwh(1);
  runFor(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh(1 - 0.05));
});

test('Réfrigérateur : s\'arrête quand les batteries sont vides', () => {
  const s = coldRoom({ charge: false });
  runFor(s, 5);
  const d = findDevice(s, 'frigo');
  assertEqual([s.frigo.alimente, d.conso, s.frigo.alimenteMs], [false, 0, 0]);
  assertEqual(deviceStatus(s, d).code, 'attente');
  assertEqual(s.frigo.eveilMs, 5000, 'le temps d\'éveil compte quand même');
  // dès que de l'énergie revient, il repart
  s.batteries[0].chargeMwh = kwh(1);
  runFor(s, 1);
  assertEqual(s.frigo.alimente, true);
});

test('Réfrigérateur : éteint ou en panne, il ne consomme rien et ne s\'use pas', () => {
  const s = coldRoom();
  assert(toggleDevice(s, 'frigo').ok);
  const d = findDevice(s, 'frigo');
  const before = s.batteries[0].chargeMwh;
  runFor(s, 30);
  assertEqual([s.batteries[0].chargeMwh, d.usure, d.conso, s.frigo.alimenteMs], [before, 0, 0, 0]);
  assertEqual(deviceStatus(s, d).code, 'arret');
  toggleDevice(s, 'frigo');
  runFor(s, 60);
  assertEqual(d.usure, 1, '1 point toutes les 2 heures de fonctionnement (60 s)');
  testSetWear(s, 'frigo', 100);
  assertEqual([isBroken(d), d.allume], [true, false]);
  assertEqual(toggleDevice(s, 'frigo').ok, false);
  assertEqual(deviceStatus(s, d).code, 'panne');
  assertEqual(repairDevice(s, 'frigo').ok, true);
  assertEqual([d.usure, d.allume], [0, false], 'réparé, à rallumer');
});

test('Réfrigérateur : usure jusqu\'à la panne à 100 %', () => {
  const s = coldRoom();
  s.batteries[0].chargeMwh = kwh(5);
  findDevice(s, 'frigo').usure = 99;
  findDevice(s, 'frigo').usureMs = 50000;
  runFor(s, 30);
  const d = findDevice(s, 'frigo');
  assertEqual([d.usure, d.allume, isBroken(d)], [100, false, true]);
});

test('déplacer des aliments : inventaire ↔ frigo, lots et conservation gardés', () => {
  const s = coldRoom({ lest: 0 });
  setInv(s, { carotte: 4, conserve: 10 });
  s.inventaire.carotte[0].nightsLeft = 2; // vieux lot
  addLot(s, 'carotte', 6, 'acheté'); // lot frais, autre origine
  assertEqual(countItem(s, 'carotte'), 10);
  assertEqual(moveToFridge(s, 'carotte', 5).moved, 5);
  assertEqual(fridgeLots(s, 'carotte').map((l) => [l.qty, l.nightsLeft]), [[4, 2], [1, 6]], 'le plus ancien d\'abord');
  assertEqual(countItem(s, 'carotte'), 5);
  assertEqual(fridgeCount(s, 'carotte'), 5);
  assertEqual(fridgeUnits(s), 5);
  assertEqual(moveToFridge(s, 'conserve', 3).ok, false, 'une conserve ne périme pas');
  assertEqual(moveToFridge(s, 'patate', 1).ok, false, 'rien à ranger');
  assertEqual(moveFromFridge(s, 'carotte', 3).moved, 3);
  assertEqual(fridgeLots(s, 'carotte').map((l) => [l.qty, l.nightsLeft]), [[1, 2], [1, 6]], 'le plus ancien sort d\'abord');
  assertEqual(lotsOf(s, 'carotte').map((l) => [l.qty, l.nightsLeft, l.origin]), [[3, 2, 'produit'], [5, 6, 'acheté']].sort((a, b) => a[1] - b[1]), 'les lots sortis retrouvent leur compteur');
  assertEqual(moveFromFridge(s, 'carotte', 99).moved, 2, 'au plus ce qu\'il y a');
  assertEqual(fridgeCounts(s), {});
  assertEqual(moveFromFridge(s, 'carotte', 1).ok, false);
  assertEqual(moveToFridge(farm(), 'carotte', 1).ok, false, 'sans frigo');
});

test('conservation figée au frigo : le compteur ne bouge pas quand il est alimenté', () => {
  const s = coldRoom();
  setInv(s, { carotte: 6, conserve: 500 });
  moveToFridge(s, 'carotte', 6);
  addItem(s, 'carotte', 2); // 2 carottes restées dans l'inventaire...
  s.famille.reserve.carotte = 2; // ...que la famille ne mange pas : on regarde seulement leur âge
  for (let i = 0; i < 4; i++) {
    s.batteries[0].chargeMwh = kwh(5);
    runFor(s, 30);
    assert(sleepOnce(s) !== null);
  }
  assertEqual(fridgeLots(s, 'carotte').map((l) => [l.qty, l.nightsLeft]), [[6, 6]], '6 nuits au frigo, toujours 6');
  assertEqual(lotsOf(s, 'carotte').map((l) => [l.qty, l.nightsLeft]), [[2, 2]], 'dehors, 4 nuits ont passé');
  s.batteries[0].chargeMwh = kwh(5);
  runFor(s, 30);
  sleepOnce(s);
  sleepOnce(s);
  assertEqual(countItem(s, 'carotte'), 0, 'dehors, tout a péri');
  assertEqual(fridgeCount(s, 'carotte'), 6, 'au frigo, rien n\'a bougé');
});

test('panne de froid : moins de 50 % du temps alimenté, chaque lot perd une nuit', () => {
  const s = coldRoom();
  setInv(s, { carotte: 6, tomate: 3, conserve: 500 });
  moveToFridge(s, 'carotte', 6);
  moveToFridge(s, 'tomate', 3);
  s.batteries[0].chargeMwh = kwh(0); // rien ne l'alimente pendant l'éveil
  runFor(s, 30);
  assertEqual(s.frigo.alimenteMs, 0);
  s.batteries[0].chargeMwh = kwh(5); // de quoi payer le bloc nocturne : seule la journée a manqué
  sleepOnce(s);
  assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, 5);
  assertEqual(fridgeLots(s, 'tomate')[0].nightsLeft, 4);
  assertEqual(s.report.frigo.vieillis, true);
  assertEqual(s.report.frigo.panne, false, 'le bloc nocturne, lui, a été payé');
  assertEqual([s.frigo.alimenteMs, s.frigo.eveilMs, s.frigo.panneNuit], [0, 0, false], 'compteurs remis à zéro');
});

test('panne de froid : le seuil est de 50 % du temps d\'éveil', () => {
  const nightsAfter = (powered, awake) => {
    const s = coldRoom();
    setInv(s, { carotte: 6, conserve: 500 });
    moveToFridge(s, 'carotte', 6);
    s.frigo.alimenteMs = powered * 1000;
    s.frigo.eveilMs = awake * 1000;
    sleepOnce(s);
    return fridgeLots(s, 'carotte')[0].nightsLeft;
  };
  assertEqual(nightsAfter(14, 30), 5, '47 % : une nuit perdue');
  assertEqual(nightsAfter(15, 30), 6, 'pile 50 % : rien');
  assertEqual(nightsAfter(30, 30), 6, 'alimenté tout le temps');
  assertEqual(nightsAfter(0, 0), 6, 'aucun temps d\'éveil observé : rien à reprocher');
});

test('panne nocturne : le bloc de 30 s n\'est pas couvert, la nuit compte comme une panne', () => {
  const s = coldRoom();
  setInv(s, { carotte: 6, conserve: 500 });
  moveToFridge(s, 'carotte', 6);
  s.frigo.alimenteMs = 30000;
  s.frigo.eveilMs = 30000; // alimenté toute la journée
  s.batteries[0].chargeMwh = kwh(0.05); // moins de 0,005 × 30 + 6 × 0,00005 × 30 = 0,159 kWh
  sleepOnce(s);
  assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, 5, 'une nuit perdue');
  assertEqual(s.batteries[0].chargeMwh, 0, 'les batteries sont vidées');
  assertEqual([s.report.frigo.panne, s.report.frigo.vieillis], [true, true]);
});

test('consommation nocturne : 30 s de consommation prélevées d\'un coup', () => {
  const s = coldRoom({ lest: 0 });
  setInv(s, { carotte: 100, conserve: 500 });
  moveToFridge(s, 'carotte', 100);
  s.frigo.alimenteMs = 30000;
  s.frigo.eveilMs = 30000;
  s.batteries[0].chargeMwh = kwh(5);
  const need = fridgeNightNeed(s);
  assertEqual(need, kwh(0.3), '100 unités × 100 mWh/s × 30 s = 300 Wh');
  sleepOnce(s);
  assertEqual(s.batteries[0].chargeMwh, kwh(4.7), `4,7 kWh restants, obtenu ${s.batteries[0].chargeMwh}`);
  assertEqual(s.report.frigo.panne, false);
  assertEqual(s.report.frigo.mwh, kwh(0.3), 'noté dans le rapport');
  assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, 6);
  assertEqual(s.batteries[0].sortie, 0, 'la nuit n\'affiche pas de puissance de décharge');
});

test('consommation nocturne : la charge du frigo suit son contenu, et il couvre ou non la nuit', () => {
  const s = coldRoom();
  s.batteries[0].chargeMwh = kwh(0.14);
  assertEqual(fridgeCoversNight(s), false, '0,15 kWh nécessaires, 0,14 disponibles');
  s.batteries[0].chargeMwh = kwh(0.15);
  assertEqual(fridgeCoversNight(s), true);
  s.batteries[0].allume = false;
  assertEqual(availableEnergy(s), 0, 'une batterie éteinte ne rend rien');
  assertEqual(fridgeCoversNight(s), false);
});

test('frigo éteint ou en panne : la nuit compte comme une panne de froid', () => {
  for (const cut of ['off', 'broken']) {
    const s = coldRoom();
    setInv(s, { carotte: 6, conserve: 500 });
    moveToFridge(s, 'carotte', 6);
    if (cut === 'off') toggleDevice(s, 'frigo');
    else testSetWear(s, 'frigo', 100);
    const before = s.batteries[0].chargeMwh;
    sleepOnce(s);
    assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, 5, cut);
    assertEqual(s.batteries[0].chargeMwh, before, 'aucune énergie prélevée');
  }
});

test('panne de froid : un lot qui arrive à 0 nuit est perdu et signalé au réveil', () => {
  const s = coldRoom();
  setInv(s, { carotte: 4, tomate: 2, conserve: 500 });
  moveToFridge(s, 'carotte', 4);
  moveToFridge(s, 'tomate', 2);
  fridgeLots(s, 'tomate')[0].nightsLeft = 1;
  toggleDevice(s, 'frigo');
  sleepOnce(s);
  assertEqual(fridgeCount(s, 'tomate'), 0);
  assertEqual(s.report.perimes.tomate, 2);
  assertEqual(fridgeCount(s, 'carotte'), 4);
});

test('nuit sans frigo construit : nightPower et fridgeNight ne font rien', () => {
  const s = farm();
  const before = JSON.stringify(s.batteries);
  nightPower(s);
  fridgeNight(s);
  assertEqual(JSON.stringify(s.batteries), before);
  assert(sleepOnce(s) !== null);
  assertEqual(s.report.frigo.construit, false);
});

test('la famille mange le contenu du frigo, après l\'inventaire', () => {
  const s = coldRoom();
  setInv(s, {});
  addItem(s, 'pomme', 50);
  moveToFridge(s, 'pomme', 40); // 10 pommes dehors, 40 au frigo
  s.frigo.alimenteMs = 30000;
  s.frigo.eveilMs = 30000;
  // Lot 11 (nutrition) : pomme à 10 d'énergie ; 10 dehors (100) + 5 au frigo (50) = 150.
  assertEqual(planMeal(s).mange, { pomme: 15 });
  assertEqual(planMeal(s).couverture, 100);
  sleepOnce(s);
  assertEqual(s.report.mange, { pomme: 15 });
  assertEqual(countItem(s, 'pomme'), 0, 'l\'inventaire d\'abord');
  assertEqual(fridgeCount(s, 'pomme'), 35, '5 pommes prises au frigo');
  assertEqual(s.report.couverture, 100);
});

test('la réserve de semences compte le frigo : on ne mange pas ce qui est réservé', () => {
  const s = coldRoom({ lest: 0 });
  setInv(s, {});
  addItem(s, 'patate', 10);
  moveToFridge(s, 'patate', 10);
  s.famille.reserve.patate = 10;
  assertEqual(planMeal(s).mange, {});
  s.famille.reserve.patate = 4;
  assertEqual(planMeal(s).mange, { patate: 6 });
});

test('frigo : les compteurs d\'éveil et d\'alimentation suivent les ticks', () => {
  const s = coldRoom();
  s.batteries[0].chargeMwh = kwh(5);
  runFor(s, 10);
  assertEqual([s.frigo.alimenteMs, s.frigo.eveilMs], [10000, 10000]);
  s.batteries[0].chargeMwh = kwh(0);
  runFor(s, 10);
  assertEqual([s.frigo.alimenteMs, s.frigo.eveilMs], [10000, 20000], 'une moitié alimentée : pile 50 %');
  sleepOnce(s);
  assertEqual(s.report.frigo.vieillis, true, 'la nuit suivante bloc payé ? batteries vides : panne');
});

test('ordre nocturne complet : verger avant le frigo, péremption après', () => {
  const s = coldRoom();
  protect(s, 'pomme');
  setInv(s, { carotte: 2, conserve: 500 });
  s.verger.construit = true;
  grantTech(s, 'cu_verger_auto');
  s.verger.arbres.push({ id: 'arbre-1', espece: 'pommier', plantee: -50 });
  s.day = 18;
  moveToFridge(s, 'carotte', 2);
  s.frigo.alimenteMs = 30000;
  s.frigo.eveilMs = 30000;
  s.batteries[0].chargeMwh = kwh(5);
  const r = sleepOnce(s);
  assertEqual(r.fruits.pomme, 6, 'le verger a donné ses fruits');
  assert(r.frigo.mwh > 0, 'puis le frigo a pris son bloc');
  assertEqual(s.day, 19, 'puis nuit + 1');
  assertEqual(s.awakeMs, 0, 'réveil');
});

/* --- sauvegarde et mode test --- */

test('sérialisation JSON : Serre, Verger et Réfrigérateur font l\'aller-retour', () => {
  const s = coldRoom();
  s.pieces = 9999;
  buildSerre(reach(s, 'serre'));
  buildVerger(reach(s, 'verger'));
  plantTree(s, 'pommier');
  setInv(s, { carotte: 5, conserve: 500 });
  moveToFridge(s, 'carotte', 5);
  runFor(s, 2);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assert(sleepOnce(copy) !== null && sleepOnce(s) !== null);
  assertEqual(JSON.parse(JSON.stringify(copy)), JSON.parse(JSON.stringify(s)), 'la partie continue à l\'identique');
});

test('migration v8 (Lot 7) → v9 (Lot 8) → v10 : Serre, Verger et Réfrigérateur à construire, la partie continue', () => {
  const v8 = createInitialState(3);
  delete v8.serre;
  delete v8.verger;
  delete v8.frigo;
  delete v8.nuit.fruits;
  delete v8.nuit.frigo;
  v8.version = 8;
  v8.day = 25;
  v8.pieces = 321;
  const m = migrate({ v: 8, t: 0, s: v8 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [25, 321]);
  assertEqual(m.serre, { construit: false, niveau: 1, parcelles: [] });
  assertEqual(m.verger.places, 2);
  assertEqual(m.frigo.construit, false);
  assertEqual(m.nuit.fruits, {});
  tick(m, 0.2);
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }).version, STATE_VERSION);
});

test('mode test Lot 8 : constructions gratuites, batteries vides', () => {
  const t = farm();
  testFillBatteries(t);
  t.pieces = 0;
  testBuildSerre(t);
  testBuildVerger(t);
  testBuildFridge(t);
  assertEqual([t.serre.construit, t.serre.parcelles.length, t.verger.construit, t.frigo.construit, t.pieces], [true, 16, true, true, 0]);
  assertEqual(t.frigo.appareil.type, 'frigo');
  testBuildSerre(t);
  assertEqual(t.serre.parcelles.length, 16, 'sans doublon');
  testEmptyBatteries(t);
  t.panneaux[0].allume = false;
  assertEqual(availableEnergy(t), 0);
  runFor(t, 1);
  assertEqual(t.frigo.alimente, true, 'version 1.10 : vide, il ne demande rien');
  addItem(t, 'carotte', 1);
  moveToFridge(t, 'carotte', 1);
  runFor(t, 1);
  assertEqual(t.frigo.alimente, false);
});

test('rapport de réveil Lot 8 : fruits et état du frigo', () => {
  const s = coldRoom();
  s.day = 10;
  const r = sleepOnce(s);
  assertEqual(r.frigo.construit, true);
  assertEqual(typeof r.frigo.couvreLaNuit, 'boolean');
  assertEqual(r.fruits, {});
});

/* ---------- version 1.4 : le Champ (deuxième zone de culture) et le Verger à 12 emplacements ---------- */

test('version 1.4 : format 20, le Champ commence vide et la migration l\'ajoute', () => {
  assertEqual([typeof MIGRATIONS[19], STATE_VERSION >= 20], ['function', true]);
  const Z = DATA.POTAGER.ZONE2;
  assertEqual([Z.ID, Z.CASES, Z.COLONNES, Z.DEBLOCAGE], ['zone2', 64, 8, 'moulin']);
  const neuf = createInitialState(1);
  assertEqual([neuf.potager.zone2, allPlots(neuf).length], [[], 6]);
  const v19 = JSON.parse(JSON.stringify(createInitialState(3)));
  v19.version = 19;
  delete v19.potager.zone2;
  const m = migrate({ v: 19, t: 0, s: v19 });
  assertEqual([m.version, m.potager.zone2, m.potager.parcelles.length], [STATE_VERSION, [], 6]);
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
});

test('version 1.4 : un Verger de plus de 12 emplacements garde ses arbres et ses fruits', () => {
  const s = orchard();
  s.verger.places = 15;
  s.verger.achetes = 13;
  s.pieces = 100000;
  for (let i = 0; i < 15; i++) assert(plantTree(s, i % 2 ? 'poirier' : 'pommier').ok, `arbre ${i + 1}`);
  assertEqual([s.verger.arbres.length, orchardFree(s)], [15, 0]);
  assertEqual(buyOrchardSlot(s).ok, false, 'plus d\'emplacement à vendre au-delà de 12');
  const v19 = JSON.parse(JSON.stringify(s));
  v19.version = 19;
  const m = migrate({ v: 19, t: 0, s: v19 });
  assertEqual([m.verger.places, m.verger.arbres.length], [15, 15], 'rien n\'est retiré');
  // Les 15 arbres, adultes et plantés la même nuit, donnent tous leurs fruits la même nuit.
  m.day = DATA.VERGER.MATURITE + 2 * DATA.VERGER.PERIODE;
  for (const t of m.verger.arbres) { t.plantee = 1; t.prochaine = m.day; }
  grantTech(m, 'cu_verger_auto');
  m.nuit = newNightStats();
  growOrchard(m);
  assertEqual((m.nuit.fruits.pomme || 0) + (m.nuit.fruits.poire || 0), 15 * DATA.VERGER.FRUITS);
});

/* ---------- version 1.10 (v2, lot 6) : le frigo à capacité ---------- */

test('version 1.10 : le frigo contient 25 unités au niveau 1 ; ranger s\'arrête quand il est plein', () => {
  const s = ranch();
  s.pieces = 1000;
  assertEqual(fridgeCapacity(s), 0, 'pas construit');
  buildFridge(reach(s, 'frigo'));
  assertEqual([s.frigo.niveau, fridgeCapacity(s), fridgeRoom(s)], [1, 25, 25]);
  setInv(s, { carotte: 30 });
  const r = moveToFridge(s, 'carotte', 30);
  assertEqual([r.ok, r.moved, r.reste, fridgeUnits(s), countItem(s, 'carotte')], [true, 25, 5, 25, 5], 'ce qui tient');
  const plein = moveToFridge(s, 'carotte', 1);
  assertEqual([plein.ok, plein.error], [false, 'Le frigo est plein (25 unités).']);
  assertEqual(moveAllToFridge(s).error, 'Le frigo est plein (25 unités).');
  assert(moveFromFridge(s, 'carotte', 2).ok);
  assertEqual(moveAllToFridge(s).moved, 2, 'la place libérée se reprend');
});

test('version 1.10 : « Tout ranger » range d\'abord ce qui périme le plus tôt et garde la réserve', () => {
  const s = ranch();
  s.pieces = 1000;
  buildFridge(reach(s, 'frigo'));
  setInv(s, { carotte: 20, tomate: 10, patate: 6 });
  s.inventaire.tomate[0].nightsLeft = 1;
  s.inventaire.carotte[0].nightsLeft = 5;
  s.inventaire.patate[0].nightsLeft = 2;
  const r = moveAllToFridge(s, { patate: 6 });
  assertEqual([r.moved, r.reste], [25, 5]);
  assertEqual([fridgeCount(s, 'tomate'), fridgeCount(s, 'patate'), fridgeCount(s, 'carotte')], [10, 0, 15], 'tomates (1 nuit) puis carottes ; les patates de semence restent');
});

test('version 1.10 : améliorer le frigo (300 / 700 / 1 500 / 3 000) ; la consommation suit le contenu', () => {
  const s = ranch();
  s.pieces = 10000;
  assertEqual(upgradeFridge(s).ok, false, 'pas construit');
  buildFridge(reach(s, 'frigo'));
  const caps = [];
  const costs = [];
  while (fridgeUpgradeCost(s) !== null) {
    const r = upgradeFridge(s);
    costs.push(r.cost);
    caps.push(fridgeCapacity(s));
  }
  assertEqual([costs, caps, s.frigo.niveau], [[300, 700, 1500, 3000], [40, 60, 90, 120], 5]);
  assertEqual(upgradeFridge(s).error, 'Niveau maximum atteint.');
  assertEqual(fridgeRate(s), 0);
  setInv(s, { carotte: 120 });
  moveToFridge(s, 'carotte', 120);
  assertEqual(fridgeRate(s), 12000, 'plein au niveau 5 : 12 Wh/s');
});

test('version 1.10 : migration v27 → v28 : le frigo passe au niveau 1, le surplus revient à l\'inventaire', () => {
  const s = ranch();
  s.pieces = 1000;
  buildFridge(reach(s, 'frigo'));
  const old = JSON.parse(JSON.stringify(s));
  old.version = 27;
  delete old.frigo.niveau;
  old.frigo.items = {
    carotte: [{ qty: 20, nightsLeft: 4, origin: 'produit' }],
    tomate: [{ qty: 15, nightsLeft: 2, origin: 'produit' }],
  };
  old.inventaire = { carotte: [{ qty: 3, nightsLeft: 4, origin: 'produit' }] };
  const m = migrateFridgeCapacity(old);
  assertEqual([m.version, m.frigo.niveau], [28, 1]);
  assertEqual([fridgeCount(m, 'tomate'), fridgeCount(m, 'carotte'), fridgeUnits(m)], [15, 10, 25], 'ce qui périme le plus tôt reste au frais');
  assertEqual(countItem(m, 'carotte'), 13, 'le surplus rejoint l\'inventaire, avec sa conservation');
  assertEqual(lotsOf(m, 'carotte').map((l) => l.nightsLeft), [4]);
  const neuf = migrate({ v: 27, t: 0, s: JSON.parse(JSON.stringify(createInitialState(1))) });
  assertEqual([neuf.version, neuf.frigo.niveau, neuf.frigo.construit], [STATE_VERSION, 1, false]);
});

/* ---------- version 1.13 (v2, lot 9) : le Verger au clic ---------- */

test('version 1.13 : un arbre se plante sur la case choisie du Verger', () => {
  const s = orchard();
  s.pieces = 200;
  assertEqual(freeOrchardCases(s), [0, 1]);
  const r = plantTree(s, 'poirier', 1);
  assertEqual([r.ok, r.case, s.pieces], [true, 1, 160]);
  assertEqual(treeAt(s, 1).espece, 'poirier');
  assertEqual(plantTree(s, 'pommier', 1).ok, false, 'case déjà prise');
  assertEqual(plantTree(s, 'pommier', 2).ok, false, 'case non achetée');
  assertEqual(plantTree(s, 'pommier').case, 0, 'sans case : la première libre');
  assertEqual(freeOrchardCases(s), []);
});

test('version 1.13 : 4 dessins, 5 nuits par dessin, puis des fruits qui attendent', () => {
  const s = orchard();
  protect(s, 'pomme');
  plantTree(s, 'pommier', 0);
  const t = s.verger.arbres[0];
  const stades = [];
  for (let n = 0; n <= 16; n++) {
    stades.push(treeStage(s, t));
    sleepOnce(s);
  }
  assertEqual(stades, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3]);
  assertEqual(countItem(s, 'pomme'), 0, 'rien n\'arrive seul dans l\'inventaire');
  assertEqual(ripeTrees(s).length, 1);
});

test('version 1.13 : la cueillette au clic coûte de l\'énergie et rapporte 20 XP, fruits 3 nuits plus tard', () => {
  const s = orchard();
  protect(s, 'poire');
  plantTree(s, 'poirier', 0);
  const t = s.verger.arbres[0];
  t.fruits = true;
  const xp = s.progression.xp;
  const e = s.energie;
  const r = harvestTree(s, t.id);
  assertEqual([r.ok, r.qty, countItem(s, 'poire')], [true, 6, 6]);
  assertEqual(s.progression.xp - xp, 20);
  assert(s.energie < e, 'énergie dépensée');
  assertEqual([t.fruits, treeStage(s, t)], [false, 0], 'jeune planté du jour : repasse au dessin de son âge');
  assertEqual(harvestTree(s, t.id).ok, false, 'plus de fruits');
  t.plantee = -40; // adulte
  const day = s.day;
  t.fruits = true;
  harvestTree(s, t.id);
  assertEqual(treeStage(s, t), 2, 'repasse à « arbre »');
  for (let i = 0; i < 2; i++) sleepOnce(s);
  assertEqual(t.fruits, false);
  sleepOnce(s);
  assertEqual([t.fruits, s.day], [true, day + 3], 'en fruits 3 nuits plus tard');
  s.energie = 0;
  assertEqual(harvestTree(s, t.id).ok, false, 'sans énergie');
});

test('version 1.13 : Récolte du verger, cueillette la nuit à moitié de l\'XP', () => {
  const s = orchard();
  protect(s, 'pomme');
  grantTech(s, 'cu_verger_auto');
  plantTree(s, 'pommier', 0);
  s.verger.arbres[0].prochaine = s.day;
  const xp = s.progression.xp;
  const r = sleepOnce(s);
  assertEqual([r.fruits.pomme, countItem(s, 'pomme'), s.verger.arbres[0].fruits], [6, 6, false]);
  assert(s.progression.xp - xp >= 10, 'XP de la cueillette automatique');
  assertEqual(DATA.ARBRE.noeuds.cu_verger_auto.effet, { auto: { recolte: ['verger'] } });
});

test('migration v29 → v30 : chaque arbre reçoit sa case et garde son calendrier', () => {
  const s = orchard();
  s.day = 20;
  const old = JSON.parse(JSON.stringify(s));
  old.version = 29;
  old.verger.arbres = [{ id: 'arbre-1', espece: 'pommier', plantee: 1 }, { id: 'arbre-2', espece: 'poirier', plantee: 10 }];
  const m = migrateOrchard(old);
  assertEqual(m.version, 30);
  // arbre 1 : nuits 15, 18, 21… → 21 ; arbre 2 : nuit 24
  assertEqual(m.verger.arbres.map((t) => [t.case, t.fruits, t.prochaine]), [[0, false, 21], [1, false, 24]]);
  const all = migrate({ v: 29, t: 0, s: old });
  assertEqual(all.version, STATE_VERSION);
});
