// en-ligne.js — E-2 : jouer dans un monde en ligne (le serveur : worker/src/monde.mjs).
//
// - Entrer dans un monde, c'est ouvrir jeu.html?monde=<id> (compte connecté : js/ui/compte.js). Au
//   démarrage (rejoindre), le jeu se connecte au monde par une WebSocket, reçoit sa partie et la joue à la
//   place de la partie solo, qui n'est jamais touchée : rien n'est sauvegardé sur l'appareil en ligne
//   (storage.js), et le rattrapage d'absence ne joue pas.
// - F.2 : le monde est figé (loop.js : l'horloge ne tourne pas en ligne). Pour l'instant, en ligne, on
//   construit ensemble : le mode Construire est ouvert d'office et reste ouvert (actionPermise) ; les
//   autres gestes de la ferme viendront ensuite.
// - Chaque commande du joueur (commandes.js, executer) est jouée tout de suite sur sa partie et envoyée
//   (js/ui/synchro.js) ; celles des autres arrivent et sont jouées à leur tour. Coupé, le jeu se
//   reconnecte, demande ce qu'il a manqué depuis sa révision et renvoie ses commandes en attente (le
//   monde ne joue pas deux fois la même : leur id).
// - Le bandeau « 🌐 » dit où l'on est, si l'on est à jour, et permet de revenir à sa ferme solo.

import { executerCommande, GAME_VERSION } from '../engine/index.js';
import { adresseServeur, appelServeur, compteGarde, quandConnecte } from './compte.js';
import { closeModal, openModal } from './modal.js';
import { Synchro } from './synchro.js';
import { setEnLigne, setState } from './store.js';
import { notify } from './toasts.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';
import { brancherEnLigne } from './commandes.js';

// Le monde demandé par l'adresse (jeu.html?monde=…), ou null.
export function mondeDemande() {
  try {
    const m = new URLSearchParams(location.search).get('monde');
    return m && /^m-[A-Za-z0-9_-]{16,40}$/.test(m) ? m : null;
  } catch (e) {
    return null;
  }
}

const RECONNEXION_MS = [1000, 2000, 5000, 10000, 20000];
let lien = null;   // la connexion en cours : { monde, ws, synchro, etat, essais, titre, membres }

// La WebSocket du monde `monde` (la session du compte dans l'adresse : une WebSocket ne porte pas d'en-tête).
function ouvrirWs(monde) {
  const base = adresseServeur(), c = compteGarde();
  if (!base || !c) return null;
  return new WebSocket(`${base.replace(/^http/, 'ws')}/mondes/${monde}/ws?session=${encodeURIComponent(c.session)}`);
}

// Au démarrage, le monde `monde` : sa partie (la locale de la synchro), ou null (pas connecté, refusé,
// injoignable : le jeu reprend la partie solo, avec un message). `delaiMs` : l'attente au plus.
export function rejoindre(monde, delaiMs = 15000) {
  if (!compteGarde()) { notify('🌐 Pour entrer dans un monde en ligne, connecte-toi d\'abord (⚙️ Options › Jeu en ligne).'); return Promise.resolve(null); }
  return new Promise((ok) => {
    let fini = false;
    const finir = (v) => { if (!fini) { fini = true; clearTimeout(minuterie); ok(v); } };
    const minuterie = setTimeout(() => { notify('🌐 Le monde ne répond pas : ta ferme solo s\'ouvre.'); fermer(); finir(null); }, delaiMs);
    lien = { monde, ws: null, synchro: null, etat: 'connexion', essais: 0, titre: '', membres: [], premiere: finir };
    connecter();
  });
}

function connecter() {
  if (!lien) return;
  const ws = ouvrirWs(lien.monde);
  if (!ws) { lien.premiere && lien.premiere(null); return; }
  lien.ws = ws;
  lien.etat = lien.synchro ? 'reconnexion' : 'connexion';
  bandeau();
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ t: 'hello', version: GAME_VERSION, ...(lien.synchro ? { depuis: lien.synchro.rev } : {}) }));
  });
  ws.addEventListener('message', (e) => recevoir(ws, e.data));
  ws.addEventListener('close', (e) => {
    if (!lien || lien.ws !== ws) return;
    lien.ws = null;
    if (lien.refuse) return;
    // (E-3 : le propriétaire l'a retiré du monde : retour à la ferme solo)
    if (e && e.code === 4003) {
      lien.refuse = true;
      lien.etat = 'refuse';
      bandeau();
      notify('🌐 Le propriétaire t\'a retiré de ce monde : ta ferme solo s\'ouvre.', { duree: 6000 });
      setTimeout(() => { location.href = 'jeu.html'; }, 3000);
      return;
    }
    if (!lien.synchro) { lien.premiere && lien.premiere(null); notify('🌐 Connexion au monde impossible : ta ferme solo s\'ouvre.'); lien = null; return; }
    lien.etat = 'reconnexion';
    bandeau();
    const d = RECONNEXION_MS[Math.min(lien.essais, RECONNEXION_MS.length - 1)];
    lien.essais += 1;
    setTimeout(connecter, d);
  });
}

function fermer() {
  if (lien && lien.ws) { try { lien.ws.close(); } catch (e) { /* (rien) */ } }
  lien = null;
}

function envoyer(m) {
  if (lien && lien.ws && lien.ws.readyState === 1) { lien.ws.send(JSON.stringify(m)); return true; }
  return false;
}

// Ses commandes en attente, renvoyées (à la reconnexion : le monde ne joue pas deux fois la même).
function renvoyer() {
  if (!lien || !lien.synchro) return;
  for (const c of lien.synchro.enAttente) envoyer({ t: 'cmd', ...c });
}

function recevoir(ws, data) {
  if (!lien || lien.ws !== ws) return;
  let m;
  try { m = JSON.parse(data); } catch (e) { return; }
  if (m.t === 'refus') {
    lien.refuse = true;
    notify(`🌐 ${m.erreur || 'Entrée refusée.'}`);
    if (!lien.synchro) { const p = lien.premiere; lien = null; p && p(null); } else { lien.etat = 'refuse'; bandeau(); }
    return;
  }
  if (m.t === 'bienvenue') {
    lien.titre = m.titre || lien.titre;
    lien.membres = m.membres || [];
    lien.role = m.role;
    lien.moi = m.moi;
    lien.essais = 0;
    derniere = null;
    return;
  }
  // E-4 : où regardent les autres (relayé par le monde, jamais écrit) ; leur départ
  if (m.t === 'pos') {
    autres.set(m.acteur, { nom: m.nom, x: m.x, y: m.y, t: Date.now() });
    return;
  }
  if (m.t === 'parti') {
    autres.delete(m.acteur);
    return;
  }
  if (m.t === 'membres') {
    lien.membres = m.membres || [];
    bandeau();
    if (document.getElementById('membres-titre')) ouvrirMembres();
    return;
  }
  if (m.t === 'instantane') {
    if (!lien.synchro) {
      lien.synchro = new Synchro({ partie: m.partie, rev: m.rev, executerCommande, quandRefaite: partieRefaite });
      setEnLigne(lien.synchro);
      lien.etat = 'ok';
      const p = lien.premiere;
      lien.premiere = null;
      p && p(lien.synchro.locale);
    } else {
      lien.synchro.instantane(m);
      lien.etat = 'ok';
    }
    renvoyer();
    bandeau();
    return;
  }
  if (m.t === 'rattrape') {
    for (const e of m.evts || []) if (!lien.synchro.evenement(e)) { toutRedemander(); return; }
    lien.etat = 'ok';
    renvoyer();
    bandeau();
    return;
  }
  if (m.t === 'evt') {
    if (!lien.synchro.evenement(m)) toutRedemander();
    bandeau();
    return;
  }
  if (m.t === 'ack' && !m.ok) {
    lien.synchro.refusee(m.id);
    notify(`🌐 ${m.erreur || 'Refusé par le monde.'}`);
  }
}

// Un trou dans les événements : la partie entière redemandée (un hello sans révision).
function toutRedemander() {
  envoyer({ t: 'hello', version: GAME_VERSION });
}

// La partie locale refaite (un geste d'un autre joueur, un refus) : le jeu la reprend.
function partieRefaite(locale) {
  setState(locale);
  refresh();
}

// executer (commandes.js), en ligne : la commande jouée sur la partie locale, puis envoyée (si la
// connexion est coupée, elle attend : renvoyée à la reconnexion).
export function jouerEnLigne(cmd) {
  const r = lien.synchro.jouer(cmd);
  if (r.ok) envoyer({ t: 'cmd', id: cmd.id, type: cmd.type, args: cmd.args });
  bandeau();
  return r;
}

brancherEnLigne(jouerEnLigne);

/* ---------- E-4 : la présence ---------- */

// Les autres joueurs du monde : acteur → { nom, x, y, t } (le centre de leur vue, en px de la carte ; t : la
// dernière fois qu'on l'a reçu). La carte les dessine (js/carte/ferme/presence.js lit window.FermeEnLigne).
const autres = new Map();
if (typeof window !== 'undefined') window.FermeEnLigne = { autres };
// Le centre de sa propre vue, envoyé quand il a bougé, POS_MS au plus souvent (le monde en relaie au plus 5
// par seconde) ; jamais quand rien ne change.
const POS_MS = 200;
let derniere = null;
function envoyerPosition() {
  if (!lien || lien.etat !== 'ok' || !window.FarmStage || !FarmStage.scene) return;
  const sc = FarmStage.scene();
  if (!sc || !sc.cameras || !sc.cameras.main) return;
  const p = sc.cameras.main.midPoint, x = Math.round(p.x), y = Math.round(p.y);
  if (derniere && Math.abs(derniere.x - x) < 2 && Math.abs(derniere.y - y) < 2) return;
  if (envoyer({ t: 'pos', x, y })) derniere = { x, y };
}
if (typeof window !== 'undefined') setInterval(envoyerPosition, POS_MS);

/* ---------- ce qu'on fait en ligne ---------- */

// En ligne, pour l'instant : construire ensemble (les gestes du mode Construire) et ce qui ne change pas la
// partie (ouvrir une fenêtre, lire l'aide, les réglages). `bloquees` : les actions qui changent la
// partie (actions.js, SOMMEIL_BLOQUEES), sauf celles de Construire.
const CONSTRUIRE = new Set(['bloc', 'bloc-many', 'build-toggle', 'build-pick', 'build-tab', 'build-groupe', 'build-filtre', 'meuble-ok', 'build-level-menu', 'build-level', 'build-piece', 'build-gomme', 'build-tourner', 'build-peindre', 'meuble-peindre', 'build-sens', 'meuble-tourner', 'build-annuler', 'bloc-pipette', 'bloc-deplacer', 'etage-toggle']);
const JAMAIS = /^(test-|do-import|do-new-game|ask-new-game|demarrer|accueil-)/;
export function actionPermise(action, bloquees, constructionOuverte) {
  if (JAMAIS.test(action)) return 'Pas dans un monde en ligne : reviens à ta ferme solo (🌐 › Ma ferme solo).';
  if (action === 'build-toggle' && constructionOuverte) return 'En ligne, on construit ensemble : pour revenir à ta ferme solo, touche 🌐 › Ma ferme solo.';
  if (bloquees.has(action) && !CONSTRUIRE.has(action)) return 'En ligne, on construit ensemble pour l\'instant : ce geste viendra bientôt.';
  return null;
}

/* ---------- le bandeau ---------- */

export function bandeau() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('en-ligne-bandeau');
  if (!lien) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'en-ligne-bandeau';
    el.className = 'en-ligne-bandeau';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  const etat = { connexion: '⏳ connexion…', reconnexion: '⏳ reconnexion…', ok: '✓ à jour', refuse: '⛔ refusé' }[lien.etat] || '';
  const attente = lien.synchro && lien.synchro.enAttente.length ? ` · ${lien.synchro.enAttente.length} en attente` : '';
  const n = lien.membres.length;
  el.innerHTML = `<span>🌐 En ligne · ${etat}${attente}</span><button class="btn" type="button" data-action="monde-membres" aria-label="Les membres du monde">👥 ${n}</button><button class="btn" type="button" data-action="monde-quitter">Ma ferme solo</button>`;
}

/* ---------- E-3 : les membres, inviter, retirer ---------- */

const echapper = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let invitation = null, aRetirer = null;
function ouvrirMembres() {
  if (!lien) return;
  const proprio = lien.role === 'proprietaire';
  const lignes = lien.membres.map((m) => `<div class="row"><span>${m.role === 'proprietaire' ? '🏡' : '🔨'} ${echapper(m.nom)}${m.compte === lien.moi ? ' (toi)' : ''}</span>${proprio && m.role !== 'proprietaire'
    ? (aRetirer === m.compte ? `<button class="btn danger" type="button" data-action="monde-retirer-oui" data-compte="${echapper(m.compte)}">Oui, le retirer</button><button class="btn" type="button" data-action="monde-retirer-non">Non</button>` : `<button class="btn" type="button" data-action="monde-retirer" data-compte="${echapper(m.compte)}">Retirer</button>`)
    : ''}</div>`).join('');
  const inv = !proprio ? '<p class="muted">Seul le propriétaire du monde invite et retire des membres.</p>'
    : invitation ? `<p class="muted">Envoie ce lien à un ami (il vaut 7 jours et ne sert qu'une fois) : en l'ouvrant, il entre dans ton monde pour y construire avec toi.</p>
      <textarea id="invitation-lien" rows="3" readonly>${echapper(invitation)}</textarea>
      <div class="row"><button class="btn" type="button" data-action="monde-copier">Copier</button>${typeof navigator !== 'undefined' && navigator.share ? '<button class="btn" type="button" data-action="monde-partager">Partager</button>' : ''}</div>`
      : '<div class="row"><button class="btn primary" type="button" data-action="monde-inviter">Inviter un ami</button></div><p class="muted">Un lien à envoyer à un ami : il entre dans ton monde comme bâtisseur (il construit avec toi).</p>';
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="membres-titre">👥 Les membres</h2>
    <div class="stack">${lignes}</div>
    <div class="stack">${inv}</div>`, { labelledBy: 'membres-titre' });
}

async function inviter() {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/invitations`, { corps: {} });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'Le lien n\'a pas pu être créé.'}`); return; }
  invitation = r.lien;
  ouvrirMembres();
}

async function retirer(compte) {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/retirer`, { corps: { compte } });
  aRetirer = null;
  notify(r.ok ? '🌐 Retiré du monde.' : `🌐 ${r.erreur || 'Le retrait a échoué.'}`);
  if (!r.ok) ouvrirMembres();
}

// Un lien d'invitation ouvert (jeu.html#invitation=<monde>.<secret>) : connecté, on entre dans le monde ;
// sinon, il attend la connexion (⚙️ Options › Jeu en ligne). Le fragment est retiré de l'adresse.
const CLE_INVITATION = 'ferme-invitation';
export async function invitationDuLien() {
  const m = /(?:^#|&)invitation=(m-[A-Za-z0-9_-]{16,40}\.[A-Za-z0-9_-]{32})/.exec(typeof location !== 'undefined' ? location.hash : '');
  let code = m ? m[1] : null;
  if (m) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ } }
  if (!code) { try { code = localStorage.getItem(CLE_INVITATION); } catch (e) { code = null; } }
  if (!code) return;
  if (!compteGarde()) {
    try { localStorage.setItem(CLE_INVITATION, code); } catch (e) { /* (rien) */ }
    notify('🌐 Une invitation t\'attend : connecte-toi (⚙️ Options › Jeu en ligne), et tu entreras dans le monde de ton ami.', { duree: 8000 });
    return;
  }
  try { localStorage.removeItem(CLE_INVITATION); } catch (e) { /* (rien) */ }
  const r = await appelServeur('/rejoindre', { corps: { code } });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'Cette invitation n\'a pas pu servir.'}`); return; }
  notify(`🌐 Bienvenue dans « ${r.titre || 'le monde de ton ami'} » !`);
  setTimeout(() => { location.href = `jeu.html?monde=${encodeURIComponent(r.monde)}`; }, 800);
}
quandConnecte(() => { invitationDuLien(); });
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (/invitation=/.test(location.hash)) invitationDuLien(); });

registerActions({
  // (la partie solo, intacte sur l'appareil, rouverte)
  'monde-quitter': () => { fermer(); location.href = 'jeu.html'; },
  'monde-membres': () => { invitation = null; aRetirer = null; ouvrirMembres(); },
  'monde-inviter': () => { inviter(); },
  'monde-copier': () => {
    const z = document.getElementById('invitation-lien');
    if (!z) return;
    z.select();
    try { navigator.clipboard.writeText(z.value).then(() => notify('📋 Lien copié.'), () => notify('Le lien est sélectionné : copie-le.')); } catch (e) { notify('Le lien est sélectionné : copie-le.'); }
  },
  'monde-partager': () => { try { navigator.share({ title: 'Ferme Familiale', text: 'Viens construire dans ma ferme !', url: invitation }); } catch (e) { /* (rien) */ } },
  'monde-retirer': (target) => { aRetirer = target.dataset.compte; ouvrirMembres(); },
  'monde-retirer-non': () => { aRetirer = null; ouvrirMembres(); },
  'monde-retirer-oui': (target) => { retirer(target.dataset.compte); },
});

// (pour les tests) la connexion en cours
export const _lien = () => lien;
