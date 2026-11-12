// Le studio du trailer : le jeu servi tel quel, le vrai Worker du jeu en ligne en mémoire (comme
// tests/deux-joueurs.mjs), des onglets Chromium à l'horloge tenue (page.clock de Playwright), et la
// prise de vue image par image : à chaque image, l'horloge de chaque onglet avance d'un trentième de
// seconde, puis l'onglet filmé est capturé. Le film ne dépend donc pas de la vitesse de la machine.
// Sert à scripts/trailer/tourner.mjs. Playwright et Chromium requis (ceux de tests/smoke.mjs).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import W from '../../worker/src/index.js';
import { Comptes } from '../../worker/src/comptes.mjs';
import { Monde } from '../../worker/src/monde.mjs';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const IPS = 30;   // images par seconde du film

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.tmj': 'application/json', '.tsj': 'application/json' };

function trouvePlaywright() {
  const require = createRequire(import.meta.url);
  for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(require.resolve(nom)); } catch { /* suivant */ } }
  return null;
}

export async function ouvrirStudio() {
  const playwright = trouvePlaywright();
  if (!playwright) throw new Error('Playwright introuvable (npm i -D playwright).');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

  // --- le jeu, servi tel quel ---
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

  // --- le Worker et ses Durable Objects, en mémoire ---
  const baseSql = () => { const db = new DatabaseSync(':memory:'); return { exec(q, ...v) { const r = db.prepare(q).all(...v); return { toArray: () => r }; } }; };
  const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
  const mondes = new Map(), sockets = new Map();
  const r2m = new Map();
  const r2 = {
    async put(k, v, o = {}) { r2m.set(k, { v, o }); },
    async get(k) { const x = r2m.get(k); return x ? { text: async () => x.v } : null; },
    async delete(k) { r2m.delete(k); },
    async list({ prefix }) { return { objects: [...r2m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: r2m.get(k).v.length, customMetadata: r2m.get(k).o.customMetadata })), truncated: false }; },
  };
  const env = {
    JEU_URL: `${BASE}/jeu.html`,
    COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (r) => comptes.fetch(r) }) },
    MONDES: { idFromName: (x) => x, get: (x) => {
      if (!mondes.has(x)) {
        const ctx = { storage: { sql: baseSql() }, id: { toString: () => x }, getWebSockets: (tag) => [...(sockets.get(x) || [])].filter((w) => !tag || w.compte === tag), getTags: (w) => [w.compte], waitUntil: (p) => p };
        mondes.set(x, new Monde(ctx, { SESSIONS: r2 }));
      }
      return { fetch: (r) => mondes.get(x).fetch(r) };
    } },
  };
  const compte = async (email) => { const l = await comptes.registre.demanderLien(email); const c = await comptes.registre.connecter(l.jeton); return { session: c.session, email, id: c.compte.id }; };

  const navigateur = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const erreurs = [];

  // Un onglet : sa partie solo (le texte de la sauvegarde), son compte (pour le jeu en ligne), sa taille.
  async function onglet({ sauvegarde, qui = null, largeur = 1920, hauteur = 1080, nom = 'onglet' }) {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur } });
    await ctx.addInitScript(([v, c]) => {
      if (!sessionStorage.getItem('x')) {
        localStorage.setItem('ferme-save', v);
        if (c) localStorage.setItem('ferme-compte', JSON.stringify(c));
        sessionStorage.setItem('x', 1);
      }
      sessionStorage.setItem('ferme-titre-vu', '1');
    }, [sauvegarde, qui && { session: qui.session, email: qui.email }]);
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
      const entree = { compte: moi.id, send: (m) => ws.send(m), close: (code, raison) => { try { ws.close({ code, reason: raison }); } catch (e) { /* (déjà fermée) */ } }, serializeAttachment: (a) => { attache = a; }, deserializeAttachment: () => attache };
      S.add(entree);
      const d = mondes.get(id);
      ws.onMessage((m) => d.webSocketMessage(entree, m));
      ws.onClose(() => { S.delete(entree); d.webSocketClose(entree, 1000); });
    });
    // (rien ne sort du poste)
    await ctx.route((url) => !url.href.startsWith(BASE) && !url.href.startsWith('http://127.0.0.1:8787'), (route) => route.abort());
    const p = await ctx.newPage();
    await p.clock.install();
    // (une image du jeu par image du film : le navigateur en demanderait deux)
    await p.addInitScript(() => { window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 33); window.cancelAnimationFrame = (id) => clearTimeout(id); });
    p.on('pageerror', (e) => { erreurs.push(`${nom} : ${e.message}`); console.log(`  ! ${nom} : ${e.message}`); });
    return p;
  }

  return { BASE, navigateur, mondes, compte, onglet, erreurs, async fermer() { await navigateur.close(); serveur.close(); } };
}

// Un bouton du jeu (data-action), cliqué comme le ferait le joueur.
export const action = (p, nom, data = {}) => p.evaluate(([nom, data]) => { const x = document.createElement('button'); x.dataset.action = nom; Object.assign(x.dataset, data); document.body.appendChild(x); x.click(); x.remove(); }, [nom, data]);

// Attendre qu'une condition soit vraie dans la page (l'horloge tourne encore).
export async function attendre(p, f, arg, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    let ok = false;
    try { ok = await p.evaluate(f, arg); } catch (e) { ok = false; }
    if (ok) return true;
    if (Date.now() - t0 > ms) return false;
    await p.waitForTimeout(50);
  }
}

export const scenePrete = (p) => attendre(p, () => !!(window.FarmStage && FarmStage.ready && FarmStage.ready()), null, 90000);

// Le plateau : les onglets dont l'horloge est tenue. `filmer` avance tout le monde image par image.
export function plateau(pages) {
  let reste = 0;   // (les millisecondes pas encore données : 1000 / 30 n'est pas entier)
  const pas = async () => {
    reste += 1000 / IPS;
    const ms = Math.floor(reste);
    reste -= ms;
    await Promise.all(pages.map((p) => p.clock.runFor(ms)));
  };
  return {
    async figer() { for (const p of pages) { const t = await p.evaluate(() => Date.now()); await p.clock.pauseAt(new Date(t + 3000)); } },
    // Laisser passer `s` secondes de jeu sans filmer.
    async passer(s) { for (let i = 0; i < Math.round(s * IPS); i++) await pas(); },
    // Filmer `s` secondes de l'onglet `p` dans `dossier` ; `chaque(i, n)` est appelé avant chaque image.
    // (`une sur` : au brouillon, une image sur k seulement est capturée)
    async filmer(p, dossier, s, chaque = null, uneSur = 1) {
      mkdirSync(dossier, { recursive: true });
      const n = Math.round(s * IPS);
      for (let i = 0; i < n; i++) {
        if (chaque) await chaque(i, n);
        await pas();
        if (i % uneSur === 0) await p.screenshot({ path: join(dossier, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95, timeout: 120000 });
      }
      return n;
    },
  };
}
