import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { yearNight } from './seasons.js';
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

// Fenêtre de production, en numéros de nuit de l'année (1 à 40) : les dernières
// nuits de l'été, puis toute la saison de fin (l'automne).
export function orchardWindow() {
  const S = DATA.SAISONS;
  const W = DATA.VERGER.FENETRE;
  const debut = S.ORDRE.indexOf(W.debut.saison) * S.LONGUEUR + (S.LONGUEUR - W.debut.dernieresNuits) + 1;
  const fin = (S.ORDRE.indexOf(W.fin.saison) + 1) * S.LONGUEUR;
  return { debut, fin };
}

// Un arbre adulte donne ses fruits la PERIODE-ième nuit de la fenêtre, puis
// toutes les PERIODE nuits : nuits 18, 21, 24, 27 et 30 de l'année.
export function orchardProducesOn(day) {
  const w = orchardWindow();
  const y = yearNight(day);
  if (y < w.debut || y > w.fin) return false;
  return (y - w.debut + 1) % DATA.VERGER.PERIODE === 0;
}

// Nuit (numéro absolu) de la prochaine récolte d'un arbre, à partir de la nuit
// courante comprise : la première nuit de production où il aura MATURITÉ nuits.
export function treeNextHarvest(state, tree) {
  for (let d = state.day; d < state.day + 3 * DATA.SAISONS.LONGUEUR * DATA.SAISONS.ORDRE.length; d++) {
    if (orchardProducesOn(d) && d - tree.plantee + 1 >= DATA.VERGER.MATURITE) return d;
  }
  return null;
}

// Étape nocturne (après les moutons) : les arbres adultes donnent leurs fruits
// dans la fenêtre de production. Ils sont adultes à la nuit qui complète leur
// MATURITÉ-ième nuit depuis la plantation.
export function growOrchard(state) {
  const v = state.verger;
  if (!v || !v.construit) return;
  if (!state.nuit.fruits) state.nuit.fruits = {};
  if (!orchardProducesOn(state.day)) return;
  for (const tree of v.arbres) {
    if (state.day - tree.plantee + 1 < DATA.VERGER.MATURITE) continue;
    const fruit = DATA.VERGER.ARBRES[tree.espece].fruit;
    addItem(state, fruit, DATA.VERGER.FRUITS);
    state.nuit.fruits[fruit] = (state.nuit.fruits[fruit] || 0) + DATA.VERGER.FRUITS;
  }
}
