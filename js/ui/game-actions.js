import { DATA } from '../engine/catalog.js';
import { maintainDevice, repairDevice } from '../engine/devices.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount, moveFromFridge, moveToFridge } from '../engine/fridge.js';
import { goToSleep, startNight } from '../engine/night.js';
import { newGameFrom } from '../engine/alerts.js';
import { setActiveTab, setCoucher, setEcranFerme, setState, state } from './store.js';
import { telDay, telNight } from './consent.js';
import { makeSeed, persistState } from './storage.js';
import { setPendingAbsence, setSimulatedAt, syncJobs } from './loop.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, sameHandler } from './actions.js';
import { closeModal } from './modal.js';
import { sonMatin } from './son.js';

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
  if (result && result.ok === false) notify(result.error, { son: 'erreur' });
  refresh();
  return result;
}

// Le personnage dort (dans son lit, voir actionGoToBed) : la nuit ne passe plus d'un coup,
// elle défile en accéléré (TIME.SECONDES_PAR_HEURE_SOMMEIL) jusqu'au réveil de 6 h. On ne dort
// que la nuit.
export function actionSleep() {
  const r = goToSleep(state);
  if (!r.ok) notify(r.error);
  else persistState();
  refresh();
}

// Version 1.19 : 22 h, la famille va dormir ; la nuit défile (voir startNight).
export function actionNightStart() {
  const awakeBefore = Math.round(state.awakeMs / 1000);
  if (!startNight(state)) return;
  telNight(awakeBefore);
  persistState();
  refresh();
}

// 6 h (ou nuit sautée) : le réveil. Pas de résumé : le personnage a pu passer la nuit debout,
// la journée continue sans s'arrêter.
export function wakeUp() {
  state.reveil = false;
  sonMatin();
  // la ferme générée : qui a dormi sans paillasse dans une pièce close (js/engine/blocs.js)
  const sans = state.report && state.report.sansCouchage;
  if (sans && sans.length) {
    const noms = state.famille.membres.filter((m) => sans.includes(m.id)).map((m) => m.nom);
    notify(`🛏 Sans paillasse dans une pièce close : ${noms.join(', ')} ${noms.length > 1 ? 'ont' : 'a'} mal dormi (${DATA.ATELIER.BONHEUR_SANS_COUCHAGE} 😊).`);
  }
  setCoucher(false); // il se lève
  syncJobs(); // les préparations terminées pendant la nuit ne sont pas annoncées par un toast
  persistState(); // sauvegarde après chaque nuit
  telDay(); // le suivi : un nouveau jour de jeu
  refresh();
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
    // fiche 10 : ranger (ou sortir) le même objet plusieurs fois de suite se cumule
    if (result.ok) notify(null, { cumul: { cle: `${action}:${item}`, quantites: { n: result.moved }, texte: (t) => `${action === 'fridge-in' ? '🧊 Rangé' : 'Sorti'} : ${t.n} ${DATA.OBJETS[item].icone}${result.reste ? ` (frigo plein : ${result.reste} restent dehors)` : ''}` } });
  }),
  'do-new-game': () => {
    actionNewGame();
    closeModal();
    notify('Nouvelle partie lancée.');
  },
});
