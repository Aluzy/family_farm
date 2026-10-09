import { EPS } from '../engine/base.js';
import { acknowledgeChapter } from '../engine/campaign.js';
import { acknowledgeLevel } from '../engine/levels.js';
import { formatCoins } from '../engine/format.js';
import { state } from './store.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';

export function costLabel(cost) {
  return cost === 0 ? 'gratuit' : `${formatCoins(cost)} 💰`;
}

export function canPay(cost) {
  return state.pieces + EPS >= cost;
}

/* ---------- écran de réveil ---------- */

export function plural(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

export function closeModal() {
  // Lot 9 : fermer l'écran de fin de chapitre (bouton ou fond) l'acquitte.
  const chapterShown = document.getElementById('chapter-modal');
  const levelShown = document.getElementById('level-modal'); // version 1.7 : écran d'un niveau atteint
  document.getElementById('modal-root').innerHTML = '';
  if (chapterShown) acknowledgeChapter(state);
  if (levelShown) acknowledgeLevel(state);
  if (chapterShown || levelShown) refresh();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'close-modal': (target, e) => {
    if (e.target === target) closeModal();
  },
});
