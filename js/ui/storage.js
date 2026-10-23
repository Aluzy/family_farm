import { migrate } from '../engine/state.js';
import { createNewGame } from '../engine/depart.js';
import { SAVE_KEY, setState, state } from './store.js';
import { setPendingAbsence, setSimulatedAt, simulatedAt, syncJobs } from './loop.js';
import { notify } from './toasts.js';

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
  if (!raw) return nouvellePartie();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return nouvellePartie();
    if (typeof parsed.t === 'number' && Number.isFinite(parsed.t)) setSimulatedAt(parsed.t);
    return demenagement(migrate(parsed), raw);
  } catch (e) {
    return nouvellePartie();
  }
}

// La sauvegarde d'avant le déménagement d'une ancienne partie, gardée sur l'appareil (au cas où).
export const SAVE_AVANT_DEMENAGEMENT = 'ferme-save-avant-demenagement';

// Une nouvelle partie : sur une terre sauvage (la ferme générée de sa graine).
function nouvellePartie() {
  return createNewGame(makeSeed());
}

// La ferme du grand-père (la carte de Tiled) n'existe plus : une partie qui y était encore a
// déménagé sur une terre sauvage en migrant (js/engine/state.js, v46 → v47 ; rien ne se perd, ses
// bâtiments sont rebâtis en blocs) et le dit (state.demenagee). La partie d'avant reste sur
// l'appareil ; une annonce le dit au chargement (demenagementAnnonce).
let demenagee = false;
function demenagement(s, raw) {
  if (!s.demenagee) return s;
  delete s.demenagee;
  safeStorageSet(SAVE_AVANT_DEMENAGEMENT, raw);
  demenagee = true;
  return s;
}

// Au démarrage (js/main.js) : l'annonce du déménagement, une fois.
export function demenagementAnnonce() {
  if (!demenagee) return;
  demenagee = false;
  persistState();
  notify('🚚 La ferme du grand-père n\'existe plus : ta partie a déménagé sur une terre sauvage. Rien ne s\'est perdu, tes bâtiments sont rebâtis en blocs et l\'Atelier est construit (menu, 🔨 Construire).', { kind: 'info' });
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
    const s = migrate(parsed);
    delete s.demenagee;
    setState(s);
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
    notify('Copié !');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value).then(
      () => notify('Copié !'),
      () => notify('Copie impossible : le texte est sélectionné, copie-le à la main.')
    );
    return;
  }
  notify('Copie impossible : le texte est sélectionné, copie-le à la main.');
}
