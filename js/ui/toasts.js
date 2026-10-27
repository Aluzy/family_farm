import { DATA } from '../engine/catalog.js';
import { findDevice } from '../engine/devices.js';
import { alertEvents, alertSnapshot } from '../engine/alerts.js';
import { formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { cibleAlerte } from './stage.js';
import { deviceName } from './ferme.js';
import { cumulSuivant } from './notif-cumul.js';

/* ---------- Lot 11 : notifications légères ---------- */

// Pile de notifications en bas de l'écran (au plus NOTIFY_MAX), annoncées aux
// lecteurs d'écran (#toast-root est une région aria-live, non atomique : seule la
// notification qui arrive ou qui change est lue, pas toute la pile). Une notification
// identique à une notification affichée la remplace au lieu de s'empiler ; un geste répété
// (option `cumul` de notify) fait monter la quantité d'une seule notification.
const NOTIFY_MAX = 3;
// Durée d'affichage : de quoi lire le texte (NOTIFY_MS_PAR_SIGNE par signe), entre
// NOTIFY_MS_MIN et NOTIFY_MS_MAX ; une alerte, un repas ou une lettre restent au moins
// leur durée propre.
const NOTIFY_MS_MIN = 2600;
const NOTIFY_MS_MAX = 7000;
const NOTIFY_MS_PAR_SIGNE = 60;
const NOTIFY_MS = { info: NOTIFY_MS_MIN, alerte: 5000, repas: 5000, lettre: NOTIFY_MS_MAX };

export function notifyDuration(message, kind = 'info') {
  const lecture = 1000 + String(message).length * NOTIFY_MS_PAR_SIGNE;
  const min = NOTIFY_MS[kind] || NOTIFY_MS_MIN;
  return Math.max(min, Math.min(NOTIFY_MS_MAX, lecture));
}
// Une même alerte n'est pas répétée avant ce délai (batteries qui se vident et
// se rechargent au fil des ticks, par exemple).
const ALERT_REPEAT_MS = 30000;
const lastAlertAt = new Map();
let alertState = null; // dernière photo des alertes (voir alertSnapshot)
export function setAlertState(value) {
  alertState = value;
  return value;
}
// Juste après un rattrapage hors-ligne, l'écran d'absence fait le bilan : les
// alertes des toutes premières secondes (frigo qui s'arrête sur un reste de
// charge, par exemple) seraient redondantes.
export const ALERT_MUTE_AFTER_CATCH_UP_MS = 3000;
let alertMuteUntil = 0;
export function setAlertMuteUntil(value) {
  alertMuteUntil = value;
  return value;
}

// L'unique façon d'afficher un message au joueur. `kind` : 'info' (par défaut), 'alerte',
// 'repas' ou 'lettre' ; `cible` (voir cibleAlerte) : la notification devient un bouton qui
// mène au menu concerné ; `duree` (ms) : à la place de la durée de lecture (notifyDuration) ;
// `cumul` (fiche 10) : { cle, quantites, texte } pour un geste que le joueur répète vite. Si une
// notification de même `cle` est encore affichée, `quantites` ({ nom: nombre }, négatif pour une
// dépense) s'ajoute à ses totaux, son texte devient `texte(totaux)` et elle repart pour une durée
// complète, sans nouvelle notification ; sinon elle naît avec `texte(quantites)`. Dans ce cas
// `message` est ignoré (on peut passer null).
export function notify(message, { kind = 'info', cible = null, duree = 0, cumul = null } = {}) {
  if (cumul) { notifyCumul(cumul, { kind, cible, duree }); return; }
  const root = document.getElementById('toast-root');
  for (const el of Array.from(root.children)) {
    if (el.dataset.msg === message) el.remove();
  }
  const el = toastElement(message, kind, cible);
  ajouter(root, el);
  setTimeout(() => el.remove(), duree || notifyDuration(message, kind));
}

// L'élément d'une notification (un bouton s'il a une cible).
function toastElement(message, kind, cible) {
  const el = document.createElement(cible ? 'button' : 'div');
  el.className = `toast ${kind}${cible ? ' toast-link' : ''}`;
  ecrire(el, message, cible);
  if (cible) {
    el.type = 'button';
    el.dataset.action = 'aller';
    if (cible.page) el.dataset.page = cible.page;
    if (cible.ecran) el.dataset.screen = cible.ecran;
    if (cible.fenetre) el.dataset.window = cible.fenetre;
    if (cible.onglet || cible.sous) el.dataset.tab = cible.onglet || cible.sous;
    if (cible.ancre) el.dataset.anchor = cible.ancre;
    el.addEventListener('click', () => setTimeout(() => el.remove(), 0));
  }
  return el;
}

function ecrire(el, message, cible) {
  el.dataset.msg = message;
  el.textContent = message;
  if (cible) el.insertAdjacentHTML('beforeend', '<span class="toast-go" aria-hidden="true"> ›</span>');
}

function ajouter(root, el) {
  root.appendChild(el);
  while (root.children.length > NOTIFY_MAX) root.firstElementChild.remove();
}

// Les notifications cumulées encore suivies : cle → { el, totaux, finA, minuteur, calme }.
// Une entrée dont l'élément a quitté la pile (poussée par d'autres, touchée) ne compte plus.
const cumuls = new Map();
// Pendant une rafale d'appuis, la notification est marquée aria-busy : les lecteurs d'écran
// attendent ce délai sans nouvel appui pour lire la quantité, une seule fois, au lieu de
// « +1 », « +2 », « +3 »… à la suite.
const CUMUL_CALME_MS = 700;

function notifyCumul({ cle, quantites, texte }, { kind, cible, duree }) {
  const root = document.getElementById('toast-root');
  const t = Date.now();
  let suivi = cumuls.get(cle);
  if (suivi && !suivi.el.isConnected) suivi = null;
  const { totaux, nouvelle } = cumulSuivant(suivi, quantites, t);
  const message = texte(totaux);
  const ms = duree || notifyDuration(message, kind);
  if (nouvelle) {
    if (suivi) suivi.el.remove();
    for (const el of Array.from(root.children)) {
      if (el.dataset.msg === message) el.remove();
    }
    const el = toastElement(message, kind, cible);
    el.dataset.cumul = cle;
    // le toast se lit en entier quand sa quantité change (et non seulement le texte modifié)
    el.setAttribute('aria-atomic', 'true');
    ajouter(root, el);
    suivi = { el };
  } else {
    clearTimeout(suivi.minuteur);
    clearTimeout(suivi.calme);
    suivi.el.setAttribute('aria-busy', 'true');
    ecrire(suivi.el, message, cible);
    const el = suivi.el;
    suivi.calme = setTimeout(() => el.removeAttribute('aria-busy'), CUMUL_CALME_MS);
  }
  const el = suivi.el;
  suivi.totaux = totaux;
  suivi.finA = t + ms;
  suivi.minuteur = setTimeout(() => {
    el.remove();
    if (cumuls.get(cle) === suivi) cumuls.delete(cle);
  }, ms);
  cumuls.set(cle, suivi);
}

// Pour js/ui/excursion.js (FermeHote.say des autres cartes) : une notification simple.
export function showToast(message) {
  notify(message);
}

function alertMessage(ev) {
  const d = ev.id ? findDevice(state, ev.id) : null;
  const name = d ? deviceName(d) : '';
  switch (ev.type) {
    case 'panne': return `⛔ ${name} en panne : il faut le réparer.`;
    case 'entretien': return `⚠️ ${name} : usure à ${formatNumber(DATA.USURE.SEUIL_ENTRETIEN)} %, pense à l'entretenir.`;
    case 'batteriesVides': return '🔋 Batterie vide : la pompe et les ateliers attendent le soleil.';
    case 'frigoCoupe': return '🧊 Réfrigérateur hors tension : il manque d\'énergie.';
    case 'pailleManque': return `${DATA.OBJETS[DATA.PATURAGE.NOURRITURE].icone} Il manque de la paille pour les animaux cette nuit : fauche l'herbe haute (la faux en main) et jette ses fibres dans la botteleuse.`;
    default: return '';
  }
}

// Compare la situation à la précédente et annonce ce qui vient d'arriver.
export function watchAlerts() {
  const now = alertSnapshot(state);
  if (alertState && Date.now() >= alertMuteUntil) {
    const t = Date.now();
    for (const ev of alertEvents(alertState, now)) {
      const msg = alertMessage(ev);
      if (!msg || t - (lastAlertAt.get(msg) || 0) < ALERT_REPEAT_MS) continue;
      lastAlertAt.set(msg, t);
      notify(msg, { kind: 'alerte', cible: cibleAlerte(ev.type, ev.id) });
      tel('alert', ev.type);
    }
  }
  alertState = now;
}
