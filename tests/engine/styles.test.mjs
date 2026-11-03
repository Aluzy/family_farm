/* ==========================================================================
   Tests du moteur : les styles d'aménagement (js/engine/styles.js, data/styles.json).
   - chaque bloc a au plus un style ; on compte les sortes différentes, pas les blocs ;
   - la famille : la variété ou un style complet élèvent la cible de bonheur (les deux se valent) ;
   - les habitants : un style préféré (écrit, ou tiré du style de leur hameau), révélé par l'amitié ou un
     repas ; invités, ils admirent un coin de leur style autour de la table (plus d'amitié).
   Lancer seul : node tests/run-tests.mjs styles.
   ========================================================================== */

import { DATA, hourOfDay } from '../../js/engine/index.js';
import { ajouterAmitie, amitieAvec, parlerAmitie, styleHabitant, trouverPnj } from '../../js/engine/amitie.js';
import { cibleBonheur } from '../../js/engine/bonheur.js';
import { invitationsNuit, invitesModele, inviter, INVITATION, servirRepas } from '../../js/engine/invitations.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { admireLeCoin, decorAutour, decorFerme, STYLES, styleBonheur, styleDe, styleMaison, stylePrefere, tableDuRepas } from '../../js/engine/styles.js';
import { farmTerrain } from '../../js/engine/terrain.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

// Poser `sorte` sur `tile` sans les règles de pose (les styles ne lisent que ce qui est posé).
const poser = (s, sorte, tile) => { s.blocs[tile] = sorte; };

test('styles : un style par bloc ; on compte les sortes, pas les blocs', () => {
  assertEqual([styleDe('mur_pierre'), styleDe('meuble_canape'), styleDe('banc_jardin'), styleDe('mur_brique_bleue'), styleDe('four')], ['champetre', 'fleuri', 'forestier', 'cotier', null]);
  const s = garden();
  const avant = decorFerme(s).champetre || 0;
  const W = farmTerrain(s).LARGEUR, t = 40 * W + 40;
  for (let k = 0; k < 10; k++) poser(s, 'mur_pierre', t + k);
  assertEqual(decorFerme(s).champetre || 0, Math.max(avant, 1), 'vingt murs de pierre : une seule sorte');
});

test('styles : la famille, par la variété ou par un style complet (les deux se valent)', () => {
  const M = STYLES.MAISON;
  const s = garden();
  const W = farmTerrain(s).LARGEUR, t0 = 50 * W + 50;
  assertEqual(styleBonheur(s), 0, 'une maison de pierre : rien encore');
  const cible0 = cibleBonheur(s, {});
  // la variété : VARIETE styles de PIECES sortes chacun
  const par = { champetre: ['meuble_chaise', 'meuble_buffet'], forestier: ['banc_jardin', 'meuble_chevet'], cotier: ['meuble_tapis_3', 'meuble_plante_aloe'] };
  let k = 0;
  for (const L of Object.values(par)) for (const b of L) poser(s, b, t0 + 2 * k++);
  const v = styleMaison(s);
  assert(v.varies.length >= M.VARIETE, v.varies.join());
  assertEqual([v.bonus, cibleBonheur(s, {}) - cible0], [M.BONUS, M.BONUS]);
  // un style complet : COMPLET sortes d'un même style
  const u = garden();
  const fleuri = STYLES.LISTE.fleuri.blocs.slice(0, M.COMPLET);
  fleuri.forEach((b, i) => poser(u, b, t0 + 2 * i));
  assertEqual([styleMaison(u).complet, styleBonheur(u)], ['fleuri', M.BONUS]);
});

// Un hameau de prairie, un habitant à qui l'on a parlé.
function hameau(style = 'prairie') {
  const s = garden();
  const plan = { id: 'h_st', nom: 'Les Prés', metier: 'berger', style, case: 3,
    maisons: [{ id: 'h_st_m1', lits: [{ case: 0, sorte: 'lit_adulte' }] }], jardins: [], travail: [], place: { cases: [] } };
  peuplerHameau(s, plan);
  const m = habitantsDe(s).h_st.foyers[0].membres[0];
  parlerAmitie(s, 'h_st', m.id);
  return { s, m };
}

test('styles : chacun son style préféré, révélé par l\'amitié', () => {
  assertEqual(stylePrefere('basile', 'x', 'cote'), 'basile' in STYLES.ECRITS ? STYLES.ECRITS.basile : null, 'un personnage écrit : le sien');
  for (let i = 0; i < 20; i++) assert(STYLES.BIOMES.cote.includes(stylePrefere('p' + i, 'id' + i, 'cote')), 'de la côte : côtier');
  assertEqual(stylePrefere('a', 'id7', 'prairie'), stylePrefere('a', 'id7', 'prairie'), 'déterministe');
  const { s, m } = hameau();
  const t = trouverPnj(s, 'h_st', m.id);
  assert(STYLES.BIOMES.prairie.includes(styleHabitant(s, t)));
  assertEqual(amitieAvec(s, 'h_st', m.id).style, null, 'pas encore connu');
  ajouterAmitie(s, m.id, 100);
  assertEqual(amitieAvec(s, 'h_st', m.id).style.id, styleHabitant(s, t), 'un ami : on le connaît');
});

test('styles : invité, il admire un coin de son style autour de la table (plus d\'amitié)', () => {
  const { s, m } = hameau();
  ajouterAmitie(s, m.id, 100);
  const st = styleHabitant(s, trouverPnj(s, 'h_st', m.id));
  const W = farmTerrain(s).LARGEUR, t = 60 * W + 60;
  poser(s, 'table_jardin', t); poser(s, 'chaise_jardin', t - 1);
  assertEqual(tableDuRepas(s), { case: t, terrasse: true });
  assertEqual(admireLeCoin(s, st), false, 'rien de son style autour');
  // trois sortes de son style, tout près
  STYLES.LISTE[st].blocs.filter((b) => b !== 'table_jardin' && b !== 'chaise_jardin').slice(0, STYLES.ADMIRE).forEach((b, i) => poser(s, b, t + 2 + i));
  assert((decorAutour(s, t)[st] || 0) >= STYLES.ADMIRE);
  assertEqual(admireLeCoin(s, st), true);
  // le repas : il l'admire en arrivant, et le repas rapporte BONUS_REPAS de plus
  const inv = inviter(s, s.day + 1, 'midi', [{ hameau: 'h_st', id: m.id }]).invitation;
  invitationsNuit(s);
  s.day += 1;
  s.awakeMs = (INVITATION.MOMENTS.midi.heure - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  assertEqual(hourOfDay(s), INVITATION.MOMENTS.midi.heure);
  assert(invitesModele(s).invites[0].admire, 'sa phrase d\'arrivée');
  const r = servirRepas(s, inv.id, [], true);
  const R = INVITATION.REPAS;
  assertEqual([r.invites[0].admire, r.invites[0].points, r.invites[0].emotion], [true, Math.ceil(R.BASE / 2) + R.TERRASSE + STYLES.BONUS_REPAS, 'joie']);
});
