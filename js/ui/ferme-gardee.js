/* ---------- la ferme générée, gardée sur l'appareil (le chargement : docs/perf.md) ----------
   Tirer la ferme d'une graine (js/engine/ferme-generee.js, genererFerme) prend près d'une seconde sur
   le téléphone de référence, à chaque ouverture de la page. Elle ne change pas tant que le générateur ne
   change pas (GENERATEUR_VERSION, F0-2) : une fois tirée, elle est gardée dans la base IndexedDB de
   l'appareil, rangée sous « version du générateur : graine ». À l'ouverture suivante, relireFerme la
   donne au moteur (fermeRecue) avant que la partie ne soit chargée, et le moteur ne la tire plus.

   - relireFerme() : au démarrage (js/main.js), avant la partie. Au plus DELAI_MS d'attente : une base
     lente ou absente (navigation privée) ne retarde pas le jeu, la ferme est alors tirée comme avant.
   - garderFerme() : une fois le jeu affiché et la page au calme, la ferme de la partie est rangée, si
     elle a été tirée cette fois-ci (une seule ferme gardée : la base ne grossit pas).
   Rien ne dépend de la base : vide, effacée ou refusée, le jeu tire la ferme et la partie est la même
   (le générateur est déterministe ; tests/engine/generateur.test.mjs tient son empreinte). */

import { GENERATEUR_VERSION } from '../engine/base.js';
import { fermeFaite, fermeRecue } from '../engine/ferme-generee.js';
import { SAVE_KEY, state } from './store.js';

const BASE = 'family-farm', MAGASIN = 'fermes';
const DELAI_MS = 800;
const cleDe = (graine) => `${GENERATEUR_VERSION}:${graine}`;

// D'où vient la ferme de cette ouverture : 'appareil' (relue), ou null (tirée, ou pas encore demandée).
let venue = null, gardee = false;
export const fermeVenue = () => venue;

function ouvrir() {
  return new Promise((ok) => {
    try {
      if (typeof indexedDB === 'undefined') { ok(null); return; }
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MAGASIN)) r.result.createObjectStore(MAGASIN); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
      r.onblocked = () => ok(null);
    } catch (e) { ok(null); }
  });
}

let base = null;
const laBase = () => base || (base = ouvrir());

// La graine de la partie sauvegardée (sans la charger), ou null.
function graineSauvegardee() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = raw && JSON.parse(raw);
    const g = s && s.s && s.s.carte && s.s.carte.graine;
    return g === undefined || g === null || g === '' ? null : String(g);
  } catch (e) {
    return null;
  }
}

// Au démarrage : la ferme de la partie sauvegardée, gardée lors d'une visite précédente, donnée au
// moteur. Ne rejette jamais.
export async function relireFerme() {
  const graine = graineSauvegardee();
  if (graine === null) return;
  const lue = new Promise((ok) => {
    laBase().then((db) => {
      if (!db) { ok(null); return; }
      try {
        const r = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).get(cleDe(graine));
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => ok(null);
      } catch (e) { ok(null); }
    });
  });
  const ferme = await Promise.race([lue, new Promise((ok) => setTimeout(() => ok(null), DELAI_MS))]);
  try {
    if (ferme && fermeRecue(graine, ferme)) venue = 'appareil';
  } catch (e) { /* une ferme gardée abîmée : tirée comme avant */ }
}

// Une fois le jeu affiché : la ferme de la partie rangée sur l'appareil, si elle a été tirée cette fois-ci.
export function garderFerme() {
  const graine = state && state.carte && state.carte.graine;
  if (venue === 'appareil' || gardee || graine === undefined || graine === null) return;
  const ferme = fermeFaite(graine);
  if (!ferme) return;
  laBase().then((db) => {
    if (!db) return;
    try {
      const m = db.transaction(MAGASIN, 'readwrite').objectStore(MAGASIN);
      m.clear();
      m.put({ carte: ferme.carte, terrain: ferme.terrain }, cleDe(graine));
      gardee = true;
    } catch (e) { /* pas de place, base refusée : la ferme sera tirée la prochaine fois */ }
  });
}

// Le moment de la ranger : quelques secondes après que l'écran de chargement est retiré (jeu.html,
// Chargement.fini), quand la page est au calme ; au plus tard GARDER_MS après le démarrage.
const GARDER_MS = 20000;
export function garderPlusTard() {
  let fait = false;
  const garder = () => {
    if (fait) return;
    fait = true;
    if (typeof requestIdleCallback === 'function') requestIdleCallback(garderFerme, { timeout: 5000 });
    else garderFerme();
  };
  const C = typeof window !== 'undefined' && window.Chargement;
  if (C && typeof C.fini === 'function') {
    const fini = C.fini;
    C.fini = function (...a) { setTimeout(garder, 3000); return fini.apply(this, a); };
  }
  setTimeout(garder, GARDER_MS);
}
