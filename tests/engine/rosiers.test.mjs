/* ==========================================================================
   Tests du moteur : les rosiers grimpants (achetés en gemmes, la boutique du jeu en ligne).
   - ils s'obtiennent seulement par la boutique (objets « boutique », invendables) : 4 coloris, un bloc chacun ;
   - sans rosier en main : refusé, avec le moyen d'en avoir ;
   - posés sur un mur (comme un tableau, sur sa face), et seulement côté jardin : pas sur l'herbe, pas sur un mur
     dont la face donne dans une pièce close ;
   - reprendre le rosier le rend à l'inventaire, le mur reste.
   Lancer seul : node tests/run-tests.mjs rosiers.
   ========================================================================== */

import { addItem, countItem, DATA, farmTerrain, testFarmMap, testFermeConstruite } from '../../js/engine/index.js';
import { blocAt, blocDessus, pieceDe, poseStatus, poserBloc, reprendreBloc } from '../../js/engine/blocs.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

function ferme() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  return s;
}
// la case d'un mur dont la face donne côté jardin, et celle d'un mur dont la face donne dans une pièce
function murs(s) {
  const W = farmTerrain(s).LARGEUR;
  let dehors = null, dedans = null;
  for (const [k, v] of Object.entries(s.blocs)) {
    const t = Number(k), b = DATA.ATELIER.BLOCS[v], sous = DATA.ATELIER.BLOCS[s.blocs[t + W]];
    if (!b || !b.mur || b.fenetre || (sous && sous.ferme)) continue;
    if (pieceDe(s, t + W)) dedans = dedans ?? t; else dehors = dehors ?? t;
  }
  return { dehors, dedans, W };
}

test('rosiers : 4 coloris, des objets de la boutique (invendables), un bloc « sur mur » chacun', () => {
  for (const c of ['multicolore', 'rouge', 'blanc', 'jaune']) {
    const o = DATA.OBJETS['rosier_' + c], b = DATA.ATELIER.BLOCS['rosier_' + c];
    assert(o && o.boutique === true && o.invendable === true, c);
    assertEqual([b.objet, b.sur, b.grimpant], ['rosier_' + c, 'mur', c]);
    assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes('rosier_' + c), 'dans l\'onglet Jardin');
  }
});

test('rosiers : posés sur la face d\'un mur côté jardin seulement ; repris, ils reviennent', () => {
  const s = ferme();
  const { dehors, dedans, W } = murs(s);
  assert(dehors !== null && dedans !== null, 'la ferme d\'essai a les deux sortes de murs');
  assert(/gemmes/.test(poseStatus(s, 'rosier_rouge', dehors).raison), 'sans rosier : acheté avec des gemmes');
  addItem(s, 'rosier_rouge', 1);
  assert(/côté jardin/.test(poseStatus(s, 'rosier_rouge', dedans).raison), 'pas dans une pièce');
  assert(/accrocher à un mur/.test(poseStatus(s, 'rosier_rouge', dehors + 10 * W).raison) || !poseStatus(s, 'rosier_rouge', dehors + 10 * W).ok, 'pas sur l\'herbe');
  const mur = blocAt(s, dehors);
  assert(poserBloc(s, 'rosier_rouge', dehors).ok);
  assertEqual([blocDessus(s, dehors), blocAt(s, dehors), countItem(s, 'rosier_rouge')], ['rosier_rouge', mur, 0]);
  assert(!poseStatus(s, 'rosier_rouge', dehors).ok, 'un seul par mur');
  const r = reprendreBloc(s, dehors);
  assert(r.ok, JSON.stringify(r));
  assertEqual([blocDessus(s, dehors) || null, blocAt(s, dehors), countItem(s, 'rosier_rouge')], [null, mur, 1]);
});
