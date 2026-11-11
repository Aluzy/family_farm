// Tests de la console d'administration (worker/src/admin.mjs) : l'accès par Cloudflare Access (un vrai jeton RS256
// signé ici, des clés publiques servies par un faux fetch), la lecture des coûts (l'API GraphQL simulée, une mesure
// refusée n'empêche pas les autres), les routes (lecture seule, page avec CSP, validation des paramètres) et les
// chiffres du jeu en ligne (jamais d'adresse e-mail).
// Lancement : node tests/test-admin.mjs (ou node tests/run-tests.mjs --tous).

import { test as nodeTest } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { accesAdmin, classeR2, couts, debutDuMois, MESURES, oublierClesAccess, routeAdmin } from '../worker/src/admin.mjs';
import { Registre } from '../worker/src/comptes.mjs';

const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const T0 = Date.UTC(2026, 10, 11, 12);
const ENV = { ACCESS_EQUIPE: 'moonbloom', ACCESS_AUD: 'aud-console', ADMIN_EMAILS: 'Moi@Exemple.fr, autre@exemple.fr' };

// Une paire de clés RSA, ses clés publiques comme Access les sert, et un signeur de jetons.
const paire = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', paire.publicKey);
const intrus = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
let appelsCles = 0;
const chercherCles = async (url) => {
  appelsCles++;
  assert(url === 'https://moonbloom.cloudflareaccess.com/cdn-cgi/access/certs', url);
  return { ok: true, json: async () => ({ keys: [{ kid: 'k1', kty: 'RSA', alg: 'RS256', n: jwk.n, e: jwk.e }] }) };
};
async function jeton(corps = {}, { cle = paire.privateKey, kid = 'k1' } = {}) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const p = b64u(JSON.stringify({ aud: ['aud-console'], email: 'moi@exemple.fr', iss: 'https://moonbloom.cloudflareaccess.com', exp: Math.floor(T0 / 1000) + 3600, ...corps }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cle, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}
const requete = (chemin, jwt, init = {}) => new Request('https://family-farm.exemple.workers.dev' + chemin, { ...init, headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });
const o = { chercher: chercherCles, maintenant: T0 };

test('accès : fermé sans réglage, sans jeton, avec un jeton faux, expiré, d\'une autre audience ou d\'une autre adresse', async () => {
  oublierClesAccess();
  eq((await accesAdmin(requete('/admin', await jeton()), {}, o)).statut, 503, 'sans réglage : fermé');
  eq((await accesAdmin(requete('/admin'), ENV, o)).statut, 403, 'sans jeton');
  eq((await accesAdmin(requete('/admin', 'a.b.c'), ENV, o)).statut, 403, 'jeton illisible');
  eq(await accesAdmin(requete('/admin', await jeton()), ENV, o), { ok: true, email: 'moi@exemple.fr' });
  eq((await accesAdmin(requete('/admin', await jeton({}, { cle: intrus.privateKey })), ENV, o)).statut, 403, 'signé par une autre clé');
  eq((await accesAdmin(requete('/admin', await jeton({}, { kid: 'k9' })), ENV, o)).statut, 403, 'clé inconnue');
  eq((await accesAdmin(requete('/admin', await jeton({ aud: ['autre'] })), ENV, o)).statut, 403, 'autre audience');
  eq((await accesAdmin(requete('/admin', await jeton({ exp: Math.floor(T0 / 1000) - 1 })), ENV, o)).statut, 403, 'expiré');
  eq((await accesAdmin(requete('/admin', await jeton({ iss: 'https://pirate.cloudflareaccess.com' })), ENV, o)).statut, 403, 'autre émetteur');
  const r = await accesAdmin(requete('/admin', await jeton({ email: 'joueur@exemple.fr' })), ENV, o);
  eq([r.statut, /administratrice/.test(r.erreur)], [403, true], 'adresse non autorisée');
  eq(appelsCles, 1, 'les clés publiques, lues une fois (gardées une heure)');
});

test('coûts : une requête par mesure depuis le 1er du mois ; R2 par classe ; une mesure refusée reste à part', async () => {
  eq(debutDuMois(T0).toISOString(), '2026-11-01T00:00:00.000Z');
  eq([classeR2('PutObject'), classeR2('ListObjects'), classeR2('GetObject'), classeR2('HeadObject'), classeR2('DeleteObject')], ['A', 'A', 'B', 'B', null]);
  eq((await couts({}, o)).statut, 503, 'sans jeton : dit ce qui manque');
  const vus = [];
  const chercher = async (url, init) => {
    assert(url === 'https://api.cloudflare.com/client/v4/graphql');
    assert(init.headers.Authorization === 'Bearer jeton-lecture');
    const q = JSON.parse(init.body).query;
    vus.push(q);
    assert(/accountTag: "0123456789abcdef0123456789abcdef"/.test(q), 'le compte');
    assert(/date_geq: "2026-11-01"|datetime_geq: "2026-11-01T00:00:00.000Z"/.test(q), 'depuis le 1er');
    const ens = Object.values(MESURES).find((m) => q.includes(m.ens + '(') && q.includes(m.champ)).ens;
    let rows;
    if (q.includes('cpuTimeUs')) return { json: async () => ({ errors: [{ message: 'unknown field cpuTimeUs' }] }) };
    if (ens === 'r2OperationsAdaptiveGroups') rows = [{ sum: { requests: 900 }, dimensions: { actionType: 'PutObject' } }, { sum: { requests: 100 }, dimensions: { actionType: 'ListObjects' } }, { sum: { requests: 400 }, dimensions: { actionType: 'GetObject' } }, { sum: { requests: 7 }, dimensions: { actionType: 'DeleteObject' } }];
    else if (ens === 'r2StorageAdaptiveGroups') rows = [{ max: { payloadSize: 3e9, metadataSize: 1e6 } }, { max: { payloadSize: 2e9, metadataSize: 1e6 } }];
    else if (ens === 'durableObjectsStorageGroups') rows = [{ max: { storedBytes: 5e6 } }, { max: { storedBytes: 8e6 } }];
    else if (ens === 'workersInvocationsAdaptive') rows = [{ sum: { requests: 1000, errors: 3 } }, { sum: { requests: 500, errors: 1 } }];
    else rows = [{ sum: { requests: 10, inboundWebsocketMsgCount: 40, activeTime: 2e6, rowsRead: 50, rowsWritten: 5 } }, { sum: { requests: 5, inboundWebsocketMsgCount: 0, activeTime: 1e6, rowsRead: 50, rowsWritten: 5 } }];
    return { json: async () => ({ data: { viewer: { accounts: [{ [ens]: rows }] } } }) };
  };
  const r = await couts({ CF_API_TOKEN: 'jeton-lecture', CF_ACCOUNT_ID: '0123456789abcdef0123456789abcdef' }, { chercher, maintenant: T0 });
  eq(vus.length, Object.keys(MESURES).length, 'une requête par mesure');
  const v = (k) => r.mesures[k].valeur;
  eq([r.ok, r.debut, v('workerRequetes'), v('workerErreurs'), v('doRequetes'), v('doMessagesWs'), v('doActifUs'), v('doLignesLues'), v('doLignesEcrites'), v('doStockage'), v('r2Stockage')],
    [true, '2026-11-01T00:00:00.000Z', 1500, 4, 15, 40, 3e6, 100, 10, 8e6, 3e9 + 1e6]);
  eq([v('r2Operations').A, v('r2Operations').B, v('r2Operations').gratuit], [1000, 400, 7]);
  eq(r.mesures.workerCpuUs, { erreur: 'unknown field cpuTimeUs' }, 'refusée : à part, les autres sont là');
});

test('routes : lecture seule, page avec CSP, paramètres vérifiés, rapport sur la période demandée', async () => {
  oublierClesAccess();
  const fenetres = [], lus = [];
  const outils = {
    page: async () => '<!doctype html><title>Console Moon Bloom</title>',
    rapport: async (ms) => { fenetres.push(ms); return { sessions: 3, comments: [{ at: T0, text: 'Super jeu' }], erreurs: { total: 0, top: [] }, truncated: 0, unreadable: 0, joueurs: { actifs: 2 } }; },
    listeSessions: async (ms) => [{ sid: 'abcdefgh12', date: T0, taille: 2048 }],
    lire: async (cle) => { lus.push(cle); return cle.includes('abcdefgh12') ? { sid: 'abcdefgh12' } : null; },
    enLigne: async () => ({ ok: true, comptes: 4 }),
    ventes: async () => ({ ok: true, mode: 'test', gemmesEnCirculation: 550 }),
  };
  const jwt = await jeton();
  const appel = async (chemin, init) => { const r = await routeAdmin(requete(chemin, jwt, init), ENV, new URL('https://x' + chemin), outils, o); return { statut: r.status, r, corps: r.headers.get('Content-Type').includes('json') ? await r.json() : await r.text() }; };
  const sans = await routeAdmin(requete('/admin/api/couts'), ENV, new URL('https://x/admin/api/couts'), outils, o);
  eq(sans.status, 403, 'sans Access : rien');
  const page = await appel('/admin');
  eq([page.statut, /Console Moon Bloom/.test(page.corps), /default-src 'none'/.test(page.r.headers.get('Content-Security-Policy')), page.r.headers.get('X-Frame-Options')], [200, true, true, 'DENY']);
  eq((await appel('/admin/api/moi')).corps, { ok: true, email: 'moi@exemple.fr' });
  eq((await appel('/admin/api/couts', { method: 'POST' })).statut, 405, 'lecture seule');
  eq((await appel('/admin/api/joueurs?jours=30')).corps.jours, 30);
  eq((await appel('/admin/api/joueurs?jours=12345')).corps.jours, 7, 'une période inconnue : 7 jours');
  eq(fenetres, [30 * 864e5, 7 * 864e5]);
  eq((await appel('/admin/api/retours?jours=1')).corps.commentaires[0].text, 'Super jeu');
  eq((await appel('/admin/api/sessions?jours=7')).corps.sessions.length, 1);
  eq((await appel('/admin/api/session?sid=abcdefgh12')).corps.session, { sid: 'abcdefgh12' });
  eq((await appel('/admin/api/session?sid=../../x')).statut, 400, 'un nom de fichier forgé : refusé');
  eq((await appel('/admin/api/joueur?id=inconnu123')).statut, 404);
  eq(lus, ['sessions/abcdefgh12.json', 'players/inconnu123.json'], 'rien d\'autre n\'est lu');
  eq((await appel('/admin/api/enligne')).corps.comptes, 4);
  eq((await appel('/admin/api/ventes')).corps.gemmesEnCirculation, 550, 'les ventes de gemmes');
  eq((await appel('/admin/api/rien')).statut, 404);
});

test('en ligne : comptes, mondes, amis, qui est en ligne (son prénom), jamais d\'adresse e-mail', async () => {
  const db = new DatabaseSync(':memory:');
  const sql = { exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
  const horloge = { t: T0 };
  const r = new Registre(sql, () => horloge.t);
  const comptes = [];
  for (const e of ['alex@exemple.fr', 'sam@exemple.fr', 'zoe@exemple.fr']) comptes.push((await r.connecter((await r.demanderLien(e)).jeton)).compte.id);
  const [a, b, z] = comptes;
  r.ajouterMonde(a, 'm-aaaaaaaaaaaaaaaaaaaa', 'Les Glycines', 'proprietaire');
  r.ajouterMonde(b, 'm-aaaaaaaaaaaaaaaaaaaa', 'Les Glycines', 'batisseur');
  r.amis.publier(a, { prenom: 'Alex', niveau: 9, monde: 'm-aaaaaaaaaaaaaaaaaaaa', proprio: true });
  r.amis.publier(b, { prenom: 'Sam', niveau: 4, monde: 'm-aaaaaaaaaaaaaaaaaaaa' });
  r.amis.ajouter(a, r.amis.profil(b).code); r.amis.repondre(b, a, true);
  r.amis.ajouter(z, r.amis.profil(a).code);
  horloge.t += 30 * 1000;
  r.amis.publier(z, { prenom: 'Zoé', niveau: 2 });
  const s = r.statsAdmin();
  eq([s.comptes, s.nouveaux7j, s.mondes, s.amities, s.demandes, s.profils, s.mondesActifs], [3, 3, 1, 1, 1, 3, 1]);
  eq(s.enLigne.map((p) => [p.prenom, p.niveau, p.aPlusieurs, p.proprio]), [['Zoé', 2, false, false], ['Alex', 9, true, true], ['Sam', 4, true, false]]);
  assert(!JSON.stringify(s).includes('@'), 'aucune adresse');
  assert(!JSON.stringify(s).includes('m-aaaa'), 'aucun identifiant de monde');
  horloge.t += 120 * 1000;
  eq(r.statsAdmin().enLigne.length, 0, 'plus vus depuis 90 s : hors ligne');
});
