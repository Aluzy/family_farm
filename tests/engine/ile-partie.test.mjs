/* ==========================================================================
   Tests du moteur : la partie sur l'île de 300 × 300 (js/engine/ile/jeu.js ; docs/ile-300.md, étape 7a).
   Une partie neuve s'installe sur l'île (C17 : l'île devient la
   ferme ; C18 : rien de bâti, une tente à poser ; C19 : pas de jeu en ligne) ; le terrain de la ferme vient
   de l'île et suit ses changements ; l'île se garde dans la partie et s'y relit ; la tente posée fait dormir
   la famille.
   Lancer seul : node --test tests/engine/ile-partie.test.mjs (ou node tests/run-tests.mjs ile-partie).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import { couchages, nuitCouchee, poserBloc } from '../../js/engine/blocs.js';
import { createNewGame } from '../../js/engine/depart.js';
import { countItem } from '../../js/engine/inventory.js';
import { farmTerrain } from '../../js/engine/terrain.js';
import { ILE, indice, recolter, SOL, verifierIle } from '../../js/engine/ile.js';
import { enLigneOuvert, estPartieIle, garderIle, ileDeLaPartie, terrainDeLIle } from '../../js/engine/ile/jeu.js';

const N = ILE.TAILLE;
const DEPART = indice(ILE.APPARITION.x, ILE.APPARITION.y);
const lettre = (T, t) => T.LIGNES[Math.floor(t / T.LARGEUR)][t % T.LARGEUR];

test('une partie neuve sur l’île : l’île, le personnage au point d’apparition, rien de bâti, une tente, pas en ligne', () => {
  const s = createNewGame(7);
  assert.equal(estPartieIle(s), true);
  assert.deepEqual(verifierIle(ileDeLaPartie(s)), []);
  assert.equal(s.monde.ici, DEPART);
  assert.deepEqual(s.blocs, {});
  assert.deepEqual(s.potager.parcelles, []);
  assert.equal(countItem(s, 'tente'), DATA.ILE.PARTIE.INVENTAIRE.tente);
  assert.equal(enLigneOuvert(s), false);
  // la même graine, la même île
  assert.deepEqual(ileDeLaPartie(createNewGame(7)).objet, ileDeLaPartie(s).objet);
  assert.notDeepEqual(ileDeLaPartie(createNewGame(8)).objet, ileDeLaPartie(s).objet);
});

test('le terrain de la ferme est l’île entière (C17) : sa terre libre, ses cases prises, son eau', () => {
  const s = createNewGame(7);
  const T = farmTerrain(s);
  assert.equal(T, terrainDeLIle(s));
  assert.deepEqual([T.LARGEUR, T.HAUTEUR, T.LIGNES.length, T.LIGNES[0].length], [N, N, N, N]);
  assert.deepEqual(T.FERME, { X: 0, Y: 0, LARGEUR: N, HAUTEUR: N });
  const ile = ileDeLaPartie(s);
  for (let t = 0; t < N * N; t++) {
    const eau = ile.sol[t] === SOL.eau_profonde || ile.sol[t] === SOL.eau || ile.sol[t] === SOL.eau_basse;
    const attendu = eau ? '.' : ile.objet[t] || ile.bloque[t] ? 'o' : '#';
    if (lettre(T, t) !== attendu && !(attendu === '#' && lettre(T, t) === '.')) assert.fail(`case ${t}`);
  }
  assert.equal(lettre(T, DEPART), '#');
  assert.equal(farmTerrain(s), T, 'gardé tant que l’île ne change pas');
});

test('le terrain suit l’île : une plante cueillie libère sa case', () => {
  const s = createNewGame(7);
  const ile = ileDeLaPartie(s);
  const ble = [...ile.objet.keys()].find((t) => ile.objet[t] && ile.etat[t] === 6 && lettre(farmTerrain(s), t) === 'o');
  assert.ok(ble !== undefined);
  const T0 = farmTerrain(s);
  const r = recolter(ile, ble, 1);
  if (r.ok && !ile.objet[ble]) {
    const T1 = farmTerrain(s);
    assert.notEqual(T1, T0);
    assert.equal(lettre(T1, ble), '#');
  }
});

test('l’île se garde dans la partie et s’y relit (JSON compris)', () => {
  const s = createNewGame(7);
  const ile = ileDeLaPartie(s);
  ile.etat[DEPART] = 0;
  garderIle(s);
  const relue = JSON.parse(JSON.stringify(s));
  assert.equal(estPartieIle(relue), true);
  assert.deepEqual(ileDeLaPartie(relue).objet, ile.objet);
  assert.deepEqual(ileDeLaPartie(relue).sol, ile.sol);
  assert.ok(JSON.stringify(relue.ile).length < 150 * 1024);
});

test('la tente posée au sol fait dormir la famille (C18)', () => {
  const s = createNewGame(7);
  assert.equal(nuitCouchee(s), false, 'sans tente posée, pas de couchage');
  const r = poserBloc(s, 'tente', DEPART + 2);
  assert.equal(r.ok, true, r.error);
  assert.equal(countItem(s, 'tente'), 0);
  assert.equal(couchages(s).length, DATA.ILE.PARTIE.TENTE.places);
  assert.equal(nuitCouchee(s), true);
});
