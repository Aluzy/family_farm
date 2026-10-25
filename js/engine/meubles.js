import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { houseRepaired } from './depart.js';
import { adultCount, childCount } from './family.js';
import { memberHappiness, setHappiness } from './bonheur.js';
import { addItem } from './inventory.js';

/* ---------- Meubles de la maison (fiche 7c : fabriqués à l'Atelier ; avant, le Marché) ----------
   state.meubles = { id: nombre } (absent : aucun). Un meuble fabriqué prend sa place dans
   l'intérieur de la maison et donne, une fois, un peu de bonheur à chaque membre. Sur la ferme
   générée, il arrive dans l'inventaire (l'objet meuble_<id>) et se pose dans la maison comme un
   bloc (DATA.ATELIER.BLOCS.meuble_<id>, js/engine/blocs.js). */

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

// Pourquoi le meuble `id` ne peut pas entrer dans la maison (null : il peut).
export function meubleRefus(state, id) {
  const def = DATA.MEUBLES[id];
  if (!def) return 'Ce meuble n\'existe pas.';
  if (!houseRepaired(state)) return 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.';
  const max = furnitureMax(state, id);
  if (furnitureCount(state, id) >= max) return max > 1 || def.max ? `Tu en as déjà assez pour la famille (${max}).` : 'Tu l\'as déjà.';
  return null;
}

// Un meuble de plus (fiche 7c : fabriqué à l'Atelier, atelier.js) : compté, le bonheur de chacun, et
// l'objet dans l'inventaire (à poser dans la maison).
export function ajouterMeuble(state, id) {
  const refus = meubleRefus(state, id);
  if (refus) return fail(refus);
  const def = DATA.MEUBLES[id];
  state.meubles = { ...(state.meubles || {}), [id]: furnitureCount(state, id) + 1 };
  for (const m of state.famille.membres) setHappiness(m, memberHappiness(m) + (def.bonheur || 0));
  addItem(state, 'meuble_' + id, 1);
  return { ok: true, bonheur: def.bonheur || 0, nombre: state.meubles[id], aPoser: true };
}

// L'ancien achat au Marché (gardé pour les tests ; plus aucune fenêtre ne vend de meuble).
export function buyFurniture(state, id) {
  const refus = meubleRefus(state, id);
  if (refus) return fail(refus);
  const def = DATA.MEUBLES[id];
  if (!pay(state, def.prix, `Meuble : ${def.nom}`)) return fail(NO_COINS);
  return { ...ajouterMeuble(state, id), cost: def.prix };
}

/* ---------- Pour le dehors de la ferme générée (fabriqué à l'Atelier ; avant, au Marché) ----------
   DATA.DEHORS : le bac à fleurs… Acheté, il arrive dans l'inventaire (l'objet du même nom) et
   se pose comme un bloc (DATA.ATELIER.BLOCS.<id>, js/engine/blocs.js). Prix fixe. */

export function buyDehors(state, id) {
  const def = DATA.DEHORS && DATA.DEHORS[id];
  if (!def) return fail('Cet article n\'existe pas.');
  if (!pay(state, def.prix, `Achat : ${def.nom}`)) return fail(NO_COINS);
  addItem(state, id, 1);
  return { ok: true, cost: def.prix };
}
