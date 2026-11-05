// Le monde partagé (E-1) : un Durable Object par monde, qui fait autorité. Il garde la partie du monde,
// joue les commandes des joueurs avec le même moteur que le jeu (js/engine/, F0-3 : executerCommande),
// les numérote (la révision), les écrit dans un journal et les diffuse aux joueurs connectés, qui les
// rejouent chez eux (le moteur est déterministe : F0-4). Décisions du créateur :
//   F.1 : un coffre commun (l'inventaire de la partie du monde est à tous ses membres) ;
//   F.2 : le temps du monde est figé quand personne n'y joue (rien ne tourne sans joueur) ; les
//         commandes ne font pas avancer l'horloge ; E-5 : la nuit est partagée : quand tous les joueurs
//         connectés sont couchés, le monde joue lui-même la nuit (nuit.partagee, acteur « monde ») ;
//   F.3 : un compte pour jouer en ligne (comptes.mjs) : un membre est un compte ;
//   F.4 : un monde est créé par copie volontaire d'une partie locale, qui reste intacte.
//
// Le stockage (une base SQLite, celle du Durable Object : `sql.exec(requête, ...valeurs)`) :
//   meta(cle, valeur)                 : version du jeu, propriétaire, nom, révision de l'instantané ;
//   instantane(rev, json)             : la partie complète à la révision `rev` (refait toutes les
//                                       INSTANTANE_TOUS révisions) ;
//   journal(rev, id, acteur, cmd, ts) : chaque commande acceptée, dans l'ordre (id unique : un doublon
//                                       n'est jamais rejoué) ;
//   membres(compte, nom, role, revoque).
// La partie en mémoire se refait au réveil du Durable Object : le dernier instantané, puis le journal.
//
// Le protocole (des messages JSON, par une WebSocket) :
//   → { t: 'hello', version, depuis? }            ← { t: 'bienvenue', rev, role, membres } puis
//                                                      { t: 'rattrape', evts } (depuis `depuis`) ou
//                                                      { t: 'instantane', rev, partie }
//                                                   ← { t: 'refus', raison } (version, membre)
//   → { t: 'cmd', id, type, args }                ← { t: 'ack', id, ok, rev?, erreur? }
//                                                   ← à tous : { t: 'evt', rev, acteur, cmd: { id, type, args } }
//   → { t: 'pos', x, y }                          ← aux autres : { t: 'pos', acteur, nom, x, y } (E-4 : où regarde
//                                                   chaque joueur ; relayé, jamais écrit ; POS_MS au plus souvent)
//                                                   ← aux autres, à son départ : { t: 'parti', acteur }
//   → { t: 'coucher', oui }                       ← à tous : { t: 'couches', comptes, connectes } (E-5 : qui est
//                                                   couché ; gardé sur sa connexion, jamais écrit) ; tous
//                                                   couchés : à tous, { t: 'evt', acteur: 'monde', cmd: nuit.partagee }

import { COMMANDES, executerCommande, farmTerrain, GAME_VERSION, migrate, pickUpAll, ramasserMorceau, refusDuRole } from '../../js/engine/index.js';

export const MONDE = {
  INSTANTANE_TOUS: 20,      // révisions entre deux instantanés
  JOURNAL_GARDE: 500,       // révisions gardées dans le journal avant le dernier instantané (le rattrapage)
  COMMANDES_PAR_MINUTE: 120,// commandes acceptées au plus par membre et par minute
  NOM_MAX: 40,
  POS_MS: 150,              // E-4 : une position relayée au plus toutes les POS_MS ms par joueur (≈ 5 par seconde)
  POS_MAX: 1e6,             // px : une position au-delà est ignorée
  INVITATION_JOURS: 7,      // E-3 : un lien d'invitation vaut tant de jours, et ne sert qu'une fois
  INVITATIONS_MAX: 20,      // liens en attente au plus par monde
};

// Les commandes que le monde partagé accepte d'un joueur. La nuit ne se demande pas : le monde la joue
// quand tous sont couchés (E-5 : nuit.partagee) ; nuit.dormir (la nuit qui défile, en solo) n'a pas cours.
export const COMMANDES_MONDE = new Set(Object.keys(COMMANDES).filter((t) => t !== 'nuit.dormir' && t !== 'nuit.partagee'));
export const ACTEUR_MONDE = 'monde';

// E-5 : les lits. `sockets` : [{ compte, couche }] (les connexions des membres) → qui est là, qui est
// couché (un compte l'est si l'une de ses connexions l'est) et si la nuit vient (tous couchés).
export function etatDesLits(sockets) {
  const connectes = new Set(), couches = new Set();
  for (const s of sockets) { connectes.add(s.compte); if (s.couche) couches.add(s.compte); }
  return { connectes: connectes.size, couches: [...couches], nuit: connectes.size > 0 && couches.size === connectes.size };
}
// Les rôles (E-11 : js/engine/roles.js dit ce que chacun peut faire) : le propriétaire, et ceux qu'il
// invite ou dont il change le rôle : bâtisseur, ami jardinier, visiteur.
export const ROLES = { proprietaire: 'proprietaire', batisseur: 'batisseur', jardinier: 'jardinier', visiteur: 'visiteur' };
export const ROLES_INVITES = ['batisseur', 'jardinier', 'visiteur'];
// E-12 : les sauvegardes du monde dans R2 (le bucket du Worker, sous mondes/<id du Durable Object>/) :
// une après chaque nuit partagée, et à la demande du propriétaire ; les GARDER dernières sont gardées.
export const SAUVEGARDES = { GARDER: 14 };
const RESTAURER = 'monde.restaurer';   // (la marque d'une restauration dans le journal : jamais rejouée)
export const JOURNAL_PAGE = 50;

const lignes = (r) => (r && typeof r.toArray === 'function' ? r.toArray() : Array.isArray(r) ? r : []);
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export function creerTablesMonde(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS instantane (rev INTEGER PRIMARY KEY, json TEXT NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS journal (rev INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, acteur TEXT NOT NULL, cmd TEXT NOT NULL, ts INTEGER NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS membres (compte TEXT PRIMARY KEY, nom TEXT NOT NULL, role TEXT NOT NULL, revoque INTEGER NOT NULL DEFAULT 0)');
  // (E-3 : les invitations : l'empreinte du secret, sa date, sa fin, qui l'a utilisée)
  sql.exec('CREATE TABLE IF NOT EXISTS invitations (hash TEXT PRIMARY KEY, cree INTEGER NOT NULL, expire INTEGER NOT NULL, par TEXT)');
  // (E-11 : le rôle que donne une invitation ; une base d'avant l'a sans cette colonne)
  // (ajoutée une fois : sur une base qui l'a déjà, SQLite refuse, et c'est bien)
  try { lignes(sql.exec('ALTER TABLE invitations ADD COLUMN role TEXT')); } catch (e) { /* (déjà là) */ }
}

// E-3 : un secret d'invitation au hasard (24 octets : 192 bits, en base64url) et son empreinte.
export function secretAuHasard() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function empreinteSecret(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const SECRET_RE = /^[A-Za-z0-9_-]{32}$/;

// E-8 : le monde partagé est la ferme (docs/monde-partage.md, M.2) : la copie perd le grand monde (les
// habitants et les hameaux, les régions vues et ce qu'on y a pris ; la partie solo les garde), la
// migration lui redonne des valeurs neuves, et `mondePartage` dit au moteur que sa nuit ne fait que la
// ferme (M.3). Le personnage, s'il était dehors, revient sur la ferme.
export const GRAND_MONDE = ['habitants', 'hameaux', 'vues', 'vu', 'pris'];
export function elaguer(s) {
  const m = s.monde && typeof s.monde === 'object' ? s.monde : {};
  for (const k of GRAND_MONDE) delete m[k];
  delete s.voisins;   // (V-3 : les liens entre les habitants des hameaux, eux aussi au grand monde)
  delete s.fetes;     // (V-4 : les fêtes des hameaux)
  delete s.secrets;   // (D-2 : les secrets du monde, hors de la ferme)
  m.but = null;
  const t = migrate({ v: s.version, t: 0, s });
  t.mondePartage = true;
  if (t.monde && Number.isInteger(t.monde.ici) && !dansLaFerme(t, t.monde.ici)) t.monde.ici = null;
  return t;
}

// La case `c` est-elle dans le rectangle de la ferme ?
export function dansLaFerme(s, c) {
  const T = farmTerrain(s), F = T && T.FERME;
  if (!F) return true;
  const x = c % T.LARGEUR, y = Math.floor(c / T.LARGEUR);
  return x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR;
}
// Une commande qui vise une case hors de la ferme : M.1, le contrôle du monde. Ses arguments case, de,
// vers (une case) ; E-9 : arbre, rocher (« col,rang ») ; touffe, touffes (« x,y » en px) ; eau (celles du
// grand monde : lac, rivière, mer).
const CASES = ['case', 'de', 'vers'];
const EAUX_DU_MONDE = new Set(['lac', 'riviere', 'mer']);
const PX = 16;
export function horsDeLaFerme(s, args) {
  if (!args) return false;
  if (CASES.some((k) => Number.isInteger(args[k]) && !dansLaFerme(s, args[k]))) return true;
  const W = farmTerrain(s).LARGEUR;
  const tuile = (v) => { const [c, r] = String(v).split(',').map(Number); return r * W + c; };
  const pixel = (v) => { const [x, y] = String(v).split(',').map(Number); return Math.floor((y - 1) / PX) * W + Math.floor(x / PX); };
  for (const k of ['arbre', 'rocher']) if (typeof args[k] === 'string' && /^\d+,\d+$/.test(args[k]) && !dansLaFerme(s, tuile(args[k]))) return true;
  // (E-13 : une cueillette, « sorte:case »)
  if (typeof args.cueillette === 'string' && /:\d+$/.test(args.cueillette) && !dansLaFerme(s, Number(args.cueillette.split(':').pop()))) return true;
  const touffes = [].concat(args.touffe || [], args.touffes || []);
  if (touffes.some((t) => /^\d+,\d+$/.test(String(t)) && !dansLaFerme(s, pixel(t)))) return true;
  return EAUX_DU_MONDE.has(args.eau);
}

// E-12 : les sauvegardes d'un monde, dans un bucket R2 (`bucket` : put, get, list, delete), sous `prefixe`.
// Une clé : <prefixe><ms, sur 15 chiffres>-<rev>.json (l'ordre des clés est celui du temps).
export class SauvegardesMonde {
  constructor(bucket, prefixe) {
    this.bucket = bucket;
    this.prefixe = prefixe;
  }

  // La partie `partie` (révision `rev`, jour `jour`), sauvée ; les plus anciennes au-delà de GARDER, retirées.
  async sauver(partie, { rev, jour, raison, t }) {
    const cle = `${this.prefixe}${String(Math.floor(t)).padStart(15, '0')}-${rev}.json`;
    const meta = { rev: String(rev), jour: String(jour), raison: String(raison), t: String(Math.floor(t)) };
    await this.bucket.put(cle, JSON.stringify({ v: GAME_VERSION, rev, jour, raison, t, s: partie }), { httpMetadata: { contentType: 'application/json' }, customMetadata: meta });
    const toutes = await this.liste();
    for (const x of toutes.slice(SAUVEGARDES.GARDER)) await this.bucket.delete(x.cle);
    return { cle, rev, jour, raison, t };
  }

  // Les sauvegardes, de la plus récente à la plus ancienne : [{ cle, rev, jour, raison, t, taille }].
  async liste() {
    const out = [];
    let cursor;
    do {
      const page = await this.bucket.list({ prefix: this.prefixe, cursor, include: ['customMetadata'] });
      for (const o of page.objects || []) {
        const m = o.customMetadata || {};
        out.push({ cle: o.key, rev: Number(m.rev) || 0, jour: Number(m.jour) || 0, raison: m.raison || '', t: Number(m.t) || 0, taille: o.size || 0 });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return out.sort((a, b) => (a.cle < b.cle ? 1 : a.cle > b.cle ? -1 : 0));
  }

  // La sauvegarde `cle` (de ce monde seulement), ou null.
  async lire(cle) {
    if (typeof cle !== 'string' || !cle.startsWith(this.prefixe) || !/^[0-9]{15}-[0-9]+\.json$/.test(cle.slice(this.prefixe.length))) return null;
    const o = await this.bucket.get(cle);
    if (!o) return null;
    try { return JSON.parse(await o.text()); } catch (e) { return null; }
  }
}

export class MondeRegistre {
  constructor(sql, maintenant = () => Date.now()) {
    this.sql = sql;
    this.maintenant = maintenant;
    this.partie = null;      // la partie en mémoire (refaite à la demande : charger)
    this.rev = 0;
    this.debits = new Map(); // compte → [heures des dernières commandes]
    this.positions = new Map(); // E-4 : compte → l'heure de sa dernière position relayée (rien n'est écrit)
    creerTablesMonde(sql);
  }

  un(q, ...v) { return lignes(this.sql.exec(q, ...v))[0] || null; }
  tous(q, ...v) { return lignes(this.sql.exec(q, ...v)); }
  faire(q, ...v) { lignes(this.sql.exec(q, ...v)); }
  meta(cle) { const r = this.un('SELECT valeur FROM meta WHERE cle = ?', cle); return r ? r.valeur : null; }
  poserMeta(cle, valeur) { this.faire('INSERT INTO meta (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur', cle, String(valeur)); }

  existe() { return this.meta('version') !== null; }

  // F.4 : le monde naît de la copie d'une partie locale (`sauvegarde` : { v, t, s } comme le jeu l'exporte,
  // ou la partie seule), au nom de son propriétaire.
  creer({ proprietaire, nom = 'Propriétaire', partie, version = GAME_VERSION, titre = 'Ma ferme' }) {
    if (this.existe()) return { ok: false, erreur: 'Ce monde existe déjà.' };
    if (!proprietaire) return { ok: false, erreur: 'Un monde a un propriétaire.' };
    let s;
    try { s = migrate(partie && partie.s ? partie : { v: partie && partie.version, t: 0, s: partie }); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !s.carte) return { ok: false, erreur: 'Cette partie ne peut pas être mise en ligne (illisible).' };
    // (le monde ne connaît pas de nuit en cours : il naît de jour, son horloge figée là où elle était)
    s.nuitEnCours = null;
    // (E-6 : le monde ne ramasse pas, il n'a pas de personnage à lui : ce qui attendait entre au coffre
    // commun, et désormais tout y va droit : les œufs, le lait, la laine, la récolte)
    pickUpAll(s);
    for (const m of [...(s.morceaux || [])]) ramasserMorceau(s, m.n);   // (E-9 : les morceaux au sol aussi)
    s.ramassage = false;
    s = elaguer(s);
    this.faire('INSERT INTO instantane (rev, json) VALUES (?, ?)', 0, JSON.stringify(s));
    this.poserMeta('version', version);
    this.poserMeta('proprietaire', proprietaire);
    this.poserMeta('titre', String(titre).slice(0, MONDE.NOM_MAX));
    this.poserMeta('cree', this.maintenant());
    this.ajouterMembre(proprietaire, nom, ROLES.proprietaire);
    this.partie = s;
    this.rev = 0;
    return { ok: true, rev: 0 };
  }

  // La partie en mémoire : le dernier instantané, puis les commandes du journal jouées depuis.
  charger() {
    if (this.partie) return this.partie;
    const inst = this.un('SELECT rev, json FROM instantane ORDER BY rev DESC LIMIT 1');
    if (!inst) return null;
    const s = JSON.parse(inst.json);
    let rev = inst.rev;
    for (const e of this.tous('SELECT rev, cmd FROM journal WHERE rev > ? ORDER BY rev', inst.rev)) {
      const c = JSON.parse(e.cmd);
      if (c.type === RESTAURER) { rev = e.rev; continue; }   // (E-12 : une marque, pas une commande)
      const r = executerCommande(s, c);
      if (!r.ok) throw new Error(`le journal ne se rejoue pas à la révision ${e.rev} : ${r.error}`);
      rev = e.rev;
    }
    this.partie = s;
    this.rev = rev;
    return s;
  }

  ajouterMembre(compte, nom, role = ROLES.batisseur) {
    if (!ROLES[role]) return { ok: false, erreur: 'Rôle inconnu.' };
    this.faire('INSERT INTO membres (compte, nom, role, revoque) VALUES (?, ?, ?, 0) ON CONFLICT(compte) DO UPDATE SET nom = excluded.nom, role = excluded.role, revoque = 0',
      compte, String(nom || 'Joueur').slice(0, MONDE.NOM_MAX), role);
    return { ok: true };
  }
  revoquer(compte) {
    if (compte === this.meta('proprietaire')) return { ok: false, erreur: 'Le propriétaire ne se révoque pas.' };
    this.faire('UPDATE membres SET revoque = 1 WHERE compte = ?', compte);
    return { ok: true };
  }
  // Le membre `compte` (actif), ou null.
  membre(compte) {
    const m = this.un('SELECT compte, nom, role, revoque FROM membres WHERE compte = ?', String(compte || ''));
    return m && !m.revoque ? m : null;
  }
  membres() { return this.tous('SELECT compte, nom, role FROM membres WHERE revoque = 0 ORDER BY role DESC, nom'); }

  // L'accueil d'un joueur : refusé si ce n'est pas un membre, ou si son jeu n'a pas la version du monde ;
  // sinon ce qui lui manque depuis la révision `depuis` (les commandes du journal), ou tout (l'instantané
  // de la partie à la révision courante).
  accueil(compte, { version, depuis } = {}) {
    const m = this.membre(compte);
    if (!m) return { ok: false, raison: 'membre', erreur: 'Tu n\'es pas (ou plus) membre de ce monde.' };
    const v = this.meta('version');
    if (version !== v) return { ok: false, raison: 'version', erreur: `Ce monde joue la version ${v} du jeu ; la tienne est ${version || 'inconnue'} : recharge la page pour mettre le jeu à jour.` };
    const s = this.charger();
    const base = { ok: true, rev: this.rev, role: m.role, titre: this.meta('titre'), proprietaire: this.meta('proprietaire'), membres: this.membres() };
    const d = Number(depuis);
    if (Number.isInteger(d) && d >= 0 && d <= this.rev) {
      const plusVieux = this.un('SELECT MIN(rev) AS r FROM journal');
      if (d === this.rev) return { ...base, evts: [] };
      // (E-12 : une restauration depuis : la partie entière)
      const restauree = this.un('SELECT rev FROM journal WHERE rev > ? AND cmd LIKE ?', d, `%"${RESTAURER}"%`);
      if (plusVieux && plusVieux.r !== null && plusVieux.r <= d + 1 && !restauree) {
        const evts = this.tous('SELECT rev, acteur, cmd FROM journal WHERE rev > ? ORDER BY rev', d).map((e) => ({ rev: e.rev, acteur: e.acteur, cmd: JSON.parse(e.cmd) }));
        return { ...base, evts };
      }
    }
    return { ...base, partie: JSON.parse(JSON.stringify(s)) };
  }

  // Une commande d'un membre : { ok, rev, evt } (à diffuser), ou { ok: false, erreur }. Un doublon (le même
  // id, déjà joué) rend le même accusé sans rien rejouer : { ok, rev, doublon: true }.
  commande(compte, c) {
    const m = this.membre(compte);
    if (!m) return { ok: false, erreur: 'Tu n\'es pas (ou plus) membre de ce monde.' };
    if (!c || typeof c !== 'object' || !ID_RE.test(String(c.id || ''))) return { ok: false, erreur: 'Commande sans identifiant.' };
    const deja = this.un('SELECT rev, acteur FROM journal WHERE id = ?', c.id);
    if (deja) return deja.acteur === compte ? { ok: true, rev: deja.rev, doublon: true } : { ok: false, erreur: 'Cet identifiant de commande est déjà pris.' };
    if (!COMMANDES_MONDE.has(c.type)) return { ok: false, erreur: `Cette action ne se joue pas encore en ligne (${String(c.type)}).` };
    // (E-11 : le rôle du membre le permet-il ?)
    const refus = refusDuRole(m.role, this.charger(), c);
    if (refus) return { ok: false, erreur: refus };
    // (le débit : COMMANDES_PAR_MINUTE au plus par membre)
    const t = this.maintenant(), L = (this.debits.get(compte) || []).filter((x) => x > t - 60000);
    if (L.length >= MONDE.COMMANDES_PAR_MINUTE) return { ok: false, erreur: 'Trop d\'actions d\'un coup : attends un instant.' };
    L.push(t);
    this.debits.set(compte, L);
    // (E-8 : le monde est la ferme : rien hors d'elle)
    if (horsDeLaFerme(this.charger(), c.args)) return { ok: false, erreur: 'Hors de la ferme : en ligne, le monde partagé, c\'est la ferme.' };
    return this.jouer(compte, { id: c.id, type: c.type, args: c.args }, t);
  }

  // E-5 : la nuit partagée (tous les joueurs connectés sont couchés), jouée par le monde lui-même.
  nuit() {
    const t = this.maintenant();
    return this.jouer(ACTEUR_MONDE, { id: `nuit-${this.rev + 1}-${t.toString(36)}`, type: 'nuit.partagee', args: {} }, t);
  }

  // Joue la commande `cmd` au nom d'`acteur` ; acceptée, elle prend la révision suivante et va au journal.
  jouer(acteur, cmd, t) {
    const s = this.charger();
    const r = executerCommande(s, cmd);
    if (!r.ok) return { ok: false, erreur: r.error || 'Refusé.' };
    this.rev += 1;
    this.faire('INSERT INTO journal (rev, id, acteur, cmd, ts) VALUES (?, ?, ?, ?, ?)', this.rev, cmd.id, acteur, JSON.stringify(cmd), t);
    if (this.rev % MONDE.INSTANTANE_TOUS === 0) this.instantane();
    return { ok: true, rev: this.rev, evt: { t: 'evt', rev: this.rev, acteur, cmd } };
  }

  // Un instantané de la partie à la révision courante ; le journal plus ancien que JOURNAL_GARDE
  // révisions avant lui, et les instantanés d'avant, retirés.
  instantane() {
    const s = this.charger();
    this.faire('INSERT OR REPLACE INTO instantane (rev, json) VALUES (?, ?)', this.rev, JSON.stringify(s));
    this.faire('DELETE FROM instantane WHERE rev < ?', this.rev);
    this.faire('DELETE FROM journal WHERE rev <= ?', this.rev - MONDE.JOURNAL_GARDE);
  }

  /* -- E-3 : inviter, rejoindre -- */

  // Un lien d'invitation, créé par le propriétaire (`role` : celui qu'il donnera, E-11) : { ok, secret, expire }.
  async inviter(compte, role = ROLES.batisseur) {
    if (compte !== this.meta('proprietaire')) return { ok: false, statut: 403, erreur: 'Seul le propriétaire du monde invite.' };
    if (!ROLES_INVITES.includes(role)) return { ok: false, statut: 400, erreur: 'Rôle inconnu.' };
    const t = this.maintenant();
    this.faire('DELETE FROM invitations WHERE expire < ? OR par IS NOT NULL', t);
    if (this.un('SELECT COUNT(*) AS n FROM invitations').n >= MONDE.INVITATIONS_MAX) return { ok: false, statut: 429, erreur: 'Trop de liens d\'invitation en attente : attends qu\'ils servent ou expirent.' };
    const secret = secretAuHasard(), expire = t + MONDE.INVITATION_JOURS * 24 * 3600 * 1000;
    this.faire('INSERT INTO invitations (hash, cree, expire, par, role) VALUES (?, ?, ?, NULL, ?)', await empreinteSecret(secret), t, expire, role);
    return { ok: true, secret, expire };
  }

  // Le lien suivi par `compte` (`nom` : son nom affiché) : il devient bâtisseur. Un lien expiré, ou déjà
  // utilisé par un autre, est refusé ; un membre qui le suit de nouveau reste membre.
  async rejoindre(compte, nom, secret) {
    if (!SECRET_RE.test(String(secret || ''))) return { ok: false, statut: 400, erreur: 'Ce lien d\'invitation n\'est pas valide.' };
    const deja = this.membre(compte);
    if (deja) return { ok: true, role: deja.role, titre: this.meta('titre'), deja: true };
    const h = await empreinteSecret(secret), inv = this.un('SELECT expire, par, role FROM invitations WHERE hash = ?', h);
    if (!inv) return { ok: false, statut: 410, erreur: 'Ce lien d\'invitation n\'existe pas (ou plus).' };
    if (inv.par && inv.par !== compte) return { ok: false, statut: 410, erreur: 'Ce lien d\'invitation a déjà servi : demande-en un autre.' };
    if (inv.expire < this.maintenant()) return { ok: false, statut: 410, erreur: 'Ce lien d\'invitation a expiré : demande-en un autre.' };
    const ancien = this.un('SELECT revoque FROM membres WHERE compte = ?', compte);
    if (ancien && ancien.revoque) return { ok: false, statut: 403, erreur: 'Le propriétaire t\'a retiré de ce monde.' };
    this.faire('UPDATE invitations SET par = ? WHERE hash = ?', compte, h);
    const role = ROLES_INVITES.includes(inv.role) ? inv.role : ROLES.batisseur;
    this.ajouterMembre(compte, nom, role);
    return { ok: true, role, titre: this.meta('titre') };
  }

  // E-12 : la partie de la sauvegarde `save` ({ v, rev, jour, s }) remplace celle du monde, par le propriétaire
  // `par` : une révision de plus, marquée au journal (qui garde l'histoire d'avant), et un instantané.
  restaurer(par, save) {
    if (par !== this.meta('proprietaire')) return { ok: false, statut: 403, erreur: 'Seul le propriétaire du monde restaure une sauvegarde.' };
    let s;
    try { s = migrate({ v: save && save.v, t: 0, s: JSON.parse(JSON.stringify(save.s)) }); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !s.carte) return { ok: false, statut: 400, erreur: 'Cette sauvegarde est illisible.' };
    s.mondePartage = true;
    s.ramassage = false;
    s.nuitEnCours = null;
    this.charger();
    this.partie = s;
    this.rev += 1;
    const t = this.maintenant();
    const marque = { id: `restaure-${this.rev}-${t.toString(36)}`, type: RESTAURER, args: { rev: save.rev, jour: save.jour } };
    this.faire('INSERT INTO journal (rev, id, acteur, cmd, ts) VALUES (?, ?, ?, ?, ?)', this.rev, marque.id, par, JSON.stringify(marque), t);
    this.instantane();
    return { ok: true, rev: this.rev, jour: s.day };
  }

  // E-11 : le propriétaire change le rôle d'un membre (pas le sien).
  changerRole(par, compte, role) {
    if (par !== this.meta('proprietaire')) return { ok: false, statut: 403, erreur: 'Seul le propriétaire du monde change les rôles.' };
    if (!ROLES_INVITES.includes(role)) return { ok: false, statut: 400, erreur: 'Rôle inconnu.' };
    const m = this.membre(compte);
    if (!m) return { ok: false, statut: 404, erreur: 'Ce joueur n\'est pas membre du monde.' };
    if (m.role === ROLES.proprietaire) return { ok: false, statut: 400, erreur: 'Le propriétaire garde son rôle.' };
    this.faire('UPDATE membres SET role = ? WHERE compte = ?', role, compte);
    return { ok: true, role, titre: this.meta('titre') };
  }

  // E-11 : le journal, pour le propriétaire : les JOURNAL_PAGE dernières commandes avant la révision `avant`
  // (toutes : sans elle), du plus récent au plus ancien : { rev, acteur, nom, type, ts }.
  journal(par, avant = null) {
    if (par !== this.meta('proprietaire')) return { ok: false, statut: 403, erreur: 'Seul le propriétaire du monde lit son journal.' };
    const a = Number(avant), borne = Number.isInteger(a) && a > 0 ? a : Number.MAX_SAFE_INTEGER;
    const noms = Object.fromEntries(this.tous('SELECT compte, nom FROM membres').map((m) => [m.compte, m.nom]));
    const evts = this.tous('SELECT rev, acteur, cmd, ts FROM journal WHERE rev < ? ORDER BY rev DESC LIMIT ?', borne, JOURNAL_PAGE).map((e) => {
      let type = '';
      try { type = JSON.parse(e.cmd).type || ''; } catch (x) { type = ''; }
      return { rev: e.rev, acteur: e.acteur, nom: e.acteur === ACTEUR_MONDE ? 'Le monde' : noms[e.acteur] || 'Un ancien membre', type, ts: e.ts };
    });
    return { ok: true, evts };
  }

  // Le propriétaire retire un membre (`compte`) ; les liens en attente sont annulés aussi.
  retirer(par, compte) {
    if (par !== this.meta('proprietaire')) return { ok: false, statut: 403, erreur: 'Seul le propriétaire du monde retire un membre.' };
    const r = this.revoquer(compte);
    return r.ok ? { ok: true } : { ...r, statut: 400 };
  }

  // Ce que le monde montre de lui (la liste des mondes d'un compte, la fiche) : sans la partie.
  fiche() {
    return { titre: this.meta('titre'), proprietaire: this.meta('proprietaire'), version: this.meta('version'), rev: this.charger() ? this.rev : 0, membres: this.membres() };
  }
}

/* ---------- le Durable Object Monde ---------- */

// Les requêtes qu'il reçoit (du Worker, qui a vérifié la session : l'en-tête X-Compte et X-Nom) :
//   POST /monde/creer { partie, titre }         : créer ce monde (F.4 : la copie d'une partie)
//   GET  /monde/fiche                           : sa fiche (membre seulement)
//   GET  /monde/ws (Upgrade: websocket)         : la connexion d'un joueur (le protocole, en tête)
// Les WebSockets sont acceptées en hibernation : le Durable Object peut dormir entre deux messages,
// et sa partie en mémoire se refait au réveil (MondeRegistre.charger).
export class Monde {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.registre = new MondeRegistre(ctx.storage.sql);
  }

  // E-12 : les sauvegardes de ce monde (null : pas de bucket R2 lié).
  sauvegardes() {
    if (!this.env || !this.env.SESSIONS) return null;
    const id = this.ctx.id && this.ctx.id.toString ? this.ctx.id.toString() : 'local';
    return new SauvegardesMonde(this.env.SESSIONS, `mondes/${id}/`);
  }
  async sauvegarder(raison) {
    const S = this.sauvegardes();
    if (!S || !this.registre.existe()) return null;
    const s = this.registre.charger();
    return S.sauver(s, { rev: this.registre.rev, jour: s.day, raison, t: this.registre.maintenant() });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const compte = request.headers.get('X-Compte') || '';
    const nom = request.headers.get('X-Nom') || 'Joueur';
    const json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname.endsWith('/creer') && request.method === 'POST') {
      let b = {};
      try { b = await request.json(); } catch (e) { b = {}; }
      const r = this.registre.creer({ proprietaire: compte, nom, partie: b.partie, titre: b.titre });
      return json(r, r.ok ? 200 : 400);
    }
    if (url.pathname.endsWith('/inviter') && request.method === 'POST') {
      if (!this.registre.existe()) return json({ ok: false, erreur: 'Monde inconnu.' }, 404);
      let b = {};
      try { b = await request.json(); } catch (e) { b = {}; }
      const r = await this.registre.inviter(compte, b.role || ROLES.batisseur);
      return json(r, r.ok ? 200 : r.statut);
    }
    if (url.pathname.endsWith('/rejoindre') && request.method === 'POST') {
      if (!this.registre.existe()) return json({ ok: false, erreur: 'Ce monde n\'existe pas (ou plus).' }, 404);
      let b = {};
      try { b = await request.json(); } catch (e) { b = {}; }
      const r = await this.registre.rejoindre(compte, nom, b.secret);
      if (r.ok && !r.deja) this.diffuser({ t: 'membres', membres: this.registre.membres() });
      return json(r, r.ok ? 200 : r.statut);
    }
    if (url.pathname.endsWith('/retirer') && request.method === 'POST') {
      let b = {};
      try { b = await request.json(); } catch (e) { b = {}; }
      const r = this.registre.retirer(compte, String(b.compte || ''));
      // (la nouvelle liste des membres diffusée ; la connexion ouverte du retiré, fermée tout de suite par
      // la diffusion : elle ferme celle de qui n'est plus membre)
      if (r.ok) this.diffuser({ t: 'membres', membres: this.registre.membres() });
      return json(r, r.ok ? 200 : r.statut);
    }
    if (url.pathname.endsWith('/role') && request.method === 'POST') {
      let b = {};
      try { b = await request.json(); } catch (e) { b = {}; }
      const r = this.registre.changerRole(compte, String(b.compte || ''), String(b.role || ''));
      // (la nouvelle liste des membres, rôles compris, à tous : le jeu de chacun s'y règle)
      if (r.ok) this.diffuser({ t: 'membres', membres: this.registre.membres() });
      return json(r, r.ok ? 200 : r.statut);
    }
    if (url.pathname.endsWith('/journal')) {
      const r = this.registre.journal(compte, url.searchParams.get('avant'));
      return json(r, r.ok ? 200 : r.statut);
    }
    // E-12 : les sauvegardes (le propriétaire) : les lister, en faire une, en restaurer une
    if (url.pathname.endsWith('/sauvegardes') || url.pathname.endsWith('/restaurer')) {
      if (compte !== this.registre.meta('proprietaire')) return json({ ok: false, erreur: 'Seul le propriétaire du monde gère ses sauvegardes.' }, 403);
      const S = this.sauvegardes();
      if (!S) return json({ ok: false, erreur: 'Les sauvegardes ne sont pas disponibles ici.' }, 503);
      if (url.pathname.endsWith('/sauvegardes') && request.method === 'GET') return json({ ok: true, sauvegardes: await S.liste() });
      if (url.pathname.endsWith('/sauvegardes') && request.method === 'POST') return json({ ok: true, sauvegarde: await this.sauvegarder('main') });
      if (url.pathname.endsWith('/restaurer') && request.method === 'POST') {
        let b = {};
        try { b = await request.json(); } catch (e) { b = {}; }
        const save = await S.lire(String(b.cle || ''));
        if (!save) return json({ ok: false, erreur: 'Cette sauvegarde n\'existe pas (ou plus).' }, 404);
        // (la partie d'avant, sauvée elle aussi : une restauration se défait)
        await this.sauvegarder('avant-restauration');
        const r = this.registre.restaurer(compte, save);
        if (!r.ok) return json(r, r.statut);
        // (chacun reçoit la partie restaurée, et le mot qui le dit)
        this.diffuser({ t: 'instantane', rev: r.rev, partie: this.registre.charger() });
        this.diffuser({ t: 'restaure', rev: r.rev, jour: r.jour });
        return json({ ok: true, rev: r.rev, jour: r.jour });
      }
    }
    if (url.pathname.endsWith('/fiche')) {
      if (!this.registre.existe()) return json({ ok: false, erreur: 'Monde inconnu.' }, 404);
      if (!this.registre.membre(compte)) return json({ ok: false, erreur: 'Tu n\'es pas membre de ce monde.' }, 403);
      return json({ ok: true, ...this.registre.fiche() });
    }
    if (url.pathname.endsWith('/ws')) {
      if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false, erreur: 'WebSocket attendue.' }, 426);
      if (!this.registre.existe()) return json({ ok: false, erreur: 'Monde inconnu.' }, 404);
      if (!this.registre.membre(compte)) return json({ ok: false, erreur: 'Tu n\'es pas membre de ce monde.' }, 403);
      const paire = new WebSocketPair();
      this.ctx.acceptWebSocket(paire[1], [compte]);
      return new Response(null, { status: 101, webSocket: paire[0] });
    }
    return json({ ok: false, erreur: 'not found' }, 404);
  }

  async webSocketMessage(ws, message) {
    const compte = (this.ctx.getTags(ws) || [])[0] || '';
    traiterMessage(this.registre, compte, message, (m) => envoyer(ws, m), (m) => this.diffuser(m), (m) => this.diffuser(m, compte), {
      coucher: (oui) => { attacher(ws, { couche: !!oui }); this.lits(); },
      accueilli: () => this.lits(),
    });
  }

  async webSocketClose(ws, code) {
    const compte = (this.ctx.getTags(ws) || [])[0] || '';
    try { ws.close(code === 1005 ? 1000 : code, 'au revoir'); } catch (e) { /* (déjà fermée) */ }
    // (E-4 : son dernier onglet fermé, son avatar s'en va chez les autres)
    if (!this.ctx.getWebSockets(compte).some((w) => w !== ws)) this.diffuser({ t: 'parti', acteur: compte }, compte);
    // (E-5 : celui qui part ne retient plus la nuit)
    this.lits(ws);
  }

  // E-5 : qui est couché, dit à tous ; tous couchés, la nuit passe (et chacun se relève). `sauf` : une
  // connexion qui se ferme.
  lits(sauf = null) {
    const ws = this.ctx.getWebSockets().filter((w) => w !== sauf && this.registre.membre((this.ctx.getTags(w) || [])[0]));
    const e = etatDesLits(ws.map((w) => ({ compte: (this.ctx.getTags(w) || [])[0], couche: !!(lireAttache(w) || {}).couche })));
    if (e.nuit) {
      for (const w of ws) attacher(w, { couche: false });
      const r = this.registre.nuit();
      if (r.ok) {
        this.diffuser(r.evt);
        // (E-12 : une sauvegarde après chaque nuit ; elle ne retient pas la nuit)
        const p = this.sauvegarder('nuit').catch(() => null);
        if (this.ctx.waitUntil) this.ctx.waitUntil(p);
      }
      else this.diffuser({ t: 'erreur', erreur: `La nuit n'a pas pu passer : ${r.erreur}` });
      this.diffuser({ t: 'couches', comptes: [], connectes: e.connectes });
      return;
    }
    this.diffuser({ t: 'couches', comptes: e.couches, connectes: e.connectes });
  }

  // Un message à tous les membres connectés (`sauf` : pas à ce compte-là).
  diffuser(m, sauf = null) {
    for (const ws of this.ctx.getWebSockets()) {
      const compte = (this.ctx.getTags(ws) || [])[0];
      if (sauf && compte === sauf) continue;
      // (un membre révoqué entre-temps : sa connexion est fermée)
      if (!this.registre.membre(compte)) { try { ws.close(4003, 'plus membre'); } catch (e) { /* (rien) */ } continue; }
      envoyer(ws, m);
    }
  }
}

function envoyer(ws, m) {
  try { ws.send(JSON.stringify(m)); } catch (e) { /* (connexion perdue) */ }
}
// (E-5 : ce qu'une connexion garde d'elle, qui survit à l'hibernation du Durable Object)
function lireAttache(ws) {
  try { return ws.deserializeAttachment ? ws.deserializeAttachment() : null; } catch (e) { return null; }
}
function attacher(ws, a) {
  try { if (ws.serializeAttachment) ws.serializeAttachment({ ...(lireAttache(ws) || {}), ...a }); } catch (e) { /* (rien) */ }
}

// Un message d'un joueur (le protocole, en tête). `repondre(m)` : à lui seul ; `diffuser(m)` : à tous ;
// `lits` (E-5) : { coucher(oui), accueilli() }, ce que le Durable Object fait des lits.
export function traiterMessage(registre, compte, message, repondre, diffuser, diffuserAutres = diffuser, lits = null) {
  let m;
  try { m = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)); } catch (e) { repondre({ t: 'erreur', erreur: 'Message illisible.' }); return; }
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hello') {
    const a = registre.accueil(compte, { version: m.version, depuis: m.depuis });
    if (!a.ok) { repondre({ t: 'refus', raison: a.raison, erreur: a.erreur }); return; }
    repondre({ t: 'bienvenue', rev: a.rev, role: a.role, titre: a.titre, proprietaire: a.proprietaire, moi: compte, membres: a.membres });
    if (a.partie) repondre({ t: 'instantane', rev: a.rev, partie: a.partie });
    else repondre({ t: 'rattrape', evts: a.evts });
    if (lits) lits.accueilli();
    return;
  }
  if (m.t === 'coucher') {
    // E-5 : se coucher (ou se relever) ; le Durable Object compte les lits
    if (registre.membre(compte) && lits) lits.coucher(m.oui === true);
    return;
  }
  if (m.t === 'cmd') {
    const r = registre.commande(compte, m);
    repondre(r.ok ? { t: 'ack', id: m.id, ok: true, rev: r.rev, ...(r.doublon ? { doublon: true } : {}) } : { t: 'ack', id: m.id, ok: false, erreur: r.erreur });
    if (r.ok && r.evt) diffuser(r.evt);
    return;
  }
  if (m.t === 'pos') {
    // E-4 : la position d'un membre, relayée aux autres, jamais écrite ; trop tôt, ou hors du monde : ignorée
    const membre = registre.membre(compte);
    const x = Number(m.x), y = Number(m.y);
    if (!membre || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > MONDE.POS_MAX || Math.abs(y) > MONDE.POS_MAX) return;
    const t = registre.maintenant(), avant = registre.positions.get(compte) || 0;
    if (t - avant < MONDE.POS_MS) return;
    registre.positions.set(compte, t);
    diffuserAutres({ t: 'pos', acteur: compte, nom: membre.nom, x: Math.round(x), y: Math.round(y) });
    return;
  }
  repondre({ t: 'erreur', erreur: `Message inconnu : ${String(m.t)}.` });
}
