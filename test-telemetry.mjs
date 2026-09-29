#!/usr/bin/env node
// Tests du suivi de session (bloc <script id="telemetry"> de jeu.html).
// Exécute le bloc dans un contexte Node avec un navigateur simulé (stockage,
// sendBeacon, événements) et vérifie surtout les règles de confidentialité :
// rien n'est stocké ni envoyé sans consentement, rien après un retrait.
//
// Usage : node test-telemetry.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'jeu.html'), 'utf8');
const m = html.match(/<script[^>]*\bid=["']telemetry["'][^>]*>([\s\S]*?)<\/script>/i);
if (!m) { console.error('Bloc <script id="telemetry"> introuvable dans jeu.html'); process.exit(1); }
const source = m[1];

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failures.push(`${name} : ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'différent'} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }

function makeStore(seed) {
  const map = new Map(Object.entries(seed || {}));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

// Navigateur simulé. `env` permet de fixer hostname, signaux de vie privée, stockages.
function makeBrowser(env = {}) {
  const local = env.local || makeStore();
  const session = env.session || makeStore();
  const beacons = [];
  const fetches = [];
  const handlers = { window: {}, document: {} };
  let uuid = 0;
  class FakeBlob { constructor(parts, opts) { this.text = parts.join(''); this.type = opts && opts.type; } }
  const ctx = {
    localStorage: local,
    sessionStorage: session,
    location: { hostname: env.hostname === undefined ? 'aluzy.github.io' : env.hostname },
    navigator: {
      globalPrivacyControl: env.gpc,
      doNotTrack: env.dnt,
      sendBeacon: (url, blob) => { beacons.push({ url, body: JSON.parse(blob.text), type: blob.type }); return true; },
    },
    document: {
      hidden: false,
      scrollingElement: { scrollHeight: 4000, clientHeight: 1000, scrollTop: 0 },
      addEventListener: (t, f) => { handlers.document[t] = f; },
      removeEventListener: (t) => { delete handlers.document[t]; },
    },
    window: {
      innerWidth: env.width || 390,
      addEventListener: (t, f) => { handlers.window[t] = f; },
      removeEventListener: (t) => { delete handlers.window[t]; },
    },
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
    Blob: FakeBlob,
    fetch: (url, opts) => { fetches.push({ url, opts }); return Promise.resolve(); },
    setInterval: () => 1,
    clearInterval: () => {},
    console,
  };
  vm.createContext(ctx);
  const T = vm.runInContext(`${source}\n;Telemetry`, ctx);
  return { T, ctx, local, session, beacons, fetches, handlers };
}

const consent = (choice, over = {}) => JSON.stringify({ choice, at: new Date().toISOString(), policy: '1.0', ...over });

test('sans choix : statut « unknown », aucun stockage, aucun envoi', () => {
  const b = makeBrowser();
  eq(b.T.init({ version: '9.9.9' }), 'unknown');
  b.T.click('sleep', '');
  b.T.tab('ferme', null);
  b.T.night({ day: 2 });
  b.handlers.window.pagehide && b.handlers.window.pagehide();
  eq(b.beacons.length, 0, 'aucun envoi');
  eq(b.fetches.length, 0, 'aucune requête');
  eq(b.session.map.size, 0, 'sessionStorage vide');
  eq(b.local.map.size, 0, 'localStorage vide');
  assert(!b.T.isActive() && b.T.sessionId() === null);
});

test('refus : statut « denied », rien n\'est créé ni envoyé', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  eq(b.T.setConsent('denied'), 'denied');
  b.T.click('water', 'p1');
  eq(b.beacons.length, 0);
  eq(b.session.map.size, 0);
  eq(JSON.parse(b.local.getItem('ferme-consent')).choice, 'denied');
});

test('signal GPC ou DNT : aucun suivi, même avec un « granted » enregistré', () => {
  for (const env of [{ gpc: true }, { dnt: '1' }]) {
    const b = makeBrowser({ ...env, local: makeStore({ 'ferme-consent': consent('granted') }) });
    eq(b.T.init({ version: '1' }), 'optout');
    eq(b.T.setConsent('granted'), 'optout');
    b.T.click('sleep', '');
    eq(b.beacons.length, 0);
    eq(b.session.map.size, 0);
  }
});

test('acceptation : session créée, premier envoi, format et destination', () => {
  const b = makeBrowser();
  b.T.init({ version: '0.14.0' });
  eq(b.T.setConsent('granted'), 'granted');
  assert(b.T.isActive());
  const sid = b.session.getItem('ff_sid');
  assert(/^[A-Za-z0-9-]{8,64}$/.test(sid), 'sid valide pour le serveur');
  eq(b.T.sessionId(), sid);
  eq(b.beacons.length, 1);
  const { url, body, type } = b.beacons[0];
  eq(url, 'https://family-farm.contact-voidr.workers.dev/session');
  assert(/^text\/plain/.test(type), 'text/plain : pas de requête préliminaire CORS');
  eq(body.sid, sid);
  eq(body.game, '0.14.0');
  eq(body.v, 1);
  eq(body.ended, false);
  eq(body.events[0].type, 'session_start');
  eq(body.device.cls, 'mobile');
  eq(body.device.width, 400);
});

test('compteurs de clics, onglets, modales, nuit et chapitre', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  b.T.tab('ferme', null);
  b.T.click('water', 'p1');
  b.T.click('water', 'p2');
  b.T.click('plant', 'carotte/p1');
  b.T.deadClick({ tagName: 'DIV', className: 'panel x' });
  b.T.modal('options');
  b.T.night({ day: 3, chapter: 1, autonomy: 42.456, pieces: 120, health: 88, awake: 31 });
  b.T.chapter(2, 3);
  b.T.alert('panne');
  b.T._flush(false);
  const p = b.beacons.at(-1).body;
  eq(p.counters.clicks, { water: 2, plant: 1 });
  eq(p.counters.deadClicks, 1);
  eq(p.counters.modals, { options: 1 });
  eq(p.counters.tabs.ferme.views, 1);
  const night = p.events.find((e) => e.type === 'night');
  eq([night.day, night.chapter, night.autonomy, night.pieces, night.health, night.awake], [3, 1, 42.46, 120, 88, 31]);
  assert(p.events.some((e) => e.type === 'chapter' && e.chapter === 2));
  assert(p.events.some((e) => e.type === 'alert' && e.kind === 'panne'));
  assert(p.events.some((e) => e.type === 'click' && e.action === 'plant' && e.detail === 'carotte/p1'));
});

test('défilement : profondeur par paliers de 25 %, seulement en augmentant', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  b.T.tab('ferme', null);
  const el = b.ctx.document.scrollingElement; // max = 3000
  // L'horloge du contexte simulé avance de 1,5 s à chaque lecture (limite : une mesure par seconde).
  let t = Date.now();
  b.ctx.Date = class extends Date { static now() { return (t += 1500); } };
  for (const top of [800, 1600, 700, 3000]) { el.scrollTop = top; b.handlers.window.scroll(); }
  b.T._flush(false);
  const p = b.beacons.at(-1).body;
  eq(p.counters.scrollDepth.ferme, 100);
  eq(p.events.filter((e) => e.type === 'scroll_depth').map((e) => e.pct), [25, 50, 100]);
  assert(p.counters.scrolls >= 4);
});

test('fermeture de page : envoi final, puis reprise avec le même identifiant après rechargement', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  b.T.click('sleep', '');
  b.handlers.window.pagehide();
  const last = b.beacons.at(-1).body;
  eq(last.ended, true);
  // Rechargement de l'onglet : mêmes stockages, nouveau module.
  const b2 = makeBrowser({ local: b.local, session: b.session });
  eq(b2.T.init({ version: '1' }), 'granted');
  eq(b2.T.sessionId(), last.sid, 'même session');
  const first = b2.beacons.at(-1).body;
  eq(first.counters.clicks, { sleep: 1 }, 'compteurs conservés');
  assert(first.events.some((e) => e.type === 'session_resume'));
  eq(first.startedAt, last.startedAt);
});

test('fermeture : l\'envoi « terminé » n\'est pas écrasé par le visibilitychange qui suit, sauf retour sur la page', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  b.handlers.window.pagehide();
  b.ctx.document.hidden = true;
  b.handlers.document.visibilitychange();
  eq(b.beacons.at(-1).body.ended, true, 'pagehide puis visibilitychange');
  b.ctx.document.hidden = false;
  b.handlers.document.visibilitychange(); // retour depuis le cache de navigation
  b.T._flush(false);
  eq(b.beacons.at(-1).body.ended, false, 'la session reprend');
});

test('retrait du consentement : stockage effacé, plus aucun envoi', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  const sent = b.beacons.length;
  eq(b.T.setConsent('denied'), 'denied');
  eq([...b.session.map.keys()], [], 'sessionStorage vidé');
  assert(!b.T.isActive() && b.T.sessionId() === null);
  b.T.click('sleep', '');
  b.T.night({ day: 9 });
  b.T._flush(true);
  eq(b.handlers.window.pagehide, undefined, 'écouteurs retirés');
  eq(b.beacons.length, sent, 'aucun nouvel envoi');
});

test('consentement expiré (> 6 mois) ou politique modifiée : on redemande', () => {
  const old = new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString();
  for (const stored of [consent('granted', { at: old }), consent('granted', { policy: '0.9' }), 'pas du json', consent('peut-etre')]) {
    const b = makeBrowser({ local: makeStore({ 'ferme-consent': stored }) });
    eq(b.T.init({ version: '1' }), 'unknown');
    eq(b.beacons.length, 0);
  }
});

test('destination : local en essai, rien sur un autre domaine', () => {
  for (const [hostname, expected] of [['localhost', 'http://127.0.0.1:8787/session'], ['', 'http://127.0.0.1:8787/session'], ['exemple.org', null]]) {
    const b = makeBrowser({ hostname });
    b.T.init({ version: '1' });
    b.T.setConsent('granted');
    b.T._flush(false);
    if (expected) eq(b.beacons[0].url, expected, hostname);
    else { eq(b.beacons.length, 0, 'aucun envoi'); eq(b.fetches.length, 0); }
  }
});

test('charge utile bornée : au plus 60 Ko même après des milliers de clics', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  for (let i = 0; i < 5000; i++) b.T.click('action' + (i % 300), 'detail-assez-long-' + i);
  b.T.night({ day: 1 });
  b.T._flush(true);
  const raw = JSON.stringify(b.beacons.at(-1).body);
  assert(raw.length <= 60 * 1024, `taille ${raw.length}`);
  assert(b.beacons.at(-1).body.events.length <= 400);
  assert(b.beacons.at(-1).body.events.some((e) => e.type === 'night'), 'les repères de progression sont conservés');
  assert(Object.keys(b.beacons.at(-1).body.counters.clicks).length <= 200, 'clés de compteurs bornées');
});

test('erreurs : limitées à 10, message tronqué, aucune pile', () => {
  const b = makeBrowser();
  b.T.init({ version: '1' });
  b.T.setConsent('granted');
  for (let i = 0; i < 25; i++) b.handlers.window.error({ message: 'x'.repeat(500), filename: 'https://aluzy.github.io/family_farm/jeu.html?v=1', lineno: 12, colno: 3 });
  b.T._flush(false);
  const errs = b.beacons.at(-1).body.events.filter((e) => e.type === 'error');
  eq(errs.length, 10);
  eq(errs[0].message.length, 160);
  eq(errs[0].file, 'jeu.html');
});

console.log('Ferme Familiale — tests du suivi de session');
console.log('-------------------------------------------\n');
if (failures.length) {
  for (const f of failures) console.log('ÉCHEC  ' + f);
  console.log(`\n${passed} passé(s), ${failures.length} échec(s).`);
  process.exit(1);
}
console.log(`${passed}/${passed} test(s) passé(s), 0 échec(s).`);
