/* ==========================================================================
   Tests du moteur : le galop du cheval (js/engine/cheval.js ; DATA.CHEVAL.GALOP).
   - la sacoche, fabriquée à l'Atelier (une fois, avec un cheval) : 5 places ;
   - la remplir de pommes (ou de pommes dorées), reprendre les entières ;
   - en selle, un appui lance le galop (×2, ×2,5 la pomme dorée), un autre l'arrête ;
   - elle se mange en avançant (30 s, 10 min), la suivante prend le relais, vide : le pas ;
   - descendu : le pas, la pomme entamée garde son reste ; la pomme dorée au four.
   Lancer seul : node tests/run-tests.mjs galop.
   ========================================================================== */

import { assert, assertEqual, atelier, reach, setInv, tireless, test } from './aide.mjs';
import {
  avancerGalop, basculerGalop, buildAtelier, countItem, craft, craftStatus, DATA, descendreCheval, friandiseGalop,
  monterCheval, remplirSacoche, reprendreSacoche, sacocheCheval, vitesseCheval,
} from '../../js/engine/index.js';

const G = DATA.CHEVAL.GALOP;
function aCheval() {
  const s = reach(atelier(), 'ecurie');
  tireless(s);
  setInv(s, { bois: 3, pierre: 3 });
  buildAtelier(s);
  s.cheval = { monte: false, nourri: true, attache: null };
  return s;
}

test('la sacoche : à l\'Atelier, une fois, avec un cheval ; 5 places vides', () => {
  const s = aCheval();
  setInv(s, { fibre: 12, planche: 4 });
  assertEqual(sacocheCheval(s), null);
  const r = craft(s, 'sacoche_cheval');
  assert(r.ok, r.error);
  assertEqual([sacocheCheval(s), countItem(s, 'fibre'), countItem(s, 'planche')], [[null, null, null, null, null], 6, 2]);
  assertEqual(craftStatus(s, 'sacoche_cheval').ok, false, 'déjà une sacoche');
  s.cheval = null;
  assertEqual(craftStatus(s, 'sacoche_cheval').ok, false, 'pas de cheval');
});

test('remplir, reprendre : les pommes de l\'inventaire, les entières reviennent', () => {
  const s = aCheval();
  assertEqual(remplirSacoche(s).ok, false, 'pas de sacoche');
  s.cheval.sacoche = [null, null, null, null, null];
  setInv(s, { pomme: 3, pomme_doree: 4 });
  assert(remplirSacoche(s, 'pomme').ok);
  assert(remplirSacoche(s, 'pomme_doree').ok);
  assertEqual([sacocheCheval(s).map((p) => p && p.sorte), countItem(s, 'pomme'), countItem(s, 'pomme_doree')], [['pomme', 'pomme', 'pomme', 'pomme_doree', 'pomme_doree'], 0, 2]);
  assertEqual(remplirSacoche(s, 'pomme_doree').ok, false, 'pleine');
  assertEqual(remplirSacoche(s, 'carotte').ok, false, 'seulement des pommes');
  s.cheval.sacoche[0].reste = 0.4;
  const r = reprendreSacoche(s);
  assertEqual([r.items, countItem(s, 'pomme'), countItem(s, 'pomme_doree'), sacocheCheval(s)[0]], [{ pomme: 2, pomme_doree: 2 }, 2, 4, { sorte: 'pomme', reste: 0.4 }]);
});

test('le galop : un appui le lance (×2), un autre l\'arrête ; seulement en selle', () => {
  const s = aCheval();
  s.cheval.sacoche = [{ sorte: 'pomme', reste: 1 }, null, { sorte: 'pomme_doree', reste: 1 }, null, null];
  assertEqual(basculerGalop(s, 0).ok, false, 'pas en selle');
  assert(monterCheval(s).ok);
  assertEqual(vitesseCheval(s), DATA.CHEVAL.VITESSE);
  assertEqual(basculerGalop(s, 1).ok, false, 'place vide');
  assert(basculerGalop(s, 0).ok);
  assertEqual([vitesseCheval(s), friandiseGalop(s).sorte], [2, 'pomme']);
  assert(basculerGalop(s, 2).ok);
  assertEqual(vitesseCheval(s), 2.5, 'la pomme dorée');
  assert(basculerGalop(s, 2).ok);
  assertEqual([vitesseCheval(s), s.cheval.galop], [DATA.CHEVAL.VITESSE, null], 'retouchée : le pas');
});

test('elle se mange en avançant : 30 s la pomme, puis la suivante ; vide, le pas', () => {
  const s = aCheval();
  s.cheval.sacoche = [null, { sorte: 'pomme', reste: 1 }, null, { sorte: 'pomme', reste: 1 }, null];
  monterCheval(s);
  basculerGalop(s, 3);
  avancerGalop(s, 15000);
  assertEqual(sacocheCheval(s)[3], { sorte: 'pomme', reste: 0.5 });
  // (finie : la suivante, depuis la gauche ; le reste du temps passe sur elle)
  const r = avancerGalop(s, 21000);
  assertEqual([r.finies, r.galop, sacocheCheval(s)[3], sacocheCheval(s)[1].reste.toFixed(2)], [1, 1, null, '0.80']);
  const fin = avancerGalop(s, 60000);
  assertEqual([fin.finies, fin.galop, vitesseCheval(s), sacocheCheval(s).every((p) => !p)], [1, null, DATA.CHEVAL.VITESSE, true]);
  // la pomme dorée : dix minutes
  s.cheval.sacoche[0] = { sorte: 'pomme_doree', reste: 1 };
  basculerGalop(s, 0);
  avancerGalop(s, 5 * 60 * 1000);
  assertEqual(sacocheCheval(s)[0].reste, 0.5);
  assertEqual(G.FRIANDISES.pomme_doree.secondes, 600);
});

test('descendu : le pas, la pomme entamée garde son reste', () => {
  const s = aCheval();
  s.cheval.sacoche = [{ sorte: 'pomme', reste: 1 }, null, null, null, null];
  monterCheval(s);
  basculerGalop(s, 0);
  avancerGalop(s, 6000);
  assert(descendreCheval(s).ok);
  assertEqual([s.cheval.galop, sacocheCheval(s)[0].reste.toFixed(2)], [null, '0.80']);
  monterCheval(s);
  assertEqual([vitesseCheval(s), avancerGalop(s, 5000).galop, sacocheCheval(s)[0].reste.toFixed(2)], [DATA.CHEVAL.VITESSE, null, '0.80']);
});

test('la pomme dorée : au four, une pomme et cinq lingots d\'or', () => {
  const R = DATA.RECETTES.pomme_doree;
  assertEqual([R.station, R.sortie, R.ingredients], ['four', 'pomme_doree', [{ item: 'pomme', qte: 1 }, { item: 'lingot_or', qte: 5 }]]);
  assertEqual(DATA.OBJETS.pomme_doree.mangeable, false);
});
