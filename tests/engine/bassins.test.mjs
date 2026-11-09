/* ==========================================================================
   Tests du moteur : les bassins (le lot 3 des évolutions du crafting ; la scène : js/carte/ferme/bassins.js).
   - la recette (3 pierres, son plan au marais), le bloc (dehors, il ferme le passage) ;
   - des cases côte à côte : un seul bassin pour la carte (elles se posent les unes contre les autres) ;
   - la migration 79 → 80 : l'ancien bassin aux nénuphars devient une case de bassin, son plan celui du bassin.
   Lancer seul : node tests/run-tests.mjs bassins.
   ========================================================================== */

import { blocAt, blocBloque, buildAtelier, countItem, craft, DATA, farmTerrain, migrate, poserBloc, reprendreBloc, STATE_VERSION, testFarmMap } from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, tireless, test } from './aide.mjs';

function jardin() {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'bassins');
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - 8; r++) {
    for (let c = 4; c < W - 10; c++) {
      let ok = true;
      for (let dr = 0; dr < 3 && ok; dr++) for (let dc = 0; dc < 4 && ok; dc++) {
        const k = (r + dr) * W + c + dc;
        ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === k) && !(T.HERBES && T.HERBES[k]);
      }
      if (ok) return { s, t: r * W + c, W };
    }
  }
  throw new Error('pas de place');
}

test('le bassin : 3 pierres, son plan au marais ; posé dehors, il ferme le passage', () => {
  assertEqual(DATA.ATELIER.RECETTES.bassin, { entrees: { pierre: 3 }, sortie: { bassin: 1 }, plan: true });
  const b = DATA.ATELIER.BLOCS.bassin;
  assertEqual([b.dehors, b.bloque, b.bassin], [true, true, true]);
  assert(DATA.PLANS.COLLECTIONS.marais.plans.includes('bassin') && !DATA.PLANS.COLLECTIONS.marais.plans.includes('bassin_nenuphars'), 'le plan du marais');
  assert(!DATA.ATELIER.RECETTES.bassin_nenuphars, 'l\'ancien ne se fabrique plus');
  assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes('bassin'));
  const { s, t, W } = jardin();
  setInv(s, { pierre: 3 });
  assertEqual(craft(s, 'bassin').ok, false, 'sans son plan');
  s.plans = { connus: { bassin: { jour: 1, de: null } } };
  assert(craft(s, 'bassin').ok, 'son plan trouvé');
  setInv(s, { bassin: 6 });
  // des cases côte à côte, en L : elles se posent les unes contre les autres (la carte en fait un seul bassin)
  for (const c of [t, t + 1, t + 2, t + W, t + 2 * W]) assert(poserBloc(s, 'bassin', c).ok, `case ${c}`);
  assertEqual([blocAt(s, t + 1), blocBloque(s, t + 1), countItem(s, 'bassin')], ['bassin', true, 1]);
  assert(reprendreBloc(s, t + 1).ok, 'une case se reprend seule');
  assertEqual([blocAt(s, t + 1), countItem(s, 'bassin')], [null, 2]);
});

test('migration 79 → 80 : l\'ancien bassin aux nénuphars devient une case de bassin ; son plan, celui du bassin', () => {
  const { s, t } = jardin();
  const v79 = JSON.parse(JSON.stringify({ ...s, version: 79 }));
  v79.blocs = { ...v79.blocs, [t]: 'bassin_nenuphars' };
  v79.sens = { [t]: 2 };
  v79.inventaire.bassin_nenuphars = [{ qty: 2, nightsLeft: null, origin: 'ferme' }];
  v79.plans = { connus: { bassin_nenuphars: { jour: 4, de: 'Rose' }, lanterne_papier: { jour: 2, de: null } } };
  const m = migrate(v79);
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.blocs[t], m.sens[t], countItem(m, 'bassin'), countItem(m, 'bassin_nenuphars')], ['bassin', undefined, 2, 0]);
  assertEqual(m.plans.connus, { lanterne_papier: { jour: 2, de: null }, bassin: { jour: 4, de: 'Rose' } });
});
