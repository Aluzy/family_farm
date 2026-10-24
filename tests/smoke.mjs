#!/usr/bin/env node
// Test de fumée du jeu dans un vrai navigateur (Playwright + Chromium), hors CI.
// Sert le dépôt avec un petit serveur statique Node sur un port libre, ouvre jeu.html, lance une
// partie (« Partir pour la ferme ») puis visite les niveaux de la mine par window.FermeHote.go
// (le premier, puis un plus profond), et revient à la ferme.
// Échoue sur une erreur de la console, une exception de la page ou une réponse HTTP ≥ 400.
// Sans Playwright ou sans Chromium : message, et sortie 0 (le test est sauté).
//
// Usage : npm run smoke   (ou node tests/smoke.mjs [--voir] : --voir ouvre une fenêtre)
// Playwright : celui du dépôt s'il est installé, sinon /opt/node-tools/node_modules/playwright ;
// navigateurs : PLAYWRIGHT_BROWSERS_PATH (par défaut /opt/pw-browsers s'il existe).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOIR = process.argv.includes('--voir');

// Les cartes visitées (cible donnée à FermeHote.go), dans l'ordre : « grotte?… », un niveau de
// la mine ; « jeu.html », la ferme.
const CARTES = [
  'grotte?grotte=ferme&niveau=1&arrivee=haut',
  'jeu.html',
  'grotte?grotte=ferme&niveau=4&arrivee=haut',
  'jeu.html?arrivee=mine',
];
const PAUSE_MS = 1500; // le temps qu'une carte se charge et tourne un peu

function saute(raison) {
  console.log(`Test de fumée sauté : ${raison}`);
  process.exit(0);
}

// --- Playwright, s'il est là ---
function trouvePlaywright() {
  const require = createRequire(import.meta.url);
  for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try {
      return require(require.resolve(nom));
    } catch { /* suivant */ }
  }
  return null;
}
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const playwright = trouvePlaywright();
if (!playwright) saute('Playwright introuvable (npm i -D playwright, ou /opt/node-tools/node_modules/playwright).');

// --- serveur statique ---
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8', '.tmj': 'application/json', '.tsj': 'application/json',
};
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let fichier = normalize(join(RACINE, chemin));
  if (fichier !== RACINE && !fichier.startsWith(RACINE + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(fichier) && statSync(fichier).isDirectory()) fichier = join(fichier, 'index.html');
  if (!existsSync(fichier)) { res.writeHead(404).end('introuvable'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(fichier).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(fichier));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;

// --- navigateur ---
let navigateur;
try {
  navigateur = await playwright.chromium.launch({ headless: !VOIR });
} catch (e) {
  serveur.close();
  saute(`Chromium ne démarre pas (${String(e.message).split('\n')[0]}).`);
}

const erreurs = [];
let etape = 'chargement';
const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
// Rien ne sort du poste : les requêtes vers un autre hôte sont coupées (et pas comptées).
await page.route((url) => !url.href.startsWith(BASE), (route) => route.abort());
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`[${etape}] console : ${m.text()}${m.location()?.url ? ` (${m.location().url.replace(BASE, '')})` : ''}`); });
page.on('pageerror', (e) => erreurs.push(`[${etape}] exception : ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) erreurs.push(`[${etape}] HTTP ${r.status()} : ${r.url().replace(BASE, '')}`); });
page.on('requestfailed', (r) => { if (r.url().startsWith(BASE)) erreurs.push(`[${etape}] requête échouée : ${r.url().replace(BASE, '')} (${r.failure()?.errorText})`); });

const debut = performance.now();
let code = 0;
try {
  await page.goto(`${BASE}/jeu.html`, { waitUntil: 'load' });
  etape = 'nouvelle partie';
  // l'accueil : une question par écran (js/ui/depart.js), jusqu'à « C'est parti ! »
  const clic = async (sel) => { const b = page.locator(sel).first(); await b.waitFor({ state: 'visible', timeout: 15000 }); await b.click(); };
  const saisir = async (texte) => { await page.locator('#accueil-champ').fill(texte); await clic('[data-action="accueil-suite"]'); };
  await clic('[data-action="accueil-suite"]');
  await clic('[data-action="accueil-perso"]');
  await clic('[data-action="accueil-suite"]');
  await saisir('Fumée');
  await saisir('Test');
  for (let k = 0; k < 4; k++) await clic(k ? '[data-action="accueil-non"]' : '[data-action="accueil-oui"]');
  const depart = page.locator('[data-action="setup-start"]');
  await depart.waitFor({ state: 'visible', timeout: 15000 });
  await depart.click();
  await page.waitForTimeout(PAUSE_MS);
  if (await depart.isVisible()) erreurs.push('[nouvelle partie] la fenêtre de départ est toujours ouverte');
  for (const cible of CARTES) {
    etape = cible;
    await page.waitForFunction(() => window.FermeHote && typeof window.FermeHote.go === 'function', null, { timeout: 10000 });
    await page.evaluate((c) => window.FermeHote.go(c), cible);
    await page.waitForTimeout(PAUSE_MS);
    // La carte ouverte (l'élément des cartes porte data-carte ; rien de visible à la ferme).
    const attendue = cible.startsWith('grotte') ? 'grotte' : null;
    const ouverte = await page.evaluate(() => {
      const el = document.querySelector('[data-carte]');
      return el && !el.hidden ? el.dataset.carte : null;
    });
    if (ouverte !== attendue) erreurs.push(`[${cible}] carte affichée : ${ouverte ?? 'aucune'}, attendue : ${attendue ?? 'aucune (la ferme)'}`);
    console.log(`  · ${cible}`);
  }
} catch (e) {
  erreurs.push(`[${etape}] ${e.message.split('\n')[0]}`);
} finally {
  await navigateur.close();
  serveur.close();
}

const duree = ((performance.now() - debut) / 1000).toFixed(1);
if (erreurs.length) {
  console.log(`\nTest de fumée : ${erreurs.length} problème(s) en ${duree} s :`);
  for (const e of erreurs) console.log(`  ✗ ${e}`);
  code = 1;
} else {
  console.log(`\nTest de fumée : jeu.html, une nouvelle partie et ${CARTES.filter((c) => c.startsWith('grotte')).length} niveaux de la mine sans erreur, en ${duree} s.`);
}
process.exit(code);
