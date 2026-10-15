import { DATA } from './catalog.js';

/* ---------- le calendrier lunaire (inspiré du calendrier hégirien) ---------- */

// Tout se déduit du numéro du jour (state.day, 1 au départ) : le jour 1 est le 1er Solaria
// de l'an 1, au premier croissant. Un mois dure DATA.LUNE.JOURS_MOIS jours (une lunaison),
// l'année DATA.LUNE.MOIS.length mois. Rien n'est ajouté à la sauvegarde.

function jour(day) {
  return Math.max(1, Math.floor(Number(day) || 1));
}

// Jour du mois (1 à JOURS_MOIS).
export function dayOfMonth(day) {
  return ((jour(day) - 1) % DATA.LUNE.JOURS_MOIS) + 1;
}

// Rang du mois dans l'année (0 à 11).
export function monthIndex(day) {
  return Math.floor((jour(day) - 1) / DATA.LUNE.JOURS_MOIS) % DATA.LUNE.MOIS.length;
}

export function monthName(day) {
  return DATA.LUNE.MOIS[monthIndex(day)];
}

// L'année (1 pour la première).
export function yearNumber(day) {
  return Math.floor((jour(day) - 1) / (DATA.LUNE.JOURS_MOIS * DATA.LUNE.MOIS.length)) + 1;
}

// La phase de la lune ce jour-là (et la nuit qui le suit) : { id, nom, icone, jours }.
export function moonPhase(day) {
  const phases = DATA.LUNE.PHASES;
  let d = dayOfMonth(day);
  for (const p of phases) {
    if (d <= p.jours) return p;
    d -= p.jours;
  }
  return phases[phases.length - 1];
}

export function isMoonPhase(state, id) {
  return moonPhase(state.day).id === id;
}

// Effets sur les cultures (voir data/crops.json, LUNE) : ce que rend une récolte et ce que
// coûte un arrosage, en % (100 : sans effet).
export function moonHarvestPct(state) {
  return isMoonPhase(state, 'pleine') ? DATA.LUNE.RECOLTE_PLEINE : 100;
}

export function moonWaterPct(state) {
  return isMoonPhase(state, 'decroissante') ? DATA.LUNE.EAU_DECROISSANTE : 100;
}
