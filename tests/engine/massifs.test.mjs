/* ==========================================================================
   Tests du moteur : les fleurs semées dans l'herbe de la ferme (js/engine/massifs.js).
   - semer : depuis l'Inventaire, comme une graine d'arbre (js/engine/plantation.js), sur l'herbe libre ;
   - la pousse en 3 nuits, sans arrosage ; la cueillette à la main : 2 à 3 fleurs, parfois une graine ; il refleurit ;
   - la case est prise : ni bloc, ni labour, ni un autre massif ; les abeilles y butinent en fleurs.
   Lancer seul : node tests/run-tests.mjs massifs.
   ========================================================================== */

import { assert, assertEqual, garden, setInv, sleepOnce, tireless, test } from './aide.mjs';
import {
  buildAtelier, caseDepart, casesAPlanter, countItem, cueillirMassif, DATA, etapeMassif, executerCommande, farmTerrain,
  isArable, massifsCarte, massifsFleuris, massifSurCase, planterIci, poserBloc, poseStatus, sorteAPlanter, sortesAPlanter,
  testFarmMap,
} from '../../js/engine/index.js';

function pre() {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'massifs');
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  const T = farmTerrain(s);
  setInv(s, { graine_coquelicot: 1 });
  const cases = casesAPlanter(s, 'massif_coquelicot', caseDepart(T), 8);
  setInv(s, {});
  return { s, cases };
}

test('les graines de fleurs se sèment depuis l\'Inventaire, pas depuis le menu Construire', () => {
  for (const [fleur, F] of Object.entries(DATA.BACS.FLEURS)) {
    assertEqual(sorteAPlanter(F.graine), `massif_${fleur}`, fleur);
    assert(DATA.MASSIFS.DESSIN[fleur], `${fleur} : son dessin`);
  }
  assert(sortesAPlanter().includes('massif_lupin'));
});

test('semer : une graine prise, sur l\'herbe libre ; la case est prise ensuite', () => {
  const { s, cases } = pre();
  assert(cases.length > 2, 'des cases d\'herbe libre');
  assertEqual(poseStatus(s, 'massif_coquelicot', cases[0]).ok, false, 'sans graine');
  setInv(s, { graine_coquelicot: 2, graine_lavande: 1, mur_bois: 1 });
  const t = cases.find((c) => isArable(c, s));
  assert(t !== undefined, 'une case qu\'on pourrait labourer');
  const r = planterIci(s, 'massif_coquelicot', t);
  assert(r.ok, r.error);
  assertEqual([countItem(s, 'graine_coquelicot'), massifSurCase(s, t), etapeMassif(s, t)], [1, { fleur: 'coquelicot', nuits: 0, cueilli: false }, 0]);
  assertEqual(poseStatus(s, 'massif_lavande', t).ok, false, 'déjà semé');
  assertEqual(poseStatus(s, 'mur_bois', t).ok, false, 'pas de bloc dessus');
  assertEqual(isArable(t, s), false, 'pas de labour dessus');
  // (côte à côte : pas d'écart comme les arbres)
  const voisin = cases.find((c) => Math.abs(c - t) === 1);
  if (voisin !== undefined) assert(poseStatus(s, 'massif_lavande', voisin).ok, 'à côté d\'un autre massif');
  assertEqual(massifsCarte(s), [{ case: t, fleur: 'coquelicot', etape: 0, dessin: 'coquelicot' }]);
});

test('la pousse en 3 nuits, puis la cueillette à la main ; il refleurit sans resemer', () => {
  const { s, cases } = pre();
  setInv(s, { graine_pavot: 1 });
  const t = cases[0];
  assert(executerCommande(s, { id: 'a', type: 'arbre.planter', args: { sorte: 'massif_pavot', case: t } }).ok);
  assertEqual(cueillirMassif(s, t).ok, false, 'pas encore en fleurs');
  const etapes = [etapeMassif(s, t)];
  for (let n = 0; n < 3; n++) { sleepOnce(s); etapes.push(etapeMassif(s, t)); }
  assertEqual(etapes, [0, 1, 2, 3]);
  assertEqual(massifsFleuris(s), [t]);
  const avant = countItem(s, 'fleur_pavot');
  const r = executerCommande(s, { id: 'b', type: 'massif.cueillir', args: { case: t } });
  assert(r.ok, r.error);
  const n = countItem(s, 'fleur_pavot') - avant;
  assert(n >= 2 && n <= 3, `2 à 3 fleurs (${n})`);
  assertEqual(r.items.fleur_pavot, n);
  // il repart de ses pousses (pas de la graine) et refleurit en 3 nuits
  assertEqual([etapeMassif(s, t), massifsFleuris(s)], [1, []]);
  sleepOnce(s); sleepOnce(s);
  assertEqual(etapeMassif(s, t), 2);
  sleepOnce(s);
  assertEqual(etapeMassif(s, t), 3);
});

test('les graines : une chance sur quatre environ en cueillant', () => {
  const { s, cases } = pre();
  setInv(s, { graine_myosotis: 1 });
  const t = cases[0];
  assert(planterIci(s, 'massif_myosotis', t).ok);
  let graines = 0;
  for (let k = 0; k < 200; k++) {
    s.massifs[t].nuits = DATA.MASSIFS.NUITS;
    const r = cueillirMassif(s, t);
    assert(r.ok, r.error);
    graines += r.items.graine_myosotis || 0;
  }
  assert(graines > 25 && graines < 80, `vers 50 sur 200 (${graines})`);
});
