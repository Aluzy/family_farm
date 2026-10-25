import { DATA } from './catalog.js';
import { BIOME, BIOMES } from './monde-gen.js';
import { hache } from './ferme-generee.js';

/* ---------- les bêtes du grand monde (docs/grand-monde.md : fiche 6b) ----------

   Chaque biome a ses bêtes, posées région par région, dans le même calcul que la végétation et les
   rochers (monde-sol.js, solDeRegion : dans le Web Worker sur le site), d'après le plan seul et le
   hasard de la région : la même région donne toujours les mêmes bêtes, à la même place, quel que soit
   l'ordre où les régions se font. La scène les anime (js/carte/ferme/faune-monde.js) : elles vont et
   viennent autour de leur place, fuient le personnage, dorment ou se cachent la nuit. On ne les
   chasse pas : on les regarde (leur page de l'encyclopédie se découvre la première fois qu'on en voit
   une). Les réglages : data/monde.json (FAUNE) ; les dessins : scripts/carte/faune.py.

   Une espèce vit sur des cases permises (casePermise) : son `lieu` (« terre » : une case où l'on
   marche, ni la ferme ni sa marge, ni un chemin, ni un lieu du plan ; « eau » : une case d'eau, pas
   un ponton ; « air » : au-dessus, le biome seul compte), ses `biomes`, ses `sols` (le sol d'une
   case, monde-sol.js : l'eau basse du marais pour les canards), son `relief` (au moins), sa
   distance à l'eau (`eau`, pour une bête de terre) ou à la terre (`rive`, pour une bête d'eau). Une
   région tire, pour chaque espèce, des groupes (`densite` pour 1 000 cases de ses biomes dans la
   région ; la part qui reste, au hasard), chacun autour d'une case permise tirée (24 essais au
   plus), ses membres à deux cases au plus. Au plus PAR_REGION bêtes par région (les groupes en
   trop, tirés, ne sont pas posés). */

export const FAUNE = DATA.FAUNE;
export const ESPECES_FAUNE = Object.keys(FAUNE.ESPECES);
export const ESPECE_FAUNE = Object.fromEntries(ESPECES_FAUNE.map((n, k) => [n, k]));
const DEFS = ESPECES_FAUNE.map((n) => FAUNE.ESPECES[n]);
const EAUX = new Uint8Array(BIOMES.length);
for (const b of ['mer', 'lac', 'riviere']) EAUX[BIOME[b]] = 1;

function hasard(g, a, b = 0, c = 0) {
  let h = (g ^ Math.imul(a + 1, 2654435761) ^ Math.imul(b + 7, 2246822519) ^ Math.imul(c + 13, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

// La distance (en cases, Tchebychev) de la case (X, Y) à la plus proche qui répond à `test`, cherchée
// jusqu'à `max` cases ; Infinity au-delà.
function distance(X, Y, max, test, W, H) {
  for (let d = 1; d <= max; d++) {
    for (let k = -d; k <= d; k++) {
      for (const [x, y] of [[X + k, Y - d], [X + k, Y + d], [X - d, Y + k], [X + d, Y + k]]) {
        if (x >= 0 && y >= 0 && x < W && y < H && test(y * W + x)) return d;
      }
    }
  }
  return Infinity;
}

// La case i est-elle permise à l'espèce `e` ? `ctx` : le contexte du monde (monde-sol.js) ;
// `marche(i)` : peut-on y marcher (la marche de la région, après la végétation, les rochers, les
// lieux) ; `nomSol(i)` : le nom du sol de la case (monde-sol.js, nomSolDeCase).
export function casePermise(ctx, e, i, marche, nomSol) {
  const W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR, F = ctx.cadre.FERME, M = FAUNE.FERME;
  const X = i % W, Y = Math.floor(i / W);
  if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) return false;
  if (X >= F.X - M && Y >= F.Y - M && X < F.X + F.LARGEUR + M && Y < F.Y + F.HAUTEUR + M) return false;
  const bio = (j) => { const v = ctx.elements.eaux[j]; return v !== 255 ? v : ctx.lire.biome(j); };
  const b = bio(i);
  if (!e.biomes.includes(BIOMES[b])) return false;
  if (e.relief && ctx.lire.relief(i) < e.relief) return false;
  if (e.lieu === 'terre') {
    if (!marche(i) || ctx.reserves[i] || ctx.chemins[i]) return false;
  } else if (e.lieu === 'eau') {
    // (le marais : son eau basse ; ailleurs, l'eau du plan)
    // (ni un ponton, où l'on marche)
    if (!EAUX[b] && !(e.sols && e.sols.includes(nomSol(i)))) return false;
    if (EAUX[b] && marche(i)) return false;
  }
  if (e.sols && e.lieu !== 'eau' && !e.sols.includes(nomSol(i))) return false;
  if (e.eau) {
    const d = distance(X, Y, e.eau[1] || 8, (j) => EAUX[bio(j)] === 1, W, H);
    if (d < e.eau[0] || (e.eau[1] && d > e.eau[1])) return false;
  }
  if (e.rive && e.lieu === 'eau') {
    const terre = (j) => !EAUX[bio(j)] && !(e.sols && e.sols.includes(nomSol(j)));
    const d = distance(X, Y, e.rive[1] || e.rive[0], terre, W, H);
    if (d < e.rive[0] || (e.rive[1] && d > e.rive[1])) return false;
  }
  return true;
}

// fauneDeRegion(ctx, g) → Int32Array ([espèce, x, y, variante] par bête : son code dans ESPECES_FAUNE,
// sa place en px (le pied), sa variante (un jeu d'images, et son hasard). `g` : la région (solDeRegion :
// cx0, cy0, cl, ch, biome, marche — celle d'après la végétation, les rochers et les lieux).
export function fauneDeRegion(ctx, g) {
  if (ctx.gf === undefined) ctx.gf = hache(ctx.graine + ':faune');
  const W = ctx.cadre.LARGEUR, { cx0, cy0, cl, ch, marche, biome } = g, T = 16, gf = ctx.gf;
  const rx = Math.floor(cx0 / ctx.taille), ry = Math.floor(cy0 / ctx.taille), cle = ry * 64 + rx;
  const ici = (i) => {
    const X = i % W, Y = Math.floor(i / W);
    return X >= cx0 && Y >= cy0 && X < cx0 + cl && Y < cy0 + ch && marche[(Y - cy0) * cl + X - cx0] === 1;
  };
  // les cases de chaque biome dans la région
  const parBiome = new Uint32Array(BIOMES.length);
  for (let k = 0; k < biome.length; k++) parBiome[biome[k]]++;
  const groupes = [];
  DEFS.forEach((e, code) => {
    let n = 0;
    for (const b of e.biomes) n += parBiome[BIOME[b]] || 0;
    if (!n) return;
    const voulu = (e.densite * n) / 1000;
    let nb = Math.floor(voulu);
    if ((hasard(gf, cle, code, 1) % 10000) / 10000 < voulu - nb) nb++;
    for (let q = 0; q < nb; q++) {
      for (let essai = 0; essai < 24; essai++) {
        const h = hasard(gf, cle, code * 97 + q, essai + 2);
        const X = cx0 + (h % cl), Y = cy0 + ((h >>> 12) % ch), i = Y * W + X;
        if (!casePermise(ctx, e, i, ici, g.nomSol)) continue;
        const membres = [[X, Y]];
        const taille = e.groupe[0] + (h >>> 24) % (e.groupe[1] - e.groupe[0] + 1);
        for (let m = 1; m < taille; m++) {
          for (let t = 0; t < 6; t++) {
            const k = hasard(gf, i, m, t);
            const x2 = X + ((k % 5) - 2), y2 = Y + (((k >>> 8) % 5) - 2);
            if (x2 < cx0 || y2 < cy0 || x2 >= cx0 + cl || y2 >= cy0 + ch || membres.some(([a, b]) => a === x2 && b === y2)) continue;
            if (!casePermise(ctx, e, y2 * W + x2, ici, g.nomSol)) continue;
            membres.push([x2, y2]);
            break;
          }
        }
        groupes.push({ code, membres, ordre: hasard(gf, cle, code, q + 900) });
        break;
      }
    }
  });
  groupes.sort((a, b) => a.ordre - b.ordre);
  const out = [];
  let total = 0;
  for (const gr of groupes) {
    if (total + gr.membres.length > FAUNE.PAR_REGION) continue;
    const e = DEFS[gr.code], nv = 1 + ((e.variantes && e.variantes.length - 1) || 0);
    for (const [X, Y] of gr.membres) {
      const h = hasard(gf, Y * W + X, gr.code, 77);
      out.push(gr.code, X * T + 4 + (h % 9), Y * T + 8 + ((h >>> 8) % 7), (h >>> 16) % nv);
      total++;
    }
  }
  return Int32Array.from(out);
}
