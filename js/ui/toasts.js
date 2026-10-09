import { DATA } from '../engine/catalog.js';
import { findDevice } from '../engine/devices.js';
import { alertEvents, alertSnapshot } from '../engine/alerts.js';
import { formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { cibleAlerte } from './stage.js';
import { deviceName } from './ferme.js';

/* ---------- Lot 11 : notifications légères ---------- */

// Pile de notifications en bas de l'écran (au plus NOTIFY_MAX), annoncées aux
// lecteurs d'écran (#toast-root est une région aria-live). Une notification
// identique à une notification affichée la remplace au lieu de s'empiler.
const NOTIFY_MAX = 3;
const NOTIFY_MS = { info: 2600, alerte: 5000, repas: 5000, lettre: 7000 };
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

// `cible` (voir cibleAlerte) : la notification devient un bouton qui mène au menu concerné.
export function notify(message, kind = 'info', cible = null) {
  const root = document.getElementById('toast-root');
  for (const el of Array.from(root.children)) {
    if (el.dataset.msg === message) el.remove();
  }
  const el = document.createElement(cible ? 'button' : 'div');
  el.className = `toast ${kind}${cible ? ' toast-link' : ''}`;
  el.dataset.msg = message;
  el.textContent = message;
  if (cible) {
    el.type = 'button';
    el.dataset.action = 'aller';
    if (cible.page) el.dataset.page = cible.page;
    if (cible.ecran) el.dataset.screen = cible.ecran;
    if (cible.fenetre) el.dataset.window = cible.fenetre;
    if (cible.onglet || cible.sous) el.dataset.tab = cible.onglet || cible.sous;
    if (cible.ancre) el.dataset.anchor = cible.ancre;
    el.insertAdjacentHTML('beforeend', '<span class="toast-go" aria-hidden="true"> ›</span>');
    el.addEventListener('click', () => setTimeout(() => el.remove(), 0));
  }
  root.appendChild(el);
  while (root.children.length > NOTIFY_MAX) root.firstElementChild.remove();
  setTimeout(() => el.remove(), NOTIFY_MS[kind] || NOTIFY_MS.info);
}

export function showToast(message) {
  notify(message, 'info');
}

function alertMessage(ev) {
  const d = ev.id ? findDevice(state, ev.id) : null;
  const name = d ? deviceName(d) : '';
  switch (ev.type) {
    case 'panne': return `⛔ ${name} en panne : il faut le réparer.`;
    case 'entretien': return `⚠️ ${name} : usure à ${formatNumber(DATA.WEAR.SERVICE_THRESHOLD)} %, pense à l'entretenir.`;
    case 'batteriesVides': return '🔋 Batterie vide : la pompe et les ateliers attendent le soleil.';
    case 'frigoCoupe': return '🧊 Réfrigérateur hors tension : il manque d\'énergie.';
    case 'pailleManque': return `${DATA.items[DATA.PATURAGE.nourriture].icone} Il manque de la paille pour les animaux cette nuit : mouds du blé au Moulin.`;
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
      notify(msg, 'alerte', cibleAlerte(ev.type, ev.id));
      tel('alert', ev.type);
    }
  }
  alertState = now;
}
