/* ==========================================================================
   Tests du moteur : l'île vue par la scène (js/engine/ile/scene.js ; docs/ile-300.md, étape 7b). Les régions ont la
   forme de celles du grand monde d'avant (la scène les peint sans changer) ; chaque objet de l'île y a son dessin ; la
   marche suit l'île ; une région change quand l'île change.
   Lancer seul : node --test tests/engine/ile-scene.test.mjs (ou node tests/run-tests.mjs ile-scene).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creerIle, ILE, marchable, retirerObjet } from '../../js/engine/ile.js';
import { contexteIle, planchesDeLIle, regionDeLIle, regionsDeLaScene } from '../../js/engine/ile/scene.js';

const N = ILE.TAILLE,
  R = 64;
const ile = creerIle('7');
const ctx = contexteIle(ile, '7', R);

test('une région : la forme attendue par la scène, un sol à chaque case', () => {
  const r = regionDeLIle(ctx, 2, 2);
  assert.deepEqual([r.cle, r.cx0, r.cy0, r.cl, r.ch], ['2,2', 128, 128, 64, 64]);
  assert.equal(r.couches.length, r.l * r.h * 8);
  for (let k = 0; k < r.l * r.h; k++) assert.ok(r.couches[k * 8] > 0, 'une case sans sol');
  for (const c of ['vegetation', 'roches', 'cultures', 'fruitiers', 'lieux', 'hameau'])
    assert.ok(r[c].images instanceof Int32Array && r[c].basses instanceof Int32Array, c);
});

test("chaque objet de l'île a son dessin, une fois, dans la région de son pied", () => {
  let objets = 0,
    dessins = 0;
  for (let i = 0; i < N * N; i++) if (ile.objet[i]) objets++;
  for (let ry = 0; ry * R < N; ry++) {
    for (let rx = 0; rx * R < N; rx++) {
      const r = regionDeLIle(ctx, rx, ry);
      for (const c of ['vegetation', 'roches', 'cultures', 'fruitiers']) {
        dessins += r[c].images.length / 4;
        const b = r[c].basses;
        for (let k = 0; k < b.length; k += 4) {
          const x = Math.floor(b[k + 1] / 16),
            y = Math.floor((b[k + 2] - 1) / 16);
          if (x >= r.cx0 && x < r.cx0 + r.cl && y >= r.cy0 && y < r.cy0 + r.ch) dessins++;
        }
      }
    }
  }
  assert.equal(dessins, objets);
});

test('les cultures et les fruitiers : une image par stade', () => {
  const P = planchesDeLIle();
  assert.equal(P.cultures.sortes.length, 18);
  assert.equal(P.fruitiers.sortes.length, 5);
  for (const p of [P.cultures, P.fruitiers])
    for (const s of p.sortes) assert.equal(p.table[s.nom].length, s.variantes, s.nom);
});

test("la marche suit l'île ; une région se refait quand l'île change", () => {
  const r = regionDeLIle(ctx, 2, 2);
  for (let y = 0; y < r.ch; y += 3)
    for (let x = 0; x < r.cl; x += 3)
      assert.equal(r.marche[y * r.cl + x], marchable(ile, (r.cy0 + y) * N + r.cx0 + x) ? 1 : 0);
  let i = -1;
  for (let y = r.cy0 + 2; y < r.cy0 + r.ch - 2 && i < 0; y++)
    for (let x = r.cx0 + 2; x < r.cx0 + r.cl - 2; x++)
      if (ile.bloque[y * N + x] && ile.objet[y * N + x]) {
        i = y * N + x;
        break;
      }
  assert.ok(i >= 0);
  assert.ok(retirerObjet(ile, i));
  const cles = regionsDeLaScene([...ile.modifiees], R);
  assert.ok(cles.includes('2,2'));
  const r2 = regionDeLIle(ctx, 2, 2);
  assert.equal(r2.marche[(Math.floor(i / N) - r2.cy0) * r2.cl + (i % N) - r2.cx0], 1);
});
