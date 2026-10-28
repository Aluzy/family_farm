/* ==========================================================================
   Tests du moteur : les textes du récit (le récit, lot 11 ; docs/recit/plan.md).
   - le texte d'ouverture « Printemps 2021 » n'existe plus ;
   - la lettre de la Serre vient d'Adèle (adele_serre) ; la migration 64 → 65 renomme la lettre reçue ;
   - chaque intro de chapitre s'ouvre sur une phrase d'Adèle, d'Achille ou d'Odile ;
   - les pages de l'île de Céron (l'encyclopédie) se découvrent par les faits du récit (« fait:… »).
   Lancer seul : node tests/run-tests.mjs textes-recit.
   ========================================================================== */

import { createNewGame, DATA, migrate, STATE_VERSION } from '../../js/engine/index.js';
import { conditionRemplie, erreurCondition } from '../../js/engine/decouverte.js';
import { noterFait } from '../../js/engine/recit.js';
import { assert, assertEqual, test } from './aide.mjs';

test('plus de texte d\'ouverture « Printemps 2021 »', () => {
  assertEqual(DATA.DEPART.HISTOIRE, undefined);
  assert(!JSON.stringify(DATA).includes('2021'), 'aucune date du monde réel');
});

test('la lettre de la Serre vient d\'Adèle ; une partie d\'avant garde la sienne, renommée', () => {
  assertEqual(DATA.COURRIER.cousin_venezuela, undefined);
  assertEqual(DATA.COURRIER.adele_serre.expediteur, 'Adèle');
  const s = createNewGame(3);
  s.version = 64;
  s.courrier = [{ id: 'adele_arrivee', nuit: 1, lu: true }, { id: 'cousin_venezuela', nuit: 40, lu: false }];
  const m = migrate({ v: 64, t: 0, s });
  assertEqual([m.version, m.courrier.map((l) => [l.id, l.lu])], [STATE_VERSION, [['adele_arrivee', true], ['adele_serre', false]]]);
});

test('chaque intro de chapitre s\'ouvre sur une phrase d\'Adèle, d\'Achille ou d\'Odile', () => {
  for (const [i, c] of DATA.CHAPITRES.liste.entries()) {
    for (const t of [c.intro, c.introSauvage].filter(Boolean)) {
      assert(/^« [^»]+ », (dit (le cocher|Achille|Odile)|t'écrit ta mère)\./.test(t), `chapitre ${i + 1} : ${t.slice(0, 60)}`);
    }
  }
});

test('les pages de l\'île se découvrent par les faits du récit', () => {
  assertEqual([erreurCondition('fait:odile.rencontre'), erreurCondition('fait:veillee.1'), erreurCondition('fait:')].map((e) => e === null), [true, true, false]);
  const s = createNewGame(3);
  assertEqual(conditionRemplie(s, 'fait:odile.rencontre'), false);
  noterFait(s, 'odile.rencontre');
  assert(conditionRemplie(s, 'fait:odile.rencontre'));
});
