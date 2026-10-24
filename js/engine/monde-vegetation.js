import { DATA } from './catalog.js';
import { BIOME, BIOMES } from './monde-gen.js';

/* ---------- la végétation du grand monde, région par région (docs/grand-monde.md : fiche 5b) ---------- */

// Les arbres, buissons et plantes de chaque biome, posés d'après le biome et le sol de chaque case
// (les taches de la fiche 5a) : un calcul de la région, fait avec son sol (monde-sol.js,
// solDeRegion, donc dans le Web Worker sur le site, en direct dans Node et les tests), toujours le
// même pour une même graine, quelle que soit la région calculée d'abord : chaque case ne lit que le
// monde autour d'elle (ses coins, ses bruits, son hasard), jamais ce qu'une autre région a tiré.
// Les réglages : data/monde.json (VEGETATION) ; les dessins : scripts/carte/vegetation.py
// (assets/vegetation.png, vegetation.json : une liste d'images par sorte, dans l'ordre des
// variantes).
//
// Une case porte au plus une image (un arbre, un buisson, une plante haute) et, si elle n'en tire
// pas, au plus une petite plante. Rien sur la ferme (et FERME cases autour), près des lieux (la
// place des hameaux, des grottes, des coins de pêche), sur une case dont un coin est du chemin
// (les chemins et les gués restent libres), ni sur une case qui n'est pas d'un seul sol (une
// frontière, une rive : le dessin d'une plante la chevaucherait) ; l'eau n'en porte pas, sauf
// l'eau basse du marais (un sol).
//
// Les images : chaque case tire une sorte d'après les DENSITES de son biome et de son sol, chacune
// multipliée par la lisière (plus rares au bord du biome) et, dans la forêt, par les clairières
// (un bruit : là, la table « clairiere ») ; puis l'écart : de deux tirages à moins de `ecart` cases
// l'un de l'autre (en ligne droite : une case en biais est à 1,4 case), seul garde le plus fort (son nombre au hasard), comme
// cela ne dépend que des cases voisines, le résultat ne dépend pas de la région. Les cases
// « bloque » d'un arbre ou d'un buisson ne se traversent pas (la marche de la région) : jamais un
// chemin (ses cases sont exclues).
//
// Les petites plantes : la même table, leur part multipliée par un bruit (TOUFFES : elles vont par
// taches) ; elles sont peintes dans le canevas de la région (js/carte/ferme/sol.js) : la région en
// donne aussi pour les cases de son bord peint et une de plus autour (une plante déborde un peu de
// sa case), les mêmes que sa voisine.

export const VEGETATION = DATA.VEGETATION;
const V = VEGETATION;
export const SORTES = V.SORTES;
// le code de chaque sorte (SORTE.feuillu : 0…)
export const SORTE = Object.fromEntries(SORTES.map((s, k) => [s.nom, k]));
// une sorte en image (arbre, buisson, plante haute) ou peinte dans le sol (basse)
export const EN_IMAGE = SORTES.map((s) => s.genre !== 'basse');
const ECART_MAX = Math.max(...SORTES.map((s) => s.ecart || 0));
const BLOQUE_MAX = Math.max(...SORTES.map((s) => Math.max(0, ...(s.bloque || []).map(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy))))));
// la marge des tirages autour de la région : l'écart, ce que bloque une image, le bord peint
const MARGE = Math.max(3, ECART_MAX + BLOQUE_MAX + 2);

// Les tables d'un biome et d'un sol : [[sorte, part]…], les images d'un côté, les petites de
// l'autre, faites une fois (`codes` : le code de chaque sol, celui de monde-sol.js).
let tablesFaites = null;
function tables(codes) {
  if (tablesFaites && tablesFaites.codes === codes) return tablesFaites;
  const parBiome = BIOMES.map(() => new Map());
  let clairiere = null;
  for (const [b, sols] of Object.entries(V.DENSITES)) {
    for (const [sol, parts] of Object.entries(sols)) {
      const t = { images: [], basses: [] };
      for (const [nom, p] of Object.entries(parts)) (EN_IMAGE[SORTE[nom]] ? t.images : t.basses).push([SORTE[nom], p]);
      if (sol === 'clairiere') { if (b === 'foret') clairiere = t; continue; }
      parBiome[BIOME[b]].set(codes[sol], t);
    }
  }
  tablesFaites = { codes, parBiome, clairiere };
  return tablesFaites;
}

// Un nombre au hasard pour la case i (graine g) : 32 bits.
function hasard(g, i) {
  let h = (g ^ Math.imul(i + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}
const lisse = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Les cases réservées : la place des lieux (hameaux, entrées de grotte, coins de pêche), autour
// de chacun, faite une fois par monde (avec les éléments). → Uint8Array (1 : réservée).
export function reservesDuMonde(el, W, H) {
  const out = new Uint8Array(W * H);
  for (const [genre, rayon] of Object.entries(V.LIEUX)) {
    for (const l of (el.lieux && el.lieux[genre]) || []) {
      const c = l.case % W, r = Math.floor(l.case / W);
      for (let y = Math.max(0, r - rayon); y <= Math.min(H - 1, r + rayon); y++) {
        for (let x = Math.max(0, c - rayon); x <= Math.min(W - 1, c + rayon); x++) if ((x - c) ** 2 + (y - r) ** 2 <= rayon * rayon + 1) out[y * W + x] = 1;
      }
    }
  }
  return out;
}

// vegetationDeRegion(ctx, g) → { images, basses } (Int32Array : [sorte, x, y, variante] par
// plante, x et y en px de la carte, le pied ; les basses rangées par y, l'ordre où les peindre),
// et pose 0 dans g.marche (la marche de la région) sous les cases bloquées. `g` : ce que
// solDeRegion a déjà fait pour la région : cx0, cy0, cl, ch (la région), x0, y0, l, h (le
// rectangle peint), cSol, cCh, cTe (les sols, les chemins, les teintes des coins), cw, kx0, ky0
// (leur cadre), biomeDe(i), codes (le code de chaque sol), EAU (celui de l'eau), marche.
export function vegetationDeRegion(ctx, g) {
  const { cadre } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME, T = 16;
  const { cSol, cCh, cTe, cw, kx0, ky0, EAU, codes } = g;
  const tb = tables(codes), foret = BIOME.foret;
  const L = V.LISIERE, C = V.CLAIRIERES, TO = V.TOUFFES, FM = V.FERME;
  // le cadre des tirages : la région et MARGE cases autour (borné au monde)
  const gx0 = Math.max(0, g.cx0 - MARGE), gy0 = Math.max(0, g.cy0 - MARGE);
  const gx1 = Math.min(W, g.cx0 + g.cl + MARGE), gy1 = Math.min(H, g.cy0 + g.ch + MARGE);
  const gw = gx1 - gx0, gh = gy1 - gy0;
  // les biomes du cadre et de RAYON cases de plus (la lisière), et leurs sommes (une par biome
  // présent, à la demande) : la part des cases du même biome dans un carré autour d'une case
  const R = L.RAYON, bx0 = gx0 - R, by0 = gy0 - R, bw = gw + 2 * R, bh = gh + 2 * R, biomes = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    const wy = Math.min(H - 1, Math.max(0, by0 + y));
    for (let x = 0; x < bw; x++) biomes[y * bw + x] = g.biomeDe(wy * W + Math.min(W - 1, Math.max(0, bx0 + x)));
  }
  const sommes = new Map();
  const somme = (b) => {
    let s = sommes.get(b);
    if (s) return s;
    s = new Int32Array((bw + 1) * (bh + 1));
    for (let y = 0; y < bh; y++) {
      let ligne = 0;
      for (let x = 0; x < bw; x++) { ligne += biomes[y * bw + x] === b ? 1 : 0; s[(y + 1) * (bw + 1) + x + 1] = s[y * (bw + 1) + x + 1] + ligne; }
    }
    sommes.set(b, s);
    return s;
  };
  const partMeme = (b, X, Y) => {
    const s = somme(b), x = X - bx0, y = Y - by0, a = (y - R) * (bw + 1) + x - R, c = (y + R + 1) * (bw + 1) + x - R, n = 2 * R + 1;
    return (s[c + n] - s[c] - s[a + n] + s[a]) / (n * n);
  };
  // le sol d'une case : celui de ses quatre coins s'ils sont tous du même (et pas du chemin), sinon -1
  const solCase = (X, Y) => {
    const k = (Y - ky0) * cw + X - kx0, s = cSol[k];
    if (cSol[k + 1] !== s || cSol[k + cw] !== s || cSol[k + cw + 1] !== s) return -1;
    if (cCh[k] || cCh[k + 1] || cCh[k + cw] || cCh[k + cw + 1]) return -1;
    return s;
  };
  // la distance (en cases, jusqu'à 4) d'une case à l'eau la plus proche (un coin d'eau)
  const distEau = (X, Y) => {
    let best = 99;
    for (let dy = -4; dy <= 5; dy++) {
      for (let dx = -4; dx <= 5; dx++) {
        const cx = X + dx - kx0, k = (Y + dy - ky0) * cw + cx;
        if (cx < 0 || cx >= cw || k < 0 || k >= cSol.length || cSol[k] !== EAU) continue;
        const d = Math.max(dx <= 0 ? -dx : dx - 1, dy <= 0 ? -dy : dy - 1);
        if (d < best) best = d;
      }
    }
    return best;
  };
  const eauOk = (s, X, Y) => !s.eau || ((d) => d >= s.eau[0] && d <= s.eau[1])(distEau(X, Y));
  const reserve = ctx.reserves;
  const libre = (X, Y) => {
    if (X < 0 || Y < 0 || X >= W || Y >= H) return false;
    if (X >= F.X - FM && Y >= F.Y - FM && X < F.X + F.LARGEUR + FM && Y < F.Y + F.HAUTEUR + FM) return false;
    const i = Y * W + X;
    return !ctx.chemins[i] && !reserve[i];
  };
  // les tirages de chaque case du cadre : la table de sa case (ou null), son image (sorte + 1 ;
  // 0 : rien), sa force
  const table = new Array(gw * gh).fill(null), image = new Int16Array(gw * gh), force = new Uint32Array(gw * gh);
  const clair = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const Y = gy0 + y;
    for (let x = 0; x < gw; x++) {
      const X = gx0 + x, o = y * gw + x;
      if (!libre(X, Y)) continue;
      const s = solCase(X, Y);
      if (s < 0 || s === EAU) continue;
      const b = biomes[(Y - by0) * bw + X - bx0];
      let t = tb.parBiome[b] && tb.parBiome[b].get(s);
      if (!t) continue;
      let f = 1;
      if (b === foret && tb.clairiere) {
        const c = lisse((ctx.clairieres(X, Y) - C.SEUIL) / C.FONDU + 0.5);
        clair[o] = c;
        if (c >= 0.5) { t = tb.clairiere; f = 1; } else f = 1 - 2 * c;
      }
      table[o] = t;
      const h = hasard(ctx.gv, Y * W + X);
      force[o] = hasard(ctx.gv ^ 0x5bd1e995, Y * W + X);
      // la lisière : de MIN au bord à 1 à RAYON cases dedans
      f *= L.MIN + (1 - L.MIN) * lisse((partMeme(b, X, Y) - 0.5) * 2);
      // (les plantes hautes vont par taches, comme les petites)
      const ft = TO.MIN + (TO.MAX - TO.MIN) * ctx.touffes(X, Y);
      let u = (h & 0xffff) / 0x10000, cumul = 0;
      for (const [k, p] of t.images) {
        cumul += p * f * (SORTES[k].genre === 'haute' ? ft : 1);
        if (u < cumul) {
          const so = SORTES[k];
          // ses autres cases bloquées : libres, du même sol
          if ((so.bloque || []).every(([dx, dy]) => (!dx && !dy) || (libre(X + dx, Y + dy) && solCase(X + dx, Y + dy) === s)) && eauOk(so, X, Y)) image[o] = k + 1;
          break;
        }
      }
    }
  }
  // l'écart : une image n'est gardée que si aucune image plus forte n'est à moins de l'écart
  const garde = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const o = y * gw + x;
      if (!image[o]) continue;
      const e0 = SORTES[image[o] - 1].ecart || 0;
      let ok = true;
      for (let dy = -ECART_MAX; dy <= ECART_MAX && ok; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -ECART_MAX; dx <= ECART_MAX; dx++) {
          const xx = x + dx;
          if ((!dx && !dy) || xx < 0 || xx >= gw) continue;
          const q = yy * gw + xx;
          if (!image[q]) continue;
          // (la distance entre les deux cases : un arbre sur une case en biais de l'autre est à
          // 1,4 case, au-delà d'un écart de 1)
          const e = Math.max(e0, SORTES[image[q] - 1].ecart || 0);
          if (dx * dx + dy * dy > e * e) continue;
          if (force[q] > force[o] || (force[q] === force[o] && q > o)) { ok = false; break; }
        }
      }
      if (ok) garde[o] = 1;
    }
  }
  const images = [], basses = [];
  const dansRegion = (X, Y) => X >= g.cx0 && Y >= g.cy0 && X < g.cx0 + g.cl && Y < g.cy0 + g.ch;
  for (let y = 0; y < gh; y++) {
    const Y = gy0 + y;
    for (let x = 0; x < gw; x++) {
      const X = gx0 + x, o = y * gw + x;
      if (garde[o]) {
        const k = image[o] - 1, so = SORTES[k], h = hasard(ctx.gv ^ 0x27d4eb2f, Y * W + X);
        // ses cases bloquées, dans la région
        for (const [dx, dy] of so.bloque || []) if (dansRegion(X + dx, Y + dy)) g.marche[(Y + dy - g.cy0) * g.cl + X + dx - g.cx0] = 0;
        if (dansRegion(X, Y)) images.push(k, X * T + 8 + ((h >>> 4) % 7) - 3, Y * T + 13 + ((h >>> 8) % 3), (h >>> 12) % so.variantes);
        continue;
      }
      // les petites : le rectangle peint, et une case de plus autour
      if (image[o] || !table[o] || X < g.x0 - 1 || Y < g.y0 - 1 || X > g.x0 + g.l || Y > g.y0 + g.h) continue;
      const t = table[o];
      if (!t.basses.length) continue;
      const h = hasard(ctx.gv ^ 0x165667b1, Y * W + X);
      const f = TO.MIN + (TO.MAX - TO.MIN) * ctx.touffes(X, Y);
      let u = (h & 0xffff) / 0x10000, cumul = 0;
      for (const [k, p] of t.basses) {
        cumul += p * f;
        if (u < cumul) {
          const so = SORTES[k];
          if (!eauOk(so, X, Y)) break;
          let v = (h >>> 20) % so.variantes;
          if (so.teinte) {
            const kk = (Y - ky0) * cw + X - kx0, te = Math.min(3, cTe[kk], cTe[kk + 1], cTe[kk + cw], cTe[kk + cw + 1]);
            v = te * (so.variantes >> 2) + (v % (so.variantes >> 2));
          }
          basses.push(k, X * T + 8 + ((h >>> 16) % 9) - 4, Y * T + 11 + ((h >>> 26) % 5), v);
          break;
        }
      }
    }
  }
  // les petites, de haut en bas (celle du dessous est peinte par-dessus)
  const n = basses.length / 4, ordre = Array.from({ length: n }, (_, k) => k).sort((a, b) => basses[a * 4 + 2] - basses[b * 4 + 2] || basses[a * 4 + 1] - basses[b * 4 + 1]);
  const bs = new Int32Array(basses.length);
  ordre.forEach((k, j) => { for (let q = 0; q < 4; q++) bs[j * 4 + q] = basses[k * 4 + q]; });
  return { images: Int32Array.from(images), basses: bs };
}
