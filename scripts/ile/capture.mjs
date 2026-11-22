#!/usr/bin/env node
// Une capture de la scène d'une partie neuve sur l'île (docs/ile-300.md, étape 7b) : la page servie en local, dans
// Chromium (Playwright), à l'écran d'un téléphone ; les erreurs de la page affichées.
// Usage : node scripts/ile/capture.mjs [--graine 1] [--sortie apercus-ile/scene.png] [--attente 8000] [--ecran 412x860]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { ROOT } from '../lib/engine-source.mjs';
import * as E from '../../js/engine/index.js';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const SORTIE = opt('sortie', 'apercus-ile/scene.png'),
  ATTENTE = Number(opt('attente', 8000));
const s = E.createNewGame(Number(opt('graine', 1)), { nom: 'Essai' });
if (E.finishSetup) E.finishSetup(s);
s.awakeMs = 3 * 3600 * 1000 * (E.DATA.TEMPS.SECONDES_PAR_HEURE / 3600);
const SAUVEGARDE = JSON.stringify({ v: s.version, t: Date.now(), s });

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers'))
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const req = createRequire(import.meta.url);
let playwright = null;
for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
  try {
    playwright = req(p);
    break;
  } catch (e) {
    /* suivant */
  }
}
if (!playwright) {
  console.log('Playwright introuvable');
  process.exit(0);
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};
const serveur = createServer((rq, res) => {
  let f = normalize(join(ROOT, decodeURIComponent(new URL(rq.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;
const nav = await playwright.chromium.launch();
const [VL, VH] = String(opt('ecran', '412x860')).split('x').map(Number);
const ctx = await nav.newContext({ viewport: { width: VL, height: VH }, isMobile: VL < 800, hasTouch: VL < 800 });
await ctx.addInitScript((v) => {
  localStorage.setItem('ferme-save', v);
  localStorage.removeItem('ferme-position');
  sessionStorage.setItem('ferme-titre-vu', '1');
}, SAUVEGARDE);
const page = await ctx.newPage();
await page.route(
  (u) => !u.href.startsWith(BASE),
  (r) => r.abort(),
);
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.stack || e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') erreurs.push('[console] ' + m.text());
});
await page.goto(`${BASE}/jeu.html`, { waitUntil: 'load' });
await page.waitForTimeout(ATTENTE);
mkdirSync(dirname(SORTIE), { recursive: true });
await page.screenshot({ path: SORTIE });
console.log(
  JSON.stringify(
    await page.evaluate(() => ({
      perso: window.FarmStage && window.FarmStage.persoCase(),
      vue: window.FarmStage && window.FarmStage.view(),
    })),
  ),
);
console.log(SORTIE);
for (const e of erreurs.slice(0, 12)) console.log(e.slice(0, 600));
await nav.close();
serveur.close();
