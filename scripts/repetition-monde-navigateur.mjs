#!/usr/bin/env node
// La répétition de la bascule, en ligne et dans Chromium (fiche I9h) : un monde fait et joué à deux par le serveur du
// jeu d'avant (une copie de main ou de archive/jeu-avant-ile : la version 1.22.0, sa partie au format 86, une maison au
// niveau 2 meublée), puis servi par le Worker d'aujourd'hui (worker/src/index.js et ses Durable Objects sur des bases
// node:sqlite, comme tests/deux-joueurs.mjs), le réglage du jeu tel qu'il est (allumé, sans ILE_ESSAI) ; deux onglets,
// le propriétaire et son ami, y entrent par le jeu d'aujourd'hui : le monde passe sur l'île à sa première ouverture, un
// jeu 1.22.0 est refusé, chacun voit sa fenêtre du retour, puis ils y jouent à deux (un mur posé chez l'un vu chez
// l'autre, le temps qui passe, les parties confirmées celle du monde).
//   git worktree add ../jeu-avant origin/archive/jeu-avant-ile
//   node scripts/repetition-monde-navigateur.mjs ../jeu-avant [dossier des captures]
// Rien ne sort du poste : le Worker est celui du dépôt, dans ce processus.

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { ROOT as RACINE } from './lib/engine-source.mjs';
import { countItem, createNewGame, DATA, empreintePartie, GAME_VERSION, ilePartagee, pasDe, poseStatus, villageoisDe, avancerJusqua } from '../js/engine/index.js';
import W from '../worker/src/index.js';
import { Comptes } from '../worker/src/comptes.mjs';
import { Monde } from '../worker/src/monde.mjs';

const [rAvant, CAPTURES] = process.argv.slice(2);
if (!rAvant) { console.error('Usage : node scripts/repetition-monde-navigateur.mjs <copie du jeu d\'avant> [captures]'); process.exit(2); }
const require = createRequire(import.meta.url);
let playwright = null;
for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { playwright = require(require.resolve(nom)); break; } catch { /* suivant */ } }
if (!playwright) { console.log('Playwright introuvable : sauté.'); process.exit(0); }
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const EM = await import(pathToFileURL(join(rAvant, 'js/engine/index.js')).href);
const WM = await import(pathToFileURL(join(rAvant, 'worker/src/monde.mjs')).href);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.tmj': 'application/json', '.tsj': 'application/json' };
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = normalize(join(RACINE, chemin));
  if (f !== RACINE && !f.startsWith(RACINE + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;

const baseSql = () => { const db = new DatabaseSync(':memory:'); return { db, exec(q, ...v) { const r = db.prepare(q).all(...v); return { toArray: () => r }; } }; };
const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
const mondes = new Map(), sockets = new Map(), ctxs = new Map();
const r2m = new Map();
const r2 = {
  async put(k, v, o = {}) { r2m.set(k, { v, o }); },
  async get(k) { const x = r2m.get(k); return x ? { text: async () => x.v } : null; },
  async delete(k) { r2m.delete(k); },
  async list({ prefix }) { return { objects: [...r2m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: r2m.get(k).v.length, customMetadata: r2m.get(k).o.customMetadata })), truncated: false }; },
};
const ctxDe = (x) => { if (!ctxs.has(x)) ctxs.set(x, { storage: { sql: baseSql() }, id: { toString: () => x }, getWebSockets: (tag) => [...(sockets.get(x) || [])].filter((w) => !tag || w.compte === tag), getTags: (w) => [w.compte], waitUntil: (p) => p }); return ctxs.get(x); };
const env = {
  JEU_URL: `${BASE}/jeu.html`,
  COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (r) => comptes.fetch(r) }) },
  MONDES: { idFromName: (x) => x, get: (x) => { if (!mondes.has(x)) mondes.set(x, new Monde(ctxDe(x), { SESSIONS: r2 })); return { fetch: (r) => mondes.get(x).fetch(r) }; } },
};
const compte = async (email) => { const l = await comptes.registre.demanderLien(email); const c = await comptes.registre.connecter(l.jeton); return { session: c.session, email, id: c.compte.id }; };
const A = await compte('alex@exemple.fr'), B = await compte('sam@exemple.fr');

// 1. le monde du serveur d'avant, sur la base du Durable Object « vieux » : créé, B invité, 20 murs posés à deux
const ID = 'm-repetitionbascule01';   // (la forme d'un identifiant de monde : js/ui/en-ligne.js mondeDemande)
const P = JSON.parse(readFileSync(join(RACINE, 'tests', 'engine', 'parties-main.json'), 'utf8')).main_niveau2;
const s0 = P.s;
EM.addItem(s0, EM.DATA.ATELIER.BLOCS.mur_pierre.objet, 40);
const rm = new WM.MondeRegistre(ctxDe(ID).storage.sql);
const c = rm.creer({ proprietaire: A.id, nom: 'Alex', partie: { v: s0.version, t: 0, s: s0 }, titre: 'La ferme d\'Alex' });
rm.ajouterMembre(B.id, 'Sam', 'batisseur');
rm.accueil(A.id, { version: EM.GAME_VERSION });
rm.accueil(B.id, { version: EM.GAME_VERSION });
let n = 0;
let premier = null;
for (let t = 0, k = 0; t < 644 * 510 && k < 20; t += 13) if (EM.poseStatus(rm.charger(), 'mur_pierre', t).ok) { const r = rm.commande(k % 2 ? B.id : A.id, { id: `cmd-${++n}-avant`, type: 'bloc.poser', args: { sorte: 'mur_pierre', case: t } }); if (r.ok) k += 1; else if (!premier) { premier = r.erreur; break; } }
if (premier) console.log(`  (un mur refusé par le serveur d'avant : ${premier})`);
const avant = JSON.parse(JSON.stringify(rm.charger()));
console.log(`Le monde du jeu d'avant (${EM.GAME_VERSION}, format ${EM.STATE_VERSION}) : ${c.ok ? 'créé' : c.erreur}, révision ${rm.rev}, ${Object.keys(avant.blocs).length} blocs, un niveau 2.`);

// 2. le jeu d'aujourd'hui, dans deux onglets
const solo = (prenom, perso) => { const s = createNewGame(7, { nom: 'Essai' }); Object.assign(s.famille.membres[0], { prenom, perso }); return JSON.stringify({ v: s.version, t: Date.now(), s }); };
const navigateur = await playwright.chromium.launch();
const erreurs = [], echecs = [];
const verifie = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) echecs.push(texte); };
async function onglet(qui, sauvegarde) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(([v, cp]) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('ferme-save', v); localStorage.setItem('ferme-compte', JSON.stringify(cp)); sessionStorage.setItem('x', 1); } sessionStorage.setItem('ferme-titre-vu', '1'); }, [sauvegarde, { session: qui.session, email: qui.email }]);
  await ctx.route((u) => !u.href.startsWith(BASE) && !u.href.startsWith('http://127.0.0.1:8787'), (r) => r.abort());
  await ctx.route('http://127.0.0.1:8787/**', async (route) => {
    const rq = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Prenom', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const r = await W.fetch(new Request(rq.url(), { method: rq.method(), headers: { ...rq.headers(), origin: 'https://aluzy.github.io' }, body: rq.postData() || undefined }), env);
    return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: await r.text() });
  });
  await ctx.routeWebSocket(/127\.0\.0\.1:8787\/mondes\/.*\/ws/, async (ws) => {
    const u = new URL(ws.url()), id = u.pathname.split('/')[2];
    const moi = await comptes.registre.moi(u.searchParams.get('session'));
    if (!sockets.has(id)) sockets.set(id, new Set());
    const S = sockets.get(id);
    let attache = null;
    if (process.env.DEBUG) console.log('  [ws]', qui.email, id, !!moi);
    const entree = { compte: moi.id, send: (m) => { if (process.env.DEBUG) console.log('  [ws →]', qui.email, String(m).slice(0, 160)); ws.send(m); }, close: (code, raison) => { try { ws.close({ code, reason: raison }); } catch (e) { /* (déjà fermée) */ } }, serializeAttachment: (a) => { attache = a; }, deserializeAttachment: () => attache };
    S.add(entree);
    env.MONDES.get(id);
    const d = mondes.get(id);
    ws.onMessage((m) => d.webSocketMessage(entree, m));
    ws.onClose(() => { S.delete(entree); d.webSocketClose(entree, 1000); });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push(`${qui.email} : ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${qui.email} console : ${m.text()}`); });
  return p;
}
const action = (p, nom, data = {}) => p.evaluate(([nom, data]) => { const x = document.createElement('button'); x.dataset.action = nom; Object.assign(x.dataset, data); document.body.appendChild(x); x.click(); x.remove(); }, [nom, data]);
const attendre = async (p, f, arg, ms = 30000) => { const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.evaluate(f, arg); } catch (e) { ok = false; } if (ok) return Date.now() - t0; if (Date.now() - t0 > ms) return null; await p.waitForTimeout(50); } };
const pret = () => /à jour/.test((document.getElementById('en-ligne-bandeau') || {}).innerText || '') && !!(window.FarmStage && FarmStage.ready && FarmStage.ready());
const propre = (p) => p.evaluate(() => { const st = document.createElement('style'); st.textContent = '#tuto-root, #consent-banner, .toast { display: none !important; }'; document.head.appendChild(st); });
try {
  const pa = await onglet(A, solo('Alex', 1)), pb = await onglet(B, solo('Sam', 7));
  // un jeu 1.22.0 (son hello sans format) : refusé, une fois le monde réveillé par le Worker d'aujourd'hui
  await pb.goto(`${BASE}/jeu.html`);
  await attendre(pb, () => window.FarmStage && FarmStage.ready && FarmStage.ready());
  const refus = await pb.evaluate(([id, session]) => new Promise((ok) => { const ws = new WebSocket(`ws://127.0.0.1:8787/mondes/${id}/ws?session=${encodeURIComponent(session)}`); ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', version: '1.22.0' })); ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'refus' || m.t === 'bienvenue') { ok(m); ws.close(); } }; setTimeout(() => ok(null), 15000); }), [ID, B.session]);
  const reg = mondes.get(ID).registre;
  const w = reg.charger();
  verifie(refus && refus.t === 'refus' && /recharge la page/.test(refus.erreur || ''), `un jeu 1.22.0 est refusé (« ${refus && refus.erreur} »)`);
  verifie(ilePartagee(w) && !(w.essais && w.essais.village) && !!w.port.lieu && villageoisDe(w).length === 0 && JSON.stringify([w.blocs, w.niveauxHauts, w.etage]) === JSON.stringify([avant.blocs, avant.niveauxHauts, avant.etage]) && reg.meta('version') === GAME_VERSION,
    `le monde du jeu d'avant est passé sur l'île à sa première ouverture, sans essai (version ${reg.meta('version')}, format ${reg.meta('format')}) : sa ferme, son étage et son niveau 2 intacts, le port, aucun villageois`);
  // A et B entrent
  for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${ID}`);
  const dedans = (await attendre(pa, pret, null, 40000)) !== null && (await attendre(pb, pret, null, 40000)) !== null;
  for (const p of [pa, pb]) await propre(p);
  const fA = await attendre(pa, () => !!document.getElementById('retour-ile-titre') && /sauvegardes du monde/.test(document.querySelector('.retour-ile-body').innerText), null, 15000);
  const fB = await attendre(pb, () => !!document.getElementById('retour-ile-titre') && /Tu aides le propriétaire/.test(document.querySelector('.retour-ile-body').innerText), null, 15000);
  if (CAPTURES) { await pa.waitForTimeout(500); await pa.screenshot({ path: `${CAPTURES}/12-monde-main-proprietaire.png` }); await pb.screenshot({ path: `${CAPTURES}/13-monde-main-invite.png` }); }
  if (!(dedans && fA !== null && fB !== null)) console.log('  (A :', JSON.stringify(await pa.evaluate(() => [location.search, (document.getElementById('en-ligne-bandeau') || {}).innerText, (document.querySelector('.modal') || {}).innerText].map((x) => String(x).slice(0, 300)))), ')\n  (B :', JSON.stringify(await pb.evaluate(() => [location.search, (document.getElementById('en-ligne-bandeau') || {}).innerText, (document.querySelector('.modal') || {}).innerText].map((x) => String(x).slice(0, 300)))), ')');
  if (!(dedans && fA !== null)) console.log('  (erreurs :', erreurs.slice(0, 6).join(' / '), ')');
  if (CAPTURES && !(dedans && fA !== null)) await pa.screenshot({ path: `${CAPTURES}/debug-a.png` });
  verifie(dedans && fA !== null && fB !== null, 'A et B entrent avec le jeu 2.0.0 ; chacun voit sa fenêtre du retour (au propriétaire : la ferme d\'avant dans 💾)');
  for (const p of [pa, pb]) await action(p, 'retour-ile-ok');
  // à deux : B pose un mur, A le voit ; le temps passe ; les parties confirmées sont celle du monde
  await action(pb, 'build-toggle');
  await attendre(pb, () => document.body.classList.contains('construction'), null, 5000);
  const libre = (() => { for (let t = 0; t < 644 * 510; t += 7) if (poseStatus(reg.charger(), 'mur_pierre', t).ok) return t; return null; })();
  const mur = await pb.evaluate(async (t) => { const C = await import('/js/ui/commandes.js'); const r = C.executer('bloc.poser', { sorte: 'mur_pierre', case: t }); return { ok: !!r.ok, erreur: r.error || '' }; }, libre);
  const vu = await attendre(pa, (t) => import('/js/engine/index.js').then((E) => E.blocAt(FF.state, t) === 'mur_pierre'), libre, 8000);
  const pas0 = pasDe(reg.charger());
  await pa.waitForTimeout(11000);
  reg.avancer();
  const memePas = async (p) => {
    reg.avancer();
    const srv = reg.charger(), pas = pasDe(srv);
    const cf = await p.evaluate(async (k) => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); const S = L._lien().synchro; if (S.vivante && k >= E.pasDe(S.confirmee)) S.avancerConfirmee(k); return { pas: E.pasDe(S.confirmee), em: E.empreintePartie(S.confirmee) }; }, pas);
    if (cf.pas === pas) return cf.em === empreintePartie(srv);
    const copie = JSON.parse(JSON.stringify(srv)); avancerJusqua(copie, cf.pas); return cf.em === empreintePartie(copie);
  };
  verifie(mur.ok && vu !== null && pasDe(reg.charger()) > pas0 && (await memePas(pa)) && (await memePas(pb)),
    `à deux : B pose un mur (${mur.erreur || 'ok'}), A le voit en ${vu} ms ; le temps passe (pas ${pas0} → ${pasDe(reg.charger())}) ; les parties confirmées sont celle du monde`);
  if (CAPTURES) { await action(pb, 'build-toggle'); await pa.waitForTimeout(800); await pa.screenshot({ path: `${CAPTURES}/14-monde-main-a-deux.png` }); }
  verifie(countItem(reg.charger(), 'planche') >= DATA.VILLAGE.MIGRATION.CADEAU.objets.planche, 'le cadeau de bienvenue au coffre commun');
} finally {
  await navigateur.close();
  serveur.close();
}
const vraies = erreurs.filter((e) => !/WebSocket|net::ERR|Failed to load resource/.test(e));
console.log(`${echecs.length ? `${echecs.length} échec(s)` : 'Tout passe'} ; erreurs de la page : ${vraies.length ? vraies.slice(0, 5).join(' | ') : 'aucune'}`);
process.exit(echecs.length || vraies.length ? 1 : 0);
