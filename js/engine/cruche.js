import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem } from './inventory.js';

/* ---------- la cruche à eau ----------
   Avant la pompe et la citerne, on arrose avec la cruche (un objet de l'Atelier, DATA.CRUCHE) :
   un appui sur le puits posé sur la ferme la remplit (CRUCHE.LITRES litres) ; une plante arrosée
   y puise son eau quand la citerne n'en a pas assez (crops.js waterPlot). state.cruche = { ml }. */

export function aCruche(state) {
  return countItem(state, 'cruche') > 0;
}

export function crucheCapacite() {
  return DATA.CRUCHE.LITRES * 1000;
}

// L'eau de la cruche (ml ; 0 sans cruche).
export function eauCruche(state) {
  if (!aCruche(state)) return 0;
  return Math.max(0, Math.min(crucheCapacite(), (state.cruche && state.cruche.ml) | 0));
}

// Un puits est-il posé sur la ferme ?
export function puitsPose(state) {
  return Object.values(state.blocs || {}).includes('puits');
}

// Remplit la cruche au puits. { ok, litres }
export function remplirCruche(state) {
  if (!aCruche(state)) return fail('Il te faut une cruche : fabrique-la à l\'Atelier.');
  if (!puitsPose(state)) return fail('Il te faut un puits sur la ferme pour remplir la cruche.');
  if (eauCruche(state) >= crucheCapacite()) return fail('La cruche est déjà pleine.');
  state.cruche = { ml: crucheCapacite() };
  return { ok: true, litres: DATA.CRUCHE.LITRES };
}

// Prend `ml` dans la cruche (si elle en a assez). Renvoie vrai si c'est fait.
export function puiserCruche(state, ml) {
  if (eauCruche(state) < ml) return false;
  state.cruche = { ml: eauCruche(state) - ml };
  return true;
}
