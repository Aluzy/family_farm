import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { houseRepaired } from './depart.js';
import { adultCount, childCount } from './family.js';
import { memberHappiness, setHappiness } from './ville.js';
import { farmSeed } from './terrain.js';
import { addItem } from './inventory.js';
import { atelierOuvert } from './atelier.js';

/* ---------- Meubles de la maison (Marché, rayon Meubles) ----------
   state.meubles = { id: nombre } (absent : aucun). Un meuble acheté prend sa place dans
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

export function buyFurniture(state, id) {
  const def = DATA.MEUBLES[id];
  if (!def) return fail('Ce meuble n\'existe pas.');
  const sauvage = farmSeed(state) !== null;
  if (!houseRepaired(state)) return fail(sauvage ? 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.' : 'Répare d\'abord la maison.');
  const max = furnitureMax(state, id);
  if (furnitureCount(state, id) >= max) {
    return fail(max > 1 || def.max ? `Tu en as déjà assez pour la famille (${max}).` : 'Tu l\'as déjà.');
  }
  if (!pay(state, def.prix, `Meuble : ${def.nom}`)) return fail(NO_COINS);
  state.meubles = { ...(state.meubles || {}), [id]: furnitureCount(state, id) + 1 };
  for (const m of state.famille.membres) setHappiness(m, memberHappiness(m) + (def.bonheur || 0));
  // (sur une terre sauvage : dans l'inventaire, à poser dans la maison)
  if (sauvage) addItem(state, 'meuble_' + id, 1);
  return { ok: true, cost: def.prix, bonheur: def.bonheur || 0, nombre: state.meubles[id], aPoser: sauvage };
}

/* ---------- Pour le dehors de la ferme générée (Marché, rayon Meubles) ----------
   DATA.DEHORS : le bac à fleurs… Acheté, il arrive dans l'inventaire (l'objet du même nom) et
   se pose comme un bloc (DATA.ATELIER.BLOCS.<id>, js/engine/blocs.js). Prix fixe. */

export function buyDehors(state, id) {
  const def = DATA.DEHORS && DATA.DEHORS[id];
  if (!def) return fail('Cet article n\'existe pas.');
  if (!atelierOuvert(state)) return fail(`${def.nom} : se pose sur une ferme générée.`);
  if (!pay(state, def.prix, `Achat : ${def.nom}`)) return fail(NO_COINS);
  addItem(state, id, 1);
  return { ok: true, cost: def.prix };
}
