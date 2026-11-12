// Les décors des fêtes de la boutique de gemmes (Noël, Halloween, Pâques). Ceux de Noël (en vente en décembre : worker/src/boutique.mjs enVente) : le sapin
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

test('Halloween : la citrouille sculptée (une case) et le tas de citrouilles (deux cases), dehors, dans l\'onglet Jardin', () => {
  const B = DATA.ATELIER.BLOCS;
  assert(B.citrouille_halloween.dehors && B.citrouille_halloween.dessin === 'citrouille_halloween', 'la citrouille');
  assert(B.tas_citrouilles.dehors && B.tas_citrouilles.largeur === 2, 'le tas');
  for (const k of ['citrouille_halloween', 'tas_citrouilles']) assert(DATA.OBJETS[k].boutique && DATA.ATELIER.CATEGORIES.jardin.blocs.includes(k), k);
});

test('Pâques : le panier d\'œufs et l\'œuf géant, dehors, dans l\'onglet Jardin', () => {
  for (const k of ['panier_oeufs', 'oeuf_geant']) {
    const b = DATA.ATELIER.BLOCS[k];
    assert(b.dehors && b.dessin === k && DATA.OBJETS[k].boutique && DATA.ATELIER.CATEGORIES.jardin.blocs.includes(k), k);
  }
});
