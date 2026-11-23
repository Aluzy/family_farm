/* ==========================================================================
   Tests du moteur : les graines de l'île (js/engine/ile/graines.js ; docs/ile-300.md). Ce que donne chaque plante
   coupée (le gland, la pomme de pin, une graine propre, celle de sa famille, la graine du potager) ; une chance sur
   deux à chaque coupe ; « Planter » depuis l'Inventaire, ni sur l'eau ni sur le sable ; graine plantée, pousse, puis
   la plante (une espèce de la famille au hasard : du biome, du sol ; l'herbe haute comprise) ; une roche cassée
   revient, sauf sous une construction.
   Lancer seul : node --test tests/engine/ile-graines.test.mjs (ou node tests/run-tests.mjs ile-graines).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, DATA, finishSetup, inventoryCounts, poserBloc, poseStatus } from '../../js/engine/index.js';
import { catalogue, SOLS } from '../../js/engine/ile.js';
import { aPlanter, HERBE_HAUTE, planteSemee, semenceDe } from '../../js/engine/ile/graines.js';
import { ileDeLaPartie } from '../../js/engine/ile/jeu.js';
import { nuit, recolter } from '../../js/engine/ile/vie.js';
import { recolterMonde } from '../../js/engine/monde-recolte.js';
import { addItem } from '../../js/engine/inventory.js';
import { sorteAPlanter } from '../../js/engine/plantation.js';

const G = DATA.ILE.GRAINES,
  cat = catalogue();
function partie() {
  const s = createNewGame(5);
  finishSetup(s);
  s.outils = { hache: true, faux: true, pioche: true };
  return s;
}

test('ce que donne chaque plante : le gland, la pomme de pin, sa graine, celle de sa famille, la graine du potager', () => {
  const d = (id) => semenceDe(cat.parId.get(id));
  assert.equal(d('feuillu'), 'gland');
  for (const c of ['sapin', 'pin_tordu', 'sapin_nain']) assert.equal(d(c), 'pomme_de_pin');
  for (const p of ['bouleau', 'saule', 'arbre_pre', 'chataignier', 'lavande', 'coquelicot', 'pommier_sauvage'])
    assert.equal(d(p), 'graine_ile_' + p);
  assert.equal(d('ronces'), 'graine_buisson');
  assert.equal(d('jonc'), 'graine_herbe');
  assert.equal(d('champignon_bleu'), 'spores_champignon');
  assert.equal(d('carotte_sauvage'), 'graine_carotte');
  assert.equal(d('souche'), null);
  // chaque graine de l'île : un objet, et « Planter » depuis l'Inventaire ; rien dans le mode Construire
  for (const objet of Object.keys(aPlanter())) {
    assert.ok(DATA.OBJETS[objet], objet);
    assert.ok(sorteAPlanter(objet), objet);
  }
  assert.equal(DATA.ATELIER.CATEGORIES.graines, undefined);
});

test('couper des arbres : une chance sur deux d’avoir leur graine', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    fi = [];
  for (const f of cat.fiches) fi[f.numero] = f;
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
    n = ['gland', 'pomme_de_pin', ...Object.keys(inv).filter((k) => k.startsWith('graine_ile_'))].reduce(
      (a, k) => a + (inv[k] || 0),
      0,
    );
  assert.ok(n >= arbres * 0.3 && n <= arbres * 0.7, `${n} graines pour ${arbres} arbres`);
});

test('planter depuis l’Inventaire : ni sur l’eau ni sur le sable ; graine plantée, pousse, puis la plante', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    n = ile.n;
  addItem(s, 'gland', 3);
  const sorte = sorteAPlanter('gland');
  const sable = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'sable' && !ile.objet[i] && i > n * 10);
  const eau = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'eau' && i > n * 10);
  assert.equal(poseStatus(s, sorte, sable).ok, false, 'pas sur le sable');
  assert.equal(poseStatus(s, sorte, eau).ok, false, 'pas sur l’eau');
  const t = s.monde.ici + 2;
  assert.ok(poserBloc(s, sorte, t).ok);
  assert.equal(inventoryCounts(s).gland, 2);
  assert.equal(ile.semis.get(t).stade, 0);
  assert.equal(poserBloc(s, sorte, t).ok, false, 'une graine par case');
  for (let j = s.day + 1; j <= s.day + G.NUITS[0]; j++) nuit(ile, j);
  assert.equal(ile.semis.get(t).stade, 1, 'la pousse');
  for (let j = s.day + G.NUITS[0] + 1; j <= s.day + G.NUITS[0] + G.NUITS[1]; j++) nuit(ile, j);
  assert.equal(ile.semis.has(t), false);
  assert.equal(ile.objet[t], cat.parId.get('feuillu').numero, 'le gland redonne un feuillu');
});

test('les graines d’une famille : une espèce du biome, du sol ; l’herbe haute pousse aussi d’une graine d’herbe', () => {
  const ile = ileDeLaPartie(partie()),
    n = ile.n;
  const surSol = (nom) => [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === nom && i > n * 10);
  const lande = surSol('lande');
  for (let j = 0; j < 20; j++) {
    const p = planteSemee(ile, lande, 'pomme_de_pin', j);
    assert.ok(['pin_tordu', 'sapin_nain'].includes(p), `sur la lande, un conifère de la lande (${p})`);
    const h = planteSemee(ile, lande, 'graine_herbe', j);
    assert.ok(h === HERBE_HAUTE || cat.parId.get(h).ou.some((o) => o.sol === 'lande'), h);
  }
  const vus = new Set();
  for (let j = 0; j < 60; j++) vus.add(planteSemee(ile, surSol('herbe'), 'graine_herbe', j));
  assert.ok(vus.has(HERBE_HAUTE), 'l’herbe haute en fait partie');
});

test('une roche cassée revient, mais pas sous une construction (elle attend qu’elle s’en aille)', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const f = cat.fiches.find((x) => x.famille === 'roche' && x.recolte && x.recolte.retour);
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

test('les spores : pas de pousse, le champignon est là la nuit suivante', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    t = s.monde.ici + 2;
  addItem(s, 'spores_champignon', 1);
  assert.ok(poserBloc(s, sorteAPlanter('spores_champignon'), t).ok);
  assert.equal(ile.semis.get(t).jour, s.day + 1);
  nuit(ile, s.day + 1);
  assert.equal(ile.semis.has(t), false);
  assert.equal(cat.fiches[ile.objet[t] - 1].famille, 'champignon');
});

test('le gland : un arbre clair dans une clairière, un feuillu ailleurs', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const clairiere = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'clairiere');
  const herbe = [...ile.sol.keys()].find((i) => SOLS[ile.sol[i]].nom === 'herbe');
  assert.equal(planteSemee(ile, clairiere, 'gland', 3), 'arbre_clair');
  assert.equal(planteSemee(ile, herbe, 'gland', 3), 'feuillu');
});
