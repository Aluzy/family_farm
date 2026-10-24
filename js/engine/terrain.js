import { DATA } from './catalog.js';
import { genererFerme } from './ferme-generee.js';
import { genererMonde } from './monde.js';

/* ---------- le terrain de la ferme ---------- */

// Le terrain de la ferme d'une partie, sous la forme de DATA.TERRAIN : { LARGEUR, HAUTEUR (en
// tuiles), LIGNES (une chaîne par rangée : « # » labourable, « + » abords, « o » sous un
// rocher ou un arbre, « . » rien), ROCHERS, ARBRES (identifiant → tuiles), ZONES (les
// anciennes zones de culture) }. Une tuile porte le numéro rangée × LARGEUR + colonne.
//
// Une partie a toujours une graine (state.carte.graine, docs/carte-generee.md) : sa ferme est
// générée d'après elle (ferme-generee.js) et posée au centre du grand monde (monde.js) : le
// terrain est celui du monde, ses cases numérotées sur la largeur du monde. La carte dessinée dans Tiled (data/terrain.json,
// écrit par scripts/carte/terres.py) ne sert plus qu'aux anciennes sauvegardes, avant qu'elles
// déménagent (les migrations, demenagement.js), et quand il n'y a pas de partie (`state` absent).
// Le moteur ne lit le terrain que par ici, sans supposer sa taille.
//
// Une partie d'avant le grand monde (version < 52, pendant ses migrations) lit encore le terrain
// de sa ferme seule (cases sur la largeur de la ferme) : la migration 51 → 52 (state.js) porte
// ensuite ses cases dans celles du monde.
export function farmTerrain(state) {
  const g = farmSeed(state);
  if (g === null) return DATA.TERRAIN;
  return avantLeMonde(state) ? genererFerme(g).terrain : genererMonde(g).terrain;
}

const avantLeMonde = (state) => !!state && Number.isFinite(state.version) && state.version < 52;

// Les cases du terrain T que le moteur parcourt quand il les passe toutes en revue (labourables,
// places de la cueillette…) : celles de la ferme (T.FERME : la prairie du monde autour n'a rien
// pour l'instant, monde.js), dans l'ordre ; toutes, sur un terrain sans FERME.
const casesDe = new WeakMap();
export function casesDuTerrain(T) {
  if (!casesDe.has(T)) {
    const F = T.FERME, out = [];
    if (!F) for (let t = 0; t < T.LARGEUR * T.HAUTEUR; t++) out.push(t);
    else for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) out.push(r * T.LARGEUR + c);
    casesDe.set(T, out);
  }
  return casesDe.get(T);
}

// La graine de la ferme générée de la partie, ou null (une ancienne sauvegarde, pas encore
// déménagée : la carte de Tiled).
export function farmSeed(state) {
  const g = state && state.carte ? state.carte.graine : null;
  return g === null || g === undefined || g === '' ? null : String(g);
}

// La carte du monde de la partie, sa ferme générée au centre (au format de Tiled, sans jeux de
// tuiles : la scène y met ceux de la carte de Tiled), ou null : la scène charge la carte de Tiled.
export function farmMap(state) {
  const g = farmSeed(state);
  return g === null ? null : genererMonde(g).carte;
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
