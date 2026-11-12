// Tests de la boutique (worker/src/boutique.mjs) : les gemmes, le paiement par Stripe Checkout (simulé : une
// fonction remplace l'API de Stripe), la notification signée, les achats et leurs livraisons, et les routes
// dans le Worker et le Durable Object Comptes.
// Lancer seul : node tests/test-boutique.mjs (ou node tests/run-tests.mjs boutique).

import { test as nodeTest } from 'node:test';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { BOUTIQUE, Boutique, formulaire, modeStripe, recevoirStripe, routeBoutique, signatureValide } from '../worker/src/boutique.mjs';
import { Registre, routeCompte } from '../worker/src/comptes.mjs';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

function baseSql() {
  const db = new DatabaseSync(':memory:');
  return { db, exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
}
const SECRET = 'whsec_essai';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_cle', STRIPE_WEBHOOK_SECRET: SECRET, JEU_URL: 'https://moonbloom-village.com/jeu.html' };
// une notification signée comme Stripe (t, v1, et un v0 de sandbox à ignorer)
function signer(corps, t, secret = SECRET) {
  const v1 = createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex');
  return `t=${t},v1=${v1},v0=${'0'.repeat(64)}`;
}
const evenement = (type, objet, livemode = false) => JSON.stringify({ id: 'evt_1', object: 'event', type, livemode, data: { object: objet } });
const SESSION = 'cs_test_a1b2c3d4e5f6g7h8i9';
// une API de Stripe simulée : garde les requêtes, rend une session
function faussesApi(id = SESSION) {
  const appels = [];
  const envoyer = async (url, init) => { appels.push({ url, init, corps: new URLSearchParams(init.body) }); return { ok: true, status: 200, json: async () => ({ id, url: `https://checkout.stripe.com/c/pay/${id}` }) }; };
  return { appels, envoyer };
}

test('boutique : le mode vient de la clé (test, live, clé restreinte) ; sans clé ni secret, fermée', () => {
  eq([modeStripe({ STRIPE_SECRET_KEY: 'sk_test_x' }), modeStripe({ STRIPE_SECRET_KEY: 'rk_live_x' }), modeStripe({ STRIPE_SECRET_KEY: 'pk_test_x' }), modeStripe({})], ['test', 'live', null, null]);
  eq(BOUTIQUE.PACKS, { petit: { gemmes: 200, centimes: 199 }, moyen: { gemmes: 550, centimes: 499 }, grand: { gemmes: 1200, centimes: 999 } }, 'les prix validés');
  const PRIX = { ensemble_chalet: 220, chalet_lit: 80, chalet_chevet: 40, chalet_tapis: 40, chalet_tableau: 30, sol_meleze: 50 };
  const prixDe = (id) => (PRIX[id] ? PRIX[id] : id.startsWith('papier_peint_') ? 40 : id.startsWith('guirlande_') ? 60 : id.startsWith('cheminee_') || id.startsWith('fontaine_') ? 120 : id.startsWith('ornement_') ? 90 : id.startsWith('enseigne_') ? 50 : 25);
  for (const [id, a] of Object.entries(BOUTIQUE.ARTICLES)) eq(a.prix, prixDe(id), `${id} : ${prixDe(id)} gemmes`);
  eq(Object.keys(BOUTIQUE.ARTICLES).filter((id) => id.startsWith('guirlande_')).length, 4, 'quatre guirlandes');
  eq(Object.keys(BOUTIQUE.ARTICLES).filter((id) => id.startsWith('papier_peint_')).length, 7, 'sept papiers peints');
  // un ensemble coûte environ 20 % de moins que ses objets pris un à un, qui s'achètent aussi seuls
  for (const [id, a] of Object.entries(BOUTIQUE.ARTICLES).filter(([k]) => k.startsWith('ensemble_'))) {
    const C = JSON.parse(readFileSync(join(here, 'data', 'items.json'), 'utf8')).OBJETS[id].contenu, seuls = Object.keys(C).map((k) => BOUTIQUE.ARTICLES[k]);
    assert(seuls.every(Boolean), `${id} : chaque objet s'achète seul`);
    const total = seuls.reduce((n, x) => n + x.prix, 0);
    assert(a.prix < total * 0.85 && a.prix > total * 0.7, `${id} : ${a.prix} pour ${total}`);
  }
});

test('boutique : la signature de Stripe (v1, HMAC SHA-256 de « t.corps »), l\'horodatage à 5 minutes près', async () => {
  const corps = '{"a":1}', t = 1800000000;
  assert(await signatureValide(corps, signer(corps, t), SECRET, t + 10), 'bonne');
  assert(!(await signatureValide(corps + ' ', signer(corps, t), SECRET, t)), 'corps changé');
  assert(!(await signatureValide(corps, signer(corps, t, 'whsec_autre'), SECRET, t)), 'autre secret');
  assert(!(await signatureValide(corps, signer(corps, t), SECRET, t + 301)), 'trop vieille');
  assert(!(await signatureValide(corps, `t=${t},v0=${createHmac('sha256', SECRET).update(`${t}.${corps}`).digest('hex')}`, SECRET, t)), 'v0 seule : jamais');
  assert(await signatureValide(corps, `${signer(corps, t)},secret=whsec_****,payload=abc`, SECRET, t), 'les entrées de débogage ignorées');
  assert(!(await signatureValide(corps, '', SECRET, t)) && !(await signatureValide(corps, signer(corps, t), '', t)));
});

test('boutique : payer ouvre une session Checkout (le pack, son prix, le compte), après l\'accord d\'un adulte', async () => {
  const b = new Boutique(baseSql());
  const { appels, envoyer } = faussesApi();
  const req = (corps) => new Request('https://x/compte/boutique/payer', { method: 'POST', body: JSON.stringify(corps) });
  const compte = { id: 'c-1' };
  eq((await routeBoutique('boutique/payer', req({ pack: 'moyen' }), b, compte, ENV, ENV.JEU_URL, envoyer)).statut, 400, 'sans accord');
  eq((await routeBoutique('boutique/payer', req({ pack: 'enorme', adulte: true, renonce: true }), b, compte, ENV, ENV.JEU_URL, envoyer)).statut, 404);
  eq((await routeBoutique('boutique/payer', req({ pack: 'moyen', adulte: true, renonce: true }), b, compte, {}, ENV.JEU_URL, envoyer)).statut, 503, 'sans clé : fermée');
  const r = await routeBoutique('boutique/payer', req({ pack: 'moyen', adulte: true, renonce: true }), b, compte, ENV, ENV.JEU_URL, envoyer);
  eq([r.statut, r.corps.url], [200, `https://checkout.stripe.com/c/pay/${SESSION}`]);
  const a = appels[0];
  eq([a.url, a.init.headers.Authorization], ['https://api.stripe.com/v1/checkout/sessions', 'Bearer sk_test_cle']);
  const c = a.corps;
  eq([c.get('mode'), c.get('client_reference_id'), c.get('line_items[0][price_data][currency]'), c.get('line_items[0][price_data][unit_amount]'), c.get('line_items[0][quantity]'), c.get('metadata[pack]')],
    ['payment', 'c-1', 'eur', '499', '1', 'moyen']);
  eq([c.get('success_url'), c.get('cancel_url')], [`${ENV.JEU_URL}#boutique=ok`, `${ENV.JEU_URL}#boutique=annule`]);
  eq(b.un('SELECT etat, gemmes, centimes, mode FROM paiements WHERE session = ?', SESSION), { etat: 'ouvert', gemmes: 550, centimes: 499, mode: 'test' });
  eq(formulaire({ a: { b: [{ c: 1 }] } }).toString(), 'a%5Bb%5D%5B0%5D%5Bc%5D=1');
});

test('boutique : la notification de paiement crédite les gemmes une seule fois ; ce qui ne correspond pas ne crédite rien', async () => {
  const b = new Boutique(baseSql());
  b.noterPaiement(SESSION, 'c-1', 'petit', 'test');
  const t = Math.floor(Date.now() / 1000);
  const recevoir = (type, objet, livemode = false, env = ENV) => { const corps = evenement(type, objet, livemode); return recevoirStripe(corps, signer(corps, t), b, env, t); };
  const payee = { id: SESSION, payment_status: 'paid', client_reference_id: 'c-1', amount_total: 199, currency: 'eur' };
  // une signature fausse : 400, rien
  const corps = evenement('checkout.session.completed', payee);
  eq((await recevoirStripe(corps, signer(corps, t, 'whsec_faux'), b, ENV, t)).statut, 400);
  eq(b.solde('c-1'), 0);
  // un autre montant, une autre devise, un autre compte, pas payée, un autre mode : rien
  for (const x of [{ amount_total: 1 }, { currency: 'usd' }, { client_reference_id: 'c-2' }, { payment_status: 'unpaid' }]) {
    eq((await recevoir('checkout.session.completed', { ...payee, ...x })).statut, 200);
    eq(b.solde('c-1'), 0, JSON.stringify(x));
  }
  eq((await recevoir('checkout.session.completed', payee, true)).corps.ignore, 'mode', 'un événement réel avec une clé de test');
  eq((await recevoir('payment_intent.created', payee)).corps.ignore, 'payment_intent.created');
  // la bonne : 200 gemmes, une fois
  eq((await recevoir('checkout.session.completed', payee)).corps, { ok: true, credite: true });
  eq((await recevoir('checkout.session.completed', payee)).corps, { ok: true, credite: false }, 'reçue deux fois');
  eq((await recevoir('checkout.session.async_payment_succeeded', payee)).corps.credite, false);
  eq(b.solde('c-1'), 200);
  // une session qui n'est pas la nôtre
  eq((await recevoir('checkout.session.completed', { ...payee, id: 'cs_test_inconnue123456' })).corps.credite, false);
  eq(b.solde('c-1'), 200);
});

test('boutique : acheter un rosier (25 gemmes), la livraison reproposée jusqu\'à confirmation ; la suppression du compte efface le solde', async () => {
  const b = new Boutique(baseSql());
  eq(b.acheter('c-1', 'rosier_rouge').statut, 402, 'sans gemmes');
  b.ajouter('c-1', 60);
  const a1 = b.acheter('c-1', 'rosier_rouge'), a2 = b.acheter('c-1', 'rosier_blanc');
  eq([a1.solde, a2.solde, a2.livraison.article], [35, 10, 'rosier_blanc']);
  eq(b.acheter('c-1', 'rosier_jaune').statut, 402, 'plus assez');
  eq(b.acheter('c-1', 'licorne').statut, 404);
  eq(b.etat('c-1').aLivrer.map((x) => x.article), ['rosier_rouge', 'rosier_blanc']);
  b.livre('c-1', [a1.livraison.id]);
  b.livre('c-2', [a2.livraison.id]);
  eq(b.etat('c-1').aLivrer.map((x) => x.article), ['rosier_blanc'], 'un autre compte ne confirme pas la mienne');
  const v = b.ventes();
  eq(v.articles.map((x) => [x.article, x.n]), [['rosier_blanc', 1], ['rosier_rouge', 1]]);
  assert(!JSON.stringify(v).includes('c-1'), 'la console ne voit pas les comptes');
  b.oublier('c-1');
  eq(b.etat('c-1'), { solde: 0, aLivrer: [] });
});

test('boutique : les routes /compte/boutique (connecté) et la notification passée par le Worker sans origine', async () => {
  const sql = baseSql();
  const r = new Registre(sql);
  const l = await r.demanderLien('a@b.fr');
  const { session, compte } = await r.connecter(l.jeton);
  const req = (chemin, methode = 'GET', corps) => new Request('https://x' + chemin, { method: methode, headers: { Authorization: `Bearer ${session}` }, body: corps ? JSON.stringify(corps) : undefined });
  eq((await routeCompte(new Request('https://x/compte/boutique'), r, ENV)).statut, 401, 'pas connecté');
  const g = await routeCompte(req('/compte/boutique'), r, ENV);
  eq([g.statut, g.corps.ouverte, g.corps.mode, g.corps.solde, g.corps.packs.grand.gemmes], [200, true, 'test', 0, 1200]);
  // le Worker : la notification arrive sans en-tête Origin, va au Durable Object qui la vérifie
  const mod = await import(pathToFileURL(join(here, 'worker/src/index.js')).href);
  const dobj = new mod.Comptes({ storage: { sql } }, ENV);
  const env = { ...ENV, COMPTES: { idFromName: (n) => n, get: () => ({ fetch: (q) => dobj.fetch(q) }) } };
  dobj.registre.boutique.noterPaiement(SESSION, compte.id, 'grand', 'test');
  const corps = evenement('checkout.session.completed', { id: SESSION, payment_status: 'paid', client_reference_id: compte.id, amount_total: 999, currency: 'eur' });
  const t = Math.floor(Date.now() / 1000);
  const rep = await mod.default.fetch(new Request('https://w/stripe/webhook', { method: 'POST', body: corps, headers: { 'Stripe-Signature': signer(corps, t) } }), env);
  eq(rep.status, 200);
  eq(dobj.registre.boutique.solde(compte.id), 1200);
  const faux = await mod.default.fetch(new Request('https://w/stripe/webhook', { method: 'POST', body: corps, headers: { 'Stripe-Signature': 't=1,v1=00' } }), env);
  eq(faux.status, 400);
  // la suppression du compte efface aussi son solde
  await r.supprimer(session);
  eq(r.boutique.etat(compte.id).solde, 0);
});
