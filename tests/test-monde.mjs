// Tests du monde partagé (E-1 : worker/src/monde.mjs). La base SQLite du Durable Object est simulée par
// node:sqlite ; le moteur est celui du jeu. Les huit cas obligatoires de l'axe E (la vision) :
//   deux joueurs posent sur la même case ; déconnexion pendant une commande ; reconnexion avec des
//   événements manquants ; retrait d'autorisation en cours de session ; tentatives de duplication ; deux
//   récoltes concurrentes ; propriétaire absent ; changement de version du jeu.
// Et : le Durable Object qui se réveille refait la même partie (instantané + journal).
// Lancer seul : node tests/test-monde.mjs (ou node tests/run-tests.mjs monde).

import { test as nodeTest } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  addItem, countItem, DATA, empreintePartie, executerCommande, findPlot, GAME_VERSION, poseStatus,
} from '../js/engine/index.js';
import { partie, plantRipe } from './engine/aide.mjs';
import { COMMANDES_MONDE, Monde, MONDE, MondeRegistre, traiterMessage } from '../worker/src/monde.mjs';

const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

function baseSql() {
  const db = new DatabaseSync(':memory:');
  return { db, exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
}

const A = 'c-proprio', B = 'c-ami';
let n = 0;
const id = () => `cmd-${++n}-xyz`;

// Une partie locale à mettre en ligne : le foyer bâti, des murs en main, une carotte mûre.
function partieLocale() {
  const s = partie();
  addItem(s, DATA.ATELIER.BLOCS.mur_pierre.objet, 60);
  addItem(s, DATA.ATELIER.BLOCS.plancher.objet, 5);
  plantRipe(s, 'potager-1', 'carotte');
  return s;
}
// Des cases où un mur se pose.
function casesLibres(s, k) {
  const out = [];
  for (let t = 0; t < 644 * 400 && out.length < k; t += 7) if (poseStatus(s, 'mur_pierre', t).ok) out.push(t);
  return out;
}
function monde() {
  const sql = baseSql();
  const r = new MondeRegistre(sql);
  const s = partieLocale();
  const c = r.creer({ proprietaire: A, nom: 'Alex', partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) }, titre: 'La ferme' });
  assert(c.ok, c.erreur);
  r.ajouterMembre(B, 'Sam', 'batisseur');
  return { r, sql, s };
}
const poser = (t, cid = id()) => ({ id: cid, type: 'bloc.poser', args: { sorte: 'mur_pierre', case: t } });

test('monde : créé par la copie d\'une partie (F.4) ; la partie locale n\'est pas touchée ; la nuit n\'y est pas encore', () => {
  const { r, s } = monde();
  const avant = empreintePartie(s);
  eq([r.rev, r.fiche().titre, r.fiche().membres.map((m) => m.role)], [0, 'La ferme', ['proprietaire', 'batisseur']]);
  assert(empreintePartie(s) === avant, 'la partie locale reste intacte');
  assert(!COMMANDES_MONDE.has('nuit.dormir') && COMMANDES_MONDE.has('bloc.poser') && COMMANDES_MONDE.has('potager.recolter'));
  eq(r.creer({ proprietaire: A, partie: s }).ok, false, 'une seule fois');
});

test('axe E 1 : deux joueurs posent sur la même case : le premier arrivé l\'a, le second est refusé par le moteur', () => {
  const { r } = monde();
  const [t] = casesLibres(r.charger(), 1);
  // (au même instant : l'un un mur, l'autre un plancher ; l'ordre d'arrivée au monde décide)
  const a = r.commande(A, poser(t)), b = r.commande(B, { id: id(), type: 'bloc.poser', args: { sorte: 'plancher', case: t } });
  eq([a.ok, a.rev, b.ok], [true, 1, false]);
  assert(/pas sous un mur/i.test(b.erreur), b.erreur);
  eq(r.rev, 1, 'rien d\'autre au journal');
});

test('axe E 2 et 5 : une commande renvoyée (déconnexion, double envoi) n\'est jouée qu\'une fois ; un id pris par un autre est refusé', () => {
  const { r } = monde();
  const [t] = casesLibres(r.charger(), 1);
  const avant = countItem(r.charger(), DATA.ATELIER.BLOCS.mur_pierre.objet);
  const c = poser(t, 'cmd-renvoyee-1');
  const a1 = r.commande(A, c), a2 = r.commande(A, c), a3 = r.commande(A, { ...c, args: { sorte: 'mur_pierre', case: t + 1 } });
  eq([a1.ok, a1.rev, a2.ok, a2.rev, a2.doublon, a3.doublon], [true, 1, true, 1, true, true], 'le même accusé, rien de rejoué');
  eq(countItem(r.charger(), DATA.ATELIER.BLOCS.mur_pierre.objet), avant - 1, 'un seul mur pris');
  eq(r.commande(B, c).ok, false, 'l\'id d\'un autre');
  eq(r.commande(A, { type: 'bloc.poser', args: c.args }).ok, false, 'sans id : refusée');
});

test('axe E 3 et 7 : propriétaire absent, l\'ami joue ; au retour, le propriétaire rattrape les commandes manquées et a la même partie', () => {
  const { r } = monde();
  // (le propriétaire a vu la révision 0, puis s'est absenté)
  const chezA = JSON.parse(JSON.stringify(r.accueil(A, { version: GAME_VERSION }).partie));
  const cases = casesLibres(r.charger(), 3);
  for (const t of cases) assert(r.commande(B, poser(t)).ok, 'l\'ami pose');
  assert(r.commande(B, { id: id(), type: 'potager.recolter', args: { parcelle: 'potager-1' } }).ok, 'l\'ami récolte');
  const a = r.accueil(A, { version: GAME_VERSION, depuis: 0 });
  eq([a.ok, a.rev, a.evts.length, a.evts.map((e) => e.acteur)], [true, 4, 4, [B, B, B, B]]);
  for (const e of a.evts) assert(executerCommande(chezA, e.cmd).ok, 'rejouée chez lui');
  eq(empreintePartie(chezA), empreintePartie(r.charger()), 'la même partie que le monde');
  // trop en retard (le journal ne remonte pas jusque-là) : la partie entière
  assert('partie' in r.accueil(A, { version: GAME_VERSION, depuis: 99 }) && !('evts' in r.accueil(A, { version: GAME_VERSION, depuis: 99 })), 'une révision inconnue : l\'instantané');
});

test('axe E 4 : un membre révoqué en cours de session : ses commandes refusées, son accueil aussi, sa connexion fermée', () => {
  const { r } = monde();
  const [t1, t2] = casesLibres(r.charger(), 2);
  assert(r.commande(B, poser(t1)).ok);
  eq(r.revoquer(B).ok, true);
  eq(r.commande(B, poser(t2)).ok, false);
  eq(r.accueil(B, { version: GAME_VERSION }).raison, 'membre');
  eq(r.revoquer(A).ok, false, 'le propriétaire ne se révoque pas');
  // (le Durable Object : la diffusion ferme la connexion de qui n'est plus membre)
  const fermees = [], recus = { [A]: [], [B]: [] };
  const ws = (c) => ({ c, send: (m) => recus[c].push(JSON.parse(m)), close: (code) => fermees.push([c, code]) });
  const sockets = [ws(A), ws(B)];
  const d = Object.create(Monde.prototype);
  Object.assign(d, { registre: r, ctx: { getWebSockets: () => sockets, getTags: (w) => [w.c] } });
  d.diffuser({ t: 'evt', rev: 9 });
  eq([fermees, recus[A].length, recus[B].length], [[[B, 4003]], 1, 0]);
});

test('axe E 6 : deux récoltes concurrentes de la même parcelle : une seule réussit, la récolte n\'est donnée qu\'une fois', () => {
  const { r } = monde();
  const s = r.charger(), avant = countItem(s, 'carotte');
  const a = r.commande(A, { id: id(), type: 'potager.recolter', args: { parcelle: 'potager-1' } });
  const b = r.commande(B, { id: id(), type: 'potager.recolter', args: { parcelle: 'potager-1' } });
  eq([a.ok, b.ok], [true, false]);
  assert(countItem(s, 'carotte') > avant && findPlot(s, 'potager-1').culture === null, 'récoltée une fois (F.1 : dans le coffre commun)');
});

test('axe E 8 : un jeu d\'une autre version est refusé à l\'accueil (« recharge la page »)', () => {
  const { r } = monde();
  const a = r.accueil(A, { version: '0.0.1' });
  eq([a.ok, a.raison], [false, 'version']);
  assert(/recharge la page/.test(a.erreur));
  eq(r.accueil('c-inconnu', { version: GAME_VERSION }).raison, 'membre');
});

test('monde : le Durable Object réveillé refait la même partie (le dernier instantané, puis le journal) ; le journal se compacte', () => {
  const { r, sql } = monde();
  const cases = casesLibres(r.charger(), MONDE.INSTANTANE_TOUS + 5);
  for (const t of cases) assert(r.commande(t % 2 ? A : B, poser(t)).ok);
  const empreinte = empreintePartie(r.charger()), rev = r.rev;
  eq(sql.db.prepare('SELECT MAX(rev) AS r FROM instantane').get().r, MONDE.INSTANTANE_TOUS, 'un instantané à la révision 20');
  const reveil = new MondeRegistre(sql);
  eq([empreintePartie(reveil.charger()), reveil.rev], [empreinte, rev], 'la même partie, la même révision');
  eq(reveil.commande(A, poser(cases[0], 'cmd-' + 1)).doublon, undefined, 'un nouvel id : une nouvelle commande');
});

test('monde : les messages (hello, cmd) et la diffusion à tous les joueurs connectés', () => {
  const { r } = monde();
  const [t] = casesLibres(r.charger(), 1);
  const a = [], tous = [];
  traiterMessage(r, A, JSON.stringify({ t: 'hello', version: GAME_VERSION }), (m) => a.push(m), (m) => tous.push(m));
  eq([a[0].t, a[0].rev, a[1].t], ['bienvenue', 0, 'instantane']);
  traiterMessage(r, A, JSON.stringify({ t: 'cmd', ...poser(t, 'cmd-msg-1') }), (m) => a.push(m), (m) => tous.push(m));
  eq(a[2], { t: 'ack', id: 'cmd-msg-1', ok: true, rev: 1 });
  eq([tous.length, tous[0].t, tous[0].acteur, tous[0].cmd.args.case], [1, 'evt', A, t]);
  traiterMessage(r, B, JSON.stringify({ t: 'hello', version: GAME_VERSION, depuis: 0 }), (m) => a.push(m), () => {});
  eq([a[3].t, a[4].t, a[4].evts.length], ['bienvenue', 'rattrape', 1]);
  traiterMessage(r, B, 'pas du json', (m) => a.push(m), () => {});
  eq(a[5].t, 'erreur');
  traiterMessage(r, B, JSON.stringify({ t: 'cmd', id: 'cmd-nuit-1', type: 'nuit.dormir', args: {} }), (m) => a.push(m), () => {});
  assert(a[6].ok === false && /pas encore en ligne/.test(a[6].erreur), 'la nuit partagée : plus tard (F.2)');
});

test('monde : les routes du Worker : mettre sa ferme en ligne, la retrouver dans ses mondes, sa fiche ; refusé sans session ou sans être membre', async () => {
  const W = (await import('../worker/src/index.js')).default;
  const { Comptes } = await import('../worker/src/comptes.mjs');
  const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
  const mondes = new Map();
  const env = {
    COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (req) => comptes.fetch(req) }) },
    MONDES: { idFromName: (x) => x, get: (x) => { if (!mondes.has(x)) mondes.set(x, new Monde({ storage: { sql: baseSql() } }, {})); return { fetch: (req) => mondes.get(x).fetch(req) }; } },
  };
  // un compte connecté (le lien demandé puis suivi, directement au registre des comptes)
  const l = await comptes.registre.demanderLien('alex@exemple.fr');
  const { session } = await comptes.registre.connecter(l.jeton);
  const ORIGINE = 'https://aluzy.github.io';
  const req = (chemin, { methode = 'GET', corps, sess = session } = {}) => new Request('https://w.example' + chemin, {
    method: methode, headers: { Origin: ORIGINE, 'Content-Type': 'application/json', ...(sess ? { Authorization: `Bearer ${sess}` } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const s = partieLocale();
  eq((await W.fetch(req('/mondes', { methode: 'POST', corps: { partie: s }, sess: '' }), env)).status, 401, 'sans session');
  const cree = await (await W.fetch(req('/mondes', { methode: 'POST', corps: { partie: { v: s.version, t: 0, s }, titre: 'Chez Alex' } }), env)).json();
  assert(cree.ok && /^m-/.test(cree.monde), JSON.stringify(cree));
  const liste = await (await W.fetch(req('/mondes'), env)).json();
  eq(liste.mondes.map((m) => [m.monde, m.titre, m.role]), [[cree.monde, 'Chez Alex', 'proprietaire']]);
  const fiche = await (await W.fetch(req(`/mondes/${cree.monde}/fiche`), env)).json();
  eq([fiche.ok, fiche.titre, fiche.rev, fiche.membres.length], [true, 'Chez Alex', 0, 1]);
  // un autre compte : pas membre
  const l2 = await comptes.registre.demanderLien('sam@exemple.fr');
  const autre = await comptes.registre.connecter(l2.jeton);
  eq((await W.fetch(req(`/mondes/${cree.monde}/fiche`, { sess: autre.session }), env)).status, 403, 'pas membre');
  eq((await W.fetch(req('/mondes/pas-un-id/fiche'), env)).status, 404);
  eq((await W.fetch(req('/mondes'), {})).status, 503, 'sans Durable Objects : pas encore ouvert');
  eq((await W.fetch(req(`/mondes/${cree.monde}/ws`), env)).status, 426, 'la connexion : une WebSocket attendue');
});

/* ---------- E-3 : inviter, rejoindre, retirer ---------- */

test('E-3 : le propriétaire invite ; le lien ne sert qu\'une fois, à un seul compte ; un lien expiré est refusé', async () => {
  const sql = baseSql(), horloge = { t: Date.UTC(2026, 10, 5) };
  const r = new MondeRegistre(sql, () => horloge.t);
  const s = partieLocale();
  r.creer({ proprietaire: A, partie: s });
  eq((await r.inviter(B)).statut, 403, 'un autre que le propriétaire n\'invite pas');
  const inv = await r.inviter(A);
  assert(inv.ok && /^[A-Za-z0-9_-]{32}$/.test(inv.secret));
  const j = await r.rejoindre(B, 'Sam', inv.secret);
  eq([j.ok, j.role, r.membre(B).role], [true, 'batisseur', 'batisseur']);
  eq((await r.rejoindre(B, 'Sam', inv.secret)).ok, true, 'le même compte, de nouveau : toujours membre');
  eq((await r.rejoindre('c-troisieme', 'Lou', inv.secret)).statut, 410, 'déjà servi');
  const vieux = await r.inviter(A);
  horloge.t += (MONDE.INVITATION_JOURS + 1) * 24 * 3600 * 1000;
  eq((await r.rejoindre('c-troisieme', 'Lou', vieux.secret)).statut, 410, 'expiré');
  eq((await r.rejoindre('c-troisieme', 'Lou', 'pas-un-secret')).statut, 400);
  assert(!sql.db.prepare('SELECT * FROM invitations').all().some((x) => JSON.stringify(x).includes(inv.secret)), 'seulement l\'empreinte du secret');
});

test('E-3 : retirer un membre ferme sa connexion ouverte tout de suite ; il ne revient pas par un ancien lien', async () => {
  const sql = baseSql();
  const fermees = [];
  const sockets = [{ c: A, close: () => fermees.push(A), send() {} }, { c: B, close: (code) => fermees.push([B, code]), send() {} }];
  const ctx = { storage: { sql }, getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c] };
  const d = new Monde(ctx, {});
  d.registre.creer({ proprietaire: A, partie: partieLocale() });
  const inv = await d.registre.inviter(A);
  const appel = async (chemin, compte, corps) => (await d.fetch(new Request(`https://monde/monde/${chemin}`, { method: 'POST', headers: { 'X-Compte': compte, 'X-Nom': 'x', 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }))).json();
  eq((await appel('rejoindre', B, { secret: inv.secret })).ok, true);
  eq((await appel('retirer', B, { compte: A })).ok, false, 'un bâtisseur ne retire personne');
  eq((await appel('retirer', A, { compte: B })).ok, true);
  eq(fermees, [[B, 4003]], 'la connexion de B fermée, pas celle de A');
  eq(d.registre.membre(B), null);
  const inv2 = await d.registre.inviter(A);
  eq((await appel('rejoindre', B, { secret: inv2.secret })).ok, false, 'retiré : un nouveau lien ne le fait pas revenir');
});

test('E-3 : les routes du Worker : créer un lien, le suivre (le monde dans la liste de l\'ami), retirer l\'ami (plus dans sa liste)', async () => {
  const W = (await import('../worker/src/index.js')).default;
  const { Comptes } = await import('../worker/src/comptes.mjs');
  const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
  const mondes = new Map();
  const env = {
    COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (q) => comptes.fetch(q) }) },
    MONDES: { idFromName: (x) => x, get: (x) => { if (!mondes.has(x)) mondes.set(x, new Monde({ storage: { sql: baseSql() }, getWebSockets: () => [], getTags: () => [] }, {})); return { fetch: (q) => mondes.get(x).fetch(q) }; } },
  };
  const connecte = async (email) => { const l = await comptes.registre.demanderLien(email); return comptes.registre.connecter(l.jeton); };
  const a = await connecte('alex@exemple.fr'), b = await connecte('sam@exemple.fr');
  const req = (chemin, sess, corps) => new Request('https://w.example' + chemin, { method: corps === undefined ? 'GET' : 'POST', headers: { Origin: 'https://aluzy.github.io', 'Content-Type': 'application/json', Authorization: `Bearer ${sess}` }, body: corps === undefined ? undefined : JSON.stringify(corps) });
  const j = async (q) => (await W.fetch(q, env)).json();
  const s = partieLocale();
  const m = await j(req('/mondes', a.session, { partie: s, titre: 'Chez Alex' }));
  eq((await j(req(`/mondes/${m.monde}/invitations`, b.session, {}))).ok, false, 'pas membre : pas de lien');
  const inv = await j(req(`/mondes/${m.monde}/invitations`, a.session, {}));
  assert(inv.ok && inv.lien.includes(`#invitation=${m.monde}.`), JSON.stringify(inv));
  const rj = await j(req('/rejoindre', b.session, { code: inv.code }));
  eq([rj.ok, rj.monde, rj.titre], [true, m.monde, 'Chez Alex']);
  eq((await j(req('/mondes', b.session))).mondes.map((x) => [x.monde, x.role]), [[m.monde, 'batisseur']], 'dans la liste de l\'ami');
  eq((await j(req(`/mondes/${m.monde}/fiche`, b.session))).membres.length, 2);
  eq((await j(req('/rejoindre', b.session, { code: 'n-importe-quoi' }))).ok, false);
  const ret = await j(req(`/mondes/${m.monde}/retirer`, a.session, { compte: b.compte.id }));
  eq(ret.ok, true);
  eq((await j(req('/mondes', b.session))).mondes, [], 'plus dans sa liste');
  eq((await W.fetch(req(`/mondes/${m.monde}/fiche`, b.session), env)).status, 403, 'plus membre');
});

/* ---------- E-4 : la présence ---------- */

test('E-4 : une position est relayée aux autres membres (pas à soi), 5 par seconde au plus, jamais écrite ; le départ est dit', () => {
  const sql = baseSql(), horloge = { t: 1000 };
  const r = new MondeRegistre(sql, () => horloge.t);
  r.creer({ proprietaire: A, partie: partieLocale() });
  r.ajouterMembre(B, 'Sam');
  const tables = () => JSON.stringify(['meta', 'instantane', 'journal', 'membres', 'invitations'].map((t) => sql.db.prepare(`SELECT * FROM ${t}`).all()));
  const avant = tables(), soi = [], autres = [];
  const pos = (compte, x, y) => traiterMessage(r, compte, JSON.stringify({ t: 'pos', x, y }), (m) => soi.push(m), () => {}, (m) => autres.push(m));
  pos(B, 100.4, 200.6);
  eq(autres, [{ t: 'pos', acteur: B, nom: 'Sam', x: 100, y: 201 }]);
  pos(B, 110, 210);
  eq(autres.length, 1, 'trop tôt : ignorée');
  horloge.t += MONDE.POS_MS;
  pos(B, 120, 220);
  eq(autres.length, 2);
  horloge.t += 1000;
  pos(B, 'abc', 3); pos(B, 1e9, 3); pos('c-inconnu', 5, 5);
  eq([autres.length, soi.length], [2, 0], 'invalide ou pas membre : ignorée ; rien à soi');
  eq(tables(), avant, 'rien d\'écrit');
  // le départ : son dernier onglet fermé
  const fermes = [], msgs = [];
  const ws = (c) => ({ c, send: (m) => msgs.push([c, JSON.parse(m)]), close: () => fermes.push(c) });
  const sockets = [ws(A), ws(B)];
  const d = Object.create(Monde.prototype);
  Object.assign(d, { registre: r, ctx: { getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c] } });
  sockets.splice(1, 1);   // (la connexion de B s'est fermée)
  d.webSocketClose(ws(B), 1000);
  eq(msgs, [[A, { t: 'parti', acteur: B }]], 'A apprend que B est parti');
});
