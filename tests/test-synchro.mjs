// Tests de la synchro d'un monde en ligne chez le joueur (E-2 : js/ui/synchro.js) : la partie confirmée
// (celle du monde), la partie locale (la confirmée + les commandes en attente rejouées par-dessus).
// Le monde est le vrai (worker/src/monde.mjs, base node:sqlite), le moteur aussi.
// Lancer seul : node tests/test-synchro.mjs (ou node tests/run-tests.mjs synchro).

import { test as nodeTest } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { addItem, blocAt, caseVue, createNewGame, DATA, empreintePartie, executerCommande, farmTerrain, GAME_VERSION, HORS_FERME_ILE, ilePartagee, poseStatus, refusFrontiere, testBatir, testSetLevel, unirVu, voirAutour } from '../js/engine/index.js';
import { avecVillage, partie } from './engine/aide.mjs';
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

test('I9a : l\'île partagée : chacun garde son brouillard sur sa partie locale (posé à chaque fois qu\'elle est refaite) ; la confirmée reste celle du monde ; hors de la ferme, le geste est refusé avant d\'être envoyé', () => {
  const db = new DatabaseSync(':memory:');
  const r = new MondeRegistre({ exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } });
  const ile = avecVillage(() => createNewGame('17', { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  addItem(ile, DATA.ATELIER.BLOCS.mur_pierre.objet, 20);
  assert(r.creer({ proprietaire: 'A', partie: ile }).ok);
  r.ajouterMembre('B', 'Sam');
  // le brouillard de B : ce que son personnage a vu, hors de la partie du monde (en-ligne.js le garde par monde)
  const w = r.charger(), T = farmTerrain(w);
  let loin = T.MONDE.cadre.SORTIE;
  while (caseVue(w, loin)) loin += 8;
  const vu = JSON.parse(JSON.stringify(w));
  voirAutour(vu, loin, { biome: 'prairie' });
  const brouillard = vu.monde.vu;
  const a = r.accueil('B', { version: GAME_VERSION });
  const b = new Synchro({ partie: a.partie, rev: a.rev, executerCommande, quandRefaite: (locale) => unirVu(locale, brouillard) });
  unirVu(b.locale, brouillard);
  eq([ilePartagee(b.locale), caseVue(b.locale, loin), caseVue(b.confirmee, loin)], [true, true, false]);
  // un geste de A (dans la ferme) : la partie de B est refaite, son brouillard reposé ; la confirmée, celle du monde
  const cases = [];
  for (let t = 0; t < 644 * 400 && cases.length < 2; t += 7) if (poseStatus(w, 'mur_pierre', t).ok) cases.push(t);
  const rep = r.commande('A', mur(cases[0]));
  assert(rep.ok, rep.erreur);
  assert(b.evenement({ rev: rep.evt.rev, cmd: rep.evt.cmd }));
  eq([blocAt(b.locale, cases[0]), caseVue(b.locale, loin), empreintePartie(b.confirmee) === empreintePartie(r.charger())], ['mur_pierre', true, true]);
  // hors de la ferme : refusé avant d'être envoyé (en-ligne.js, jouerEnLigne), comme le monde le refuse
  const F = T.FERME, dehors = (F.Y + 3) * T.LARGEUR + F.X - 4, c = mur(dehors);
  eq([refusFrontiere(b.locale, c.args), r.commande('B', c).erreur], [HORS_FERME_ILE, HORS_FERME_ILE]);
});

/* ---------- I9a2 : l'horloge commune d'une île ---------- */

// Une île du chantier en ligne (une partie d'essai), la Cuisine bâtie, des murs et de quoi faire des omelettes ; le
// monde a son horloge (h.t, en ms), un joueur aussi (son décalage : `avance` ms d'avance sur le serveur).
function ileEnLigne() {
  const ile = avecVillage(() => createNewGame('17', { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  testSetLevel(ile, 5);
  for (const st of ['foyer', 'cuisine']) if (!testBatir(ile, st).ok) throw new Error(st);
  for (const ing of DATA.RECETTES.omelette.ingredients) addItem(ile, ing.item, ing.qte * 40);
  addItem(ile, DATA.ATELIER.BLOCS.mur_pierre.objet, 80);
  const db = new DatabaseSync(':memory:'), h = { t: 1_700_000_000_000 };
  const r = new MondeRegistre({ exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } }, () => h.t);
  r.creer({ proprietaire: 'A', partie: ile });
  r.ajouterMembre('B', 'Sam');
  r.ajouterMembre('C', 'Cam');
  const cases = [];
  for (let t = 0; t < 644 * 400 && cases.length < 200; t += 7) if (poseStatus(r.charger(), 'mur_pierre', t).ok) cases.push(t);
  return { r, h, cases };
}
function joueurIle(r, compte, o = {}) {
  const a = r.accueil(compte, { version: GAME_VERSION });
  return new Synchro({ partie: a.partie, rev: a.rev, executerCommande, moi: compte, horloge: a.horloge, ...o });
}
// (la partie locale montre l'énergie du joueur : pour la comparer à celle du monde, celle de la partie)
const commeLeMonde = (locale, monde_) => empreintePartie({ ...locale, energie: monde_.energie });

test('I9a2 : deux joueurs et le monde ont la même partie après une heure de pas (720), des gestes de chacun entre deux ; chacun a son énergie', () => {
  const { r, h, cases } = ileEnLigne();
  const a = joueurIle(r, 'A'), b = joueurIle(r, 'B');
  let k = 0, n = 0;
  const debut = h.t;
  while (h.t < debut + 3600 * 1000) {
    h.t += 1000;
    a.avancer(h.t); b.avancer(h.t + 300);   // (B a 300 ms d'avance : son horloge n'est pas tout à fait la nôtre)
    if (++k % 37) continue;
    // un geste, de A ou de B : joué chez lui, envoyé, joué par le monde, diffusé à tous
    const qui = n % 2 ? b : a, compte = n % 2 ? 'B' : 'A';
    const c = n % 3 === 2 ? { id: `c-om-${n}`, type: 'cuisine.lancer', args: { recette: 'omelette' } } : mur(cases[n]);
    n += 1;
    qui.jouer(c);
    const rep = r.commande(compte, c);
    if (rep.ok) { assert(a.evenement(rep.evt) && b.evenement(rep.evt), 'reçu dans l\'ordre'); } else qui.refusee(c.id);
  }
  r.avancer(h.t);
  a.avancer(h.t); b.avancer(h.t);
  const w = r.charger();
  eq([w.horloge.pas >= 719, a.locale.horloge.pas, b.locale.horloge.pas, w.day > 4], [true, w.horloge.pas, w.horloge.pas, true], 'les mêmes pas, cinq journées');
  a.avancerConfirmee(w.horloge.pas); b.avancerConfirmee(w.horloge.pas);
  const em = empreintePartie(w);
  eq([empreintePartie(a.confirmee), empreintePartie(b.confirmee), commeLeMonde(a.locale, w), commeLeMonde(b.locale, w)], [em, em, em, em], 'la même partie partout');
  eq([a.enAttente.length, b.enAttente.length], [0, 0]);
  assert(w.energies.A !== undefined && w.energies.B !== undefined && a.locale.energie === w.energies.A && b.locale.energie === w.energies.B, `chacun voit la sienne : ${JSON.stringify(w.energies)}`);
});

test('I9a2 : un joueur en retard (déconnecté une minute) rattrape sans écart ; un joueur en avance (son horloge avance de 7 s) se refait sans écart', () => {
  const { r, h, cases } = ileEnLigne();
  const a = joueurIle(r, 'A'), b = joueurIle(r, 'B');
  let n = 0;
  const geste = (s, compte) => { const c = mur(cases[n++]); s.jouer(c); const rep = r.commande(compte, c); return rep.evt; };
  h.t += 20000; a.avancer(h.t); b.avancer(h.t);
  const e1 = geste(a, 'A');
  a.evenement(e1); b.evenement(e1);
  // B se coupe : il ne reçoit plus rien, son horloge ne tourne plus ; A joue
  for (let i = 0; i < 6; i++) { h.t += 10000; a.avancer(h.t); a.evenement(geste(a, 'A')); }
  // B revient : le monde lui donne ce qui lui manque depuis sa révision et son pas, puis son horloge
  h.t += 2000;
  const acc = r.accueil('B', { version: GAME_VERSION, depuis: b.rev, pas: b.confirmee.horloge.pas });
  assert(acc.evts && acc.evts.length === 6, 'le journal (moins de 60 pas de retard)');
  for (const e of acc.evts) assert(b.evenement(e));
  b.ancrer(acc.horloge);
  b.avancer(h.t); a.avancer(h.t);
  const w = r.charger();
  eq([b.locale.horloge.pas, empreintePartie(b.confirmee), commeLeMonde(b.locale, w), commeLeMonde(a.locale, w)], [w.horloge.pas, empreintePartie(w), empreintePartie(w), empreintePartie(w)], 'B a rattrapé sans écart');
  // C a une horloge qui avance de 7 s : sa partie locale va plus loin que le monde ; un geste de A, au pas du monde,
  // la refait (la confirmée suit de MARGE pas en arrière : toujours derrière le monde)
  const c = joueurIle(r, 'C');
  let refaites = 0;
  c.quandRefaite = () => { refaites += 1; };
  for (let i = 0; i < 4; i++) {
    h.t += 4000;
    a.avancer(h.t); c.avancer(h.t + 7000);
    assert(c.locale.horloge.pas > r.charger().horloge.pas || i === 0, 'C est en avance');
    const e = geste(a, 'A');
    assert(c.evenement(e) && a.evenement(e), `l'événement au pas ${e.cmd.pas}, la confirmée de C au pas ${c.confirmee.horloge.pas}`);
    c.avancer(h.t + 7000);
  }
  assert(refaites >= 3, `refaite à chaque geste de l'autre (${refaites})`);
  r.avancer(h.t + 7000);
  const w2 = r.charger();
  c.avancerConfirmee(w2.horloge.pas);
  eq([empreintePartie(c.confirmee), commeLeMonde(c.locale, w2), c.locale.horloge.pas], [empreintePartie(w2), empreintePartie(w2), w2.horloge.pas], 'C, à l\'heure du monde, a la même partie');
});

test('I9a2 : mon geste confirmé à un autre pas que celui où je l\'ai joué refait ma partie (au bon pas) ; au même pas, non ; l\'heure entre deux pas', () => {
  const { r, h, cases } = ileEnLigne();
  const a = joueurIle(r, 'A');
  let refaites = 0;
  a.quandRefaite = () => { refaites += 1; };
  h.t += 6000;
  a.avancer(h.t);
  eq([a.fraction(h.t), a.fraction(h.t + 2500)], [0.2, 0.7], 'la part du pas écoulée');
  const c1 = mur(cases[0]);
  a.jouer(c1);
  a.evenement(r.commande('A', c1).evt);
  eq(refaites, 0, 'au même pas : rien à refaire');
  const c2 = mur(cases[1]);
  a.jouer(c2);
  h.t += 5000;   // (le geste arrive au monde un pas plus tard)
  a.evenement(r.commande('A', c2).evt);
  eq(refaites, 1, 'un pas plus tard : la partie refaite');
  a.avancer(h.t);
  eq(commeLeMonde(a.locale, r.charger()), empreintePartie(r.charger()));
});
