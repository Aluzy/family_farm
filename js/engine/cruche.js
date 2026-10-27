import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem } from './inventory.js';

/* ---------- la cruche à eau ----------
   Avant la pompe et la citerne, on arrose avec la cruche (un objet de l'Atelier, DATA.CRUCHE) :
   elle se remplit au puits posé sur la ferme (CRUCHE.LITRES litres) ; une plante arrosée y puise
   son eau quand la citerne n'en a pas assez (crops.js waterPlot). state.cruche = { ml }.
   Fiche 17 : on la remplit AU puits. Un appui sur le puits (ou sur la cruche de la barre
   d'outils) fait marcher le personnage jusqu'à lui (js/carte/ferme/puits.js) ; arrivé, il puise :
   remplirCruche(state, casePuits) ne remplit que sur la case d'un puits posé. Sa jauge
   (jaugeCruche) se voit sur la case de la cruche, dans la barre d'outils (js/ui/outils.js). */

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
  return puitsCases(state).length > 0;
}

// Les cases des puits posés sur la ferme, dans l'ordre des cases.
export function puitsCases(state) {
  return Object.entries(state.blocs || {}).filter(([, s]) => s === 'puits').map(([c]) => Number(c)).sort((a, b) => a - b);
}

// La jauge de la cruche : { ml, capacite, part (de 0, vide, à 1, pleine), litres (arrondis au
// dixième), pleine, vide } ; null sans cruche.
export function jaugeCruche(state) {
  if (!aCruche(state)) return null;
  const ml = eauCruche(state), capacite = crucheCapacite();
  return { ml, capacite, part: capacite ? ml / capacite : 0, litres: Math.round(ml / 100) / 10, pleine: ml >= capacite, vide: ml <= 0 };
}

// Peut-on aller remplir la cruche ? { ok } ou { ok: false, error } (sans cruche, sans puits,
// déjà pleine) : ce que l'appui sur le puits vérifie avant d'y envoyer le personnage.
export function crucheARemplir(state) {
  if (!aCruche(state)) return fail('Il te faut une cruche : fabrique-la à l\'Atelier.');
  if (!puitsPose(state)) return fail('Il te faut un puits sur la ferme pour remplir la cruche.');
  if (eauCruche(state) >= crucheCapacite()) return fail('La cruche est déjà pleine.');
  return { ok: true };
}

// Remplit la cruche au puits de la case `casePuits` : le personnage y est (la carte l'y a mené).
// Ailleurs que sur un puits posé, rien. { ok, litres }
export function remplirCruche(state, casePuits) {
  const r = crucheARemplir(state);
  if (!r.ok) return r;
  if (!Number.isInteger(casePuits) || (state.blocs || {})[casePuits] !== 'puits') return fail('La cruche se remplit au puits : va jusqu\'à lui (touche-le).');
  state.cruche = { ml: crucheCapacite() };
  return { ok: true, litres: DATA.CRUCHE.LITRES };
}

// Prend `ml` dans la cruche (si elle en a assez). Renvoie vrai si c'est fait.
export function puiserCruche(state, ml) {
  if (eauCruche(state) < ml) return false;
  state.cruche = { ml: eauCruche(state) - ml };
  return true;
}
