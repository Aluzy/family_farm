/* ==========================================================================
   Tests du moteur : les projets collectifs des hameaux (js/engine/projets.js, data/projets.json ; le lot 5).
   - le projet en cours d'un hameau, selon son style ; ce qui manque ;
   - le joueur apporte ce qu'il a (l'amitié une fois par jour) ; le hameau, de sa réserve, la nuit ;
   - fini : la confiance, l'amitié, le décor pour la carte, le projet suivant ; les remerciements.
   Lancer seul : node tests/run-tests.mjs projets.
   ========================================================================== */

import { addItem, countItem } from '../../js/engine/index.js';
import { pointsAmitie } from '../../js/engine/amitie.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { confiance } from '../../js/engine/recit.js';
import { apporterAuProjet, merciProjet, PROJETS, projetDuHameau, projetsFaits, projetsNuit, projetsPourLaCarte } from '../../js/engine/projets.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

function hameau(style = 'prairie') {
  const s = garden();
  const plan = { id: 'h_pj', nom: 'Les Prés', metier: 'berger', style, case: 3,
    maisons: [{ id: 'h_pj_m1', lits: [{ case: 0, sorte: 'lit_adulte' }] }], jardins: [], travail: [], place: { cases: [] } };
  peuplerHameau(s, plan);
  const m = habitantsDe(s).h_pj.foyers[0].membres[0];
  return { s, m };
}

test('projets : le projet du hameau selon son style, ce qui manque', () => {
  const { s } = hameau('prairie');
  const p = projetDuHameau(s, 'h_pj');
  assertEqual([p.sorte, p.fait], [PROJETS.ORDRE.prairie[0], false]);
  assertEqual(p.manque, PROJETS.SORTES[p.sorte].besoin);
  assertEqual(projetDuHameau(hameau('cote').s, 'h_pj').sorte, PROJETS.ORDRE.cote[0]);
  assertEqual(projetDuHameau(s, 'inconnu'), null);
});

test('projets : le joueur apporte ce qu\'il a, l\'amitié une fois par jour', () => {
  const { s, m } = hameau();
  assertEqual(apporterAuProjet(s, 'h_pj').ok, false, 'rien à apporter');
  addItem(s, 'bois', 5);
  addItem(s, 'pierre', 100);
  const r = apporterAuProjet(s, 'h_pj');
  const besoin = projetDuHameau(s, 'h_pj').besoin;
  assertEqual([r.ok, r.donne.bois, r.donne.pierre, r.amitie, countItem(s, 'bois'), countItem(s, 'pierre')], [true, 5, besoin.pierre, PROJETS.DON, 0, 100 - besoin.pierre]);
  assertEqual(pointsAmitie(s, m.id), PROJETS.DON);
  addItem(s, 'bois', 1);
  assertEqual(apporterAuProjet(s, 'h_pj').amitie, 0, 'une fois par jour');
  assertEqual(projetDuHameau(s, 'h_pj').manque.pierre, undefined, 'la pierre est là');
});

test('projets : la réserve du hameau aide la nuit ; fini, la confiance, l\'amitié, le décor, le suivant', () => {
  const { s, m } = hameau();
  const p0 = projetDuHameau(s, 'h_pj');
  for (const [it, n] of Object.entries(p0.besoin)) addItem(s, it, n - 1);
  apporterAuProjet(s, 'h_pj');
  const h = habitantsDe(s).h_pj;
  h.reserve = { bois: 3, pierre: 3, fibre: 3 };
  const c0 = confiance(s, 'h_pj'), a0 = pointsAmitie(s, m.id);
  const n = projetsNuit(s);
  assertEqual(n, [{ hameau: 'h_pj', sorte: p0.sorte }], 'le dernier de chaque, de la réserve : fini');
  assertEqual(h.reserve, { bois: 2, pierre: 2, fibre: 2 });
  assertEqual([confiance(s, 'h_pj') - c0, pointsAmitie(s, m.id) - a0], [PROJETS.FIN.CONFIANCE, PROJETS.FIN.AMITIE]);
  assertEqual(projetsFaits(s, 'h_pj').map((f) => f.sorte), [p0.sorte]);
  assertEqual(projetsPourLaCarte(s).h_pj, PROJETS.SORTES[p0.sorte].decor);
  assertEqual(projetDuHameau(s, 'h_pj').sorte, PROJETS.ORDRE.prairie[1], 'le projet suivant');
  // les remerciements, les jours qui suivent
  assert(merciProjet(s, 'h_pj'));
  s.day += PROJETS.SOUVENIR + 1;
  assertEqual(merciProjet(s, 'h_pj'), null);
});
