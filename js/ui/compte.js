// compte.js — E-0 : le compte du jeu en ligne (décision F.3), dans ⚙️ Options › « 🌐 Jeu en ligne ».
//
// Le jeu solo reste sans compte, sur l'appareil. Pour le jeu en ligne, le joueur donne son adresse e-mail
// et reçoit un lien de connexion (le Worker Cloudflare : worker/src/comptes.mjs). Le lien ouvre le jeu
// avec le jeton dans le fragment (jeu.html#connexion=…) : au démarrage, il est échangé contre une
// session (connexionDuLien), gardée sur l'appareil (localStorage « ferme-compte » : la session et
// l'adresse). Se déconnecter oublie la session ; supprimer le compte l'efface aussi du serveur.

import { registerActions } from './actions.js';
import { morph } from './render.js';
import { notify } from './toasts.js';
import { exportSaveJson } from './storage.js';
import { enLigne, SAVE_KEY, state } from './store.js';
import { nomDe, unirVu } from '../engine/index.js';import { enLigneOuvert } from '../engine/ile/jeu.js';


const CLE = 'ferme-compte';

// Les adresses du site publié : son domaine, et l'ancienne adresse GitHub Pages.
const SITE_PUBLIE = new Set(['moonbloom-village.com', 'www.moonbloom-village.com', 'aluzy.github.io']);

// L'adresse du Worker : celle du site publié ; en local, le serveur d'essai (s'il sert /compte/).
export function adresseServeur(host = typeof location !== 'undefined' ? location.hostname : '') {
  if (SITE_PUBLIE.has(host)) return 'https://family-farm.contact-voidr.workers.dev';
  if (host === '' || host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8787';
  return null;
}

// Le compte gardé sur l'appareil : { session, email } ou null.
export function compteGarde() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE));
    return v && typeof v.session === 'string' && typeof v.email === 'string' ? v : null;
  } catch (e) {
    return null;
  }
}
function garder(v) {
  try {
    if (v) localStorage.setItem(CLE, JSON.stringify(v)); else localStorage.removeItem(CLE);
  } catch (e) { /* stockage refusé : connecté pour cette visite seulement */ }
}

// Un appel au Worker : { ok, statut, ...corps } (jamais d'exception : hors ligne, { ok: false }).
async function appel(chemin, opts = {}) {
  return appelServeur('/compte/' + chemin, opts);
}
// E-4 : son personnage, celui de sa partie solo (sur cet appareil : { v, t, s }) : le personnage principal de
// la famille (un objet de famille.membres), ou null sans partie.
export function personnageSolo() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    const f = p && (p.s || p).famille;
    const ms = f && Array.isArray(f.membres) ? f.membres : [];
    return ms.find((x) => x && x.id === f.principal) || ms.find((x) => x && !x.enfant) || ms[0] || null;
  } catch (e) {
    return null;
  }
}
// Le prénom que voient les autres joueurs : celui de ce personnage, encodé pour l'en-tête ; vide sans partie
// (le serveur dit alors « Voisin »). Jamais l'e-mail.
export function prenomJoueur() {
  const m = personnageSolo();
  return m && typeof m.prenom === 'string' ? encodeURIComponent(m.prenom.trim().slice(0, 40)) : '';
}
// I9e : ce prénom, tel quel (le message hello de la WebSocket du monde : js/ui/en-ligne.js ; le monde le nettoie) ; ''
// sans partie.
export function prenomPersonnage() {
  const m = personnageSolo();
  return m && typeof m.prenom === 'string' ? m.prenom.trim().slice(0, 40) : '';
}
export async function appelServeur(chemin, { methode = 'POST', corps } = {}) {
  const base = adresseServeur();
  if (!base) return { ok: false, erreur: 'Le jeu en ligne n\'est pas disponible ici.' };
  const c = compteGarde();
  try {
    const r = await fetch(base + chemin, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(c ? { Authorization: `Bearer ${c.session}`, 'X-Prenom': prenomJoueur() } : {}) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    let b = {};
    try { b = await r.json(); } catch (e) { b = {}; }
    return { ...b, ok: r.ok && b.ok !== false, statut: r.status };
  } catch (e) {
    return { ok: false, erreur: 'Pas de réponse du serveur : vérifie ta connexion, puis réessaie.' };
  }
}

// La rubrique des Options.
let attente = false, envoye = null, confirmer = false;
export function compteHtml() {
  const c = compteGarde();
  const corps = c ? `
      <p class="muted">Connecté : <strong>${echapper(c.email)}</strong>. Ton compte servira au jeu en ligne (inviter un ami, rejoindre sa ferme) ; ta partie solo reste sur cet appareil.</p>
      ${mondesHtml()}
      <div class="row">
        <button class="btn" type="button" data-action="compte-deconnexion">Me déconnecter</button>
        ${confirmer
    ? '<button class="btn danger" type="button" data-action="compte-supprimer-oui">Oui, supprimer mon compte</button><button class="btn" type="button" data-action="compte-supprimer-non">Non</button>'
    : '<button class="btn" type="button" data-action="compte-supprimer">Supprimer mon compte</button>'}
      </div>`
    : envoye ? `
      <p class="muted">📬 Un lien de connexion est parti vers <strong>${echapper(envoye)}</strong>. Ouvre-le sur cet appareil : il vaut 15 minutes. Rien reçu ? Regarde les indésirables.</p>
      <div class="row"><button class="btn" type="button" data-action="compte-autre">Une autre adresse</button></div>`
      : `
      <p class="muted">Le jeu solo n'en a pas besoin. Pour jouer en ligne avec des amis, connecte-toi : tu reçois un lien par e-mail, sans mot de passe. Ton adresse ne sert qu'à te connecter.</p>
      <div class="row">
        <input type="email" id="compte-email" inputmode="email" autocomplete="email" placeholder="ton@adresse.fr" aria-label="Ton adresse e-mail">
        <button class="btn primary" type="button" data-action="compte-lien"${attente ? ' disabled' : ''}>${attente ? 'Envoi…' : 'Recevoir le lien'}</button>
      </div>`;
  return `<div class="stack" id="compte-zone"><strong>🌐 Jeu en ligne</strong>${corps}</div>`;
}
// E-2 : ses mondes en ligne (GET /mondes, lus à l'ouverture des Options), et mettre sa ferme en ligne (F.4 :
// une copie de la partie solo, qui reste sur l'appareil). I9f : une île part en ligne tout entière (la ferme, ce qui est
// pris dehors, les chemins, le port, les villageois, les commerces, la chronique) ; la fenêtre dit que la partie solo et
// l'île en ligne sont deux îles qui vivent chacune leur vie, et le propriétaire peut remettre la copie à jour depuis sa
// partie solo (avec confirmation : elle remplace l'île en ligne pour tous ; le monde se sauvegarde d'abord). Son
// brouillard part avec elle, dans ce navigateur (le monde ne le garde pas : js/ui/en-ligne.js, ferme-brouillard-<monde>).
let mondes = null, mondesLus = false, miseEnLigne = false, aRemplacer = null, remplacement = null;
const ileSolo = () => !!(state);
// Ce que pèse la copie, à peu près (le brouillard ne part pas ; le monde dit le poids exact s'il dépasse son plafond).
function poidsCopieKo() {
  try { const vu = (state.monde && state.monde.vu) || ''; return Math.max(1, Math.round((JSON.stringify(state).length - String(vu).length) / 1024)); } catch (e) { return null; }
}
function mondesHtml() {
  // (le jeu en ligne est suspendu, docs/ile-300.md C19 : ILE.PARTIE.EN_LIGNE)
  if (!enLigneOuvert()) return '<p class="muted">🌐 Le jeu en ligne est suspendu pour l\'instant.</p>';
  if (!mondesLus) { mondesLus = true; lireMondes(); }
  const ile = ileSolo();
  const enLigneIci = typeof location !== 'undefined' && /[?&]monde=/.test(location.search);
  const remettre = (m) => (!ile || enLigneIci || m.role !== 'proprietaire' ? ''
    : aRemplacer === m.monde ? ''
      : `<button class="btn" type="button" data-action="monde-remplacer" data-monde="${echapper(m.monde)}"${remplacement ? ' disabled' : ''}>🔄 Remettre à jour</button>`);
  const liste = (mondes || []).map((m) => `<div class="row"><span>🏡 ${echapper(m.titre)}${m.role === 'proprietaire' ? '' : ' (invité)'}</span><a class="btn" href="jeu.html?monde=${encodeURIComponent(m.monde)}">Entrer</a>${remettre(m)}</div>${aRemplacer === m.monde ? confirmationHtml(m) : ''}`).join('');
  const ko = ile ? poidsCopieKo() : null;
  const deux = ile ? `<p class="muted" id="monde-deux-iles">🏝️ Ta partie solo et ton île en ligne sont deux îles : après la copie, chacune vit sa vie. Ce que vous faites en ligne ne revient pas dans ta partie solo, et ce que tu fais en solo ne part pas en ligne, sauf si tu remets la copie à jour (🔄).</p>` : '';
  const creer = enLigneIci ? '' : `<div class="row"><button class="btn primary" type="button" data-action="monde-creer"${miseEnLigne ? ' disabled' : ''}>${miseEnLigne ? 'Mise en ligne…' : ile ? '🌐 Mettre mon île en ligne' : '🌐 Mettre ma ferme en ligne'}</button></div>
        <p class="muted">${ile ? `Une copie de ton île part en ligne : la ferme, ce que tu as pris et posé dehors, le port, les villageois et leurs liens, les commerces, la chronique${ko ? ` (≈ ${ko} Ko ; un monde en porte 256 au plus)` : ''}. Tes amis y viennent par invitation ; ta partie solo reste sur cet appareil, telle quelle.` : 'Une copie de ta ferme part en ligne, pour y construire à plusieurs ; ta partie solo reste sur cet appareil, telle quelle.'}</p>
        ${deux}`;
  // (I9f : sur une île, la mise en ligne et les deux îles d'abord, puis ses mondes ; une ferme d'avant, comme avant)
  const listeHtml = mondes === null ? '<p class="muted">Tes mondes en ligne…</p>' : liste || '<p class="muted">Pas encore de monde en ligne.</p>';
  const temps = enLigne && enLigne.vivante ? '<p class="muted">🕰️ Le temps de ce monde passe quand au moins un joueur y est. Sans personne, il dort.</p>' : '';
  return `<div class="stack">
        ${ile ? `${creer}${listeHtml}${temps}` : `${listeHtml}${temps}${creer}`}
      </div>`;
}
// I9f : la confirmation de la copie remise à jour.
function confirmationHtml(m) {
  return `<div class="stack" id="monde-remplacer-confirmation">
        <p class="muted">⚠️ Remplacer l'île en ligne « ${echapper(m.titre)} » par une copie de ton île solo d'aujourd'hui ? Tout ce qui y a été fait depuis la copie sera remplacé, pour tous ses membres. Ils restent membres, avec leur rôle ; ils repartent sans sac ni charge, et leurs amitiés avec tes villageois recommencent. Le monde est sauvegardé d'abord : 👥 › 💾 permet d'y revenir.</p>
        <div class="row"><button class="btn danger" type="button" data-action="monde-remplacer-oui" data-monde="${echapper(m.monde)}"${remplacement ? ' disabled' : ''}>${remplacement ? 'Remise à jour…' : 'Oui, remplacer l\'île en ligne'}</button><button class="btn" type="button" data-action="monde-remplacer-non">Non</button></div>
      </div>`;
}
async function lireMondes() {
  const r = await appelServeur('/mondes', { methode: 'GET' });
  mondes = r.ok ? r.mondes || [] : [];
  redessiner();
}
// I9f : le brouillard de sa partie solo, posé dans ce navigateur pour le monde `monde` (uni à celui qu'il y avait déjà).
function garderBrouillard(monde) {
  if (!ileSolo() || !state.monde || typeof state.monde.vu !== 'string' || !state.monde.vu) return;
  const cle = `ferme-brouillard-${monde}`;
  try {
    const avant = localStorage.getItem(cle);
    const copie = { ...state, monde: { ...state.monde } };
    if (avant) unirVu(copie, avant);
    localStorage.setItem(cle, copie.monde.vu);
  } catch (e) { /* (le navigateur ne garde rien : le brouillard repart de la ferme) */ }
}
async function creerMonde() {
  if (miseEnLigne) return;
  miseEnLigne = true;
  redessiner();
  const ile = ileSolo();
  const r = await appelServeur('/mondes', { corps: { partie: JSON.parse(exportSaveJson()), titre: ile ? String(nomDe(state, 'ile') || 'Mon île').slice(0, 40) : 'Ma ferme' } });
  miseEnLigne = false;
  if (!r.ok) { notify(`🌐 ${r.erreur || 'La mise en ligne a échoué.'}`, { duree: 9000 }); redessiner(); return; }
  if (r.monde) garderBrouillard(r.monde);
  notify(ile ? '🌐 Ton île est en ligne. Entre dedans et invite tes amis (👥) : ta partie solo t\'attend ici.' : '🌐 Ta ferme est en ligne. Entre dedans : tu y construis, ta partie solo t\'attend ici.');
  mondes = null;
  mondesLus = false;
  redessiner();
}
// I9f : remettre la copie à jour (confirmée) : la partie solo remplace l'île en ligne.
async function remplacerMonde(monde) {
  if (remplacement) return;
  remplacement = monde;
  redessiner();
  const r = await appelServeur(`/mondes/${monde}/remplacer`, { corps: { partie: JSON.parse(exportSaveJson()) } });
  remplacement = null;
  if (!r.ok) { notify(`🌐 ${r.erreur || 'La copie n\'a pas pu être remise à jour.'}`, { duree: 9000 }); redessiner(); return; }
  aRemplacer = null;
  garderBrouillard(monde);
  notify(`🌐 L'île en ligne est remise à jour depuis ta partie solo (jour ${r.jour}). L'ancienne est dans ses sauvegardes (👥 › 💾).`, { duree: 8000 });
  redessiner();
}

const echapper = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
function redessiner() {
  const z = document.getElementById('compte-zone');
  if (z) morph(z, compteHtml());
}

// (E-3 : posées par en-ligne.js, amis.js : reprendre une invitation, une demande d'ami en attente, une fois connecté)
const apresConnexion = [];
export function quandConnecte(f) {
  apresConnexion.push(f);
}

// Au démarrage : le jeu ouvert par le lien de l'e-mail (jeu.html#connexion=…) : la session. Le fragment
// est retiré de l'adresse tout de suite (il ne sert qu'une fois).
export async function connexionDuLien() {
  const m = /(?:^#|&)connexion=([A-Za-z0-9_-]{40,64})/.exec(typeof location !== 'undefined' ? location.hash : '');
  if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ }
  const r = await appel('connexion', { corps: { jeton: m[1] } });
  if (r.ok && r.session && r.compte) {
    garder({ session: r.session, email: r.compte.email });
    envoye = null;
    notify(`🌐 Connecté : ${r.compte.email}.`);
    // (E-3 : une invitation suivie avant d'être connecté : elle reprend)
    for (const f of apresConnexion) f();
  } else notify(`🌐 ${r.erreur || 'La connexion a échoué.'}`);
  redessiner();
}

async function demanderLien() {
  const champ = document.getElementById('compte-email');
  const email = champ ? champ.value.trim() : '';
  if (!email) { notify('Écris d\'abord ton adresse e-mail.'); return; }
  attente = true;
  redessiner();
  const r = await appel('lien', { corps: { email } });
  attente = false;
  if (r.ok) envoye = email;
  else notify(`🌐 ${r.erreur || 'Le lien n\'a pas pu partir.'}`);
  redessiner();
}

async function deconnecter() {
  await appel('deconnexion');
  garder(null);
  confirmer = false;
  notify('🌐 Déconnecté.');
  redessiner();
}

async function supprimer() {
  const r = await appel('supprimer');
  if (!r.ok && r.statut !== 401) { notify(`🌐 ${r.erreur || 'La suppression a échoué : réessaie.'}`); return; }
  garder(null);
  confirmer = false;
  notify('🌐 Compte supprimé : ton adresse est effacée du serveur. Ta partie solo reste sur cet appareil.');
  redessiner();
}

// (le lien ouvert dans l'onglet du jeu, déjà ouvert : seul le fragment change)
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { connexionDuLien(); });

registerActions({
  'monde-creer': () => { creerMonde(); },
  // (I9f : remettre la copie à jour, avec confirmation)
  'monde-remplacer': (target) => { aRemplacer = target.dataset.monde; redessiner(); },
  'monde-remplacer-non': () => { aRemplacer = null; redessiner(); },
  'monde-remplacer-oui': (target) => { remplacerMonde(target.dataset.monde); },
  'compte-lien': () => { demanderLien(); },
  'compte-autre': () => { envoye = null; redessiner(); },
  'compte-deconnexion': () => { deconnecter(); },
  'compte-supprimer': () => { confirmer = true; redessiner(); },
  'compte-supprimer-non': () => { confirmer = false; redessiner(); },
  'compte-supprimer-oui': () => { supprimer(); },
});
