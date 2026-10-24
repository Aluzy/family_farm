import { DATA } from './catalog.js';
import { BIOME, BIOMES } from './monde-gen.js';
import { MARGE_ROCHES, SORTES as SORTES_VEG, VEGETATION } from './monde-vegetation.js';

/* ---------- les rochers, les falaises et la côte du grand monde (docs/grand-monde.md : fiche 5c) ---------- */

// Ce qui est minéral et ce qui borde la mer, posé région par région avec la végétation (fiche 5b),
// dans le même calcul (monde-sol.js, solDeRegion : dans le Web Worker sur le site) et de la même
// façon : chaque case ne lit que le monde autour d'elle (ses coins, son biome, son relief, son
// hasard), jamais ce qu'une autre région a tiré ; le résultat ne dépend pas de l'ordre des régions.
// Les réglages : data/monde.json (ROCHES) ; les dessins : scripts/carte/roches.py
// (assets/roches.png, roches.json).
//
//   - Les falaises en relief (genre « paroi ») : au bas de chaque bande de cases « hautes » du plan
//     (une falaise, un sommet : on n'y marche pas), une colonne par case, posée sur la case du bas
//     de la bande : sa face haute d'autant de cases que la bande en a (trois au plus), son rebord
//     (la neige sous un sommet, l'herbe sous une terre verte, la roche ailleurs), ses arêtes là où
//     la bande s'arrête (un pli plus discret là où elle fait une marche d'une case), la tranche de sa texture d'après sa colonne (colonne modulo 3 : les
//     colonnes voisines se raccordent). Toutes viennent du plan seul (pas de hasard) : une bande
//     continue, chaque colonne une fois, dans la région de sa case.
//   - Les grandes pièces (« bloc » : rochers, gros blocs, rochers moussus, éboulis, pitons, rochers
//     et sapins enneigés ; « mer » : les rochers dans l'eau) : chaque case tire une sorte d'après la
//     table de son biome et de son sol (DENSITES, « haut » : la montagne près des sommets), plus les
//     éboulis au pied des pentes (EBOULIS : la pente du relief, le pied d'une falaise), les rochers
//     dans la mer près du rivage (MER) ; puis l'écart, comme la végétation : de deux tirages trop
//     proches, le plus fort reste, et un rocher ne se pose pas près d'un arbre gardé (les tirages
//     de la végétation, faits juste avant : monde-vegetation.js, apresTirages). Leurs cases
//     « bloque » ferment la marche ; jamais sur un chemin, la ferme, un lieu.
//   - L'épave (une par monde au plus) : une plage tirée une fois (epaveDuMonde), la meilleure place
//     d'une fenêtre de cases autour : la même pour toutes les régions.
//   - Les petites pièces (« basse » : galets, pierres, coquillages, étoiles de mer, algues,
//     congères) : peintes dans le sol de la région, comme les petites plantes, là où ni une plante
//     ni une pièce n'est déjà.

export const ROCHES = DATA.ROCHES;
const R = ROCHES;
export const SORTES_ROCHES = R.SORTES;
export const SORTE_ROCHE = Object.fromEntries(SORTES_ROCHES.map((s, k) => [s.nom, k]));
const GENRE = SORTES_ROCHES.map((s) => s.genre);
const ECART_MAX = Math.max(...SORTES_ROCHES.map((s) => s.ecart || 0));
const ECART_VEG = SORTES_VEG.map((s) => (s.genre === 'basse' ? 0 : s.ecart || 0));
const { mer, falaise, sommet, montagne, lande, plage } = BIOME;
const HAUTS = new Uint8Array(BIOMES.length);
HAUTS[falaise] = HAUTS[sommet] = 1;
const EAUX = new Uint8Array(BIOMES.length);
for (const b of ['mer', 'lac', 'riviere']) EAUX[BIOME[b]] = 1;
// le rebord d'une falaise sous ces biomes : de l'herbe
const VERTS = new Uint8Array(BIOMES.length);
for (const b of ['prairie', 'foret', 'lande', 'marais']) VERTS[BIOME[b]] = 1;
const MER_MAX = R.MER.PART * R.MER.TACHES[1] * R.MER.FALAISE, EBOULIS_MAX = R.EBOULIS.PART + R.EBOULIS.PIED;

function hasard(g, i) {
  let h = (g ^ Math.imul(i + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}
const lisse = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Les tables d'un biome et d'un sol : { images: [[sorte, part]…], basses } (les codes des sols :
// ceux de monde-sol.js ; « haut » : à part).
let tablesFaites = null;
function tables(codes) {
  if (tablesFaites && tablesFaites.codes === codes) return tablesFaites;
  const parBiome = BIOMES.map(() => new Map());
  let haut = null;
  for (const [b, sols] of Object.entries(R.DENSITES)) {
    for (const [sol, parts] of Object.entries(sols)) {
      const t = { images: [], basses: [] };
      for (const [nom, p] of Object.entries(parts)) (GENRE[SORTE_ROCHE[nom]] === 'basse' ? t.basses : t.images).push([SORTE_ROCHE[nom], p]);
      if (sol === 'haut') { haut = t; continue; }
      parBiome[BIOME[b]].set(codes[sol], t);
    }
  }
  tablesFaites = { codes, parBiome, haut };
  return tablesFaites;
}

// L'épave du monde : { X, Y, v } (la case de son pied, avant gauche ; sa variante) ou null, tirée
// une fois (gardée dans le contexte) : un coin de plage au bord de la mer choisi parmi tous (un
// aperçu des biomes, une valeur tous les 4 cases), puis la meilleure place d'une fenêtre de 24 × 24
// cases autour. `solBrut(i)` : le sol d'une case (sans les bords naturels).
export function epaveDuMonde(ctx, solBrut, sable) {
  if (ctx.epave !== undefined) return ctx.epave;
  ctx.epave = null;
  const { cadre, lire } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, P = 4, E = R.EPAVE;
  const lx = Math.floor(W / P), ly = Math.floor(H / P), bio = new Uint8Array(lx * ly);
  for (let y = 0; y < ly; y++) for (let x = 0; x < lx; x++) bio[y * lx + x] = lire.biome((y * P + 2) * W + x * P + 2);
  let best = -1, bloc = -1;
  for (let y = 0; y < ly - 1; y++) {
    for (let x = 0; x < lx; x++) {
      if (bio[y * lx + x] !== plage || (bio[(y + 1) * lx + x] !== mer && (y + 2 >= ly || bio[(y + 2) * lx + x] !== mer))) continue;
      const h = hasard(ctx.gr ^ 0x2c1b3c6d, y * lx + x);
      if (h > best) { best = h; bloc = y * lx + x; }
    }
  }
  if (bloc < 0) return null;
  const bx = (bloc % lx) * P + 2, by = Math.floor(bloc / lx) * P + 2, F = cadre.FERME, FM = VEGETATION.FERME;
  let note = -1;
  const biome = (X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H ? mer : ctx.elements.eaux[Y * W + X] !== 255 ? ctx.elements.eaux[Y * W + X] : lire.biome(Y * W + X));
  for (let Y = by - 12; Y < by + 12; Y++) {
    for (let X = bx - 12; X < bx + 12; X++) {
      let ok = true;
      for (let dy = -1; dy <= 0 && ok; dy++) {
        for (let dx = 0; dx <= 2 && ok; dx++) {
          const x = X + dx, y = Y + dy, i = y * W + x;
          if (x < 0 || y < 0 || x >= W || y >= H || biome(x, y) !== plage || solBrut(i, x, y) !== sable || ctx.reserves[i]) ok = false;
          else if (x >= F.X - FM && y >= F.Y - FM && x < F.X + F.LARGEUR + FM && y < F.Y + F.HAUTEUR + FM) ok = false;
        }
      }
      // (la mer juste devant, à 1 à 3 cases au sud ; aucun chemin à moins de CHEMIN cases)
      if (!ok || ![1, 2, 3].some((d) => biome(X + 1, Y + d) === mer) || biome(X + 1, Y + 1) === mer && biome(X, Y + 1) !== mer && biome(X + 2, Y + 1) !== mer) continue;
      for (let y = Math.max(0, Y - E.CHEMIN); y <= Math.min(H - 1, Y + E.CHEMIN) && ok; y++) {
        for (let x = Math.max(0, X - E.CHEMIN); x <= Math.min(W - 1, X + 2 + E.CHEMIN); x++) if (ctx.chemins[y * W + x]) { ok = false; break; }
      }
      if (!ok) continue;
      const h = hasard(ctx.gr ^ 0x5f356495, Y * W + X);
      if (h > note) { note = h; ctx.epave = { X, Y, v: h % SORTES_ROCHES[SORTE_ROCHE.epave].variantes }; }
    }
  }
  return ctx.epave;
}

// rochesDeRegion(ctx, g, t) : les grandes pièces de la région (ses falaises, ses rochers, son
// épave), d'après les tirages de la végétation `t` (monde-vegetation.js, apresTirages) ; pose 0
// dans g.marche sous les cases fermées. `g` : ce que solDeRegion a déjà fait (comme pour la
// végétation, plus solBrut(i, x, y), le sol d'une case sans les bords naturels). → { images
// (Int32Array : [sorte, x, y, variante], le pied en px), pris(X, Y) (une case prise par une pièce :
// pas de petite plante ni de petite pièce dessous), table, gx0, gy0, gw, gh } (le reste sert aux
// petites pièces : bassesRoches).
export function rochesDeRegion(ctx, g, t) {
  const { cadre } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, TT = 16;
  const tb = tables(g.codes), EAU = g.EAU;
  const biome = (X, Y) => g.biomeDe(Math.min(H - 1, Math.max(0, Y)) * W + Math.min(W - 1, Math.max(0, X)));
  const haut = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && HAUTS[biome(X, Y)] === 1;
  const images = [];
  // les falaises : une colonne au bas de chaque bande, dans la région
  const P = R.PAROIS;
  for (let Y = g.cy0; Y < g.cy0 + g.ch; Y++) {
    for (let X = g.cx0; X < g.cx0 + g.cl; X++) {
      if (!haut(X, Y) || Y + 1 >= H || haut(X, Y + 1)) continue;
      let n = 1;
      while (n < 3 && haut(X, Y - n)) n++;
      // (le rebord : ce qu'il y a au-dessus de la face, la bande elle-même si elle est plus haute)
      const b0 = biome(X, Y), dessus = biome(X, Y - n);
      const nom = b0 === sommet || dessus === sommet ? 'paroi_neige' : VERTS[dessus] ? 'paroi_herbe' : 'paroi';
      // (ses bouts : la bande continue à côté (0), une marche, la voisine commençant une case plus
      // haut (1), l'arête, la bande s'arrêtant (2))
      const bout = (x) => (haut(x, Y) ? 0 : haut(x, Y - 1) ? 1 : 2);
      images.push(SORTE_ROCHE[nom], X * TT + 8, Y * TT + (EAUX[biome(X, Y + 1)] ? P.EAU : P.TERRE), ((n - 1) * 9 + bout(X - 1) + 3 * bout(X + 1)) * 3 + (X % 3));
    }
  }
  // les grandes pièces : le cadre des tirages de la végétation, moins la marge de ses écarts
  const M = MARGE_ROCHES - ECART_MAX;
  const fx0 = Math.max(0, g.cx0 - M), fy0 = Math.max(0, g.cy0 - M), fx1 = Math.min(W, g.cx0 + g.cl + M), fy1 = Math.min(H, g.cy0 + g.ch + M);
  const fw = fx1 - fx0, fh = fy1 - fy0;
  const vegIci = (X, Y) => {
    const x = X - t.gx0, y = Y - t.gy0;
    return x >= 0 && y >= 0 && x < t.gw && y < t.gh ? (t.garde[y * t.gw + x] ? t.image[y * t.gw + x] : 0) : 0;
  };
  // (l'épave : ses six cases, et une autour, ne portent rien d'autre)
  const sol = (X, Y) => g.solBrut(Y * W + X, X, Y);
  const ep = epaveDuMonde(ctx, (i, x, y) => g.solBrut(i, x, y), g.codes.sable);
  const surEpave = (X, Y, m) => !!ep && X >= ep.X - m && X <= ep.X + 2 + m && Y >= ep.Y - 1 - m && Y <= ep.Y + m;
  // la distance (en cases, jusqu'à 4) d'une case d'eau à la terre
  const distTerre = (X, Y) => {
    let d = 99;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = X + dx, y = Y + dy;
        if (x < 0 || y < 0 || x >= W || y >= H || EAUX[biome(x, y)]) continue;
        d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
    return d;
  };
  const pres = (X, Y, b, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (biome(X + dx, Y + dy) === b) return true;
    return false;
  };
  const choix = new Int16Array(fw * fh), force = new Uint32Array(fw * fh), table = new Array(fw * fh).fill(null);
  const relief = (X, Y) => ctx.lire.relief(Math.min(H - 1, Math.max(0, Y)) * W + Math.min(W - 1, Math.max(0, X)));
  for (let y = 0; y < fh; y++) {
    const Y = fy0 + y;
    for (let x = 0; x < fw; x++) {
      const X = fx0 + x, o = y * fw + x;
      if (!t.libre(X, Y) || surEpave(X, Y, 1)) continue;
      const b = biome(X, Y), s = t.solCase(X, Y);
      if (s < 0 || HAUTS[b] && b !== sommet) continue;
      // (sur les sommets, pas près de leur bas : la face des falaises y est)
      if (b === sommet) { let ok = true; for (let d = 1; d <= R.SOMMET && ok; d++) ok = haut(X, Y + d); if (!ok) continue; }
      const i = Y * W + X, h = hasard(ctx.gr, i);
      const u = (h & 0xffff) / 0x10000, u2 = (h >>> 16) / 0x10000;
      let k = -1;
      if (s === EAU) {
        // un rocher dans la mer, près du rivage (le tirage d'abord : la distance coûte)
        if (b !== mer || u >= MER_MAX) continue;
        const d = distTerre(X, Y);
        if (d < R.MER.DISTANCE[0] || d > R.MER.DISTANCE[1]) continue;
        // (par groupes : la part suit un bruit, celui des touffes de la végétation)
        const tache = R.MER.TACHES[0] + (R.MER.TACHES[1] - R.MER.TACHES[0]) * lisse((ctx.touffes(X, Y) - 0.35) / 0.4);
        if (u < R.MER.PART * tache * (pres(X, Y, falaise, 4) ? R.MER.FALAISE : 1)) k = SORTE_ROCHE.rocher_mer;
      } else {
        const tab = b === montagne && relief(X, Y) >= R.HAUT && tb.haut ? tb.haut : tb.parBiome[b] && tb.parBiome[b].get(s);
        if (tab) table[o] = tab;
        // les éboulis (un autre tirage) : au pied des pentes, au pied des falaises et des sommets
        if ((b === montagne || b === lande || b === plage) && u2 < EBOULIS_MAX) {
          let p = 0;
          if (b !== plage) {
            const dx = relief(X + 2, Y) - relief(X - 2, Y), dy = relief(X, Y + 2) - relief(X, Y - 2), pente = Math.sqrt(dx * dx + dy * dy);
            p = R.EBOULIS.PART * lisse((pente - R.EBOULIS.PENTE[0]) / (R.EBOULIS.PENTE[1] - R.EBOULIS.PENTE[0]));
          }
          if (haut(X, Y - 1) || haut(X, Y - 2) || haut(X, Y - 3)) p += R.EBOULIS.PIED;
          if (u2 < p) k = SORTE_ROCHE.eboulis;
        }
        if (k < 0 && tab) {
          let cumul = 0;
          for (const [kk, p] of tab.images) { cumul += p; if (u < cumul) { k = kk; break; } }
        }
      }
      if (k < 0) continue;
      const so = SORTES_ROCHES[k];
      // ses autres cases : libres, du même sol, pas hautes, sans arbre
      if (!(so.bloque || []).every(([dx, dy]) => (!dx && !dy) || (t.libre(X + dx, Y + dy) && t.solCase(X + dx, Y + dy) === s && !haut(X + dx, Y + dy) && !surEpave(X + dx, Y + dy, 1)))) continue;
      choix[o] = k + 1;
      force[o] = hasard(ctx.gr ^ 0x5bd1e995, i);
    }
  }
  // l'écart : entre les pièces, et avec les arbres et les buissons gardés de la végétation
  const garde = new Uint8Array(fw * fh), E = Math.max(ECART_MAX, ...ECART_VEG);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const o = y * fw + x;
      if (!choix[o]) continue;
      const e0 = SORTES_ROCHES[choix[o] - 1].ecart || 0;
      let ok = true;
      for (let dy = -E; dy <= E && ok; dy++) {
        for (let dx = -E; dx <= E; dx++) {
          const v = vegIci(fx0 + x + dx, fy0 + y + dy);
          if (v && dx * dx + dy * dy <= Math.max(e0, ECART_VEG[v - 1], 1) ** 2) { ok = false; break; }
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= fw || yy >= fh) continue;
          const q = yy * fw + xx;
          if (!choix[q]) continue;
          const e = Math.max(e0, SORTES_ROCHES[choix[q] - 1].ecart || 0);
          if (dx * dx + dy * dy > e * e) continue;
          if (force[q] > force[o] || (force[q] === force[o] && q > o)) { ok = false; break; }
        }
      }
      if (ok) garde[o] = 1;
    }
  }
  const prisCases = new Set();
  const dansRegion = (X, Y) => X >= g.cx0 && Y >= g.cy0 && X < g.cx0 + g.cl && Y < g.cy0 + g.ch;
  const ferme = (X, Y) => { prisCases.add(Y * W + X); if (dansRegion(X, Y)) g.marche[(Y - g.cy0) * g.cl + X - g.cx0] = 0; };
  for (let y = 0; y < fh; y++) {
    const Y = fy0 + y;
    for (let x = 0; x < fw; x++) {
      const o = y * fw + x;
      if (!garde[o]) continue;
      const X = fx0 + x, k = choix[o] - 1, so = SORTES_ROCHES[k], h = hasard(ctx.gr ^ 0x27d4eb2f, Y * W + X);
      for (const [dx, dy] of so.bloque || [[0, 0]]) ferme(X + dx, Y + dy);
      if (!so.bloque) prisCases.add(Y * W + X);
      if (dansRegion(X, Y)) images.push(k, X * TT + 8 + ((h >>> 4) % 5) - 2, Y * TT + 13 + ((h >>> 8) % 3), (h >>> 12) % so.variantes);
    }
  }
  if (ep) {
    for (const [dx, dy] of SORTES_ROCHES[SORTE_ROCHE.epave].bloque) ferme(ep.X + dx, ep.Y + dy);
    if (dansRegion(ep.X, ep.Y)) images.push(SORTE_ROCHE.epave, ep.X * TT + 8, ep.Y * TT + 13, ep.v);
  }
  return { images, pris: (X, Y) => prisCases.has(Y * W + X), table, fx0, fy0, fw, fh, garde: (X, Y) => vegIci(X, Y) > 0, sol };
}

// bassesRoches(ctx, g, r, t, vegBasses) → les petites pièces de la région (Int32Array, [sorte, x,
// y, variante], rangées par y : l'ordre où les peindre), pour son rectangle peint et une case de
// plus autour (les mêmes que sa voisine), là où ni une pièce, ni une plante (vegBasses : les
// petites plantes de la végétation), ni un arbre n'est.
export function bassesRoches(ctx, g, r, t, vegBasses) {
  const W = ctx.cadre.LARGEUR, TT = 16, plantes = new Set();
  for (let k = 0; k < vegBasses.length; k += 4) plantes.add(Math.floor((vegBasses[k + 2] - 1) / TT) * W + Math.floor(vegBasses[k + 1] / TT));
  const out = [];
  for (let Y = g.y0 - 1; Y <= g.y0 + g.h; Y++) {
    for (let X = g.x0 - 1; X <= g.x0 + g.l; X++) {
      const x = X - r.fx0, y = Y - r.fy0;
      if (x < 0 || y < 0 || x >= r.fw || y >= r.fh) continue;
      const tab = r.table[y * r.fw + x];
      if (!tab || !tab.basses.length || r.pris(X, Y) || r.garde(X, Y) || plantes.has(Y * W + X)) continue;
      const h = hasard(ctx.gr ^ 0x165667b1, Y * W + X);
      let u = (h & 0xffff) / 0x10000, cumul = 0;
      for (const [k, p] of tab.basses) {
        cumul += p;
        if (u < cumul) {
          const so = SORTES_ROCHES[k];
          if (so.eau) { const d = t.distEau(X, Y); if (d < so.eau[0] || d > so.eau[1]) break; }
          out.push(k, X * TT + 8 + ((h >>> 16) % 9) - 4, Y * TT + 11 + ((h >>> 26) % 5), (h >>> 20) % so.variantes);
          break;
        }
      }
    }
  }
  const n = out.length / 4, ordre = Array.from({ length: n }, (_, k) => k).sort((a, b) => out[a * 4 + 2] - out[b * 4 + 2] || out[a * 4 + 1] - out[b * 4 + 1]);
  const bs = new Int32Array(out.length);
  ordre.forEach((k, j) => { for (let q = 0; q < 4; q++) bs[j * 4 + q] = out[k * 4 + q]; });
  return bs;
}
