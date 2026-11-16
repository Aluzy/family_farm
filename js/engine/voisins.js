/* ---------- V-3, I6b : ce qui se passe entre villageois (data/amitie.json, VOISINS) ----------
   Les événements du village (fiche I6b, liens.js : une visite du soir, un repas apporté, l'entraide), sous le
   « hameau » « village », les EVENEMENTS derniers gardés ; les villageois en parlent (villageois-amitie.js), ceux
   des RECENT derniers jours. state.voisins = { liens: (une clé d'avant, les liens entre habitants des hameaux :
   gardée), evenements: [{ jour, sorte, hameau: 'village', … }] } ; en ligne, il est du monde (I9d).
   (Les liens entre habitants des hameaux, leur entraide et leurs visites sont retirés à la bascule, I9h.) */

import { DATA } from './catalog.js';

const V = () => DATA.VOISINS;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function voisinsDe(state) {
  if (!objet(state.voisins)) state.voisins = {};
  const v = state.voisins;
  if (!objet(v.liens)) v.liens = {};
  if (!Array.isArray(v.evenements)) v.evenements = [];
  return v;
}

// Les événements récents (RECENT jours) qui touchent le villageois `id` (ou son foyer, pour l'entraide).
export function evenementsDe(state, id, foyer = null) {
  const v = voisinsDe(state), depuis = state.day - V().RECENT;
  return v.evenements.filter((e) => e.jour >= depuis && (e.qui === id || e.chez === id || (foyer && (e.aFoyer === foyer || e.deFoyer === foyer))));
}

// Un événement de plus (fiche I6b : une visite du soir, un repas apporté), les EVENEMENTS derniers gardés.
// → l'événement.
export function noterEvenement(state, e) {
  const v = voisinsDe(state);
  v.evenements.push(e);
  if (v.evenements.length > V().EVENEMENTS) v.evenements.splice(0, v.evenements.length - V().EVENEMENTS);
  return e;
}
