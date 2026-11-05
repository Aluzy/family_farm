/* ---------- D-1 : le carnet du naturaliste (docs/phase-4.md ; data/naturaliste.json) ----------
   Les collections de l'Encyclopédie : les fossiles et cristaux, les trésors de la plage, la cueillette des
   sous-bois, les poissons, les paysages du grand monde. Une collection est complète quand toutes ses pages
   sont découvertes (js/engine/encyclopedie.js : un objet ramassé, un poisson pêché, un biome parcouru) ; elle
   donne alors, une fois, sa récompense : un meuble à poser (l'objet de son bloc, dans l'inventaire).

   state.naturaliste = { faites: { [collection]: le jour où elle a été complète } }. */

import { DATA } from './catalog.js';
import { addItem } from './inventory.js';
import { pageConnue } from './encyclopedie.js';

const COLLECTIONS = () => DATA.NATURALISTE.COLLECTIONS;

function etat(state) {
  if (!state.naturaliste || typeof state.naturaliste !== 'object' || Array.isArray(state.naturaliste)) state.naturaliste = {};
  if (!state.naturaliste.faites || typeof state.naturaliste.faites !== 'object') state.naturaliste.faites = {};
  return state.naturaliste;
}

// L'objet que donne la collection `c` (celui du bloc de sa récompense).
export function objetRecompense(c) {
  const b = DATA.ATELIER.BLOCS[c.recompense];
  return (b && b.objet) || c.recompense;
}

// Les collections et où elles en sont : [{ id, nom, icone, pages, connues, complete, faite (le jour), objet, texte }].
export function collectionsNaturaliste(state) {
  const faites = (state.naturaliste && state.naturaliste.faites) || {};
  return Object.entries(COLLECTIONS()).map(([id, c]) => {
    const connues = c.pages.filter((p) => pageConnue(state, p)).length;
    return { id, nom: c.nom, icone: c.icone, pages: c.pages.slice(), connues, complete: connues === c.pages.length, faite: faites[id] || null, objet: objetRecompense(c), texte: c.texte };
  });
}

// Les collections qui viennent d'être complétées : leur récompense entre dans l'inventaire, une fois.
// Renvoie [{ id, nom, icone, objet, texte }].
export function recompensesNaturaliste(state) {
  const e = etat(state), out = [];
  for (const c of collectionsNaturaliste(state)) {
    if (!c.complete || e.faites[c.id]) continue;
    e.faites[c.id] = state.day;
    addItem(state, c.objet, 1);
    out.push({ id: c.id, nom: c.nom, icone: c.icone, objet: c.objet, texte: c.texte });
  }
  return out;
}
