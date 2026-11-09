/* ==========================================================================
   Tests : la planche des cultures de la carte (assets/crops.png, faite par scripts/carte/planche_cultures.py des
   dessins à la main de scripts/carte/sources/cultures.png).
   Chaque dessin (data/crops.json sprite : sa rangée r, ses colonnes c, la taille l × h d'une case) est entier dans sa
   case, le bas de sa butte au bas de la case, sa tige (le milieu de ses trois rangées du bas) au milieu : sur la carte,
   toutes les cultures ont le pied à la même place (plus de sprite.monte).
   Lancer seul : node tests/run-tests.mjs cultures-alignement.
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import { lirePng } from './png.mjs';
import { assert, assertEqual, test } from './aide.mjs';

test('crops.png : chaque culture le pied au bas de sa case, sa tige au milieu', () => {
  const im = lirePng('assets/crops.png');
  const ecarts = [];
  for (const [k, c] of Object.entries(DATA.CULTURES)) {
    const sp = c.sprite;
    assertEqual(sp.monte, undefined, `${k} : plus de sprite.monte`);
    sp.c.forEach((col, ph) => {
      const x0 = col * sp.l, y0 = sp.r * sp.h, pts = [];
      assert(x0 + sp.l <= im.w && y0 + sp.h <= im.h, `${k}:${ph} : dans la planche`);
      for (let y = y0; y < y0 + sp.h; y++) for (let x = x0; x < x0 + sp.l; x++) if (im.px(x, y)[3]) pts.push([x - x0, y - y0]);
      assert(pts.length > 10, `${k}:${ph} : un dessin`);
      const bas = Math.max(...pts.map((p) => p[1]));
      assertEqual(bas, sp.h - 1, `${k}:${ph} : le bas de sa butte au bas de la case`);
      const pied = pts.filter((p) => p[1] >= bas - 2).map((p) => p[0]);
      const cx = (Math.min(...pied) + Math.max(...pied) + 1) / 2;
      if (Math.abs(cx - sp.l / 2) > 0.5) ecarts.push(`${k}:${ph} (tige à ${cx})`);
      // (entier : rien ne touche les bords de la case, il n'a pas été rogné)
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      assert(Math.min(...xs) > 0 && Math.max(...xs) < sp.l - 1 && Math.min(...ys) > 0, `${k}:${ph} : entier dans sa case`);
    });
  }
  assertEqual(ecarts, [], 'la tige au milieu');
});

test('crops.png : rien d\'autre que les dessins des cultures', () => {
  const im = lirePng('assets/crops.png');
  const sp = Object.values(DATA.CULTURES).map((c) => c.sprite);
  const dans = (x, y) => sp.some((s) => s.c.some((col) => x >= col * s.l && x < (col + 1) * s.l && y >= s.r * s.h && y < (s.r + 1) * s.h));
  let hors = 0;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.px(x, y)[3] && !dans(x, y)) hors++;
  assertEqual(hors, 0);
});
