// La boutique du jeu en ligne : les gemmes (💎), achetées avec de l'argent réel par Stripe Checkout, et
// ce qu'elles achètent (les rosiers grimpants, les guirlandes lumineuses, les cheminées, les papiers peints). Tout se tient ici, sur le serveur : le solde de gemmes, les
// paiements et les achats sont dans la base du Durable Object Comptes (une partie solo, sur l'appareil, se
// modifie à la main : elle ne garde jamais de gemmes). Un compte est nécessaire pour acheter.
//
// Le paiement (documentation Stripe : « Create a Checkout Session », « Receive Stripe events in your
// webhook endpoint ») :
//   1. le jeu demande un pack (POST /compte/boutique/payer { pack, adulte, renonce }) : le serveur crée une
//      session Checkout (prix, devise, compte en client_reference_id) et la note « ouverte » ; le jeu
//      envoie le joueur sur la page de paiement de Stripe (jamais de carte saisie dans le jeu) ;
//   2. Stripe prévient le Worker (POST /stripe/webhook, l'événement checkout.session.completed, ou
//      checkout.session.async_payment_succeeded pour un moyen de paiement différé) ; la signature
//      (en-tête Stripe-Signature : t et v1, HMAC SHA-256 de « t.corps » avec le secret de l'endpoint) est
//      vérifiée, l'horodatage à TOLERANCE_S secondes près ; la session doit être une des nôtres, payée
//      (payment_status « paid »), du bon montant, dans la bonne devise, du bon compte : ses gemmes sont
//      créditées une seule fois (un même événement reçu deux fois ne crédite rien de plus) ;
//   3. le jeu revient (#boutique=ok) et relit son solde.
//
// Le mode test : la clé STRIPE_SECRET_KEY commence par sk_test_ ou rk_test_ (des paiements fictifs, la carte
// 4242 4242 4242 4242) ; sk_live_ ou rk_live_ : de vrais paiements. Un événement d'un autre mode que la clé est ignoré.
//
// Un achat (POST /compte/boutique/acheter { article }) débite les gemmes et crée une livraison ; le jeu met
// l'objet dans la partie, puis confirme (POST /compte/boutique/livre { ids }) ; tant qu'il n'a pas confirmé,
// la livraison lui est reproposée (et le jeu note les livraisons déjà reçues : jamais deux fois).

export const BOUTIQUE = {
  DEVISE: 'eur',
  // les packs de gemmes : leur prix en centimes
  PACKS: {
    petit: { gemmes: 200, centimes: 199 },
    moyen: { gemmes: 550, centimes: 499 },
    grand: { gemmes: 1200, centimes: 999 },
  },
  // ce que les gemmes achètent (l'objet donné dans la partie : le même nom)
  ARTICLES: {
    rosier_multicolore: { prix: 25, nom: 'Rosier grimpant multicolore' },
    rosier_rouge: { prix: 25, nom: 'Rosier grimpant rouge' },
    rosier_blanc: { prix: 25, nom: 'Rosier grimpant blanc' },
    rosier_jaune: { prix: 25, nom: 'Rosier grimpant jaune' },
    // les guirlandes lumineuses : un lot de 8 segments (DATA.OBJETS[].lot), sur les façades, allumées le soir
    guirlande_blanche: { prix: 60, nom: 'Guirlande lumineuse blanche (8 segments)' },
    guirlande_multicolore: { prix: 60, nom: 'Guirlande lumineuse multicolore (8 segments)' },
    guirlande_etoiles: { prix: 60, nom: 'Guirlande d\'étoiles (8 segments)' },
    guirlande_coeurs: { prix: 60, nom: 'Guirlande de cœurs (8 segments)' },
    // les cheminées d'intérieur : un meuble de deux cases, son feu allumé le soir
    cheminee_pierre: { prix: 120, nom: 'Cheminée en pierre' },
    cheminee_briques: { prix: 120, nom: 'Cheminée en briques' },
    cheminee_marbre: { prix: 120, nom: 'Cheminée en marbre' },
    // les fontaines de jardin : deux cases sur deux, dehors ; leur eau coule jour et nuit
    fontaine_pierre: { prix: 120, nom: 'Fontaine en pierre' },
    fontaine_marbre: { prix: 120, nom: 'Fontaine en marbre' },
    fontaine_grenouille: { prix: 120, nom: 'Fontaine à la grenouille' },
    fontaine_angelot: { prix: 120, nom: 'Fontaine à l\'angelot' },
    // les arbres d'ornement : deux cases sur deux, dehors ; leurs pétales (leurs feuilles) tombent doucement
    ornement_cerisier_japon: { prix: 90, nom: 'Cerisier du Japon' },
    ornement_erable_rouge: { prix: 90, nom: 'Érable rouge' },
    ornement_magnolia: { prix: 90, nom: 'Magnolia' },
    ornement_saule_pleureur: { prix: 90, nom: 'Saule pleureur' },
    // les enseignes de ferme : le panneau au nom de la famille et sa boîte aux lettres (DATA.OBJETS[].avec), 5 couleurs
    enseigne_bois: { prix: 50, nom: 'Enseigne de ferme en bois gravé et sa boîte aux lettres' },
    enseigne_email: { prix: 50, nom: 'Enseigne de ferme émaillée et sa boîte aux lettres' },
    enseigne_fer: { prix: 50, nom: 'Enseigne de ferme en fer forgé et sa boîte aux lettres' },
    // les ensembles à thème pour une pièce : chaque objet seul, ou l'ensemble (DATA.OBJETS[].contenu) avec ~20 % de remise
    ensemble_chalet: { prix: 220, nom: 'Ensemble chalet de montagne (lit, chevet, tapis, tableau, plancher, lambris)' },
    chalet_lit: { prix: 80, nom: 'Lit de chalet' },
    chalet_chevet: { prix: 40, nom: 'Chevet de chalet et sa lampe' },
    chalet_tapis: { prix: 40, nom: 'Tapis alpin' },
    chalet_tableau: { prix: 30, nom: 'Tableau : le sommet enneigé' },
    sol_meleze: { prix: 50, nom: 'Plancher de mélèze (24 lames)' },
    ensemble_cottage: { prix: 220, nom: 'Ensemble cottage anglais (lit, chevet, tapis, tableau, plancher, papier peint)' },
    cottage_lit: { prix: 80, nom: 'Lit de cottage' },
    cottage_chevet: { prix: 40, nom: 'Chevet de cottage et sa lampe' },
    cottage_tapis: { prix: 40, nom: 'Tapis aux roses' },
    cottage_tableau: { prix: 30, nom: 'Tableau : le jardin du cottage' },
    sol_blanchi: { prix: 50, nom: 'Plancher blanchi (24 lames)' },
    ensemble_mer: { prix: 220, nom: 'Ensemble bord de mer (lit, chevet, tapis, tableau, plancher, papier peint)' },
    mer_lit: { prix: 80, nom: 'Lit de bord de mer' },
    mer_chevet: { prix: 40, nom: 'Chevet de bord de mer et sa lampe' },
    mer_tapis: { prix: 40, nom: 'Tapis de jute' },
    mer_tableau: { prix: 30, nom: 'Tableau : le phare' },
    sol_flotte: { prix: 50, nom: 'Plancher flotté (24 lames)' },
    ensemble_fee: { prix: 220, nom: 'Ensemble chambre d\'enfant féerique (lit, chevet, tapis, tableau, parquet, papier peint)' },
    fee_lit: { prix: 80, nom: 'Lit féerique' },
    fee_chevet: { prix: 40, nom: 'Chevet féerique et sa lampe champignon' },
    fee_tapis: { prix: 40, nom: 'Tapis arc-en-ciel' },
    fee_tableau: { prix: 30, nom: 'Tableau : la licorne' },
    sol_pastel: { prix: 50, nom: 'Parquet pastel (24 lames)' },
    // les décors des fêtes : en vente seulement à la période de la fête (FETES, enVente) ; achetés, gardés pour toujours
    sapin_noel: { prix: 120, nom: 'Sapin de Noël décoré (ses guirlandes s\'allument le soir)', fete: 'noel' },
    couronne_noel: { prix: 40, nom: 'Couronne de Noël', fete: 'noel' },
    bonhomme_neige: { prix: 60, nom: 'Bonhomme de neige', fete: 'noel' },
    // les papiers peints : un motif acheté est débloqué pour toujours (js/engine/papiers.js)
    papier_peint_fleurettes: { prix: 40, nom: 'Papier peint fleurettes' },
    papier_peint_rayures: { prix: 40, nom: 'Papier peint rayures' },
    papier_peint_vichy: { prix: 40, nom: 'Papier peint carreaux vichy' },
    papier_peint_damas: { prix: 40, nom: 'Papier peint damas' },
    papier_peint_feuillages: { prix: 40, nom: 'Papier peint feuillages' },
    papier_peint_etoiles: { prix: 40, nom: 'Papier peint étoiles' },
    papier_peint_lambris: { prix: 40, nom: 'Papier peint lambris de pin' },
    papier_peint_roses: { prix: 40, nom: 'Papier peint roses anglaises' },
    papier_peint_vagues: { prix: 40, nom: 'Papier peint vagues' },
    papier_peint_nuages: { prix: 40, nom: 'Papier peint nuages et étoiles' },
  },
  // les périodes des fêtes (mois et jour, en temps universel, bornes comprises) : un article `fete` n'est en vente
  // que pendant la sienne (enVente)
  FETES: { noel: { du: [12, 1], au: [12, 31], nom: 'en décembre' } },
  TOLERANCE_S: 300,          // l'âge maximal d'une notification de Stripe (5 minutes, comme ses bibliothèques)
  PAIEMENTS_PAR_HEURE: 10,   // paiements ouverts au plus par compte en une heure
  CORPS_MAX: 64 * 1024,      // une notification de Stripe : 64 Ko au plus
};

const HEURE = 60 * 60 * 1000;
const lignes = (r) => (r && typeof r.toArray === 'function' ? r.toArray() : Array.isArray(r) ? r : []);
const refus = (statut, erreur) => ({ ok: false, statut, erreur });
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

// Le mode de la clé : 'test', 'live', ou null (pas de clé, ou une clé inconnue). Une clé secrète (sk_) ou,
// comme Stripe le conseille en production, une clé restreinte (rk_) qui peut écrire les sessions Checkout.
export function modeStripe(env) {
  const k = String((env && env.STRIPE_SECRET_KEY) || '');
  return /^(sk|rk)_test_/.test(k) ? 'test' : /^(sk|rk)_live_/.test(k) ? 'live' : null;
}
// L'article `a` est-il en vente à la date `t` (ms) ? Un article sans fête, toujours ; un décor de fête, pendant sa
// période (BOUTIQUE.FETES).
export function enVente(a, t = Date.now()) {
  if (!a || !a.fete) return !!a;
  const F = BOUTIQUE.FETES[a.fete];
  if (!F) return false;
  const d = new Date(t), md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const du = F.du[0] * 100 + F.du[1], au = F.au[0] * 100 + F.au[1];
  return du <= au ? md >= du && md <= au : md >= du || md <= au;
}

// Les articles en vente à la date `t` (ms).
export function articlesEnVente(t = Date.now()) {
  return Object.fromEntries(Object.entries(BOUTIQUE.ARTICLES).filter(([, a]) => enVente(a, t)));
}

export const boutiqueOuverte = (env) => !!(modeStripe(env) && env.STRIPE_WEBHOOK_SECRET);

export function creerTablesBoutique(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS gemmes (compte TEXT PRIMARY KEY, solde INTEGER NOT NULL)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS paiements (session TEXT PRIMARY KEY, compte TEXT NOT NULL, pack TEXT NOT NULL, gemmes INTEGER NOT NULL, centimes INTEGER NOT NULL, devise TEXT NOT NULL, mode TEXT NOT NULL, etat TEXT NOT NULL, cree INTEGER NOT NULL, paye INTEGER)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS paiements_compte ON paiements (compte, cree)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS achats (id INTEGER PRIMARY KEY AUTOINCREMENT, compte TEXT NOT NULL, article TEXT NOT NULL, gemmes INTEGER NOT NULL, cree INTEGER NOT NULL, livre INTEGER)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS achats_compte ON achats (compte, livre)`);
}

export class Boutique {
  constructor(sql, maintenant = () => Date.now()) {
    this.sql = sql;
    this.maintenant = maintenant;
    creerTablesBoutique(sql);
  }

  un(q, ...v) { return lignes(this.sql.exec(q, ...v))[0] || null; }
  tous(q, ...v) { return lignes(this.sql.exec(q, ...v)); }
  faire(q, ...v) { lignes(this.sql.exec(q, ...v)); }

  solde(compte) { return (this.un('SELECT solde FROM gemmes WHERE compte = ?', compte) || {}).solde || 0; }
  ajouter(compte, n) {
    this.faire('INSERT INTO gemmes (compte, solde) VALUES (?, ?) ON CONFLICT(compte) DO UPDATE SET solde = solde + excluded.solde', compte, n);
  }

  // Ce que le jeu montre : le solde, les livraisons pas encore confirmées.
  etat(compte) {
    return {
      solde: this.solde(compte),
      aLivrer: this.tous('SELECT id, article FROM achats WHERE compte = ? AND livre IS NULL ORDER BY id', compte),
    };
  }

  // Peut-on ouvrir un paiement de plus pour ce compte ? (PAIEMENTS_PAR_HEURE en une heure)
  peutPayer(compte) {
    const n = (this.un('SELECT COUNT(*) AS n FROM paiements WHERE compte = ? AND cree > ?', compte, this.maintenant() - HEURE) || {}).n || 0;
    return n < BOUTIQUE.PAIEMENTS_PAR_HEURE;
  }

  // La session Checkout créée pour `compte` (son pack) : notée « ouverte ».
  noterPaiement(session, compte, pack, mode) {
    const p = BOUTIQUE.PACKS[pack];
    this.faire('INSERT INTO paiements (session, compte, pack, gemmes, centimes, devise, mode, etat, cree) VALUES (?, ?, ?, ?, ?, ?, ?, \'ouvert\', ?)',
      session, compte, pack, p.gemmes, p.centimes, BOUTIQUE.DEVISE, mode, this.maintenant());
  }

  // Une session Checkout que Stripe dit terminée (l'objet de l'événement) : ses gemmes créditées si elle est
  // des nôtres, payée, du bon montant, de la bonne devise, du bon compte, et pas encore créditée.
  // → { ok, credite, compte, gemmes } ou un refus (rien ne change).
  encaisser(s, mode) {
    if (!s || typeof s !== 'object' || !SESSION_RE.test(String(s.id || ''))) return refus(400, 'session inconnue');
    const p = this.un('SELECT * FROM paiements WHERE session = ?', s.id);
    if (!p) return refus(404, 'session inconnue');
    if (p.mode !== mode) return refus(400, 'mode différent');
    if (p.etat === 'paye') return { ok: true, credite: false, compte: p.compte, gemmes: 0 };
    if (s.payment_status !== 'paid') return { ok: true, credite: false, compte: p.compte, gemmes: 0, attente: true };
    if (s.client_reference_id !== p.compte || Number(s.amount_total) !== p.centimes || String(s.currency) !== p.devise) return refus(400, 'session différente de celle ouverte');
    // (dans le Durable Object, rien ne s'intercale entre la lecture et l'écriture : pas d'attente ici)
    this.faire('UPDATE paiements SET etat = \'paye\', paye = ? WHERE session = ?', this.maintenant(), s.id);
    this.ajouter(p.compte, p.gemmes);
    return { ok: true, credite: true, compte: p.compte, gemmes: p.gemmes };
  }

  // Un article acheté avec des gemmes : débitées, la livraison créée. → { ok, solde, livraison } ou un refus.
  acheter(compte, article) {
    const a = BOUTIQUE.ARTICLES[article];
    if (!a) return refus(404, 'Cet article n\'existe pas.');
    if (!enVente(a, this.maintenant())) return refus(410, `Cet article n'est en vente que ${(BOUTIQUE.FETES[a.fete] || {}).nom || 'à sa saison'}.`);
    const solde = this.solde(compte);
    if (solde < a.prix) return refus(402, `Il te faut ${a.prix} 💎 (tu en as ${solde}).`);
    this.faire('UPDATE gemmes SET solde = solde - ? WHERE compte = ?', a.prix, compte);
    this.faire('INSERT INTO achats (compte, article, gemmes, cree) VALUES (?, ?, ?, ?)', compte, article, a.prix, this.maintenant());
    const id = (this.un('SELECT MAX(id) AS id FROM achats WHERE compte = ?', compte) || {}).id;
    return { ok: true, solde: solde - a.prix, livraison: { id, article } };
  }

  // Les livraisons que le jeu a mises dans la partie.
  livre(compte, ids) {
    const t = this.maintenant();
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 100)) if (Number.isInteger(id)) this.faire('UPDATE achats SET livre = ? WHERE compte = ? AND id = ? AND livre IS NULL', t, compte, id);
    return { ok: true };
  }

  // Le compte supprimé : son solde et ses achats effacés ; ses paiements restent (la comptabilité), sans
  // le lien vers lui.
  oublier(compte) {
    this.faire('DELETE FROM gemmes WHERE compte = ?', compte);
    this.faire('DELETE FROM achats WHERE compte = ?', compte);
    this.faire('UPDATE paiements SET compte = \'supprime\' WHERE compte = ?', compte);
  }

  // La console : les ventes (par mode), les paiements récents, les articles achetés ; jamais de compte.
  ventes() {
    const t = this.maintenant();
    const parMode = this.tous('SELECT mode, COUNT(*) AS paiements, SUM(centimes) AS centimes, SUM(gemmes) AS gemmes FROM paiements WHERE etat = \'paye\' GROUP BY mode');
    return {
      parMode,
      ouverts: (this.un('SELECT COUNT(*) AS n FROM paiements WHERE etat = \'ouvert\'') || {}).n || 0,
      recents: this.tous('SELECT pack, gemmes, centimes, devise, mode, paye FROM paiements WHERE etat = \'paye\' ORDER BY paye DESC LIMIT 50'),
      parPack: this.tous('SELECT mode, pack, COUNT(*) AS n, SUM(centimes) AS centimes FROM paiements WHERE etat = \'paye\' GROUP BY mode, pack'),
      articles: this.tous('SELECT article, COUNT(*) AS n, SUM(gemmes) AS gemmes FROM achats GROUP BY article'),
      gemmesEnCirculation: (this.un('SELECT SUM(solde) AS n FROM gemmes') || {}).n || 0,
      payes30j: (this.un('SELECT COUNT(*) AS n FROM paiements WHERE etat = \'paye\' AND paye > ?', t - 30 * 24 * HEURE) || {}).n || 0,
    };
  }
}

/* ---------- Stripe ---------- */

// Le corps d'une requête à l'API de Stripe (application/x-www-form-urlencoded, les objets en clés[entre][crochets]).
export function formulaire(obj, prefixe = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? formulaire(x, `${cle}[${i}]`, out) : out.append(`${cle}[${i}]`, String(x))));
    else if (typeof v === 'object') formulaire(v, cle, out);
    else out.append(cle, String(v));
  }
  return out;
}

// La session Checkout d'un pack pour un compte. → { ok, id, url } ou un refus. `envoyer` : fetch (les tests le remplacent).
export async function creerCheckout(env, compte, pack, jeuUrl, envoyer = fetch) {
  const p = BOUTIQUE.PACKS[pack];
  if (!p) return refus(404, 'Ce pack n\'existe pas.');
  const corps = formulaire({
    mode: 'payment',
    locale: 'fr',
    client_reference_id: compte,
    success_url: `${jeuUrl}#boutique=ok`,
    cancel_url: `${jeuUrl}#boutique=annule`,
    metadata: { compte, pack },
    payment_intent_data: { metadata: { compte, pack } },
    line_items: [{ quantity: 1, price_data: { currency: BOUTIQUE.DEVISE, unit_amount: p.centimes, product_data: { name: `${p.gemmes} gemmes — Moon Bloom Village` } } }],
  });
  const r = await envoyer('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corps.toString(),
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || !SESSION_RE.test(String(j.id || '')) || !/^https:\/\/checkout\.stripe\.com\//.test(String(j.url || ''))) {
    console.error(`Stripe : session Checkout refusée (${r.status}) ${j && j.error ? j.error.message : ''}`);
    return refus(502, 'Le paiement n\'a pas pu s\'ouvrir : réessaie dans un moment.');
  }
  return { ok: true, id: j.id, url: j.url };
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
function egaux(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// La signature d'une notification (en-tête Stripe-Signature) : t et les v1 (les autres entrées ignorées),
// HMAC SHA-256 de « t.corps » avec `secret`, comparée en temps constant ; l'horodatage à `tolerance` s
// près de `maintenantS`. → true / false.
export async function signatureValide(corps, entete, secret, maintenantS, tolerance = BOUTIQUE.TOLERANCE_S) {
  if (!secret || !entete) return false;
  let t = null;
  const v1 = [];
  for (const part of String(entete).split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1') v1.push(v);
  }
  if (!t || !/^\d+$/.test(t) || !v1.length) return false;
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const attendu = hex(await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(`${t}.${corps}`)));
  if (!v1.some((s) => egaux(s, attendu))) return false;
  return Math.abs(maintenantS - Number(t)) <= tolerance;
}

// Une notification de Stripe (le corps brut, l'en-tête) → { statut, corps }. Toujours 200 quand la signature est
// bonne (même pour un événement qu'on n'attend pas : Stripe ne le renverra pas) ; 400 sinon.
export async function recevoirStripe(corps, entete, boutique, env, maintenantS = Math.floor(Date.now() / 1000)) {
  if (!boutiqueOuverte(env)) return { statut: 503, corps: { ok: false } };
  if (corps.length > BOUTIQUE.CORPS_MAX) return { statut: 413, corps: { ok: false } };
  if (!(await signatureValide(corps, entete, env.STRIPE_WEBHOOK_SECRET, maintenantS))) return { statut: 400, corps: { ok: false, erreur: 'signature' } };
  let e;
  try { e = JSON.parse(corps); } catch (x) { return { statut: 400, corps: { ok: false } }; }
  const mode = modeStripe(env);
  if (!e || (e.livemode === true) !== (mode === 'live')) return { statut: 200, corps: { ok: true, ignore: 'mode' } };
  if (e.type !== 'checkout.session.completed' && e.type !== 'checkout.session.async_payment_succeeded') return { statut: 200, corps: { ok: true, ignore: e.type } };
  const r = boutique.encaisser(e.data && e.data.object, mode);
  if (!r.ok) console.error(`Stripe : ${e.type} refusé (${r.erreur})`);
  return { statut: 200, corps: { ok: true, credite: !!r.credite } };
}

// Les routes /compte/boutique… (connecté : `compte`). → { statut, corps }.
export async function routeBoutique(chemin, request, boutique, compte, env, jeuUrl, envoyer = fetch) {
  const corpsJson = async () => { try { return await request.json(); } catch (e) { return {}; } };
  const mode = modeStripe(env);
  if (request.method === 'GET' && chemin === 'boutique') {
    return { statut: 200, corps: { ok: true, ouverte: boutiqueOuverte(env), mode, packs: BOUTIQUE.PACKS, articles: articlesEnVente(boutique.maintenant()), devise: BOUTIQUE.DEVISE, ...boutique.etat(compte.id) } };
  }
  if (request.method === 'POST' && chemin === 'boutique/payer') {
    if (!boutiqueOuverte(env)) return { statut: 503, corps: { ok: false, erreur: 'La boutique n\'est pas encore ouverte.' } };
    const b = await corpsJson();
    if (b.adulte !== true || b.renonce !== true) return { statut: 400, corps: { ok: false, erreur: 'Il faut l\'accord d\'un adulte et accepter la livraison immédiate.' } };
    if (!BOUTIQUE.PACKS[b.pack]) return { statut: 404, corps: { ok: false, erreur: 'Ce pack n\'existe pas.' } };
    if (!boutique.peutPayer(compte.id)) return { statut: 429, corps: { ok: false, erreur: 'Trop de paiements ouverts : réessaie dans une heure.' } };
    const s = await creerCheckout(env, compte.id, b.pack, jeuUrl, envoyer);
    if (!s.ok) return { statut: s.statut, corps: { ok: false, erreur: s.erreur } };
    boutique.noterPaiement(s.id, compte.id, b.pack, mode);
    return { statut: 200, corps: { ok: true, url: s.url } };
  }
  if (request.method === 'POST' && chemin === 'boutique/acheter') {
    const b = await corpsJson();
    const r = boutique.acheter(compte.id, String(b.article || ''));
    return r.ok ? { statut: 200, corps: r } : { statut: r.statut, corps: { ok: false, erreur: r.erreur } };
  }
  if (request.method === 'POST' && chemin === 'boutique/livre') {
    const b = await corpsJson();
    return { statut: 200, corps: boutique.livre(compte.id, b.ids) };
  }
  return { statut: 404, corps: { ok: false, erreur: 'not found' } };
}
