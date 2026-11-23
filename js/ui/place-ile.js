/* ==========================================================================
   La fenêtre de la place du village de l'île (docs/ile-300.md, étapes E à H ; docs/economie.md) : un appui sur le
   panneau du village l'ouvre (js/carte/ferme/config.js BLOCS_CARTE.fenetres). Son niveau, combien de villageois elle
   accueille, le prochain niveau (payé par la bourse du village), la bourse du village, la taxe, les dons, le port.
   ========================================================================== */

import { DATA } from '../engine/catalog.js';
import { executer } from './commandes.js';
import { bourseVillage, economie, tauxTaxe } from '../engine/ile/economie.js';
import { projetEnCours, projetFait, projetsIle, resteAPoser } from '../engine/ile/projets.js';
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
  // (les projets du village, docs/economie.md E15 et E17 : un à la fois, payé par la bourse dès qu'elle a la somme)
  const enCours = projetEnCours(state);
  const reste = resteAPoser(state);
  const nomBloc = (b) => (DATA.ATELIER.BLOCS[b] ? DATA.ATELIER.BLOCS[b].nom : b);
  const chantier = !enCours
    ? '<p class="muted">Pas de projet en cours : choisis-en un.</p>'
    : reste
      ? `<p>🏗️ Chantier ouvert : pose les blocs donnés par le village (où tu veux, de la forme que tu veux) ; il reste ${
          Object.entries(reste)
            .map(([b, k]) => `${k} ${nomBloc(b).toLowerCase()}`)
            .join(', ') || 'rien'
        }. Le bâtiment est fini quand son meuble clé est dans une pièce close.</p>`
      : `<p>⏳ En attente : la bourse du village le paiera dès qu'elle aura la somme.</p><div class="row"><button class="btn" type="button" data-action="projet-abandonner">Renoncer</button></div>`;
  const projets = projetsIle(state)
    .map(
      (pr) =>
        `<li>${pr.icone} <b>${pr.nom}</b>${pr.prix !== null && pr.prix !== undefined ? ` · ${pr.prix} pièces` : ''}${pr.fait ? ` · fait${pr.fait > 1 ? ` ×${pr.fait}` : ''}` : ''}<br><span class="muted">${pr.effet || ''}</span>${
          pr.enCours
            ? ' <b>(en cours)</b>'
            : pr.refus
              ? `<br><span class="muted">${pr.refus}</span>`
              : ` <button class="btn small" type="button" data-action="projet-choisir" data-sorte="${pr.sorte}">Choisir</button>`
        }</li>`,
    )
    .join('');
  // (le tableau en liège de la mairie règle la taxe : E10)
  const T = DATA.ILE.ECONOMIE,
    taux = tauxTaxe(state);
  const panneau = projetFait(state, 'mairie')
    ? `<p>📌 Taxe : <button class="btn small" type="button" data-action="mairie-taux" data-n="${Math.max(T.TAUX_MIN, taux - 1)}"${taux <= T.TAUX_MIN ? ' disabled' : ''}>−</button> <b>${taux} %</b> <button class="btn small" type="button" data-action="mairie-taux" data-n="${Math.min(T.TAUX_MAX, taux + 1)}"${taux >= T.TAUX_MAX ? ' disabled' : ''}>+</button> <span class="muted">(${T.TAUX_MIN} à ${T.TAUX_MAX} %)</span></p>`
    : '';
  return `<p>🪧 Niveau ${n} sur ${DATA.ILE.VILLAGE.NIVEAUX.length} · 👥 ${adultes()} / ${capacitePlace(state)} villageois</p>
<p>🏛️ Bourse du village : <b>${bourse}</b> pièces · taxe ${tauxTaxe(state)} % des revenus du jour, prise la nuit</p>${bouton}
<p class="muted">Un don à la bourse du village (tes pièces : ${state.pieces || 0}) :</p><div class="row">${dons}</div>
${panneau}${journal ? `<ul class="muted">${journal}</ul>` : ''}
<h3>🏗️ Projets du village</h3>${chantier}<ul class="place-projets">${projets}</ul><p class="muted">${port}</p>`;
}

registerActions({
  'projet-choisir': (el) => {
    applyResult(executer('projet.choisir', { sorte: el.dataset.sorte }));
    refresh();
  },
  'projet-abandonner': () => {
    applyResult(executer('projet.abandonner', {}));
    refresh();
  },
  'mairie-taux': (el) => {
    applyResult(executer('mairie.taux', { quantite: Number(el.dataset.n) }));
    refresh();
  },
  'village-don': (el) => {
    applyResult(executer('village.don', { quantite: Number(el.dataset.n) }));
    refresh();
  },
  'place-monter': () => {
    applyResult(executer('place.monter', {}));
    refresh();
  },
});
