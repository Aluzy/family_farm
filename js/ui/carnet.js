import { escapeHtml } from '../engine/format.js';
import { recitPage } from '../engine/recit-aiguillage.js';
import { state } from './store.js';
import { registerActions } from './actions.js';
import { openModal } from './modal.js';

/* ---------- le carnet du joueur (docs/recit/aventure.md, « le carnet ») ----------

   Les pages que le joueur a trouvées en chemin : les carnets de Maurice, les notes, ce que disent
   Lise (RECIT.FRAGMENTS, data/recit.json ; le moteur les range : ajouterFragment, js/engine/recit.js). Le
   carnet s'ouvre du menu (📓, js/ui/stage-windows.js), dès la première page ; il se lit, rien de plus : il
   ne décide de rien, il garde ce qu'on a appris. Les pages viennent dans l'ordre où on les a trouvées.
   L'île à bâtir (fiche I7d) n'a pas de carnet : recitPage rend null, le bouton ne paraît pas (la chronique, js/ui/
   chronique.js, prend sa place dans le menu) et le carnet ne s'ouvre pas. */

// Les pages du carnet de la partie ([] sur l'île).
export function pagesDuCarnet() {
  const R = recitPage(state);
  return R ? R.carnet(state) : [];
}

export function carnetHtml() {
  const pages = pagesDuCarnet();
  const corps = pages.length
    ? `<ol class="carnet-pages">${pages.map((p) => `<li class="carnet-page"><h3>${escapeHtml(p.titre)}</h3><p>${escapeHtml(p.texte)}</p></li>`).join('')}</ol>`
    : '<p class="hint">Rien encore : ce que tu apprendras sur l\'île viendra s\'écrire ici.</p>';
  return `
    <h2 id="carnet-titre">📓 Ton carnet</h2>
    ${corps}
    <div class="row"><button type="button" class="btn primary" data-action="close-modal" id="carnet-fermer">Fermer</button></div>`;
}

export function ouvrirCarnet() {
  if (!recitPage(state)) return;
  openModal(carnetHtml(), { labelledBy: 'carnet-titre', id: 'carnet-modal', className: 'modal bois carnet-modal', focus: '#carnet-fermer' });
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'carnet-open': () => ouvrirCarnet(),
});
