import { setComptoirTab, setComptoirTabChoisi, setInvTab, setTestMode, state, testMode } from './store.js';
import { nightActive } from '../engine/clock.js';
import { showToast } from './toasts.js';
import { tel, telClick } from './consent.js';
import { scheduleRender } from './loop.js';
import { refresh } from './render.js';
import { closeStageWindow, leaveInterior, menuOpen, setMenuOpen, stageInterior, stageWindow } from './stage-windows.js';
import { ACTIONS, NUIT_BLOQUEES, registerActions } from './actions.js';
import { closeModal } from './common.js';

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) {
    if (!testMode && e.target && e.target.closest && !e.target.closest('#consent-banner')) tel('deadClick', e.target);
    return;
  }
  const action = target.dataset.action;
  telClick(target, action);

  // Version 1.19 : la nuit, la famille dort ; la ferme attend le matin.
  if (nightActive(state) && NUIT_BLOQUEES.has(action)) {
    showToast('🌙 La famille dort : attends le matin, ou va dormir (Zzz).');
    return;
  }
  const run = ACTIONS[action];
  if (run) run(target, e, action);
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'test-mode-toggle') {
    setTestMode(e.target.checked);
    scheduleRender();
  }
});

// Lot 11 : Échap ferme la fenêtre ouverte (comme le bouton Fermer) ; d'abord celle de
// #modal-root, puis la fenêtre de la carte, puis l'intérieur où le joueur est entré.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (menuOpen) {
    e.preventDefault();
    setMenuOpen(false);
  } else if (document.getElementById('modal-root').childElementCount > 0) {
    e.preventDefault();
    closeModal();
  } else if (stageWindow) {
    e.preventDefault();
    closeStageWindow();
  } else if (stageInterior) {
    e.preventDefault();
    leaveInterior();
  }
});

document.getElementById('modal-root').addEventListener('click', (e) => {
  // ferme la modale si on clique sur le fond, pas sur son contenu
  if (e.target.dataset.action === 'close-modal' && e.target.classList.contains('modal-backdrop')) {
    closeModal();
  }
});

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'inv-tab': (target) => {
    setInvTab(target.dataset.tab);
    refresh();
  },
  'comptoir-tab': (target) => {
    setComptoirTab(target.dataset.tab);
    setComptoirTabChoisi(target.dataset.tab);
    refresh();
  },
  'cancel-new-game': () => {
    document.getElementById('new-game-zone').innerHTML =
    '<button class="btn danger-outline" type="button" data-action="ask-new-game">Recommencer à zéro</button>';
  },
});
