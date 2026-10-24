/* ==========================================================================
   Tests du moteur : les rochers, les falaises et la côte du grand monde (js/engine/monde-roches.js,
   fiche 5c) : la pose est déterministe et ne dépend pas de l'ordre des régions (le Worker et le
   calcul direct : monde-sol.test.mjs) ; deux régions voisines peignent les mêmes petites pièces sur
   leur bord commun ; rien sur la ferme, un chemin, un lieu, ni dans l'eau (sauf les rochers dans la
   mer, près du rivage) ; les falaises en relief : une colonne au bas de chaque bande de cases hautes
   (falaise, sommet), ni trou ni doublon d'une région à l'autre ; rien sur la végétation ; une épave
   au plus ; les chemins jamais fermés ; les densités dans leurs bornes (ROCHES.BORNES) ; les
   dessins (assets/roches.json) : une image par variante de chaque sorte, l'écume.
   Lancer seul : node --test tests/engine/monde-roches.test.mjs (ou node tests/run-tests.mjs monde-roches).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { BIOME, BIOMES, caseMarchable, contexteSol, genererMonde, MONDE, solDeRegion, solDirect } from '../../js/engine/index.js';
import { ROCHES, SORTES_ROCHES } from '../../js/engine/monde-roches.js';
import { SORTES, VEGETATION } from '../../js/engine/monde-vegetation.js';
import { assert, assertEqual, test } from './aide.mjs';

const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, N = MONDE.REGION;
const regions = () => {
  const out = [];
  for (let ry = 0; ry * N < H; ry++) for (let rx = 0; rx * N < W; rx++) out.push([rx, ry]);
  return out;
};
// la case du pied d'une pièce [sorte, x, y, variante] (px)
const caseDe = (v, k) => [Math.floor(v[k + 1] / 16), Math.floor((v[k + 2] - 1) / 16)];
const hautes = new Set(['falaise', 'sommet'].map((b) => BIOME[b]));
const eaux = new Set(['mer', 'lac', 'riviere'].map((b) => BIOME[b]));

test('les rochers : les mêmes quel que soit l\'ordre des régions, les mêmes petites pièces sur un bord commun', () => {
  const M = genererMonde('roc-1').terrain.MONDE;
  const a = contexteSol(M.graine, M.cadre, M.ferme, M.taille), b = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  const ra = new Map(), rb = new Map(), liste = [[1, 0], [2, 0], [1, 1], [8, 6], [9, 6], [8, 7]];
  for (const [rx, ry] of liste) ra.set(rx + ',' + ry, solDeRegion(a, rx, ry));
  for (const [rx, ry] of liste.slice().reverse()) rb.set(rx + ',' + ry, solDeRegion(b, rx, ry));
  let n = 0;
  for (const [cle, r] of ra) {
    assertEqual([...r.roches.images].join(), [...rb.get(cle).roches.images].join(), 'les images de ' + cle);
    assertEqual([...r.roches.basses].join(), [...rb.get(cle).roches.basses].join(), 'les petites de ' + cle);
    assertEqual([...r.marche].join(), [...rb.get(cle).marche].join(), 'la marche de ' + cle);
    n += r.roches.images.length / 4;
  }
  assert(n > 50, `des pièces : ${n}`);
  for (const [p, q] of [['1,0', '2,0'], ['1,0', '1,1'], ['8,6', '9,6'], ['8,6', '8,7']]) {
    const A = ra.get(p), B = ra.get(q);
    const dans = (r, X, Y) => X >= r.x0 && Y >= r.y0 && X < r.x0 + r.l && Y < r.y0 + r.h;
    const communes = (r, o) => {
      const out = [], v = r.roches.basses;
      for (let k = 0; k < v.length; k += 4) { const [X, Y] = caseDe(v, k); if (dans(r, X, Y) && dans(o, X, Y)) out.push([...v.slice(k, k + 4)].join()); }
      return out.sort().join(';');
    };
    assertEqual(communes(A, B), communes(B, A), 'le bord commun de ' + p + ' et ' + q);
  }
});

test('les rochers : rien sur la ferme, un chemin, un lieu, ni dans l\'eau (sauf près du rivage) ; rien sur la végétation ; les falaises continues', () => {
  for (const G of ['roc-1', 'veg-2']) {
    const m = genererMonde(G), T = m.terrain, p = m.plan, F = T.FERME, sol = solDirect(T), ctx = sol.ctx;
    const biome = (X, Y) => { const i = Y * W + X, e = ctx.elements.eaux[i]; return e !== 255 ? e : p.biome[i]; };
    const haute = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && hautes.has(biome(X, Y));
    const fautes = [], parois = new Map(), vegImages = [], vegBasses = new Set();
    let images = 0, basses = 0, epaves = 0;
    const FM = VEGETATION.FERME;
    const verifie = (X, Y, so) => {
      const i = Y * W + X, b = biome(X, Y);
      if (X >= F.X - FM && Y >= F.Y - FM && X < F.X + F.LARGEUR + FM && Y < F.Y + F.HAUTEUR + FM) fautes.push(so.nom + ' sur la ferme ' + X + ',' + Y);
      if (ctx.chemins[i]) fautes.push(so.nom + ' sur un chemin ' + X + ',' + Y);
      if (ctx.reserves[i]) fautes.push(so.nom + ' sur un lieu ' + X + ',' + Y);
      if (so.genre === 'mer') {
        if (b !== BIOME.mer) fautes.push(so.nom + ' hors de la mer ' + X + ',' + Y);
        let d = 99;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (!eaux.has(biome(Math.min(W - 1, Math.max(0, X + dx)), Math.min(H - 1, Math.max(0, Y + dy))))) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
        if (d > ROCHES.MER.DISTANCE[1]) fautes.push(so.nom + ' au large ' + X + ',' + Y);
      } else if (eaux.has(b)) fautes.push(so.nom + ' dans l\'eau ' + X + ',' + Y);
      else if (b === BIOME.falaise) fautes.push(so.nom + ' sur une falaise ' + X + ',' + Y);
      else if (b === BIOME.sommet && so.genre !== 'basse') {
        for (let d = 1; d <= ROCHES.SOMMET; d++) if (!haute(X, Y + d)) { fautes.push(so.nom + ' au bas des sommets ' + X + ',' + Y); break; }
      }
    };
    for (const [rx, ry] of regions()) {
      const r = sol.region(rx, ry), v = r.roches, g = r.vegetation;
      for (let k = 0; k < g.images.length; k += 4) vegImages.push([...caseDe(g.images, k), SORTES[g.images[k]]]);
      for (let k = 0; k < g.basses.length; k += 4) { const [X, Y] = caseDe(g.basses, k); vegBasses.add(Y * W + X); }
      for (let k = 0; k < v.images.length; k += 4) {
        const [X, Y] = caseDe(v.images, k), so = SORTES_ROCHES[v.images[k]];
        assert(X >= r.cx0 && Y >= r.cy0 && X < r.cx0 + r.cl && Y < r.cy0 + r.ch, 'une image dans sa région');
        assert(v.images[k + 3] < so.variantes, 'une variante dessinée');
        if (so.genre === 'paroi') {
          const cle = Y * W + X;
          if (parois.has(cle)) fautes.push('deux falaises en ' + X + ',' + Y);
          parois.set(cle, v.images[k + 3]);
          continue;
        }
        if (so.genre === 'epave') epaves++;
        for (const [dx, dy] of so.bloque || [[0, 0]]) verifie(X + dx, Y + dy, so);
        images++;
      }
      for (let k = 0; k < v.basses.length; k += 4) {
        const [X, Y] = caseDe(v.basses, k), so = SORTES_ROCHES[v.basses[k]];
        verifie(X, Y, so);
        assert(v.basses[k + 3] < so.variantes, 'une variante dessinée');
        if (vegBasses.has(Y * W + X) && X >= r.cx0 && Y >= r.cy0 && X < r.cx0 + r.cl && Y < r.cy0 + r.ch) fautes.push(so.nom + ' sur une petite plante ' + X + ',' + Y);
        basses++;
      }
    }
    // les falaises : une colonne au bas de chaque bande de cases hautes, et nulle part ailleurs
    let bas = 0;
    for (let Y = 0; Y < H - 1; Y++) {
      for (let X = 0; X < W; X++) {
        const est = haute(X, Y) && !haute(X, Y + 1);
        if (est) bas++;
        if (est !== parois.has(Y * W + X)) fautes.push((est ? 'un trou dans la falaise en ' : 'une falaise de trop en ') + X + ',' + Y);
      }
    }
    assertEqual(fautes.slice(0, 5), [], G + ' : des pièces mal posées');
    assertEqual(parois.size, bas, G + ' : les colonnes des falaises');
    assert(bas > 300 && images > 1000 && basses > 3000, `${G} : ${bas} colonnes de falaise, ${images} images, ${basses} petites pièces`);
    assert(epaves <= 1, G + ' : une épave au plus');
    // rien sur un arbre ou un buisson : aucune pièce (hors falaises) à son écart d'une image de la végétation
    const pieces = new Map();
    for (const [rx, ry] of regions()) {
      const v = sol.region(rx, ry).roches.images;
      for (let k = 0; k < v.length; k += 4) if (SORTES_ROCHES[v[k]].genre !== 'paroi') { const [X, Y] = caseDe(v, k); pieces.set(Y * W + X, SORTES_ROCHES[v[k]]); }
    }
    let proches = 0;
    for (const [X, Y, sv] of vegImages) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const so = pieces.get((Y + dy) * W + X + dx);
          if (so && dx * dx + dy * dy <= Math.max(1, so.ecart || 0, sv.ecart || 0) ** 2) proches++;
        }
      }
    }
    assertEqual(proches, 0, G + ' : des rochers sur la végétation');
    // les chemins (et leurs bords) restent marchables
    for (const ch of p.chemins) assert(ch.every((t) => caseMarchable(T, t)), 'un chemin marchable');
    let fermes = 0;
    for (let i = 0; i < W * H; i++) if (ctx.chemins[i] === 1 && !caseMarchable(T, i)) fermes++;
    assertEqual(fermes, 0, G + ' : des cases de chemin fermées');
  }
});

test('les rochers : les densités de chaque biome dans leurs bornes, une épave au plus', () => {
  for (const G of ['roc-1', 'veg-2']) {
    const sol = solDirect(genererMonde(G).terrain), cases = {}, images = {}, basses = {};
    for (const [rx, ry] of regions()) {
      const r = sol.region(rx, ry), v = r.roches;
      const biome = (X, Y) => BIOMES[r.biome[(Y - r.cy0) * r.cl + X - r.cx0]];
      for (const b of r.biome) cases[BIOMES[b]] = (cases[BIOMES[b]] || 0) + 1;
      for (let k = 0; k < v.images.length; k += 4) {
        if (SORTES_ROCHES[v.images[k]].genre === 'paroi') continue;
        const b = biome(...caseDe(v.images, k));
        images[b] = (images[b] || 0) + 1;
      }
      for (let k = 0; k < v.basses.length; k += 4) {
        const [X, Y] = caseDe(v.basses, k);
        if (X < r.cx0 || Y < r.cy0 || X >= r.cx0 + r.cl || Y >= r.cy0 + r.ch) continue;
        const b = biome(X, Y);
        basses[b] = (basses[b] || 0) + 1;
      }
    }
    for (const [b, bornes] of Object.entries(ROCHES.BORNES)) {
      if (!cases[b]) continue;
      const di = (images[b] || 0) / cases[b], db = (basses[b] || 0) / cases[b];
      assert(di >= bornes.images[0] && di <= bornes.images[1], `${G} : ${b}, ${di.toFixed(4)} image par case (${bornes.images.join(' à ')})`);
      assert(db >= bornes.basses[0] && db <= bornes.basses[1], `${G} : ${b}, ${db.toFixed(4)} petite pièce par case (${bornes.basses.join(' à ')})`);
    }
    for (const b of ['lac', 'riviere', 'falaise']) assertEqual([images[b] || 0, basses[b] || 0], [0, 0], b);
  }
});

test('les rochers : chaque variante de chaque sorte a son dessin dans la planche, l\'écume aussi', () => {
  const table = JSON.parse(readFileSync(new URL('../../assets/roches.json', import.meta.url), 'utf8'));
  const b = readFileSync(new URL('../../assets/roches.png', import.meta.url)), pw = b.readUInt32BE(16), ph = b.readUInt32BE(20);
  for (const s of SORTES_ROCHES) {
    const imgs = table[s.nom] || [];
    assertEqual(imgs.length, s.variantes, 'les images de ' + s.nom);
    for (const [x, y, w, h, px, py] of imgs) {
      assert(x >= 0 && y >= 0 && x + w <= pw && y + h <= ph, s.nom + ' : dans la planche');
      assert(px >= 0 && px <= w && py >= 0 && py <= h, s.nom + ' : son pied dans son image');
    }
    // (une colonne de falaise : 16 px de large, posée sur le milieu de sa case)
    if (s.genre === 'paroi') assert(imgs.every(([, , w, , px]) => w === 16 && px === 8), s.nom + ' : des colonnes de 16 px');
  }
  assert((table.ecume || []).length >= 2, 'l\'écume autour des rochers dans l\'eau');
  assertEqual(Object.keys(table).filter((k) => k !== 'ecume').sort(), SORTES_ROCHES.map((s) => s.nom).sort(), 'les sortes dessinées');
});
