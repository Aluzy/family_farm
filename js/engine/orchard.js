import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, growthPrice, spend } from './devices.js';
import { addItem } from './inventory.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { gainActionXp, levelBlock } from './levels.js';
import { techAuto } from './techtree.js';

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

// Version 1.13 (v2, lot 9) : chaque arbre occupe une case (0 à places − 1), qui est
// aussi son rectangle sur la carte. Case de l'arbre, ou null.
export function treeAt(state, c) {
  return state.verger.arbres.find((t) => t.case === c) || null;
}

// Cases libres du Verger, dans l'ordre.
export function freeOrchardCases(state) {
  const out = [];
  for (let c = 0; c < state.verger.places; c++) if (!treeAt(state, c)) out.push(c);
  return out;
}

// Plante un arbre sur une case libre (prix payé à ce moment). Sans case, la première
// libre. Refusé sans Verger, sans case libre ou sans assez de pièces.
export function plantTree(state, espece, c = null) {
  const def = DATA.VERGER.ARBRES[espece];
  if (!def) return fail('Cet arbre n\'est pas en vente.');
  const v = state.verger;
  if (!v.construit) return fail('Aménage d\'abord le Verger.');
  const libres = freeOrchardCases(state);
  if (!libres.length) return fail('Le Verger est plein : achète un emplacement.');
  const ou = c === null || c === undefined ? libres[0] : Number(c);
  if (!Number.isInteger(ou) || ou < 0 || ou >= v.places) return fail('Emplacement introuvable.');
  if (treeAt(state, ou)) return fail('Un arbre pousse déjà ici.');
  if (state.pieces + EPS < def.prix) return fail('Pas assez de pièces.');
  spend(state, def.prix);
  v.compteur += 1;
  const tree = newTree(`arbre-${v.compteur}`, espece, state.day, ou);
  v.arbres.push(tree);
  return { ok: true, cost: def.prix, id: tree.id, case: ou };
}

// Ancien nom (Marché, joueur automatique) : plante sur la première case libre.
export function buyTree(state, espece) {
  return plantTree(state, espece, null);
}

// Un arbre neuf : ses premiers fruits arrivent la nuit qui complète sa MATURITÉ-ième
// nuit (planté le jour 1 : nuit 15).
export function newTree(id, espece, plantee, c) {
  return { id, espece, plantee, case: c, fruits: false, prochaine: plantee + DATA.VERGER.MATURITE - 1 };
}

// Nuits écoulées depuis la plantation, au réveil (0 le jour de la plantation).
export function treeAge(state, tree) {
  return Math.max(0, state.day - tree.plantee);
}

export function isTreeAdult(state, tree) {
  return treeAge(state, tree) >= DATA.VERGER.MATURITE;
}

// Dessin de l'arbre : 0 jeune arbre, 1 arbuste, 2 arbre, 3 arbre en fruits.
export function treeStage(state, tree) {
  if (tree.fruits) return 3;
  return Math.min(2, Math.floor(treeAge(state, tree) / DATA.VERGER.NUITS_STADE));
}

export function treeStageName(state, tree) {
  return DATA.VERGER.STADES[treeStage(state, tree)];
}

// Nuit (numéro absolu) où l'arbre donnera ses prochains fruits ; null s'il en porte déjà.
export function treeNextHarvest(state, tree) {
  if (tree.fruits) return null;
  return Math.max(state.day, tree.prochaine);
}

// Arbres qui portent des fruits.
export function ripeTrees(state) {
  return state.verger && state.verger.construit ? state.verger.arbres.filter((t) => t.fruits) : [];
}

// Cueillette d'un arbre en fruits : FRUITS fruits, puis les suivants PERIODE nuits plus
// tard. Au clic : énergie et XP « cueillir » ; `auto` (la nuit) : moitié de l'XP.
export function harvestTree(state, id, auto = false) {
  const tree = state.verger.arbres.find((t) => t.id === id);
  if (!tree) return fail('Arbre introuvable.');
  if (!tree.fruits) return fail('Cet arbre n\'a pas encore de fruits.');
  if (!auto && !canAfford(state, 'cueillir')) return fail(TIRED);
  const V = DATA.VERGER;
  const fruit = V.ARBRES[tree.espece].fruit;
  addItem(state, fruit, V.FRUITS);
  tree.fruits = false;
  // Cueilli dans la journée : les nuits d'aujourd'hui, de demain et d'après-demain ;
  // cueilli la nuit : les trois nuits suivantes.
  tree.prochaine = state.day + V.PERIODE - (auto ? 0 : 1);
  if (!auto) spendEnergy(state, 'cueillir');
  gainActionXp(state, 'cueillir', 1, auto);
  return { ok: true, item: fruit, qty: V.FRUITS };
}

// Étape nocturne (après les moutons) : les arbres dont c'est la nuit se couvrent de
// fruits ; avec la Récolte du verger, ils sont aussitôt cueillis.
export function growOrchard(state) {
  const v = state.verger;
  if (!v || !v.construit) return;
  if (!state.nuit.fruits) state.nuit.fruits = {};
  const auto = techAuto(state, 'recolte', 'verger');
  for (const tree of v.arbres) {
    if (!Number.isFinite(tree.prochaine)) tree.prochaine = tree.plantee + DATA.VERGER.MATURITE - 1;
    if (!tree.fruits && state.day >= tree.prochaine) tree.fruits = true;
    if (auto && tree.fruits) {
      const r = harvestTree(state, tree.id, true);
      if (r.ok) state.nuit.fruits[r.item] = (state.nuit.fruits[r.item] || 0) + r.qty;
    }
  }
}
