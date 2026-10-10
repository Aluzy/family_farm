import { DATA } from './catalog.js';
import { EPS } from './base.js';
import {
  allDevices, batteryCapacity, farmOpen, isBroken, isOwned, maintainDevice, needsService, panelOutput, pumpFlow,
  repairDevice, sunlitMs, tankCapacity, toggleDevice, upgradeCost, upgradeDevice, upgradeTank,
} from './devices.js';
import { fridgeRate } from './fridge.js';
import { eatSnack, planMeal } from './family.js';
import { actionCost, energyMax } from './stamina.js';
import { countItem } from './inventory.js';
import { allPlots, waterCost } from './crops.js';
import { isAutomated } from './automation.js';

// Texte sûr à écrire dans une page : les caractères spéciaux du HTML sont
// remplacés. À utiliser pour tout texte saisi par le joueur (les prénoms).
export function escapeHtml(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Formatage des nombres à la française : toujours un entier, avec une espace
// tous les 3 chiffres (« 80 000 », « 1 234 567 »), jamais de décimale.
// Fonction pure : elle vit dans ENGINE pour rester testable par Node, même
// si c'est l'app qui l'utilise pour l'affichage.
export function formatNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  const r = Math.round(n);
  const sign = r < 0 ? '-' : '';
  return sign + groupThousands(Math.abs(r));
}

// Groupe un entier positif par milliers avec des espaces : 1234 -> "1 234".
export function groupThousands(intValue) {
  const s = String(Math.trunc(intValue));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const posFromEnd = s.length - i;
    out += s[i];
    if (posFromEnd > 1 && posFromEnd % 3 === 1) out += ' ';
  }
  return out;
}

// Nombre signé avec le vrai signe moins : « +5 », « −20 », « 0 ».
export function formatSigned(n) {
  const r = Math.round(Number(n) || 0);
  if (r === 0) return '0';
  return (r < 0 ? '−' : '+') + groupThousands(Math.abs(r));
}

// Énergie stockée (mWh) en Wh entiers, arrondis vers le bas : « 2 340 Wh ».
export function formatWh(mwh) {
  return `${formatNumber(Math.floor((Number(mwh) || 0) / 1000))} Wh`;
}

// Puissance (mWh/s) en Wh/s entiers : « 30 Wh/s » ; signée avec `signed`.
export function formatWhRate(mwhPerS, signed = false) {
  const v = Math.trunc((Number(mwhPerS) || 0) / 1000);
  return `${signed ? formatSigned(v) : formatNumber(v)} Wh/s`;
}

// Eau (mL) en litres entiers, arrondis vers le bas : « 38 L ».
export function formatLitres(ml) {
  return `${formatNumber(Math.floor((Number(ml) || 0) / 1000))} L`;
}

// Débit (mL/s) en litres par seconde, entiers : « 2 L/s ».
export function formatLitresRate(mlPerS) {
  return `${formatNumber(Math.floor((Number(mlPerS) || 0) / 1000))} L/s`;
}

// Pièces : toujours un entier (tous les prix sont arrondis à l'entier supérieur).
export function formatCoins(n) {
  return formatNumber(Math.round(Number(n) || 0));
}


// Quantité d'un stock : toujours un entier.
export function formatQty(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return formatNumber(n);
}

export function formatHour(h) {
  return `${h} h`;
}

// Lot 11 : durée d'une absence, arrondie vers le bas : « 45 s », « 12 min »,
// « 2 h 05 min », « 8 h ».
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor((Number(seconds) || 0) + EPS));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

// Pourcentage entier arrondi vers le bas (99,6 s'affiche « 99 % » : 100 % veut
// dire 100), avec une espace insécable avant le signe.
export function formatPercent(p) {
  return `${formatNumber(Math.floor((Number(p) || 0) + EPS))}\u00a0%`;
}


/* ==========================================================================
   Lot 10 : simulation d'un joueur automatique (conception, sections 8.10 et
   8.11). Le joueur automatique joue avec les vraies actions du moteur, sans
   interface : il sert au script scripts/simulate.mjs et au bouton du mode test.
   Il ne lit ni l'horloge ni Math.random : une partie simulée est entièrement
   déterminée par sa graine. Tout ce qu'il vise ou garde vit dans
   DATA.SIMULATION.
   ========================================================================== */

/* ---------- entretien, énergie, infrastructure ---------- */

// Répare ce qui est en panne (et le rallume), entretient ce qui est usé.
export function botMaintenance(state) {
  for (const d of allDevices(state)) {
    if (isBroken(d)) {
      if (repairDevice(state, d.id).ok) toggleDevice(state, d.id);
    } else if (needsService(d)) {
      maintainDevice(state, d.id);
    }
  }
}

// Version 1.8 : quand l'énergie ne suffit plus pour une récolte, le joueur mange un
// en-cas, pris seulement dans ce que le repas du soir ne mangera pas (l'aliment le
// plus nourrissant d'abord), et jamais au-delà du maximum.
export function botSnack(state) {
  for (let guard = 0; guard < 10; guard++) {
    if (state.energie >= actionCost(state, 'recolter') || state.energie >= energyMax()) return;
    const plan = planMeal(state);
    if (plan.couverture < 100) return;
    const spare = Object.keys(DATA.items)
      .filter((k) => DATA.items[k].edible && countItem(state, k) - (plan.mange[k] || 0) - (state.famille.reserve[k] || 0) >= 1)
      .sort((a, b) => DATA.items[b].energie - DATA.items[a].energie);
    if (!spare.length || !eatSnack(state, spare[0]).ok) return;
  }
}

// Eau demandée par une journée : toutes les parcelles arrosées, plus la cuisine.
export function botWaterPerDay(state) {
  const S = DATA.SIMULATION;
  let litres = S.LITRES_CUISINE;
  for (const p of allPlots(state)) litres += p.culture ? waterCost(state, p) : S.LITRES_PARCELLE;
  return litres;
}

// Énergie demandée par une journée (mWh) : pompe, réfrigérateur, Moulin et Presse.
export function botEnergyPerDay(state, eveilS) {
  let mwh = botWaterPerDay(state) * 1000 * DATA.PUMP.WH_PAR_L;
  if (state.frigo && state.frigo.construit) mwh += fridgeRate(state) * (eveilS + DATA.FRIGO.BLOC_NUIT_S);
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (DATA.STATIONS[id].electrique && st.construit) mwh += Math.floor((DATA.STATIONS[id].whParS * 1000 * eveilS * DATA.SIMULATION.MARCHE_STATIONS) / 100);
  }
  return mwh;
}

// Pompe, réservoir, panneau et batterie : le joueur ne laisse pas la ferme manquer
// d'eau ni d'énergie. Version 1.6 : un seul appareil de chaque, qu'il améliore ; le
// panneau ne produit qu'au soleil (de 7 h à 19 h), sur la part ensoleillée de son
// temps d'éveil. Renvoie la prochaine amélioration nécessaire { cost, buy }, ou
// { done: true }.
export function botInfraInfo(state, eveilS) {
  const S = DATA.SIMULATION;
  // version 1.12 : rien à améliorer avant d'avoir acheté le panneau, la pompe et le réservoir
  if (!farmOpen(state) || !isOwned(state.reservoir)) return { locked: true };
  const litres = botWaterPerDay(state);
  const pump = state.pompe;
  const needsFlow = litres * 1000 * 100 > pumpFlow(pump) * eveilS * S.MARGE_EAU;
  if (pump.niveau < DATA.LEVEL_MAX && needsFlow) return { cost: upgradeCost(pump), buy: () => upgradeDevice(state, pump.id) };
  const needsTank = isAutomated(state, 'potager') && litres * 1000 * 100 > tankCapacity(state) * S.MARGE_EAU;
  if (state.reservoir.niveau < DATA.LEVEL_MAX && needsTank) {
    return { cost: upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau }), buy: () => upgradeTank(state) };
  }

  const panel = state.panneaux[0];
  const produced = Math.floor((panelOutput(panel) * sunlitMs(0, eveilS * 1000)) / 1000);
  const need = botEnergyPerDay(state, eveilS);
  if (panel.niveau < DATA.LEVEL_MAX && produced * 100 < need * S.MARGE_ENERGIE) return { cost: upgradeCost(panel), buy: () => upgradeDevice(state, panel.id) };
  const battery = state.batteries[0];
  if (isOwned(battery) && battery.niveau < DATA.LEVEL_MAX && batteryCapacity(battery) * 100 < need * S.MARGE_BATTERIE) {
    return { cost: upgradeCost(battery), buy: () => upgradeDevice(state, battery.id) };
  }
  return { done: true };
}
