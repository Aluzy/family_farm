/* ==========================================================================
   Tests du moteur : Lot 11 : hors-ligne, alertes, bulles d'aide, version ; centre de notifications ; courrier (1.3).
   Lancer seul : node --test tests/engine/hors-ligne.test.mjs (ou node tests/run-tests.mjs hors-ligne).
   ========================================================================== */

import {
  addItem, advanceTutorial, alertEvents, alertSnapshot, allDevices, awakeRequired, batteryCapacity,
  canSleep, countItem, createInitialState, DATA, deliverMail, energyStats, formatDuration,
  fridgeLots, gainXp, GAME_VERSION, getNotifications, harvest, isBroken, isUnlocked, mailReceived,
  mergeOfflineReports, MIGRATIONS, moveToFridge, newGameFrom, nightHarvest, notificationCount,
  plant, readMail, seedItem, shear, simulateOffline, skipTutorial, spoil, startMilling,
  startRecipe, storeWheat, tankCapacity, testAddHens, testAddSeeds, testAddSheep, testBatir,
  testEmptyBatteries, testFillBatteries, testRipenAll, testSetLevel, testSetWear,
  testUnlockAllTechs, testWoolReady, tick, toggleDevice, tutorialStep, unlockLevel, unreadMail,
  updateChapters, water,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, atChapter, atelier, AVANT_DEMENAGEMENT, coldRoom, farm, fillCows, fillSheep,
  garden, kwh, migreAvant, ml, near, pature, plantRipe, reach, runFor, setInv, setStraw, sleepOnce,
  test,
} from './aide.mjs';

// Version 1.7 : partie de test placée au début du niveau `n` (chapitre 1).
function atLevel(n) {
  const s = farm();
  assert(testSetLevel(s, n).ok, `aller au niveau ${n}`);
  return s;
}

/* ---------- Lot 11 : hors-ligne, alertes, bulles d'aide, version ---------- */

test('DATA Lot 11 : hors-ligne plafonné à 8 h, pas de 5 s, sans usure ; trois bulles d\'aide', () => {
  assertEqual(DATA.HORS_LIGNE, { MAX_S: 28800, PAS_S: 5, USURE: false, ECRAN_S: 60 });
  assertEqual(DATA.AIDE.ETAPES, ['eau', 'potager', 'dormir']);
  assert(/^\d+\.\d+\.\d+$/.test(GAME_VERSION), 'version au format x.y.z');
  assertEqual(GAME_VERSION, '1.22.0');
});

test('Lot 11 : hors-ligne plafonné à 8 h', () => {
  const s = farm({ pump: true, sun: false });
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
  const s = farm({ sun: false });
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
  assertEqual(tri(r.terminees), [['farine', 1], ['huile', 1], ['pain', 1]], 'version 1.23 : le Moulin ne donne plus de paille');
  assertEqual(r.enCours, []);
  for (const id of ['four', 'moulin', 'presse']) assertEqual(s.stations[id].tache, null, `${id} libre`);
  assertEqual([countItem(s, 'pain'), countItem(s, 'farine'), countItem(s, 'huile'), countItem(s, 'paille')], [1, 1, 1, 0]);
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
  const s = coldRoom({ lest: 0 }); // batterie pleine (6 000 Wh), panneau coupé
  addItem(s, 'carotte', 100);
  assert(moveToFridge(s, 'carotte', 100).ok);
  const avant = fridgeLots(s, 'carotte')[0].nightsLeft;
  // 100 × 0,1 = 10 Wh/s : 6 000 Wh tiennent 600 s sur 3 600.
  const r = simulateOffline(s, 3600);
  assertEqual(s.frigo.alimente, false, 'plus de courant au retour');
  assert(near(r.frigo.horsTensionS, 3000, 5), `hors tension ${r.frigo.horsTensionS} s`);
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
  const usure = DATA.USURE.HEURES_PAR_POINT;
  DATA.USURE.HEURES_PAR_POINT = 1e9; // en jeu, l'usure baisse un peu le débit : on la retire pour comparer les flux
  try {
    runFor(live, 30);
  } finally {
    DATA.USURE.HEURES_PAR_POINT = usure;
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
  assertEqual(r8.energieProduite, r8.energiePerdue + (r8.energieFin - r8.energieDebut) + r8.eauPompee * DATA.POMPE.WH_PAR_L, 'bilan énergétique exact, en entiers');
});

test('Lot 11 : la progression hors-ligne compte pour les objectifs du chapitre', () => {
  const s = createInitialState(1);
  assertEqual(s.campagne.chapitre, 1);
  // chapitre 1 « L'héritage » rempli (le foyer bâti), relu par la progression hors-ligne
  assert(testBatir(s, 'foyer').ok);
  s.potager.houe = true;
  Object.assign(s.campagne.compteurs, { recoltes: 1, labours: 6, semis: 6, arroseesMax: 6 });
  s.reservoir.niveau = 2; // réservoir de 80 L : on peut pomper les 50 L de l'objectif
  // l'horloge s'arrête à l'éveil minimal (7 h 40), au soleil : le panneau produit
  simulateOffline(s, 2 * 3600); // 50 L pompés et 3 000 Wh stockés ; les chapitres sont relus
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
  assertEqual(m.terminees, { farine: 2 });
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
  testSetWear(s, 'panneau-1', DATA.USURE.PANNE);
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
  const icone = DATA.OBJETS.paille.icone;
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
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  testAddHens(s, 4);
  assertEqual(getNotifications(s).map((x) => [x.type, x.nombre]), [['poules', 4]]);
  s.poulailler.nourries = 4;
  assertEqual(notifTypes(s), []);
});

test('notifications : panne, entretien et priorités (urgent d\'abord)', () => {
  const s = coldRoom();
  testAddSeeds(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  testSetWear(s, 'panneau-1', DATA.USURE.PANNE);
  const n = getNotifications(s);
  assertEqual(n.map((x) => x.type), ['panne', 'arrosage']);
  assertEqual(n.map((x) => x.priorite), [1, 2]);
  testSetWear(s, 'panneau-1', DATA.USURE.SEUIL_ENTRETIEN);
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
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  testAddHens(s, 2);
  fillSheep(s, 1);
  setStraw(s, 1);
  testWoolReady(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  assertEqual(notifTypes(s).sort(), ['arrosage', 'poules', 'tonte']);
  testUnlockAllTechs(s);
  assertEqual(notifTypes(s), [], 'arrosage, nourrissage et tonte sont automatiques');
  // la paille, elle, n'est automatisée par aucune technologie : il faut la faucher
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
  testSetWear(s, 'panneau-1', DATA.USURE.PANNE);
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
  const neuve = migreAvant({ v: 10, t: 0, s: v10(1) });
  assertEqual([neuve.version, neuve.aide], [AVANT_DEMENAGEMENT, { etape: 0, fini: false }]);
  const avancee = migreAvant({ v: 10, t: 0, s: v10(9) });
  assertEqual(avancee.aide.fini, true);
  assertEqual(avancee.day, 9);
  assertEqual(JSON.parse(JSON.stringify(avancee)), avancee);
  assertEqual(migreAvant({ v: 0, t: 0, s: { day: 3, pieces: 10, stats: {} } }).aide.fini, true, 'depuis une très vieille sauvegarde');
});

// La récolte de la nuit (nightHarvest) : œufs, lait, fruits et récoltes automatiques, par produit.
const fakeReport = (over = {}) => ({ oeufs: 0, lait: 0, fruits: {}, auto: { recoltes: {} }, autonomie: 100, santeApres: 100, ...over });

test('récolte de la nuit : rien, un produit, puis tout regroupé par produit', () => {
  assertEqual(nightHarvest(fakeReport()), {});
  assertEqual(nightHarvest(fakeReport({ oeufs: 24 })), { oeuf: 24 });
  const r = fakeReport({ oeufs: 24, lait: 2, fruits: { pomme: 3 }, auto: { recoltes: { carotte: 12, pomme: 4 } } });
  assertEqual(nightHarvest(r), { oeuf: 24, lait: 2, pomme: 7, carotte: 12 });
});

test('récolte de la nuit : quantités négatives, nulles ou produits inconnus ignorés', () => {
  assertEqual(nightHarvest(fakeReport({ oeufs: -2, lait: 0, fruits: { inconnu: 5, pomme: 0 } })), {});
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
  assertEqual(migreAvant({ v: 18, t: 0, s: v18 }).courrier, [], 'la migration complète garde la boîte');
});

test('version 1.3 : la lettre du cousin est définie : Serre, 1 cacao, 1 vanille, 1 café, sans prénom de la famille', () => {
  const L = DATA.COURRIER.cousin_venezuela;
  assertEqual([L.quand, L.cadeaux], [{ debloque: 'serre' }, { cacao: 1, vanille: 1, cafe: 1 }]);
  // les trois cadeaux se plantent tels quels, et seulement dans la Serre
  for (const item of Object.keys(L.cadeaux)) {
    assertEqual([seedItem(item), DATA.CULTURES[item].lieux], [item, ['serre']], item);
    assert(DATA.CULTURES[item].rendement > 1, `${item} : une récolte rend de quoi replanter`);
  }
  assert(L.texte.length >= 3 && L.texte.every((p) => typeof p === 'string' && p.length > 0), 'un texte en paragraphes');
  assert(/Venezuela/.test(L.lieu) && /cacao/.test(L.texte.join(' ')) && /vanille/.test(L.texte.join(' ')) && /café/.test(L.texte.join(' ')), 'la lettre parle de ses cadeaux');
  for (const m of DATA.FAMILLE.MEMBRES) assert(!L.texte.join(' ').includes(m.nom), 'pas de prénom dans la lettre');
});

test('version 1.3 : la lettre arrive quand la Serre se débloque, une seule fois, avec ses trois graines', () => {
  const avant = atLevel(unlockLevel('serre') - 1);
  setInv(avant, {});
  updateChapters(avant);
  assertEqual([isUnlocked(avant, 'serre'), avant.courrier, countItem(avant, 'cacao')], [false, [], 0], 'rien avant le déblocage');
  const s = atLevel(unlockLevel('serre'));
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

test('version 1.3 : la lettre arrive par le jeu lui-même, au niveau qui ouvre la Serre', () => {
  const s = atLevel(unlockLevel('serre') - 1);
  assertEqual(s.courrier, []);
  const vanille = countItem(s, 'vanille');
  gainXp(s, DATA.NIVEAUX.SEUILS[unlockLevel('serre') - 1] - s.progression.xp); // l'XP du niveau de la Serre
  tick(s, 0.2); // le pas de jeu suivant fait arriver le courrier
  assertEqual([isUnlocked(s, 'serre'), s.courrier.map((l) => l.id), countItem(s, 'vanille') - vanille], [true, ['cousin_venezuela'], 1]);
});

test('version 1.3 : une partie d\'avant la version 1.3, Serre déjà ouverte, reçoit la lettre au premier passage', () => {
  const v18 = JSON.parse(JSON.stringify(atChapter(7)));
  v18.version = 18;
  delete v18.courrier;
  const m = migreAvant({ v: 18, t: 0, s: v18 });
  assertEqual(m.courrier, [], 'la migration ne distribue rien elle-même');
  const cacao = countItem(m, 'cacao');
  tick(m, 0.2);
  // (le récit, lot 9 : la lettre d'Adèle sur la première récolte arrive aussi, le chapitre 2 passé)
  assertEqual([m.courrier.map((l) => [l.id, l.lu]), countItem(m, 'cacao') - cacao], [[['adele_recolte', false], ['cousin_venezuela', false]], 1]);
  // boîte abîmée : elle est refaite, sans plantage
  const t = atChapter(7);
  t.courrier = 'x';
  assertEqual([unreadMail(t), deliverMail(t), t.courrier.length], [[], ['adele_recolte', 'cousin_venezuela'], 2]);
});
