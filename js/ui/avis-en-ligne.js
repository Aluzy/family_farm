// avis-en-ligne.js — I9d : les avis du village (un achat à l'étal, une vente au comptoir d'un commerce, une commande
// livrée) dits une fois, en ligne.
//
// En solo, la page prend les avis de la partie (prendreAvisEtal, prendreAvisCommerces) et les dit. Sur une île en ligne,
// la partie locale est refaite depuis celle du monde (js/ui/synchro.js), qui les a encore : sans garde, chacun serait
// redit. Dans la partie d'un monde de l'île, un avis porte le pas où il est né (bourse.js, artisans.js) : ce pas, ce
// qu'il dit et son rang parmi les avis pareils du même pas le distinguent ; un avis déjà dit ne l'est plus.

import { enLigne } from './store.js';

const dits = new Set();
const MAX = 4000;

// Les avis de `liste` pas encore dits (en solo : tous). `cle(a)` : ce qu'il dit (sans son pas).
export function avisNeufs(liste, cle) {
  if (!(enLigne && enLigne.vivante)) return liste;
  if (dits.size > MAX) dits.clear();
  const rangs = new Map();
  return liste.filter((a) => {
    const base = `${Number.isInteger(a.pas) ? a.pas : '-'}:${cle(a)}`, r = (rangs.get(base) || 0) + 1;
    rangs.set(base, r);
    const k = `${base}#${r}`;
    if (dits.has(k)) return false;
    dits.add(k);
    return true;
  });
}
