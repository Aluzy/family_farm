import { DATA } from './catalog.js';

/* ---------- Lot 8 : saisons ---------- */

// Indice de saison (0 à 3) d'une nuit : nuits 1 à 10 printemps, 11 à 20 été,
// 21 à 30 automne, 31 à 40 hiver, puis retour au printemps à la nuit 41.
export function seasonIndex(day) {
  const S = DATA.SAISONS;
  return Math.floor((Math.max(1, day) - 1) / S.LONGUEUR) % S.ORDRE.length;
}

// Identifiant de la saison de la nuit courante ('printemps', 'ete', ...).
export function currentSeason(state) {
  return DATA.SAISONS.ORDRE[seasonIndex(state.day)];
}

// Numéro de la nuit dans la saison (1 à LONGUEUR).
export function seasonNight(state) {
  return ((Math.max(1, state.day) - 1) % DATA.SAISONS.LONGUEUR) + 1;
}

// Numéro de la nuit dans l'année (1 à 40).
export function yearNight(day) {
  const S = DATA.SAISONS;
  return ((Math.max(1, day) - 1) % (S.LONGUEUR * S.ORDRE.length)) + 1;
}

// Facteur de saison en % (100 = sans effet).
export function seasonFactor(state, kind) {
  return DATA.SAISONS.MODS[currentSeason(state)][kind];
}

// Facteur de rendement d'une récolte selon le lieu (1 pour la Serre).
export function yieldSeasonFactor(state, lieu) {
  const kind = DATA.SAISONS.RENDEMENT_LIEU[lieu];
  return kind ? seasonFactor(state, kind) : 100;
}

// Facteur d'eau d'un arrosage selon le lieu (1 pour la Serre).
export function waterSeasonFactor(state, lieu) {
  return DATA.SAISONS.EAU_LIEUX.includes(lieu) ? seasonFactor(state, 'eau') : 100;
}
