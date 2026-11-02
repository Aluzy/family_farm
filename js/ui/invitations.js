import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatDay } from '../engine/format.js';
import { asleep } from '../engine/night.js';
import { countItem } from '../engine/inventory.js';
import { setupPending } from '../engine/depart.js';
import { amitieAvec } from '../engine/amitie.js';
import {
  INVITATION, annulerInvitation, invitation, invitationDuMoment, invitationsAVenir, invitesModele, inviter, platsServables,
  relationsInvitables, reponsesAAnnoncer, servirRepas,
} from '../engine/invitations.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- les invitations à un repas, côté page (js/engine/invitations.js) ----------

   - le calendrier (js/ui/calendrier.js) : un jour à venir se touche (« Créer un évènement ») ; ses
     évènements sont marqués 🍽️, et listés dessous (annulables) ;
   - la fenêtre « Créer un évènement » : inviter à un repas, le jour, le moment, les personnes (celles à qui
     l'on a déjà parlé) ; Achille, le cocher, porte le message ;
   - au matin, les réponses (watchInvitations) ; le jour dit, l'annonce des invités en route ;
   - la carte (js/carte/ferme/invites.js) : le modèle (invitesPourLaCarte), le pont (invitesDepuisCarte) : le
     personnage vient à table, la fenêtre « Servir le repas » s'ouvre. */

const MOMENTS = INVITATION.MOMENTS;
const liste = (noms) => (noms.length < 2 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`);
const leJour = (jour) => (jour === state.day ? 'aujourd\'hui' : jour === state.day + 1 ? 'demain' : formatDay(jour).toLowerCase().replace(/^(\S+)/, 'le $1'));

/* -- le calendrier -- */

// Les jours du calendrier qui ont un évènement : { jour: [invitation] }.
export function evenementsParJour() {
  const out = {};
  for (const inv of invitationsAVenir(state)) (out[inv.jour] = out[inv.jour] || []).push(inv);
  return out;
}

// Peut-on créer un évènement ce jour-là ?
export function jourInvitable(jour) {
  return jour >= state.day + INVITATION.DELAI[0] && jour <= state.day + INVITATION.DELAI[1];
}

function etatTexte(inv) {
  if (inv.etat === 'envoyee') return '✉️ Achille porte le message : réponses demain matin';
  if (inv.etat === 'servie') return '😊 Repas partagé';
  const oui = inv.invites.filter((q) => q.reponse === 'oui').map((q) => escapeHtml(q.prenom));
  const non = inv.invites.filter((q) => q.reponse === 'non').map((q) => escapeHtml(q.prenom));
  return [oui.length ? `✅ ${liste(oui)} ${oui.length > 1 ? 'viendront' : 'viendra'}` : '', non.length ? `❌ ${liste(non)} ne ${non.length > 1 ? 'pourront' : 'pourra'} pas` : ''].filter(Boolean).join(' · ') || 'Personne ne viendra';
}

// Sous la grille du calendrier : les évènements à venir, et de quoi en créer un.
export function renderEvenements() {
  const L = invitationsAVenir(state);
  const lignes = L.map((inv) => {
    const M = MOMENTS[inv.moment], qui = inv.invites.map((q) => escapeHtml(q.prenom));
    const annulable = inv.etat !== 'servie' && !(inv.jour === state.day && invitationDuMoment(state) === inv);
    return `<li class="evt"><span class="evt-quand"><span aria-hidden="true">🍽️</span> <strong>${escapeHtml(formatDay(inv.jour))}</strong>, ${M.icone} ${M.nom}</span>
      <span>Avec ${liste(qui)}.</span><span class="muted">${etatTexte(inv)}</span>
      ${annulable ? `<button type="button" class="btn evt-annuler" data-action="evt-annuler" data-id="${inv.id}">Annuler</button>` : ''}</li>`;
  }).join('');
  return `
    <div class="evenements" id="evenements">
      <strong class="evt-titre">🍽️ Évènements</strong>
      ${lignes ? `<ul class="evt-liste">${lignes}</ul>` : '<span class="muted">Aucun évènement prévu. Touche un jour à venir pour inviter des amis à un repas.</span>'}
      <button type="button" class="btn primary" data-action="evt-open" data-jour="${state.day + 1}">＋ Créer un évènement</button>
    </div>`;
}

/* -- la fenêtre « Créer un évènement » -- */

function openEvenement(jour) {
  const j = jourInvitable(jour) ? jour : state.day + 1;
  const R = relationsInvitables(state);
  const jours = Array.from({ length: INVITATION.DELAI[1] - INVITATION.DELAI[0] + 1 }, (_, k) => state.day + INVITATION.DELAI[0] + k)
    .map((d) => `<option value="${d}"${d === j ? ' selected' : ''}>${escapeHtml(formatDay(d))}${d === state.day + 1 ? ' (demain)' : ''}</option>`).join('');
  const moments = Object.entries(MOMENTS).map(([id, M], k) => `<label class="evt-choix"><input type="radio" name="evt-moment" value="${id}"${k === 0 ? ' checked' : ''}> ${M.icone} ${M.nom[0].toUpperCase() + M.nom.slice(1)} (${M.heure} h)</label>`).join('');
  const gens = R.map((r) => `<label class="evt-choix evt-invite"><input type="checkbox" name="evt-qui" value="${escapeHtml(r.hameau)}|${escapeHtml(r.id)}"> <strong>${escapeHtml(r.prenom)}</strong> <span class="muted">${escapeHtml(r.metier)} · ${escapeHtml(r.hameauNom)} · 💛 ${escapeHtml(r.nomPalier)}</span></label>`).join('');
  openModal(`
    <h2 id="evt-titre">📅 Créer un évènement</h2>
    <form class="evt-form" data-evt-form>
      <fieldset class="evt-groupe"><legend>L'évènement</legend>
        <label class="evt-choix"><input type="radio" name="evt-sorte" value="repas" checked> 🍽️ Inviter à un repas</label>
      </fieldset>
      <label class="evt-groupe">Le jour <select name="evt-jour">${jours}</select></label>
      <fieldset class="evt-groupe"><legend>Le moment</legend>${moments}</fieldset>
      <fieldset class="evt-groupe"><legend>Qui inviter ? (${INVITATION.INVITES_MAX} au plus)</legend>
        ${gens || '<p class="muted">Tu ne connais encore personne : va parler aux habitants des hameaux.</p>'}
      </fieldset>
      <p class="muted">Achille, le cocher, portera ton message pendant sa tournée : les réponses arriveront demain matin. Le jour dit, tes invités viendront s'asseoir à ta table (une table de jardin et ses chaises, ou celle de la maison) : viens les rejoindre pour servir le repas.</p>
      <div class="evt-boutons">
        <button type="button" class="btn primary" data-action="evt-inviter"${R.length ? '' : ' disabled'}>✉️ Confier à Achille</button>
        <button type="button" class="btn" data-action="close-modal">Fermer</button>
      </div>
    </form>`, { labelledBy: 'evt-titre', className: 'modal bois evt-modal' });
}

/* -- au matin, le jour dit -- */

// À chaque image (js/ui/loop.js) : les réponses rapportées par Achille (au matin) ; l'annonce des invités qui
// arrivent.
export function watchInvitations() {
  if (!state || setupPending(state) || asleep(state)) return;
  const R = reponsesAAnnoncer(state);
  for (const r of R) {
    const M = MOMENTS[r.moment];
    const oui = r.oui.map(escapeHtml), non = r.non.map(escapeHtml);
    const quand = `${M.nom} ${leJour(r.jour)}`;
    const texte = oui.length
      ? `✉️ Achille a porté ton invitation pour ${quand} : ${liste(oui)} ${oui.length > 1 ? 'viendront' : 'viendra'} avec plaisir${non.length ? ` ; ${liste(non)} ne ${non.length > 1 ? 'pourront' : 'pourra'} pas` : ''}.`
      : `✉️ Achille a porté ton invitation pour ${quand} : ${liste(non)} ne ${non.length > 1 ? 'pourront' : 'pourra'} pas venir, cette fois.`;
    notify(texte, { kind: 'info', cible: { fenetre: 'calendrier' } });
  }
  const inv = invitationDuMoment(state);
  let sauve = R.length > 0;
  if (inv && !inv.prevenu) {
    inv.prevenu = true;
    sauve = true;
    const oui = inv.invites.filter((q) => q.reponse === 'oui').map((q) => escapeHtml(q.prenom));
    notify(`🍽️ ${liste(oui)} ${oui.length > 1 ? 'arrivent' : 'arrive'} pour ${MOMENTS[inv.moment].nom} (${MOMENTS[inv.moment].heure} h) : viens ${oui.length > 1 ? 'les' : 'le'} rejoindre à table !`, { kind: 'info' });
  }
  if (sauve) { persistState(); refresh(); }
}

/* -- la carte -- */

// Pour le modèle de la carte : l'invitation du moment (js/engine/invitations.js invitesModele), ou null.
export function invitesPourLaCarte() {
  return invitesModele(state);
}

let terrasse = false;

// Le pont de la carte : `geste` « table » (le personnage vient à table : la fenêtre « Servir le repas » ;
// `o.terrasse` : la table est une table de jardin).
export function invitesDepuisCarte(geste, o = {}) {
  if (geste !== 'table') return null;
  const inv = invitationDuMoment(state);
  if (!inv || inv.etat !== 'repondue' || asleep(state)) return null;
  if (document.querySelector('#modal-root .repas-modal')) return null;
  terrasse = !!o.terrasse;
  openServir(inv);
  return true;
}

function openServir(inv) {
  const P = platsServables(state), R = INVITATION.REPAS;
  const invites = inv.invites.filter((q) => q.reponse === 'oui');
  const amis = invites.map((q) => amitieAvec(state, q.hameau, q.id)).filter(Boolean);
  const marques = (it) => amis.map((A) => {
    const g = A.gouts[it];
    return g === 'adore' ? `❤️ ${escapeHtml(A.prenom)}` : g === 'aime' ? `👍 ${escapeHtml(A.prenom)}` : g === 'deteste' ? `👎 ${escapeHtml(A.prenom)}` : '';
  }).filter(Boolean).join(' ');
  const plats = P.map((it) => {
    const o = DATA.OBJETS[it], m = marques(it);
    return `<label class="evt-choix repas-plat"><input type="checkbox" name="repas-plat" value="${it}"> <span aria-hidden="true">${o.icone}</span> ${escapeHtml(o.nom)} <span class="muted num">×${countItem(state, it)}</span>${m ? ` <span class="repas-gouts">${m}</span>` : ''}</label>`;
  }).join('');
  openModal(`
    <h2 id="repas-titre">🍽️ ${MOMENTS[inv.moment].nom[0].toUpperCase() + MOMENTS[inv.moment].nom.slice(1)} avec ${liste(invites.map((q) => escapeHtml(q.prenom)))}</h2>
    <form class="evt-form" data-evt-form>
      <p>${terrasse ? 'Sur ta terrasse, à la table de jardin.' : 'À ta table.'} Que sers-tu ? (${R.PLATS_MAX} plats au plus, un de chaque)</p>
      <div class="repas-plats">${plats || '<p class="muted">Rien à servir : un plat cuisiné, un fruit, une conserve. Un repas tout simple fait plaisir aussi.</p>'}</div>
      <p class="muted">Un plat qu'ils aiment rapproche davantage ; la famille, attablée avec eux, sera plus heureuse cette nuit.</p>
      <div class="evt-boutons">
        <button type="button" class="btn primary" data-action="repas-servir" data-id="${inv.id}">🍽️ Servir le repas</button>
        <button type="button" class="btn" data-action="close-modal">Pas encore</button>
      </div>
    </form>`, { labelledBy: 'repas-titre', className: 'modal bois evt-modal repas-modal' });
}

const formDe = (target) => (target.closest('[data-evt-form]') || document.querySelector('#modal-root [data-evt-form]'));

registerActions({
  'evt-open': (target) => {
    openEvenement(Number(target.dataset.jour));
  },
  'evt-inviter': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const f = formDe(target);
    if (!f) return;
    const jour = Number(f.querySelector('[name="evt-jour"]').value);
    const moment = (f.querySelector('[name="evt-moment"]:checked') || {}).value;
    const qui = [...f.querySelectorAll('[name="evt-qui"]:checked')].map((x) => { const [hameau, id] = x.value.split('|'); return { hameau, id }; });
    const r = inviter(state, jour, moment, qui);
    if (!r.ok) { notify(r.error, { son: 'erreur' }); return; }
    closeModal();
    persistState();
    refresh();
    const M = MOMENTS[moment];
    notify(`✉️ Achille portera ton invitation pour ${M.nom} ${leJour(jour)} à ${liste(r.invitation.invites.map((q) => escapeHtml(q.prenom)))} : les réponses demain matin.`, { kind: 'info' });
  },
  'evt-annuler': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const inv = invitation(state, target.dataset.id);
    const r = annulerInvitation(state, target.dataset.id);
    if (!r.ok) { notify(r.error, { son: 'erreur' }); return; }
    persistState();
    refresh();
    if (inv) notify(`Invitation annulée${inv.etat === 'repondue' ? ' : Achille préviendra tes invités' : ''}.`, { kind: 'info' });
  },
  'repas-servir': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const f = formDe(target);
    const plats = f ? [...f.querySelectorAll('[name="repas-plat"]:checked')].map((x) => x.value) : [];
    const r = servirRepas(state, target.dataset.id, plats, terrasse);
    if (!r.ok) { notify(r.error, { son: 'erreur' }); return; }
    closeModal();
    persistState();
    refresh();
    const servis = r.plats.map((it) => `${DATA.OBJETS[it].icone} ${escapeHtml(DATA.OBJETS[it].nom)}`);
    const qui = r.invites.map((x) => `${escapeHtml(x.prenom)} +${x.points}`).join(', ');
    notify(`🍽️ ${servis.length ? `Au menu : ${servis.join(', ')}.` : 'Un repas tout simple.'} 💛 ${qui}. La famille est heureuse de ce moment partagé.`, { kind: 'info' });
    for (const x of r.invites) if (x.emotion && window.FarmStage && window.FarmStage.emotion) window.FarmStage.emotion(x.id, x.emotion);
  },
});
