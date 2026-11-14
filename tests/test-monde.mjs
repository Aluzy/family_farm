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
import { clockHours, dureeDuPas, energieDe, horlogeVivante, nightActive, pasDe } from '../js/engine/index.js';
import { cheminDehorsSur, migrate, objetsDeRegion, regionVue, solDirect, STATE_VERSION, surCase } from '../js/engine/index.js';
import { capacitePortage, chargeDuCompte, COMMANDES_DEHORS, COMMANDES_DU_PORT, comptoirDuPort, enVenteAuPort, lieuPort, prixIle } from '../js/engine/index.js';
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

test('I9a, I9b : la frontière est au moteur (le jeu la vérifie comme le monde) ; une ferme d\'avant garde son mot ; l\'île partagée ouvre les gestes du dehors', () => {
  eq([horsDeLaFerme === commandeHorsDeLaFerme, dansLaFerme === caseDansLaFerme], [true, true], 'le même code des deux côtés');
  // une ferme d'avant (le chantier éteint) : comme avant
  const { r } = monde();
  const w = r.charger(), T = farmTerrain(w), F = T.FERME;
  const dehors = (F.Y + 2) * T.LARGEUR + F.X - 3;
  eq([ilePartagee(w), refusFrontiere(w, { case: dehors }), r.commande(A, poser(dehors)).erreur], [false, HORS_FERME, HORS_FERME]);
  eq([refusFrontiere(w, { piece: 'feuillu:40,40' }, 'monde.recolter'), r.commande(A, { id: id(), type: 'monde.recolter', args: { piece: 'feuillu:40,40' } }).erreur], [HORS_FERME, HORS_FERME], 'I9b : une pièce du monde, pas dans une ferme d\'avant');
  // l'île partagée (I9b) : hors de la ferme, les gestes du dehors passent (le moteur les vérifie : un mur ne se pose pas
  // dehors) ; les autres sont refusés à la frontière ; dans la ferme, comme avant
  const s = ileLocale();
  const ri = new MondeRegistre(baseSql());
  assert(ri.creer({ proprietaire: A, partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } }).ok);
  const wi = ri.charger(), Ti = farmTerrain(wi), Fi = Ti.FERME;
  eq([ilePartagee(wi), wi.mondePartage], [true, true]);
  const dehorsI = (Fi.Y + 2) * Ti.LARGEUR + Fi.X - 3, dedansI = casesLibres(wi, 1)[0];
  eq([refusFrontiere(wi, { case: dehorsI }), refusFrontiere(wi, { case: dehorsI }, 'bloc.poser'), refusFrontiere(wi, { case: dehorsI }, 'potager.labourer')], [HORS_FERME_ILE, null, HORS_FERME_ILE]);
  assert(/pas hors de la ferme/.test(ri.commande(A, poser(dehorsI)).erreur), 'un mur dehors : le moteur le refuse');
  eq(refusFrontiere(wi, { arbre: '3,3' }, 'outil.couper'), HORS_FERME_ILE, 'un arbre de la ferme, hors d\'elle : pas de sens');
  eq([refusFrontiere(wi, { eau: 'lac' }, 'outil.pecher'), refusFrontiere(wi, { piece: 'feuillu:40,40' }, 'monde.recolter')], [null, null], 'pêcher au lac, récolter une pièce du monde');
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

/* ---------- I9a2 : l'horloge commune d'un monde de l'île ---------- */

// Une île du chantier mise en ligne (une partie d'essai : villageActif), la Cuisine et le foyer bâtis, de quoi faire
// des omelettes ; `heure` : l'heure de la partie à sa mise en ligne. Le monde a une horloge à lui (`t`, en ms).
function ileEnLigne({ heure = 6, graine = '17' } = {}) {
  const ile = avecVillage(() => createNewGame(graine, { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  testSetLevel(ile, 5);
  for (const st of ['foyer', 'cuisine']) assert(testBatir(ile, st).ok, `bâtir ${st}`);
  for (const ing of DATA.RECETTES.omelette.ingredients) addItem(ile, ing.item, ing.qte * 20);
  addItem(ile, DATA.ATELIER.BLOCS.mur_pierre.objet, 40);
  ile.awakeMs = (heure - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  const sql = baseSql(), h = { t: 1_700_000_000_000 };
  const r = new MondeRegistre(sql, () => h.t);
  assert(r.creer({ proprietaire: A, nom: 'Alex', partie: { v: ile.version, t: 0, s: ile } }).ok);
  r.ajouterMembre(B, 'Sam', 'batisseur');
  return { r, sql, h };
}
// Le même monde, servi par son Durable Object (des WebSockets simulées, comme celles d'un Durable Object : ce qu'elles
// gardent d'elles, E-5) : les messages reçus par chacun ; `dire(compte, m)`, `partir(compte)`.
function ileServie(o = {}) {
  const sql = baseSql(), h = { t: 1_700_000_000_000 }, sockets = [], msgs = [], bucket = fauxBucket();
  const ctx = { storage: { sql }, id: { toString: () => 'ile' }, getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c], waitUntil: (p) => p };
  const d = new Monde(ctx, { SESSIONS: bucket });
  d.registre.maintenant = () => h.t;
  const ile = avecVillage(() => createNewGame(o.graine || '17', { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  ile.awakeMs = ((o.heure || 6) - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  addItem(ile, DATA.ATELIER.BLOCS.mur_pierre.objet, 40);
  assert(d.registre.creer({ proprietaire: A, nom: 'Alex', partie: { v: ile.version, t: 0, s: ile } }).ok);
  d.registre.ajouterMembre(B, 'Sam', 'batisseur');
  const ws = (c) => { let att = null; return { c, send: (m) => msgs.push([c, JSON.parse(m)]), close() {}, serializeAttachment: (a) => { att = a; }, deserializeAttachment: () => att }; };
  const de = (c) => sockets.find((w) => w.c === c);
  const dire = (c, m) => d.webSocketMessage(de(c), JSON.stringify(m));
  const entrer = (c) => { sockets.push(ws(c)); dire(c, { t: 'hello', version: GAME_VERSION }); };
  const partir = (c) => { const w = sockets.filter((x) => x.c === c).pop(); sockets.splice(sockets.indexOf(w), 1); d.webSocketClose(w, 1000); };
  return { d, r: d.registre, sql, h, msgs, bucket, dire, entrer, partir };
}
const PAS = DATA.VILLAGE.EN_LIGNE.PAS_MS, C = 'c-trois';

test('I9a2 : un monde de l\'île a une horloge vivante : sans joueur, il dort ; le premier qui arrive le réveille là où il s\'était arrêté, sans rattrapage ; le dernier qui part l\'endort', () => {
  const { r, sql, h } = ileEnLigne();
  const s = r.charger();
  eq([s.mondePartage, s.horloge, r.actif], [true, { pas: 0, sommeil: false, reveils: 0 }, false]);
  h.t += 3600 * 1000;
  eq(r.avancer().pas, 0, 'personne : rien ne tourne');
  const a = r.accueil(A, { version: GAME_VERSION });
  eq([a.horloge.pas, a.horloge.reel, a.horloge.maintenant, 'dormait' in a.horloge, r.actif], [0, h.t, h.t, false, true], 'le premier arrive : l\'horloge part de là');
  h.t += 60 * 1000;
  eq([r.avancer().pas, pasDe(r.charger())], [12, 12], 'une minute : 12 pas de 5 s');
  h.t += 2500;
  eq(r.avancer().pas, 0, 'un demi-pas : rien');
  const jour = r.charger().day, heure = clockHours(r.charger());
  h.t += 2500;
  eq(r.endormir().pas, 13, 'le dernier part : les pas dus, puis le sommeil');
  h.t += 3 * 3600 * 1000;
  eq(r.avancer().pas, 0, 'trois heures sans personne : rien');
  const b = r.accueil(B, { version: GAME_VERSION });
  eq([b.horloge.pas, b.horloge.dormait, r.charger().day, Math.round(clockHours(r.charger()) * 600)], [13, 3 * 3600 * 1000, jour, Math.round(heure * 600) + 100], 'il reprend où il s\'était arrêté (et le dit)');
  // le Durable Object évincé : réveillé à froid, la même partie, la même heure, le même pas
  h.t += 7000;
  r.avancer();
  const froid = new MondeRegistre(sql, () => h.t);
  froid.charger();
  froid.avancer();   // (réveillé, il rejoue l'instantané, puis les pas dus jusqu'à l'heure)
  eq([empreintePartie(froid.charger()), froid.reel, froid.actif, pasDe(froid.charger())], [empreintePartie(r.charger()), r.reel, true, 14]);
});

test('I9a2 : chaque geste porte son pas ; le Durable Object réveillé à froid rejoue le journal pas à pas (la même empreinte) ; l\'énergie est celle de chacun', () => {
  const { r, sql, h } = ileEnLigne();
  r.accueil(A, { version: GAME_VERSION });
  const cases = casesLibres(r.charger(), 6);
  const evts = [], attendus = [];
  let ecoule = 0;
  for (const [k, c] of cases.entries()) {
    h.t += 7300 + k * 1100;
    ecoule += 7300 + k * 1100;
    attendus.push(Math.floor(ecoule / PAS));
    const x = r.commande(k % 2 ? B : A, poser(c));
    assert(x.ok, x.erreur);
    evts.push(x.evt);
  }
  eq(evts.map((e) => e.cmd.pas), attendus, 'le pas où le monde était à l\'arrivée de chaque geste');
  assert(evts.every((e) => Number.isFinite(e.reel) && e.reel <= h.t), 'l\'heure réelle du pas');
  const om = r.commande(B, { id: id(), type: 'cuisine.lancer', args: { recette: 'omelette' } });
  assert(om.ok, om.erreur);
  const s = r.charger();
  // (l'énergie de A, le propriétaire, est celle de sa partie à la mise en ligne ; B, arrivé, avait l'énergie pleine et a
  // lancé une omelette ; celle de la partie du monde ne bouge pas)
  eq(s.energies[A], s.energie, 'A : celle de sa partie, qu\'il n\'a pas dépensée (poser un mur ne coûte rien)');
  assert(s.energies[B] < energieDe(s, 'c-inconnu'), `B a dépensé la sienne : ${JSON.stringify(s.energies)}`);
  h.t += 30000;
  r.avancer();
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();   // (le journal rejoué pas à pas, puis les pas dus jusqu'à l'heure)
  eq([empreintePartie(froid.charger()), froid.reel], [empreintePartie(r.charger()), r.reel], 'le même monde, à la même heure');
});

test('I9a2 : une préparation finit à son heure (dans les pas, pas à la nuit) ; le soir, la nuit vient seule à 22 h', () => {
  const { r, h } = ileEnLigne({ heure: 21 });
  r.accueil(A, { version: GAME_VERSION });
  const om = r.commande(B, { id: id(), type: 'cuisine.lancer', args: { recette: 'omelette' } });
  assert(om.ok, om.erreur);
  const prete = Math.ceil((DATA.RECETTES.omelette.temps * 1000) / PAS);
  h.t += (prete - 1) * PAS;
  r.avancer();
  assert(r.charger().stations.cuisine.tache, 'pas encore');
  h.t += PAS;
  r.avancer();
  eq([r.charger().stations.cuisine.tache, nightActive(r.charger())], [null, false], `prête au pas ${prete}`);
  h.t += 3600 * 1000 / 60;   // (une minute réelle, deux heures de jeu : 22 h passé)
  r.avancer();
  assert(nightActive(r.charger()), 'la nuit est venue seule');
});

test('I9a2 : le Durable Object : tous couchés, la nuit file dix fois plus vite (temps.sommeil) ; un seul debout, elle garde son pas ; au réveil, chacun se lève ; qui arrive pendant la nuit arrive debout', () => {
  const { r, h, msgs, dire, entrer, partir } = ileServie({ heure: 21.5 });
  entrer(A); entrer(B);
  dire(A, { t: 'coucher', oui: true });
  eq(msgs.filter(([, m]) => m.t === 'couches').pop()[1], { t: 'couches', comptes: [A], connectes: 2 });
  h.t += 30000 + PAS;   // (22 h passé)
  r.avancer();
  const s = r.charger();
  assert(nightActive(s) && !s.horloge.sommeil, 'la nuit, à son pas : B est debout');
  eq(dureeDuPas(s), PAS);
  msgs.length = 0;
  dire(B, { t: 'coucher', oui: true });
  const evt = msgs.find(([, m]) => m.t === 'evt');
  eq([evt && evt[1].acteur, evt && evt[1].cmd.type, evt && evt[1].cmd.args, s.horloge.sommeil, dureeDuPas(s)], [ACTEUR_MONDE, 'temps.sommeil', { oui: true }, true, PAS / 10], 'tous couchés : la nuit file');
  // C arrive : il arrive debout, la nuit reprend son pas ; il repart : tous couchés de nouveau
  r.ajouterMembre(C, 'Cam', 'visiteur');
  entrer(C);
  eq([r.charger().horloge.sommeil, msgs.filter(([, m]) => m.t === 'evt').pop()[1].cmd.args], [false, { oui: false }], 'C est debout');
  partir(C);
  eq(r.charger().horloge.sommeil, true);
  const jour = s.day;
  h.t += 60 * 1000;   // (une minute réelle : la nuit entière, à 0,5 s le pas, en 48 s)
  msgs.length = 0;
  r.avancer();
  eq([s.day, nightActive(s), s.horloge.sommeil, s.horloge.reveils], [jour + 1, false, false, 1], 'le matin, en moins d\'une minute');
  eq(msgs.filter(([, m]) => m.t === 'couches').map(([c, m]) => [c, m.comptes]), [[A, []], [B, []]], 'chacun se lève');
  // la nuit suivante, A seul couché : elle garde son pas
  dire(A, { t: 'coucher', oui: true });
  h.t += 16 * 30 * 1000;
  r.avancer();
  assert(nightActive(s) && !s.horloge.sommeil && dureeDuPas(s) === PAS, 'un seul couché : la nuit à son pas');
});

test('I9a2 : le Durable Object : un instantané toutes les 120 pas (l\'empreinte, à tous), pas aux 20 gestes ; une sauvegarde par heure ; le départ du dernier endort le monde et le sauve', async () => {
  const { r, sql, h, msgs, entrer, partir, bucket } = ileServie();
  entrer(A); entrer(B);
  const inst = () => sql.db.prepare('SELECT MAX(rev) AS r FROM instantane').get().r;
  const avant = inst();
  for (const c of casesLibres(r.charger(), 25)) { h.t += 1000; r.commande(A, poser(c)); }
  assert(r.rev >= 20, `${r.rev} gestes`);
  eq(inst(), avant, 'pas d\'instantané aux 20 gestes');
  msgs.length = 0;
  h.t += MONDE.INSTANTANE_PAS * PAS;
  r.avancer();
  const ctl = msgs.filter(([, m]) => m.t === 'controle');
  eq([ctl.length, ctl[0][1].pas, ctl[0][1].empreinte], [2, pasDe(r.charger()), empreintePartie(r.charger())], 'l\'instantané au temps, son empreinte à tous');
  const ancre = () => JSON.parse(sql.db.prepare('SELECT valeur FROM meta WHERE cle = \'horloge\'').get().valeur);
  eq([inst(), ancre().pas, ancre().actif], [r.rev, pasDe(r.charger()), true], 'l\'ancre : le pas de l\'instantané');
  // une heure de jeu plus tard : une sauvegarde
  h.t += MONDE.SAUVEGARDE_MS;
  r.avancer();
  await new Promise((ok) => setTimeout(ok, 20));
  eq([...bucket.m.values()].map((x) => JSON.parse(x.v).raison), ['heure']);
  // les deux partent : le monde s'endort, sauvé
  h.t += 3 * PAS;
  partir(A); partir(B);
  await new Promise((ok) => setTimeout(ok, 20));
  eq([[...bucket.m.values()].map((x) => JSON.parse(x.v).raison).sort(), ancre().actif, ancre().pas, inst()], [['depart', 'heure'], false, pasDe(r.charger()), r.rev], 'endormi et sauvé');
});

test('I9a2 : un joueur en retard de plus de 60 pas reçoit la partie entière ; en deçà, le journal ; les mondes d\'avant gardent F.2 (ni pas, ni horloge)', () => {
  const { r, h } = ileEnLigne();
  r.accueil(A, { version: GAME_VERSION });
  const [c] = casesLibres(r.charger(), 1);
  h.t += 10 * PAS;
  assert(r.commande(A, poser(c)).ok);
  h.t += 20 * PAS;
  const proche = r.accueil(B, { version: GAME_VERSION, depuis: 0, pas: 0 });
  eq([!!proche.evts, proche.evts && proche.evts.length], [true, 1], '30 pas : le journal');
  h.t += 40 * PAS;
  eq('partie' in r.accueil(B, { version: GAME_VERSION, depuis: 0, pas: 0 }), true, '70 pas : la partie entière');
  eq('partie' in r.accueil(B, { version: GAME_VERSION, depuis: 0 }), true, 'un retard inconnu : la partie entière');
  // une ferme d'avant
  const { r: f } = monde();
  const a = f.accueil(A, { version: GAME_VERSION });
  const [t] = casesLibres(f.charger(), 1);
  const x = f.commande(A, poser(t));
  eq(['horloge' in a, 'pas' in x.evt.cmd, 'reel' in x.evt, f.avancer().pas, f.reprendre(), horlogeVivante(f.charger())], [false, false, false, 0, null, false]);
});

/* ---------- I9b : les changements de l'île ---------- */

// Les pièces du monde autour de la sortie de la ferme (dans sa région et celles autour), hors de la ferme, que le geste
// `geste` prend : [{ id, nom, x, y, variante, regle, case }] (le sol tiré de la graine, comme chez chaque joueur).
function piecesDehors(w, geste, k = 1, test = () => true) {
  const T = farmTerrain(w), N = T.MONDE.taille, W = T.LARGEUR, sol = solDirect(T);
  const S = T.MONDE.cadre.SORTIE, rx = Math.floor((S % W) / N), ry = Math.floor(Math.floor(S / W) / N);
  const out = [], vus = new Set();
  for (let d = 0; d <= 2 && out.length < k; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      for (const o of objetsDeRegion(sol.region(rx + dx, ry + dy))) {
        const X = Math.floor(o.x / 16), Y = Math.floor((o.y - 1) / 16), c = Y * W + X;
        if (vus.has(o.id) || out.length >= k || o.regle.geste !== geste || caseDansLaFerme(w, c) || !test(o)) continue;
        vus.add(o.id);
        out.push({ ...o, case: c });
      }
    }
  }
  return out;
}
const recolter = (piece, o = {}) => ({ id: id(), type: 'monde.recolter', args: { piece, ...o } });
// (pour l'essai : les outils au coffre, posés dans la partie du monde, puis un instantané)
function outille(r) {
  const w = r.charger();
  w.outils = { ...(w.outils || {}), hache: true, pioche: true, faux: true, canne: true };
  r.instantane();
  return w;
}

test('I9b : un arbre de l\'île abattu par l\'invité : son bois au coffre commun (rien au sol), sa région vue du monde ; un doublon refusé ; le Durable Object réveillé à froid rejoue tout', () => {
  const { r, sql, h } = ileEnLigne();
  r.accueil(A, { version: GAME_VERSION });
  const w = outille(r);
  const [a] = piecesDehors(w, 'couper', 1, (o) => o.regle.coups >= 2);
  assert(a, 'un arbre de plusieurs coups près de la sortie');
  const bois0 = countItem(w, 'bois'), vues0 = (w.monde.vues || []).length;
  let x;
  for (let k = 0; k < a.regle.coups; k++) { h.t += 1500; x = r.commande(B, recolter(a.id)); assert(x.ok, x.erreur); }
  const s = r.charger();
  eq([typeof s.monde.pris[a.id], s.monde.pris[a.id].retour > s.day, countItem(s, 'bois') > bois0, (s.morceaux || []).length], ['object', true, true, 0], 'abattu : il reviendra ; son bois au coffre');
  assert(x.evt.cmd.type === 'monde.recolter' && Number.isInteger(x.evt.cmd.pas) && JSON.stringify(x.evt).length < 300, `l'événement, petit : ${JSON.stringify(x.evt)}`);
  assert(regionVue(s, a.case) && (s.monde.vues || []).length >= vues0, 'sa région, vue du monde (elle repoussera)');
  const bois = countItem(s, 'bois');
  eq([r.commande(A, recolter(a.id)).erreur, countItem(r.charger(), 'bois')], ['Il n\'y a plus rien ici : ça repoussera.', bois], 'le même arbre, une seconde fois : refusé, rien en double');
  eq(r.commande(B, recolter('licorne:40,40')).ok, false, 'une sorte inconnue');
  const F = farmTerrain(s).FERME;
  eq(r.commande(B, recolter(`feuillu:${(F.X + 4) * 16 + 8},${(F.Y + 4) * 16 + 15}`)).erreur, 'Il n\'y a rien à prendre ici.', 'une pièce du monde dans la ferme : il n\'y en a pas');
  eq(r.commande(B, recolter(a.id.replace(/:.*/, ':999999,999999'))).erreur, 'Il n\'y a rien à prendre ici.', 'hors de la carte');
  h.t += 20000;
  r.avancer();
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();
  eq(empreintePartie(froid.charger()), empreintePartie(r.charger()), 'le journal se rejoue pas à pas, à l\'identique');
});

test('I9b : le conflit : deux joueurs sur le même buisson au même instant : le premier arrivé l\'a, le second est refusé ; pêcher au lac, faucher, ramasser dehors ; le rôle visiteur ne prend rien', () => {
  const { r } = ileEnLigne();
  r.accueil(A, { version: GAME_VERSION });
  const w = outille(r);
  const [b, b2] = piecesDehors(w, 'couper', 2, (o) => o.regle.coups === 1);
  const premier = r.commande(B, recolter(b.id)), second = r.commande(A, recolter(b.id));
  eq([premier.ok, second.ok, second.erreur], [true, false, 'Il n\'y a plus rien ici : ça repoussera.'], 'un seul gagne');
  const [f] = piecesDehors(w, 'faucher');
  if (f) { const q = r.commande(B, recolter(f.id)); assert(q.ok, `faucher : ${q.erreur}`); }
  const [m] = piecesDehors(w, 'ramasser');
  if (m) { const q = r.commande(B, recolter(m.id)); assert(q.ok, `ramasser : ${q.erreur}`); }
  const p = r.commande(A, { id: id(), type: 'outil.pecher', args: { eau: 'lac' } });
  assert(p.ok, `pêcher au lac : ${p.erreur}`);
  r.ajouterMembre('c-visite', 'Vic', 'visiteur');
  assert(/Visiteur/.test(r.commande('c-visite', recolter(b2.id)).erreur), 'un visiteur regarde');
});

test('I9b : un chemin posé dehors par l\'invité (le sol de sa région tiré par le monde), repris ; un mur dehors refusé par le moteur ; le journal se rejoue', () => {
  const { r, sql, h } = ileEnLigne();
  r.accueil(A, { version: GAME_VERSION });
  const w = r.charger();
  addItem(w, DATA.ATELIER.BLOCS.chemin.objet, 5);
  r.instantane();
  const T = farmTerrain(w), W = T.LARGEUR, S = T.MONDE.cadre.SORTIE;
  let t = null;
  for (let k = 3; k < 60 && t === null; k++) for (const c of [S + k, S + k * W, S - k, S - k * W]) if (t === null && !caseDansLaFerme(w, c) && poseStatus(w, 'chemin', c).ok) t = c;
  assert(t !== null, 'une case du dehors où un chemin se pose');
  const p = r.commande(B, { id: id(), type: 'bloc.poser', args: { sorte: 'chemin', case: t } });
  assert(p.ok, p.erreur);
  eq([cheminDehorsSur(r.charger(), t), surCase(r.charger(), t)], [true, 'chemin'], 'le chemin, dans les chemins possédés');
  assert(/pas hors de la ferme/.test(r.commande(B, poser(t + 2)).erreur), 'un mur dehors : refusé');
  h.t += 6000;
  const q = r.commande(A, { id: id(), type: 'bloc.reprendre', args: { case: t, attendu: 'chemin' } });
  assert(q.ok, q.erreur);
  eq(cheminDehorsSur(r.charger(), t), false, 'repris');
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();
  eq(empreintePartie(froid.charger()), empreintePartie(r.charger()));
});

test('I9b : la repousse d\'une île suit la nuit qui vient dans les pas (le même jour au monde et au monde réveillé à froid) ; une ferme d\'avant, toujours pas (E-8)', () => {
  const { r, sql, h } = ileEnLigne({ heure: 21 });
  r.accueil(A, { version: GAME_VERSION });
  const w = outille(r);
  const [b] = piecesDehors(w, 'couper', 1, (o) => o.regle.coups === 1);
  assert(r.commande(B, recolter(b.id)).ok);
  const retour = r.charger().monde.pris[b.id].retour;
  let jour = null;
  for (let k = 0; k < 120 && jour === null; k++) {
    h.t += PAS * 12;
    r.avancer();
    if (!r.charger().monde.pris[b.id]) jour = r.charger().day;
  }
  eq(jour, retour, `il repousse le jour ${retour}, au réveil`);
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();
  eq([empreintePartie(froid.charger()), b.id in froid.charger().monde.pris], [empreintePartie(r.charger()), false], 'le monde réveillé à froid le refait à l\'identique');
  // E-8 : la nuit d'une ferme d'avant ne fait pas repousser le grand monde (elle n'en a pas)
  const ferme = partieLocale();
  ferme.mondePartage = true;
  ferme.monde.pris = { [b.id]: { retour: ferme.day } };
  runNight(ferme);
  eq(b.id in ferme.monde.pris, true, 'une ferme d\'avant : rien ne repousse');
});

test('I9b : l\'intérêt par région : près, les positions à leur pas ; loin, une toutes les POS_LOIN_MS ; en entrant dans une région, le lot de ceux qui y sont ; une ferme d\'avant relaie tout', () => {
  const { r, h, msgs, entrer, dire } = ileServie();
  r.ajouterMembre(C, 'Cam', 'batisseur');
  entrer(A); entrer(B); entrer(C);
  const T = farmTerrain(r.charger()), N = T.MONDE.taille * 16;
  const pos = (c, x, y) => { h.t += 200; dire(c, { t: 'pos', x, y }); };
  const recus = (dest, de) => msgs.filter(([q, m]) => q === dest && m.t === 'pos' && m.acteur === de).length;
  // A et B dans la même région ; C trois régions plus loin
  pos(A, 2 * N + 40, 2 * N + 40); pos(B, 2 * N + 90, 2 * N + 60); pos(C, 5 * N + 40, 2 * N + 40);
  msgs.length = 0;
  for (let k = 0; k < 9; k++) pos(A, 2 * N + 40 + k * 4, 2 * N + 40);   // (9 positions en 1,8 s)
  eq([recus(B, A), recus(C, A)], [9, 1], 'B, près, les a toutes ; C, loin, une seule');
  h.t += MONDE.POS_LOIN_MS;
  pos(A, 2 * N + 90, 2 * N + 40);
  eq(recus(C, A), 2, 'deux secondes plus tard : une de plus');
  // C entre dans la région voisine de A : le lot des joueurs proches, tout de suite
  msgs.length = 0;
  pos(C, 3 * N + 10, 2 * N + 40);
  const lot = msgs.find(([q, m]) => q === C && m.t === 'lot');
  eq(lot && lot[1].pos.map((p) => p.acteur).sort(), [A, B].sort(), 'le lot : A et B, là où ils sont');
  msgs.length = 0;
  pos(A, 2 * N + 100, 2 * N + 40);
  eq(recus(C, A), 1, 'désormais proche : à son pas');
  // une ferme d'avant : pas de régions, tout est relayé comme avant (E-4)
  const sock = [], m2 = [];
  const ctx = { storage: { sql: baseSql() }, id: { toString: () => 'f' }, getWebSockets: (tag) => sock.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c], waitUntil: (p) => p };
  const d = new Monde(ctx, {});
  assert(d.registre.creer({ proprietaire: A, partie: partieLocale() }).ok);
  d.registre.ajouterMembre(B, 'Sam');
  for (const c of [A, B]) sock.push({ c, send: (m) => m2.push([c, JSON.parse(m)]), close() {} });
  let t = 1e12;
  d.registre.maintenant = () => t;
  for (let k = 0; k < 5; k++) { t += 200; d.webSocketMessage(sock[0], JSON.stringify({ t: 'pos', x: 10 + k * 3000, y: 10 })); }
  eq(m2.filter(([q, m]) => q === B && m.t === 'pos').length, 5, 'une ferme d\'avant : toutes');
});

test('I9b : le sac de chacun : celui du propriétaire vient de sa partie, l\'invité arrive sans ; chacun remplit le sien, mange du sien dehors ; format 105', () => {
  const ile = avecVillage(() => createNewGame('17', { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  const sacs = Object.keys(DATA.EQUIPEMENT.SACS);
  addItem(ile, sacs[0], 2);
  addItem(ile, 'pomme', 12);
  if (ile.equipement && ile.equipement.sac) ile.equipement.sac = null;
  assert(executerCommande(ile, { id: 'c-sac', type: 'sac.poser', args: { objet: sacs[0] } }).ok, 'en solo, la commande pose le sac de la partie');
  const avantSac = JSON.stringify(ile.equipement.sac);
  const h = { t: 1_700_000_000_000 }, sql = baseSql();
  const r = new MondeRegistre(sql, () => h.t);
  assert(r.creer({ proprietaire: A, partie: { v: ile.version, t: 0, s: ile } }).ok);
  r.ajouterMembre(B, 'Sam', 'batisseur');
  r.accueil(A, { version: GAME_VERSION });
  const w = r.charger();
  eq([JSON.stringify(w.sacs[A]), w.equipement.sac, B in w.sacs], [avantSac, null, false], 'A a le sien, B aucun ; celui de la partie, à personne');
  const jouer = (qui, type, args) => r.commande(qui, { id: id(), type, args });
  let x = jouer(B, 'sac.poser', { objet: sacs[0] });
  assert(x.ok, `B prend le second sac du coffre : ${x.erreur}`);
  x = jouer(B, 'sac.remplir', { objet: 'pomme', quantite: 3 });
  assert(x.ok, x.erreur);
  x = jouer(A, 'sac.remplir', { objet: 'pomme', quantite: 1 });
  assert(x.ok, x.erreur);
  const nb = (q) => Object.values(q.items).flat().reduce((t, l) => t + l.qty, 0);
  eq([nb(r.charger().sacs[A]), nb(r.charger().sacs[B]), r.charger().equipement.sac], [1, 3, null], 'chacun le sien');
  // B a dépensé de l'énergie, puis mange dehors : de son sac
  r.charger().energies[B] = 1000;
  r.instantane();
  const m = jouer(B, 'manger', { dehors: true });
  assert(m.ok, m.erreur);
  eq([nb(r.charger().sacs[B]), nb(r.charger().sacs[A])], [2, 1], 'de son sac à lui');
  eq(jouer(A, 'sac.retirer', {}).ok, true);
  eq([A in r.charger().sacs, r.charger().equipement.sac], [false, null], 'A a rangé son sac');
  h.t += 30000;
  r.avancer();
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();
  eq(empreintePartie(froid.charger()), empreintePartie(r.charger()), 'le journal se rejoue');
  // le format 105 : la partie d'un monde reçoit ses sacs (lisibles) ; une partie solo, rien
  // (I9c : puis le format 106, la charge de chacun ; la migration va jusqu'au format du jeu)
  assert(STATE_VERSION >= 105);
  const v104 = { ...JSON.parse(JSON.stringify(r.charger())), version: 104, sacs: { [A]: { objet: sacs[0], items: { pomme: [{ qty: 1, nightsLeft: 3 }], licorne: [] } }, [B]: { objet: 'caillou' }, x: 3 } };
  const mig = migrate({ v: 104, t: 0, s: v104 });
  eq([mig.version, Object.keys(mig.sacs), Object.keys(mig.sacs[A].items)], [STATE_VERSION, [A], ['pomme']]);
  const solo = { ...JSON.parse(JSON.stringify(ile)), version: 104 };
  eq('sacs' in migrate({ v: 104, t: 0, s: solo }), false, 'une partie solo n\'y gagne rien');
});

/* ---------- I9c : le port et la caisse en ligne ---------- */

// Une île en ligne prête à commercer : le propriétaire A (sa partie : une charge de 3 carottes), l'invité B (`roleB`) ;
// au coffre commun, des carottes, du bois, une brouette, une charrette et le cheval. Le monde est réveillé, à 8 h.
function ilePort({ roleB = 'batisseur', graine = '17', heure = 8 } = {}) {
  const ile = avecVillage(() => createNewGame(graine, { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  ile.awakeMs = (heure - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  testSetLevel(ile, 5);   // (le commerce du port s'ouvre au niveau 3)
  addItem(ile, 'carotte', 13);
  addItem(ile, 'bois', 20);
  addItem(ile, 'brouette', 1);
  addItem(ile, 'charrette', 1);
  ile.cheval = { monte: false, nourri: true, attache: null };
  const T = farmTerrain(ile), F = T.FERME, W = T.LARGEUR;
  const ferme = (F.Y + (F.HAUTEUR >> 1)) * W + F.X + (F.LARGEUR >> 1);
  assert(executerCommande(ile, { id: 'c-solo', type: 'portage.charger', args: { objet: 'carotte', quantite: 3, case: ferme } }).ok, 'en solo, A charge 3 carottes');
  const sql = baseSql(), h = { t: 1_700_000_000_000 };
  const r = new MondeRegistre(sql, () => h.t);
  const c = r.creer({ proprietaire: A, nom: 'Alex', partie: { v: ile.version, t: 0, s: ile } });
  assert(c.ok, c.erreur);
  r.ajouterMembre(B, 'Sam', roleB);
  r.accueil(A, { version: GAME_VERSION });
  const w = r.charger(), comptoir = comptoirDuPort(w);
  const jouer = (qui, type, args) => r.commande(qui, { id: id(), type, args });
  return { r, sql, h, w, ferme, port: comptoir && comptoir.devant, W, jouer };
}
const pieces = (r) => r.charger().pieces;

test('I9c : la mise en ligne : le lieu du port écrit dans la partie, la charge du propriétaire à lui ; la frontière s\'ouvre au port ; on vend au comptoir, la caisse est commune ; loin, refusé', () => {
  const { r, sql, h, w, ferme, port, jouer } = ilePort();
  assert(w.port.lieu && Number.isInteger(w.port.lieu.case) && lieuPort(w) === w.port.lieu, 'le lieu du port, dans la partie du monde');
  eq([Object.keys(w.charges), chargeDuCompte(w, A).charge.carotte.reduce((t, l) => t + l.qty, 0), 'portage' in w], [[A], 3, false], 'la charge de A vient de sa partie ; B n\'en a pas ; aucune à personne');
  assert(Number.isInteger(port) && !caseDansLaFerme(w, port), 'le comptoir est dehors');
  // la frontière : sur une île, les commandes du port passent (le moteur vérifie la distance) ; sur une ferme d'avant, non
  eq([refusFrontiere(w, { case: port }, 'port.vendre'), COMMANDES_DU_PORT.every((t) => COMMANDES_DEHORS.has(t))], [null, true]);
  // B charge 6 carottes du coffre, sur la ferme ; vend au comptoir : la caisse monte de la somme juste
  const c0 = countItem(w, 'carotte');
  let x = jouer(B, 'portage.charger', { objet: 'carotte', quantite: 6, case: ferme });
  assert(x.ok, x.erreur);
  eq([countItem(r.charger(), 'carotte'), Object.keys(r.charger().charges).sort()], [c0 - 6, [A, B].sort()], 'sorties du coffre commun, dans la charge de B');
  x = jouer(B, 'port.vendre', { objet: 'carotte', quantite: 2, case: ferme });
  assert(!x.ok && x.erreur.startsWith('Tu n\'es pas au port'), `loin du comptoir : refusé par le moteur (${x.erreur})`);
  const p0 = pieces(r);
  x = jouer(B, 'port.vendre', { objet: 'carotte', quantite: 6, case: port });
  assert(x.ok, x.erreur);
  const gainB = pieces(r) - p0;
  assert(gainB > 0, 'la caisse commune a monté');
  // A vend les siennes (sa charge à lui) : la caisse monte encore, de la somme juste
  x = jouer(A, 'port.vendre', { objet: 'carotte', quantite: 3, case: port });
  assert(x.ok, x.erreur);
  eq([B in r.charger().charges, A in r.charger().charges], [false, false], 'les charges vidées ne se gardent pas');
  // le journal du monde : qui a vendu quoi, pour combien
  const j = r.journal(A).evts.filter((e) => e.type === 'port.vendre');
  eq(j.map((e) => [e.nom, e.bilan.objet, e.bilan.n]), [['Alex', 'carotte', 3], ['Sam', 'carotte', 6]]);
  eq(j[1].bilan.gain, gainB, 'le gain de Sam, au journal');
  eq(pieces(r), p0 + j[0].bilan.gain + j[1].bilan.gain, 'la caisse : la somme des deux ventes');
  // une ferme d'avant (le chantier éteint) : rien ne change (E-8, pas de port)
  eq(refusFrontiere(partieLocale(), { case: port }, 'port.vendre'), HORS_FERME);
  // le Durable Object réveillé à froid : la même partie
  h.t += 20000;
  r.avancer();
  const froid = new MondeRegistre(sql, () => h.t);
  froid.avancer();
  eq(empreintePartie(froid.charger()), empreintePartie(r.charger()), 'le journal se rejoue');
});

test('I9c : deux ventes du même lot en même temps : un seul joueur l\'a chargé, un seul est payé ; rien en double', () => {
  const { r, ferme, port, jouer } = ilePort();
  const n = countItem(r.charger(), 'carotte');
  assert(jouer(A, 'portage.vehicule', { vehicule: 'brouette', case: ferme }).ok, 'A prend la brouette : tout le lot y tient');
  // les deux veulent tout le lot du coffre, au même instant : le premier arrivé l'a
  const a = jouer(A, 'portage.charger', { objet: 'carotte', quantite: n, case: ferme });
  const b = jouer(B, 'portage.charger', { objet: 'carotte', quantite: n, case: ferme });
  eq([a.ok, b.ok, countItem(r.charger(), 'carotte')], [true, false, 0], `le premier charge tout, le second rien (${b.erreur})`);
  // puis les deux vendent « ce lot » au comptoir, au même instant : un seul est payé
  const p0 = pieces(r);
  const va = jouer(A, 'port.vendre', { objet: 'carotte', quantite: n + 3, case: port });
  const vb = jouer(B, 'port.vendre', { objet: 'carotte', quantite: n + 3, case: port });
  assert(va.ok && !vb.ok && /rien de chargé/i.test(vb.erreur), vb.erreur);
  const ventes = r.journal(A).evts.filter((e) => e.type === 'port.vendre');
  eq([pieces(r) - p0, ventes.length], [ventes[0].bilan.gain, 1], 'payé une fois');
});

test('I9c : une commande du bac honorée à deux : chacun livre ce qu\'il a porté (payé au prix de vente), la prime une fois, avec la dernière livraison', () => {
  const { r, ferme, port, jouer } = ilePort();
  r.charger().port.commandes = [{ id: 'c3-1', objet: 'carotte', quantite: 10, prime: 40, jour: 3 }];
  r.instantane();
  assert(jouer(A, 'portage.charger', { objet: 'carotte', quantite: 3, case: ferme }).ok);   // (A en a 6)
  assert(jouer(B, 'portage.charger', { objet: 'carotte', quantite: 4, case: ferme }).ok);
  const p0 = pieces(r), xp0 = r.charger().progression.xp, h0 = r.charger().port.honorees;
  let x = jouer(A, 'port.honorer', { commande: 'c3-1', case: port });
  assert(x.ok, x.erreur);
  eq([r.charger().port.commandes[0].livre, r.charger().port.honorees], [6, h0], 'A en a livré 6 : la commande attend le reste');
  const gainA = pieces(r) - p0;
  x = jouer(B, 'port.honorer', { commande: 'c3-1', case: port });
  assert(x.ok, x.erreur);
  const prime = Math.round((10 * prixIle('carotte') * 40) / 100);
  eq([r.charger().port.commandes.length, r.charger().port.honorees], [0, h0 + 1], 'B livre les 4 qui manquaient : honorée');
  assert(pieces(r) - p0 - gainA >= prime, 'la prime, avec la dernière livraison');
  const bil = r.journal(A).evts.filter((e) => e.type === 'port.honorer').map((e) => [e.nom, e.bilan.n, e.bilan.reste ?? null]);
  eq(bil, [['Sam', 4, null], ['Alex', 6, 4]], 'le journal : qui a livré combien');
  assert(r.charger().progression.xp - xp0 >= DATA.PORT.COMMANDES.XP, 'l\'XP de la commande');
  // un troisième essai : la commande n'est plus là
  assert(jouer(A, 'portage.charger', { objet: 'carotte', quantite: 1, case: ferme }).ok);
  eq(jouer(A, 'port.honorer', { commande: 'c3-1', case: port }).ok, false);
});

test('I9c : la charrette attelée par un seul joueur ; la brouette, une par exemplaire ; libre, elle passe à qui la prend', () => {
  const { r, ferme, port, jouer } = ilePort();
  let x = jouer(A, 'portage.vehicule', { vehicule: 'charrette', case: ferme });
  assert(x.ok, x.erreur);
  assert(jouer(A, 'portage.charger', { objet: 'bois', quantite: 10, case: ferme }).ok, 'A charge du bois sur la charrette');
  x = jouer(B, 'portage.vehicule', { vehicule: 'charrette', case: ferme });
  assert(!x.ok && /attelée par un autre joueur/.test(x.erreur), x.erreur);
  // B prend la brouette (la seule de la ferme) et la charge ; A ne peut plus la prendre
  assert(jouer(B, 'portage.vehicule', { vehicule: 'brouette', case: ferme }).ok);
  assert(jouer(B, 'portage.charger', { objet: 'carotte', quantite: 5, case: ferme }).ok);
  const vueB = { ...JSON.parse(JSON.stringify(r.charger())) };
  vueB.portage = vueB.charges[B];
  eq(capacitePortage(vueB), DATA.VILLAGE.PORTAGE.BROUETTE, 'B : la place de la brouette');
  // A vide sa charrette au port : vide, elle reste à lui, mais passe à qui la demande
  assert(jouer(A, 'port.decharger', { case: port }).ok);
  eq(r.charger().charges[A] && r.charger().charges[A].vehicule, 'charrette', 'A la tient encore, vide');
  assert(jouer(B, 'port.decharger', { case: port }).ok);
  x = jouer(B, 'portage.vehicule', { vehicule: 'charrette', case: ferme });
  assert(x.ok, x.erreur);
  eq([A in r.charger().charges, r.charger().charges[B].vehicule], [false, 'charrette'], 'A est revenu à la main, B a la charrette');
  eq(jouer(A, 'portage.vehicule', { vehicule: 'brouette', case: ferme }).ok, true, 'la brouette, libérée par B, va à A');
});

test('I9c : les rôles au port : le visiteur ne vend ni n\'achète ni ne porte ; l\'ami jardinier vend, n\'achète pas ; le bâtisseur achète ; seul le propriétaire agrandit le port', () => {
  const { r, ferme, port, jouer } = ilePort({ roleB: 'visiteur' });
  const semence = Object.keys(DATA.OBJETS).find((k) => enVenteAuPort(r.charger(), k));
  for (const [type, args] of [['port.vendre', { objet: 'carotte', quantite: 1, case: port }], ['port.acheter', { objet: semence, quantite: 1, case: port }], ['portage.charger', { objet: 'carotte', quantite: 1, case: ferme }], ['port.decharger', { case: port }]]) {
    const x = jouer(B, type, args);
    assert(!x.ok && /Visiteur/.test(x.erreur), `${type} : ${x.erreur}`);
  }
  r.changerRole(A, B, 'jardinier');
  assert(jouer(B, 'portage.charger', { objet: 'carotte', quantite: 1, case: ferme }).ok, 'le jardinier porte');
  assert(jouer(B, 'port.vendre', { objet: 'carotte', quantite: 1, case: port }).ok, 'le jardinier vend');
  let x = jouer(B, 'port.acheter', { objet: semence, quantite: 1, case: port });
  assert(!x.ok && /bâtisseur/.test(x.erreur), x.erreur);
  r.changerRole(A, B, 'batisseur');
  x = jouer(B, 'port.acheter', { objet: semence, quantite: 1, case: port });
  assert(x.ok, `le bâtisseur achète : ${x.erreur}`);
  eq(r.journal(A).evts[0].bilan.objet, semence, 'l\'achat au journal');
  x = jouer(B, 'port.agrandir', { case: port });
  eq([x.ok, x.erreur], [false, 'Seul le propriétaire de l\'île agrandit le port.']);
  eq(roleDemande(r.charger(), { type: 'port.agrandir', args: {} }), 'proprietaire');
});

test('I9c : la case d\'un geste du port vient de la page : le monde la compare à la dernière position relayée du joueur', () => {
  const { r, ferme, port, W, jouer } = ilePort();
  assert(jouer(B, 'portage.charger', { objet: 'carotte', quantite: 2, case: ferme }).ok, 'sans position connue : rien à comparer');
  // B relaie sa position : sur la ferme
  const dire = (x, y) => traiterMessage(r, B, JSON.stringify({ t: 'pos', x, y }), () => {}, () => {});
  const px = (c) => [(c % W) * 16 + 8, Math.floor(c / W) * 16 + 15];
  dire(...px(ferme));
  let x = jouer(B, 'port.vendre', { objet: 'carotte', quantite: 1, case: port });
  assert(!x.ok && /pas là où ce geste se fait/.test(x.erreur), `une vente « au comptoir » depuis la ferme : ${x.erreur}`);
  r.positions.clear();
  dire(...px(port + 2));
  x = jouer(B, 'port.vendre', { objet: 'carotte', quantite: 1, case: port });
  assert(x.ok, `au port : ${x.erreur}`);
});

test('I9c : le format 106 : la partie d\'un monde reçoit les charges de chacun (lisibles) ; une partie solo n\'y gagne rien ; le lieu du port et ce qui est livré se gardent', () => {
  assert(STATE_VERSION >= 106);
  const { r } = ilePort();
  const w = JSON.parse(JSON.stringify(r.charger()));
  w.port.commandes = [{ id: 'c3-1', objet: 'carotte', quantite: 10, prime: 40, jour: 3, livre: 4 }];
  const v105 = { ...w, version: 105, charges: { [A]: { vehicule: 'brouette', charge: { carotte: [{ qty: 2, nightsLeft: 3, origin: 'produit' }], licorne: [{ qty: 1 }] } }, [B]: { vehicule: 'mains', charge: {} }, x: 'non' } };
  const mig = migrate({ v: 105, t: 0, s: v105 });
  eq([mig.version, Object.keys(mig.charges), Object.keys(mig.charges[A].charge), mig.port.lieu, mig.port.commandes[0].livre], [STATE_VERSION, [A], ['carotte'], w.port.lieu, 4]);
  const solo = { ...JSON.parse(JSON.stringify(partieLocale())), version: 105 };
  eq('charges' in migrate({ v: 105, t: 0, s: solo }), false, 'une partie solo n\'y gagne rien');
});
