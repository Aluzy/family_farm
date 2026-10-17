import { DATA } from './catalog.js';

/* ---------- le terrain de la ferme ---------- */

// Le terrain de la ferme d'une partie, sous la forme de DATA.TERRAIN : { LARGEUR, HAUTEUR (en
// tuiles), LIGNES (une chaîne par rangée : « # » labourable, « + » abords, « o » sous un
// rocher ou un arbre, « . » rien), ROCHERS, ARBRES (identifiant → tuiles), ZONES (les
// anciennes zones de culture) }. Une tuile porte le numéro rangée × LARGEUR + colonne.
//
// Toutes les parties ont aujourd'hui la carte dessinée dans Tiled (data/terrain.json, écrit
// par scripts/carte/terres.py). Le moteur ne lit le terrain que par ici, sans supposer sa
// taille : une autre carte (générée d'après une graine de la partie) pourra prendre sa place.
// Sans partie (`state` absent), c'est la carte de Tiled.
export function farmTerrain(state) {
  return DATA.TERRAIN;
}

// Nombre de tuiles du terrain T.
export function tileCount(T) {
  return T.LARGEUR * T.HAUTEUR;
}
