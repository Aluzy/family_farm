import { createInitialState, migrate } from '../engine/state.js';
import { SAVE_KEY, setState, state } from './store.js';
import { setPendingAbsence, setSimulatedAt, simulatedAt, syncJobs } from './loop.js';
import { showToast } from './toasts.js';

/* ---------- stockage : localStorage, toujours entouré de try/catch ---------- */

export function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

// Charge la sauvegarde (ou crée une partie). Lot 11 : simulatedAt reprend
// l'heure de la sauvegarde, pour rattraper le temps passé page fermée.
export function loadOrCreateState() {
  setSimulatedAt(Date.now());
  const raw = safeStorageGet(SAVE_KEY);
  if (!raw) return createInitialState(makeSeed());
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createInitialState(makeSeed());
    if (typeof parsed.t === 'number' && Number.isFinite(parsed.t)) setSimulatedAt(parsed.t);
    return migrate(parsed);
  } catch (e) {
    return createInitialState(makeSeed());
  }
}

export function makeSeed() {
  // Seule l'app a le droit de lire l'horloge ; l'ENGINE reste pur.
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function persistState() {
  try {
    const payload = JSON.stringify({ v: state.version, t: simulatedAt, s: state });
    safeStorageSet(SAVE_KEY, payload);
  } catch (e) {
    // La sauvegarde ne doit jamais faire planter la page.
  }
}

/* ---------- export / import ---------- */

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

export function exportSaveText() {
  const payload = JSON.stringify({ v: state.version, t: simulatedAt, s: state });
  return encodeBase64(payload);
}

export function importSaveText(text) {
  try {
    const json = decodeBase64(String(text).trim());
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.s) {
      throw new Error('format de sauvegarde invalide');
    }
    // Une sauvegarde importée reprend maintenant : pas de rattrapage hors-ligne.
    setState(migrate(parsed));
    setSimulatedAt(Date.now());
    setPendingAbsence(null);
    syncJobs();
    persistState();
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- copie dans le presse-papiers ---------- */

// Copie le contenu d'un textarea et n'annonce « Copié » que si la copie a
// vraiment réussi. On essaie d'abord la commande synchrone (elle marche en
// file://), puis l'API asynchrone dont l'échec est capté par la promesse.
export function copyFromTextarea(area) {
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  if (ok) {
    showToast('Copié !');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value).then(
      () => showToast('Copié !'),
      () => showToast('Copie impossible : le texte est sélectionné, copie-le à la main.')
    );
    return;
  }
  showToast('Copie impossible : le texte est sélectionné, copie-le à la main.');
}
