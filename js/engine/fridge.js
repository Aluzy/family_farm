import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, isBroken, makeDevice, perSecond, perTick, spend } from './devices.js';
import { drawEnergy } from './energy.js';
import { countItem, isFridgeable, isPerishable, lotRank, lotsOf } from './inventory.js';
import { newNightStats } from './family.js';
import { techPct } from './techtree.js';

/* ---------- Lot 8 : réfrigérateur ---------- */

// state.frigo = { construit, appareil, items, alimenteMs, eveilMs, panneNuit, alimente }.
// items : { item: [ { qty, nightsLeft, origin } ] }, mêmes lots que l'inventaire
// mais au frais : leur nightsLeft est figé tant que le frigo est alimenté.
// alimenteMs et eveilMs : ms alimentées et ms d'éveil depuis le réveil ;
// panneNuit : le bloc nocturne n'a pas pu être payé ; alimente : le frigo a
// reçu son énergie au dernier tick (❄️ ou ⚠️ à l'écran).

export function fridgeLots(state, item) {
  const lots = state.frigo && state.frigo.items ? state.frigo.items[item] : null;
  return Array.isArray(lots) ? lots : [];
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

// Consommation du frigo en marche (mWh/s) : base + une part par unité stockée.
export function fridgeRate(state) {
  const F = DATA.FRIGO;
  const base = F.BASE_WH_S * 1000 + F.PAR_UNITE_MWH_S * fridgeUnits(state);
  return Math.floor((base * techPct(state, 'frigoConso')) / 100); // arbre v2 : basse consommation
}

// Énergie que les batteries en service peuvent fournir (mWh).
export function availableEnergy(state) {
  return state.batteries.reduce((t, b) => (b.allume && !isBroken(b) ? t + b.chargeMwh : t), 0);
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

// Retire jusqu'à `qty` unités d'une liste de lots (le plus ancien d'abord) et
// renvoie les morceaux retirés, avec leur conservation et leur origine.
export function pullLots(lots, qty) {
  const out = [];
  let rest = qty;
  for (const lot of lots) {
    if (rest <= 0) break;
    const n = Math.min(lot.qty, rest);
    if (n > 0) {
      out.push({ qty: n, nightsLeft: lot.nightsLeft, origin: lot.origin });
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
  lots.sort((a, b) => (lotRank(a) === lotRank(b) ? 0 : lotRank(a) < lotRank(b) ? -1 : 1));
}

// Déplace `qty` unités d'un aliment périssable de l'inventaire vers le frigo.
// Les lots gardent leur compteur de conservation, qui se fige au frais.
export function moveToFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  if (!DATA.items[item]) return fail('Objet inconnu.');
  if (!isPerishable(item)) return fail(`${DATA.items[item].nom} ne périme pas : inutile de le ranger au frais.`);
  if (!isFridgeable(item)) return fail(`${DATA.items[item].nom} ne se range pas au frigo : sa place est au Silo.`);
  const n = Math.min(Math.floor(Number(qty)) || 0, Math.floor(countItem(state, item) + EPS));
  if (n <= 0) return fail('Rien à ranger.');
  const inv = lotsOf(state, item);
  const pulled = pullLots(inv, n);
  const kept = inv.filter((l) => l.qty > 0);
  if (kept.length) state.inventaire[item] = kept;
  else delete state.inventaire[item];
  const lots = fridgeLots(state, item);
  pushLots(lots, pulled);
  state.frigo.items[item] = lots;
  return { ok: true, moved: n };
}

// « Tout ranger » : range au frigo tous les aliments frais de l'inventaire qui
// peuvent y aller (voir isFridgeable). Renvoie { ok, moved, items } où items =
// { item: quantité rangée }.
export function moveAllToFridge(state) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  const items = {};
  let moved = 0;
  for (const item of Object.keys(state.inventaire)) {
    if (!isFridgeable(item)) continue;
    const n = Math.floor(countItem(state, item) + EPS);
    if (n <= 0) continue;
    const r = moveToFridge(state, item, n);
    if (r.ok) {
      items[item] = r.moved;
      moved += r.moved;
    }
  }
  if (moved <= 0) return fail('Aucun aliment frais à ranger.');
  return { ok: true, moved, items };
}

// Sort `qty` unités du frigo vers l'inventaire. Leur compteur reprend.
export function moveFromFridge(state, item, qty) {
  if (!state.frigo.construit) return fail('Construis d\'abord le Réfrigérateur.');
  const n = Math.min(Math.floor(Number(qty)) || 0, fridgeCount(state, item));
  if (n <= 0) return fail('Rien à sortir.');
  const lots = fridgeLots(state, item);
  const pulled = pullLots(lots, n);
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.frigo.items[item] = kept;
  else delete state.frigo.items[item];
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
  const kept = lots.filter((l) => l.qty > 0);
  if (kept.length) state.frigo.items[item] = kept;
  else if (state.frigo.items) delete state.frigo.items[item];
  return taken;
}

export function nightFridgeStats(state) {
  if (!state.nuit) state.nuit = newNightStats();
  if (!state.nuit.frigo) state.nuit.frigo = { mwh: 0, panne: false, vieillis: false };
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
  // Un prélèvement de la nuit n'est pas une puissance : on ne touche pas aux
  // compteurs d'affichage (mWh/s) des batteries.
  const saved = state.batteries.map((b) => b.sortie);
  drawEnergy(state, wanted);
  state.batteries.forEach((b, i) => { b.sortie = saved[i]; });
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
    for (const item of Object.keys(f.items)) {
      const kept = [];
      for (const lot of fridgeLots(state, item)) {
        if (lot.nightsLeft === null) {
          kept.push(lot);
          continue;
        }
        lot.nightsLeft -= F.PERTE_NUITS;
        if (lot.nightsLeft <= 0) state.nuit.perdus[item] = (state.nuit.perdus[item] || 0) + lot.qty;
        else kept.push(lot);
      }
      if (kept.length) f.items[item] = kept;
      else delete f.items[item];
    }
  }
  f.alimenteMs = 0;
  f.eveilMs = 0;
  f.panneNuit = false;
}

export function buildFridge(state) {
  const f = state.frigo;
  if (f.construit) return fail('Le Réfrigérateur est déjà construit.');
  const cost = DATA.FRIGO.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openFridge(state);
  return { ok: true, cost };
}

// Pose le frigo dans l'état (sans payer).
export function openFridge(state) {
  const f = state.frigo;
  f.construit = true;
  if (!f.appareil) f.appareil = makeDevice('frigo', 'frigo', DATA.FRIGO.CONSTRUCTION);
  f.alimente = true;
}
