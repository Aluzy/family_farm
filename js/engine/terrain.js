import { DATA } from './catalog.js';
import { genererFerme } from './ferme-generee.js';
import { casesDeRegion, genererMonde, regionDeCase, regionsDuRect } from './monde.js';

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

// Les régions du monde que le joueur a vues (state.monde.vues : [« rx,ry »…], monde.js) : celles
// de la ferme d'office (T.FERME), puis celles où le personnage est entré (voirRegion). La nuit, le
// moteur ne fait repousser ni évoluer que ce qui est dans ces régions (outils.js : respawn,
// regrowGrass ; atelier.js : la cueillette), et ses revues de cases s'y bornent (casesDuTerrain).
// Sur un terrain sans FERME (la carte de Tiled d'une ancienne sauvegarde, pas de monde) : tout
// est vu (null).
export function regionsFerme(T) {
  const F = T && T.FERME;
  return F ? regionsDuRect(F.X, F.Y, F.LARGEUR, F.HAUTEUR) : [];
}

const vuesDe = new WeakMap();   // state.monde.vues → l'ensemble des régions vues (ferme comprise)
export function regionsVues(state, T = farmTerrain(state)) {
  if (!T.FERME) return null;
  const vues = state && state.monde && Array.isArray(state.monde.vues) ? state.monde.vues : null;
  const cache = vues && vuesDe.get(vues);
  if (cache && cache.T === T && cache.n === vues.length) return cache.set;
  const set = new Set(regionsFerme(T));
  for (const k of vues || []) if (typeof k === 'string') set.add(k);
  if (vues) vuesDe.set(vues, { T, n: vues.length, set });
  return set;
}

// La case `t` (du terrain de la partie) est-elle dans une région vue ?
export function regionVue(state, t, T = farmTerrain(state)) {
  const vues = regionsVues(state, T);
  return !vues || vues.has(regionDeCase(t, T.LARGEUR));
}

// Le personnage est sur la case `t` : sa région devient vue (state.monde.vues, une fois). Renvoie
// true si elle ne l'était pas (la partie a changé : à sauvegarder).
export function voirRegion(state, t) {
  const T = farmTerrain(state);
  if (!T.FERME || !Number.isInteger(t) || t < 0 || t >= tileCount(T)) return false;
  if (regionVue(state, t, T)) return false;
  if (!state.monde || typeof state.monde !== 'object') state.monde = { vues: [] };
  if (!Array.isArray(state.monde.vues)) state.monde.vues = [];
  state.monde.vues.push(regionDeCase(t, T.LARGEUR));
  return true;
}

// Les cases du terrain T que le moteur parcourt quand il les passe toutes en revue (labourables,
// places de la cueillette, le joueur automatique…) : celles de la ferme (T.FERME) et des régions
// vues de la partie `state` (regionsVues), dans l'ordre des cases ; toutes, sur un terrain sans
// FERME. Jamais tout le monde : une région que le joueur n'a pas vue n'est pas regardée. (Pour
// l'instant, la prairie du monde autour de la ferme n'a rien, monde.js : ses cases ne donnent ni
// labour ni cueillette.)
const casesDe = new WeakMap();
export function casesDuTerrain(T, state) {
  if (!casesDe.has(T)) casesDe.set(T, new Map());
  const parVues = casesDe.get(T), F = T.FERME;
  const vues = F && state ? [...regionsVues(state, T)] : null;
  const cle = vues ? vues.slice().sort().join(';') : '';
  if (!parVues.has(cle)) {
    const out = [];
    if (!F) for (let t = 0; t < T.LARGEUR * T.HAUTEUR; t++) out.push(t);
    else {
      for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) out.push(r * T.LARGEUR + c);
      // les régions vues, hors de la ferme (une région de son bord : ses cases hors d'elle)
      const dansFerme = (t) => { const c = t % T.LARGEUR, r = Math.floor(t / T.LARGEUR); return c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR; };
      let plus = false;
      for (const k of vues || []) for (const t of casesDeRegion(k, T.LARGEUR, T.HAUTEUR)) if (!dansFerme(t)) { out.push(t); plus = true; }
      if (plus) out.sort((a, b) => a - b);
    }
    // (quelques jeux de vues gardés par terrain : une partie n'en a qu'un à la fois)
    if (parVues.size > 8) parVues.delete(parVues.keys().next().value);
    parVues.set(cle, out);
  }
  return parVues.get(cle);
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
