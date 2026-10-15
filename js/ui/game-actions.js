import { DATA } from '../engine/catalog.js';
import { maintainDevice, repairDevice } from '../engine/devices.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount, moveFromFridge, moveToFridge } from '../engine/fridge.js';
import { skipNight, startNight } from '../engine/night.js';
import { newGameFrom } from '../engine/alerts.js';
import { setActiveTab, setCoucher, setEcranFerme, setState, state } from './store.js';
import { telNight } from './consent.js';
import { makeSeed, persistState } from './storage.js';
import { setPendingAbsence, setSimulatedAt, syncJobs } from './loop.js';
import { refresh } from './render.js';
import { openWakeModal } from './reveil.js';
import { showToast } from './toasts.js';
import { registerActions, sameHandler } from './actions.js';
import { closeModal } from './common.js';

/* ---------- actions du moteur (jamais d'accès direct à state depuis l'UI) ---------- */

function actionNewGame() {
  setState(newGameFrom(state, makeSeed()));
  setSimulatedAt(Date.now());
  setPendingAbsence(null);
  syncJobs();
  setEcranFerme(null);
  setActiveTab('ferme');
  persistState();
  refresh();
}

// Applique le résultat d'une action du moteur : message si elle est refusée,
// puis rafraîchissement immédiat (sans attendre la cadence de 5 par seconde).
export function applyResult(result) {
  if (result && result.ok === false) showToast(result.error);
  refresh();
  return result;
}

// Version 1.19 : le bouton « Zzz » (la nuit seulement) saute ce qui reste de la nuit,
// minuit compris ; le résumé du réveil s'ouvre aussitôt.
export function actionSleep() {
  const report = skipNight(state);
  if (!report) {
    showToast(`Le bouton nuit sert la nuit, de ${DATA.TIME.NIGHT_HOUR} h à ${DATA.TIME.DAY_START_HOUR} h.`);
    refresh();
    return;
  }
  wakeUp();
}

// Version 1.19 : 22 h, la famille va dormir ; la nuit défile (voir startNight).
export function actionNightStart() {
  const awakeBefore = Math.round(state.awakeMs / 1000);
  if (!startNight(state)) return;
  telNight(awakeBefore);
  persistState();
  refresh();
}

// 6 h (ou nuit sautée) : le résumé du réveil.
export function wakeUp() {
  state.reveil = false;
  setCoucher(false); // il se lève
  syncJobs(); // les préparations terminées pendant la nuit ne sont pas annoncées par un toast
  persistState(); // sauvegarde après chaque nuit
  refresh();
  if (state.report) openWakeModal(state.report, true);
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'maintain': (target) => {
    applyResult(maintainDevice(state, target.dataset.id));
  },
  'repair': (target) => {
    applyResult(repairDevice(state, target.dataset.id));
  },
  ...sameHandler(['fridge-in', 'fridge-out'], (target, e, action) => {
    const item = target.dataset.item;
    const all = target.dataset.qty === 'all';
    const qty = all ? (action === 'fridge-in' ? countItem(state, item) : fridgeCount(state, item)) : Number(target.dataset.qty);
    const result = applyResult(action === 'fridge-in' ? moveToFridge(state, item, qty) : moveFromFridge(state, item, qty));
    if (result.ok) showToast(`${action === 'fridge-in' ? '🧊 Rangé' : 'Sorti'} : ${result.moved} ${DATA.items[item].icone}${result.reste ? ` (frigo plein : ${result.reste} restent dehors)` : ''}`);
  }),
  'do-new-game': () => {
    actionNewGame();
    closeModal();
    showToast('Nouvelle partie lancée.');
  },
});
