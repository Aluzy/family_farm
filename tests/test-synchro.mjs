// Tests de la synchro d'un monde en ligne chez le joueur (E-2 : js/ui/synchro.js) : la partie confirmée
// (celle du monde), la partie locale (la confirmée + les commandes en attente rejouées par-dessus).
// Le monde est le vrai (worker/src/monde.mjs, base node:sqlite), le moteur aussi.
// Lancer seul : node tests/test-synchro.mjs (ou node tests/run-tests.mjs synchro).

import { test as nodeTest } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { addItem, blocAt, DATA, empreintePartie, executerCommande, GAME_VERSION, poseStatus } from '../js/engine/index.js';
import { partie } from './engine/aide.mjs';
import { MondeRegistre } from '../worker/src/monde.mjs';
import { Synchro } from '../js/ui/synchro.js';

const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

function monde() {
  const db = new DatabaseSync(':memory:');
  const r = new MondeRegistre({ exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } });
  const s = partie();
  addItem(s, DATA.ATELIER.BLOCS.mur_pierre.objet, 40);
  r.creer({ proprietaire: 'A', partie: s });
  r.ajouterMembre('B', 'Sam');
  const cases = [];
  for (let t = 0; t < 644 * 400 && cases.length < 12; t += 7) if (poseStatus(s, 'mur_pierre', t).ok) cases.push(t);
  return { r, cases };
}
// Un joueur : sa synchro, depuis l'accueil du monde.
function joueur(r, compte) {
  const a = r.accueil(compte, { version: GAME_VERSION });
  let refaites = 0;
  const s = new Synchro({ partie: a.partie, rev: a.rev, executerCommande, quandRefaite: () => { refaites += 1; } });
  return { s, refaites: () => refaites };
}
let n = 0;
const mur = (t) => ({ id: `c-test-${++n}`, type: 'bloc.poser', args: { sorte: 'mur_pierre', case: t } });

test('synchro : mon geste joué tout de suite ; confirmé par le monde, la partie locale n\'est pas refaite', () => {
  const { r, cases } = monde();
  const a = joueur(r, 'A');
  const c = mur(cases[0]);
  assert(a.s.jouer(c).ok);
  eq([blocAt(a.s.locale, cases[0]), blocAt(a.s.confirmee, cases[0]), a.s.enAttente.length], ['mur_pierre', null, 1]);
  const rep = r.commande('A', c);
  assert(a.s.evenement(rep.evt));
  eq([a.s.enAttente.length, a.s.rev, a.refaites()], [0, 1, 0]);
  eq(empreintePartie(a.s.locale), empreintePartie(r.charger()));
});

test('synchro : deux joueurs qui posent en même temps : les deux parties locales finissent comme celle du monde', () => {
  const { r, cases } = monde();
  const a = joueur(r, 'A'), b = joueur(r, 'B');
  const ca = [mur(cases[0]), mur(cases[1])], cb = [mur(cases[2]), mur(cases[0])];   // (B veut aussi la case 0)
  for (const c of ca) a.s.jouer(c);
  for (const c of cb) b.s.jouer(c);
  // le monde les reçoit entremêlées : A1, B1, B2 (refusée : la case 0 est prise… elle se rehausse !), A2
  const evts = [], refus = [];
  for (const [qui, c] of [['A', ca[0]], ['B', cb[0]], ['B', cb[1]], ['A', ca[1]]]) {
    const rep = r.commande(qui, c);
    if (rep.ok) evts.push(rep.evt); else refus.push([qui, c.id]);
  }
  for (const e of evts) { a.s.evenement(e); b.s.evenement(e); }
  for (const [qui, id] of refus) (qui === 'A' ? a : b).s.refusee(id);
  const monde_ = empreintePartie(r.charger());
  eq([empreintePartie(a.s.locale), empreintePartie(b.s.locale)], [monde_, monde_], 'les mêmes parties');
  eq([a.s.enAttente.length, b.s.enAttente.length], [0, 0]);
  assert(b.refaites() > 0, 'B a vu passer les gestes de A : sa partie refaite');
});

test('synchro : un geste refusé par le monde est retiré de la partie locale ; un trou dans les événements est signalé', () => {
  const { r, cases } = monde();
  const a = joueur(r, 'A'), b = joueur(r, 'B');
  // A pose la case 3 ; B, sans le savoir encore, y pose un plancher (refusé par le monde)
  addItem(b.s.locale, DATA.ATELIER.BLOCS.plancher.objet, 1);
  const ra = r.commande('A', mur(cases[3]));
  const cb = { id: 'c-test-plancher', type: 'bloc.poser', args: { sorte: 'plancher', case: cases[3] } };
  assert(b.s.jouer(cb).ok, 'chez B, la case semblait libre');
  const rb = r.commande('B', cb);
  eq(rb.ok, false);
  b.s.evenement(ra.evt);
  b.s.refusee(cb.id);
  eq([b.s.enAttente.length, blocAt(b.s.locale, cases[3])], [0, 'mur_pierre'], 'le plancher n\'y est plus, le mur de A oui');
  // un événement qui saute une révision : la synchro le dit (en-ligne.js redemande tout)
  const r2 = r.commande('A', mur(cases[4])), r3 = r.commande('A', mur(cases[5]));
  eq([a.s.evenement(ra.evt), a.s.evenement(r3.evt)], [true, false], 'la révision 3 sans la 2');
  a.s.instantane({ rev: r.rev, partie: JSON.parse(JSON.stringify(r.charger())) });
  eq(empreintePartie(a.s.locale), empreintePartie(r.charger()), 'l\'instantané : de nouveau à jour');
  void r2;
});

test('synchro : coupé, le joueur continue ; à la reconnexion, ses commandes renvoyées (le monde ne les joue qu\'une fois)', () => {
  const { r, cases } = monde();
  const a = joueur(r, 'A');
  const cs = [mur(cases[6]), mur(cases[7])];
  for (const c of cs) a.s.jouer(c);
  // la première était partie avant la coupure : le monde l'a jouée, mais A n'a rien reçu
  r.commande('A', cs[0]);
  // reconnexion : ce qui manque depuis sa révision, puis ses commandes en attente renvoyées
  const acc = r.accueil('A', { version: GAME_VERSION, depuis: a.s.rev });
  for (const e of acc.evts) a.s.evenement(e);
  eq(a.s.enAttente.map((c) => c.id), [cs[1].id], 'la première confirmée');
  for (const c of [...a.s.enAttente, cs[0]]) {   // (la première aussi, renvoyée par erreur : doublon)
    const rep = r.commande('A', c);
    if (rep.evt) a.s.evenement(rep.evt);
  }
  eq([r.rev, a.s.enAttente.length, empreintePartie(a.s.locale) === empreintePartie(r.charger())], [2, 0, true]);
});
