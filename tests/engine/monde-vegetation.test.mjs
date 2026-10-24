/* ==========================================================================
   Tests du moteur : la végétation du grand monde (js/engine/monde-vegetation.js, fiche 5b) : la
   pose est déterministe et ne dépend pas de l'ordre des régions (le Worker et le calcul direct :
   monde-sol.test.mjs) ; deux régions voisines peignent les mêmes petites plantes sur leur bord
   commun ; rien sur la ferme, sur un chemin, dans l'eau, sur une falaise ou un sommet ; les pieds
   fermés ne coupent aucun chemin du plan ; les densités par biome dans les bornes réglées
   (data/monde.json, VEGETATION.BORNES) ; les dessins (assets/vegetation.json) : une image par
   variante de chaque sorte (cinq pour celles qui penchent), dans la planche.
   Lancer seul : node --test tests/engine/monde-vegetation.test.mjs (ou node tests/run-tests.mjs monde-vegetation).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { BIOME, BIOMES, caseMarchable, contexteSol, genererMonde, MONDE, solDeRegion, solDirect } from '../../js/engine/index.js';
import { SORTES, VEGETATION } from '../../js/engine/monde-vegetation.js';
import { assert, assertEqual, test } from './aide.mjs';

const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, N = MONDE.REGION;
const regions = () => {
  const out = [];
  for (let ry = 0; ry * N < H; ry++) for (let rx = 0; rx * N < W; rx++) out.push([rx, ry]);
  return out;
};
const fermes = new Set(['mer', 'lac', 'riviere', 'falaise', 'sommet'].map((b) => BIOME[b]));
// la case du pied d'une plante [sorte, x, y, variante] (px)
const caseDe = (v, k) => [Math.floor(v[k + 1] / 16), Math.floor((v[k + 2] - 1) / 16)];

test('la végétation : la même quel que soit l\'ordre des régions, les mêmes petites plantes sur un bord commun', () => {
  const M = genererMonde('veg-1').terrain.MONDE;
  const a = contexteSol(M.graine, M.cadre, M.ferme, M.taille), b = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  // l'une dans l'ordre, l'autre à rebours
  const ra = new Map(), rb = new Map(), liste = [[2, 1], [3, 1], [2, 2], [7, 5], [8, 5]];
  for (const [rx, ry] of liste) ra.set(rx + ',' + ry, solDeRegion(a, rx, ry));
  for (const [rx, ry] of liste.slice().reverse()) rb.set(rx + ',' + ry, solDeRegion(b, rx, ry));
  let n = 0;
  for (const [cle, r] of ra) {
    assertEqual([...r.vegetation.images].join(), [...rb.get(cle).vegetation.images].join(), 'les images de ' + cle);
    assertEqual([...r.vegetation.basses].join(), [...rb.get(cle).vegetation.basses].join(), 'les petites de ' + cle);
    n += r.vegetation.images.length / 4;
  }
  assert(n > 100, `des plantes : ${n}`);
  // deux voisines : les petites plantes des cases que toutes deux peignent sont les mêmes
  for (const [p, q] of [['2,1', '3,1'], ['2,1', '2,2'], ['7,5', '8,5']]) {
    const A = ra.get(p), B = ra.get(q);
    const dans = (r, X, Y) => X >= r.x0 && Y >= r.y0 && X < r.x0 + r.l && Y < r.y0 + r.h;
    const communes = (r, o) => {
      const out = [], v = r.vegetation.basses;
      for (let k = 0; k < v.length; k += 4) { const [X, Y] = caseDe(v, k); if (dans(r, X, Y) && dans(o, X, Y)) out.push([...v.slice(k, k + 4)].join()); }
      return out.sort().join(';');
    };
    assertEqual(communes(A, B), communes(B, A), 'le bord commun de ' + p + ' et ' + q);
  }
});

test('la végétation : rien sur la ferme, sur un chemin, dans l\'eau, sur une falaise ou un sommet ; les chemins restent libres', () => {
  const m = genererMonde('veg-1'), T = m.terrain, p = m.plan, F = T.FERME, sol = solDirect(T), ctx = sol.ctx;
  let images = 0, basses = 0, fautes = [];
  const verifie = (X, Y, quoi) => {
    const i = Y * W + X, e = ctx.elements.eaux[i], b = e !== 255 ? e : p.biome[i];
    if (X >= F.X - VEGETATION.FERME && Y >= F.Y - VEGETATION.FERME && X < F.X + F.LARGEUR + VEGETATION.FERME && Y < F.Y + F.HAUTEUR + VEGETATION.FERME) fautes.push(quoi + ' sur la ferme ' + X + ',' + Y);
    if (ctx.chemins[i]) fautes.push(quoi + ' sur un chemin ' + X + ',' + Y);
    if (fermes.has(b)) fautes.push(quoi + ' sur ' + BIOMES[b] + ' ' + X + ',' + Y);
  };
  for (const [rx, ry] of regions()) {
    const r = sol.region(rx, ry), v = r.vegetation;
    for (let k = 0; k < v.images.length; k += 4) {
      const [X, Y] = caseDe(v.images, k);
      assert(X >= r.cx0 && Y >= r.cy0 && X < r.cx0 + r.cl && Y < r.cy0 + r.ch, 'une image dans sa région');
      for (const [dx, dy] of SORTES[v.images[k]].bloque || [[0, 0]]) verifie(X + dx, Y + dy, SORTES[v.images[k]].nom);
      assert(v.images[k + 3] < SORTES[v.images[k]].variantes, 'une variante dessinée');
      images++;
    }
    for (let k = 0; k < v.basses.length; k += 4) {
      const [X, Y] = caseDe(v.basses, k);
      verifie(X, Y, SORTES[v.basses[k]].nom);
      assert(v.basses[k + 3] < SORTES[v.basses[k]].variantes, 'une variante dessinée');
      basses++;
    }
  }
  assertEqual(fautes.slice(0, 5), [], 'des plantes mal posées');
  assert(images > 5000 && basses > 10000, `des plantes : ${images} images, ${basses} petites`);
  // chaque case des chemins du plan se marche, celles de leurs bords aussi (aucun pied d'arbre)
  for (const ch of p.chemins) assert(ch.every((t) => caseMarchable(T, t)), 'un chemin marchable');
  let bords = 0;
  for (let i = 0; i < W * H; i++) if (ctx.chemins[i] === 1 && !caseMarchable(T, i)) bords++;
  assertEqual(bords, 0, 'des cases de chemin fermées');
});

test('la végétation : les densités de chaque biome dans leurs bornes', () => {
  for (const G of ['veg-1', 'veg-2']) {
    const sol = solDirect(genererMonde(G).terrain), cases = {}, images = {}, basses = {};
    for (const [rx, ry] of regions()) {
      const r = sol.region(rx, ry), v = r.vegetation;
      const biome = (X, Y) => BIOMES[r.biome[(Y - r.cy0) * r.cl + X - r.cx0]];
      for (const b of r.biome) cases[BIOMES[b]] = (cases[BIOMES[b]] || 0) + 1;
      for (let k = 0; k < v.images.length; k += 4) { const b = biome(...caseDe(v.images, k)); images[b] = (images[b] || 0) + 1; }
      for (let k = 0; k < v.basses.length; k += 4) {
        const [X, Y] = caseDe(v.basses, k);
        if (X < r.cx0 || Y < r.cy0 || X >= r.cx0 + r.cl || Y >= r.cy0 + r.ch) continue;   // (le bord : compté par sa région)
        const b = biome(X, Y);
        basses[b] = (basses[b] || 0) + 1;
      }
    }
    for (const [b, bornes] of Object.entries(VEGETATION.BORNES)) {
      if (!cases[b]) continue;
      const di = (images[b] || 0) / cases[b], db = (basses[b] || 0) / cases[b];
      assert(di >= bornes.images[0] && di <= bornes.images[1], `${G} : ${b}, ${di.toFixed(3)} image par case (${bornes.images.join(' à ')})`);
      assert(db >= bornes.basses[0] && db <= bornes.basses[1], `${G} : ${b}, ${db.toFixed(3)} petite plante par case (${bornes.basses.join(' à ')})`);
    }
    // et rien là où rien ne pousse
    for (const b of ['mer', 'lac', 'riviere', 'falaise', 'sommet']) assertEqual([images[b] || 0, basses[b] || 0], [0, 0], b);
  }
});

test('la végétation : chaque variante de chaque sorte a son dessin dans la planche', () => {
  const table = JSON.parse(readFileSync(new URL('../../assets/vegetation.json', import.meta.url), 'utf8'));
  const b = readFileSync(new URL('../../assets/vegetation.png', import.meta.url)), pw = b.readUInt32BE(16), ph = b.readUInt32BE(20);
  for (const s of SORTES) {
    const imgs = table[s.nom] || [];
    assertEqual(imgs.length, s.variantes * (s.penche ? 5 : 1), 'les images de ' + s.nom);
    for (const [x, y, w, h, px, py] of imgs) {
      assert(x >= 0 && y >= 0 && x + w <= pw && y + h <= ph, s.nom + ' : dans la planche');
      assert(px >= 0 && px <= w && py >= 0 && py <= h, s.nom + ' : son pied dans son image');
    }
    if (s.teinte) assertEqual(s.variantes % 4, 0, s.nom + ' : quatre teintes');
  }
  assertEqual(Object.keys(table).sort(), SORTES.map((s) => s.nom).sort(), 'les sortes dessinées');
});
