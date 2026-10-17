/* ==========================================================================
   Tests du moteur : niveaux d'expérience (version 1.7), niveaux 9 et 10 (version 1.14).
   Lancer seul : node --test tests/engine/niveaux.test.mjs (ou node tests/run-tests.mjs niveaux).
   ========================================================================== */

import {
  acknowledgeChapter, acknowledgeLevel, actionXp, addItem, awakeMsAtHour, buildPoulailler,
  chooseCommerce, commerceCapacity, commerceChoiceCost, commerceNight, countItem,
  createInitialState, cropUnlocked, DATA, deliverMail, feedAllHens, findPlot, gainXp, harvest,
  ingredientOptions, isUnlocked, levelForXp, levelProgress, levelReached, levelUnlocks, lotsOf,
  mailReceived, makeDevice, maxStage, migrate, newCampaignCounters, newCommerce, openFridge,
  openSerre, plant, plantableCropsFor, readMail, sellItem, setCommerceQuota, shear, startMilling,
  startRecipe, STATE_VERSION, tankCapacity, testCompleteChapter, testGoToChapter, testSetLevel,
  testWoolReady, tick, unlockLevel, updateChapters, upgradeCommerce, water,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, atChapter, atelier, auto5, farm, fillCows, fillSheep, garden, holdNights,
  kwh, matin, ml, pature, plantRipe, ranch, reach, runFor, setInv, setStraw, sleepOnce, test,
} from './aide.mjs';

/* ---------- version 1.7 : niveaux d'expérience ---------- */

test('DATA niveaux : seuils, gains d\'XP, XP des chapitres', () => {
  const N = DATA.NIVEAUX;
  assertEqual(N.SEUILS, [0, 500, 1200, 3000, 7500, 20000, 40000, 80000, 180000, 400000]);
  assertEqual(N.XP, { labourer: 10, couper: 10, piocher: 10, pecher: 15, planter: 10, arroser: 10, recolter: 20, cueillir: 20, oeuf: 10, lait: 30, tondre: 30, cuisiner: 40, cuireFour: 50, moudre: 10, presser: 10, vendre: 1 });
  assertEqual([N.AUTO, N.CHAPITRES_XP.slice(0, 4)], [50, [200, 500, 1000, 2500]]);
  assertEqual([0, 499, 500, 1199, 1200, 400000, 10 ** 7].map(levelForXp), [1, 1, 2, 2, 3, 10, 10]);
  assertEqual(createInitialState(1).progression, { xp: 0, niveau: 1, annonces: [] });
  assertEqual(levelUnlocks(3), { niveau: 3, seuil: 1200, elements: ['silo', 'poulailler'], cultures: ['poivron', 'ail', 'fraise', 'ble'], note: null });
  assertEqual([actionXp('arroser'), actionXp('arroser', 1, true), actionXp('recolter', 3, true), actionXp('inconnue')], [10, 5, 30, 0]);
});

test('XP : planter, arroser, récolter, vendre ; un niveau franchi est annoncé une fois', () => {
  const s = garden();
  assert(plant(s, 'potager-1', 'carotte').ok);
  assert(water(s, 'potager-1').ok);
  assertEqual(s.progression.xp, 20);
  findPlot(s, 'potager-1').stade = maxStage(findPlot(s, 'potager-1'));
  harvest(s, 'potager-1');
  assertEqual(s.progression.xp, 40);
  const r = sellItem(s, 'carotte', 6); // 6 × 2 pièces
  assertEqual([r.gain, s.progression.xp], [12, 52]);
  assertEqual(s.progression.annonces, []);
  assertEqual(gainXp(s, 448), [2]);
  assertEqual([s.progression.niveau, s.progression.annonces], [2, [{ niveau: 2, nuit: 1 }]]);
  assertEqual(levelProgress(s), { niveau: 2, xp: 500, debut: 500, fin: 1200, max: false, pct: 0, reste: 700 });
  assertEqual(gainXp(s, 10000), [3, 4, 5], 'plusieurs niveaux d\'un coup');
  assertEqual(s.progression.annonces.map((a) => a.niveau), [2, 3, 4, 5]);
  assertEqual(acknowledgeLevel(s).restantes, 3);
  assertEqual([gainXp(s, 0), gainXp(s, -5)], [[], []]);
  testSetLevel(s, 10);
  assertEqual(levelProgress(s).max, true);
});

test('XP : les automatisations rapportent la moitié, la nuit donne celle des œufs et du lait', () => {
  const s = auto5('potager');
  s.campagne.chapitre = 3; // version 1.12 : la récolte ne termine pas le chapitre 1 (son XP fausserait le compte)
  const xp0 = s.progression.xp;
  plantRipe(s, 'potager-1', 'carotte'); // planté au clic : 10
  plant(s, 'potager-2', 'carotte'); // 10
  sleepOnce(s);
  const m = matin(s);
  // récolte du robot 10, arrosage auto de potager-2 à 7 h : 5 (pas de semis automatique ici)
  assertEqual([s.robot.recoltes.carotte > 0, m.arrosees, s.robot.semees, s.progression.xp - xp0], [true, 1, 0, 20 + 10 + 5]);
  const p = ranch();
  p.poulailler.poules = 2;
  setInv(p, { ble: 5, conserve: 30 });
  feedAllHens(p);
  const x = p.progression.xp;
  const n = sleepOnce(p);
  assertEqual([n.oeufs, p.progression.xp - x], [2, 20]);
  const v = pature();
  fillCows(v, 1);
  setStraw(v, 3);
  const y = v.progression.xp;
  assertEqual([sleepOnce(v).lait, v.progression.xp - y], [1, 30]);
});

test('XP : ateliers (Cuisine 40, Four 50, Moulin 10 par blé), tonte 30, chapitre terminé', () => {
  const s = atelier();
  setInv(s, { ble: 2, farine: 2, oeuf: 3, huile: 1 });
  let x = s.progression.xp;
  startMilling(s, 2);
  runFor(s, 11);
  assertEqual(s.progression.xp - x, 20, '2 blés moulus');
  x = s.progression.xp;
  startRecipe(s, 'pain');
  startRecipe(s, 'omelette');
  runFor(s, 20);
  assertEqual(s.progression.xp - x, 50 + 40);
  const t = pature();
  fillSheep(t, 1);
  testWoolReady(t);
  x = t.progression.xp;
  assert(shear(t, t.paturage.moutons[0].id).ok);
  assertEqual(t.progression.xp - x, 30);
  const c = farm();
  x = c.progression.xp;
  assert(testCompleteChapter(c).ok);
  assertEqual(c.progression.xp - x, 200, 'chapitre 1 terminé : 200 XP');
});

test('migration v24 → v25 (version 1.7) : le niveau garde tout ce que les chapitres avaient débloqué', () => {
  const at = (chapitre, fn) => {
    const old = createInitialState(1);
    old.version = 24;
    delete old.progression;
    old.campagne.chapitre = chapitre;
    if (fn) fn(old);
    return migrate({ v: 24, t: 0, s: old });
  };
  assertEqual(at(1).progression, { xp: 0, niveau: 1, annonces: [] });
  assertEqual(at(3).progression.niveau, 3);
  assertEqual(at(4).progression, { xp: 20000, niveau: 6, annonces: [] }, 'chapitre 4 : Four et Presse');
  assertEqual(at(6).progression.niveau, 8);
  assertEqual(at(7, (s) => { s.campagne.fini = true; }).progression.niveau, 8);
  // une partie au chapitre 1 qui a déjà construit la Serre garde son niveau
  assertEqual(at(1, (s) => { s.serre.construit = true; }).progression.niveau, 7);
  assertEqual(at(2, (s) => { s.potager.parcelles[0].culture = 'epinard'; }).progression.niveau, 4, 'un épinard en terre');
  const m = at(4);
  assertEqual([m.version, isUnlocked(m, 'presse'), isUnlocked(m, 'serre')], [STATE_VERSION, true, false]);
});

test('migration v23 → v24 (version 1.6) : un seul panneau, une seule batterie, un réservoir à niveaux', () => {
  const old = createInitialState(1);
  old.version = 23;
  old.pieces = 100;
  old.compteurs = { panneau: 3, batterie: 2 };
  delete old.reservoir;
  old.pompe.niveau = 3;
  old.panneaux = [
    { ...makeDevice('panneau', 'panneau-1', 0), niveau: 2, usure: 40 },
    { ...makeDevice('panneau', 'panneau-2', 72), niveau: 3, usure: 10 },
    { ...makeDevice('panneau', 'panneau-3', 87), niveau: 3, usure: 5 },
  ];
  old.batteries = [
    { ...makeDevice('batterie', 'batterie-1', 0), chargeMwh: kwh(4) },
    { ...makeDevice('batterie', 'batterie-2', 96), chargeMwh: kwh(4) },
  ];
  const m = migrate({ v: 23, t: 0, s: old });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.panneaux.map((p) => [p.id, p.niveau, p.usure, p.prix]), [['panneau-1', 3, 5, 87]], 'le plus haut niveau, puis le moins usé');
  assertEqual(m.batteries.map((b) => [b.id, b.niveau]), [['batterie-1', 1]]);
  assertEqual(m.batteries[0].chargeMwh, kwh(6), '8 000 Wh au total, plafonnés à 6 000');
  assertEqual(m.pieces, 100 + 0 + 72 + 96, 'les appareils retirés sont remboursés');
  assertEqual([m.reservoir, tankCapacity(m)], [{ niveau: 3 }, ml(160)], 'le réservoir garde sa capacité');
  assertEqual('compteurs' in m, false);
  m.awakeMs = awakeMsAtHour(8);
  tick(m, 1);
  assert(sleepOnce(m) !== null, 'la partie migrée continue');
});

test('migration v22 → v23 (version 1.6) : l\'hiver réussi devient la série réussie', () => {
  const old = createInitialState(1);
  old.version = 22;
  const { tenue, tenueDerniere, tenueReussie, ...k } = old.campagne.compteurs;
  old.campagne.compteurs = { ...k, hiver: { debut: 31, nuits: 3, somme: 300, soins: 0 }, hiverDernier: { moyenne: 90, sansSoin: true, reussi: true }, hiverReussi: true };
  old.report = { saison: 'hiver', nuitDeSaison: 3, oeufs: 2 };
  const m = migrate({ v: 22, t: 0, s: old });
  assertEqual(m.version, STATE_VERSION);
  const c = m.campagne.compteurs;
  assertEqual([c.tenue, c.tenueDerniere, c.tenueReussie], [null, { moyenne: 90, reussi: true }, true], 'version 1.8 : « sans soin » disparaît');
  assertEqual(['hiver' in c, 'hiverDernier' in c, 'hiverReussi' in c], [false, false, false]);
  assertEqual(m.report, { oeufs: 2 });
  const fresh = createInitialState(1);
  fresh.version = 22;
  const { tenue: a, tenueDerniere: b, tenueReussie: d, ...k2 } = fresh.campagne.compteurs;
  fresh.campagne.compteurs = { ...k2, hiver: null, hiverDernier: null, hiverReussi: false };
  assertEqual(migrate({ v: 22, t: 0, s: fresh }).campagne.compteurs.tenueReussie, false);
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
  // version 1.12 : tout le chapitre 2 est rempli juste avant la nuit
  s.progression.niveau = 3;
  Object.assign(s.campagne.compteurs, { cultures: ['carotte', 'patate', 'tomate', 'courgette'], semisBle: 1 });
  Object.assign(s.silo, { construit: true, ble: 50 });
  const r = sleepOnce(s);
  assertEqual([r.autonomie, r.energieProduit, r.chapitre, r.chapitresTermines], [76, 114, 3, [2]]);
});

/* --- masquage --- */

test('déblocages : chaque niveau atteint ouvre ses éléments', () => {
  const at = (n, id) => { const s = farm(); testSetLevel(s, n); return isUnlocked(s, id); };
  const groups = { 2: ['cuisine'], 3: ['silo', 'poulailler'], 4: ['moulin'], 5: ['four', 'paturage', 'moutons'], 6: ['presse', 'verger'], 7: ['serre'], 8: ['frigo'] };
  for (const [niv, ids] of Object.entries(groups)) {
    for (const id of ids) {
      assertEqual([id, at(Number(niv) - 1, id)], [id, false], `${id} masqué au niveau ${niv - 1}`);
      assertEqual([id, at(Number(niv), id)], [id, true], `${id} visible au niveau ${niv}`);
      assertEqual([id, at(10, id)], [id, true], `${id} visible ensuite`);
    }
  }
  // un chapitre avancé ne débloque rien par lui-même
  const s = farm();
  s.campagne.chapitre = 6;
  assertEqual([isUnlocked(s, 'four'), isUnlocked(s, 'serre')], [false, false]);
});

test('déblocages : le Potager, la pompe et le Marché sont là dès le départ', () => {
  const s = farm();
  assertEqual(levelReached(s), 1);
  for (const id of ['potager', 'pompe', 'panneau', 'batterie', 'comptoir']) assertEqual([id, isUnlocked(s, id)], [id, true]);
  assertEqual(unlockLevel('potager'), 1);
  assertEqual(['cuisine', 'silo', 'moulin', 'four', 'presse', 'serre', 'frigo'].map(unlockLevel), [2, 3, 4, 5, 6, 7, 8]);
});

test('masquage : un niveau plus bas ne détruit rien de ce que la partie possède', () => {
  const s = createInitialState(1);
  s.pieces = 5000;
  addItem(s, 'ble', 1);
  assert(plant(s, 'potager-1', 'ble').ok, 'les actions du moteur restent libres : le masquage est celui de l\'interface');
  assert(buildPoulailler(reach(s, 'poulailler')).ok);
  testSetLevel(s, 1);
  assertEqual([findPlot(s, 'potager-1').culture, s.poulailler.construit], ['ble', true]);
  assertEqual([cropUnlocked(s, 'ble'), isUnlocked(s, 'poulailler')], [false, false]);
  assertEqual(plantableCropsFor(s, 'potager').includes('ble'), false, 'le blé n\'est pas proposé avant le niveau 3');
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
  // FLU-42 : la partie a déjà ses parcelles (anciennes versions) : « Labourer 6 tuiles » est fait
  assertEqual(m.campagne.compteurs, { ...newCampaignCounters(), labours: 6 });
  assertEqual([m.nuit.energieProduit, m.nuit.autonomie, 'soins' in m.jour], [0, 0, false], 'version 1.8 : plus de soins');
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

test('mode test Lot 9 : aller à un chapitre donné (et au niveau qui va avec)', () => {
  const s = createInitialState(1);
  s.campagne.compteurs.laines = 12;
  s.campagne.annonces.push({ chapitre: 1, nuit: 1 });
  assertEqual(testGoToChapter(s, 4), { ok: true, chapitre: 4, fini: false });
  assertEqual([s.campagne.compteurs.laines, s.campagne.annonces], [0, []], 'compteurs et annonces remis à zéro');
  assertEqual(levelReached(s), DATA.NIVEAUX.CHAPITRE_NIVEAU[3]);
  assertEqual([isUnlocked(s, 'four'), isUnlocked(s, 'frigo')], [true, false]);
  assertEqual(testGoToChapter(s, 8), { ok: true, chapitre: 7, fini: true });
  assertEqual(isUnlocked(s, 'frigo'), true);
  assertEqual(testGoToChapter(s, 2), { ok: true, chapitre: 2, fini: false });
  assertEqual([s.campagne.fini, levelReached(s)], [false, 2]);
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
  holdNights(s, 3, 22);
  testCompleteChapter(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assert(sleepOnce(copy) !== null && sleepOnce(s) !== null);
  assertEqual(JSON.parse(JSON.stringify(copy)), JSON.parse(JSON.stringify(s)), 'la partie continue à l\'identique');
});

/* ---------- version 1.14 (v2, lot 10) : niveaux 9 et 10 ---------- */

function atLevel10() {
  const s = farm();
  setInv(s, { conserve: 500 });
  testSetLevel(s, 10);
  s.pieces = 100000;
  return s;
}

test('version 1.14 : au niveau 9, le notaire verse 15 000 pièces à l\'ouverture, une seule fois, sans XP', () => {
  const s = farm();
  testSetLevel(s, 8);
  deliverMail(s);
  assert(!mailReceived(s, 'notaire_legs'), 'pas avant le niveau 9');
  testSetLevel(s, 9);
  deliverMail(s);
  assert(mailReceived(s, 'notaire_legs'));
  const p = s.pieces, xp = s.progression.xp;
  assertEqual(readMail(s, 'notaire_legs').pieces, 15000);
  assertEqual([s.pieces - p, s.progression.xp - xp], [15000, 0]);
  assertEqual(readMail(s, 'notaire_legs').pieces, 0, 'relue : rien de plus');
  assertEqual(s.pieces - p, 15000);
});

test('version 1.14 : le commerce se choisit au niveau 10, le changement coûte 5 000', () => {
  const s = farm();
  testSetLevel(s, 9);
  assertEqual(chooseCommerce(s, 'cremerie').ok, false, 'pas avant le niveau 10');
  const t = atLevel10();
  assertEqual(commerceChoiceCost(t, 'cremerie'), 0);
  assertEqual(chooseCommerce(t, 'cremerie').cost, 0);
  assertEqual([t.commerce.type, t.commerce.quota, commerceCapacity(t)], ['cremerie', 10, 10]);
  assertEqual(chooseCommerce(t, 'cremerie').ok, false, 'déjà choisi');
  const p = t.pieces;
  assertEqual(chooseCommerce(t, 'tissage').ok, true);
  assertEqual([t.commerce.type, p - t.pieces], ['tissage', 5000]);
  assertEqual(chooseCommerce(t, 'boulangerie').ok, false);
});

test('version 1.14 : capacité 10 / 20 / 35 / 50 pour 3 000, 8 000, 20 000', () => {
  const s = atLevel10();
  assertEqual(upgradeCommerce(s).ok, false, 'sans commerce');
  chooseCommerce(s, 'conserverie');
  const paid = [];
  for (let i = 0; i < 3; i++) {
    const p = s.pieces;
    assert(upgradeCommerce(s).ok);
    paid.push([p - s.pieces, commerceCapacity(s)]);
  }
  assertEqual(paid, [[3000, 20], [8000, 35], [20000, 50]]);
  assertEqual(s.commerce.quota, 50, 'un quota au maximum suit la capacité');
  assertEqual(upgradeCommerce(s).ok, false, 'niveau maximum');
  assertEqual(setCommerceQuota(s, 80).quota, 50);
  assertEqual(setCommerceQuota(s, -3).quota, 0);
});

test('version 1.14 : la crèmerie vend chaque nuit 3 laits → 1 fromage à 36, 1 XP par pièce', () => {
  const s = atLevel10();
  chooseCommerce(s, 'cremerie');
  setCommerceQuota(s, 4);
  setInv(s, { conserve: 500, lait: 14 });
  const p = s.pieces, xp = s.progression.xp;
  const r = commerceNight(s);
  assertEqual([r.n, r.pieces], [4, 144]);
  assertEqual([countItem(s, 'lait'), s.pieces - p, s.progression.xp - xp], [2, 144, 144]);
  const r2 = commerceNight(s);
  assertEqual([r2.n, r2.pieces], [0, 0], 'moins de 3 laits : rien');
});

test('version 1.14 : l\'étal de bocaux prend les légumes qui périment le plus tôt, après le repas', () => {
  const s = atLevel10();
  chooseCommerce(s, 'conserverie');
  setCommerceQuota(s, 1);
  setInv(s, { conserve: 500 });
  addItem(s, 'patate', 4);
  addItem(s, 'tomate', 4);
  lotsOf(s, 'tomate')[0].nightsLeft = 1;
  const r = commerceNight(s);
  assertEqual([r.n, r.pieces, countItem(s, 'tomate'), countItem(s, 'patate')], [1, 24, 0, 4]);
  // dans la nuit complète, la famille mange d'abord ; le rapport du réveil compte la vente
  addItem(s, 'patate', 40);
  const rep = sleepOnce(s);
  assertEqual([rep.commerce.type, rep.commerce.n, rep.commerce.pieces], ['conserverie', 1, 24]);
});

test('échelle des transformations : recette ×1,3 < commerce ×1,5 < entreprise ×2, sans perte quel que soit l\'intrant', () => {
  // valeur d'une unité prise : le prix effectif de l'intrant le plus cher
  const valeur = (items) => Math.max(...items.map((it) => DATA.items[it].prix));
  for (const [id, t] of Object.entries(DATA.COMMERCE.TYPES)) {
    assertEqual(t.prix, Math.round(t.par * valeur(t.prend) * 1.5), `commerce ${id}`);
  }
  for (const [id, e] of Object.entries(DATA.VILLE.ENTREPRISES.LISTE)) {
    assertEqual(e.prixProduit, Math.round(e.par * valeur(e.intrants) * 2), `entreprise ${id}`);
  }
  // un plat « l'un ou l'autre » se vend au moins ce que coûtent ses ingrédients, quelle que soit l'option
  for (const [id, r] of Object.entries(DATA.recipes)) {
    if (r.transformation || !r.ingredients.some((ing) => ing.ou)) continue;
    const cout = r.ingredients.reduce((t, ing) => t + valeur(ingredientOptions(ing)) * ing.qte, 0);
    assert(DATA.items[id].prix >= cout, `${id} : ${DATA.items[id].prix} < ${cout}`);
  }
  assertEqual([DATA.items.bocal_legumes.prix, DATA.items.quenelle_poisson.prix], [22, 16]);
  assert(ingredientOptions(DATA.recipes.quenelle_poisson.ingredients[1]).includes('anchois'), 'l\'anchois fait aussi des quenelles');
  // les noms : le commerce de la ferme ne reprend pas celui d'une entreprise de la ville ni d'un nœud
  const villes = Object.values(DATA.VILLE.ENTREPRISES.LISTE).map((e) => e.nom);
  const noeuds = Object.values(DATA.techtree.noeuds).map((n) => n.nom);
  for (const t of Object.values(DATA.COMMERCE.TYPES)) assert(!villes.includes(t.nom) && !noeuds.includes(t.nom), t.nom);
  for (const n of villes) assert(!noeuds.includes(n), n);
  // les lingots valent au moins leurs 4 minerais et leur bois
  for (const m of ['fer', 'cuivre', 'or', 'platine']) {
    const r = DATA.recipes['lingot_' + m];
    const cout = r.ingredients.reduce((t, ing) => t + DATA.items[ing.item].prix * ing.qte, 0);
    assert(DATA.items['lingot_' + m].prix >= cout, `lingot_${m}`);
  }
});

test('migration v30 → v31 : un commerce vide', () => {
  const s = farm();
  const old = JSON.parse(JSON.stringify(s));
  old.version = 30;
  delete old.commerce;
  const m = migrate({ v: 30, t: 0, s: old });
  assertEqual(m.commerce, newCommerce());
  assertEqual(m.version, STATE_VERSION);
});
