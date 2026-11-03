/* ==========================================================================
   Tests du moteur : les récompenses des chapitres (data/campaign.json recompense ; le lot 6).
   - un chapitre terminé offre ses plans et ses objets de décor, une seule fois ;
   - un plan déjà trouvé cède la place au suivant de sa collection, la collection complète au meuble lui-même ;
   - une ancienne partie reçoit les plans des chapitres déjà terminés, annoncés au matin.
   Lancer seul : node tests/run-tests.mjs chapitres-recompenses.
   ========================================================================== */

import { completeChapter, countItem, DATA, recompenseChapitre, updateChapters } from '../../js/engine/index.js';
import { planConnu, PLANS, plansAAnnoncer } from '../../js/engine/plans.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const R = (n) => DATA.CHAPITRES.liste[n - 1].recompense;

test('chapitres : chacun a sa récompense (des plans ou du décor), le dernier ouvre le jeu libre', () => {
  const L = DATA.CHAPITRES.liste;
  for (const ch of L) assert((ch.recompense.plans || []).length + Object.keys(ch.recompense.objets || {}).length > 0, ch.titre);
  const plans = L.flatMap((ch) => ch.recompense.plans || []);
  assertEqual(new Set(plans).size, plans.length, 'des plans tous différents');
  assert(/jeu libre|à ton rythme/.test(L[L.length - 1].intro));
});

test('chapitres : un chapitre terminé offre ses plans et ses objets, une fois', () => {
  const s = garden();
  const c = s.campagne;
  c.chapitre = 2;
  const b0 = countItem(s, 'banc_jardin');
  completeChapter(s);
  const a = c.annonces[c.annonces.length - 1];
  assertEqual(a.recompense, { plans: R(2).plans, objets: R(2).objets });
  assert(planConnu(s, R(2).plans[0]));
  assertEqual(countItem(s, 'banc_jardin') - b0, 1);
  assertEqual(plansAAnnoncer(s), [], 'annoncé par l\'écran de fin');
  assertEqual(recompenseChapitre(s, 2), { plans: [], objets: {} }, 'une seule fois');
});

test('chapitres : un plan déjà trouvé cède la place au suivant, la collection complète au meuble', () => {
  const s = garden();
  const id = R(3).plans[0];
  const col = Object.values(PLANS.COLLECTIONS).find((c) => c.plans.includes(id));
  const autre = col.plans.find((x) => x !== id);
  s.plans = { connus: { [id]: { jour: 1, de: null, annonce: true } } };
  assertEqual(recompenseChapitre(s, 3).plans, [autre]);
  // la collection complète : le meuble lui-même
  const s2 = garden();
  s2.plans = { connus: Object.fromEntries(col.plans.map((x) => [x, { jour: 1, de: null, annonce: true }])) };
  const n0 = countItem(s2, id);
  assertEqual(recompenseChapitre(s2, 3), { plans: [], objets: { [id]: 1 } });
  assertEqual(countItem(s2, id) - n0, 1);
});

test('chapitres : une ancienne partie reçoit les plans de ses chapitres terminés, annoncés au matin', () => {
  const s = garden();
  const c = s.campagne;
  delete c.recompenses;
  c.chapitre = 4;
  updateChapters(s);
  assertEqual(c.recompenses.slice(0, 3), [1, 2, 3]);
  for (const n of [2, 3]) assert(planConnu(s, R(n).plans[0]), `chapitre ${n}`);
  assert(!planConnu(s, R(4).plans[0]), 'pas le chapitre en cours');
  assertEqual(plansAAnnoncer(s).map((p) => p.id).sort(), [R(2).plans[0], R(3).plans[0]].sort());
});
