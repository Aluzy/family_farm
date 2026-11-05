/* ==========================================================================
   Tests du moteur : G-1, le temps qu'il fait (js/engine/meteo.js, docs/phase-4.md).
   - le même ciel pour la même partie ; du beau temps, des averses, de la brume ; rien avant DEPUIS ;
   - l'averse a ses heures ; la brume se lève dans la matinée ;
   - la pluie arrose les cultures de la ferme (pas la Serre), sans eau ni énergie, et seulement pendant l'averse ;
   - au pas de l'horloge (tick), la pluie arrose.
   Lancer seul : node --test tests/engine/meteo.test.mjs (ou node tests/run-tests.mjs meteo).
   ========================================================================== */

import { brume, DATA, findPlot, meteoDuJour, plant, pleut, pluieSurLaFerme, tick } from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const M = DATA.METEO;
const copie = (x) => JSON.parse(JSON.stringify(x));
const aHeure = (s, h) => { s.awakeMs = (h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000; };
// Le premier jour de pluie (et de brume) de la partie.
const premier = (s, sorte) => { for (let d = M.DEPUIS; d < 400; d++) if (meteoDuJour(s, d).sorte === sorte) return d; return null; };

test('G-1 : le même ciel pour la même partie ; du beau temps, des averses, de la brume ; rien avant DEPUIS', () => {
  const a = garden(), b = copie(a);
  const ciel = (s) => Array.from({ length: 360 }, (_, k) => meteoDuJour(s, k + 1));
  assertEqual(ciel(a), ciel(b));
  const n = {};
  for (const m of ciel(a)) n[m.sorte] = (n[m.sorte] || 0) + 1;
  assert(n.clair > 150 && n.pluie > 30 && n.brume > 20, JSON.stringify(n));
  for (let d = 1; d < M.DEPUIS; d++) assertEqual(meteoDuJour(a, d).sorte, 'clair');
  for (const m of ciel(a).filter((x) => x.sorte === 'pluie')) assert(m.debut >= M.PLUIE_HEURES[0] && m.fin > m.debut && m.fin <= 22, JSON.stringify(m));
});

test('G-1 : l\'averse a ses heures ; la brume se lève dans la matinée', () => {
  const s = garden();
  s.day = premier(s, 'pluie');
  const m = meteoDuJour(s);
  assertEqual([pleut(s, m.debut - 0.5), pleut(s, m.debut), pleut(s, m.fin - 0.1), pleut(s, m.fin)], [false, true, true, false]);
  s.day = premier(s, 'brume');
  assert(brume(s, 6) === 1 && brume(s, 8) > 0 && brume(s, 8) < 1 && brume(s, M.BRUME_FIN) === 0, 'elle se lève');
  assertEqual(pleut(s, 12), false);
});

test('G-1 : la pluie arrose les cultures de la ferme, sans eau ni énergie, pendant l\'averse seulement ; au pas de l\'horloge aussi', () => {
  const s = garden();
  s.day = premier(s, 'pluie');
  const m = meteoDuJour(s);
  assert(plant(s, 'potager-1', 'carotte').ok);
  const eau = s.eauMl, energie = s.energie;
  aHeure(s, m.debut - 1);
  assertEqual([pluieSurLaFerme(s), findPlot(s, 'potager-1').arrose], [0, false], 'avant l\'averse');
  aHeure(s, m.debut);
  assertEqual(pluieSurLaFerme(s), 1);
  const p = findPlot(s, 'potager-1');
  assertEqual([p.arrose, s.eauMl, s.energie, s.meteo.arrosees], [true, eau, energie, 1]);
  assertEqual(pluieSurLaFerme(s), 0, 'déjà arrosée');
  // au pas de l'horloge
  const t = garden();
  t.day = s.day;
  assert(plant(t, 'potager-1', 'carotte').ok);
  aHeure(t, m.debut);
  tick(t, 0.2);
  assertEqual(findPlot(t, 'potager-1').arrose, true);
});
