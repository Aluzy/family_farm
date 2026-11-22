/* ==========================================================================
   Tests du moteur : les graines de l'île (js/engine/ile/graines.js ; docs/ile-300.md). Une graine par plante ; une
   chance d'en avoir une à chaque coupe ; elle se plante n'importe où sauf sur l'eau et le sable (le nénuphar : sur
   l'eau) ; graine plantée, pousse, puis la plante ; une roche cassée revient, sauf sous une construction.
   Lancer seul : node --test tests/engine/ile-graines.test.mjs (ou node tests/run-tests.mjs ile-graines).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, DATA, finishSetup, inventoryCounts, poserBloc, poseStatus } from '../../js/engine/index.js';
import { catalogue, SOLS } from '../../js/engine/ile.js';
import { graineDe, numeroDe, plantesAGraine } from '../../js/engine/ile/graines.js';
import { ileDeLaPartie } from '../../js/engine/ile/jeu.js';
import { nuit, recolter } from '../../js/engine/ile/vie.js';
import { recolterMonde } from '../../js/engine/monde-recolte.js';
import { addItem } from '../../js/engine/inventory.js';

const G = DATA.ILE.GRAINES;
function partie() {
  const s = createNewGame(5);
  finishSetup(s);
  s.outils = { hache: true, faux: true, pioche: true };
  return s;
}

test('une graine par plante (ni décor ni roche) : son objet, son bloc dans l’onglet Graines', () => {
  const P = plantesAGraine();
  assert.ok(P.length > 50);
  assert.ok(P.every((f) => f.famille !== 'roche' && !G.EXCLUES.includes(f.id)));
  for (const f of P) {
    const id = graineDe(f.id);
    assert.ok(DATA.OBJETS[id] && DATA.OBJETS[id].nom, id);
    assert.equal(DATA.ATELIER.BLOCS[id].ileGraine, f.id);
    assert.ok(DATA.ATELIER.CATEGORIES.graines.blocs.includes(id));
  }
});

test('couper des arbres donne parfois leur graine (environ CHANCE %), plus de gland ni de pomme de pin', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    fi = [];
  for (const f of catalogue().fiches) fi[f.numero] = f;
  let arbres = 0;
  for (let i = 0; i < ile.objet.length && arbres < 60; i++) {
    const f = fi[ile.objet[i]];
    if (!f || f.famille !== 'arbre') continue;
    arbres++;
    const id = `${f.dessin.sorte}:${(i % ile.n) * 16 + 8},${Math.floor(i / ile.n) * 16 + 13}`;
    for (let k = 0; k < 10; k++) {
      s.stamina = s.energie = 1e9;
      const r = recolterMonde(s, id, {});
      assert.ok(r.ok, r.error);
      if (r.tombe || r.fini) break;
    }
  }
  const inv = inventoryCounts(s),
    n = Object.entries(inv)
      .filter(([k]) => k.startsWith('graine_ile_'))
      .reduce((a, [, v]) => a + v, 0);
  assert.ok(n >= arbres * 0.1 && n <= arbres * 0.6, `${n} graines pour ${arbres} arbres`);
  assert.ok(!inv.gland && !inv.pomme_de_pin);
});

test('planter : pas sur l’eau ni le sable ; graine plantée, pousse, puis la plante', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    n = ile.n;
  const g = graineDe('bouleau');
  addItem(s, g, 3);
  const sable = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'sable' && !ile.objet[i] && i > n * 10);
  const eau = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'eau' && i > n * 10);
  assert.equal(poseStatus(s, g, sable).ok, false, 'pas sur le sable');
  assert.equal(poseStatus(s, g, eau).ok, false, 'pas sur l’eau');
  const t = s.monde.ici + 2;
  const r = poserBloc(s, g, t);
  assert.ok(r.ok, r.error);
  assert.equal(inventoryCounts(s)[g], 2);
  assert.equal(ile.objet[t], 0);
  assert.deepEqual(ile.semis.get(t), { numero: numeroDe('bouleau'), stade: 0, jour: s.day + G.NUITS[0] });
  assert.equal(poserBloc(s, g, t).ok, false, 'une graine par case');
  for (let j = s.day + 1; j <= s.day + G.NUITS[0]; j++) nuit(ile, j);
  assert.equal(ile.semis.get(t).stade, 1, 'la pousse');
  for (let j = s.day + G.NUITS[0] + 1; j <= s.day + G.NUITS[0] + G.NUITS[1]; j++) nuit(ile, j);
  assert.equal(ile.semis.has(t), false);
  assert.equal(ile.objet[t], numeroDe('bouleau'), 'le bouleau');
});

test('une roche cassée revient, mais pas sous une construction (elle attend qu’elle s’en aille)', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const f = catalogue().fiches.find((x) => x.famille === 'roche' && x.recolte && x.recolte.retour);
  const i = [...ile.objet.keys()].find((k) => ile.objet[k] === f.numero);
  assert.ok(recolter(ile, i, 10).ok);
  const bati = new Set([i]);
  for (let j = 10; j <= 10 + f.recolte.retour[1]; j++) nuit(ile, j, undefined, { occupee: (c) => bati.has(c) });
  assert.equal(ile.objet[i], 0, 'sous la construction : pas de roche');
  assert.equal(ile.repousse.length, 1, 'elle attend');
  bati.clear();
  nuit(ile, 11 + f.recolte.retour[1]);
  assert.equal(ile.objet[i], f.numero, 'la construction partie, elle revient');
});
