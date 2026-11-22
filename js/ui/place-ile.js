/* ==========================================================================
   La fenêtre de la place du village de l'île (docs/ile-300.md, étapes E à H) : un appui sur le panneau du village
   l'ouvre (js/carte/ferme/config.js BLOCS_CARTE.fenetres). Son niveau, combien de villageois elle accueille, ce qu'il
   faut pour le prochain niveau (des pièces : l'export, par le port), le port et le village fondé.
   ========================================================================== */

import { DATA } from '../engine/catalog.js';
import { executer } from './commandes.js';
import { capacitePlace, casePort, niveauPlace, prochainNiveauPlace, villageFonde } from '../engine/ile/village.js';
import { registerActions } from './actions.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { state } from './store.js';

const adultes = () => (state.villageois || []).filter((v) => !v.enfant).length;

export function renderPlaceIle() {
  const n = niveauPlace(state);
  if (!n)
    return '<p class="muted">Pose le panneau du village (Construire, onglet Jardin) : c\'est la place du village. Les villageois y arrivent.</p>';
  const p = prochainNiveauPlace(state);
  const port =
    casePort(state) === null
      ? '⚓ Pas encore de port : construis le comptoir du port au bord de la mer.'
      : villageFonde(state)
        ? "⚓ Le port commerce : l'export est le seul moyen de gagner de l'argent."
        : "⚓ Le port attend le village : un villageois qui vit sur l'île.";
  const bouton = p
    ? `<div class="row"><button class="btn primary" type="button" data-action="place-monter"${(state.coins || 0) < p.prix ? ' disabled' : ''}>⬆️ Niveau ${p.niveau} : ${p.prix} pièces (${p.villageois} villageois)</button></div>`
    : '<p class="muted">La place est à son plus haut niveau.</p>';
  return `<p>🪧 Niveau ${n} sur ${DATA.ILE.VILLAGE.NIVEAUX.length} · 👥 ${adultes()} / ${capacitePlace(state)} villageois</p>${bouton}<p class="muted">${port}</p>`;
}

registerActions({
  'place-monter': () => {
    applyResult(executer('place.monter', {}));
    refresh();
  },
});
