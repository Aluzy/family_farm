import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, spend } from './devices.js';
import { countItem, lotRank, lotsOf, takeItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { isUnlocked } from './campaign.js';

/* ---------- version 1.14 (v2, lot 10) : le commerce du niveau 10 ---------- */

// state.commerce = { type, niveau, quota } : type null tant qu'aucun commerce n'est
// choisi ; niveau 1 à CAPACITE.length ; quota : transformations voulues par nuit.
export function newCommerce() {
  return { type: null, niveau: 1, quota: DATA.COMMERCE.CAPACITE[0] };
}

export function commerceDef(type) {
  return DATA.COMMERCE.TYPES[type] || null;
}

export function commerceCapacity(state) {
  const C = DATA.COMMERCE;
  return C.CAPACITE[Math.min(C.CAPACITE.length, Math.max(1, state.commerce.niveau)) - 1];
}

// Prix du niveau suivant, ou null au niveau maximum.
export function commerceUpgradeCost(state) {
  const n = state.commerce.niveau;
  return n < DATA.COMMERCE.COUT.length ? DATA.COMMERCE.COUT[n] : null;
}

// Prix pour choisir ce commerce : gratuit la première fois, CHANGER ensuite.
export function commerceChoiceCost(state, type) {
  const cur = state.commerce.type;
  if (!cur) return 0;
  return cur === type ? null : DATA.COMMERCE.CHANGER;
}

// Matière disponible pour un commerce (inventaire seulement).
export function commerceStock(state, type) {
  const def = commerceDef(type);
  return def ? def.prend.reduce((n, item) => n + countItem(state, item), 0) : 0;
}

// Choisit (ou change) le commerce. Le changement coûte CHANGER ; le niveau reste.
export function chooseCommerce(state, type) {
  const def = commerceDef(type);
  if (!def) return fail('Ce commerce n\'existe pas.');
  if (!isUnlocked(state, 'commerce')) return fail(`Disponible au niveau ${DATA.NIVEAUX.liste.findIndex((n) => (n.debloque || []).includes('commerce')) + 1}.`);
  const cost = commerceChoiceCost(state, type);
  if (cost === null) return fail(`${def.le[0].toUpperCase()}${def.le.slice(1)} est déjà ton commerce.`);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  if (cost) spend(state, cost);
  const premier = !state.commerce.type;
  state.commerce.type = type;
  if (premier) state.commerce.quota = commerceCapacity(state);
  return { ok: true, type, cost };
}

export function upgradeCommerce(state) {
  if (!state.commerce.type) return fail('Choisis d\'abord un commerce.');
  const cost = commerceUpgradeCost(state);
  if (cost === null) return fail('Le commerce est au niveau maximum.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  const plein = state.commerce.quota >= commerceCapacity(state);
  state.commerce.niveau += 1;
  if (plein) state.commerce.quota = commerceCapacity(state); // un quota au maximum suit la capacité
  return { ok: true, cost, niveau: state.commerce.niveau, capacite: commerceCapacity(state) };
}

// Transformations voulues par nuit, de 0 à la capacité.
export function setCommerceQuota(state, n) {
  const q = Math.max(0, Math.min(commerceCapacity(state), Math.floor(Number(n) || 0)));
  state.commerce.quota = q;
  return { ok: true, quota: q };
}

// Combien de transformations le commerce ferait avec le stock actuel.
export function commerceBatches(state, type = state.commerce.type) {
  const def = commerceDef(type);
  if (!def) return 0;
  const quota = type === state.commerce.type ? state.commerce.quota : commerceCapacity(state);
  return Math.min(quota, Math.floor(commerceStock(state, type) / def.par));
}

// Étape nocturne (après le repas, la production de la nuit et les préparations) :
// le commerce prend sa matière, les lots qui périment le plus tôt d'abord, et vend.
export function commerceNight(state) {
  const rap = { type: state.commerce ? state.commerce.type : null, n: 0, pieces: 0 };
  if (state.nuit) state.nuit.commerce = rap;
  const def = rap.type && commerceDef(rap.type);
  if (!def) return rap;
  const n = commerceBatches(state);
  if (n <= 0) return rap;
  let reste = n * def.par;
  while (reste > 0) {
    // l'item dont le lot le plus ancien périme le plus tôt
    let best = null;
    for (const item of def.prend) {
      const lots = lotsOf(state, item);
      if (!lots.length) continue;
      const r = lotRank(lots[0]);
      if (!best || r < best.r) best = { item, r };
    }
    if (!best) break;
    const lot = lotsOf(state, best.item)[0];
    reste -= takeItem(state, best.item, Math.min(reste, lot.qty));
  }
  const pieces = n * def.prix;
  state.pieces += pieces;
  gainActionXp(state, 'vendre', pieces);
  rap.n = n;
  rap.pieces = pieces;
  return rap;
}
