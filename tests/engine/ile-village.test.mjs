/* ==========================================================================
   Tests du moteur : le village de l'île (js/engine/ile/village.js ; docs/ile-300.md, étapes E à H). La place (le
   panneau du village) fixe combien de villageois arrivent ; elle monte de niveau en pièces ; le comptoir du port se
   pose au bord de la mer, un seul ; le port ne commerce qu'une fois le village fondé.
   Lancer seul : node --test tests/engine/ile-village.test.mjs (ou node tests/run-tests.mjs ile-village).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addItem, createNewGame, DATA, finishSetup, poserBloc } from '../../js/engine/index.js';
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
import { economie } from '../../js/engine/ile/economie.js';
import { arriveeRefus, caseArrivee } from '../../js/engine/villageois.js';
import { portOuvert } from '../../js/engine/port.js';
import { casesPortIle, LONG_PONTON, portIle } from '../../js/engine/ile/port-ile.js';
import { casesCouvertes } from '../../js/engine/blocs.js';

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
  // (la bourse du village paie, docs/economie.md E14)
  economie(s).bourse = VI.NIVEAUX[1].prix - 1;
  assert.equal(monterPlace(s).ok, false);
  economie(s).bourse = VI.NIVEAUX[1].prix + 10;
  const r = monterPlace(s);
  assert.ok(r.ok);
  assert.equal(economie(s).bourse, 10);
  assert.equal(niveauPlace(s), 2);
  assert.equal(refusArriveeIle(s, 9), null);
  assert.match(refusArriveeIle(s, 2), /toutes les/, 'au plus un nouveau venu par période');
});

test('le port : sa culée sur la rive, un ponton de 2 × 8 vers la mer, sa halle à côté ; un seul ; il commerce le village fondé', () => {
  const s = partie(),
    ile = ileDeLaPartie(s),
    n = ile.n;
  const mer = (i) => BIOMES[SOL_BIOME[ile.sol[i]]] === 'mer';
  assert.equal(refusPoseIle(s, VI.PORT, [s.monde.ici]) !== null, true, "pas au milieu de l'île");
  // une case de rive d'où un ponton part vers la mer, la halle à côté
  let rive = -1;
  for (let i = n * 20; i < n * n - n * 20 && rive < 0; i++) {
    if (mer(i) || !(mer(i + n) || mer(i - n) || mer(i + 1) || mer(i - 1))) continue;
    if (refusPoseIle(s, VI.PORT, [i]) === null) rive = i;
  }
  assert.ok(rive > 0);
  addItem(s, VI.PORT, 1);
  const r = poserBloc(s, VI.PORT, rive);
  assert.ok(r.ok, r.error);
  const d = portIle(s);
  assert.ok(d && ['S', 'N', 'E', 'O'].includes(d.sens), 'le port posé : son sens');
  assert.equal(d.ponton.length, LONG_PONTON);
  for (const [k, a, b] of d.ponton)
    for (const t of [a, b]) assert.equal(mer(t), k > 0, `la travée ${k} : ${k ? 'sur la mer' : 'sur la rive'}`);
  for (const t of d.halleCases) assert.ok(!mer(t), 'la halle sur la terre');
  const C = casesPortIle(s);
  assert.equal(C.ouvertes.length, 14, 'le ponton sur la mer s’ouvre à la marche');
  assert.equal(C.bloquees.length, 7, 'les quatre poteaux et le comptoir ferment la marche');
  // ses cases sont prises : rien ne s'y pose
  assert.ok(casesCouvertes(s).has(d.halleCases[4]));
  assert.match(refusPoseIle(s, VI.PORT, [rive]), /qu'un port/);
  assert.match(refusPortIle(s), /village fondé/);
  assert.equal(portOuvert(s, null, { sansPresence: true }).ok, false);
  poser(s, VI.PLACE, s.monde.ici + 5);
  s.villageois = [{ id: 'vg-1', arrive: 1 }];
  assert.ok(villageFonde(s));
  assert.equal(refusPortIle(s), null);
});
