import { blocGid } from './planche.js';
import { hache, teinteHerbe } from './ferme-generee.js';
import { AUCUNE_EAU, BIOME, BIOMES, bruitDuMonde, champsDuMonde, elementsDuMonde, releve } from './monde-gen.js';

/* ---------- le sol du grand monde, région par région (docs/grand-monde.md, étape 4 : fiche 4b) ---------- */

// Le plan du monde (monde-gen.js : les biomes, les rivières, les lacs, les chemins) devient ici un
// sol : pour chaque case hors de la ferme, les tuiles à peindre, et si l'on peut y marcher. Le
// calcul se fait région par région (MONDE.REGION × MONDE.REGION cases, monde.js) : dans un Web
// Worker sur le site (js/monde-worker.js, que js/ui/monde-sol.js fait travailler et dont il garde
// les régions faites), en direct sans Worker (Node, les tests, un vieux navigateur : solDirect).
// Rien de ce fichier ne touche à la ferme : ses cases ne reçoivent rien (la scène y peint les
// couches de sa carte, inchangées), seuls les coins de son bord (ses SOMMETS, ses TEINTES)
// servent à raccorder la prairie autour, comme avant.
//
// Le contexte d'un monde (contexteSol) : les champs (le relief, l'humidité, le biome de chaque case,
// par les seuls bruits), puis, une fois pour tout le monde, les éléments (rivières, lacs, chemins :
// elementsDuMonde) et les cases des chemins. Une région (solDeRegion) ne lit ensuite que ses cases
// et trois de plus autour (les coins, l'eau profonde).
//
// Le sol d'une case se dessine par ses quatre coins, comme l'herbe et l'eau de la ferme : chaque
// coin prend le sol des quatre cases qui le touchent (l'eau dès que deux d'entre elles sont de
// l'eau, sinon le sol le plus présent ; un chemin dès que deux sont du chemin). Puis :
//   - une case toute d'herbe (la prairie) : exactement comme la prairie d'avant (monde.js, étape 3) :
//     l'herbe de herbe_chemin, ses trois teintes et leurs raccords, ses chemins ;
//   - une case où se touchent des sols différents : le sol le plus bas (SOLS, dans l'ordre :
//     l'herbe, le sable… la neige) en entier, puis chaque sol plus haut posé sur ses coins (les
//     tuiles « bord » de assets/sols_monde.png : scripts/carte/sols_monde.py) ;
//   - une case qui touche l'eau : l'eau de la planche de la ferme (profonde loin des rives, comme
//     les étangs de la ferme), puis la terre posée sur ses coins par une rive (rive_herbe pour
//     l'herbe, rive_sable au bout d'un chemin, les tuiles « rive » des autres sols) ;
//   - un chemin hors de l'herbe : le chemin de la ferme posé sur ses coins ; sur une rivière, un
//     gué (des pierres plates : on y passe à pied).
//
// Une tuile est un nombre : moins de SOLS_MONDE.DECALAGE, le numéro (gid) d'une tuile de la planche
// de la ferme (assets/farm_spring_summer.png, planche.js) ; à partir de lui, DECALAGE + le numéro
// d'une tuile de assets/sols_monde.png (16 colonnes, à partir de 0).

export const SOLS_MONDE = {
  fichier: 'sols_monde.png', colonnes: 16, DECALAGE: 8192,
  // dans l'ordre de la planche (scripts/carte/sols_monde.py, SOLS)
  sols: ['sable', 'galets', 'marais', 'lande', 'foret', 'eboulis', 'roche', 'falaise', 'neige'],
  // les couches d'une case au plus (l'eau, trois sols, le chemin, le gué)
  COUCHES: 6,
  // le bord de la région dessiné en plus (une case de chaque côté : la scène en déborde d'autant,
  // CarteKit.REGION.bord)
  BORD: 1,
  // la montagne : la roche nue au-dessus de ce relief, des éboulis dessous
  ROCHE: 0.8,
  // la plage : des galets là où ce bruit (PAS_GALETS cases) dépasse GALETS
  GALETS: 0.62, PAS_GALETS: 18,
};
const D = SOLS_MONDE.DECALAGE, NS = SOLS_MONDE.sols.length;
const tuile = (k) => D + k;
const plein = (s, v) => tuile(3 * s * 16 + v);
const bord = (s, m) => tuile((3 * s + 1) * 16 + m);
const rive = (s, m) => tuile((3 * s + 2) * 16 + m);
const cheminSur = (m) => tuile(3 * NS * 16 + m);
const gue = (v) => tuile((3 * NS + 1) * 16 + v);

// Les sols d'un coin, du plus bas au plus haut (un sol plus haut se pose sur un plus bas) : l'eau,
// l'herbe, puis ceux de la planche (2 + leur rang dans SOLS_MONDE.sols).
const EAU = 0, HERBE = 1;
const SOL = Object.fromEntries(SOLS_MONDE.sols.map((n, k) => [n, 2 + k]));

// Les biomes où l'on ne marche pas : la mer, les lacs, les rivières (sauf à gué), les falaises,
// les sommets.
export const BIOMES_FERMES = ['mer', 'lac', 'riviere', 'falaise', 'sommet'];
const FERMES = new Uint8Array(BIOMES.length);
for (const b of BIOMES_FERMES) FERMES[BIOME[b]] = 1;
const EAUX = new Uint8Array(BIOMES.length);
for (const b of ['mer', 'lac', 'riviere']) EAUX[BIOME[b]] = 1;

// La couleur unie de chaque biome (dans l'ordre de BIOMES), pour le sol provisoire d'une région
// pas encore faite (la scène la peint ainsi en attendant).
export const COULEURS_BIOMES = {
  mer: '#2f6fa8', plage: '#d8c28a', falaise: '#6e6660', prairie: '#6a8157', foret: '#3a5428', marais: '#58643a',
  lande: '#8c8c4a', montagne: '#8e877c', sommet: '#e8edf5', lac: '#4a8fc8', riviere: '#4a8fc8',
};

// Un nombre au hasard pour la case i (toujours le même pour une même graine) : celui de la prairie
// d'avant (monde.js), pour qu'elle garde ses tuiles.
export function hasardCase(g0, i) {
  let h = (g0 ^ Math.imul(i + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------- le contexte d'un monde ---------- */

// contexteSol(graine, cadre, ferme[, taille]) → le contexte (à garder : les éléments s'y tirent une
// fois). `cadre` : celui du plan (monde-gen.js : LARGEUR, HAUTEUR, FERME, SORTIE) ; `ferme` : les
// coins de la ferme ({ sommets, teintes } : ses SOMMETS et TEINTES, (LARGEUR + 1) × (HAUTEUR + 1)) ;
// `taille` : celle des régions (MONDE.REGION).
export function contexteSol(graine, cadre, ferme, taille) {
  const champs = champsDuMonde(graine, cadre);
  return {
    graine: String(graine), cadre, ferme, taille, champs, lire: releve(champs, cadre),
    teinte: teinteHerbe(graine), g0: hache(graine + ':monde'),
    galets: bruitDuMonde(String(graine) + ':monde:galets', SOLS_MONDE.PAS_GALETS, 2, cadre.LARGEUR, cadre.HAUTEUR),
    elements: null, chemins: null, mesures: { elements: 0 },
  };
}

// Les éléments du monde (rivières, lacs, chemins), tirés à la première région ; et les cases des
// chemins : 1 un chemin sur la terre, 2 un gué (sur une rivière). Les chemins du plan font une case
// de large : ils sont élargis à trois, comme celui de la ferme (sa sortie aussi en a trois), sauf
// sur ce qu'on ne peut traverser (la mer, un lac, une falaise, un sommet) et sur la ferme.
export function elementsSol(ctx) {
  if (ctx.elements) return ctx.elements;
  const t0 = Date.now();
  const { cadre, lire } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME;
  const el = elementsDuMonde(ctx.graine, cadre, lire);
  const chemins = new Uint8Array(W * H);
  const { riviere } = BIOME;
  for (const ch of el.chemins) {
    for (const i of ch) {
      const c = i % W, r = Math.floor(i / W);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const x = c + dc, y = r + dr;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          if (x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR) continue;
          const j = y * W + x, e = el.eaux[j], b = e !== AUCUNE_EAU ? e : lire.biome(j);
          if (b === riviere) chemins[j] = 2;
          else if (!FERMES[b]) chemins[j] = 1;
        }
      }
    }
  }
  ctx.elements = el;
  ctx.chemins = chemins;
  ctx.mesures.elements = Date.now() - t0;
  return el;
}

// Le biome de la case i (les eaux posées comprises).
function biomeDe(ctx, i) {
  const e = ctx.elements.eaux[i];
  return e !== AUCUNE_EAU ? e : ctx.lire.biome(i);
}

// Le sol (d'un coin) que donne le biome b de la case i.
function solDe(ctx, b, i, x, y) {
  if (EAUX[b]) return EAU;
  switch (BIOMES[b]) {
    case 'plage': return ctx.galets(x, y) > SOLS_MONDE.GALETS ? SOL.galets : SOL.sable;
    case 'falaise': return SOL.falaise;
    case 'foret': return SOL.foret;
    case 'marais': return SOL.marais;
    case 'lande': return SOL.lande;
    case 'montagne': return ctx.lire.relief(i) > SOLS_MONDE.ROCHE ? SOL.roche : SOL.eboulis;
    case 'sommet': return SOL.neige;
    default: return HERBE;
  }
}

/* ---------- une région ---------- */

// solDeRegion(ctx, rx, ry) → { cle, x0, y0, l, h (le rectangle des cases peintes : la région et
// BORD case autour, borné au monde), couches (Uint16Array, COUCHES tuiles par case de ce rectangle,
// rangée par rangée ; 0 : rien ; les cases de la ferme n'ont rien), cx0, cy0, cl, ch (la région
// elle-même), biome, marche (Uint8Array, une valeur par case de la région : son biome, 1 si l'on
// peut y marcher), ms (la durée du calcul) }.
export function solDeRegion(ctx, rx, ry) {
  const t0 = Date.now();
  elementsSol(ctx);
  const { cadre, ferme, taille } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME;
  const fv = F.LARGEUR + 1, B = SOLS_MONDE.BORD, K = SOLS_MONDE.COUCHES;
  const cx0 = rx * taille, cy0 = ry * taille, cl = Math.max(0, Math.min(taille, W - cx0)), chh = Math.max(0, Math.min(taille, H - cy0));
  const x0 = Math.max(0, cx0 - B), y0 = Math.max(0, cy0 - B), x1 = Math.min(W, cx0 + cl + B), y1 = Math.min(H, cy0 + chh + B);
  const l = x1 - x0, h = y1 - y0;
  // les cases lues : le rectangle et trois de plus autour (bornées au monde : la case du bord)
  const M = 3, gx0 = x0 - M, gy0 = y0 - M, gw = l + 2 * M, gh = h + 2 * M;
  const gSol = new Uint8Array(gw * gh), gCh = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const wy = Math.min(H - 1, Math.max(0, gy0 + y));
    for (let x = 0; x < gw; x++) {
      const wx = Math.min(W - 1, Math.max(0, gx0 + x)), i = wy * W + wx, k = y * gw + x;
      gSol[k] = solDe(ctx, biomeDe(ctx, i), i, wx, wy);
      gCh[k] = ctx.chemins[i];
    }
  }
  // les coins : de (x0 - 2, y0 - 2) à (x1 + 2, y1 + 2)
  const cw = l + 5, chc = h + 5, kx0 = x0 - 2, ky0 = y0 - 2;
  const cSol = new Uint8Array(cw * chc), cCh = new Uint8Array(cw * chc), cTe = new Uint8Array(cw * chc), cDeep = new Uint8Array(cw * chc);
  const compte = new Uint8Array(2 + NS);
  for (let y = 0; y < chc; y++) {
    for (let x = 0; x < cw; x++) {
      const X = kx0 + x, Y = ky0 + y, k = y * cw + x;
      if (X >= F.X && Y >= F.Y && X <= F.X + F.LARGEUR && Y <= F.Y + F.HAUTEUR) {
        // un coin de la ferme (son bord) : le sien
        const s = ferme.sommets[(Y - F.Y) * fv + X - F.X];
        cSol[k] = s === 2 ? EAU : HERBE; cCh[k] = s === 1 ? 1 : 0; cTe[k] = ferme.teintes[(Y - F.Y) * fv + X - F.X];
        continue;
      }
      compte.fill(0);
      let ch = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const g = (Y + dy - gy0) * gw + X + dx - gx0;
        compte[gSol[g]]++;
        if (gCh[g] === 1) ch++;
      }
      let s = EAU;
      if (compte[EAU] < 2) {
        let best = 0;
        for (let c = HERBE; c < compte.length; c++) if (compte[c] && compte[c] >= best) { best = compte[c]; s = c; }
      }
      cSol[k] = s; cCh[k] = s !== EAU && ch >= 2 ? 1 : 0;
      cTe[k] = ctx.teinte(X - F.X, Y - F.Y);
    }
  }
  // l'eau profonde : un coin d'eau dont tous les coins à deux pas sont de l'eau (comme la ferme)
  for (let y = 2; y < chc - 2; y++) {
    for (let x = 2; x < cw - 2; x++) {
      let p = cSol[y * cw + x] === EAU;
      for (let dy = -2; dy <= 2 && p; dy++) for (let dx = -2; dx <= 2 && p; dx++) if (cSol[(y + dy) * cw + x + dx] !== EAU) p = false;
      cDeep[y * cw + x] = p ? 1 : 0;
    }
  }
  const couches = new Uint16Array(l * h * K);
  const masque = (f, k) => (f(k) ? 8 : 0) | (f(k + 1) ? 4 : 0) | (f(k + cw) ? 2 : 0) | (f(k + cw + 1) ? 1 : 0);
  const variante = (r) => ((r % 100) < 85 ? (r >>> 8) % 8 : 8 + ((r >>> 12) % 8));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const X = x0 + x, Y = y0 + y;
      if (X >= F.X && Y >= F.Y && X < F.X + F.LARGEUR && Y < F.Y + F.HAUTEUR) continue;   // la ferme
      const i = Y * W + X, o = (y * l + x) * K, k = (Y - ky0) * cw + X - kx0;
      const r = hasardCase(ctx.g0, i);
      const ks = [k, k + 1, k + cw, k + cw + 1];
      let n = 0;
      const pose = (v) => { couches[o + n++] = v; };
      const s0 = cSol[k], s1 = cSol[k + 1], s2 = cSol[k + cw], s3 = cSol[k + cw + 1];
      const t0 = cTe[k], t1 = cTe[k + 1], t2 = cTe[k + cw], t3 = cTe[k + cw + 1];
      const hh = Math.min(t0, t1, t2, t3);
      const terre = (q) => cSol[q] !== EAU;
      const nCh = masque((q) => cCh[q] === 1, k);
      if (s0 === EAU || s1 === EAU || s2 === EAU || s3 === EAU) {
        // l'eau, puis la terre sur ses coins (une rive), puis le chemin, le gué
        const nd = masque((q) => cDeep[q] === 1, k);
        const f = nd === 0 ? ((r % 100) < 70 ? 0 : 1 + ((r >>> 8) % 7)) : nd === 15 ? 8 + (((r >>> 4) % 100) < 70 ? ((r >>> 12) & 1 ? 2 : 0) : (r >>> 16) % 8) : 16 + nd;
        pose(blocGid('eau', f));
        let premier = true;
        for (let c = HERBE; c < 2 + NS; c++) {
          if (!ks.some((q) => cSol[q] === c)) continue;
          const m = masque((q) => terre(q) && cSol[q] >= c, k);
          if (premier) {
            if (c === HERBE) pose(ks.every((q) => !terre(q) || cCh[q]) ? blocGid('rive_sable', m) : blocGid('rive_herbe', hh * 16 + m));
            else pose(rive(c - 2, m));
            premier = false;
          } else pose(bord(c - 2, m));
        }
        if (nCh) pose(cheminSur(nCh));
        if (ctx.chemins[i] === 2) pose(gue(r % 8));
      } else if (s0 === HERBE && s1 === HERBE && s2 === HERBE && s3 === HERBE) {
        // la prairie, comme avant
        if (nCh) pose(blocGid('herbe_chemin', nCh === 15 ? 4 * 16 + (r % 8) : (5 + hh * 2) * 16 + nCh));
        else if (Math.max(t0, t1, t2, t3) > hh) pose(blocGid('herbe_chemin', (13 + hh) * 16 + masque((q) => cTe[q] > hh, k)));
        else pose(blocGid('herbe_chemin', hh * 16 + (r % 16)));
      } else if (nCh === 15) {
        pose(blocGid('herbe_chemin', 4 * 16 + (r % 8)));
      } else {
        // des sols différents : le plus bas en entier, les autres sur leurs coins
        const bas = Math.min(s0, s1, s2, s3);
        pose(bas === HERBE ? blocGid('herbe_chemin', hh * 16 + (r % 16)) : plein(bas - 2, variante(r)));
        for (let c = bas + 1; c < 2 + NS; c++) if (ks.some((q) => cSol[q] === c)) pose(bord(c - 2, masque((q) => cSol[q] >= c, k)));
        if (nCh) pose(cheminSur(nCh));
      }
    }
  }
  // la région elle-même : ses biomes, où l'on marche
  const biome = new Uint8Array(cl * chh), marche = new Uint8Array(cl * chh);
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cl; x++) {
      const i = (cy0 + y) * W + cx0 + x, b = biomeDe(ctx, i);
      biome[y * cl + x] = b;
      marche[y * cl + x] = !FERMES[b] || ctx.chemins[i] === 2 ? 1 : 0;
    }
  }
  return { cle: rx + ',' + ry, x0, y0, l, h, couches, cx0, cy0, cl, ch: chh, biome, marche, ms: Date.now() - t0 };
}

// Un aperçu des biomes de tout le monde (une valeur tous les `pas` cases, au milieu de chaque bloc,
// sans les eaux des éléments : les champs seuls, vite faits) : le sol provisoire des régions pas
// encore faites. → { pas, l, h, biomes (Uint8Array) }.
export function apercuDesBiomes(ctx, pas = 8) {
  const W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR, l = Math.ceil(W / pas), h = Math.ceil(H / pas), out = new Uint8Array(l * h), v = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) out[y * l + x] = ctx.champs.valeurs(Math.min(W - 1, x * pas + (pas >> 1)), Math.min(H - 1, y * pas + (pas >> 1)), v)[2];
  }
  return { pas, l, h, biomes: out };
}

/* ---------- marcher ---------- */

// Le sol du monde du terrain T, calculé en direct (sans Worker : Node, les tests, la page sans
// Worker), ses régions gardées : { region(rx, ry) → solDeRegion… }. null pour un terrain sans
// monde (la carte de Tiled, la ferme seule d'une ancienne partie).
const directs = new Map();
export function solDirect(T) {
  const m = T && T.MONDE;
  if (!m) return null;
  let s = directs.get(m.graine);
  if (!s) {
    const ctx = contexteSol(m.graine, m.cadre, m.ferme, m.taille);
    const regions = new Map();
    s = {
      ctx,
      region(rx, ry) {
        const cle = rx + ',' + ry;
        if (!regions.has(cle)) regions.set(cle, solDeRegion(ctx, rx, ry));
        return regions.get(cle);
      },
    };
    directs.set(m.graine, s);
    while (directs.size > 2) directs.delete(directs.keys().next().value);
  }
  return s;
}

// Peut-on marcher sur la case t du terrain T ? Sur la ferme, oui (ses bâtiments, ses arbres, son
// eau sont les obstacles de la scène, comme avant) ; ailleurs, selon le plan : ni la mer, ni un lac,
// ni une rivière (sauf à gué, où un chemin la traverse), ni une falaise, ni un sommet. `sol` : qui
// donne les régions (region(rx, ry) → solDeRegion, ou null si elle n'est pas encore faite : on n'y
// va pas) ; par défaut, le calcul direct (solDirect). Hors du monde : non.
export function caseMarchable(T, t, sol = solDirect(T)) {
  if (!T.FERME || !sol) return true;
  const W = T.LARGEUR, c = t % W, r = Math.floor(t / W), F = T.FERME;
  if (!(t >= 0 && t < W * T.HAUTEUR)) return false;
  if (c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR) return true;
  const N = T.MONDE.taille, reg = sol.region(Math.floor(c / N), Math.floor(r / N));
  return !!reg && reg.marche[(r - reg.cy0) * reg.cl + c - reg.cx0] === 1;
}
