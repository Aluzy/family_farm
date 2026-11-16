/* ==========================================================================
   La fenêtre du retour d'une partie d'avant passée sur l'île (le chantier « l'île à bâtir », fiche I7f).
   Le moteur : js/engine/migration-ile.js (state.retourIle, lignesRetour, fermerRetourIle) ; les textes :
   data/village.json VILLAGE.MIGRATION.RETOUR. Au premier lancement après la migration, dès qu'aucune autre fenêtre
   n'est ouverte : une page, cinq lignes (le port, les villageois, les amis d'avant, ce qui est rendu, les prix) et le
   cadeau de bienvenue, donné quand on la ferme (le bouton, la croix ou le fond).
   I9f : dans un monde en ligne passé sur l'île (worker/src/monde.mjs, à sa première ouverture), chaque membre la voit une
   fois (gardé dans son navigateur, par monde), avec les lignes d'un monde (l'horloge qui vit ; au propriétaire, la grille
   des rôles d'une île et la ferme d'avant dans les sauvegardes) ; le cadeau est déjà au coffre commun : la fermer ne
   change rien à la partie.
   ========================================================================== */

import { escapeHtml } from '../engine/format.js';
import { setupPending } from '../engine/depart.js';
import { fermerRetourIle, lignesRetour } from '../engine/migration-ile.js';
import { enLigne, state } from './store.js';
import { mondeActuel } from './en-ligne.js';
import { persistState } from './storage.js';
import { modalRoot, storyOpen } from './calme.js';
import { openModal, closeModal } from './modal.js';
import { registerActions } from './actions.js';
import { notify } from './toasts.js';
import { refresh } from './render.js';

let ouverte = false;
// (I9f : la fenêtre d'un monde en ligne, vue une fois par monde dans ce navigateur)
const cleVue = (monde) => `ferme-retour-ile-${monde}`;
function vueDansLeMonde(monde) {
  try { return localStorage.getItem(cleVue(monde)) === '1'; } catch (e) { return false; }
}

// À chaque tour de la boucle (js/ui/loop.js) : la fenêtre, une fois, dès que la page est calme.
export function watchRetourIle() {
  if (ouverte || !state || setupPending(state) || storyOpen()) return;
  if (modalRoot().childElementCount > 0) return;
  const M = enLigne ? mondeActuel() : null;
  if (enLigne && (!M || !M.role || vueDansLeMonde(M.monde))) return;
  const L = lignesRetour(state, M ? { enLigne: true, proprietaire: M.role === 'proprietaire' } : {});
  if (!L) return;
  // (en ligne, seule la fenêtre d'un monde passé sur l'île : retourIle.monde)
  if (M && !(state.retourIle && state.retourIle.monde)) return;
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

// La fenêtre fermée : le cadeau, une fois. (I9f : en ligne, rien ne change dans la partie du monde : la fenêtre est vue)
function recevoir() {
  const M = enLigne ? mondeActuel() : null;
  if (M) {
    ouverte = false;
    try { localStorage.setItem(cleVue(M.monde), '1'); } catch (e) { /* (le navigateur ne garde rien : elle reviendra) */ }
    return;
  }
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
