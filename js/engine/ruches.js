import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { addItem } from './inventory.js';
import { storeWithSilo } from './animals.js';
import { farmTerrain } from './terrain.js';

/* ---------- les ruches de la ferme générée ----------
   Une ruche se fabrique à l'Atelier (fiche 7c ; avant, au Marché), arrive dans l'inventaire
   (l'objet DATA.RUCHE.OBJET) et se pose dehors comme un bloc (DATA.ATELIER.BLOCS.ruche,
   js/engine/blocs.js). state.ruches = { [case]: { nuits } } : les nuits passées depuis qu'elle
   est posée ou vidée. Au bout de DATA.RUCHE.NUITS nuits, elle est pleine ; elle attend alors
   qu'on la récolte (DATA.RUCHE.MIEL pots de miel : le personnage y va quand le joueur appuie
   sur sa bulle, comme un tas à ramasser, js/engine/ramassage.js pickUp) et recommence. */

const PREFIXE = 'ruche:';

function ruchesEtat(state) {
  if (!state.ruches || typeof state.ruches !== 'object') state.ruches = {};
  return state.ruches;
}

// Les cases où une ruche est posée.
export function ruchesPosees(state) {
  const B = state.blocs && typeof state.blocs === 'object' ? state.blocs : {};
  return Object.keys(B).filter((t) => B[t] === DATA.RUCHE.OBJET).map(Number);
}

// Les nuits passées depuis que la ruche de `tile` est posée ou vidée (au plus NUITS).
export function rucheNuits(state, tile) {
  const r = state.ruches && state.ruches[tile];
  return r ? Math.min(DATA.RUCHE.NUITS, r.nuits | 0) : 0;
}

export function ruchePleine(state, tile) {
  return ruchesPosees(state).includes(tile) && rucheNuits(state, tile) >= DATA.RUCHE.NUITS;
}

// Les ruches pleines, en tas à ramasser : [{ id: 'ruche:<case>', lieu: 'ruche', ref, items }].
export function ruchesARecolter(state) {
  return ruchesPosees(state).filter((t) => ruchePleine(state, t))
    .map((t) => ({ id: PREFIXE + t, lieu: 'ruche', ref: t, items: { [DATA.RUCHE.PRODUIT]: DATA.RUCHE.MIEL } }));
}

// L'identifiant de tas d'une ruche : sa case, ou null.
export function rucheDuTas(id) {
  return typeof id === 'string' && id.startsWith(PREFIXE) ? Number(id.slice(PREFIXE.length)) : null;
}

export function buyRuche(state) {
  const R = DATA.RUCHE;
  if (!pay(state, R.PRIX, `Achat : ${R.NOM}`)) return fail(NO_COINS);
  addItem(state, R.OBJET, 1);
  return { ok: true, cost: R.PRIX };
}

// Une ruche vient d'être posée sur `tile` : elle est vide.
export function ruchePosee(state, tile) {
  ruchesEtat(state)[tile] = { nuits: 0 };
}

// La ruche de `tile` est reprise : pleine, son miel entre dans l'inventaire. Renvoie le miel donné.
export function rucheReprise(state, tile) {
  // (appelé une fois le bloc enlevé : son état seul dit si elle était pleine)
  const miel = rucheNuits(state, tile) >= DATA.RUCHE.NUITS ? DATA.RUCHE.MIEL : 0;
  if (miel) storeWithSilo(state, DATA.RUCHE.PRODUIT, miel);
  if (state.ruches) delete state.ruches[tile];
  return miel;
}

// Étape nocturne : chaque ruche posée avance d'une nuit (pleine, elle attend).
export function remplirRuches(state) {
  const poses = new Set(ruchesPosees(state));
  const E = ruchesEtat(state);
  for (const t of Object.keys(E)) if (!poses.has(Number(t))) delete E[t];
  for (const t of poses) {
    const r = E[t] || (E[t] = { nuits: 0 });
    r.nuits = Math.min(DATA.RUCHE.NUITS, (r.nuits | 0) + 1);
  }
}

// Le personnage récolte la ruche de `tile` : le miel entre dans l'inventaire, elle repart à vide.
export function recolterRuche(state, tile) {
  if (!ruchePleine(state, tile)) return fail('Le miel n\'est pas encore prêt.');
  ruchesEtat(state)[tile] = { nuits: 0 };
  const items = { [DATA.RUCHE.PRODUIT]: DATA.RUCHE.MIEL };
  storeWithSilo(state, DATA.RUCHE.PRODUIT, DATA.RUCHE.MIEL);
  return { ok: true, lieu: 'ruche', items };
}

// Les fleurs où butinent les abeilles (la carte les y envoie, js/carte/ferme/abeilles.js) : les
// cases fleuries de la ferme générée (farmTerrain().FLEURS) qu'aucun bloc, sol ni labour ne
// recouvre, et les blocs à fleurs posés (un bloc `fleurs` de DATA.ATELIER.BLOCS : les bacs à
// fleurs). Rien sans ruche.
export function fleursPourAbeilles(state) {
  if (!ruchesPosees(state).length) return [];
  const B = state.blocs || {}, S = state.sols || {};
  const labour = new Set(((state.potager && state.potager.parcelles) || []).map((p) => p.case));
  const bacs = Object.keys(B).filter((t) => (DATA.ATELIER.BLOCS[B[t]] || {}).fleurs).map(Number);
  const sauvages = (farmTerrain(state).FLEURS || []).filter((t) => !B[t] && !S[t] && !labour.has(t));
  return sauvages.concat(bacs);
}
