/* ==========================================================================
   Tests du réglage de bascule du chantier « l'île à bâtir », éteint (docs/ile.md, fiche I0a) :
   avec VILLAGE.ACTIF à false, le jeu est celui d'avant. Le réglage allumé : tests/engine/village-*.test.mjs.
   Lancer seul : node --test tests/engine/reglage-village.test.mjs (ou node tests/run-tests.mjs reglage-village).
   ========================================================================== */

import { createNewGame, DATA, migrate, villageActif } from '../../js/engine/index.js';
import { allumerEssaiVillage, essaiVillage } from '../../js/engine/village.js';
import { assert, assertEqual, avecVillage, test, VILLAGE_DU_JEU } from './aide.mjs';

const json = (s) => JSON.stringify(s);

test('le réglage du jeu publié : VILLAGE.ACTIF vaut false tant que le chantier dure', () => {
  assertEqual(VILLAGE_DU_JEU, false, 'data/village.json : VILLAGE.ACTIF');
  assertEqual(DATA.VILLAGE.ACTIF, false, 'le réglage de ce fichier');
  assertEqual(villageActif(createNewGame(7)), false, 'une partie neuve : éteint');
  assertEqual(villageActif(null), false, 'sans partie : éteint');
});

test('éteint, une nouvelle partie est identique à celle d\'avant le chantier (à la graine près)', () => {
  for (const graine of [1, 42, 20261112]) {
    const avec = json(createNewGame(graine));
    // (le jeu d'avant : sans la moindre donnée du chantier)
    const village = DATA.VILLAGE;
    delete DATA.VILLAGE;
    let avant;
    try {
      avant = json(createNewGame(graine));
    } finally {
      DATA.VILLAGE = village;
    }
    assertEqual(avec, avant, `graine ${graine} : même état initial`);
    assert(!('essais' in JSON.parse(avec)), `graine ${graine} : pas de marque d'essai`);
    assertEqual(json(createNewGame(graine)), avec, `graine ${graine} : la même graine rejoue la même partie`);
  }
});

test('avecVillage allume le réglage le temps d\'une fonction, puis le remet', () => {
  const s = createNewGame(3);
  assertEqual(avecVillage(() => villageActif(s)), true, 'allumé dans la fonction');
  assertEqual(villageActif(s), false, 'éteint après');
  let leve = false;
  try { avecVillage(() => { throw new Error('x'); }); } catch (e) { leve = true; }
  assert(leve && DATA.VILLAGE.ACTIF === false, 'remis même si la fonction lève');
});

test('une partie d\'essai l\'allume pour elle seule, et le garde en se rechargeant', () => {
  const essai = allumerEssaiVillage(createNewGame(5));
  const autre = createNewGame(5);
  assertEqual(villageActif(essai), true, 'la partie d\'essai');
  assertEqual(essaiVillage(essai), true, 'le bandeau de l\'essai');
  assertEqual(villageActif(autre), false, 'une autre partie : éteint');
  assertEqual(essaiVillage(autre), false, 'pas de bandeau');
  const relue = migrate(JSON.parse(JSON.stringify(essai)));
  assertEqual(villageActif(relue), true, 'rechargée : toujours une partie d\'essai');
  // (le réglage allumé pour de bon : plus de bandeau d'essai)
  avecVillage(() => assertEqual(essaiVillage(essai), false, 'ACTIF : pas de bandeau'));
});
