#!/usr/bin/env node
// Test de fumée du jeu dans un vrai navigateur (Playwright + Chromium), hors CI.
// Sert le dépôt avec un petit serveur statique Node sur un port libre, ouvre jeu.html, lance une
// partie (« Partir pour la ferme ») puis visite les cartes par window.FermeHote.go : la mine de
// la ferme, la ville refusée (les autres cartes sont fermées : DATA.CARTES.AUTRES), puis, en
// god mode, la ville (gare), le chemin de transition, la montagne, la plage, la grotte, et
// revient à la ferme.
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

// Les cartes visitées (cible donnée à FermeHote.go), dans l'ordre. « god » : le god mode
// s'allume avant (les autres cartes que la mine ne s'ouvrent qu'ainsi) ; « refusee » : la carte
// ne doit pas s'ouvrir.
const MINE = 'ville-carte.html?carte=grotte&grotte=ferme&niveau=1&arrivee=haut';
const REFUSEE = 'ville-carte.html?carte=ville&arrivee=ferme';
const GOD = 'god';
const CARTES = [
  MINE,
  'jeu.html',
  REFUSEE,
  GOD,
  'ville-carte.html?carte=ville&arrivee=gare',
  'ville-carte.html?carte=transition&arrivee=ferme',
  'ville-carte.html?carte=montagne&arrivee=gare',
  'ville-carte.html?carte=plage&arrivee=gare',
  'ville-carte.html?carte=grotte&grotte=30&niveau=1&arrivee=haut',
  'jeu.html',
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
  const depart = page.locator('[data-action="setup-start"]');
  await depart.waitFor({ state: 'visible', timeout: 15000 });
  const nom = page.locator('#setup-nom');
  if (await nom.count()) await nom.fill('Fumée');
  await depart.click();
  await page.waitForTimeout(PAUSE_MS);
  if (await depart.isVisible()) erreurs.push('[nouvelle partie] la fenêtre de départ est toujours ouverte');
  for (const cible of CARTES) {
    etape = cible;
    if (cible === GOD) {
      await page.evaluate(async () => { (await import('/js/ui/store.js')).setGodMode(true); });
      console.log('  · (god mode)');
      continue;
    }
    await page.waitForFunction(() => window.FermeHote && typeof window.FermeHote.go === 'function', null, { timeout: 10000 });
    await page.evaluate((c) => window.FermeHote.go(c), cible);
    await page.waitForTimeout(PAUSE_MS);
    // La carte ouverte (l'élément des cartes porte data-carte ; rien de visible à la ferme).
    const attendue = cible.startsWith('jeu.html') || cible === REFUSEE ? null : new URLSearchParams(cible.split('?')[1]).get('carte');
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
  console.log(`\nTest de fumée : jeu.html, une nouvelle partie et ${CARTES.filter((c) => c !== GOD && c !== REFUSEE && !c.startsWith('jeu.html')).length} cartes sans erreur, en ${duree} s.`);
}
process.exit(code);
