/* ==========================================================================
   Tests du moteur : Lot 10 : simulation d'un joueur automatique.
   Lancer seul : node --test tests/engine/bot.test.mjs (ou node tests/run-tests.mjs bot).
   ========================================================================== */

import {
  actionCost, atelierConstruit, botBuy, botDay, botFabriquer, commencerObjectifs, createNewGame, materiauxFournis,
  posteSimulation, botFarm, botFieldTarget, botHoe, botIsFieldCrop, botMill, botRecipeValue, botScythe, botSheep,
  botSnack, botStepInfo, botWheatKept, countItem, cutGrass, DATA, hasHoe, hasTool, millPending, openStation,
  sheepCount, simulateFromCopy, simulateGame, simulatePlay, soilCount, testBatir, testFillBatteries, testSetLevel,
  testWoolReady,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, atChapter, fillCows, fillSheep, growZone, partie, pature, reach, setInv, test,
} from './aide.mjs';

/* --- Lot 10 : simulation d'un joueur automatique --- */

// Partie simulée sur `nights` nuits, avec un jeu de DATA légèrement modifié
// si `tweak` est donné (restauré ensuite).
function simRows(strategy, nights, seed = 1) {
  return simulateGame(strategy, nights, seed);
}

test('Lot 10 : DATA.SIMULATION est cohérent (stratégies, plan)', () => {
  const S = DATA.SIMULATION;
  assertEqual(Object.keys(S.STRATEGIES).sort(), ['applique', 'minimal']);
  assertEqual([S.STRATEGIES.applique.eveilS, S.STRATEGIES.minimal.eveilS], [60, 30]);
  assert(S.STRATEGIES.minimal.eveilS >= DATA.TEMPS.EVEIL_MIN_S, 'le joueur minimal reste éveillé au moins l\'éveil minimal');
  assertEqual([S.JALONS, S.TOLERANCE_NUITS], [undefined, undefined], 'plus de jalons d\'autonomie');
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
    assert(r.bonheur >= 0 && r.bonheur <= 100 && !('autonomie' in r), 'bonheur entre 0 et 100, plus d\'autonomie');
    assert(r.energie >= 0 && r.energie <= r.energieMax, 'énergie du personnage entre 0 et son maximum (qui grandit avec les niveaux)');
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

/* --- I0b : le joueur automatique remis d'aplomb (la partie d'aujourd'hui) --- */

test('I0b : une recette de l\'Atelier : la planche se fabrique, les bruts qui manquent sont fournis et comptés', () => {
  const s = createNewGame(1, { nom: 'Simulation' });
  commencerObjectifs(s);
  s.inventaire = {};
  assert(botFabriquer(s, 'boite_nourriture'), 'la boîte est fabriquée');
  const A = DATA.ATELIER;
  assertEqual([countItem(s, 'boite_nourriture'), countItem(s, 'planche'), atelierConstruit(s)], [1, 0, true]);
  assertEqual(materiauxFournis(s), { bois: A.CONSTRUCTION.bois + A.RECETTES.boite_nourriture.entrees.planche * A.RECETTES.planche.entrees.bois, pierre: A.CONSTRUCTION.pierre });
  assertEqual(botFabriquer(s, 'nid_poule'), false, 'le blé d\'un nid ne se fournit pas');
});

test('I0b : les comptes de la simulation, par nuit et par poste, tombent juste', () => {
  const s = createNewGame(1, { nom: 'Simulation' });
  commencerObjectifs(s);
  const avant = s.pieces;
  const rows = simulatePlay(s, 'applique', 12);
  const somme = (o) => Object.values(o).reduce((t, v) => t + v, 0);
  assertEqual(rows.reduce((t, r) => t + somme(r.gains) - somme(r.depenses), 0), s.pieces - avant, 'gains − dépenses = pièces gagnées');
  assert(rows.some((r) => r.gains.vente_cultures > 0) && rows.some((r) => r.depenses.graines > 0), 'des ventes de cultures, des graines achetées');
  assertEqual(
    ['Vente : Carotte', 'Vente : Pain', 'Vente : Œuf', 'Achat : Graines de carotte', 'Achat : Blé', 'Technologie : x', 'Amélioration : Pompe', 'Poulailler agrandi', 'Calèche : Miel'].map(posteSimulation),
    ['vente_cultures', 'vente_plats', 'vente_produits', 'graines', 'graines', 'technologies', 'appareils', 'batiments', 'achats_hameaux'],
  );
});
