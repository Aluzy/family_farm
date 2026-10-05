/* ==========================================================================
   Tests du moteur (js/engine/). Petite fonction test/assert maison : pas de
   dépendance externe. Ce fichier n'est jamais chargé par le navigateur :
   run-tests.mjs l'importe avec Node. Les fonctions du moteur utilisées sont
   importées ci-dessous ; pour en tester une nouvelle, l'ajouter à la liste.
   ========================================================================== */

import {
  acknowledgeChapter, addItem, addLot, addMember, addPet, adultCount, advanceTutorial, alertEvents,
  alertSnapshot, allDevices, allPlots, animalBuyMax, animalPrice, animalRoom, AUTO_TACHES, autoMaintain,
  autonomyHistory, autonomyPercent, autoTasks, availableEnergy, averageHealth, awakeMsAtHour, awakeRequired,
  batteryCapacity, bedtimeDue, boltingPlan, boltSeedYield, botBuy, botDay, botFarm, botFieldTarget, botHeal, botIsFieldCrop, botMill,
  botRaiseFunds, botRecipeValue, botSell, botSheep, botStepInfo, botWheatKept, buildCatalog, buildFridge,
  buildMorningReport, buildPaturage, buildPoulailler, buildSerre, buildSilo, buildStation, buildVerger,
  buyAnimal, buyAnimals, buyCow, buyDevice, buyItem, buyOrchardSlot, buyPasture, buyPrice, buyQuote,
  buySheep, buyTech, buyTree, cancelMilling, cancelQueued, canSleep, careCost, chapterProgress,
  chapterReached, checkMastery, childCount, cleanFirstName, clockHours, completeChapter, CONSUMERS,
  coopCapacity, coopUpgradeCost, countItem, cowCapacity, cowCount, cowPlaces, createInitialState,
  cropProduct, cropUnlocked, currentSeason, DATA, deliverMail, deviceStatus, dishBonus, dishEnergy,
  dishPrice, drawEnergy, efficiency, energyStats, escapeHtml, expiringSoon, familyNeed, feedAllHens,
  feedFamily, feedHen, feedLivestock, findDevice, findMember, findPet, findPlot, finishPreparations,
  formatCoins, formatDuration, formatHour, formatLitres, formatLitresRate, formatNumber, formatPercent,
  formatQty, formatSigned, formatWh, formatWhRate, freeCowPlaces, freeSheepPlaces, fridgeCount,
  fridgeCounts, fridgeCoversNight, fridgeLots, fridgeNight, fridgeNightNeed, fridgeRate, fridgeUnits,
  GAME_VERSION, getNotifications, grantTech, growAll, growOrchard, harvest, harvestAll, harvestYield, heal,
  healthDelta, hourOfDay, ingredientOptions, inventoryCounts, isAutomated, isBroken, isBuyable,
  isGraineComptoir, isMature, isPerishable, isUnlocked, lastAutonomy, layEggs, loadShedding, lotsOf,
  mailReceived, maintainCost, maintainDevice, makeDevice, makePlot, makePlots, makeZone2Plot, marketCoef, marketFloor,
  maxCows, maxSheep, maxStage, mealDue, mealOrder, memberName, memberPortrait, memberRemovalBlock,
  memberRoom, mergeOfflineReports, migrate, migrateCropZone, migrateTechTreeV2, migrateToIntegers,
  MIGRATION_11, MIGRATIONS, millPending, millTimeLeft, moveFromFridge, moveToFridge, mulberry32,
  newAutoReport, newCampaignCounters, newGameFrom, newNightStats, newStableReport, nextRandom,
  nextSeasonStart, NIGHT_STEPS, nightHarvest, nightPower, notificationCount, offlineReport, offlineSnapshot,
  openFridge, openSerre, openStation, openZone2, orchardFree, orchardProducesOn, orchardSlotPrice, orchardWindow,
  ownedTechs, panelOutput, pastureCapacity, pastureCost, petIcon, petName, petRoom, pets, planMeal,
  plannedAutonomy, plant, plantableCrops, plantableCropsFor, plotZone, portraitEmoji, prepTimeMult,
  productionItemKeys, productivity, purchasePrice, queueCapacity, rainNight, randomInt, RAW_DATA,
  rawAverageHealth, readMail, readyCrops, recipeNode, recipeStatus, recipeTime, recipeUnlocked, recordNight,
  removeMember, removePet, repairCost, repairDevice, reservableItems, routineDue, scaleEnergie,
  seasonFactor, seasonNight, seedItem, seedStock, sellableCount, sellItem, sellPrice, serreUpgradeCost,
  setMemberProfile, setPetProfile, setRoutine, setSeedReserve, setSemis, shear, sheepCount, sheepPlaces,
  sheepToShear, shelfLife, siloCapacity, siloUpgradeCost, simulateFromCopy, simulateGame, simulateOffline,
  simulatePlay, simulationReach, skipTutorial, sleep, spend, spoil, stableFree, stableOccupied, startFarm,
  startHousehold, startLot4, startLot5, startLot6, startMilling, startRecipe, STATE_VERSION, storeEnergy,
  storeWheat, strawMissing, strawNeed, strawStock, takeItem, takeMeal, tankCapacity, taskTimeLeft,
  techPoints, techPrereqs, techProgress, techStatus, testAddDevice, testAddEggs, testAddFlour, testAddFood,
  testAddHens, testAddOil, testAddPieces, testAddSeeds, testAddSheep, testAddStraw, testAddWheat,
  testAgeInventory, testBuildFridge, testBuildSerre, testBuildStations, testBuildVerger,
  testCompleteChapter, testEmptyBatteries, testFillBatteries, testFillTank, testGoToChapter, testNextSeason,
  testRipenAll, testSetBuildingLevel5, testSetHealthZero, testSetWear, testSleepNights, testUnlockAllTechs,
  testWearMill, testWoolReady, tick, toggleBolting, toggleDevice, tutorialStep, unlockChapter, unreadMail,
  updateChapters, updateHealth, upgradeCost, upgradeDevice, upgradePotager, upgradePoulailler, upgradeSerre,
  upgradeSilo, validFirstName, wakeHarvestList, wakeSummary, water, waterAll, waterCostFor,
  waterSeasonFactor, wheatForHens, wheatTotal, fillSilo, isFridgeable, moveAllToFridge, migrateWheatAndReserve, winterStatus, woolReady, yieldSeasonFactor, zone2Plots,
} from '../js/engine/index.js';


const __tests = [];

function test(name, fn) {
  __tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion échouée');
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `attendu ${b}, obtenu ${a}`);
  }
}

function runTests() {
  const results = { total: __tests.length, passed: 0, failed: [] };
  for (const t of __tests) {
    try {
      t.fn();
      results.passed++;
    } catch (e) {
      results.failed.push({ name: t.name, error: e && e.message ? e.message : String(e) });
    }
  }
  // Assignation explicite sur globalThis : une déclaration `let`/`const` de
  // premier niveau ne devient pas une propriété de l'objet global (ni dans
  // un navigateur, ni dans un contexte vm Node), donc run-tests.mjs ne
  // pourrait pas la relire depuis l'extérieur du script sans ceci.
  if (typeof globalThis !== 'undefined') {
    globalThis.__testResults = results;
  }
  return results;
}

test('état initial : forme et valeurs attendues', () => {
  const s = createInitialState(42);
  assertEqual(s.version, STATE_VERSION);
  assertEqual(s.day, 1);
  assertEqual(s.awakeMs, 0);
  assertEqual(s.pieces, 350);
  assertEqual(s.rngSeed, 42);
  assertEqual(s.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir']);
  assertEqual(s.stats, {});
});

test('createInitialState() : une nouvelle partie démarre avec 350 pièces', () => {
  assertEqual(createInitialState().pieces, 350);
  assertEqual(createInitialState().pieces, DATA.START.PIECES);
});

test('tick() fait avancer awakeMs (ms entières) sans toucher au jour ni aux pièces', () => {
  const s = createInitialState(1);
  tick(s, 0.2);
  tick(s, 0.2);
  assertEqual(s.awakeMs, 400);
  assertEqual(s.day, 1);
  assertEqual(s.pieces, 350);
});

test('sérialisation JSON aller-retour identique', () => {
  const s = createInitialState(7);
  s.pieces = 123;
  s.stats.test = 1;
  const roundTripped = JSON.parse(JSON.stringify(s));
  assertEqual(roundTripped, s);
});

test('migration factice v0 → version courante', () => {
  const legacy = { day: 3, awakeSeconds: 10, pieces: 80, rngSeed: 9, unlockedTabs: ['ferme'], stats: {} };
  // pas de champ `version` : doit être traité comme version 0 et migré jusqu'au bout
  const migrated = migrate({ v: 0, t: Date.now(), s: legacy });
  assertEqual(migrated.version, STATE_VERSION);
  assertEqual(migrated.day, 3);
  assertEqual(migrated.pieces, 80);
  assertEqual(migrated.panneaux.length, 1);
});

test('migration v1 (Lot 0) → version courante : garde la partie et ajoute le parc', () => {
  const v1 = { version: 1, day: 4, awakeSeconds: 12, pieces: 200, rngSeed: 3, unlockedTabs: ['ferme'], stats: { a: 1 } };
  const m = migrate({ v: 1, t: 0, s: v1 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.day, 4);
  assertEqual(m.pieces, 200);
  assertEqual(m.stats, { a: 1 });
  assertEqual(m.panneaux.length, 1);
  assertEqual(m.batteries.length, 1);
  assertEqual(m.pompe.id, 'pompe');
  assertEqual(m.eauMl, ml(0));
  // l'état migré doit pouvoir tourner
  tick(m, 0.2);
  assertEqual(m.awakeMs, 12200, '12 s converties en ms, plus un pas de 0,2 s');
});

test('migrate() ne plante pas sur une entrée déjà à jour', () => {
  const s = createInitialState(5);
  const migrated = migrate({ v: STATE_VERSION, t: Date.now(), s });
  assertEqual(migrated.version, STATE_VERSION);
  assertEqual(migrated.pieces, 350);
  assertEqual(migrated.panneaux.length, 1);
});

test('import d\'un texte invalide sans plantage', () => {
  const badInputs = [null, undefined, {}, { s: null }, 'texte quelconque', 42];
  for (const bad of badInputs) {
    let threw = false;
    let result;
    try {
      result = migrate(bad);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'migrate ne doit jamais lancer d\'exception');
    assert(result && typeof result === 'object', 'migrate doit toujours renvoyer un objet');
  }
});

test('formatage des nombres à la française', () => {
  assertEqual(formatNumber(0), '0');
  assertEqual(formatNumber(50), '50');
  assertEqual(formatNumber(1234), '1 234');
  assertEqual(formatNumber(12345), '12 345');
  assertEqual(formatNumber(1200), '1 200');
  assertEqual(formatNumber(3400000), '3 400 000');
  assertEqual(formatNumber(-15000), '-15 000');
  assertEqual(formatNumber(2.6), '3', 'jamais de décimale');
});

test('générateur aléatoire reproductible à graine égale', () => {
  const rngA = mulberry32(1234);
  const rngB = mulberry32(1234);
  const seqA = [rngA(), rngA(), rngA()];
  const seqB = [rngB(), rngB(), rngB()];
  assertEqual(seqA, seqB);
  for (const v of seqA) {
    assert(v >= 0 && v < 1, 'chaque valeur doit être dans [0, 1)');
  }
  const rngC = mulberry32(9999);
  assert(rngC() !== seqA[0], 'deux graines différentes ne doivent pas (en pratique) produire la même première valeur');
});

// Lots 1 à 7 : ces tests vérifient les règles de base (rendements, eau),
// sans modificateur de saison. Les quatre saisons passent à 100 % le
// temps du test (le printemps de la nuit 1 vaut sinon potager ×1,1,
// et les longues séries de nuits traversent l'hiver) ; les modificateurs
// eux-mêmes sont testés dans les tests du Lot 8.
function neutralSeasons(fn) {
  const saved = JSON.parse(JSON.stringify(DATA.SAISONS.MODS));
  for (const mods of Object.values(DATA.SAISONS.MODS)) {
    for (const k of Object.keys(mods)) mods[k] = 100;
  }
  try {
    return fn();
  } finally {
    for (const [saison, mods] of Object.entries(saved)) Object.assign(DATA.SAISONS.MODS[saison], mods);
  }
}

function testBase(name, fn) {
  test(name, () => neutralSeasons(fn));
}

/* ---------- Lot 1 : heure, parc électrique, eau, Dormir ---------- */

function near(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

// Unités entières du moteur : kWh → mWh, L → mL (pour écrire les tests en
// unités lisibles).
const kwh = (n) => Math.round(n * 1e6);
const ml = (n) => Math.round(n * 1000);

// État de test : seul le panneau produit, la pompe est coupée (sauf demande).
function farm({ pump = false } = {}) {
  const s = createInitialState(1);
  s.pompe.allume = pump;
  return s;
}

test('DATA : grilles par niveau, coûts et départ', () => {
  assertEqual(DATA.GRID.panneau.whParS, [30, 50, 80, 120, 180]);
  assertEqual(DATA.GRID.batterie.wh, [5000, 10000, 20000, 40000, 80000]);
  assertEqual(DATA.GRID.pompe.litresPerS, [1, 2, 4, 6, 10]);
  assertEqual(DATA.GRID.pompe.reservoirL, [40, 80, 160, 300, 500]);
  assertEqual(DATA.UPGRADE_COST.slice(1), [40, 100, 250, 600]);
  const s = createInitialState(1);
  assertEqual(s.panneaux.length, 1);
  assertEqual(s.batteries.length, 1);
  assertEqual(s.panneaux[0].niveau, 1);
  assertEqual(s.batteries[0].niveau, 1);
  assertEqual(s.pompe.niveau, 1);
  assertEqual(tankCapacity(s), ml(40));
  assertEqual(s.eauMl, ml(0));
});

test('production : un panneau de niveau 1 produit 0,03 kWh/s', () => {
  const s = farm();
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.3), `charge ${s.batteries[0].chargeMwh}`);
  assertEqual(s.jour.produite, kwh(0.3));
});

test('production réduite par l\'usure (rendement = 100 − ⌊usure ÷ 2⌋ %)', () => {
  const s = farm();
  s.panneaux[0].usure = 50; // rendement 75 %
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.03 * 0.75 * 10), `charge ${s.batteries[0].chargeMwh}`);
  const t = farm();
  t.panneaux[0].usure = 99; // presque en panne : rendement 51 %
  assertEqual(efficiency(t.panneaux[0]), 51);
  t.panneaux[0].usure = 81;
  assertEqual(efficiency(t.panneaux[0]), 60, 'arrondi vers le bas : 81 ÷ 2 = 40');
});

test('un panneau éteint ne produit rien', () => {
  const s = farm();
  toggleDevice(s, 'panneau-1');
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, 0);
});

test('capacité utile d\'une batterie = capacité × rendement', () => {
  const s = farm();
  s.batteries[0].usure = 99; // rendement 51 %
  s.panneaux[0].niveau = 5; // 180 Wh/s
  tick(s, 100); // 18 000 Wh produits, capacité utile 5 000 × 51 % = 2 550 Wh
  assertEqual(s.batteries[0].chargeMwh, kwh(2.55), `charge ${s.batteries[0].chargeMwh}`);
});

test('remplissage des batteries dans l\'ordre de la liste', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'batterie');
  const [b1, b2] = s.batteries;
  const rest = storeEnergy(s, kwh(7));
  assertEqual(rest, 0);
  assertEqual(b1.chargeMwh, kwh(5), `b1 ${b1.chargeMwh}`);
  assertEqual(b2.chargeMwh, kwh(2), `b2 ${b2.chargeMwh}`);
  storeEnergy(s, kwh(1));
  assertEqual(b2.chargeMwh, kwh(3));
});

test('décharge en sens inverse : la dernière remplie se vide la première', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'batterie');
  const [b1, b2] = s.batteries;
  storeEnergy(s, kwh(7)); // b1 = 5, b2 = 2
  const given = drawEnergy(s, kwh(3));
  assertEqual(given, kwh(3));
  assertEqual(b2.chargeMwh, kwh(0), `b2 ${b2.chargeMwh}`);
  assertEqual(b1.chargeMwh, kwh(4), `b1 ${b1.chargeMwh}`);
});

test('une batterie coupée garde sa charge sans la rendre ni la recevoir', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'batterie');
  const [b1, b2] = s.batteries;
  storeEnergy(s, kwh(7));
  toggleDevice(s, b2.id);
  assertEqual(drawEnergy(s, kwh(10)), kwh(5), 'seule b1 peut rendre');
  assertEqual(b2.chargeMwh, kwh(2), 'b2 garde sa charge');
  assertEqual(storeEnergy(s, kwh(1)), kwh(0));
  assertEqual(b2.chargeMwh, kwh(2), 'b2 ne reçoit rien');
  assertEqual(b1.chargeMwh, kwh(1));
});

test('une batterie ne se décharge jamais d\'elle-même', () => {
  const s = farm();
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(3);
  for (let i = 0; i < 500; i++) tick(s, 0.2);
  assertEqual(s.batteries[0].chargeMwh, kwh(3));
});

test('énergie perdue quand tout est plein, et le rapport la signale', () => {
  const s = farm();
  testFillBatteries(s);
  tick(s, 10);
  assertEqual(s.jour.perdue, kwh(0.3), `perdue ${s.jour.perdue}`);
  assertEqual(s.flux.perdue, kwh(0.03));
  s.awakeMs = 30000;
  const report = sleep(s);
  assertEqual(report.energiePerdue, kwh(0.3), `rapport ${report.energiePerdue}`);
  assertEqual(s.jour.perdue, 0);
});

test('énergie perdue quand toutes les batteries sont coupées', () => {
  const s = farm();
  toggleDevice(s, 'batterie-1');
  tick(s, 10);
  assertEqual(s.jour.perdue, kwh(0.3));
  assertEqual(s.batteries[0].chargeMwh, 0);
});

test('pompe : 1 L/s pour 0,01 kWh/L, alimentée par la batterie', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(1);
  tick(s, 10);
  assertEqual(s.eauMl, ml(10), `eau ${s.eauMl}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.9), `charge ${s.batteries[0].chargeMwh}`);
  assertEqual(s.pompe.debit, ml(1));
  assertEqual(s.pompe.conso, kwh(0.01));
});

test('pompe au prorata quand l\'énergie manque', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(0.001); // il faudrait 0,002 kWh pour 0,2 L
  tick(s, 0.2);
  assertEqual(s.eauMl, ml(0.1), `eau ${s.eauMl}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(0));
  tick(s, 0.2);
  assertEqual(s.eauMl, ml(0.1), 'plus d\'énergie : plus d\'eau');
  assertEqual(deviceStatus(s, s.pompe).code, 'attente');
});

test('pompe : l\'énergie est prise dans les batteries en sens inverse', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  s.pieces = 1000;
  buyDevice(s, 'batterie');
  s.batteries[0].chargeMwh = kwh(5);
  s.batteries[1].chargeMwh = kwh(2);
  tick(s, 10); // 0,1 kWh
  assertEqual(s.batteries[1].chargeMwh, kwh(1.9), `b2 ${s.batteries[1].chargeMwh}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(5));
  assertEqual(s.batteries[1].sortie, kwh(0.01), 'la batterie en décharge affiche la puissance soutirée');
  assertEqual(deviceStatus(s, s.batteries[1]).code, 'decharge');
});

test('pompe à l\'arrêt si le réservoir est plein : rien consommé, aucune usure', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  testFillTank(s);
  s.batteries[0].chargeMwh = kwh(1);
  for (let i = 0; i < 50; i++) tick(s, 0.2);
  assertEqual(s.batteries[0].chargeMwh, kwh(1));
  assertEqual(s.pompe.usure, 0);
  assertEqual(s.eauMl, ml(40));
  assertEqual(deviceStatus(s, s.pompe).code, 'plein');
});

test('le réservoir ne dépasse jamais sa capacité', () => {
  const s = farm({ pump: true });
  s.eauMl = ml(39.95);
  testFillBatteries(s);
  tick(s, 10);
  assertEqual(s.eauMl, ml(40));
});

test('le réservoir suit le niveau de la pompe', () => {
  const s = farm();
  s.pieces = 1000;
  for (const cap of [80, 160, 300, 500]) {
    assert(upgradeDevice(s, 'pompe').ok);
    assertEqual(tankCapacity(s), ml(cap));
  }
  assertEqual(upgradeDevice(s, 'pompe').ok, false);
  assertEqual(DATA.GRID.pompe.litresPerS[s.pompe.niveau - 1], 10);
});

test('usure : +1 point toutes les 2 heures de fonctionnement (60 s)', () => {
  const s = farm();
  for (let i = 0; i < 150; i++) tick(s, 0.2); // 30 s : une heure
  assertEqual([s.panneaux[0].usure, s.panneaux[0].usureMs], [0, 30000], 'une heure de marche : pas encore de point');
  for (let i = 0; i < 150; i++) tick(s, 0.2); // 60 s
  assertEqual([s.panneaux[0].usure, s.panneaux[0].usureMs], [1, 0]);
  assertEqual(s.batteries[0].usure, 1, 'la batterie qui charge s\'use aussi');
});

test('aucune usure sur un appareil éteint, en panne ou sans énergie', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  toggleDevice(s, 'batterie-1');
  for (let i = 0; i < 150; i++) tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 0, 'panneau éteint');
  assertEqual(s.batteries[0].usure, 0, 'batterie éteinte');
  assertEqual(s.pompe.usure, 0, 'pompe sans énergie');
  const t = farm();
  toggleDevice(t, 'panneau-1');
  for (let i = 0; i < 150; i++) tick(t, 0.2);
  assertEqual(t.batteries[0].usure, 0, 'batterie sans flux');
});

test('panne à 100 % : l\'appareil s\'arrête et s\'éteint', () => {
  const s = farm();
  s.panneaux[0].usure = 99;
  s.panneaux[0].usureMs = 40000;
  tick(s, 30);
  const p = s.panneaux[0];
  assertEqual(p.usure, 100);
  assertEqual(p.allume, false);
  assertEqual(isBroken(p), true);
  assertEqual(deviceStatus(s, p).code, 'panne');
  const charge = s.batteries[0].chargeMwh;
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, charge, 'un panneau en panne ne produit plus');
  assertEqual(toggleDevice(s, 'panneau-1').ok, false, 'on ne rallume pas une panne');
});

test('seuil « à entretenir » à 70 % d\'usure', () => {
  const s = farm();
  s.panneaux[0].usure = 69;
  assertEqual(deviceStatus(s, s.panneaux[0]).badge, '');
  s.panneaux[0].usure = 70;
  assertEqual(deviceStatus(s, s.panneaux[0]).badge, 'À entretenir');
  assertEqual(energyStats(s).panneauxAEntretenir, 1);
});

test('coûts d\'achat croissants : 60, 72, 87 (panneau) et 80, 96 (batterie)', () => {
  // 60 × 1,2ⁿ arrondi à l'entier supérieur : 86,4 → 87 ; 103,68 → 104.
  assertEqual([0, 1, 2].map((n) => purchasePrice('panneau', n)), [60, 72, 87]);
  assertEqual([0, 1].map((n) => purchasePrice('batterie', n)), [80, 96]);
  const s = farm();
  s.pieces = 10000;
  const paid = [];
  for (let i = 0; i < 3; i++) paid.push(buyDevice(s, 'panneau').price);
  // le premier achat compte l'appareil de départ déjà possédé (n = 1)
  assertEqual(paid, [72, 87, 104]);
  assertEqual(s.panneaux.length, 4);
  assertEqual(s.panneaux[3].prix, 104);
  assertEqual(s.pieces, 10000 - 72 - 87 - 104);
});

test('achat refusé sans pièces, sans rien débiter', () => {
  const s = farm();
  s.pieces = 10;
  const r = buyDevice(s, 'panneau');
  assertEqual(r.ok, false);
  assertEqual(s.pieces, 10);
  assertEqual(s.panneaux.length, 1);
  assertEqual(buyDevice(s, 'moulin').ok, false);
});

test('améliorer : coûts 40 / 100 / 250 / 600, refus sans pièces et au niveau 5', () => {
  const s = farm();
  s.pieces = 10;
  assertEqual(upgradeDevice(s, 'panneau-1').ok, false);
  assertEqual(s.panneaux[0].niveau, 1);
  s.pieces = 1000;
  const costs = [];
  for (let i = 0; i < 4; i++) costs.push(upgradeDevice(s, 'panneau-1').cost);
  assertEqual(costs, [40, 100, 250, 600]);
  assertEqual(s.panneaux[0].niveau, 5);
  assertEqual(s.pieces, 10);
  assertEqual(upgradeDevice(s, 'panneau-1').ok, false);
  assertEqual(upgradeDevice(s, 'inconnu').ok, false);
});

test('un appareil amélioré est indépendant des autres', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'panneau');
  upgradeDevice(s, 'panneau-2');
  assertEqual(s.panneaux[0].niveau, 1);
  assertEqual(s.panneaux[1].niveau, 2);
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh((0.03 + 0.05) * 10));
});

test('entretien 20 % et réparation 50 % du prix d\'achat', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'panneau'); // payé 72
  const p = s.panneaux[1];
  assertEqual(maintainCost(p), 15, '20 % de 72 = 14,4, arrondi à 15');
  assertEqual(repairCost(p), 36);
  // entretien : remet l'usure à 0
  p.usure = 80;
  const before = s.pieces;
  const r = maintainDevice(s, p.id);
  assertEqual(r.ok, true);
  assertEqual(p.usure, 0);
  assertEqual(before - s.pieces, 15);
  // entretien inutile sans usure, refusé sur une panne
  assertEqual(maintainDevice(s, p.id).ok, false);
  testSetWear(s, p.id, 100);
  assertEqual(maintainDevice(s, p.id).ok, false);
  // réparation : uniquement en panne, l'appareil reste éteint
  const before2 = s.pieces;
  assertEqual(repairDevice(s, p.id).ok, true);
  assert(near(before2 - s.pieces, 36));
  assertEqual(p.usure, 0);
  assertEqual(p.allume, false);
  assertEqual(repairDevice(s, p.id).ok, false);
});

test('entretien et réparation refusés sans pièces', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'batterie'); // payée 96
  const b = s.batteries[1];
  b.usure = 50;
  s.pieces = 5;
  assertEqual(maintainDevice(s, b.id).ok, false);
  assertEqual(b.usure, 50);
  testSetWear(s, b.id, 100);
  assertEqual(repairDevice(s, b.id).ok, false);
  assertEqual(isBroken(b), true);
  assertEqual(s.pieces, 5);
});

test('les appareils de départ sont gratuits à entretenir', () => {
  const s = farm();
  s.panneaux[0].usure = 60;
  assertEqual(maintainCost(s.panneaux[0]), 0);
  s.pieces = 0;
  assertEqual(maintainDevice(s, 'panneau-1').ok, true);
});

test('interrupteur : allume et éteint, id inconnu refusé', () => {
  const s = farm();
  assertEqual(s.panneaux[0].allume, true);
  toggleDevice(s, 'panneau-1');
  assertEqual(s.panneaux[0].allume, false);
  toggleDevice(s, 'panneau-1');
  assertEqual(s.panneaux[0].allume, true);
  assertEqual(toggleDevice(s, 'nope').ok, false);
});

test('heure : suit le temps d\'éveil, 6 h au réveil, +1 h toutes les 18 s', () => {
  const s = farm();
  assertEqual(DATA.TIME.CLOCK_SECONDS_PER_HOUR, 18);
  const H = 18000;
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H - 100;
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H;
  assertEqual(hourOfDay(s), 7);
  s.awakeMs = H * 3;
  assertEqual(hourOfDay(s), 9);
  s.awakeMs = H * 16; // 22 h : la fin de la journée
  assertEqual(hourOfDay(s), 22);
  s.awakeMs = H * 17;
  assertEqual(hourOfDay(s), 23);
  s.awakeMs = H * 18; // si rien ne lance la nuit, l'horloge repart de 0 et continue
  assertEqual(hourOfDay(s), 0);
  s.awakeMs = H * 24; // un tour complet
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H * 100; // (6 + 100) modulo 24
  assertEqual(hourOfDay(s), 10);
  assertEqual(formatHour(7), '7 h');
});

test('clockHours : la même heure, avec ses minutes, toujours dans [0, 24)', () => {
  const s = farm();
  const H = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  const at = (ms) => { s.awakeMs = ms; return clockHours(s); };
  assertEqual(at(0), 6);
  assertEqual(at(H / 2), 6.5, '6 h 30 après une demi-heure de jeu (9 s)');
  assertEqual(at(H), 7);
  assertEqual(at(H * 17 + H / 2), 23.5);
  assertEqual(at(H * 18), 0, 'minuit');
  assertEqual(at(H * 18 + H / 4), 0.25);
  assertEqual(at(H * 24), 6, 'un tour complet ramène à 6 h');
  for (const ms of [0, 1, 199, H - 1, H, 61234, H * 16 - 1, H * 16, H * 18 - 1, H * 18, H * 24 - 1, H * 24, 987654321]) {
    const h = at(ms);
    assert(h >= 0 && h < 24, `dans [0, 24) : ${h}`);
    assertEqual(Math.floor(h), hourOfDay(s), `même heure entière que hourOfDay à ${ms} ms`);
  }
  // un état abîmé ne fait pas planter l'horloge
  assertEqual(clockHours({ awakeMs: undefined }), 6);
  assertEqual(clockHours({ awakeMs: -50 }), 6);
});

test('horloge : l\'heure affichée ne change ni l\'usure ni le sommeil', () => {
  // L'usure garde sa propre « heure de marche » de 30 s : 1 point toutes les 2 heures = 60 s.
  assertEqual([DATA.TIME.SECONDS_PER_HOUR, DATA.WEAR.HEURES_PAR_POINT, DATA.TIME.MIN_AWAKE_S, DATA.TIME.DAY_START_HOUR], [30, 2, 30, 6]);
  const s = farm();
  for (let i = 0; i < 299; i++) tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 0, '59,8 s de marche : pas encore un point');
  tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 1, '60 s de marche : 1 point, comme avant');
  // On peut dormir après 30 s d'éveil, quelle que soit l'heure (30 s = 7 h 40 à 18 s par heure).
  const t = farm();
  t.awakeMs = 29000;
  assertEqual([hourOfDay(t), canSleep(t)], [7, false]);
  t.awakeMs = 30000;
  assertEqual([hourOfDay(t), canSleep(t)], [7, true]);
  t.awakeMs = 18000 * 20;
  assertEqual([hourOfDay(t), canSleep(t)], [2, true], 'veiller tard ne bloque rien');
  const day = t.day;
  assert(sleep(t) !== null);
  assertEqual([t.day, t.awakeMs, hourOfDay(t), clockHours(t)], [day + 1, 0, 6, 6], 'au réveil il est 6 h');
});

test('heure : 90 ticks de 0,2 s font bien une heure de jeu (flottants)', () => {
  const s = farm();
  for (let i = 0; i < 89; i++) tick(s, 0.2);
  assertEqual(hourOfDay(s), 6);
  tick(s, 0.2);
  assertEqual([s.awakeMs, hourOfDay(s)], [18000, 7]);
  assertEqual(canSleep(s), false, '18 s d\'éveil : trop tôt pour dormir');
  for (let i = 0; i < 60; i++) tick(s, 0.2);
  assertEqual([s.awakeMs, hourOfDay(s)], [30000, 7]);
  assertEqual(canSleep(s), true);
});

test('sleep refusé avant 30 s, puis accepté ; jour +1, éveil à 0, heure à 6 h', () => {
  const s = farm();
  s.awakeMs = 29000;
  assertEqual(canSleep(s), false);
  assertEqual(sleep(s), null);
  assertEqual(s.day, 1);
  assertEqual(s.awakeMs, 29000);
  s.awakeMs = 30000;
  assertEqual(canSleep(s), true);
  const report = sleep(s);
  assert(report !== null);
  assertEqual(s.day, 2);
  assertEqual(s.awakeMs, 0);
  assertEqual(hourOfDay(s), 6);
});

test('sleep conserve l\'énergie stockée et l\'eau (la nuit ne produit rien)', () => {
  const s = farm();
  s.batteries[0].chargeMwh = kwh(2.5);
  s.eauMl = ml(12);
  s.awakeMs = 30000;
  const before = JSON.stringify([s.panneaux, s.batteries, s.pompe]);
  const report = sleep(s);
  assertEqual(JSON.stringify([s.panneaux, s.batteries, s.pompe]), before);
  assertEqual(s.batteries[0].chargeMwh, kwh(2.5));
  assertEqual(report.energie, kwh(2.5));
  assertEqual(report.eau, ml(12));
});

test('rapport de réveil : nuit, énergie, eau, appareils à entretenir ou en panne', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'panneau');
  s.panneaux[0].usure = 75;
  testSetWear(s, 'panneau-2', 100);
  s.eauMl = ml(8);
  testFillBatteries(s);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.nuit, 2);
  assertEqual(r.energie, kwh(5));
  assertEqual(r.capacite, kwh(5));
  assertEqual(r.eau, ml(8));
  assertEqual(r.capaciteEau, ml(40));
  assertEqual(r.aEntretenir.map((d) => d.id), ['panneau-1']);
  assertEqual(r.enPanne.map((d) => d.id), ['panneau-2']);
  assertEqual(s.report, r);
});

test('ordre des étapes nocturnes : dans l\'ordre, avant le changement de jour', () => {
  const saved = NIGHT_STEPS.splice(0);
  try {
    const seen = [];
    NIGHT_STEPS.push((st) => seen.push(['a', st.day, st.awakeMs]));
    NIGHT_STEPS.push((st) => seen.push(['b', st.day, st.awakeMs]));
    NIGHT_STEPS.push((st) => seen.push(['c', st.day, st.awakeMs]));
    const s = farm();
    sleep(s); // refusé : aucune étape
    assertEqual(seen, []);
    s.awakeMs = 30000;
    sleep(s);
    assertEqual(seen, [['a', 1, 30000], ['b', 1, 30000], ['c', 1, 30000]]);
    assertEqual(s.day, 2);
  } finally {
    NIGHT_STEPS.splice(0, NIGHT_STEPS.length, ...saved);
  }
});

test('mode test : ajout d\'appareils, remplissages, usure, nuits', () => {
  const s = farm();
  testAddDevice(s, 'panneau');
  testAddDevice(s, 'batterie');
  assertEqual(s.panneaux.length, 2);
  assertEqual(s.batteries.length, 2);
  assertEqual(s.pieces, 350);
  testFillBatteries(s);
  assertEqual(energyStats(s).charge, kwh(10));
  testFillTank(s);
  assertEqual(s.eauMl, ml(40));
  testSetWear(s, 'pompe', 100);
  assertEqual(isBroken(s.pompe), true);
  testSleepNights(s, 5);
  assertEqual(s.day, 6);
  assertEqual(s.awakeMs, 0);
});

test('un id ne se réutilise jamais après un achat', () => {
  const s = farm();
  s.pieces = 1000;
  buyDevice(s, 'batterie');
  buyDevice(s, 'batterie');
  const ids = s.batteries.map((b) => b.id);
  assertEqual(ids, ['batterie-1', 'batterie-2', 'batterie-3']);
});

test('sérialisation JSON aller-retour avec le parc et après plusieurs ticks', () => {
  const s = createInitialState(9);
  s.pieces = 500;
  buyDevice(s, 'panneau');
  buyDevice(s, 'batterie');
  for (let i = 0; i < 100; i++) tick(s, 0.2);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  tick(copy, 0.2);
  tick(s, 0.2);
  assertEqual(copy, s);
});

test('formatage : pièces et puissances', () => {
  assertEqual(formatCoins(50), '50');
  assertEqual(formatCoins(87), '87');
  assertEqual(formatCoins(1234), '1 234');
  assertEqual(formatCoins(14.4), '14', 'une ancienne valeur décimale s\'affiche sans virgule');
  assertEqual(formatSigned(5), '+5');
  assertEqual(formatSigned(-20), '−20');
  assertEqual(formatSigned(0), '0');
  assertEqual(formatWh(2345678), '2 345 Wh', 'mWh → Wh, vers le bas');
  assertEqual(formatWhRate(30000), '30 Wh/s');
  assertEqual(formatWhRate(-20000, true), '−20 Wh/s');
  assertEqual(formatLitres(38999), '38 L');
  assertEqual(formatLitresRate(2000), '2 L/s');
});

/* ---------- Lot 2 : potager, famille, santé, conserves ---------- */

// État de test : réservoir plein d'eau (le potager s'arrose avec).
function garden() {
  const s = createInitialState(1);
  s.pompe.allume = false;
  s.eauMl = ml(40);
  return s;
}

// Plante une culture sur une parcelle et la fait mûrir d'un coup.
function plantRipe(s, plotId, culture) {
  assert(plant(s, plotId, culture).ok, `planter ${culture}`);
  const p = findPlot(s, plotId);
  p.stade = maxStage(p);
  return p;
}

// Lot 3 : remplace l'inventaire par ces quantités (lots à conservation pleine).
function setInv(s, quantities) {
  s.inventaire = {};
  for (const [item, n] of Object.entries(quantities)) addItem(s, item, n);
}

function setHealth(s, value) {
  for (const m of s.famille.membres) {
    m.sante = value;
    m.malade = false;
  }
}

test('DATA Lot 2 : objets, énergies et prix de vente', () => {
  const it = DATA.items;
  // Lot 11 (nutrition) : +25 % par rapport aux valeurs d'origine (6, 15, 6, 8,
  // 8, 20), arrondi via scaleEnergie(). Lot 12 : les prix de vente des
  // récoltes (légumes) sont doublés par applyProductionPriceMultiplier() —
  // valeurs d'origine 1, 2, 1, 2, 2 ci-dessous, en commentaire.
  assertEqual([it.carotte.energie, it.carotte.prix], [scaleEnergie(6), 2]); // 1 × 2
  assertEqual([it.patate.energie, it.patate.prix], [scaleEnergie(15), 4]); // 2 × 2
  assertEqual([it.tomate.energie, it.tomate.prix], [scaleEnergie(6), 2]); // 1 × 2
  assertEqual([it.courgette.energie, it.courgette.prix], [scaleEnergie(8), 4]); // 2 × 2
  assertEqual([it.aubergine.energie, it.aubergine.prix], [scaleEnergie(8), 4]); // 2 × 2
  // La conserve n'est pas une production de la ferme (catégorie « conserve »,
  // non rachetable) : son prix reste inchangé.
  assertEqual([it.conserve.energie, it.conserve.prix], [scaleEnergie(20), 3]);
  assertEqual(it.conserve.rachetable, false);
  assertEqual(it.conserve.category, 'conserve');
  for (const k of ['graine_carotte', 'graine_tomate', 'graine_courgette', 'graine_aubergine']) {
    assertEqual([it[k].prix, it[k].edible, it[k].category], [1, false, 'graine']);
  }
  for (const k of Object.keys(it)) {
    assert(typeof it[k].edible === 'boolean' && typeof it[k].category === 'string', `${k} : edible et category`);
  }
});

test('DATA Lot 2 : cultures (stades, eau, rendement, graines)', () => {
  const c = DATA.crops;
  assertEqual(Object.keys(c), [
    'carotte', 'patate', 'tomate', 'courgette', 'aubergine',
    'poivron', 'oignon', 'ail', 'epinard', 'fraise',
    'ble', 'tournesol', 'riz', 'houblon', 'cacao', 'vanille', 'cafe',
  ]);
  assertEqual(['carotte', 'patate', 'tomate', 'courgette', 'aubergine'].map((k) => c[k].stades), [4, 6, 5, 5, 6]);
  assertEqual(['carotte', 'patate', 'tomate', 'courgette', 'aubergine'].map((k) => c[k].litres), [2, 3, 3, 4, 4]);
  assertEqual(['carotte', 'patate', 'tomate', 'courgette', 'aubergine'].map((k) => c[k].rendement), [10, 8, 10, 6, 6]);
  assertEqual(c.carotte.graines, { item: 'graine_carotte', mode: 'montee', stadesSupp: 2, quantite: 6 });
  assertEqual(c.patate.graines.mode, 'plant');
  for (const k of ['tomate', 'courgette', 'aubergine']) {
    assertEqual([c[k].graines.mode, c[k].graines.min, c[k].graines.max], ['recolte', 1, 2]);
  }
  // Version 1.0 : une seule Zone de culture (lieu 'potager'). Blé et tournesol y
  // poussent comme le reste ; seul leur déblocage ('champ', chapitre 3) les distingue.
  for (const k of ['carotte', 'patate']) assertEqual([c[k].lieux, c[k].deblocage], [['potager'], undefined]);
  for (const k of ['tomate', 'courgette', 'aubergine']) assertEqual(c[k].lieux, ['potager', 'serre']); // Lot 8 : la Serre
  for (const k of ['ble', 'tournesol']) assertEqual([c[k].lieux, c[k].deblocage], [['potager'], 'champ']);
  // plus aucune culture ne cite l'ancien lieu « champ »
  for (const k of Object.keys(c)) assertEqual(c[k].lieux.includes('champ'), false, `${k} : pas de lieu champ`);
});

test('DATA « 10 cultures » : stades, eau, rendement, graines, comestibilité, vente', () => {
  const c = DATA.crops;
  const it = DATA.items;
  assertEqual(['oignon', 'ail', 'poivron', 'epinard', 'fraise', 'riz', 'houblon', 'cacao', 'vanille', 'cafe'].map((k) => c[k].stades),
    [5, 6, 6, 3, 4, 8, 6, 8, 10, 8]);
  assertEqual(['oignon', 'ail', 'poivron', 'epinard', 'fraise', 'riz', 'houblon', 'cacao', 'vanille', 'cafe'].map((k) => c[k].litres),
    [3, 2, 4, 3, 3, 4, 2, 3, 2, 3]);
  assertEqual(['oignon', 'ail', 'poivron', 'epinard', 'fraise', 'riz', 'houblon', 'cacao', 'vanille', 'cafe'].map((k) => c[k].rendement),
    [8, 6, 6, 8, 10, 10, 6, 5, 3, 6]);
  assertEqual([c.oignon.graines.mode, c.oignon.graines.min, c.oignon.graines.max], ['recolte', 1, 2]);
  assertEqual([c.poivron.graines.mode, c.poivron.graines.min, c.poivron.graines.max], ['recolte', 1, 2]);
  assertEqual([c.epinard.graines.mode, c.epinard.graines.min, c.epinard.graines.max], ['recolte', 1, 2]);
  assertEqual([c.fraise.graines.mode, c.fraise.graines.min, c.fraise.graines.max], ['recolte', 2, 3]);
  for (const k of ['ail', 'riz', 'houblon', 'cacao', 'vanille', 'cafe']) {
    assertEqual(c[k].graines, { item: k, mode: 'plant' }, `${k} : 1 récolte = 1 graine`);
  }
  // Lieux : Zone de culture ('potager') pour oignon/ail/épinard/fraise, Zone +
  // Serre pour le poivron (même mécanisme que tomate/courgette/aubergine), Zone
  // de culture aussi pour riz/houblon (cultures de plein champ : déblocage
  // 'champ'), Serre exclusivement pour cacao/vanille/café.
  for (const k of ['oignon', 'ail', 'epinard', 'fraise']) assertEqual(c[k].lieux, ['potager']);
  assertEqual(c.poivron.lieux, ['potager', 'serre']);
  for (const k of ['riz', 'houblon']) assertEqual([c[k].lieux, c[k].deblocage], [['potager'], 'champ']);
  for (const k of ['oignon', 'ail', 'epinard', 'fraise', 'poivron', 'cacao', 'vanille', 'cafe']) assertEqual(c[k].deblocage, undefined, `${k} : aucun déblocage requis`);
  for (const k of ['cacao', 'vanille', 'cafe']) assertEqual(c[k].lieux, ['serre']);
  // Comestibilité et prix de vente exactement comme demandé.
  assertEqual(['oignon', 'ail', 'poivron', 'epinard', 'fraise', 'riz'].map((k) => [it[k].edible, it[k].energie]),
    [[true, 6], [true, 6], [true, 7], [true, 5], [true, 5], [true, 10]]);
  for (const k of ['houblon', 'cacao', 'vanille', 'cafe']) assertEqual(it[k].edible, false, `${k} n'est jamais comestible`);
  // Lot 12 : prix de vente doublés (valeurs d'origine, en commentaire :
  // 1, 2, 2, 1, 2, 1, 3, 8, 15, 6).
  assertEqual(['oignon', 'ail', 'poivron', 'epinard', 'fraise', 'riz', 'houblon', 'cacao', 'vanille', 'cafe'].map((k) => it[k].prix),
    [2, 4, 4, 2, 4, 2, 6, 16, 30, 12]);
});

test('état initial Lot 2 : inventaire, potager de 6 parcelles, famille de 4 à 100', () => {
  const s = createInitialState(1);
  assertEqual(inventoryCounts(s), { conserve: 160, graine_carotte: 10, patate: 6, graine_tomate: 4 });
  assertEqual(s.pieces, 350);
  assertEqual(s.potager.niveau, 1);
  assertEqual(s.potager.parcelles.length, 6);
  assertEqual(s.potager.parcelles.every((p) => p.culture === null && p.stade === 0 && !p.arrose && !p.montee), true);
  assertEqual(s.famille.membres.length, 4);
  assertEqual(s.famille.membres.filter((m) => m.enfant).length, 2);
  assertEqual(s.famille.membres.every((m) => m.sante === 100 && m.malade === false), true);
  assertEqual(s.famille.soinsPayes, 0);
});

test('inventaire : add, take et count', () => {
  const s = garden();
  assertEqual(countItem(s, 'conserve'), 160);
  assertEqual(countItem(s, 'tomate'), 0);
  addItem(s, 'tomate', 3);
  assertEqual(countItem(s, 'tomate'), 3);
  assertEqual(takeItem(s, 'tomate', 2), 2);
  assertEqual(countItem(s, 'tomate'), 1);
  assertEqual(takeItem(s, 'tomate', 5), 1, 'ne retire pas plus que le stock');
  assertEqual(countItem(s, 'tomate'), 0);
  assertEqual('tomate' in s.inventaire, false, 'un item sans lot disparaît de l\'objet');
  assertEqual(takeItem(s, 'tomate', 1), 0);
  assertEqual(addItem(s, 'inconnu', 3), 0);
  assertEqual(addItem(s, 'tomate', 0), 0);
  assertEqual(countItem(s, 'inconnu'), 0);
});

test('planter : consomme une graine, refus sans graine, sur parcelle occupée ou culture inconnue', () => {
  const s = garden();
  assertEqual(plant(s, 'potager-1', 'carotte').ok, true);
  assertEqual(countItem(s, 'graine_carotte'), 9);
  const p = findPlot(s, 'potager-1');
  assertEqual([p.culture, p.stade, p.arrose, p.montee], ['carotte', 0, false, false]);
  assertEqual(plant(s, 'potager-1', 'tomate').ok, false, 'parcelle occupée');
  assertEqual(countItem(s, 'graine_tomate'), 4);
  assertEqual(plant(s, 'potager-2', 'courgette').ok, false, 'pas de graines de courgette');
  assertEqual(findPlot(s, 'potager-2').culture, null);
  assertEqual(plant(s, 'potager-2', 'ble').ok, false, 'culture inconnue');
  assertEqual(plant(s, 'potager-99', 'carotte').ok, false, 'parcelle inconnue');
  // la patate sert de plant : 1 patate = 1 plant
  assertEqual(plant(s, 'potager-2', 'patate').ok, true);
  assertEqual(countItem(s, 'patate'), 5);
});

test('pousse : +1 stade seulement si la parcelle a été arrosée, puis arrosage remis à zéro', () => {
  const s = garden();
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  assertEqual(water(s, 'potager-1').ok, true);
  growAll(s);
  const [p1, p2] = [findPlot(s, 'potager-1'), findPlot(s, 'potager-2')];
  assertEqual([p1.stade, p1.arrose], [1, false]);
  assertEqual([p2.stade, p2.arrose], [0, false], 'non arrosée : elle stagne');
  growAll(s);
  assertEqual(p1.stade, 1, 'plus arrosée : elle stagne');
  for (let i = 0; i < 3; i++) {
    water(s, 'potager-1');
    growAll(s);
  }
  assertEqual(p1.stade, 4);
  assertEqual(isMature(p1), true);
  assertEqual(isMature(p2), false);
});

test('pousse par les nuits : Dormir fait pousser les parcelles arrosées', () => {
  const s = garden();
  plant(s, 'potager-1', 'tomate');
  water(s, 'potager-1');
  s.awakeMs = 30000;
  sleep(s);
  assertEqual(findPlot(s, 'potager-1').stade, 1);
  assertEqual(findPlot(s, 'potager-1').arrose, false);
  s.awakeMs = 30000;
  sleep(s); // pas arrosée cette journée
  assertEqual(findPlot(s, 'potager-1').stade, 1);
});

test('arrosage : une fois par nuit et par parcelle, et l\'eau du réservoir est consommée', () => {
  const s = garden();
  plant(s, 'potager-1', 'carotte'); // 2 L
  plant(s, 'potager-2', 'patate'); // 3 L
  const r = water(s, 'potager-1');
  assertEqual([r.ok, r.litres], [true, 2]);
  assertEqual(s.eauMl, ml(38));
  assertEqual(water(s, 'potager-1').ok, false, 'une seule fois par nuit');
  assertEqual(s.eauMl, ml(38), 'le refus ne consomme rien');
  assertEqual(water(s, 'potager-2').ok, true);
  assertEqual(s.eauMl, ml(35));
  assertEqual(water(s, 'potager-3').ok, false, 'parcelle vide');
  assertEqual(s.eauMl, ml(35));
  growAll(s);
  assertEqual(water(s, 'potager-1').ok, true, 'de nouveau possible après la nuit');
  assertEqual(s.eauMl, ml(33));
});

test('eau insuffisante : arrosage refusé, rien de modifié', () => {
  const s = garden();
  testAddSeeds(s);
  assertEqual(plant(s, 'potager-1', 'courgette').ok, true); // 4 L
  assertEqual(plant(s, 'potager-2', 'carotte').ok, true); // 2 L
  s.eauMl = ml(3);
  const r = water(s, 'potager-1');
  assertEqual(r.ok, false);
  assertEqual(s.eauMl, ml(3));
  assertEqual(findPlot(s, 'potager-1').arrose, false);
  growAll(s);
  assertEqual(findPlot(s, 'potager-1').stade, 0, 'sans eau, la plante ne pousse pas');
  assertEqual(water(s, 'potager-2').ok, true, 'assez pour une carotte');
  assertEqual(s.eauMl, ml(1));
  assertEqual(water(s, 'potager-2').ok, false, 'déjà arrosée');
  plant(s, 'potager-3', 'carotte');
  assertEqual(water(s, 'potager-3').ok, false, 'il reste 1 L pour 2 L nécessaires');
  s.eauMl = ml(2); // pile ce qu'il faut
  assertEqual(water(s, 'potager-3').ok, true);
});

test('arroser une parcelle mûre est refusé (l\'eau n\'est pas gaspillée)', () => {
  const s = garden();
  plantRipe(s, 'potager-1', 'carotte');
  assertEqual(water(s, 'potager-1').ok, false);
  assertEqual(s.eauMl, ml(40));
});

testBase('récolte manuelle : rendement × productivité selon la santé', () => {
  const s = garden();
  const cases = [[100, 10], [80, 10], [60, 8], [30, 5], [10, 3]]; // 10 × 1 / 1 / 0,8 / 0,5 / 0,25 (arrondi)
  cases.forEach(([sante, attendu], i) => {
    setHealth(s, sante);
    const id = `potager-${i + 1}`;
    plantRipe(s, id, 'carotte');
    const before = countItem(s, 'carotte');
    const r = harvest(s, id);
    assertEqual(r.ok, true);
    assertEqual(countItem(s, 'carotte') - before, attendu, `santé ${sante}`);
    assertEqual(r.items.carotte, attendu);
  });
});

testBase('récolte automatique : jamais pénalisée par la santé', () => {
  const s = garden();
  setHealth(s, 10);
  plantRipe(s, 'potager-1', 'carotte');
  harvest(s, 'potager-1', true);
  assertEqual(countItem(s, 'carotte'), 10);
  assertEqual(harvestYield(s, 'carotte'), 3);
  assertEqual(harvestYield(s, 'carotte', true), 10);
});

testBase('récolte : la parcelle est libérée, refus si pas mûre ou vide', () => {
  const s = garden();
  plant(s, 'potager-1', 'patate');
  assertEqual(harvest(s, 'potager-1').ok, false, 'pas mûre');
  assertEqual(countItem(s, 'patate'), 5);
  const p = findPlot(s, 'potager-1');
  p.stade = 6;
  const r = harvest(s, 'potager-1');
  assertEqual(r.ok, true);
  assertEqual(countItem(s, 'patate'), 13, '5 restantes + 8 récoltées, aucune graine en plus');
  assertEqual([p.culture, p.stade, p.arrose, p.montee], [null, 0, false, false]);
  assertEqual(harvest(s, 'potager-1').ok, false, 'parcelle vide');
  assertEqual(plant(s, 'potager-1', 'carotte').ok, true, 'on peut replanter');
});

test('montée en graine : carotte seulement, mûre seulement, 2 stades de plus', () => {
  const s = garden();
  plant(s, 'potager-1', 'carotte');
  assertEqual(toggleBolting(s, 'potager-1').ok, false, 'pas encore mûre');
  const p = findPlot(s, 'potager-1');
  p.stade = 4;
  assertEqual(toggleBolting(s, 'potager-1').ok, true);
  assertEqual(p.montee, true);
  assertEqual(maxStage(p), 6);
  assertEqual(isMature(p), false, 'elle doit rester 2 stades de plus');
  assertEqual(harvest(s, 'potager-1').ok, false);
  for (let i = 0; i < 2; i++) {
    assertEqual(water(s, 'potager-1').ok, true);
    growAll(s);
  }
  assertEqual(p.stade, 6);
  assertEqual(isMature(p), true);
  water(s, 'potager-1');
  growAll(s);
  assertEqual(p.stade, 6, 'pas au-delà du dernier stade');
  // autres cultures et parcelle vide : refusé
  plantRipe(s, 'potager-2', 'patate');
  assertEqual(toggleBolting(s, 'potager-2').ok, false);
  assertEqual(toggleBolting(s, 'potager-3').ok, false);
  // rebasculer annule : la carotte est de nouveau mûre au stade 4
  const q = plantRipe(s, 'potager-4', 'carotte');
  toggleBolting(s, 'potager-4');
  assertEqual(isMature(q), false);
  toggleBolting(s, 'potager-4');
  assertEqual([q.montee, isMature(q)], [false, true]);
});

test('graines rendues : montée en graine = 6 graines et aucune carotte', () => {
  const s = garden();
  plantRipe(s, 'potager-1', 'carotte');
  toggleBolting(s, 'potager-1');
  findPlot(s, 'potager-1').stade = 6;
  const r = harvest(s, 'potager-1');
  assertEqual(r.items, { graine_carotte: 6 });
  assertEqual(countItem(s, 'graine_carotte'), 15, '10 − 1 plantée + 6');
  assertEqual(countItem(s, 'carotte'), 0);
  // la santé ne réduit pas les graines
  setHealth(s, 10);
  plantRipe(s, 'potager-2', 'carotte');
  toggleBolting(s, 'potager-2');
  findPlot(s, 'potager-2').stade = 6;
  assertEqual(harvest(s, 'potager-2').items, { graine_carotte: 6 });
  // récolte normale de carotte : aucune graine
  plantRipe(s, 'potager-3', 'carotte');
  const before = countItem(s, 'graine_carotte');
  harvest(s, 'potager-3');
  assertEqual(countItem(s, 'graine_carotte'), before);
});

testBase('graines rendues : tomate, courgette et aubergine rendent 1 à 2 graines, reproductibles', () => {
  function run(seed, culture) {
    const s = createInitialState(seed);
    setHealth(s, 100);
    const gains = [];
    const seedName = seedItem(culture);
    addItem(s, seedName, 40);
    for (let i = 0; i < 30; i++) {
      plant(s, 'potager-1', culture);
      const p = findPlot(s, 'potager-1');
      p.stade = maxStage(p);
      const before = countItem(s, seedName);
      const r = harvest(s, 'potager-1');
      gains.push(countItem(s, seedName) - before);
      assertEqual(r.items[culture], DATA.crops[culture].rendement);
    }
    return gains;
  }
  for (const culture of ['tomate', 'courgette', 'aubergine']) {
    const a = run(7, culture);
    assert(a.every((g) => g === 1 || g === 2), `${culture} : 1 ou 2 graines, obtenu ${a}`);
    assert(a.includes(1) && a.includes(2), `${culture} : les deux valeurs sortent`);
    assertEqual(run(7, culture), a, 'même graine, même suite');
  }
});

test('aléatoire à graine : nextRandom suit mulberry32 et vit dans l\'état', () => {
  const s = createInitialState(1234);
  const ref = mulberry32(1234);
  for (let i = 0; i < 5; i++) assertEqual(nextRandom(s), ref());
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(nextRandom(copy), nextRandom(s), 'l\'état sérialisé reprend la même suite');
  const t = createInitialState(5);
  for (let i = 0; i < 200; i++) {
    const v = randomInt(t, 1, 2);
    assert(v === 1 || v === 2);
  }
});

test('Zone de culture : 6 / 12 / 18 / 24 / 30 parcelles, coûts 200 / 480 / 1 050 / 2 300', () => {
  assertEqual([DATA.POTAGER.LIEU, DATA.POTAGER.NOM, DATA.POTAGER.ICONE], ['potager', 'Zone de culture', '🌱']);
  assertEqual(DATA.POTAGER.PARCELLES, [6, 12, 18, 24, 30]);
  assertEqual(DATA.POTAGER.COUT, [0, 200, 480, 1050, 2300]);
  assertEqual(DATA.CHAMP, undefined, 'le Champ n\'existe plus comme bâtiment');
  const s = garden();
  s.pieces = 10;
  assertEqual(upgradePotager(s).ok, false, 'pas assez de pièces');
  assertEqual(s.potager.niveau, 1);
  assertEqual(s.pieces, 10);
  s.pieces = 5000;
  plant(s, 'potager-1', 'carotte');
  const costs = [];
  const counts = [];
  for (let i = 0; i < 4; i++) {
    costs.push(upgradePotager(s).cost);
    counts.push(s.potager.parcelles.length);
  }
  assertEqual(costs, [200, 480, 1050, 2300]);
  assertEqual(counts, [12, 18, 24, 30]);
  assertEqual(s.potager.niveau, 5);
  assertEqual(s.pieces, 5000 - 4030);
  assertEqual(upgradePotager(s).ok, false, 'niveau maximum');
  assertEqual(findPlot(s, 'potager-1').culture, 'carotte', 'les parcelles existantes sont conservées');
  assertEqual(new Set(s.potager.parcelles.map((p) => p.id)).size, 30, 'ids uniques');
  assertEqual(s.potager.parcelles.map((p) => p.lieu).every((l) => l === 'potager'), true);
  assertEqual(s.potager.parcelles[29].id, 'potager-30');
});

test('famille : besoin = 50 par adulte + 25 par enfant = 150', () => {
  const s = createInitialState(1);
  assertEqual(familyNeed(s), 150);
  s.famille.membres.pop();
  assertEqual(familyNeed(s), 125);
  assertEqual(planMeal(createInitialState(1)).besoin, 150);
});

test('repas : ce qui périme le plus tôt, conserves en dernier, jusqu\'à couvrir le besoin', () => {
  const s = garden();
  setInv(s, { conserve: 100, carotte: 10, patate: 2, courgette: 3 });
  s.famille.reserve = {};
  const plan = planMeal(s);
  // courgette 5 nuits, carotte 6, patate 7, conserve : ne périme pas
  assertEqual(Object.keys(plan.mange), ['courgette', 'carotte', 'patate', 'conserve']);
  // Lot 11 (nutrition) : énergies × 1,25 (courgette 10, carotte 8, patate 19,
  // conserve 25) ; 1 seule conserve suffit désormais à couvrir le reliquat.
  assertEqual(plan.mange, { courgette: 3, carotte: 10, patate: 2, conserve: 1 });
  assertEqual(plan.energie, 30 + 80 + 38 + 25);
  assertEqual(plan.couverture, 100);
  // planMeal ne modifie rien
  assertEqual(countItem(s, 'conserve'), 100);
  feedFamily(s);
  assertEqual(inventoryCounts(s), { conserve: 99 });
  // il s'arrête dès que le besoin est couvert : plus de réserve de semences, les
  // 6 patates de départ (7 nuits) passent avant les conserves, puis 2 conserves
  const t = garden();
  feedFamily(t);
  assertEqual(countItem(t, 'conserve'), 158);
  assertEqual(countItem(t, 'patate'), 0);
});

test('repas : les non-comestibles (graines) ne sont jamais mangés', () => {
  const s = garden();
  setInv(s, { graine_carotte: 50, graine_tomate: 50 });
  const plan = planMeal(s);
  assertEqual(plan.mange, {});
  assertEqual(plan.energie, 0);
  assertEqual(plan.couverture, 0);
});

test('réserve de semences (moteur) : la famille ne mange jamais la réserve', () => {
  const s = garden();
  assertEqual(s.famille.reserve, {}, 'plus de réserve au départ : la réserve n\'est plus réglable dans l\'Inventaire');
  setSeedReserve(s, 'patate', 6);
  // Lot 11 (nutrition) : carotte à 8 d'énergie ne suffit plus à couvrir le
  // besoin (150) à elle seule avec 20 unités ; 15 carottes + 2 patates y suffisent.
  setInv(s, { patate: 10, carotte: 15 });
  const plan = planMeal(s);
  assertEqual(plan.mange, { carotte: 15, patate: 2 });
  feedFamily(s);
  assertEqual(countItem(s, 'patate'), 8, 'la réserve (6 patates) reste intacte, seul le surplus est mangé');
  assertEqual(countItem(s, 'carotte'), 0);
  // réserve à 0 : tout peut être mangé (8 patates à 19 d'énergie couvrent le besoin de 150)
  const t = garden();
  setInv(t, { patate: 8 });
  assertEqual(setSeedReserve(t, 'patate', 0).ok, true);
  assertEqual(planMeal(t).mange, { patate: 8 });
  // réserve supérieure au stock : rien n'est mangé
  assertEqual(setSeedReserve(t, 'patate', 25).ok, true);
  assertEqual(planMeal(t).mange, {});
  // valeurs invalides refusées
  assertEqual(setSeedReserve(t, 'inconnu', 3).ok, false);
  assertEqual(setSeedReserve(t, 'patate', 'abc').ok, false);
  assertEqual(t.famille.reserve.patate, 25);
  assertEqual(setSeedReserve(t, 'patate', -4).reserve, 0, 'jamais négative');
  // Lot « 10 cultures » : ail et riz se replantent aussi eux-mêmes (mode
  // 'plant', comme la patate) et sont comestibles : ils rejoignent la réserve.
  assertEqual(reservableItems(), ['patate', 'ail', 'riz']);
});

test('santé : +5 à 100 %, −5 de 75 à 99 %, −10 de 50 à 74 %, −20 sous 50 %', () => {
  // Lot 11 (nutrition) : besoin 150, conserve à 25 d'énergie (6 conserves = 150
  // couvrent 100 %, contre 8 avant l'augmentation de +25 %).
  const cases = [
    [{ conserve: 6 }, 5],
    [{ conserve: 9 }, 5],
    [{ conserve: 5 }, -5],
    [{ conserve: 4, carotte: 2 }, -5],
    [{ conserve: 3 }, -10],
    [{ conserve: 4 }, -10],
    [{ conserve: 2 }, -20],
    [{ conserve: 0 }, -20],
  ];
  for (const [quantities, delta] of cases) {
    const s = garden();
    setHealth(s, 60);
    setInv(s, quantities);
    feedFamily(s);
    assertEqual(s.famille.membres[0].sante, 60 + delta, JSON.stringify(quantities));
    assertEqual(s.famille.membres[3].sante, 60 + delta);
  }
  assertEqual([100, 99, 75, 74, 50, 49].map(healthDelta), [5, -5, -5, -10, -10, -20]);
});

test('santé : bornée entre 0 et 100, et un membre à 0 devient malade', () => {
  const s = garden();
  setHealth(s, 98);
  feedFamily(s);
  assertEqual(s.famille.membres.every((m) => m.sante === 100), true);
  const t = garden();
  setHealth(t, 10);
  t.famille.membres[0].sante = 25;
  setInv(t, {});
  const nouveaux = feedFamily(t) && t.nuit.nouveauxMalades;
  assertEqual(t.famille.membres[0].sante, 5);
  assertEqual(t.famille.membres[0].malade, false);
  assertEqual(t.famille.membres[1].sante, 0);
  assertEqual(t.famille.membres[1].malade, true);
  assertEqual(nouveaux, ['adulte-2', 'enfant-1', 'enfant-2'], 'des identifiants, jamais des prénoms');
});

test('productivité : 100 % à 80 et plus, 80 % de 50 à 79, 50 % de 20 à 49, 25 % sous 20', () => {
  const s = garden();
  const cases = [[100, 100], [80, 100], [79, 80], [50, 80], [49, 50], [20, 50], [19, 25], [0, 25]];
  for (const [sante, pct] of cases) {
    setHealth(s, sante);
    assertEqual(productivity(s), pct, `santé ${sante}`);
  }
  assertEqual(formatPercent(80), '80\u00a0%');
});

test('productivité : un membre malade compte pour 0 dans la moyenne', () => {
  const s = garden();
  setHealth(s, 100);
  const m = s.famille.membres[0];
  m.sante = 30; // en convalescence : sa santé réelle ne compte pas
  m.malade = true;
  assertEqual(averageHealth(s), 75);
  assertEqual(productivity(s), 80);
  m.malade = false;
  assertEqual(averageHealth(s), 82, 'moyenne entière, arrondie vers le bas : 82,5 → 82');
  assertEqual(productivity(s), 100, 'sans la maladie, sa santé de 30 compterait : (300 + 30) ÷ 4 = 82');
});

test('soins : coût 20 × 1,5^n (20, 30, 45, 68), santé remise à 50', () => {
  const s = garden();
  s.pieces = 1000;
  const costs = [];
  for (let i = 0; i < 4; i++) {
    const m = s.famille.membres[i];
    m.sante = 0;
    m.malade = true;
    assertEqual(careCost(s), [20, 30, 45, 68][i]);
    const r = heal(s, m.id);
    assertEqual(r.ok, true);
    costs.push(r.cost);
    assertEqual([m.sante, m.malade], [50, false]);
  }
  assertEqual(costs, [20, 30, 45, 68]);
  assertEqual(s.famille.soinsPayes, 4);
  assertEqual(s.pieces, 1000 - 163);
  assertEqual(careCost(s), 102, '20 × 1,5⁴ = 101,25, arrondi à 102');
});

test('soins : refusés sans pièces, sur un membre non malade ou inconnu', () => {
  const s = garden();
  const m = s.famille.membres[0];
  assertEqual(heal(s, m.id).ok, false, 'pas malade');
  m.sante = 0;
  m.malade = true;
  s.pieces = 19;
  assertEqual(heal(s, m.id).ok, false, 'pas assez de pièces');
  assertEqual([m.sante, m.malade, s.pieces, s.famille.soinsPayes], [0, true, 19, 0]);
  assertEqual(heal(s, 'inconnu').ok, false);
  s.pieces = 20;
  assertEqual(heal(s, m.id).ok, true);
  assertEqual(s.pieces, 0);
});

/* ---------- version 1.1 : prénom, sexe et couleur de peau de chaque membre ---------- */

test('profil : au départ, chaque membre porte son rôle comme prénom, le sexe de DATA et la teinte jaune', () => {
  const P = DATA.FAMILY.PROFIL;
  assertEqual([P.PRENOM_MAX, P.GENRES, P.TEINTS.length], [12, ['f', 'm'], 6]);
  assertEqual(P.TEINTS, ['', '🏻', '🏼', '🏽', '🏾', '🏿'], 'jaune par défaut, puis les cinq teintes des emojis');
  assertEqual(P.PORTRAITS, { adulte: { f: '👩', m: '👨' }, enfant: { f: '👧', m: '👦' } });
  const s = createInitialState(1);
  assertEqual(s.famille.membres.map((m) => [m.id, m.nom, m.prenom, m.genre, m.teint]), [
    ['adulte-1', 'Adulte 1', 'Adulte 1', 'f', 0],
    ['adulte-2', 'Adulte 2', 'Adulte 2', 'm', 0],
    ['enfant-1', 'Enfant 1', 'Enfant 1', 'm', 0],
    ['enfant-2', 'Enfant 2', 'Enfant 2', 'f', 0],
  ]);
  assertEqual(s.famille.membres.map((m) => memberName(s, m.id)), ['Adulte 1', 'Adulte 2', 'Enfant 1', 'Enfant 2']);
  assertEqual(s.famille.membres.map((m) => memberPortrait(s, m.id)), ['👩', '👨', '👦', '👧']);
  assertEqual([memberName(s, 'inconnu'), memberPortrait(s, 'inconnu')], ['', '']);
});

test('portraitEmoji : 👩 / 👨 pour un adulte, 👧 / 👦 pour un enfant, avec la teinte choisie', () => {
  assertEqual([portraitEmoji(false, 'f', 0), portraitEmoji(false, 'm', 0), portraitEmoji(true, 'f', 0), portraitEmoji(true, 'm', 0)], ['👩', '👨', '👧', '👦']);
  assertEqual([1, 2, 3, 4, 5].map((t) => portraitEmoji(false, 'f', t)), ['👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿']);
  assertEqual([portraitEmoji(false, 'm', 3), portraitEmoji(true, 'f', 5), portraitEmoji(true, 'm', 1)], ['👨🏽', '👧🏿', '👦🏻']);
  // des valeurs inconnues retombent sur le premier sexe et le jaune
  assertEqual([portraitEmoji(false, 'x', 0), portraitEmoji(true, undefined, 9), portraitEmoji(false, 'm', -1)], ['👩', '👧', '👨']);
});

test('setMemberProfile : change le prénom, le sexe et la teinte, et le portrait suit', () => {
  const s = createInitialState(1);
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'Camille', genre: 'm', teint: 3 }), { ok: true, id: 'adulte-1' });
  const m = findMember(s, 'adulte-1');
  assertEqual([m.prenom, m.genre, m.teint, m.nom], ['Camille', 'm', 3, 'Adulte 1'], 'le rôle ne change pas');
  assertEqual([memberName(s, 'adulte-1'), memberPortrait(s, 'adulte-1')], ['Camille', '👨🏽']);
  // un champ absent garde sa valeur
  assert(setMemberProfile(s, 'adulte-1', { teint: 0 }).ok);
  assertEqual([m.prenom, m.genre, m.teint], ['Camille', 'm', 0]);
  assert(setMemberProfile(s, 'enfant-2', { prenom: 'Zoé' }).ok);
  assertEqual([memberName(s, 'enfant-2'), memberPortrait(s, 'enfant-2')], ['Zoé', '👧']);
  assert(setMemberProfile(s, 'enfant-2', { genre: 'm', teint: 5 }).ok);
  assertEqual(memberPortrait(s, 'enfant-2'), '👦🏿');
  // les autres membres ne bougent pas, la santé non plus
  assertEqual([memberName(s, 'adulte-2'), memberPortrait(s, 'adulte-2'), m.sante, m.malade], ['Adulte 2', '👨', 100, false]);
});

test('setMemberProfile : prénom nettoyé, de 1 à 12 caractères', () => {
  const s = createInitialState(1);
  const name = (p) => { const r = setMemberProfile(s, 'adulte-1', { prenom: p }); return r.ok ? findMember(s, 'adulte-1').prenom : r.error; };
  assertEqual(name('  Léa  '), 'Léa', 'espaces retirés au début et à la fin');
  assertEqual(name('Jean\n  Luc'), 'Jean Luc', 'retours à la ligne et espaces répétés : une seule espace');
  assertEqual(name('A'), 'A', '1 caractère suffit');
  assertEqual(name('Abcdefghijkl'), 'Abcdefghijkl', '12 caractères : accepté');
  assertEqual(name('   Abcdefghijkl   '), 'Abcdefghijkl', 'les espaces autour ne comptent pas');
  assertEqual(name('Éléonore-Zoé'), 'Éléonore-Zoé', '12 caractères accentués comptent pour 12');
  assertEqual(name('😀😀😀😀😀😀😀😀😀😀😀😀'), '😀😀😀😀😀😀😀😀😀😀😀😀', 'un emoji compte pour un caractère');
  assertEqual(name('Abcdefghijklm'), 'Le prénom doit faire 12 caractères au plus.', '13 : refusé');
  assertEqual(name(''), 'Écris un prénom.');
  assertEqual(name('   \n\t '), 'Écris un prénom.', 'que des espaces : refusé');
  for (const bad of [null, 42, {}, ['Léa'], true]) assertEqual(setMemberProfile(s, 'adulte-1', { prenom: bad }).ok, false, JSON.stringify(bad));
  assertEqual(findMember(s, 'adulte-1').prenom, '😀😀😀😀😀😀😀😀😀😀😀😀', 'un refus ne change rien');
  assertEqual([validFirstName('Léa'), validFirstName(''), validFirstName('x'.repeat(13)), validFirstName(undefined)], [true, false, false, false]);
  assertEqual([cleanFirstName('  a  b '), cleanFirstName(7)], ['a b', '']);
});

test('setMemberProfile : sexe, teinte et membre vérifiés ; rien ne change si une seule valeur est refusée', () => {
  const s = createInitialState(1);
  const avant = JSON.stringify(s.famille);
  for (const genre of ['x', '', 'F', 1, null]) assertEqual(setMemberProfile(s, 'adulte-1', { genre }).ok, false, `genre ${JSON.stringify(genre)}`);
  for (const teint of [-1, 6, 1.5, '2', null, NaN]) assertEqual(setMemberProfile(s, 'adulte-1', { teint }).ok, false, `teinte ${JSON.stringify(teint)}`);
  assertEqual(setMemberProfile(s, 'adulte-9', { prenom: 'Léa' }), { ok: false, error: 'Membre introuvable.' });
  assertEqual(setMemberProfile(s, 'adulte-1', null).ok, false);
  assertEqual(setMemberProfile(s, 'adulte-1', 'Léa').ok, false);
  // tout ou rien : un bon prénom avec une mauvaise teinte ne change pas le prénom
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'Léa', genre: 'm', teint: 12 }).ok, false);
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'x'.repeat(13), genre: 'm' }).ok, false);
  assertEqual(JSON.stringify(s.famille), avant, 'la famille est intacte');
  assertEqual(setMemberProfile(s, 'adulte-1', {}).ok, true, 'un profil vide ne change rien et n\'est pas une erreur');
  assertEqual(JSON.stringify(s.famille), avant);
  for (const teint of [0, 1, 2, 3, 4, 5]) assertEqual(setMemberProfile(s, 'enfant-1', { teint }).ok, true, `teinte ${teint}`);
});

test('escapeHtml : un prénom comme <b> s\'affiche comme du texte', () => {
  assertEqual(escapeHtml('<b>'), '&lt;b&gt;');
  assertEqual(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assertEqual(escapeHtml('Tom & "Lou" l\'été'), 'Tom &amp; &quot;Lou&quot; l&#39;été');
  assertEqual([escapeHtml('Zoé 🌻'), escapeHtml(''), escapeHtml(null), escapeHtml(undefined), escapeHtml(12)], ['Zoé 🌻', '', '', '', '12']);
  const s = createInitialState(1);
  assert(setMemberProfile(s, 'enfant-1', { prenom: '<b>Lou</b>' }).ok, 'ces caractères sont permis dans un prénom');
  assertEqual(memberName(s, 'enfant-1'), '<b>Lou</b>', 'le moteur garde le texte tel quel');
  const html = escapeHtml(memberName(s, 'enfant-1'));
  assertEqual(html, '&lt;b&gt;Lou&lt;/b&gt;');
  assert(!/[<>"']/.test(html), 'plus aucun caractère spécial une fois échappé');
});

test('profil : le prénom sert dans les messages, mais jamais dans les comptes rendus ni les alertes', () => {
  const s = garden();
  const prenoms = ['Zélie', 'Balthazar', 'Capucine', 'Ferdinand'];
  s.famille.membres.forEach((m, i) => assert(setMemberProfile(s, m.id, { prenom: prenoms[i], teint: i + 1 }).ok));
  assertEqual(heal(s, 'adulte-1'), { ok: false, error: 'Zélie n\'est pas malade.' });
  // Toute la famille tombe malade : le compte rendu de la nuit porte des identifiants.
  setHealth(s, 5);
  setInv(s, {});
  s.awakeMs = 30000;
  const report = sleep(s);
  assertEqual(report.nouveauxMalades, ['adulte-1', 'adulte-2', 'enfant-1', 'enfant-2']);
  assertEqual(report.nouveauxMalades.map((id) => memberName(s, id)), prenoms, 'l\'interface retrouve les prénoms au moment d\'afficher');
  // Aucun prénom dans ce que le moteur calcule pour les rapports, les alertes et la simulation.
  const sorties = JSON.stringify([report, s.nuit, getNotifications(s), alertSnapshot(s), alertEvents(alertSnapshot(createInitialState(1)), alertSnapshot(s)), buildMorningReport(s), offlineReport(s, offlineSnapshot(s), 0, 0), simulateFromCopy(s, 'minimal', 2)]);
  for (const p of prenoms) assertEqual(sorties.includes(p), false, `${p} ne sort pas du profil`);
  // Ils ne vivent que dans la sauvegarde, qui les garde à l'aller-retour.
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assertEqual(copy.famille.membres.map((m) => memberName(copy, m.id)), prenoms);
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: copy }), s, 'recharger ne touche pas aux profils');
  // Une nouvelle partie repart d'une famille neuve.
  assertEqual(newGameFrom(s, 4).famille.membres.map((m) => m.prenom), ['Adulte 1', 'Adulte 2', 'Enfant 1', 'Enfant 2']);
});

test('profil : un prénom abîmé dans une sauvegarde retombe sur le rôle à l\'affichage', () => {
  const s = createInitialState(1);
  for (const bad of [undefined, null, '', '   ', 42, 'x'.repeat(40)]) {
    findMember(s, 'adulte-2').prenom = bad;
    assertEqual(memberName(s, 'adulte-2'), 'Adulte 2', JSON.stringify(bad));
  }
  findMember(s, 'adulte-2').genre = 'z';
  findMember(s, 'adulte-2').teint = 99;
  assertEqual(memberPortrait(s, 'adulte-2'), '👩', 'sexe et teinte inconnus : premier sexe, jaune');
});

test('récupération sans soin : +2 par nuit à 100 %, guérison à 50, pas de gain sinon', () => {
  const s = garden();
  const m = s.famille.membres[0];
  m.sante = 0;
  m.malade = true;
  setInv(s, { conserve: 8 });
  feedFamily(s);
  assertEqual([m.sante, m.malade], [2, true], '+2 au lieu de +5');
  assertEqual(s.famille.membres[1].sante, 100);
  // une nuit mal nourrie : pas de récupération, variation normale (bornée à 0)
  setInv(s, { conserve: 5 });
  feedFamily(s);
  assertEqual([m.sante, m.malade], [0, true]);
  // 24 nuits bien nourries : 48 points, encore malade ; la 25e → 50 : guéri
  for (let i = 0; i < 24; i++) {
    setInv(s, { conserve: 8 });
    feedFamily(s);
  }
  assertEqual([m.sante, m.malade], [48, true]);
  setInv(s, { conserve: 8 });
  feedFamily(s);
  assertEqual([m.sante, m.malade], [50, false]);
  setInv(s, { conserve: 8 });
  feedFamily(s);
  assertEqual(m.sante, 55, 'guéri : la règle normale (+5) reprend');
  assertEqual(s.famille.soinsPayes, 0, 'aucun soin payé');
});

test('ordre des étapes nocturnes : repas et santé, automatisations, pousse, ponte, paille des moutons et des vaches, préparations, puis péremption en dernier', () => {
  // Arbre v2 : la pluie avant les automatisations, l'entretien automatique
  // après les préparations et avant le bloc nocturne du frigo.
  assertEqual(NIGHT_STEPS, [feedFamily, rainNight, autoTasks, growAll, layEggs, feedLivestock, growOrchard, finishPreparations, autoMaintain, nightPower, fridgeNight, fillSilo, spoil]);
  assert(NIGHT_STEPS[NIGHT_STEPS.length - 1] === spoil, 'la péremption est toujours la dernière étape');
});

test('Dormir : repas, santé, pousse et rapport de réveil', () => {
  const s = garden();
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  findPlot(s, 'potager-1').stade = 3;
  water(s, 'potager-1');
  water(s, 'potager-2');
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(s.day, 2);
  // Plus de réserve de semences : les 6 patates de départ (19 d'énergie)
  // passent avant les conserves, puis 2 conserves (25) couvrent le reste.
  assertEqual(countItem(s, 'conserve'), 158);
  assertEqual(findPlot(s, 'potager-1').stade, 4);
  assertEqual(findPlot(s, 'potager-2').stade, 1);
  assertEqual(r.besoin, 150);
  assertEqual(r.couverture, 100);
  assertEqual(r.mange, { patate: 6, conserve: 2 });
  assertEqual([r.santeAvant, r.santeApres], [100, 100]);
  assertEqual(r.nouveauxMalades, []);
  assertEqual(r.pretes, [{ culture: 'carotte', nombre: 1, montee: false }]);
  // une nuit sans rien à manger : −20 pour tous, et l'écran de réveil le dit
  const t = garden();
  setInv(t, {});
  t.awakeMs = 30000;
  const r2 = sleep(t);
  assertEqual([r2.energieMangee, r2.couverture, r2.santeAvant, r2.santeApres], [0, 0, 100, 80]);
  // et le compte rendu de la nuit repart de zéro à la nuit suivante
  t.awakeMs = 30000;
  const r3 = sleep(t);
  assertEqual([r3.santeAvant, r3.santeApres], [80, 60]);
});

test('Dormir avec la réserve de semences : 10 nuits de conserves, patates jamais mangées', () => {
  const s = garden();
  setSeedReserve(s, 'patate', 6);
  setInv(s, { conserve: 60, patate: 6 }); // 6 conserves/nuit (besoin 150, 25 d'énergie chacune) × 10 nuits = 60
  for (let i = 0; i < 6; i++) {
    s.awakeMs = 30000;
    sleep(s);
  }
  // la réserve n'est jamais mangée ; les patates n'ont que vieilli (7 nuits au départ)
  assertEqual(countItem(s, 'patate'), 6);
  assertEqual(lotsOf(s, 'patate')[0].nightsLeft, 1);
  for (let i = 0; i < 4; i++) {
    s.awakeMs = 30000;
    sleep(s);
  }
  assertEqual(countItem(s, 'conserve'), 0);
  assertEqual(s.famille.membres.every((m) => m.sante === 100), true);
  s.awakeMs = 30000;
  const r = sleep(s); // 11e nuit : plus rien à manger hors réserve
  assertEqual(r.energieMangee, 0);
  assertEqual(s.famille.membres[0].sante, 80);
});

test('mode test Lot 2 : graines, maturité, santé à 0', () => {
  const s = garden();
  testAddSeeds(s);
  assertEqual(countItem(s, 'graine_carotte'), 20);
  assertEqual(countItem(s, 'graine_tomate'), 14);
  assertEqual(countItem(s, 'graine_courgette'), 10);
  assertEqual(countItem(s, 'graine_aubergine'), 10);
  assertEqual(countItem(s, 'patate'), 16);
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'aubergine');
  plantRipe(s, 'potager-3', 'carotte');
  toggleBolting(s, 'potager-3');
  testRipenAll(s);
  assertEqual(readyCrops(s).map((c) => [c.culture, c.nombre, c.montee]), [['carotte', 1, false], ['aubergine', 1, false], ['carotte', 1, true]]);
  assertEqual(s.potager.parcelles.filter((p) => !p.culture).every((p) => p.stade === 0), true);
  testSetHealthZero(s);
  assertEqual(s.famille.membres.every((m) => m.sante === 0 && m.malade), true);
  assertEqual(productivity(s), 25);
});

test('migration v2 (Lot 1) → version courante : garde la partie, ajoute le potager, la famille et l\'inventaire', () => {
  const v2 = {
    version: 2, day: 5, awakeSeconds: 3, pieces: 120, rngSeed: 9, stats: {},
    unlockedTabs: ['ferme', 'inventaire', 'comptoir'], ...startFarm(),
  };
  delete v2.eauMl;
  v2.eau = 12; // ancienne sauvegarde : litres décimaux
  const m = migrate({ v: 2, t: 0, s: v2 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces, m.eauMl], [5, 120, ml(12)]);
  assertEqual(m.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir']);
  assertEqual(inventoryCounts(m), { conserve: 160, graine_carotte: 10, patate: 6, graine_tomate: 4 });
  assertEqual(m.potager.parcelles.length, 6);
  assertEqual(m.famille.membres.length, 4);
  assertEqual(m.famille.reserve, {});
  assertEqual(m.panneaux.length, 1);
  m.awakeMs = 30000;
  assert(sleep(m) !== null, 'l\'état migré peut dormir');
  assertEqual(countItem(m, 'conserve'), 158, '6 patates puis 2 conserves');
  // une sauvegarde déjà à jour n'est pas touchée
  const s = garden();
  s.pieces = 77;
  setInv(s, { conserve: 3 });
  const same = migrate({ v: STATE_VERSION, t: 0, s });
  assertEqual([same.pieces, countItem(same, 'conserve')], [77, 3]);
});

test('sérialisation JSON aller-retour avec potager, famille et nuit', () => {
  const s = createInitialState(11);
  testAddSeeds(s);
  s.eauMl = ml(40);
  plant(s, 'potager-1', 'tomate');
  water(s, 'potager-1');
  s.awakeMs = 30000;
  sleep(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  plantRipe(copy, 'potager-2', 'courgette');
  plantRipe(s, 'potager-2', 'courgette');
  harvest(copy, 'potager-2');
  harvest(s, 'potager-2');
  assertEqual(copy, s, 'même suite d\'actions, même état (aléatoire compris)');
});

/* ---------- Lot 3 : inventaire par lots, péremption, Marché ---------- */

// Compte les unités d'un item selon l'origine de leurs lots.
function countByOrigin(s, item, origin) {
  return lotsOf(s, item).filter((l) => l.origin === origin).reduce((t, l) => t + l.qty, 0);
}

test('DATA Lot 3 : conservation en nuits', () => {
  const c = DATA.CONSERVATION;
  assertEqual([c.viande_mouton, c.tomate, c.courgette, c.aubergine], [5, 5, 5, 5]);
  assertEqual([c.oeuf, c.carotte, DATA.CONSERVATION_CATEGORIE.plat], [6, 6, 6]);
  assertEqual([c.pomme, c.poire, c.pain, c.patate], [7, 7, 7, 7]);
  // Anciennes viandes : le bœuf se garde comme le mouton ;
  // la volaille et le lait sont plus fragiles (comme épinard/fraise, 4 nuits).
  assertEqual([c.viande_boeuf, c.viande_volaille, c.lait], [5, 4, 4]);
  // ce qui est absent des tables ne périme pas
  for (const k of ['conserve', 'graine_carotte', 'graine_tomate', 'graine_courgette', 'graine_aubergine']) {
    assertEqual(shelfLife(k), null, k);
    assertEqual(isPerishable(k), false, k);
  }
  for (const k of ['farine', 'huile', 'laine']) assertEqual(shelfLife(k), null, k);
  assertEqual(shelfLife('ble'), 10, 'le blé de l\'inventaire périme (celui du Silo, jamais)');
  assertEqual([shelfLife('carotte'), shelfLife('patate'), shelfLife('tomate')], [6, 7, 5]);
});

test('DATA Lot 3 : coefficients du Marché', () => {
  assertEqual(DATA.MARCHE.PLANCHER, { defaut: 120, graine: 200 });
  assertEqual(DATA.MARCHE.PAS, 10);
  assertEqual(marketFloor('carotte'), 120);
  assertEqual(marketFloor('conserve'), 120);
  assertEqual(marketFloor('graine_carotte'), 200);
  assertEqual(createInitialState(1).marche, {});
});

test('lots : un ajout crée un lot à conservation pleine et d\'origine « produit »', () => {
  const s = garden();
  addItem(s, 'carotte', 6);
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 6, nightsLeft: 6, origin: 'produit' }]);
  addItem(s, 'carotte', 2); // même fraîcheur, même origine : le lot grossit
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 8, nightsLeft: 6, origin: 'produit' }]);
  addItem(s, 'graine_tomate', 3);
  assertEqual(lotsOf(s, 'graine_tomate')[0].nightsLeft, null, 'une graine ne périme pas');
  assertEqual(countItem(s, 'carotte'), 8);
});

test('lots : les conserves et le kit de départ, origine et conservation', () => {
  const s = createInitialState(1);
  assertEqual(lotsOf(s, 'conserve'), [{ qty: 160, nightsLeft: null, origin: 'acheté' }], 'les conserves comptent comme achetées');
  assertEqual(lotsOf(s, 'patate'), [{ qty: 6, nightsLeft: 7, origin: 'produit' }]);
  assertEqual(lotsOf(s, 'graine_carotte'), [{ qty: 10, nightsLeft: null, origin: 'produit' }]);
  addItem(s, 'conserve', 5);
  assertEqual(countByOrigin(s, 'conserve', 'acheté'), 165);
});

test('retrait : toujours dans le lot le plus ancien', () => {
  const s = garden();
  setInv(s, {});
  addItem(s, 'carotte', 5);
  spoil(s);
  spoil(s); // ce lot n'a plus que 4 nuits
  addItem(s, 'carotte', 3); // lot frais : 6 nuits
  assertEqual(lotsOf(s, 'carotte'), [
    { qty: 5, nightsLeft: 4, origin: 'produit' },
    { qty: 3, nightsLeft: 6, origin: 'produit' },
  ]);
  assertEqual(takeItem(s, 'carotte', 6), 6);
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 2, nightsLeft: 6, origin: 'produit' }], 'le lot ancien part en entier, puis 1 du frais');
  assertEqual(takeItem(s, 'carotte', 1), 1);
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 1, nightsLeft: 6, origin: 'produit' }]);
  assertEqual(takeItem(s, 'carotte', 9), 1);
  assertEqual('carotte' in s.inventaire, false);
});

test('retrait : un lot frais ajouté après un lot ancien reste derrière lui', () => {
  const s = garden();
  setInv(s, {});
  addItem(s, 'tomate', 2);
  spoil(s);
  addItem(s, 'tomate', 4);
  takeItem(s, 'tomate', 1);
  assertEqual(lotsOf(s, 'tomate').map((l) => [l.qty, l.nightsLeft]), [[1, 4], [4, 5]]);
});

test('péremption : chaque nuit retire 1 nuit ; un lot arrivé à 0 est supprimé et noté', () => {
  const s = garden();
  setInv(s, { tomate: 4 });
  for (let i = 0; i < 4; i++) {
    assertEqual(spoil(s), {}, `nuit ${i + 1} : rien n'est perdu`);
    assertEqual(lotsOf(s, 'tomate')[0].nightsLeft, 4 - i);
  }
  assertEqual(countItem(s, 'tomate'), 4);
  assertEqual(spoil(s), { tomate: 4 }, 'la 5e nuit, la tomate a péri');
  assertEqual(countItem(s, 'tomate'), 0);
  assertEqual('tomate' in s.inventaire, false);
  assertEqual(s.nuit.perdus, { tomate: 4 }, 'noté dans le rapport de la nuit');
});

test('péremption : les durées propres à chaque item (carotte 6, patate 7)', () => {
  const s = garden();
  setInv(s, { tomate: 1, carotte: 1, patate: 1 });
  const lostAt = {};
  for (let n = 1; n <= 8; n++) {
    for (const item of Object.keys(spoil(s))) lostAt[item] = n;
  }
  assertEqual(lostAt, { tomate: 5, carotte: 6, patate: 7 });
});

test('péremption : deux lots d\'un même item ne périment pas ensemble', () => {
  const s = garden();
  setInv(s, {});
  addItem(s, 'courgette', 2);
  for (let i = 0; i < 3; i++) spoil(s);
  addItem(s, 'courgette', 5);
  assertEqual(spoil(s), {});
  assertEqual(spoil(s), { courgette: 2 }, 'seul le lot ancien périme');
  assertEqual(countItem(s, 'courgette'), 5);
  assertEqual(lotsOf(s, 'courgette')[0].nightsLeft, 3);
});

test('péremption : les items qui ne périssent pas restent intacts', () => {
  const s = garden();
  setInv(s, { conserve: 30, graine_carotte: 7, graine_tomate: 2 });
  for (let i = 0; i < 40; i++) assertEqual(spoil(s), {});
  assertEqual(inventoryCounts(s), { conserve: 30, graine_carotte: 7, graine_tomate: 2 });
  assertEqual(lotsOf(s, 'conserve')[0].nightsLeft, null);
});

test('péremption : expiringSoon() repère ce qui périt à la prochaine nuit', () => {
  const s = garden();
  setInv(s, { carotte: 3, tomate: 2, conserve: 5 });
  assertEqual(expiringSoon(s), {});
  for (let i = 0; i < 4; i++) spoil(s); // tomate : 1 nuit, carotte : 2 nuits
  assertEqual(expiringSoon(s), { tomate: 2 });
});

test('Dormir : la péremption est la dernière étape et le rapport nomme les pertes', () => {
  const s = garden();
  setInv(s, { conserve: 100, carotte: 4, tomate: 3 });
  lotsOf(s, 'carotte')[0].nightsLeft = 1;
  lotsOf(s, 'tomate')[0].nightsLeft = 2;
  // la réserve empêche la famille de manger ces items avant qu'ils périssent
  setSeedReserve(s, 'carotte', 4);
  setSeedReserve(s, 'tomate', 3);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.perimes, { carotte: 4 });
  assertEqual(r.aPerimer, { tomate: 3 }, 'la tomate périra la nuit suivante');
  assertEqual(countItem(s, 'carotte'), 0);
  assertEqual(countItem(s, 'tomate'), 3);
  // la nuit suivante : plus de perte signalée pour la carotte, la tomate est perdue
  s.awakeMs = 30000;
  const r2 = sleep(s);
  assertEqual(r2.perimes, { tomate: 3 });
  assertEqual(r2.aPerimer, {});
});

test('Dormir : le repas passe avant la péremption (un lot à 1 nuit est mangé, pas perdu)', () => {
  const s = garden();
  setInv(s, { conserve: 100, carotte: 4 });
  lotsOf(s, 'carotte')[0].nightsLeft = 1;
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.mange.carotte, 4);
  assertEqual(r.perimes, {});
});

test('ordre de consommation : d\'abord ce qui périme le plus tôt', () => {
  const s = garden();
  setInv(s, { conserve: 100, carotte: 2, courgette: 2, tomate: 2 });
  s.famille.reserve = {};
  // au départ : tomate et courgette (5 nuits) avant la carotte (6), la courgette (8) avant la tomate (6)
  assertEqual(Object.keys(planMeal(s).mange), ['courgette', 'tomate', 'carotte', 'conserve']);
  // la carotte vieillit de 3 nuits : elle n'a plus que 3 nuits et passe en tête malgré son énergie
  lotsOf(s, 'carotte')[0].nightsLeft = 3;
  assertEqual(Object.keys(planMeal(s).mange), ['carotte', 'courgette', 'tomate', 'conserve']);
});

test('ordre de consommation : à péremption égale, par énergie décroissante', () => {
  const s = garden();
  setInv(s, { conserve: 100, tomate: 2, courgette: 2 });
  s.famille.reserve = {};
  assertEqual(Object.keys(planMeal(s).mange), ['courgette', 'tomate', 'conserve']);
  const inStock = mealOrder(s).filter((k) => countItem(s, k) > 0);
  assertEqual(inStock.slice(-1), ['conserve'], 'les conserves, qui ne périment pas, passent en dernier');
});

test('ordre de consommation : dans un item, le lot le plus ancien est mangé d\'abord', () => {
  const s = garden();
  setInv(s, { conserve: 100 });
  s.famille.reserve = {};
  addItem(s, 'carotte', 5);
  spoil(s);
  spoil(s);
  addItem(s, 'carotte', 60); // 5 carottes à 4 nuits, 60 à 6 nuits
  const plan = planMeal(s);
  // Lot 11 (nutrition) : carotte à 8 d'énergie, 19 en couvrent les 150.
  assertEqual(plan.mange, { carotte: 19 }, '19 carottes couvrent les 150 énergies du besoin');
  feedFamily(s);
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 46, nightsLeft: 6, origin: 'produit' }], 'le lot de 4 nuits part en entier, puis 14 du lot frais');
});

test('Marché : prix d\'achat = prix de vente × coefficient, plancher 1,2', () => {
  const s = garden();
  assertEqual(marketCoef(s, 'patate'), 120);
  // Lot 12 : prix de vente doublés (patate 4, carotte 2, courgette 4), × 120 %
  // arrondi à l'entier supérieur (4,8 → 5 ; 2,4 → 3).
  assertEqual(buyPrice(s, 'patate'), 5);
  assertEqual(buyPrice(s, 'carotte'), 3);
  assertEqual(buyPrice(s, 'courgette'), 5);
  assertEqual(isBuyable('carotte'), true);
});

test('Marché : le prix d\'achat monte de 0,1 de coefficient par unité, unité par unité', () => {
  const s = garden();
  s.pieces = 100;
  const paid = [];
  for (let i = 0; i < 3; i++) {
    const before = s.pieces;
    const r = buyItem(s, 'patate');
    assertEqual([r.ok, r.bought], [true, 1]);
    paid.push(before - s.pieces);
    assertEqual(r.cost, paid[i]);
  }
  // Lot 12 : patate à 4 × coefficient 120 %, 130 %, 140 % = 4,8 ; 5,2 ; 5,6,
  // arrondis à l'entier supérieur.
  assertEqual(paid, [5, 6, 6]);
  assertEqual(marketCoef(s, 'patate'), 150);
  assertEqual(buyPrice(s, 'patate'), 6);
  assertEqual(countItem(s, 'patate'), 9, '6 de départ + 3');
  // un achat de plusieurs unités reprend le même chemin, le prix montant entre chacune
  const t = garden();
  t.pieces = 100;
  const r = buyItem(t, 'patate', 3);
  assertEqual([r.bought, r.cost], [3, 17]);
  assertEqual(t.pieces, 83);
});

test('Marché : la vente est au prix fixe et fait baisser le coefficient de 0,1 par unité', () => {
  const s = garden();
  s.pieces = 100;
  buyItem(s, 'patate', 3); // coefficient 150 %
  const before = s.pieces;
  const r = sellItem(s, 'patate', 2);
  // Lot 12 : patate vendue 4 pièces (au lieu de 2) l'unité.
  assertEqual([r.ok, r.sold, r.gain], [true, 2, 8]);
  assertEqual(s.pieces, before + 8, 'prix de vente fixe : 4 pièces par patate');
  assertEqual(marketCoef(s, 'patate'), 130);
  assertEqual(buyPrice(s, 'patate'), 6, 'vendre 2 patates ramène le prix à 5,2, arrondi à 6');
  // la vente ne dépend ni de l'âge ni de l'origine (la conserve n'est pas
  // une production de la ferme : son prix reste inchangé à 3)
  assertEqual(sellItem(s, 'conserve', 10).gain, 30);
});

test('Marché : le coefficient ne descend jamais sous le plancher de 1,2', () => {
  const s = garden();
  sellItem(s, 'patate', 5);
  assertEqual(marketCoef(s, 'patate'), 120);
  assertEqual(buyPrice(s, 'patate'), 5);
  buyItem(s, 'carotte', 1); // acheté : 130 % — puis vendu 10 : bloqué à 120 %
  addItem(s, 'carotte', 10);
  sellItem(s, 'carotte', 11);
  assertEqual(marketCoef(s, 'carotte'), 120);
  assertEqual(s.marche, {}, 'un coefficient revenu à son plancher n\'est plus noté');
});

test('Marché : graines, coefficient de départ et plancher à 2,0', () => {
  const s = garden();
  assertEqual(marketCoef(s, 'graine_carotte'), 200);
  assertEqual(buyPrice(s, 'graine_carotte'), 2);
  s.pieces = 50;
  buyItem(s, 'graine_carotte');
  assertEqual(marketCoef(s, 'graine_carotte'), 210);
  assertEqual(buyPrice(s, 'graine_carotte'), 3, '1 × 210 % = 2,1, arrondi à 3');
  assertEqual(s.pieces, 48);
  // en vendre ne descend jamais sous 200 %
  sellItem(s, 'graine_carotte', 8);
  assertEqual(marketCoef(s, 'graine_carotte'), 200);
  assertEqual(buyPrice(s, 'graine_carotte'), 2);
  assertEqual(buyPrice(s, 'graine_tomate'), 2);
});

test('Marché : les coefficients sont propres à chaque item et ne redescendent pas avec le temps', () => {
  const s = garden();
  s.pieces = 200;
  buyItem(s, 'tomate', 4);
  assertEqual(marketCoef(s, 'tomate'), 160);
  assertEqual(marketCoef(s, 'carotte'), 120);
  const c = marketCoef(s, 'tomate');
  for (let i = 0; i < 12; i++) {
    s.awakeMs = 30000;
    sleep(s);
    tick(s, 5);
  }
  assertEqual(marketCoef(s, 'tomate'), c, 'aucune baisse avec les nuits ni le temps');
});

test('Marché : les conserves ne s\'achètent pas', () => {
  const s = garden();
  s.pieces = 500;
  assertEqual(isBuyable('conserve'), false);
  const r = buyItem(s, 'conserve');
  assertEqual(r.ok, false);
  assertEqual([s.pieces, countItem(s, 'conserve')], [500, 160]);
  assertEqual(s.marche, {});
  assertEqual(buyItem(s, 'inconnu').ok, false);
});

test('Marché : achat refusé sans pièces, et un achat multiple s\'arrête quand elles manquent', () => {
  const s = garden();
  s.pieces = 1;
  const r = buyItem(s, 'carotte');
  assertEqual(r.ok, false);
  assertEqual([s.pieces, countItem(s, 'carotte')], [1, 0]);
  // Lot 12 : carotte à 2 pièces : 2,4 puis 2,6 → 3 puis 3 pièces (arrondi
  // supérieur) : 1 unité, la 2e dépasse les 2 pièces restantes.
  s.pieces = 5;
  const r2 = buyItem(s, 'carotte', 5);
  assertEqual([r2.ok, r2.bought, r2.cost], [true, 1, 3]);
  assertEqual(s.pieces, 2);
  assertEqual(marketCoef(s, 'carotte'), 130);
});

test('Marché : un item acheté arrive avec sa conservation pleine et l\'origine « acheté »', () => {
  const s = garden();
  setInv(s, {});
  addItem(s, 'carotte', 3);
  spoil(s);
  spoil(s); // la carotte produite n'a plus que 4 nuits
  s.pieces = 50;
  buyItem(s, 'carotte', 2);
  const lots = lotsOf(s, 'carotte');
  assertEqual(lots, [
    { qty: 3, nightsLeft: 4, origin: 'produit' },
    { qty: 2, nightsLeft: 6, origin: 'acheté' },
  ]);
  assertEqual([countByOrigin(s, 'carotte', 'produit'), countByOrigin(s, 'carotte', 'acheté')], [3, 2]);
  buyItem(s, 'graine_tomate');
  assertEqual(lotsOf(s, 'graine_tomate').slice(-1)[0].origin, 'acheté');
  assertEqual(lotsOf(s, 'graine_tomate').slice(-1)[0].nightsLeft, null);
});

testBase('origine des lots : une récolte donne « produit », le Marché « acheté »', () => {
  const s = garden();
  setInv(s, { graine_tomate: 1 });
  plantRipe(s, 'potager-1', 'tomate');
  assertEqual(harvest(s, 'potager-1', true).ok, true);
  assertEqual(countByOrigin(s, 'tomate', 'produit'), 10);
  assertEqual(countByOrigin(s, 'tomate', 'acheté'), 0);
  s.pieces = 20;
  buyItem(s, 'tomate', 2);
  assertEqual(countByOrigin(s, 'tomate', 'acheté'), 2);
  assertEqual(countItem(s, 'tomate'), 12);
});

test('vente : retire les lots les plus anciens, refuse sans stock et ignore les quantités folles', () => {
  const s = garden();
  setInv(s, {});
  addItem(s, 'carotte', 4);
  spoil(s);
  addItem(s, 'carotte', 4);
  const r = sellItem(s, 'carotte', 5);
  // Lot 12 : carotte vendue 2 pièces (au lieu de 1) l'unité.
  assertEqual([r.sold, r.gain], [5, 10]);
  assertEqual(lotsOf(s, 'carotte'), [{ qty: 3, nightsLeft: 6, origin: 'produit' }]);
  assertEqual(sellItem(s, 'carotte', 99).sold, 3, 'plafonné au stock');
  assertEqual(sellItem(s, 'carotte', 1).ok, false, 'plus rien à vendre');
  assertEqual(sellItem(s, 'tomate', 0).ok, false);
  assertEqual(sellItem(s, 'tomate', 'abc').ok, false);
  assertEqual(sellItem(s, 'inconnu', 1).ok, false);
});

test('les 10 nouvelles cultures : récolte stockée dans l\'inventaire, puis vendable', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(s);
  addItem(s, 'graine_oignon', 1);
  addItem(s, 'riz', 1);
  addItem(s, 'cacao', 1);
  plantRipe(s, 'potager-1', 'oignon');
  plantRipe(s, 'potager-2', 'riz');
  plantRipe(s, 'serre-1', 'cacao');
  // Nuit 1 = printemps : le facteur de saison de la Zone de culture est ×1,1
  // (voir DATA.SAISONS.MODS.printemps.potager), donc 8 × 1,1 arrondi = 9 pour
  // l'oignon et 10 × 1,1 = 11 pour le riz (version 1.0 : le riz suit la même
  // saison que le reste de la zone) ; la Serre (jamais de saison) n'est pas
  // affectée.
  assertEqual(harvest(s, 'potager-1').items.oignon, 9);
  assertEqual(harvest(s, 'potager-2').items.riz, 11);
  assertEqual(harvest(s, 'serre-1').items.cacao, 5);
  assertEqual([countItem(s, 'oignon'), countItem(s, 'riz'), countItem(s, 'cacao')], [9, 11, 5], 'récoltes bien dans l\'inventaire');
  // Lot 12 : prix de vente doublés (oignon 2, riz 2, cacao 16).
  assertEqual(sellItem(s, 'oignon', 9), { ok: true, sold: 9, gain: 18 });
  assertEqual(sellItem(s, 'riz', 11), { ok: true, sold: 11, gain: 22 });
  assertEqual(sellItem(s, 'cacao', 5), { ok: true, sold: 5, gain: 80 }, '5 × 16 : le cacao se vend cher, comme prévu');
  assertEqual([countItem(s, 'oignon'), countItem(s, 'riz'), countItem(s, 'cacao')], [0, 0, 0]);
});

test('mode test Lot 3 : 20 de chaque aliment, puis vieillissement d\'une nuit', () => {
  const s = garden();
  setInv(s, { conserve: 5 });
  testAddFood(s);
  // Lot 5 : la viande, les fruits, le pain et les plats sont aussi des aliments.
  // Lot « 10 cultures » : oignon, ail, poivron, épinard, fraise et riz sont
  // comestibles (contrairement à houblon/cacao/vanille/café, edible: false,
  // absents d'ici) — ajoutés à la suite dans DATA.items, donc à la fin ici.
  // Les trois anciennes viandes et le lait sont à la fin des objets de base
  // (après café), donc juste avant les plats ; la paille, elle, ne se mange pas.
  // Nouvelles recettes : ajoutées à DATA.items par registerDishItems(),
  // dans l'ordre de déclaration de DATA.recipes, donc après tarte_pommes.
  // Version 1.1 : les quatre plats retirés du livre (DATA.PLATS_RETIRES)
  // restent des aliments, ajoutés tout à la fin.
  assertEqual(inventoryCounts(s), {
    conserve: 25, carotte: 20, patate: 20, tomate: 20, courgette: 20, aubergine: 20, oeuf: 20,
    viande_mouton: 20, pomme: 20, poire: 20, oignon: 20, ail: 20, poivron: 20, epinard: 20, fraise: 20, riz: 20,
    viande_boeuf: 20, viande_volaille: 20, lait: 20,
    pain: 20, omelette: 20, ratatouille: 20, gratin_patates: 20, compote: 20, tarte_pommes: 20,
    soupe_legumes: 20, salade_tomates: 20, quiche_epinards: 20, fromage_frais: 20, riz_au_lait: 20,
    pain_ail: 20, tarte_fraises: 20, confiture_fraises: 20,
    chocolat_chaud: 20, cafe_boisson: 20, creme_vanille: 20, biere_artisanale: 20,
    bocal_legumes: 20,
    ragout: 20, poivrons_farcis: 20, roti_boeuf: 20, poulet_roti_ail: 20,
  });
  assertEqual(countItem(s, 'paille'), 0, 'la paille n\'est pas un aliment');
  assertEqual(countItem(s, 'graine_carotte'), 0, 'les graines ne sont pas des aliments');
  assertEqual(countItem(s, 'farine') + countItem(s, 'huile'), 0, 'ni la farine ni l\'huile');
  assertEqual(countItem(s, 'cacao') + countItem(s, 'vanille') + countItem(s, 'cafe') + countItem(s, 'houblon'), 0, 'les cultures de rente non plus');
  const r = testAgeInventory(s);
  assertEqual(r.ok, true);
  assertEqual(r.perdus, {});
  assertEqual(lotsOf(s, 'carotte')[0].nightsLeft, 5);
  assertEqual(lotsOf(s, 'patate')[0].nightsLeft, 6);
  assertEqual(lotsOf(s, 'conserve')[0].nightsLeft, null);
  assertEqual(lotsOf(s, 'oignon')[0].nightsLeft, 5);
  assertEqual(lotsOf(s, 'ail')[0].nightsLeft, 6);
  assertEqual(lotsOf(s, 'riz')[0].nightsLeft, null, 'le riz, comme le blé, ne périme pas');
  for (let i = 0; i < 4; i++) testAgeInventory(s);
  // 6e nuit : tomate, courgette, aubergine, viande_mouton, poivron, épinard,
  // fraise, viande_boeuf, viande_volaille et lait déjà perdus (conservation à
  // 5 ou 4 nuits), carotte, œuf, oignon (6 nuits) et plats maintenant.
  // Nouvelles recettes : celles à conservation par défaut (catégorie
  // « plat », 6 nuits) sont perdues en même temps que les anciens plats ;
  // fromage_frais (8 nuits) leur survit encore, et biere_artisanale /
  // confiture_fraises (imperissables) ne sont jamais perdues.
  const last = testAgeInventory(s);
  assertEqual(last.perdus, {
    carotte: 20, oeuf: 20, oignon: 20, omelette: 20, ratatouille: 20, gratin_patates: 20, compote: 20, tarte_pommes: 20,
    soupe_legumes: 20, salade_tomates: 20, quiche_epinards: 20, riz_au_lait: 20, pain_ail: 20,
    tarte_fraises: 20, chocolat_chaud: 20, cafe_boisson: 20, creme_vanille: 20,
    ragout: 20, poivrons_farcis: 20, roti_boeuf: 20, poulet_roti_ail: 20,
  });
  assertEqual(inventoryCounts(s), {
    conserve: 25, patate: 20, pomme: 20, poire: 20, ail: 20, riz: 20, pain: 20,
    fromage_frais: 20, confiture_fraises: 20, biere_artisanale: 20, bocal_legumes: 20,
  });
});

test('migration v3 (Lot 2) → v4 : l\'inventaire devient des lots à conservation pleine', () => {
  const v3 = {
    version: 3, day: 9, awakeSeconds: 4, pieces: 66, rngSeed: 5, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir'], ...startFarm(), ...startHousehold(),
  };
  v3.inventaire = { conserve: 40, carotte: 7, patate: 6, graine_carotte: 3, tomate: 0 };
  delete v3.nuit.perdus; // une nuit de Lot 2 ne connaît pas encore les pertes
  const m = migrate({ v: 3, t: 0, s: v3 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [9, 66]);
  assertEqual(inventoryCounts(m), { conserve: 40, carotte: 7, patate: 6, graine_carotte: 3 }, 'un item à zéro disparaît');
  assertEqual(lotsOf(m, 'carotte'), [{ qty: 7, nightsLeft: 6, origin: 'produit' }]);
  assertEqual(lotsOf(m, 'patate'), [{ qty: 6, nightsLeft: 7, origin: 'produit' }]);
  assertEqual(lotsOf(m, 'graine_carotte'), [{ qty: 3, nightsLeft: null, origin: 'produit' }]);
  assertEqual(lotsOf(m, 'conserve'), [{ qty: 40, nightsLeft: null, origin: 'acheté' }]);
  assertEqual(m.marche, {});
  assertEqual(m.nuit.perdus, {});
  // l'état migré tourne : Dormir, Marché
  setSeedReserve(m, 'carotte', 7); // la famille ne mange pas ces carottes cette nuit
  m.awakeMs = 30000;
  assert(sleep(m) !== null, 'l\'état migré peut dormir');
  assertEqual(lotsOf(m, 'carotte')[0].nightsLeft, 5, 'la péremption s\'applique à la carotte migrée');
  m.pieces = 10;
  assertEqual(buyItem(m, 'carotte').ok, true);
});

test('migration v1 → version courante : les chaînes de migration mènent à des lots', () => {
  const v1 = { version: 1, day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} };
  const m = migrate({ v: 1, t: 0, s: v1 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(lotsOf(m, 'conserve'), [{ qty: 160, nightsLeft: null, origin: 'acheté' }]);
  assertEqual(m.marche, {});
  // une sauvegarde déjà en lots n'est pas convertie deux fois
  const again = migrate({ v: 3, t: 0, s: { ...m, version: 3 } });
  assertEqual(lotsOf(again, 'conserve'), [{ qty: 160, nightsLeft: null, origin: 'acheté' }]);
});

test('sérialisation JSON : lots et coefficients font l\'aller-retour', () => {
  const s = createInitialState(3);
  s.pieces = 100;
  buyItem(s, 'carotte', 3);
  spoil(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assertEqual(marketCoef(copy, 'carotte'), 150);
});

/* ---------- Lot 4 : cultures de plein champ, Silo, Poulailler ---------- */

// État de test : riche, Silo et Poulailler construits, réservoir plein. Les
// cultures de plein champ (blé, tournesol, riz, houblon) se plantent dans la
// Zone de culture de départ (potager-1 à potager-6) : plus de Champ à construire.
function ranch({ silo = true, coop = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (silo) assert(buildSilo(s).ok, 'construire le Silo');
  if (coop) assert(buildPoulailler(s).ok, 'construire le Poulailler');
  return s;
}

test('DATA Lot 4 : Silo, Poulailler, poule, blé, tournesol et œuf (plus de Champ)', () => {
  assertEqual(DATA.CHAMP, undefined, 'version 1.0 : le Champ a rejoint la Zone de culture');
  assertEqual([DATA.SILO.CAPACITE, DATA.SILO.CONSTRUCTION, DATA.SILO.COUT], [[20, 50, 100, 200, 400], 0, [0, 30, 80, 180, 400]]);
  assertEqual([DATA.POULAILLER.CONSTRUCTION, DATA.POULAILLER.CAPACITE, DATA.POULAILLER.COUT], [40, [4, 8, 12, 16, 24], [0, 100, 220, 450, 900]]);
  assertEqual([DATA.ANIMAUX.poule.prix, DATA.ANIMAUX.poule.poulesParBle, DATA.ANIMAUX.poule.oeufsParNuit], [15, 2, 1]);
  const c = DATA.crops;
  assertEqual([c.ble.stades, c.ble.litres, c.ble.rendement, c.ble.graines], [7, 2, 8, { item: 'ble', mode: 'plant' }]);
  assertEqual([c.tournesol.stades, c.tournesol.litres, c.tournesol.rendement], [7, 2, 9]);
  assertEqual(cropProduct('tournesol'), 'graine_tournesol');
  assertEqual(cropProduct('ble'), 'ble');
  // Lot 12 : prix de vente de l'œuf doublé (2 → 4).
  assertEqual([DATA.items.oeuf.energie, DATA.items.oeuf.prix, shelfLife('oeuf')], [scaleEnergie(10), 4, 6]);
  assertEqual(shelfLife('ble'), 10, 'le blé périme dans l\'inventaire, jamais au Silo');
  assertEqual(shelfLife('graine_tournesol'), null);
});

test('Marché – onglet Graines : isGraineComptoir()', () => {
  // Le blé y apparaît sans changer de catégorie (double fonction préservée :
  // Silo, Moulin, poules, plancher de marché ×1,2, comme avant).
  assertEqual(isGraineComptoir('ble'), true);
  assertEqual(DATA.items.ble.category, 'ingrédient');
  assertEqual(marketFloor('ble'), DATA.MARCHE.PLANCHER.defaut);
  // Les graines de tournesol restent classées « graine », comme les autres graines.
  assertEqual(isGraineComptoir('graine_tournesol'), true);
  assertEqual(DATA.items.graine_tournesol.category, 'graine');
  for (const k of ['graine_carotte', 'graine_tomate', 'graine_courgette', 'graine_aubergine']) {
    assertEqual(isGraineComptoir(k), true, k);
  }
  // On ne généralise pas aux autres cultures « mode: plant » (la patate reste
  // hors de l'onglet Graines : seul le blé fait exception) ni aux items qui
  // partagent juste la catégorie « ingrédient ».
  assertEqual(isGraineComptoir('patate'), false, 'la patate ne fait pas exception, contrairement au blé');
  assertEqual(isGraineComptoir('farine'), false);
  assertEqual(isGraineComptoir('huile'), false);
  assertEqual(isGraineComptoir('carotte'), false);
});

test('Marché – onglet Graines : les 10 nouvelles cultures', () => {
  // graine_oignon, graine_poivron, graine_epinard et graine_fraise sont de
  // vraies graines (mode 'recolte') : elles apparaissent dans l'onglet Graines,
  // comme graine_carotte etc.
  for (const k of ['graine_oignon', 'graine_poivron', 'graine_epinard', 'graine_fraise']) {
    assertEqual(isGraineComptoir(k), true, k);
  }
  // ail, riz, houblon, cacao, vanille, café sont en mode 'plant' : comme la
  // patate (et contrairement au blé), ils ne font pas exception et restent hors
  // de l'onglet Graines — ils s'achètent via l'onglet Acheter s'ils sont
  // rachetables (voir isBuyable()).
  for (const k of ['ail', 'riz', 'houblon', 'cacao', 'vanille', 'cafe']) {
    assertEqual(isGraineComptoir(k), false, `${k} ne fait pas exception, comme la patate`);
  }
  // Aucune de ces 10 cultures n'est verrouillée par un chapitre (voir
  // DATA.CHAPITRES.liste) : leurs graines sont donc déjà en vente dès le départ.
  // (seedForSale(), qui applique cette même règle, vit dans le bloc de rendu
  // et n'est pas exposée à ce banc de tests moteur : on rejoue ici sa logique —
  // « aucune culture qui utilise cette graine n'est verrouillée ».)
  const s = createInitialState(1);
  const seedLocked = (item) => Object.keys(DATA.crops).some((c) => DATA.crops[c].graines.item === item && !isUnlocked(s, c));
  for (const k of ['graine_oignon', 'graine_poivron', 'graine_epinard', 'graine_fraise']) {
    assertEqual(seedLocked(k), false, `${k} en vente dès le départ`);
  }
  // Achat effectif d'une graine de la nouvelle liste, comme pour les graines
  // déjà existantes.
  const before = countItem(s, 'graine_oignon');
  assertEqual(buyItem(s, 'graine_oignon').ok, true);
  assertEqual(countItem(s, 'graine_oignon'), before + 1);
});

test('état initial Lot 4 : rien n\'est construit', () => {
  const s = createInitialState(1);
  assertEqual('champ' in s, false, 'une partie neuve n\'a pas de state.champ');
  assertEqual(s.silo, { construit: false, niveau: 1, ble: 0 });
  assertEqual(s.poulailler, { construit: false, niveau: 1, poules: 0, nourries: 0, restes: 0 });
  assertEqual([siloCapacity(s), coopCapacity(s)], [0, 0]);
  assertEqual(s.jour.ble, 0);
});

test('le Champ n\'existe plus : ni état, ni actions, une seule zone qui grandit', () => {
  assertEqual([typeof buildChamp, typeof upgradeChamp, typeof champUpgradeCost], ['undefined', 'undefined', 'undefined']);
  const s = garden();
  assertEqual(s.champ, undefined);
  assertEqual(allPlots(s).map((p) => p.id), ['potager-1', 'potager-2', 'potager-3', 'potager-4', 'potager-5', 'potager-6']);
  assertEqual(allPlots(s).every((p) => p.lieu === 'potager'), true);
  assertEqual(findPlot(s, 'champ-1'), null, 'aucune parcelle « champ-n »');
  // les 6 parcelles de plus du niveau 2 remplacent l'ancien Champ (4 parcelles pour 60 pièces)
  s.pieces = 199;
  assertEqual(upgradePotager(s).ok, false, 'agrandissement refusé sans 200 pièces');
  s.pieces = 200;
  assertEqual(upgradePotager(s).ok, true);
  assertEqual([s.pieces, s.potager.niveau, s.potager.parcelles.length], [0, 2, 12]);
  assertEqual(s.potager.parcelles.slice(6).map((p) => [p.id, p.lieu]), [7, 8, 9, 10, 11, 12].map((n) => [`potager-${n}`, 'potager']));
});

test('cultures de plein champ : la Zone de culture les fait pousser comme les légumes (planter, arroser, pousser, récolter)', () => {
  const s = ranch();
  setInv(s, { ble: 3, graine_tournesol: 2, graine_carotte: 1, riz: 1, houblon: 1, conserve: 300 }); // la famille mange : la productivité reste à 1
  assertEqual(plant(s, 'potager-1', 'ble').ok, true, 'le blé pousse dans la zone');
  assertEqual(plant(s, 'potager-2', 'tournesol').ok, true);
  assertEqual(plant(s, 'potager-3', 'carotte').ok, true, 'aucune restriction de lieu : la carotte à côté du blé');
  assertEqual(plant(s, 'potager-4', 'riz').ok, true);
  assertEqual(plant(s, 'potager-5', 'houblon').ok, true);
  assertEqual(plantableCrops('potager'), ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'epinard', 'fraise', 'ble', 'tournesol', 'riz', 'houblon']);
  assertEqual(plantableCrops('champ'), [], 'plus aucun lieu « champ »');
  assertEqual(s.eauMl, ml(40));
  assertEqual(water(s, 'potager-1').ok, true);
  assertEqual(water(s, 'potager-2').ok, true);
  assertEqual(s.eauMl, ml(36), '2 L par arrosage');
  for (let i = 1; i <= 7; i++) {
    sleep(Object.assign(s, { awakeMs: 30000 }));
    for (const id of ['potager-1', 'potager-2']) if (findPlot(s, id).stade < 7) water(s, id);
  }
  assertEqual(findPlot(s, 'potager-1').stade, 7);
  assertEqual(isMature(findPlot(s, 'potager-1')), true);
  assertEqual(readyCrops(s).map((r) => [r.culture, r.nombre]), [['ble', 1], ['tournesol', 1]]);
  // nuit 8 : encore le printemps, la zone rend ×1,1 quelle que soit la culture
  // (8 blés → 9, 9 graines de tournesol → 10)
  assertEqual(harvest(s, 'potager-1').items, { ble: 9 });
  assertEqual(harvest(s, 'potager-2').items, { graine_tournesol: 10 });
  assertEqual(findPlot(s, 'potager-1').culture, null, 'parcelle libérée');
  assertEqual(countItem(s, 'graine_tournesol'), 10 + 1, 'la graine plantée est consommée : 2 − 1 + 10');
});

test('Silo : capacité par niveau et coûts 30 / 80 / 180 / 400, construction offerte', () => {
  const s = garden();
  s.pieces = 0;
  assertEqual(buildSilo(s).ok, true, 'la construction est gratuite');
  assertEqual(s.pieces, 0);
  assertEqual(buildSilo(s).ok, false);
  assertEqual(siloCapacity(s), 20);
  const seen = [];
  s.pieces = 1000;
  while (siloUpgradeCost(s) !== null) {
    const cost = siloUpgradeCost(s);
    assertEqual(upgradeSilo(s).ok, true);
    seen.push([cost, s.silo.niveau, siloCapacity(s)]);
  }
  assertEqual(seen, [[30, 2, 50], [80, 3, 100], [180, 4, 200], [400, 5, 400]]);
  assertEqual(s.pieces, 1000 - 690);
  assertEqual(upgradeSilo(s).ok, false, 'niveau maximum');
  const t = garden();
  assertEqual(upgradeSilo(t).ok, false, 'pas avant la construction');
  buildSilo(t);
  t.pieces = 29;
  assertEqual(upgradeSilo(t).ok, false, 'pas assez de pièces');
});

test('Silo : le blé récolté va d\'abord au Silo, le surplus déborde dans l\'inventaire', () => {
  const s = ranch();
  setInv(s, {});
  // 3 récoltes de 9 blés (8 × 1,1 au printemps) = 27 : 20 au Silo (niveau 1), 7 dans l'inventaire
  s.potager.parcelles.forEach((p, i) => {
    if (i < 3) {
      p.culture = 'ble';
      p.stade = 7;
    }
  });
  harvest(s, 'potager-1');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [9, 0]);
  harvest(s, 'potager-2');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [18, 0]);
  harvest(s, 'potager-3');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [20, 7], 'plein à 20, surplus de 7 dans l\'inventaire');
  assertEqual(lotsOf(s, 'ble')[0].nightsLeft, 10, 'le blé de l\'inventaire périme');
  assertEqual(wheatTotal(s), 27);
  // sans Silo, tout va dans l'inventaire
  const t = ranch({ silo: false });
  setInv(t, {});
  assertEqual(storeWheat(t, 8), { silo: 0, inventaire: 8 });
  assertEqual([t.silo.ble, countItem(t, 'ble')], [0, 8]);
  // niveau 2 : capacité 50 ; le surplus de l'inventaire rejoint aussitôt le Silo
  upgradeSilo(s);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [27, 0]);
  assertEqual(storeWheat(s, 100), { silo: 23, inventaire: 100 - 23 });
  assertEqual(s.silo.ble, 50);
});

test('Silo : les poules mangent d\'abord dans l\'inventaire (il y périme), puis dans le Silo', () => {
  const s = ranch();
  setInv(s, { ble: 1 });
  s.silo.ble = 3;
  testAddHens(s, 4);
  assertEqual(feedHen(s).compte, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [3, 0]);
  assertEqual(feedHen(s).compte, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [3, 0], 'la 2e poule finit le blé entamé');
  assertEqual(feedHen(s).compte, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [2, 0], 'l\'inventaire est vide : on entame le Silo');
  assertEqual(s.poulailler.nourries, 3);
  assertEqual(s.jour.ble, 2, 'blé mangé du jour');
});

test('blé entier : 1 blé nourrit 2 poules, une ration entamée ne revient pas au stock', () => {
  const s = ranch({ silo: false });
  setInv(s, { ble: 3 });
  testAddHens(s, 4);
  feedHen(s);
  assertEqual([countItem(s, 'ble'), s.poulailler.restes], [2, 1], 'un blé entamé : encore une ration');
  feedHen(s);
  assertEqual([countItem(s, 'ble'), s.poulailler.restes], [2, 0], 'la 2e poule mange la ration entamée');
  feedHen(s);
  assertEqual([countItem(s, 'ble'), s.poulailler.restes, s.jour.ble], [1, 1, 2]);
  assertEqual(wheatForHens(s, 1), 0, 'la 4e poule a déjà sa ration');
  assertEqual(wheatForHens(s, 4), 2, '⌈(4 − 1) ÷ 2⌉');
  const r = sellItem(s, 'ble', 99);
  // Lot 12 : blé vendu 2 pièces l'unité ; le stock est toujours entier.
  assertEqual([r.ok, r.sold, r.gain], [true, 1, 2]);
  assertEqual(feedHen(s).compte, true, 'la ration entamée nourrit encore une poule sans blé');
  s.awakeMs = 30000;
  setInv(s, { conserve: 200 });
  sleep(s);
  assertEqual(s.poulailler.restes, 0, 'une ration entamée ne se garde pas d\'une nuit à l\'autre');
  assertEqual(formatQty(3), '3');
  assertEqual(formatQty(0), '0');
});

test('Poulailler : construction 40, capacité 4 / 8 / 12 / 16 / 24 aux coûts 100 / 220 / 450 / 900', () => {
  const s = garden();
  s.pieces = 39;
  assertEqual(buildPoulailler(s).ok, false);
  assertEqual(upgradePoulailler(s).ok, false, 'pas avant la construction');
  s.pieces = 40;
  assertEqual(buildPoulailler(s).ok, true);
  assertEqual([s.pieces, coopCapacity(s)], [0, 4]);
  assertEqual(buildPoulailler(s).ok, false);
  s.pieces = 5000;
  const seen = [];
  while (coopUpgradeCost(s) !== null) {
    const cost = coopUpgradeCost(s);
    assertEqual(upgradePoulailler(s).ok, true);
    seen.push([cost, s.poulailler.niveau, coopCapacity(s)]);
  }
  assertEqual(seen, [[100, 2, 8], [220, 3, 12], [450, 4, 16], [900, 5, 24]]);
  assertEqual(upgradePoulailler(s).ok, false, 'niveau maximum');
});

test('poule : prix fixe de 15 pièces, quel que soit le nombre de poules', () => {
  const s = ranch();
  s.pieces = 100;
  for (let i = 0; i < 4; i++) {
    assertEqual(animalPrice('poule'), 15);
    const before = s.pieces;
    assertEqual(buyAnimal(s, 'poule').ok, true);
    assertEqual(before - s.pieces, 15, `la ${i + 1}re poule coûte 15`);
  }
  assertEqual(s.poulailler.poules, 4);
  assertEqual(s.pieces, 40);
  assertEqual(buyAnimal(s, 'poule').ok, false, 'plein : refusé même avec des pièces');
  s.pieces = 100;
  assertEqual(upgradePoulailler(s).ok, true);
  s.pieces = 15;
  const r = buyAnimal(s, 'poule');
  assertEqual([r.ok, r.cost, s.pieces], [true, 15, 0], 'toujours 15 avec 4 poules de plus');
  assertEqual(buyAnimal(s, 'poule').ok, false, 'pas assez de pièces');
});

test('achat de poule refusé si le poulailler est plein ou absent, et sans effet sur les pièces', () => {
  const s = ranch();
  testAddHens(s, 4);
  s.pieces = 1000;
  const r = buyAnimal(s, 'poule');
  assertEqual([r.ok, r.error], [false, 'Le Poulailler est plein.']);
  assertEqual([s.pieces, s.poulailler.poules], [1000, 4]);
  const t = ranch({ coop: false });
  assertEqual(buyAnimal(t, 'poule').ok, false, 'pas de poulailler');
  assertEqual(t.poulailler.poules, 0);
  assertEqual(buyAnimal(s, 'mouton').ok, false, 'Étable pas encore prête : pas de mouton');
  assertEqual(buyAnimal(s, 'chevre').ok, false, 'animal inconnu');
  assertEqual(typeof sellItem, 'function');
  assertEqual(DATA.items.poule, undefined, 'une poule n\'est pas un objet : elle ne se revend pas');
});

test('poule non nourrie : pas d\'œuf ; poule nourrie : 1 œuf, puis remise à zéro', () => {
  const s = ranch();
  setInv(s, { ble: 10, conserve: 200 });
  testAddHens(s, 4);
  assertEqual(feedHen(s).compte, true);
  assertEqual(feedHen(s).compte, true);
  assertEqual([s.poulailler.poules, s.poulailler.nourries], [4, 2]);
  assertEqual(layEggs(s), 2, '2 poules nourries sur 4 : 2 œufs');
  assertEqual(countItem(s, 'oeuf'), 2);
  assertEqual(s.poulailler.nourries, 0, 'remise à zéro');
  assertEqual(layEggs(s), 0, 'personne nourrie : aucun œuf');
  assertEqual(countItem(s, 'oeuf'), 2);
  assertEqual(s.nuit.oeufs, 0);
  // Aucune poule nourrie du tout, sur une vraie nuit
  const t = ranch();
  testAddHens(t, 4);
  t.awakeMs = 30000;
  const report = sleep(t);
  assertEqual([report.oeufs, countItem(t, 'oeuf')], [0, 0]);
});

// Version 1.1 : aucun animal n'est plus jamais tué, et les animaux n'ont plus de poids.
test('version 1.1 : les poules pondent toute leur vie, plus rien ne permet de tuer un animal', () => {
  assertEqual([typeof slaughterHen, typeof slaughter, typeof meatPortions, typeof meatPortionsCow, typeof pastureMeatPortions], ['undefined', 'undefined', 'undefined', 'undefined', 'undefined']);
  assertEqual([typeof growSheep, typeof growCattle], ['undefined', 'undefined'], 'plus de prise de poids');
  // Plus aucune donnée de viande ni de poids sur les animaux, ni dans les réglages du joueur automatique.
  for (const [id, def] of Object.entries(DATA.ANIMAUX)) {
    for (const k of Object.keys(def)) assert(!/viande|portion|rendement|poids|gain/i.test(k), `${id}.${k}`);
  }
  assertEqual(DATA.ANIMAUX.poule, { nom: 'Poule', icone: '🐔', prix: 15, poulesParBle: 2, oeufsParNuit: 1, produit: 'oeuf' });
  assertEqual(Object.keys(DATA.SIMULATION).filter((k) => /POIDS|VIANDE/.test(k)), []);
  // Les poules, elles, n'ont pas changé : 1 blé pour 2 poules, 1 œuf par poule nourrie.
  const s = ranch();
  setInv(s, { ble: 10, conserve: 200 });
  testAddHens(s, 4);
  assertEqual(feedAllHens(s).nourries, 4);
  s.awakeMs = 30000;
  sleep(s);
  assertEqual([countItem(s, 'oeuf'), s.poulailler.poules, wheatTotal(s)], [4, 4, 8]);
  assertEqual([countItem(s, 'viande_volaille'), countItem(s, 'paille')], [0, 0], 'ni viande, ni paille pour les poules');
});

// Achat, nourrissage et ponte d'une poule restent inchangés (mécanique déjà
// établie) : non-régression explicite.
test('achat, nourrissage et ponte d\'une poule fonctionnent normalement', () => {
  const s = ranch();
  s.pieces = 100;
  assertEqual(buyAnimal(s, 'poule'), { ok: true, cost: 15 });
  assertEqual(s.poulailler.poules, 1);
  setInv(s, { ble: 10 });
  assertEqual(feedHen(s).compte, true);
  assertEqual(layEggs(s), 1);
  assertEqual(countItem(s, 'oeuf'), 1);
});

test('ponte : les œufs sont pondus après la pousse et avant la péremption', () => {
  const s = ranch();
  setInv(s, { ble: 10, conserve: 200 });
  testAddHens(s, 4);
  feedAllHens(s);
  assertEqual(s.poulailler.nourries, 4);
  s.awakeMs = 30000;
  const report = sleep(s);
  assertEqual(countItem(s, 'oeuf'), 4);
  assertEqual(lotsOf(s, 'oeuf')[0].nightsLeft, 5, 'pondu avant la péremption : il a déjà perdu une nuit sur 6');
  assertEqual(report.oeufs, 4);
  assertEqual(report.bleConsomme, 2, '4 poules : 2 blé');
  assertEqual(report.poules, 4);
  assertEqual(s.poulailler.nourries, 0);
  assertEqual(s.jour.ble, 0, 'compteur du jour remis à zéro');
  // la nuit d'après, sans nourrir : aucun œuf de plus
  s.awakeMs = 30000;
  assertEqual(sleep(s).oeufs, 0);
  assertEqual(countItem(s, 'oeuf') <= 4, true);
});

test('« Nourrir tout » nourrit autant de poules que possible, dans la limite du blé', () => {
  const s = ranch();
  setInv(s, { ble: 1 });
  testAddHens(s, 4);
  const r = feedAllHens(s);
  assertEqual([r.ok, r.nourries, r.ratees], [true, 2, 0], '1 blé = 2 poules');
  assertEqual([s.poulailler.nourries, wheatTotal(s)], [2, 0]);
  assertEqual(feedAllHens(s).ok, false, 'plus de blé');
  assertEqual(feedHen(s).error, 'Pas assez de blé.');
  s.silo.ble = 10;
  const r2 = feedAllHens(s);
  assertEqual([r2.nourries, s.poulailler.nourries], [2, 4]);
  assertEqual(s.silo.ble, 9);
  assertEqual(feedAllHens(s).error, 'Toutes les poules sont nourries.');
  assertEqual(feedHen(s).ok, false);
  const t = ranch();
  assertEqual(feedAllHens(t).error, 'Aucune poule à nourrir.');
});

test('nourrissage : le blé est retiré une fois par poule et par nuit', () => {
  const s = ranch();
  s.silo.ble = 10;
  testAddHens(s, 1);
  assertEqual(feedHen(s).compte, true);
  assertEqual(feedHen(s).ok, false, 'une seule fois par nuit');
  assertEqual([s.silo.ble, s.poulailler.restes], [9, 1], 'une poule seule entame un blé entier');
});

test('productivité < 1 : un nourrissage manuel compte avec une probabilité égale à la productivité', () => {
  const trial = (health) => {
    const s = ranch();
    setHealth(s, health);
    s.silo.ble = 400;
    testAddHens(s, 4);
    return s;
  };
  // santé 30 → productivité ×0,5
  const s = trial(30);
  assertEqual(productivity(s), 50);
  let counted = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    s.poulailler.nourries = 0;
    s.poulailler.restes = 0;
    const wheatBefore = wheatTotal(s);
    const r = feedHen(s);
    assertEqual(r.ok, true);
    if (r.compte) {
      counted += 1;
      assertEqual(wheatTotal(s), wheatBefore - 1, 'un geste qui compte entame un blé');
      assertEqual(s.poulailler.nourries, 1);
    } else {
      assertEqual(wheatTotal(s), wheatBefore, 'un geste raté conserve le blé');
      assertEqual(s.poulailler.nourries, 0, 'la poule reste à nourrir');
    }
  }
  const rate = counted / N;
  assert(rate > 0.42 && rate < 0.58, `taux observé ${rate}, attendu ≈ 0,5`);
  // productivité ×0,25 (santé < 20) : environ un geste sur quatre
  const t = trial(10);
  assertEqual(productivity(t), 25);
  let c2 = 0;
  for (let i = 0; i < N; i++) {
    t.poulailler.nourries = 0;
    if (feedHen(t).compte) c2 += 1;
  }
  assert(c2 / N > 0.17 && c2 / N < 0.33, `taux observé ${c2 / N}, attendu ≈ 0,25`);
  // productivité 1 : le geste compte toujours et le générateur n'est pas tiré
  const u = trial(100);
  const seedBefore = u.rngSeed;
  assertEqual(feedHen(u).compte, true);
  assertEqual(u.rngSeed, seedBefore, 'aucun tirage à pleine productivité');
  // « Nourrir tout » applique la même règle poule par poule
  const v = trial(30);
  const all = feedAllHens(v);
  assertEqual(all.nourries + all.ratees, 4);
  assertEqual(v.poulailler.nourries, all.nourries);
  assertEqual(400 - wheatTotal(v), Math.ceil(all.nourries / 2));
});

test('productivité : le tirage vient du générateur à graine de l\'état (reproductible)', () => {
  const run = () => {
    const s = ranch();
    setHealth(s, 30);
    s.silo.ble = 100;
    s.rngSeed = 12345;
    testAddHens(s, 4);
    const out = [];
    for (let i = 0; i < 30; i++) {
      s.poulailler.nourries = 0;
      out.push(feedHen(s).compte);
    }
    return out;
  };
  assertEqual(run(), run());
});

test('tournesol : les graines récoltées servent à semer', () => {
  const s = ranch();
  setInv(s, {});
  const p = findPlot(s, 'potager-1');
  p.culture = 'tournesol';
  p.stade = 7;
  // printemps : 9 × 1,1 = 10 graines dans la Zone de culture
  assertEqual(harvest(s, 'potager-1', true).items, { graine_tournesol: 10 });
  assertEqual(countItem(s, 'graine_tournesol'), 10);
  assertEqual(seedStock(s, 'tournesol'), 10);
  assertEqual(plant(s, 'potager-2', 'tournesol').ok, true);
  assertEqual(countItem(s, 'graine_tournesol'), 9);
  assertEqual(findPlot(s, 'potager-2').culture, 'tournesol');
  assertEqual(plant(s, 'potager-3', 'tournesol').ok, true);
  assertEqual(countItem(s, 'graine_tournesol'), 8);
  // sans graines, on ne sème pas
  setInv(s, {});
  assertEqual(plant(s, 'potager-4', 'tournesol').ok, false);
  // et elles s'achètent au Marché au prix des graines (coefficient 2,0)
  s.pieces = 10;
  const r = buyItem(s, 'graine_tournesol');
  assertEqual([r.ok, r.cost], [true, 2]);
  assertEqual(plant(s, 'potager-4', 'tournesol').ok, true);
});

test('blé : un blé sert de graine, pris d\'abord dans l\'inventaire puis dans le Silo', () => {
  const s = ranch();
  setInv(s, { ble: 1 });
  s.silo.ble = 5;
  assertEqual(seedStock(s, 'ble'), 6);
  assertEqual(plant(s, 'potager-1', 'ble').ok, true);
  assertEqual([countItem(s, 'ble'), s.silo.ble], [0, 5], 'l\'inventaire d\'abord');
  assertEqual(plant(s, 'potager-2', 'ble').ok, true);
  assertEqual([countItem(s, 'ble'), s.silo.ble], [0, 4], 'puis le Silo');
  s.silo.ble = 0;
  assertEqual(plant(s, 'potager-3', 'ble').ok, false, 'plus de blé du tout');
  assertEqual(plant(s, 'potager-3', 'ble').error, 'Pas de graines : Blé.');
});

test('le blé et les graines de tournesol ne sont pas des aliments de la famille', () => {
  const s = ranch();
  setInv(s, { ble: 50, graine_tournesol: 50 });
  s.silo.ble = 20;
  const plan = planMeal(s);
  assertEqual(plan.mange, {});
  assertEqual(plan.energie, 0);
});

test('la famille mange les œufs (13 énergie) : ils périment avant les conserves', () => {
  const s = ranch();
  setInv(s, { oeuf: 4, conserve: 200 });
  const plan = planMeal(s);
  assertEqual(plan.mange.oeuf, 4);
  // Lot 11 (nutrition) : œuf 13, conserve 25.
  const conserves = Math.ceil((150 - 4 * DATA.items.oeuf.energie) / DATA.items.conserve.energie);
  assertEqual(plan.mange.conserve, conserves);
  assertEqual(plan.energie, 4 * DATA.items.oeuf.energie + conserves * DATA.items.conserve.energie);
});

test('migration v4 (Lot 3) → v5 : Silo et Poulailler apparaissent (plus de Champ), la partie est gardée', () => {
  const v4 = {
    version: 4, day: 12, awakeSeconds: 5, pieces: 321, rngSeed: 8, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir'], marche: { carotte: 1.5 },
    ...startFarm(), ...startHousehold(),
  };
  delete v4.champ;
  delete v4.silo;
  delete v4.poulailler;
  delete v4.jour.ble;
  delete v4.nuit.oeufs;
  const m = migrate({ v: 4, t: 0, s: v4 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [12, 321]);
  assertEqual(m.marche, { carotte: 150 }, 'coefficient converti en %');
  assertEqual('champ' in m, false, 'aucun Champ n\'est créé : la Zone de culture le remplace');
  assertEqual([m.potager.niveau, m.potager.parcelles.length], [1, 6]);
  assertEqual(m.silo, { construit: false, niveau: 1, ble: 0 });
  assertEqual(m.poulailler, { construit: false, niveau: 1, poules: 0, nourries: 0, restes: 0 });
  assertEqual([m.jour.ble, m.nuit.oeufs], [0, 0]);
  assertEqual(inventoryCounts(m).conserve, 160);
  // l'état migré tourne, construit et pond
  m.pieces = 500;
  assertEqual(buildPoulailler(m).ok, true);
  buyAnimal(m, 'poule');
  m.silo.ble = 0;
  setInv(m, { ble: 2, conserve: 200 });
  feedHen(m);
  m.awakeMs = 30000;
  const report = sleep(m);
  assertEqual([report.oeufs, countItem(m, 'oeuf')], [1, 1]);
  // une sauvegarde déjà en v5 n'est pas modifiée par la migration
  const again = migrate({ v: 5, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.poulailler, m.poulailler);
});

test('migration v0 → version courante : les chaînes mènent au Lot 4', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.silo.construit, false);
  assertEqual('champ' in m, false);
  assertEqual(m.potager.parcelles.map((p) => p.id), ['potager-1', 'potager-2', 'potager-3', 'potager-4', 'potager-5', 'potager-6']);
  assertEqual(m.jour.ble, 0);
});

test('mode test Lot 4 : +50 blés (Silo puis inventaire) et +4 poules dans la limite de la capacité', () => {
  const s = ranch();
  setInv(s, {});
  assertEqual(testAddWheat(s).ok, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [20, 30], 'Silo niveau 1 : 20, le reste déborde');
  assertEqual(testAddHens(s).ok, true);
  assertEqual(s.poulailler.poules, 4);
  testAddHens(s);
  assertEqual(s.poulailler.poules, 4, 'plafonné par la capacité du Poulailler');
  // sans poulailler, il est construit gratuitement
  const t = garden();
  t.pieces = 0;
  testAddHens(t);
  assertEqual([t.poulailler.construit, t.poulailler.poules, t.pieces], [true, 4, 0]);
  // sans Silo, tout va dans l'inventaire
  const u = garden();
  testAddWheat(u);
  assertEqual([u.silo.ble, countItem(u, 'ble')], [0, 50]);
});

test('mode test : « faire mûrir » et « +10 de chaque graine » couvrent aussi les cultures de plein champ', () => {
  const s = ranch();
  setInv(s, {});
  testAddSeeds(s);
  assertEqual(countItem(s, 'graine_tournesol'), 10);
  assertEqual(countItem(s, 'ble'), 10);
  plant(s, 'potager-2', 'ble');
  plant(s, 'potager-1', 'carotte');
  testRipenAll(s);
  assertEqual(isMature(findPlot(s, 'potager-2')), true);
  assertEqual(isMature(findPlot(s, 'potager-1')), true);
});

test('sérialisation JSON : le blé en terre, le Silo et les poules font l\'aller-retour', () => {
  const s = ranch();
  s.silo.ble = 7.5;
  testAddHens(s);
  feedHen(s);
  plant(s, 'potager-1', 'ble');
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assertEqual(wheatTotal(copy), wheatTotal(s));
});

test('rapport de réveil Lot 4 : œufs pondus et blé consommé', () => {
  const s = ranch();
  setInv(s, { ble: 4, conserve: 200 });
  testAddHens(s, 3);
  feedAllHens(s);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual([r.oeufs, r.bleConsomme, r.poules], [3, 2, 3]);
  s.awakeMs = 30000;
  const r2 = sleep(s);
  assertEqual([r2.oeufs, r2.bleConsomme], [0, 0], 'rien mangé la journée suivante');
});

/* ---------- Lot 5 : stations, recettes, Livre de recette ---------- */

// État de test : riche, les quatre stations construites, inventaire vide, batteries
// pleines, réservoir plein, panneau coupé (l'énergie ne bouge que par les consommateurs).
function atelier({ stations = ['four', 'cuisine', 'moulin', 'presse'] } = {}) {
  const s = ranch();
  for (const id of stations) assert(buildStation(s, id).ok, `construire ${id}`);
  s.pieces = 1000;
  setInv(s, {});
  testFillBatteries(s);
  s.panneaux[0].allume = false;
  return s;
}

// Fait avancer la simulation de `seconds` secondes par pas de 0,2 s.
function runFor(s, seconds, dt = 0.2) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tick(s, dt);
}

test('DATA Lot 5 : stations, recettes, farine et huile', () => {
  const S = DATA.STATIONS;
  assertEqual([S.four.cout, S.cuisine.cout, S.moulin.cout, S.presse.cout], [100, 150, 120, 150]);
  assertEqual([S.four.electrique, S.cuisine.electrique, S.moulin.electrique, S.presse.electrique], [false, false, true, true]);
  assertEqual([S.moulin.whParS, S.presse.whParS], [20, 30]);
  assertEqual(S.cuisine.requiert, 'four');
  assertEqual(S.four.debloque, ['recettes']);
  const R = DATA.recipes;
  // Lot 14 : temps des plats Four/Cuisine divisés par 2, arrondis au supérieur.
  assertEqual([R.pain.station, R.pain.temps, R.pain.ingredients, R.pain.eau], ['four', 10, [{ item: 'farine', qte: 2 }], 1]);
  assertEqual([R.omelette.station, R.omelette.temps], ['cuisine', 8]); // 15 / 2 = 7,5 → 8
  assertEqual([R.ratatouille.station, R.ratatouille.temps], ['cuisine', 15]);
  assertEqual([R.gratin_patates.station, R.gratin_patates.temps], ['four', 15]);
  assertEqual([R.compote.station, R.compote.temps, R.compote.ingredients], ['cuisine', 8, [{ ou: ['pomme', 'poire'], qte: 3 }]]);
  assertEqual([R.tarte_pommes.station, R.tarte_pommes.temps], ['four', 23]);
  assertEqual([R.farine.station, R.farine.temps, R.farine.sortie], ['moulin', 5, 'farine']);
  // Version 1.1 : 1 blé moulu rend aussi 1 paille, et la mouture se lance au Moulin.
  assertEqual([R.farine.ingredients, R.farine.qteSortie, R.farine.sousProduit, R.farine.horsLivre], [[{ item: 'ble', qte: 1 }], 1, { item: 'paille', qte: 1 }, true]);
  assertEqual([R.huile.sousProduit, R.huile.horsLivre], [undefined, undefined], 'la Presse ne change pas');
  assertEqual([R.huile.station, R.huile.temps, R.huile.ingredients], ['presse', 10, [{ item: 'graine_tournesol', qte: 3 }]]);
  assertEqual([DATA.items.farine.energie, DATA.items.huile.energie], [scaleEnergie(10), scaleEnergie(10)]);
  // Lot 13 : farine 1 → 2 (doublée) ; huile inchangée.
  assertEqual([DATA.items.farine.prix, DATA.items.huile.prix], [2, 4]);
  assertEqual([DATA.items.farine.edible, DATA.items.huile.edible], [false, false]);
});

test('énergie des plats : somme des ingrédients × 1,3, arrondie (pain 34, omelette 68, tarte aux pommes 90)', () => {
  // Lot 11 (nutrition) : énergies des ingrédients × 1,25 (voir DATA.items),
  // sauf gratin_patates qui porte un override explicite (energieForcee: 150).
  assertEqual(DATA.items.pain.energie, 34);
  assertEqual(DATA.items.omelette.energie, 68);
  assertEqual(DATA.items.ratatouille.energie, 53);
  assertEqual(DATA.items.gratin_patates.energie, 150);
  assertEqual(DATA.items.compote.energie, 39);
  assertEqual(DATA.items.tarte_pommes.energie, 90);
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
    assertEqual(DATA.items[item].energie, apres, `${item} : ${avant} → ${apres}`);
    assertEqual(scaleEnergie(avant), apres, `${item} : cohérent avec la règle d'arrondi`);
  }
});

test('Lot 11 (nutrition) : le Gratin de patates couvre exactement le besoin d\'une famille de 2 adultes + 2 enfants', () => {
  const s = garden();
  assertEqual(familyNeed(s), 150, '2 adultes (50) + 2 enfants (25) = 150');
  s.famille.reserve = {};
  setInv(s, { gratin_patates: 3 });
  const plan = planMeal(s);
  // un seul gratin est mangé : aucune consommation résiduelle inattendue
  assertEqual(plan.mange, { gratin_patates: 1 });
  assertEqual(plan.energie, 150);
  assertEqual(plan.couverture, 100);
  feedFamily(s);
  assertEqual(countItem(s, 'gratin_patates'), 2, 'les 2 gratins restants ne sont pas touchés');
});

test('Lot 11 (nutrition) : familyNeed() suit la composition de la famille', () => {
  const s = garden();
  assertEqual(familyNeed(s), 150, '2 adultes + 2 enfants');
  // 1 adulte + 2 enfants
  s.famille.membres = s.famille.membres.filter((m) => m.id !== 'adulte-2');
  assertEqual(familyNeed(s), 100);
  // 1 adulte seul
  s.famille.membres = s.famille.membres.filter((m) => !m.enfant);
  assertEqual(familyNeed(s), 50);
  // 3 adultes + 1 enfant
  const t = garden();
  t.famille.membres = [
    ...t.famille.membres,
    { id: 'adulte-3', nom: 'Adulte 3', enfant: false, sante: 100, malade: false },
  ].filter((m) => m.id !== 'enfant-2');
  assertEqual(familyNeed(t), 175, '3 × 50 + 1 × 25');
  // famille vide (cas limite)
  const u = garden();
  u.famille.membres = [];
  assertEqual(familyNeed(u), 0);
});

test('prix de vente des plats : somme des prix × 1,3, arrondi', () => {
  // Lot 12 : les productions de la ferme sont doublées à la source ; les
  // plats gardent la même formule (somme des prix d'ingrédients × 1,3) et
  // ne sont donc doublés qu'indirectement, une seule fois. Le pain, fait de
  // farine et d'eau, est doublé explicitement au Lot 13 (4 → 8, voir
  // recipes.pain.priceMultiplier).
  assertEqual(DATA.items.pain.prix, 8, 'pain : 4 × 2 (Lot 13)');
  assertEqual(DATA.items.omelette.prix, 21); // (3 œufs à 4 + huile 4) × 1,3 = 20,8
  assertEqual(DATA.items.ratatouille.prix, 18); // (2 + 4 + 4 + huile 4) × 1,3 = 18,2
  assertEqual(DATA.items.gratin_patates.prix, 21); // (3 patates à 4 + 1 œuf à 4) × 1,3 = 20,8
  assertEqual(DATA.items.ragout.prix, 36); // plat retiré (version 1.1) : son ancien prix, gardé tel quel
  assertEqual(DATA.items.compote.prix, 16); // 3 pommes à 4 × 1,3 = 15,6
  assertEqual(DATA.items.tarte_pommes.prix, 26); // farine à 2 depuis le Lot 13 (23 avant)
  // Productions de la ferme : ancienne valeur × 2.
  assertEqual([DATA.items.viande_mouton.prix, DATA.items.pomme.prix, DATA.items.poire.prix], [10, 4, 4]);
  // Anciennes viandes : le bœuf vaut le mouton ; la volaille vaut moins.
  assertEqual([DATA.items.viande_boeuf.prix, DATA.items.viande_volaille.prix, DATA.items.lait.prix], [10, 6, 8]);
});

test('Lot 12 : le gratin est doublé une seule fois (formule sur ingrédients déjà doublés, pas de ×2 en plus)', () => {
  const it = DATA.items;
  const R = DATA.RECETTES;
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
  oeuf: 2, pomme: 2, poire: 2, laine: 6,
  oignon: 1, ail: 2, poivron: 2, epinard: 1, fraise: 2, riz: 1,
  houblon: 3, cacao: 8, vanille: 15, cafe: 6,
  lait: 4,
};
// Version 1.1 : les viandes ne sont plus des productions de la ferme. Leur prix
// (déjà doublé au Lot 12) est écrit tel quel dans DATA.items.
const PRIX_ANCIENNES_VIANDES = { viande_mouton: 10, viande_boeuf: 10, viande_volaille: 6 };

test('Lot 12 : chaque production de la ferme se vend deux fois son ancien prix', () => {
  for (const [id, avant] of Object.entries(PRIX_PRODUCTIONS_AVANT_LOT_12)) {
    assertEqual(DATA.items[id].prix, avant * DATA.MARCHE.MULTIPLICATEUR_PRODUCTION, `${id} : ${avant} × 2`);
    assertEqual(DATA.items[id].prix, avant * 2, `${id} : ancienne valeur × 2`);
    assertEqual(sellPrice(id), avant * 2, `${id} : sellPrice()`);
  }
  // La liste déduite de DATA.crops / VERGER / ANIMAUX correspond exactement
  // à la liste attendue : ni oubli, ni objet en trop.
  assertEqual([...productionItemKeys()].sort(), Object.keys(PRIX_PRODUCTIONS_AVANT_LOT_12).sort());
  // Les anciennes viandes gardent leur prix sans passer par le doublement ; la
  // paille (sous-produit du Moulin) n'est pas doublée non plus.
  for (const [id, prix] of Object.entries(PRIX_ANCIENNES_VIANDES)) {
    assertEqual([productionItemKeys().has(id), DATA.items[id].prix, sellPrice(id)], [false, prix, prix], id);
  }
  assertEqual([productionItemKeys().has('paille'), DATA.items.paille.prix], [false, 1]);
});

test('Lot 12 : graines, conserve, huile inchangées ; aucun bâtiment, animal ni arbre doublé', () => {
  const it = DATA.items;
  for (const [id, def] of Object.entries(it)) {
    if (def.category === 'graine') assertEqual(def.prix, 1, `${id} : graine inchangée`);
  }
  assertEqual(it.graine_tournesol.prix, 1, 'le tournesol récolte des graines : non doublées');
  assertEqual([it.conserve.prix, it.huile.prix], [3, 4]); // la farine, elle, double au Lot 13
  // Prix d'achat des graines au Marché : prix inchangé × plancher 2,0.
  assertEqual(buyPrice(garden(), 'graine_carotte'), 2);
  // Constructions, améliorations, animaux, arbres, soins : hors périmètre.
  assertEqual([DATA.POULAILLER.CONSTRUCTION, DATA.SERRE.CONSTRUCTION, DATA.FRIGO.CONSTRUCTION], [40, 400, 600]);
  assertEqual(DATA.STATIONS.four.cout, 100);
  assertEqual(DATA.UPGRADE_COST, [0, 40, 100, 250, 600]);
  assertEqual([DATA.ANIMAUX.poule.prix, DATA.ANIMAUX.mouton.prix, DATA.ANIMAUX.vache.prix], [15, 60, 200]);
  assertEqual([DATA.VERGER.ARBRES.pommier.prix, DATA.VERGER.ARBRES.poirier.prix], [40, 40]);
  assertEqual(DATA.FAMILY.SOIN.base, 20);
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
  const affiche = buyPrice(t, 'tomate');
  assertEqual(affiche, Math.ceil(DATA.items.tomate.prix * 1.2));
  const avantAchat = t.pieces;
  const b = buyItem(t, 'tomate');
  assertEqual([b.ok, b.cost], [true, affiche]);
  assertEqual(t.pieces, avantAchat - affiche);
  // Revendre ce qu'on vient d'acheter reste perdant (achat > vente).
  assert(buyPrice(garden(), 'tomate') > sellPrice('tomate'), 'acheter coûte plus cher que revendre');
});

test('Marché : les articles rangés au frigo se vendent aussi (l\'inventaire part d\'abord)', () => {
  const s = garden();
  s.pieces = 1000;
  buildFridge(s);
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
  buildFridge(t);
  buyItem(t, 'tomate', 3);
  moveToFridge(t, 'tomate', 3);
  assertEqual(marketCoef(t, 'tomate'), 150);
  sellItem(t, 'tomate', 3);
  assertEqual(marketCoef(t, 'tomate'), 120);
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
};

test('Lot 14 : temps de préparation des plats Four/Cuisine divisés par 2 (arrondi au supérieur), transformations intactes', () => {
  const ids = Object.keys(DATA.recipes).filter((id) => !DATA.recipes[id].transformation);
  assertEqual([...ids].sort(), Object.keys(TEMPS_PLATS_AVANT_LOT_14).sort(), 'aucun plat oublié ni en trop');
  for (const [id, avant] of Object.entries(TEMPS_PLATS_AVANT_LOT_14)) {
    const r = DATA.recipes[id];
    assert(['four', 'cuisine'].includes(r.station), `${id} : plat du Four ou de la Cuisine`);
    assertEqual(r.temps, Math.ceil(avant / 2), `${id} : ${avant} s / 2 arrondi au supérieur`);
    assert(Number.isInteger(r.temps), `${id} : temps entier`);
  }
  // Cas à demi-seconde : arrondi vers le haut, jamais vers le bas.
  assertEqual([DATA.recipes.omelette.temps, DATA.recipes.tarte_pommes.temps, DATA.recipes.pain_ail.temps], [8, 23, 8]);
  // Moulin et Presse : inchangés.
  assertEqual([DATA.recipes.farine.temps, DATA.recipes.huile.temps], [5, 10]);
  // La durée d'une préparation lancée est bien le nouveau temps.
  const s = atelier();
  setInv(s, { oeuf: 3, huile: 1 });
  assert(startRecipe(s, 'omelette').ok);
  assertEqual(s.stations.cuisine.tache.dureeMs, 8000);
});

test('Lot 13 : farine et pain se vendent deux fois leur ancien prix', () => {
  assertEqual([DATA.items.farine.prix, sellPrice('farine')], [2, 2], 'farine : 1 × 2');
  assertEqual([DATA.items.pain.prix, sellPrice('pain')], [8, 8], 'pain : 4 × 2');
  assertEqual(DATA.items.huile.prix, 4, 'l\'huile n\'est pas concernée');
  // Le pain garde la formule des plats sur ses ingrédients (farine doublée) avec
  // son coefficient dédié : (2 farines à 2 + 1 L d'eau) × 1,6 = 8, et non 7 (×1,3).
  assertEqual(DATA.recipes.pain.priceMultiplier, 160);
  assertEqual(dishPrice('pain'), 8);
  assertEqual(DATA.items.pain.prix, dishPrice('pain'));
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
    const r = DATA.recipes[id];
    assert(!!r, `recette ${id} absente de DATA.recipes`);
    assert(!!DATA.STATIONS[r.station], `${id} : station ${r.station} inconnue`);
    assert(Array.isArray(r.ingredients) && r.ingredients.length > 0, `${id} : ingrédients manquants`);
    for (const ing of r.ingredients) {
      for (const item of ingredientOptions(ing)) {
        assert(!!DATA.items[item], `${id} : ingrédient ${item} absent de DATA.items`);
      }
      assert(typeof ing.qte === 'number' && ing.qte > 0, `${id} : quantité invalide pour ${ing.item || ing.ou}`);
    }
    assert(typeof r.temps === 'number' && r.temps > 0, `${id} : temps invalide`);
    if (r.eau != null) assert(typeof r.eau === 'number' && r.eau > 0, `${id} : eau invalide`);
  }
});

test('nouvelles recettes : aucune n\'est une transformation, toutes deviennent des items « plat »', () => {
  for (const id of NOUVELLES_RECETTES) {
    const r = DATA.recipes[id];
    assert(!r.transformation, `${id} ne doit pas être classée comme une transformation`);
    const it = DATA.items[id];
    assert(!!it, `${id} doit être enregistrée comme item par registerDishItems()`);
    assertEqual([it.category, it.plat, it.edible], ['plat', true, true], id);
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
    assertEqual([dishEnergy(id), DATA.items[id].energie], [energie, energie], id);
    assertEqual([dishPrice(id), DATA.items[id].prix], [prix, prix], id);
  }
});

test('4 recettes de luxe : prix ×3 sur les ingrédients (pas le coefficient ×1,3 normal), énergie inchangée', () => {
  for (const id of RECETTES_LUXE) {
    assertEqual(DATA.recipes[id].priceMultiplier, 300, id);
  }
  const R = DATA.RECETTES;
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
    // Énergie : calcul normal (×COEF_PLAT), priceMultiplier ne la concerne pas.
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
    s.stations[DATA.recipes[id].station].tache = null; // station libre entre deux essais
    assertEqual(recipeStatus(s, id).code, 'manque', `${id} sans ingrédients`);
    assertEqual(startRecipe(s, id).ok, false, `${id} refusée sans ingrédients`);
    // Avec les ingrédients (et l'eau, si nécessaire) : prête, et se lance.
    setInv(s, stocks[id]);
    s.eauMl = ml(40);
    assertEqual(recipeStatus(s, id).code, 'pret', `${id} avec ses ingrédients`);
    assertEqual(startRecipe(s, id).ok, true, `${id} se lance`);
    assertEqual(s.stations[DATA.recipes[id].station].tache.recette, id);
  }
});

test('arbre v2 : 10 recettes libres, 11 débloquées par un nœud', () => {
  const s = atelier();
  const libres = Object.keys(DATA.recipes).filter((id) => recipeUnlocked(s, id));
  assertEqual(libres.sort(), [...DATA.techtree.RECETTES_LIBRES].sort());
  assertEqual(libres.length, 10);
  assertEqual(Object.keys(DATA.recipes).length - libres.length, 11);
  for (const id of Object.keys(DATA.recipes)) assert(recipeUnlocked(s, id) || recipeNode(id), `${id} : libre ou débloquée par un nœud`);
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
  assertEqual([shelfLife('bocal_legumes'), DATA.items.bocal_legumes.energie], [null, 40]);
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

test('arbre v2 : effets sur l\'énergie (usure, délestage, frigo, hiver, pompe)', () => {
  // Entretien préventif : 1 point d'usure toutes les 80 s de marche au lieu de 60 s
  const s = farm();
  grantTech(s, 'en_entretien');
  runFor(s, 60);
  assertEqual(s.panneaux[0].usure, 0);
  runFor(s, 20);
  assertEqual(s.panneaux[0].usure, 1);
  // Panneaux orientables : hiver 85 % au lieu de 70 %
  const h = farm();
  h.day = 31;
  assertEqual(panelOutput(h.panneaux[0], h), kwh(0.021));
  grantTech(h, 'en_hiver');
  assertEqual(panelOutput(h.panneaux[0], h), Math.floor((kwh(0.03) * 85) / 100));
  h.day = 11;
  assertEqual(panelOutput(h.panneaux[0], h), kwh(0.039), 'l\'été n\'est pas touché');
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
  d.batteries[0].chargeMwh = kwh(0.4); // 8 % de 5 000 Wh
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
  buyDevice(s, 'panneau'); // payé 72
  s.panneaux[1].usure = 75;
  s.panneaux[0].usure = 75; // appareil de départ : entretien gratuit
  s.awakeMs = 30000;
  let r = sleep(s);
  assertEqual(r.entretiens, [], 'sans le nœud : rien');
  grantTech(s, 'en_entretien_auto');
  const pieces = s.pieces;
  s.awakeMs = 30000;
  r = sleep(s);
  assertEqual(r.entretiens.map((e) => [e.id, e.cost]), [['panneau-1', 0], ['panneau-2', 15]]);
  assertEqual([s.panneaux[0].usure, s.panneaux[1].usure, pieces - s.pieces], [0, 0, 15]);
  // pluie : 20 L au printemps, dans la limite du réservoir
  grantTech(s, 'ea_pluie');
  s.eauMl = ml(30);
  s.awakeMs = 30000;
  r = sleep(s);
  assertEqual([r.pluie, s.eauMl], [10, ml(40)], 'plafonné à la place libre');
  s.eauMl = 0;
  s.day = 11; // été : 5 L
  s.awakeMs = 30000;
  assertEqual(sleep(s).pluie, 5);
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
  // Outils de jardin : Arroser tout, Récolter tout
  const g = garden();
  testAddSeeds(g);
  plant(g, 'potager-1', 'carotte');
  plant(g, 'potager-2', 'carotte');
  plantRipe(g, 'potager-3', 'patate');
  assertEqual(waterAll(g, 'potager').ok, false, 'sans le nœud');
  grantTech(g, 'cu_outils');
  assertEqual(waterAll(g, 'potager'), { ok: true, arrosees: 2, sansEau: 0 });
  assertEqual(harvestAll(g, 'potager').recoltees, 1);
  assertEqual(harvestAll(g, 'potager').ok, false, 'plus rien de mûr');
  // Sélection des semences : +1 graine, carotte montée en graine 8 au lieu de 6
  const m = garden();
  grantTech(m, 'cu_semences');
  plantRipe(m, 'potager-1', 'carotte');
  toggleBolting(m, 'potager-1');
  testRipenAll(m);
  const avant = countItem(m, 'graine_carotte');
  assertEqual(harvest(m, 'potager-1').items.graine_carotte, 8);
  assertEqual(countItem(m, 'graine_carotte') - avant, 8);
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

test('arbre v2 : effets sur la famille (soins, récupération, menus, cellier)', () => {
  const s = garden();
  assertEqual(careCost(s), 20);
  grantTech(s, 'fa_remedes');
  assertEqual(careCost(s), 14, '20 × 70 %');
  s.famille.soinsPayes = 2;
  assertEqual(careCost(s), 32, '45 × 70 % = 31,5 → 32');
  // récupération d'un malade : 3 au lieu de 2
  const m = s.famille.membres[0];
  m.sante = 10;
  m.malade = true;
  updateHealth(s, 100, 0);
  assertEqual(m.sante, 13);
  // Menus variés : bonus des plats jusqu'à +5
  const mange = { pain: 1, omelette: 1, ratatouille: 1, gratin_patates: 1, compote: 1 };
  assertEqual(dishBonus(mange, s), 3);
  grantTech(s, 'fa_menus');
  assertEqual(dishBonus(mange, s), 5);
  // Cellier : +1 nuit hors frigo pour ce qui périme, rien pour le reste
  grantTech(s, 'fa_cellier');
  setInv(s, {});
  addItem(s, 'carotte', 1);
  addItem(s, 'ble', 1);
  assertEqual([lotsOf(s, 'carotte')[0].nightsLeft, lotsOf(s, 'ble')[0].nightsLeft], [7, 11]);
  addItem(s, 'conserve', 1);
  assertEqual(lotsOf(s, 'conserve')[0].nightsLeft, null);
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
  assertEqual([findPlot(s, 'potager-1').stade, findPlot(s, 'potager-2').stade], [1, 3], 'dans l\'ordre des parcelles sans le nœud');
  const t = garden();
  testAddSeeds(t);
  grantTech(t, 'ea_gestion');
  plant(t, 'potager-1', 'carotte');
  plant(t, 'potager-2', 'carotte');
  findPlot(t, 'potager-2').stade = 3;
  t.eauMl = ml(2);
  setInv(t, { conserve: 200, graine_carotte: 5 });
  sleepOnce(t);
  assertEqual([findPlot(t, 'potager-1').stade, findPlot(t, 'potager-2').stade], [0, 4], 'la plus proche de la récolte d\'abord');
});

test('arbre v2 : Routine familiale (réglage « Dormir tout seul »)', () => {
  const s = farm();
  assertEqual(setRoutine(s, true).ok, false, 'sans le nœud');
  assertEqual(routineDue(s), false);
  grantTech(s, 'fa_routine');
  assertEqual(setRoutine(s, true).ok, true);
  assertEqual(routineDue(s), false, 'éveil minimal pas encore écoulé');
  s.awakeMs = awakeRequired(s) * 1000;
  assertEqual(routineDue(s), true);
  setRoutine(s, false);
  assertEqual(routineDue(s), false, 'désactivée');
  assertEqual(createInitialState(1).routine, false);
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
  assertEqual(DATA.items.cafe.category, 'ingrédient', 'l\'ingrédient de la Serre reste inchangé');
  assertEqual(DATA.items.cafe.edible, false);
  assertEqual(DATA.items.cafe_boisson.category, 'plat');
  assertEqual(DATA.items.cafe_boisson.edible, true);
});

test('la farine et l\'huile ne se mangent pas seules ; les plats se mangent', () => {
  const s = atelier();
  setInv(s, { farine: 50, huile: 50 });
  assertEqual(planMeal(s).mange, {});
  setInv(s, { pain: 3, omelette: 1, conserve: 200 });
  const plan = planMeal(s);
  assertEqual([plan.mange.pain, plan.mange.omelette], [3, 1]);
});

test('état initial Lot 5 : quatre stations à construire, libres, sans appareil', () => {
  const s = createInitialState(1);
  for (const id of ['four', 'cuisine', 'moulin', 'presse']) {
    assertEqual(s.stations[id], { construit: false, tache: null, appareil: null }, id);
  }
  assertEqual(allDevices(s).length, 3, 'panneau, batterie, pompe seulement');
  assertEqual(s.unlockedTabs.includes('recettes'), false);
});

test('construire le Four : 100 pièces, et l\'onglet Livre de recette s\'ouvre', () => {
  const s = ranch();
  s.pieces = 100;
  const r = buildStation(s, 'four');
  assertEqual([r.ok, r.cost, s.pieces], [true, 100, 0]);
  assertEqual(s.stations.four.construit, true);
  assertEqual(s.unlockedTabs.includes('recettes'), true, 'onglet ouvert par le Four');
  assertEqual(s.unlockedTabs.filter((t) => t === 'recettes').length, 1);
  assertEqual(allDevices(s).length, 3, 'le Four n\'est pas un appareil électrique');
  assertEqual(buildStation(s, 'four').ok, false, 'une seule de chaque');
});

test('la Cuisine (150) se construit une fois le Four bâti', () => {
  const s = ranch();
  const before = s.pieces;
  const r = buildStation(s, 'cuisine');
  assertEqual([r.ok, r.error], [false, 'Construis d\'abord le Four.']);
  assertEqual(s.pieces, before, 'rien n\'est payé');
  buildStation(s, 'four');
  s.pieces = 149;
  assertEqual(buildStation(s, 'cuisine').ok, false, 'pas assez de pièces');
  s.pieces = 150;
  assertEqual(buildStation(s, 'cuisine').ok, true);
  assertEqual(s.pieces, 0);
  assertEqual(buildStation(s, 'cuisine').ok, false, 'une seule Cuisine');
});

test('le Moulin (120) et la Presse (150) se construisent sans le Four et rejoignent le parc', () => {
  const s = ranch();
  s.pieces = 270;
  assertEqual(buildStation(s, 'moulin').ok, true);
  assertEqual(buildStation(s, 'presse').ok, true);
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

test('la vitesse d\'une préparation suit la productivité de la famille', () => {
  const s = atelier();
  setHealth(s, 60); // 80 %
  setInv(s, { farine: 2 });
  startRecipe(s, 'pain');
  assertEqual(taskTimeLeft(s, 'four'), 13, 'temps réel restant 10 ÷ 80 % = 12,5, arrondi à 13 s');
  runFor(s, 10);
  assertEqual(countItem(s, 'pain'), 0, 'pas fini à 10 s');
  runFor(s, 2.5);
  assertEqual(countItem(s, 'pain'), 1);
  setHealth(s, 30); // ×0,5
  setInv(s, { farine: 2 });
  startRecipe(s, 'pain');
  assertEqual(taskTimeLeft(s, 'four'), 20);
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
  for (const [id, r] of Object.entries(DATA.recipes)) {
    for (const ing of r.ingredients) {
      for (const item of ingredientOptions(ing)) assert(!viandes.includes(item), `${id} ne demande pas de viande`);
    }
  }
  for (const id of PLATS_RETIRES) {
    assertEqual(DATA.recipes[id], undefined, `${id} n'est plus une recette`);
    assertEqual(DATA.techtree.RECETTES_LIBRES.includes(id), false, id);
    for (const n of Object.values(DATA.techtree.noeuds)) assertEqual((n.effet.recettes || []).includes(id), false, `${id} dans ${n.nom}`);
    const it = DATA.items[id];
    assertEqual([it.category, it.plat, it.edible, it.retire], ['plat', true, true, true], id);
    assertEqual([isBuyable(id), shelfLife(id)], [false, 6], `${id} : ne s'achète pas, se garde comme un plat`);
  }
  assertEqual(PLATS_RETIRES.map((id) => [DATA.items[id].energie, DATA.items[id].prix]), [[144, 36], [81, 26], [144, 36], [75, 23]], 'énergie et prix d\'avant');
  assertEqual(Object.keys(DATA.PLATS_RETIRES), PLATS_RETIRES);
  assertEqual(DATA.techtree.noeuds.cui_rotisserie, undefined, 'le nœud Rôtisserie a disparu');
  assertEqual(DATA.techtree.NOEUDS_RETIRES, { cui_rotisserie: { pt: 1, cout: 300 } });
  // Les viandes : ni produites, ni achetables, mais toujours des aliments qui se vendent.
  for (const id of viandes) {
    assertEqual([DATA.items[id].edible, isBuyable(id), buyItem(garden(), id).ok], [true, false, false], id);
  }
  const s = atelier();
  setInv(s, { viande_mouton: 2, carotte: 2, patate: 1, ragout: 1, roti_boeuf: 1 });
  assertEqual(startRecipe(s, 'ragout'), { ok: false, error: 'Recette inconnue.' });
  assertEqual(countItem(s, 'viande_mouton'), 2, 'rien n\'est retiré');
  // La famille mange encore un ancien plat et de l'ancienne viande ; les plats comptent pour le bonus.
  const plan = planMeal(s);
  assert(plan.mange.ragout === 1 || plan.mange.roti_boeuf === 1 || plan.mange.viande_mouton > 0, 'ils sont au menu');
  assertEqual(dishBonus({ ragout: 1, roti_boeuf: 1 }), 2);
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

test('Moulin : 1 blé → 1 farine et 1 paille en 5 s, 0,02 kWh/s pris sur les batteries', () => {
  const s = atelier();
  setInv(s, { ble: 1 });
  assertEqual(startMilling(s, 1), { ok: true, quantite: 1, enAttente: 0 });
  assertEqual(countItem(s, 'ble'), 0);
  runFor(s, 4.8);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [0, 0]);
  assertEqual(s.stations.moulin.appareil.conso, kwh(0.02), 'consommation 0,02 kWh/s');
  // (l'usure, qui monte pendant la marche, allonge la préparation de quelques millisecondes)
  runFor(s, 0.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [1, 1], '1 blé donne 1 farine et 1 paille');
  assertEqual(s.stations.moulin.tache, null);
  assertEqual(s.batteries[0].chargeMwh, kwh(5 - 0.1), `5 s × 0,02 = 0,1 kWh : ${s.batteries[0].chargeMwh}`);
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

test('Moulin : mêmes règles que la pompe, batteries vidées en sens inverse', () => {
  const s = atelier();
  testAddDevice(s, 'batterie');
  testFillBatteries(s);
  setInv(s, { ble: 1 });
  startMilling(s, 1);
  runFor(s, 5.4);
  assertEqual(s.batteries[1].chargeMwh, kwh(5 - 0.1), 'la dernière batterie remplie se vide d\'abord');
  assertEqual(s.batteries[0].chargeMwh, kwh(5), 'la première reste pleine');
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
  assertEqual([m.appareil.usure, m.tache.resteMs, s.batteries[0].chargeMwh], [0, 5000, kwh(5)]);
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
  assertEqual(s.batteries[0].chargeMwh, kwh(5 - 0.3), `10 s × 0,03 = 0,3 kWh : ${s.batteries[0].chargeMwh}`);
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
  assertEqual(s.batteries[0].chargeMwh, kwh(5 - 0.1 - 0.3), `${s.batteries[0].chargeMwh}`);
});

/* ---------- version 1.1 : le Moulin moud par quantité, et donne de la paille ---------- */

test('Moulin : la mouture ne se lance plus depuis le Livre de recette', () => {
  const s = atelier();
  setInv(s, { ble: 3 });
  assertEqual(startRecipe(s, 'farine'), { ok: false, error: 'Le blé se moud directement au Moulin.' });
  assertEqual([countItem(s, 'ble'), s.stations.moulin.tache], [3, null], 'rien n\'est retiré, rien ne démarre');
  assertEqual(DATA.recipes.farine.horsLivre, true);
  // seule la mouture est hors du livre
  assertEqual(Object.keys(DATA.recipes).filter((id) => DATA.recipes[id].horsLivre), ['farine']);
});

test('Moulin : moudre 3 blés donne 3 farines et 3 pailles, un blé après l\'autre', () => {
  const s = atelier();
  setInv(s, { ble: 5 });
  assertEqual(startMilling(s, 3), { ok: true, quantite: 3, enAttente: 2 });
  assertEqual(countItem(s, 'ble'), 2, 'les 3 blés sortent du stock tout de suite');
  assertEqual([millPending(s), millTimeLeft(s)], [3, 15]);
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [1, 1, 2], 'le premier blé est moulu, les autres suivent');
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [2, 2, 1]);
  runFor(s, 5.4);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [3, 3, 0]);
  assertEqual([s.stations.moulin.tache, millTimeLeft(s), countItem(s, 'ble')], [null, 0, 2]);
  // 3 blés × 5 s × 0,02 kWh/s = 0,3 kWh : la même énergie que trois moutures séparées
  assertEqual(s.batteries[0].chargeMwh, kwh(5 - 0.3));
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
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), s.stations.moulin.tache], [5, 5, null]);
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
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), s.stations.moulin.tache], [1, 1, null]);
});

test('Moulin : la nuit termine seulement le blé en cours, le reste reprend au réveil', () => {
  const s = atelier();
  setInv(s, { ble: 10, conserve: 200 });
  startMilling(s, 10);
  runFor(s, 2);
  const charge = s.batteries[0].chargeMwh;
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.termine, { farine: 1, paille: 1 }, 'un seul blé fini pendant la nuit');
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille'), millPending(s)], [1, 1, 9]);
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
  assertEqual(r.terminees, { farine: 3, paille: 3 }, '17 s : 3 blés moulus');
  assertEqual(r.enCours.map((e) => [e.station, e.recette, e.quantite]), [['moulin', 'farine', 3]]);
  assertEqual(r.enCours[0].reste, 13, '3 s sur le blé en cours + 2 blés de 5 s');
  const fin = simulateOffline(s, 600);
  assertEqual([fin.terminees, fin.enCours, s.stations.moulin.tache], [{ farine: 3, paille: 3 }, [], null]);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [6, 6]);
});

test('Moulin : la Préparation rapide raccourcit chaque blé du lot', () => {
  const s = atelier();
  s.technologies.push('prepa_1');
  setInv(s, { ble: 3 });
  startMilling(s, 3);
  assertEqual([s.stations.moulin.tache.dureeMs, millTimeLeft(s)], [4000, 12]);
  runFor(s, 12.6);
  assertEqual([countItem(s, 'farine'), countItem(s, 'paille')], [3, 3]);
});

test('bonus de santé : +1 par plat différent mangé, plafonné à +3', () => {
  const nuit = (inv, sante = 50) => {
    const s = atelier();
    setHealth(s, sante);
    setInv(s, { conserve: 200, ...inv });
    const plan = planMeal(s);
    assertEqual(plan.couverture, 100);
    sleepNow(s);
    return s;
  };
  const sleepNow = (s) => {
    s.awakeMs = 30000;
    return sleep(s);
  };
  // sans plat : +5 (couverture 100 %)
  assertEqual(nuit({}).famille.membres[0].sante, 55);
  // un plat : +1
  assertEqual(nuit({ omelette: 1 }).famille.membres[0].sante, 56);
  // deux plats différents : +2 ; le pain compte comme un plat
  assertEqual(nuit({ omelette: 1, pain: 2 }).famille.membres[0].sante, 57);
  // un même plat en plusieurs exemplaires ne compte qu'une fois
  assertEqual(nuit({ omelette: 4 }).famille.membres[0].sante, 56);
  // trois plats différents (légers, tous mangés avant que le besoin soit
  // couvert) : plafonné à +3
  assertEqual(nuit({ pain: 1, compote: 1, omelette: 1 }).famille.membres[0].sante, 58);
  // la santé ne dépasse jamais 100
  assertEqual(nuit({ pain: 1, compote: 1, omelette: 1 }, 99).famille.membres[0].sante, 100);
  // le plafond est bien +3, quel que soit le nombre de plats différents reçus
  // (fonction pure, indépendante du besoin de la famille et donc de la nuit simulée)
  assertEqual(dishBonus({ omelette: 1, pain: 1, ragout: 1, compote: 1, tarte_pommes: 1 }), 3, '5 plats : toujours +3');
});

test('bonus de santé : il s\'ajoute à la variation (−5 devient −4), noté au rapport de réveil', () => {
  const s = atelier();
  setHealth(s, 50);
  // Lot 11 (nutrition) : omelette 68 + 3 conserves à 25 = 143 sur 150 (couverture ≈95 %).
  setInv(s, { omelette: 1, conserve: 3 });
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.bonusPlats, 1);
  assertEqual(s.famille.membres[0].sante, 46, '−5 + 1');
  assertEqual(r.mange.omelette, 1);
  s.awakeMs = 30000;
  assertEqual(sleep(s).bonusPlats, 0, 'plus de plat, plus de bonus');
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
  assertEqual([countItem(s, 'pain'), countItem(s, 'farine'), countItem(s, 'paille')], [1, 1, 1]);
  assertEqual([s.stations.four.tache, s.stations.moulin.tache], [null, null], 'stations libérées');
  assertEqual(r.termine, { pain: 1, farine: 1, paille: 1 });
  s.awakeMs = 30000;
  assertEqual(sleep(s).termine, {}, 'rien la nuit suivante');
});

test('Dormir : le plat fini pendant la nuit se mange à partir du repas suivant', () => {
  const s = atelier();
  setInv(s, { farine: 2, conserve: 200 });
  startRecipe(s, 'pain');
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.mange.pain, undefined, 'pas mangé cette nuit');
  assertEqual(countItem(s, 'pain'), 1);
  assertEqual(lotsOf(s, 'pain')[0].nightsLeft, 6, 'le pain vieillit d\'une nuit comme les œufs pondus');
  s.awakeMs = 30000;
  assertEqual(sleep(s).mange.pain, 1, 'mangé la nuit suivante');
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
  buildStation(s, 'moulin');
  buildStation(s, 'presse');
  assertEqual(s.unlockedTabs.includes('recettes'), false);
  buildStation(s, 'four');
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
  const m = migrate({ v: 5, t: 0, s: v5 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [20, 432]);
  for (const id of ['four', 'cuisine', 'moulin', 'presse']) {
    assertEqual(m.stations[id], { construit: false, tache: null, appareil: null }, id);
  }
  assertEqual([m.nuit.bonusPlats, m.nuit.termine], [0, {}]);
  assertEqual(inventoryCounts(m).conserve, 160);
  // l'état migré construit, cuisine et dort
  m.pieces = 500;
  assertEqual(buildStation(m, 'four').ok, true);
  assertEqual(m.unlockedTabs.includes('recettes'), true);
  addItem(m, 'farine', 2);
  assertEqual(startRecipe(m, 'pain').ok, false, 'le réservoir de cette sauvegarde est vide');
  m.eauMl = ml(5);
  assertEqual(startRecipe(m, 'pain').ok, true);
  m.awakeMs = 30000;
  assertEqual(sleep(m).termine, { pain: 1 });
  // une sauvegarde déjà en v6 n'est pas modifiée par la migration
  const again = migrate({ v: 6, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.stations, m.stations);
});

test('migration v0 → version courante : les chaînes mènent au Lot 5', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.stations.moulin.construit, false);
  assertEqual(allDevices(m).length, 3);
});

/* ---------- Lot 6 : Étable — moutons, vaches, paille, laine, lait ---------- */

// État de test : Étable ouverte aux moutons et aux vaches (10 places), avec
// assez de pièces pour tout acheter. (« pature » : nom historique.)
function pature({ built = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (built) assert(buildPaturage(s).ok, 'ouvrir l\'Étable');
  return s;
}

function fillSheep(s, n) {
  for (let i = 0; i < n; i++) assert(buySheep(s).ok, `mouton ${i + 1}`);
}

// Achète n vaches, sur le modèle de fillSheep().
function fillCows(s, n) {
  for (let i = 0; i < n; i++) assert(buyCow(s).ok, `vache ${i + 1}`);
}

function sleepOnce(s) {
  s.awakeMs = 30000;
  return sleep(s);
}

// Met exactement `n` pailles en stock.
function setStraw(s, n) {
  takeItem(s, 'paille', countItem(s, 'paille'));
  if (n > 0) addItem(s, 'paille', n);
}

test('DATA Lot 6 : places de l\'Étable, mouton, vache, paille', () => {
  assertEqual(DATA.PATURAGE, { deblocage: 150, placesDepart: 10, placesParMouton: 1, placesParVache: 3, prixPlace: 40, croissance: 120, nourriture: 'paille' });
  assertEqual(DATA.ANIMAUX.mouton, { nom: 'Mouton', icone: '🐑', prix: 60, pailleParNuit: 1, joursLaine: 2, laineParTonte: 1, laine: 'laine' });
  assertEqual(DATA.ANIMAUX.vache, { nom: 'Vache', icone: '🐄', prix: 200, pailleParNuit: 2, laitParNuit: 1, lait: 'lait' });
  // Lot 12 : laine 6 → 12, lait 4 → 8 (prix de vente doublés).
  assertEqual([DATA.items.laine.prix, DATA.items.laine.edible, shelfLife('laine')], [12, false, null]);
  assertEqual([DATA.items.lait.energie, DATA.items.lait.prix, shelfLife('lait')], [16, 8, 4]);
  // La paille : ni mangée ni périssable, vendue 1 pièce, jamais achetée au Marché.
  const p = DATA.items.paille;
  assertEqual([p.nom, p.prix, p.edible, p.category, p.rachetable], ['Paille', 1, false, 'produit', false]);
  assertEqual([shelfLife('paille'), isPerishable('paille'), isBuyable('paille'), isGraineComptoir('paille')], [null, false, false, false]);
  const memeIcone = Object.keys(DATA.items).filter((k) => k !== 'paille' && DATA.items[k].icone === p.icone);
  assertEqual(memeIcone, [], 'l\'icône de la paille n\'est celle d\'aucun autre objet');
  // Les anciennes viandes existent encore (anciennes sauvegardes), avec leur énergie et leur conservation.
  assertEqual([DATA.items.viande_mouton.energie, DATA.items.viande_mouton.prix, shelfLife('viande_mouton')], [scaleEnergie(30), 10, 5]);
  assertEqual([DATA.items.viande_boeuf.energie, DATA.items.viande_boeuf.prix], [38, 10]);
  assertEqual([DATA.items.viande_volaille.energie, DATA.items.viande_volaille.prix], [14, 6]);
});

test('état initial Lot 6 : Étable à ouvrir, sans place, mouton ni vache', () => {
  const s = createInitialState(1);
  assertEqual(s.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual([pastureCapacity(s), sheepCount(s), freeSheepPlaces(s)], [0, 0, 0]);
  assertEqual([cowCapacity(s), cowCount(s), freeCowPlaces(s)], [0, 0, 0]);
  assertEqual([stableOccupied(s), stableFree(s), strawNeed(s), strawMissing(s)], [0, 0, 0, 0]);
});

test('Étable : ouverte aux moutons et aux vaches pour 150 pièces, 10 places', () => {
  const s = garden();
  s.pieces = 149;
  assertEqual(buildPaturage(s).ok, false, 'refusé sans 150 pièces');
  assertEqual([s.pieces, s.paturage.construit, s.paturage.places], [149, false, 0]);
  s.pieces = 150;
  assertEqual(buildPaturage(s), { ok: true, cost: 150, places: 10 });
  assertEqual([s.pieces, s.paturage.construit, s.paturage.places], [0, true, 10]);
  assertEqual([pastureCapacity(s), freeSheepPlaces(s), cowCapacity(s), stableFree(s)], [10, 10, 3, 10]);
  assertEqual(buildPaturage(s).ok, false, 'une seule fois');
  // même équilibrage qu'avant : 1 place = 5 ares d'autrefois, une vache en prend 3
  assertEqual([maxSheep(10), maxSheep(11), maxSheep(1), maxSheep(0)], [10, 11, 1, 0]);
  assertEqual([maxCows(10), maxCows(9), maxCows(3), maxCows(2)], [3, 3, 1, 0]);
});

test('mouton : 60 pièces, refusé sans Étable ouverte ni pièces, sans poids', () => {
  const s = pature({ built: false });
  const r = buySheep(s);
  assertEqual([r.ok, s.pieces], [false, 5000], 'l\'Étable n\'est pas prête');
  buildPaturage(s);
  s.pieces = 59;
  assertEqual(buySheep(s).ok, false, 'pas assez de pièces');
  assertEqual(sheepCount(s), 0);
  s.pieces = 200;
  const ok = buyAnimal(s, 'mouton');
  assertEqual([ok.ok, ok.cost, s.pieces], [true, 60, 140]);
  assertEqual(s.paturage.moutons, [{ id: 'mouton-1', laine: 0 }], 'un identifiant et sa laine, rien d\'autre');
  assertEqual(animalPrice('mouton'), 60);
  buyAnimal(s, 'mouton');
  assertEqual(animalPrice('mouton'), 60, 'prix fixe, quel que soit le nombre');
  assertEqual(s.paturage.moutons.map((m) => m.id), ['mouton-1', 'mouton-2']);
});

test('mouton : refusé quand l\'Étable est pleine (10 places), sans effet sur les pièces', () => {
  const s = pature();
  fillSheep(s, 10);
  assertEqual([sheepCount(s), freeSheepPlaces(s)], [10, 0]);
  const before = s.pieces;
  const r = buyAnimal(s, 'mouton');
  assertEqual(r.ok, false);
  assertEqual([s.pieces, sheepCount(s)], [before, 10]);
});

test('places : 40, 48 puis 58 pièces pour les 11ᵉ, 12ᵉ et 13ᵉ places', () => {
  const s = pature();
  fillSheep(s, 10);
  assertEqual(pastureCost(s), 40);
  const prices = [];
  for (let i = 0; i < 3; i++) {
    const cost = pastureCost(s);
    const before = s.pieces;
    const r = buyPasture(s);
    assertEqual([r.ok, r.places], [true, 11 + i]);
    assertEqual(before - s.pieces, cost);
    prices.push(cost);
    assertEqual(freeSheepPlaces(s), 1);
    assert(buySheep(s).ok, 'le mouton suit la place');
  }
  assertEqual(prices, [40, 48, 58], '57,6 arrondi à 58');
  assertEqual([s.paturage.places, sheepCount(s), pastureCapacity(s)], [13, 13, 13]);
  assertEqual(pastureCost(s), 70, '14ᵉ place : 40 × 1,2³ = 69,12, arrondi à 70');
  // Étable agrandie (arbre) : +10 % par place au lieu de +20 %
  grantTech(s, 'el_paturage', false);
  assertEqual(pastureCost(s), 54, '40 × 1,1³ = 53,24, arrondi à 54');
});

test('places : refusée sans Étable ouverte ou sans pièces ; sinon à la suite, même s\'il en reste de libres', () => {
  const s = pature({ built: false });
  assertEqual(buyPasture(s).ok, false, 'l\'Étable n\'est pas prête');
  buildPaturage(s);
  assertEqual(s.paturage.places, 10);
  fillSheep(s, 10);
  s.pieces = 39;
  assertEqual(buyPasture(s).ok, false, 'pas assez de pièces');
  assertEqual([s.pieces, s.paturage.places], [39, 10]);
  s.pieces = 40 + 48 + 58;
  assertEqual(buyPasture(s).ok, true);
  assertEqual(buyPasture(s).ok, true, 'la place précédente est encore libre : l\'achat suivant passe quand même');
  assertEqual(buyPasture(s).ok, true);
  assertEqual([s.pieces, s.paturage.places, freeCowPlaces(s)], [0, 13, 1], '3 places de suite : de quoi loger une vache');
  assertEqual(buyPasture(s).ok, false, 'plus de pièces');
});

/* -- la paille : qui mange, qui produit -- */

test('paille : chaque nuit un mouton en mange 1 et une vache 2', () => {
  const s = pature();
  fillSheep(s, 3);
  fillCows(s, 2);
  assertEqual(strawNeed(s), 3 * 1 + 2 * 2);
  setStraw(s, 20);
  assertEqual([strawStock(s), strawMissing(s)], [20, 0]);
  const rap = feedLivestock(s);
  assertEqual(rap, { moutons: 3, vaches: 2, moutonsNourris: 3, vachesNourries: 2, paille: 7, manque: 0 });
  assertEqual(strawStock(s), 13);
  assertEqual(s.nuit.etable, rap);
  // une nuit complète : même décompte, noté dans le compte rendu du réveil
  const rep = sleepOnce(s);
  assertEqual([rep.etable.paille, rep.etable.manque, rep.paille, rep.pailleBesoin], [7, 0, 6, 7]);
  assertEqual(strawMissing(s), 1, 'il manquera 1 paille ce soir');
  // sans animaux, la paille ne bouge pas
  const t = pature();
  setStraw(t, 5);
  assertEqual(feedLivestock(t), { moutons: 0, vaches: 0, moutonsNourris: 0, vachesNourries: 0, paille: 0, manque: 0 });
  assertEqual(strawStock(t), 5);
});

test('laine : 1 laine toutes les 2 nuits nourries, tonte refusée avant', () => {
  const s = pature();
  fillSheep(s, 1);
  const id = s.paturage.moutons[0].id;
  setStraw(s, 10);
  assertEqual(shear(s, id).ok, false, 'tonte refusée à l\'achat');
  sleepOnce(s);
  assertEqual([s.paturage.moutons[0].laine, sheepToShear(s)], [1, 0]);
  assertEqual(shear(s, id), { ok: false, error: 'La laine n\'est pas encore prête (1 / 2 nuits nourri).' });
  assertEqual(countItem(s, 'laine'), 0);
  sleepOnce(s);
  assertEqual([s.paturage.moutons[0].laine, woolReady(s.paturage.moutons[0]), sheepToShear(s)], [2, true, 1]);
  const r = shear(s, id);
  assertEqual([r.ok, r.laine], [true, 1]);
  assertEqual([countItem(s, 'laine'), s.paturage.moutons[0].laine, sheepCount(s)], [1, 0, 1], 'le mouton reste');
  assertEqual(shear(s, id).ok, false, 'pas deux tontes de suite');
  for (let i = 0; i < 5; i++) sleepOnce(s);
  assertEqual(s.paturage.moutons[0].laine, 2, 'sans tonte, la laine reste prête (elle ne s\'accumule pas)');
  assertEqual(strawStock(s), 3, 'le mouton mange quand même sa paille chaque nuit');
  assertEqual(shear(s, id).ok, true);
  assertEqual(countItem(s, 'laine'), 2);
  assertEqual(shear(s, 'mouton-99').ok, false, 'mouton inconnu');
});

test('laine : une nuit sans paille n\'avance pas la laine, et ne l\'enlève pas', () => {
  const s = pature();
  fillSheep(s, 1);
  const m = s.paturage.moutons[0];
  setStraw(s, 1);
  sleepOnce(s);
  assertEqual([m.laine, strawStock(s)], [1, 0]);
  const rep = sleepOnce(s); // plus de paille
  assertEqual([m.laine, rep.etable.moutonsNourris, rep.etable.manque], [1, 0, 1], 'rien ne se passe : la laine attend');
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual([m.laine, sheepCount(s)], [1, 1], 'dix nuits sans paille : le mouton est toujours là, sans autre effet');
  setStraw(s, 1);
  sleepOnce(s);
  assertEqual([m.laine, woolReady(m)], [2, true], 'la laine reprend où elle en était');
});

test('lait : une vache nourrie donne 1 lait cette nuit-là, une vache sans paille n\'en donne pas', () => {
  const s = pature();
  fillCows(s, 2);
  setStraw(s, 4);
  // Lait dès la première nuit nourrie, sans délai (contrairement à la laine du mouton).
  let rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, strawStock(s)], [2, 2, 0]);
  assertEqual(nightHarvest(rep).lait, 2);
  const lait = countItem(s, 'lait');
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, rep.etable.manque, s.nuit.lait], [0, 0, 4, 0], 'pas de paille : pas de lait');
  assert(countItem(s, 'lait') <= lait, 'aucun lait ajouté');
  assertEqual(cowCount(s), 2, 'les vaches sont toujours là');
  // une vache ne mange pas une demi-ration : avec 3 pailles, une seule mange
  setStraw(s, 3);
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, rep.etable.paille, rep.etable.manque, strawStock(s)], [1, 1, 2, 2, 1]);
});

test('paille insuffisante : on nourrit dans l\'ordre de la liste, les moutons puis les vaches', () => {
  const s = pature();
  fillSheep(s, 3);
  fillCows(s, 2);
  // 4 pailles : les 3 moutons (3), puis il n'en reste qu'1 : aucune vache.
  setStraw(s, 4);
  let rap = feedLivestock(s);
  assertEqual(rap, { moutons: 3, vaches: 2, moutonsNourris: 3, vachesNourries: 0, paille: 3, manque: 4 });
  assertEqual([s.paturage.moutons.map((m) => m.laine), s.nuit.lait, strawStock(s)], [[1, 1, 1], 0, 1]);
  // 2 pailles : les deux premiers moutons seulement.
  setStraw(s, 2);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.manque], [2, 0, 1 + 4]);
  assertEqual(s.paturage.moutons.map((m) => m.laine), [2, 2, 1], 'les premiers de la liste d\'abord');
  // 5 pailles : les 3 moutons, puis la première vache.
  setStraw(s, 5);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.paille, rap.manque, s.nuit.lait], [3, 1, 5, 2, 1]);
  // 0 paille : personne, et il ne se passe rien d'autre.
  setStraw(s, 0);
  const avant = JSON.stringify(s.paturage);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.paille, rap.manque], [0, 0, 0, 7]);
  assertEqual(JSON.stringify(s.paturage), avant, 'animaux inchangés');
});

test('la paille du blé moulu nourrit les animaux (Moulin → Étable)', () => {
  const s = pature();
  s.stations.moulin = { construit: true, tache: null, appareil: makeDevice('moulin', 'moulin', 120) };
  testFillBatteries(s);
  fillSheep(s, 2);
  fillCows(s, 1);
  setInv(s, { ble: 4, conserve: 200 });
  assertEqual(strawMissing(s), 4);
  assert(startMilling(s, 4).ok);
  runFor(s, 21);
  assertEqual([countItem(s, 'farine'), strawStock(s), strawMissing(s)], [4, 4, 0]);
  const rep = sleepOnce(s);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.lait, strawStock(s)], [2, 1, 1, 0]);
  assertEqual(countItem(s, 'farine'), 4, 'la farine reste pour le pain');
});

test('laine : ni périssable ni comestible, vendue 12 pièces l\'unité (6 avant le Lot 12)', () => {
  const s = pature();
  testAddSheep(s, 1);
  testWoolReady(s);
  shear(s, 'mouton-1');
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual(countItem(s, 'laine'), 1, 'la laine ne périme pas');
  assertEqual(planMeal(s).mange.laine, undefined, 'la famille ne la mange pas');
  const before = s.pieces;
  const r = sellItem(s, 'laine', 1);
  assertEqual([r.ok, r.gain, s.pieces], [true, 12, before + 12]);
  assertEqual(isBuyable('laine'), false, 'la laine ne se rachète pas');
});

test('paille : ne périme pas, ne se mange pas, se vend 1 pièce et ne s\'achète pas', () => {
  const s = pature();
  setStraw(s, 5);
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual(strawStock(s), 5, 'sans animaux, elle se garde');
  assertEqual(planMeal(s).mange.paille, undefined, 'la famille ne la mange pas');
  assertEqual(moveToFridge(Object.assign(s, { frigo: { ...s.frigo, construit: true } }), 'paille', 1).ok, false, 'inutile au frigo');
  const before = s.pieces;
  assertEqual(sellItem(s, 'paille', 2), { ok: true, sold: 2, gain: 2 });
  assertEqual([s.pieces, strawStock(s)], [before + 2, 3]);
  assertEqual(buyItem(s, 'paille', 1).ok, false, 'elle vient seulement du Moulin');
});

test('rapport de réveil : moutons, laine prête, vaches, paille', () => {
  const s = pature();
  fillSheep(s, 3);
  setStraw(s, 6);
  sleepOnce(s);
  let rep = sleepOnce(s);
  assertEqual([rep.moutons, rep.lainePrete], [3, 3]);
  assertEqual(rep.etable, { moutons: 3, vaches: 0, moutonsNourris: 3, vachesNourries: 0, paille: 3, manque: 0 });
  assertEqual([rep.paille, rep.pailleBesoin], [0, 3]);
  shear(s, 'mouton-1');
  rep = buildMorningReport(s);
  assertEqual([rep.moutons, rep.lainePrete], [3, 2]);
  const t = garden();
  rep = sleepOnce(t);
  assertEqual([rep.moutons, rep.lainePrete, rep.vaches, rep.lait, rep.paille, rep.pailleBesoin], [0, 0, 0, 0, 0, 0]);
  assertEqual(rep.etable, newStableReport());
});

test('nuit : la paille est mangée juste après la ponte, sans perturber ni le repas ni les œufs', () => {
  const s = pature();
  testAddHens(s, 4);
  fillSheep(s, 2);
  setStraw(s, 2);
  s.poulailler.nourries = 4;
  const rep = sleepOnce(s);
  assertEqual(rep.oeufs, 4);
  assertEqual(s.paturage.moutons.map((m) => m.laine), [1, 1]);
  assert(rep.energieMangee > 0, 'le repas a bien eu lieu');
  assert(NIGHT_STEPS.indexOf(feedLivestock) === NIGHT_STEPS.indexOf(layEggs) + 1, 'juste après la ponte');
  assert(NIGHT_STEPS.indexOf(autoTasks) < NIGHT_STEPS.indexOf(feedLivestock), 'la tonte automatique passe avant le repas des moutons');
  assert(NIGHT_STEPS.indexOf(feedLivestock) < NIGHT_STEPS.indexOf(finishPreparations), 'la paille moulue pendant la nuit sert la nuit suivante');
});

test('tonte automatique : la laine prête est tondue avant le repas, et repart dès cette nuit', () => {
  const s = pature();
  fillSheep(s, 2);
  grantTech(s, 'el_tonte', false);
  setStraw(s, 10);
  sleepOnce(s);
  let rep = sleepOnce(s);
  assertEqual([rep.auto.tondus, countItem(s, 'laine'), rep.lainePrete], [0, 0, 2], 'prête au 2ᵉ réveil');
  rep = sleepOnce(s);
  assertEqual([rep.auto.tondus, countItem(s, 'laine')], [2, 2], 'tondus pendant la nuit suivante');
  assertEqual(s.paturage.moutons.map((m) => m.laine), [1, 1], 'et déjà une nuit nourrie de plus');
  assertEqual(s.campagne.compteurs.laines, 2);
});

test('mode test Lot 6 : +3 moutons, laine prête, +20 pailles', () => {
  const s = createInitialState(1);
  s.pieces = 0;
  assertEqual(testAddSheep(s).ok, true);
  assertEqual([s.pieces, s.paturage.construit, s.paturage.places, sheepCount(s)], [0, true, 10, 3], 'Étable ouverte gratuitement');
  testAddSheep(s);
  assertEqual(sheepCount(s), 6);
  testAddSheep(s, 10);
  assertEqual(sheepCount(s), 10, 'dans la limite des places libres');
  assertEqual(testAddSheep(s).added, 0);
  assertEqual(s.paturage.moutons.map((m) => m.id).length, 10);
  assertEqual(sheepToShear(s), 0);
  testWoolReady(s);
  assertEqual(sheepToShear(s), 10);
  assertEqual(shear(s, 'mouton-1').ok, true);
  assertEqual(testAddStraw(s).ok, true);
  assertEqual(strawStock(s), 20);
  testAddStraw(s, 5);
  assertEqual(strawStock(s), 25);
  assertEqual([typeof testFattenSheep, typeof testFattenCows], ['undefined', 'undefined']);
});

/* ---------- Vache ---------- */

test('vache : 200 pièces, refusée sans Étable ouverte ni 3 places libres, sans poids', () => {
  const s = pature({ built: false });
  assertEqual(buyCow(s).ok, false, 'l\'Étable n\'est pas prête');
  buildPaturage(s);
  s.pieces = 199;
  assertEqual(buyCow(s).ok, false, 'pas assez de pièces');
  s.pieces = 5000;
  // 10 places = 3 vaches (3 places chacune, 1 place inutilisable ensuite).
  assertEqual(cowCapacity(s), 3);
  const r = buyAnimal(s, 'vache');
  assertEqual([r.ok, r.cost], [true, 200]);
  assertEqual(s.paturage.vaches, [{ id: 'vache-1' }], 'un identifiant, rien d\'autre');
  assertEqual(animalPrice('vache'), 200, 'prix fixe, quel que soit le nombre');
  fillCows(s, 2);
  assertEqual(cowCount(s), 3);
  assertEqual(buyCow(s), { ok: false, error: 'Pas assez de place pour une vache : il lui faut 3 places libres.' });
  assertEqual([stableOccupied(s), stableFree(s), freeSheepPlaces(s)], [9, 1, 1], '3 vaches = 9 places sur 10 : il reste une place de mouton');
});

test('Étable mixte : capacités et places libres correctes avec des moutons et des vaches', () => {
  const s = pature();
  fillSheep(s, 4); // 4 places
  fillCows(s, 2); // 2 × 3 = 6 places → 10 au total, Étable pleine
  assertEqual([sheepPlaces(s), cowPlaces(s), stableOccupied(s), stableFree(s)], [4, 6, 10, 0]);
  assertEqual(freeSheepPlaces(s), 0, 'plus de place, ni pour un mouton...');
  assertEqual(freeCowPlaces(s), 0, '... ni pour une vache');
  assertEqual([sheepCount(s), pastureCapacity(s), cowCount(s), cowCapacity(s)], [4, 4, 2, 2]);
  // Une vache demande 3 places : on les achète à la suite.
  assert(buyPasture(s).ok);
  assertEqual([freeSheepPlaces(s), freeCowPlaces(s)], [1, 0]);
  assert(buyPasture(s).ok, 'il reste une place libre : l\'achat suivant passe');
  assert(buyPasture(s).ok);
  assertEqual([freeSheepPlaces(s), freeCowPlaces(s), stableOccupied(s), s.paturage.places], [3, 1, 10, 13]);
});

test('sauvegarder et recharger avec des moutons, des vaches et de la paille', () => {
  const s = pature();
  fillSheep(s, 2);
  fillCows(s, 2);
  setStraw(s, 9);
  sleepOnce(s);
  const reloaded = migrate({ v: STATE_VERSION, t: Date.now(), s: JSON.parse(JSON.stringify(s)) });
  assertEqual(reloaded, s, 'aucun changement au rechargement (même version)');
  assertEqual([strawStock(reloaded), cowCount(reloaded), sheepCount(reloaded)], [3, 2, 2]);
  // Le jeu continue à fonctionner normalement après le rechargement.
  assertEqual(buyCow(reloaded).ok, false, '2 + 6 = 8 places prises : pas 3 de libres');
  assertEqual(buySheep(reloaded).ok, true);
});

test('sérialisation JSON : Étable, moutons et paille font l\'aller-retour et la partie continue à l\'identique', () => {
  const s = pature();
  fillSheep(s, 3);
  setStraw(s, 14);
  sleepOnce(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  for (let i = 0; i < 8; i++) {
    sleepOnce(s);
    sleepOnce(copy);
  }
  assertEqual(copy, s);
  assertEqual([copy.paturage.moutons.map((m) => m.laine), strawStock(copy)], [[2, 2, 2], 0], '14 pailles : 4 nuits nourries à 3 moutons, puis 2 pailles pour deux moutons');
});

test('migration v6 (Lot 5) → v7 : l\'Étable des moutons apparaît à ouvrir, la partie est gardée', () => {
  const v6 = {
    version: 6, day: 30, awakeSeconds: 11, pieces: 640, rngSeed: 2, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir', 'recettes'], marche: {},
    ...startFarm(), ...startHousehold(), ...startLot4(), ...startLot5(),
  };
  const m = migrate({ v: 6, t: 0, s: v6 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [30, 640]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual(inventoryCounts(m).conserve, 160);
  m.pieces = 500;
  assertEqual(buildPaturage(m).ok, true);
  assertEqual(buySheep(m).ok, true);
  m.awakeMs = 30000;
  assertEqual(sleep(m).moutons, 1);
  // une sauvegarde déjà en v7 n'est pas modifiée
  const again = migrate({ v: 7, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.paturage, m.paturage);
});

test('migration v0 → version courante : les chaînes mènent au Lot 6', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.paturage.construit, false);
  assertEqual(m.paturage.moutons, []);
});

/* ---------- Lot 7 : automatisations du niveau 5, arbre des technologies ---------- */

// État de test : riche, réservoir plein, Silo et Poulailler construits (ranch).
// Les bâtiments demandés passent au niveau 5 ('potager' : la Zone de culture).
// Arbre v2 : l'ancien « niveau 5 » = le bâtiment au niveau 5 + les nœuds
// d'automatisation correspondants (comme la migration v14 les offre).
function auto5(...batiments) {
  const s = ranch();
  for (const b of batiments) {
    assert(testSetBuildingLevel5(s, b).ok, `niveau 5 : ${b}`);
    if (b === 'potager') {
      grantTech(s, 'ea_irrigation');
      grantTech(s, 'cu_recolte_auto');
    }
    if (b === 'poulailler') grantTech(s, 'el_mangeoire');
  }
  return s;
}

// Arbre v2 : offre tous les nœuds de recettes (sans leurs prérequis).
function unlockRecipes(s) {
  for (const [id, n] of Object.entries(DATA.techtree.noeuds)) if (n.effet.recettes) grantTech(s, id, false);
  return s;
}

// Arbre v2 : état de test où tous les paliers sont ouverts et les PT abondants.
function techReady(s, pt = 99) {
  s.campagne.chapitre = 7;
  techPoints(s).solde = pt;
  return s;
}

test('DATA arbre v2 : 33 nœuds, 6 branches, paliers, points et prérequis cohérents', () => {
  assertEqual(DATA.AUTOMATISATION, undefined, 'plus d\'automatisation par le niveau 5');
  assertEqual(DATA.TECHNO, { ONGLET: 'techno', SEUIL_PIECES: 100 });
  const T = DATA.techtree;
  const N = T.noeuds;
  assertEqual(Object.keys(N).length, 33); // 34 avant la version 1.1 (la Rôtisserie a disparu avec la viande)
  assertEqual(T.branches.map((b) => b.nom), ['Énergie', 'Eau', 'Culture', 'Élevage', 'Cuisine', 'Famille']);
  assertEqual(Object.keys(T.PALIERS).map((p) => T.PALIERS[p].chapitre), [1, 3, 4, 5, 7]);
  assertEqual(T.POINTS.CHAPITRES, [2, 3, 3, 4, 4, 5, 5]);
  assertEqual(T.POINTS.MAITRISE.length, 6);
  // les anciens identifiants restent, pour les sauvegardes
  for (const id of ['semis_auto', 'prepa_1', 'prepa_2', 'reveil_1', 'reveil_2']) assert(N[id], id);
  assertEqual([N.prepa_1.effet.tempsPrepa, N.prepa_2.effet.tempsPrepa], [80, 80]);
  assertEqual([N.reveil_1.effet.eveilMin, N.reveil_2.effet.eveilMin], [20, 10]);
  let pt = 0;
  for (const [id, n] of Object.entries(N)) {
    assert(T.branches.some((b) => b.id === n.branche), `branche de ${id}`);
    assert(Number.isInteger(n.pt) && n.pt > 0 && Number.isInteger(n.cout), `coûts entiers : ${id}`);
    pt += n.pt;
    for (const r of n.requiert) {
      if (r.noeud) {
        assert(N[r.noeud], `${id} : ${r.noeud} existe`);
        assert(N[r.noeud].palier <= n.palier, `${id} : prérequis d'un palier inférieur ou égal`);
      }
      if (r.batiment || r.construit || r.appareil) assert(T.batiments[r.batiment || r.construit || r.appareil], `${id} : bâtiment connu`);
    }
  }
  assertEqual(pt, 50, '50 PT pour tout l\'arbre');
});

test('état initial Lot 7 : aucune technologie, semis réglé sur « même culture »', () => {
  const s = createInitialState(1);
  assertEqual(s.technologies, []);
  assertEqual(s.potager.parcelles.every((p) => p.semis === 'meme' && p.verrou === null), true);
  assertEqual(s.nuit.auto, newAutoReport());
  assertEqual(makePlot(3, 'champ').semis, 'meme');
});

test('arrosage automatique : avec le Réseau d\'irrigation, et pas avant (le niveau 5 ne suffit plus)', () => {
  const s = garden();
  for (const id of ['potager-1', 'potager-2', 'potager-3']) assert(plant(s, id, 'carotte').ok);
  testSetBuildingLevel5(s, 'potager');
  sleepOnce(s);
  assertEqual(s.potager.parcelles.slice(0, 3).map((p) => p.stade), [0, 0, 0], 'niveau 5 sans le nœud : personne n\'arrose');
  assertEqual(s.eauMl, ml(40));
  grantTech(s, 'ea_irrigation');
  const r = sleepOnce(s);
  assertEqual(s.potager.parcelles.slice(0, 3).map((p) => p.stade), [1, 1, 1], 'avec le nœud : arrosées, elles poussent');
  assertEqual(s.eauMl, ml(34), '3 parcelles × 2 L');
  assertEqual([r.auto.potager, r.auto.arrosees, r.auto.sansEau], [true, 3, 0]);
});

test('arrosage automatique : une parcelle déjà arrosée à la main n\'est pas arrosée deux fois, une parcelle mûre n\'est pas arrosée', () => {
  const s = auto5('potager');
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  assert(water(s, 'potager-1').ok);
  const eau = s.eauMl;
  const rap = autoTasks(s);
  assertEqual(rap.arrosees, 1);
  assertEqual(s.eauMl, eau - ml(2));
  const t = auto5('potager');
  plantRipe(t, 'potager-1', 'carotte');
  t.potager.parcelles[0].montee = true; // maturité repoussée de 2 stades : elle a soif
  assertEqual(autoTasks(t).arrosees, 1);
});

testBase('récolte automatique : parcelles mûres seulement, celles montées en graine comprises (graines à la clé)', () => {
  const s = auto5('potager');
  plantRipe(s, 'potager-1', 'carotte');
  plantRipe(s, 'potager-2', 'carotte');
  findPlot(s, 'potager-2').montee = true; // 6 stades demandés : à 4 sur 6, pas encore mûre en graine
  plant(s, 'potager-3', 'carotte');
  findPlot(s, 'potager-3').stade = 2;
  plantRipe(s, 'potager-4', 'carotte');
  findPlot(s, 'potager-4').montee = true;
  findPlot(s, 'potager-4').stade = 6; // montée et mûre : récoltée aussi
  const graines = countItem(s, 'graine_carotte');
  const r = sleepOnce(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'mûre : récoltée, parcelle libérée');
  assertEqual(countItem(s, 'carotte'), 10);
  assertEqual([r.auto.recoltes.carotte, r.auto.recoltes.graine_carotte], [10, 6]);
  assertEqual(findPlot(s, 'potager-4').culture, null, 'montée en graine et mûre : récoltée, 6 graines');
  assertEqual(countItem(s, 'graine_carotte'), graines + 6);
  assertEqual(findPlot(s, 'potager-2').culture, 'carotte', 'montée en graine mais pas encore mûre : elle continue de pousser');
  assertEqual(findPlot(s, 'potager-2').stade, 5);
  assertEqual(findPlot(s, 'potager-3').stade, 3, 'pas mûre : arrosée, elle pousse');
  const t = auto5();
  plantRipe(t, 'potager-1', 'carotte');
  sleepOnce(t);
  assertEqual(findPlot(t, 'potager-1').culture, 'carotte', 'Zone de culture niveau 1 : rien ne se récolte seul');
});

test('automatisations : elles couvrent toute la Zone de culture, plein champ compris (le blé va au Silo)', () => {
  // les nœuds ne citent plus que la zone ('potager') et la Serre : plus de lieu « champ »
  const N = DATA.techtree.noeuds;
  assertEqual([N.ea_irrigation.effet.auto, N.cu_recolte_auto.effet.auto, N.semis_auto.effet.auto],
    [{ arrosage: ['potager'] }, { recolte: ['potager'] }, { semis: ['potager'] }]);
  assertEqual(Object.keys(AUTO_TACHES), ['potager', 'serre', 'poulailler', 'paturage']);
  assertEqual(newAutoReport(), { potager: false, serre: false, poulailler: false, arrosees: 0, sansEau: 0, recoltes: {}, semees: 0, sansGraine: 0, nourries: 0, sansBle: 0, tondus: 0, montees: 0, attendent: 0 });
  const s = auto5('potager');
  testAddWheat(s, 10);
  addItem(s, 'graine_carotte', 1);
  plantRipe(s, 'potager-1', 'ble');
  plant(s, 'potager-2', 'ble');
  plant(s, 'potager-30', 'carotte'); // la dernière parcelle de la zone, à côté du blé
  const silo = s.silo.ble;
  const eau = s.eauMl;
  const r = sleepOnce(s);
  assertEqual(findPlot(s, 'potager-1').culture, null);
  assertEqual(s.silo.ble, silo + 9, 'printemps : 8 × 1,1 = 9 blés, comme tout ce qui pousse dans la zone');
  assertEqual(findPlot(s, 'potager-2').stade, 1);
  assertEqual(findPlot(s, 'potager-30').stade, 1);
  assertEqual(s.eauMl, eau - ml(2 + 2));
  assertEqual([r.auto.potager, r.auto.arrosees, r.auto.recoltes.ble], [true, 2, 9]);
  assertEqual('champ' in r.auto, false, 'le compte rendu n\'a plus de ligne Champ');
  const t = auto5();
  testAddWheat(t, 10);
  plant(t, 'potager-1', 'ble');
  sleepOnce(t);
  assertEqual(findPlot(t, 'potager-1').stade, 0, 'sans les nœuds : pas d\'arrosage automatique');
});

test('automatisations : les 10 nouvelles cultures suivent les mêmes règles que les anciennes', () => {
  // Zone de culture automatisée : riz et houblon sont arrosés et récoltés
  // automatiquement, exactement comme le blé (autoTasks() ne fait aucune
  // distinction de culture, seulement de lieu : voir zones = [potager, serre]
  // dans autoTasks()). Printemps : ×1,1 (10 riz → 11, 6 houblons → 7).
  const s = auto5('potager');
  addItem(s, 'riz', 2);
  addItem(s, 'houblon', 1);
  plantRipe(s, 'potager-1', 'riz');
  plantRipe(s, 'potager-2', 'houblon');
  plant(s, 'potager-3', 'riz');
  const r = sleepOnce(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'riz mûr : récolté automatiquement');
  assertEqual(findPlot(s, 'potager-2').culture, null, 'houblon mûr : récolté automatiquement');
  assertEqual(r.auto.recoltes, { riz: 11, houblon: 7 });
  assertEqual(findPlot(s, 'potager-3').stade, 1, 'riz pas mûr : arrosé, il pousse (4 L, comme au clic)');

  // Oignon, ail, poivron, épinard, fraise pareil.
  const t = auto5('potager');
  addItem(t, 'graine_oignon', 1);
  addItem(t, 'ail', 1);
  addItem(t, 'graine_epinard', 1);
  plantRipe(t, 'potager-1', 'oignon');
  plantRipe(t, 'potager-2', 'ail');
  plant(t, 'potager-3', 'epinard');
  const rt = sleepOnce(t);
  assertEqual(findPlot(t, 'potager-1').culture, null);
  assertEqual(findPlot(t, 'potager-2').culture, null);
  // Nuit 1 = printemps, facteur Potager ×1,1 (comme pour l'oignon plus haut) :
  // 8 × 1,1 = 9 (oignon), 6 × 1,1 = 6,6 arrondi 7 (ail). L'oignon est en mode
  // 'recolte' (comme la tomate) : la récolte rend aussi 1 à 2 graines bonus
  // (ici 2, déterministe avec la graine aléatoire n°1 utilisée par garden()).
  assertEqual(rt.auto.recoltes, { oignon: 9, graine_oignon: 2, ail: 7 });
  assertEqual(findPlot(t, 'potager-3').stade, 1);
});

test('Serre : automatisée seulement par ses nœuds (Irrigation de la Serre, Serre autonome)', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(s);
  s.serre.niveau = DATA.LEVEL_MAX;
  addItem(s, 'cacao', 3);
  plantRipe(s, 'serre-1', 'cacao');
  grantTech(s, 'ea_irrigation');
  grantTech(s, 'cu_recolte_auto');
  sleepOnce(s);
  assertEqual(findPlot(s, 'serre-1').culture, 'cacao', 'les nœuds de la Zone de culture ne touchent pas la Serre');
  assertEqual(isAutomated(s, 'serre'), false);
  grantTech(s, 'cu_serre_auto');
  const r = sleepOnce(s);
  assertEqual(isAutomated(s, 'serre'), true);
  assertEqual(r.auto.serre, true);
  assert(r.auto.recoltes.cacao > 0, 'récolté tout seul');
  assertEqual(findPlot(s, 'serre-1').culture, 'cacao', 'et replanté (Serre autonome)');
});

test('nourrissage automatique : avec la Mangeoire à trémie, et pas avant', () => {
  const s = auto5();
  testAddHens(s, 4);
  testAddWheat(s, 10);
  const r1 = sleepOnce(s);
  assertEqual(r1.oeufs, 0, 'sans la Mangeoire : aucune poule nourrie, aucun œuf');
  assertEqual(s.silo.ble, 10);
  grantTech(s, 'el_mangeoire');
  const r2 = sleepOnce(s);
  assertEqual(r2.oeufs, 4);
  assertEqual(s.silo.ble, 8, '4 poules : 2 blé');
  assertEqual([r2.auto.poulailler, r2.auto.nourries, r2.auto.sansBle], [true, 4, 0]);
  assertEqual(r2.bleConsomme, 2);
});

testBase('les automatisations ne sont jamais réduites par une santé basse (les gestes au clic, si)', () => {
  const s = auto5('potager', 'poulailler');
  testAddHens(s, 4);
  testAddWheat(s, 10);
  plantRipe(s, 'potager-1', 'carotte');
  setHealth(s, 5);
  assert(productivity(s) < 50, 'famille épuisée');
  assertEqual(harvestYield(s, 'carotte'), 3, 'au clic : rendement réduit');
  const r = sleepOnce(s);
  assert(productivity(s) < 50, 'toujours épuisée au réveil');
  assertEqual(countItem(s, 'carotte'), 10, 'récolte automatique à 100 %');
  assertEqual(r.oeufs, 4, 'toutes les poules nourries, sans tirage raté');
  assertEqual(r.auto.nourries, 4);
  const t = auto5('potager');
  plant(t, 'potager-1', 'carotte');
  setHealth(t, 5);
  sleepOnce(t);
  assertEqual(findPlot(t, 'potager-1').stade, 1, 'arrosée malgré la santé basse');
});

test('eau ou blé insuffisants : les automatisations servent ce qu\'elles peuvent et le signalent', () => {
  const s = auto5('potager', 'poulailler');
  for (let i = 1; i <= 4; i++) plant(s, `potager-${i}`, 'carotte');
  testAddHens(s, 4);
  s.silo.ble = 1; // de quoi nourrir 2 poules
  s.eauMl = ml(5); // de quoi arroser 2 parcelles (2 L chacune)
  const r = sleepOnce(s);
  assertEqual([r.auto.arrosees, r.auto.sansEau], [2, 2]);
  assertEqual(s.potager.parcelles.slice(0, 4).map((p) => p.stade), [1, 1, 0, 0]);
  assertEqual([r.auto.nourries, r.auto.sansBle], [2, 2]);
  assertEqual(r.oeufs, 2);
  assertEqual(s.silo.ble, 0);
});

testBase('semis automatique : sans le nœud, la parcelle récoltée reste vide', () => {
  const s = auto5('potager');
  plantRipe(s, 'potager-1', 'patate');
  sleepOnce(s);
  assertEqual(findPlot(s, 'potager-1').culture, null);
  assertEqual(countItem(s, 'patate'), 8, 'la famille a mangé les 5 patates du stock (plus de réserve)');
});

testBase('semis automatique : replante la même culture, arrosée dans la foulée', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  plantRipe(s, 'potager-1', 'patate');
  plantRipe(s, 'potager-2', 'carotte');
  const r = sleepOnce(s);
  const p1 = findPlot(s, 'potager-1');
  assertEqual([p1.culture, p1.stade], ['patate', 1]);
  assertEqual(countItem(s, 'patate'), 8 - 1, 'la famille a mangé les 5 patates du stock, le semis en prend 1');
  const p2 = findPlot(s, 'potager-2');
  assertEqual([p2.culture, p2.stade], ['carotte', 1], 'une graine de carotte de l\'inventaire');
  assertEqual(countItem(s, 'graine_carotte'), 10 - 1 - 1, 'une pour la plantation à la main, une pour le semis');
  assertEqual(r.auto.semees, 2);
});

testBase('semis automatique : respecte la réserve de semences', () => {
  // 5 patates en stock + 8 récoltées = 13 avant le semis.
  const essai = (reserve) => {
    const s = auto5('potager');
    s.technologies.push('semis_auto');
    setSeedReserve(s, 'patate', reserve);
    plantRipe(s, 'potager-1', 'patate');
    const r = autoTasks(s);
    return { culture: findPlot(s, 'potager-1').culture, patates: countItem(s, 'patate'), rap: r };
  };
  const a = essai(12);
  assertEqual([a.culture, a.patates, a.rap.semees, a.rap.sansGraine], ['patate', 12, 1, 0], '13 − 12 = 1 graine au-delà de la réserve');
  const b = essai(13);
  assertEqual([b.culture, b.patates, b.rap.semees, b.rap.sansGraine], [null, 13, 0, 1], 'toute la réserve est intouchable');
  const c = essai(0);
  assertEqual(c.culture, 'patate');
});

test('semis automatique : sans graine, la parcelle reste vide et le rapport le dit', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  setInv(s, { conserve: 160, patate: 1 });
  plantRipe(s, 'potager-1', 'patate');
  setSemis(s, 'potager-1', 'verrou', 'carotte'); // des carottes à semer, mais aucune graine de carotte
  const r = autoTasks(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'pas de graine de carotte : rien à semer');
  assertEqual([r.semees, r.sansGraine, r.montees], [0, 1, 0], 'aucune carotte en terre : rien à faire monter en graine');
});

/* ---------- Montée en graine automatique ---------- */

// `n` parcelles de carottes mûres (potager-1 à potager-n) et exactement `graines` graines de carotte en stock.
function ripeCarrots(s, n, graines) {
  addItem(s, 'graine_carotte', n); // de quoi planter les n parcelles
  for (let i = 1; i <= n; i++) plantRipe(s, `potager-${i}`, 'carotte');
  const reste = countItem(s, 'graine_carotte');
  if (reste > 0) takeItem(s, 'graine_carotte', reste);
  if (graines > 0) addItem(s, 'graine_carotte', graines);
}

function autoSeeding() {
  const s = auto5('potager');
  grantTech(s, 'semis_auto');
  return s;
}

const carrotPlots = (s, n) => Array.from({ length: n }, (_, i) => findPlot(s, `potager-${i + 1}`));

testBase('montée en graine automatique : sans graine, la carotte mûre monte en graine au lieu de vider la parcelle', () => {
  const s = autoSeeding();
  ripeCarrots(s, 1, 0);
  const r = autoTasks(s);
  const p = findPlot(s, 'potager-1');
  assertEqual([p.culture, p.montee, isMature(p)], ['carotte', true, false], 'elle reste 2 stades de plus, arrosée au passage');
  assertEqual(countItem(s, 'carotte'), 0, 'rien n\'est récolté : elle rendra des graines');
  assertEqual([r.montees, r.semees, r.sansGraine, r.attendent], [1, 0, 0, 0]);
});

testBase('montée en graine automatique : 6 parcelles, aucune graine : une carotte monte, les 5 autres attendent, puis tout est replanté', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 0);
  assertEqual(boltingPlan(s, 'carotte'), { culture: 'carotte', graines: 6, besoin: 6, disponible: 0, attendu: 0, aMonter: 1, parcelles: ['potager-1'] });
  const nuit1 = autoTasks(s);
  const plots = carrotPlots(s, 6);
  assertEqual(plots.map((p) => p.montee), [true, false, false, false, false, false]);
  assertEqual(plots.slice(1).every((p) => p.culture === 'carotte' && isMature(p)), true, 'sans graine pour les replanter, elles attendent mûres');
  assertEqual([countItem(s, 'carotte'), nuit1.montees, nuit1.attendent, nuit1.sansGraine], [0, 1, 5, 0], 'aucune parcelle vidée');
  // une nuit plus tard, la parcelle montée est mûre : ses 6 graines replantent les 6 parcelles
  plots[0].stade = maxStage(plots[0]);
  const nuit2 = autoTasks(s);
  assertEqual(plots.every((p) => p.culture === 'carotte' && !p.montee && p.stade <= 1), true, 'les 6 parcelles sont replantées');
  assertEqual(countItem(s, 'graine_carotte'), 0, '6 graines rendues, 6 semées');
  assertEqual([countItem(s, 'carotte'), nuit2.semees, nuit2.attendent, nuit2.sansGraine, nuit2.montees], [50, 6, 0, 0, 0]);
});

testBase('montée en graine automatique : le stock couvre déjà les parcelles, rien ne monte en graine', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 6);
  assertEqual(boltingPlan(s, 'carotte').aMonter, 0);
  const r = autoTasks(s);
  assertEqual(carrotPlots(s, 6).some((p) => p.montee), false);
  assertEqual([countItem(s, 'carotte'), countItem(s, 'graine_carotte'), r.semees, r.montees, r.attendent], [60, 0, 6, 0, 0]);
});

testBase('montée en graine automatique : stock partiel, juste ce qu\'il faut monte en graine, le reste attend', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 3); // il manque 3 graines : 1 parcelle montée en rend 6
  assertEqual(boltingPlan(s, 'carotte').aMonter, 1);
  const r = autoTasks(s);
  const plots = carrotPlots(s, 6);
  assertEqual(plots.map((p) => p.montee), [true, false, false, false, false, false]);
  assertEqual([countItem(s, 'carotte'), countItem(s, 'graine_carotte'), r.semees, r.attendent], [30, 0, 3, 2], '3 récoltées et replantées avec les 3 graines, 2 attendent');
  assertEqual(plots.slice(1, 4).every((p) => p.stade <= 1), true);
  assertEqual(plots.slice(4).every((p) => isMature(p)), true);
});

testBase('montée en graine automatique : les graines d\'une parcelle déjà en montée comptent, sans nouvelle montée', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 0);
  const p1 = findPlot(s, 'potager-1');
  p1.montee = true; // déjà en route : 6 graines attendues pour 6 parcelles
  assertEqual(boltingPlan(s, 'carotte'), { culture: 'carotte', graines: 6, besoin: 6, disponible: 0, attendu: 6, aMonter: 0, parcelles: [] });
  const r = autoTasks(s);
  assertEqual([r.montees, r.attendent], [0, 5]);
  assertEqual(carrotPlots(s, 6).filter((p) => p.montee).length, 1);
});

testBase('montée en graine automatique : la réserve de semences n\'est pas comptée, et le bonus de graines oui', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 6);
  setSeedReserve(s, 'graine_carotte', 2); // 6 − 2 = 4 graines disponibles pour 6 parcelles
  assertEqual(boltingPlan(s, 'carotte').aMonter, 1);
  assertEqual(boltSeedYield(s, 'carotte'), 6);
  grantTech(s, 'cu_semences');
  assertEqual(boltSeedYield(s, 'carotte'), 8, 'Sélection des semences : 8 graines par carotte montée');
  assertEqual(boltingPlan(s, 'carotte').graines, 8);
});

testBase('montée en graine automatique : plusieurs parcelles montent quand le manque dépasse une montée', () => {
  const s = autoSeeding();
  ripeCarrots(s, 14, 0); // 14 graines manquent : ⌈14 / 6⌉ = 3 parcelles
  assertEqual(boltingPlan(s, 'carotte').aMonter, 3);
  const r = autoTasks(s);
  assertEqual([r.montees, r.attendent], [3, 11]);
  assertEqual(carrotPlots(s, 14).filter((p) => p.montee).length, 3);
});

testBase('montée en graine automatique : seules comptent les parcelles que le semis automatique replante en carottes', () => {
  const s = autoSeeding();
  ripeCarrots(s, 6, 0);
  for (const id of ['potager-4', 'potager-5', 'potager-6']) setSemis(s, id, 'off');
  assertEqual(boltingPlan(s, 'carotte').besoin, 3, 'les parcelles désactivées ne sont pas à replanter');
  const r = autoTasks(s);
  assertEqual(carrotPlots(s, 6).map((p) => p.montee), [true, false, false, false, false, false]);
  assertEqual([findPlot(s, 'potager-4').culture, findPlot(s, 'potager-5').culture, findPlot(s, 'potager-6').culture], [null, null, null], 'désactivées : récoltées, laissées vides, jamais montées');
  assertEqual([countItem(s, 'carotte'), r.montees, r.attendent], [30, 1, 2]);
});

testBase('montée en graine automatique : sans récolte ni semis automatiques, rien ne change', () => {
  const s = auto5('potager'); // récolte et arrosage automatiques, mais pas le semis
  ripeCarrots(s, 6, 0);
  assertEqual(boltingPlan(s, 'carotte').aMonter, 0);
  const r = autoTasks(s);
  assertEqual([countItem(s, 'carotte'), r.montees, r.attendent], [60, 0, 0], 'toutes récoltées normalement');
  const t = createInitialState(1); // aucune automatisation
  assertEqual(boltingPlan(t, 'carotte').aMonter, 0);
  assertEqual(boltingPlan(t, 'patate'), null, 'la patate rend ses graines à la récolte');
});

test('semis automatique : option par parcelle (désactiver, verrouiller une culture)', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  for (const id of ['potager-1', 'potager-2', 'potager-3']) plantRipe(s, id, 'patate');
  assertEqual(setSemis(s, 'potager-2', 'off').ok, true);
  assertEqual(setSemis(s, 'potager-3', 'verrou', 'ble').ok, true, 'le blé se verrouille aussi : il pousse dans la zone');
  assertEqual(setSemis(s, 'potager-3', 'verrou', 'carotte').ok, true);
  assertEqual(setSemis(s, 'potager-3', 'verrou', 'cacao').ok, false, 'le cacao ne se plante qu\'en Serre');
  assertEqual(findPlot(s, 'potager-3').verrou, 'carotte', 'un refus ne change pas le réglage');
  assertEqual(setSemis(s, 'potager-1', 'nimporte').ok, false);
  const r = autoTasks(s);
  assertEqual(findPlot(s, 'potager-1').culture, 'patate');
  assertEqual(findPlot(s, 'potager-2').culture, null, 'désactivé : reste vide');
  assertEqual(findPlot(s, 'potager-3').culture, 'carotte', 'verrouillé : toujours des carottes');
  assertEqual([r.semees, r.sansGraine], [2, 0], 'une parcelle désactivée n\'est pas comptée comme manque');
  assertEqual(findPlot(s, 'potager-2').semis, 'off');
  setSemis(s, 'potager-3', 'meme');
  assertEqual([findPlot(s, 'potager-3').semis, findPlot(s, 'potager-3').verrou], ['meme', null]);
});

test('semis automatique : aussi pour le plein champ (blé), avec sa réserve', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  testAddWheat(s, 3);
  plantRipe(s, 'potager-7', 'ble');
  sleepOnce(s);
  const p = findPlot(s, 'potager-7');
  assertEqual([p.culture, p.stade], ['ble', 1]);
  assertEqual(wheatTotal(s), 3 - 1 + 9 - 1, 'plantation à la main, récolte (9 au printemps), semis');
});

test('temps de préparation : −20 % puis encore −20 %, à tous les ateliers', () => {
  const s = atelier();
  // Lot 14 : pain 10 s et tarte aux pommes 23 s (temps de base des plats divisés par 2) ;
  // le Moulin (5 s) et la Presse (10 s) ne sont pas concernés.
  assertEqual([recipeTime(s, 'pain'), recipeTime(s, 'tarte_pommes'), recipeTime(s, 'farine')], [10, 23, 5]);
  s.technologies.push('prepa_1');
  // Secondes entières, arrondies vers le haut : tarte 23 × 80 % = 18,4 → 19.
  assertEqual([recipeTime(s, 'pain'), recipeTime(s, 'tarte_pommes'), recipeTime(s, 'farine'), recipeTime(s, 'huile')], [8, 19, 4, 8]);
  s.technologies.push('prepa_2');
  assertEqual(prepTimeMult(s), 64);
  assertEqual([recipeTime(s, 'pain'), recipeTime(s, 'tarte_pommes'), recipeTime(s, 'farine')], [7, 15, 4]);
});

test('temps de préparation : la préparation lancée prend le temps réduit, celle en cours garde le sien', () => {
  const s = atelier();
  setInv(s, { farine: 6 });
  assert(startRecipe(s, 'pain').ok);
  assertEqual(s.stations.four.tache.dureeMs, 10000);
  s.pieces = 5000;
  techReady(s);
  assert(buyTech(s, 'prepa_1').ok);
  assertEqual(s.stations.four.tache.dureeMs, 10000, 'déjà lancée : inchangée');
  runFor(s, 10);
  assertEqual(countItem(s, 'pain'), 1);
  assert(startRecipe(s, 'pain').ok);
  assertEqual([s.stations.four.tache.dureeMs, s.stations.four.tache.resteMs], [8000, 8000]);
  runFor(s, 7);
  assertEqual(countItem(s, 'pain'), 1, 'pas encore finie à 7 s');
  runFor(s, 1);
  assertEqual(countItem(s, 'pain'), 2, 'finie à 8 s au lieu de 10');
});

test('éveil minimal : 30 s, puis 20 s, puis 10 s', () => {
  const s = farm();
  assertEqual(awakeRequired(s), 30);
  s.awakeMs = 20000;
  assertEqual(canSleep(s), false);
  s.pieces = 5000;
  techReady(s);
  assert(buyTech(s, 'reveil_1').ok);
  assertEqual(awakeRequired(s), 20);
  assertEqual(canSleep(s), true);
  s.awakeMs = 19900;
  assertEqual(canSleep(s), false);
  assert(buyTech(s, 'reveil_2').ok);
  assertEqual(awakeRequired(s), 10);
  s.awakeMs = 10000;
  assertEqual(canSleep(s), true);
  assert(sleep(s) !== null, 'on peut dormir dès 10 s');
  s.awakeMs = 9000;
  assertEqual(sleep(s), null);
  const t = farm();
  t.technologies.push('reveil_2');
  assertEqual(awakeRequired(t), 10, 'le plus bas des paliers acquis compte');
});

test('prérequis : palier, bâtiment, nœud précédent, PT et pièces', () => {
  const s = createInitialState(1);
  s.pieces = 5000;
  // cu_recolte_auto : palier 3 (chapitre 4), Outils de jardin, Potager niveau 4
  assertEqual(techStatus(s, 'cu_recolte_auto'), 'verrouille');
  assertEqual(techPrereqs(s, 'cu_recolte_auto').map((p) => p.ok), [false, false, false]);
  s.campagne.chapitre = 4;
  techPoints(s).solde = 10;
  assertEqual(techPrereqs(s, 'cu_recolte_auto').map((p) => p.ok), [true, false, false]);
  const refus = buyTech(s, 'cu_recolte_auto');
  assertEqual([refus.ok, s.pieces, s.technologies, techPoints(s).solde], [false, 5000, [], 10]);
  assertEqual(buyTech(s, 'cu_outils').ok, true);
  assertEqual([s.pieces, techPoints(s).solde], [4900, 9], '1 PT + 100 💰');
  s.potager.niveau = 3;
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, false, 'niveau 3 ne suffit pas');
  s.potager.niveau = 4;
  assertEqual(techStatus(s, 'cu_recolte_auto'), 'disponible');
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, true);
  assertEqual([s.pieces, techPoints(s).solde, techStatus(s, 'cu_recolte_auto')], [4000, 7, 'acquis']);
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, false, 'déjà acquis : pas de deuxième paiement');
  // prérequis « construit » et « appareils »
  assertEqual(techPrereqs(s, 'el_ration').map((p) => p.ok), [true, false], 'Poulailler à construire');
  assertEqual(techPrereqs(s, 'en_delestage').slice(2).map((p) => p.ok), [false], '2 batteries');
  s.batteries.push(makeDevice('batterie', 'batterie-2', 80));
  assertEqual(techPrereqs(s, 'en_delestage')[2].ok, true);
  // PT insuffisants
  techPoints(s).solde = 0;
  assertEqual(buyTech(s, 'reveil_1').error, 'Pas assez de points de technologie.');
  techPoints(s).solde = 1;
  s.pieces = 199;
  assertEqual(buyTech(s, 'reveil_1').error, 'Pas assez de pièces.');
  s.pieces = 200;
  assertEqual(buyTech(s, 'reveil_1').ok, true);
  assertEqual([s.pieces, techPoints(s).solde], [0, 0]);
  assertEqual(buyTech(s, 'inconnue').ok, false);
});

test('onglet Arbre des technologies : ajouté la première fois qu\'on possède 100 pièces, et il reste', () => {
  const s = createInitialState(1);
  s.pieces = 99; // isole ce test du montant de départ pour tester le franchissement du seuil
  tick(s, 0.2);
  assertEqual(s.unlockedTabs.includes('techno'), false, '99 pièces : pas encore');
  testAddPieces(s, 1);
  assertEqual(s.unlockedTabs.includes('techno'), true, '100 pièces');
  spend(s, 100);
  tick(s, 0.2);
  assertEqual(s.unlockedTabs.includes('techno'), true, 'ne disparaît plus');
  testAddPieces(s, 500);
  assertEqual(s.unlockedTabs.filter((t) => t === 'techno').length, 1);
  // gagné par une vente
  const v = createInitialState(1);
  v.pieces = 98;
  assertEqual(sellItem(v, 'conserve', 1).ok, true);
  assertEqual(v.unlockedTabs.includes('techno'), true, '98 + 3 = 101');
  // une partie chargée qui a déjà 100 pièces l'obtient au premier tick
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 500, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.unlockedTabs.includes('techno'), false);
  tick(m, 0.2);
  assertEqual(m.unlockedTabs.includes('techno'), true);
});

test('mode test Lot 7 : un bâtiment au niveau 5, tous les nœuds débloqués', () => {
  const s = createInitialState(1);
  assertEqual(testSetBuildingLevel5(s, 'potager').ok, true);
  assertEqual([s.potager.niveau, s.potager.parcelles.length], [5, 30]);
  assertEqual(s.pieces, 350, 'sans rien payer');
  assertEqual(testSetBuildingLevel5(s, 'champ').ok, false, 'le Champ n\'est plus un bâtiment');
  assertEqual(s.champ, undefined);
  assertEqual(testSetBuildingLevel5(s, 'poulailler').ok, true);
  assertEqual([s.poulailler.construit, s.poulailler.niveau, coopCapacity(s)], [true, 5, 24]);
  assertEqual(testSetBuildingLevel5(s, 'silo').ok, true);
  assertEqual(siloCapacity(s), 400);
  assertEqual(testSetBuildingLevel5(s, 'moulin').ok, false);
  assertEqual([isAutomated(s, 'potager'), isAutomated(s, 'poulailler'), isAutomated(s, 'silo')], [false, false, false], 'le niveau 5 n\'automatise plus');
  assertEqual(testUnlockAllTechs(s).ok, true);
  assertEqual([isAutomated(s, 'potager'), isAutomated(s, 'serre'), isAutomated(s, 'poulailler'), isAutomated(s, 'paturage')], [true, true, true, true]);
  assertEqual(s.technologies.slice().sort(), Object.keys(DATA.techtree.noeuds).sort());
  assertEqual(s.unlockedTabs.includes('techno'), true);
  assertEqual([awakeRequired(s), prepTimeMult(s)], [10, 64]);
  const t = JSON.parse(JSON.stringify(s));
  assertEqual(t, s, 'l\'état reste sérialisable');
});

testBase('rapport de réveil : ce que les automatisations ont fait', () => {
  const s = auto5('potager', 'poulailler');
  s.technologies.push('semis_auto');
  testAddHens(s, 4);
  testAddWheat(s, 10);
  plantRipe(s, 'potager-1', 'patate');
  plant(s, 'potager-2', 'carotte');
  const r = sleepOnce(s);
  assertEqual([r.auto.potager, r.auto.serre, r.auto.poulailler], [true, false, true]);
  assertEqual('champ' in r.auto, false);
  assertEqual(r.auto.recoltes, { patate: 8 });
  assertEqual([r.auto.semees, r.auto.arrosees, r.auto.nourries], [1, 2, 4]);
  const n = createInitialState(1);
  const rn = sleepOnce(n);
  assertEqual([rn.auto.potager, rn.auto.serre, rn.auto.poulailler, rn.auto.arrosees], [false, false, false, 0]);
});

testBase('une nuit complète au niveau 5 : arrosage, pousse, récolte et semis s\'enchaînent', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  s.pompe.allume = true;
  testFillBatteries(s);
  plant(s, 'potager-1', 'patate');
  const stades = [];
  const recoltes = [];
  for (let i = 0; i < 8; i++) {
    runFor(s, 30);
    const r = sleepOnce(s);
    stades.push(findPlot(s, 'potager-1').stade);
    recoltes.push(r.auto.recoltes.patate || 0);
  }
  // 6 nuits arrosées pour mûrir, récolte à la 7e nuit, puis la parcelle repart.
  assertEqual(stades, [1, 2, 3, 4, 5, 6, 1, 2]);
  assertEqual(recoltes, [0, 0, 0, 0, 0, 0, 8, 0], '8 patates récoltées à la 7e nuit');
});

test('progression affichée dans l\'arbre : niveaux des bâtiments et appareils', () => {
  const s = auto5('potager');
  const culture = techProgress(s, 'culture');
  // une seule ligne : la Zone de culture (l'ancien Champ n'est plus suivi)
  assertEqual(culture.map((e) => [e.cle, e.nom, e.niveau, e.automatise]), [['potager', 'Zone de culture', 5, true]]);
  assertEqual([DATA.techtree.batiments.champ, DATA.techtree.suivi.champ], [undefined, undefined]);
  assertEqual(DATA.techtree.batiments.potager.nom, 'Zone de culture');
  const energie = techProgress(s, 'energie');
  assertEqual(energie.map((e) => [e.cle, e.niveaux]), [['panneau', [1]], ['batterie', [1]]]);
  s.panneaux[0].niveau = 3;
  assertEqual(techProgress(s, 'energie')[0].niveaux, [3]);
  assertEqual(techProgress(s, 'eau')[0].niveau, 1);
  assertEqual(techProgress(s, 'famille'), []);
  const cuisine = techProgress(s, 'cuisine')[0];
  assertEqual(cuisine.ateliers.map((a) => a.construit), [false, false, false, false]);
  assertEqual(techProgress(createInitialState(1), 'elevage').map((e) => e.niveau), [0, 0], 'pas construits : niveau 0');
});

test('migration v7 (Lot 6) → v8 : technologies vides, réglage de semis sur chaque parcelle', () => {
  const v7 = {
    version: 7, day: 40, awakeSeconds: 5, pieces: 900, rngSeed: 2, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir', 'recettes'], marche: {},
    ...startFarm(), ...startHousehold(), ...startLot4(), ...startLot5(), ...startLot6(),
  };
  for (const p of v7.potager.parcelles) {
    delete p.semis;
    delete p.verrou;
  }
  delete v7.nuit.auto;
  v7.champ = { construit: true, niveau: 1, parcelles: [{ id: 'champ-1', lieu: 'champ', culture: 'ble', stade: 3, arrose: true, montee: false }] };
  const m = migrate({ v: 7, t: 0, s: v7 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [40, 900]);
  assertEqual(m.technologies, []);
  assertEqual(m.potager.parcelles.every((p) => p.semis === 'meme' && p.verrou === null), true);
  // v15 : la parcelle de l'ancien Champ a rejoint la zone (6 + 1 = 7 parcelles : niveau 2, 12 parcelles)
  assertEqual('champ' in m, false);
  assertEqual([m.potager.niveau, m.potager.parcelles.length], [2, 12]);
  assertEqual(m.potager.parcelles[6], { id: 'potager-7', lieu: 'potager', culture: 'ble', stade: 3, arrose: true, montee: false, semis: 'meme', verrou: null });
  assertEqual(m.nuit.auto, newAutoReport());
  tick(m, 0.2);
  assertEqual(m.unlockedTabs.includes('techno'), true, '900 pièces');
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  const again = migrate({ v: 8, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.potager, m.potager);
  assertEqual(again.technologies, m.technologies);
});

test('migration v12 → v13 : une sauvegarde à décimales passe en unités entières', () => {
  // Une partie v12 : pièces, énergie (kWh), eau (L), temps (s), usure, surface
  // (ha), poids (kg), coefficients, blé et autonomie décimaux.
  const s = createInitialState(1);
  s.pieces = 123.68;
  s.marche = { carotte: 1.5, graine_tomate: 2.1 };
  delete s.awakeMs;
  s.awakeSeconds = 12.4;
  const b = s.batteries[0];
  delete b.chargeMwh;
  b.charge = 2.3456;
  b.usure = 12.75;
  delete b.usureMs;
  s.panneaux[0].prix = 86.4;
  delete s.eauMl;
  s.eau = 17.25;
  s.jour.produite = 0.5;
  s.jour.eau = 3.5;
  s.jour.ble = 1.5;
  s.silo.ble = 2.5;
  s.inventaire.ble = [{ qty: 3.5, nightsLeft: null, origin: 'produit' }];
  s.paturage = { construit: true, ha: 0.55, compteur: 1, compteurVache: 1, moutons: [{ id: 'mouton-1', poids: 23.6, laine: 3 }], vaches: [{ id: 'vache-1', poids: 41 }] };
  s.frigo = { ...s.frigo, alimenteS: 10.2, eveilS: 20.4 };
  delete s.frigo.alimenteMs;
  delete s.frigo.eveilMs;
  s.stations.four = { construit: true, tache: { recette: 'pain', reste: 4.4, duree: 10 } };
  s.campagne.compteurs = { ...s.campagne.compteurs, litres: 41.5, kwhMax: 3.25 };
  delete s.campagne.compteurs.eauMl;
  delete s.campagne.compteurs.mwhMax;
  s.campagne.historique = [{ nuit: 1, pct: 34.6667, energie: 52 }];
  s.report = { energie: 2.3 };
  s.version = 12;
  const m = migrate({ v: 12, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.pieces, m.marche], [124, { carotte: 150, graine_tomate: 210 }]);
  assertEqual([m.awakeMs, 'awakeSeconds' in m], [12400, false]);
  assertEqual([m.batteries[0].chargeMwh, 'charge' in m.batteries[0]], [2345600, false]);
  assertEqual([m.batteries[0].usure, m.batteries[0].usureMs], [12, 45000], '0,75 point = 45 s de marche');
  assertEqual(m.panneaux[0].prix, 87);
  assertEqual([m.eauMl, 'eau' in m], [17250, false]);
  assertEqual([m.jour.produite, m.jour.eau, m.jour.ble], [500000, 3500, 2]);
  assertEqual([m.silo.ble, countItem(m, 'ble'), m.poulailler.restes], [2, 3, 0], 'les demis de blé tombent');
  // (puis la version 16 : 55 a → 11 places, plus de poids, laine 3 / 7 → 0 / 2, et 2 nuits de paille offertes)
  assertEqual(m.paturage, { construit: true, places: 11, compteur: 1, compteurVache: 1, moutons: [{ id: 'mouton-1', laine: 0 }], vaches: [{ id: 'vache-1' }] });
  assertEqual(countItem(m, 'paille'), 2 * (1 + 2));
  // l'étape v12 → v13 elle-même passait bien la surface en ares et les poids en hg
  const v13 = migrateToIntegers(JSON.parse(JSON.stringify(s)));
  assertEqual(v13.paturage, { construit: true, ares: 55, compteur: 1, compteurVache: 1, moutons: [{ id: 'mouton-1', poids: 236, laine: 3 }], vaches: [{ id: 'vache-1', poids: 410 }] });
  assertEqual([m.frigo.alimenteMs, m.frigo.eveilMs], [10200, 20400]);
  assertEqual(m.stations.four.tache, { recette: 'pain', resteMs: 4400, dureeMs: 10000 });
  assertEqual([m.campagne.compteurs.eauMl, m.campagne.compteurs.mwhMax], [41500, 3250000]);
  assertEqual(m.campagne.historique[0].pct, 34);
  assertEqual(m.report, null, 'l\'ancien rapport (anciennes unités) n\'est pas réaffiché');
  // plus aucune décimale nulle part, et la partie tourne
  const decimals = [];
  const walk = (o, p) => {
    if (typeof o === 'number' && !Number.isInteger(o)) decimals.push(p);
    else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], `${p}.${k}`);
  };
  walk(m, 'state');
  assertEqual(decimals, []);
  tick(m, 0.2);
  m.awakeMs = 30000;
  assert(sleep(m) !== null, 'la partie migrée peut dormir');
  // une sauvegarde déjà en v13 n'est pas touchée
  const again = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again, m);
});

test('points de technologie : chapitres, jalons de maîtrise, mode libre', () => {
  const s = createInitialState(1);
  assertEqual(s.pointsTech, { solde: 0, gagnes: 0, maitrise: [], libre: 0, annonces: [] });
  // chapitre terminé : 2 PT pour le chapitre 1
  completeChapter(s);
  assertEqual([techPoints(s).solde, techPoints(s).gagnes], [2, 2]);
  assertEqual(techPoints(s).annonces[0], { pt: 2, raison: 'Chapitre 1 terminé' });
  // jalon : 50 pains cuits → 1 PT, une seule fois
  s.campagne.compteurs.pains = 50;
  assertEqual(checkMastery(s), 1);
  assertEqual(checkMastery(s), 0, 'une seule fois');
  assertEqual(techPoints(s).maitrise, ['pains_50']);
  assertEqual(techPoints(s).solde, 3);
  // les 7 chapitres rapportent 26 PT
  const t = createInitialState(1);
  for (let i = 0; i < 7; i++) completeChapter(t);
  assertEqual([t.campagne.fini, techPoints(t).gagnes], [true, 26]);
  // mode libre : +1 PT toutes les 5 nuits à 100 %
  t.nuit = newNightStats();
  t.nuit.besoin = 150;
  for (let i = 0; i < 5; i++) {
    t.nuit.energieProduit = 150;
    recordNight(t);
  }
  assertEqual([techPoints(t).libre, techPoints(t).gagnes, t.campagne.compteurs.nuits100], [5, 27, 5]);
});

test('migration v13 → v14 : PT des chapitres faits, automatisations et recettes offertes', () => {
  const s = createInitialState(1);
  delete s.pointsTech;
  s.technologies = ['semis_auto'];
  s.campagne.chapitre = 5; // chapitres 1 à 4 terminés : 2 + 3 + 3 + 4 = 12 PT
  s.campagne.historique = [{ nuit: 1, pct: 100, energie: 150 }, { nuit: 2, pct: 80, energie: 120 }];
  delete s.campagne.compteurs.nuits100;
  s.potager.niveau = 5;
  s.poulailler.construit = true;
  s.poulailler.niveau = 5;
  s.stations.four.construit = true;
  s.version = 13;
  const m = migrate({ v: 13, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.pointsTech.solde, m.pointsTech.gagnes, m.campagne.compteurs.nuits100], [12, 12, 1]);
  for (const id of ['semis_auto', 'ea_econome', 'ea_irrigation', 'cu_outils', 'cu_recolte_auto', 'el_mangeoire', 'cui_boulangerie']) {
    assert(m.technologies.includes(id), `${id} offert`);
  }
  assertEqual(m.technologies.includes('cui_laiterie'), false, 'pas de moutons ni de vaches : pas de Laiterie');
  assertEqual([isAutomated(m, 'potager'), isAutomated(m, 'poulailler')], [true, true], 'rien n\'est perdu');
});

/* --- migration v14 → v15 : le Potager et le Champ deviennent la Zone de culture --- */

// Sauvegarde de la version 14 : une partie d'avant la fusion, avec l'ancien
// Potager (6 / 9 / 12 / 16 / 20 parcelles) et l'ancien Champ (4 / 6 / 9 / 12 / 16,
// à construire). `potager` et `champ` : niveaux d'alors (champ 0 : pas construit).
function v14State({ potager = 1, champ = 0 } = {}, mutate) {
  const anciennes = { potager: [6, 9, 12, 16, 20], champ: [4, 6, 9, 12, 16] };
  const plots = (n, lieu) => Array.from({ length: n }, (_, i) => ({ id: `${lieu}-${i + 1}`, lieu, culture: null, stade: 0, arrose: false, montee: false, semis: 'meme', verrou: null }));
  const s = createInitialState(6);
  s.potager = { niveau: potager, parcelles: plots(anciennes.potager[potager - 1], 'potager') };
  s.champ = champ > 0
    ? { construit: true, niveau: champ, parcelles: plots(anciennes.champ[champ - 1], 'champ') }
    : { construit: false, niveau: 1, parcelles: [] };
  s.nuit.auto = { ...s.nuit.auto, champ: false };
  s.campagne.chapitre = 4;
  s.version = 14;
  if (mutate) mutate(s);
  return JSON.parse(JSON.stringify(s));
}

// Ce qu'une parcelle porte, sans son identifiant ni son lieu (que la fusion renumérote).
function plotContent(p) {
  const { id, lieu, ...reste } = p;
  return reste;
}

test('migration v14 → v15 : Champ non construit, le Potager devient la Zone de culture', () => {
  const v14 = v14State({ potager: 3 }, (s) => {
    Object.assign(s.potager.parcelles[0], { culture: 'carotte', stade: 2, arrose: true });
    Object.assign(s.potager.parcelles[11], { culture: 'patate', stade: 6 });
    s.pieces = 432;
  });
  assertEqual(migrateCropZone(v14).version, 15, 'l\'étape v14 → v15 elle-même');
  const m = migrate({ v: 14, t: 0, s: v14 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual('champ' in m, false, 'state.champ a disparu');
  // 12 parcelles possédées : niveau 2 de la zone (12 parcelles), rien à compléter
  assertEqual([m.potager.niveau, m.potager.parcelles.length], [2, 12]);
  assertEqual(m.potager.parcelles.map((p) => p.id), Array.from({ length: 12 }, (_, i) => `potager-${i + 1}`));
  assertEqual(m.potager.parcelles.map(plotContent), v14.potager.parcelles.map(plotContent), 'chaque parcelle garde tout ce qu\'elle portait');
  assertEqual([m.pieces, m.inventaire, m.campagne], [432, v14.inventaire, v14.campagne], 'rien d\'autre ne bouge');
  assertEqual(m.nuit.auto, newAutoReport(), 'le compte rendu n\'a plus de ligne Champ');
  // niveau de la zone = le plus petit dont la capacité (6 / 12 / 18 / 24 / 30) contient les parcelles possédées
  const zone = (potager) => { const z = migrate({ v: 14, t: 0, s: v14State({ potager }) }).potager; return [z.niveau, z.parcelles.length]; };
  assertEqual([1, 2, 3, 4, 5].map(zone), [[1, 6], [2, 12], [2, 12], [3, 18], [4, 24]]);
  // les parcelles ajoutées pour compléter le niveau sont vides, et la partie continue
  const z = migrate({ v: 14, t: 0, s: v14State({ potager: 2 }) });
  assertEqual(z.potager.parcelles.slice(9), [makePlot(10), makePlot(11), makePlot(12)]);
  assert(sleepOnce(z) !== null, 'la partie migrée passe la nuit');
  assertEqual(upgradePotager(Object.assign(z, { pieces: 5000 })).cost, 480, 'la zone s\'agrandit ensuite au nouveau tarif');
  assertEqual(z.potager.parcelles.length, 18);
});

test('migration v14 → v15 : Champ construit avec des cultures, tout est regroupé dans la zone', () => {
  const v14 = v14State({ potager: 2, champ: 2 }, (s) => {
    Object.assign(s.potager.parcelles[0], { culture: 'carotte', stade: 4, montee: true });
    Object.assign(s.potager.parcelles[8], { culture: 'tomate', stade: 1, arrose: true, semis: 'off' });
    Object.assign(s.champ.parcelles[0], { culture: 'ble', stade: 5, arrose: true });
    Object.assign(s.champ.parcelles[1], { culture: 'tournesol', stade: 7, semis: 'verrou', verrou: 'tournesol' });
    Object.assign(s.champ.parcelles[3], { culture: 'riz', stade: 2, semis: 'verrou', verrou: 'ble', note: 'champ libre' });
    s.technologies = ['cu_outils', 'ea_econome', 'ea_irrigation', 'cu_recolte_auto', 'semis_auto'];
    s.nuit.auto = { ...s.nuit.auto, potager: false, champ: true, arrosees: 3 };
    s.report = { nuit: 4, auto: { potager: false, champ: true, serre: false, poulailler: false, arrosees: 3, recoltes: { ble: 8 } } };
    s.silo.construit = true;
    s.eauMl = ml(40);
  });
  const m = migrate({ v: 14, t: 0, s: v14 });
  assertEqual([m.version, 'champ' in m], [STATE_VERSION, false]);
  // 9 + 6 = 15 parcelles : niveau 3 (18 parcelles), 3 parcelles vides en plus
  assertEqual([m.potager.niveau, m.potager.parcelles.length], [3, 18]);
  assertEqual(m.potager.parcelles.map((p) => p.id), Array.from({ length: 18 }, (_, i) => `potager-${i + 1}`));
  assertEqual(m.potager.parcelles.every((p) => p.lieu === 'potager'), true, 'le lieu « champ » a disparu');
  // d'abord les parcelles du Potager, puis celles du Champ, dans leur ordre, avec tous leurs champs
  assertEqual(m.potager.parcelles.slice(0, 15).map(plotContent), [...v14.potager.parcelles, ...v14.champ.parcelles].map(plotContent));
  assertEqual(m.potager.parcelles[9], { id: 'potager-10', lieu: 'potager', culture: 'ble', stade: 5, arrose: true, montee: false, semis: 'meme', verrou: null });
  assertEqual(m.potager.parcelles[10], { id: 'potager-11', lieu: 'potager', culture: 'tournesol', stade: 7, arrose: false, montee: false, semis: 'verrou', verrou: 'tournesol' });
  assertEqual(m.potager.parcelles[12], { id: 'potager-13', lieu: 'potager', culture: 'riz', stade: 2, arrose: false, montee: false, semis: 'verrou', verrou: 'ble', note: 'champ libre' }, 'même un champ inconnu est gardé');
  assertEqual(m.potager.parcelles.slice(15), [makePlot(16), makePlot(17), makePlot(18)]);
  assertEqual(m.inventaire, v14.inventaire, 'aucun remboursement : rien n\'a été retiré');
  // ce qui était rangé sous la clé « champ » rejoint la zone
  assertEqual([m.nuit.auto.potager, 'champ' in m.nuit.auto, m.nuit.auto.arrosees], [true, false, 3]);
  assertEqual([m.report.auto.potager, 'champ' in m.report.auto, m.report.auto.recoltes], [true, false, { ble: 8 }]);
  // le déblocage « champ » (chapitre 3) reste acquis : les cultures de plein champ restent plantables
  assertEqual([isUnlocked(m, 'champ'), plantableCropsFor(m, 'potager').includes('ble')], [true, true]);
  // les automatisations acquises couvrent maintenant les anciennes parcelles du Champ
  assertEqual(isAutomated(m, 'potager'), true);
  const r = sleepOnce(m);
  assertEqual(r.auto.recoltes.graine_tournesol > 0, true, 'le tournesol mûr de l\'ancien Champ est récolté tout seul');
  assertEqual([findPlot(m, 'potager-11').culture, findPlot(m, 'potager-11').stade], ['tournesol', 1], 'et replanté (verrou gardé)');
  assertEqual(findPlot(m, 'potager-10').stade, 6, 'le blé déjà arrosé a poussé');
  assertEqual(JSON.parse(JSON.stringify(m)), m);
  // une partie déjà à jour n'est pas retouchée
  const again = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again, m);
});

test('migration v14 → v15 : plus de 30 parcelles, on en garde 30 et chaque plante retirée rend une graine', () => {
  // 20 + 16 = 36 parcelles. 33 sont plantées : 3 vides partent d'abord, puis
  // les 3 plantes les moins avancées (une carotte, une patate, un blé).
  const v14 = v14State({ potager: 5, champ: 5 }, (s) => {
    s.potager.parcelles.forEach((p, i) => Object.assign(p, { culture: i < 10 ? 'carotte' : 'patate', stade: 3 }));
    s.champ.parcelles.forEach((p, i) => Object.assign(p, { culture: i < 12 ? 'ble' : 'tournesol', stade: 4, semis: 'off' }));
    Object.assign(s.potager.parcelles[4], { stade: 0 }); // carotte tout juste semée : retirée
    Object.assign(s.potager.parcelles[15], { stade: 1, arrose: true }); // patate : retirée
    Object.assign(s.champ.parcelles[2], { stade: 2 }); // blé : retiré
    for (const i of [13, 14, 15]) Object.assign(s.champ.parcelles[i], { culture: null, stade: 0 }); // vides : retirées sans rien rendre
    s.inventaire = {};
    addItem(s, 'graine_carotte', 2);
    s.silo.construit = true;
    s.silo.ble = 5;
  });
  const before = [...v14.potager.parcelles, ...v14.champ.parcelles];
  const m = migrate({ v: 14, t: 0, s: v14 });
  assertEqual([m.version, 'champ' in m], [STATE_VERSION, false]);
  assertEqual([m.potager.niveau, m.potager.parcelles.length], [5, 30]);
  assertEqual(m.potager.parcelles.map((p) => p.id), Array.from({ length: 30 }, (_, i) => `potager-${i + 1}`));
  assertEqual(m.potager.parcelles.every((p) => p.lieu === 'potager' && p.culture !== null), true, 'les 30 parcelles gardées sont toutes plantées');
  // les parcelles gardées restent dans l'ordre, avec tout ce qu'elles portaient
  const retirees = ['potager-5', 'potager-16', 'champ-3', 'champ-14', 'champ-15', 'champ-16'];
  assertEqual(m.potager.parcelles.map(plotContent), before.filter((p) => !retirees.includes(p.id)).map(plotContent));
  // une graine (ou un plant) par plante retirée ; le blé va dans l'inventaire
  assertEqual([countItem(m, 'graine_carotte'), countItem(m, 'patate'), countItem(m, 'ble'), countItem(m, 'graine_tournesol')], [2 + 1, 1, 1, 0]);
  assertEqual(Object.keys(inventoryCounts(m)).sort(), ['ble', 'graine_carotte', 'patate']);
  assertEqual(m.silo.ble, 5, 'le Silo n\'est pas touché');
  const count = (plots, c) => plots.filter((p) => p.culture === c).length;
  for (const c of ['carotte', 'patate', 'ble', 'tournesol']) {
    const rendu = c === 'tournesol' ? 0 : 1;
    assertEqual([c, count(m.potager.parcelles, c) + rendu], [c, count(before, c)], `${c} : en terre + rendu = avant`);
  }
  // 20 + 9 = 29 parcelles, toutes plantées : sous la limite, rien à retirer ni à rendre
  const pile = migrate({ v: 14, t: 0, s: v14State({ potager: 5, champ: 3 }, (s) => {
    for (const p of [...s.potager.parcelles, ...s.champ.parcelles]) Object.assign(p, { culture: 'patate', stade: 1 });
    s.inventaire = {};
  }) });
  assertEqual([pile.potager.niveau, pile.potager.parcelles.length, pile.inventaire], [5, 30, {}]);
  assertEqual(pile.potager.parcelles.map((p) => p.culture), [...Array(29).fill('patate'), null]);
});

/* ---------- migration v15 → v16 (version 1.1) ---------- */

// Une sauvegarde au format 15, telle que la version 1.0 l'écrivait : membres
// sans profil, surface en ares, animaux avec leur poids, pas de compte rendu
// de l'Étable. `mutate` reçoit l'état avant sa copie.
function v15State(mutate) {
  const s = createInitialState(9);
  s.version = 15;
  for (const m of s.famille.membres) {
    delete m.prenom;
    delete m.genre;
    delete m.teint;
  }
  s.paturage = { construit: false, ares: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] };
  delete s.nuit.etable;
  s.campagne.chapitre = 5;
  if (mutate) mutate(s);
  return JSON.parse(JSON.stringify(s));
}

// Un troupeau de la version 1.0 : `laines` = jours de repousse de chaque mouton.
function v15Herd(s, laines, vaches = 0, ares = 50) {
  s.paturage = {
    construit: true, ares, compteur: laines.length, compteurVache: vaches,
    moutons: laines.map((laine, i) => ({ id: `mouton-${i + 1}`, poids: 200 + 5 * i, laine })),
    vaches: Array.from({ length: vaches }, (_, i) => ({ id: `vache-${i + 1}`, poids: 400 + 10 * i })),
  };
}

test('migration v15 → v16 : une partie sans animaux ne perd ni ne gagne rien', () => {
  assertEqual(typeof MIGRATIONS[15], 'function');
  const v15 = v15State((s) => { s.pieces = 432; s.day = 12; });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.pieces, m.day, m.inventaire, m.campagne, m.potager, m.technologies, m.pointsTech], [432, 12, v15.inventaire, v15.campagne, v15.potager, v15.technologies, v15.pointsTech]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual(countItem(m, 'paille'), 0, 'pas d\'animaux : pas de paille offerte');
  assertEqual(m.nuit.etable, newStableReport());
  // même forme qu'une partie neuve, et la partie continue
  assertEqual(Object.keys(m).sort(), Object.keys(createInitialState(9)).sort());
  assertEqual(Object.keys(m.paturage), Object.keys(createInitialState(9).paturage));
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  // une partie déjà en version 16 n'est pas retouchée
  const again = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again, m);
});

test('migration v15 → v16 : chaque membre de la famille reçoit son profil de départ', () => {
  const v15 = v15State((s) => {
    s.famille.membres[2].sante = 40;
    s.famille.membres[3].malade = true;
    s.famille.membres[3].sante = 0;
  });
  assertEqual(v15.famille.membres.every((m) => !('prenom' in m) && !('genre' in m) && !('teint' in m)), true, 'la sauvegarde de départ n\'a pas de profil');
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.famille.membres.map((x) => [x.id, x.nom, x.prenom, x.genre, x.teint]), [
    ['adulte-1', 'Adulte 1', 'Adulte 1', 'f', 0],
    ['adulte-2', 'Adulte 2', 'Adulte 2', 'm', 0],
    ['enfant-1', 'Enfant 1', 'Enfant 1', 'm', 0],
    ['enfant-2', 'Enfant 2', 'Enfant 2', 'f', 0],
  ]);
  assertEqual(m.famille.membres.map((x) => memberPortrait(m, x.id)), ['👩', '👨', '👦', '👧']);
  assertEqual(m.famille.membres.map((x) => [x.sante, x.malade, x.enfant]), [[100, false, false], [100, false, false], [40, false, true], [0, true, true]], 'santé et maladies gardées');
  assertEqual(m.famille.membres, createInitialState(1).famille.membres.map((x, i) => ({ ...x, sante: [100, 100, 40, 0][i], malade: i === 3 })), 'même forme qu\'une partie neuve');
  assert(setMemberProfile(m, 'adulte-1', { prenom: 'Léa', teint: 2 }).ok, 'le profil se règle ensuite normalement');
  // un membre inconnu de DATA (sauvegarde bricolée) reçoit quand même un profil valide
  const bizarre = migrate({ v: 15, t: 0, s: v15State((s) => { s.famille.membres.push({ id: 'cousin-1', nom: 'Cousin', enfant: false, sante: 80, malade: false }); }) });
  const cousin = bizarre.famille.membres[4];
  assertEqual([cousin.prenom, cousin.genre, cousin.teint, memberName(bizarre, 'cousin-1')], ['Cousin', 'f', 0, 'Cousin']);
});

test('migration v15 → v16 : les comptes rendus en attente nomment les nouveaux malades par leur identifiant', () => {
  const v15 = v15State((s) => {
    s.nuit.nouveauxMalades = ['Adulte 2', 'Enfant 1'];
    s.report = { nuit: 7, nouveauxMalades: ['Enfant 2', 'Inconnu'], auto: newAutoReport(), mange: {} };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.nuit.nouveauxMalades, ['adulte-2', 'enfant-1']);
  assertEqual(m.report.nouveauxMalades, ['enfant-2'], 'un nom inconnu est écarté');
  assertEqual(m.report.nuit, 7, 'le reste du compte rendu en attente est gardé');
});

test('migration v15 → v16 : les animaux perdent leur poids, les ares deviennent des places', () => {
  const v15 = v15State((s) => v15Herd(s, [0, 3], 1, 65));
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.paturage, {
    construit: true, places: 13, compteur: 2, compteurVache: 1,
    moutons: [{ id: 'mouton-1', laine: 0 }, { id: 'mouton-2', laine: 0 }],
    vaches: [{ id: 'vache-1' }],
  });
  assertEqual('ares' in m.paturage, false);
  for (const a of [...m.paturage.moutons, ...m.paturage.vaches]) assertEqual('poids' in a, false, a.id);
  assertEqual(JSON.stringify(m).includes('poids'), false, 'plus aucun poids dans la sauvegarde');
  // 5 ares = 1 place : même nombre d'animaux possible qu'avant, même prix pour la suite
  assertEqual([50, 55, 60, 65, 100].map((ares) => migrate({ v: 15, t: 0, s: v15State((s) => v15Herd(s, [], 0, ares)) }).paturage.places), [10, 11, 12, 13, 20]);
  assertEqual([stableOccupied(m), stableFree(m), freeSheepPlaces(m), freeCowPlaces(m)], [5, 8, 8, 2]);
  assertEqual(pastureCost(m), 70, '13 places : la 14ᵉ coûte 70, comme les 5 a suivants avant');
  // les numéros ne sont pas réutilisés
  m.pieces = 1000;
  assertEqual(buySheep(m).id, 'mouton-3');
  assertEqual(buyCow(m).id, 'vache-2');
});

test('migration v15 → v16 : la laine passe du rythme de 7 nuits à celui de 2 nuits nourries', () => {
  const v15 = v15State((s) => v15Herd(s, [0, 1, 2, 3, 4, 5, 6, 7], 0, 50));
  const m = migrate({ v: 15, t: 0, s: v15 });
  // 0 à 3 nuits sur 7 → 0 ; 4 à 6 → 1 (à mi-chemin) ; 7 (prête) → 2 (prête)
  assertEqual(m.paturage.moutons.map((x) => x.laine), [0, 0, 0, 0, 1, 1, 1, 2]);
  assertEqual(sheepToShear(m), 1, 'une laine prête reste prête');
  assertEqual(shear(m, 'mouton-8').ok, true);
  assertEqual(shear(m, 'mouton-7').ok, false);
  // une valeur abîmée ne casse rien
  const abime = migrate({ v: 15, t: 0, s: v15State((s) => { v15Herd(s, [99, -3], 0, 50); s.paturage.moutons.push({ id: 'mouton-3', poids: 300 }); }) });
  assertEqual(abime.paturage.moutons.map((x) => x.laine), [2, 0, 0]);
});

test('migration v15 → v16 : 2 nuits de paille offertes par mouton et par vache', () => {
  assertEqual(MIGRATION_11, { ARES_PAR_PLACE: 5, ANCIENS_JOURS_LAINE: 7, NUITS_PAILLE: 2 });
  const v15 = v15State((s) => v15Herd(s, [7, 2, 0], 2, 50));
  assertEqual('paille' in v15.inventaire, false);
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(strawNeed(m), 3 * 1 + 2 * 2);
  assertEqual(strawStock(m), 2 * 7, '2 nuits pour 3 moutons et 2 vaches');
  assertEqual(lotsOf(m, 'paille'), [{ qty: 14, nightsLeft: null, origin: 'produit' }]);
  assertEqual(strawMissing(m), 0);
  // personne n'est puni le premier soir : tout le monde mange, le lait arrive, et la nuit suivante aussi
  let rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait], [3, 2, 0, 2]);
  rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait, strawStock(m)], [3, 2, 0, 2, 0]);
  rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait], [0, 0, 7, 0], 'ensuite il faut moudre du blé');
  assertEqual([sheepCount(m), cowCount(m)], [3, 2], 'sans paille, les animaux restent');
  // la paille déjà possédée (migration rejouée sur un état hybride) n'est pas écrasée
  const deja = v15State((s) => { v15Herd(s, [0], 0, 50); addItem(s, 'paille', 5); });
  assertEqual(strawStock(migrate({ v: 15, t: 0, s: deja })), 5 + 2);
});

test('migration v15 → v16 : la viande et les anciens plats de l\'inventaire et du frigo restent mangeables et vendables', () => {
  const v15 = v15State((s) => {
    s.inventaire = {
      viande_mouton: [{ qty: 20, nightsLeft: 3, origin: 'produit' }],
      viande_boeuf: [{ qty: 4, nightsLeft: 5, origin: 'produit' }],
      viande_volaille: [{ qty: 3, nightsLeft: 4, origin: 'acheté' }],
      ragout: [{ qty: 2, nightsLeft: 6, origin: 'produit' }],
      poulet_roti_ail: [{ qty: 1, nightsLeft: 2, origin: 'produit' }],
    };
    s.frigo = { ...s.frigo, construit: true, appareil: makeDevice('frigo', 'frigo', 600), items: { roti_boeuf: [{ qty: 3, nightsLeft: 6, origin: 'produit' }], poivrons_farcis: [{ qty: 1, nightsLeft: 4, origin: 'produit' }] } };
    s.marche = { viande_mouton: 150 };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.inventaire, v15.inventaire, 'rien n\'est retiré de l\'inventaire');
  assertEqual(m.frigo.items, v15.frigo.items, 'ni du frigo');
  assertEqual(m.marche, { viande_mouton: 150 });
  for (const id of ['viande_mouton', 'viande_boeuf', 'viande_volaille', 'ragout', 'poulet_roti_ail', 'roti_boeuf', 'poivrons_farcis']) {
    assertEqual([!!DATA.items[id], DATA.items[id].edible], [true, true], id);
  }
  // la famille les mange (ce qui périme le plus tôt d'abord)
  const plan = planMeal(m);
  assertEqual(plan.couverture, 100);
  assert(plan.mange.poulet_roti_ail === 1 && plan.mange.viande_mouton > 0, `au menu : ${JSON.stringify(plan.mange)}`);
  const rep = sleepOnce(m);
  assertEqual([rep.couverture, rep.autonomie > 0], [100, true]);
  // et ils se vendent, au prix d'avant
  m.pieces = 0;
  assertEqual(sellItem(m, 'viande_boeuf', 4).gain, 40);
  assertEqual(sellItem(m, 'ragout', 2).gain, 72);
  assertEqual(sellItem(m, 'roti_boeuf', 3).gain, 108, 'même rangé au frigo');
  assertEqual(m.pieces, 220);
  // mais on ne peut plus en refaire ni en racheter
  assertEqual(buyItem(m, 'viande_boeuf', 1).ok, false);
  assertEqual(startRecipe(m, 'roti_boeuf').ok, false);
});

test('migration v15 → v16 : la Rôtisserie est retirée de l\'arbre et remboursée', () => {
  const v15 = v15State((s) => {
    s.technologies = ['cu_outils', 'cui_boulangerie', 'cui_rotisserie', 'cui_laiterie'];
    s.pointsTech = { solde: 2, gagnes: 9, maitrise: [], libre: 0, annonces: [] };
    s.pieces = 500;
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.technologies, ['cu_outils', 'cui_boulangerie', 'cui_laiterie']);
  assertEqual([m.pieces, m.pointsTech.solde, m.pointsTech.gagnes], [800, 3, 9], '300 pièces et 1 point de technologie rendus');
  assertEqual(ownedTechs(m).every((id) => DATA.techtree.noeuds[id]), true);
  // sans ce nœud : rien n'est offert
  const sans = migrate({ v: 15, t: 0, s: v15State((s) => { s.technologies = ['cu_outils']; s.pieces = 500; }) });
  assertEqual([sans.pieces, sans.pointsTech.solde, sans.technologies], [500, 0, ['cu_outils']]);
  // l'étape v13 → v14 n'offre plus ce nœud à une vieille partie
  const v13 = v15State((s) => { v15Herd(s, [], 0, 50); s.version = 13; s.technologies = []; });
  assertEqual(migrateTechTreeV2(v13).technologies.includes('cui_rotisserie'), false);
});

test('migration v15 → v16 : les préparations des recettes retirées sont terminées, le Moulin regroupe ses moutures', () => {
  const v15 = v15State((s) => {
    for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
    s.inventaire = {};
    s.stations.cuisine.tache = { recette: 'ragout', resteMs: 9000, dureeMs: 23000 };
    s.stations.cuisine.file = [{ recette: 'omelette', pris: [{ item: 'oeuf', qte: 3 }, { item: 'huile', qte: 1 }], eau: 0 }, { recette: 'ragout', pris: [], eau: 0 }];
    s.stations.four.tache = { recette: 'pain', resteMs: 4000, dureeMs: 10000 };
    s.stations.four.file = [{ recette: 'roti_boeuf', pris: [], eau: 0 }, { recette: 'poulet_roti_ail', pris: [], eau: 0 }];
    s.stations.moulin.tache = { recette: 'farine', resteMs: 3000, dureeMs: 5000 };
    s.stations.moulin.file = [{ recette: 'farine', pris: [{ item: 'ble', qte: 1 }], eau: 0 }, { recette: 'farine', pris: [{ item: 'ble', qte: 1 }], eau: 0 }];
    s.stations.presse.tache = { recette: 'huile', resteMs: 1000, dureeMs: 10000 };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  // Cuisine : les deux ragoûts sont servis, l'omelette qui attendait démarre.
  assertEqual([countItem(m, 'ragout'), m.stations.cuisine.tache.recette, m.stations.cuisine.file], [2, 'omelette', []]);
  // Four : le pain continue, les deux plats retirés de la file sont servis.
  assertEqual([m.stations.four.tache, m.stations.four.file], [{ recette: 'pain', resteMs: 4000, dureeMs: 10000 }, []]);
  assertEqual([countItem(m, 'roti_boeuf'), countItem(m, 'poulet_roti_ail')], [1, 1]);
  // Moulin : le blé en cours garde son avance, les deux moutures en file deviennent du blé en attente.
  assertEqual([m.stations.moulin.tache, m.stations.moulin.file], [{ recette: 'farine', resteMs: 3000, dureeMs: 5000, enAttente: 2 }, []]);
  assertEqual(millPending(m), 3);
  // Presse : rien ne change.
  assertEqual(m.stations.presse.tache, { recette: 'huile', resteMs: 1000, dureeMs: 10000 });
  // tout se termine ensuite normalement, avec la paille des 3 blés
  testFillBatteries(m);
  runFor(m, 60);
  assertEqual([countItem(m, 'farine'), countItem(m, 'paille'), countItem(m, 'omelette'), countItem(m, 'pain'), countItem(m, 'huile')], [3, 3, 1, 1, 1]);
  assertEqual(Object.keys(DATA.STATIONS).map((id) => m.stations[id].tache), [null, null, null, null]);
  // un Moulin dont seule la file contenait du blé (cas limite) repart avec ce blé
  const file = migrate({ v: 15, t: 0, s: v15State((s) => { openStation(s, 'moulin'); s.stations.moulin.file = [{ recette: 'farine', pris: [], eau: 0 }, { recette: 'farine', pris: [], eau: 0 }]; }) });
  assertEqual(file.stations.moulin.tache, { recette: 'farine', resteMs: 5000, dureeMs: 5000, enAttente: 1 });
});

test('migration v15 → v16 : une partie avancée continue à tourner après la migration', () => {
  const v15 = v15State((s) => {
    s.pieces = 900;
    s.campagne.chapitre = 6;
    s.campagne.compteurs.laines = 4;
    s.campagne.compteurs.plats = ['omelette', 'ragout', 'roti_boeuf'];
    for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
    s.silo = { construit: true, niveau: 2, ble: 30 };
    s.poulailler = { construit: true, niveau: 1, poules: 4, nourries: 0, restes: 0 };
    v15Herd(s, [7, 5, 1], 1, 50);
    s.inventaire.viande_mouton = [{ qty: 6, nightsLeft: 4, origin: 'produit' }];
    s.inventaire.ble = [{ qty: 60, nightsLeft: null, origin: 'produit' }];
    s.technologies = ['el_tonte', 'cui_rotisserie'];
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual([m.version, m.campagne.compteurs.laines, m.campagne.compteurs.plats], [STATE_VERSION, 4, ['omelette', 'ragout', 'roti_boeuf']], 'les plats déjà préparés restent comptés');
  assertEqual(JSON.parse(JSON.stringify(m)), m, 'l\'état migré se sauvegarde tel quel');
  assertEqual(strawStock(m), 10);
  testFillBatteries(m);
  // 12 nuits de jeu : la tonte automatique, le Moulin et l'Étable fonctionnent ensemble
  let laines = 0;
  let lait = 0;
  for (let i = 0; i < 12; i++) {
    feedAllHens(m);
    if (strawMissing(m) > 0 && wheatTotal(m) > 0) startMilling(m, Math.min(strawMissing(m), wheatTotal(m)));
    runFor(m, 30);
    const rep = sleep(m);
    assert(rep !== null, `nuit ${i + 1}`);
    laines += rep.auto.tondus;
    lait += rep.lait;
    testFillBatteries(m);
  }
  assert(laines >= 6, `la laine continue d'arriver : ${laines}`);
  assert(lait >= 6, `le lait aussi : ${lait}`);
  assertEqual(m.campagne.compteurs.laines, 4 + laines);
  assertEqual([sheepCount(m), cowCount(m), m.poulailler.poules], [3, 1, 4], 'aucun animal ne disparaît');
});

test('migration v15 → v16 : toute la chaîne depuis une très vieille sauvegarde mène au nouveau format', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.famille.membres.map((x) => [x.prenom, x.genre, x.teint]), [['Adulte 1', 'f', 0], ['Adulte 2', 'm', 0], ['Enfant 1', 'm', 0], ['Enfant 2', 'f', 0]]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  // des entrées absurdes ne font jamais planter la migration
  for (const bad of [null, undefined, 42, 'x', [], { version: 15 }, { version: 15, famille: null, paturage: 7, stations: 'non', technologies: 3, inventaire: null }]) {
    const out = migrate(bad);
    assert(out && typeof out === 'object', `migration sans exception : ${JSON.stringify(bad)}`);
  }
});

test('migration v14 → v15 : chaque champ de chaque parcelle est conservé, quelle que soit la sauvegarde', () => {
  for (const [potager, champ] of [[1, 0], [1, 1], [3, 4], [5, 5], [2, 5]]) {
    const v14 = v14State({ potager, champ }, (s) => {
      // une parcelle sur deux est plantée : il reste toujours assez de parcelles vides à retirer
      [...s.potager.parcelles, ...s.champ.parcelles].forEach((p, i) => {
        if (i % 2 === 0) Object.assign(p, { culture: p.lieu === 'champ' ? 'ble' : 'carotte', stade: 1 + (i % 4), arrose: i % 4 === 0, montee: false, semis: ['meme', 'off', 'verrou'][i % 3], verrou: i % 3 === 2 ? 'carotte' : null });
      });
    });
    const before = [...v14.potager.parcelles, ...v14.champ.parcelles];
    const m = migrate({ v: 14, t: 0, s: v14 });
    const planted = m.potager.parcelles.filter((p) => p.culture);
    assertEqual(planted.map(plotContent), before.filter((p) => p.culture).map(plotContent), `potager ${potager}, champ ${champ} : les parcelles plantées`);
    assertEqual(m.potager.parcelles.length, DATA.POTAGER.PARCELLES[m.potager.niveau - 1], 'la zone est pleine à son niveau');
    assert(m.potager.parcelles.length >= Math.min(30, before.length), 'aucune parcelle possédée n\'est perdue (30 au plus)');
    assertEqual(new Set(m.potager.parcelles.map((p) => p.id)).size, m.potager.parcelles.length, 'identifiants uniques');
    assertEqual(m.potager.parcelles.map((p) => p.id), m.potager.parcelles.map((_, i) => makePlot(i + 1).id), 'numérotés comme makePlot()');
    assertEqual(m.inventaire, v14.inventaire, 'rien à rendre');
    assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  }
  // sauvegarde abîmée : sans Champ, ou sans parcelles — la migration ne plante pas
  const sans = v14State({ potager: 2 });
  delete sans.champ;
  assertEqual(migrate({ v: 14, t: 0, s: sans }).potager.parcelles.length, 12);
  const vide = v14State();
  delete vide.potager.parcelles;
  const mv = migrate({ v: 14, t: 0, s: vide });
  assertEqual([mv.potager.niveau, mv.potager.parcelles], [1, makePlots(6)]);
});

test('sauvegarde : identifiants de technologie inconnus ignorés sans plantage', () => {
  const s = createInitialState(1);
  s.technologies = ['reveil_1', 'nexiste_pas'];
  assertEqual(ownedTechs(s), ['reveil_1']);
  assertEqual(awakeRequired(s), 20);
  assertEqual(prepTimeMult(s), 100);
  delete s.technologies;
  assertEqual(awakeRequired(s), 30);
  techPoints(s).solde = 1;
  s.pieces = 0; // isole ce test du montant de départ pour vérifier le refus faute de pièces
  assertEqual(buyTech(s, 'reveil_1').ok, false, 'pas assez de pièces');
  s.pieces = 400;
  assertEqual(buyTech(s, 'reveil_1').ok, true, 'la liste est recréée');
});

/* ---------- Lot 8 : saisons, Serre, Verger, Réfrigérateur ---------- */

// Aliments protégés du repas : la famille ne touche pas à ce qui est en réserve.
function protect(s, ...items) {
  for (const item of items) s.famille.reserve[item] = 99999;
}

function coldRoom({ charge = true } = {}) {
  const s = farm();
  s.pieces = 5000;
  assert(buildFridge(s).ok, 'construire le Réfrigérateur');
  if (charge) testFillBatteries(s);
  s.panneaux[0].allume = false; // seul le frigo consomme, rien ne recharge
  return s;
}

function orchard() {
  const s = garden();
  s.pieces = 5000;
  assert(buildVerger(s).ok, 'aménager le Verger');
  return s;
}

test('DATA Lot 8 : saisons, Serre, Verger et Réfrigérateur', () => {
  const S = DATA.SAISONS;
  assertEqual(S.LONGUEUR, 10);
  assertEqual(S.ORDRE, ['printemps', 'ete', 'automne', 'hiver']);
  // version 1.0 : plus de facteur « champ », toute la Zone de culture suit « potager »
  // version 1.1 : plus de facteur « moutons » (il ne jouait que sur leur prise de poids)
  assertEqual(S.MODS.printemps, { solaire: 100, potager: 110, eau: 100 });
  assertEqual(S.MODS.ete, { solaire: 130, potager: 100, eau: 130 });
  assertEqual(S.MODS.automne, { solaire: 90, potager: 100, eau: 90 });
  assertEqual(S.MODS.hiver, { solaire: 70, potager: 70, eau: 80 });
  assertEqual(Object.keys(S.FACTEURS), ['solaire', 'potager', 'eau']);
  assertEqual([S.RENDEMENT_LIEU, S.EAU_LIEUX], [{ potager: 'potager' }, ['potager']]);
  assertEqual(DATA.SERRE, { LIEU: 'serre', CONSTRUCTION: 400, PARCELLES: [6, 9, 12, 15, 18], COUT: [0, 300, 600, 1000, 1800] });
  const V = DATA.VERGER;
  assertEqual([V.EMPLACEMENTS_DEPART, V.EMPLACEMENTS_MAX, V.EMPLACEMENT.base, V.EMPLACEMENT.croissance], [2, 12, 50, 125]);
  assertEqual([V.MATURITE, V.FRUITS, V.PERIODE], [15, 6, 3]);
  assertEqual([V.ARBRES.pommier.prix, V.ARBRES.poirier.prix], [40, 40]);
  assertEqual([V.ARBRES.pommier.fruit, V.ARBRES.poirier.fruit], ['pomme', 'poire']);
  for (const fruit of ['pomme', 'poire']) {
    // Lot 12 : prix de vente du fruit doublé (2 → 4).
    assertEqual([DATA.items[fruit].energie, DATA.items[fruit].prix, shelfLife(fruit)], [scaleEnergie(8), 4, 7]);
  }
  const F = DATA.FRIGO;
  assertEqual([F.CONSTRUCTION, F.BASE_WH_S, F.PAR_UNITE_MWH_S, F.BLOC_NUIT_S, F.SEUIL_ALIMENTE], [600, 5, 50, 30, 50]);
});

test('état initial Lot 8 : Serre, Verger et Réfrigérateur à construire', () => {
  const s = createInitialState(1);
  assertEqual(s.serre, { construit: false, niveau: 1, parcelles: [] });
  assertEqual(s.verger, { construit: false, places: 2, achetes: 0, compteur: 0, arbres: [] });
  assertEqual(s.frigo.construit, false);
  assertEqual(s.frigo.appareil, null);
  assertEqual(allDevices(s).some((d) => d.type === 'frigo'), false);
  assertEqual(currentSeason(s), 'printemps');
});

/* --- saisons --- */

test('saisons : changement aux nuits 11, 21 et 31, retour au printemps à la nuit 41', () => {
  const at = (day) => currentSeason({ day });
  assertEqual([1, 5, 10].map(at), ['printemps', 'printemps', 'printemps']);
  assertEqual([11, 15, 20].map(at), ['ete', 'ete', 'ete']);
  assertEqual([21, 25, 30].map(at), ['automne', 'automne', 'automne']);
  assertEqual([31, 35, 40].map(at), ['hiver', 'hiver', 'hiver']);
  assertEqual([41, 50, 51, 81].map(at), ['printemps', 'printemps', 'ete', 'printemps']);
  assertEqual([1, 10, 11, 20, 40, 41].map((day) => seasonNight({ day })), [1, 10, 1, 10, 10, 1]);
});

test('saisons : la saison suit la nuit courante quand on dort', () => {
  const s = garden();
  const seen = [];
  for (let i = 0; i < 42; i++) {
    seen.push(currentSeason(s));
    sleepOnce(s);
  }
  assertEqual(seen[0], 'printemps');
  assertEqual([seen[9], seen[10], seen[19], seen[20], seen[29], seen[30], seen[39], seen[40]],
    ['printemps', 'ete', 'ete', 'automne', 'automne', 'hiver', 'hiver', 'printemps']);
  assertEqual(s.report.saison, currentSeason(s));
});

test('seasonFactor : les trois modificateurs de chaque saison', () => {
  const s = createInitialState(1);
  const all = (kind) => [1, 11, 21, 31].map((day) => { s.day = day; return seasonFactor(s, kind); });
  assertEqual(all('solaire'), [100, 130, 90, 70]);
  assertEqual(all('potager'), [110, 100, 100, 70]);
  assertEqual(all('eau'), [100, 130, 90, 80]);
  assertEqual(all('champ'), [undefined, undefined, undefined, undefined], 'plus de facteur champ');
  assertEqual(all('moutons'), [undefined, undefined, undefined, undefined], 'plus de facteur moutons');
});

test('saisons : la production solaire suit la saison', () => {
  const at = (day) => {
    const s = farm(); // neuf à chaque saison : pas d'usure d'un test à l'autre
    s.day = day;
    tick(s, 1);
    return s.panneaux[0].prod;
  };
  // mWh/s : 30 Wh/s × 100 / 130 / 90 / 70 %
  assertEqual(at(1), kwh(0.03), 'printemps 100 %');
  assertEqual(at(11), kwh(0.039), 'été 130 %');
  assertEqual(at(21), kwh(0.027), 'automne 90 %');
  assertEqual(at(31), kwh(0.021), 'hiver 70 %');
});

test('saisons : le rendement du potager suit la saison (10 carottes au départ)', () => {
  const yieldAt = (day) => {
    const s = garden();
    s.day = day;
    plantRipe(s, 'potager-1', 'carotte');
    return harvest(s, 'potager-1').items.carotte;
  };
  assertEqual([yieldAt(1), yieldAt(11), yieldAt(21), yieldAt(31)], [11, 10, 10, 7]);
});

test('saisons : le blé suit le facteur de la Zone de culture, comme les légumes (8 blés au départ)', () => {
  const yieldAt = (day) => {
    const s = ranch();
    s.day = day;
    testAddWheat(s);
    plantRipe(s, 'potager-1', 'ble');
    const r = harvest(s, 'potager-1');
    return r.items.ble;
  };
  // facteur « potager » : 8 × 1,1 / 1,0 / 1,0 / 0,7 = 8,8 / 8 / 8 / 5,6, arrondi
  // (avant la version 1.0, le Champ avait le sien : 1,0 / 1,2 / 0,9 / 0,7)
  assertEqual([yieldAt(1), yieldAt(11), yieldAt(21), yieldAt(31)], [9, 8, 8, 6]);
  const s = ranch();
  assertEqual([1, 11, 21, 31].map((day) => { s.day = day; return [yieldSeasonFactor(s, 'potager'), waterSeasonFactor(s, 'potager'), waterCostFor(s, 'ble', 'potager')]; }),
    [[110, 100, 2], [100, 130, 3], [100, 90, 2], [70, 80, 2]], 'rendement et eau du blé : ceux de la zone');
});

test('saisons : l\'eau par arrosage suit la saison, la récolte automatique aussi', () => {
  const litres = (day) => {
    const s = garden();
    s.day = day;
    plant(s, 'potager-1', 'carotte');
    const before = s.eauMl;
    assert(water(s, 'potager-1').ok);
    return (before - s.eauMl) / 1000;
  };
  // 2 L × 1 / 1,3 / 0,9 / 0,8 = 2 ; 2,6 ; 1,8 ; 1,6, arrondis au litre.
  assertEqual([litres(1), litres(11), litres(21), litres(31)], [2, 3, 2, 2]);
  // la récolte automatique n'est pas réduite par la santé, mais suit la saison
  const s = garden();
  s.day = 31;
  assertEqual(harvestYield(s, 'carotte', true, 'potager'), 7);
  assertEqual(harvestYield(s, 'carotte', true), 10, 'sans lieu, pas de saison');
});

test('saisons : la laine, le lait et la paille mangée ne dépendent pas de la saison', () => {
  const nightAt = (day) => {
    const s = pature();
    s.day = day;
    fillSheep(s, 2);
    fillCows(s, 1);
    setStraw(s, 4);
    const rep = sleepOnce(s);
    return [s.paturage.moutons.map((m) => m.laine), rep.lait, rep.etable.paille, strawStock(s)];
  };
  for (const day of [1, 11, 21, 31]) assertEqual(nightAt(day), [[1, 1], 1, 4, 0], `nuit ${day}`);
});

/* --- Serre --- */

test('Serre : 400 pièces, 6 parcelles, refus sans pièces ou si déjà construite', () => {
  const s = garden();
  s.pieces = 399;
  assertEqual(buildSerre(s).ok, false);
  s.pieces = 400;
  const r = buildSerre(s);
  assertEqual([r.ok, r.cost, s.pieces], [true, 400, 0]);
  assertEqual([s.serre.construit, s.serre.niveau, s.serre.parcelles.length], [true, 1, 6]);
  assertEqual(s.serre.parcelles.every((p) => p.lieu === 'serre'), true);
  assertEqual(buildSerre(s).ok, false);
  assertEqual(allPlots(s).length, 12, '6 du Potager et 6 de la Serre');
  assertEqual(findPlot(s, 'serre-3').lieu, 'serre');
});

test('Serre : +3 parcelles par niveau, 300 / 600 / 1 000 / 1 800 pièces', () => {
  const s = garden();
  s.pieces = 100000;
  buildSerre(s);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const cost = serreUpgradeCost(s);
    const before = s.pieces;
    assert(upgradeSerre(s).ok);
    seen.push([s.serre.niveau, s.serre.parcelles.length, before - s.pieces, cost]);
  }
  assertEqual(seen, [[2, 9, 300, 300], [3, 12, 600, 600], [4, 15, 1000, 1000], [5, 18, 1800, 1800]]);
  assertEqual(serreUpgradeCost(s), null);
  assertEqual(upgradeSerre(s).ok, false, 'niveau maximum');
  assertEqual(upgradeSerre(garden()).ok, false, 'pas construite');
});

test('Serre : tomate, courgette, aubergine, poivron, cacao, vanille, café', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(s);
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
  // Sur DATA.crops directement, sans passer par l'interface : seul le lieu
  // 'serre' est déclaré.
  for (const c of rente) assertEqual(DATA.crops[c].lieux, ['serre']);
  // plant() lui-même refuse la Zone de culture, pas seulement l'écran de
  // plantation (qui se contente de ne pas les proposer) : c'est bien la
  // fonction de plantation qui porte la règle.
  const s = garden();
  s.pieces = 5000;
  buildSerre(s);
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
  setHealth(s, 5); // famille affamée : la présence de stock ne doit rien changer
  const plan = planMeal(s);
  assertEqual(plan.mange, {}, 'aucune de ces 3 cultures ne nourrit jamais la famille');
  assertEqual(plan.couverture, 0);
  feedFamily(s);
  assertEqual([countItem(s, 'cacao'), countItem(s, 'vanille'), countItem(s, 'cafe')], [50, 50, 50], 'rien n\'est consommé');
});

test('Serre : insensible aux saisons, en été comme en hiver', () => {
  for (const day of [1, 11, 21, 31]) {
    const s = garden();
    s.pieces = 5000;
    buildSerre(s);
    s.day = day;
    plant(s, 'serre-1', 'tomate');
    const before = s.eauMl;
    assert(water(s, 'serre-1').ok);
    assertEqual(before - s.eauMl, ml(3), `3 L exactement à la nuit ${day}`);
    findPlot(s, 'serre-1').stade = maxStage(findPlot(s, 'serre-1'));
    assertEqual(harvest(s, 'serre-1').items.tomate, 10, `10 tomates à la nuit ${day}`);
  }
  // au même moment, le Potager subit l'hiver
  const s = garden();
  s.day = 31;
  plantRipe(s, 'potager-1', 'tomate');
  assertEqual(harvest(s, 'potager-1').items.tomate, 7);
});

test('Serre : pousse une nuit arrosée, et les récoltes prêtes la comptent', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(s);
  plant(s, 'serre-1', 'tomate');
  water(s, 'serre-1');
  sleepOnce(s);
  assertEqual(findPlot(s, 'serre-1').stade, 1);
  findPlot(s, 'serre-1').stade = 5;
  assertEqual(readyCrops(s), [{ culture: 'tomate', nombre: 1, montee: false }]);
});

/* --- Verger --- */

test('Verger : 2 emplacements au départ, aucun arbre', () => {
  const s = orchard();
  assertEqual([s.verger.construit, s.verger.places, s.verger.arbres.length, orchardFree(s)], [true, 2, 0, 2]);
  assertEqual(buildVerger(s).ok, false, 'déjà aménagé');
  assertEqual(buyTree(garden(), 'pommier').ok, false, 'sans Verger');
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
  const a = buyTree(s, 'pommier');
  assertEqual([a.ok, a.cost, s.pieces], [true, 40, 60]);
  assertEqual(buyTree(s, 'poirier').ok, true);
  assertEqual(s.pieces, 20);
  assertEqual(s.verger.arbres.map((t) => [t.id, t.espece, t.plantee]), [['arbre-1', 'pommier', 1], ['arbre-2', 'poirier', 1]]);
  s.pieces = 500;
  assertEqual(buyTree(s, 'pommier').ok, false, 'verger plein');
  assertEqual(s.pieces, 500);
  buyOrchardSlot(s);
  assertEqual(buyTree(s, 'pommier').ok, true, 'un emplacement acheté');
  assertEqual(buyTree(s, 'cerisier').ok, false, 'arbre inconnu');
  const poor = orchard();
  poor.pieces = 39;
  assertEqual(buyTree(poor, 'pommier').ok, false);
});

test('Verger : première récolte 15 nuits après la plantation', () => {
  const s = orchard();
  protect(s, 'pomme');
  s.day = 10;
  buyTree(s, 'pommier');
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

test('Verger : arbre planté en début d\'année, première récolte à la nuit 18 (dans la fenêtre)', () => {
  const s = orchard();
  protect(s, 'poire');
  buyTree(s, 'poirier');
  const fruits = {};
  while (s.day <= 30) {
    const day = s.day;
    const r = sleepOnce(s);
    if (r.fruits.poire) fruits[day] = r.fruits.poire;
  }
  assertEqual(fruits, { 18: 6, 21: 6, 24: 6, 27: 6, 30: 6 });
});

test('Verger : fenêtre de production, fin d\'été et automne, 30 fruits par an', () => {
  assertEqual(orchardWindow(), { debut: 16, fin: 30 });
  const days = [];
  for (let d = 1; d <= 80; d++) if (orchardProducesOn(d)) days.push(d);
  assertEqual(days, [18, 21, 24, 27, 30, 58, 61, 64, 67, 70]);
  const s = orchard();
  protect(s, 'pomme');
  s.verger.arbres.push({ id: 'arbre-9', espece: 'pommier', plantee: -100 });
  const seasons = { printemps: 0, ete: 0, automne: 0, hiver: 0 };
  for (let i = 0; i < 40; i++) {
    const saison = currentSeason(s);
    seasons[saison] += sleepOnce(s).fruits.pomme || 0;
  }
  // nuit 18 (été), puis 21, 24, 27 et 30 (automne)
  assertEqual(seasons, { printemps: 0, ete: 6, automne: 24, hiver: 0 });
  assertEqual(seasons.ete + seasons.automne, 30, '30 fruits par an et par arbre');
});

test('Verger : chaque arbre donne 6 fruits de son espèce, pas d\'arrosage', () => {
  const s = orchard();
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
  assertEqual(buildFridge(s).ok, false);
  s.pieces = 700;
  const r = buildFridge(s);
  assertEqual([r.ok, r.cost, s.pieces], [true, 600, 100]);
  assertEqual(buildFridge(s).ok, false, 'déjà construit');
  const d = findDevice(s, 'frigo');
  assertEqual([d.type, d.allume, d.usure, d.prix], ['frigo', true, 0, 600]);
  assertEqual(allDevices(s).includes(d), true);
  assertEqual(upgradeCost(d), null, 'pas de niveaux');
  assertEqual(maintainCost(d), 120);
  assertEqual(repairCost(d), 300);
});

test('Réfrigérateur : consommation 5 Wh/s + 50 mWh/s par unité, prise dans les batteries', () => {
  const s = coldRoom();
  assertEqual(fridgeRate(s), kwh(0.005));
  setInv(s, { carotte: 100 });
  moveToFridge(s, 'carotte', 100);
  assertEqual(fridgeRate(s), kwh(0.01), '100 unités : 0,005 + 0,005');
  const before = s.batteries[0].chargeMwh;
  runFor(s, 10);
  assertEqual(before - s.batteries[0].chargeMwh, kwh(0.1), 'soit 100 Wh en 10 s');
  const d = findDevice(s, 'frigo');
  assertEqual(d.conso, kwh(0.01), 'consommation affichée (mWh/s)');
  assertEqual(s.frigo.alimente, true);
  assertEqual(deviceStatus(s, d).code, 'marche');
});

test('Réfrigérateur : batteries en sens inverse, et il passe avant la pompe', () => {
  assertEqual(CONSUMERS[0].id, 'frigo');
  const s = coldRoom();
  testAddDevice(s, 'batterie');
  s.batteries[0].chargeMwh = kwh(1);
  s.batteries[1].chargeMwh = kwh(1);
  runFor(s, 10);
  assertEqual(s.batteries[1].chargeMwh, kwh(1 - 0.05), 'la dernière se vide d\'abord');
  assertEqual(s.batteries[0].chargeMwh, kwh(1));
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
  const s = coldRoom();
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
  const s = coldRoom();
  setInv(s, { carotte: 100, conserve: 500 });
  moveToFridge(s, 'carotte', 100);
  s.frigo.alimenteMs = 30000;
  s.frigo.eveilMs = 30000;
  s.batteries[0].chargeMwh = kwh(5);
  const need = fridgeNightNeed(s);
  assertEqual(need, kwh(0.3), '(5 000 + 100 × 50) mWh/s × 30 s = 300 Wh');
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
  const s = coldRoom();
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
  buildSerre(s);
  buildVerger(s);
  buyTree(s, 'pommier');
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
  assertEqual(currentSeason(m), 'automne');
  assertEqual(m.serre, { construit: false, niveau: 1, parcelles: [] });
  assertEqual(m.verger.places, 2);
  assertEqual(m.frigo.construit, false);
  assertEqual(m.nuit.fruits, {});
  tick(m, 0.2);
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }).version, STATE_VERSION);
});

test('mode test Lot 8 : saison suivante, constructions gratuites, batteries vides', () => {
  const s = garden();
  const seen = [];
  for (let i = 0; i < 5; i++) {
    testNextSeason(s);
    seen.push([s.day, currentSeason(s)]);
  }
  assertEqual(seen, [[11, 'ete'], [21, 'automne'], [31, 'hiver'], [41, 'printemps'], [51, 'ete']]);
  s.day = 5;
  testNextSeason(s);
  assertEqual(s.day, 11, 'depuis le milieu du printemps');
  const t = farm();
  testFillBatteries(t);
  t.pieces = 0;
  testBuildSerre(t);
  testBuildVerger(t);
  testBuildFridge(t);
  assertEqual([t.serre.construit, t.serre.parcelles.length, t.verger.construit, t.frigo.construit, t.pieces], [true, 6, true, true, 0]);
  assertEqual(t.frigo.appareil.type, 'frigo');
  testBuildSerre(t);
  assertEqual(t.serre.parcelles.length, 6, 'sans doublon');
  testEmptyBatteries(t);
  t.panneaux[0].allume = false;
  assertEqual(availableEnergy(t), 0);
  runFor(t, 1);
  assertEqual(t.frigo.alimente, false);
});

test('rapport de réveil Lot 8 : saison, fruits et état du frigo', () => {
  const s = coldRoom();
  s.day = 10;
  const r = sleepOnce(s);
  assertEqual([r.saison, r.nuitDeSaison], ['ete', 1]);
  assertEqual(r.frigo.construit, true);
  assertEqual(typeof r.frigo.couvreLaNuit, 'boolean');
  assertEqual(r.fruits, {});
});

/* ---------- Lot 9 : autonomie et chapitres ---------- */

// Partie de test placée au chapitre `n` (1 à 7 ; 8 = campagne finie), pompe coupée.
function atChapter(n) {
  const s = farm();
  assert(testGoToChapter(s, n).ok, `aller au chapitre ${n}`);
  return s;
}

// Une nuit avec exactement `qty` unités de `item` d'origine « produit » au menu
// (jamais gardées en réserve), plus des conserves pour le reste. `item` vaut
// patate par défaut (19 d'énergie depuis le Lot 11) ; un autre item (ex.
// courgette, 10 d'énergie) permet d'atteindre des pourcentages d'autonomie
// précis que les multiples de 19 ne permettent pas.
function nightWithProduced(s, qty, item = 'patate') {
  s.famille.reserve = {};
  setInv(s, { [item]: qty, conserve: 30 });
  return sleepOnce(s);
}

function okList(s) {
  return chapterProgress(s).objectifs.map((o) => o.ok);
}

test('DATA Lot 9 : sept chapitres, objectifs et déblocages', () => {
  const L = DATA.CHAPITRES.liste;
  assertEqual(L.map((c) => c.titre), ['L\'eau et le soleil', 'Le premier potager', 'Le poulailler', 'Le four et le livre de recette', 'Le troupeau', 'Toute l\'année', 'Famille autonome']);
  assertEqual(L.map((c) => c.debloque), [[], [], ['champ', 'silo', 'poulailler'], ['four', 'cuisine', 'moulin', 'presse', 'tournesol'], ['paturage', 'moutons'], ['serre', 'verger', 'frigo'], []]);
  assertEqual(L.map((c) => c.objectifs.map((o) => [o.type, o.cible])), [
    [['litres', 50], ['wh', 3000]], [['carottes', 20], ['autonomie', 25]], [['pontes', 7], ['sante', 80]],
    [['pains', 5], ['plats', 3]], [['laines', 10], ['autonomie', 60]], [['hiver', 1]], [['serie100', 7]],
  ]);
  assertEqual(DATA.CHAPITRES.liste[5].objectifs[0].moyenne, 80);
  assertEqual(DATA.AUTONOMIE, { HISTORIQUE_MAX: 1000, GRAPHIQUE_NUITS: 20 });
  // chaque élément débloqué est décrit, et n'apparaît que dans un chapitre
  const ids = L.flatMap((c) => c.debloque);
  assertEqual(new Set(ids).size, ids.length);
  for (const id of ids) assert(DATA.CHAPITRES.ELEMENTS[id], `libellé de ${id}`);
  assertEqual(Object.keys(DATA.CHAPITRES.ELEMENTS).sort(), [...ids].sort());
});

test('état initial Lot 9 : chapitre 1, compteurs à zéro, historique vide', () => {
  const s = createInitialState(1);
  assertEqual(s.campagne, {
    chapitre: 1, fini: false, annonces: [], historique: [],
    compteurs: { eauMl: 0, mwhMax: 0, carottes: 0, serieOeufs: 0, pains: 0, plats: [], laines: 0, serie100: 0, nuits100: 0, hiver: null, hiverDernier: null, hiverReussi: false },
  });
  assertEqual(chapterReached(s), 1);
  assertEqual(lastAutonomy(s), 0);
});

/* --- autonomie --- */

test('autonomie : énergie « produit » mangée ÷ besoin, plafonnée à 100 %', () => {
  assertEqual(autonomyPercent(75, 150), 50);
  assertEqual(autonomyPercent(30, 150), 20);
  assertEqual(autonomyPercent(165, 150), 100);
  assertEqual(autonomyPercent(0, 150), 0);
  assertEqual(autonomyPercent(50, 0), 0);
  const s = farm();
  s.famille.reserve = {};
  // Lot 11 (nutrition) : patate à 19, 6 unités (114) restent sous le besoin (150).
  setInv(s, { patate: 6, conserve: 100 }); // 6 × 19 = 114 produit
  const r = sleepOnce(s);
  assertEqual([r.energieProduit, r.autonomie], [114, 76]);
  assertEqual(s.campagne.historique, [{ nuit: 1, pct: 76, energie: 114 }]);
  assertEqual(lastAutonomy(s), 76);
});

test('autonomie : les conserves n\'y comptent pas', () => {
  const s = farm();
  setInv(s, { conserve: 6 }); // 6 × 25 = 150 couvre le besoin (150) : la famille est nourrie, mais rien n'est produit
  const r = sleepOnce(s);
  assertEqual(r.couverture, 100);
  assertEqual([r.energieMangee, r.energieProduit, r.autonomie], [150, 0, 0]);
});

test('autonomie : un achat du Marché n\'y compte pas, une récolte oui', () => {
  const s = farm();
  s.famille.reserve = {};
  setInv(s, { conserve: 10 });
  s.pieces = 500;
  assert(buyItem(s, 'carotte', 4).ok, 'acheter 4 carottes');
  addItem(s, 'carotte', 15); // récoltées
  assertEqual(lotsOf(s, 'carotte').map((l) => [l.qty, l.origin]).sort(), [[4, 'acheté'], [15, 'produit']].sort());
  // Lot 11 (nutrition) : carotte à 8 d'énergie, 19 (=4+15) couvrent le besoin (152) avant les conserves
  const r = sleepOnce(s);
  assertEqual(r.energieMangee, 152);
  assertEqual(r.energieProduit, 120, 'seules les 15 carottes récoltées comptent');
  assertEqual(r.autonomie, 80);
});

test('autonomie : un plat cuisiné compte, les œufs du frigo gardent leur origine', () => {
  const s = coldRoom();
  s.famille.reserve = {};
  setInv(s, { conserve: 4 });
  addItem(s, 'oeuf', 10);
  addLot(s, 'oeuf', 10, 'acheté');
  assert(moveToFridge(s, 'oeuf', 20).ok, 'ranger les œufs au frigo');
  // Lot 11 (nutrition) : à rang égal (rien ne périme), la conserve (25 énergie)
  // passe avant l'œuf (13) : 4 conserves (100) + 4 œufs (52) couvrent les 150
  // énergies du besoin ; les 4 œufs viennent du lot « produit », le plus ancien
  // des deux lots au frigo
  const r = sleepOnce(s);
  assertEqual([r.energieMangee, r.energieProduit, r.autonomie], [152, 52, 34], '52 ÷ 150 = 34,7 %, arrondi vers le bas');
});

test('autonomie : la prévision de la nuit est celle qui est vraiment mesurée', () => {
  const s = farm();
  s.famille.reserve = {};
  setInv(s, { patate: 5, carotte: 10, conserve: 10 });
  addLot(s, 'carotte', 7, 'acheté');
  const prevue = plannedAutonomy(s);
  assert(prevue > 0 && prevue < 100);
  assertEqual(sleepOnce(s).autonomie, prevue);
});

test('autonomie : l\'historique garde une entrée par nuit, dans la limite fixée', () => {
  const s = farm();
  for (let i = 0; i < 3; i++) sleepOnce(s);
  assertEqual(s.campagne.historique.map((h) => h.nuit), [1, 2, 3]);
  assertEqual(autonomyHistory(s, 2).map((h) => h.nuit), [2, 3]);
  const saved = DATA.AUTONOMIE.HISTORIQUE_MAX;
  DATA.AUTONOMIE.HISTORIQUE_MAX = 5;
  try {
    const t = farm();
    for (let i = 0; i < 8; i++) {
      setInv(t, { conserve: 50 });
      sleepOnce(t);
    }
    assertEqual(t.campagne.historique.map((h) => h.nuit), [4, 5, 6, 7, 8]);
  } finally {
    DATA.AUTONOMIE.HISTORIQUE_MAX = saved;
  }
});

/* --- compteurs --- */

test('compteurs : litres pompés au total, record de kWh stockés', () => {
  const s = farm({ pump: true });
  runFor(s, 10);
  assertEqual(s.campagne.compteurs.eauMl, s.jour.eau, 'mL pompés au total');
  assert(s.campagne.compteurs.eauMl > ml(9.9), `eau ${s.campagne.compteurs.eauMl}`);
  const stored = s.batteries[0].chargeMwh;
  assertEqual(s.campagne.compteurs.mwhMax, stored, 'le record suit la charge');
  testFillBatteries(s);
  tick(s, 0.2);
  const record = s.campagne.compteurs.mwhMax;
  assert(record > kwh(4.99) && record <= kwh(5), `record ${record}`);
  testEmptyBatteries(s);
  runFor(s, 1);
  assertEqual(s.campagne.compteurs.mwhMax, record, 'un record ne redescend pas');
});

testBase('compteurs : carottes récoltées (la carotte montée en graine ne compte pas)', () => {
  const s = garden();
  plantRipe(s, 'potager-1', 'carotte');
  assert(harvest(s, 'potager-1').ok);
  assertEqual(s.campagne.compteurs.carottes, 10);
  plantRipe(s, 'potager-2', 'tomate');
  assert(harvest(s, 'potager-2').ok);
  assertEqual(s.campagne.compteurs.carottes, 10, 'une tomate n\'est pas une carotte');
  assert(plant(s, 'potager-3', 'carotte').ok);
  findPlot(s, 'potager-3').stade = DATA.crops.carotte.stades;
  assert(toggleBolting(s, 'potager-3').ok);
  findPlot(s, 'potager-3').stade = maxStage(findPlot(s, 'potager-3'));
  assert(harvest(s, 'potager-3').ok);
  assertEqual(s.campagne.compteurs.carottes, 10, 'graines : pas de carottes');
});

testBase('compteurs : une récolte automatique compte aussi', () => {
  const s = garden();
  testSetBuildingLevel5(s, 'potager');
  plantRipe(s, 'potager-1', 'carotte');
  const r = harvest(s, 'potager-1', true);
  assertEqual(r.ok, true);
  assertEqual(s.campagne.compteurs.carottes, 10);
});

test('compteurs : laines tondues, pains cuits, plats différents', () => {
  const s = atelier();
  fillSheepAfterPasture(s);
  testWoolReady(s);
  for (const m of s.paturage.moutons) assert(shear(s, m.id).ok);
  assertEqual(s.campagne.compteurs.laines, 2);
  for (let i = 0; i < 2; i++) {
    addItem(s, 'farine', 2);
    s.eauMl = ml(40);
    assert(startRecipe(s, 'pain').ok);
    runFor(s, 25);
  }
  assertEqual([s.campagne.compteurs.pains, s.campagne.compteurs.plats], [2, []], 'le pain n\'est pas un plat');
  addItem(s, 'ble', 3);
  assert(startMilling(s, 1).ok);
  runFor(s, 10);
  assertEqual([s.campagne.compteurs.pains, s.campagne.compteurs.plats], [2, []], 'moudre n\'est ni un pain ni un plat');
  for (let i = 0; i < 2; i++) {
    addItem(s, 'oeuf', 3);
    addItem(s, 'huile', 1);
    assert(startRecipe(s, 'omelette').ok);
    runFor(s, 20);
  }
  assertEqual(s.campagne.compteurs.plats, ['omelette'], 'le même plat ne compte qu\'une fois');
  addItem(s, 'patate', 3);
  addItem(s, 'oeuf', 1);
  assert(startRecipe(s, 'gratin_patates').ok);
  runFor(s, 35);
  assertEqual(s.campagne.compteurs.plats, ['omelette', 'gratin_patates']);
});

function fillSheepAfterPasture(s) {
  assert(buildPaturage(s).ok, 'débloquer le Pâturage');
  fillSheep(s, 2);
}

/* --- objectifs de chapitre --- */

test('chapitre 1 : pomper 50 L et stocker 3 000 Wh', () => {
  const s = atChapter(1);
  s.pompe.allume = true;
  runFor(s, 50); // le réservoir (40 L) se remplit, pas plus
  assertEqual(s.campagne.compteurs.eauMl, ml(40));
  assertEqual(okList(s), [false, false]);
  s.eauMl = ml(0); // l'eau a servi
  runFor(s, 12);
  assertEqual(okList(s), [true, false], 'plus de 50 L, mais moins de 3 000 Wh');
  assertEqual(s.campagne.chapitre, 1);
  testFillBatteries(s);
  tick(s, 0.2);
  assertEqual(s.campagne.chapitre, 2, 'objectif rempli : chapitre suivant');
  assertEqual(s.campagne.annonces, [{ chapitre: 1, nuit: 1 }]);
});

test('chapitre 1 : 3 kWh sans 50 L ne suffit pas', () => {
  const s = atChapter(1);
  testFillBatteries(s);
  tick(s, 0.2);
  assertEqual(okList(s), [false, true]);
  assertEqual(s.campagne.chapitre, 1);
});

testBase('chapitre 2 : 20 carottes et 25 % d\'autonomie', () => {
  const s = atChapter(2);
  for (let i = 1; i <= 2; i++) {
    plantRipe(s, `potager-${i}`, 'carotte');
    assert(harvest(s, `potager-${i}`).ok);
  }
  updateChapters(s);
  assertEqual(okList(s), [true, false]);
  assertEqual(s.campagne.chapitre, 2);
  // Lot 11 (nutrition) : patate à 19 d'énergie (au lieu de 15).
  nightWithProduced(s, 1); // 19 / 150 ≈ 12,67 %, arrondi vers le bas
  assertEqual([lastAutonomy(s), okList(s)], [12, [true, false]]);
  nightWithProduced(s, 2); // 38 / 150 ≈ 25,33 %
  assertEqual(s.campagne.chapitre, 3);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [2]);
});

testBase('chapitre 2 : 25 % sans les 20 carottes ne suffit pas', () => {
  const s = atChapter(2);
  nightWithProduced(s, 6);
  assertEqual(okList(s), [false, true]);
  assertEqual(s.campagne.chapitre, 2);
});

testBase('chapitre 3 : 7 nuits de ponte d\'affilée et santé moyenne d\'au moins 80', () => {
  const s = atChapter(3);
  s.pieces = 5000;
  assert(buildSilo(s).ok);
  assert(buildPoulailler(s).ok);
  for (let i = 0; i < 4; i++) assert(buyAnimal(s, 'poule').ok);
  testAddWheat(s, 50);
  for (let night = 1; night <= 7; night++) {
    assertEqual(s.campagne.chapitre, 3, `nuit ${night} : toujours le chapitre 3`);
    assert(feedAllHens(s).ok);
    sleepOnce(s);
    assertEqual(s.campagne.compteurs.serieOeufs, night);
  }
  assertEqual(s.campagne.chapitre, 4);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [3]);
});

test('chapitre 3 : sept nuits sans la santé requise ne suffisent pas', () => {
  const s = atChapter(3);
  s.campagne.compteurs.serieOeufs = 7;
  setHealth(s, 79);
  assertEqual(okList(s), [true, false]);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 3);
  s.famille.membres[0].malade = true; // un malade compte pour 0
  setHealth(s, 100);
  s.famille.membres[0].malade = true;
  assertEqual(okList(s), [true, false], '3 en pleine santé + 1 malade = 75');
  s.famille.membres[0].malade = false;
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 4);
});

testBase('remise à zéro : une nuit sans œuf casse la série de ponte', () => {
  const s = atChapter(3);
  s.pieces = 5000;
  assert(buildSilo(s).ok);
  assert(buildPoulailler(s).ok);
  for (let i = 0; i < 4; i++) assert(buyAnimal(s, 'poule').ok);
  testAddWheat(s, 50);
  for (let night = 1; night <= 3; night++) {
    assert(feedAllHens(s).ok);
    sleepOnce(s);
  }
  assertEqual(s.campagne.compteurs.serieOeufs, 3);
  sleepOnce(s); // les poules n'ont pas été nourries : pas d'œuf
  assertEqual(s.campagne.compteurs.serieOeufs, 0);
  assert(feedAllHens(s).ok);
  sleepOnce(s);
  assertEqual(s.campagne.compteurs.serieOeufs, 1, 'la série repart de 1');
});

test('séries d\'affilée : elles ne comptent qu\'à partir du chapitre qui les porte', () => {
  const s = atChapter(1);
  testAddHens(s, 4);
  testAddWheat(s, 20);
  feedAllHens(s);
  sleepOnce(s);
  assertEqual(s.campagne.compteurs.serieOeufs, 0, 'chapitre 1 : la ponte ne compte pas encore');
  const t = atChapter(6);
  nightWithProduced(t, 22);
  assertEqual(t.campagne.compteurs.serie100, 0, 'chapitre 6 : les nuits à 100 % ne comptent pas encore');
});

testBase('chapitre 4 : 5 pains et 3 plats différents', () => {
  const s = atelier();
  testGoToChapter(s, 4);
  for (let i = 0; i < 5; i++) {
    addItem(s, 'farine', 2);
    s.eauMl = ml(40);
    assert(startRecipe(s, 'pain').ok);
    runFor(s, 25);
  }
  assertEqual([s.campagne.compteurs.pains, okList(s)], [5, [true, false]]);
  assertEqual(s.campagne.chapitre, 4, 'cinq pains ne font pas les trois plats');
  const dishes = [['omelette', { oeuf: 3, huile: 1 }, 20], ['gratin_patates', { patate: 3, oeuf: 1 }, 35], ['ratatouille', { tomate: 1, courgette: 1, aubergine: 1, huile: 1 }, 35]];
  dishes.forEach(([id, ing, secs], i) => {
    for (const [item, n] of Object.entries(ing)) addItem(s, item, n);
    assert(startRecipe(s, id).ok, id);
    runFor(s, secs);
    assertEqual(s.campagne.compteurs.plats.length, i + 1);
  });
  assertEqual(s.campagne.chapitre, 5);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [4]);
});

testBase('chapitre 5 : 10 laines et 60 % d\'autonomie', () => {
  const s = pature();
  testGoToChapter(s, 5);
  fillSheep(s, 3);
  for (let round = 0; round < 3; round++) {
    testWoolReady(s);
    for (const m of s.paturage.moutons) assert(shear(s, m.id).ok);
  }
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s)], [9, [false, false]]);
  testWoolReady(s);
  assert(shear(s, s.paturage.moutons[0].id).ok);
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s)], [10, [true, false]]);
  // Lot 11 (nutrition) : patate à 19 d'énergie (au lieu de 15).
  nightWithProduced(s, 4); // 76 / 150 ≈ 50,67 % : pas assez
  assertEqual(s.campagne.chapitre, 5);
  nightWithProduced(s, 5); // 95 / 150 ≈ 63,33 %
  assertEqual(s.campagne.chapitre, 6);
});

// Une nuit d'hiver avec `qty` unités de `item` (patate par défaut) produites au menu.
function winterNights(s, count, qty, item = 'patate') {
  for (let i = 0; i < count; i++) nightWithProduced(s, qty, item);
}

test('chapitre 6 : un hiver complet à 80 % en moyenne, sans soin', () => {
  const s = atChapter(6);
  s.day = 31; // première nuit de l'hiver
  assertEqual(currentSeason(s), 'hiver');
  winterNights(s, 9, 18); // 270 / 150 = 180 % (plafonné à 100 %)
  assertEqual([s.campagne.chapitre, s.campagne.compteurs.hiver.nuits], [6, 9]);
  winterNights(s, 1, 18);
  assertEqual(s.campagne.chapitre, 7);
  assertEqual(s.campagne.compteurs.hiverReussi, true);
  assertEqual(s.campagne.compteurs.hiverDernier.reussi, true);
  assertEqual(s.day, 41);
});

test('chapitre 6 : une moyenne de 79 % ne suffit pas', () => {
  const s = atChapter(6);
  s.day = 31;
  // Lot 11 (nutrition) : patate à 19 d'énergie, 6 unités (114) restent sous 80 %.
  winterNights(s, 10, 6); // 114 / 150 = 76 %
  assertEqual(s.campagne.chapitre, 6);
  assertEqual(s.campagne.compteurs.hiverDernier.reussi, false);
  assert(s.campagne.compteurs.hiverDernier.moyenne < 80);
});

test('chapitre 6 : la moyenne compte toutes les nuits, pas seulement la dernière', () => {
  const s = atChapter(6);
  s.day = 31;
  winterNights(s, 5, 10); // 190 / 150 : plafonné à 100 %
  // Lot 11 (nutrition) : courgette (10 d'énergie) donne un pourcentage exact,
  // ce que ne permettent pas les multiples de 19 (patate).
  winterNights(s, 5, 6, 'courgette'); // 60 / 150 = 40 %
  assertEqual(s.campagne.chapitre, 6);
  assert(near(s.campagne.compteurs.hiverDernier.moyenne, 70, 1e-6));
});

test('chapitre 6 : un soin payé pendant l\'hiver fait échouer l\'hiver', () => {
  const s = atChapter(6);
  s.day = 31;
  winterNights(s, 4, 22);
  s.pieces = 500;
  s.famille.membres[0].sante = 0;
  s.famille.membres[0].malade = true;
  assert(heal(s, 'adulte-1').ok);
  winterNights(s, 6, 22);
  assertEqual(s.campagne.chapitre, 6);
  assertEqual(s.campagne.compteurs.hiverDernier, { moyenne: 100, sansSoin: false, reussi: false });
});

test('chapitre 6 : un soin payé le matin de la première nuit compte, celui de la veille non', () => {
  const s = atChapter(6);
  s.day = 30;
  s.pieces = 500;
  s.famille.membres[0].sante = 0;
  s.famille.membres[0].malade = true;
  assert(heal(s, 'adulte-1').ok); // veille de l'hiver
  nightWithProduced(s, 22);
  assertEqual(s.day, 31);
  winterNights(s, 10, 22);
  assertEqual(s.campagne.chapitre, 7, 'le soin de la veille ne compte pas');
  const t = atChapter(6);
  t.day = 31;
  t.pieces = 500;
  t.famille.membres[0].sante = 0;
  t.famille.membres[0].malade = true;
  assert(heal(t, 'adulte-1').ok); // premier matin de l'hiver
  winterNights(t, 10, 22);
  assertEqual(t.campagne.chapitre, 6, 'le soin du premier jour compte');
});

test('chapitre 6 : un hiver commencé en cours de route ne compte pas', () => {
  const s = atChapter(6);
  s.day = 33;
  winterNights(s, 8, 22);
  assertEqual(s.day, 41);
  assertEqual([s.campagne.chapitre, s.campagne.compteurs.hiver, s.campagne.compteurs.hiverDernier], [6, null, null]);
});

test('chapitre 6 : arrivé au chapitre en pleine nuit d\'hiver, on attend le suivant', () => {
  const s = atChapter(5);
  s.day = 30;
  nightWithProduced(s, 22); // dernière nuit d'automne
  testCompleteChapter(s); // chapitre 6 atteint le matin du premier jour d'hiver
  assertEqual([s.day, s.campagne.chapitre], [31, 6]);
  winterNights(s, 10, 22);
  assertEqual(s.campagne.chapitre, 7, 'un hiver suivi dès sa première nuit compte');
});

test('chapitre 7 : 100 % pendant 7 nuits d\'affilée termine la campagne', () => {
  const s = atChapter(7);
  for (let night = 1; night <= 6; night++) {
    nightWithProduced(s, 22); // 330 : 100 %
    assertEqual([s.campagne.compteurs.serie100, s.campagne.fini], [night, false]);
  }
  nightWithProduced(s, 22);
  assertEqual(s.campagne.fini, true);
  assertEqual(s.campagne.chapitre, 7);
  assertEqual(chapterReached(s), 8);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [7]);
});

test('remise à zéro : une nuit sous 100 % casse la série d\'autonomie', () => {
  const s = atChapter(7);
  for (let i = 0; i < 4; i++) nightWithProduced(s, 22);
  assertEqual(s.campagne.compteurs.serie100, 4);
  // Lot 11 (nutrition) : 7 patates (133) restent sous 150, contre 9 avant l'augmentation.
  nightWithProduced(s, 7); // 133 / 150 ≈ 88,67 %
  assertEqual(s.campagne.compteurs.serie100, 0);
  for (let i = 0; i < 6; i++) nightWithProduced(s, 22);
  assertEqual([s.campagne.compteurs.serie100, s.campagne.fini], [6, false]);
  nightWithProduced(s, 22);
  assertEqual(s.campagne.fini, true);
});

test('chapitres : la campagne finie ne recule pas et ne recompte rien', () => {
  const s = atChapter(8);
  assertEqual(updateChapters(s), 0);
  assertEqual(completeChapter(s).ok, false);
  assertEqual(s.campagne.annonces, []);
});


test('cultures plantables : le plein champ attend le chapitre 3, le tournesol le chapitre 4', () => {
  const legumes = ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'epinard', 'fraise'];
  // Les légumes de la Zone de culture sont disponibles dès le chapitre 1, sans
  // chapitre de déblocage dédié (voir DATA.CHAPITRES.liste[*].debloque).
  assertEqual(plantableCropsFor(atChapter(1), 'potager'), legumes);
  assertEqual(plantableCropsFor(atChapter(2), 'potager'), legumes, 'pas de blé avant le déblocage « champ »');
  // Blé, riz et houblon arrivent avec le déblocage « champ » (chapitre 3) : au
  // moment exact où il fallait autrefois construire le Champ. Le tournesol
  // attend en plus son propre déblocage (chapitre 4).
  assertEqual(plantableCropsFor(atChapter(3), 'potager'), [...legumes, 'ble', 'riz', 'houblon']);
  assertEqual(plantableCropsFor(atChapter(4), 'potager'), [...legumes, 'ble', 'tournesol', 'riz', 'houblon']);
  assertEqual(plantableCropsFor(atChapter(8), 'potager'), [...legumes, 'ble', 'tournesol', 'riz', 'houblon']);
  assertEqual(plantableCropsFor(atChapter(8), 'champ'), [], 'le lieu « champ » n\'existe plus');
  assertEqual(['ble', 'riz', 'houblon', 'tournesol', 'carotte'].map((c) => [2, 3, 4].map((n) => cropUnlocked(atChapter(n), c))),
    [[false, true, true], [false, true, true], [false, true, true], [false, false, true], [true, true, true]]);
  // la Serre n'est pas concernée : ses cultures ne demandent aucun déblocage
  assertEqual(plantableCropsFor(atChapter(1), 'serre'), plantableCrops('serre'));
  // libellé du déblocage pour le joueur : plus un bâtiment, des cultures
  assertEqual(DATA.CHAPITRES.ELEMENTS.champ, { nom: 'Cultures de plein champ', icone: '🌾', note: 'blé pour les poules et la farine' });
});

test('affichage : pourcentage arrondi vers le bas, 100 % seulement à 100', () => {
  assertEqual([formatPercent(0), formatPercent(37.5), formatPercent(99.99), formatPercent(100), formatPercent(undefined)], ['0\u00a0%', '37\u00a0%', '99\u00a0%', '100\u00a0%', '0\u00a0%']);
});

test('hiver : première nuit de la saison et état du suivi', () => {
  assertEqual([nextSeasonStart(1, 'hiver'), nextSeasonStart(31, 'hiver'), nextSeasonStart(32, 'hiver'), nextSeasonStart(40, 'hiver'), nextSeasonStart(41, 'hiver'), nextSeasonStart(75, 'hiver')], [31, 31, 71, 71, 71, 111]);
  const s = atChapter(6);
  assertEqual(winterStatus(s).etat, 'attente');
  s.day = 31;
  assertEqual([winterStatus(s).etat, winterStatus(s).prochaine], ['attente', 31], 'l\'hiver commence aujourd\'hui');
  nightWithProduced(s, 22);
  let w = winterStatus(s);
  assertEqual([w.etat, w.nuits, w.moyenne, w.soinPaye], ['suivi', 1, 100, false]);
  s.pieces = 500;
  s.famille.membres[1].sante = 0;
  s.famille.membres[1].malade = true;
  assert(heal(s, 'adulte-2').ok);
  assertEqual(winterStatus(s).soinPaye, true);
  const t = atChapter(6);
  t.day = 33;
  assertEqual([winterStatus(t).etat, winterStatus(t).prochaine], ['manque', 71]);
  const u = atChapter(6);
  u.day = 31;
  winterNights(u, 10, 22);
  assertEqual(winterStatus(u).etat, 'reussi');
});

/* --- annonces --- */

test('annonces : un écran de fin par chapitre terminé, vidé un à un', () => {
  const s = atChapter(1);
  assert(testCompleteChapter(s).ok);
  assert(testCompleteChapter(s).ok);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [1, 2]);
  assertEqual(s.campagne.chapitre, 3);
  assertEqual(acknowledgeChapter(s), { ok: true, restantes: 1 });
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [2]);
  assertEqual(acknowledgeChapter(s), { ok: true, restantes: 0 });
  assertEqual(acknowledgeChapter(s).ok, false);
});

test('rapport de réveil Lot 9 : autonomie, chapitre en cours et chapitres terminés', () => {
  const s = atChapter(2);
  s.famille.reserve = {};
  // Lot 11 (nutrition) : patate à 19 d'énergie, 6 unités (114) sous le besoin (150).
  setInv(s, { patate: 6, conserve: 10 });
  s.campagne.compteurs.carottes = 20;
  const r = sleepOnce(s);
  assertEqual([r.autonomie, r.energieProduit, r.chapitre, r.chapitresTermines], [76, 114, 3, [2]]);
});

/* --- masquage --- */

test('déblocages : chaque chapitre atteint ouvre ses éléments', () => {
  const at = (n, id) => isUnlocked(atChapter(n), id);
  const groups = { 3: ['champ', 'silo', 'poulailler'], 4: ['four', 'cuisine', 'moulin', 'presse', 'tournesol'], 5: ['paturage', 'moutons'], 6: ['serre', 'verger', 'frigo'] };
  for (const [ch, ids] of Object.entries(groups)) {
    for (const id of ids) {
      assertEqual([id, ch - 1 >= 1 && at(ch - 1, id)], [id, false], `${id} masqué au chapitre ${ch - 1}`);
      assertEqual([id, at(Number(ch), id)], [id, true], `${id} visible au chapitre ${ch}`);
      assertEqual([id, at(7, id)], [id, true], `${id} visible ensuite`);
      assertEqual([id, at(8, id)], [id, true], `${id} visible en mode libre`);
    }
  }
  assertEqual(['champ', 'four', 'paturage', 'serre'].map((id) => at(1, id)), [false, false, false, false]);
  assertEqual(['champ', 'four', 'paturage', 'serre'].map((id) => at(4, id)), [true, true, false, false]);
});

test('déblocages : le Potager, la pompe et le Marché sont là dès le départ', () => {
  const s = atChapter(1);
  for (const id of ['potager', 'pompe', 'panneau', 'batterie', 'comptoir']) assertEqual([id, isUnlocked(s, id)], [id, true]);
  assertEqual(unlockChapter('potager'), 0);
  assertEqual([unlockChapter('champ'), unlockChapter('presse'), unlockChapter('moutons'), unlockChapter('frigo')], [3, 4, 5, 6]);
});

test('masquage : un chapitre qui avance ne détruit rien de ce que la partie possède', () => {
  const s = createInitialState(1);
  s.pieces = 5000;
  addItem(s, 'ble', 1);
  assert(plant(s, 'potager-1', 'ble').ok, 'les actions du moteur restent libres : le masquage est celui de l\'interface');
  assert(buildPoulailler(s).ok);
  testGoToChapter(s, 1);
  assertEqual([findPlot(s, 'potager-1').culture, s.poulailler.construit], ['ble', true]);
  assertEqual([isUnlocked(s, 'champ'), isUnlocked(s, 'poulailler')], [false, false]);
  assertEqual(plantableCropsFor(s, 'potager').includes('ble'), false, 'le blé n\'est pas proposé avant le chapitre 3');
});

/* --- migration --- */

// Sauvegarde de la version 9 (Lot 8) : une partie sans campagne, avec le Champ
// de l'époque (à construire).
function v9State(mutate) {
  const s = createInitialState(4);
  s.champ = { construit: false, niveau: 1, parcelles: [] };
  delete s.campagne;
  delete s.nuit.energieProduit;
  delete s.nuit.autonomie;
  delete s.jour.soins;
  s.version = 9;
  if (mutate) mutate(s);
  return s;
}

test('migration v9 → v10 : une partie neuve arrive au chapitre 1', () => {
  const m = migrate({ v: 9, t: 0, s: v9State() });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.campagne.chapitre, m.campagne.fini, m.campagne.annonces, m.campagne.historique], [1, false, [], []]);
  assertEqual(m.campagne.compteurs, newCampaignCounters());
  assertEqual([m.nuit.energieProduit, m.nuit.autonomie, m.jour.soins], [0, 0, 0]);
});

test('migration v9 → v10 : le chapitre suit ce que la partie possède', () => {
  const chapitre = (mutate) => migrate({ v: 9, t: 0, s: v9State(mutate) }).campagne.chapitre;
  assertEqual(chapitre((s) => { s.day = 6; }), 2, 'quelques nuits passées, rien de débloqué');
  assertEqual(chapitre((s) => { s.potager.niveau = 2; }), 2, 'Potager agrandi');
  assertEqual(chapitre((s) => { s.champ.construit = true; }), 3, 'Champ');
  assertEqual(chapitre((s) => { s.silo.construit = true; }), 3, 'Silo');
  assertEqual(chapitre((s) => { s.poulailler.construit = true; }), 3, 'Poulailler');
  assertEqual(chapitre((s) => { s.stations.four.construit = true; }), 4, 'Four');
  assertEqual(chapitre((s) => { s.stations.moulin.construit = true; }), 4, 'Moulin');
  assertEqual(chapitre((s) => { s.paturage.construit = true; }), 5, 'Pâturage');
  assertEqual(chapitre((s) => { s.paturage.moutons.push({ id: 'mouton-1', poids: 20, laine: 0 }); }), 5, 'mouton');
  assertEqual(chapitre((s) => { s.serre.construit = true; }), 6, 'Serre');
  assertEqual(chapitre((s) => { s.verger.arbres.push({ id: 'arbre-1', espece: 'pommier', plantee: 1 }); }), 6, 'arbre');
  assertEqual(chapitre((s) => { s.frigo.construit = true; }), 6, 'Réfrigérateur');
  assertEqual(chapitre((s) => { s.champ.construit = true; s.paturage.construit = true; s.day = 80; }), 5, 'le plus avancé l\'emporte');
  assertEqual(chapitre((s) => { s.champ.parcelles = [{ id: 'champ-1', culture: 'tournesol' }]; }), 4, 'tournesol planté');
});

test('migration v9 → v10 : la partie migrée continue, tout ce qu\'elle possède est visible', () => {
  const m = migrate({ v: 9, t: 0, s: v9State((s) => { s.day = 30; s.pieces = 777; openSerre(s); openFridge(s); }) });
  assertEqual([m.day, m.pieces, m.campagne.chapitre], [30, 777, 6]);
  for (const id of ['serre', 'verger', 'frigo', 'champ', 'four', 'moutons']) assertEqual([id, isUnlocked(m, id)], [id, true]);
  tick(m, 0.2);
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  assertEqual(m.campagne.historique.length, 1);
  assertEqual(JSON.parse(JSON.stringify(m)), m);
  const again = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.campagne, m.campagne, 'une partie déjà à jour n\'est pas replacée');
});

test('migration : une sauvegarde très ancienne traverse toutes les versions jusqu\'au chapitre 2', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 4, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual([m.version, m.campagne.chapitre], [STATE_VERSION, 2]);
});

/* --- mode test --- */

test('mode test Lot 9 : valider le chapitre en cours', () => {
  const s = atChapter(1);
  assertEqual(testCompleteChapter(s), { ok: true, chapitre: 2, fini: false });
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [1]);
  for (let i = 0; i < 5; i++) testCompleteChapter(s);
  assertEqual([s.campagne.chapitre, s.campagne.fini], [7, false]);
  assertEqual(testCompleteChapter(s), { ok: true, chapitre: 7, fini: true });
  assertEqual(testCompleteChapter(s).ok, false, 'la campagne est terminée');
});

test('mode test Lot 9 : aller à un chapitre donné', () => {
  const s = createInitialState(1);
  s.campagne.compteurs.laines = 12;
  s.campagne.annonces.push({ chapitre: 1, nuit: 1 });
  assertEqual(testGoToChapter(s, 4), { ok: true, chapitre: 4, fini: false });
  assertEqual([s.campagne.compteurs.laines, s.campagne.annonces], [0, []], 'compteurs et annonces remis à zéro');
  assertEqual([isUnlocked(s, 'four'), isUnlocked(s, 'paturage')], [true, false]);
  assertEqual(testGoToChapter(s, 8), { ok: true, chapitre: 7, fini: true });
  assertEqual(isUnlocked(s, 'frigo'), true);
  assertEqual(testGoToChapter(s, 2), { ok: true, chapitre: 2, fini: false });
  assertEqual(s.campagne.fini, false);
  assertEqual(testGoToChapter(s, 0).ok, false);
  assertEqual(testGoToChapter(s, 9).ok, false);
  assertEqual(testGoToChapter(s, 'abc').ok, false);
  s.campagne.compteurs.carottes = 20;
  s.campagne.historique.push({ nuit: 1, pct: 40, energie: 128 });
  testGoToChapter(s, 2);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 2, 'aller à un chapitre ne le valide pas tout de suite');
  assertEqual(s.campagne.historique.length, 1, 'l\'historique d\'autonomie est conservé');
});

test('sérialisation JSON Lot 9 : la campagne fait l\'aller-retour', () => {
  const s = atChapter(6);
  s.day = 31;
  winterNights(s, 3, 22);
  testCompleteChapter(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assert(sleepOnce(copy) !== null && sleepOnce(s) !== null);
  assertEqual(JSON.parse(JSON.stringify(copy)), JSON.parse(JSON.stringify(s)), 'la partie continue à l\'identique');
});

/* --- Lot 10 : simulation d'un joueur automatique --- */

// Partie simulée sur `nights` nuits, avec un jeu de DATA légèrement modifié
// si `tweak` est donné (restauré ensuite).
function simRows(strategy, nights, seed = 1) {
  return simulateGame(strategy, nights, seed);
}

test('Lot 10 : DATA.SIMULATION est cohérent (stratégies, jalons, plan)', () => {
  const S = DATA.SIMULATION;
  assertEqual(Object.keys(S.STRATEGIES).sort(), ['applique', 'minimal']);
  assertEqual([S.STRATEGIES.applique.eveilS, S.STRATEGIES.minimal.eveilS], [60, 30]);
  assert(S.STRATEGIES.minimal.eveilS >= DATA.TIME.MIN_AWAKE_S, 'le joueur minimal reste éveillé au moins l\'éveil minimal');
  assertEqual(S.JALONS.map((j) => [j.nuit, j.pct]), [[8, 35], [15, 50], [25, 75], [40, 90], [60, 100]]);
  assertEqual(S.TOLERANCE_NUITS, 10);
  assertEqual(S.NUITS, 80);
  // chaque étape du plan et des priorités se lit sans erreur sur une partie neuve
  const s = createInitialState(1);
  const steps = [...S.PLAN, ...Object.values(S.PRIORITE).flat()];
  for (const step of steps) {
    const info = botStepInfo(s, step, 60);
    assert(info.done || info.locked || (info.cost >= 0 && typeof info.buy === 'function'), `étape mal formée : ${JSON.stringify(step)}`);
  }
});

test('Lot 10 : une partie simulée est reproductible (même graine, même courbe)', () => {
  const a = simRows('applique', 12, 5);
  const b = simRows('applique', 12, 5);
  assertEqual(a, b);
  assertEqual(a.length, 12);
  assertEqual(a.map((r) => r.nuit), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const r of a) {
    assert(r.autonomie >= 0 && r.autonomie <= 100, 'autonomie entre 0 et 100');
    assert(r.santeMoyenne >= 0 && r.santeMoyenne <= DATA.FAMILY.SANTE_MAX);
    assert(r.pieces >= 0 && r.conserves >= 0 && r.soinsPayes >= 0);
  }
});

test('Lot 10 : la simulation ne lit ni l\'horloge ni Math.random', () => {
  const random = Math.random;
  const now = Date.now;
  Math.random = () => { throw new Error('Math.random interdit'); };
  Date.now = () => { throw new Error('Date.now interdit'); };
  try {
    assertEqual(simRows('minimal', 4).length, 4);
  } finally {
    Math.random = random;
    Date.now = now;
  }
});

test('Lot 10 : chaque nuit, la journée du joueur dure son temps d\'éveil', () => {
  for (const id of ['applique', 'minimal']) {
    const s = createInitialState(1);
    const strat = DATA.SIMULATION.STRATEGIES[id];
    // on mesure l'éveil juste avant Dormir : botDay l'a rempli, sleep() le remet à zéro.
    // La mesure est une étape de nuit ajoutée en tête : elle passe avant la remise à zéro.
    const eveil = [];
    NIGHT_STEPS.unshift((state) => { eveil.push(state.awakeMs); });
    try {
      botDay(s, strat, {});
    } finally {
      NIGHT_STEPS.shift();
    }
    assertEqual(eveil[0], strat.eveilS * 1000, `${id} : ${eveil[0]} ms d'éveil au lieu de ${strat.eveilS} s`);
    assertEqual([s.day, s.awakeMs], [2, 0]);
  }
});

test('Lot 10 : simulateFromCopy ne touche pas la partie en cours', () => {
  const s = createInitialState(3);
  s.pieces = 123;
  s.day = 5;
  const before = JSON.stringify(s);
  const rows = simulateFromCopy(s, 'applique', 6);
  assertEqual(JSON.stringify(s), before, 'la partie en cours est identique');
  assertEqual(rows.length, 6);
  assertEqual(rows.map((r) => r.nuit), [5, 6, 7, 8, 9, 10], 'la simulation continue à partir de la nuit en cours');
});

test('Lot 10 : le joueur automatique moud du blé pour la paille de ses moutons et de ses vaches', () => {
  const S = DATA.SIMULATION;
  assertEqual([S.PAILLE_NUITS, S.PAILLE_MAX_NUITS, S.FARINE_MAX], [3, 6, 12]);
  assertEqual(S.PRIORITE[5], [{ type: 'station', id: 'moulin' }, { type: 'paturage' }, { type: 'moutons', n: 3 }], 'le Moulin avant les moutons');
  const s = pature();
  for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
  testFillBatteries(s);
  fillSheep(s, 2);
  fillCows(s, 1);
  setInv(s, { ble: 20, farine: S.STOCK_FARINE, conserve: 200 });
  // 4 pailles par nuit × 3 nuits d'avance = 12 blés à moudre
  botMill(s);
  assertEqual([millPending(s), countItem(s, 'ble')], [12, 8]);
  botMill(s);
  assertEqual(millPending(s), 12, 'il n\'en remet pas tant que le lot couvre le besoin');
  // sans animaux et avec assez de farine : il ne moud rien
  const t = pature();
  openStation(t, 'moulin');
  setInv(t, { ble: 20, farine: S.STOCK_FARINE });
  botMill(t);
  assertEqual(millPending(t), 0);
  // avec trop peu de farine : il en moud, même sans animaux
  setInv(t, { ble: 20 });
  botMill(t);
  assertEqual(millPending(t), S.STOCK_FARINE);
  // le Livre de recette ne lui propose plus la mouture
  assertEqual(botRecipeValue(s, 'farine'), 0);
  // les moutons ne sont plus que tondus
  testWoolReady(s);
  botSheep(s);
  assertEqual([countItem(s, 'laine'), sheepCount(s)], [2, 2]);
});

test('Lot 10 : au chapitre du troupeau, le joueur automatique nourrit ses moutons et finit par tondre 10 laines', () => {
  const s = createInitialState(3);
  simulatePlay(s, 'applique', 22);
  testGoToChapter(s, 5);
  const rows = simulatePlay(s, 'applique', 22);
  assertEqual(rows.length, 22);
  assertEqual(s.stations.moulin.construit, true, 'il a construit le Moulin');
  assert(sheepCount(s) >= 3, `il a acheté ses moutons : ${sheepCount(s)}`);
  assert(s.campagne.compteurs.laines >= 10, `laines tondues : ${s.campagne.compteurs.laines}`);
  assert(chapterReached(s) >= 6, `le chapitre du troupeau est terminé : chapitre ${chapterReached(s)}`);
  assertEqual(rows.every((r) => r.santeMin > 0), true, 'la famille reste en bonne santé');
});

test('Lot 10 : simulationReach date un jalon sur la moyenne mobile', () => {
  const mk = (list) => list.map((a, i) => ({ nuit: i + 1, autonomie: a }));
  const k = DATA.SIMULATION.LISSAGE;
  const rows = mk(Array.from({ length: 30 }, (_, i) => (i < 10 ? 0 : 80)));
  const n = simulationReach(rows, 40);
  assert(n > 10 && n <= 10 + k, `jalon daté à la nuit ${n}`);
  assertEqual(simulationReach(rows, 90), null, 'jamais atteint');
  assertEqual(simulationReach(mk([100, 0, 100]), 100), null, 'une nuit isolée à 100 % ne compte pas');
});

test('Lot 10 : le joueur vend ce qui périt demain et que le repas ne mangera pas, jamais la réserve', () => {
  const s = createInitialState(1);
  s.inventaire = { carotte: [{ qty: 100, nightsLeft: 1, origin: 'produit' }], patate: [{ qty: 10, nightsLeft: 1, origin: 'produit' }] };
  s.famille.reserve = { patate: 6 };
  const mange = planMeal(s).mange;
  const piecesAvant = s.pieces;
  botSell(s);
  const attendu = 100 - (mange.carotte || 0);
  assertEqual(countItem(s, 'carotte'), 100 - attendu, 'seul le surplus de carottes est vendu');
  assert(countItem(s, 'patate') >= 6, 'la réserve de semences reste');
  assert(s.pieces > piecesAvant, 'la vente rapporte des pièces');
});

test('Lot 10 : le joueur n\'achète le Potager niveau 2 qu\'en gardant sa caisse', () => {
  const s = createInitialState(1);
  s.inventaire = {};
  const cout = DATA.POTAGER.COUT[1];
  s.pieces = cout + DATA.SIMULATION.CAISSE - 1;
  botBuy(s, 60);
  assertEqual(s.potager.niveau, 1, 'il lui manque une pièce pour garder la caisse');
  s.pieces = cout + DATA.SIMULATION.CAISSE;
  botBuy(s, 60);
  assertEqual(s.potager.niveau, 2);
  assertEqual(s.pieces, DATA.SIMULATION.CAISSE);
});

test('Lot 10 : le joueur réserve une part de la Zone de culture au plein champ (blé, tournesol)', () => {
  const S = DATA.SIMULATION;
  assertEqual(S.PART_PLEIN_CHAMP, 40);
  // plus d'étape « champ » : la zone grandit par les étapes « potager »
  assertEqual([...S.PLAN, ...Object.values(S.PRIORITE).flat()].some((e) => e.type === 'champ'), false);
  assertEqual(S.PLAN.filter((e) => e.type === 'potager').map((e) => e.niveau), [2, 3, 4, 5]);
  // la part ne vaut qu'une fois les cultures de plein champ débloquées (chapitre 3)
  const cible = (chapitre, niveau) => {
    const s = atChapter(chapitre);
    while (s.potager.niveau < niveau) upgradePotager(Object.assign(s, { pieces: 5000 }));
    return botFieldTarget(s);
  };
  assertEqual([cible(2, 2), cible(3, 1), cible(3, 2), cible(3, 3), cible(3, 4), cible(3, 5)], [0, 2, 4, 7, 9, 12]);
  // chapitre 3, zone de 12 parcelles : 4 parcelles de blé, le reste en légumes
  const s = atChapter(3);
  upgradePotager(Object.assign(s, { pieces: 5000 }));
  setInv(s, { ble: 20, patate: 20, graine_carotte: 20, riz: 20, houblon: 20, graine_tournesol: 20 });
  botFarm(s);
  const cultures = (st) => st.potager.parcelles.map((p) => p.culture);
  assertEqual(cultures(s).filter((c) => c === 'ble').length, 4);
  assertEqual(cultures(s).filter((c) => c === 'ble' || c === null).length, 4, 'toutes les autres parcelles sont plantées');
  assertEqual(cultures(s).some((c) => ['riz', 'houblon', 'tournesol'].includes(c)), false, 'ni riz ni houblon, et pas de tournesol avant la Presse');
  assertEqual(botWheatKept(s), 4, 'il garde de quoi ressemer son blé');
  // chapitre 4 avec la Presse : une parcelle de tournesol prise sur la part de plein champ
  const t = atChapter(4);
  upgradePotager(Object.assign(t, { pieces: 5000 }));
  t.stations.presse.construit = true;
  setInv(t, { ble: 20, patate: 20, graine_tournesol: 20 });
  botFarm(t);
  assertEqual([cultures(t).filter((c) => c === 'tournesol').length, cultures(t).filter((c) => c === 'ble').length], [S.PARCELLES_TOURNESOL, 4 - S.PARCELLES_TOURNESOL]);
  // avant le chapitre 3 : aucune culture de plein champ, même avec du blé en stock
  const u = atChapter(2);
  setInv(u, { ble: 20, patate: 20 });
  botFarm(u);
  assertEqual(cultures(u).every((c) => c !== null && !botIsFieldCrop(c)), true, 'six parcelles de légumes');
});

test('Lot 10 : le joueur ne vend des conserves que pour payer un achat, et pas sous le stock gardé', () => {
  const s = createInitialState(1);
  s.pieces = 0;
  s.inventaire.conserve = [{ qty: DATA.SIMULATION.CONSERVES_GARDEES, nightsLeft: null, origin: 'acheté' }];
  botRaiseFunds(s, 30);
  assertEqual(countItem(s, 'conserve'), DATA.SIMULATION.CONSERVES_GARDEES, 'sous le stock gardé, on ne vend pas');
  s.inventaire.conserve = [{ qty: DATA.SIMULATION.CONSERVES_GARDEES + 100, nightsLeft: null, origin: 'acheté' }];
  botRaiseFunds(s, 30);
  assertEqual(s.pieces, 30, 'juste ce qu\'il faut');
  assertEqual(countItem(s, 'conserve'), DATA.SIMULATION.CONSERVES_GARDEES + 100 - 10);
});

test('Lot 10 : le joueur soigne un malade dès qu\'il en a les moyens', () => {
  const s = createInitialState(1);
  s.famille.membres[0].malade = true;
  s.famille.membres[0].sante = 0;
  s.pieces = 0;
  botHeal(s);
  assertEqual(s.famille.membres[0].malade, true, 'pas de pièces, pas de soin');
  s.pieces = careCost(s);
  botHeal(s);
  assertEqual([s.famille.membres[0].malade, s.famille.soinsPayes], [false, 1]);
});

test('Lot 10 : plante, arrose et récolte : les premières carottes arrivent', () => {
  const s = createInitialState(1);
  const strat = DATA.SIMULATION.STRATEGIES.applique;
  for (let i = 0; i < 6; i++) botDay(s, strat, {});
  assert(s.campagne.compteurs.carottes > 0 || countItem(s, 'patate') > 0 || countItem(s, 'carotte') > 0, 'la ferme a produit');
  assert(s.campagne.compteurs.eauMl > 0, 'la pompe a tourné');
});

test('Lot 10 : dépannage : une unité de nourriture achetée chaque soir fait monter son prix', () => {
  const opts = { depannage: { item: 'carotte', dernier: null } };
  const rows = simulateGame('applique', 5, 1, opts);
  assert(rows.every((r) => r.depannage && typeof r.depannage.prix === 'number'), 'le prix de la prochaine unité est relevé chaque nuit');
  const prix = rows.map((r) => r.depannage.prix);
  assert(prix[4] >= prix[0], 'le prix ne baisse pas quand on achète chaque nuit');
});

/* ---------- Lot 11 : hors-ligne, alertes, bulles d'aide, version ---------- */

test('DATA Lot 11 : hors-ligne plafonné à 8 h, pas de 5 s, sans usure ; trois bulles d\'aide', () => {
  assertEqual(DATA.HORS_LIGNE, { MAX_S: 28800, PAS_S: 5, USURE: false, ECRAN_S: 60 });
  assertEqual(DATA.AIDE.ETAPES, ['eau', 'potager', 'dormir']);
  assert(/^\d+\.\d+\.\d+$/.test(GAME_VERSION), 'version au format x.y.z');
  assertEqual(GAME_VERSION, '1.4.0');
});

test('Lot 11 : hors-ligne plafonné à 8 h', () => {
  const s = farm({ pump: true });
  const avant = s.awakeMs;
  const r = simulateOffline(s, 20 * 3600);
  assertEqual([r.demande, r.simule, r.plafonne], [72000, 28800, true]);
  // Version 1.1.1 : l'horloge, elle, s'arrête à l'éveil minimal (voir plus bas).
  assertEqual([avant, s.awakeMs], [0, awakeRequired(s) * 1000], 'l\'horloge ne dépasse pas l\'heure où l\'on peut dormir');
  const t = farm({ pump: true });
  const r8 = simulateOffline(t, 8 * 3600);
  assertEqual([r8.simule, r8.plafonne], [28800, false], '8 h pile ne sont pas « plafonnées »');
});

test('Lot 11 : une durée nulle, négative ou invalide ne change rien', () => {
  for (const d of [0, -30, NaN, undefined, 'x']) {
    const s = farm({ pump: true });
    const before = JSON.stringify(s);
    const r = simulateOffline(s, d);
    assertEqual([r.demande, r.simule], [0, 0], String(d));
    assertEqual(JSON.stringify(s), before, `état inchangé pour ${String(d)}`);
  }
});

test('Lot 11 : le temps hors-ligne compte comme temps d\'éveil, par pas de 5 s', () => {
  const s = farm();
  assertEqual(canSleep(s), false);
  simulateOffline(s, 7);
  assertEqual(s.awakeMs, 7000, 'un pas de 5 s puis un de 2 s');
  simulateOffline(s, awakeRequired(s));
  assertEqual(canSleep(s), true, 'au retour, on peut dormir tout de suite');
});

test('Lot 11 : aucune nuit ne passe hors-ligne', () => {
  const s = garden();
  const plot = s.potager.parcelles[0];
  plantRipe(s, plot.id, 'carotte');
  plot.stade = 1;
  s.eauMl = ml(10);
  assert(water(s, plot.id).ok, 'arroser');
  testAddHens(s);
  testAddSheep(s, 2);
  const avant = {
    day: s.day, stade: plot.stade, arrose: plot.arrose,
    sante: s.famille.membres.map((m) => m.sante),
    inventaire: JSON.stringify(s.inventaire),
    moutons: JSON.stringify(s.paturage.moutons),
    historique: s.campagne.historique.length,
  };
  const r = simulateOffline(s, 8 * 3600);
  assertEqual(r.nuit, avant.day);
  assertEqual(s.day, avant.day, 'le jour ne change pas');
  assertEqual([plot.stade, plot.arrose], [avant.stade, avant.arrose], 'la plante ne pousse pas, elle reste arrosée pour la nuit');
  assertEqual(s.famille.membres.map((m) => m.sante), avant.sante, 'personne ne mange');
  assertEqual(JSON.stringify(s.inventaire), avant.inventaire, 'rien ne périme, rien n\'est pondu');
  assertEqual(JSON.stringify(s.paturage.moutons), avant.moutons, 'les moutons ne grossissent pas');
  assertEqual(s.campagne.historique.length, avant.historique, 'aucune nuit enregistrée');
});

test('Lot 11 : préparations terminées pendant l\'absence', () => {
  const s = atelier();
  s.eauMl = ml(10);
  setInv(s, { farine: 2, graine_tournesol: 3 });
  storeWheat(s, 1);
  for (const id of ['pain', 'huile']) assert(startRecipe(s, id).ok, `lancer ${id}`);
  assert(startMilling(s, 1).ok, 'lancer la mouture');
  const r = simulateOffline(s, 10 * 60);
  const tri = (o) => Object.keys(o).sort().map((k) => [k, o[k]]);
  assertEqual(tri(r.terminees), [['farine', 1], ['huile', 1], ['paille', 1], ['pain', 1]], 'la paille du blé moulu est comptée aussi');
  assertEqual(r.enCours, []);
  for (const id of ['four', 'moulin', 'presse']) assertEqual(s.stations[id].tache, null, `${id} libre`);
  assertEqual([countItem(s, 'pain'), countItem(s, 'farine'), countItem(s, 'huile'), countItem(s, 'paille')], [1, 1, 1, 1]);
  assertEqual(s.campagne.compteurs.pains, 1, 'le pain compte pour le chapitre');
});

test('Lot 11 : une préparation plus longue que l\'absence reste en cours', () => {
  const s = atelier({ stations: ['four', 'cuisine', 'moulin'] });
  storeWheat(s, 1);
  assert(startMilling(s, 1).ok);
  const r = simulateOffline(s, 3);
  assertEqual(r.terminees, {});
  assertEqual(r.enCours.map((e) => [e.station, e.recette]), [['moulin', 'farine']]);
  assert(near(r.enCours[0].reste, 2, 1e-6), `reste ${r.enCours[0].reste}`);
});

test('Lot 11 : le Moulin s\'arrête hors-ligne quand les batteries sont vides', () => {
  const s = atelier({ stations: ['four', 'cuisine', 'moulin'] });
  testEmptyBatteries(s);
  storeWheat(s, 1);
  assert(startMilling(s, 1).ok);
  const r = simulateOffline(s, 3600);
  assertEqual(r.terminees, {}, 'sans énergie, pas de farine');
  assertEqual(s.stations.moulin.tache.recette, 'farine');
});

test('Lot 11 : frigo en panne si la batterie s\'est vidée pendant l\'absence', () => {
  const s = coldRoom(); // batterie pleine (5 000 Wh), panneau coupé
  addItem(s, 'carotte', 100);
  assert(moveToFridge(s, 'carotte', 100).ok);
  const avant = fridgeLots(s, 'carotte')[0].nightsLeft;
  // 5 + 100 × 0,05 = 10 Wh/s : 5 000 Wh tiennent 500 s sur 3 600.
  const r = simulateOffline(s, 3600);
  assertEqual(s.frigo.alimente, false, 'plus de courant au retour');
  assert(near(r.frigo.horsTensionS, 3100, 5), `hors tension ${r.frigo.horsTensionS} s`);
  assertEqual(r.frigo.alimente, false);
  assertEqual(r.energieFin, kwh(0), 'batteries vides');
  testFillBatteries(s); // le bloc de la nuit est couvert : seule l'absence compte
  sleepOnce(s);
  assertEqual(s.report.frigo.panne, false, 'pas de panne pendant la nuit elle-même');
  assertEqual(s.report.frigo.vieillis, true, 'froid manquant plus de la moitié de l\'éveil');
  assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, avant - DATA.FRIGO.PERTE_NUITS);
});

test('Lot 11 : frigo alimenté pendant toute l\'absence : rien ne vieillit', () => {
  const s = coldRoom();
  s.panneaux[0].allume = true; // 30 Wh/s > 10 Wh/s consommés
  addItem(s, 'carotte', 100);
  assert(moveToFridge(s, 'carotte', 100).ok);
  const avant = fridgeLots(s, 'carotte')[0].nightsLeft;
  const r = simulateOffline(s, 8 * 3600);
  assertEqual([r.frigo.horsTensionS, r.frigo.alimente], [0, true]);
  sleepOnce(s);
  assertEqual(s.report.frigo.vieillis, false);
  assertEqual(fridgeLots(s, 'carotte')[0].nightsLeft, avant);
});

test('Lot 11 : pas d\'usure hors-ligne, même après 8 h de marche', () => {
  const s = farm({ pump: true });
  s.panneaux[0].usure = 12;
  const r = simulateOffline(s, 8 * 3600);
  assert(r.energieProduite > 0 && r.eauPompee > 0, 'le panneau et la pompe ont tourné');
  assertEqual(allDevices(s).map((d) => d.usure), [12, 0, 0], 'usure inchangée');
  assertEqual(allDevices(s).some(isBroken), false);
});

test('Lot 11 : hors-ligne, mêmes flux que le jeu, plafonnés par les capacités', () => {
  const live = farm({ pump: true });
  const away = farm({ pump: true });
  const usure = DATA.WEAR.HEURES_PAR_POINT;
  DATA.WEAR.HEURES_PAR_POINT = 1e9; // en jeu, l'usure baisse un peu le débit : on la retire pour comparer les flux
  try {
    runFor(live, 30);
  } finally {
    DATA.WEAR.HEURES_PAR_POINT = usure;
  }
  const r = simulateOffline(away, 30);
  assertEqual(live.eauMl, away.eauMl, `eau : ${live.eauMl} mL en jeu, ${away.eauMl} hors-ligne`);
  assertEqual(energyStats(live).charge, energyStats(away).charge, 'même charge');
  assertEqual(r.eauPompee, away.eauMl, 'bilan d\'eau');
  const full = farm({ pump: true });
  const r8 = simulateOffline(full, 8 * 3600);
  assertEqual(full.eauMl, tankCapacity(full), 'réservoir plein, pas au-delà');
  assertEqual(r8.energieFin, batteryCapacity(full.batteries[0]), 'batterie pleine, pas au-delà');
  assert(r8.energiePerdue > 0, 'le surplus est perdu');
  assertEqual(r8.energieProduite, r8.energiePerdue + (r8.energieFin - r8.energieDebut) + r8.eauPompee * DATA.PUMP.WH_PAR_L, 'bilan énergétique exact, en entiers');
});

test('Lot 11 : la progression hors-ligne compte pour les objectifs du chapitre', () => {
  const s = createInitialState(1);
  assertEqual(s.campagne.chapitre, 1);
  s.pompe.niveau = 2; // réservoir de 80 L : on peut pomper les 50 L de l'objectif
  simulateOffline(s, 2 * 3600); // 50 L pompés et 3 000 Wh stockés
  assert(s.campagne.compteurs.eauMl >= ml(50), 'litres comptés');
  assert(s.campagne.compteurs.mwhMax >= kwh(3), 'record d\'énergie');
  assertEqual(s.campagne.chapitre, 2);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [1], 'l\'écran de fin sera montré au retour');
});

test('Lot 11 : deux absences successives s\'additionnent dans un seul bilan', () => {
  const s = atelier({ stations: ['four', 'cuisine', 'moulin'] });
  s.panneaux[0].allume = true;
  storeWheat(s, 2);
  assert(startMilling(s, 1).ok);
  const a = simulateOffline(s, 60);
  assert(startMilling(s, 1).ok);
  const b = simulateOffline(s, 9 * 3600);
  const m = mergeOfflineReports(a, b);
  assertEqual([m.demande, m.simule, m.plafonne], [60 + 9 * 3600, 60 + 28800, true]);
  assertEqual(m.terminees, { farine: 2, paille: 2 });
  assertEqual([m.energieDebut, m.energieFin], [a.energieDebut, b.energieFin]);
  assert(near(m.energieProduite, a.energieProduite + b.energieProduite));
  assertEqual(mergeOfflineReports(null, b), b);
});

test('Lot 11 : formatDuration', () => {
  assertEqual(
    [0, 45, 59.9, 60, 12 * 60 + 30, 3600, 2 * 3600 + 5 * 60, 8 * 3600].map(formatDuration),
    ['0 s', '45 s', '59 s', '1 min', '12 min', '1 h', '2 h 05 min', '8 h']
  );
});

test('Lot 11 : alertes : panne, entretien, batteries vides, frigo coupé', () => {
  const s = coldRoom();
  let snap = alertSnapshot(s);
  assertEqual(alertEvents(snap, alertSnapshot(s)), [], 'rien de neuf');
  testSetWear(s, 'panneau-1', 75);
  let now = alertSnapshot(s);
  assertEqual(alertEvents(snap, now), [{ type: 'entretien', id: 'panneau-1' }]);
  snap = now;
  testSetWear(s, 'panneau-1', DATA.WEAR.BREAKDOWN);
  now = alertSnapshot(s);
  assertEqual(alertEvents(snap, now), [{ type: 'panne', id: 'panneau-1' }]);
  snap = now;
  testEmptyBatteries(s);
  tick(s, 0.2); // le panneau est en panne : plus rien pour le frigo
  now = alertSnapshot(s);
  assertEqual(alertEvents(snap, now), [{ type: 'batteriesVides' }, { type: 'frigoCoupe' }]);
  assertEqual(alertEvents(now, alertSnapshot(s)), [], 'une alerte n\'est annoncée qu\'une fois');
  toggleDevice(s, 'frigo');
  assertEqual(alertSnapshot(s).frigoCoupe, false, 'un frigo éteint par le joueur n\'est pas une alerte');
});

/* ---------- Centre de notifications ---------- */

// Batteries chargées : sans cela, « Batteries vides » (vraie alerte) s'ajoute à chaque scénario.
function charged(s) {
  testFillBatteries(s);
  return s;
}

function notifTypes(s) {
  return getNotifications(s).map((n) => n.type);
}

test('notifications : rien à signaler au départ, pastille à 0', () => {
  const s = charged(garden());
  assertEqual(getNotifications(s), []);
  assertEqual(notificationCount(s), 0);
});

test('notifications : parcelle non arrosée puis arrosée, récolte prête', () => {
  const s = charged(garden());
  testAddSeeds(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  assert(plant(s, 'potager-2', 'carotte').ok);
  let n = getNotifications(s);
  assertEqual(n.map((x) => [x.type, x.nombre]), [['arrosage', 2]]);
  assertEqual(n[0].texte, '2 parcelles non arrosées');
  assert(water(s, 'potager-1').ok);
  n = getNotifications(s);
  assertEqual([n[0].nombre, n[0].texte], [1, '1 parcelle non arrosée']);
  assert(water(s, 'potager-2').ok);
  assertEqual(notifTypes(s), [], 'tout est arrosé');
  testRipenAll(s);
  n = getNotifications(s);
  assertEqual(n.map((x) => [x.type, x.nombre]), [['recolte', 2]], 'mûres : plus à arroser, à récolter');
  assert(harvest(s, 'potager-1').ok);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre]), [['recolte', 1]]);
});

test('notifications : mouton à tondre', () => {
  const s = charged(pature());
  fillSheep(s, 2);
  setStraw(s, 2);
  assertEqual(notifTypes(s), [], 'laine pas encore prête');
  testWoolReady(s);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre, x.texte]), [['tonte', 2, '2 moutons à tondre']]);
  assert(shear(s, 'mouton-1').ok);
  assertEqual(getNotifications(s).map((x) => [x.type, x.texte]), [['tonte', '1 mouton à tondre']]);
  assert(shear(s, 'mouton-2').ok);
  assertEqual(notifTypes(s), []);
});

test('notifications : il manque de la paille pour les moutons et les vaches', () => {
  const s = charged(pature());
  assertEqual(notifTypes(s), [], 'sans animaux, pas besoin de paille');
  fillSheep(s, 1);
  const icone = DATA.items.paille.icone;
  assertEqual(getNotifications(s), [{ id: 'paille', type: 'paille', texte: 'Il manque de la paille : 1 de plus pour nourrir les animaux cette nuit', priorite: 2, icone, nombre: 1 }]);
  fillCows(s, 2);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre, x.texte]), [['paille', 5, 'Il manque de la paille : 5 de plus pour nourrir les animaux cette nuit']]);
  setStraw(s, 3);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre]), [['paille', 2]]);
  assertEqual(notificationCount(s), 1);
  setStraw(s, 5);
  assertEqual(notifTypes(s), [], 'assez de paille : l\'alerte disparaît');
  sleepOnce(s);
  assertEqual(notifTypes(s), ['paille'], 'au réveil, la paille de la nuit est mangée : il en faut de nouveau');
  // l'alerte passe après les urgences (priorité 1) et avec les tâches du jour (priorité 2)
  testSetWear(s, 'pompe', 100);
  assertEqual(getNotifications(s).map((x) => [x.type, x.priorite]), [['panne', 1], ['paille', 2]]);
});

test('alertes : la paille qui vient à manquer est annoncée une fois', () => {
  const s = charged(pature());
  let snap = alertSnapshot(s);
  assertEqual(snap.pailleManque, false);
  fillSheep(s, 1);
  let now = alertSnapshot(s);
  assertEqual([now.pailleManque, alertEvents(snap, now)], [true, [{ type: 'pailleManque' }]]);
  assertEqual(alertEvents(now, alertSnapshot(s)), [], 'une alerte n\'est annoncée qu\'une fois');
  setStraw(s, 1);
  snap = alertSnapshot(s);
  assertEqual(snap.pailleManque, false);
  sleepOnce(s);
  assertEqual(alertEvents(snap, alertSnapshot(s)), [{ type: 'pailleManque' }], 'après la nuit, le stock est vide');
});

test('notifications : poules à nourrir', () => {
  const s = charged(garden());
  testAddHens(s, 4);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre]), [['poules', 4]]);
  s.poulailler.nourries = 4;
  assertEqual(notifTypes(s), []);
});

test('notifications : panne, entretien et priorités (urgent d\'abord)', () => {
  const s = coldRoom();
  testAddSeeds(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  testSetWear(s, 'panneau-1', DATA.WEAR.BREAKDOWN);
  const n = getNotifications(s);
  assertEqual(n.map((x) => x.type), ['panne', 'arrosage']);
  assertEqual(n.map((x) => x.priorite), [1, 2]);
  testSetWear(s, 'panneau-1', DATA.WEAR.SERVICE_THRESHOLD);
  assertEqual(notifTypes(s), ['arrosage', 'entretien']);
  testSetWear(s, 'panneau-1', 0);
  assertEqual(notifTypes(s), ['arrosage'], 'l\'alerte disparaît quand la cause est réglée');
});

test('notifications : batteries vides et frigo sans courant', () => {
  const s = coldRoom();
  testEmptyBatteries(s);
  tick(s, 0.2);
  assertEqual(notifTypes(s), ['batteriesVides', 'frigoCoupe']);
});

test('notifications : aliments qui périssent cette nuit', () => {
  const s = charged(garden());
  setInv(s, { carotte: 3, tomate: 2, conserve: 5 });
  assertEqual(notifTypes(s), []);
  for (let i = 0; i < 4; i++) spoil(s); // tomate : plus qu'une nuit
  const n = getNotifications(s);
  assertEqual(n.map((x) => [x.type, x.nombre, x.priorite]), [['peremption', 2, 1]]);
});

test('notifications : les tâches automatisées par la technologie ne sont pas signalées', () => {
  const s = charged(pature());
  testAddSeeds(s);
  testAddHens(s, 2);
  fillSheep(s, 1);
  setStraw(s, 1);
  testWoolReady(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  assertEqual(notifTypes(s).sort(), ['arrosage', 'poules', 'tonte']);
  testUnlockAllTechs(s);
  assertEqual(notifTypes(s), [], 'arrosage, nourrissage et tonte sont automatiques');
  // la paille, elle, n'est automatisée par aucune technologie : il faut moudre du blé
  setStraw(s, 0);
  assertEqual(notifTypes(s), ['paille']);
});

test('notifications : entiers, identifiants uniques, texte et icône présents', () => {
  const s = charged(pature());
  testAddSeeds(s);
  testAddHens(s, 3);
  fillSheep(s, 2);
  testWoolReady(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  testSetWear(s, 'panneau-1', DATA.WEAR.BREAKDOWN);
  const n = getNotifications(s);
  assertEqual(new Set(n.map((x) => x.id)).size, n.length, 'pas de doublon');
  for (const x of n) assert(Number.isInteger(x.nombre) && x.nombre > 0 && x.texte && x.icone, `entrée valide : ${x.id}`);
  assertEqual(n.map((x) => x.priorite), [...n.map((x) => x.priorite)].sort((a, b) => a - b), 'tri par priorité');
  assertEqual(notificationCount(s), n.length);
});

test('Lot 11 : bulles d\'aide : eau, potager, dormir, puis terminé', () => {
  const s = createInitialState(1);
  assertEqual(s.aide, { etape: 0, fini: false });
  assertEqual(tutorialStep(s), 'eau');
  assertEqual(advanceTutorial(s).etape, 'potager');
  assertEqual(advanceTutorial(s).etape, 'dormir');
  assertEqual(advanceTutorial(s).etape, null);
  assertEqual([s.aide.fini, tutorialStep(s)], [true, null]);
  assertEqual(advanceTutorial(s).ok, false);
});

test('Lot 11 : la bulle « dormir » se ferme à la première nuit ; « Passer » ferme tout', () => {
  const s = createInitialState(1);
  sleepOnce(s);
  assertEqual(tutorialStep(s), 'eau', 'dormir avant la dernière bulle ne saute rien');
  advanceTutorial(s);
  advanceTutorial(s);
  assertEqual(tutorialStep(s), 'dormir');
  sleepOnce(s);
  assertEqual(s.aide.fini, true);
  const t = createInitialState(1);
  assertEqual(skipTutorial(t).ok, true);
  assertEqual(tutorialStep(t), null);
  assertEqual(skipTutorial(t).ok, false);
});

test('Lot 11 : nouvelle partie : les bulles déjà vues ne reviennent pas', () => {
  const old = createInitialState(1);
  old.day = 12;
  assertEqual(newGameFrom(old, 5).aide.fini, false, 'aide pas encore terminée : elle reprend');
  skipTutorial(old);
  const s = newGameFrom(old, 5);
  assertEqual([s.day, s.rngSeed, s.aide.fini], [1, 5, true]);
  assertEqual(newGameFrom(null, 2).aide, { etape: 0, fini: false });
});

test('migration v10 → v11 : bulles d\'aide seulement pour une partie pas encore commencée', () => {
  const v10 = (day) => {
    const s = createInitialState(1);
    delete s.aide;
    s.version = 10;
    s.day = day;
    return s;
  };
  const neuve = migrate({ v: 10, t: 0, s: v10(1) });
  assertEqual([neuve.version, neuve.aide], [STATE_VERSION, { etape: 0, fini: false }]);
  const avancee = migrate({ v: 10, t: 0, s: v10(9) });
  assertEqual(avancee.aide.fini, true);
  assertEqual(avancee.day, 9);
  assertEqual(JSON.parse(JSON.stringify(avancee)), avancee);
  assertEqual(migrate({ v: 0, t: 0, s: { day: 3, pieces: 10, stats: {} } }).aide.fini, true, 'depuis une très vieille sauvegarde');
});

// Résumé de réveil allégé (v0.18.0) : récolte de la nuit, tri, limite, indicateurs entiers.
const fakeReport = (over = {}) => ({ oeufs: 0, lait: 0, fruits: {}, auto: { recoltes: {} }, autonomie: 100, santeApres: 100, ...over });

test('Résumé de réveil : rien récolté → liste vide', () => {
  assertEqual(nightHarvest(fakeReport()), {});
  assertEqual(wakeHarvestList(fakeReport()), { affiches: [], reste: [] });
});

test('Résumé de réveil : un seul produit', () => {
  const r = fakeReport({ oeufs: 24 });
  assertEqual(nightHarvest(r), { oeuf: 24 });
  assertEqual(wakeHarvestList(r), { affiches: [{ item: 'oeuf', qte: 24 }], reste: [] });
});

test('Résumé de réveil : regroupe œufs, lait, fruits et récoltes automatiques par produit, quantité décroissante', () => {
  const r = fakeReport({ oeufs: 24, lait: 2, fruits: { pomme: 3 }, auto: { recoltes: { carotte: 12, pomme: 4 } } });
  assertEqual(nightHarvest(r), { oeuf: 24, lait: 2, pomme: 7, carotte: 12 });
  assertEqual(wakeHarvestList(r).affiches.map((x) => [x.item, x.qte]), [['oeuf', 24], ['carotte', 12], ['pomme', 7], ['lait', 2]]);
});

test('Résumé de réveil : limite de 5 produits, le reste va dans « Voir plus » ; égalité départagée par le nom', () => {
  assertEqual(DATA.REVEIL.RECOLTE_MAX, 5);
  const r = fakeReport({ oeufs: 9, lait: 9, auto: { recoltes: { carotte: 9, oignon: 5, ble: 4, patate: 3, epinard: 1 } } });
  const { affiches, reste } = wakeHarvestList(r);
  assertEqual(affiches.length, 5);
  assertEqual(reste.length, 2);
  // 9, 9, 9 : ordre alphabétique des noms (Carotte, Lait, Œuf), puis Oignon 5, Blé 4.
  assertEqual(affiches.map((x) => x.item), ['carotte', 'lait', 'oeuf', 'oignon', 'ble']);
  assertEqual(reste.map((x) => x.item), ['patate', 'epinard']);
  assertEqual(wakeHarvestList(r, 3).affiches.length, 3, 'la limite est un paramètre');
});

test('Résumé de réveil : quantités négatives, nulles ou produits inconnus ignorés', () => {
  assertEqual(nightHarvest(fakeReport({ oeufs: -2, lait: 0, fruits: { inconnu: 5, pomme: 0 } })), {});
});

test('Résumé de réveil : autonomie et santé en entiers (arrondi inférieur)', () => {
  const w = wakeSummary(fakeReport({ autonomie: 99.9, santeApres: 87.6 }));
  assertEqual([w.autonomie, w.sante], [99, 87]);
  const cent = wakeSummary(fakeReport({ autonomie: 100, santeApres: 100 }));
  assertEqual([cent.autonomie, cent.sante], [100, 100]);
  assertEqual(wakeSummary(fakeReport({ autonomie: NaN, santeApres: undefined })).autonomie, 0);
});

test('Résumé de réveil : avec une vraie nuit, les œufs pondus sont dans la récolte', () => {
  const s = ranch();
  setInv(s, { ble: 10, conserve: 200 });
  testAddHens(s, 4);
  feedAllHens(s);
  const report = sleepOnce(s);
  const w = wakeSummary(report);
  assertEqual(w.recolte.affiches, [{ item: 'oeuf', qte: report.oeufs }]);
  assert(report.oeufs > 0, 'la ferme a pondu');
  assertEqual([Number.isInteger(w.autonomie), Number.isInteger(w.sante)], [true, true]);
});

/* ---------- versions 1.1.1 et 1.1.3 : repas de 19 h, nuit de 22 h, achats par quantité ---------- */

test('version 1.1.1 : version 17, la migration v16 → v17 ajoute le repas du jour (pas encore pris)', () => {
  assertEqual(typeof MIGRATIONS[16], 'function');
  assertEqual(createInitialState(1).repas, null);
  const v16 = JSON.parse(JSON.stringify(createInitialState(4)));
  delete v16.repas;
  v16.version = 16;
  v16.pieces = 321;
  const m = migrate({ v: 16, t: 0, s: v16 });
  assertEqual([m.version, m.repas, m.pieces], [STATE_VERSION, null, 321]);
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
});

test('version 1.1.3 : la journée va de 6 h à 22 h, 18 s par heure (288 s)', () => {
  assertEqual([DATA.TIME.DAY_START_HOUR, DATA.TIME.MEAL_HOUR, DATA.TIME.NIGHT_HOUR, DATA.TIME.CLOCK_SECONDS_PER_HOUR], [6, 19, 22, 18]);
  assertEqual([awakeMsAtHour(6), awakeMsAtHour(7), awakeMsAtHour(19), awakeMsAtHour(22)], [0, 18000, 234000, 288000]);
  // le repas et le coucher restent dans la journée, et l'on peut dormir bien avant 22 h
  assert(awakeMsAtHour(DATA.TIME.MEAL_HOUR) < awakeMsAtHour(DATA.TIME.NIGHT_HOUR), 'le repas précède le coucher');
  assert(DATA.TIME.MIN_AWAKE_S * 1000 < awakeMsAtHour(DATA.TIME.MEAL_HOUR), 'on peut dormir avant le repas');
});

test('version 1.1.1 : le repas se prend à 19 h (234 s d\'éveil), une seule fois par jour', () => {
  const s = garden();
  setInv(s, { conserve: 200 });
  s.awakeMs = awakeMsAtHour(19) - 100;
  assertEqual([mealDue(s), hourOfDay(s)], [false, 18]);
  s.awakeMs = awakeMsAtHour(19);
  assertEqual([mealDue(s), hourOfDay(s)], [true, 19]);
  const besoin = familyNeed(s);
  const avant = countItem(s, 'conserve');
  const r = takeMeal(s);
  assertEqual([r.ok, r.repas.heure, r.repas.besoin, r.repas.couverture], [true, 19, besoin, 100]);
  assert(countItem(s, 'conserve') < avant, 'les conserves sont mangées à 19 h');
  assertEqual([mealDue(s), takeMeal(s).ok], [false, false], 'pas de deuxième repas');
  assertEqual(JSON.parse(JSON.stringify(s)).repas, s.repas, 'le repas pris se sauvegarde');
});

test('version 1.1.1 : la nuit reprend le repas de 19 h sans faire manger une deuxième fois', () => {
  const a = garden();
  const b = garden();
  for (const s of [a, b]) { setInv(s, { conserve: 200 }); setHealth(s, 50); }
  // a : repas à 19 h puis coucher ; b : coucher avant 19 h (le repas est pris au coucher)
  a.awakeMs = awakeMsAtHour(19);
  takeMeal(a);
  const apresRepas = countItem(a, 'conserve');
  const ra = sleep(a);
  b.awakeMs = 30000;
  const rb = sleep(b);
  assertEqual(countItem(a, 'conserve'), apresRepas, 'la nuit ne remange pas');
  assertEqual(countItem(a, 'conserve'), countItem(b, 'conserve'), 'même repas dans les deux cas');
  assertEqual([ra.energieMangee, ra.couverture, ra.santeAvant, ra.santeApres, ra.autonomie], [rb.energieMangee, rb.couverture, rb.santeAvant, rb.santeApres, rb.autonomie]);
  assertEqual([a.repas, b.repas, a.awakeMs, mealDue(a)], [null, null, 0, false], 'au réveil, le repas du jour est à prendre');
});

test('version 1.1.1 : un soin payé entre le repas et la nuit figure dans la santé du réveil', () => {
  const s = garden();
  setInv(s, {});
  setHealth(s, 1);
  s.pieces = 5000;
  s.awakeMs = awakeMsAtHour(19);
  const r = takeMeal(s).repas;
  assert(r.nouveauxMalades.length > 0, 'sans rien à manger, la famille tombe malade au repas');
  for (const m of s.famille.membres) if (m.malade) assert(heal(s, m.id).ok, 'soin');
  const rep = sleep(s);
  assertEqual(rep.santeApres, rawAverageHealth(s));
  assert(rep.santeApres > r.santeApres, 'la santé du réveil tient compte des soins');
});

test('version 1.1.3 : 22 h (288 s d\'éveil) rend la nuit due ; l\'aperçu d\'autonomie suit le repas pris', () => {
  const s = garden();
  setInv(s, { conserve: 200 });
  s.awakeMs = 287900;
  assertEqual([bedtimeDue(s), hourOfDay(s)], [false, 21]);
  s.awakeMs = 288000;
  assertEqual([bedtimeDue(s), hourOfDay(s), canSleep(s)], [true, 22, true]);
  takeMeal(s);
  assertEqual(plannedAutonomy(s), s.repas.autonomie);
  const rep = sleep(s);
  assertEqual([s.day, s.awakeMs, bedtimeDue(s), rep.nuit], [2, 0, false, 2]);
});

test('version 1.1.1 : horloge arrêtée (résumé du réveil ouvert), les flux tournent mais l\'heure n\'avance pas', () => {
  const s = farm({ pump: true });
  const eau = s.eauMl;
  tick(s, 5, true);
  assertEqual(s.awakeMs, 0);
  assert(s.eauMl !== eau || s.jour.produite > 0, 'la ferme continue de produire');
  tick(s, 5);
  assertEqual(s.awakeMs, 5000);
});

test('version 1.1.1 : hors-ligne, l\'horloge s\'arrête à l\'éveil minimal (ni repas ni nuit pendant l\'absence)', () => {
  const s = farm({ pump: true });
  simulateOffline(s, 3600);
  assertEqual([s.awakeMs, canSleep(s), mealDue(s), bedtimeDue(s), s.repas, s.day], [30000, true, false, false, null, 1]);
  // parti à 20 h, après le repas : l'horloge ne recule pas et n'avance pas
  const t = farm({ pump: true });
  setInv(t, { conserve: 200 });
  t.awakeMs = awakeMsAtHour(20);
  takeMeal(t);
  simulateOffline(t, 3600);
  assertEqual([t.awakeMs, hourOfDay(t), bedtimeDue(t), t.day], [252000, 20, false, 1]);
});

test('version 1.1.1 : devis d\'achat (buyQuote) = ce que buyItem achète, prix montant compris', () => {
  const s = garden();
  s.pieces = 1000;
  const q = buyQuote(s, 'ble', 5);
  const copie = JSON.parse(JSON.stringify(s));
  const r = buyItem(copie, 'ble', 5);
  assertEqual([q.quantite, q.cout], [r.bought, r.cost]);
  assertEqual([s.pieces, countItem(s, 'ble')], [1000, 0], 'le devis ne modifie rien');
  assert(q.cout > 5 * buyPrice(s, 'ble'), 'le prix monte à chaque unité');
  // pièces insuffisantes : le devis s'arrête à ce qu'on peut payer
  s.pieces = buyPrice(s, 'ble') * 2;
  const court = buyQuote(s, 'ble', 50);
  const achat = buyItem(JSON.parse(JSON.stringify(s)), 'ble', 50);
  assertEqual([court.quantite, court.cout], [achat.bought, achat.cost]);
  assert(court.quantite >= 1 && court.quantite < 50, `quantité plafonnée : ${court.quantite}`);
  assertEqual([buyQuote(s, 'conserve', 3), buyQuote(s, 'inconnu', 3), buyQuote(s, 'ble', 0)], [{ quantite: 0, cout: 0 }, { quantite: 0, cout: 0 }, { quantite: 0, cout: 0 }]);
});

test('version 1.1.1 : animaux achetés par quantité, dans la limite des places et des pièces', () => {
  const s = ranch();
  s.pieces = 5000;
  assertEqual([animalRoom(s, 'poule'), animalBuyMax(s, 'poule')], [4, 4]);
  const r = buyAnimals(s, 'poule', 3);
  assertEqual([r.ok, r.bought, r.cost, s.poulailler.poules], [true, 3, 45, 3]);
  const plein = buyAnimals(s, 'poule', 5);
  assertEqual([plein.ok, plein.bought, s.poulailler.poules, animalBuyMax(s, 'poule')], [true, 1, 4, 0], 'on s\'arrête quand le Poulailler est plein');
  assertEqual(buyAnimals(s, 'poule', 1).ok, false);
  s.pieces = 20;
  assertEqual([animalBuyMax(s, 'mouton'), animalRoom(s, 'mouton')], [0, 0], 'pas d\'Étable : pas de mouton');
  s.pieces = 5000;
  assert(buildPaturage(s).ok, 'préparer l\'Étable');
  s.pieces = 130;
  assertEqual(animalBuyMax(s, 'mouton'), 2, '130 pièces = 2 moutons à 60');
  const m = buyAnimals(s, 'mouton', 9);
  assertEqual([m.bought, m.cost, sheepCount(s), s.pieces], [2, 120, 2, 10]);
  assertEqual([animalBuyMax(s, 'chat'), buyAnimals(s, 'chat', 2).ok], [0, false]);
});

test('version 1.1.1 : sans mouton ni vache, jamais d\'alerte de paille', () => {
  const s = ranch();
  s.pieces = 5000;
  assert(buildPaturage(s).ok, 'préparer l\'Étable');
  setStraw(s, 0);
  assertEqual([strawNeed(s), strawMissing(s), alertSnapshot(s).pailleManque], [0, 0, false]);
  assertEqual(getNotifications(s).filter((n) => n.type === 'paille'), []);
  sleepOnce(s);
  assertEqual([s.report.pailleBesoin, s.report.etable.manque, alertSnapshot(s).pailleManque], [0, 0, false]);
  testAddHens(s, 4);
  assertEqual(getNotifications(s).filter((n) => n.type === 'paille'), [], 'les poules ne mangent pas de paille');
});

/* ---------- version 1.2 : composition de la famille, animaux de compagnie ---------- */

test('version 1.2 : format 18, la migration ajoute les animaux de compagnie et les compteurs sans toucher aux membres', () => {
  assertEqual(typeof MIGRATIONS[17], 'function');
  assertEqual(DATA.FAMILY.COMPOSITION, { MEMBRES_MIN: 1, MEMBRES_MAX: 6, ADULTES_MIN: 1 });
  assertEqual([DATA.FAMILY.COMPAGNIE.MAX, Object.keys(DATA.FAMILY.COMPAGNIE.ESPECES)], [3, ['chien', 'chat']]);
  const neuf = createInitialState(1);
  assertEqual([neuf.famille.animaux, neuf.famille.numeros, neuf.famille.membres.length], [[], { adulte: 2, enfant: 2, compagnon: 0 }, 4]);
  const v17 = JSON.parse(JSON.stringify(createInitialState(7)));
  v17.version = 17;
  delete v17.famille.animaux;
  delete v17.famille.numeros;
  v17.famille.membres[0].prenom = 'Léa';
  v17.famille.membres[2].sante = 40;
  const m = migrate({ v: 17, t: 0, s: v17 });
  assertEqual([m.version, m.famille.animaux, m.famille.numeros], [STATE_VERSION, [], { adulte: 2, enfant: 2, compagnon: 0 }]);
  assertEqual(m.famille.membres, v17.famille.membres, 'les membres ne changent pas');
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
  // une sauvegarde abîmée ne fait pas planter la migration
  for (const bad of [{ version: 17 }, { version: 17, famille: null }, { version: 17, famille: 7 }, { version: 17, famille: { membres: 'x' } }]) {
    assertEqual(migrate(bad).version, STATE_VERSION);
  }
});

test('version 1.2 : ajouter des membres jusqu\'à 6, le besoin journalier suit', () => {
  const s = garden();
  assertEqual([familyNeed(s), memberRoom(s), adultCount(s), childCount(s)], [150, 2, 2, 2]);
  const a = addMember(s, false);
  assertEqual([a.ok, a.id, a.besoin, familyNeed(s)], [true, 'adulte-3', 200, 200]);
  const e = addMember(s, true);
  assertEqual([e.ok, e.id, e.besoin, memberRoom(s)], [true, 'enfant-3', 225, 0]);
  const m = findMember(s, 'adulte-3');
  assertEqual([m.nom, m.prenom, m.enfant, m.malade, m.sante, m.teint, DATA.FAMILY.PROFIL.GENRES.includes(m.genre)], ['Adulte 3', 'Adulte 3', false, false, 100, 0, true]);
  assertEqual(findMember(s, 'enfant-3').enfant, true);
  const plein = addMember(s, true);
  assertEqual([plein.ok, s.famille.membres.length], [false, 6], 'pas de septième membre');
  // le repas se calcule sur le nouveau besoin
  setInv(s, { conserve: 200 });
  assertEqual(planMeal(s).besoin, 225);
  const rep = sleepOnce(s);
  assertEqual([rep.besoin, rep.couverture], [225, 100]);
  assertEqual(setMemberProfile(s, 'adulte-3', { prenom: 'Mamie', genre: 'f', teint: 2 }).ok, true);
  assertEqual([memberName(s, 'adulte-3'), memberPortrait(s, 'adulte-3')], ['Mamie', '👩\u{1F3FC}']);
});

test('version 1.2 : le nouveau membre arrive avec la santé moyenne de la famille', () => {
  const s = garden();
  setHealth(s, 60);
  s.famille.membres[0].sante = 20;
  const avant = rawAverageHealth(s);
  addMember(s, true);
  assertEqual([findMember(s, 'enfant-3').sante, rawAverageHealth(s)], [50, avant], 'la moyenne ne bouge pas');
  setHealth(s, 0);
  addMember(s, false);
  assertEqual(findMember(s, 'adulte-3').sante, 1, 'jamais à 0 : il n\'arrive pas malade');
});

test('version 1.2 : retirer un membre : au moins un membre, au moins un adulte, pas un malade', () => {
  const s = garden();
  const r = removeMember(s, 'enfant-2');
  assertEqual([r.ok, r.besoin, s.famille.membres.map((m) => m.id)], [true, 125, ['adulte-1', 'adulte-2', 'enfant-1']]);
  assertEqual(removeMember(s, 'enfant-2').ok, false, 'déjà parti');
  assertEqual(removeMember(s, 'adulte-2').ok, true);
  const dernierAdulte = removeMember(s, 'adulte-1');
  assertEqual([dernierAdulte.ok, dernierAdulte.error, memberRemovalBlock(s, 'adulte-1')], [false, 'Il faut au moins un adulte dans la famille.', 'Il faut au moins un adulte dans la famille.']);
  assertEqual([removeMember(s, 'enfant-1').ok, familyNeed(s)], [true, 50]);
  const seul = removeMember(s, 'adulte-1');
  assertEqual([seul.ok, seul.error, s.famille.membres.length], [false, 'Il faut au moins un membre dans la famille.', 1]);
  // un malade ne part pas
  const t = garden();
  findMember(t, 'enfant-1').malade = true;
  findMember(t, 'enfant-1').sante = 0;
  assertEqual([removeMember(t, 'enfant-1').ok, t.famille.membres.length], [false, 4]);
  assert(memberRemovalBlock(t, 'enfant-1').includes('malade'), 'la raison est dite');
  assertEqual(memberRemovalBlock(t, 'enfant-2'), '');
});

test('version 1.2 : un identifiant de membre n\'est jamais réutilisé, la famille se sauvegarde telle quelle', () => {
  const s = garden();
  addMember(s, true);
  assertEqual(removeMember(s, 'enfant-3').ok, true);
  assertEqual(addMember(s, true).id, 'enfant-4');
  assertEqual(s.famille.numeros, { adulte: 2, enfant: 4, compagnon: 0 });
  // compteur perdu (sauvegarde modifiée) : on repart du plus grand numéro présent
  delete s.famille.numeros;
  assertEqual(addMember(s, false).id, 'adulte-3');
  const copie = JSON.parse(JSON.stringify(s));
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: copie }).famille, s.famille);
});

test('version 1.2 : une famille d\'un seul adulte vit sa nuit (besoin 50), une famille de six aussi (besoin 250)', () => {
  const s = garden();
  for (const id of ['adulte-2', 'enfant-1', 'enfant-2']) assert(removeMember(s, id).ok, id);
  setInv(s, { conserve: 200 });
  const r = sleepOnce(s);
  assertEqual([r.besoin, r.couverture, familyNeed(s), averageHealth(s)], [50, 100, 50, 100]);
  const t = garden();
  addMember(t, false);
  addMember(t, false);
  setInv(t, { conserve: 400 });
  const r6 = sleepOnce(t);
  assertEqual([familyNeed(t), r6.besoin, r6.couverture, t.famille.membres.length], [250, 250, 100, 6]);
});

test('version 1.2 : chiens et chats : trois au plus, hors du besoin journalier, de la santé et de la productivité', () => {
  const s = garden();
  const besoin = familyNeed(s);
  const sante = [rawAverageHealth(s), averageHealth(s), productivity(s)];
  assertEqual([pets(s), petRoom(s)], [[], 3]);
  const a = addPet(s, 'chien');
  const b = addPet(s, 'chat');
  const c = addPet(s, 'chat');
  assertEqual([a.ok, a.id, b.id, c.id, petRoom(s)], [true, 'compagnon-1', 'compagnon-2', 'compagnon-3', 0]);
  assertEqual(pets(s), [{ id: 'compagnon-1', espece: 'chien', nom: 'Chien 1' }, { id: 'compagnon-2', espece: 'chat', nom: 'Chat 2' }, { id: 'compagnon-3', espece: 'chat', nom: 'Chat 3' }]);
  assertEqual([addPet(s, 'chien').ok, pets(s).length], [false, 3], 'pas de quatrième animal');
  assertEqual(addPet(garden(), 'poney').ok, false);
  assertEqual([familyNeed(s), rawAverageHealth(s), averageHealth(s), productivity(s), s.famille.membres.length], [besoin, ...sante, 4], 'ils ne comptent pas');
  // la nuit ne les nourrit pas et ne les compte pas
  setInv(s, { conserve: 200 });
  const avant = countItem(s, 'conserve');
  const rep = sleepOnce(s);
  const sans = garden();
  setInv(sans, { conserve: 200 });
  sleepOnce(sans);
  assertEqual([rep.besoin, avant - countItem(s, 'conserve')], [150, 200 - countItem(sans, 'conserve')], 'même repas avec ou sans animaux');
  assertEqual(pets(s).length, 3, 'ils sont toujours là au réveil');
});

test('version 1.2 : nom et espèce d\'un animal de compagnie, départ, identifiants jamais réutilisés', () => {
  const s = garden();
  addPet(s, 'chien');
  assertEqual([petName(s, 'compagnon-1'), petIcon('chien'), petIcon('chat'), petIcon('poney')], ['Chien 1', '🐶', '🐱', '🐾']);
  assertEqual(setPetProfile(s, 'compagnon-1', { nom: '  Rex  ', espece: 'chat' }).ok, true);
  assertEqual(findPet(s, 'compagnon-1'), { id: 'compagnon-1', espece: 'chat', nom: 'Rex' });
  for (const bad of [{ nom: '' }, { nom: '   ' }, { nom: 'x'.repeat(13) }, { nom: 7 }, { espece: 'poney' }, null]) {
    assertEqual(setPetProfile(s, 'compagnon-1', bad).ok, false, JSON.stringify(bad));
  }
  assertEqual(findPet(s, 'compagnon-1'), { id: 'compagnon-1', espece: 'chat', nom: 'Rex' }, 'un refus ne change rien');
  assertEqual([setPetProfile(s, 'inconnu', { nom: 'A' }).ok, removePet(s, 'inconnu').ok, petName(s, 'inconnu')], [false, false, '']);
  assertEqual([removePet(s, 'compagnon-1').ok, pets(s), petRoom(s)], [true, [], 3]);
  assertEqual(addPet(s, 'chat').id, 'compagnon-2');
  assertEqual(JSON.parse(JSON.stringify(s)).famille.animaux, [{ id: 'compagnon-2', espece: 'chat', nom: 'Chat 2' }]);
});

/* ---------- version 1.3 : le courrier (lettre du cousin au déblocage de la Serre) ---------- */

test('version 1.3 : format 19, la boîte aux lettres commence vide et la migration l\'ajoute', () => {
  assertEqual(typeof MIGRATIONS[18], 'function');
  const neuf = createInitialState(1);
  assertEqual([neuf.courrier, unreadMail(neuf), notificationCount(neuf) - getNotifications(neuf).length], [[], [], 0]);
  const v18 = JSON.parse(JSON.stringify(createInitialState(3)));
  v18.version = 18;
  delete v18.courrier;
  const m = MIGRATIONS[18](v18);
  assertEqual([m.version, m.courrier], [19, []]);
  assertEqual(migrate({ v: 18, t: 0, s: v18 }).courrier, [], 'la migration complète garde la boîte');
});

test('version 1.3 : la lettre du cousin est définie : Serre, 1 cacao, 1 vanille, 1 café, sans prénom de la famille', () => {
  const L = DATA.COURRIER.cousin_venezuela;
  assertEqual([L.quand, L.cadeaux], [{ debloque: 'serre' }, { cacao: 1, vanille: 1, cafe: 1 }]);
  // les trois cadeaux se plantent tels quels, et seulement dans la Serre
  for (const item of Object.keys(L.cadeaux)) {
    assertEqual([seedItem(item), DATA.crops[item].lieux], [item, ['serre']], item);
    assert(DATA.crops[item].rendement > 1, `${item} : une récolte rend de quoi replanter`);
  }
  assert(L.texte.length >= 3 && L.texte.every((p) => typeof p === 'string' && p.length > 0), 'un texte en paragraphes');
  assert(/Venezuela/.test(L.lieu) && /cacao/.test(L.texte.join(' ')) && /vanille/.test(L.texte.join(' ')) && /café/.test(L.texte.join(' ')), 'la lettre parle de ses cadeaux');
  for (const m of DATA.FAMILY.MEMBRES) assert(!L.texte.join(' ').includes(m.nom), 'pas de prénom dans la lettre');
});

test('version 1.3 : la lettre arrive quand la Serre se débloque, une seule fois, avec ses trois graines', () => {
  const avant = atChapter(unlockChapter('serre') - 1);
  setInv(avant, {});
  updateChapters(avant);
  assertEqual([isUnlocked(avant, 'serre'), avant.courrier, countItem(avant, 'cacao')], [false, [], 0], 'rien avant le déblocage');
  const s = atChapter(unlockChapter('serre'));
  setInv(s, {});
  s.day = 57;
  assertEqual(deliverMail(s), ['cousin_venezuela']);
  assertEqual(s.courrier, [{ id: 'cousin_venezuela', nuit: 57, lu: false }]);
  assertEqual([countItem(s, 'cacao'), countItem(s, 'vanille'), countItem(s, 'cafe')], [1, 1, 1]);
  assertEqual([mailReceived(s, 'cousin_venezuela'), unreadMail(s).length, notificationCount(s) - getNotifications(s).length], [true, 1, 1]);
  // pas de deuxième lettre ni de deuxième cadeau
  assertEqual([deliverMail(s), updateChapters(s) >= 0, s.courrier.length], [[], true, 1]);
  tick(s, 1);
  sleepOnce(s);
  assertEqual([s.courrier.length, countItem(s, 'cacao'), countItem(s, 'vanille'), countItem(s, 'cafe')], [1, 1, 1, 1], 'ni le temps ni la nuit n\'en redonnent');
  // la lettre lue reste dans la boîte, et ne compte plus dans la pastille
  assertEqual([readMail(s, 'cousin_venezuela').ok, s.courrier[0].lu, unreadMail(s), readMail(s, 'inconnue').ok], [true, true, [], false]);
  assertEqual(JSON.parse(JSON.stringify(s)).courrier, s.courrier, 'le courrier se sauvegarde');
});

test('version 1.3 : la lettre arrive par le jeu lui-même, à la fin du chapitre qui ouvre la Serre', () => {
  const s = atChapter(unlockChapter('serre') - 1);
  assertEqual(s.courrier, []);
  const vanille = countItem(s, 'vanille');
  assert(testCompleteChapter(s).ok, 'valider le chapitre');
  tick(s, 0.2); // le pas de jeu suivant fait arriver le courrier
  assertEqual([isUnlocked(s, 'serre'), s.courrier.map((l) => l.id), countItem(s, 'vanille') - vanille], [true, ['cousin_venezuela'], 1]);
});

test('version 1.3 : une partie d\'avant la version 1.3, Serre déjà ouverte, reçoit la lettre au premier passage', () => {
  const v18 = JSON.parse(JSON.stringify(atChapter(7)));
  v18.version = 18;
  delete v18.courrier;
  const m = migrate({ v: 18, t: 0, s: v18 });
  assertEqual(m.courrier, [], 'la migration ne distribue rien elle-même');
  const cacao = countItem(m, 'cacao');
  tick(m, 0.2);
  assertEqual([m.courrier.map((l) => [l.id, l.lu]), countItem(m, 'cacao') - cacao], [[['cousin_venezuela', false]], 1]);
  // boîte abîmée : elle est refaite, sans plantage
  const t = atChapter(7);
  t.courrier = 'x';
  assertEqual([unreadMail(t), deliverMail(t), t.courrier.length], [[], ['cousin_venezuela'], 1]);
});

/* ---------- données : RAW_DATA (data/*.json) → DATA (buildCatalog) ---------- */

test('données : buildCatalog() calcule sur une copie, RAW_DATA garde les valeurs des fichiers', () => {
  // prix de production doublés, temps des plats divisés, plats enregistrés comme objets
  assertEqual([RAW_DATA.items.carotte.prix, DATA.items.carotte.prix], [1, 2]);
  assertEqual([RAW_DATA.recipes.pain.temps, DATA.recipes.pain.temps], [20, 10]);
  assertEqual([RAW_DATA.items.pain, DATA.items.pain.plat], [undefined, true]);
  // deux catalogues tirés des mêmes fichiers sont égaux et indépendants
  const autre = buildCatalog(RAW_DATA);
  assertEqual(autre, DATA);
  autre.items.carotte.prix = 99;
  assertEqual([DATA.items.carotte.prix, RAW_DATA.items.carotte.prix], [2, 1]);
});

test('données : l\'ordre des recettes dans le fichier ne change rien (le pain à l\'ail avant le pain)', () => {
  const raw = JSON.parse(JSON.stringify(RAW_DATA));
  const { pain, ...autres } = raw.recipes;
  raw.recipes = { ...autres, pain }; // le pain en dernier : le pain à l'ail, qui l'utilise, vient avant
  const d = buildCatalog(raw);
  for (const id of ['pain', 'pain_ail']) {
    assertEqual([d.items[id].energie, d.items[id].prix], [DATA.items[id].energie, DATA.items[id].prix], id);
  }
  // les plats restent rangés dans l'ordre des recettes
  const plats = (data) => Object.keys(data.items).filter((id) => data.items[id].plat && !data.items[id].retire);
  assertEqual(plats(d), Object.keys(raw.recipes).filter((id) => !raw.recipes[id].transformation));
});

test('données : deux recettes qui s\'utilisent l\'une l\'autre sont refusées', () => {
  const raw = JSON.parse(JSON.stringify(RAW_DATA));
  raw.recipes.pain.ingredients.push({ item: 'pain_ail', qte: 1 });
  let message = '';
  try {
    buildCatalog(raw);
  } catch (e) {
    message = e.message;
  }
  assertEqual(message, 'Recettes en boucle : pain → pain_ail → pain');
});

test('données : chaque culture connaît sa découpe sur la carte', () => {
  for (const [id, c] of Object.entries(DATA.crops)) {
    assert(c.sprite && c.sprite.c.length === 4 && [16, 32].includes(c.sprite.h), `${id} : sprite { r, h, c }`);
  }
});

/* ---------- version 1.4 : le Champ (deuxième zone de culture) et le Verger à 12 emplacements ---------- */

test('version 1.4 : format 20, le Champ commence vide et la migration l\'ajoute', () => {
  assertEqual([typeof MIGRATIONS[19], STATE_VERSION >= 20], ['function', true]);
  const Z = DATA.POTAGER.ZONE2;
  assertEqual([Z.ID, Z.PARCELLES, Z.COLONNES, Z.DEBLOCAGE], ['zone2', 64, 8, 'moulin']);
  const neuf = createInitialState(1);
  assertEqual([neuf.potager.zone2, zone2Plots(neuf), allPlots(neuf).length], [[], [], DATA.POTAGER.PARCELLES[0]]);
  const v19 = JSON.parse(JSON.stringify(createInitialState(3)));
  v19.version = 19;
  delete v19.potager.zone2;
  const m = migrate({ v: 19, t: 0, s: v19 });
  assertEqual([m.version, m.potager.zone2, m.potager.parcelles.length], [STATE_VERSION, [], DATA.POTAGER.PARCELLES[0]]);
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
});

test('version 1.4 : le Champ s\'ouvre en entier avec le Moulin, une seule fois, sans rien payer', () => {
  const Z = DATA.POTAGER.ZONE2;
  const avant = atChapter(unlockChapter('moulin') - 1);
  updateChapters(avant);
  assertEqual([isUnlocked(avant, 'moulin'), zone2Plots(avant).length], [false, 0], 'pas avant le Moulin');
  const s = atChapter(unlockChapter('moulin'));
  const pieces = s.pieces;
  updateChapters(s);
  const z = zone2Plots(s);
  assertEqual([z.length, s.pieces, s.potager.parcelles.length], [Z.PARCELLES, pieces, DATA.POTAGER.PARCELLES[0]]);
  assertEqual([z[0].id, z[63].id, z[0].lieu, z[0].zone, plotZone(z[0]), plotZone(s.potager.parcelles[0])], ['zone2-1', 'zone2-64', 'potager', 2, 2, 1]);
  assertEqual(z[0], makeZone2Plot(1));
  assertEqual(new Set(allPlots(s).map((p) => p.id)).size, allPlots(s).length, 'aucun identifiant en double');
  assertEqual(findPlot(s, 'zone2-10'), z[9]);
  // Une seule fois : un deuxième passage ne recrée rien et ne touche pas aux plantes.
  addItem(s, 'ble', 5);
  assert(plant(s, 'zone2-10', 'ble').ok, 'planter du blé dans le Champ');
  assertEqual([openZone2(s), updateChapters(s) >= 0, zone2Plots(s).length, z[9].culture], [false, true, Z.PARCELLES, 'ble']);
  // Agrandir la Zone de culture ne touche pas au Champ.
  s.pieces = 10000;
  assert(upgradePotager(s).ok, 'agrandir la zone');
  assertEqual([s.potager.parcelles.length, zone2Plots(s).length], [DATA.POTAGER.PARCELLES[1], Z.PARCELLES]);
});

test('version 1.4 : le Champ suit les règles de la Zone de culture (cultures, eau, pousse, récolte)', () => {
  const s = atChapter(unlockChapter('moulin'));
  updateChapters(s);
  assertEqual(plantableCropsFor(s, zone2Plots(s)[0].lieu), plantableCropsFor(s, 'potager'), 'mêmes cultures');
  addItem(s, 'graines_carotte', 2);
  assert(plant(s, 'zone2-1', 'carotte').ok && plant(s, 'potager-1', 'carotte').ok, 'une carotte dans chaque zone');
  s.eauMl = 100000;
  assertEqual(water(s, 'zone2-1').litres, water(s, 'potager-1').litres, 'même eau');
  growAll(s);
  assertEqual([findPlot(s, 'zone2-1').stade, findPlot(s, 'zone2-1').arrose], [1, false]);
  assert(testRipenAll(s).ok !== false, 'faire mûrir');
  assertEqual(isMature(findPlot(s, 'zone2-1')), true);
  const r = harvest(s, 'zone2-1');
  assertEqual([r.ok, r.items.carotte, findPlot(s, 'zone2-1').culture], [true, harvestYield(s, 'carotte', false, 'potager'), null]);
});

test('version 1.4 : « Arroser tout » et « Récolter tout » s\'adressent à une zone à la fois', () => {
  const s = atChapter(unlockChapter('moulin'));
  updateChapters(s);
  grantTech(s, 'cu_outils');
  addItem(s, 'ble', 10);
  for (const id of ['potager-1', 'potager-2', 'zone2-1', 'zone2-2', 'zone2-3']) assert(plant(s, id, 'ble').ok, id);
  s.eauMl = 100000;
  assertEqual(waterAll(s, 'potager', 2), { ok: true, arrosees: 3, sansEau: 0 });
  assertEqual(allPlots(s).filter((p) => p.arrose).map((p) => p.id), ['zone2-1', 'zone2-2', 'zone2-3']);
  assertEqual(waterAll(s, 'potager', 1), { ok: true, arrosees: 2, sansEau: 0 });
  assertEqual(waterAll(s, 'potager').ok, false, 'tout est arrosé');
  testRipenAll(s);
  assertEqual(harvestAll(s, 'potager', 1).recoltees, 2);
  assertEqual(allPlots(s).filter((p) => p.culture).map((p) => p.id), ['zone2-1', 'zone2-2', 'zone2-3']);
  assertEqual(harvestAll(s, 'potager', 2).recoltees, 3);
  // sans zone : tout le lieu, comme avant
  addItem(s, 'ble', 2);
  assert(plant(s, 'potager-1', 'ble').ok && plant(s, 'zone2-1', 'ble').ok, 'replanter');
  assertEqual(waterAll(s, 'potager').arrosees, 2);
});

test('version 1.4 : les automatisations et les alertes de la Zone de culture couvrent le Champ', () => {
  const s = atChapter(unlockChapter('moulin'));
  updateChapters(s);
  addItem(s, 'ble', 4);
  assert(plant(s, 'zone2-5', 'ble').ok, 'planter');
  s.eauMl = 100000;
  assertEqual(getNotifications(s).find((n) => n.type === 'arrosage').nombre, 1, 'une parcelle du Champ à arroser');
  grantTech(s, 'ea_irrigation');
  grantTech(s, 'cu_recolte_auto');
  assertEqual(getNotifications(s).some((n) => n.type === 'arrosage'), false, 'l\'arrosage automatique la couvre');
  assertEqual(autoTasks(s).arrosees, 1);
  assertEqual(findPlot(s, 'zone2-5').arrose, true);
  testRipenAll(s);
  const rap = autoTasks(s);
  assertEqual([rap.potager, rap.recoltes.ble > 0, findPlot(s, 'zone2-5').culture], [true, true, null]);
});

test('version 1.4 : une partie d\'avant, Moulin déjà débloqué, reçoit le Champ au premier passage', () => {
  const s = atChapter(unlockChapter('moulin') + 1);
  const v19 = JSON.parse(JSON.stringify(s));
  v19.version = 19;
  delete v19.potager.zone2;
  const m = migrate({ v: 19, t: 0, s: v19 });
  assertEqual(zone2Plots(m).length, 0, 'la migration ne crée rien');
  updateChapters(m);
  assertEqual(zone2Plots(m).length, DATA.POTAGER.ZONE2.PARCELLES);
  // Une partie restée avant le Moulin ne reçoit rien.
  const tot = JSON.parse(JSON.stringify(atChapter(2)));
  tot.version = 19;
  delete tot.potager.zone2;
  const m2 = migrate({ v: 19, t: 0, s: tot });
  updateChapters(m2);
  assertEqual(zone2Plots(m2).length, 0);
});

test('version 1.4 : un Verger de plus de 12 emplacements garde ses arbres et ses fruits', () => {
  const s = orchard();
  s.verger.places = 15;
  s.verger.achetes = 13;
  s.pieces = 100000;
  for (let i = 0; i < 15; i++) assert(buyTree(s, i % 2 ? 'poirier' : 'pommier').ok, `arbre ${i + 1}`);
  assertEqual([s.verger.arbres.length, orchardFree(s)], [15, 0]);
  assertEqual(buyOrchardSlot(s).ok, false, 'plus d\'emplacement à vendre au-delà de 12');
  const v19 = JSON.parse(JSON.stringify(s));
  v19.version = 19;
  const m = migrate({ v: 19, t: 0, s: v19 });
  assertEqual([m.verger.places, m.verger.arbres.length], [15, 15], 'rien n\'est retiré');
  // Les 15 arbres, adultes, donnent tous leurs fruits une nuit de production.
  const w = orchardWindow();
  m.day = w.debut + DATA.VERGER.PERIODE - 1 + 40;
  for (const t of m.verger.arbres) t.plantee = 1;
  m.nuit = newNightStats();
  growOrchard(m);
  assertEqual((m.nuit.fruits.pomme || 0) + (m.nuit.fruits.poire || 0), 15 * DATA.VERGER.FRUITS);
});

/* ---------- réserve de semences retirée, blé au Silo, Étable, « Tout ranger » ---------- */

test('blé : au Silo il ne périme jamais, dans l\'inventaire il périme en 10 nuits', () => {
  const s = ranch();
  setInv(s, { conserve: 500 });
  s.silo.ble = 20; // Silo plein (niveau 1)
  addItem(s, 'ble', 5);
  assertEqual(lotsOf(s, 'ble')[0].nightsLeft, 10);
  for (let i = 0; i < 9; i++) {
    s.awakeMs = 30000;
    sleep(s);
  }
  assertEqual([s.silo.ble, countItem(s, 'ble'), expiringSoon(s).ble], [20, 5, 5], 'le Silo est plein : le blé de l\'inventaire vieillit');
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [20, 0], 'le Silo, lui, n\'a rien perdu');
  assertEqual(r.perimes.ble, 5);
});

test('blé : le Silo se remplit avec le blé de l\'inventaire (la nuit, à l\'amélioration, à l\'achat)', () => {
  const s = ranch();
  setInv(s, { conserve: 500, ble: 30 });
  s.silo.ble = 5;
  assertEqual(fillSilo(s), 15, '20 − 5 = 15 places');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [20, 15]);
  s.pieces = 1000;
  assert(upgradeSilo(s).ok);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [35, 0], 'niveau 2 : tout rentre');
  // la nuit : ce qui a été pris dans le Silo laisse de la place
  s.silo.ble = 45;
  addItem(s, 'ble', 8);
  s.awakeMs = 30000;
  sleep(s);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [50, 3]);
  // le blé acheté au Marché va au Silo s'il y a de la place
  s.silo.ble = 48;
  setInv(s, { conserve: 500 });
  const r = buyItem(s, 'ble', 5);
  assertEqual([r.bought, s.silo.ble, countItem(s, 'ble')], [5, 50, 3]);
});

test('blé : il ne va pas au frigo (sa place est au Silo)', () => {
  const s = ranch();
  s.pieces = 1000;
  buildFridge(s);
  setInv(s, { ble: 4, carotte: 3 });
  assertEqual([isFridgeable('ble'), isFridgeable('carotte'), isFridgeable('conserve')], [false, true, false]);
  assertEqual(moveToFridge(s, 'ble', 2).ok, false);
  assertEqual(countItem(s, 'ble'), 4);
});

test('« Tout ranger » : tous les aliments frais vont au frigo en une fois, sauf le blé', () => {
  const s = ranch();
  setInv(s, { carotte: 3, tomate: 2, ble: 4, conserve: 10 });
  assertEqual(moveAllToFridge(s).ok, false, 'pas de frigo');
  s.pieces = 1000;
  buildFridge(s);
  const r = moveAllToFridge(s);
  assertEqual([r.ok, r.moved, r.items], [true, 5, { carotte: 3, tomate: 2 }]);
  assertEqual(inventoryCounts(s), { ble: 4, conserve: 10 });
  assertEqual([fridgeCount(s, 'carotte'), fridgeCount(s, 'tomate')], [3, 2]);
  assertEqual(moveAllToFridge(s).ok, false, 'plus rien à ranger');
});

test('Étable : des places achetées à la suite pour loger une vache', () => {
  const s = pature();
  s.pieces = 10000;
  assertEqual(freeCowPlaces(s), 3, '10 places libres : 3 vaches');
  fillCows(s, 3);
  fillSheep(s, 1);
  assertEqual([stableFree(s), freeCowPlaces(s)], [0, 0]);
  for (let i = 0; i < 3; i++) assert(buyPasture(s).ok, `place ${i + 1}`);
  assertEqual([s.paturage.places, freeCowPlaces(s)], [13, 1]);
  assert(buyCow(s).ok, 'la vache tient dans les 3 places achetées');
});

test('migration v20 → v21 : la réserve de semences est vidée, le blé de l\'inventaire part à conservation pleine', () => {
  const v20 = JSON.parse(JSON.stringify(ranch()));
  v20.version = 20;
  v20.famille.reserve = { patate: 6, ail: 2 };
  v20.inventaire.ble = [{ qty: 3, nightsLeft: null, origin: 'produit' }, { qty: 2, nightsLeft: null, origin: 'acheté' }];
  v20.silo.ble = 12;
  const m = migrate({ v: 20, t: 0, s: v20 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.famille.reserve, {});
  assertEqual(m.inventaire.ble, [{ qty: 5, nightsLeft: 10, origin: 'produit' }]);
  assertEqual(m.silo.ble, 12, 'le Silo ne change pas');
  assertEqual(typeof migrateWheatAndReserve, 'function');
});

// run-tests.mjs importe ce fichier et lit `results`.
export const results = runTests();
