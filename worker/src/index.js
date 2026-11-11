// Point de collecte Moon Bloom Village (Cloudflare Worker + R2).
// - POST /session : reçoit le JSON d'une session (depuis le jeu) et l'écrit dans
//   le bucket R2 sous la clé sessions/<sid>.json. Un envoi ultérieur de la même
//   session remplace le fichier (dernière version = la plus complète). Une session
//   de la version 2 porte un numéro de joueur : sa fiche players/<id>.json (sa
//   progression d'une visite à l'autre) est mise à jour (mergePlayer).
// - Tous les jours à 13 h (heure de Paris) : calcule le rapport des dernières 24 h
//   et le publie comme issue d'un dépôt GitHub PRIVÉ (l'e-mail vient des notifications
//   GitHub). Le Worker refuse de publier si ce dépôt n'est pas privé : le rapport
//   contient les commentaires des joueurs.
// - /compte/… (E-0) : les comptes du jeu en ligne (comptes.mjs) : POST /compte/lien (un lien de
//   connexion par e-mail), POST /compte/connexion, GET /compte/moi, POST /compte/deconnexion, POST
//   /compte/supprimer. Le Durable Object Comptes (une instance, sa base SQLite) les sert.
// - /mondes… (E-1) : le jeu en ligne (monde.mjs) : POST /mondes (mettre sa ferme en ligne : la copie de
//   sa partie), GET /mondes (ses mondes), GET /mondes/<id>/fiche, GET /mondes/<id>/ws (la connexion
//   d'un joueur, une WebSocket ; la session dans ?session=, une WebSocket ne portant pas d'en-tête).
//   E-3 : POST /mondes/<id>/invitations (un lien d'invitation, le propriétaire), POST /rejoindre { code }
//   (le lien suivi : le rôle de l'invitation), POST /mondes/<id>/retirer { compte } (le propriétaire).
//   E-11 : POST /mondes/<id>/invitations { role }, POST /mondes/<id>/role { compte, role } et
//   GET /mondes/<id>/journal?avant= (le propriétaire). E-12 : GET et POST /mondes/<id>/sauvegardes, POST
//   /mondes/<id>/restaurer { cle } (le propriétaire ; les sauvegardes dans R2, sous mondes/).
//   Le Worker vérifie la session auprès des comptes, puis passe au Durable Object Monde du monde.
// - /compte/boutique… et POST /stripe/webhook : la boutique (boutique.mjs) : les gemmes, achetées par Stripe
//   Checkout (secrets STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET), et les rosiers grimpants.
// - GET /report (facultatif) : aperçu du rapport en Markdown, ou publication de test
//   avec &publish=1. Protégé par REPORT_TOKEN : sans ce secret, la route n'existe pas.

import { buildReport, mergePlayer, playerMeta, renderMarkdown, reportSubject, parisHour } from './report.mjs';

// Les comptes des joueurs (E-0) : le Durable Object Comptes (comptes.mjs), routes /compte/….
import { routeAdmin } from './admin.mjs';
import { boutiqueOuverte, modeStripe } from './boutique.mjs';
export { Comptes } from './comptes.mjs';
// Le monde partagé (E-1) : un Durable Object Monde par monde (monde.mjs), routes /mondes….
export { Monde } from './monde.mjs';

// Les adresses du jeu publié : son domaine (moonbloom-village.com, avec ou sans www) et l'ancienne
// adresse GitHub Pages (qui renvoie vers le domaine, gardée le temps que tout le monde suive).
const ORIGINES = new Set(['https://moonbloom-village.com', 'https://www.moonbloom-village.com', 'https://aluzy.github.io']);
const JEU_URL = 'https://moonbloom-village.com/jeu.html';
const MAX_BYTES = 64 * 1024;
const SID_RE = /^[A-Za-z0-9-]{8,64}$/;
const PID_RE = SID_RE;
const MAX_FEEDBACK = 3;
const MAX_FEEDBACK_CHARS = 1000;

// Fichiers lus au maximum par rapport (limite de sous-requêtes de Cloudflare) : les
// sessions, puis les fiches des joueurs.
const MAX_READ = 700;
const MAX_PLAYERS_READ = 200;
const READ_BATCH = 25;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ORIGINES.has(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Prenom',
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

// Liste les fichiers `prefix` mis à jour depuis `since`, puis lit les `max` plus récents.
async function loadFiles(bucket, prefix, since, max) {
  const found = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) if (o.uploaded >= since) found.push(o);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  found.sort((a, b) => b.uploaded - a.uploaded);
  const toRead = found.slice(0, max);
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

// Les résumés de toutes les fiches (métadonnées R2, playerMeta) : la rétention et les
// abandons, sans relire les fiches (une sous-requête par page de 1 000).
async function loadAnnuaire(bucket) {
  const out = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: 'players/', cursor, limit: 1000, include: ['customMetadata'] });
    for (const o of page.objects) if (o.customMetadata) out.push(o.customMetadata);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

// La console d'administration (admin.mjs) : ce qu'elle lit, par ici.
function outilsAdmin(env) {
  return {
    page: async () => (await import('./admin.html')).default,
    rapport: async (fenetreMs) => {
      const now = new Date(), since = new Date(now.getTime() - fenetreMs);
      const { sessions, unreadable, truncated } = await loadFiles(env.SESSIONS, 'sessions/', since, MAX_READ);
      const fiches = await loadFiles(env.SESSIONS, 'players/', since, MAX_PLAYERS_READ);
      const annuaire = await loadAnnuaire(env.SESSIONS);
      return buildReport(sessions, now, { fenetreMs, unreadable: unreadable + fiches.unreadable, truncated: truncated + fiches.truncated }, fiches.sessions, annuaire);
    },
    listeSessions: async (fenetreMs) => {
      const since = new Date(Date.now() - fenetreMs), out = [];
      let cursor;
      do {
        const page = await env.SESSIONS.list({ prefix: 'sessions/', cursor, limit: 1000 });
        for (const o of page.objects) if (o.uploaded >= since) out.push({ sid: o.key.slice(9, -5), date: o.uploaded, taille: o.size });
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return out.sort((a, b) => b.date - a.date).slice(0, 300);
    },
    lire: async (cle) => { const o = await env.SESSIONS.get(cle); return o ? o.json() : null; },
    enLigne: async () => (env.COMPTES ? interne(env, '/interne/admin') : { ok: false, erreur: 'Le jeu en ligne n\'est pas ouvert.' }),
    // (les ventes de gemmes : boutique.mjs ; le mode de la clé de Stripe, jamais la clé)
    ventes: async () => (env.COMPTES ? { ...(await interne(env, '/interne/ventes')), mode: modeStripe(env), ouverte: boutiqueOuverte(env) } : { ok: false, erreur: 'Le jeu en ligne n\'est pas ouvert.' }),
  };
}

async function makeReport(env, now) {
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const { sessions, unreadable, truncated } = await loadFiles(env.SESSIONS, 'sessions/', since, MAX_READ);
  const fiches = await loadFiles(env.SESSIONS, 'players/', since, MAX_PLAYERS_READ);
  const annuaire = await loadAnnuaire(env.SESSIONS);
  return buildReport(sessions, now, { unreadable: unreadable + fiches.unreadable, truncated: truncated + fiches.truncated }, fiches.sessions, annuaire);
}

// La fiche du joueur de la session `data` (version 2) : relue, complétée, réécrite. Un échec
// ne fait pas perdre la session, déjà enregistrée.
async function updatePlayer(bucket, data) {
  const id = String((data.player && data.player.id) || '');
  if (!PID_RE.test(id)) return;
  const key = `players/${id}.json`;
  let prev = null;
  try { const obj = await bucket.get(key); prev = obj ? await obj.json() : null; } catch { prev = null; }
  const fiche = mergePlayer(prev, data, data.receivedAt);
  if (fiche) await bucket.put(key, JSON.stringify(fiche), { httpMetadata: { contentType: 'application/json' }, customMetadata: playerMeta(fiche) });
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

// Les routes /compte/… : depuis le jeu seulement, servies par le Durable Object Comptes.
async function routeComptes(request, env, origin) {
  if (!ORIGINES.has(origin)) return json({ ok: false, erreur: 'origine refusée' }, 403, origin);
  if (!env.COMPTES) return json({ ok: false, erreur: 'Le jeu en ligne n\'est pas encore ouvert.' }, 503, origin);
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > 4096) return json({ ok: false, erreur: 'trop volumineux' }, 413, origin);
  const stub = env.COMPTES.get(env.COMPTES.idFromName('comptes'));
  const r = await stub.fetch(request);
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
}

// Une notification de Stripe : son corps brut et sa signature passés au Durable Object Comptes (qui a le
// secret, la vérifie et crédite les gemmes). 64 Ko au plus.
async function stripeWebhook(request, env) {
  if (!env.COMPTES) return new Response('{"ok":false}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  if (Number(request.headers.get('Content-Length') || 0) > 64 * 1024) return new Response('{"ok":false}', { status: 413, headers: { 'Content-Type': 'application/json' } });
  const corps = await request.text();
  const r = await env.COMPTES.get(env.COMPTES.idFromName('comptes')).fetch(new Request('https://interne/stripe/webhook', {
    method: 'POST', body: corps, headers: { 'Stripe-Signature': request.headers.get('Stripe-Signature') || '', 'Content-Type': 'application/json' },
  }));
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}

/* ---------- E-1 : les mondes en ligne ---------- */

const MONDE_ID_RE = /^m-[A-Za-z0-9_-]{16,40}$/;
const MAX_PARTIE = 2 * 1024 * 1024;   // une partie mise en ligne : 2 Mo au plus (une grosse partie : ≈ 210 Ko)
const comptesStub = (env) => env.COMPTES.get(env.COMPTES.idFromName('comptes'));
async function interne(env, chemin, init = {}) {
  const r = await comptesStub(env).fetch(new Request('https://interne' + chemin, init));
  return r.json();
}
function idAuHasard() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return 'm-' + btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Le prénom qu'envoie le jeu (encodé pour l'en-tête) : sans caractère de contrôle ni balise, 20 caractères
// au plus ; sans prénom, « Voisin ».
export function nomAffiche(brut) {
  let t = '';
  try { t = decodeURIComponent(String(brut || '')); } catch (e) { t = ''; }
  t = t.replace(/[\u0000-\u001f\u007f<>]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = Array.from(t).slice(0, 20).join('').trim();
  return t || 'Voisin';
}

async function routeMondes(request, env, origin, url) {
  if (!ORIGINES.has(origin)) return json({ ok: false, erreur: 'origine refusée' }, 403, origin);
  if (!env.COMPTES || !env.MONDES) return json({ ok: false, erreur: 'Le jeu en ligne n\'est pas encore ouvert.' }, 503, origin);
  const auth = request.headers.get('Authorization') || '';
  const session = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (url.searchParams.get('session') || '');
  const s = await interne(env, '/interne/session', { headers: { Authorization: `Bearer ${session}` } });
  if (!s.ok) return json({ ok: false, erreur: s.erreur }, 401, origin);
  // (le nom montré aux autres : le prénom du personnage que le jeu envoie, nettoyé ; jamais tiré de l'e-mail)
  const compte = s.compte.id, nom = nomAffiche(request.headers.get('X-Prenom') || url.searchParams.get('prenom'));
  // (vers le Durable Object du monde : l'identité vérifiée ici, jamais celle qu'envoie le jeu)
  const vers = (id, chemin, init = {}) => {
    const h = new Headers(init.headers || {});
    h.delete('Authorization');
    h.set('X-Compte', compte);
    h.set('X-Nom', nom);
    return env.MONDES.get(env.MONDES.idFromName(id)).fetch(new Request('https://monde/monde/' + chemin, { ...init, headers: h }));
  };
  const corpsJson = async () => { try { return await request.json(); } catch (e) { return {}; } };
  const relais = async (r) => new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  // E-3 : suivre un lien d'invitation (son code : « <monde>.<secret> ») : bâtisseur du monde
  if (url.pathname === '/rejoindre' && request.method === 'POST') {
    const b = await corpsJson();
    const [id, secret] = String(b.code || '').split('.');
    if (!MONDE_ID_RE.test(id || '') || !secret) return json({ ok: false, erreur: 'Ce lien d\'invitation n\'est pas valide.' }, 400, origin);
    const r = await (await vers(id, 'rejoindre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) })).json();
    if (!r.ok) return json({ ok: false, erreur: r.erreur }, 410, origin);
    await interne(env, '/interne/monde', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte, monde: id, titre: r.titre, role: r.role }) });
    return json({ ok: true, monde: id, titre: r.titre }, 200, origin);
  }
  const parties = url.pathname.split('/').filter(Boolean);   // ['mondes', id?, action?]
  if (parties.length === 1 && request.method === 'GET') {
    const r = await interne(env, '/interne/mondes?compte=' + encodeURIComponent(compte));
    return json({ ok: true, mondes: r.mondes || [] }, 200, origin);
  }
  if (parties.length === 1 && request.method === 'POST') {
    if (Number(request.headers.get('Content-Length') || 0) > MAX_PARTIE) return json({ ok: false, erreur: 'Cette partie est trop grosse pour être mise en ligne.' }, 413, origin);
    const texte = await request.text();
    if (texte.length > MAX_PARTIE) return json({ ok: false, erreur: 'Cette partie est trop grosse pour être mise en ligne.' }, 413, origin);
    let b;
    try { b = JSON.parse(texte); } catch (e) { return json({ ok: false, erreur: 'JSON invalide' }, 400, origin); }
    const id = idAuHasard();
    const titre = String((b && b.titre) || 'Ma ferme').slice(0, 40);
    const r = await (await vers(id, 'creer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partie: b && b.partie, titre }) })).json();
    if (!r.ok) return json({ ok: false, erreur: r.erreur }, 400, origin);
    await interne(env, '/interne/monde', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte, monde: id, titre, role: 'proprietaire' }) });
    return json({ ok: true, monde: id, rev: r.rev }, 200, origin);
  }
  const id = parties[1];
  if (!MONDE_ID_RE.test(id || '')) return json({ ok: false, erreur: 'Monde inconnu.' }, 404, origin);
  if (parties[2] === 'fiche' && request.method === 'GET') {
    const r = await vers(id, 'fiche');
    return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  }
  // E-3 : un lien d'invitation (le propriétaire) ; retirer un membre (le propriétaire)
  if (parties[2] === 'invitations' && request.method === 'POST') {
    const b = await corpsJson();
    const r = await (await vers(id, 'inviter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: b.role }) })).json();
    if (!r.ok) return json(r, 403, origin);
    const code = `${id}.${r.secret}`;
    return json({ ok: true, code, lien: `${env.JEU_URL || JEU_URL}#invitation=${code}`, expire: r.expire }, 200, origin);
  }
  // Les amis : inviter un ami dans ce monde (le propriétaire) : un lien d'invitation, déposé dans sa boîte
  if (parties[2] === 'inviter-ami' && request.method === 'POST') {
    const b = await corpsJson();
    const ami = String(b.compte || '');
    const ok = await interne(env, '/interne/amis-ok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de: compte, pour: ami }) });
    if (!ok.ok) return json({ ok: false, erreur: 'Vous n\'êtes pas (ou plus) amis.' }, 403, origin);
    const r = await (await vers(id, 'inviter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'batisseur' }) })).json();
    if (!r.ok) return json(r, 403, origin);
    const m = ((await interne(env, '/interne/mondes?compte=' + encodeURIComponent(compte))).mondes || []).find((x) => x.monde === id);
    const d = await interne(env, '/interne/amis-deposer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de: compte, pour: ami, type: 'invitation', monde: id, code: `${id}.${r.secret}`, titre: m ? m.titre : 'Ma ferme' }) });
    return json(d.ok ? { ok: true } : { ok: false, erreur: d.erreur }, d.ok ? 200 : 403, origin);
  }
  if (parties[2] === 'retirer' && request.method === 'POST') {
    const b = await corpsJson();
    const r = await vers(id, 'retirer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte: b.compte }) });
    if (r.ok) await interne(env, '/interne/monde-retirer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte: String(b.compte || ''), monde: id }) });
    return relais(r);
  }
  // E-11 : le propriétaire change le rôle d'un membre ; il lit le journal du monde
  if (parties[2] === 'role' && request.method === 'POST') {
    const b = await corpsJson();
    const r = await (await vers(id, 'role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte: b.compte, role: b.role }) })).json();
    if (r.ok) await interne(env, '/interne/monde', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compte: String(b.compte || ''), monde: id, titre: r.titre, role: r.role }) });
    return json(r, r.ok ? 200 : 403, origin);
  }
  if (parties[2] === 'journal' && request.method === 'GET') {
    const avant = url.searchParams.get('avant');
    return relais(await vers(id, 'journal' + (avant ? `?avant=${encodeURIComponent(avant)}` : '')));
  }
  // E-12 : les sauvegardes du monde (le propriétaire) : GET (la liste), POST (en faire une) ; restaurer
  if (parties[2] === 'sauvegardes' && (request.method === 'GET' || request.method === 'POST')) {
    return relais(await vers(id, 'sauvegardes', { method: request.method }));
  }
  if (parties[2] === 'restaurer' && request.method === 'POST') {
    const b = await corpsJson();
    return relais(await vers(id, 'restaurer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cle: b.cle }) }));
  }
  if (parties[2] === 'ws' && request.method === 'GET') {
    // (la demande d'ouverture de la WebSocket, ses en-têtes compris ; la réponse 101 et sa WebSocket
    // passent telles quelles)
    return vers(id, 'ws', { headers: request.headers });
  }
  return json({ ok: false, erreur: 'not found' }, 404, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/report') return handleReport(request, env, url);
    // la console d'administration : derrière Cloudflare Access, vérifiée ici (admin.mjs)
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return routeAdmin(request, env, url, outilsAdmin(env));
    if (url.hostname.startsWith('admin.') && url.pathname === '/') return Response.redirect(`${url.origin}/admin`, 302);

    // les notifications de Stripe (boutique.mjs) : pas depuis le jeu ; leur signature est vérifiée par les comptes
    if (url.pathname === '/stripe/webhook' && request.method === 'POST') return stripeWebhook(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (url.pathname.startsWith('/compte/')) return routeComptes(request, env, origin);
    if (url.pathname === '/mondes' || url.pathname.startsWith('/mondes/') || url.pathname === '/rejoindre') return routeMondes(request, env, origin, url);
    if (request.method !== 'POST' || url.pathname !== '/session') return json({ error: 'not found' }, 404, origin);
    if (!ORIGINES.has(origin)) return json({ error: 'origine refusée' }, 403, origin);

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
    // (la fiche : seulement quand le jeu la demande, au premier envoi, toutes les 10 minutes et à la fin ; un
    // ancien jeu, sans `fiche`, la demande à chaque envoi)
    if (data.fiche !== false) try { await updatePlayer(env.SESSIONS, data); } catch (e) { console.error(`fiche joueur en échec : ${e.message}`); }
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
