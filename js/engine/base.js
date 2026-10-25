/* ==========================================================================
   ENGINE — simulation pure. Aucun accès au DOM, à window, au stockage ou à
   l'horloge : le temps arrive en paramètre (dt, en secondes) et l'aléatoire
   vient exclusivement du générateur à graine stocké dans l'état.
   ========================================================================== */

// Générateur pseudo-aléatoire à graine (mulberry32).
// Renvoie une fonction () => nombre dans [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STATE_VERSION = 58;
// Version du jeu, affichée dans les Options (À propos) : la dernière version notée dans le
// code et les données (« version 1.22 » : les objectifs « objet »).
export const GAME_VERSION = '1.22.0';
export const EPS = 1e-9; // tolérance de calcul flottant (pas une valeur d'équilibrage)

// `part` sur `total`, en % entier arrondi vers le bas et plafonné à 100 ; 0 sans total.
export function floorPercent(part, total) {
  if (!(total > 0)) return 0;
  return Math.min(100, Math.floor((part * 100) / total));
}

// Ajoute un onglet du menu à ceux de la partie (une seule fois : il ne disparaît plus).
export function unlockTab(state, tab) {
  if (!state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
}

/* ---------- Lot 2 : aléatoire à graine (état dans state.rngSeed) ---------- */

// Même suite que mulberry32(graine), mais l'état du générateur vit dans
// state.rngSeed : il est sauvegardé avec la partie et reste reproductible.
export function nextRandom(state) {
  const a = ((state.rngSeed >>> 0) + 0x6d2b79f5) | 0;
  state.rngSeed = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Entier tiré dans [min, max], bornes comprises.
export function randomInt(state, min, max) {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}
