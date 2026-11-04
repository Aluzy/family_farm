// Test de bout en bout du jeu à deux (E-2), dans un vrai navigateur : deux onglets, deux comptes, un monde.
// Le jeu est servi par un petit serveur statique ; le Worker est le vrai (worker/src/index.js), avec ses
// Durable Objects (Comptes, Monde) sur des bases node:sqlite, derrière les routes du navigateur (HTTP et
// WebSocket vers http://127.0.0.1:8787, l'adresse locale du jeu en ligne : js/ui/compte.js).
// Ce qu'il vérifie :
//   1. le joueur A met sa ferme en ligne (⚙️ Options › Jeu en ligne) et y entre ;
//   2. E-3 : A crée un lien d'invitation (👥 › Inviter un ami) ; B l'ouvre et entre dans le monde :
//      les deux y sont, bandeau « à jour », mode Construire ouvert ;
//   3. un mur posé chez l'un est vu chez l'autre en moins d'une seconde, dans les deux sens ;
//   4. la partie confirmée de chacun est celle du monde (la même empreinte) ;
//   5. la partie solo de A, sur l'appareil, n'est jamais touchée en ligne ;
//   6. une action hors de Construire est refusée en ligne (un message, rien ne change) ;
//   7. E-3 : A retire B : la connexion de B est coupée, B revient à sa ferme solo.
// Lancer : node tests/deux-joueurs.mjs (Playwright et Chromium requis ; sinon, le test est sauté).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { addItem, DATA, empreintePartie, testFarmMap, testFermeConstruite } from '../js/engine/index.js';
import { garden } from './engine/aide.mjs';
import W from '../worker/src/index.js';
import { Comptes } from '../worker/src/comptes.mjs';
import { Monde, traiterMessage } from '../worker/src/monde.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const saute = (r) => { console.log(`Test à deux sauté : ${r}`); process.exit(0); };
const require = createRequire(import.meta.url);
let playwright = null;
for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { playwright = require(require.resolve(nom)); break; } catch { /* suivant */ } }
if (!playwright) saute('Playwright introuvable.');

// --- le jeu, servi tel quel ---
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

// --- le Worker et ses Durable Objects ---
const baseSql = () => { const db = new DatabaseSync(':memory:'); return { exec(q, ...v) { const r = db.prepare(q).all(...v); return { toArray: () => r }; } }; };
const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
const mondes = new Map(), sockets = new Map();
const env = {
  JEU_URL: '',   // (posée plus bas : l'adresse du serveur du jeu, où mène le lien d'invitation)
  COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (r) => comptes.fetch(r) }) },
  // (les WebSockets du monde : celles que le navigateur ouvre, routées plus bas ; comme celles d'un
  // Durable Object : getWebSockets(étiquette), getTags)
  MONDES: { idFromName: (x) => x, get: (x) => {
    if (!mondes.has(x)) {
      const ctx = { storage: { sql: baseSql() }, getWebSockets: (tag) => [...(sockets.get(x) || [])].filter((w) => !tag || w.compte === tag), getTags: (w) => [w.compte] };
      mondes.set(x, new Monde(ctx, {}));
    }
    return { fetch: (r) => mondes.get(x).fetch(r) };
  } },
};
const compte = async (email) => { const l = await comptes.registre.demanderLien(email); const c = await comptes.registre.connecter(l.jeton); return { session: c.session, email, id: c.compte.id }; };
env.JEU_URL = `${BASE}/jeu.html`;
const A = await compte('alex@exemple.fr'), B = await compte('sam@exemple.fr');

// la partie solo de chacun : la ferme d'essai (F0-6)
const s0 = garden();
testFarmMap(s0, '42');
testFermeConstruite(s0);
addItem(s0, DATA.ATELIER.BLOCS.mur_pierre.objet, 20);
const SAUVEGARDE = JSON.stringify({ v: s0.version, t: Date.now(), s: s0 });

let navigateur;
try { navigateur = await playwright.chromium.launch(); } catch (e) { serveur.close(); saute(`Chromium ne démarre pas (${String(e.message).split('\n')[0]}).`); }
const erreurs = [];
async function onglet(qui) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(([v, c]) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('ferme-save', v); localStorage.setItem('ferme-compte', JSON.stringify(c)); sessionStorage.setItem('x', 1); } }, [SAUVEGARDE, { session: qui.session, email: qui.email }]);
  await ctx.route('http://127.0.0.1:8787/**', async (route) => {
    const rq = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const r = await W.fetch(new Request(rq.url(), { method: rq.method(), headers: { ...rq.headers(), origin: 'https://aluzy.github.io' }, body: rq.postData() || undefined }), env);
    return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: await r.text() });
  });
  await ctx.routeWebSocket(/127\.0\.0\.1:8787\/mondes\/.*\/ws/, async (ws) => {
    const u = new URL(ws.url()), id = u.pathname.split('/')[2];
    const moi = await comptes.registre.moi(u.searchParams.get('session'));
    const reg = mondes.get(id).registre;
    if (!sockets.has(id)) sockets.set(id, new Set());
    const S = sockets.get(id);
    const entree = { compte: moi.id, send: (m) => ws.send(m), close: (code, raison) => ws.close({ code, reason: raison }) };
    S.add(entree);
    const d = mondes.get(id);
    ws.onMessage((m) => traiterMessage(reg, moi.id, m, (x) => ws.send(JSON.stringify(x)), (x) => d.diffuser(x)));
    ws.onClose(() => S.delete(entree));
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push(`${qui.email} : ${e.message}`));
  return p;
}
const action = (p, nom, data = {}) => p.evaluate(([nom, data]) => { const x = document.createElement('button'); x.dataset.action = nom; Object.assign(x.dataset, data); document.body.appendChild(x); x.click(); x.remove(); }, [nom, data]);
// (une navigation pendant la vérification, le lien d'invitation par exemple : on réessaie)
const attendre = async (p, f, arg, ms = 20000) => { const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.evaluate(f, arg); } catch (e) { ok = false; } if (ok) return Date.now() - t0; if (Date.now() - t0 > ms) return null; await p.waitForTimeout(25); } };
const echecs = [];
const verifie = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) echecs.push(texte); };

try {
  const pa = await onglet(A);
  await pa.goto(`${BASE}/jeu.html`);
  await attendre(pa, () => window.FarmStage && FarmStage.ready && FarmStage.ready());
  await action(pa, 'open-options');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-creer"]'));
  await action(pa, 'monde-creer');
  await attendre(pa, () => /Entrer/.test((document.getElementById('compte-zone') || {}).innerText || ''));
  const idMonde = [...mondes.keys()][0];
  verifie(!!idMonde && /Entrer/.test(await pa.evaluate(() => document.getElementById('compte-zone').innerText)), '1. A a mis sa ferme en ligne, elle est dans ses mondes');
  await pa.goto(`${BASE}/jeu.html?monde=${idMonde}`);
  const pret = () => /à jour/.test((document.getElementById('en-ligne-bandeau') || {}).innerText || '') && document.body.classList.contains('construction');
  await attendre(pa, pret);
  // E-3 : le lien d'invitation, créé dans 👥
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-inviter"]'));
  await action(pa, 'monde-inviter');
  await attendre(pa, () => !!document.getElementById('invitation-lien'));
  const lienInvitation = await pa.evaluate(() => document.getElementById('invitation-lien').value);
  await action(pa, 'close-modal');
  const pb = await onglet(B);
  await pb.goto(`${BASE}/jeu.html`);
  await attendre(pb, () => window.FarmStage && FarmStage.ready && FarmStage.ready());
  await pb.goto(lienInvitation);   // (le lien, dans l'onglet de B, son jeu déjà ouvert)
  await attendre(pb, () => /[?&]monde=/.test(location.search), null, 20000);
  verifie(/#invitation=/.test(lienInvitation) && (await attendre(pa, pret)) !== null && (await attendre(pb, pret)) !== null && /2/.test(await pa.evaluate(() => document.getElementById('en-ligne-bandeau').innerText)), '2. B a suivi le lien d\'invitation de A : les deux sont dans le monde, à jour, le mode Construire ouvert');
  const soloA = await pa.evaluate(() => localStorage.getItem('ferme-save'));
  const caseLibre = (p) => p.evaluate(() => { const sc = FarmStage.scene(), T0 = sc.ctx.bridge.trace, W = sc.grid.cols, v = sc.cameras.main.worldView; const cx = Math.floor((v.x + v.width / 2) / 16), cy = Math.floor((v.y + v.height / 2) / 16); for (let d = 0; d < 14; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { const t = (cy + dy) * W + cx + dx; if (T0.posable(t) === 'ok') return t; } return null; });
  const voit = (t) => !!(FarmStage.scene().blocks && FarmStage.scene().blocks.has(t));
  for (const [de, vers, nom] of [[pa, pb, 'A → B'], [pb, pa, 'B → A']]) {
    await action(de, 'build-pick', { sorte: 'mur_pierre' });   // (un mur en main)
    const t = await caseLibre(de);
    await action(de, 'bloc', { case: String(t) });
    const ms = await attendre(vers, voit, t, 5000);
    verifie(ms !== null && ms < 1000, `3. un mur posé (${nom}) est vu en ${ms} ms`);
  }
  await attendre(pa, () => !/en attente/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  const reg = mondes.get(idMonde).registre;
  const confirmee = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); return E.empreintePartie(L._lien().synchro.confirmee); });
  const em = empreintePartie(reg.charger());
  verifie((await confirmee(pa)) === em && (await confirmee(pb)) === em && reg.rev === 2, `4. les deux parties confirmées sont celle du monde (révision ${reg.rev})`);
  await pa.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  verifie((await pa.evaluate(() => localStorage.getItem('ferme-save'))) === soloA, '5. la partie solo de A n\'est pas touchée en ligne');
  const avant = reg.rev;
  await action(pa, 'harvest-all');
  await pa.waitForTimeout(300);
  verifie(reg.rev === avant && /construit ensemble/.test(await pa.evaluate(() => document.body.innerText)), '6. hors de Construire, un geste est refusé en ligne');
  // 7. E-3 : A retire B
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-retirer"]'));
  await action(pa, 'monde-retirer', { compte: B.id });
  await action(pa, 'monde-retirer-oui', { compte: B.id });
  const revenu = await attendre(pb, () => location.pathname.endsWith('jeu.html') && !/monde=/.test(location.search) && !document.getElementById('en-ligne-bandeau'), null, 15000);
  verifie(revenu !== null && !mondes.get(idMonde).registre.membre(B.id), '7. A a retiré B : sa connexion coupée, B est revenu à sa ferme solo');
} finally {
  await navigateur.close();
  serveur.close();
}
for (const e of erreurs) console.log(`✗ erreur dans la page : ${e}`);
if (echecs.length || erreurs.length) { console.log(`Test à deux : ${echecs.length + erreurs.length} échec(s).`); process.exit(1); }
console.log('Test à deux : tout est bon.');
