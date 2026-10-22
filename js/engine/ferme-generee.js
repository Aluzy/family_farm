import { mulberry32 } from './base.js';
import { blocGid, DESSINS_ROCHERS, MINE, TRONC_CREUX, TUILES_VIDES } from './planche.js';
import { terrainOfMap } from './terrain-carte.js';
import { chemin } from './chemin.js';

/* ---------- la ferme générée d'après une graine ---------- */

// Une carte de la ferme de LARGEUR × HAUTEUR tuiles (quatre fois la surface de la carte de
// Tiled), toujours la même pour une même graine, au format de Tiled (comme
// assets/carte_printemps.json, sans ses jeux de tuiles : la scène y met ceux de la carte de
// Tiled). Elle est dessinée avec les tuiles du décor version 2 (planche.js), comme l'était la
// carte de Tiled (par l'ancien scripts/carte/carte_v2.py) :
//   - l'herbe en trois teintes qui ondulent (un bruit), avec leurs raccords ;
//   - des étangs aux bords irréguliers (peu profonds au bord, profonds au milieu) et leurs rives ;
//   - un chemin de la cour jusqu'au bord est : le rectangle `vers_la_transition` (couche
//     « passages ») y est posé, la sortie vers la carte de transition ;
//   - des bois (arbres clairs, pins, buissons) plus denses vers les bords de la carte, des
//     rochers, des fleurs, des touffes d'herbe haute, le tronc creux au bord d'un étang (le
//     passage vers l'infra-monde) et l'entrée de la mine, dans les bois pas trop loin de la cour
//     (le rectangle `mine`, couche « batiment ») ;
//   - pour l'instant (docs/carte-generee.md), une cour dégagée où les bâtiments de la carte de
//     Tiled gardent leur disposition (COUR) : la construction bloc par bloc les remplace un à un
//     (étape 5b). La maison n'y est plus : sa place (MAISON) reste dégagée, le chemin part de
//     devant elle ; le foyer se bâtit (une pièce close avec une paillasse).
// genererFerme(graine) → { carte, terrain } ; le terrain est celui de terrain-carte.js (plus
// DECALAGE : où la cour a été posée, en tuiles ; BUISSONS : les buissons ; HERBES : les touffes d'herbe haute de chaque case ; FLEURS : les cases fleuries). Les cartes déjà faites
// sont gardées.

export const FERME_GENEREE = {
  LARGEUR: 144, HAUTEUR: 114, T: 16,
  ETANGS: [2, 4], RAYON_ETANG: [[7, 10], [3, 7]],     // le premier étang (le plus grand), puis les autres
  ROCHERS: 64, ARBRES_SEUIL: 0.56, ARBRES_BORD: 14,  // densité des bois ; les bords (tuiles) en ont plus
  // l'herbe haute : le nombre de zones, leur rayon (tuiles), et par case un tirage t : autant de
  // touffes que de seuils de TOUFFES_PAR_CASE sous t (0 à 4) ; puis sa teinte et ses fleurs
  TOUFFES: 200, TOUFFES_RAYON: [3, 6], TOUFFES_PAR_CASE: [0.02, 0.2, 0.55, 0.85], TOUFFE_ZONE: 0.7, TOUFFE_FLEURS: 0.2,
  FLEURS: 0.05,
  // la mine : à MINE_DISTANCE tuiles de la maison (au plus près, au plus loin), là où le bois est
  // le plus dense ; rien ne pousse à MINE_MARGE tuile autour, ni devant sa porte (2 rangées)
  MINE_DISTANCE: [16, 34], MINE_MARGE: 1,
};

// La cour (provisoire) : les rectangles de la carte de Tiled (couche « batiment »), en px. La cour est posée d'un
// nombre entier de tuiles plus loin.
const MAISON = [513.5, 239, 94, 95.6];
const COUR = {
  zone_culture_1: [464.5, 385.1, 78.1, 94],
  zone_culture_2: [622, 607.6, 130.8, 128.8],
};
// (le Poulailler, l'Étable, la Serre, le Silo et le Moulin se bâtissent aussi : une pièce close et
// un nichoir, une mangeoire, un bac à semis, un coffre à grain, une meule ; leur place reste dégagée)
const POULAILLER = [128.5, 257, 63, 77], GRANGE = [305, 253.8, 126.1, 81.6], SERRE = [736.1, 273.6, 94, 78.3],
  SILO = [657, 238.5, 49.5, 64.3], MOULIN = [626.1, 412.3, 95.6, 127];
// (le puits et la citerne, à côté de la place du Moulin : se bâtissent aussi, étape 5b-2 ; leur place reste dégagée)
const PUITS = [596, 390, 57, 38];
// (pas de Verger ni d'emplacements : les arbres fruitiers se plantent dans le sol, n'importe où
// sur l'herbe, étape 5b-8 ; la place de l'ancien Verger reste dégagée)
const VERGER = [[625.1, 303.7, 12.8, 15.9]].concat([[942.9, 510.5], [1024.2, 528.2], [864.1, 545.2], [831.3, 578.6],
  [958.7, 561.6], [1039.3, 579.2], [912, 578], [848.4, 625.2], [944.2, 610.1], [992.1, 627.1], [896.9, 641],
  [944.8, 673.1]].map(([x, y]) => [x, y, 63.7, 78.2]));

// La place des bâtiments de la cour de la carte de Tiled ([x, y, largeur, hauteur], en px de cette
// carte) : une partie qui déménage sur la ferme générée y retrouve les siens (demenagement.js).
export const ANCIENNE_COUR = {
  maison: MAISON, poulailler: POULAILLER, paturage: GRANGE, serre: SERRE, silo: SILO, moulin: MOULIN, puits: PUITS,
  verger: VERGER.slice(1),
};

// Un nombre de 32 bits d'après une chaîne (FNV-1a).
function hache(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Un bruit lisse (valeurs sur une grille de `pas` tuiles, interpolées), entre 0 et 1, plusieurs
// octaves.
function bruit(graine, pas, octaves = 3) {
  const g0 = hache(graine);
  const val = (ix, iy, o) => {
    let h = (g0 ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(o + 1, 2147483647)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = (h ^ (h >>> 16)) >>> 0;
    return (h & 0xffff) / 0xffff;
  };
  const lisse = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    let s = 0, poids = 0, p = pas, a = 1;
    for (let o = 0; o < octaves; o++) {
      const fx = x / p, fy = y / p, ix = Math.floor(fx), iy = Math.floor(fy), tx = lisse(fx - ix), ty = lisse(fy - iy);
      const v = (val(ix, iy, o) * (1 - tx) + val(ix + 1, iy, o) * tx) * (1 - ty) + (val(ix, iy + 1, o) * (1 - tx) + val(ix + 1, iy + 1, o) * tx) * ty;
      s += v * a; poids += a; p /= 2; a /= 2;
    }
    return s / poids;
  };
}

const cartes = new Map();

export function genererFerme(graine) {
  const cle = String(graine);
  if (!cartes.has(cle)) cartes.set(cle, fabriquer(cle));
  return cartes.get(cle);
}

function fabriquer(graine) {
  const G = FERME_GENEREE, W = G.LARGEUR, H = G.HAUTEUR, T = G.T, N = W * H;
  // un tirage par usage : changer l'un ne déplace pas les autres
  const hasard = (nom) => mulberry32(hache(graine + ':' + nom));
  const entre = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const idx = (c, r) => r * W + c;
  const dedans = (c, r) => c >= 0 && r >= 0 && c < W && r < H;

  // ---- 1. la cour : où elle va, ce qu'elle interdit
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const [x, y, w, h] of Object.values(COUR).concat([MAISON, PUITS, POULAILLER, GRANGE, SERRE, SILO, MOULIN], VERGER)) {
    bx0 = Math.min(bx0, Math.floor(x / T)); by0 = Math.min(by0, Math.floor(y / T));
    bx1 = Math.max(bx1, Math.ceil((x + w) / T)); by1 = Math.max(by1, Math.ceil((y + h) / T));
  }
  const rc = hasard('cour');
  const cw = bx1 - bx0, ch = by1 - by0;
  const ox = Math.round((W - cw) / 2 - 12 + (rc() - 0.5) * 16) - bx0;   // un peu à l'ouest : le chemin a de la place
  const oy = Math.round((H - ch) / 2 + (rc() - 0.5) * 20) - by0;
  const objets = {};
  for (const [nom, [x, y, w, h]] of Object.entries(COUR)) objets[nom] = { x: x + ox * T, y: y + oy * T, width: w, height: h };
  const cour = new Uint8Array(N);      // 1 : la cour (rien n'y pousse), plus 3 tuiles autour
  for (let r = by0 + oy - 3; r <= by1 + oy + 3; r++) for (let c = bx0 + ox - 3; c <= bx1 + ox + 3; c++) if (dedans(c, r)) cour[idx(c, r)] = 1;
  // sous un rectangle de la cour (sousObjet[1] : ou à une tuile près)
  const sousObjet = [new Uint8Array(N), new Uint8Array(N)];
  for (const o of Object.values(objets)) {
    for (const marge of [0, 1]) {
      for (let r = Math.floor(o.y / T) - marge; r < Math.ceil((o.y + o.height) / T) + marge; r++) {
        for (let c = Math.floor(o.x / T) - marge; c < Math.ceil((o.x + o.width) / T) + marge; c++) if (dedans(c, r)) sousObjet[marge][idx(c, r)] = 1;
      }
    }
  }

  // ---- 2. le chemin : de devant la maison au bord est (3 tuiles de large, droit sur ses
  // 8 dernières tuiles, au milieu des rangées de la sortie)
  const classe = new Array(N).fill('herbe');
  const rr = hasard('chemin');
  const sortie = entre(rr, Math.round(H * 0.3), Math.round(H * 0.7));
  const depart = [Math.round((MAISON[0] + MAISON[2] / 2) / T) + ox, Math.ceil((MAISON[1] + MAISON[3]) / T) + 1 + oy];
  const meandre = bruit(graine + ':meandre', 9, 2);
  const libreChemin = (i) => { const r = Math.floor(i / W); return r >= 2 && r < H - 2 && !sousObjet[1][i]; };
  const cout = (i) => 1 + 4 * meandre(i % W, Math.floor(i / W));
  const pas = chemin({ cols: W, rows: H, libre: libreChemin, cout }, idx(depart[0], depart[1]), idx(W - 9, sortie)) || [];
  const route = new Set(pas);
  for (let c = W - 9; c < W; c++) route.add(idx(c, sortie));
  for (const i of route) {
    const c = i % W, r = Math.floor(i / W);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dedans(c + dc, r + dr) && !sousObjet[0][idx(c + dc, r + dr)]) classe[idx(c + dc, r + dr)] = 'chemin';
    }
  }
  const pres = (i, n, f) => {        // une case à moins de n tuiles où f est vrai ?
    const c = i % W, r = Math.floor(i / W);
    for (let dr = -n; dr <= n; dr++) for (let dc = -n; dc <= n; dc++) if (dedans(c + dc, r + dr) && f(idx(c + dc, r + dr))) return true;
    return false;
  };

  // ---- 3. les étangs
  const re = hasard('etangs');
  const forme = bruit(graine + ':rives', 4, 2);
  const etangs = [];
  const nEtangs = entre(re, G.ETANGS[0], G.ETANGS[1]);
  for (let k = 0, essais = 0; k < nEtangs && essais < 400; essais++) {
    const [a, b] = G.RAYON_ETANG[k ? 1 : 0];
    const rayon = a + re() * (b - a);
    const cx = entre(re, Math.ceil(rayon) + 3, W - Math.ceil(rayon) - 4), cy = entre(re, Math.ceil(rayon) + 3, H - Math.ceil(rayon) - 4);
    const cases = [], ax = 0.75 + re() * 0.5, ay = 0.75 + re() * 0.5;   // plus ou moins allongé
    for (let r = Math.floor(cy - rayon * 1.6); r <= cy + rayon * 1.6; r++) {
      for (let c = Math.floor(cx - rayon * 1.6); c <= cx + rayon * 1.6; c++) {
        if (!dedans(c, r)) continue;
        if (Math.hypot((c - cx) / ax, (r - cy) / ay) / rayon + (forme(c, r) - 0.5) * 1.1 < 1) cases.push(idx(c, r));
      }
    }
    const loin = (i) => !pres(i, 3, (j) => classe[j] !== 'herbe' || cour[j]);
    if (cases.length < 12 || !cases.every(loin)) continue;
    for (const i of cases) classe[i] = 'eau';
    etangs.push(cases);
    k++;
  }

  // ---- 4. les sommets (coins des cases), la teinte de l'herbe, la profondeur de l'eau
  const V = W + 1, sommet = new Array(V * (H + 1));
  for (let y = 0; y <= H; y++) {
    for (let x = 0; x <= W; x++) {
      const n = { eau: 0, chemin: 0 };
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const k = classe[idx(Math.min(W - 1, Math.max(0, x + dx)), Math.min(H - 1, Math.max(0, y + dy)))];
        if (k in n) n[k]++;
      }
      sommet[y * V + x] = n.eau >= 2 ? 'eau' : n.chemin >= 2 ? 'chemin' : 'herbe';
    }
  }
  const S = (x, y) => sommet[y * V + x];
  const teinteDe = bruit(graine + ':teinte', 14, 2);
  const teinte = new Uint8Array(V * (H + 1)), prof = new Uint8Array(V * (H + 1));
  for (let y = 0; y <= H; y++) {
    for (let x = 0; x <= W; x++) {
      const b = teinteDe(x, y);
      let t = b < 0.42 ? 0 : b < 0.6 ? 1 : 2;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (classe[idx(Math.min(W - 1, Math.max(0, x + dx)), Math.min(H - 1, Math.max(0, y + dy)))] === 'eau') t = 0;
      teinte[y * V + x] = t;
      let p = S(x, y) === 'eau';
      for (let dy = -2; dy <= 2 && p; dy++) for (let dx = -2; dx <= 2 && p; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx <= W && yy <= H && S(xx, yy) !== 'eau') p = false;
      }
      prof[y * V + x] = p ? 1 : 0;
    }
  }
  const masque = (f, x, y) => (f(x, y) ? 8 : 0) | (f(x + 1, y) ? 4 : 0) | (f(x, y + 1) ? 2 : 0) | (f(x + 1, y + 1) ? 1 : 0);

  // ---- 5. le sol, les rives (comme l'ancien scripts/carte/carte_v2.py, étape 3)
  const vide = () => new Array(N).fill(0);
  const ground = vide(), rives = vide(), plantes = vide();
  const herbePleine = [];
  const rs = hasard('sol');
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const i = idx(tx, ty);
      const coins = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
      const types = coins.map(([x, y]) => S(x, y));
      const teintes = coins.map(([x, y]) => teinte[y * V + x]);
      const h = Math.min(...teintes);
      const r = rs();
      if (types.includes('eau')) {
        const n = masque((x, y) => prof[y * V + x], tx, ty);
        const f = n === 0 ? (r < 0.7 ? 0 : 1 + Math.floor(rs() * 7)) : n === 15 ? 8 + (r < 0.7 ? (rs() < 0.5 ? 0 : 2) : Math.floor(rs() * 8)) : 16 + n;
        ground[i] = blocGid('eau', f);
        const terre = masque((x, y) => S(x, y) !== 'eau', tx, ty);
        if (terre) {
          const sable = coins.every(([x, y]) => S(x, y) === 'eau' || S(x, y) === 'chemin');
          rives[i] = sable ? blocGid('rive_sable', terre) : blocGid('rive_herbe', h * 16 + terre);
        }
      } else if (types.includes('chemin')) {
        const n = masque((x, y) => S(x, y) === 'chemin', tx, ty);
        ground[i] = blocGid('herbe_chemin', n === 15 ? 4 * 16 + Math.floor(rs() * 8) : (5 + h * 2) * 16 + n);
      } else if (Math.max(...teintes) > h) {
        ground[i] = blocGid('herbe_chemin', (13 + h) * 16 + masque((x, y) => teinte[y * V + x] > h, tx, ty));
      } else {
        ground[i] = blocGid('herbe_chemin', h * 16 + Math.floor(rs() * 16));
        herbePleine.push([i, h]);
      }
    }
  }
  // une case d'herbe franche : toute d'herbe, ses quatre coins aussi
  const surHerbe = (i) => {
    const tx = i % W, ty = Math.floor(i / W);
    return classe[i] === 'herbe' && S(tx, ty) === 'herbe' && S(tx + 1, ty) === 'herbe' && S(tx, ty + 1) === 'herbe' && S(tx + 1, ty + 1) === 'herbe';
  };
  const pris = new Uint8Array(N);      // cases déjà prises (rochers, pieds des arbres, tronc creux)

  // ---- 6. le tronc creux, au bord du plus grand étang
  if (etangs.length) {
    const rt = hasard('tronc');
    const bords = [];
    const eau = new Set(etangs[0]);
    for (let i = 0; i < N; i++) {
      const c = i % W;
      if (c >= W - 1 || !surHerbe(i) || !surHerbe(i + 1) || cour[i]) continue;
      if (pres(i, 2, (j) => eau.has(j)) && !pres(i, 1, (j) => eau.has(j))) bords.push(i);
    }
    if (bords.length) {
      const i = bords[Math.floor(rt() * bords.length)];
      plantes[i] = TRONC_CREUX[0]; plantes[i + 1] = TRONC_CREUX[1];
      pris[i] = pris[i + 1] = 1;
    }
  }

  // ---- 6b. l'entrée de la mine : 3 × 3 cases d'herbe franche, loin du chemin et de l'eau, la
  // porte (au milieu de la rangée du bas) ouverte sur 2 rangées d'herbe ; à bonne distance de la
  // maison, au plus épais du bois (sans tirage : les autres usages ne bougent pas)
  const bois = bruit(graine + ':bois', 18, 3);
  const autourMine = new Uint8Array(N);   // la mine et ses abords : ni arbre, ni rocher, ni touffe
  let mine = null;
  {
    const [dmin, dmax] = G.MINE_DISTANCE;
    let best = -Infinity;
    for (let r0 = 2; r0 + 5 < H - 1; r0++) {
      for (let c0 = 2; c0 + 3 < W - 2; c0++) {
        const d = Math.hypot(c0 + 1 - depart[0], r0 + 1 - depart[1]);
        if (d < dmin || d > dmax) continue;
        const score = bois(c0 + 1, r0 + 1);
        if (score <= best) continue;
        let ok = true;
        for (let r = r0; ok && r < r0 + 5; r++) {
          for (let c = c0; ok && c < c0 + 3; c++) {
            const i = idx(c, r);
            ok = surHerbe(i) && !cour[i] && !pris[i] && !pres(i, 2, (j) => classe[j] !== 'herbe' || pris[j]);
          }
        }
        if (ok) { best = score; mine = [c0, r0]; }
      }
    }
  }
  if (mine) {
    const [c0, r0] = mine, m = G.MINE_MARGE;
    for (let k = 0; k < 9; k++) plantes[idx(c0 + (k % 3), r0 + Math.floor(k / 3))] = MINE[k];
    for (let r = r0 - m; r < r0 + 5; r++) for (let c = c0 - m; c < c0 + 3 + m; c++) if (dedans(c, r)) { pris[idx(c, r)] = 1; autourMine[idx(c, r)] = 1; }
    objets.mine = { x: c0 * T, y: r0 * T, width: 3 * T, height: 3 * T };
  }

  // ---- 7. les rochers (jamais côte à côte : chacun est un groupe de cases à part)
  const rk = hasard('rochers');
  const formes = [['caillou', 0.36], ['moyen', 0.22], ['gros', 0.2], ['haut', 0.12], ['caillou2', 0.1]];
  for (let n = 0, essais = 0; n < G.ROCHERS && essais < G.ROCHERS * 40; essais++) {
    let t = rk(), nom = formes[0][0];
    for (const [f, p] of formes) { if (t < p) { nom = f; break; } t -= p; }
    const c0 = entre(rk, 1, W - 3), r0 = entre(rk, 1, H - 3);
    // (l'emprise de la forme est réservée ; un de ses dessins y est posé, choisi d'après la case)
    const F = DESSINS_ROCHERS[nom];
    const ok = F.emprise.every(([dc, dr]) => { const i = idx(c0 + dc, r0 + dr); return surHerbe(i) && !cour[i] && !pres(i, 1, (j) => pris[j] || classe[j] !== 'herbe'); });
    if (!ok) continue;
    for (const [dc, dr] of F.emprise) pris[idx(c0 + dc, r0 + dr)] = 1;
    for (const [dc, dr, g] of F.dessins[(c0 * 7 + r0 * 13) % F.dessins.length]) plantes[idx(c0 + dc, r0 + dr)] = g;
    n++;
  }

  // ---- 8. les arbres, les pins et les buissons
  const ra = hasard('arbres');
  const poses = [];                    // [pied y, pied x, bloc, l, h] (px, comme l'ancien carte_v2.py)
  const tailles = { arbre: [3, 4], pin: [4, 4], buisson_rond: [3, 2], buisson_large: [3, 2] };
  for (let gy = 1; gy < H; gy += 3) {
    for (let gx = 0; gx < W; gx += 3) {
      const tx = gx + Math.floor(ra() * 3), ty = gy + Math.floor(ra() * 3);
      const bord = Math.min(tx, ty, W - 1 - tx, H - 1 - ty);
      const d = bois(tx, ty) + Math.max(0, (G.ARBRES_BORD - bord) / G.ARBRES_BORD) * 0.45;
      const tire = ra(), espece = ra();
      // (au cœur d'un bois, presque à chaque place ; à sa lisière, moins souvent)
      if (d < G.ARBRES_SEUIL || tire > Math.min(0.95, 0.45 + (d - G.ARBRES_SEUIL) * 3)) continue;
      const bloc = espece < 0.58 ? 'arbre' : espece < 0.82 ? 'pin' : espece < 0.91 ? 'buisson_rond' : 'buisson_large';
      const [w, h] = tailles[bloc];
      const x0 = tx - Math.floor(w / 2), y1 = ty;
      // le pied (la rangée du bas) sur de l'herbe franche, loin de la cour, du chemin, de l'eau
      let ok = x0 >= 0 && x0 + w <= W && y1 < H - 1 && y1 - h + 1 >= 0;
      for (let c = x0; ok && c < x0 + w; c++) {
        const i = idx(c, y1);
        ok = surHerbe(i) && !cour[i] && !pris[i] && !pres(i, 1, (j) => classe[j] !== 'herbe' || pris[j]);
      }
      // (ni sur la mine ni devant : son feuillage la cacherait)
      for (let r = y1 - h + 1; ok && r <= y1; r++) for (let c = x0; ok && c < x0 + w; c++) ok = !cour[idx(c, r)] && !autourMine[idx(c, r)] && classe[idx(c, r)] !== 'chemin';
      if (!ok) continue;
      for (let c = x0; c < x0 + w; c++) pris[idx(c, y1)] = 1;
      poses.push([(y1 + 1) * T, (x0 + w / 2) * T, bloc, w, h]);
    }
  }
  // chaque dessin va dans la couche la plus en arrière où il ne touche rien de déjà posé, et
  // devant ceux qu'il chevauche (comme l'ancien carte_v2.py, étape 5)
  const ordre = ['layer_tree_4', 'layer_tree_3', 'layer_tree_2', 'layer_tree_1'];
  const arbres = {}, occupe = {};
  for (const nom of ordre) { arbres[nom] = vide(); occupe[nom] = new Set(); }
  const places = [], dessinsBuissons = [];
  poses.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [fy, fx, bloc, w, h] of poses) {
    const x0 = Math.round(fx / T - w / 2), y1 = Math.round(fy / T) - 1;
    const cases = [];
    for (let k = 0; k < w * h; k++) {
      const tx = x0 + (k % w), ty = y1 - h + 1 + Math.floor(k / w), g = blocGid(bloc, k);
      if (dedans(tx, ty) && !TUILES_VIDES.has(g)) cases.push([idx(tx, ty), g]);
    }
    const ids = new Set(cases.map((e) => e[0]));
    const autour = new Set(ids);
    for (const i of ids) {
      const c = i % W;
      for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N) autour.add(j);
    }
    let niveau = 0;
    for (const [nom, autres] of places) if ([...ids].some((i) => autres.has(i))) niveau = Math.max(niveau, ordre.indexOf(nom) + 1);
    let nom;
    for (;;) {
      if (niveau >= ordre.length) {
        const n2 = 'layer_tree_0' + 'b'.repeat(niveau - 4);
        ordre.push(n2); arbres[n2] = vide(); occupe[n2] = new Set();
      }
      nom = ordre[niveau];
      if (![...autour].some((i) => occupe[nom].has(i))) break;
      niveau++;
    }
    for (const [i, g] of cases) arbres[nom][i] = g;
    for (const i of ids) occupe[nom].add(i);
    places.push([nom, ids]);
    if (bloc.startsWith('buisson')) dessinsBuissons.push({ id: (x0 + Math.floor(w / 2)) + ',' + y1, nom, ids });
  }

  // ---- 9. les fleurs, sur l'herbe franche libre
  const rf = hasard('fleurs');
  const fleurs = [];
  for (const [i, h] of herbePleine) {
    if (rf() < G.FLEURS && !plantes[i] && !pris[i]) { plantes[i] = blocGid('herbe_deco', (4 + h) * 16 + Math.floor(rf() * 16)); fleurs.push(i); }
  }

  // ---- 10. l'herbe haute : des touffes groupées (comme scripts/carte/herbe_haute.py)
  const rh = hasard('herbe_haute');
  const dessus = Object.values(arbres);
  const libreHerbe = (tx, ty) => {
    if (!dedans(tx, ty)) return false;
    const i = idx(tx, ty);
    if (!surHerbe(i) || cour[i] || pris[i]) return false;
    // (ni sous un arbre ni juste au-dessus de son pied)
    return !dessus.some((d) => d[i] || (i + W < N && d[i + W]));
  };
  // Chaque zone a sa teinte (scripts/carte/herbe_haute.py, TEINTES : 0 vert, 1 vert roussi,
  // 2 brun léger, 3 mauve foncé), que ses touffes prennent le plus souvent ; certaines touffes
  // sont fleuries. Tirées à part (« herbe_teinte ») : les touffes restent aux mêmes places.
  const rt = hasard('herbe_teinte');
  const teinteTouffe = () => { const t = rt(); return t < 0.45 ? 0 : t < 0.65 ? 1 : t < 0.83 ? 2 : 3; };
  const variante = (herbe, zone) => herbe + 3 * (2 * (rt() < G.TOUFFE_ZONE ? zone : teinteTouffe()) + (rt() < G.TOUFFE_FLEURS ? 1 : 0));
  const touffes = [];
  for (let k = 0, essais = 0; k < G.TOUFFES && essais < G.TOUFFES * 20; essais++) {
    const cx = entre(rh, 3, W - 4), cy = entre(rh, 3, H - 4), r = G.TOUFFES_RAYON[0] + rh() * (G.TOUFFES_RAYON[1] - G.TOUFFES_RAYON[0]);
    if (!libreHerbe(cx, cy)) continue;
    const bosses = [0, 1, 2, 3, 4].map(() => (rh() - 0.5) * 0.7);
    const n0 = touffes.length, zone = teinteTouffe();
    for (let ty = Math.floor(cy - r - 2); ty <= cy + r + 2; ty++) {
      for (let tx = Math.floor(cx - r - 2); tx <= cx + r + 2; tx++) {
        const a = Math.atan2(ty - cy, tx - cx);
        const bord = r * (1 + bosses.reduce((s, b, n) => s + b * Math.sin((n + 2) * a + n), 0) / 2);
        if (Math.hypot(tx - cx, (ty - cy) * 1.2) > bord || !libreHerbe(tx, ty)) continue;
        const t = rh(), nb = G.TOUFFES_PAR_CASE.filter((p) => t >= p).length;
        for (let q = 0; q < nb; q++) touffes.push([tx * T + 8 + Math.round((rh() - 0.5) * 8), ty * T + 12 + Math.round((rh() - 0.5) * 6), variante(Math.floor(rh() * 3), zone)]);
      }
    }
    if (touffes.length > n0) k++;
  }
  touffes.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  // ---- 11. la carte
  // le poteau « Ville », au bout du chemin (comme sur la carte de Tiled : 34 px au-dessus du milieu)
  objets.ville = { x: W * T - 60, y: (sortie + 0.5) * T - 34, width: 20, height: 24 };
  const rect = (id, name, o) => ({ id, name, type: '', x: o.x, y: o.y, width: o.width, height: o.height, rotation: 0, visible: true });
  const couche = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
  let id = 1;
  const layers = [couche(id++, 'ground', ground), couche(id++, 'contour_herbe', rives), couche(id++, 'plantes_pierres', plantes)];
  for (const nom of ordre) layers.push(couche(id++, nom, arbres[nom]));
  layers.push({ id: id++, name: 'batiment', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
    objects: Object.entries(objets).map(([n, o], k) => rect(k + 1, n, o)) });
  layers.push({ id: id++, name: 'herbe_haute', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
    objects: touffes.map(([x, y, v], k) => ({ id: 9000 + k, name: '', type: String(v), x, y, width: 0, height: 0, rotation: 0, visible: true, point: true })) });
  layers.push({ id: id++, name: 'passages', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
    objects: [rect(9500, 'vers_la_transition', { x: (W - 1) * T, y: (sortie - 1) * T, width: T, height: 3 * T })] });
  const carte = {
    type: 'map', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width: W, height: H, tilewidth: T, tileheight: T, nextlayerid: id, nextobjectid: 9501,
    graine, layers, tilesets: [],
  };
  // BUISSONS : les buissons posés, [colonne de gauche, rangée du pied, largeur, hauteur, taille] en
  // tuiles (on y cueille des baies : atelier.js ; la hache les coupe : outils.js) ; taille :
  // « grand » (buisson_large) ou « petit » (buisson_rond)
  const buissons = poses.filter((p) => p[2].startsWith('buisson'))
    .map(([fy, fx, bloc, w, h]) => [Math.round(fx / T - w / 2), Math.round(fy / T) - 1, w, h, bloc === 'buisson_large' ? 'grand' : 'petit']);
  // (SOMMETS, TEINTES : les coins des cases, pour les chemins posés plus tard, tuileChemin)
  const sommets = Uint8Array.from(sommet, (k) => (k === 'eau' ? 2 : k === 'chemin' ? 1 : 0));
  // HERBES : les touffes d'herbe haute de chaque case, { case: [identifiants « x,y »] } (une case
  // où l'herbe pousse ne se bâtit qu'une fois fauchée : blocs.js)
  const herbes = {};
  for (const [x, y] of touffes) { const l = (herbes[Math.floor(y / T) * W + Math.floor(x / T)] ||= []), id = `${x},${y}`; if (!l.includes(id)) l.push(id); }
  // FLEURS : les cases où des fleurs poussent dans l'herbe (les abeilles des ruches y butinent :
  // js/engine/ruches.js fleursPourAbeilles)
  const terrain = Object.assign(terrainOfMap(carte), { DECALAGE: [ox, oy], BUISSONS: buissons, SOMMETS: sommets, TEINTES: teinte, HERBES: herbes, FLEURS: fleurs });
  // BUISSONS_CASES : { buisson: [cases] }, les cases que chaque buisson rend au terrain une fois
  // coupé (outils.js, casesBuissonsCoupes) : celles qui, sans les buissons, seraient de l'herbe
  // où l'on bâtit (« # » ou « + »). Une case sous deux buissons : libre quand les deux sont coupés.
  const sansBuissons = { ...carte, layers: carte.layers.map((l) => (arbres[l.name] ? { ...l, data: l.data.slice() } : l)) };
  for (const b of dessinsBuissons) {
    const l = sansBuissons.layers.find((x) => x.name === b.nom);
    for (const i of b.ids) l.data[i] = 0;
  }
  const L0 = terrain.LIGNES, L1 = terrainOfMap(sansBuissons).LIGNES;
  const car = (L, i) => L[Math.floor(i / W)][i % W];
  terrain.BUISSONS_CASES = {};
  for (const b of dessinsBuissons) {
    const libres = [...b.ids].filter((i) => car(L0, i) === '.' && (car(L1, i) === '#' || car(L1, i) === '+')).sort((a, c) => a - c);
    if (libres.length) terrain.BUISSONS_CASES[b.id] = (terrain.BUISSONS_CASES[b.id] || []).concat(libres);
  }
  return { carte, terrain };
}

/* ---------- les chemins posés (le bloc « chemin », blocs.js) ---------- */

// La tuile du sol de la case `i` avec les chemins posés `chemins` (un Set de cases), dessinée
// comme le chemin de la carte (étape 5 de genererFerme) : un coin de case est du chemin s'il
// l'était déjà, ou s'il touche une case de chemin posée ; l'eau reste de l'eau. Renvoie le
// numéro de tuile, ou null : la case garde sa tuile de la carte (rien de posé ne la touche,
// ou elle touche l'eau). Seulement sur la ferme générée (terrain.SOMMETS).
export function tuileChemin(terrain, chemins, i) {
  const S = terrain.SOMMETS, Te = terrain.TEINTES;
  if (!S || !Te) return null;
  const W = terrain.LARGEUR, H = terrain.HAUTEUR, V = W + 1;
  const tx = i % W, ty = Math.floor(i / W);
  const pose = (x, y) => {
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const c = x + dx, r = y + dy;
      if (c >= 0 && r >= 0 && c < W && r < H && chemins.has(r * W + c)) return true;
    }
    return false;
  };
  const coins = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
  let change = false;
  const types = coins.map(([x, y]) => {
    const k = S[y * V + x];
    if (k === 2) return 2;
    if (k === 0 && pose(x, y)) { change = true; return 1; }
    return k;
  });
  if (!change || types.includes(2)) return null;
  const h = Math.min(...coins.map(([x, y]) => Te[y * V + x]));
  const n = (types[0] === 1 ? 8 : 0) | (types[1] === 1 ? 4 : 0) | (types[2] === 1 ? 2 : 0) | (types[3] === 1 ? 1 : 0);
  return blocGid('herbe_chemin', n === 15 ? 4 * 16 + (hache('chemin:' + i) % 8) : (5 + h * 2) * 16 + n);
}

// Les tuiles du sol que les chemins posés changent : [[case, tuile]], les cases autour de
// chaque chemin (et le chemin lui-même).
export function tuilesChemins(terrain, chemins) {
  const W = terrain.LARGEUR, H = terrain.HAUTEUR, out = [], vues = new Set();
  for (const t of chemins) {
    const c0 = t % W, r0 = Math.floor(t / W);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = c0 + dc, r = r0 + dr, i = r * W + c;
      if (c < 0 || r < 0 || c >= W || r >= H || vues.has(i)) continue;
      vues.add(i);
      const g = tuileChemin(terrain, chemins, i);
      if (g) out.push([i, g]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}
