import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { techFlag } from './techtree.js';

/* ---------- appareils : fabrication et sélecteurs ---------- */

export function newDayStats() {
  // produite, perdue : mWh ; eau : mL pompés ; ble : blé mangé par les poules
  // pendant la journée (Lot 4). Version 1.8 : plus de soins.
  return { produite: 0, perdue: 0, eau: 0, ble: 0 };
}

// Unités entières du moteur : le temps en ms, l'énergie en mWh, l'eau en mL.
// Une quantité par seconde (mWh/s, mL/s) × une durée en ms → ⌊taux × ms ÷ 1 000⌋.
export function perTick(rate, dtMs) {
  return Math.floor((rate * dtMs) / 1000);
}

// Taux par seconde (arrondi vers le bas) d'une quantité écoulée en `dtMs` ms.
export function perSecond(amount, dtMs) {
  return dtMs > 0 ? Math.floor((amount * 1000) / dtMs) : 0;
}

export function makeDevice(type, id, prix) {
  // usure : points entiers ; usureMs : temps de marche (ms) depuis le dernier point.
  const d = { id, type, niveau: 1, allume: true, usure: 0, usureMs: 0, prix };
  if (type === 'batterie') {
    d.chargeMwh = 0;
    d.entree = 0; // mWh/s reçus au dernier tick
    d.sortie = 0; // mWh/s soutirés au dernier tick
  } else if (type === 'panneau') {
    d.prod = 0; // mWh/s produits au dernier tick
  } else if (type === 'pompe') {
    d.debit = 0; // mL/s réellement pompés au dernier tick
    d.conso = 0; // mWh/s consommés au dernier tick
  } else if (type === 'moulin' || type === 'presse' || type === 'frigo') {
    d.conso = 0; // mWh/s consommés au dernier tick (0 en pause ou au repos)
  }
  return d;
}

// Appareils des stations électriques déjà construites (Moulin, Presse).
export function stationDevices(state) {
  if (!state.stations) return [];
  return Object.keys(DATA.STATIONS)
    .filter((id) => DATA.STATIONS[id].electrique && state.stations[id] && state.stations[id].appareil)
    .map((id) => state.stations[id].appareil);
}

// Appareils et réserves de départ : le panneau, la batterie, la pompe et le
// réservoir. Version 1.6 : un seul panneau et une seule batterie, qui montent de
// niveau ; `panneaux` et `batteries` restent des listes (d'un seul appareil) pour
// que le flux d'énergie garde sa forme. Le réservoir n'est pas un appareil (ni
// usure, ni interrupteur) : `reservoir.niveau` fixe sa capacité, `eauMl` est son
// contenu en mL.
export function startFarm() {
  const prix = DATA.START.DEVICE_PRICE;
  return {
    panneaux: [makeDevice('panneau', 'panneau-1', prix)],
    batteries: [makeDevice('batterie', 'batterie-1', prix)],
    pompe: makeDevice('pompe', 'pompe', prix),
    reservoir: { niveau: 1 },
    eauMl: 0,
    flux: { perdue: 0, eau: 0 }, // mWh/s perdus, mL/s reçus par le réservoir au dernier tick
    jour: newDayStats(),
    report: null,
  };
}

/* ---------- version 1.12 (v2, lot 8) : appareils de départ à acheter ---------- */

// Le panneau, la batterie, la pompe et le réservoir d'une nouvelle partie portent
// `achete: false` jusqu'à leur achat (voir depart.js) ; une ancienne partie ou une
// partie de test n'a pas ce champ : tout y est acheté.
export function starterOf(state, type) {
  if (type === 'panneau') return state.panneaux[0];
  if (type === 'batterie') return state.batteries[0];
  if (type === 'pompe') return state.pompe;
  if (type === 'reservoir') return state.reservoir;
  return null;
}

export function isOwned(obj) {
  return !!obj && obj.achete !== false;
}

// Panneau ET pompe achetés : la Zone de culture, le Marché et le réservoir s'ouvrent.
export function farmOpen(state) {
  return isOwned(starterOf(state, 'panneau')) && isOwned(starterOf(state, 'pompe'));
}

export const NOT_OWNED = 'Cet appareil n\'est pas encore acheté.';

// Lot 8 : le réfrigérateur est un appareil du parc une fois construit.
export function fridgeDevices(state) {
  return state.frigo && state.frigo.construit && state.frigo.appareil ? [state.frigo.appareil] : [];
}

export function allDevices(state) {
  return [...state.panneaux, ...state.batteries, state.pompe, ...stationDevices(state), ...fridgeDevices(state)];
}

export function findDevice(state, id) {
  return allDevices(state).find((d) => d.id === id) || null;
}

// Rendement d'un appareil en % entier : 100 − ⌊usure ÷ 2⌋.
export function efficiency(d) {
  return 100 - Math.floor((d.usure * 100) / DATA.WEAR.EFFICIENCY_DIVISOR);
}

export function isBroken(d) {
  return d.usure >= DATA.WEAR.BREAKDOWN;
}

export function needsService(d) {
  return !isBroken(d) && d.usure >= DATA.WEAR.SERVICE_THRESHOLD;
}

// Production d'un panneau à son niveau et son usure actuels (mWh/s entiers).
// Avec `state`, le bonus solaire de l'arbre (Panneaux orientables) s'y applique.
export function panelOutput(d, state) {
  const base = Math.floor((DATA.GRID.panneau.whParS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
  return state ? Math.floor((base * solarFactor(state)) / 100) : base;
}

// Facteur solaire (%) : 100, ou le bonus des Panneaux orientables (version 1.6 :
// plus de saisons, le nœud donne un bonus toute l'année).
export function solarFactor(state) {
  return techFlag(state, 'solaireBonus') || 100;
}

// Capacité utile d'une batterie (mWh) : capacité(niveau) × rendement.
export function batteryCapacity(d) {
  return Math.floor((DATA.GRID.batterie.wh[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Débit de la pompe (mL/s) selon son niveau et son rendement.
export function pumpFlow(d) {
  return Math.floor((DATA.GRID.pompe.litresPerS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Capacité du réservoir (mL), selon son propre niveau.
export function tankCapacity(state) {
  if (!isOwned(state.reservoir)) return 0; // version 1.12 : pas encore acheté
  return DATA.GRID.reservoir.litres[state.reservoir.niveau - 1] * 1000;
}

// Part (ms) d'une période de l'horloge, de `fromMs` à `fromMs + dtMs` (temps
// d'éveil), où le soleil brille : entre SOLEIL.DEBUT h et SOLEIL.FIN h, chaque jour
// de l'horloge (elle repasse à 0 h si personne ne dort).
export function sunlitMs(fromMs, dtMs) {
  const hourMs = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  const dayMs = 24 * hourMs;
  const debut = (DATA.SOLEIL.DEBUT - DATA.TIME.DAY_START_HOUR) * hourMs;
  const fin = (DATA.SOLEIL.FIN - DATA.TIME.DAY_START_HOUR) * hourMs;
  let lit = 0;
  const end = fromMs + dtMs;
  for (let day = Math.floor(fromMs / dayMs) * dayMs; day < end; day += dayMs) {
    lit += Math.max(0, Math.min(end, day + fin) - Math.max(fromMs, day + debut));
  }
  return lit;
}

export function maintainCost(d) {
  return percentCeil(d.prix, DATA.WEAR.MAINTAIN_RATE);
}

export function repairCost(d) {
  return percentCeil(d.prix, DATA.WEAR.REPAIR_RATE);
}

// Coût du niveau suivant d'un appareil (ou du réservoir : { type: 'reservoir',
// niveau }). Le Moulin, la Presse et le frigo n'ont pas de niveaux (null).
export function upgradeCost(d) {
  if (!DATA.GRID[d.type]) return null;
  return d.niveau >= DATA.LEVEL_MAX ? null : DATA.UPGRADE_COST[d.type][d.niveau];
}

// Pièces entières : tout prix calculé est arrondi à l'entier supérieur.
// percentCeil(x, p) = ⌈x × p ÷ 100⌉, en arithmétique entière.
export function percentCeil(x, pct) {
  const num = BigInt(Math.round(x)) * BigInt(Math.round(pct));
  return Number((num + 99n) / 100n);
}

// Prix croissant : ⌈base × (pct ÷ 100)^n⌉, calculé exactement en entiers
// (BigInt) pour éviter toute dérive des puissances décimales.
export function growthPrice(base, pct, n) {
  const k = Math.max(0, Math.floor(n));
  const num = BigInt(Math.round(base)) * BigInt(Math.round(pct)) ** BigInt(k);
  const den = 100n ** BigInt(k);
  return Number((num + den - 1n) / den);
}

/* ---------- actions du moteur ---------- */

export function fail(error) {
  return { ok: false, error };
}

export function spend(state, cost) {
  state.pieces = Math.round(state.pieces - cost);
}

export function toggleDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isOwned(d)) return fail(NOT_OWNED);
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  d.allume = !d.allume;
  if (!d.allume && (d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo')) d.conso = 0;
  return { ok: true };
}

export function upgradeDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isOwned(d)) return fail(NOT_OWNED);
  if (!DATA.GRID[d.type]) return fail('Cet appareil n\'a pas de niveaux.');
  const cost = upgradeCost(d);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.niveau += 1;
  return { ok: true, cost };
}

// Le réservoir monte de niveau (version 1.6 : il ne suit plus la pompe).
export function upgradeTank(state) {
  if (!isOwned(state.reservoir)) return fail('Le réservoir n\'est pas encore acheté.');
  const cost = upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau });
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.reservoir.niveau += 1;
  return { ok: true, cost };
}

export function maintainDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  if (d.usure <= 0 && !(d.usureMs > 0)) return fail('Cet appareil n\'est pas usé.');
  const cost = maintainCost(d);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.usure = 0;
  d.usureMs = 0;
  return { ok: true, cost };
}

// Une réparation remet l'usure à 0 ; l'appareil reste éteint : c'est au
// joueur de le rallumer.
export function repairDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isBroken(d)) return fail('Cet appareil n\'est pas en panne.');
  const cost = repairCost(d);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.usure = 0;
  d.usureMs = 0;
  d.allume = false;
  return { ok: true, cost };
}
