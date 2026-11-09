/* ==========================================================================
   Tests : la planche des cultures de la carte (assets/crops.png, faite par scripts/carte/planche_cultures.py des
   dessins à la main de scripts/carte/sources/cultures.png).
   Chaque dessin (data/crops.json sprite : sa rangée r, ses colonnes c, la taille l × h d'une case) est entier dans sa
   case, le milieu de sa masse du bas (ses 6 rangées du bas : la butte, le bulbe) sur le centre de la tache d'arrosage :
   sur la carte, toutes les cultures sont au milieu de leur tache (plus de sprite.monte).
   Lancer seul : node tests/run-tests.mjs cultures-alignement.
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import { lirePng } from './png.mjs';
import { assert, assertEqual, test } from './aide.mjs';

test('crops.png : chaque culture entière, le milieu de sa masse du bas au centre de la tache d\'arrosage', () => {
  const im = lirePng('assets/crops.png');
  // le centre de la tache (scripts/carte/terre_arrosee.py CENTRE : 8, 11,8 dans une case de terre de 16 px), dans une
  // case de la planche posée le bas au bas de la case de terre, son milieu au milieu (CULTURE_MONTE : 0)
  const ecarts = [];
  for (const [k, c] of Object.entries(DATA.CULTURES)) {
    const sp = c.sprite;
    assertEqual(sp.monte, undefined, `${k} : plus de sprite.monte`);
    const tache = [sp.l / 2, sp.h - 16 + 11.8];
    sp.c.forEach((col, ph) => {
      const x0 = col * sp.l, y0 = sp.r * sp.h, pts = [];
      assert(x0 + sp.l <= im.w && y0 + sp.h <= im.h, `${k}:${ph} : dans la planche`);
      for (let y = y0; y < y0 + sp.h; y++) for (let x = x0; x < x0 + sp.l; x++) if (im.px(x, y)[3]) pts.push([x - x0, y - y0]);
      assert(pts.length > 10, `${k}:${ph} : un dessin`);
      const bas = Math.max(...pts.map((p) => p[1]));
      const masse = pts.filter((p) => p[1] > bas - 6), xs = masse.map((p) => p[0]), ys = masse.map((p) => p[1]);
      const mx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, my = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
      if (Math.abs(mx - tache[0]) > 0.5 || Math.abs(my - tache[1]) > 0.5) ecarts.push(`${k}:${ph} (${mx}, ${my})`);
      // (entier : rien ne touche les bords de la case, il n'a pas été rogné)
      const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
      assert(Math.min(...X) > 0 && Math.max(...X) < sp.l - 1 && Math.min(...Y) > 0 && Math.max(...Y) < sp.h - 1, `${k}:${ph} : entier dans sa case`);
    });
  }
  assertEqual(ecarts, [], `au centre de la tache`);
});

test('crops.png : rien d\'autre que les dessins des cultures', () => {
  const im = lirePng('assets/crops.png');
  const sp = Object.values(DATA.CULTURES).map((c) => c.sprite);
  const dans = (x, y) => sp.some((s) => s.c.some((col) => x >= col * s.l && x < (col + 1) * s.l && y >= s.r * s.h && y < (s.r + 1) * s.h));
  let hors = 0;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.px(x, y)[3] && !dans(x, y)) hors++;
  assertEqual(hors, 0);
});
