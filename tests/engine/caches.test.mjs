/* ==========================================================================
   Tests du moteur : les calculs gardés en mémoire pour les grosses parties (docs/perf.md).
   - L'emprise de l'étage, celle du niveau 2, les pièces d'un niveau (js/engine/etage.js) : gardées
     tant que les pièces closes, les blocs de l'étage, les hauteurs des murs n'ont pas changé ; elles
     suivent la partie dès qu'ils changent.
   - Les découvertes de l'Encyclopédie (js/engine/decouverte.js) : les objets posés relevés une fois
     par mise à jour ; le résultat est le même que sans.
   Lancer seul : node --test tests/engine/caches.test.mjs (ou node tests/run-tests.mjs caches).
   ========================================================================== */

import {
  addItem, blocsPoses, CATEGORIES, conditionRemplie, DATA, etage2Emprise, etageBlocs, etageEmprise, hauteurPile,
  levelCount, piecesCloses, piecesNiveau, poserBloc, rehausser, reprendreBloc, reprendreEtage, testBatir,
  testFarmMap, testFermeConstruite, testSetLevel,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

test('caches : l\'emprise de l\'étage suit l\'escalier (repris, reposé), sans être recalculée entre-temps', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  const e1 = etageEmprise(s);
  assert(e1.size > 0);
  assert(etageEmprise(s) === e1, 'la même partie : la même emprise, gardée');
  // l'étage de la maison vidé, son escalier repris : plus d'étage là
  for (const t of Object.keys(etageBlocs(s)).map(Number)) assert(reprendreEtage(s, t).ok);
  const esc = Object.entries(blocsPoses(s)).filter(([, k]) => k === 'escalier').map(([t]) => Number(t));
  assert(esc.length >= 1);
  const r = reprendreBloc(s, esc[0]);
  assert(r.ok, r.error);
  const e2 = etageEmprise(s);
  assert(e2.size < e1.size && !e2.has(esc[0]), 'l\'escalier repris : son étage n\'y est plus');
  assert(poserBloc(s, 'escalier', esc[0]).ok);
  assertEqual([...etageEmprise(s)].sort((a, b) => a - b), [...e1].sort((a, b) => a - b), 'reposé : la même emprise qu\'avant');
  assertEqual(etage2Emprise(s).size, 0, 'pas d\'escalier à l\'étage : pas de niveau 2');
});

test('caches : les pièces du niveau 1 suivent les hauteurs des murs (un mur rehaussé)', () => {
  const s = garden();
  testFarmMap(s, 'caches');
  testSetLevel(s, levelCount());
  const b = testBatir(s, 'foyer');
  assert(b.ok, b.error);
  const avant = piecesNiveau(s, 1).length;
  assert(piecesNiveau(s, 1) === piecesNiveau(s, 1), 'gardées');
  // tout le pourtour du foyer rehaussé d'un bloc : il monte au niveau 1
  const piece = piecesCloses(s).find((p) => p.cases.includes(b.coin + 644 + 1));
  assert(piece, 'le foyer est une pièce close');
  const B = blocsPoses(s), bord = new Set();
  for (const t of piece.cases) for (const d of [-645, -644, -643, -1, 1, 643, 644, 645]) if (DATA.ATELIER.BLOCS[B[t + d]] && DATA.ATELIER.BLOCS[B[t + d]].ferme) bord.add(t + d);
  // (la porte aussi : un mur plein posé au-dessus ; la dernière, pour voir qu'avant elle le foyer ne monte pas)
  const porte = [...bord].find((t) => B[t] === 'porte');
  assert(porte !== undefined, 'le foyer a une porte');
  for (const t of bord) {
    if (t === porte) continue;
    addItem(s, DATA.ATELIER.BLOCS[B[t]].objet, 1);
    assert(rehausser(s, B[t], t).ok, `mur ${t}`);
  }
  const liste = piecesCloses(s);
  assertEqual(piecesNiveau(s, 1).length, avant, 'la porte pas rehaussée : il ne monte pas');
  addItem(s, DATA.ATELIER.BLOCS.mur_pierre.objet, 1);
  assert(rehausser(s, 'mur_pierre', porte).ok);
  assert(piecesCloses(s) === liste, 'les mêmes pièces closes (seules les hauteurs ont changé)');
  assertEqual(piecesNiveau(s, 1).length, avant + 1, 'tout le pourtour rehaussé : le foyer monte au niveau 1');
  assert(hauteurPile(s, porte) >= 2);
});

test('caches : les découvertes de l\'Encyclopédie, avec ou sans le relevé des objets posés, sont les mêmes', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  const memo = {};
  let n = 0;
  for (const c of CATEGORIES) {
    for (const e of c.entrees) {
      for (const cond of e.decouverte) {
        n += 1;
        assertEqual(conditionRemplie(s, cond, {}, memo), conditionRemplie(s, cond, {}), `${e.id} : ${cond}`);
      }
    }
  }
  assert(n > 50 && memo.poses && memo.poses.size > 10, `${n} conditions`);
});
