import { escapeHtml } from '../engine/format.js';
import { jouerScene, RECIT, scenesPossibles } from '../engine/recit.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';
import { closeModal, focusModal, modalDialog, openModal } from './modal.js';
import { modalOpen, uiCalm } from './calme.js';
import { persoHtml } from './famille.js';

/* ---------- les scènes du récit (docs/recit/dialogues.md, « les formats ») ----------

   Une scène est une petite fenêtre où quelques répliques se suivent, une à la fois, au toucher
   (« Suite »). Le moteur choisit et note la scène (jouerScene, js/engine/recit.js) : elle est jouée dès
   qu'elle s'ouvre, et ne revient jamais, même fermée avant la fin (le fond ou Échap la ferment). Elle
   attend que l'écran soit calme (FLU-17, js/ui/calme.js) : jamais deux fenêtres à la fois.

   ouvrirScene(id, ctx) : ouvre la scène `id` si elle peut se jouer (ctx : le contexte du récit, voir
   js/engine/recit.js) ; proposerScene(ctx) : ouvre la plus prioritaire de celles qui peuvent se jouer,
   si l'écran est calme. Les déclencheurs (l'arrivée, la calèche à la ferme, la maison de Maurice) les
   appellent (lot 5). */

let scene = null; // { id, lignes: [{ qui, nom, texte }], i }

function ligneHtml() {
  const l = scene.lignes[scene.i];
  const P = RECIT.PERSONNAGES[l.qui] || {};
  const derniere = scene.i >= scene.lignes.length - 1;
  const portrait = P.perso ? `<span class="scene-portrait">${persoHtml(P.perso)}</span>` : '';
  return `
    <div class="scene-ligne">
      ${portrait}
      <div class="scene-parole">
        <h2 id="scene-nom" class="scene-nom">${escapeHtml(l.nom)}</h2>
        <p class="scene-texte" aria-live="polite">${escapeHtml(l.texte)}</p>
      </div>
    </div>
    <div class="scene-pied">
      <span class="scene-rang muted num" aria-hidden="true">${scene.i + 1} / ${scene.lignes.length}</span>
      <button type="button" class="btn primary" id="scene-bouton" data-action="${derniere ? 'scene-fermer' : 'scene-suite'}">${derniere ? 'Fermer' : 'Suite ›'}</button>
    </div>`;
}

// Ouvre la scène `id` si elle peut se jouer maintenant (et si aucune fenêtre n'est ouverte) ; elle
// est notée tout de suite dans la partie. → true si elle s'est ouverte.
export function ouvrirScene(id, ctx = {}) {
  if (scene || modalOpen()) return false;
  const r = jouerScene(state, id, ctx);
  if (!r.ok) return false;
  persistState();
  scene = { id, lignes: r.lignes, i: 0 };
  openModal(ligneHtml(), {
    labelledBy: 'scene-nom', id: 'scene-modal', className: 'modal bois scene-modal', focus: '#scene-bouton',
    onClose: () => { scene = null; refresh(); },
  });
  return true;
}

// Ouvre la plus prioritaire des scènes qui peuvent se jouer dans ce contexte, si l'écran est calme.
export function proposerScene(ctx = {}) {
  if (scene || !uiCalm()) return false;
  const ids = scenesPossibles(state, ctx);
  return ids.length ? ouvrirScene(ids[0], ctx) : false;
}

// La scène ouverte (pour les tests et le déclencheur) : son id, ou null.
export function sceneOuverte() {
  return scene ? scene.id : null;
}

function suite() {
  if (!scene) return;
  scene.i = Math.min(scene.i + 1, scene.lignes.length - 1);
  const d = modalDialog();
  if (d) d.innerHTML = ligneHtml();
  focusModal('#scene-bouton');
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'scene-suite': () => suite(),
  'scene-fermer': () => closeModal(),
});
