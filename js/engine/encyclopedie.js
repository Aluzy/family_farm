import { ENCYCLOPEDIE } from '../encyclopedie.generated.js';
import { conditionRemplie } from './decouverte.js';

/* ---------- l'encyclopédie de la partie ----------
   Le jeu a son encyclopédie, un livre (js/ui/encyclopedie.js) qui se remplit au fil de la
   partie : une page par entrée de encyclopedie_ferme_familiale.json (scripts/build-encyclopedie.mjs
   en fait js/encyclopedie.generated.js), découverte dès qu'une de ses conditions est remplie
   (js/engine/decouverte.js : un objet obtenu, un outil, une carte visitée…).
   state.encyclopedie = { vues: { id: jour de la découverte }, lues: { id: true },
   evenements: { 'carte:ville': true } }. Sans `vues` (une ancienne partie, ou avant le premier
   passage) : majEncyclopedie les crée, et ce qui est déjà connu n'est pas « nouveau ». */

export const CATEGORIES = ENCYCLOPEDIE.categories;

const PAR_ID = new Map();
for (const c of CATEGORIES) for (const e of c.entrees) PAR_ID.set(e.id, { ...e, categorie: c.id });

export function entreeEncyclopedie(id) {
  return PAR_ID.get(id) || null;
}

export function nombreEntrees() {
  return PAR_ID.size;
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
  return Object.keys(e.vues || {}).filter((id) => PAR_ID.has(id) && !(e.lues && e.lues[id]));
}

export function pagesConnues(state, categorie = null) {
  const e = etat(state);
  if (!e) return [];
  const ids = categorie ? (CATEGORIES.find((c) => c.id === categorie) || { entrees: [] }).entrees.map((x) => x.id) : [...PAR_ID.keys()];
  return ids.filter((id) => e.vues && e.vues[id] !== undefined);
}

// Note un événement que l'état ne garde pas (« carte:ville » : la carte a été visitée).
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
  const nouvelles = [];
  for (const [id, entree] of PAR_ID) {
    if (e.vues[id] !== undefined) continue;
    if (!entree.decouverte.some((c) => conditionRemplie(state, c, e.evenements || {}))) continue;
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
