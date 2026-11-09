/* ==========================================================================
   Tests du moteur : les niveaux de la pioche (le lot 5 des évolutions du crafting).
   - pierre → cuivre → fer → or : chaque amélioration se fabrique à l'Atelier avec ce que le niveau d'avant extrait,
     sur la pioche du niveau d'avant ;
   - l'or demande la pioche en fer, le platine celle en or (au moins une pioche en cuivre pour l'or) ; un message clair ;
   - chaque niveau : +25 % de minerai ;
   - une partie d'avant garde sa pioche, en pierre.
   Lancer seul : node tests/run-tests.mjs pioche.
   ========================================================================== */

import { buildAtelier, countItem, craft, craftStatus, DATA, mineOre, niveauPioche, piocheDef, refusMinerai } from '../../js/engine/index.js';
import { assert, assertEqual, atelier, setInv, test, tireless } from './aide.mjs';

function partie() {
  const s = atelier();
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  tireless(s);
  s.outils = { ...(s.outils || {}), pioche: true };
  delete s.outils.niveauPioche;
  return s;
}

test('les données : quatre niveaux, leurs recettes, le minerai qu\'il leur faut', () => {
  assertEqual(DATA.PIOCHE.NIVEAUX.map((n) => [n.nom, n.minerai]), [['pierre', 0], ['cuivre', 25], ['fer', 50], ['or', 75]]);
  assertEqual(DATA.PIOCHE.MINERAIS, { or: 3, platine: 4 });
  const R = DATA.ATELIER.RECETTES;
  assertEqual([R.pioche_cuivre.entrees, R.pioche_cuivre.niveau], [{ lingot_cuivre: 3, planche: 2 }, 2]);
  assertEqual([R.pioche_fer.entrees, R.pioche_fer.niveau], [{ lingot_fer: 3, lingot_cuivre: 1, planche: 2 }, 3]);
  assertEqual([R.pioche_or.entrees, R.pioche_or.niveau], [{ lingot_or: 3, lingot_fer: 1, planche: 2 }, 4]);
  // pas de blocage : ce que demande chaque niveau, le niveau d'avant l'extrait (le lingot de son métal)
  const extrait = (n) => ['fer', 'cuivre', 'quartz', 'amethyste'].filter((m) => (DATA.PIOCHE.MINERAIS[m] || 1) <= n)
    .concat(['or', 'platine'].filter((m) => DATA.PIOCHE.MINERAIS[m] <= n));
  for (const [id, n] of [['pioche_cuivre', 2], ['pioche_fer', 3], ['pioche_or', 4]]) {
    for (const item of Object.keys(R[id].entrees).filter((i) => i.startsWith('lingot_'))) {
      assert(extrait(n - 1).includes(item.slice(7)), `${id} : ${item}, extrait avec la pioche du niveau ${n - 1}`);
    }
  }
});

test('une partie d\'avant : sa pioche est en pierre ; elle prend le fer et le cuivre, pas l\'or ni le platine', () => {
  const s = partie();
  assertEqual([niveauPioche(s), piocheDef(s).nom], [1, 'pierre']);
  assert(mineOre(s, 'fer').ok && mineOre(s, 'cuivre').ok && mineOre(s, 'quartz').ok);
  assertEqual(mineOre(s, 'or').error, 'L\'or : il faut une pioche en fer au moins (Atelier).');
  assertEqual(refusMinerai(s, 'platine'), 'Le platine : il faut une pioche en or au moins (Atelier).');
  assertEqual(countItem(s, 'minerai_or'), 0);
  s.outils.pioche = false;
  assertEqual([niveauPioche(s), refusMinerai(s, 'fer')], [0, 'Il te faut une pioche (à fabriquer à l\'Atelier).']);
});

test('les améliorations, dans l\'ordre ; l\'or avec la pioche en fer, le platine avec celle en or', () => {
  const s = partie();
  setInv(s, { lingot_cuivre: 10, lingot_fer: 10, lingot_or: 10, planche: 10 });
  assertEqual(craftStatus(s, 'pioche_fer').raison, 'Il te faut d\'abord la pioche en cuivre.');
  assertEqual(craftStatus(s, 'pioche').raison, 'Tu as déjà cet outil.');
  assert(craft(s, 'pioche_cuivre').ok);
  assertEqual([niveauPioche(s), countItem(s, 'lingot_cuivre'), countItem(s, 'planche')], [2, 7, 8]);
  assertEqual(craftStatus(s, 'pioche_cuivre').raison, 'Tu as déjà la pioche en cuivre.');
  assertEqual(mineOre(s, 'or').ok, false, 'le cuivre ne suffit pas pour l\'or');
  assert(craft(s, 'pioche_fer').ok);
  assert(mineOre(s, 'or').ok, 'la pioche en fer : l\'or');
  assertEqual(mineOre(s, 'platine').ok, false);
  assert(craft(s, 'pioche_or').ok);
  assertEqual([niveauPioche(s), piocheDef(s).nom], [4, 'or']);
  assert(mineOre(s, 'platine').ok, 'la pioche en or : le platine');
  assertEqual(craftStatus(s, 'pioche_cuivre').raison, 'Tu as déjà la pioche en or.', 'on ne redescend pas');
});

test('chaque niveau : +25 % de minerai', () => {
  const moyenne = (n) => {
    const s = partie();
    s.outils.niveauPioche = n;
    for (let k = 0; k < 400; k++) mineOre(s, 'fer');
    return countItem(s, 'minerai_fer') / 400;
  };
  const m = [1, 2, 3, 4].map(moyenne);
  assertEqual(m[0], 1, `en pierre : 1 par minerai (${m.join(', ')})`);
  for (const [k, attendu] of [[1, 1.25], [2, 1.5], [3, 1.75]]) assert(Math.abs(m[k] - attendu) < 0.12, `niveau ${k + 1} : ${m[k]} (≈ ${attendu})`);
});
