/* ==========================================================================
   Tests du moteur : la ferme d'essai des mesures de performance (F0-6, docs/perf.md ;
   js/engine/testmode.js, testFermeConstruite) : bâtie d'un coup, elle a ses bâtiments, des maisons
   meublées avec un étage, un jardin ; elle se sauvegarde et se relit telle quelle.
   Lancer seul : node --test tests/engine/perf-ferme.test.mjs (ou node tests/run-tests.mjs perf-ferme).
   ========================================================================== */

import {
  blocsPoses, DATA, empreintePartie, escaliers, etageBlocs, migrate, piecesCloses, testFarmMap, testFermeConstruite,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

test('la ferme d\'essai : bâtiments, maisons meublées avec un étage, jardin ; sauvegardée et relue telle quelle', () => {
  const s = garden();
  testFarmMap(s, '42');
  const r = testFermeConstruite(s);
  assert(r.ok);
  const B = blocsPoses(s), sortes = Object.values(B), A = DATA.ATELIER.BLOCS;
  assertEqual(r.poses, sortes.length, 'tout ce qui est posé est compté');
  assert(sortes.length > 300, `${sortes.length} blocs`);
  assert(sortes.filter((x) => A[x].meuble).length >= 60, 'des meubles dans les maisons');
  for (const b of ['nichoir', 'mangeoire', 'meule', 'bac_semis', 'puits', 'pergola']) if (A[b]) assert(sortes.includes(b) || Object.values(s.blocsDessus || {}).includes(b), b);
  assert(s.poulailler.construit && s.silo.construit && s.serre.construit, 'les bâtiments sont reconnus');
  assertEqual(escaliers(s).length, 2, 'deux maisons à étage');
  assert(Object.keys(etageBlocs(s)).length >= 8, 'des paillasses à l\'étage');
  assert(piecesCloses(s).length >= 6, 'des pièces closes');
  // sauvegardée (JSON) et relue : la même partie
  const lue = migrate(JSON.parse(JSON.stringify({ v: s.version, t: 0, s })));
  assertEqual(empreintePartie(lue), empreintePartie(s));
});
