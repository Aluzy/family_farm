/* ==========================================================================
   Tests du moteur : planter un arbre depuis l'Inventaire (js/engine/plantation.js).
   Lancer seul : node --test tests/engine/plantation.test.mjs (ou node tests/run-tests.mjs plantation).
   ========================================================================== */

import { assert, assertEqual, garden, setInv, test } from './aide.mjs';
import {
  caseDepart, casesAPlanter, countItem, farmTerrain, planterIci, poseStatus, poussesArbres, sorteAPlanter, sortesAPlanter, testFarmMap,
} from '../../js/engine/index.js';

test('planter : les graines d\'arbre et les jeunes arbres fruitiers se plantent depuis l\'Inventaire', () => {
  assertEqual([sorteAPlanter('gland'), sorteAPlanter('pomme_de_pin'), sorteAPlanter('jeune_pommier'), sorteAPlanter('pierre')], ['gland', 'pomme_de_pin', 'pommier', null]);
  assert(sortesAPlanter().includes('gland') && sortesAPlanter().includes('pecher') && !sortesAPlanter().includes('mur_bois'));
});

test('planter : les cases proposées autour du personnage, puis l\'arbre planté', () => {
  const s = garden();
  testFarmMap(s, 'plantation');
  setInv(s, { gland: 1 });
  const T = farmTerrain(s), centre = caseDepart(T), W = T.LARGEUR;
  const cases = casesAPlanter(s, 'gland', centre, 6);
  assert(cases.length > 0, 'des cases libres autour');
  assert(cases.every((c) => poseStatus(s, 'gland', c).ok), 'toutes possibles');
  assert(cases.every((c) => Math.abs((c % W) - (centre % W)) <= 6 && Math.abs(Math.floor(c / W) - Math.floor(centre / W)) <= 6), 'à portée');
  const r = planterIci(s, 'gland', cases[0]);
  assert(r.ok, r.error);
  assertEqual([countItem(s, 'gland'), poussesArbres(s).map((a) => a.case)], [0, [cases[0]]]);
  assertEqual(planterIci(s, 'gland', cases[cases.length - 1]).ok, false, 'plus de gland');
  assertEqual(planterIci(s, 'mur_bois', cases[1]).ok, false, 'pas un arbre');
});
