import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { allDevices, fail, isBroken, needsService, newDayStats, storageCapacity, storedEnergy, tankCapacity } from './devices.js';
import { awakeRequired, bedtimeDue, midnightMs, nightActive, nightLengthMs } from './clock.js';
import { expiringSoon, spoil } from './inventory.js';
import { fridgeCoversNight, fridgeNight, fridgeUnits, nightPower } from './fridge.js';
import { feedFamily, newNightStats } from './family.js';
import { jaugeFamille, repasCoucher } from './repas.js';
import { growDue, readyCrops } from './crops.js';
import { energyMax, restoreEnergy, wakeEnergy } from './stamina.js';
import { feedLivestock, fillSilo, layEggs, newStableReport, sheepToShear, strawNeed, strawStock } from './animals.js';
import { chevalNuit } from './cheval.js';
import { growOrchard } from './orchard.js';
import { commerceNight } from './commerce.js';
import { finishPreparations } from './kitchen.js';
import { refreshUnlocks } from './techtree.js';
import { autoMaintain, autoTasks, newAutoReport, rainNight, robotNight } from './automation.js';
import { recordNight, updateChapters } from './campaign.js';
import { noteTutorialSleep } from './alerts.js';
import { collectLeftovers } from './ramassage.js';
import { regrowGrass, respawnBushes, respawnRocks, respawnTrees } from './outils.js';
import { remplirRuches } from './ruches.js';
import { nuitCouchee, nuitSansCouchage } from './blocs.js';

// Liste des étapes exécutées au clic sur "Dormir", dans l'ordre. Lot 2 :
// ce que la famille a mangé dans la journée (repas.js ; énergie au réveil), puis pousse. Lot 4 : la
// ponte. Lot 5 : les préparations en cours se terminent (un plat fini pendant la nuit se mange
// dès le lendemain). Lot 6, revu en version 1.1 : les moutons et les
// vaches mangent leur paille juste après la ponte (feedLivestock) ; ceux qui ont
// mangé font avancer leur laine ou donnent leur lait. Lot 3 : la péremption, toujours en dernier. Les
// lots suivants insèrent leurs fonctions avant `spoil`. Lot 7 : les
// automatisations du niveau 5 passent juste après le repas, avant la pousse (une
// parcelle arrosée pousse cette nuit) et avant la ponte (une poule nourrie pond).
// Lot 8 : le verger donne ses fruits juste après les moutons ; puis le bloc
// nocturne du réfrigérateur (nightPower), sa panne éventuelle (fridgeNight) et
// enfin la péremption. Les préparations en cours se terminent avant le frigo :
// la paille du blé qui finit de se moudre pendant la nuit sert donc à partir
// de la nuit suivante. Juste avant la péremption, le blé de l'inventaire
// rejoint le Silo s'il y a de la place (fillSilo) : au Silo, il ne périme pas. Le robot se
// recharge juste après le frigo (robotNight), sur ce qui reste dans les batteries. Le cheval
// mange sa paille juste après l'Étable (chevalNuit, js/engine/cheval.js).
// Chaque étape reçoit l'état et le modifie.
// La pousse des cultures n'en fait plus partie : elle suit l'horloge (growDue).
export const NIGHT_STEPS = [collectLeftovers, feedFamily, rainNight, autoTasks, layEggs, feedLivestock, chevalNuit, growOrchard, finishPreparations, commerceNight, autoMaintain, nightPower, robotNight, fridgeNight, fillSilo, spoil];

/* ---------- la nuit ---------- */

export function canSleep(state) {
  return state.awakeMs >= awakeRequired(state) * 1000;
}

export function buildMorningReport(state) {
  const aSurveiller = (d) => ({ id: d.id, type: d.type, usure: d.usure });
  return {
    nuit: state.day,
    energie: storedEnergy(state),
    capacite: storageCapacity(state),
    energiePerdue: state.jour.perdue,
    eau: state.eauMl,
    capaciteEau: tankCapacity(state),
    aEntretenir: allDevices(state).filter(needsService).map(aSurveiller),
    enPanne: allDevices(state).filter(isBroken).map(aSurveiller),
    // Lot 2 : repas et récoltes prêtes ; version 1.8 : énergie du personnage au réveil.
    besoin: state.nuit.besoin,
    energieMangee: state.nuit.energie,
    couverture: state.nuit.couverture,
    mange: { ...state.nuit.mange },
    energieReveil: state.energie,
    bonheur: state.nuit.bonheur || 0,
    pretes: readyCrops(state),
    // Lot 3 : ce qui a péri cette nuit, et ce qui périra à la prochaine.
    perimes: { ...(state.nuit.perdus || {}) },
    aPerimer: expiringSoon(state),
    // Lot 4 : œufs pondus cette nuit, blé mangé par les poules pendant la journée.
    oeufs: state.nuit.oeufs || 0,
    bleConsomme: state.jour.ble || 0,
    poules: state.poulailler.poules,
    // Lot 5 : préparations terminées pendant la nuit.
    termine: { ...(state.nuit.termine || {}) },
    // Lot 6 : moutons présents et moutons dont la laine est prête à tondre.
    moutons: state.paturage.moutons.length,
    lainePrete: sheepToShear(state),
    // Vaches présentes et lait donné cette nuit.
    vaches: state.paturage.vaches.length,
    lait: state.nuit.lait || 0,
    // et le lait d'alpage (les vaches nourries aux herbes de montagne)
    laitAlpage: state.nuit.laitAlpage || 0,
    // Version 1.1 : la nuit à l'Étable (animaux nourris, paille mangée, paille
    // qui a manqué), la paille en stock au réveil et celle qu'il faudra ce soir.
    etable: { ...newStableReport(), ...(state.nuit.etable || {}) },
    paille: strawStock(state),
    pailleBesoin: strawNeed(state),
    // Lot 7 : ce que les automatisations ont fait (ou n'ont pas pu faire) cette nuit.
    auto: { ...newAutoReport(), ...(state.nuit.auto || {}), recoltes: { ...((state.nuit.auto || {}).recoltes || {}) } },
    // Lot 8 : fruits du verger, nuit du frigo (mWh prélevés, panne de froid, lots
    // qui ont perdu une nuit) et contenu du frigo.
    fruits: { ...(state.nuit.fruits || {}) },
    // Version 1.14 : ce que le commerce a vendu cette nuit.
    commerce: { type: null, n: 0, pieces: 0, ...(state.nuit.commerce || {}) },
    frigo: {
      construit: !!state.frigo.construit,
      mwh: (state.nuit.frigo || {}).mwh || 0,
      panne: !!(state.nuit.frigo || {}).panne,
      vieillis: !!(state.nuit.frigo || {}).vieillis,
      unites: fridgeUnits(state),
      couvreLaNuit: fridgeCoversNight(state),
    },
    // Arbre v2 : eau de pluie reçue et appareils entretenus automatiquement.
    pluie: state.nuit.pluie || 0,
    entretiens: [...(state.nuit.entretiens || [])],
    // Lot 9 : autonomie de la nuit, chapitre en cours et chapitres terminés au réveil.
    autonomie: state.nuit.autonomie || 0,
    energieProduit: state.nuit.energieProduit || 0,
    chapitre: state.campagne ? state.campagne.chapitre : 0,
    chapitresTermines: state.campagne ? state.campagne.annonces.map((a) => a.chapitre) : [],
  };
}

// La récolte de la nuit : ce que la ferme a produit pendant la nuit, regroupé par
// produit { item: quantité } = œufs pondus + lait + fruits du verger + récoltes
// des automatisations. (Les « récoltes prêtes » à cueillir ne comptent pas : ce n'est
// pas encore récolté.) Pure : ne lit que le rapport.
export function nightHarvest(report) {
  const total = {};
  const add = (item, qty) => {
    const n = Math.floor((Number(qty) || 0) + EPS);
    if (n > 0 && DATA.OBJETS[item]) total[item] = (total[item] || 0) + n;
  };
  add(DATA.ANIMAUX.poule.produit, report.oeufs);
  add(DATA.ANIMAUX.vache.lait, report.lait);
  add(DATA.ANIMAUX.vache.laitAlpage, report.laitAlpage);
  for (const [item, qty] of Object.entries(report.fruits || {})) add(item, qty);
  for (const [item, qty] of Object.entries((report.auto || {}).recoltes || {})) add(item, qty);
  return total;
}

// Ne fait rien tant que l'éveil minimal n'est pas atteint (renvoie null).
// Sinon : toute la nuit d'un coup (runNight), et l'on est réveillé à 6 h. Le jeu ouvert
// passe plutôt par la nuit qui défile (startNight) ; sleep() sert au joueur automatique et
// aux essais.
export function sleep(state) {
  if (!canSleep(state)) return null;
  // jusqu'à minuit, les cycles de pousse qui s'achèvent ; puis la nuit (comme advanceNight)
  state.nuitEnCours = { ms: midnightMs(), minuit: false };
  growDue(state);
  const report = runNight(state);
  state.nuitEnCours = null;
  // toute une nuit de sommeil : l'énergie du réveil (sur la ferme générée, seulement couché
  // sur une paillasse d'une pièce close : nuitCouchee) ; les cycles de pousse jusqu'à 6 h
  if (nuitCouchee(state)) restoreEnergy(state, state.nuit.couverture);
  growDue(state);
  report.energieReveil = state.energie;
  report.pretes = readyCrops(state);
  return report;
}

// Version 1.19 : la nuit défile. À 22 h, la famille va dormir (startNight) ; à minuit, toute
// la nuit se calcule comme avant (runNight : repas, automatisations dont la récolte, pousse,
// ponte…, jour suivant) ; à 6 h, réveil (state.reveil : la page montre le résumé). Le bouton
// nuit saute ce qui reste (skipNight). Pendant la nuit, rien d'autre n'avance (voir tick).
export function startNight(state) {
  if (nightActive(state) || !bedtimeDue(state)) return false;
  state.nuitEnCours = { ms: 0, minuit: false };
  repasCoucher(state); // les enfants mangent avant d'aller dormir
  return true;
}

// Avance la nuit de `dtMs` ; renvoie 'minuit' si la nuit vient d'être calculée, 'reveil' si
// elle vient de finir (les deux à la fois : 'reveil'), sinon null.
export function advanceNight(state, dtMs) {
  if (!nightActive(state)) return null;
  const n = state.nuitEnCours;
  const avant = n.ms;
  n.ms = Math.min(nightLengthMs(), n.ms + Math.max(0, Number(dtMs) || 0));
  if (n.dort) recoverInSleep(state, n.ms - avant); // il dort : l'énergie remonte peu à peu
  let event = null;
  // les plantes dont le cycle de pousse s'achève (avant minuit : avant la récolte
  // automatique de la nuit)
  growDue(state);
  if (!n.minuit && n.ms >= midnightMs()) {
    runNight(state);
    n.minuit = true; // après runNight : pendant le calcul, le jour n'a pas encore changé (absoluteHours)
    event = 'minuit';
  }
  if (n.ms >= nightLengthMs()) {
    state.nuitEnCours = null;
    state.reveil = true;
    // l'énergie et les plantes mûres au réveil, pas à minuit
    if (state.report) { state.report.energieReveil = state.energie; state.report.pretes = readyCrops(state); }
    event = 'reveil';
  }
  return event;
}

// L'énergie que le sommeil de cette nuit vise : REVEIL_BASE + REVEIL_REPAS × la jauge moyenne
// de la famille (repas.js). Avant minuit, celle d'à présent ; après, celle du coucher.
export function sleepTarget(state) {
  const n = state.nuitEnCours;
  const couverture = n && n.minuit && state.nuit && Number.isFinite(state.nuit.couverture) ? state.nuit.couverture
    : jaugeFamille(state);
  return wakeEnergy(state, couverture);
}

// En dormant, l'énergie remonte peu à peu : PERSONNAGE.SOMMEIL_HEURES heures de sommeil
// pour atteindre sleepTarget (`ms` : temps d'horloge dormi). Une énergie plus haute est gardée.
// Sur la ferme générée, sans paillasse dans une pièce close, on ne dort pas : rien ne revient.
export function recoverInSleep(state, ms) {
  if (!(ms > 0) || !nuitCouchee(state)) return state.energie;
  const cible = sleepTarget(state);
  const e = Number(state.energie) || 0;
  if (e >= cible) return e;
  const parMs = cible / (DATA.PERSONNAGE.SOMMEIL_HEURES * DATA.TEMPS.SECONDES_PAR_HEURE * 1000);
  state.energie = Math.min(cible, energyMax(), Math.round(e + parMs * ms));
  return state.energie;
}

// « Dormir » : le personnage dort dans son lit, la nuit défile en accéléré (une heure toutes
// les TIME.SECONDES_PAR_HEURE_SOMMEIL secondes au lieu de SECONDES_PAR_HEURE) jusqu'au réveil.
// On ne dort que la nuit.
// Sur la ferme générée, il faut une paillasse dans une pièce close (nuitCouchee) : sans elle, on
// ne dort pas, la nuit passe à son rythme et ne rend pas d'énergie.
export const SANS_COUCHAGE = 'Sans paillasse dans une pièce close (des murs tout autour et une porte), on ne peut pas dormir : la nuit passe sans rendre d\'énergie.';
export function goToSleep(state) {
  if (!nightActive(state)) return fail(`On ne dort que la nuit, de ${DATA.TEMPS.HEURE_NUIT} h à ${DATA.TEMPS.HEURE_REVEIL} h.`);
  if (!nuitCouchee(state)) return fail(SANS_COUCHAGE);
  state.nuitEnCours.dort = true;
  return { ok: true };
}

// Le personnage dort-il dans son lit ?
export function asleep(state) {
  return nightActive(state) && !!state.nuitEnCours.dort;
}

// Vitesse de la nuit : 1 (elle défile à l'heure de l'horloge), plus quand il dort.
export function nightSpeed(state) {
  return asleep(state) ? DATA.TEMPS.SECONDES_PAR_HEURE / DATA.TEMPS.SECONDES_PAR_HEURE_SOMMEIL : 1;
}

// Le bouton nuit : ce qui reste de la nuit passe d'un coup (minuit compris). Renvoie le
// rapport de réveil, ou null s'il n'y a pas de nuit en cours.
export function skipNight(state) {
  if (!nightActive(state)) return null;
  state.nuitEnCours.dort = nuitCouchee(state); // le reste de la nuit, il dort (s'il a où dormir)
  advanceNight(state, nightLengthMs());
  return state.report;
}

// Les étapes nocturnes dans l'ordre, jour suivant, éveil remis à 0 (l'heure du jour
// repart à 6 h), rapport de réveil.
export function runNight(state) {
  state.nuit = newNightStats();
  for (const step of NIGHT_STEPS) step(state);
  // la ferme générée : qui n'a pas de paillasse dans une pièce close perd du bonheur
  const sansCouchage = nuitSansCouchage(state).map((m) => m.id);
  recordNight(state); // Lot 9 : autonomie de la nuit, séries et tenue (nuit encore = state.day)
  state.day += 1;
  state.awakeMs = 0;
  respawnRocks(state); // les rochers cassés dont le jour de retour est venu
  respawnTrees(state); // les arbres abattus dont le jour est venu repoussent
  respawnBushes(state); // les buissons coupés aussi
  regrowGrass(state); // l'herbe haute fauchée dont le jour est venu repousse
  remplirRuches(state); // les abeilles remplissent les ruches
  refreshUnlocks(state);
  updateChapters(state); // Lot 9 : un chapitre peut se terminer avec le réveil
  noteTutorialSleep(state); // Lot 11 : la bulle « Dormir » se ferme à la première nuit
  state.report = buildMorningReport(state);
  if (sansCouchage.length) state.report.sansCouchage = sansCouchage;
  state.jour = newDayStats();
  return state.report;
}
