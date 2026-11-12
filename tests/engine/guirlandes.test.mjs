// Les guirlandes lumineuses de la boutique de gemmes : un lot de 8 segments, posés comme les rosiers grimpants
// sur la face extérieure d'un mur (côté jardin), jamais dans une pièce ; repris, le segment revient.
import {
  addItem, blocsDessusPoses, countItem, DATA, farmTerrain, pieceDe, poserBloc, poseStatus, reprendreBloc,
  testFarmMap, testFermeConstruite,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const COLORIS = ['blanche', 'multicolore', 'etoiles', 'coeurs'];

test('guirlandes : quatre coloris de la boutique, un lot de 8 segments, à poser sur un mur', () => {
  for (const c of COLORIS) {
    const b = DATA.ATELIER.BLOCS['guirlande_' + c], o = DATA.OBJETS['guirlande_' + c];
    assert(b && b.sur === 'mur' && b.guirlande === c, `${c} : un bloc sur mur`);
    assert(o && o.boutique && o.invendable && o.lot === 8, `${c} : un objet de la boutique, en lot de 8`);
  }
  assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes('guirlande_etoiles'), 'dans l\'onglet Jardin');
});

test('guirlandes : sur la face extérieure d\'un mur, pas dans une pièce ; reprise, elle revient dans l\'inventaire', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  const W = farmTerrain(s).LARGEUR, B = s.blocs;
  const murs = Object.keys(B).map(Number).filter((t) => DATA.ATELIER.BLOCS[B[t]] && DATA.ATELIER.BLOCS[B[t]].mur && !blocsDessusPoses(s)[t]);
  const dehors = murs.find((t) => !B[t + W] && !pieceDe(s, t + W));
  const dedans = murs.find((t) => !B[t + W] && pieceDe(s, t + W));
  assert(dehors !== undefined && dedans !== undefined, 'un mur de façade, un mur du fond d\'une pièce');
  assert(!poseStatus(s, 'guirlande_coeurs', dehors).ok, 'sans guirlande en main : refusé');
  addItem(s, 'guirlande_coeurs', 8);
  const r0 = poseStatus(s, 'guirlande_coeurs', dedans);
  assert(!r0.ok && /extérieure/.test(r0.raison), 'dans une pièce : refusé');
  const r = poserBloc(s, 'guirlande_coeurs', dehors);
  assert(r.ok, r.error);
  assertEqual(blocsDessusPoses(s)[dehors], 'guirlande_coeurs');
  assertEqual(countItem(s, 'guirlande_coeurs'), 7, 'un segment posé');
  assert(!poseStatus(s, 'guirlande_coeurs', dehors).ok, 'déjà quelque chose dessus');
  assert(reprendreBloc(s, dehors).ok);
  assertEqual(countItem(s, 'guirlande_coeurs'), 8, 'repris : il revient');
});
