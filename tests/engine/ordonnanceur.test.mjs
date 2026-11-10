/* ==========================================================================
   Tests de l'ordonnanceur de la scène (fiche 33 : js/carte/ordonnanceur.js).
   - les systèmes passent dans l'ordre de la table ;
   - un système à 10 Hz passe dix fois par seconde et reçoit le temps cumulé depuis son dernier pas ;
   - un système inactif ne fait rien et n'accumule pas de temps ;
   - les systèmes lents sont décalés (pas tous à la même image).
   Lancer seul : node tests/run-tests.mjs ordonnanceur.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const fenetre = { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1, localStorage: null, navigator: {} };
for (const f of ['kit.js', 'ordonnanceur.js']) new Function('window', readFileSync(new URL(`../../js/carte/${f}`, import.meta.url), 'utf8'))(fenetre);
const K = fenetre.CarteKit;

test('l\'ordre de la table, à chaque image', () => {
  const vu = [];
  const O = K.ordonnanceur([{ nom: 'a', pas: () => vu.push('a') }, { nom: 'b', cadence: 'image', pas: () => vu.push('b') }]);
  O.pas(0, 16, 16); O.pas(16, 16, 16);
  assertEqual(vu, ['a', 'b', 'a', 'b']);
});

test('10 Hz : dix pas par seconde, chacun avec le temps écoulé depuis le précédent', () => {
  const pas = [];
  const O = K.ordonnanceur([{ nom: 'lent', cadence: 10, pas: (I) => pas.push(I.delta) }]);
  for (let i = 0; i < 60; i++) O.pas(i * 1000 / 60, 1000 / 60, 1000 / 60);
  assert(pas.length >= 9 && pas.length <= 11, `${pas.length} pas en une seconde`);
  const total = pas.reduce((s, x) => s + x, 0);
  assert(total > 900 && total <= 1000.01, `temps reçu ${total.toFixed(1)} ms`);
  assert(pas.slice(1).every((d) => Math.abs(d - 100) < 17), `écarts ${pas.map((d) => d.toFixed(0)).join(',')}`);
});

test('inactif : rien, et pas de temps accumulé', () => {
  let actif = false; const pas = [];
  const O = K.ordonnanceur([{ nom: 'x', cadence: 'image', actif: () => actif, pas: (I) => pas.push(I.delta) }]);
  O.pas(0, 16, 16); O.pas(16, 16, 16);
  actif = true; O.pas(32, 16, 16);
  assertEqual(pas, [16]);
});

test('les systèmes lents sont décalés', () => {
  const premiers = {};
  const L = ['a', 'b', 'c', 'd'].map((nom) => ({ nom, cadence: 2, pas: () => { if (!(nom in premiers)) premiers[nom] = n; } }));
  const O = K.ordonnanceur(L);
  let n = 0;
  for (; n < 60; n++) O.pas(n * 16, 16, 16);
  assertEqual(Object.keys(premiers).length, 4);
  assert(new Set(Object.values(premiers)).size >= 3, `premières images ${JSON.stringify(premiers)}`);
});
