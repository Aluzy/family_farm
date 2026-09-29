// Point de collecte Ferme Familiale (Cloudflare Worker + R2).
// Reçoit le JSON d'une session (POST /session) et l'écrit dans le bucket R2
// sous la clé sessions/<sid>.json. Un envoi ultérieur de la même session
// remplace le fichier (dernière version = la plus complète).

const ALLOWED_ORIGIN = 'https://aluzy.github.io';
const MAX_BYTES = 64 * 1024;
const SID_RE = /^[A-Za-z0-9-]{8,64}$/;

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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

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

    data.receivedAt = new Date().toISOString();
    await env.SESSIONS.put(`sessions/${data.sid}.json`, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });
    return json({ ok: true, events: data.events.length }, 200, origin);
  },
};
