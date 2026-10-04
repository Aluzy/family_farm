import { DATA } from '../engine/catalog.js';
import { awakeRequired } from '../engine/clock.js';
import {
  buyTech, hasTech, masteryValue, prepTimeMult, techFlag, techPoints, techPrereqs, techProgress, techStatus,
} from '../engine/techtree.js';
import { setRoutine } from '../engine/automation.js';
import { formatCoins, formatNumber, formatPercent, formatQty } from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- Lot 7 : Arbre des technologies ---------- */

// Progression d'un bâtiment ou d'un groupe d'appareils (lecture seule : les
// améliorations se font sur les cartes des bâtiments).
function techLevelRow(e) {
  let body;
  if (e.type === 'niveau') {
    const built = e.niveau > 0;
    const pct = Math.round((e.niveau / e.max) * 100);
    const note = e.note
      ? `<span class="chip${e.automatise ? ' auto' : ''}">${e.automatise ? '🤖 Automatisé' : 'Pas encore automatisé'} : ${e.note}</span>`
      : '';
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span><span class="num">${built ? `niveau ${e.niveau} / ${e.max}` : 'non construit'}</span></span>
      <span class="bar" role="progressbar" aria-label="Niveau : ${e.nom}" aria-valuemin="0" aria-valuemax="${e.max}" aria-valuenow="${e.niveau}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${note}`;
  } else if (e.type === 'appareils') {
    const chips = e.niveaux.map((n, i) => `<span class="chip">n°${i + 1} · niv. ${n} / ${e.max}</span>`).join('');
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span><span class="num">${e.niveaux.length} appareil${e.niveaux.length > 1 ? 's' : ''}</span></span>
      <span class="level-chips">${chips}</span>`;
  } else {
    const chips = e.ateliers.map((a) => `<span class="chip">${a.icone} ${a.nom} · ${a.construit ? 'construit' : 'à construire'}</span>`).join('');
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span></span>
      <span class="level-chips">${chips}</span>`;
  }
  return `<div class="level-row">${body}</div>`;
}

// Coût d'un nœud : « 2 PT + 900 💰 ».
function techCostLabel(n) {
  return `${formatNumber(n.pt)} PT + ${costLabel(n.cout)}`;
}

function techNodeCard(id) {
  const n = DATA.techtree.noeuds[id];
  const status = techStatus(state, id);
  const pt = techPoints(state);
  const chip = status === 'acquis'
    ? '<span class="chip auto">✅ Acquis</span>'
    : status === 'disponible'
      ? '<span class="chip">✨ Disponible</span>'
      : '<span class="chip">🔒 Verrouillé</span>';
  const prereqs = techPrereqs(state, id);
  const prereqList = status === 'acquis'
    ? ''
    : `<ul class="prereqs" aria-label="Prérequis">${prereqs.map((p) => `<li class="${p.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${p.ok ? '✅' : '❌'}</span> ${p.texte}</li>`).join('')}</ul>`;
  const affordable = pt.solde >= n.pt && canPay(n.cout);
  const button = status === 'acquis'
    ? ''
    : `<button type="button" class="btn${status === 'disponible' ? ' primary' : ''}" data-action="buy-tech" data-id="${id}"${status === 'disponible' && affordable ? '' : ' disabled'}>Acquérir (${techCostLabel(n)})</button>`;
  return `
    <article class="card tech-node ${status === 'acquis' ? 'owned' : status === 'disponible' ? 'available' : 'locked'}">
      <span class="card-title"><span>${n.icone} ${n.nom}</span>${chip}</span>
      <span class="muted">Palier ${n.palier} · ${techCostLabel(n)}</span>
      <span class="desc">${n.description}</span>
      ${prereqList}
      ${button}
    </article>`;
}

// Effet en cours d'une branche, affiché dans son en-tête.
function branchEffectChip(id) {
  if (id === 'cuisine') return `<span class="chip">Temps de préparation ${formatPercent(prepTimeMult(state))}</span>`;
  if (id === 'famille') return `<span class="chip">Éveil minimal : ${formatQty(awakeRequired(state))} s</span>`;
  return '';
}

// Jalons de maîtrise : chacun rapporte 1 PT, une seule fois.
function masteryHtml() {
  const pt = techPoints(state);
  const items = DATA.techtree.POINTS.MAITRISE.map((m) => {
    const done = pt.maitrise.includes(m.id);
    const v = Math.min(m.cible, masteryValue(state, m));
    return `<li class="${done ? 'ok' : ''}"><span aria-hidden="true">${done ? '✅' : '⬜'}</span> ${m.libelle} <span class="muted num">(${formatNumber(v)} / ${formatNumber(m.cible)})</span></li>`;
  });
  return `<ul class="prereqs" aria-label="Jalons de maîtrise">${items.join('')}</ul>`;
}

export function renderTechno() {
  const pt = techPoints(state);
  const P = DATA.techtree.POINTS;
  const branches = DATA.techtree.branches.map((b) => {
    const nodes = Object.keys(DATA.techtree.noeuds)
      .filter((id) => DATA.techtree.noeuds[id].branche === b.id)
      .sort((x, y) => DATA.techtree.noeuds[x].palier - DATA.techtree.noeuds[y].palier);
    const progress = techProgress(state, b.id).map(techLevelRow).join('');
    const owned = nodes.filter((id) => hasTech(state, id)).length;
    return `
      <section class="branch" aria-label="Branche ${b.nom}">
        <div class="branch-head">
          <h3>${b.icone} ${b.nom}</h3>
          <span class="chips">${branchEffectChip(b.id)}<span class="chip">${owned} / ${nodes.length} acquis</span></span>
        </div>
        <div class="branch-nodes">
          ${progress}
          ${nodes.map(techNodeCard).join('')}
        </div>
      </section>`;
  });
  const libre = state.campagne && state.campagne.fini
    ? ` En mode libre, +1 PT toutes les ${P.MODE_LIBRE_NUITS_100} nuits à 100 % d'autonomie.`
    : '';
  const routine = techFlag(state, 'routine')
    ? `<label class="row check-row"><input type="checkbox" data-action="routine-toggle"${state.routine ? ' checked' : ''}> 🏡 Routine familiale : la famille va dormir toute seule dès que l'éveil minimal est écoulé (jeu ouvert seulement).</label>`
    : '';
  return `
    <div class="section-head">
      <h2>🌳 Arbre des technologies</h2>
      <span class="chips"><span class="chip" title="Points de technologie disponibles">🔬 ${formatNumber(pt.solde)} PT</span><span class="chip" title="Pièces disponibles">💰 ${formatCoins(state.pieces)}</span></span>
    </div>
    <p class="muted">Chaque technologie coûte des points de technologie (PT) et des pièces, et s'ouvre à un palier de la campagne. Les chapitres terminés rapportent des PT (${P.CHAPITRES.join(' · ')}), comme les jalons de maîtrise ci-dessous.${libre} Tu as gagné ${formatNumber(pt.gagnes)} PT en tout.</p>
    ${routine}
    <details class="card">
      <summary><strong>🏅 Jalons de maîtrise</strong> <span class="muted">(${pt.maitrise.length} / ${P.MAITRISE.length})</span></summary>
      ${masteryHtml()}
    </details>
    ${branches.join('')}`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'buy-tech': (target) => {
    const id = target.dataset.id;
    const result = applyResult(buyTech(state, id));
    if (result.ok) showToast(`${DATA.techtree.noeuds[id].icone} ${DATA.techtree.noeuds[id].nom} acquis (−${formatNumber(result.pt)} PT, −${formatCoins(result.cost)} 💰)`);
  },
  'routine-toggle': (target) => {
    applyResult(setRoutine(state, target.checked));
  },
});
