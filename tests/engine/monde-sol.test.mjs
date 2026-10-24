/* ==========================================================================
   Tests du moteur : le sol du grand monde (js/engine/monde-sol.js, fiche 4b) : chaque case hors de
   la ferme a ses tuiles (rien sur la ferme, dont la carte ne change pas), les biomes d'une région
   sont ceux du plan, la prairie se raccorde au bord de la ferme et son chemin continue à la sortie
   est ; où l'on marche (ni la mer, ni un lac, ni une rivière sauf à gué, ni une falaise, ni un
   sommet) ; le Web Worker (js/monde-worker.js) donne les mêmes régions que le calcul direct ; la
   durée d'une région.
   Lancer seul : node --test tests/engine/monde-sol.test.mjs (ou node tests/run-tests.mjs monde-sol).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  BIOME, caseMarchable, genererFerme, genererMonde, MONDE, SOLS_MONDE, solDirect,
} from '../../js/engine/index.js';
import { blocGid } from '../../js/engine/planche.js';
import { assert, assertEqual, test } from './aide.mjs';

const G = 'sol-1';
const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, N = MONDE.REGION, K = SOLS_MONDE.COUCHES;
const monde = () => genererMonde(G);
const regions = () => {
  const out = [];
  for (let ry = 0; ry * N < H; ry++) for (let rx = 0; rx * N < W; rx++) out.push([rx, ry]);
  return out;
};
// (les tuiles des planches : celle de la ferme, 75 × 61 ; assets/sols_monde.png, 16 × 29)
const png = (f) => { const b = readFileSync(new URL('../../assets/' + f, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const [sw, sh] = png(SOLS_MONDE.fichier), [fw, fh] = png('farm_spring_summer.png');

test('le sol du monde : des tuiles sur chaque case hors de la ferme, aucune sur elle, toutes dans leurs planches', () => {
  const m = monde(), F = m.terrain.FERME, sol = solDirect(m.terrain);
  const dansFerme = (c, r) => c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR;
  let vides = 0, pleines = 0, horsPlanche = 0;
  for (const [rx, ry] of regions()) {
    const reg = sol.region(rx, ry);
    // la région et une case autour (bornée au monde) : ce que la scène peint
    assertEqual([reg.x0, reg.y0, reg.x0 + reg.l, reg.y0 + reg.h], [Math.max(0, rx * N - 1), Math.max(0, ry * N - 1), Math.min(W, (rx + 1) * N + 1), Math.min(H, (ry + 1) * N + 1)]);
    for (let y = 0; y < reg.h; y++) {
      for (let x = 0; x < reg.l; x++) {
        const o = (y * reg.l + x) * K, v = reg.couches[o];
        if (dansFerme(reg.x0 + x, reg.y0 + y)) { if (reg.couches.slice(o, o + K).some((t) => t)) pleines++; continue; }
        if (!v) vides++;
        for (let k = 0; k < K; k++) {
          const t = reg.couches[o + k];
          if (!t) break;
          if (t >= SOLS_MONDE.DECALAGE ? t - SOLS_MONDE.DECALAGE >= (sw / 16) * (sh / 16) : t > (fw / 16) * (fh / 16)) horsPlanche++;
        }
      }
    }
  }
  assertEqual([vides, pleines, horsPlanche], [0, 0, 0], 'cases sans sol, cases de la ferme peintes, tuiles hors des planches');
});

test('le sol du monde : les biomes de chaque région sont ceux du plan', () => {
  const m = monde(), p = m.plan, sol = solDirect(m.terrain);
  let ecarts = 0;
  for (const [rx, ry] of regions()) {
    const reg = sol.region(rx, ry);
    for (let y = 0; y < reg.ch; y++) for (let x = 0; x < reg.cl; x++) if (reg.biome[y * reg.cl + x] !== p.biome[(reg.cy0 + y) * W + reg.cx0 + x]) ecarts++;
  }
  assertEqual(ecarts, 0);
});

test('le sol du monde : la prairie se raccorde à la ferme, son chemin continue à la sortie est', () => {
  const m = monde(), F = m.terrain.FERME, sol = solDirect(m.terrain), f = genererFerme(G);
  // la carte de la ferme dans le monde : la sienne, couche par couche (rien d'autre n'y touche)
  for (const l of f.carte.layers.filter((x) => x.type === 'tilelayer')) {
    const lm = m.carte.layers.find((x) => x.name === l.name);
    for (let r = 0; r < F.HAUTEUR; r++) for (let c = 0; c < F.LARGEUR; c++) assert(lm.data[(r + F.Y) * W + c + F.X] === l.data[r * F.LARGEUR + c], `couche ${l.name}`);
  }
  const tuile = (c, r) => { const reg = sol.region(Math.floor(c / N), Math.floor(r / N)); return reg.couches[((r - reg.y0) * reg.l + c - reg.x0) * K]; };
  const herbeChemin = new Set(Array.from({ length: 256 }, (_, k) => blocGid('herbe_chemin', k)));
  const cheminPlein = new Set(Array.from({ length: 8 }, (_, k) => blocGid('herbe_chemin', 64 + k)));
  // autour de la ferme (sa marge est une prairie) : l'herbe et les chemins de la ferme
  for (let c = F.X - 3; c < F.X + F.LARGEUR + 3; c++) for (const r of [F.Y - 1, F.Y - 3, F.Y + F.HAUTEUR, F.Y + F.HAUTEUR + 2]) assert(herbeChemin.has(tuile(c, r)), `herbe en ${c},${r}`);
  // les coins du bord : ceux de la ferme (le chemin de la ferme, à sa sortie, touche le monde)
  const S = m.terrain.MONDE.ferme.sommets, fv = F.LARGEUR + 1, sortie = Math.floor(m.terrain.MONDE.cadre.SORTIE / W);
  assertEqual(S[(sortie - F.Y) * fv + F.LARGEUR], 1, 'la sortie de la ferme : un coin de chemin');
  // juste à l'est de la sortie : le chemin, plein, sur ses trois rangées, et quelques cases plus loin
  for (const dr of [-1, 0, 1]) assert(cheminPlein.has(tuile(F.X + F.LARGEUR, sortie + dr)), `le chemin à la sortie (rangée ${dr})`);
  assert(cheminPlein.has(tuile(F.X + F.LARGEUR + 1, sortie)), 'le chemin continue');
});

test('marcher dans le monde : ni la mer, ni les lacs, ni les rivières (sauf à gué), ni les falaises, ni les sommets', () => {
  const m = monde(), T = m.terrain, p = m.plan, F = T.FERME;
  const fermes = new Set(['mer', 'lac', 'riviere', 'falaise', 'sommet'].map((b) => BIOME[b]));
  const chemin = new Set(p.chemins.flat());
  // (les chemins ont trois cases de large : celles du plan et leurs voisines)
  const large = new Set();
  for (const t of chemin) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) large.add(t + dr * W + dc);
  let n = 0, gues = 0;
  const vus = new Set();
  // une case sur 7 de tout le monde, et chaque case de chemin
  for (let t = 0; t < W * H; t += 7) vus.add(t);
  for (const t of chemin) vus.add(t);
  for (const t of vus) {
    const c = t % W, r = Math.floor(t / W), b = p.biome[t], ok = caseMarchable(T, t);
    if (c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR) { assert(ok, 'la ferme'); continue; }
    if (b === BIOME.riviere && large.has(t)) { assert(ok, `un gué en ${c},${r}`); gues++; continue; }
    assertEqual(ok, !fermes.has(b), `${p.BIOMES[b]} en ${c},${r}`);
    n++;
  }
  assert(n > 40000, 'des cases vues');
  // chaque chemin du plan se suit à pied d'un bout à l'autre (les gués compris)
  for (const ch of p.chemins) assert(ch.every((t) => caseMarchable(T, t)), 'un chemin marchable');
  assert(caseMarchable(T, -1) === false && caseMarchable(T, W * H) === false, 'hors du monde');
  // (un chemin croise au moins une rivière dans ce monde : il y a des gués)
  assert(gues > 0 || !p.rivieres.some((r) => r.some((t) => chemin.has(t))), 'des gués');
});

test('le Web Worker du sol : les mêmes régions que le calcul direct, l\'aperçu des biomes', async () => {
  const m = monde(), M = m.terrain.MONDE;
  const recus = [];
  globalThis.self = { postMessage: (msg) => recus.push(msg) };
  try {
    await import('../../js/monde-worker.js?essai');
    const attendre = async (f) => { for (let k = 0; k < 400 && !f(); k++) await new Promise((ok) => setTimeout(ok, 10)); };
    self.onmessage({ data: { type: 'init', graine: M.graine, cadre: M.cadre, ferme: M.ferme, taille: M.taille } });
    self.onmessage({ data: { type: 'region', rx: 5, ry: 4 } });
    self.onmessage({ data: { type: 'region', rx: 9, ry: 6 } });
    await attendre(() => recus.filter((r) => r.type === 'region').length === 2);
    const a = recus.find((r) => r.type === 'apercu');
    assert(a && a.apercu.biomes.length === a.apercu.l * a.apercu.h, 'l\'aperçu');
    assert(recus.some((r) => r.type === 'pret'), 'les éléments tirés');
    const sol = solDirect(m.terrain);
    for (const r of recus.filter((x) => x.type === 'region')) {
      const [rx, ry] = r.region.cle.split(',').map(Number), d = sol.region(rx, ry);
      assertEqual([...r.region.couches].join(), [...d.couches].join(), 'les tuiles de ' + r.region.cle);
      assertEqual([...r.region.marche].join(), [...d.marche].join(), 'la marche de ' + r.region.cle);
    }
  } finally {
    delete globalThis.self;
  }
});

test('le sol du monde : une région se fait en quelques ms (les éléments une fois)', () => {
  const m = genererMonde('sol-2'), sol = solDirect(m.terrain);
  const t0 = Date.now();
  sol.region(0, 0);
  const premiere = Date.now() - t0, ms = [];
  for (const [rx, ry] of regions().slice(1, 30)) ms.push(sol.region(rx, ry).ms);
  ms.sort((a, b) => a - b);
  assert(premiere < 3000, `la première région (les éléments) : ${premiere} ms`);
  assert(ms[ms.length >> 1] < 40, `une région : ${ms[ms.length >> 1]} ms (médiane)`);
});
