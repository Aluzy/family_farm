// Les amis (jeu en ligne) : un code ami par compte, les demandes, la liste d'amis, le profil que chacun publie
// (le prénom de son personnage, son allure, son niveau, le nom de sa famille, où il joue), la présence (vu il y a
// moins de AMIS.EN_LIGNE_MS : en ligne) et la boîte de chacun (une invitation dans la ferme d'un ami, un ami qui
// demande à venir, un signe de la main).
//
// Rien ici ne montre une adresse e-mail : un ami se trouve par son code (« MOON-K7Q2X ») ou par le lien qui le
// porte. Le monde où joue un ami n'est donné que si l'on en est membre soi-même (pour le rejoindre).
// Les tables vivent dans la base du Durable Object des comptes (comptes.mjs, Registre.amis).

export const AMIS = {
  MAX: 100,                  // amis au plus
  DEMANDES_MAX: 30,          // demandes en attente envoyées au plus
  EN_LIGNE_MS: 90 * 1000,    // vu depuis moins longtemps : en ligne (le jeu publie son profil toutes les 45 s)
  BOITE_MAX: 40,             // messages gardés au plus par boîte (les plus vieux s'en vont)
  BOITE_JOURS: 14,           // un message plus vieux s'en va
  SIGNE_MS: 60 * 1000,       // un signe de la main au plus par minute, d'un ami à l'autre
  CODE: 'MOON-',
};
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // (sans 0, O, 1, I : ils se confondent)
export const CODE_RE = /^MOON-[2-9A-HJ-NP-Z]{5}$/;
const MONDE_ID_RE = /^m-[A-Za-z0-9_-]{16,40}$/;
const JOUR = 24 * 3600 * 1000;

const lignes = (r) => (r && typeof r.toArray === 'function' ? r.toArray() : Array.isArray(r) ? r : []);

// Un code saisi, rangé (majuscules, sans espaces ; « k7q2x » ou « moon k7q2x » → « MOON-K7Q2X »), ou null.
export function rangerCode(valeur) {
  let c = String(valeur || '').toUpperCase().replace(/[\s_.]+/g, '').replace(/^MOON-?/, '');
  c = AMIS.CODE + c;
  return CODE_RE.test(c) ? c : null;
}

// Le prénom publié : sans caractère de contrôle ni balise, 20 caractères au plus ; « Voisin » sans prénom.
export function prenomPublie(v) {
  const t = Array.from(String(v || '').replace(/[\u0000-\u001f\u007f<>]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 20).join('').trim();
  return t || 'Voisin';
}

export function creerTablesAmis(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS profils (compte TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, prenom TEXT NOT NULL, look TEXT, niveau INTEGER NOT NULL DEFAULT 0, famille TEXT NOT NULL DEFAULT \'\', vu INTEGER NOT NULL DEFAULT 0, monde TEXT, proprio INTEGER NOT NULL DEFAULT 0)');
  // (une ligne par sens : de → pour ; « demande » attend la réponse de `pour`, « ami » existe dans les deux sens)
  sql.exec('CREATE TABLE IF NOT EXISTS amities (de TEXT NOT NULL, pour TEXT NOT NULL, etat TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (de, pour))');
  sql.exec('CREATE INDEX IF NOT EXISTS amities_pour ON amities (pour, etat)');
  sql.exec('CREATE TABLE IF NOT EXISTS boite (id INTEGER PRIMARY KEY AUTOINCREMENT, pour TEXT NOT NULL, de TEXT NOT NULL, type TEXT NOT NULL, monde TEXT, code TEXT, titre TEXT, ts INTEGER NOT NULL)');
  sql.exec('CREATE INDEX IF NOT EXISTS boite_pour ON boite (pour, ts)');
}

const refus = (statut, erreur) => ({ ok: false, statut, erreur });

export class Amis {
  constructor(sql, maintenant = () => Date.now()) {
    this.sql = sql;
    this.maintenant = maintenant;
    creerTablesAmis(sql);
  }

  un(q, ...v) { return lignes(this.sql.exec(q, ...v))[0] || null; }
  tous(q, ...v) { return lignes(this.sql.exec(q, ...v)); }
  faire(q, ...v) { lignes(this.sql.exec(q, ...v)); }

  // Le profil de `compte`, créé (avec son code) la première fois.
  profil(compte) {
    let p = this.un('SELECT * FROM profils WHERE compte = ?', compte);
    if (p) return p;
    let code;
    do {
      const b = crypto.getRandomValues(new Uint8Array(5));
      code = AMIS.CODE + [...b].map((x) => ALPHABET[x % ALPHABET.length]).join('');
    } while (this.un('SELECT 1 AS x FROM profils WHERE code = ?', code));
    this.faire('INSERT INTO profils (compte, code, prenom) VALUES (?, ?, ?)', compte, code, 'Voisin');
    return this.un('SELECT * FROM profils WHERE compte = ?', compte);
  }

  // Ce que le jeu de `compte` publie (à l'ouverture du jeu, puis toutes les 45 s) : il est en ligne.
  publier(compte, b = {}) {
    this.profil(compte);
    let look = null;
    try { look = b.look && typeof b.look === 'object' ? JSON.stringify(b.look) : null; } catch (e) { look = null; }
    if (look && look.length > 1000) look = null;
    const niveau = Math.max(0, Math.min(999, Math.floor(Number(b.niveau) || 0)));
    const famille = String(b.famille || '').replace(/[\u0000-\u001f\u007f<>]+/g, ' ').trim().slice(0, 30);
    const monde = MONDE_ID_RE.test(String(b.monde || '')) ? String(b.monde) : null;
    this.faire('UPDATE profils SET prenom = ?, look = ?, niveau = ?, famille = ?, vu = ?, monde = ?, proprio = ? WHERE compte = ?',
      prenomPublie(b.prenom), look, niveau, famille, this.maintenant(), monde, monde && b.proprio ? 1 : 0, compte);
  }

  // Ce qu'on montre d'un autre compte (`p` : son profil) à `moi`.
  carte(moi, p, extra = {}) {
    const t = this.maintenant();
    let look = null;
    try { look = p.look ? JSON.parse(p.look) : null; } catch (e) { look = null; }
    return { compte: p.compte, prenom: p.prenom, look, niveau: p.niveau, famille: p.famille, enLigne: t - p.vu < AMIS.EN_LIGNE_MS, vu: p.vu, ...extra };
  }

  // Tout ce que le volet des amis de `compte` montre.
  vue(compte) {
    const moi = this.profil(compte);
    const t = this.maintenant();
    this.faire('DELETE FROM boite WHERE ts < ?', t - AMIS.BOITE_JOURS * JOUR);
    const mesMondes = new Set(this.tous('SELECT monde FROM mondes WHERE compte = ?', compte).map((m) => m.monde));
    const amis = this.tous('SELECT p.*, a.ts AS depuis FROM amities a JOIN profils p ON p.compte = a.pour WHERE a.de = ? AND a.etat = \'ami\' ORDER BY p.prenom', compte).map((p) => {
      const enLigne = t - p.vu < AMIS.EN_LIGNE_MS;
      // (où il joue : dans sa ferme solo, dans un monde en ligne ; le monde n'est dit que si j'en suis membre)
      const ou = !enLigne ? null : p.monde ? (p.proprio ? 'sa-ferme-en-ligne' : 'un-monde') : 'solo';
      const membre = enLigne && p.monde && mesMondes.has(p.monde);
      return this.carte(compte, p, { depuis: p.depuis, ou, monde: membre ? p.monde : null });
    });
    const demandes = this.tous('SELECT p.*, a.ts AS ts FROM amities a JOIN profils p ON p.compte = a.de WHERE a.pour = ? AND a.etat = \'demande\' ORDER BY a.ts DESC', compte).map((p) => this.carte(compte, p, { ts: p.ts }));
    const envoyees = this.tous('SELECT p.compte, p.prenom, a.ts FROM amities a JOIN profils p ON p.compte = a.pour WHERE a.de = ? AND a.etat = \'demande\' ORDER BY a.ts DESC', compte);
    const noms = new Map(amis.map((a) => [a.compte, a.prenom]));
    const boite = this.tous('SELECT id, de, type, monde, code, titre, ts FROM boite WHERE pour = ? ORDER BY ts DESC LIMIT ?', compte, AMIS.BOITE_MAX)
      .filter((m) => noms.has(m.de)).map((m) => ({ ...m, prenom: noms.get(m.de) }));
    return { ok: true, code: moi.code, amis, demandes, envoyees, boite };
  }

  sontAmis(a, b) { return !!this.un('SELECT 1 AS x FROM amities WHERE de = ? AND pour = ? AND etat = \'ami\'', a, b); }

  // `compte` demande à devenir l'ami du code `code` ; si l'autre le lui avait déjà demandé, ils le sont.
  ajouter(compte, code) {
    const c = rangerCode(code);
    if (!c) return refus(400, 'Ce code ami n\'est pas valide (il ressemble à MOON-K7Q2X).');
    const autre = this.un('SELECT compte FROM profils WHERE code = ?', c);
    if (!autre) return refus(404, 'Personne n\'a ce code ami : vérifie-le avec ton ami.');
    if (autre.compte === compte) return refus(400, 'C\'est ton propre code ami : envoie-le à un ami, c\'est lui qui l\'entre.');
    this.profil(compte);
    if (this.sontAmis(compte, autre.compte)) return { ok: true, deja: true, amis: true };
    if (this.un('SELECT 1 AS x FROM amities WHERE de = ? AND pour = ? AND etat = \'demande\'', autre.compte, compte)) return this.devenirAmis(compte, autre.compte);
    if (this.un('SELECT 1 AS x FROM amities WHERE de = ? AND pour = ?', compte, autre.compte)) return { ok: true, deja: true, amis: false };
    if (this.nAmis(compte) >= AMIS.MAX) return refus(409, `Tu as déjà ${AMIS.MAX} amis.`);
    if (this.un('SELECT COUNT(*) AS n FROM amities WHERE de = ? AND etat = \'demande\'', compte).n >= AMIS.DEMANDES_MAX) return refus(429, 'Tu as déjà beaucoup de demandes en attente : attends leurs réponses.');
    this.faire('INSERT INTO amities (de, pour, etat, ts) VALUES (?, ?, \'demande\', ?)', compte, autre.compte, this.maintenant());
    return { ok: true, amis: false };
  }
  nAmis(compte) { return this.un('SELECT COUNT(*) AS n FROM amities WHERE de = ? AND etat = \'ami\'', compte).n; }
  devenirAmis(a, b) {
    if (this.nAmis(a) >= AMIS.MAX || this.nAmis(b) >= AMIS.MAX) return refus(409, `Un de vous deux a déjà ${AMIS.MAX} amis.`);
    const t = this.maintenant();
    this.faire('DELETE FROM amities WHERE (de = ? AND pour = ?) OR (de = ? AND pour = ?)', a, b, b, a);
    this.faire('INSERT INTO amities (de, pour, etat, ts) VALUES (?, ?, \'ami\', ?), (?, ?, \'ami\', ?)', a, b, t, b, a, t);
    return { ok: true, amis: true };
  }

  // La réponse de `compte` à la demande de `de`.
  repondre(compte, de, oui) {
    if (!this.un('SELECT 1 AS x FROM amities WHERE de = ? AND pour = ? AND etat = \'demande\'', de, compte)) return refus(404, 'Cette demande n\'existe plus.');
    if (oui) return this.devenirAmis(compte, de);
    this.faire('DELETE FROM amities WHERE de = ? AND pour = ?', de, compte);
    return { ok: true };
  }

  // Ne plus être amis (ou annuler sa demande) ; les messages entre eux s'en vont.
  retirer(compte, autre) {
    this.faire('DELETE FROM amities WHERE (de = ? AND pour = ?) OR (de = ? AND pour = ?)', compte, autre, autre, compte);
    this.faire('DELETE FROM boite WHERE (de = ? AND pour = ?) OR (de = ? AND pour = ?)', compte, autre, autre, compte);
    return { ok: true };
  }

  // Un message de `de` dans la boîte de son ami `pour` : 'invitation' (monde, code, titre), 'visite' (il
  // demande à venir), 'signe' (un signe de la main). Un seul message de chaque sorte en attente entre eux.
  deposer(de, pour, type, extra = {}) {
    if (!['invitation', 'visite', 'signe'].includes(type)) return refus(400, 'Message inconnu.');
    if (!this.sontAmis(de, pour)) return refus(403, 'Vous n\'êtes pas (ou plus) amis.');
    const t = this.maintenant();
    if (type === 'signe') {
      const der = this.un('SELECT ts FROM boite WHERE de = ? AND pour = ? AND type = \'signe\'', de, pour);
      if (der && t - der.ts < AMIS.SIGNE_MS) return { ok: true, deja: true };
    }
    this.faire('DELETE FROM boite WHERE de = ? AND pour = ? AND type = ?', de, pour, type);
    this.faire('INSERT INTO boite (pour, de, type, monde, code, titre, ts) VALUES (?, ?, ?, ?, ?, ?, ?)', pour, de, type,
      extra.monde || null, extra.code || null, extra.titre ? String(extra.titre).slice(0, 40) : null, t);
    const vieux = this.tous('SELECT id FROM boite WHERE pour = ? ORDER BY ts DESC LIMIT -1 OFFSET ?', pour, AMIS.BOITE_MAX);
    for (const v of vieux) this.faire('DELETE FROM boite WHERE id = ?', v.id);
    return { ok: true };
  }

  // Les messages lus (ou suivis) de la boîte de `compte`, retirés.
  lu(compte, ids) {
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 100)) this.faire('DELETE FROM boite WHERE id = ? AND pour = ?', Math.floor(Number(id)) || 0, compte);
    return { ok: true };
  }

  // Le compte supprimé : son profil, ses amitiés, ses messages.
  oublier(compte) {
    this.faire('DELETE FROM profils WHERE compte = ?', compte);
    this.faire('DELETE FROM amities WHERE de = ? OR pour = ?', compte, compte);
    this.faire('DELETE FROM boite WHERE de = ? OR pour = ?', compte, compte);
  }
}

// Les routes /compte/amis… (dans le Durable Object des comptes ; `c` : le compte de la session).
export async function routeAmis(chemin, request, amis, c) {
  let b = {};
  try { b = request.method === 'POST' ? await request.json() : {}; } catch (e) { b = {}; }
  const r = (x) => (x.ok ? { statut: 200, corps: x } : { statut: x.statut || 400, corps: { ok: false, erreur: x.erreur } });
  if (chemin === 'amis' && request.method === 'POST') { amis.publier(c.id, b); return r(amis.vue(c.id)); }
  if (chemin === 'amis' && request.method === 'GET') return r(amis.vue(c.id));
  if (request.method !== 'POST') return { statut: 404, corps: { ok: false, erreur: 'not found' } };
  if (chemin === 'amis/ajouter') return r(amis.ajouter(c.id, b.code));
  if (chemin === 'amis/repondre') return r(amis.repondre(c.id, String(b.compte || ''), b.oui === true));
  if (chemin === 'amis/retirer') return r(amis.retirer(c.id, String(b.compte || '')));
  if (chemin === 'amis/visite') return r(amis.deposer(c.id, String(b.compte || ''), 'visite'));
  if (chemin === 'amis/signe') return r(amis.deposer(c.id, String(b.compte || ''), 'signe'));
  if (chemin === 'amis/lu') return r(amis.lu(c.id, b.ids));
  return { statut: 404, corps: { ok: false, erreur: 'not found' } };
}
