import { houseRepaired, setupPending } from '../engine/depart.js';
import { atelierOuvert } from '../engine/atelier.js';
import { state } from './store.js';

/* ---------- Fluidité (FLU-17, FLU-18) : une seule fenêtre à la fois au démarrage ---------- */

// L'écran est « calme » quand aucune fenêtre (modal-root) n'est ouverte, que la famille est
// installée, depuis au moins `ms` millisecondes. Le bandeau des cookies, l'aide et l'annonce
// d'une lettre attendent ce calme, l'un après l'autre : jamais deux à la fois.
let lastBusy = performance.now();

// Le conteneur des fenêtres (#modal-root, fixe dans la page), cherché une fois : la boucle le
// consulte à chaque image.
let modalRootEl = null;
export function modalRoot() {
  if (!modalRootEl || !modalRootEl.isConnected) modalRootEl = document.getElementById('modal-root');
  return modalRootEl;
}

export function modalOpen() {
  const root = modalRoot();
  return !!(root && root.childElementCount > 0);
}

export function uiCalm(ms = 500) {
  const now = performance.now();
  if (modalOpen() || (state && setupPending(state))) lastBusy = now;
  return now - lastBusy >= ms;
}

export function consentBannerShown() {
  return !!document.getElementById('consent-banner');
}

// L'annonce d'une lettre (FLU-18) passe avant l'aide : la bulle attend qu'elle soit partie.
export function letterToastShown() {
  return !!document.querySelector('#toast-root .toast.lettre');
}

// L'histoire du départ est ouverte : l'heure ne tourne pas encore (FLU-21).
export function storyOpen() {
  return !!document.querySelector('#modal-root .story-modal');
}

export function tutorialShown() {
  return document.body.classList.contains('has-tuto');
}

// FLU-21 : l'horloge s'arrête pendant qu'on lit les bulles d'aide, avant de jouer : dès que
// la maison est réparée, le temps reprend (le soleil fait tourner la pompe ; sinon le joueur
// qui garde la bulle ouverte resterait à 6 h, sans eau). Jamais pendant « dormir », qui
// attend justement que le temps d'éveil soit passé.
// Sur la ferme générée, le temps ne s'arrête pas : le foyer se bâtit en plusieurs jours (les
// ressources à ramasser reviennent chaque matin).
export function tutorialStopsClock() {
  return tutorialShown() && !houseRepaired(state) && !atelierOuvert(state) && !document.querySelector('#tuto-root .tuto-dormir');
}

// Bandeau des cookies demandé au chargement : il attend le calme (FLU-17).
let consentWanted = false;
export function wantConsentBanner() {
  consentWanted = true;
}
export function consentBannerDue() {
  if (!consentWanted || !uiCalm()) return false;
  consentWanted = false;
  return true;
}
export function consentBannerPending() {
  return consentWanted;
}
