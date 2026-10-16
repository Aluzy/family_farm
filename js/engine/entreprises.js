import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, spend } from './devices.js';
import { earn } from './compta.js';
import { countItem, takeItem } from './inventory.js';
import { fridgeCount, takeFromFridge } from './fridge.js';
import { hourOfDay, nightActive } from './clock.js';
import { gainActionXp } from './levels.js';
import { refreshUnlocks } from './techtree.js';

/* ---------- version 1.20 : le marché de la ville (vente) et les entreprises (data/ville.json) ---------- */

// En se promenant en ville (js/ville-carte.js, dans la page du jeu : js/ui/excursion.js), on
// vend aux étals et on achète les entreprises devant leur entrepôt.

function stockOf(state, item) {
  return countItem(state, item) + fridgeCount(state, item);
}

// Prend `qty` unités : dans l'inventaire (il périt), puis au frigo. Renvoie ce qui a été pris.
function takeStock(state, item, qty) {
  const a = takeItem(state, item, qty);
  return a + (qty - a > 0 ? takeFromFridge(state, item, qty - a) : 0);
}

/* ---------- la vente au marché de la ville ---------- */

export function townSellable(item) {
  const def = DATA.items[item];
  return !!def && !def.ville && !def.invendable && DATA.VILLE.MARCHE.CATEGORIES.includes(def.category);
}

// Le prix d'une unité aux étals de la ville : VENTE % du prix de la ferme, arrondi au-dessus.
export function townSellPrice(item) {
  return Math.ceil((DATA.items[item].prix * DATA.VILLE.MARCHE.VENTE) / 100 - EPS);
}

// Ce qu'on peut vendre en ville : [{ item, qte, prix }], dans l'ordre des objets.
export function townSellList(state) {
  return Object.keys(DATA.items)
    .filter(townSellable)
    .map((item) => ({ item, qte: Math.floor(stockOf(state, item) + EPS), prix: townSellPrice(item) }))
    .filter((r) => r.qte > 0);
}

export function sellInTown(state, item, qty) {
  const def = DATA.items[item];
  if (!def) return fail('Objet inconnu.');
  if (!townSellable(item)) return fail(`${def.nom} ne se vend pas au marché de la ville.`);
  const n = takeStock(state, item, Math.min(Math.floor(Number(qty)) || 0, Math.floor(stockOf(state, item) + EPS)));
  if (n <= 0) return fail('Rien à vendre.');
  const gain = n * townSellPrice(item);
  earn(state, gain, `Vente en ville : ${def.nom}`, n);
  gainActionXp(state, 'vendre', gain);
  refreshUnlocks(state);
  return { ok: true, sold: n, gain };
}

/* ---------- les entreprises ---------- */

export function companyDef(id) {
  return DATA.VILLE.ENTREPRISES.LISTE[id] || null;
}

export function companyIds() {
  return Object.keys(DATA.VILLE.ENTREPRISES.LISTE);
}

// Les entreprises achetées : { id: { quota, jour, bilan } } (dans state.ville, créé au besoin).
export function companies(state) {
  if (!state.ville || typeof state.ville !== 'object') state.ville = { faits: {}, marche: 0 };
  if (!state.ville.entreprises || typeof state.ville.entreprises !== 'object') state.ville.entreprises = {};
  return state.ville.entreprises;
}

export function ownsCompany(state, id) {
  return !!(state.ville && state.ville.entreprises && state.ville.entreprises[id]);
}

export function buyCompany(state, id) {
  const def = companyDef(id);
  if (!def) return fail('Entreprise inconnue.');
  if (ownsCompany(state, id)) return fail(`La ${def.nom.toLowerCase()} est déjà à vous.`);
  if (state.pieces + EPS < def.prix) return fail('Pas assez de pièces.');
  spend(state, def.prix, `Achat : ${def.nom}`);
  // achetée après l'heure de production : elle commence le lendemain
  const deja = !nightActive(state) && hourOfDay(state) >= DATA.VILLE.ENTREPRISES.HEURE;
  companies(state)[id] = { quota: def.quota, jour: deja ? state.day : 0, bilan: null };
  return { ok: true, cost: def.prix };
}

export function setCompanyQuota(state, id, quota) {
  const def = companyDef(id);
  if (!def || !ownsCompany(state, id)) return fail('Entreprise inconnue.');
  const q = Math.max(0, Math.min(def.quotaMax, Math.round(Number(quota)) || 0));
  companies(state)[id].quota = q;
  return { ok: true, quota: q };
}

// Ce qu'elle fabriquerait maintenant : le quota, ou moins si les intrants manquent.
export function companyPlan(state, id) {
  const def = companyDef(id), c = companies(state)[id];
  if (!def || !c) return { unites: 0, dispo: 0 };
  const dispo = def.intrants.reduce((t, item) => t + Math.floor(stockOf(state, item) + EPS), 0);
  return { unites: Math.min(c.quota, Math.floor(dispo / def.par)), dispo };
}

function produce(state, id) {
  const def = companyDef(id), c = companies(state)[id];
  const { unites } = companyPlan(state, id);
  const pris = {};
  let reste = unites * def.par;
  // les intrants les plus abondants d'abord
  const ordre = def.intrants.slice().sort((a, b) => stockOf(state, b) - stockOf(state, a));
  for (const item of ordre) {
    if (reste <= 0) break;
    const n = takeStock(state, item, Math.min(reste, Math.floor(stockOf(state, item) + EPS)));
    if (n > 0) { pris[item] = n; reste -= n; }
  }
  const gain = unites * def.prixProduit;
  if (gain > 0) earn(state, gain, `${def.nom} : ${def.produit.toLowerCase()}`, unites);
  c.jour = state.day;
  c.bilan = { jour: state.day, unites, gain, pris, manque: unites < c.quota };
  return c.bilan;
}

// Chaque jour à HEURE, chaque entreprise achetée fabrique et vend (une fois par jour : appelée
// à chaque pas d'horloge, elle n'agit qu'au premier pas passé l'heure). Renvoie { id: bilan }
// des entreprises qui viennent de produire, ou null.
export function companiesStep(state) {
  if (!state.ville || !state.ville.entreprises) return null;
  if (nightActive(state) || hourOfDay(state) < DATA.VILLE.ENTREPRISES.HEURE || hourOfDay(state) >= DATA.TIME.NIGHT_HOUR) return null;
  let out = null;
  for (const id of companyIds()) {
    const c = state.ville.entreprises[id];
    if (!c || c.jour === state.day) continue;
    (out = out || {})[id] = produce(state, id);
  }
  if (out) refreshUnlocks(state);
  return out;
}
