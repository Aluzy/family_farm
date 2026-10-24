/* ==========================================================================
   Tests du moteur : fin du repas de 19 h, nuit de 22 h, achats par quantité (1.1.1, 1.1.3) ; nuit qui défile, sommeil, semaine, calendrier lunaire (1.19).
   Lancer seul : node --test tests/engine/nuit.test.mjs (ou node tests/run-tests.mjs nuit).
   ========================================================================== */

import {
  absoluteHours, actionCost, addItem, advanceNight, alertSnapshot, animalBuyMax, animalRoom,
  asleep, awakeMsAtHour, bedtimeDue, boiteCounts, buyAnimals, buyItem, buyPrice, buyQuote,
  canSleep, castLine, chopTree, collectAt, countItem, createInitialState, DATA, dayOfMonth,
  deposit, depositOreNotebook, energyMax, findPlot, fishLeft, formatDay, getNotifications,
  goToSleep, grantTech, growAll, harvest, harvestYield, hitsNeeded, hourOfDay, isBuyable, maxStage,
  midnightMs, MIGRATIONS, mineOre, mineRock, monthIndex, monthName, moonPhase, nightActive,
  nightLengthMs, nightSpeed, piles, plannedAutonomy, plant, recipeTime, sellItem, sheepCount,
  simulateOffline, skipNight, sleep, sleepTarget, startNight, startRecipe, STATE_VERSION,
  strawMissing, strawNeed, testAddHens, testAddSeeds, testAddSheep, testBatir, testFillEnergy,
  testSetEnergyZero, testWoolReady, tick, TIRED, water, waterCostFor, weekdayName,
  weekdayShort, woolReady, yearNumber,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, atelier, AVANT_DEMENAGEMENT, avecLune, boite, farm, garden,
  migreAvant, ml, partie, ranch, reach, runFor, setInv, setStraw, sleepOnce, test,
} from './aide.mjs';

/* ---------- versions 1.1.1 et 1.1.3 : nuit de 22 h, achats par quantité (le repas de 19 h n'est plus) ---------- */

test('fin du repas de 19 h : version 46, la migration retire le repas du jour et ajoute la boîte à nourriture', () => {
  assertEqual(typeof MIGRATIONS[45], 'function');
  const s0 = createInitialState(1);
  assertEqual(['repas' in s0, s0.boite, s0.repasJour], [false, { items: {} }, null]);
  const v16 = JSON.parse(JSON.stringify(createInitialState(4)));
  delete v16.boite;
  delete v16.repasJour;
  v16.version = 16;
  v16.pieces = 321;
  const m = migreAvant({ v: 16, t: 0, s: v16 });
  assertEqual([m.version, 'repas' in m, m.boite, m.repasJour, m.pieces], [AVANT_DEMENAGEMENT, false, { items: {} }, null, 321]);
  assertEqual(migreAvant({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
  const v45 = { ...JSON.parse(JSON.stringify(m)), version: 45, repas: { heure: 19, besoin: 150 } };
  delete v45.boite;
  assertEqual('repas' in migreAvant({ v: 45, t: 0, s: v45 }), false, 'le repas pris d\'une partie en cours disparaît');
});

test('version 1.21 : la journée va de 6 h à 22 h, 30 s par heure (480 s)', () => {
  assertEqual([DATA.TEMPS.HEURE_REVEIL, DATA.TEMPS.HEURE_REPAS, DATA.TEMPS.HEURE_NUIT, DATA.TEMPS.SECONDES_PAR_HEURE], [6, undefined, 22, 30]);
  assertEqual([awakeMsAtHour(6), awakeMsAtHour(7), awakeMsAtHour(19), awakeMsAtHour(22)], [0, 30000, 390000, 480000]);
  assert(DATA.TEMPS.EVEIL_MIN_S * 1000 < awakeMsAtHour(DATA.TEMPS.HEURE_NUIT), 'on peut dormir bien avant 22 h');
});

test('plus de repas à 19 h : la famille mange dans la journée, quand elle a faim', () => {
  const s = boite(garden(), { conserve: 200 });
  s.day = 3; // un mercredi : pas d'école
  s.awakeMs = awakeMsAtHour(19) - 100;
  tick(s, 1);
  assertEqual(boiteCounts(s).conserve, 200, 'à 19 h, personne n\'a faim : rien n\'est mangé');
  affamer(s);
  assertEqual(boiteCounts(s).conserve, 200 - 3 * 14, 'au seuil, chacun mange jusqu\'à rassasié');
  assertEqual(JSON.parse(JSON.stringify(s)).repasJour, s.repasJour, 'ce qui est mangé dans la journée se sauvegarde');
});

test('la nuit recopie ce que la famille a mangé dans la journée, sans la faire remanger', () => {
  const s = boite(garden(), { conserve: 200 });
  s.day = 3;
  affamer(s);
  const apres = boiteCounts(s).conserve;
  const r = sleepOnce(s);
  assertEqual(boiteCounts(s).conserve, apres, 'la nuit ne remange pas');
  assertEqual([r.energieMangee, r.couverture, r.mange], [3 * 84, 100, { conserve: 42 }]);
  assertEqual([s.repasJour, s.awakeMs], [null, 0], 'au réveil, une nouvelle journée');
});

test('version 1.21 : 22 h (480 s d\'éveil) rend la nuit due ; l\'aperçu d\'autonomie suit ce qui est mangé', () => {
  const s = garden();
  setInv(s, { conserve: 200 });
  s.awakeMs = 479900;
  assertEqual([bedtimeDue(s), hourOfDay(s)], [false, 21]);
  s.awakeMs = 480000;
  assertEqual([bedtimeDue(s), hourOfDay(s), canSleep(s)], [true, 22, true]);
  affamer(s);
  assertEqual(plannedAutonomy(s), 0, 'des conserves : rien de la ferme');
  const rep = sleep(s);
  assertEqual([s.day, s.awakeMs, bedtimeDue(s), rep.nuit, rep.autonomie], [2, 0, false, 2, 0]);
});

test('version 1.1.1 : horloge arrêtée (résumé du réveil ouvert), les flux tournent mais l\'heure n\'avance pas', () => {
  const s = farm({ pump: true }); // 7 h : au soleil
  const eau = s.eauMl;
  const avant = s.awakeMs;
  tick(s, 5, true);
  assertEqual(s.awakeMs, avant);
  assert(s.eauMl !== eau || s.jour.produite > 0, 'la ferme continue de produire');
  tick(s, 5);
  assertEqual(s.awakeMs, avant + 5000);
});

test('version 1.1.1 : hors-ligne, l\'horloge s\'arrête à l\'éveil minimal (pas de nuit pendant l\'absence)', () => {
  const s = farm({ pump: true });
  simulateOffline(s, 3600);
  assertEqual([s.awakeMs, canSleep(s), bedtimeDue(s), s.day], [30000, true, false, 1]);
  // parti à 20 h : l'horloge ne recule pas et n'avance pas
  const t = farm({ pump: true });
  setInv(t, { conserve: 200 });
  t.awakeMs = awakeMsAtHour(20);
  simulateOffline(t, 3600);
  assertEqual([t.awakeMs, hourOfDay(t), bedtimeDue(t), t.day], [awakeMsAtHour(20), 20, false, 1]);
});

test('version 1.21 : le lac de la montagne, l\'omble chevalier', () => {
  assertEqual(DATA.OBJETS.omble.nom, 'Omble chevalier');
  assertEqual(DATA.CANNE.PRISES.lac, { omble: 40, truite: 25 });
  const s = garden();
  s.outils = { hache: false, pioche: false, canne: true, choisi: 'canne' };
  assertEqual(fishLeft(s, 'lac'), DATA.CANNE.JOUR.lac);
  const prises = new Set();
  for (let i = 0; i < 60 && fishLeft(s, 'lac') > 0; i++) {
    testFillEnergy(s);
    const r = castLine(s, 'lac');
    assert(r.ok, r.error);
    if (r.poisson) prises.add(r.poisson);
  }
  assertEqual(fishLeft(s, 'lac'), 0, 'quatre prises au plus par jour');
  assert([...prises].every((p) => p === 'omble' || p === 'truite'), 'omble ou truite');
  assert(countItem(s, 'omble') + countItem(s, 'truite') === DATA.CANNE.JOUR.lac);
  assertEqual(castLine(s, 'lac').error, 'Le poisson se fait rare dans le lac aujourd\'hui : reviens demain.');
});

test('version 1.21 : la mer de la plage, dorade, sardine, anchois', () => {
  assertEqual(['dorade', 'anchois', 'sardine'].map((i) => DATA.OBJETS[i].nom), ['Dorade', 'Anchois', 'Sardine']);
  const s = garden();
  s.outils = { hache: false, pioche: false, canne: true, choisi: 'canne' };
  assertEqual(fishLeft(s, 'mer'), DATA.CANNE.JOUR.mer);
  const prises = new Set();
  for (let i = 0; i < 80 && fishLeft(s, 'mer') > 0; i++) {
    testFillEnergy(s);
    const r = castLine(s, 'mer');
    assert(r.ok, r.error);
    if (r.poisson) prises.add(r.poisson);
  }
  assertEqual(fishLeft(s, 'mer'), 0);
  assert([...prises].every((p) => ['dorade', 'sardine', 'anchois'].includes(p)), 'des poissons de mer');
  assertEqual(castLine(s, 'mer').error, 'Le poisson se fait rare en mer aujourd\'hui : reviens demain.');
});

test('minerais et lingots : la grotte remplit l\'inventaire, le Four fond 4 minerais et du bois en 1 lingot', () => {
  for (const m of ['fer', 'cuivre', 'or', 'platine']) {
    const [mi, li] = [DATA.OBJETS['minerai_' + m], DATA.OBJETS['lingot_' + m]];
    assertEqual([mi.categorie, li.categorie, mi.invendable, li.invendable, isBuyable('lingot_' + m)], ['matériau', 'matériau', true, true, false], m);
    assertEqual(DATA.RECETTES['lingot_' + m].ingredients[0], { item: 'minerai_' + m, qte: 4 });
  }
  const s = atelier();
  assertEqual(mineOre(s, 'fer').error, `Il te faut une pioche (Marché, ${DATA.PIOCHE.PRIX} 💰).`);
  s.outils = { hache: false, pioche: true, choisi: 'pioche' };
  const e = s.energie;
  const r = mineOre(s, 'fer');
  assertEqual([r.ok, r.item, r.n, countItem(s, 'minerai_fer'), s.energie], [true, 'minerai_fer', 1, 1, e - actionCost(s, 'piocher')]);
  assertEqual(mineOre(s, 'diamant').error, 'Minerai inconnu.');
  // le carnet d'avant : versé dans l'inventaire
  depositOreNotebook(s, { fer: 3, or: 2, pierre: 9 });
  assertEqual([countItem(s, 'minerai_fer'), countItem(s, 'minerai_or'), countItem(s, 'pierre')], [4, 2, 0]);
  // au Four : 4 minerais de fer + 3 bois
  assertEqual(startRecipe(s, 'lingot_fer').ok, false, 'pas de bois');
  addItem(s, 'bois', 3);
  assert(startRecipe(s, 'lingot_fer').ok);
  assertEqual([countItem(s, 'minerai_fer'), countItem(s, 'bois')], [0, 0]);
  runFor(s, recipeTime(s, 'lingot_fer') + 1);
  assertEqual(countItem(s, 'lingot_fer'), 1);
  // invendables au Marché
  s.pompe.allume = true;
  assert(/ne se vend pas/.test(sellItem(s, 'lingot_fer', 1).error));
});

test('branche Outils : coups en moins, ressources en plus, énergie, minerai, pêche', () => {
  const s = garden();
  s.outils = { hache: true, pioche: true, canne: true, choisi: 'hache' };
  // Lames affûtées : 2 coups au lieu de 3
  grantTech(s, 'out_lames');
  assertEqual(hitsNeeded(s, DATA.HACHE.COUPES), DATA.HACHE.COUPES - 1);
  chopTree(s, '14,25');
  assertEqual(chopTree(s, '14,25').tombe, true, 'il tombe au 2e coup');
  mineRock(s, 'x');
  assertEqual(mineRock(s, 'x').casse, true);
  // Hotte de bûcheron : parfois un bois de plus
  grantTech(s, 'out_hotte');
  let bois = 0;
  for (let i = 0; i < 60; i++) { testFillEnergy(s); bois += chopTree(s, 'a' + i).bois; }
  assert(bois > 60 && bois < 120, `de temps en temps un bois de plus (${bois} pour 60 coups)`);
  // Socs en fer, puis Outils en platine : l'énergie de la houe, de la hache…
  const base = actionCost(s, 'labourer'), hache = actionCost(s, 'couper');
  grantTech(s, 'out_socs');
  assertEqual(actionCost(s, 'labourer'), Math.ceil(base / 2));
  grantTech(s, 'out_platine');
  assertEqual([actionCost(s, 'labourer'), actionCost(s, 'couper')], [Math.ceil(base / 4), Math.ceil(hache / 2)]);
  // Moulinet en laiton : 2 prises de plus par jour
  grantTech(s, 'out_moulinet');
  assertEqual(fishLeft(s, 'lac'), DATA.CANNE.JOUR.lac + 2);
  // Lampe de mineur : parfois 2 minerais
  grantTech(s, 'out_lampe');
  let n = 0;
  for (let i = 0; i < 60; i++) { testFillEnergy(s); n += mineOre(s, 'cuivre').n; }
  assert(n > 60 && n < 100, `un minerai de plus de temps en temps (${n} pour 60)`);
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
  assert(testBatir(reach(s, 'paturage'), 'etable').ok, 'préparer l\'Étable');
  s.pieces = 130;
  assertEqual(animalBuyMax(s, 'mouton'), 2, '130 pièces = 2 moutons à 60');
  const m = buyAnimals(s, 'mouton', 9);
  assertEqual([m.bought, m.cost, sheepCount(s), s.pieces], [2, 120, 2, 10]);
  assertEqual([animalBuyMax(s, 'chat'), buyAnimals(s, 'chat', 2).ok], [0, false]);
});

test('version 1.1.1 : sans mouton ni vache, jamais d\'alerte de paille', () => {
  const s = ranch();
  s.pieces = 5000;
  assert(testBatir(reach(s, 'paturage'), 'etable').ok, 'préparer l\'Étable');
  setStraw(s, 0);
  assertEqual([strawNeed(s), strawMissing(s), alertSnapshot(s).pailleManque], [0, 0, false]);
  assertEqual(getNotifications(s).filter((n) => n.type === 'paille'), []);
  sleepOnce(s);
  assertEqual([s.report.pailleBesoin, s.report.etable.manque, alertSnapshot(s).pailleManque], [0, 0, false]);
  testAddHens(s, 4);
  assertEqual(getNotifications(s).filter((n) => n.type === 'paille'), [], 'les poules ne mangent pas de paille');
});

test('Nuit qui défile (version 1.19) : 22 h → minuit (la nuit se calcule) → 6 h (réveil)', () => {
  const s = createInitialState(1);
  const H = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  s.awakeMs = awakeMsAtHour(21);
  assertEqual(startNight(s), false, 'pas avant 22 h');
  s.awakeMs = awakeMsAtHour(22);
  assertEqual(startNight(s), true);
  assertEqual([nightActive(s), hourOfDay(s), s.day], [true, 22, 1]);
  const eau = s.eauMl;
  tick(s, 1);
  assertEqual([s.nuitEnCours.ms, s.eauMl, s.awakeMs], [1000, eau, awakeMsAtHour(22)], 'la nuit, seule l\'heure avance');
  tick(s, 1, true);
  assertEqual(s.nuitEnCours.ms, 1000, 'horloge arrêtée : la nuit attend');
  assertEqual(advanceNight(s, H), null, '23 h');
  assertEqual([hourOfDay(s), s.day], [23, 1]);
  assertEqual(advanceNight(s, H), 'minuit');
  assertEqual([hourOfDay(s), s.day, s.awakeMs, s.nuitEnCours.minuit, !!s.report], [0, 2, 0, true, true], 'minuit : la nuit est calculée, jour suivant');
  assertEqual(advanceNight(s, 5 * H), null, '5 h');
  assertEqual(hourOfDay(s), 5);
  assertEqual(advanceNight(s, 2 * H), 'reveil');
  assertEqual([nightActive(s), s.reveil, hourOfDay(s), s.day], [false, true, 6, 2], 'réveil à 6 h, une seule nuit');
  assertEqual([midnightMs(), nightLengthMs()], [2 * H, 8 * H]);
});

test('Nuit qui défile (version 1.19) : le bouton nuit saute ce qui reste, minuit compris ; une absence la termine', () => {
  const s = createInitialState(1);
  s.awakeMs = awakeMsAtHour(22);
  assertEqual(skipNight(s), null, 'pas de nuit en cours');
  startNight(s);
  advanceNight(s, 1000);
  const r = skipNight(s);
  assertEqual([!!r, s.day, nightActive(s), s.reveil, hourOfDay(s)], [true, 2, false, true, 6]);
  const t = createInitialState(1);
  t.awakeMs = awakeMsAtHour(22);
  startNight(t);
  simulateOffline(t, 3600);
  assertEqual([t.day, nightActive(t), t.reveil], [2, false, true], 'parti la nuit : réveillé au retour');
});

test('Pousse calée sur l\'horloge : une plante arrosée à 10 h gagne son stade le lendemain à 10 h, de jour comme de nuit', () => {
  const s = garden();
  testAddSeeds(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  s.awakeMs = awakeMsAtHour(10);
  assert(water(s, 'potager-1').ok);
  const p = findPlot(s, 'potager-1');
  assertEqual([p.arroseH, absoluteHours(s)], [10, 10], 'heure absolue de l\'arrosage');
  assertEqual(water(s, 'potager-1').error, 'Déjà arrosée : elle pousse.');
  const HS = DATA.TEMPS.SECONDES_PAR_HEURE;
  tick(s, (22 - 10) * HS);
  assertEqual([p.stade, p.arrose], [0, true], 'à 22 h, rien encore');
  startNight(s);
  advanceNight(s, nightLengthMs());
  assertEqual([s.day, hourOfDay(s), p.stade, p.arrose], [2, 6, 0, true], 'minuit ne fait plus pousser');
  s.reveil = false;
  tick(s, 3.9 * HS);
  assertEqual([p.stade, p.arrose], [0, true], '9 h 54 : pas encore');
  tick(s, 0.2 * HS);
  assertEqual([p.stade, p.arrose, 'arroseH' in p], [1, false, false], '10 h : un stade, et elle redemande de l\'eau');
});

test('Énergie : elle remonte peu à peu en dormant (8 h pour le réveil), rien en restant éveillé la nuit', () => {
  const s = garden();
  s.awakeMs = awakeMsAtHour(22);
  testSetEnergyZero(s);
  startNight(s);
  const cible = sleepTarget(s);
  assert(cible > 0, 'le réveil vise une énergie');
  const H = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  advanceNight(s, 2 * H);
  assertEqual(s.energie, 0, 'éveillé : rien ne revient');
  goToSleep(s);
  advanceNight(s, 4 * H);
  assertEqual(Math.abs(s.energie - cible / 2) <= 1, true, '4 h de sommeil : la moitié');
  advanceNight(s, 2 * H);
  assertEqual(nightActive(s), false);
  assertEqual(Math.abs(s.energie - (cible * 6) / 8) <= 2, true, '6 h dormies sur 8 : les trois quarts');
  assertEqual(s.report.energieReveil, s.energie, 'le résumé du réveil donne l\'énergie de 6 h');
  const t = garden();
  t.awakeMs = awakeMsAtHour(22);
  t.energie = energyMax();
  startNight(t);
  goToSleep(t);
  advanceNight(t, nightLengthMs());
  assertEqual(t.energie, energyMax(), 'une énergie plus haute est gardée');
});

test('Dormir : on ne dort que la nuit ; couché, la nuit défile en accéléré (4 s par heure) jusqu\'au réveil', () => {
  const s = partie();
  s.awakeMs = awakeMsAtHour(15);
  assertEqual([goToSleep(s).ok, asleep(s), nightSpeed(s)], [false, false, 1], 'le jour, on ne dort pas');
  s.awakeMs = awakeMsAtHour(22);
  startNight(s);
  tick(s, 4);
  assertEqual(hourOfDay(s), 22, 'éveillé : 4 s de nuit ne font pas une heure');
  assertEqual([goToSleep(s).ok, asleep(s)], [true, true]);
  tick(s, 4);
  assertEqual(hourOfDay(s), 23, 'endormi : une heure toutes les 4 s');
  for (let i = 0; i < 7 * 4 * 10; i++) tick(s, 0.1);
  assertEqual([nightActive(s), asleep(s), s.reveil, s.day, hourOfDay(s)], [false, false, true, 2, 6], 'réveil à 6 h, le sommeil fini');
});

test('Ramassage (version 1.19) : à l\'Étable, le personnage tond les moutons prêts puis prend lait et laine ; au Poulailler, les œufs', () => {
  const s = reach(createInitialState(1), 'paturage');
  assert(testBatir(s, 'etable').ok);
  s.ramassage = true;
  testAddSheep(s, 2);
  testWoolReady(s);
  const M = DATA.ANIMAUX.mouton;
  deposit(s, 'etable', null, { [DATA.ANIMAUX.vache.lait]: 2 });
  const laine = countItem(s, M.laine);
  const r = collectAt(s, 'etable');
  assertEqual([r.ok, r.fatigue, r.items[M.laine], r.items[DATA.ANIMAUX.vache.lait]], [true, false, 2 * M.laineParTonte, 2]);
  assertEqual([countItem(s, M.laine), woolReady(s.paturage.moutons[0]), piles(s).length], [laine + 2 * M.laineParTonte, false, 0]);
  assertEqual(collectAt(s, 'etable').ok, false, 'plus rien');
  testWoolReady(s);
  testSetEnergyZero(s);
  assertEqual(collectAt(s, 'etable').error, TIRED, 'pas d\'énergie pour tondre');
  deposit(s, 'poulailler', null, { [DATA.ANIMAUX.poule.produit]: 3 });
  assertEqual(collectAt(s, 'poulailler').items[DATA.ANIMAUX.poule.produit], 3);
});

test('Jours de la semaine : le jour 1 est un lundi, la semaine tourne', () => {
  assertEqual([1, 2, 6, 7, 8, 14, 15].map((d) => weekdayName(d)), ['lundi', 'mardi', 'samedi', 'dimanche', 'lundi', 'dimanche', 'lundi']);
  assertEqual([weekdayName(3, true), weekdayShort(1), weekdayShort(7), weekdayName(0)], ['Mercredi', 'Lun.', 'Dim.', 'lundi']);
});

test('Calendrier lunaire : 12 mois de 14 jours, le jour 1 est le 1er Solaria de l\'an 1', () => {
  const L = DATA.LUNE;
  assertEqual([L.MOIS.length, L.PHASES.reduce((t, p) => t + p.jours, 0)], [12, L.JOURS_MOIS]);
  assertEqual([1, 14, 15, 28, 29, 168, 169].map(dayOfMonth), [1, 14, 1, 14, 1, 14, 1]);
  assertEqual([1, 14, 15, 29, 168, 169].map(monthName), ['Solaria', 'Solaria', 'Florea', 'Halima', 'Silentia', 'Solaria']);
  assertEqual([monthIndex(168), yearNumber(1), yearNumber(168), yearNumber(169)], [11, 1, 1, 2]);
  assertEqual([formatDay(1), formatDay(16), formatDay(169), formatDay(undefined)], ['Lundi 1 Solaria', 'Mardi 2 Florea', 'Lundi 1 Solaria, an 2', 'Lundi 1 Solaria']);
  // le mois commence au premier croissant : 5 jours croissante, 2 pleine, 5 décroissante, 2 nouvelle
  const phases = [];
  for (let d = 1; d <= 15; d++) phases.push(moonPhase(d).id[0]);
  assertEqual(phases.join(''), 'cccccppddddd' + 'nn' + 'c');
});

test('Lune : pleine, récoltes +50 % ; décroissante, arrosage −25 % ; nouvelle, rien ne pousse ; croissante, parfois 2 stades', () => avecLune(() => {
  const serre = (day) => {
    const s = garden();
    s.pieces = 5000;
    testBatir(reach(s, 'serre'), 'serre');
    s.day = day;
    plant(s, 'serre-1', 'tomate');
    return s;
  };
  // pleine lune (jours 6 et 7) : 10 tomates → 15
  let s = serre(6);
  findPlot(s, 'serre-1').stade = maxStage(findPlot(s, 'serre-1'));
  assertEqual([harvestYield(s, 'tomate'), harvest(s, 'serre-1').items.tomate], [15, 15]);
  s = serre(5);
  assertEqual(harvestYield(s, 'tomate'), 10, 'la veille, rendement de base');
  // lune décroissante (jours 8 à 12) : 3 L → 2 L
  s = serre(8);
  let before = s.eauMl;
  assert(water(s, 'serre-1').ok);
  assertEqual([waterCostFor(s, 'tomate'), before - s.eauMl], [2, ml(2)]);
  // nouvelle lune (jours 13 et 14) : arrosée, elle ne pousse pas
  s = serre(13);
  water(s, 'serre-1');
  growAll(s);
  assertEqual([findPlot(s, 'serre-1').stade, findPlot(s, 'serre-1').arrose], [0, false]);
  // lune croissante (jours 1 à 5) : à 100 % de chances, 2 stades ; à 0 %, un seul
  const chance = DATA.LUNE.POUSSE_CHANCE;
  try {
    DATA.LUNE.POUSSE_CHANCE = 100;
    s = serre(1);
    water(s, 'serre-1');
    growAll(s);
    assertEqual(findPlot(s, 'serre-1').stade, 2);
    DATA.LUNE.POUSSE_CHANCE = 0;
    s = serre(1);
    water(s, 'serre-1');
    growAll(s);
    assertEqual(findPlot(s, 'serre-1').stade, 1);
  } finally {
    DATA.LUNE.POUSSE_CHANCE = chance;
  }
}));
