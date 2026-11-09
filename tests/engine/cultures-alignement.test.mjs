/* ==========================================================================
   Tests : l'alignement des cultures sur la carte (assets/crops.png, scripts/carte/aligner_cultures.py).
   Chaque dessin (data/crops.json sprite : sa rangée du bas, sa hauteur, ses colonnes) a son pied au bas de sa
   case et sa tige au milieu (à un pixel près, ou au plus près sans rogner un dessin trop large) ; la carte les pose
   toutes de la même façon (plus de sprite.monte).
   Lancer seul : node tests/run-tests.mjs cultures-alignement.
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import { lirePng } from './png.mjs';
import { assert, assertEqual, test } from './aide.mjs';

test('crops.png : le pied de chaque culture au bas de sa case, sa tige au milieu', () => {
  const im = lirePng('assets/crops.png');
  const T = 16, ecarts = [];
  for (const [k, c] of Object.entries(DATA.CULTURES)) {
    const sp = c.sprite;
    if (!sp) continue;
    assertEqual(sp.monte, undefined, `${k} : plus de sprite.monte`);
    sp.c.forEach((col, ph) => {
      const x0 = col * T, y1 = (sp.r + 1) * T, y0 = y1 - sp.h, pts = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x0 + T; x++) if (im.px(x, y)[3]) pts.push([x - x0, y - y0]);
      assert(pts.length, `${k}:${ph} : un dessin`);
      const bas = Math.max(...pts.map((p) => p[1]));
      assertEqual(bas, sp.h - 1, `${k}:${ph} : le pied au bas de la case`);
      const pied = pts.filter((p) => p[1] >= bas - 2).map((p) => p[0]);
      const cx = (Math.min(...pied) + Math.max(...pied) + 1) / 2;
      const xs = pts.map((p) => p[0]), bord = Math.min(...xs) === 0 || Math.max(...xs) === T - 1;
      if (Math.abs(cx - T / 2) > 1 && !bord) ecarts.push(`${k}:${ph} (tige à ${cx})`);
    });
  }
  assertEqual(ecarts, [], 'la tige au milieu (sauf un dessin qui touche déjà le bord de sa case)');
});
