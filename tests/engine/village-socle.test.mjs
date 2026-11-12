/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le socle (docs/ile.md, fiche I0a). Comme tous les fichiers
   tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true (tests/engine/aide.mjs).
   Lancer seul : node --test tests/engine/village-socle.test.mjs (ou node tests/run-tests.mjs village-socle).
   ========================================================================== */

import { createNewGame, DATA, villageActif } from '../../js/engine/index.js';
import { assertEqual, avecVillage, FICHIER_DU_VILLAGE, test, VILLAGE_DU_JEU } from './aide.mjs';

test('un fichier village-* tourne avec le réglage allumé', () => {
  assertEqual(FICHIER_DU_VILLAGE, true, 'le fichier est reconnu');
  assertEqual(DATA.VILLAGE.ACTIF, true, 'VILLAGE.ACTIF forcé');
  assertEqual(VILLAGE_DU_JEU, false, 'le réglage du jeu, lui, reste éteint');
  assertEqual(villageActif(createNewGame(11)), true, 'une partie neuve : allumé');
});

test('avecVillage(fn, false) éteint le réglage le temps d\'une fonction', () => {
  const s = createNewGame(11);
  assertEqual(avecVillage(() => villageActif(s), false), false, 'éteint dans la fonction');
  assertEqual(villageActif(s), true, 'rallumé après');
});
