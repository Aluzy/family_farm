/* ==========================================================================
   Tests du moteur : Lot 4 : cultures de plein champ, Silo, Poulailler ; blé au Silo, « Tout ranger ».
   Lancer seul : node --test tests/engine/champ-poulailler.test.mjs (ou node tests/run-tests.mjs champ-poulailler).
   ========================================================================== */

import {
  addItem, allPlots, animalPrice, buildFridge, buildPoulailler, buildSilo, buyAnimal, buyCow,
  buyItem, buyPasture, coopCapacity, coopUpgradeCost, countItem, createInitialState, cropProduct,
  DATA, expiringSoon, feedAllHens, feedHen, fillSilo, findPlot, formatQty, freeCowPlaces,
  fridgeCount, harvest, inventoryCounts, isFridgeable, isGraineComptoir, isMature, isUnlocked,
  layEggs, lotsOf, marketFloor, migrate, migrateWheatAndReserve, moveAllToFridge, moveToFridge,
  depenserMembre, mangerMembre, mangeurs, plant, plantableCrops, readyCrops, scaleEnergie, seedStock, sellItem, shelfLife,
  siloCapacity, siloUpgradeCost, sleep, stableFree, startFarm, startHousehold, STATE_VERSION,
  storeWheat, testAddHens, testAddSeeds, testAddWheat, testRipenAll, testSetLevel,
  upgradePoulailler, upgradeSilo, water, wheatForHens, wheatTotal, zoneTile,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, fillCows, fillSheep, garden, growZone, ml, pature, ranch, reach, setInv,
  test,
} from './aide.mjs';

/* ---------- Lot 4 : cultures de plein champ, Silo, Poulailler ---------- */

test('DATA Lot 4 : Silo, Poulailler, poule, blé, tournesol et œuf (plus de Champ)', () => {
  assertEqual(DATA.CHAMP, undefined, 'version 1.0 : le Champ a rejoint la Zone de culture');
  assertEqual([DATA.SILO.CAPACITE, DATA.SILO.PRIX_CONSTRUCTION, DATA.SILO.PRIX_NIVEAUX], [[20, 50, 100, 200, 400], 0, [0, 30, 80, 180, 400]]);
  assertEqual([DATA.POULAILLER.PRIX_CONSTRUCTION, DATA.POULAILLER.CAPACITE, DATA.POULAILLER.PRIX_NIVEAUX], [40, [4, 8, 12, 16, 24], [0, 100, 220, 450, 900]]);
  assertEqual([DATA.ANIMAUX.poule.prix, DATA.ANIMAUX.poule.poulesParBle, DATA.ANIMAUX.poule.oeufsParNuit], [15, 2, 1]);
  const c = DATA.CULTURES;
  assertEqual([c.ble.stades, c.ble.litres, c.ble.rendement, c.ble.graines], [7, 2, 8, { item: 'ble', mode: 'plant' }]);
  assertEqual([c.tournesol.stades, c.tournesol.litres, c.tournesol.rendement], [7, 2, 9]);
  assertEqual(cropProduct('tournesol'), 'graine_tournesol');
  assertEqual(cropProduct('ble'), 'ble');
  // Lot 12 : prix de vente de l'œuf doublé (2 → 4).
  assertEqual([DATA.OBJETS.oeuf.energie, DATA.OBJETS.oeuf.prix, shelfLife('oeuf')], [scaleEnergie(10), 4, 6]);
  assertEqual(shelfLife('ble'), 10, 'le blé périme dans l\'inventaire, jamais au Silo');
  assertEqual(shelfLife('graine_tournesol'), null);
});

test('Marché – onglet Graines : isGraineComptoir()', () => {
  // Le blé y apparaît sans changer de catégorie (double fonction préservée :
  // Silo, Moulin, poules, plancher de marché ×1,2, comme avant).
  assertEqual(isGraineComptoir('ble'), true);
  assertEqual(DATA.OBJETS.ble.categorie, 'ingrédient');
  assertEqual(marketFloor('ble'), DATA.MARCHE.PLANCHER.defaut);
  // Les graines de tournesol restent classées « graine », comme les autres graines.
  assertEqual(isGraineComptoir('graine_tournesol'), true);
  assertEqual(DATA.OBJETS.graine_tournesol.categorie, 'graine');
  for (const k of ['graine_carotte', 'graine_tomate', 'graine_courgette', 'graine_aubergine']) {
    assertEqual(isGraineComptoir(k), true, k);
  }
  // Version 1.16 (FLU-15) : les cultures qui se plantent d'elles-mêmes (on plante une
  // patate pour en récolter d'autres) sont dans l'onglet Graines, à leur prix habituel ;
  // pas les items qui partagent juste la catégorie « ingrédient ».
  assertEqual(isGraineComptoir('patate'), true, 'la patate se plante : onglet Graines');
  assertEqual(marketFloor('patate'), DATA.MARCHE.PLANCHER.defaut, 'à son prix habituel');
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
  // ail, riz, houblon, cacao, vanille, café sont en mode 'plant' : comme la patate
  // (version 1.16, FLU-15), ils sont dans l'onglet Graines (quand leur culture est
  // débloquée), à leur prix habituel.
  for (const k of ['ail', 'riz', 'houblon', 'cacao', 'vanille', 'cafe']) {
    assertEqual(isGraineComptoir(k), true, `${k} se plante, comme la patate`);
  }
  // Version 1.7 : chaque culture a son niveau (oignon 2, poivron et fraise 3,
  // épinard 4) ; sa graine est en vente une fois ce niveau atteint. (seedForSale(),
  // qui applique cette règle, vit dans le bloc de rendu : on rejoue ici sa logique
  // — « aucune culture qui utilise cette graine n'est verrouillée ».)
  const s = createInitialState(1);
  const seedLocked = (item) => Object.keys(DATA.CULTURES).some((c) => DATA.CULTURES[c].graines.item === item && !isUnlocked(s, c));
  for (const k of ['graine_oignon', 'graine_poivron', 'graine_epinard', 'graine_fraise']) {
    assertEqual(seedLocked(k), true, `${k} pas encore en vente au niveau 1`);
  }
  testSetLevel(s, 4);
  for (const k of ['graine_oignon', 'graine_poivron', 'graine_epinard', 'graine_fraise']) {
    assertEqual(seedLocked(k), false, `${k} en vente au niveau 4`);
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
  // version 1.9 : la zone grandit à la houe
  growZone(s, 12);
  assertEqual(s.potager.parcelles.filter((p) => !DATA.POTAGER.DEPART.map((c) => zoneTile(1, c)).includes(p.case)).map((p) => [p.id, p.lieu]), [7, 8, 9, 10, 11, 12].map((n) => [`potager-${n}`, 'potager']));
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
  // rendement de base : 8 blés, 9 graines de tournesol
  assertEqual(harvest(s, 'potager-1').items, { ble: 8 });
  assertEqual(harvest(s, 'potager-2').items, { graine_tournesol: 9 });
  assertEqual(findPlot(s, 'potager-1').culture, null, 'parcelle libérée');
  assertEqual(countItem(s, 'graine_tournesol'), 9 + 1, 'la graine plantée est consommée : 2 − 1 + 9');
});

test('Silo : capacité par niveau et coûts 30 / 80 / 180 / 400, construction offerte', () => {
  const s = garden();
  s.pieces = 0;
  assertEqual(buildSilo(reach(s, 'silo')).ok, true, 'la construction est gratuite');
  assertEqual(s.pieces, 0);
  assertEqual(buildSilo(reach(s, 'silo')).ok, false);
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
  buildSilo(reach(t, 'silo'));
  t.pieces = 29;
  assertEqual(upgradeSilo(t).ok, false, 'pas assez de pièces');
});

test('Silo : le blé récolté va d\'abord au Silo, le surplus déborde dans l\'inventaire', () => {
  const s = ranch();
  setInv(s, {});
  // 3 récoltes de 8 blés = 24 : 20 au Silo (niveau 1), 4 dans l'inventaire
  s.potager.parcelles.forEach((p, i) => {
    if (i < 3) {
      p.culture = 'ble';
      p.stade = 7;
    }
  });
  harvest(s, 'potager-1');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [8, 0]);
  harvest(s, 'potager-2');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [16, 0]);
  harvest(s, 'potager-3');
  assertEqual([s.silo.ble, countItem(s, 'ble')], [20, 4], 'plein à 20, surplus de 4 dans l\'inventaire');
  assertEqual(lotsOf(s, 'ble')[0].nightsLeft, 10, 'le blé de l\'inventaire périme');
  assertEqual(wheatTotal(s), 24);
  // sans Silo, tout va dans l'inventaire
  const t = ranch({ silo: false });
  setInv(t, {});
  assertEqual(storeWheat(t, 8), { silo: 0, inventaire: 8 });
  assertEqual([t.silo.ble, countItem(t, 'ble')], [0, 8]);
  // niveau 2 : capacité 50 ; le surplus de l'inventaire rejoint aussitôt le Silo
  upgradeSilo(s);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [24, 0]);
  assertEqual(storeWheat(s, 100), { silo: 26, inventaire: 100 - 26 });
  assertEqual(s.silo.ble, 50);
});

test('Silo : les poules mangent d\'abord dans l\'inventaire (il y périme), puis dans le Silo', () => {
  const s = ranch();
  setInv(s, { ble: 1 });
  s.silo.ble = 3;
  testAddHens(s, 4);
  assertEqual(feedHen(s).ok, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [3, 0]);
  assertEqual(feedHen(s).ok, true);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [3, 0], 'la 2e poule finit le blé entamé');
  assertEqual(feedHen(s).ok, true);
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
  assertEqual(feedHen(s).ok, true, 'la ration entamée nourrit encore une poule sans blé');
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
  assertEqual(buildPoulailler(reach(s, 'poulailler')).ok, false);
  assertEqual(upgradePoulailler(s).ok, false, 'pas avant la construction');
  s.pieces = 40;
  assertEqual(buildPoulailler(reach(s, 'poulailler')).ok, true);
  assertEqual([s.pieces, coopCapacity(s)], [0, 4]);
  assertEqual(buildPoulailler(reach(s, 'poulailler')).ok, false);
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
  assertEqual(DATA.OBJETS.poule, undefined, 'une poule n\'est pas un objet : elle ne se revend pas');
});

test('poule non nourrie : pas d\'œuf ; poule nourrie : 1 œuf, puis remise à zéro', () => {
  const s = ranch();
  setInv(s, { ble: 10, conserve: 200 });
  testAddHens(s, 4);
  assertEqual(feedHen(s).ok, true);
  assertEqual(feedHen(s).ok, true);
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
  assertEqual(feedHen(s).ok, true);
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
  assertEqual([r.ok, r.nourries], [true, 2], '1 blé = 2 poules');
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
  assertEqual(feedHen(s).ok, true);
  assertEqual(feedHen(s).ok, false, 'une seule fois par nuit');
  assertEqual([s.silo.ble, s.poulailler.restes], [9, 1], 'une poule seule entame un blé entier');
});

test('tournesol : les graines récoltées servent à semer', () => {
  const s = ranch();
  setInv(s, {});
  const p = findPlot(s, 'potager-1');
  p.culture = 'tournesol';
  p.stade = 7;
  // 9 graines dans la Zone de culture
  assertEqual(harvest(s, 'potager-1', true).items, { graine_tournesol: 9 });
  assertEqual(countItem(s, 'graine_tournesol'), 9);
  assertEqual(seedStock(s, 'tournesol'), 9);
  assertEqual(plant(s, 'potager-2', 'tournesol').ok, true);
  assertEqual(countItem(s, 'graine_tournesol'), 8);
  assertEqual(findPlot(s, 'potager-2').culture, 'tournesol');
  assertEqual(plant(s, 'potager-3', 'tournesol').ok, true);
  assertEqual(countItem(s, 'graine_tournesol'), 7);
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
  affamer(s);
  assertEqual([s.repasJour.mange, s.repasJour.energie], [{}, 0]);
});

test('la famille mange les œufs (valeur 3) : ils périment avant les conserves', () => {
  const s = ranch();
  setInv(s, { oeuf: 4, conserve: 200 });
  const m = mangeurs(s)[0];
  depenserMembre(s, m.id, 80);
  // de 20 : 4 œufs (12), puis 12 conserves (72) : 104
  assertEqual(Object.entries(mangerMembre(s, m).mange), [['oeuf', 4], ['conserve', 12]]);
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
  assertEqual([m.potager.parcelles.length, 'niveau' in m.potager], [6, false]);
  assertEqual(m.silo, { construit: false, niveau: 1, ble: 0 });
  assertEqual(m.poulailler, { construit: false, niveau: 1, poules: 0, nourries: 0, restes: 0 });
  assertEqual([m.jour.ble, m.nuit.oeufs], [0, 0]);
  assertEqual(inventoryCounts(m).conserve, 160);
  // l'état migré tourne, construit et pond
  m.pieces = 500;
  assertEqual(buildPoulailler(reach(m, 'poulailler')).ok, true);
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
  buildFridge(reach(s, 'frigo'));
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
  buildFridge(reach(s, 'frigo'));
  const r = moveAllToFridge(s);
  assertEqual([r.ok, r.moved, r.reste], [true, 5, 0]);
  assertEqual([r.items.carotte, r.items.tomate], [3, 2]);
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
