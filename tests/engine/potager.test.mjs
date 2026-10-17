/* ==========================================================================
   Tests du moteur : Lot 2 : potager, famille, santé, conserves.
   Lancer seul : node --test tests/engine/potager.test.mjs (ou node tests/run-tests.mjs potager).
   ========================================================================== */

import {
  addItem, countItem, createInitialState, DATA, familyNeed, feedFamily, findPlot, growAll, harvest,
  harvestYield, inventoryCounts, isMature, maxStage, mulberry32, nextRandom, planMeal, plant,
  randomInt, reservableItems, scaleEnergie, seedItem, setSeedReserve, sleep, soilCap, soilCapNext,
  soilCount, startPlots, takeItem, testAddSeeds, testSetLevel, water, zoneTile,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, garden, ml, plantRipe, setInv, test, testBase, tireless,
} from './aide.mjs';

/* ---------- Lot 2 : potager, famille, santé, conserves ---------- */

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
  assertEqual(['carotte', 'patate', 'tomate', 'courgette', 'aubergine'].map((k) => c[k].rendement), [6, 8, 10, 6, 6]);
  assertEqual(c.patate.graines.mode, 'plant');
  for (const k of ['carotte', 'tomate', 'courgette', 'aubergine']) {
    assertEqual([c[k].graines.mode, c[k].graines.min, c[k].graines.max], ['recolte', 1, 2]);
  }
  // Version 1.0 : une seule Zone de culture (lieu 'potager'). Blé et tournesol y
  // poussent comme le reste ; seul leur déblocage ('champ', chapitre 3) les distingue.
  for (const k of ['carotte', 'patate']) assertEqual([c[k].lieux, c[k].pleinChamp, c[k].requiert], [['potager'], undefined, undefined]);
  for (const k of ['tomate', 'courgette', 'aubergine']) assertEqual(c[k].lieux, ['potager', 'serre']); // Lot 8 : la Serre
  for (const k of ['ble', 'tournesol']) assertEqual([c[k].lieux, c[k].pleinChamp], [['potager'], true]);
  assertEqual([c.ble.requiert, c.tournesol.requiert], ['silo', undefined], 'version 1.7 : le blé attend le Silo');
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
  for (const k of ['riz', 'houblon']) assertEqual([c[k].lieux, c[k].pleinChamp], [['potager'], true]);
  for (const k of ['oignon', 'ail', 'epinard', 'fraise', 'poivron', 'cacao', 'vanille', 'cafe']) assertEqual([c[k].pleinChamp, c[k].requiert], [undefined, undefined], `${k} : ni plein champ ni bâtiment requis`);
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
  assertEqual([s.potager.parcelles.map((p) => p.case), s.potager.houe, 'niveau' in s.potager], [[0, 1, 2, 5, 6, 7].map((c) => zoneTile(1, c)), false, false], 'version 1.9 : 6 cases en terre, pas encore de houe');
  assertEqual(s.potager.parcelles.length, 6);
  assertEqual(s.potager.parcelles.every((p) => p.culture === null && p.stade === 0 && !p.arrose), true);
  assertEqual(s.famille.membres.length, 4);
  assertEqual(s.famille.membres.filter((m) => m.enfant).length, 2);
  assertEqual(s.famille.membres.every((m) => !('sante' in m) && !('malade' in m)), true, 'version 1.8 : plus de santé');
  assertEqual(['soinsPayes' in s.famille, s.energie], [false, 100000], 'l\'énergie du personnage commence pleine');
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
  assertEqual([p.culture, p.stade, p.arrose], ['carotte', 0, false]);
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

testBase('récolte : le même rendement au clic et en automatique (version 1.8 : plus de productivité)', () => {
  const s = garden();
  plantRipe(s, 'potager-1', 'carotte');
  assertEqual(harvest(s, 'potager-1').items.carotte, 6);
  plantRipe(s, 'potager-2', 'carotte');
  assertEqual(harvest(s, 'potager-2', true).items.carotte, 6);
  assertEqual(harvestYield(s, 'carotte'), 6);
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
  assertEqual([p.culture, p.stade, p.arrose], [null, 0, false]);
  assertEqual(harvest(s, 'potager-1').ok, false, 'parcelle vide');
  assertEqual(plant(s, 'potager-1', 'carotte').ok, true, 'on peut replanter');
});

testBase('graines rendues : carotte, tomate, courgette et aubergine rendent 1 à 2 graines, reproductibles', () => {
  function run(seed, culture) {
    const s = tireless(createInitialState(seed));
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
  for (const culture of ['carotte', 'tomate', 'courgette', 'aubergine']) {
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

test('version 1.9 : la Zone de culture, grille de 30 cases ; plafond de tuiles par niveau', () => {
  assertEqual([DATA.POTAGER.LIEU, DATA.POTAGER.NOM, DATA.POTAGER.ICONE], ['potager', 'Zone de culture', '🌱']);
  assertEqual([DATA.POTAGER.COLONNES, DATA.POTAGER.CASES, DATA.POTAGER.ZONE2.COLONNES, DATA.POTAGER.ZONE2.CASES], [5, 30, 8, 64]);
  assertEqual([DATA.POTAGER.PARCELLES, DATA.POTAGER.COUT], [undefined, undefined], 'plus d\'agrandissement en pièces');
  assertEqual(DATA.CHAMP, undefined, 'le Champ n\'existe plus comme bâtiment');
  assertEqual(DATA.NIVEAUX.TUILES, [6, 12, 20, 32, 48, 64, 64, 64, 64, 64]);
  const s = garden();
  assertEqual([soilCount(s), soilCap(s), soilCapNext(s)], [6, 6, 6]);
  testSetLevel(s, 5);
  assertEqual([soilCap(s), soilCapNext(s)], [48, 16]);
  testSetLevel(s, 10);
  assertEqual([soilCap(s), soilCapNext(s)], [64, 0]);
  assertEqual(new Set(startPlots().map((p) => p.id)).size, 6);
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
