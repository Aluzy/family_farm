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
  const def = DATA.OBJETS[item];
  if (def && DATA.CONSERVATION_CATEGORIE[def.categorie] !== undefined) return DATA.CONSERVATION_CATEGORIE[def.categorie];
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
  const def = DATA.OBJETS[item];
  const byCategory = def ? DATA.ORIGINE.PAR_CATEGORIE[def.categorie] : undefined;
  return byCategory || DATA.ORIGINE.PRODUIT;
}

/* -- les lots, dans un rangement { item: [lots] } : l'inventaire ou le frigo (fridge.js) -- */

function newLot(qty, nightsLeft, origin) {
  return { qty, nightsLeft, origin };
}

// Un lot à conservation pleine, d'origine par défaut (inventaire de départ, migrations).
export function freshLot(item, qty) {
  return newLot(qty, shelfLife(item), defaultOrigin(item));
}

// Un rangement fait de quantités { item: quantité } : un lot frais par objet.
export function lotsFromCounts(counts) {
  const store = {};
  for (const [item, qty] of Object.entries(counts)) store[item] = [freshLot(item, qty)];
  return store;
}

// Les lots d'un objet dans un rangement (absent : aucun).
export function lotList(store, item) {
  const lots = store ? store[item] : null;
  return Array.isArray(lots) ? lots : [];
}

// Range la liste de lots d'un objet, ou retire l'objet si elle est vide.
function storeLots(store, item, lots) {
  if (lots.length) store[item] = lots;
  else if (store) delete store[item];
}

// La même chose, sans les lots vidés (après un retrait).
export function keepLots(store, item, lots) {
  storeLots(store, item, lots.filter((l) => l.qty > 0));
}

export function lotsOf(state, item) {
  return lotList(state.inventaire, item);
}

// Rang d'un lot pour l'ordre de retrait : moins il lui reste de nuits, plus
// il est « ancien ». Un lot qui ne périme pas passe en dernier.
export function lotRank(lot) {
  return lot.nightsLeft === null ? Infinity : lot.nightsLeft;
}

// Ordre des lots : le plus ancien en tête (tri stable).
function compareLots(a, b) {
  return lotRank(a) === lotRank(b) ? 0 : lotRank(a) < lotRank(b) ? -1 : 1;
}

// Retire jusqu'à `qty` unités d'une liste de lots (le plus ancien d'abord) et
// renvoie les morceaux retirés, avec leur conservation et leur origine (les lots
// vidés restent dans la liste : voir keepLots).
export function pullLots(lots, qty) {
  const out = [];
  let rest = qty;
  for (const lot of lots) {
    if (rest <= 0) break;
    const n = Math.min(lot.qty, rest);
    if (n > 0) {
      out.push(newLot(n, lot.nightsLeft, lot.origin));
      lot.qty -= n;
      rest -= n;
    }
  }
  return out;
}

// Range des morceaux dans une liste de lots, en les fusionnant s'ils ont la même
// conservation et la même origine ; le plus ancien reste en tête.
export function pushLots(lots, pulled) {
  for (const p of pulled) {
    const same = lots.find((l) => l.nightsLeft === p.nightsLeft && l.origin === p.origin);
    if (same) same.qty += p.qty;
    else lots.push({ ...p });
  }
  lots.sort(compareLots);
}

// Fait vieillir de `nuits` nuits les lots qui périment d'un rangement : ceux qui arrivent
// à 0 sont perdus et comptés dans `perdus` ({ item: quantité }), qui est renvoyé.
export function ageLots(store, nuits, perdus) {
  for (const item of Object.keys(store)) {
    const kept = [];
    for (const lot of lotList(store, item)) {
      if (lot.nightsLeft === null) {
        kept.push(lot);
        continue;
      }
      lot.nightsLeft -= nuits;
      if (lot.nightsLeft <= 0) perdus[item] = (perdus[item] || 0) + lot.qty;
      else kept.push(lot);
    }
    storeLots(store, item, kept);
  }
  return perdus;
}

/* -- l'inventaire -- */

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
    lots.push(newLot(qty, nightsLeft, origin));
    lots.sort(compareLots);
  }
  state.inventaire[item] = lots;
}

export function addItem(state, item, qty) {
  if (!DATA.OBJETS[item] || !(qty > 0)) return 0;
  addLot(state, item, qty, defaultOrigin(item));
  return qty;
}

// Retire jusqu'à `qty` unités, toujours dans le lot le plus ancien, et renvoie
// le nombre réellement retiré. Lot 9 : si `out` est un tableau, il reçoit les
// morceaux retirés { qty, origin } (l'autonomie compte l'origine des repas).
export function takeItem(state, item, qty, out = null) {
  const n = Math.min(countItem(state, item), qty);
  if (!(n > 0)) return 0;
  const lots = lotsOf(state, item);
  const pulled = pullLots(lots, n);
  if (out) for (const p of pulled) out.push({ qty: p.qty, origin: p.origin });
  keepLots(state.inventaire, item, lots);
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
  const perdus = ageLots(state.inventaire, 1, {});
  // (la boîte à nourriture ne garde pas au frais : ce qu'elle contient périme aussi)
  if (state.boite && state.boite.items) ageLots(state.boite.items, 1, perdus);
  if (!state.nuit.perdus) state.nuit.perdus = {};
  for (const [item, n] of Object.entries(perdus)) {
    state.nuit.perdus[item] = (state.nuit.perdus[item] || 0) + n;
  }
  return perdus;
}
