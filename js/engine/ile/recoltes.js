/* ==========================================================================
   Les règles de récolte des plantes propres à l'île (docs/ile-300.md, étape 7c) : les cultures sauvages et les
   fruitiers, dans la forme des règles du grand monde d'avant (RECOLTE.SORTES : le geste, ce qu'il donne), pour que
   les gestes de la scène et du moteur (js/engine/monde-recolte.js) les prennent comme les autres.
   - une culture sauvage se ramasse à la main (elle s'en va : C15) ; le tournesol, à la faux, donne sa fleur (C16) ;
   - un fruitier se cueille quand il porte ses fruits (son dernier stade) et revient au stade « arbre » (C15).
   ========================================================================== */

import { catalogue } from './catalogue.js';

let regles = null;

/**
 * Les règles des cultures et des fruitiers de l'île : { nom: { def: { nom, bloque }, regle } }.
 */
export function reglesDeLIle(cat = catalogue()) {
  if (regles) return regles;
  regles = {};
  for (const f of cat.fiches) {
    const p = f.dessin.planche;
    if ((p !== 'crops' && p !== 'verger') || !f.recolte) continue;
    const r = f.recolte;
    const regle =
      p === 'verger'
        ? { geste: 'cueillir', variantes: [f.stades - 1], apres: r.stade, fin: r.fin, chance: r.chance, retour: [1, 1] }
        : { geste: 'ramasser', fin: r.fin, chance: r.chance, retour: [1, 1] };
    if (r.faux) regle.aussi = { geste: 'faucher', fin: r.faux.fin, retour: [1, 1] };
    regles[f.id] = { def: { nom: f.id, bloque: f.bloque ? f.empreinte : [] }, regle };
  }
  return regles;
}
