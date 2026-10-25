import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { deposit } from './ramassage.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { gainActionXp } from './levels.js';
import { techAuto } from './techtree.js';
import { farmTerrain } from './terrain.js';

/* ---------- Lot 8 : Verger ---------- */

// state.verger = { construit, compteur, arbres } (places et achetes : les emplacements de
// l'ancien Verger, sans usage). Un jeune arbre, acheté à la calèche, se plante dans le sol, sur
// l'herbe, dehors (blocs.js : les blocs « arbre ») ; tree.case est sa case de la carte. Le premier
// planté ouvre le Verger : ses arbres poussent et donnent leurs fruits.

export function openVerger(state) {
  const v = state.verger;
  v.construit = true;
  if (v.places < DATA.VERGER.EMPLACEMENTS_DEPART) v.places = DATA.VERGER.EMPLACEMENTS_DEPART;
}

// L'arbre planté sur la case `tile` de la carte, ou null.
export function arbreSurCase(state, tile) {
  return state.verger ? state.verger.arbres.find((t) => t.case === tile) || null : null;
}

// Un arbre est-il planté à moins de `d` cases (en ligne ou en diagonale) de `tile` ?
export function arbreProche(state, tile, d) {
  const W = farmTerrain(state).LARGEUR, c = tile % W, r = Math.floor(tile / W);
  return state.verger.arbres.some((t) => Math.max(Math.abs(t.case % W - c), Math.abs(Math.floor(t.case / W) - r)) < d);
}

// Plante l'arbre `espece` sur la case `tile` (le jeune arbre est déjà pris dans l'inventaire).
export function planterArbre(state, espece, tile) {
  const v = state.verger;
  if (!v.construit) openVerger(state);
  v.compteur += 1;
  const tree = newTree(`arbre-${v.compteur}`, espece, state.day, tile);
  v.arbres.push(tree);
  return tree;
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

// L'arbre fleurit avant ses fruits : les FLORAISON derniers jours avant la nuit où ils arrivent
// (un arbre déjà grand, sans fruits). Rien que le dessin et le nom du stade.
export function treeInBloom(state, tree) {
  if (tree.fruits || treeStage(state, tree) < 2) return false;
  const p = Number.isFinite(tree.prochaine) ? tree.prochaine : tree.plantee + DATA.VERGER.MATURITE - 1;
  return state.day > p - (DATA.VERGER.FLORAISON || 0);
}

export function treeStageName(state, tree) {
  return treeInBloom(state, tree) ? DATA.VERGER.FLEUR : DATA.VERGER.STADES[treeStage(state, tree)];
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
  const aRamasser = deposit(state, 'arbre', tree.case, { [fruit]: V.FRUITS }, !auto && Number.isInteger(tree.case)); // version 1.18
  tree.fruits = false;
  // Cueilli dans la journée : les nuits d'aujourd'hui, de demain et d'après-demain ;
  // cueilli la nuit : les trois nuits suivantes.
  tree.prochaine = state.day + V.PERIODE - (auto ? 0 : 1);
  if (!auto) spendEnergy(state, 'cueillir');
  gainActionXp(state, 'cueillir', 1, auto);
  return { ok: true, item: fruit, qty: V.FRUITS, aRamasser };
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
