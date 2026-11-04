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

const CLE = 'ferme-compte';

// L'adresse du Worker : celle du site publié ; en local, le serveur d'essai (s'il sert /compte/).
export function adresseServeur(host = typeof location !== 'undefined' ? location.hostname : '') {
  if (host === 'aluzy.github.io') return 'https://family-farm.contact-voidr.workers.dev';
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
async function appel(chemin, { methode = 'POST', corps } = {}) {
  const base = adresseServeur();
  if (!base) return { ok: false, erreur: 'Le jeu en ligne n\'est pas disponible ici.' };
  const c = compteGarde();
  try {
    const r = await fetch(base + '/compte/' + chemin, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(c ? { Authorization: `Bearer ${c.session}` } : {}) },
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
const echapper = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
function redessiner() {
  const z = document.getElementById('compte-zone');
  if (z) morph(z, compteHtml());
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
  'compte-lien': () => { demanderLien(); },
  'compte-autre': () => { envoye = null; redessiner(); },
  'compte-deconnexion': () => { deconnecter(); },
  'compte-supprimer': () => { confirmer = true; redessiner(); },
  'compte-supprimer-non': () => { confirmer = false; redessiner(); },
  'compte-supprimer-oui': () => { supprimer(); },
});
