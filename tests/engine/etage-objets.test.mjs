/* ==========================================================================
   Tests du moteur : ce qui se pose à l'étage (js/engine/etage.js ETAGE_BLOCS, DECOR_ETAGE, dessusEtage,
   murEtage). Les tableaux s'accrochent aux murs de l'étage (posés à l'étage, ou ceux du bas rehaussés) ;
   la décoration du jardin s'y pose ; ce qui fait quelque chose (four, cuisinière, réfrigérateur, boîte
   à nourriture, meule) reste au sol, et le message le dit.
   Lancer seul : node --test tests/engine/etage-objets.test.mjs (ou node tests/run-tests.mjs etage-objets).
   ========================================================================== */

import {
  addItem, countItem, DATA, DECOR_ETAGE, defaire, dessusEtage, empreintePartie, ETAGE_BLOCS, etageBlocs, etageEmprise,
  executerCommande, hauteurPile, murEtage, poseEtageStatus, poserEtage, rangerEtage, reprendreBloc, reprendreEtage,
  testFarmMap, testFermeConstruite, tournerEtage, decorAutour, decorFerme,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const B = DATA.ATELIER.BLOCS;

function etage() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const t of Object.keys(etageBlocs(s)).map(Number)) assert(reprendreEtage(s, t).ok);
  const E = [...etageEmprise(s)].sort((a, b) => a - b);
  const hauts = E.filter((t) => hauteurPile(s, t) >= 2);          // (les murs du bas rehaussés : ceux de l'étage)
  const sols = E.filter((t) => hauteurPile(s, t) < 2 && s.blocs[t] !== 'escalier');
  assert(hauts.length && sols.length > 10);
  return { s, hauts, sols };
}

test('étage : les tableaux et la décoration du jardin s\'y posent ; les stations, le frigo, la boîte restent au sol', () => {
  for (const t of ['meuble_tableau_1', 'meuble_tableau_2', 'meuble_tableau_3', ...DECOR_ETAGE]) assert(ETAGE_BLOCS.includes(t), t);
  for (const t of ['four', 'cuisiniere', 'refrigerateur', 'boite_nourriture', 'meule', 'ruche', 'puits', 'atelier']) assert(!ETAGE_BLOCS.includes(t), t);
  const { s, sols } = etage();
  for (const sorte of ['four', 'refrigerateur', 'boite_nourriture']) {
    addItem(s, B[sorte].objet, 1);
    const st = poseEtageStatus(s, sorte, sols[0]);
    assert(!st.ok && /il sert en bas, où la famille cuisine et mange/.test(st.raison), `${sorte} : ${st.raison}`);
  }
  // chaque décoration se pose à l'étage, et se reprend
  for (const sorte of DECOR_ETAGE) {
    addItem(s, B[sorte].objet, 1);
    const r = poserEtage(s, sorte, sols[3]);
    assert(r.ok, `${sorte} : ${r.error}`);
    if (B[sorte].tourne) assert(tournerEtage(s, sols[3]).ok, `${sorte} tourne`);
    assert(reprendreEtage(s, sols[3]).ok);
  }
});

test('étage : un tableau s\'accroche sur un mur de l\'étage (un seul), se reprend avant le mur, revient si le mur s\'en va', () => {
  const { s, hauts, sols } = etage();
  addItem(s, B.meuble_tableau_1.objet, 2);
  addItem(s, B.mur_pierre.objet, 2);
  // pas par terre ; sur un mur du bas rehaussé, oui ; un seul par mur
  assertEqual(poseEtageStatus(s, 'meuble_tableau_1', sols[0]).ok, false);
  const m = hauts[0];
  assert(murEtage(s, m));
  assertEqual(poserEtage(s, 'meuble_tableau_1', m).ok, true);
  assertEqual(dessusEtage(s)[m], 'meuble_tableau_1');
  assertEqual(poseEtageStatus(s, 'meuble_tableau_1', m).ok, false, 'déjà un tableau');
  assertEqual(tournerEtage(s, m).ok, false);
  assert(/accroché au mur, il suit le mur/.test(tournerEtage(s, m).error));
  // sur un mur posé à l'étage
  assert(poserEtage(s, 'mur_pierre', sols[0]).ok);
  assert(poserEtage(s, 'meuble_tableau_1', sols[0]).ok);
  assertEqual(poseEtageStatus(s, 'porte', sols[0]).ok, false, 'un tableau y pend : on ne change pas le mur');
  // un appui reprend le tableau d'abord, puis le mur
  const n = countItem(s, B.meuble_tableau_1.objet);
  assertEqual([reprendreEtage(s, sols[0]).sorte, countItem(s, B.meuble_tableau_1.objet)], ['meuble_tableau_1', n + 1]);
  assertEqual([reprendreEtage(s, sols[0]).sorte, etageBlocs(s)[sols[0]]], ['mur_pierre', undefined]);
  // le mur du bas abaissé sous l'étage : le tableau revient dans l'inventaire (rangerEtage)
  const avant = countItem(s, B.meuble_tableau_1.objet);
  assert(reprendreBloc(s, m).ok, 'le bloc du dessus du mur rehaussé');
  rangerEtage(s);
  assertEqual([dessusEtage(s)[m], countItem(s, B.meuble_tableau_1.objet)], [undefined, avant + 1]);
});

test('étage : les commandes d\'un tableau (poser, reprendre) se défont et retrouvent la partie', () => {
  const { s, hauts } = etage();
  addItem(s, B.meuble_tableau_2.objet, 1);
  const e0 = empreintePartie(s), m = hauts[1];
  const p = executerCommande(s, { id: 'p', type: 'etage.poser', args: { sorte: 'meuble_tableau_2', case: m } });
  assertEqual([p.ok, p.inverses[0]], [true, { type: 'etage.reprendre', args: { case: m, attendu: 'meuble_tableau_2' } }]);
  const e1 = empreintePartie(s);
  const r = executerCommande(s, { id: 'r', type: 'etage.reprendre', args: { case: m } });
  assertEqual([r.ok, r.sorte, etageBlocs(s)[m] === undefined || !!etageBlocs(s)[m]], [true, 'meuble_tableau_2', true]);
  assertEqual(defaire(s, r.inverses), 1);
  assertEqual(empreintePartie(s), e1);
  assertEqual(defaire(s, p.inverses), 1);
  assertEqual(empreintePartie(s), e0);
});

test('étage : ce qui y est posé compte dans le style de la ferme (pas dans le coin du repas, au sol)', () => {
  const { s, hauts, sols } = etage();
  const avant = decorFerme(s), autour = decorAutour(s, sols[2]);
  // la jarre aux coquillages et le bac de lavande : du style côtier et fleuri
  const style = (sorte) => Object.entries(DATA.STYLES.LISTE).find(([, st]) => st.blocs.includes(sorte));
  const [cotier] = style('jarre_coquillages') || [];
  assert(cotier, 'la jarre a un style');
  for (const sorte of ['jarre_coquillages']) { addItem(s, B[sorte].objet, 1); assert(poserEtage(s, sorte, sols[2]).ok); }
  const apres = decorFerme(s);
  const avaitDeja = Object.values(s.blocs).includes('jarre_coquillages');
  assertEqual(apres[cotier] || 0, (avant[cotier] || 0) + (avaitDeja ? 0 : 1), 'une sorte de plus dans son style');
  assertEqual(decorAutour(s, sols[2]), autour, 'le coin d\'une table du bas ne compte pas l\'étage');
});
