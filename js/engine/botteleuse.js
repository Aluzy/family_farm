import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { farmTerrain } from './terrain.js';
import { poserMorceaux } from './outils.js';

/* ---------- la botteleuse : des fibres, une botte de paille ----------
   Trois sortes de blocs de l'Atelier (DATA.ATELIER.BLOCS : botteleuse « entonnoir », « machine »,
   « convoyeur ») posés côte à côte sur une rangée, de gauche à droite : l'entonnoir, la machine,
   puis DATA.BOTTELEUSE.CONVOYEUR segments de convoyeur. Le joueur y jette les fibres de son
   inventaire par l'entonnoir (versees) ; quand la machine en a reçu BOTTELEUSE.FIBRES, elle est
   pleine : la carte la fait vibrer BOTTELEUSE.VIBRE_S secondes, puis une botte de paille sort sur
   le convoyeur et tombe au sol, au bout (sortirBotte : un morceau de BOTTELEUSE.PAILLE paille,
   que le joueur ramasse en marchant dessus, js/engine/outils.js ramasserMorceau). Sans carte
   (les tests, le joueur automatique), la paille va droit dans l'inventaire.
   state.botteleuses = { [case de la machine]: { fibres } }. Une machine pleine attend sa botte :
   la carte la fait sortir dès qu'elle la voit (même après un rechargement de la page). */

const B = () => DATA.BOTTELEUSE;
const piece = (sorte) => (DATA.ATELIER.BLOCS[sorte] || {}).botteleuse || null;

function etats(state) {
  if (!state.botteleuses || typeof state.botteleuses !== 'object') state.botteleuses = {};
  return state.botteleuses;
}

// Les fibres reçues par la machine de `tile` (0 à FIBRES).
export function fibresDans(state, tile) {
  const e = state.botteleuses && state.botteleuses[tile];
  return e ? Math.max(0, Math.min(B().FIBRES, e.fibres | 0)) : 0;
}

// La machine de la botteleuse dont `tile` est une pièce (l'entonnoir : la case à sa droite ; un
// segment de convoyeur : la machine au bout de la file, vers la gauche), ou null.
export function machineDe(state, tile) {
  const blocs = state.blocs || {}, W = farmTerrain(state).LARGEUR;
  const p = piece(blocs[tile]);
  if (p === 'machine') return tile;
  if (p === 'entonnoir') return tile % W < W - 1 && piece(blocs[tile + 1]) === 'machine' ? tile + 1 : null;
  if (p === 'convoyeur') {
    for (let t = tile - 1, k = 0; k < B().CONVOYEUR && t >= 0 && (t + 1) % W !== 0; t--, k++) {
      if (piece(blocs[t]) === 'machine') return t;
      if (piece(blocs[t]) !== 'convoyeur') return null;
    }
  }
  return null;
}

// La botteleuse de la machine `tile` : { case, entonnoir, convoyeurs: [cases], bout (la case où
// la botte tombe), fibres, pleine, ok, raison }. ok : elle est raccordée (l'entonnoir à gauche,
// les CONVOYEUR segments à droite, sur la même rangée) et la case au bout est libre.
export function etatBotteleuse(state, tile) {
  const blocs = state.blocs || {}, T = farmTerrain(state), W = T.LARGEUR, c = tile % W, n = B().CONVOYEUR;
  const convoyeurs = Array.from({ length: n }, (_, k) => tile + 1 + k);
  const out = { case: tile, entonnoir: tile - 1, convoyeurs, bout: tile + n + 1, fibres: fibresDans(state, tile) };
  out.pleine = out.fibres >= B().FIBRES;
  const bloque = (t) => !!(DATA.ATELIER.BLOCS[blocs[t]] || {}).bloque;
  if (c < 1 || piece(blocs[tile - 1]) !== 'entonnoir') out.raison = 'Pose un entonnoir juste à gauche de la botteleuse.';
  else if (c + n + 1 >= W || convoyeurs.some((t) => piece(blocs[t]) !== 'convoyeur')) out.raison = `Pose ${n} convoyeurs à la suite, juste à droite de la botteleuse.`;
  else if (bloque(out.bout)) out.raison = 'La case au bout du convoyeur doit rester libre : la botte de paille y tombe.';
  out.ok = !out.raison;
  return out;
}

// Les botteleuses de la ferme (une par machine posée).
export function botteleuses(state) {
  const blocs = state.blocs || {};
  return Object.keys(blocs).filter((t) => piece(blocs[t]) === 'machine').map((t) => etatBotteleuse(state, Number(t)));
}

// Le joueur jette des fibres dans l'entonnoir de la botteleuse dont `tile` est une pièce : autant
// qu'il en a, jusqu'à ce que la machine en ait FIBRES. { ok, case, versees, fibres, pleine }.
export function verserFibres(state, tile) {
  const m = machineDe(state, tile);
  if (m === null) return fail('Ce n\'est pas une botteleuse.');
  const e = etatBotteleuse(state, m);
  if (!e.ok) return fail(e.raison);
  if (e.pleine) return fail('La botteleuse travaille : attends que la botte sorte.');
  const a = countItem(state, 'fibre');
  if (a < 1) return fail('Il te faut des fibres : fauche l\'herbe haute (la faux).');
  const n = Math.min(a, B().FIBRES - e.fibres);
  takeItem(state, 'fibre', n);
  etats(state)[m] = { fibres: e.fibres + n };
  const fibres = e.fibres + n;
  return { ok: true, case: m, versees: n, fibres, pleine: fibres >= B().FIBRES };
}

// La machine `tile`, pleine, a vibré : la botte sort et tombe au bout du convoyeur (`ou` :
// { carte, point: { x, y } } en px de carte ; sans `ou`, sa paille va dans l'inventaire). La
// machine repart à vide. { ok, paille, morceau }.
export function sortirBotte(state, tile, ou) {
  if (fibresDans(state, tile) < B().FIBRES) return fail('La botteleuse n\'a pas encore ses fibres.');
  etats(state)[tile] = { fibres: 0 };
  const paille = B().PAILLE, item = DATA.PATURAGE.NOURRITURE;
  if (!ou || typeof ou.carte !== 'string' || !ou.point) { addItem(state, item, paille); return { ok: true, paille, morceau: null }; }
  const [morceau] = poserMorceaux(state, item, 1, ou.carte, [ou.point], { qte: paille, image: 'botte' });
  return { ok: true, paille, morceau };
}

// La machine de `tile` vient d'être reprise (js/engine/blocs.js reprendreBloc) : ses fibres
// reviennent dans l'inventaire (pleine : sa botte, en paille).
export function botteleuseReprise(state, tile) {
  const f = fibresDans(state, tile);
  if (f >= B().FIBRES) addItem(state, DATA.PATURAGE.NOURRITURE, B().PAILLE);
  else if (f > 0) addItem(state, 'fibre', f);
  if (state.botteleuses) delete state.botteleuses[tile];
}

// Le joueur automatique (sans carte ni blocs) bottelle ses fibres par FIBRES : leur paille dans
// l'inventaire. Renvoie la paille faite.
export function bottelerSansCarte(state) {
  let paille = 0;
  while (countItem(state, 'fibre') >= B().FIBRES) {
    takeItem(state, 'fibre', B().FIBRES);
    addItem(state, DATA.PATURAGE.NOURRITURE, B().PAILLE);
    paille += B().PAILLE;
  }
  return paille;
}
