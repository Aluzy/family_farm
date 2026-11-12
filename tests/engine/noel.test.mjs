// Les décors de Noël de la boutique de gemmes (en vente en décembre : worker/src/boutique.mjs enVente) : le sapin
// décoré (un meuble d'une case, dans une pièce ; ses guirlandes et sa lueur, la carte), la couronne (accrochée au mur),
// le bonhomme de neige (dehors).
import { DATA, tourneBloc } from '../../js/engine/index.js';
import { assert, test } from './aide.mjs';

test('Noël : le sapin dans une pièce (qui tourne en miroir), la couronne au mur, le bonhomme de neige dehors', () => {
  const B = DATA.ATELIER.BLOCS;
  assert(B.sapin_noel.meuble === 'sapin_noel' && B.sapin_noel.dedans && B.sapin_noel.piece === 'salon' && tourneBloc('sapin_noel'), 'le sapin');
  assert(B.couronne_noel.sur === 'mur' && B.couronne_noel.meuble === 'couronne_noel', 'la couronne');
  assert(B.bonhomme_neige.dehors && B.bonhomme_neige.dessin === 'bonhomme_neige' && DATA.ATELIER.CATEGORIES.jardin.blocs.includes('bonhomme_neige'), 'le bonhomme');
  for (const k of ['sapin_noel', 'couronne_noel', 'bonhomme_neige']) assert(DATA.OBJETS[k] && DATA.OBJETS[k].boutique && DATA.OBJETS[k].invendable, k);
});
