// FLU-39 : mesure du nombre de touches d'une nouvelle partie, comme un joueur qui connaît
// le chemin (protocole de docs/taches-fluidite.json, `mesure`) : depuis « Partir pour la
// ferme » jusqu'à 6 parcelles de carottes plantées et arrosées.
//
//   node scripts/mesure-touches.mjs            (écran tactile 390 × 844 px)
//
// Chaque touche vise un élément visible de la page, comme le ferait le joueur ; un
// glissement de la houe sur la carte compte pour une touche. Attendre (que la pompe
// remplisse le réservoir, par exemple) ne compte pas. Pas dans npm test : il lance un
// navigateur (Playwright et Chromium doivent être installés).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    // Playwright installé globalement (npm i -g playwright)
    const req = createRequire(import.meta.url);
    const { execSync } = await import('node:child_process');
    const globalRoot = execSync('npm root -g').toString().trim();
    return req(join(globalRoot, 'playwright'));
  }
}

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path || 'jeu.html'));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const { chromium } = await loadPlaywright();
const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/jeu.html`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let touches = 0;
const log = (what) => console.log(`${String(++touches).padStart(2)}. ${what}`);

// Une touche sur le premier élément visible qui correspond.
async function touch(selector, what) {
  const el = page.locator(selector).locator('visible=true').first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.tap();
  log(what);
  await page.waitForTimeout(350);
}

// Attend une condition sur la partie (sans toucher l'écran).
async function until(fn, arg, what, timeout = 180000) {
  const t0 = Date.now();
  await page.waitForFunction(fn, arg, { timeout, polling: 250 });
  const s = Math.round((Date.now() - t0) / 1000);
  if (s > 1) console.log(`    (attente : ${what}, ${s} s)`);
}

let code = 0;
try {
  await page.goto(url);
  await page.waitForSelector('[data-action="setup-start"]');

  await touch('[data-action="setup-start"]', 'Partir pour la ferme');
  await touch('#modal-root .story-modal .btn.primary', 'En route');
  await touch('[data-action="consent-refuse"]', 'Bandeau du suivi : Refuser');
  await touch('[data-action="tuto-skip"]', 'Passer l\'aide');

  // Chapitre 1 : la puce d'objectif mène à chaque achat
  await touch('.stage-chip:not(.hoe)', 'Puce « Réparer la maison »');
  await touch('[data-action="repair-house"]', 'Réparer la maison');
  await touch('[data-action="buy-starter"][data-id="panneau"]', 'Acheter le panneau');
  await touch('[data-action="buy-starter"][data-id="pompe"]', 'Acheter la pompe');
  await touch('[data-action="buy-starter"][data-id="reservoir"]', 'Acheter le réservoir');
  await touch('#stage-window-close', 'Fermer la Maison (la puce est dessous)');
  await touch('.stage-chip:not(.hoe)', 'Puce « Acheter une houe »');
  await touch('[data-action="shop-item"][data-kind="houe"]', 'Case de la houe');
  await touch('[data-action="buy-hoe"]', 'Acheter la houe (la fiche se ferme)');
  // une nouvelle partie n'a pas de graines : 10 graines de carotte, d'un coup si possible
  await touch('[data-action="comptoir-tab"][data-tab="graines"]', 'Onglet Graines');
  await touch('[data-action="shop-item"][data-item="graine_carotte"]', 'Case des graines de carotte');
  const dix = page.locator('[data-action="buy-item"][data-item="graine_carotte"][data-q="10"]');
  if (await dix.isEnabled()) await touch('[data-action="buy-item"][data-item="graine_carotte"][data-q="10"]', 'Acheter 10 graines de carotte');
  else {
    await touch('[data-action="buy-item"][data-item="graine_carotte"][data-q="5"]', 'Acheter 5 graines de carotte');
    await touch('[data-action="buy-item"][data-item="graine_carotte"][data-q="1"]', 'Acheter 1 graine de carotte');
  }
  await touch('#modal-root [data-action="close-modal"].btn', 'Fermer la fiche');
  await touch('#stage-window-close', 'Fermer le Marché (retour à la carte)');
  await page.waitForTimeout(600);
  await touch('.stage-chip:not(.hoe)', 'Puce « Labourer 6 tuiles » (houe en main)');
  await page.waitForTimeout(800);

  // Un glissement sur 6 cases vertes alignées (FLU-12)
  const line = await page.evaluate(() => {
    const s = FF.state;
    const tiles = new Set(FF.engine.hoeableTiles(s));
    const sc = FarmStage.scene();
    const cam = sc.cameras.main;
    const v = cam.worldView;
    const W = sc.grid.cols;
    const T = 16; // px de carte par tuile (js/farm-stage.js)
    const canvas = sc.game.canvas.getBoundingClientRect();
    const k = canvas.width / sc.scale.width; // px CSS par px de canevas
    const screen = (t) => ({
      x: canvas.left + ((t % W) * T + T / 2 - v.x) * cam.zoom * k,
      y: canvas.top + (Math.floor(t / W) * T + T / 2 - v.y) * cam.zoom * k,
    });
    const onScreen = (p) => p.x > canvas.left + 30 && p.x < canvas.right - 30 && p.y > canvas.top + 90 && p.y < canvas.bottom - 120;
    // une ligne, sinon une colonne, sinon un chemin (cases voisines) de 6 cases vertes à l'écran
    const ok = (t) => tiles.has(t) && onScreen(screen(t));
    for (const pas of [1, W]) {
      for (const t of [...tiles].sort((a, b) => a - b)) {
        const run = [0, 1, 2, 3, 4, 5].map((i) => t + i * pas);
        if (pas === 1 && Math.floor(run[5] / W) !== Math.floor(t / W)) continue;
        if (run.every(ok)) return run.map(screen);
      }
    }
    const voisins = (t) => [t + 1, t - 1, t + W, t - W].filter((x) => Math.abs((x % W) - (t % W)) <= 1 && ok(x));
    const chemin = (path) => {
      if (path.length === 6) return path;
      for (const x of voisins(path[path.length - 1])) {
        if (path.includes(x)) continue;
        const r = chemin([...path, x]);
        if (r) return r;
      }
      return null;
    };
    for (const t of [...tiles].filter(ok)) {
      const r = chemin([t]);
      if (r) return r.map(screen);
    }
    return null;
  });
  if (!line) throw new Error('Pas de chemin de 6 cases vertes à l\'écran.');
  await page.mouse.move(line[0].x, line[0].y);
  await page.mouse.down();
  for (const p of line) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
  log('Glisser la houe sur 6 cases vertes');
  await page.waitForTimeout(600);
  // Une case refusée en route (bordure impossible) : des touches de plus, case par case.
  for (let essai = 0; essai < 6; essai++) {
    const sols = await page.evaluate(() => FF.state.potager.parcelles.length);
    if (sols >= 6) break;
    const p = await page.evaluate(() => {
      const sc = FarmStage.scene(); const cam = sc.cameras.main; const v = cam.worldView; const W = sc.grid.cols;
      const canvas = sc.game.canvas.getBoundingClientRect(); const k = canvas.width / sc.scale.width;
      for (const t of FF.engine.hoeableTiles(FF.state)) {
        const x = canvas.left + ((t % W) * 16 + 8 - v.x) * cam.zoom * k, y = canvas.top + (Math.floor(t / W) * 16 + 8 - v.y) * cam.zoom * k;
        if (x > canvas.left + 30 && x < canvas.right - 30 && y > canvas.top + 90 && y < canvas.bottom - 120) return { x, y };
      }
      return null;
    });
    if (!p) break;
    await page.mouse.click(p.x, p.y);
    log('Labourer une case de plus');
    await page.waitForTimeout(400);
  }
  const sols = await page.evaluate(() => FF.state.potager.parcelles.length);
  if (sols < 6) throw new Error(`Labour : ${sols} tuiles seulement.`);

  await touch('.stage-chip.hoe', 'Ranger la houe');
  await touch('.stage-chip:not(.hoe)', 'Puce « Planter 6 parcelles »');
  await touch('[data-action="plant-all-open"]', 'Planter partout');
  await touch('#modal-root [data-action="plant-all"][data-crop="carotte"]', 'Carottes');

  // La pompe remplit le réservoir au soleil : on attend de quoi tout arroser.
  await until(() => {
    const b = document.querySelector('[data-action="water-all"]');
    return b && !b.disabled && b.checkVisibility();
  }, null, 'le réservoir se remplit');
  await touch('[data-action="water-all"]', 'Arroser tout');

  const fin = await page.evaluate(() => FF.state.potager.parcelles.filter((p) => p.culture === 'carotte' && p.arrose).length);
  console.log(`\nParcelles de carottes plantées et arrosées : ${fin} / 6`);
  console.log(`Touches : ${touches} (référence v1.14 : 52 · cible : 30)`);
  if (fin < 6) code = 1;
} catch (e) {
  console.error(`\nArrêt après ${touches} touches : ${e.message}`);
  code = 1;
}
if (errors.length) {
  console.error('Erreurs de la page :', errors);
  code = 1;
}
await browser.close();
server.close();
process.exit(code);
