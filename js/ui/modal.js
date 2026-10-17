import { registerActions } from './actions.js';

/* ---------- fenêtres de #modal-root : ouverture, focus, fermeture ---------- */

// Toutes les fenêtres (aide, comptes, niveaux, fiche d'un objet…) passent par openModal :
// le même cadre (fond qui ferme d'un appui, boîte de dialogue), le focus posé dedans, gardé
// dedans par Tab et Maj+Tab (voir trapFocus, events.js), et rendu à l'élément qui l'avait
// quand elle se ferme (bouton ✕, fond, Échap).

let restoreFocus = null; // rend le focus à l'élément qui a ouvert la fenêtre
let onCloseModal = null; // à faire quand la fenêtre se ferme (acquitter un chapitre, un niveau…)

function modalRoot() {
  return document.getElementById('modal-root');
}

export function modalDialog() {
  return modalRoot().querySelector('[role="dialog"]');
}

// Retient l'élément qui a le focus ; la fonction renvoyée le lui rend, si le focus n'est pas
// déjà allé ailleurs entre-temps. Un bouton redessiné entre-temps est retrouvé par son id ou
// par son data-action (et ses data-window, data-id, data-item, data-tab).
export function rememberFocus() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return () => {};
  const keys = ['window', 'id', 'item', 'tab', 'lieu'];
  const sel = el.id
    ? `#${CSS.escape(el.id)}`
    : el.dataset && el.dataset.action
      ? `[data-action="${CSS.escape(el.dataset.action)}"]${keys.filter((k) => el.dataset[k]).map((k) => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('')}`
      : null;
  return () => {
    const a = document.activeElement;
    if (a && a !== document.body && a.isConnected) return; // déjà ailleurs : on n'y touche pas
    const target = el.isConnected ? el : sel ? document.querySelector(sel) : null;
    if (target && target.getClientRects().length && !target.closest('[hidden], [inert]')) target.focus({ preventScroll: true });
    // une entrée du menu latéral, refermé depuis (elle ne peut plus avoir le focus) : sa languette
    if (target && document.activeElement !== target && target.closest('#side-menu')) document.getElementById('side-tab').focus({ preventScroll: true });
  };
}

// Pose le focus dans la fenêtre : sur `sel` s'il y est (et utilisable), sinon sur la boîte
// de dialogue elle-même (tabindex="-1", sans anneau : voir jeu.css).
export function focusModal(sel, { preventScroll = false } = {}) {
  const dlg = modalDialog();
  if (!dlg) return;
  const el = sel ? dlg.querySelector(sel) : null;
  if (el && !el.disabled) {
    el.focus({ preventScroll });
    return;
  }
  if (!dlg.hasAttribute('tabindex')) dlg.setAttribute('tabindex', '-1');
  dlg.focus({ preventScroll: true });
}

// Ouvre une fenêtre dans #modal-root. `html` : son contenu ; options :
//   labelledBy  id du titre (aria-labelledby), ou label : son nom (aria-label) ;
//   className   classes de la boîte (« modal bois » par défaut ; « book » pour le livre) ;
//   id          id de la boîte ; backdropClass : classe en plus sur le fond ;
//   dismiss     false : ni le fond ni « close-modal » ne la ferment (configuration) ;
//   focus       sélecteur de l'élément qui prend le focus (sinon la boîte elle-même), ou
//               false pour le poser soi-même (focusModal) ; preventScroll : sans défilement ;
//   onClose     appelée quand la fenêtre se ferme (pas quand une autre la remplace).
// Une fenêtre ouverte par-dessus une autre la remplace et garde l'élément d'origine, qui
// retrouvera le focus. Renvoie la boîte de dialogue.
export function openModal(html, {
  labelledBy = null, label = null, className = 'modal bois', id = null, backdropClass = '',
  dismiss = true, focus = null, preventScroll = false, onClose = null,
} = {}) {
  const root = modalRoot();
  if (!root.childElementCount) restoreFocus = rememberFocus();
  onCloseModal = onClose;
  const aria = labelledBy ? ` aria-labelledby="${labelledBy}"` : label ? ` aria-label="${label}"` : '';
  root.innerHTML = `
    <div class="modal-backdrop${backdropClass ? ` ${backdropClass}` : ''}"${dismiss ? ' data-action="close-modal"' : ''}>
      <div class="${className}"${id ? ` id="${id}"` : ''} role="dialog" aria-modal="true"${aria}${dismiss ? ' data-stop-propagation' : ''}>
        ${html}
      </div>
    </div>`;
  if (focus !== false) focusModal(focus, { preventScroll });
  return modalDialog();
}

export function closeModal() {
  const root = modalRoot();
  if (!root.childElementCount) return;
  const after = onCloseModal;
  const restore = restoreFocus;
  onCloseModal = null;
  restoreFocus = null;
  root.innerHTML = '';
  if (after) after();
  if (restore) restore();
}

/* ---------- Tab et Maj+Tab restent dans la fenêtre ouverte ---------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function focusables(box) {
  return Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0 && !el.closest('[inert]'));
}

// Appelée par l'écouteur de touches (events.js) : renvoie true si elle a géré la touche.
export function trapFocus(e) {
  if (e.key !== 'Tab') return false;
  const dlg = modalDialog();
  if (!dlg) return false;
  const list = focusables(dlg);
  if (!list.length) {
    e.preventDefault();
    focusModal(null);
    return true;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const a = document.activeElement;
  if (!dlg.contains(a)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && (a === first || a === dlg)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && a === last) {
    e.preventDefault();
    first.focus();
  } else {
    return false;
  }
  return true;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'close-modal': (target, e) => {
    if (e.target === target) closeModal();
  },
});
