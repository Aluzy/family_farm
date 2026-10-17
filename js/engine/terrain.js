import { DATA } from './catalog.js';
import { genererFerme } from './ferme-generee.js';

/* ---------- le terrain de la ferme ---------- */

// Le terrain de la ferme d'une partie, sous la forme de DATA.TERRAIN : { LARGEUR, HAUTEUR (en
// tuiles), LIGNES (une chaîne par rangée : « # » labourable, « + » abords, « o » sous un
// rocher ou un arbre, « . » rien), ROCHERS, ARBRES (identifiant → tuiles), ZONES (les
// anciennes zones de culture) }. Une tuile porte le numéro rangée × LARGEUR + colonne.
//
// Une partie a la carte dessinée dans Tiled (data/terrain.json, écrit par
// scripts/carte/terres.py) ou, avec une graine (state.carte.graine : pour l'instant en mode
// test, docs/carte-generee.md), la ferme générée d'après elle (ferme-generee.js). Le moteur ne
// lit le terrain que par ici, sans supposer sa taille. Sans partie (`state` absent), c'est la
// carte de Tiled.
export function farmTerrain(state) {
  const g = farmSeed(state);
  return g === null ? DATA.TERRAIN : genererFerme(g).terrain;
}

// La graine de la ferme générée de la partie, ou null (la carte de Tiled).
export function farmSeed(state) {
  const g = state && state.carte ? state.carte.graine : null;
  return g === null || g === undefined || g === '' ? null : String(g);
}

// La carte de la ferme générée de la partie (au format de Tiled, sans jeux de tuiles : la
// scène y met ceux de la carte de Tiled), ou null : la scène charge la carte de Tiled.
export function farmMap(state) {
  const g = farmSeed(state);
  return g === null ? null : genererFerme(g).carte;
}

// Un point de la carte de Tiled (en tuiles) sur la ferme de la partie : là où la cour de la
// ferme générée a été posée (DECALAGE), sinon le même.
export function farmPoint(state, [x, y]) {
  const d = farmTerrain(state).DECALAGE;
  return d ? [x + d[0], y + d[1]] : [x, y];
}

// Nombre de tuiles du terrain T.
export function tileCount(T) {
  return T.LARGEUR * T.HAUTEUR;
}
