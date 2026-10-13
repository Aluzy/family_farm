import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, farmOpen, spend } from './devices.js';
import { buyHoe, hasHoe } from './crops.js';

/* ---------- les outils : houe, hache, pioche ---------- */

// La houe garde sa place (state.potager.houe) ; la hache et la pioche, achetées une fois au
// Marché, sont dans state.outils, avec l'outil choisi pour le bouton rond de la carte. Le
// champ n'existe qu'une fois un outil acheté ou choisi : une partie sans lui n'a que la houe.
export const OUTILS = ['houe', 'hache', 'pioche'];

const CLES = { houe: 'HOUE', hache: 'HACHE', pioche: 'PIOCHE' };

// { NOM, ICONE, PRIX } d'un outil, ou null.
export function toolDef(id) {
  return CLES[id] ? DATA[CLES[id]] : null;
}

export function hasTool(state, id) {
  if (id === 'houe') return hasHoe(state);
  return !!(CLES[id] && state.outils && state.outils[id]);
}

export function ownedTools(state) {
  return OUTILS.filter((id) => hasTool(state, id));
}

// L'outil du bouton rond : celui choisi s'il est à nous, sinon le premier qu'on a (la houe
// d'abord), sinon null.
export function selectedTool(state) {
  const choisi = state.outils && state.outils.choisi;
  if (choisi && hasTool(state, choisi)) return choisi;
  return ownedTools(state)[0] || null;
}

function outils(state) {
  if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, choisi: 'houe' };
  return state.outils;
}

// Achat d'un outil au Marché (une seule fois chacun). Le premier outil acheté devient celui
// du bouton rond s'il n'y en avait pas.
export function buyTool(state, id) {
  const def = toolDef(id);
  if (!def) return fail('Outil inconnu.');
  if (id === 'houe') return buyHoe(state);
  if (hasTool(state, id)) return fail(`Tu as déjà une ${def.NOM.toLowerCase()}.`);
  if (!farmOpen(state)) return fail(`La ${def.NOM.toLowerCase()} s'achète au Marché, qui ouvre avec le panneau et la pompe.`);
  if (state.pieces + EPS < def.PRIX) return fail('Pas assez de pièces.');
  const avant = selectedTool(state);
  spend(state, def.PRIX, `Achat : ${def.NOM}`);
  const o = outils(state);
  o[id] = true;
  if (!avant) o.choisi = id;
  return { ok: true, cost: def.PRIX };
}

// Choisit l'outil du bouton rond (fenêtre Outils).
export function selectTool(state, id) {
  const def = toolDef(id);
  if (!def) return fail('Outil inconnu.');
  if (!hasTool(state, id)) return fail(`Il te faut une ${def.NOM.toLowerCase()} (Marché, ${def.PRIX} 💰).`);
  outils(state).choisi = id;
  return { ok: true, outil: id };
}
