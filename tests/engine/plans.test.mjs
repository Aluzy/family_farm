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

test('plans : un ami d\'un hameau du pays offre le plan suivant, la nuit, annoncé une fois', () => {
  const s = garden();
  const plan = { id: 'h_pl', nom: 'Les Pins', metier: 'bucheron', style: 'foret', case: 3,
    maisons: [{ id: 'h_pl_m1', lits: [{ case: 0, sorte: 'lit_adulte' }] }], jardins: [], travail: [], place: { cases: [] } };
  peuplerHameau(s, plan);
  const m = habitantsDe(s).h_pl.foyers[0].membres[0];
  parlerAmitie(s, 'h_pl', m.id);
  assertEqual(plansNuit(s), [], 'pas encore assez amis');
  ajouterAmitie(s, m.id, 100);
  const n = plansNuit(s);
  assertEqual(n.map((x) => [x.id, x.de]), [[PLANS.COLLECTIONS.foret.plans[0], m.prenom]]);
  assertEqual(plansNuit(s), [], 'un par pays et par nuit');
  s.day += 1;
  assertEqual(plansNuit(s).map((x) => x.id), [PLANS.COLLECTIONS.foret.plans[1]], 'le suivant, une autre nuit');
  s.day += 1;
  assertEqual(plansNuit(s), [], 'la collection est complète');
  const A = plansAAnnoncer(s);
  assertEqual([A.length, A[0].de], [2, m.prenom]);
  assertEqual(plansAAnnoncer(s), [], 'une seule fois');
  // l'exploration de la forêt, ensuite : plus rien à trouver
  assertEqual(trouverPlanBiome(s, 'foret', true), null);
});
