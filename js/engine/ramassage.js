// ramassage.js — version 1.18 : ce qui est produit attend sur place qu'on le ramasse.
//
// L'inventaire est celui du personnage principal : un produit n'y entre que quand il le
// prend. Une récolte au clic (parcelle de la carte, arbre du Verger), une tonte au clic,
// les œufs et le lait de la nuit forment un tas « à ramasser » à leur place
// (state.aRamasser) ; le personnage de la carte va le chercher, seul ou quand le joueur
// appuie sur sa bulle, et pickUp() le met dans l'inventaire.
//
// Seulement quand la carte a son personnage : l'interface le dit avec state.ramassage.
// Sans lui (pas de carte, joueur automatique, essais), tout va directement à
// l'inventaire, comme ce que font les automatisations, la nuit et l'absence. Ce qui
// traîne encore le soir est rentré au début de la nuit (collectLeftovers) : rien ne se
// perd et les repas de la nuit le trouvent.
//
// state.aRamasser = { [id]: { lieu, ref, items: { item: qté } } } ; id = lieu, ou
// « lieu:ref » (parcelle : sa case sur la carte ; arbre : sa case du Verger).

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem } from './inventory.js';
import { shear, storeWheat, woolReady } from './animals.js';
import { TIRED } from './stamina.js';

export const LIEUX_RAMASSAGE = ['parcelle', 'arbre', 'poulailler', 'etable'];

export function pileId(lieu, ref) {
  return ref === null || ref === undefined ? lieu : `${lieu}:${ref}`;
}

// Le personnage de la carte ramasse-t-il ? (sinon, tout va directement à l'inventaire)
export function pickupOn(state) {
  return !!state.ramassage;
}

// Tas en attente, dans l'ordre où ils ont été posés.
export function piles(state) {
  const a = state.aRamasser;
  return a && typeof a === 'object' ? Object.entries(a).map(([id, p]) => ({ id, ...p })) : [];
}

// Un produit va à l'inventaire ; le blé va d'abord au Silo, le surplus dans l'inventaire.
function give(state, item, qty) {
  if (!(qty > 0)) return;
  if (item === DATA.SILO.ITEM) storeWheat(state, qty);
  else addItem(state, item, qty);
}

// Pose `items` ({ item: qté }) en tas à ramasser à (lieu, ref), ou les donne tout de suite
// si le personnage ne ramasse pas ou si `ici` est faux (automatisation, Serre…). Renvoie
// true si un tas a été posé.
export function deposit(state, lieu, ref, items, ici = true) {
  const list = Object.entries(items || {}).filter(([item, qty]) => DATA.items[item] && qty > 0);
  if (!list.length) return false;
  if (!ici || !pickupOn(state)) {
    for (const [item, qty] of list) give(state, item, qty);
    return false;
  }
  if (!state.aRamasser || typeof state.aRamasser !== 'object') state.aRamasser = {};
  const id = pileId(lieu, ref);
  const pile = state.aRamasser[id] || (state.aRamasser[id] = { lieu, ref: ref === undefined ? null : ref, items: {} });
  for (const [item, qty] of list) pile.items[item] = (pile.items[item] || 0) + qty;
  return true;
}

// Le personnage prend le tas `id` : son contenu entre dans l'inventaire.
export function pickUp(state, id) {
  const pile = state.aRamasser && state.aRamasser[id];
  if (!pile) return fail('Il n\'y a plus rien à ramasser ici.');
  delete state.aRamasser[id];
  for (const [item, qty] of Object.entries(pile.items)) give(state, item, qty);
  return { ok: true, lieu: pile.lieu, items: { ...pile.items } };
}

// Version 1.19 : le joueur envoie le personnage au Poulailler ou à l'Étable (double appui) ; ils
// ne se vident plus d'eux-mêmes. Au Poulailler, il prend les œufs ; à l'Étable, il tond d'abord
// les moutons prêts (chaque tonte coûte son énergie, comme le bouton « Tondre » ; à court
// d'énergie, il s'arrête), puis prend le lait et la laine. Renvoie { ok, items, fatigue }.
export function collectAt(state, lieu) {
  let fatigue = false;
  if (lieu === 'etable' && state.paturage) {
    for (const m of state.paturage.moutons) {
      if (!woolReady(m)) continue;
      if (!shear(state, m.id).ok) { fatigue = true; break; }
    }
  }
  const r = pickUp(state, lieu);
  if (!r.ok) return fatigue ? fail(TIRED) : r;
  return { ...r, fatigue };
}

// Tout ce qui attend entre dans l'inventaire. Renvoie { item: qté }.
export function pickUpAll(state) {
  const total = {};
  for (const p of piles(state)) {
    const r = pickUp(state, p.id);
    if (r.ok) for (const [item, qty] of Object.entries(r.items)) total[item] = (total[item] || 0) + qty;
  }
  return total;
}

// Étape nocturne, la première : ce qui traîne encore est rentré avant les repas.
export function collectLeftovers(state) {
  return pickUpAll(state);
}
