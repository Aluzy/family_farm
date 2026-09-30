// Point de collecte Ferme Familiale (Cloudflare Worker + R2).
// - POST /session : reçoit le JSON d'une session (depuis le jeu) et l'écrit dans
//   le bucket R2 sous la clé sessions/<sid>.json. Un envoi ultérieur de la même
//   session remplace le fichier (dernière version = la plus complète).
// - Tous les jours à 13 h (heure de Paris) : calcule le rapport des dernières 24 h
//   et le publie comme issue d'un dépôt GitHub PRIVÉ (l'e-mail vient des notifications
//   GitHub). Le Worker refuse de publier si ce dépôt n'est pas privé : le rapport
//   contient les commentaires des joueurs.
// - GET /report (facultatif) : aperçu du rapport en Markdown, ou publication de test
//   avec &publish=1. Protégé par REPORT_TOKEN : sans ce secret, la route n'existe pas.

import { buildReport, renderMarkdown, reportSubject, parisHour } from './report.mjs';

const ALLOWED_ORIGIN = 'https://aluzy.github.io';
const MAX_BYTES = 64 * 1024;
const SID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_FEEDBACK = 3;
const MAX_FEEDBACK_CHARS = 1000;

// Fichiers de session lus au maximum par rapport (limite de sous-requêtes de Cloudflare).
const MAX_READ = 800;
const READ_BATCH = 25;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Commentaires : au plus 3, 1 000 signes chacun, jamais autre chose que du texte.
function cleanFeedback(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_FEEDBACK)
    .map((f) => ({
      t: f && Number.isFinite(f.t) && f.t >= 0 ? f.t : 0,
      text: String((f && f.text) || '').slice(0, MAX_FEEDBACK_CHARS).trim(),
    }))
    .filter((f) => f.text);
}

/* ---------- rapport quotidien ---------- */

// Liste les sessions mises à jour depuis `since`, puis lit les plus récentes.
async function loadSessions(bucket, since) {
  const found = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: 'sessions/', cursor, limit: 1000 });
    for (const o of page.objects) if (o.uploaded >= since) found.push(o);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  found.sort((a, b) => b.uploaded - a.uploaded);
  const toRead = found.slice(0, MAX_READ);
  const sessions = [];
  let unreadable = 0;
  for (let i = 0; i < toRead.length; i += READ_BATCH) {
    const batch = toRead.slice(i, i + READ_BATCH);
    const results = await Promise.allSettled(batch.map(async (o) => {
      const obj = await bucket.get(o.key);
      if (!obj) throw new Error('absent');
      return obj.json();
    }));
    for (const r of results) {
      if (r.status === 'fulfilled') sessions.push(r.value); else unreadable++;
    }
  }
  return { sessions, unreadable, truncated: found.length - toRead.length };
}

async function makeReport(env, now) {
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const { sessions, unreadable, truncated } = await loadSessions(env.SESSIONS, since);
  return buildReport(sessions, now, { unreadable, truncated });
}

// Une issue GitHub accepte 65 536 signes au plus.
const MAX_ISSUE_CHARS = 60000;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

async function github(env, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.REPORT_GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'family-farm-report',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} : ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Crée l'issue du rapport dans le dépôt privé REPORT_GITHUB_REPO (« compte/depot »).
// Retourne l'adresse de l'issue.
async function publishReport(env, report) {
  const repo = String(env.REPORT_GITHUB_REPO || '');
  if (!env.REPORT_GITHUB_TOKEN || !REPO_RE.test(repo)) {
    throw new Error('REPORT_GITHUB_TOKEN ou REPORT_GITHUB_REPO manquant ou invalide');
  }
  // Garde-fou : jamais de commentaires de joueurs dans un dépôt public.
  const info = await github(env, 'GET', `/repos/${repo}`);
  if (info.private !== true) throw new Error(`le dépôt ${repo} n'est pas privé : publication refusée`);

  let body = renderMarkdown(report);
  if (body.length > MAX_ISSUE_CHARS) body = `${body.slice(0, MAX_ISSUE_CHARS)}\n\n… rapport tronqué (trop long pour une issue GitHub).\n`;
  const issue = await github(env, 'POST', `/repos/${repo}/issues`, { title: reportSubject(report), body });
  return issue.html_url;
}

async function runDailyReport(env, now) {
  const report = await makeReport(env, now);
  const url = await publishReport(env, report);
  console.log(`rapport publié : ${report.sessions} session(s), ${report.comments.length} commentaire(s) — ${url}`);
}

// Comparaison sans fuite de temps sur le jeton d'accès à l'aperçu.
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const bx = new Uint8Array(x); const by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < bx.length; i++) diff |= bx[i] ^ by[i];
  return diff === 0;
}

// GET /report : rapport des dernières 24 h, en Markdown (&publish=1 : le publie aussi).
// Le jeton vient de l'en-tête « Authorization: Bearer … » (à préférer : il ne
// s'affiche pas dans les journaux) ou, pour un essai dans un navigateur, de ?token=…
// Sans REPORT_TOKEN configuré, cette route n'existe pas.
async function handleReport(request, env, url) {
  if (!env.REPORT_TOKEN) return new Response('not found', { status: 404 });
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const given = bearer || url.searchParams.get('token') || '';
  if (!given || !(await sameSecret(given, env.REPORT_TOKEN))) return new Response('accès refusé', { status: 403 });

  const report = await makeReport(env, new Date());
  const md = renderMarkdown(report);
  const headers = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' };
  if (url.searchParams.get('publish') === '1') {
    try {
      const issue = await publishReport(env, report);
      return new Response(`Issue créée : ${issue}\n\n${md}`, { headers });
    } catch (e) {
      return new Response(`Échec de la publication : ${e.message}\n\n${md}`, { status: 502, headers });
    }
  }
  return new Response(md, { headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/report') return handleReport(request, env, url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'POST' || url.pathname !== '/session') return json({ error: 'not found' }, 404, origin);
    if (origin !== ALLOWED_ORIGIN) return json({ error: 'origine refusée' }, 403, origin);

    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BYTES) return json({ error: 'trop volumineux' }, 413, origin);

    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: 'trop volumineux' }, 413, origin);

    let data;
    try { data = JSON.parse(text); } catch { return json({ error: 'JSON invalide' }, 400, origin); }
    if (!data || typeof data !== 'object' || !SID_RE.test(String(data.sid || ''))) {
      return json({ error: 'sid manquant ou invalide' }, 400, origin);
    }
    if (!Array.isArray(data.events)) return json({ error: 'events manquant' }, 400, origin);

    data.feedback = cleanFeedback(data.feedback);
    data.receivedAt = new Date().toISOString();
    await env.SESSIONS.put(`sessions/${data.sid}.json`, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });
    return json({ ok: true, events: data.events.length }, 200, origin);
  },

  // Deux déclencheurs UTC (11 h et 12 h) couvrent l'heure d'été et l'heure d'hiver :
  // seul celui qui tombe à 13 h à Paris publie un rapport.
  async scheduled(event, env, ctx) {
    const at = new Date(event.scheduledTime);
    if (parisHour(at) !== 13) return;
    ctx.waitUntil(runDailyReport(env, at).catch((e) => console.error(`rapport en échec : ${e.message}`)));
  },
};
