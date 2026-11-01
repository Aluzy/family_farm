/* ==========================================================================
   Tests du moteur : Lot 10 : simulation d'un joueur automatique.
   Lancer seul : node --test tests/engine/bot.test.mjs (ou node tests/run-tests.mjs bot).
   ========================================================================== */

import {
  actionCost, botBuy, botDay, botFarm, botFieldTarget, botHoe, botIsFieldCrop, botMill,
  botRaiseFunds, botRecipeValue, botScythe, botSell, botSheep, botSnack, botStepInfo, botWheatKept,
  chapterReached, countItem, cutGrass, DATA, hasHoe, hasTool, millPending, NIGHT_STEPS,
  openStation, sheepCount, simulateFromCopy, simulateGame, simulatePlay, simulationReach,
  soilCount, testBatir, testFillBatteries, testGoToChapter, testSetLevel, testWoolReady,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, atChapter, fillCows, fillSheep, growZone, partie, pature, reach, setInv,
  test,
} from './aide.mjs';

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
  assert(S.STRATEGIES.minimal.eveilS >= DATA.TEMPS.EVEIL_MIN_S, 'le joueur minimal reste éveillé au moins l\'éveil minimal');
  assertEqual(S.JALONS.map((j) => [j.nuit, j.pct]), [[8, 35], [15, 50], [25, 75], [40, 90], [60, 100]]);
  assertEqual(S.TOLERANCE_NUITS, 10);
  assertEqual(S.NUITS, 80);
  // chaque étape du plan et des priorités se lit sans erreur sur une partie neuve
  const s = partie(1);
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
    assert(r.energie >= 0 && r.energie <= DATA.PERSONNAGE.MAX, 'énergie du personnage entre 0 et le maximum');
    assert(r.bonheur >= 0 && r.bonheur <= DATA.BONHEUR.MAX);
    assert(r.pieces >= 0 && r.conserves >= 0 && r.niveau >= 1);
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
    const s = partie(1);
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
  const s = partie(3);
  s.pieces = 123;
  s.day = 5;
  const before = JSON.stringify(s);
  const rows = simulateFromCopy(s, 'applique', 6);
  assertEqual(JSON.stringify(s), before, 'la partie en cours est identique');
  assertEqual(rows.length, 6);
  assertEqual(rows.map((r) => r.nuit), [5, 6, 7, 8, 9, 10], 'la simulation continue à partir de la nuit en cours');
});

test('Lot 10 : le joueur automatique fauche et bottelle la paille de ses moutons et de ses vaches, et moud pour la farine', () => {
  const S = DATA.SIMULATION;
  assertEqual([S.PAILLE_NUITS, S.PAILLE_MAX_NUITS, S.FARINE_MAX], [3, 6, 12]);
  assertEqual(S.PRIORITE[5], [{ type: 'station', id: 'moulin' }, { type: 'paturage' }, { type: 'moutons', n: 3 }], 'le Moulin avant les moutons');
  const s = pature();
  for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
  testFillBatteries(s);
  fillSheep(s, 2);
  fillCows(s, 1);
  setInv(s, { ble: 20, farine: S.STOCK_FARINE, conserve: 200 });
  // version 1.23 : le Moulin ne donne plus de paille : avec assez de farine, il ne moud rien
  botMill(s);
  assertEqual([millPending(s), countItem(s, 'ble')], [0, 20]);
  // 4 pailles par nuit × 3 nuits d'avance = 12 : 20 touffes fauchées, leurs fibres bottelées
  // par 10 (deux bottes de 10 pailles ; la faux achetée)
  s.pieces = 1000;
  botScythe(s);
  assertEqual([hasTool(s, 'faux'), countItem(s, 'paille'), cutGrass(s).length, countItem(s, 'fibre')], [true, 20, 20, 0]);
  botScythe(s);
  assertEqual(countItem(s, 'paille'), 20, 'il n\'en fauche plus tant que la réserve couvre le besoin');
  // sans animaux : il ne fauche rien ; avec trop peu de farine, il en moud
  const t = pature();
  openStation(t, 'moulin');
  t.pieces = 1000;
  botScythe(t);
  assertEqual(hasTool(t, 'faux'), false);
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
  const s = partie(3);
  simulatePlay(s, 'applique', 22);
  testGoToChapter(s, 5);
  // version 1.6 : les améliorations coûtent plus cher (100 à 2 200 pièces) ;
  // version 1.7 : le Champ attend que le Moulin soit construit. Le chapitre se
  // termine vers la 28ᵉ nuit (22ᵉ avant ces deux versions).
  const rows = simulatePlay(s, 'applique', 30);
  assertEqual(rows.length, 30);
  assertEqual(s.stations.moulin.construit, true, 'il a construit le Moulin');
  assert(sheepCount(s) >= 3, `il a acheté ses moutons : ${sheepCount(s)}`);
  assert(s.campagne.compteurs.laines >= 10, `laines tondues : ${s.campagne.compteurs.laines}`);
  assert(chapterReached(s) >= 6, `le chapitre du troupeau est terminé : chapitre ${chapterReached(s)}`);
  assertEqual(rows.filter((r) => r.couverture <= 0).length, 0, 'la famille mange tous les soirs');
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

test('Lot 10 : le joueur vend ce qui périt demain, jamais la réserve', () => {
  const s = partie(1);
  s.inventaire = { carotte: [{ qty: 100, nightsLeft: 1, origin: 'produit' }], patate: [{ qty: 10, nightsLeft: 1, origin: 'produit' }] };
  s.famille.reserve = { patate: 6 };
  const piecesAvant = s.pieces;
  botSell(s);
  assertEqual(countItem(s, 'carotte'), 0, 'les carottes qui périraient sont vendues');
  assertEqual(countItem(s, 'patate'), 6, 'la réserve de semences reste');
  assert(s.pieces > piecesAvant, 'la vente rapporte des pièces');
});

test('fiche 7c : le joueur fabrique sa houe (plus de Marché), sans toucher à ses pièces', () => {
  const s = partie(1);
  s.inventaire = {};
  s.pieces = DATA.SIMULATION.CAISSE - 1;
  botBuy(s, 60);
  assertEqual([hasHoe(s), s.pieces], [true, DATA.SIMULATION.CAISSE - 1]);
});

test('version 1.9 : le joueur automatique laboure jusqu\'au plafond, en gardant de l\'énergie', () => {
  const s = partie(1);
  s.potager.houe = true;
  testSetLevel(s, 2);
  botHoe(s);
  assertEqual(soilCount(s), DATA.NIVEAUX.TUILES[1], 'plafond du niveau 2');
  const t = partie(1);
  t.potager.houe = true;
  testSetLevel(t, 3);
  t.energie = actionCost(t, 'recolter') * 3 + actionCost(t, 'labourer') * 2;
  botHoe(t);
  assertEqual(soilCount(t), 8, 'deux labours, puis il garde de quoi récolter');
});

test('Lot 10 : le joueur réserve une part de la Zone de culture au plein champ (blé, tournesol)', () => {
  const S = DATA.SIMULATION;
  assertEqual(S.PART_PLEIN_CHAMP, 40);
  // plus d'étape « champ » : la zone grandit par les étapes « potager »
  assertEqual([...S.PLAN, ...Object.values(S.PRIORITE).flat()].some((e) => e.type === 'champ'), false);
  assertEqual([S.PLAN.some((e) => e.type === 'potager'), S.PLAN.filter((e) => e.type === 'houe').length], [false, 1], 'version 1.9 : la houe à la place des agrandissements');
  // la part ne vaut qu'une fois les cultures de plein champ débloquées (chapitre 3)
  const cible = (chapitre, niveau) => {
    const s = atChapter(chapitre);
    s.pieces = 5000;
    testBatir(s, 'silo'); // version 1.7 : le blé attend le Silo (refusé avant son niveau)
    growZone(s, DATA.POTAGER.PARCELLES_V1[niveau - 1]);
    return botFieldTarget(s);
  };
  assertEqual([cible(2, 2), cible(3, 1), cible(3, 2), cible(3, 3), cible(3, 4), cible(3, 5)], [0, 2, 4, 7, 9, 12]);
  // chapitre 3, zone de 12 parcelles : 4 parcelles de blé, le reste en légumes
  const s = atChapter(3);
  s.pieces = 5000;
  testBatir(reach(s, 'silo'), 'silo');
  growZone(s, 12);
  setInv(s, { ble: 20, patate: 20, graine_carotte: 20, riz: 20, houblon: 20, graine_tournesol: 20 });
  botFarm(s);
  const cultures = (st) => st.potager.parcelles.map((p) => p.culture);
  assertEqual(cultures(s).filter((c) => c === 'ble').length, 4);
  assertEqual(cultures(s).filter((c) => c === 'ble' || c === null).length, 4, 'toutes les autres parcelles sont plantées');
  assertEqual(cultures(s).some((c) => ['riz', 'houblon', 'tournesol'].includes(c)), false, 'ni riz ni houblon, et pas de tournesol avant les chaînes');
  assertEqual(botWheatKept(s), 4, 'il garde de quoi ressemer son blé');
  // chapitre 4, les chaînes de production débloquées (l'huile) : une parcelle de tournesol prise sur la part de plein champ
  const t = atChapter(4);
  t.pieces = 5000;
  testBatir(reach(t, 'silo'), 'silo');
  growZone(t, 12);
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
  const s = partie(1);
  s.pieces = 0;
  s.inventaire.conserve = [{ qty: DATA.SIMULATION.CONSERVES_GARDEES, nightsLeft: null, origin: 'acheté' }];
  botRaiseFunds(s, 30);
  assertEqual(countItem(s, 'conserve'), DATA.SIMULATION.CONSERVES_GARDEES, 'sous le stock gardé, on ne vend pas');
  s.inventaire.conserve = [{ qty: DATA.SIMULATION.CONSERVES_GARDEES + 100, nightsLeft: null, origin: 'acheté' }];
  botRaiseFunds(s, 30);
  assertEqual(s.pieces, 30, 'juste ce qu\'il faut');
  assertEqual(countItem(s, 'conserve'), DATA.SIMULATION.CONSERVES_GARDEES + 100 - 10);
});

test('Lot 10 : à court d\'énergie, le joueur mange un en-cas, jamais la réserve de semences', () => {
  const s = partie(1);
  s.energie = 0;
  setInv(s, { patate: 6 });
  s.famille.reserve = { patate: 6 };
  botSnack(s);
  assertEqual([s.energie, countItem(s, 'patate')], [0, 6], 'la réserve n\'est pas mangée');
  setInv(s, { conserve: 6, carotte: 30 });
  botSnack(s);
  assert(s.energie >= actionCost(s, 'recolter'), `assez pour récolter : ${s.energie}`);
});

test('Lot 10 : plante, arrose et récolte : les premières carottes arrivent', () => {
  const s = partie(1);
  const strat = DATA.SIMULATION.STRATEGIES.applique;
  for (let i = 0; i < 9; i++) botDay(s, strat, {});
  assert(s.campagne.compteurs.recoltes > 0, 'la ferme a produit');
  assert(s.campagne.compteurs.eauMl > 0, 'la pompe a tourné');
});

test('Lot 10 : dépannage : une unité de nourriture achetée chaque soir fait monter son prix', () => {
  const opts = { depannage: { item: 'carotte', dernier: null } };
  const rows = simulateGame('applique', 5, 1, opts);
  assert(rows.every((r) => r.depannage && typeof r.depannage.prix === 'number'), 'le prix de la prochaine unité est relevé chaque nuit');
  const prix = rows.map((r) => r.depannage.prix);
  assert(prix[4] >= prix[0], 'le prix ne baisse pas quand on achète chaque nuit');
});
