import { tick } from '../engine/energy.js';
import { bedtimeDue, clockHours, mealDue, nightActive } from '../engine/clock.js';
import { takeMeal } from '../engine/family.js';
import { setupPending } from '../engine/depart.js';
import { state } from './store.js';
import { persistState, safeStorageGet, safeStorageSet } from './storage.js';
import { setSimulatedAt, simulatedAt } from './loop.js';
import { showToast } from './toasts.js';

/* ---------- la promenade hors de la ferme : le temps continue de passer ---------- */

// En partant pour la carte de transition ou la ville (la flèche du bout du chemin, le bouton
// « Se promener en ville »), la partie est sauvegardée et le moment du départ noté. Là-bas,
// l'heure se déduit des deux (js/horloge-sortie.js). Au retour, le temps passé dehors est
// rejoué comme si le jeu était resté ouvert (le repas de 19 h compris), jusqu'à 22 h au plus :
// la nuit commence alors ici, comme d'habitude. Sans sortie notée, une absence suit la règle
// hors-ligne (l'horloge s'arrête quand le jeu est fermé).
const CLE = 'ferme-sortie';
const PAS_MS = 200;
const MAX_MS = 30 * 60 * 1000;

export function markSortie() {
  persistState();
  safeStorageSet(CLE, JSON.stringify({ depuis: simulatedAt }));
}

// Au chargement de la page : rejoue la sortie notée (et l'efface). Renvoie les heures passées,
// ou 0.
export function applySortie(now = Date.now()) {
  let rec = null;
  try { rec = JSON.parse(safeStorageGet(CLE) || 'null'); } catch (e) { rec = null; }
  try { localStorage.removeItem(CLE); } catch (e) { /* ignoré */ }
  if (!rec || !Number.isFinite(rec.depuis) || Math.abs(rec.depuis - simulatedAt) > 10000) return 0;
  if (nightActive(state) || setupPending(state)) return 0;
  const avant = clockHours(state);
  let ms = Math.min(MAX_MS, Math.max(0, now - rec.depuis));
  while (ms >= PAS_MS && !bedtimeDue(state)) {
    tick(state, PAS_MS / 1000, false);
    if (mealDue(state)) takeMeal(state);
    ms -= PAS_MS;
  }
  setSimulatedAt(now);
  persistState();
  const heures = clockHours(state) - avant;
  if (heures >= 0.25) showToast(`🏙️ De retour à la ferme : il est ${Math.floor(clockHours(state))} h.`);
  return heures;
}

// Les liens vers la ville notent la sortie ; la flèche de la carte (js/farm-stage.js) aussi.
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="ville-carte.html"]') : null;
  if (a) markSortie();
}, true);
window.FermeSortie = { mark: markSortie };
