#!/usr/bin/env node
// I9g (les performances, docs/fiches/ile/I9g-performances.md) : la scène d'une île de quinze villageois dans un vrai
// navigateur (Chromium, par Playwright), sur trois appareils émulés : le bureau (le processeur tel quel), un téléphone de
// milieu de gamme (le processeur ralenti 4 fois, Emulation.setCPUThrottlingRate) et un téléphone modeste (6 fois), à
// l'écran d'un téléphone (412 × 860). Rien ne sort du poste : la page est servie en local, les autres hôtes coupés.
//
// La partie : l'île du joueur automatique (graine 1, « applique », 10 villageois au jour 161) plus cinq maisons et leurs
// villageois (comme scripts/cout-performances.mjs), ouverte en solo avec ?village=1, de jour, le village à l'écran.
// Ce qui est mesuré : le chargement (jusqu'à la carte), le temps d'une image pendant 8 s (médiane, pire centième, la
// part des images de plus de 33 ms), la mémoire du tas JavaScript, et ce que coûte à la page la copie remise à jour
// (I9f : la partie entière remplacée, setState et refresh, comme partieRefaite de js/ui/en-ligne.js ; le moteur, lui, est
// mesuré par scripts/cout-performances.mjs), jusqu'à l'image suivante.
//
// Usage : node scripts/mesure-scene-ile.mjs [--partie ile-10.json] [--secondes 8] [--appareils 1,4,6] [--racine <dossier>]
// (sans --partie, l'île de 10 est jouée par le joueur automatique : une minute ou deux)

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT } from './lib/engine-source.mjs';
import * as E from '../js/engine/index.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const SECONDES = Number(opt('secondes', 8));
const RACINE = resolve(opt('racine', ROOT));   // (le jeu servi : une autre copie du dépôt, la base d'une comparaison)
const APPAREILS = String(opt('appareils', '1,4,6')).split(',').map(Number);
const NOMS = { 1: 'bureau', 4: 'téléphone moyen (×4)', 6: 'téléphone modeste (×6)' };

/* ---------- la partie ---------- */
const cloner = (v) => JSON.parse(JSON.stringify(v));
let s10;
if (opt('partie', null)) s10 = JSON.parse(readFileSync(opt('partie'), 'utf8'));
else {
  s10 = E.createNewGame(1, { nom: 'Simulation' });
  E.commencerObjectifs(s10);
  for (let k = 0; k < 260 && (s10.villageois || []).length < 10; k += 5) E.simulatePlay(s10, 'applique', 5);
}
const s = cloner(s10), T = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
for (let k = 0; (s.villageois || []).length < 15; k++) {
  if (!E.testMaisonVillageois(s).ok) break;
  const r = E.arriverVillageois(s, { direct: true });
  if (!r.ok) break;
  const [t, o] = T[k % T.length];
  if (o) { s.outils[o] = true; E.donnerOutil(s, r.villageois.id, o); }
  E.attribuer(s, r.villageois.id, t);
}
s.awakeMs = 4 * 3600 * 1000 * (E.DATA.TEMPS.SECONDES_PAR_HEURE / 3600);   // (vers 10 h : le village au travail)
const SAUVEGARDE = JSON.stringify({ v: s.version, t: Date.now(), s });

/* ---------- le serveur et le navigateur ---------- */
function trouvePlaywright() {
  const req = createRequire(import.meta.url);
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { return req(p); } catch (e) { /* suivant */ } }
  try { return req(join(execSync('npm root -g').toString().trim(), 'playwright')); } catch (e) { return null; }
}
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const playwright = trouvePlaywright();
if (!playwright) { console.log('Playwright introuvable : rien de mesuré.'); process.exit(0); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.tmj': 'application/json', '.tsj': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
let octets = 0;
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = normalize(join(RACINE, chemin));
  if (f !== RACINE && !f.startsWith(RACINE + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  const corps = readFileSync(f);
  octets += corps.length;
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(corps);
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await playwright.chromium.launch();
const pc = (L, q) => { const t = [...L].sort((a, b) => a - b); return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * q))] : 0; };

const lignes = [];
for (const taux of APPAREILS) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((v) => {
    localStorage.setItem('ferme-save', v); localStorage.removeItem('ferme-position'); sessionStorage.setItem('ferme-titre-vu', '1');
    // (la fin du chargement : quand la scène retire l'écran de chargement, window.Chargement.fini)
    let C;
    Object.defineProperty(window, 'Chargement', { configurable: true, get: () => C, set: (x) => { C = x; if (x && typeof x.fini === 'function') { const f = x.fini; x.fini = function (...a) { if (!window.__charge) window.__charge = performance.now(); return f.apply(this, a); }; } } });
  }, SAUVEGARDE);
  const page = await ctx.newPage();
  await page.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: taux });
  octets = 0;
  await page.goto(`${BASE}/jeu.html?village=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__charge, null, { timeout: 180000 }).catch(() => null);
  const chargement = await page.evaluate(() => window.__charge || NaN), telecharge = octets;
  await page.waitForTimeout(6000);   // (ce que la scène charge après coup : chargerTard)
  const images = await page.evaluate((ms) => new Promise((ok) => {
    const L = []; let avant = performance.now(); const fin = avant + ms;
    const f = (t) => { L.push(t - avant); avant = t; if (t < fin) requestAnimationFrame(f); else ok(L); };
    requestAnimationFrame(f);
  }), SECONDES * 1000);
  const tas = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0));
  // la copie remise à jour, côté page : la partie entière remplacée (setState, refresh), jusqu'à l'image suivante
  const copie = await page.evaluate(async () => {
    const st = await import('/js/ui/store.js'), rd = await import('/js/ui/render.js');
    const L = [];
    for (let k = 0; k < 3; k++) {
      const neuve = JSON.parse(JSON.stringify(st.state));
      await new Promise((ok) => requestAnimationFrame(ok));
      const t = performance.now();
      st.setState(neuve);
      rd.refresh();
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      L.push(performance.now() - t);
    }
    return L;
  });
  const villageois = await page.evaluate(async () => ((await import('/js/ui/store.js')).state.villageois || []).length);
  const L = {
    appareil: NOMS[taux] || `×${taux}`, villageois, 'chargement s': +(chargement / 1000).toFixed(1), 'téléchargé Mo': +(telecharge / 1048576).toFixed(1),
    'image médiane ms': +pc(images, 0.5).toFixed(1), 'image p99 ms': +pc(images, 0.99).toFixed(1), 'images > 33 ms': `${Math.round(100 * images.filter((x) => x > 33.4).length / images.length)} %`,
    'ips': +(images.length / SECONDES).toFixed(0), 'tas Mo': +(tas / 1048576).toFixed(0), 'copie remise à jour ms': +Math.min(...copie).toFixed(0), erreurs: erreurs.length,
  };
  lignes.push(L);
  console.log(JSON.stringify(L), erreurs.slice(0, 3));
  await ctx.close();
}
await navigateur.close();
serveur.close();
console.table(lignes);
