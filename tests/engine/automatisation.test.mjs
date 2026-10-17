/* ==========================================================================
   Tests du moteur : Lot 7 : automatisations du niveau 5, robot, arbre des technologies.
   Lancer seul : node --test tests/engine/automatisation.test.mjs (ou node tests/run-tests.mjs automatisation).
   ========================================================================== */

import {
  absoluteHours, addItem, AUTO_TACHES, awakeMsAtHour, awakeRequired, buildSerre, buyTech, canSleep,
  checkMastery, completeChapter, coopCapacity, countItem, createInitialState, DATA, findPlot,
  grantTech, inventoryCounts, irrigate, isAutomated, isUnlocked, makePlot, maxStage, migrate,
  migrateCropZone, migrateToIntegers, newAutoReport, newNightStats, plant, plantableCropsFor,
  prepTimeMult, recipeTime, recordNight, robotBattery, robotCapacity, robotChargePct, robotNight,
  robotStep, robotTaskCapacity, robotTrip, runRobotCharge, sellItem, setSeedReserve, setSemis,
  siloCapacity, sleep, spend, startFarm, startHousehold, startLot4, startLot5, startLot6,
  startRecipe, STATE_VERSION, takeItem, techPoints, techPrereqs, techProgress, techStatus,
  testAddHens, testAddPieces, testAddWheat, testEmptyBatteries, testFillBatteries,
  testSetBuildingLevel5, testUnlockAllTechs, tick, upgradeRobotBattery, water, wheatTotal,
  zoneTile,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, atelier, auto5, chapter1StepsDone, farm, garden, growZone, matin, ml,
  plantRipe, plotContent, ranch, reach, runFor, setInv, sleepOnce, test, testBase, v14State,
} from './aide.mjs';

// Toute la journée du robot (de 6 h à 20 h) : il fait toute sa liste. Renvoie s.robot
// (recoltes, semees, sansGraine).
function robotJour(s) {
  s.awakeMs = awakeMsAtHour(DATA.ROBOT.HEURE);
  s.robot = null;
  robotStep(s);
  s.awakeMs = awakeMsAtHour(20);
  robotStep(s);
  return s.robot;
}

/* ---------- Lot 7 : automatisations du niveau 5, arbre des technologies ---------- */

// Arbre v2 : état de test où tous les paliers sont ouverts et les PT abondants.
function techReady(s, pt = 99) {
  s.campagne.chapitre = 7;
  techPoints(s).solde = pt;
  return s;
}

test('DATA arbre v2 : 37 nœuds, 7 branches, paliers, points, ressources et prérequis cohérents', () => {
  assertEqual(DATA.AUTOMATISATION, undefined, 'plus d\'automatisation par le niveau 5');
  assertEqual(DATA.TECHNO, { ONGLET: 'techno', SEUIL_PIECES: 100 });
  const T = DATA.ARBRE;
  const N = T.noeuds;
  assertEqual(Object.keys(N).length, 37); // 34 avant la version 1.1 (la Rôtisserie a disparu avec la viande), 33 puis 34 avec la Récolte du verger (1.13), 31 sans Réveil matinal I et II ni Routine familiale (1.19), 37 avec la branche Outils
  assertEqual(T.branches.map((b) => b.nom), ['Énergie', 'Eau', 'Culture', 'Élevage', 'Cuisine', 'Famille', 'Outils']);
  assertEqual(Object.keys(T.PALIERS).map((p) => T.PALIERS[p].chapitre), [1, 3, 4, 5, 7]);
  assertEqual(T.POINTS.CHAPITRES, [2, 3, 3, 4, 4, 5, 5]);
  assertEqual(T.POINTS.MAITRISE.length, 6);
  // les anciens identifiants restent, pour les sauvegardes
  for (const id of ['semis_auto', 'prepa_1', 'prepa_2']) assert(N[id], id);
  assertEqual([N.prepa_1.effet.tempsPrepa, N.prepa_2.effet.tempsPrepa], [80, 80]);
  let pt = 0;
  for (const [id, n] of Object.entries(N)) {
    assert(T.branches.some((b) => b.id === n.branche), `branche de ${id}`);
    assert(Number.isInteger(n.pt) && n.pt > 0 && Number.isInteger(n.prix), `coûts entiers : ${id}`);
    pt += n.pt;
    // chaque nœud coûte aussi des ressources : bois et pierre aux premiers paliers, des lingots ensuite
    assert(Object.keys(n.ressources || {}).length > 0, `${id} : des ressources`);
    if (n.palier >= 3 && id !== 'el_paturage') assert(Object.keys(n.ressources).some((k) => k.startsWith('lingot_')), `${id} : des lingots dès le palier 3 (sauf l'Étable agrandie : du bois et de la pierre)`);
    if (n.palier <= 1) assert(Object.keys(n.ressources).every((k) => k === 'bois' || k === 'pierre'), `${id} : bois et pierre au palier 1`);
    for (const r of n.requiert) {
      if (r.noeud) {
        assert(N[r.noeud], `${id} : ${r.noeud} existe`);
        assert(N[r.noeud].palier <= n.palier, `${id} : prérequis d'un palier inférieur ou égal`);
      }
      if (r.batiment || r.construit || r.appareil) assert(T.batiments[r.batiment || r.construit || r.appareil], `${id} : bâtiment connu`);
    }
  }
  assertEqual(pt, 54, '54 PT pour tout l\'arbre (47 avant la branche Outils ; 50 avant la Récolte du verger, version 1.13 ; 52 avant le retrait de Réveil matinal I et II et de la Routine familiale, version 1.19)');
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
  assertEqual([r.auto.potager, r.auto.arrosees, s.potager.parcelles[0].arrose], [true, 0, false], 'la nuit, les asperseurs n\'arrosent pas');
  const m = matin(s);
  assertEqual(s.potager.parcelles.slice(0, 3).map((p) => p.arrose), [true, true, true], 'avec le nœud : arrosées à 7 h');
  assertEqual(s.eauMl, ml(34), '3 parcelles × 2 L');
  assertEqual([m.arrosees, m.sansEau, s.irrigation.jour, s.irrigation.cases.length], [3, 0, s.day, 3]);
  assertEqual(irrigate(s), null, 'une fois par jour');
  sleepOnce(s);
  matin(s);
  assertEqual(s.potager.parcelles.slice(0, 3).map((p) => p.stade), [1, 1, 1], 'elles poussent 24 h après (le lendemain à 7 h), puis sont réarrosées');
  assertEqual(s.potager.parcelles.slice(0, 3).map((p) => p.arrose), [true, true, true]);
});

test('arrosage automatique : une parcelle déjà arrosée à la main n\'est pas arrosée deux fois, une parcelle mûre n\'est pas arrosée', () => {
  const s = auto5('potager');
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  assert(water(s, 'potager-1').ok);
  const eau = s.eauMl;
  s.awakeMs = awakeMsAtHour(6.5);
  assertEqual(irrigate(s), null, 'avant 7 h : rien');
  s.awakeMs = awakeMsAtHour(DATA.TEMPS.ARROSAGE_HEURE);
  const rap = irrigate(s);
  assertEqual(rap.arrosees, 1);
  assertEqual(s.eauMl, eau - ml(2));
});

test('arrosage automatique : les asperseurs repassent dans la journée pour une plante qui a soif à son tour', () => {
  const s = auto5('potager');
  plant(s, 'potager-1', 'carotte');
  s.awakeMs = awakeMsAtHour(DATA.TEMPS.ARROSAGE_HEURE);
  assertEqual(irrigate(s).arrosees, 1);
  plant(s, 'potager-2', 'carotte'); // semée après 7 h (le robot, ou à la main)
  assertEqual(irrigate(s), null, 'pas avant que les asperseurs aient fini de tourner');
  s.awakeMs = awakeMsAtHour(9);
  const r = irrigate(s);
  assertEqual([r.arrosees, s.potager.parcelles[1].arrose], [1, true], 'repassage : elle est arrosée');
  assertEqual([s.irrigation.cases.length, s.irrigation.faites.length, s.irrigation.arrosees], [1, 2, 2]);
  s.awakeMs = awakeMsAtHour(12);
  assertEqual(irrigate(s), null, 'plus personne n\'a soif : pas de passage');
});

testBase('récolte automatique : parcelles mûres seulement, carottes et graines à la clé', () => {
  const s = auto5('potager');
  plantRipe(s, 'potager-1', 'carotte');
  plant(s, 'potager-3', 'carotte');
  findPlot(s, 'potager-3').stade = 2;
  const graines = countItem(s, 'graine_carotte');
  sleepOnce(s);
  assertEqual(findPlot(s, 'potager-1').culture, 'carotte', 'la nuit, rien ne se récolte');
  matin(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'mûre : récoltée par le robot (à 6 h), parcelle libérée');
  assertEqual(countItem(s, 'carotte'), 6);
  assertEqual(s.robot.recoltes.carotte, 6);
  const g = s.robot.recoltes.graine_carotte;
  assert(g === 1 || g === 2, `1 ou 2 graines, obtenu ${g}`);
  assertEqual(countItem(s, 'graine_carotte'), graines + g);
  matin(s);
  assertEqual([findPlot(s, 'potager-3').stade, findPlot(s, 'potager-3').arrose], [2, true], 'pas mûre : arrosée à 7 h, elle poussera au bout de 24 h');
  const t = auto5();
  plantRipe(t, 'potager-1', 'carotte');
  sleepOnce(t);
  matin(t);
  assertEqual([findPlot(t, 'potager-1').culture, t.robot], ['carotte', undefined], 'Zone de culture niveau 1 : pas de robot, rien ne se récolte seul');
});

test('automatisations : elles couvrent toute la Zone de culture, plein champ compris (le blé va au Silo)', () => {
  // les nœuds ne citent plus que la zone ('potager') et la Serre : plus de lieu « champ »
  const N = DATA.ARBRE.noeuds;
  assertEqual([N.ea_irrigation.effet.auto, N.cu_recolte_auto.effet.auto, N.semis_auto.effet.auto],
    [{ arrosage: ['potager'] }, { recolte: ['potager'] }, { semis: ['potager'] }]);
  assertEqual(Object.keys(AUTO_TACHES), ['potager', 'serre', 'poulailler', 'paturage', 'verger']);
  assertEqual(newAutoReport(), { potager: false, serre: false, poulailler: false, arrosees: 0, sansEau: 0, recoltes: {}, semees: 0, sansGraine: 0, nourries: 0, sansBle: 0, tondus: 0 });
  const s = auto5('potager');
  testAddWheat(s, 10);
  addItem(s, 'graine_carotte', 1);
  plantRipe(s, 'potager-1', 'ble');
  plant(s, 'potager-2', 'ble');
  plant(s, 'potager-30', 'carotte'); // la dernière parcelle de la zone, à côté du blé
  const silo = s.silo.ble;
  const eau = s.eauMl;
  const r = sleepOnce(s);
  const m = matin(s);
  assertEqual(findPlot(s, 'potager-1').culture, null);
  assertEqual(s.silo.ble, silo + 8, '8 blés, comme au clic');
  assertEqual([findPlot(s, 'potager-2').arrose, findPlot(s, 'potager-30').arrose], [true, true]);
  assertEqual(s.eauMl, eau - ml(2 + 2));
  assertEqual([r.auto.potager, m.arrosees, s.robot.recoltes.ble], [true, 2, 8]);
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
  // dans autoTasks()) : 10 riz, 6 houblons.
  const s = auto5('potager');
  addItem(s, 'riz', 2);
  addItem(s, 'houblon', 1);
  plantRipe(s, 'potager-1', 'riz');
  plantRipe(s, 'potager-2', 'houblon');
  plant(s, 'potager-3', 'riz');
  sleepOnce(s);
  matin(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'riz mûr : récolté automatiquement');
  assertEqual(findPlot(s, 'potager-2').culture, null, 'houblon mûr : récolté automatiquement');
  assertEqual(s.robot.recoltes, { riz: 10, houblon: 6 });
  assertEqual(findPlot(s, 'potager-3').arrose, true, 'riz pas mûr : arrosé à 7 h (4 L, comme au clic), il poussera au bout de 24 h');

  // Oignon, ail, poivron, épinard, fraise pareil.
  const t = auto5('potager');
  addItem(t, 'graine_oignon', 1);
  addItem(t, 'ail', 1);
  addItem(t, 'graine_epinard', 1);
  plantRipe(t, 'potager-1', 'oignon');
  plantRipe(t, 'potager-2', 'ail');
  plant(t, 'potager-3', 'epinard');
  sleepOnce(t);
  matin(t);
  assertEqual(findPlot(t, 'potager-1').culture, null);
  assertEqual(findPlot(t, 'potager-2').culture, null);
  // Rendement de base : 8 oignons, 6 ails. L'oignon est en mode
  // 'recolte' (comme la tomate) : la récolte rend aussi 1 à 2 graines bonus
  // (ici 2, déterministe avec la graine aléatoire n°1 utilisée par garden()).
  assertEqual(t.robot.recoltes, { oignon: 8, graine_oignon: 2, ail: 6 });
  assertEqual(findPlot(t, 'potager-3').arrose, true);
});

test('Serre : automatisée seulement par ses nœuds (Irrigation de la Serre, Serre autonome)', () => {
  const s = garden();
  s.pieces = 5000;
  buildSerre(reach(s, 'serre'));
  s.serre.niveau = DATA.NIVEAU_MAX;
  addItem(s, 'cacao', 3);
  plantRipe(s, 'serre-1', 'cacao');
  grantTech(s, 'ea_irrigation');
  grantTech(s, 'cu_recolte_auto');
  sleepOnce(s);
  matin(s);
  assertEqual(findPlot(s, 'serre-1').culture, 'cacao', 'les nœuds de la Zone de culture ne touchent pas la Serre');
  assertEqual(isAutomated(s, 'serre'), false);
  grantTech(s, 'cu_serre_auto');
  const r = sleepOnce(s);
  matin(s);
  assertEqual(isAutomated(s, 'serre'), true);
  assertEqual(r.auto.serre, true);
  assert(s.robot.recoltes.cacao > 0, 'récolté tout seul (le robot)');
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

test('eau ou blé insuffisants : les automatisations servent ce qu\'elles peuvent et le signalent', () => {
  const s = auto5('potager', 'poulailler');
  for (let i = 1; i <= 4; i++) plant(s, `potager-${i}`, 'carotte');
  testAddHens(s, 4);
  s.silo.ble = 1; // de quoi nourrir 2 poules
  s.eauMl = ml(5); // de quoi arroser 2 parcelles (2 L chacune)
  const r = sleepOnce(s);
  const m = matin(s);
  assertEqual([m.arrosees, m.sansEau], [2, 2]);
  assertEqual(s.potager.parcelles.slice(0, 4).map((p) => p.arrose), [true, true, false, false]);
  assertEqual([r.auto.nourries, r.auto.sansBle], [2, 2]);
  assertEqual(r.oeufs, 2);
  assertEqual(s.silo.ble, 0);
});

testBase('semis automatique : sans le nœud, la parcelle récoltée reste vide', () => {
  const s = auto5('potager');
  plantRipe(s, 'potager-1', 'patate');
  sleepOnce(s);
  matin(s);
  assertEqual(findPlot(s, 'potager-1').culture, null);
  assertEqual(countItem(s, 'patate'), 8, 'la famille a mangé les 5 patates du stock (plus de réserve)');
});

testBase('semis automatique : replante la même culture, arrosée dans la foulée', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  plantRipe(s, 'potager-1', 'patate');
  plantRipe(s, 'potager-2', 'carotte');
  const r = sleepOnce(s);
  matin(s);
  const p1 = findPlot(s, 'potager-1');
  assertEqual([p1.culture, p1.stade, p1.arrose], ['patate', 0, true]);
  assertEqual(countItem(s, 'patate'), 8 - 1, 'la famille a mangé les 5 patates du stock, le semis en prend 1');
  const p2 = findPlot(s, 'potager-2');
  assertEqual([p2.culture, p2.stade, p2.arrose], ['carotte', 0, true], 'une graine de carotte de l\'inventaire');
  assertEqual(countItem(s, 'graine_carotte'), 10 - 1 + s.robot.recoltes.graine_carotte - 1, 'une pour la plantation à la main, celles de la récolte, une pour le semis');
  assertEqual(s.robot.semees, 2);
  assertEqual(s.robot.taches.map((x) => x.t), ['recolter', 'planter', 'recolter', 'planter'], 'chaque parcelle récoltée est replantée juste après');
});

testBase('robot : sa batterie tient ROBOT.BATTERIE.TACHES tâches ; vide, il rentre à sa station et repart rechargé', () => {
  const B = DATA.ROBOT.BATTERIE;
  const s = auto5('potager');
  assertEqual([robotTaskCapacity(s), robotChargePct(s)], [B.TACHES, 100], 'neuve : pleine, 100 % d\'autonomie');
  plantRipe(s, 'potager-1', 'patate');
  plantRipe(s, 'potager-2', 'carotte');
  plantRipe(s, 'potager-3', 'patate');
  robotBattery(s).mwh = 2 * B.WH_TACHE * 1000;                 // de quoi faire deux tâches
  s.awakeMs = awakeMsAtHour(12);
  robotStep(s);
  assertEqual([s.robot.i, s.robot.charge, robotBattery(s).mwh], [2, true, 0], 'deux récoltes, puis il rentre se recharger');
  assertEqual(findPlot(s, 'potager-3').culture, 'patate', 'la troisième attend');
  // à sa station, il prend l'électricité de la ferme
  testFillBatteries(s);
  runRobotCharge(s, 10000);
  assertEqual(robotBattery(s).mwh, B.CHARGE_WH_S * 1000 * 10, 'CHARGE_WH_S Wh par seconde');
  robotStep(s);
  assertEqual(s.robot.charge, true, 'pas encore assez chargé pour repartir');
  robotBattery(s).mwh = robotCapacity(s);
  robotStep(s);
  assertEqual([s.robot.charge, s.robot.base, s.robot.debut], [false, 2, absoluteHours(s)], 'rechargé : il repart de sa station');
  s.awakeMs = awakeMsAtHour(14);
  robotStep(s);
  assertEqual([s.robot.i, findPlot(s, 'potager-3').culture], [3, null]);
});

testBase('robot : la station ne charge pas pendant le travail ; la nuit, il se recharge sur les batteries', () => {
  const B = DATA.ROBOT.BATTERIE;
  const s = auto5('potager');
  plantRipe(s, 'potager-1', 'patate');
  testFillBatteries(s);
  robotBattery(s).mwh = robotCapacity(s) - 5000;
  s.awakeMs = awakeMsAtHour(DATA.ROBOT.HEURE);
  robotStep(s);
  runRobotCharge(s, 1000);
  assertEqual(robotBattery(s).mwh, robotCapacity(s) - 5000, 'en route vers la parcelle : rien');
  robotBattery(s).mwh = 0;
  const avant = s.batteries.reduce((t, b) => t + b.chargeMwh, 0);
  s.nuit = s.nuit || {};
  const pris = robotNight(s);
  assertEqual([pris, robotChargePct(s)], [robotCapacity(s), 100]);
  assertEqual(s.batteries.reduce((t, b) => t + b.chargeMwh, 0), avant - robotCapacity(s), 'pris sur les batteries');
  testEmptyBatteries(s);
  robotBattery(s).mwh = 0;
  assertEqual(robotNight(s), 0, 'batteries vides : rien');
  assert(B.TACHES > 0);
});

testBase('robot : un palier d\'autonomie coûte PALIER_PRIX pièces et ajoute PALIER_PCT %', () => {
  const B = DATA.ROBOT.BATTERIE;
  const t = ranch();
  assertEqual(upgradeRobotBattery(t).ok, false, 'sans robot : rien à améliorer');
  const s = auto5('potager');
  s.pieces = B.PALIER_PRIX - 1;
  assertEqual(upgradeRobotBattery(s).ok, false, 'pas assez de pièces');
  s.pieces = B.PALIER_PRIX * 2;
  const r = upgradeRobotBattery(s);
  assertEqual([r.ok, r.autonomie, s.pieces, robotBattery(s).paliers], [true, 100 + B.PALIER_PCT, B.PALIER_PRIX, 1]);
  assertEqual(robotCapacity(s), Math.round(B.TACHES * B.WH_TACHE * 1000 * (100 + B.PALIER_PCT) / 100));
  assertEqual(robotTaskCapacity(s), Math.floor(B.TACHES * (100 + B.PALIER_PCT) / 100));
  robotBattery(s).paliers = B.PALIERS_MAX;
  s.pieces = B.PALIER_PRIX;
  assertEqual(upgradeRobotBattery(s).ok, false, 'au maximum');
});

testBase('robot : à 6 h il dresse sa liste, puis fait chaque tâche après son trajet et ROBOT.MINUTES de travail', () => {
  const s = auto5('potager');
  s.technologies.push('semis_auto');
  plantRipe(s, 'potager-1', 'patate');
  plantRipe(s, 'potager-2', 'carotte');
  s.nuitEnCours = { ms: 0, minuit: false };
  assertEqual([robotStep(s), s.robot], [0, undefined], 'pas la nuit');
  s.nuitEnCours = null;
  s.awakeMs = awakeMsAtHour(DATA.ROBOT.HEURE);
  robotStep(s);
  assertEqual([s.robot.taches.length, s.robot.i, findPlot(s, 'potager-1').culture], [2, 0, 'patate'], 'deux récoltes à faire');
  const d = robotTrip(s, s.robot, 0);
  const W = DATA.TERRAIN.LARGEUR, c = findPlot(s, 'potager-1').case;
  const dist = Math.hypot((c % W) - 0.2 - DATA.ROBOT.BASE[0], Math.floor(c / W) + 0.95 - DATA.ROBOT.BASE[1]);
  assertEqual(Math.round(d.route * 60 * 1000), Math.round((dist / DATA.ROBOT.VITESSE) * 1000), 'le trajet depuis sa base, à ROBOT.VITESSE tuiles par minute');
  const fin = DATA.ROBOT.HEURE + d.route + d.travail;
  s.awakeMs = awakeMsAtHour(fin - 0.01);
  robotStep(s);
  assertEqual(s.robot.i, 0, 'pas avant d\'être arrivé et d\'avoir travaillé');
  s.awakeMs = awakeMsAtHour(fin);
  robotStep(s);
  assertEqual([s.robot.i, findPlot(s, 'potager-1').culture, s.robot.taches[1].t], [1, null, 'planter'], 'la première récolte ; son semis vient juste après');
  assertEqual(robotTrip(s, s.robot, 1).route, 0, 'le semis : sur place');
  s.awakeMs = awakeMsAtHour(fin + DATA.ROBOT.MINUTES / 60);
  robotStep(s);
  assertEqual([s.robot.i, findPlot(s, 'potager-1').culture, findPlot(s, 'potager-2').culture], [2, 'patate', 'carotte'], 'replantée, la carotte attend son tour');
  s.awakeMs = awakeMsAtHour(12);
  robotStep(s);
  assertEqual([s.robot.i, s.robot.taches.length, s.robot.semees, findPlot(s, 'potager-2').culture, findPlot(s, 'potager-2').stade], [4, 4, 2, 'carotte', 0]);
  plantRipe(s, 'potager-3', 'patate');
  robotStep(s);
  assertEqual(findPlot(s, 'potager-3').stade, maxStage(findPlot(s, 'potager-3')), 'une liste par jour : la parcelle mûre plus tard attend le lendemain');
});

testBase('semis automatique : respecte la réserve de semences', () => {
  // 5 patates en stock + 8 récoltées = 13 avant le semis.
  const essai = (reserve) => {
    const s = auto5('potager');
    s.technologies.push('semis_auto');
    setSeedReserve(s, 'patate', reserve);
    plantRipe(s, 'potager-1', 'patate');
    const r = robotJour(s);
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
  const r = robotJour(s);
  assertEqual(findPlot(s, 'potager-1').culture, null, 'pas de graine de carotte : rien à semer');
  assertEqual([r.semees, r.sansGraine], [0, 1]);
});

testBase('semis automatique : sans graine en stock, les carottes récoltées rendent leurs graines et se replantent', () => {
  const s = auto5('potager');
  grantTech(s, 'semis_auto');
  addItem(s, 'graine_carotte', 3);
  for (let i = 1; i <= 3; i++) plantRipe(s, `potager-${i}`, 'carotte');
  const reste = countItem(s, 'graine_carotte');
  if (reste > 0) takeItem(s, 'graine_carotte', reste);
  const r = robotJour(s);
  const plots = ['potager-1', 'potager-2', 'potager-3'].map((id) => findPlot(s, id));
  assertEqual(plots.every((p) => p.culture === 'carotte' && p.stade === 0), true, 'chaque récolte rend au moins une graine : tout est replanté');
  assertEqual([countItem(s, 'carotte'), r.semees, r.sansGraine], [18, 3, 0]);
  assertEqual(countItem(s, 'graine_carotte'), r.recoltes.graine_carotte - 3);
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
  const r = robotJour(s);
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
  matin(s);
  const p = findPlot(s, 'potager-7');
  assertEqual([p.culture, p.stade, p.arrose], ['ble', 0, true]);
  assertEqual(wheatTotal(s), 3 - 1 + 8 - 1, 'plantation à la main, récolte (8), semis');
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
  addItem(s, 'pierre', 4);
  addItem(s, 'lingot_fer', 2);
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

test('éveil minimal : 30 s (version 1.19 : plus de technologie pour le raccourcir)', () => {
  const s = farm();
  assertEqual(awakeRequired(s), 30);
  s.awakeMs = 20000;
  assertEqual(canSleep(s), false);
  assertEqual(sleep(s), null);
  s.awakeMs = 30000;
  assert(sleep(s) !== null, 'on peut dormir dès 30 s (joueur automatique, essais)');
});

test('prérequis : palier, bâtiment, nœud précédent, PT et pièces', () => {
  const s = createInitialState(1);
  s.pieces = 5000;
  // cu_recolte_auto : palier 3 (chapitre 4), Outils de jardin, 24 tuiles de terre
  assertEqual(techStatus(s, 'cu_recolte_auto'), 'verrouille');
  assertEqual(techPrereqs(s, 'cu_recolte_auto').map((p) => p.ok), [false, false, false]);
  s.campagne.chapitre = 4;
  techPoints(s).solde = 10;
  assertEqual(techPrereqs(s, 'cu_recolte_auto').map((p) => p.ok), [true, false, false]);
  const refus = buyTech(s, 'cu_recolte_auto');
  assertEqual([refus.ok, s.pieces, s.technologies, techPoints(s).solde], [false, 5000, [], 10]);
  // les ressources : 8 bois et 5 pierre pour les Outils de jardin
  addItem(s, 'bois', 8);
  addItem(s, 'pierre', 4);
  assertEqual(buyTech(s, 'cu_outils').error, 'Il manque : 1 🪨 pierre.');
  assertEqual([s.pieces, countItem(s, 'bois')], [5000, 8], 'rien de payé');
  addItem(s, 'pierre', 1);
  assertEqual(buyTech(s, 'cu_outils').ok, true);
  assertEqual([s.pieces, techPoints(s).solde, countItem(s, 'bois'), countItem(s, 'pierre')], [4900, 9, 0, 0], '1 PT + 100 💰 + 8 bois + 5 pierre');
  addItem(s, 'lingot_fer', 5);
  addItem(s, 'lingot_cuivre', 2);
  growZone(s, 23);
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, false, '23 tuiles ne suffisent pas');
  assertEqual(techPrereqs(s, 'cu_recolte_auto')[2].texte, '🟫 24 tuiles de terre', 'version 1.9 : des tuiles à la place du niveau 4 de la zone');
  growZone(s, 24);
  assertEqual(techStatus(s, 'cu_recolte_auto'), 'disponible');
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, true);
  assertEqual([s.pieces, techPoints(s).solde, techStatus(s, 'cu_recolte_auto'), countItem(s, 'lingot_fer')], [4000, 7, 'acquis', 0]);
  assertEqual(buyTech(s, 'cu_recolte_auto').ok, false, 'déjà acquis : pas de deuxième paiement');
  // prérequis « construit » et niveau d'un appareil (version 1.6 : batterie niveau 2)
  assertEqual(techPrereqs(s, 'el_ration').map((p) => p.ok), [true, false], 'Poulailler à construire');
  assertEqual(techPrereqs(s, 'en_delestage').slice(2).map((p) => [p.ok, p.texte]), [[false, '🔋 Batterie niveau 2']]);
  s.batteries[0].niveau = 2;
  assertEqual(techPrereqs(s, 'en_delestage')[2].ok, true);
  // PT insuffisants
  addItem(s, 'bois', 10);
  techPoints(s).solde = 0;
  assertEqual(buyTech(s, 'fa_sommeil').error, 'Pas assez de points de technologie.');
  techPoints(s).solde = 1;
  s.pieces = 99;
  assertEqual(buyTech(s, 'fa_sommeil').error, 'Pas assez de pièces.');
  s.pieces = 100;
  assertEqual(buyTech(s, 'fa_sommeil').ok, true);
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
  assertEqual([s.potager.parcelles.length, 'niveau' in s.potager], [30, false]);
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
  assertEqual(s.technologies.slice().sort(), Object.keys(DATA.ARBRE.noeuds).sort());
  assertEqual(s.unlockedTabs.includes('techno'), true);
  assertEqual([awakeRequired(s), prepTimeMult(s)], [30, 64]);
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
  assertEqual([r.auto.recoltes, r.auto.semees, r.auto.arrosees, r.auto.nourries], [{}, 0, 0, 4], 'la nuit : le nourrissage ; la récolte et le semis sont au robot, l\'arrosage aux asperseurs');
  assertEqual(matin(s).arrosees, 2);
  assertEqual([s.robot.recoltes, s.robot.semees], [{ patate: 8 }, 1]);
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
    recoltes.push(s.robot && s.robot.jour === s.day ? s.robot.recoltes.patate || 0 : 0);
    sleepOnce(s);
    stades.push(findPlot(s, 'potager-1').stade);
  }
  // Arrosée à 7 h (runFor passe 7 h), elle gagne son stade le lendemain à 7 h : elle mûrit
  // le 7e matin, après le passage du robot (sa liste est faite à 6 h) ; le robot la récolte
  // et la replante le 8e matin, les asperseurs l'arrosent à 7 h.
  assertEqual(stades, [0, 1, 2, 3, 4, 5, 6, 0]);
  assertEqual(recoltes, [0, 0, 0, 0, 0, 0, 0, 8], '8 patates récoltées par le robot le 8e matin');
});

test('progression affichée dans l\'arbre : niveaux des bâtiments et appareils', () => {
  const s = auto5('potager');
  const culture = techProgress(s, 'culture');
  // une seule ligne : la Zone de culture (l'ancien Champ n'est plus suivi)
  assertEqual(culture.map((e) => [e.cle, e.nom, e.type, e.tuiles, e.max, e.automatise]), [['potager', 'Zone de culture', 'tuiles', 30, 30, true]], 'version 1.9 : les tuiles de terre, plus de niveau');
  assertEqual([DATA.ARBRE.batiments.champ, DATA.ARBRE.suivi.champ], [undefined, undefined]);
  assertEqual(DATA.ARBRE.batiments.potager.nom, 'Zone de culture');
  const energie = techProgress(s, 'energie');
  assertEqual(energie.map((e) => [e.cle, e.type, e.niveau]), [['panneau', 'niveau', 1], ['batterie', 'niveau', 1]]);
  s.panneaux[0].niveau = 3;
  assertEqual(techProgress(s, 'energie')[0].niveau, 3);
  s.reservoir.niveau = 2;
  assertEqual(techProgress(s, 'eau').map((e) => [e.cle, e.niveau]), [['pompe', 1], ['reservoir', 2]]);
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
  v7.champ = { construit: true, niveau: 1, parcelles: [{ id: 'champ-1', lieu: 'champ', culture: 'ble', stade: 3, arrose: true }] };
  const m = migrate({ v: 7, t: 0, s: v7 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces], [40, 900]);
  assertEqual(m.technologies, []);
  assertEqual(m.potager.parcelles.every((p) => p.semis === 'meme' && p.verrou === null), true);
  // v15 : la parcelle de l'ancien Champ a rejoint la zone (6 + 1 = 7 parcelles : niveau 2, 12 parcelles)
  assertEqual('champ' in m, false);
  assertEqual([m.potager.parcelles.length, 'niveau' in m.potager], [12, false]);
  assertEqual(m.potager.parcelles[6], { id: 'potager-7', lieu: 'potager', culture: 'ble', stade: 3, arrose: true, semis: 'meme', verrou: null, case: zoneTile(1, 6) });
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
  assertEqual([m.potager.parcelles.length, 'niveau' in m.potager], [12, false]);
  assertEqual(m.potager.parcelles.map((p) => p.id), Array.from({ length: 12 }, (_, i) => `potager-${i + 1}`));
  assertEqual(m.potager.parcelles.map(plotContent), v14.potager.parcelles.map(plotContent), 'chaque parcelle garde tout ce qu\'elle portait');
  assertEqual([m.pieces, m.inventaire, m.campagne], [432, v14.inventaire, chapter1StepsDone(v14.campagne)], 'rien d\'autre ne bouge (FLU-42 : étapes du chapitre 1 validées)');
  assertEqual(m.nuit.auto, newAutoReport(), 'le compte rendu n\'a plus de ligne Champ');
  // niveau de la zone = le plus petit dont la capacité (6 / 12 / 18 / 24 / 30) contient les parcelles possédées
  const zone = (potager) => migrate({ v: 14, t: 0, s: v14State({ potager }) }).potager.parcelles.length;
  assertEqual([1, 2, 3, 4, 5].map(zone), [6, 12, 12, 18, 24]);
  // les parcelles ajoutées pour compléter le niveau sont vides, et la partie continue
  const z = migrate({ v: 14, t: 0, s: v14State({ potager: 2 }) });
  assertEqual(z.potager.parcelles.slice(9), [9, 10, 11].map((c) => ({ ...makePlot(c + 1), case: zoneTile(1, c) })));
  assert(sleepOnce(z) !== null, 'la partie migrée passe la nuit');
  assertEqual([z.potager.houe, 'niveau' in z.potager], [true, false], 'version 1.9 : la zone ne s\'agrandit plus en pièces ; la houe est offerte');
});

test('migration v14 → v15 : Champ construit avec des cultures, tout est regroupé dans la zone', () => {
  const v14 = v14State({ potager: 2, champ: 2 }, (s) => {
    Object.assign(s.potager.parcelles[0], { culture: 'carotte', stade: 4 });
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
  assertEqual([m.potager.parcelles.length, 'niveau' in m.potager], [18, false]);
  assertEqual(m.potager.parcelles.map((p) => p.id), Array.from({ length: 18 }, (_, i) => `potager-${i + 1}`));
  assertEqual(m.potager.parcelles.every((p) => p.lieu === 'potager'), true, 'le lieu « champ » a disparu');
  // d'abord les parcelles du Potager, puis celles du Champ, dans leur ordre, avec tous leurs champs
  assertEqual(m.potager.parcelles.slice(0, 15).map(plotContent), [...v14.potager.parcelles, ...v14.champ.parcelles].map(plotContent));
  assertEqual(m.potager.parcelles[9], { id: 'potager-10', lieu: 'potager', culture: 'ble', stade: 5, arrose: true, semis: 'meme', verrou: null, case: zoneTile(1, 9) });
  assertEqual(m.potager.parcelles[10], { id: 'potager-11', lieu: 'potager', culture: 'tournesol', stade: 7, arrose: false, semis: 'verrou', verrou: 'tournesol', case: zoneTile(1, 10) });
  assertEqual(m.potager.parcelles[12], { id: 'potager-13', lieu: 'potager', culture: 'riz', stade: 2, arrose: false, semis: 'verrou', verrou: 'ble', note: 'champ libre', case: zoneTile(1, 12) }, 'même un champ inconnu est gardé');
  assertEqual(m.potager.parcelles.slice(15), [15, 16, 17].map((c) => ({ ...makePlot(c + 1), case: zoneTile(1, c) })));
  assertEqual(m.inventaire, v14.inventaire, 'aucun remboursement : rien n\'a été retiré');
  // ce qui était rangé sous la clé « champ » rejoint la zone
  assertEqual([m.nuit.auto.potager, 'champ' in m.nuit.auto, m.nuit.auto.arrosees], [true, false, 3]);
  assertEqual([m.report.auto.potager, 'champ' in m.report.auto, m.report.auto.recoltes], [true, false, { ble: 8 }]);
  // le déblocage « champ » (chapitre 3) reste acquis : les cultures de plein champ restent plantables
  assertEqual([isUnlocked(m, 'champ'), plantableCropsFor(m, 'potager').includes('ble')], [true, true]);
  // les automatisations acquises couvrent maintenant les anciennes parcelles du Champ
  assertEqual(isAutomated(m, 'potager'), true);
  sleepOnce(m);
  matin(m);
  assertEqual(m.robot.recoltes.graine_tournesol > 0, true, 'le tournesol mûr de l\'ancien Champ est récolté tout seul (le robot)');
  assertEqual([findPlot(m, 'potager-11').culture, findPlot(m, 'potager-11').stade, findPlot(m, 'potager-11').arrose], ['tournesol', 0, true], 'et replanté (verrou gardé), arrosé à 7 h');
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
  assertEqual([m.potager.parcelles.length, 'niveau' in m.potager], [30, false]);
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
  assertEqual([pile.potager.parcelles.length, pile.inventaire], [30, {}]);
  assertEqual(pile.potager.parcelles.map((p) => p.culture), [...Array(29).fill('patate'), null]);
});
