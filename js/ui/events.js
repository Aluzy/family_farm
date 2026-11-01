import { buildMode, setComptoirTab, setComptoirTabChoisi, setGodMode, setInvTab, setTestMode, state, testMode } from './store.js';
import { persistState } from './storage.js';
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
// Ferme ce qui est ouvert, le plus au-dessus d'abord ; `chantier` : le mode Construire aussi
// (la touche Retour du téléphone). Vrai si quelque chose s'est fermé.
function fermerDessus(chantier) {
  if (menuOpen) setMenuOpen(false);
  else if (document.getElementById('modal-root').childElementCount > 0) closeModal();
  else if (stageWindow) closeStageWindow();
  else if (stageInterior) leaveInterior();
  else if (chantier && buildMode && ACTIONS['build-toggle']) ACTIONS['build-toggle']();
  else return false;
  return true;
}

document.addEventListener('keydown', (e) => {
  if (trapFocus(e)) return;
  if (e.key !== 'Escape') return;
  if (fermerDessus(false)) e.preventDefault();
});

// La touche Retour du téléphone (et celle du navigateur) : elle ne quitte pas le jeu, où l'on
// retomberait sur une page d'avant (une ancienne version du jeu, que le navigateur ressort de
// son cache). Une page de garde est empilée sur celle du jeu ; Retour y revient, ferme ce qui
// est ouvert (comme Échap, et le mode Construire), puis remet la garde. Rien d'ouvert : un
// message ; un second Retour dans les QUITTER_MS ramène à l'accueil (la partie sauvegardée).
// (les adresses que le jeu change en route, la mine : history.replaceState gardé tel quel, la
// garde suit l'adresse)
const QUITTER_MS = 2500;
if (typeof history !== 'undefined' && history.pushState) {
  const GARDE = { fermeGarde: true };
  let ici = location.href, quitter = 0;
  const remplace = history.replaceState.bind(history);
  history.replaceState = (etat, titre, url) => {
    remplace(etat == null ? history.state : etat, titre, url);
    ici = location.href;
  };
  if (!(history.state && history.state.fermeGarde)) history.pushState(GARDE, '', ici);
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.fermeGarde) { ici = location.href; return; }   // (Avancer : de nouveau sur la garde)
    history.pushState(GARDE, '', ici);
    if (fermerDessus(true)) { quitter = 0; scheduleRender(); return; }
    const now = Date.now();
    if (now - quitter < QUITTER_MS) {
      persistState();
      location.replace('index.html');
      return;
    }
    quitter = now;
    notify('↩️ Appuie encore sur Retour pour revenir à l\'accueil (la partie est sauvegardée).');
  });
}

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
