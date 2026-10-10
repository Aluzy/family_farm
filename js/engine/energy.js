import { DATA } from './catalog.js';
import {
  allDevices, batteryCapacity, isBroken, needsService, panelOutput, perSecond, perTick, pumpFlow,
  sunlitMs, tankCapacity,
} from './devices.js';
import { availableEnergy, runFridge } from './fridge.js';
import { runCooking, runElectricStation } from './kitchen.js';
import { refreshUnlocks, techFlag, techPct } from './techtree.js';
import { bumpCounter, noteEnergyRecord, updateChapters } from './campaign.js';

/* ---------- énergie : stockage et prélèvement ---------- */

// Range `energy` mWh dans les batteries allumées et non en panne, l'une après
// l'autre dans l'ordre de la liste. Renvoie ce qui n'a rentré nulle part.
export function storeEnergy(state, energy) {
  let rest = energy;
  for (const b of state.batteries) {
    if (rest <= 0) break;
    if (!b.allume || isBroken(b)) continue;
    const room = Math.max(0, batteryCapacity(b) - b.chargeMwh);
    const added = Math.min(room, rest);
    if (added > 0) {
      b.chargeMwh += added;
      b.entree += added;
      rest -= added;
    }
  }
  return Math.max(0, rest);
}

// Prélève jusqu'à `energy` mWh dans les batteries, en sens inverse de la liste :
// la dernière remplie se vide la première. Renvoie l'énergie réellement fournie.
// Tous les consommateurs (pompe, puis moulin, presse, réfrigérateur) passent ici.
export function drawEnergy(state, energy) {
  let rest = energy;
  // version 1.12 : d'abord la production du moment qui n'a pas trouvé de place en batterie
  // (pas de batterie achetée, ou batterie pleine) : le panneau alimente directement
  const direct = state.flux && state.flux.direct > 0 ? Math.min(state.flux.direct, rest) : 0;
  if (direct > 0) {
    state.flux.direct -= direct;
    rest -= direct;
  }
  for (let i = state.batteries.length - 1; i >= 0; i--) {
    if (rest <= 0) break;
    const b = state.batteries[i];
    if (!b.allume || isBroken(b)) continue;
    const taken = Math.min(b.chargeMwh, rest);
    if (taken > 0) {
      b.chargeMwh -= taken;
      b.sortie += taken;
      rest -= taken;
    }
  }
  return energy - Math.max(0, rest);
}

// Consommateurs d'énergie, exécutés dans l'ordre à chaque tick. Les lots
// suivants y ajouteront le moulin, la presse et le réfrigérateur.
// `run(state, dtMs)` prélève son énergie avec drawEnergy().
export const CONSUMERS = [
  // Lot 8 : le frigo est une charge permanente, servie avant les autres pour que
  // la nourriture passe avant l'eau et les transformations.
  { id: 'frigo', run: runFridge },
  { id: 'pompe', run: runPump },
  { id: 'moulin', run: (state, dtMs) => runElectricStation(state, 'moulin', dtMs) },
  { id: 'presse', run: (state, dtMs) => runElectricStation(state, 'presse', dtMs) },
];

// Arbre v2 (Délestage intelligent) : sous le seuil de charge totale, la pompe,
// le Moulin et la Presse se mettent en pause pour garder le froid du frigo.
export function loadShedding(state) {
  const d = techFlag(state, 'delestage');
  if (!d) return false;
  const cap = state.batteries.reduce((t, b) => (b.allume && !isBroken(b) ? t + batteryCapacity(b) : t), 0);
  return cap > 0 && availableEnergy(state) * 100 < cap * d.seuil;
}

// La pompe remplit le réservoir si elle est allumée, en état, et que le
// réservoir n'est pas plein. Si l'énergie manque, elle tourne au prorata
// (au mL près : chaque mL coûte WH_PAR_L mWh).
export function runPump(state, dtMs) {
  const p = state.pompe;
  p.debit = 0;
  p.conso = 0;
  if (!p.allume || isBroken(p)) return;
  const room = tankCapacity(state) - state.eauMl;
  if (room <= 0) return;
  if (loadShedding(state)) return; // arbre v2 : délestage
  // mWh par mL × % (Pompe à haut rendement) : le coût d'un lot de mL est arrondi vers le haut.
  const kPct = DATA.PUMP.WH_PAR_L * techPct(state, 'whParLitre');
  const wanted = Math.min(perTick(pumpFlow(p), dtMs), room);
  const ml = Math.min(wanted, Math.floor((availableEnergy(state) * 100) / kPct));
  if (ml <= 0) return;
  const got = drawEnergy(state, Math.ceil((ml * kPct) / 100));
  state.eauMl += ml;
  state.jour.eau += ml;
  bumpCounter(state, 'eauMl', ml); // Lot 9
  p.debit = perSecond(ml, dtMs);
  p.conso = perSecond(got, dtMs);
  state.flux.eau = p.debit;
}

/* ---------- la boucle de simulation ---------- */

// Avance la simulation de dt secondes (converties en ms entières) : flux
// (production, stockage, consommation, préparations), usure, puis le temps d'éveil.
// Lot 11 : les trois phases sont séparées pour que la progression hors-ligne
// réutilise exactement les mêmes flux, sans l'usure (voir simulateOffline).
// Version 1.1.1 : `horlogeArretee` (le joueur lit le résumé du réveil) : tout
// continue de tourner, mais l'heure n'avance pas ; la journée commence quand il
// ferme le résumé.
export function tick(state, dt, horlogeArretee = false) {
  const dtMs = Math.round((Number(dt) || 0) * 1000);
  if (!(dtMs > 0)) return state;
  flowStep(state, dtMs);
  wearStep(state, dtMs);

  // e. temps d'éveil (l'heure s'en déduit)
  if (!horlogeArretee) state.awakeMs += dtMs;
  refreshUnlocks(state); // Lot 7 : l'arbre des technologies s'ouvre à 100 pièces
  noteEnergyRecord(state); // Lot 9 : record d'énergie stockée, puis objectifs du chapitre
  updateChapters(state);
  return state;
}

// Phases a à c de tick : production, stockage, consommateurs, Four et Cuisine.
// Les quantités du pas (mWh) deviennent des puissances (mWh/s) pour l'affichage.
export function flowStep(state, dtMs) {
  for (const b of state.batteries) {
    b.entree = 0;
    b.sortie = 0;
  }
  state.flux.eau = 0;

  // a. production : le panneau allumé et non en panne, seulement au soleil
  // (version 1.6 : de 7 h à 19 h ; un pas qui chevauche 7 h ou 19 h produit au prorata)
  let produced = 0;
  const sun = sunlitMs(state.awakeMs, dtMs);
  for (const p of state.panneaux) {
    p.prod = 0;
    if (p.allume && !isBroken(p) && sun > 0) {
      const e = perTick(panelOutput(p, state), sun);
      produced += e;
      p.prod = perSecond(e, dtMs);
    }
  }

  // b. stockage : batteries remplies l'une après l'autre ; version 1.12 : le reste
  // alimente directement les consommateurs de ce pas, puis il est perdu
  state.flux.direct = storeEnergy(state, produced);
  state.jour.produite += produced;

  // c. consommation : chaque consommateur tire sur ce reste, puis sur les batteries
  for (const c of CONSUMERS) c.run(state, dtMs);
  const lost = Math.max(0, state.flux.direct);
  state.flux.direct = 0;
  state.jour.perdue += lost;
  state.flux.perdue = perSecond(lost, dtMs);

  // c bis. Lot 5 : le Four et la Cuisine n'ont pas besoin d'électricité
  runCooking(state, dtMs);

  // les quantités du tick deviennent des puissances (mWh/s)
  for (const b of state.batteries) {
    b.entree = perSecond(b.entree, dtMs);
    b.sortie = perSecond(b.sortie, dtMs);
  }
}

// Phase d de tick : l'usure, seulement pour un appareil qui a réellement
// fonctionné pendant le pas (d'après les puissances laissées par flowStep).
export function wearStep(state, dtMs) {
  // Arbre v2 (Entretien préventif) : usure à 75 % → un point demande plus de marche.
  const msParPoint = Math.floor((DATA.WEAR.HEURES_PAR_POINT * DATA.TIME.SECONDS_PER_HOUR * 1000 * 100) / techPct(state, 'usure'));
  for (const d of allDevices(state)) {
    let worked = false;
    if (d.type === 'panneau') worked = d.prod > 0;
    else if (d.type === 'batterie') worked = d.entree > 0 || d.sortie > 0;
    else if (d.type === 'pompe') worked = d.debit > 0;
    else if (d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo') worked = d.conso > 0; // Lots 5 et 8 : il tourne vraiment
    if (!worked) continue;
    d.usureMs = (d.usureMs || 0) + dtMs;
    const points = Math.floor(d.usureMs / msParPoint);
    d.usureMs -= points * msParPoint;
    d.usure = Math.min(DATA.WEAR.BREAKDOWN, d.usure + points);
    if (isBroken(d)) {
      d.usure = DATA.WEAR.BREAKDOWN;
      d.allume = false;
    }
  }
}

/* ---------- synthèses pour l'interface (fonctions pures) ---------- */

export function energyStats(state) {
  const producing = state.panneaux.filter((p) => p.allume && !isBroken(p));
  const s = {
    production: state.panneaux.reduce((t, p) => t + p.prod, 0),
    panneauxEnMarche: producing.length,
    panneauxTotal: state.panneaux.length,
    panneauxAEntretenir: state.panneaux.filter(needsService).length,
    panneauxEnPanne: state.panneaux.filter(isBroken).length,
    charge: state.batteries.reduce((t, b) => t + b.chargeMwh, 0),
    capacite: state.batteries.reduce((t, b) => t + batteryCapacity(b), 0),
    entree: state.batteries.reduce((t, b) => t + b.entree, 0),
    sortie: state.batteries.reduce((t, b) => t + b.sortie, 0),
    batteriesAEntretenir: state.batteries.filter(needsService).length,
    batteriesEnPanne: state.batteries.filter(isBroken).length,
  };
  s.net = s.entree - s.sortie;
  return s;
}

// État affichable d'un appareil : { code, label, badge }.
export function deviceStatus(state, d) {
  let code;
  let label;
  if (isBroken(d)) {
    code = 'panne';
    label = 'En panne';
  } else if (!d.allume) {
    code = 'arret';
    label = 'À l\'arrêt';
  } else if (d.type === 'panneau') {
    code = 'marche';
    label = 'En marche';
  } else if (d.type === 'batterie') {
    const net = d.entree - d.sortie;
    if (net < 0) { code = 'decharge'; label = 'En décharge'; }
    else if (net > 0) { code = 'charge'; label = 'En charge'; }
    else if (d.chargeMwh * 100 >= batteryCapacity(d) * DATA.GRID.batterie.pleine) { code = 'pleine'; label = 'Pleine'; }
    else if (d.chargeMwh <= 0) { code = 'vide'; label = 'Vide'; }
    else { code = 'attente'; label = 'En attente'; }
  } else if (d.type === 'frigo') {
    if (state.frigo.alimente) { code = 'marche'; label = 'Alimenté'; }
    else { code = 'attente'; label = 'Hors tension'; }
  } else if (d.type === 'moulin' || d.type === 'presse') {
    const job = state.stations[d.type].tache;
    if (!job) { code = 'repos'; label = 'Au repos'; }
    else if (d.conso > 0) { code = 'marche'; label = 'En marche'; }
    else { code = 'attente'; label = 'En pause : énergie manquante'; }
  } else {
    if (state.eauMl >= tankCapacity(state)) { code = 'plein'; label = 'Réservoir plein'; }
    else if (d.debit > 0) { code = 'marche'; label = 'En marche'; }
    else { code = 'attente'; label = 'En attente d\'énergie'; }
  }
  return { code, label, badge: needsService(d) ? 'À entretenir' : '' };
}
