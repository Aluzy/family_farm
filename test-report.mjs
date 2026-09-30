#!/usr/bin/env node
// Tests du rapport quotidien (worker/src/report.mjs et worker/src/index.js).
// Aucun accès réseau : le bucket R2 et l'API GitHub sont simulés.
//
// Usage : node test-report.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildReport, chapterSegments, renderMarkdown, reportSubject, fmtDuration, parisHour,
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

/* ---------- rendu Markdown ---------- */

test('Markdown : chiffres clés présents, tableaux, titre', () => {
  const s = session({
    counters: { clicks: { water: 3 } },
    events: [night(60000, 1)],
    feedback: [{ t: 1000, text: 'Le chapitre 1 est trop long' }],
  });
  const r = buildReport([s, session()], NOW);
  const md = renderMarkdown(r);
  assert(md.startsWith('# '), 'titre de niveau 1');
  assert(md.includes('**Sessions ouvertes** : 2'));
  assert(md.includes('| 1 | Arroser | 3 |'));
  assert(md.includes('| Chapitre | Sessions | Total | Moyenne par session |'));
  assert(md.includes('Le chapitre 1 est trop long'));
  assert(md.endsWith('\n') && !/\n{3,}/.test(md), 'pas de lignes vides en excès');
  assert(reportSubject(r).includes('30/09/2026') && reportSubject(r).includes('2 sessions'));
});

test('Markdown : les commentaires ne peuvent ni mentionner quelqu\'un, ni lier, ni sortir de leur bloc', () => {
  const hostile = '@octocat merci ! Voir #123 et [clic](https://exemple.org) ![img](https://x/y.png) <script>alert(1)</script>\n```\n# faux titre\n````';
  const r = buildReport([session({ feedback: [{ t: 1000, text: hostile }] })], NOW);
  const md = renderMarkdown(r);
  const start = md.indexOf('## Commentaires');
  const section = md.slice(start);
  // Le texte hostile est enfermé dans un bloc de code dont la clôture est plus longue que ses ` .
  const fence = section.match(/^(`{3,})text$/m);
  assert(fence && fence[1].length >= 5, 'clôture allongée : ' + (fence && fence[1]));
  const inside = section.slice(section.indexOf(fence[0]) + fence[0].length, section.lastIndexOf(fence[1]));
  assert(inside.includes('@octocat') && inside.includes('# faux titre'), 'le texte est bien dans le bloc');
  // Le titre « # faux titre » ne doit exister nulle part hors du bloc.
  const outside = md.replace(inside, '');
  assert(!/^# faux titre/m.test(outside), 'aucun titre injecté');
});

test('Markdown : version du jeu, appareil et actions inconnues (venus du navigateur) sont neutralisés', () => {
  const s = session({
    game: '@octocat`x`', device: { cls: '[lien](https://x.org)' },
    counters: { clicks: { '@octocat': 5, '<img src=x>': 4, 'a|b': 3 } },
    feedback: [{ t: 1000, text: 'ok' }],
  });
  const md = renderMarkdown(buildReport([s], NOW));
  assert(!md.includes('@octocat'), 'mention neutralisée par un caractère invisible');
  assert(md.includes('@\u200boctocat'), 'le texte reste lisible');
  assert(!/(^|[^\\])<img/.test(md), 'balise HTML échappée (\\<)');
  assert(!md.includes('[lien](https'), 'lien échappé');
  const rows = md.split('\n').filter((l) => l.startsWith('| ') && /non répertorié/.test(l));
  assert(rows.length === 3, 'trois lignes de tableau, aucune colonne créée par le « | » : ' + rows.length);
  for (const row of rows) eq(row.split(/(?<!\\)\|/).length, 5, 'colonnes du tableau : ' + row);
});

test('rapport vide : lisible, sans erreur', () => {
  const md = renderMarkdown(buildReport([], NOW));
  assert(md.includes('**Sessions ouvertes** : 0'));
  assert(md.includes('Aucun commentaire'));
  assert(md.includes('Aucune action enregistrée'));
  assert(md.includes('Aucune donnée'));
});

test('rapport : signale les fichiers illisibles et la lecture partielle', () => {
  const md = renderMarkdown(buildReport([session()], NOW, { unreadable: 2, truncated: 5 }));
  assert(/2 fichier\(s\) de session illisible/.test(md));
  assert(/5 fichier\(s\) de session non lus/.test(md));
});

test('durées : format lisible', () => {
  eq(fmtDuration(45000), '45 s');
  eq(fmtDuration(8 * MIN + 12000), '8 min 12 s');
  eq(fmtDuration(80 * MIN), '1 h 20 min');
  eq(fmtDuration(NaN), '0 s');
});

/* ---------- Worker (R2 simulé) ---------- */

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

const baseEnv = (files) => ({ SESSIONS: fakeBucket(files) });

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

test('13 h à Paris : heure d\'été (11 h UTC) et heure d\'hiver (12 h UTC)', () => {
  eq(parisHour(new Date('2026-07-01T11:00:00Z')), 13);
  eq(parisHour(new Date('2026-07-01T12:00:00Z')), 14);
  eq(parisHour(new Date('2026-12-01T12:00:00Z')), 13);
  eq(parisHour(new Date('2026-12-01T11:00:00Z')), 12);
  // Jours de changement d'heure 2026 : 29 mars (été) et 25 octobre (hiver).
  eq(parisHour(new Date('2026-03-29T11:00:00Z')), 13);
  eq(parisHour(new Date('2026-10-25T12:00:00Z')), 13);
});

/* ---------- Worker : publication GitHub simulée ---------- */

const TOKEN = 'github_pat_SECRET_123';
const ghEnv = (files = {}, over = {}) => ({ SESSIONS: fakeBucket(files), REPORT_GITHUB_TOKEN: TOKEN, REPORT_GITHUB_REPO: 'Aluzy/rapports', ...over });
const oneSession = () => ({
  'sessions/a.json': { uploaded: uploadedNow, data: session({ counters: { clicks: { water: 4 } }, feedback: [{ t: 1000, text: 'Bravo' }] }) },
});
const uploadedNow = new Date(NOW.getTime() - 5 * MIN);

// Remplace fetch et console pour la durée d'un test ; rend les appels GitHub et les journaux.
function withGithub(opts, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  return async () => {
    const realFetch = globalThis.fetch; const realErr = console.error; const realLog = console.log;
    const calls = []; const errors = []; const logs = [];
    globalThis.fetch = async (url, o = {}) => {
      calls.push({ url: String(url), method: o.method, headers: o.headers || {}, body: o.body ? JSON.parse(o.body) : null });
      if (o.method === 'GET') return new Response(JSON.stringify({ private: opts.isPrivate !== false }), { status: 200 });
      if (opts.failPost) return new Response('Resource not accessible by personal access token', { status: 403 });
      return new Response(JSON.stringify({ html_url: 'https://github.com/Aluzy/rapports/issues/7' }), { status: 201 });
    };
    console.error = (m) => errors.push(String(m)); console.log = (m) => logs.push(String(m));
    try { await fn({ calls, errors, logs }); } finally { globalThis.fetch = realFetch; console.error = realErr; console.log = realLog; }
  };
}

async function runScheduled(worker, env, when) {
  const waits = [];
  await worker.scheduled({ scheduledTime: when.getTime() }, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
}

test('Worker : à 13 h Paris, l\'issue est créée dans le dépôt privé avec le bon contenu', withGithub(async ({ calls, errors, logs }) => {
  const worker = await loadWorker();
  await runScheduled(worker, ghEnv(oneSession()), NOW);
  eq(errors, []);
  eq(calls.map((c) => `${c.method} ${c.url}`), ['GET https://api.github.com/repos/Aluzy/rapports', 'POST https://api.github.com/repos/Aluzy/rapports/issues']);
  eq(calls[1].headers.Authorization, `Bearer ${TOKEN}`);
  eq(calls[1].headers['X-GitHub-Api-Version'], '2022-11-28');
  assert(calls[1].headers['User-Agent'], 'GitHub exige un User-Agent');
  assert(calls[1].body.title.includes('Rapport du 30/09/2026') && calls[1].body.title.includes('1 session'));
  assert(calls[1].body.body.includes('| 1 | Arroser | 4 |') && calls[1].body.body.includes('Bravo'));
  assert(!JSON.stringify(calls[1].body).includes(TOKEN), 'le jeton ne figure pas dans l\'issue');
  assert(logs.some((l) => l.includes('rapport publié') && l.includes('/issues/7')));
}));

test('Worker : hors 13 h Paris (le second déclencheur UTC), rien n\'est publié', withGithub(async ({ calls }) => {
  const worker = await loadWorker();
  await runScheduled(worker, ghEnv(oneSession()), new Date(NOW.getTime() + 3600 * 1000));
  eq(calls.length, 0);
}));

test('Worker : dépôt public → publication refusée, aucune issue créée', withGithub({ isPrivate: false }, async ({ calls, errors }) => {
  const worker = await loadWorker();
  await runScheduled(worker, ghEnv(oneSession()), NOW);
  eq(calls.map((c) => c.method), ['GET'], 'seule la vérification a lieu');
  assert(errors.some((e) => /n'est pas privé : publication refusée/.test(e)));
}));

test('Worker : configuration absente ou invalide → aucun appel réseau, échec journalisé', withGithub(async ({ calls, errors }) => {
  const worker = await loadWorker();
  await runScheduled(worker, ghEnv(oneSession(), { REPORT_GITHUB_TOKEN: undefined }), NOW);
  await runScheduled(worker, ghEnv(oneSession(), { REPORT_GITHUB_REPO: '../../etc/passwd' }), NOW);
  await runScheduled(worker, ghEnv(oneSession(), { REPORT_GITHUB_REPO: 'Aluzy/rapports/../autre' }), NOW);
  eq(calls.length, 0);
  eq(errors.length, 3);
}));

test('Worker : une erreur de l\'API GitHub est journalisée sans faire planter le déclencheur ni fuiter le jeton', withGithub({ failPost: true }, async ({ errors }) => {
  const worker = await loadWorker();
  await runScheduled(worker, ghEnv(oneSession()), NOW);
  assert(errors.some((e) => /rapport en échec.*403/.test(e)));
  assert(!errors.join('\n').includes(TOKEN), 'le jeton n\'est pas journalisé');
}));

test('Worker : un rapport démesuré est tronqué pour rester sous la limite d\'une issue', withGithub(async ({ calls }) => {
  const worker = await loadWorker();
  // Session fabriquée à la main (le navigateur n'est pas une source fiable) avec un nom d'action gigantesque.
  const files = { 'sessions/x.json': { uploaded: uploadedNow, data: session({ counters: { clicks: { ['a'.repeat(70000)]: 5 } } }) } };
  await runScheduled(worker, ghEnv(files), NOW);
  const body = calls.find((c) => c.method === 'POST').body.body;
  assert(body.length <= 60000 + 200, `taille ${body.length}`);
  assert(body.includes('rapport tronqué'));
}));

const getReport = (qs, headers = {}) => new Request(`https://family-farm.example/report${qs}`, { headers });

test('Worker : GET /report n\'existe pas sans jeton configuré, refuse un mauvais jeton, sert le rapport au bon', async () => {
  const worker = await loadWorker();
  const recent = new Date(Date.now() - 60000);
  const files = {
    'sessions/a.json': { uploaded: new Date(), data: session({ startedAt: recent.toISOString(), counters: { clicks: { water: 2 } } }) },
    'sessions/b.json': { uploaded: new Date(), broken: true },
    'sessions/vieux.json': { uploaded: new Date(Date.now() - 40 * 3600 * 1000), data: session({ startedAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString() }) },
  };
  eq((await worker.fetch(getReport('?token=x'), baseEnv(files))).status, 404, 'route absente sans REPORT_TOKEN');
  const env = { ...baseEnv(files), REPORT_TOKEN: 'jeton-long-et-secret' };
  eq((await worker.fetch(getReport(''), env)).status, 403);
  eq((await worker.fetch(getReport('?token=faux'), env)).status, 403);
  eq((await worker.fetch(getReport('', { Authorization: 'Bearer faux' }), env)).status, 403);
  const ok = await worker.fetch(getReport('', { Authorization: 'Bearer jeton-long-et-secret' }), env);
  eq(ok.status, 200);
  assert(/^text\/markdown/.test(ok.headers.get('Content-Type')));
  eq(ok.headers.get('Cache-Control'), 'no-store');
  const md = await ok.text();
  assert(md.includes('**Sessions ouvertes** : 1'), 'seule la session récente est comptée');
  assert(md.includes('| 1 | Arroser | 2 |'));
  assert(/1 fichier\(s\) de session illisible/.test(md));
  eq((await worker.fetch(getReport('?token=jeton-long-et-secret'), env)).status, 200, 'jeton dans l\'adresse : pratique pour un essai dans un navigateur');
});

test('Worker : /report sans publish ne publie rien ; avec publish=1 crée l\'issue ou explique l\'échec', withGithub(async ({ calls }) => {
  const worker = await loadWorker();
  const files = { 'sessions/a.json': { uploaded: new Date(), data: session({ startedAt: new Date(Date.now() - 60000).toISOString() }) } };
  const env = ghEnv(files, { REPORT_TOKEN: 'jeton' });
  await worker.fetch(getReport('?token=jeton'), env);
  eq(calls.length, 0, 'un simple aperçu ne publie rien');
  const ok = await worker.fetch(getReport('?token=jeton&publish=1'), env);
  eq(ok.status, 200);
  const text = await ok.text();
  assert(text.startsWith('Issue créée : https://github.com/Aluzy/rapports/issues/7'));
  assert(!text.includes(TOKEN));
  eq(calls.map((c) => c.method), ['GET', 'POST']);
  const bad = await worker.fetch(getReport('?token=jeton&publish=1'), ghEnv(files, { REPORT_TOKEN: 'jeton', REPORT_GITHUB_TOKEN: undefined }));
  eq(bad.status, 502);
  const t = await bad.text();
  assert(t.includes('REPORT_GITHUB_TOKEN') && t.includes('Sessions ouvertes'), 'le rapport reste affiché');
}));

test('Worker : aucune trace de Resend ni de service d\'e-mail tiers', () => {
  const src = readFileSync(join(here, 'worker/src/index.js'), 'utf8');
  assert(!/resend/i.test(src));
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
