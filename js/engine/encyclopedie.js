import { ENCYCLOPEDIE } from '../encyclopedie.generated.js';
import { ENCYCLOPEDIE_ILE } from '../encyclopedie-ile.generated.js';
import { conditionRemplie } from './decouverte.js';
import { villageActif } from './village.js';

/* ---------- l'encyclopédie de la partie ----------
   Le jeu a son encyclopédie, un livre (js/ui/encyclopedie.js) qui se remplit au fil de la
   partie : une page par entrée de encyclopedie_ferme_familiale.json (scripts/build-encyclopedie.mjs
   en fait js/encyclopedie.generated.js), découverte dès qu'une de ses conditions est remplie
   (js/engine/decouverte.js : un objet obtenu, un outil, une bête vue…).
   state.encyclopedie = { vues: { id: jour de la découverte }, lues: { id: true },
   evenements: { 'faune:renard': true } }. Sans `vues` (une ancienne partie, ou avant le premier
   passage) : majEncyclopedie les crée, et ce qui est déjà connu n'est pas « nouveau ».
   Deux livres pendant le chantier « l'île à bâtir » (fiche I7d) : celui du jeu publié (CATEGORIES) et celui d'une
   partie de l'île (encyclopedie_ile.json lu par-dessus l'autre : sans le récit, les hameaux ni la calèche ; le port,
   le village) ; livreDe(state) choisit (villageActif). Sans partie, le livre du jeu publié. */

export const CATEGORIES = ENCYCLOPEDIE.categories;

const indexer = (cats) => { const m = new Map(); for (const c of cats) for (const e of c.entrees) m.set(e.id, { ...e, categorie: c.id }); return m; };
const ANCIEN = { categories: CATEGORIES, parId: indexer(CATEGORIES) };
const ILE = { categories: ENCYCLOPEDIE_ILE.categories, parId: indexer(ENCYCLOPEDIE_ILE.categories) };
const livreDe = (state) => (state && villageActif(state) ? ILE : ANCIEN);

// Les catégories du livre de la partie (celui de l'île, le chantier allumé).
export function categoriesDe(state = null) {
  return livreDe(state).categories;
}

export function entreeEncyclopedie(id, state = null) {
  return livreDe(state).parId.get(id) || null;
}

export function nombreEntrees(state = null) {
  return livreDe(state).parId.size;
}

function etat(state) {
  const e = state.encyclopedie;
  return e && typeof e === 'object' ? e : null;
}

export function pageConnue(state, id) {
  const e = etat(state);
  return !!(e && e.vues && e.vues[id] !== undefined);
}

export function pageNouvelle(state, id) {
  const e = etat(state);
  return pageConnue(state, id) && !(e.lues && e.lues[id]);
}

// Les pages découvertes mais pas encore lues.
export function nouveautesEncyclopedie(state) {
  const e = etat(state);
  if (!e) return [];
  const P = livreDe(state).parId;
  return Object.keys(e.vues || {}).filter((id) => P.has(id) && !(e.lues && e.lues[id]));
}

export function pagesConnues(state, categorie = null) {
  const e = etat(state);
  if (!e) return [];
  const L = livreDe(state);
  const ids = categorie ? (L.categories.find((c) => c.id === categorie) || { entrees: [] }).entrees.map((x) => x.id) : [...L.parId.keys()];
  return ids.filter((id) => e.vues && e.vues[id] !== undefined);
}

// Note un événement que l'état ne garde pas (« faune:renard » : une bête du monde vue).
export function noterEncyclopedie(state, evenement) {
  if (!etat(state)) state.encyclopedie = {};
  state.encyclopedie.evenements = state.encyclopedie.evenements || {};
  state.encyclopedie.evenements[evenement] = true;
}

// Découvre les pages dont une condition est remplie ; renvoie les nouvelles (leurs id). La
// première fois (state.encyclopedie absent), ce qui est déjà connu se découvre sans être
// « nouveau » (renvoie []).
export function majEncyclopedie(state) {
  if (!etat(state)) state.encyclopedie = {};
  const e = state.encyclopedie;
  const premiere = !e.vues;
  e.vues = e.vues || {};
  e.lues = e.lues || {};
  const nouvelles = [], memo = {};
  for (const [id, entree] of livreDe(state).parId) {
    if (e.vues[id] !== undefined) continue;
    if (!entree.decouverte.some((c) => conditionRemplie(state, c, e.evenements || {}, memo))) continue;
    e.vues[id] = state.day;
    if (premiere) e.lues[id] = true;
    else nouvelles.push(id);
  }
  return nouvelles;
}

// La page `id` a été lue : elle n'est plus « nouvelle ».
export function lirePage(state, id) {
  if (!pageConnue(state, id)) return false;
  state.encyclopedie.lues[id] = true;
  return true;
}
