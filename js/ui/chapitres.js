import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { familyNeed } from '../engine/family.js';
import {
  autonomyHistory, chapterCount, chapterProgress, lastAutonomy, objectiveDef, plannedAutonomy, holdStatus,
} from '../engine/campaign.js';
import { formatNumber, formatPercent } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { registerActions } from './actions.js';
import { closeModal } from './common.js';

/* ---------- Lot 9 : chapitres, autonomie, graphique ---------- */

export function objectiveValueText(o) {
  const n = (x) => formatNumber(Math.floor(x));
  switch (o.type) {
    case 'litres': return `${n(o.valeur)} / ${formatNumber(o.cible)} L`;
    case 'wh': return `${n(o.valeur)} / ${formatNumber(o.cible)} Wh`;
    case 'autonomie': return `${formatPercent(o.valeur)} / ${formatNumber(o.cible)} %`;
    case 'bonheur': return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
    case 'pontes': case 'serie100': return `${n(o.valeur)} / ${formatNumber(o.cible)} nuits`;
    case 'tenue': return o.ok ? '✅' : '';
    default: return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
  }
}

// Ligne d'explication sous l'objectif de tenue (chapitre 6).
function holdLine() {
  const w = holdStatus(state);
  const obj = objectiveDef('tenue');
  const last = w.dernier && !w.dernier.reussi
    ? ` Dernière série : moyenne ${formatPercent(w.dernier.moyenne)} : ratée.`
    : '';
  if (w.etat === 'reussi') return '✅ Série réussie.';
  if (w.etat === 'suivi') {
    return `📅 Série en cours : nuit ${w.nuits} / ${obj.nuits} · moyenne ${formatPercent(w.moyenne)} (objectif ${obj.moyenne} %)`;
  }
  return `⏳ Une série de ${obj.nuits} nuits commence à la prochaine nuit.${last}`;
}

function objectiveHtml(o) {
  const line = o.type === 'tenue' ? `<span class="muted">${holdLine()}</span>` : '';
  return `
    <li class="objective${o.ok ? ' ok' : ''}">
      <span class="objective-line"><span class="objective-label">${o.ok ? '✅' : '⬜'} ${o.libelle}</span><span class="objective-value">${objectiveValueText(o)}</span></span>
      <span class="bar" role="progressbar" aria-label="${o.libelle}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(o.ratio * 100)}"><span class="bar-fill${o.ok ? '' : ' warn'}" style="width:${Math.round(o.ratio * 100)}%"></span></span>
      ${line}
    </li>`;
}

// Bandeau de chapitre, en haut de la Ferme : titre, objectifs et progression.
export function renderChapterBanner() {
  const c = state.campagne;
  if (c.fini) {
    return `
    <div class="card chapter-card done">
      <span class="card-title"><span>🏆 Campagne terminée</span><span class="chip">Mode libre</span></span>
      <span class="muted">La famille est autonome. Continue de monter en niveau, à ton rythme.</span>
    </div>`;
  }
  const p = chapterProgress(state);
  return `
    <div class="card chapter-card">
      <span class="card-title"><span>${p.icone} ${p.titre}</span><span class="chip">Chapitre ${p.chapitre} / ${chapterCount()}</span></span>
      <span class="muted">${p.intro}</span>
      <ul class="objectives">${p.objectifs.map(objectiveHtml).join('')}</ul>
      <span class="muted">Récompense : ⭐ ${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[p.chapitre - 1] || 0)} XP</span>
    </div>`;
}

// Petit graphique SVG : une barre par nuit, les GRAPHIQUE_NUITS dernières nuits,
// la plus récente à droite ; la ligne pointillée est l'objectif du chapitre.
function autonomyChartHtml() {
  const N = DATA.AUTONOMIE.GRAPHIQUE_NUITS;
  const h = autonomyHistory(state);
  const W = 320, H = 130, left = 30, right = 6, top = 8, bottom = 20;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const slot = plotW / N;
  const bw = slot * 0.7;
  const y = (pct) => top + plotH * (1 - pct / 100);
  const grid = [0, 25, 50, 75, 100]
    .map((g) => `<line class="chart-grid" x1="${left}" y1="${y(g).toFixed(1)}" x2="${W - right}" y2="${y(g).toFixed(1)}"/><text class="chart-label" x="${left - 4}" y="${(y(g) + 3).toFixed(1)}" text-anchor="end">${g}</text>`)
    .join('');
  const bars = h
    .map((e, i) => {
      const x = left + (N - h.length + i) * slot + (slot - bw) / 2;
      const bh = Math.max(e.pct > 0 ? 1.5 : 0, plotH * (e.pct / 100));
      return `<rect class="chart-bar${e.pct + EPS >= 100 ? ' full' : ''}" x="${x.toFixed(1)}" y="${(top + plotH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"><title>Nuit ${e.nuit} : ${formatPercent(e.pct)}</title></rect>`;
    })
    .join('');
  const ends = h.length
    ? `<text class="chart-label" x="${(left + (N - h.length) * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${h[0].nuit}</text>` +
      (h.length > 1 ? `<text class="chart-label" x="${(left + (N - 1) * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${h[h.length - 1].nuit}</text>` : '')
    : `<text class="chart-empty" x="${(left + plotW / 2).toFixed(1)}" y="${(top + plotH / 2).toFixed(1)}" text-anchor="middle">Le graphique apparaît après ta première nuit.</text>`;
  const goal = !state.campagne.fini ? chapterProgress(state).objectifs.find((o) => o.type === 'autonomie') : null;
  const target = goal
    ? `<line class="chart-target" x1="${left}" y1="${y(goal.cible).toFixed(1)}" x2="${W - right}" y2="${y(goal.cible).toFixed(1)}"><title>Objectif du chapitre : ${goal.cible} %</title></line>`
    : '';
  const label = h.length
    ? `Autonomie des ${h.length} dernière${h.length > 1 ? 's' : ''} nuit${h.length > 1 ? 's' : ''} : ${h.map((e) => `nuit ${e.nuit}, ${formatPercent(e.pct)}`).join(' ; ')}`
    : 'Autonomie par nuit : aucune nuit pour l\'instant';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${grid}${bars}${target}${ends}</svg>`;
}

export function renderAutonomyCard() {
  const c = state.campagne;
  const goal = !c.fini ? chapterProgress(state).objectifs.find((o) => o.type === 'autonomie') : null;
  return `
    <div class="card autonomy-card">
      <span class="card-title"><span>🌿 Autonomie</span><span class="chip">${DATA.AUTONOMIE.GRAPHIQUE_NUITS} dernières nuits</span></span>
      <span class="big">${formatPercent(lastAutonomy(state))}</span>
      <span class="muted">Dernière nuit : les calories mangées qui viennent de la ferme, sur ${formatNumber(familyNeed(state))}. Les conserves et les achats du Marché ne comptent pas. Prévue cette nuit : <strong class="num">${formatPercent(plannedAutonomy(state))}</strong>.${goal ? ` Objectif du chapitre : ${goal.cible} % (ligne pointillée).` : ''}</span>
      ${autonomyChartHtml()}
    </div>`;
}

// Écran de fin de chapitre : ce qu'on vient de finir, les nouveautés, la suite.
function openChapterModal() {
  tel('modal', 'chapter');
  const c = state.campagne;
  const a = c && c.annonces[0];
  if (!a) return;
  const L = DATA.CHAPITRES.liste;
  const done = L[a.chapitre - 1];
  const next = L[a.chapitre] || null;
  const body = next
    ? `<h3>Chapitre ${a.chapitre + 1} : ${next.icone} ${next.titre}</h3>
       <p class="muted">${next.intro}</p>
       <ul class="objectives">${next.objectifs.map((o) => `<li class="objective"><span class="objective-label">⬜ ${o.libelle}</span></li>`).join('')}</ul>`
    : `<h3>🏆 Campagne terminée</h3>
       <p>La famille se nourrit de ce que produit la ferme. Le mode libre commence : continue de monter en niveau, à ton rythme. Chaque série de ${DATA.techtree.POINTS.MODE_LIBRE_NUITS_100} nuits à 100 % rapporte encore 1 point de technologie.</p>`;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" id="chapter-modal" role="dialog" aria-modal="true" aria-labelledby="chapter-title" data-stop-propagation>
        <h2 id="chapter-title">🎉 Chapitre ${a.chapitre} terminé</h2>
        <p><strong>${done.icone} ${done.titre}</strong></p>
        <p>⭐ +${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[a.chapitre - 1] || 0)} XP · 🔬 +${formatNumber(DATA.techtree.POINTS.CHAPITRES[a.chapitre - 1] || 0)} points de technologie, à dépenser dans l'Arbre des technologies.</p>
        ${body}
        <button type="button" class="btn primary" data-action="ack-chapter" id="chapter-close">Continuer</button>
      </div>
    </div>`;
  document.getElementById('chapter-close').focus();
}

// Ouvre l'écran de fin d'un chapitre dès qu'aucune autre fenêtre n'est ouverte.
export function watchChapters() {
  if (!state.campagne || !state.campagne.annonces.length) return;
  if (document.getElementById('modal-root').childElementCount === 0) openChapterModal();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'ack-chapter': () => {
    closeModal();
  },
});
