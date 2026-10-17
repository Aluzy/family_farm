import { setComptoirTab, setComptoirTabChoisi, setGodMode, setInvTab, setTestMode, state, testMode } from './store.js';
import { syncGodBar } from './excursion.js';
import { asleep } from '../engine/night.js';
import { notify } from './toasts.js';
import { tel, telClick } from './consent.js';
import { scheduleRender } from './loop.js';
import { refresh } from './render.js';
import { closeStageWindow, leaveInterior, menuOpen, setMenuOpen, stageInterior, stageWindow } from './stage-windows.js';
import { ACTIONS, SOMMEIL_BLOQUEES, SOMMEIL_MESSAGE, registerActions } from './actions.js';
import { closeModal, trapFocus } from './modal.js';

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) {
    if (!testMode && e.target && e.target.closest && !e.target.closest('#consent-banner')) tel('deadClick', e.target);
    return;
  }
  runAction(target.dataset.action, target, e);
});

// Exécute une action du registre comme le clic sur un élément qui porte data-action : suivi
// du clic, puis l'action, sauf si le sommeil du personnage la bloque. `target` : l'élément
// cliqué, ou { dataset } quand c'est la carte qui agit (stageAct, stage.js).
export function runAction(action, target, e) {
  telClick(target, action);
  // Le personnage dort (« Dormir ») : la ferme attend son réveil. La nuit seule n'empêche rien.
  if (asleep(state) && SOMMEIL_BLOQUEES.has(action)) {
    notify(SOMMEIL_MESSAGE);
    return;
  }
  const run = ACTIONS[action];
  if (run) run(target, e, action);
}

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'test-mode-toggle') {
    setTestMode(e.target.checked);
    scheduleRender();
  }
  if (e.target && e.target.id === 'god-mode-toggle') {
    setGodMode(e.target.checked);
    syncGodBar();
  }
});

// Lot 11 : Échap ferme la fenêtre ouverte (comme le bouton Fermer) ; d'abord celle de
// #modal-root, puis la fenêtre de la carte, puis l'intérieur où le joueur est entré.
// Tab et Maj+Tab restent dans la fenêtre de #modal-root ouverte (modal.js).
document.addEventListener('keydown', (e) => {
  if (trapFocus(e)) return;
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
});
