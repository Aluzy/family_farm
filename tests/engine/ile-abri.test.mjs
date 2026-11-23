/* ==========================================================================
   Tests : l'abri de l'île (js/ui/abri-ile.js), que montrent la boussole et la carte de l'île : la maison (une pièce
   close avec des paillasses : sa porte), sinon la tente posée, sinon le point d'apparition.
   Lancer seul : node --test tests/engine/ile-abri.test.mjs
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, finishSetup } from '../../js/engine/index.js';
import { ileDeLaPartie } from '../../js/engine/ile/jeu.js';
import { farmTerrain } from '../../js/engine/terrain.js';
import { abriDeLIle } from '../../js/ui/abri-ile.js';

test('l’abri : le point d’arrivée, puis la tente, puis la maison', () => {
  const s = createNewGame(9);
  finishSetup(s);
  const ile = ileDeLaPartie(s),
    A = ile.apparition,
    W = farmTerrain(s).LARGEUR;
  assert.deepEqual(abriDeLIle(s), { case: A.y * ile.n + A.x, nom: 'Le point d’arrivée', icone: '🚩' });
  const tente = s.monde.ici + 3;
  s.blocs = { ...s.blocs, [tente]: 'tente' };
  assert.equal(abriDeLIle(s).case, tente);
  assert.equal(abriDeLIle(s).nom, 'La tente');
  // une pièce close de 8 × 7 cases au nord-ouest, la porte au milieu du mur du bas, une paillasse dedans
  const x0 = (s.monde.ici % W) - 20,
    y0 = Math.floor(s.monde.ici / W) - 20,
    anneau = [];
  for (let x = x0; x < x0 + 10; x++) anneau.push(y0 * W + x, (y0 + 8) * W + x);
  for (let y = y0 + 1; y < y0 + 8; y++) anneau.push(y * W + x0, y * W + x0 + 9);
  anneau.forEach((t, k) => (s.blocs[t] = k === 9 ? 'porte' : 'mur_pierre'));
  assert.equal(abriDeLIle(s).nom, 'La tente', 'une pièce sans paillasse n’est pas encore la maison');
  s.blocs[(y0 + 3) * W + x0 + 3] = 'paillasse';
  assert.deepEqual(abriDeLIle(s), { case: anneau[9], nom: 'La maison', icone: '🏠' });
});
