import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, farmOpen, spend } from './devices.js';
import { buyHoe, hasHoe } from './crops.js';
import { addItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';

/* ---------- les outils : houe, pioche, hache, canne à pêche ---------- */

// La houe garde sa place (state.potager.houe) ; la hache, la pioche et la canne à pêche,
// achetées une fois au Marché, sont dans state.outils, avec le dernier outil choisi. Le champ
// n'existe qu'une fois un outil acheté ou choisi : une partie sans lui n'a que la houe.
// L'ordre est celui de la barre d'outils de la carte.
export const OUTILS = ['houe', 'pioche', 'hache', 'canne'];

const CLES = { houe: 'HOUE', hache: 'HACHE', pioche: 'PIOCHE', canne: 'CANNE' };

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

// Le dernier outil choisi (barre d'outils) s'il est à nous, sinon le premier qu'on a (la
// houe d'abord), sinon null.
export function selectedTool(state) {
  const choisi = state.outils && state.outils.choisi;
  if (choisi && hasTool(state, choisi)) return choisi;
  return ownedTools(state)[0] || null;
}

function outils(state) {
  if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  return state.outils;
}

// Achat d'un outil au Marché (une seule fois chacun). Le premier outil acheté devient celui
// choisi s'il n'y en avait pas.
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

// Choisit un outil (un appui dans la barre d'outils).
export function selectTool(state, id) {
  const def = toolDef(id);
  if (!def) return fail('Outil inconnu.');
  if (!hasTool(state, id)) return fail(`Il te faut une ${def.NOM.toLowerCase()} (Marché, ${def.PRIX} 💰).`);
  outils(state).choisi = id;
  return { ok: true, outil: id };
}

/* ---------- la hache : couper un arbre de la carte ---------- */

// Les arbres de la carte n'existent que dans la carte (ses couches d'arbres) : le moteur ne
// connaît d'eux qu'un identifiant donné par la carte (« x,y » de la case du pied). Chacun
// donne au plus HACHE.COUPES coups par jour ; il ne tombe pas.
function coupes(state) {
  const o = outils(state);
  if (!o.coupes || o.coupes.jour !== state.day) o.coupes = { jour: state.day, arbres: {} };
  return o.coupes;
}

// Coups de hache que l'arbre `id` peut encore recevoir aujourd'hui.
export function chopsLeft(state, id) {
  const c = state.outils && state.outils.coupes;
  const faits = c && c.jour === state.day ? c.arbres[id] || 0 : 0;
  return Math.max(0, DATA.HACHE.COUPES - faits);
}

// Un coup de hache sur l'arbre `id` : HACHE.BOIS bois dans l'inventaire, de l'énergie, de l'XP.
export function chopTree(state, id) {
  const H = DATA.HACHE;
  if (!hasTool(state, 'hache')) return fail(`Il te faut une hache (Marché, ${H.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un arbre pour le couper.');
  if (chopsLeft(state, id) <= 0) return fail('Cet arbre a assez donné aujourd\'hui : essaie un autre arbre, ou reviens demain.');
  if (!canAfford(state, 'couper')) return fail(TIRED);
  const c = coupes(state);
  c.arbres[id] = (c.arbres[id] || 0) + 1;
  addItem(state, 'bois', H.BOIS);
  spendEnergy(state, 'couper');
  gainActionXp(state, 'couper');
  return { ok: true, bois: H.BOIS, reste: chopsLeft(state, id) };
}

/* ---------- la pioche : casser un rocher de la carte ---------- */

// Comme les arbres, les rochers n'existent que dans la carte (couche plantes_pierres) : le
// moteur ne connaît d'eux qu'un identifiant donné par la carte (« x,y » d'une de leurs cases).
// state.outils.rochers compte les coups reçus par chacun ; à PIOCHE.COUPS, il est cassé (pour
// de bon : la carte ne le dessine plus).
export function rockHits(state, id) {
  const r = state.outils && state.outils.rochers;
  return (r && r[id]) || 0;
}

export function rockBroken(state, id) {
  return rockHits(state, id) >= DATA.PIOCHE.COUPS;
}

// Les rochers cassés (leurs identifiants).
export function brokenRocks(state) {
  const r = state.outils && state.outils.rochers;
  return r ? Object.keys(r).filter((id) => r[id] >= DATA.PIOCHE.COUPS) : [];
}

// Un coup de pioche sur le rocher `id` : PIOCHE.PIERRE pierre dans l'inventaire, de l'énergie,
// de l'XP. `casse` : le rocher vient de se briser.
export function mineRock(state, id) {
  const P = DATA.PIOCHE;
  if (!hasTool(state, 'pioche')) return fail(`Il te faut une pioche (Marché, ${P.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un rocher pour le casser.');
  if (rockBroken(state, id)) return fail('Ce rocher est déjà cassé.');
  if (!canAfford(state, 'piocher')) return fail(TIRED);
  const o = outils(state);
  if (!o.rochers || typeof o.rochers !== 'object') o.rochers = {};
  o.rochers[id] = (o.rochers[id] || 0) + 1;
  addItem(state, 'pierre', P.PIERRE);
  spendEnergy(state, 'piocher');
  gainActionXp(state, 'piocher');
  return { ok: true, pierre: P.PIERRE, coups: o.rochers[id], casse: o.rochers[id] >= P.COUPS };
}
