/* ==========================================================================
   L'île vue par la scène (docs/ile-300.md, étape 7b) : les régions de l'île dans le format que la scène de la ferme
   sait déjà peindre (celui de js/engine/monde-sol.js solDeRegion : les couches des sols, la marche, la végétation,
   les roches). Le pavage des sols (les coins, les bords arrondis, les rives, l'eau profonde) est celui du grand monde
   d'avant, nourri par les sols de l'île (ctx.solCase) ; les plantes et les pierres viennent des objets de l'île.

   Les planches : la végétation (assets/vegetation.png) et les roches (assets/roches.png) par les numéros de leurs
   sortes (VEGETATION.SORTES, ROCHES.SORTES) ; les cultures sauvages (assets/crops.png, C12) et les fruitiers
   (assets/verger.png) par deux planches de plus, découpées ici (planchesDeLIle), une image par stade.
   ========================================================================== */

import { hache, teinteHerbe } from '../ferme-generee.js';
import { BIOME, bruitDuMonde } from '../monde-gen.js';
import { CODES_SOLS, SOLS_MONDE, solDeRegion } from '../monde-sol.js';
import { SORTES as SORTES_VEG } from '../monde-vegetation.js';
import { SORTE_ROCHE } from '../monde-roches.js';
import { catalogue } from './catalogue.js';
import { BIOMES, ILE, SOL_BIOME, SOLS } from './reglages.js';
import { marchable } from './vie.js';

const N = ILE.TAILLE;
const T = 16;

// Le code de pavage de chaque sol de l'île (l'eau : 0 ; la clairière, de l'herbe)
const PAVAGE = { eau_profonde: 0, eau: 0, eau_basse: 0, clairiere: CODES_SOLS.herbe };
const CODE_SOL = Uint8Array.from(SOLS, (s) => (s.nom in PAVAGE ? PAVAGE[s.nom] : CODES_SOLS[s.nom]));
// le biome de chaque sol, dans les numéros des biomes de la scène (monde-gen.js BIOMES)
const BIOME_SOL = Uint8Array.from(SOLS, (s, k) => BIOME[BIOMES[SOL_BIOME[k]]]);
const SORTE_VEG = Object.fromEntries(SORTES_VEG.map((s, k) => [s.nom, k]));

/* ---------- les planches des cultures et des fruitiers ---------- */

// Les images de crops.png (24 × 44, une rangée par culture) et de verger.png (80 × 80 : 1 jeune arbre, puis par
// espèce, à 2 + 4 × dessin : arbuste, arbre, en fleur, en fruits). Une variante par stade de la fiche.
const CROP = { l: 24, h: 44, px: 12, py: 41 };
const ARBRE = { l: 80, h: 80, px: 40, py: 74 };

let planches = null;
/**
 * Les deux planches de plus de l'île : { cultures, fruitiers }, chacune { sortes: [{ nom, genre, variantes }],
 * table: { nom: [[x, y, l, h, px, py]…] }, code: Map(numéro de fiche → rang de sa sorte) }.
 */
// La planche des graines plantées : la graine au sol (le gland), puis la pousse (pousse_arbre) de assets/ramassables.png
// (16 × 16 par image ; js/carte/ferme/config.js RAMASSABLES.frames).
export const SEMIS = {
  sortes: [
    { nom: 'graine_plantee', genre: 'basse', variantes: 1 },
    { nom: 'pousse', genre: 'basse', variantes: 1 },
  ],
  table: { graine_plantee: [[6 * 16, 0, 16, 16, 8, 15]], pousse: [[8 * 16, 0, 16, 16, 8, 15]] },
};

export function planchesDeLIle(cat = catalogue()) {
  if (planches) return planches;
  const faire = (planche, cadre) => {
    const sortes = [],
      table = {},
      code = new Map();
    for (const f of cat.fiches) {
      if (f.dessin.planche !== planche) continue;
      const cases = [];
      for (let s = 0; s < f.stades; s++) {
        let x, y;
        if (planche === 'crops') {
          const c = f.dessin.c,
            k = c[Math.min(c.length - 1, Math.round((s * (c.length - 1)) / Math.max(1, f.stades - 1)))];
          x = k * cadre.l;
          y = f.dessin.r * cadre.h;
        } else {
          const d = 2 + 4 * f.dessin.dessin,
            im = [1, d, d + 1, d + 3][Math.min(3, s)];
          x = im * cadre.l;
          y = 0;
        }
        cases.push([x, y, cadre.l, cadre.h, cadre.px, cadre.py]);
      }
      code.set(f.numero, sortes.length);
      sortes.push({ nom: f.id, genre: f.genre, variantes: f.stades, ombre: planche === 'verger' });
      table[f.id] = cases;
    }
    return { sortes, table, code };
  };
  planches = { cultures: faire('crops', CROP), fruitiers: faire('verger', ARBRE) };
  return planches;
}

/* ---------- le contexte de pavage ---------- */

/**
 * Le contexte de solDeRegion pour l'île `ile` (graine : celle de la partie). Une ferme vide hors de la carte, ni
 * chemins ni hameaux.
 * @param {object} ile
 * @param {string} graine
 * @param {number} taille les régions de la scène (MONDE.REGION cases de côté)
 */
export function contexteIle(ile, graine, taille, cat = catalogue()) {
  const S = SOLS_MONDE,
    g = String(graine);
  const b = (usage, pas, octaves, w, h) => bruitDuMonde(g + ':ile:' + usage, pas, octaves, w, h);
  const cadre = { LARGEUR: N, HAUTEUR: N, FERME: { X: -100, Y: -100, LARGEUR: 0, HAUTEUR: 0 } };
  const fiches = [];
  for (const f of cat.fiches) fiches[f.numero] = f;
  const ctx = {
    graine: g,
    cadre,
    taille,
    ile,
    fiches,
    ferme: { sommets: new Uint8Array(1), teintes: new Uint8Array(1) },
    teinte: teinteHerbe(g),
    g0: hache(g + ':ile'),
    gv: hache(g + ':ile:vegetation'),
    bords: b('bords', S.PAS_BORDS, 2, N + 1, N + 1),
    bords2: b('bords2', S.PAS_BORDS, 2, N + 1, N + 1),
    elements: { lieux: {} },
    chemins: new Uint8Array(N * N),
    cheminCoins: new Uint8Array((N + 1) * (N + 1)),
    hameaux: { terre: new Uint8Array(N * N), plans: [] },
    mesures: { elements: 0 },
    solCase: (i) => CODE_SOL[ile.sol[i]],
  };
  ctx.finRegion = (r, t0) => finRegion(ctx, r, t0);
  return ctx;
}

// Le hasard d'une case (toujours le même) : sa variante, le léger décalage de son pied.
function hasard(g, i) {
  let h = (g ^ Math.imul(i + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

const VIDE = () => ({ images: new Int32Array(0), basses: new Int32Array(0) });

// La fin d'une région : sa marche, ses biomes, ses objets rangés par planche.
function finRegion(ctx, r, t0) {
  const { ile, fiches, gv } = ctx,
    P = planchesDeLIle();
  const { cx0, cy0, cl, ch, x0, y0, l, h } = r;
  const biome = new Uint8Array(cl * ch),
    marche = new Uint8Array(cl * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cl; x++) {
      const i = (cy0 + y) * N + cx0 + x;
      biome[y * cl + x] = BIOME_SOL[ile.sol[i]];
      marche[y * cl + x] = marchable(ile, i) ? 1 : 0;
    }
  }
  const listes = { vegetation: [[], []], roches: [[], []], cultures: [[], []], fruitiers: [[], []], semis: [[], []] };
  // (les objets de la région et de son bord : le bord se peint aussi ; les images, celles de la région seule)
  for (let Y = y0; Y < y0 + h; Y++) {
    for (let X = x0; X < x0 + l; X++) {
      const i = Y * N + X,
        n = ile.objet[i];
      if (!n) continue;
      const f = fiches[n];
      if (!f) continue;
      const dedans = X >= cx0 && X < cx0 + cl && Y >= cy0 && Y < cy0 + ch;
      const q = hasard(gv, i),
        d = f.dessin,
        basse = f.genre === 'basse';
      if (!basse && !dedans) continue;
      let cle, code, v;
      if (d.planche === 'vegetation') {
        cle = 'vegetation';
        code = SORTE_VEG[d.sorte];
        v = q % d.variantes;
      } else if (d.planche === 'roches') {
        cle = 'roches';
        code = SORTE_ROCHE[d.sorte];
        v = q % d.variantes;
      } else if (d.planche === 'crops') {
        cle = 'cultures';
        code = P.cultures.code.get(n);
        v = ile.etat[i];
      } else {
        cle = 'fruitiers';
        code = P.fruitiers.code.get(n);
        v = ile.etat[i];
      }
      if (code === undefined) continue;
      const px = X * T + 8 + (basse ? ((q >>> 16) % 9) - 4 : ((q >>> 4) % 5) - 2);
      const py = Y * T + (basse ? 11 + ((q >>> 26) % 5) : 13 + ((q >>> 8) % 3));
      listes[cle][basse ? 1 : 0].push(code, px, py, v);
    }
  }
  // les graines plantées et les pousses (graines.js) : une culture, ses premières images ; un fruitier, son jeune arbre ;
  // le reste, une graine au sol puis une pousse (SEMIS : assets/ramassables.png)
  for (const [i, s] of ile.semis) {
    const X = i % N,
      Y = (i - X) / N;
    if (X < cx0 || X >= cx0 + cl || Y < cy0 || Y >= cy0 + ch) continue;
    const f = fiches[s.numero];
    if (!f) continue;
    const px = X * T + 8,
      py = Y * T + 13;
    if (f.dessin.planche === 'crops')
      listes.cultures[0].push(P.cultures.code.get(s.numero), px, py, Math.min(s.stade, f.stades - 1));
    else if (f.dessin.planche === 'verger' && s.stade === 1)
      listes.fruitiers[0].push(P.fruitiers.code.get(s.numero), px, py, 0);
    else listes.semis[1].push(s.stade, px, py + 1, 0);
  }
  const sortie = (c) => ({ images: Int32Array.from(listes[c][0]), basses: Int32Array.from(listes[c][1]) });
  return {
    ...r,
    biome,
    marche,
    vegetation: sortie('vegetation'),
    roches: sortie('roches'),
    cultures: sortie('cultures'),
    fruitiers: sortie('fruitiers'),
    semis: sortie('semis'),
    lieux: VIDE(),
    hameau: VIDE(),
    faune: new Int32Array(0),
    ms: Date.now() - t0,
  };
}

/**
 * La région (rx, ry) de la scène (MONDE.REGION cases de côté), d'après l'île.
 * @param {object} ctx contexteIle
 */
export const regionDeLIle = (ctx, rx, ry) => solDeRegion(ctx, rx, ry);

/**
 * Les régions de la scène que touchent ces régions de l'île (ILE.REGION cases de côté) : leurs clés « rx,ry ».
 * @param {number[]} regionsIle
 * @param {number} taille
 */
export function regionsDeLaScene(regionsIle, taille) {
  const R = ILE.REGION,
    par = Math.ceil(N / R),
    out = new Set();
  for (const k of regionsIle) {
    const x0 = (k % par) * R,
      y0 = Math.floor(k / par) * R;
    // (une case de bord : la région voisine peint aussi celle-ci)
    for (let y = Math.max(0, y0 - 1); y <= Math.min(N - 1, y0 + R); y += R + 1) {
      for (let x = Math.max(0, x0 - 1); x <= Math.min(N - 1, x0 + R); x += R + 1)
        out.add(Math.floor(x / taille) + ',' + Math.floor(y / taille));
    }
  }
  return [...out];
}
