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

export const STATE_VERSION = 90;
// Version du générateur de la ferme et du grand monde (ferme-generee.js, monde-gen.js, monde-sol.js,
// monde-hameaux.js… et leurs réglages de data/monde.json, data/terrain.json), notée dans chaque partie
// (state.carte.generateur, à côté de sa graine). Une même graine ne refait le même monde qu'avec le même
// générateur : un changement qui déplace ce qui est tiré (le sol, les arbres, les rochers, les hameaux…)
// augmente ce numéro, et une migration décide du sort des parties faites avec l'ancien. Le test
// tests/engine/generateur.test.mjs relève l'empreinte du monde d'une graine pour chaque numéro : il
// échoue si le générateur change sans que ce numéro change.
// 2 (D-2) : les secrets du monde (monde-gen.js, lieux.secrets), tirés à part, et la végétation dégagée autour
// d'eux ; la ferme et tout le reste sont ceux du 1 (la migration 71 → 72 garde les parties du 1).
// 3 : les fleurs sauvages du monde (coquelicot, pavot de Californie, tournesol, myosotis, lavande, lupin : de petites
// plantes de data/monde.json VEGETATION, ajoutées au bout des tables de leurs sols) ; tirées dans les cases restées
// vides, elles ne déplacent rien (la migration 77 → 78 garde les parties du 2).
// 4 : le châtaignier (data/monde.json VEGETATION.REMPLACE : un feuillu sur seize des forêts de feuilles et de
// mousse en devient un, tiré d'après sa case) ; aucun arbre ne bouge (la migration 80 → 81 garde les parties du 3).
// 5 : les gisements de minerai (data/monde.json ROCHES : gisement_fer, _cuivre, _or, _platine, au bout des tables de
// leurs sols ; docs/gisements.md) ; la migration 81 → 82 garde les parties du 4.
// 6 : ce qui brille la nuit (VEGETATION champignons_lumineux dans les forêts, ROCHES cristaux_quartz, cristaux_amethyste
// dans les montagnes, au bout des tables de leurs sols) ; la migration 82 → 83 garde les parties du 5.
// 7 : l'amas d'améthyste de la pierre de lune (lieux.recit, sorte « geode » : la montagne la plus proche de la ferme,
// sans tirage) ; la migration 83 → 84 garde les parties du 6.
// 8 : la fin de la mine (docs/gisements.md, lot 4) : ni le tas de la mine sur la ferme (sa place reste une
// clairière : rien d'autre ne bouge), ni les entrées de grotte dans le monde (leur place reste dans le plan, la
// végétation y repousse) ; la migration 84 → 85 garde les parties du 7.
// 9 : les décors dessinés à la main (VEGETATION fleur_rouge, fleur_mauve des prés, pierre des montagnes,
// champignon_blanc, _jaune, _bleu des forêts : de petites plantes au bout des tables de leurs sols, peintes dans le
// sol) ; la migration 85 → 86 garde les parties du 8.
export const GENERATEUR_VERSION = 9;
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
