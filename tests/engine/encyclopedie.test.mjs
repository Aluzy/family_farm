/* ==========================================================================
   Tests du moteur : l'encyclopédie de la partie, qui se remplit au fil des découvertes
   (js/engine/encyclopedie.js, js/engine/decouverte.js).
   Lancer seul : node --test tests/engine/encyclopedie.test.mjs (ou node tests/run-tests.mjs encyclopedie).
   ========================================================================== */

import { assert, assertEqual, garden, setInv, test } from './aide.mjs';
import {
  CATEGORIES, commencerDidacticiel, conditionRemplie, entreeEncyclopedie, erreurCondition, lirePage, majEncyclopedie,
  nombreEntrees, noterEncyclopedie, nouveautesEncyclopedie, pageConnue, pageNouvelle, pagesConnues, testFarmMap,
} from '../../js/engine/index.js';

test('encyclopédie : chaque entrée dit quand elle se découvre, avec des conditions connues', () => {
  assert(nombreEntrees() > 100, 'toutes les entrées');
  for (const c of CATEGORIES) {
    for (const e of c.entrees) {
      assert(e.decouverte.length > 0, e.id);
      for (const cond of e.decouverte) assertEqual(erreurCondition(cond), null, `${e.id} : ${cond}`);
      for (const l of e.liens) assert(entreeEncyclopedie(l), `${e.id} → ${l}`);
    }
  }
  assert(erreurCondition('objet:licorne'), 'objet inconnu');
  assert(erreurCondition('voler:haut'), 'sorte inconnue');
  assert(erreurCondition('depart:1'), 'depart sans valeur');
});

test('encyclopédie : ce qui est connu au début ne compte pas comme nouveau, puis chaque découverte est nouvelle jusqu\'à sa lecture', () => {
  const s = garden();
  testFarmMap(s, 'encyclopedie');
  setInv(s, {});
  commencerDidacticiel(s);
  assertEqual(majEncyclopedie(s), [], 'la première fois : rien de « nouveau »');
  assert(pageConnue(s, 'ramassage') && pageConnue(s, 'famille'), 'les pages du départ');
  assertEqual([pageConnue(s, 'carotte'), pageConnue(s, 'atelier'), nouveautesEncyclopedie(s)], [false, false, []]);
  // un objet obtenu : sa page
  setInv(s, { pierre: 1, fibre: 2 });
  assertEqual(majEncyclopedie(s).sort(), ['bois_et_pierre', 'fibre']);
  assertEqual([pageNouvelle(s, 'fibre'), nouveautesEncyclopedie(s).length], [true, 2]);
  assertEqual(majEncyclopedie(s), [], 'une seule fois');
  assert(lirePage(s, 'fibre'));
  assertEqual([pageNouvelle(s, 'fibre'), pageConnue(s, 'fibre'), nouveautesEncyclopedie(s)], [false, true, ['bois_et_pierre']]);
  // l'objet parti, la page reste
  setInv(s, {});
  majEncyclopedie(s);
  assert(pageConnue(s, 'fibre'));
  // une graine : la page de la culture
  setInv(s, { graine_carotte: 1 });
  assert(majEncyclopedie(s).includes('carotte'));
  // une carte visitée
  assert(!pageConnue(s, 'ville'));
  noterEncyclopedie(s, 'carte:ville');
  assert(majEncyclopedie(s).includes('ville'));
  assertEqual(pagesConnues(s, 'ville').includes('ville'), true);
});

test('encyclopédie : le didacticiel, les outils et les recettes', () => {
  const s = garden();
  testFarmMap(s, 'encyclopedie-2');
  commencerDidacticiel(s);
  assertEqual(conditionRemplie(s, 'didacticiel:atelier'), false, 'pas encore à l\'Atelier');
  s.didacticiel.etape = 9;
  assertEqual(conditionRemplie(s, 'didacticiel:atelier'), true);
  s.didacticiel.fini = true;
  assertEqual(conditionRemplie(s, 'didacticiel:fin'), true, 'fini : tout est atteint');
  s.outils = { ...(s.outils || {}), hache: true };
  assertEqual([conditionRemplie(s, 'outil:hache'), conditionRemplie(s, 'outil:pioche')], [true, false]);
  assertEqual(conditionRemplie(s, 'recette:pain'), false, 'pas de four');
  s.stations.four.construit = true;
  assertEqual(conditionRemplie(s, 'recette:pain'), true, 'le pain se lit dans le Livre de recette');
  assertEqual([conditionRemplie(s, 'jour:1'), conditionRemplie(s, 'jour:2')], [true, false]);
});
