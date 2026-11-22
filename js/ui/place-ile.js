/* ==========================================================================
   La fenêtre de la place du village de l'île (docs/ile-300.md, étapes E à H ; docs/economie.md) : un appui sur le
   panneau du village l'ouvre (js/carte/ferme/config.js BLOCS_CARTE.fenetres). Son niveau, combien de villageois elle
   accueille, le prochain niveau (payé par la bourse du village), la bourse du village, la taxe, les dons, le port.
   ========================================================================== */

import { DATA } from '../engine/catalog.js';
import { executer } from './commandes.js';
import { bourseVillage, economie, tauxTaxe } from '../engine/ile/economie.js';
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
        ? "⚓ Le port achète les productions de l'île (il ne vend rien)."
        : "⚓ Le port attend le village : un villageois qui vit sur l'île.";
  const bourse = bourseVillage(state);
  const bouton = p
    ? `<div class="row"><button class="btn primary" type="button" data-action="place-monter"${bourse < p.prix ? ' disabled' : ''}>⬆️ Niveau ${p.niveau} : ${p.prix} pièces du village (${p.villageois} villageois)</button></div>`
    : '<p class="muted">La place est à son plus haut niveau.</p>';
  // (la bourse du village : la taxe sur les revenus de chacun, prise la nuit, et les dons ; docs/economie.md)
  const dons = DATA.ILE.ECONOMIE.DONS.map(
    (d) =>
      `<button class="btn" type="button" data-action="village-don" data-n="${d}"${(state.pieces || 0) < d ? ' disabled' : ''}>🎁 ${d}</button>`,
  ).join('');
  const journal = economie(state)
    .journal.slice(-5)
    .reverse()
    .map((l) => `<li>Jour ${l.jour} · ${l.libelle} : ${l.montant > 0 ? '+' : ''}${l.montant}</li>`)
    .join('');
  return `<p>🪧 Niveau ${n} sur ${DATA.ILE.VILLAGE.NIVEAUX.length} · 👥 ${adultes()} / ${capacitePlace(state)} villageois</p>
<p>🏛️ Bourse du village : <b>${bourse}</b> pièces · taxe ${tauxTaxe(state)} % des revenus du jour, prise la nuit</p>${bouton}
<p class="muted">Un don à la bourse du village (tes pièces : ${state.pieces || 0}) :</p><div class="row">${dons}</div>
${journal ? `<ul class="muted">${journal}</ul>` : ''}<p class="muted">${port}</p>`;
}

registerActions({
  'village-don': (el) => {
    applyResult(executer('village.don', { quantite: Number(el.dataset.n) }));
    refresh();
  },
  'place-monter': () => {
    applyResult(executer('place.monter', {}));
    refresh();
  },
});
