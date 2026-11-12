// Les cheminées de la boutique de gemmes : un meuble de deux cases, posé dans une pièce close de la maison
// (pas dehors) ; repris, il revient dans l'inventaire.
import { addItem, blocsPoses, countItem, DATA, empriseMeuble, piecesCloses, poserBloc, poseStatus, reprendreBloc, testFarmMap, testFermeConstruite } from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

test('cheminées : trois matières de la boutique, un meuble de deux cases', () => {
  for (const m of ['pierre', 'briques', 'marbre']) {
    const b = DATA.ATELIER.BLOCS['cheminee_' + m], o = DATA.OBJETS['cheminee_' + m];
    assert(b && b.meuble === 'cheminee_' + m && b.dedans && b.largeur === 2 && b.cheminee, `${m} : le bloc`);
    assert(o && o.boutique && o.invendable, `${m} : l'objet de la boutique`);
  }
});

test('cheminées : dans une pièce close, pas dehors ; reprise, elle revient', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  assert(!poseStatus(s, 'cheminee_briques', piecesCloses(s)[0].cases[0]).ok, 'sans cheminée en main : refusé');
  addItem(s, 'cheminee_briques', 1);
  const B = blocsPoses(s);
  let pose = null;
  for (const p of piecesCloses(s)) for (const c of p.cases) if (!pose && poseStatus(s, 'cheminee_briques', c).ok) pose = c;
  assert(pose !== null, 'une place dans une pièce');
  const r = poserBloc(s, 'cheminee_briques', pose);
  assert(r.ok, r.error);
  assertEqual(empriseMeuble(s, 'cheminee_briques', pose).length, 2, 'deux cases');
  assertEqual(countItem(s, 'cheminee_briques'), 0);
  addItem(s, 'cheminee_briques', 1);
  const dehors = Object.keys(B).length && [...Array(4000).keys()].find((c) => !piecesCloses(s).some((p) => p.cases.includes(c)) && !blocsPoses(s)[c] && !blocsPoses(s)[c + 1]);
  assert(!poseStatus(s, 'cheminee_briques', dehors).ok, 'dehors : refusé');
  assert(reprendreBloc(s, pose).ok);
  assertEqual(countItem(s, 'cheminee_briques'), 2, 'reprise : elle revient');
});
