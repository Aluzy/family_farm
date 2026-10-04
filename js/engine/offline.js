import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { batteryCapacity, tankCapacity } from './devices.js';
import { awakeRequired } from './clock.js';
import { flowStep, wearStep } from './energy.js';
import { inventoryCounts } from './inventory.js';
import { millPending, millTimeLeft, taskTimeLeft } from './kitchen.js';
import { refreshUnlocks } from './techtree.js';
import { noteEnergyRecord, updateChapters } from './campaign.js';

/* ---------- Lot 11 : progression hors-ligne ---------- */

// Ce qu'il faut relever avant la simulation pour en faire le bilan ensuite.
export function offlineSnapshot(state) {
  const taches = {};
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    taches[id] = st && st.tache ? st.tache.recette : null;
  }
  const f = state.frigo;
  return {
    // Stocks au départ : ce qui s'y ajoute pendant l'absence vient des ateliers
    // (aucune nuit ne passe : ni récolte, ni repas, ni ponte).
    stocks: inventoryCounts(state),
    produite: state.jour.produite,
    perdue: state.jour.perdue,
    eauPompee: state.jour.eau,
    energie: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    eau: state.eauMl,
    taches,
    frigoEveil: f && f.construit ? f.eveilMs : 0,
    frigoAlimente: f && f.construit ? f.alimenteMs : 0,
  };
}

// Bilan d'une période hors-ligne : durée demandée et simulée, énergie, eau,
// préparations terminées ou encore en cours, temps sans froid du réfrigérateur.
export function offlineReport(state, before, demande, simule) {
  // Terminé pendant l'absence : tout ce que les ateliers ont ajouté aux stocks
  // (plats, farine et paille du Moulin, huile), file d'attente et lots compris.
  const terminees = {};
  const avant = before.stocks || {};
  for (const [item, n] of Object.entries(inventoryCounts(state))) {
    if (n > (avant[item] || 0)) terminees[item] = n - (avant[item] || 0);
  }
  const enCours = [];
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (!st || !st.tache) continue;
    // Au Moulin : le temps de tout le blé confié, et le nombre de blés restants.
    const lot = id === 'moulin' ? millPending(state) : 1;
    enCours.push({ station: id, recette: st.tache.recette, reste: id === 'moulin' ? millTimeLeft(state) : taskTimeLeft(state, id), quantite: lot });
  }
  const f = state.frigo;
  const frigoConstruit = !!(f && f.construit);
  const eveil = frigoConstruit ? f.eveilMs - before.frigoEveil : 0;
  const alimente = frigoConstruit ? f.alimenteMs - before.frigoAlimente : 0;
  return {
    demande,
    simule,
    plafonne: demande > simule + EPS,
    nuit: state.day,
    energieProduite: state.jour.produite - before.produite,
    energiePerdue: state.jour.perdue - before.perdue,
    energieDebut: before.energie,
    energieFin: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
    eauPompee: state.jour.eau - before.eauPompee,
    eauDebut: before.eau,
    eauFin: state.eauMl,
    capaciteEau: tankCapacity(state),
    terminees,
    enCours,
    frigo: {
      construit: frigoConstruit,
      horsTensionS: Math.floor(Math.max(0, eveil - alimente) / 1000),
      alimente: frigoConstruit ? !!f.alimente : false,
    },
  };
}

// Simule `seconds` secondes d'absence (plafonnées à HORS_LIGNE.MAX_S) par pas de
// HORS_LIGNE.PAS_S : mêmes flux que tick (panneaux, batteries, pompe, moulin,
// presse, réfrigérateur, Four et Cuisine), sans usure, et jamais de nuit : ni
// pousse, ni repas, ni ponte, ni péremption. Le temps simulé s'ajoute au temps
// d'éveil, mais seulement jusqu'à l'éveil minimal (version 1.1.1) : au retour
// le joueur peut dormir tout de suite, et l'horloge n'a pas dépassé midi (ou
// l'heure où il est parti) ; ni le repas de 19 h ni la nuit de 22 h ne se
// déclenchent pendant une absence. Renvoie le bilan (voir offlineReport). Une
// durée nulle, négative ou invalide ne change rien.
export function simulateOffline(state, seconds) {
  const H = DATA.HORS_LIGNE;
  const demande = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const simule = Math.min(demande, H.MAX_S);
  const before = offlineSnapshot(state);
  const eveilMax = Math.max(state.awakeMs, awakeRequired(state) * 1000);
  let left = Math.round(simule * 1000);
  while (left > 0) {
    const dtMs = Math.min(H.PAS_S * 1000, left);
    flowStep(state, dtMs);
    if (H.USURE) wearStep(state, dtMs);
    state.awakeMs = Math.min(eveilMax, state.awakeMs + dtMs);
    noteEnergyRecord(state);
    left -= dtMs;
  }
  if (simule > 0) {
    refreshUnlocks(state);
    updateChapters(state);
  }
  return offlineReport(state, before, demande, simule);
}

// Additionne deux bilans hors-ligne successifs (le second suit le premier) :
// sert quand une nouvelle absence arrive avant que le joueur ait lu la première.
export function mergeOfflineReports(a, b) {
  if (!a) return b;
  if (!b) return a;
  const terminees = { ...a.terminees };
  for (const [item, n] of Object.entries(b.terminees)) terminees[item] = (terminees[item] || 0) + n;
  return {
    ...b,
    demande: a.demande + b.demande,
    simule: a.simule + b.simule,
    plafonne: a.plafonne || b.plafonne,
    energieProduite: a.energieProduite + b.energieProduite,
    energiePerdue: a.energiePerdue + b.energiePerdue,
    energieDebut: a.energieDebut,
    eauPompee: a.eauPompee + b.eauPompee,
    eauDebut: a.eauDebut,
    terminees,
    frigo: { ...b.frigo, horsTensionS: a.frigo.horsTensionS + b.frigo.horsTensionS },
  };
}
