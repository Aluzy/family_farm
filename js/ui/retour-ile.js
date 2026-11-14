/* ==========================================================================
   La fenêtre du retour d'une partie d'avant passée sur l'île (le chantier « l'île à bâtir », fiche I7f).
   Le moteur : js/engine/migration-ile.js (state.retourIle, lignesRetour, fermerRetourIle) ; les textes :
   data/village.json VILLAGE.MIGRATION.RETOUR. Au premier lancement après la migration, dès qu'aucune autre fenêtre
   n'est ouverte : une page, cinq lignes (le port, les villageois, les amis d'avant, ce qui est rendu, les prix) et le
   cadeau de bienvenue, donné quand on la ferme (le bouton, la croix ou le fond).
   ========================================================================== */

import { escapeHtml } from '../engine/format.js';
import { setupPending } from '../engine/depart.js';
import { fermerRetourIle, lignesRetour } from '../engine/migration-ile.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { modalRoot, storyOpen } from './calme.js';
import { openModal, closeModal } from './modal.js';
import { registerActions } from './actions.js';
import { notify } from './toasts.js';
import { refresh } from './render.js';

let ouverte = false;

// À chaque tour de la boucle (js/ui/loop.js) : la fenêtre, une fois, dès que la page est calme.
export function watchRetourIle() {
  if (ouverte || !state || setupPending(state) || storyOpen()) return;
  if (modalRoot().childElementCount > 0) return;
  const L = lignesRetour(state);
  if (!L) return;
  ouverte = true;
  openModal(`
    <header class="window-head">
      <h2 id="retour-ile-titre"><span aria-hidden="true">🏝️</span> ${escapeHtml(L.titre)}</h2>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Fermer" title="Fermer">✕</button>
    </header>
    <div class="absence-body retour-ile-body">
      <p class="retour-ile-intro">${escapeHtml(L.intro)}</p>
      <ul class="retour-ile-lignes">
        ${L.lignes.map((l) => `<li><span aria-hidden="true">${l.icone}</span> <span>${escapeHtml(l.texte)}</span></li>`).join('')}
      </ul>
      <p class="retour-ile-cadeau"><span aria-hidden="true">🎁</span> ${escapeHtml(L.cadeau)}</p>
      <div class="row"><button type="button" class="btn primary" id="retour-ile-ok" data-action="retour-ile-ok">${escapeHtml(L.bouton)}</button></div>
    </div>`, { labelledBy: 'retour-ile-titre', focus: '#retour-ile-ok', preventScroll: true, className: 'modal bois item-modal absence-modal retour-ile-modal', onClose: recevoir });
}

// La fenêtre fermée : le cadeau, une fois.
function recevoir() {
  const donne = fermerRetourIle(state);
  ouverte = false;
  if (!donne) return;
  persistState();
  notify('🎁 Le cadeau de bienvenue est dans ton inventaire.', { kind: 'info' });
  refresh();
}

registerActions({
  'retour-ile-ok': () => closeModal(),
});
