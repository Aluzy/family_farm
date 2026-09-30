#!/usr/bin/env node
// Tests du rapport quotidien (worker/src/report.mjs et worker/src/index.js).
// Aucun accès réseau : le bucket R2 et l'envoi d'e-mail sont simulés.
//
// Usage : node test-report.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildReport, chapterSegments, renderText, renderHtml, reportSubject, parisHour, fmtDuration,
} from './worker/src/report.mjs';

const here = dirname(fileURLToPath(import.meta.url));

let passed = 0;
const failures = [];
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'différent'} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }

const NOW = new Date('2026-09-30T11:00:00Z'); // 13 h à Paris (heure d'été)
const MIN = 60 * 1000;
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

function session(over = {}) {
  return {
    v: 1, sid: 'sid-' + Math.random().toString(16).slice(2, 12), game: '0.14.0',
    startedAt: ago(60 * MIN), durationMs: 10 * MIN, visibleMs: 10 * MIN,
    device: { cls: 'mobile', width: 400 },
    counters: { clicks: {} }, feedback: [], events: [], ...over,
  };
}
const night = (t, chapter, day = 2) => ({ t, type: 'night', chapter, day });

/* ---------- calcul ---------- */

test('sessions : seules celles démarrées dans les dernières 24 h sont comptées', () => {
  const r = buildReport([
    session(),
    session({ startedAt: ago(23 * 3600 * 1000) }),
    session({ startedAt: ago(25 * 3600 * 1000) }),      // trop ancienne
    session({ startedAt: new Date(NOW.getTime() + MIN).toISOString() }), // dans le futur
    session({ startedAt: 'pas une date' }),
    null,
  ], NOW);
  eq(r.sessions, 2);
});

test('temps moyen et médian par session (temps actif), sessions courtes', () => {
  const r = buildReport([
    session({ visibleMs: 10 * MIN }), session({ visibleMs: 20 * MIN }), session({ visibleMs: 10 * 1000 }),
  ], NOW);
  eq(Math.round(r.avgActiveMs), Math.round((10 * MIN + 20 * MIN + 10000) / 3));
  eq(r.medianActiveMs, 10 * MIN);
  eq(r.shortSessions, 1);
  eq(buildReport([], NOW).avgActiveMs, 0, 'aucune session : pas de division par zéro');
});

test('temps par chapitre : la tranche avant une nuit appartient au chapitre précédent', () => {
  const s = session({ durationMs: 600000, visibleMs: 600000, events: [night(120000, 1), night(300000, 1), night(420000, 2)] });
  const seg = chapterSegments(s);
  eq([...seg.entries()], [[1, 420000], [2, 180000]]);
});

test('temps par chapitre : ramené au temps visible (onglet masqué exclu)', () => {
  const s = session({ durationMs: 600000, visibleMs: 300000, events: [night(300000, 1), night(400000, 2)] });
  eq([...chapterSegments(s).entries()], [[1, 200000], [2, 100000]]);
});

test('temps par chapitre : une première nuit qui change de chapitre place le début au chapitre précédent', () => {
  const s = session({ durationMs: 200000, visibleMs: 200000, events: [night(60000, 2), { t: 60010, type: 'chapter', chapter: 2, day: 2 }] });
  eq([...chapterSegments(s).entries()], [[1, 60000], [2, 140000]]);
});

test('temps par chapitre : aucune nuit ou données absurdes → chapitre inconnu, jamais d\'exception', () => {
  eq(chapterSegments(session({ events: [] })), null);
  eq(chapterSegments(session({ durationMs: 0, events: [night(10, 1)] })), null);
  const weird = session({ events: [night(999999999, 3), night(-5, 1), { type: 'night' }, null].filter((x) => x !== null) });
  assert(chapterSegments(weird) instanceof Map || chapterSegments(weird) === null);
  const r = buildReport([session(), session({ events: [night(1000, 1)] })], NOW);
  eq(r.unknownChapter, 1);
  eq(r.chapters.length, 1);
  eq(r.chapters[0].chapter, 1);
  eq(r.chapters[0].sessions, 1);
});

test('rapport : total par chapitre sur plusieurs sessions', () => {
  const a = session({ durationMs: 600000, visibleMs: 600000, events: [night(300000, 1), night(400000, 2)] });
  const b = session({ durationMs: 200000, visibleMs: 200000, events: [night(100000, 1)] });
  const r = buildReport([a, b], NOW);
  eq(r.chapters.map((c) => [c.chapter, c.sessions, c.totalMs]), [[1, 2, 400000 + 200000], [2, 1, 200000]]);
  eq(r.chapters[0].avgMs, 300000);
});

test('top des actions : regroupement par libellé, interface exclue, action inconnue visible', () => {
  const r = buildReport([
    session({ counters: { clicks: { 'water': 10, 'water-all': 5, 'plant': 7, 'sleep': 4, 'switch-tab': 99, 'close-modal': 50, 'nouveaute-x': 3, 'tuto-skip': 2 } } }),
    session({ counters: { clicks: { 'water': 1, 'start-recipe': 6, 'sell-item': 6, 'sell-max': 40 } } }),
  ], NOW);
  eq(r.topActions[0], { label: 'Arroser', count: 16 });
  eq(r.topActions.slice(1, 4).map((a) => a.label), ['Planter', 'Cuisiner (préparer une recette)', 'Vendre']);
  assert(r.topActions.some((a) => a.label === 'nouveaute-x (non répertorié)' && a.count === 3));
  assert(!r.topActions.some((a) => /switch-tab|close-modal|sell-max|tuto/.test(a.label)), 'aucune action d\'interface');
  eq(r.interfaceClicks, 99 + 50 + 2 + 40);
  eq(r.signals, [{ label: 'Tutoriel ignoré', count: 2 }]);
});

test('top des actions : limité à 10, compteurs invalides ignorés', () => {
  const clicks = {};
  for (let i = 0; i < 25; i++) clicks['act' + i] = i + 1;
  clicks.water = 'beaucoup'; clicks.plant = -4; clicks.sleep = null;
  const r = buildReport([session({ counters: { clicks } })], NOW);
  eq(r.topActions.length, 10);
  eq(r.topActions[0].count, 25);
  assert(!r.topActions.some((a) => a.label === 'Arroser'));
});

test('commentaires : datés au moment de l\'écriture, hors période exclus, chapitre associé', () => {
  const s = session({
    startedAt: ago(30 * MIN), events: [night(5 * MIN, 1), night(12 * MIN, 2)],
    feedback: [{ t: 8 * MIN, text: 'Trop long' }, { t: 20 * MIN, text: '  Ajoutez des vaches  ' }, { t: 1, text: '   ' }],
  });
  const old = session({ startedAt: ago(30 * 3600 * 1000), feedback: [{ t: 60000, text: 'Ancien' }] });
  // Session commencée hier avant la période mais commentaire écrit pendant la période.
  const overnight = session({ startedAt: ago(24 * 3600 * 1000 + 10 * MIN), feedback: [{ t: 40 * MIN, text: 'Écrit ce matin' }] });
  const r = buildReport([s, old, overnight], NOW);
  eq(r.comments.map((c) => c.text), ['Écrit ce matin', 'Trop long', 'Ajoutez des vaches']);
  eq(r.comments.map((c) => c.chapter), [null, 1, 2]);
  eq(r.comments[1].device, 'mobile');
});

/* ---------- rendu ---------- */

test('texte et HTML : chiffres clés présents, HTML échappé', () => {
  const s = session({
    counters: { clicks: { water: 3 } },
    events: [night(60000, 1)],
    feedback: [{ t: 1000, text: '<script>alert("x")</script> & « merci »' }],
  });
  const r = buildReport([s, session()], NOW);
  const text = renderText(r);
  assert(text.includes('Sessions ouvertes : 2'));
  assert(text.includes('1. Arroser : 3'));
  assert(text.includes('Chapitre 1'));
  assert(text.includes('<script>'), 'le texte brut garde le commentaire tel quel');
  const html = renderHtml(r);
  assert(!html.includes('<script>'), 'aucune balise script dans l\'e-mail HTML');
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes('Sessions ouvertes'));
  assert(reportSubject(r).includes('30/09/2026') && reportSubject(r).includes('2 sessions'));
});

test('rapport vide : lisible, sans erreur', () => {
  const r = buildReport([], NOW);
  const text = renderText(r);
  assert(text.includes('Sessions ouvertes : 0'));
  assert(text.includes('Aucun commentaire'));
  assert(text.includes('Aucune action enregistrée'));
  assert(renderHtml(r).length > 100);
});

test('rapport : signale les fichiers illisibles et la lecture partielle', () => {
  const r = buildReport([session()], NOW, { unreadable: 2, truncated: 5 });
  const text = renderText(r);
  assert(/2 fichier\(s\) de session illisible/.test(text));
  assert(/5 fichier\(s\) de session non lus/.test(text));
});

test('durées : format lisible', () => {
  eq(fmtDuration(45000), '45 s');
  eq(fmtDuration(8 * MIN + 12000), '8 min 12 s');
  eq(fmtDuration(80 * MIN), '1 h 20 min');
  eq(fmtDuration(NaN), '0 s');
});

test('13 h à Paris : heure d\'été (11 h UTC) et heure d\'hiver (12 h UTC)', () => {
  eq(parisHour(new Date('2026-07-01T11:00:00Z')), 13);
  eq(parisHour(new Date('2026-07-01T12:00:00Z')), 14);
  eq(parisHour(new Date('2026-12-01T12:00:00Z')), 13);
  eq(parisHour(new Date('2026-12-01T11:00:00Z')), 12);
  // Jours de changement d'heure 2026 : 29 mars (été) et 25 octobre (hiver).
  eq(parisHour(new Date('2026-03-29T11:00:00Z')), 13);
  eq(parisHour(new Date('2026-10-25T12:00:00Z')), 13);
});

/* ---------- Worker (R2 et e-mail simulés) ---------- */

async function loadWorker() {
  const dir = mkdtempSync(join(tmpdir(), 'ff-worker-'));
  writeFileSync(join(dir, 'report.mjs'), readFileSync(join(here, 'worker/src/report.mjs')));
  writeFileSync(join(dir, 'index.mjs'), readFileSync(join(here, 'worker/src/index.js')));
  return (await import(pathToFileURL(join(dir, 'index.mjs')).href)).default;
}

function fakeBucket(files) {
  const puts = [];
  return {
    puts,
    async list({ prefix }) {
      const objects = Object.entries(files).filter(([k]) => k.startsWith(prefix)).map(([key, f]) => ({ key, uploaded: f.uploaded }));
      return { objects, truncated: false };
    },
    async get(key) {
      const f = files[key];
      if (!f) return null;
      return { json: async () => { if (f.broken) throw new SyntaxError('JSON invalide'); return f.data; } };
    },
    async put(key, body) { puts.push({ key, body: JSON.parse(body) }); },
  };
}

function withFetch(fn) {
  return async () => {
    const real = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return new Response('{"id":"abc"}', { status: 200 }); };
    try { await fn(calls); } finally { globalThis.fetch = real; }
  };
}

const uploadedNow = new Date(NOW.getTime() - 5 * MIN);
const baseEnv = (files) => ({ SESSIONS: fakeBucket(files), RESEND_API_KEY: 'cle-secrete', REPORT_TO: 'moi@example.org' });

test('Worker : à 13 h Paris, le rapport est envoyé avec les bonnes données', withFetch(async (calls) => {
  const worker = await loadWorker();
  const files = {
    'sessions/a.json': { uploaded: uploadedNow, data: session({ counters: { clicks: { water: 4 } }, feedback: [{ t: 1000, text: 'Bravo' }] }) },
    'sessions/b.json': { uploaded: uploadedNow, broken: true },
    'sessions/vieux.json': { uploaded: new Date(NOW.getTime() - 40 * 3600 * 1000), data: session({ startedAt: ago(40 * 3600 * 1000) }) },
  };
  const waits = [];
  await worker.scheduled({ scheduledTime: NOW.getTime() }, baseEnv(files), { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  eq(calls.length, 1);
  eq(calls[0].url, 'https://api.resend.com/emails');
  eq(calls[0].opts.headers.Authorization, 'Bearer cle-secrete');
  eq(calls[0].body.to, ['moi@example.org']);
  assert(calls[0].body.from.includes('onboarding@resend.dev'));
  assert(calls[0].body.text.includes('Sessions ouvertes : 1'));
  assert(calls[0].body.text.includes('Arroser : 4') && calls[0].body.text.includes('Bravo'));
  assert(/1 fichier\(s\) de session illisible/.test(calls[0].body.text));
  assert(calls[0].body.html.includes('<table'));
}));

test('Worker : hors 13 h Paris (le second déclencheur UTC), aucun envoi', withFetch(async (calls) => {
  const worker = await loadWorker();
  const waits = [];
  await worker.scheduled({ scheduledTime: NOW.getTime() + 3600 * 1000 }, baseEnv({}), { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  eq(calls.length, 0);
}));

test('Worker : un envoi qui échoue ne fait pas planter le déclencheur', withFetch(async () => {
  const worker = await loadWorker();
  globalThis.fetch = async () => new Response('erreur', { status: 500 });
  const waits = [];
  const errors = [];
  const realError = console.error;
  console.error = (m) => errors.push(m);
  try {
    await worker.scheduled({ scheduledTime: NOW.getTime() }, baseEnv({}), { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  } finally { console.error = realError; }
  assert(errors.some((e) => /rapport en échec.*500/.test(e)), 'l\'échec est journalisé');
}));

function post(body, origin = 'https://aluzy.github.io') {
  return new Request('https://family-farm.example/session', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
}

test('Worker : les commentaires reçus sont nettoyés (3 max, 1000 signes, texte seulement)', async () => {
  const worker = await loadWorker();
  const env = baseEnv({});
  const res = await worker.fetch(post({
    sid: 'abcdefgh-1234', events: [],
    feedback: [{ t: 5, text: 'x'.repeat(5000) }, { t: 'oups', text: 'deux' }, { text: '   ' }, { t: 9, text: { a: 1 } }, { t: 1, text: 'quatre' }, { t: 2, text: 'cinq' }],
  }), env);
  eq(res.status, 200);
  const saved = env.SESSIONS.puts[0];
  eq(saved.key, 'sessions/abcdefgh-1234.json');
  eq(saved.body.feedback.length, 2, 'les 3 premiers, dont un vide retiré');
  eq(saved.body.feedback[0].text.length, 1000);
  eq(saved.body.feedback[1], { t: 0, text: 'deux' });
  const noFeedback = baseEnv({});
  await worker.fetch(post({ sid: 'abcdefgh-5678', events: [] }), noFeedback);
  eq(noFeedback.SESSIONS.puts[0].body.feedback, [], 'anciennes versions du jeu : liste vide');
});

test('Worker : la collecte garde ses protections (origine, sid, événements)', async () => {
  const worker = await loadWorker();
  const env = baseEnv({});
  eq((await worker.fetch(post({ sid: 'abcdefgh-1', events: [] }, 'https://autre.site'), env)).status, 403);
  eq((await worker.fetch(post({ sid: 'court', events: [] }), env)).status, 400);
  eq((await worker.fetch(post({ sid: 'abcdefgh-1' }), env)).status, 400);
  eq(env.SESSIONS.puts.length, 0);
});

test('Worker : GET /report n\'existe pas sans jeton configuré, refuse un mauvais jeton, sert le rapport au bon', withFetch(async (calls) => {
  const worker = await loadWorker();
  const files = { 'sessions/a.json': { uploaded: new Date(), data: session({ startedAt: new Date(Date.now() - 60000).toISOString() }) } };
  const get = (qs, headers = {}) => new Request(`https://family-farm.example/report${qs}`, { headers });
  eq((await worker.fetch(get('?token=x'), baseEnv(files))).status, 404, 'route absente sans REPORT_TOKEN');
  const env = { ...baseEnv(files), REPORT_TOKEN: 'jeton-long-et-secret' };
  eq((await worker.fetch(get(''), env)).status, 403);
  eq((await worker.fetch(get('?token=faux'), env)).status, 403);
  const ok = await worker.fetch(get('?token=jeton-long-et-secret'), env);
  eq(ok.status, 200);
  assert((await ok.text()).includes('Sessions ouvertes : 1'));
  eq(calls.length, 0, 'un simple aperçu n\'envoie rien');
  const viaHeader = await worker.fetch(get('', { Authorization: 'Bearer jeton-long-et-secret' }), env);
  eq(viaHeader.status, 200);
  const sent = await worker.fetch(get('?token=jeton-long-et-secret&send=1'), env);
  eq(sent.status, 200);
  assert((await sent.text()).startsWith('E-mail envoyé.'));
  eq(calls.length, 1);
}));

test('Worker : sans clé Resend, le test d\'envoi échoue proprement et affiche quand même le rapport', async () => {
  const worker = await loadWorker();
  const env = { SESSIONS: fakeBucket({}), REPORT_TOKEN: 'jeton' };
  const res = await worker.fetch(new Request('https://family-farm.example/report?token=jeton&send=1'), env);
  eq(res.status, 502);
  const t = await res.text();
  assert(t.includes('RESEND_API_KEY') && t.includes('Sessions ouvertes'));
});

/* ---------- exécution ---------- */

for (const { name, fn } of queue) {
  try { await fn(); passed++; } catch (e) { failures.push(`${name} : ${e.message}`); }
}

console.log('Ferme Familiale — tests du rapport quotidien');
console.log('--------------------------------------------\n');
if (failures.length) {
  for (const f of failures) console.log('ÉCHEC  ' + f);
  console.log(`\n${passed} passé(s), ${failures.length} échec(s).`);
  process.exit(1);
}
console.log(`${passed}/${passed} test(s) passé(s), 0 échec(s).`);
