// Tests des comptes du jeu en ligne (E-0 : worker/src/comptes.mjs, et ses routes dans worker/src/index.js).
// La base SQLite du Durable Object est simulée par node:sqlite (une base en mémoire), l'envoi des
// e-mails par une fonction qui garde ce qu'elle reçoit.
// Lancer seul : node tests/test-comptes.mjs (ou node tests/run-tests.mjs comptes).

import { test as nodeTest } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  adresseDuLien, COMPTES, Comptes, emailDuLien, empreinte, normaliserEmail, Registre, routeCompte,
} from '../worker/src/comptes.mjs';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

const MIN = 60 * 1000, JOUR = 24 * 60 * MIN;

// La base d'un Durable Object (ctx.storage.sql.exec), sur node:sqlite.
function baseSql() {
  const db = new DatabaseSync(':memory:');
  return { db, exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
}
function registre(t0 = Date.UTC(2026, 10, 4, 12)) {
  const horloge = { t: t0 };
  const sql = baseSql();
  return { r: new Registre(sql, () => horloge.t), horloge, sql };
}

test('comptes : les adresses e-mail rangées, les invalides refusées', () => {
  eq(normaliserEmail('  Alex.Fuzy@Example.FR '), 'alex.fuzy@example.fr');
  for (const x of ['', 'alex', 'alex@', '@x.fr', 'a b@x.fr', 'a@x', 'a@x.f', null, 'a'.repeat(250) + '@x.fr']) eq(normaliserEmail(x), null, String(x));
});

test('comptes : un lien, une connexion (le compte créé), la session ; le lien ne sert qu\'une fois', async () => {
  const { r } = registre();
  const l = await r.demanderLien('Alex@Example.fr', '1.2.3.4');
  assert(l.ok && /^[A-Za-z0-9_-]{43}$/.test(l.jeton), JSON.stringify(l));
  const c = await r.connecter(l.jeton);
  assert(c.ok && c.compte.email === 'alex@example.fr' && /^c-/.test(c.compte.id), JSON.stringify(c));
  eq((await r.moi(c.session)).id, c.compte.id, 'la session ouvre le compte');
  const encore = await r.connecter(l.jeton);
  eq([encore.ok, encore.statut], [false, 410], 'déjà servi');
  // un second lien pour la même adresse : le même compte, une autre session
  const l2 = await r.demanderLien('alex@example.fr');
  const c2 = await r.connecter(l2.jeton);
  eq(c2.compte.id, c.compte.id);
  assert(c2.session !== c.session);
});

test('comptes : un lien expire après LIEN_MIN minutes ; une session après SESSION_JOURS jours', async () => {
  const { r, horloge } = registre();
  const l = await r.demanderLien('a@b.fr');
  horloge.t += (COMPTES.LIEN_MIN + 1) * MIN;
  eq((await r.connecter(l.jeton)).statut, 410, 'lien expiré');
  const c = await r.connecter((await r.demanderLien('a@b.fr')).jeton);
  assert(c.ok);
  horloge.t += (COMPTES.SESSION_JOURS - 1) * JOUR;
  assert(await r.moi(c.session), 'encore valable');
  horloge.t += 2 * JOUR;
  eq(await r.moi(c.session), null, 'session expirée');
});

test('comptes : les demandes de liens sont limitées (par adresse, par connexion)', async () => {
  const { r, horloge } = registre();
  for (let k = 0; k < COMPTES.LIENS_PAR_EMAIL; k++) assert((await r.demanderLien('a@b.fr')).ok, `lien ${k + 1}`);
  eq((await r.demanderLien('a@b.fr')).statut, 429, 'trop pour cette adresse');
  horloge.t += (COMPTES.FENETRE_EMAIL_MIN + 1) * MIN;
  assert((await r.demanderLien('a@b.fr')).ok, 'plus tard : de nouveau');
  const { r: r2 } = registre();
  for (let k = 0; k < COMPTES.LIENS_PAR_IP; k++) assert((await r2.demanderLien(`j${k}@b.fr`, '9.9.9.9')).ok);
  eq((await r2.demanderLien('autre@b.fr', '9.9.9.9')).statut, 429, 'trop depuis cette connexion');
  assert((await r2.demanderLien('autre@b.fr', '8.8.8.8')).ok, 'une autre connexion : oui');
});

test('comptes : déconnexion, suppression du compte (et de ses sessions) ; la base ne garde que des empreintes', async () => {
  const { r, sql } = registre();
  const l = await r.demanderLien('a@b.fr');
  const c1 = await r.connecter(l.jeton), c2 = await r.connecter((await r.demanderLien('a@b.fr')).jeton);
  const tout = JSON.stringify(sql.db.prepare('SELECT * FROM sessions').all()) + JSON.stringify(sql.db.prepare('SELECT * FROM liens').all());
  assert(!tout.includes(c1.session) && !tout.includes(c2.session) && !tout.includes(l.jeton), 'ni session ni lien en clair');
  assert(tout.includes(await empreinte(c1.session)), 'leur empreinte');
  await r.deconnecter(c1.session);
  eq(await r.moi(c1.session), null, 'déconnecté');
  assert(await r.moi(c2.session), 'l\'autre appareil reste connecté');
  eq((await r.supprimer(c2.session)).ok, true);
  eq(await r.moi(c2.session), null);
  eq(sql.db.prepare('SELECT COUNT(*) AS n FROM comptes').get().n, 0, 'compte effacé');
  eq(sql.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0, 'sessions effacées');
  eq((await r.supprimer(c2.session)).statut, 401);
});

// Une requête vers le Worker, depuis le jeu.
const ORIGINE = 'https://aluzy.github.io';
const requete = (chemin, { methode = 'POST', corps, session, origine = ORIGINE } = {}) => new Request(`https://w.example${chemin}`, {
  method: methode,
  headers: { Origin: origine, 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
  body: corps === undefined ? undefined : JSON.stringify(corps),
});

test('comptes : les routes ; sans service d\'e-mails configuré, le lien n\'est pas promis (503)', async () => {
  const { r } = registre();
  const envois = [];
  const envoyer = async (url, init) => { envois.push({ url, corps: JSON.parse(init.body), auth: init.headers.Authorization }); return { ok: true, status: 200 }; };
  eq((await routeCompte(requete('/compte/lien', { corps: { email: 'a@b.fr' } }), r, {}, envoyer)).statut, 503, 'pas configuré');
  const env = { RESEND_API_KEY: 'cle', COMPTE_EXPEDITEUR: 'Ferme <c@ferme.fr>' };
  const l = await routeCompte(requete('/compte/lien', { corps: { email: 'a@b.fr' } }), r, env, envoyer);
  eq(l, { statut: 200, corps: { ok: true } }, 'la réponse ne dit pas si le compte existe');
  eq([envois[0].url, envois[0].auth, envois[0].corps.to, envois[0].corps.from], ['https://api.resend.com/emails', 'Bearer cle', ['a@b.fr'], 'Ferme <c@ferme.fr>']);
  const jeton = (envois[0].corps.text.match(/#connexion=([A-Za-z0-9_-]+)/) || [])[1];
  assert(jeton && envois[0].corps.html.includes(adresseDuLien(env, jeton)), 'le lien, dans le fragment');
  const c = await routeCompte(requete('/compte/connexion', { corps: { jeton } }), r, env, envoyer);
  assert(c.statut === 200 && c.corps.session, JSON.stringify(c));
  eq((await routeCompte(requete('/compte/moi', { methode: 'GET', session: c.corps.session }), r, env)).corps.compte.email, 'a@b.fr');
  eq((await routeCompte(requete('/compte/moi', { methode: 'GET' }), r, env)).statut, 401);
  eq((await routeCompte(requete('/compte/lien', { corps: { email: 'pas une adresse' } }), r, env, envoyer)).statut, 400);
  const echec = async () => ({ ok: false, status: 500 });
  eq((await routeCompte(requete('/compte/lien', { corps: { email: 'x@b.fr' } }), r, env, echec)).statut, 502, 'l\'e-mail n\'est pas parti');
  assert(emailDuLien('https://x/#connexion=abc').texte.includes(`${COMPTES.LIEN_MIN} minutes`));
});

// Le Worker lui-même (index.js), avec un Durable Object Comptes sur node:sqlite.
async function chargerWorker() {
  const dir = mkdtempSync(join(tmpdir(), 'ff-comptes-'));
  for (const f of ['report.mjs', 'comptes.mjs']) writeFileSync(join(dir, f), readFileSync(join(here, 'worker/src', f)));
  writeFileSync(join(dir, 'index.mjs'), readFileSync(join(here, 'worker/src/index.js')));
  return import(pathToFileURL(join(dir, 'index.mjs')).href);
}

test('comptes : le Worker passe /compte/… au Durable Object, depuis le jeu seulement (CORS avec Authorization)', async () => {
  const mod = await chargerWorker();
  const W = mod.default;
  assert(typeof mod.Comptes === 'function', 'la classe du Durable Object est exportée');
  const dobj = new mod.Comptes({ storage: { sql: baseSql() } }, {});
  const env = { COMPTES: { idFromName: (n) => n, get: () => ({ fetch: (req) => dobj.fetch(req) }) } };
  const pre = await W.fetch(requete('/compte/lien', { methode: 'OPTIONS' }), env);
  assert(pre.headers.get('Access-Control-Allow-Headers').includes('Authorization') && pre.headers.get('Access-Control-Allow-Methods').includes('GET'));
  eq((await W.fetch(requete('/compte/moi', { methode: 'GET', origine: 'https://ailleurs.example' }), env)).status, 403, 'une autre origine');
  eq((await W.fetch(requete('/compte/moi', { methode: 'GET' }), {})).status, 503, 'sans Durable Object : pas encore ouvert');
  const r = await W.fetch(requete('/compte/moi', { methode: 'GET' }), env);
  eq([r.status, r.headers.get('Access-Control-Allow-Origin')], [401, ORIGINE]);
  const l = await W.fetch(requete('/compte/lien', { corps: { email: 'a@b.fr' } }), env);
  eq(l.status, 503, 'sans RESEND_API_KEY : pas d\'envoi');
  const fichier = readFileSync(join(here, 'wrangler.toml'), 'utf8');
  assert(/class_name = "Comptes"/.test(fichier) && /new_sqlite_classes = \["Comptes"\]/.test(fichier), 'wrangler.toml : la liaison et la migration');
});
