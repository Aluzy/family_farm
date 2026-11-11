// Essai de bout en bout des gemmes, dans un vrai navigateur : le vrai Worker (worker/src/index.js) et son Durable
// Object Comptes (node:sqlite), une fausse API de Stripe (rien ne part sur Internet).
//   1. connecté, la carte du joueur montre 💎 0 ; la fenêtre des gemmes s'ouvre, avec le bandeau du mode test ;
//   2. un pack : la question réservée aux adultes et la case de livraison immédiate sont exigées ; puis le jeu
//      part vers la page de paiement (simulée) ;
//   3. Stripe prévient le Worker (une notification signée, comme la vraie) : 550 gemmes ; le retour
//      (jeu.html#boutique=ok) relit le solde ;
//   4. un rosier rouge (25 💎) : débité, livré dans l'inventaire de la partie, confirmé au serveur ; il se pose
//      sur la face d'un mur côté jardin et se voit sur la carte.
// Lancer : node tests/gemmes-navigateur.mjs (Playwright et Chromium requis ; sinon, l'essai est sauté).
// Captures : GEMMES_CAPTURES=<dossier> node tests/gemmes-navigateur.mjs

import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { testFarmMap, testFermeConstruite } from '../js/engine/index.js';
import { garden, reglagesDuJeu } from './engine/aide.mjs';
import W from '../worker/src/index.js';
import { Comptes } from '../worker/src/comptes.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURES = process.env.GEMMES_CAPTURES || '';
const saute = (r) => { console.log(`Essai des gemmes sauté : ${r}`); process.exit(0); };
const require = createRequire(import.meta.url);
let playwright = null;
for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { playwright = require(require.resolve(nom)); break; } catch { /* suivant */ } }
if (!playwright) saute('Playwright introuvable.');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const serveur = createServer((req, res) => {
  let f = normalize(join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== RACINE && !f.startsWith(RACINE + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;

// le Worker et les comptes ; la fausse API de Stripe (le fetch global du Durable Object)
const SECRET = 'whsec_essai';
const db = new DatabaseSync(':memory:');
const sql = { exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
const env = { STRIPE_SECRET_KEY: 'sk_test_essai', STRIPE_WEBHOOK_SECRET: SECRET, JEU_URL: `${BASE}/jeu.html` };
const comptes = new Comptes({ storage: { sql } }, env);
env.COMPTES = { idFromName: (n) => n, get: () => ({ fetch: (r) => comptes.fetch(r) }) };
const sessionsStripe = [];
const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) === 'https://api.stripe.com/v1/checkout/sessions') {
    const c = new URLSearchParams(init.body);
    const id = `cs_test_essai${sessionsStripe.length}abcdefgh`;
    sessionsStripe.push({ id, compte: c.get('client_reference_id'), montant: Number(c.get('line_items[0][price_data][unit_amount]')), succes: c.get('success_url') });
    return new Response(JSON.stringify({ id, url: `https://checkout.stripe.com/c/pay/${id}` }), { status: 200 });
  }
  return vraiFetch(url, init);
};
const lien = await comptes.registre.demanderLien('essai@exemple.fr');
const { session, compte } = await comptes.registre.connecter(lien.jeton);

const s0 = garden(); reglagesDuJeu(); testFarmMap(s0, '42'); testFermeConstruite(s0);
const SAUVEGARDE = JSON.stringify({ v: s0.version, t: Date.now(), s: s0 });

let navigateur;
try { navigateur = await playwright.chromium.launch(); } catch (e) { serveur.close(); saute(`Chromium ne démarre pas (${String(e.message).split('\n')[0]}).`); }
const echecs = [], erreurs = [];
const verifie = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) echecs.push(msg); };
const ctx = await navigateur.newContext({ viewport: { width: 900, height: 700 } });
await ctx.addInitScript(([v, c]) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('ferme-save', v); localStorage.setItem('ferme-compte', JSON.stringify(c)); sessionStorage.setItem('x', 1); } sessionStorage.setItem('ferme-titre-vu', '1'); localStorage.setItem('ferme-consent', 'refuse'); }, [SAUVEGARDE, { session, email: 'essai@exemple.fr' }]);
await ctx.route('http://127.0.0.1:8787/**', async (route) => {
  const rq = route.request();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Prenom', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const r = await W.fetch(new Request(rq.url(), { method: rq.method(), headers: { ...rq.headers(), origin: 'https://aluzy.github.io' }, body: rq.postData() || undefined }), env);
  return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: await r.text() });
});
// la page de paiement de Stripe : simulée (elle ne fait que se montrer)
await ctx.route('https://checkout.stripe.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Stripe (simulé)</h1>' }));
const page = await ctx.newPage();
page.on('pageerror', (e) => erreurs.push(e.message));
const capture = async (nom) => { if (CAPTURES) await page.screenshot({ path: join(CAPTURES, nom) }); };
const attendre = (f, a) => page.waitForFunction(f, a, { timeout: 20000 });

try {
  await page.goto(`${BASE}/jeu.html`);
  await attendre(() => document.querySelector('.player-gemmes-n') && document.querySelector('.player-gemmes-n').textContent === '0');
  verifie(true, '1. connecté : la carte du joueur montre 💎 0');
  await page.click('.player-gemmes');
  await attendre(() => document.querySelector('.gemmes-test'));
  verifie(true, '1. la fenêtre des gemmes s\'ouvre, avec le bandeau du mode test');
  await capture('gemmes_1_fenetre.png');
  await page.click('[data-action="gemmes-pack"][data-pack="moyen"]');
  await page.click('[data-action="gemmes-payer"]');
  await attendre(() => /demande à un adulte/.test((document.querySelector('.gemmes-erreur') || {}).textContent || ''));
  verifie(sessionsStripe.length === 0, '2. une mauvaise réponse à la question des adultes : aucun paiement ouvert');
  const q = await page.evaluate(() => (document.querySelector('.gemmes-adulte') || {}).textContent.match(/(\d+) × (\d+)/).slice(1).map(Number));
  await page.fill('#gemmes-reponse', String(q[0] * q[1]));
  await page.click('[data-action="gemmes-payer"]');
  await attendre(() => /Coche la case/.test((document.querySelector('.gemmes-erreur') || {}).textContent || ''));
  verifie(sessionsStripe.length === 0, '2. sans la case de livraison immédiate : aucun paiement ouvert');
  await page.check('#gemmes-renonce');
  await capture('gemmes_2_paiement.png');
  await Promise.all([page.waitForURL(/checkout\.stripe\.com/), page.click('[data-action="gemmes-payer"]')]);
  verifie(sessionsStripe.length === 1 && sessionsStripe[0].montant === 499 && sessionsStripe[0].compte === compte.id, '2. le jeu part vers la page de paiement de Stripe (4,99 €, ce compte)');
  // Stripe prévient le Worker (signé), puis renvoie le joueur au jeu
  const s = sessionsStripe[0];
  const corps = JSON.stringify({ id: 'evt_essai', type: 'checkout.session.completed', livemode: false, data: { object: { id: s.id, payment_status: 'paid', client_reference_id: s.compte, amount_total: 499, currency: 'eur' } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.${corps}`).digest('hex')}`;
  const n = await W.fetch(new Request('https://w/stripe/webhook', { method: 'POST', body: corps, headers: { 'Stripe-Signature': sig } }), env);
  verifie(n.status === 200 && comptes.registre.boutique.solde(compte.id) === 550, '3. la notification signée de Stripe crédite 550 gemmes');
  await page.goto(s.succes);
  await attendre(() => document.querySelector('.player-gemmes-n') && document.querySelector('.player-gemmes-n').textContent === '550');
  verifie(!/boutique=/.test(page.url()), '3. le retour relit le solde (💎 550) et efface l\'adresse de retour');
  // un rosier rouge
  await page.click('.player-gemmes');
  await attendre(() => document.querySelector('[data-action="gemmes-onglet"][data-ecran="rosiers"]'));
  await page.click('[data-action="gemmes-onglet"][data-ecran="rosiers"]');
  await capture('gemmes_3_rosiers.png');
  await page.click('[data-action="gemmes-acheter"][data-article="rosier_rouge"]');
  await attendre(() => (document.querySelector('.gemmes-solde') || {}).textContent.includes('525'));
  await new Promise((ok) => setTimeout(ok, 500));
  const etat = comptes.registre.boutique.etat(compte.id);
  verifie(etat.solde === 525 && etat.aLivrer.length === 0, '4. le rosier : 25 gemmes débitées, livraison confirmée au serveur');
  const nb = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ferme-save')); const s = p.s || p; return ((s.inventaire || {}).rosier_rouge || []).reduce((t, l) => t + (l.qty || 0), 0); });
  verifie(nb === 1, `4. le rosier rouge est dans l'inventaire de la partie (${nb})`);
  // une seconde lecture ne le livre pas deux fois
  await page.reload();
  await attendre(() => document.querySelector('.player-gemmes-n') && document.querySelector('.player-gemmes-n').textContent === '525');
  const nb2 = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ferme-save')); const s = p.s || p; return ((s.inventaire || {}).rosier_rouge || []).reduce((t, l) => t + (l.qty || 0), 0); });
  verifie(nb2 === 1, `4. rechargé : pas livré deux fois (${nb2})`);
} catch (e) {
  echecs.push(e.message.split('\n')[0]);
  console.log('✗', e.message.split('\n')[0]);
  await capture('gemmes_echec.png');
}
verifie(!erreurs.length, `aucune erreur dans la page${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
await navigateur.close();
serveur.close();
globalThis.fetch = vraiFetch;
if (echecs.length) { console.log(`\n${echecs.length} échec(s).`); process.exit(1); }
console.log('\nL\'essai des gemmes est réussi.');
