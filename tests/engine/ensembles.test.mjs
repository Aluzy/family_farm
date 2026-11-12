// Les ensembles à thème de la boutique de gemmes : l'ensemble (DATA.OBJETS[].contenu) et chacun de ses objets, qui
// s'achètent aussi seuls. Le chalet de montagne : un lit (un couchage, comme le lit adulte), un chevet à lampe, un
// tapis, un tableau à accrocher, un plancher (24 lames), un papier peint ; ils se posent dans une chambre.
import { addItem, blocAt, countItem, couchages, DATA, executerCommande, motifsPapier, papierDebloque, piecesCloses, poserBloc, poseStatus, solAt, testFarmMap, testFermeConstruite, tourneBloc } from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const CONTENU = { chalet_lit: 1, chalet_chevet: 1, chalet_tapis: 1, chalet_tableau: 1, sol_meleze: 24, papier_peint_lambris: 1 };

test('ensembles : le bord de mer, même composition', () => {
  const E = DATA.OBJETS.ensemble_mer;
  assertEqual(E.contenu, { mer_lit: 1, mer_chevet: 1, mer_tapis: 1, mer_tableau: 1, sol_flotte: 24, papier_peint_vagues: 1 });
  for (const k of Object.keys(E.contenu)) assert(DATA.OBJETS[k] && DATA.OBJETS[k].boutique, k);
  assert(DATA.ATELIER.BLOCS.mer_lit.lit && tourneBloc('mer_lit') && tourneBloc('mer_chevet') && tourneBloc('mer_tapis'), 'ce qui tourne');
  assert(motifsPapier().includes('vagues') && DATA.ATELIER.BLOCS.sol_flotte.sol, 'le papier, le sol');
});

test('ensembles : le cottage anglais, même composition que le chalet', () => {
  const E = DATA.OBJETS.ensemble_cottage;
  assertEqual(E.contenu, { cottage_lit: 1, cottage_chevet: 1, cottage_tapis: 1, cottage_tableau: 1, sol_blanchi: 24, papier_peint_roses: 1 });
  for (const k of Object.keys(E.contenu)) assert(DATA.OBJETS[k] && DATA.OBJETS[k].boutique, k);
  assert(DATA.ATELIER.BLOCS.cottage_lit.lit && tourneBloc('cottage_lit') && tourneBloc('cottage_chevet') && tourneBloc('cottage_tapis'), 'ce qui tourne');
  assert(motifsPapier().includes('roses') && DATA.ATELIER.BLOCS.sol_blanchi.sol, 'le papier, le sol');
});

test('ensembles : le chalet de montagne réunit six objets de la boutique, chacun un bloc ou un papier peint', () => {
  const E = DATA.OBJETS.ensemble_chalet;
  assert(E && E.boutique && E.invendable, 'l\'ensemble');
  assertEqual(E.contenu, CONTENU);
  for (const k of Object.keys(CONTENU)) assert(DATA.OBJETS[k] && DATA.OBJETS[k].boutique, `${k} : un objet de la boutique`);
  assertEqual(DATA.OBJETS.sol_meleze.lot, 24, 'le plancher : 24 lames');
  assert(motifsPapier().includes('lambris') && DATA.PAPIERS_PEINTS.lambris.objet === 'papier_peint_lambris', 'le lambris');
  const B = DATA.ATELIER.BLOCS;
  assert(B.chalet_lit.lit && B.chalet_lit.piece === 'chambre' && tourneBloc('chalet_lit'), 'le lit : un couchage qui tourne');
  assert(tourneBloc('chalet_chevet') && tourneBloc('chalet_tapis') && !tourneBloc('chalet_tableau'), 'ce qui tourne');
  assert(B.sol_meleze.sol && !B.sol_meleze.dehors, 'un sol d\'intérieur');
});

test('ensembles : dans une chambre, le plancher, le lit (un couchage de plus), le chevet ; le lambris débloqué', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const [k, n] of Object.entries(CONTENU)) addItem(s, k, n);
  const n0 = couchages(s);
  const p = piecesCloses(s)[0];
  const sol = p.cases.find((c) => !blocAt(s, c) && poseStatus(s, 'sol_meleze', c).ok);
  assert(sol !== undefined, 'une case pour le plancher');
  assert(poserBloc(s, 'sol_meleze', sol).ok);
  assertEqual(solAt(s, sol), 'sol_meleze');
  assertEqual(countItem(s, 'sol_meleze'), 23);
  let lit = null;
  for (const q of piecesCloses(s)) for (const c of q.cases) if (lit === null && poseStatus(s, 'chalet_lit', c).ok) lit = c;
  assert(lit !== null, 'une place pour le lit');
  assert(poserBloc(s, 'chalet_lit', lit).ok);
  assert(couchages(s).includes(lit) && !n0.includes(lit), 'le lit : un couchage');
  assert(papierDebloque(s, 'lambris'), 'le lambris : débloqué');
  const r = executerCommande(s, { type: 'piece.tapisser', args: { case: p.cases[0], motif: 'lambris', niveau: 0 } });
  assert(r.ok || /mur plein/.test(r.error), r.error);
});
