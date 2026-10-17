import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { buildWith, fail, isBroken, makeDevice, nextLevelCost, perSecond, perTick, upgradeWith } from './devices.js';
import { drawEnergy, drawNightEnergy } from './energy.js';
import {
  ageLots, countItem, isFridgeable, isPerishable, keepLots, lotList, lotRank, lotsOf, pullLots, pushLots, takeItem,
} from './inventory.js';
import { newFridgeNightStats, newNightStats } from './family.js';
import { techPct } from './techtree.js';

/* ---------- Lot 8 : réfrigérateur ---------- */

// state.frigo = { construit, appareil, items, alimenteMs, eveilMs, panneNuit, alimente }.
// items : { item: [ { qty, nightsLeft, origin } ] }, mêmes lots que l'inventaire
// mais au frais : leur nightsLeft est figé tant que le frigo est alimenté.
// alimenteMs et eveilMs : ms alimentées et ms d'éveil depuis le réveil ;
// panneNuit : le bloc nocturne n'a pas pu être payé ; alimente : le frigo a
// reçu son énergie au dernier tick (❄️ ou ⚠️ à l'écran).

export function fridgeLots(state, item) {
  return lotList(state.frigo && state.frigo.items, item);
}

export function fridgeCount(state, item) {
  return fridgeLots(state, item).reduce((t, lot) => t + lot.qty, 0);
}

// Quantités stockées au frigo : { item: quantité }.
export function fridgeCounts(state) {
  const out = {};
  if (!state.frigo || !state.frigo.items) return out;
  for (const item of Object.keys(state.frigo.items)) {
    const n = fridgeCount(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

export function fridgeUnits(state) {
  return Object.values(fridgeCounts(state)).reduce((t, n) => t + n, 0);
}

/* ---------- version 1.10 (v2, lot 6) : capacité par niveau ---------- */

export function fridgeLevel(state) {
  return state.frigo && state.frigo.construit ? Math.max(1, Number(state.frigo.niveau) || 1) : 0;
}

// Unités que le frigo peut contenir (0 s'il n'est pas construit).
export function fridgeCapacity(state) {
  const n = fridgeLevel(state);
  return n ? DATA.FRIGO.CAPACITE[Math.min(n, DATA.FRIGO.CAPACITE.length) - 1] : 0;
}

export function fridgeRoom(state) {
  return Math.max(0, fridgeCapacity(state) - fridgeUnits(state));
}

export function fridgeUpgradeCost(state) {
  const n = fridgeLevel(state);
  return n ? nextLevelCost(DATA.FRIGO.COUT, n, DATA.FRIGO.CAPACITE.length) : null;
}

export function upgradeFridge(state) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  return upgradeWith(state, fridgeUpgradeCost(state), 'Amélioration : Réfrigérateur', () => {
    state.frigo.niveau = fridgeLevel(state) + 1;
    return { niveau: state.frigo.niveau, capacite: fridgeCapacity(state) };
  });
}

// Consommation du frigo en marche (mWh/s) : base + une part par unité stockée.
export function fridgeRate(state) {
  const F = DATA.FRIGO;
  const base = F.BASE_WH_S * 1000 + F.PAR_UNITE_MWH_S * fridgeUnits(state);
  return Math.floor((base * techPct(state, 'frigoConso')) / 100); // arbre v2 : basse consommation
}

// Énergie que les batteries en service peuvent fournir (mWh).
export function availableEnergy(state) {
  const direct = state.flux && state.flux.direct > 0 ? state.flux.direct : 0; // version 1.12
  return direct + state.batteries.reduce((t, b) => (b.allume && !isBroken(b) ? t + b.chargeMwh : t), 0);
}

// Besoin du bloc nocturne (mWh) et batterie suffisante pour la nuit ?
export function fridgeNightNeed(state) {
  return fridgeRate(state) * DATA.FRIGO.BLOC_NUIT_S;
}

export function fridgeCoversNight(state) {
  return availableEnergy(state) >= fridgeNightNeed(state);
}

// Consommateur du parc, à chaque tick. Le frigo tourne si l'énergie de ce tick
// est disponible en entier ; sinon il s'arrête (les batteries sont vides).
export function runFridge(state, dtMs) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const d = f.appareil;
  d.conso = 0;
  f.eveilMs += dtMs;
  f.alimente = false;
  if (!d.allume || isBroken(d)) return;
  const need = perTick(fridgeRate(state), dtMs);
  if (availableEnergy(state) < need) return;
  const got = drawEnergy(state, need);
  d.conso = perSecond(got, dtMs);
  f.alimente = true;
  f.alimenteMs += dtMs;
}

// Déplace `qty` unités d'un aliment périssable de l'inventaire vers le frigo.
// Les lots gardent leur compteur de conservation, qui se fige au frais.
export function moveToFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  if (!DATA.items[item]) return fail('Objet inconnu.');
  if (!isPerishable(item)) return fail(`${DATA.items[item].nom} ne périme pas : inutile de le ranger au frais.`);
  if (!isFridgeable(item)) return fail(`${DATA.items[item].nom} ne se range pas au frigo : sa place est au Silo.`);
  const asked = Math.min(Math.floor(Number(qty)) || 0, Math.floor(countItem(state, item) + EPS));
  if (asked <= 0) return fail('Rien à ranger.');
  // version 1.10 : seulement ce qui tient
  const n = Math.min(asked, fridgeRoom(state));
  if (n <= 0) return fail(`Le frigo est plein (${fridgeCapacity(state)} unités).`);
  const inv = lotsOf(state, item);
  const pulled = pullLots(inv, n);
  keepLots(state.inventaire, item, inv);
  const lots = fridgeLots(state, item);
  pushLots(lots, pulled);
  state.frigo.items[item] = lots;
  return { ok: true, moved: n, reste: asked - n };
}

// « Tout ranger » : range au frigo les aliments frais de l'inventaire qui peuvent y
// aller (voir isFridgeable), tant qu'il y a de la place : d'abord ce qui périme le plus
// tôt (version 1.10). `garder` : { item: quantité } à laisser dans l'inventaire.
// Renvoie { ok, moved, items, reste } où items = { item: quantité rangée } et reste =
// les unités qui n'ont pas trouvé de place.
export function moveAllToFridge(state, garder = {}) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  const lots = [];
  let total = 0;
  for (const item of Object.keys(state.inventaire)) {
    if (!isFridgeable(item)) continue;
    let libre = Math.floor(countItem(state, item) - (garder[item] || 0) + EPS);
    if (libre <= 0) continue;
    total += libre;
    // les lots les plus anciens partent les premiers (comme moveToFridge)
    for (const lot of lotsOf(state, item)) {
      if (libre <= 0) break;
      const n = Math.min(Math.floor(lot.qty + EPS), libre);
      if (n > 0) lots.push({ item, n, rang: lotRank(lot) });
      libre -= n;
    }
  }
  if (total <= 0) return fail('Aucun aliment frais à ranger.');
  if (fridgeRoom(state) <= 0) return fail(`Le frigo est plein (${fridgeCapacity(state)} unités).`);
  lots.sort((a, b) => a.rang - b.rang);
  const items = {};
  let moved = 0;
  for (const l of lots) {
    if (fridgeRoom(state) <= 0) break;
    const r = moveToFridge(state, l.item, l.n);
    if (r.ok) {
      items[l.item] = (items[l.item] || 0) + r.moved;
      moved += r.moved;
    }
  }
  return { ok: true, moved, items, reste: total - moved };
}

// Sort `qty` unités du frigo vers l'inventaire. Leur compteur reprend.
export function moveFromFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  const n = Math.min(Math.floor(Number(qty)) || 0, fridgeCount(state, item));
  if (n <= 0) return fail('Rien à sortir.');
  const lots = fridgeLots(state, item);
  const pulled = pullLots(lots, n);
  keepLots(state.frigo.items, item, lots);
  const inv = lotsOf(state, item);
  pushLots(inv, pulled);
  state.inventaire[item] = inv;
  return { ok: true, moved: n };
}

// Retire jusqu'à `qty` unités d'un aliment du frigo (le lot le plus ancien
// d'abord) pour un repas. Renvoie le nombre retiré.
export function takeFromFridge(state, item, qty, out = null) {
  const lots = fridgeLots(state, item);
  const pulled = pullLots(lots, qty);
  if (out) out.push(...pulled.map((p) => ({ qty: p.qty, origin: p.origin })));
  const taken = pulled.reduce((t, p) => t + p.qty, 0);
  keepLots(state.frigo.items, item, lots);
  return taken;
}

/* -- le stock : l'inventaire et le frigo ensemble -- */

// Quantité d'un objet dans l'inventaire et au frigo.
export function stockCount(state, item) {
  return countItem(state, item) + fridgeCount(state, item);
}

// Prend `qty` unités : dans l'inventaire (il périt), puis au frigo. Renvoie ce qui a été pris.
export function takeStock(state, item, qty) {
  const a = takeItem(state, item, qty);
  return a + (qty - a > 0 ? takeFromFridge(state, item, qty - a) : 0);
}

export function nightFridgeStats(state) {
  if (!state.nuit) state.nuit = newNightStats();
  if (!state.nuit.frigo) state.nuit.frigo = newFridgeNightStats();
  return state.nuit.frigo;
}

// Étape nocturne « nightPower » : prélève d'un coup BLOC_NUIT_S secondes de
// consommation. Si les batteries ne suffisent pas (ou si le frigo est éteint ou
// en panne), la nuit compte comme une panne de froid.
export function nightPower(state) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const stats = nightFridgeStats(state);
  const d = f.appareil;
  if (!d.allume || isBroken(d)) {
    f.panneNuit = true;
    stats.panne = true;
    return;
  }
  const need = fridgeNightNeed(state);
  const avail = availableEnergy(state);
  const wanted = Math.min(need, avail);
  drawNightEnergy(state, wanted);
  stats.mwh = wanted;
  if (avail < need) {
    f.panneNuit = true;
    stats.panne = true;
  }
}

// Étape nocturne « fridgeNight » : si le frigo a été alimenté moins de
// SEUIL_ALIMENTE du temps d'éveil, ou en cas de panne nocturne, chaque lot du
// frigo perd PERTE_NUITS nuit de conservation (ceux qui arrivent à 0 sont
// perdus). Les compteurs de la journée repartent à zéro.
export function fridgeNight(state) {
  const f = state.frigo;
  if (!f || !f.construit) return;
  const F = DATA.FRIGO;
  const stats = nightFridgeStats(state);
  // Sans temps d'éveil observé (test, Dormir immédiat), rien n'a manqué de froid.
  const warm = f.panneNuit || (f.eveilMs > 0 && f.alimenteMs * 100 < f.eveilMs * F.SEUIL_ALIMENTE);
  if (warm) {
    stats.vieillis = true;
    if (!state.nuit.perdus) state.nuit.perdus = {};
    ageLots(f.items, F.PERTE_NUITS, state.nuit.perdus);
  }
  f.alimenteMs = 0;
  f.eveilMs = 0;
  f.panneNuit = false;
}

export function buildFridge(state) {
  const deja = 'Le Réfrigérateur est déjà construit.';
  return buildWith(state, 'frigo', { built: state.frigo.construit, deja, cost: DATA.FRIGO.CONSTRUCTION, libelle: 'Achat : Réfrigérateur' }, () => { openFridge(state); });
}

// Pose le frigo dans l'état (sans payer).
export function openFridge(state) {
  const f = state.frigo;
  f.construit = true;
  if (!f.niveau) f.niveau = 1;
  if (!f.appareil) f.appareil = makeDevice('frigo', 'frigo', DATA.FRIGO.CONSTRUCTION);
  f.alimente = true;
}
