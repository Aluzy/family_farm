import { levelBlock } from './levels.js';
import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, growthPrice, spend } from './devices.js';
import { addItem } from './inventory.js';

/* ---------- Lot 8 : Verger ---------- */

// state.verger = { construit, places, achetes, compteur, arbres }.
// places : emplacements au total (départ compris) ; achetes : emplacements
// achetés en plus (ils fixent le prix du suivant) ; arbres : { id, espece,
// plantee } où plantee est la nuit de plantation.

export function orchardFree(state) {
  return Math.max(0, state.verger.places - state.verger.arbres.length);
}

// Prix du prochain emplacement : 50 × 1,25^n (arrondi à l'entier supérieur),
// n = emplacements déjà achetés.
export function orchardSlotPrice(state) {
  const E = DATA.VERGER.EMPLACEMENT;
  return growthPrice(E.base, E.croissance, state.verger.achetes);
}

// Aménage le Verger (gratuit tant que DATA.VERGER.CONSTRUCTION vaut 0).
export function buildVerger(state) {
  const v = state.verger;
  if (v.construit) return fail('Le Verger est déjà aménagé.');
  const lock = levelBlock(state, 'verger'); // version 1.12 : pas avant son niveau
  if (lock) return fail(lock);
  const cost = DATA.VERGER.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openVerger(state);
  return { ok: true, cost };
}

export function openVerger(state) {
  const v = state.verger;
  v.construit = true;
  if (v.places < DATA.VERGER.EMPLACEMENTS_DEPART) v.places = DATA.VERGER.EMPLACEMENTS_DEPART;
}

export function buyOrchardSlot(state) {
  const v = state.verger;
  if (!v.construit) return fail('Aménage d\'abord le Verger (onglet Ferme).');
  if (v.places >= DATA.VERGER.EMPLACEMENTS_MAX) return fail('Le Verger a atteint sa taille maximale (' + DATA.VERGER.EMPLACEMENTS_MAX + ' emplacements).');
  const cost = orchardSlotPrice(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  v.places += 1;
  v.achetes += 1;
  return { ok: true, cost, places: v.places };
}

// Achat d'un arbre au Marché : prix fixe, refusé sans Verger, sans
// emplacement libre ou sans assez de pièces. L'arbre est planté aussitôt.
export function buyTree(state, espece) {
  const def = DATA.VERGER.ARBRES[espece];
  if (!def) return fail('Cet arbre n\'est pas en vente.');
  const v = state.verger;
  if (!v.construit) return fail('Aménage d\'abord le Verger (onglet Ferme).');
  if (orchardFree(state) <= 0) return fail('Le Verger est plein : achète un emplacement.');
  if (state.pieces + EPS < def.prix) return fail('Pas assez de pièces.');
  spend(state, def.prix);
  v.compteur += 1;
  const tree = { id: `arbre-${v.compteur}`, espece, plantee: state.day };
  v.arbres.push(tree);
  return { ok: true, cost: def.prix, id: tree.id };
}

// Nuits écoulées depuis la plantation, au réveil (0 le jour de la plantation).
export function treeAge(state, tree) {
  return Math.max(0, state.day - tree.plantee);
}

export function isTreeAdult(state, tree) {
  return treeAge(state, tree) >= DATA.VERGER.MATURITE;
}

// Version 1.6 : plus de saisons, un arbre donne ses fruits toute l'année. Il les
// donne la nuit qui complète sa MATURITÉ-ième nuit depuis la plantation, puis
// toutes les PERIODE nuits (planté nuit 1 : nuits 15, 18, 21…).
export function treeProducesOn(tree, day) {
  const age = day - tree.plantee + 1;
  return age >= DATA.VERGER.MATURITE && (age - DATA.VERGER.MATURITE) % DATA.VERGER.PERIODE === 0;
}

// Nuit (numéro absolu) de la prochaine récolte d'un arbre, à partir de la nuit
// courante comprise.
export function treeNextHarvest(state, tree) {
  for (let d = state.day; d < state.day + DATA.VERGER.MATURITE + DATA.VERGER.PERIODE; d++) {
    if (treeProducesOn(tree, d)) return d;
  }
  return null;
}

// Étape nocturne (après les moutons) : les arbres dont c'est la nuit donnent
// leurs fruits.
export function growOrchard(state) {
  const v = state.verger;
  if (!v || !v.construit) return;
  if (!state.nuit.fruits) state.nuit.fruits = {};
  for (const tree of v.arbres) {
    if (!treeProducesOn(tree, state.day)) continue;
    const fruit = DATA.VERGER.ARBRES[tree.espece].fruit;
    addItem(state, fruit, DATA.VERGER.FRUITS);
    state.nuit.fruits[fruit] = (state.nuit.fruits[fruit] || 0) + DATA.VERGER.FRUITS;
  }
}
