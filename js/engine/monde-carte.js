import { AUCUNE_EAU, BIOME } from './monde-gen.js';
import { hasardCase } from './monde-sol.js';
import { DATA } from './catalog.js';

/* ---------- l'image de la carte du monde (fiche 8) ----------

   La carte du monde (js/ui/carte-monde.js) montre le monde vu, à petite échelle, dans le style du jeu :
   un pixel par case (agrandi sans lissage à l'écran), la couleur du biome en deux tons tirés case par
   case (des arbres en forêt, des touffes sur la lande, de l'eau dans le marais : un semis, comme la
   planche du jeu), le relief ombré (éclairé en haut à gauche, comme les dessins), la mer plus sombre au
   large, l'écume le long des rivages, les falaises, les chemins et leurs gués, les hameaux (leurs toits,
   leur terre battue). La ferme y est une prairie : la page y dessine la sienne (js/ui/carte-monde.js).

   Elle se calcule dans le Web Worker du sol (js/monde-worker.js, à la demande de la page : la carte
   entière, environ 330 000 cases), ou par morceaux de rangées sur la page sans Worker (imageDuMonde(ctx,
   y0, y1, out)) : rien qui bloque la page. Elle contient tout le monde : c'est la page qui n'en montre
   que le vu (le brouillard par-dessus, opaque sur ce qui n'a pas été vu ; les lieux : lieuxDeLaCarte,
   monde-vu.js). */

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Les deux tons de chaque biome et la part du second (le semis), puis les couleurs à part.
export const COULEURS_CARTE = {
  mer: ['#2d68ad', '#2a63a6', 0.2], plage: ['#e3c88f', '#d6b878', 0.25], falaise: ['#6f645b', '#594e47', 0.35],
  prairie: ['#88ae46', '#7aa23d', 0.22], foret: ['#3f6b2d', '#2b5121', 0.45], marais: ['#5f7649', '#4b8a8e', 0.18],
  lande: ['#a59c55', '#8a6f86', 0.12], montagne: ['#8c847a', '#7a7268', 0.3], sommet: ['#eef2f8', '#d4dde9', 0.25],
  lac: ['#4a9ed6', '#4596cf', 0.15], riviere: ['#4a9ed6', '#4596cf', 0.15],
  large: '#1d4b88', ecume: '#a8d4ee', chemin: '#c9a46a', cheminFonce: '#a9844e', gue: '#9cc6d6',
  toit: '#9a4a3a', toitArdoise: '#58606e', toitChaume: '#c4a050', terre: '#b8956a', bati: '#5a3a24',
};
const C = Object.fromEntries(Object.entries(COULEURS_CARTE).map(([k, v]) => [k, Array.isArray(v) ? [hex(v[0]), hex(v[1]), v[2]] : hex(v)]));
const TOITS = { ardoise: 'toitArdoise', chaume: 'toitChaume', roseaux: 'toitChaume' };

// Les rangées y0 à y1 (exclue) de l'image du monde du contexte `ctx` (monde-sol.js : contexteSol, ses
// éléments tirés : elementsSol) dans `out` (un Uint8ClampedArray de LARGEUR × HAUTEUR × 4 : RVBA).
// → out.
export function imageDuMonde(ctx, y0 = 0, y1 = ctx.cadre.HAUTEUR, out = new Uint8ClampedArray(ctx.cadre.LARGEUR * ctx.cadre.HAUTEUR * 4)) {
  const W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR, el = ctx.elements, lire = ctx.lire, g0 = ctx.g0;
  const mer = BIOME.mer, lac = BIOME.lac, riviere = BIOME.riviere, MER = DATA.PLAN_MONDE.SEUILS.MER;
  const NOMS = Object.keys(BIOME);
  const tons = NOMS.map((n) => C[n] || C.prairie);
  const biome = (i) => { const e = el.eaux[i]; return e !== AUCUNE_EAU ? e : lire.biome(i); };
  const eau = (b) => b === mer || b === lac || b === riviere;
  // les hameaux : leurs maisons (le toit de leur style), leur terre battue, ce qui ferme (murs, clôtures)
  if (!ctx.carteHameaux) {
    const toits = new Uint8Array(W * H);
    const styles = (DATA.HAMEAUX && DATA.HAMEAUX.STYLES) || {};
    for (const p of (ctx.hameaux && ctx.hameaux.plans) || []) {
      const t = TOITS[(styles[p.style] || {}).toit] || 'toit', k = t === 'toit' ? 1 : t === 'toitArdoise' ? 2 : 3;
      for (const m of p.maisons || []) for (let y = m.y0; y < m.y0 + m.h; y++) for (let x = m.x0; x < m.x0 + m.l; x++) toits[y * W + x] = k;
    }
    ctx.carteHameaux = toits;
  }
  const toits = ctx.carteHameaux, H8 = ctx.hameaux || {};
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, b = biome(i), o = i * 4, h = hasardCase(g0, i);
      const [c1, c2, part] = tons[b];
      let c = (h % 1000) / 1000 < part ? c2 : c1;
      let k = 1;
      if (b === mer) {
        // la mer : plus sombre au large (le relief), l'écume contre la terre
        const e = lire.relief(i);
        if (e < MER * 0.55) c = C.large;
        if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && (!eau(biome(i - 1)) || !eau(biome(i + 1)) || !eau(biome(i - W)) || !eau(biome(i + W)))) c = C.ecume;
      } else if (b !== lac && b !== riviere) {
        // le relief ombré : éclairé en haut à gauche
        if (x > 0 && y > 0) {
          const d = lire.relief(i) - lire.relief(i - W - 1);
          k = 1 + Math.max(-0.22, Math.min(0.22, -d * (b === BIOME.montagne || b === BIOME.sommet ? 14 : 8)));
        }
      }
      // les chemins (et leurs gués), les hameaux
      const ch = ctx.chemins ? ctx.chemins[i] : 0;
      if (ch === 1) { c = (h >> 10) % 5 ? C.chemin : C.cheminFonce; k = 1; } else if (ch === 2) { c = C.gue; k = 1; }
      if (H8.terre && H8.terre[i]) { c = C.terre; k = 1; }
      if (H8.bloque && H8.bloque[i]) { c = C.bati; k = 1; }
      if (toits[i]) { c = toits[i] === 1 ? C.toit : toits[i] === 2 ? C.toitArdoise : C.toitChaume; k = 1; }
      out[o] = c[0] * k; out[o + 1] = c[1] * k; out[o + 2] = c[2] * k; out[o + 3] = 255;
    }
  }
  return out;
}
