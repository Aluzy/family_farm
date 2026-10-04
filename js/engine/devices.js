import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { currentSeason, seasonFactor } from './seasons.js';
import { techFlag } from './techtree.js';

/* ---------- appareils : fabrication et sélecteurs ---------- */

export function newDayStats() {
  // produite, perdue : mWh ; eau : mL pompés ; ble : blé mangé par les poules
  // pendant la journée (Lot 4) ; soins : soins payés pendant la journée (Lot 9).
  return { produite: 0, perdue: 0, eau: 0, ble: 0, soins: 0 };
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

// Parc et réserves de départ : 1 panneau, 1 batterie, la pompe et le réservoir.
// Les appareils sont des listes d'objets ; la pompe est un appareil unique ;
// le réservoir n'est pas un appareil (`eauMl` = son contenu en mL).
export function startFarm() {
  const prix = DATA.START.DEVICE_PRICE;
  return {
    compteurs: { panneau: 1, batterie: 1 },
    panneaux: [makeDevice('panneau', 'panneau-1', prix)],
    batteries: [makeDevice('batterie', 'batterie-1', prix)],
    pompe: makeDevice('pompe', 'pompe', prix),
    eauMl: 0,
    flux: { perdue: 0, eau: 0 }, // mWh/s perdus, mL/s reçus par le réservoir au dernier tick
    jour: newDayStats(),
    report: null,
  };
}

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
// Lot 8 : avec `state`, le facteur solaire de la saison s'y applique.
export function panelOutput(d, state) {
  const base = Math.floor((DATA.GRID.panneau.whParS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
  return state ? Math.floor((base * solarFactor(state)) / 100) : base;
}

// Facteur solaire de la saison (%) ; les Panneaux orientables relèvent l'hiver.
export function solarFactor(state) {
  const f = seasonFactor(state, 'solaire');
  const hiver = currentSeason(state) === 'hiver' ? techFlag(state, 'solaireHiver') : null;
  return hiver ? Math.max(f, hiver) : f;
}

// Capacité utile d'une batterie (mWh) : capacité(niveau) × rendement.
export function batteryCapacity(d) {
  return Math.floor((DATA.GRID.batterie.wh[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Débit de la pompe (mL/s) selon son niveau et son rendement.
export function pumpFlow(d) {
  return Math.floor((DATA.GRID.pompe.litresPerS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Capacité du réservoir (mL).
export function tankCapacity(state) {
  return DATA.GRID.pompe.reservoirL[state.pompe.niveau - 1] * 1000;
}

// Prix du n-ième appareil d'un type, n étant le nombre déjà possédé.
export function purchasePrice(type, owned) {
  const p = DATA.PURCHASE[type];
  return growthPrice(p.base, p.growth, owned);
}

export function nextPurchasePrice(state, type) {
  const owned = type === 'panneau' ? state.panneaux.length : state.batteries.length;
  return purchasePrice(type, owned);
}

export function maintainCost(d) {
  return percentCeil(d.prix, DATA.WEAR.MAINTAIN_RATE);
}

export function repairCost(d) {
  return percentCeil(d.prix, DATA.WEAR.REPAIR_RATE);
}

// Le Moulin et la Presse n'ont pas de niveaux : pas d'amélioration (null).
export function upgradeCost(d) {
  if (!DATA.GRID[d.type]) return null;
  return d.niveau >= DATA.LEVEL_MAX ? null : DATA.UPGRADE_COST[d.niveau];
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
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  d.allume = !d.allume;
  if (!d.allume && (d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo')) d.conso = 0;
  return { ok: true };
}

export function buyDevice(state, type) {
  if (type !== 'panneau' && type !== 'batterie') return fail('Type d\'appareil inconnu.');
  const price = nextPurchasePrice(state, type);
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  state.compteurs[type] += 1;
  const d = makeDevice(type, `${type}-${state.compteurs[type]}`, price);
  (type === 'panneau' ? state.panneaux : state.batteries).push(d);
  return { ok: true, device: d, price };
}

export function upgradeDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!DATA.GRID[d.type]) return fail('Cet appareil n\'a pas de niveaux.');
  const cost = upgradeCost(d);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  d.niveau += 1;
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
