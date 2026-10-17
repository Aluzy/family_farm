/* ==========================================================================
   Aide commune aux tests du moteur (tests/engine/*.test.mjs).
   - test / testBase / assert / assertEqual : la petite interface maison des
     tests, posée sur node:test (le lanceur intégré de Node) ;
   - le calendrier lunaire neutralisé (avecLune pour le rallumer) ;
   - les états de départ et aides de mise en place utilisées par plusieurs
     fichiers (une aide propre à un seul fichier reste dans ce fichier).
   Ce module n'est jamais chargé par le navigateur.
   ========================================================================== */

import { test } from 'node:test';
import {
  addItem, awakeMsAtHour, buildFridge, buildPaturage, buildPoulailler, buildSilo, buildStation,
  buyCow, buySheep, countItem, createInitialState, DATA, defaultOrigin, findPlot, grantTech,
  growDue, irrigate, makePlot, maxStage, openStation, plant, plotAtTile, robotStep, shelfLife,
  sleep, takeItem, testFillBatteries, testGoToChapter, testSetBuildingLevel5, tick, unlockLevel,
  zoneTile,
} from '../../js/engine/index.js';

// Le calendrier lunaire change la pousse, l'eau et les récoltes selon le jour. Les tests écrits
// avant lui tournent lune neutre (un stade par nuit, rendements et eau de base) ; ceux de la
// lune la rallument le temps du test (avecLune). Chaque fichier de tests importe ce module en
// premier : le réglage neutre est posé avant le moindre test.
const LUNE_REGLAGES = { ...DATA.LUNE };
const LUNE_NEUTRE = { POUSSE_CHANCE: 0, POUSSE_NOUVELLE: 1, RECOLTE_PLEINE: 100, EAU_DECROISSANTE: 100 };
Object.assign(DATA.LUNE, LUNE_NEUTRE);
export function avecLune(fn) {
  Object.assign(DATA.LUNE, LUNE_REGLAGES);
  try {
    fn();
  } finally {
    Object.assign(DATA.LUNE, LUNE_NEUTRE);
  }
}

// Un test : test(nom, () => { … }), celui de node:test tel quel (pour que chaque test soit
// rattaché à son fichier). Tous les tests du moteur sont des fonctions synchrones sans
// paramètre : node:test les lance dans l'ordre du fichier, une fois le fichier entièrement
// chargé, comme l'ancienne file d'attente maison.
export { test };

// Lots 1 à 7 : tests des règles de base. Ils neutralisaient les saisons, retirées en
// version 1.6 ; le nom reste pour ne pas toucher à tous les tests.
export const testBase = test;

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion échouée');
}

// Égalité par JSON.stringify (et pas assert.deepStrictEqual) : l'ordre des clés compte, une clé
// à undefined est ignorée, NaN vaut null. Les tests s'appuient sur ces règles : ne pas changer.
export function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `attendu ${b}, obtenu ${a}`);
  }
}


export function near(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

// Unités entières du moteur : kWh → mWh, L → mL (pour écrire les tests en
// unités lisibles).
export const kwh = (n) => Math.round(n * 1e6);

export const ml = (n) => Math.round(n * 1000);

// État de test : seul le panneau produit, la pompe est coupée (sauf demande).
// Version 1.6 : le panneau ne produit qu'au soleil (7 h – 19 h). La partie de test
// commence à 7 h (`sun`), pour que les tests de flux d'énergie produisent dès le
// premier tick ; `sun: false` la laisse à 6 h, l'heure du réveil.
// Version 1.12 : un bâtiment ne se construit pas avant son niveau ; les aides de test
// montent la partie au niveau qu'il faut (sans XP, sans écran de niveau).
export function reach(s, id) {
  s.progression.niveau = Math.max(s.progression.niveau, unlockLevel(id));
  return s;
}

export function farm({ pump = false, sun = true } = {}) {
  const s = createInitialState(1);
  s.pompe.allume = pump;
  if (sun) s.awakeMs = awakeMsAtHour(DATA.SOLEIL.DEBUT);
  return s;
}

// État de test : réservoir plein d'eau (le potager s'arrose avec).
export function garden() {
  const s = createInitialState(1);
  s.pompe.allume = false;
  s.eauMl = ml(40);
  return s;
}

// Plante une culture sur une parcelle et la fait mûrir d'un coup.
export function plantRipe(s, plotId, culture) {
  assert(plant(s, plotId, culture).ok, `planter ${culture}`);
  const p = findPlot(s, plotId);
  p.stade = maxStage(p);
  return p;
}

// Lot 3 : remplace l'inventaire par ces quantités (lots à conservation pleine).
export function setInv(s, quantities) {
  s.inventaire = {};
  for (const [item, n] of Object.entries(quantities)) addItem(s, item, n);
}

// Version 1.8 : une partie de test « infatigable », pour les tests qui enchaînent
// beaucoup d'actions au clic sans parler d'énergie (l'énergie a ses propres tests).
export function tireless(s) {
  s.energie = Number.MAX_SAFE_INTEGER;
  return s;
}

// Version 1.9 : la Zone de culture ne s'agrandit plus en pièces ; les tests qui veulent
// plus de parcelles les labourent (mode test : sans plafond, énergie ni XP).
export function growZone(s, total) {
  s.potager.houe = true;
  for (let c = 0; s.potager.parcelles.length < total && c < DATA.POTAGER.CASES; c++) {
    if (plotAtTile(s, zoneTile(1, c))) continue;
    const n = s.potager.parcelles.length + 1;
    s.potager.parcelles.push({ ...makePlot(n), case: c });
  }
  s.potager.parcelles.sort((a, b) => a.case - b.case);
  return s;
}

// État de test : riche, Silo et Poulailler construits, réservoir plein. Les
// cultures de plein champ (blé, tournesol, riz, houblon) se plantent dans la
// Zone de culture de départ (potager-1 à potager-6) : plus de Champ à construire.
export function ranch({ silo = true, coop = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (silo) assert(buildSilo(reach(s, 'silo')).ok, 'construire le Silo');
  if (coop) assert(buildPoulailler(reach(s, 'poulailler')).ok, 'construire le Poulailler');
  return s;
}

// État de test : riche, les quatre stations construites, inventaire vide, batteries
// pleines, réservoir plein, panneau coupé (l'énergie ne bouge que par les consommateurs).
export function atelier({ stations = ['four', 'cuisine', 'moulin', 'presse'] } = {}) {
  const s = ranch();
  for (const id of stations) assert(buildStation(reach(s, id), id).ok, `construire ${id}`);
  s.pieces = 1000;
  setInv(s, {});
  testFillBatteries(s);
  s.panneaux[0].allume = false;
  return s;
}

// Fait avancer la simulation de `seconds` secondes par pas de 0,2 s.
export function runFor(s, seconds, dt = 0.2) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tick(s, dt);
}

// État de test : Étable ouverte aux moutons et aux vaches (10 places), avec
// assez de pièces pour tout acheter. (« pature » : nom historique.)
export function pature({ built = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (built) assert(buildPaturage(reach(s, 'paturage')).ok, 'ouvrir l\'Étable');
  return s;
}

export function fillSheep(s, n) {
  for (let i = 0; i < n; i++) assert(buySheep(s).ok, `mouton ${i + 1}`);
}

// Achète n vaches, sur le modèle de fillSheep().
export function fillCows(s, n) {
  for (let i = 0; i < n; i++) assert(buyCow(s).ok, `vache ${i + 1}`);
}

export function sleepOnce(s) {
  s.awakeMs = 30000;
  return sleep(s);
}

// Le matin des automatisations : l'horloge à 7 h (les plantes qui ont fini leur cycle
// poussent), le robot (sa liste de 6 h, chaque tâche après son trajet : quelques parcelles
// proches avant 7 h), puis les asperseurs (irrigate). Renvoie { arrosees, sansEau } ; le travail du robot
// est dans s.robot.
export function matin(s) {
  s.awakeMs = awakeMsAtHour(DATA.TIME.ARROSAGE_HEURE);
  growDue(s);
  robotStep(s);
  return irrigate(s);
}

// Met exactement `n` pailles en stock.
export function setStraw(s, n) {
  takeItem(s, 'paille', countItem(s, 'paille'));
  if (n > 0) addItem(s, 'paille', n);
}

// État de test : riche, réservoir plein, Silo et Poulailler construits (ranch).
// Les bâtiments demandés passent au niveau 5 ('potager' : la Zone de culture).
// Arbre v2 : l'ancien « niveau 5 » = le bâtiment au niveau 5 + les nœuds
// d'automatisation correspondants (comme la migration v14 les offre).
export function auto5(...batiments) {
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

// Sauvegarde de la version 14 : une partie d'avant la fusion, avec l'ancien
// Potager (6 / 9 / 12 / 16 / 20 parcelles) et l'ancien Champ (4 / 6 / 9 / 12 / 16,
// à construire). `potager` et `champ` : niveaux d'alors (champ 0 : pas construit).
export function v14State({ potager = 1, champ = 0 } = {}, mutate) {
  const anciennes = { potager: [6, 9, 12, 16, 20], champ: [4, 6, 9, 12, 16] };
  const plots = (n, lieu) => Array.from({ length: n }, (_, i) => ({ id: `${lieu}-${i + 1}`, lieu, culture: null, stade: 0, arrose: false, semis: 'meme', verrou: null }));
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
export function plotContent(p) {
  const { id, lieu, case: kase, ...reste } = p;
  return reste;
}

// Version 1.10 : un frigo vide ne consomme rien ; il est construit au niveau 5 (120 unités)
// avec `lest` épinards au frais (50 : 5 Wh/s, l'ancienne consommation de base).
export function coldRoom({ charge = true, lest = 50 } = {}) {
  const s = farm();
  s.pieces = 5000;
  assert(buildFridge(reach(s, 'frigo')).ok, 'construire le Réfrigérateur');
  s.frigo.niveau = DATA.FRIGO.CAPACITE.length;
  if (lest) s.frigo.items.epinard = [{ qty: lest, nightsLeft: shelfLife('epinard'), origin: defaultOrigin('epinard') }];
  if (charge) testFillBatteries(s);
  s.panneaux[0].allume = false; // seul le frigo consomme, rien ne recharge
  return s;
}

// Partie de test placée au chapitre `n` (1 à 7 ; 8 = campagne finie), pompe coupée.
export function atChapter(n) {
  const s = farm();
  assert(testGoToChapter(s, n).ok, `aller au chapitre ${n}`);
  return s;
}

// Une nuit avec exactement `qty` unités de `item` d'origine « produit » au menu
// (jamais gardées en réserve), plus des conserves pour le reste. `item` vaut
// patate par défaut (19 d'énergie depuis le Lot 11) ; un autre item (ex.
// courgette, 10 d'énergie) permet d'atteindre des pourcentages d'autonomie
// précis que les multiples de 19 ne permettent pas.
export function nightWithProduced(s, qty, item = 'patate') {
  s.famille.reserve = {};
  setInv(s, { [item]: qty, conserve: 30 });
  return sleepOnce(s);
}

// `count` nuits avec `qty` unités de `item` (patate par défaut) produites au menu.
export function holdNights(s, count, qty, item = 'patate') {
  for (let i = 0; i < count; i++) nightWithProduced(s, qty, item);
}

// Version 1.7 : le Champ s'ouvre quand le Moulin est construit (son niveau atteint).
export function withMill() {
  const s = atLevel(unlockLevel('moulin'));
  openStation(s, 'moulin');
  return s;
}

// Version 1.15 : le milieu de l'ancien Champ, de l'herbe tout autour (les bordures s'y
// dessinent) ; (c, r) de 0 à 5.
export const champ = (c, r) => zoneTile(2, (r + 1) * 8 + c + 1);

// FLU-42 : une partie migrée qui avait déjà labouré, planté et arrosé (ou dépassé le
// chapitre 1) a les trois nouvelles étapes du chapitre 1 validées.
export function chapter1StepsDone(c) {
  return { ...c, compteurs: { ...c.compteurs, labours: 6, semis: 6, arroseesMax: 6 } };
}
