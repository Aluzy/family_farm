/* ==========================================================================
   Tests du moteur : les plans des meubles de collection (js/engine/plans.js, data/plans.json ; le lot 4).
   - une recette « plan » ne se fait qu'une fois son plan trouvé ;
   - en explorant : le premier passage dans un biome du pays, hors de la ferme, donne un plan (une fois) ;
   - par l'amitié : la nuit, un ami d'un hameau du pays offre le plan suivant, annoncé une fois.
   Lancer seul : node tests/run-tests.mjs plans.
   ========================================================================== */

import { craftStatus, DATA, recetteDebloquee } from '../../js/engine/index.js';
import { ajouterAmitie, parlerAmitie } from '../../js/engine/amitie.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { collection, collectionDe, deNom, planConnu, PLANS, plansAAnnoncer, plansNuit, trouverPlanBiome } from '../../js/engine/plans.js';
import { styleDe } from '../../js/engine/styles.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

test('plans : chaque meuble de collection a un plan, un style, une recette verrouillée', () => {
  const s = garden();
  for (const [cid, c] of Object.entries(PLANS.COLLECTIONS)) {
    for (const id of c.plans) {
      assert(DATA.ATELIER.RECETTES[id].plan, `${id} : une recette à plan`);
      assert(styleDe(id), `${id} : un style`);
      assertEqual(collectionDe(id).id, cid);
      assertEqual(recetteDebloquee(s, id), false, `${id} : pas sans son plan`);
    }
  }
  assert(/plan/.test(craftStatus(s, 'banc_rondins').raison), 'l\'Atelier le dit');
  assertEqual(deNom('Banc en rondins'), 'du banc en rondins');
  assertEqual(deNom('Pergola fleurie'), 'de la pergola fleurie');
});

test('plans : en explorant, un plan par pays (le premier passage hors de la ferme)', () => {
  const s = garden();
  assertEqual(trouverPlanBiome(s, 'foret', false), null, 'sur la ferme : rien');
  const r = trouverPlanBiome(s, 'foret', true);
  assertEqual([r.id, r.collection], [PLANS.COLLECTIONS.foret.plans[0], 'foret']);
  assert(r.phrase.includes('banc en rondins') && r.phrase.includes('forêt'), r.phrase);
  assert(planConnu(s, r.id) && recetteDebloquee(s, r.id));
  assertEqual(trouverPlanBiome(s, 'foret', true), null, 'une fois par pays');
  assertEqual(trouverPlanBiome(s, 'riviere', true), null, 'un biome sans collection');
  assertEqual(trouverPlanBiome(s, 'plage', true).collection, 'cote', 'la plage : la côte');
  assertEqual(plansAAnnoncer(s), [], 'déjà annoncés sur-le-champ');
  assertEqual(collection(s, 'foret').map((x) => x.connu), [true, false]);
});
