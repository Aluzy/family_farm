import { DATA } from '../engine/catalog.js';
import { withFamilyName } from './depart.js';
import { mailbox, mailReceived, readMail } from '../engine/campaign.js';
import { getNotifications } from '../engine/alerts.js';
import { formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { cibleAttrs, cibleNom, notifCible } from './stage.js';
import { registerActions } from './actions.js';

/* ---------- Notifications ---------- */

// Chaque ligne mène là où l'alerte se règle (voir notifCible) : une fenêtre de la carte,
// avec la carte glissée jusqu'au bâtiment, ou l'Inventaire pour la péremption. Sans la
// carte : la liste de la Ferme, ou la page du Livre de recette.

// Version 1.3 : une lettre du courrier, dans la liste des Notifications.
function mailRow(l) {
  const def = DATA.COURRIER[l.id];
  return `<li><button type="button" class="notif mail${l.lu ? ' lu' : ''}" data-action="mail-open" data-id="${l.id}" aria-label="${def.objet}, de ${def.expediteur}${l.lu ? '' : ' (non lue)'}. Ouvrir la lettre"><span class="notif-icon" aria-hidden="true">${l.lu ? '📭' : '📬'}</span><span class="notif-text">${def.objet}${l.lu ? '' : '<span class="mail-new">Nouveau</span>'}<span class="notif-where">De : ${def.expediteur} · reçue la nuit ${formatNumber(l.nuit)}</span></span><span class="notif-go" aria-hidden="true">›</span></button></li>`;
}

export function renderNotifications() {
  const list = getNotifications(state);
  const lettres = mailbox(state).filter((l) => DATA.COURRIER[l.id]);
  const aLire = lettres.filter((l) => !l.lu);
  const lues = lettres.filter((l) => l.lu);
  const items = list
    .map((n) => {
      const c = notifCible(n);
      const ou = cibleNom(c);
      return `<li><button type="button" class="notif p${n.priorite}" ${cibleAttrs(c)}><span class="notif-icon" aria-hidden="true">${n.icone}</span><span class="notif-text">${n.texte}<span class="notif-where">${ou}</span></span><span class="notif-go" aria-hidden="true">›</span></button></li>`;
    })
    .join('');
  // Le courrier à lire passe en premier ; les lettres déjà lues restent en bas, pour les relire.
  return `
    <h2>✉️ Notifications</h2>
    ${aLire.length ? `<h3 class="section-title">📬 Courrier</h3><ul class="notif-list">${aLire.map(mailRow).join('')}</ul>` : ''}
    ${list.length
      ? `<p class="hint${aLire.length ? ' mail-title' : ''}">${list.length} chose${list.length > 1 ? 's' : ''} à voir aujourd'hui.</p><ul class="notif-list">${items}</ul>`
      : `<p class="hint notif-empty">${aLire.length ? 'Rien d\'autre à signaler aujourd\'hui.' : 'Rien à signaler aujourd\'hui.'} 🌾</p>`}
    ${lues.length ? `<h3 class="section-title mail-title">📭 Courrier lu</h3><ul class="notif-list">${lues.map(mailRow).join('')}</ul>` : ''}`;
}

// Ouvre une lettre : elle est marquée lue (elle reste dans le courrier).
function openMailModal(id) {
  const def = DATA.COURRIER[id];
  if (!def || !mailReceived(state, id)) return;
  tel('modal', 'mail');
  // L'annonce d'arrivée n'a plus lieu d'être : elle cacherait le bas de la lettre.
  for (const t of document.querySelectorAll('#toast-root .toast.lettre')) t.remove();
  const lu = readMail(state, id);
  persistState();
  const pieces = lu && lu.ok ? lu.pieces : 0; // version 1.14 : l'héritage versé à l'ouverture
  const cadeaux = Object.entries(def.cadeaux || {})
    .map(([item, n]) => `${formatNumber(n)} <span aria-hidden="true">${DATA.items[item].icone}</span> ${DATA.items[item].nom}`)
    .join(' · ');
  // Les cadeaux de cette lettre se plantent dans la Serre : un raccourci y mène si la carte l'affiche.
  const serre = def.quand && def.quand.debloque === 'serre';
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal letter" role="dialog" aria-modal="true" aria-labelledby="mail-title" data-stop-propagation>
        <p class="letter-place">${def.lieu}</p>
        <h2 id="mail-title">${def.icone} ${def.objet}</h2>
        <div class="letter-body">${def.texte.map((p) => `<p>${withFamilyName(p)}</p>`).join('')}</div>
        <p class="letter-sign">${def.signature}</p>
        ${DATA.COURRIER[id].pieces ? `<div class="letter-gifts"><strong>Dans l'enveloppe</strong><span class="letter-gift-list">${formatNumber(DATA.COURRIER[id].pieces)} <span aria-hidden="true">💰</span> pièces</span><span class="muted">${pieces ? 'Versées à l\'instant.' : 'Déjà versées.'}</span></div>` : ''}
        ${cadeaux ? `<div class="letter-gifts"><strong>Dans l'enveloppe</strong><span class="letter-gift-list">${cadeaux}</span><span class="muted">Déjà rangés dans ton inventaire.${serre ? ' Ils se plantent dans la Serre, et nulle part ailleurs.' : ''}</span></div>` : ''}
        <div class="row">
          ${serre ? `<button type="button" class="btn primary" ${cibleAttrs({ fenetre: 'serre' })}>Aller à la Serre</button>` : ''}
          <button type="button" class="btn${serre ? '' : ' primary'}" data-action="close-modal" id="mail-close">Fermer</button>
        </div>
      </div>
    </div>`;
  // Le focus va sur « Fermer » sans faire défiler : la lettre se lit depuis son en-tête.
  document.getElementById('mail-close').focus({ preventScroll: true });
  refresh();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  // ----- version 1.3 : courrier -----
  'mail-open': (target) => {
    openMailModal(target.dataset.id);
  },
});
