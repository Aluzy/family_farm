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
  addItem, allDevices, caseDansLaFerme, caseVue, commandeHorsDeLaFerme, countItem, createNewGame, DATA, HORS_FERME, HORS_FERME_ILE, ilePartagee, refusFrontiere, unirVu, voirAutour, empreintePartie, executerCommande, farmTerrain, findPlot, GAME_VERSION, hasTech, buildAtelier, morceauxDe, poserBloc, ramassables, testFillBatteries, testSetLevel, poseStatus, refusDuRole, roleDemande, runNight, sensible, techPoints, testBatir, testFarmMap, testFermeConstruite,
} from '../js/engine/index.js';
import { atelier, avecVillage, construireFrigo, fillSheep, garden, partie, pature, plantRipe, reach, setInv, setStraw, tireless } from './engine/aide.mjs';
import { empreinteDuMonde } from './engine/monde-de-la-graine.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTEUR_MONDE, COMMANDES_MONDE, dansLaFerme, etatDesLits, horsDeLaFerme, Monde, MONDE, MondeRegistre, SAUVEGARDES, SauvegardesMonde, traiterMessage } from '../worker/src/monde.mjs';

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
  s.eauMl = 200000;   // (E-5 : de l'eau pour arroser)
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
  eq(autres, [{ t: 'pos', acteur: B, nom: 'Sam', x: 100, y: 201, h: 0, img: '', flip: false }]);
  pos(B, 110, 210);
  eq(autres.length, 1, 'trop tôt : ignorée');
  horloge.t += MONDE.POS_MS;
  pos(B, 120, 220);
  eq(autres.length, 2);
  // son personnage : son image, son sens, sa hauteur, son allure ; une image au nom bizarre, une allure trop grosse : laissées
  horloge.t += MONDE.POS_MS;
  traiterMessage(r, B, JSON.stringify({ t: 'pos', x: 1, y: 2, h: 14, img: 'marche_cote_2', flip: true, look: { perso: 7 } }), () => {}, () => {}, (m) => autres.push(m));
  eq(autres[2], { t: 'pos', acteur: B, nom: 'Sam', x: 1, y: 2, h: 14, img: 'marche_cote_2', flip: true, look: { perso: 7 } });
  horloge.t += MONDE.POS_MS;
  traiterMessage(r, B, JSON.stringify({ t: 'pos', x: 1, y: 2, img: '<b>x</b>', look: { a: 'x'.repeat(2000) } }), () => {}, () => {}, (m) => autres.push(m));
  eq([autres[3].img, 'look' in autres[3]], ['', false]);
  autres.length = 2;
  // le nom montré : redit à la connexion (le prénom de son personnage)
  eq([r.renommer(B, 'Zoé'), r.renommer(B, 'Zoé'), r.membre(B).nom], [true, false, 'Zoé']);
  r.renommer(B, 'Sam');
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
  eq(msgs[0], [A, { t: 'parti', acteur: B }], 'A apprend que B est parti');
});

/* ---------- E-5 : le potager et la nuit partagée ---------- */

test('E-5 : les lits : la nuit vient quand tous les comptes connectés sont couchés (un compte, plusieurs onglets)', () => {
  eq(etatDesLits([]), { connectes: 0, couches: [], nuit: false });
  eq(etatDesLits([{ compte: A, couche: true }, { compte: B, couche: false }]), { connectes: 2, couches: [A], nuit: false });
  eq(etatDesLits([{ compte: A, couche: true }, { compte: B, couche: true }, { compte: B, couche: false }]).nuit, true, 'B couché dans un de ses onglets');
});

test('E-5 : le potager se joue en ligne ; la nuit ne se demande pas, le monde la joue : les plantes poussent, le jour change, le journal se rejoue', () => {
  const { r, sql } = monde();
  const s0 = r.charger();
  assert(COMMANDES_MONDE.has('potager.labourer') && COMMANDES_MONDE.has('potager.toutRecolter') && !COMMANDES_MONDE.has('nuit.partagee'));
  const avantCarottes = countItem(s0, 'carotte');
  const rec = r.commande(B, { id: id(), type: 'potager.recolter', args: { parcelle: 'potager-1', direct: true } });
  assert(rec.ok, rec.erreur);
  assert(countItem(r.charger(), 'carotte') > avantCarottes, 'la récolte va droit au coffre commun');
  // semer et arroser la parcelle vide, au nom de l'ami
  const graine = Object.keys(DATA.CULTURES).find((c) => r.charger() && executerCommande(JSON.parse(JSON.stringify(r.charger())), { type: 'potager.planter', args: { parcelle: 'potager-1', culture: c } }).ok);
  assert(graine, 'une graine à semer');
  for (const c of [{ type: 'potager.planter', args: { parcelle: 'potager-1', culture: graine } }, { type: 'potager.arroser', args: { parcelle: 'potager-1' } }]) {
    const x = r.commande(B, { id: id(), ...c });
    assert(x.ok, `${c.type} : ${x.erreur}`);
  }
  eq(r.commande(A, { id: id(), type: 'nuit.partagee', args: {} }).ok, false, 'un joueur ne demande pas la nuit');
  const jour = r.charger().day, stade = findPlot(r.charger(), 'potager-1').stade;
  const n = r.nuit();
  assert(n.ok, n.erreur);
  eq([n.evt.acteur, n.evt.cmd.type, r.charger().day], [ACTEUR_MONDE, 'nuit.partagee', jour + 1]);
  assert(findPlot(r.charger(), 'potager-1').stade > stade, 'la plante arrosée a poussé');
  // (le Durable Object réveillé rejoue le journal, la nuit comprise : la même partie)
  const r2 = new MondeRegistre(sql);
  eq(empreintePartie(r2.charger()), empreintePartie(r.charger()));
});

test('E-5 : le Durable Object : « se coucher » est dit à tous ; le dernier couché fait passer la nuit, chacun se relève ; un départ aussi', () => {
  const { r } = monde();
  const msgs = [];
  const ws = (c) => { let att = null; return { c, send: (m) => msgs.push([c, JSON.parse(m)]), close() {}, serializeAttachment: (a) => { att = a; }, deserializeAttachment: () => att }; };
  const wa = ws(A), wb = ws(B), sockets = [wa, wb];
  const d = Object.create(Monde.prototype);
  Object.assign(d, { registre: r, ctx: { getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c] } });
  const dire = (w, m) => d.webSocketMessage(w, JSON.stringify(m));
  const jour = r.charger().day;
  dire(wa, { t: 'coucher', oui: true });
  eq(msgs.map(([c, m]) => [c, m.t, m.comptes, m.connectes]), [[A, 'couches', [A], 2], [B, 'couches', [A], 2]]);
  eq(r.charger().day, jour, 'B est debout : pas de nuit');
  msgs.length = 0;
  dire(wb, { t: 'coucher', oui: true });
  eq(msgs.filter(([, m]) => m.t === 'evt').map(([c, m]) => [c, m.acteur, m.cmd.type]), [[A, ACTEUR_MONDE, 'nuit.partagee'], [B, ACTEUR_MONDE, 'nuit.partagee']]);
  eq([r.charger().day, wa.deserializeAttachment().couche, wb.deserializeAttachment().couche], [jour + 1, false, false], 'le jour suivant ; tous levés');
  // B couché, A part : B est seul, couché : la nuit passe
  dire(wb, { t: 'coucher', oui: true });
  sockets.splice(0, 1);
  d.webSocketClose(wa, 1000);
  eq(r.charger().day, jour + 2, 'A parti, la nuit de B passe');
});

/* ---------- E-6 : les bêtes ---------- */

test('E-6 : les bêtes en ligne : le monde ne ramasse pas (les tas entrent au coffre à sa création) ; nourrir, tondre, la nuit : tout va droit au coffre ; le journal se rejoue', () => {
  const s = pature();
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok, 'le Poulailler');
  s.poulailler.poules = 2;
  addItem(s, 'ble', 10);
  fillSheep(s, 1);
  setStraw(s, 10);
  s.paturage.moutons[0].laine = DATA.ANIMAUX.mouton.joursLaine;
  s.ramassage = true;
  s.aRamasser = { poulailler: { lieu: 'poulailler', ref: null, items: { oeuf: 3 } } };
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  r.ajouterMembre(B, 'Sam');
  const w = r.charger();
  eq([w.ramassage, Object.keys(w.aRamasser || {}).length, countItem(w, 'oeuf')], [false, 0, countItem(s, 'oeuf') + 3], 'le tas d\'œufs au coffre');
  for (const c of [{ type: 'poules.toutNourrir', args: {} }, { type: 'etable.tondre', args: { mouton: w.paturage.moutons[0].id } }, { type: 'etable.herbes', args: { oui: false } }]) {
    const x = r.commande(B, { id: id(), ...c });
    assert(x.ok, `${c.type} : ${x.erreur}`);
  }
  eq([w.poulailler.nourries, countItem(w, 'laine')], [2, 1], 'les poules nourries, la laine au coffre');
  eq(r.commande(B, { id: id(), type: 'etable.tondre', args: { mouton: w.paturage.moutons[0].id } }).ok, false, 'pas deux tontes');
  const oeufs = countItem(w, 'oeuf');
  assert(r.nuit().ok);
  assert(countItem(r.charger(), 'oeuf') > oeufs && !Object.keys(r.charger().aRamasser || {}).length, 'les œufs de la nuit au coffre, pas en tas');
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()), 'le journal se rejoue');
});

/* ---------- E-7 : la cuisine ---------- */

test('E-7 : la cuisine en ligne : une recette lancée finit pendant la nuit partagée ; le frigo, manger ; les arguments vérifiés', () => {
  const s = atelier();
  s.eauMl = 200000;
  addItem(s, 'oeuf', 6);
  addItem(s, 'huile', 2);
  addItem(s, 'carotte', 5);
  s.pieces = 5000;
  assert(construireFrigo(reach(s, 'frigo')).ok, 'le frigo');
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  r.ajouterMembre(B, 'Sam');
  const jouer = (type, args) => { const x = r.commande(B, { id: id(), type, args }); assert(x.ok, `${type} : ${x.erreur}`); return x; };
  jouer('cuisine.lancer', { recette: 'omelette' });
  const w = r.charger();
  eq([countItem(w, 'oeuf'), countItem(w, 'omelette')], [3, 0], 'les œufs pris, l\'omelette pas encore là (l\'horloge est figée)');
  jouer('frigo.ranger', { objet: 'carotte', quantite: 2 });
  jouer('frigo.sortir', { objet: 'carotte', quantite: 1 });
  eq(countItem(w, 'carotte'), 4, 'une carotte reste au frigo');
  jouer('manger', { objet: 'carotte' });
  eq(countItem(w, 'carotte'), 3, 'une carotte mangée sur le pouce');
  eq(r.commande(B, { id: id(), type: 'manger', args: { objet: 'licorne' } }).ok, false, 'un objet inconnu est refusé');
  eq(r.commande(B, { id: id(), type: 'cuisine.lancer', args: { recette: 'omelette', en_plus: 1 } }).ok, false, 'un argument inconnu est refusé');
  assert(r.nuit().ok);
  assert(countItem(r.charger(), 'omelette') >= 1, 'l\'omelette est prête au matin');
});

test('E-7 : le journal de la cuisine se rejoue à l\'identique (la nuit comprise)', () => {
  const s = atelier();
  s.eauMl = 200000;
  addItem(s, 'oeuf', 6);
  addItem(s, 'huile', 2);
  addItem(s, 'carotte', 5);
  s.pieces = 5000;
  assert(construireFrigo(reach(s, 'frigo')).ok, 'le frigo');
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  for (const [type, args] of [['cuisine.lancer', { recette: 'omelette' }], ['frigo.ranger', { objet: 'carotte', quantite: 2 }], ['frigo.toutRanger', {}], ['manger', { objet: 'carotte' }]]) r.commande(A, { id: id(), type, args });
  assert(r.nuit().ok);
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()));
});

/* ---------- E-8 : la ferme, frontière du monde ---------- */

test('E-8 : la copie mise en ligne perd le grand monde (la partie locale le garde) ; mondePartage est posé', () => {
  const s = partieLocale();
  s.monde.habitants = { hameau_1: { foyers: [{ membres: [{ id: 'h1' }] }] } };
  s.monde.pris = { x: 1 };
  s.monde.but = { sorte: 'hameau', id: 'hameau_1' };
  const avant = JSON.stringify(s);
  const r = new MondeRegistre(baseSql());
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  const w = r.charger();
  eq([w.mondePartage, JSON.stringify(w.monde.habitants), JSON.stringify(w.monde.pris), w.monde.but], [true, '{}', '{}', null]);
  eq(JSON.stringify(s), avant, 'la partie locale est intacte');
});

test('E-8 : une commande qui vise une case hors de la ferme est refusée par le monde ; dans la ferme, elle passe', () => {
  const { r } = monde();
  const w = r.charger(), T = farmTerrain(w), F = T.FERME;
  const dehors = (F.Y + 2) * T.LARGEUR + F.X - 3, dedans = casesLibres(w, 1)[0];
  eq([dansLaFerme(w, dehors), dansLaFerme(w, dedans)], [false, true]);
  const a = r.commande(A, poser(dehors));
  eq(a.ok, false);
  assert(/Hors de la ferme/.test(a.erreur), a.erreur);
  eq(r.commande(A, { id: id(), type: 'bloc.deplacer', args: { de: dedans, vers: dehors } }).ok, false, 'pas vers dehors non plus');
  assert(r.commande(A, poser(dedans)).ok, 'dans la ferme');
});

/* ---------- I9a : l'île partagée ---------- */

// Une île du chantier « l'île à bâtir », mise en ligne : une partie neuve du chantier, devenue partie d'essai (le
// réglage éteint, elle reste sur l'île : villageActif), ses murs en main.
function ileLocale(graine = '13') {
  const s = avecVillage(() => createNewGame(graine, { nom: 'Île' }));
  s.essais = { ...(s.essais || {}), village: true };
  addItem(s, DATA.ATELIER.BLOCS.mur_pierre.objet, 20);
  return s;
}

test('I9a : la frontière est au moteur (le jeu la vérifie comme le monde) ; une ferme d\'avant garde son mot, l\'île partagée a le sien', () => {
  eq([horsDeLaFerme === commandeHorsDeLaFerme, dansLaFerme === caseDansLaFerme], [true, true], 'le même code des deux côtés');
  // une ferme d'avant (le chantier éteint) : comme avant
  const { r } = monde();
  const w = r.charger(), T = farmTerrain(w), F = T.FERME;
  const dehors = (F.Y + 2) * T.LARGEUR + F.X - 3;
  eq([ilePartagee(w), refusFrontiere(w, { case: dehors }), r.commande(A, poser(dehors)).erreur], [false, HORS_FERME, HORS_FERME]);
  // l'île partagée : hors de la ferme, rien d'autre n'est encore synchronisé ; dans la ferme, comme avant
  const s = ileLocale();
  const ri = new MondeRegistre(baseSql());
  assert(ri.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  const wi = ri.charger(), Ti = farmTerrain(wi), Fi = Ti.FERME;
  eq([ilePartagee(wi), wi.mondePartage], [true, true]);
  const dehorsI = (Fi.Y + 2) * Ti.LARGEUR + Fi.X - 3, dedansI = casesLibres(wi, 1)[0];
  eq([refusFrontiere(wi, { case: dehorsI }), ri.commande(A, poser(dehorsI)).erreur], [HORS_FERME_ILE, HORS_FERME_ILE]);
  eq(refusFrontiere(wi, { arbre: '3,3' }), HORS_FERME_ILE, 'un arbre de l\'île');
  eq(refusFrontiere(wi, { case: dedansI }), null);
  assert(ri.commande(A, poser(dedansI)).ok, 'dans la ferme');
});

test('I9a : le monde créé chez l\'invité (un autre processus, de la graine) est identique à celui de l\'hôte ; son brouillard ne touche que son vu', () => {
  const s = ileLocale('29');
  const hote = empreinteDuMonde(s);
  const r = new MondeRegistre(baseSql());
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  r.ajouterMembre(B, 'Sam', 'batisseur');
  const a = r.accueil(B, { version: GAME_VERSION });
  assert(a.ok && a.partie, 'l\'invité reçoit la partie du monde');
  const dossier = mkdtempSync(join(tmpdir(), 'ile-')), f = join(dossier, 'partie.json');
  writeFileSync(f, JSON.stringify(a.partie));
  const p = spawnSync(process.execPath, [fileURLToPath(new URL('./engine/monde-de-la-graine.mjs', import.meta.url)), f], { encoding: 'utf8' });
  rmSync(dossier, { recursive: true, force: true });
  assert(p.status === 0, p.stderr);
  const invite = JSON.parse(p.stdout);
  eq(invite, hote, 'la même île : la carte, le terrain, les éléments, les régions de la ferme, de sa sortie et du port');
  assert(hote.vues.length >= 2 && hote.elements, 'l\'empreinte regarde l\'île, pas seulement la ferme');
  // (le brouillard de chacun, posé sur sa partie locale, ne change que son vu : ni ses régions vues, ni la confirmée)
  const locale = JSON.parse(JSON.stringify(a.partie)), confirmee = empreintePartie(a.partie);
  const autre = JSON.parse(JSON.stringify(a.partie)), Tl = farmTerrain(autre);
  let loin = Tl.MONDE.cadre.SORTIE;
  while (caseVue(a.partie, loin)) loin += 8;   // (vers l'est, la première case que le monde n'a pas vue)
  voirAutour(autre, loin, { biome: 'prairie' });
  const vues = JSON.stringify(locale.monde.vues);
  eq([unirVu(locale, autre.monde.vu), unirVu(locale, autre.monde.vu), JSON.stringify(locale.monde.vues), empreintePartie(a.partie)], [true, false, vues, confirmee]);
  assert(caseVue(locale, loin) && !caseVue(a.partie, loin), 'vu chez lui seulement');
});

test('E-8 : la nuit d\'un monde partagé ne fait que la ferme ; 30 nuits sur une copie élaguée, le journal se rejoue', () => {
  // (la même nuit, en solo et dans un monde partagé : seul le solo fait vivre le grand monde)
  const solo = partieLocale(), part = JSON.parse(JSON.stringify(solo));
  part.mondePartage = true;
  runNight(solo); runNight(part);
  eq([solo.nuit.amitie !== undefined, part.nuit.amitie === undefined, part.nuit.projets === undefined], [true, true, true]);
  const { r, sql } = monde();
  for (let i = 0; i < 30; i++) { const n = r.nuit(); assert(n.ok, `nuit ${i + 1} : ${n.erreur}`); }
  eq(r.charger().day, partieLocale().day + 30);
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()));
});

/* ---------- E-9 : les outils de la ferme ---------- */

test('E-9 : les outils en ligne : hache, pioche, faux, canne ; ce qui tombe va au coffre (pas de morceaux) ; hors de la ferme, refusé ; le journal se rejoue', () => {
  const s = partieLocale();
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  s.morceaux = [{ n: 1, item: 'bois', carte: 'ferme', x: 10, y: 10 }];
  s.morceauxN = 1;
  const bois0 = countItem(s, 'bois');
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  const w = r.charger(), T = farmTerrain(w);
  eq([w.morceaux.length, countItem(w, 'bois')], [0, bois0 + 1], 'le morceau au sol est entré au coffre à la mise en ligne');
  const jouer = (type, args) => r.commande(A, { id: id(), type, args });
  const arbre = Object.keys(T.ARBRES).find((k) => dansLaFerme(w, Number(k.split(',')[1]) * T.LARGEUR + Number(k.split(',')[0])));
  const c = jouer('outil.couper', { arbre });
  assert(c.ok, c.erreur);
  eq([countItem(r.charger(), 'bois') > bois0 + 1, r.charger().morceaux.length], [true, 0], 'le bois au coffre, rien au sol');
  const rocher = Object.keys(T.ROCHERS)[0];
  const p0 = countItem(r.charger(), 'pierre');
  const pio = jouer('outil.casser', { rocher });
  if (pio.ok) assert(countItem(r.charger(), 'pierre') > p0, 'la pierre au coffre');
  else assert(/caillou|main/i.test(pio.erreur), pio.erreur);
  eq(jouer('outil.couper', { arbre: '3,3' }).erreur, 'Hors de la ferme : en ligne, le monde partagé, c\'est la ferme.', 'un arbre du grand monde');
  assert(/Hors de la ferme/.test(jouer('outil.pecher', { eau: 'lac' }).erreur), 'le lac est du grand monde');
  eq(jouer('outil.couper', { arbre: 'abc' }).ok, false, 'un id mal formé');
  eq(jouer('outil.faucherAutour', { touffes: [] }).ok, false, 'une liste vide');
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()), 'le journal se rejoue');
});

/* ---------- E-10 : la progression commune ---------- */

test('E-10 : la progression est commune : l\'ami achète une technologie et fabrique à l\'Atelier ; un appareil se bascule ; les arguments vérifiés ; le journal se rejoue', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  s.atelier = { construit: true, niveau: 1 };
  s.pieces = 50000;
  for (const it of ['bois', 'pierre', 'fibre', 'planche', 'fer', 'ble', 'laine', 'cuir']) if (DATA.OBJETS[it]) addItem(s, it, 200);
  techPoints(s).solde = 1000;
  // (une technologie que la partie peut acheter, et une recette qu'elle peut fabriquer : cherchées sur une copie)
  const essai = (type, args) => executerCommande(JSON.parse(JSON.stringify(s)), { type, args }).ok;
  const noeud = Object.keys(DATA.ARBRE.noeuds).find((n) => essai('tech.acheter', { noeud: n }));
  const recette = Object.keys(DATA.ATELIER.RECETTES).find((r) => essai('atelier.fabriquer', { recette: r }));
  const appareil = allDevices(s).map((d) => d.id).find((d) => essai('appareil.basculer', { appareil: d }));
  assert(noeud && recette && appareil, `de quoi essayer : ${noeud}, ${recette}, ${appareil}`);
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  r.ajouterMembre(B, 'Sam');
  const jouer = (type, args) => r.commande(B, { id: id(), type, args });
  const solde = techPoints(r.charger()).solde;
  for (const [type, args] of [['tech.acheter', { noeud }], ['atelier.fabriquer', { recette }], ['appareil.basculer', { appareil }]]) {
    const x = jouer(type, args);
    assert(x.ok, `${type} : ${x.erreur}`);
  }
  eq([hasTech(r.charger(), noeud), techPoints(r.charger()).solde < solde], [true, true], 'la technologie est au monde, ses points dépensés');
  eq(jouer('tech.acheter', { noeud }).ok, false, 'déjà acquise');
  for (const [type, args] of [['tech.acheter', { noeud: 'inexistant' }], ['atelier.fabriquer', { recette: 'licorne' }], ['atelier.construire', { station: 'fusee' }], ['appareil.basculer', { appareil: 'a b' }], ['arbre.planter', { sorte: 'mur_pierre', case: -1 }]]) {
    eq(jouer(type, args).ok, false, `${type} ${JSON.stringify(args)} refusé`);
  }
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()), 'le journal se rejoue');
});

/* ---------- E-11 : les rôles ---------- */

test('E-11 : la table des rôles : le potager pour l\'ami jardinier, Construire pour le bâtisseur, une structure sensible pour le propriétaire seul', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  eq(['potager.arroser', 'etable.tondre', 'frigo.ranger', 'outil.couper', 'bloc.poser', 'tech.acheter', 'frigo.acheter', 'etable.place'].map((type) => roleDemande(s, { type, args: {} })),
    ['jardinier', 'jardinier', 'jardinier', 'jardinier', 'batisseur', 'batisseur', 'batisseur', 'batisseur']);
  const c = Number(Object.keys(s.blocs).find((k) => sensible(s.blocs[k])));
  assert(Number.isInteger(c), 'une structure sensible sur la ferme d\'essai');
  eq(roleDemande(s, { type: 'bloc.reprendre', args: { case: c } }), 'proprietaire');
  const mur = Number(Object.keys(s.blocs).find((k) => !sensible(s.blocs[k])));
  eq(roleDemande(s, { type: 'bloc.reprendre', args: { case: mur } }), 'batisseur', 'un bloc ordinaire');
  eq([refusDuRole('visiteur', s, { type: 'potager.arroser', args: {} }) !== null, refusDuRole('jardinier', s, { type: 'potager.arroser', args: {} }), refusDuRole('inconnu', s, { type: 'manger', args: {} }) !== null], [true, null, true]);
});

test('E-11 : l\'invitation donne un rôle ; le monde refuse ce que le rôle ne permet pas ; le propriétaire change les rôles, lui seul ; le journal', async () => {
  const { r } = monde();
  const w = r.charger(), [t1, t2] = casesLibres(w, 2);
  const inv = await r.inviter(A, 'jardinier');
  eq((await r.inviter(A, 'roi')).ok, false, 'un rôle inconnu');
  const C = 'c-jardinier';
  const j = await r.rejoindre(C, 'Lou', inv.secret);
  eq([j.ok, j.role, r.membre(C).role], [true, 'jardinier', 'jardinier']);
  const p = r.commande(C, poser(t1));
  eq(p.ok, false);
  assert(/Ami jardinier/.test(p.erreur), p.erreur);
  const ar = r.commande(C, { id: id(), type: 'potager.arroser', args: { parcelle: 'potager-1' } });
  assert(ar.ok || !/rôle/.test(ar.erreur), 'arroser n\'est pas refusé pour le rôle');
  eq([r.changerRole(C, C, 'batisseur').ok, r.changerRole(B, C, 'batisseur').ok, r.changerRole(A, A, 'visiteur').ok], [false, false, false], 'ni lui, ni un autre membre, ni le propriétaire pour lui-même');
  eq(r.changerRole(A, C, 'batisseur').ok, true);
  assert(r.commande(C, poser(t2)).ok, 'bâtisseur, il construit');
  eq(r.changerRole(A, C, 'visiteur').ok, true);
  assert(/Visiteur/.test(r.commande(C, { id: id(), type: 'manger', args: { objet: 'carotte' } }).erreur || ''), 'visiteur, il ne mange pas le coffre');
  // le journal : au propriétaire seul, du plus récent au plus ancien, avec les noms
  eq(r.journal(C).ok, false);
  const jr = r.journal(A);
  eq([jr.ok, jr.evts[0].nom, jr.evts[0].type, jr.evts.map((e) => e.rev)], [true, 'Lou', 'bloc.poser', [...jr.evts.map((e) => e.rev)].sort((a, b) => b - a)]);
  eq(r.journal(A, jr.evts[0].rev).evts.every((e) => e.rev < jr.evts[0].rev), true, 'la page d\'avant');
});

test('E-11 : une base d\'avant (invitations sans rôle) se reprend : la colonne s\'ajoute, une fois', async () => {
  const sql = baseSql();
  sql.exec('CREATE TABLE invitations (hash TEXT PRIMARY KEY, cree INTEGER NOT NULL, expire INTEGER NOT NULL, par TEXT)');
  const r = new MondeRegistre(sql);
  new MondeRegistre(sql);   // (un deuxième réveil : rien ne casse)
  assert(r.creer({ proprietaire: A, partie: partieLocale() }).ok);
  const inv = await r.inviter(A, 'visiteur');
  eq((await r.rejoindre(B, 'Sam', inv.secret)).role, 'visiteur');
});

/* ---------- E-12 : les sauvegardes du monde ---------- */

// Un bucket R2 en mémoire (put, get, list, delete).
function fauxBucket() {
  const m = new Map();
  return {
    m,
    async put(k, v, o = {}) { m.set(k, { v, o }); },
    async get(k) { const x = m.get(k); return x ? { text: async () => x.v } : null; },
    async delete(k) { m.delete(k); },
    async list({ prefix }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: m.get(k).v.length, customMetadata: m.get(k).o.customMetadata })), truncated: false }; },
  };
}

test('E-12 : les sauvegardes : de la plus récente à la plus ancienne, les GARDER dernières gardées, rien d\'un autre monde', async () => {
  const b = fauxBucket(), S = new SauvegardesMonde(b, 'mondes/abc/'), autre = new SauvegardesMonde(b, 'mondes/xyz/');
  for (let i = 1; i <= SAUVEGARDES.GARDER + 2; i++) await S.sauver({ day: i }, { rev: i, jour: i, raison: 'nuit', t: 1000 * i });
  await autre.sauver({ day: 99 }, { rev: 1, jour: 99, raison: 'main', t: 5 });
  const L = await S.liste();
  eq([L.length, L[0].rev, L[L.length - 1].rev], [SAUVEGARDES.GARDER, SAUVEGARDES.GARDER + 2, 3]);
  eq((await S.lire(L[0].cle)).s, { day: SAUVEGARDES.GARDER + 2 });
  eq([await S.lire((await autre.liste())[0].cle), await S.lire('mondes/abc/../xyz/x.json')], [null, null], 'pas la sauvegarde d\'un autre monde');
});

test('E-12 : le propriétaire sauvegarde et restaure (par les routes du Durable Object) : la partie revient, pour tous, le journal le dit ; une nuit sauvegarde seule', async () => {
  const sql = baseSql(), bucket = fauxBucket(), msgs = [], sockets = [];
  const ctx = { storage: { sql }, id: { toString: () => 'abc' }, getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c], waitUntil: (p) => p };
  const d = new Monde(ctx, { SESSIONS: bucket });
  const req = (chemin, compte, corps, methode = corps ? 'POST' : 'GET') => d.fetch(new Request('https://monde/monde/' + chemin, { method: methode, headers: { 'X-Compte': compte, 'X-Nom': 'X', 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined })).then(async (r) => ({ statut: r.status, ...(await r.json()) }));
  assert((await req('creer', A, { partie: { v: partieLocale().version, t: 0, s: partieLocale() }, titre: 'La ferme' })).ok);
  d.registre.ajouterMembre(B, 'Sam');
  const r = d.registre, [t1] = casesLibres(r.charger(), 1);
  const avant = empreintePartie(r.charger());
  const sv = await req('sauvegardes', A, {});
  eq([sv.ok, sv.sauvegarde.rev], [true, 0]);
  eq((await req('sauvegardes', B)).statut, 403, 'un membre ne les voit pas');
  assert(r.commande(B, poser(t1)).ok);
  const ws = (c) => ({ c, send: (m) => msgs.push([c, JSON.parse(m)]), close() {} });
  sockets.push(ws(A), ws(B));
  const res = await req('restaurer', A, { cle: sv.sauvegarde.cle });
  eq([res.ok, res.rev, empreintePartie(r.charger())], [true, 2, avant], 'la partie d\'avant le mur');
  eq(msgs.filter(([, m]) => m.t === 'instantane' || m.t === 'restaure').map(([c, m]) => [c, m.t]), [[A, 'instantane'], [B, 'instantane'], [A, 'restaure'], [B, 'restaure']]);
  eq((await req('sauvegardes', A)).sauvegardes.map((x) => x.raison), ['avant-restauration', 'main'], 'la partie d\'avant la restauration est sauvée aussi');
  eq((await req('restaurer', A, { cle: 'mondes/xyz/000000000000001-1.json' })).statut, 404);
  eq(r.journal(A).evts[0].type, 'monde.restaurer');
  // (réveillé, le monde refait la partie restaurée ; un joueur en retard la reçoit entière)
  eq(empreintePartie(new MondeRegistre(sql).charger()), avant);
  assert(!!r.accueil(B, { version: GAME_VERSION, depuis: 1 }).partie, 'en retard d\'une restauration : la partie entière');
  // une nuit : sauvée seule
  r.positions.clear();
  for (const w of sockets) { w.serializeAttachment = (a) => { w.att = a; }; w.deserializeAttachment = () => w.att; }
  await d.webSocketMessage(sockets[0], JSON.stringify({ t: 'coucher', oui: true }));
  await d.webSocketMessage(sockets[1], JSON.stringify({ t: 'coucher', oui: true }));
  await new Promise((ok) => setTimeout(ok, 20));
  eq((await req('sauvegardes', A)).sauvegardes[0].raison, 'nuit');
});

/* ---------- E-13 : les machines de l'Atelier ---------- */

// Une ferme générée, l'Atelier construit, le niveau 10 (les chaînes, la botteleuse), et les blocs `sortes`
// posés à la suite sur une rangée d'herbe libre : la case du premier (comme tests/engine/chaines.test.mjs).
function usineAvec(graine, sortes) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  testSetLevel(s, 10);
  testFillBatteries(s);
  const T = farmTerrain(s), W = T.LARGEUR, w = sortes.length + 2;
  let t = null;
  for (let r = 5; r < T.HAUTEUR - 5 && t === null; r++) {
    for (let c = 4; c < W - w - 4 && t === null; c++) {
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) t = r * W + c;
    }
  }
  sortes.forEach((sorte, k) => { addItem(s, sorte, 1); const x = poserBloc(s, sorte, t + k); assert(x.ok, `poser ${sorte} : ${x.error}`); });
  return { s, t };
}
function enLigneDe(s) {
  const sql = baseSql(), r = new MondeRegistre(sql);
  assert(r.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  r.ajouterMembre(B, 'Sam', 'jardinier');
  return { r, sql, jouer: (type, args) => r.commande(B, { id: id(), type, args }) };
}

test('E-13 : une chaîne en ligne : l\'ami jardinier y verse ses graines ; l\'horloge figée, la chaîne fait sa journée à la nuit partagée ; son produit se ramasse ; le journal se rejoue', () => {
  const { s, t } = usineAvec('huile', ['entonnoir', 'pressoir', 'convoyeur']);
  setInv(s, { graine_tournesol: 7 });
  const { r, sql, jouer } = enLigneDe(s);
  const v = jouer('chaine.verser', { case: t });
  assert(v.ok, v.erreur);
  eq(jouer('chaine.verser', { case: t }).ok, false, 'elle a déjà de quoi faire');
  eq(morceauxDe(r.charger(), 'ferme').length, 0, 'le jour, rien ne sort (l\'horloge est figée)');
  assert(r.nuit().ok);
  const m = morceauxDe(r.charger(), 'ferme');
  eq([m.length, m[0].item], [1, 'huile'], 'à la nuit, l\'huile est sur son tas');
  const p = jouer('morceau.ramasser', { n: m[0].n });
  assert(p.ok, p.erreur);
  eq([countItem(r.charger(), 'huile'), jouer('morceau.ramasser', { n: m[0].n }).ok], [1, false], 'au coffre, une seule fois');
  eq(empreintePartie(new MondeRegistre(sql).charger()), empreintePartie(r.charger()), 'le journal se rejoue');
});

test('E-13 : une botteleuse en ligne : les fibres versées, la botte sort tout de suite, sa paille au coffre ; la cueillette à la main, pas hors de la ferme', () => {
  const B2 = DATA.BOTTELEUSE;
  const { s, t } = usineAvec('botte', ['entonnoir', 'botteleuse', 'convoyeur', 'convoyeur']);
  setInv(s, { fibre: B2.FIBRES + 5 });
  const { r, jouer } = enLigneDe(s);
  const v = jouer('botteleuse.verser', { case: t });
  assert(v.ok, v.erreur);
  const paille0 = countItem(r.charger(), 'paille');
  const b = jouer('botteleuse.sortir', { case: t + 1 });
  assert(b.ok, b.erreur);
  eq([countItem(r.charger(), 'paille') - paille0, morceauxDe(r.charger(), 'ferme').length], [B2.PAILLE, 0], 'la paille au coffre, rien au sol');
  eq(jouer('botteleuse.sortir', { case: t + 1 }).ok, false, 'une seule botte');
  const q = ramassables(r.charger())[0];
  if (q) assert(jouer('cueillette.ramasser', { cueillette: q.id }).ok, 'la cueillette');
  assert(/Hors de la ferme/.test(jouer('cueillette.ramasser', { cueillette: 'branche:5' }).erreur), 'hors de la ferme');
});
