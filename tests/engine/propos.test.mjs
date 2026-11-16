/* ==========================================================================
   Tests du moteur : V-1, les sujets des propos (js/engine/propos.js) que gardent les villageois de l'île
   (VILLAGE.PROPOS) : chaque sujet gardé a ses phrases (data/monde.json HABITANTS.PROPOS). Les propos des
   habitants des hameaux sont retirés avec eux à la bascule (I9h).
   Lancer seul : node --test tests/engine/propos.test.mjs (ou node tests/run-tests.mjs propos).
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import { SUJETS_PROPOS } from '../../js/engine/propos.js';
import { assert, test } from './aide.mjs';

const P = DATA.HABITANTS.PROPOS;
test('V-1 : chaque sujet gardé a ses phrases', () => {
  assert(SUJETS_PROPOS.length >= 10, `${SUJETS_PROPOS.length} sujets`);
  for (const id of SUJETS_PROPOS) assert(Array.isArray(P[id]) && P[id].length >= 2, `${id} : ses phrases`);
  assert(P.PART > 0 && P.PART < 1 && P.MEMOIRE >= 2);
});
