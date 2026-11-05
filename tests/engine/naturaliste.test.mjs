/* ==========================================================================
   Tests du moteur : D-1, le carnet du naturaliste (js/engine/naturaliste.js, docs/phase-4.md).
   - les collections : leurs pages existent dans l'Encyclopédie, leur récompense est un meuble ;
   - la condition « biome:<biome> » (un paysage parcouru) découvre sa page ;
   - une collection complète donne sa récompense une fois, et pas avant d'être complète.
   Lancer seul : node --test tests/engine/naturaliste.test.mjs (ou node tests/run-tests.mjs naturaliste).
   ========================================================================== */

import {
  addItem, collectionsNaturaliste, countItem, DATA, entreeEncyclopedie, majEncyclopedie, noterEncyclopedie, objetRecompense,
  pageConnue, recompensesNaturaliste,
} from '../../js/engine/index.js';
import { erreurCondition } from '../../js/engine/decouverte.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const C = DATA.NATURALISTE.COLLECTIONS;

test('D-1 : les collections : des pages de l\'Encyclopédie, un meuble pour récompense', () => {
  eq(Object.keys(C), ['fossiles', 'plage', 'sous_bois', 'poissons', 'paysages']);
  for (const [id, c] of Object.entries(C)) {
    for (const p of c.pages) assert(entreeEncyclopedie(p), `${id} : la page ${p}`);
    const b = DATA.ATELIER.BLOCS[c.recompense];
    assert(b && b.meuble && DATA.OBJETS[objetRecompense(c)], `${id} : un meuble à poser`);
  }
  eq(C.paysages.pages.length, DATA.BIOMES.length, 'un paysage par biome');
  eq([erreurCondition('biome:foret'), typeof erreurCondition('biome:volcan')], [null, 'string']);
});
function eq(a, b, m) { assertEqual(a, b, m); }

test('D-1 : un paysage parcouru découvre sa page', () => {
  const s = garden();
  majEncyclopedie(s);
  assert(!pageConnue(s, 'b_foret'));
  noterEncyclopedie(s, 'biome:foret');
  const n = majEncyclopedie(s);
  assert(n.includes('b_foret') && pageConnue(s, 'b_foret') && !pageConnue(s, 'b_lande'));
});

test('D-1 : une collection complète donne sa récompense, une fois ; pas avant', () => {
  const s = garden();
  majEncyclopedie(s);
  const objet = objetRecompense(C.fossiles);
  const avant = countItem(s, objet);
  for (const it of ['ammonite', 'trilobite', 'quartz']) addItem(s, it, 1);
  majEncyclopedie(s);
  eq([recompensesNaturaliste(s).length, countItem(s, objet)], [0, avant], 'il manque l\'améthyste');
  eq(collectionsNaturaliste(s).find((c) => c.id === 'fossiles').connues, 3);
  addItem(s, 'amethyste', 1);
  majEncyclopedie(s);
  const r = recompensesNaturaliste(s);
  eq([r.map((x) => x.id), countItem(s, objet)], [['fossiles'], avant + 1]);
  eq([recompensesNaturaliste(s).length, countItem(s, objet)], [0, avant + 1], 'une seule fois');
  assert(collectionsNaturaliste(s).find((c) => c.id === 'fossiles').faite === s.day);
});
