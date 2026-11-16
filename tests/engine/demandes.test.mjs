/* ==========================================================================
   Tests du moteur : V-2, les données des petites demandes (data/amitie.json DEMANDES), que lisent les demandes des
   villageois (js/engine/demandes.js, VILLAGE.AMITIE.DEMANDES ; leurs tests : village-amitie). Les demandes des
   habitants des hameaux sont retirées avec eux à la bascule (I9h).
   Lancer seul : node --test tests/engine/demandes.test.mjs (ou node tests/run-tests.mjs demandes).
   ========================================================================== */
import { DATA } from '../../js/engine/index.js';
import { assert, test } from './aide.mjs';

const D = DATA.DEMANDES;
test('V-2 : les données (au moins une demande par métier, des motifs, des phrases)', () => {
  for (const m of ['bucheron', 'pecheur', 'mineur', 'berger', 'cueilleur', 'jardinier']) {
    assert(D.BESOINS[m].length >= 3, m);
    for (const [it, a, b, motif] of D.BESOINS[m]) assert(DATA.OBJETS[it] && a >= 1 && b >= a && motif.length > 5, `${m} : ${it}`);
  }
  assert(D.MAX >= 1 && D.DUREE >= 3 && D.CHANCE > 0 && D.CHANCE <= 1 && D.AMITIE > 0);
});

