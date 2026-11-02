/* ==========================================================================
   Tests du moteur : les invitations à un repas (js/engine/invitations.js, AMITIE.INVITATION).
   - inviter depuis le calendrier : le jour, le moment, les personnes connues, le nombre ;
   - Achille porte le message : les réponses la nuit, annoncées une fois au matin ;
   - le jour dit : l'invitation du moment (l'heure), le modèle de la carte ;
   - servir le repas : les plats pris, l'amitié selon les goûts, la terrasse, la famille plus heureuse ;
   - le souvenir dont l'invité parle ensuite ; un repas manqué ne fait rien perdre.
   Lancer seul : node tests/run-tests.mjs invitations.
   ========================================================================== */

import { addItem, countItem, DATA, hourOfDay, jaugeMembre, mangeurs } from '../../js/engine/index.js';
import { ajouterAmitie, parlerAmitie, pointsAmitie, goutsDe } from '../../js/engine/amitie.js';
import {
  INVITATION, annulerInvitation, invitationDuMoment, invitationsAVenir, invitationsNuit, invitesModele, inviter,
  platsServables, relationsInvitables, reponsesAAnnoncer, servirRepas, souvenirParole,
} from '../../js/engine/invitations.js';
import { cibleBonheur } from '../../js/engine/bonheur.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

function partie() {
  const s = garden();
  const plan = {
    id: 'h_inv', nom: 'Le Hameau', metier: 'pecheur', style: 'prairie', case: 12345,
    maisons: [
      { id: 'h_inv_maison_1', lits: [{ case: 0, sorte: 'lit_adulte' }, { case: 1, sorte: 'lit_adulte' }] },
      { id: 'h_inv_maison_2', lits: [{ case: 2, sorte: 'lit_adulte' }] },
    ],
    jardins: [], travail: [], place: { cases: [] },
  };
  assert(peuplerHameau(s, plan), 'le hameau est peuplé');
  const membres = habitantsDe(s).h_inv.foyers.flatMap((f) => f.membres);
  return { s, membres, hameau: 'h_inv' };
}

// L'heure `h` du jour en cours.
function aLHeure(s, h) {
  s.awakeMs = (h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  assertEqual(hourOfDay(s), h);
}

test('invitations : on invite ceux à qui l\'on a parlé, un jour à venir, pas trop de monde', () => {
  const { s, membres, hameau } = partie();
  assertEqual(relationsInvitables(s), [], 'personne : on n\'a encore parlé à personne');
  const [a, b] = membres;
  parlerAmitie(s, hameau, a.id);
  parlerAmitie(s, hameau, b.id);
  assertEqual(relationsInvitables(s).map((r) => r.id).sort(), [a.id, b.id].sort());
  const qui = [{ hameau, id: a.id }];
  assertEqual(inviter(s, s.day, 'midi', qui).ok, false, 'pas le jour même : Achille doit porter le message');
  assertEqual(inviter(s, s.day + INVITATION.DELAI[1] + 1, 'midi', qui).ok, false, 'pas trop loin');
  assertEqual(inviter(s, s.day + 2, 'gouter', qui).ok, false, 'un moment connu');
  assertEqual(inviter(s, s.day + 2, 'midi', []).ok, false, 'au moins une personne');
  const inconnu = membres.find((m) => m.id !== a.id && m.id !== b.id);
  assertEqual(inviter(s, s.day + 2, 'midi', [{ hameau, id: inconnu.id }]).ok, false, 'un inconnu : non');
  const r = inviter(s, s.day + 2, 'midi', qui);
  assert(r.ok);
  assertEqual(inviter(s, s.day + 2, 'midi', [{ hameau, id: b.id }]).ok, false, 'un repas par moment');
  assert(inviter(s, s.day + 2, 'soir', [{ hameau, id: b.id }]).ok, 'le dîner, le même jour');
  assertEqual(invitationsAVenir(s).length, 2);
  assert(annulerInvitation(s, r.invitation.id).ok);
  assertEqual(invitationsAVenir(s).length, 1);
});

test('invitations : Achille porte le message, les réponses la nuit (selon l\'amitié), annoncées une fois', () => {
  const { s, membres, hameau } = partie();
  const a = membres[0];
  parlerAmitie(s, hameau, a.id);
  ajouterAmitie(s, a.id, 100);    // intime : il accepte toujours (ACCEPTE[4] = 100)
  const inv = inviter(s, s.day + 1, 'soir', [{ hameau, id: a.id }]).invitation;
  assertEqual(reponsesAAnnoncer(s), [], 'pas encore de réponse');
  const n = invitationsNuit(s);
  s.day += 1;
  assertEqual(n.reponses, [inv.id]);
  assertEqual(inv.invites[0].reponse, 'oui');
  const R = reponsesAAnnoncer(s);
  assertEqual([R.length, R[0].oui, R[0].non], [1, [a.prenom], []]);
  assertEqual(reponsesAAnnoncer(s), [], 'une seule fois');
});

test('invitations : le jour dit, à l\'heure, servir le repas (les goûts, la terrasse, la famille)', () => {
  const { s, membres, hameau } = partie();
  const a = membres[0];
  parlerAmitie(s, hameau, a.id);
  ajouterAmitie(s, a.id, 100);
  const inv = inviter(s, s.day + 1, 'midi', [{ hameau, id: a.id }]).invitation;
  invitationsNuit(s);
  s.day += 1;
  const H = INVITATION.MOMENTS.midi.heure;
  aLHeure(s, H - INVITATION.VIENNENT - 1);
  assertEqual(invitationDuMoment(s), null, 'trop tôt');
  aLHeure(s, H - INVITATION.VIENNENT);
  assertEqual(invitationDuMoment(s), inv, 'ils se mettent en route');
  const M = invitesModele(s);
  assertEqual([M.id, M.etat, M.invites.length, M.invites[0].prenom, M.invites[0].depart], [inv.id, 'repondue', 1, a.prenom, 12345]);
  aLHeure(s, H);
  // un plat qu'il adore, un qu'il déteste (parmi les plats)
  const g = goutsDe(a);
  const plats = Object.keys(DATA.OBJETS).filter((it) => DATA.OBJETS[it].plat);
  const adore = plats.find((it) => g[it] === 'adore') || plats[0];
  addItem(s, adore, 1);
  assert(platsServables(s).includes(adore));
  for (const m of s.famille.membres) m.energie = 10;
  const avant = pointsAmitie(s, a.id), cibleAvant = cibleBonheur(s, {});
  assertEqual(servirRepas(s, inv.id, [adore, adore, adore, 'pain']).ok, false, 'il manque le pain');
  const r = servirRepas(s, inv.id, [adore], true);
  assert(r.ok, r.error);
  const R = INVITATION.REPAS;
  const attendu = Math.max(1, R.BASE + R.GOUT[g[adore] || 'neutre'] + R.TERRASSE);
  assertEqual([r.invites[0].points, pointsAmitie(s, a.id) - avant >= 0, countItem(s, adore)], [attendu, true, 0]);
  assertEqual(r.invites[0].emotion, (g[adore] || 'neutre') === 'deteste' ? 'degout' : 'joie');
  assert(cibleBonheur(s, {}) >= cibleAvant + R.BONHEUR, 'la famille vise plus haut cette nuit');
  assertEqual(s.repasJour.mange[adore], 1, 'le plat compte dans les repas du jour');
  assert(mangeurs(s).every((m) => jaugeMembre(m) === DATA.FAMILLE.FAIM.MAX), 'la famille, à table, a mangé à sa faim');
  assertEqual(servirRepas(s, inv.id, []).ok, false, 'une fois');
  assertEqual(invitesModele(s).etat, 'servie', 'ils mangent, puis repartent');
  // le souvenir : le lendemain, il en parle (une phrase avec le plat), puis plus tard une fois encore
  invitationsNuit(s);
  s.day += 1;
  assertEqual(invitationsAVenir(s), [], 'l\'invitation passée quitte la liste');
  const p1 = souvenirParole(s, a.id);
  assert(p1 && p1.includes(DATA.OBJETS[adore].nom) && p1.includes('terrasse'), p1);
  s.day += INVITATION.SOUVENIR.RECENT + 1;
  assertEqual(souvenirParole(s, a.id), INVITATION.PAROLES.SOUVENIR_ANCIEN);
  assertEqual(souvenirParole(s, a.id), null, 'l\'ancien souvenir, une seule fois');
});

test('invitations : un repas sans plat compte un peu ; un repas manqué ne fait rien perdre', () => {
  const { s, membres, hameau } = partie();
  const a = membres[0];
  parlerAmitie(s, hameau, a.id);
  ajouterAmitie(s, a.id, 100);
  const inv = inviter(s, s.day + 1, 'soir', [{ hameau, id: a.id }]).invitation;
  invitationsNuit(s);
  s.day += 1;
  aLHeure(s, INVITATION.MOMENTS.soir.heure);
  const avant = pointsAmitie(s, a.id);
  // personne ne vient à table : la nuit, l'invitation est manquée, sans perte
  const n = invitationsNuit(s);
  s.day += 1;
  assertEqual([n.manquees, pointsAmitie(s, a.id), invitationsAVenir(s)], [[inv.id], avant, []]);
  // sans plat : la moitié de la base
  const { s: t, membres: m2, hameau: h2 } = partie();
  parlerAmitie(t, h2, m2[0].id);
  ajouterAmitie(t, m2[0].id, 100);
  const i2 = inviter(t, t.day + 1, 'midi', [{ hameau: h2, id: m2[0].id }]).invitation;
  invitationsNuit(t);
  t.day += 1;
  aLHeure(t, INVITATION.MOMENTS.midi.heure);
  const r = servirRepas(t, i2.id, []);
  assertEqual([r.ok, r.invites[0].points], [true, Math.ceil(INVITATION.REPAS.BASE / 2)]);
  assertEqual(souvenirParole(t, m2[0].id), null, 'pas le jour même');
  t.day += 1;
  assertEqual(souvenirParole(t, m2[0].id), INVITATION.PAROLES.SOUVENIR_SIMPLE);
});
