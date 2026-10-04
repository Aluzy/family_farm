import { DATA } from './catalog.js';
import { techSum } from './techtree.js';

/* ---------- Lots 2 et 3 : inventaire par lots ---------- */

// state.inventaire = { item: [ { qty, nightsLeft, origin } ] }, les lots étant
// rangés du plus ancien au plus récent. nightsLeft vaut null pour un item qui
// ne périme pas. origin vaut « produit » ou « acheté ». Tout le reste du code
// passe uniquement par countItem, addItem et takeItem (et par buyItem au
// Marché, qui pose l'origine « acheté »).

// Conservation d'un item en nuits, ou null s'il ne périme jamais.
export function shelfLife(item) {
  if (DATA.CONSERVATION[item] !== undefined) return DATA.CONSERVATION[item];
  const def = DATA.items[item];
  if (def && DATA.CONSERVATION_CATEGORIE[def.category] !== undefined) return DATA.CONSERVATION_CATEGORIE[def.category];
  return null;
}

export function isPerishable(item) {
  return shelfLife(item) !== null;
}

// Ce qui peut aller au réfrigérateur : tout ce qui périme, sauf le blé, qui se
// conserve au Silo (où il ne périme pas) et pas au frais.
export function isFridgeable(item) {
  return isPerishable(item) && item !== DATA.SILO.ITEM;
}

// Origine d'un lot ajouté sans précision : « produit », sauf les conserves.
export function defaultOrigin(item) {
  const def = DATA.items[item];
  const byCategory = def ? DATA.ORIGINE.PAR_CATEGORIE[def.category] : undefined;
  return byCategory || DATA.ORIGINE.PRODUIT;
}

export function lotsOf(state, item) {
  const lots = state.inventaire[item];
  return Array.isArray(lots) ? lots : [];
}

// Rang d'un lot pour l'ordre de retrait : moins il lui reste de nuits, plus
// il est « ancien ». Un lot qui ne périme pas passe en dernier.
export function lotRank(lot) {
  return lot.nightsLeft === null ? Infinity : lot.nightsLeft;
}

export function countItem(state, item) {
  return lotsOf(state, item).reduce((t, lot) => t + lot.qty, 0);
}

// Quantités totales par item : { item: quantité }, sans les items à zéro.
export function inventoryCounts(state) {
  const out = {};
  for (const item of Object.keys(state.inventaire)) {
    const n = countItem(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Ajoute un lot à conservation pleine ; il rejoint le lot existant de même
// origine et de même fraîcheur.
export function addLot(state, item, qty, origin) {
  // arbre v2 (Cellier) : ce qui périme se garde plus longtemps
  const base = shelfLife(item);
  const nightsLeft = base === null ? null : base + techSum(state, 'conservation');
  const lots = lotsOf(state, item);
  const same = lots.find((l) => l.nightsLeft === nightsLeft && l.origin === origin);
  if (same) {
    same.qty += qty;
  } else {
    lots.push({ qty, nightsLeft, origin });
    lots.sort((a, b) => (lotRank(a) === lotRank(b) ? 0 : lotRank(a) < lotRank(b) ? -1 : 1));
  }
  state.inventaire[item] = lots;
}

export function addItem(state, item, qty) {
  if (!DATA.items[item] || !(qty > 0)) return 0;
  addLot(state, item, qty, defaultOrigin(item));
  return qty;
}

// Retire jusqu'à `qty` unités, toujours dans le lot le plus ancien, et renvoie
// le nombre réellement retiré. Lot 9 : si `out` est un tableau, il reçoit les
// morceaux retirés { qty, origin } (l'autonomie compte l'origine des repas).
export function takeItem(state, item, qty, out = null) {
  const n = Math.min(countItem(state, item), qty);
  if (!(n > 0)) return 0;
  let rest = n;
  const lots = lotsOf(state, item);
  for (const lot of lots) {
    const taken = Math.min(lot.qty, rest);
    lot.qty -= taken;
    rest -= taken;
    if (out && taken > 0) out.push({ qty: taken, origin: lot.origin });
    if (rest <= 0) break;
  }
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.inventaire[item] = kept;
  else delete state.inventaire[item];
  return n;
}

// Nuits restantes du lot le plus ancien d'un item (Infinity s'il n'y en a pas
// ou s'il ne périme pas).
export function nextExpiry(state, item) {
  const lots = lotsOf(state, item);
  return lots.length ? lotRank(lots[0]) : Infinity;
}

// Quantités qui périmeront à la prochaine nuit (il leur reste 1 nuit).
export function expiringSoon(state) {
  const out = {};
  for (const item of Object.keys(state.inventaire)) {
    const n = lotsOf(state, item)
      .filter((l) => l.nightsLeft === 1)
      .reduce((t, l) => t + l.qty, 0);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Étape nocturne de péremption, toujours la dernière : retire une nuit à chaque
// lot qui périme, supprime ceux qui arrivent à 0 et note les pertes dans le
// rapport de la nuit. Renvoie les pertes : { item: quantité }.
export function spoil(state) {
  const perdus = {};
  for (const item of Object.keys(state.inventaire)) {
    const kept = [];
    for (const lot of lotsOf(state, item)) {
      if (lot.nightsLeft === null) {
        kept.push(lot);
        continue;
      }
      lot.nightsLeft -= 1;
      if (lot.nightsLeft <= 0) perdus[item] = (perdus[item] || 0) + lot.qty;
      else kept.push(lot);
    }
    if (kept.length) state.inventaire[item] = kept;
    else delete state.inventaire[item];
  }
  if (!state.nuit.perdus) state.nuit.perdus = {};
  for (const [item, n] of Object.entries(perdus)) {
    state.nuit.perdus[item] = (state.nuit.perdus[item] || 0) + n;
  }
  return perdus;
}
