import { mulberry32 } from './base.js';
import { farmSeed } from './terrain.js';

/* ---------- la carte de transition, tirée pour chaque partie ---------- */

// docs/carte-generee.md (la carte de transition). L'est de la carte (à partir de la colonne
// OUEST : la route, les trottoirs, l'arrêt de bus) est fixe, dessiné par
// scripts/ville/transition.py. L'ouest est tiré d'après la graine de la partie : le chemin de
// terre qui va de la ferme à la route, deux ou trois maisons de voisins bâties en blocs (comme
// le foyer de la ferme générée) avec leurs allées, la mare, le puits, le tonneau, le banc, les
// barrières, les buissons, les arbres, les rochers, l'herbe haute, les fleurs. Chaque jour,
// des ressources (petites pierres, morceaux de bois, herbes) poussent sur l'herbe : les
// familles des maisons vont les ramasser (js/carte/ville/transition.js).
//
// Le plan est en tuiles (16 px) pour le sol, les maisons et les tampons du kit, en px pour
// ce que le jeu dessine lui-même (arbres, rochers, herbe haute, ressources). Il ne dépend que
// de la graine (et du jour, pour les ressources) : la même partie retrouve la même carte.

export const TRANSITION = {
  LARGEUR: 48, HAUTEUR: 36, OUEST: 24,
  // le chemin : la rangée de coins de son milieu (il fait deux tuiles de large) ; à la sortie
  // de la ferme (colonnes 0 à 2) et en arrivant à la route (OUEST - 2 et après), CHEMIN_Y
  CHEMIN_Y: 18, ECART: 3,
  // les maisons : de 2 à 3, de LARGEURS × HAUTEURS cases (murs compris)
  MAISONS: [2, 3], LARGEURS: [5, 6, 7], HAUTEURS: [5, 6],
  // la taille des tampons du kit (scripts/ville/transition.py, KIT.tampons), en tuiles
  TAMPONS: { mare: [9, 6], puits: [3, 3], tonneau: [1, 2], banc: [3, 2], buisson: [3, 2], buisson_large: [3, 2] },
  // (les barrières : barriere_2 à barriere_8, n × 3 tuiles, leur pied dans la 2e rangée)
  BARRIERE: [2, 8],
  ROCHERS: ['rocher_a', 'rocher_b', 'rocher_c', 'caillou_0', 'caillou_1'],
  // les ressources du jour : combien, et de quelles sortes (les images de assets/ramassables.png)
  RESSOURCES: 18, SORTES: ['petite_pierre', 'morceau_bois', 'herbe'],
  // ce que chaque sorte rapporte à la famille qui la ramasse
  OBJETS: { petite_pierre: 'pierre', morceau_bois: 'bois', herbe: 'fibre' },
};

// Un nombre de 32 bits d'après une chaîne (FNV-1a).
function hache(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// La graine de la carte de transition : celle de la ferme générée, sinon celle des voisins
// (state.graineVoisins, tirée à la création de la partie ; une ancienne partie la reçoit de
// la page à sa première visite, js/ui/excursion.js).
export function transitionSeed(state) {
  return farmSeed(state) || (state && state.graineVoisins ? String(state.graineVoisins) : '1');
}

const plans = new Map();

// Le plan de l'ouest de la carte pour la graine `graine` (sans les ressources : voir
// ressourcesDuJour). Gardé : le même objet pour la même graine.
export function transitionPlan(graine) {
  const g = String(graine);
  if (!plans.has(g)) {
    if (plans.size > 4) plans.clear();
    plans.set(g, tirer(g));
  }
  return plans.get(g);
}

function tirer(graine) {
  const { HAUTEUR: H, OUEST: X, CHEMIN_Y, ECART } = TRANSITION;
  const r = mulberry32(hache('transition:' + graine));
  const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
  const choix = (l) => l[Math.floor(r() * l.length)];

  // Les cases prises (tuiles de l'ouest) : rien d'autre ne s'y pose.
  const pris = Array.from({ length: H }, () => new Array(X).fill(false));
  const libre = (x, y, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i < 0 || j < 1 || i >= X || j >= H - 1 || pris[j][i]) return false;
    return true;
  };
  const prend = (x, y, w = 1, h = 1) => { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(X, x + w); i++) pris[j][i] = true; };

  // ----- le chemin : son milieu (rangée de coins) colonne par colonne ; il ondule d'au plus
  // une rangée toutes les deux colonnes (en pente douce), droit aux deux bouts
  const milieu = [];
  let y = CHEMIN_Y, cible = CHEMIN_Y;
  for (let x = 0; x <= X; x++) {
    if (x % 6 === 0) cible = CHEMIN_Y + entre(-ECART, ECART);
    const bout = Math.min(x, X - x);
    const lim = Math.max(0, Math.min(ECART, bout - 2));
    const visee = Math.max(CHEMIN_Y - lim, Math.min(CHEMIN_Y + lim, cible));
    if (x % 2 === 0 || lim < Math.abs(y - CHEMIN_Y)) y += Math.sign(visee - y);
    if (Math.abs(y - CHEMIN_Y) > lim) y = CHEMIN_Y + Math.sign(y - CHEMIN_Y) * lim;
    milieu.push(y);
  }
  // les coins du sol : 'chemin' ou 'herbe', (X + 1) × (H + 1)
  const coins = Array.from({ length: H + 1 }, () => new Array(X + 1).fill(false));
  for (let x = 0; x <= X; x++) for (let k = -1; k <= 1; k++) coins[milieu[x] + k][x] = true;
  for (let x = 0; x < X; x++) for (let j = milieu[x] - 2; j <= milieu[x] + 1; j++) prend(x, j);

  // ----- les maisons, au nord du chemin, de gauche à droite ; la porte en bas, une allée
  // jusqu'au chemin
  const n = entre(TRANSITION.MAISONS[0], TRANSITION.MAISONS[1]);
  const larges = Array.from({ length: n }, () => choix(TRANSITION.LARGEURS));
  let reste = X - 2 - larges.reduce((a, b) => a + b, 0) - (n - 1);
  // (trop larges ensemble : la plus large rétrécit, jusqu'à la plus petite largeur)
  while (reste < 0) { const i = larges.indexOf(Math.max(...larges)); larges[i]--; reste++; }
  const maisons = [];
  let x0 = 1;
  for (let i = 0; i < n; i++) {
    const w = larges[i], h = choix(TRANSITION.HAUTEURS);
    const decale = reste > 0 ? entre(0, Math.min(reste, i === 0 ? 3 : 4)) : 0;
    reste -= decale;
    x0 += decale;
    // le bas de la maison : trois rangées au-dessus du plus haut du chemin sous elle
    const haut = Math.min(...milieu.slice(x0, x0 + w + 1)) - 1;
    const bas = haut - 3 - entre(0, 2);
    const porte = x0 + entre(1, w - 2);
    const m = { nom: 'maison_' + (i + 1), x: x0, y: bas - h + 1, w, h, porte: { x: porte, y: bas }, plan: plan(w, h, porte - x0, r) };
    maisons.push(m);
    prend(m.x - 1, m.y - 2, w + 2, h + 3);
    // l'allée : deux colonnes de coins, de la porte au chemin
    for (let j = bas + 1; j <= milieu[porte] - 1; j++) { coins[j][porte] = true; coins[j][porte + 1] = true; prend(porte, j); }
    x0 += w + 1;
  }

  // ----- les tampons du kit : la mare au sud, le puits et le tonneau près des maisons, le banc
  // près de la mare, des barrières le long du chemin, des buissons
  const tampons = [];
  const pose = (nom, x, y) => { const [w, h] = taille(nom); if (!libre(x, y, w, h)) return false; tampons.push({ nom, x, y }); prend(x, y, w, h); return true; };
  const [mw, mh] = TRANSITION.TAMPONS.mare;
  for (let k = 0; k < 40; k++) {
    const x = entre(1, X - mw - 1), y = entre(Math.max(...milieu) + 4, H - mh - 2);
    if (pose('mare', x, y)) {
      const m = tampons[tampons.length - 1];
      for (let e = 0; e < 10 && !pose('banc', entre(m.x, m.x + mw - 3), m.y + mh); e++);
      break;
    }
  }
  const aCote = (nom, m) => {
    const [w, h] = taille(nom);
    // (contre la maison, à droite ou à gauche ; sa marge d'une case est déjà prise)
    for (const x of r() < 0.5 ? [m.x + m.w + 1, m.x - w - 1] : [m.x - w - 1, m.x + m.w + 1]) if (pose(nom, x, m.y + m.h - h)) return true;
    return false;
  };
  for (let k = 0, puits = false, tonneau = false; k < maisons.length; k++) {
    if (!puits) puits = aCote('puits', maisons[k]);
    else if (!tonneau) tonneau = aCote('tonneau', maisons[k]);
  }
  // les barrières : au-dessus du chemin, là où il reste droit, entre les allées
  for (let x = 0; x < X;) {
    let l = 0;
    const t = milieu[x];
    while (x + l < X && milieu[x + l] === t && milieu[x + l + 1] === t && l < TRANSITION.BARRIERE[1]) l++;
    if (l >= TRANSITION.BARRIERE[0] && r() < 0.7) {
      const nom = 'barriere_' + l, fy = t - 2;          // la rangée du pied : juste au-dessus du chemin
      let ok = true;
      for (let i = x; i < x + l && ok; i++) for (let j = fy - 1; j <= fy; j++) if (pris[j][i] && !(j >= t - 2 && j <= t + 1)) ok = false;
      // (au-dessus du chemin, les cases sont prises par lui : on vérifie seulement les allées)
      for (const m of maisons) if (m.porte.x + 1 >= x && m.porte.x <= x + l - 1) ok = false;
      if (ok) { tampons.push({ nom, x, y: fy - 1 }); prend(x, fy - 1, l, 2); }
    }
    x += Math.max(1, l);
  }

  // ----- les arbres et les pins (le jeu les dessine : px, leur pied), les buissons
  const arbres = [];
  for (let j = 2; j < H; j += 4) {
    for (let i = 1; i < X; i += 4) {
      if (r() < 0.3) continue;
      const x = i + entre(-1, 1), yy = j + entre(-1, 1), q = r();
      if (q < 0.15) { pose(q < 0.08 ? 'buisson_large' : 'buisson', x - 1, yy - 1); continue; }
      if (!libre(x - 1, yy - 1, 3, 2)) continue;
      prend(x - 1, yy - 2, 3, 3);
      arbres.push({ genre: q < 0.4 ? 'pin' : 'arbre', x: x * 16 + 8, y: yy * 16 + 16 });
    }
  }

  // ----- les rochers et les cailloux (px, le milieu de leur pied), l'herbe haute, les fleurs
  const rochers = [];
  for (let k = 0, e = 0; k < 7 && e < 200; e++) {
    const x = entre(1, X - 2), yy = entre(2, H - 3);
    if (!libre(x - 1, yy, 2, 1)) continue;
    prend(x - 1, yy - 1, 3, 2);
    rochers.push({ genre: choix(TRANSITION.ROCHERS), x: x * 16, y: yy * 16 + 14 });
    k++;
  }
  const herbes = [], fleurs = [];
  for (let j = 1; j < H - 1; j++) {
    for (let i = 0; i < X; i++) {
      if (pris[j][i]) continue;
      const q = r();
      if (q > 0.95) fleurs.push({ x: i, y: j, v: Math.floor(r() * 1000) });
      else if (q > 0.89 && !pris[j + 1][i]) herbes.push({ x: i * 16 + 4 + entre(0, 8), y: j * 16 + 10 + entre(0, 5), v: entre(0, 2) });
    }
  }

  return { graine, ouest: X, milieu, coins, maisons, tampons, arbres, rochers, herbes, fleurs, libres: pris.map((l) => l.map((p) => !p)) };
}

function taille(nom) {
  if (nom.startsWith('barriere_')) return [Number(nom.slice(9)), 2];
  return TRANSITION.TAMPONS[nom];
}

// L'intérieur d'une maison de w × h cases, la porte à la colonne `porte` du mur du bas : une
// rangée de lettres par rangée (M un mur, P la porte, . le plancher, sinon un meuble posé sur
// le plancher : f four, c cuisinière, p paillasse, d paillasse et sa couverture, g coffre à
// grain, a atelier, b bac à semis, n nichoir, m meule). Rien juste devant la porte.
const MEUBLES = ['f', 'c', 'g', 'a', 'b', 'n', 'm'];
function plan(w, h, porte, r) {
  const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (y === 0 || x === 0 || y === h - 1 || x === w - 1 ? 'M' : '.')));
  g[h - 1][porte] = 'P';
  const cases = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!(x === porte && y >= h - 3)) cases.push([x, y]);
  // les meubles contre les murs d'abord (la rangée du haut), les couchages au fond à droite
  const contre = cases.filter(([x, y]) => y === 1 || x === 1 || x === w - 2);
  const pioche = (l) => l.splice(Math.floor(r() * l.length), 1)[0];
  const n = Math.min(contre.length, 3 + Math.floor(r() * 2));
  const meubles = MEUBLES.slice();
  for (let k = 0; k < n; k++) {
    const [x, y] = pioche(contre);
    g[y][x] = pioche(meubles);
  }
  const lits = 2 + Math.floor(r() * 2);
  for (let k = 0; k < lits && contre.length; k++) {
    const [x, y] = pioche(contre);
    g[y][x] = k === 0 || r() < 0.5 ? 'd' : 'p';
  }
  return g.map((l) => l.join(''));
}

// Les ressources du jour `jour` sur la carte de la graine `graine` : [{ id, sorte, x, y }] (px,
// le milieu du bas de la case), sur l'herbe libre de l'ouest.
export function ressourcesDuJour(graine, jour) {
  const P = transitionPlan(graine), r = mulberry32(hache('transition:ressources:' + graine + ':' + jour));
  const libres = [];
  P.libres.forEach((l, y) => l.forEach((ok, x) => { if (ok && y > 1 && y < TRANSITION.HAUTEUR - 2) libres.push([x, y]); }));
  const out = [];
  for (let k = 0; k < TRANSITION.RESSOURCES && libres.length; k++) {
    const [x, y] = libres.splice(Math.floor(r() * libres.length), 1)[0];
    const sorte = TRANSITION.SORTES[Math.floor(r() * TRANSITION.SORTES.length)];
    out.push({ id: `${sorte}:${x},${y}`, sorte, x: x * 16 + 8, y: y * 16 + 14 });
  }
  return out;
}
