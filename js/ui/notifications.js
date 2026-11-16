import { getNotifications } from '../engine/alerts.js';
import { state } from './store.js';
import { cibleAttrs, cibleNom, notifCible } from './stage.js';
import { plural } from './common.js';

/* ---------- Notifications ---------- */

// Chaque ligne mène là où l'alerte se règle (voir notifCible) : une fenêtre de la carte,
// avec la carte glissée jusqu'au bâtiment, ou l'Inventaire pour la péremption. Sans la
// carte : la liste de la Ferme, ou la page du Livre de recette.

// fenetre : dans la fenêtre flottante de la carte (son titre est dans l'en-tête).
export function renderNotifications(fenetre = false) {
  const list = getNotifications(state);
  const items = list
    .map((n) => {
      const c = notifCible(n);
      const ou = cibleNom(c);
      return `<li><button type="button" class="notif p${n.priorite}" ${cibleAttrs(c)}><span class="notif-icon" aria-hidden="true">${n.icone}</span><span class="notif-text">${n.texte}<span class="notif-where">${ou}</span></span><span class="notif-go" aria-hidden="true">›</span></button></li>`;
    })
    .join('');
  // (le courrier d'avant est retiré à la bascule, I9h)
  return `
    ${fenetre ? '' : '<h2>✉️ Notifications</h2>'}
    ${list.length
      ? `<p class="hint">${plural(list.length, 'chose')} à voir aujourd'hui.</p><ul class="notif-list">${items}</ul>`
      : '<p class="hint notif-empty">Rien à signaler aujourd\'hui. 🌾</p>'}`;
}
