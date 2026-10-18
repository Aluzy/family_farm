import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { addItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { farmSeed } from './terrain.js';

/* ---------- la carte de transition, tirée pour chaque partie ---------- */

// docs/carte-generee.md (la carte de transition). L'est de la carte (à partir de la colonne
// OUEST : la route, les trottoirs, l'arrêt de bus) est fixe, dessiné par
// scripts/ville/transition.py. L'ouest est tiré d'après la graine de la partie : le chemin de
// terre qui va de la ferme à la route, trois à cinq maisons de voisins bâties en blocs (comme
// le foyer de la ferme générée) avec leurs allées, la mare, le puits, le tonneau, le banc, les
// barrières, les buissons, les arbres, les rochers, l'herbe haute, les fleurs. Chaque jour,
// des ressources (petites pierres, morceaux de bois, herbes) poussent sur l'herbe : les
// familles des maisons vont les ramasser (js/carte/ville/transition.js), le joueur aussi
// (ramasserTransition : comme sur la ferme générée, geste « ramasser »).
//
// Le plan est en tuiles (16 px) pour le sol, les maisons et les tampons du kit, en px pour
// ce que le jeu dessine lui-même (arbres, rochers, herbe haute, ressources). Il ne dépend que
// de la graine (et du jour, pour les ressources) : la même partie retrouve la même carte.

export const TRANSITION = {
  LARGEUR: 96, HAUTEUR: 72, OUEST: 48,
  // le chemin : la rangée de coins de son milieu (il fait deux tuiles de large) ; à la sortie
  // de la ferme (colonnes 0 à 2) et en arrivant à la route (OUEST - 2 et après), CHEMIN_Y
  CHEMIN_Y: 36, ECART: 4,
  // les maisons : de 3 à 5, chacune sur une EMPRISE de colonnes × rangées (murs compris : toutes
  // ses pièces, une fois agrandie : maisonPlan), à ECARTS rangées du chemin
  MAISONS: [3, 5], EMPRISE: [11, 9], ECARTS: [2, 10],
  // les métiers des voisins (js/engine/voisins.js), le champ d'un agriculteur (colonnes × rangées)
  METIERS: ['bucheron', 'agriculteur'], CHAMP: [4, 2],
  // les lits d'une maison : un par membre de la famille (deux adultes, un à trois enfants)
  LITS: [3, 5],
  // la taille des tampons du kit (scripts/ville/transition.py, KIT.tampons), en tuiles
  TAMPONS: { mare: [9, 6], puits: [3, 3], tonneau: [1, 2], banc: [3, 2], buisson: [3, 2], buisson_large: [3, 2] },
  // (les barrières : barriere_2 à barriere_8, n × 3 tuiles, leur pied dans la 2e rangée)
  BARRIERE: [2, 8],
  ROCHERS: ['rocher_a', 'rocher_b', 'rocher_c', 'caillou_0', 'caillou_1'], ROCHERS_N: 14,
  // les ressources du jour : combien, et de quelles sortes (les images de assets/ramassables.png)
  RESSOURCES: 36, SORTES: ['petite_pierre', 'morceau_bois', 'herbe'],
  // ce que chaque sorte rapporte à qui la ramasse (une famille, ou le joueur : son inventaire)
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

  // ----- les maisons, réparties sur toute la largeur : tour à tour au nord et au sud du chemin,
  // chaque côté partagé en bandes de colonnes (une maison par bande), plus ou moins loin du
  // chemin (ECARTS rangées entre lui et la maison) ; la porte face au chemin (en bas au nord, en
  // haut au sud), une allée jusqu'à lui. Chaque maison réserve toute son EMPRISE : elle n'a
  // d'abord qu'une petite pièce, et s'agrandit au fil des étapes que sa famille s'offre
  // (maisonPlan, js/engine/voisins.js)
  const n = entre(TRANSITION.MAISONS[0], TRANSITION.MAISONS[1]);
  const premierNord = r() < 0.5;
  const parCote = [Math.ceil(n / 2), Math.floor(n / 2)];
  const maisons = [];
  const plage = (x, w) => milieu.slice(x, x + w + 1);
  const [w, h] = TRANSITION.EMPRISE;
  for (let i = 0; i < n; i++) {
    const nord = i % 2 === 0 ? premierNord : !premierNord, k = Math.floor(i / 2), sur = parCote[i % 2];
    const bande = (X - 2) / sur;
    const b0 = 1 + Math.round(k * bande), b1 = 1 + Math.round((k + 1) * bande) - 1;
    const gauche = r() < 0.5, feu = r() < 0.5 ? 'c' : 'f', meuble = choix(['a', 'b', 'n', 'm']);
    const lits = entre(TRANSITION.LITS[0], TRANSITION.LITS[1]);
    for (let essai = 0; essai < 40; essai++) {
      const x0 = entre(b0, Math.max(b0, b1 - w)), d = entre(TRANSITION.ECARTS[0], TRANSITION.ECARTS[1]);
      const y0 = nord ? Math.min(...plage(x0, w)) - 2 - d - h + 1 : Math.max(...plage(x0, w)) + 2 + d;
      if (x0 + w > X - 1 || y0 < 2 || y0 + h > H - 2 || !libre(x0 - 1, y0 - 2, w + 2, h + 3)) continue;
      const porte = x0 + (gauche ? PORTE : w - 1 - PORTE), py = nord ? y0 + h - 1 : y0;
      // l'allée : les cases entre la porte et le chemin, libres
      const a0 = nord ? py + 1 : milieu[porte] + 2, a1 = nord ? milieu[porte] - 3 : py - 1;
      if (a1 >= a0 && !libre(porte, a0, 2, a1 - a0 + 1)) continue;
      const m = { nom: 'maison_' + (maisons.length + 1), x: x0, y: y0, w, h, sens: nord ? 'bas' : 'haut', porte: { x: porte, y: py }, gauche, feu, meuble, lits };
      m.plan = maisonPlan(m, 0).grille;
      maisons.push(m);
      prend(m.x - 1, m.y - 2, w + 2, h + 3);
      // l'allée : deux colonnes de coins, de la porte au chemin
      const c0 = nord ? py + 1 : milieu[porte] + 1, c1 = nord ? milieu[porte] - 1 : py;
      for (let j = c0; j <= c1; j++) { coins[j][porte] = true; coins[j][porte + 1] = true; prend(porte, j, 2, 1); }
      break;
    }
  }
  maisons.sort((a, b) => a.x - b.x).forEach((m, i) => { m.nom = 'maison_' + (i + 1); });

  // ----- les métiers (js/engine/voisins.js) : bûcheron ou agriculteur, tour à tour (le premier
  // au hasard : il y a toujours les deux) ; le champ de chaque agriculteur, à côté de sa maison
  // (CHAMP cases, moins s'il manque de place), du côté opposé au chemin si rien n'y tient
  const premier = r() < 0.5 ? 0 : 1;
  maisons.forEach((m, i) => { m.metier = TRANSITION.METIERS[(premier + i) % 2]; });
  for (const m of maisons) {
    if (m.metier !== 'agriculteur') continue;
    const essais = [];
    for (const [w, h] of [TRANSITION.CHAMP, [TRANSITION.CHAMP[0] - 1, TRANSITION.CHAMP[1]], [TRANSITION.CHAMP[0] - 1, 1]]) {
      const bord = m.sens === 'bas' ? m.y + m.h - h : m.y;
      essais.push([m.x + m.w + 1, bord, w, h], [m.x - w - 1, bord, w, h]);
      essais.push([m.x + Math.floor((m.w - w) / 2), m.sens === 'bas' ? m.y - h - 3 : m.y + m.h + 2, w, h]);
    }
    const ok = essais.find(([x, y, w, h]) => libre(x - 1, y - 1, w + 2, h + 2));
    if (!ok) continue;
    const [x, y, w, h] = ok;
    m.champ = { x, y, w, h };
    prend(x - 1, y - 1, w + 2, h + 2);
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
  for (let k = 0, e = 0; k < TRANSITION.ROCHERS_N && e < 400; e++) {
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

// Le plan d'une maison à l'étape `niveau` (0 à 8 : VOISINS.MAISON.ETAPES, achetées par sa
// famille, js/engine/voisins.js), sur son emprise (EMPRISE : 11 × 9 cases). Dessiné ici porte
// en bas et pièce principale à gauche, puis retourné selon la maison (sens : la porte vers le
// chemin ; gauche : la pièce principale à gauche ou à droite) :
//
//   rangées 0 à 3 : le salon (étape 5) au-dessus de la pièce principale, la chambre des enfants
//                   (étape 4) au-dessus de la chambre ;
//   rangées 3 à 8 : la pièce principale (5 colonnes, 7 dès l'étape 1), la chambre (étape 2) à
//                   côté ; une ouverture d'une case dans chaque mur partagé ; la porte en bas.
//
// Dans la pièce principale, une allée reste libre devant la porte et le long du mur du fond
// (elle mène aux autres pièces) ; le four ou la cuisinière (m.feu) est au fond. Les lits (m.lits,
// un par membre de la famille) y sont jusqu'à ce que la chambre soit bâtie ; ensuite la table et
// ses chaises (étape 3) ; dans le salon, le canapé, la table basse et une plante, le tapis
// (étapes 6 à 8).
// { w, h, grille : une chaîne par rangée (M mur, P porte, . plancher, espace : dehors, X : sous
// un grand meuble, sinon un meuble de assets/blocs.png : f four, c cuisinière, d lit, g coffre à
// grain, a atelier, b bac à semis, n nichoir, m meule), objets : les meubles dessinés à part
// ({ nom : table, chaise, canape, table_basse, plante, tapis_1 ; x, y : leur case en bas à gauche ;
// w : leur largeur ; plat : posé au sol, on marche dessus }), lits : leurs cases, celles des
// adultes d'abord }.
const PORTE = 2;
export function maisonPlan(m, niveau = 0) {
  const [W, H] = TRANSITION.EMPRISE;
  const g = Array.from({ length: H }, () => new Array(W).fill(' '));
  const pieces = [[0, 3, niveau >= 1 ? 6 : 4, 8]];
  if (niveau >= 2) pieces.push([6, 3, 10, 8]);
  if (niveau >= 4) pieces.push([6, 0, 10, 3]);
  if (niveau >= 5) pieces.push([0, 0, 6, 3]);
  for (const [x0, y0, x1, y1] of pieces) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const bord = x === x0 || x === x1 || y === y0 || y === y1;
        if (!bord) g[y][x] = '.';
        else if (g[y][x] === ' ') g[y][x] = 'M';
      }
    }
  }
  // les ouvertures d'une pièce à l'autre, la porte
  if (niveau >= 2) g[4][6] = '.';
  if (niveau >= 4) g[3][7] = '.';
  if (niveau >= 5) g[3][2] = '.';
  g[H - 1][PORTE] = 'P';
  g[4][1] = m.feu || 'c';
  const objets = [];
  const meuble = (nom, x, y, w = 1, plat = false) => {
    objets.push({ nom, x, y, w, plat });
    if (!plat) for (let i = 0; i < w; i++) g[y][x + i] = 'X';
  };
  const nl = m.lits || TRANSITION.LITS[0];
  let lits;
  if (niveau === 0) lits = [[3, 4], [1, 6], [3, 6], [1, 7], [3, 5]];
  else if (niveau === 1) lits = [[3, 5], [5, 5], [3, 7], [5, 7], [4, 7]];
  else if (niveau < 4) lits = [[8, 5], [9, 5], [8, 7], [9, 7], [7, 7]];
  else lits = [[8, 5], [8, 7], [8, 1], [9, 1], [7, 1]];
  lits = lits.slice(0, nl);
  for (const [x, y] of lits) g[y][x] = 'd';
  // les autres meubles de la pièce principale, contre son mur
  g[5][1] = niveau === 0 ? 'g' : m.meuble || 'a';
  if (niveau >= 1) g[niveau >= 3 ? 7 : 6][niveau >= 3 ? 5 : 1] = 'g';
  if (niveau >= 3) {
    meuble('table', 3, 6, 3);
    [[3, 5], [4, 5], [5, 5], [4, 7], [3, 7]].slice(0, nl).forEach(([x, y]) => meuble('chaise', x, y));
  }
  // (le canapé contre le mur du fond de la vue, la table basse devant lui : retourné, le salon
  // garde ce sens)
  const [yc, yt] = m.sens === 'haut' ? [2, 1] : [1, 2];
  if (niveau >= 6) meuble('canape', 3, yc, 3);
  if (niveau >= 7) { meuble('table_basse', 3, yt, 2); meuble('plante', 5, yt); }
  if (niveau >= 8) meuble('tapis_1', 3, yt, 3, true);
  // retourné selon la maison
  const fx = (x, w = 1) => (m.gauche === false ? W - x - w : x), fy = (y) => (m.sens === 'haut' ? H - 1 - y : y);
  const grille = [];
  for (let y = 0; y < H; y++) grille.push(Array.from({ length: W }, (_, x) => g[fy(y)][fx(x)]).join(''));
  return {
    w: W, h: H, grille,
    objets: objets.map((o) => ({ ...o, x: fx(o.x, o.w), y: fy(o.y) })),
    lits: lits.map(([x, y]) => [fx(x), fy(y)]),
  };
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

/* ---------- le joueur ramasse ---------- */

// Les ressources du jour que le joueur a déjà prises : [ids]. state.transitionPris = { jour, ids }.
export function transitionPris(state) {
  const p = state.transitionPris;
  return p && p.jour === state.day && Array.isArray(p.ids) ? p.ids : [];
}

// Le joueur ramasse la ressource `id` du jour : son objet (TRANSITION.OBJETS) entre dans
// l'inventaire, contre l'énergie et l'XP du geste « ramasser » (comme sur la ferme générée).
// Une ressource ne se prend qu'une fois par jour.
export function ramasserTransition(state, id) {
  const r = ressourcesDuJour(transitionSeed(state), state.day).find((q) => q.id === id);
  if (!r || transitionPris(state).includes(id)) return fail('Il n\'y a plus rien à ramasser ici.');
  if (!canAfford(state, 'ramasser')) return fail(TIRED);
  if (!state.transitionPris || state.transitionPris.jour !== state.day) state.transitionPris = { jour: state.day, ids: [] };
  state.transitionPris.ids.push(id);
  const item = TRANSITION.OBJETS[r.sorte];
  addItem(state, item, 1);
  spendEnergy(state, 'ramasser');
  gainActionXp(state, 'ramasser');
  return { ok: true, item, n: 1 };
}
