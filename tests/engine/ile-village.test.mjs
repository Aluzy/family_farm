/* ==========================================================================
   Tests du moteur : le village de l'île (js/engine/ile/village.js ; docs/ile-300.md, étapes E à H). La place (le
   panneau du village) fixe combien de villageois arrivent ; elle monte de niveau en pièces ; le comptoir du port se
   pose au bord de la mer, un seul ; le port ne commerce qu'une fois le village fondé.
   Lancer seul : node --test tests/engine/ile-village.test.mjs (ou node tests/run-tests.mjs ile-village).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, DATA, finishSetup } from '../../js/engine/index.js';
import { ileDeLaPartie } from '../../js/engine/ile/jeu.js';
import { BIOMES, SOL_BIOME } from '../../js/engine/ile/reglages.js';
import {
  capacitePlace,
  monterPlace,
  niveauPlace,
  refusArriveeIle,
  refusPoseIle,
  refusPortIle,
  villageFonde,
} from '../../js/engine/ile/village.js';
import { arriveeRefus, caseArrivee } from '../../js/engine/villageois.js';
import { portOuvert } from '../../js/engine/port.js';

const VI = DATA.ILE.VILLAGE;
function partie() {
  const s = createNewGame(9);
  finishSetup(s);
  return s;
}
const poser = (s, sorte, t) => {
  s.blocs = { ...(s.blocs || {}), [t]: sorte };
};

test("sans place, personne n'arrive ; la place posée, un premier villageois peut venir", () => {
  const s = partie();
  assert.equal(niveauPlace(s), 0);
  assert.match(refusArriveeIle(s, 5), /place du village/);
  assert.match(arriveeRefus(s), /place du village/);
  poser(s, VI.PLACE, s.monde.ici + 5);
  assert.equal(niveauPlace(s), 1);
  assert.equal(capacitePlace(s), VI.NIVEAUX[0].villageois);
  assert.equal(refusArriveeIle(s, 5), null);
  assert.equal(caseArrivee(s), s.monde.ici + 5, 'il arrive sur la place');
});

test('la place pleine refuse ; un niveau de plus, payé en pièces, en accueille plus', () => {
  const s = partie();
  poser(s, VI.PLACE, s.monde.ici + 5);
  s.villageois = [{ id: 'vg-1', arrive: 1 }];
  assert.match(refusArriveeIle(s, 9), /n'accueille que/);
  s.coins = VI.NIVEAUX[1].prix - 1;
  assert.equal(monterPlace(s).ok, false);
  s.coins = VI.NIVEAUX[1].prix + 10;
  const r = monterPlace(s);
  assert.ok(r.ok);
  assert.equal(s.coins, 10);
  assert.equal(niveauPlace(s), 2);
  assert.equal(refusArriveeIle(s, 9), null);
  assert.match(refusArriveeIle(s, 2), /toutes les/, 'au plus un nouveau venu par période');
});

test('le comptoir du port : au bord de la mer, un seul ; le port commerce le village fondé', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    n = ile.n;
  const mer = (i) => BIOMES[SOL_BIOME[ile.sol[i]]] === 'mer';
  let rive = -1;
  for (let i = n * 20; i < n * n - n * 20 && rive < 0; i++) if (!mer(i) && !mer(i + 1) && mer(i + n)) rive = i;
  assert.ok(rive > 0);
  assert.equal(refusPoseIle(s, VI.PORT, [s.monde.ici]) !== null, true, "pas au milieu de l'île");
  assert.equal(refusPoseIle(s, VI.PORT, [rive, rive + 1]), null);
  poser(s, VI.PORT, rive);
  assert.match(refusPoseIle(s, VI.PORT, [rive, rive + 1]), /qu'un port/);
  assert.match(refusPortIle(s), /village fondé/);
  assert.equal(portOuvert(s, null, { sansPresence: true }).ok, false);
  poser(s, VI.PLACE, s.monde.ici + 5);
  s.villageois = [{ id: 'vg-1', arrive: 1 }];
  assert.ok(villageFonde(s));
  assert.equal(refusPortIle(s), null);
});
