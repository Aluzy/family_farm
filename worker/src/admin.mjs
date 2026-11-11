// La console d'administration (Console Moon Bloom) : une page et ses routes /admin/api/…, servies par ce Worker,
// pour toi seul.
//
// L'accès : la console est derrière Cloudflare Access (Zero Trust, gratuit), qui demande ton adresse e-mail et
// t'envoie un code. Access ajoute à chaque requête un jeton signé (en-tête Cf-Access-Jwt-Assertion) : le Worker
// le vérifie lui-même (signature RS256 avec les clés publiques de ton équipe Access, audience, expiration) et
// n'ouvre la console qu'aux adresses de ADMIN_EMAILS. Sans réglage (ACCESS_EQUIPE, ACCESS_AUD, ADMIN_EMAILS),
// la console reste fermée : rien n'est jamais ouvert par défaut.
//
// Les écrans et leurs routes :
//   - Coûts : GET /admin/api/couts : la consommation du mois chez Cloudflare (l'API GraphQL d'analytique,
//     avec un jeton en lecture seule : CF_API_TOKEN, CF_ACCOUNT_ID) ; la page en tire la facture estimée.
//   - Joueurs : GET /admin/api/joueurs?jours=1|7|30 : les calculs du rapport quotidien (report.mjs) sur la période.
//   - Sessions et retours : GET /admin/api/sessions?jours=… (la liste), /admin/api/session?sid=… (une session),
//     /admin/api/joueur?id=… (une fiche), /admin/api/retours?jours=… (commentaires et erreurs).
//   - En ligne : GET /admin/api/enligne : comptes, mondes, amis, joueurs en ligne (le Durable Object des comptes).
//   - Ventes : GET /admin/api/ventes : les gemmes vendues (par mode : test ou réel), les packs, les articles
//     achetés (boutique.mjs) ; jamais de compte.
// Rien ici n'écrit : la console lit.

const SID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/* ---------- l'accès (Cloudflare Access) ---------- */

const b64url = (s) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const texte = (u8) => new TextDecoder().decode(u8);

let clesCache = null;   // { equipe, t, cles: Map(kid → CryptoKey) }
async function clesAccess(equipe, chercher, maintenant) {
  if (clesCache && clesCache.equipe === equipe && maintenant - clesCache.t < 3600 * 1000) return clesCache.cles;
  const r = await chercher(`https://${equipe}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('clés Access introuvables');
  const j = await r.json();
  const cles = new Map();
  for (const k of j.keys || []) {
    if (k.kty !== 'RSA' || !k.kid) continue;
    cles.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  clesCache = { equipe, t: maintenant, cles };
  return cles;
}
export function oublierClesAccess() { clesCache = null; }

// Le jeton d'Access de la requête, vérifié : { ok, email } ou { ok: false, statut, erreur }.
// `o.chercher` (fetch) et `o.maintenant` (ms) : les tests les remplacent.
export async function accesAdmin(request, env, o = {}) {
  const chercher = o.chercher || fetch, maintenant = o.maintenant || Date.now();
  const equipe = String(env.ACCESS_EQUIPE || '').trim(), aud = String(env.ACCESS_AUD || '').trim();
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (!/^[a-z0-9-]{1,63}$/.test(equipe) || !aud || !admins.length) return { ok: false, statut: 503, erreur: 'La console n\'est pas encore configurée (voir worker/README.md, « La console d\'administration »).' };
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || '';
  const parts = jwt.split('.');
  if (parts.length !== 3) return { ok: false, statut: 403, erreur: 'Accès réservé : passe par Cloudflare Access.' };
  try {
    const entete = JSON.parse(texte(b64url(parts[0]))), corps = JSON.parse(texte(b64url(parts[1])));
    if (entete.alg !== 'RS256') throw new Error('algorithme');
    const cle = (await clesAccess(equipe, chercher, maintenant)).get(entete.kid);
    if (!cle) throw new Error('clé inconnue');
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cle, b64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) throw new Error('signature');
    const auds = Array.isArray(corps.aud) ? corps.aud : [corps.aud];
    if (!auds.includes(aud)) throw new Error('audience');
    if (corps.iss && corps.iss !== `https://${equipe}.cloudflareaccess.com`) throw new Error('émetteur');
    if (!(Number(corps.exp) * 1000 > maintenant)) throw new Error('expiré');
    const email = String(corps.email || '').toLowerCase();
    if (!admins.includes(email)) return { ok: false, statut: 403, erreur: 'Cette adresse n\'est pas administratrice de la console.' };
    return { ok: true, email };
  } catch (e) {
    return { ok: false, statut: 403, erreur: `Accès refusé (${e.message}).` };
  }
}

/* ---------- les coûts : l'API GraphQL d'analytique de Cloudflare ---------- */

// Chaque mesure, sa requête à elle : une mesure que l'API refuse (un champ renommé) n'empêche pas les autres.
// `ens` : le jeu de données ; `champ` : la valeur lue (sum.x, max.x) ; `date` : le filtre par jour (date_geq)
// ou par instant (datetime_geq) ; `parType` : la somme par actionType (R2).
export const MESURES = {
  workerRequetes: { ens: 'workersInvocationsAdaptive', champ: 'sum { requests }', lire: (r) => r.sum.requests, date: false },
  workerErreurs: { ens: 'workersInvocationsAdaptive', champ: 'sum { errors }', lire: (r) => r.sum.errors, date: false },
  workerCpuUs: { ens: 'workersInvocationsAdaptive', champ: 'sum { cpuTimeUs }', lire: (r) => r.sum.cpuTimeUs, date: false },
  doRequetes: { ens: 'durableObjectsInvocationsAdaptiveGroups', champ: 'sum { requests }', lire: (r) => r.sum.requests, date: true },
  doMessagesWs: { ens: 'durableObjectsPeriodicGroups', champ: 'sum { inboundWebsocketMsgCount }', lire: (r) => r.sum.inboundWebsocketMsgCount, date: true },
  doActifUs: { ens: 'durableObjectsPeriodicGroups', champ: 'sum { activeTime }', lire: (r) => r.sum.activeTime, date: true },
  doLignesLues: { ens: 'durableObjectsPeriodicGroups', champ: 'sum { rowsRead }', lire: (r) => r.sum.rowsRead, date: true },
  doLignesEcrites: { ens: 'durableObjectsPeriodicGroups', champ: 'sum { rowsWritten }', lire: (r) => r.sum.rowsWritten, date: true },
  doStockage: { ens: 'durableObjectsStorageGroups', champ: 'max { storedBytes }', lire: (r) => r.max.storedBytes, date: true, max: true },
  r2Operations: { ens: 'r2OperationsAdaptiveGroups', champ: 'sum { requests } dimensions { actionType }', date: false, parType: true },
  r2Stockage: { ens: 'r2StorageAdaptiveGroups', champ: 'max { payloadSize metadataSize }', lire: (r) => r.max.payloadSize + r.max.metadataSize, date: false, max: true },
};
// Les opérations R2 et leur classe (les tarifs de R2) ; les autres (DeleteObject…) sont gratuites.
const CLASSE_A = new Set(['ListBuckets', 'PutBucket', 'ListObjects', 'PutObject', 'CopyObject', 'CompleteMultipartUpload', 'CreateMultipartUpload', 'ListMultipartUploads', 'UploadPart', 'UploadPartCopy', 'ListParts', 'PutBucketEncryption', 'PutBucketCors', 'PutBucketLifecycleConfiguration', 'LifecycleStorageTierTransition']);
const CLASSE_B = new Set(['HeadBucket', 'HeadObject', 'GetObject', 'UsageSummary', 'GetBucketEncryption', 'GetBucketLocation', 'GetBucketCors', 'GetBucketLifecycleConfiguration']);
export function classeR2(action) { return CLASSE_A.has(action) ? 'A' : CLASSE_B.has(action) ? 'B' : null; }

// Le début du mois (UTC) de `t` : la période des quotas.
export function debutDuMois(t) {
  const d = new Date(t);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function couts(env, o = {}) {
  const chercher = o.chercher || fetch, maintenant = o.maintenant || Date.now();
  if (!env.CF_API_TOKEN || !/^[0-9a-f]{32}$/i.test(String(env.CF_ACCOUNT_ID || ''))) {
    return { ok: false, statut: 503, erreur: 'Il manque le jeton d\'analytique (CF_API_TOKEN) ou l\'identifiant du compte (CF_ACCOUNT_ID) : voir worker/README.md.' };
  }
  const debut = debutDuMois(maintenant);
  const jour = debut.toISOString().slice(0, 10), instant = debut.toISOString();
  const mesures = {};
  await Promise.all(Object.entries(MESURES).map(async ([cle, m]) => {
    const filtre = m.date ? `{ date_geq: "${jour}" }` : `{ datetime_geq: "${instant}" }`;
    const query = `query { viewer { accounts(filter: { accountTag: "${env.CF_ACCOUNT_ID}" }) { ${m.ens}(limit: 10000, filter: ${filtre}) { ${m.champ} } } } }`;
    try {
      const r = await chercher('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST', headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
      });
      const j = await r.json();
      if (j.errors && j.errors.length) throw new Error(String(j.errors[0].message || 'erreur').slice(0, 160));
      const lignes = (((j.data || {}).viewer || {}).accounts || [])[0];
      const rows = (lignes && lignes[m.ens]) || [];
      if (m.parType) {
        const v = { A: 0, B: 0, gratuit: 0, parAction: {} };
        for (const x of rows) {
          const n = Number(x.sum && x.sum.requests) || 0, a = x.dimensions && x.dimensions.actionType;
          v.parAction[a] = (v.parAction[a] || 0) + n;
          const c = classeR2(a);
          if (c) v[c] += n; else v.gratuit += n;
        }
        mesures[cle] = { valeur: v };
      } else {
        const vals = rows.map((x) => Number(m.lire(x)) || 0);
        mesures[cle] = { valeur: m.max ? (vals.length ? Math.max(...vals) : 0) : vals.reduce((a, b) => a + b, 0) };
      }
    } catch (e) {
      mesures[cle] = { erreur: e.message };
    }
  }));
  return { ok: true, debut: debut.toISOString(), maintenant: new Date(maintenant).toISOString(), mesures };
}

/* ---------- les routes ---------- */

const json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const jours = (url) => { const n = Number(url.searchParams.get('jours')); return [1, 7, 30, 90].includes(n) ? n : 7; };

// Une requête /admin ou /admin/… : `outils` vient de index.js (lire R2, construire le rapport, parler au Durable
// Object des comptes) : pas d'import circulaire.
export async function routeAdmin(request, env, url, outils, o = {}) {
  if (request.method !== 'GET') return json({ ok: false, erreur: 'La console ne fait que lire.' }, 405);
  const acces = await accesAdmin(request, env, o);
  if (!acces.ok) {
    if (url.pathname.startsWith('/admin/api/')) return json({ ok: false, erreur: acces.erreur }, acces.statut);
    return new Response(`<!doctype html><meta charset="utf-8"><title>Console Moon Bloom</title><p style="font:16px system-ui;margin:2rem">${acces.erreur}</p>`, { status: acces.statut, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const p = url.pathname.replace(/\/+$/, '');
  if (p === '/admin') {
    const page = outils.page ? await outils.page() : '';
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      // (la page ne charge qu'elle-même et ne parle qu'à ses /admin/api)
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
  }
  if (p === '/admin/api/moi') return json({ ok: true, email: acces.email });
  if (p === '/admin/api/couts') { const r = await couts(env, o); return json(r, r.ok ? 200 : r.statut); }
  if (p === '/admin/api/joueurs' || p === '/admin/api/retours') {
    const n = jours(url);
    const r = await outils.rapport(n * 24 * 3600 * 1000);
    if (p === '/admin/api/retours') return json({ ok: true, jours: n, commentaires: r.comments, erreurs: r.erreurs, sessions: r.sessions, nonLus: r.truncated, illisibles: r.unreadable });
    return json({ ok: true, jours: n, rapport: r });
  }
  if (p === '/admin/api/sessions') return json({ ok: true, jours: jours(url), sessions: await outils.listeSessions(jours(url) * 24 * 3600 * 1000) });
  if (p === '/admin/api/session') {
    const sid = url.searchParams.get('sid') || '';
    if (!SID_RE.test(sid)) return json({ ok: false, erreur: 'Session inconnue.' }, 400);
    const s = await outils.lire(`sessions/${sid}.json`);
    return s ? json({ ok: true, session: s }) : json({ ok: false, erreur: 'Session introuvable.' }, 404);
  }
  if (p === '/admin/api/joueur') {
    const id = url.searchParams.get('id') || '';
    if (!PID_RE.test(id)) return json({ ok: false, erreur: 'Joueur inconnu.' }, 400);
    const f = await outils.lire(`players/${id}.json`);
    return f ? json({ ok: true, fiche: f }) : json({ ok: false, erreur: 'Fiche introuvable.' }, 404);
  }
  if (p === '/admin/api/enligne') return json(await outils.enLigne());
  if (p === '/admin/api/ventes') return json(outils.ventes ? await outils.ventes() : { ok: false, erreur: 'not found' });
  return json({ ok: false, erreur: 'not found' }, 404);
}
