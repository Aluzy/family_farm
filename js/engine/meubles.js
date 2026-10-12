import { DATA } from './catalog.js';
import { fail, spend } from './devices.js';
import { houseRepaired } from './depart.js';
import { adultCount, childCount } from './family.js';
import { memberHappiness } from './ville.js';

/* ---------- Meubles de la maison (Marché, rayon Meubles) ----------
   state.meubles = { id: nombre } (absent : aucun). Un meuble acheté prend sa place dans
   l'intérieur de la maison et donne, une fois, un peu de bonheur à chaque membre. */

export function furnitureCount(state, id) {
  return (state.meubles && state.meubles[id]) | 0;
}

// Combien on peut en avoir : 1, un nombre, ou selon la famille (DATA.MEUBLES, champ max).
export function furnitureMax(state, id) {
  const def = DATA.MEUBLES[id];
  if (!def) return 0;
  if (def.max === 'membres') return state.famille.membres.length;
  if (def.max === 'adultes') return adultCount(state);
  if (def.max === 'enfants') return childCount(state);
  return Number.isInteger(def.max) ? def.max : 1;
}

export function buyFurniture(state, id) {
  const def = DATA.MEUBLES[id];
  if (!def) return fail('Ce meuble n\'existe pas.');
  if (!houseRepaired(state)) return fail('Répare d\'abord la maison.');
  const max = furnitureMax(state, id);
  if (furnitureCount(state, id) >= max) {
    return fail(max > 1 || def.max ? `Tu en as déjà assez pour la famille (${max}).` : 'Tu l\'as déjà.');
  }
  if (state.pieces < def.prix) return fail('Pas assez de pièces.');
  spend(state, def.prix);
  state.meubles = { ...(state.meubles || {}), [id]: furnitureCount(state, id) + 1 };
  const B = DATA.VILLE.BONHEUR;
  for (const m of state.famille.membres) m.bonheur = Math.max(0, Math.min(B.MAX, Math.round(memberHappiness(m) + (def.bonheur || 0))));
  return { ok: true, cost: def.prix, bonheur: def.bonheur || 0, nombre: state.meubles[id] };
}
