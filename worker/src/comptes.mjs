// Les comptes des joueurs (E-0, décision F.3 : un compte pour le jeu en ligne, connexion par un lien
// envoyé par e-mail ; le jeu solo reste sans compte, sur l'appareil).
//
// - demanderLien(email) : un lien de connexion à usage unique, valable LIEN_MIN minutes, envoyé à
//   l'adresse. La réponse est la même que l'adresse ait un compte ou non (on ne devine pas qui joue).
// - connecter(jeton) : le lien suivi, le compte est ouvert (créé à la première connexion) et une session
//   rendue, valable SESSION_JOURS jours (le jeu la garde sur l'appareil).
// - moi(session), deconnecter(session), supprimer(session) : le compte d'une session, la fin de la
//   session, la suppression du compte et de toutes ses sessions (RGPD : droit à l'effacement).
//
// Seules des empreintes (SHA-256) des liens et des sessions sont gardées : la base ne permet pas de se
// connecter à la place de quelqu'un. Les données : l'adresse e-mail, la date de création, la dernière
// visite. Le stockage est une base SQLite (`sql.exec(requête, ...valeurs)`, comme celle d'un Durable
// Object de Cloudflare ; tests/test-comptes.mjs en fait une avec node:sqlite).

import { Amis, routeAmis } from './amis.mjs';

export const COMPTES = {
  LIEN_MIN: 15,             // minutes de validité d'un lien
  SESSION_JOURS: 90,        // jours de validité d'une session
  LIENS_PAR_EMAIL: 3,       // liens demandés au plus pour une adresse…
  FENETRE_EMAIL_MIN: 15,    // … en tant de minutes
  LIENS_PAR_IP: 20,         // liens demandés au plus depuis une adresse IP en une heure
  EMAIL_MAX: 254,
};

const MIN = 60 * 1000, JOUR = 24 * 60 * MIN;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const JETON_RE = /^[A-Za-z0-9_-]{40,64}$/;

// Une adresse e-mail rangée (sans espaces, en minuscules), ou null si elle n'en est pas une.
export function normaliserEmail(valeur) {
  const e = String(valeur || '').trim().toLowerCase();
  return e.length <= COMPTES.EMAIL_MAX && EMAIL_RE.test(e) ? e : null;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function empreinte(texte) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(texte))));
}
// Un jeton au hasard (32 octets, en base64url : 43 signes).
export function jetonAuHasard() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function creerTables(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS comptes (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, cree INTEGER NOT NULL, vu INTEGER NOT NULL)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS liens (hash TEXT PRIMARY KEY, email TEXT NOT NULL, ip TEXT, cree INTEGER NOT NULL, expire INTEGER NOT NULL)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, compte TEXT NOT NULL, cree INTEGER NOT NULL, expire INTEGER NOT NULL)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS liens_email ON liens (email, cree)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS sessions_compte ON sessions (compte)`);
  // (E-1 : les mondes en ligne d'un compte, pour les lui lister ; chaque monde garde ses membres lui-même)
  sql.exec(`CREATE TABLE IF NOT EXISTS mondes (compte TEXT NOT NULL, monde TEXT NOT NULL, titre TEXT NOT NULL, role TEXT NOT NULL, cree INTEGER NOT NULL, PRIMARY KEY (compte, monde))`);
}

const lignes = (r) => (r && typeof r.toArray === 'function' ? r.toArray() : Array.isArray(r) ? r : []);
const refus = (statut, erreur) => ({ ok: false, statut, erreur });

export class Registre {
  // `sql` : la base ; `maintenant` : l'heure en ms (les tests la fixent).
  constructor(sql, maintenant = () => Date.now()) {
    this.sql = sql;
    this.maintenant = maintenant;
    creerTables(sql);
    this.amis = new Amis(sql, maintenant);   // (les amis : amis.mjs)
  }

  un(requete, ...valeurs) { return lignes(this.sql.exec(requete, ...valeurs))[0] || null; }
  tous(requete, ...valeurs) { return lignes(this.sql.exec(requete, ...valeurs)); }
  faire(requete, ...valeurs) { lignes(this.sql.exec(requete, ...valeurs)); }

  // Les liens et les sessions expirés : retirés.
  nettoyer() {
    const t = this.maintenant();
    this.faire('DELETE FROM liens WHERE expire < ?', t - JOUR);
    this.faire('DELETE FROM sessions WHERE expire < ?', t);
  }

  // Un lien de connexion pour `email` (demandé depuis `ip`) : { ok, jeton, email } à envoyer, ou un refus.
  async demanderLien(email, ip = '') {
    const e = normaliserEmail(email);
    if (!e) return refus(400, 'Cette adresse e-mail ne semble pas valide.');
    const t = this.maintenant();
    this.nettoyer();
    const parEmail = this.un('SELECT COUNT(*) AS n FROM liens WHERE email = ? AND cree > ?', e, t - COMPTES.FENETRE_EMAIL_MIN * MIN).n;
    if (parEmail >= COMPTES.LIENS_PAR_EMAIL) return refus(429, `Un lien a déjà été envoyé à cette adresse : regarde ta boîte de réception (et les indésirables), ou réessaie dans ${COMPTES.FENETRE_EMAIL_MIN} minutes.`);
    if (ip) {
      const parIp = this.un('SELECT COUNT(*) AS n FROM liens WHERE ip = ? AND cree > ?', ip, t - 60 * MIN).n;
      if (parIp >= COMPTES.LIENS_PAR_IP) return refus(429, 'Trop de demandes depuis cette connexion : réessaie dans une heure.');
    }
    const jeton = jetonAuHasard();
    this.faire('INSERT INTO liens (hash, email, ip, cree, expire) VALUES (?, ?, ?, ?, ?)', await empreinte(jeton), e, ip || null, t, t + COMPTES.LIEN_MIN * MIN);
    return { ok: true, jeton, email: e };
  }

  // Le lien suivi : { ok, session, compte: { id, email, cree } } (le compte créé s'il n'existait pas), ou
  // un refus (lien inconnu, déjà servi, expiré). Un lien ne sert qu'une fois.
  async connecter(jeton) {
    if (!JETON_RE.test(String(jeton || ''))) return refus(400, 'Ce lien de connexion n\'est pas valide.');
    const t = this.maintenant(), h = await empreinte(jeton);
    const lien = this.un('SELECT email, expire FROM liens WHERE hash = ?', h);
    if (!lien) return refus(410, 'Ce lien a déjà servi, ou n\'existe pas : demande-en un nouveau.');
    this.faire('DELETE FROM liens WHERE hash = ?', h);
    if (lien.expire < t) return refus(410, `Ce lien a expiré (il vaut ${COMPTES.LIEN_MIN} minutes) : demande-en un nouveau.`);
    let compte = this.un('SELECT id, email, cree FROM comptes WHERE email = ?', lien.email);
    if (!compte) {
      compte = { id: 'c-' + jetonAuHasard().slice(0, 22), email: lien.email, cree: t };
      this.faire('INSERT INTO comptes (id, email, cree, vu) VALUES (?, ?, ?, ?)', compte.id, compte.email, t, t);
    } else this.faire('UPDATE comptes SET vu = ? WHERE id = ?', t, compte.id);
    const session = jetonAuHasard();
    this.faire('INSERT INTO sessions (hash, compte, cree, expire) VALUES (?, ?, ?, ?)', await empreinte(session), compte.id, t, t + COMPTES.SESSION_JOURS * JOUR);
    return { ok: true, session, compte: { id: compte.id, email: compte.email, cree: compte.cree } };
  }

  // Le compte d'une session valide, ou null.
  async moi(session) {
    if (!JETON_RE.test(String(session || ''))) return null;
    const s = this.un('SELECT compte, expire FROM sessions WHERE hash = ?', await empreinte(session));
    if (!s || s.expire < this.maintenant()) return null;
    return this.un('SELECT id, email, cree FROM comptes WHERE id = ?', s.compte);
  }

  async deconnecter(session) {
    if (!JETON_RE.test(String(session || ''))) return { ok: true };
    this.faire('DELETE FROM sessions WHERE hash = ?', await empreinte(session));
    return { ok: true };
  }

  // E-1 : les mondes d'un compte (le Worker les note à la création d'un monde, plus tard aux invitations).
  ajouterMonde(compte, monde, titre, role) {
    this.faire('INSERT INTO mondes (compte, monde, titre, role, cree) VALUES (?, ?, ?, ?, ?) ON CONFLICT(compte, monde) DO UPDATE SET titre = excluded.titre, role = excluded.role',
      compte, monde, String(titre || 'Ma ferme').slice(0, 40), role, this.maintenant());
  }
  retirerMonde(compte, monde) {
    this.faire('DELETE FROM mondes WHERE compte = ? AND monde = ?', compte, monde);
  }
  mondesDe(compte) {
    return this.tous('SELECT monde, titre, role, cree FROM mondes WHERE compte = ? ORDER BY cree', compte);
  }

  // La console d'administration : combien de comptes, de mondes, d'amis ; qui est en ligne (son prénom, s'il
  // joue à plusieurs) ; jamais d'adresse e-mail.
  statsAdmin() {
    const t = this.maintenant(), n = (q, ...v) => (this.un(q, ...v) || {}).n || 0;
    const enLigne = this.tous('SELECT prenom, niveau, monde, proprio, vu FROM profils WHERE vu > ? ORDER BY vu DESC LIMIT 100', t - 90 * 1000);
    return {
      comptes: n('SELECT COUNT(*) AS n FROM comptes'),
      nouveaux7j: n('SELECT COUNT(*) AS n FROM comptes WHERE cree > ?', t - 7 * JOUR),
      vus7j: n('SELECT COUNT(*) AS n FROM comptes WHERE vu > ?', t - 7 * JOUR),
      sessionsOuvertes: n('SELECT COUNT(*) AS n FROM sessions WHERE expire > ?', t),
      mondes: n('SELECT COUNT(DISTINCT monde) AS n FROM mondes'),
      mondesParRole: this.tous('SELECT role, COUNT(*) AS n FROM mondes GROUP BY role'),
      amities: n('SELECT COUNT(*) AS n FROM amities WHERE etat = \'ami\'') / 2,
      demandes: n('SELECT COUNT(*) AS n FROM amities WHERE etat = \'demande\''),
      profils: n('SELECT COUNT(*) AS n FROM profils'),
      vus24h: n('SELECT COUNT(*) AS n FROM profils WHERE vu > ?', t - JOUR),
      enLigne: enLigne.map((p) => ({ prenom: p.prenom, niveau: p.niveau, aPlusieurs: !!p.monde, proprio: !!p.proprio, vu: p.vu })),
      mondesActifs: new Set(enLigne.filter((p) => p.monde).map((p) => p.monde)).size,
    };
  }

  // Le compte de la session supprimé, avec toutes ses sessions et les liens en attente de son adresse.
  async supprimer(session) {
    const c = await this.moi(session);
    if (!c) return refus(401, 'Connecte-toi d\'abord.');
    this.faire('DELETE FROM sessions WHERE compte = ?', c.id);
    this.faire('DELETE FROM liens WHERE email = ?', c.email);
    this.faire('DELETE FROM mondes WHERE compte = ?', c.id);
    this.amis.oublier(c.id);
    this.faire('DELETE FROM comptes WHERE id = ?', c.id);
    return { ok: true };
  }
}

/* ---------- l'e-mail du lien ---------- */

// Le texte de l'e-mail (sujet, texte, HTML) pour le lien `lien`.
export function emailDuLien(lien) {
  const sujet = 'Ton lien de connexion à Moon Bloom Village';
  const texte = `Bonjour,\n\nPour te connecter à Moon Bloom Village (le jeu en ligne), ouvre ce lien sur l'appareil où tu joues :\n${lien}\n\nIl vaut ${COMPTES.LIEN_MIN} minutes et ne sert qu'une fois. Si tu n'as rien demandé, ignore ce message : sans ce lien, personne ne peut se connecter.\n\nMoon Bloom Village`;
  const html = `<p>Bonjour,</p><p>Pour te connecter à <b>Moon Bloom Village</b> (le jeu en ligne), ouvre ce lien sur l'appareil où tu joues :</p><p><a href="${lien}">Me connecter</a></p><p>Il vaut ${COMPTES.LIEN_MIN} minutes et ne sert qu'une fois. Si tu n'as rien demandé, ignore ce message : sans ce lien, personne ne peut se connecter.</p><p>Moon Bloom Village</p>`;
  return { sujet, texte, html };
}

// Envoie le lien par le service d'e-mails (Resend, son API HTTP : secrets RESEND_API_KEY et
// COMPTE_EXPEDITEUR, l'adresse d'envoi d'un domaine vérifié chez lui). → { ok } ou un refus.
// `envoyer` : la fonction fetch (les tests la remplacent).
export async function envoyerLien(env, email, lien, envoyer = fetch) {
  if (!env || !env.RESEND_API_KEY || !env.COMPTE_EXPEDITEUR) return refus(503, 'Le jeu en ligne n\'est pas encore ouvert : l\'envoi des e-mails n\'est pas configuré.');
  const m = emailDuLien(lien);
  const r = await envoyer('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.COMPTE_EXPEDITEUR, to: [email], subject: m.sujet, text: m.texte, html: m.html }),
  });
  if (!r.ok) {
    console.error(`envoi du lien en échec : ${r.status}`);
    return refus(502, 'L\'e-mail n\'a pas pu partir : réessaie dans un moment.');
  }
  return { ok: true };
}

// L'adresse du jeu où mène le lien : le jeton dans le fragment (#), qui ne part jamais vers le serveur
// des pages (ni dans ses journaux).
export function adresseDuLien(env, jeton) {
  const base = (env && env.JEU_URL) || 'https://moonbloom-village.com/jeu.html';
  return `${base}#connexion=${jeton}`;
}

/* ---------- les routes (le Durable Object Comptes) ---------- */

// Une requête /compte/… → { statut, corps }. `registre` : le Registre ; `env` : les secrets.
export async function routeCompte(request, registre, env, envoyer = fetch) {
  const url = new URL(request.url);
  const chemin = url.pathname.replace(/^\/compte\//, '');
  const auth = request.headers.get('Authorization') || '';
  const session = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const corpsJson = async () => { try { return await request.json(); } catch (e) { return {}; } };
  if (request.method === 'POST' && chemin === 'lien') {
    const b = await corpsJson();
    const r = await registre.demanderLien(b.email, request.headers.get('CF-Connecting-IP') || '');
    if (!r.ok) return { statut: r.statut, corps: { ok: false, erreur: r.erreur } };
    const envoi = await envoyerLien(env, r.email, adresseDuLien(env, r.jeton), envoyer);
    if (!envoi.ok) return { statut: envoi.statut, corps: { ok: false, erreur: envoi.erreur } };
    return { statut: 200, corps: { ok: true } };
  }
  if (request.method === 'POST' && chemin === 'connexion') {
    const b = await corpsJson();
    const r = await registre.connecter(b.jeton);
    return r.ok ? { statut: 200, corps: { ok: true, session: r.session, compte: r.compte } } : { statut: r.statut, corps: { ok: false, erreur: r.erreur } };
  }
  if (request.method === 'GET' && chemin === 'moi') {
    const c = await registre.moi(session);
    return c ? { statut: 200, corps: { ok: true, compte: c } } : { statut: 401, corps: { ok: false, erreur: 'Pas connecté.' } };
  }
  // les amis (amis.mjs) : connecté seulement
  if (chemin === 'amis' || chemin.startsWith('amis/')) {
    const c = await registre.moi(session);
    if (!c) return { statut: 401, corps: { ok: false, erreur: 'Connecte-toi d\'abord (⚙️ Options › Jeu en ligne).' } };
    return routeAmis(chemin, request, registre.amis, c);
  }
  if (request.method === 'POST' && chemin === 'deconnexion') return { statut: 200, corps: await registre.deconnecter(session) };
  if (request.method === 'POST' && chemin === 'supprimer') {
    const r = await registre.supprimer(session);
    return r.ok ? { statut: 200, corps: { ok: true } } : { statut: r.statut, corps: { ok: false, erreur: r.erreur } };
  }
  return { statut: 404, corps: { ok: false, erreur: 'not found' } };
}

// Les demandes internes du Worker (E-1) : /interne/session (le compte d'une session : en-tête
// Authorization), /interne/monde (noter le monde d'un compte), /interne/mondes (les mondes d'un compte).
export async function routeInterne(request, registre) {
  const url = new URL(request.url);
  const corps = async () => { try { return await request.json(); } catch (e) { return {}; } };
  if (url.pathname === '/interne/session') {
    const auth = request.headers.get('Authorization') || '';
    const c = await registre.moi(auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');
    return c ? { statut: 200, corps: { ok: true, compte: c } } : { statut: 401, corps: { ok: false, erreur: 'Connecte-toi d\'abord (⚙️ Options › Jeu en ligne).' } };
  }
  if (url.pathname === '/interne/monde' && request.method === 'POST') {
    const b = await corps();
    registre.ajouterMonde(String(b.compte), String(b.monde), b.titre, String(b.role || 'batisseur'));
    return { statut: 200, corps: { ok: true } };
  }
  if (url.pathname === '/interne/monde-retirer' && request.method === 'POST') {
    const b = await corps();
    registre.retirerMonde(String(b.compte), String(b.monde));
    return { statut: 200, corps: { ok: true } };
  }
  // (l'invitation d'un ami dans un monde : sont-ils amis ? puis le message dans sa boîte)
  if (url.pathname === '/interne/amis-ok' && request.method === 'POST') {
    const b = await corps();
    return { statut: 200, corps: { ok: registre.amis.sontAmis(String(b.de || ''), String(b.pour || '')) } };
  }
  if (url.pathname === '/interne/amis-deposer' && request.method === 'POST') {
    const b = await corps();
    const r = registre.amis.deposer(String(b.de || ''), String(b.pour || ''), String(b.type || ''), { monde: b.monde, code: b.code, titre: b.titre });
    return { statut: r.ok ? 200 : r.statut, corps: r };
  }
  // (la console d'administration : des comptes, jamais d'adresse e-mail)
  if (url.pathname === '/interne/admin') return { statut: 200, corps: { ok: true, ...registre.statsAdmin() } };
  if (url.pathname === '/interne/mondes') return { statut: 200, corps: { ok: true, mondes: registre.mondesDe(url.searchParams.get('compte') || '') } };
  return { statut: 404, corps: { ok: false, erreur: 'not found' } };
}

// Le Durable Object des comptes : une seule instance (« comptes »), sa base SQLite (wrangler.toml :
// new_sqlite_classes). Sans dépendre de cloudflare:workers (les tests le chargent dans Node).
export class Comptes {
  constructor(ctx, env) {
    this.env = env;
    this.registre = new Registre(ctx.storage.sql);
  }

  async fetch(request) {
    // (les demandes du Worker lui-même, jamais celles du jeu : le Worker ne passe ici que /compte/…)
    const url = new URL(request.url);
    if (url.pathname.startsWith('/interne/')) {
      const r = await routeInterne(request, this.registre);
      return new Response(JSON.stringify(r.corps), { status: r.statut, headers: { 'Content-Type': 'application/json' } });
    }
    const r = await routeCompte(request, this.registre, this.env);
    return new Response(JSON.stringify(r.corps), { status: r.statut, headers: { 'Content-Type': 'application/json' } });
  }
}
