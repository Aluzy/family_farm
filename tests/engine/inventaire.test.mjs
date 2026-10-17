/* ==========================================================================
   Tests du moteur : Lot 3 : inventaire par lots, péremption, Marché.
   Lancer seul : node --test tests/engine/inventaire.test.mjs (ou node tests/run-tests.mjs inventaire).
   ========================================================================== */

import {
  addItem, buildSerre, buyItem, buyPrice, countItem, createInitialState, DATA, expiringSoon,
  feedFamily, harvest, inventoryCounts, isBuyable, isPerishable, lotsOf, marketCoef, marketFloor,
  mealOrder, migrate, planMeal, sellItem, setSeedReserve, shelfLife, sleep, spoil, startFarm,
  startHousehold, STATE_VERSION, takeItem, testAddFood, testAgeInventory, tick,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, garden, plantRipe, reach, setInv, test, testBase,
} from './aide.mjs';

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
  buildSerre(reach(s, 'serre'));
  addItem(s, 'graine_oignon', 1);
  addItem(s, 'riz', 1);
  addItem(s, 'cacao', 1);
  plantRipe(s, 'potager-1', 'oignon');
  plantRipe(s, 'potager-2', 'riz');
  plantRipe(s, 'serre-1', 'cacao');
  // Version 1.6 : plus de saisons, le rendement de base partout (oignon 8, riz 10, cacao 5).
  assertEqual(harvest(s, 'potager-1').items.oignon, 8);
  assertEqual(harvest(s, 'potager-2').items.riz, 10);
  assertEqual(harvest(s, 'serre-1').items.cacao, 5);
  assertEqual([countItem(s, 'oignon'), countItem(s, 'riz'), countItem(s, 'cacao')], [8, 10, 5], 'récoltes bien dans l\'inventaire');
  // Lot 12 : prix de vente doublés (oignon 2, riz 2, cacao 16).
  assertEqual(sellItem(s, 'oignon', 8), { ok: true, sold: 8, gain: 16 });
  assertEqual(sellItem(s, 'riz', 10), { ok: true, sold: 10, gain: 20 });
  assertEqual(sellItem(s, 'cacao', 5), { ok: true, sold: 5, gain: 80 }, '5 × 16 : le cacao se vend cher, comme prévu');
  assertEqual([countItem(s, 'oignon'), countItem(s, 'riz'), countItem(s, 'cacao')], [0, 0, 0]);
});

test('mode test Lot 3 : 20 de chaque aliment, puis vieillissement d\'une nuit', () => {
  const s = garden();
  setInv(s, { conserve: 5 });
  testAddFood(s);
  // Lot 5 : la viande, les fruits, le pain et les plats sont aussi des aliments.
  // Lot « 10 cultures » : oignon, ail, poivron, épinard, fraise et riz sont
  // comestibles (contrairement à houblon/cacao/vanille/café, mangeable: false,
  // absents d'ici) — ajoutés à la suite dans DATA.OBJETS, donc à la fin ici.
  // Les trois anciennes viandes et le lait sont à la fin des objets de base
  // (après café), donc juste avant les plats ; la paille, elle, ne se mange pas.
  // Nouvelles recettes : ajoutées à DATA.OBJETS par registerDishItems(),
  // dans l'ordre de déclaration de DATA.RECETTES, donc après tarte_pommes.
  // Version 1.1 : les quatre plats retirés du livre (DATA.PLATS_RETIRES)
  // restent des aliments, ajoutés tout à la fin.
  // Les poissons de la ferme (truite, brochet) sont rangés avec le bois et la pierre, après la poire.
  assertEqual(inventoryCounts(s), {
    conserve: 25, carotte: 20, patate: 20, tomate: 20, courgette: 20, aubergine: 20, oeuf: 20,
    viande_mouton: 20, pomme: 20, poire: 20, truite: 20, brochet: 20, omble: 20, dorade: 20, anchois: 20, sardine: 20, oignon: 20, ail: 20, poivron: 20, epinard: 20, fraise: 20, riz: 20,
    viande_boeuf: 20, viande_volaille: 20, lait: 20, lait_alpage: 20,
    // version 1.5 : denrées de la ville et de la cueillette (le sucre et les épices ne se mangent pas)
    poisson: 20, miel: 20, fromage_alpage: 20, champignon: 20, myrtille: 20, chataigne: 20,
    pain: 20, omelette: 20, ratatouille: 20, gratin_patates: 20, compote: 20, tarte_pommes: 20,
    soupe_legumes: 20, salade_tomates: 20, quiche_epinards: 20, fromage_frais: 20, riz_au_lait: 20,
    pain_ail: 20, tarte_fraises: 20, confiture_fraises: 20,
    chocolat_chaud: 20, cafe_boisson: 20, creme_vanille: 20, biere_artisanale: 20,
    bocal_legumes: 20,
    omelette_champignons: 20, poisson_grille: 20, raclette: 20, creme_marrons: 20, tarte_myrtilles: 20, pain_epices: 20, mayonnaise: 20, quenelle_poisson: 20,
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
    omelette_champignons: 20, poisson_grille: 20, raclette: 20, creme_marrons: 20, tarte_myrtilles: 20, pain_epices: 20, mayonnaise: 20, quenelle_poisson: 20,
    ragout: 20, poivrons_farcis: 20, roti_boeuf: 20, poulet_roti_ail: 20,
  });
  assertEqual(inventoryCounts(s), {
    conserve: 25, patate: 20, pomme: 20, poire: 20, ail: 20, riz: 20, miel: 20, fromage_alpage: 20, chataigne: 20, pain: 20,
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
