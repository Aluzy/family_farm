import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { allDevices, batteryCapacity, isBroken, needsService, newDayStats, tankCapacity } from './devices.js';
import { awakeRequired } from './clock.js';
import { expiringSoon, spoil } from './inventory.js';
import { fridgeCoversNight, fridgeNight, fridgeUnits, nightPower } from './fridge.js';
import { feedFamily, newNightStats } from './family.js';
import { growAll, readyCrops } from './crops.js';
import { feedLivestock, fillSilo, layEggs, newStableReport, sheepToShear, strawNeed, strawStock } from './animals.js';
import { growOrchard } from './orchard.js';
import { finishPreparations } from './kitchen.js';
import { refreshUnlocks } from './techtree.js';
import { autoMaintain, autoTasks, newAutoReport, rainNight } from './automation.js';
import { recordNight, updateChapters } from './campaign.js';
import { noteTutorialSleep } from './alerts.js';

// Liste des étapes exécutées au clic sur "Dormir", dans l'ordre. Lot 2 :
// repas (version 1.8 : énergie au réveil), puis pousse. Lot 4 : la ponte. Lot 5 : les préparations en
// cours se terminent (après le repas du soir : un plat fini pendant la nuit se
// mange dès le repas suivant). Lot 6, revu en version 1.1 : les moutons et les
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
// rejoint le Silo s'il y a de la place (fillSilo) : au Silo, il ne périme pas.
// Chaque étape reçoit l'état et le modifie.
export const NIGHT_STEPS = [feedFamily, rainNight, autoTasks, growAll, layEggs, feedLivestock, growOrchard, finishPreparations, autoMaintain, nightPower, fridgeNight, fillSilo, spoil];

/* ---------- la nuit ---------- */

export function canSleep(state) {
  return state.awakeMs >= awakeRequired(state) * 1000;
}

export function buildMorningReport(state) {
  const aSurveiller = (d) => ({ id: d.id, type: d.type, usure: d.usure });
  return {
    nuit: state.day,
    energie: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
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

// Résumé de réveil allégé : ce que la ferme a produit pendant la nuit, regroupé par
// produit { item: quantité } = œufs pondus + lait + fruits du verger + récoltes
// des automatisations. (Les « récoltes prêtes » à cueillir ne comptent pas : ce n'est
// pas encore récolté.) Pure : ne lit que le rapport.
export function nightHarvest(report) {
  const total = {};
  const add = (item, qty) => {
    const n = Math.floor((Number(qty) || 0) + EPS);
    if (n > 0 && DATA.items[item]) total[item] = (total[item] || 0) + n;
  };
  add('oeuf', report.oeufs);
  add('lait', report.lait);
  for (const [item, qty] of Object.entries(report.fruits || {})) add(item, qty);
  for (const [item, qty] of Object.entries((report.auto || {}).recoltes || {})) add(item, qty);
  return total;
}

// Tri stable : quantité décroissante, puis nom (ordre alphabétique français).
// Renvoie { affiches: [{ item, qte }], reste: [{ item, qte }] } avec au plus `limite` produits affichés.
export function wakeHarvestList(report, limite = DATA.REVEIL.RECOLTE_MAX) {
  const rows = Object.entries(nightHarvest(report))
    .map(([item, qte]) => ({ item, qte }))
    .sort((x, y) => y.qte - x.qte || DATA.items[x.item].nom.localeCompare(DATA.items[y.item].nom, 'fr'));
  return { affiches: rows.slice(0, limite), reste: rows.slice(limite) };
}

// Les deux indicateurs du résumé de réveil, en entiers (arrondi à l'unité inférieure,
// comme formatPercent) : autonomie de la nuit, en %, et énergie du personnage au
// réveil (version 1.8, à la place de la santé moyenne).
export function wakeSummary(report) {
  const floor = (x) => Math.floor((Number(x) || 0) + EPS);
  return { autonomie: floor(report.autonomie), energie: floor((Number(report.energieReveil) || 0) / 1000), recolte: wakeHarvestList(report) };
}

// Ne fait rien tant que l'éveil minimal n'est pas atteint (renvoie null).
// Sinon : étapes nocturnes dans l'ordre, jour suivant, éveil remis à 0
// (l'heure repart à 6 h), rapport de réveil.
export function sleep(state) {
  if (!canSleep(state)) return null;
  state.nuit = newNightStats();
  for (const step of NIGHT_STEPS) step(state);
  recordNight(state); // Lot 9 : autonomie de la nuit, séries et tenue (nuit encore = state.day)
  state.day += 1;
  state.awakeMs = 0;
  refreshUnlocks(state);
  updateChapters(state); // Lot 9 : un chapitre peut se terminer avec le réveil
  noteTutorialSleep(state); // Lot 11 : la bulle « Dormir » se ferme à la première nuit
  state.report = buildMorningReport(state);
  state.jour = newDayStats();
  return state.report;
}
